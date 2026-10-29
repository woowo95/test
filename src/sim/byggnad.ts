import { getMap } from './karta';
import { groundOf, tileOf } from './mark';
import { H, State, T, W, inMap } from './typer';
import { balans } from './balans';
import { iVattnetNu } from './sjo';

// Balanstal (regel 8): hur väl ett rum skyddar mot kylan
export const BYGGNAD = balans('byggnad', {
  oppningLacker: 0.12, // så mycket sämre ett rum håller värmen för varje öppning
  kroppsvarme: 0.04, // varje människa i rummet värmer så här mycket (hur många som är där räknas, shelterOf)
  skyddMax: 0.9, // mer än så här skyddar inget rum mot kylan
  skinndorrTat: 0.6, // en skinndörr släpper ut så här mycket mindre värme än en öppen dörröppning (steg 2.2.16) ...
  skinndorrSkinn: 2, // ... görs av så många skinn ...
  skinndorrMin: 20, // ... och så många minuters arbete
  tradorrTat: 0.85, // en trädörr släpper ut så här mycket mindre värme än en öppen dörröppning (steg 3.7.21) ...
  tradorrVed: 4, tradorrRep: 1, // ... görs av så mycket trä och rep ...
  tradorrMin: 20, // ... och så många minuters arbete
});

// ---------- byggen ----------
// Varje ruta kan ha en vägg, ett golv eller en öppning. Väggar stänger vägen; en öppning är en lucka i väggen som man går
// igenom. Golv som är helt omgivet av väggar och öppningar är ett rum under tak (inget tak ritas).
// Vilka väggar och golv man kan bygga är teknik. Vilket hus man bygger bestämmer byn själv efter behov: när någon kan
// bygga väggar planerar den skickligaste byggaren ett hus för det mest akuta behovet (byggnader.ts).
type BitK = 'vagg' | 'golv' | 'oppning';
// en byggd eller planerad ruta. b = hur långt bygget kommit (1 = klart), mat = material som lagts på bygget,
// c = skick (1 = nytt), lp/lm = lagning: hur långt den kommit och material som lagts på den, dorr = dörren som hänger i en
// öppning (en rad i DORRAR)
export interface Bit { id: number; x: number; y: number; k: BitK; m: string; b: number; mat: number; c: number; hus?: number; lp?: number; lm?: number; dorr?: string }
// kom = var materialet kom ifrån (bygg.ts), fn = husets funktion (en rad i BYGGNADER, byggnader.ts; saknas = sovsal), ag = ägaren (ett familjehus), slag = vad ett förrådshus rymmer
export interface Hus { id: number; namn: string; x: number; y: number; w: number; h: number; klar?: number; varKlar?: number; kom?: Record<string, number>; fn?: string; ag?: number; slag?: 'mat' | 'material'; tom?: number } // tom = sedan när ingen sover i sovsalen; varKlar = när huset först blev färdigt, sparat när en vägg rasar (klar nollas då)
// per material: vad som går åt per ruta, timmar för en ovan byggare (riktlinjen, steg 2.12.8: 20 minuter per vägg, 5 per ruta
// jordgolv och 10 trägolv; slaget är k, se TIDSLAG i tider.ts), slitage per timme, hur bra väggen håller värmen.
// farg och ikon är bara bilden: färgen på kartan och symbolen i rutan under musen (simuleringen läser dem aldrig)
export interface Material { namn: string; k: BitK; item?: string; n: number; tim: number; slit: number; isol?: number; tek?: string; farg: number; ikon?: string }
export const MATERIAL: Record<string, Material> = {
  timmer: { namn: 'Timmervägg', k: 'vagg', item: 'ved', n: 5, tim: 20 / 60, slit: 0.0005, isol: 0.7, tek: 'timmervagg', farg: 0x8a5e34, ikon: 'timmervagg' },
  ris: { namn: 'Risvägg', k: 'vagg', item: 'grenar', n: 5, tim: 20 / 60, slit: 0.002, isol: 0.55, farg: 0x6b4a2a, ikon: 'risvagg' }, // äldre sparfiler: risväggar byggs inte längre men kan lagas
  jord: { namn: 'Jordgolv', k: 'golv', n: 0, tim: 5 / 60, slit: 0, farg: 0x7a5a3a },
  tra: { namn: 'Trägolv', k: 'golv', item: 'ved', n: 1, tim: 10 / 60, slit: 0.0002, tek: 'timmervagg', farg: 0xa07446, ikon: 'tragolv' },
  ho: { namn: 'Golv av hö', k: 'golv', item: 'torrgras', n: 1, tim: 5 / 60, slit: 0.002, farg: 0xd2b866, ikon: 'hogolv' }, // äldre sparfiler: hö-golv läggs inte längre, slits till jordgolv
  oppning: { namn: 'Öppning', k: 'oppning', n: 0, tim: 0, slit: 0, farg: 0x7a5a3a },
};

