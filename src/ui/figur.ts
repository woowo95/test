// Folket i pixlar (steg 5.1.3.3, "Bildstil" under Gränssnitt i designdokumentet): figuren ur Porträttstilar i bildstilen
// (bildstil/sida.js, figur och ritaPerson), 14 × 20 punkter framifrån med fötterna nederst. Utseendet räknas ur personen:
// åldern (barn, gamla), könet (kjolen, håret), styrkan och uthålligheten (kroppen), humöret (munnen), skadorna (bandaget)
// och kläderna i personens färg (p.hue), så att man känner igen hen från raden. Hud, hår och frisyr räknas ur personens
// nummer och föräldrarna, tills porträttgeneratorn (steg 5.2.3.2) ger var och en sitt eget utseende. Bara palettens färger
// (narmast), med kolets mörkaste ton som kontur och ett steg ner och upp i samma ramp på skugg- och ljussidan.
import * as PIXI from 'pixi.js';
import { FARGER, narmast } from '../palett';

export const FW = 14, FH = 20;
export interface Utseende {
  barn: boolean; gammal: boolean; kvinna: boolean; stark: boolean; seg: boolean; ledsen: boolean; bandage: boolean;
  hud: string; har: string; frisyr: 'kort' | 'rufsig' | 'lang' | 'lockig' | 'tunn'; skagg: 'hel' | 'gra' | 'stubb' | 'ingen'; klader: string;
}
function hash(a: number, b: number) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const HUD = ['#f1d3b8', '#e2b893', '#c98e62', '#9a6644', '#6b4428'];
const HAR = ['#1e1712', '#16110d', '#5a3a1e', '#b4471f', '#c9a55a', '#7a5634'];
// hud och hår: från en av föräldrarna när de finns (barnen liknar dem), annars ur personens nummer
export function arv(id: number, mor?: number, far?: number) {
  const fr = (k: number) => { const f = hash(id, k) < 0.5 ? mor : far; return f !== undefined ? f : id; };
  return { hud: HUD[Math.floor(hash(fr(1), 11) * HUD.length)], har: HAR[Math.floor(hash(fr(2), 12) * HAR.length)] };
}
const hx2 = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const tillHex = (a: number[]) => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const blanda = (a: string, b: string, t: number) => { const x = hx2(a), y = hx2(b); return tillHex(x.map((v, i) => v + (y[i] - v) * t)); };
const morkare = (c: string, f: number) => tillHex(hx2(c).map(v => v * f));

