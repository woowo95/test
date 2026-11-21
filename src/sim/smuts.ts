// Smuts (steg 2.7.1–2.7.2, beslut): fläckar på marken som bleknar bort. Registret FLACKAR säger hur varje slag ser ut och hur
import { utanforByn } from './omrade';
// fort det bleknar. Stationsregistret säger vilka handlingar som smutsar ner en station och med vad (`smutsar` i STATIONER,
// stationer.ts): slaktbänken blir blodig när det slaktas där. Blodet har ett eget system sedan v94 (blod.ts), som smutsa
// skickar det till.
// Toa-fläckarna (steg 2.7.2) är smuts som spelar roll: den som går på toa utanför en latrin, eller kissar på sig, lämnar en
// fläck där hen står. Den som går förbi blir lite äcklad (sämre humör), ingen plockar bär och rötter på eller bredvid den
// (spotFor i val.ts), och ligger den nära vattnet blir vattnet smutsigare (vattenSmuts, som törsten och lärdomarna om vattnet
// frågar). Latrinen (en station, STATIONER i stationer.ts) samlar allt på ett ställe: den som går på toa går dit om byn har
// en, får vara ifred (lite bättre humör) och lämnar ingen fläck, men gropen fylls (Station.fyllt) och fylls igen när den är
// full, så att byn gräver en ny. Får någon ont i magen av vatten som toaletten smutsat ner lär sig byn att smutsen kommer
// därifrån (s.hygien), och lägger sedan latrinen längre från vattnet (sokUtkant i stationer.ts)
import { Act, DAY, H, HOUR, Person, State, T, W } from './typer';
import { getMap } from './karta';
import { STATION, Station, isKlar, stationById, stationDef, stationFor, stationerOf, storlekAv } from './stationer';
import { clamp } from './slump';
import { balans } from './balans';
import { count, forstaGang, living, log } from './folk';
import { groundOf, tileOf } from './mark';
import { FOREST } from './vag';
import { smutsOf } from './sjo';
import { BLODFORM, blodNu, blodOf, blodas } from './blod';
import { roomAt, gridOf } from './byggnad';
import { bedTile } from './byggnader';
import { vaderNu } from './vader';
import { isFood } from './saker';
import { amountOf } from './lager';
import { tanke } from './tankar';

// ---------- balanstal (regel 8) ----------
export const SMUTS = balans('smuts', {
  latrinVantFull: 10, // så många minuters väntan på latrinen på sistone (byn tillsammans) gör bristen på latriner hel (steg 10.2.79) ...
  latrinVantDygn: 1, // ... och väntan klingar av till hälften på så här många dygn
  latrinUpptagen: 8, // en latrin där någon redan är räknas som så här många rutor längre bort när man väljer latrin (steg 11.1.71), och en ledig latrin inom så här många rutor gör att väntan inte är brist
  latrinGlomDygn: 2, // en latrin som ingen använt på så här många dygn (år i spelet) växer igen och försvinner (steg 11.1.71)
  vattenNara: 3, // toa-smuts så här många rutor från vattnet gör vattnet smutsigare ...
  vattenPer: 0.25, // ... så här mycket för en toa-fläck i full styrka på stranden (mindre längre bort) ...
  latrinVatten: 0.5, // ... och så här mycket för en latrin på stranden
  akel: 0.25, // den som står på eller bredvid en toa-fläck som är starkare än så här blir äcklad ...
  akelHumor: -0.05, akelTim: 2, // ... så här mycket (humör), i så många timmar
  toaInne: 2, // en toahög inomhus äcklar så här många gånger mer, för dem som är i rummet eller sover där, och väger lika mycket mer i rummets smuts (steg 11.1.73)
  plockRutor: 20, // toa-smuts i full styrka på eller bredvid rutan gör den lika mycket sämre att plocka på som så här många rutors längre väg (steg 10.11.14)
  ifred: 0.04, ifredTim: 2, // den som går på toa i latrinen får vara ifred: så här mycket bättre humör, i så många timmar
  byn: 0, // blod och toa-högar så här nära byns område (utanforByn, 0 innanför) ligger inne i byn (steg 3.6.10) ...
  ser: 4, // ... och syns för den som är vaken inom så här många rutor ...
  blodSyns: 0.2, // ... blodet när det är färskare än så här (blodNu), en toa-hög när den är starkare än akel ...
  synHumor: -0.04, synTim: 3, // ... och sänker humöret så här mycket, i så många timmar
  rutt: 2, // mat som ligger i en blodfläck, eller på eller bredvid en toa-hög, ruttnar så här många gånger fortare
  regnTvatt: 0.3, // i det kraftigaste regnet bleknar blod och fläckar ute så här mycket av sin fulla styrka mer per timme (steg 5.1.12)
  lardom: 0.25, // byns kunskap om hygien (s.hygien, 0–1) ökar så här mycket när någon får ont i magen av vatten som toaletten smutsat ner
});

