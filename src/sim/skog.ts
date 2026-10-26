import { freeTools } from './agande';
import { campCenter, campDist } from './plats';
import { living, log, think } from './folk';
import { groundOf, isForest, tileOf } from './mark';
import { FOREST } from './vag';
import { pickNarmaste } from './slump';
import { Act, DAY, H, HOUR, MIN, Person, State, Stock, W } from './typer';
import { SNABBARE } from './handlingar';
import { minOf, wantsTool } from './redskap';
import { balans } from './balans';

// ---------- skog: fälla träd, hugga ved, flinta och yxa ----------
// Utan yxa kan invånarna bara samla grenar på marken. Med en flintyxa kan de fälla träd.
// Ett fällt träd blir en liggande stam som sedan huggs till ved, och då blir det grenar också.
// Balanstal (regel 8): vad ett träd ger, hur lång tid det tar att fälla, och vilket träd man väljer. Hur många yxor byn vill
// ha och hur många som får bygga står i REDSKAP (redskap.ts)
const SKOG = balans('skog', {
  stamVed: 8, // ett vuxet träd ger så här mycket trä ...
  stamGrenar: 5, // ... och så här många grenar
  fallTim: 1.2, // så många timmar tar det att fälla ett träd (48 minuter sedan steg 1.5.13, då arbetet blev SNABBARE)
  fallMin: 0.5, // ett litet träd fälls fortare, men aldrig på mindre än så här stor del av tiden
  stubbeDygn: 8, // en stubbe ruttnar bort efter så här många dygn (år i spelet)
  tradMin: 0.95, // ett träd att fälla är minst så här stort (0 till 1) ...
  sokX: 24, // ... och står högst så här många rutor åt sidorna från lägret ...
  sokY: 18, // ... och så här många uppåt och nedåt
  urval: 5, // man väljer slumpat bland de så här många närmaste träden
  forstaTanke: 0.1, // den som fäller byns första träd mår så här mycket bättre i forstaTankeTim timmar
  forstaTankeTim: 12,
});
export const stocks = (s: State) => (s.stockar ??= []);
const FALL_TID = SKOG.fallTim * HOUR / SNABBARE; // så lång tid det tar att fälla ett träd
// hur lång tid det tar att fälla trädet på ruta i: ett litet träd fälls fortare
export const fallTid = (s: State, i: number) => FALL_TID * Math.max(SKOG.fallMin, groundOf(s).trees[i]);

// rutorna där någon annan än utom håller på att fälla ett träd
export const fellingTiles = (s: State, utom: Person) => new Set(living(s).filter(q => q !== utom && q.task?.act === 'falla').map(q => tileOf(q.task!.tx, q.task!.ty)));
// närmaste vuxna träd att fälla, helst i skogskanten nära byn (p väljer med sin egen slumpföljd)
export function treeSpot(s: State, taken: Set<number>, p: Person): { x: number; y: number } | undefined {
  const g = groundOf(s), f = campCenter(s);
  // först träden där ett hus ska stå: de måste bort ändå, och stockarna blir husets väggar
  let site = -1, sd = Infinity;
  if (g.built) for (let i = 0; i < W * H; i++) if (g.built[i] && g.trees[i] >= FOREST && !taken.has(i)) { const d = campDist(s, i % W, Math.floor(i / W)); if (d < sd) { sd = d; site = i; } }
  if (site >= 0) return { x: (site % W) + 0.5, y: Math.floor(site / W) + 0.5 };
  // sedan ett träd som någon har börjat fälla (paborjat.ts): det närmaste
  let half = -1, hd = Infinity;
  for (const k in s.halvfallt ?? {}) { const i = +k, d = campDist(s, i % W, Math.floor(i / W)); if (isForest(s, i) && !taken.has(i) && d < hd) { hd = d; half = i; } }
  if (half >= 0) return { x: (half % W) + 0.5, y: Math.floor(half / W) + 0.5 };
  const c: { i: number; d: number }[] = [];
  for (let y = Math.max(0, f.y - SKOG.sokY); y < Math.min(H, f.y + SKOG.sokY + 1); y++) for (let x = Math.max(0, f.x - SKOG.sokX); x < Math.min(W, f.x + SKOG.sokX + 1); x++) {
    const i = y * W + x;
    if (g.trees[i] < SKOG.tradMin || taken.has(i)) continue;
    c.push({ i, d: campDist(s, x, y) });
  }
  if (!c.length) return undefined;
  c.sort((a, b) => a.d - b.d);
  const i = pickNarmaste(s, c, SKOG.urval, 'val', p).i;
  return { x: (i % W) + 0.5, y: Math.floor(i / W) + 0.5 };
}
const nearestStock = (s: State) => {
  const b = groundOf(s).built, onSite = (k: Stock) => b?.[tileOf(k.x, k.y)] ? 0 : 1; // stammarna där huset ska stå först
  return stocks(s).filter(k => k.ved > 0).sort((a, c) => onSite(a) - onSite(c) || campDist(s, a.x, a.y) - campDist(s, c.x, c.y))[0];
};

