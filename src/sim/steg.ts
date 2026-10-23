import { syncTools } from './agande';
import { rotStumps } from './skog';
import { addFood, addTo, capacity, dropSpot, fetchSpot, homeKind, load, pickUp, storeLoad, takeFood, tidyStore, wearStore } from './lager';
import { KANIN, KORG_SKORD, MASK_PER_GRAV, isSpear, makeBasket, makeKnife, makeRod, makeSpear, slaughter, twineRope, wearBasket, wearRod, wearSpear } from './redskap';
import { thinkWhileWorking } from './teknik';
import { foodDays, workRate } from './ekonomi';
import { TRY_SEC, eatPoison, growFynd, handFish, packFynd, pickMushrooms, richness, takeFrom } from './fynd';
import { coldOf, temperature } from './vader';
import { addFuel, addItems, canLight, fireWant, forageItems, fuelStock, hearthOf, heatAt, igniterOf, stepFire, takeCoal, takeFuel, tryLight } from './eld';
import { ageOf, alive, count, living, log, stat, think } from './folk';
import { getMap } from './karta';
import { birth, birthWish, die, regulate } from './liv';
import { WEAR, groundOf, growGround, packGround, tileOf } from './mark';
import { TalkEvent, converse } from './samtal';
import { HABIT_FADE, sedEvent, stepSeder, updateTags } from './seder';
import { fearPlace, forget, lookAround } from './minne';
import { chance, clamp, rnd } from './slump';
import { ageIndex, isLight } from './tid';
import { chopStock, fellTree, makeAxe, stocks } from './skog';
import { ACTS } from './handlingar';
import { Act, DAY, HOUR, Person, SEC, SKILL_NAMES, State, Task, W, H, useMap } from './typer';
import { findPath, speedAt, wear } from './vag';
import { chooseTask } from './val';
import { nearestDjur } from './djur';
import { Job, avail, bitById, buildJob, deliver as deliverBit, lacks, needOf, planBuild, siteOf, takeFor, toWalls, wearBuild, workOn } from './bygg';
import { MATERIAL, blocked, gridOf, roomAt, shelterOf } from './byggnad';

// arbete i levande läge: man bär hem det man har efter några fynd (fler med korg), fiskaren efter varje fångst, och går
// sedan tillbaka. Man bär aldrig mer än en tredjedel av vad man orkar från arbetet. Fler turer ger fler fotsteg, så
// slitaget per steg sänks för att stigarna ska växa som förut, och det man får per fynd höjs (levande i handlingar.ts)
// så att en arbetstimme räknat med gångtiden ger lika mycket som i snabbläget
const WORK_LOAD = 1 / 3, LIVE_WEAR = 0.03, KORG_FYND = 2.5;
// i levande läge arbetar man bara en del av tiden på platsen (resten går åt till att bära hem). Det som räknas per
// arbetssekund (fynd av flinta och svamp, inlärning, slitage) jämkas lika mycket som avkastningen
const FAST = 0.8;
const liveF = (act: Act, live: boolean) => live ? (ACTS[act].levande ?? 1) / FAST : 1;
const JAKT_SPJUT = 1.4; // jakt med spjut ger så mycket mer

