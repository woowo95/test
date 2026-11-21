import { antal, iMening, stor, husIMening } from './ord';
import { fangelseAkut } from './fangelse';
import { husNytt } from './byggnad';
import { ALDER, KROPP, ageOf, alive, byId, count, familjOf, living, log } from './folk';
import { planKlar, planRutor, troshusBestamd, troshusGolv, vuxnaTroende } from './troshus';
import { Hus, MATERIAL, Rum, bitById, gridOf, housesOf, husById, roofed, roomAt, shelterOf, touch } from './byggnad';
import { heatAt, vedPerDygn } from './eld';
import { BLOTVED } from './blotved';
import { eldPlats } from './karta';
import { changed, enPerRuta, isStored, ownedAll, stacksOf, utanPlatsNu, zoneAt, zonesOf } from './lager';
import { rivHus } from './bygg';
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
  ruttGlom: 0.97, // så mycket av det som ruttnat som byn minns efter en timme (hälften efter ett dygn)
  ruttGlomMin: 0.01, // mindre än så här glöms helt
  forradPlats: 6, // ett nytt förrådshus rymmer minst så här många rutor ...
  forradMax: 16, // ... och högst så här många; ett mindre byggs ut när förrådet växer (steg 10.2.67)
  forradMinBrist: 4, // så här många rutor av förrådet ska sakna tak innan byn bygger eller bygger ut ett förrådshus
  forradAkut: 1, // hur akut förrådshuset är när allt i förrådet saknar tak (0 till 1)
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
  // torkhuset och vedboden byggs efter det som går förlorat utan tak (steg 10.11.6): förlusten per dygn (grundvärde) under så här
  // många dygn mot vad ett sådant hus kostar (grundvärde) är hur akut det är (högst 1)
  omkringDygn: 5,
  omkringKostnad: 30,
  matVarde: 1.2, // vad maten som ruttnat är värd per sak (grundvärde, ungefär fisk och bär)
  salAkut: 0.3, // hur akut det är med en samlingssal när byn har en scen (0 till 1, steg 7.2.7) ...
  salMin: 8, // ... och så många rutor den har minst
  verkstadHyllor: 2, // en lagerplats med det stationerna använder för så här många stationer i verkstaden (steg 7.2.9)
  verkstadAkut: 0.5, // hur akut det är att få plats inne för en station som inte får plats i något hus (0 till 1, steg 2.2.17) ...
  verkstadExtra: 2, // ... och så här många golvrutor fler än stationen, golvet framför den och rutan innanför dörren (verkstadPlats)
});
// verkstadens golv: stationen, golvet framför den, rutan innanför dörren som alltid är fri (steg 12.1.36) och lite till
export const verkstadPlats = (k: string) => { const { w, h } = storlek(k); return w * (h + 1) + 1 + HUS.verkstadExtra; };

