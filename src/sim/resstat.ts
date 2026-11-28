// ---------- resorna i tal (steg 15.1.84, Flera samhällen: Vägens händelser i tal) ----------
// Varje resa räknas i världens statistik (s.stat) när det händer, så att npm run resor kan följa alla resor i några världar:
// huvudbyns sällskap per skäl (RESMAL) och världens byars färder per sort (handel, gåva, besked, anfall, uppdrag, handlare och
// flytten). Nycklarna är "resor <sort> <tal>": antal resor, dygnen på vägen, händelserna (och "h <id>" per rad i VAGHANDELSER),
// maten kvar vid hemkomsten, timmarna utan mat och utan vatten, de som skadades och de som dog. Spelet ändras inte: talen läses
// bara av mätverktyget.
import { count } from './folk';
import type { Person, State } from './typer';

export const resNyckel = (sort: string, k: string) => `resor ${sort} ${k}`;
export const resStat = (s: State, sort: string, k: string, n = 1) => { if (n) count(s, resNyckel(sort, k), n); };
// det sällskapet samlar på vägen till hemkomsten: när det gav sig av, timmarna utan mat och vatten och de som skadats
export interface ResMatt { ut: number; utanMat: number; utanVatten: number; skadade: number[] }
interface MedMatt { matt?: ResMatt; skal: string }
const mattOf = (sl: MedMatt, t: number) => sl.matt ??= { ut: t, utanMat: 0, utanVatten: 0, skadade: [] };
export const resUt = (sl: MedMatt, t: number) => { sl.matt = { ut: t, utanMat: 0, utanVatten: 0, skadade: [] }; };
// en händelse i VAGHANDELSER hände
export const resHandelse = (s: State, sl: MedMatt, id: string) => { resStat(s, sl.skal, 'händelser'); resStat(s, sl.skal, `h ${id}`); };
// en bit av vägen (tim timmar) med mättnaden och vätskan
export function resBehov(sl: MedMatt, t: number, tim: number, matt: number, vatska: number) {
  const m = mattOf(sl, t);
  if (matt <= 0) m.utanMat += tim;
  if (vatska <= 0) m.utanVatten += tim;
}
export const resSkadad = (sl: MedMatt, p: Person, t: number) => { const m = mattOf(sl, t); if (!m.skadade.includes(p.id)) m.skadade.push(p.id); };
export const resDod = (s: State, sl: MedMatt, n = 1) => resStat(s, sl.skal, 'döda', n);
// resan är slut (hemma eller försvunnen): antalet, dygnen, maten kvar och timmarna utan mat och vatten
export function resSlut(s: State, sl: MedMatt, t: number, mat: number, forsvunnen = false) {
  const m = mattOf(sl, t);
  resStat(s, sl.skal, 'antal'); resStat(s, sl.skal, 'dygn', (t - m.ut) / 864e5);
  if (forsvunnen) resStat(s, sl.skal, 'försvunna');
  resStat(s, sl.skal, 'mat', mat); resStat(s, sl.skal, 'utan mat', m.utanMat); resStat(s, sl.skal, 'utan vatten', m.utanVatten);
  resStat(s, sl.skal, 'skadade', m.skadade.length);
}
// en färd från en by i världen: sorten och tiden den var ute (dygn)
export function fardSlut(s: State, sort: string, dygn: number) { resStat(s, `by:${sort}`, 'antal'); resStat(s, `by:${sort}`, 'dygn', dygn); }
