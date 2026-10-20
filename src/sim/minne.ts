import { byId, living, log, stat } from './folk';
import { Kind, capOf, count, prospect, richness, stoneDist } from './fynd';
import { getMap } from './karta';
import { groundOf } from './mark';
import { kn, learnK } from './kunskap';
import { clamp, rnd } from './slump';
import { DAY, H, HOUR, LKind, Lardom, Person, Rel, State, T, W } from './typer';
import { FOREST } from './vag';

// Kunskap och lärdomar.
// Kunskap är det en person kan, till exempel att skilja kantarellen från spindlingen. Den är alltid rätt och glöms
// bara långsamt om den inte används. Lärdomar är det en person tror om världen: var det finns mat och flinta och
// var det är farligt. De kan vara inaktuella, överdrivna eller helt fel, och de bleknar fort om ingen berättar om dem.
// Båda sprids i samtal, och den som berättar stärker sitt eget minne. Egenskapen Minne avgör hur fort det glöms.

// ---------- områden ----------
export const AREA = 8, AW = Math.ceil(W / AREA), AH = Math.ceil(H / AREA);
export const areaOf = (x: number, y: number) => Math.floor(clamp(y, 0, H - 1) / AREA) * AW + Math.floor(clamp(x, 0, W - 1) / AREA);
export const areaCenter = (a: number) => ({ x: Math.min(W, (a % AW) * AREA + AREA / 2), y: Math.min(H, Math.floor(a / AW) * AREA + AREA / 2) });
// byns närområde: här ser alla vad som finns utan att behöva minnas det
export const SIGHT = 8;