// figuren som en lista med färger (hex) eller null, som i Porträttstilar
function figur(P: Utseende) {
  const g: (string | null)[] = Array(FW * FH).fill(null), set = (x: number, y: number, c: string | null) => { if (x >= 0 && x < FW && y >= 0 && y < FH) g[y * FW + x] = c; };
  const rect = (x0: number, y0: number, w: number, h: number, c: string) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };
  const child = P.barn, top = child ? 6 : 1, hair = P.har;
  const legC = morkare(P.klader, 0.6), foot = '#3a2a1c';
  if (child) { rect(5, 16, 2, 3, P.hud); rect(8, 16, 2, 3, P.hud); rect(4, 19, 3, 1, foot); rect(8, 19, 3, 1, foot); }
  else { rect(5, 14, 2, 5, legC); rect(8, 14, 2, 5, legC); rect(4, 19, 3, 1, foot); rect(8, 19, 3, 1, foot); }
  const tw = child ? 5 : P.stark ? 8 : P.seg ? 5 : 6, x0 = Math.round(7 - tw / 2), ty = top + 6, th = child ? 4 : 7;
  rect(x0, ty, tw, th, P.klader);
  if (P.kvinna && !child) rect(x0 - 1, ty + 5, tw + 2, 4, P.klader);
  const aw = P.stark && !child ? 2 : 1, armC = P.stark && !child ? P.hud : P.klader;
  rect(x0 - aw, ty, aw, th - 1, armC); rect(x0 + tw, ty, aw, th - 1, armC);
  set(x0 - 1, ty + th - 1, P.hud); set(x0 + tw + aw - 1, ty + th - 1, P.hud);
  if (P.stark && !child) rect(x0 + 2, ty, tw - 4, 3, P.hud);
  rect(4, top, 6, 6, P.hud);
  if (P.gammal) { set(4, top, null); set(9, top, null); }
  if (P.frisyr === 'kort') { rect(4, top, 6, 1, hair); set(4, top + 1, hair); set(9, top + 1, hair); }
  if (P.frisyr === 'rufsig') { rect(4, top, 6, 1, hair); set(4, top + 1, hair); set(9, top + 1, hair); set(5, top - 1, hair); set(7, top - 1, hair); set(9, top - 1, hair); }
  if (P.frisyr === 'lang') { rect(4, top, 6, 1, hair); rect(3, top, 1, child ? 5 : 9, hair); rect(10, top, 1, child ? 5 : 9, hair); set(4, top + 1, hair); set(9, top + 1, hair); }
  if (P.frisyr === 'lockig') { rect(3, top - 1, 8, 2, hair); rect(3, top + 1, 1, 3, hair); rect(10, top + 1, 1, 3, hair); set(3, top - 1, null); set(10, top - 1, null); }
  if (P.frisyr === 'tunn') { set(4, top + 1, hair); set(9, top + 1, hair); set(4, top + 2, hair); set(9, top + 2, hair); }
  set(5, top + 3, '#141010'); set(8, top + 3, '#141010');
  if (P.skagg === 'hel' || P.skagg === 'gra') { const b = P.skagg === 'gra' ? '#d8d4cc' : P.har; rect(4, top + 4, 6, 2, b); rect(5, top + 6, 4, 1, b); }
  else { set(6, top + 5, P.ledsen ? morkare(P.hud, 0.55) : blanda(P.hud, '#7a2a24', 0.5)); set(7, top + 5, blanda(P.hud, '#7a2a24', 0.5)); }
  if (P.skagg === 'stubb') { set(4, top + 5, blanda(P.hud, P.har, 0.4)); set(9, top + 5, blanda(P.hud, P.har, 0.4)); }
  if (P.bandage) { rect(4, top + 1, 6, 1, '#ebe3cf'); set(8, top + 1, '#9a2a20'); }
  return g;
}
const INDEX = new Map<string, number>();
const iPal = (hex: string) => { let i = INDEX.get(hex); if (i === undefined) { i = FARGER.indexOf(narmast(hex)); INDEX.set(hex, i); } return i; };
const RGBA = FARGER.map(h => parseInt(h.slice(1), 16));
// bilden: 16 × 22 punkter (figuren med konturen runt), fötterna på näst nedersta raden. Skuggan på marken
// ritas i ui/skugga.ts (steg 5.1.8).
// vald = konturen ljus (den man valt)
export const BW = FW + 2, BH = FH + 2;
function bild(u: Utseende, vald: boolean) {
  const g = figur(u).map(c => c === null ? null : iPal(c));
  const px = new Int16Array(BW * BH).fill(-1), satt = (x: number, y: number, c: number) => { px[y * BW + x] = c; };
  const upp = (v: number) => v % 4 < 3 ? v + 1 : v, ner = (v: number) => v % 4 > 0 ? v - 1 : v;
  const kontur = vald ? 31 : 0; // benets ljusaste eller kolets mörkaste
  for (let y = -1; y <= FH; y++) for (let x = -1; x <= FW; x++) {
    const at = (a: number, b: number) => (x + a >= 0 && x + a < FW && y + b >= 0 && y + b < FH) ? g[(y + b) * FW + x + a] : null;
    let v = at(0, 0);
    if (v === null) { if (at(1, 0) !== null || at(-1, 0) !== null || at(0, 1) !== null || at(0, -1) !== null) satt(x + 1, y + 1, kontur); continue; }
    if (at(1, 0) !== v && x > 6) v = ner(v); // skuggsidan till höger
    else if (at(-1, 0) !== v && x < 7) v = upp(v); // ljuset från vänster
    satt(x + 1, y + 1, v);
  }
  return px;
}
const bilder = new Map<string, PIXI.Texture>();
export function figurTex(u: Utseende, vald: boolean) {
  const k = JSON.stringify(u) + vald;
  let t = bilder.get(k);
  if (!t) {
    const px = bild(u, vald), c = document.createElement('canvas'); c.width = BW; c.height = BH;
    const g = c.getContext('2d')!, img = g.createImageData(BW, BH), d = img.data;
    for (let i = 0; i < px.length; i++) {
      const v = px[i]; if (v === -1) continue;
      const n = RGBA[v]; d[i * 4] = n >> 16; d[i * 4 + 1] = (n >> 8) & 255; d[i * 4 + 2] = n & 255; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    t = PIXI.Texture.from(c, { scaleMode: PIXI.SCALE_MODES.NEAREST });
    bilder.set(k, t);
  }
  return t;
}
