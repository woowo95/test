import { laggFram } from './rost';
import { blocked, freeNear, roomAt } from './byggnad';
import { kanGa } from './halsa';
import { ACTS } from './handlingar';
// Framträdandena (steg 4.3.2, "Kulturen i fas 4" i designdokumentet): på kvällen när det är mörkt uppträder någon vid elden
// (eller i långhuset när det är kallt eller regnar) för de andra, högst en gång per kväll. Den enklaste formen, ett kväde,
// finns från början, så att även en liten by har framträdanden. Formerna är rader i registret FRAMTRADANDEN. Framträdandet
// ger publiken glädje (mer ju skickligare och mer karismatisk den som uppträder är) och får en kort text som beskriver det.
// Ett framträdande i taget, i s.fram; de senaste står i s.framtradanden.
import { honom } from './ord';
import { ALDER, KROPP, ageOf, alive, byId, count, getRel, gjort, isSick, living, log, ovning, relKey, stat, think } from './folk';
import { budHindrar } from './kyrka';
import { avbryt } from './lager';
import { INTRYCK, Intryck, IntryckTyp, beratta, intryckOm, kandVikt, paminn, scenVersion } from './rykten';
import { ledareOf, legitimitet, pabud } from './styre';
import { Ting, tingOf } from './agande';
import { tingVarde } from './varde';
import { predika, troende, troNamn, troOf } from './religion';
import type { Tro } from './religion';
import { clamp } from './slump';
import { rnd } from './slump';
import { hourOf } from './tid';
import { coldOf, nederbord, temperature } from './vader';
import { Station, isKlar, redskapVid, stationById, stationerOf, storlekAv, vidStation } from './stationer';
import { kvHaller } from './kvalitet';
import { SAKER } from './saker';
import { balans } from './balans';
import { notis } from './notiser';
import { DAY, HOUR, HOUR_S, MIN, Person, SKILLS, SKILL_NAMES, Skill, State, Task, W, inMap } from './typer';
import { TEKNIK, TEKTAL, knows, learn } from './teknik';
import { goraUtan } from './ord';

export interface FramDef {
  id: string; namn: string;
  text: string; // den korta texten: {namn} är den som uppträder, {hen} hon eller han, och {amne} vad det handlar om
  da: string; // samma i dåtid, för loggen, notisen och redogörelsen (steg 6.7.4); text i presens står i pratbubblan medan det pågår
  min?: number; // så här mycket i färdigheten (FRAM_SKILL) behövs
  instrument?: true; // behöver ett instrument (steg 4.3.2.2)
  bud?: true; // kan bära ett budskap (steg 4.3.2.3, BUDSKAP)
  kval: number; // hur mycket glädje formen ger jämfört med ett kväde
  amne: keyof typeof AMNE; // vad det handlar om
  vrid?: number; // hur mycket mer än ett samtal formen ändrar gärningen i ett minne om en person (steg 10.4.11), 1 om inget står
}
// vad ett framträdande handlar om (FramDef.amne): ger texten till {amne}
const AMNE = {
  minne: (s: State, p: Person) => minneAmne(s, p) ?? 'de första som kom till sjön',
  byn: () => 'det byn har klarat och det som väntar',
  kunskap: () => 'skogen, sjön och arbetet',
  handelse: (s: State, p: Person) => minneAmne(s, p) ?? 'när byn kom till sjön',
};
export const FRAMTRADANDEN: FramDef[] = [
  { id: 'kvade', namn: 'Kväde', text: '{namn} kväder vid elden om {amne}, och de andra lyssnar.', da: '{namn} kvad vid elden om {amne}, och de andra lyssnade.', bud: true, kval: 1, amne: 'minne', vrid: 2 },
  { id: 'tal', namn: 'Tal', text: '{namn} håller ett tal om {amne}.', da: '{namn} höll ett tal om {amne}.', bud: true, min: 2, kval: 0.8, amne: 'byn' },
  { id: 'forelasning', namn: 'Föreläsning', text: '{namn} lär de andra vad {hen} vet om {amne}.', da: '{namn} lärde de andra vad {hen} visste om {amne}.', min: 4, kval: 0.6, amne: 'kunskap' },
  { id: 'teater', namn: 'Teater', text: '{namn} spelar upp en berättelse för de andra om {amne}, med röster och rörelser.', da: '{namn} spelade upp en berättelse för de andra om {amne}, med röster och rörelser.', bud: true, min: 6, kval: 1.3, amne: 'handelse', vrid: 2.5 },
  { id: 'sang', namn: 'Sång', text: '{namn} sjunger om {amne} till {inst}.', da: '{namn} sjöng om {amne} till {inst}.', instrument: true, bud: true, kval: 1.2, amne: 'minne', vrid: 2 },
  { id: 'musik', namn: 'Musik', text: '{namn} spelar på {inst} för de andra.', da: '{namn} spelade på {inst} för de andra.', instrument: true, kval: 1.2, amne: 'minne' },
];
// instrumenten (steg 4.3.2.2): saker (saker.ts) som ligger vid scenen. kval gånger formens, ord = i texten, sang = man kan
// sjunga till det (till flöjten kan man bara spela). Lyran är svårast att göra och ger mest glädje
export interface InstrumentDef { kval: number; ord: string; sang?: true }
export const INSTRUMENT: Record<string, InstrumentDef> = {
  trumma: { kval: 1, ord: 'trumman', sang: true },
  benflojt: { kval: 1, ord: 'benflöjten' },
  lyra: { kval: 1.4, ord: 'lyran', sang: true },
};
export const FRAM_AV: Record<string, FramDef> = Object.fromEntries(FRAMTRADANDEN.map(d => [d.id, d]));
// färdigheten som gör framträdandet bättre och som övas när man uppträder
export const FRAM_SKILL: Skill = 'skaldskap'; // steg 4.3.2.5; övas också av berättelser i samtalen (samtal.ts)

