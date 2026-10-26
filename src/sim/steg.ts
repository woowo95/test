import { tidyTools } from './agande';
import { chopStock, fellTree, rotStumps, stocks } from './skog';
import { VED, needLadder, noticeTheft, stole } from './behov';
import { avbryt, capacity, dropSpot, fetchSpot, homeKind, isCarrying, load, pickUp, storeLoad, tidyStore, wearStore } from './lager';
import { KANIN, REDSKAP, clean, slaughter, twineRope, wearUsed } from './redskap';
import { GOR_ACTS, finishHalf, startWork, stepPaborjat, workHalf } from './paborjat';
import { thinkWhileWorking } from './teknik';
import { arbetsformaga, foodDays, workRate } from './ekonomi';
import { TRY_SEC, growFynd, handFish, packFynd, pickMushrooms, richness, richnessDelar, takeFrom } from './fynd';
import { coldOf, temperature } from './vader';
import { addFuel, canLight, fireWant, forageItems, fuelFor, hearthOf, heatAt, igniterOf, stepFire, takeCoal, takeFuel, tryLight } from './eld';
import { ALDER, KROPP, ageOf, alive, byId, count, forstaGang, isSick, living, log, ovning, stat, think } from './folk';
import { getMap } from './karta';
import { DODSORSAKER, barnMat, birth, birthWish, die, regulate } from './liv';
import { MARK, groundOf, growGround, packGround, tileOf } from './mark';
import { SAMTAL, TalkEvent, converse, isSocial } from './samtal';
import { HABIT_FADE, addHabit, sedEvent, stepSeder, updateTags } from './seder';
import { fearPlace, forget, lookAround } from './minne';
import { PLATS } from './plats';
import { chance, clamp, rnd } from './slump';
import { ARSTID, ageIndex, iIstiden, isLight } from './tid';
import { ACTS, toolRow } from './handlingar';
import { Act, DAY, HOUR, HOUR_S, MIN, Person, SEC, SKILL_NAMES, State, Task, W, H, useMap, Historik, simulera } from './typer';
import { findPath, speedAt, wear } from './vag';
import { chooseTask } from './val';
import { djurSteg } from './djur';
import { stepByggnader } from './byggnader';
import { avail, takeForHouse, buildJob, deliver as deliverBit, lacks, needOf, noteKom, planBuild, siteOf, toWalls, wearBuild, workOn } from './bygg';
import { MATERIAL, bitById, gridOf, roomAt, shelterOf } from './byggnad';
import { histParts, historikSteg, joinHist } from './historik';
import { migrate } from './varld';
import { stepDelning } from './delning';
import { balans } from './balans';

// Simuleringen går i slag om fem minuter (BEAT), i spelet och vid ikappräkning likadant. Inom ett slag går tiden åt
// till det som händer i tur och ordning (taskStep). Arbetet görs i bitar om högst BIT sekunder, och man bär aldrig mer
// än en tredjedel av vad man orkar från arbetet (STEG.borda). STEG.markNot = hur mycket ett steg nöter marken (MARK.nott per ruta)
export const BEAT = 300;
const BIT = 60;
// Balanstalen (regel 8). Kroppens gränser och takter (KROPP) och åldrarna (ALDER) står i folk.ts, eftersom val.ts och behov.ts läser dem
const STEG = balans('steg', {
  // att gå (rutor per sekund) och nöta marken
  fart: 1.6, // i vanliga fall
  fartBarn: 0.9, // under ALDER.gangBarn
  fartGammal: 1, // över ALDER.gangGammal
  markNot: 0.03, // hur mycket ett steg nöter marken (MARK.nott per ruta)
  vandraNot: 0.08, // ... och när man rör sig på platsen (gånger vandra.v i handlingens rad och tiden)
  borda: 1 / 3, // man bär aldrig mer än så stor del av vad man orkar från arbetet
  // graviditet
  dragtid: 0.75, // dygn som en graviditet varar
  mellanFodslar: 1.6, // dygn som en kvinna väntar efter en födsel innan hon kan bli gravid igen
  matDygn: 4, // så många dygns mat i förrådet ger full vilja att skaffa barn (mindre ger mindre) ...
  matMin: 0.15, // ... men aldrig mindre än denna del
  sedBarn: 0.2, // så mycket mer (eller mindre) vilja ger seden Barn fullt ut
  chans: 0.3, // chansen per dygn att bli gravid, gånger viljan
});

// spelet ritar folk där de är medan slaget visas: var och ens väg under det senaste slaget, som
// [tid, x, y, tid, x, y, ...]. Bara för att visa; simuleringen läser det aldrig
export const spar = { pa: false, v: new WeakMap<Person, number[]>() };
function spara(s: State, p: Person, t = s.now) { if (spar.pa) spar.v.get(p)?.push(t, p.x, p.y); }

