import { FYND, fyndAt } from './fynd';
import { hash } from './karta';
import { living } from './folk';
import { H, HOUR, SEC, State, W, mapKey } from './typer';

// ---------- djur: enskilda kaniner ----------
// Kaninerna syns där viltlagret (fynd.ts) har något just nu: fler där det finns mycket, inga där jakten tömt platsen
// eller där viltet skyr lägret. De räknas fram ur lagret och klockan, så att de är desamma i snabbläget och det levande
// läget och inget behöver sparas. En kanin håller till på sin ruta ett par timmar. Där sitter den still en stund och
// skuttar sedan en bit, och den hoppar undan när någon kommer nära. Jägaren går mot den närmaste kaninen (steg.ts).
// Fler arter (rådjur, fågel) blir egna lager med egna djur senare.
export interface Djur { id: number; art: 'kanin'; x: number; y: number }
const TATHET = 0.06; // kaniner per ruta där lagret är fullt
const SKIFT = 2 * HOUR; // så länge en kanin håller till på samma ruta
const SKUTT = 9 * SEC; // så ofta den skuttar, ungefär
const RADD = 2.2; // så nära en människa kommer innan den hoppar undan

interface Plats { id: number; i: number }
const cache = new WeakMap<State, { key: string; at: Plats[] }>();
// vilka rutor som har en kanin just nu (räknas om varannan timme)
function platser(s: State): Plats[] {
  const slot = Math.floor(s.now / SKIFT), key = `${mapKey(s.seed)},${slot}`, c = cache.get(s);
  if (c && c.key === key) return c.at;
  const at: Plats[] = [], topp = FYND.jakt.topp;
  for (let i = 0; i < W * H; i++) {
    const v = fyndAt(s, 'jakt', i) / topp;
    if (v > 0.05 && hash(s.seed + slot * 7919, i, 31) < TATHET * Math.min(1.3, v)) at.push({ id: slot * W * H + i, i });
  }
  cache.set(s, { key, at });
  return at;
}
// var kaninerna är just nu: ett skutt i taget inom rutan och lite utanför, och undan från folk som är nära
export function djurOf(s: State): Djur[] {
  const ppl = living(s), out: Djur[] = [];
  for (const pl of platser(s)) {
    const cx = (pl.i % W) + 0.5, cy = Math.floor(pl.i / W) + 0.5;
    const t = s.now / SKUTT + hash(pl.id, 3, 5) * 10, k = Math.floor(t), f = t - k;
    const at = (n: number) => ({ x: cx + (hash(pl.id, n, 1) - 0.5) * 1.6, y: cy + (hash(pl.id, n, 2) - 0.5) * 1.6 });
    const a = at(k), b = at(k + 1), hop = f > 0.85 ? (f - 0.85) / 0.15 : 0; // sitter still, sedan ett snabbt skutt
    let x = a.x + (b.x - a.x) * hop, y = a.y + (b.y - a.y) * hop;
    for (const p of ppl) {
      const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
      if (d < RADD && d > 1e-3) { x += dx / d * (RADD - d); y += dy / d * (RADD - d); }
    }
    out.push({ id: pl.id, art: 'kanin', x: Math.max(0.2, Math.min(W - 0.2, x)), y: Math.max(0.2, Math.min(H - 0.2, y)) });
  }
  return out;
}
// den närmaste kaninen inom r rutor
export function nearestDjur(s: State, x: number, y: number, r: number) {
  let best: Djur | undefined, bd = r;
  for (const d of djurOf(s)) { const e = Math.hypot(d.x - x, d.y - y); if (e < bd) { bd = e; best = d; } }
  return best;
}
