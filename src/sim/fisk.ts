import { balans } from './balans';
import { forstaGang, count, living, log } from './folk';
import { richness } from './fynd';
import { put } from './lager';
import { knows } from './teknik';
import { ageIndex } from './tid';
import { rnd } from './slump';
import { Person, State, W } from './typer';
import { strandNu } from './sjo';

// ---------- fiskarterna (steg 7.4.3) ----------
// Varje art är en rad: hur gärna den nappar under varje årstid (Istid, Vårtid, Sommartid, Hösttid) och hur mycket den sliter på
// redskapet per fisk. Abborren nappar bäst på sommaren och genom isen, gäddan på våren och hösten. Mörten fångas i mjärden.
export interface FiskDef { namn: string; sak: string; sasong: [number, number, number, number]; slit: number; mjarde?: true }
export const FISKAR: Record<string, FiskDef> = {
  abborre: { namn: 'Abborre', sak: 'abborre', sasong: [1, 0.6, 1, 0.6], slit: 1 },
  gadda: { namn: 'Gädda', sak: 'gadda', sasong: [0.1, 0.6, 0.15, 0.6], slit: 2 },
  mort: { namn: 'Mört', sak: 'mort', sasong: [0.2, 1, 1, 0.8], slit: 1, mjarde: true },
};
const FISK_LIST = Object.keys(FISKAR);
export const MJARDE = balans('mjarde', {
  vittjaMin: 2, // så många fiskar i mjärden innan någon går dit
  fangst: 0.04, // chansen per timme att en fisk simmar in i en mjärde, gånger hur rikt vattnet är
  max: 6, // så många fiskar ryms i en mjärde
  folkPerFiskare: 8, // en fiskare på så många invånare ...
  perFiskare: 2, // så många mjärdar byn vill ha för varje den som fiskar
  rikMax: 1.5, // rikare vatten än så här räknas inte
  beteNapp: 1.33, // den som har en mört med sig får så här många gånger fler napp (steg 7.4.4), och en mört går åt per fisketur
});
// vilken fisk det blev: med metspö, spjut eller händerna efter årstiden; mörten bara i mjärden
export function valjFisk(s: State, p: Person, iMjarde = false) {
  const ai = ageIndex(s), kand = FISK_LIST.filter(k => iMjarde ? FISKAR[k].mjarde : !FISKAR[k].mjarde);
  let sum = 0;
  for (const k of kand) sum += FISKAR[k].sasong[ai];
  let r = rnd(s, 'arbete', p) * sum;
  for (const k of kand) { r -= FISKAR[k].sasong[ai]; if (r <= 0) return k; }
  return kand[0];
}
// ---------- mjärdarna (steg 7.4.2) ----------
// En mjärde sätts ut från stranden eller bryggan och fångar fisk medan ingen är där. Den vittjas av den som går förbi, i arbetet vittja
export interface Mjarde { id: number; x: number; y: number; ag: number; fisk: Record<string, number>; n: number }
export const mjardarOf = (s: State) => (s.mjardar ??= []);
export const kanVittja = (s: State) => mjardarOf(s).filter(m => m.n > 0);
export function stepMjardar(s: State) {
  if (!s.mjardar?.length) return;
  for (const m of s.mjardar) {
    if (m.n >= MJARDE.max) continue;
    const p = living(s).find(q => q.id === m.ag) ?? living(s)[0];
    if (!p) return;
    const rik = Math.min(MJARDE.rikMax, richness(s, 'fiske', m.x, m.y));
    if (rnd(s, 'arbete', p) >= MJARDE.fangst * rik) continue;
    const k = valjFisk(s, p, true);
    m.fisk[k] = (m.fisk[k] ?? 0) + 1; m.n++;
    count(s, 'mjardeFangst');
    if (forstaGang(s, 'mjardeFangst')) log(s, 'En fisk simmade in i byns första mjärde.', 'world');
  }
}
// sätter ut en mjärde på närmaste strand
export function sattUtMjarde(s: State, p: Person) {
  const sh = strandNu(s);
  for (let r = 1; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy, i = y * W + x;
    if (i < 0 || !sh[i] || mjardarOf(s).some(m => m.x === x && m.y === y)) continue;
    const m: Mjarde = { id: (s.nextBit ??= 1), x, y, ag: p.id, fisk: {}, n: 0 };
    s.nextBit++;
    mjardarOf(s).push(m); count(s, 'mjardeUt');
    return m;
  }
  return undefined;
}
// den som vittjar tar det som finns i mjärden
export function vittja(s: State, p: Person, m: Mjarde) {
  for (const k in m.fisk) if (m.fisk[k] > 0) put(s, k, m.fisk[k], { [p.id]: m.fisk[k] });
  m.fisk = {}; m.n = 0;
  count(s, 'mjardeVittjad');
}
// så många mjärdar byn vill ha: några för varje som fiskat, så länge någon kan göra dem
export const mjardarVill = (s: State) => living(s).some(p => knows(p, 'mjarde')) ? MJARDE.perFiskare * Math.ceil(living(s).length / MJARDE.folkPerFiskare) : 0;
