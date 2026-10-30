import { KROPP, alive, byId, count, familjOf, living, log } from './folk';
import { Hus, MATERIAL, Rum, bitById, bitsOf, gridOf, housesOf, husById, shelterOf, touch } from './byggnad';
import { heatAt } from './eld';
import { eldPlats } from './karta';
import { changed, ownedAll, put, storeFull, zonesOf } from './lager';
import { kronika } from './historik';
import { DAY, HOUR, W } from './typer';
import { tingOf } from './agande';
import { ARBETE, grundvarde, tingVarde, varuVarde } from './varde';
import { Person, State } from './typer';
import { balans } from './balans';
import { flodBlot } from './sjo';
import { inneUtanPlats, isKlar, stationDef, stationRum, stationRutor, stationerOf, storlek } from './stationer';

// ---------- balanstal (regel 8) ----------
// Husens storlek, vad de är till för och när de byter funktion eller rivs. Var de står och hur de byggs står i BYGG (bygg.ts)
export const HUS = balans('hus', {
  minSida: 2, // ett hus är minst så här många rutor på varje sida inuti väggarna ...
  maxSida: 4, // ... och högst så här många på den kortare sidan ...
  langSida: 2, // ... med den längre sidan högst så här många gånger den kortare
  langhus: 8, // en sovsal med så här många sovplatser (rutor) eller fler är ett långhus, annars en hydda
  sovExtra: 2, // ett nytt sovhus rymmer så här många fler än de som saknar sovplats (barn som kommer)
  faraBonus: 100, // en fara (kylan) går före all bekvämlighet: så många poäng över vikten gånger hur akut det är
  ruttMin: 10, // så mycket mat som ruttnat bort på sistone innan byn bygger ett förrådshus
  ruttFullt: 4, // behovet av förrådshus är som störst när så här många gånger ruttMin ruttnat
  ruttGlom: 0.97, // så mycket av det som ruttnat som byn minns efter en timme (hälften efter ett dygn)
  ruttGlomMin: 0.01, // mindre än så här glöms helt
  forradPlats: 6, // ett nytt förrådshus rymmer så här många rutor
  forradFullt: 0.5, // hur akut ett fullt förråd är (0 till 1)
  familjAkut: 0.5, // hur akut det är att en familj får eget hus (0 till 1)
  familjMin: 3, // en familj med färre än så här många ger inget familjehus
  familjExtra: 1, // ett familjehus rymmer så här många fler än familjen, och familjen ska ha råd med det
  tomDygn: 1, // en sovsal som ingen sovit i så här länge (dygn, år i spelet) får en ny funktion eller rivs
  tomTim: 4, // ... men behöver byn ett förrådshus blir den det redan efter så här många timmar, före ett nytt hus (steg 2.12.5)
  rivTillbaka: 0.5, // så mycket av materialet kommer tillbaka när ett hus rivs
  varmeMarg: 0.02, // ett samlingshus räknas som varmare än elden även om det är så här mycket kallare ...
  varmeY: 2.9, // ... mätt så här många rutor söder om elden
  verkstadAkut: 0.5, // hur akut det är att få plats inne för en station som inte får plats i något hus (0 till 1, steg 2.2.17) ...
  verkstadExtra: 2, // ... och så här många golvrutor fler än stationen och golvet framför den
});

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
  lager?: boolean; // golvet är en lagerplats under tak: det som ligger där ruttnar och slits mindre (LAGER.inne i lager.ts)
  akut?: (s: State) => Akut; // saknas: byn planerar inga nya hus för det
  namnFor?: (s: State, w: number, h: number, same: number, a: Akut) => string; // det nya husets namn
}
export const BYGGNADER = {
  sovsal: {
    namn: 'Sovsal', ikon: '🛏️', behov: 'Sovplatser under tak åt alla, mot kylan', fara: true, vikt: 3, agare: 'byn', sover: true,
    // så många som saknar en sovplats, och lite till för barn som kommer
    akut: s => { const n = living(s).length, u = homeless(s); return { v: n ? u / n : 0, plats: u + HUS.sovExtra }; },
    namnFor: (_s, w, h, same) => { const big = w * h >= HUS.langhus; return same ? `${big ? 'Långhus' : 'Hydda'} ${same + 1}` : big ? 'Långhuset' : 'Hyddan'; },
  },
  forrad: {
    namn: 'Förrådshus', ikon: '📦', behov: 'Maten ruttnar eller förrådet är fullt: under tak ruttnar och slits det mindre', fara: false, vikt: 2, agare: 'byn', lager: true,
    // ett tomt hus blir förrådshuset (funktionsbyte nedan), så då byggs inget nytt (steg 2.12.5)
    akut: s => tommaSovsalar(s).length ? { v: 0, plats: 0 } : forradBehov(s),
    namnFor: (_s, _w, _h, same) => same ? `Förrådshus ${same + 1}` : 'Förrådshuset',
  },
  familjehus: {
    namn: 'Familjehus', ikon: '🏠', behov: 'En familj vill bo för sig och har råd att bygga ett eget hus', fara: false, vikt: 1, agare: 'familj', sover: true,
    // en familj (ett par med barn) utan eget hus som äger så mycket att den kan betala huset själv
    akut: s => {
      const f = familjUtanHus(s);
      return f ? { v: HUS.familjAkut, plats: f.folk.length + HUS.familjExtra, ag: f.ag } : { v: 0, plats: 0 };
    },
    namnFor: (s, _w, _h, _same, a) => husNamn(byId(s, a.ag)?.name ?? 'Familjens'),
  },
  samling: {
    namn: 'Samlingshus', ikon: '🪑', behov: 'En plats att umgås under tak när det är kallt', fara: false, vikt: 1, agare: 'byn',
    // byggs inte nytt: en sovsal som ingen sover i blir ett samlingshus (steg 1.6.4). När det är kallt samtalar och
    // berättar man där i stället för vid elden, om det är varmare där (val.ts)
    namnFor: (_s, _w, _h, same) => same ? `Samlingshus ${same + 1}` : 'Samlingshuset',
  },
  verkstad: {
    namn: 'Verkstad', ikon: 'verkstad', behov: 'Plats inne för en station som inte får plats i något annat hus (slöjdbänken)', fara: false, vikt: 1, agare: 'byn',
    // steg 2.2.17: byn vill bygga en station som står inne, men inget hus har plats för den (sovsalarna är fulla och i ett
    // förrådshus står inga stationer). Huset rymmer stationen, golvet framför den och lite till. Ingen sover där. Står det en
    // verkstad utan station byggs ingen ny
    akut: s => {
      const k = inneUtanPlats(s);
      if (!k || housesOf(s).some(h => h.fn === 'verkstad' && !stationerOf(s).some(t => stationRum(s, t)?.hus === h.id))) return { v: 0, plats: 0 };
      const { w, h } = storlek(k);
      return { v: HUS.verkstadAkut, plats: w * (h + 1) + HUS.verkstadExtra };
    },
    namnFor: (_s, _w, _h, same) => same ? `Verkstad ${same + 1}` : 'Verkstaden',
  },
} satisfies Record<string, Byggnad>;
export type Fn = keyof typeof BYGGNADER;
export const FN = Object.keys(BYGGNADER) as Fn[];
export const fnId = (h: Hus): Fn => (h.fn ?? 'sovsal') as Fn; // husets funktion; hus från äldre sparfiler är sovsalar
export const fnOf = (h: Hus): Byggnad => BYGGNADER[fnId(h)] ?? BYGGNADER.sovsal;
// så många andra hus (utom `utom`) har samma sorts namn som ett nytt hus för funktionen fn med yta w×h inuti väggarna
export function antalLika(s: State, fn: Fn, w: number, h: number, utom?: Hus) {
  const big = w * h >= HUS.langhus, hs = housesOf(s).filter(q => q !== utom);
  return fn === 'sovsal' ? hs.filter(q => q.namn.startsWith(big ? 'Långhus' : 'Hydda')).length : hs.filter(q => fnId(q) === fn).length;
}

