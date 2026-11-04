import * as PIXI from 'pixi.js';
import { Bit, State, bitAt, housesOf } from '../sim';
import { smutsGrad, smutsigFarg } from './slitbild';
import { KARTBILDER } from '../kartbilder';
import { TS, husLayer } from './scen';
import { takYtor, vaggSkuggor } from './skugga';

// ---------- husets utseende: timmerväggen och golven som pixelbilder (steg 2.2.13, 16 punkter per ruta i steg 5.1.2.4) ----------
// Varje ruta är 16 × 16 punkter (en världspixel per punkt). Bilderna är bildstilens godkända (5.2.4.4, kartbilder.ts): timmerväggen
// (timmervagg, ett rum på 4 × 4 rutor med hörn, väggar och en dörröppning) och golven (golv_tra, golv_jord, golv_lera, mönster
// som upprepas). Stocken ligger tolv punkter tjock mitt på väggrutan, med stockändarna i hörnen som i en knuttimrad stuga och
// rakt avsågade stockar mot dörröppningen. Där stockarna inte täcker väggrutan syns marken utanför och golvet innanför, och
// golvet går ut i dörröppningen. Bilden för en ruta beror på grannarna och görs en gång (en cache); risväggarna och det som inte
// är påbörjat ritas som förut (foremal.ts).

