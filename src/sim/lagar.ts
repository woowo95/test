// Lagarna (system 8.4). En lag är en rad i registret LAGAR: vad den gäller, vilket straff den har från början och hur den väcks av det
// som hänt. Att stifta, ändra och ta bort en lag är frågor i röstsystemet (FRAGOR i rost.ts). Vad som tas upp en kväll väljs ur registret
// TAS_UPP, efter prioritet (steg 8.4.5). En lag läser spelet med `lagGaller`; ett brott i `doma` (styre.ts) får straffet i lagen.
import { HOUR, Person, State } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, ageOf, count, living, log, relKey } from './folk';
import { kronika } from './historik';
import { FRAGOR, ROST, Fraga, framFor, laggFram, rostaOm, vikter } from './rost';
import { PABUD, Pabud, legitimitet, ledareOf, styreAv } from './styre';
import { knows } from './teknik';
import type { HandelseTyp } from './rykten';
import { amountOf } from './lager';

export const LAG = balans('lag', {
  tak: 6, // så många lagar klarar byn utan skrift (steg 8.4.3) ...
  takMinister: 1, // ... och så många fler per minister
  takVisas: 12, // fliken Styre visar högst så många
  overTak: 0.15, // över taket efterlevs alla lagar så här mycket sämre per lag
  envalde: 0.5, // över den här Envälde-seden får bara ledaren lägga fram (steg 8.4.4)
  allmoge: -0.1, // under den här får vem som helst med inflytande över inflytande
  inflytande: 1, // den gränsen
  troskel: 0.25, // inget tas upp under den här prioriteten (steg 8.4.5)
  nedrostat: 3, // det som röstats ned tas inte upp igen på så här många dygn (år i spelet)
  skatt: 0.15, // så stor del av det man skaffar går till byn med en lag om skatt (steg 8.4.17) ...
  dagsverke: 1.5, // ... och så många gånger fler bygger med en lag om dagsverken
  plikt: 0.2, // arbetsplikten höjer viljan att arbeta för byn så här mycket
  bas: 0.25, viktSamlad: 0.4, viktLeg: 0.5, // hur konsekvent lagarna efterlevs (steg 8.4.9): grunden, hur samlad vikten är och legitimiteten
  stegHardare: 0.5, // Envälde och Fejd över det här gör straffet ett steg hårdare när lagen stiftas
  tabuAndel: 0.34, // en farlig plats blir tabu när så stor del av de vuxna fruktar den (steg 8.4.10)
  tabuMin: 4, // ... och minst så här många
});
export const LAG_SKOG = 8; // förbudet att fälla nära byn: inom så många rutor från byns område

const STEGEN = [0, 1, 4, 5, 2, 7, 3, 6]; // ordningen från mildast till hårdast

