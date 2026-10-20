import { stat, ageOf, log } from './folk';
import { getMap } from './karta';
import { Act, H, Person, State, T, Task, W } from './typer';
import { GIFT } from './fynd';

// ---------- lager och stackar ----------
// Byns saker ligger i stackar på en lagerplats nära elden. En ruta rymmer en stack av ett slag. Tunga och skrymmande
// saker har mindre stackar. En full stack är vad en normalstark vuxen bär utan hjälpmedel.
// Mängderna räknas fortfarande som summor (s.mat, s.wood, s.items); stackarna fördelas ur summorna på lagerplatsens rutor.
export const FOOD = ['fisk', 'kott', 'svamp', 'bar']; // i den ordning de äts: det som förstörs fortast först
export const STACK: Record<string, number> = { bar: 25, kott: 25, fisk: 25, svamp: 25, ved: 25, grenar: 50, pinnar: 50, torrgras: 50, kol: 25, flinta: 10, gniststen: 10, yxa: 1, fiskespjut: 1 };
export const STACK_ORDER = Object.keys(STACK);
export const STACK_NAMES: Record<string, string> = { bar: 'Bär och rötter', kott: 'Kött', fisk: 'Fisk', svamp: 'Svamp', ved: 'Ved', grenar: 'Grenar', pinnar: 'Små pinnar', torrgras: 'Torrt gräs', kol: 'Kol', flinta: 'Flinta', gniststen: 'Gniststen', yxa: 'Flintyxa', fiskespjut: 'Fiskespjut' };
export interface Zone { x: number; y: number; w: number; h: number }
// out: 'bredvid' = fick inte plats i lagret, 'mark' = lagd på marken av någon som kallades bort
export interface Pile { k: string; n: number; max: number; x: number; y: number; out?: 'bredvid' | 'mark' }
const MAX_W = 6, MAX_H = 5;
export const OUT_WEAR = 3; // saker utanför lagret slits tre gånger fortare

export function zoneOf(s: State): Zone {
  if (!s.lager) { const st = getMap(s.seed).stock; s.lager = { x: st.x, y: st.y, w: 2, h: 2 }; }
  return s.lager;
}
// maten per slag. Om s.food ändrats utifrån (gamla sparfiler, tester) jämkas slagen: mer blir bär, mindre minskar alla lika
export function syncFood(s: State) {
  const m = (s.mat ??= {});
  let sum = 0; for (const k of FOOD) sum += m[k] ?? 0;
  if (s.food > sum + 1e-9) m.bar = (m.bar ?? 0) + s.food - sum;
  else if (s.food < sum - 1e-9) { const f = sum > 0 ? Math.max(0, s.food) / sum : 0; for (const k of FOOD) if (m[k]) m[k] *= f; }
  return m;
}
export function addFood(s: State, k: string, n: number) { const m = syncFood(s); m[k] = (m[k] ?? 0) + n; s.food += n; }
// ät: det som förstörs fortast först
export function takeFood(s: State, n: number) {
  const m = syncFood(s);
  for (const k of FOOD) { const v = Math.min(n, m[k] ?? 0); m[k] = (m[k] ?? 0) - v; s.food -= v; n -= v; if (n <= 1e-12) break; }
  s.food = Math.max(0, s.food);
}
export const isFood = (k: string) => FOOD.includes(k);
export const amountOf = (s: State, k: string) => isFood(k) ? syncFood(s)[k] ?? 0 : k === 'ved' ? s.wood : s.items[k] ?? 0;
function addTo(s: State, k: string, n: number) { if (isFood(k)) addFood(s, k, n); else if (k === 'ved') s.wood += n; else s.items[k] = (s.items[k] ?? 0) + n; }
// hur många stackar ett slag behöver (ett halvt slitet spjut tar också en plats)
const pilesFor = (n: number, max: number) => Math.max(1, Math.ceil(n / max - 1e-9));
const shown = (k: string, n: number) => n >= (STACK[k] === 1 ? 1e-6 : 0.5);
export const pilesNeeded = (s: State) => STACK_ORDER.reduce((a, k) => a + (shown(k, amountOf(s, k)) ? pilesFor(amountOf(s, k), STACK[k]) : 0), 0);
// stackarna ruta för ruta: fulla stackar först, resten i den sista. Det som inte får plats läggs på rutorna runt lagret
export function pilesOf(s: State): Pile[] {
  const z = zoneOf(s), out: Pile[] = [];
  let i = 0;
  const ring = ringTiles(s, z);
  for (const k of STACK_ORDER) {
    let n = amountOf(s, k);
    if (!shown(k, n)) continue;
    const max = STACK[k];
    for (let j = pilesFor(n, max); j > 0; j--, i++) {
      const v = Math.min(n, max); n -= v;
      if (i < z.w * z.h) out.push({ k, n: v, max, x: z.x + (i % z.w), y: z.y + Math.floor(i / z.w) });
      else { const r = ring[(i - z.w * z.h) % Math.max(1, ring.length)] ?? { x: z.x, y: z.y }; out.push({ k, n: v, max, x: r.x, y: r.y, out: 'bredvid' }); }
    }
  }
  return out;
}
// saker på marken, som högar
export const groundPiles = (s: State): Pile[] => (s.marken ?? []).map(g => ({ k: g.k, n: g.n, max: STACK[g.k] ?? 25, x: g.x, y: g.y, out: 'mark' as const }));
export const inZone = (z: Zone, x: number, y: number) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;
// rutorna runt lagret, närmast först
function ringTiles(s: State, z: Zone) {
  const out: { x: number; y: number }[] = [];
  for (let d = 1; d <= 3; d++) for (let y = z.y - d; y < z.y + z.h + d; y++) for (let x = z.x - d; x < z.x + z.w + d; x++) {
    const e = Math.max(z.x - x, x - (z.x + z.w - 1), z.y - y, y - (z.y + z.h - 1));
    if (e === d && usable(s, x, y)) out.push({ x, y });
  }
  return out;
}

