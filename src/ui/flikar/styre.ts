import { DAY, LED, PABUD, PABUD_LIST, Pabud, SEDER, VAGSKALAR, byId, legitimitet, ledareOf, onskatLager, pabud, pabudAndel, styrelseform, timeLabel, torkAndel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc, hjalpKnapp, hjalpText, num, pLink } from '../hjalp';
import { s } from '../lage';
import { sedBar } from './seder';
import type { Flik } from '../panel';

// styret (steg 3.5.4, styre.ts): ledaren, styrelseformen, legitimiteten, vågskålarna och de ledare byn haft.
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
      <ul class="rels"><li>${pLink(l)}<span></span><span class="muted">${esc(st.titel ?? '')}, ${dygnTxt(s.now - (st.sedan ?? s.now))}</span></li></ul>
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
    return `${ledare}<h3>Vågskålar</h3><ul class="seder">${skalar}</ul><h3>Byns ledare</h3><ol class="logg">${hist}</ol>`;
  },
};

// påbuden (steg 3.5.2): vad ledaren bestämt mot vad byn själv tycker, och hur mycket byn lyssnar
const varde = (k: Pabud, v: number) => k === 'torkat' ? `${Math.round(torkAndel(v) * 100)} %` : `${num(onskatLager(k === 'vedlager', v))} dygn`;
export const pabudFlik: Flik = {
  namn: 'Påbud',
  syns: harHaft,
  html() {
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
  },
};
