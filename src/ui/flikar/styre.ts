import { DAY, LED, PABUD, PABUD_LIST, Pabud, Rattegang, SEDER, STR, STRAFF_NAMN, VAGSKALAR, byId, legitimitet, ledareOf, onskatLager, pabud, pabudAndel, rattegang, styrelseform, timeLabel, torkAndel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc, hjalpKnapp, hjalpText, num, pLink } from '../hjalp';
import { s } from '../lage';
import { sedBar } from './seder';
import type { Flik } from '../panel';

// styret (steg 3.5.4, styre.ts): ledaren, styrelseformen, legitimiteten, påbuden, vågskålarna, rättegångarna och de ledare byn haft.
// Fliken syns först när byn fått sin första ledare
const harHaft = () => !!s.styre?.historia.length;
const dygnTxt = (ms: number) => { const d = ms / DAY; return d < 1 ? 'mindre än ett år' : `${Math.floor(d)} år`; };

export const styre: Flik = {
  namn: 'Styre',
  syns: harHaft,
  html() {
    const st = s.styre, l = ledareOf(s);
    if (!st) return '<p class="muted">Byn har ingen ledare.</p>';
    const f = styrelseform(s), lg = legitimitet(s);
    const delar: [string, number, number][] = [['Folkets stöd', lg.stod, LED.wStod], ['Tiden vid makten', lg.tid, LED.wTid], ['Vintrar byn klarat', lg.vint, LED.wVint]];
    const ledare = l ? `<div class="tekhead">${iconImg('ledarskap', 24)} <b>${esc(f.namn)}</b> ${hjalpKnapp('styre', 'Vad är styret?')}</div>
      ${hjalpText('styre', `<p class="muted">${esc(f.text(l, st.titel ?? ''))} Bara den som kan ledarskap kan bli ledare. Ledaren drar byns seder åt sitt håll, bestämmer påbuden och straffar det hen sett eller hört om.</p>`)}
      <ul class="rels"><li>${pLink(l)}<span></span><span></span><span class="muted">${esc(st.titel ?? '')}, ${dygnTxt(s.now - (st.sedan ?? s.now))}</span></li></ul>
      <dl class="kv"><dt title="Hur mycket byn godtar ledaren">⚖️ Legitimitet</dt><dd>${bar(lg.v, lg.v < 0.3 ? 'low' : '')}<span>${Math.round(lg.v * 100)} %</span></dd>
      ${hjalpText('styre', delar.map(([n, v, w]) => `<dt class="small">${n}</dt><dd class="small">${bar(v)}<span>${Math.round(v * 100)} % · väger ${num(w)}</span></dd>`).join('') + (lg.oratt > 0.005 ? `<dt class="small">Orättvisa straff</dt><dd class="small">−${Math.round(lg.oratt * 100)} %</dd>` : ''))}</dl>`
      : '<p class="muted">Byn har ingen ledare just nu. Ingen vuxen som kan ledarskap är vald ännu.</p>';
    const skalar = VAGSKALAR.map(v => {
      const oppen = v.sed ? st.oppna.includes(v.id) : false;
      if (!oppen) return `<li class="muted" title="${esc(v.steg ? `Kommer senare (steg ${v.steg})` : 'Inte upplåst än')}">❔ ${esc(v.namn)}</li>`;
      const d = SEDER[v.sed!], x = s.seder.v[v.sed!] ?? 0;
      return `<li title="${esc(d.effect)}"><div class="sedtop"><span>${esc(d.neg)}</span><span>${esc(d.pos)}</span></div>${sedBar(x)}</li>`;
    }).join('');
    const hist = st.historia.slice().reverse().map(h => `<li><span class="when">${timeLabel(s, h.fran)}</span>${pLink(byId(s, h.id)) === '–' ? esc(h.namn) : pLink(byId(s, h.id))}, ${esc(h.titel.toLowerCase())}${h.till !== undefined ? ` – ${dygnTxt(h.till - h.fran)}, ${esc(h.slut ?? '')}` : ''}</li>`).join('');
    return `${ledare}<h3>Påbud</h3>${pabudDel()}<h3>Vågskålar</h3><ul class="seder">${skalar}</ul>${rattegangar()}<h3>Byns ledare</h3><ol class="logg">${hist}</ol>`;
  },
};

// påbuden (steg 3.5.2): vad ledaren bestämt mot vad byn själv tycker, och hur mycket byn lyssnar. En del i Styre efter ledaren
// och legitimiteten (steg 3.10.16; förr en egen flik). När lagarna kommer (9.2.6) blir delen Lagar
const varde = (k: Pabud, v: number) => k === 'torkat' ? `${Math.round(torkAndel(v) * 100)} %` : `${num(onskatLager(k === 'vedlager', v))} dygn`;
function pabudDel() {
  const st = s.styre, l = ledareOf(s);
  if (!l || !st?.pabud) return '<p class="muted">Inga påbud gäller. Utan ledare gör byn som den själv tycker.</p>';
  const a = pabudAndel(s);
  return `<div class="tekhead">${hjalpKnapp('pabud', 'Vad är påbud?')}</div>
    <dl class="kv"><dt title="Hur mycket byn rättar sig efter påbuden">📜 Lyssnar</dt><dd>${bar(a)}<span>${Math.round(a * 100)} %</span></dd></dl>
    ${hjalpText('pabud', `<p class="muted">${esc(l.name)} bestämmer påbuden efter sin personlighet och ser över dem varje årstid. Byn blandar påbudet med sin egen sed: ju högre legitimitet och rangordning, desto mer lyssnar byn.</p>`)}
    <dl class="kv">${PABUD_LIST.map(k => {
      const d = PABUD[k], egen = d.sed ? s.seder.v[d.sed] : 0, led = st.pabud![k] ?? egen;
      return `<dt title="${esc(d.text)}">${esc(d.namn)}</dt><dd title="${esc(`${l.name} vill ${varde(k, led)}, byn själv ${varde(k, egen)}`)}"><b>${varde(k, pabud(s, k))}</b><span class="muted">${led > egen + 0.02 ? '▲' : led < egen - 0.02 ? '▼' : ''}</span></dd>${hjalpText('pabud', `<dt></dt><dd class="small muted">${esc(d.text)}. ${esc(l.name)}: ${varde(k, led)}, byn: ${varde(k, egen)}</dd>`)}`;
    }).join('')}</dl>`;
}

// rättegångarna (steg 3.10.17): en rad per dom, nyast först. Ett tryck visar berättelsen och hur domen gick till
const plus = (v: number) => `${v < 0 ? '−' : '+'}${num(Math.abs(v))}`;
function rattegangar() {
  const lista = s.styre?.ratt;
  if (!lista?.length) return '';
  return `<h3>Rättegångar</h3><ol class="logg">${lista.slice().reverse().map(r => {
    const id = `ratt-${r.t}-${r.om}`, x = rattegang(s, r);
    return `<li class="klick" data-hjalp="${id}" data-hjalp-grupp="ratt-" title="Tryck för hela rättegången"><span class="when">${timeLabel(s, r.t)}</span>${esc(r.namn)} ${esc(x.brott)}: ${esc(STRAFF_NAMN[r.steg].toLowerCase())}${r.oratt ? ' <span class="oratt">orättvis</span>' : ''}</li>${hjalpText(id, rattMer(r, x))}`;
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