const VAGG = KARTBILDER.timmervagg!;
const GOLV: Record<string, string> = { tra: 'golv_tra', jord: 'golv_jord', ho: 'golv_jord', lera: 'golv_lera' };
const mod = (a: number, n: number) => ((a % n) + n) % n;
const golvPx = (m: string | undefined, gx: number, gy: number) => {
  const b = KARTBILDER[GOLV[m ?? 'jord'] ?? 'golv_jord']!;
  return b.pal[b.rader[mod(gy, b.h)]![mod(gx, b.w)]!] ?? '';
};
const mallPx = (x: number, y: number) => VAGG.pal[VAGG.rader[y]![x]!] ?? '';
// vad som står på rutan, som en bokstav: W = vägg, G = golv, O = öppning, P = öppning med golv (golvet ligger bredvid), . = inget
const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const N8 = [...N4, [-1, -1], [1, -1], [-1, 1], [1, 1]];
// golvet på rutan q: dess eget, eller för en öppning golvet bredvid (trägolvet först)
function golvM(s: State, q?: Bit): string | undefined {
  if (!q) return undefined;
  if (q.k === 'golv') return q.m;
  if (q.k !== 'oppning') return undefined;
  let m: string | undefined;
  for (const [dx, dy] of N4) { const r = bitAt(s, q.x + dx!, q.y + dy!); if (r?.k === 'golv' && (!m || r.m === 'tra')) m = r.m; }
  return m;
}
const slag = (s: State, b?: Bit) => !b ? '.' : b.k === 'vagg' ? 'W' : b.k === 'oppning' ? (golvM(s, b) ? 'P' : 'O') : 'G';
// väggpunkten (lx, ly) på rutan gx0, gy0 ur mallen: n = grannarnas slag i ordningen vänster, höger, upp, ner. Tomt = ingen stock
function vagg(n: string, lx: number, ly: number, gx: number, gy: number) {
  const [l, r, u, d] = [...n].map(c => c === 'W'), o = [...n].map(c => c === 'O' || c === 'P');
  let h = l || r, v = u || d;
  if (!h && !v) h = o[0] || o[1] || !(o[2] || o[3]); // ensam vägg: stocken ligger längs öppningen
  const inne = (a: number) => a >= 2 && a <= 13;
  // hörnet: stockändarna (mallens hörn uppe till vänster) när väggen går åt två håll, också när en dörröppning ligger på ena
  // sidan om hörnet (steg 3.6.7)
  const horn = (h || o[0] || o[1]) && (v || o[2] || o[3]) && (h || v);
  if (horn && inne(lx) && inne(ly)) return mallPx(lx, ly);
  // mot en öppning slutar stocken rakt avsågad (Björn valde version 1 efter v245, steg 4.5.2): en mörk såglinje och den ljusa
  // ändytan mot öppningen, som i mallens nedre vägg. Inte i ett hörn. Räknat som om öppningen ligger till höger: uu = längs
  // väggen mot öppningen, vv = tvärs över väggen
  const uv = horn ? null : o[1] ? [lx, ly] : o[0] ? [15 - lx, ly] : o[3] ? [ly, lx] : o[2] ? [15 - ly, lx] : null;
  if (uv && inne(uv[1]!)) {
    const [uu, vv] = uv as [number, number];
    if (uu >= 14) return vv >= 3 && vv <= 12 ? mallPx(32, 51) : '';
    if (uu === 13) return mallPx(34, 50);
  }
  // stocken: mallens övre vägg (vågrät) och vänstra vägg (lodrät), två rutor långa så att mönstret inte upprepas på varje ruta
  if (h && inne(ly) && lx >= (l ? 0 : 2) && lx <= (r ? 15 : 13)) return mallPx(16 + mod(gx, 32), ly);
  if (v && inne(lx) && ly >= (u ? 0 : 2) && ly <= (d ? 15 : 13)) return mallPx(lx, 16 + mod(gy, 32));
  return '';
}
const cache = new Map<string, HTMLCanvasElement>(), formCache = new Map<string, HTMLCanvasElement | null>();
const tex = new Map<string, PIXI.Texture>(), formTex = new Map<string, PIXI.Texture>();
// bilden för rutan b: n8 = grannarnas slag runt om (vänster, höger, upp, ner, och hörnen uppe till vänster, uppe till höger,
// nere till vänster, nere till höger), m8 = golvet hos dem
function bild(s: State, b: Bit) {
  const nb = N8.map(([dx, dy]) => bitAt(s, b.x + dx!, b.y + dy!));
  const n8 = nb.map(q => slag(s, q)).join(''), m8 = nb.map(q => golvM(s, q) ?? '-');
  const egen = slag(s, b), em = golvM(s, b);
  if (egen !== 'W' && !em) return undefined;
  // golvet blir smutsigare ju längre huset stått färdigt (steg 5.1.7.3), och öppningen, där alla går, ett steg till
  const hus = b.hus !== undefined ? housesOf(s).find(h => h.id === b.hus) : undefined;
  const klar = hus?.varKlar ?? hus?.klar, sg = klar !== undefined ? smutsGrad(s.now, klar) : 0, extra = egen === 'P' ? 1 : 0;
  const key = `${b.x},${b.y},${egen},${em},${n8},${m8.join('')},${sg}`;
  let c = cache.get(key);
  if (c) return { key, c, m: formCache.get(key) ?? null };
  c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d')!;
  // väggens form (stockarna), som kastar skugga på marken och golvet (steg 5.1.8, ui/skugga.ts)
  let m: HTMLCanvasElement | null = null, gm: CanvasRenderingContext2D | null = null;
  for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
    const gx = b.x * 16 + lx, gy = b.y * 16 + ly;
    let col = egen === 'W' ? vagg(n8, lx, ly, gx, gy) : golvPx(em, gx, gy), golv = egen !== 'W';
    if (col && !golv) {
      if (!gm) { m = document.createElement('canvas'); m.width = 16; m.height = 16; gm = m.getContext('2d')!; gm.fillStyle = '#fff'; }
      gm.fillRect(lx, ly, 1, 1);
    }
    if (!col) {
      golv = true;
      // där stocken inte täcker rutan: golvet om grannen åt det hållet har golv, annars syns marken (genomskinligt)
      const dx = lx <= 1 ? -1 : lx >= 14 ? 1 : 0, dy = ly <= 1 ? -1 : ly >= 14 ? 1 : 0;
      for (const [ax, ay] of [[dx, 0], [0, dy], [dx, dy]]) {
        if (!ax && !ay) continue;
        const i = N8.findIndex(([x, y]) => x === ax && y === ay);
        if (m8[i] !== '-') { col = golvPx(m8[i], gx, gy); break; }
      }
    }
    if (col && golv && sg) col = smutsigFarg(col, gx, gy, sg, 0, extra);
    if (col) { g.fillStyle = col; g.fillRect(lx, ly, 1, 1); }
  }
  if (cache.size > 4000) { cache.clear(); formCache.clear(); for (const t of tex.values()) t.destroy(true); tex.clear(); for (const t of formTex.values()) t.destroy(true); formTex.clear(); }
  cache.set(key, c); formCache.set(key, m);
  return { key, c, m };
}
// genomskinligheten: det som byggs syns svagt, och en sliten vägg bleknar (som förut)
// ritar det som har en pixelbild och säger vilka rutor det var, så att foremal.ts hoppar över dem
export function ritaHus(s: State, bits: Bit[]) {
  let n = 0;
  const klara = new Set<number>(), former: { x: number; y: number; t: PIXI.Texture }[] = [], tak: { x: number; y: number; t: PIXI.Texture; form?: PIXI.Texture }[] = [];
  for (const b of bits) {
    if (b.k === 'vagg' && (b.m !== 'timmer' || (b.b <= 0 && b.mat <= 0))) continue;
    const r = bild(s, b);
    if (!r) continue;
    let t = tex.get(r.key);
    if (!t) { t = PIXI.Texture.from(r.c, { scaleMode: PIXI.SCALE_MODES.NEAREST }); tex.set(r.key, t); }
    let sp = husLayer.children[n++] as PIXI.Sprite | undefined;
    if (!sp) { sp = new PIXI.Sprite(); husLayer.addChild(sp); }
    sp.texture = t; sp.position.set(b.x * TS, b.y * TS); sp.scale.set(TS / 16); sp.alpha = 1; // hel bild, även medan den byggs och när den slits (steg 5.5.1: inga genomskinliga färger) sp.visible = true;
    klara.add(b.id);
    if (r.m && b.k === 'vagg' && b.b >= 1) { // en färdig vägg kastar skugga
      let f = formTex.get(r.key);
      if (!f) { f = PIXI.Texture.from(r.m, { scaleMode: PIXI.SCALE_MODES.NEAREST }); formTex.set(r.key, f); }
      former.push({ x: b.x * TS, y: b.y * TS, t: f });
      tak.push({ x: b.x * TS, y: b.y * TS, t, form: f }); // golvet bredvid stocken ligger under taket
    } else if (b.k !== 'vagg' && (b.k !== 'golv' || b.b >= 1)) tak.push({ x: b.x * TS, y: b.y * TS, t }); // golvet och dörröppningen
  }
  for (let i = n; i < husLayer.children.length; i++) husLayer.children[i].visible = false;
  vaggSkuggor(former); takYtor(tak);
  return klara;
}
