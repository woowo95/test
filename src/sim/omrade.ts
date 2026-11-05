// Byns område (steg 6.2.1, "Byns område" i designdokumentet): det som byns byggnader, möbler, stationer, lagerplatser,
// förrådshus och eldar tillsammans omsluter, plus OMRADE.kant rutor runt om. Latrinen, slaktbänken och fälten räknas inte.
// Elden räknas som en byggnad, så att byn första dygnet (första året i spelet) är elden och kanten runt den.
// Det som räknas står i registret OMRADE_DELAR: en rad per slag, som ger sina rektanglar. Området är det konvexa höljet
// av alla rektanglarna (det de omsluter) och rutorna högst kant från det. Det räknas om när något byggs, flyttas eller
// rivs (s.byggV, elden, lagerplatserna och stationerna), och sparas per by tills dess (regel 4).
import { balans } from './balans';
import { bitsOf, housesOf } from './byggnad';
import { eldPlats } from './karta';
import { zonesOf } from './lager';
import { Rekt, stationDef, stationerOf, storlekAv } from './stationer';
import { H, State, W } from './typer';

export const OMRADE = balans('omrade', {
  kant: 2, // så många rutor runt det byn omsluter hör till området
});

// registret: det som räknas till byns område, och rektanglarna det står på
export const OMRADE_DELAR: Record<string, { namn: string; rutor: (s: State) => Rekt[] }> = {
  eld: { namn: 'elden', rutor: s => { const f = eldPlats(s); return [{ x: f.x, y: f.y, w: 1, h: 1 }]; } },
  hus: { namn: 'husen och förrådshusen', rutor: s => housesOf(s).map(h => ({ x: h.x, y: h.y, w: h.w, h: h.h })) },
  bygge: { namn: 'väggar och golv som byggs', rutor: s => bitsOf(s).filter(b => b.hus === undefined).map(b => ({ x: b.x, y: b.y, w: 1, h: 1 })) },
  lager: { namn: 'lagerplatserna', rutor: s => zonesOf(s).map(z => ({ x: z.x, y: z.y, w: z.w, h: z.h })) },
  station: { namn: 'stationerna, möblerna och eldarna', rutor: s => stationerOf(s).filter(t => !stationDef(t.k)?.utkant).map(t => ({ x: t.x, y: t.y, ...storlekAv(t) })) },
};

export interface Omrade {
  key: string;
  inne: Uint8Array; // 1 för varje ruta innanför byn (index y * W + x)
  x0: number; y0: number; x1: number; y1: number; // den minsta rektangeln runt området (rutorna, båda kanterna med)
  holje: { x: number; y: number }[]; // hörnen i det konvexa höljet (rutornas mitt), moturs
  n: number; // antalet rutor innanför
}

const cache = new WeakMap<State, Omrade>();
// nyckeln: det som ändrar området. byggV ändras när något byggs, flyttas eller rivs; lagerplatserna växer utan det
const nyckelAv = (s: State) => {
  const f = eldPlats(s);
  return `${s.seed}:${s.byggV ?? 0}:${f.x},${f.y}:${stationerOf(s).length}:${housesOf(s).length}:${bitsOf(s).length}:${zonesOf(s).map(z => `${z.x},${z.y},${z.w},${z.h}`).join(';')}`;
};
export function omrade(s: State): Omrade {
  const key = nyckelAv(s), c = cache.get(s);
  if (c && c.key === key) return c;
  const o = rakna(key, Object.values(OMRADE_DELAR).flatMap(d => d.rutor(s)));
  cache.set(s, o);
  return o;
}

type P = { x: number; y: number };
// höljet av alla rektanglarnas hörnrutor (Andrews monotona kedja), moturs; en eller två punkter om de ligger på en linje
function holjeAv(r: Rekt[]) {
  const pts = new Map<string, P>();
  for (const q of r) for (const [x, y] of [[q.x, q.y], [q.x + q.w - 1, q.y], [q.x, q.y + q.h - 1], [q.x + q.w - 1, q.y + q.h - 1]]) pts.set(`${x},${y}`, { x, y });
  const p = [...pts.values()].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const kors = (o: P, a: P, b: P) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const ner: P[] = [], upp: P[] = [];
  for (const q of p) { while (ner.length >= 2 && kors(ner[ner.length - 2], ner[ner.length - 1], q) <= 0) ner.pop(); ner.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upp.length >= 2 && kors(upp[upp.length - 2], upp[upp.length - 1], q) <= 0) upp.pop(); upp.push(q); }
  return ner.slice(0, -1).concat(upp.slice(0, -1));
}
// avståndet från punkten till sträckan a–b
function tillStracka(x: number, y: number, a: P, b: P) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0;
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
// avståndet från punkten till det fyllda höljet (0 innanför)
export function tillHolje(x: number, y: number, h: P[]) {
  if (h.length >= 3) {
    let inne = true;
    for (let i = 0; i < h.length && inne; i++) { const a = h[i], b = h[(i + 1) % h.length]; if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) inne = false; }
    if (inne) return 0;
  }
  let d = Infinity;
  for (let i = 0; i < h.length; i++) d = Math.min(d, tillStracka(x, y, h[i], h[(i + 1) % h.length]));
  return d;
}
function rakna(key: string, r: Rekt[]): Omrade {
  const holje = holjeAv(r), k = OMRADE.kant, inne = new Uint8Array(W * H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  const bx0 = Math.max(0, Math.min(...holje.map(p => p.x)) - k), bx1 = Math.min(W - 1, Math.max(...holje.map(p => p.x)) + k);
  const by0 = Math.max(0, Math.min(...holje.map(p => p.y)) - k), by1 = Math.min(H - 1, Math.max(...holje.map(p => p.y)) + k);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (tillHolje(x, y, holje) > k + 0.5) continue; // rutans mitt högst en halv ruta utanför kanten
    inne[y * W + x] = 1; n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { key, inne, x0, y0, x1, y1, holje, n };
}
