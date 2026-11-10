// Träden på kartan i pixlar (steg 5.1.3.2, 5.1.4.3 och 5.1.6: granen och björken, "Bildstil" under Gränssnitt i designdokumentet): granen som
// bildstilen ritade den (bildstil/mark.js, gran version 1 renare: våningar av barr, lite osymmetriska, ljuset från vänster),
// ett träd per ruta, lite flyttat i rutan. Stadiet syns (sim/trad.ts): plantan är en liten gran som växer med rutans skog,
// ungträdet en halvstor gran, det vuxna trädet en hel gran, det gamla en större och mörkare gran, och torrakan bildstilens
// döda gran (bildstil/mark.js, torraka: grå stam, kala grenar som hänger ned och en avbruten topp). I kanten av skogen står
// några unga granar där marken är orörd (skogskanten i steg, bildstilen). På vintern ligger snö på våningarna. Varje bild
// ritas en gång och sparas. Storleken (steg 5.1.4.5): se HOJD nedan; kronan når in i rutorna norr om stammen, och träden
// står i samma lager som folket och djuren, i ordning söderut.
import { rasterPa } from '../palett';
import * as PIXI from 'pixi.js';
import { FARGER, kornPa } from '../palett';
import { brus as vn, platsHash as hash } from './pixel';
import { fotSkugga, skuggTrad } from './skugga';
import { BUSK_FORMER, buskPx } from './buske';

const KOL = 0, JORD = 4, BARR = 20, BEN = 28;
const RGBA = FARGER.map(h => parseInt(h.slice(1), 16));

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

