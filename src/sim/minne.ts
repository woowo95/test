import { strandNu, vattenNu } from './sjo';
import { PLATS, campCenter, campDist, campKey } from './plats';
import { byId, count, forstaGang, gjort, isParent, living, log, stat } from './folk';
import { delade } from './berattelser';
import { teach } from './teknik';
import { FANGST, Kind, prospect, regrowOf, richness, shoreOf, standAt, stoneDist, synsOf, toppOf, vaxerAt } from './fynd';
import { getMap } from './karta';
import { groundOf, tileOf } from './mark';
import { KUNSKAPER, kn, learnK } from './kunskap';
import { clamp, pickViktat, rnd } from './slump';
import { ageIndex, lightLevel } from './tid';
import { DAY, H, HOUR, Lardom, Person, Rel, State, T, W, egen, tvaDelar, visning } from './typer';
import { FOREST } from './vag';
import { balans } from './balans';
import type { SamtalDef } from './samtal';
import { RELT, arBast, arMentor, lartUt } from './relationer';
import { vattenSmuts } from './smuts';
import { lognFaktor, skvaller } from './rykten';
import { delaVarsel } from './motgang';

// ---------- balanstal (regel 8) ----------
// Lärdomar: hur många man minns, hur mycket man tror på dem, hur de sprids och hur fort de glöms. Värdet (v) mäts i det en
// rik plats ger (toppOf i fynd.ts) och säkerheten (c) går från 0 till 1. Hur nära ett område ligger lägret står i PLATS
export const MINNE = balans('minne', {
  max: 20, // så många lärdomar minns man högst; det minst säkra trängs undan
  faraVikt: 2, // en rädsla, och minnet av högvattnet (steg 3.8.7), räknas så här många gånger så säker när det trängs undan
  rik: 0.6, // en plats är rik (värde 1, gott om) när den ger så här stor del av det bästa som finns
  vMax: 3, // en lärdom, och det man tror att en plats ger, är värd högst så här mycket (en rädsla högst vMaxFara)
  vMaxFara: 1.6,
  felGrans: 0.4, // är platsen så här mycket sämre än man trott (mätt mot en rik plats) rättas lärdomen och blir en nyhet
  nyhetDygn: 2, // en rättelse är en nyhet så här många dygn (år i spelet)
  okantBas: 0.45, // hur mycket den som inte varit på en plats tror på det marken lovar: okantBas + nyfikenhet / okantNyfiken
  okantNyfiken: 40,
  synsMax: 1.2, // det marken lovar på en ruta får väga högst så här mycket mer än områdets ...
  synsMin: 0.05, // ... och områdets värde räknas inte lägre än så här
  radslaMax: 1.3, // rädsla för ett område väger radslaMax - mod / 20, men minst radslaMin och högst radslaMax
  radslaMin: 0.2,
  siktSkog: 5, // man ser så här många rutor i skogen ...
  siktOppet: 10, // ... och så här många annars, gånger siktMork + siktLjus * ljuset (kortare i mörker)
  siktMork: 0.4,
  siktLjus: 0.6,
  valBrus: 0.15, // slumpen när man väljer plats, mot platsens värde
  sokR: 5, // väl framme letar man efter den bästa rutan inom så här många rutor ...
  sokPris: 0.01, // ... och varje ruta bort från den valda platsen kostar så här mycket
  flintaSaker: 0.25, // man går till ett område efter flinta när lärdomen är säkrare än så här
  olyckaBy: 6, // en olycka närmare byn än så här många rutor gör ingen rädd
  olyckaSyn: 10, // de som var närmare än så här många rutor såg olyckan
  radslaSett: 0.8, // de som såg den blir så här rädda för platsen (värde i lärdomen), och säkra på det med radslaSettSaker ...
  radslaSettSaker: 1,
  radslaHort: 0.6, // ... de närmaste som hörde om den så här rädda, och säkra på det med radslaHortSaker
  radslaHortSaker: 0.7,
  delaBas: 0.03, // chansen att den som talar berättar något: delaBas + (karisma + empati) / delaDiv, och mer i en berättelse eller ett djupt samtal (dela i SAMTALSSLAG, samtal.ts)
  delaDiv: 200,
  delaBerattelse: 0.35,
  delaDjupt: 0.12,
  delaFara: 1.5, // en rädsla berättas helst (vikten mot andra lärdomar, som väger sitt värde)
  larMin: 0.1, // den som kan en kunskap bättre lär ut den om skillnaden är över detta ...
  larChans: 0.15, // ... med så här stor chans per samtal ...
  larDel: 0.2, // ... och den som lyssnar får så här stor del av skillnaden, gånger larBas + intelligens / 20
  larBas: 0.5,
  larKant: 0.6, // en kunskap över detta räknas som lärd (loggas)
  berattaStark: 0.05, // att berätta stärker det egna minnet så här stor del av det som fattas
  troBas: 0.45, // hur mycket den som lyssnar tror på den som berättar: troBas + relationen / troDiv, mellan troMin och troMax ...
  troDiv: 160,
  troMin: 0.15,
  troMax: 0.95,
  troDel: 0.85, // ... och det som berättas får så här stor del av säkerheten
  overFara: 0.25, // man överdriver det som berättas: en rädsla med 1 + (slump - overFara) * overFaraSpann ...
  overFaraSpann: 0.5,
  over: 0.4, // ... annat med 1 + (slump - over) * overSpann
  overSpann: 0.35,
  glomBas: 3, // lärdomar bleknar med en tidskonstant på glomBas + minne / glomMinne dygn (3–13) ...
  glomMinne: 2,
  glomFara: 3, // ... en rädsla glöms så här många gånger så långsamt
  glomFlod: 3, // ... och minnet av hur högt vattnet nådde (steg 3.8.7, flod.ts) så här många gånger så långsamt
  glomGrans: 0.08, // en lärdom som blivit mindre säker än så här är glömd
  kunskapStill: 2, // en kunskap som inte använts på så här många dygn börjar blekna ...
  kunskapDygn: 30, // ... med en tidskonstant på kunskapDygn * (kunskapBas + minne / kunskapMinne) dygn
  kunskapBas: 0.5,
  kunskapMinne: 10,
  kunskapBort: 0.03, // en kunskap som bleknat under detta är glömd
});

