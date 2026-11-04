// Paletten (steg 5.1.1, "Bildstil" under Gränssnitt i designdokumentet): palett B, Avokado och rost, som Björn valde efter v94.
// 32 färger i åtta ramper med fyra toner, mörk till ljus. All ritning tar sina färger ur den: sakernas bilder (ikoner.ts),
// stationerna, marken, blodet och panelen. Färgerna är räknade i bildstilen (bildstil/sida.js, gorPalett) och skrivna in
// här, så att spelet inte behöver räkna dem. Ingen färg är fulltonssvart: den mörkaste är kolets första ton.
// Skymningen och natten (steg 5.1.1.4): paletten ett och två steg mörkare (MORKARE), med ett rastermönster mellan stegen
// (rasterSteg), så att natten också bara har färger ur paletten.

export interface Ramp { id: string; vad: string; toner: readonly [string, string, string, string] }

export const PALETT: readonly Ramp[] = [
  { id: 'kol', vad: 'skugga, kol, konturer', toner: ['#24201d', '#2f261d', '#372f25', '#474138'] },
  { id: 'jord', vad: 'jord, stigar, läder, mörkt trä', toner: ['#3f2415', '#5e3c24', '#7d5b40', '#987e62'] },
  { id: 'senap', vad: 'torrt gräs, halm, rep, eld', toner: ['#694902', '#906f0f', '#b2921b', '#d8b25f'] },
  { id: 'rost', vad: 'blod, kött, lera, bär, hud', toner: ['#521100', '#742a01', '#a14808', '#bd753e'] },
  { id: 'oliv', vad: 'gräs, mossa, löv', toner: ['#353204', '#4b4f00', '#647025', '#898b4c'] },
  { id: 'barr', vad: 'granar, mörk skog, djupt vatten', toner: ['#21290d', '#21310e', '#324726', '#505e3e'] },
  { id: 'skiffer', vad: 'sten, vatten, flinta, järn', toner: ['#233035', '#3e5156', '#61767a', '#8a9c9e'] },
  { id: 'ben', vad: 'ben, snö, ljus hud, glans', toner: ['#7e7362', '#a0947d', '#bdb39b', '#dad0bb'] },
];

// alla 32 färgerna, ramp för ramp
export const FARGER: readonly string[] = PALETT.flatMap(r => r.toner);
const ARPALETT = new Set(FARGER);
export const iPaletten = (hex: string) => ARPALETT.has(hex.toLowerCase());
// en ton ur paletten: farg('rost', 2)
export const farg = (ramp: string, ton: 0 | 1 | 2 | 3) => PALETT.find(r => r.id === ramp)!.toner[ton];
export const fargTal = (hex: string) => parseInt(hex.slice(1), 16);

// ---------- färger i OKLab, som i bildstilen ----------
const hex2rgb = (h: string) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function rgb2lab([r, g, b]: number[]) {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const LAB = FARGER.map(h => rgb2lab(hex2rgb(h)));
function narmastLab(lab: number[]) {
  let bi = 0, bd = 1e9;
  LAB.forEach((c, i) => { const d = (c[0] - lab[0]) ** 2 * 1.3 + (c[1] - lab[1]) ** 2 + (c[2] - lab[2]) ** 2; if (d < bd) { bd = d; bi = i; } });
  return bi;
}
// närmaste färgen i paletten
export const narmast = (hex: string) => FARGER[narmastLab(rgb2lab(hex2rgb(hex)))];
// en färg ur spelets gamla bilder: lite mörkare och gråare, och sedan närmaste färgen i paletten (som bildstilen visar dem, P.fran)
export const franGammal = (hex: string) => { const [L, a, b] = rgb2lab(hex2rgb(hex)); return FARGER[narmastLab([L * 0.93, a * 0.78, b * 0.78 + 0.004])]; };

// ---------- skymningen och natten (steg 5.1.1.4) ----------
// varje färg ett och två steg mörkare, som närmaste färgen i paletten (som bildstilens P.skymn och P.natt)
const mork = (f: (l: number[]) => number[]) => FARGER.map((_, i) => FARGER[narmastLab(f(LAB[i]))]);
export const MORKARE: readonly (readonly string[])[] = [
  FARGER,
  mork(([L, a, b]) => [L * 0.68, a * 0.8, b * 0.8 - 0.012]),
  mork(([L, a, b]) => [L * 0.5, a * 0.45 - 0.004, b * 0.45 - 0.028]),
];
const INDEX = new Map(FARGER.map((h, i) => [h, i]));
// färgen i mörkret m (0 = dag, 1 = skymning, 2 = natt, och tal emellan) i punkten (x, y): mellan två steg väljer ett
// rastermönster (Bayer 4 × 4) vilken av dem punkten får, så att övergången blir jämn utan nya färger
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function rasterSteg(hex: string, m: number, x: number, y: number) {
  const i = INDEX.get(hex.toLowerCase());
  if (i === undefined || m <= 0) return hex;
  const lag = Math.min(1, Math.floor(m)), del = Math.min(2, m) - lag;
  const steg = del * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5 ? Math.min(2, lag + 1) : lag;
  return MORKARE[steg][i];
}

// Korn (steg 5.1.7.1, "Bildstil" under Gränssnitt: gritty, smuts 1): ingen yta är slät över mer än 4 × 4 punkter. I varje
// cell om 4 × 4 punkter (räknat ur platsen x0 + x, y0 + y, så att kornet går ihop över bildernas kanter) flyttas en punkt och
// grannen till höger ett steg i sin egen ramp, två gånger av tre mörkare (smutsen) och annars ljusare, men bara där ytan är
// slät runt om: kanter, konturer och det som redan har mönster rörs inte. Korn och inte fläckar: aldrig mer än ett steg och
// aldrig två korn bredvid varandra. px = platsen i paletten (-1 = tomt), w × h punkter
export const KORN = { cell: 4, mork: 2 / 3 };
function kornHash(x: number, y: number, s: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const tonSteg = (c: number, d: number) => { const t = (c & 3) + d, u = t < 0 || t > 3 ? (c & 3) - d : t; return c - (c & 3) + Math.max(0, Math.min(3, u)); };
export function kornPa(px: Int8Array, w: number, h: number, x0 = 0, y0 = 0, s = 0) {
  const n = KORN.cell, ut = px.slice();
  const slat = (x: number, y: number) => {
    const c = px[y * w + x];
    if (c < 0 || x < 1 || y < 1 || x >= w - 2 || y >= h - 1) return false;
    return px[y * w + x - 1] === c && px[y * w + x + 1] === c && px[y * w + x + 2] === c && px[(y - 1) * w + x] === c && px[(y + 1) * w + x] === c && px[(y - 1) * w + x + 1] === c && px[(y + 1) * w + x + 1] === c;
  };
  for (let cy = Math.floor(y0 / n); cy * n < y0 + h; cy++) for (let cx = Math.floor(x0 / n); cx * n < x0 + w; cx++) {
    let x = -1, y = -1;
    for (let k = 0; k < 4 && x < 0; k++) { // en annan plats i cellen om den första inte är slät
      const xx = cx * n + Math.floor(kornHash(cx, cy, 901 + s + k * 7) * (n - 1)) - x0, yy = cy * n + Math.floor(kornHash(cx, cy, 902 + s + k * 7) * n) - y0;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && slat(xx, yy)) { x = xx; y = yy; }
    }
    if (x < 0) continue;
    const d = kornHash(cx, cy, 903 + s) < KORN.mork ? -1 : 1, c = px[y * w + x];
    ut[y * w + x] = ut[y * w + x + 1] = tonSteg(c, d);
  }
  px.set(ut);
}
