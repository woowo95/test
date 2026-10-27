// Smuts (steg 2.7.1, beslut): fläckar på marken som bleknar bort. Registret FLACKAR säger hur varje slag ser ut och hur fort det
// bleknar. Stationsregistret säger vilka handlingar som smutsar ner en station och med vad (`smutsar` i STATIONER, stationer.ts):
// slaktbänken blir blodig när det slaktas där. Fläckarna är bara utseende: de rör inte byns slumpföljder och ingen bryr sig om dem
// än. Toa-fläckarna (steg 2.7.2) blir en rad till i registret
import { Act, H, HOUR, State, W } from './typer';
import { stationDef, stationFor, storlekAv } from './stationer';
import { clamp } from './slump';

interface FlackDef { namn: string; farg: number; bleknar: number; per: number }
// farg = färgen (platshållare), bleknar = timmar tills en fläck i full styrka är borta, per = hur mycket en enhet (ett slaktat
// djur) smutsar ner, där 1 är en full fläck
export const FLACKAR = {
  blod: { namn: 'Blod', farg: 0x7a1010, bleknar: 48, per: 0.3 },
} satisfies Record<string, FlackDef>;
export type FlackSlag = keyof typeof FLACKAR;
const DEF: Record<string, FlackDef> = FLACKAR;
// en fläck: slaget, rutan (index i kartan) och styrkan n (0–1) vid tiden t
export interface Flack { k: string; i: number; n: number; t: number }

// fläckens styrka nu: den bleknar jämnt från n till 0
export const flackNu = (f: Flack, now: number) => clamp(f.n - (now - f.t) / ((DEF[f.k]?.bleknar ?? 1) * HOUR), 0, 1);
export const flackarOf = (s: State) => s.flackar ?? [];

// ett tal 0–1 som bara beror på a och b, utan byns slumpföljder
const hash = (a: number, b: number) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };

// mangd enheter av handlingen act har gjorts (bearbeta i redskap.ts): smutsar stationen där det görs ner, om den gör det.
// Fläcken hamnar på en av stationens rutor eller raden framför, där man står
export function smutsa(s: State, act: Act, mangd: number) {
  const t = stationFor(s, act), k = t && stationDef(t.k)?.smutsar?.[act];
  if (!t || !k || !DEF[k] || mangd <= 0) return;
  const { w, h } = storlekAv(t), rutor: number[] = [];
  for (let y = t.y; y <= t.y + h; y++) for (let x = t.x - 1; x <= t.x + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) rutor.push(y * W + x);
  if (!rutor.length) return;
  const i = rutor[Math.floor(hash(s.now / HOUR, t.id) * rutor.length) % rutor.length]!;
  // de som bleknat bort tas bort
  const ut = flackarOf(s).filter(f => flackNu(f, s.now) > 0);
  const f = ut.find(g => g.k === k && g.i === i);
  if (f) { f.n = clamp(flackNu(f, s.now) + mangd * DEF[k].per, 0, 1); f.t = s.now; }
  else ut.push({ k, i, n: clamp(mangd * DEF[k].per, 0, 1), t: s.now });
  s.flackar = ut;
}
// hur smutsig stationen t är av varje slag: den starkaste fläcken på dess rutor och raden framför (stationsfliken)
export function smutsVid(s: State, t: { id: number; k: string; x: number; y: number; rot?: 1 }) {
  const { w, h } = storlekAv(t), ut: Record<string, number> = {};
  for (const f of flackarOf(s)) {
    const x = f.i % W, y = Math.floor(f.i / W);
    if (x < t.x - 1 || x > t.x + w || y < t.y || y > t.y + h) continue;
    ut[f.k] = Math.max(ut[f.k] ?? 0, flackNu(f, s.now));
  }
  return ut;
}
