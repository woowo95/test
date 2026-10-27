import { Act, Person, State } from './typer';
import { living } from './folk';
import { clamp } from './slump';
import { amountOf } from './lager';
import { SAKER } from './saker';
import { ARBETE, grundvarde, varuVarde } from './varde';
import { balans } from './balans';
import { GORS, REDSKAP, harAv, makeTask, villAv, wantsRope, wantsTool } from './redskap';
import { STATIONER, STATION_LIST, StationDef, StationSlag, TILLBEHOR, TILLBEHOR_LIST, TillbehorDef, TillbehorSlag, bordBrist, forvarBrist, harStation, kanBygga, kanGoraTillbehor, stationSpot, tillbehorSpot, tillbehorStationer, utanTillbehor } from './stationer';
import { utanBadd } from './byggnader';
import { latrinBrist } from './smuts';
import { brasaBrist, brasaLeta, kanLetaBrasaSten } from './brasor';
import { DORRAR, DORR_LIST, DorrDef, DorrSlag } from './byggnad';
import { dorrOppningar, dorrSpot, kanHangaDorr, utanDorr } from './bygg';
import { ODLING, faltBrist, faltUppgift } from './odling';

// ---------- byns projekt: vad den bygger och gör (steg 2.2.7) ----------
// Allt byn kan bygga eller göra av handarbete är en rad i registret PROJEKT: redskapen (en rad per grupp i GORS,
// redskap.ts), stationerna (en rad per sort i STATIONER, stationer.ts), tillbehören (TILLBEHOR, stationer.ts) och repet. Raden säger vilket behov den fyller
// (behov), hur mycket det väger (vikt, i balansblocket nedan), hur mycket byn saknar (brist, 0 till 1), vad den kostar
// (kostnad: arbetstimmar och materialets värde, varde.ts) och om p kan göra den nu (kan). Värdet är vikt × brist / kostnad,
// och listan sorteras på det: det byn saknar mest per arbete och material först. Den syns i fliken Projekt.
// Den som har tid för handarbete (craft i val.ts) gör det mest värda hen kan, och på dagen tävlar det mest värda med
// arbetet om maten och veden, när ingen fara (kyla, svält) går före. Husen väljs för sig (BYGGNADER och buildJob i bygg.ts).
// Ett nytt redskap, en ny station eller möbel blir en rad här av sig själv; något annat som byggs blir en egen rad.

// ---------- balanstal (regel 8) ----------
export const PROJEKT_TAL = balans('projekt', {
  kniv: 1.2, yxa: 1.2, spjut: 1, metspo: 0.8, korg: 0.8, bensyl: 1, skinnrock: 0.8, skinnskor: 0.5, balte: 0.6, benspade: 0.6, vattensack: 0.5, // hur mycket varje redskap väger när byn saknar alla den vill ha
  slaktbank: 1, flatarbank: 0.6, // ... varje station när byn saknar den
  grill: 0.8, // ... grillställningen (steg 2.8.1)
  tork: 0.6, // ... torkställningen (steg 2.8.2)
  brasa: 1, // ... en brasa när fyra eller fler sover långt från elden (steg 2.9.1, brasor.ts)
  latrin: 0.8, // ... latrinen när byn inte har en som inte är nästan full (steg 2.7.2)
  halmbadd: 0.6, // ... halmbäddarna när alla som sover under tak saknar en
  skinnfall: 0.5, // ... skinnfällarna när alla halmbäddar saknar en
  bord: 0.5, bord2: 0.5, bord3: 0.5, // ... borden när ingen har en plats vid ett bord (steg 2.2.15)
  hylla: 0.4, kista: 0.3, stall: 0.3, // ... förvaringen när golvet i lagren är fullt av högar och redskap (steg 2.3.6)
  skinndorr: 0.6, // ... skinndörrarna när alla hus där man bor eller umgås har en öppen dörröppning (steg 2.2.16)
  rep: 0.5, // ... repet när förrådet är tomt
  falt: 1, // ... arbetet på fälten när ett fält har arbete att göra, eller någon som kan odla har frön men inget fält (steg 2.10.3)
  minKostnad: 0.25, // kostnaden räknas aldrig under så här många arbetstimmar
});

