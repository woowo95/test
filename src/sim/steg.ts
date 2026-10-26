import { tidyTools } from './agande';
import { chopStock, fellTree, rotStumps, stocks } from './skog';
import { VED, needLadder, noticeTheft, stole } from './behov';
import { capacity, dropSpot, fetchSpot, homeKind, load, pickUp, storeLoad, tidyStore, wearStore } from './lager';
import { KANIN, MASK_PER_GRAV, clean, slaughter, twineRope, wearUsed } from './redskap';
import { GOR_ACTS, finishHalf, startWork, stepPaborjat, workHalf } from './paborjat';
import { thinkWhileWorking } from './teknik';
import { arbetsformaga, foodDays, workRate } from './ekonomi';
import { TRY_SEC, growFynd, handFish, packFynd, pickMushrooms, richness, takeFrom } from './fynd';
import { coldOf, temperature } from './vader';
import { addFuel, canLight, fireWant, forageItems, fuelFor, hearthOf, heatAt, igniterOf, stepFire, takeCoal, takeFuel, tryLight } from './eld';
import { ageOf, alive, byId, count, isSick, living, log, stat, think } from './folk';
import { getMap } from './karta';
import { barnMat, birth, birthWish, die, regulate } from './liv';
import { WEAR, groundOf, growGround, packGround, tileOf } from './mark';
import { SAMTAL_R, TalkEvent, converse, isSocial } from './samtal';
import { HABIT_FADE, sedEvent, stepSeder, updateTags } from './seder';
import { fearPlace, forget, lookAround } from './minne';
import { chance, clamp, rnd } from './slump';
import { ageIndex, isLight } from './tid';
import { ACTS, toolRow } from './handlingar';
import { Act, DAY, HOUR, Person, SEC, SKILL_NAMES, State, Task, W, H, useMap, Historik } from './typer';
import { findPath, speedAt, wear } from './vag';
import { chooseTask } from './val';
import { djurSteg } from './djur';
import { stepByggnader } from './byggnader';
import { avail, bitById, takeForHouse, buildJob, deliver as deliverBit, lacks, needOf, noteKom, planBuild, siteOf, toWalls, wearBuild, workOn } from './bygg';
import { MATERIAL, gridOf, roomAt, shelterOf } from './byggnad';
import { histParts, historikSteg, joinHist } from './historik';
import { stepDelning } from './delning';

// Simuleringen går i slag om fem minuter (BEAT), i spelet och vid ikappräkning likadant. Inom ett slag går tiden åt
// till det som händer i tur och ordning (taskStep). Arbetet görs i bitar om högst BIT sekunder, och man bär aldrig mer
// än en tredjedel av vad man orkar från arbetet (WORK_LOAD). GANG = hur mycket ett steg nöter marken (WEAR per ruta)
export const BEAT = 300;
const BIT = 60, WORK_LOAD = 1 / 3, GANG = 0.03;

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
  hantverk: (s, p, t, dtSec) => { if (t.tool === 'rep') twineRope(s, p, dtSec / 3600); },
  slakta: (s, p, _t, dtSec) => slaughter(s, p, dtSec / 3600),
  rensa: (s, p, _t, dtSec) => clean(s, p, dtSec / 3600),
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
  bada: (s, p) => { p.warm = Math.max(0.4, p.warm - 0.1); think(p, 'Badade i sjön', 0.08, s.now, 6 * HOUR); },
  strand: (s, p) => { p.rest = Math.min(1, p.rest + 0.05); think(p, 'Satt vid vattnet och fick ro', 0.06, s.now, 6 * HOUR); },
};
// redskap som görs och träd som fälls: arbetet sparas om det avbryts (paborjat.ts)
for (const a of GOR_ACTS) { MEDAN[a] = workHalf; KLAR[a] = (s, p, t) => finishHalf(s, p, t); }
MEDAN.falla = workHalf;

