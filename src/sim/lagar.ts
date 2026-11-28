// Lagarna (system 8.4). En lag är en rad i registret LAGAR: vad den gäller, vilket straff den har från början och hur den väcks av det
// som hänt. Att stifta, ändra och ta bort en lag är frågor i röstsystemet (FRAGOR i rost.ts). Vad som tas upp en kväll väljs ur registret
// TAS_UPP, efter prioritet (steg 8.4.5). En lag läser spelet med `lagGaller`; ett brott i `doma` (styre.ts) får straffet i lagen.
import { HOUR, Person, State } from './typer';
import { byId } from './folk';
import { notis } from './notiser';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, ageOf, count, living, log, relKey } from './folk';
import { kronika } from './historik';
import { FRAGOR, ROST, Fraga, framFor, rostaOm, vikter } from './rost';
import { PABUD, PABUD_FRAGOR, pabudFran, pabudOm, STRAFF_NAMN, ledarHard, legitimitet, ledareOf, styreAv } from './styre';
import { fangelseLedigt } from './fangelse';
import { knows } from './teknik';
import type { HandelseTyp } from './rykten';
import { amountOf, iHelaForradet, ownedStock } from './lager';
import { FOOD } from './saker';
import type { SkriftLag } from './skrift';

export const LAG = balans('lag', {
  skog: 8, // förbudet att fälla nära byn: inom så många rutor från byns område
  fullt: 0.5, // ett nytt lagförslag väger så här mycket när byn har så många lagar den klarar
  naraTak: 0.3, bortVikt: 0.4, // förslaget att ta bort en lag: ogillandet gånger bortVikt, plus naraTak när byn nästan har så många den klarar
  tak: 6, // så många lagar klarar byn utan skrift (steg 8.4.3) ...
  takMinister: 1, // ... och så många fler per minister
  takVisas: 12, // fliken Styre visar högst så många, och taket blir aldrig högre (steg 10.6.10)
  takSkrift: 1, // varje gällande lag som står skriven med samma straff och tal som nu höjer taket så här mycket (steg 10.6.10)
  overTak: 0.15, // över taket efterlevs alla lagar så här mycket sämre per lag
  envalde: 0.5, // över den här Envälde-seden får bara ledaren lägga fram (steg 8.4.4)
  allmoge: -0.1, // under den här får vem som helst med inflytande över inflytande
  inflytande: 1, // den gränsen
  troskel: 0.25, // inget tas upp under den här prioriteten (steg 8.4.5)
  nedrostat: 3, // det som röstats ned tas inte upp igen på så här många dygn (år i spelet)
  dagsverke: 1.5, // så många gånger fler bygger med en lag om dagsverken
  plikt: 0.2, // arbetsplikten höjer viljan att arbeta för byn så här mycket
  bas: 0.25, viktSamlad: 0.4, viktLeg: 0.5, // hur konsekvent lagarna efterlevs (steg 8.4.9): grunden, hur samlad vikten är och legitimiteten
  stegHardare: 0.5, // Envälde och Fejd över det här gör straffet ett steg hårdare när lagen stiftas
  straffHard: 0.4, // ledaren vill ha ett steg hårdare eller mildare straff i en lag för varje så här mycket hårdheten skiljer sig från lagom (steg 11.12.3)
  rikEmot: 0.4, rikAndel: 1.5, // den som äger mer än rikAndel gånger sin del av byns mat röstar så här mycket emot att förrådet delas lika
});
export const LAG_SKOG = LAG.skog;