// ---------- dörrarna (steg 2.2.16) ----------
// Dörrarna kommer i nivåer: först en öppning, sedan en hängd hud, sist en riktig dörr (7.2.1). Varje sort är en rad: tekniken
// (tek, samma id i TEKNIK, teknik.ts), materialet (av), minuterna (min) och hur mycket mindre värme den släpper ut än en
// öppning (tat). Den hängs i handlingen dorr (task.tool = sorten, bygg.ts) i ett färdigt hus där man bor eller umgås. En ny
// sorts dörr blir en rad här, en rad i TEKNIK, ett namn i verktyg för handlingen dorr (handlingar.ts) och två bilder i ikoner.ts.
// Raderna står i ordning från den sämsta till den bästa: en bättre dörr ersätter en sämre, aldrig tvärtom (utanDorr i bygg.ts).
// stanger = dörren stängs när någon gömmer sig i huset, och djur kommer aldrig igenom den (steg 3.7.21, varg.ts); en skinndörr
// håller bara värmen inne och stoppar ingen
export interface DorrDef { namn: string; ikon: string; tek: string[]; av: Record<string, number>; min: number; tat: number; gor: string; forsta: string; stanger?: true }
export const DORRAR = {
  skinndorr: {
    namn: 'Skinndörr', ikon: 'skinndorr', tek: ['skinndorr'], av: { skinn: BYGGNAD.skinndorrSkinn }, min: BYGGNAD.skinndorrMin, tat: BYGGNAD.skinndorrTat,
    gor: 'Hänger en hud i dörröppningen.',
    forsta: '{namn} hängde byns första skinndörr i en dörröppning. Huset håller värmen bättre.',
  },
  tradorr: {
    namn: 'Trädörr', ikon: 'tradorr', tek: ['tradorr'], av: { ved: BYGGNAD.tradorrVed, rep: BYGGNAD.tradorrRep }, min: BYGGNAD.tradorrMin, tat: BYGGNAD.tradorrTat, stanger: true,
    gor: 'Hänger en dörr av trä i dörröppningen.',
    forsta: '{namn} hängde byns första trädörr. Den håller värmen inne och kan stängas mot vargarna.',
  },
} satisfies Record<string, DorrDef>;
export type DorrSlag = keyof typeof DORRAR;
export const DORR_LIST = Object.keys(DORRAR) as DorrSlag[];
export const dorrDef = (k?: string): DorrDef | undefined => k ? (DORRAR as Record<string, DorrDef>)[k] : undefined;
// dörrens plats i ordningen (−1 = ingen dörr)
export const dorrRang = (k?: string) => k ? DORR_LIST.indexOf(k as DorrSlag) : -1;

export const bitsOf = (s: State) => (s.byggen ??= []);
export const housesOf = (s: State) => (s.hus ??= []);
export const husById = (s: State, id?: number) => housesOf(s).find(h => h.id === id);
export const bitById = (s: State, id?: number) => bitsOf(s).find(b => b.id === id);
export const touch = (s: State) => { s.byggV = (s.byggV ?? 0) + 1; };