// ---------- björken (steg 5.1.6) ----------
// Björken som bildstilen ritade den (bildstil/mark.js, bjork version 1 renare och torrBjork): vit stam med svarta märken
// och kronan i klungor av blad, ljusa uppe till vänster och en mörk kant nedtill och till höger. På vintern kala grenar med
// snö ovanpå. Den torra björken har alla grenar utan löv, en avbruten topp, flagnande bark och tickor. Slumpen är
// bildstilens (hs och vs), så att björkarna blir som de godkända; skuggan på marken kommer med skuggorna (steg 5.1.8).
const hs = (x: number, y: number, s = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
const RAMP: Record<string, number> = { kol: 0, jord: 4, senap: 8, rost: 12, oliv: 16, barr: 20, skiffer: 24, ben: 28 };
const I = (r: string, t: number) => RAMP[r] + t;
type Pkt = Map<string, number>;
const satt = (M: Pkt, x: number, y: number, c: number) => M.set(Math.round(x) + ',' + Math.round(y), c);
function bjorkStam(M: Pkt, cx: number, by: number, h: number, top: number) {
  const w = h < 14 ? 1 : h < 36 ? 2 : 3;
  for (let y = by; y >= top; y--) for (let i = 0; i < w; i++) {
    const x = cx - (w >> 1) + i, nere = by - y < h * 0.12 && h > 20;
    let c = i === w - 1 && w > 1 ? I('ben', 1) : i === 0 ? I('ben', 3) : I('ben', 2);
    if (nere) c = hs(x, y, 431) < 0.5 ? I('kol', 2) : I('kol', 1);
    else if (hs(Math.floor(y / 2), cx, 432) < 0.18 && hs(x, y, 433) < 0.8) c = I('kol', 1); // de svarta märkena
    satt(M, x, y, c);
  }
}
// kala grenar som delar sig, tunnare utåt
function kvistar(M: Pkt, x: number, y: number, vinkel: number, lang: number, djup: number, s: number) {
  for (let i = 0; i < lang; i++) satt(M, x + Math.cos(vinkel) * i, y - Math.sin(vinkel) * i, djup > 2 ? I('ben', 1) : djup > 1 ? I('kol', 3) : I('jord', 1));
  if (djup <= 0 || lang < 3) return;
  const ex = x + Math.cos(vinkel) * lang, ey = y - Math.sin(vinkel) * lang, a = 0.45 + hs(x, y, s) * 0.3;
  kvistar(M, ex, ey, vinkel + a, lang * 0.68, djup - 1, s + 1);
  kvistar(M, ex, ey, vinkel - a * 0.9, lang * 0.62, djup - 1, s + 2);
  if (djup > 2 && hs(x, y, s + 3) < 0.5) kvistar(M, ex, ey, vinkel - 0.1, lang * 0.5, djup - 2, s + 4); // hängande skott
}
// björkens löv efter årstiden (steg 5.1.13, bildstilens LOV i mark.js): ramp och toner för kronans fyra ljus. Ljusa
// nyutslagna löv på våren, gröna på sommaren, gula på hösten (och röda på några björkar), och kala grenar på vintern
export type Lov = 'var' | 'sommar' | 'host' | 'rod' | 'kal';
const LOV: Record<Exclude<Lov, 'kal'>, [string, number[]]> = {
  var: ['oliv', [0, 1, 3, 3]], sommar: ['oliv', [0, 1, 2, 3]], host: ['senap', [0, 1, 2, 3]], rod: ['rost', [0, 1, 2, 3]],
};
// den hamlade björken (steg 9.8.16, platshållare tills Björn valt i bildstilen): en kort tjock vit stam, avkapad en bit upp, med
// en tät krona av smala raka skott; skotten har löv utom när björken är kal
function hamladM(lov: Lov, s: number): Pkt {
  const M: Pkt = new Map(), top = -12;
  for (let y = 0; y >= top; y--) for (let x = -1; x <= 1; x++) satt(M, x, y, hs(Math.floor(y / 2), x, 431 + s) < 0.16 ? I('kol', 1) : x === 1 ? I('ben', 1) : I('ben', 3));
  for (let x = -2; x <= 2; x++) satt(M, x, top - 1, I('ben', 2)); // knuten där grenarna kapats
  const kal = lov === 'kal', [ramp, ton] = LOV[kal ? 'sommar' : lov];
  for (let k = 0; k < 9; k++) {
    const x0 = -3 + k * 0.75, lut = (hs(k, s, 432) - 0.5) * 0.4, len = 6 + Math.floor(hs(k, s, 433) * 5);
    for (let t = 1; t <= len; t++) {
      const x = x0 + lut * t, y = top - 1 - t;
      satt(M, x, y, I('jord', 1));
      if (!kal && t > 1 && hs(k, t, 434 + s) < 0.7) satt(M, x + (t % 2 ? 1 : -1), y, I(ramp, ton[(k + t) % 4]));
    }
  }
  return M;
}
function bjorkM(h: number, lov: Lov, s: number): Pkt {
  const vinter = lov === 'kal', [ramp, ton] = LOV[vinter ? 'sommar' : lov];
  const M: Pkt = new Map(), cx = 0, by = 0, L = (t: number) => I(ramp, ton[t]);
  const kh = h < 10 ? h * 0.7 : h * 0.68, kw = Math.max(2, h * 0.3), ky = by - h + kh / 2;
  bjorkStam(M, cx, by, h, by - Math.round(h * (vinter ? 0.85 : 0.55)));
  if (h < 8) { // plantan: några blad på en pinne
    if (vinter) { satt(M, cx - 1, by - h + 2, I('jord', 1)); satt(M, cx + 1, by - h + 3, I('jord', 1)); return M; }
    for (const [dx, dy, t] of [[-1, 1, 2], [1, 2, 1], [0, 0, 3], [-1, 3, 1], [1, 0, 2]]) satt(M, cx + dx, by - h + dy, L(t));
    return M;
  }
  if (vinter) {
    const top = by - Math.round(h * 0.55);
    kvistar(M, cx, top, Math.PI / 2 + 0.25, h * 0.24, h > 30 ? 4 : 3, 450 + s);
    kvistar(M, cx, top, Math.PI / 2 - 0.35, h * 0.22, h > 30 ? 4 : 3, 460 + s);
    kvistar(M, cx, top + h * 0.12, Math.PI / 2 + 0.9, h * 0.16, 2, 470 + s);
    kvistar(M, cx, top + h * 0.1, Math.PI / 2 - 0.95, h * 0.15, 2, 480 + s);
    return M;
  }
  const n = Math.round(5 + h / 4.5), kl: [number, number, number][] = [], K: Pkt = new Map();
  for (let k = 0; k < n; k++) { const a = hs(k, cx, 490 + s) * 6.28, d = Math.sqrt(hs(k, cx, 491 + s)) * 0.72; kl.push([cx + Math.cos(a) * kw * d, ky + Math.sin(a) * kh / 2 * d, Math.max(2, h * (0.12 + hs(k, cx, 492 + s) * 0.07))]); }
  kl.sort((a, b) => a[1] - b[1]);
  for (const [bx, byy, r] of kl) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.hypot(dx, dy * 1.15) / r > 1) continue;
    const sl = -(dx + dy) / (2 * r) + 0.1 - ((byy - ky) / kh) * 0.6;
    K.set(Math.round(bx + dx) + ',' + Math.round(byy + dy), sl > 0.35 ? L(3) : sl > -0.1 ? L(2) : L(1));
  }
  const har = (x: number, y: number) => K.has(x + ',' + y);
  for (const [k, c] of K) { const [x, y] = k.split(',').map(Number); if ([har(x + 1, y), har(x - 1, y), har(x, y + 1), har(x, y - 1)].filter(Boolean).length < 2) continue; satt(M, x, y, !har(x + 1, y) || !har(x, y + 1) ? L(0) : c); }
  return M;
}
function torrBjorkM(h: number): Pkt {
  const M: Pkt = new Map(), cx = 0, by = 0, top = by - Math.round(h * 0.6);
  bjorkStam(M, cx, by, h, by - Math.round(h * 0.88));
  for (let y = by - Math.round(h * 0.88); y < by; y += 3) if (hs(cx, y, 523) < 0.3) satt(M, cx, y, I('jord', 1)); // barken flagnar
  for (const [dy, l] of [[0.3, 1], [0.42, 2]]) { const y = by - Math.round(h * dy); satt(M, cx + l % 2 + 1, y, I('jord', 2)); satt(M, cx + l % 2 + 2, y, I('jord', 1)); satt(M, cx + l % 2 + 1, y + 1, I('jord', 0)); } // tickor
  kvistar(M, cx, top, Math.PI / 2 + 0.3, h * 0.26, 3, 530);
  kvistar(M, cx, top, Math.PI / 2 - 0.4, h * 0.24, 3, 540);
  kvistar(M, cx, top + h * 0.14, Math.PI / 2 + 0.95, h * 0.14, 1, 550); // en bruten gren
  kvistar(M, cx, top + h * 0.1, Math.PI / 2 - 1.0, h * 0.18, 2, 560);
  return M;
}
// snö på allt som vänder sig uppåt (bildstilen, årstiderna: tidTrad); sno = hur mycket snö som ligger (0–1, 0.8 som i
// bildstilen)
function snoPa(M: Pkt, sno: number) {
  const ut: Pkt = new Map(), f = 0.75 * Math.min(1.25, sno / 0.8);
  for (const [k, c] of M) { const [x, y] = k.split(',').map(Number); ut.set(k, !M.has(x + ',' + (y - 1)) && (c < 28 || c > 31) && hs(x, y, 722) < f ? I('ben', 3) : c); }
  return ut;
}
// fallna löv på marken kring foten på hösten (bildstilen, stadierTid): gula och några röda, under trädet
function fallnaLov(M: Pkt, h: number, s: number) {
  if (h <= 8) return M;
  const ut: Pkt = new Map();
  for (let k = 0; k < h * 1.5; k++) {
    const a = hs(k, s, 724) * 6.28, d = Math.sqrt(hs(k, s, 725)) * h * 0.4;
    satt(ut, Math.cos(a) * d, 2 + Math.sin(a) * d * 0.35, I(hs(k, s, 726) < 0.25 ? 'rost' : 'senap', 2 + (k % 2)));
  }
  for (const [k, c] of M) ut.set(k, c); // trädet framför löven
  return ut;
}
// punkterna till en bild med foten i mitten; fot = raderna under foten (de fallna löven)
function iBild(M: Pkt) {
  let ux = 0, oy = 0, ny = 0;
  for (const k of M.keys()) { const [x, y] = k.split(',').map(Number); ux = Math.max(ux, Math.abs(x)); oy = Math.min(oy, y); ny = Math.max(ny, y); }
  const w = 2 * ux + 1, H = ny + 1 - oy, px = new Int8Array(w * H).fill(-1);
  for (const [k, c] of M) { const [x, y] = k.split(',').map(Number); px[(y - oy) * w + x + ux] = c; }
  return { w, h: H, px, fot: ny };
}
const bjorkPx = (h: number, lov: Lov, sno: number, s: number) => {
  let M = bjorkM(h, lov, s);
  if (lov === 'host' || lov === 'rod') M = fallnaLov(M, h, s);
  return iBild(lov === 'kal' && sno > 0 ? snoPa(M, sno) : M);
};
const torrBjorkPx = (h: number, sno: number) => { const M = torrBjorkM(h); return iBild(sno > 0 ? snoPa(M, sno) : M); };

