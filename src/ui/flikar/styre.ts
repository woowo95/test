import { LAG, LAGAR, TABU_AKT, placeName, efterlevs, lagTak, lagarNu, MINISTRAR, TRONFOLJD_TEXT, tronfoljd, DAY, LED, PABUD, PABUD_LIST, Pabud, Rattegang, SEDER, STR, STRAFF_NAMN, VAGSKALAR, byId, legitimitet, ledareOf, onskatDygn, pabud, pabudAndel, rattegang, styrelseform, timeLabel, torkAndel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc, hjalpKnapp, hjalpText, num, pLink } from '../hjalp';
import { s, ui } from '../lage';
import { sedFormat, sedVag } from './seder';
import type { Flik } from '../panel';

// styret (steg 3.5.4, styre.ts): ledaren, styrelseformen, legitimiteten, vågskålarna, rättegångarna och de ledare byn haft.
// En egen runsten (steg 9.3.1) som är blek tills byn fått sin första ledare, med delar överst: styret och påbuden (DELAR nedan)
export const harHaft = () => !!s.styre?.historia.length;
const dygnTxt = (ms: number) => { const d = ms / DAY; return d < 1 ? 'mindre än ett år' : `${Math.floor(d)} år`; };

function styretHtml() {
    const st = s.styre, l = ledareOf(s);
    if (!st) return '<p class="muted">Byn har ingen ledare.</p>';
    const f = styrelseform(s), lg = legitimitet(s);
    const delar: [string, number, number][] = [['Folkets stöd', lg.stod, LED.wStod], ['Hur ledaren tillsattes', lg.satt, LED.wSatt], ['Framgångar', lg.fram, LED.wFram], ['Vintrar byn klarat', lg.vint, LED.wVint]];
    const lyss = st.pabud ? pabudAndel(s) : undefined;
    // formens namn överst i mitten, ledaren under, och legitimiteten och hur många som lyssnar på påbuden bredvid varandra (steg 4.5.4.2)
    const ledare = l ? `<div class="formnamn">${iconImg('ledarskap', 24)} <b>${esc(f.namn)}</b> ${hjalpKnapp('styre', 'Vad är styret?')}</div>
      ${hjalpText('styre', `<p class="muted">${esc(f.text(l, st.titel ?? ''))} Bara den som kan ledarskap kan bli ledare. Ledaren drar byns seder åt sitt håll, bestämmer påbuden och straffar det hen sett eller hört om.</p>`)}
      <ul class="rels"><li>${pLink(l)}<span></span><span></span><span class="muted">${esc(st.titel ?? '')}, ${dygnTxt(s.now - (st.sedan ?? s.now))}</span></li>${ministrar()}</ul>
      <p class="muted small" title="Så väljs nästa ledare">👑 ${esc(TRONFOLJD_TEXT[tronfoljd(s)])}</p>
      <div class="rutor"><div class="ruta" title="Hur mycket byn godtar ledaren"><div class="rutnamn">⚖️ Legitimitet</div><div class="rutbar">${bar(lg.v, lg.v < 0.3 ? 'low' : '')}<span>${Math.round(lg.v * 100)} %</span></div>
      ${hjalpText('styre', `<dl class="kv smal">${delar.map(([n, v, w]) => `<dt class="small">${n}</dt><dd class="small">${bar(v)}<span>${Math.round(v * 100)} % · väger ${num(w)}</span></dd>`).join('') + (lg.oratt > 0.005 ? `<dt class="small">Orättvisa straff</dt><dd class="small">−${Math.round(lg.oratt * 100)} %</dd>` : '')}</dl>`)}</div>
      ${lyss !== undefined ? `<div class="ruta" title="Hur mycket byn rättar sig efter påbuden"><div class="rutnamn">📜 Lyssnar</div><div class="rutbar">${bar(lyss)}<span>${Math.round(lyss * 100)} %</span></div></div>` : ''}</div>`
      : '<p class="muted">Byn har ingen ledare just nu. Ingen vuxen som kan ledarskap är vald ännu.</p>';
    const skalar = VAGSKALAR.map(v => {
      const oppen = v.sed ? st.oppna.includes(v.id) : false;
      if (!oppen) return `<li class="muted" title="${esc(v.steg ? `Kommer senare (steg ${v.steg})` : 'Inte upplåst än')}">❔ ${esc(v.namn)}</li>`;
      const d = SEDER[v.sed!], x = s.seder.v[v.sed!] ?? 0;
      return `<li title="${esc(d.effect)}">${sedVag(x, esc(d.neg), esc(d.pos))}${sedFormat(v.sed!)}</li>`;
    }).join('');
    const hist = st.historia.slice().reverse().map(h => `<li><span class="when">${timeLabel(s, h.fran)}</span>${pLink(byId(s, h.id)) === '–' ? esc(h.namn) : pLink(byId(s, h.id))}, ${esc([...(h.forr ?? []), h.titel].map(x => x.toLowerCase()).join(', sedan '))}${h.till !== undefined ? ` – ${dygnTxt(h.till - h.fran)}, ${esc(h.slut ?? '')}` : ''}</li>`).join('');
    return `${ledare}<h3>Vågskålar</h3><ul class="seder">${skalar}</ul>${lagarDel()}${tabunDel()}${omrostningar()}${rattegangar()}<h3>Ledarna genom tiden</h3><ol class="logg">${hist}</ol>`;
}

