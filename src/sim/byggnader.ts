import { living } from './folk';
import { Hus, gridOf, housesOf } from './byggnad';
import { Person, State } from './typer';

// ---------- byggnaderna: vad ett hus är till för ----------
// Varje sorts byggnad är en rad i registret BYGGNADER (sedan steg 1.6.1): vilket behov den fyller, hur viktigt behovet är
// och vem som äger den. Planeringen (planBuild i bygg.ts) frågar varje rad hur akut dess behov är just nu och bygger för
// det mest akuta: faror (kyla) före bekvämlighet, sedan efter vikten. Ett hus har en funktion (`fn`, en rad här); hus från
// äldre sparfiler är sovsalar. Väggarna, golven och arbetet med dem är desamma för alla (bygg.ts, byggnad.ts).
// En ny sorts byggnad blir en rad.
export interface Akut { v: number; plats: number } // v = hur akut (0 = behövs inte, 1 = mycket), plats = rutor under tak som behövs
export interface Byggnad {
  namn: string; ikon: string;
  behov: string; // vilket behov den fyller (förklaringen i gränssnittet)
  fara: boolean; // behovet är en fara (kylan): går före all bekvämlighet
  vikt: number; // hur viktigt behovet är bland dem som är lika farliga
  agare: 'byn' | 'familj';
  sover?: boolean; // man sover här
  akut?: (s: State) => Akut; // saknas: byn planerar inga nya hus för det
  namnFor?: (s: State, w: number, h: number, same: number) => string; // det nya husets namn
}
export const BYGGNADER = {
  sovsal: {
    namn: 'Sovsal', ikon: '🛏️', behov: 'Sovplatser under tak åt alla, mot kylan', fara: true, vikt: 3, agare: 'byn', sover: true,
    // så många som saknar en sovplats, och lite till för barn som kommer
    akut: s => { const n = living(s).length, u = homeless(s); return { v: n ? u / n : 0, plats: u + 2 }; },
    namnFor: (_s, w, h, same) => { const big = w * h >= 8; return same ? `${big ? 'Långhus' : 'Hydda'} ${same + 1}` : big ? 'Långhuset' : 'Hyddan'; },
  },
} satisfies Record<string, Byggnad>;
export type Fn = keyof typeof BYGGNADER;
export const FN = Object.keys(BYGGNADER) as Fn[];
export const fnOf = (h: Hus): Byggnad => BYGGNADER[(h.fn ?? 'sovsal') as Fn] ?? BYGGNADER.sovsal;

// det mest akuta behovet just nu: faror först, sedan vikten gånger hur akut det är
export function mostUrgent(s: State) {
  let best: { fn: Fn; a: Akut } | undefined, bs = 0;
  for (const fn of FN) {
    const r: Byggnad = BYGGNADER[fn];
    if (!r.akut) continue;
    const a = r.akut(s);
    if (a.v <= 1e-9) continue;
    const sc = (r.fara ? 100 : 0) + r.vikt * a.v;
    if (sc > bs) { bs = sc; best = { fn, a }; }
  }
  return best;
}

// ---------- var man sover ----------
// sovplatserna i hus där man sover: en per golvruta under tak
export const sleepBeds = (s: State) => gridOf(s).rooms.filter(r => !housesOf(s).find(h => h.id === r.hus) || fnOf(housesOf(s).find(h => h.id === r.hus)!).sover).flatMap(r => r.tiles);
// så många som saknar en egen sovplats under tak
export const homeless = (s: State) => Math.max(0, living(s).length - sleepBeds(s).length);
// var p sover: en egen ruta under tak om det finns, annars ingenstans. Finns färre platser än folk delar man
export function bedTile(s: State, p: Person) {
  const b = sleepBeds(s);
  if (!b.length) return undefined;
  const ppl = living(s).sort((a, c) => a.id - c.id);
  return b[Math.max(0, ppl.indexOf(p)) % b.length];
}
