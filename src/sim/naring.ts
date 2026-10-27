// Näringen (steg 2.6.1, beslut). Varje person har fem näringsvärden (registret NARING): energi, protein, fett, vitaminer och
// mineraler, från 0 (slut) till 1 (fyllt). Maten fyller dem efter sitt innehåll (`naring` i SAKER, saker.ts), och de sjunker
// olika fort. Mättnaden (p.hunger) är en sammanfattning: värdena vägda med `vikt`. Talen är valda så att mättnaden sjunker som
// förut (KROPP.hungerTim) när inget värde är slut, och så att en portion höjer den lika mycket som förut när inget värde
// redan är fyllt. Den som är mätt kan alltså ändå ha brist på något; vad brist gör kommer i 2.6.2. Fliken Hälsa visar
// värdena (person.ts)
import { Person } from './typer';
import { SAKER } from './saker';
import { clamp } from './slump';

interface NaringDef { namn: string; tecken: string; vikt: number; takt: number; fran: string }
// vikt = hur mycket värdet väger i mättnaden (summan är 1), takt = hur fort det sjunker jämfört med de andra, fran = var det
// finns (designdokumentet), tecken = symbolen (platshållare)
export const NARING = {
  energi: { namn: 'Energi', tecken: '⚡', vikt: 0.4, takt: 1.1, fran: 'stärkelse, sött och fett' },
  protein: { namn: 'Protein', tecken: '🍖', vikt: 0.2, takt: 0.9, fran: 'kött, fisk, ärtor och ägg' },
  fett: { namn: 'Fett', tecken: '🧈', vikt: 0.15, takt: 0.8, fran: 'djurfett, fet fisk, nötter och olja' },
  vitamin: { namn: 'Vitaminer', tecken: '🍓', vikt: 0.125, takt: 0.8, fran: 'grönt, bär och frukt' },
  mineral: { namn: 'Mineraler', tecken: '🧂', vikt: 0.125, takt: 0.9, fran: 'salt, grönt, kött och fisk' },
} satisfies Record<string, NaringDef>;
export type Naring = keyof typeof NARING;
export const NARINGAR = Object.keys(NARING) as Naring[];
const DEF: Record<Naring, NaringDef> = NARING;
// så att mättnaden sjunker 1 / KROPP.hungerTim i timmen när inget värde är slut
const TAKT = 1 / NARINGAR.reduce((a, k) => a + DEF[k].vikt * DEF[k].takt, 0);
const lika = (v: number) => Object.fromEntries(NARINGAR.map(k => [k, v])) as Record<Naring, number>;

// mättnaden av näringsvärdena
export const mattnad = (n: Record<Naring, number>) => NARINGAR.reduce((a, k) => a + DEF[k].vikt * n[k], 0);
// p:s näringsvärden. Den som inte har några (en äldre sparning) eller vars mättnad satts direkt (testerna) har alla värden
// lika med mättnaden. naringNu ändrar inget (gränssnittet), naringOf sparar dem i p (simuleringen)
const stammer = (p: Person) => !!p.naring && Math.abs(mattnad(p.naring) - p.hunger) <= 1e-9;
export const naringNu = (p: Person): Readonly<Record<Naring, number>> => stammer(p) ? p.naring! : lika(p.hunger);
export function naringOf(p: Person) {
  if (!stammer(p)) p.naring = lika(p.hunger);
  return p.naring!;
}
// hur mycket värdet k sjunker i timmen för en vuxen (fliken Hälsa visar det)
export const sjunker = (k: Naring, hungerTim: number) => DEF[k].takt * TAKT / hungerTim;
// h timmar av hunger (needsStep i steg.ts; barnen blir hungriga långsammare): varje värde sjunker i sin takt
export function naringSjunker(p: Person, h: number, hungerTim: number) {
  const n = naringOf(p);
  for (const k of NARINGAR) n[k] = clamp(n[k] - h * sjunker(k, hungerTim), 0, 1);
  p.hunger = mattnad(n);
}
// vad en hel portion av maten k fyller i varje värde, skalat så att den höjer mättnaden med 1 (eat i behov.ts gör det till 0,55)
const innehall = new Map<string, Record<Naring, number>>();
export function naringI(k: string) {
  let r = innehall.get(k);
  if (!r) {
    const ra = { ...lika(0), ...SAKER[k]?.naring ?? lika(1) }, sum = mattnad(ra);
    r = lika(0); for (const x of NARINGAR) r[x] = sum > 0 ? ra[x] / sum : 1;
    innehall.set(k, r);
  }
  return r;
}
// p äter: f = hur mycket maten skulle höja en mättnad där inget är fyllt, per slag (det som fyller ett värde över 1 går förlorat)
export function ata(p: Person, per: Record<string, number>) {
  const n = naringOf(p);
  for (const k in per) { const i = naringI(k); for (const x of NARINGAR) n[x] = clamp(n[x] + per[k] * i[x], 0, 1); }
  p.hunger = mattnad(n);
}
