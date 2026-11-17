// ---------- raden i tal (steg 11.2.9, Flera samhällen: Raden i tal) ----------
// En by i världen är en rad med hela tal. Registret RADTAL säger hur varje tal läses ur en by som går i simuleringen: folket
// (byborna, också de som är borta), maten i portioner (en vuxens måltid är en portion), rikedomen (samma mått som byns rikedom),
// silvret i förrådet och styrkan (de vuxna i byn som kan slåss, samma som försvaret räknar). Huvudbyn har därför också en rad, som skrivs
// en gång i timmen ur byn (en rad i TAKTER), och en väckt by skrivs senare tillbaka på samma sätt. Att läsa raden ändrar inget i
// byn och drar inget ur dess slump.
import { alive, living } from './folk';
import { amountOf, foodOf } from './lager';
import { vuxenKan } from './rovare';
import { State } from './typer';
import { rikedom } from './varde';

export interface RadtalDef { namn: string; las: (s: State) => number }
export const RADTAL = {
  folk: { namn: 'Folk', las: s => s.people.filter(alive).length },
  mat: { namn: 'Mat (portioner)', las: s => Math.floor(foodOf(s)) },
  rikedom: { namn: 'Rikedom', las: s => Math.round(rikedom(s)) },
  silver: { namn: 'Silver', las: s => Math.floor(amountOf(s, 'silver')) },
  styrka: { namn: 'Styrka', las: s => living(s).filter(p => vuxenKan(s, p)).length },
} as const satisfies Record<string, RadtalDef>;
export type RadtalId = keyof typeof RADTAL;
export const RADTAL_IDS = Object.keys(RADTAL) as RadtalId[];

// en by som en rad i världen; sort och de fasta fälten kommer i steg 11.2.11
export interface VarldRad { nr: number; t: number; tal: Record<RadtalId, number> }

// talen läses ur en by som går i simuleringen
export function lasRad(s: State): Record<RadtalId, number> {
  const tal = {} as Record<RadtalId, number>;
  for (const k of RADTAL_IDS) tal[k] = RADTAL[k].las(s);
  return tal;
}
// huvudbyns rad i världen (den första gången får den ett nummer)
export function huvudRad(s: State): VarldRad | undefined {
  const vl = s.varld;
  if (!vl) return undefined;
  vl.rader ??= [];
  let r = vl.rader.find(x => x.nr === vl.huvud);
  if (!r) { r = { nr: vl.huvud = (vl.nastaRad ?? 0) + 1, t: s.now, tal: lasRad(s) }; vl.nastaRad = r.nr; vl.rader.push(r); }
  return r;
}
// en gång i timmen (TAKTER): huvudbyns rad skrivs ur byn
export function skrivHuvudRad(s: State) {
  const r = huvudRad(s);
  if (r) { r.t = s.now; r.tal = lasRad(s); }
}
