// Marken i pixlar (steg 5.1.3.1, "Bildstil" under Gränssnitt i designdokumentet): gräset, vattnet, stranden, stigarna,
// stenen, leran, askan och snön ritas punkt för punkt, 16 punkter per ruta, efter bildstilens godkända ritningar
// (bildstil/mark.js, steg 5.2.4.5: gräset version 1 som referens, vattnet och stranden version 1, stigarna och snön renare).
// Marken ritas inte som rutor som upprepas: varje punkt räknas ur sin plats på kartan, och kanterna mellan vatten, strand,
// stig och skog räknas ur mjuka fält mellan rutornas mitt (avståndet till vattnet, hur nött rutan är) med en långsam våg,
// så att de slingrar sig tvärs över rutorna. Bara utseende: spelet ser fortfarande bara rutorna.
// Kartan delas i bitar om 8 × 8 rutor, var och en en egen bild, och bara de bitar där något ändrats ritas om.
import * as PIXI from 'pixi.js';
import { FARGER, kornPa } from '../palett';
import { bayer, brus as vn, platsHash as hash } from './pixel';
import { PAL as IKON_PAL, PIX } from '../ikoner';

// palettens ramper: index = ramp * 4 + ton (mörk till ljus)
const KOL = 0, JORD = 4, SENAP = 8, OLIV = 16, BARR = 20, SKIFFER = 24, BEN = 28;
const RGBA = new Uint32Array(FARGER.map(h => { const n = parseInt(h.slice(1), 16); return (255 << 24 | (n & 255) << 16 | (n & 0xff00) | n >> 16) >>> 0; }));
const IDX = new Map(FARGER.map((h, i) => [h.toLowerCase(), i]));
const morkare = (c: number) => c - (c & 3) + Math.max(0, (c & 3) - 1);

// ---------- slump som bara beror på platsen ----------
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
// tid: 0 istid, 1 vår, 2 sommar, 3 höst, för punkten som räknas nu (steg 5.1.13: under det första dygnet av en ny
// tidsålder har en del av marken ny tid och resten den förra, fläck för fläck, frac = hur mycket som bytt); sno = hur mycket
// snö som ligger (0–1, vädret); is: 0 öppet vatten, 1 tunn is, 2 tjock is
export interface MarkTid { ny: number; gammal: number; frac: number }
let IN: MarkIn, W = 0, H = 0, tid = 2, is = 0, MT: MarkTid = { ny: 2, gammal: 2, frac: 1 }, SNO = 0;
let SD = new Float32Array(0), FD = new Float32Array(0), NOTT = new Float32Array(0), TRAD = new Uint8Array(0), ASKA = new Float32Array(0);
const SDMAX = 3;
// avståndet i rutor till kanten av det inne() säger, med tecken: över 0 inne, under 0 ute (högst SDMAX)
function avstand(inne: (i: number) => boolean) {
  const n = W * H, d = new Float32Array(n), inf = 99;
  for (const sida of [true, false]) {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = inne(i) === sida ? inf : 0;
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
    // från rutans mitt: kanten ligger mitt emellan en ruta inne (+0,5) och en ute (-0,5)
    for (let i = 0; i < n; i++) if (a[i]) d[i] = (sida ? 1 : -1) * Math.min(SDMAX, a[i] - 0.5);
  }
  return d;
}
// avståndet till vattnet (över 0 i vattnet) och till skogen (över 0 inne i skogen)
const raknaSD = () => { SD = avstand(i => IN.tiles[i] === IN.vatten); };
const raknaFD = () => { FD = avstand(i => TRAD[i] === 1); };
// skogskanten i punkter: över 0 inne i skogen, lite ojämn
const kantE = (x: number, y: number) => bil(FD, x, y) * 16 + (vn(x, y, 7, 590) - 0.5) * 8;
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

// avståndet till stranden i rutor för punkten x, y (över 0 i vattnet), med kantens slingor
function sdAv(x: number, y: number) {
  let sd = bil(SD, x, y);
  if (sd > -1.8 && sd < 2.6) sd += (vn(x, y, 22, 541) - 0.5) * 0.9 + (vn(x, y, 7, 542) - 0.5) * 0.25;
  return sd;
}

