import { Act, Person, State } from './typer';
import { familjOf, stat } from './folk';
import { clamp } from './slump';
import { LAGER, amountOf, lagerFlyttVal } from './lager';
import { TROSKEL, materialBuffert, stationBrist, villAv } from './forradsmal';
import { SAKER } from './saker';
import { PLAGG, PLAGG_LIST } from './klader';
import { ARBETE, grundvarde, varuVarde } from './varde';
import { balans } from './balans';
import { GORS, harAv, makeTask, receptTill, wantsRope, wantsTool } from './redskap';
import { STATIONER, STATION_LIST, StationDef, StationSlag, TILLBEHOR, TILLBEHOR_LIST, TillbehorDef, TillbehorSlag, kanBygga, kanGoraTillbehor, receptStation, receptTillbehor, stationSpot, villKista, tillbehorSpot, tillbehorStationer, utanTillbehor } from './stationer';
import { brasaLeta, kanLetaBrasaSten } from './brasor';
import { DORRAR, DORR_LIST, DorrDef, DorrSlag } from './byggnad';
import { dorrOppningar, dorrSpot, kanHangaDorr, receptDorr, utanDorr } from './bygg';
import { GRODOR, ODLING, faltBrist, faltUppgift } from './odling';
import { SKOG, fallTid, fellingTiles, klyvStam, stockOverHus, egenStock, fallVilja, rojSpot, skaGravas, skaRojas, stubbeSpot, stubbeUppgift, treeSpot } from './skog';
import { fylldSack, freeTools, tingOf } from './agande';
import { ACTS } from './handlingar';
import { tileOf } from './mark';
import { Recept, getable, saknatAv } from './behov';
import { FALLOR, fallorAv, mjardarVill } from './fisk';
import { TILLVERKA, TILLVERKA_LIST } from './tillverka';
import { RECEPT } from './recept';
import { knows } from './teknik';
import { kanGoras, stationDef, stationFor, verktygVid } from './stationer';
import { SED } from './seder';
import { bedTile } from './byggnader';
import { stationRutor } from './stationer';
import { LJUS, UPPSATT, friFackla, friLjus, ljusPlatser, morkStalle } from './ljus';
import { ALDER, ageOf, doingAct } from './folk';
import { SKOGSVARD, kanPlantera, planteraUppgift, skogsvardBrist } from './skogsvard';

// ---------- byns projekt: vad den bygger och gör (steg 2.2.7) ----------
// Allt byn kan bygga eller göra av handarbete är en rad i registret PROJEKT: redskapen (en rad per grupp i GORS,
// redskap.ts), stationerna (en rad per sort i STATIONER, stationer.ts), tillbehören (TILLBEHOR, stationer.ts) och repet. Raden säger
// hur mycket den väger (vikt, i balansblocket nedan), hur mycket byn saknar (brist, 0 till 1), vad den kostar
// (kostnad: arbetstimmar och materialets värde, varde.ts) och om p kan göra den nu (kan). Värdet är vikt × brist / kostnad,
// och listan sorteras på det: det byn saknar mest per arbete och material först. (Fliken Projekt togs bort i steg 2.10.5.)
// Den som har tid för handarbete (craft i val.ts) gör det mest värda hen kan, och på dagen tävlar det mest värda med
// arbetet om maten och veden, när ingen fara (kyla, svält) går före. Husen väljs för sig (BYGGNADER och buildJob i bygg.ts).
// Ett nytt redskap, en ny station eller möbel blir en rad här av sig själv; något annat som byggs blir en egen rad.

// ---------- balanstal (regel 8) ----------
// en fälld stam vars krona ligger över ett färdigt hus huggs före nästa fällning (steg 9.2.86, skog.ts)
// och den som fällt ett träd hugger helst stammen själv innan hen fäller nästa (steg 9.2.87)
const overHusUppgift = (s: State, p?: Person, virke = false): Uppgift | undefined => {
  const o = stockOverHus(s);
  if (o) return { act: 'hugga', text: 'Hugger en fälld stam som ligger över ett hus.', tool: 'yxa', spot: { x: o.x + 0.3, y: o.y + 0.2 }, ref: o.id };
  const e = p && egenStock(s, p);
  if (e) return virke && e.ved >= SKOG.virkeVed
    ? { act: 'klyva', text: 'Klyver virke ur stammen hen fällde.', tool: 'yxa', spot: { x: e.x + 0.3, y: e.y + 0.2 }, ref: e.id }
    : { act: 'hugga', text: 'Hugger stammen hen fällde.', tool: 'yxa', spot: { x: e.x + 0.3, y: e.y + 0.2 }, ref: e.id };
};

