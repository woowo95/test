import { han } from './ord';
import { ELDARBETEN } from './eldarbeten';
import { eldForst, narmasteEld } from './eld';
import { eldKan } from './stationseld';
import { LERA, leraBrist, leraPlats } from './lera';
import { BYGGSTEN, bergPlats } from './byggsten';
import { Act, Person, State } from './typer';
import { kunnaFart } from './kunna';
import { familjOf } from './folk';
import { omtanke } from './omtanke';
import { clamp } from './slump';
import { amountOf, capacity } from './lager';
import { koKrok, materialBuffert, stationBrist, tillverkVill, villAv, villHaAv } from './forradsmal';
import { SAKER, viktOf } from './saker';
import { KLADER, NAKEN_PLATS, PLAGG, PLAGG_LIST, plaggVarmer } from './klader';
import { coldOf, temperature } from './vader';
import { ARBETE, grundvarde, varuVarde } from './varde';
import { balans } from './balans';
import { DJURARTER, GORS, ersattAv, freeOfKinds, harAv, makeTask, minOf, receptTill, takAv, wantsRope, wantsTool } from './redskap';
import { moblerKrok, STATIONER, STATION_LIST, StationDef, StationSlag, TILLBEHOR, TILLBEHOR_LIST, TillbehorDef, TillbehorSlag, kanBygga, kanGoraTillbehor, receptStation, receptTillbehor, stationSpot, medPlatsMinne, villKista, tillbehorSpot, tillbehorStationer, utanTillbehor } from './stationer';
import { DORRAR, DORR_LIST, DorrDef, DorrSlag } from './byggnad';
import { dorrOppningar, dorrSpot, kanHangaDorr, receptDorr, utanDorr } from './bygg';
import { GRODOR, ODLING, STAKET, faltBrist, faltUppgift } from './odling';
import { hageBrist, hageUppgift } from './hage';
import { VINTER, angBrist, angUppgift } from './slatter';
import { SKOG, fallTid, fellingTiles, klyvStam, stockOverHus, egenStock, fallVilja, rojSpot, rojBrist, slyBrist, slySpot, stubbBrist, stubbeSpot, stubbeUppgift, treeSpot } from './skog';
import { freeTools, harReceptVatten, tingOf } from './agande';
import { ACTS, redskapTal } from './handlingar';
import { tileOf } from './mark';
import { Recept, bynsDel, getable, saknatAv } from './behov';
import { BUDGET, budgetAndel, budgetNu } from './budget';
import { FALLOR, fallPlats, fallorAv, mjardarVill } from './fisk';
import { TILLVERKA, TILLVERKA_LIST, tillverkAv } from './tillverka';
import { RECEPT } from './recept';
import { knows } from './teknik';
import { STATION, redskapVidAct, kanGoras, stationSomFattas, stationDef, stationFlyttVal, stationFor, verktygVid, vidStation } from './stationer';
import { bedTile, soverIBadd } from './byggnader';
import { LJUS, LJUSSORTER, UPPSATT, friFackla, friLjus, ljusPlatser, morkStalle, tommaLampor } from './ljus';
import { ALDER, ageOf, enTill, living } from './folk';
import { SKOGSVARD, kanPlantera, planteraUppgift, skogsvardBrist } from './skogsvard';
import { VATSKOR, ar_vatska, karSomBlirLedig, ledigFor, vatskaAv, type VatskaId } from './vatskor';

// ---------- byns projekt: vad den bygger och gör (steg 2.2.7) ----------
// Allt byn kan bygga eller göra av handarbete är en rad i registret PROJEKT: redskapen (en rad per grupp i GORS,
// redskap.ts), stationerna (en rad per sort i STATIONER, stationer.ts), tillbehören (TILLBEHOR, stationer.ts) och repet. Raden säger
// hur mycket den väger (vikt, i balansblocket nedan), hur mycket byn saknar (brist, 0 till 1), vad den kostar
// (kostnad: arbetstimmar och materialets värde, varde.ts) och om p kan göra den nu (kan). Värdet är vikt × brist / kostnad,
// och listan sorteras på det: det byn saknar mest per arbete och material först. (Fliken Projekt togs bort i steg 2.10.5.)
// Den som har tid för handarbete (craft i val.ts) gör det mest värda hen kan, och på dagen tävlar det mest värda med
// arbetet om maten och veden, när ingen fara (kyla, svält) går före. Husen väljs för sig (BYGGNADER och buildJob i bygg.ts).
// Ett nytt redskap, en ny station eller möbel blir en rad här av sig själv; något annat som byggs blir en egen rad.

// en fälld stam vars krona ligger över ett färdigt hus huggs före nästa fällning (steg 9.2.86, skog.ts)
// och den som fällt ett träd hugger helst stammen själv innan hen fäller nästa (steg 9.2.87)
const overHusUppgift = (s: State, p?: Person, virke = false): Uppgift | undefined => {
  const o = stockOverHus(s);
  if (o) return { act: 'hugga', text: 'Hugger en fälld stam som ligger över ett hus.', tool: 'yxa', spot: { x: o.x + 0.3, y: o.y + 0.2 }, ref: o.id };
  const e = p && egenStock(s, p);
  if (e) return virke && e.ved >= SKOG.virkeVed
    ? { act: 'klyva', text: `Klyver virke ur stammen ${han(p)} fällde.`, tool: 'yxa', spot: { x: e.x + 0.3, y: e.y + 0.2 }, ref: e.id }
    : { act: 'hugga', text: `Hugger stammen ${han(p)} fällde.`, tool: 'yxa', spot: { x: e.x + 0.3, y: e.y + 0.2 }, ref: e.id };
};

