// Myren på kartan (steg 12.1.1, sim/myr.ts): en platshållare i paletten, 16 punkter per ruta, ovanpå marken. Mörk mossa med
// tuvor, och gölar av vatten som blir fler när myren står under vatten efter regn, och malmen som rostbruna klumpar (steg 12.1.2). Ritas om bara när byn eller vattnet byts
import * as PIXI from 'pixi.js';
import { H, HOUR, W, fyndAt, groundOf, myrOf } from '../sim';
import { s } from './lage';
import { lagerEfter, terrainG } from './scen';
import { farg, fargTal } from '../palett';

const myrG = new PIXI.Graphics();
lagerEfter(myrG, terrainG);
let ritad = '';
const MALM = fargTal(farg('rost', 1)), MALM2 = fargTal(farg('rost', 2));
const MOSSA = fargTal(farg('oliv', 1)), TUVA = fargTal(farg('oliv', 2)), MORK = fargTal(farg('barr', 1)), VATTEN = fargTal(farg('skiffer', 1)), GLANS = fargTal(farg('skiffer', 2));
// punkten (px, py) i rutan (x, y): ett tal 0–1 som är detsamma varje gång
const prick = (x: number, y: number, px: number, py: number) => {
  let h = Math.imul(x * 16 + px, 0x27d4eb2d) ^ Math.imul(y * 16 + py, 0x165667b1) ^ 4711;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
export function ritaMyr() {
  const a = myrOf(s.seed), vatten = !!groundOf(s).myrVatten, nyckel = `${s.seed}|${W}x${H}|${vatten}|${!!a}|${s.stat?.malmGravd ?? 0}|${Math.floor(s.now / (6 * HOUR))}`; // malmen som grävts och växer igen (steg 12.1.2)
  if (nyckel === ritad) return;
  ritad = nyckel;
  myrG.clear();
  if (!a) return;
  const gol = vatten ? 0.35 : 0.12;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const x = i % W, y = Math.floor(i / W);
    myrG.beginFill(MOSSA).drawRect(x * 16, y * 16, 16, 16).endFill();
    for (let py = 0; py < 16; py += 2) for (let px = 0; px < 16; px += 2) {
      const v = prick(x, y, px, py);
      const c = v < gol ? (v < gol * 0.25 ? GLANS : VATTEN) : v > 0.9 ? TUVA : v > 0.8 ? MORK : -1;
      if (c >= 0) myrG.beginFill(c).drawRect(x * 16 + px, y * 16 + py, 2, 2).endFill();
    }
    // malmen (steg 12.1.2): rostbruna klumpar, fler ju mer som finns kvar i rutan (en per malm)
    const n = Math.round(fyndAt(s, 'malm', i));
    for (let k = 0; k < n; k++) { const px = 2 + Math.floor(prick(x, y, k, 99) * 11), py = 2 + Math.floor(prick(y, x, k, 98) * 11); myrG.beginFill(MALM).drawRect(x * 16 + px, y * 16 + py, 3, 2).endFill().beginFill(MALM2).drawRect(x * 16 + px, y * 16 + py, 1, 1).endFill(); }
  }
}
