import { State, Person, HOUR, DAY, GREN } from './typer';
import { FOOD, SAKER, isTool } from './saker';
import { actsOf, usesTool } from './handlingar';
import { ageOf, alive, byId, count, getRel, isKin, living, log, stat, think } from './folk';
import { chance, clamp, rnd } from './slump';
import { Ting, tingOf } from './agande';
import { BYN, Del, addDel } from './egendom';
import { amountOf, mayTake, ownMove, ownsAmount, takeFood, use } from './lager';
import { emberOn, fetchFuel, fireWant } from './eld';
import { eatPoison } from './fynd';

// ---------- behovsstegen ----------
// När någon behöver något går hen stegen i ordning: först sitt eget, sedan byns förråd, sedan ber hen om det som gåva i
// samtal (den som har över ger, familjen ger lättast: willing nedan). Stjäl gör man först när man håller på att dö av
// bristen. Hur nära döden man måste vara beror på empatin; den med mycket hög empati stjäl aldrig. Man stjäl helst av den
// man inte tycker om. Den bestulne märker det nästa gång hen själv tar av sitt eget för samma behov, och relationen blir
// sämre. Byten (steget mellan sitt eget och byns) finns bara för redskap än: det behövs ett värde på saker (steg 1.4.2).
// Varje behov är en post i BEHOV (mat, ved till elden). Material till ett arbete och redskap går samma steg, längre ner.
export interface Behov {
  id: string;
  namn: string; // i loggen: "gav mat till", "stal mat av"
  slag: readonly string[]; // vilka saker i förrådet som fyller behovet
  per?: Record<string, number>; // hur mycket ett av slaget fyller (ved: en gren är 0,4 ved); annars 1
  minst: number; // minsta mängd som hjälper
  mangd: (p: Person, now: number) => number; // hur mycket man tar eller ber om på en gång
  kvar: number; // så mycket av sitt eget behåller den som ger till någon utanför familjen
  behover: (s: State, p: Person) => boolean; // p behöver det nu
  fara: (s: State, p: Person) => number; // hur nära döden bristen har fört p: 0 = ingen fara, 1 = död
  anvand: (s: State, p: Person, fran?: Person) => number; // p tar och använder det (fran = stjäl av den personen); ger mängden
}

export const STJAL_ALDRIG = 17; // empati från vilken man aldrig stjäl
export const STOLD_OP = 15; // så mycket sämre blir relationen när stölden upptäcks
export const STOLD_LINDRIG = 5; // ... när det var material till ett arbete (en lindrig stöld)
export const FRAGA_R = 8; // så nära (rutor) måste man vara för att be någon om något
export const FRAGA_TAKT = 1 / (30 * 60); // så ofta (per sekund) den som saknar något ber någon i närheten

// ---------- mat ----------
export const portionOf = (p: Person, now: number) => ageOf(p, now) < 10 ? 0.6 : 1;
// en hel portion, eller det som finns kvar. Maten under halva skicket mättar sämre, under en fjärdedel kan man bli sjuk
function eat(s: State, p: Person, fran?: Person) {
  const now = s.now, full = portionOf(p, now);
  const { n: portion, c: q } = takeFood(s, full, p, fran);
  p.hunger = clamp(p.hunger + 0.55 * portion / full * (q >= 0.5 ? 1 : 0.5 + q), 0, 1); eatPoison(s, p);
  if (q < 0.5) think(p, 'Maten var dålig', -0.05, now, 6 * HOUR);
  if (q < 0.25 && rnd(s, 'halsa', p) < (0.25 - q) / 0.25 * 0.35) {
    p.sickUntil = Math.max(p.sickUntil ?? 0, now + (4 + rnd(s, 'halsa', p) * 8) * HOUR); p.sickWhy = 'Magsjuk av skämd mat';
    think(p, 'Åt skämd mat och blev magsjuk', -0.2, now, DAY / 2); count(s, 'skamdMat');
    log(s, `${p.name} blev magsjuk av skämd mat.`, 'world', [p.id]);
  }
  return portion;
}
export const MAT: Behov = {
  id: 'mat', namn: 'mat', slag: FOOD, minst: 0.3, mangd: portionOf,
  kvar: 1.6, // det man själv äter på ett dygn
  behover: (_s, p) => p.hunger < 0.45,
  fara: (_s, p) => p.hunger <= 0 ? 1 - p.health : 0, // man svälter när hungern är slut, och hälsan sjunker
  anvand: eat,
};

