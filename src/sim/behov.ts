import { State, Person, HOUR, DAY } from './typer';
import { FOOD } from './saker';
import { ageOf, alive, count, getRel, isKin, living, log, stat, think } from './folk';
import { chance, clamp, rnd } from './slump';
import { willing } from './agande';
import { mayTake, ownMove, ownsAmount, takeFood } from './lager';
import { eatPoison } from './fynd';

// ---------- behovsstegen ----------
// När någon behöver något går hen stegen i ordning: först sitt eget, sedan byns förråd, sedan ber hen om det som gåva i
// samtal (den som har över ger, familjen ger lättast: samma vilja att ge som för redskap, agande.ts). Stjäl gör man först
// när man håller på att dö av bristen. Hur nära döden man måste vara beror på empatin; den med mycket hög empati stjäl
// aldrig. Man stjäl helst av den man inte tycker om. Den bestulne märker det nästa gång hen själv tar av sitt eget för
// samma behov, och relationen blir sämre. Byten (steget mellan sitt eget och byns) finns inte än: det behövs ett värde
// på saker (designdokumentet).
// Varje behov är en post i BEHOV. Ett nytt behov (t.ex. ved till en eld för att inte frysa ihjäl) läggs till som en ny post.
export interface Behov {
  id: string;
  namn: string; // i loggen: "gav mat till", "stal mat av"
  slag: readonly string[]; // vilka saker i förrådet som fyller behovet
  minst: number; // minsta mängd som hjälper
  mangd: (p: Person, now: number) => number; // hur mycket man tar eller ber om på en gång
  kvar: number; // så mycket av sitt eget behåller den som ger till någon utanför familjen
  behover: (s: State, p: Person) => boolean; // p behöver det nu
  fara: (s: State, p: Person) => number; // hur nära döden bristen har fört p: 0 = ingen fara, 1 = död
  anvand: (s: State, p: Person, fran?: Person) => number; // p tar och använder det (fran = stjäl av den personen); ger mängden
}

export const STJAL_ALDRIG = 17; // empati från vilken man aldrig stjäl
export const STOLD_OP = 15; // så mycket sämre blir relationen när stölden upptäcks
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
export const BEHOV: Behov[] = [MAT];

// det p själv har och får ta av byns
export function hasFor(s: State, p: Person, b: Behov) { let n = 0; for (const k of b.slag) n += mayTake(s, p, k); return n; }
export function ownFor(s: State, p: Person, b: Behov) { let n = 0; for (const k of b.slag) n += ownsAmount(s, p, k); return n; }
// p behöver det och har inget eget eller av byns att ta
export const lacksFor = (s: State, p: Person, b: Behov) => b.behover(s, p) && hasFor(s, p, b) < b.minst;

// varje steg: den som behöver något tar av sitt eget och byns. Finns inget ber hen någon i närheten om det, och i
// yttersta nöd stjäl hen
export function needLadder(s: State, p: Person, dtSec: number) {
  for (const b of BEHOV) {
    if (!b.behover(s, p)) continue;
    if (hasFor(s, p, b) < b.minst && chance(s, FRAGA_TAKT, dtSec, 'dela', p)) askAround(s, p, b);
    if (hasFor(s, p, b) >= b.minst) { b.anvand(s, p); noticeTheft(s, p, b); continue; }
    const v = victimOf(s, p, b);
    if (v) stole(s, p, v, b, b.anvand(s, p, v));
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
    const w = willing(s, g, m);
    if (w > bw) { bw = w; best = g; }
  }
  if (best) gift(s, m, best, b);
}
// m ber g om det m saknar. Ger g? (Hur gärna man ger: agande.ts)
function gift(s: State, m: Person, g: Person, n: Behov) {
  const over = overOf(s, g, n, m);
  if (over < n.minst || rnd(s, 'dela', g) >= willing(s, g, m)) return false;
  let rest = Math.min(over, n.mangd(m, s.now));
  const want = rest;
  for (const k of n.slag) { if (rest <= 1e-9) break; rest -= ownMove(s, k, rest, g.id, m.id); }
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
  return false;
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
function stole(s: State, tjuv: Person, offer: Person, b: Behov, n: number) {
  if (n <= 1e-9) return;
  const st = (offer.stulet ??= []), f = st.find(x => x.av === tjuv.id && x.k === b.id);
  if (f) f.n += n; else st.push({ av: tjuv.id, k: b.id, n });
  count(s, 'stold_' + b.id);
}
// p har tagit av sitt eget för behovet b och märker om någon stulit av det
function noticeTheft(s: State, p: Person, b: Behov) {
  if (!p.stulet?.some(x => x.k === b.id)) return;
  for (const { av } of p.stulet.filter(x => x.k === b.id)) {
    const t = s.people.find(q => q.id === av);
    if (!t) continue;
    const r = getRel(s, p, t);
    r.op = clamp(r.op - STOLD_OP, -100, 100);
    think(p, `${t.name} stal min ${b.namn}`, -0.1, s.now, 12 * HOUR);
    if (alive(t)) think(t, `${p.name} vet att jag stal`, -0.05, s.now, 6 * HOUR);
    log(s, `${p.name} märkte att ${t.name} hade stulit hens ${b.namn}.`, 'rel', [p.id, t.id]);
  }
  p.stulet = p.stulet.filter(x => x.k !== b.id);
  if (!p.stulet.length) delete p.stulet;
}