interface FlackDef { namn: string; farg: number; bleknar: number; per: number }
// farg = färgen (platshållare), bleknar = timmar tills en fläck i full styrka är borta, per = hur mycket en enhet (ett slaktat
// djur, ett toabesök) smutsar ner, där 1 är en full fläck
export const FLACKAR = {
  toa: { namn: 'Toa', farg: 0x6b4a1f, bleknar: 48, per: 1 }, // steg 2.7.2
} satisfies Record<string, FlackDef>;
const DEF: Record<string, FlackDef> = FLACKAR;
// en fläck: slaget, rutan (index i kartan) och styrkan n (0–1) vid tiden t, och vem som lämnade den sist (av, personens id)
export interface Flack { k: string; i: number; n: number; t: number; av?: number }

// fläckens styrka nu: den bleknar jämnt från n till 0
export const flackNu = (f: Flack, now: number) => clamp(f.n - (now - f.t) / ((DEF[f.k]?.bleknar ?? 1) * HOUR), 0, 1);
const TOMT: Flack[] = []; // samma tomma lista varje gång, så att toaKarta inte räknas om (ingen ändrar listan, smutsaRuta gör en ny)
export const flackarOf = (s: State) => s.flackar ?? TOMT;

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
export const latriner = (s: State) => stationerOf(s).filter(t => stationDef(t.k)?.gor.includes('toa'));
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
  for (const t of latriner(s)) sprid(t.y * W + t.x, SMUTS.latrinVatten * (stationDef(t.k)?.dass?.smuts ?? 1)); // latrinen äcklar ingen, men den smutsar vattnet (utedasset mindre, steg 12.4.9)
  kartor.set(s, c = { hr, fl, v, n, nara, vatten });
  return c;
}
// toa-smutsen på eller bredvid rutan i (0–1)
export const toaNara = (s: State, i: number) => s.flackar?.length ? toaKarta(s).nara[i] ?? 0 : 0;
// så mycket av vattnets smuts på rutan i som kommer från toaletten (fläckar och latriner i närheten)
export const toaVatten = (s: State, i: number) => (s.flackar?.length || s.stationer?.length) ? toaKarta(s).vatten[i] ?? 0 : 0;
// hur smutsigt vattnet är på rutan i (0–1): mönstret längs stränderna (smutsOf i sjo.ts) och toa-smutsen i närheten
export const vattenSmuts = (s: State, i: number) => gridOf(s).brygga[i] ? 0 : clamp(smutsOf(s.seed)[i] + toaVatten(s, i), 0, 1); // ute vid bryggan är vattnet rent (steg 7.3.10)
// toa-smutsen sänker värdet på att plocka på rutan (x, y) (steg 10.11.14): så många rutors längre väg är den värd. Rutan stryks
// inte, så den som inte har något bättre (den som svälter) plockar där ändå, och får en chans till magsjuka (smutsigtAtit)
export const smutsAvdrag = (s: State, x: number, y: number) => toaNara(s, Math.floor(y) * W + Math.floor(x)) * SMUTS.plockRutor;
// maten som plockats där det är toa-smuts (steg 10.11.14): n av saken k, plockad på en ruta med smutsen t (0–1). Byn minns
// hur mycket av förrådets k som är smutsigt (s.smutsMat), vägt efter smutsen
export function smutsigtPlock(s: State, k: string, n: number, t: number) {
  if (t > 0 && n > 0 && isFood(k)) (s.smutsMat ??= {})[k] = (s.smutsMat[k] ?? 0) + n * t;
}
// det smutsiga kan inte vara mer än det som finns: maten som ruttnat, kokats, bytts bort eller getts bort tar sin del med sig
// (räknas en gång i timmen, TAKTER i steg.ts)
export function smutsMatTimme(s: State) {
  for (const k in s.smutsMat ?? {}) { const n = Math.min(s.smutsMat![k], amountOf(s, k)); if (n < 1e-6) delete s.smutsMat![k]; else s.smutsMat![k] = n; }
}
// den som åt per (saken → mängd) åt så här stor del smutsigt (0–1), och det smutsiga i förrådet minskar med det som åts. Den
// smutsiga delen av k är det smutsiga delat med allt av k som fanns (det som åts och det som är kvar)
export function smutsigtAtit(s: State, per: Record<string, number>) {
  let alla = 0, smutsigt = 0;
  for (const k in per) {
    alla += per[k];
    const d = s.smutsMat?.[k]; if (!d) continue;
    const fanns = amountOf(s, k) + per[k], del = fanns > 0 ? Math.min(1, d / fanns) : 0;
    smutsigt += per[k] * del;
    s.smutsMat![k] = Math.max(0, Math.min(d, fanns) - per[k] * del);
    if (s.smutsMat![k] < 1e-6) delete s.smutsMat![k];
  }
  return alla > 0 ? smutsigt / alla : 0;
}

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
  return { n, kvar: n * (DEF[f.k]?.bleknar ?? 0), akel: n > SMUTS.akel, plock: n > 0, vatten };
}

