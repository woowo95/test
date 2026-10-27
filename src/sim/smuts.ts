// Smuts (steg 2.7.1–2.7.2, beslut): fläckar på marken som bleknar bort. Registret FLACKAR säger hur varje slag ser ut och hur
// fort det bleknar. Stationsregistret säger vilka handlingar som smutsar ner en station och med vad (`smutsar` i STATIONER,
// stationer.ts): slaktbänken blir blodig när det slaktas där. Blodet har ett eget system sedan v94 (blod.ts), som smutsa
// skickar det till.
// Toa-fläckarna (steg 2.7.2) är smuts som spelar roll: den som går på toa utanför en latrin, eller kissar på sig, lämnar en
// fläck där hen står. Den som går förbi blir lite äcklad (sämre humör), ingen plockar bär och rötter på eller bredvid den
// (spotFor i val.ts), och ligger den nära vattnet blir vattnet smutsigare (vattenSmuts, som törsten och lärdomarna om vattnet
// frågar). Latrinen (en station, STATIONER i stationer.ts) samlar allt på ett ställe: den som går på toa går dit om byn har
// en, får vara ifred (lite bättre humör) och lämnar ingen fläck, men gropen fylls (Station.fyllt) och fylls igen när den är
// full, så att byn gräver en ny. Får någon ont i magen av vatten som toaletten smutsat ner lär sig byn att smutsen kommer
// därifrån (s.hygien), och lägger sedan latrinen längre från vattnet (siteUtkant i stationer.ts)
import { Act, H, HOUR, Person, State, T, W } from './typer';
import { getMap } from './karta';
import { STATION, Station, isKlar, stationById, stationDef, stationFor, stationerOf, storlekAv } from './stationer';
import { clamp } from './slump';
import { balans } from './balans';
import { count, forstaGang, log, think } from './folk';
import { groundOf, tileOf } from './mark';
import { FOREST } from './vag';
import { smutsOf } from './sjo';
import { blodas } from './blod';

// ---------- balanstal (regel 8) ----------
export const SMUTS = balans('smuts', {
  vattenNara: 3, // toa-smuts så här många rutor från vattnet gör vattnet smutsigare ...
  vattenPer: 0.25, // ... så här mycket för en toa-fläck i full styrka på stranden (mindre längre bort) ...
  latrinVatten: 0.5, // ... och så här mycket för en latrin på stranden
  akel: 0.25, // den som står på eller bredvid en toa-fläck som är starkare än så här blir äcklad ...
  akelHumor: -0.05, akelTim: 2, // ... så här mycket (humör), i så många timmar
  plock: 0.15, // man plockar inte på eller bredvid en toa-fläck som är starkare än så här
  ifred: 0.04, ifredTim: 2, // den som går på toa i latrinen får vara ifred: så här mycket bättre humör, i så många timmar
  lardom: 0.25, // byns kunskap om hygien (s.hygien, 0–1) ökar så här mycket när någon får ont i magen av vatten som toaletten smutsat ner
});

interface FlackDef { namn: string; farg: number; bleknar: number; per: number }
// farg = färgen (platshållare), bleknar = timmar tills en fläck i full styrka är borta, per = hur mycket en enhet (ett slaktat
// djur, ett toabesök) smutsar ner, där 1 är en full fläck
export const FLACKAR = {
  toa: { namn: 'Toa', farg: 0x6b4a1f, bleknar: 48, per: 1 }, // steg 2.7.2
} satisfies Record<string, FlackDef>;
export type FlackSlag = keyof typeof FLACKAR;
const DEF: Record<string, FlackDef> = FLACKAR;
// en fläck: slaget, rutan (index i kartan) och styrkan n (0–1) vid tiden t, och vem som lämnade den sist (av, personens id)
export interface Flack { k: string; i: number; n: number; t: number; av?: number }

// fläckens styrka nu: den bleknar jämnt från n till 0
export const flackNu = (f: Flack, now: number) => clamp(f.n - (now - f.t) / ((DEF[f.k]?.bleknar ?? 1) * HOUR), 0, 1);
export const flackarOf = (s: State) => s.flackar ?? [];

// ett tal 0–1 som bara beror på a och b, utan byns slumpföljder
const hash = (a: number, b: number) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };

// en fläck av slaget k på rutan i, mangd enheter. De som bleknat bort tas bort
function smutsaRuta(s: State, k: string, i: number, mangd: number, av?: number) {
  if (!DEF[k] || mangd <= 0 || i < 0 || i >= W * H) return;
  const ut = flackarOf(s).filter(f => flackNu(f, s.now) > 0);
  const f = ut.find(g => g.k === k && g.i === i);
  if (f) { f.n = clamp(flackNu(f, s.now) + mangd * DEF[k].per, 0, 1); f.t = s.now; if (av !== undefined) f.av = av; }
  else ut.push({ k, i, n: clamp(mangd * DEF[k].per, 0, 1), t: s.now, ...(av !== undefined ? { av } : {}) });
  s.flackar = ut;
}
// mangd enheter av handlingen act har gjorts (bearbeta i redskap.ts): smutsar stationen där det görs ner, om den gör det.
// Fläcken hamnar på en av stationens rutor eller raden framför, där man står
export function smutsa(s: State, act: Act, mangd: number) {
  const t = stationFor(s, act), k = t && stationDef(t.k)?.smutsar?.[act];
  if (!t || !k || (!DEF[k] && k !== 'blod') || mangd <= 0) return;
  const { w, h } = storlekAv(t), rutor: number[] = [];
  for (let y = t.y; y <= t.y + h; y++) for (let x = t.x - 1; x <= t.x + w; x++) if (x >= 0 && y >= 0 && x < W && y < H) rutor.push(y * W + x);
  if (!rutor.length) return;
  const i = rutor[Math.floor(hash(s.now / HOUR, t.id) * rutor.length) % rutor.length]!;
  if (k === 'blod') blodas(s, (i % W) + 0.5, Math.floor(i / W) + 0.5, 'slakt', mangd);
  else smutsaRuta(s, k, i, mangd);
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

// ---------- toa-smutsen (steg 2.7.2) ----------
// Kartan över toa-smutsen: nara = den starkaste toa-fläcken på rutan eller rakt bredvid (äcklet och plockandet), vatten = så
// mycket smutsigare vattnet blir där (fläckar och latriner inom SMUTS.vattenNara rutor, mindre längre bort). Räknas om varje
// timme i spelet och när en fläck eller station tillkommer, med fläckarnas styrka vid timmens början (eller när de kom), så att
// det blir samma i levande läget, snabbläget och gränssnittet
interface ToaKarta { hr: number; fl: Flack[]; v: number; n: number; nara: Float32Array; vatten: Float32Array }
const kartor = new WeakMap<State, ToaKarta>();
const latriner = (s: State) => stationerOf(s).filter(t => stationDef(t.k)?.gor.includes('toa'));
function toaKarta(s: State): ToaKarta {
  const hr = Math.floor(s.now / HOUR), fl = flackarOf(s), v = s.byggV ?? 0, n = stationerOf(s).length;
  let c = kartor.get(s);
  if (c && c.hr === hr && c.fl === fl && c.v === v && c.n === n) return c;
  const nara = new Float32Array(W * H), vatten = new Float32Array(W * H), R = SMUTS.vattenNara, h0 = hr * HOUR;
  // vattnet: mindre ju längre bort, och inget alls längre bort än vattenNara rutor
  const sprid = (i: number, styrka: number) => {
    const x0 = i % W, y0 = Math.floor(i / W);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x >= 0 && y >= 0 && x < W && y < H) vatten[y * W + x] += styrka * (1 - Math.max(Math.abs(dx), Math.abs(dy)) / (R + 1));
    }
  };
  for (const f of fl) {
    const n0 = f.k === 'toa' ? flackNu(f, Math.max(h0, f.t)) : 0;
    if (n0 <= 0) continue;
    sprid(f.i, n0 * SMUTS.vattenPer);
    const x0 = f.i % W, y0 = Math.floor(f.i / W);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x >= 0 && y >= 0 && x < W && y < H) nara[y * W + x] = Math.max(nara[y * W + x], n0);
    }
  }
  for (const t of latriner(s)) sprid(t.y * W + t.x, SMUTS.latrinVatten); // latrinen äcklar ingen, men den smutsar vattnet
  kartor.set(s, c = { hr, fl, v, n, nara, vatten });
  return c;
}
// toa-smutsen på eller bredvid rutan i (0–1)
export const toaNara = (s: State, i: number) => s.flackar?.length ? toaKarta(s).nara[i] ?? 0 : 0;
// så mycket av vattnets smuts på rutan i som kommer från toaletten (fläckar och latriner i närheten)
export const toaVatten = (s: State, i: number) => (s.flackar?.length || s.stationer?.length) ? toaKarta(s).vatten[i] ?? 0 : 0;
// hur smutsigt vattnet är på rutan i (0–1): mönstret längs stränderna (smutsOf i sjo.ts) och toa-smutsen i närheten
export const vattenSmuts = (s: State, i: number) => clamp(smutsOf(s.seed)[i] + toaVatten(s, i), 0, 1);
// man plockar inte där det är toa-smuts (spotFor i val.ts)
export const forSmutsigt = (s: State, x: number, y: number) => toaNara(s, y * W + x) > SMUTS.plock;

