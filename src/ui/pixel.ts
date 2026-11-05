// Hjälparna för det som ritas i punkter (steg 5.5.7): slump som bara beror på platsen, ett mjukt brus, Bayer-rastret och
// att blanda två färger. Samlade här så att marken, träden, slitaget, blodet, vädret och folket räknar likadant. Bara
// utseende: spelet läser dem aldrig, och de drar ingen slump.
import { BAYER } from '../palett';

// slump 0–1 som bara beror på (x, y) och fröet s (heltal): samma plats ger alltid samma tal
export function platsHash(x: number, y: number, s: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// ett mjukt brus 0–1 med fläckar ungefär sk punkter stora (värden i ett rutnät, mjukt blandade)
export function brus(x: number, y: number, sk: number, s: number) {
  const fx = x / sk, fy = y / sk, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = platsHash(x0, y0, s), b = platsHash(x0 + 1, y0, s), c = platsHash(x0, y0 + 1, s), d = platsHash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// slump 0–1 ur tal som inte är heltal (blodet och sporten): samma tal ger samma slump
export const sinHash = (a: number, b = 0) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };
// Bayer-rastret 4 × 4 som tröskel 0–1 i punkten (x, y): en punkt med styrkan a ritas när bayer(x, y) < a
const TROSKEL = BAYER.map(v => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => TROSKEL[(y & 3) * 4 + (x & 3)]!;
// färgen mellan a (f = 0) och b (f = 1), som tal 0xrrggbb
export function mix(a: number, b: number, f: number) {
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
