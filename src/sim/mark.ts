import { getMap, hash, vnoise } from './karta';
import { campKey } from './plats';
import { H, HOUR, State, W, inMap, mapKey } from './typer';
import { FOREST, Ground, HIGH, decodeCover, encodeCover, isSoil, pathTree, wear } from './vag';

// ---------- mark: gräs, stigar och skog ----------
// Förr fanns skog överallt där det är jord. Byn börjar i en liten glänta; resten är skog.
const grounds = new WeakMap<State, Ground>();
export function groundOf(s: State): Ground {
  let g = grounds.get(s);
  if (!g) {
    const m = getMap(s.seed);
    g = { tiles: m.tiles, cover: decodeCover(s.mark), trees: s.skog ? decodeCover(s.skog, 0) : startForest(s.seed) };
    if (!s.skog) for (let i = 0; i < g.trees.length; i++) if (g.cover[i] < HIGH) g.trees[i] = 0; // äldre sparfil: inga träd på stigarna
    grounds.set(s, g);
  }
  return g;
}
export const coverOf = (s: State) => groundOf(s).cover;
export function packGround(s: State) { const g = groundOf(s); s.mark = encodeCover(g.cover); s.skog = encodeCover(g.trees); }

// ängar: fläckar av fuktig mark där det växer högt gräs och träd har svårt att få fäste
const angCache = new Map<string, Uint8Array>();
export const ANG = 0.56; // gräns i bruset: över den är det äng
export function angOf(seed: number) {
  let a = angCache.get(mapKey(seed));
  if (a) return a;
  a = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = vnoise(seed + 41, x / 7, y / 7) * 0.7 + vnoise(seed + 43, x / 3, y / 3) * 0.3;
    a[y * W + x] = v > ANG ? 1 : 0;
  }
  angCache.set(mapKey(seed), a);
  return a;
}
const ANG_SPREAD = 0.1; // skogen sprider sig in på en äng tio gånger långsammare

// skog på jorden utom på ängarna och i en glänta runt byplatsen (lite ojämn kant)
export function startForest(seed: number) {
  const m = getMap(seed), ang = angOf(seed), trees = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!isSoil(m.tiles[i]) || ang[i]) continue;
    const d = Math.hypot(x - m.fire.x, (y - m.fire.y) * 1.1);
    const edge = 5.5 + hash(seed + 31, x, y) * 1.6;
    trees[i] = d < edge ? 0 : d < edge + 1 ? 0.6 : 1;
  }
  return trees;
}
export const isForest = (s: State, i: number) => groundOf(s).trees[i] >= FOREST;

// rutor där inget får växa: runt elden och på lagerplatserna (husen står i g.built). Räknas om när lägret ändras
const builtCache = new WeakMap<State, { key: string; b: Uint8Array }>();
function built(s: State) {
  const key = campKey(s);
  let c = builtCache.get(s);
  if (c?.key === key) return c.b;
  const m = getMap(s.seed), b = new Uint8Array(W * H);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inMap(m.fire.x + dx, m.fire.y + dy)) b[(m.fire.y + dy) * W + m.fire.x + dx] = 1;
  for (const z of s.lagren ?? []) for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (inMap(x, y)) b[y * W + x] = 1;
  builtCache.set(s, c = { key, b });
  return b;
}

export const GROW = [0.1, 1.2, 1, 0.6]; // grästillväxt per tidsålder
const REGROW = 0.011; // så mycket gräset växer tillbaka per timme (gånger GROW). Lite trampad mark hinner läka, så bara stigarna blir bara
const TREE_SEASON = [0, 1.2, 1, 0.5]; // trädens tillväxt per tidsålder
const TREE_GROW = 1 / (10 * 24); // en planta blir vuxen skog på ungefär tio dygn
const SPREAD = 0.0015, FAR = 0.00002; // chans per timme att ett frö gror: per skogsgranne, och långt bort
// en timme: gräset växer tillbaka från grannrutorna, skogen sprider sig som en våg och plantor växer
export function growGround(s: State, hours: number, season: number) {
  const g = groundOf(s), b = built(s), ang = angOf(s.seed), { tiles, cover, trees } = g;
  const old = cover.slice(), hr = Math.floor(s.now / HOUR), ts = TREE_SEASON[season];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!isSoil(tiles[i])) continue;
    if (b[i] || g.built?.[i]) { cover[i] = Math.min(cover[i], 0.5); if (b[i] || trees[i] < FOREST) trees[i] = 0; continue; } // inget växer vid elden, i lagret eller i husen (vuxna träd står kvar tills de fälls)
    if (old[i] < 1) {
      let n = 0, c = 0;
      if (x > 0 && isSoil(tiles[i - 1])) { n += old[i - 1]; c++; }
      if (x < W - 1 && isSoil(tiles[i + 1])) { n += old[i + 1]; c++; }
      if (y > 0 && isSoil(tiles[i - W])) { n += old[i - W]; c++; }
      if (y < H - 1 && isSoil(tiles[i + W])) { n += old[i + W]; c++; }
      const nb = c ? n / c : 0.5;
      cover[i] = Math.min(1, old[i] + hours * REGROW * GROW[season] * (0.25 + 0.75 * nb));
    }
    if (!ts || old[i] < HIGH) continue; // stigar och kort gräs stoppar ny skog
    if (trees[i] > 0) { if (trees[i] < 1) trees[i] = Math.min(1, trees[i] + hours * TREE_GROW * ts); continue; }
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if ((dx || dy) && inMap(xx, yy) && trees[yy * W + xx] >= FOREST) n++;
    }
    if (hash(s.seed + hr, x, y) < hours * (SPREAD * n + FAR) * ts * (ang[i] ? ANG_SPREAD : 1)) trees[i] = 0.05;
  }
}

export const WEAR = 0.028; // slitage när någon går över en ruta
export const tileOf = (x: number, y: number) => Math.max(0, Math.min(H - 1, Math.floor(y))) * W + Math.max(0, Math.min(W - 1, Math.floor(x)));
// vid ikappräkning går ingen på riktigt: slitaget läggs längs bästa vägen mellan elden och målet.
// Vägarna räknas om var fjärde timme (stigarna ändras långsamt) och när något byggs
const paths = new WeakMap<State, { key: string; came: Int32Array }>();
export function tread(s: State, tx: number, ty: number, trips: number) {
  const m = getMap(s.seed), g = groundOf(s), key = `${Math.floor(s.now / (4 * HOUR))},${s.byggV ?? 0}`;
  let t = paths.get(s);
  if (t?.key !== key) paths.set(s, t = { key, came: pathTree(g, m.fire.x, m.fire.y) });
  for (let i = tileOf(tx, ty), n = 0; i >= 0 && n < 200; i = t.came[i], n++) wear(g, i, WEAR * trips);
}
