// ---------- världens mark (steg 11.2.5, Flera samhällen: Världen i tal: rutnätet och marken) ----------
// Världen är ett rutnät av världsrutor (blocket VARLD). Varje ruta har en marksort ur registret VARLDMARK: raden säger färgen
// och tecknet på världskartan, kostnaden att gå, vilka färdsätt som kommer fram, om där finns vatten och bete och vad marken
// ger en by som ligger där. Landet räknas fram ur världens frö: brus plus ett lyft (en stor ellips i mitten och några små
// lyft ute mot kanterna), och mot kartans kant sänks höjden så att hav omger allt. Formen kontrolleras efteråt (den största
// landmassan stor nog och över mitten, och några småöar); annars prövas nästa delfrö. Generatorns version sparas med marken,
// så att en sparad värld inte flyttar sig när generatorn ändras. Inget här drar ur byns slumpföljder: allt är brus och hash
// ur världens frö. Floderna och sjöarna kommer i steg 11.2.6; sjö finns redan som rad.
import { balans } from './balans';
import { vnoise } from './karta';
import { hash3 } from './slump';

export const VARLD = balans('varld', {
  bredd: 160, hojd: 104, // världsrutor
  gangPerDygn: 8, // världsrutor en frisk vuxen går per dygn i obanad slätt (ett dygn = ett år i spelet)
  storAndel: 0.45, // den största landmassan är minst så stor del av hela kartan
  minOar: 4, // så många småöar finns minst
  oMin: 3, // en ö är minst så många rutor (en ensam ruta är en klippa)
  // generatorn
  havsniva: 0.5,
  brus: 0.55, // hur mycket bruset höjer och sänker
  storLyft: 1, storRx: 0.47, storRy: 0.47, storFlytt: 0.04, // ellipsen i mitten: lyftet, radierna (andel av kartan) och hur långt mitten får flytta sig
  smaMin: 4, smaMax: 7, smaLyft: 0.8, smaR: [3, 7], smaAvst: 1, // de små lyften: antal, lyft, radie i rutor, och de ligger minst så långt ut i ellipsens mått (1 = dess kant)
  kant: 8, kantSank: 0.8, // inom så många rutor från kanten sänks höjden
  bergFran: 0.7, bergHojd: 1.5, // bergsbruset över så mycket blir berg (inne i landet), och höjer marken så mycket per enhet över
  lagland: 0.2, // under så högt över havet kan det bli myr
  myrFran: 0.58, tatFran: 0.6, skogFran: 0.44, // fukten där myr, tät skog och skog börjar
  forsok: 40, // så många delfrön prövas innan den bästa formen tas
  // vattnet (steg 11.2.6)
  sjoDjup: 0.03, sjoMin: 3, // en sänka som fylls minst så djupt blir sjö, om sjön får minst så många rutor
  kallor: 0.025, kallAvst: 8, // floder per bergsruta, och minst så många rutor mellan två källor
  flodMin: 8, // en flod som är kortare än så många rutor torkar ut och ritas inte
  bredFran: 140, // när så många rutor rinner till en flodruta är den det breda nedre loppet
  flodOvre: 3, flodNedre: 6, // det kostar extra att vada över floden (slätt = 1); en vagn kommer inte över det nedre loppet utan bro
});
// generatorns version: höjs när landet räknas annorlunda, så att en sparad värld behåller sitt land
export const VARLD_GEN = 1;

