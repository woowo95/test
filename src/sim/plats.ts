import { getMap } from './karta';
import { State } from './typer';

// Byns läger är inte bara elden: det är elden och lagerplatserna, och senare fler eldar och byggnader.
// "Nära byn" mäts till den närmaste av dem, och byns mitt är medelpunkten av dem.
// Koordinater i rutor, som kartans eld (rutans hörn).
const zonesIn = (s: State) => s.lagren ?? [];

// avståndet från en ruta till närmaste del av lägret (0 inne i en lagerplats)
export function campDist(s: State, x: number, y: number) {
  const f = getMap(s.seed).fire;
  let d = Math.hypot(x - f.x, y - f.y);
  for (const z of zonesIn(s)) {
    const dx = Math.max(z.x - x, 0, x - (z.x + z.w - 1)), dy = Math.max(z.y - y, 0, y - (z.y + z.h - 1));
    d = Math.min(d, Math.hypot(dx, dy));
  }
  return d;
}
// byns mitt: elden väger lika mycket som alla lagerplatser tillsammans
export function campCenter(s: State) {
  const f = getMap(s.seed).fire, zs = zonesIn(s);
  if (!zs.length) return { x: f.x, y: f.y };
  let x = 0, y = 0;
  for (const z of zs) { x += z.x + (z.w - 1) / 2; y += z.y + (z.h - 1) / 2; }
  return { x: Math.round((f.x + x / zs.length) / 2), y: Math.round((f.y + y / zs.length) / 2) };
}