// ---------- ved till elden ----------
// Den enkla eldstaden ägs av hela byn, men veden följer det vanliga ägandet: man eldar med byns ved och sin egen
// (eld.ts väljer vem som hämtar, bland dem som har ved att ta). Den som fryser när elden behöver mer ved och inte har
// någon ber om den som gåva, och stjäl först när kylan håller på att döda hen: hen hämtar då den andras ved till elden.
export const VED: Behov = {
  id: 'ved', namn: 'ved', slag: ['ved', 'grenar'], per: { grenar: GREN }, minst: 0.5,
  mangd: () => 1, // en famn
  kvar: 3, // så mycket ved som brinner på sex timmar
  behover: (s, p) => p.warm < 0.35 && (s.fire.lit || emberOn(s)) && s.fire.fuel < fireWant(s),
  fara: (_s, p) => p.warm < 0.12 ? 1 - p.health : 0, // man fryser ihjäl när kroppsvärmen är nästan slut, och hälsan sjunker
  // stölden: p hämtar den andras ved till elden (steg.ts räknar den när den tas). Annars hämtar den som eld.ts väljer
  anvand: (s, p, fran) => { if (fran && ageOf(p, s.now) >= 8 && p.task?.act !== 'sova') fetchFuel(s, p, 'Fryser och tar någon annans ved till elden', fran); return 0; },
};
export const BEHOV: Behov[] = [MAT, VED];

// det p själv har och får ta av byns
const perOf = (b: Behov, k: string) => b.per?.[k] ?? 1;
export function hasFor(s: State, p: Person, b: Behov) { let n = 0; for (const k of b.slag) n += mayTake(s, p, k) * perOf(b, k); return n; }
export function ownFor(s: State, p: Person, b: Behov) { let n = 0; for (const k of b.slag) n += ownsAmount(s, p, k) * perOf(b, k); return n; }
// p behöver det och har inget eget eller av byns att ta
export const lacksFor = (s: State, p: Person, b: Behov) => b.behover(s, p) && hasFor(s, p, b) < b.minst;

// varje steg: den som behöver något tar av sitt eget och byns. Finns inget ber hen någon i närheten om det, och i
// yttersta nöd stjäl hen
export function needLadder(s: State, p: Person, dtSec: number) {
  for (const b of BEHOV) {
    if (!b.behover(s, p)) continue;
    if (hasFor(s, p, b) < b.minst && chance(s, FRAGA_TAKT, dtSec, 'dela', p)) askAround(s, p, b);
    if (hasFor(s, p, b) >= b.minst) { if (b.anvand(s, p) > 0) noticeTheft(s, p, b.id); continue; }
    const v = victimOf(s, p, b);
    if (v) stole(s, p, v, b.id, b.anvand(s, p, v));
  }
}
const isParent = (g: Person, m: Person) => m.mother === g.id || m.father === g.id;
const isFamily = (g: Person, m: Person) => isParent(g, m) || g.partner === m.id || isKin(g, m);
// det g har över att ge m. En förälder delar med sitt barn också det sista, partner och släkt behåller en portion
// åt sig själva, andra så mycket de själva behöver (b.kvar)
const overOf = (s: State, g: Person, b: Behov, m: Person) =>
  ownFor(s, g, b) - (isParent(g, m) ? 0 : isFamily(g, m) ? b.mangd(g, s.now) : b.kvar);
// m ber den i närheten som har över och helst ger (familjen först). Familjen kan man väcka
function askAround(s: State, m: Person, b: Behov) {
  let best: Person | undefined, bw = 0;
  for (const g of living(s)) {
    if (g === m || (g.task?.act === 'sova' && !isFamily(g, m)) || Math.hypot(g.x - m.x, g.y - m.y) > FRAGA_R || overOf(s, g, b, m) < b.minst) continue;
    const w = willing(s, g, m, ownFor(s, g, b) / b.kvar);
    if (w > bw) { bw = w; best = g; }
  }
  if (best) gift(s, m, best, b);
}
// m ber g om det m saknar. Ger g? (Hur gärna man ger: agande.ts)
function gift(s: State, m: Person, g: Person, n: Behov) {
  const over = overOf(s, g, n, m);
  if (over < n.minst || rnd(s, 'dela', g) >= willing(s, g, m, ownFor(s, g, n) / n.kvar)) return false;
  let rest = Math.min(over, n.mangd(m, s.now));
  const want = rest;
  for (const k of n.slag) { if (rest <= 1e-9) break; rest -= ownMove(s, k, rest / perOf(n, k), g.id, m.id) * perOf(n, k); }
  const r = getRel(s, m, g);
  r.op = clamp(r.op + 3, -100, 100);
  think(m, `Fick ${n.namn} av ${g.name}`, 0.1, s.now, 12 * HOUR);
  think(g, `Gav ${n.namn} till ${m.name}`, 0.05, s.now, 6 * HOUR);
  if (n.fara(s, m) > 0) log(s, `${g.name} gav ${n.namn} till ${m.name}, som höll på att dö.`, 'rel', [g.id, m.id]); // vardagens gåvor fyller inte loggen
  count(s, 'gava_' + n.id, want - rest);
  return true;
}
// a och b talar. Saknar någon av dem något som den andra har över? Ger true om en gåva gavs
export function askForGift(s: State, a: Person, b: Person) {
  for (const n of BEHOV) for (const [m, g] of [[a, b], [b, a]]) if (lacksFor(s, m, n) && gift(s, m, g, n)) return true;
  return !!askForTool(s, a, b);
}

