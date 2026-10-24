import { campDist } from './plats';
import { syncTools, tingOf, toolsOf, wearCarried } from './agande';
import { alive, byId, stat, ageOf, log } from './folk';
import { getMap } from './karta';
import { Act, H, Person, State, T, Task, W } from './typer';
import { bitAt, roofed } from './byggnad';
import { ACTS } from './handlingar';
import { BYN, Del, addDel, sumOf, takeOrder } from './egendom';
import { FOOD, RUTA, SAKER, SAK_LIST, STACK, STACK_ORDER, isFood, isTool, sakNamn } from './saker';

// ---------- lager och stackar ----------
// Byns saker ligger i stackar. En ruta rymmer en stack av ett slag. Tunga och skrymmande saker har mindre stackar.
// En full stack är vad en normalstark vuxen bär utan hjälpmedel.
// Stackarna är det enda som sparas om förrådet. Varje stack har ett slag, en mängd, ett skick (1 = nytt, 0 = förstört),
// en plats och vems den är (ag: hur mycket varje person äger; resten är byns, egendom.ts). Hur mycket byn har av ett
// slag, och vem som äger hur mycket, räknas fram ur stackarna i förrådet (i en lagerplats eller precis bredvid). Det som
// ligger längre bort räknas inte förrän någon burit in det.
// Lagerplatserna (zoner) görs större, mindre och nya av invånarna själva. Två eller fler sorteras: maten för sig och
// material för sig, och den viktigaste ligger närmast elden. Vilka saker som finns, och hur stora stackarna är, står i saker.ts.
export interface Zone { x: number; y: number; w: number; h: number; namn?: string; slag?: 'mat' | 'material'; prio?: number }
// dold: det som ligger gömt i stacken (giftig svamp bland svampen, saker.ts: i)
export interface Stack { k: string; n: number; c: number; x: number; y: number; ag?: Del; dold?: number }
// en stack som den visas: out = utanför lagerplatserna, stored = hör till byns förråd (i lagret eller precis bredvid)
export interface Pile extends Stack { max: number; out: boolean; stored: boolean; zone: number }
const MAX_W = 6, MAX_H = 5, MAX_ZONES = 4;
export const OUT_WEAR = 3; // saker utanför lagret slits tre gånger fortare
export const INDOOR_WEAR = 0.4; // under tak slits saker mindre
const DOLD = SAK_LIST.filter(k => SAKER[k]!.i); // slag som ligger gömda i andra stackar
const DOLD_I: Record<string, string> = Object.fromEntries(DOLD.map(k => [SAKER[k]!.i!, k])); // värdslaget → det gömda

// skick: för redskap är det hur mycket som finns kvar av redskapet
export const condOf = (a: Stack) => isTool(a.k) ? a.n : a.c;
export const inZone = (z: Zone, x: number, y: number) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;
const near = (z: Zone, x: number, y: number, d: number) => x >= z.x - d && x < z.x + z.w + d && y >= z.y - d && y < z.y + z.h + d;
export const allows = (z: Zone, k: string) => !z.slag || (z.slag === 'mat') === isFood(k);