// ---------- en punkt ----------
// sorten av punkten, så att tuvorna och vassen bara hamnar på gräs och i strandkanten
const GRAS = 1, VASS = 2, KANT = 3, ANNAT = 0;
let sort = ANNAT;
function punkt(x: number, y: number): number {
  sort = ANNAT;
  tid = MT.frac >= 1 || vn(x, y, 24, 777) < MT.frac ? MT.ny : MT.gammal;
  // snön ligger i fläckar när det är lite, och över allt när det är mycket (steg 5.1.13)
  const vinter = SNO > 0 && (SNO >= 1 || vn(x, y, 30, 779) < SNO * 1.1 - 0.05);
  if (tid === 0 && !vinter) tid = 3; // istiden utan snö: vissnat gräs, som på hösten
  // kanterna mellan sorterna slingrar sig: rutan läses några punkter åt sidan, efter en långsam våg
  const jx = x + Math.round((vn(x, y, 9, 11) - 0.5) * 9), jy = y + Math.round((vn(x, y, 9, 12) - 0.5) * 9);
  const ji = tileXY(jx, jy), t = IN.tiles[ji];
  const sd = sdAv(x, y);
  const r = hash(x, y, 543);
  if (sd > 0) { // vattnet
    if (is) { // isen: slät, med ljusare fläckar där snön blåst upp
      if (sd < 0.12) return SKIFFER + 2;
      if (is === 1) return bayer(x, y) < 0.3 ? SKIFFER : flack(x, y, 20, 571, 0.7) ? SKIFFER + 2 : SKIFFER + 1;
      if (Math.abs(vn(x, y, 40, 31) - 0.5) < 0.012) return SKIFFER + 1; // sprickorna
      return r < 0.06 ? SKIFFER + 2 : r > 0.96 ? BEN + 1 : flack(x, y, 20, 571, 0.7) ? SKIFFER + 2 : SKIFFER + 3;
    }
    // grunt vatten med sten som syns genom ytan (version 1); djupet räknat i rutor från stranden
    if (sd < 0.2 && !vinter) sort = VASS;
    if (sd < 0.28 && vn(x, y, 3, 544) > 0.66) return sd < 0.12 ? SKIFFER + 3 : SKIFFER + 2;
    const dj = sd > 1.3 ? 0 : sd > 0.42 ? 1 : 2, gl = vn(x, y, 5, 545) > 0.7 && (y + Math.floor(x / 6)) % 4 === 0;
    return gl ? SKIFFER + Math.min(3, dj + 1) : dj === 0 ? (r < 0.3 ? BARR : SKIFFER) : SKIFFER + dj;
  }
  let c: number;
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
      // mitt på stigen, där man går mest, är jorden smutsigare: fler korn ett steg mörkare (steg 5.1.7.3)
      const q = hash(x, y, 562), mitt = p > 0.92 && hash(x >> 1, y, 563) < 0.14;
      c = q < 0.1 || mitt ? JORD + 1 : q > 0.93 ? JORD + 3 : flack(x, y, 9, 562, 0.68) ? JORD + 3 : JORD + 2;
    } else if (p > 0.55) c = JORD + 1; // en mörkare rand av nött gräs längs kanten
    else if (kantE(x, y) > -28) { // skogskanten i steg (version 1): skogsmark, fläckar av mörkt gräs, mörkt gräs, fläckar i gräset
      const e = kantE(x, y);
      const skogsmark = () => vagstreck(x, y, 588, 0.02) ? JORD : strack(x, y, 589, 0.012) === 1 ? OLIV + 1 : flack(x, y, 14, 584, 0.62) ? OLIV : BARR + 1;
      const mork = () => { const st = strack(x, y, 591, 0.015); return st === 1 ? OLIV + 3 : st === 2 ? OLIV : flack(x, y, 16, 585, 0.66) ? OLIV + 2 : OLIV + 1; };
      sort = KANT;
      c = e > 10 ? skogsmark() : e > 0 ? (flack(x, y, 11, 586, 0.5) ? mork() : skogsmark()) : e > -12 || flack(x, y, 11, 587, 0.5) ? mork() : gras(x, y);
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
  if (vinter) sort = ANNAT; // inga tuvor och blommor i snön
  return c;
}