// ---------- huvudsteg ----------
// ett slag om dtSec sekunder (BEAT i spelet och ikappräkningen; testerna kan ta andra). events = samtalen, för att visa dem
export function step(s: State, dtSec: number, events?: TalkEvent[]) {
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
      const others = social.filter(q => q !== p && alive(q) && Math.hypot(q.x - p.x, q.y - p.y) < SAMTAL_R);
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
  p.hunger = clamp(p.hunger - dtSec / (16 * 3600) * (a < 10 ? 0.7 : 1), 0, 1);
  const pd = p.task && ACTS[p.task.act];
  const working = pd && pd.tungt && p.task!.phase === 'do';
  const resting = pd && pd.vila;
  p.rest = clamp(p.rest + dtSec / 3600 * (resting ? 0.09 : working ? -0.06 : -0.03), 0, 1);
  const heat = heatAt(s, p.x, p.y), rum = roomAt(s, p.x, p.y), shelter = rum ? shelterOf(s, rum, inRum.get(rum.id) ?? 1) : 0;
  p.warm = clamp(p.warm + dtSec / 3600 * (heat * 2 - coldRate * (1 - shelter) + (coldRate === 0 ? 0.5 : 0)), 0, 1);
  if (rum && resting && p.task!.phase === 'do' && pd.plats === 'sang') { // man vilar bättre under tak, och bäst på ett golv
    const m0 = gridOf(s).at.get(tileOf(p.x, p.y))?.m, soft = m0 === 'ho' || m0 === 'tra';
    p.rest = clamp(p.rest + dtSec / 3600 * (soft ? 0.03 : 0.02), 0, 1);
    if (p.task!.act === 'sova') think(p, soft ? 'Sov gott på golvet i huset' : 'Sov under tak', soft ? 0.07 : 0.05, now, 8 * HOUR);
  }
  if (heat > 0.15) {
    think(p, 'Värms av elden', fh.comfort, now, HOUR);
    p.rest = clamp(p.rest + dtSec / 3600 * fh.comfort * heat, 0, 1); // avslappning vid elden
  }
  if (p.warm < 0.35) think(p, 'Fryser', -0.12, now, HOUR);
  p.social = clamp(p.social - dtSec / (18 * 3600), 0, 1);
  // toa: behovet växer på ungefär sju timmar, långsammare i sömnen
  p.toa = clamp(p.toa - dtSec / (7 * 3600) * (p.task?.act === 'sova' ? 0.5 : 1), 0, 1);
  if (p.toa <= 0) { p.toa = 1; if (a >= 3) think(p, 'Kissade på sig', -0.12, now, 4 * HOUR); }
}

// hälsa, sjukdom och död: svält, kyla, sjukdom, ålderdom och olyckor. true = personen dog
function healthStep(s: State, p: Person, a: number, ai: number, dtSec: number) {
  const now = s.now;
  if (p.hunger <= 0) { p.health -= dtSec / (5 * 3600); if (rnd(s, 'halsa', p) < dtSec / 7200) think(p, 'Svälter', -0.25, now, 3 * HOUR); }
  else if (p.warm < 0.12) p.health -= dtSec / (20 * 3600);
  else if (p.hunger > 0.3 && !isSick(p, now)) p.health = clamp(p.health + dtSec / (10 * 3600), 0, 1);
  if (isSick(p, now)) p.health -= dtSec / (40 * 3600);
  if (!p.sickUntil || p.sickUntil < now) {
    if (chance(s, (ai === 0 ? 0.12 : 0.05) / 86400, dtSec, 'halsa', p)) { const dur = (3 + rnd(s, 'halsa', p) * 8) * HOUR; p.sickUntil = now + dur; p.sickWhy = 'Sjuk'; if (dur > 8 * HOUR) log(s, `${p.name} blev svårt sjuk.`, 'world', [p.id]); }
  }
  if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'av svält' : p.warm < 0.12 ? 'av kyla' : (p.poisonUntil ?? 0) > now ? 'av svampförgiftning' : 'av sjukdom'); return true; }
  // ålderdom och olyckor (Gompertz, per år = per dygn)
  const q = 0.0015 + 0.00004 * Math.exp(0.105 * a) + (a < 5 ? 0.02 : 0);
  if (chance(s, q / 86400, dtSec, 'halsa', p)) { die(s, p, a > 55 ? 'av ålderdom' : a < 5 ? 'av en barnsjukdom' : 'i en olycka'); if (a >= 5 && a <= 55) fearPlace(s, p, 'i en olycka'); return true; }
  const pd = p.task && ACTS[p.task.act], fara = pd && pd.fara; // farligt arbete, som jakt
  if (fara && p.task!.phase === 'do' && chance(s, fara.risk * (1 - (pd.arbete ? p.skill[pd.arbete] : 0) / 25) / 3600, dtSec, 'halsa', p)) { die(s, p, fara.text); fearPlace(s, p, fara.text); return true; }
  return false;
}

