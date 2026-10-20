import { campDist } from './plats';
import { stat, ageOf, log } from './folk';
import { getMap } from './karta';
import { Act, H, Person, State, T, Task, W } from './typer';
import { GIFT } from './fynd';

// ---------- lager och stackar ----------
// Byns saker ligger i stackar. En ruta rymmer en stack av ett slag. Tunga och skrymmande saker har mindre stackar.
// En full stack är vad en normalstark vuxen bär utan hjälpmedel.
// Varje stack har en plats och ett skick (1 = nytt, 0 = förstört). Summorna (s.mat/s.food, s.wood, s.items) är vad byn
// har i sina lager; stackarna hålls i takt med dem: det som läggs till utan att bäras dit hamnar på en ledig plats,
// det som tas utan att hämtas tas ur de sämsta stackarna först.
// Lagerplatserna (zoner) görs större, mindre och nya av invånarna själva. Två eller fler sorteras: maten för sig och
// material för sig, och den viktigaste ligger närmast elden.
export const FOOD = ['fisk', 'kott', 'svamp', 'bar', 'rotter']; // i den ordning de äts: det som förstörs fortast först
export const STACK: Record<string, number> = { bar: 25, rotter: 25, kott: 25, fisk: 25, svamp: 25, ved: 25, grenar: 50, torrgras: 50, kol: 25, flinta: 10, gniststen: 10, yxa: 1, fiskespjut: 1 };
export const STACK_ORDER = Object.keys(STACK);
export const STACK_NAMES: Record<string, string> = { bar: 'Bär', rotter: 'Rötter', kott: 'Kött', fisk: 'Fisk', svamp: 'Svamp', ved: 'Ved', grenar: 'Grenar', torrgras: 'Torrt gräs', kol: 'Kol', flinta: 'Flinta', gniststen: 'Gniststen', yxa: 'Flintyxa', fiskespjut: 'Fiskespjut' };
// mappar i listan över allt byn äger
export const FOLDERS: { namn: string; k: string[] }[] = [
  { namn: 'Mat', k: FOOD.slice().reverse() },
  { namn: 'Bränsle', k: ['ved', 'grenar', 'torrgras', 'kol'] },
  { namn: 'Sten', k: ['flinta', 'gniststen'] },
  { namn: 'Redskap', k: ['yxa', 'fiskespjut'] },
];
export interface Zone { x: number; y: number; w: number; h: number; namn?: string; slag?: 'mat' | 'material'; prio?: number }
export interface Stack { k: string; n: number; c: number; x: number; y: number }
// en stack som den visas: out = utanför lagerplatserna, stored = hör till byns förråd (i lagret eller precis bredvid)
export interface Pile extends Stack { max: number; out: boolean; stored: boolean; zone: number }
const MAX_W = 6, MAX_H = 5, MAX_ZONES = 4;
export const OUT_WEAR = 3; // saker utanför lagret slits tre gånger fortare
export const INDOOR_WEAR = 0.4; // under tak slits saker mindre (inget taksystem ännu)

export const isFood = (k: string) => FOOD.includes(k);
export const isTool = (k: string) => STACK[k] === 1;
// skick: för redskap är det hur mycket som finns kvar av redskapet
export const condOf = (a: Stack) => isTool(a.k) ? a.n : a.c;
export const inZone = (z: Zone, x: number, y: number) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;
const near = (z: Zone, x: number, y: number, d: number) => x >= z.x - d && x < z.x + z.w + d && y >= z.y - d && y < z.y + z.h + d;
export const allows = (z: Zone, k: string) => !z.slag || (z.slag === 'mat') === isFood(k);
// tak över rutan: förberett för bostäder och förråd med tak
export const roofed = (_s: State, _x: number, _y: number) => false;