// ---------- en bit av kartan ----------
export const BIT = 8; // rutor per bit
const BP = BIT * 16;
interface Bit { sp: PIXI.Sprite; c: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; u: Uint32Array; px: Int8Array }
const bitar: Bit[] = [];
let bw = 0, bh = 0;
export const markytaLayer = new PIXI.Container();
const bitLayer = new PIXI.Container(), animLayer = new PIXI.Container();
markytaLayer.addChild(bitLayer, animLayer);
function ritaBit(bx: number, by: number) {
  let b = bitar[by * bw + bx];
  if (!b) {
    const c = document.createElement('canvas'); c.width = BP; c.height = BP;
    const g = c.getContext('2d')!, img = g.createImageData(BP, BP);
    const sp = new PIXI.Sprite(PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST }));
    sp.position.set(bx * BP, by * BP); bitLayer.addChild(sp);
    b = bitar[by * bw + bx] = { sp, c, g, img, u: new Uint32Array(img.data.buffer), px: new Int8Array(BP * BP) };
  }
  rakna(bx * BP, by * BP, b.px);
  for (let i = 0; i < b.px.length; i++) b.u[i] = RGBA[b.px[i]];
  b.g.putImageData(b.img, 0, 0);
  b.sp.texture.baseTexture.update();
  const a = anim[by * bw + bx]; if (a) { a.ram = undefined; a.f = -1; } // vågorna räknas om efter den nya marken
}
// räknar punkterna i en bit (x0, y0 i världen) och lägger tuvorna, blommorna, stenarna och vassen ovanpå
export function rakna(x0: number, y0: number, px: Int8Array) {
  const sorter = new Uint8Array(BP * BP);
  for (let y = 0; y < BP; y++) for (let x = 0; x < BP; x++) { px[y * BP + x] = punkt(x0 + x, y0 + y); sorter[y * BP + x] = sort; }
  kornPa(px, BP, BP, x0, y0); // korn i det som är slätt (steg 5.1.7.1): skogsmarken, gräset, vattnet, snön och stigarna
  const satt = (x: number, y: number, c: number) => { x -= x0; y -= y0; if (x >= 0 && y >= 0 && x < BP && y < BP) px[y * BP + x] = c; };
  const morka = (x: number, y: number) => { x -= x0; y -= y0; if (x >= 0 && y >= 0 && x < BP && y < BP) px[y * BP + x] = morkare(px[y * BP + x]); };
  const sortAv = (x: number, y: number) => { const lx = x - x0, ly = y - y0; if (lx >= 0 && ly >= 0 && lx < BP && ly < BP) return sorter[ly * BP + lx]; punkt(x, y); return sort; };
  if (SNO >= 1) return; // allt under snö
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
  // högt mörkt gräs i skogskanten (version 1)
  for (let cy = Math.floor(y0 / 8) - 1; cy * 8 < y0 + BP + 4; cy++) for (let cx = Math.floor(x0 / 8) - 1; cx * 8 < x0 + BP + 2; cx++) {
    const x = cx * 8 + Math.floor(hash(cx, cy, 593) * 8), y = cy * 8 + Math.floor(hash(cx, cy, 594) * 8);
    if (x < x0 - 2 || x > x0 + BP || y < y0 || y > y0 + BP + 3) continue;
    if (sortAv(x, y) !== KANT || vn(x, y, 12, 595) <= 0.5) continue;
    const e = kantE(x, y);
    if (!(e > -26 && e < 1)) continue;
    const top = hash(cx, cy, 596) < 0.2 ? SENAP : OLIV + 2;
    satt(x, y, OLIV); satt(x, y - 1, OLIV); satt(x, y - 2, top); satt(x + 1, y, OLIV); satt(x + 1, y - 1, top);
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

// ---------- vågorna och stranden (steg 5.1.9.2) ----------
// Bildstilens vågor och skumrand (anim.js, 5.2.4.8): vågorna är korta ljusa streck i öppet vatten som tänds, rullar en punkt
// per bild och slocknar (VAGTON), och vid stranden sköljer en skumrand upp på sanden och drar sig tillbaka (SKOLJ). Avståndet
// till stranden räknas i punkter (högst 4) ur samma kant som marken ritar. Vågorna byter bild var fjärde slag och stranden
// vart åttonde, så åtta bilder räcker för båda (stranden = bild / 2). Varje bit med vatten nära har en genomskinlig bild
// ovanpå marken, som bara ritas om när bilden byts och biten syns. Inget på isen. Bara utseende.
interface Anim { sp: PIXI.Sprite; g: CanvasRenderingContext2D; img: ImageData; u: Uint32Array; ram?: { i: Uint16Array; c: Uint8Array }[]; f: number }
let anim: (Anim | null | undefined)[] = [];
const AMAX = 4, VAGOR = 32;
const SKOLJ: [number, number][][] = [
  [[1, BEN + 2], [2, SKIFFER + 3]],                    // vågen kommer in
  [[-1, BEN + 3], [1, BEN + 2], [2, SKIFFER + 2]],      // skummet uppe på sanden
  [[-1, JORD + 1], [2, BEN + 2], [3, SKIFFER + 2]],     // vattnet drar sig tillbaka, sanden är våt
  [[-2, JORD + 1], [-1, JORD + 1], [3, SKIFFER + 3]],   // nästa våg samlas längre ut
];
const VAGTON = [-1, 1, 2, 3, 3, 2, 1, -1];
// finns vatten i eller intill biten?
function narVatten(bx: number, by: number) {
  for (let y = Math.max(0, by * BIT - 1); y <= Math.min(H - 1, by * BIT + BIT); y++) for (let x = Math.max(0, bx * BIT - 1); x <= Math.min(W - 1, bx * BIT + BIT); x++) if (SD[y * W + x] > -1) return true;
  return false;
}
// avståndet till stranden i punkter för bitens punkter (över 0 i vattnet, under 0 på land, högst AMAX) och de åtta bilderna
function raknaAnim(bx: number, by: number) {
  const x0 = bx * BP - AMAX, y0 = by * BP - AMAX, N = BP + 2 * AMAX, v = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) v[y * N + x] = sdAv(x0 + x, y0 + y) > 0 ? 1 : 0;
  const d = new Int8Array(BP * BP);
  for (let y = 0; y < BP; y++) for (let x = 0; x < BP; x++) {
    const vatt = v[(y + AMAX) * N + x + AMAX]; let n = AMAX + 1;
    for (let dy = -AMAX; dy <= AMAX && n > 1; dy++) for (let dx = -AMAX; dx <= AMAX; dx++) if (v[(y + AMAX + dy) * N + x + AMAX + dx] !== vatt) n = Math.min(n, Math.max(Math.abs(dx), Math.abs(dy)));
    d[y * BP + x] = Math.min(AMAX, n) * (vatt ? 1 : -1);
  }
  const ram: { i: Uint16Array; c: Uint8Array }[] = [], px = new Int16Array(BP * BP), wx = bx * BP, wy = by * BP;
  const da = (x: number, y: number) => d[y * BP + x];
  for (let f = 0; f < 8; f++) {
    px.fill(-1);
    for (let k = 0; k < VAGOR; k++) { // vågorna, helt inne i biten
      const g = (f + k * 3) % 8, ton = VAGTON[g]; if (ton < 0) continue;
      const x = 1 + Math.floor(hash(bx * 64 + k, by, 920) * (BP - 14)) + g, y = Math.floor(hash(bx * 64 + k, by, 921) * (BP - 2));
      if (!(da(x - 1, y) >= AMAX) || !(da(x + 5, y + 1) >= AMAX)) continue;
      if (ton > 1) { px[(y + 1) * BP + x - 1] = SKIFFER + 1; px[(y + 1) * BP + x + 5] = SKIFFER + 1; } // flankerna en punkt lägre: en båge
      for (let j = 0; j < 5; j++) px[y * BP + x + j] = SKIFFER + (j === 2 ? ton : Math.max(1, ton - 1));
    }
    const sk = SKOLJ[f >> 1];
    for (let y = 0; y < BP; y++) for (let x = 0; x < BP; x++) { // skumranden
      const a = d[y * BP + x]; if (a < 0 && SNO > 0) continue; // inte på snön
      const rad = sk.find(r => r[0] === a);
      if (rad && hash((wx + x) / 3 | 0, (wy + y) / 2 | 0, 910 + (f >> 1)) > 0.2) px[y * BP + x] = rad[1];
    }
    let n = 0; for (let i = 0; i < px.length; i++) if (px[i] >= 0) n++;
    const r = { i: new Uint16Array(n), c: new Uint8Array(n) }; n = 0;
    for (let i = 0; i < px.length; i++) if (px[i] >= 0) { r.i[n] = i; r.c[n++] = px[i]; }
    ram.push(r);
  }
  return ram;
}
// vågorna i den del av kartan som syns (x0, y0, x1, y1 i världens punkter): f är bilden (0–7, animation.ts);
// högst ms millisekunder (datorns tid) för att räkna nya bitar
export function animMark(f: number, x0: number, y0: number, x1: number, y1: number, ms = 4) {
  if (anim.length !== bw * bh) { for (const a of anim) a?.sp.destroy(true); anim = new Array(bw * bh); }
  const t0 = performance.now();
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const k = by * bw + bx, syns = !is && bx * BP < x1 && (bx + 1) * BP > x0 && by * BP < y1 && (by + 1) * BP > y0;
    let a = anim[k];
    if (a === null) continue;
    if (!syns) { if (a) a.sp.visible = false; continue; }
    if (a === undefined) {
      if (!narVatten(bx, by)) { anim[k] = null; continue; }
      const c = document.createElement('canvas'); c.width = BP; c.height = BP;
      const g = c.getContext('2d')!, img = g.createImageData(BP, BP);
      const sp = new PIXI.Sprite(PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST }));
      sp.position.set(bx * BP, by * BP); animLayer.addChild(sp);
      a = anim[k] = { sp, g, img, u: new Uint32Array(img.data.buffer), f: -1 };
    }
    if (!a.ram) { if (performance.now() - t0 > ms) { a.sp.visible = false; continue; } a.ram = raknaAnim(bx, by); }
    a.sp.visible = true;
    if (a.f === f) continue;
    a.f = f; a.u.fill(0);
    const r = a.ram[f]; for (let j = 0; j < r.i.length; j++) a.u[r.i[j]] = RGBA[r.c[j]];
    a.g.putImageData(a.img, 0, 0); a.sp.texture.baseTexture.update();
  }
}
// hela marken byts (vattnet, isen, snön): vågorna räknas om
const animBort = () => { for (const a of anim) a?.sp.destroy(true); anim = []; };