const STEGEN = [0, 1, 4, 5, 2, 7, 8, 9, 3, 6]; // ordningen från mildast till hårdast (Fängelse 9 före Utvisning, steg 11.12.3)
// ett straff som kräver något finns bara när kravet är uppfyllt (Straff som kräver något): Fängelse kräver ett fängelse med ledig plats
export const straffKan = (s: State, k: number) => k !== 9 || !!fangelseLedigt(s);
// straffet som går att verkställa nu: lagens, eller det närmaste mildare som går
export function straffNu(s: State, k: number) {
  for (let i = STEGEN.indexOf(k); i >= 0; i--) if (straffKan(s, STEGEN[i])) return STEGEN[i];
  return 0;
}
// d steg hårdare (eller mildare) än k i STEGEN, förbi de straff som inte går nu
export function straffSteg(s: State, k: number, d: number) {
  let i = STEGEN.indexOf(k);
  for (let n = Math.abs(d); n > 0;) { const j = i + Math.sign(d); if (j < 0 || j >= STEGEN.length) break; i = j; if (straffKan(s, STEGEN[i])) n--; }
  while (!straffKan(s, STEGEN[i]) && i > 0) i--;
  return STEGEN[i];
}

// lagarna: en rad per lag. prio = hur väl det som hänt väcker den (0–1). rost = åsikten och intresset, −1 till 1. brott = händelserna som bryter
// mot den. kan = systemet den kräver finns
export interface LagDef { namn: string; sym: string; text: string; straff: number; brott?: HandelseTyp[]; hardare?: Partial<Record<HandelseTyp, number>>; prio(s: State): number; rost(s: State, p: Person): { v: number; why: string }; kan?(s: State): boolean; tek?: string; om?: string; tal?: Record<string, LagTalDef> }
// ett tal i en lag (steg 10.5.4): stegen av tillåtna värden, värdet från början och det var och en vill ha. 0 i stegen kan betyda
// ingen, och ingen är då värt `ingen` (0 för en undre gräns, Infinity för en övre)
export interface LagTalDef { namn: string; ord: string; sym: string; // ord = ordet före talet i gränssnittet ("skatt 10 %", "från 12 år", steg 11.1.26)
  stege: number[]; start: number; ingen?: number; vill(s: State, p: Person): number; visa(v: number): string }
