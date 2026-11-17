// ---------- radens regler (fas 11.3, Flera samhällen: Radens regler) ----------
// En by i världen som inte går i simuleringen lever efter radens regler: hela tal som räknas i världens perioder
// (varldslag.ts) med världens slump. Reglerna rör aldrig en rad som läses ur en by (huvudbyns rad, radtal.ts). Balanstalen står
// i blocket RAD.
//
// Bärkraften (steg 11.3.1) är hur många platsen kan föda: platsens grundtal gånger det teknikerna ger. Grundtalet är vad
// marken runt platsen föder (VARLDMARK.barkraft för rutan och de åtta runt den, och floderna), och kolumnen rad i TEKNIK säger
// hur mycket mer varje teknik ger: bärkraft (odling, fiske, fångst), förvaring (torkning, rökning, hyllor), styrka (vapen,
// sköld) och rikedom (hus, redskap).
import { balans } from './balans';
import { TEK } from './teknik';
import { MARK_IDS, VARLDMARK, VarldMark } from './varldmark';
import { VarldRad } from './radtal';

export const RAD = balans('rad', {
  // bärkraften (steg 11.3.1)
  flod: 1, // en flodruta runt platsen föder så många till
  grundUtan: 15, // grundtalet för en by utan plats i världen
});

export type RadKolumn = 'barkraft' | 'forvaring' | 'styrka' | 'rikedom';
// teknikernas tillskott i en kolumn: summan av andelarna för det byn kan (0 = inget)
export function tekTillskott(r: VarldRad, k: RadKolumn): number {
  let n = 0;
  for (const id of r.tek) n += TEK[id]?.rad?.[k] ?? 0;
  return n;
}
// platsens grundtal: vad marken på rutan och de åtta runt den föder, och floderna
export function grundtal(v: VarldMark, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= v.w || yy >= v.h) continue;
    const i = yy * v.w + xx;
    n += VARLDMARK[MARK_IDS[v.mark[i]]].barkraft + (v.flod[i] ? RAD.flod : 0);
  }
  return n;
}
// hur många raden kan föda
export function barkraft(v: VarldMark | undefined, r: VarldRad): number {
  const g = v && r.x !== undefined && r.y !== undefined ? grundtal(v, r.x, r.y) : RAD.grundUtan;
  return g * (1 + tekTillskott(r, 'barkraft'));
}
