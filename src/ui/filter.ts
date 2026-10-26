import { FYND, FYND_IDS, FyndId, GRUPPER, Grupp, H, HOUR, W, ageIndex, fyndAt, plockOf, vaxerAt } from '../sim';
import { iconImg } from '../ikoner';
import { $, esc } from './hjalp';
import { s, ui } from './lage';
import { TS, filterG } from './scen';

// filtret på kartan: en knapp per grupp (växter, djur, sten). Är den på visas alla lager i gruppen, var och en i sin
// färg. En ring visar var det växer och en prick hur mycket som finns kvar just nu: en tom ring är plockad.
// Ett tryck på en art i teckenförklaringen visar bara den. Det visar sanningen, inte vad byn vet.
const knappar = $('filters'), forklaring = $('legend');
knappar.innerHTML = (Object.keys(GRUPPER) as Grupp[]).map(g => `<button type="button" data-g="${g}" aria-pressed="false" title="${esc(GRUPPER[g].namn)}" aria-label="${esc(GRUPPER[g].namn)}">${iconImg(GRUPPER[g].ikon, 20)}</button>`).join('');
knappar.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  const g = b.dataset.g as Grupp;
  ui.filter = ui.filter === g ? undefined : g;
  ui.filterArt = undefined;
  for (const k of knappar.querySelectorAll('button')) k.setAttribute('aria-pressed', String(k.dataset.g === ui.filter));
  visaForklaring();
  drawFilter(true);
});
forklaring.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button');
  if (!b) return;
  const k = b.dataset.k as FyndId;
  ui.filterArt = ui.filterArt === k ? undefined : k;
  visaForklaring();
  drawFilter(true);
});
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
function visaForklaring() {
  forklaring.hidden = !ui.filter;
  if (!ui.filter) return;
  forklaring.innerHTML = FYND_IDS.filter(k => FYND[k].grupp === ui.filter).map(k => `<button type="button" data-k="${k}" aria-pressed="${ui.filterArt === k}" title="${esc(FYND[k].namn)}" aria-label="${esc(FYND[k].namn)}"><i style="background:${hex(FYND[k].farg)}"></i>${iconImg(FYND[k].ikon, 14)}</button>`).join('');
}

// lagren växer en gång i timmen och töms när någon tar ur dem (plockOf), så kartan ritas om när timmen, uttagen eller filtret ändras
let ritad = '';
export function drawFilter(force = false) {
  const key = `${ui.filter},${ui.filterArt},${s.seed},${Math.floor(s.now / HOUR)},${ageIndex(s)},${plockOf(s)}`;
  if (!force && key === ritad) return;
  ritad = key;
  filterG.clear();
  if (!ui.filter) return;
  // varje lager får sin plats i rutan; ringen är var det växer, pricken vad som finns kvar
  const lagren = ui.filterArt ? [ui.filterArt] : FYND_IDS.filter(k => FYND[k].grupp === ui.filter), n = lagren.length;
  // under MIN ritas inget, så att de glesa rötterna överallt inte döljer bärsnåren
  const maxR = n === 1 ? TS * 0.45 : TS * 0.3, MIN = 0.16;
  lagren.forEach((k, j) => {
    const f = FYND[k], a = (j / n) * Math.PI * 2 - Math.PI / 2, off = n === 1 ? 0 : TS * 0.22;
    const ox = TS / 2 + Math.cos(a) * off, oy = TS / 2 + Math.sin(a) * off;
    const nu = new Float32Array(W * H), vx = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { vx[i] = Math.min(1, vaxerAt(s, k, i) / f.topp); nu[i] = Math.min(1, fyndAt(s, k, i) / f.topp); }
    filterG.lineStyle(1, f.farg, 0.6);
    for (let i = 0; i < W * H; i++) if (vx[i] >= MIN && vx[i] - nu[i] > 0.08) filterG.drawCircle((i % W) * TS + ox, Math.floor(i / W) * TS + oy, maxR * Math.sqrt(vx[i]));
    filterG.lineStyle(0);
    filterG.beginFill(f.farg, 0.85);
    for (let i = 0; i < W * H; i++) if (nu[i] >= MIN) filterG.drawCircle((i % W) * TS + ox, Math.floor(i / W) * TS + oy, maxR * Math.sqrt(nu[i]));
    filterG.endFill();
  });
}