// Kunskap och lärdomar.
// Kunskap är det en person kan, till exempel att skilja kantarellen från spindlingen. Den är alltid rätt och glöms
// bara långsamt om den inte används. Lärdomar är det en person tror om världen: var det finns mat och flinta och
// var det är farligt. De kan vara inaktuella, överdrivna eller helt fel, och de bleknar fort om ingen berättar om dem.
// Båda sprids i samtal, och den som berättar stärker sitt eget minne. Egenskapen Minne avgör hur fort det glöms.

// ---------- områden ----------
export const AREA = 8; // ett lärdomsområde är AREA × AREA rutor
const aw = () => Math.ceil(W / AREA), ah = () => Math.ceil(H / AREA);
export const areaOf = (x: number, y: number) => Math.floor(clamp(y, 0, H - 1) / AREA) * aw() + Math.floor(clamp(x, 0, W - 1) / AREA);
const areaCenter = (a: number) => ({ x: Math.min(W, (a % aw()) * AREA + AREA / 2), y: Math.min(H, Math.floor(a / aw()) * AREA + AREA / 2) });

// hur mycket ett område ger, så som man ser det när man går runt där: snittet av de fem bästa rutorna.
// 'nu' är det som finns kvar, 'vaxer' var det växer (buskar och spår syns även när det är plockat) och 'syns'
// vad marken ser ut att kunna ge för den som inte varit där. Sparas en timme i taget (av gränssnittet i en egen del, typer.ts).
// lärdomarnas slag (registret): vad = ordet i lärdomens text (describe), inga = texten när inget växer där längre, namn = ordet
// i listor (sammanställningen efter ikappräkningen). fynd = ett fynd som växer och plockas (Kind i fynd.ts): det ses runt den som
// arbetar (serOmFinns: bara där det finns något), växer tillbaka i minnet och kan visa sig sämre än man trott.
// Flinta, rädslor (fara), vattnet och högvattnet (flod) har egna regler nedan. Vattnets värde är hur smutsigt det är (0 = rent, 1 = mycket
// smutsigt, smutsOf i sjo.ts): man lär sig det där man dricker (steg 2.4.1, torst.ts). Ordningen är den i cachen nedan
// ikon/tecken: symbolen för slaget av lärdom i personrutan (steg 3.3.6)
interface LardomDef { vad: string; namn: string; inga?: string; fynd?: true; serOmFinns?: true; ikon: string; tecken: string }
const LDEF = {
  samla: { vad: 'bär och rötter', namn: 'bär och rötter', inga: 'Inga bär och rötter', fynd: true, ikon: 'bar', tecken: '🫐' },
  jakt: { vad: 'kaniner', namn: 'vilt', inga: 'Inga kaniner', fynd: true, ikon: 'kanin', tecken: '🐇' },
  fiske: { vad: 'fisk i vattnet', namn: 'abborre', inga: 'Ingen fisk', fynd: true, serOmFinns: true, ikon: 'abborre', tecken: '🐟' },
  flinta: { vad: 'flinta', namn: 'flinta', ikon: 'flinta', tecken: '🪨' },
  fara: { vad: '', namn: 'farliga platser', ikon: 'l_fara', tecken: '⚠️' },
  vatten: { vad: 'vatten', namn: 'rent och smutsigt vatten', ikon: 'a_vatten', tecken: '💧' },
  flod: { vad: 'högvattnet', namn: 'högvattnet', ikon: 'm_oversvamning', tecken: '🌊' }, // hur högt en översvämning nådde (steg 3.8.7, flod.ts): v = rutor upp på land
} satisfies Record<string, LardomDef>;
export type LKind = keyof typeof LDEF;
export const LARDOMAR: Record<LKind, LardomDef> = LDEF;
const LKINDS = Object.keys(LDEF) as LKind[];
const arFynd = (k: LKind): k is Kind => !!LARDOMAR[k].fynd;
const MODES = ['nu', 'vaxer', 'syns'] as const;
type Mode = typeof MODES[number];
const LK_I = Object.fromEntries(LKINDS.map((k, i) => [k, i])) as Record<LKind, number>;
const MODE_I = Object.fromEntries(MODES.map((m, i) => [m, i])) as Record<Mode, number>;
const areaCache = tvaDelar<{ hr: number; v: Float64Array }>();
function areaValue(s: State, k: LKind, a: number, mode: Mode = 'nu') {
  const hr = Math.floor(s.now / HOUR), n = aw() * ah(), key = (LK_I[k] * n + a) * 3 + MODE_I[mode];
  if (visning.pa) { const f = areaCache.sim.get(s); if (f?.hr === hr && !Number.isNaN(f.v[key])) return f.v[key]; }
  const m = egen(areaCache);
  let c = m.get(s);
  if (!c || c.hr !== hr) { c = { hr, v: new Float64Array(LKINDS.length * n * 3).fill(NaN) }; m.set(s, c); }
  let v = c.v[key];
  if (Number.isNaN(v)) c.v[key] = v = areaCalc(s, k, a, mode);
  return v;
}
// de fem största värdena i ett område, störst först (en arbetsbuffert, tom mellan anropen)
const TOPP = PLATS.toppArea, topp = new Float64Array(TOPP);
let nTopp = 0;
function iTopp(v: number) {
  let j = nTopp;
  if (j === TOPP) { if (!(v > topp[TOPP - 1])) return; j = TOPP - 1; } else nTopp++;
  while (j > 0 && topp[j - 1] < v) { topp[j] = topp[j - 1]; j--; }
  topp[j] = v;
}
function areaCalc(s: State, k: LKind, a: number, mode: Mode) {
  const x0 = (a % aw()) * AREA, y0 = Math.floor(a / aw()) * AREA, x1 = Math.min(W, x0 + AREA), y1 = Math.min(H, y0 + AREA);
  if (k === 'flinta') { const sd = stoneDist(s.seed); let v = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (sd[y * W + x] <= FANGST.stenNara) v = 1; return v; }
  if (k === 'fara' || k === 'flod') return 0;
  if (k === 'vatten') { const sh = shoreOf(s.seed); let v = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (sh[y * W + x]) { v += vattenSmuts(s, y * W + x); n++; } return n ? v / n : 0; } // snittet längs stranden, med toa-smutsen (steg 2.7.2)
  const fn = mode === 'nu' ? undefined : mode === 'vaxer' ? (i: number) => vaxerAt(s, k, i) : (i: number) => synsOf(s, k, i);
  nTopp = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) iTopp(fn ? standAt(s, k, x, y, fn) : richness(s, k, x + 0.5, y + 0.5));
  let sum = 0;
  for (let j = 0; j < nTopp; j++) sum += topp[j];
  return sum / TOPP;
}

