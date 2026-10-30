import * as PIXI from 'pixi.js';
import { BRAND, DAY, H, HOUR, T, W, ageIndex, emberOn, fireHeat, eldPlats, getMap, groundOf, isCm, lightLevel } from '../sim';
import { s } from './lage';
import { TS, glowG, nightG, terrainG, world } from './scen';

// marken: vatten, sand, gräs som trampas ner till stigar, skog som växer, och natten med eldens sken
const PAL = [
  // istid, vårtid, sommartid, hösttid (vattnet i istiden är öppet vatten; isen ritas efter isens tjocklek, ISFARG)
  { [T.Vatten]: 0x52788c, [T.Sand]: 0xd8dbd3, [T.Gras]: 0xdfe5e6, [T.Skog]: 0xb0bdb9, [T.Sten]: 0xb7bab7, [T.Lera]: 0x9aa0a0, tree: 0x5c6e68 },
  { [T.Vatten]: 0x4a7a95, [T.Sand]: 0xc9b98a, [T.Gras]: 0x8daa5f, [T.Skog]: 0x527d47, [T.Sten]: 0x8e8d84, [T.Lera]: 0x8f7a5c, tree: 0x355e33 },
  { [T.Vatten]: 0x3e6e8a, [T.Sand]: 0xd2bf8b, [T.Gras]: 0x7c9a52, [T.Skog]: 0x426c3a, [T.Sten]: 0x8b8b82, [T.Lera]: 0x9c8461, tree: 0x2b4f2b },
  { [T.Vatten]: 0x456f84, [T.Sand]: 0xc7b183, [T.Gras]: 0xa59450, [T.Skog]: 0x7b6a36, [T.Sten]: 0x8b867b, [T.Lera]: 0x857055, tree: 0xa95c26 },
] as Array<Record<number, number> & { tree: number }>;
// isen på sjön (steg 2.11.3, sim/is.ts): 0 = öppet vatten, 1 = tunn is (under 5 cm, mörk och genomskinlig), 2 = tjock is
const ISFARG = [0, 0x8fb0bf, 0xb9d2dc];
const isNiva = () => { const cm = isCm(s); return cm <= 0 ? 0 : cm < 5 ? 1 : 2; };
// isen målad över hela sjön, punkt för punkt (steg 3.6.11, Björn valde version 1 i bildstilen): is i korn med långa tunna
// sprickor; den tunna isen är mörk och fläckig av vattnet under. Färgerna är bildstilens skiffer och ben. En bild för
// hela kartan, som ritas om bara när isen blir tunn eller tjock eller kartan byts
const hash = (x: number, y: number, k = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };
function vn(x: number, y: number, sk: number, k: number) {
  const fx = x / sk, fy = y / sk, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, k), b = hash(x0 + 1, y0, k), c = hash(x0, y0 + 1, k), d = hash(x0 + 1, y0 + 1, k);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const ISPAL = { s0: 0x233035, s1: 0x3e5156, s2: 0x61767a, s3: 0x8a9c9e, b1: 0xa0947d };
