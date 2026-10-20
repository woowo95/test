import { getMap } from './karta';
import { H, HOUR, State, W } from './typer';
import { decodeCover, pathTree, wear } from './vag';

// ---------- mark och stigar ----------
const covers = new WeakMap<State, Float32Array>();
export function coverOf(s: State) {
  let c = covers.get(s);
  if (!c) { c = decodeCover(s.mark); covers.set(s, c); }
  return c;
}
export const GROW = [0.1, 1.2, 1, 0.6]; // grästillväxt per tidsålder
export const WEAR = 0.008; // slitage när någon går över en ruta
export const tileOf = (x: number, y: number) => Math.max(0, Math.min(H - 1, Math.floor(y))) * W + Math.max(0, Math.min(W - 1, Math.floor(x)));
let tree: { key: string; came: Int32Array } | undefined;
// vid ikappräkning går ingen på riktigt: slitaget läggs längs bästa vägen mellan elden och målet
export function tread(s: State, tx: number, ty: number, trips: number) {
  const m = getMap(s.seed), cov = coverOf(s), key = `${s.seed}:${Math.floor(s.now / (4 * HOUR))}`;
  if (tree?.key !== key) tree = { key, came: pathTree(m.tiles, cov, m.fire.x, m.fire.y) };
  for (let i = tileOf(tx, ty), n = 0; i >= 0 && n < 200; i = tree.came[i], n++) wear(m.tiles, cov, i, WEAR * trips);
}