// stenen Styre (steg 9.3.1): delarna i en rad knappar överst, styret och påbuden. Registret: en ny del är en rad i DELAR
interface Del { id: string; tecken: string; namn: string; html(): string }
const DELAR: Del[] = [
  { id: 'styre', tecken: '👑', namn: 'Styret', html: styretHtml },
  { id: 'pabud', tecken: '📜', namn: 'Påbud', html: () => pabudDel() },
];
const oppen = () => DELAR.find(d => d.id === ui.styreDel) ?? DELAR[0];
export const styre: Flik = {
  namn: 'Styre',
  syns: harHaft,
  html() {
    const del = oppen();
    return `<div class="pdelar" role="tablist">${DELAR.map(d => `<button type="button" role="tab" data-sdel="${d.id}" aria-selected="${d === del}" title="${d.namn}" aria-label="${d.namn}">${d.tecken}</button>`).join('')}</div>
      <h3>${del.namn}</h3>${del.html()}`;
  },
  klick(el) {
    const b = el.closest<HTMLButtonElement>('[data-sdel]');
    if (!b) return false;
    ui.styreDel = b.dataset.sdel!;
    return true;
  },
};

// påbuden (steg 3.5.2): vad ledaren bestämt mot vad byn själv tycker, och hur mycket byn lyssnar. En del i stenen Styre
// (steg 9.3.1; förr en del i fliken Byn, och före 3.10.16 en egen flik)
const varde = (k: Pabud, v: number) => k === 'han' ? (v < -0.33 ? 'förbjudet' : v > 0.33 ? 'tillåtet' : 'ogillas') : k === 'torkat' ? `${Math.round(torkAndel(v) * 100)} %` : k === 'bygg' || k === 'vinter' ? `${Math.round(Math.max(0, v) * 100)} %` : `${num(onskatDygn(k === 'vedlager' ? 'ved' : 'mat', v))} dygn`;
export function pabudDel() {
  const st = s.styre, l = ledareOf(s);
  if (!l || !st?.pabud) return '<p class="muted">Inga påbud gäller. Utan ledare gör byn som den själv tycker.</p>';
  // en ruta per påbud, och påbuden med samma ruta (lagret) tillsammans i en
  const rutor = new Map<string, Pabud[]>();
  for (const k of PABUD_LIST) { const r = PABUD[k].ruta ?? PABUD[k].namn; rutor.set(r, [...(rutor.get(r) ?? []), k]); }
  const rad = (k: Pabud, ensam: boolean) => {
    const d = PABUD[k], egen = d.sed ? s.seder.v[d.sed] : 0, led = st.pabud![k] ?? egen;
    const pil = `<span class="muted">${led > egen + 0.02 ? '▲' : led < egen - 0.02 ? '▼' : ''}</span>`;
    return `${ensam ? '' : `<dt title="${esc(d.text)}">${esc(d.namn)}</dt>`}<dd title="${esc(`${l.name} vill ${varde(k, led)}, byn själv ${varde(k, egen)}`)}"><b>${varde(k, pabud(s, k))}</b>${pil}</dd>${hjalpText('pabud', `<dd class="small muted helrad">${esc(d.text)}. ${esc(l.name)}: ${varde(k, led)}, byn: ${varde(k, egen)}</dd>`)}`;
  };
  return `<div class="tekhead">${hjalpKnapp('pabud', 'Vad är påbud?')}</div>
    ${hjalpText('pabud', `<p class="muted">${esc(l.name)} bestämmer påbuden efter sin personlighet och ser över dem varje årstid. Byn blandar påbudet med sin egen sed: ju högre legitimitet och rangordning, desto mer lyssnar byn.</p>`)}
    <div class="rutor">${[...rutor].map(([namn, ks]) => ks.length === 1
      ? `<div class="ruta" title="${esc(PABUD[ks[0]].text)}"><div class="rutnamn">${esc(namn)}</div><dl class="kv ensam">${rad(ks[0], true)}</dl></div>`
      : `<div class="ruta bred"><div class="rutnamn">${esc(namn)}</div><dl class="kv smal">${ks.map(k => rad(k, false)).join('')}</dl></div>`).join('')}</div>`;
}

