import { blocked, freeNear } from './byggnad';
// Framträdandena (steg 4.3.2, "Kulturen i fas 4" i designdokumentet): på kvällen när det är mörkt uppträder någon vid elden
// (eller i långhuset när det är kallt eller regnar) för de andra, högst en gång per kväll. Den enklaste formen, ett kväde,
// finns från början, så att även en liten by har framträdanden. Formerna är rader i registret FRAMTRADANDEN. Framträdandet
// ger publiken glädje (mer ju skickligare och mer karismatisk den som uppträder är) och får en kort text som beskriver det.
// Ett framträdande i taget, i s.fram; de senaste står i s.framtradanden.
import { honom } from './ord';
import { ALDER, ageOf, alive, byId, count, getRel, gjort, isSick, living, log, ovning, stat, think } from './folk';
import { avbryt } from './lager';
import { eldPlats } from './karta';
import { INTRYCK, Intryck, IntryckTyp, beratta, intryckOm } from './rykten';
import { ledareOf, legitimitet, pabud } from './styre';
import { Ting, tingOf } from './agande';
import { tingVarde } from './varde';
import { predika, troOf } from './religion';
import { clamp } from './slump';
import { share } from './minne';
import { SAMTALSSLAG } from './samtal';
import { rnd } from './slump';
import { hourOf } from './tid';
import { coldOf, nederbord, temperature } from './vader';
import { Station, isKlar, redskapVid, stationById, stationerOf, vidStation } from './stationer';
import { kvHaller } from './kvalitet';
import { SAKER } from './saker';
import { balans } from './balans';
import { notis } from './notiser';
import { DAY, HOUR, HOUR_S, MIN, Person, Skill, State, Task } from './typer';

export interface FramDef {
  id: string; namn: string;
  text: string; // den korta texten: {namn} är den som uppträder, {hen} hon eller han, och {amne} vad det handlar om
  da: string; // samma i dåtid, för loggen, notisen och redogörelsen (steg 6.7.4); text i presens står i pratbubblan medan det pågår
  min?: number; // så här mycket i färdigheten (FRAM_SKILL) behövs
  instrument?: true; // behöver ett instrument (steg 4.3.2.2)
  bud?: true; // kan bära ett budskap (steg 4.3.2.3, BUDSKAP)
  kval: number; // hur mycket glädje formen ger jämfört med ett kväde
  amne: keyof typeof AMNE; // vad det handlar om
}
// vad ett framträdande handlar om (FramDef.amne): ger texten till {amne}
const AMNE = {
  minne: (s: State, p: Person) => minneAmne(s, p) ?? 'de första som kom till sjön',
  byn: () => 'det byn har klarat och det som väntar',
  kunskap: () => 'skogen, sjön och arbetet',
  handelse: (s: State, p: Person) => minneAmne(s, p) ?? 'när byn kom till sjön',
};
export const FRAMTRADANDEN: FramDef[] = [
  { id: 'kvade', namn: 'Kväde', text: '{namn} kväder vid elden om {amne}, och de andra lyssnar.', da: '{namn} kvad vid elden om {amne}, och de andra lyssnade.', bud: true, kval: 1, amne: 'minne' },
  { id: 'tal', namn: 'Tal', text: '{namn} håller ett tal om {amne}.', da: '{namn} höll ett tal om {amne}.', bud: true, min: 2, kval: 0.8, amne: 'byn' },
  { id: 'forelasning', namn: 'Föreläsning', text: '{namn} lär de andra vad {hen} vet om {amne}.', da: '{namn} lärde de andra vad {hen} visste om {amne}.', min: 4, kval: 0.6, amne: 'kunskap' },
  { id: 'teater', namn: 'Teater', text: '{namn} spelar upp en berättelse för de andra om {amne}, med röster och rörelser.', da: '{namn} spelade upp en berättelse för de andra om {amne}, med röster och rörelser.', bud: true, min: 6, kval: 1.3, amne: 'handelse' },
  { id: 'sang', namn: 'Sång', text: '{namn} sjunger om {amne} till {inst}.', da: '{namn} sjöng om {amne} till {inst}.', instrument: true, bud: true, kval: 1.2, amne: 'minne' },
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
  vilja: 0.15, // chansen när en vuxen väljer vad hen gör på kvällen: vilja × (färdigheten + karisma) / 20
  publik: 2, // minst så här många som sitter vid elden (samtalar eller berättar) och lyssnar
  nara: 15, // rutor från elden: de som är närmare än så lyssnar
  med: 0.8, // den som väljer vad hen gör medan ett framträdande pågår lyssnar så här ofta
  sent: 10, // minuter: så här nära slutet går ingen ny dit för att lyssna
  minuter: 30, spann: 30, // ett framträdande varar så här många minuter, plus upp till spann
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
  tro: 40, // ... om tron: framträdandet övertygar som så här många samtal, gånger kvaliteten (predika i religion.ts)
});