// ---------- vad som ändrats ----------
let nyckel = '';
let sig = new Int32Array(0);
const smutsiga = new Set<number>();
// en rutas utseende i ett tal: sorten, hur nött, om det står träd och hur svart efter en brand
const rutSig = (i: number, a: number) => IN.tiles[i] | Math.min(15, Math.floor((1 - IN.cover[i]) * 16)) << 4 | (IN.trees[i] >= 0.5 ? 1 : 0) << 8 | Math.min(15, Math.ceil(a * 15)) << 9;
// in: kartan nu; mt: tidsåldern och övergången; sno: snön (0–1); glob: det som ändrar hela marken (byn, vattnet); aska:
// rutan -> hur svart (0–1)
export function stallMark(inp: MarkIn, mt: MarkTid, sno: number, nyIs: number, glob: string, aska: Map<number, number> | undefined) {
  IN = inp;
  const g = `${inp.W}|${inp.H}|${mt.ny}|${mt.gammal}|${mt.frac}|${sno}|${nyIs}|${glob}`;
  if (g !== nyckel) {
    nyckel = g; W = inp.W; H = inp.H; MT = mt; SNO = sno; is = nyIs;
    bw = Math.ceil(W / BIT); bh = Math.ceil(H / BIT);
    raknaSD(); animBort();
    NOTT = new Float32Array(W * H); TRAD = new Uint8Array(W * H); ASKA = new Float32Array(W * H); sig = new Int32Array(W * H);
    for (let i = 0; i < W * H; i++) uppdatera(i, aska?.get(i) ?? 0);
    raknaFD();
    for (let i = 0; i < bw * bh; i++) smutsiga.add(i);
    return;
  }
  let skog = false;
  for (let i = 0; i < W * H; i++) {
    const a = aska?.get(i) ?? 0, ns = rutSig(i, a);
    if (ns === sig[i]) continue;
    const fore = TRAD[i];
    uppdatera(i, a);
    if (TRAD[i] !== fore) { // skogskanten flyttar sig: avståndet räknas om, och kanten syns upp till tre rutor bort
      skog = true;
      const tx = i % W, ty = (i / W) | 0;
      for (let y = Math.max(0, ty - 3); y <= Math.min(H - 1, ty + 3); y++) for (let x = Math.max(0, tx - 3); x <= Math.min(W - 1, tx + 3); x++) smutsiga.add(((y / BIT) | 0) * bw + ((x / BIT) | 0));
    }
    // fälten är mjuka över en ruta åt varje håll, och tuvorna och vassen sticker upp några punkter
    const tx = i % W, ty = (i / W) | 0;
    for (let y = Math.max(0, ty - 1); y <= Math.min(H - 1, ty + 2); y++) for (let x = Math.max(0, tx - 1); x <= Math.min(W - 1, tx + 1); x++) smutsiga.add(((y / BIT) | 0) * bw + ((x / BIT) | 0));
  }
  if (skog) raknaFD();
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
