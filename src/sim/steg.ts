import { foodDays, workRate } from './ekonomi';
import { GIFT, TRY_SEC, eatPoison, growFynd, handFish, newCrop, packFynd, pickMushrooms, richness, takeFrom } from './fynd';
import { COLD, addFuel, addItems, canLight, fireWant, forageItems, fuelStock, hearthOf, heatAt, igniterOf, stepFire, takeCoal, takeFuel, tryLight } from './eld';
import { ageOf, alive, living, log, stat, think } from './folk';
import { getMap } from './karta';
import { birth, die, emigrate } from './liv';
import { WEAR, groundOf, growGround, packGround, tileOf } from './mark';
import { FLIP, SOCIAL, TalkEvent, converse } from './samtal';
import { HABIT_FADE, sedEvent, stepSeder, updateTags } from './seder';
import { fearPlace, forget, lookAround } from './minne';
import { chance, clamp, rnd } from './slump';
import { ageIndex, isLight } from './tid';
import { chopStock, fellTree, makeAxe } from './skog';
import { AXE_WORK, Act, DAY, HOUR, Person, SEC, SKILL_NAMES, Skill, State, T, W, isWork } from './typer';
import { findPath, speedAt, wear } from './vag';
import { chooseTask } from './val';

// ---------- huvudsteg ----------
// dt i sekunder. live=true: personer går och bär; live=false: grovt steg (ikappräkning/snabbspolning)
export function step(s: State, dtSec: number, live: boolean, events?: TalkEvent[]) {
  s.now += dtSec * SEC;
  const now = s.now;
  const ai = ageIndex(s);
  if (ai !== s.lastAgeIdx) {
    s.lastAgeIdx = ai;
    const msg = ['Istiden har börjat. Sjön fryser och maten blir knapp.', 'Vårtiden har kommit. Isen släpper och marken tinar.', 'Sommartiden är här. Bär och fisk finns i överflöd.', 'Hösttiden har börjat. Nu gäller det att samla inför istiden.'][ai];
    log(s, msg, 'world');
    newCrop(s, ai);
  }
  const ppl = living(s);
  const light = isLight(now);
  // förråd: ruttning och ved
  const rot = Math.exp(-0.003 * (1 + s.food / 250) / 3600 * dtSec * (ai === 0 ? 0.5 : 1));
  s.food = Math.max(0, s.food * rot);
  if (s.items[GIFT]) s.items[GIFT] *= rot;
  stepFire(s, dtSec, live, ppl);
  const fh = hearthOf(s.fire), coldRate = COLD[ai][light ? 0 : 1];
  const learn = 1 + 0.1 * s.seder.v.nyfikenhet; // en nyfiken by lär sig snabbare
  if (Math.floor(now / HOUR) !== Math.floor((now - dtSec * SEC) / HOUR)) {
    stepSeder(s); updateTags(s);
    growGround(s, 1, ai); growFynd(s, 1, ai); forget(s, 1);
  }

  const social: Person[] = [];
  for (const p of ppl) {
    const a = ageOf(p, now);
    // behov
    p.hunger = clamp(p.hunger - dtSec / (16 * 3600) * (a < 10 ? 0.7 : 1), 0, 1);
    const working = p.task && isWork(p.task.act) && p.task.phase === 'do';
    const resting = p.task && (p.task.act === 'vila' || p.task.act === 'sova' || p.task.act === 'samtal' || p.task.act === 'hantverk' || p.task.act === 'varma');
    p.rest = clamp(p.rest + dtSec / 3600 * (resting ? 0.09 : working ? -0.06 : -0.03), 0, 1);
    // värme: elden värmer i ett område, hyddan skyddar mot halva kylan
    const heat = heatAt(s, p.x, p.y);
    const inHut = p.task?.phase === 'do' && (p.task.act === 'sova' || p.task.act === 'vila');
    p.warm = clamp(p.warm + dtSec / 3600 * (heat * 2 - coldRate * (inHut ? 0.5 : 1) + (coldRate === 0 ? 0.5 : 0)), 0, 1);
    if (heat > 0.15) {
      think(p, 'Värms av elden', fh.comfort, now, HOUR);
      p.rest = clamp(p.rest + dtSec / 3600 * fh.comfort * heat, 0, 1); // avslappning vid elden
    }
    if (p.warm < 0.35) think(p, 'Fryser', -0.12, now, HOUR);
    p.social = clamp(p.social - dtSec / (18 * 3600), 0, 1);
    // toa: behovet växer på ungefär sju timmar, långsammare i sömnen
    p.toa = clamp(p.toa - dtSec / (7 * 3600) * (p.task?.act === 'sova' ? 0.5 : 1), 0, 1);
    if (p.toa <= 0) { p.toa = 1; if (a >= 3) think(p, 'Kissade på sig', -0.12, now, 4 * HOUR); }
    if (p.hunger < 0.45 && s.food >= 0.3) { // en hel portion, eller det som finns kvar
      const full = a < 10 ? 0.6 : 1, portion = Math.min(full, s.food);
      s.food -= portion; p.hunger = clamp(p.hunger + 0.55 * portion / full, 0, 1); eatPoison(s, p);
    }
    // hälsa
    if (p.hunger <= 0) { p.health -= dtSec / (5 * 3600); if (rnd(s) < dtSec / 7200) think(p, 'Svälter', -0.25, now, 3 * HOUR); }
    else if (p.warm < 0.12) p.health -= dtSec / (20 * 3600);
    else if (p.hunger > 0.3 && !(p.sickUntil && p.sickUntil > now)) p.health = clamp(p.health + dtSec / (10 * 3600), 0, 1);
    if (p.sickUntil && p.sickUntil > now) p.health -= dtSec / (40 * 3600);
    if (!p.sickUntil || p.sickUntil < now) {
      if (chance(s, (ai === 0 ? 0.12 : 0.05) / 86400, dtSec)) { const dur = (3 + rnd(s) * 8) * HOUR; p.sickUntil = now + dur; if (dur > 8 * HOUR) log(s, `${p.name} blev svårt sjuk.`, 'world', [p.id]); }
    }
    if (p.health <= 0) { die(s, p, p.hunger <= 0 ? 'av svält' : p.warm < 0.12 ? 'av kyla' : (p.poisonUntil ?? 0) > now ? 'av svampförgiftning' : 'av sjukdom'); continue; }
    // ålderdom och olyckor (Gompertz, per år = per dygn)
    const q = 0.0015 + 0.00004 * Math.exp(0.105 * a) + (a < 5 ? 0.02 : 0);
    if (chance(s, q / 86400, dtSec)) { die(s, p, a > 55 ? 'av ålderdom' : a < 5 ? 'av en barnsjukdom' : 'i en olycka'); if (a >= 5 && a <= 55) fearPlace(s, p, 'i en olycka'); continue; }
    if (p.task && (p.task.act === 'jakt') && p.task.phase === 'do' && chance(s, 0.0008 * (1 - p.skill.jakt / 25) / 3600, dtSec)) { die(s, p, 'under en jakt'); fearPlace(s, p, 'under en jakt'); continue; }
    // graviditet
    if (p.pregnantSince !== undefined) { if (now - p.pregnantSince > 0.75 * DAY) birth(s, p); }
    else if (p.sex === 'k' && p.partner !== undefined && a >= 17 && a <= 43 && (!p.lastBirth || now - p.lastBirth > 1.6 * DAY)) {
      const pop = ppl.length;
      const f = (pop >= 26 ? 0.15 : 1) * clamp(foodDays(s) / 4, 0.15, 1) * (1 + 0.2 * s.seder.v.barn);
      if (chance(s, 0.3 * f / 86400, dtSec)) { p.pregnantSince = now; (p as any)._by = p.partner; }
    }
    // uppgift
    const t = p.task;
    const phaseFlip = t && t.dark !== !light && FLIP.includes(t.act); // dag blev natt eller tvärtom
    // ett träd som fällts färdigt eller en yxa som gjorts klar
    if (t && t.phase === 'do' && t.until < now) { if (t.act === 'falla') fellTree(s, p, t.tx, t.ty); else if (t.act === 'yxa') makeAxe(s, p); }
    const lightDone = t?.act === 'tanda' && (s.fire.lit || !canLight(s));
    const mustGo = t && p.toa < 0.08 && t.act !== 'toa' && a >= 3; // nöden avbryter det man håller på med
    if (!t || (t.until < now && t.phase !== 'back') || ((phaseFlip || mustGo) && t.phase !== 'back') || lightDone) {
      if (t && (t.carry > 0 || t.items) && t.act !== 'elda' && live) { t.phase = 'back'; const m = getMap(s.seed); t.tx = m.stock.x + 0.5 + rnd(s) * 1.5; t.ty = m.stock.y + 0.5 + rnd(s); }
      else chooseTask(s, p, live);
    }
    const tk = p.task!;
    if (live) {
      if (tk.phase === 'go' || tk.phase === 'back') {
        // vägsökning: gå ruta för ruta runt vatten, gärna längs stigar
        const g = groundOf(s);
        const key = `${tk.tx.toFixed(2)},${tk.ty.toFixed(2)}`;
        if (tk.pk !== key) { tk.pk = key; tk.path = findPath(g, p.x, p.y, tk.tx, tk.ty) ?? []; }
        const off = (((p.id * 37) % 7) - 3) * 0.06; // var och en går lite vid sidan av, så att de inte täcker varandra
        let budget = (a < 6 ? 0.9 : a > 65 ? 1 : 1.6) * dtSec;
        while (tk.path && tk.path.length && budget > 0) {
          const i = tk.path[0], wx = (i % W) + 0.5 + off, wy = Math.floor(i / W) + 0.5 - off;
          const ci = tileOf(p.x, p.y), sp = speedAt(g, ci) || 1;
          const dx = wx - p.x, dy = wy - p.y, d = Math.hypot(dx, dy), can = budget * sp;
          const mv = Math.min(d, can);
          wear(g, ci, WEAR * mv);
          if (d <= can) { p.x = wx; p.y = wy; tk.path.shift(); budget -= d / sp; }
          else { p.x += dx / d * can; p.y += dy / d * can; budget = 0; }
        }
        const ci = tileOf(p.x, p.y), spd = speedAt(g, ci) || 1;
        const dx = tk.tx - p.x, dy = tk.ty - p.y, d = Math.hypot(dx, dy);
        const sp = budget * spd;
        if (budget <= 0) { /* väntar på nästa steg */ }
        else if (d <= sp) {
          tk.path = undefined; tk.pk = undefined;
          p.x = tk.tx; p.y = tk.ty;
          if (tk.act === 'elda') {
            if (tk.phase === 'go') {
              // vid förrådet: ta en famn ved och gå till elden
              const m = getMap(s.seed), n = s.fire.fuel >= fireWant(s) ? 0 : Math.min(3, Math.max(1, fireWant(s) - s.fire.fuel), fuelStock(s));
              if (n <= 0) p.task = undefined;
              else { tk.carry = takeFuel(s, n); tk.phase = 'back'; tk.tx = m.fire.x + 0.5 + (rnd(s) - 0.5) * 1.2; tk.ty = m.fire.y + 1.2; }
            } else { addFuel(s, p, tk.carry); tk.carry = 0; p.task = undefined; }
          } else if (tk.phase === 'back') {
            deliver(s, tk.act, tk.carry);
            if (tk.items) addItems(s, tk.items);
            tk.carry = 0; p.task = undefined;
          } else tk.phase = 'do';
        } else { wear(g, ci, WEAR * sp); p.x += dx / d * sp; p.y += dy / d * sp; }
      } else if (tk.act !== 'sova' && tk.act !== 'vakt' && tk.act !== 'hantverk') {
        // småjustering så att de rör sig lite
        if (rnd(s) < dtSec * 0.08) { const nx = p.x + (rnd(s) - 0.5) * 0.4, ny = p.y + (rnd(s) - 0.5) * 0.4; if (getMap(s.seed).tiles[tileOf(nx, ny)] !== T.Vatten) { p.x = nx; p.y = ny; } }
      }
    }
    if (tk.phase === 'do' && tk.act === 'toa') p.toa = 1;
    if (tk.phase === 'do' && tk.act === 'kol') takeCoal(s, p, 'hämtade');
    // vana: tiden räknas mot yrkestaggar
    const hf = Math.exp(-dtSec * SEC / HABIT_FADE);
    for (const k in p.habit) p.habit[k] *= hf;
    p.habit[tk.act] = (p.habit[tk.act] ?? 0) + dtSec / 3600;
    if (tk.phase === 'do' && isWork(tk.act)) {
      const axe = AXE_WORK.includes(tk.act), base: Act = axe ? 'ved' : tk.act;
      // utan yxa samlas grenar på marken (två grenar på den tid det tar att hugga en ved); med yxa huggs ved ur en fälld stam
      // bär, rötter och vilt: platsen ger mindre ju mer som redan tagits där
      const rich = tk.act === 'samla' || tk.act === 'jakt' ? richness(s, tk.act, tk.tx, tk.ty) : 1;
      const y = workRate(s, p, base) * dtSec * (live ? 1 : 0.8) * (tk.act === 'ved' ? 2 : tk.act === 'hugga' ? 1.5 : tk.act === 'falla' || tk.act === 'fiske' ? 0 : rich);
      if (tk.act === 'samla' || tk.act === 'jakt') { takeFrom(s, tk.act, tk.tx, tk.ty, y); if (rich < 0.08) tk.until = now; } // tomt här: gå hem eller vidare
      // den som arbetar ser hur mycket som finns i området och minns det
      if ((tk.act === 'samla' || tk.act === 'jakt' || tk.act === 'fiske') && (rich < 0.08 || chance(s, 1 / 1800, dtSec))) lookAround(s, p, tk.tx, tk.ty);
      if (tk.act === 'fiske') {
        // fiske med händerna: ett försök i taget
        tk.prog = (tk.prog ?? 0) + dtSec;
        const ageF = (a < 14 ? 0.3 : a > 60 ? 0.6 : 1) * (p.sickUntil && p.sickUntil > now ? 0.3 : 1);
        let fish = 0;
        while (tk.prog >= TRY_SEC) { tk.prog -= TRY_SEC; fish += handFish(s, p, tk.tx, tk.ty, ageF); }
        if (fish) { if (live) tk.carry += fish; else deliver(s, 'fiske', fish); }
      }
      if (tk.act === 'hugga') {
        const got = chopStock(s, tk.ref, y);
        if (!got) tk.until = now; // stammen är slut
        else {
          if (live) { tk.carry += got.ved; tk.items ??= {}; tk.items.grenar = (tk.items.grenar ?? 0) + got.grenar; }
          else { s.wood += got.ved; addItems(s, { grenar: got.grenar }); }
          if (got.done) tk.until = now;
        }
      } else if (y > 0) { if (live) tk.carry += y; else deliver(s, tk.act, y); }
      if (tk.act === 'samla') {
        const got = forageItems(s, p, dtSec) ?? {};
        const svamp = pickMushrooms(s, p, tk.tx, tk.ty, dtSec, got);
        if (svamp) { if (live) tk.carry += svamp; else deliver(s, 'samla', svamp); }
        if (Object.keys(got).length) { if (live) { tk.items ??= {}; for (const k in got) tk.items[k] = (tk.items[k] ?? 0) + got[k]; } else addItems(s, got); }
      }
      const sk = base as Skill;
      const before = p.skill[sk];
      p.skill[sk] = clamp(p.skill[sk] + dtSec / 3600 * 0.12 * learn * (0.4 + stat(p, 'intelligens', now) / 20) * (1 - p.skill[sk] / 21), 0, 20);
      if (before < 16 && p.skill[sk] >= 16) {
        const title = `Mästare i ${SKILL_NAMES[sk].toLowerCase()}`, first = !s.people.some(q => q.fame.includes(title));
        p.fame.push(title); log(s, `${p.name} har blivit en mästare i ${SKILL_NAMES[sk].toLowerCase()}.`, 'skill', [p.id]);
        sedEvent(s, 'nyfikenhet', first ? 0.06 : 0.01, first ? `${p.name} blev byns första mästare i ${SKILL_NAMES[sk].toLowerCase()}. Byn ser vad kunskap kan ge.` : undefined);
      }
    }
    if (tk.phase === 'do' && tk.act === 'tanda' && canLight(s)) {
      s.fire.tryProg += dtSec;
      const per = igniterOf(s)!.minutes * 60;
      while (s.fire.tryProg >= per && canLight(s) && !s.fire.lit) { s.fire.tryProg -= per; if (tryLight(s, p)) { p.task = undefined; break; } }
    }
    if (tk.phase === 'do' && (tk.act === 'hantverk' || tk.act === 'yxa')) p.skill.hantverk = clamp(p.skill.hantverk + dtSec / 3600 * 0.1 * learn * (1 - p.skill.hantverk / 21), 0, 20);
    if (tk.phase === 'do' && SOCIAL.includes(tk.act)) social.push(p);
    p.thoughts = p.thoughts.filter(x => x.until > now);
  }
  // samtal: ca ett per 4 minuter per person i social aktivitet
  if (social.length > 1) {
    for (const p of social) {
      if (!alive(p)) continue;
      const expect = dtSec / 240 * (0.6 + stat(p, 'vanlighet', now) / 25);
      let n = Math.floor(expect); if (rnd(s) < expect - n) n++;
      const others = social.filter(q => q !== p && alive(q) && (!live || Math.hypot(q.x - p.x, q.y - p.y) < 4));
      for (let i = 0; i < n; i++) converse(s, p, others, live ? events : undefined);
    }
  }
  // relationer bleknar långsamt utan umgänge
  if (rnd(s) < dtSec / 600) {
    const k = Math.exp(-0.04 * (600 / 86400));
    for (const key in s.rels) { const r = s.rels[key]; r.op *= k; r.rom *= k; }
  }
  if (living(s).length > 30) emigrate(s);
  if (living(s).length === 0 && !s.log.some(l => l.text.startsWith('Byn är tom'))) log(s, 'Byn är tom. Ingen finns kvar vid elden.', 'world');
  for (const k in s.items) if (s.items[k] < 1e-6) delete s.items[k];
}

// det som bärs hem läggs i förrådet: grenar, ved eller mat
function deliver(s: State, act: Act, n: number) {
  if (act === 'ved') addItems(s, { grenar: n });
  else if (act === 'hugga') s.wood += n;
  else s.food += n;
}

export function serialize(s: State) {
  packGround(s); packFynd(s);
  return JSON.stringify(s, (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v));
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