// lagarna: en rad per lag. prio = hur väl det som hänt väcker den (0–1). rost = åsikten och intresset, −1 till 1. brott = händelserna som bryter
// mot den. kan = systemet den kräver finns
export interface LagDef { namn: string; sym: string; text: string; straff: number; brott?: HandelseTyp[]; prio(s: State): number; rost(s: State, p: Person): { v: number; why: string }; kan?(s: State): boolean; om?: string }
const dev = (v: number) => (v - 10) / 10;
const antal = (s: State, k: string) => s.stat?.[k] ?? 0;
export const LAGAR: Record<string, LagDef> = {
  stoldforbud: { namn: 'Förbud mot stöld', sym: '🖐️', text: 'Den som stjäl straffas', straff: 4, brott: ['stold', 'stoldLindrig'], om: 'stölderna', prio: s => clamp(antal(s, 'rykte_stold') / 4, 0, 1), rost: (_s, p) => ({ v: 0.3 + dev(p.pot.empati) * 0.5, why: 'Vill inte bli bestulen' }) },
  slagsmalforbud: { namn: 'Förbud mot slagsmål', sym: '🥊', text: 'Den som slår någon straffas', straff: 1, brott: ['sla', 'misshandel'], om: 'slagsmålen', prio: s => clamp(antal(s, 'rykte_sla') / 8, 0, 1), rost: (_s, p) => ({ v: dev(p.pot.empati) - dev(p.pot.aggression), why: dev(p.pot.aggression) > 0 ? 'Vill kunna göra upp själv' : 'Vill ha lugn i byn' }) },
  drapforbud: { namn: 'Förbud mot dråp', sym: '⚔️', text: 'Den som dödar någon straffas hårt', straff: 3, brott: ['drap'], om: 'ett dråp', prio: s => clamp(antal(s, 'rykte_drap') / 1, 0, 1), rost: (_s, p) => ({ v: 0.4 + dev(p.pot.empati) * 0.5 - dev(p.pot.aggression) * 0.3, why: 'Vill inte bli dräpt' }) },
  arbetsplikt: { namn: 'Arbetsplikt', sym: '⛏️', text: 'Den som kan arbeta ska arbeta', straff: 0, om: 'en vinter med svält', prio: s => clamp(antal(s, 'dog av svält') / 2, 0, 1), rost: (_s, p) => ({ v: dev(p.pot.flit), why: dev(p.pot.flit) > 0 ? 'Arbetar ändå' : 'Vill bestämma sin tid själv' }) },
  matdelning: { namn: 'Förrådet delas lika', sym: '🥣', text: 'Det man skaffar går till byn', straff: 1, om: 'en vinter med svält', prio: s => clamp(antal(s, 'dog av svält') / 3, 0, 1) * (1 + (s.seder.v.gemenskap ?? 0)) / 2, rost: (s, p) => { const rik = living(s).length && amountOf(s, 'ved') >= 0 ? dev(p.pot.empati) : 0; return { v: rik + (s.seder.v.gemenskap ?? 0) * 0.5, why: rik > 0 ? 'Vill att alla får äta' : 'Vill behålla det hen skaffar' }; } },
  skogsfred: { namn: 'Inte fälla träd nära byn', sym: '🌲', text: `Ingen fäller träd inom ${LAG_SKOG} rutor från byn`, straff: 0, om: 'att skogen tog slut nära byn', prio: s => clamp((s.fallda ?? 0) / 120, 0, 1) * clamp(1 - (s.seder.v.natur ?? 0), 0, 1), rost: (s, p) => ({ v: -(s.seder.v.natur ?? 0) * 0.5 + (p.tag === 'Trähuggare' ? -0.5 : 0.05), why: p.tag === 'Trähuggare' ? 'Hugger trä och vill ha det nära' : 'Vill ha skogen kvar' }) },
  // skatt före silvret (steg 8.4.17)
  skatt: { namn: 'Skatt på fångst och skörd', sym: '🧺', text: 'En del av fångsten och skörden går till byn', straff: 4, om: 'att förrådet var tomt', prio: s => clamp(living(s).length / 30, 0, 1) * clamp(1 - (s.delning?.andel ?? 1) * 2, 0, 1), rost: (s, p) => ({ v: (s.seder.v.gemenskap ?? 0) * 0.5 + dev(p.pot.empati) * 0.5 - 0.1, why: 'Tycker att alla ska bidra' }) },
  dagsverke: { namn: 'Dagsverken på byns byggen', sym: '🪵', text: 'De vuxna hjälper till på byns byggen', straff: 0, om: 'att byggena stod stilla', prio: s => clamp((s.byggen?.filter(b => b.b < 1).length ?? 0) / 60, 0, 1), rost: (s, p) => ({ v: dev(p.pot.flit) * 0.5 + (s.seder.v.arbete ?? 0) * 0.5, why: 'Vill ha husen klara' }) },
  // lagar om rösten (steg 8.4.6)
  rostKvinnor: { namn: 'Kvinnorna röstar inte', sym: '🤐', text: 'Bara männen får rösta', straff: 0, om: 'ledarens vilja', prio: s => clamp((s.seder.v.rang ?? 0) - 0.6, 0, 1) * 0.6, rost: (_s, p) => ({ v: p.sex === 'k' ? -1 : dev(p.pot.mod) * 0.5 - dev(p.pot.empati) * 0.5, why: p.sex === 'k' ? 'Vill ha kvar sin röst' : 'Tycker att männen ska bestämma' }) },
  rostEgendom: { namn: 'Bara de med egendom röstar', sym: '💰', text: 'Den som inget äger får inte rösta', straff: 0, om: 'ledarens vilja', prio: s => clamp((s.seder.v.rang ?? 0) - 0.4, 0, 1) * 0.5 * clamp(-(s.seder.v.delning ?? 0), 0, 1), rost: (s, p) => ({ v: agerNagot(s, p) ? 0.2 : -1, why: agerNagot(s, p) ? 'Äger något' : 'Äger inget' }) },
  rostStraffade: { namn: 'De straffade röstar inte', sym: '🚫', text: 'Den som straffats hårt förlorar rösten', straff: 0, om: 'brotten i byn', prio: s => clamp(antal(s, 'straff') / 12, 0, 1) * 0.6, rost: (_s, p) => ({ v: 0.2 - (p.straffad ? 1 : 0), why: p.straffad ? 'Har själv straffats' : 'Vill inte att brottslingar bestämmer' }) },
  ledarBunden: { namn: 'Ledaren väger inte mer än hälften', sym: '⚖️', text: 'Ledarens vikt är begränsad', straff: 0, om: 'missnöjet med ledaren', prio: s => clamp(living(s).reduce((a, p) => a + (p.missnoje ?? 0), 0) / Math.max(1, living(s).length) * 2, 0, 1) * clamp(s.seder.v.rang ?? 0, 0, 1), rost: (s, p) => ({ v: p.id === s.styre?.ledare ? -1 : 0.3, why: p.id === s.styre?.ledare ? 'Vill behålla sin makt' : 'Vill ha en röst som räknas' }) },
};
const agerNagot = (s: State, p: Person) => (s.ting ?? []).some(t => t.agare === p.id);