// ---------- rutnätet: vad som står var, och vilka rum det blir ----------
export interface Rum { id: number; tiles: number[]; walls: number[]; open: number; hus?: number }
interface Grid { v: number; at: Map<number, Bit>; solid: Uint8Array; tak: Int32Array; rooms: Rum[] }
const grids = new WeakMap<State, Grid>();
export function gridOf(s: State): Grid {
  const v = s.byggV ?? 0;
  let g = grids.get(s);
  if (g && g.v === v) return g;
  const at = new Map<number, Bit>(), solid = new Uint8Array(W * H), wall = new Uint8Array(W * H), built = new Uint8Array(W * H);
  for (const b of bitsOf(s)) {
    const i = b.y * W + b.x; at.set(i, b); built[i] = 1;
    if (b.k === 'oppning' || (b.k === 'vagg' && b.b >= 1)) wall[i] = 1;
    if (b.k === 'vagg' && b.b >= 1) solid[i] = 1;
  }
  // allt som nås från kartans kant utan att gå genom en vägg eller öppning är utomhus
  const out = new Uint8Array(W * H), q: number[] = [];
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) q.push(y * W + x);
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) q.push(y * W + x);
  while (q.length) {
    const i = q.pop()!;
    if (out[i] || wall[i]) continue;
    out[i] = 1;
    const x = i % W, y = (i - x) / W;
    if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y > 0) q.push(i - W); if (y < H - 1) q.push(i + W);
  }
  // det inneslutna delas upp i rum; golvrutorna i ett rum är under tak
  const tak = new Int32Array(W * H).fill(-1), seen = new Uint8Array(W * H), rooms: Rum[] = [];
  for (let i0 = 0; i0 < W * H; i0++) {
    if (out[i0] || wall[i0] || seen[i0]) continue;
    const tiles: number[] = [], walls = new Set<number>(), st = [i0];
    let open = 0; seen[i0] = 1;
    while (st.length) {
      const i = st.pop()!; tiles.push(i);
      const x = i % W, y = (i - x) / W;
      for (const n of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (n < 0) continue;
        if (wall[n]) { if (!walls.has(n)) { walls.add(n); if (at.get(n)!.k === 'oppning') open++; } continue; }
        if (!seen[n]) { seen[n] = 1; st.push(n); }
      }
    }
    const r: Rum = { id: rooms.length, tiles: tiles.filter(i => at.get(i)?.k === 'golv' && at.get(i)!.b >= 1), walls: [...walls], open, hus: at.get(tiles[0])?.hus };
    for (const i of r.tiles) tak[i] = r.id;
    rooms.push(r);
  }
  g = { v, at, solid, tak, rooms };
  grids.set(s, g);
  const gr = groundOf(s); gr.solid = solid; gr.built = built;
  return g;
}
export const bitAt = (s: State, x: number, y: number) => gridOf(s).at.get(Math.floor(y) * W + Math.floor(x));
export const isWall = (s: State, x: number, y: number) => inMap(x, y) && gridOf(s).solid[tileOf(x, y)] === 1;
// man kan inte stå här: vatten eller en vägg
export const blocked = (s: State, x: number, y: number) => { const i = Math.floor(y) * W + Math.floor(x); return getMap(s.seed).tiles[i] === T.Vatten || !!s.flod && iVattnetNu(s, i) || isWall(s, x, y); }; // och översvämningens vatten (flod.ts)
// närmaste plats som inte är vatten eller vägg
// inte = rutan själv räknas inte (där en vägg ska byggas)
export function freeNear(s: State, x: number, y: number, inte = false) {
  if (!inte && !blocked(s, x, y)) return { x, y };
  for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const nx = x + dx, ny = y + dy;
    if (inMap(nx, ny) && !blocked(s, nx, ny)) return { x: nx, y: ny };
  }
  return { x, y };
}
export function roomAt(s: State, x: number, y: number): Rum | undefined {
  if (!inMap(x, y)) return;
  const g = gridOf(s), r = g.tak[tileOf(x, y)];
  return r >= 0 ? g.rooms[r] : undefined;
}
export const roofed = (s: State, x: number, y: number) => !!roomAt(s, x, y);
// hur väl rummet håller värmen: väggarnas material och skick, sämre för varje öppning (mindre när en dörr hänger där)
export function insulation(s: State, r: Rum) {
  const g = gridOf(s);
  let sum = 0, n = 0, open = 0;
  for (const i of r.walls) {
    const b = g.at.get(i)!;
    if (b.k === 'oppning') { open += 1 - (dorrDef(b.dorr)?.tat ?? 0); continue; }
    if (b.k !== 'vagg') continue;
    sum += (MATERIAL[b.m].isol ?? 0) * (0.5 + 0.5 * b.c); n++;
  }
  return Math.max(0, (n ? sum / n : 0) - BYGGNAD.oppningLacker * open);
}
// den som är inne i ett rum kyls långsammare, och ju fler som är där, desto varmare håller de varandra
export const shelterOf = (s: State, r: Rum, folk: number) => Math.min(BYGGNAD.skyddMax, insulation(s, r) + BYGGNAD.kroppsvarme * folk);