// graviditet: en kvinna med partner kan bli gravid; viljan styrs av hur många byn är, maten och sederna
function pregnancy(s: State, p: Person, a: number, pop: number, dtSec: number) {
  const now = s.now;
  if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > 0.75 * DAY) birth(s, p); }
  else if (p.sex === 'k' && p.partner !== undefined && a >= 17 && a <= 43 && (!p.lastBirth || now - p.lastBirth > 1.6 * DAY)) {
    const f = birthWish(pop) * clamp(foodDays(s) / 4, 0.15, 1) * barnMat(s, pop) * (1 + 0.2 * s.seder.v.barn);
    if (chance(s, 0.3 * f / 86400, dtSec, 'halsa', p)) { p.pregnantSince = now; p.pregnantBy = p.partner; }
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
    const mustGo = t && p.toa < 0.08 && t.act !== 'toa' && a >= 3; // nöden avbryter det man håller på med
    if (!t || (t.until <= now && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone) {
      if (t && (t.carry > 0 || t.items) && t.act !== 'elda') { t.phase = 'back'; const d = dropSpot(s, homeKind(t)); t.tx = d.x + sida(p, 0.2); t.ty = d.y + sida(p, -0.2); }
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
      if (tk.phase === 'do' && d.hantverk) p.skill.hantverk = clamp(p.skill.hantverk + used / 3600 * 0.1 * learn * (1 - p.skill.hantverk / 21), 0, 20);
      if (d.vandra) wear(groundOf(s), tileOf(tk.tx, tk.ty), WEAR * GANG * 0.08 * d.vandra.v * used); // man rör sig på platsen
    }
    // vana: tiden räknas mot yrkestaggar
    const hf = Math.exp(-used * SEC / HABIT_FADE);
    for (const k in p.habit) p.habit[k] *= hf;
    p.habit[tk.act] = (p.habit[tk.act] ?? 0) + used / 3600;
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
    // målet går inte att nå (en ö): man väljer något annat. Bara den som själv är avskuren från lägret går rakt över
    if (!v && tk.phase === 'go' && pathFor(s, g, p.x, p.y, f.x + 0.5, f.y + 0.5)) { p.task = undefined; return { used: Math.min(left, BIT), framme: false }; }
    tk.path = v ?? [];
  }
  const off = sida(p, 0.18), fart = a < 6 ? 0.9 : a > 65 ? 1 : 1.6, t0 = s.now;
  let budget = fart * left;
  const klocka = () => t0 + (fart * left - budget) / fart * SEC;
  while (tk.path && tk.path.length && budget > 0) {
    const i = tk.path[0], wx = (i % W) + 0.5 + off, wy = Math.floor(i / W) + 0.5 - off;
    const ci = tileOf(p.x, p.y), sp = speedAt(g, ci) || 1;
    const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
    wear(g, ci, WEAR * GANG * Math.min(d, can));
    if (d <= can) { p.x = wx; p.y = wy; tk.path.shift(); budget -= d / sp; spara(s, p, klocka()); }
    else { p.x += dx / d * can; p.y += dy / d * can; budget = 0; }
  }
  if (budget <= 0) return { used: left, framme: false };
  const ci = tileOf(p.x, p.y), spd = speedAt(g, ci) || 1;
  const dx = tk.tx - p.x, dy = tk.ty - p.y, d = Math.hypot(dx, dy), sp = budget * spd;
  wear(g, ci, WEAR * GANG * Math.min(d, sp));
  if (d > sp) { p.x += dx / d * sp; p.y += dy / d * sp; return { used: left, framme: false }; }
  budget -= d / spd;
  tk.path = undefined; tk.pk = undefined;
  p.x = tk.tx; p.y = tk.ty;
  spara(s, p, klocka());
  return { used: left - budget / fart, framme: true };
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
    if (r && r.until > now + 2 * 60 * SEC && tk.dark === !light) { tk.phase = 'go'; tk.tx = r.x; tk.ty = r.y; tk.until = r.until; tk.res = undefined; }
    else p.task = undefined;
  } else {
    tk.phase = 'do'; if (tk.act === 'bara') { pickUp(s, p, tk); tk.until = now; }
    startWork(s, p, tk); // ett redskap eller ett träd: arbetet räknas härifrån, och det påbörjade fortsätter
    const tur = ACTS[tk.act].tur;
    tk.tur = 0; tk.lim = tur ? tur * (toolRow(tk)?.tur ?? 1) : undefined;
  }
}

