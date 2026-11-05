// Ytor som används blir smutsigare (steg 5.1.7.3, "Bildstil" under Gränssnitt i designdokumentet): golven i husen och
// stationerna (bänkarna, borden, bäddarna) får fler mörka korn ju längre de varit i bruk, i tre steg. Smutsen är korn och inte
// fläckar (riktlinjen i Bildstil: smuts 1, inga mörka prickar): två punkter bredvid varandra ett steg mörkare i samma ramp.
// Stigarnas smuts räknas i mark.ts (mitten av stigen, där man går mest). Bara utseende: simuleringen läser inget härifrån.
import { DAY } from '../sim';
import { FARGER, tonSteg } from '../palett';
import { platsHash as hash } from './pixel';
import { PAL, PIX, hasIcon } from '../ikoner';

export const SLIT = {
  dygn: 8, // ett steg smutsigare för vart åttonde dygn (år i spelet) i bruk ...
  steg: 3, // ... högst så här många steg
  korn: 0.045, // så stor del av ytan blir ett korn per steg
};
// hur smutsigt (0 till SLIT.steg) det som blev färdigt vid klar är nu; utan tid (en äldre sparfil) ett steg
export const smutsGrad = (now: number, klar: number | undefined) => klar === undefined ? 1 : Math.max(0, Math.min(SLIT.steg, Math.floor((now - klar) / DAY / SLIT.dygn)));

const INDEX = new Map(FARGER.map((h, i) => [h, i]));
// färgen i punkten (x, y) med smuts av graden g (och lite mer med extra, 0–1): ett korn är två punkter i rad, ett steg mörkare
export function smutsigFarg(hex: string, x: number, y: number, g: number, s = 0, extra = 0) {
  if (g <= 0) return hex;
  const i = INDEX.get(hex.toLowerCase());
  if (i === undefined || hash(x >> 1, y, 931 + s) >= SLIT.korn * (g + extra)) return hex;
  return FARGER[tonSteg(i, -1)];
}
// stationens bild med smuts av graden g, som en egen bild (PIX och PAL), gjord en gång
const TECKEN = Array.from({ length: 32 }, (_, i) => String.fromCharCode(0xc0 + i)).join(''); // tecken som inga bilder använder
export function smutsIkon(k: string, g: number) {
  if (g <= 0 || !hasIcon(k)) return k;
  const id = `${k}_smuts${g}`;
  if (PIX[id]) return id;
  const pal = PAL[k] ?? {}, ny: Record<string, string> = {};
  PIX[id] = PIX[k]!.map((rad, y) => [...rad].map((ch, x) => {
    const f = pal[ch];
    if (ch === '.' || !f || !INDEX.has(f.toLowerCase())) { if (f) ny[ch] = f; return ch; }
    const c = TECKEN[INDEX.get(smutsigFarg(f, x, y, g).toLowerCase())!]!;
    ny[c] = FARGER[TECKEN.indexOf(c)]!;
    return c;
  }).join(''));
  PAL[id] = ny;
  return id;
}