export function zonesOf(s: State): Zone[] {
  if (!s.lagren) {
    const st = s.lager ?? { ...getMap(s.seed).stock, w: 2, h: 2 };
    s.lagren = [{ x: st.x, y: st.y, w: st.w, h: st.h, namn: 'Lagret', prio: 1 }];
    delete s.lager;
  }
  return s.lagren;
}
export const zoneOf = (s: State) => zonesOf(s)[0];
export const zoneAt = (s: State, x: number, y: number) => zonesOf(s).findIndex(z => inZone(z, x, y));
export const isStored = (s: State, x: number, y: number) => zonesOf(s).some(z => near(z, x, y, 2));
function stacksOf(s: State): Stack[] {
  if (!s.stackar) {
    s.stackar = [];
    for (const g of s.marken ?? []) s.stackar.push({ ...g, c: 1 }); // gamla sparfiler
    delete s.marken;
  }
  return s.stackar;
}

// ---------- summorna ----------
// maten per slag. Om s.food ändrats utifrån (gamla sparfiler, tester) jämkas slagen: mer blir bär, mindre minskar alla lika
export function syncFood(s: State) {
  const m = (s.mat ??= {});
  let sum = 0; for (const k of FOOD) sum += m[k] ?? 0;
  if (s.food > sum + 1e-9) m.bar = (m.bar ?? 0) + s.food - sum;
  else if (s.food < sum - 1e-9) { const f = sum > 0 ? Math.max(0, s.food) / sum : 0; for (const k of FOOD) if (m[k]) m[k] *= f; }
  return m;
}
export function addFood(s: State, k: string, n: number) { const m = syncFood(s); m[k] = (m[k] ?? 0) + n; s.food += n; }
export const amountOf = (s: State, k: string) => isFood(k) ? syncFood(s)[k] ?? 0 : k === 'ved' ? s.wood : s.items[k] ?? 0;
function addTo(s: State, k: string, n: number) { if (isFood(k)) addFood(s, k, n); else if (k === 'ved') s.wood += n; else s.items[k] = (s.items[k] ?? 0) + n; }

// ---------- platser ----------
function usable(s: State, x: number, y: number) {
  const m = getMap(s.seed), f = m.fire;
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const t = m.tiles[y * W + x];
  return t !== T.Vatten && t !== T.Sten && Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) > 1;
}
const allUsable = (s: State, z: Zone) => { for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (!usable(s, x, y)) return false; return true; };
const overlaps = (a: Zone, b: Zone, gap: number) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
// rutorna runt en lagerplats, närmast först
function ringTiles(s: State, z: Zone) {
  const out: { x: number; y: number }[] = [];
  for (let d = 1; d <= 2; d++) for (let y = z.y - d; y < z.y + z.h + d; y++) for (let x = z.x - d; x < z.x + z.w + d; x++) {
    const e = Math.max(z.x - x, x - (z.x + z.w - 1), z.y - y, y - (z.y + z.h - 1));
    if (e === d && usable(s, x, y)) out.push({ x, y });
  }
  return out;
}
const key = (x: number, y: number) => y * W + x;
const occupancy = (s: State) => { const m = new Map<number, Stack>(); for (const a of stacksOf(s)) if (isStored(s, a.x, a.y)) m.set(key(a.x, a.y), a); return m; };
const roomIn = (a: Stack | undefined, k: string) => !a || (a.k === k && !isTool(k) && a.n < STACK[k] - 1e-9);
// bästa plats i en lagerplats för ett slag: lagerplatserna i prioritetsordning, först en stack av samma slag som inte
// är full, sedan en tom ruta. minPrio: bara lagerplatser med högre prioritet än så
function zoneSpot(s: State, k: string, minPrio = -Infinity, occ = occupancy(s)) {
  const zs = zonesOf(s).filter(z => allows(z, k) && (z.prio ?? 0) > minPrio).sort((a, b) => (b.prio ?? 0) - (a.prio ?? 0));
  for (const z of zs) {
    let empty: { x: number; y: number } | undefined;
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
      const a = occ.get(key(x, y));
      if (a && roomIn(a, k)) return { x, y };
      if (!a && !empty) empty = { x, y };
    }
    if (empty) return empty;
  }
  return undefined;
}
// var man lägger ner något: i en lagerplats om det finns plats, annars bredvid
export function dropSpot(s: State, k: string) {
  const occ = occupancy(s), z = zoneSpot(s, k, -Infinity, occ);
  if (z) return { x: z.x + 0.5, y: z.y + 0.5 };
  const sp = besideSpot(s, k, occ);
  return { x: sp.x + 0.5, y: sp.y + 0.5 };
}
function besideSpot(s: State, k: string, occ: Map<number, Stack>) {
  const zs = zonesOf(s), base = zs.filter(z => allows(z, k));
  for (const z of base.length ? base : zs) for (const r of ringTiles(s, z)) {
    if (zoneAt(s, r.x, r.y) >= 0) continue;
    if (roomIn(occ.get(key(r.x, r.y)), k)) return r;
  }
  return { x: zs[0].x, y: zs[0].y };
}
export const fetchSpot = (s: State, k: string) => {
  const a = stacksOf(s).find(q => q.k === k && zoneAt(s, q.x, q.y) >= 0) ?? stacksOf(s).find(q => q.k === k && isStored(s, q.x, q.y));
  return a ? { x: a.x + 0.5, y: a.y + 0.5 } : dropSpot(s, k);
};

