import { H, H0, OX, OY, T, W, W0, kartNamn, mapKey } from './typer';

// ---------- karta ----------
export function hash(seed: number, x: number, y: number) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(seed: number, x: number, y: number) {
  return vnoise(seed, x / 12, y / 12) * 0.55 + vnoise(seed + 7, x / 6, y / 6) * 0.3 + vnoise(seed + 13, x / 3, y / 3) * 0.15;
}

// Det som bara beror på kartan (fröet, storleken W×H och var en äldre by har sin gamla karta, kartNamn i typer.ts) räknas
// en gång per karta och sparas med nyckeln mapKey. Den senaste kartan svarar direkt, utan att nyckeln byggs. Kartan hör
// till nyckeln, eftersom testerna kör byar med olika kartor i samma process.
export function perKarta<V>(gor: (seed: number) => V): (seed: number) => V {
  const cache = new Map<string, V>();
  let seed0 = NaN, k0 = '', v0!: V;
  return seed => {
    if (seed === seed0 && kartNamn() === k0) return v0;
    const key = mapKey(seed);
    let v = cache.get(key);
    if (v === undefined) { v = gor(seed); cache.set(key, v); }
    seed0 = seed; k0 = kartNamn(); v0 = v;
    return v;
  };
}

interface MapData { tiles: Uint8Array; fire: { x: number; y: number }; stock: { x: number; y: number }; shade: Float32Array }

// Kartan räknas från den gamla kartans hörn (OX, OY): sjön och byplatsen ligger där de låg på den gamla kartan, och
// bruset ger samma mark där (steg 2.10.9). En ny by har sin karta i hörnet 0, 0 och samma storlek som den gamla
export const getMap = perKarta((seed): MapData => {
  const tiles = new Uint8Array(W * H);
  const shade = new Float32Array(W * H);
  const lx = W0 * (0.3 + hash(seed, 1, 1) * 0.4), ly = H0 * (0.25 + hash(seed, 2, 2) * 0.5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x - OX, gy = y - OY; // läget på den gamla kartan
    const d = Math.hypot((gx - lx) / 1.4, gy - ly);
    const lake = Math.max(0, 1 - d / (9 * Math.sqrt(W0 * H0 / 2560)));
    const h = fbm(seed, gx, gy) - lake * 0.55;
    const f = fbm(seed + 99, gx, gy);
    let t: T;
    if (h < 0.22) t = T.Vatten;
    else if (h < 0.27) t = T.Sand;
    else if (h > 0.72) t = T.Sten;
    else if (f > 0.55) t = T.Skog;
    else t = T.Gras;
    tiles[y * W + x] = t;
    shade[y * W + x] = hash(seed + 5, gx, gy);
  }
  // byplats: gräs nära vatten och skog, nära mitten av den gamla kartan (och bara inom den, så att den blir densamma)
  const inne = (x: number, y: number) => x >= OX && y >= OY && x < OX + W0 && y < OY + H0;
  let best = { x: OX + (W0 >> 1), y: OY + (H0 >> 1) }, bs = -1e9;
  for (let y = OY + 5; y < OY + H0 - 5; y++) for (let x = OX + 6; x < OX + W0 - 6; x++) {
    if (tiles[y * W + x] !== T.Gras) continue;
    let water = 99, forest = 99, okArea = true;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const t = tiles[(y + dy) * W + x + dx];
      if (t === T.Vatten || t === T.Sten) okArea = false;
    }
    if (!okArea) continue;
    for (let dy = -12; dy <= 12; dy++) for (let dx = -12; dx <= 12; dx++) {
      const xx = x + dx, yy = y + dy;
      if (!inne(xx, yy)) continue;
      const t = tiles[yy * W + xx], d = Math.hypot(dx, dy);
      if (t === T.Vatten) water = Math.min(water, d);
      if (t === T.Skog) forest = Math.min(forest, d);
    }
    const sc = -Math.abs(water - 6) * 2 - Math.abs(forest - 6) - Math.hypot(x - OX - W0 / 2, y - OY - H0 / 2) * 0.3;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  const f = best;
  // första lagerplatsen (2×2, som LAGER.startBredd × startHojd i lager.ts) helst fire + (4, −1), annars närmaste
  // plats därifrån där inget är vatten eller sten och inget ligger inpå elden (som usable i lager.ts)
  const fri = (x: number, y: number) => {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (!inne(xx, yy) || tiles[yy * W + xx] === T.Vatten || tiles[yy * W + xx] === T.Sten || Math.max(Math.abs(xx - f.x), Math.abs(yy - f.y)) <= 1) return false;
    }
    return true;
  };
  let stock = { x: f.x + 4, y: f.y - 1 }, sd = Infinity;
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    const x = f.x + 4 + dx, y = f.y - 1 + dy, d = Math.hypot(dx, dy);
    if (d < sd && fri(x, y)) { sd = d; stock = { x, y }; }
  }
  return { tiles, fire: f, stock, shade };
});
