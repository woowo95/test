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
import { Rekt, ledig, stationDef, stationerOf, storlekAv } from './stationer';
import { H, State, W, inMap } from './typer';

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
  key: number;
  inne: Uint8Array; // 1 för varje ruta innanför byn (index y * W + x)
  x0: number; y0: number; x1: number; y1: number; // den minsta rektangeln runt området (rutorna, båda kanterna med)
  holje: { x: number; y: number }[]; // hörnen i det konvexa höljet (rutornas mitt), moturs
  n: number; // antalet rutor innanför
  ut?: Float32Array; // hur många rutor utanför varje ruta ligger (0 innanför), räknas första gången någon frågar
  mitt: { x: number; y: number }; // områdets mitt: medelpunkten av rutorna innanför, avrundad till en ruta
}

const cache = new WeakMap<State, Omrade>();
// nyckeln: det som ändrar området. byggV ändras när något byggs, flyttas eller rivs; lagerplatserna växer utan det.
// Ett tal och ingen text, för frågorna ställs tusentals gånger i varje steg (avstånden till byn)
const blanda = (h: number, v: number) => Math.imul(h ^ v, 0x9e3779b1) + 0x7f4a7c15 | 0;
const nyckelAv = (s: State) => {
  const f = eldPlats(s);
  let h = blanda(blanda(blanda(s.seed, s.byggV ?? 0), f.x), f.y);
  h = blanda(blanda(blanda(h, stationerOf(s).length), housesOf(s).length), bitsOf(s).length);
  for (const z of zonesOf(s)) h = blanda(blanda(blanda(blanda(h, z.x), z.y), z.w), z.h);
  return h;
};
// Frågorna ställs tusentals gånger per slag: inom samma slag, utan att något byggts, räknas nyckeln inte om. En lagerplats som växer
// under slaget räknas in i nästa slag
const senast = new WeakMap<State, { now: number; v: number; o: Omrade }>();
export function omrade(s: State): Omrade {
  const m = senast.get(s), v = s.byggV ?? 0;
  if (m && m.now === s.now && m.v === v) return m.o;
  const key = nyckelAv(s), c = cache.get(s);
  const o = c && c.key === key ? c : rakna(key, Object.values(OMRADE_DELAR).flatMap(d => d.rutor(s)));
  if (o !== c) cache.set(s, o);
  senast.set(s, { now: s.now, v, o });
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
function rakna(key: number, r: Rekt[]): Omrade {
  const holje = holjeAv(r), k = OMRADE.kant, inne = new Uint8Array(W * H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
  const bx0 = Math.max(0, Math.min(...holje.map(p => p.x)) - k), bx1 = Math.min(W - 1, Math.max(...holje.map(p => p.x)) + k);
  const by0 = Math.max(0, Math.min(...holje.map(p => p.y)) - k), by1 = Math.min(H - 1, Math.max(...holje.map(p => p.y)) + k);
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    if (tillHolje(x, y, holje) > k + 0.5) continue; // rutans mitt högst en halv ruta utanför kanten
    inne[y * W + x] = 1; n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  let mx = 0, my = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inne[y * W + x]) { mx += x; my += y; }
  const mitt = n ? { x: Math.round(mx / n), y: Math.round(my / n) } : { x: holje[0]?.x ?? 0, y: holje[0]?.y ?? 0 };
  return { key, inne, x0, y0, x1, y1, holje, n, mitt };
}

// ---------- frågorna (steg 6.2.2, "Byns område (Frågorna)") ----------
// Alla system frågar området; inget räknas från elden, byns mitt eller lekplatsen, utom det som är elden själv

// ligger rutan (eller punkten) innanför byn?
export const iByn = (s: State, x: number, y: number) => { const i = Math.floor(y) * W + Math.floor(x); return inMap(Math.floor(x), Math.floor(y)) && omrade(s).inne[i] === 1; };
// hur många rutor utanför byn ligger rutan (0 innanför)? Avståndet från rutans mitt till höljet, minus kanten. För hela
// rutor ur ett rutnät som räknas en gång per område; en punkt mellan rutorna (någon som går) räknas för sig
export function utanforByn(s: State, x: number, y: number) {
  const o = omrade(s);
  if (Number.isInteger(x) && Number.isInteger(y) && inMap(x, y)) return utGrid(o)[y * W + x];
  if (inMap(Math.floor(x), Math.floor(y)) && o.inne[Math.floor(y) * W + Math.floor(x)]) return 0;
  return Math.max(0, tillHolje(x, y, o.holje) - OMRADE.kant);
}
// avståndet från punkten till det byn omsluter, utan kanten runt (0 innanför höljet): för det som ska stå en bit från
// det som redan står (ett nytt hus, en station ute), så att byn växer utåt i en ring
export const tillHoljet = (s: State, x: number, y: number) => tillHolje(x, y, omrade(s).holje);
// områdets mitt (en ruta): det som behöver en punkt att utgå från (kamerans hemknapp, lekplatsen, åt vilket håll fältet
// växer, var byn minns översvämningen). Den följer området, inte elden
export const bynsMitt = (s: State) => s.torg ? { x: s.torg.x + (s.torg.w >> 1), y: s.torg.y + (s.torg.h >> 1) } : omrade(s).mitt; // torget är byns centrum när det finns (steg 7.3.13)
// rutnätet till utanforByn, sparat med området; en kartslinga kan läsa det direkt (bynsAvstand(s)[i])
export const bynsAvstand = (s: State) => utGrid(omrade(s));
function utGrid(o: Omrade) {
  if (o.ut) return o.ut;
  const ut = new Float32Array(W * H), k = OMRADE.kant;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; ut[i] = o.inne[i] ? 0 : Math.max(0, tillHolje(x, y, o.holje) - k); }
  return (o.ut = ut);
}
// en fri ruta (ledig i stationer.ts, och ok om det anges) innanför byn eller högst max rutor utanför: den som ligger minst
// utanför, sedan närmast fran (om det anges), sedan den första i rutnätets ordning. Samma ruta varje gång (ingen slump)
export function friRuta(s: State, max = 0, ok?: (x: number, y: number) => boolean, fran?: { x: number; y: number }) {
  const o = omrade(s), ut = utGrid(o), r = Math.ceil(max) + 1;
  let best: { x: number; y: number } | undefined, bu = Infinity, bd = Infinity;
  for (let y = Math.max(0, o.y0 - r); y <= Math.min(H - 1, o.y1 + r); y++) for (let x = Math.max(0, o.x0 - r); x <= Math.min(W - 1, o.x1 + r); x++) {
    const u = ut[y * W + x];
    if (u > max || u > bu) continue;
    const d = fran ? Math.hypot(x - fran.x, y - fran.y) : 0;
    if (u === bu && d >= bd) continue;
    if (!ledig(s, x, y) || ok && !ok(x, y)) continue;
    best = { x, y }; bu = u; bd = d;
  }
  return best;
}
