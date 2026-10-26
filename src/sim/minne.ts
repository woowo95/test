import { PLATS, campCenter, campDist, campKey } from './plats';
import { byId, count, isParent, living, log, stat } from './folk';
import { teach } from './teknik';
import { FANGST, Kind, prospect, regrowOf, richness, shoreOf, standAt, stoneDist, synsOf, toppOf, vaxerAt } from './fynd';
import { getMap } from './karta';
import { groundOf, tileOf } from './mark';
import { kn, learnK } from './kunskap';
import { clamp, pickViktat, rnd } from './slump';
import { ageIndex, lightLevel } from './tid';
import { DAY, H, HOUR, LKind, Lardom, Person, Rel, State, T, W } from './typer';
import { FOREST } from './vag';

// Kunskap och lärdomar.
// Kunskap är det en person kan, till exempel att skilja kantarellen från spindlingen. Den är alltid rätt och glöms
// bara långsamt om den inte används. Lärdomar är det en person tror om världen: var det finns mat och flinta och
// var det är farligt. De kan vara inaktuella, överdrivna eller helt fel, och de bleknar fort om ingen berättar om dem.
// Båda sprids i samtal, och den som berättar stärker sitt eget minne. Egenskapen Minne avgör hur fort det glöms.

// ---------- områden ----------
const AREA = 8;
const aw = () => Math.ceil(W / AREA), ah = () => Math.ceil(H / AREA);
export const areaOf = (x: number, y: number) => Math.floor(clamp(y, 0, H - 1) / AREA) * aw() + Math.floor(clamp(x, 0, W - 1) / AREA);
const areaCenter = (a: number) => ({ x: Math.min(W, (a % aw()) * AREA + AREA / 2), y: Math.min(H, Math.floor(a / aw()) * AREA + AREA / 2) });

// hur mycket ett område ger, så som man ser det när man går runt där: snittet av de fem bästa rutorna.
// 'nu' är det som finns kvar, 'vaxer' var det växer (buskar och spår syns även när det är plockat) och 'syns'
// vad marken ser ut att kunna ge för den som inte varit där. Sparas en timme i taget.
const LKINDS: LKind[] = ['samla', 'jakt', 'fiske', 'flinta', 'fara'];
const MODES = ['nu', 'vaxer', 'syns'] as const;
type Mode = typeof MODES[number];
const LK_I = Object.fromEntries(LKINDS.map((k, i) => [k, i])) as Record<LKind, number>;
const MODE_I = Object.fromEntries(MODES.map((m, i) => [m, i])) as Record<Mode, number>;
const areaCache = new WeakMap<State, { hr: number; v: Float64Array }>();
function areaValue(s: State, k: LKind, a: number, mode: Mode = 'nu') {
  const hr = Math.floor(s.now / HOUR), n = aw() * ah();
  let c = areaCache.get(s);
  if (!c || c.hr !== hr) { c = { hr, v: new Float64Array(LKINDS.length * n * 3).fill(NaN) }; areaCache.set(s, c); }
  const key = (LK_I[k] * n + a) * 3 + MODE_I[mode];
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
  if (k === 'fara') return 0;
  const fn = mode === 'nu' ? undefined : mode === 'vaxer' ? (i: number) => vaxerAt(s, k, i) : (i: number) => synsOf(s, k, i);
  nTopp = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) iTopp(fn ? standAt(s, k, x, y, fn) : richness(s, k, x + 0.5, y + 0.5));
  let sum = 0;
  for (let j = 0; j < nTopp; j++) sum += topp[j];
  return sum / TOPP;
}

