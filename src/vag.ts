// Vägsökning och mark: invånarna går runt vatten och följer gärna stigar.
// Där många går nöts gräset ner till stig och bar jord. Gräset växer långsamt tillbaka från grannrutorna.
import { T, W, H } from './sim';

const BASE_SPEED = [0, 0.9, 1, 0.75, 0.8]; // Vatten, Sand, Gräs, Skog, Sten
export const STIG = 0.6, BAR = 0.25; // under dessa värden syns stig respektive bar jord
export const hasCover = (t: number) => t === T.Gras || t === T.Skog;
const SQ2 = Math.SQRT2;

// fart på en ruta: stig och bar jord ger upp till 15 % snabbare gång
export function speedAt(tiles: Uint8Array, cover: Float32Array, i: number) {
  const t = tiles[i];
  const v = BASE_SPEED[t];
  return hasCover(t) ? v * (1 + 0.15 * (1 - cover[i])) : v;
}
// kostnad att gå in på en ruta: man följer hellre en upptrampad stig än går rakt över gräset
const stepCost = (tiles: Uint8Array, cover: Float32Array, i: number) =>
  (hasCover(tiles[i]) ? 0.6 + 0.4 * cover[i] : 1) / speedAt(tiles, cover, i);

// A* med 8 riktningar. Inte över vatten och inte snett förbi en vattenhörna. Start och mål får vara vatten.
// Ger rutorna mellan start och mål (utan båda), eller null om det inte finns någon väg.
export function findPath(tiles: Uint8Array, cover: Float32Array, x0: number, y0: number, x1: number, y1: number): number[] | null {
  const sx = clampI(x0, W), sy = clampI(y0, H), gx = clampI(x1, W), gy = clampI(y1, H);
  const start = sy * W + sx, goal = gy * W + gx;
  if (start === goal) return [];
  const N = W * H;
  const g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = new Heap();
  g[start] = 0; heap.push(start, 0);
  while (heap.size) {
    const i = heap.pop();
    if (i === goal) break;
    if (closed[i]) continue;
    closed[i] = 1;
    const x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (closed[ni] || (tiles[ni] === T.Vatten && ni !== goal)) continue;
      if (dx && dy && (tiles[y * W + nx] === T.Vatten || tiles[ny * W + x] === T.Vatten)) continue;
      const ng = g[i] + (dx && dy ? SQ2 : 1) * (tiles[ni] === T.Vatten ? 1 : stepCost(tiles, cover, ni));
      if (ng < g[ni]) { g[ni] = ng; came[ni] = i; heap.push(ni, ng + Math.hypot(nx - gx, ny - gy) * 0.52); }
    }
  }
  if (came[goal] < 0) return null;
  const out: number[] = [];
  for (let i = came[goal]; i !== start && i >= 0; i = came[i]) out.push(i);
  return out.reverse();
}

// kortaste vägar från en punkt till alla rutor (används vid ikappräkning, då ingen går på riktigt)
export function pathTree(tiles: Uint8Array, cover: Float32Array, x0: number, y0: number): Int32Array {
  const N = W * H, src = clampI(y0, H) * W + clampI(x0, W);
  const g = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = new Heap();
  g[src] = 0; heap.push(src, 0);
  while (heap.size) {
    const i = heap.pop();
    if (closed[i]) continue;
    closed[i] = 1;
    const x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (closed[ni] || tiles[ni] === T.Vatten) continue;
      if (dx && dy && (tiles[y * W + nx] === T.Vatten || tiles[ny * W + x] === T.Vatten)) continue;
      const ng = g[i] + (dx && dy ? SQ2 : 1) * stepCost(tiles, cover, ni);
      if (ng < g[ni]) { g[ni] = ng; came[ni] = i; heap.push(ni, ng); }
    }
  }
  return came;
}

export function wear(tiles: Uint8Array, cover: Float32Array, i: number, amount: number) {
  if (i >= 0 && i < cover.length && hasCover(tiles[i])) cover[i] = Math.max(0, cover[i] - amount);
}

// gräset växer tillbaka, snabbare om grannrutorna är gröna (det sprider sig från kanterna)
export function regrow(tiles: Uint8Array, cover: Float32Array, hours: number, season: number, bare: number[]) {
  const old = cover.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!hasCover(tiles[i]) || old[i] >= 1) continue;
    let n = 0, c = 0;
    if (x > 0 && hasCover(tiles[i - 1])) { n += old[i - 1]; c++; }
    if (x < W - 1 && hasCover(tiles[i + 1])) { n += old[i + 1]; c++; }
    if (y > 0 && hasCover(tiles[i - W])) { n += old[i - W]; c++; }
    if (y < H - 1 && hasCover(tiles[i + W])) { n += old[i + W]; c++; }
    const nb = c ? n / c : 0.5;
    cover[i] = Math.min(1, old[i] + hours * 0.01 * season * (0.25 + 0.75 * nb));
  }
  for (const i of bare) cover[i] = 0; // vid elden växer inget
}

export function encodeCover(cover: Float32Array) {
  let bin = '';
  for (let i = 0; i < cover.length; i++) bin += String.fromCharCode(Math.round(cover[i] * 255));
  return btoa(bin);
}
export function decodeCover(txt: string | undefined): Float32Array {
  const c = new Float32Array(W * H).fill(1);
  if (!txt) return c;
  try { const bin = atob(txt); for (let i = 0; i < Math.min(bin.length, c.length); i++) c[i] = bin.charCodeAt(i) / 255; } catch { /* ny mark */ }
  return c;
}

const clampI = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(v)));

class Heap {
  private ids: number[] = []; private keys: number[] = [];
  get size() { return this.ids.length; }
  push(id: number, k: number) {
    const a = this.ids, b = this.keys;
    let i = a.length; a.push(id); b.push(k);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (b[p] <= k) break;
      a[i] = a[p]; b[i] = b[p]; i = p;
    }
    a[i] = id; b[i] = k;
  }
  pop() {
    const a = this.ids, b = this.keys, top = a[0];
    const id = a.pop()!, k = b.pop()!;
    if (a.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mk = k;
        if (l < a.length && b[l] < mk) { m = l; mk = b[l]; }
        if (r < a.length && b[r] < mk) { m = r; mk = b[r]; }
        if (m === i) break;
        a[i] = a[m]; b[i] = b[m]; i = m;
      }
      a[i] = id; b[i] = k;
    }
    return top;
  }
}
