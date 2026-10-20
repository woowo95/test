import { H, T, W } from './typer';

// ---------- karta ----------
export function hash(seed: number, x: number, y: number) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(seed: number, x: number, y: number) {
  return vnoise(seed, x / 12, y / 12) * 0.55 + vnoise(seed + 7, x / 6, y / 6) * 0.3 + vnoise(seed + 13, x / 3, y / 3) * 0.15;
}

export interface MapData { tiles: Uint8Array; fire: { x: number; y: number }; huts: { x: number; y: number }[]; stock: { x: number; y: number }; shade: Float32Array }

const mapCache = new Map<number, MapData>();
export function getMap(seed: number): MapData {
  const c = mapCache.get(seed);
  if (c) return c;
  const tiles = new Uint8Array(W * H);
  const shade = new Float32Array(W * H);
  const lx = W * (0.3 + hash(seed, 1, 1) * 0.4), ly = H * (0.25 + hash(seed, 2, 2) * 0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - lx) / 1.4, y - ly);
    const lake = Math.max(0, 1 - d / 9);
    const h = fbm(seed, x, y) - lake * 0.55;
    const f = fbm(seed + 99, x, y);
    let t: T;
    if (h < 0.22) t = T.Vatten;
    else if (h < 0.27) t = T.Sand;
    else if (h > 0.72) t = T.Sten;
    else if (f > 0.55) t = T.Skog;
    else t = T.Gras;
    tiles[y * W + x] = t;
    shade[y * W + x] = hash(seed + 5, x, y);
  }
  // byplats: gräs nära vatten och skog, nära mitten
  let best = { x: W >> 1, y: H >> 1 }, bs = -1e9;
  for (let y = 5; y < H - 5; y++) for (let x = 6; x < W - 6; x++) {
    if (tiles[y * W + x] !== T.Gras) continue;
    let water = 99, forest = 99, okArea = true;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const t = tiles[(y + dy) * W + x + dx];
      if (t === T.Vatten || t === T.Sten) okArea = false;
    }
    if (!okArea) continue;
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const t = tiles[yy * W + xx], d = Math.hypot(dx, dy);
      if (t === T.Vatten) water = Math.min(water, d);
      if (t === T.Skog) forest = Math.min(forest, d);
    }
    const sc = -Math.abs(water - 6) * 2 - Math.abs(forest - 6) - Math.hypot(x - W / 2, y - H / 2) * 0.3;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  const f = best;
  const huts = [{ x: f.x - 3, y: f.y - 3 }, { x: f.x + 2, y: f.y - 3 }, { x: f.x - 3, y: f.y + 2 }, { x: f.x + 2, y: f.y + 2 }];
  const m: MapData = { tiles, fire: f, huts, stock: { x: f.x + 4, y: f.y - 1 }, shade };
  mapCache.set(seed, m);
  return m;
}
