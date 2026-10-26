import { addTool, freeTools, halvOf, nTools } from './agande';
import { campCenter, campDist } from './plats';
import { ageOf, count, living, log, think } from './folk';
import { groundOf, isForest, tileOf } from './mark';
import { FOREST } from './vag';
import { sedEvent } from './seder';
import { knows } from './teknik';
import { clamp, pickNarmaste } from './slump';
import { Act, DAY, H, HOUR, MIN, Person, State, Stock, W } from './typer';
import { getable } from './behov';
import { SNABBARE } from './handlingar';
import { minOf } from './redskap';

// ---------- skog: fälla träd, hugga ved, flinta och yxa ----------
// Utan yxa kan invånarna bara samla grenar på marken. Med en flintyxa kan de fälla träd.
// Ett fällt träd blir en liggande stam som sedan huggs till ved, och då blir det grenar också.
const STAM = { ved: 8, grenar: 5 }; // vad ett vuxet träd ger
const axes = (s: State) => nTools(s, 'yxa'); // en sliten yxa är fortfarande en yxa
export const stocks = (s: State) => (s.stockar ??= []);
const FALL_TID = 1.2 * HOUR / SNABBARE; // så lång tid det tar att fälla ett träd (48 minuter sedan steg 1.5.13)
// hur lång tid det tar att fälla trädet på ruta i: ett litet träd fälls fortare
export const fallTid = (s: State, i: number) => FALL_TID * Math.max(0.5, groundOf(s).trees[i]);

// rutorna där någon annan än utom håller på att fälla ett träd
export const fellingTiles = (s: State, utom: Person) => new Set(living(s).filter(q => q !== utom && q.task?.act === 'falla').map(q => tileOf(q.task!.tx, q.task!.ty)));
// närmaste vuxna träd att fälla, helst i skogskanten nära byn
export function treeSpot(s: State, taken: Set<number>): { x: number; y: number } | undefined {
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
  for (let y = Math.max(0, f.y - 18); y < Math.min(H, f.y + 19); y++) for (let x = Math.max(0, f.x - 24); x < Math.min(W, f.x + 25); x++) {
    const i = y * W + x;
    if (g.trees[i] < 0.95 || taken.has(i)) continue;
    c.push({ i, d: campDist(s, x, y) });
  }
  if (!c.length) return undefined;
  c.sort((a, b) => a.d - b.d);
  const i = pickNarmaste(s, c, 5, 'val').i;
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
  const k: Stock = { id: (s.nextStock = (s.nextStock ?? 0) + 1), x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, ved: Math.round(STAM.ved * size), grenar: Math.round(STAM.grenar * size) };
  stocks(s).push(k);
  if (!groundOf(s).built?.[i]) (s.stubbar ??= []).push({ x: Math.floor(x), y: Math.floor(y), t: s.now }); // där ett hus ska stå grävs stubben upp
  s.fallda = (s.fallda ?? 0) + 1;
  if (s.fallda === 1) {
    log(s, `${p.name} fällde byns första träd med flintyxan.`, 'world', [p.id]);
    p.fame.push('Fällde byns första träd');
    think(p, 'Fällde ett träd', 0.1, s.now, 12 * HOUR);
  }
  return k;
}
// en stubbe står kvar efter trädet och ruttnar sakta bort
export const STUBBE_LIV = 8 * DAY;
export function rotStumps(s: State) {
  if (s.stubbar?.length) s.stubbar = s.stubbar.filter(k => s.now - k.t < STUBBE_LIV);
}
// hugg ut ved och grenar ur en stam; ger det som blev, och tar bort stammen när den är slut
export function chopStock(s: State, ref: number | undefined, amount: number) {
  const k = stocks(s).find(q => q.id === ref);
  if (!k) return undefined;
  const ved = Math.min(k.ved, amount), gr = Math.min(k.grenar, ved * STAM.grenar / STAM.ved);
  k.ved -= ved; k.grenar -= gr;
  if (k.ved <= 1e-6) { k.grenar = 0; s.stockar = stocks(s).filter(q => q !== k); }
  return { ved, grenar: gr, done: k.ved <= 1e-6 };
}

// hur många yxor byn vill ha (en till medan ett hus byggs, för träden där det ska stå)
const axesWanted = (adults: number) => clamp(Math.floor(adults / 4), 1, 3);
// en flinta sparas att tända eld med
export const canMakeAxe = (s: State, p: Person) => getable(s, p, 'flinta') >= 2 && getable(s, p, 'grenar') >= 1; // materialet i behovsstegen (behov.ts)
// yxan är klar (materialet togs när arbetet började, paborjat.ts)
export function axeDone(s: State, p: Person) {
  addTool(s, 'yxa', p);
  if (axes(s) === 1 && !s.stat?.yxa1) {
    count(s, 'yxa1');
    log(s, `${p.name} gjorde byns första yxa av en pinne och en flintsten. Nu kan byn fälla träd.`, 'world', [p.id]);
    p.fame.push('Gjorde byns första yxa');
    sedEvent(s, 'nyfikenhet', 0.08, 'Flintyxan har gjort byn nyfiken på vad mer som går att tillverka.');
  } else log(s, `${p.name} gjorde en flintyxa.`, 'world', [p.id]);
}

// en vuxen som ska skaffa ved: hugga en fälld stam, fälla ett träd, göra en yxa eller (annars) samla grenar
export function axeTask(s: State, p: Person): { act: Act; x: number; y: number; ref?: number; dur?: number; why: string } | undefined {
  const ppl = living(s), others = ppl.filter(q => q !== p);
  if (freeTools(s, p, 'yxa') > 0) { // en yxa som ingen annan fäller eller hugger med
    const k = nearestStock(s);
    if (k) return { act: 'hugga', x: k.x + 0.3, y: k.y + 0.2, ref: k.id, why: 'Hugger trä av en fälld stam' };
    const t = treeSpot(s, fellingTiles(s, p));
    if (t) return { act: 'falla', x: t.x, y: t.y, dur: fallTid(s, tileOf(t.x, t.y)), why: 'Har en yxa och fäller ett träd till trä' };
  }
  const adults = ppl.filter(q => ageOf(q, s.now) >= 16).length;
  if ((halvOf(s, p, ['yxa']) || knows(p, 'yxa') && canMakeAxe(s, p)) && axes(s) < axesWanted(adults) + (s.hus?.some(h => !h.klar) ? 1 : 0) && !others.some(q => q.task?.act === 'yxa')) {
    return { act: 'yxa', x: 0, y: 0, dur: minOf('yxa') * MIN, why: 'Har flinta och vill göra en yxa för att kunna fälla träd' };
  }
  return undefined;
}