// slitage per timme. Mat ruttnar (fisk fortast), ved och grenar faller sönder till småpinnar, pinnar och gräs multnar bort.
// Sten och redskap i lagret slits inte. Det som ligger utanför lagret slits fortare.
const FOOD_WEAR: Record<string, number> = { fisk: 2, kott: 1.2, svamp: 1, bar: 0.7 };
const WEAR_H: Record<string, number> = { ved: 0.0004, grenar: 0.0006, pinnar: 0.0008, torrgras: 0.0015 };
const INTO: Record<string, string> = { ved: 'pinnar', grenar: 'pinnar' };
const PER_UNIT: Record<string, number> = { ved: 2, grenar: 1 }; // en ved blir två småpinnar
export function wearRate(s: State, k: string, ai: number) {
  if (isFood(k) || k === GIFT) return 0.003 * (1 + s.food / 250) * (ai === 0 ? 0.5 : 1) * (FOOD_WEAR[k] ?? 1);
  return WEAR_H[k] ?? 0;
}
export function wearStore(s: State, dtSec: number, ai: number) {
  syncFood(s);
  const outN: Record<string, number> = {};
  for (const p of pilesOf(s)) if (p.out) outN[p.k] = (outN[p.k] ?? 0) + p.n;
  const h = dtSec / 3600, gain: Record<string, number> = {};
  for (const k of [...STACK_ORDER, GIFT]) {
    const n = amountOf(s, k), r = wearRate(s, k, ai);
    if (n <= 0 || r <= 0) continue;
    const eff = r * (1 + (OUT_WEAR - 1) * Math.min(1, (outN[k] ?? 0) / n)); // andelen utanför slits fortare
    const lost = n * (1 - Math.exp(-eff * h));
    addTo(s, k, -lost);
    if (INTO[k]) gain[INTO[k]] = (gain[INTO[k]] ?? 0) + lost * PER_UNIT[k];
  }
  for (const k in gain) addTo(s, k, gain[k]);
  if (s.marken?.length) {
    for (const g of s.marken) {
      const lost = g.n * (1 - Math.exp(-wearRate(s, g.k, ai) * OUT_WEAR * h));
      g.n -= lost;
      if (INTO[g.k]) { const o = s.marken.find(q => q.x === g.x && q.y === g.y && q.k === INTO[g.k]); if (o) o.n += lost * PER_UNIT[g.k]; else s.marken.push({ x: g.x, y: g.y, k: INTO[g.k], n: lost * PER_UNIT[g.k] }); }
    }
    s.marken = s.marken.filter(g => g.n >= 0.05);
  }
  s.food = Math.max(0, s.food);
}

// rutor som går att lägga saker på: land, inte vid elden
function usable(s: State, x: number, y: number) {
  const m = getMap(s.seed), f = m.fire;
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const t = m.tiles[y * W + x];
  return t !== T.Vatten && t !== T.Sten && Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) > 1;
}
const allUsable = (s: State, z: Zone) => { for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (!usable(s, x, y)) return false; return true; };

// invånarna gör lagerplatsen större när den blir full och mindre när den står tom (en gång i timmen)
export function tidyStore(s: State) {
  const need = pilesNeeded(s);
  for (let k = 0; k < 4 && need > zoneOf(s).w * zoneOf(s).h; k++) {
    const z = zoneOf(s);
    const tries: Zone[] = [
      { ...z, w: z.w + 1 }, { ...z, h: z.h + 1 }, { ...z, x: z.x - 1, w: z.w + 1 }, { ...z, y: z.y - 1, h: z.h + 1 },
    ].filter(n => n.w <= MAX_W && n.h <= MAX_H && allUsable(s, n)).sort((a, b) => Math.abs(a.w - a.h) - Math.abs(b.w - b.h));
    if (!tries[0]) break;
    s.lager = tries[0];
    if (need <= tries[0].w * tries[0].h) log(s, `Lagerplatsen blev för liten, så byn gjorde den större (${tries[0].w} × ${tries[0].h} rutor).`, 'world');
  }
  const z = zoneOf(s), have = z.w * z.h;
  if (have > 4 && need <= have / 2 - 1) {
    const n = z.w >= z.h ? { ...z, w: z.w - 1 } : { ...z, h: z.h - 1 };
    if (n.w * n.h >= need + 1) s.lager = n;
  }
}

