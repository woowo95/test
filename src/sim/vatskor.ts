// Vätskor och behållare (steg 9.4.14, Arbetsstationer och möbler: Vätskor och behållare). En vätska finns bara i en behållare:
// vattensäcken, lerkrukorna och näveraskan är ting med ett innehåll (t.inne: vilken vätska och hur mycket, i hela delar). Vätskorna
// är rader i registret VATSKOR med färgen i paletten och de behållare den passar i. Salvan och benlimmet är inga vätskor men är
// kladdiga och förvaras på samma sätt. Ett recept som ger något av dem behöver en ledig behållare som passar (tillverka.ts), och
// när det används blir den tomma behållaren kvar där den stod. Bilden: behållaren med en yta i vätskans färg (ui/foremal.ts)
import { tingOf, Ting } from './agande';
import { krukaAv } from './kruka';
import { State } from './typer';

export interface VatskaDef { namn: string; farg: number; i: string[] }
export const VATSKOR = {
  vatten: { namn: 'Vatten', farg: 0x3b6ea5, i: ['vattensack', 'lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] },
  tjara: { namn: 'Tjära', farg: 0x24201d, i: ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] },
  salva: { namn: 'Salva', farg: 0x647025, i: ['naverask', 'lerkruka_liten'] },
  benlim: { namn: 'Benlim', farg: 0xbdb39b, i: ['naverask', 'lerkruka_liten'] },
} satisfies Record<string, VatskaDef>;
export type VatskaId = keyof typeof VATSKOR;
export const ar_vatska = (k: string): k is VatskaId => k in VATSKOR;
// så mycket en behållare rymmer: krukans storlek (KRUKOR), annars en del (säcken och asken)
export const karRymmer = (t: Ting) => krukaAv(t.k)?.rymmer ?? 1;
const behallare = (t: Ting) => t.k === 'vattensack' || t.k === 'naverask' || !!krukaAv(t.k);
// en ledig behållare som passar vätskan v: tom, färdig (inte en kruka som torkar) och inte i någons hand
export const ledigFor = (s: State, v: VatskaId) => tingOf(s).filter(t => behallare(t) && !t.inne && t.ler === undefined && t.hos === undefined && t.lass === undefined && t.bar === undefined && (VATSKOR[v].i as string[]).includes(t.k)).sort((a, b) => karRymmer(a) - karRymmer(b) || a.id - b.id)[0];
// hur mycket av vätskan byn har, i alla behållare
export const vatskaAv = (s: State, v: VatskaId) => tingOf(s).reduce((n, t) => n + (t.inne?.v === v ? t.inne.n : 0), 0);
// den första behållaren med vätskan v
export const medVatska = (s: State, v: VatskaId) => tingOf(s).find(t => t.inne?.v === v && t.inne.n > 0);
// n av vätskan v hälls i en ledig behållare (fylls till det den rymmer). Ger behållaren, eller undefined om ingen fanns
export function fyllVatska(s: State, v: VatskaId, n: number, t = ledigFor(s, v)) {
  if (!t || n <= 0) return undefined;
  t.inne = { v, n: Math.min(karRymmer(t), n) };
  return t;
}
// n av vätskan v tas ur behållarna; en tömd behållare blir kvar där den stod. Ger hur mycket som togs
export function taVatska(s: State, v: VatskaId, n: number) {
  let kvar = n;
  for (const t of tingOf(s)) {
    if (kvar <= 0) break;
    if (t.inne?.v !== v) continue;
    const d = Math.min(kvar, t.inne.n);
    t.inne.n -= d; kvar -= d;
    if (t.inne.n <= 0) t.inne = undefined;
  }
  return n - kvar;
}