// lägg n av ett slag med skicket c: på rutan at om det går, annars på bästa lediga plats. totals = räkna in det i summorna
function place(s: State, k: string, n: number, c: number, totals: boolean, at?: { x: number; y: number }) {
  if (totals) addTo(s, k, n);
  const st = stacksOf(s), max = STACK[k] ?? 25;
  for (let g = 0; n > 1e-9 && g < 60; g++) {
    const occ = occupancy(s);
    const sp = at && isStored(s, at.x, at.y) && usable(s, at.x, at.y) && roomIn(occ.get(key(at.x, at.y)), k) ? at : zoneSpot(s, k, -Infinity, occ) ?? besideSpot(s, k, occ);
    at = undefined;
    const a = occ.get(key(sp.x, sp.y));
    if (!a) { const v = Math.min(n, max); st.push({ k, n: v, c, x: sp.x, y: sp.y }); n -= v; }
    else if (roomIn(a, k)) { const v = Math.min(n, max - a.n); a.c = (a.c * a.n + c * v) / (a.n + v); a.n += v; n -= v; }
    else break; // ingen plats alls; summorna stämmer ändå, stackarna läggs ut senare
  }
}
// ta n av ett slag ur förrådets stackar, sämst skick först. Ger skicket på det som togs
function takeStacks(s: State, k: string, n: number): number {
  const list = stacksOf(s).filter(a => a.k === k && isStored(s, a.x, a.y)).sort((a, b) => condOf(a) - condOf(b));
  let got = 0, cw = 0;
  for (const a of list) { if (n <= 1e-12) break; const v = Math.min(n, a.n); a.n -= v; n -= v; got += v; cw += v * a.c; }
  return got > 0 ? cw / got : 1;
}
// håll stackarna i takt med summorna
export function reconcile(s: State) {
  syncFood(s);
  const sum: Record<string, number> = {};
  for (const a of stacksOf(s)) if (isStored(s, a.x, a.y)) sum[a.k] = (sum[a.k] ?? 0) + a.n;
  for (const k of STACK_ORDER) {
    const d = amountOf(s, k) - (sum[k] ?? 0);
    if (d > 1e-6) place(s, k, d, 1, false);
    else if (d < -1e-6) takeStacks(s, k, -d);
  }
  s.stackar = stacksOf(s).filter(a => a.n > 1e-6);
}
// ät: det som förstörs fortast först, och av det det sämsta. Ger skicket på maten som åts
export function takeFood(s: State, n: number) {
  const m = syncFood(s);
  let got = 0, cw = 0;
  for (const k of FOOD) {
    const v = Math.min(n, m[k] ?? 0);
    if (v <= 0) continue;
    cw += v * takeStacks(s, k, v); got += v;
    m[k] -= v; s.food -= v; n -= v;
    if (n <= 1e-12) break;
  }
  s.food = Math.max(0, s.food);
  return got > 0 ? cw / got : 1;
}

