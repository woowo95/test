import { alive, byId, count, isParent, living, log } from './folk';
import { Hus, MATERIAL, Rum, bitsOf, gridOf, housesOf, touch } from './byggnad';
import { changed, ownedAll, put, storeFull, zonesOf } from './lager';
import { kronika } from './historik';
import { DAY } from './typer';
import { tingOf } from './agande';
import { ARBETE, grundvarde, tingVarde, varuVarde } from './varde';
import { Person, State } from './typer';

// ---------- byggnaderna: vad ett hus är till för ----------
// Varje sorts byggnad är en rad i registret BYGGNADER (sedan steg 1.6.1): vilket behov den fyller, hur viktigt behovet är
// och vem som äger den. Planeringen (planBuild i bygg.ts) frågar varje rad hur akut dess behov är just nu och bygger för
// det mest akuta: faror (kyla) före bekvämlighet, sedan efter vikten. Ett hus har en funktion (`fn`, en rad här); hus från
// äldre sparfiler är sovsalar. Väggarna, golven och arbetet med dem är desamma för alla (bygg.ts, byggnad.ts).
// En ny sorts byggnad blir en rad.
// v = hur akut (0 = behövs inte, 1 = mycket), plats = rutor under tak som behövs, slag = vad ett förrådshus ska rymma,
// ag = vem som ska äga huset (ett familjehus)
interface Akut { v: number; plats: number; slag?: 'mat' | 'material'; ag?: number }
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
  samling: {
    namn: 'Samlingshus', ikon: '🪑', behov: 'En plats att umgås under tak när det är kallt', fara: false, vikt: 1, agare: 'byn',
    // byggs inte nytt: en sovsal som ingen sover i blir ett samlingshus (steg 1.6.4). När det är kallt samtalar och
    // berättar man där i stället för vid elden, om det är varmare där (val.ts)
    namnFor: (_s, _w, _h, same) => same ? `Samlingshus ${same + 1}` : 'Samlingshuset',
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
const barnTill = (q: Person, o?: Person) => !!o && isParent(o, q);
export function familjOf(s: State, ag?: number): Person[] {
  const o = byId(s, ag);
  if (!o || !alive(o)) return [];
  const pa = byId(s, o.partner), partner = pa && alive(pa) ? pa : undefined;
  return living(s).filter(q => q === o || q === partner || ((barnTill(q, o) || barnTill(q, partner)) && !q.partner));
}
export const husNamn = (namn: string) => /[sxz]$/i.test(namn) ? `${namn} hus` : `${namn}s hus`;
// vad familjen äger, i grundvärde: det i förrådet och redskapen
function formogenhet(s: State, folk: Person[]) {
  const ids = new Set(folk.map(q => q.id));
  let v = 0;
  for (const q of folk) v = varuVarde(ownedAll(s, q.id), v);
  for (const t of tingOf(s)) if (ids.has(t.agare)) v += tingVarde(t);
  return v;
}
// vad ett hus med plats för n kostar: timret och trägolvet och arbetet med dem
function husKostnad(n: number) {
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
  // de äldsta husen fylls först, så att det är ett nytt hus som står tomt när det blir för många sovplatser
  const ordning = (r: Rum) => { const i = hs.findIndex(h => h.id === r.hus); return i < 0 ? hs.length : i; };
  for (const r of [...gridOf(s).rooms].sort((a, c) => ordning(a) - ordning(c))) {
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
  funktionsbyte(s);
}

// ---------- funktionen följer behovet (steg 1.6.4) ----------
// En sovsal som ingen har sovit i på ett dygn (ett år i spelet) får en ny funktion: ett förrådshus om byn behöver ett,
// annars ett samlingshus om byn inte har något, och annars rivs den och hälften av timret kommer tillbaka till byn.
// Saknas sovplatser blir ett samlingshus en sovsal igen, före ett nytt hus. Ett familjehus som ingen äger blir en sovsal.
const TOM_TID = DAY;
const RIV_TILLBAKA = 0.5; // så mycket av materialet som kommer tillbaka när ett hus rivs
// ett nytt namn efter funktionen
function nyttNamn(s: State, h: Hus, fn: Fn, a: Akut) {
  const r: Byggnad = BYGGNADER[fn], w = h.w - 2, hh = h.h - 2, big = w * hh >= 8, hs = housesOf(s).filter(q => q !== h);
  const same = fn === 'sovsal' ? hs.filter(q => q.namn.startsWith(big ? 'Långhus' : 'Hydda')).length : hs.filter(q => (q.fn ?? 'sovsal') === fn).length;
  return r.namnFor ? r.namnFor(s, w, hh, same, a) : r.namn;
}
function bytFn(s: State, h: Hus, fn: Fn, slag?: 'mat' | 'material') {
  const fore = h.namn;
  if (fnOf(h).lager && !(BYGGNADER[fn] as Byggnad).lager) { s.lagren = zonesOf(s).filter(z => z.hus !== h.id); changed(s); }
  h.fn = fn; h.slag = slag; h.tom = undefined;
  h.namn = nyttNamn(s, h, fn, { v: 0, plats: 0, slag, ag: h.ag });
  touch(s); count(s, 'bytt_' + fn);
  log(s, `${fore} blir ${h.namn.toLowerCase()}.`, 'world'); kronika(s, `${fore} blev ${h.namn.toLowerCase()}.`);
  husKlar(s, h);
}
function riv(s: State, h: Hus) {
  const ved = bitsOf(s).filter(b => b.hus === h.id).reduce((a, b) => a + (MATERIAL[b.m].item === 'ved' ? b.mat : 0), 0) * RIV_TILLBAKA;
  s.byggen = bitsOf(s).filter(b => b.hus !== h.id); s.hus = housesOf(s).filter(q => q !== h);
  if (ved > 1e-9) put(s, 'ved', ved);
  touch(s); changed(s); count(s, 'rivet');
  log(s, `${h.namn} behövdes inte längre och revs. ${Math.round(ved)} trä kom tillbaka till byn.`, 'world'); kronika(s, `${h.namn} revs.`);
}
function funktionsbyte(s: State) {
  const hs = housesOf(s), arbete = new Set(living(s).filter(p => p.task?.act === 'bygga').map(p => bitsOf(s).find(b => b.id === p.task!.ref)?.hus));
  const fri = (h: Hus) => !!h.klar && !arbete.has(h.id);
  for (const h of hs) if (h.fn === 'familjehus' && h.ag === undefined && fri(h)) bytFn(s, h, 'sovsal');
  // saknas sovplatser blir ett samlingshus en sovsal igen
  if (homeless(s) > 0) { const h = hs.find(q => q.fn === 'samling' && fri(q)); if (h) bytFn(s, h, 'sovsal'); }
  // sovsalar som ingen sover i
  const b = boende(s), anvand = new Set(b.gemensamt.slice(0, b.ovriga.length));
  for (const h of [...hs]) {
    if ((h.fn ?? 'sovsal') !== 'sovsal' || h.ag !== undefined || !fri(h)) continue;
    const tiles = gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles);
    if (!tiles.length || tiles.some(i => anvand.has(i))) { h.tom = undefined; continue; }
    h.tom ??= s.now;
    if (s.now - h.tom < TOM_TID) continue;
    const f = BYGGNADER.forrad.akut(s);
    if (f.v > 1e-9) bytFn(s, h, 'forrad', f.slag);
    else if (!hs.some(q => q.fn === 'samling')) bytFn(s, h, 'samling');
    else riv(s, h);
    return; // ett hus i taget
  }
}
// samlingshusets rum, där man umgås när det är kallt (val.ts)
export const samlingRum = (s: State): Rum | undefined => {
  const ids = new Set(housesOf(s).filter(h => h.fn === 'samling' && h.klar).map(h => h.id));
  return ids.size ? gridOf(s).rooms.find(r => r.hus !== undefined && ids.has(r.hus) && r.tiles.length) : undefined;
};

// ---------- ett hus blir färdigt ----------
// ett förrådshus: golvet blir en lagerplats under tak, viktigast av alla, så att det som ligger ute bärs in dit
export function husKlar(s: State, h: Hus) {
  if (!fnOf(h).lager || zonesOf(s).some(z => z.hus === h.id)) return;
  zonesOf(s).push({ x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, namn: h.namn, slag: h.slag, prio: 3, hus: h.id });
  changed(s);
  log(s, `${h.namn} är färdigt. Där ruttnar och slits ${h.slag === 'material' ? 'materialet' : 'maten'} mindre.`, 'world');
}