// bjork: björken i stället för granen (steg 5.1.6); lov: björkens löv nu (steg 5.1.13, sommar om inget anges)
// typ 'buske': en buske (steg 6.5.3, ui/buske.ts), s = vilken av de tre formerna, + 3 med bären på (bärbusken, steg 6.5.4)
export type TradBild = { typ: 'gran' | 'torr' | 'buske'; h: number; s: number; mork?: boolean; bjork?: boolean; lov?: Lov; kol?: boolean; hamlad?: boolean }; // hamlad: den hamlade björken (steg 9.8.16) // kol: en kolnad stam efter en brand (steg 9.2.26)
function tradPx(b: TradBild, sno: number): { w: number; h: number; px: Int8Array; fot?: number } {
  // den kolnade stammen (steg 9.2.26, platshållare tills Björn valt i bildstilen): torrakan i kolets två mörkaste toner
  if (b.kol) { const p = tradPx({ ...b, kol: false }, 0); for (let i = 0; i < p.px.length; i++) if (p.px[i] >= 0) p.px[i] = p.px[i] === BEN || p.px[i] === KOL + 3 ? KOL + 1 : KOL; return p; }
  if (b.typ === 'buske') return buskPx(b.s % BUSK_FORMER.length, b.s >= BUSK_FORMER.length); // s >= 3: med bären på (steg 6.5.4)
  if (b.hamlad) return iBild(hamladM(b.lov ?? 'sommar', b.s));
  if (b.bjork) {
    const p = b.typ === 'torr' ? torrBjorkPx(b.h, sno) : bjorkPx(b.h, b.lov ?? 'sommar', sno, b.s);
    if (b.mork) for (let i = 0; i < p.px.length; i++) if (p.px[i] > 16 && p.px[i] < 20) p.px[i]--; // den gamla björken är mörkare
    return p;
  }
  if (b.typ === 'torr') return torrakaPx(b.h, b.s);
  const p = granPx(b.h, sno, b.s);
  if (b.mork) for (let i = 0; i < p.px.length; i++) if (p.px[i] > BARR && p.px[i] < BARR + 4) p.px[i]--; // det gamla trädet är mörkare
  return p;
}
function tradCanvas(b: TradBild, sno: number) {
  const p = tradPx(b, sno);
  kornPa(p.px, p.w, p.h, 0, 0, b.s); // korn i kronans släta partier (steg 5.1.7.1)
  const c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
  const g = c.getContext('2d')!, img = g.createImageData(p.w, p.h), d = img.data;
  for (let i = 0; i < p.px.length; i++) { const v = p.px[i]; if (v < 0) continue; const n = RGBA[v]; d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  return { c, fot: p.fot ?? 0 };
}
const bilder = new Map<string, { t: PIXI.Texture; fot: number }>();
// snön syns på granen, på den torra björken och på den kala björken; löven bara på den levande björken
function nyckel(b: TradBild, sno: number) {
  const lov = b.bjork && b.typ !== 'torr' ? b.lov ?? 'sommar' : '';
  const sn = (b.typ === 'torr' && !b.bjork) || b.typ === 'buske' || (lov && lov !== 'kal') ? 0 : sno;
  return `${b.bjork ? 'b' : ''}${b.typ}|${b.h}|${b.s}|${b.mork ? 1 : 0}|${sn}|${lov}${b.kol ? '|kol' : ''}${b.hamlad ? '|hamlad' : ''}`;
}
function tradTex(b: TradBild, sno: number) {
  const k = nyckel(b, sno);
  let t = bilder.get(k);
  if (!t) {
    const c = tradCanvas(b, sno);
    t = { t: PIXI.Texture.from(c.c, { scaleMode: PIXI.SCALE_MODES.NEAREST }), fot: c.fot };
    bilder.set(k, t);
  }
  return t;
}
// trädets bild i panelen (flikar/sak.ts), i dubbel storlek
const urls = new Map<string, string>();
export function tradBildUrl(b: TradBild) {
  const k = nyckel(b, 0);
  let u = urls.get(k);
  if (!u) { u = tradCanvas(b, 0).c.toDataURL(); urls.set(k, u); }
  return u;
}
// trädets bild efter stadiet (sim/trad.ts) och rutans skog (0–1); x, y = rutan
// Höjderna (steg 5.1.4.5, som i bildstilens rad med stadierna): plantan under en halv ruta, ungträdet upp till en ruta, det
// vuxna trädet två rutor, det gamla tre och jätteträdet fyra; torrakan som ett vuxet träd. Varje träd är lite större eller
// mindre (VARIERA, räknat ur rutan), och barren lite mörkare eller ljusare (skift i granPx)
const TS = 16, VARIERA = 0.2;
const HOJD: Record<string, number> = { vuxet: 2, gammalt: 3, jatte: 4, torraka: 2 };
// bjork: trädet är en björk (sim/trad.ts, steg 5.1.6); den torra björken är lite lägre än ett vuxet träd
export function tradBild(stadium: string, v: number, x: number, y: number, ungskog: number, bjork = false): TradBild {
  const s = Math.floor(hash(x, y, 597) * 6), f = 1 + (hash(x, y, 598) * 2 - 1) * VARIERA, b = bjork || undefined;
  if (stadium === 'planta') return { typ: 'gran', h: 3 + Math.round(v / ungskog * 4), s, bjork: b };
  if (stadium === 'ungtrad') return { typ: 'gran', h: Math.round((8 + (v - ungskog) / (1 - ungskog) * 7) * f), s, bjork: b };
  const h = Math.round(HOJD[stadium] * TS * f * (bjork && stadium === 'torraka' ? 0.85 : 1)) - 1;
  if (stadium === 'torraka') return { typ: 'torr', h, s, bjork: b };
  return { typ: 'gran', h, s, mork: stadium === 'gammalt' || stadium === 'jatte', bjork: b };
}

// Träden som stammar (steg 5.3.6, filtret på kartan): bara stammen, så att marken under kronorna syns. Granens stam i jordens
// färg, torrakans grå och björkens vit med de svarta märkena (som bjorkStam); plantan har ingen stam och står kvar som den är
let stammar = false;
function stamCanvas(b: TradBild) {
  const hs2 = Math.max(3, Math.round(b.h * 0.3)), w = b.bjork ? (b.h < 14 ? 1 : b.h < 36 ? 2 : 3) : b.h > 12 ? 2 : 1;
  const c = document.createElement('canvas'); c.width = w; c.height = hs2;
  const g = c.getContext('2d')!, img = g.createImageData(w, hs2), d = img.data;
  for (let y = 0; y < hs2; y++) for (let x = 0; x < w; x++) {
    const nere = hs2 - 1 - y;
    const v = b.bjork ? (nere < 2 ? I('kol', 2) : hs(Math.floor(y / 2), x, 432) < 0.18 ? I('kol', 1) : x === w - 1 && w > 1 ? I('ben', 1) : I('ben', 3))
      : b.typ === 'torr' ? (x === w - 1 && w > 1 ? I('skiffer', 1) : I('skiffer', 2)) : x === w - 1 && w > 1 ? JORD : JORD + 1;
    const n = RGBA[v], i = (y * w + x) * 4; d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function stamTex(b: TradBild) {
  const k = 'S|' + nyckel(b, 0);
  let t = bilder.get(k);
  if (!t) { t = { t: PIXI.Texture.from(stamCanvas(b), { scaleMode: PIXI.SCALE_MODES.NEAREST }), fot: 0 }; bilder.set(k, t); }
  return t;
}
// slår på eller av stammarna; true om det ändrades (då ritar terrang.ts om träden)
export function visaStammar(pa: boolean) {
  if (stammar === pa) return false;
  stammar = pa;
  return true;
}

// ---------- träden på kartan ----------
const sprites = new Map<number, { sp: PIXI.Sprite; k: string; b: TradBild; x: number; y: number }>();
let skuggaAndrad = true;
// bild(i): trädet på rutan i (eller null), sno: hur mycket snö som ligger på grenarna (0–1, steg 5.1.13)
// lager: figurLayer (scen.ts), där träden står i ordning söderut med folket och djuren
export function stallTrad(lager: PIXI.Container, W: number, H: number, bild: (i: number) => TradBild | null, sno: number) {
  for (let i = 0; i < W * H; i++) {
    const b = bild(i), x = i % W, y = (i / W) | 0, stam = stammar && !!b && b.h >= 8, k = b ? (stam ? 'S|' : '') + nyckel(b, sno) : '';
    const f = sprites.get(i);
    if (f?.k === k) continue;
    skuggaAndrad = true;
    if (!b) { if (f) { f.sp.destroy(); sprites.delete(i); } continue; }
    const sp = f?.sp ?? Object.assign(new PIXI.Sprite(), { cullable: true }); // ett träd utanför skärmen ritas inte (steg 9.1.3)
    const tx = stam ? stamTex(b) : tradTex(b, sno), t = sp.texture = tx.t;
    const bx = x * 16 + 8 + Math.round((hash(x, y, 595) - 0.5) * 8), by = y * 16 + 14 + Math.round((hash(x, y, 596) - 0.5) * 4);
    sp.position.set(bx - (t.width >> 1), by - (t.height - tx.fot) + 1 + (b.typ === 'torr' ? 1 : 0)); sp.zIndex = by;
    if (!f) lager.addChild(sp);
    sprites.set(i, { sp, k, b, x: bx, y: by });
  }
}
// trädens skuggor på marken (steg 5.1.8, ui/skugga.ts): bildstilens oval vid foten, ungefär så bred som kronan (den döda
// granen har tunna grenar och en smalare skugga). Ritas om bara när träden ändras, eller när skuggan blir längre
let skuggLang = -1;
export function tradSkuggor(lang = 1) {
  if (!skuggaAndrad && lang === skuggLang) return;
  skuggaAndrad = false; skuggLang = lang;
  const fasta = skuggTrad();
  fasta.clear().beginFill(0xffffff);
  for (const { b, x, y } of sprites.values()) {
    const w = b.typ === 'buske' ? 6 : Math.max(1, Math.round(b.h * (b.typ === 'torr' && !b.bjork ? 0.2 : b.bjork ? 0.3 : 0.28)));
    fotSkugga(fasta, x, y, w, b.h < 8 ? 2 : 5, lang);
  }
  fasta.endFill();
}

// Träden skymmer inte (steg 5.1.4.6): en krona som står framför (söder om) något man behöver se, folk, djur, saker på
// marken, byggen eller det man valt, blir halvgenomskinlig. punkter = det som syns, i rutor (mitten av rutan = x + 0.5).
// Runt folket och det man valt (nara, steg 6.8.14) blir alla kronor som når inom NARA rutor helt genomskinliga, så att bara
// stammen ritas kvar (steg 9.2.88), och de som når inom NARA_KANT rutor rastrade, en tonad kant så att det inte blinkar när
// någon går förbi
export const GENOM = 0.45, GENOM_KANT = 0.72, NARA = 2, NARA_KANT = 3;
// trädet som tonats: bilden och platsen det hade (stammen har en annan storlek och ritas på samma fot)
const tonade = new Map<PIXI.Sprite, { t: PIXI.Texture; x: number; y: number }>();
// den genomsiktliga kronan (steg 5.5.1): samma bild med punkterna borttagna i ett rastermönster (andelen kvar), så att det
// som står bakom syns mellan punkterna utan att några nya färger blandas fram
const genomAv = [new Map<PIXI.Texture, PIXI.Texture>(), new Map<PIXI.Texture, PIXI.Texture>()], helAv = new Map<PIXI.Texture, PIXI.Texture>();
function genomTex(t: PIXI.Texture, niva: 0 | 1) {
  t = helAv.get(t) ?? t;
  let g = genomAv[niva].get(t);
  if (!g) {
    const src = t.baseTexture.resource as unknown as { source?: CanvasImageSource } | undefined, f = t.frame, kvar = niva ? GENOM_KANT : GENOM;
    if (!src?.source) return t;
    const c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
    const x = c.getContext('2d')!; x.drawImage(src.source, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
    const d = x.getImageData(0, 0, f.width, f.height);
    for (let y = 0; y < f.height; y++) for (let i = 0; i < f.width; i++) if (!rasterPa(kvar, i, y)) d.data[(y * f.width + i) * 4 + 3] = 0;
    x.putImageData(d, 0, 0);
    g = PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST });
    genomAv[niva].set(t, g); helAv.set(g, t);
  }
  return g;
}
export function tonaTrad(punkter: { x: number; y: number }[], nara: { x: number; y: number }[], W: number, H: number) {
  // 2 = bara stammen (närmast folket), 0 = rastrerad, 1 = lite rastrerad; den starkaste gäller
  const nu = new Map<PIXI.Sprite, 0 | 1 | 2>(), styrka = [1, 0, 2], fran = new Map<PIXI.Sprite, (typeof sprites extends Map<number, infer V> ? V : never)>();
  const satt = (sp: PIXI.Sprite, n: 0 | 1 | 2) => { const f = nu.get(sp); if (f === undefined || styrka[n] > styrka[f]) nu.set(sp, n); };
  // trädets hela bild och plats, också när det redan är tonat: avståndet mäts alltid till hela kronan, annars blir det
  // stam när någon står nära, och stammen är längre bort, så att kronan kommer tillbaka i nästa bildruta och trädet blinkar
  const hela = (sp: PIXI.Sprite) => { const o = tonade.get(sp); return o && (helAv.has(sp.texture) || stamBilder.has(sp.texture)) ? { x: o.x, y: o.y, w: o.t.width, h: o.t.height } : { x: sp.x, y: sp.y, w: sp.texture.width, h: sp.texture.height }; };
  for (const p of punkter) {
    const px = p.x * 16 + 8, fot = p.y * 16 + 14, tx = Math.floor(p.x + 0.5), ty = Math.floor(p.y + 0.5);
    for (let dy = 0; dy <= 4; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const f = sprites.get(y * W + x);
      if (!f || nu.get(f.sp) === 2 || f.sp.zIndex <= fot) continue;
      const sp = f.sp, e = hela(sp), l = e.x + 1, r = e.x + e.w - 1, t = e.y, b = e.y + e.h;
      // själva saken och en bit upp (huvudet på den som står där)
      if (px >= l && px <= r && ((fot >= t && fot <= b) || (fot - 8 >= t && fot - 8 <= b))) satt(sp, 0);
    }
  }
  // ringen runt folket och det valda: avståndet från mitten av figuren till kronans bild, i rutor
  for (const p of nara) {
    const px = p.x * 16 + 8, py = p.y * 16 + 6, tx = Math.floor(p.x + 0.5), ty = Math.floor(p.y + 0.5);
    for (let dy = -NARA_KANT - 1; dy <= NARA_KANT + 5; dy++) for (let dx = -NARA_KANT - 3; dx <= NARA_KANT + 3; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const f = sprites.get(y * W + x);
      if (!f || f.b.typ === 'buske' || nu.get(f.sp) === 2) continue;
      fran.set(f.sp, f);
      const sp = f.sp, e = hela(sp), ex = Math.max(e.x + 2 - px, 0, px - (e.x + e.w - 2)), ey = Math.max(e.y + 2 - py, 0, py - (e.y + e.h * 0.75));
      const d = Math.hypot(ex, ey) / 16;
      if (d <= NARA) satt(sp, f.b.h >= 8 ? 2 : 0); else if (d <= NARA_KANT) satt(sp, 1);
    }
  }
  // det som inte längre tonas får tillbaka sin bild och plats (om inte trädet ritats om under tiden)
  for (const [sp, o] of tonade) if (!nu.has(sp) && !sp.destroyed && (helAv.has(sp.texture) || stamBilder.has(sp.texture))) { sp.texture = o.t; sp.position.set(o.x, o.y); }
  for (const [sp, n] of nu) {
    const o = tonade.get(sp), hel = o && (helAv.has(sp.texture) || stamBilder.has(sp.texture)) ? o : { t: sp.texture, x: sp.x, y: sp.y };
    tonade.set(sp, hel);
    const f = fran.get(sp);
    if (n === 2 && f) { // bara stammen, på samma fot som trädet
      const st = stamTex(f.b).t; stamBilder.add(st);
      sp.texture = st; sp.position.set(f.x - (st.width >> 1), f.y - st.height + 1);
    } else { sp.texture = genomTex(hel.t, n === 2 ? 0 : n); sp.position.set(hel.x, hel.y); }
  }
  for (const sp of [...tonade.keys()]) if (!nu.has(sp)) tonade.delete(sp);
}
const stamBilder = new Set<PIXI.Texture>();
