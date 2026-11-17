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
  hojd: Float32Array; // höjden över havet (negativ i havet), för floderna i steg 11.2.6
}
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

// världens land ur fröet: delfrö efter delfrö tills formen håller (eller det som kom närmast efter VARLD.forsok försök)
export function skapaVarldMark(fro: number): VarldMark {
  const w = VARLD.bredd, h = VARLD.hojd;
  let bast: { v: VarldMark; poang: number } | undefined;
  for (let k = 0; k < VARLD.forsok; k++) {
    const d = Math.floor(slump(fro, k, 0) * 2 ** 31), hojd = hojder(d, w, h), v: VarldMark = { gen: VARLD_GEN, fro, delfro: k, w, h, mark: marker(d, hojd, w, h), hojd };
    const f = formen(v);
    if (godForm(f)) return v;
    const poang = Math.min(1, f.andel / VARLD.storAndel) + (f.mitten ? 1 : 0) + Math.min(1, f.oar / VARLD.minOar) + (f.havRunt ? 1 : 0);
    if (!bast || poang > bast.poang) bast = { v, poang };
  }
  return bast!.v;
}
