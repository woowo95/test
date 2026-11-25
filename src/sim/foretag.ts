// ---------- företagen (steg 14.1.5, Ekonomi och handel: Företagen, i fliken Människan) ----------
// Ett företag är en rad i s.foretag: ägaren (en person, byn eller en kyrka), huset och verksamheterna (rader i VERKSAMHETER).
// Det har ingen egen kassa: det som säljs är ägarens, och det som betalas blir ägarens. Att starta ett är ett projekt med en
// poäng: vad byborna och gästerna skulle köpa som ingen säljer, gånger vad den som startar kan, minus varorna, arbetet och
// huset, gånger hens läggning. Huset byggs med byggsystemet (naringshus i BYGGNADER), och borden ställs dit som andra bord.
import { Person, State } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, EGENSKAP, ageOf, alive, byId, count, forstaGang, living, log, stat } from './folk';
import { gridOf, housesOf, husById, type Hus, type Rum } from './byggnad';
import { type Akut, foretagKrok, husKostnad } from './byggnader';
import { BYN, kyrkaId } from './egendom';
import { kronika } from './historik';
import { ledareOf } from './styre';
import { prastOf } from './kult';
import { payable } from './behov';
import { grundvarde, formogenheter } from './varde';
import { kroppensMat } from './ekonomi';
import { amountOf, ownsAmount } from './lager';
import { rusLust } from './rus';
import { FOOD } from './saker';
import { MALTIDSNIVA, maltidsNiva } from './ratter';
import { DRYCKER, dryckAv, vatskaAv, type VatskaId } from './vatskor';
import { egetVarde } from './dagsarbete';
import { rumTaggar } from './rum';
import { foretagBord } from './stationer';

export const FORETAG = balans('foretag', {
  humor: 20, // en hel punkt bättre humör under en tanke är värd så många silver för kunden
  dryck: 0.6, // så många silver är en kvällsdryck värd mer än drycken själv, gånger hur gärna den tas
  dryckVarde: 0.5, // så många silver är själva drycken värd
  andel: 0.5, // så stor del av måltiderna och dryckerna räknar man med att kunderna köper
  del: 0.5, // så stor del av kundens vinst räknar man med att kunna ta betalt för
  timKund: 0.1, // så många timmar arbete tar en kund
  ar: 30, // huset ska vara betalt på så många dygn (år i spelet)
  pung: 15, // det kunden kan betala med räcker så många dygn
  plats: 9, // så många golvrutor har ett nytt hus
  bordKunder: 6, // så många platser vid bord vill ett företag högst ha
  samtidigt: 0.15, // så stor del av dygnets kunder kommer samtidigt
  akut: 0.6, // hur akut ett företags hus är att bygga (familjens hus är HUS.familjAkut)
  minne: 0.5, // så mycket av det företaget säljer på ett dygn glöms till nästa
});
// det företaget sålt: n = kunder och v = värdet, per dygn (glöms med FORETAG.minne)
export interface Foretag { id: number; ag: number; hus?: number; verk: string[]; namn: string; t: number; salt?: Record<string, number>; intakt?: number; pris?: Record<string, number>; ko?: import('./kassa').KoRad[]; lamnat?: number; kallad?: number }
export const foretagOf = (s: State): Foretag[] => s.foretag ?? [];
export const foretagAvHus = (s: State, hus?: number) => hus === undefined ? undefined : foretagOf(s).find(f => f.hus === hus);