// arbete för byn (handlingar med arbete): det man får och bär, det platsen har kvar, redskapen som slits och det man lär sig
function workStep(s: State, p: Person, tk: Task, dtSec: number, a: number, learn: number) {
  const now = s.now, d = ACTS[tk.act];
  const rd = toolRow(tk); // redskapet i handen: vad det ger och hur det slits står i handlingens rad
  if (rd && d.slits) wearUsed(s, p, dtSec / d.slits);
  // utan yxa samlas grenar på marken (två grenar på den tid det tar att hugga en ved); med yxa huggs ved ur en fälld stam
  // bär, rötter och vilt: platsen ger mindre ju mer som redan tagits där
  const res = d.resurs, rich = res && d.takt === undefined ? richness(s, res, tk.tx, tk.ty) : 1;
  const y = workRate(s, p, tk.act) * dtSec * (rd?.ger ?? 1) * (d.takt ?? rich);
  if (y > 0) count(s, 'prod_' + tk.act, y);
  if (res && d.takt === undefined) { takeFrom(s, res, tk.tx, tk.ty, y); if (rich < 0.08 && !tk.sok) tk.until = now; } // tomt här: gå hem eller vidare (den som letar flinta eller stenar fortsätter)
  // den som arbetar ser hur mycket som finns i området och minns det
  if (res && (rich < 0.08 || chance(s, 1 / 1800, dtSec, 'minne', p))) lookAround(s, p, tk.tx, tk.ty);
  const bar = (k: string, n: number) => { if (n > 0) { tk.items ??= {}; tk.items[k] = (tk.items[k] ?? 0) + n; } };
  if (tk.act === 'fiske') {
    // fiske med händerna, spjut eller metspö: ett försök i taget, och fiskaren går hem med varje fångst
    tk.prog = (tk.prog ?? 0) + dtSec;
    const ageF = arbetsformaga(p, a, now);
    while (tk.prog >= TRY_SEC) {
      tk.prog -= TRY_SEC;
      if (rd?.bete && (tk.mask ?? 0) < 1) { tk.mask = (tk.mask ?? 0) + MASK_PER_GRAV; continue; } // gräver fram mask först
      const napp = p.fiske?.n ?? 0;
      tk.carry += handFish(s, p, tk.tx, tk.ty, ageF, rd?.don ?? 'hand');
      if (rd?.bete && (p.fiske?.n ?? 0) > napp) tk.mask!--; // varje napp tar en mask
      if (rd) wearUsed(s, p, 1);
    }
  }
  if (tk.act === 'hugga') {
    const k = stocks(s).find(q => q.id === tk.ref), got = chopStock(s, tk.ref, y);
    if (!got) tk.until = now; // stammen är slut
    else {
      if (k) got.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), got.ved, undefined, p); // står stammen där ett hus byggs blir träet väggar
      tk.carry += got.ved; bar('grenar', got.grenar);
      if (got.done) tk.until = now;
    }
  } else if (y > 0 && tk.act === 'samla') {
    const r = rich > 0 ? y * Math.min(1, richness(s, 'rotter', tk.tx, tk.ty) / rich) : 0; // rötterna efter hur mycket av platsen som är rötter
    tk.carry += y - r; bar('rotter', r);
  } else if (y > 0 && tk.act !== 'jakt') tk.carry += y;
  if (tk.act === 'jakt') {
    // man fångar hela djur, än så länge bara kaniner. Chansen är sådan att man i snitt får lika mycket som platsen ger.
    // Kaninen fyller famnen och bärs hem hel
    if (y > 0 && rnd(s, 'arbete', p) < y / KANIN) {
      count(s, 'kaniner');
      if (s.stat!.kaniner === 1) log(s, `${p.name} fångade byns första kanin och bar hem den hel.`, 'world', [p.id]);
      tk.carry += KANIN;
    }
  }
  if (tk.act === 'samla') {
    const got = forageItems(s, p, dtSec) ?? {};
    bar('svamp', pickMushrooms(s, p, tk.tx, tk.ty, dtSec, got));
    for (const k in got) bar(k, got[k]);
  }
  const sk = d.arbete!;
  const before = p.skill[sk];
  p.skill[sk] = clamp(p.skill[sk] + dtSec / 3600 * 0.12 * learn * (0.4 + stat(p, 'intelligens', now) / 20) * (1 - p.skill[sk] / 21), 0, 20);
  if (before < 16 && p.skill[sk] >= 16) {
    const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = !s.people.some(q => q.fame.includes(title));
    p.fame.push(title); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
    sedEvent(s, 'nyfikenhet', first ? 0.06 : 0.01, first ? `${p.name} blev byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}. Byn ser vad kunskap kan ge.` : undefined);
  }
  // arbetet sker i turer: efter en stunds arbete (tur), en fångst eller när bördan är full bärs det hem, sedan fortsätter man
  tk.tur = (tk.tur ?? 0) + dtSec;
  const full = load(tk) >= capacity(s, p) * WORK_LOAD, has = tk.carry > 0 || !!tk.items;
  if (full || (tk.lim !== undefined && tk.tur >= tk.lim) || (tk.act === 'fiske' && tk.carry > 0)) {
    if (has && tk.until > now + 2 * 60 * SEC) { tk.res = { x: tk.tx, y: tk.ty, until: tk.until }; tk.until = now; count(s, 'turer'); }
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

export function serialize(s: State) {
  packGround(s); packFynd(s);
  return JSON.stringify(s, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v));
}