type Krok = (s: State, p: Person, t: Task, dtSec: number) => void;
// det som händer medan man gör något (efter att ha kommit fram). Arbete för byn sköts av workStep
const MEDAN: Partial<Record<Act, Krok>> = {
  toa: (_s, p) => { p.toa = 1; },
  kol: (s, p) => takeCoal(s, p, 'hämtade'),
  bygga: (s, p, t, dtSec) => buildStep(s, p, t, dtSec),
  hantverk: (s, p, t, dtSec) => { if (t.tool === 'rep') twineRope(s, p, dtSec / HOUR_S); },
  slakta: (s, p, _t, dtSec) => slaughter(s, p, dtSec / HOUR_S),
  rensa: (s, p, _t, dtSec) => clean(s, p, dtSec / HOUR_S),
  tanda: (s, p, _t, dtSec) => {
    if (!canLight(s, p)) return;
    s.fire.tryProg += dtSec;
    const per = igniterOf(s)!.minutes * 60;
    while (s.fire.tryProg >= per && canLight(s, p) && !s.fire.lit) { s.fire.tryProg -= per; if (tryLight(s, p)) { p.task = undefined; break; } }
  },
};
// det som händer när en handling är klar
const KLAR: Partial<Record<Act, Krok>> = {
  falla: (s, p, t) => { // ett träd där ett hus ska stå, eller som fälldes för bygget, blir stockar i husets väggar direkt; resten huggs till trä
    const k = fellTree(s, p, t.tx, t.ty);
    if (k) { k.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), k.ved, t.ref, p); if (k.ved <= 1e-6) s.stockar = stocks(s).filter(q => q !== k); }
  },
  promenad: (s, p, t) => { lookAround(s, p, t.tx, t.ty); think(p, 'Tog en skön promenad', 0.06, s.now, 6 * HOUR); },
  bada: (s, p) => { p.warm = Math.max(KROPP.badMin, p.warm - KROPP.badKyla); think(p, 'Badade i sjön', 0.08, s.now, 6 * HOUR); },
  strand: (s, p) => { p.rest = Math.min(1, p.rest + KROPP.strandVila); think(p, 'Satt vid vattnet och fick ro', 0.06, s.now, 6 * HOUR); },
};
// redskap som görs och träd som fälls: arbetet sparas om det avbryts (paborjat.ts)
for (const a of GOR_ACTS) { MEDAN[a] = workHalf; KLAR[a] = (s, p, t) => finishHalf(s, p, t); }
MEDAN.falla = workHalf;

