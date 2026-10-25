import { alive, byId, living, log } from './folk';
import { Hus, MATERIAL, gridOf, housesOf } from './byggnad';
import { changed, ownedAll, storeFull, zonesOf } from './lager';
import { tingOf } from './agande';
import { ARBETE, grundvarde, tingVarde } from './varde';
import { Person, State } from './typer';

// ---------- byggnaderna: vad ett hus är till för ----------
// Varje sorts byggnad är en rad i registret BYGGNADER (sedan steg 1.6.1): vilket behov den fyller, hur viktigt behovet är
// och vem som äger den. Planeringen (planBuild i bygg.ts) frågar varje rad hur akut dess behov är just nu och bygger för
// det mest akuta: faror (kyla) före bekvämlighet, sedan efter vikten. Ett hus har en funktion (`fn`, en rad här); hus från
// äldre sparfiler är sovsalar. Väggarna, golven och arbetet med dem är desamma för alla (bygg.ts, byggnad.ts).
// En ny sorts byggnad blir en rad.
// v = hur akut (0 = behövs inte, 1 = mycket), plats = rutor under tak som behövs, slag = vad ett förrådshus ska rymma,
// ag = vem som ska äga huset (ett familjehus)
export interface Akut { v: number; plats: number; slag?: 'mat' | 'material'; ag?: number }
export interface Byggnad {
  namn: string; ikon: string;
  behov: string; // vilket behov den fyller (förklaringen i gränssnittet)
  fara: boolean; // behovet är en fara (kylan): går före all bekvämlighet
  vikt: number; // hur viktigt behovet är bland dem som är lika farliga
  agare: 'byn' | 'familj';
  sover?: boolean; // man sover här
  lager?: boolean; // golvet är en lagerplats under tak: det som ligger där ruttnar och slits mindre (INDOOR_WEAR i lager.ts)
  akut?: (s: State) => Akut; // saknas: byn planerar inga nya hus för det
  namnFor?: (s: State, w: number, h: number, same: number, a: Akut) => string; // det nya husets namn
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
  familjehus: {
    namn: 'Familjehus', ikon: '🏠', behov: 'En familj vill bo för sig och har råd att bygga ett eget hus', fara: false, vikt: 1, agare: 'familj', sover: true,
    // en familj (ett par med barn) utan eget hus som äger så mycket att den kan betala huset själv
    akut: s => {
      const f = familjUtanHus(s);
      return f ? { v: 0.5, plats: f.folk.length + 1, ag: f.ag } : { v: 0, plats: 0 };
    },
    namnFor: (s, _w, _h, _same, a) => husNamn(byId(s, a.ag)?.name ?? 'Familjens'),
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

// ---------- familjehus (steg 1.6.3) ----------
// En familj är ägaren, partnern och de barn till dem som inte har egen partner. När ett par med barn inte har något eget
// hus och äger så mycket (förrådet och redskapen, efter värdet) att det räcker till huset, bestämmer familjen sig för att
// bygga ett. Huset ägs av den av dem som planerade det, går i arv som föremål (arv.ts) och blir byns när ingen äger det.
// Materialet tas av familjens eget först, sedan efter behovsstegen (bygg.ts: takeForHouse). Familjen sover där.
const barnTill = (q: Person, o?: Person) => !!o && (q.mother === o.id || q.father === o.id);
export function familjOf(s: State, ag?: number): Person[] {
  const o = byId(s, ag);
  if (!o || !alive(o)) return [];
  const pa = byId(s, o.partner), partner = pa && alive(pa) ? pa : undefined;
  return living(s).filter(q => q === o || q === partner || ((barnTill(q, o) || barnTill(q, partner)) && !q.partner));
}
export const husNamn = (namn: string) => /[sxz]$/i.test(namn) ? `${namn} hus` : `${namn}s hus`;
// vad familjen äger, i grundvärde: det i förrådet och redskapen
export function formogenhet(s: State, folk: Person[]) {
  const ids = new Set(folk.map(q => q.id));
  let v = 0;
  for (const q of folk) { const o = ownedAll(s, q.id); for (const k in o) v += o[k] * grundvarde(k); }
  for (const t of tingOf(s)) if (ids.has(t.agare)) v += tingVarde(t);
  return v;
}
// vad ett hus med plats för n kostar: timret och trägolvet och arbetet med dem
export function husKostnad(n: number) {
  const w = Math.max(2, Math.ceil(Math.sqrt(n))), h = Math.max(2, Math.ceil(n / w)), vagg = 2 * (w + 2) + 2 * h - 1, V = MATERIAL.timmer, G = MATERIAL.tra;
  return vagg * (V.n * grundvarde(V.item!) + V.tim * ARBETE) + w * h * (G.n * grundvarde(G.item!) + G.tim * ARBETE);
}
// den första familjen (ett par med barn) som inte har något eget hus och har råd med ett
function familjUtanHus(s: State) {
  const hs = housesOf(s);
  for (const o of living(s).sort((a, b) => a.id - b.id)) {
    const pa = byId(s, o.partner);
    if (!pa || !alive(pa) || pa.id < o.id) continue; // paret räknas en gång, från den med lägst id
    const folk = familjOf(s, o.id);
    if (folk.length < 3 || hs.some(h => h.ag === o.id || h.ag === pa.id)) continue;
    if (formogenhet(s, folk) >= husKostnad(folk.length + 1)) return { ag: o.id, folk };
  }
  return undefined;
}

// ---------- var man sover ----------
// Den som hör till en familj med ett eget hus sover där; alla andra sover i byns hus där man sover (sovsalarna), en per
// golvruta under tak. Räknas om när husen eller folket ändras (en gång per steg)
interface Boende { key: string; egna: Map<number, { tiles: number[]; folk: Person[] }>; gemensamt: number[]; ovriga: Person[] }
const boenden = new WeakMap<State, Boende>();
function boende(s: State): Boende {
  const ppl = living(s), key = `${s.byggV ?? 0}:${s.now}:${ppl.length}`;
  let b = boenden.get(s);
  if (b && b.key === key) return b;
  const hs = housesOf(s), husOf = (id?: number) => hs.find(h => h.id === id), egna = new Map<number, { tiles: number[]; folk: Person[] }>(), gemensamt: number[] = [];
  const egnaTiles = new Map<number, number[]>();
  for (const r of gridOf(s).rooms) {
    const h = husOf(r.hus);
    if (h && !fnOf(h).sover) continue;
    if (h?.ag !== undefined) egnaTiles.set(h.id, [...(egnaTiles.get(h.id) ?? []), ...r.tiles]);
    else gemensamt.push(...r.tiles);
  }
  for (const h of hs) {
    const tiles = egnaTiles.get(h.id);
    if (!tiles?.length) continue;
    const folk = familjOf(s, h.ag).filter(q => !egna.has(q.id)).sort((a, c) => a.id - c.id);
    for (const q of folk) egna.set(q.id, { tiles, folk });
  }
  const ovriga = ppl.filter(q => !egna.has(q.id)).sort((a, c) => a.id - c.id);
  b = { key, egna, gemensamt, ovriga };
  boenden.set(s, b);
  return b;
}
// sovplatserna p kan sova på: familjens hus, annars byns (utan p: byns)
export const sleepBeds = (s: State, p?: Person) => (p && boende(s).egna.get(p.id)?.tiles) || boende(s).gemensamt;
// så många som saknar en egen sovplats under tak
export const homeless = (s: State) => { const b = boende(s); return Math.max(0, b.ovriga.length - b.gemensamt.length); };
// var p sover: en egen ruta under tak om det finns, annars ingenstans. Finns färre platser än folk delar man
export function bedTile(s: State, p: Person) {
  const b = boende(s), e = b.egna.get(p.id), tiles = e?.tiles ?? b.gemensamt, ppl = e?.folk ?? b.ovriga;
  if (!tiles.length) return undefined;
  return tiles[Math.max(0, ppl.indexOf(p)) % tiles.length];
}

// ---------- varje timme ----------
export function stepByggnader(s: State) {
  if (s.ruttet) s.ruttet = s.ruttet * RUTT_GLOM < 0.01 ? undefined : s.ruttet * RUTT_GLOM;
  // ett hus vars ägare är borta utan arvingar (eller har flyttat) blir byns
  for (const h of housesOf(s)) {
    if (h.ag === undefined) continue;
    const o = byId(s, h.ag);
    if (o && alive(o)) continue;
    h.ag = undefined; log(s, `${h.namn} har ingen ägare längre och blir byns.`, 'world');
  }
}

// ---------- ett hus blir färdigt ----------
// ett förrådshus: golvet blir en lagerplats under tak, viktigast av alla, så att det som ligger ute bärs in dit
export function husKlar(s: State, h: Hus) {
  if (!fnOf(h).lager || zonesOf(s).some(z => z.hus === h.id)) return;
  zonesOf(s).push({ x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, namn: h.namn, slag: h.slag, prio: 3, hus: h.id });
  changed(s);
  log(s, `${h.namn} är färdigt. Där ruttnar och slits ${h.slag === 'material' ? 'materialet' : 'maten'} mindre.`, 'world');
}