// hur mycket ett område ger just nu, så som man ser det när man går runt där: snittet av de fem bästa rutorna
const areaCache = new WeakMap<State, { hr: number; v: Map<string, number> }>();
export function areaValue(s: State, k: LKind, a: number, pot = false) {
  const hr = Math.floor(s.now / HOUR);
  let c = areaCache.get(s);
  if (!c || c.hr !== hr) { c = { hr, v: new Map() }; areaCache.set(s, c); }
  const key = (pot ? 'p' : '') + k + a;
  let v = c.v.get(key);
  if (v === undefined) {
    const x0 = (a % AW) * AREA, y0 = Math.floor(a / AW) * AREA, top: number[] = [];
    if (k === 'flinta') { const sd = stoneDist(s.seed); v = 0; for (let y = y0; y < Math.min(H, y0 + AREA); y++) for (let x = x0; x < Math.min(W, x0 + AREA); x++) if (sd[y * W + x] <= 2) v = 1; }
    else if (k === 'fara') v = 0;
    else {
      for (let y = y0; y < Math.min(H, y0 + AREA); y++) for (let x = x0; x < Math.min(W, x0 + AREA); x++) top.push(pot ? capOf(s, k, y * W + x) : richness(s, k, x + 0.5, y + 0.5));
      top.sort((p, q) => q - p);
      v = top.slice(0, 5).reduce((p, q) => p + q, 0) / 5;
    }
    c.v.set(key, v);
  }
  return v;
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
// egen upplevelse: personen ser hur mycket som finns i området
export function observe(s: State, p: Person, k: LKind, x: number, y: number, c = 1) {
  const a = areaOf(x, y), v = areaValue(s, k, a);
  const l = findL(p, k, a);
  if (l) { l.v = v; l.c = Math.max(c, l.src === undefined ? l.c : 0); l.t = s.now; l.src = undefined; l.led = 0; return; }
  (p.lardomar ??= []).push({ k, a, v, c, t: s.now, led: 0 });
  trim(s, p);
}
// den som arbetar i ett område ser också vad mer som finns där: bär, spår av vilt och fisk i vattnet
export function lookAround(s: State, p: Person, x: number, y: number) {
  for (const k of ['samla', 'jakt', 'fiske'] as Kind[]) if (k === 'fiske' ? areaValue(s, k, areaOf(x, y)) > 0 : true) observe(s, p, k, x, y);
}
// vad personen tror att man hittar på en ruta. I närområdet ser man det. Längre bort syns marken (skog, äng, strand)
// men inte hur mycket andra redan tagit där: då gäller minnet, och utan minne en gissning efter hur marken ser ut.
// Den nyfikne tror mer på det okända.
export const trustUnknown = (s: State, p: Person) => 0.45 + stat(p, 'nyfikenhet', s.now) / 40;
const believed = (l: Lardom | undefined, cap: number, u: number, pot = 1) => l ? Math.min(1, l.v) * l.c * Math.min(1.2, cap / Math.max(0.05, pot)) + cap * u * (1 - l.c) : cap * u;
export function perceive(s: State, p: Person, k: Kind, x: number, y: number, dFire: number) {
  const a = areaOf(x, y);
  const v = dFire <= SIGHT ? richness(s, k, x + 0.5, y + 0.5) : believed(findL(p, k, a), capOf(s, k, y * W + x), trustUnknown(s, p), areaValue(s, k, a, true));
  return v - fear(s, p, a);
}
// rädsla för ett område: den modige bryr sig mindre
export function fear(s: State, p: Person, a: number) {
  const l = findL(p, 'fara', a);
  return l ? l.v * l.c * clamp(1.3 - stat(p, 'mod', s.now) / 20, 0.2, 1.3) : 0;
}
// det bästa personen tror finns utanför närområdet, inom en halv dags gång
export function bestKnown(s: State, p: Person, k: Kind) {
  const f = getMap(s.seed).fire, u = trustUnknown(s, p);
  let best = 0;
  for (let a = 0; a < AW * AH; a++) {
    const c = areaCenter(a), d = Math.hypot(c.x - f.x, c.y - f.y);
    if (d <= SIGHT || Math.abs(c.x - f.x) > 17 || Math.abs(c.y - f.y) > 13) continue;
    best = Math.max(best, believed(findL(p, k, a), areaValue(s, k, a, true), u) - d * 0.03 - fear(s, p, a));
  }
  return best;
}
// den plats personen väljer: det hen tror ger mest och inte är för långt bort. Väl framme ser hen sig omkring
// och går till den bästa rutan i närheten.
export function pickSpot(s: State, p: Person, k: Kind, cands: { x: number; y: number; d: number }[]) {
  let best: { x: number; y: number; d: number } | undefined, bs = -1e9;
  for (const c of cands) {
    const sc = perceive(s, p, k, c.x, c.y, c.d) - c.d * 0.03 + rnd(s) * 0.15;
    if (sc > bs) { bs = sc; best = c; }
  }
  if (!best || best.d <= SIGHT) return best;
  // väl framme letar hen upp den bästa platsen i området
  const f = getMap(s.seed).fire, x0 = Math.max(0, best.x - 5), y0 = Math.max(0, best.y - 5);
  let r = best, rs = richness(s, k, best.x + 0.5, best.y + 0.5);
  for (let y = y0; y < Math.min(H, best.y + 6); y++) for (let x = x0; x < Math.min(W, best.x + 6); x++) {
    const v = richness(s, k, x + 0.5, y + 0.5) - Math.hypot(x - best.x, y - best.y) * 0.01;
    if (v > rs) { rs = v; r = { x, y, d: Math.hypot(x - f.x, y - f.y) }; }
  }
  return r;
}
// hur mycket personen tror att arbetet ger: det hen ser i närområdet eller det bästa hen minns längre bort
export const prospectFor = (s: State, p: Person, k: Kind) => Math.max(prospect(s, k, SIGHT), bestKnown(s, p, k));
// ett område där personen tror att det finns flinta
export function flintArea(p: Person) {
  let best: Lardom | undefined;
  for (const l of p.lardomar ?? []) if (l.k === 'flinta' && l.c > 0.25 && (!best || l.c > best.c)) best = l;
  return best?.a;
}

// en olycka: de som såg den, och de närmaste, blir rädda för platsen
export function fearPlace(s: State, victim: Person, cause: string) {
  const f = getMap(s.seed).fire;
  if (Math.hypot(victim.x - f.x, victim.y - f.y) < 6) return; // inte mitt i byn
  const a = areaOf(victim.x, victim.y), om = `${victim.name} dog ${cause} där`;
  for (const q of living(s)) {
    const saw = Math.hypot(q.x - victim.x, q.y - victim.y) < 10;
    const close = q.partner === victim.id || q.mother === victim.id || q.father === victim.id || victim.mother === q.id || victim.father === q.id;
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
  const talk = 0.03 + (stat(a, 'karisma', now) + stat(a, 'vanlighet', now)) / 200 + (kind === 'berättelse' ? 0.35 : kind === 'djupt samtal' ? 0.12 : 0);
  if (a.lardomar?.length && rnd(s) < talk) {
    // man berättar helst om rädslor och om rika platser
    let tot = 0;
    const w = a.lardomar.map(l => { const v = (l.k === 'fara' ? 1.5 : l.k === 'flinta' ? 1 : l.v) * l.c; tot += v; return v; });
    let x = rnd(s) * tot, l = a.lardomar[0];
    for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) { l = a.lardomar[i]; break; } }
    tell(s, a, b, l, r);
  }
  // kunskap: den som kan något bättre lär ut lite
  if (a.kunskap) for (const k in a.kunskap) {
    const e = a.kunskap[k], d = e.v - kn(b, k);
    if (d > 0.1 && rnd(s) < 0.15) {
      const before = kn(b, k), v = learnK(b, k, d * 0.2 * (0.5 + stat(b, 'intelligens', now) / 20), now);
      e.t = now; // att lära ut håller kunskapen vid liv
      if (k === 'svamp' && before < 0.6 && v >= 0.6) log(s, `${b.name} har lärt sig av ${a.name} att skilja kantarellen från den giftiga spindlingen.`, 'skill', [b.id, a.id]);
    }
  }
}
function tell(s: State, a: Person, b: Person, l: Lardom, r: Rel) {
  const now = s.now;
  // att berätta stärker det egna minnet
  l.c = Math.min(1, l.c + 0.05 * (1 - l.c)); l.t = now;
  const trust = clamp(0.45 + r.op / 160, 0.15, 0.95);
  const c = l.c * trust * 0.85;
  // man överdriver gärna, särskilt det som är farligt
  const v = clamp(l.v * (l.k === 'fara' ? 1 + (rnd(s) - 0.25) * 0.5 : 1 + (rnd(s) - 0.4) * 0.35), 0, l.k === 'fara' ? 1.6 : 1);
  const e = findL(b, l.k, l.a);
  if (e) {
    if (e.src === undefined && e.led === 0 && e.c >= c) return; // egen upplevelse väger tyngre
    e.v = (e.v * e.c + v * c) / (e.c + c); e.c = Math.max(e.c, c); e.t = now;
    if ((e.src !== undefined || e.led) && (l.led ?? 0) + 1 < (e.led ?? 1)) { e.src = a.id; e.led = (l.led ?? 0) + 1; } // kortare väg till källan
    if (l.om && !e.om) e.om = l.om;
    return;
  }
  (b.lardomar ??= []).push({ k: l.k, a: l.a, v, c, t: now, src: a.id, led: (l.led ?? 0) + 1, ...(l.om ? { om: l.om } : {}) });
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

// de första invånarna har sett sig omkring innan de slog sig ner
export function scout(s: State, p: Person) {
  const f = getMap(s.seed).fire;
  for (let i = 0; i < 8; i++) {
    const x = clamp(f.x + (rnd(s) - 0.5) * 36, 0, W - 1), y = clamp(f.y + (rnd(s) - 0.5) * 26, 0, H - 1);
    for (const k of ['samla', 'jakt', 'fiske'] as Kind[]) if (areaValue(s, k, areaOf(x, y)) > 0.05) observe(s, p, k, x, y, 0.5);
  }
}

// ---------- att visa ----------
const DIRS = ['öster', 'sydost', 'söder', 'sydväst', 'väster', 'nordväst', 'norr', 'nordost'];
export function placeName(s: State, a: number) {
  const m = getMap(s.seed), g = groundOf(s), f = m.fire;
  const x0 = (a % AW) * AREA, y0 = Math.floor(a / AW) * AREA;
  let n = 0, wat = 0, sten = 0, skog = 0, sand = 0;
  for (let y = y0; y < Math.min(H, y0 + AREA); y++) for (let x = x0; x < Math.min(W, x0 + AREA); x++) {
    const i = y * W + x, t = m.tiles[i]; n++;
    if (t === T.Vatten) wat++; else if (t === T.Sten) sten++; else if (t === T.Sand) sand++; else if (g.trees[i] >= FOREST) skog++;
  }
  const terr = sten > 6 ? 'vid stenarna' : wat > n * 0.25 ? 'vid vattnet' : skog > n * 0.5 ? 'i skogen' : sand > n * 0.3 ? 'på stranden' : 'på ängen';
  const c = areaCenter(a), dx = c.x - f.x, dy = c.y - f.y;
  if (Math.hypot(dx, dy) < 5) return `${terr} nära byn`;
  const dir = DIRS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  return `${terr} ${dir} om byn`;
}
const WHAT: Record<LKind, string> = { samla: 'bär och rötter', jakt: 'vilt', fiske: 'fisk i vattnet', flinta: 'flinta', fara: '' };
const amount = (v: number) => v >= 0.7 ? 'Gott om' : v >= 0.35 ? 'En del' : v >= 0.1 ? 'Lite' : 'Nästan inga';
// en lärdom i ord, med hur säker personen är, varifrån den kommer och om den stämmer. what är texten utan platsen.
export function describe(s: State, p: Person, l: Lardom) {
  const place = placeName(s, l.a);
  const what = l.k === 'fara' ? `Farligt${l.om ? `: ${l.om}` : ''}` : l.k === 'flinta' ? 'Flinta finns' : `${amount(l.v)} ${WHAT[l.k]}`;
  const text = l.k === 'fara' ? `Rädd för platsen ${place}${l.om ? ` (${l.om})` : ''}` : `${what} ${place}`;
  const src = l.src === undefined ? (l.led ? 'fick höra om det' : 'egen erfarenhet') : `hört av ${byId(s, l.src)?.name ?? 'någon'}${(l.led ?? 1) > 1 ? `, ${l.led} led från den som var där` : ''}`;
  const sure = l.c >= 0.75 ? 'säker' : l.c >= 0.4 ? 'ganska säker' : 'osäker';
  let wrong = '';
  if (l.k === 'fara') wrong = 'platsen är inte farligare än andra' + (l.v > 0.95 ? ', och rädslan har vuxit när den berättats' : '');
  else {
    const real = areaValue(s, l.k, l.a);
    if (l.k === 'flinta') { if (real < 0.5) wrong = 'fel, där finns ingen flinta'; }
    else if (l.v > real + 0.25) wrong = l.src === undefined && !l.led ? 'stämmer inte längre' : 'överdrivet eller inaktuellt';
    else if (real > l.v + 0.35) wrong = 'det finns mer än hen tror';
  }
  return { text, what, place, src, sure, wrong };
}