// tabun (steg 8.4.10): de platser och handlingar som byn undviker, med vad som hände; texten kommer fram vid hovring
function tabunDel() {
  const rader = [...(s.tabun ?? []).map(t => ({ namn: `Platsen ${placeName(s, t.a)}`, om: t.om })), ...(s.tabuAkt ?? []).map(t => ({ namn: `Att ${TABU_AKT[t.k]?.namn ?? t.k}`, om: t.om }))];
  if (!rader.length) return '';
  return `<h3>Tabun</h3><ul class="rels">${rader.map(r => `<li title="${esc(r.om ? `Byn minns: ${r.om}.` : 'Något hände.')}">${iconImg('fara')} ${esc(r.namn)}</li>`).join('')}</ul>`;
}
// lagarna (steg 8.4.1): en symbol per lag och en för straffet; texten kommer fram vid hovring. Hur väl de efterlevs och taket (steg 8.4.3, 8.4.9)
function lagarDel() {
  const lagar = lagarNu(s);
  if (!lagar.length) return '';
  return `<h3>Lagar <span class="muted small">${lagar.length} av ${lagTak(s)} · efterlevs ${Math.round(efterlevs(s) * 100)} %</span></h3><ul class="rels">${lagar.slice(0, LAG.takVisas).map(l => { const d = LAGAR[l.id]; return `<li title="${esc(`${d.text}. ${d.om ? `Kom efter ${d.om}. ` : ''}Straffet: ${STRAFF_NAMN[l.straff].toLowerCase()}.`)}">${d.sym} ${esc(d.namn)} <span class="muted">${esc(STRAFF_NAMN[l.straff])}</span></li>`; }).join('')}</ul>`;
}
// ministrarna (steg 8.3.8): en rad per post
function ministrar() {
  return Object.entries(s.styre?.ministrar ?? {}).map(([id, pid]) => { const q = byId(s, pid); return q ? `<li>${pLink(q)}<span></span><span></span><span class="muted">${esc(MINISTRAR[id]?.namn ?? id)}</span></li>` : ''; }).join('');
}
// omröstningarna (steg 8.3.3): frågan, vem som la fram den och utfallet. Ett tryck visar varje röst som en symbol med vikten och varför
function omrostningar() {
  const lista = s.styre?.roster;
  if (!lista?.length) return '';
  return `<h3>Omröstningar</h3><ol class="logg">${lista.slice().reverse().map(o => {
    const id = `rost-${o.t}-${o.f}`, val = o.f === 'ledare';
    return `<li class="klick" data-hjalp="${id}" data-hjalp-grupp="rost-" title="Tryck för alla röster" tabindex="0" role="button"><span class="when">${timeLabel(s, o.t)}</span>${esc(o.namn)}${val ? `: ${esc(o.framNamn)}` : ` ${o.gick ? 'ja' : 'nej'}`} <span class="muted">${val ? '' : `(${Math.round(o.ja * 100)} % mot ${Math.round(o.nej * 100)} %)`}</span></li>${hjalpText(id, `<li class="small"><p class="muted">${val ? '' : `Lades fram av ${esc(o.framNamn)}.`} ${o.varfor ? esc(o.varfor) : ''}</p><ul class="rels">${o.roster.slice().sort((a, b) => b.w - a.w).map(r => `<li title="${esc(r.why)}">${val ? '' : r.ja ? 'ja ' : 'nej '}${esc(r.namn)} <span class="muted">${Math.round(r.w * 100)} % · ${esc(r.why)}</span></li>`).join('')}</ul></li>`)}`;
  }).join('')}</ol>`;
}
// rättegångarna (steg 3.10.17): en rad per dom, nyast först. Ett tryck visar berättelsen och hur domen gick till
const plus = (v: number) => `${v < 0 ? '−' : '+'}${num(Math.abs(v))}`;
function rattegangar() {
  const lista = s.styre?.ratt;
  if (!lista?.length) return '';
  return `<h3>Rättegångar</h3><ol class="logg">${lista.slice().reverse().map(r => {
    const id = `ratt-${r.t}-${r.om}`, x = rattegang(s, r);
    return `<li class="klick" data-hjalp="${id}" data-hjalp-grupp="ratt-" title="Tryck för hela rättegången" tabindex="0" role="button"><span class="when">${timeLabel(s, r.t)}</span>${esc(r.namn)} ${esc(x.brott)}: ${esc(STRAFF_NAMN[r.steg].toLowerCase())}${r.oratt ? ' <span class="oratt">orättvis</span>' : ''}</li>${hjalpText(id, rattMer(r, x))}`;
  }).join('')}</ol>`;
}
function rattMer(r: Rattegang, x: ReturnType<typeof rattegang>) {
  return `<li class="small"><p>${esc(x.berattelse)}</p><dl class="kv">
    <dt>Brottet</dt><dd>${esc(`${r.namn} ${x.brott}`)}${r.b.falsk ? ' (inte sant)' : ''}</dd>
    <dt>${esc(r.ledNamn)}</dt><dd>${r.b.sett ? 'såg det själv' : 'hörde det som rykte'}</dd>
    <dt>Såg det</dt><dd>${esc(x.sett || 'ingen annan')}</dd>
    <dt>Hörde det</dt><dd>${esc(x.hort || 'ingen annan')}</dd>
    <dt title="Hur hårt ledaren dömer: 1 plus det sederna och ledaren lägger till">Hårdheten</dt><dd>${num(r.hard)} (Envälde ${plus(r.rang)}, empati ${plus(r.emp)}, humör ${plus(r.hum)}, aggression ${plus(r.agg)})${r.nara ? `, mildare mot sina nära (× ${num(STR.nara)})` : ''}</dd>
    <dt>Straffet</dt><dd>${STRAFF_NAMN[r.steg]}</dd>
    <dt title="Det straff som sederna godtar">Lagom</dt><dd>${STRAFF_NAMN[r.lagom]}</dd>
    ${r.oratt ? `<dt>Orättvist</dt><dd>legitimiteten −${Math.round((r.leg ?? 0) * 100)} %${r.van ? `, ${r.van} tyckte sämre om ${esc(r.ledNamn)}` : ''}</dd>` : ''}
    <dt>Såg straffet</dt><dd>${r.publik}</dd>${r.dog ? '<dt>Döden</dt><dd>dog av slaget</dd>' : ''}
  </dl></li>`;
}
