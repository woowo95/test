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
    // utan ljusa linjer mellan delarna (steg 6.9.8): delarna möts direkt, bara ramen runt om är kol
    if (d > r - 0.7) g[k] = farg('kol', 0);
    else del[k] = j;
  }
  const linjer = rutor(n, n, (x, y) => g[y * n + x]);
  const grupper = delar.map((dl, j) => `<g ${dl.attr}><title>${dl.titel}</title>${rutor(n, n, (x, y) => del[y * n + x] === j ? '#' : '').replace(/ fill="#"/g, '')}</g>`).join('');
  return svg(n, n, grupper + linjer, 'tart', TART_SKALA, ' role="img" aria-label="Vad hen ägnat sin vakna tid åt"');
}

// ---------- köpmansvågen (steg 6.9.9, skissen bildstil/granssnitt/seder.png): en ring överst, en gaffel med visare, balken och
// runda skålar på tre trådar, i brons. n vikter (högst 5, staplade tre, två och en) i skålen på sidan sida; balken tippar mer
// ju fler de är. Vikterna är gråblå (skiffer). Vågen är låg: 64 × 30 punkter
const VAG_W = 64, VAG_H = 30, VAG_L = 24, VAG_TIPP = 1.6, VAG_RADER = [3, 2, 1];
const VAGAR = new Map<string, string>();
export function vagSvg(n: number, sida: -1 | 1, skala = 2) {
  const k = `${n}:${sida}:${skala}`, hit = VAGAR.get(k);
  if (hit) return hit;
  const g: string[] = Array(VAG_W * VAG_H).fill('');
  const satt = (x: number, y: number, c: string) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < VAG_W && y < VAG_H) g[y * VAG_W + x] = c; };
  const linje = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    const st = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= st; i++) satt(x0 + (x1 - x0) * i / st, y0 + (y1 - y0) * i / st, c);
  };
  const cx = VAG_W / 2, py = 9, lut = sida * Math.min(5, n) * VAG_TIPP / VAG_L; // lutningen: positiv när höger sida sjunker
  const morkt = 'vagm', brons = farg('senap', 2), ljust = farg('senap', 3);
  // ringen och gaffeln, som hänger stilla
  for (const [x, y] of [[-1, 0], [0, 0], [1, 0], [-2, 1], [2, 1], [-1, 2], [1, 2]]) satt(cx + x, y, morkt);
  linje(cx - 3, 3, cx + 3, 3, brons); linje(cx - 3, 4, cx - 3, 8, brons); linje(cx + 3, 4, cx + 3, 8, brons);
  // visaren, vinkelrätt mot balken
  for (let t = 1; t <= 5; t++) satt(cx + lut * t, py - t, morkt);
  // balken, två punkter tjock
  for (let x = -VAG_L; x <= VAG_L; x++) { satt(cx + x, py + lut * x, ljust); satt(cx + x, py + lut * x + 1, brons); }
  satt(cx, py, morkt);
  // skålarna på tre trådar, och vikterna i den tunga
  for (const s of [-1, 1] as const) {
    const ex = cx + s * VAG_L, ey = py + lut * s * VAG_L, ry = ey + 10;
    linje(ex, ey + 1, ex - 7, ry, morkt); linje(ex, ey + 1, ex, ry, morkt); linje(ex, ey + 1, ex + 7, ry, morkt);
    for (let x = -8; x <= 8; x++) satt(ex + x, ry, ljust);
    for (let x = -7; x <= 7; x++) satt(ex + x, ry + 1, brons);
    for (let x = -5; x <= 5; x++) satt(ex + x, ry + 2, morkt);
    if (s !== sida || n <= 0) continue;
    let kvar = Math.min(5, n);
    VAG_RADER.forEach((r, i) => {
      const m = Math.min(r, kvar); kvar -= m;
      for (let j = 0; j < m; j++) {
        const x0 = ex - (m * 5 - 1) / 2 + j * 5, y0 = ry - 3 - i * 3;
        for (let dx = 0; dx < 4; dx++) { satt(x0 + dx, y0, farg('skiffer', 3)); satt(x0 + dx, y0 + 1, farg('skiffer', 2)); satt(x0 + dx, y0 + 2, farg('skiffer', 1)); }
      }
    });
  }
  const u = svg(VAG_W, VAG_H, rutor(VAG_W, VAG_H, (x, y) => g[y * VAG_W + x]), 'vagbild', skala, ' aria-hidden="true"');
  VAGAR.set(k, u);
  return u;
}
