import { Act, Person, State } from './typer';
import { familjOf, stat } from './folk';
import { clamp } from './slump';
import { amountOf } from './lager';
import { TROSKEL, materialBuffert, stationBrist, villAv } from './forradsmal';
import { SAKER } from './saker';
import { PLAGG, PLAGG_LIST } from './klader';
import { ARBETE, grundvarde, varuVarde } from './varde';
import { balans } from './balans';
import { GORS, harAv, makeTask, receptTill, wantsRope, wantsTool } from './redskap';
import { STATIONER, STATION_LIST, StationDef, StationSlag, TILLBEHOR, TILLBEHOR_LIST, TillbehorDef, TillbehorSlag, kanBygga, kanGoraTillbehor, receptStation, receptTillbehor, stationSpot, tillbehorSpot, tillbehorStationer, utanTillbehor } from './stationer';
import { brasaLeta, kanLetaBrasaSten } from './brasor';
import { DORRAR, DORR_LIST, DorrDef, DorrSlag } from './byggnad';
import { dorrOppningar, dorrSpot, kanHangaDorr, receptDorr, utanDorr } from './bygg';
import { GRODOR, ODLING, faltBrist, faltUppgift } from './odling';
import { SKOG, fallTid, fellingTiles, klyvStam, rojSpot, skaRojas, treeSpot } from './skog';
import { freeTools, tingOf } from './agande';
import { ACTS } from './handlingar';
import { tileOf } from './mark';
import { Recept, saknatAv } from './behov';
import { SED } from './seder';
import { bedTile } from './byggnader';
import { stationRutor } from './stationer';

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
export const PROJEKT_TAL = balans('projekt', {
  kniv: 1.2, yxa: 1.2, spjut: 1, metspo: 0.8, korg: 0.8, bensyl: 1, rock: 0.8, skor: 0.5, balte: 0.6, benspade: 0.6, vattensack: 0.5, boll: 0.3, slagtra: 0.3, mal: 0.3, trumma: 0.3, benflojt: 0.3, lyra: 0.3, // hur mycket varje redskap väger när byn saknar alla den vill ha
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
  rep: 0.5, // ... repet när förrådet är tomt
  virke: 0.8, // ... virket när förrådet saknar det byn vill bygga av (steg 4.5.5.2)
  rojning: 1, // ... att fälla träden på en lagerplats eller ett fält i skogen (steg 3.6.9)
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
  egen?(s: State, fam: readonly Person[]): number; // hur mycket p och familjen saknar det (0 till 1, steg 6.1.16)
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
    egen: d.sover ? (s, fam) => utanEgenBadd(s, fam) : undefined, // någon i familjen sover under tak utan en bädd
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
export const PROJEKT: Record<string, ProjektDef> = {
  ...Object.fromEntries(Object.keys(GORS).map(g => [g, redskap(g)])),
  ...Object.fromEntries(STATION_LIST.map(k => [k, station(k)])),
  ...Object.fromEntries(TILLBEHOR_LIST.map(k => [k, tillbehor(k)])),
  ...Object.fromEntries(DORR_LIST.map(k => [k, dorr(k)])),
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
      const k = klyvStam(s);
      if (k) return { act: 'klyva', text: 'Klyver virke ur en fälld stam.', tool: 'yxa', spot: { x: k.x + 0.3, y: k.y + 0.2 }, ref: k.id };
      const t = treeSpot(s, fellingTiles(s, p), p);
      return t && { act: 'falla', text: 'Fäller ett träd till virke.', min: fallTid(s, tileOf(t.x, t.y)) / 60000, tool: 'yxa', spot: t };
    },
  },
  // träden på en lagerplats eller ett fält i skogen fälls först (steg 3.6.9, skog.ts), med en yxa; de blir trä
  rojning: {
    namn: 'Röjning', vikt: PROJEKT_TAL.rojning,
    brist: s => skaRojas(s).length ? 1 : 0,
    kostnad: () => SKOG.fallTim * ARBETE,
    kan: (s, p, f) => !f.kyla && freeTools(s, p, 'yxa') > 0 && !!rojSpot(s, p),
    uppgift: (s, p) => { const t = rojSpot(s, p); return t && { act: 'falla', text: 'Fäller ett träd där byn ska ha lager eller fält.', min: fallTid(s, t.i) / 60000, tool: 'yxa', spot: { x: t.x, y: t.y } }; },
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
// värdet av projektet just nu: vikten gånger bristen, delat med kostnaden
export const projektVarde = (s: State, k: string) => { const d = PROJEKT[k]; return d.vikt * d.brist(s) / Math.max(PROJEKT_TAL.minKostnad, d.kostnad()); };
// hur mycket p bryr sig om det hen och familjen saknar, jämfört med byn (steg 6.1.16): mindre med empati och seden Sammanhållning
export const egenintresse = (s: State, p: Person) => clamp(PROJEKT_TAL.egen - PROJEKT_TAL.egenEmpati * (stat(p, 'empati', s.now) - SED.mitt) / SED.spann - PROJEKT_TAL.egenSed * (s.seder?.v.gemenskap ?? 0), 0, PROJEKT_TAL.egenMax);
// det projektet är värt för den som har familjen fam och egenintresset ei: byns värde och det egna (vad p och familjen saknar) gånger egenintresset
// Byns brist kommer från timräkningen (arbetsTimme i val.ts, steg 6.2.21), så länge den finns
export const bristNu = (s: State, k: string) => s.arbBehov?.brist ? s.arbBehov.brist[k] ?? 0 : PROJEKT[k].brist(s);
export function personVarde(s: State, k: string, fam: readonly Person[], ei: number) {
  const d = PROJEKT[k], e = d.egen && ei > 0 ? d.egen(s, fam) : 0;
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
    const d = PROJEKT[k], v = egen ? (d.egen && ei > 0 ? d.vikt * d.egen(s, fam) * ei / Math.max(PROJEKT_TAL.minKostnad, d.kostnad()) : 0) : personVarde(s, k, fam, ei);
    if (v <= 0 || best && v <= best.varde) continue;
    if (d.kan(s, p, f)) { const u = d.uppgift(s, p); if (u) best = { k, varde: v, u }; continue; }
    const m = egen ? undefined : fattas(s, p, k, f), a = m ? arv(s, p, m, f) : undefined;
    if (a) best = { k, varde: v, ...a };
  }
  return best;
}
