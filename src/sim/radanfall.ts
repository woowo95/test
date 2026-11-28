// ---------- anfall mellan två rader (steg 11.6.16, Flera samhällen: Relationen och läget mellan två byar) ----------
// Ett anfall mellan två byar i världen avgörs i en uträkning när flocken kommer fram: anfallarnas antal och utrustning (ur
// teknikerna och rikedomen) mot försvararnas antal, utrustning och skydd (de slåss hemma). Kraften är antalet gånger
// utrustningen, och chansen att vinna är den egna kraften i kvadrat delad med båda sidornas (ju fler, desto mer avgör antalet).
// Utfallet är hela döda på båda sidor (förlorarna förlorar mer) och, när anfallarna vinner, hela saker som de överlevande bär
// hem: en del av det försvararna har, högst det de orkar bära. Slumpen är världens, så att det blir lika i det levande läget och
// ikappräkningen. Talen är ställda mot striderna i testbyarna (steg 11.6.19, npm run radanfall och npm run strid): där dör
// knappt en av hundra som är med när rövare kommer, och den som är fler vinner nästan alltid. Vem som anfaller och varför står i BYHANDLINGAR
// (plundringen i byhandling.ts); det här är bara uträkningen.
import { balans } from './balans';
import { RAD, tekTillskott } from './rad';
import { radHar, RADPRIS, VARUGRUPP_IDS, VarugruppId } from './priser';
import { VarldRad } from './radtal';
import { antalUr } from './varldslag';

export const BYANFALL = balans('byanfall', {
  skicka: 0.6, // så stor del av byns styrka går med ett anfall ...
  minst: 3, // ... och minst så många (har byn färre anfaller den inte)
  hemma: 1.5, // försvararnas skydd: de slåss hemma, vid husen och med det de har till hands
  rikVikt: 0.3, // utrustningen ur rikedomen: så mycket mer per RAD.rikPer per person ...
  rikTak: 1, // ... högst så många RAD.rikPer
  dod: 0.03, // så stor del av förlorarna dör (de flesta flyr eller skadas, som i testbyarnas strider med rövare)
  dodVinnare: 0.005, // så stor del av vinnarna dör
  bar: 10, // så mycket (i grundvärde) bär varje överlevande anfallare hem
  byte: 0.3, // högst så stor del av försvararnas förråd i varje grupp tas
  // rikedomen lockar (steg 12.1.21): flocken blir så stor som bytet och försvaret drar, högst det byn kan skicka ...
  vinstMal: 1.2, // ... så många att anfallarnas kraft är så här många gånger försvararnas ...
  // ... och det som finns att ta över det flocken bär lockar ändå, långsammare ju mer det är: lockMer × bärbördan × ln(1 + överskottet / bärbördan)
  lockMer: 0.25,
});

// utrustningen per person: teknikernas styrka (vapen, sköld) och rikedomen
export const anfallUtr = (r: VarldRad) => 1 + tekTillskott(r, 'styrka') + Math.min(BYANFALL.rikTak, r.tal.rikedom / Math.max(1, r.tal.folk) / RAD.rikPer) * BYANFALL.rikVikt;
// försvararna: de som kan slåss
export const forsvarare = (r: VarldRad) => Math.max(0, Math.min(r.tal.folk, Math.round(r.tal.styrka)));
// så många skickar byn r i ett anfall, 0 om den är för svag; ute = de som redan är ute i ett anfall (steg 11.6.20)
// mot = byn som anfalls (steg 12.1.21): då går så många som bytet och försvaret drar, och aldrig fler än byn kan skicka
export const flockStorlek = (r: VarldRad, ute = 0, mot?: VarldRad) => {
  const kan = Math.min(r.tal.folk, r.tal.styrka);
  const n = Math.min(Math.floor(kan * BYANFALL.skicka) - ute, Math.floor((kan - ute) / 2)); // minst dubbelt så många lediga som går (steg 15.1.73)
  if (n < BYANFALL.minst) return 0;
  if (!mot) return n;
  const kraft = Math.ceil(forsvarare(mot) * anfallUtr(mot) * BYANFALL.hemma * BYANFALL.vinstMal / anfallUtr(r)); // så många som behövs för att vinna
  const bara = Math.ceil(bytesVarde(mot) / BYANFALL.bar); // så många som behövs för att bära bytet
  return Math.min(n, Math.max(BYANFALL.minst, kraft, bara));
};
// det som finns att ta i byn f (grundvärde, högst BYANFALL.byte av varje grupp)
export const enhet = (g: VarugruppId) => g === 'mat' ? RADPRIS.portion : 1; // en enhet i gruppens tillgång, i grundvärde
export const bytesVarde = (f: VarldRad) => VARUGRUPP_IDS.reduce((x, g) => x + radHar(f, g) * enhet(g) * BYANFALL.byte, 0);
// det bytet är värt för n anfallare (steg 12.1.21): det de bär, och det som finns över det lockar ändå, långsammare ju mer det är
export function lockVarde(f: VarldRad, n: number) {
  const tak = n * BYANFALL.bar, b = bytesVarde(f);
  return b <= tak ? b : tak + BYANFALL.lockMer * tak * Math.log(1 + (b - tak) / tak);
}
// chansen att n anfallare från a vinner mot f
export function vinstChans(a: VarldRad, f: VarldRad, n: number): number {
  const ka = n * anfallUtr(a), kf = forsvarare(f) * anfallUtr(f) * BYANFALL.hemma;
  return ka <= 0 ? 0 : ka * ka / (ka * ka + kf * kf);
}
export interface AnfallUtfall { vann: boolean; dodaA: number; dodaF: number; byte: Partial<Record<VarugruppId, number>>; varde: number }
// uträkningen: slump(i) är ett tal mellan 0 och 1 ur världens frö, enhet(g) en enhet av gruppen i grundvärde
export function anfallUtfall(a: VarldRad, f: VarldRad, n: number, slump: (i: number) => number, enhet: (g: VarugruppId) => number): AnfallUtfall {
  const nf = forsvarare(f), vann = slump(0) < vinstChans(a, f, n);
  const dodaA = Math.min(n, antalUr(n * (vann ? BYANFALL.dodVinnare : BYANFALL.dod), slump(1)));
  const dodaF = Math.min(nf, antalUr(nf * (vann ? BYANFALL.dod : BYANFALL.dodVinnare), slump(2)));
  const byte: Partial<Record<VarugruppId, number>> = {};
  let kvar = vann ? (n - dodaA) * BYANFALL.bar : 0, varde = 0;
  // det mest värda först: gruppen där försvararna har mest (i grundvärde)
  const ordning = [...VARUGRUPP_IDS].sort((x, y) => radHar(f, y) * enhet(y) - radHar(f, x) * enhet(x) || x.localeCompare(y));
  for (const g of ordning) {
    if (kvar <= 0) break;
    const m = Math.floor(Math.min(radHar(f, g) * BYANFALL.byte, kvar / enhet(g)));
    if (m <= 0) continue;
    byte[g] = m; kvar -= m * enhet(g); varde += m * enhet(g);
  }
  return { vann, dodaA, dodaF, byte, varde };
}