// ---------- lärdomar ----------
const MAX = 20;
export const findL = (p: Person, k: LKind, a: number) => p.lardomar?.find(l => l.k === k && l.a === a);
function trim(s: State, p: Person) {
  const L = p.lardomar!;
  if (L.length <= MAX) return;
  L.sort((x, y) => y.c * (y.k === 'fara' ? 2 : 1) - x.c * (x.k === 'fara' ? 2 : 1));
  count(s, 'glomt', L.length - MAX); // det minst säkra trängs undan
  L.length = MAX;
}
// hur mycket ett värde är jämfört med en rik plats av samma slag (1 ≈ gott om)
const relOf = (k: LKind, v: number) => k === 'fara' || k === 'flinta' ? v : v / (toppOf(k) * 0.6);
// egen upplevelse: personen ser hur mycket som finns i området
// Man ser också om det växer där (buskar, svampmark, spår), så att man vet om platsen är plockad eller död.
// Var platsen mycket sämre än man trott rättas lärdomen, och det blir en nyhet som gärna berättas vidare.
export function observe(s: State, p: Person, k: LKind, x: number, y: number, c = 1) {
  const a = areaOf(x, y), v = areaValue(s, k, a), g = k === 'flinta' ? undefined : areaValue(s, k, a, 'vaxer');
  const l = findL(p, k, a);
  if (l) {
    const fel = k !== 'flinta' && k !== 'fara' && relOf(k, Math.min(3, hoped(s, l))) - relOf(k, v) > 0.4;
    if (fel) count(s, 'rattat');
    l.v = v; l.g = g; l.c = Math.max(c, l.src === undefined ? l.c : 0); l.t = s.now; l.src = undefined; l.led = 0;
    if (fel) l.ny = s.now; else delete l.ny;
    return;
  }
  (p.lardomar ??= []).push({ k, a, v, ...(g !== undefined ? { g } : {}), c, t: s.now, led: 0 });
  trim(s, p);
}
// den som arbetar i ett område ser också vad mer som finns där: bär, spår av vilt och fisk i vattnet
const SER_RUNT: Kind[] = ['samla', 'jakt', 'fiske'];
export function lookAround(s: State, p: Person, x: number, y: number) {
  for (const k of SER_RUNT) if (k === 'fiske' ? areaValue(s, k, areaOf(x, y)) > 0 : true) observe(s, p, k, x, y);
}
// vad personen tror att man hittar på en ruta. I närområdet ser man det. Längre bort syns marken (skog, äng, strand)
// men inte hur mycket andra redan tagit där: då gäller minnet, och utan minne en gissning efter hur marken ser ut.
// Den nyfikne tror mer på det okända.
const trustUnknown = (s: State, p: Person) => 0.45 + stat(p, 'nyfikenhet', s.now) / 40;
// En plats man minns som plockad tror man har vuxit tillbaka efter en tid; en plats där inget växer längre blir inte bättre.
export function hoped(s: State, l: Lardom) {
  if (l.g === undefined || l.g <= l.v || l.k === 'flinta' || l.k === 'fara') return l.v;
  const r = regrowOf(l.k, ageIndex(s));
  return l.g - (l.g - l.v) * Math.exp(-r * (s.now - l.t) / HOUR);
}
// syns: vad rutan ser ut att kunna ge, pot: samma för hela området
const believed = (s: State, l: Lardom | undefined, syns: number, u: number, pot = syns) => l ? Math.min(3, hoped(s, l)) * l.c * Math.min(1.2, syns / Math.max(0.05, pot)) + syns * u * (1 - l.c) : syns * u;
// sight, u (trustUnknown) och syns (synsOf för k) räknas en gång när samma person frågas om många rutor
function perceive(s: State, p: Person, k: Kind, x: number, y: number, sight: number, u: number, syns: (i: number) => number) {
  const a = areaOf(x, y);
  const v = sees(s, p, x, y, sight) ? richness(s, k, x + 0.5, y + 0.5) : believed(s, findL(p, k, a), standAt(s, k, x, y, syns), u, areaValue(s, k, a, 'syns'));
  return v - fear(s, p, a);
}
// rädsla för ett område: den modige bryr sig mindre
function fear(s: State, p: Person, a: number) {
  const l = findL(p, 'fara', a);
  return l ? l.v * l.c * clamp(1.3 - stat(p, 'mod', s.now) / 20, 0.2, 1.3) : 0;
}
// det man ser: rutorna runt där man står just nu.
// Synvidden beror på var man står: kort i skogen, längre i öppen terräng, och kortare i mörker
export function sightOf(s: State, p: Person) {
  const base = groundOf(s).trees[tileOf(p.x, p.y)] >= FOREST ? 5 : 10;
  return base * (0.4 + 0.6 * lightLevel(s.now));
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
    const sc = perceive(s, p, k, c.x, c.y, sight, u, syns) - c.d * PLATS.avstandPris + rnd(s, 'val', p) * 0.15;
    if (sc > bs) { bs = sc; best = c; }
  }
  if (!best || sees(s, p, best.x, best.y, sight)) return best;
  // väl framme letar hen upp den bästa platsen i området
  const x0 = Math.max(0, best.x - 5), y0 = Math.max(0, best.y - 5);
  const tiles = getMap(s.seed).tiles, shore = shoreOf(s.seed);
  let r = best, rs = richness(s, k, best.x + 0.5, best.y + 0.5);
  for (let y = y0; y < Math.min(H, best.y + 6); y++) for (let x = x0; x < Math.min(W, best.x + 6); x++) {
    const i = y * W + x; // bara land, och för fiske bara stranden
    if (tiles[i] === T.Vatten || (k === 'fiske' && !shore[i])) continue;
    const v = richness(s, k, x + 0.5, y + 0.5) - Math.hypot(x - best.x, y - best.y) * 0.01;
    if (v > rs) { rs = v; r = { x, y, d: campDist(s, x, y) }; }
  }
  return r;
}
// hur mycket personen tror att arbetet ger: det hen ser i närområdet eller det bästa hen minns längre bort
export const prospectFor = (s: State, p: Person, k: Kind) => Math.max(prospect(s, k), bestKnown(s, p, k));
// ett område där personen tror att det finns flinta
export function flintArea(p: Person) {
  let best: Lardom | undefined;
  for (const l of p.lardomar ?? []) if (l.k === 'flinta' && l.c > 0.25 && (!best || l.c > best.c)) best = l;
  return best?.a;
}