export interface Lag { id: string; t: number; straff: number; av: number; om: string }
export const lagarNu = (s: State): Lag[] => s.styre?.lagar ?? [];
export const lagGaller = (s: State, id: string) => !!s.styre?.lagar?.some(l => l.id === id);
export const lagTak = (s: State) => LAG.tak + LAG.takMinister * Object.keys(s.styre?.ministrar ?? {}).length;
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
const startStraff = (s: State, id: string) => {
  const i = STEGEN.indexOf(LAGAR[id].straff), hard = (s.seder.v.rang ?? 0) + (s.seder.v.fejd ?? 0) > LAG.stegHardare;
  return STEGEN[Math.min(STEGEN.length - 1, i + (hard ? 1 : 0))];
};

// ---------- frågorna (steg 8.3.1 och 8.4.1–8.4.2) ----------
FRAGOR.nylag = {
  namn: (_s, d) => `Ny lag: ${LAGAR[d.id as string].namn}`, krets: 'byn',
  rost: (s, p, d) => LAGAR[d.id as string].rost(s, p),
  gor: (s, d, fram) => {
    const id = d.id as string, def = LAGAR[id], st = styreAv(s);
    (st.lagar ??= []).push({ id, t: s.now, straff: startStraff(s, id), av: fram?.id ?? -1, om: def.om ?? '' });
    count(s, 'lag_ny');
    const t = `Byn stiftade en lag: ${def.namn.toLowerCase()}.`;
    log(s, t, 'world', fram ? [fram.id] : []); kronika(s, t, 'ledare');
  },
};
FRAGOR.bortlag = {
  namn: (_s, d) => `Ta bort lagen: ${LAGAR[d.id as string].namn}`, krets: 'byn',
  rost: (s, p, d) => { const r = LAGAR[d.id as string].rost(s, p); return { v: -r.v, why: r.v < 0 ? r.why : 'Vill behålla lagen' }; },
  gor: (s, d) => { const st = styreAv(s); st.lagar = st.lagar?.filter(l => l.id !== d.id); count(s, 'lag_bort'); log(s, `Byn tog bort lagen: ${LAGAR[d.id as string].namn.toLowerCase()}.`, 'world'); },
};
FRAGOR.lagstraff = {
  namn: (_s, d) => `Ändra straffet: ${LAGAR[d.id as string].namn}`, krets: 'byn',
  rost: (_s, p, d) => ({ v: (d.ny as number) === 3 || (d.ny as number) === 6 ? dev(p.pot.aggression) - dev(p.pot.empati) : dev(p.pot.empati) * 0.5, why: 'Tycker att straffet ska vara ett annat' }),
  gor: (s, d) => { const l = s.styre?.lagar?.find(x => x.id === d.id); if (l) l.straff = d.ny as number; },
};
// skulden på tinget vid Allmoge (steg 8.4.7): var och en röstar efter vad hen vet och vad hen tycker om den anklagade
FRAGOR.skuld = {
  namn: (_s, d) => `Är ${d.namn} skyldig?`, krets: 'byn',
  rost: (s, p, d) => { const op = s.rels[relKey(p.id, d.om as number)]?.op ?? 0, vet = p.intryck?.some(e => e.om === d.om && e.bev?.length) ? 0.5 : 0; return { v: vet + 0.1 - op / 200, why: vet ? 'Vet vad som hände' : op > 20 ? `Litar på ${d.namn}` : 'Tror på anklagelsen' }; },
  gor: () => {},
};

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
export interface LagForslag { fr: Fraga; prio: number; varfor: string }
export const TAS_UPP: { id: string; lista(s: State, p: Person): LagForslag[] }[] = [
  { id: 'pabud', lista: (s, p) => (Object.keys(PABUD) as Pabud[]).filter(k => (framFor(s, k) ?? ledareOf(s)) === p).flatMap(k => {
    const ny = PABUD[k].asikt(s, p), gamla = s.styre?.pabud?.[k] ?? 0, d = Math.abs(ny - gamla);
    return d >= ROST.skillnad ? [{ fr: { f: 'pabud', d: { k, v: Math.round(ny * 100) / 100 }, fram: p.id }, prio: d, varfor: `${p.name} vill ändra påbudet om ${PABUD[k].namn.toLowerCase()}` }] : [];
  }) },
  { id: 'nylag', lista: (s, p) => knows(p, 'lag') ? Object.keys(LAGAR).flatMap(id => {
    if (lagGaller(s, id) || LAGAR[id].kan?.(s) === false || LAGAR[id].rost(s, p).v <= 0) return [];
    const full = lagarNu(s).length >= lagTak(s) ? 0.5 : 1;
    return [{ fr: { f: 'nylag', d: { id }, fram: p.id }, prio: LAGAR[id].prio(s) * full, varfor: `${LAGAR[id].om ? `Efter ${LAGAR[id].om}` : 'Det behövs'} vill ${p.name} ha en lag` }];
  }) : [] },
  { id: 'bortlag', lista: (s, p) => lagarNu(s).flatMap(l => {
    const v = LAGAR[l.id].rost(s, p).v, nara = lagarNu(s).length >= lagTak(s) - 1 ? 0.3 : 0;
    return v < 0 ? [{ fr: { f: 'bortlag', d: { id: l.id }, fram: p.id }, prio: -v * 0.4 + nara, varfor: `${p.name} tycker illa om lagen` }] : [];
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
export { laggFram };

// ---------- rädslor som blir tabun (steg 8.4.10) ----------
// en plats som många fruktar blir tabu: hela byn undviker den, också de som inte varit med. Tabut hålls vid liv i berättelser
export interface Tabu { a: number; t: number; om: string }
export function tabuDygn(s: State) {
  const vuxna = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
  if (vuxna.length < LAG.tabuMin) return;
  const n = new Map<number, { n: number; om: string }>();
  for (const p of vuxna) for (const l of p.lardomar ?? []) if (l.k === 'fara' && l.a !== undefined) { const e = n.get(l.a) ?? { n: 0, om: l.om ?? '' }; e.n++; n.set(l.a, e); }
  s.tabun ??= [];
  for (const [a, e] of n) if (e.n >= Math.max(LAG.tabuMin, vuxna.length * LAG.tabuAndel) && !s.tabun.some(t => t.a === a)) {
    s.tabun.push({ a, t: s.now, om: e.om }); count(s, 'tabu');
    const t = `Ingen vill gå dit längre: ${e.om || 'något hände där'}. Platsen har blivit tabu.`;
    log(s, t, 'world'); kronika(s, t, 'tabu');
  }
  for (const t of s.tabun) for (const p of vuxna) { const l = p.lardomar?.find(x => x.k === 'fara' && x.a === t.a); if (l) { l.t = s.now; continue; } (p.lardomar ??= []).push({ k: 'fara', a: t.a, v: 0.6, c: 0.6, t: s.now, led: 2, om: t.om }); }
}