// varje steg för den som är vaken: står hen på eller bredvid en toa-fläck blir hen äcklad. Inte den som själv är på toa.
// Ser hen blod eller en toa-hög inne i byn (steg 3.6.10) blir humöret sämre
export function akel(s: State, p: Person) {
  if (p.task?.act === 'sova' || p.task?.act === 'toa') return; // den som själv är på toa störs inte av smutsen
  const syns = smutsPunkter(s), R = SMUTS.ser;
  if (syns.length && syns.some(q => Math.abs(q.x - p.x) <= R && Math.abs(q.y - p.y) <= R && Math.hypot(q.x - p.x, q.y - p.y) <= R)) tanke(p, 'blodSmuts', s.now, { v: SMUTS.synHumor, tid: SMUTS.synTim * HOUR });
  if (!s.flackar?.length) return;
  if (toaNara(s, tileOf(p.x, p.y)) > SMUTS.akel) tanke(p, 'akelSmuts', s.now, { v: SMUTS.akelHumor, tid: SMUTS.akelTim * HOUR });
  // en toahög inomhus (steg 11.1.73): den som är i rummet eller sover där äcklas mer än av en hög ute i byn
  const i = tileOf(p.x, p.y), har = roomAt(s, i % W, Math.floor(i / W)), b = bedTile(s, p), sov = b === undefined ? undefined : roomAt(s, b % W, Math.floor(b / W));
  if ((har || sov) && toaIRum(s, [har, sov])) tanke(p, 'akelToa', s.now, { v: SMUTS.akelHumor * SMUTS.toaInne, tid: SMUTS.akelTim * HOUR });
}
// en toahög som syns (starkare än SMUTS.akel) på golvet i något av rummen
function toaIRum(s: State, rum: (ReturnType<typeof roomAt>)[]) {
  for (const f of flackarOf(s)) if (f.k === 'toa' && flackNu(f, s.now) > SMUTS.akel) for (const r of rum) if (r && r.tiles.includes(f.i)) return true;
  return false;
}
// blodet, toa-högarna och resterna inne i byn som syns (punkter), och rutorna där det ligger blod (blod), med styrkan vid timmens
// början. Rutorna med blod sparas en timme i taget och tills blodet ändras (blodas lägger en ny lista). Punkterna räknas varje
// gång de frågas, eftersom resterna (stackarna) och byns område ändras utan att listorna gör det: förut sparades också de, och då
// berodde svaret på vem som frågade först i timmen, så att en inläst by kunde få ett annat svar än den som räknats hela tiden
const blodCache = new WeakMap<State, { hr: number; b: unknown; blod: Set<number> }>();
function blodRutor(s: State) {
  const hr = Math.floor(s.now / HOUR), h0 = hr * HOUR;
  let c = blodCache.get(s);
  if (c && c.hr === hr && c.b === s.blod) return c.blod; // själva listan (blodOf ger en ny tom lista när inget blod finns)
  const blod = new Set<number>();
  for (const g of blodOf(s)) if (blodNu(g, Math.max(h0, g.t)) > 0) blod.add(tileOf(g.x, g.y));
  blodCache.set(s, c = { hr, b: s.blod, blod });
  return blod;
}
export function smutsPunkter(s: State) {
  const h0 = Math.floor(s.now / HOUR) * HOUR, punkter: { x: number; y: number }[] = [];
  for (const g of blodOf(s)) if (blodNu(g, Math.max(h0, g.t)) > SMUTS.blodSyns && utanforByn(s, Math.floor(g.x), Math.floor(g.y)) <= SMUTS.byn) punkter.push({ x: g.x, y: g.y });
  for (const f of flackarOf(s)) {
    const x = f.i % W, y = Math.floor(f.i / W);
    if (f.k === 'toa' && flackNu(f, Math.max(h0, f.t)) > SMUTS.akel && utanforByn(s, x, y) <= SMUTS.byn) punkter.push({ x: x + 0.5, y: y + 0.5 });
  }
  for (const a of s.stackar ?? []) if ((a.k === 'slaktrens' || a.k === 'vaxtrest') && a.n >= 1 && utanforByn(s, a.x, a.y) <= SMUTS.byn) punkter.push({ x: a.x + 0.5, y: a.y + 0.5 }); // resterna i byn (steg 9.7.5)
  return punkter;
}
// maten på rutan (x, y) ruttnar fortare i en blodfläck eller på eller bredvid en toa-hög (steg 3.6.10): så här många gånger
export const ruttSmuts = (s: State, x: number, y: number) => {
  if (!s.blod?.length && !s.flackar?.length) return 1;
  const i = y * W + x;
  return toaNara(s, i) > 0 || blodRutor(s).has(i) ? SMUTS.rutt : 1;
};