// en olycka: de som såg den, och de närmaste, blir rädda för platsen
export function fearPlace(s: State, victim: Person, cause: string) {
  if (campDist(s, victim.x, victim.y) < 6) return; // inte mitt i byn
  const a = areaOf(victim.x, victim.y), om = `${victim.name} dog ${cause} där`;
  for (const q of living(s)) {
    const saw = Math.hypot(q.x - victim.x, q.y - victim.y) < 10;
    const close = q.partner === victim.id || isParent(victim, q) || isParent(q, victim);
    if (!saw && !close) continue;
    const l = findL(q, 'fara', a);
    const v = saw ? 0.8 : 0.6, c = saw ? 1 : 0.7;
    if (l) { l.v = Math.max(l.v, v); l.c = Math.max(l.c, c); l.t = s.now; l.om = om; }
    else { (q.lardomar ??= []).push({ k: 'fara', a, v, c, t: s.now, led: saw ? 0 : 1, om }); trim(s, q); }
  }
}

// ---------- samtal ----------
// den som talar berättar ibland vad hen vet; sociala personer och berättare delar mer
export function share(s: State, a: Person, b: Person, r: Rel, kind: string) {
  const now = s.now;
  teach(s, a, b, kind);
  const talk = 0.03 + (stat(a, 'karisma', now) + stat(a, 'empati', now)) / 200 + (kind === 'berättelse' ? 0.35 : kind === 'djupt samtal' ? 0.12 : 0);
  if (a.lardomar?.length && rnd(s, 'minne', a) < talk) {
    // man berättar helst om rädslor, rika platser och platser som visat sig sämre än man trott
    const w = a.lardomar.map(l => (l.k === 'fara' ? 1.5 : l.k === 'flinta' ? 1 : nyhet(s, l) ? Math.max(1, l.v) : l.v) * l.c);
    tell(s, a, b, pickViktat(s, a.lardomar, w, 'minne', a), r);
  }
  // kunskap: den som kan något bättre lär ut lite
  if (a.kunskap) for (const k in a.kunskap) {
    const e = a.kunskap[k], d = e.v - kn(b, k);
    if (d > 0.1 && rnd(s, 'minne', a) < 0.15) {
      const before = kn(b, k), v = learnK(b, k, d * 0.2 * (0.5 + stat(b, 'intelligens', now) / 20), now);
      e.t = now; // att lära ut håller kunskapen vid liv
      if (k === 'svamp' && before < 0.6 && v >= 0.6) log(s, `${b.name} har lärt sig av ${a.name} att skilja kantarellen från den giftiga spindlingen.`, 'skill', [b.id, a.id]);
    }
  }
}
// en rättelse är en nyhet i två dygn
const nyhet = (s: State, l: Lardom) => l.ny !== undefined && s.now - l.ny < 2 * DAY;
function tell(s: State, a: Person, b: Person, l: Lardom, r: Rel) {
  const now = s.now;
  // att berätta stärker det egna minnet
  l.c = Math.min(1, l.c + 0.05 * (1 - l.c)); l.t = now;
  const trust = clamp(0.45 + r.op / 160, 0.15, 0.95);
  const c = l.c * trust * 0.85;
  // man överdriver gärna, särskilt det som är farligt
  const v = clamp(l.v * (l.k === 'fara' ? 1 + (rnd(s, 'minne', a) - 0.25) * 0.5 : 1 + (rnd(s, 'minne', a) - 0.4) * 0.35), 0, l.k === 'fara' ? 1.6 : 3);
  const e = findL(b, l.k, l.a);
  if (e) {
    if (e.src === undefined && e.led === 0 && e.c >= c && !nyhet(s, l)) return; // egen upplevelse väger tyngre, utom mot en nyhet
    // en nyhet om att platsen blivit sämre ersätter det man trodde; annars vägs det ihop
    e.v = nyhet(s, l) ? v : (e.v * e.c + v * c) / (e.c + c); if (l.g !== undefined) e.g = l.g; e.c = Math.max(e.c, c); e.t = now;
    if (nyhet(s, l)) e.ny = l.ny;
    if ((e.src !== undefined || e.led) && (l.led ?? 0) + 1 < (e.led ?? 1)) { e.src = a.id; e.led = (l.led ?? 0) + 1; } // kortare väg till källan
    if (l.om && !e.om) e.om = l.om;
    return;
  }
  (b.lardomar ??= []).push({ k: l.k, a: l.a, v, ...(l.g !== undefined ? { g: l.g } : {}), c, t: now, src: a.id, led: (l.led ?? 0) + 1, ...(l.om ? { om: l.om } : {}), ...(nyhet(s, l) ? { ny: l.ny } : {}) });
  trim(s, b);
  count(s, 'berattat');
  if (l.k === 'fara' && l.om) {
    const key = 'rykte' + l.a + ':' + l.om.length;
    if (!s.stat?.[key]) { count(s, key); log(s, `Berättelsen om hur ${l.om.replace(' där', '')} sprids i byn. Fler blir rädda för ${placeName(s, l.a)}.`, 'world', [a.id, b.id]); }
  }
}