export const PROJEKT_TAL = balans('projekt', {
  overBuffert: 0.3, // ett redskap, vapen eller plagg över det byn behöver väger så här mycket när det är långt till taket (steg 10.2.74)
  kyla: 0.3, // när kylan är en fara väger varje projekt så här mycket av sitt värde (steg 10.2.6): tiden går helst till värmen
  kniv: 1.2, yxa: 1.2, spjut: 1, metspo: 0.8, korg: 0.8, bensyl: 1, rock: 1, barnklader: 0.8, skor: 0.7, balte: 0.6, axelrem: 0.4, ryggsack: 0.5, barsele: 0.4, benspade: 0.6, vattensack: 0.5, slanda: 0.5, bagborr: 0.6, kalke: 0.6, slade: 0.6, vagn: 0.6, plog: 0.6, fackla: 0.4, talgljus: 0.3, boll: 0.3, slagtra: 0.3, mal: 0.3, trumma: 0.3, benflojt: 0.3, lyra: 0.3, bok: 0.3, // hur mycket varje redskap väger när byn saknar alla den vill ha
  disk: 0.6, // ... disken när ett företags rum saknar en (steg 14.1.6)
  slaktbank: 1, flatarbank: 0.6, scen: 0.3, // ... varje station när byn saknar den
  grill: 0.8, // ... grillställningen (steg 2.8.1)
  tork: 0.6, // ... torkställningen (steg 2.8.2)
  brasa: 1, // ... en brasa när fyra eller fler sover långt från elden (steg 2.9.1, brasor.ts)
  latrin: 0.4, // ... latrinen när byn inte har en som inte är nästan full (steg 2.7.2; 0,8 före fasens Balans 12.6: den gick före det mesta)
  halmbadd: 1.5, // ... halmbäddarna när alla saknar en, under tak eller ute (steg 10.2.48: sängarna kommer fort)
  skinnfall: 0.5, // ... skinnfällarna när alla halmbäddar saknar en
  ylletacke: 0.5, kudde: 0.3, // ... ylletäckena och kuddarna när alla bäddar saknar en (steg 13.3.1)
  bord: 0.5, bord2: 0.5, bord3: 0.5, // ... borden när ingen har en plats vid ett bord (steg 2.2.15)
  hylla: 0.4, kista: 0.3, stall: 0.3, bokhylla: 0.3, // ... förvaringen när golvet i lagren är fullt av högar och redskap (steg 2.3.6)
  lerkruka: 0.3, naverask: 0.3, nal: 0.4, krycka: 0.6, traben: 0.6, krok: 0.5, ogonlapp: 0.2, matta: 0.2, // ... pyntet när alla vuxna som sover inne saknar ett (steg 4.3.4, pynt.ts)
  skinndorr: 0.6, // ... skinndörrarna när alla hus där man bor eller umgås har en öppen dörröppning (steg 2.2.16)
  tradorr: 0.6, // ... trädörrarna när alla sådana hus saknar en (steg 3.7.21)
  tillverka: 0.35, // ... det som görs vid stationerna, när byn vill ha mer av det (tillverka.ts)
  stenhuggarplats: 0.4, klyvplats: 0.4, ortkok: 0.3, snickarbank: 0.4, garvning: 0.3, vavstol: 0.3, harden: 0.5, snara: 0.5, bur: 0.4, grop: 0.4,
  mjarde: 0.7, fangstbank: 0.5, // ... mjärdarna och fångstbänken (steg 7.4.1 och 7.4.2)
  rep: 0.5, // ... repet när förrådet är tomt
  virke: 0.8, // ... virket när förrådet saknar det byn vill bygga av (steg 4.5.5.2)
  stubbe: 1, // ... att gräva bort stubbarna där något ska byggas (steg 6.5.7, skog.ts)
  plantera: 0.6, // ... att flytta plantor när de närmaste träden att fälla står långt bort (steg 6.5.2, skogsvard.ts)
  byggsten: 0.5, // ... byggstenen när Byggplanen planerat något av sten (steg 10.10.5, byggsten.ts)
  lera: 0.5, // ... leran när förrådet saknar den byn gör av med (steg 9.4.10, lera.ts)
  stationFlytt: 0.4, // ... att flytta en station ute närmare dem som använder den (steg 9.4.8, stationer.ts)
  rojning: 1, // ... att fälla träden på en lagerplats eller ett fält i skogen (steg 3.6.9)
  ljus: 0.4, // ... att ställa fram ett talgljus på ett bord eller en hylla inne (steg 6.3.8, ljus.ts)
  uppsatt: 0.4, // ... att sätta upp en fackla där folk ofta är vakna i mörker (steg 6.3.7, ljus.ts)
  hage: 1, ang: 1, // ... hagen och ängen åt betesdjuren (steg 10.2.36)
  falt: 1, // ... arbetet på fälten när ett fält har arbete att göra, eller någon som kan odla har frön men inget fält (steg 2.10.3)
  minKostnad: 0.25, // kostnaden räknas aldrig under så här många arbetstimmar
});
// vikten för projektet k i PROJEKT_TAL, eller annars om det inte har en egen rad
const viktAv = (k: string, annars: number) => (PROJEKT_TAL as Record<string, number>)[k] ?? annars;
// det ett recept kostar: materialets värde och arbetstiden (varde.ts)
const receptKostnad = (d: { av: Record<string, number>; min: number }) => varuVarde(d.av, d.min / 60 * ARBETE);

// projektet k som uppgift, om p kan göra det nu (steg 6.2.17): ett redskap görs bara så, i arbetet som behöver det
// (withTools i val.ts), på Förbättra eller som pyssel på fritiden. undefined annars
export function projektNu(s: State, p: Person, k: string, f: ProjektFara): Uppgift | undefined {
  const d = PROJEKT[k];
  return d?.kan(s, p, f) ? d.uppgift(s, p) : undefined;
}
// det p gör: handlingen, texten, hur många minuter (annars valets vanliga), slaget (task.tool) och platsen
export interface Uppgift { act: Act; text: string; min?: number; tool?: string; spot?: { x: number; y: number }; sok?: true; ref?: number } // sok: letar vid stenarna, ref: fältet (odling.ts)
// det som gör att något inte görs just nu: kyla = kylan är en fara, gras = hö som sparas till värmen (dangers i val.ts)
export interface ProjektFara { kyla: boolean; gras: number }
export interface ProjektDef {
  namn: string; vikt: number;
  skal?: string; // skälet när namnet är en handling eller inte passar efter "Byn saknar" (steg 12.1.50): "Stubbar står där något ska byggas"
  motKyla?: true; // skyddar mot kylan (plaggen som värmer, steg 10.2.71): väger mer ju kallare det är, och kylan som fara stoppar det inte
  brist(s: State): number; kostnad(s: State): number;
  egen?(s: State, fam: readonly Person[], p?: Person): number; // hur mycket p och familjen saknar det (0 till 1, steg 6.1.16)
  kan(s: State, p: Person, f: ProjektFara): boolean;
  recept?(s: State, p: Person, f: ProjektFara): Recept | undefined; // receptet när bara materialet eller redskapet fattas (steg 6.2.19)
  uppgift(s: State, p: Person): Uppgift | undefined;
  // det som görs vid en station (steg 12.1.212): handlingen som gör det, minuterna för en omgång och hur många omgångar som
  // saknas; slöjdbänkens kö (koKrok.vid) räknar omgångarna gånger minuterna
  ko?: { act: Act; min: number; saknas(s: State): number };
  // arbetet i projektet (steg 13.9.8): handlingen, saken och minuterna. Den skicklige ser mer värde per egen timme (personVarde)
  arbete?: { act: Act; k?: string; min: number };
  paVag?(s: State, p?: Person): number; // den del av bristen (0 till 1) som de andra (inte p) som redan gör det fyller när de är klara (steg 12.1.53): räknas varje gång, inte en gång i timmen som bristen
}