// behoven ett projekt fyller, med symbolen (ikoner.ts) och namnet
export const PROJEKT_BEHOV = {
  mat: { namn: 'Mat', ikon: 'bar' },
  slakt: { namn: 'Mer kött av viltet', ikon: 'kott' },
  tra: { namn: 'Trä', ikon: 'ved' },
  hantverk: { namn: 'Hantverk', ikon: 'a_hantverk' },
  vila: { namn: 'Bättre sömn', ikon: 'halmbadd' },
  varme: { namn: 'Värme i sömnen', ikon: 'skinnfall' },
  maltid: { namn: 'Måltider vid bordet', ikon: 'bord' },
  forvar: { namn: 'Ordning i lagret', ikon: 'hylla' },
  klader: { namn: 'Kläder mot kylan', ikon: 'skinnrock' },
  borda: { namn: 'Bära mer hem', ikon: 'balte' },
  halsa: { namn: 'Renlighet', ikon: 'latrin' }, // steg 2.7.2
  vard: { namn: 'Vatten åt den som inte kan gå', ikon: 'vattensack' }, // steg 2.10.1
  eld: { namn: 'Värme nära sovplatsen', ikon: 'brasa' }, // steg 2.9.1
} as const;
export type ProjektBehov = keyof typeof PROJEKT_BEHOV;

// det p gör: handlingen, texten, hur många minuter (annars valets vanliga), slaget (task.tool) och platsen
export interface Uppgift { act: Act; text: string; min?: number; tool?: string; spot?: { x: number; y: number }; sok?: true; ref?: number } // sok: letar vid stenarna, ref: fältet (odling.ts)
// det som gör att något inte görs just nu: kyla = kylan är en fara, gras = hö som sparas till värmen (dangers i val.ts)
export interface ProjektFara { kyla: boolean; gras: number }
export interface ProjektDef {
  namn: string; ikon: string; behov: ProjektBehov; vikt: number;
  act: Act; slag?: string; // handlingen den görs i, och slaget (task.tool) när flera projekt görs i samma handling
  brist(s: State): number; kostnad(): number;
  kan(s: State, p: Person, f: ProjektFara): boolean;
  uppgift(s: State, p: Person): Uppgift | undefined;
}

