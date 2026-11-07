import { GUD_OMR, Gud, NIVAER, Person, formNamn, gudarOf, SKALA_IDS, SKALOR, Tro, UPPV, skalaSyns, skalaV, troNiva, ageOf, alive, andlighet, andligSyns, byId, living, timeLabel, tolkning, troNamn, troende, upplevelseText } from '../../sim';
import { tecknet } from '../../ikoner';
import { bar, esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import { sedBar } from './seder';
import type { Flik } from '../panel';
import { HELIGA_PLATSER, RITUALER, hogtider, prastOf, prastSort } from '../../sim';

// det tron har: prästen, de heliga platserna och högtiderna (system 8.5)
function kultHtml(tr: Tro) {
  const pr = prastOf(s, tr), pl = (s.heliga ?? []).filter(h => h.tro === tr.id), hg = hogtider(tr), rad: string[] = [];
  if (pr) rad.push(`<li>${esc(prastSort(tr, pr.sex))}: ${pLink(pr)}</li>`);
  for (const h of pl) rad.push(`<li title="${esc(`Platsen ${h.om}`)}">${esc(HELIGA_PLATSER[h.k].namn)}${h.skandad ? ' (vanhelgad)' : ''}</li>`);
  if (hg) rad.push(`<li>${hg} ${hg === 1 ? 'högtid' : 'högtider'} om året</li>`);
  if (s.ritual?.tro === tr.id) rad.push(`<li>Just nu: ${esc(s.ritual.namn ?? RITUALER[s.ritual.k].namn)}</li>`);
  return rad.length ? `<h3>Prästen, platserna och högtiderna</h3><ul class="rels">${rad.join('')}</ul>` : '';
}

// religionen (steg 4.1.3, religion.ts): varje tro med symbol, namn, nivå (steg 4.1.4), berättelse, antal troende, de synliga skalorna, gudarna (steg 4.1.5), grundaren,
// de troende och de upplevelser som rör tron; sist alla i byn med andlighet och tro. Fliken syns när den första tron finns
const STORA = 3; // så många trosriktningar visas som egna, de andra under Övriga trosriktningar
const UPP_MAX = 6; // så många upplevelser som rör tron visas per tro

// skalorna som syns i byn (de två första, och de som låsts upp, steg 4.1.4), som en stapel från mitten; texten när man håller över
const skalaHtml = (tr: Tro) => `<ul class="seder">${SKALA_IDS.filter(k => skalaSyns(s, k) && skalaV(tr, k) !== undefined).map(k => { const d = SKALOR[k], v = skalaV(tr, k)!; return `<li title="${esc(`${d.namn[0]}: ${d.text[0]}. ${d.namn[1]}: ${d.text[1]}.`)}"><div class="sedtop"><span>${d.namn[0]}</span><span>${d.namn[1]}</span></div>${sedBar((v - 50) / 50)}</li>`; }).join('')}</ul>`;

// de upplevelser som rör tron hos dem som tror (tecknen och det andra som flyttar andligheten), de senaste först
function upplevHtml(folk: Person[]) {
  const u = folk.flatMap(p => (p.upp ?? []).filter(x => x.n !== undefined).map(x => ({ p, x }))).sort((a, b) => (b.x.t ?? 0) - (a.x.t ?? 0)).slice(0, UPP_MAX);
  return u.length ? `<ul class="lard">${u.map(({ p, x }) => `<li>${pLink(p)} <span>${esc(upplevelseText(x))} <small class="muted">${x.a} år${x.t ? `, ${timeLabel(s, x.t)}` : ''}</small></span></li>`).join('')}</ul>` : '<p class="muted small">Inga upplevelser som rör tron ännu.</p>';
}

// trons gudar (steg 4.1.5): symbol, namn, form och område; berättelsen om hur guden kom till vid tryck. De glömda sist, utan berättelse
function gudHtml(tr: Tro, g: Gud, i: number) {
  const id = `gud-${tr.id}-${i}`, sym = GUD_OMR[g.omr[0]].sym;
  return `<li>${tecknet(sym, '✨')}<span><b>${esc(g.namn)}</b> <small class="muted">${esc(formNamn(g.form))}</small></span><span class="small">${esc(g.omr.map(o => GUD_OMR[o].namn).join(', '))}</span><span>${hjalpKnapp(id, 'Hur guden kom till')}</span></li>${hjalpText(id, `<p class="muted">${esc(g.ber)}</p>`)}`;
}
function gudarHtml(tr: Tro) {
  const alla = tr.gudar ?? [], nu = gudarOf(tr), glomda = alla.filter(g => g.slut !== undefined);
  if (!alla.length) return '';
  return `<h3>Gudar</h3><ul class="rels">${nu.map(g => gudHtml(tr, g, alla.indexOf(g))).join('')}</ul>${glomda.length ? `<p class="small muted">Glömda: ${glomda.map(g => `${esc(g.namn)} (${timeLabel(s, g.slut!)})`).join(', ')}</p>` : ''}`;
}

function troHtml(tr: Tro) {
  const folk = troende(s, tr).sort((a, b) => (b.troStyrka ?? 0) - (a.troStyrka ?? 0)), g = byId(s, tr.grundare), id = `tro-${tr.id}`;
  const grundare = g && alive(g) ? pLink(g) : `${esc(tr.gnamn)} <small class="muted">(lever inte längre)</small>`;
  return `<div class="tekhead">${tr.sym ? tecknet(tr.sym, '✨', 24) : '✨'} <b>${esc(troNamn(tr))}</b> <span title="Så många tror">👥 ${folk.length}</span> ${hjalpKnapp(id, 'Berättelsen om tron')}</div>
    <p class="small" title="${esc(NIVAER[troNiva(tr)].text + (NIVAER[troNiva(tr) + 1] ? ` Nästa nivå, ${NIVAER[troNiva(tr) + 1].namn.toLowerCase()}: ${NIVAER[troNiva(tr) + 1].text}` : ''))}">Nivå: <b>${esc(NIVAER[troNiva(tr)].namn)}</b></p>
    ${hjalpText(id, `<p class="muted">${esc(tr.ber ?? tolkning(tr))}</p>`)}
    <p class="small">Grundare: ${grundare}, år ${tr.ar}</p>
    ${skalaHtml(tr)}
    ${gudarHtml(tr)}
    <ul class="rels">${folk.map(p => `<li>${pLink(p)}<span></span><span>${bar((p.troStyrka ?? 0) / 100)}</span><span class="muted">${Math.floor(ageOf(p, s.now))} år</span></li>`).join('')}</ul>
    ${kultHtml(tr)}<h3>Upplevelser som rör tron</h3>${upplevHtml(folk)}`;
}

export const religion: Flik = {
  namn: 'Religion',
  syns: () => andligSyns(s),
  html() {
    const tron = (s.tron ?? []).filter(tr => tr.slut === undefined).sort((a, b) => troende(s, b).length - troende(s, a).length || a.id - b.id);
    const stora = tron.slice(0, STORA), ovriga = tron.slice(STORA), glomda = (s.tron ?? []).filter(tr => tr.slut !== undefined);
    const ovr = ovriga.length ? `<div class="tekhead"><b>Övriga trosriktningar</b> <span>👥 ${ovriga.reduce((n, tr) => n + troende(s, tr).length, 0)}</span> ${hjalpKnapp('tro-ovriga', 'Visa de mindre trosriktningarna')}</div>${hjalpText('tro-ovriga', ovriga.map(troHtml).join(''))}` : '';
    const glo = glomda.length ? `<h3>Trosriktningar som dött ut</h3><ul class="rels">${glomda.map(tr => `<li>${tr.sym ? tecknet(tr.sym, '✨') : '✨'}<span>${esc(troNamn(tr))}</span><span></span><span class="muted">${timeLabel(s, tr.slut!)}</span></li>`).join('')}</ul>` : '';
    const folk = living(s).filter(p => ageOf(p, s.now) >= UPPV.fran).sort((a, b) => andlighet(s, b) - andlighet(s, a));
    const personer = `<h3>Personer</h3><ul class="rels">${folk.map(p => { const tr = s.tron?.find(t => t.id === p.tro); return `<li>${pLink(p)}<span title="Andlighet">${bar(andlighet(s, p) / 100)}</span><span>${tr ? `${tr.sym ? tecknet(tr.sym, '') + ' ' : ''}${esc(troNamn(tr))}` : '<span class="muted">–</span>'}</span><span class="muted">${Math.round(andlighet(s, p))}</span></li>`; }).join('')}</ul>`;
    return `<div class="tekhead"><b>Tron i byn</b> ${hjalpKnapp('religion', 'Vad är tron?')}</div>
    ${hjalpText('religion', '<p class="muted">En tro börjar när en mycket andlig person tolkar något oförklarligt som ett tecken. Den sprids i samtalen, och när tre delar den får den ett namn och en berättelse. Skalorna visar vad tron handlar om: andar i naturen eller förfäderna, många gudar eller en. Gudarna föds ur byns stora händelser, och en gud som inget påminner om glöms.</p>')}
    ${tron.length ? stora.map(troHtml).join('') + ovr : '<p class="muted">Ingen i byn tror på något just nu.</p>'}${glo}${personer}`;
  },
};