// ---------- huvudsteg ----------
// ett slag om dtSec sekunder (BEAT i spelet och ikappräkningen; testerna kan ta andra). events = samtalen, för att visa dem
export function step(s: State, dtSec: number, events?: TalkEvent[]) { simulera(() => slag(s, dtSec, events)); } // också när gränssnittet räknar (typer.ts)
function slag(s: State, dtSec: number, events?: TalkEvent[]) {
  useMap(s);
  const t0 = s.now;
  s.now += dtSec * SEC;
  const now = s.now;
  const ai = ageIndex(s);
  if (ai !== s.lastAgeIdx) {
    s.lastAgeIdx = ai;
    const msg = ['Istiden har börjat. Sjön fryser och maten blir knapp.', 'Vårtiden har kommit. Isen släpper och marken tinar.', 'Sommartiden är här. Bär och fisk finns i överflöd.', 'Hösttiden har börjat. Nu gäller det att samla inför istiden.'][ai];
    log(s, msg, 'world');
  }
  const ppl = living(s);
  gridOf(s); // väggarna och rummen, så att vägsökningen vet var väggarna står
  djurSteg(s); // kaningrupperna väljer plats när deras tid börjar
  // förråd: ruttning och ved
  wearStore(s, dtSec, ai); // slitage per slag, fortare utanför lagret
  stepFire(s, dtSec, ppl);
  const fh = hearthOf(s.fire), coldRate = coldOf(temperature(s));
  const learn = 1 + 0.1 * s.seder.v.nyfikenhet; // en nyfiken by lär sig snabbare
  if (Math.floor(now / HOUR) !== Math.floor((now - dtSec * SEC) / HOUR)) {
    stepSeder(s); updateTags(s); stepDelning(s);
    growGround(s, 1, ai); growFynd(s, 1, ai); forget(s, 1); rotStumps(s); tidyStore(s);
    wearBuild(s, 1, ai); stepByggnader(s); planBuild(s); stepPaborjat(s);
    historikSteg(s); // nyckeltalen till byns historik (läses inte av simuleringen)
    compact(s); // här och inte i sparningen, så att alla lägen städar vid samma tid
  }

  const social: Person[] = [];
  const inRum = new Map<number, number>(); // hur många som är i varje rum
  for (const p of ppl) { const r = roomAt(s, p.x, p.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  for (const p of ppl) {
    const a = ageOf(p, now);
    needsStep(s, p, a, dtSec, coldRate, fh, inRum);
    needLadder(s, p, dtSec); // äta: sitt eget, byns, och i yttersta nöd andras (behov.ts)
    if (healthStep(s, p, a, ai, dtSec)) continue; // dog
    pregnancy(s, p, a, ppl.length, dtSec);
    if (!alive(p)) continue; // dog i barnsäng
    if (spar.pa) spar.v.set(p, [t0, p.x, p.y]);
    taskStep(s, p, a, now, dtSec, learn, social);
    if (p.thoughts.some(x => x.until <= now)) p.thoughts = p.thoughts.filter(x => x.until > now);
  }
  // samtal: ca ett per 4 minuter per person i social aktivitet
  const e0 = events?.length ?? 0;
  if (social.length > 1) {
    for (const p of social) {
      if (!alive(p)) continue;
      const expect = dtSec / 240 * (0.6 + stat(p, 'empati', now) / 25);
      let n = Math.floor(expect); if (rnd(s, 'samtal', p) < expect - n) n++;
      // bara med dem som är nära när slaget slutar
      const others = social.filter(q => q !== p && alive(q) && Math.hypot(q.x - p.x, q.y - p.y) < SAMTAL.radie);
      for (let i = 0; i < n; i++) converse(s, p, others, events);
      if (n && others.length) count(s, 'samtal', n);
    }
  }
  // samtalen visas utspridda över slaget
  if (events) for (let i = e0; i < events.length; i++) events[i].t = t0 + (i - e0 + 0.5) / (events.length - e0) * dtSec * SEC;
  // relationer bleknar långsamt utan umgänge
  if (rnd(s, 'samtal') < dtSec / 600) {
    const k = Math.exp(-0.04 * (600 / 86400));
    for (const key in s.rels) { const r = s.rels[key]; r.op *= k; r.rom *= k; }
  }
  if (living(s).length === 0) log(s, 'Byn är tom. Ingen finns kvar vid elden.', 'world');
  regulate(s, dtSec);
  tidyTools(s);
}


// behoven: hunger, vila, värme, umgänge och toa. Elden värmer i ett område, och inne i ett hus kyls man långsammare
// (sämre ju fler öppningar)
function needsStep(s: State, p: Person, a: number, dtSec: number, coldRate: number, fh: ReturnType<typeof hearthOf>, inRum: Map<number, number>) {
  const now = s.now;
  p.hunger = clamp(p.hunger - dtSec / (KROPP.hungerTim * HOUR_S) * (a < ALDER.matBarn ? KROPP.hungerBarn : 1), 0, 1);
  const pd = p.task && ACTS[p.task.act];
  const working = pd && pd.tungt && p.task!.phase === 'do';
  const resting = pd && pd.vila;
  p.rest = clamp(p.rest + dtSec / HOUR_S * (resting ? KROPP.restVila : working ? KROPP.restArbete : KROPP.restVaken), 0, 1);
  const heat = heatAt(s, p.x, p.y), rum = roomAt(s, p.x, p.y), shelter = rum ? shelterOf(s, rum, inRum.get(rum.id) ?? 1) : 0;
  p.warm = clamp(p.warm + dtSec / HOUR_S * (heat * KROPP.eldVarme - coldRate * (1 - shelter) + (coldRate === 0 ? KROPP.mildVarme : 0)), 0, 1);
  if (rum && resting && p.task!.phase === 'do' && pd.plats === 'sang') { // man vilar bättre under tak, och bäst på ett golv
    const m0 = gridOf(s).at.get(tileOf(p.x, p.y))?.m, soft = m0 === 'ho' || m0 === 'tra';
    p.rest = clamp(p.rest + dtSec / HOUR_S * (soft ? KROPP.restGolv : KROPP.restTak), 0, 1);
    if (p.task!.act === 'sova') think(p, soft ? 'Sov gott på golvet i huset' : 'Sov under tak', soft ? 0.07 : 0.05, now, 8 * HOUR);
  }
  if (heat > KROPP.eldNara) {
    think(p, 'Värms av elden', fh.comfort, now, HOUR);
    p.rest = clamp(p.rest + dtSec / HOUR_S * fh.comfort * heat, 0, 1); // avslappning vid elden
  }
  if (p.warm < KROPP.fryser) think(p, 'Fryser', -0.12, now, HOUR);
  p.social = clamp(p.social - dtSec / (KROPP.socialTim * HOUR_S), 0, 1);
  // toa: behovet växer på ungefär sju timmar, långsammare i sömnen
  p.toa = clamp(p.toa - dtSec / (KROPP.toaTim * HOUR_S) * (p.task?.act === 'sova' ? KROPP.toaSomn : 1), 0, 1);
  if (p.toa <= 0) { p.toa = 1; if (a >= ALDER.smabarn) think(p, 'Kissade på sig', -0.12, now, 4 * HOUR); }
}

// hälsa, sjukdom och död: svält, kyla, sjukdom, ålderdom och olyckor. true = personen dog
function healthStep(s: State, p: Person, a: number, ai: number, dtSec: number) {
  const now = s.now;
  if (p.hunger <= 0) { p.health -= dtSec / (KROPP.svaltTim * HOUR_S); if (rnd(s, 'halsa', p) < dtSec / 7200) think(p, 'Svälter', -0.25, now, 3 * HOUR); }
  else if (p.warm < KROPP.frysdod) p.health -= dtSec / (KROPP.frysTim * HOUR_S);
  else if (p.hunger > KROPP.lakerMat && !isSick(p, now)) p.health = clamp(p.health + dtSec / (KROPP.lakerTim * HOUR_S), 0, 1);
  if (isSick(p, now)) p.health -= dtSec / (KROPP.sjukTim * HOUR_S);
  if (!p.sickUntil || p.sickUntil < now) {
    if (chance(s, (iIstiden(ai) ? ARSTID.sjukIstid : ARSTID.sjuk) / 86400, dtSec, 'halsa', p)) { const dur = (KROPP.sjukMin + rnd(s, 'halsa', p) * KROPP.sjukSpann) * HOUR; p.sickUntil = now + dur; p.sickWhy = 'Sjuk'; if (dur > KROPP.svartSjuk * HOUR) log(s, `${p.name} blev svårt sjuk.`, 'world', [p.id]); }
  }
  if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'svalt' : p.warm < KROPP.frysdod ? 'kyla' : (p.poisonUntil ?? 0) > now ? 'svamp' : 'sjukdom'); return true; }
  // ålderdom och olyckor (Gompertz, per år = per dygn)
  const q = KROPP.dodBas + KROPP.dodAlder * Math.exp(KROPP.dodTakt * a) + (a < ALDER.barnsjuk ? KROPP.dodBarn : 0);
  if (chance(s, q / 86400, dtSec, 'halsa', p)) { die(s, p, a > ALDER.alderdom ? 'alderdom' : a < ALDER.barnsjuk ? 'barnsjukdom' : 'olycka'); if (a >= ALDER.barnsjuk && a <= ALDER.alderdom) fearPlace(s, p, DODSORSAKER.olycka.text); return true; }
  const pd = p.task && ACTS[p.task.act], fara = pd && pd.fara; // farligt arbete, som jakt
  if (fara && p.task!.phase === 'do' && chance(s, fara.risk * (1 - (pd.arbete ? p.skill[pd.arbete] : 0) / 25) / HOUR_S, dtSec, 'halsa', p)) { die(s, p, fara.dod); fearPlace(s, p, DODSORSAKER[fara.dod].text); return true; }
  return false;
}