export const FRAM = balans('framtradande', {
  fran: 18, till: 23, // ett framträdande börjar på kvällen mellan dessa timmar, när det är mörkt
  // kallelsen (steg 10.7.9): lusten att uppträda är ett tal per timme, viljaTim gånger kvaliteten (färdigheten och karisman),
  // gånger tiden sedan personen senast prövade, räknat tidigast från klockan fran samma kväll
  viljaTim: 0.1,
  vanta: 15, // minuter: den som kallat väntar så här länge vid scenen eller elden innan framträdandet börjar
  med: 0.8, medTycke: 0.5, // vid kallelsen vill var och en lyssna med chansen med × (1 + medTycke × tycket om den som uppträder / 100)
  ingen: 0.05, // den som skulle uppträda och som ingen kom och lyssnade på blir så här ledsen, i gladjeTim timmar
  sent: 10, // minuter: så här nära slutet går ingen ny dit för att lyssna
  minuter: 30, spann: 30, // ett framträdande varar så här många minuter från att det börjar, plus upp till spann
  gladje: 0.06, gladjeTim: 10, // publikens glädje: gladje × formens kval × kvaliteten, i så här många timmar
  egen: 0.05, // den som uppträder blir så här glad när publiken är minst publik
  op: 3, // publiken tycker så här mycket bättre om den som uppträder, gånger (kvaliteten − 0,5)
  ovning: 0.3, // övning i färdigheten per timme man uppträder
  sparas: 20, // så här många framträdanden sparas i s.framtradanden
  slit: 0.03, // instrumentet slits så här mycket per framträdande (steg 4.3.2.2)
  // budskapen (steg 4.3.2.3): hur gärna den som uppträder väljer vart och ett: om en person efter det starkaste intrycket
  // (styrkan gånger budPerson), om ledaren efter relationen (|op| / 100 gånger budStyre) och om tron efter tron (styrkan / 100 gånger budTro)
  budPerson: 1, budStyre: 1.5, budTro: 1,
  rykte: 0.8, // ... om en person: var och en som lyssnar hör ryktet med chansen rykte × kvaliteten (rykten.ts)
  styre: 4, // ... om ledaren: publiken tycker så här mycket bättre (hyllning) eller sämre (hån) om ledaren, gånger kvaliteten
  hanOp: 10, // den som hånar ledaren: ledaren tycker så här mycket sämre om hen
  // beställda framträdanden (steg 4.3.2.4): ledaren betalar den som ska uppträda med en hel sak ur sin egen egendom för att
  // framträdandet hyllar hen. Chansen är bestall × (1 − legitimiteten); den som uppträder tackar ja om hen tycker minst
  // bestallOp om ledaren, och tycker sedan bestallTack bättre om hen
  bestall: 0.5, bestallOp: -20, bestallTack: 3,
  hanTro: 8, // ... hånar gudarna (steg 10.3.22): en troende som hör får så här mycket svagare tro, gånger kvaliteten, och tycker styre gånger kvaliteten sämre om den som hånar
  tro: 40, // ... om tron: framträdandet övertygar som så här många samtal, gånger kvaliteten (predika i religion.ts)
  // föreläsningens ämne (steg 10.6.9): en teknik på nivå 1 eller 2 eller en färdighet där åhöraren ligger minst kunskapGap under
  // föreläsaren. Åhörarna kommer framåt utan slump som lar lyckade samtal per timme, gånger kvaliteten: i tekniken
  // TEKTAL.larFramsteg × TEKTAL.larBas per samtal, i färdigheten larSkill per samtal, aldrig förbi föreläsaren minus kunskapGap
  lar: 4, kunskapGap: 2, larSkill: 0.25,
});
// ---------- föreläsningens ämne (steg 10.6.9) ----------
export type FramLar = { tek: string } | { skill: Skill };
const kanLara = (s: State, q: Person) => !q.gast && alive(q) && ageOf(q, s.now) >= ALDER.lar;
// kan q lära sig ämnet x av p
export function larAv(p: Person, q: Person, x: FramLar) {
  if ('tek' in x) { const t = TEKNIK.find(k => k.id === x.tek)!; return !knows(q, t.id) && t.krav.every(k => knows(q, k)); }
  return q.skill[x.skill] < p.skill[x.skill] - FRAM.kunskapGap;
}
// ämnet: det som flest i byn saknar och kan lära sig av p, en teknik före en färdighet när de är lika många; inget om ingen kan lära sig något
export function forelasAmne(s: State, p: Person): FramLar | undefined {
  const folk = s.people.filter(q => q !== p && kanLara(s, q));
  let bast: FramLar | undefined, n = 0;
  const prova = (x: FramLar) => { const m = folk.filter(q => larAv(p, q, x)).length; if (m > n) { n = m; bast = x; } };
  for (const t of TEKNIK) if (t.niva <= TEKTAL.larNiva && knows(p, t.id)) prova({ tek: t.id });
  for (const k of SKILLS) if (k !== 'narstrid' && k !== 'traff') prova({ skill: k });
  return bast;
}
const larText = (x: FramLar) => 'tek' in x ? `hur man kan ${goraUtan(TEKNIK.find(k => k.id === x.tek)!)}` : SKILL_NAMES[x.skill].toLowerCase();
// en åhörare b kommer framåt i ämnet: h timmar föreläsning med kvaliteten q. Sant när b lärde sig tekniken klart
function forelasLar(s: State, p: Person, b: Person, x: FramLar, h: number, q: number) {
  if (!kanLara(s, b) || !larAv(p, b, x)) return false;
  const n = FRAM.lar * h * q; // lika många lyckade samtal
  if ('skill' in x) { b.skill[x.skill] = Math.min(p.skill[x.skill] - FRAM.kunskapGap, b.skill[x.skill] + n * FRAM.larSkill); count(s, 'forelasSkill'); return false; }
  const t = TEKNIK.find(k => k.id === x.tek)!;
  b.tek ??= {}; b.tek[t.id] = Math.min(1, (b.tek[t.id] ?? 0) + n * TEKTAL.larFramsteg * TEKTAL.larBas); count(s, 'forelasTek');
  if (b.tek[t.id]! < 1) return false;
  learn(s, b, t, p); return true;
}