// ---------- verksamheterna ----------
// En verksamhet: rummet den kräver (en rumstyp, rum.ts), vad den säljer, och vad kunden p vinner på en vara mot att ta den hemma.
export interface Verksamhet {
  namn: string; sym: string;
  rum: string; // rumstypen
  varor: (s: State) => string[]; // det som går att sälja i byn nu
  noje: (s: State, p: Person, k: string) => number; // det kunden vinner mot att ta det hen har hemma, i silver
  snitt: (k: string) => number; // det en vanlig kund vinner, i silver
  grund?: (k: string) => number; // varans värde när den inte är en sak i förrådet
  ats?: true; // äts och dricks i rummet
  vatska?: true; // säljs ur ett kärl
  perDygn: (s: State, p: Person) => number; // så många gånger per dygn kunden skulle kunna köpa
  kunnande: (p: Person) => number; // hur väl den som driver den kan den, 1 = vanligt
}
// den bästa maten p har hemma
const hemmaNoje = (s: State, p: Person) => FOOD.reduce((m, k) => { const n = MALTIDSNIVA[maltidsNiva(k)].humor; return n > m && ownsAmount(s, p, k) >= 1 ? n : m; }, 0);
const skick = (n: number) => clamp(0.6 + n / 25, 0.6, 1.4);
export const VERKSAMHETER: Record<string, Verksamhet> = {
  servering: {
    namn: 'Servering', sym: '🍲', rum: 'matsal',
    varor: s => FOOD.filter(k => MALTIDSNIVA[maltidsNiva(k)].humor > 0 && amountOf(s, k) >= 1),
    noje: (s, p, k) => FORETAG.humor * Math.max(0, MALTIDSNIVA[maltidsNiva(k)].humor - hemmaNoje(s, p)),
    snitt: k => FORETAG.humor * MALTIDSNIVA[maltidsNiva(k)].humor, ats: true,
    perDygn: (s, p) => kroppensMat(p, s.now),
    kunnande: p => skick((p.skill.matlagning + p.skill.handel) / 2),
  },
  dryck: {
    namn: 'Dryck', sym: '🍺', rum: 'matsal',
    varor: s => DRYCKER.filter(v => dryckAv(v)?.alkohol && vatskaAv(s, v as VatskaId) >= 1),
    noje: (_s, p, k) => FORETAG.dryck * (dryckAv(k)?.kvall ?? 0.5) * rusLust(_s, p),
    snitt: k => FORETAG.dryck * (dryckAv(k)?.kvall ?? 0.5), grund: () => FORETAG.dryckVarde, vatska: true,
    perDygn: (s, p) => ageOf(p, s.now) >= ALDER.vuxen ? 1 : 0,
    kunnande: p => skick((p.skill.matlagning + p.skill.handel) / 2),
  },
};
// företagets sorts namn efter verksamheterna: servering och dryck tillsammans är en taverna
export const sortNamn = (verk: string[]) => verk.includes('servering') && verk.includes('dryck') ? 'Taverna' : VERKSAMHETER[verk[0]]?.namn ?? 'Företag';

// ---------- ägaren ----------
// kyrkans id är negativt (kyrkaId)
export const troAvAgare = (s: State, ag: number) => ag < 0 ? (s.tron ?? []).find(t => t.slut === undefined && kyrkaId(t.id) === ag) : undefined;
// den som står för företaget: personen själv, byns ledare eller kyrkans präst
export const foretagare = (s: State, ag: number): Person | undefined => ag === BYN ? ledareOf(s) : ag < 0 ? (t => t && prastOf(s, t))(troAvAgare(s, ag)) : (p => p && alive(p) ? p : undefined)(byId(s, ag));
// agarens namn i genitiv
const agNamn = (s: State, ag: number) => ag === BYN ? 'Byns' : ag < 0 ? 'Kyrkans' : (n => /[sxz]$/i.test(n) ? n : `${n}s`)(byId(s, ag)?.name ?? 'Någon');
const husAv = (s: State, ag: number): Hus[] => housesOf(s).filter(h => h.fn === 'naringshus' && (ag < 0 ? h.tro !== undefined && kyrkaId(h.tro) === ag : h.tro === undefined && (h.ag ?? BYN) === ag));