// ---------- lärdomar ----------
export const findL = (p: Person, k: LKind, a: number) => p.lardomar?.find(l => l.k === k && l.a === a);
function trim(s: State, p: Person) {
  const L = p.lardomar!;
  if (L.length <= MINNE.max) return;
  L.sort((x, y) => y.c * (y.k === 'fara' || y.k === 'flod' ? MINNE.faraVikt : 1) - x.c * (x.k === 'fara' || x.k === 'flod' ? MINNE.faraVikt : 1)); // rädslorna och högvattnet (steg 3.8.7) väger mer
  count(s, 'glomt', L.length - MINNE.max); // det minst säkra trängs undan
  L.length = MINNE.max;
}
// hur mycket ett värde är jämfört med en rik plats av samma slag (1 ≈ gott om)
const relOf = (k: LKind, v: number) => arFynd(k) ? v / (toppOf(k) * MINNE.rik) : v;
// egen upplevelse: personen ser hur mycket som finns i området
// Man ser också om det växer där (buskar, svampmark, spår), så att man vet om platsen är plockad eller död.
// Var platsen mycket sämre än man trott rättas lärdomen, och det blir en nyhet som gärna berättas vidare.
export function observe(s: State, p: Person, k: LKind, x: number, y: number, c = 1) {
  const a = areaOf(x, y), v = areaValue(s, k, a), g = arFynd(k) ? areaValue(s, k, a, 'vaxer') : undefined;
  const l = findL(p, k, a);
  if (l) {
    const fel = arFynd(k) && relOf(k, Math.min(MINNE.vMax, hoped(s, l))) - relOf(k, v) > MINNE.felGrans;
    if (fel) count(s, 'rattat');
    l.v = v; l.g = g; l.c = Math.max(c, l.src === undefined ? l.c : 0); l.t = s.now; l.src = undefined; l.led = 0;
    if (fel) l.ny = s.now; else delete l.ny;
    return;
  }
  (p.lardomar ??= []).push({ k, a, v, ...(g !== undefined ? { g } : {}), c, t: s.now, led: 0 });
  trim(s, p);
}
// något hela byn var med om (hur högt vattnet nådde, steg 3.8.7, flod.ts): en egen upplevelse, och det högsta värdet gäller
export function bynsMinne(s: State, p: Person, k: LKind, a: number, v: number) {
  const l = findL(p, k, a);
  if (l) { l.v = Math.max(l.v, v); l.c = 1; l.t = s.now; l.src = undefined; l.led = 0; return; }
  (p.lardomar ??= []).push({ k, a, v, c: 1, t: s.now, led: 0 });
  trim(s, p);
}
// den som arbetar i ett område ser också vad mer som finns där: bär, spår av vilt och fisk i vattnet
const SER_RUNT = LKINDS.filter(arFynd);
export function lookAround(s: State, p: Person, x: number, y: number) {
  for (const k of SER_RUNT) if (LARDOMAR[k].serOmFinns ? areaValue(s, k, areaOf(x, y)) > 0 : true) observe(s, p, k, x, y);
}
// vad personen tror att man hittar på en ruta. I närområdet ser man det. Längre bort syns marken (skog, äng, strand)
// men inte hur mycket andra redan tagit där: då gäller minnet, och utan minne en gissning efter hur marken ser ut.
// Den nyfikne tror mer på det okända.
const trustUnknown = (s: State, p: Person) => MINNE.okantBas + stat(p, 'nyfikenhet', s.now) / MINNE.okantNyfiken;
// En plats man minns som plockad tror man har vuxit tillbaka efter en tid; en plats där inget växer längre blir inte bättre.
export function hoped(s: State, l: Lardom) {
  if (l.g === undefined || l.g <= l.v || !arFynd(l.k)) return l.v;
  const r = regrowOf(l.k, ageIndex(s));
  return l.g - (l.g - l.v) * Math.exp(-r * (s.now - l.t) / HOUR);
}
// syns: vad rutan ser ut att kunna ge, pot: samma för hela området
const believed = (s: State, l: Lardom | undefined, syns: number, u: number, pot = syns) => l ? Math.min(MINNE.vMax, hoped(s, l)) * l.c * Math.min(MINNE.synsMax, syns / Math.max(MINNE.synsMin, pot)) + syns * u * (1 - l.c) : syns * u;
// sight, u (trustUnknown) och syns (synsOf för k) räknas en gång när samma person frågas om många rutor
function perceive(s: State, p: Person, k: Kind, x: number, y: number, sight: number, u: number, syns: (i: number) => number) {
  const a = areaOf(x, y);
  const v = sees(s, p, x, y, sight) ? richness(s, k, x + 0.5, y + 0.5) : believed(s, findL(p, k, a), standAt(s, k, x, y, syns), u, areaValue(s, k, a, 'syns'));
  return v - fear(s, p, a);
}
// rädsla för ett område: den modige bryr sig mindre
function fear(s: State, p: Person, a: number) {
  const l = findL(p, 'fara', a);
  return l ? l.v * l.c * clamp(MINNE.radslaMax - stat(p, 'mod', s.now) / 20, MINNE.radslaMin, MINNE.radslaMax) : 0;
}
// det man ser: rutorna runt där man står just nu.
// Synvidden beror på var man står: kort i skogen, längre i öppen terräng, och kortare i mörker
export function sightOf(s: State, p: Person) {
  const base = groundOf(s).trees[tileOf(p.x, p.y)] >= FOREST ? MINNE.siktSkog : MINNE.siktOppet;
  return base * (MINNE.siktMork + MINNE.siktLjus * lightLevel(s.now));
}
// sight kan räknas ut i förväg när samma person frågas om många rutor
export const sees = (s: State, p: Person, x: number, y: number, sight = sightOf(s, p)) => Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) <= sight;
// det bästa personen tror finns utanför närområdet, inom en halv dags gång
function bestKnown(s: State, p: Person, k: Kind) {
  const o = fjarran(s), u = trustUnknown(s, p);
  let best = 0;
  for (let j = 0; j < o.a.length; j++) {
    const a = o.a[j];
    best = Math.max(best, believed(s, findL(p, k, a), areaValue(s, k, a, 'syns'), u) - o.d[j] * PLATS.avstandPris - fear(s, p, a));
  }
  return best;
}
// områdena bestKnown går igenom och deras avstånd till lägret. Det som syns från lägret räknas redan i prospect; här
// bara platser längre bort, oavsett var personen står just nu. Beror bara på lägret, och räknas om när det ändras
const fjarr = new WeakMap<State, { key: string; a: number[]; d: number[] }>();
function fjarran(s: State) {
  const key = campKey(s);
  let c = fjarr.get(s);
  if (!c || c.key !== key) {
    const f = campCenter(s), a: number[] = [], d: number[] = [];
    for (let i = 0; i < aw() * ah(); i++) {
      const m = areaCenter(i), di = campDist(s, m.x, m.y);
      if (di <= FANGST.syn || Math.abs(m.x - f.x) > PLATS.dagX || Math.abs(m.y - f.y) > PLATS.dagY) continue;
      a.push(i); d.push(di);
    }
    c = { key, a, d };
    fjarr.set(s, c);
  }
  return c;
}
// den plats personen väljer: det hen tror ger mest och inte är för långt bort. Väl framme ser hen sig omkring
// och går till den bästa rutan i närheten.
export function pickSpot(s: State, p: Person, k: Kind, cands: { x: number; y: number; d: number }[]) {
  let best: { x: number; y: number; d: number } | undefined, bs = -1e9;
  const sight = sightOf(s, p), u = trustUnknown(s, p), syns = (i: number) => synsOf(s, k, i);
  for (const c of cands) {
    const sc = perceive(s, p, k, c.x, c.y, sight, u, syns) - c.d * PLATS.avstandPris + rnd(s, 'val', p) * MINNE.valBrus;
    if (sc > bs) { bs = sc; best = c; }
  }
  if (!best || sees(s, p, best.x, best.y, sight)) return best;
  // väl framme letar hen upp den bästa platsen i området
  const x0 = Math.max(0, best.x - MINNE.sokR), y0 = Math.max(0, best.y - MINNE.sokR);
  const tiles = vattenNu(s), shore = strandNu(s); // vattnet som det är nu (torkan, steg 3.8.2)
  let r = best, rs = richness(s, k, best.x + 0.5, best.y + 0.5);
  for (let y = y0; y < Math.min(H, best.y + MINNE.sokR + 1); y++) for (let x = x0; x < Math.min(W, best.x + MINNE.sokR + 1); x++) {
    const i = y * W + x; // bara land, och för fiske bara stranden
    if (tiles[i] === T.Vatten || (k === 'fiske' && !shore[i])) continue;
    const v = richness(s, k, x + 0.5, y + 0.5) - Math.hypot(x - best.x, y - best.y) * MINNE.sokPris;
    if (v > rs) { rs = v; r = { x, y, d: campDist(s, x, y) }; }
  }
  return r;
}
// hur mycket personen tror att arbetet ger: det hen ser i närområdet eller det bästa hen minns längre bort
export const prospectFor = (s: State, p: Person, k: Kind) => Math.max(prospect(s, k), bestKnown(s, p, k));
// ett område där personen tror att det finns flinta
export function flintArea(p: Person) {
  let best: Lardom | undefined;
  for (const l of p.lardomar ?? []) if (l.k === 'flinta' && l.c > MINNE.flintaSaker && (!best || l.c > best.c)) best = l;
  return best?.a;
}

