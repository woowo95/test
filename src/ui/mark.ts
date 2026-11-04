// Marken i pixlar (steg 5.1.3.1, "Bildstil" under Gränssnitt i designdokumentet): gräset, vattnet, stranden, stigarna,
// stenen, leran, askan och snön ritas punkt för punkt, 16 punkter per ruta, efter bildstilens godkända ritningar
// (bildstil/mark.js, steg 5.2.4.5: gräset version 1 som referens, vattnet och stranden version 1, stigarna och snön renare).
// Marken ritas inte som rutor som upprepas: varje punkt räknas ur sin plats på kartan, och kanterna mellan vatten, strand,
// stig och skog räknas ur mjuka fält mellan rutornas mitt (avståndet till vattnet, hur nött rutan är) med en långsam våg,
// så att de slingrar sig tvärs över rutorna. Bara utseende: spelet ser fortfarande bara rutorna.
// Kartan delas i bitar om 8 × 8 rutor, var och en en egen bild, och bara de bitar där något ändrats ritas om.
import * as PIXI from 'pixi.js';
import { FARGER } from '../palett';
import { PAL as IKON_PAL, PIX } from '../ikoner';

// palettens ramper: index = ramp * 4 + ton (mörk till ljus)
const KOL = 0, JORD = 4, SENAP = 8, OLIV = 16, BARR = 20, SKIFFER = 24, BEN = 28;
const RGBA = new Uint32Array(FARGER.map(h => { const n = parseInt(h.slice(1), 16); return (255 << 24 | (n & 255) << 16 | (n & 0xff00) | n >> 16) >>> 0; }));
const IDX = new Map(FARGER.map((h, i) => [h.toLowerCase(), i]));
const morkare = (c: number) => c - (c & 3) + Math.max(0, (c & 3) - 1);

// ---------- slump som bara beror på platsen ----------
function hash(x: number, y: number, s: number) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vn(x: number, y: number, sk: number, s: number) {
  const fx = x / sk, fy = y / sk, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];
// en fläck med ren kant (en långsam våg som skärs av), ett kort streck i stället för en lös punkt
const flack = (x: number, y: number, sk: number, s: number, grans: number) => vn(x, y, sk, s) * 0.75 + vn(x, y, sk / 3, s + 1) * 0.25 > grans;
const strack = (x: number, y: number, s: number, p: number) => hash(x, y, s) < p ? 1 : hash(x, y - 1, s) < p ? 2 : 0;
const vagstreck = (x: number, y: number, s: number, p: number) => hash(x, y, s) < p || hash(x - 1, y, s) < p;

// gräset som är referensen (version 1): stora fält med rastrerad kant och korn i båda
function gras(x: number, y: number) {
  const falt = vn(x, y, 56, 301) * 0.6 + vn(x, y, 19, 302) * 0.4, r = hash(x, y, 303);
  const t = (falt - 0.3) / 0.25, m = t < 0 ? 0.5 : t > 1 ? 0 : (1 - t) * 0.5;
  if (bayer(x, y) < m && r > 0.2) return OLIV + 1;
  return r < 0.1 ? OLIV + 1 : r > 0.93 ? OLIV + 3 : OLIV + 2;
}

