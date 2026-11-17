// ---------- raden i tal (steg 11.2.9, Flera samhällen: Raden i tal) ----------
// En by i världen är en rad med hela tal. Registret RADTAL säger hur varje tal läses ur en by som går i simuleringen: folket
// (byborna, också de som är borta), maten i portioner (en vuxens måltid är en portion), rikedomen (samma mått som byns rikedom),
// silvret i förrådet och styrkan (de vuxna i byn som kan slåss, samma som försvaret räknar). Huvudbyn har därför också en rad, som skrivs
// en gång i timmen ur byn (en rad i TAKTER), och en väckt by skrivs senare tillbaka på samma sätt. Att läsa raden ändrar inget i
// byn och drar inget ur dess slump.
import { alive, living } from './folk';
import { bynsNamn } from './bynamn';
import { LandmarkId } from './landmarken';
import { skalaV, troNamn, troOf } from './religion';
import { ledareOf } from './styre';
import { knows, TEKNIK } from './teknik';
import { amountOf, foodOf } from './lager';
import { vuxenKan } from './rovare';
import { Person, State } from './typer';
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

// ---------- bysorterna (steg 11.2.11) ----------
// Vad som gäller en sort av rad: om folket föder barn, om det skaffar egen mat, om det finns en ledare, om den hör till en
// moderby och vad som gör slut på den (folket, tiden, moderbyn eller resursen); plats = sortens rad i LANDMARKEN
export interface BysortDef { namn: string; plats: LandmarkId; folk: boolean; barn: boolean; egenMat: boolean; ledare: boolean; moder: boolean; slut?: 'folk' | 'tid' | 'moder' }
export const BYSORTER = {
  by: { namn: 'By', plats: 'by', folk: true, barn: true, egenMat: true, ledare: true, moder: false },
  rovarlager: { namn: 'Rövarläger', plats: 'rovarlager', folk: true, barn: false, egenMat: false, ledare: true, moder: false, slut: 'folk' }, // lever på byte och löses upp när folket är slut
  handelslager: { namn: 'Handelsläger', plats: 'handelslager', folk: true, barn: false, egenMat: false, ledare: false, moder: false, slut: 'tid' }, // bryts upp vid sin tid
  utpost: { namn: 'Utpost', plats: 'utpost', folk: true, barn: false, egenMat: true, ledare: false, moder: true, slut: 'moder' }, // finns så länge resursen och moderbyn finns
  ruin: { namn: 'Ruin', plats: 'ruin', folk: false, barn: false, egenMat: false, ledare: false, moder: false }, // inget folk, men kan ha saker kvar
} as const satisfies Record<string, BysortDef>;
export type BysortId = keyof typeof BYSORTER;
export const BYSORT_IDS = Object.keys(BYSORTER) as BysortId[];

// en fast person i liten form: namn, kön, född och roll (ledaren, en handlare eller någon huvudbyn träffat); id när personen
// finns i en by som går i simuleringen. Resten byggs ur raden när personen behövs (fas 11.3)
export interface FastPerson { namn: string; kon: 'm' | 'k'; fodd: number; roll: 'ledare' | 'handlare' | 'mott'; id?: number }
// tron i raden: namnet, andelen troende i procent och läggningen från fridsam (0) till krigisk (100)
export interface RadTro { namn: string; andel: number; krig: number }

// en by som en rad i världen: de fasta fälten (nummer, sort, namn, plats, när den grundades, raden den kom ur och den den
// lyder under), talen, teknikerna, tron, ledaren och de fasta personerna
export interface VarldRad {
  nr: number; sort: BysortId; namn: string; x?: number; y?: number; grundad: number; fran?: number; lyder?: number;
  t: number; tal: Record<RadtalId, number>; tek: string[]; tro?: RadTro; ledare?: number; fasta: FastPerson[];
  syn?: import('./klaner').Klan; // huvudbyns förbindelse med byn: hållningen, de namngivna personerna och priserna (steg 11.2.15, grannbyar.ts)
}
const fast = (p: Person, roll: FastPerson['roll']): FastPerson => ({ namn: p.name, kon: p.sex, fodd: p.born, roll, id: p.id });
// tron flest bybor har
function radTro(s: State): RadTro | undefined {
  const folk = s.people.filter(alive), n = new Map<number, number>();
  for (const p of folk) if (p.tro !== undefined) n.set(p.tro, (n.get(p.tro) ?? 0) + 1);
  let bast: number | undefined, m = 0;
  for (const [id, k] of n) if (k > m || (k === m && id < bast!)) { bast = id; m = k; }
  const tr = troOf(s, bast);
  return tr ? { namn: troNamn(tr), andel: Math.round(100 * m / Math.max(1, folk.length)), krig: Math.round(skalaV(tr, 'krig') ?? 50) } : undefined;
}
// de fasta fälten och listorna ur en by som går i simuleringen (sorten och raden den kom ur ändras inte)
function lasFasta(s: State, r: VarldRad) {
  const folk = s.people.filter(alive), led = ledareOf(s);
  r.namn = bynsNamn(s);
  r.tek = TEKNIK.filter(t => folk.some(p => knows(p, t.id))).map(t => t.id);
  const tro = radTro(s);
  if (tro) r.tro = tro; else delete r.tro;
  r.fasta = led ? [fast(led, 'ledare')] : [];
  if (led) r.ledare = 0; else delete r.ledare; // ledaren är den fasta personen på den platsen
}

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
  if (!r) {
    r = { nr: vl.huvud = (vl.nastaRad ?? 0) + 1, sort: 'by', namn: '', grundad: s.founded, t: s.now, tal: lasRad(s), tek: [], fasta: [] };
    lasFasta(s, r);
    vl.nastaRad = r.nr; vl.rader.push(r);
  }
  return r;
}
// en gång i timmen (TAKTER): huvudbyns rad skrivs ur byn, talen och de fasta fälten
export function skrivHuvudRad(s: State) {
  const r = huvudRad(s);
  if (!r) return;
  r.t = s.now; r.tal = lasRad(s); lasFasta(s, r);
  const p = s.varld!.platser?.find(q => q.by === r.nr);
  if (p) p.namn = r.namn; // huvudbyns plats heter som byn
}