export function zonesOf(s: State): Zone[] {
  if (!s.lagren) {
    const st = s.lager ?? { ...getMap(s.seed).stock, w: 2, h: 2 };
    s.lagren = [{ x: st.x, y: st.y, w: st.w, h: st.h, namn: 'Lagret', prio: 1 }];
    delete s.lager;
    changed(s);
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
const tidy = (s: State) => { s.stackar = stacksOf(s).filter(a => a.n > 1e-6 || (a.dold ?? 0) > 1e-6); changed(s); };

// ---------- summorna ----------
// Summorna räknas om när en stack ändrats. Allt som ändrar en stack anropar changed (bygg.ts när ett hus flyttar en stack)
const ver = new WeakMap<State, number>();
export const changed = (s: State) => { ver.set(s, (ver.get(s) ?? 0) + 1); };
interface Summa { st: Stack[]; v: number; n: Record<string, number>; ag: Record<string, Del> }
const summor = new WeakMap<State, Summa>();
function summa(s: State) {
  const st = stacksOf(s), v = ver.get(s) ?? 0, c = summor.get(s);
  if (c && c.st === st && c.v === v) return c;
  const n: Record<string, number> = {}, ag: Record<string, Del> = {};
  for (const a of st) {
    if (!isStored(s, a.x, a.y)) continue;
    n[a.k] = (n[a.k] ?? 0) + a.n;
    if (a.dold) { const d = DOLD_I[a.k]; n[d] = (n[d] ?? 0) + a.dold; }
    if (a.ag) addDel(ag[a.k] ??= {}, a.ag);
  }
  const ny = { st, v, n, ag };
  summor.set(s, ny);
  return ny;
}
// hur mycket byn har av ett slag. Redskapen räknas på tingen (agande.ts)
export function amountOf(s: State, k: string) {
  if (isTool(k)) { let n = 0; for (const t of tingOf(s)) if (t.k === k) n += t.c; return n; }
  return summa(s).n[k] ?? 0;
}
export const item = amountOf;
export function foodOf(s: State) { const n = summa(s).n; let f = 0; for (const k of FOOD) f += n[k] ?? 0; return f; }
// maten per slag
export function foodKinds(s: State) { const n = summa(s).n, m: Record<string, number> = {}; for (const k of FOOD) if (n[k]) m[k] = n[k]; return m; }

// ---------- vems det är (egendom.ts) ----------
export const ownsAmount = (s: State, p: Person, k: string) => summa(s).ag[k]?.[p.id] ?? 0;
// hur mycket av slaget k invånarna äger tillsammans (resten är byns)
export const ownedSum = (s: State, k: string) => sumOf(summa(s).ag[k]);
// det av slaget k som är byns
export const villageAmount = (s: State, k: string) => Math.max(0, amountOf(s, k) - ownedSum(s, k));
// det av slaget k som p får ta: sitt eget och byns
export const mayTake = (s: State, p: Person, k: string) => ownsAmount(s, p, k) + villageAmount(s, k);
// allt p äger i förrådet, per slag
export function ownedStock(s: State, p: Person) {
  const out: Record<string, number> = {}, ag = summa(s).ag;
  for (const k in ag) { const v = ag[k][p.id]; if (v > 0) out[k] = v; }
  return out;
}
// n av slaget k byter ägare (gåva), utan att flyttas. Ger hur mycket som bytte ägare
export function ownMove(s: State, k: string, n: number, from: number, to: number) {
  if (from === BYN) return 0;
  let v = 0;
  for (const a of stored(s, k)) {
    const m = Math.min(n - v, a.ag?.[from] ?? 0);
    if (m <= 1e-12) continue;
    a.ag![from] -= m; v += m;
    if (to !== BYN) a.ag![to] = (a.ag![to] ?? 0) + m;
    cleanDel(s, a);
    if (n - v <= 1e-12) break;
  }
  changed(s);
  return v;
}
// den som dött eller flyttat äger inget längre: delen blir byns
export function releaseOwner(s: State, id: number) {
  for (const a of stacksOf(s)) if (a.ag?.[id] !== undefined) { delete a.ag[id]; cleanDel(s, a); }
  changed(s);
}
// stackens ägare: bara levande personer med något kvar, och aldrig mer än stacken
function cleanDel(s: State, a: Stack) {
  const d = a.ag;
  if (!d) return;
  let sum = 0;
  for (const o in d) {
    const q = +o === BYN ? undefined : byId(s, +o);
    if (!q || !alive(q) || !(d[o] > 1e-9)) delete d[o]; else sum += d[o];
  }
  if (sum > a.n) for (const o in d) d[o] *= a.n / sum;
  if (!Object.keys(d).length) delete a.ag;
}
// vems n av något är, när ag säger vems det var (jämkat om det minskat) och resten är owner
export function shareOf(ag: Del | undefined, n: number, owner = BYN): Del {
  const sum = sumOf(ag), f = sum > n ? n / sum : 1, d: Del = {};
  addDel(d, ag, f);
  if (owner !== BYN && n - sum * f > 1e-12) d[owner] = (d[owner] ?? 0) + n - sum * f;
  delete d[BYN];
  return d;
}

// ---------- platser ----------
function usable(s: State, x: number, y: number) {
  const m = getMap(s.seed), f = m.fire;
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const t = m.tiles[y * W + x];
  return t !== T.Vatten && t !== T.Sten && Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) > 1 && !bitAt(s, x, y);
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
const roomIn = (a: Stack | undefined, k: string) => !a || (a.k === k && !isTool(k) && a.n < RUTA[k] - 1e-9);
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
// stackarna av ett slag i förrådet, sämst skick först
const stored = (s: State, k: string) => stacksOf(s).filter(a => a.k === k && isStored(s, a.x, a.y)).sort((a, b) => condOf(a) - condOf(b));

// ---------- lägga i och ta ur ----------
// lägg n av ett slag med skicket c i förrådet: på rutan at om det går, annars på bästa lediga plats. ag = vems det är
// (resten är byns). Får det inte plats läggs det på den minsta stacken av samma slag, och lagret växer nästa timme
function place(s: State, k: string, n: number, c: number, ag?: Del, at?: { x: number; y: number }) {
  if (n <= 1e-12) return;
  const host = SAKER[k]?.i;
  if (host) { hide(s, host, n, at); return; }
  const st = stacksOf(s), max = RUTA[k] ?? 25, tot = n;
  const add = (a: Stack, v: number) => { a.c = (a.c * a.n + c * v) / (a.n + v); a.n += v; if (ag) { a.ag = addDel(a.ag ?? {}, ag, v / tot); cleanDel(s, a); } };
  for (let g = 0; n > 1e-9 && g < 60; g++) {
    const occ = occupancy(s);
    const sp = at && isStored(s, at.x, at.y) && usable(s, at.x, at.y) && roomIn(occ.get(key(at.x, at.y)), k) ? at : zoneSpot(s, k, -Infinity, occ) ?? besideSpot(s, k, occ);
    at = undefined;
    const a = occ.get(key(sp.x, sp.y));
    const v = !a ? Math.min(n, max) : roomIn(a, k) ? Math.min(n, max - a.n) : 0;
    if (!v) break;
    if (!a) { const ny: Stack = { k, n: 0, c, x: sp.x, y: sp.y }; st.push(ny); add(ny, v); } else add(a, v);
    n -= v;
  }
  if (n > 1e-9) { // ingen plats alls
    const a = stored(s, k).sort((a, b) => a.n - b.n)[0];
    if (a) add(a, n);
    else { const z = zonesOf(s)[0], ny: Stack = { k, n: 0, c, x: z.x, y: z.y }; st.push(ny); add(ny, n); }
  }
  changed(s);
}
// det gömda slaget läggs i en stack av värdslaget (i förrådet, eller på rutan at om den ligger utanför)
function hide(s: State, host: string, n: number, at?: { x: number; y: number }) {
  const st = stacksOf(s), ute = at && !isStored(s, at.x, at.y);
  let a = ute ? st.find(q => q.k === host && q.x === at!.x && q.y === at!.y) : stored(s, host).sort((a, b) => b.n - a.n)[0];
  if (!a) { const sp = ute ? at! : dropSpot(s, host); a = { k: host, n: 0, c: 1, x: Math.floor(sp.x), y: Math.floor(sp.y) }; st.push(a); }
  a.dold = (a.dold ?? 0) + n;
  changed(s);
}
// ta n av slaget k ur förrådet. Vems delar som tas först säger egendom.ts (takeOrder); inom en ägares del tas det
// sämsta skicket först. Ger vems det var, hur mycket som togs och skicket på det
function takeOwn(s: State, k: string, n: number, p?: Person, common = false, fran?: number) {
  const ag: Del = {};
  let got = 0, cw = 0;
  if (n > 1e-12) {
    if (SAKER[k]?.i) { got = takeHidden(s, k, n); ag[BYN] = got; return { ag, n: got, c: 1 }; }
    const list = stored(s, k), shares: Del = { [BYN]: 0 };
    for (const a of list) { shares[BYN] += a.n - sumOf(a.ag); addDel(shares, a.ag); }
    for (const [o, want] of takeOrder(s, p, shares, n, common, fran)) {
      let r = want;
      for (const a of list) {
        if (r <= 1e-12) break;
        const has = o === BYN ? a.n - sumOf(a.ag) : a.ag?.[o] ?? 0, v = Math.min(r, has);
        if (v <= 1e-12) continue;
        a.n -= v; if (o !== BYN) { a.ag![o] -= v; cleanDel(s, a); }
        r -= v; got += v; cw += v * a.c; ag[o] = (ag[o] ?? 0) + v;
      }
    }
    tidy(s);
  }
  return { ag, n: got, c: got > 0 ? cw / got : 1 };
}
// ta n ur förrådet utan att någon tar det (sorteras bort, prov): lika mycket ur varje stack och av allas delar
function takeProp(s: State, k: string, n: number) {
  if (SAKER[k]?.i) { takeHidden(s, k, n); return; }
  const list = stored(s, k), all = list.reduce((m, a) => m + a.n, 0), f = all > 0 ? Math.min(1, n / all) : 0;
  for (const a of list) { if (a.ag) for (const o in a.ag) a.ag[o] *= 1 - f; a.n *= 1 - f; cleanDel(s, a); }
  tidy(s);
}
// det gömda slaget tas ur värdstackarna, lika mycket ur varje
function takeHidden(s: State, k: string, n: number) {
  const list = stored(s, SAKER[k]!.i!).filter(a => a.dold), all = list.reduce((m, a) => m + a.dold!, 0);
  if (all <= 0 || n <= 0) return 0;
  const f = Math.min(1, n / all);
  for (const a of list) a.dold! -= a.dold! * f;
  tidy(s);
  return all * f;
}
// det som kommer till utan att någon skaffat det (n > 0) är byns; n < 0 tar bort ur förrådet, allas delar lika mycket
export function addTo(s: State, k: string, n: number) { if (n > 0) place(s, k, n, 1); else if (n < 0) takeProp(s, k, -n); }
// lägg n av slaget k i förrådet; ag = vems det är (jämkat till n), resten är byns
export function put(s: State, k: string, n: number, ag?: Del, c = 1) { place(s, k, n, c, ag && shareOf(ag, n)); }
// p skaffade n av slaget k och lade det rakt i förrådet: det är hens (egendom.ts)
export function gain(s: State, p: Person, k: string, n: number) { if (n > 0) place(s, k, n, 1, { [p.id]: n }); }
// p tar n av slaget k ur förrådet; common = till byns eld eller hus. Ger vems det var
export function use(s: State, p: Person | undefined, k: string, n: number, common = false) { return takeOwn(s, k, n, p, common).ag; }
// för nya byar och tester: förrådet av slaget k blir n, och det som läggs till är byns
export function setAmount(s: State, k: string, n: number) {
  if (isTool(k)) { s.items[k] = n; syncTools(s); return; }
  const d = n - amountOf(s, k);
  if (d > 1e-12) place(s, k, d, 1); else if (d < -1e-12) takeProp(s, k, -d);
}
export function setStock(s: State, m: Record<string, number>) { for (const k in m) setAmount(s, k, m[k]); }
// p tar n mat ur förrådet: sitt eget och byns, eller (fran, stöld) den personens. Maten som förstörs fortast äts
// först, och av den det sämsta. Ger hur mycket som åts och skicket
export function takeFood(s: State, n: number, p?: Person, fran?: Person) {
  let got = 0, cw = 0;
  for (const k of FOOD) {
    if (n - got <= 1e-12) break;
    const v = Math.min(n - got, amountOf(s, k), fran ? ownsAmount(s, fran, k) : p ? mayTake(s, p, k) : Infinity);
    if (v <= 1e-12) continue;
    const r = takeOwn(s, k, v, p, false, fran?.id);
    got += r.n; cw += r.n * r.c;
  }
  return { n: got, c: got > 0 ? cw / got : 1 };
}
// äldre sparfiler (före v40): summorna och ägarnas delar sparades bredvid stackarna. Stackarna jämkas efter summorna, och
// delarna läggs i stackarna i förhållande till hur mycket varje stack rymmer
export function storeFromSums(s: State) {
  const m = { ...(s.mat ?? {}) };
  let sum = 0; for (const k of FOOD) sum += m[k] ?? 0;
  const food = s.food ?? sum;
  if (food > sum + 1e-9) m.bar = (m.bar ?? 0) + food - sum;
  else if (food < sum - 1e-9) { const f = sum > 0 ? Math.max(0, food) / sum : 0; for (const k of FOOD) if (m[k]) m[k] *= f; }
  const want: Record<string, number> = { ...m, ved: s.wood ?? 0 };
  for (const k in s.items ?? {}) if (!isTool(k) && !isFood(k) && k !== 'ved') want[k] = s.items[k];
  for (const k of [...STACK_ORDER, ...DOLD]) if (!isTool(k)) setAmount(s, k, Math.max(0, want[k] ?? 0));
  for (const k in s.egna ?? {}) {
    const list = stored(s, k), tot = list.reduce((n, a) => n + a.n, 0);
    if (tot > 0) for (const a of list) { a.ag = addDel(a.ag ?? {}, s.egna![k], a.n / tot); cleanDel(s, a); }
  }
  for (const k in s.items ?? {}) if (!isTool(k)) delete s.items[k];
  delete s.food; delete s.wood; delete s.mat; delete s.egna; delete s.egnaT;
  changed(s);
}

// redskapen: en stack för varje redskap i förrådet (inte de som någon har i handen), med tingets skick.
// Stackarna följer tingen (steg 1.1.3 gör tingen till det enda)
export function syncToolStacks(s: State) {
  syncTools(s);
  for (const k of STACK_ORDER) if (isTool(k)) toolStacks(s, k);
  tidy(s);
}
function toolStacks(s: State, k: string) {
  const ts = toolsOf(s, k).filter(t => t.hos === undefined).sort((a, b) => a.c - b.c);
  let st = stacksOf(s).filter(a => a.k === k && isStored(s, a.x, a.y));
  for (const a of st.sort((a, b) => a.n - b.n).slice(0, Math.max(0, st.length - ts.length))) a.n = 0;
  st = st.filter(a => a.n > 0);
  for (let i = st.length; i < ts.length; i++) place(s, k, ts[i].c, 1);
  st = stacksOf(s).filter(a => a.k === k && a.n > 0 && isStored(s, a.x, a.y)).sort((a, b) => a.n - b.n);
  for (let i = 0; i < Math.min(st.length, ts.length); i++) st[i].n = ts[i].c;
}
// stackarnas slitage i förrådet förs över till tingen (båda i skicksordning)
function wearToTools(s: State) {
  for (const k of STACK_ORDER) {
    if (!isTool(k)) continue;
    const ts = toolsOf(s, k).filter(t => t.hos === undefined).sort((a, b) => a.c - b.c);
    const st = stacksOf(s).filter(a => a.k === k && isStored(s, a.x, a.y)).sort((a, b) => a.n - b.n);
    if (st.length !== ts.length) continue;
    for (let i = 0; i < ts.length; i++) ts[i].c = st[i].n;
    s.ting = tingOf(s).filter(t => t.c > 1e-6);
    s.items[k] = toolsOf(s, k).reduce((n, t) => n + t.c, 0);
  }
}

// alla stackar med plats och skick
export function pilesOf(s: State): Pile[] {
  syncToolStacks(s);
  return stacksOf(s).map(a => { const zone = zoneAt(s, a.x, a.y); return { ...a, max: RUTA[a.k] ?? 25, zone, out: zone < 0, stored: isStored(s, a.x, a.y) }; });
}

// ---------- slitage ----------
// Skicket sjunker varje timme. Mat ruttnar (fisk fortast). Ved faller till sist sönder till grenar,
// grenar och gräs multnar bort, redskap slits sakta även när de ligger still. Sten slits inte.
// Utanför lagret slits allt fortare, under tak långsammare. Hur fort varje sak slits står i saker.ts.
export function wearRate(s: State, k: string, ai: number, food = foodOf(s)) {
  const d = SAKER[k];
  if (d?.ruttnar !== undefined) return 0.003 * (1 + food / 250) * (ai === 0 ? 0.5 : 1) * d.ruttnar;
  return d?.slits ?? 0;
}
export const wearMult = (s: State, x: number, y: number) => roofed(s, x, y) ? INDOOR_WEAR : zoneAt(s, x, y) >= 0 ? 1 : OUT_WEAR;
export function wearStore(s: State, dtSec: number, ai: number) {
  syncToolStacks(s);
  const h = dtSec / 3600, food = foodOf(s);
  for (const a of stacksOf(s)) {
    const r = wearRate(s, a.k, ai, food) * wearMult(s, a.x, a.y) * h;
    if (a.dold) a.dold *= Math.exp(-wearRate(s, DOLD_I[a.k], ai, food) * wearMult(s, a.x, a.y) * h);
    if (r <= 0) continue;
    if (isTool(a.k)) { a.n -= Math.min(a.n, r); continue; }
    a.c -= r;
    if (a.c > 0) continue;
    const into = SAKER[a.k]?.blir; // ved faller sönder till grenar, och ägarna äger grenarna
    a.dold = undefined;
    if (into && a.n > 0) {
      const m = Math.min(RUTA[into.k], a.n * into.per);
      if (a.ag) for (const o in a.ag) a.ag[o] *= m / a.n;
      a.n = m; a.k = into.k; a.c = 0.5;
    } else a.n = 0;
  }
  wearToTools(s);
  wearCarried(s, k => wearRate(s, k, ai, food) * h);
  tidy(s);
}

// ---------- lagerplatserna ----------
// en gång i timmen: större när något inte får plats, en ny lagerplats när de inte kan växa mer, mindre när de står tomma
export function tidyStore(s: State) {
  syncToolStacks(s);
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
  changed(s);
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
// det en uppgift ger (handlingar.ts): bär från samling, kött från jakt, fisk från fiske, grenar från vedplockning, ved från huggning
export const carryKind = (act: Act) => ACTS[act].ger ?? 'bar';
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
// lägg det som bärs i förrådet, helst där man står. Det är ägarnas i t.ag, resten är dens som skaffade det (owner);
// det som bärs mellan lagerplatser har alltid sina ägare med sig
export function storeLoad(s: State, t: Task, x?: number, y?: number, owner = BYN) {
  const all = loadOf(t), at = x !== undefined ? { x: Math.floor(x), y: Math.floor(y!) } : undefined;
  for (const k in all) if (all[k] > 1e-9) place(s, k, all[k], t.cond?.[k] ?? 1, shareOf(t.ag?.[k], all[k], t.act === 'bara' ? BYN : owner), at);
  t.carry = 0; t.items = undefined; t.cond = undefined; t.ag = undefined;
}
// den som kallas bort lägger ner bördan där hen står; ligger den långt från lagret får någon bära in den senare
export function dropLoad(s: State, t: Task, x: number, y: number, owner = BYN) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (isStored(s, tx, ty)) { storeLoad(s, t, x, y, owner); return; }
  const all = loadOf(t), st = stacksOf(s), who = t.act === 'bara' ? BYN : owner;
  for (const k in all) {
    if (all[k] < 1e-6) continue;
    if (SAKER[k]?.i) { hide(s, SAKER[k]!.i!, all[k], { x: tx, y: ty }); continue; }
    const c = t.cond?.[k] ?? 1, ag = shareOf(t.ag?.[k], all[k], who);
    let g = st.find(q => q.x === tx && q.y === ty && q.k === k);
    if (!g) st.push(g = { x: tx, y: ty, k, n: 0, c });
    g.c = (g.c * g.n + c * all[k]) / (g.n + all[k]); g.n += all[k]; g.ag = addDel(g.ag ?? {}, ag); cleanDel(s, g);
  }
  t.carry = 0; t.items = undefined; t.cond = undefined; t.ag = undefined;
  changed(s);
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
    else if (!allows(zs[zi], a.k)) { if (zoneSpot(s, a.k, -Infinity, occ)) { why = `Sorterar: flyttar ${sakNamn(a.k).toLowerCase()} till ${zs.find(z => allows(z, a.k))?.namn?.toLowerCase() ?? 'rätt lager'}`; sc += 100; } }
    else if (zoneSpot(s, a.k, zs[zi].prio ?? 0, occ)) { why = 'Flyttar saker till ett lager närmare elden'; sc += 150; }
    if (why && sc < bs) { bs = sc; best = { x: a.x + 0.5, y: a.y + 0.5, why }; }
  }
  return best;
}
// plocka upp så mycket man orkar av stackarna på rutan. Ägarna följer med i bördan, lika mycket av varjes del
export function pickUp(s: State, p: Person, t: Task) {
  const x = Math.floor(t.tx), y = Math.floor(t.ty);
  let room = capacity(s, p) - load(t);
  for (const g of stacksOf(s)) {
    if (g.x !== x || g.y !== y || room <= 1e-9) continue;
    const st = STACK[g.k] ?? 25, v = Math.min(g.n, isTool(g.k) ? g.n : room * st), f = g.n > 0 ? v / g.n : 1;
    const had = t.items?.[g.k] ?? 0;
    if (v > 0) {
      (t.items ??= {})[g.k] = had + v;
      (t.cond ??= {})[g.k] = ((t.cond[g.k] ?? 1) * had + g.c * v) / (had + v);
      if (g.ag) { const ag = (t.ag ??= {})[g.k] ??= {}; for (const o in g.ag) { ag[o] = (ag[o] ?? 0) + g.ag[o] * f; g.ag[o] -= g.ag[o] * f; } }
    }
    if (g.dold) { const d = DOLD_I[g.k]; (t.items ??= {})[d] = (t.items[d] ?? 0) + g.dold * f; g.dold -= g.dold * f; }
    g.n -= v; room -= v / st;
    cleanDel(s, g);
  }
  tidy(s);
}