// en olycka (en död eller en svår skada, om = det man minns): de som såg den, och de närmaste, blir rädda för platsen
export function fearPlace(s: State, victim: Person, cause: string, om = `${victim.name} dog ${cause} där`) {
  if (campDist(s, victim.x, victim.y) < MINNE.olyckaBy) return; // inte mitt i byn
  const a = areaOf(victim.x, victim.y);
  for (const q of living(s)) {
    const saw = Math.hypot(q.x - victim.x, q.y - victim.y) < MINNE.olyckaSyn;
    const close = victim.partner === q.id || isParent(victim, q) || isParent(q, victim); // die() har redan tagit bort q.partner
    if (!saw && !close) continue;
    const l = findL(q, 'fara', a);
    const v = saw ? MINNE.radslaSett : MINNE.radslaHort, c = saw ? MINNE.radslaSettSaker : MINNE.radslaHortSaker;
    if (l) { l.v = Math.max(l.v, v); l.c = Math.max(l.c, c); l.t = s.now; l.om = om; }
    else { (q.lardomar ??= []).push({ k: 'fara', a, v, c, t: s.now, led: saw ? 0 : 1, om }); trim(s, q); }
  }
}

// ---------- samtal ----------
// den som talar berättar ibland vad hen vet; sociala personer och berättare delar mer
export function share(s: State, a: Person, b: Person, r: Rel, slag: SamtalDef) {
  const now = s.now;
  const mentor = arMentor(a, b) ? RELT.mentorLar : 1; // mentorn lär ut mer, och man berättar mer för sin bästa vän (steg 3.1.1)
  teach(s, a, b, slag, mentor);
  const talk = (MINNE.delaBas + (stat(a, 'karisma', now) + stat(a, 'empati', now)) / MINNE.delaDiv + (slag.dela ? MINNE[slag.dela] : 0)) * (arBast(a, b) ? RELT.bastBerattar : 1);
  if (a.lardomar?.length && rnd(s, 'minne', a) < talk) {
    // man berättar helst om rädslor, rika platser och platser som visat sig sämre än man trott
    const w = a.lardomar.map(l => (l.k === 'fara' ? MINNE.delaFara : l.k === 'flinta' || l.k === 'vatten' || l.k === 'flod' ? 1 : nyhet(s, l) ? Math.max(1, l.v) : l.v) * l.c);
    tell(s, a, b, pickViktat(s, a.lardomar, w, 'minne', a), r);
  }
  skvaller(s, a, b, r, slag.dela === 'delaBerattelse'); // och om vad hen tycker om andra (steg 3.3, rykten.ts)
  if (a.varsel) delaVarsel(s, a, b, r); // och om en motgång som kommer (steg 3.8.1, motgang.ts)
  // kunskap: den som kan något bättre lär ut lite
  if (a.kunskap) for (const k in a.kunskap) {
    const e = a.kunskap[k], d = e.v - kn(b, k);
    if (d > MINNE.larMin && rnd(s, 'minne', a) < MINNE.larChans * mentor) {
      lartUt(s, a, b);
      delade('kunskap', k, KUNSKAPER[k]?.larAv ?? KUNSKAPER[k]?.namn.toLowerCase()); // samtalets ämne (steg 3.9.5)
      const before = kn(b, k), v = learnK(b, k, d * MINNE.larDel * (MINNE.larBas + stat(b, 'intelligens', now) / 20), now);
      e.t = now; // att lära ut håller kunskapen vid liv
      const larAv = KUNSKAPER[k]?.larAv;
      if (larAv && before < MINNE.larKant && v >= MINNE.larKant) log(s, `${b.name} har lärt sig av ${a.name} att ${larAv}.`, 'skill', [b.id, a.id]);
    }
  }
}
// en rättelse är en nyhet i två dygn
const nyhet = (s: State, l: Lardom) => l.ny !== undefined && s.now - l.ny < MINNE.nyhetDygn * DAY;
function tell(s: State, a: Person, b: Person, l: Lardom, r: Rel) {
  // att berätta stärker det egna minnet, men platsen sågs inte nu (t, återväxten räknas därifrån)
  l.c = Math.min(1, l.c + MINNE.berattaStark * (1 - l.c));
  delade(l.k === 'fara' ? 'fara' : 'plats', LARDOMAR[l.k].ikon, l.k === 'fara' ? 'en farlig plats' : LARDOMAR[l.k].vad); // samtalets ämne (steg 3.9.5)
  const trust = clamp(MINNE.troBas + r.op / MINNE.troDiv, MINNE.troMin, MINNE.troMax) * lognFaktor(b, a); // mindre på en lögnare (steg 3.3.3)
  const c = l.c * trust * MINNE.troDel;
  // man överdriver gärna, särskilt det som är farligt
  const v = l.k === 'flod' ? l.v : clamp(l.v * (l.k === 'fara' ? 1 + (rnd(s, 'minne', a) - MINNE.overFara) * MINNE.overFaraSpann : 1 + (rnd(s, 'minne', a) - MINNE.over) * MINNE.overSpann), 0, l.k === 'fara' ? MINNE.vMaxFara : l.k === 'vatten' ? 1 : MINNE.vMax);
  const e = findL(b, l.k, l.a);
  if (e && l.k === 'flod') { e.v = Math.max(e.v, v); e.c = Math.max(e.c, c); return; } // hur högt vattnet nådde: det högsta gäller
  if (e) {
    if (e.src === undefined && e.led === 0 && e.c >= c && !nyhet(s, l)) return; // egen upplevelse väger tyngre, utom mot en nyhet
    // en nyhet om att platsen blivit sämre ersätter det man trodde; annars vägs det ihop
    // tiden vägs på samma sätt som värdet, så att det nyare väger in (steg 2.12.5)
    e.t = nyhet(s, l) ? l.t : (e.t * e.c + l.t * c) / (e.c + c);
    e.v = nyhet(s, l) ? v : (e.v * e.c + v * c) / (e.c + c); if (l.g !== undefined) e.g = l.g; e.c = Math.max(e.c, c);
    if (nyhet(s, l)) e.ny = l.ny;
    if ((e.src !== undefined || e.led) && (l.led ?? 0) + 1 < (e.led ?? 1)) { e.src = a.id; e.led = (l.led ?? 0) + 1; } // kortare väg till källan
    if (l.om && !e.om) e.om = l.om;
    return;
  }
  (b.lardomar ??= []).push({ k: l.k, a: l.a, v, ...(l.g !== undefined ? { g: l.g } : {}), c, t: l.t, src: a.id, led: (l.led ?? 0) + 1, ...(l.om ? { om: l.om } : {}), ...(nyhet(s, l) ? { ny: l.ny } : {}) });
  trim(s, b);
  count(s, 'berattat'); gjort(s, a, 'berattat');
  if (l.k === 'fara' && l.om && forstaGang(s, 'rykte' + l.a + ':' + l.om)) log(s, `Berättelsen om hur ${l.om.replace(' där', '')} sprids i byn. Fler blir rädda för ${placeName(s, l.a)}.`, 'world', [a.id, b.id]);
}