const isSprite = new PIXI.Sprite();
let isNyckel = '';
function ritaIs(is: number) {
  const nyckel = is ? `${s.seed}|${is}` : '';
  if (nyckel === isNyckel) return;
  isNyckel = nyckel; isSprite.visible = !!is;
  if (!is) return;
  if (!isSprite.parent) world.addChildAt(isSprite, world.getChildIndex(terrainG) + 1);
  const m = getMap(s.seed), c = document.createElement('canvas'); c.width = W * TS; c.height = H * TS;
  const g = c.getContext('2d')!, img = g.createImageData(c.width, c.height), d = img.data;
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (m.tiles[ty * W + tx] !== T.Vatten) continue;
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
      const x = tx * TS + px, y = ty * TS + py, nn = vn(x, y, 7, 2) * 0.35 + hash(x, y, 3) * 0.65;
      let col = is === 1 ? (BAYER[(y & 3) * 4 + (x & 3)] < 0.3 ? ISPAL.s0 : nn > 0.85 ? ISPAL.s2 : ISPAL.s1) // tunn is
        : nn < 0.24 ? ISPAL.s2 : nn > 0.8 ? ISPAL.b1 : ISPAL.s3; // tjock is
      if (Math.abs(vn(x, y, 9, 31) - 0.5) < 0.025) col = ISPAL.s1; // sprickorna
      const o = (y * c.width + x) * 4;
      d[o] = col >> 16; d[o + 1] = (col >> 8) & 255; d[o + 2] = col & 255; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (isSprite.texture !== PIXI.Texture.EMPTY) isSprite.texture.destroy(true);
  isSprite.texture = PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST });
}
let drawnAge = -1, drawnSig = -1, drawnIs = -1, drawnVatten = -2, drawnAska = -1, lastSigCheck = 0;
const ASKA = 0x2a2622; // marken efter en eldsvåda (platshållare, steg 3.8.5)
const PATH_COL = [0xb4b9b3, 0x8e7752, 0x9a8258, 0x846c47]; // upptrampad mark per tidsålder (snö i istiden)
// hur sliten en ruta ser ut, i fem steg: 0 = orörd, 4 = bar jord
const wornLevel = (c: number) => c >= 0.85 ? 0 : c >= 0.65 ? 1 : c >= 0.45 ? 2 : c >= 0.25 ? 3 : 4;
// trädens storlek i fyra steg: 0 = inga, 1–2 = plantor, 3 = skog
const treeLevel = (v: number) => v >= 0.5 ? 3 : v >= 0.25 ? 2 : v > 0 ? 1 : 0;
function coverSig() {
  const g = groundOf(s); let h = 0;
  for (let i = 0; i < g.cover.length; i++) h = (Math.imul(h, 31) + wornLevel(g.cover[i]) * 4 + treeLevel(g.trees[i])) | 0;
  return h;
}
// färgen mellan a (f = 0) och b (f = 1)
export function mix(a: number, b: number, f: number) {
  const ch = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
function shadeCol(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f), g = Math.min(255, ((c >> 8) & 255) * f), b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
}
export function drawTerrain(force = false) {
  const ai = ageIndex(s), now = performance.now();
  // stigarna ändras långsamt: kolla högst en gång i sekunden om något syns annorlunda
  let sig = drawnSig;
  if (force || now - lastSigCheck > 1000) { lastSigCheck = now; sig = coverSig(); }
  const is = isNiva();
  const vat = (s.sjoTorr?.v ?? -1) * 4 + (s.flod?.niva ?? 0); // torkan och översvämningen: vattnet som det är nu (steg 3.8.2, 3.8.3)
  const ask = s.aska?.length ? s.aska.length * 1000 + Math.floor(s.now / (6 * HOUR)) % 1000 : 0; // det svarta efter en eldsvåda bleknar (steg 3.8.5)
  if (!force && ai === drawnAge && sig === drawnSig && is === drawnIs && vat === drawnVatten && ask === drawnAska) return;
  drawnAge = ai; drawnSig = sig; drawnIs = is; drawnVatten = vat; drawnAska = ask;
  ritaIs(is);
  const m = getMap(s.seed), pal = PAL[ai], g = groundOf(s);
  // marken som brann nyss: mörk, och ljusare ju längre sedan (BRAND.svart dygn)
  let svart: Map<number, number> | undefined;
  for (const [i, t] of s.aska ?? []) (svart ??= new Map()).set(i, Math.max(0, 0.75 * (1 - (s.now - t) / (BRAND.svart * DAY))));
  terrainG.clear();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, t = g.tiles[i], sh = m.shade[i];
    const soil = t === T.Gras || t === T.Skog, tr = soil ? g.trees[i] : 0;
    // jord: skogsmark under träden, annars gräs som trampas ner till kort gräs och bar jord
    let col = shadeCol(soil ? pal[tr >= 0.5 ? T.Skog : T.Gras] : t === T.Vatten && is ? ISFARG[is] : pal[t], 0.94 + sh * 0.12);
    if (soil) { const lv = wornLevel(g.cover[i]); if (lv) col = mix(col, shadeCol(PATH_COL[ai], 0.95 + sh * 0.1), lv * 0.22); }
    const sv = svart?.get(i);
    if (sv) col = mix(col, ASKA, sv);
    terrainG.beginFill(col).drawRect(x * TS, y * TS, TS, TS).endFill();
    if (tr > 0) {
      // vuxna träd: två eller tre granar; plantor: en liten gran som växer
      const n = tr >= 0.5 ? 2 + Math.floor(sh * 2) : 1, k = tr >= 0.5 ? 1 : 0.35 + tr;
      terrainG.beginFill(pal.tree);
      for (let j = 0; j < n; j++) {
        const tx = x * TS + 3 + ((sh * 97 * (j + 1)) % 1) * 10, ty = y * TS + 3 + ((sh * 57 * (j + 2)) % 1) * 10;
        terrainG.drawPolygon([tx, ty - 4 * k, tx - 3.5 * k, ty + 3.5 * k, tx + 3.5 * k, ty + 3.5 * k]);
      }
      terrainG.endFill();
    } else if (soil && g.cover[i] >= 0.9 && ai !== 0) {
      // högt gräs: några strån
      terrainG.lineStyle(1, shadeCol(pal[T.Gras], 0.72), 0.8);
      for (let j = 0; j < 3; j++) { const gx = x * TS + 3 + ((sh * 71 * (j + 1)) % 1) * 10, gy = y * TS + 5 + ((sh * 43 * (j + 3)) % 1) * 8; terrainG.moveTo(gx, gy + 4).lineTo(gx - 1, gy).moveTo(gx + 1.5, gy + 4).lineTo(gx + 2.5, gy + 0.5); }
      terrainG.lineStyle(0);
    } else if (t === T.Sten) {
      terrainG.beginFill(shadeCol(pal[t], 0.78)).drawCircle(x * TS + 5 + sh * 6, y * TS + 6 + sh * 4, 2.2).drawCircle(x * TS + 11, y * TS + 11 - sh * 3, 1.6).endFill();
    } else if (t === T.Lera) {
      // torr sjöbotten: sprickor i leran (platshållare, steg 3.8.2)
      terrainG.lineStyle(1, shadeCol(pal[t], 0.7), 0.9).moveTo(x * TS + 2, y * TS + 4 + sh * 6).lineTo(x * TS + 8, y * TS + 8).lineTo(x * TS + 14, y * TS + 5 + sh * 4).moveTo(x * TS + 8, y * TS + 8).lineTo(x * TS + 7 + sh * 3, y * TS + 14).lineStyle(0);
    } else if (t === T.Vatten && !is && sh > 0.82) {
      terrainG.lineStyle(1, 0xffffff, 0.25).moveTo(x * TS + 3, y * TS + 8).lineTo(x * TS + 9, y * TS + 8).lineStyle(0);
    }
  }
}
// mörkret och eldens sken
export function drawNight(t: number) {
  const L = lightLevel(t);
  nightG.clear(); glowG.clear();
  if (L >= 1) return;
  const d = 1 - L;
  nightG.beginFill(0x0a1430, 0.58 * d).drawRect(0, 0, W * TS, H * TS).endFill();
  const I = fireHeat(s);
  if (I > 0 || emberOn(s)) {
    const f = eldPlats(s), cx = f.x * TS + TS / 2, cy = f.y * TS + TS / 2;
    const fl = 1 + Math.sin(t / 160) * 0.05, k = I > 0 ? 0.45 + 0.55 * I : 0.12;
    for (const [r, a] of [[TS * 6, 0.035], [TS * 4, 0.06], [TS * 2.4, 0.09], [TS * 1.1, 0.13]]) glowG.beginFill(0xff8a3a, a * d * (I > 0 ? 1 : 0.5)).drawCircle(cx, cy, r * fl * k).endFill();
  }
}