const talEff = (d: LagTalDef, v: number) => v === 0 && d.ingen !== undefined ? d.ingen : v;
// platsen i stegen som ligger närmast värdet x
export function talPlats(d: LagTalDef, x: number) {
  let b = 0, bd = Infinity;
  d.stege.forEach((v, i) => { const e = talEff(d, v), dd = e === x ? 0 : Math.abs(e - x); if (dd < bd) { bd = dd; b = i; } });
  return b;
}
// talet k i lagen id som det gäller nu
export const lagTal = (s: State, id: string, k: string) => { const d = LAGAR[id].tal![k]; return talEff(d, s.styre?.lagar?.find(l => l.id === id)?.tal?.[k] ?? d.start); };
const lagTalRa = (s: State, id: string, k: string) => s.styre?.lagar?.find(l => l.id === id)?.tal?.[k] ?? LAGAR[id].tal![k].start;
const dev = (v: number) => (v - 10) / 10;
const antal = (s: State, k: string) => s.stat?.[k] ?? 0;
// äger p mycket mer mat än sin del av byns (lagen om att förrådet delas lika)
function rikPaMat(s: State, p: Person) { return iHelaForradet(() => rikPaMatHela(s, p)); } // hela förrådet, också inom räckhåll
function rikPaMatHela(s: State, p: Person) {
  const egen = ownedStock(s, p), n = Math.max(1, living(s).length);
  let m = 0, alla = 0;
  for (const k of FOOD) { m += egen[k] ?? 0; alla += amountOf(s, k); }
  return m > 0 && m * n > alla * LAG.rikAndel;
}
export const LAGAR: Record<string, LagDef> = {
  stoldforbud: { namn: 'Förbud mot stöld', sym: '🖐️', text: 'Den som stjäl straffas', straff: 4, brott: ['stold', 'stoldLindrig', 'gravstold'], hardare: { gravstold: 1 }, om: 'stölderna', prio: s => clamp(antal(s, 'rykte_stold') / 4, 0, 1), rost: (_s, p) => ({ v: 0.3 + dev(p.pot.empati) * 0.5, why: 'Vill inte bli bestulen' }) },
  boskapsforbud: { namn: 'Förbud mot boskapsstöld', sym: '🐾', text: 'Den som tar någon annans djur straffas', straff: 4, brott: ['boskapsstold'], om: 'boskapsstölderna', kan: s => (s.tamdjur ?? []).some(d => d.art !== 'hund'), prio: s => clamp((antal(s, 'rykte_boskapsstold') + antal(s, 'boskapStulen')) / 3, 0, 1), rost: (s, p) => ({ v: (s.tamdjur ?? []).some(d => d.agare === p.id) ? 0.8 : 0.2 + dev(p.pot.empati) * 0.4, why: (s.tamdjur ?? []).some(d => d.agare === p.id) ? 'Äger djur själv' : 'Vill inte bli bestulen' }) }, // steg 9.8.12
  slagsmalforbud: { namn: 'Förbud mot slagsmål', sym: '🥊', text: 'Den som slår någon straffas', straff: 1, brott: ['sla', 'misshandel'], om: 'slagsmålen', prio: s => clamp(antal(s, 'rykte_sla') / 8, 0, 1), rost: (_s, p) => ({ v: dev(p.pot.empati) - dev(p.pot.aggression), why: dev(p.pot.aggression) > 0 ? 'Vill kunna göra upp själv' : 'Vill ha lugn i byn' }) },
  drapforbud: { namn: 'Förbud mot dråp', sym: '⚔️', text: 'Den som dödar någon straffas hårt', straff: 3, brott: ['drap'], om: 'ett dråp', prio: s => clamp(antal(s, 'rykte_drap') / 1, 0, 1), rost: (_s, p) => ({ v: 0.4 + dev(p.pot.empati) * 0.5 - dev(p.pot.aggression) * 0.3, why: 'Vill inte bli dräpt' }) },
  arbetsplikt: { namn: 'Arbetsplikt', sym: '📜', text: 'Den som kan arbeta ska arbeta', straff: 0, om: 'en vinter med svält', prio: s => clamp(antal(s, 'dog av svält') / 2, 0, 1), rost: (_s, p) => ({ v: dev(p.pot.flit), why: dev(p.pot.flit) > 0 ? 'Arbetar ändå' : 'Vill bestämma sin tid själv' }) },
  matdelning: { namn: 'Förrådet delas lika', sym: '📜', text: 'Det man skaffar går till byn', straff: 1, om: 'en vinter med svält', prio: s => clamp(antal(s, 'dog av svält') / 3, 0, 1) * (1 + (s.seder.v.gemenskap ?? 0)) / 2, rost: (s, p) => { const rik = rikPaMat(s, p); return { v: dev(p.pot.empati) * 0.5 + (s.seder.v.gemenskap ?? 0) * 0.5 - (rik ? LAG.rikEmot : 0), why: rik ? 'Vill behålla det hen skaffat' : 'Vill att alla får äta' }; } },
  skogsfred: { namn: 'Inte fälla träd nära byn', sym: '🌲', text: `Ingen fäller träd inom ${LAG_SKOG} rutor från byn`, straff: 0, om: 'att skogen tog slut nära byn', prio: s => clamp((s.fallda ?? 0) / 120, 0, 1) * clamp(1 - (s.seder.v.natur ?? 0), 0, 1), rost: (s, p) => ({ v: -(s.seder.v.natur ?? 0) * 0.5 + (p.tag === 'Trähuggare' ? -0.5 : 0.05), why: p.tag === 'Trähuggare' ? 'Hugger trä och vill ha det nära' : 'Vill ha skogen kvar' }) },
  // skatt före silvret (steg 8.4.17); en skatt på rikedomen (steg 10.5.3, skatt.ts)
  skatt: { namn: 'Skatt', sym: '📜', text: 'Varje vuxen betalar varje år en del av det hen äger till byns förråd', straff: 4, om: 'att förrådet var tomt', prio: s => clamp(living(s).length / 30, 0, 1) * clamp(1 - (s.delning?.andel ?? 1) * 2, 0, 1), rost: (s, p) => ({ v: (s.seder.v.gemenskap ?? 0) * 0.5 + dev(p.pot.empati) * 0.5 - 0.1, why: 'Tycker att alla ska bidra' }) },
  dagsverke: { namn: 'Dagsverken på byns byggen', sym: '📜', text: 'De vuxna hjälper till på byns byggen', straff: 0, om: 'att byggena stod stilla', prio: s => clamp((s.byggen?.filter(b => b.b < 1).length ?? 0) / 60, 0, 1), rost: (s, p) => ({ v: dev(p.pot.flit) * 0.5 + (s.seder.v.arbete ?? 0) * 0.5, why: 'Vill ha husen klara' }) },
  stridsplikt: { namn: 'Stridsplikt', sym: '⚔️', text: 'De vuxna ska gå när byn anfalls', straff: 1, om: 'att byn anfölls', prio: s => clamp((s.stat?.rovarflockar ?? 0) / 3, 0, 1) * clamp((s.seder.v.fejd ?? 0) + (s.seder.v.krig ?? 0) + 0.3, 0, 1), rost: (_s, p) => ({ v: dev(p.pot.mod), why: dev(p.pot.mod) > 0 ? 'Vill försvara byn' : 'Vill inte tvingas i strid' }) }, // steg 8.7.9
  // lagar om rösten (steg 8.4.6)
  rostKvinnor: { namn: 'Kvinnorna röstar inte', sym: '📜', text: 'Bara männen får rösta', straff: 0, om: 'ledarens vilja', prio: s => clamp((s.seder.v.rang ?? 0) - 0.6, 0, 1) * 0.6, rost: (_s, p) => ({ v: p.sex === 'k' ? -1 : dev(p.pot.mod) * 0.5 - dev(p.pot.empati) * 0.5, why: p.sex === 'k' ? 'Vill ha kvar sin röst' : 'Tycker att männen ska bestämma' }) },
  rostEgendom: { namn: 'Bara de med egendom röstar', sym: '💰', text: 'Den som inget äger får inte rösta', straff: 0, om: 'ledarens vilja', prio: s => clamp((s.seder.v.rang ?? 0) - 0.4, 0, 1) * 0.5 * clamp(-(s.seder.v.gemenskap ?? 0), 0, 1), rost: (s, p) => ({ v: agerNagot(s, p) ? 0.2 : -1, why: agerNagot(s, p) ? 'Äger något' : 'Äger inget' }) },
  rostStraffade: { namn: 'De straffade röstar inte', sym: '📜', text: 'Den som straffats hårt förlorar rösten', straff: 0, om: 'brotten i byn', prio: s => clamp(antal(s, 'straff') / 12, 0, 1) * 0.6, rost: (_s, p) => ({ v: 0.2 - (p.straffad ? 1 : 0), why: p.straffad ? 'Har själv straffats' : 'Vill inte att brottslingar bestämmer' }) },
  ledarBunden: { namn: 'Ledaren väger inte mer än hälften', sym: '⚖️', text: 'Ledarens vikt är begränsad', straff: 0, om: 'missnöjet med ledaren', prio: s => clamp(living(s).reduce((a, p) => a + (p.missnoje ?? 0), 0) / Math.max(1, living(s).length) * 2, 0, 1) * clamp(s.seder.v.rang ?? 0, 0, 1), rost: (s, p) => ({ v: p.id === s.styre?.ledare ? -1 : 0.3, why: p.id === s.styre?.ledare ? 'Vill behålla sin makt' : 'Vill ha en röst som räknas' }) },
};
const agerNagot = (s: State, p: Person) => (s.ting ?? []).some(t => t.agare === p.id);

