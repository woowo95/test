// Vägsökning och mark: invånarna går runt vatten och följer gärna stigar.
// Jordrutor (gräs och skog på kartan) har två lager: träd (0 = inga, 1 = vuxen skog) och marktäcke under dem
// (1 = högt gräs, mitten = kort gräs, under BAR = bar jord; en stig är bar jord i en linje).
import { clampI } from './slump';
import { T, W, H, inMap } from './typer';
import { balans } from './balans';

// Balanstal (regel 8): hur fort man går på olika mark, hur gärna man följer en stig och hur marken nöts. Hur fort marken
// växer tillbaka och när den är skog står i MARK (mark.ts). Hur snabbt en människa går står i STEG.fart (steg.ts)
export const VAG = balans('vag', {
  fartMark: [0, 0.9, 1, 1, 0.8, 0.85], // fart (gånger gångfarten) på vatten, sand, de två jordslagen, sten och torr sjöbotten (steg 3.8.2)
  fartSkog: 0.6, // ... på en ruta med skog
  fartUng: 0.75, // ... med ungskog
  fartHog: 0.8, // ... med högt gräs (kort gräs och stigar går man fortast på: 1)
  ungskog: 0.15, // träd från detta värde är en ungskog (under det är det plantor som ännu inte räknas)
  stigBas: 0.45, // kostnaden att gå in på en jordruta är stigBas + stigTacke * marktäcket: orörd mark kostar mer än en stig
  stigTacke: 0.55,
  trampHog: 0.75, // högt gräs trampas ner direkt till så här högt ...
  trampPlanta: 4, // ... och en liten planta (under skog) trampas ihjäl så här många gånger fortare än gräset nöts
  fartSaker: 0.5, // fart (gånger farten på marken) över lösa saker och högar på golvet (steg 2.3.6)
  sokVikt: 0.52, // sökningen räknar så mycket per ruta som är kvar till målet: mer än den billigaste rutan (stigBas), så att den går fort och hellre tar den raka vägen
});

// solid = väggar, built = byggda eller planerade rutor, hinder = hyllor, kistor och ställ (går inte att gå igenom, stationer.ts),
// lost = rutor med lösa saker på golvet (långsamma, lager.ts). Steg 2.3.6
export interface Ground { tiles: Uint8Array; cover: Float32Array; trees: Float32Array; solid?: Uint8Array; built?: Uint8Array; hinder?: Uint8Array; lost?: Uint8Array }
export const HIGH = 0.9, BAR = 0.3; // högt gräs över HIGH, bar jord under BAR
export const FOREST = 0.5; // träd från detta värde räknas som skog
export const isSoil = (t: number) => t === T.Gras || t === T.Skog;
const SQ2 = Math.SQRT2;

// fart på en ruta: skog långsammast, högt gräs medel, kort gräs och stig snabbast. Över saker på golvet långsammare
export const speedAt = (g: Ground, i: number) => markFart(g, i) * (g.lost?.[i] ? VAG.fartSaker : 1);
function markFart(g: Ground, i: number) {
  const t = g.tiles[i];
  if (!isSoil(t)) return VAG.fartMark[t];
  const tr = g.trees[i];
  if (tr >= FOREST) return VAG.fartSkog;
  if (tr >= VAG.ungskog) return VAG.fartUng;
  return g.cover[i] >= HIGH ? VAG.fartHog : 1;
}
// kostnad att gå in på en ruta: man följer hellre en upptrampad stig än går över orörd mark
const stepCost = (g: Ground, i: number) => (isSoil(g.tiles[i]) ? VAG.stigBas + VAG.stigTacke * g.cover[i] : 1) / speedAt(g, i);

// vatten, väggar och hyllor går man inte genom
const stop = (g: Ground, i: number) => g.tiles[i] === T.Vatten || g.solid?.[i] === 1 || g.hinder?.[i] === 1;

class Heap {
  private ids: number[] = []; private keys: number[] = [];
  get size() { return this.ids.length; }
  clear() { this.ids.length = 0; this.keys.length = 0; }
  push(id: number, k: number) {
    const a = this.ids, b = this.keys;
    let i = a.length; a.push(id); b.push(k);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (b[p] <= k) break;
      a[i] = a[p]; b[i] = b[p]; i = p;
    }
    a[i] = id; b[i] = k;
  }
  pop() {
    const a = this.ids, b = this.keys, top = a[0];
    const id = a.pop()!, k = b.pop()!;
    if (a.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mk = k;
        if (l < a.length && b[l] < mk) { m = l; mk = b[l]; }
        if (r < a.length && b[r] < mk) { m = r; mk = b[r]; }
        if (m === i) break;
        a[i] = a[m]; b[i] = b[m]; i = m;
      }
      a[i] = id; b[i] = k;
    }
    return top;
  }
}

