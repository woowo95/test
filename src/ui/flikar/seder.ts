import { SEDER, SED_LIST, Sed, ageOf, roster, sedDrag, sedOppen, upplevelseKort, yrkeNamn } from '../../sim';
import { esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// byns seder: vad invånarna tillsammans tycker är viktigt, och vem som väger tyngst
export const seder: Flik = {
  namn: 'Seder',
  html() {
    const sd = s.seder;
    const drag = sedDrag(s).slice(0, 6);
    const voices = roster(s).slice(0, 5); // med ledarens extra vikt (steg 4.5.4.10)
    return `<div class="tekhead">${hjalpKnapp('seder', 'Vad är seder?')}</div>
    ${hjalpText('seder', '<p class="muted">Byns seder är vad invånarna tillsammans tycker är viktigt. Var och en drar dem efter sin personlighet och det hen varit med om. Äldre och karismatiska röster väger tyngst. Sederna påverkar vad var och en väljer att göra.</p>')}
    <ul class="seder">${SED_LIST.filter(k => sedOppen(s, k)).map(k => `<li title="${esc(SEDER[k].effect)}"><div class="sedtop"><span>${SEDER[k].neg}</span><span>${SEDER[k].pos}</span></div>${sedVag(sd.v[k])}
      <p class="sedw">${sedWord(k, sd.v[k])}</p>${hjalpText('seder', `<p class="muted small">${SEDER[k].effect}</p>`)}</li>`).join('')}</ul>
    <h3>Tyngsta röster</h3>${voices.length ? `<ul class="rels">${voices.map(x => `<li>${pLink(x.p)}<span>${esc(yrkeNamn(s, x.p) ?? '')}</span><span class="muted">${Math.floor(ageOf(x.p, s.now))} år</span><span title="Andel av byns röst i sederna">${Math.round(x.andel * 100)} %</span></li>`).join('')}</ul>` : '<p class="muted">–</p>'}
    <h3>Det som format sederna</h3>${hjalpText('seder', '<p class="muted small">De upplevelser invånarna minns som drar byns seder mest, och hur många som minns dem. Talet är hur mycket upplevelsen flyttar seden, där 100 är hela stapeln åt det hållet.</p>')}${drag.length ? `<ul class="rels">${drag.map(r => `<li><span>${esc(upplevelseKort(r.k))}</span><span></span><span class="muted">${r.n} ${r.n === 1 ? 'person' : 'personer'}</span><span>${SED_LIST.filter(k => Math.abs(r.d[k]) >= 0.005).map(k => `${(r.d[k] > 0 ? SEDER[k].pos : SEDER[k].neg)} ${Math.max(1, Math.round(Math.abs(r.d[k]) * 100))}`).join(', ')}</span></li>`).join('')}</ul>` : '<p class="muted">Ingen minns något som drar sederna ännu.</p>'}`;
  },
};

// en stapel från mitten: åt vänster för den ena hållningen, åt höger för den andra
// en sed som köpmansvåg (steg 5.3.3.3): varje steg från mitten är en vikt i skålen på den sidan, högst VIKTER, staplade
// tre, två och en så att de går att räkna, och den tunga skålen sjunker
const VIKTER = 5, RADER = [3, 2, 1];
export function sedVag(v: number) {
  const n = Math.min(VIKTER, Math.round(Math.abs(v) * VIKTER));
  const vikter = () => { let kvar = n; return RADER.map(r => { const k = Math.min(r, kvar); kvar -= k; return k ? `<span class="rad">${'<i></i>'.repeat(k)}</span>` : ''; }).join(''); };
  const skal = (sida: 'v' | 'h', tung: boolean) => `<span class="skal ${sida}" style="--y:${tung ? -n * 2 : n * 2}px">${tung ? vikter() : ''}</span>`;
  return `<span class="vag" role="img" aria-label="${n ? `${n} av ${VIKTER} åt ${v < 0 ? 'vänster' : 'höger'}` : 'i jämvikt'}"><span class="balk"></span><span class="fot"></span>${skal('v', v < 0 && n > 0)}${skal('h', v > 0 && n > 0)}</span>`;
}
export function sedBar(v: number) {
  const w = Math.round(Math.abs(v) * 50);
  return `<span class="sbar"><span style="${v >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`}"></span></span>`;
}
function sedWord(k: Sed, v: number) {
  const i = SEDER[k], a = Math.abs(v);
  if (a < 0.12) return 'Ingen tydlig hållning';
  return `${a > 0.55 ? 'Starkt' : a > 0.3 ? 'Tydligt' : 'Lite'}: ${(v > 0 ? i.pos : i.neg).toLowerCase()}`;
}