export type Fardsatt = 'fots' | 'packdjur' | 'vagn';
export interface MarkDef {
  namn: string;
  farg: readonly [string, 0 | 1 | 2 | 3]; // ramp och ton ur paletten (palett.ts)
  tecken?: string; // ett tecken på kartan (berg, granar); ritas i steg 11.2.16
  kostnad: number; // att gå en ruta, slätt = 1; Infinity i havet
  fram: readonly Fardsatt[]; // färdsätten som kommer fram
  vatten: boolean; bete: boolean;
  vanligt: readonly string[]; sallsynt: readonly string[]; // vad marken ger en by som ligger där (saker i SAKER)
  land: boolean;
}
const ALLA: readonly Fardsatt[] = ['fots', 'packdjur', 'vagn'];
export const VARLDMARK = {
  hav: { namn: 'Hav', farg: ['skiffer', 1], kostnad: Infinity, fram: [], vatten: false, bete: false, vanligt: ['fisk'], sallsynt: [], land: false },
  slatt: { namn: 'Slätt', farg: ['oliv', 3], kostnad: 1, fram: ALLA, vatten: false, bete: true, vanligt: ['korn'], sallsynt: ['lera'], land: true },
  skog: { namn: 'Skog', farg: ['oliv', 2], tecken: 'träd', kostnad: 1.4, fram: ALLA, vatten: false, bete: true, vanligt: ['ved', 'bar'], sallsynt: ['honung', 'svamp'], land: true },
  tat: { namn: 'Tät skog', farg: ['barr', 2], tecken: 'gran', kostnad: 2.5, fram: ['fots', 'packdjur'], vatten: false, bete: false, vanligt: ['virke', 'ved'], sallsynt: ['tjara', 'naver'], land: true },
  myr: { namn: 'Myr', farg: ['barr', 3], tecken: 'tuva', kostnad: 3, fram: ['fots'], vatten: true, bete: false, vanligt: ['bar'], sallsynt: ['lera'], land: true },
  berg: { namn: 'Berg', farg: ['skiffer', 2], tecken: 'berg', kostnad: 5, fram: ['fots', 'packdjur'], vatten: false, bete: false, vanligt: ['sten', 'flinta'], sallsynt: ['silver'], land: true },
  sjo: { namn: 'Sjö', farg: ['skiffer', 2], kostnad: Infinity, fram: [], vatten: true, bete: false, vanligt: ['fisk'], sallsynt: [], land: false },
} as const satisfies Record<string, MarkDef>;
export type MarkId = keyof typeof VARLDMARK;
// ordningen är rutans tal i marken (Uint8Array): ändras den, ändras VARLD_GEN
export const MARK_IDS = Object.keys(VARLDMARK) as MarkId[];
const NR = Object.fromEntries(MARK_IDS.map((k, i) => [k, i])) as Record<MarkId, number>;

export interface VarldMark {
  gen: number; fro: number; delfro: number; // generatorns version, världens frö och delfröet som gav formen
  w: number; h: number;
  mark: Uint8Array; // rutans nummer i MARK_IDS
  hojd?: Float32Array; // höjden över havet (negativ i havet); bara när landet räknas fram, den sparas inte
  flod: Uint8Array; // 0 ingen flod, FLOD_OVRE det övre loppet, FLOD_NEDRE det breda nedre (steg 11.2.6)
  ned: Int32Array; // rutan vattnet rinner till (-1 i havet och från en sjö ut i havet), för att rita floderna
}
export const FLOD_OVRE = 1, FLOD_NEDRE = 2;
export const flodAt = (v: VarldMark, x: number, y: number) => v.flod[y * v.w + x];
export const markAt = (v: VarldMark, x: number, y: number): MarkId => MARK_IDS[v.mark[y * v.w + x]];
export const arLand = (v: VarldMark, i: number) => VARLDMARK[MARK_IDS[v.mark[i]]].land;

// ett tal mellan 0 och 1 ur världens frö, ett nummer och ett ärende
const slump = (fro: number, n: number, arende: number) => hash3(fro, n, arende, 0x5741524c);
const fbm = (seed: number, x: number, y: number) =>
  vnoise(seed, x / 22, y / 22) * 0.5 + vnoise(seed + 7, x / 11, y / 11) * 0.3 + vnoise(seed + 13, x / 5, y / 5) * 0.2;

