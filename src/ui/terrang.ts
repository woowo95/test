import * as PIXI from 'pixi.js';
import { BJORK, BRAND, DAY, H, HOUR, STADIER, T, VAG, W, tradArt, valjArt, ageIndex, stadium, emberOn, fireHeat, eldXY, eldarOf, groundOf, isCm, kalender, lightLevel, snoPaMarken, vaderNu, LJUSKALLOR } from '../sim';
import { s, ui } from './lage';
import { TS, app, figurLayer, husLayer, mork, pileLayer, terrainG, world } from './scen';
import { ritaSkuggor, sattMoln, skuggLangd } from './skugga';
import { stallNatt } from './natt';
import { vaderMork } from './vaderbild';
import { DJUPNATT } from '../palett';
import { animMark, markytaLayer, ritaMark, stallMark } from './mark';
import { animBild } from './animation';
import { type Lov, stallTrad, tradBild, tradSkuggor } from './trad';

// marken (steg 5.1.3.1): gräs, vatten, strand, stigar, sten, lera, aska och snö ritas i pixlar i ui/mark.ts. Här bestäms
// när: hela marken när tidsåldern, isen, vattnet eller byn byts, annars bara de rutor som ändrats (stigarna, skogen, askan).
// Träden är granar i pixlar efter sitt stadium (steg 5.1.3.2 och 5.1.4.3, ui/trad.ts), ovanpå marken och sorterade söderut.
mork.addChildAt(markytaLayer, mork.getChildIndex(terrainG));
// isen på sjön (steg 2.11.3, sim/is.ts): 0 = öppet vatten, 1 = tunn is (under 5 cm), 2 = tjock is
const isNiva = () => { const cm = isCm(s); return cm <= 0 ? 0 : cm < 5 ? 1 : 2; };
let drawnSig = -1, lastSigCheck = 0, lastDraw = -Infinity, drawnNyckel = '', tradNyckel = '';
// Årstiderna (steg 5.1.13): marken byter tidsålder under det första dygnet av den nya (ett år i spelet, en dag i
// verkligheten), fläck för fläck i tolv steg (OVERGANG); snön ligger efter hur mycket som ligger (vädret, i fyra steg); och
// varje björk byter löv på sin egen tid, upp till ett dygn före eller efter skiftet (räknat ur rutan)
const OVERGANG = 12, SNOSTEG = 4;
const LOVTID: Lov[] = ['kal', 'var', 'sommar', 'host'];
function markTid() {
  const k = kalender(s), dt = s.now - k.start;
  return { ny: k.ai, gammal: (k.ai + 3) % 4, frac: dt >= DAY ? 1 : Math.floor(dt / DAY * OVERGANG) / OVERGANG };
}
const snoNu = () => Math.round(snoPaMarken(s) * SNOSTEG) / SNOSTEG;
// björkens löv på rutan (x, y): tidsåldern för en tid förskjuten upp till ett dygn åt något håll, och röda höstlöv på
// ungefär var tredje björk (bildstilen)
function lovAt(x: number, y: number): Lov {
  const o = (kantHash(x + 977, y) * 2 - 1) * DAY, l = LOVTID[ageIndex(s, s.now - o)];
  return l === 'host' && kantHash(y + 313, x) < 0.3 ? 'rod' : l;
}
// marken kollas högst en gång i sekunden (datorns tid): när man snabbspolar ändras den nästan varje bildruta (steg 3.10.4)
export const OMRITA_MS = 1000;
// trädets stadium och storlek i steg: 0 = inget träd, plantan och ungträdet i fyra steg var, sedan vuxet, gammalt och torraka
const STAD = Object.fromEntries(STADIER.map((d, k) => [d.id, k]));
function treeLevel(g: ReturnType<typeof groundOf>, i: number) {
  const st = stadium(g, i);
  return st === null ? 0 : st === 'planta' || st === 'ungtrad' ? 1 + STAD[st] * 4 + Math.floor(g.trees[i] * 4) : 9 + STAD[st];
}
function coverSig() {
  const g = groundOf(s); let h = 0;
  for (let i = 0; i < g.cover.length; i++) h = (Math.imul(h, 31) + Math.floor((1 - g.cover[i]) * 16) * 16 + treeLevel(g, i)) | 0;
  return h;
}
const jord = (t: number) => t === T.Gras || t === T.Skog;
export function drawTerrain(force = false) {
  const ai = ageIndex(s), now = performance.now();
  let sig = drawnSig;
  if (force || now - lastSigCheck > OMRITA_MS) { lastSigCheck = now; sig = coverSig(); }
  const is = isNiva();
  const vat = (s.sjoTorr?.v ?? -1) * 4 + (s.flod?.niva ?? 0); // torkan och översvämningen: vattnet som det är nu (steg 3.8.2, 3.8.3)
  const ask = s.aska?.length ? s.aska.length * 1000 + Math.floor(s.now / (6 * HOUR)) % 1000 : 0; // det svarta efter en eldsvåda bleknar (steg 3.8.5)
  const mt = markTid(), sno = snoNu();
  const nyckel = `${s.seed}|${mt.ny}|${mt.frac}|${sno}|${is}|${vat}|${ask}`;
  // träden ritas om när löven kan byta, var annan timme (datorns tid) inom ett dygn från ett skifte
  const k = kalender(s), nara = s.now - k.start < DAY || k.slut - s.now < DAY;
  const tNyckel = `${ai}|${sno}|${nara ? Math.floor(s.now / (2 * HOUR)) : ''}`;
  if (force || (sig !== drawnSig || nyckel !== drawnNyckel || tNyckel !== tradNyckel) && now - lastDraw >= OMRITA_MS) {
    lastDraw = now; drawnSig = sig; drawnNyckel = nyckel; tradNyckel = tNyckel;
    const g = groundOf(s);
    // marken som brann nyss: mörk, och ljusare ju längre sedan (BRAND.svart dygn)
    let svart: Map<number, number> | undefined;
    for (const [i, t] of s.aska ?? []) (svart ??= new Map()).set(i, Math.max(0, 0.75 * (1 - (s.now - t) / (BRAND.svart * DAY))));
    stallMark({ W, H, tiles: g.tiles, cover: g.cover, trees: g.trees, vatten: T.Vatten, sand: T.Sand, sten: T.Sten, lera: T.Lera, jord }, mt, sno, is, `${s.seed}|${vat}`, svart);
    ritaTrad(g, sno);
  }
  ritaMark(6, force);
  // vågorna och stranden (steg 5.1.9.2) i den del av kartan som syns
  const a = world.toLocal({ x: 0, y: 0 }), b = world.toLocal({ x: app.screen.width, y: app.screen.height });
  animMark(animBild('vagor'), a.x, a.y, b.x, b.y);
}
// träden: ett träd per ruta efter sitt stadium, och unga granar i den orörda skogskanten
function ritaTrad(g: ReturnType<typeof groundOf>, sno: number) {
  const tr = (i: number) => jord(g.tiles[i]) ? g.trees[i] : 0;
  const skog = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && tr(y * W + x) >= 0.5;
  const kant = (i: number) => {
    if (!jord(g.tiles[i]) || g.cover[i] < 0.85) return false;
    const x = i % W, y = (i / W) | 0;
    return skog(x - 1, y) || skog(x + 1, y) || skog(x, y - 1) || skog(x, y + 1);
  };
  stallTrad(figurLayer, W, H, i => {
    const x = i % W, y = (i / W) | 0, st = jord(g.tiles[i]) ? stadium(g, i) : null;
    const b = st ? tradBild(st, g.trees[i], x, y, VAG.ungskog, tradArt(g, i).id === 'bjork')
      // ett ungt träd i skogskanten, med den sort som skulle slå rot där (steg 5.1.6)
      : kant(i) && kantHash(x, y) < 0.3 ? tradBild('ungtrad', VAG.ungskog + (1 - VAG.ungskog) * kantHash(y, x) * 0.7, x, y, VAG.ungskog, valjArt(s.seed, g, i, true) === BJORK) : null;
    if (b?.bjork) b.lov = lovAt(x, y);
    return b;
  }, sno);
}
function kantHash(x: number, y: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ 610;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
// mörkret och eldens sken
// (steg 5.1.1.4, 5.1.7.2): paletten ett steg mörkare i skymningen och tre mitt i natten, med raster, och ljuset runt varje eld (ui/natt.ts)
// Molnen och regnet gör också bilden mörkare på samma sätt, en del av ett steg (vaderMork i ui/vaderbild.ts, steg 5.5.1)
export function drawNight(t: number) {
  const m = DJUPNATT * (1 - lightLevel(t)) + vaderMork(t), eldar: { x: number; y: number; r: number; k: number }[] = [];
  if (m > 0) for (const e of eldarOf(s)) { // varje lägereld lyser (steg 4.5.6.8)
    const I = fireHeat(s, e);
    if (!(I > 0 || emberOn(s, e))) continue;
    const f = eldXY(s, e), k = I > 0 ? 0.45 + 0.55 * I : 0.12;
    eldar.push({ x: f.x * TS + TS / 2, y: f.y * TS + TS / 2, r: TS * 6 * k, k: I > 0 ? 1 : 0.5 });
  }
  // facklorna och de andra ljuskällorna (steg 6.3.6–6.3.8, LJUSKALLOR i sim/ljus.ts); elden har sitt sken ovan
  if (m > 0) for (const [n, k] of Object.entries(LJUSKALLOR)) if (n !== 'eld') for (const l of k.kallor(s)) eldar.push({ x: l.x * TS, y: l.y * TS, r: TS * l.r, k: 0.8 });
  stallNatt(mork, world, Math.min(DJUPNATT, m), eldar);
}
// skuggorna på marken och golven (steg 5.1.8, ui/skugga.ts): träden, folket, djuren, stationerna, sakerna och väggarna.
// Efter att allt annat ställts på plats i bildrutan
export function drawSkuggor() {
  tradSkuggor(skuggLangd());
  const v = vaderNu(s, ui.nu);
  sattMoln(v.moln, v.vind, lightLevel(ui.nu), performance.now()); // molnskuggorna (steg 5.1.10)
  ritaSkuggor(app.renderer as PIXI.Renderer, world, [pileLayer, figurLayer], [markytaLayer, husLayer], W * TS, H * TS);
}
