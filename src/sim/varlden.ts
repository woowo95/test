// ---------- världen bredvid byn (steg 11.2.7, Flera samhällen: Världen i tal: var världen ligger) ----------
// Världen är en egen del bredvid byn (s.varld): marken nu, och senare platserna, byarnas rader, lederna, sällskapen och
// världens krönika. Den sparas med byn, i samma ögonblick, som en egen del av sparfilen (varlden i DELAR, steg.ts), och varje
// sparad by har sin egen värld. Världens frö räknas ur byns frö med en hash, så att inget i världen drar ur byns slumpföljder
// och byn utvecklas exakt som utan värld. Marken sparas som den räknades fram, med generatorns version, så att en sparad värld
// inte flyttar sig när generatorn ändras. Byn får sin värld när den grundas (medVarld, från nyaGrannbyar i grannbyar.ts, steg
// 11.2.15), en sparad by när den laddas (uppgradering 56).
import { hash3 } from './slump';
import { VarldMark, skapaVarldMark } from './varldmark';
import { State } from './typer';
import { laggByar, laggHuvudby, laggOvriga } from './placering';
import { laggGrannat } from './grannat';

export interface Varlden {
  fro: number; // världens frö
  mark: { gen: number; delfro: number; w: number; h: number; mark: string; flod: string; ned: string }; // marken packad (base64)
  platser?: import('./landmarken').VarldPlats[]; nastaPlats?: number; // platserna i världen (steg 11.2.8, landmarken.ts)
  rader?: import('./radtal').VarldRad[]; nastaRad?: number; huvud?: number; // byarnas rader och huvudbyns nummer (steg 11.2.9, radtal.ts)
  borjan?: number; perioder?: Record<import('./varldslag').PeriodId, number>; // världens början och perioderna som räknats (steg 11.2.17, varldslag.ts)
  ko?: import('./varldslag').KoPost[]; nastaKo?: number; // det som händer vid en känd tid, sorterat på tiden
  vagar?: import('./vagval').VarldVag[]; // de vägar som räknats (steg 11.2.20, vagval.ts)
  leder?: Record<number, import('./leder').LedSlitage>; ledVer?: number; sallskap?: import('./resa').Sallskap[]; nastaSallskap?: number; // sällskapen (steg 11.5.2, resa.ts); // slitaget per ruta och kostnadernas version (steg 11.5.1, leder.ts)
  kronika?: import('./varldkronika').VarldHandelse[]; nastaHandelse?: number; // världens krönika (steg 11.2.19, varldkronika.ts)
  rel?: Record<string, number>; slakt?: Record<string, number>; mutor?: Record<string, number>; tillHuvud?: number[]; // relationerna "a>b", släktbanden "a-b" och mutorna (steg 11.3.4, byrel.ts); de som flyttat till huvudbyn och väntar på att komma in, numret på byn de kom ifrån (steg 11.3.5, byflytt.ts)
}
export const varldFro = (seed: number) => Math.floor(hash3(seed, 0x5741524c, 0x11207) * 2 ** 31);

// bytes som text och tillbaka (sparfilen är JSON)
const tillText = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const urText = (t: string) => { const s = atob(t), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; };
// vattnets väg som en riktning per ruta: 0 ingen, 1 väster, 2 öster, 3 norr, 4 söder
const RIKT = (w: number) => [0, -1, 1, -w, w];
function packaNed(ned: Int32Array, w: number) {
  const b = new Uint8Array(ned.length), r = RIKT(w);
  for (let i = 0; i < ned.length; i++) b[i] = ned[i] < 0 ? 0 : r.indexOf(ned[i] - i);
  return tillText(b);
}
function lasNed(t: string, w: number) {
  const b = urText(t), r = RIKT(w), ned = new Int32Array(b.length);
  for (let i = 0; i < b.length; i++) ned[i] = b[i] ? i + r[b[i]] : -1;
  return ned;
}
export function packaVarld(fro: number, v: VarldMark): Varlden {
  return { fro, mark: { gen: v.gen, delfro: v.delfro, w: v.w, h: v.h, mark: tillText(v.mark), flod: tillText(v.flod), ned: packaNed(v.ned, v.w) } };
}

// byn får sin värld, räknad ur byns frö (en gång; en by som har en värld behåller den)
// fore: det som görs före huvudbyn (förhistorien, forhistoria.ts, steg 11.3.13)
export function medVarld(s: State, fore?: (s: State, vl: Varlden, v: VarldMark) => void) {
  if (s.varld) return s.varld;
  const fro = varldFro(s.seed), v = skapaVarldMark(fro);
  s.varld = packaVarld(fro, v);
  uppackad.set(s.varld, v);
  laggByar(s.varld, v); // byarna, de övriga platserna och sist huvudbyn med samma regler (placering.ts, steg 11.2.13–11.2.14)
  laggOvriga(s.varld, v);
  fore?.(s, s.varld, v);
  laggHuvudby(s);
  laggGrannat(s.varld, v, s.founded); // varje bys närmaste grannar med väg och restid (grannat.ts, steg 11.2.21)
  return s.varld;
}
// världens mark som rutnät, packad upp en gång per värld
const uppackad = new WeakMap<Varlden, VarldMark>();
export function varldMark(s: State): VarldMark | undefined {
  const vl = s.varld;
  if (!vl) return undefined;
  let v = uppackad.get(vl);
  if (!v) {
    const m = vl.mark;
    v = { gen: m.gen, fro: vl.fro, delfro: m.delfro, w: m.w, h: m.h, mark: urText(m.mark), flod: urText(m.flod), ned: lasNed(m.ned, m.w) };
    uppackad.set(vl, v);
  }
  return v;
}