// var man lägger ner det man bär: vid en stack av samma slag som inte är full, annars en ledig ruta
export function dropSpot(s: State, k: string) {
  const z = zoneOf(s), ps = pilesOf(s);
  const same = ps.find(p => p.k === k && !p.out && p.n < p.max);
  if (same) return { x: same.x + 0.5, y: same.y + 0.5 };
  const i = Math.min(ps.length, z.w * z.h - 1);
  return { x: z.x + (i % z.w) + 0.5, y: z.y + Math.floor(i / z.w) + 0.5 };
}
export const fetchSpot = (s: State, k: string) => { const p = pilesOf(s).find(q => q.k === k && !q.out); return p ? { x: p.x + 0.5, y: p.y + 0.5 } : dropSpot(s, k); };

// det en uppgift ger: bär från insamling, kött från jakt, fisk från fiske, grenar från vedplockning, ved från huggning
export const carryKind = (act: Act) => act === 'ved' ? 'grenar' : act === 'hugga' || act === 'elda' ? 'ved' : act === 'jakt' ? 'kott' : act === 'fiske' ? 'fisk' : 'bar';
// vart bördan ska: till en stack av det man mest bär
export function homeKind(t: Task) {
  if (t.carry > 0 || !t.items) return carryKind(t.act);
  return Object.keys(t.items).sort((a, b) => t.items![b] - t.items![a])[0] ?? carryKind(t.act);
}
// hur mycket en person orkar bära, i fulla stackar: en normalstark vuxen bär en stack, starka mer, barn och gamla mindre
export function capacity(s: State, p: Person) {
  const a = ageOf(p, s.now);
  return (0.5 + stat(p, 'styrka', s.now) / 20) * (a < 10 ? 0.35 : a < 15 ? 0.65 : 1);
}
// hur full bördan är, i stackar
export function load(t: Task) {
  let l = t.carry / STACK[carryKind(t.act)];
  for (const k in t.items ?? {}) l += t.items![k] / (STACK[k] ?? 25);
  return l;
}
// lägg det som bärs i förrådet när man kommer hem
export function storeLoad(s: State, t: Task) {
  if (t.carry) addTo(s, carryKind(t.act), t.carry);
  for (const i in t.items ?? {}) addTo(s, i, t.items![i]);
  t.carry = 0; t.items = undefined;
}
// den som kallas bort till något annat lägger ner bördan där hen står; den ligger på marken tills någon bär in den
export function dropLoad(s: State, t: Task, x: number, y: number) {
  const tx = Math.floor(x), ty = Math.floor(y), all: Record<string, number> = { ...(t.items ?? {}) };
  if (t.carry) all[carryKind(t.act)] = (all[carryKind(t.act)] ?? 0) + t.carry;
  if (inZone(zoneOf(s), tx, ty)) { storeLoad(s, t); return; }
  for (const k in all) {
    if (all[k] < 1e-6) continue;
    const g = (s.marken ??= []).find(q => q.x === tx && q.y === ty && q.k === k);
    if (g) g.n += all[k]; else s.marken.push({ x: tx, y: ty, k, n: all[k] });
  }
  t.carry = 0; t.items = undefined;
}
// högen på marken som någon ska bära in. near = bara högar inom så många rutor från elden (på natten)
export function groundTarget(s: State, near?: number) {
  const f = getMap(s.seed).fire, taken = new Set(s.people.filter(p => p.task?.act === 'bara' && p.task.phase === 'go').map(p => `${Math.floor(p.task!.tx)},${Math.floor(p.task!.ty)}`));
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (const g of s.marken ?? []) {
    const d = Math.hypot(g.x - f.x, g.y - f.y);
    if ((near === undefined || d <= near) && d < bd && !taken.has(`${g.x},${g.y}`)) { bd = d; best = { x: g.x + 0.5, y: g.y + 0.5 }; }
  }
  return best;
}
// plocka upp så mycket man orkar av högarna på rutan
export function pickUp(s: State, p: Person, t: Task) {
  const x = Math.floor(t.tx), y = Math.floor(t.ty);
  let room = capacity(s, p) - load(t);
  for (const g of s.marken ?? []) {
    if (g.x !== x || g.y !== y || room <= 0) continue;
    const st = STACK[g.k] ?? 25, v = Math.min(g.n, room * st);
    (t.items ??= {})[g.k] = (t.items[g.k] ?? 0) + v; g.n -= v; room -= v / st;
  }
  if (s.marken) s.marken = s.marken.filter(g => g.n >= 0.05);
}
