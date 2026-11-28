// ---------- företagen (steg 14.1.5, Ekonomi och handel: Företagen, i fliken Människan) ----------
// Ett företag är en rad i s.foretag: ägaren (en person, byn eller en kyrka), huset och verksamheterna (rader i VERKSAMHETER).
// Det har ingen egen kassa: det som säljs är ägarens, och det som betalas blir ägarens. Att starta ett är ett projekt med en
// poäng: vad byborna och gästerna skulle köpa som ingen säljer, gånger vad den som startar kan, minus varorna, arbetet och
// huset, gånger hens läggning. Huset byggs med byggsystemet (naringshus i BYGGNADER), och borden ställs dit som andra bord.
import { Person, State } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, EGENSKAP, ageOf, alive, byId, count, familjOf, forstaGang, living, log, stat } from './folk';
import { gridOf, housesOf, husById, type Hus, type Rum } from './byggnad';
import { type Akut, foretagKrok, husKostnad } from './byggnader';
import { BYN, kyrkaId } from './egendom';
import { kronika } from './historik';
import { ledareOf } from './styre';
import { prastOf } from './kult';
import { behovAv, DELA, payable, personPart, saknarNu } from './behov';
import { grundvarde, formogenheter } from './varde';
import { kroppensMat } from './ekonomi';
import { amountOf, ownsAmount, ownsId } from './lager';
import { rusLust } from './rus';
import { FOOD } from './saker';
import { MALTIDSNIVA, maltidsNiva } from './ratter';
import { DRYCKER, dryckAv, vatskaAv, type VatskaId } from './vatskor';
import { DAGSVERK, egetVarde } from './dagsarbete';
import { rumTaggar } from './rum';
import { foretagBord, isKlar, stationerOf, stationRum, storlek } from './stationer';
import { RECEPT } from './recept';

export const FORETAG = balans('foretag', {
  humor: 20, // en hel punkt bättre humör under en tanke är värd så många silver för kunden
  dryck: 0.6, // så många silver är en kvällsdryck värd mer än drycken själv, gånger hur gärna den tas
  dryckVarde: 0.5, // så många silver är själva drycken värd
  andel: 0.5, // så stor del av måltiderna och dryckerna räknar man med att kunderna köper
  del: 0.5, // så stor del av kundens vinst räknar man med att kunna ta betalt för
  saknarDygn: 0.2, // så ofta per dygn (år i spelet) köper man var sak man saknar
  timKund: 0.04, // så många timmar arbete tar en kund
  ar: 30, // huset ska vara betalt på så många dygn (år i spelet)
  pung: 15, // det kunden kan betala med räcker så många dygn
  bordKunder: 6, // så många platser vid bord vill ett företag högst ha
  samtidigt: 0.15, // så stor del av dygnets kunder kommer samtidigt
  akut: 0.6, // hur akut ett företags hus är att bygga (familjens hus är HUS.familjAkut)
  minne: 0.5, // så mycket av det företaget säljer på ett dygn glöms till nästa
});
// dag = dagens köp och de som ville men avstod, gap = hur mycket finare rum dagens kunder väntat sig, enkelt = medlet (konkurrens.ts)
// resultat = medlet av vinsten mot vad ägaren kunde tjäna på annat, bok = det som var kvar sedan förra dygnet, salu = till salu sedan (stangning.ts)
// byar = ryktet i grannbyarna, efter radens nummer (foretagsrykte.ts)
// det företaget sålt: n = kunder och v = värdet, per dygn (glöms med FORETAG.minne)
export interface Foretag { id: number; ag: number; hus?: number; verk: string[]; namn: string; t: number; salt?: Record<string, number>; saltVara?: Record<string, number>; /* det sålda per vara, halveras varje dygn (steg 15.1.13) */ vantat?: Record<string, number>; /* kunderna per dygn det väntade sig när verksamheten togs upp, per verksamhet och vara (steg 15.1.13) */ intakt?: number; vinst?: number; pris?: Record<string, number>; ko?: import('./kassa').KoRad[]; lamnat?: number; kallad?: number; dag?: Record<string, { salt?: number; nej?: number[]; gatt?: number }>; gap?: { n: number; v: number; vem: number[] }; enkelt?: number; byar?: Record<number, { v: number; n: number }>; bok?: { vinst: number; kunder: number }; resultat?: number; oppnat?: number; salu?: number }
export const foretagOf = (s: State): Foretag[] => s.foretag ?? [];
export const foretagAvHus = (s: State, hus?: number) => hus === undefined ? undefined : foretagOf(s).find(f => f.hus === hus);