// ett för maten när den ruttnar, ett för materialet när förrådet är fullt
function forradBehov(s: State): Akut {
  const har = (slag: string) => housesOf(s).some(h => h.fn === 'forrad' && (h.slag ?? 'mat') === slag), rot = s.ruttet ?? 0;
  if (rot >= HUS.ruttMin && !har('mat')) return { v: Math.min(1, rot / (HUS.ruttFullt * HUS.ruttMin)), plats: HUS.forradPlats, slag: 'mat' };
  if (storeFull(s) && !har('material')) return { v: HUS.forradFullt, plats: HUS.forradPlats, slag: 'material' };
  return { v: 0, plats: 0 };
}
// byns färdiga sovsalar som ingen sover i (h.tom sätts i funktionsbyte), utan station som gör dem till verkstäder
const tommaSovsalar = (s: State): Hus[] => housesOf(s).filter(h => (h.fn ?? 'sovsal') === 'sovsal' && h.ag === undefined && h.klar && h.tom !== undefined && !harArbete(s, h));

// det mest akuta behovet just nu: faror först, sedan vikten gånger hur akut det är
export function mostUrgent(s: State) {
  let best: { fn: Fn; a: Akut } | undefined, bs = 0;
  for (const fn of FN) {
    const r: Byggnad = BYGGNADER[fn];
    if (!r.akut) continue;
    const a = r.akut(s);
    if (a.v <= 1e-9) continue;
    const sc = (r.fara ? HUS.faraBonus : 0) + r.vikt * a.v;
    if (sc > bs) { bs = sc; best = { fn, a }; }
  }
  return best;
}