export interface Lag { id: string; t: number; straff: number; av: number; om: string; tal?: Record<string, number> } // tal = lagens tal som ändrats (steg 10.5.4)
export const lagarNu = (s: State): Lag[] => s.styre?.lagar ?? [];
export const lagGaller = (s: State, id: string) => !!s.styre?.lagar?.some(l => l.id === id);
// står lagen skriven (steg 10.6.10): på en sten, ett blad eller i en bok, med samma straff och tal som nu
const sammaTal = (a?: Record<string, number>, b?: Record<string, number>) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
const passar = (k: SkriftLag | undefined, l: Lag) => !!k && k.id === l.id && k.straff === l.straff && sammaTal(k.tal, l.tal);
// var lagen står skriven: på en sten, på ett blad, i en bok (fliken Styre)
export const skrivenVar = (s: State, l: Lag) => [...(s.runstenar?.some(r => passar(r.lag, l)) ? ['på en sten'] : []), ...(s.ting?.some(t => passar(t.skrift?.lag, l)) ? ['på ett blad'] : []), ...(s.ting?.some(t => !!t.delar?.some(k => passar(k.lag, l))) ? ['i en bok'] : [])];
export const skrivenLag = (s: State, l: Lag) => skrivenVar(s, l).length > 0;
// taket (steg 8.4.3): minnet, ministrarna och de skrivna lagarna (steg 10.6.10), aldrig över takVisas
export const lagTakDelar = (s: State) => ({ minne: LAG.tak, ministrar: LAG.takMinister * Object.keys(s.styre?.ministrar ?? {}).length, skrivna: LAG.takSkrift * lagarNu(s).filter(l => skrivenLag(s, l)).length });
export const lagTak = (s: State) => { const d = lagTakDelar(s); return Math.min(LAG.takVisas, d.minne + d.ministrar + d.skrivna); };
// hardare = brotten som döms så många steg hårdare än lagens straff (stölden ur en grav, steg 13.1.4)
export const lagForBrott = (s: State, h: HandelseTyp) => lagarNu(s).find(l => (LAGAR[l.id].brott ?? []).includes(h));
// den som inte får rösta (steg 8.4.6)
export function utanRost(s: State, p: Person) {
  if (p.straffad && lagGaller(s, 'rostStraffade')) return true;
  if (p.utanRost) return true;
  if (p.sex === 'k' && lagGaller(s, 'rostKvinnor')) return true;
  return lagGaller(s, 'rostEgendom') && !agerNagot(s, p);
}
// hur konsekvent lagarna efterlevs (steg 8.4.9): hur samlad vikten är och legitimiteten, sämre över taket
export function efterlevs(s: State) {
  const v = vikter(s), n = v.length, h = v.reduce((a, x) => a + x.andel * x.andel, 0), samlad = n > 1 ? (h - 1 / n) / (1 - 1 / n) : 1, over = Math.max(0, lagarNu(s).length - lagTak(s));
  return clamp(LAG.bas + LAG.viktSamlad * samlad + LAG.viktLeg * legitimitet(s).v - LAG.overTak * over, 0, 1);
}
// straffet när lagen stiftas: radens, ett steg hårdare med Envälde och Fejd
const startStraff = (s: State, id: string) => straffSteg(s, LAGAR[id].straff, (s.seder.v.rang ?? 0) + (s.seder.v.fejd ?? 0) > LAG.stegHardare ? 1 : 0);
// det straff ledaren l vill ha i lagen id (steg 11.12.3): radens, ett steg för varje LAG.straffHard som hårdheten skiljer sig från lagom
const ledarStraff = (s: State, l: Person, id: string) => straffSteg(s, LAGAR[id].straff, Math.trunc((ledarHard(s, l) - 1) / LAG.straffHard));

