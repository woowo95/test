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

// ---------- skymningen och natten (steg 5.1.1.4) ----------
// varje färg ett och två steg mörkare, som närmaste färgen i paletten (som bildstilens P.skymn och P.natt)
// Mörkret drar mot de kalla tonerna (skiffer) i stället för bara mot svart (Björns val f6_nattfarg, steg 8.10.1): skymningen
// blandar färgen med skifferns ton till hälften, och natten tar skifferns ton helt, starkare
const mork = (f: (l: number[]) => number[]) => FARGER.map((_, i) => FARGER[narmastLab(f(LAB[i]))]);
const SKIFFER = PALETT.find(r => r.id === 'skiffer')!.toner.map(h => rgb2lab(hex2rgb(h)));
const SA = SKIFFER.reduce((s, l) => s + l[1], 0) / 4, SB = SKIFFER.reduce((s, l) => s + l[2], 0) / 4;
export const MORKARE: readonly (readonly string[])[] = [
  FARGER,
  mork(([L, a, b]) => [L * 0.67, a * 0.55 + SA * 0.5, b * 0.55 + SB * 0.5]),
  mork(([L]) => [L * 0.54, SA * 1.3, SB * 1.3]),
];
// djup natt (steg 5.1.7.2): tre steg mörkare, skymningens steg och sedan nattens, så att nästan allt blir kolsvart och bara
// elden lyser (det ljusaste, snön och halmen, syns svagt)
// molnskuggan (steg 6.8.19, Vädret under Tidsmodell): svagare än ett helt steg, varje färg den närmaste lite mörkare färgen i
// paletten; en färg utan någon närmare mörkare granne blir som ett helt steg
export const LITE_MORKARE: readonly string[] = mork(([L, a, b]) => [L * 0.84, a * 0.9, b * 0.9 - 0.006])
  .map((h, i) => h === FARGER[i] ? MORKARE[1][i] : h);
// Mitt i natten något ljusare (steg 9.2.12): i stället för nattens steg två gånger (skymningens och sedan nattens, så att nästan
// allt blev kolsvart) ett eget steg med ljusheten MORK_DJUP, aldrig ljusare än natten och aldrig mörkare än förut
const MORK_DJUP = 0.46;
const DJUP_FORUT = FARGER.map((_, i) => MORKARE[2][FARGER.indexOf(MORKARE[1][i])]);
const ljushet = (h: string) => LAB[FARGER.indexOf(h)][0];
(MORKARE as string[][]).push(mork(([L]) => [L * MORK_DJUP, SA * 1.3, SB * 1.3]).map((h, i) =>
  ljushet(h) > ljushet(MORKARE[2][i]) ? MORKARE[2][i] : ljushet(h) < ljushet(DJUP_FORUT[i]) ? DJUP_FORUT[i] : h));
export const DJUPNATT = 3;
const INDEX = new Map(FARGER.map((h, i) => [h, i]));
// färgen i mörkret m (0 = dag, 1 = skymning, 2 = natt, 3 = djup natt, och tal emellan) i punkten (x, y): mellan två steg väljer ett
// rastermönster (Bayer 4 × 4) vilken av dem punkten får, så att övergången blir jämn utan nya färger
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// rastret i stället för genomskinlighet (steg 5.5.1): punkten (x, y) ritas helt när styrkan a (0–1) når mönstrets tröskel, annars
// inte alls, så att något svagt syns glesare men bara i palettens färger
export const rasterPa = (a: number, x: number, y: number) => a * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5;
export function rasterSteg(hex: string, m: number, x: number, y: number) {
  const i = INDEX.get(hex.toLowerCase());
  if (i === undefined || m <= 0) return hex;
  const lag = Math.min(DJUPNATT - 1, Math.floor(m)), del = Math.min(DJUPNATT, m) - lag;
  const steg = del * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5 ? Math.min(DJUPNATT, lag + 1) : lag;
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