// alla stackar med plats och skick
export function pilesOf(s: State): Pile[] {
  reconcile(s);
  return stacksOf(s).map(a => { const zone = zoneAt(s, a.x, a.y); return { ...a, max: STACK[a.k] ?? 25, zone, out: zone < 0, stored: isStored(s, a.x, a.y) }; });
}
export const pilesNeeded = (s: State) => pilesOf(s).filter(p => p.stored).length;

// ---------- slitage ----------
// Skicket sjunker varje timme. Mat ruttnar (fisk fortast). Ved faller till sist sönder till grenar,
// grenar och gräs multnar bort, redskap slits sakta även när de ligger still. Sten slits inte.
// Utanför lagret slits allt fortare, under tak långsammare.
const FOOD_WEAR: Record<string, number> = { fisk: 2, kott: 1.2, svamp: 1, bar: 0.7, rotter: 0.35 };
const WEAR_H: Record<string, number> = { ved: 0.0004, grenar: 0.0006, torrgras: 0.0015, yxa: 0.0004, fiskespjut: 0.001 };
const INTO: Record<string, string> = { ved: 'grenar' };
const PER_UNIT: Record<string, number> = { ved: 2 }; // en ved blir två grenar
export function wearRate(s: State, k: string, ai: number) {
  if (isFood(k) || k === GIFT) return 0.003 * (1 + s.food / 250) * (ai === 0 ? 0.5 : 1) * (FOOD_WEAR[k] ?? 1);
  return WEAR_H[k] ?? 0;
}
export const wearMult = (s: State, x: number, y: number) => zoneAt(s, x, y) >= 0 ? (roofed(s, x, y) ? INDOOR_WEAR : 1) : OUT_WEAR;
export function wearStore(s: State, dtSec: number, ai: number) {
  reconcile(s);
  const h = dtSec / 3600;
  for (const a of stacksOf(s)) {
    const r = wearRate(s, a.k, ai) * wearMult(s, a.x, a.y) * h;
    if (r <= 0) continue;
    const stored = isStored(s, a.x, a.y);
    if (isTool(a.k)) { const v = Math.min(a.n, r); a.n -= v; if (stored) addTo(s, a.k, -v); continue; }
    a.c -= r;
    if (a.c > 0) continue;
    const into = INTO[a.k];
    if (stored) addTo(s, a.k, -a.n);
    if (into) { a.n = Math.min(STACK[into], a.n * PER_UNIT[a.k]); a.k = into; a.c = 0.5; if (stored) addTo(s, into, a.n); }
    else a.n = 0;
  }
  s.stackar = stacksOf(s).filter(a => a.n > 1e-6);
  if (s.items[GIFT]) s.items[GIFT] *= Math.exp(-wearRate(s, GIFT, ai) * h);
  s.food = Math.max(0, s.food);
}

