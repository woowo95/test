import { dropLoad, fetchSpot, storeLoad } from './lager';
import { Del, addDel, ownTake } from './egendom';
import { coldOf, temperature } from './vader';
import { ageOf, count, log, stat, think } from './folk';
import { flintFactor, stoneDist, takeFrom } from './fynd';
import { observe } from './minne';
import { getMap } from './karta';
import { tileOf, tread } from './mark';
import { moodOf } from './samtal';
import { duty, sedEvent } from './seder';
import { chance, clamp, rnd } from './slump';
import { ageIndex, isLight } from './tid';
import { Act, DAY, Fire, FireLog, GREN, HEARTHS, HOUR, IGNITERS, Person, SEC, State } from './typer';
import { item } from './saker';

// ---------- eld ----------
export const hearthOf = (f: Fire) => HEARTHS.find(h => h.id === f.hearth) ?? HEARTHS[0];
export const igniterOf = (s: State) => IGNITERS.find(i => (s.items[i.id] ?? 0) >= 1);
// bränsle i förrådet räknat i ved: ved och grenar
export const fuelStock = (s: State) => s.wood + item(s, 'grenar') * GREN;
// ta bränsle ur förrådet, ved först och sedan grenar; ger hur mycket som togs
// p = den som tar det; byns ved tas först (egendom.ts). ag får vems bränslet var, räknat i ved
export function takeFuel(s: State, n: number, p?: Person, ag?: Del) {
  const v = Math.min(n, s.wood);
  s.wood -= v; const w = ownTake(s, p, 'ved', v, true);
  const g = Math.min(item(s, 'grenar'), (n - v) / GREN);
  if (g > 0) { s.items.grenar = item(s, 'grenar') - g; if (ag) addDel(ag, ownTake(s, p, 'grenar', g, true), GREN); else ownTake(s, p, 'grenar', g, true); }
  if (ag) addDel(ag, w);
  return v + g * GREN;
}
// bränsle som inte fick plats går tillbaka till förrådet som grenar
const giveBack = (s: State, n: number) => { if (n > 0) s.items.grenar = item(s, 'grenar') + n / GREN; };
function fireLog(s: State, e: Omit<FireLog, 't'>) { s.fire.log.push({ t: s.now, ...e }); if (s.fire.log.length > 80) s.fire.log.splice(0, s.fire.log.length - 80); }
export const emberOn = (s: State) => !s.fire.lit && s.fire.emberUntil !== undefined && s.fire.emberUntil > s.now;
// eldens styrka 0–1 efter hur mycket ved som brinner
export function fireHeat(s: State) { const f = s.fire; return f.lit ? clamp(f.fuel / hearthOf(f).maxFuel * 1.4, 0.15, 1) : 0; }
export function heatRadius(s: State) { return hearthOf(s.fire).radius * (0.5 + 0.5 * fireHeat(s)); }
export function heatAt(s: State, x: number, y: number) {
  const I = fireHeat(s); if (!I) return 0;
  const m = getMap(s.seed), r = heatRadius(s);
  const d = Math.hypot(x - (m.fire.x + 0.5), y - (m.fire.y + 0.5));
  return d >= r ? 0 : I * (1 - d / r);
}
// hur mycket ved som önskas på elden just nu (den som vill ha mest)
export const fireWant = (s: State) => s.fire.want ?? 0;
export interface Wish { v: number; why: string }
const relightHard = (s: State) => 1 - (igniterOf(s) ?? IGNITERS[0]).chance;
// varje invånares egen önskan om ved på elden; vc = hur mycket byn fryser 0–1
export function fireWish(s: State, p: Person, vc: number): Wish {
  const light = isLight(s.now), cold = coldOf(temperature(s)), sd = s.seder.v;
  const opts: Wish[] = [
    { v: clamp((1 - p.warm) * 1.2 + cold * 2.4, 0, 1), why: p.warm < 0.5 ? 'Fryser och vill ha mer värme' : 'Det är kallt och hen vill hålla värmen' },
    { v: clamp(vc * (p.pot.empati / 10) * (0.6 + 0.4 * sd.gemenskap), 0, 1), why: 'Andra i byn fryser' },
    { v: (light ? 0.12 : 0.55) * clamp(1.5 - moodOf(p, s.now), 0.4, 1), why: light ? 'Vill ha en trivsam eld' : 'Vill ha en trivsam eld att samlas kring i mörkret' },
    { v: clamp((p.pot.intelligens - 11) / 9, 0, 1) * relightHard(s) * (0.6 + 0.4 * sd.forsiktighet) * 0.14, why: 'Vill inte att elden slocknar, den är svår att tända igen' },
  ];
  if (!s.fire.lightings) opts.push({ v: 0.3 * (0.6 + p.pot.nyfikenhet / 25), why: 'Byn har aldrig haft eld' });
  const b = opts.reduce((a, o) => (o.v > a.v ? o : a));
  return { v: b.v * hearthOf(s.fire).maxFuel, why: b.why };
}
// tändmaterial som invånarna vill ha i förrådet
const tinderWant = (s: State) => (s.fire.lit ? 12 : 36);
// den första elden läggs i en ring av stenar; ringen ligger kvar när elden slocknat
export const RING = 6;
export const needStones = (s: State) => !s.fire.ring && item(s, 'sten') < RING;
export function canLight(s: State) {
  const ig = igniterOf(s);
  return !!ig && !needStones(s) && item(s, 'torrgras') >= ig.grass && (item(s, 'grenar') >= ig.sticks || item(s, 'kol') >= 1) && fuelStock(s) >= 1;
}
export function needTinder(s: State) {
  return !s.fire.lit && !emberOn(s) && (item(s, 'flinta') < 1 || needStones(s) || item(s, 'torrgras') < 12 || item(s, 'grenar') < 12);
}
function durText(sec: number) { const h = sec / 3600; return h >= 24 ? `${(h / 24).toFixed(1).replace('.', ',')} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
function lightFire(s: State, p: Person) {
  const f = s.fire, start = takeFuel(s, 2, p), onCoal = (f.ash ?? 0) >= 1;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  if (!f.ring) { s.items.sten = item(s, 'sten') - RING; ownTake(s, p, 'sten', RING, true); f.ring = true; log(s, `${p.name} lade en ring av stenar runt eldplatsen.`, 'world', [p.id]); }
  if (onCoal) { f.ash = 0; f.ashUntil = undefined; } // kolet i den gamla högen tar fyr och blir en del av den nya elden
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries });
  log(s, `${p.name} lyckades tända elden${onCoal ? ' på den gamla kolhögen' : ''}${f.tries > 1 ? ` efter ${f.tries} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', 0.15, s.now, DAY / 2);
  if (f.lightings === 1) { p.fame.push('Tände byns första eld'); sedEvent(s, 'nyfikenhet', 0.1, 'Elden har gjort byn nyfiken på vad mer som går att lära sig.'); }
  f.tries = 0;
}
// ett försök att tända med det bästa tänddonet i förrådet
export function tryLight(s: State, p: Person) {
  const ig = igniterOf(s)!, f = s.fire;
  s.items.torrgras = item(s, 'torrgras') - ig.grass; ownTake(s, p, 'torrgras', ig.grass, true);
  if (item(s, 'grenar') >= ig.sticks) { addItems(s, { grenar: -ig.sticks }); ownTake(s, p, 'grenar', ig.sticks, true); }
  else { s.items.kol = item(s, 'kol') - 1; ownTake(s, p, 'kol', 1, true); } // lite kol kan ersätta grenarna

  f.tries++; f.tryTotal++;
  p.skill.elda = clamp(p.skill.elda + 0.08 * (0.5 + p.pot.intelligens / 20) * (1 - p.skill.elda / 21), 0, 20);
  const c = ig.chance * (0.5 + p.skill.elda / 20 + stat(p, 'intelligens', s.now) / 40) * (ageIndex(s) === 0 ? 0.6 : 1) * ((f.ash ?? 0) >= 1 ? 1.5 : 1); // en gammal kolhög tar lättare fyr
  if (rnd(s, 'eld', p) < c) { lightFire(s, p); return true; }
  if (ig.id === 'flinta' && rnd(s, 'eld', p) < 0.004) {
    s.items.flinta--; ownTake(s, p, 'flinta', 1, true); fireLog(s, { k: 'sprack', id: p.id });
    log(s, `Flintan som ${p.name} slog med sprack.`, 'world', [p.id]);
  }
  return false;
}
export function takeCoal(s: State, p: Person, verb: string) {
  const n = s.fire.ash ?? 0;
  if (n < 1) return;
  addItems(s, { kol: n });
  s.fire.ash = 0; s.fire.ashUntil = undefined;
  log(s, `${p.name} ${verb} ${n} kol ur den gamla elden och lade dem i förrådet.`, 'world', [p.id]);
}
export function addFuel(s: State, p: Person, n: number) {
  const f = s.fire, h = hearthOf(f);
  if (!f.lit && !emberOn(s)) { giveBack(s, n); return; } // elden hann slockna: bränslet går tillbaka
  if (!f.lit) {
    f.lit = true; f.emberUntil = undefined;
    fireLog(s, { k: 'glöd', id: p.id });
    log(s, `${p.name} blåste liv i glöden och elden brinner igen.`, 'world', [p.id]);
  }
  const put = Math.min(n, h.maxFuel - f.fuel);
  f.fuel += put; giveBack(s, n - put);
  f.fills[p.id] = (f.fills[p.id] ?? 0) + 1;
  fireLog(s, { k: 'fyll', id: p.id, n: put });
  p.skill.elda = clamp(p.skill.elda + 0.01 * (1 - p.skill.elda / 21), 0, 20);
}
function assign(s: State, p: Person, act: Act, tx: number, ty: number, dur: number, live: boolean, why: string) {
  if (!live) { p.x = tx; p.y = ty; tread(s, tx, ty, 1); }
  if (p.task && (p.task.carry > 0 || p.task.items)) { if (live) dropLoad(s, p.task, p.x, p.y, p.id); else storeLoad(s, p.task, undefined, undefined, p.id); } // bördan läggs ner där hen står, den försvinner inte
  p.task = { act, phase: live ? 'go' : 'do', tx, ty, until: s.now + dur, carry: 0, why, dark: !isLight(s.now) };
}
const awake = (s: State, p: Person, minAge: number) => {
  const t = p.task;
  return ageOf(p, s.now) >= minAge && !(p.sickUntil && p.sickUntil > s.now) && p.health >= 0.4 &&
    (!t || (t.act !== 'sova' && !(t.phase === 'back' && t.carry > 0) && !t.items));
};
export function stepFire(s: State, dtSec: number, live: boolean, ppl: Person[]) {
  const f = s.fire, h = hearthOf(f), m = getMap(s.seed), now = s.now;
  if (f.lit) {
    const b = Math.min(f.fuel, h.burn / 3600 * dtSec);
    f.fuel -= b; f.burned += b; f.totalBurned += b; f.litSec += dtSec;
    if (f.fuel <= 1e-6) {
      f.fuel = 0; f.lit = false; f.emberUntil = now + HOUR; f.outs++;
      fireLog(s, { k: 'slocknade', n: f.burned });
      log(s, `Elden slocknade efter att ha brunnit i ${durText((now - (f.litAt ?? now)) / SEC)}. Glöden lever en stund till.`, 'world');
    }
  }
  if (f.emberUntil !== undefined && !f.lit && f.emberUntil <= now) {
    // glöden dog: kvar blir en svart hög med lite kol, som ligger några dygn
    f.emberUntil = undefined;
    // kolet blir alltid ett litet, slumpat antal; hämtar ingen det förtvinar det efter några dygn
    const coal = 1 + Math.floor(rnd(s, 'eld') * 4);
    f.ash = (f.ash ?? 0) + coal; f.ashUntil = now + 3 * DAY;
    log(s, `Elden har brunnit ut. Kvar ligger en svart hög med ${coal} kol.`, 'world');
  }
  if (f.ash && (f.ashUntil ?? 0) <= now) { f.ash = 0; f.ashUntil = undefined; }
  // vilja: varje vaken invånare vill ha olika mycket ved på elden
  const vc = ppl.reduce((a, p) => a + clamp(0.6 - p.warm, 0, 0.6) / 0.6, 0) / (ppl.length || 1);
  const cands: { p: Person; w: Wish }[] = [];
  let top: { p: Person; w: Wish } | undefined;
  for (const p of ppl) {
    if (!awake(s, p, 8)) continue;
    const c = { p, w: fireWish(s, p, vc) };
    cands.push(c);
    if (!top || c.w.v > top.w.v) top = c;
  }
  f.want = top?.w.v ?? 0; f.wantBy = top?.p.id; f.wantWhy = top?.w.why;
  // påfyllning: den som vill ha klart mer ved än det som ligger på hämtar, plikttrogna och nära först
  if ((f.lit || emberOn(s)) && fuelStock(s) >= 0.5 && !ppl.some(p => p.task?.act === 'elda')) {
    const fx = m.fire.x + 0.5, fy = m.fire.y + 0.5;
    let best: { p: Person; w: Wish } | undefined, bs = -1e9;
    for (const c of cands) {
      if (c.w.v < f.fuel * 2 + 0.2) continue;
      const sc = (c.w.v - f.fuel) / h.maxFuel * (0.4 + duty(s, c.p)) - Math.hypot(c.p.x - fx, c.p.y - fy) / 25 + (c.p.task?.act === 'vakt' ? 0.3 : 0) + rnd(s, 'eld') * 0.1;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (best) {
      const p = best.p, n = Math.min(3, Math.max(1, best.w.v - f.fuel), fuelStock(s));
      if (live) { const at = fetchSpot(s, s.wood >= 1 ? 'ved' : 'grenar'); assign(s, p, 'elda', at.x, at.y, HOUR, true, best.w.why); }
      else addFuel(s, p, takeFuel(s, n, p));
    }
  }
  // tändning: när elden är släckt och någon vill ha eld försöker en person i taget
  if (!f.lit && !emberOn(s) && canLight(s) && f.want >= h.maxFuel * 0.1 && !ppl.some(p => p.task?.act === 'tanda')) {
    const ok = cands.filter(c => ageOf(c.p, now) >= 12 && c.w.v >= h.maxFuel * 0.05)
      .sort((a, b) => (b.p.skill.elda + stat(b.p, 'flit', now) / 2 + rnd(s, 'eld') * 3) - (a.p.skill.elda + stat(a.p, 'flit', now) / 2 + rnd(s, 'eld') * 3));
    const c = ok[0];
    if (c) assign(s, c.p, 'tanda', m.fire.x + 0.5 + (rnd(s, 'eld') - 0.5) * 1.2, m.fire.y + 1.3, 3 * HOUR, live, `Vill ha eld. ${c.w.why}`);
  }
}
// värmeförlust per timme utan eld: [ljus tid, mörk tid] per tidsålder
// samling hittar tändmaterial, sten och flinta när förrådet behöver det
const GRASS_SEASON = [0.25, 0.6, 1, 1.3];
export function forageItems(s: State, p: Person, dtSec: number): Record<string, number> | undefined {
  const ai = ageIndex(s), want = tinderWant(s), hrs = dtSec / 3600;
  const sk = 0.6 + p.skill.samla / 25;
  const got: Record<string, number> = {};
  if (item(s, 'torrgras') < want) got.torrgras = 3 * GRASS_SEASON[ai] * sk * hrs;
  if (item(s, 'grenar') < want) got.grenar = 3 * (ai === 0 ? 0.6 : 1) * sk * hrs;
  // stenar till eldringen: många vid stenarna, några i sanden, få annars
  if (needStones(s)) {
    const d = p.task ? stoneDist(s.seed)[tileOf(p.task.tx, p.task.ty)] : 9;
    got.sten = 0.8 * (d <= 1 ? 3 : d <= 3 ? 1.5 : 0.4) * sk * hrs;
  }
  // flinta är ovanlig och hittas oftast vid stenarna. Den slås mot en sten för att tända eld, och med en pinne blir den en yxa
  const ff = p.task ? flintFactor(s, p.task.tx, p.task.ty) : 0.4;
  if (item(s, 'flinta') + item(s, 'yxa') < 4 && chance(s, 0.04 * ff * sk / 3600, dtSec, 'arbete', p)) {
    got.flinta = 1; count(s, ff > 2 ? 'flintaSten' : 'flintaAnnan');
    if (p.task) takeFrom(s, 'flinta', p.task.tx, p.task.ty, 1);
    if (ff > 2 && p.task) observe(s, p, 'flinta', p.task.tx, p.task.ty);
    log(s, `${p.name} hittade en flintsten${ff > 2 ? ' vid stenarna' : ff > 1 ? ' i sanden vid stranden' : ''}.`, 'world', [p.id]);
  }
  return Object.keys(got).length ? got : undefined;
}
export function addItems(s: State, got: Record<string, number>) { for (const k in got) s.items[k] = item(s, k) + got[k]; }
// så många dygn bränslet i förrådet räcker
export function woodDays(s: State) { return fuelStock(s) / (hearthOf(s.fire).burn * 24); }