type Krok = (s: State, p: Person, t: Task, dtSec: number, live: boolean) => void;
// det som händer medan man gör något (efter att ha kommit fram). Arbete för byn sköts av workStep
const MEDAN: Partial<Record<Act, Krok>> = {
  toa: (_s, p) => { p.toa = 1; },
  kol: (s, p) => takeCoal(s, p, 'hämtade'),
  bygga: (s, p, t, dtSec, live) => buildStep(s, p, t, dtSec, live),
  hantverk: (s, p, t, dtSec) => { if (t.tool === 'rep') twineRope(s, p, dtSec / 3600); },
  slakta: (s, p, _t, dtSec) => slaughter(s, p, dtSec / 3600),
  tanda: (s, p, _t, dtSec) => {
    if (!canLight(s)) return;
    s.fire.tryProg += dtSec;
    const per = igniterOf(s)!.minutes * 60;
    while (s.fire.tryProg >= per && canLight(s) && !s.fire.lit) { s.fire.tryProg -= per; if (tryLight(s, p)) { p.task = undefined; break; } }
  },
};
// det som händer när en handling är klar
const KLAR: Partial<Record<Act, Krok>> = {
  falla: (s, p, t) => { // ett träd där ett hus ska stå, eller som fälldes för bygget, blir stockar i husets väggar direkt; resten huggs till trä
    const k = fellTree(s, p, t.tx, t.ty);
    if (k) { k.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), k.ved, t.ref); if (k.ved <= 1e-6) s.stockar = stocks(s).filter(q => q !== k); }
  },
  yxa: (s, p) => makeAxe(s, p),
  spjut: (s, p) => makeSpear(s, p),
  metspo: (s, p) => makeRod(s, p),
  kniv: (s, p) => makeKnife(s, p),
  korg: (s, p) => makeBasket(s, p),
  promenad: (s, p, t) => { lookAround(s, p, t.tx, t.ty); think(p, 'Tog en skön promenad', 0.06, s.now, 6 * HOUR); },
  bada: (s, p) => { p.warm = Math.max(0.4, p.warm - 0.1); think(p, 'Badade i sjön', 0.08, s.now, 6 * HOUR); },
  strand: (s, p) => { p.rest = Math.min(1, p.rest + 0.05); think(p, 'Satt vid vattnet och fick ro', 0.06, s.now, 6 * HOUR); },
};