// ---------- glömska ----------
// körs en gång i timmen: lärdomar bleknar på några dygn, kunskap som inte används på flera dygn bleknar långsamt
export function forget(s: State, hours: number) {
  const now = s.now;
  for (const p of s.people) {
    if (p.died !== undefined || p.left !== undefined) { delete p.lardomar; continue; }
    const m = stat(p, 'minne', now);
    if (p.lardomar) {
      const tau = 24 * (MINNE.glomBas + m / MINNE.glomMinne); // 3–13 dygn
      p.lardomar = p.lardomar.filter(l => {
        l.c *= Math.exp(-hours / (tau * (l.k === 'fara' ? MINNE.glomFara : l.k === 'flod' ? MINNE.glomFlod : 1)));
        if (l.c >= MINNE.glomGrans) return true;
        count(s, 'glomt'); return false;
      });
      if (!p.lardomar.length) delete p.lardomar;
    }
    if (p.kunskap) for (const k in p.kunskap) {
      const e = p.kunskap[k];
      if (now - e.t > MINNE.kunskapStill * DAY) e.v *= Math.exp(-hours / (24 * MINNE.kunskapDygn * (MINNE.kunskapBas + m / MINNE.kunskapMinne)));
      if (e.v < MINNE.kunskapBort) delete p.kunskap[k];
    }
  }
}