// ---------- latrinen ----------
// den latrin p går till: en färdig som inte är full, efter avståndet och om den är ledig (steg 11.1.71): en där någon redan
// är räknas som SMUTS.latrinUpptagen rutor längre bort, så att de latriner som finns används
export function latrinFor(s: State, p: Person) {
  let best: Station | undefined, bd = Infinity;
  for (const t of latriner(s)) {
    if (!isKlar(t) || (t.fyllt ?? 0) >= 1) continue;
    const d = Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y) + (latrinUpptagen(s, t, p) ? SMUTS.latrinUpptagen : 0);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
// hur full latrinen är (0–1)
export const latrinFyllt = (t: Station) => clamp(t.fyllt ?? 0, 0, 1);
// byn vill ha en ny latrin: den saknar en som inte är nästan full (projekt.ts)
// med en kompost (steg 9.7.6) töms den nästan fulla latrinen i stället, så byn vill ha en ny först när den är full
// minuterna byborna väntat på latrinen på sistone, avklingade till nu (steg 10.2.79)
export const latrinVantNu = (s: State) => { const v = s.latrinVant; return v ? v.m * Math.pow(0.5, (s.now - v.t) / (SMUTS.latrinVantDygn * DAY)) : 0; };
// en annan latrin är ledig nära p (steg 11.1.71): då är väntan ingen brist på latriner
export const latrinLedigNara = (s: State, p: Person, utom: Station) => latriner(s).some(t => t !== utom && isKlar(t) && (t.fyllt ?? 0) < 1 && Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y) <= SMUTS.latrinUpptagen && !latrinUpptagen(s, t, p));
// en latrin som ingen använt på SMUTS.latrinGlomDygn växer igen och försvinner (steg 11.1.71), som en full som fylls igen;
// bara en grop gör det (vaxerIgen på raden), utedasset står kvar (steg 12.1.244).
// Räknas glest (TAKTER i steg.ts); tiden räknas från senaste besöket, eller från att den blev klar
export function latrinerVaxerIgen(s: State) {
  for (const t of latriner(s)) if (stationDef(t.k)?.vaxerIgen && isKlar(t) && (t.fyllt ?? 0) < STATION.latrinNy && s.now - (t.anv ?? t.klar ?? s.now) >= SMUTS.latrinGlomDygn * DAY) {
    fyllIgen(s, t, false); count(s, 'latriner igenvuxna');
  }
}
// väntan läggs till (den som står och väntar på en latrin där någon annan är, steg.ts)
export function latrinVanta(s: State, min: number) { s.latrinVant = { m: latrinVantNu(s) + min, t: s.now }; count(s, 'latrinVantMin', min); }
// bristen på latriner: ingen latrin som inte är (nästan) full, eller så mycket väntan på dem som finns (steg 10.2.79)
// med en kompost töms utedasset och står kvar (steg 12.4.9), men en grävd latrin som tömts går inte att använda igen: byn vill ha en ny när den är nästan full
export const latrinBrist = (s: State) => { const ko = harKompost(s), full = latriner(s).some(t => !isKlar(t) || latrinFyllt(t) < (ko && stationDef(t.k)?.dass ? 1 - 1e-9 : STATION.latrinNy)) ? 0 : 1; return Math.max(full, Math.min(1, latrinVantNu(s) / SMUTS.latrinVantFull)); };
// någon annan använder latrinen t just nu (står där och har börjat): latrinen används av en i taget (steg 10.2.79)
export const latrinUpptagen = (s: State, t: Station, p: Person) => living(s).some(q => q !== p && q.task?.act === 'toa' && q.task.ref === t.id && q.task.phase === 'do' && q.task.prog !== undefined);
const harKompost = (s: State) => stationerOf(s).some(t => t.k === 'kompost' && isKlar(t));
// p har gått på toa (framme, eller kissade på sig): i latrinen fylls gropen, annars blir det en fläck där p står
export function toaBesok(s: State, p: Person, ref?: number) {
  const t = stationById(s, ref);
  if (t && isKlar(t) && stationDef(t.k)?.gor.includes('toa') && Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y) < 1.5) {
    t.fyllt = latrinFyllt(t) + 1 / STATION.latrinRymmer; t.anv = s.now;
    count(s, 'latrinbesok');
    tanke(p, 'ifred', s.now, { v: SMUTS.ifred, tid: SMUTS.ifredTim * HOUR });
    if (t.fyllt >= 1 - 1e-9 && !harKompost(s)) fyllIgen(s, t); // med en kompost står den full tills någon tömmer den (steg 9.7.6)
    return;
  }
  smutsaRuta(s, 'toa', tileOf(p.x, p.y), 1, p.id);
  count(s, 'toafläckar');
}
// en full latrin fylls igen: den försvinner och rutan blir bar jord, som sedan blir gräs av sig själv (mark.ts)
export function fyllIgen(s: State, t: Station, full = true) {
  s.stationer = stationerOf(s).filter(q => q !== t);
  s.byggV = (s.byggV ?? 0) + 1;
  const g = groundOf(s), i = t.y * W + t.x;
  g.cover[i] = 0;
  if (g.trees[i] < FOREST) g.trees[i] = 0;
  if (!full) return;
  count(s, 'latriner fyllda');
  if (forstaGang(s, 'latrin_full')) log(s, 'Byns första latrin blev full och fylldes igen. Nu behövs en ny grop.', 'world');
}
// p fick ont i magen av vatten på rutan i: kom en del av smutsen från toaletten lär sig byn något om hygien
export function magont(s: State, i: number) {
  if (toaVatten(s, i) <= 0) return;
  const forr = s.hygien ?? 0;
  s.hygien = clamp(forr + SMUTS.lardom, 0, 1);
  count(s, 'magont av toa-smuts');
  if (forr <= 0) log(s, 'Byn förstod att vattnet blir smutsigt nära latrinen. Latrinen läggs hädanefter längre från vattnet.', 'world');
}

// Regnet tvättar bort fläckarna (steg 5.1.12): varje timme det regnar (inte snöar) blir blodet och fläckarna som ligger ute
// äldre, så att de bleknar fortare: i det kraftigaste regnet regnTvatt av sin fulla styrka mer per timme, så att några
// timmars regn tar bort det mesta. Under tak och i husen (roomAt) påverkar regnet dem inte. Vädret räknas ur tiden, så det
// blir likadant i spelet och i ikappräkningen. Nya listor och nya fläckar, så att det som räknats ur de gamla räknas om
export function regnetTvattar(s: State) {
  const v = vaderNu(s);
  if (v.nb <= 0 || v.sno) return;
  const del = v.nb * SMUTS.regnTvatt, ute = (x: number, y: number) => !roomAt(s, x, y);
  if (s.flackar?.length) s.flackar = s.flackar.map(f => ute((f.i % W) + 0.5, Math.floor(f.i / W) + 0.5) ? { ...f, t: f.t - del * (DEF[f.k]?.bleknar ?? 1) * HOUR } : f);
  if (s.blod?.length) s.blod = s.blod.map(b => ute(b.x, b.y) ? { ...b, t: b.t - del * BLODFORM[b.f]!.bleknar * HOUR } : b);
}