// Vägsökningens arbetsminne återanvänds mellan sökningarna (findPath anropar aldrig sig själv). Varje sökning har
// ett eget nummer (gen): en ruta har ett värde (vägen hit, varifrån, stängd, stegkostnaden) bara om numret i den
// är sökningens, så inget behöver nollställas. Nytt minne när kartans storlek ändras (testerna kör byar med olika
// storlek i samma process). avst[dy, dx] = avståndet Math.hypot(dx, dy) till målet, för alla dx och dy på kartan
let gen = 0, aw = 0, ah = 0;
let sedd = new Uint32Array(0), stangd = new Uint32Array(0), kostad = new Uint32Array(0);
let gs = new Float64Array(0), kost = new Float64Array(0), came = new Int32Array(0), avst = new Float64Array(0);
const heap = new Heap();
function nySokning() {
  if (aw !== W || ah !== H) {
    const N = W * H;
    sedd = new Uint32Array(N); stangd = new Uint32Array(N); kostad = new Uint32Array(N);
    gs = new Float64Array(N); kost = new Float64Array(N); came = new Int32Array(N);
    avst = new Float64Array((2 * W + 1) * (2 * H + 1));
    for (let dy = -H; dy <= H; dy++) for (let dx = -W; dx <= W; dx++) avst[(dy + H) * (2 * W + 1) + dx + W] = Math.hypot(dx, dy);
    aw = W; ah = H; gen = 0;
  }
  if (++gen === 0xffffffff) { sedd.fill(0); stangd.fill(0); kostad.fill(0); gen = 1; }
  heap.clear();
}
// A* med 8 riktningar. Inte över vatten, väggar eller hyllor (målet får vara en hylla) och inte snett förbi en hörna. Start och mål får vara vatten.
// Ger rutorna mellan start och mål (utan båda), eller null om det inte finns någon väg.
export function findPath(g: Ground, x0: number, y0: number, x1: number, y1: number): number[] | null {
  const sx = clampI(x0, W), sy = clampI(y0, H), gx = clampI(x1, W), gy = clampI(y1, H);
  const start = sy * W + sx, goal = gy * W + gx;
  if (start === goal) return [];
  const tiles = g.tiles, solid = g.solid, hinder = g.hinder, aW = 2 * W + 1, sv = VAG.sokVikt;
  nySokning();
  sedd[start] = gen; gs[start] = 0; came[start] = -1; heap.push(start, 0);
  while (heap.size) {
    const i = heap.pop();
    if (i === goal) break;
    if (stangd[i] === gen) continue;
    stangd[i] = gen;
    const x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!inMap(nx, ny)) continue;
      const ni = ny * W + nx;
      if (stangd[ni] === gen || ((tiles[ni] === T.Vatten || solid?.[ni] || hinder?.[ni]) && ni !== goal)) continue;
      if (dx && dy && (stop(g, y * W + nx) || stop(g, ny * W + x))) continue;
      if (kostad[ni] !== gen) { kostad[ni] = gen; kost[ni] = tiles[ni] === T.Vatten ? 1 : stepCost(g, ni); }
      const ng = gs[i] + (dx && dy ? SQ2 : 1) * kost[ni];
      if (ng < (sedd[ni] === gen ? gs[ni] : Infinity)) { sedd[ni] = gen; gs[ni] = ng; came[ni] = i; heap.push(ni, ng + avst[(ny - gy + H) * aW + nx - gx + W] * sv); }
    }
  }
  if (sedd[goal] !== gen) return null;
  const out: number[] = [];
  for (let i = came[goal]; i !== start && i >= 0; i = came[i]) out.push(i);
  return out.reverse();
}
// rutorna man kan gå till från (x0, y0), med samma regler som vägsökningen: 1 = man kan gå dit, 2 = man kan ställa sig
// bredvid (en hylla, som vägsökningen når som mål), 0 = ingen väg dit (t.ex. ett hus där vattnet står innanför dörren)
export function nasbara(g: Ground, x0: number, y0: number) {
  const ut = new Uint8Array(W * H), st = [clampI(y0, H) * W + clampI(x0, W)];
  ut[st[0]] = 1;
  while (st.length) {
    const i = st.pop()!, x = i % W, y = (i - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, ni = ny * W + nx;
      if ((!dx && !dy) || !inMap(nx, ny) || ut[ni]) continue;
      if (dx && dy && (stop(g, y * W + nx) || stop(g, ny * W + x))) continue;
      if (stop(g, ni)) ut[ni] = 2; else { ut[ni] = 1; st.push(ni); }
    }
  }
  return ut;
}

// en person går över rutan: högt gräs trampas ner direkt till kort gräs, sedan nöts det långsamt till bar jord.
// Små plantor trampas ihjäl.
export function wear(g: Ground, i: number, amount: number) {
  if (i < 0 || i >= g.cover.length || !isSoil(g.tiles[i])) return;
  const c = g.cover;
  c[i] = c[i] > VAG.trampHog ? VAG.trampHog : Math.max(0, c[i] - amount);
  if (g.trees[i] > 0 && g.trees[i] < FOREST) g.trees[i] = Math.max(0, g.trees[i] - amount * VAG.trampPlanta);
}

export function encodeCover(cover: Float32Array) {
  let bin = '';
  for (let i = 0; i < cover.length; i++) bin += String.fromCharCode(Math.round(cover[i] * 255));
  return btoa(bin);
}
export function decodeCover(txt: string | undefined, fill = 1): Float32Array {
  const c = new Float32Array(W * H).fill(fill);
  if (!txt) return c;
  try { const bin = atob(txt); for (let i = 0; i < Math.min(bin.length, c.length); i++) c[i] = bin.charCodeAt(i) / 255; } catch { /* ny mark */ }
  return c;
}