// ---------- efterfrågan ----------
// vad kunden p kan betala per dygn: silvret och det hen har över, ska räcka en tid
export const kundPung = (s: State, p: Person) => payable(s, p, []).reduce((a, w) => a + (w.t ? 0 : w.n * grundvarde(w.k)), 0);
// det kunderna skulle ge per dygn utöver varans värde om de kunde köpa verksamheten v av ag: antalet kunder och vinsten
export function efterfragan(s: State, v: string, ag: number): { kunder: number; vinst: number } {
  const V = VERKSAMHETER[v], varor = V.varor(s);
  let kunder = 0, vinst = 0;
  if (!varor.length) return { kunder, vinst };
  for (const p of living(s)) {
    if (p.id === ag || ageOf(p, s.now) < ALDER.hjalper) continue;
    let bast = 0, pris = 1;
    for (const k of varor) { const n = V.noje(s, p, k); if (n > bast) { bast = n; pris = (V.grund?.(k) ?? grundvarde(k)) + n * FORETAG.del; } }
    if (bast <= 0) continue;
    const n = Math.min(V.perDygn(s, p) * FORETAG.andel, kundPung(s, p) / FORETAG.pung / Math.max(0.1, pris));
    kunder += n; vinst += n * bast * FORETAG.del;
  }
  // det som redan säljs: ett företag som inte hunnit öppna räknas som om det sålde hela sin del
  for (const f of foretagOf(s)) if (f.verk.includes(v) && kunder > 0) {
    const sald = f.hus !== undefined && husById(s, f.hus)?.klar && f.salt?.[v] !== undefined ? Math.min(kunder, f.salt[v]) : kunder;
    vinst *= 1 - sald / kunder; kunder -= sald;
  }
  return { kunder, vinst };
}
export interface Forsok { ag: number; verk: string[]; poang: number; kunder: number }
// vad det är värt för ag att starta verksamheterna verk: vinsten per dygn minus arbetet och huset
export function startPoang(s: State, ag: number, verk: string[]): Forsok {
  const p = foretagare(s, ag);
  if (!p) return { ag, verk, poang: 0, kunder: 0 };
  let kunder = 0, ut = -husKostnad(FORETAG.plats) / FORETAG.ar;
  for (const v of verk) { const e = efterfragan(s, v, ag); kunder += e.kunder; ut += e.vinst * VERKSAMHETER[v].kunnande(p) - e.kunder * FORETAG.timKund * egetVarde(s, p); }
  // läggningen: den som är driftig och modig startar hellre
  const lagg = clamp((stat(p, 'flit', s.now) + stat(p, 'mod', s.now) + stat(p, 'karisma', s.now)) / (3 * EGENSKAP.mitt), 0.3, 1.7);
  return { ag, verk, poang: ut > 0 ? ut * lagg : ut, kunder };
}
// alla som kan starta ett företag nu: vuxna som inte har något, byn och kyrkorna, om de äger så mycket att huset går att betala
export function startare(s: State): number[] {
  const f = formogenheter(s), kostar = husKostnad(FORETAG.plats), har = new Set(foretagOf(s).map(q => q.ag)), ut: number[] = [];
  if (!har.has(BYN) && f.byn >= kostar) ut.push(BYN);
  for (const t of s.tron ?? []) { const id = kyrkaId(t.id); if (t.slut === undefined && !har.has(id) && (f.egen.get(id) ?? 0) >= kostar) ut.push(id); }
  for (const p of living(s)) if (!p.gast && ageOf(p, s.now) >= ALDER.vuxen && !har.has(p.id) && (f.egen.get(p.id) ?? 0) >= kostar) ut.push(p.id);
  return ut;
}
// det bästa förslaget: varje verksamhet för sig, och alla som delar rum tillsammans
export function bastaStart(s: State): Forsok | undefined {
  const slag = Object.keys(VERKSAMHETER), par = [...slag.map(v => [v]), ['servering', 'dryck']];
  let bast: Forsok | undefined;
  for (const ag of startare(s)) for (const verk of par) { const f = startPoang(s, ag, verk); if (f.poang > (bast?.poang ?? 0)) bast = f; }
  return bast;
}
export function starta(s: State, ag: number, verk: string[]): Foretag {
  const f: Foretag = { id: (s.nextForetag = (s.nextForetag ?? 0) + 1), ag, verk, namn: `${agNamn(s, ag)} ${sortNamn(verk).toLowerCase()}`, t: s.now };
  (s.foretag ??= []).push(f);
  count(s, 'foretagStart'); for (const v of verk) count(s, 'foretagStart_' + v);
  const p = foretagare(s, ag);
  log(s, `${p?.name ?? 'Byn'} bestämde sig för att starta ett företag: ${f.namn}.`, 'world', p ? [p.id] : []);
  if (forstaGang(s, 'foretag')) kronika(s, `Byns första företag: ${f.namn}.`, 'bygge');
  return f;
}
// ---------- huset ----------
// företaget som saknar hus får ägarens lediga; annars vill byggsystemet ha ett (naringshus)
foretagKrok.akut = s => {
  const f = foretagOf(s).find(q => q.hus === undefined && foretagare(s, q.ag));
  if (!f) return { v: 0, plats: 0 };
  const tr = troAvAgare(s, f.ag);
  return { v: FORETAG.akut, plats: FORETAG.plats, ...(tr ? { tro: tr.id } : f.ag > 0 ? { ag: f.ag } : {}) };
};
foretagKrok.namn = (s, a: Akut) => foretagOf(s).find(q => q.hus === undefined && (a.tro !== undefined ? q.ag === kyrkaId(a.tro) : q.ag === (a.ag ?? BYN)))?.namn ?? 'Företaget';
export const foretagRum = (s: State, f: Foretag): Rum[] => f.hus === undefined || !husById(s, f.hus)?.klar ? [] : gridOf(s).rooms.filter(r => r.hus === f.hus && r.tiles.length);
// så många kunder väntas samtidigt, och så många platser vid bord vill företaget ha
export const vantadeKunder = (s: State, f: Foretag) => f.verk.reduce((n, v) => n + Math.max(f.salt?.[v] ?? 0, living(s).length * FORETAG.andel), 0);
foretagBord.rum = s => foretagOf(s).flatMap(f => f.verk.some(v => VERKSAMHETER[v]?.rum === 'matsal') ? foretagRum(s, f).slice(0, 1).map(r => ({ r, folk: Math.max(2, Math.min(FORETAG.bordKunder, Math.round(vantadeKunder(s, f) * FORETAG.samtidigt * 2))) })) : []);
// verksamheterna som är öppna: rummet har sin rumstyp
export function oppna(s: State, f: Foretag): string[] {
  const rum = foretagRum(s, f);
  return f.verk.filter(v => rum.some(r => rumTaggar(s, r).has(VERKSAMHETER[v].rum as never)));
}
// ---------- varje timme och dygn (TAKTER) ----------
export function foretagTimme(s: State) {
  if (!s.foretag?.length) return;
  const tagna = new Set<number>();
  for (const f of s.foretag) if (f.hus !== undefined) {
    const h = husById(s, f.hus);
    if (!h || h.fn !== 'naringshus') { f.hus = undefined; continue; } // huset revs
    const ag = h.tro !== undefined ? kyrkaId(h.tro) : h.ag ?? BYN;
    if (ag !== f.ag) f.ag = ag; // företaget följer huset när det ärvs
    tagna.add(h.id);
  }
  for (const f of s.foretag) if (f.hus === undefined) { const h = husAv(s, f.ag).find(q => !tagna.has(q.id)); if (h) { f.hus = h.id; tagna.add(h.id); } }
  s.foretag = s.foretag.filter(f => f.hus !== undefined || f.ag === BYN || foretagare(s, f.ag) || troAvAgare(s, f.ag)); // ägaren dog innan något byggts
}
// en gång per dygn (ett år i spelet): den som tjänar mest på det startar ett företag, och det som sålts glöms
export function foretagDygn(s: State) {
  for (const f of foretagOf(s)) { for (const v in f.salt) f.salt[v] *= 1 - FORETAG.minne; if (f.intakt !== undefined) f.intakt *= 1 - FORETAG.minne; }
  const b = bastaStart(s);
  if (b) starta(s, b.ag, b.verk);
}
