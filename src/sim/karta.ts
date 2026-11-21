import { State, type Fire, kartNamn, mapKey, markNu, receptNu } from './typer';
import type { MarkId } from './varldmark';
import { skapaKarta, type KartData, type KartReceptId } from './kartrecept';
import { streckAv } from './ord';

// ---------- karta ----------
export function hash(seed: number, x: number, y: number) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(seed: number, x: number, y: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(seed, x0, y0), b = hash(seed, x0 + 1, y0), c = hash(seed, x0, y0 + 1), d = hash(seed, x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function fbm(seed: number, x: number, y: number) {
  return vnoise(seed, x / 12, y / 12) * 0.55 + vnoise(seed + 7, x / 6, y / 6) * 0.3 + vnoise(seed + 13, x / 3, y / 3) * 0.15;
}

// Det som bara beror på kartan (fröet, storleken W×H och var en äldre by har sin gamla karta, kartNamn i typer.ts) räknas
// en gång per karta och sparas med nyckeln mapKey. Den senaste kartan svarar direkt, utan att nyckeln byggs. Kartan hör
// till nyckeln, eftersom testerna kör byar med olika kartor i samma process.
export function perKarta<V>(gor: (seed: number) => V): (seed: number) => V {
  const cache = new Map<string, V>();
  let seed0 = NaN, k0 = '', v0!: V;
  return seed => {
    if (seed === seed0 && kartNamn() === k0) return v0;
    const key = mapKey(seed);
    let v = cache.get(key);
    if (v === undefined) { v = gor(seed); cache.set(key, v); }
    seed0 = seed; k0 = kartNamn(); v0 = v;
    return v;
  };
}

type MapData = KartData;

// byns karta: receptet by (kartrecept.ts) på den här kartans storlek och den gamla kartans hörn, utan marksort, så att den
// är densamma som den alltid varit
export const getMap = perKarta((seed): MapData => skapaKarta(seed, (receptNu() ?? 'by') as KartReceptId, markNu() as MarkId | undefined)); // en väckt by får sin världsrutas mark (steg 11.13.2), en plats sin lilla karta (steg 11.13.25)
// var elden står nu: där kartan lade den, eller dit byn flyttat den (steg 2.10.4, eldflytt.ts)
export const eldPlats = (s: State) => s.fire.at ?? getMap(s.seed).fire;
// rutorna en eld står på (steg 12.1.207): en lägereld på en ruta, en härd (hearth 'hard') på två gånger två. at = var den står
// (den första elden står där eldPlats säger)
export function eldensRutor(f: Fire, at = f.at): { x: number; y: number }[] {
  if (!at) return [];
  const m = f.hearth === 'hard' ? 2 : 1, x0 = Math.floor(at.x), y0 = Math.floor(at.y), ut: { x: number; y: number }[] = [];
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) ut.push({ x: x0 + i, y: y0 + j });
  return ut;
}
// åt vilket håll (x, y) ligger sett från elden: norr, nordost … (testlägets rader, steg 4.5.6.4)
export const vaderstreck = (s: State, x: number, y: number) => { const e = eldPlats(s); return streckAv(Math.atan2(y - e.y - 0.5, x - e.x - 0.5)); };
