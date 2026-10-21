import { getMap } from './karta';
import { H, State, W, inMap } from './typer';

// Byns läger är inte bara elden: det är elden och lagerplatserna, och senare fler eldar och byggnader.
// "Nära byn" mäts till den närmaste av dem, och byns mitt är medelpunkten av dem.
// Koordinater i rutor, som kartans eld (rutans hörn).
const NONE: NonNullable<State['lagren']> = [];
const zonesIn = (s: State) => s.lagren ?? NONE;

// avståndet från en ruta till närmaste del av lägret (0 inne i en lagerplats)
export function campDist(s: State, x: number, y: number) {
  if (Number.isInteger(x) && Number.isInteger(y) && inMap(x, y)) return distGrid(s)[y * W + x];
  return distTo(s, x, y);
}
// Avståndet frågas efter tusentals gånger i varje steg, så det räknas för alla rutor på en gång och sparas
// tills lägret ändras (en lagerplats blir större, mindre eller ny).
const grids = new WeakMap<State, { seed: number; geo: number[]; d: Float64Array }>();
function distGrid(s: State) {
  const zs = zonesIn(s);
  let c = grids.get(s);
  if (!c || c.seed !== s.seed || c.geo.length !== zs.length * 4 || zs.some((z, i) => c!.geo[i * 4] !== z.x || c!.geo[i * 4 + 1] !== z.y || c!.geo[i * 4 + 2] !== z.w || c!.geo[i * 4 + 3] !== z.h)) {
    const d = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = distTo(s, i % W, Math.floor(i / W));
    c = { seed: s.seed, geo: zs.flatMap(z => [z.x, z.y, z.w, z.h]), d };
    grids.set(s, c);
  }
  return c.d;
}
function distTo(s: State, x: number, y: number) {
  const f = getMap(s.seed).fire;
  let d = Math.hypot(x - f.x, y - f.y);
  for (const z of zonesIn(s)) {
    const dx = Math.max(z.x - x, 0, x - (z.x + z.w - 1)), dy = Math.max(z.y - y, 0, y - (z.y + z.h - 1));
    d = Math.min(d, Math.hypot(dx, dy));
  }
  return d;
}
// lägrets form som text: för det som räknas en gång och sparas tills lägret ändras
export const campKey = (s: State) => `${s.seed}:${zonesIn(s).map(z => `${z.x},${z.y},${z.w},${z.h}`).join(';')}`;
// byns mitt: elden väger lika mycket som alla lagerplatser tillsammans
export function campCenter(s: State) {
  const f = getMap(s.seed).fire, zs = zonesIn(s);
  if (!zs.length) return { x: f.x, y: f.y };
  let x = 0, y = 0;
  for (const z of zs) { x += z.x + (z.w - 1) / 2; y += z.y + (z.h - 1) / 2; }
  return { x: Math.round((f.x + x / zs.length) / 2), y: Math.round((f.y + y / zs.length) / 2) };
}