// ---------- huvudsteg ----------
// dt i sekunder. live=true: personer går och bär; live=false: grovt steg (ikappräkning/snabbspolning)
export function step(s: State, dtSec: number, live: boolean, events?: TalkEvent[]) {
  useMap(s);
  s.now += dtSec * SEC;
  const now = s.now;
  const ai = ageIndex(s);
  if (ai !== s.lastAgeIdx) {
    s.lastAgeIdx = ai;
    const msg = ['Istiden har börjat. Sjön fryser och maten blir knapp.', 'Vårtiden har kommit. Isen släpper och marken tinar.', 'Sommartiden är här. Bär och fisk finns i överflöd.', 'Hösttiden har börjat. Nu gäller det att samla inför istiden.'][ai];
    log(s, msg, 'world');
  }
  const ppl = living(s);
  const light = isLight(now);
  gridOf(s); // väggarna och rummen, så att vägsökningen vet var väggarna står
  // förråd: ruttning och ved
  wearStore(s, dtSec, ai); // slitage per slag, fortare utanför lagret
  stepFire(s, dtSec, live, ppl);
  const fh = hearthOf(s.fire), coldRate = coldOf(temperature(s));
  const learn = 1 + 0.1 * s.seder.v.nyfikenhet; // en nyfiken by lär sig snabbare
  if (Math.floor(now / HOUR) !== Math.floor((now - dtSec * SEC) / HOUR)) {
    stepSeder(s); updateTags(s);
    growGround(s, 1, ai); growFynd(s, 1, ai); forget(s, 1); rotStumps(s); tidyStore(s);
    wearBuild(s, 1, ai); planBuild(s);
  }

  const social: Person[] = [];
  const inRum = new Map<number, number>(); // hur många som är i varje rum
  for (const p of ppl) { const r = roomAt(s, p.x, p.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  for (const p of ppl) {
    const a = ageOf(p, now);
    needsStep(s, p, a, dtSec, coldRate, fh, inRum);
    if (p.hunger < 0.45 && s.food >= 0.3) eat(s, p, a);
    if (healthStep(s, p, a, ai, dtSec)) continue; // dog
    pregnancy(s, p, a, ppl.length, dtSec);
    taskStep(s, p, a, dtSec, live, light, learn, social);
    if (p.thoughts.some(x => x.until <= now)) p.thoughts = p.thoughts.filter(x => x.until > now);
  }
  // samtal: ca ett per 4 minuter per person i social aktivitet
  if (social.length > 1) {
    for (const p of social) {
      if (!alive(p)) continue;
      const expect = dtSec / 240 * (0.6 + stat(p, 'vanlighet', now) / 25);
      let n = Math.floor(expect); if (rnd(s) < expect - n) n++;
      // bara med dem som är nära; i snabbläget står var och en på sin plats för uppgiften, så det blir samma grupper
      const others = social.filter(q => q !== p && alive(q) && Math.hypot(q.x - p.x, q.y - p.y) < 4);
      for (let i = 0; i < n; i++) converse(s, p, others, live ? events : undefined);
      if (n && others.length) count(s, 'samtal', n);
    }
  }
  // relationer bleknar långsamt utan umgänge
  if (rnd(s) < dtSec / 600) {
    const k = Math.exp(-0.04 * (600 / 86400));
    for (const key in s.rels) { const r = s.rels[key]; r.op *= k; r.rom *= k; }
  }
  if (living(s).length === 0) log(s, 'Byn är tom. Ingen finns kvar vid elden.', 'world');
  regulate(s, dtSec);
  for (const k in s.items) if (s.items[k] < 1e-6) delete s.items[k];
  syncTools(s);
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
    const m0 = gridOf(s).at.get(Math.floor(p.y) * W + Math.floor(p.x))?.m, soft = m0 === 'ho' || m0 === 'tra';
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

// en hel portion, eller det som finns kvar. Maten under halva skicket mättar sämre, under en fjärdedel kan man bli sjuk
function eat(s: State, p: Person, a: number) {
  const now = s.now, full = a < 10 ? 0.6 : 1, portion = Math.min(full, s.food);
  const q = takeFood(s, portion);
  p.hunger = clamp(p.hunger + 0.55 * portion / full * (q >= 0.5 ? 1 : 0.5 + q), 0, 1); eatPoison(s, p);
  if (q < 0.5) think(p, 'Maten var dålig', -0.05, now, 6 * HOUR);
  if (q < 0.25 && rnd(s) < (0.25 - q) / 0.25 * 0.35) {
    p.sickUntil = Math.max(p.sickUntil ?? 0, now + (4 + rnd(s) * 8) * HOUR); p.sickWhy = 'Magsjuk av skämd mat';
    think(p, 'Åt skämd mat och blev magsjuk', -0.2, now, DAY / 2); count(s, 'skamdMat');
    log(s, `${p.name} blev magsjuk av skämd mat.`, 'world', [p.id]);
  }
}

// hälsa, sjukdom och död: svält, kyla, sjukdom, ålderdom och olyckor. true = personen dog
function healthStep(s: State, p: Person, a: number, ai: number, dtSec: number) {
  const now = s.now;
  if (p.hunger <= 0) { p.health -= dtSec / (5 * 3600); if (rnd(s) < dtSec / 7200) think(p, 'Svälter', -0.25, now, 3 * HOUR); }
  else if (p.warm < 0.12) p.health -= dtSec / (20 * 3600);
  else if (p.hunger > 0.3 && !(p.sickUntil && p.sickUntil > now)) p.health = clamp(p.health + dtSec / (10 * 3600), 0, 1);
  if (p.sickUntil && p.sickUntil > now) p.health -= dtSec / (40 * 3600);
  if (!p.sickUntil || p.sickUntil < now) {
    if (chance(s, (ai === 0 ? 0.12 : 0.05) / 86400, dtSec)) { const dur = (3 + rnd(s) * 8) * HOUR; p.sickUntil = now + dur; p.sickWhy = 'Sjuk'; if (dur > 8 * HOUR) log(s, `${p.name} blev svårt sjuk.`, 'world', [p.id]); }
  }
  if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'av svält' : p.warm < 0.12 ? 'av kyla' : (p.poisonUntil ?? 0) > now ? 'av svampförgiftning' : 'av sjukdom'); return true; }
  // ålderdom och olyckor (Gompertz, per år = per dygn)
  const q = 0.0015 + 0.00004 * Math.exp(0.105 * a) + (a < 5 ? 0.02 : 0);
  if (chance(s, q / 86400, dtSec)) { die(s, p, a > 55 ? 'av ålderdom' : a < 5 ? 'av en barnsjukdom' : 'i en olycka'); if (a >= 5 && a <= 55) fearPlace(s, p, 'i en olycka'); return true; }
  const pd = p.task && ACTS[p.task.act], fara = pd && pd.fara; // farligt arbete, som jakt
  if (fara && p.task!.phase === 'do' && chance(s, fara.risk * (1 - (pd.arbete ? p.skill[pd.arbete] : 0) / 25) / 3600, dtSec)) { die(s, p, fara.text); fearPlace(s, p, fara.text); return true; }
  return false;
}

// graviditet: en kvinna med partner kan bli gravid; viljan styrs av hur många byn är, maten och sederna
function pregnancy(s: State, p: Person, a: number, pop: number, dtSec: number) {
  const now = s.now;
  if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > 0.75 * DAY) birth(s, p); }
  else if (p.sex === 'k' && p.partner !== undefined && a >= 17 && a <= 43 && (!p.lastBirth || now - p.lastBirth > 1.6 * DAY)) {
    const f = birthWish(pop) * clamp(foodDays(s) / 4, 0.15, 1) * (1 + 0.2 * s.seder.v.barn);
    if (chance(s, 0.3 * f / 86400, dtSec)) { p.pregnantSince = now; p.pregnantBy = p.partner; }
  }
}