export const PROJEKT_TAL = balans('projekt', {
  kniv: 1.2, yxa: 1.2, spjut: 1, metspo: 0.8, korg: 0.8, bensyl: 1, rock: 0.8, skor: 0.5, balte: 0.6, axelrem: 0.4, ryggsack: 0.5, benspade: 0.6, vattensack: 0.5, slanda: 0.5, fackla: 0.4, talgljus: 0.3, boll: 0.3, slagtra: 0.3, mal: 0.3, trumma: 0.3, benflojt: 0.3, lyra: 0.3, // hur mycket varje redskap väger när byn saknar alla den vill ha
  slaktbank: 1, flatarbank: 0.6, scen: 0.3, // ... varje station när byn saknar den
  grill: 0.8, // ... grillställningen (steg 2.8.1)
  tork: 0.6, // ... torkställningen (steg 2.8.2)
  brasa: 1, // ... en brasa när fyra eller fler sover långt från elden (steg 2.9.1, brasor.ts)
  latrin: 0.8, // ... latrinen när byn inte har en som inte är nästan full (steg 2.7.2)
  halmbadd: 0.6, // ... halmbäddarna när alla som sover under tak saknar en
  skinnfall: 0.5, // ... skinnfällarna när alla halmbäddar saknar en
  bord: 0.5, bord2: 0.5, bord3: 0.5, // ... borden när ingen har en plats vid ett bord (steg 2.2.15)
  hylla: 0.4, kista: 0.3, stall: 0.3, // ... förvaringen när golvet i lagren är fullt av högar och redskap (steg 2.3.6)
  kruka: 0.2, bonad: 0.2, vaggbrade: 0.2, // ... pyntet när alla vuxna som sover inne saknar ett (steg 4.3.4, pynt.ts)
  skinndorr: 0.6, // ... skinndörrarna när alla hus där man bor eller umgås har en öppen dörröppning (steg 2.2.16)
  tradorr: 0.6, // ... trädörrarna när alla sådana hus saknar en (steg 3.7.21)
  tillverka: 0.35, // ... det som görs vid stationerna, när byn vill ha mer av det (tillverka.ts)
  stenhuggarplats: 0.4, klyvplats: 0.4, ortkok: 0.3, snickarbank: 0.4, garvning: 0.3, vavstol: 0.3, harden: 0.5, snara: 0.5, grop: 0.4,
  mjarde: 0.7, fangstbank: 0.5, // ... mjärdarna och fångstbänken (steg 7.4.1 och 7.4.2)
  rep: 0.5, // ... repet när förrådet är tomt
  virke: 0.8, // ... virket när förrådet saknar det byn vill bygga av (steg 4.5.5.2)
  stubbe: 1, // ... att gräva bort stubbarna där något ska byggas (steg 6.5.7, skog.ts)
  plantera: 0.6, // ... att flytta plantor när de närmaste träden att fälla står långt bort (steg 6.5.2, skogsvard.ts)
  lagerFlytt: 0.4, // ... att flytta en lagerplats närmare byns mitt (steg 9.4.7, lager.ts)
  rojning: 1, // ... att fälla träden på en lagerplats eller ett fält i skogen (steg 3.6.9)
  ljus: 0.4, // ... att ställa fram ett talgljus på ett bord eller en hylla inne (steg 6.3.8, ljus.ts)
  uppsatt: 0.4, // ... att sätta upp en fackla där folk ofta är vakna i mörker (steg 6.3.7, ljus.ts)
  falt: 1, // ... arbetet på fälten när ett fält har arbete att göra, eller någon som kan odla har frön men inget fält (steg 2.10.3)
  minKostnad: 0.25, // kostnaden räknas aldrig under så här många arbetstimmar
  // jaget och familjen (steg 6.1.16): det egna värdet räknas med egenintresset, som är egen för en vanlig människa i en by
  // utan sed, sjunker med egenEmpati per steg empati över det vanliga och med egenSed när seden är Sammanhållning (stiger när
  // den är Självförsörjning), och ligger mellan 0 och egenMax
  egen: 1, egenEmpati: 0.3, egenSed: 0.5, egenMax: 2,
});

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
  brist(s: State): number; kostnad(): number;
  egen?(s: State, fam: readonly Person[], p?: Person): number; // hur mycket p och familjen saknar det (0 till 1, steg 6.1.16)
  kan(s: State, p: Person, f: ProjektFara): boolean;
  recept?(s: State, p: Person, f: ProjektFara): Recept | undefined; // receptet när bara materialet eller redskapet fattas (steg 6.2.19)
  uppgift(s: State, p: Person): Uppgift | undefined;
}