// graviditet: en kvinna med partner kan bli gravid; viljan styrs av hur många byn är, maten och sederna
function pregnancy(s: State, p: Person, a: number, pop: number, dtSec: number) {
  const now = s.now;
  if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > STEG.dragtid * DAY) birth(s, p); }
  else if (p.sex === 'k' && p.partner !== undefined && a >= ALDER.gravFran && a <= ALDER.gravTill && (!p.lastBirth || now - p.lastBirth > STEG.mellanFodslar * DAY)) {
    const f = birthWish(pop) * clamp(foodDays(s) / STEG.matDygn, STEG.matMin, 1) * barnMat(s, pop) * (1 + STEG.sedBarn * s.seder.v.barn);
    if (chance(s, STEG.chans * f / 86400, dtSec, 'halsa', p)) { p.pregnantSince = now; p.pregnantBy = p.partner; }
  }
}

// Uppgiften under ett steg. Tiden i steget går åt till det som händer i tur och ordning: att avsluta och välja, att gå
// (tiden följer vägen), att arbeta i bitar och att bära hem. Det räknas likadant i spelet och vid ikappräkning; spelet
// visar bara samma rörelse (spar). Vanor och idéer växer medan man håller på
function taskStep(s: State, p: Person, a: number, t1: number, dtSec: number, learn: number, social: Person[]) {
  let left = dtSec;
  for (let n = 0; left > 1e-6 && n < 80; n++) {
    s.now = t1 - left * SEC;
    const now = s.now, light = isLight(now), t = p.task;
    const phaseFlip = t && t.dark !== !light && ACTS[t.act].dygn; // dag blev natt eller tvärtom
    if (t && t.phase === 'do' && t.until <= now) KLAR[t.act]?.(s, p, t, 0); // ett träd som fällts färdigt, en yxa som gjorts klar
    const lightDone = t?.act === 'tanda' && (s.fire.lit || !canLight(s, p));
    const mustGo = t && p.toa < KROPP.toaAvbryt && t.act !== 'toa' && a >= ALDER.smabarn; // nöden avbryter det man håller på med
    if (!t || (t.until <= now && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone) {
      if (t && isCarrying(t) && t.act !== 'elda') { t.phase = 'back'; const d = dropSpot(s, homeKind(t)); t.tx = d.x + sida(p, 0.2); t.ty = d.y + sida(p, -0.2); }
      else chooseTask(s, p);
    }
    const tk = p.task!, d = ACTS[tk.act];
    let used: number;
    if (tk.phase === 'go' || tk.phase === 'back') {
      const w = walk(s, p, tk, left, a);
      used = w.used;
      if (w.framme) { s.now = t1 - (left - used) * SEC; arrive(s, p, tk, isLight(s.now)); }
    } else {
      // arbetet i bitar: till uppgiftens slut, till dess bördan bärs hem, men aldrig längre än BIT sekunder åt gången
      used = Math.min(left, Math.max(0, (tk.until - now) / SEC), BIT);
      if (tk.lim !== undefined) used = Math.min(used, Math.max(1, tk.lim - (tk.tur ?? 0)));
      s.now = t1 - (left - used) * SEC;
      MEDAN[tk.act]?.(s, p, tk, used);
      if (d.arbete && p.task === tk && tk.phase === 'do') workStep(s, p, tk, used, a, learn);
      // (bygget kan just ha skickat iväg personen efter mer material)
      if (tk.phase === 'do' && d.hantverk) ovning(p, 'hantverk', used / HOUR_S * 0.1 * learn);
      if (d.vandra) wear(groundOf(s), tileOf(tk.tx, tk.ty), MARK.nott * STEG.markNot * STEG.vandraNot * d.vandra.v * used); // man rör sig på platsen
    }
    // vana: tiden räknas mot yrkestaggar
    addHabit(p, tk.act, Math.exp(-used * SEC / HABIT_FADE), used / HOUR_S);
    // den som arbetar kommer så småningom på hur det kan göras bättre; man funderar också på vägen dit och hem
    thinkWhileWorking(s, p, tk.act, used);
    left -= used;
  }
  s.now = t1;
  spara(s, p);
  if (isSocial(p)) social.push(p);
}

// var och en går lite vid sidan av, så att de inte täcker varandra
const sida = (p: Person, f: number) => (((p.id * 37) % 7) - 3) * f / 3;
// vägarna mellan två rutor sparas en stund: stigarna ändras långsamt, så de räknas om var fjärde timme och när något byggs
const vagar = new WeakMap<State, { key: string; m: Map<number, number[] | null> }>();
function pathFor(s: State, g: ReturnType<typeof groundOf>, x0: number, y0: number, x1: number, y1: number) {
  const key = `${Math.floor(s.now / (4 * HOUR))},${s.byggV ?? 0}`;
  let c = vagar.get(s);
  if (c?.key !== key) vagar.set(s, c = { key, m: new Map() });
  const k = tileOf(x0, y0) * W * H + tileOf(x1, y1);
  let v = c.m.get(k);
  if (v === undefined) c.m.set(k, v = findPath(g, x0, y0, x1, y1));
  return v ? v.slice() : null; // null = ingen väg dit
}
// att gå mot målet ruta för ruta runt vatten, gärna längs stigar. Ger tiden det tog och om man kom fram
function walk(s: State, p: Person, tk: Task, left: number, a: number) {
  const g = groundOf(s);
  const key = `${tk.tx.toFixed(2)},${tk.ty.toFixed(2)},${s.byggV ?? 0}`; // en ny vägg kan stänga vägen
  if (tk.pk !== key) {
    tk.pk = key;
    const v = pathFor(s, g, p.x, p.y, tk.tx, tk.ty), f = getMap(s.seed).fire;
    // målet går inte att nå (en ö): man lägger ner det man bär och väljer något annat. Bara den som själv är avskuren från lägret går rakt över
    if (!v && tk.phase === 'go' && pathFor(s, g, p.x, p.y, f.x + 0.5, f.y + 0.5)) { avbryt(s, p); return { used: Math.min(left, BIT), framme: false }; }
    tk.path = v ?? [];
  }
  const off = sida(p, 0.18), fart = a < ALDER.gangBarn ? STEG.fartBarn : a > ALDER.gangGammal ? STEG.fartGammal : STEG.fart, t0 = s.now;
  let budget = fart * left;
  const klocka = () => t0 + (fart * left - budget) / fart * SEC;
  if (budget <= 0) return { used: left, framme: false };
  // punkt för punkt längs vägen (var och en lite vid sidan av) och sist till målet. Marken nöts där man går
  for (;;) {
    const sist = !tk.path?.length, i = sist ? 0 : tk.path![0];
    const wx = sist ? tk.tx : (i % W) + 0.5 + off, wy = sist ? tk.ty : Math.floor(i / W) + 0.5 - off;
    const ci = tileOf(p.x, p.y), sp = speedAt(g, ci) || 1;
    const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
    wear(g, ci, MARK.nott * STEG.markNot * Math.min(d, can));
    if (d > can) { p.x += dx / d * can; p.y += dy / d * can; return { used: left, framme: false }; } // tiden räckte inte hela vägen
    p.x = wx; p.y = wy; budget -= d / sp;
    if (sist) { tk.path = undefined; tk.pk = undefined; spara(s, p, klocka()); return { used: left - budget / fart, framme: true }; }
    tk.path!.shift(); spara(s, p, klocka());
    if (budget <= 0) return { used: left, framme: false };
  }
}
// framme vid målet: vid förrådet, vid bygget, hemma med bördan eller på platsen där arbetet görs
function arrive(s: State, p: Person, tk: Task, light: boolean) {
  const now = s.now;
  if (tk.act === 'elda') {
    if (tk.phase === 'go') {
      // vid förrådet: ta en famn ved och gå till elden. Byns och sin egen, eller den andras (stöld i yttersta nöd, behov.ts)
      const fran = byId(s, tk.fran);
      const m = getMap(s.seed), n = s.fire.fuel >= fireWant(s) ? 0 : Math.min(1, fuelFor(s, p, fran)); // en famn i taget, så att elden matas oftare
      if (n <= 0) p.task = undefined;
      else {
        tk.ag = { ved: {} }; tk.carry = takeFuel(s, n, p, tk.ag.ved, fran); tk.phase = 'back'; tk.tx = m.fire.x + 0.5 + sida(p, 0.6); tk.ty = m.fire.y + 1.2;
        if (fran) stole(s, p, fran, VED.id, tk.carry); else if ((tk.ag.ved[p.id] ?? 0) > 1e-9) noticeTheft(s, p, VED.id);
      }
    } else { addFuel(s, p, tk.carry); tk.carry = 0; p.task = undefined; }
  } else if (tk.act === 'bygga' && tk.phase === 'go' && tk.site) {
    // vid lagret: ta materialet och gå till bygget
    const b = bitById(s, tk.ref), k = b && MATERIAL[b.m].item, n = b ? needOf(b) : 0;
    if (!b || !k || avail(s, k, p, b.hus) < n) p.task = undefined;
    else { tk.kom = {}; tk.ag = { [k]: takeForHouse(s, p, b.hus, k, n, tk.kom) }; tk.items = { [k]: n }; tk.tx = tk.site.x; tk.ty = tk.site.y; tk.site = undefined; }
  } else if (tk.phase === 'back') {
    storeLoad(s, tk, p.x, p.y, p.id);
    // ett arbetspass är klart: gå tillbaka och fortsätt om arbetet inte är slut och dagen inte vänt
    const r = tk.res;
    if (r && r.until > now + 2 * MIN && tk.dark === !light) { tk.phase = 'go'; tk.tx = r.x; tk.ty = r.y; tk.until = r.until; tk.res = undefined; }
    else p.task = undefined;
  } else {
    tk.phase = 'do'; if (tk.act === 'bara') { pickUp(s, p, tk); tk.until = now; }
    startWork(s, p, tk); // ett redskap eller ett träd: arbetet räknas härifrån, och det påbörjade fortsätter
    const tur = ACTS[tk.act].tur;
    tk.tur = 0; tk.lim = tur ? tur * (toolRow(tk)?.tur ?? 1) : undefined;
  }
}

// det ett arbete för byn ger, per handling. y = det platsen gav den här biten (takten gånger platsens värde rich), rd = redskapet
// i handen, a = åldern, bar = lägg något bredvid bördan (grenar, rötter, svamp). Svarar raden true har den själv lagt det i bördan
interface Arbetsbit { y: number; rich: number; rd: ReturnType<typeof toolRow>; dtSec: number; a: number; bar: (k: string, n: number) => void }
const UTFALL: Partial<Record<Act, (s: State, p: Person, tk: Task, b: Arbetsbit) => boolean | void>> = {
  // fiske med händerna, spjut eller metspö: ett försök i taget, och fiskaren går hem med varje fångst
  fiske: (s, p, tk, { rd, dtSec, a }) => {
    tk.prog = (tk.prog ?? 0) + dtSec;
    const ageF = arbetsformaga(p, a, s.now);
    while (tk.prog >= TRY_SEC) {
      tk.prog -= TRY_SEC;
      if (rd?.bete && (tk.mask ?? 0) < 1) { tk.mask = (tk.mask ?? 0) + REDSKAP.maskPerGrav; continue; } // gräver fram mask först
      const napp = p.fiske?.n ?? 0;
      tk.carry += handFish(s, p, tk.tx, tk.ty, ageF, rd);
      if (rd?.bete && (p.fiske?.n ?? 0) > napp) tk.mask!--; // varje napp tar en mask
      if (rd) wearUsed(s, p, 1);
    }
  },
  hugga: (s, p, tk, { y, bar }) => {
    const k = stocks(s).find(q => q.id === tk.ref), got = chopStock(s, tk.ref, y);
    if (!got) tk.until = s.now; // stammen är slut
    else {
      if (k) got.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), got.ved, undefined, p); // står stammen där ett hus byggs blir träet väggar
      tk.carry += got.ved; bar('grenar', got.grenar);
      if (got.done) tk.until = s.now;
    }
    return true;
  },
  samla: (s, p, tk, { y, rich, dtSec, bar }) => {
    if (y > 0) {
      const r = rich > 0 ? y * Math.min(1, richness(s, 'rotter', tk.tx, tk.ty) / rich) : 0; // rötterna efter hur mycket av platsen som är rötter
      tk.carry += y - r; bar('rotter', r);
    }
    const got = forageItems(s, p, dtSec) ?? {};
    bar('svamp', pickMushrooms(s, p, tk.tx, tk.ty, dtSec, got));
    for (const k in got) bar(k, got[k]);
    return true;
  },
  // man fångar hela djur, än så länge bara kaniner. Chansen är sådan att man i snitt får lika mycket som platsen ger.
  // Kaninen fyller famnen och bärs hem hel
  jakt: (s, p, tk, { y }) => {
    if (y > 0 && rnd(s, 'arbete', p) < y / KANIN) {
      if (forstaGang(s, 'kaniner')) log(s, `${p.name} fångade byns första kanin och bar hem den hel.`, 'world', [p.id]);
      tk.carry += KANIN;
    }
    return true;
  },
};
// arbete för byn (handlingar med arbete): det man får och bär, det platsen har kvar, redskapen som slits och det man lär sig
function workStep(s: State, p: Person, tk: Task, dtSec: number, a: number, learn: number) {
  const now = s.now, d = ACTS[tk.act];
  const rd = toolRow(tk); // redskapet i handen: vad det ger och hur det slits står i handlingens rad
  if (rd && d.slits) wearUsed(s, p, dtSec / d.slits);
  // utan yxa samlas grenar på marken (ved, takt 2); med yxa huggs trä ur en fälld stam (hugga, takt 1,5). Båda har arbetet ved
  // som bas (handlingar.ts). På den tid det tar att hugga en ved samlas alltså 1,33 grenar, värda 0,53 ved som bränsle (GREN)
  // bär, rötter och vilt: platsen ger mindre ju mer som redan tagits där
  // (platsens värde räknas en gång, och takeFrom delar uttaget mellan bär och rötter efter samma tal)
  const res = d.resurs, del = res && d.takt === undefined ? richnessDelar(s, res, tk.tx, tk.ty) : undefined, rich = del ? del.rich : 1;
  const y = workRate(s, p, tk.act) * dtSec * (rd?.ger ?? 1) * (d.takt ?? rich);
  if (y > 0) count(s, 'prod_' + tk.act, y);
  if (res && del) { takeFrom(s, res, tk.tx, tk.ty, y, del.r); if (rich < PLATS.tomtGrans && !tk.sok) tk.until = now; } // tomt här: gå hem eller vidare (den som letar flinta eller stenar fortsätter)
  // den som arbetar ser hur mycket som finns i området och minns det
  if (res && (rich < PLATS.tomtGrans || chance(s, 1 / 1800, dtSec, 'minne', p))) lookAround(s, p, tk.tx, tk.ty);
  const bar = (k: string, n: number) => { if (n > 0) { tk.items ??= {}; tk.items[k] = (tk.items[k] ?? 0) + n; } };
  // det arbetet ger (UTFALL ovan); utan egen rad, eller om raden inte tagit hand om det, läggs det platsen gav i bördan
  const u = UTFALL[tk.act];
  if (!(u && u(s, p, tk, { y, rich, rd, dtSec, a, bar })) && y > 0) tk.carry += y;
  const sk = d.arbete!;
  const before = p.skill[sk];
  ovning(p, sk, dtSec / HOUR_S * 0.12 * learn * (0.4 + stat(p, 'intelligens', now) / 20));
  if (before < 16 && p.skill[sk] >= 16) {
    const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = !s.people.some(q => q.fame.includes(title));
    p.fame.push(title); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
    sedEvent(s, 'nyfikenhet', first ? 0.06 : 0.01, first ? `${p.name} blev byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}. Byn ser vad kunskap kan ge.` : undefined);
  }
  // arbetet sker i turer: efter en stunds arbete (tur), en fångst eller när bördan är full bärs det hem, sedan fortsätter man
  tk.tur = (tk.tur ?? 0) + dtSec;
  const full = load(tk) >= capacity(s, p) * STEG.borda, has = isCarrying(tk);
  if (full || (tk.lim !== undefined && tk.tur >= tk.lim) || (tk.act === 'fiske' && tk.carry > 0)) {
    if (has && tk.until > now + 2 * MIN) { tk.res = { x: tk.tx, y: tk.ty, until: tk.until }; tk.until = now; count(s, 'turer'); }
    else if (has && full) { tk.until = now; count(s, 'turer'); }
    else tk.tur = 0;
  }
}