// höjden för ett delfrö: brus, den stora ellipsen, de små lyften ute i havet, kanten som sänks och bergen
const bergBrus = (seed: number, x: number, y: number) => vnoise(seed + 31, x / 9, y / 9) * 0.65 + vnoise(seed + 37, x / 4, y / 4) * 0.35;
function hojder(d: number, w: number, h: number): Float32Array {
  const V = VARLD, hj = new Float32Array(w * h), seed = Math.floor(slump(d, 0, 1) * 2 ** 31);
  const cx = w / 2 + (slump(d, 1, 2) - 0.5) * 2 * V.storFlytt * w, cy = h / 2 + (slump(d, 2, 2) - 0.5) * 2 * V.storFlytt * h;
  const ell = (x: number, y: number) => ((x - cx) / (V.storRx * w)) ** 2 + ((y - cy) / (V.storRy * h)) ** 2; // ellipsens mått i kvadrat
  const n = V.smaMin + Math.floor(slump(d, 3, 3) * (V.smaMax - V.smaMin + 1)), sma: { x: number; y: number; r: number }[] = [];
  for (let i = 0, f = 0; sma.length < n && f < 40 * n; f++, i++) { // en plats i havet, utanför ellipsen och innanför kanten
    const r = V.smaR[0] + slump(d, i, 6) * (V.smaR[1] - V.smaR[0]), m = V.kant + r;
    const x = m + slump(d, i, 4) * (w - 2 * m), y = m + slump(d, i, 5) * (h - 2 * m);
    if (ell(x, y) >= V.smaAvst ** 2 && sma.every(s => Math.hypot(s.x - x, s.y - y) > s.r + r + 2)) sma.push({ x, y, r });
  }
  const lyft = (q: number) => q < 1 ? 1 - q * q : 0; // q är avståndet i kvadrat: platt i mitten, mjukt ner till noll vid kanten
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = (fbm(seed, x, y) - 0.5) * V.brus;
    let z = b + V.storLyft * lyft(ell(x, y));
    for (const s of sma) { const q = ((x - s.x) ** 2 + (y - s.y) ** 2) / (s.r * s.r); if (q < 1) z = Math.max(z, b + V.smaLyft * lyft(q)); }
    const e = Math.min(x, y, w - 1 - x, h - 1 - y) / V.kant;
    if (e < 1) z -= V.kantSank * (1 - e) ** 2;
    if (e <= 0) z = Math.min(z, V.havsniva - 0.01); // yttersta raden är alltid hav
    z -= V.havsniva;
    const bb = bergBrus(seed, x, y);
    if (z > V.lagland && bb > V.bergFran) z += (bb - V.bergFran) * V.bergHojd; // bergen reser sig inne i landet
    hj[y * w + x] = z;
  }
  return hj;
}
// marksorten ur höjden och fukten; berget är där bergen rest sig
function marker(d: number, hj: Float32Array, w: number, h: number): Uint8Array {
  const V = VARLD, m = new Uint8Array(w * h), seed = Math.floor(slump(d, 0, 1) * 2 ** 31), fukt = seed + 101;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, z = hj[i], f = fbm(fukt, x, y);
    m[i] = NR[z <= 0 ? 'hav' : z > V.lagland && bergBrus(seed, x, y) > V.bergFran ? 'berg' : f > V.myrFran && z < V.lagland ? 'myr' : f > V.tatFran ? 'tat' : f > V.skogFran ? 'skog' : 'slatt'];
  }
  return m;
}
// landmassorna (fyra grannar), störst först
export function landmassor(v: { mark: Uint8Array; w: number; h: number }): number[][] {
  const { w, h } = v, sett = new Uint8Array(w * h), ut: number[][] = [];
  for (let i = 0; i < w * h; i++) {
    if (sett[i] || !VARLDMARK[MARK_IDS[v.mark[i]]].land) continue;
    const del: number[] = [i]; sett[i] = 1;
    for (let k = 0; k < del.length; k++) {
      const j = del[k], x = j % w;
      for (const n of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) {
        if (n < 0 || n >= w * h || sett[n] || !VARLDMARK[MARK_IDS[v.mark[n]]].land) continue;
        sett[n] = 1; del.push(n);
      }
    }
    ut.push(del);
  }
  return ut.sort((a, b) => b.length - a.length);
}
// formen: hur stor del den största landmassan är, om den täcker mitten och hur många småöar som finns
export function formen(v: { mark: Uint8Array; w: number; h: number }) {
  const m = landmassor(v), stor = m[0] ?? [], mitt = Math.floor(v.h / 2) * v.w + Math.floor(v.w / 2);
  const kant = (i: number) => { const x = i % v.w, y = Math.floor(i / v.w); return x === 0 || y === 0 || x === v.w - 1 || y === v.h - 1; };
  return {
    andel: stor.length / (v.w * v.h), mitten: stor.includes(mitt),
    oar: m.slice(1).filter(o => o.length >= VARLD.oMin).length,
    havRunt: m.every(o => !o.some(kant)),
  };
}
const godForm = (f: ReturnType<typeof formen>) => f.andel >= VARLD.storAndel && f.mitten && f.oar >= VARLD.minOar && f.havRunt;