// ---------- familjehus (steg 1.6.3) ----------
// En familj är ägaren, partnern och de barn till dem som inte har egen partner. När ett par med barn inte har något eget
// hus och äger så mycket (förrådet och redskapen, efter värdet) att det räcker till huset, bestämmer familjen sig för att
// bygga ett. Huset ägs av den i paret som har lägst id (hus.ag); den som planerar det kan vara en annan i familjen (planBuild i
// bygg.ts). Det går i arv som föremål (arv.ts) och blir byns när ingen äger det.
// Materialet tas av familjens eget först, sedan efter behovsstegen (bygg.ts: takeForHouse). Familjen sover där.
export { familjOf } from './folk'; // familjen står i folk.ts, så att odlingen också kan läsa den (steg 2.10.13)
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
  const w = Math.max(HUS.minSida, Math.ceil(Math.sqrt(n))), h = Math.max(HUS.minSida, Math.ceil(n / w)), vagg = 2 * (w + 2) + 2 * h - 1, V = MATERIAL.timmer, G = MATERIAL.tra;
  return vagg * (V.n * grundvarde(V.item!) + V.tim * ARBETE) + w * h * (G.n * grundvarde(G.item!) + G.tim * ARBETE);
}
// den första familjen (ett par med barn) som inte har något eget hus och har råd med ett
function familjUtanHus(s: State) {
  const hs = housesOf(s);
  for (const o of living(s).sort((a, b) => a.id - b.id)) {
    const pa = byId(s, o.partner);
    if (!pa || !alive(pa) || pa.id < o.id) continue; // paret räknas en gång, från den med lägst id
    const folk = familjOf(s, o.id);
    if (folk.length < HUS.familjMin || hs.some(h => h.ag === o.id || h.ag === pa.id)) continue;
    if (formogenhet(s, folk) >= husKostnad(folk.length + HUS.familjExtra)) return { ag: o.id, folk };
  }
  return undefined;
}