// trädet faller: det blir en liggande stam, och där det stod växer högt gräs
export function fellTree(s: State, p: Person, x: number, y: number) {
  const g = groundOf(s), i = tileOf(x, y);
  if (!isForest(s, i)) return;
  const size = g.trees[i];
  g.trees[i] = 0; g.cover[i] = 1;
  if (s.halvfallt) delete s.halvfallt[i];
  const k: Stock = { id: (s.nextStock = (s.nextStock ?? 0) + 1), x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, ved: Math.round(SKOG.stamVed * size), grenar: Math.round(SKOG.stamGrenar * size) };
  stocks(s).push(k);
  if (!groundOf(s).built?.[i]) (s.stubbar ??= []).push({ x: Math.floor(x), y: Math.floor(y), t: s.now }); // där ett hus ska stå grävs stubben upp
  s.fallda = (s.fallda ?? 0) + 1;
  if (s.fallda === 1) {
    log(s, `${p.name} fällde byns första träd med flintyxan.`, 'world', [p.id]);
    p.fame.push('Fällde byns första träd');
    think(p, 'Fällde ett träd', SKOG.forstaTanke, s.now, SKOG.forstaTankeTim * HOUR);
  }
  return k;
}
// en stubbe står kvar efter trädet och ruttnar sakta bort
export const STUBBE_LIV = SKOG.stubbeDygn * DAY;
export function rotStumps(s: State) {
  if (s.stubbar?.length) s.stubbar = s.stubbar.filter(k => s.now - k.t < STUBBE_LIV);
}
// hugg ut ved och grenar ur en stam; ger det som blev, och tar bort stammen när den är slut
export function chopStock(s: State, ref: number | undefined, amount: number) {
  const k = stocks(s).find(q => q.id === ref);
  if (!k) return undefined;
  const ved = Math.min(k.ved, amount), gr = Math.min(k.grenar, ved * SKOG.stamGrenar / SKOG.stamVed);
  k.ved -= ved; k.grenar -= gr;
  if (k.ved <= 1e-6) { k.grenar = 0; s.stockar = stocks(s).filter(q => q !== k); }
  return { ved, grenar: gr, done: k.ved <= 1e-6 };
}

// en vuxen som ska skaffa ved: hugga en fälld stam, fälla ett träd, göra en yxa eller (annars) samla grenar
// kyla: kylan är en fara (dangers i val.ts). Då görs ingen ny yxa, för ett nytt redskap är en förbättring
export function axeTask(s: State, p: Person, kyla = false): { act: Act; x: number; y: number; ref?: number; dur?: number; why: string } | undefined {
  if (freeTools(s, p, 'yxa') > 0) { // en yxa som ingen annan fäller eller hugger med
    const k = nearestStock(s);
    if (k) return { act: 'hugga', x: k.x + 0.3, y: k.y + 0.2, ref: k.id, why: 'Hugger trä av en fälld stam' };
    const t = treeSpot(s, fellingTiles(s, p), p);
    if (t) return { act: 'falla', x: t.x, y: t.y, dur: fallTid(s, tileOf(t.x, t.y)), why: 'Har en yxa och fäller ett träd till trä' };
  }
  if (!kyla && wantsTool(s, p, 'yxa')) { // receptet och hur många byn vill ha: saker.ts och redskap.ts
    return { act: 'yxa', x: 0, y: 0, dur: minOf('yxa') * MIN, why: 'Har flinta och vill göra en yxa för att kunna fälla träd' };
  }
  return undefined;
}