// framträdandet som pågår: formen, den som uppträder, när det började (task.ref) och slutar, publiken som varit där och texten
export interface Fram { k: string; p: number; start: number; slut: number; publik: number[]; text: string; da?: string; amne?: string; inst?: string; scen?: number; bud?: Bud; om?: number; ik?: IntryckTyp; betalt?: string } // betalt = saken ledaren betalade med (steg 4.3.2.4) // bud = budskapet, om = vem det handlar om (personen eller ledaren), ik = intrycket // inst = instrumentet, scen = stationen där det sker
export interface FramMinne { t: number; k: string; p: number; namn: string; text: string; n: number; q: number; inst?: string; bud?: Bud; betalt?: string
  // redogörelsen (steg 5.4.7.1), sparad när det händer: numret (raden i loggen och notisen pekar hit), publiken med vad var och
  // en tyckte om den som uppträdde före och efter (r0, r1) och om ledaren (l0, l1, efter en hyllning eller ett hån), glädjen
  // (tanken i humöret), de som fick höra ryktet, de som tron övertygade, ledaren (namnet när budskapet gällde ledaren) och
  // om ingen kom (inget)
  nr?: number; amne?: string; publik?: FramLyss[]; glad?: number; rykte?: string[]; tro?: string[]; ledare?: string; om?: string; inget?: true }
export interface FramLyss { id: number; namn: string; r0: number; r1: number; l0?: number; l1?: number }