// ---------- var man sover ----------
// Den som hör till en familj med ett eget hus sover där; alla andra sover i byns hus där man sover (sovsalarna), en per
// golvruta under tak. Där en station eller möbel står sover ingen, utom i en halmbädd (en sovplats per bädd), och bäddarna
// tas först (steg 2.2.5). En bädd har en ägare och delas inte (steg 3.10.2): den som äger en bädd där hen sover sover i den,
// och en bädd vars ägare sover någon annanstans står tom tills den flyttats (inredningen i stationer.ts). Cachen gäller så länge husen (s.byggV), tiden (s.now) och antalet levande är desamma. s.now flyttas inom
// ett slag av varje persons egen tid (taskStep i steg.ts), så den räknas om flera gånger per slag (ungefär 0,5 % av körtiden);
// s.now står kvar i nyckeln eftersom familjerna kan ändras inom ett slag
interface Boende { key: string; egna: Map<number, { tiles: number[]; folk: Person[]; hus: number }>; gemensamt: number[]; ovriga: Person[]; plats: Map<number, number> }
const boenden = new WeakMap<State, Boende>();
function boende(s: State): Boende {
  const ppl = living(s), key = `${s.byggV ?? 0}:${s.now}:${ppl.length}`;
  let b = boenden.get(s);
  if (b && b.key === key) return b;
  const hs = housesOf(s), egna = new Map<number, { tiles: number[]; folk: Person[]; hus: number }>(), gemensamt: number[] = [];
  const egnaTiles = new Map<number, number[]>();
  // de äldsta husen fylls först, så att det är ett nytt hus som står tomt när det blir för många sovplatser
  const ordning = (r: Rum) => { const i = hs.findIndex(h => h.id === r.hus); return i < 0 ? hs.length : i; };
  const baddar: number[] = [];
  for (const r of [...gridOf(s).rooms].sort((a, c) => ordning(a) - ordning(c))) {
    const h = husById(s, r.hus);
    if (h && !fnOf(h).sover) continue;
    const t = sovRutor(s, r);
    if (h?.ag !== undefined) egnaTiles.set(h.id, [...(egnaTiles.get(h.id) ?? []), ...t]);
    else { const st = stationRutor(s).sov; baddar.push(...t.filter(i => st.has(i))); gemensamt.push(...t.filter(i => !st.has(i))); }
  }
  gemensamt.unshift(...baddar);
  for (const h of hs) {
    let tiles = egnaTiles.get(h.id);
    if (!tiles?.length) continue;
    const st = stationRutor(s).sov;
    tiles = [...tiles.filter(i => st.has(i)), ...tiles.filter(i => !st.has(i))];
    const folk = familjOf(s, h.ag).filter(q => !egna.has(q.id)).sort((a, c) => a.id - c.id);
    const e = { tiles, folk, hus: h.id };
    for (const q of folk) egna.set(q.id, e);
  }
  const ovriga = ppl.filter(q => !egna.has(q.id)).sort((a, c) => a.id - c.id);
  // vem som sover var: först var och en i sin egen bädd, sedan de andra i id-ordning på det som är kvar (bäddar utan ägare
  // först). Bäddar som någon annan äger delas inte; finns färre platser än folk delar man de andra
  const lever = new Set(ppl.map(q => q.id)), agd = new Map<number, number>(), plats = new Map<number, number>();
  for (const t of stationerOf(s)) if (t.ag !== undefined && lever.has(t.ag) && isKlar(t) && stationDef(t.k)?.sover) agd.set(t.y * W + t.x, t.ag);
  const fordela = (tiles: number[], folk: Person[]) => {
    const ids = new Set(folk.map(q => q.id)), fria = tiles.filter(i => !agd.has(i)), rest: Person[] = [];
    for (const i of tiles) { const o = agd.get(i); if (o !== undefined && ids.has(o) && !plats.has(o)) plats.set(o, i); }
    for (const q of folk) if (!plats.has(q.id)) rest.push(q);
    rest.forEach((q, n) => { if (fria.length) plats.set(q.id, fria[n % fria.length]); });
  };
  for (const e of new Set(egna.values())) fordela(e.tiles, e.folk);
  fordela(gemensamt, ovriga);
  b = { key, egna, gemensamt, ovriga, plats };
  boenden.set(s, b);
  return b;
}
// huset där p får sova (steg 3.10.2): familjens eget hus, eller undefined för byns hus där man sover
export const sovHus = (s: State, p: Person) => boende(s).egna.get(p.id)?.hus;
// rutan där p sover, också om den är blöt (bedTile tar en torr), eller undefined
export const sovPlats = (s: State, p: Person) => boende(s).plats.get(p.id);
// golvrutorna i rummet där man kan sova: där ingen station står, och halmbäddarna (rutan uppe till vänster)
function sovRutor(s: State, r: Rum) {
  const st = stationRutor(s);
  return st.at.size ? r.tiles.filter(i => !st.at.has(i) || st.sov.has(i)) : r.tiles;
}
// sovplatserna i ett rum: en per golvruta under tak där ingen station står eller en per halmbädd, och inga i ett hus där man
// inte sover (som i boende)
export const sovplatser = (s: State, r: Rum) => { const h = husById(s, r.hus); return h && !fnOf(h).sover ? 0 : sovRutor(s, r).length; };
// så många sovplatser i rummet som ingen behöver: i ett familjehus de som familjen inte behöver, i byns hus de som ingen
// behöver i något av dem, och alla i ett hus där man inte sover (steg 2.2.5: där får en möbel stå)
export function sovKvar(s: State, r: Rum) {
  const h = husById(s, r.hus);
  if (h && !fnOf(h).sover) return Infinity;
  const b = boende(s);
  if (h?.ag !== undefined) {
    const tiles = gridOf(s).rooms.filter(q => q.hus === h.id).reduce((n, q) => n + sovRutor(s, q).length, 0);
    return tiles - familjOf(s, h.ag).length;
  }
  return b.gemensamt.length - b.ovriga.length;
}
// så många som sover under tak men inte i en halmbädd
export function utanBadd(s: State) {
  const b = boende(s), st = stationRutor(s).sov;
  let n = Math.min(b.ovriga.length, b.gemensamt.length) - Math.min(b.ovriga.length, b.gemensamt.filter(i => st.has(i)).length);
  for (const [h, e] of new Map([...b.egna.values()].map(e => [e.tiles, e]))) n += Math.min(e.folk.length, h.length) - Math.min(e.folk.length, h.filter(i => st.has(i)).length);
  return n;
}
// så många som saknar en egen sovplats under tak
export const homeless = (s: State) => { const b = boende(s); return Math.max(0, b.ovriga.length - b.gemensamt.length); };
// var p sover: en egen ruta under tak om det finns, annars ingenstans. Finns färre platser än folk delar man
export function bedTile(s: State, p: Person) {
  const b = boende(s), t = b.plats.get(p.id);
  if (t === undefined || !blot(s, t)) return t;
  return (b.egna.get(p.id)?.tiles ?? b.gemensamt).find(i => !blot(s, i)); // ingen sover på en blöt ruta: en annan, eller ingen (steg 3.8.7, flod.ts)
}
// rutan är blöt: vattnet står där eller stod där nyss, eller golvet är lera (steg 3.8.7, flod.ts)
const blot = (s: State, i: number) => flodBlot(s, i) || gridOf(s).at.get(i)?.m === 'lera';