// ---------- att visa ----------
const DIRS = ['öster', 'sydost', 'söder', 'sydväst', 'väster', 'nordväst', 'norr', 'nordost'];
function placeName(s: State, a: number) {
  const m = getMap(s.seed), g = groundOf(s), f = campCenter(s);
  const x0 = (a % aw()) * AREA, y0 = Math.floor(a / aw()) * AREA;
  let n = 0, wat = 0, sten = 0, skog = 0, sand = 0;
  for (let y = y0; y < Math.min(H, y0 + AREA); y++) for (let x = x0; x < Math.min(W, x0 + AREA); x++) {
    const i = y * W + x, t = m.tiles[i]; n++;
    if (t === T.Vatten) wat++; else if (t === T.Sten) sten++; else if (t === T.Sand) sand++; else if (g.trees[i] >= FOREST) skog++;
  }
  const terr = sten > 6 ? 'vid stenarna' : wat > n * 0.25 ? 'vid vattnet' : skog > n * 0.5 ? 'i skogen' : sand > n * 0.3 ? 'på stranden' : 'på ängen';
  const c = areaCenter(a), dx = c.x - f.x, dy = c.y - f.y;
  if (campDist(s, c.x, c.y) < 5) return `${terr} nära byn`;
  const dir = DIRS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  return `${terr} ${dir} om byn`;
}
const vattenOrd = (v: number) => v < 0.2 ? 'Rent vatten' : v < 0.5 ? 'Lite grumligt vatten' : 'Smutsigt vatten';
const amount = (v: number) => v >= 0.7 ? 'Gott om' : v >= 0.35 ? 'En del' : v >= 0.1 ? 'Lite' : 'Nästan inga';
// en lärdom i ord, med hur säker personen är, varifrån den kommer och om den stämmer. what är texten utan platsen.
export function describe(s: State, l: Lardom) {
  const place = placeName(s, l.a);
  const rel = (v: number) => relOf(l.k, v);
  const what0 = l.k === 'fara' ? `Farligt${l.om ? `: ${l.om}` : ''}` : l.k === 'flinta' ? 'Flinta finns' : l.k === 'vatten' ? vattenOrd(l.v)
    : l.k === 'flod' ? `Vattnet nådde ${l.v === 1 ? 'en ruta' : `${l.v} rutor`} upp på land`
    : l.g !== undefined && rel(l.g) < 0.1 ? `${LARDOMAR[l.k].inga} längre`
    : l.g !== undefined && rel(l.g) > rel(l.v) + 0.35 ? `${amount(rel(l.v))} ${LARDOMAR[l.k].vad}, växer tillbaka` : `${amount(rel(l.v))} ${LARDOMAR[l.k].vad}`;
  const what = what0 + (nyhet(s, l) ? ', sämre än man trott' : '');
  const text = l.k === 'fara' ? `Rädd för platsen ${place}${l.om ? ` (${l.om})` : ''}` : l.k === 'flod' ? `${what} vid byn, och där bygger man inte` : `${what} ${place}`;
  const src = l.src === undefined ? (l.led ? 'fick höra om det' : 'egen erfarenhet') : `hört av ${byId(s, l.src)?.name ?? 'någon'}${(l.led ?? 1) > 1 ? `, ${l.led} led från den som var där` : ''}`;
  const sure = l.c >= 0.75 ? 'säker' : l.c >= 0.4 ? 'ganska säker' : 'osäker';
  let wrong = '';
  if (l.k === 'flod') wrong = ''; // det man varit med om stämmer
  else if (l.k === 'fara') wrong = 'platsen är inte farligare än andra' + (l.v > 0.95 ? ', och rädslan har vuxit när den berättats' : '');
  else {
    const real = areaValue(s, l.k, l.a);
    if (l.k === 'flinta') { if (real < 0.5) wrong = 'fel, där finns ingen flinta'; }
    else if (l.k === 'vatten') { if (Math.abs(l.v - real) > 0.3) wrong = l.v > real ? 'vattnet är renare än hen tror' : 'vattnet är smutsigare än hen tror'; }
    else if (rel(l.v) > rel(real) + 0.25) wrong = l.src === undefined && !l.led ? 'stämmer inte längre' : 'överdrivet eller inaktuellt';
    else if (rel(real) > rel(l.v) + 0.35) wrong = 'det finns mer än hen tror';
  }
  return { text, what, place, src, sure, wrong };
}