// framträdandet som pågår: formen, den som uppträder, när det kallades (task.ref), började (borjar, efter väntan) och slutar,
// de som ville lyssna vid kallelsen (lista), publiken som varit där och texten
export interface Fram { lar?: FramLar; k: string; p: number; start: number; borjar?: number; igang?: true; lista?: number[]; slut: number; publik: number[]; text: string; da?: string; amne?: string; inst?: string; scen?: number; bud?: Bud; om?: number; ik?: IntryckTyp; betalt?: string; gud?: number; ver?: number } // ver = gärningens version i ett minne om en person, räknad en gång (steg 10.4.11) // betalt = saken ledaren betalade med (steg 4.3.2.4) // bud = budskapet, om = vem det handlar om (personen eller ledaren), ik = intrycket // inst = instrumentet, scen = stationen där det sker
export interface FramMinne { t: number; k: string; p: number; namn: string; text: string; n: number; q: number; inst?: string; bud?: Bud; betalt?: string; hanad?: string[]; scen?: number // scen = stationen (steg 9.2.67)
  // redogörelsen (steg 5.4.7.1), sparad när det händer: numret (raden i loggen och notisen pekar hit), publiken med vad var och
  // en tyckte om den som uppträdde före och efter (r0, r1) och om ledaren (l0, l1, efter en hyllning eller ett hån), glädjen
  // (tanken i humöret), de som fick höra ryktet, de som tron övertygade, ledaren (namnet när budskapet gällde ledaren) och
  // om ingen kom (inget)
  nr?: number; amne?: string; lart?: string[]; publik?: FramLyss[]; glad?: number; rykte?: string[]; tro?: string[]; ledare?: string; om?: string; inget?: true; vrid?: 1 | -1 } // vrid: gärningen gjordes större (1) eller tonades ned (-1), steg 10.4.11
export interface FramLyss { id: number; namn: string; r0: number; r1: number; l0?: number; l1?: number }

// kvällen: tolv timmar bakåt, så att kvällen och natten efter hör till samma dygn
const kvall = (t: number) => Math.floor((t - 12 * HOUR) / DAY);
// kvaliteten: färdigheten och karisman, 0 till 2
export const framKval = (s: State, p: Person) => (p.skill[FRAM_SKILL] * (p.sinnen ?? 1) + stat(p, 'karisma', s.now)) / 20; // skaldskapet och karisman sjunker med hörseln och talet (steg 8.2.2)
// det den som uppträder minns starkast om en annan, helst en död, och hur starkt
function starkast(s: State, p: Person) {
  let bast: Intryck | undefined, b = 0;
  for (const e of p.intryck ?? []) {
    const q = s.people.find(x => x.id === e.om), dod = !q || !alive(q), v = e.v * (dod ? 2 : 1) * kandVikt(s, e.om); // den byn minns väljs oftare (steg 10.6.14)
    if (e.om === p.id || v <= b) continue;
    b = v; bast = e;
  }
  return bast && { e: bast, v: b * bast.c };
}
// texten om intrycket e: "om Åsa, som var generös"
function intryckAmne(s: State, p: Person, e: Intryck) {
  const d = INTRYCK[e.k];
  return `${e.namn}, som ${s.people.some(x => x.id !== p.id && x.name === e.namn && alive(x)) ? 'är' : 'var'} ${d.som ?? d.namn}`;
}
function minneAmne(s: State, p: Person) {
  const b = starkast(s, p);
  return b && intryckAmne(s, p, b.e);
}