// kvällen: tolv timmar bakåt, så att kvällen och natten efter hör till samma dygn
const kvall = (t: number) => Math.floor((t - 12 * HOUR) / DAY);
// kvaliteten: färdigheten och karisman, 0 till 2
export const framKval = (s: State, p: Person) => (p.skill[FRAM_SKILL] + stat(p, 'karisma', s.now)) / 20;
// det den som uppträder minns starkast om en annan, helst en död, och hur starkt
function starkast(s: State, p: Person) {
  let bast: Intryck | undefined, b = 0;
  for (const e of p.intryck ?? []) {
    const q = s.people.find(x => x.id === e.om), dod = !q || !alive(q), v = e.v * (dod ? 2 : 1);
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
export type Bud = 'person' | 'hylla' | 'hana' | 'tro';
interface BudDef { namn: string; vikt: (s: State, p: Person, x: BudLage) => number; amne: (s: State, p: Person, x: BudLage) => string; verkan: (s: State, p: Person, b: Person, q: number, f: Fram) => boolean | void } // verkan: sant när ryktet spreds
interface BudLage { e?: Intryck; ev: number; l?: Person; op: number }
// det tillåtna hånet: 1 = fritt, 0 = förbjudet av ledaren (påbudet Hån, styre.ts)
export const hanTillat = (s: State) => (1 + pabud(s, 'han')) / 2;
// publikens relation till ledaren ändras med d
function stod(s: State, b: Person, l: Person | undefined, d: number) {
  if (!l || b === l) return;
  const r = getRel(s, b, l);
  r.op = clamp(r.op + d, -100, 100);
}
export const BUDSKAP: Record<Bud, BudDef> = {
  person: { namn: 'Om en person', vikt: (_s, _p, x) => x.e ? x.ev * FRAM.budPerson : 0, amne: (s, p, x) => intryckAmne(s, p, x.e!),
    verkan: (s, p, b, q, f) => { const e = intryckOm(p, f.om!, f.ik); if (e && e.om !== b.id && rnd(s, 'fram', b) < FRAM.rykte * q) { beratta(s, p, b, e, getRel(s, p, b)); return true; } } },
  hylla: { namn: 'Hyllar ledaren', vikt: (_s, _p, x) => x.l && x.op > 0 ? x.op / 100 * FRAM.budStyre : 0, amne: (_s, _p, x) => `${x.l!.name}, som leder byn väl`,
    verkan: (s, _p, b, q, f) => stod(s, b, byId(s, f.om!), FRAM.styre * q) },
  hana: { namn: 'Hånar ledaren', vikt: (s, _p, x) => x.l && x.op < 0 ? -x.op / 100 * FRAM.budStyre * hanTillat(s) : 0, amne: (_s, _p, x) => `${x.l!.name}, som tror sig vara förmer än de andra`,
    verkan: (s, _p, b, q, f) => stod(s, b, byId(s, f.om!), -FRAM.styre * q) },
  tro: { namn: 'Om tron', vikt: (s, p) => troOf(s, p.tro) ? (p.troStyrka ?? 0) / 100 * FRAM.budTro : 0, amne: (s, p) => { const tr = troOf(s, p.tro)!; return `${liten(tr.bakom)}, som vill ${tr.vill}`; },
    verkan: (s, p, b, q) => predika(s, p, b, getRel(s, p, b), 'berättelse', FRAM.tro * q) },
};
const BUD_LIST = Object.keys(BUDSKAP) as Bud[];
// budskapet p väljer till formen d, eller inget (formen bär inget, eller p har inget att säga)
function budVal(s: State, p: Person, d: FramDef) {
  if (!d.bud) return undefined;
  const b = starkast(s, p), l = ledareOf(s), x: BudLage = { e: b?.e, ev: b?.v ?? 0, l: l && l !== p ? l : undefined, op: l && l !== p ? getRel(s, p, l).op : 0 };
  const w = BUD_LIST.map(k => Math.max(0, BUDSKAP[k].vikt(s, p, x))), sum = w.reduce((a, v) => a + v, 0);
  if (sum <= 0) return undefined;
  let r = rnd(s, 'fram', p) * sum, i = 0;
  while (i < w.length - 1 && r >= w[i]!) { r -= w[i]!; i++; }
  const k = BUD_LIST[i]!;
  return { k, amne: BUDSKAP[k].amne(s, p, x), om: k === 'person' ? x.e!.om : k === 'tro' ? undefined : x.l!.id, ik: k === 'person' ? x.e!.k : undefined };
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
// de som sitter vid elden och lyssnar när ett framträdande börjar
const PUBLIK = new Set<string>(['samtal', 'beratta']);
function publik(s: State, p: Person) {
  const f = eldPlats(s);
  return living(s).filter(q => q !== p && !!q.task && PUBLIK.has(q.task.act) && q.task.phase === 'do' && Math.hypot(q.x - f.x, q.y - f.y) <= FRAM.nara);
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
const kan = (p: Person, inst: string[]) => FRAMTRADANDEN.filter(d => (d.min ?? 0) <= p.skill[FRAM_SKILL] && (!d.instrument || !!instrumentFor(d, inst)));

// på kvällen (night i val.ts): p uppträder, eller lyssnar på det som pågår. plats ger var man sitter vid elden (spotFor i val.ts)
export function framVal(s: State, p: Person, plats: (q: Person) => { x: number; y: number }): { act: 'upptrada' | 'lyssna'; why: string; dur: number; ref: number; tool: string; spot?: { x: number; y: number } } | undefined {
  const a = ageOf(p, s.now), f = framOppen(s);
  if (f) {
    if (f.p === p.id || a < ALDER.hjalper || rnd(s, 'fram', p) >= FRAM.med) return undefined; // de minsta barnen sover
    const d = FRAM_AV[f.k], vem = s.people.find(q => q.id === f.p);
    return { act: 'lyssna', why: `Lyssnar på ${vem?.name ?? 'någon'}s ${d.namn.toLowerCase()}`, dur: f.slut - s.now, ref: f.start, tool: f.k };
  }
  const h = hourOf(s.now);
  if (a < ALDER.vuxen || h < FRAM.fran || h >= FRAM.till || s.framKvall === kvall(s.now) || isSick(p, s.now)) return undefined;
  if (rnd(s, 'fram', p) >= FRAM.vilja * framKval(s, p)) return undefined;
  const sc = scenen(s), inst = sc ? instrumentVid(s, sc) : [];
  const pub = publik(s, p), former = kan(p, inst);
  if (pub.length < FRAM.publik || !former.length) return undefined;
  const d = former[Math.floor(rnd(s, 'fram', p) * former.length)], i = d.instrument ? instrumentFor(d, inst) : undefined;
  const start = s.now, slut = start + (FRAM.minuter + rnd(s, 'fram', p) * FRAM.spann) * MIN;
  const bud = bestall(s, p, d) ?? budVal(s, p, d);
  const amne = bud?.amne ?? AMNE[d.amne](s, p);
  const fyll = (x: string) => x.replace('{namn}', p.name).replace('{hen}', p.sex === 'k' ? 'hon' : 'han').replace('{amne}', amne).replace('{inst}', i ? INSTRUMENT[i].ord : '');
  const text = fyll(d.text);
  s.fram = { k: d.id, p: p.id, start, slut, publik: [], text, da: fyll(d.da), amne, inst: i, scen: sc?.id, ...(bud ? { bud: bud.k, om: bud.om, ik: bud.ik, ...('betalt' in bud ? { betalt: bud.betalt as string } : {}) } : {}) };
  s.framKvall = kvall(start);
  count(s, 'framtradanden');
  for (const q of pub) {
    avbryt(s, q);
    const u0 = plats(q), u = blocked(s, u0.x, u0.y) ? freeNear(s, Math.floor(u0.x), Math.floor(u0.y)) : u0; // aldrig i en vägg (scenen kan stå inne, steg 7.2.7)
    q.task = { act: 'lyssna', phase: 'go', tx: u.x, ty: u.y, until: slut, carry: 0, ref: start, tool: d.id, dark: true, why: `Lyssnar på ${p.name}s ${d.namn.toLowerCase()}` };
  }
  return { act: 'upptrada', why: `${d.namn}: ${text}`, dur: slut - start, ref: start, tool: d.id, spot: sc && vidStation(sc) }; // på scenen när byn har en
}
// medan man uppträder (MEDAN i steg.ts): övning, och de som lyssnar räknas till publiken
export function upptradaSteg(s: State, p: Person, t: Task, dtSec: number) {
  const f = s.fram;
  if (!f || f.start !== t.ref || f.p !== p.id) { t.until = Math.min(t.until, s.now); return; }
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
// när framträdandet är slut (KLAR i steg.ts): glädjen hos publiken, vad de tycker om den som uppträdde, och texten
export function upptradaKlar(s: State, p: Person, t: Task) {
  const f = s.fram;
  if (!f || f.start !== t.ref || f.p !== p.id) return;
  const d = FRAM_AV[f.k], q = framKval(s, p) * (f.inst ? INSTRUMENT[f.inst].kval : 1), pub = f.publik.map(id => s.people.find(x => x.id === id)).filter((x): x is Person => !!x && alive(x));
  s.fram = undefined;
  if (f.inst) slitInstrument(s, f);
  const om = f.om !== undefined ? byId(s, f.om) : undefined, ledd = f.bud === 'hylla' || f.bud === 'hana' ? om : undefined;
  const m: FramMinne = { t: f.start, k: f.k, p: p.id, namn: p.name, text: f.da ?? f.text, n: pub.length, q: Math.round(q * 100) / 100, inst: f.inst, bud: f.bud, betalt: f.betalt, amne: f.amne,
    nr: s.framNr = (s.framNr ?? 0) + 1, publik: [], ...(om ? { om: om.name } : {}), ...(ledd ? { ledare: ledd.name } : {}) };
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
    if (d.id === 'forelasning') share(s, p, b, getRel(s, p, b), SAMTALSSLAG['berättelse']); // föreläsningen för det hen vet vidare
    const spred = f.bud ? BUDSKAP[f.bud].verkan(s, p, b, q, f) : undefined;
    const lyss: FramLyss = { id: b.id, namn: b.name, r0: Math.round(r0), r1: Math.round(getRel(s, b, p).op) };
    if (l0 !== undefined) { lyss.l0 = Math.round(l0); lyss.l1 = Math.round(getRel(s, b, ledd!).op); }
    m.publik!.push(lyss);
    if (spred) (m.rykte ??= []).push(b.name);
    if (f.bud === 'tro' && b.tro !== tro0 && b.tro === p.tro) (m.tro ??= []).push(b.name);
  }
  // den som hånar ledaren får sämre relation med ledaren (steg 4.3.2.3)
  if (f.bud) count(s, 'framBud_' + f.bud);
  const l = f.bud === 'hana' ? byId(s, f.om!) : undefined;
  if (l && alive(l)) { const r = getRel(s, l, p); r.op = clamp(r.op - FRAM.hanOp, -100, 100); }
  if (pub.length >= FRAM.publik) think(p, `Uppträdde för ${pub.length} vid elden`, FRAM.egen, s.now, FRAM.gladjeTim * HOUR);
  count(s, 'framPublik', pub.length);
  gjort(s, p, 'upptradt');
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