// är nöden så stor att p stjäl, och av vem? Ju högre empati, desto närmare döden innan man stjäl
export function victimOf(s: State, p: Person, b: Behov) {
  const emp = stat(p, 'empati', s.now);
  if (emp >= STJAL_ALDRIG || b.fara(s, p) <= emp / STJAL_ALDRIG) return;
  let tot = 0;
  const cands = living(s).filter(q => q !== p).map(q => {
    const own = ownFor(s, q, b);
    const w = own >= b.minst ? own * clamp(1 - getRel(s, p, q).op / 50, 0.2, 3) : 0; // helst av den man inte tycker om
    tot += w; return { q, w };
  }).filter(c => c.w > 0);
  if (!tot) return;
  let x = rnd(s, 'dela', p) * tot;
  for (const c of cands) { x -= c.w; if (x <= 0) return c.q; }
  return cands[cands.length - 1].q;
}
// key = behovet (mat, ved) eller slaget (material). lindrig = material till ett arbete
export function stole(s: State, tjuv: Person, offer: Person, key: string, n: number, lindrig = false) {
  if (n <= 1e-9) return;
  const st = (offer.stulet ??= []), f = st.find(x => x.av === tjuv.id && x.k === key);
  if (f) { f.n += n; if (!lindrig) delete f.l; } else st.push(lindrig ? { av: tjuv.id, k: key, n, l: true } : { av: tjuv.id, k: key, n });
  count(s, 'stold_' + (lindrig ? 'material' : key));
}
const namnOf = (key: string) => BEHOV.find(b => b.id === key)?.namn ?? (SAKER[key]?.namn ?? key).toLowerCase();
// p har tagit av sitt eget för behovet eller slaget key och märker om någon stulit av det
export function noticeTheft(s: State, p: Person, key: string) {
  if (!p.stulet?.some(x => x.k === key)) return;
  for (const { av, l } of p.stulet.filter(x => x.k === key)) {
    const t = s.people.find(q => q.id === av);
    if (!t) continue;
    const r = getRel(s, p, t);
    r.op = clamp(r.op - (l ? STOLD_LINDRIG : STOLD_OP), -100, 100);
    think(p, `${t.name} tog av min ${namnOf(key)}`, l ? -0.04 : -0.1, s.now, 12 * HOUR);
    if (alive(t)) think(t, `${p.name} vet att jag tog`, -0.05, s.now, 6 * HOUR);
    if (!l) log(s, `${p.name} märkte att ${t.name} hade stulit hens ${namnOf(key)}.`, 'rel', [p.id, t.id]);
  }
  p.stulet = p.stulet.filter(x => x.k !== key);
  if (!p.stulet.length) delete p.stulet;
}