// ett redskap i gruppen g: bristen är hur stor del av det byn vill ha som saknas
const NAMN: Record<string, string> = { kniv: 'Kniv', yxa: 'Yxa', spjut: 'Spjut', metspo: 'Metspö', korg: 'Korg', ...Object.fromEntries(PLAGG_LIST.map(pl => [pl, PLAGG[pl].namn])) };
const redskap = (g: string): ProjektDef => {
  const k = GORS[g].reduce((a, b) => grundvarde(b) < grundvarde(a) ? b : a); // det billigaste slaget räknas i kostnaden
  return {
    namn: NAMN[g] ?? SAKER[GORS[g][0]]!.namn, vikt: (PROJEKT_TAL as Record<string, number>)[g] ?? 1,
    brist: s => { const v = villAv(s, g); return v > 0 ? clamp((v - harAv(s, g)) / v, 0, 1) : 0; },
    egen: (s, fam) => villAv(s, g) > 0 && !tingOf(s).some(t => t.agare !== undefined && GORS[g].includes(t.k) && fam.some(q => q.id === t.agare)) ? 1 : 0, // ingen i familjen äger ett
    kostnad: () => grundvarde(k),
    kan: (s, p, f) => !f.kyla && wantsTool(s, p, g, f.gras),
    recept: (s, p, f) => f.kyla ? undefined : receptTill(s, p, g),
    uppgift: (s, p) => { const m = makeTask(s, p, g); return { act: m.act, text: m.text, min: m.min, tool: m.tool }; },
  };
};
// en station av sorten k: bristen är 1 så länge byn inte har en färdig. Halmbäddarna (det byn kan ha flera av, steg 2.2.5):
// hur stor del av byn som sover under tak utan en bädd. Borden (steg 2.2.15): hur stor del av byn som saknar en plats vid ett
// bord, för den storlek som ska byggas
const station = (k: StationSlag): ProjektDef => {
  const d: StationDef = STATIONER[k];
  return {
    namn: d.namn, vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 1,
    // någon i familjen sover under tak utan en bädd, eller p vill ha en egen kista (steg 2.10.18): den byggs också som pyssel på fritiden
    egen: d.sover ? (s, fam) => utanEgenBadd(s, fam) : d.forvar?.privat ? (s, _fam, p) => p && villKista(s, p) ? 1 : 0 : undefined,
    brist: s => stationBrist(s, k), // bufferten står i forradsmal.ts (steg 6.2.17)
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && (kanBygga(s, p, k) || !!d.brasa && kanLetaBrasaSten(s, p)), // brasans stenar letas först (brasor.ts)
    recept: (s, p, f) => f.kyla ? undefined : receptStation(s, p, k),
    uppgift: (s, p) => { if (d.brasa && !kanBygga(s, p, k)) return brasaLeta(s, p); const sp = stationSpot(s, k, p); return sp ? { act: 'station', text: d.bygger, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// ett tillbehör av sorten k (steg 2.2.14): bristen är hur stor del av stationerna det hör till som saknar det
const tillbehor = (k: TillbehorSlag): ProjektDef => {
  const d: TillbehorDef = TILLBEHOR[k];
  return {
    namn: d.namn, vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 1,
    brist: s => { const n = tillbehorStationer(s, k).length; return n ? utanTillbehor(s, k).length / n : 0; },
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && kanGoraTillbehor(s, p, k),
    recept: (s, p, f) => f.kyla ? undefined : receptTillbehor(s, p, k),
    uppgift: s => { const sp = tillbehorSpot(s, k); return sp ? { act: 'tillbehor', text: d.gor, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// en dörr av sorten k (steg 2.2.16): bristen är hur stor del av öppningarna i husen där man bor eller umgås som saknar den
const dorr = (k: DorrSlag): ProjektDef => {
  const d: DorrDef = DORRAR[k];
  return {
    namn: d.namn, vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 1,
    brist: s => { const n = dorrOppningar(s).length; return n ? utanDorr(s, k).length / n : 0; },
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && kanHangaDorr(s, p, k),
    recept: (s, p, f) => f.kyla ? undefined : receptDorr(s, p, k),
    uppgift: s => { const sp = dorrSpot(s, k); return sp ? { act: 'dorr', text: d.gor, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// det som görs av material vid en station (TILLVERKA, tillverka.ts): bristen är hur mycket av det byn vill ha som saknas
const tillverk = (k: string): ProjektDef => {
  const d = TILLVERKA[k], har = (s: State, p: Person) => knows(p, d.tek) && kanGoras(s, d.act, p) && (!d.vatten || !!fylldSack(s)) && (!d.verktyg || freeTools(s, p, d.verktyg) > 0 || verktygVid(s, d.act, d.verktyg));
  return {
    namn: SAKER[d.ger]!.namn, vikt: PROJEKT_TAL.tillverka,
    brist: s => clamp(1 - amountOf(s, d.ger) / d.vill, 0, 1),
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p) => har(s, p) && amountOf(s, d.ger) < d.vill && Object.entries(d.av).every(([q, n]) => getable(s, p, q) >= n),
    recept: (s, p) => har(s, p) && amountOf(s, d.ger) < d.vill ? { av: d.av } : undefined,
    // i en station som går fortare (sländan i vävstolen, steg 7.7.9), med redskapet som ligger där
    uppgift: s => { const t = stationFor(s, d.act); return { act: d.act, text: d.text, min: d.min / (t && stationDef(t.k)?.fart?.[d.act] || 1), tool: d.verktyg && !verktygVid(s, d.act, d.verktyg) ? d.verktyg : undefined }; },
  };
};
export const PROJEKT: Record<string, ProjektDef> = {
  ...Object.fromEntries(TILLVERKA_LIST.map(k => [k, tillverk(k)])),
  ...Object.fromEntries(Object.keys(GORS).map(g => [g, redskap(g)])),
  ...Object.fromEntries(STATION_LIST.map(k => [k, station(k)])),
  ...Object.fromEntries(TILLBEHOR_LIST.map(k => [k, tillbehor(k)])),
  ...Object.fromEntries(DORR_LIST.map(k => [k, dorr(k)])),
  // fällorna (steg 7.4.2, 7.5.10 och 7.5.11): görs vid fångstbänken och sätts ut. Byn vill ha några för varje den som fångar
  ...Object.fromEntries(Object.keys(FALLOR).map(k => [k, ((): ProjektDef => {
    const r = RECEPT[k as keyof typeof RECEPT] as { av: Record<string, number>; min: number };
    const kan = (s: State, p: Person) => knows(p, k) && fallorAv(s, k).length < mjardarVill(s) && kanGoras(s, k as Act, p);
    return {
      namn: SAKER[k]!.namn, vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 0.5,
      brist: s => { const v = mjardarVill(s); return v > 0 ? clamp((v - fallorAv(s, k).length) / v, 0, 1) : 0; },
      kostnad: () => varuVarde(r.av, r.min / 60 * ARBETE),
      kan: (s, p) => kan(s, p) && Object.entries(r.av).every(([q, n]) => getable(s, p, q) >= n),
      recept: (s, p) => kan(s, p) ? { av: r.av } : undefined,
      uppgift: () => ({ act: k as Act, text: `${ACTS[k as Act].namn}.`, min: r.min }),
    };
  })()])),
  rep: {
    namn: SAKER.rep!.namn, vikt: PROJEKT_TAL.rep,
    brist: s => clamp(1 - amountOf(s, 'rep') / TROSKEL.repVill, 0, 1),
    kostnad: () => grundvarde('rep'),
    kan: (s, p) => wantsRope(s, p),
    uppgift: () => ({ act: 'tvinna', text: 'Tvinnar rep av hö.' }),
  },
  // virket (steg 4.5.5.2): kluvet ur en fälld stam med yxa, när byn vill bygga en station, möbel eller dörr av virke
  virke: {
    namn: SAKER.virke!.namn, vikt: PROJEKT_TAL.virke,
    brist: s => { const n = materialBuffert(s, 'virke'); return n > 0 ? clamp(1 - amountOf(s, 'virke') / n, 0, 1) : 0; }, // bufferten i FORRADSMAL (steg 6.2.14)
    kostnad: () => grundvarde('virke'),
    kan: (s, p, f) => !f.kyla && freeTools(s, p, 'yxa') > 0 && (!!klyvStam(s) || !!treeSpot(s, fellingTiles(s, p), p)),
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
  // en lagerplats flyttas närmare byns mitt (steg 9.4.7, lager.ts): bristen är det som hämtas där gånger hur mycket närmare den
  // nya platsen ligger, mindre ju fler saker som ska bäras om
  lagerFlytt: {
    namn: 'Flytta en lagerplats', vikt: PROJEKT_TAL.lagerFlytt,
    brist: s => { const v = lagerFlyttVal(s); return v ? Math.min(1, v.vinst / LAGER.flyttFull) * LAGER.flyttMin / (LAGER.flyttMin + v.saker * LAGER.flyttPer) : 0; },
    kostnad: () => LAGER.flyttMin / 60 * ARBETE,
    kan: (s, p, f) => !f.kyla && ageOf(p, s.now) >= ALDER.vuxen && !!lagerFlyttVal(s) && !doingAct(s, 'flyttLager', p),
    uppgift: s => { const v = lagerFlyttVal(s); return v && { act: 'flyttLager', text: 'Märker ut en ny lagerplats närmare byns mitt.', min: LAGER.flyttMin, spot: { x: v.ny.x + v.ny.w / 2, y: v.ny.y + v.ny.h / 2 } }; },
  },
  // träden på en lagerplats eller ett fält i skogen fälls först (steg 3.6.9, skog.ts), med en yxa; de blir trä
  rojning: {
    namn: 'Röjning', vikt: PROJEKT_TAL.rojning,
    brist: s => skaRojas(s).length ? 1 : 0,
    kostnad: () => SKOG.fallTim * ARBETE,
    kan: (s, p, f) => !f.kyla && freeTools(s, p, 'yxa') > 0 && !!rojSpot(s, p),
    uppgift: (s, p) => { const o = overHusUppgift(s, p); if (o) return o; const t = rojSpot(s, p); return t && { act: 'falla', text: 'Fäller ett träd där byn ska ha lager, fält eller ett stråk.', min: fallTid(s, t.i) / 60000, tool: 'yxa', spot: { x: t.x, y: t.y } }; },
  },
  // stubbarna där något ska stå grävs bort först (steg 6.5.7, skog.ts)
  stubbe: {
    namn: 'Gräva bort stubbar', vikt: PROJEKT_TAL.stubbe,
    brist: s => skaGravas(s).length ? 1 : 0,
    kostnad: () => SKOG.stubbeMin / 60 * ARBETE,
    kan: (s, p, f) => !f.kyla && !!stubbeSpot(s, p),
    uppgift: (s, p) => stubbeUppgift(s, p),
  },
  // skogsvården (steg 6.5.2, skogsvard.ts): en planta flyttas dit byn vill ha skog närmare
  plantera: {
    namn: 'Flytta plantor', vikt: PROJEKT_TAL.plantera,
    brist: s => skogsvardBrist(s),
    kostnad: () => SKOGSVARD.gravMin / 60 * ARBETE,
    kan: (s, p, f) => !f.kyla && kanPlantera(s, p),
    uppgift: (s, p) => planteraUppgift(s, p),
  },
  // en uppsatt fackla (steg 6.3.7, ljus.ts): där folk ofta är vakna i mörker, med en av byns facklor
  uppsatt: {
    namn: 'Uppsatt fackla', vikt: PROJEKT_TAL.uppsatt,
    brist: s => morkStalle(s) ? 1 : 0,
    kostnad: () => grundvarde('fackla') + UPPSATT.min / 60 * ARBETE,
    kan: (s, p, f) => !f.kyla && !!friFackla(s) && !!morkStalle(s) && !doingAct(s, 'uppsatt', p),
    uppgift: s => { const m = morkStalle(s); return m && { act: 'uppsatt', text: 'Sätter upp en fackla där byn ofta går i mörkret.', min: UPPSATT.min, spot: { x: m.x + 0.5, y: m.y + 0.5 } }; },
  },
  // ett talgljus på ett bord eller en hylla inne (steg 6.3.8, ljus.ts)
  ljus: {
    namn: 'Talgljus på bordet', vikt: PROJEKT_TAL.ljus,
    brist: s => ljusPlatser(s).length ? 1 : 0,
    kostnad: () => grundvarde('talgljus') + LJUS.min / 60 * ARBETE,
    kan: (s, p, f) => !f.kyla && !!friLjus(s) && ljusPlatser(s).length > 0 && !doingAct(s, 'ljus', p),
    uppgift: s => { const st = ljusPlatser(s)[0]; return st && { act: 'ljus', text: 'Ställer fram ett talgljus inne.', min: LJUS.min, spot: { x: st.x + 0.5, y: st.y + 0.5 }, ref: st.id }; },
  },
  // fälten (steg 2.10.3, odling.ts): nästa steg på det egna fältet, eller att röja ett nytt
  falt: {
    namn: 'Fält', vikt: PROJEKT_TAL.falt,
    brist: s => faltBrist(s),
    kostnad: () => varuVarde({ [GRODOR.rovor.fro]: ODLING.froPerRuta * ODLING.rutorPerMun }, (ODLING.beredaMin + ODLING.saMin) * ODLING.rutorPerMun / 60 * ARBETE), // ett fält för en person
    kan: (s, p, f) => !f.kyla && !!faltUppgift(s, p),
    uppgift: (s, p) => { const u = faltUppgift(s, p); return u && { act: 'odla', text: u.text, min: u.min, tool: u.tool, spot: u.spot, ref: u.ref }; },
  },
};
export const PROJEKT_LIST = Object.keys(PROJEKT);
// rader som läggs till när allt är laddat (hovet och templet, kyrka.ts via steg.ts) kommer med i listan också
export function laggTillProjekt(rader: Record<string, ProjektDef>) { for (const k in rader) { PROJEKT[k] = rader[k]; if (!PROJEKT_LIST.includes(k)) PROJEKT_LIST.push(k); } }
// värdet av projektet just nu: vikten gånger bristen, delat med kostnaden
export const projektVarde = (s: State, k: string) => { const d = PROJEKT[k]; return d.vikt * d.brist(s) / Math.max(PROJEKT_TAL.minKostnad, d.kostnad()); };
// hur mycket p bryr sig om det hen och familjen saknar, jämfört med byn (steg 6.1.16): mindre med empati och seden Sammanhållning
export const egenintresse = (s: State, p: Person) => clamp(PROJEKT_TAL.egen - PROJEKT_TAL.egenEmpati * (stat(p, 'empati', s.now) - SED.mitt) / SED.spann - PROJEKT_TAL.egenSed * (s.seder?.v.gemenskap ?? 0), 0, PROJEKT_TAL.egenMax);
// det projektet är värt för den som har familjen fam och egenintresset ei: byns värde och det egna (vad p och familjen saknar) gånger egenintresset
// Byns brist kommer från timräkningen (arbetsTimme i val.ts, steg 6.2.21), så länge den finns
// byns brist ur timmens räkning (val.ts), men räknas fram igen när något byggts eller satts upp sedan dess (s.byggV), så att ingen börjar ett andra bord samma timme
export const bristNu = (s: State, k: string) => s.arbBehov?.brist && s.arbBehov.bv === (s.byggV ?? 0) ? s.arbBehov.brist[k] ?? 0 : PROJEKT[k].brist(s);
export function personVarde(s: State, k: string, fam: readonly Person[], ei: number, p?: Person) {
  const d = PROJEKT[k], e = d.egen && ei > 0 ? d.egen(s, fam, p) : 0;
  return d.vikt * (bristNu(s, k) + e * ei) / Math.max(PROJEKT_TAL.minKostnad, d.kostnad());
}
// den i familjen som sover under tak utan en bädd
function utanEgenBadd(s: State, fam: readonly Person[]) {
  const sov = stationRutor(s).sov;
  return fam.some(q => { const b = bedTile(s, q); return b !== undefined && !sov.has(b); }) ? 1 : 0;
}
// allt byn saknar något av, det mest värda först (scenariot projekt)
export const projekt = (s: State) => PROJEKT_LIST.map(k => ({ k, d: PROJEKT[k], varde: projektVarde(s, k), brist: PROJEKT[k].brist(s) }))
  .filter(r => r.brist > 0).sort((a, b) => b.varde - a.varde);
// det som fattas till projektet k (steg 6.2.19): redskapet som behövs och inte finns ledigt, annars det första materialet
// som p inte kan få tag på
export function fattas(s: State, p: Person, k: string, f: ProjektFara) {
  const r = PROJEKT[k]?.recept?.(s, p, f);
  if (!r) return undefined;
  if (r.verktyg && !freeTools(s, p, r.verktyg)) return r.verktyg;
  return saknatAv(s, p, r.av, r.spar);
}
// arbetet som hämtar materialet m (skaffa.act i SAKER: hö och flinta samlas, grenar och ved med arbetet ved) och om det letas
// vid stenarna (det sällsynta, flintan). Annat material (skinn, ben) kommer av andra arbeten, och då väntar projektet
export function hamtas(m: string): { act: Act; leta?: true } | undefined {
  const sk = SAKER[m]?.skaffa, a = sk?.act ? ACTS[sk.act as Act]?.arbete : undefined;
  return a ? { act: a as Act, leta: sk!.sallsynt ? true : undefined } : undefined;
}
// det som saknas ärver nivån och värdet (steg 6.2.19): ett redskap eller material som självt är ett projekt (yxan, kniven,
// virket, repet) görs, och saknas något till det i sin tur går man ett steg till; ett material som hämtas blir sak
function arv(s: State, p: Person, m: string, f: ProjektFara, djup = 0): { u?: Uppgift; sak?: string } | undefined {
  if (PROJEKT[m]) {
    const u = projektNu(s, p, m, f);
    if (u) return { u };
    const n = djup < 2 ? fattas(s, p, m, f) : undefined;
    return n ? arv(s, p, n, f, djup + 1) : undefined;
  }
  return hamtas(m) ? { sak: m } : undefined;
}
// det mest värda projekt p kan göra nu, med uppgiften och värdet (lika värde: registrets ordning). Är det mest värda ett som p
// kunde göra om ett material som går att hämta inte fattades, kommer det i stället med materialet (sak) och utan uppgift
// (steg 6.1.17). egen: bara det p och familjen saknar räknas, pyssel för ens egen skull på fritiden (craft i val.ts)
export function bastaProjekt(s: State, p: Person, f: ProjektFara, egen = false) {
  let best: { k: string; varde: number; u?: Uppgift; sak?: string } | undefined;
  const fam = familjOf(s, p.id), ei = egenintresse(s, p); // p, partnern och de ogifta barnen
  for (const k of PROJEKT_LIST) {
    const d = PROJEKT[k], v = egen ? (d.egen && ei > 0 ? d.vikt * d.egen(s, fam, p) * ei / Math.max(PROJEKT_TAL.minKostnad, d.kostnad()) : 0) : personVarde(s, k, fam, ei, p);
    if (v <= 0 || best && v <= best.varde) continue;
    if (d.kan(s, p, f)) {
      const u = d.uppgift(s, p), vf = u?.act === 'falla' ? v * fallVilja(s) : v; // färre fällningar när stammar ligger kvar (steg 9.2.87)
      if (u && !(best && vf <= best.varde)) best = { k, varde: vf, u };
      continue;
    }
    const m = egen ? undefined : fattas(s, p, k, f), a = m ? arv(s, p, m, f) : undefined;
    if (a) best = { k, varde: v, ...a };
  }
  return best;
}