// ---------- varje timme ----------
export function stepByggnader(s: State) {
  if (s.ruttet) s.ruttet = s.ruttet * HUS.ruttGlom < HUS.ruttGlomMin ? undefined : s.ruttet * HUS.ruttGlom;
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
// En sovsal som ingen har sovit i på ett dygn (ett år i spelet) får en ny funktion: en verkstad om en station står där
// (steg 2.2.17), annars ett förrådshus om byn behöver ett, annars ett samlingshus om byn inte har något, och annars rivs den
// och hälften av timret kommer tillbaka till byn.
// Saknas sovplatser blir ett samlingshus en sovsal igen, före ett nytt hus. Ett familjehus som ingen äger blir en sovsal.
// ett nytt namn efter funktionen
function nyttNamn(s: State, h: Hus, fn: Fn, a: Akut) {
  const r: Byggnad = BYGGNADER[fn], w = h.w - 2, hh = h.h - 2, same = antalLika(s, fn, w, hh, h);
  return r.namnFor ? r.namnFor(s, w, hh, same, a) : r.namn;
}
// ett förrådshus byter aldrig funktion, så lagerplatsen behöver inte tas bort här
function bytFn(s: State, h: Hus, fn: Fn, slag?: 'mat' | 'material') {
  const fore = h.namn;
  h.fn = fn; h.slag = slag; h.tom = undefined;
  h.namn = nyttNamn(s, h, fn, { v: 0, plats: 0, slag, ag: h.ag });
  touch(s); count(s, 'bytt_' + fn);
  log(s, `${fore} blir ${h.namn.toLowerCase()}.`, 'world'); kronika(s, `${fore} blev ${h.namn.toLowerCase()}.`);
  husKlar(s, h);
}
function riv(s: State, h: Hus) {
  const ved = bitsOf(s).filter(b => b.hus === h.id).reduce((a, b) => a + (MATERIAL[b.m].item === 'ved' ? b.mat : 0), 0) * HUS.rivTillbaka;
  s.byggen = bitsOf(s).filter(b => b.hus !== h.id); s.hus = housesOf(s).filter(q => q !== h);
  if (ved > 1e-9) put(s, 'ved', ved);
  touch(s); changed(s); count(s, 'rivet');
  log(s, `${h.namn} behövdes inte längre och revs. ${Math.round(ved)} trä kom tillbaka till byn.`, 'world'); kronika(s, `${h.namn} revs.`);
}
function funktionsbyte(s: State) {
  const hs = housesOf(s), arbete = new Set(living(s).filter(p => p.task?.act === 'bygga').map(p => bitById(s, p.task!.ref)?.hus));
  const fri = (h: Hus) => !!h.klar && !arbete.has(h.id);
  for (const h of hs) if (h.fn === 'familjehus' && h.ag === undefined && fri(h)) bytFn(s, h, 'sovsal');
  // saknas sovplatser blir ett samlingshus en sovsal igen
  if (homeless(s) > 0) { const h = hs.find(q => q.fn === 'samling' && fri(q)); if (h) bytFn(s, h, 'sovsal'); }
  // sovsalar som ingen sover i
  const b = boende(s), anvand = new Set(b.gemensamt.slice(0, b.ovriga.length)), f = forradBehov(s);
  for (const h of [...hs]) {
    if (fnId(h) !== 'sovsal' || h.ag !== undefined || !fri(h)) continue;
    const tiles = gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles);
    if (!tiles.length || tiles.some(i => anvand.has(i))) { h.tom = undefined; continue; }
    h.tom ??= s.now;
    const forrad = f.v > 1e-9 && !harArbete(s, h); // byn behöver ett förrådshus: ett tomt hus blir det före ett nytt
    if (s.now - h.tom < (forrad ? HUS.tomTim * HOUR : HUS.tomDygn * DAY)) continue;
    if (harArbete(s, h)) bytFn(s, h, 'verkstad'); // en station står där: den blir en verkstad och står kvar (steg 2.2.17)
    else if (f.v > 1e-9) bytFn(s, h, 'forrad', f.slag);
    else if (!hs.some(q => q.fn === 'samling')) bytFn(s, h, 'samling');
    else riv(s, h);
    return; // ett hus i taget
  }
}
// är det varmare inne i rummet än vid elden? c = kylan (coldOf): hur kallt det är ute
export function varmareInne(s: State, rum: Rum, c: number, varmer = false) {
  const f = eldPlats(s), inne = -c * (1 - shelterOf(s, rum, Math.min(living(s).length, rum.tiles.length))), ute = heatAt(s, f.x + 0.5, f.y + HUS.varmeY) * KROPP.eldVarme - c;
  return varmer ? inne >= ute : inne >= Math.min(0, ute) - HUS.varmeMarg; // den som ska värma sig går bara in om det är minst lika varmt som vid elden
}
// samlingshusets rum, där man umgås när det är kallt (val.ts)
export const samlingRum = (s: State): Rum | undefined => {
  const ids = new Set(housesOf(s).filter(h => h.fn === 'samling' && h.klar).map(h => h.id));
  return ids.size ? gridOf(s).rooms.find(r => r.hus !== undefined && ids.has(r.hus) && r.tiles.length) : undefined;
};