// ---------- material till ett arbete ----------
// Den som tillverkar, bygger eller tänder elden tar materialet i samma steg som maten: sitt eget och byns, sedan som
// gåva av den i närheten som helst ger. Räcker det inte tar man av andras: en lindrig stöld, som man inte behöver vara
// nära döden för, men som ger sämre relation (STOLD_LINDRIG) när den bestulne märker det. Den med mycket hög empati
// tar aldrig av andras och gör då inte arbetet.
const aldrigStjal = (s: State, p: Person) => stat(p, 'empati', s.now) >= STJAL_ALDRIG;
// så mycket av slaget k som p kan få till ett arbete
export const getable = (s: State, p: Person, k: string) => aldrigStjal(s, p) ? mayTake(s, p, k) : amountOf(s, k);
// p tar n av slaget k till ett arbete; common = till byns eld eller hus (byns först). Ger vems det var. kom = var det
// kom ifrån, nycklar som `kom` i bygg.ts skriver dem (eget, byn, familj, gava, stold)
export function takeMaterial(s: State, p: Person, k: string, n: number, common = false, kom?: Record<string, number>): Del {
  const ag: Del = {};
  if (n <= 1e-12) return ag;
  const not = (hur: string, d: Del) => { if (kom) for (const o in d) if (d[o] > 1e-9) { const h = +o === BYN ? 'byn' : +o === p.id ? 'eget' : hur; const key = `${h}:${h === 'byn' ? BYN : o}:${k}`; kom[key] = (kom[key] ?? 0) + d[o]; } };
  const egen = Math.min(n, mayTake(s, p, k));
  const forst = use(s, p, k, egen, common);
  addDel(ag, forst); not('familj', forst);
  if ((ag[p.id] ?? 0) > 1e-9) noticeTheft(s, p, k);
  let rest = n - egen;
  // be den i närheten som har och helst ger (familjen kan man väcka)
  if (rest > 1e-9) {
    const ask = living(s).filter(g => g !== p && ownsAmount(s, g, k) > 1e-9 && (g.task?.act !== 'sova' || isFamily(g, p)) && Math.hypot(g.x - p.x, g.y - p.y) <= FRAGA_R)
      .sort((a, b) => willing(s, b, p, ownsAmount(s, b, k) / rest) - willing(s, a, p, ownsAmount(s, a, k) / rest) || a.id - b.id);
    for (const g of ask) {
      if (rest <= 1e-9) break;
      if (rnd(s, 'dela', g) >= willing(s, g, p, ownsAmount(s, g, k) / rest)) continue;
      const v = ownMove(s, k, Math.min(rest, ownsAmount(s, g, k)), g.id, p.id);
      const d = use(s, p, k, v, common); addDel(ag, d); rest -= v;
      if (kom) { const key = `gava:${g.id}:${k}`; kom[key] = (kom[key] ?? 0) + v; }
      const r = getRel(s, p, g); r.op = clamp(r.op + 1, -100, 100);
      count(s, 'gava_material', v);
    }
  }
  // sist en lindrig stöld
  if (rest > 1e-9 && !aldrigStjal(s, p)) {
    const d = use(s, p, k, Math.min(rest, amountOf(s, k)), common);
    for (const o in d) { const q = +o === BYN || +o === p.id ? undefined : byId(s, +o); if (q) stole(s, p, q, k, d[o], true); }
    addDel(ag, d); not('stold', d);
  }
  return ag;
}