// ---------- verksamheterna ----------
// En verksamhet: rummet den kräver (en rumstyp, rum.ts), vad den säljer, och vad kunden p vinner på en vara mot att ta den hemma.
export interface Verksamhet {
  namn: string; sym: string;
  rum: string | readonly string[]; // rumstypen (någon av dem)
  sak?: string; // stationen den kräver utöver disken (huset rymmer den, och utbyggnaden kostar den)
  varor: (s: State, ag?: number) => string[]; // det som går att sälja i byn nu (av ägaren ag, när det gäller en start)
  noje: (s: State, p: Person, k: string) => number; // det kunden vinner mot att ta det hen har hemma, i silver
  snitt: (k: string) => number; // det en vanlig kund vinner, i silver
  grund?: (k: string) => number; // varans värde när den inte är en sak i förrådet
  ats?: true; // äts och dricks i rummet
  hylla?: true; // det som ligger på varubordet i rummet (affar.ts)
  vatska?: true; // säljs ur ett kärl
  perDygn: (s: State, p: Person, k?: string) => number; // så många gånger per dygn kunden skulle kunna köpa (varan k: affären räknar per vara)
  gaster?: (s: State, pris: number) => number; // så många gäster per dygn väntas vilja ha den och kunna betala priset
  egen?: { har: (s: State, f: Foretag) => string[]; ge: (s: State, f: Foretag, p: Person, k: string) => void }; // det som inte är en sak i förrådet (verksamheter.ts)
  kunnande: (p: Person) => number; // hur väl den som driver den kan den, 1 = vanligt
}
// den bästa maten p har hemma
const hemmaNoje = (s: State, p: Person) => FOOD.reduce((m, k) => { const n = MALTIDSNIVA[maltidsNiva(k)].humor; return n > m && ownsAmount(s, p, k) >= 1 ? n : m; }, 0);
export const skick = (n: number) => clamp(0.6 + n / 25, 0.6, 1.4);
export const VERKSAMHETER: Record<string, Verksamhet> = {
  servering: {
    namn: 'Servering', sym: '🍽', rum: 'matsal', sak: 'bord',
    varor: s => FOOD.filter(k => MALTIDSNIVA[maltidsNiva(k)].humor > 0 && amountOf(s, k) >= 1),
    noje: (s, p, k) => FORETAG.humor * Math.max(0, MALTIDSNIVA[maltidsNiva(k)].humor - hemmaNoje(s, p)),
    snitt: k => FORETAG.humor * MALTIDSNIVA[maltidsNiva(k)].humor, ats: true,
    perDygn: (s, p) => kroppensMat(p, s.now),
    kunnande: p => skick((p.skill.matlagning + p.skill.handel) / 2),
  },
  dryck: {
    namn: 'Dryck', sym: '🍺', rum: 'matsal', sak: 'bord',
    varor: s => DRYCKER.filter(v => dryckAv(v)?.alkohol && vatskaAv(s, v as VatskaId) >= 1),
    noje: (_s, p, k) => FORETAG.dryck * (dryckAv(k)?.kvall ?? 0.5) * rusLust(_s, p),
    snitt: k => FORETAG.dryck * (dryckAv(k)?.kvall ?? 0.5), grund: () => FORETAG.dryckVarde, vatska: true,
    perDygn: (s, p) => ageOf(p, s.now) >= ALDER.vuxen ? 1 : 0,
    kunnande: p => skick((p.skill.matlagning + p.skill.handel) / 2),
  },
  // affären (steg 14.1.8, affar.ts): kunden vinner så mycket mer hen behöver saken än den som har den över
  affar: {
    namn: 'Affär', sym: '👛', rum: 'affar', sak: 'varubord', hylla: true,
    // det någon saknar (maten som all mat), och som ägaren har över; utan ägare det som finns i byn (steg 15.1.12)
    varor: (s, ag) => {
      const sak = new Set(living(s).flatMap(p => p.gast ? [] : saknarNu(s, p))), mat = sak.has('mat'), q = ag !== undefined && ag > 0 ? byId(s, ag) : undefined;
      const har = q ? personPart(s, q).over([]).filter(w => w.n >= 1).map(w => w.k) : undefined;
      return (har ?? [...sak, ...mat ? FOOD : []].filter(k => amountOf(s, k) >= 1)).filter(k => grundvarde(k) > 0 && (sak.has(k) || mat && FOOD.includes(k)));
    },
    noje: (s, p, k) => grundvarde(k) * Math.max(0, behovAv(s, p, k) - DELA.over),
    snitt: k => grundvarde(k) * (DELA.saknar - DELA.over), grund: k => grundvarde(k) * DELA.over,
    perDygn: (s, p, k) => { if (p.gast) return 0; const sak = saknarNu(s, p); return k === undefined ? sak.length * FORETAG.saknarDygn : sak.includes(k) || FOOD.includes(k) && sak.includes('mat') ? FORETAG.saknarDygn : 0; }, // per vara: den som saknar just den
    kunnande: p => skick(p.skill.handel),
  },
};
// företagets sorts namn efter verksamheterna: servering och dryck tillsammans är en taverna
// ---------- huset rymmer verksamheterna (steg 15.1.15) ----------
// stationerna verksamheterna verk behöver: disken och var och ens sak, en av varje sort
export const foretagStationer = (verk: readonly string[]) => [...new Set(['disk', ...verk.flatMap(v => VERKSAMHETER[v]?.sak ? [VERKSAMHETER[v].sak!] : [])])];
// golvrutorna de behöver: varje station och golvet framför den, och rutan innanför dörren
export const foretagPlats = (verk: readonly string[]) => 1 + foretagStationer(verk).reduce((n, k) => { const { w, h } = storlek(k); return n + w * (h + 1); }, 0);
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
// så många gäster per dygn väntas till byns företag (foretagsgast.ts)
export const gastFlode: ((s: State, pris: number) => number)[] = []; // de som kan betala priset (steg 15.1.13)
// vad kunden p kan betala per dygn: silvret och det hen har över, ska räcka en tid
export const kundPung = (s: State, p: Person) => payable(s, p, []).reduce((a, w) => a + (w.t ? 0 : w.n * grundvarde(w.k)), 0);
// det kunderna skulle ge per dygn utöver varans värde om de kunde köpa verksamheten v av ag: antalet kunder och vinsten
// ett företag har öppnat: det har sitt hus och en disk i rummet (steg 15.1.13)
const harDisk = (s: State, f: Foretag) => { const rum = foretagRum(s, f); return rum.length > 0 && stationerOf(s).some(t => t.k === 'disk' && isKlar(t) && rum.includes(stationRum(s, t)!)); };
export function efterfragan(s: State, v: string, ag: number): { kunder: number; vinst: number; perVara: Record<string, number> } {
  const V = VERKSAMHETER[v], varor = V.varor(s, ag), fam = familjOf(s, ag), perVara: Record<string, number> = {}, vinstVara: Record<string, number> = {};
  if (!varor.length) return { kunder: 0, vinst: 0, perVara };
  // ägarens familj köper inte av hen (som i kassan, steg 15.1.12); affären räknas per vara, de andra efter den bästa
  const kund = (p: Person, k: string, nj: number) => { const pris = (V.grund?.(k) ?? grundvarde(k)) + nj * FORETAG.del, n = Math.min(V.perDygn(s, p, k) * FORETAG.andel, kundPung(s, p) / FORETAG.pung / Math.max(0.1, pris)); perVara[k] = (perVara[k] ?? 0) + n; vinstVara[k] = (vinstVara[k] ?? 0) + n * nj * FORETAG.del; };
  for (const p of living(s)) {
    if (p.id === ag || fam.includes(p) || ageOf(p, s.now) < ALDER.hjalper) continue;
    if (V.hylla) { // per vara, och maten som en vara: den bästa maten hen saknar
      let mk = '', mn = 0;
      for (const k of varor) { const nj = V.noje(s, p, k); if (nj <= 0) continue; if (!FOOD.includes(k)) kund(p, k, nj); else if (nj > mn) { mn = nj; mk = k; } }
      if (mn > 0) kund(p, mk, mn);
      continue;
    }
    let bast = 0, bk = '';
    for (const k of varor) { const nj = V.noje(s, p, k); if (nj > bast) { bast = nj; bk = k; } }
    if (bast > 0) kund(p, bk, bast);
  }
  // gästerna som kan betala det en vanlig kund betalar (steg 15.1.13)
  const k0 = varor[0]!, g = V.gaster?.(s, (V.grund?.(k0) ?? grundvarde(k0)) + V.snitt(k0) * FORETAG.del) ?? 0;
  if (g > 0) { perVara[k0] = (perVara[k0] ?? 0) + g; vinstVara[k0] = (vinstVara[k0] ?? 0) + g * V.snitt(k0) * FORETAG.del; }
  const lart = s.foretagLart?.[v]; // det byn lärt sig av ett stängt företag (stangning.ts)
  if (lart !== undefined) for (const k in perVara) { perVara[k] *= lart; vinstVara[k] *= lart; }
  // det som redan säljs (steg 15.1.13): ett öppet företag med det det sålt (affären per vara), ett som inte öppnat med det det
  // väntade sig när det startade, och bara från samma vara
  for (const f of foretagOf(s)) {
    if (!f.verk.includes(v)) continue;
    const oppet = harDisk(s, f), sald = (k: string) => V.hylla ? (oppet ? f.saltVara?.[k] ?? 0 : f.vantat?.[`${v}:${k}`] ?? 0) : 0;
    if (V.hylla) for (const k in perVara) { const d = Math.min(perVara[k]!, sald(k)); if (d > 0) { vinstVara[k] *= 1 - d / perVara[k]!; perVara[k] -= d; } }
    else {
      const tot = Object.values(perVara).reduce((a, n) => a + n, 0), d = Math.min(tot, oppet ? f.salt?.[v] ?? 0 : f.vantat?.[v] ?? 0);
      if (tot > 0 && d > 0) for (const k in perVara) { vinstVara[k] *= 1 - d / tot; perVara[k] *= 1 - d / tot; }
    }
  }
  return { kunder: Object.values(perVara).reduce((a, n) => a + n, 0), vinst: Object.values(vinstVara).reduce((a, n) => a + n, 0), perVara };
}
// det företaget väntar sig när verksamheterna verk tas upp (steg 15.1.13): per verksamhet, och för affären per vara
function vantas(s: State, ag: number, verk: string[]) {
  const ut: Record<string, number> = {};
  for (const v of verk) { const e = efterfragan(s, v, ag); ut[v] = e.kunder; if (VERKSAMHETER[v].hylla) for (const k in e.perVara) ut[`${v}:${k}`] = e.perVara[k]!; }
  return ut;
}
export interface Forsok { ag: number; verk: string[]; poang: number; kunder: number }
// vad det är värt för ag att starta verksamheterna verk: vinsten per dygn minus arbetet och huset
export function startPoang(s: State, ag: number, verk: string[], kostar = husKostnad(foretagPlats(verk))): Forsok {
  const p = foretagare(s, ag);
  if (!p) return { ag, verk, poang: 0, kunder: 0 };
  let kunder = 0, ut = -kostar / FORETAG.ar;
  for (const v of verk) { const e = efterfragan(s, v, ag); kunder += e.kunder; ut += e.vinst * VERKSAMHETER[v].kunnande(p) - e.kunder * FORETAG.timKund * egetVarde(s, p); }
  // läggningen: den som är driftig och modig startar hellre
  const lagg = clamp((stat(p, 'flit', s.now) + stat(p, 'mod', s.now) + stat(p, 'karisma', s.now)) / (3 * EGENSKAP.mitt), 0.3, 1.7);
  return { ag, verk, poang: ut > 0 ? ut * lagg : ut, kunder };
}
// alla som kan starta ett företag nu: vuxna som inte har något, byn och kyrkorna, om de äger så mycket att det minsta huset går att betala
export function startare(s: State): number[] {
  const f = formogenheter(s), kostar = Math.min(...Object.keys(VERKSAMHETER).map(v => husKostnad(foretagPlats([v])))), har = new Set(foretagOf(s).map(q => q.ag)), ut: number[] = [];
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
// det bästa tillägget: ett företag som har sitt hus tar upp en verksamhet till, med samma poäng som ett nytt. Det kostar stationen
// som inte redan finns, och golvet huset behöver byggas ut med för att rymma den (steg 15.1.15)
export interface Utok extends Forsok { f: Foretag }
export const foretagGolv = (s: State, f: Foretag) => foretagRum(s, f).reduce((n, r) => n + r.tiles.length, 0);
export const utokKostnad = (s: State, f: Foretag, v: string) => {
  const har = foretagStationer(f.verk), sak = VERKSAMHETER[v].sak, golv = foretagGolv(s, f), behov = foretagPlats([...f.verk, v]);
  return (sak && !har.includes(sak) ? sakKostnad(sak) : 0) + (behov > golv ? husKostnad(behov) - husKostnad(golv) : 0);
};
const sakKostnad = (k?: string) => Object.entries((RECEPT as Record<string, { av?: Record<string, number> }>)[k ?? '']?.av ?? {}).reduce((a, [q, n]) => a + n * grundvarde(q), 0);
export function bastaUtok(s: State): Utok | undefined {
  let bast: Utok | undefined;
  for (const f of foretagOf(s)) if (foretagRum(s, f).length) for (const v of Object.keys(VERKSAMHETER)) if (!f.verk.includes(v)) {
    const q = startPoang(s, f.ag, [v], utokKostnad(s, f, v));
    if (q.poang > (bast?.poang ?? 0)) bast = { ...q, f };
  }
  return bast;
}
export function utoka(s: State, f: Foretag, verk: string[]) {
  f.vantat = { ...f.vantat, ...vantas(s, f.ag, verk) };
  f.verk = [...f.verk, ...verk];
  count(s, 'foretagUtok'); for (const v of verk) count(s, 'foretagUtok_' + v);
  const p = foretagare(s, f.ag);
  log(s, `${f.namn} tog upp något nytt: ${verk.map(v => VERKSAMHETER[v].namn.toLowerCase()).join(' och ')}.`, 'world', p ? [p.id] : []);
}
export function starta(s: State, ag: number, verk: string[]): Foretag {
  const vantat = vantas(s, ag, verk); // innan företaget finns: det drar inte av från sig självt
  const f: Foretag = { id: (s.nextForetag = (s.nextForetag ?? 0) + 1), ag, verk, namn: `${agNamn(s, ag)} ${sortNamn(verk).toLowerCase()}`, t: s.now, vantat };
  (s.foretag ??= []).push(f);
  count(s, 'foretagStart'); for (const v of verk) count(s, 'foretagStart_' + v);
  const p = foretagare(s, ag);
  log(s, `${p?.name ?? 'Byn'} bestämde sig för att starta ett företag: ${f.namn}.`, 'world', p ? [p.id] : []);
  if (forstaGang(s, 'foretag')) kronika(s, `Byns första företag: ${f.namn}.`, 'bygge');
  return f;
}
// ---------- huset ----------
// företaget som saknar hus får ägarens lediga; annars vill byggsystemet ha ett (naringshus)
// Huset rymmer stationerna verksamheterna behöver (steg 15.1.15): ett hus som är för litet byggs ut (Akut.hus)
const vem = (s: State, f: Foretag) => (tr => tr ? { tro: tr.id } : f.ag > 0 ? { ag: f.ag } : {})(troAvAgare(s, f.ag));
foretagKrok.akut = s => {
  const f = foretagOf(s).find(q => q.hus === undefined && foretagare(s, q.ag));
  if (f) return { v: FORETAG.akut, plats: foretagPlats(f.verk), ...vem(s, f) };
  for (const q of foretagOf(s)) {
    if (q.hus === undefined || !foretagare(s, q.ag)) continue;
    const golv = foretagGolv(s, q), behov = foretagPlats(q.verk);
    if (golv > 0 && behov > golv) return { v: FORETAG.akut, plats: behov - golv, hus: q.hus, ...vem(s, q) };
  }
  return { v: 0, plats: 0 };
};
foretagKrok.namn = (s, a: Akut) => foretagOf(s).find(q => a.hus !== undefined ? q.hus === a.hus : q.hus === undefined && (a.tro !== undefined ? q.ag === kyrkaId(a.tro) : q.ag === (a.ag ?? BYN)))?.namn ?? 'Företaget';
export const foretagRum = (s: State, f: Foretag): Rum[] => f.hus === undefined || !husById(s, f.hus)?.klar ? [] : gridOf(s).rooms.filter(r => r.hus === f.hus && r.tiles.length);
// så många kunder väntas samtidigt, och så många platser vid bord vill företaget ha
export const vantadeKunder = (s: State, f: Foretag) => f.verk.reduce((n, v) => n + Math.max(f.salt?.[v] ?? 0, living(s).length * FORETAG.andel), 0);
foretagBord.rum = s => foretagOf(s).flatMap(f => f.verk.some(v => rumAv(v).includes('matsal')) ? foretagRum(s, f).slice(0, 1).map(r => ({ r, folk: Math.max(2, Math.min(FORETAG.bordKunder, Math.round(vantadeKunder(s, f) * FORETAG.samtidigt * 2))) })) : []);
const rumAv = (v: string): readonly string[] => (r => r === undefined ? [] : typeof r === 'string' ? [r] : r)(VERKSAMHETER[v]?.rum);
// verksamheterna som är öppna: rummet har sin rumstyp
export function oppna(s: State, f: Foretag): string[] {
  const rum = foretagRum(s, f);
  return f.verk.filter(v => rum.some(r => rumAv(v).some(q => rumTaggar(s, r).has(q as never))));
}
// ---------- de anställda (steg 14.1.7, dagsarbetet) ----------
// det en kund ger utöver varan, efter det som sålts
export const saltAv = (f: Foretag) => Object.values(f.salt ?? {}).reduce((a, b) => a + b, 0);
export const kundVinst = (f: Foretag) => Math.max(0, saltAv(f) >= 0.5 ? (f.vinst ?? 0) / saltAv(f) : 1);
// kunderna som gått utan att bli betjänade är det ägarens timmar inte räckte till: en timme till vid disken är värd det de hade gett
DAGSVERK.foretag = { namn: 'Företaget', sym: '💰', gor: (_s, a, _p, tk) => (tk?.act === 'betjana' || tk?.act === 'stallaFram') && tk.ref === a.mal,
  bud: s => foretagOf(s).flatMap(f => {
    const g = f.lamnat ?? 0, p = foretagare(s, f.ag);
    return g > 0 && p && foretagRum(s, f).length ? [{ av: f.ag, antal: 1, tim: kundVinst(f) / FORETAG.timKund, tak: Math.floor(ownsId(s, f.ag, 'silver') + 1e-9), timMax: g * FORETAG.timKund, mal: f.id, kan: (q: Person) => q.id !== p.id && !familjOf(s, p.id).includes(q) }] : [];
  }) };
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
// det som görs per dygn före det nya företaget (konkurrens.ts)
export const dygnet: ((s: State) => void)[] = [];
// en gång per dygn (ett år i spelet): den som tjänar mest på det startar ett företag, och det som sålts glöms
export function foretagDygn(s: State) {
  for (const g of dygnet) g(s);
  for (const f of foretagOf(s)) { for (const v in f.salt) f.salt[v] *= 1 - FORETAG.minne; for (const k in f.saltVara) f.saltVara[k] *= 1 - FORETAG.minne; if (f.intakt !== undefined) f.intakt *= 1 - FORETAG.minne; if (f.vinst !== undefined) f.vinst *= 1 - FORETAG.minne; if (f.lamnat !== undefined) f.lamnat *= 1 - FORETAG.minne; }
  const b = bastaStart(s);
  const u = bastaUtok(s);
  if (u && u.poang > (b?.poang ?? 0)) utoka(s, u.f, u.verk);
  else if (b) starta(s, b.ag, b.verk);
}