// ---------- frågorna (steg 8.3.1 och 8.4.1–8.4.2) ----------
// ---------- vem som får lägga fram (steg 8.4.4) ----------
export function framlaggare(s: State): Person[] {
  const l = ledareOf(s), r = s.seder.v.rang ?? 0;
  if (!l) return [];
  if (r >= LAG.envalde) return [l];
  const ut = [l, ...Object.values(s.styre?.ministrar ?? {}).map(id => living(s).find(p => p.id === id)).filter((p): p is Person => !!p)];
  if (r <= LAG.allmoge) for (const x of vikter(s)) if (x.w >= LAG.inflytande && ageOf(x.p, s.now) >= ALDER.vuxen && !ut.includes(x.p)) ut.push(x.p);
  return ut;
}

// ---------- vad som tas upp (steg 8.4.5) ----------
// namnet på en levande eller död, också när den döda inte finns kvar i folket (namnet i någons intryck)
const personNamn = (s: State, id: number) => byId(s, id)?.name ?? s.people.flatMap(p => p.intryck ?? []).find(e => e.om === id)?.namn ?? '';
export interface LagForslag { fr: Fraga; prio: number; varfor: string }
export const TAS_UPP: { id: string; lista(s: State, p: Person): LagForslag[] }[] = [
  // ett påbud är en fråga med ett eller flera tal (steg 12.1.27, PABUD_FRAGOR): den som får lägga fram föreslår alla talen så som hen
  // själv vill ha dem, när något av dem skiljer sig nog från det som gäller
  { id: 'pabud', lista: (s, p) => PABUD_FRAGOR.filter(f => (framFor(s, f.id) ?? ledareOf(s)) === p).flatMap(f => {
    // ett påbud som pekar ut en person (tystnaden, steg 10.4.10): en annan person börjar från noll
    const o = pabudOm(s, f, p);
    if (!o) return [];
    const pd = o.om === undefined ? {} : { om: o.om, namn: personNamn(s, o.om) }, nya: Record<string, number> = {};
    let d = 0;
    for (const k of f.tal) { const ny = PABUD[k].asikt(s, p, o.om); nya[k] = Math.round(ny * 100) / 100; d = Math.max(d, Math.abs(ny - pabudFran(s, k, o.om))); }
    return d >= ROST.skillnad ? [{ fr: { f: 'pabud', d: { k: f.id, ...nya, ...pd }, fram: p.id }, prio: d, varfor: `${p.name} vill ändra påbudet om ${f.namn.toLowerCase()}${o.om !== undefined ? ` om ${pd.namn}` : ''}` }] : [];
  }) },
  { id: 'nylag', lista: (s, p) => knows(p, 'lag') ? Object.keys(LAGAR).flatMap(id => {
    if (lagGaller(s, id) || LAGAR[id].kan?.(s) === false || (LAGAR[id].tek && !knows(p, LAGAR[id].tek!)) || LAGAR[id].rost(s, p).v <= 0) return [];
    const full = lagarNu(s).length >= lagTak(s) ? LAG.fullt : 1;
    return [{ fr: { f: 'nylag', d: { id }, fram: p.id }, prio: LAGAR[id].prio(s) * full, varfor: LAGAR[id].om ? `${p.name} vill ha en lag efter ${LAGAR[id].om}` : `${p.name} tycker att byn behöver en lag` }];
  }) : [] },
  // ett tal i en lag som gäller (steg 10.5.4): den som får lägga fram föreslår platsen i stegen närmast sitt eget
  { id: 'lagtal', lista: (s, p) => lagarNu(s).flatMap(l => Object.entries(LAGAR[l.id].tal ?? {}).flatMap(([k, d]) => {
    const iE = talPlats(d, d.vill(s, p)), iO = d.stege.indexOf(lagTalRa(s, l.id, k));
    return iE !== iO ? [{ fr: { f: 'lagtal', d: { id: l.id, k, v: d.stege[iE] }, fram: p.id }, prio: clamp(Math.abs(iE - iO) / 3, 0, 1), varfor: `${p.name} vill ändra ${d.namn} i lagen ${LAGAR[l.id].namn.toLowerCase()}` }] : [];
  })) },
  // ett annat straff i en lag som gäller (steg 11.12.3): ledaren föreslår det straff som passar hens hårdhet
  { id: 'lagstraff', lista: (s, p) => p !== ledareOf(s) ? [] : lagarNu(s).flatMap(l => {
    if (!LAGAR[l.id].straff && !LAGAR[l.id].brott) return []; // lagar utan straff (rösten, arbetsplikten) ändras inte så
    const ny = ledarStraff(s, p, l.id), d = Math.abs(STEGEN.indexOf(ny) - STEGEN.indexOf(l.straff));
    return ny !== l.straff ? [{ fr: { f: 'lagstraff', d: { id: l.id, ny }, fram: p.id }, prio: clamp(d / 3, 0, 1), varfor: `${p.name} vill ha ett ${STEGEN.indexOf(ny) > STEGEN.indexOf(l.straff) ? 'hårdare' : 'mildare'} straff i lagen ${LAGAR[l.id].namn.toLowerCase()}` }] : [];
  }) },
  { id: 'bortlag', lista: (s, p) => lagarNu(s).flatMap(l => {
    const v = LAGAR[l.id].rost(s, p).v, nara = lagarNu(s).length >= lagTak(s) - 1 ? LAG.naraTak : 0;
    return v < 0 ? [{ fr: { f: 'bortlag', d: { id: l.id }, fram: p.id }, prio: -v * LAG.bortVikt + nara, varfor: `${p.name} tycker illa om lagen` }] : [];
  }) },
];
const nyckel = (fr: Fraga) => fr.f + ':' + JSON.stringify(fr.d);
// en kväll: den som får lägga fram väljer ur sin egen lista, och det med högst prioritet tas upp
export function tasUppKvall(s: State) {
  const st = styreAv(s), ned = (st.nedrostat ??= {});
  let bast: LagForslag | undefined;
  for (const p of framlaggare(s)) for (const r of TAS_UPP) for (const f of r.lista(s, p)) {
    if (f.prio < LAG.troskel || (ned[nyckel(f.fr)] ?? 0) > s.now) continue;
    if (!bast || f.prio > bast.prio) bast = f;
  }
  if (!bast) return false;
  const gick = rostaOm(s, bast.fr);
  if (!gick) ned[nyckel(bast.fr)] = s.now + LAG.nedrostat * 24 * HOUR;
  const o = st.roster?.[st.roster.length - 1];
  if (o) o.varfor = bast.varfor;
  return true;
}