// uppgiften: avsluta den som är klar, välj en ny, gå dit och gör den. Vanor och idéer växer medan man håller på
function taskStep(s: State, p: Person, a: number, dtSec: number, live: boolean, light: boolean, learn: number, social: Person[]) {
  // snabbläget tar steg om fem minuter: en uppgift slutar i det steg som ligger närmast sluttiden, så att den varar lika
  // länge som i levande läget i snitt (annars blir korta uppgifter som toa nästan dubbelt så långa)
  const now = s.now, t = p.task, end = live ? now : now + dtSec * SEC / 2;
  const phaseFlip = t && t.dark !== !light && ACTS[t.act].dygn; // dag blev natt eller tvärtom
  if (t && t.phase === 'do' && t.until < end) KLAR[t.act]?.(s, p, t, dtSec, live); // ett träd som fällts färdigt, en yxa som gjorts klar
  const lightDone = t?.act === 'tanda' && (s.fire.lit || !canLight(s));
  const mustGo = t && p.toa < 0.08 && t.act !== 'toa' && a >= 3; // nöden avbryter det man håller på med
  if (!t || (t.until < end && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone) {
    if (t && (t.carry > 0 || t.items) && t.act !== 'elda' && live) { t.phase = 'back'; const d = dropSpot(s, homeKind(t)); t.tx = d.x + (rnd(s) - 0.5) * 0.4; t.ty = d.y + (rnd(s) - 0.5) * 0.4; }
    else chooseTask(s, p, live);
  }
  const tk = p.task!;
  if (!live && tk.act === 'bara' && tk.phase === 'do' && tk.until > now) { pickUp(s, p, tk); storeLoad(s, tk); tk.until = now; }
  if (live) moveLive(s, p, tk, dtSec, a, light);
  // vana: tiden räknas mot yrkestaggar
  const hf = Math.exp(-dtSec * SEC / HABIT_FADE);
  for (const k in p.habit) p.habit[k] *= hf;
  p.habit[tk.act] = (p.habit[tk.act] ?? 0) + dtSec / 3600;
  // den som arbetar kommer så småningom på hur det kan göras bättre; man funderar också på vägen dit och hem
  thinkWhileWorking(s, p, tk.act, dtSec);
  const d = ACTS[tk.act];
  if (tk.phase === 'do') {
    MEDAN[tk.act]?.(s, p, tk, dtSec, live);
    if (d.arbete) workStep(s, p, tk, dtSec, live, a, learn);
  }
  // (bygget kan just ha skickat iväg personen efter mer material)
  if (tk.phase === 'do' && d.hantverk) p.skill.hantverk = clamp(p.skill.hantverk + dtSec / 3600 * 0.1 * learn * (1 - p.skill.hantverk / 21), 0, 20);
  if (tk.phase === 'do' && d.social) social.push(p);
}

// levande läge: gå till platsen och tillbaka, och rör sig på platsen
function moveLive(s: State, p: Person, tk: Task, dtSec: number, a: number, light: boolean) {
  const now = s.now, d0 = ACTS[tk.act];
  if (tk.phase === 'go' || tk.phase === 'back') {
    // vägsökning: gå ruta för ruta runt vatten, gärna längs stigar
    const g = groundOf(s);
    const key = `${tk.tx.toFixed(2)},${tk.ty.toFixed(2)},${s.byggV ?? 0}`; // en ny vägg kan stänga vägen
    if (tk.pk !== key) { tk.pk = key; tk.path = findPath(g, p.x, p.y, tk.tx, tk.ty) ?? []; }
    const off = (((p.id * 37) % 7) - 3) * 0.06; // var och en går lite vid sidan av, så att de inte täcker varandra
    let budget = (a < 6 ? 0.9 : a > 65 ? 1 : 1.6) * dtSec;
    while (tk.path && tk.path.length && budget > 0) {
      const i = tk.path[0], wx = (i % W) + 0.5 + off, wy = Math.floor(i / W) + 0.5 - off;
      const ci = tileOf(p.x, p.y), sp = speedAt(g, ci) || 1;
      const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
      const mv = Math.min(d, can);
      wear(g, ci, WEAR * LIVE_WEAR * mv);
      if (d <= can) { p.x = wx; p.y = wy; tk.path.shift(); budget -= d / sp; }
      else { p.x += dx / d * can; p.y += dy / d * can; budget = 0; }
    }
    const ci = tileOf(p.x, p.y), spd = speedAt(g, ci) || 1;
    const dx = tk.tx - p.x, dy = tk.ty - p.y, d = Math.hypot(dx, dy);
    const sp = budget * spd;
    if (budget <= 0) return; // väntar på nästa steg
    if (d > sp) { wear(g, ci, WEAR * LIVE_WEAR * sp); p.x += dx / d * sp; p.y += dy / d * sp; return; }
    tk.path = undefined; tk.pk = undefined;
    p.x = tk.tx; p.y = tk.ty;
    arrive(s, p, tk, light);
  } else if (d0.vandra) {
    // på platsen: stå still en stund, gå några steg, stå still igen (från buske till buske, spana efter vilt). Varje
    // gång man stannar på ett nytt ställe räknas som ett fynd
    const w = d0.vandra;
    if (tk.hold === undefined) tk.hold = now + (w.h0 + rnd(s) * (w.h1 - w.h0)) * SEC;
    if (tk.wx === undefined && now > tk.hold) {
      for (let k = 0; k < 6; k++) {
        const ang = rnd(s) * Math.PI * 2, r = w.r * Math.sqrt(rnd(s)), nx = tk.tx + Math.cos(ang) * r, ny = tk.ty + Math.sin(ang) * r;
        if (nx > 0 && ny > 0 && nx < W && ny < H && !blocked(s, nx, ny)) { tk.wx = nx; tk.wy = ny; break; }
      }
      // jägaren smyger mot den närmaste kaninen
      const dj = tk.act === 'jakt' ? nearestDjur(s, tk.tx, tk.ty, w.r) : undefined;
      if (dj && !blocked(s, dj.x, dj.y)) { tk.wx = dj.x; tk.wy = dj.y; }
      if (tk.wx === undefined) tk.hold = now + w.h0 * SEC;
    }
    if (tk.wx !== undefined) {
      const g = groundOf(s), ci = tileOf(p.x, p.y), sp = (speedAt(g, ci) || 1) * w.v * (a < 6 ? 0.6 : 1) * dtSec;
      const dx = tk.wx - p.x, dy = tk.wy! - p.y, d = Math.hypot(dx, dy), mv = Math.min(d, sp);
      const nx = d <= sp ? tk.wx : p.x + dx / d * sp, ny = d <= sp ? tk.wy! : p.y + dy / d * sp;
      if (blocked(s, nx, ny)) { tk.wx = tk.wy = undefined; tk.hold = now + w.h0 * SEC; }
      else {
        wear(g, ci, WEAR * LIVE_WEAR * 0.15 * mv); p.x = nx; p.y = ny;
        if (d <= sp) { tk.fynd = (tk.fynd ?? 0) + 1; tk.wx = tk.wy = undefined; tk.hold = now + (w.h0 + rnd(s) * (w.h1 - w.h0)) * SEC; }
      }
    }
  } else if (!d0.stilla) {
    // småjustering så att de rör sig lite
    if (rnd(s) < dtSec * 0.08) { const nx = p.x + (rnd(s) - 0.5) * 0.4, ny = p.y + (rnd(s) - 0.5) * 0.4; if (!blocked(s, nx, ny)) { p.x = nx; p.y = ny; } }
  }
}
// framme vid målet: vid förrådet, vid bygget, hemma med bördan eller på platsen där arbetet görs
function arrive(s: State, p: Person, tk: Task, light: boolean) {
  const now = s.now;
  if (tk.act === 'elda') {
    if (tk.phase === 'go') {
      // vid förrådet: ta en famn ved och gå till elden
      const m = getMap(s.seed), n = s.fire.fuel >= fireWant(s) ? 0 : Math.min(1, fuelStock(s)); // en famn i taget, så att elden matas oftare
      if (n <= 0) p.task = undefined;
      else { tk.carry = takeFuel(s, n); tk.phase = 'back'; tk.tx = m.fire.x + 0.5 + (rnd(s) - 0.5) * 1.2; tk.ty = m.fire.y + 1.2; }
    } else { addFuel(s, p, tk.carry); tk.carry = 0; p.task = undefined; }
  } else if (tk.act === 'bygga' && tk.phase === 'go' && tk.site) {
    // vid lagret: ta materialet och gå till bygget
    const b = bitById(s, tk.ref), k = b && MATERIAL[b.m].item, n = b ? needOf(b) : 0;
    if (!b || !k || avail(s, k) < n) p.task = undefined;
    else { addTo(s, k, -n); tk.items = { [k]: n }; tk.tx = tk.site.x; tk.ty = tk.site.y; tk.site = undefined; }
  } else if (tk.phase === 'back') {
    storeLoad(s, tk, p.x, p.y);
    // ett arbetspass är klart: gå tillbaka och fortsätt om arbetet inte är slut och dagen inte vänt
    const r = tk.res;
    if (r && r.until > now + 2 * 60 * SEC && tk.dark === !light) { tk.phase = 'go'; tk.tx = r.x; tk.ty = r.y; tk.until = r.until; tk.res = undefined; tk.wx = tk.wy = tk.hold = undefined; }
    else p.task = undefined;
  } else {
    tk.phase = 'do'; if (tk.act === 'bara') { pickUp(s, p, tk); tk.until = now; }
    const f = ACTS[tk.act].fynd;
    tk.fynd = 0; tk.lim = f ? Math.round((f[0] + rnd(s) * (f[1] - f[0])) * (tk.tool === 'korg' ? KORG_FYND : 1)) : undefined;
  }
}

// arbete för byn (handlingar med arbete): det man får, det platsen har kvar, redskapen som slits och det man lär sig
function workStep(s: State, p: Person, tk: Task, dtSec: number, live: boolean, a: number, learn: number) {
  const now = s.now, d = ACTS[tk.act];
  const lf = liveF(tk.act, live);
  if (tk.tool === 'korg') wearBasket(s, p, dtSec * lf / 3600);
  // utan yxa samlas grenar på marken (två grenar på den tid det tar att hugga en ved); med yxa huggs ved ur en fälld stam
  // bär, rötter och vilt: platsen ger mindre ju mer som redan tagits där
  const res = d.resurs, rich = res && d.takt === undefined ? richness(s, res, tk.tx, tk.ty) : 1;
  const spjut = isSpear(tk.tool);
  const y = workRate(s, p, tk.act) * dtSec * (live ? d.levande ?? 1 : FAST) * (tk.tool === 'korg' ? KORG_SKORD : 1) * (tk.act === 'jakt' && spjut ? JAKT_SPJUT : 1) * (d.takt ?? rich);
  if (y > 0) count(s, 'prod_' + tk.act, y);
  if (res && d.takt === undefined) { takeFrom(s, res, tk.tx, tk.ty, y); if (rich < 0.08) tk.until = now; } // tomt här: gå hem eller vidare
  // den som arbetar ser hur mycket som finns i området och minns det
  if (res && (rich < 0.08 || chance(s, 1 / 1800, dtSec))) lookAround(s, p, tk.tx, tk.ty);
  if (tk.act === 'fiske') {
    // fiske med händerna eller spjut: ett försök i taget. Fiskaren och jägaren går hem med varje fångst i levande läge,
    // men vägen är kort och de är på platsen nästan hela tiden, så de jämkas inte för gångtiden (levande = FAST)
    tk.prog = (tk.prog ?? 0) + dtSec * lf;
    const ageF = (a < 14 ? 0.3 : a > 60 ? 0.6 : 1) * (p.sickUntil && p.sickUntil > now ? 0.3 : 1);
    let fish = 0;
    while (tk.prog >= TRY_SEC) {
      tk.prog -= TRY_SEC;
      const gear = tk.tool === 'metspo' ? 'metspo' : isSpear(tk.tool) ? 'spjut' : 'hand';
      if (gear === 'metspo' && (tk.mask ?? 0) < 1) { tk.mask = (tk.mask ?? 0) + MASK_PER_GRAV; continue; } // gräver fram mask först
      const napp = p.fiske?.n ?? 0;
      fish += handFish(s, p, tk.tx, tk.ty, ageF, gear);
      if (gear === 'metspo') { if ((p.fiske?.n ?? 0) > napp) tk.mask!--; wearRod(s, p); } // varje napp tar en mask
      else if (gear === 'spjut') wearSpear(s, p);
    }
    // snabbläget: fångsten läggs direkt i förrådet och fiskaren fortsätter, som i levande läget där hen går tillbaka
    if (fish) { if (live) tk.carry += fish; else addFood(s, 'fisk', fish); }
  }
  if (tk.act === 'hugga') {
    const k = stocks(s).find(q => q.id === tk.ref), got = chopStock(s, tk.ref, y);
    if (!got) tk.until = now; // stammen är slut
    else {
      if (k) got.ved -= toWalls(s, Math.floor(k.x), Math.floor(k.y), got.ved); // står stammen där ett hus byggs blir träet väggar
      if (live) { tk.carry += got.ved; tk.items ??= {}; tk.items.grenar = (tk.items.grenar ?? 0) + got.grenar; }
      else { s.wood += got.ved; addItems(s, { grenar: got.grenar }); }
      if (got.done) tk.until = now;
    }
  } else if (y > 0 && tk.act === 'samla') {
    const r = rich > 0 ? y * Math.min(1, richness(s, 'rotter', tk.tx, tk.ty) / rich) : 0; // rötterna efter hur mycket av platsen som är rötter
    if (live) { tk.carry += y - r; tk.items ??= {}; tk.items.rotter = (tk.items.rotter ?? 0) + r; }
    else { addFood(s, 'bar', y - r); addFood(s, 'rotter', r); }
  } else if (y > 0 && tk.act !== 'jakt') { if (live) tk.carry += y; else addTo(s, d.ger!, y); } // snabbläget: rakt in i förrådet
  if (tk.act === 'jakt') {
    if (spjut) wearSpear(s, p, dtSec * lf / TRY_SEC); // spjutet slits lika mycket per fem minuter som vid ett fiskeförsök
    // man fångar hela djur, än så länge bara kaniner. Chansen är sådan att man i snitt får lika mycket som platsen ger.
    // Kaninen fyller famnen och bärs hem hel
    if (y > 0 && rnd(s) < y / KANIN) {
      count(s, 'kaniner');
      if (s.stat!.kaniner === 1) log(s, `${p.name} fångade byns första kanin och bar hem den hel.`, 'world', [p.id]);
      if (live) tk.carry += KANIN; else addFood(s, 'vilt', KANIN);
    }
  }
  if (tk.act === 'samla') {
    const got = forageItems(s, p, dtSec * lf) ?? {};
    const svamp = pickMushrooms(s, p, tk.tx, tk.ty, dtSec * lf, got);
    if (svamp) { if (live) { tk.items ??= {}; tk.items.svamp = (tk.items.svamp ?? 0) + svamp; } else addFood(s, 'svamp', svamp); }
    if (Object.keys(got).length) { if (live) { tk.items ??= {}; for (const k in got) tk.items[k] = (tk.items[k] ?? 0) + got[k]; } else addItems(s, got); }
  }
  const sk = d.arbete!;
  const before = p.skill[sk];
  p.skill[sk] = clamp(p.skill[sk] + dtSec * lf / 3600 * 0.12 * learn * (0.4 + stat(p, 'intelligens', now) / 20) * (1 - p.skill[sk] / 21), 0, 20);
  if (before < 16 && p.skill[sk] >= 16) {
    const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = !s.people.some(q => q.fame.includes(title));
    p.fame.push(title); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
    sedEvent(s, 'nyfikenhet', first ? 0.06 : 0.01, first ? `${p.name} blev byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}. Byn ser vad kunskap kan ge.` : undefined);
  }
  if (live) {
    // arbetet sker i korta turer: efter några fynd, en fångst eller när bördan är full bärs det hem, sedan fortsätter man
    const full = load(tk) >= capacity(s, p) * WORK_LOAD, has = tk.carry > 0 || !!tk.items;
    if (full || (tk.lim !== undefined && (tk.fynd ?? 0) >= tk.lim) || (tk.act === 'fiske' && tk.carry > 0)) {
      if (has && tk.until > now + 2 * 60 * SEC) { tk.res = { x: tk.tx, y: tk.ty, until: tk.until }; tk.until = now; }
      else if (has && full) tk.until = now;
      else tk.fynd = 0;
    }
  }
}

// bygge: lägg det man bär på bygget och arbeta. När rutan är klar, eller materialet tagit slut, tas nästa ruta
function buildStep(s: State, p: Person, tk: Task, dtSec: number, live: boolean) {
  const b = bitById(s, tk.ref);
  if (!b) { tk.until = s.now; return; }
  const k = MATERIAL[b.m].item;
  if (tk.items && k && tk.items[k]) { deliverBit(b, tk.items[k], b.b >= 1); delete tk.items[k]; if (!Object.keys(tk.items).length) tk.items = undefined; }
  const done = b.b >= 1 && b.lp === undefined && b.c >= 0.5;
  if (!done && !lacks(b) && !workOn(s, p, b, dtSec)) return;
  const j = buildJob(s, p);
  if (!j || j.missing || j.fell || !startBuild(s, p, tk, j, live)) tk.until = s.now; // ett träd i vägen: välj på nytt
}
// sätt upp nästa bit av bygget: i levande läge går man först till lagret om det behövs material
function startBuild(s: State, p: Person, tk: Task, j: Job, live: boolean) {
  const site = siteOf(s, j.bit);
  tk.ref = j.bit.id; tk.tool = j.repair ? 'laga' : j.bit.k === 'golv' ? 'golv' : 'vagg';
  if (live) {
    tk.phase = 'go';
    if (j.need > 0) { const f = fetchSpot(s, j.item!); tk.tx = f.x; tk.ty = f.y; tk.site = site; } else { tk.tx = site.x; tk.ty = site.y; }
    return true;
  }
  if (!takeFor(s, j)) return false;
  p.x = site.x; p.y = site.y; tk.tx = site.x; tk.ty = site.y;
  return true;
}

export function serialize(s: State) {
  packGround(s); packFynd(s);
  return JSON.stringify(s, (_k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v));
}

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