// ---------- redskap ----------
// Redskapen är ting (agande.ts) och går samma steg: sitt eget, byns, låna av någon som inte arbetar med sitt, och få
// eller byta till sig ett i samtal. Att låna är gåvan av något som kommer tillbaka: släkt och partner lånar alltid ut, och
// den unga byn lånar ut till alla den inte är osams med. Stjäl gör man inte: att sakna ett redskap dödar ingen.
// hur gärna giver ger till mottagaren, 0–1 (samma för mat, ved, material och redskap). Empati och relationen avgör
// mest. Den som har mycket över ger lättare (overflod = vad hen har delat med vad hen själv behöver: 1 ger 0,7 gånger,
// 2 ger 1 och 3 eller mer 1,3 gånger), seden Gemenskap gör alla givmildare och Var och en för sig snålare, och ju
// rikare byn är desto mindre ger man (delning.ts). Till sina barn och sin partner ger man lika gärna i en rik by
export const OVERFLOD = { min: 0.7, max: 1.3 };
export const GEMENSKAP_GE = 0.25; // så mycket givmildare (eller snålare) seden gör folk, vid Gemenskap fullt ut
export const RIK_GE = 0.4; // så mycket av viljan att ge till andra än barn och partner som finns kvar i en rik by
export function willing(s: State, g: Person, m: Person, overflod = 1) {
  const over = process.env.PROV === 'over' ? 1 : process.env.PROV === 'golv' ? clamp(0.4 + 0.3 * overflod, 1, OVERFLOD.max) : clamp(0.4 + 0.3 * overflod, OVERFLOD.min, OVERFLOD.max), sed = 1 + GEMENSKAP_GE * s.seder.v.gemenskap;
  if (m.mother === g.id || m.father === g.id) return clamp(0.95 * Math.max(1, over) * sed, 0, 1); // till sitt barn ger man också det sista
  const r = getRel(s, g, m);
  if (r.op < -10) return 0;
  const emp = stat(g, 'empati', s.now) / 20, nara = g.partner === m.id;
  const base = nara ? 0.8 : isKin(g, m) ? 0.6 : clamp(r.op / 80, 0, 0.6);
  const rik = nara || process.env.PROV === 'rik' ? 1 : RIK_GE + (1 - RIK_GE) * (s.delning?.andel ?? 1);
  return clamp(base * (0.5 + emp) * over * sed * rik, 0, 1);
}
// lånar ägaren ut till p?
export function lends(s: State, owner: number, p: Person) {
  if (owner === BYN || owner === p.id) return true;
  const o = byId(s, owner);
  if (!o || !alive(o)) return true;
  return o.partner === p.id || isKin(o, p) || getRel(s, o, p).op > -10;
}
// Gåvor och byten i samtal: den som saknar ett redskap hen behöver i sitt arbete tar upp det. Den andra ger ett redskap
// hen har över (har två av slaget, eller arbetar inte med det). Har den som frågar själv något över som den andra saknar
// blir det ett byte, annars en gåva. Viljan är willing. Gåvan gör dem närmare.
const KINDS = () => Object.keys(SAKER).filter(isTool);
// hur stor del av sin tid p arbetar med redskapet
function useShare(p: Person, k: string) {
  let tot = 0, n = 0;
  for (const a in p.habit) tot += p.habit[a];
  for (const a of actsOf(k)) n += p.habit[a] ?? 0;
  return tot > 0 ? n / tot : 0;
}
const ownsKind = (s: State, p: Person, k: string) => tingOf(s).some(t => t.agare === p.id && t.k === k);
const needsTool = (s: State, p: Person, k: string) => !ownsKind(s, p, k) && useShare(p, k) > 0.1;
// ett redskap p har över: hen har fler av slaget, eller arbetar knappt med det. Inte det hen arbetar med just nu
function spare(s: State, p: Person, k: string) {
  const own = tingOf(s).filter(t => t.agare === p.id && t.k === k);
  if (own.length < 2 && useShare(p, k) >= 0.03) return;
  return own.filter(t => !(t.hos === p.id && usesTool(p.task) === k)).sort((a, b) => b.c - a.c)[0];
}
function give(t: Ting, g: Person, m: Person) {
  t.agare = m.id;
  if (t.hos === g.id) t.hos = undefined;
}
// a talar med b. Saknar någon av dem ett redskap som den andra har över? Returnerar vad som hände
export function askForTool(s: State, a: Person, b: Person): 'gåva' | 'byte' | undefined {
  for (const [m, g] of [[a, b], [b, a]]) {
    for (const k of KINDS()) {
      if (!needsTool(s, m, k)) continue;
      const t = spare(s, g, k);
      if (!t || rnd(s, 'dela', g) >= willing(s, g, m, tingOf(s).filter(x => x.agare === g.id && x.k === k).length)) continue;
      // byte: mottagaren har något över som givaren saknar
      let back: Ting | undefined;
      for (const j of KINDS()) if (j !== k && needsTool(s, g, j)) { back = spare(s, m, j); if (back) break; }
      give(t, g, m);
      const namn = (SAKER[k]?.namn ?? k).toLowerCase(), r = getRel(s, a, b);
      if (back) {
        give(back, m, g);
        r.op = clamp(r.op + 2, -100, 100);
        think(m, `Bytte till sig en ${namn} av ${g.name}`, 0.06, s.now, 6 * 3600);
        think(g, `Bytte till sig en ${(SAKER[back.k]?.namn ?? back.k).toLowerCase()} av ${m.name}`, 0.06, s.now, 6 * 3600);
        count(s, 'byten');
        log(s, `${m.name} och ${g.name} bytte: en ${namn} mot en ${(SAKER[back.k]?.namn ?? back.k).toLowerCase()}.`, 'rel', [m.id, g.id]);
        return 'byte';
      }
      r.op = clamp(r.op + 4, -100, 100);
      think(m, `Fick en ${namn} av ${g.name}`, 0.1, s.now, 12 * 3600);
      think(g, `Gav en ${namn} till ${m.name}`, 0.05, s.now, 6 * 3600);
      count(s, 'gavor');
      log(s, `${g.name} gav en ${namn} till ${m.name}.`, 'rel', [g.id, m.id]);
      return 'gåva';
    }
  }
}
