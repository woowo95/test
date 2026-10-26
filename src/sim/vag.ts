// Vägsökning och mark: invånarna går runt vatten och följer gärna stigar.
// Jordrutor (gräs och skog på kartan) har två lager: träd (0 = inga, 1 = vuxen skog) och marktäcke under dem
// (1 = högt gräs, mitten = kort gräs, under BAR = bar jord; en stig är bar jord i en linje).
import { clampI } from './slump';
import { T, W, H, inMap } from './typer';

export interface Ground { tiles: Uint8Array; cover: Float32Array; trees: Float32Array; solid?: Uint8Array; built?: Uint8Array } // solid = väggar, built = byggda eller planerade rutor
export const HIGH = 0.9, BAR = 0.3; // högt gräs över HIGH, bar jord under BAR
export const FOREST = 0.5; // träd från detta värde räknas som skog
export const isSoil = (t: number) => t === T.Gras || t === T.Skog;
const BASE_SPEED = [0, 0.9, 1, 1, 0.8]; // Vatten, Sand, jord, jord, Sten
const SQ2 = Math.SQRT2;

// fart på en ruta: skog långsammast, högt gräs medel, kort gräs och stig snabbast
export function speedAt(g: Ground, i: number) {
  const t = g.tiles[i];
  if (!isSoil(t)) return BASE_SPEED[t];
  const tr = g.trees[i];
  if (tr >= FOREST) return 0.6;
  if (tr >= 0.15) return 0.75;
  return g.cover[i] >= HIGH ? 0.8 : 1;
}
// kostnad att gå in på en ruta: man följer hellre en upptrampad stig än går över orörd mark
const stepCost = (g: Ground, i: number) => (isSoil(g.tiles[i]) ? 0.45 + 0.55 * g.cover[i] : 1) / speedAt(g, i);

// vatten och väggar går man inte genom
const stop = (g: Ground, i: number) => g.tiles[i] === T.Vatten || g.solid?.[i] === 1;
// A* med 8 riktningar. Inte över vatten eller väggar och inte snett förbi en hörna. Start och mål får vara vatten.
// Ger rutorna mellan start och mål (utan båda), eller null om det inte finns någon väg.
export function findPath(g: Ground, x0: number, y0: number, x1: number, y1: number): number[] | null {
  const sx = clampI(x0, W), sy = clampI(y0, H), gx = clampI(x1, W), gy = clampI(y1, H);
  const start = sy * W + sx, goal = gy * W + gx;
  if (start === goal) return [];
  const N = W * H, tiles = g.tiles, solid = g.solid;
  const gs = new Float64Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = new Heap();
  gs[start] = 0; heap.push(start, 0);
  while (heap.size) {
    const i = heap.pop();
    if (i === goal) break;
    if (closed[i]) continue;
    closed[i] = 1;
    const x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!inMap(nx, ny)) continue;
      const ni = ny * W + nx;
      if (closed[ni] || ((tiles[ni] === T.Vatten || solid?.[ni]) && ni !== goal)) continue;
      if (dx && dy && (stop(g, y * W + nx) || stop(g, ny * W + x))) continue;
      const ng = gs[i] + (dx && dy ? SQ2 : 1) * (tiles[ni] === T.Vatten ? 1 : stepCost(g, ni));
      if (ng < gs[ni]) { gs[ni] = ng; came[ni] = i; heap.push(ni, ng + Math.hypot(nx - gx, ny - gy) * 0.52); }
    }
  }
  if (came[goal] < 0) return null;
  const out: number[] = [];
  for (let i = came[goal]; i !== start && i >= 0; i = came[i]) out.push(i);
  return out.reverse();
}

// en person går över rutan: högt gräs trampas ner direkt till kort gräs, sedan nöts det långsamt till bar jord.
// Små plantor trampas ihjäl.
export function wear(g: Ground, i: number, amount: number) {
  if (i < 0 || i >= g.cover.length || !isSoil(g.tiles[i])) return;
  const c = g.cover;
  c[i] = c[i] > 0.75 ? 0.75 : Math.max(0, c[i] - amount);
  if (g.trees[i] > 0 && g.trees[i] < FOREST) g.trees[i] = Math.max(0, g.trees[i] - amount * 4);
}

export function encodeCover(cover: Float32Array) {
  let bin = '';
  for (let i = 0; i < cover.length; i++) bin += String.fromCharCode(Math.round(cover[i] * 255));
  return btoa(bin);
}
export function decodeCover(txt: string | undefined, fill = 1): Float32Array {
  const c = new Float32Array(W * H).fill(fill);
  if (!txt) return c;
  try { const bin = atob(txt); for (let i = 0; i < Math.min(bin.length, c.length); i++) c[i] = bin.charCodeAt(i) / 255; } catch { /* ny mark */ }
  return c;
}

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