// ---------- byggnaderna: vad ett hus är till för ----------
// Varje sorts byggnad är en rad i registret BYGGNADER (sedan steg 1.6.1): vilket behov den fyller, hur viktigt behovet är
// och vem som äger den. Planeringen (planBuild i bygg.ts) frågar varje rad hur akut dess behov är just nu och bygger för
// det mest akuta: faror (kyla) före bekvämlighet, sedan efter vikten. Ett hus har en funktion (`fn`, en rad här); hus från
// äldre sparfiler är sovsalar. Väggarna, golven och arbetet med dem är desamma för alla (bygg.ts, byggnad.ts).
// En ny sorts byggnad blir en rad.
// v = hur akut (0 = behövs inte, 1 = mycket), plats = rutor under tak som behövs,
// ag = vem som ska äga huset (ett familjehus)
export interface Akut { tro?: number; v: number; plats: number; ag?: number; hus?: number; kop?: boolean } // hus = just det här huset behöver mer plats (familjen har vuxit); kop = familjen har bara råd att köpa ett hus (steg 9.2.109)
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
    // en tom sovsal någon annanstans tar inte bort behovet (steg 12.1.18)
    akut: s => forradBehov(s),
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
    akut: s => torkUte(s).length ? { v: omkringAkut(torkForlust(s)), plats: 0 } : { v: 0, plats: 0 },
    namnFor: (_s, _w, _h, same) => same ? `Torkhus ${same + 1}` : 'Torkhuset',
  },
  vedbod: {
    namn: 'Vedbod', ikon: 'ved', behov: 'Under tak blir veden aldrig blöt och torkar fortare', fara: false, vikt: 0.8, omkring: true,
    akut: s => vedUte(s).length ? { v: omkringAkut(vedForlust(s)), plats: 0 } : { v: 0, plats: 0 },
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
      return { v: HUS.verkstadAkut, plats: verkstadPlats(k) };
    },
    namnFor: (_s, _w, _h, same) => same ? `Verkstad ${same + 1}` : 'Verkstaden',
  },
  // trons hus (steg 10.3.19, troshus.ts): när trons plan är klar, så många golvrutor som planen vill ha och trons hus inte har.
  // Behovet är trons (Akut.tro): bara de troende bygger, av det kyrkan äger, och det hindrar inte byns andra byggen (byggplan.ts)
  // fängelset (steg 11.12.1 och 12.1.27, fangelse.ts): när byn vill ha ett och saknar det, eller det är fullt
  fangelse: {
    namn: 'Fängelse', ikon: 'fangelse', behov: 'Byn vill kunna hålla den som dömts inlåst', fara: false, vikt: 1,
    akut: s => fangelseAkut(s),
    namnFor: (_s, _w, _h, same) => same ? `Fängelse ${same + 1}` : 'Fängelset',
  },
  troshus: {
    namn: 'Trons hus', ikon: 'hov', behov: 'Tron har bestämt hur dess hus ska se ut', fara: false, vikt: 1,
    akut: s => {
      let bast: Akut = { v: 0, plats: 0 };
      const n = living(s).length;
      for (const tr of s.tron ?? []) {
        if (tr.slut !== undefined || !planKlar(s, tr)) continue;
        const plats = (tr.planRutor ?? planRutor(s, tr, tr.plan?.storlek ?? 'lagom')) - troshusGolv(s, tr), v = n ? vuxnaTroende(s, tr).length / n : 0;
        if (plats > 0 && v > bast.v) bast = { v, plats, tro: tr.id };
      }
      return bast;
    },
    namnFor: (s, _w, _h, _same, a) => { const tr = (s.tron ?? []).find(q => q.id === a.tro); return tr ? troshusBestamd(s, tr) : 'Trons hus'; },
  },
} satisfies Record<string, Byggnad>;
// torkställningarna ute utan tak, och vedhögarna ute i lagret utan tak
// det som går förlorat per dygn utan tak (grundvärde, steg 10.11.6): maten som ruttnat (s.ruttet glöms med hälften per dygn, så
// det är ungefär ett dygns förlust), och veden som brinner fortare för att den är blöt (BLOTVED.brann gånger andelen blöt ved)
const torkForlust = (s: State) => (s.ruttet ?? 0) * HUS.matVarde;
function vedForlust(s: State) {
  let alla = 0, blot = 0;
  for (const a of stacksOf(s)) if (a.k === 'ved' && isStored(s, a.x, a.y)) { alla += a.n; if (a.blot) blot += a.n; } // veden i förrådet (steg 12.1.55)
  return alla > 0 ? vedPerDygn(s) * blot / alla * BLOTVED.brann * grundvarde('ved') : 0;
}
const omkringAkut = (forlust: number) => Math.min(1, forlust * HUS.omkringDygn / HUS.omkringKostnad);
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
// förrådshusen växer med förrådet (steg 10.2.67): det byn vill ha under tak (rutorna förrådet fyller, efter förrådsmålen) mot det
// förrådshusen rymmer. Bristen avgör hur akut det är och hur stort huset blir; ett förrådshus som blivit för litet byggs ut
function forradBehov(s: State): Akut {
  const forrad = new Set(housesOf(s).filter(h => h.fn === 'forrad' && h.klar).map(h => h.id));
  let inne = 0;
  for (const z of zonesOf(s)) if (z.hus !== undefined && forrad.has(z.hus)) inne += z.w * z.h;
  const rutor = new Set<number>(); // rutorna förrådet fyller
  for (const a of stacksOf(s)) if (a.n > 0 && isStored(s, a.x, a.y)) rutor.add(a.y * W + a.x);
  let ute = 0, inneFullt = 0;
  const zs = zonesOf(s);
  for (const i of rutor) { const z = zs[zoneAt(s, i % W, Math.floor(i / W))]; if (z?.hus !== undefined && forrad.has(z.hus)) inneFullt++; else ute++; }
  const brist = ute - (inne - inneFullt) + Math.round(utanPlatsNu(s)); // och det som legat på marken utan plats (steg 12.1.18)
  if (brist < HUS.forradMinBrist) return { v: 0, plats: 0 };
  // huset tar emot allt, mat och material (inget slag): det byggs för förrådet, inte ett för maten och ett för materialet
  const plats = Math.max(HUS.forradPlats, Math.min(HUS.forradMax, brist));
  // en utbyggnad av ett förrådshus som inte nått sin största storlek och ett nytt hus är båda förslag, och byggplanen väljer
  // efter värde och kostnad (steg 12.1.18)
  return { v: Math.min(1, brist / Math.max(1, rutor.size + utanPlatsNu(s))) * HUS.forradAkut, plats };
}

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
// husets namn mitt i en mening (steg 12.1.199): en familjs hus heter efter en person (Ingos hus) och behåller den stora
// bokstaven, annars skrivs det med liten (hyddan, sovsalen, familjens hus)
export const husIText = (h: { namn: string; fn?: string }) => h.fn === 'familjehus' && / hus$/.test(h.namn) && !h.namn.startsWith('Familjens') ? h.namn : h.namn.toLowerCase();
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
  // först). Ett rum rymmer bara så många sovande som det har platser, och ingen delar plats för att rummet är fullt (steg
  // 11.1.66): de som blir utan i familjens hus sover i byns hus om det finns plats där, och annars ute vid elden, som före det
  // första huset (bedTile är undefined). Bara de minsta barnen sover hos sin mor eller far
  const lever = new Set(ppl.map(q => q.id)), agd = new Map<number, number>(), plats = new Map<number, number>();
  for (const t of stationerOf(s)) if (t.ag !== undefined && lever.has(t.ag) && isKlar(t) && stationDef(t.k)?.sover) agd.set(t.y * W + t.x, t.ag);
  // sjukbäddarna (steg 12.4.10): den som är sjuk eller skadad lägger sig hellre i en ledig sjukbädd, i vilket hus den än står
  const sjukbaddar = stationerOf(s).filter(t => isKlar(t) && stationDef(t.k)?.sjuk).map(t => t.y * W + t.x);
  // de med störst behov av att läka får bäddarna först (steg 12.1.235: sjukBehov i mobler.ts), och en liten skada ligger hemma
  const sjuka = sjukbaddar.length ? ppl.filter(q => sjukKrok.vill(s, q)).map(q => ({ q, b: sjukKrok.behov(s, q) })).sort((a, c) => c.b - a.b || a.q.id - c.q.id) : [];
  for (const [n, { q }] of sjuka.entries()) { if (n >= sjukbaddar.length) break; plats.set(q.id, sjukbaddar[n]); }
  const vaggor = stationerOf(s).filter(t => isKlar(t) && stationDef(t.k)?.vagga).map(t => ({ i: t.y * W + t.x, r: roomAt(s, t.x, t.y) })), iVagga = new Set<number>(); // vaggorna (steg 12.4.5)
  const fordela = (tiles: number[], folk: Person[]) => {
    const ids = new Set(folk.map(q => q.id)), fria = tiles.filter(i => !agd.has(i)), rest: Person[] = [], utan: Person[] = [];
    for (const i of tiles) { const o = agd.get(i); if (o !== undefined && ids.has(o) && !plats.has(o)) plats.set(o, i); }
    for (const q of folk) if (!plats.has(q.id)) (ageOf(q, s.now) < ALDER.smabarn ? utan : rest).push(q);
    rest.forEach((q, n) => { if (n < fria.length) plats.set(q.id, fria[n]); });
    for (const q of utan) {
      const f = [q.mother, q.father].map(id => id === undefined ? undefined : plats.get(id)).find(i => i !== undefined);
      if (f === undefined) continue;
      // i en ledig vagga i rummet där föräldern sover, annars hos föräldern (steg 12.4.5)
      const r = roomAt(s, f % W, Math.floor(f / W)), v = r && vaggor.find(x => x.r === r && !iVagga.has(x.i));
      if (v) iVagga.add(v.i);
      plats.set(q.id, v ? v.i : f);
    }
    return folk.filter(q => !plats.has(q.id) && ageOf(q, s.now) >= ALDER.smabarn);
  };
  const overblivna: Person[] = [];
  for (const e of new Set(egna.values())) overblivna.push(...fordela(e.tiles, e.folk));
  fordela(gemensamt, [...ovriga, ...overblivna]);
  b = { key, egna, gemensamt, ovriga, plats };
  boenden.set(s, b);
  return b;
}
// de som bor i varje familjehus (husets id), för borden (bordVal i stationer.ts)
export const husFolk = (s: State) => { const m = new Map<number, Person[]>(); for (const e of boende(s).egna.values()) m.set(e.hus, e.folk); return m; };
// huset där p får sova (steg 3.10.2): familjens eget hus, eller undefined för byns hus där man sover
export const sovHus = (s: State, p: Person) => boende(s).egna.get(p.id)?.hus;
// rutan där p sover, också om den är blöt (bedTile tar en torr), eller undefined
export const sovPlats = (s: State, p: Person) => boende(s).plats.get(p.id);
// golvrutorna i rummet där man kan sova: där ingen station står, och halmbäddarna (rutan uppe till vänster)
// Lagerrutorna är inget golv att sova på (steg 11.1.66)
const lagerRuta = (s: State, i: number) => zoneAt(s, i % W, Math.floor(i / W)) >= 0;
function sovRutor(s: State, r: Rum) {
  const st = stationRutor(s);
  return r.tiles.filter(i => (!st.at.has(i) || st.sov.has(i)) && (st.sov.has(i) || !lagerRuta(s, i)));
}
// tre rutor per person (steg 9.2.36): så många golvrutor ett sovrum för n personer byggs med, och så många personer som får
// plats på ett golv. Golvet räknas utan stationerna, men med halmbäddarna (de är en del av sovplatsen)
export const sovRutorFor = (n: number) => n * HUS.sovPer + HUS.sovFast;
export const sovPersoner = (rutor: number) => rutor <= 0 ? 0 : Math.max(1, Math.floor((rutor - HUS.sovFast) / HUS.sovPer));
function golvRutor(s: State, r: Rum) {
  const st = stationRutor(s);
  return r.tiles.filter(i => { const t = st.at.get(i); return t ? !!stationDef(t.k)?.sover : !lagerRuta(s, i); }).length;
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
// rutan i är en bädd: en sovplats (halmbädden, sängen), vaggan för spädbarnet eller sjukbädden för den sjuke (steg 12.1.256)
export const baddRuta = (s: State, i: number) => { const st = stationRutor(s); return st.sov.has(i) || st.bara.has(i); };
// p sover i en bädd (steg 12.1.256): rutan p sover på är en bädd av något slag
export const soverIBadd = (s: State, p: Person) => { const i = bedTile(s, p); return i !== undefined && baddRuta(s, i); };
export function utanBadd(s: State) {
  const b = boende(s), st = { has: (i: number) => baddRuta(s, i) };
  if (!b.gemensamt.length) { let n = Math.max(0, b.ovriga.length - b.gemensamt.length); for (const e of new Set(b.egna.values())) n += Math.max(0, e.folk.length - e.tiles.filter(i => st.has(i)).length); return n; } // (de som sover ute utan bädd)
  let n = Math.min(b.ovriga.length, b.gemensamt.length) - Math.min(b.ovriga.length, b.gemensamt.filter(i => st.has(i)).length);
  for (const [h, e] of new Map([...b.egna.values()].map(e => [e.tiles, e]))) n += Math.min(e.folk.length, h.length) - Math.min(e.folk.length, h.filter(i => st.has(i)).length);
  return n;
}
// så många som saknar en egen sovplats under tak
export const homeless = (s: State) => { const b = boende(s); return Math.max(0, b.ovriga.length - b.gemensamt.length); };
// byn har inget tak att sova under: inga gemensamma sovplatser
export const utanTak = (s: State) => !boende(s).gemensamt.length;
// den sjuke sover för sig (steg 9.5.5, kunskapen Smittan): i ett färdigt hus där ingen bor, när någon i byn kan Smittan och
// sjukdomen smittar. En ruta per sjuk i huset, ingen frisk sover där (ingen bor där)
function sjukBadd(s: State, p: Person) {
  if (!p.sjuk || p.sjuk.st === undefined || SJUKDOMAR[p.sjuk.k].smitta <= 0 || !living(s).some(q => kn(q, 'smitta') >= 0.5)) return undefined;
  const b = boende(s), bor = new Set([...b.plats.values()]);
  for (const h of housesOf(s)) {
    if (!h.klar || h.ut) continue;
    const rutor = gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles).filter(i => !blot(s, i)); // (ingen sover på en blöt ruta)
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
  const tagna = new Set(b.plats.values()); // en annan ledig ruta, inte någon annans plats (steg 11.1.66)
  return (b.egna.get(p.id)?.tiles ?? b.gemensamt).find(i => !blot(s, i) && !tagna.has(i)); // ingen sover på en blöt ruta: en annan, eller ingen (steg 3.8.7, flod.ts)
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
    h.ag = undefined; husNytt(s, h, 'ag', 'Har nyss blivit byns.'); log(s, `${stor(iMening(h.namn))} har ingen ägare längre och blir byns.`, 'world');
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
    zonesOf(s).push({ x: i % W, y: Math.floor(i / W), w: 1, h: 1, namn: `Hyllan i ${husIMening(h.namn)}`, slag: 'material', prio: 2, hus: h.id });
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
function bytFn(s: State, h: Hus, fn: Fn) {
  const fore = h.namn;
  husNytt(s, h, 'fn', `Var nyss ${fore.toLowerCase()}.`);
  h.fn = fn; h.tom = undefined; h.rumFn = undefined;
  h.namn = nyttNamn(s, h, fn, { v: 0, plats: 0, ag: h.ag });
  touch(s); count(s, 'bytt_' + fn);
  log(s, `${fore} blev ${husIMening(h.namn)}.`, 'world'); kronika(s, `${fore} blev ${husIMening(h.namn)}.`, 'bygge');
  husKlar(s, h);
}
function riv(s: State, h: Hus) {
  const ved = rivHus(s, h, true);
  log(s, `${stor(iMening(h.namn))} behövdes inte längre och revs. ${stor(antal(Math.round(ved), 'ved'))} kom tillbaka till byn.`, 'world'); kronika(s, `${h.namn} revs.`, 'bygge');
}
// vad en tom sovsal blir (steg 10.2.39): det byn behöver mest, med poäng som i BYGGNADER (vikten gånger hur akut det är). En
// station som står där gör den till en verkstad (steg 2.2.17), ett förrådshus när maten ruttnar eller förrådet är fullt, ett
// samlingshus när byn inget har (HUS.tomSamling, eller mer när en scen står utan sal); är inget värt mer än HUS.tomRiv rivs den
function tomBlir(s: State, h: Hus, f: Akut, hs: Hus[]): Fn | 'riv' {
  let b: Fn | 'riv' = 'riv', bv = HUS.tomRiv;
  const prova = (fn: Fn, v: number) => { if (v > bv) { bv = v; b = fn; } };
  if (harArbete(s, h)) prova('verkstad', BYGGNADER.verkstad.vikt);
  if (f.v > 1e-9) prova('forrad', BYGGNADER.forrad.vikt * f.v);
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
    if (b === 'riv') riv(s, h); else bytFn(s, h, b);
    return; // ett hus i taget
  }
}
// är det varmare inne i rummet än vid elden? c = kylan (coldOf): hur kallt det är ute
// Den som ska värma sig (varmer) väger värmen inne mot värmen vid elden, med vägen dit (HUS.vagVarme per ruta, steg 10.2.9): en
// släckt eld värmer inte, vad som än finns att tända den med. f är elden man annars skulle sitta vid (den som brinner, val.ts)
export function varmareInne(s: State, rum: Rum, c: number, varmer = false, p?: { x: number; y: number }, f = eldPlats(s)) {
  const inne = -c * (1 - shelterOf(s, rum, Math.min(living(s).length, rum.tiles.length))), ute = heatAt(s, f.x + 0.5, f.y + HUS.varmeY) * KROPP.eldVarme - c;
  if (varmer) {
    const t = rum.tiles[0], dIn = p && t !== undefined ? Math.hypot(p.x - (t % W + 0.5), p.y - (Math.floor(t / W) + 0.5)) : 0, dUt = p ? Math.hypot(p.x - f.x - 0.5, p.y - f.y - 0.5) : 0;
    return inne - HUS.vagVarme * dIn >= ute - HUS.vagVarme * dUt;
  }
  return inne >= Math.min(0, ute) - HUS.varmeMarg;
}
// fähusens rum som saknar en krubba (steg 10.2.88): där ställs nästa krubba
export const fahusUtanKrubba = (s: State): Rum[] => gridOf(s).rooms.filter(r => { const h = husById(s, r.hus); return !!h?.klar && fnId(h) === 'fahus' && !krubbaKrok.iRum(s, r); });
// stationer.ts sätter kroken (den läses efter den här filen)
export const krubbaKrok = { iRum: (_s: State, _r: Rum) => false };
// långhuset (steg 10.2.68): byns största sovsal (ingen äger den) med minst HUS.langhus sovplatser, där högsätet och bänkarna står
export function langhusRum(s: State): Rum | undefined {
  let best: Rum | undefined, bn = 0;
  for (const r of gridOf(s).rooms) {
    const h = husById(s, r.hus);
    if (!h?.klar || h.ag !== undefined || fnId(h) !== 'sovsal') continue;
    const n = sovplatser(s, r);
    if (n >= HUS.langhus && n > bn) { bn = n; best = r; }
  }
  return best;
}
export const samlingRum = (s: State): Rum | undefined => {
  const ids = new Set(housesOf(s).filter(h => h.klar).map(h => h.id));
  return ids.size ? gridOf(s).rooms.find(r => r.hus !== undefined && ids.has(r.hus) && r.tiles.length && rumFnId(s, r) === 'samling') : undefined;
};

// en färdig station som man arbetar vid står i huset (en verkstad, steg 2.2.17). Vad rummen är visar taggarna (RUMSTYPER i rum.ts)
export const harArbete = (s: State, h: Hus) => stationerOf(s).some(t => isKlar(t) && !!stationDef(t.k)?.gor.length && stationRum(s, t)?.hus === h.id);

// ---------- ett hus blir färdigt ----------
// ett förrådshus: golvet blir en lagerplats under tak, viktigast av alla, så att det som ligger ute bärs in dit
export function husKlar(s: State, h: Hus) {
  if (!fnOf(h).lager || zonesOf(s).some(z => z.hus === h.id)) return;
  zonesOf(s).push({ x: h.x + 1, y: h.y + 1, w: h.w - 2, h: h.h - 2, namn: h.namn, prio: 3, hus: h.id }); // huset tar emot allt, mat och material
  changed(s);
  enPerRuta(s);
  log(s, `${stor(iMening(h.namn))} är färdigt. Där ruttnar och slits maten mindre.`, 'world');
}
// den som vill ligga i en sjukbädd (steg 12.4.10), satt i mobler.ts (som läses efter den här filen)
export const sjukKrok = { vill: (_s: State, _p: Person) => false, behov: (_s: State, _p: Person) => 0 };
