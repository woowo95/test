import { farg } from '../palett';

// Framstegscirkeln, ringen runt en teknik eller ett redskap och tårtan över den vakna tiden som pixelbilder i paletten
// (steg 5.3.2.2; ritningarna är Björns godkända v_framsteg, v_ring och v_tart i bildstil/gui.js, steg 5.2.4.2). Varje punkt
// räknas ur hur långt det kommit, medsols från klockan tolv, och bilden är en svg av rutor (skarp i alla storlekar, och
// den fungerar också utan canvas). Kartans framstegscirkel ritar samma punkter med Pixi (framstegPunkter, foremal.ts).

// vinkeln medsols från klockan tolv, 0 till 1
const vinkel = (dx: number, dy: number) => { const a = Math.atan2(dx + 0.0001, -dy) / (2 * Math.PI); return a < 0 ? a + 1 : a; };
// rutorna som svg: varje rad slås ihop till sträckor med samma färg. farg(x, y) ger färgen, '' för genomskinligt
function rutor(w: number, h: number, f: (x: number, y: number) => string) {
  let r = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w;) {
    const c = f(x, y); let n = 1;
    while (x + n < w && f(x + n, y) === c) n++;
    if (c) r += `<rect x="${x}" y="${y}" width="${n}" height="1" ${c.startsWith('#') ? `fill="${c}"` : `class="${c}"`}/>`;
    x += n;
  }
  return r;
}
const svg = (w: number, h: number, inre: string, cls: string, skala = 1, extra = '') =>
  `<svg class="${cls}" width="${w * skala}" height="${h * skala}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"${extra}>${inre}</svg>`;

// ---------- framstegscirkeln: en mörk bricka med ljus kant som fylls med gult medsols från klockan tolv ----------
// r = 4 på kartan (9 × 9 punkter) och 7 i panelen (15 × 15)
export function framstegPunkter(r: number, p: number, satt: (x: number, y: number, c: string) => void) {
  const f = Math.min(1, Math.max(0, p));
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y); if (d > r + 0.3) continue;
    const kant = d > r - 0.9, fylld = f >= 1 || (f > 0 && vinkel(x, y) < f);
    satt(x + r, y + r, kant ? farg('ben', 3) : fylld ? farg('senap', 3) : farg('kol', 0));
  }
}
const FRAMSTEG = new Map<string, string>();
export function framstegSvg(p: number, r = 7) {
  const k = r + ':' + Math.round(Math.min(1, Math.max(0, p)) * 64), hit = FRAMSTEG.get(k);
  if (hit) return hit;
  const n = 2 * r + 1, g: string[] = Array(n * n).fill('');
  framstegPunkter(r, Number(k.split(':')[1]) / 64, (x, y, c) => { g[y * n + x] = c; });
  const ut = svg(n, n, rutor(n, n, (x, y) => g[y * n + x]), 'ikon framsteg', 1, ' aria-hidden="true"');
  FRAMSTEG.set(k, ut);
  return ut;
}

// ---------- ringen: en linje i rost som växer medsols från toppen, runt knappens kant ----------
// b = knappens yttre bredd i punkter (med kanten), hornet = hörnens radie (0 för en rund knapp). Bilden är 4 punkter
// större åt varje håll, som ringen alltid legat (inset -4px), och linjen ligger på knappens kant
const RINGAR = new Map<string, string>();
export function ringSvg(p: number, b: number, hornet = 0) {
  const f = Math.round(Math.min(1, Math.max(0, p)) * 100) / 100, k = `${b}:${hornet}:${f}`, hit = RINGAR.get(k);
  if (hit) return hit;
  const n = b + 8, c = (n - 1) / 2, R = b / 2 - 0.5, rr = hornet || R; // en rund knapp är en ruta med hörn lika stora som den
  const pa = (x: number, y: number) => {
    const qx = Math.abs(x - c) - (R - rr), qy = Math.abs(y - c) - (R - rr);
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr; // avståndet till kanten
    return d >= -1.4 && d <= 0.6 && f > 0 && vinkel(x - c, y - c) <= f;
  };
  const ut = svg(n, n, rutor(n, n, (x, y) => pa(x, y) ? farg('rost', 2) : ''), 'ring', 1, ' aria-hidden="true"');
  RINGAR.set(k, ut);
  return ut;
}

// ---------- tårtan: delarna med en tunn linje i panelens färg mellan dem och en mörk kant ----------
// Varje del är en grupp med sin färg i --f och data-i, så att den valda kan lysa och de andra blekna (template.html)
export const TARTFARG: readonly string[] = [farg('oliv', 3), farg('senap', 3), farg('rost', 2), farg('skiffer', 3), farg('jord', 3), farg('barr', 2), farg('kol', 3)];
export const tartFarg = (i: number, antal: number) => TARTFARG[(i === antal - 1 && i % TARTFARG.length === 0 && i > 0 ? 1 : i) % TARTFARG.length];
export const TART_R = 20, TART_SKALA = 3; // som den godkända bilden, i tre gånger storleken
export function tartSvg(delar: { v: number; attr: string; titel: string }[]) {
  const r = TART_R, n = 2 * r + 1, tot = delar.reduce((a, b) => a + b.v, 0) || 1;
  const grans: number[] = []; let acc = 0; for (const d of delar) { acc += d.v / tot; grans.push(acc); }
  const g: string[] = Array(n * n).fill(''), del: number[] = Array(n * n).fill(-1);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.hypot(x, y); if (d > r + 0.3) continue;
    const a = vinkel(x, y), i = grans.findIndex(v => a < v), j = i < 0 ? delar.length - 1 : i, k = (y + r) * n + x + r;
    const nara = delar.length > 1 && grans.some(v => { const dv = Math.abs(a - v); return Math.min(dv, 1 - dv) * 2 * Math.PI * d < 0.7; }) && d > 1;
    if (d > r - 0.7) g[k] = farg('kol', 0);
    else if (nara) g[k] = 'tl';
    else del[k] = j;
  }
  const linjer = rutor(n, n, (x, y) => g[y * n + x]);
  const grupper = delar.map((dl, j) => `<g ${dl.attr}><title>${dl.titel}</title>${rutor(n, n, (x, y) => del[y * n + x] === j ? '#' : '').replace(/ fill="#"/g, '')}</g>`).join('');
  return svg(n, n, grupper + linjer, 'tart', TART_SKALA, ' role="img" aria-label="Vad hen ägnat sin vakna tid åt"');
}
