import * as PIXI from 'pixi.js';
import { Bit, MATERIAL, State, bitAt } from '../sim';
import { TS, husLayer } from './scen';

// ---------- husets utseende: timmerväggen och trägolvet som pixelbilder (steg 2.2.13) ----------
// Varje ruta är 8 × 8 punkter (2 världspixlar per punkt). Timmerväggen (Björn valde V3f efter v55) är en stock längs
// väggen, med stockändarna i hörnen som i en knuttimrad stuga och en stockände på var sida om dörröppningen. Trägolvet
// (Gd) är plankor uppifrån och ner med förskjutna skarvar och låg kontrast; plankorna går ut i dörröppningen. Huset slutar
// med timret (Gd3): där stockarna inte täcker väggrutan syns gräset utanför och golvet innanför. Bilden för en ruta beror på
// grannarna och görs en gång (en cache); ris- och jordgolv, risväggar och det som inte är påbörjat ritas som förut (foremal.ts).

const FARG: Record<string, string> = {
  k: '#5e3e22', b: '#8a5e34', B: '#b8885a', e: '#d8b480', E: '#efd3a0', d: '#4a3018', // stocken och stockändarna
  F: '#a27a4e', f: '#9a7248', D: '#86603c', // plankorna och fogarna
};
// vad som står på rutan, som en bokstav: W = vägg, G = trägolv, J = annat golv (färgen ur MATERIAL), O = öppning,
// P = öppning med plankor (trägolvet ligger bredvid), . = inget
const slag = (b?: Bit) => !b ? '.' : b.k === 'vagg' ? 'W' : b.k === 'oppning' ? 'O' : b.m === 'tra' ? 'G' : 'J';
// golvet: plankor tre punkter breda, en skarv var elfte punkt, förskjuten fyra punkter för varje planka (Gd)
function planka(gx: number, gy: number) {
  const c = Math.floor(gx / 3), x = gx % 3, sy = (gy + c * 4) % 11;
  if (x === 0 || sy === 0 || (sy === 1 && x === 2)) return 'D';
  return x === 1 ? 'F' : 'f';
}
// stocken tvärs över: mörk kant, ljus mitt
const STOCK = ['.', 'k', 'b', 'B', 'B', 'b', 'k', '.'];
// stockänden: ringar runt mitten (cx, cy), r = hur stor
function ande(lx: number, ly: number, cx: number, cy: number, r: number[]) {
  const d = Math.hypot(lx - cx, ly - cy);
  return d < r[0] ? 'E' : d < r[1] ? 'e' : d < r[2] ? 'd' : '';
}
// väggen V3f: n = grannarnas slag i ordningen vänster, höger, upp, ner
function vagg(n: string, lx: number, ly: number) {
  const [l, r, u, d] = [...n].map(c => c === 'W'), o = [...n].map(c => c === 'O' || c === 'P');
  let h = l || r, v = u || d;
  if (!h && !v) h = o[0] || o[1] || !(o[2] || o[3]); // ensam vägg: stocken ligger längs öppningen
  // hörnet: stockändarna när väggen går åt två håll, också när en dörröppning ligger på ena sidan om hörnet (steg 3.6.7)
  const horn = (h || o[0] || o[1]) && (v || o[2] || o[3]) && (h || v);
  if (horn) { const a = Math.hypot(lx - 3.5, ly - 3.5); if (a < 2.2) return Math.round(a * 2) % 2 ? 'e' : 'E'; if (a < 3.3) return 'd'; }
  // dörrposterna: en stockände på var sida om öppningen. Inte i ett hörn, där hörnets stockändar redan slutar väggen mot
  // öppningen (steg 3.10.7: annars stack en bit av posten ut ovanför hörnet)
  const R = [1.3, 2.1, 2.6];
  const post = horn ? '' : o[0] && lx <= 2 ? ande(lx, ly, 1.5, 3.5, R) : o[1] && lx >= 5 ? ande(lx, ly, 5.5, 3.5, R)
    : o[2] && ly <= 2 ? ande(lx, ly, 3.5, 1.5, R) : o[3] && ly >= 5 ? ande(lx, ly, 3.5, 5.5, R) : '';
  if (post) return post;
  const inH = h && ly >= 1 && ly <= 6 && lx >= (l ? 0 : 1) && lx <= (r ? 7 : 6);
  const inV = v && lx >= 1 && lx <= 6 && ly >= (u ? 0 : 1) && ly <= (d ? 7 : 6);
  const k = inV ? STOCK[lx] : inH ? STOCK[ly] : '.';
  return k === '.' ? '' : k;
}
const cache = new Map<string, HTMLCanvasElement>();
const tex = new Map<string, PIXI.Texture>();
// bilden för rutan b: n8 = grannarnas slag runt om (vänster, höger, upp, ner, och hörnen uppe till vänster, uppe till höger,
// nere till vänster, nere till höger), j = färgen på annat golv bredvid
function bild(s: State, b: Bit) {
  const at = (dx: number, dy: number) => bitAt(s, b.x + dx, b.y + dy);
  const nb = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => at(dx, dy));
  // öppningen får plankor när trägolvet ligger bredvid
  const golvO = (q?: Bit) => !!q && q.k === 'oppning' && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => slag(bitAt(s, q.x + dx, q.y + dy)) === 'G');
  const n8 = nb.map(q => golvO(q) ? 'P' : slag(q)).join('');
  const egen = b.k === 'oppning' ? (golvO(b) ? 'G' : '') : slag(b);
  if (egen !== 'W' && egen !== 'G') return undefined;
  const key = `${b.x},${b.y},${egen},${n8}`;
  let c = cache.get(key);
  if (c) return { key, c };
  c = document.createElement('canvas'); c.width = 8; c.height = 8;
  const g = c.getContext('2d')!;
  const jord = (q?: Bit) => '#' + (MATERIAL[q?.m ?? 'jord']?.farg ?? MATERIAL.jord.farg).toString(16).padStart(6, '0');
  for (let ly = 0; ly < 8; ly++) for (let lx = 0; lx < 8; lx++) {
    const gx = b.x * 8 + lx, gy = b.y * 8 + ly;
    let k = egen === 'G' ? planka(gx, gy) : vagg(n8, lx, ly), col = k ? FARG[k] : '';
    if (!k) {
      // där stocken inte täcker rutan: golvet om grannen åt det hållet är golv, annars syns marken (genomskinligt)
      const dx = lx <= 1 ? -1 : lx >= 6 ? 1 : 0, dy = ly <= 1 ? -1 : ly >= 6 ? 1 : 0;
      for (const [ax, ay] of [[dx, 0], [0, dy], [dx, dy]]) {
        if (!ax && !ay) continue;
        const i = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].findIndex(([x, y]) => x === ax && y === ay);
        if (n8[i] === 'G' || n8[i] === 'P') { col = FARG[planka(gx, gy)]; break; }
        if (n8[i] === 'J') { col = jord(nb[i]); break; }
      }
    }
    if (col) { g.fillStyle = col; g.fillRect(lx, ly, 1, 1); }
  }
  if (cache.size > 4000) { cache.clear(); for (const t of tex.values()) t.destroy(true); tex.clear(); }
  cache.set(key, c);
  return { key, c };
}
// genomskinligheten: det som byggs syns svagt, och en sliten vägg bleknar (som förut)
const alfa = (b: Bit) => b.k === 'vagg' ? (b.b >= 1 ? 0.55 + 0.45 * b.c : 0.25 + 0.5 * b.b) : b.k === 'golv' ? (b.b >= 1 ? 1 : 0.12 + 0.3 * b.b) : 1;
// ritar det som har en pixelbild och säger vilka rutor det var, så att foremal.ts hoppar över dem
export function ritaHus(s: State, bits: Bit[]) {
  let n = 0;
  const klara = new Set<number>();
  for (const b of bits) {
    if (b.k === 'vagg' && (b.m !== 'timmer' || (b.b <= 0 && b.mat <= 0))) continue;
    if (b.k === 'golv' && b.m !== 'tra') continue;
    const r = bild(s, b);
    if (!r) continue;
    let t = tex.get(r.key);
    if (!t) { t = PIXI.Texture.from(r.c, { scaleMode: PIXI.SCALE_MODES.NEAREST }); tex.set(r.key, t); }
    let sp = husLayer.children[n++] as PIXI.Sprite | undefined;
    if (!sp) { sp = new PIXI.Sprite(); husLayer.addChild(sp); }
    sp.texture = t; sp.position.set(b.x * TS, b.y * TS); sp.scale.set(TS / 8); sp.alpha = alfa(b); sp.visible = true;
    klara.add(b.id);
  }
  for (let i = n; i < husLayer.children.length; i++) husLayer.children[i].visible = false;
  return klara;
}
