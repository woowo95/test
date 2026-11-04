// Träden på kartan i pixlar (steg 5.1.3.2, "Bildstil" under Gränssnitt i designdokumentet): granen som bildstilen ritade
// den (bildstil/mark.js, gran version 1 renare: våningar av barr, lite osymmetriska, ljuset från vänster), en gran per ruta
// med skog, lite flyttad i rutan. Plantorna är små granar som växer med rutans skog. I kanten av skogen står några unga
// granar där marken är orörd (skogskanten i steg, bildstilen). På vintern ligger snö på våningarna. Varje bild ritas en gång
// och sparas. Träden görs om i 5.1.4 (ett träd per ruta med art, ålder och stadium).
import * as PIXI from 'pixi.js';
import { FARGER } from '../palett';

const JORD = 4, BARR = 20, BEN = 28;
const RGBA = FARGER.map(h => parseInt(h.slice(1), 16));
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

// granen h punkter hög med foten mitt i bildens nedre kant; sno = hur mycket snö på grenarna (0–1), s = vilken gran
function granPx(h: number, sno: number, s: number) {
  const w = 2 * Math.ceil(h * 0.28 * 1.3 + 3) + 1, H = h + 1, cx = w >> 1, by = H - 1;
  const px = new Int8Array(w * H).fill(-1);
  const satt = (x: number, y: number, c: number) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < H) px[y * w + x] = c; };
  const skift = hash(s, h, 401) < 0.3 ? -1 : 0; // lite mörkare granar ibland
  const ton = (t: number) => BARR + Math.max(0, Math.min(3, t + (t > 0 ? skift : 0)));
  const w2 = Math.max(1, Math.round(h * 0.28)), stam = Math.max(1, Math.round(h / 10));
  for (let y = 0; y < stam + 1; y++) { satt(cx, by - y, JORD); if (h > 12) satt(cx - 1, by - y, JORD + 1); }
  if (h < 8) { // plantan: några barr
    for (let r = 0; r < h - 1; r++) { const hw = Math.floor(r / 2.2); for (let dx = -hw; dx <= hw; dx++) satt(cx + dx, by - h + r + 1, dx < 0 ? ton(2) : dx > 0 ? ton(0) : ton(1)); }
    satt(cx, by - h + 1, sno > 0 ? BEN + 3 : ton(3));
    return { w, h: H, px };
  }
  const hc = h - stam - 1, topp = by - h + 1;
  for (let r = 0; r < hc; r++) { // varje våning olika lång åt vänster och höger och lite förskjuten
    const k = Math.floor(r / 5), tier = (r % 5) / 4, y = topp + r;
    const aL = 0.78 + hash(k, s, 700) * 0.5, aR = 0.78 + hash(k, s, 701) * 0.5;
    const off = k > 0 && k < hc / 5 - 1 ? Math.round((hash(k, s, 702) - 0.5) * 2.2) : 0;
    const bas = (r / hc) * w2 * (0.55 + 0.45 * tier), hl = Math.round(bas * aL), hr = Math.round(bas * aR);
    for (let dx = -hl; dx <= hr; dx++) {
      const rel = dx < 0 ? dx / (hl || 1) : dx / (hr || 1);
      const kant = dx === -hl || dx === hr || (r % 5 === 4 && Math.abs(rel) > 0.35);
      const sl = 0.55 - rel * 0.35 - tier * 0.25 + (vn(s * 50 + dx, y, 4, 703) - 0.5) * 0.12;
      let c = kant ? ton(0) : sl > 0.62 ? ton(3) : sl > 0.4 ? ton(2) : sl > 0.18 ? ton(1) : ton(0);
      if (sno > 0 && r % 5 < 2 && rel < 0.8 && vn(s * 50 + dx, y, 3, 406) < sno * 0.8) c = r % 5 === 0 ? BEN + 3 : BEN + 2;
      satt(cx + off + dx, y, c);
    }
  }
  return { w, h: H, px };
}
const bilder = new Map<string, PIXI.Texture>();
function granTex(h: number, sno: number, s: number) {
  const k = `${h}|${sno}|${s}`;
  let t = bilder.get(k);
  if (!t) {
    const b = granPx(h, sno, s), c = document.createElement('canvas'); c.width = b.w; c.height = b.h;
    const g = c.getContext('2d')!, img = g.createImageData(b.w, b.h), d = img.data;
    for (let i = 0; i < b.px.length; i++) { const v = b.px[i]; if (v < 0) continue; const n = RGBA[v]; d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    t = PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST });
    bilder.set(k, t);
  }
  return t;
}

// ---------- träden på kartan ----------
export const tradLayer = new PIXI.Container();
tradLayer.sortableChildren = true;
const sprites = new Map<number, { sp: PIXI.Sprite; k: string }>();
// tr: rutans skog (0–1), kant: en orörd ruta utan skog bredvid skogen; vinter: snö på grenarna
export function stallTrad(W: number, H: number, tr: (i: number) => number, kant: (i: number) => boolean, vinter: boolean) {
  const sno = vinter ? 0.8 : 0;
  for (let i = 0; i < W * H; i++) {
    const v = tr(i), x = i % W, y = (i / W) | 0;
    let h = 0;
    if (v >= 0.5) h = 24 + Math.floor(hash(x, y, 598) * 4) * 3; // vuxen gran
    else if (v > 0) h = 5 + Math.round(v / 0.5 * 8); // plantan växer med skogen på rutan
    else if (kant(i) && hash(x, y, 610) < 0.3) h = 8 + Math.floor(hash(x, y, 600) * 6); // en ung gran i skogskanten
    const s = Math.floor(hash(x, y, 597) * 6), k = h ? `${h}|${sno}|${s}` : '';
    const f = sprites.get(i);
    if (f?.k === k) continue;
    if (!h) { if (f) { f.sp.destroy(); sprites.delete(i); } continue; }
    const sp = f?.sp ?? new PIXI.Sprite();
    const t = sp.texture = granTex(h, sno, s);
    const bx = x * 16 + 8 + Math.round((hash(x, y, 595) - 0.5) * 8), by = y * 16 + 14 + Math.round((hash(x, y, 596) - 0.5) * 4);
    sp.position.set(bx - (t.width >> 1), by - t.height + 1); sp.zIndex = by;
    if (!f) tradLayer.addChild(sp);
    sprites.set(i, { sp, k });
  }
}
