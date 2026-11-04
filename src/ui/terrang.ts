import { BRAND, DAY, H, HOUR, T, W, ageIndex, emberOn, fireHeat, eldXY, eldarOf, groundOf, isCm, lightLevel } from '../sim';
import { s } from './lage';
import { TS, mork, terrainG, world } from './scen';
import { stallNatt } from './natt';
import { markLayer, ritaMark, stallMark } from './mark';
import { stallTrad, tradLayer } from './trad';

// marken (steg 5.1.3.1): gräs, vatten, strand, stigar, sten, lera, aska och snö ritas i pixlar i ui/mark.ts. Här bestäms
// när: hela marken när tidsåldern, isen, vattnet eller byn byts, annars bara de rutor som ändrats (stigarna, skogen, askan).
// Träden är granar i pixlar (steg 5.1.3.2, ui/trad.ts), ovanpå marken och sorterade söderut.
mork.addChildAt(markLayer, mork.getChildIndex(terrainG));
mork.addChildAt(tradLayer, mork.getChildIndex(terrainG) + 1);
// isen på sjön (steg 2.11.3, sim/is.ts): 0 = öppet vatten, 1 = tunn is (under 5 cm), 2 = tjock is
const isNiva = () => { const cm = isCm(s); return cm <= 0 ? 0 : cm < 5 ? 1 : 2; };
let drawnSig = -1, lastSigCheck = 0, lastDraw = -Infinity, drawnNyckel = '';
// marken kollas högst en gång i sekunden (datorns tid): när man snabbspolar ändras den nästan varje bildruta (steg 3.10.4)
export const OMRITA_MS = 1000;
// trädens storlek i fyra steg: 0 = inga, 1–2 = plantor, 3 = skog
const treeLevel = (v: number) => v >= 0.5 ? 3 : v >= 0.25 ? 2 : v > 0 ? 1 : 0;
function coverSig() {
  const g = groundOf(s); let h = 0;
  for (let i = 0; i < g.cover.length; i++) h = (Math.imul(h, 31) + Math.floor((1 - g.cover[i]) * 16) * 4 + treeLevel(g.trees[i])) | 0;
  return h;
}
// färgen mellan a (f = 0) och b (f = 1)
export function mix(a: number, b: number, f: number) {
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const jord = (t: number) => t === T.Gras || t === T.Skog;
export function drawTerrain(force = false) {
  const ai = ageIndex(s), now = performance.now();
  let sig = drawnSig;
  if (force || now - lastSigCheck > OMRITA_MS) { lastSigCheck = now; sig = coverSig(); }
  const is = isNiva();
  const vat = (s.sjoTorr?.v ?? -1) * 4 + (s.flod?.niva ?? 0); // torkan och översvämningen: vattnet som det är nu (steg 3.8.2, 3.8.3)
  const ask = s.aska?.length ? s.aska.length * 1000 + Math.floor(s.now / (6 * HOUR)) % 1000 : 0; // det svarta efter en eldsvåda bleknar (steg 3.8.5)
  const nyckel = `${s.seed}|${ai}|${is}|${vat}|${ask}`;
  if (force || (sig !== drawnSig || nyckel !== drawnNyckel) && now - lastDraw >= OMRITA_MS) {
    lastDraw = now; drawnSig = sig; drawnNyckel = nyckel;
    const g = groundOf(s);
    // marken som brann nyss: mörk, och ljusare ju längre sedan (BRAND.svart dygn)
    let svart: Map<number, number> | undefined;
    for (const [i, t] of s.aska ?? []) (svart ??= new Map()).set(i, Math.max(0, 0.75 * (1 - (s.now - t) / (BRAND.svart * DAY))));
    stallMark({ W, H, tiles: g.tiles, cover: g.cover, trees: g.trees, vatten: T.Vatten, sand: T.Sand, sten: T.Sten, lera: T.Lera, jord }, ai, ai === 0 ? is : 0, `${s.seed}|${vat}`, svart);
    ritaTrad(g, ai);
  }
  ritaMark(6, force);
}
// träden: en gran per ruta med skog, plantor som små granar, och unga granar i den orörda skogskanten
function ritaTrad(g: ReturnType<typeof groundOf>, ai: number) {
  const tr = (i: number) => jord(g.tiles[i]) ? g.trees[i] : 0;
  const skog = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && tr(y * W + x) >= 0.5;
  const kant = (i: number) => {
    if (!jord(g.tiles[i]) || g.cover[i] < 0.85) return false;
    const x = i % W, y = (i / W) | 0;
    return skog(x - 1, y) || skog(x + 1, y) || skog(x, y - 1) || skog(x, y + 1);
  };
  stallTrad(W, H, tr, kant, ai === 0);
}
// mörkret och eldens sken
// (steg 5.1.1.4): paletten ett steg mörkare i skymningen och två på natten, med raster, och ljuset runt varje eld (ui/natt.ts)
export function drawNight(t: number) {
  const d = 1 - lightLevel(t), eldar: { x: number; y: number; r: number; k: number }[] = [];
  if (d > 0) for (const e of eldarOf(s)) { // varje lägereld lyser (steg 4.5.6.8)
    const I = fireHeat(s, e);
    if (!(I > 0 || emberOn(s, e))) continue;
    const f = eldXY(s, e), k = I > 0 ? 0.45 + 0.55 * I : 0.12;
    eldar.push({ x: f.x * TS + TS / 2, y: f.y * TS + TS / 2, r: TS * 6 * k, k: I > 0 ? 1 : 0.5 });
  }
  stallNatt(mork, world, 2 * d, eldar);
}
