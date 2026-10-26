import { addTo, amountOf, dropLoad, fetchSpot, mayTake, ownsAmount, use } from './lager';
import { getable, takeMaterial } from './behov';
import { Del, addDel } from './egendom';
import { coldOf, temperature } from './vader';
import { ageOf, count, isSick, log, stat, think } from './folk';
import { flintFactor, stoneDist, takeFrom } from './fynd';
import { observe } from './minne';
import { getMap } from './karta';
import { tileOf } from './mark';
import { moodOf } from './samtal';
import { duty, sedEvent } from './seder';
import { chance, clamp, rnd } from './slump';
import { ageIndex, isLight } from './tid';
import { kronika } from './historik';
import { SNABBARE } from './handlingar';
import { Act, DAY, Fire, FireLog, GREN, HEARTHS, HOUR, IGNITERS, Person, SEC, State } from './typer';

// ---------- eld ----------
export const hearthOf = (f: Fire) => HEARTHS.find(h => h.id === f.hearth) ?? HEARTHS[0];
export const igniterOf = (s: State) => IGNITERS.find(i => amountOf(s, i.id) >= 1);
// bränsle i förrådet räknat i ved: ved och grenar
export const fuelStock = (s: State) => amountOf(s, 'ved') + amountOf(s, 'grenar') * GREN;
// Elden ägs av hela byn, men veden följer ägandet: man eldar med byns och sin egen. fran = den man stjäl av (behov.ts)
const fuelLim = (s: State, k: string, p?: Person, fran?: Person) => fran ? ownsAmount(s, fran, k) : p ? mayTake(s, p, k) : amountOf(s, k);
// bränslet p får elda med, räknat i ved
export const fuelFor = (s: State, p: Person, fran?: Person) => fuelLim(s, 'ved', p, fran) + fuelLim(s, 'grenar', p, fran) * GREN;
// ta bränsle ur förrådet, ved först och sedan grenar; ger hur mycket som togs
// p = den som tar det: byns ved först, sedan sin egen (egendom.ts). ag får vems bränslet var, räknat i ved
export function takeFuel(s: State, n: number, p?: Person, ag?: Del, fran?: Person) {
  const v = Math.min(n, fuelLim(s, 'ved', p, fran));
  const w = use(s, p, 'ved', v, true, fran?.id);
  const g = Math.min(fuelLim(s, 'grenar', p, fran), (n - v) / GREN);
  if (g > 0) { const d = use(s, p, 'grenar', g, true, fran?.id); if (ag) addDel(ag, d, GREN); }
  if (ag) addDel(ag, w);
  return v + g * GREN;
}
// bränsle som inte fick plats går tillbaka till förrådet som grenar
const giveBack = (s: State, n: number) => { if (n > 0) addTo(s, 'grenar', n / GREN); };
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
interface Wish { v: number; why: string }
const relightHard = (s: State) => 1 - (igniterOf(s) ?? IGNITERS[0]).chance;
// varje invånares egen önskan om ved på elden; vc = hur mycket byn fryser 0–1
function fireWish(s: State, p: Person, vc: number): Wish {
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
export const needStones = (s: State) => !s.fire.ring && amountOf(s, 'sten') < RING;
// kan elden tändas (av p: med det p kan få, behov.ts)
export function canLight(s: State, p?: Person) {
  const ig = igniterOf(s), has = (k: string) => p ? getable(s, p, k) : amountOf(s, k);
  return !!ig && (!!s.fire.ring || has('sten') >= RING) && has('torrgras') >= ig.grass && (has('grenar') >= ig.sticks || has('kol') >= 1) && (p ? fuelFor(s, p) : fuelStock(s)) >= 1;
}
export function needTinder(s: State) {
  return !s.fire.lit && !emberOn(s) && (amountOf(s, 'flinta') < 1 || needStones(s) || amountOf(s, 'torrgras') < 12 || amountOf(s, 'grenar') < 12);
}
function durText(sec: number) { const h = sec / 3600; return h >= 24 ? `${(h / 24).toFixed(1).replace('.', ',')} dygn` : h >= 1 ? `${Math.round(h)} timmar` : `${Math.round(sec / 60)} minuter`; }
function lightFire(s: State, p: Person) {
  const f = s.fire, start = takeFuel(s, 2, p), onCoal = (f.ash ?? 0) >= 1;
  Object.assign(f, { lit: true, fuel: start, litAt: s.now, litBy: p.id, burned: 0, emberUntil: undefined, tryProg: 0 });
  f.lightings++;
  if (!f.ring) { takeMaterial(s, p, 'sten', RING, true); f.ring = true; log(s, `${p.name} lade en ring av stenar runt eldplatsen.`, 'world', [p.id]); }
  if (onCoal) { f.ash = 0; f.ashUntil = undefined; } // kolet i den gamla högen tar fyr och blir en del av den nya elden
  fireLog(s, { k: 'tänd', id: p.id, n: f.tries });
  log(s, `${p.name} lyckades tända elden${onCoal ? ' på den gamla kolhögen' : ''}${f.tries > 1 ? ` efter ${f.tries} försök` : ''}.`, 'world', [p.id]);
  think(p, 'Tände elden', 0.15, s.now, DAY / 2);
  if (f.lightings === 1) { p.fame.push('Tände byns första eld'); kronika(s, `${p.name} tände byns första eld.`); sedEvent(s, 'nyfikenhet', 0.1, 'Elden har gjort byn nyfiken på vad mer som går att lära sig.'); }
  f.tries = 0;
}
// Varje misslyckat försök sedan elden senast brann gör nästa lättare: man får kläm på det och tändmaterialet blir
// varmt och torrt. Efter FORSOK_LARA försök är chansen dubbelt så stor, så att otur inte kan hålla elden släckt i dygn
const FORSOK_LARA = 10;
// ett försök att tända med det bästa tänddonet i förrådet
export function tryLight(s: State, p: Person) {
  const ig = igniterOf(s)!, f = s.fire;
  takeMaterial(s, p, 'torrgras', ig.grass, true);
  if (getable(s, p, 'grenar') >= ig.sticks) takeMaterial(s, p, 'grenar', ig.sticks, true);
  else takeMaterial(s, p, 'kol', 1, true); // lite kol kan ersätta grenarna

  f.tries++; f.tryTotal++;
  p.skill.elda = clamp(p.skill.elda + 0.08 * (0.5 + p.pot.intelligens / 20) * (1 - p.skill.elda / 21), 0, 20);
  const c = ig.chance * (0.5 + p.skill.elda / 20 + stat(p, 'intelligens', s.now) / 40) * (ageIndex(s) === 0 ? 0.6 : 1) * ((f.ash ?? 0) >= 1 ? 1.5 : 1) // en gammal kolhög tar lättare fyr
    * (1 + (f.tries - 1) / FORSOK_LARA); // varje misslyckat försök sedan elden brann gör nästa lättare
  if (rnd(s, 'eld', p) < c) { lightFire(s, p); return true; }
  if (ig.id === 'flinta' && rnd(s, 'eld', p) < 0.004) {
    use(s, p, 'flinta', 1, true); fireLog(s, { k: 'sprack', id: p.id });
    log(s, `Flintan som ${p.name} slog med sprack.`, 'world', [p.id]);
  }
  return false;
}
export function takeCoal(s: State, p: Person, verb: string) {
  const n = s.fire.ash ?? 0;
  if (n < 1) return;
  addTo(s, 'kol', n);
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
function assign(s: State, p: Person, act: Act, tx: number, ty: number, dur: number, why: string) {
  if (p.task && (p.task.carry > 0 || p.task.items)) dropLoad(s, p.task, p.x, p.y, p.id); // bördan läggs ner där hen står, den försvinner inte
  p.task = { act, phase: 'go', tx, ty, until: s.now + dur, carry: 0, why, dark: !isLight(s.now) };
}
// p går till förrådet efter en famn ved och sedan till elden (steg.ts). fran = den andras ved (stöld, behov.ts)
export function fetchFuel(s: State, p: Person, why: string, fran?: Person) {
  if (s.people.some(q => q.task?.act === 'elda')) return; // en i taget
  const at = fetchSpot(s, (fran ? ownsAmount(s, fran, 'ved') : mayTake(s, p, 'ved')) >= 1 ? 'ved' : 'grenar');
  assign(s, p, 'elda', at.x, at.y, HOUR, why);
  if (fran) p.task!.fran = fran.id;
}
const awake = (s: State, p: Person, minAge: number) => {
  const t = p.task;
  return ageOf(p, s.now) >= minAge && !isSick(p, s.now) && p.health >= 0.4 &&
    (!t || (t.act !== 'sova' && !(t.phase === 'back' && t.carry > 0) && !t.items));
};
export function stepFire(s: State, dtSec: number, ppl: Person[]) {
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
      if (c.w.v < f.fuel * 2 + 0.2 || fuelFor(s, c.p) < 0.5) continue; // bara den som har ved att ta (byns eller sin egen)
      const sc = (c.w.v - f.fuel) / h.maxFuel * (0.4 + duty(s, c.p)) - Math.hypot(c.p.x - fx, c.p.y - fy) / 25 + (c.p.task?.act === 'vakt' ? 0.3 : 0) + rnd(s, 'eld') * 0.1;
      if (sc > bs) { bs = sc; best = c; }
    }
    if (best) fetchFuel(s, best.p, best.w.why);
  }
  // tändning: när elden är släckt och någon vill ha eld försöker en person i taget
  if (!f.lit && !emberOn(s) && canLight(s) && f.want >= h.maxFuel * 0.1 && !ppl.some(p => p.task?.act === 'tanda')) {
    const ok = cands.filter(c => ageOf(c.p, now) >= 12 && c.w.v >= h.maxFuel * 0.05 && canLight(s, c.p))
      .sort((a, b) => (b.p.skill.elda + stat(b.p, 'flit', now) / 2 + rnd(s, 'eld') * 3) - (a.p.skill.elda + stat(a.p, 'flit', now) / 2 + rnd(s, 'eld') * 3));
    const c = ok[0];
    if (c) assign(s, c.p, 'tanda', m.fire.x + 0.5 + (rnd(s, 'eld') - 0.5) * 1.2, m.fire.y + 1.3, 3 * HOUR, `Vill ha eld. ${c.w.why}`);
  }
}
// hur mycket torrgräs det finns att samla per tidsålder (Istid, Vårtid, Sommartid, Hösttid)
const GRASS_SEASON = [0.25, 0.6, 1, 1.3];
// samling hittar tändmaterial, sten och flinta när förrådet behöver det
export function forageItems(s: State, p: Person, dtSec: number): Record<string, number> | undefined {
  const ai = ageIndex(s), want = tinderWant(s), hrs = dtSec / 3600 * SNABBARE; // allt man skaffar går fortare sedan steg 1.5.13
  const sk = 0.6 + p.skill.samla / 25;
  const got: Record<string, number> = {};
  if (amountOf(s, 'torrgras') < want) got.torrgras = 3 * GRASS_SEASON[ai] * sk * hrs;
  if (amountOf(s, 'grenar') < want) got.grenar = 3 * (ai === 0 ? 0.6 : 1) * sk * hrs;
  // stenar till eldringen: många vid stenarna, några i sanden, få annars
  if (needStones(s)) {
    const d = p.task ? stoneDist(s.seed)[tileOf(p.task.tx, p.task.ty)] : 9;
    got.sten = 0.8 * (d <= 1 ? 3 : d <= 3 ? 1.5 : 0.4) * sk * hrs;
  }
  // flinta är ovanlig och hittas oftast vid stenarna. Den slås mot en sten för att tända eld, och med en pinne blir den en yxa
  const ff = p.task ? flintFactor(s, p.task.tx, p.task.ty) : 0.4;
  if (amountOf(s, 'flinta') + amountOf(s, 'yxa') < 4 && chance(s, 0.04 * ff * sk * SNABBARE / 3600, dtSec, 'arbete', p)) {
    got.flinta = 1; count(s, ff > 2 ? 'flintaSten' : 'flintaAnnan');
    if (p.task) takeFrom(s, 'flinta', p.task.tx, p.task.ty, 1);
    if (ff > 2 && p.task) observe(s, p, 'flinta', p.task.tx, p.task.ty);
    log(s, `${p.name} hittade en flintsten${ff > 2 ? ' vid stenarna' : ff > 1 ? ' i sanden vid stranden' : ''}.`, 'world', [p.id]);
  }
  return Object.keys(got).length ? got : undefined;
}
// så många dygn bränslet i förrådet räcker
export function woodDays(s: State) { return fuelStock(s) / (hearthOf(s.fire).burn * 24); }