// ---------- kartans fält ----------
export interface MarkIn {
  W: number; H: number; tiles: Uint8Array; cover: Float32Array; trees: Float32Array;
  vatten: number; sand: number; sten: number; lera: number; jord: (t: number) => boolean;
}
// tid: 0 istid, 1 vår, 2 sommar, 3 höst; is: 0 öppet vatten, 1 tunn is, 2 tjock is
let IN: MarkIn, W = 0, H = 0, tid = 2, is = 0;
let SD = new Float32Array(0), NOTT = new Float32Array(0), TRAD = new Uint8Array(0), ASKA = new Float32Array(0);
const SDMAX = 3;
// avståndet till vattnet i rutor, med tecken: över 0 i vattnet, under 0 på land (högst SDMAX)
function raknaSD() {
  const n = W * H, d = new Float32Array(n), inf = 99;
  for (const vatten of [true, false]) {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = (IN.tiles[i] === IN.vatten) === vatten ? inf : 0;
    const D = 1, D2 = Math.SQRT2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = a[i]; if (!v) continue;
      if (x > 0) v = Math.min(v, a[i - 1] + D);
      if (y > 0) { v = Math.min(v, a[i - W] + D); if (x > 0) v = Math.min(v, a[i - W - 1] + D2); if (x < W - 1) v = Math.min(v, a[i - W + 1] + D2); }
      a[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = a[i]; if (!v) continue;
      if (x < W - 1) v = Math.min(v, a[i + 1] + D);
      if (y < H - 1) { v = Math.min(v, a[i + W] + D); if (x < W - 1) v = Math.min(v, a[i + W + 1] + D2); if (x > 0) v = Math.min(v, a[i + W - 1] + D2); }
      a[i] = v;
    }
    // från rutans mitt: kanten ligger mitt emellan en vattenruta (+0,5) och en landruta (-0,5)
    for (let i = 0; i < n; i++) if (a[i]) d[i] = (vatten ? 1 : -1) * Math.min(SDMAX, a[i] - 0.5);
  }
  SD = d;
}
// ett fält mellan rutornas mitt, för punkten x, y i världen
function bil(F: Float32Array, x: number, y: number) {
  const fx = (x + 0.5) / 16 - 0.5, fy = (y + 0.5) / 16 - 0.5;
  let x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = fx - x0, ty = fy - y0;
  let x1 = x0 + 1, y1 = y0 + 1;
  if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 >= W) x1 = W - 1; if (y1 >= H) y1 = H - 1; if (x0 >= W) x0 = W - 1; if (y0 >= H) y0 = H - 1;
  const a = F[y0 * W + x0], b = F[y0 * W + x1], c = F[y1 * W + x0], d = F[y1 * W + x1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
const tileXY = (x: number, y: number) => { const tx = Math.min(W - 1, Math.max(0, x >> 4)), ty = Math.min(H - 1, Math.max(0, y >> 4)); return ty * W + tx; };

// den torra sjöbotten: bildstilens två rutor (Björn valde efter v245), vända åt olika håll per ruta
const LERA = (['lera_spricka', 'lera_fukt'] as const).map(k => PIX[k].map(rad => [...rad].map(ch => IDX.get(IKON_PAL[k][ch]?.toLowerCase() ?? '') ?? JORD + 1)));
function lera(x: number, y: number, i: number) {
  const tx = i % W, ty = (i / W) | 0, a = hash(tx, ty, 7), b = hash(tx, ty, 9);
  const L = LERA[a < 0.8 ? 0 : 1], px = x & 15, py = y & 15;
  return L[b < 0.5 ? 15 - py : py][(b * 4) % 1 < 0.5 ? 15 - px : px];
}

// ---------- en punkt ----------
// sorten av punkten, så att tuvorna och vassen bara hamnar på gräs och i strandkanten
const GRAS = 1, VASS = 2, ANNAT = 0;
let sort = ANNAT;
function punkt(x: number, y: number): number {
  sort = ANNAT;
  // kanterna mellan sorterna slingrar sig: rutan läses några punkter åt sidan, efter en långsam våg
  const jx = x + Math.round((vn(x, y, 9, 11) - 0.5) * 9), jy = y + Math.round((vn(x, y, 9, 12) - 0.5) * 9);
  const ji = tileXY(jx, jy), t = IN.tiles[ji];
  let sd = bil(SD, x, y);
  if (sd > -1.8 && sd < 2.6) sd += (vn(x, y, 22, 541) - 0.5) * 0.9 + (vn(x, y, 7, 542) - 0.5) * 0.25;
  const r = hash(x, y, 543);
  if (sd > 0) { // vattnet
    if (tid === 0 && is) { // isen: slät, med ljusare fläckar där snön blåst upp
      if (sd < 0.12) return SKIFFER + 2;
      if (is === 1) return bayer(x, y) < 0.3 ? SKIFFER : flack(x, y, 20, 571, 0.7) ? SKIFFER + 2 : SKIFFER + 1;
      if (Math.abs(vn(x, y, 40, 31) - 0.5) < 0.012) return SKIFFER + 1; // sprickorna
      return r < 0.06 ? SKIFFER + 2 : r > 0.96 ? BEN + 1 : flack(x, y, 20, 571, 0.7) ? SKIFFER + 2 : SKIFFER + 3;
    }
    // grunt vatten med sten som syns genom ytan (version 1); djupet räknat i rutor från stranden
    if (sd < 0.2) sort = VASS;
    if (sd < 0.28 && vn(x, y, 3, 544) > 0.66) return sd < 0.12 ? SKIFFER + 3 : SKIFFER + 2;
    const dj = sd > 1.3 ? 0 : sd > 0.42 ? 1 : 2, gl = vn(x, y, 5, 545) > 0.7 && (y + Math.floor(x / 6)) % 4 === 0;
    return gl ? SKIFFER + Math.min(3, dj + 1) : dj === 0 ? (r < 0.3 ? BARR : SKIFFER) : SKIFFER + dj;
  }
  let c: number;
  const vinter = tid === 0;
  if (t === IN.sten) { // stenig mark: grå sten med ljusa ovansidor och bruna springor, så att den inte liknar vattnet
    const topp = flack(x, y, 6, 521, 0.6);
    c = vagstreck(x, y, 520, 0.03) || (!topp && flack(x, y - 1, 6, 521, 0.6)) ? JORD + 1 : topp ? BEN + 1 : r < 0.06 ? KOL + 3 : BEN;
    if (vinter && !flack(x, y, 6, 521, 0.66)) c = r < 0.1 ? BEN + 1 : BEN + 2;
  } else if (t === IN.lera && !vinter) c = lera(jx, jy, ji);
  else if (t === IN.sand || (t !== IN.lera && sd > -0.6)) { // stranden (version 1): sand, jord och sten
    if (vinter) c = BEN + 1;
    else { const sten = vn(x, y, 3, 548); c = sten > 0.62 ? (sten > 0.72 ? SKIFFER + 3 : SKIFFER + 2) : r < 0.3 ? JORD + 2 : r < 0.85 ? SENAP : JORD + 3; }
  } else if (sd > -0.75 && hash(x, y, 549) < 0.5 && !vinter) c = SENAP;
  else if (IN.jord(t) || t === IN.lera) {
    const nb = bil(NOTT, x, y), p = nb > 0.04 ? nb + (vn(x, y, 10, 561) - 0.5) * 0.3 : 0;
    if (vinter) { // snön: drivor med skugga på läsidan, stigen trampad
      if (p > 0.7) c = BEN;
      else if (p > 0.55) c = BEN + 1;
      else {
        const driva = (x: number, y: number) => vn(x * 0.45, y, 18, 573) > 0.64;
        c = driva(x, y) ? BEN + 3 : driva(x, y - 1) || driva(x, y - 2) ? BEN + 1 : r < 0.08 ? BEN + 1 : r > 0.95 ? BEN + 3 : BEN + 2;
      }
    } else if (p > 0.7) { // stigen: jämn bar jord med en ren kant
      const q = hash(x, y, 562);
      c = q < 0.1 ? JORD + 1 : q > 0.93 ? JORD + 3 : flack(x, y, 9, 562, 0.68) ? JORD + 3 : JORD + 2;
    } else if (p > 0.55) c = JORD + 1; // en mörkare rand av nött gräs längs kanten
    else if (TRAD[ji]) { // skogsmarken under träden
      c = vagstreck(x, y, 588, 0.02) ? JORD : strack(x, y, 589, 0.012) === 1 ? OLIV + 1 : flack(x, y, 14, 584, 0.62) ? OLIV : BARR + 1;
    } else {
      c = gras(x, y);
      if (p > 0.3 && bayer(x, y) < (p - 0.3) * 2) c = OLIV + 1; // nött gräs
      else if (p < 0.2) sort = GRAS;
      if (tid === 3 && flack(x, y, 16, 720, 0.68)) c = SENAP + Math.max(0, (c & 3) - 1); // vissnat gräs på hösten
      else if (tid === 1 && hash(x, y, 721) < 0.0026) c = hash(x, y, 722) < 0.67 ? SENAP + 3 : BEN + 3; // vårblommor
    }
  } else c = gras(x, y);
  // marken som brann nyss: svart, och ljusare ju längre sedan
  const a = ASKA[ji];
  if (a > 0 && bayer(x, y) < a) { c = flack(x, y, 8, 530, 0.62) ? KOL + 2 : r < 0.5 ? KOL : KOL + 1; sort = ANNAT; }
  return c;
}

// ---------- en bit av kartan ----------
export const BIT = 8; // rutor per bit
const BP = BIT * 16;
interface Bit { sp: PIXI.Sprite; c: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; u: Uint32Array; px: Int8Array }
const bitar: Bit[] = [];
let bw = 0, bh = 0;
export const markLayer = new PIXI.Container();
function ritaBit(bx: number, by: number) {
  let b = bitar[by * bw + bx];
  if (!b) {
    const c = document.createElement('canvas'); c.width = BP; c.height = BP;
    const g = c.getContext('2d')!, img = g.createImageData(BP, BP);
    const sp = new PIXI.Sprite(PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST }));
    sp.position.set(bx * BP, by * BP); markLayer.addChild(sp);
    b = bitar[by * bw + bx] = { sp, c, g, img, u: new Uint32Array(img.data.buffer), px: new Int8Array(BP * BP) };
  }
  rakna(bx * BP, by * BP, b.px);
  for (let i = 0; i < b.px.length; i++) b.u[i] = RGBA[b.px[i]];
  b.g.putImageData(b.img, 0, 0);
  b.sp.texture.baseTexture.update();
}
// räknar punkterna i en bit (x0, y0 i världen) och lägger tuvorna, blommorna, stenarna och vassen ovanpå
export function rakna(x0: number, y0: number, px: Int8Array) {
  const sorter = new Uint8Array(BP * BP);
  for (let y = 0; y < BP; y++) for (let x = 0; x < BP; x++) { px[y * BP + x] = punkt(x0 + x, y0 + y); sorter[y * BP + x] = sort; }
  const satt = (x: number, y: number, c: number) => { x -= x0; y -= y0; if (x >= 0 && y >= 0 && x < BP && y < BP) px[y * BP + x] = c; };
  const morka = (x: number, y: number) => { x -= x0; y -= y0; if (x >= 0 && y >= 0 && x < BP && y < BP) px[y * BP + x] = morkare(px[y * BP + x]); };
  const sortAv = (x: number, y: number) => { const lx = x - x0, ly = y - y0; if (lx >= 0 && ly >= 0 && lx < BP && ly < BP) return sorter[ly * BP + lx]; punkt(x, y); return sort; };
  if (tid === 0) return;
  // tuvor, blommor och stenar på gräset (version 1), utlagda på ett rutnät med slump i varje cell
  for (let cy = Math.floor(y0 / 6) - 1; cy * 6 < y0 + BP + 4; cy++) for (let cx = Math.floor(x0 / 7) - 1; cx * 7 < x0 + BP + 3; cx++) {
    const x = cx * 7 + Math.floor(hash(cx, cy, 311) * 7), y = cy * 6 + Math.floor(hash(cx, cy, 312) * 6);
    if (x < x0 - 3 || x > x0 + BP + 2 || y < y0 || y > y0 + BP + 3) continue;
    if (sortAv(x, y) !== GRAS) continue;
    const r = hash(cx, cy, 313), klump = vn(x, y, 22, 314);
    if (klump > 0.68 && r < 0.8) { // klungor av högt gräs
      const top = hash(cx, cy, 315) < 0.12 ? SENAP : OLIV + 3;
      for (let k = 0; k < 3; k++) { const xx = x + k - 1, hh = 2 + ((k + cx) & 1); satt(xx, y, OLIV); for (let j = 1; j < hh; j++) satt(xx + (k - 1) * (j > 1 ? 1 : 0), y - j, j === hh - 1 ? top : OLIV + 1); }
    } else if (r < 0.32) { satt(x, y, OLIV); satt(x, y - 1, OLIV + 3); satt(x + 1, y - 1, OLIV); satt(x + 1, y - 2, OLIV + 3); } // en tuva
    else if (r < 0.345) { satt(x, y, OLIV); satt(x, y - 1, BEN + 3); } // en liten blomma
    else if (r > 0.994) { satt(x, y, JORD + 1); satt(x + 1, y, JORD); satt(x, y - 1, JORD + 3); satt(x + 1, y - 1, JORD + 2); morka(x + 1, y + 1); morka(x + 2, y); } // en liten sten
  }
  // vass i strandkanten (version 1)
  for (let cy = Math.floor(y0 / 3); cy * 3 < y0 + BP + 9; cy++) for (let cx = Math.floor(x0 / 3) - 1; cx * 3 < x0 + BP + 2; cx++) {
    if (hash(cx, cy, 550) > 0.4) continue;
    const x = cx * 3 + Math.floor(hash(cx, cy, 551) * 3), y = cy * 3 + Math.floor(hash(cx, cy, 552) * 3);
    if (x < x0 - 1 || x > x0 + BP || y < y0 || y > y0 + BP + 8) continue;
    if (vn(x, y, 14, 551) < 0.55 || sortAv(x, y) !== VASS) continue;
    const hh = 4 + Math.floor(hash(cx, cy, 553) * 4), lut = (cx + cy) & 1;
    for (let j = 0; j < hh; j++) satt(x + (j > hh - 3 && lut ? 1 : 0), y - j, j === hh - 1 ? SENAP + 1 : j > hh - 3 ? OLIV + 2 : OLIV);
  }
}