// bygge: lägg det man bär på bygget och arbeta. När rutan är klar, eller materialet tagit slut, tas nästa ruta
function buildStep(s: State, p: Person, tk: Task, dtSec: number) {
  const b = bitById(s, tk.ref);
  if (!b) { tk.until = s.now; return; }
  const k = MATERIAL[b.m].item;
  if (tk.items && k && tk.items[k]) { deliverBit(b, tk.items[k], b.b >= 1); delete tk.items[k]; if (!Object.keys(tk.items).length) tk.items = undefined; }
  if (tk.kom) { noteKom(s, b.hus, tk.kom); tk.kom = undefined; }
  const done = b.b >= 1 && b.lp === undefined && b.c >= 0.5;
  if (!done && !lacks(b) && !workOn(s, p, b, dtSec)) return;
  const j = buildJob(s, p);
  if (!j || j.missing || j.fell) { tk.until = s.now; return; } // ett träd i vägen: välj på nytt
  // nästa bit av bygget: man går först till lagret om det behövs material
  const site = siteOf(s, j.bit);
  tk.ref = j.bit.id; tk.tool = j.repair ? 'laga' : j.bit.k === 'golv' ? 'golv' : 'vagg';
  tk.phase = 'go';
  if (j.need > 0) { const f = fetchSpot(s, j.item!); tk.tx = f.x; tk.ty = f.y; tk.site = site; } else { tk.tx = site.x; tk.ty = site.y; }
}

