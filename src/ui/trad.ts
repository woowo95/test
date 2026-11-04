// Träden på kartan i pixlar (steg 5.1.3.2 och 5.1.4.3, "Bildstil" under Gränssnitt i designdokumentet): granen som
// bildstilen ritade den (bildstil/mark.js, gran version 1 renare: våningar av barr, lite osymmetriska, ljuset från vänster),
// ett träd per ruta, lite flyttat i rutan. Stadiet syns (sim/trad.ts): plantan är en liten gran som växer med rutans skog,
// ungträdet en halvstor gran, det vuxna trädet en hel gran, det gamla en större och mörkare gran, och torrakan bildstilens
// döda gran (bildstil/mark.js, torraka: grå stam, kala grenar som hänger ned och en avbruten topp). I kanten av skogen står
// några unga granar där marken är orörd (skogskanten i steg, bildstilen). På vintern ligger snö på våningarna. Varje bild
// ritas en gång och sparas. Storleken (steg 5.1.4.5): se HOJD nedan; kronan når in i rutorna norr om stammen, och träden
// står i samma lager som folket och djuren, i ordning söderut.
import * as PIXI from 'pixi.js';
import { FARGER } from '../palett';

const KOL = 0, JORD = 4, BARR = 20, BEN = 28;
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
  const r = hash(s, h, 401), skift = r < 0.3 ? -1 : r > 0.82 ? 1 : 0; // lite mörkare eller ljusare granar ibland
  const ton = (t: number) => BARR + Math.max(0, Math.min(3, t + (t > 0 || skift > 0 ? skift : 0)));
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
// torrakan h punkter hög (bildstil/mark.js, torraka): en död gran med alla grenar kvar men inga barr, grå stam, kransar
// av kala grenar som hänger ned mot spetsarna, kortare uppåt, och en avbruten topp
function torrakaPx(h: number, s: number) {
  const w2 = Math.round(h * 0.3), w = 2 * w2 + 5, H = h + 2, cx = w >> 1, by = H - 2;
  const px = new Int8Array(w * H).fill(-1);
  const satt = (x: number, y: number, c: number) => { if (x >= 0 && y >= 0 && x < w && y < H) px[y * w + x] = c; };
  for (let y = 0; y < h; y++) { satt(cx - 1, by - y, BEN); satt(cx, by - y, KOL + 3); }
  satt(cx, by - h, BEN); satt(cx + 1, by - h + 1, KOL + 3); // den avbrutna toppen
  const n = Math.round(h / 4.5);
  for (let k = 0; k < n; k++) {
    const y = by - Math.round(h * 0.14) - Math.round(k * (h * 0.82) / n), f = 1 - k / n;
    for (const sida of [-1, 1]) {
      if (hash(k, sida + s, 421) < 0.14) continue; // en gren som fallit av
      const lang = Math.max(2, Math.round(w2 * (0.35 + f * 0.75) * (0.75 + hash(k, sida + s * 3, 422) * 0.5)));
      for (let i = 1; i <= lang; i++) {
        const x = cx + (sida < 0 ? -1 : 0) + sida * i, yy = y + Math.round(i * i / (lang * 2.2)); // grenen böjer sig nedåt
        satt(x, yy, i > lang - 2 ? JORD + 1 : KOL + 3);
        if (i > 2 && i % 3 === 0 && i < lang - 1) satt(x + sida, yy + 1, JORD + 1); // små kvistar
      }
    }
  }
  return { w, h: H, px };
}
export type TradBild = { typ: 'gran' | 'torr'; h: number; s: number; mork?: boolean };
function tradPx(b: TradBild, sno: number) {
  if (b.typ === 'torr') return torrakaPx(b.h, b.s);
  const p = granPx(b.h, sno, b.s);
  if (b.mork) for (let i = 0; i < p.px.length; i++) if (p.px[i] > BARR && p.px[i] < BARR + 4) p.px[i]--; // det gamla trädet är mörkare
  return p;
}
function tradCanvas(b: TradBild, sno: number) {
  const p = tradPx(b, sno), c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
  const g = c.getContext('2d')!, img = g.createImageData(p.w, p.h), d = img.data;
  for (let i = 0; i < p.px.length; i++) { const v = p.px[i]; if (v < 0) continue; const n = RGBA[v]; d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}
const bilder = new Map<string, PIXI.Texture>();
const nyckel = (b: TradBild, sno: number) => `${b.typ}|${b.h}|${b.s}|${b.mork ? 1 : 0}|${b.typ === 'torr' ? 0 : sno}`;
function tradTex(b: TradBild, sno: number) {
  const k = nyckel(b, sno);
  let t = bilder.get(k);
  if (!t) { t = PIXI.Texture.from(tradCanvas(b, sno), { scaleMode: PIXI.SCALE_MODES.NEAREST }); bilder.set(k, t); }
  return t;
}
// trädets bild i panelen (flikar/sak.ts), i dubbel storlek
const urls = new Map<string, string>();
export function tradBildUrl(b: TradBild) {
  const k = nyckel(b, 0);
  let u = urls.get(k);
  if (!u) { u = tradCanvas(b, 0).toDataURL(); urls.set(k, u); }
  return u;
}
// trädets bild efter stadiet (sim/trad.ts) och rutans skog (0–1); x, y = rutan
// Höjderna (steg 5.1.4.5, som i bildstilens rad med stadierna): plantan under en halv ruta, ungträdet upp till en ruta, det
// vuxna trädet två rutor, det gamla tre och jätteträdet fyra; torrakan som ett vuxet träd. Varje träd är lite större eller
// mindre (VARIERA, räknat ur rutan), och barren lite mörkare eller ljusare (skift i granPx)
const TS = 16, VARIERA = 0.2;
const HOJD: Record<string, number> = { vuxet: 2, gammalt: 3, jatte: 4, torraka: 2 };
export function tradBild(stadium: string, v: number, x: number, y: number, ungskog: number): TradBild {
  const s = Math.floor(hash(x, y, 597) * 6), f = 1 + (hash(x, y, 598) * 2 - 1) * VARIERA;
  if (stadium === 'planta') return { typ: 'gran', h: 3 + Math.round(v / ungskog * 4), s };
  if (stadium === 'ungtrad') return { typ: 'gran', h: Math.round((8 + (v - ungskog) / (1 - ungskog) * 7) * f), s };
  const h = Math.round(HOJD[stadium] * TS * f) - 1;
  if (stadium === 'torraka') return { typ: 'torr', h, s };
  return { typ: 'gran', h, s, mork: stadium === 'gammalt' || stadium === 'jatte' };
}

// ---------- träden på kartan ----------
const sprites = new Map<number, { sp: PIXI.Sprite; k: string }>();
// bild(i): trädet på rutan i (eller null), vinter: snö på grenarna
// lager: figurLayer (scen.ts), där träden står i ordning söderut med folket och djuren
export function stallTrad(lager: PIXI.Container, W: number, H: number, bild: (i: number) => TradBild | null, vinter: boolean) {
  const sno = vinter ? 0.8 : 0;
  for (let i = 0; i < W * H; i++) {
    const b = bild(i), x = i % W, y = (i / W) | 0, k = b ? nyckel(b, sno) : '';
    const f = sprites.get(i);
    if (f?.k === k) continue;
    if (!b) { if (f) { f.sp.destroy(); sprites.delete(i); } continue; }
    const sp = f?.sp ?? new PIXI.Sprite();
    const t = sp.texture = tradTex(b, sno);
    const bx = x * 16 + 8 + Math.round((hash(x, y, 595) - 0.5) * 8), by = y * 16 + 14 + Math.round((hash(x, y, 596) - 0.5) * 4);
    sp.position.set(bx - (t.width >> 1), by - t.height + 1 + (b.typ === 'torr' ? 1 : 0)); sp.zIndex = by;
    if (!f) lager.addChild(sp);
    sprites.set(i, { sp, k });
  }
}
