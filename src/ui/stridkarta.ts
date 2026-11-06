import type * as PIXI from 'pixi.js';
import { type Kampe, type RovarStrid, type Strid, SEC, rovarStridNu, stegIGang } from '../sim';
import { s, vidNyBy } from './lage';

// striden med rövarna vid förrådet på kartan (steg 6.6.10): striden räknas fram till tiden som visas (rovarStridNu i
// rovare.ts, samma räkning som i spelet), och de som är med står där striden har dem. Den som slår mot någon syns med ett
// streck mellan dem en kort stund, och den som fallit ligger. Striden som just tog slut visas tills dess slut, också när
// spelet redan räknat den färdig (tiden som visas ligger efter spelets tid)
let senast: { g: RovarStrid; st: Strid; inN: number } | undefined;
vidNyBy.push(() => { senast = undefined; });
const SLAG_SEK = 0.6; // så länge (spelets sekunder) strecket mellan den som slår och den som träffas syns

export function stridVid(nu: number): { g: RovarStrid; st: Strid } | undefined {
  const g = s.rovare?.strid ?? senast?.g;
  if (!g || nu < g.t0) return undefined;
  const tid = (nu - g.t0) / SEC, inn = g.in ?? [];
  let st = senast?.g === g ? senast.st : undefined;
  // räknas om från början när tiden gått bakåt eller någon kommit till före tiden som redan räknats
  if (!st || st.t > tid + 1e-9 || inn.slice(senast!.inN).some(x => x.t < st!.t)) st = rovarStridNu(g, tid);
  else while (!st.slut && st.t < tid) stegIGang(st, g);
  senast = { g, st, inN: inn.length };
  return st.slut && tid > st.slut.t ? undefined : { g, st };
}
// var en kämpe står på kartan (rutor)
export const kampePlats = (g: RovarStrid, k: Kampe) => ({ x: g.ox + k.x, y: g.oy + k.y });
export const liggerK = (k: Kampe) => k.lage === 'nere' || k.lage === 'dod' || !!k.ligger;
// bybon i striden som visas: kämpen och platsen, och den hen slår mot
export function iStridenNu(pid: number, nu: number) {
  const v = stridVid(nu);
  const k = v?.st.kampar.find(x => x.pid === pid);
  if (!v || !k || k.lage === 'borta') return undefined;
  const mal = k.mal !== undefined ? v.st.kampar.find(x => x.id === k.mal) : undefined;
  return { k, ...kampePlats(v.g, k), mot: mal ? kampePlats(v.g, mal) : undefined, ligger: liggerK(k) };
}
// rövaren i striden som visas (efter namnet: de döda tas bort ur flocken när striden är slut)
export function rovarenNu(namn: string, nu: number) {
  const v = stridVid(nu);
  const k = v?.st.kampar.find(x => x.sida === 1 && x.pid === undefined && x.namn === namn);
  if (!v || !k || k.lage === 'borta') return undefined;
  return { k, ...kampePlats(v.g, k), ligger: liggerK(k) };
}
// strecken (TS punkter per ruta) mellan den som slår och den som träffas (rött), missar (grått)
export function ritaSlagen(gr: PIXI.Graphics, nu: number, TS: number) {
  const v = stridVid(nu);
  if (!v) return;
  const tid = (nu - v.g.t0) / SEC;
  for (let i = v.st.logg.length - 1; i >= 0; i--) {
    const r = v.st.logg[i];
    if (r.t < tid - SLAG_SEK) break;
    if (r.a === undefined || r.b === undefined || !(r.h === 'traff' || r.h === 'miss' || r.h === 'tog' || r.h === 'knuff' || r.h === 'omkull')) continue;
    const a = v.st.kampar.find(k => k.id === r.a), b = v.st.kampar.find(k => k.id === r.b);
    if (!a || !b) continue;
    const pa = kampePlats(v.g, a), pb = kampePlats(v.g, b), alfa = 1 - (tid - r.t) / SLAG_SEK;
    gr.lineStyle(r.h === 'traff' ? 2 : 1, r.h === 'traff' ? 0xa14808 : 0xdad0bb, Math.max(0.2, alfa)).moveTo(pa.x * TS, pa.y * TS - 4).lineTo(pb.x * TS, pb.y * TS - 4).lineStyle(0);
  }
}