// toa-högen på rutan (x, y), om det finns en som inte bleknat bort (steg 2.10.5: den går att trycka på)
export const toaAt = (s: State, x: number, y: number) => flackarOf(s).find(f => f.k === 'toa' && f.i === y * W + x && flackNu(f, s.now) > 0);
// vad toa-högen f gör nu (inforutan): styrkan, timmar tills den är borta, om den äcklar dem som går förbi, om ingen plockar
// där och om den smutsar vattnet (det finns vatten inom SMUTS.vattenNara rutor)
export function toaInfo(s: State, f: Flack) {
  const n = flackNu(f, s.now), x0 = f.i % W, y0 = Math.floor(f.i / W), R = SMUTS.vattenNara, map = getMap(s.seed);
  let vatten = false;
  for (let dy = -R; dy <= R && !vatten; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (x >= 0 && y >= 0 && x < W && y < H && map.tiles[y * W + x] === T.Vatten) { vatten = true; break; }
  }
  return { n, kvar: n * (DEF[f.k]?.bleknar ?? 0), akel: n > SMUTS.akel, plock: n > SMUTS.plock, vatten };
}

// varje steg för den som är vaken: står hen på eller bredvid en toa-fläck blir hen äcklad. Inte den som själv är på toa
export function akel(s: State, p: Person) {
  if (!s.flackar?.length || p.task?.act === 'toa') return;
  if (toaNara(s, tileOf(p.x, p.y)) > SMUTS.akel) think(p, 'Äcklad av smuts', SMUTS.akelHumor, s.now, SMUTS.akelTim * HOUR);
}

// ---------- latrinen ----------
// den latrin p går till: den närmaste färdiga som inte är full
export function latrinFor(s: State, p: Person) {
  let best: Station | undefined, bd = Infinity;
  for (const t of latriner(s)) {
    if (!isKlar(t) || (t.fyllt ?? 0) >= 1) continue;
    const d = Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
// hur full latrinen är (0–1)
export const latrinFyllt = (t: Station) => clamp(t.fyllt ?? 0, 0, 1);
// byn vill ha en ny latrin: den saknar en som inte är nästan full (projekt.ts)
export const latrinBrist = (s: State) => latriner(s).some(t => !isKlar(t) || latrinFyllt(t) < STATION.latrinNy) ? 0 : 1;
// p har gått på toa (framme, eller kissade på sig): i latrinen fylls gropen, annars blir det en fläck där p står
export function toaBesok(s: State, p: Person, ref?: number) {
  const t = stationById(s, ref);
  if (t && isKlar(t) && stationDef(t.k)?.gor.includes('toa') && Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y) < 1.5) {
    t.fyllt = latrinFyllt(t) + 1 / STATION.latrinRymmer;
    count(s, 'latrinbesok');
    think(p, 'Fick vara ifred', SMUTS.ifred, s.now, SMUTS.ifredTim * HOUR);
    if (t.fyllt >= 1 - 1e-9) fyllIgen(s, t);
    return;
  }
  smutsaRuta(s, 'toa', tileOf(p.x, p.y), 1, p.id);
  count(s, 'toafläckar');
}
// en full latrin fylls igen: den försvinner och rutan blir bar jord, som sedan blir gräs av sig själv (mark.ts)
function fyllIgen(s: State, t: Station) {
  s.stationer = stationerOf(s).filter(q => q !== t);
  s.byggV = (s.byggV ?? 0) + 1;
  const g = groundOf(s), i = t.y * W + t.x;
  g.cover[i] = 0;
  if (g.trees[i] < FOREST) g.trees[i] = 0;
  count(s, 'latriner fyllda');
  if (forstaGang(s, 'latrin_full')) log(s, 'Byns första latrin blev full och fylldes igen. Nu behövs en ny grop.', 'world');
}
// p fick ont i magen av vatten på rutan i: kom en del av smutsen från toaletten lär sig byn något om hygien
export function magont(s: State, i: number) {
  if (toaVatten(s, i) <= 0) return;
  const forr = s.hygien ?? 0;
  s.hygien = clamp(forr + SMUTS.lardom, 0, 1);
  count(s, 'magont av toa-smuts');
  if (forr <= 0) log(s, 'Byn förstod att vattnet blir smutsigt nära toaletten. Latrinen läggs hädanefter längre från vattnet.', 'world');
}