// talen i sparfilen avrundas till tre decimaler. En stacks ägardelar avrundas nedåt om de annars blir mer än stacken
const r3 = (v: number) => Math.round(v * 1000) / 1000;
function avrunda(this: unknown, k: string, v: unknown) {
  if (typeof v === 'number') return Number.isInteger(v) ? v : r3(v);
  const st = this as { n?: unknown } | null;
  if (k === 'ag' && v && typeof v === 'object' && typeof st?.n === 'number') {
    const d = v as Record<string, number>;
    let sum = 0; for (const o in d) sum += r3(d[o]);
    if (sum > r3(st.n) + 1e-9) { const ner: Record<string, number> = {}; for (const o in d) ner[o] = Math.floor(d[o] * 1000 + 1e-6) / 1000; return ner; }
  }
  return v;
}
export function serialize(s: State) {
  packGround(s); packFynd(s);
  return JSON.stringify(s, avrunda);
}
// en kopia av byn, som en sparad och inläst by (cacherna i WeakMap följer inte med, regel 4)
export const cloneState = (s: State) => migrate(JSON.parse(serialize(s)));

// sparfilen i delar, så att varje del ryms i ett dokument i artefaktens databas (högst 256 KB). Det som inte står här är byn.
// Varje del skrivs direkt med samma avrundning, så texten blir densamma som om hela byn skrivits och delats upp efteråt
export const DELAR: Record<string, string[]> = { folket: ['people', 'rels'], kartor: ['fynd', 'mark', 'skog', 'stubbar'], loggen: ['log'] };
export function serializeParts(s: State): Record<string, string> {
  packGround(s); packFynd(s);
  const o = s as unknown as Record<string, unknown>, ut: Record<string, string> = {}, bort = new Set<string>();
  for (const [d, keys] of Object.entries(DELAR)) {
    const del: Record<string, unknown> = {};
    for (const k of keys) if (o[k] !== undefined) { del[k] = o[k]; bort.add(k); }
    ut[d] = JSON.stringify(del, avrunda);
  }
  // historiken delas efter de avrundade tiderna, som i en inläst sparfil
  if (s.hist) { for (const [d, h] of Object.entries(histParts(s, JSON.parse(JSON.stringify(s.hist, avrunda))))) ut[d] = JSON.stringify({ hist: h }); bort.add('hist'); }
  const byn = JSON.stringify(s, function (this: unknown, k: string, v: unknown) { return this === s && bort.has(k) ? undefined : avrunda.call(this, k, v); });
  return { byn, ...ut };
}
export const joinParts = (delar: string[]) => {
  const ut: Record<string, unknown> = {}, hist: Historik[] = [];
  for (const d of delar) { const o = JSON.parse(d); if (o.hist) { hist.push(o.hist); delete o.hist; } Object.assign(ut, o); }
  if (hist.length) ut.hist = joinHist(hist); // historiken ligger i en del per vecka
  return JSON.stringify(ut);
};

// varje timme (timblocket ovan): de döda och utflyttade utöver de 120 senaste och relationer mellan två som inte lever
// tas bort, så att byn och sparfilen hålls små. Sparningen bara läser byn
const MINNS_DODA = 120;
function compact(s: State) {
  let n = 0; for (const p of s.people) if (!alive(p)) n++;
  if (n > MINNS_DODA) {
    const gone = s.people.filter(p => !alive(p)).sort((a, b) => (b.died ?? b.left ?? 0) - (a.died ?? a.left ?? 0));
    const drop = new Set(gone.slice(MINNS_DODA).map(p => p.id));
    s.people = s.people.filter(p => !drop.has(p.id));
  }
  const ids = new Set(s.people.filter(alive).map(p => p.id));
  for (const k in s.rels) { const [a, b] = k.split('-').map(Number); if (!ids.has(a) && !ids.has(b)) delete s.rels[k]; }
}