// ---------- budskapen (steg 4.3.2.3) ----------
// vad framträdandet vill säga, när ingen beställt något: den som uppträder väljer efter sina egna intryck och sin tro. vikt = hur
// gärna (0 = inte), amne = texten till {amne}, verkan = vad det gör med var och en som lyssnade (q = kvaliteten, med karisman)
const liten = (t: string) => t[0]!.toLowerCase() + t.slice(1);
export type Bud = 'person' | 'hylla' | 'hana' | 'tro' | 'hanaGud';
interface BudDef { namn: string; vikt: (s: State, p: Person, x: BudLage) => number; amne: (s: State, p: Person, x: BudLage) => string; verkan: (s: State, p: Person, b: Person, q: number, f: Fram) => boolean | void } // verkan: sant när ryktet spreds
interface BudLage { e?: Intryck; ev: number; l?: Person; op: number; gud?: Tro; gudOp?: number } // gud = tron p tycker sämst om (inte p:s egen), gudOp = vad p i snitt tycker om dess troende
// det tillåtna hånet: 1 = fritt, 0 = förbjudet av ledaren (påbudet Hån, styre.ts)
export const hanTillat = (s: State) => s.styre?.hanForbud ? 0 : (1 + pabud(s, 'han')) / 2; // ett förbud är ett förbud (steg 8.3.13)
// publikens relation till ledaren ändras med d
function stod(s: State, b: Person, l: Person | undefined, d: number) {
  if (!l || b === l) return;
  const r = getRel(s, b, l);
  r.op = clamp(r.op + d, -100, 100);
}
export const BUDSKAP: Record<Bud, BudDef> = {
  person: { namn: 'Om en person', vikt: (_s, _p, x) => x.e ? x.ev * FRAM.budPerson : 0, amne: (s, p, x) => intryckAmne(s, p, x.e!),
    verkan: (s, p, b, q, f) => { const e = intryckOm(p, f.om!, f.ik); if (e && e.om !== b.id && rnd(s, 'fram', b) < FRAM.rykte * q) { beratta(s, p, b, e, getRel(s, p, b), f.ver); paminn(s, b, e.om, e.bev); return true; } } },
  hylla: { namn: 'Hyllar ledaren', vikt: (_s, _p, x) => x.l && x.op > 0 ? x.op / 100 * FRAM.budStyre : 0, amne: (_s, _p, x) => `${x.l!.name}, som leder byn väl`,
    verkan: (s, _p, b, q, f) => stod(s, b, byId(s, f.om!), FRAM.styre * q) },
  hana: { namn: 'Hånar ledaren', vikt: (s, _p, x) => x.l && x.op < 0 ? -x.op / 100 * FRAM.budStyre * hanTillat(s) : 0, amne: (_s, _p, x) => `${x.l!.name}, som tror sig vara förmer än de andra`,
    verkan: (s, _p, b, q, f) => stod(s, b, byId(s, f.om!), -FRAM.styre * q) },
  tro: { namn: 'Om tron', vikt: (s, p) => troOf(s, p.tro) ? (p.troStyrka ?? 0) / 100 * FRAM.budTro : 0, amne: (s, p) => { const tr = troOf(s, p.tro)!; return `${liten(tr.bakom)}, som vill ${tr.vill}`; },
    verkan: (s, p, b, q) => predika(s, p, b, getRel(s, p, b), 'berättelse', FRAM.tro * q) },
  // hånar gudarna (steg 10.3.22): den som inte delar en tro och tycker illa om dess troende. Den som följer budet ingen hånar gudarna väljer det inte
  hanaGud: { namn: 'Hånar gudarna', vikt: (s, p, x) => x.gud && (x.gudOp ?? 0) < 0 && !budHindrar(s, p, 'ingenHan') ? -(x.gudOp ?? 0) / 100 * FRAM.budTro : 0,
    amne: (_s, _p, x) => `gudarna i ${liten(troNamn(x.gud!))}`,
    verkan: (s, p, b, q, f) => { if (b.tro === undefined || b.tro !== f.gud) return; b.troStyrka = Math.max(0, (b.troStyrka ?? 0) - FRAM.hanTro * q); stod(s, b, p, -FRAM.styre * q); return true; } },
};
const BUD_LIST = Object.keys(BUDSKAP) as Bud[];
// budskapet p väljer till formen d, eller inget (formen bär inget, eller p har inget att säga)
function budVal(s: State, p: Person, d: FramDef) {
  if (!d.bud) return undefined;
  const b = starkast(s, p), l = ledareOf(s), x: BudLage = { e: b?.e, ev: b?.v ?? 0, l: l && l !== p ? l : undefined, op: l && l !== p ? getRel(s, p, l).op : 0 };
  for (const tr of s.tron ?? []) { // tron p tycker sämst om: snittet av vad p tycker om dess troende
    if (tr.id === p.tro) continue;
    const t = troende(s, tr).filter(q => q !== p);
    if (!t.length) continue;
    const op = t.reduce((a, q) => a + (s.rels[relKey(p.id, q.id)]?.op ?? 0), 0) / t.length;
    if (op < (x.gudOp ?? 0)) { x.gud = tr; x.gudOp = op; }
  }
  const w = BUD_LIST.map(k => Math.max(0, BUDSKAP[k].vikt(s, p, x))), sum = w.reduce((a, v) => a + v, 0);
  if (sum <= 0) return undefined;
  let r = rnd(s, 'fram', p) * sum, i = 0;
  while (i < w.length - 1 && r >= w[i]!) { r -= w[i]!; i++; }
  const k = BUD_LIST[i]!;
  return { k, amne: BUDSKAP[k].amne(s, p, x), om: k === 'person' ? x.e!.om : k === 'tro' || k === 'hanaGud' ? undefined : x.l!.id, ik: k === 'person' ? x.e!.k : undefined, gud: k === 'hanaGud' ? x.gud!.id : undefined };
}
// ---------- beställda framträdanden (steg 4.3.2.4) ----------
// saken ledaren l kan betala med: hel, ledig (ingen har den i handen eller bär den, den står inte vid en station) och den
// minst värda av dem, så att ledaren inte ger bort det bästa
function betalning(s: State, l: Person): Ting | undefined {
  let best: Ting | undefined, bv = Infinity;
  for (const t of tingOf(s)) {
    if (t.agare !== l.id || t.halv || t.hos !== undefined || t.krok !== undefined || t.lass !== undefined || t.vid !== undefined || t.bar !== undefined || t.c < 1) continue;
    const v = tingVarde(t);
    if (v > 0 && v < bv) { bv = v; best = t; }
  }
  return best;
}
// ledaren beställer framträdandet av p (formen d bär ett budskap): ger saken och budskapet blir en hyllning
function bestall(s: State, p: Person, d: FramDef) {
  const l = ledareOf(s);
  if (!d.bud || !l || l === p || isSick(l, s.now) || getRel(s, p, l).op < FRAM.bestallOp) return undefined;
  if (rnd(s, 'fram', l) >= FRAM.bestall * (1 - legitimitet(s).v)) return undefined;
  const t = betalning(s, l);
  if (!t) return undefined;
  t.agare = p.id;
  const namn = (SAKER[t.k]?.namn ?? t.k).toLowerCase(), r = getRel(s, p, l);
  r.op = clamp(r.op + FRAM.bestallTack, -100, 100);
  think(p, `Fick en ${namn} av ${l.name} för att hylla ${honom(l)}`, 0.05, s.now, 6 * HOUR);
  count(s, 'framBestalld');
  log(s, `${l.name} gav ${p.name} en ${namn} för ett framträdande som hyllar ${l.name}.`, 'rel', [l.id, p.id]);
  const x: BudLage = { ev: 0, l, op: r.op };
  return { k: 'hylla' as Bud, amne: BUDSKAP.hylla.amne(s, p, x), om: l.id, ik: undefined, betalt: t.k };
}
// framträdandet som går att lyssna på
export function framOppen(s: State) {
  const f = s.fram; // det som är slut ligger kvar tills den som uppträdde är klar (upptradaKlar), eller nästa kväll
  return f && s.now < f.slut - FRAM.sent * MIN ? f : undefined;
}
// scenen (steg 4.3.2.2): en färdig scen, när det inte är kallt eller regnar (då är man vid elden eller inne som förut)
export function scenen(s: State) {
  // en scen inne i en sal (gillesalen, steg 7.2.7) går också när det är kallt eller regnar
  const sc = stationerOf(s).filter(t => t.k === 'scen' && isKlar(t)), inne = sc.find(t => t.inne);
  return inne ?? (nederbord(s) || coldOf(temperature(s)) > 0 ? undefined : sc[0]);
}
// instrumenten som ligger vid scenen, det som ger mest glädje först
const instrumentVid = (s: State, sc: Station) => Object.keys(INSTRUMENT).filter(k => redskapVid(s, sc, k).length).sort((a, b) => INSTRUMENT[b].kval - INSTRUMENT[a].kval);
// instrumentet till formen d: sången behöver ett man kan sjunga till
const instrumentFor = (d: FramDef, inst: string[]) => inst.find(k => d.id !== 'sang' || INSTRUMENT[k].sang);
// formerna den som uppträder kan: färdigheten räcker, och ett instrument finns vid scenen när formen behöver ett
// föreläsningen bara med ett ämne (steg 10.6.9)
const kan = (p: Person, inst: string[], lar?: FramLar) => FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill[FRAM_SKILL] && (!d.instrument || !!instrumentFor(d, inst)) && (d.id !== 'forelasning' || !!lar));