export const budgetBortKrok: { f?: (s: State) => void } = {};
// raderna i FRAGOR som hör till lagarna läggs till när allt är laddat (steg.ts)
export function lagRegister() {
FRAGOR.nylag = {
  namn: (_s, d) => `Ny lag: ${LAGAR[d.id as string].namn}`, om: (_s, d) => LAGAR[d.id as string].text, krets: 'byn',
  rost: (s, p, d) => LAGAR[d.id as string].rost(s, p),
  gor: (s, d, fram) => {
    const id = d.id as string, def = LAGAR[id], st = styreAv(s);
    (st.lagar ??= []).push({ id, t: s.now, straff: startStraff(s, id), av: fram?.id ?? -1, om: def.om ?? '' });
    count(s, 'lag_ny');
    const t = `Byn stiftade en lag: ${def.namn.toLowerCase()}.`;
    log(s, t, 'world', fram ? [fram.id] : []); kronika(s, t, 'ledare'); notis(s, 'lag', t, fram ? [fram.id] : []); // (steg 12.1.137)
  },
};
FRAGOR.bortlag = {
  namn: (_s, d) => `Ta bort lagen: ${LAGAR[d.id as string].namn}`, om: (_s, d) => LAGAR[d.id as string].text, krets: 'byn',
  rost: (s, p, d) => { const r = LAGAR[d.id as string].rost(s, p); return { v: -r.v, why: r.v < 0 ? r.why : 'Vill behålla lagen' }; },
  gor: (s, d) => { const st = styreAv(s); st.lagar = st.lagar?.filter(l => l.id !== d.id); count(s, 'lag_bort'); if (d.id === 'skatt') { for (const p of s.people) p.skatteskuld = undefined; budgetBortKrok.f?.(s); } /* skulden stryks (steg 10.5.5), och budgeten försvinner (steg 10.5.7) */ log(s, `Byn tog bort lagen: ${LAGAR[d.id as string].namn.toLowerCase()}.`, 'world'); },
};
// ett tal i en lag (steg 10.5.4): var och en röstar efter om det nya ligger närmare det hen vill än det gamla
FRAGOR.lagtal = {
  namn: (_s, d) => { const td = LAGAR[d.id as string].tal![d.k as string]; return `${LAGAR[d.id as string].namn}: ${td.namn} ${td.visa(d.v as number)}`; }, om: (_s, d) => LAGAR[d.id as string].text, krets: 'byn',
  andr: (s, d) => ({ k: `lagtal:${d.id}:${d.k}`, fran: lagTalRa(s, d.id as string, d.k as string), till: d.v as number }), // från vad och till vad (steg 11.1.28)
  rost: (s, p, d) => {
    const td = LAGAR[d.id as string].tal![d.k as string], iE = talPlats(td, td.vill(s, p)), iO = td.stege.indexOf(lagTalRa(s, d.id as string, d.k as string)), iN = td.stege.indexOf(d.v as number);
    const v = Math.abs(iE - iO) > Math.abs(iE - iN) ? 0.5 : Math.abs(iE - iO) < Math.abs(iE - iN) ? -0.5 : -0.05;
    return { v, why: v > 0 ? `Vill ha ${td.namn} ${td.visa(td.stege[iE])}` : 'Tycker att det är bra som det är' };
  },
  gor: (s, d, fram) => {
    const l = s.styre?.lagar?.find(x => x.id === d.id), td = LAGAR[d.id as string].tal![d.k as string];
    if (!l) return;
    const fore = lagTalRa(s, l.id, d.k as string);
    (l.tal ??= {})[d.k as string] = d.v as number;
    count(s, 'lag_tal');
    const led = ledareOf(s), ensam = !!led && (vikter(s).find(x => x.p === led)?.andel ?? 0) > 0.5;
    const t = `${ensam ? `${led!.name} påbjöd en ändring av` : 'Byn ändrade'} lagen ${LAGAR[l.id].namn.toLowerCase()}: ${td.namn} är nu ${td.visa(d.v as number)} (förut ${td.visa(fore)}).`;
    log(s, t, 'world', fram ? [fram.id] : []); kronika(s, t, 'ledare');
  },
};
// ett annat straff i en lag (steg 11.12.3): ett hårdare straff vill den aggressiva ha och ett mildare den med empati
FRAGOR.lagstraff = {
  namn: (_s, d) => `Ändra straffet: ${LAGAR[d.id as string].namn}`, om: (_s, d) => LAGAR[d.id as string].text, krets: 'byn',
  andr: (s, d) => ({ k: `lagstraff:${d.id}`, fran: s.styre?.lagar?.find(x => x.id === d.id)?.straff ?? 0, till: d.ny as number }),
  rost: (s, p, d) => {
    const nu = s.styre?.lagar?.find(x => x.id === d.id)?.straff ?? 0, hardare = STEGEN.indexOf(d.ny as number) > STEGEN.indexOf(nu), v = (dev(p.pot.aggression) - dev(p.pot.empati)) * (hardare ? 1 : -1) * 0.5;
    return { v, why: v > 0 ? `Vill ha ett ${hardare ? 'hårdare' : 'mildare'} straff` : 'Tycker att straffet är bra som det är' };
  },
  gor: (s, d, fram) => {
    const l = s.styre?.lagar?.find(x => x.id === d.id);
    if (!l) return;
    l.straff = d.ny as number; count(s, 'lag_straff');
    const t = `Byn ändrade straffet i lagen ${LAGAR[l.id].namn.toLowerCase()} till ${STRAFF_NAMN[l.straff].toLowerCase()}.`;
    log(s, t, 'world', fram ? [fram.id] : []); kronika(s, t, 'ledare');
  },
};
// skulden på tinget vid Allmoge (steg 8.4.7): var och en röstar efter vad hen vet och vad hen tycker om den anklagade
FRAGOR.skuld = {
  namn: (_s, d) => `Är ${d.namn} skyldig?`, krets: 'byn',
  rost: (s, p, d) => { const op = s.rels[relKey(p.id, d.om as number)]?.op ?? 0, vet = p.intryck?.some(e => e.om === d.om && e.bev?.length) ? 0.5 : 0; return { v: vet + 0.1 - op / 200, why: vet ? 'Vet vad som hände' : op > 20 ? `Litar på ${d.namn}` : 'Tror på anklagelsen' }; },
  gor: () => {},
};

}
