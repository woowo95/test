import { Person, State } from './typer';

// ---------- slump ----------
// Slumpen kommer i egna följder: en per system, och för det en person gör en egen följd per person och system. Då
// ändrar en ändring i ett system (ett slumptal mer eller mindre) inte slumpen i allt annat, och testerna visar verkliga
// effekter i stället för brus. Varje följd börjar ur byns frö och följdens namn, och var den är sparas i byn
// (s.rngs) eller hos personen (p.rngs).
// 'levande' är det som bara finns i det levande läget (hur man går och rör sig på platsen). Snabbläget drar aldrig ur
// den, så att de andra följderna drar samma tal i båda lägena.
export const STROMMAR = {
  val: 'vad man väljer att göra och var',
  arbete: 'vad arbetet ger: fynd, fångst, fiske, svamp, rep',
  halsa: 'sjukdom, olyckor, död, graviditet och förlossning',
  folk: 'nya människor: kön, namn, anlag, färdigheter',
  flytt: 'in- och utflyttning',
  samtal: 'samtal och relationer',
  minne: 'lärdomar: vad man ser, berättar och överdriver',
  kunskap: 'tekniker som lärs ut',
  dela: 'gåvor, byten och mat ur andras förråd',
  eld: 'eld, tändning och kol',
  levande: 'det som bara finns i det levande läget och inte i snabbläget',
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
export function gauss(s: State, k: Strom, p?: Person) { return (rnd(s, k, p) + rnd(s, k, p) + rnd(s, k, p) - 1.5) / 1.5; }
export function pick<X>(s: State, arr: X[], k: Strom, p?: Person): X { return arr[Math.floor(rnd(s, k, p) * arr.length)]; }
export function chance(s: State, ratePerSec: number, dtSec: number, k: Strom, p?: Person) { return rnd(s, k, p) < 1 - Math.exp(-ratePerSec * dtSec); }
