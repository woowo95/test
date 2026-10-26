import { getMap } from './karta';
import { H, State, W, inMap } from './typer';
import { balans } from './balans';

// Balanstalen (regel 8): hur långt folk går från lägret, vad avståndet kostar och när en plats är tömd
export const PLATS = balans('plats', {
  dagX: 17, // en halv dags gång från lägret: så många rutor åt sidorna (arbetsplatser, det byn känner till bortom närområdet och det den ser från lägret)
  dagY: 13, // ... och så många uppåt och nedåt
  avstandPris: 0.03, // en plats är så mycket mindre värd (i värdet av en rik plats) för varje ruta från lägret
  toppProspekt: 10, // byns närområde räknas som snittet av så många av de bästa platserna (fynd.ts)
  toppArea: 5, // ett område räknas som snittet av så många av de bästa rutorna (minne.ts)
  tomtGrans: 0.08, // en plats som ger mindre än så (rikedom, richness) är tömd: man går därifrån (steg.ts)
});

// Byns läger är inte bara elden: det är elden och lagerplatserna, och senare fler eldar och byggnader.
// "Nära byn" mäts till den närmaste av dem, och byns mitt är medelpunkten av dem.
// Koordinater i rutor, som kartans eld (rutans hörn).
const NONE: NonNullable<State['lagren']> = [];
const zonesIn = (s: State) => s.lagren ?? NONE;

// avståndet från en ruta till närmaste del av lägret (0 inne i en lagerplats)
export function campDist(s: State, x: number, y: number) {
  if (Number.isInteger(x) && Number.isInteger(y) && inMap(x, y)) return campGrid(s)[y * W + x];
  return distTo(s, x, y);
}
// Avståndet frågas efter tusentals gånger i varje steg, så det räknas för alla rutor på en gång och sparas
// tills lägret ändras (en lagerplats blir större, mindre eller ny). En kartslinga kan läsa rutnätet direkt
// (campGrid(s)[i] för rutan med index i).
type Grid = { seed: number; geo: number[]; d: Float64Array };
const grids = new WeakMap<State, Grid>();
export function campGrid(s: State) {
  const zs = zonesIn(s);
  let c = grids.get(s);
  if (!c || !sammaForm(c, s.seed, zs)) {
    const d = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = distTo(s, i % W, Math.floor(i / W));
    c = { seed: s.seed, geo: zs.flatMap(z => [z.x, z.y, z.w, z.h]), d };
    grids.set(s, c);
  }
  return c.d;
}
// har lägret samma form som när rutnätet räknades?
function sammaForm(c: Grid, seed: number, zs: NonNullable<State['lagren']>) {
  if (c.seed !== seed || c.geo.length !== zs.length * 4) return false;
  for (let i = 0; i < zs.length; i++) {
    const z = zs[i], g = c.geo;
    if (g[i * 4] !== z.x || g[i * 4 + 1] !== z.y || g[i * 4 + 2] !== z.w || g[i * 4 + 3] !== z.h) return false;
  }
  return true;
}
function distTo(s: State, x: number, y: number) {
  const f = getMap(s.seed).fire;
  let d = Math.hypot(x - f.x, y - f.y);
  for (const z of zonesIn(s)) d = Math.min(d, rektAvstand(x, y, z.x, z.y, z.w, z.h));
  return d;
}
// avståndet från en ruta (px, py) till närmaste ruta i rektangeln med hörnet (rx, ry) och måtten rw×rh (0 inne i den)
export const rektAvstand = (px: number, py: number, rx: number, ry: number, rw: number, rh: number) =>
  Math.hypot(Math.max(rx - px, 0, px - (rx + rw - 1)), Math.max(ry - py, 0, py - (ry + rh - 1)));
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
