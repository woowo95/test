import { SEDER, SED_LIST, Sed, ageOf, influence, living, sedDrag, sedOppen, upplevelseKort, yrkeNamn } from '../../sim';
import { esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// byns seder: vad invånarna tillsammans tycker är viktigt, och vem som väger tyngst
export const seder: Flik = {
  namn: 'Seder',
  html() {
    const sd = s.seder;
    const drag = sedDrag(s).slice(0, 6);
    const voices = living(s).map(p => ({ p, w: influence(s, p) })).filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, 5);
    return `<div class="tekhead">${hjalpKnapp('seder', 'Vad är seder?')}</div>
    ${hjalpText('seder', '<p class="muted">Byns seder är vad invånarna tillsammans tycker är viktigt. Var och en drar dem efter sin personlighet och det hen varit med om. Äldre och karismatiska röster väger tyngst. Sederna påverkar vad var och en väljer att göra.</p>')}
    <ul class="seder">${SED_LIST.filter(k => sedOppen(s, k)).map(k => `<li title="${esc(SEDER[k].effect)}"><div class="sedtop"><span>${SEDER[k].neg}</span><span>${SEDER[k].pos}</span></div>${sedBar(sd.v[k])}
      <p class="sedw">${sedWord(k, sd.v[k])}</p>${hjalpText('seder', `<p class="muted small">${SEDER[k].effect}</p>`)}</li>`).join('')}</ul>
    <h3>Tyngsta röster</h3>${voices.length ? `<ul class="rels">${voices.map(x => `<li>${pLink(x.p)}<span></span><span>${esc(yrkeNamn(s, x.p) ?? '')}</span><span class="muted">${Math.floor(ageOf(x.p, s.now))} år</span></li>`).join('')}</ul>` : '<p class="muted">–</p>'}
    <h3>Det som format sederna</h3>${hjalpText('seder', '<p class="muted small">De upplevelser invånarna minns som drar byns seder mest, och hur många som minns dem. Talet är hur mycket upplevelsen flyttar seden, där 100 är hela stapeln åt det hållet.</p>')}${drag.length ? `<ul class="rels">${drag.map(r => `<li><span>${esc(upplevelseKort(r.k))}</span><span class="muted">${r.n} ${r.n === 1 ? 'person' : 'personer'}</span><span>${SED_LIST.filter(k => Math.abs(r.d[k]) >= 0.005).map(k => `${(r.d[k] > 0 ? SEDER[k].pos : SEDER[k].neg)} ${Math.max(1, Math.round(Math.abs(r.d[k]) * 100))}`).join(', ')}</span></li>`).join('')}</ul>` : '<p class="muted">Ingen minns något som drar sederna ännu.</p>'}`;
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