// ---------- vattnet (steg 11.2.6) ----------
// Vattnet rinner från varje ruta mot havet. Det räknas som en översvämning från havet och inåt (den lägsta rutan först):
// varje ruta får vattnet från den granne som nådde den, och en sänka fylls upp till där den rinner över. En sänka som fylls
// minst VARLD.sjoDjup blir en sjö. Floderna börjar vid källor i bergen och följer vattnet tills de når havet, en sjö eller en
// annan flod. Där tillräckligt många rutor rinner till floden är den det breda nedre loppet.
class Hog { // en enkel minsta-först-kö på höjden
  private h: number[] = []; private i: number[] = [];
  get n() { return this.i.length; }
  lagg(i: number, h: number) { const a = this.h, b = this.i; let k = b.length; a.push(h); b.push(i); while (k > 0) { const p = (k - 1) >> 1; if (a[p] < h || (a[p] === h && b[p] < i)) break; a[k] = a[p]; b[k] = b[p]; k = p; } a[k] = h; b[k] = i; }
  ta(): number { const a = this.h, b = this.i, ut = b[0], h = a.pop()!, i = b.pop()!; if (b.length) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= b.length) break; if (c + 1 < b.length && (a[c + 1] < a[c] || (a[c + 1] === a[c] && b[c + 1] < b[c]))) c++; if (a[c] > h || (a[c] === h && b[c] > i)) break; a[k] = a[c]; b[k] = b[c]; k = c; } a[k] = h; b[k] = i; } return ut; }
}
const grannar = (i: number, w: number, n: number) => { const x = i % w; return [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w].filter(j => j >= 0 && j < n); };
// sjöarna och vattnets väg: fylld höjd och rutan vattnet rinner till
function avrinning(hj: Float32Array, w: number, h: number) {
  const n = w * h, fylld = new Float32Array(n), ned = new Int32Array(n).fill(-1), sett = new Uint8Array(n), ordning: number[] = [], q = new Hog();
  for (let i = 0; i < n; i++) { const x = i % w, y = (i / w) | 0; if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { sett[i] = 1; fylld[i] = hj[i]; q.lagg(i, hj[i]); } }
  while (q.n) {
    const c = q.ta(); ordning.push(c);
    for (const j of grannar(c, w, n)) {
      if (sett[j]) continue;
      sett[j] = 1; fylld[j] = Math.max(hj[j], fylld[c] + 1e-5); ned[j] = fylld[c] <= 0 && hj[j] <= 0 ? -1 : c; q.lagg(j, fylld[j]);
    }
  }
  return { fylld, ned, ordning };
}
function vatten(d: number, v: VarldMark) {
  const V = VARLD, { w, h, mark } = v, hojd = v.hojd!, n = w * h, { fylld, ned, ordning } = avrinning(hojd, w, h);
  // sjöarna: sänkor som fylls djupt nog (också en sänka under havet inne i landet), om de är stora nog
  const sank = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (fylld[i] > 0 && fylld[i] - hojd[i] >= V.sjoDjup) sank[i] = 1;
  const sett = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!sank[i] || sett[i]) continue;
    const sjo = [i]; sett[i] = 1;
    for (let k = 0; k < sjo.length; k++) for (const j of grannar(sjo[k], w, n)) if (sank[j] && !sett[j]) { sett[j] = 1; sjo.push(j); }
    for (const j of sjo) mark[j] = NR[sjo.length >= V.sjoMin ? 'sjo' : hojd[j] <= 0 ? 'slatt' : MARK_IDS[mark[j]]]; // en liten sänka under havet blir slätt
  }
  // hur många rutor som rinner till varje ruta
  const till = new Float32Array(n).fill(1);
  for (let k = ordning.length - 1; k >= 0; k--) { const c = ordning[k]; if (ned[c] >= 0) till[ned[c]] += till[c]; }
  // källorna i bergen, i en ordning ur fröet, med avstånd emellan
  const berg = [] as number[];
  for (let i = 0; i < n; i++) if (MARK_IDS[mark[i]] === 'berg') berg.push(i);
  berg.sort((a, b) => slump(d, a, 11) - slump(d, b, 11));
  const kallor: number[] = [], antal = Math.round(berg.length * V.kallor);
  for (const b of berg) {
    if (kallor.length >= antal) break;
    if (kallor.every(k => Math.abs(k % w - b % w) + Math.abs(((k / w) | 0) - ((b / w) | 0)) >= V.kallAvst)) kallor.push(b);
  }
  const flod = v.flod, vatt = (i: number) => { const m = MARK_IDS[mark[i]]; return m === 'hav' || m === 'sjo'; };
  for (const k of kallor) {
    const vag: number[] = [];
    for (let c = k; c >= 0 && !vatt(c) && !flod[c] && vag.length < n; c = ned[c]) vag.push(c);
    const slut = ned[vag[vag.length - 1]] ?? -1;
    if (vag.length < V.flodMin && !(slut >= 0 && flod[slut])) continue; // en kort bäck som inte når en flod torkar ut
    for (const c of vag) flod[c] = FLOD_OVRE;
  }
  for (let i = 0; i < n; i++) if (flod[i] && till[i] >= V.bredFran) flod[i] = FLOD_NEDRE;
  v.ned = ned;
}

// världens land ur fröet: delfrö efter delfrö tills formen håller (eller det som kom närmast efter VARLD.forsok försök)
export function skapaVarldMark(fro: number): VarldMark {
  const w = VARLD.bredd, h = VARLD.hojd;
  let bast: { v: VarldMark; poang: number } | undefined;
  for (let k = 0; k < VARLD.forsok; k++) {
    const d = Math.floor(slump(fro, k, 0) * 2 ** 31), hojd = hojder(d, w, h);
    const v: VarldMark = { gen: VARLD_GEN, fro, delfro: k, w, h, mark: marker(d, hojd, w, h), hojd, flod: new Uint8Array(w * h), ned: new Int32Array(0) };
    vatten(d, v); // sjöarna ändrar landet, så de läggs före kontrollen av formen
    const f = formen(v);
    if (godForm(f)) return v;
    const poang = Math.min(1, f.andel / VARLD.storAndel) + (f.mitten ? 1 : 0) + Math.min(1, f.oar / VARLD.minOar) + (f.havRunt ? 1 : 0);
    if (!bast || poang > bast.poang) bast = { v, poang };
  }
  return bast!.v;
}
