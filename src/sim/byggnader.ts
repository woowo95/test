import { husNytt } from './byggnad';
import { KROPP, alive, byId, count, familjOf, living, log } from './folk';
import { Hus, MATERIAL, Rum, bitById, bitsOf, gridOf, housesOf, husById, roofed, shelterOf, touch } from './byggnad';
import { ageIndex, kallTid } from './tid';
import { heatAt } from './eld';
import { eldPlats } from './karta';
import { changed, enPerRuta, ownedAll, put, stacksOf, storeFull, zoneAt, zonesOf } from './lager';
import { kronika } from './historik';
import { DAY, HOUR, W } from './typer';
import { tingOf } from './agande';
import { ARBETE, grundvarde, tingVarde, varuVarde } from './varde';
import { Person, State } from './typer';
import { balans } from './balans';
import { flodBlot } from './sjo';
import { inneUtanPlats, isKlar, stationDef, stationRum, stationRutor, stationerOf, storlek } from './stationer';
import { SJUKDOMAR } from './sjukdom';
import { kn } from './kunskap';
import { fahusAkut } from './slatter';

// ---------- balanstal (regel 8) ----------
// Husens storlek, vad de är till för och när de byter funktion eller rivs. Var de står och hur de byggs står i BYGG (bygg.ts)
export const HUS = balans('hus', {
  minSida: 2, // ett hus är minst så här många rutor på varje sida inuti väggarna ...
  maxSida: 6, // ... och högst så här många på den kortare sidan (6 sedan steg 9.2.36, när sovrummen fick tre rutor per person) ...
  langSida: 2, // ... med den längre sidan högst så här många gånger den kortare
  langhus: 8, // en sovsal med så här många sovplatser (personer) eller fler är ett långhus, annars en hydda
  // tre rutor per person (steg 9.2.36): ett sovrum byggs med så här många golvrutor per person som ska sova där (halmbädden
  // på två rutor och en ruta att gå på) ...
  sovPer: 3,
  sovFast: 2, // ... plus så här många för gångar och rymd, lika för alla hus. Sovplatserna räknas i personer (sovPersoner)
  faraBonus: 100, // en fara (kylan) går före all bekvämlighet: så många poäng över vikten gånger hur akut det är
  ruttMin: 10, // så mycket mat som ruttnat bort på sistone innan byn bygger ett förrådshus
  ruttFullt: 4, // behovet av förrådshus är som störst när så här många gånger ruttMin ruttnat
  ruttGlom: 0.97, // så mycket av det som ruttnat som byn minns efter en timme (hälften efter ett dygn)
  ruttGlomMin: 0.01, // mindre än så här glöms helt
  forradPlats: 6, // ett nytt förrådshus rymmer så här många rutor
  forradFullt: 0.5, // hur akut ett fullt förråd är (0 till 1)
  familjAkut: 0.5, // hur akut det är att en familj får eget hus (0 till 1)
  familjMin: 3, // en familj med färre än så här många ger inget familjehus
  tomDygn: 1, // en sovsal som ingen sovit i så här länge (dygn, år i spelet) får en ny funktion eller rivs
  tomSamling: 0.5, // hur akut ett samlingshus är för en tom sovsal när byn inget har (tomBlir, steg 10.2.39) ...
  tomRiv: 0.3, // ... och är inget värt mer än så här rivs den
  tomTim: 4, // ... men behöver byn ett förrådshus blir den det redan efter så här många timmar, före ett nytt hus (steg 2.12.5)
  rivTillbaka: 0.5, // så mycket av materialet kommer tillbaka när ett hus rivs
  varmeMarg: 0.02, // ett samlingshus räknas som varmare än elden även om det är så här mycket kallare ...
  vagVarme: 0.01, // den som ska värma sig räknar så här mycket värme för varje ruta vägen till ett rum eller till elden är (steg 10.2.9)
  varmeY: 2.9, // ... mätt så här många rutor söder om elden
  torkhusFran: 2, // så många torkställningar ute innan byn vill ha ett torkhus (steg 7.3.5)
  vedbodFran: 40, // så mycket ved ute utan tak innan byn vill ha en vedbod (steg 7.3.6)
  omkringAkut: 0.25, // hur akut torkhuset och vedboden är (0 till 1), vedboden dubbelt så akut inför vintern
  salAkut: 0.3, // hur akut det är med en samlingssal när byn har en scen (0 till 1, steg 7.2.7) ...
  salMin: 8, // ... och så många rutor den har minst
  verkstadHyllor: 2, // en lagerplats med det stationerna använder för så här många stationer i verkstaden (steg 7.2.9)
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
export interface Akut { v: number; plats: number; slag?: 'mat' | 'material'; ag?: number; hus?: number; kop?: boolean } // hus = just det här huset behöver mer plats (familjen har vuxit); kop = familjen har bara råd att köpa ett hus (steg 9.2.109)
export interface Byggnad {
  namn: string; ikon: string;
  behov: string; // vilket behov den fyller (förklaringen i gränssnittet)
  fara: boolean; // behovet är en fara (kylan): går före all bekvämlighet
  vikt: number; // hur viktigt behovet är bland dem som är lika farliga
  sover?: boolean; // man sover här
  omkring?: boolean; // huset byggs runt det som redan står, torkställningarna eller vedhögarna (steg 9.2.137)
  lager?: boolean; // golvet är en lagerplats under tak: det som ligger där ruttnar och slits mindre (LAGER.inne i lager.ts)
  akut?: (s: State) => Akut; // saknas: byn planerar inga nya hus för det
  namnFor?: (s: State, w: number, h: number, same: number, a: Akut) => string; // det nya husets namn
}
export const BYGGNADER = {
  sovsal: {
    namn: 'Sovsal', ikon: '🛏️', behov: 'Sovplatser under tak åt alla, mot kylan', fara: true, vikt: 3, sover: true,
    // så många som saknar en sovplats, och lite till för barn som kommer
    akut: s => { const n = living(s).length, u = homeless(s); return { v: n ? u / n : 0, plats: u }; },
    namnFor: (_s, w, h, same) => { const big = sovPersoner(w * h) >= HUS.langhus; return same ? `${big ? 'Långhus' : 'Hydda'} ${same + 1}` : big ? 'Långhuset' : 'Hyddan'; },
  },
  forrad: {
    namn: 'Förrådshus', ikon: '📦', behov: 'Maten ruttnar eller förrådet är fullt: under tak ruttnar och slits det mindre', fara: false, vikt: 2, lager: true,
    // ett tomt hus blir förrådshuset (funktionsbyte nedan), så då byggs inget nytt (steg 2.12.5)
    akut: s => tommaSovsalar(s).length ? { v: 0, plats: 0 } : forradBehov(s),
    namnFor: (_s, _w, _h, same) => same ? `Förrådshus ${same + 1}` : 'Förrådshuset',
  },
  familjehus: {
    namn: 'Familjehus', ikon: '🏠', behov: 'En familj vill bo för sig och har råd att bygga ett eget hus', fara: false, vikt: 1, sover: true,
    // en familj (ett par med barn) utan eget hus som äger så mycket att den kan betala huset själv
    akut: s => {
      const f = familjUtanHus(s);
      if (f) return { v: HUS.familjAkut, plats: f.folk.length, ag: f.ag, ...(f.kop ? { kop: true } : {}) };
      // familjen har vuxit ur sitt hus (steg 7.2.6): huset behöver mer plats
      for (const h of housesOf(s)) {
        if (h.fn !== 'familjehus' || h.ag === undefined || !h.klar) continue;
        const folk = familjOf(s, h.ag).length, plats = gridOf(s).rooms.filter(r => r.hus === h.id).reduce((n, r) => n + sovplatser(s, r), 0);
        if (folk > plats) return { v: HUS.familjAkut, plats: folk - plats, ag: h.ag, hus: h.id };
      }
      return { v: 0, plats: 0 };
    },
    namnFor: (s, _w, _h, _same, a) => husNamn(byId(s, a.ag)?.name ?? 'Familjens'),
  },
  samling: {
    namn: 'Samlingshus', ikon: '🪑', behov: 'En plats att umgås under tak när det är kallt', fara: false, vikt: 1,
    // en sovsal som ingen sover i blir ett samlingshus (steg 1.6.4). När scenen finns vill byn ha en sal under tak (steg 7.2.7):
    // den blir byns mötesplats i stället för elden, och scenen kan stå där (en samlingssal med en scen är en gillesal)
    akut: s => stationerOf(s).some(t => t.k === 'scen' && isKlar(t)) && !housesOf(s).some(h => h.fn === 'samling') ? { v: HUS.salAkut, plats: Math.max(HUS.salMin, living(s).length) } : { v: 0, plats: 0 },
    namnFor: (_s, _w, _h, same) => same ? `Samlingshus ${same + 1}` : 'Samlingshuset',
  },
  // torkhuset och vedboden (steg 7.3.5, 7.3.6 och 9.2.137): vanliga hus med timmerväggar, en dörr och jordgolv runt det som redan
  // står ute, torkställningarna eller vedhögarna. Byggs av Byggplanens åtgärd omkring (byggplan.ts)
  torkhus: {
    namn: 'Torkhus', ikon: 'tork', behov: 'Under tak torkar maten i alla väder', fara: false, vikt: 0.8, omkring: true,
    akut: s => torkUte(s).length >= HUS.torkhusFran ? { v: HUS.omkringAkut, plats: 0 } : { v: 0, plats: 0 },
    namnFor: (_s, _w, _h, same) => same ? `Torkhus ${same + 1}` : 'Torkhuset',
  },
  vedbod: {
    namn: 'Vedbod', ikon: 'ved', behov: 'Under tak blir veden aldrig blöt och torkar fortare', fara: false, vikt: 0.8, omkring: true,
    akut: s => { const n = vedUte(s).reduce((a, q) => a + q.n, 0); return n >= HUS.vedbodFran ? { v: HUS.omkringAkut * (kallTid(ageIndex(s)) ? 2 : 1), plats: 0 } : { v: 0, plats: 0 }; },
    namnFor: (_s, _w, _h, same) => same ? `Vedbod ${same + 1}` : 'Vedboden',
  },
  // fähuset (steg 9.8.9, slatter.ts): djuren står där i istiden och fryser inte. Byggs när byn har betesdjur som inte får plats
  fahus: {
    namn: 'Fähus', ikon: 'fahus', behov: 'Djuren står under tak i istiden och fryser inte', fara: false, vikt: 1.2,
    akut: s => fahusAkut(s),
    namnFor: (_s, _w, _h, same) => same ? `Fähus ${same + 1}` : 'Fähuset',
  },
  verkstad: {
    namn: 'Verkstad', ikon: 'verkstad', behov: 'Plats inne för en station som inte får plats i något annat hus (slöjdbänken)', fara: false, vikt: 1,
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
// torkställningarna ute utan tak, och vedhögarna ute i lagret utan tak
export const torkUte = (s: State) => stationerOf(s).filter(t => t.k === 'tork' && isKlar(t) && !roofed(s, t.x, t.y));
export const vedUte = (s: State) => stacksOf(s).filter(a => a.k === 'ved' && zoneAt(s, a.x, a.y) >= 0 && !roofed(s, a.x, a.y));
export type Fn = keyof typeof BYGGNADER;
export const FN = Object.keys(BYGGNADER) as Fn[];
export const fnId = (h: Hus): Fn => (h.fn ?? 'sovsal') as Fn; // husets funktion; hus från äldre sparfiler är sovsalar
export const fnOf = (h: Hus): Byggnad => BYGGNADER[fnId(h)] ?? BYGGNADER.sovsal;
// funktionen sitter på rummet (steg 7.2.1): rummets egen om den har någon, annars husets, så att ett hus från en gammal sparfil
// blir ett rum med husets funktion. Ett rum utanför något hus räknas som en sovsal
export const rumNyckel = (r: Rum) => String(r.tiles.length ? Math.min(...r.tiles) : -1);
export function rumFnId(s: State, r: Rum): Fn {
  const h = husById(s, r.hus);
  return (h?.rumFn?.[rumNyckel(r)] ?? (h ? fnId(h) : 'sovsal')) as Fn;
}
export const rumFnOf = (s: State, r: Rum): Byggnad => BYGGNADER[rumFnId(s, r)] ?? BYGGNADER.sovsal;
export function setRumFn(s: State, r: Rum, fn: Fn) {
  const h = husById(s, r.hus);
  if (h) { (h.rumFn ??= {})[rumNyckel(r)] = fn; touch(s); }
}
// så många andra hus (utom `utom`) har samma sorts namn som ett nytt hus för funktionen fn med yta w×h inuti väggarna
export function antalLika(s: State, fn: Fn, w: number, h: number, utom?: Hus) {
  const big = sovPersoner(w * h) >= HUS.langhus, hs = housesOf(s).filter(q => q !== utom);
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
// finns ett hus till salu som familjen har råd med (kanKopa i byggplan.ts, som sätter funktionen när allt är laddat)
let kanKopaF: (s: State, ag: number, folk: number) => boolean = () => false;
export const satKanKopa = (f: typeof kanKopaF) => { kanKopaF = f; };
// den första familjen (ett par med barn) som inte har något eget hus och har råd med ett: att bygga ett nytt, eller att köpa ett
// som är till salu (kop, steg 9.2.109)
function familjUtanHus(s: State): { ag: number; folk: Person[]; kop?: boolean } | undefined {
  const hs = housesOf(s);
  for (const o of living(s).sort((a, b) => a.id - b.id)) {
    const pa = byId(s, o.partner);
    if (!pa || !alive(pa) || pa.id < o.id) continue; // paret räknas en gång, från den med lägst id
    const folk = familjOf(s, o.id);
    if (folk.length < HUS.familjMin || hs.some(h => h.ag === o.id || h.ag === pa.id)) continue;
    if (formogenhet(s, folk) >= husKostnad(folk.length)) return { ag: o.id, folk };
    if (kanKopaF(s, o.id, folk.length)) return { ag: o.id, folk, kop: true };
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
    if (h && !rumFnOf(s, r).sover) continue;
    const st0 = stationRutor(s).sov, bb = sovRutor(s, r).filter(i => st0.has(i)), t = [...bb, ...sovRutor(s, r).filter(i => !st0.has(i))].slice(0, Math.max(bb.length, rumPlatser(s, r))); // bäddarna först, och bara så många som rummet rymmer (steg 9.2.36)
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
    // ägs alla bäddar av andra sover den som blev utan (ett barn som nyss fötts) hos sin mor eller far, eller delar en plats
    for (const q of folk) if (!plats.has(q.id) && tiles.length) {
      const f = [q.mother, q.father].map(id => id === undefined ? undefined : plats.get(id)).find(i => i !== undefined && tiles.includes(i));
      plats.set(q.id, f ?? tiles[q.id % tiles.length]);
    }
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
// tre rutor per person (steg 9.2.36): så många golvrutor ett sovrum för n personer byggs med, och så många personer som får
// plats på ett golv. Golvet räknas utan stationerna, men med halmbäddarna (de är en del av sovplatsen)
export const sovRutorFor = (n: number) => n * HUS.sovPer + HUS.sovFast;
export const sovPersoner = (rutor: number) => rutor <= 0 ? 0 : Math.max(1, Math.floor((rutor - HUS.sovFast) / HUS.sovPer));
function golvRutor(s: State, r: Rum) {
  const st = stationRutor(s);
  return st.at.size ? r.tiles.filter(i => { const t = st.at.get(i); return !t || !!stationDef(t.k)?.sover; }).length : r.tiles.length;
}
// varje bädd är en sovplats, också om rummet egentligen är för litet för så många (steg 9.2.36)
const rumPlatser = (s: State, r: Rum) => { const st = stationRutor(s).sov; return Math.max(sovPersoner(golvRutor(s, r)), r.tiles.filter(i => st.has(i)).length); };
// sovplatserna i ett rum, i personer, och inga i ett hus där man inte sover (som i boende)
export const sovplatser = (s: State, r: Rum) => husById(s, r.hus) && !rumFnOf(s, r).sover ? 0 : rumPlatser(s, r);
// så många golvrutor i rummet som ingen behöver (en möbel får stå där): i ett familjehus det familjen inte behöver, i byns hus
// det som ingen behöver i något av dem, och alla i ett hus där man inte sover (steg 2.2.5). En sovande behöver HUS.sovPer
// rutor (steg 9.2.36); rutorna för rymd får ta en möbel
export function sovKvar(s: State, r: Rum) {
  const h = husById(s, r.hus);
  if (h && !rumFnOf(s, r).sover) return Infinity;
  const b = boende(s);
  if (h?.ag !== undefined) {
    const golv = gridOf(s).rooms.filter(q => q.hus === h.id).reduce((n, q) => n + golvRutor(s, q), 0);
    return golv - familjOf(s, h.ag).length * HUS.sovPer; // rutorna för rymd (HUS.sovFast) får ta en möbel
  }
  const golv = gridOf(s).rooms.filter(q => { const hh = husById(s, q.hus); return (!hh || rumFnOf(s, q).sover) && hh?.ag === undefined; }).reduce((n, q) => n + golvRutor(s, q), 0);
  return golv - b.ovriga.length * HUS.sovPer;
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
// den sjuke sover för sig (steg 9.5.5, kunskapen Smittan): i ett färdigt hus där ingen bor, när någon i byn kan Smittan och
// sjukdomen smittar. En ruta per sjuk i huset, ingen frisk sover där (ingen bor där)
function sjukBadd(s: State, p: Person) {
  if (!p.sjuk || p.sjuk.st === undefined || SJUKDOMAR[p.sjuk.k].smitta <= 0 || !living(s).some(q => kn(q, 'smitta') >= 0.5)) return undefined;
  const b = boende(s), bor = new Set([...b.plats.values()]);
  for (const h of housesOf(s)) {
    if (!h.klar || h.ut) continue;
    const rutor = gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles);
    if (!rutor.length || rutor.some(i => bor.has(i))) continue;
    const sjuka = living(s).filter(q => q.sjuk && q.sjuk.st !== undefined && SJUKDOMAR[q.sjuk.k].smitta > 0).sort((a, c) => a.id - c.id);
    return rutor[sjuka.indexOf(p) % rutor.length];
  }
  return undefined;
}
// var p sover: en egen ruta under tak om det finns, annars ingenstans. Finns färre platser än folk delar man
export function bedTile(s: State, p: Person) {
  const iso = sjukBadd(s, p); if (iso !== undefined) return iso; // den sjuke i ett tomt hus när byn kan Smittan (steg 9.5.5)
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
    h.ag = undefined; husNytt(s, h, 'ag', 'Har nyss blivit byns.'); log(s, `${h.namn} har ingen ägare längre och blir byns.`, 'world');
  }
  funktionsbyte(s);
  verkstadensHyllor(s);
}
// verkstadens hyllor (steg 7.2.9): några rutor på verkstadens golv blir lagerplatser för material, så att den som arbetar har det
// nära till hands. Bärarna fyller på dem från förrådet som alla andra lagerplatser, och hyllorna (förvaringen) ställs där när golvet är fullt
function verkstadensHyllor(s: State) {
  for (const h of housesOf(s)) {
    if (fnId(h) !== 'verkstad' || !h.klar) continue;
    const st = stationerOf(s).filter(t => isKlar(t) && stationRum(s, t)?.hus === h.id).length, vill = Math.ceil(st / HUS.verkstadHyllor), har = zonesOf(s).filter(z => z.hus === h.id).length;
    if (har >= vill) continue;
    const r = gridOf(s).rooms.find(q => q.hus === h.id && q.tiles.length), upp = stationRutor(s);
    const i = r?.tiles.find(t => !upp.at.has(t) && !upp.sitt.has(t) && !zonesOf(s).some(z => z.x === t % W && z.y === Math.floor(t / W)));
    if (i === undefined) continue;
    zonesOf(s).push({ x: i % W, y: Math.floor(i / W), w: 1, h: 1, namn: `Hyllan i ${h.namn.toLowerCase()}`, slag: 'material', prio: 2, hus: h.id });
    changed(s); count(s, 'verkstadHylla');
  }
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
  husNytt(s, h, 'fn', `Var nyss ${fore.toLowerCase()}.`);
  h.fn = fn; h.slag = slag; h.tom = undefined; h.rumFn = undefined;
  h.namn = nyttNamn(s, h, fn, { v: 0, plats: 0, slag, ag: h.ag });
  touch(s); count(s, 'bytt_' + fn);
  log(s, `${fore} blev ${h.namn.toLowerCase()}.`, 'world'); kronika(s, `${fore} blev ${h.namn.toLowerCase()}.`, 'bygge');
  husKlar(s, h);
}
function riv(s: State, h: Hus) {
  const ved = Math.floor(bitsOf(s).filter(b => b.hus === h.id).reduce((a, b) => a + (MATERIAL[b.m].item === 'ved' ? b.mat : 0), 0) * HUS.rivTillbaka); // hela trä
  s.byggen = bitsOf(s).filter(b => b.hus !== h.id); s.hus = housesOf(s).filter(q => q !== h);
  if (ved >= 1) put(s, 'ved', ved);
  touch(s); changed(s); count(s, 'rivet');
  log(s, `${h.namn} behövdes inte längre och revs. ${Math.round(ved)} trä kom tillbaka till byn.`, 'world'); kronika(s, `${h.namn} revs.`, 'bygge');
}
// vad en tom sovsal blir (steg 10.2.39): det byn behöver mest, med poäng som i BYGGNADER (vikten gånger hur akut det är). En
// station som står där gör den till en verkstad (steg 2.2.17), ett förrådshus när maten ruttnar eller förrådet är fullt, ett
// samlingshus när byn inget har (HUS.tomSamling, eller mer när en scen står utan sal); är inget värt mer än HUS.tomRiv rivs den
function tomBlir(s: State, h: Hus, f: Akut, hs: Hus[]): { fn: Fn | 'riv'; slag?: Akut['slag'] } {
  let b: { fn: Fn | 'riv'; slag?: Akut['slag'] } = { fn: 'riv' }, bv = HUS.tomRiv;
  const prova = (fn: Fn, v: number, slag?: Akut['slag']) => { if (v > bv) { bv = v; b = { fn, slag }; } };
  if (harArbete(s, h)) prova('verkstad', BYGGNADER.verkstad.vikt);
  if (f.v > 1e-9) prova('forrad', BYGGNADER.forrad.vikt * f.v, f.slag);
  if (!hs.some(q => q.fn === 'samling')) prova('samling', BYGGNADER.samling.vikt * Math.max(HUS.tomSamling, BYGGNADER.samling.akut?.(s).v ?? 0));
  return b;
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
    const b = tomBlir(s, h, f, hs);
    if (b.fn === 'riv') riv(s, h); else bytFn(s, h, b.fn, b.slag);
    return; // ett hus i taget
  }
}
// är det varmare inne i rummet än vid elden? c = kylan (coldOf): hur kallt det är ute
// Den som ska värma sig (varmer) väger värmen inne mot värmen vid elden, med vägen dit (HUS.vagVarme per ruta, steg 10.2.9): en
// släckt eld värmer inte, vad som än finns att tända den med
export function varmareInne(s: State, rum: Rum, c: number, varmer = false, p?: { x: number; y: number }) {
  const f = eldPlats(s), inne = -c * (1 - shelterOf(s, rum, Math.min(living(s).length, rum.tiles.length))), ute = heatAt(s, f.x + 0.5, f.y + HUS.varmeY) * KROPP.eldVarme - c;
  if (varmer) {
    const t = rum.tiles[0], dIn = p && t !== undefined ? Math.hypot(p.x - (t % W + 0.5), p.y - (Math.floor(t / W) + 0.5)) : 0, dUt = p ? Math.hypot(p.x - f.x - 0.5, p.y - f.y - 0.5) : 0;
    return inne - HUS.vagVarme * dIn >= ute - HUS.vagVarme * dUt;
  }
  return inne >= Math.min(0, ute) - HUS.varmeMarg;
}
// samlingshusets rum, där man umgås när det är kallt (val.ts)
export const samlingRum = (s: State): Rum | undefined => {
  const ids = new Set(housesOf(s).filter(h => h.klar).map(h => h.id));
  return ids.size ? gridOf(s).rooms.find(r => r.hus !== undefined && ids.has(r.hus) && r.tiles.length && rumFnId(s, r) === 'samling') : undefined;
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
  enPerRuta(s);
  log(s, `${h.namn} är färdigt. Där ruttnar och slits ${h.slag === 'material' ? 'materialet' : 'maten'} mindre.`, 'world');
}
