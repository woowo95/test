import { SEDER, SED_LIST, Sed, ageOf, influence, living, sedOppen, timeLabel } from '../../sim';
import { esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// byns seder: vad invånarna tillsammans tycker är viktigt, och vem som väger tyngst
export const seder: Flik = {
  namn: 'Seder',
  html() {
    const sd = s.seder;
    const voices = living(s).map(p => ({ p, w: influence(s, p) })).filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, 5);
    return `<div class="tekhead">${hjalpKnapp('seder', 'Vad är seder?')}</div>
    ${hjalpText('seder', '<p class="muted">Byns seder är vad invånarna tillsammans tycker är viktigt. De växer fram ur deras egenskaper och ur det som händer byn. Äldre och karismatiska röster väger tyngst. Sederna påverkar vad var och en väljer att göra.</p>')}
    <ul class="seder">${SED_LIST.filter(k => sedOppen(s, k)).map(k => `<li title="${esc(SEDER[k].effect)}"><div class="sedtop"><span>${SEDER[k].neg}</span><span>${SEDER[k].pos}</span></div>${sedBar(sd.v[k])}
      <p class="sedw">${sedWord(k, sd.v[k])}</p>${hjalpText('seder', `<p class="muted small">${SEDER[k].effect}</p>`)}</li>`).join('')}</ul>
    <h3>Tyngsta röster</h3>${voices.length ? `<ul class="rels">${voices.map(x => `<li>${pLink(x.p)}<span></span><span class="muted">${Math.floor(ageOf(x.p, s.now))} år${x.p.tag ? `, ${esc(x.p.tag.toLowerCase())}` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">–</p>'}
    <h3>Det som format sederna</h3>${sd.log.length ? `<ol class="logg">${sd.log.slice().reverse().map(l => `<li><span class="when">${timeLabel(s, l.t)}</span>${esc(l.text)}</li>`).join('')}</ol>` : '<p class="muted">Inget särskilt har hänt ännu.</p>'}`;
  },
};

// en stapel från mitten: åt vänster för den ena hållningen, åt höger för den andra
export function sedBar(v: number) {
  const w = Math.round(Math.abs(v) * 50);
  return `<span class="sbar"><span style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span></span>`;
}
function sedWord(k: Sed, v: number) {
  const i = SEDER[k], a = Math.abs(v);
  if (a < 0.12) return 'Ingen tydlig hållning';
  return `${a > 0.55 ? 'Starkt' : a > 0.3 ? 'Tydligt' : 'Lite'}: ${(v > 0 ? i.pos : i.neg).toLowerCase()}`;
}
