// ---------- radens regler (fas 11.3, Flera samhällen: Radens regler) ----------
// En by i världen som inte går i simuleringen lever efter radens regler: hela tal som räknas i världens perioder
// (varldslag.ts) med världens slump. Reglerna rör aldrig en rad som läses ur en by (huvudbyns rad, radtal.ts). Balanstalen står
// i blocket RAD.
//
// Bärkraften (steg 11.3.1) är hur många platsen kan föda: platsens grundtal gånger det teknikerna ger. Grundtalet är vad
// marken runt platsen föder (VARLDMARK.barkraft för rutan och de åtta runt den, och floderna), och kolumnen rad i TEKNIK säger
// hur mycket mer varje teknik ger: bärkraft (odling, fiske, fångst), förvaring (torkning, rökning, hyllor), styrka (vapen,
// sköld) och rikedom (hus, redskap).
//
// Maten, födda och döda (steg 11.3.2) räknas en gång i timmen (ungefär 15 dagar i spelet). De arbetsföra skaffar ett överskott
// över behovet vid låg trängsel (RAD.overskott), som sjunker mot noll när folket når bärkraften och blir brist över den;
// i istiden är överskottet och bristen en bråkdel (RAD.istid). Det som blir över läggs undan upp till förvaringens tak (RAD.forvaringDygn dygns mat,
// mer med teknikerna). Tar maten slut dör en del av dem som blir utan (RAD.svaltDod), och världens krönika får raden Svält.
// Födda räknas med huvudbyns regler för lusten till barn, maten och trängseln (fodVilja och fodslarPerAr i steg.ts, barnMatAv i
// liv.ts), och döda av ålder och olyckor med RAD.dod. Allt blir hela tal ur det väntade antalet (antalUr).
import { balans } from './balans';
import { TEK } from './teknik';
import { MARK_IDS, VARLDMARK, VarldMark } from './varldmark';
import { BYSORTER, radKrok, VarldRad } from './radtal';
import { KROPP } from './folk';
import { barnMatAv, matGottAv } from './liv';
import { fodslarPerAr, fodVilja } from './steg';
import { ageIndex, iIstiden } from './tid';
import { PERIODRADER, antalUr, periodSlut, varldSlump } from './varldslag';
import { varldHandelse } from './varldkronika';
import { Varlden, varldMark } from './varlden';
import { DAY, State } from './typer';

export const RAD = balans('rad', {
  // bärkraften (steg 11.3.1)
  flod: 1, // en flodruta runt platsen föder så många till
  grundUtan: 15, // grundtalet för en by utan plats i världen
  // maten, födda och döda (steg 11.3.2)
  overskott: 0.25, // så mycket mer än behovet skaffar de vid låg trängsel; noll när folket når bärkraften
  istid: 0.3, // i istiden är överskottet (och bristen över bärkraften) så stor del
  forvaringDygn: 2, // så många dygns mat (år i spelet) får plats i förrådet, gånger 1 + teknikernas förvaring
  svaltDod: 0.1, // så stor del av dem som blir utan mat en timme (ungefär 15 dagar i spelet) dör
  modrar: 0.2, // så stor del av folket är kvinnor som kan få barn och har en partner
  dod: 0.03, // så stor del dör av ålder och olyckor per dygn (ett år i spelet)
  startMat: 1, // en ny by har så många dygns mat
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

// portioner per person och dygn (ett år i spelet): det en vuxen äter enligt kroppen
export const portionerPerDygn = () => 24 / KROPP.hungerTim / KROPP.mattar;
// radens regler gäller en by i världen med folk som inte går i simuleringen
export const lever = (vl: Varlden, r: VarldRad) => r.nr !== vl.huvud && BYSORTER[r.sort].folk && r.tal.folk > 0;
// maten i dygn (år i spelet) och förvaringens tak
export const matDygn = (r: VarldRad) => r.tal.folk ? r.tal.mat / (r.tal.folk * portionerPerDygn()) : 0;
export const forradTak = (r: VarldRad) => Math.round(r.tal.folk * portionerPerDygn() * RAD.forvaringDygn * (1 + tekTillskott(r, 'forvaring')));
// ärendena i världens slump för raden
const A = { mat: 1, svalt: 2, fodda: 3, doda: 4 };

// en timme (ungefär 15 dagar i spelet) för raden: maten, svälten, födda och döda
export function radMat(s: State, vl: Varlden, r: VarldRad, n: number) {
  const v = varldMark(s), t = periodSlut(vl, 'timme', n), folk = r.tal.folk, P = portionerPerDygn() / 24;
  const behov = folk * P, tr = folk / Math.max(1, barkraft(v, r));
  const skaffar = BYSORTER[r.sort].egenMat ? behov * Math.max(0, 1 + RAD.overskott * (iIstiden(ageIndex(s, t - 1)) ? RAD.istid : 1) * (1 - tr)) : 0;
  let mat = r.tal.mat + antalUr(skaffar - behov, varldSlump(vl, r.nr, n, A.mat));
  let doda = 0;
  if (mat < 0) { // de som blir utan: en del dör
    doda = Math.min(folk, antalUr(Math.min(folk, -mat / P) * RAD.svaltDod, varldSlump(vl, r.nr, n, A.svalt)));
    mat = 0;
    if (doda && !(r.svalt !== undefined && t - r.svalt < DAY)) { r.svalt = t; varldHandelse(vl, 'svalt', t, { by: r.nr }); }
  }
  // födda och döda av ålder och olyckor (per dygn, en timme i taget)
  const dygnMat = folk ? mat / (folk * portionerPerDygn()) : 0;
  const fodda = BYSORTER[r.sort].barn ? antalUr(folk * RAD.modrar * fodslarPerAr(fodVilja(folk, dygnMat, barnMatAv(matGottAv(dygnMat), folk), 0)) / 24, varldSlump(vl, r.nr, n, A.fodda)) : 0;
  doda += antalUr((folk - doda) * RAD.dod / 24, varldSlump(vl, r.nr, n, A.doda));
  r.tal.folk = Math.max(0, folk - Math.min(folk, doda) + fodda);
  r.tal.mat = Math.min(mat, forradTak(r));
  r.t = t;
  if (r.syn) r.syn.folk = r.tal.folk; // huvudbyns förbindelse med byn följer
}

radKrok.startMat = folk => Math.round(folk * portionerPerDygn() * RAD.startMat);

// varje timme: radens regler för varje by i världen som lever efter dem, i ordning efter numret
PERIODRADER.push({ namn: 'radens mat', period: 'timme', fn: (s, vl, n) => { for (const r of vl.rader ?? []) if (lever(vl, r)) radMat(s, vl, r, n); } });
