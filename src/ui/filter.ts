import { FYND, FYND_IDS, GRUPPER, Grupp, H, HOUR, W, ageIndex, fyndAt } from '../sim';
import { iconImg } from '../ikoner';
import { $, esc } from './hjalp';
import { s, ui } from './lage';
import { TS, filterG } from './scen';

// filtret på kartan: en knapp per grupp (växter, djur, sten). Är den på visas alla lager i gruppen som prickar,
// var och en i sin färg, små där det finns lite och stora där det finns mycket. Det visar sanningen, inte vad byn vet.
const knappar = $('filters');
knappar.innerHTML = (Object.keys(GRUPPER) as Grupp[]).map(g => `<button type="button" data-g="${g}" aria-pressed="false" title="${esc(GRUPPER[g].namn)}" aria-label="${esc(GRUPPER[g].namn)}">${iconImg(GRUPPER[g].ikon, 20)}</button>`).join('');
knappar.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  const g = b.dataset.g as Grupp;
  ui.filter = ui.filter === g ? undefined : g;
  for (const k of knappar.querySelectorAll('button')) k.setAttribute('aria-pressed', String(k.dataset.g === ui.filter));
  visaForklaring();
  drawFilter(true);
});
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
function visaForklaring() {
  const el = $('legend');
  el.hidden = !ui.filter;
  if (!ui.filter) return;
  el.innerHTML = FYND_IDS.filter(k => FYND[k].grupp === ui.filter).map(k => `<span title="${esc(FYND[k].namn)}"><i style="background:${hex(FYND[k].farg)}"></i>${iconImg(FYND[k].ikon, 14)}</span>`).join('');
}

// lagren ändras som mest en gång i timmen, så kartan ritas om när timmen eller filtret byts
let ritad = '';
export function drawFilter(force = false) {
  const key = `${ui.filter},${s.seed},${Math.floor(s.now / HOUR)},${ageIndex(s)}`;
  if (!force && key === ritad) return;
  ritad = key;
  filterG.clear();
  if (!ui.filter) return;
  // en prick per lager i varje ruta, på var sin plats i rutan; större ju mer som finns
  const lagren = FYND_IDS.filter(k => FYND[k].grupp === ui.filter), n = lagren.length;
  const maxR = n === 1 ? TS * 0.45 : TS * 0.3;
  lagren.forEach((k, j) => {
    const f = FYND[k], a = (j / n) * Math.PI * 2 - Math.PI / 2, off = n === 1 ? 0 : TS * 0.22;
    const ox = TS / 2 + Math.cos(a) * off, oy = TS / 2 + Math.sin(a) * off;
    filterG.beginFill(f.farg, 0.85);
    for (let i = 0; i < W * H; i++) {
      const v = Math.min(1, fyndAt(s, k, i) / f.topp);
      if (v >= 0.12) filterG.drawCircle((i % W) * TS + ox, Math.floor(i / W) * TS + oy, maxR * Math.sqrt(v));
    }
    filterG.endFill();
  });
}