// ---------- glömska ----------
// körs en gång i timmen: lärdomar bleknar på några dygn, kunskap som inte används på flera dygn bleknar långsamt
export function forget(s: State, hours: number) {
  const now = s.now;
  for (const p of s.people) {
    if (p.died !== undefined || p.left !== undefined) { delete p.lardomar; continue; }
    const m = stat(p, 'minne', now);
    if (p.lardomar) {
      const tau = 24 * (3 + m / 2); // 3–13 dygn
      p.lardomar = p.lardomar.filter(l => {
        l.c *= Math.exp(-hours / (tau * (l.k === 'fara' ? 3 : 1)));
        if (l.c >= 0.08) return true;
        count(s, 'glomt'); return false;
      });
      if (!p.lardomar.length) delete p.lardomar;
    }
    if (p.kunskap) for (const k in p.kunskap) {
      const e = p.kunskap[k];
      if (now - e.t > 2 * DAY) e.v *= Math.exp(-hours / (24 * 30 * (0.5 + m / 10)));
      if (e.v < 0.03) delete p.kunskap[k];
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
const WHAT: Record<LKind, string> = { samla: 'bär och rötter', jakt: 'kaniner', fiske: 'fisk i vattnet', flinta: 'flinta', fara: '' };
const amount = (v: number) => v >= 0.7 ? 'Gott om' : v >= 0.35 ? 'En del' : v >= 0.1 ? 'Lite' : 'Nästan inga';
// en lärdom i ord, med hur säker personen är, varifrån den kommer och om den stämmer. what är texten utan platsen.
export function describe(s: State, l: Lardom) {
  const place = placeName(s, l.a);
  const rel = (v: number) => relOf(l.k, v);
  const what0 = l.k === 'fara' ? `Farligt${l.om ? `: ${l.om}` : ''}` : l.k === 'flinta' ? 'Flinta finns'
    : l.g !== undefined && rel(l.g) < 0.1 ? `${l.k === 'fiske' ? 'Ingen fisk' : `Inga ${WHAT[l.k]}`} längre`
    : l.g !== undefined && rel(l.g) > rel(l.v) + 0.35 ? `${amount(rel(l.v))} ${WHAT[l.k]}, växer tillbaka` : `${amount(rel(l.v))} ${WHAT[l.k]}`;
  const what = what0 + (nyhet(s, l) ? ', sämre än man trott' : '');
  const text = l.k === 'fara' ? `Rädd för platsen ${place}${l.om ? ` (${l.om})` : ''}` : `${what} ${place}`;
  const src = l.src === undefined ? (l.led ? 'fick höra om det' : 'egen erfarenhet') : `hört av ${byId(s, l.src)?.name ?? 'någon'}${(l.led ?? 1) > 1 ? `, ${l.led} led från den som var där` : ''}`;
  const sure = l.c >= 0.75 ? 'säker' : l.c >= 0.4 ? 'ganska säker' : 'osäker';
  let wrong = '';
  if (l.k === 'fara') wrong = 'platsen är inte farligare än andra' + (l.v > 0.95 ? ', och rädslan har vuxit när den berättats' : '');
  else {
    const real = areaValue(s, l.k, l.a);
    if (l.k === 'flinta') { if (real < 0.5) wrong = 'fel, där finns ingen flinta'; }
    else if (rel(l.v) > rel(real) + 0.25) wrong = l.src === undefined && !l.led ? 'stämmer inte längre' : 'överdrivet eller inaktuellt';
    else if (rel(real) > rel(l.v) + 0.35) wrong = 'det finns mer än hen tror';
  }
  return { text, what, place, src, sure, wrong };
}
