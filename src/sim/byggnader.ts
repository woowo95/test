import { living, log } from './folk';
import { Hus, gridOf, housesOf } from './byggnad';
import { changed, storeFull, zonesOf } from './lager';
import { Person, State } from './typer';

// ---------- byggnaderna: vad ett hus är till för ----------
// Varje sorts byggnad är en rad i registret BYGGNADER (sedan steg 1.6.1): vilket behov den fyller, hur viktigt behovet är
// och vem som äger den. Planeringen (planBuild i bygg.ts) frågar varje rad hur akut dess behov är just nu och bygger för
// det mest akuta: faror (kyla) före bekvämlighet, sedan efter vikten. Ett hus har en funktion (`fn`, en rad här); hus från
// äldre sparfiler är sovsalar. Väggarna, golven och arbetet med dem är desamma för alla (bygg.ts, byggnad.ts).
// En ny sorts byggnad blir en rad.
// v = hur akut (0 = behövs inte, 1 = mycket), plats = rutor under tak som behövs, slag = vad ett förrådshus ska rymma
export interface Akut { v: number; plats: number; slag?: 'mat' | 'material' }
export interface Byggnad {
  namn: string; ikon: string;
  behov: string; // vilket behov den fyller (förklaringen i gränssnittet)
  fara: boolean; // behovet är en fara (kylan): går före all bekvämlighet
  vikt: number; // hur viktigt behovet är bland dem som är lika farliga
  agare: 'byn' | 'familj';
  sover?: boolean; // man sover här
  lager?: boolean; // golvet är en lagerplats under tak: det som ligger där ruttnar och slits mindre (INDOOR_WEAR i lager.ts)
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
  forrad: {
    namn: 'Förrådshus', ikon: '📦', behov: 'Maten ruttnar eller förrådet är fullt: under tak ruttnar och slits det mindre', fara: false, vikt: 2, agare: 'byn', lager: true,
    // ett för maten när den ruttnar, ett för materialet när förrådet är fullt
    akut: s => {
      const har = (slag: string) => housesOf(s).some(h => h.fn === 'forrad' && (h.slag ?? 'mat') === slag), rot = s.ruttet ?? 0;
      if (rot >= RUTT_MIN && !har('mat')) return { v: Math.min(1, rot / (4 * RUTT_MIN)), plats: 6, slag: 'mat' };
      if (storeFull(s) && !har('material')) return { v: 0.5, plats: 6, slag: 'material' };
      return { v: 0, plats: 0 };
    },
    namnFor: (_s, _w, _h, same) => same ? `Förrådshus ${same + 1}` : 'Förrådshuset',
  },
} satisfies Record<string, Byggnad>;
const RUTT_MIN = 10; // så mycket mat som ruttnat bort på sistone innan byn bygger ett förrådshus
const RUTT_GLOM = 0.97; // så mycket av det som ruttnat som byn minns efter en timme (hälften efter ett dygn)
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

// ---------- varje timme ----------
export function stepByggnader(s: State) {
  if (s.ruttet) s.ruttet = s.ruttet * RUTT_GLOM < 0.01 ? undefined : s.ruttet * RUTT_GLOM;
}

// ---------- ett hus blir färdigt ----------
// ett förrådshus: golvet blir en lagerplats under tak, viktigast av alla, så att det som ligger ute bärs in dit
export function husKlar(s: State, h: Hus) {
  if (!fnOf(h).lager || zonesOf(s).some(z => z.hus === h.id)) return;
  zonesOf(s).push({ x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, namn: h.namn, slag: h.slag, prio: 3, hus: h.id });
  changed(s);
  log(s, `${h.namn} är färdigt. Där ruttnar och slits ${h.slag === 'material' ? 'materialet' : 'maten'} mindre.`, 'world');
}