// ett redskap i gruppen g: bristen är hur stor del av det byn vill ha som saknas
const NAMN: Record<string, string> = { kniv: 'Kniv', yxa: 'Yxa', spjut: 'Spjut', metspo: 'Metspö', korg: 'Korg', ...Object.fromEntries(PLAGG_LIST.map(pl => [pl, PLAGG[pl].namn])) };
const redskap = (g: string): ProjektDef => {
  const k = GORS[g].reduce((a, b) => grundvarde(b) < grundvarde(a) ? b : a); // det billigaste slaget räknas i kostnaden
  return {
    // ett plagg som klär en kroppsdel som annars är naken väger också för tanken det tar bort (KLADER.humorVarde, steg 10.2.72)
    namn: NAMN[g] ?? SAKER[GORS[g][0]]!.namn, vikt: ((PROJEKT_TAL as Record<string, number>)[g] ?? 1) * (NAKEN_PLATS[(PLAGG as Record<string, { plats?: string }>)[g]?.plats ?? ''] ? 1 - KLADER.humorVarde * KLADER.nakenDel : 1), ...(plaggVarmer(g) ? { motKyla: true as const } : {}), // de svala plaggen skyddar inte mot kylan (steg 12.1.34)
    // under bufferten: hur stor del som saknas. Över den, upp till taket (steg 10.2.74): ett till är värt mindre ju närmare taket,
    // och det som kan ersättas av ett bättre är också värt något; vägs med poäng mot att fylla förråden
    brist: s => {
      const v = villAv(s, g), har = harAv(s, g);
      if (v <= 0) return 0;
      if (har < v) return clamp((v - har) / v, 0, 1);
      const tak = takAv(s, g); // taket gäller också det som ersätter ett sämre: det sämre finns kvar tills det slits ut
      if (har >= tak) return 0;
      return PROJEKT_TAL.overBuffert * Math.min(1, (tak > v ? (tak - har) / (tak - v) : 0) + ersattAv(s, g) / v);
    },
    ko: { act: g as Act, get min() { return (RECEPT as Record<string, { min?: number } | undefined>)[g]?.min ?? 0; }, saknas: s => Math.max(0, Math.ceil(villAv(s, g) - harAv(s, g) - 1e-9)) },
    egen: (s, fam) => villAv(s, g) > 0 && !tingOf(s).some(t => t.agare !== undefined && GORS[g].includes(t.k) && fam.some(q => q.id === t.agare)) ? 1 : 0, // ingen i familjen äger ett
    kostnad: () => grundvarde(k),
    arbete: { act: g as Act, k, min: minOf(k) },
    kan: (s, p, f) => wantsTool(s, p, g, f.gras),
    recept: (s, p) => receptTill(s, p, g),
    uppgift: (s, p) => { const m = makeTask(s, p, g); return { act: m.act, text: m.text, min: m.min, tool: m.tool }; },
  };
};
// en station av sorten k: bristen är 1 så länge byn inte har en färdig. Halmbäddarna (det byn kan ha flera av, steg 2.2.5):
// hur stor del av byn som sover under tak utan en bädd. Borden (steg 2.2.15): hur stor del av byn som saknar en plats vid ett
// bord, för den storlek som ska byggas
const station = (k: StationSlag): ProjektDef => {
  const d: StationDef = STATIONER[k];
  return {
    namn: d.namn, vikt: viktAv(k, d.smak ? viktAv(d.smak, 1) : 1), // alla mattor väger som en (steg 10.7.6)
    // någon i familjen sover under tak utan en bädd, eller p vill ha en egen kista (steg 2.10.18): den byggs också som pyssel på fritiden
    egen: d.sover && !d.ersatter ? (s, fam) => utanEgenBadd(s, fam) : d.forvar?.privat ? (s, _fam, p) => p && villKista(s, p) ? 1 : 0 : undefined,
    brist: s => stationBrist(s, k), // bufferten står i forradsmal.ts (steg 6.2.17)
    kostnad: () => receptKostnad(d),
    arbete: { act: 'station', k, min: d.min },
    kan: (s, p) => kanBygga(s, p, k),
    recept: (s, p) => receptStation(s, p, k),
    uppgift: (s, p) => { const sp = stationSpot(s, k, p); return sp ? { act: 'station', text: d.bygger, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// ett tillbehör av sorten k (steg 2.2.14): bristen är hur stor del av stationerna det hör till som saknar det
const tillbehor = (k: TillbehorSlag): ProjektDef => {
  const d: TillbehorDef = TILLBEHOR[k];
  return {
    namn: d.namn, vikt: viktAv(k, 1),
    brist: s => { const n = tillbehorStationer(s, k).length; return n ? utanTillbehor(s, k).length / n : 0; },
    kostnad: () => receptKostnad(d),
    kan: (s, p) => kanGoraTillbehor(s, p, k),
    recept: (s, p) => receptTillbehor(s, p, k),
    uppgift: s => { const sp = tillbehorSpot(s, k); return sp ? { act: 'tillbehor', text: d.gor, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// en dörr av sorten k (steg 2.2.16): bristen är hur stor del av öppningarna i husen där man bor eller umgås som saknar den
const dorr = (k: DorrSlag): ProjektDef => {
  const d: DorrDef = DORRAR[k];
  return {
    namn: d.namn, vikt: viktAv(k, 1),
    brist: s => { const n = dorrOppningar(s).length; return n ? utanDorr(s, k).length / n : 0; },
    kostnad: () => receptKostnad(d),
    kan: (s, p) => kanHangaDorr(s, p, k),
    recept: (s, p) => receptDorr(s, p, k),
    uppgift: s => { const sp = dorrSpot(s, k); return sp ? { act: 'dorr', text: d.gor, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// det som görs av material vid en station (TILLVERKA, tillverka.ts): bristen är hur mycket av det byn vill ha som saknas
const tillverk = (k: string): ProjektDef => {
  const d = TILLVERKA[k];
  // tjäran, salvan och limmet räknas i sina behållare och behöver en ledig som passar (steg 9.4.14, vatskor.ts)
  // det som sjuder eller syras i krukorna räknas med (steg 13.6.2)
  const antal = (s: State) => (ar_vatska(d.ger) ? vatskaAv(s, d.ger) : amountOf(s, d.ger)) + (d.sjud || d.syr ? tingOf(s).reduce((n, t) => n + (t.kok?.r === d.ger ? t.kok.n : 0), 0) : 0), kar = (s: State) => !ar_vatska(d.ger) || !!ledigFor(s, d.ger);
  // så många byn vill ha: det som följer förbrukningen (salvan, tjäran, limmet, tvålen; MATERIALMAL, steg 10.2.12) efter den, det andra efter raden
  const vill = (s: State) => tillverkVill(s, d);
  // det som kokas vid en eld när byn inte har stationen: elden ska brinna arbetet och sjudandet ut (ELDARBETEN i eld.ts)
  if (d.eld) ELDARBETEN[d.act] = { eld: (s, p) => stationFor(s, d.act) ? undefined : narmasteEld(s, p), tim: () => (d.min + (d.sjud ?? 0)) / 60 };
  const har = (s: State, p: Person) => knows(p, d.tek) && kanGoras(s, d.act, p) && eldForst(s, p, d.act).ok && eldKan(s, p, stationFor(s, d.act, p)) /* örtkökets eld (steg 10.2.85) */ && (!d.vatten || harReceptVatten(s)) && (!d.vatska || vatskaAv(s, d.vatska.v as VatskaId) >= d.vatska.n) && (!d.kruka || !!karSomBlirLedig(s, d.kruka, d.vatska?.v, d.vatska?.n)) /* mjölken och krukan till osten (steg 12.4.7) */ && (!d.verktyg || freeTools(s, p, d.verktyg) > 0 || verktygVid(s, d.act, d.verktyg));
  return {
    namn: SAKER[d.ger]?.namn ?? (ar_vatska(d.ger) ? VATSKOR[d.ger].namn : d.ger), vikt: PROJEKT_TAL.tillverka, // teet är bara en vätska (steg 9.5.8)
    brist: s => clamp(1 - antal(s) / vill(s), 0, 1),
    arbete: { act: d.act, min: d.min },
    ko: { act: d.act, min: d.min, saknas: s => Math.max(0, Math.ceil((vill(s) - antal(s)) / d.n - 1e-9)) }, // omgångar om n
    kostnad: () => receptKostnad(d),
    kan: (s, p) => { const av = har(s, p) && kar(s) && antal(s) < vill(s) ? tillverkAv(d, q => getable(s, p, q) - utsadeKrok.av(s, q)) : undefined; return !!av && Object.entries(av).every(([q, n]) => getable(s, p, q) - utsadeKrok.av(s, q) >= n); }, // utsädet sparas (steg 9.6.22)
    recept: (s, p) => { const av = har(s, p) && antal(s) < vill(s) ? tillverkAv(d, q => getable(s, p, q)) : undefined; return av ? { av } : undefined; },
    // i en station som går fortare (sländan i vävstolen, steg 7.7.9), med redskapet som ligger där
    uppgift: (s, p) => { const t = stationFor(s, d.act); return { act: d.act, text: d.text, min: d.min / (t && stationDef(t.k)?.fart?.[d.act] || 1) / (redskapVidAct(s, d.act)?.fart ?? 1) /* sågen vid klyvplatsen (steg 12.5.1) */ / kunnaFart(s, p, d.act, d.ger) /* skickligheten (steg 13.9.8) */, tool: d.verktyg && !verktygVid(s, d.act, d.verktyg) ? d.verktyg : undefined }; },
  };
};
export const PROJEKT: Record<string, ProjektDef> = {
  ...Object.fromEntries(TILLVERKA_LIST.map(k => [k, tillverk(k)])),
  ...Object.fromEntries(Object.keys(GORS).map(g => [g, redskap(g)])),
  ...Object.fromEntries(STATION_LIST.filter(k => !(STATIONER[k] as StationDef).vrak).map(k => [k, station(k)])), // ett vrak (grundarnas trasiga vagn) byggs inte, och dess namn är redskapets (vagnen, steg 13.7.3)
  ...Object.fromEntries(TILLBEHOR_LIST.map(k => [k, tillbehor(k)])),
  ...Object.fromEntries(DORR_LIST.map(k => [k, dorr(k)])),
  // fällorna (steg 7.4.2, 7.5.10 och 7.5.11): görs vid fångstbänken och sätts ut. Byn vill ha några för varje den som fångar
  ...Object.fromEntries(Object.keys(FALLOR).map(k => [k, ((): ProjektDef => {
    const r = RECEPT[k as keyof typeof RECEPT] as { av: Record<string, number>; min: number };
    // fångstgropen (steg 10.2.84) grävs med benspaden där viltet går, och den som gräver behöver en plats i skogen
    const grav = FALLOR[k].gravs, kan = (s: State, p: Person) => knows(p, k) && fallorAv(s, k).length < mjardarVill(s) && kanGoras(s, k as Act, p)
      && (!grav || (freeTools(s, p, 'benspade') > 0 && !!fallPlats(s, p, k)));
    return {
      namn: SAKER[k]!.namn, vikt: viktAv(k, 0.5),
      brist: s => { const v = mjardarVill(s); return v > 0 ? clamp((v - fallorAv(s, k).length) / v, 0, 1) : 0; },
      kostnad: () => receptKostnad(r),
      kan: (s, p) => kan(s, p) && Object.entries(r.av).every(([q, n]) => getable(s, p, q) >= n),
      recept: (s, p) => kan(s, p) ? { av: r.av } : undefined,
      uppgift: (s, p) => {
        if (!grav) return { act: k as Act, text: `${ACTS[k as Act].namn}.`, min: r.min };
        const at = fallPlats(s, p, k);
        return at && { act: k as Act, text: `${ACTS[k as Act].namn} i skogen, där viltet går.`, min: r.min, tool: 'benspade', spot: { x: at.x + 0.5, y: at.y + 0.5 } };
      },
    };
  })()])),
  rep: {
    namn: SAKER.rep!.namn, vikt: PROJEKT_TAL.rep,
    brist: s => { const v = villHaAv(s, 'rep'); return v > 0 ? clamp(1 - amountOf(s, 'rep') / v, 0, 1) : 0; }, // det projekten saknar (steg 13.8.4)
    kostnad: () => grundvarde('rep'),
    kan: (s, p) => wantsRope(s, p),
    ko: { act: 'tvinna', min: SAKER.rep!.skaffa!.min!, saknas: s => Math.max(0, Math.ceil(villHaAv(s, 'rep') - amountOf(s, 'rep') - 1e-9)) },
    uppgift: () => ({ act: 'tvinna', text: 'Tvinnar rep av hö.' }),
  },
  // virket (steg 4.5.5.2): kluvet ur en fälld stam med yxa, när byn vill bygga en station, möbel eller dörr av virke
  virke: {
    namn: SAKER.virke!.namn, vikt: PROJEKT_TAL.virke,
    brist: s => { const n = materialBuffert(s, 'virke'); return n > 0 ? clamp(1 - amountOf(s, 'virke') / n, 0, 1) : 0; }, // bufferten i FORRADSMAL (steg 6.2.14)
    // det de som redan klyver bär hem (så mycket var och en orkar lyfta, minst ett), som en del av bufferten (steg 12.1.53)
    paVag: (s, p) => { const n = materialBuffert(s, 'virke'); if (!(n > 0)) return 0; let v = 0; for (const q of living(s)) if (q !== p && q.task?.act === 'klyva') v += Math.max(1, Math.floor(capacity(s, q) / viktOf('virke') + 1e-9)); return v / n; },
    kostnad: () => grundvarde('virke'),
    kan: (s, p) => freeTools(s, p, 'yxa') > 0 && (!!klyvStam(s) || !!treeSpot(s, fellingTiles(s, p), p)),
    // finns ingen fälld stam fälls ett träd först (steg 6.2.19)
    uppgift: (s, p) => {
      const o = overHusUppgift(s, p, true);
      if (o) return o;
      const k = klyvStam(s);
      if (k) return { act: 'klyva', text: 'Klyver virke ur en fälld stam.', tool: 'yxa', spot: { x: k.x + 0.3, y: k.y + 0.2 }, ref: k.id };
      const t = treeSpot(s, fellingTiles(s, p), p);
      return t && { act: 'falla', text: 'Fäller ett träd till virke.', min: fallTid(s, tileOf(t.x, t.y)) / 60000, tool: 'yxa', spot: t };
    },
  },
  // byggstenen (steg 10.10.5, byggsten.ts): bryts vid berget när Byggplanen planerat något av sten; det som ligger i högarna där räknas med
  byggsten: {
    namn: 'Byggsten', vikt: PROJEKT_TAL.byggsten,
    brist: s => { const n = materialBuffert(s, 'byggsten'); return n > 0 ? clamp(1 - (amountOf(s, 'byggsten') + (s.stackar ?? []).filter(q => q.k === 'byggsten').reduce((a, q) => a + q.n, 0)) / n, 0, 1) : 0; },
    kostnad: () => grundvarde('byggsten'),
    kan: (s, p) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'byggsten') && enTill(s, 'bryta', p) && !!bergPlats(s),
    uppgift: (s, p) => { const at = bergPlats(s), h = freeOfKinds(s, p, ['jarnhacka']); return at && { act: 'bryta', text: h ? 'Bryter en byggsten med hackan vid berget.' : 'Bryter en byggsten vid berget.', min: BYGGSTEN.min / redskapTal('bryta', h).fart, tool: h, spot: at }; }, // med järnhackan tre gånger så fort (steg 12.5.4)
  },
  // leran (steg 9.4.10, lera.ts): en tur vid stranden när förrådet saknar den byn gör av med
  lera: {
    namn: 'Lera', vikt: PROJEKT_TAL.lera,
    brist: s => leraBrist(s),
    kostnad: () => grundvarde('lera') * LERA.perTur,
    kan: (s, p) => ageOf(p, s.now) >= ALDER.vuxen && leraBrist(s) > 0 && enTill(s, 'lera', p) && !!leraPlats(s),
    uppgift: (s, p) => { const at = leraPlats(s); return at && { act: 'lera', text: 'Gräver lera vid stranden.', min: LERA.max, tool: freeTools(s, p, 'benspade') > 0 ? 'benspade' : undefined, spot: at }; },
  },
  // en station ute flyttas närmare dem som använder den (steg 9.4.8, stationer.ts)
  stationFlytt: {
    namn: 'Flytta en station', vikt: PROJEKT_TAL.stationFlytt, skal: 'En station står långt från dem som använder den',
    brist: s => { const v = stationFlyttVal(s); return v ? Math.min(1, v.vinst / STATION.flyttFull) : 0; },
    kostnad: () => STATION.flyttMin / 60 * ARBETE,
    kan: (s, p) => ageOf(p, s.now) >= ALDER.vuxen && !!stationFlyttVal(s) && enTill(s, 'flyttStation', p),
    uppgift: s => { const v = stationFlyttVal(s); return v && { act: 'flyttStation', text: `Flyttar ${stationDef(v.t.k)?.namn.toLowerCase() ?? 'en station'} närmare husen och lagren.`, min: STATION.flyttMin, spot: vidStation(v.t) }; },
  },
  // träden på en lagerplats eller ett fält i skogen fälls först (steg 3.6.9, skog.ts), med en yxa; de blir trä
  rojning: {
    namn: 'Röjning', vikt: PROJEKT_TAL.rojning, skal: 'Träd står där byn vill ha en lagerplats eller ett fält',
    brist: s => Math.max(rojBrist(s), slyBrist(s)), // hur stor del som är kvar att röja (steg 12.1.174), också slyet i stråken (steg 13.8.16)
    kostnad: () => SKOG.fallTim * ARBETE,
    kan: (s, p) => freeTools(s, p, 'yxa') > 0 && !!rojSpot(s, p) || ageOf(p, s.now) >= ALDER.hjalper && !!slySpot(s, p),
    uppgift: (s, p) => {
      const o = freeTools(s, p, 'yxa') > 0 ? overHusUppgift(s, p) : undefined; if (o) return o;
      const t = freeTools(s, p, 'yxa') > 0 ? rojSpot(s, p) : undefined;
      if (t) return { act: 'falla', text: 'Fäller ett träd där byn ska ha lager, fält eller ett stråk.', min: fallTid(s, t.i) / 60000, tool: 'yxa', spot: { x: t.x, y: t.y } };
      const b = slySpot(s, p); // slyet i ett stråk röjs med händerna, på lika lång tid som en fältruta (steg 13.8.16)
      return b && { act: 'rojaSly', text: 'Röjer sly som växer i ett gångstråk.', min: ODLING.rojaMin, spot: { x: b.x, y: b.y } };
    },
  },
  // stubbarna där något ska stå grävs bort först (steg 6.5.7, skog.ts)
  stubbe: {
    namn: 'Gräva bort stubbar', vikt: PROJEKT_TAL.stubbe, skal: 'Stubbar står där något ska byggas',
    brist: s => stubbBrist(s), // hur stor del som är kvar att gräva bort (steg 12.1.174)
    kostnad: () => SKOG.stubbeMin / 60 * ARBETE,
    kan: (s, p) => !!stubbeSpot(s, p),
    uppgift: (s, p) => stubbeUppgift(s, p),
  },
  // skogsvården (steg 6.5.2, skogsvard.ts): en planta flyttas dit byn vill ha skog närmare
  plantera: {
    namn: 'Flytta plantor', vikt: PROJEKT_TAL.plantera, skal: 'Byn vill ha skogen närmare',
    brist: s => skogsvardBrist(s),
    kostnad: () => SKOGSVARD.gravMin / 60 * ARBETE,
    kan: (s, p) => kanPlantera(s, p),
    uppgift: (s, p) => planteraUppgift(s, p),
  },
  // en uppsatt fackla (steg 6.3.7, ljus.ts): där folk ofta är vakna i mörker, med en av byns facklor
  uppsatt: {
    namn: 'Uppsatt fackla', vikt: PROJEKT_TAL.uppsatt, skal: 'Det är mörkt där folk är vakna',
    brist: s => morkStalle(s) ? 1 : 0,
    kostnad: () => grundvarde('fackla') + UPPSATT.min / 60 * ARBETE,
    kan: (s, p) => !!friFackla(s) && !!morkStalle(s) && enTill(s, 'uppsatt', p),
    uppgift: s => { const m = morkStalle(s); return m && { act: 'uppsatt', text: 'Sätter upp en fackla där byn ofta går i mörkret.', min: UPPSATT.min, spot: { x: m.x + 0.5, y: m.y + 0.5 } }; },
  },
  // ett talgljus på ett bord eller en hylla inne (steg 6.3.8, ljus.ts)
  ljus: {
    namn: 'Talgljus på bordet', vikt: PROJEKT_TAL.ljus, skal: 'Det är mörkt vid bordet',
    brist: s => ljusPlatser(s).length ? 1 : 0,
    kostnad: () => Math.min(...Object.keys(LJUSSORTER).map(grundvarde)) + LJUS.min / 60 * ARBETE,
    kan: (s, p) => !!friLjus(s) && ljusPlatser(s).length > 0 && enTill(s, 'ljus', p),
    uppgift: s => { const st = ljusPlatser(s)[0]; return st && { act: 'ljus', text: 'Ställer fram ett ljus inne.', min: LJUS.min, spot: { x: st.x + 0.5, y: st.y + 0.5 }, ref: st.id }; },
  },
  // en pall eller stol ställs vid bordet hemma i stället för stubben eller pallen (steg 12.4.4, mobler.ts)
  satta: {
    namn: 'Sittplats vid bordet', vikt: PROJEKT_TAL.ljus,
    brist: s => moblerKrok.sattaPlats(s) ? 1 : 0,
    kostnad: () => grundvarde('pall') + LJUS.fyllMin / 60 * ARBETE,
    kan: (s, p) => !!moblerKrok.sattaPlats(s) && enTill(s, 'satta', p),
    uppgift: s => { const v = moblerKrok.sattaPlats(s); return v && { act: 'satta', text: 'Ställer en sittplats vid bordet.', min: LJUS.fyllMin, spot: { x: v.x + 0.5, y: v.y + 0.5 }, ref: v.t.id }; },
  },
  // kol i fyrfatet när det är kallt och någon sover i rummet (steg 12.4.11, mobler.ts)
  fyrfat: {
    namn: 'Kol i fyrfatet', vikt: PROJEKT_TAL.ljus, skal: 'Det är kallt där någon sover',
    brist: s => moblerKrok.fyrfatKol(s) ? 1 : 0,
    kostnad: () => grundvarde('kol') + LJUS.fyllMin / 60 * ARBETE,
    kan: (s, p) => !!moblerKrok.fyrfatKol(s) && getable(s, p, 'kol') >= 1 && enTill(s, 'fyrfat', p),
    uppgift: s => { const t = moblerKrok.fyrfatKol(s); return t && { act: 'fyrfat', text: 'Lägger glödande kol i fyrfatet.', min: LJUS.fyllMin, spot: vidStation(t), ref: t.id }; },
  },
  // en tom oljelampa på ett bord eller en hylla fylls med brännolja (steg 12.4.2, ljus.ts)
  lampa: {
    namn: 'Olja i lampan', vikt: PROJEKT_TAL.ljus, skal: 'Lampan har ingen olja',
    brist: s => tommaLampor(s).length ? 1 : 0,
    kostnad: () => grundvarde('talg') + LJUS.fyllMin / 60 * ARBETE,
    kan: (s, p) => vatskaAv(s, 'brannolja') >= 1 && tommaLampor(s).length > 0 && enTill(s, 'fyll_lampa', p),
    uppgift: s => { const st = tommaLampor(s)[0]; return st && { act: 'fyll_lampa', text: 'Fyller oljelampan med brännolja.', min: LJUS.fyllMin, spot: { x: st.x + 0.5, y: st.y + 0.5 }, ref: st.id }; },
  },
  // fälten (steg 2.10.3, odling.ts): nästa steg på det egna fältet, eller att röja ett nytt
  falt: {
    namn: 'Fält', vikt: PROJEKT_TAL.falt,
    brist: s => faltBrist(s),
    kostnad: () => varuVarde({ [GRODOR.rovor.fro]: ODLING.froPerRuta * ODLING.rutorPerMun }, (ODLING.beredaMin + ODLING.saMin) * ODLING.rutorPerMun / 60 * ARBETE), // ett fält för en person
    kan: (s, p) => !!faltUppgift(s, p),
    uppgift: (s, p) => { const u = faltUppgift(s, p); return u && { act: 'odla', text: u.text, min: u.min, tool: u.tool, spot: u.spot, ref: u.ref }; },
  },
  // hagen åt betesdjuren (steg 9.8.4 och 10.2.36, hage.ts): staketet runt den, eller att märka ut en ny så stor som djuren behöver
  hage: {
    namn: 'Hage', vikt: PROJEKT_TAL.hage,
    brist: s => hageBrist(s),
    kostnad: () => varuVarde({ grenar: STAKET.grenar * 28 }, 28 * STAKET.min / 60 * ARBETE), // staketet runt en hage för några djur
    kan: (s, p) => !!hageUppgift(s, p),
    uppgift: (s, p) => hageUppgift(s, p),
  },
  // slåtterängen (steg 9.8.9 och 10.2.36, slatter.ts): att märka ut den när ängarna ger för lite hö åt djuren
  ang: {
    namn: 'Slåtteräng', vikt: PROJEKT_TAL.ang,
    brist: s => angBrist(s),
    kostnad: () => VINTER.angMatMin / 60 * ARBETE + VINTER.ho * grundvarde('torrgras'),
    kan: (s, p) => !!angUppgift(s, p),
    uppgift: (s, p) => angUppgift(s, p),
  },
};
export const PROJEKT_LIST = Object.keys(PROJEKT);
// arbetet som väntar vid stationen k (steg 12.1.150, koKrok i forradsmal.ts): för varje sak som görs där, bristen i projektet gånger
// receptets minuter
koKrok.vid = (s, k) => {
  // arbetet som väntar vid stationerna av sorten k (steg 12.1.212): för varje projekt som görs där (handlingen i projektets ko)
  // de omgångar som saknas gånger minuterna, så att tjugo rockar som fattas väger tjugo gånger mer än en
  const gor = STATIONER[k].gor as readonly string[];
  let n = 0;
  for (const g of PROJEKT_LIST) {
    const ko = PROJEKT[g].ko;
    if (!ko || !gor.includes(ko.act) || !(bristNu(s, g) > 0)) continue; // också en brist som inte går att räkna (NaN) hoppas över
    n += ko.saknas(s) * ko.min;
  }
  return n;
};
// det byns projekt saknar (steg 10.5.17), en gång i timmen (TAKTER): per material det projekten behöver (beh: receptets
// material för varje projekt med brist, som någon vuxen kan göra nu, och det byggena i budgetens delar med procent över 0
// saknar), det som saknas av det när det byn har dragits av (n) och den största bristen bland projekten som behöver det (b,
// byggena 1). Byn säljer inte det projekten behöver (bynOver i behov.ts), och det som saknas är värt mer för byn hos handlaren.
// Byggenas del (bud) räknas för sig (steg 13.8.12): det husen saknar hämtas av bygget när det byggs och är ingen buffert i förrådet
export interface ProjektSaknar { beh: number; n: number; b: number; bud?: number }
export function projektSaknarRakna(s: State) {
  const m: Record<string, ProjektSaknar> = {};
  const lagg = (k: string, n: number, b: number, bud = false) => { if (k === 'silver' || n < 1 || !grundvarde(k)) return; const x = m[k] ??= { beh: 0, n: 0, b: 0 }; if (bud) x.bud = (x.bud ?? 0) + n; else x.beh += n; x.b = Math.max(x.b, b); };
  const vuxna = living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vuxen), f = { kyla: false, gras: 0 };
  for (const k of PROJEKT_LIST) {
    const d = PROJEKT[k], b = d.recept ? d.brist(s) : 0;
    if (b <= 0) continue;
    for (const p of vuxna) { const r = d.recept!(s, p, f); if (r) { for (const [q, n] of Object.entries(r.av)) lagg(q, Math.ceil(n - 1e-9), b); break; } }
  }
  for (const del of budgetNu(s)) {
    const B = BUDGET[del.id];
    if (B.mat || budgetAndel(s, del.id) <= 0) continue;
    for (const [q, n] of Object.entries(B.saknar(s))) lagg(q, Math.floor(n + 1e-9), 1, true);
  }
  for (const k in m) m[k].n = Math.max(0, m[k].beh + (m[k].bud ?? 0) - bynsDel(s, k));
  s.projektSaknar = Object.keys(m).length ? m : undefined;
}
// rader som läggs till när allt är laddat (hovet och templet, kyrka.ts via steg.ts) kommer med i listan också
export function laggTillProjekt(rader: Record<string, ProjektDef>) { for (const k in rader) { PROJEKT[k] = rader[k]; if (!PROJEKT_LIST.includes(k)) PROJEKT_LIST.push(k); } }
// värdet av projektet just nu: vikten gånger bristen, delat med kostnaden
// det som skyddar mot kylan väger mer ju kallare det är (steg 10.2.71, KLADER.kylaVikt)
const kylFaktor = (s: State, d: ProjektDef) => d.motKyla ? 1 + KLADER.kylaVikt * coldOf(temperature(s)) : 1;
export const projektVarde = (s: State, k: string) => { const d = PROJEKT[k]; return d.vikt * kylFaktor(s, d) * d.brist(s) / Math.max(PROJEKT_TAL.minKostnad, d.kostnad(s)); };
// det projektet är värt för den som har familjen fam och omtanken om byn om: byns brist gånger omtanken och det egna (vad p och familjen saknar)
// Byns brist kommer från timräkningen (arbetsTimme i val.ts, steg 6.2.21), så länge den finns
// byns brist ur timmens räkning (val.ts), men räknas fram igen en gång när något byggts eller satts upp sedan dess (s.byggV), så
// att ingen börjar ett andra bord samma timme. Den räknas om för alla projekt på en gång och gäller tills nästa bygge eller timme
export const bristAlla = (s: State) => {
  const brist: Record<string, number> = {};
  for (const k of PROJEKT_LIST) { const b = Math.round(PROJEKT[k].brist(s) * 1000) / 1000; if (b > 0) brist[k] = b; } // tre decimaler som i sparfilen
  return brist;
};
export const bristNu = (s: State, k: string) => {
  const a = s.arbBehov;
  if (!a?.brist) return PROJEKT[k].brist(s);
  if (a.bv !== (s.byggV ?? 0)) { a.bv = s.byggV ?? 0; a.brist = bristAlla(s); } // bv först: slöjdbänkens brist frågar efter bristNu under räkningen (koKrok.vid) och får då den förra
  return a.brist[k] ?? 0;
};
export function personVarde(s: State, k: string, fam: readonly Person[], om: number, p?: Person) {
  const d = PROJEKT[k], e = d.egen ? d.egen(s, fam, p) : 0;
  // det de andra redan är på väg att göra räknas med (steg 12.1.53)
  const b = om ? Math.max(0, bristNu(s, k) - (d.paVag?.(s, p) ?? 0)) : 0;
  return d.vikt * kylFaktor(s, d) * (b * om + e) / Math.max(PROJEKT_TAL.minKostnad, kostnadFor(s, d, p));
}
// kostnaden för p (steg 13.9.8): arbetet räknas i p:s egna timmar, så den skicklige ser mer värde per timme i det hen är bra på
function kostnadFor(s: State, d: ProjektDef, p?: Person) {
  const k = d.kostnad(s), a = d.arbete;
  if (!p || !a) return k;
  const f = kunnaFart(s, p, a.act, a.k);
  return k - a.min / 60 * ARBETE * (1 - 1 / f);
}
// den i familjen som sover under tak utan en bädd
function utanEgenBadd(s: State, fam: readonly Person[]) {
  return fam.some(q => bedTile(s, q) !== undefined && !soverIBadd(s, q)) ? 1 : 0; // vaggan och sjukbädden är bäddar (steg 12.1.256)
}
// allt byn saknar något av, det mest värda först (scenariot projekt)
export const projekt = (s: State) => PROJEKT_LIST.map(k => ({ k, d: PROJEKT[k], varde: projektVarde(s, k), brist: PROJEKT[k].brist(s) }))
  .filter(r => r.brist > 0).sort((a, b) => b.varde - a.varde);
// det som fattas till projektet k (steg 6.2.19): redskapet som behövs och inte finns ledigt, annars det första materialet
// som p inte kan få tag på
export function fattas(s: State, p: Person, k: string, f: ProjektFara) {
  // det som bara görs vid en station som byn inte har (plankorna vid klyvplatsen): stationen fattas, och den ärver värdet (steg 12.1.56)
  const tv = TILLVERKA[k], st = tv && knows(p, tv.tek) ? stationSomFattas(s, tv.act) : undefined;
  if (st && PROJEKT[st]) return st;
  const r = PROJEKT[k]?.recept?.(s, p, f);
  if (!r) return undefined;
  if (r.verktyg && !freeTools(s, p, r.verktyg)) return r.verktyg;
  return saknatAv(s, p, r.av, r.spar);
}
// arbetet som hämtar materialet m (skaffa.act i SAKER: hö och flinta samlas, grenar och ved med arbetet ved) och om det letas
// vid stenarna (det sällsynta, flintan). Annat material (skinn, ben) kommer av andra arbeten, och då väntar projektet
// Materialet till kläderna (steg 12.1.20): skinnen som jakten ger (viltet slaktas sedan till skinn) står i KALLA, så att ett plagg
// som väntar på skinn ger jakten värde, som virket till ett hus ger fällningen värde. Skinnet kommer ur det fällda
// djuret (ur) när det slaktas: ligger ett sådant oslaktat och saknar byn stationen där det slaktas, är det stationen som fattas.
// Benet till sylen, nålen, snaran och benspaden kommer ur viltet på samma sätt (steg 12.1.158)
export const KALLA: Record<string, { act: Act; ur: string }> = { skinn: { act: 'jakt', ur: 'vilt' }, vitskinn: { act: 'jakt', ur: 'vilt' }, radjursskinn: { act: 'jakt', ur: 'radjur' }, ben: { act: 'jakt', ur: 'vilt' } }; // benet kommer ur viltet som skinnet (steg 12.1.158)
export function hamtas(m: string): { act: Act; leta?: true } | undefined {
  if (KALLA[m]) return { act: KALLA[m].act };
  const sk = SAKER[m]?.skaffa, a = sk?.act ? ACTS[sk.act as Act]?.arbete : undefined;
  return a ? { act: a as Act, leta: sk!.sallsynt ? true : undefined } : undefined;
}
// det som saknas ärver nivån och värdet (steg 6.2.19): ett redskap eller material som självt är ett projekt (yxan, kniven,
// virket, repet) görs, och saknas något till det i sin tur går man ett steg till; ett material som hämtas blir sak
export function arv(s: State, p: Person, m: string, f: ProjektFara, djup = 0): { u?: Uppgift; sak?: string } | undefined {
  // ett material som görs av ett eget projekt (lädret garvas, lintyget och yllet vävs, tråden spinns, steg 12.1.20) ärver genom det
  if (!PROJEKT[m]) for (const k of TILLVERKA_LIST) if (TILLVERKA[k].ger === m && PROJEKT[k]) { const a = arv(s, p, k, f, djup); if (a) return a; }
  if (PROJEKT[m]) {
    const u = projektNu(s, p, m, f);
    if (u) return { u };
    const n = djup < 2 ? fattas(s, p, m, f) : undefined;
    return n ? arv(s, p, n, f, djup + 1) : undefined;
  }
  const ka = KALLA[m];
  if (ka) { // skinnet är på väg (steg 12.1.123): det fällda djuret som ligger slaktas till skinn, och den som redan jagar efter det bär hem ett
    const ligger = Math.floor(amountOf(s, ka.ur) + 1e-9);
    if (ligger > 0) { // det som behövs för att slakta fattas: stationen eller kniven ärver
      const art = DJURARTER.find(d => d.sak === ka.ur), st = stationSomFattas(s, art?.act ?? 'slakta') ?? (art?.kniv && freeTools(s, p, 'kniv') < 1 ? 'kniv' : undefined);
      if (st) return PROJEKT[st] && djup < 2 ? arv(s, p, st, f, djup + 1) : undefined;
    }
    // det som är på väg räknas i antal, som virket (steg 12.1.220): det som fattas minus ett per jägare som redan är ute och djuret som väntar på slakt
    const ute = living(s).reduce((n, q) => n + (q !== p && q.task?.act === ka.act && q.task.hamtar === m ? 1 : 0), 0);
    if (Math.max(1, s.projektSaknar?.[m]?.n ?? 0) - ute - ligger < 1) return undefined;
  }
  return hamtas(m) ? { sak: m } : undefined;
}
// det mest värda projekt p kan göra nu, med uppgiften och värdet (lika värde: registrets ordning). Är det mest värda ett som p
// kunde göra om ett material som går att hämta inte fattades, kommer det i stället med materialet (sak) och utan uppgift
// (steg 6.1.17). egen: bara det p och familjen saknar räknas, pyssel för ens egen skull på fritiden (craft i val.ts)
export function bastaProjekt(s: State, p: Person, f: ProjektFara, egen = false) {
  let best: { k: string; varde: number; u?: Uppgift; sak?: string } | undefined;
  const fam = familjOf(s, p.id), om = omtanke(s, p); // p, partnern och de ogifta barnen
  for (const k of PROJEKT_LIST) {
    // när kylan är en fara är projekten mindre värda: tiden går helst till värmen (steg 10.2.6, PROJEKT_TAL.kyla), utom det som
    // skyddar mot kylan (steg 10.2.71)
    const d = PROJEKT[k], v = (egen ? (d.egen ? personVarde(s, k, fam, 0, p) : 0) : personVarde(s, k, fam, om, p)) * (f.kyla && !d.motKyla ? PROJEKT_TAL.kyla : 1);
    if (v <= 0 || best && v * Math.max(1, SMIDE.brinner) <= best.varde) continue; // (ässjan kan höja värdet efteråt, smidaFaktor)
    // kan och uppgift frågar ofta om samma plats (stationerna): den söks en gång (medPlatsMinne)
    const u = medPlatsMinne(() => d.kan(s, p, f) ? d.uppgift(s, p) ?? null : undefined);
    if (u !== undefined) {
      const vf = (u?.act === 'falla' ? v * fallVilja(s) : v) * (u ? smidaFaktor(s, u.act) : 1); // färre fällningar när stammar ligger kvar (steg 9.2.87), och mer smide när ässjan brinner (steg 12.2.4)
      if (u && !(best && vf <= best.varde)) best = { k, varde: vf, u };
      continue;
    }
    const m = egen ? undefined : fattas(s, p, k, f), a = m ? arv(s, p, m, f) : undefined;
    if (a) best = { k, varde: v, ...a };
  }
  return best;
}
import { utsadeKrok } from './ratter';
import { SMIDE, smidaFaktor } from './smedja';