// kan q avbryta det hen gör för att gå och lyssna: vaken, kan gå, och gör inget som inte ens ett larm avbryter (vakten, vården,
// förlossningen, striden)
const SOVER = new Set<string>(['sova', 'vila', 'badd']); // på kvällen och natten är den som vilar i sängen den som sover
const kanKomma = (q: Person) => alive(q) && kanGa(q) && !(q.task && (SOVER.has(q.task.act) || ACTS[q.task.act]?.fortsatter?.length));
// på kvällen (fritiden i val.ts, steg 10.7.9): p vill uppträda och kallar. Hen väljer form, instrument och budskap, går till
// scenen eller elden och väntar FRAM.vanta minuter. De som vill lyssna avbryter det de gör och går dit (lyssnaVal)
export function framVal(s: State, p: Person): { act: 'upptrada'; why: string; dur: number; ref: number; tool: string; spot?: { x: number; y: number } } | undefined {
  const h = hourOf(s.now);
  if (s.fram && s.now < s.fram.slut || ageOf(p, s.now) < ALDER.vuxen || h < FRAM.fran || h >= FRAM.till || s.framKvall === kvall(s.now) || isSick(p, s.now)) return undefined;
  const fran = Math.max(p.framProv ?? -Infinity, s.now - (h - FRAM.fran) * HOUR);
  p.framProv = s.now;
  if (rnd(s, 'fram', p) >= FRAM.viljaTim * framKval(s, p) * (s.now - fran) / HOUR) return undefined;
  const sc = scenen(s), inst = sc ? instrumentVid(s, sc) : [];
  const lar = p.skill[FRAM_SKILL] >= (FRAM_AV.forelasning!.min ?? 0) ? forelasAmne(s, p) : undefined, former = kan(p, inst, lar);
  if (!former.length) return undefined;
  const d = former[Math.floor(rnd(s, 'fram', p) * former.length)], i = d.instrument ? instrumentFor(d, inst) : undefined;
  const start = s.now, borjar = start + FRAM.vanta * MIN, slut = borjar + (FRAM.minuter + rnd(s, 'fram', p) * FRAM.spann) * MIN;
  const bud = bestall(s, p, d) ?? budVal(s, p, d);
  const amne = bud?.amne ?? (d.id === 'forelasning' && lar ? larText(lar) : AMNE[d.amne](s, p));
  const fyll = (x: string) => x.replace('{namn}', p.name).replace('{hen}', p.sex === 'k' ? 'hon' : 'han').replace('{amne}', amne).replace('{inst}', i ? INSTRUMENT[i].ord : '');
  const text = fyll(d.text);
  // vid kallelsen avgör var och en som är gammal nog att hjälpa till, en gång, om hen vill lyssna
  const lista = living(s).filter(q => q !== p && !q.gast && ageOf(q, s.now) >= ALDER.hjalper && rnd(s, 'fram', q) < FRAM.med * (1 + FRAM.medTycke * getRel(s, q, p).op / 100)).map(q => q.id);
  s.fram = { ...(d.id === 'forelasning' && lar ? { lar } : {}), k: d.id, p: p.id, start, borjar, lista, slut, publik: [], text, da: fyll(d.da), amne, inst: i, scen: sc?.id, ...(bud ? { bud: bud.k, om: bud.om, ik: bud.ik, ...('gud' in bud && bud.gud !== undefined ? { gud: bud.gud } : {}), ...('betalt' in bud ? { betalt: bud.betalt as string } : {}) } : {}) };
  // ett minne om en person: versionen räknas en gång, så att alla som lyssnar får samma (steg 10.4.11)
  const e = bud?.k === 'person' ? intryckOm(p, bud.om!, bud.ik) : undefined;
  if (e) s.fram.ver = scenVersion(s, p, e, d.vrid ?? 1);
  s.framKvall = kvall(start);
  count(s, 'framtradanden');
  // de som vill och kan avbryter det de gör och väljer igen, där lyssna är ett Tillfälle (lyssnaVal); den som sover väcks inte
  for (const id of lista) { const q = byId(s, id); if (q && q.task && kanKomma(q)) avbryt(s, q); }
  return { act: 'upptrada', why: `${d.namn}: ${text}`, dur: borjar - start, ref: start, tool: d.id, spot: sc && vidStation(sc) }; // på scenen när byn har en
}
// var publiken sitter: står scenen i en sal sprids de på rummets rutor, står den ute sitter de framför den (aldrig bakom en
// vägg), och utan scen där man berättar (plats, spotFor i val.ts)
function publikPlats(s: State, f: Fram, q: Person, plats: (q: Person) => { x: number; y: number }) {
  const sc = f.scen !== undefined ? stationById(s, f.scen) : undefined;
  if (!sc) { const u = plats(q); return blocked(s, u.x, u.y) ? freeNear(s, Math.floor(u.x), Math.floor(u.y)) : u; }
  const { w, h } = storlekAv(sc), rum = roomAt(s, sc.x + w / 2, sc.y + h / 2), fram = vidStation(sc);
  const ledig = (x: number, y: number) => inMap(x, y) && !blocked(s, x + 0.5, y + 0.5) && !(x >= sc.x && x < sc.x + w && y >= sc.y && y < sc.y + h) && !(x === Math.floor(fram.x) && y === Math.floor(fram.y));
  const rutor: number[] = [];
  if (rum) { for (const i of rum.tiles) if (ledig(i % W, Math.floor(i / W))) rutor.push(i); }
  else for (let y = sc.y + h + 1; y <= sc.y + h + 3; y++) for (let x = sc.x - 1; x <= sc.x + w; x++) if (ledig(x, y) && !roomAt(s, x + 0.5, y + 0.5)) rutor.push(y * W + x);
  if (!rutor.length) return freeNear(s, Math.floor(fram.x), Math.floor(fram.y) + 1);
  const i = rutor[(q.id * 7919) % rutor.length]!;
  return { x: i % W + 0.3 + (q.id * 13 % 5) / 10, y: Math.floor(i / W) + 0.5 };
}
// nivån Tillfälle (val.ts, steg 10.7.9): den som ville lyssna vid kallelsen går dit, också om hen vaknar (är utvilad) medan
// det är tillräckligt mycket kvar
export function lyssnaVal(s: State, p: Person, plats: (q: Person) => { x: number; y: number }) {
  const f = framOppen(s);
  if (!f?.lista?.includes(p.id) || p.task?.act === 'lyssna' && p.task.ref === f.start || p.rest < KROPP.trottNatt) return undefined; // den som är trött sover vidare
  const d = FRAM_AV[f.k]!, vem = byId(s, f.p);
  return { why: `Lyssnar på ${vem?.name ?? 'någon'}s ${d.namn.toLowerCase()}`, dur: f.slut - s.now, ref: f.start, tool: f.k, spot: publikPlats(s, f, p, plats) };
}
// brådskan i arbetsordningen: stiger under väntan, som hos handlaren
export const lyssnaBradska = (s: State) => { const f = framOppen(s); return f && !f.igang && f.borjar !== undefined ? { fran: f.start, till: f.borjar } : undefined; };
// medan man uppträder (MEDAN i steg.ts): övning, och de som lyssnar räknas till publiken
export function upptradaSteg(s: State, p: Person, t: Task, dtSec: number) {
  const f = s.fram;
  if (!f || f.start !== t.ref || f.p !== p.id) { t.until = Math.min(t.until, s.now); return; }
  if (!f.igang) return; // väntar på publiken
  const h = dtSec / HOUR_S;
  ovning(p, FRAM_SKILL, FRAM.ovning * h);
  t.prog = (t.prog ?? 0) + h;
  for (const q of s.people) if (alive(q) && q.task?.act === 'lyssna' && q.task.ref === f.start && q.task.phase === 'do' && !f.publik.includes(q.id)) f.publik.push(q.id);
}
// medan man lyssnar: slutar den som uppträder, går man därifrån
export function lyssnaSteg(s: State, _p: Person, t: Task) {
  const f = s.fram;
  if (!f || f.start !== t.ref) t.until = Math.min(t.until, s.now);
}
// när väntan är slut (KLAR i steg.ts): sitter någon och lyssnar börjar framträdandet, annars ställs det in. När det är slut:
// glädjen hos publiken, vad de tycker om den som uppträdde, och texten
export function upptradaKlar(s: State, p: Person, t: Task) {
  const f = s.fram;
  if (!f || f.start !== t.ref || f.p !== p.id) return;
  if (!f.igang && f.borjar !== undefined) {
    const sitter = living(s).filter(q => q.task?.act === 'lyssna' && q.task.ref === f.start && q.task.phase === 'do');
    if (sitter.length) {
      const sen = Math.max(0, s.now - f.borjar); // kom den som uppträder sent, börjar det nu och varar lika länge
      f.igang = true; f.borjar += sen; f.slut += sen; t.until = f.slut;
      for (const q of living(s)) if (q.task?.act === 'lyssna' && q.task.ref === f.start) q.task.until = f.slut;
      return;
    }
    s.fram = undefined;
    count(s, 'framInstallt');
    think(p, 'Ingen kom och lyssnade', -FRAM.ingen, s.now, FRAM.gladjeTim * HOUR);
    framMinne(s, { t: f.start, k: f.k, p: p.id, namn: p.name, text: f.da ?? f.text, n: 0, q: 0, inst: f.inst, bud: f.bud, betalt: f.betalt, amne: f.amne, ...(f.scen !== undefined ? { scen: f.scen } : {}), nr: s.framNr = (s.framNr ?? 0) + 1, publik: [], inget: true },
      `${p.name} skulle uppträda, men ingen kom och lyssnade.`);
    return;
  }
  const d = FRAM_AV[f.k], q = framKval(s, p) * (f.inst ? INSTRUMENT[f.inst].kval : 1), pub = f.publik.map(id => s.people.find(x => x.id === id)).filter((x): x is Person => !!x && alive(x));
  s.fram = undefined;
  if (f.inst) slitInstrument(s, f);
  const om = f.om !== undefined ? byId(s, f.om) : undefined, ledd = f.bud === 'hylla' || f.bud === 'hana' ? om : undefined;
  const m: FramMinne = { t: f.start, k: f.k, p: p.id, namn: p.name, text: f.da ?? f.text, n: pub.length, q: Math.round(q * 100) / 100, inst: f.inst, bud: f.bud, betalt: f.betalt, amne: f.amne, ...(f.scen !== undefined ? { scen: f.scen } : {}),
    nr: s.framNr = (s.framNr ?? 0) + 1, publik: [], ...(om ? { om: om.name } : {}), ...(ledd ? { ledare: ledd.name } : {}) };
  const e0 = f.ver !== undefined ? intryckOm(p, f.om!, f.ik) : undefined; // gjordes gärningen större eller tonades den ned (steg 10.4.11)
  if (e0 && Math.abs(f.ver! - e0.v) >= 0.01) m.vrid = f.ver! > e0.v ? 1 : -1;
  if (!pub.length) { // ingen kom (steg 5.4.7.1): redogörelsen säger det
    m.inget = true;
    framMinne(s, m, `${p.name} skulle uppträda, men ingen kom och lyssnade.`);
    return;
  }
  m.glad = Math.round(FRAM.gladje * d.kval * q * 100); // i hundradelar av humöret
  for (const b of pub) {
    think(b, `Lyssnade på ${p.name}s ${d.namn.toLowerCase()}`, FRAM.gladje * d.kval * q, s.now, FRAM.gladjeTim * HOUR);
    const r = getRel(s, b, p), r0 = r.op, l0 = ledd && b !== ledd ? getRel(s, b, ledd).op : undefined, tro0 = b.tro;
    r.op = Math.max(-100, Math.min(100, r.op + FRAM.op * (q - 0.5)));
    if (f.lar && forelasLar(s, p, b, f.lar, (f.slut - (f.borjar ?? f.start)) / HOUR, q)) (m.lart ??= []).push(b.name); // föreläsningen lär ut ämnet och inget annat (steg 10.6.9)
    const spred = f.bud ? BUDSKAP[f.bud].verkan(s, p, b, q, f) : undefined;
    const lyss: FramLyss = { id: b.id, namn: b.name, r0: Math.round(r0), r1: Math.round(getRel(s, b, p).op) };
    if (l0 !== undefined) { lyss.l0 = Math.round(l0); lyss.l1 = Math.round(getRel(s, b, ledd!).op); }
    m.publik!.push(lyss);
    if (spred && f.bud === 'hanaGud') (m.hanad ??= []).push(b.name);
    else if (spred) (m.rykte ??= []).push(b.name);
    if (f.bud === 'tro' && b.tro !== tro0 && b.tro === p.tro) (m.tro ??= []).push(b.name);
  }
  // den som hånar ledaren får sämre relation med ledaren (steg 4.3.2.3)
  if (f.bud) count(s, 'framBud_' + f.bud);
  const l = f.bud === 'hana' ? byId(s, f.om!) : undefined;
  if (l && !s.styre?.hanForbud) laggFram(s, 'hanforbud', { led: l.id }, l); // efter ett hån lägger ledaren fram ett förbud (steg 8.3.13)
  if (l && alive(l)) { const r = getRel(s, l, p); r.op = clamp(r.op - FRAM.hanOp, -100, 100); }
  think(p, `Uppträdde för ${pub.length} vid elden`, FRAM.egen, s.now, FRAM.gladjeTim * HOUR);
  count(s, 'framPublik', pub.length);
  gjort(s, p, 'upptradt');
  if (m.lart) m.text += ` ${m.lart.length === 1 ? m.lart[0] : `${m.lart.slice(0, -1).join(', ')} och ${m.lart.at(-1)}`} lärde sig klart.`;
  framMinne(s, m, m.text);
}
// framträdandet sparas (de senaste FRAM.sparas), och raden i loggen och notisen får dess nummer (steg 5.4.7.1)
function framMinne(s: State, m: FramMinne, text: string) {
  log(s, text, 'world', [m.p]).fram = m.nr;
  notis(s, 'fram', text, [m.p], undefined, { fram: m.nr });
  (s.framtradanden ??= []).push(m);
  if (s.framtradanden.length > FRAM.sparas) s.framtradanden.splice(0, s.framtradanden.length - FRAM.sparas);
}
// framträdandet med numret nr, om det finns kvar
export const framMinneAv = (s: State, nr: number) => s.framtradanden?.find(m => m.nr === nr);
// instrumentet slits en gång per framträdande, och går det sönder står det i loggen
function slitInstrument(s: State, f: Fram) {
  const sc = f.scen !== undefined ? stationById(s, f.scen) : undefined, r = sc && redskapVid(s, sc, f.inst!).sort((a, b) => a.c - b.c)[0];
  if (!r) return;
  r.c -= FRAM.slit / kvHaller(r);
  if (r.c > 1e-9) return;
  s.ting = (s.ting ?? []).filter(x => x !== r);
  const tr = SAKER[r.k]?.trasig;
  if (tr) { count(s, tr.stat); if (tr.text) log(s, tr.text, 'world'); }
}