// sparfilen i delar, så att varje del ryms i ett dokument i artefaktens databas (högst 256 KB). Det som inte står här är byn
export const DELAR: Record<string, string[]> = { folket: ['people', 'rels'], kartor: ['fynd', 'mark', 'skog', 'stubbar'], loggen: ['log'] };
export function serializeParts(s: State): Record<string, string> {
  const byn = JSON.parse(serialize(s)), ut: Record<string, string> = {};
  for (const [d, keys] of Object.entries(DELAR)) {
    const del: Record<string, unknown> = {};
    for (const k of keys) if (k in byn) { del[k] = byn[k]; delete byn[k]; }
    ut[d] = JSON.stringify(del);
  }
  if (byn.hist) { for (const [d, h] of Object.entries(histParts(s, byn.hist))) ut[d] = JSON.stringify({ hist: h }); delete byn.hist; }
  return { byn: JSON.stringify(byn), ...ut };
}
export const joinParts = (delar: string[]) => {
  const ut: Record<string, unknown> = {}, hist: Historik[] = [];
  for (const d of delar) { const o = JSON.parse(d); if (o.hist) { hist.push(o.hist); delete o.hist; } Object.assign(ut, o); }
  if (hist.length) ut.hist = joinHist(hist); // historiken ligger i en del per vecka
  return JSON.stringify(ut);
};

// rensa gammal historik så att sparfilen hålls liten
export function compact(s: State) {
  const gone = s.people.filter(p => !alive(p)).sort((a, b) => (b.died ?? b.left ?? 0) - (a.died ?? a.left ?? 0));
  if (gone.length > 120) {
    const drop = new Set(gone.slice(120).map(p => p.id));
    s.people = s.people.filter(p => !drop.has(p.id));
  }
  const ids = new Set(s.people.filter(alive).map(p => p.id));
  for (const k in s.rels) { const [a, b] = k.split('-').map(Number); if (!ids.has(a) && !ids.has(b)) delete s.rels[k]; }
}