// ett redskap i gruppen g: bristen är hur stor del av det byn vill ha som saknas
const VAD: Record<string, ProjektBehov> = { kniv: 'slakt', yxa: 'tra', spjut: 'mat', metspo: 'mat', korg: 'mat', bensyl: 'klader', skinnrock: 'klader', skinnskor: 'klader', balte: 'borda', benspade: 'halsa', vattensack: 'vard' };
const NAMN: Record<string, string> = { kniv: 'Kniv', yxa: 'Yxa', spjut: 'Spjut', metspo: 'Metspö', korg: 'Korg' };
const redskap = (g: string): ProjektDef => {
  const k = GORS[g][GORS[g].length - 1]; // det enklaste slaget räknas i kostnaden
  return {
    namn: NAMN[g] ?? SAKER[GORS[g][0]]!.namn, ikon: GORS[g][0], behov: VAD[g] ?? 'hantverk', vikt: (PROJEKT_TAL as Record<string, number>)[g] ?? 1, act: g as Act,
    brist: s => { const v = villAv(s, g); return v > 0 ? clamp((v - harAv(s, g)) / v, 0, 1) : 0; },
    kostnad: () => grundvarde(k),
    kan: (s, p, f) => !f.kyla && wantsTool(s, p, g, f.gras),
    uppgift: (s, p) => { const m = makeTask(s, p, g); return { act: m.act, text: m.text, min: m.min, tool: m.tool }; },
  };
};
// en station av sorten k: bristen är 1 så länge byn inte har en färdig. Halmbäddarna (det byn kan ha flera av, steg 2.2.5):
// hur stor del av byn som sover under tak utan en bädd. Borden (steg 2.2.15): hur stor del av byn som saknar en plats vid ett
// bord, för den storlek som ska byggas
const station = (k: StationSlag): ProjektDef => {
  const d: StationDef = STATIONER[k];
  return {
    namn: d.namn, ikon: d.ikon, behov: d.brasa ? 'eld' : k === 'slaktbank' ? 'slakt' : d.eld || d.gor.includes('torka') ? 'mat' : d.gor.includes('toa') ? 'halsa' : d.sover ? 'vila' : d.platser ? 'maltid' : d.forvar ? 'forvar' : 'hantverk', vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 1, act: 'station', slag: k,
    brist: s => d.brasa ? brasaBrist(s) : d.sover ? (living(s).length ? utanBadd(s) / living(s).length : 0) : d.platser ? bordBrist(s, k) : d.forvar ? forvarBrist(s, k) : d.gor.includes('toa') ? latrinBrist(s) : harStation(s, k) ? 0 : 1,
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && (kanBygga(s, p, k) || !!d.brasa && kanLetaBrasaSten(s, p)), // brasans stenar letas först (brasor.ts)
    uppgift: (s, p) => { if (d.brasa && !kanBygga(s, p, k)) return brasaLeta(s, p); const sp = stationSpot(s, k); return sp ? { act: 'station', text: d.bygger, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// ett tillbehör av sorten k (steg 2.2.14): bristen är hur stor del av stationerna det hör till som saknar det
const tillbehor = (k: TillbehorSlag): ProjektDef => {
  const d: TillbehorDef = TILLBEHOR[k];
  return {
    namn: d.namn, ikon: d.ikon, behov: d.varme ? 'varme' : 'hantverk', vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 1, act: 'tillbehor', slag: k,
    brist: s => { const n = tillbehorStationer(s, k).length; return n ? utanTillbehor(s, k).length / n : 0; },
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && kanGoraTillbehor(s, p, k),
    uppgift: s => { const sp = tillbehorSpot(s, k); return sp ? { act: 'tillbehor', text: d.gor, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
// en dörr av sorten k (steg 2.2.16): bristen är hur stor del av öppningarna i husen där man bor eller umgås som saknar den
const dorr = (k: DorrSlag): ProjektDef => {
  const d: DorrDef = DORRAR[k];
  return {
    namn: d.namn, ikon: d.ikon, behov: 'varme', vikt: (PROJEKT_TAL as Record<string, number>)[k] ?? 1, act: 'dorr', slag: k,
    brist: s => { const n = dorrOppningar(s).length; return n ? utanDorr(s, k).length / n : 0; },
    kostnad: () => varuVarde(d.av, d.min / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && kanHangaDorr(s, p, k),
    uppgift: s => { const sp = dorrSpot(s, k); return sp ? { act: 'dorr', text: d.gor, min: d.min, tool: k, spot: sp } : undefined; },
  };
};
export const PROJEKT: Record<string, ProjektDef> = {
  ...Object.fromEntries(Object.keys(GORS).map(g => [g, redskap(g)])),
  ...Object.fromEntries(STATION_LIST.map(k => [k, station(k)])),
  ...Object.fromEntries(TILLBEHOR_LIST.map(k => [k, tillbehor(k)])),
  ...Object.fromEntries(DORR_LIST.map(k => [k, dorr(k)])),
  rep: {
    namn: SAKER.rep!.namn, ikon: 'rep', behov: 'hantverk', vikt: PROJEKT_TAL.rep, act: 'tvinna',
    brist: s => clamp(1 - amountOf(s, 'rep') / REDSKAP.repVill, 0, 1),
    kostnad: () => grundvarde('rep'),
    kan: (s, p) => wantsRope(s, p),
    uppgift: () => ({ act: 'tvinna', text: 'Tvinnar rep av hö.' }),
  },
  // fälten (steg 2.10.3, odling.ts): nästa steg på det egna fältet, eller att röja ett nytt
  falt: {
    namn: 'Fält', ikon: 'odling', behov: 'mat', vikt: PROJEKT_TAL.falt, act: 'odla',
    brist: s => faltBrist(s),
    kostnad: () => varuVarde({ fron: ODLING.froPerRuta * ODLING.faltW * ODLING.faltH }, (ODLING.beredaMin + ODLING.saMin) * ODLING.faltW * ODLING.faltH / 60 * ARBETE),
    kan: (s, p, f) => !f.kyla && !!faltUppgift(s, p),
    uppgift: (s, p) => { const u = faltUppgift(s, p); return u && { act: 'odla', text: u.text, min: u.min, tool: u.tool, spot: u.spot, ref: u.ref }; },
  },
};
export const PROJEKT_LIST = Object.keys(PROJEKT);

// värdet av projektet just nu: vikten gånger bristen, delat med kostnaden
export const projektVarde = (s: State, k: string) => { const d = PROJEKT[k]; return d.vikt * d.brist(s) / Math.max(PROJEKT_TAL.minKostnad, d.kostnad()); };
// de som arbetar med projektet k nu
export const gorProjekt = (s: State, k: string) => { const d = PROJEKT[k]; return living(s).filter(p => p.task?.act === d.act && (!d.slag || p.task.tool === d.slag)); };
// listan som fliken visar: allt byn saknar något av, det mest värda först, hur många som kan göra det nu och vilka som gör det
export function projekt(s: State, f: ProjektFara) {
  const ppl = living(s);
  return PROJEKT_LIST.map(k => ({ k, d: PROJEKT[k], varde: projektVarde(s, k), brist: PROJEKT[k].brist(s), kan: ppl.filter(p => PROJEKT[k].kan(s, p, f)).length, gor: gorProjekt(s, k) }))
    .filter(r => r.brist > 0).sort((a, b) => b.varde - a.varde);
}
// det mest värda projekt p kan göra nu, med uppgiften och värdet (lika värde: registrets ordning)
export function bastaProjekt(s: State, p: Person, f: ProjektFara) {
  let best: { k: string; varde: number; u: Uppgift } | undefined;
  for (const k of PROJEKT_LIST) {
    const v = projektVarde(s, k);
    if (v <= 0 || best && v <= best.varde || !PROJEKT[k].kan(s, p, f)) continue;
    const u = PROJEKT[k].uppgift(s, p);
    if (u) best = { k, varde: v, u };
  }
  return best;
}