// ---------- rummets funktion av det som står i det (steg 2.2.17) ----------
// Ett rum får sin funktion av det som står i det och det som görs där: där någon sover är det ett sovrum, där en station
// står som man arbetar vid en verkstad, och där golvet är en lagerplats ett förråd. Flera funktioner i samma rum går bra. Varje
// sort är en rad i registret RUMSFUNKTIONER; husets egen funktion (fn ovan) säger vad byn byggde det för och styr vem som
// sover där och vad som får stå där. Gränssnittet visar båda (flikar/hus.ts, rutan under musen)
interface RumsFunktion { namn: string; ikon: string; om: string; har: (s: State, h: Hus) => boolean }
// en färdig station som man arbetar vid står i huset
const harArbete = (s: State, h: Hus) => stationerOf(s).some(t => isKlar(t) && !!stationDef(t.k)?.gor.length && stationRum(s, t)?.hus === h.id);
export const RUMSFUNKTIONER = {
  sovrum: {
    namn: 'Sovrum', ikon: '🛏️', om: 'Här sover någon',
    har: (s, h) => { const tiles = new Set(gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles)); return living(s).some(p => { const t = bedTile(s, p); return t !== undefined && tiles.has(t); }); },
  },
  verkstad: { namn: 'Verkstad', ikon: 'verkstad', om: 'Här står en station som man arbetar vid', har: harArbete },
  forrad: { namn: 'Förråd', ikon: '📦', om: 'Golvet är en lagerplats under tak', har: (s, h) => zonesOf(s).some(z => z.hus === h.id) },
} satisfies Record<string, RumsFunktion>;
export const RUMSFUNKTION_LIST = Object.keys(RUMSFUNKTIONER) as (keyof typeof RUMSFUNKTIONER)[];
// husets funktioner efter det som står i det
export const rumsFunktioner = (s: State, h: Hus): RumsFunktion[] => RUMSFUNKTION_LIST.map(k => RUMSFUNKTIONER[k] as RumsFunktion).filter(f => f.har(s, h));

// ---------- ett hus blir färdigt ----------
// ett förrådshus: golvet blir en lagerplats under tak, viktigast av alla, så att det som ligger ute bärs in dit
export function husKlar(s: State, h: Hus) {
  if (!fnOf(h).lager || zonesOf(s).some(z => z.hus === h.id)) return;
  zonesOf(s).push({ x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, namn: h.namn, slag: h.slag, prio: 3, hus: h.id });
  changed(s);
  log(s, `${h.namn} är färdigt. Där ruttnar och slits ${h.slag === 'material' ? 'materialet' : 'maten'} mindre.`, 'world');
}