// ---------- vad som ändrats ----------
let nyckel = '';
let sig = new Int32Array(0);
const smutsiga = new Set<number>();
// en rutas utseende i ett tal: sorten, hur nött, om det står träd och hur svart efter en brand
const rutSig = (i: number, a: number) => IN.tiles[i] | Math.min(15, Math.floor((1 - IN.cover[i]) * 16)) << 4 | (IN.trees[i] >= 0.5 ? 1 : 0) << 8 | Math.min(15, Math.ceil(a * 15)) << 9;
// in: kartan nu; glob: det som ändrar hela marken (byn, tidsåldern, isen, vattnet); aska: rutan -> hur svart (0–1)
export function stallMark(inp: MarkIn, nyTid: number, nyIs: number, glob: string, aska: Map<number, number> | undefined) {
  IN = inp;
  const g = `${inp.W}|${inp.H}|${nyTid}|${nyIs}|${glob}`;
  if (g !== nyckel) {
    nyckel = g; W = inp.W; H = inp.H; tid = nyTid; is = nyIs;
    bw = Math.ceil(W / BIT); bh = Math.ceil(H / BIT);
    raknaSD();
    NOTT = new Float32Array(W * H); TRAD = new Uint8Array(W * H); ASKA = new Float32Array(W * H); sig = new Int32Array(W * H);
    for (let i = 0; i < W * H; i++) uppdatera(i, aska?.get(i) ?? 0);
    for (let i = 0; i < bw * bh; i++) smutsiga.add(i);
    return;
  }
  for (let i = 0; i < W * H; i++) {
    const a = aska?.get(i) ?? 0, ns = rutSig(i, a);
    if (ns === sig[i]) continue;
    uppdatera(i, a);
    // fälten är mjuka över en ruta åt varje håll, och tuvorna och vassen sticker upp några punkter
    const tx = i % W, ty = (i / W) | 0;
    for (let y = Math.max(0, ty - 1); y <= Math.min(H - 1, ty + 2); y++) for (let x = Math.max(0, tx - 1); x <= Math.min(W - 1, tx + 1); x++) smutsiga.add(((y / BIT) | 0) * bw + ((x / BIT) | 0));
  }
}
function uppdatera(i: number, a: number) {
  sig[i] = rutSig(i, a);
  NOTT[i] = IN.jord(IN.tiles[i]) ? 1 - IN.cover[i] : 0;
  TRAD[i] = IN.jord(IN.tiles[i]) && IN.trees[i] >= 0.5 ? 1 : 0;
  ASKA[i] = a;
}
// ritar om de bitar som ändrats, högst ms millisekunder (datorns tid) per bildruta; alla = alla på en gång
export function ritaMark(ms: number, alla = false) {
  if (!smutsiga.size) return;
  const t0 = performance.now();
  for (const k of smutsiga) {
    smutsiga.delete(k);
    ritaBit(k % bw, (k / bw) | 0);
    if (!alla && performance.now() - t0 > ms) break;
  }
}