// ---------- lagerplatserna ----------
// en gång i timmen: större när något inte får plats, en ny lagerplats när de inte kan växa mer, mindre när de står tomma
export function tidyStore(s: State) {
  reconcile(s);
  const zs = zonesOf(s);
  const over = () => stacksOf(s).filter(a => zoneAt(s, a.x, a.y) < 0 && isStored(s, a.x, a.y));
  let grew = -1;
  for (let rep = 0; rep < 4 && over().length; rep++) {
    const o = over(), i = zs.findIndex((z, j) => o.some(a => allows(z, a.k)) && growOf(s, j));
    if (i < 0) break;
    zs[i] = growOf(s, i)!; grew = i;
  }
  if (grew >= 0) log(s, `${zs[grew].namn ?? 'Lagret'} blev för litet, så byn gjorde det större.`, 'world');
  else if (over().length && zs.length < MAX_ZONES) newZone(s);
  // mindre: ta bort en kant när mer än hälften står tom och det som ligger där får plats i resten
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i], have = z.w * z.h, n = stacksOf(s).filter(a => inZone(z, a.x, a.y)).length;
    if (have <= 4 || have - n <= have / 2) continue;
    const opts: Zone[] = [{ ...z, w: z.w - 1 }, { ...z, h: z.h - 1 }, { ...z, x: z.x + 1, w: z.w - 1 }, { ...z, y: z.y + 1, h: z.h - 1 }].filter(c => c.w >= 2 && c.h >= 2);
    const cost = (c: Zone) => stacksOf(s).filter(a => inZone(z, a.x, a.y) && !inZone(c, a.x, a.y)).length;
    const best = opts.sort((a, b) => cost(a) - cost(b))[0];
    if (best && n + 1 <= best.w * best.h) zs[i] = best; // det som hamnar utanför bärs in igen
  }
}
function growOf(s: State, i: number): Zone | undefined {
  const zs = zonesOf(s), z = zs[i];
  return [{ ...z, w: z.w + 1 }, { ...z, h: z.h + 1 }, { ...z, x: z.x - 1, w: z.w + 1 }, { ...z, y: z.y - 1, h: z.h + 1 }]
    .filter(n => n.w <= MAX_W && n.h <= MAX_H && allUsable(s, n) && !zs.some((o, j) => j !== i && overlaps(n, o, 1)))
    .sort((a, b) => Math.abs(a.w - a.h) - Math.abs(b.w - b.h))[0];
}
// en ny lagerplats nära byns läger (eld och andra lagerplatser), men inte inpå elden. Den första uppdelningen sorterar: maten får den gamla platsen, materialet den nya
function newZone(s: State) {
  const zs = zonesOf(s), f = getMap(s.seed).fire, z0 = zs[0];
  let best: Zone | undefined, bd = Infinity;
  for (let y = 0; y < H - 2; y++) for (let x = 0; x < W - 2; x++) {
    const c: Zone = { x, y, w: 3, h: 2 }, df = Math.hypot(x + 1.5 - f.x, y + 1 - f.y);
    if (df < 3 || campDist(s, x + 1, y + 0.5) > 8 || !allUsable(s, c) || zs.some(o => overlaps(c, o, 1))) continue;
    const d = Math.hypot(x - z0.x, y - z0.y);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return;
  if (zs.length === 1) {
    Object.assign(z0, { namn: 'Matförrådet', slag: 'mat', prio: 2 });
    zs.push({ ...best, namn: 'Materiallagret', slag: 'material', prio: 1 });
    log(s, 'Lagret räckte inte till, så byn gjorde en ny lagerplats för material. Maten ligger kvar i det gamla lagret närmast elden.', 'world');
  } else {
    zs.push({ ...best, namn: `Lagerplats ${zs.length + 1}`, prio: 0 });
    log(s, 'Lagren räckte inte till, så byn gjorde en ny lagerplats.', 'world');
  }
}

// ---------- bära ----------
// hur stor del av insamlingen som är rötter, per årstid (istid, vår, sommar, höst): bär finns mest på sommaren och hösten
export const ROOT_SHARE = [0.85, 0.6, 0.2, 0.35];
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
const loadOf = (t: Task) => { const all: Record<string, number> = { ...(t.items ?? {}) }; if (t.carry) all[carryKind(t.act)] = (all[carryKind(t.act)] ?? 0) + t.carry; return all; };
// lägg det som bärs i förrådet, helst där man står
export function storeLoad(s: State, t: Task, x?: number, y?: number) {
  const all = loadOf(t), at = x !== undefined ? { x: Math.floor(x), y: Math.floor(y!) } : undefined;
  for (const k in all) if (all[k] > 1e-9) place(s, k, all[k], t.cond?.[k] ?? 1, true, at);
  t.carry = 0; t.items = undefined; t.cond = undefined;
}
// den som kallas bort lägger ner bördan där hen står; ligger den långt från lagret får någon bära in den senare
export function dropLoad(s: State, t: Task, x: number, y: number) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (isStored(s, tx, ty)) { storeLoad(s, t, x, y); return; }
  const all = loadOf(t), st = stacksOf(s);
  for (const k in all) {
    if (all[k] < 1e-6) continue;
    const c = t.cond?.[k] ?? 1, g = st.find(q => q.x === tx && q.y === ty && q.k === k);
    if (g) { g.c = (g.c * g.n + c * all[k]) / (g.n + all[k]); g.n += all[k]; } else st.push({ x: tx, y: ty, k, n: all[k], c });
  }
  t.carry = 0; t.items = undefined; t.cond = undefined;
}
// stackar som någon borde bära: saker på marken långt bort, saker bredvid lagret när det finns plats i det, saker i
// fel lagerplats och saker som kan flyttas till en viktigare lagerplats. near = bara inom så många rutor från elden
export function haulJob(s: State, near?: number) {
  const zs = zonesOf(s), occ = occupancy(s);
  const taken = new Set(s.people.filter(p => p.task?.act === 'bara' && p.task.phase === 'go').map(p => key(Math.floor(p.task!.tx), Math.floor(p.task!.ty))));
  let best: { x: number; y: number; why: string } | undefined, bs = Infinity;
  for (const a of stacksOf(s)) {
    if (taken.has(key(a.x, a.y))) continue;
    const d = campDist(s, a.x, a.y); // nära lägret: elden eller någon lagerplats
    if (near !== undefined && d > near) continue;
    const zi = zoneAt(s, a.x, a.y);
    let why: string | undefined, sc = d;
    if (!isStored(s, a.x, a.y)) why = 'Det ligger saker på marken som ska in i lagret';
    else if (zi < 0) { if (zoneSpot(s, a.k, -Infinity, occ)) { why = 'Det ligger saker bredvid lagret och nu finns det plats'; sc += 50; } }
    else if (!allows(zs[zi], a.k)) { if (zoneSpot(s, a.k, -Infinity, occ)) { why = `Sorterar: flyttar ${STACK_NAMES[a.k].toLowerCase()} till ${zs.find(z => allows(z, a.k))?.namn?.toLowerCase() ?? 'rätt lager'}`; sc += 100; } }
    else if (zoneSpot(s, a.k, zs[zi].prio ?? 0, occ)) { why = 'Flyttar saker till ett lager närmare elden'; sc += 150; }
    if (why && sc < bs) { bs = sc; best = { x: a.x + 0.5, y: a.y + 0.5, why }; }
  }
  return best;
}
// plocka upp så mycket man orkar av stackarna på rutan
export function pickUp(s: State, p: Person, t: Task) {
  const x = Math.floor(t.tx), y = Math.floor(t.ty), stored = isStored(s, x, y);
  let room = capacity(s, p) - load(t);
  for (const g of stacksOf(s)) {
    if (g.x !== x || g.y !== y || room <= 1e-9) continue;
    const st = STACK[g.k] ?? 25, v = Math.min(g.n, isTool(g.k) ? g.n : room * st);
    const had = t.items?.[g.k] ?? 0;
    (t.items ??= {})[g.k] = had + v;
    (t.cond ??= {})[g.k] = ((t.cond[g.k] ?? 1) * had + g.c * v) / (had + v);
    g.n -= v; room -= v / st;
    if (stored) addTo(s, g.k, -v);
  }
  s.stackar = stacksOf(s).filter(a => a.n > 1e-6);
}
