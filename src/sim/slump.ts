import { Person, State } from './typer';

// ---------- slump ----------
// Slumpen kommer i egna följder: en per system, och för det en person gör en egen följd per person och system. Då
// ändrar en ändring i ett system (ett slumptal mer eller mindre) inte slumpen i allt annat, och testerna visar verkliga
// effekter i stället för brus. Varje följd börjar ur byns frö och följdens namn, och var den är sparas i byn
// (s.rngs) eller hos personen (p.rngs).
// Det levande läget och snabbläget räknar likadant (steg.ts), så ingen följd hör till bara det ena. Det som bara syns
// i bilden (hur man rör sig på platsen) tar sin slump i gränssnittet och rör aldrig byns följder.
export const STROMMAR = {
  strid: 'fröet till en strid (striden har sedan sin egen följd)',
  val: 'vad man väljer att göra och var',
  arbete: 'vad arbetet ger: fynd, fångst, fiske, svamp, rep',
  halsa: 'sjukdom, olyckor, död, graviditet och förlossning',
  folk: 'nya människor: kön, namn, anlag, färdigheter',
  anlag: 'anlagen som kom senare (smidighet och aggression, steg 3.7.6), så att följden folk blev som förut',
  flytt: 'in- och utflyttning',
  samtal: 'samtal och relationer',
  minne: 'lärdomar: vad man ser, berättar och överdriver',
  kunskap: 'tekniker som lärs ut',
  dela: 'gåvor, byten och mat ur andras förråd',
  eld: 'eld, tändning och kol',
  kvalitet: 'hur bra det blir som någon gör',
  uppvaxt: 'vad som fastnar hos ett barn och vad det gör (steg 3.1.2)',
  humor: 'utbrotten: när, hur allvarliga och mot vem (steg 3.2.2)',
  rykte: 'rykten: vad som berättas, överdrifter, skitsnack och smak (steg 3.3)',
} as const;
export type Strom = keyof typeof STROMMAR;

// följdens första värde: byns frö blandat med följdens namn och personens id
function fro(seed: number, k: string, id: number) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(id + 1, 0xc2b2ae35);
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 0x01000193);
  return h ^ (h >>> 16);
}
export function rnd(s: State, k: Strom, p?: Person): number {
  const r = p ? (p.rngs ??= {}) : (s.rngs ??= {});
  let t = (r[k] = ((r[k] ?? fro(s.seed, k, p ? p.id : -1)) + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const clampI = (v: number, n: number) => clamp(Math.floor(v), 0, n - 1); // rutan (0 till n - 1) som punkten v ligger i, närmaste ruta utanför kartan
export function gauss(s: State, k: Strom, p?: Person) { return (rnd(s, k, p) + rnd(s, k, p) + rnd(s, k, p) - 1.5) / 1.5; }
export function pick<X>(s: State, arr: X[], k: Strom, p?: Person): X { return arr[Math.floor(rnd(s, k, p) * arr.length)]; }
// slumpar ett av de n första i arr, som ska vara sorterad med det bästa först (en dragning, också när listan är tom)
export function pickNarmaste<X>(s: State, arr: X[], n: number, k: Strom, p?: Person): X { return arr[Math.floor(rnd(s, k, p) * Math.min(n, arr.length))]; }
// slumpar ett av items med chans efter vikterna (en dragning). Ger avrundningen något över efter sista elementet tas det
// första, eller det sista med sista = true
export function pickViktat<X>(s: State, items: X[], vikter: number[], k: Strom, p?: Person, sista = false): X {
  let tot = 0;
  for (const v of vikter) tot += v;
  let x = rnd(s, k, p) * tot;
  for (let i = 0; i < items.length; i++) { x -= vikter[i]; if (x <= 0) return items[i]; }
  return items[sista ? items.length - 1 : 0];
}
export function chance(s: State, ratePerSec: number, dtSec: number, k: Strom, p?: Person) { return rnd(s, k, p) < 1 - Math.exp(-ratePerSec * dtSec); }
