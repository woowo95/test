import { balans } from './balans';
import { forstaGang, count, living, log } from './folk';
import { richness } from './fynd';
import { put } from './lager';
import { ageIndex } from './tid';
import { rnd } from './slump';
import { H, Person, State, T, W, inMap } from './typer';
import { gridOf } from './byggnad';
import { getMap } from './karta';
import { iByn } from './omrade';
import { strandNu } from './sjo';

// ---------- fiskarterna (steg 7.4.3) ----------
// Varje art är en rad: hur gärna den nappar under varje årstid (Istid, Vårtid, Sommartid, Hösttid) och hur mycket den sliter på
// redskapet per fisk. Abborren nappar bäst på sommaren och genom isen, gäddan på våren och hösten. Mörten fångas i mjärden.
export interface FiskDef { namn: string; sak: string; sasong: [number, number, number, number]; slit: number; mjarde?: true; nat?: number } // nat = så här många gånger oftare i nätet än annars (steg 9.6.17)
export const FISKAR: Record<string, FiskDef> = {
  abborre: { namn: 'Abborre', sak: 'abborre', sasong: [1, 0.6, 1, 0.6], slit: 1 },
  gadda: { namn: 'Gädda', sak: 'gadda', sasong: [0.1, 0.6, 0.15, 0.6], slit: 2 },
  mort: { namn: 'Mört', sak: 'mort', sasong: [0.2, 1, 1, 0.8], slit: 1, mjarde: true },
  braxen: { namn: 'Braxen', sak: 'braxen', sasong: [0.05, 0.08, 0.1, 0.06], slit: 1, nat: 12 }, // steg 9.6.17: nästan bara i nätet
  sik: { namn: 'Sik', sak: 'sik', sasong: [0.08, 0.05, 0.04, 0.1], slit: 1, nat: 12 },
};
const FISK_LIST = Object.keys(FISKAR);
export const MJARDE = balans('mjarde', {
  snaraFangst: 0.03, snaraFagel: 0.3, snaraSlit: 0.25, // snaran: chansen per timme, hur ofta det blir en fågel, och hur mycket den slits per fångst (steg 7.5.10)
  gropFangst: 0.01, // fångstgropen (steg 7.5.11)
  sattUtR: 40, // så långt bort letar man högst efter en plats för fällan
  skogUt: 8, // snaror och gropar sätts minst så här många rutor från den som gjort dem, utanför byn
  vittjaMin: 2, // så många fiskar i mjärden innan någon går dit
  fangst: 0.04, // chansen per timme att en fisk simmar in i en mjärde, gånger hur rikt vattnet är
  max: 6, // så många fiskar ryms i en mjärde
  folkPerFiskare: 8, // en fiskare på så många invånare ...
  perFiskare: 2, // så många mjärdar byn vill ha för varje den som fiskar
  rikMax: 1.5, // rikare vatten än så här räknas inte
  beteNapp: 1.33, // den som har en mört med sig får så här många gånger fler napp (steg 7.4.4), och en mört går åt per fisketur
});
// vilken fisk det blev: med metspö, spjut eller händerna efter årstiden; mörten bara i mjärden
export function valjFisk(s: State, p: Person, iMjarde = false, nat = false) {
  const ai = ageIndex(s), kand = FISK_LIST.filter(k => iMjarde ? FISKAR[k].mjarde : !FISKAR[k].mjarde);
  const v = (k: string) => FISKAR[k].sasong[ai] * (nat ? FISKAR[k].nat ?? 1 : 1); // braxen och sik nästan bara i nätet (steg 9.6.17)
  let sum = 0;
  for (const k of kand) sum += v(k);
  let r = rnd(s, 'arbete', p) * sum;
  for (const k of kand) { r -= v(k); if (r <= 0) return k; }
  return kand[0];
}
// ---------- fällorna (steg 7.4.2, 7.5.10 och 7.5.11) ----------
// En fälla görs vid fångstbänken och sätts ut. Den fångar medan ingen är där och vittjas av den som går förbi (arbetet vittja). Varje
// sort är en rad: var den sätts (vid vattnet eller i skogen), vad den fångar och chansen per timme gånger hur rikt det är där
export interface FallaDef { namn: string; plats: 'strand' | 'skog'; lager: string; fangst: number; ger: (s: State, p: Person) => string; slits: number }
export const FALLOR: Record<string, FallaDef> = {
  mjarde: { namn: 'Mjärde', plats: 'strand', lager: 'fiske', fangst: MJARDE.fangst, ger: (s, p) => valjFisk(s, p, true), slits: 0 },
  snara: { namn: 'Snara', plats: 'skog', lager: 'jakt', fangst: MJARDE.snaraFangst, ger: (s, p) => rnd(s, 'arbete', p) < MJARDE.snaraFagel ? 'fagel' : 'vilt', slits: MJARDE.snaraSlit },
  grop: { namn: 'Fångstgrop', plats: 'skog', lager: 'jakt', fangst: MJARDE.gropFangst, ger: () => 'radjur', slits: 0 },
};
export interface Mjarde { id: number; k?: string; x: number; y: number; ag: number; fisk: Record<string, number>; n: number; c?: number }
export const mjardarOf = (s: State) => (s.mjardar ??= []);
export const fallorAv = (s: State, k: string) => mjardarOf(s).filter(m => (m.k ?? 'mjarde') === k);
export const kanVittja = (s: State) => mjardarOf(s).filter(m => m.n > 0);
export function stepMjardar(s: State) {
  if (!s.mjardar?.length) return;
  for (const m of [...s.mjardar]) {
    const d = FALLOR[m.k ?? 'mjarde'];
    if (m.n >= MJARDE.max) continue;
    const p = living(s).find(q => q.id === m.ag) ?? living(s)[0];
    if (!p) return;
    const rik = Math.min(MJARDE.rikMax, richness(s, d.lager as 'fiske', m.x, m.y));
    if (rnd(s, 'arbete', p) >= d.fangst * rik) continue;
    const k = d.ger(s, p);
    m.fisk[k] = (m.fisk[k] ?? 0) + 1; m.n++;
    if (forstaGang(s, 'fallaFangst_' + (m.k ?? 'mjarde'))) log(s, `Byns första ${d.namn.toLowerCase()} fångade något.`, 'world');
    if (d.slits) { m.c = (m.c ?? 1) - d.slits; if (m.c <= 0) s.mjardar = s.mjardar.filter(q => q !== m); }
  }
}
// sätter ut en fälla nära den som gjort den: en mjärde på stranden, en snara och en grop en bit bort där marken är fri
export function sattUt(s: State, p: Person, k: string) {
  const d = FALLOR[k], sh = strandNu(s), m0 = getMap(s.seed).tiles, skog = d.plats === 'skog';
  const satt = (x: number, y: number) => { const m: Mjarde = { id: (s.nextBit ??= 1), k, x, y, ag: p.id, fisk: {}, n: 0 }; s.nextBit++; mjardarOf(s).push(m); count(s, 'fallaUt_' + k); return m; };
  let forsta: { x: number; y: number } | undefined;
  for (let r = skog ? MJARDE.skogUt : 1; r < MJARDE.sattUtR; r++) {
    // i skogen den ruta på avståndet där det finns mest vilt: på en ruta utan vilt skulle fällan aldrig fånga något
    let bast: { x: number; y: number } | undefined, br = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = Math.floor(p.x) + dx, y = Math.floor(p.y) + dy, i = y * W + x;
      if (i < 0 || i >= W * H || !inMap(x, y) || (!skog && !sh[i]) || gridOf(s).at.has(i) || mjardarOf(s).some(m => m.x === x && m.y === y)) continue;
      if (!skog) return satt(x, y);
      if (m0[i] === T.Vatten || m0[i] === T.Sten || iByn(s, x, y)) continue;
      forsta ??= { x, y };
      const v = richness(s, d.lager as 'fiske', x, y);
      if (v > br) { br = v; bast = { x, y }; }
    }
    if (bast) return satt(bast.x, bast.y);
  }
  return forsta && satt(forsta.x, forsta.y);
}
export const sattUtMjarde = (s: State, p: Person) => sattUt(s, p, 'mjarde');
// den som vittjar tar det som finns i fällan
export function vittja(s: State, p: Person, m: Mjarde) {
  for (const k in m.fisk) if (m.fisk[k] > 0) put(s, k, m.fisk[k], { [p.id]: m.fisk[k] });
  m.fisk = {}; m.n = 0;
  count(s, 'mjardeVittjad');
}
// så många fällor av varje sort byn vill ha: några för varje som fångar
export const mjardarVill = (s: State) => living(s).length ? MJARDE.perFiskare * Math.ceil(living(s).length / MJARDE.folkPerFiskare) : 0;
