import { campCenter, campDist, campKey } from './plats';
import { foodDays } from './ekonomi';
import { ACTS, WORK, isWork } from './handlingar';
import { canLight, emberOn, heatAt, fireWant, needStones, needTinder, woodDays } from './eld';
import { ageOf, living, stat } from './folk';
import { HAND_FISH, Kind, SPEAR_FISH, flintSpot, shoreOf, wantsFlint } from './fynd';
import { coldOf, temperature } from './vader';
import { KANIN, SLAKT_TIMME, canSlaughter, freeBaskets, freeRod, freeSpear, freeSpears, sharpTool, spearKind, vilt, wantsBasket, wantsKnife, wantsRod, wantsRope, wantsSpear } from './redskap';
import { areaOf, flintArea, pickSpot, prospectFor } from './minne';
import { getMap } from './karta';
import { fetchSpot, haulJob } from './lager';
import { bedFor, buildJob, siteOf, takeFor } from './bygg';
import { beds, bitAt, blocked, freeNear, roomAt, shelterOf } from './byggnad';
import { groundOf, isForest, tread } from './mark';
import { FALL_TID, axeTask } from './skog';
import { duty, dygn, habitShare, habitTotal } from './seder';
import { clamp, rnd } from './slump';
import { ageIndex, isLight } from './tid';
import { Act, DAY, H, HOUR, Person, SEC, Skill, State, T, W, inMap } from './typer';

// ---------- val av aktivitet ----------
// var en handling görs, efter platsen i handlingar.ts
function spotFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed);
  const f = m.fire, d = ACTS[act], plats = d.plats ?? 'skog';
  if (plats === 'elden') {
    for (let k = 0; ; k++) { // runt elden, men inte i en husvägg
      const ang = rnd(s) * Math.PI * 2, r = d.radie ?? 1.3 + rnd(s) * 0.9, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      if (k >= 11 || !blocked(s, x, y)) return k >= 11 ? freeNear(s, f.x + 0.5, f.y + 1.5) : { x, y };
    }
  }
  if (plats === 'kol') return { x: f.x + 0.5 + (rnd(s) - 0.5) * 0.6, y: f.y + 1.1 };
  if (plats === 'sang') { // i huset om det finns plats under tak, annars på marken en bit från elden
    // i huset om det är varmare där än vid elden
    const bed = bedFor(s, p), c = coldOf(temperature(s)), rum = bed && roomAt(s, bed.x, bed.y);
    if (bed && rum) {
      const inne = -c * (1 - shelterOf(s, rum, Math.min(living(s).length, rum.tiles.length)));
      const ute = heatAt(s, f.x + 0.5, f.y + 2.9) * 2 - c;
      if (c === 0 || inne >= Math.min(0, ute) - 0.02) return bed; // när det inte är kallt räcker värmen överallt
    }
    for (let k = 0; k < 12; k++) {
      const ang = (p.id * 2.399 + rnd(s) * 0.5) % (Math.PI * 2), r = 1.8 + rnd(s) * 1.2, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      if (inMap(x, y) && !blocked(s, x, y)) return { x, y };
    }
    return freeNear(s, f.x + 0.5, f.y + 2);
  }
  if (plats === 'lek') { // lekplatsen ligger söder om elden, men aldrig i vattnet
    for (let k = 0; k < 12; k++) {
      const x = f.x + (rnd(s) - 0.5) * 8, y = f.y + 3 + rnd(s) * 3;
      if (inMap(x, y) && !blocked(s, x, y)) return { x, y };
    }
    return freeNear(s, f.x + 0.5, f.y + 1.5);
  }
  // ute på marken: vid stranden, på ängen och i skogen, eller avsides (toa)
  const want = (t: number, x: number, y: number) => {
    if (bitAt(s, x, y)) return false; // inte i husen
    if (plats === 'strand') return shoreOf(s.seed)[y * W + x] === 1;
    if (plats === 'ang') return t === T.Gras || t === T.Skog;
    if (plats === 'avsides') return t === T.Gras || t === T.Skog || t === T.Sand;
    return isForest(s, y * W + x); // grenar och vilt finns i skogen
  };
  // arbetsplatser räknas från byns läger (eld och lagerplatser), inte bara från elden
  const cands: { x: number; y: number; d: number }[] = [], mid = campCenter(s);
  const min = plats === 'ang' || plats === 'avsides' ? 5 : 4, max = plats === 'avsides' ? 9 : Infinity;
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(mid.x + (rnd(s) - 0.5) * 34), y = Math.floor(mid.y + (rnd(s) - 0.5) * 26);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const d = campDist(s, x, y);
    if (d < min || d > max) continue;
    if (want(m.tiles[y * W + x], x, y)) cands.push({ x, y, d });
  }
  cands.sort((a, b) => a.d - b.d);
  // mat: gå dit det finns mest att hämta, inte för långt bort; annars en av de närmaste platserna
  const c = (d.resurs ? pickSpot(s, p, d.resurs, cands) : cands[Math.floor(rnd(s) * Math.min(6, cands.length))]) ?? nearestWanted(s, want) ?? { x: mid.x, y: mid.y };
  return { x: c.x + 0.5, y: c.y + 0.5 };
}

// ingen plats hittades i närheten: den närmaste rutan som passar, var den än ligger
function nearestWanted(s: State, want: (t: number, x: number, y: number) => boolean) {
  const m = getMap(s.seed);
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (!want(m.tiles[i], x, y)) continue;
    const d = campDist(s, x, y);
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
// en plats på land en bit bort åt ett slumpat håll
function walkSpot(s: State, far: number) {
  const f = campCenter(s);
  for (let k = 0; k < 20; k++) {
    const ang = rnd(s) * Math.PI * 2, r = far * (0.7 + rnd(s) * 0.3);
    const x = clamp(f.x + 0.5 + Math.cos(ang) * r, 0.5, W - 0.5), y = clamp(f.y + 0.5 + Math.sin(ang) * r, 0.5, H - 0.5);
    if (!blocked(s, x, y)) return { x, y };
  }
  return freeNear(s, f.x + 0.5, f.y + 3);
}
// badplatsen: stranden närmast byns läger. Sparas tills lägret ändras
const bathCache = new WeakMap<State, { key: string; v?: { x: number; y: number } }>();
export function bathSpot(s: State) {
  const key = `${campKey(s)},${s.byggV ?? 0}`; // ett nytt hus kan stå på stranden
  let c = bathCache.get(s);
  if (c?.key !== key) {
    const sh = shoreOf(s.seed);
    let best: { x: number; y: number } | undefined, bd = 15;
    for (let i = 0; i < W * H; i++) if (sh[i] && !bitAt(s, i % W, Math.floor(i / W))) { const x = i % W, y = Math.floor(i / W), d = campDist(s, x, y); if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; } }
    bathCache.set(s, c = { key, v: best });
  }
  return c.v;
}
// en plats på land vid vattnet, inte för långt från byns läger
export function strandSpot(s: State) {
  const sh = shoreOf(s.seed), ok: number[] = [];
  for (let i = 0; i < W * H; i++) if (sh[i] && campDist(s, i % W, Math.floor(i / W)) < 15 && !bitAt(s, i % W, Math.floor(i / W))) ok.push(i);
  if (!ok.length) return bathSpot(s);
  const i = ok[Math.floor(rnd(s) * ok.length)];
  return { x: i % W + 0.5, y: Math.floor(i / W) + 0.5 };
}
// Faror går före förbättringar. En korg eller ett spjut gör maten lättare att få tag i, men när kylan är en fara väntar
// sådant: tid och hö går då först till värmen. Inför och under istiden sparar man hö till det.
export function dangers(s: State) {
  const ppl = living(s), freezing = ppl.filter(q => q.warm < 0.4).length / (ppl.length || 1), ai = ageIndex(s);
  const cold = coldOf(temperature(s)) > 0 || freezing > 0.25;
  return { kyla: cold && !s.fire.lit && !emberOn(s), gras: ai === 0 || ai === 3 || cold ? 12 : 0, svalt: foodDays(s) < 1 };
}
// elden är släckt och kan inte tändas för att det saknas tändmaterial, och för få hämtar det
const tinderNeeded = (s: State) => !s.fire.lit && !emberOn(s) && !canLight(s) && needTinder(s) && living(s).filter(q => q.task?.act === 'samla').length < 3;
// det som väljs: handlingen, varför, hur länge, och var om det inte följer av handlingen
interface Val { act: Act; why: string; dur: number; spot?: { x: number; y: number }; ref?: number; tool?: string; site?: { x: number; y: number } }
const set = (v: Val, act: Act, why: string) => { v.act = act; v.why = why; return true; };
const MIN = 60 * SEC;

// Viljan i tre steg: 1. nöd, 2. grundbehov, 3. byns behov mot egen lust (på dagen) eller kvällen vid elden (på natten).
// Slumpen dras i samma ordning varje gång, så att levande läget och snabbläget blir lika
export function chooseTask(s: State, p: Person, live: boolean) {
  const a = ageOf(p, s.now), light = isLight(s.now), lazy = 1 - duty(s, p);
  const v: Val = { act: 'vila', why: '', dur: (20 + rnd(s) * 40) * MIN }; // 20–60 min
  if (!needs(s, p, v, a, lazy, light)) { if (light) day(s, p, v, a, lazy, live); else night(s, p, v, a); }
  if (v.act === 'toa') v.dur = (4 + rnd(s) * 4) * MIN;
  const sp0 = v.spot ?? spotFor(s, v.act, p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
  if (!live) { p.x = sp.x; p.y = sp.y; tread(s, sp.x, sp.y, isWork(v.act) ? 2 : 1); }
  p.task = { act: v.act, phase: live ? 'go' : 'do', tx: sp.x, ty: sp.y, until: s.now + v.dur, carry: 0, why: v.why, dark: !light, ref: v.ref, tool: v.tool, site: v.site };
}

// 1–2. nöd (sjuk, svag, fryser farligt, måste på toa genast) och grundbehov (toa, värme, vila).
// En lat person tillgodoser grundbehoven tidigare än en flitig. true = något valdes
function needs(s: State, p: Person, v: Val, a: number, lazy: number, light: boolean) {
  const lit = s.fire.lit, sick = p.sickUntil !== undefined && p.sickUntil > s.now;
  if (a < 3) return set(v, 'sova', 'Är ett litet barn');
  if (p.toa < 0.12) return set(v, 'toa', 'Måste gå på toa genast');
  if (sick) return set(v, 'sova', 'Är sjuk');
  if (p.health < 0.4) return set(v, 'sova', 'Är för svag för att orka något');
  if (p.warm < 0.25 && lit) return set(v, 'varma', 'Fryser farligt');
  // elden går inte att tända för att tändmaterial saknas: den som fryser men orkar hämtar det i stället för att gå in.
  // Kylan är faran och elden det enda som hjälper mot den (några räcker; de andra går in och väntar)
  if (p.warm < 0.4 + 0.15 * lazy && a >= 14 && tinderNeeded(s)) return set(v, 'samla', 'Fryser, men utan tändmaterial blir det ingen eld');
  if (p.warm < 0.25 && beds(s).length) return set(v, 'vila', 'Fryser farligt och går in i huset');
  if (!light && a > 68 && rnd(s) < 0.6) return set(v, 'sova', 'Är gammal och sover på natten');
  if (p.toa < 0.25 + 0.1 * lazy) return set(v, 'toa', 'Behöver gå på toa');
  if (p.warm < 0.4 + 0.15 * lazy && lit) return set(v, 'varma', 'Fryser');
  if (p.warm < 0.4 + 0.15 * lazy && beds(s).length) return set(v, 'vila', 'Fryser och går in i huset');
  if (p.rest < (light ? 0.15 : 0.12) + 0.2 * lazy) return set(v, 'vila', 'Är trött');
  return false;
}

// 3. på dagen: byns behov mot egen lust, vägda med pliktkänslan
function day(s: State, p: Person, v: Val, a: number, lazy: number, live: boolean) {
  const now = s.now, sd = s.seder.v;
  let gt: ReturnType<typeof haulJob>;
  if (a < 8) { set(v, 'leka', 'Är barn och leker'); return; }
  if (s.stackar?.length && rnd(s) < 0.25 && (gt = haulJob(s))) { set(v, 'bara', gt.why); v.spot = gt; v.dur = 3 * HOUR; return; }
  if (a >= 14 && canSlaughter(s, p) && rnd(s) < 0.5) { slaughterTask(s, v, 'Det finns vilt att slakta innan det blir dåligt'); return; }
  const fd = foodDays(s), wd = woodDays(s), ai = ageIndex(s), tot = habitTotal(p);
  let { best, bs, burg } = bestWork(s, p, fd, wd, ai, tot);
  // bygget: väger mer ju fler som saknar sovplats under tak, inför och under istiden, när en vägg behöver lagas och när huset inte är klart
  const job = buildJob(s, p), ppl = living(s);
  let build = false;
  if (job) {
    const homeless = Math.max(0, ppl.length - beds(s).length) / (ppl.length || 1);
    const halvt = !job.repair && !s.hus?.find(h => h.id === job.bit.hus)?.klar; // ett påbörjat hus vill man göra klart, även när det sista är ett hörn
    const col = ((job.repair ? 1.2 : halvt ? 2 : 0.5) + 2.4 * homeless) * (ai === 3 || ai === 0 ? 1.4 : 1);
    const like = (4 + p.skill.hantverk + stat(p, 'flit', now) / 3) * (1 + 2 * habitShare(p, ['bygga'], tot));
    const sc = col * like * (0.6 + rnd(s) * 0.8);
    burg = Math.max(burg, col);
    if (sc > bs) { build = true; if (job.missing) best = job.item === 'torrgras' ? 'samla' : 'ved'; }
  }
  const u = clamp(burg / 3, 0, 1); // hur akut byn behöver arbete
  const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
  const what = build && job!.missing ? `Bygget behöver ${job!.item === 'torrgras' ? 'hö' : job!.item === 'ved' ? 'trä' : 'grenar'}` : best === 'ved' ? `Byn behöver trä, förrådet räcker ${dygn(wd)}` : best === 'samla' && needTinder(s) ? 'Byn behöver tändmaterial till elden' : `Byn behöver mat, förrådet räcker ${dygn(fd)}`;
  let works = false;
  if (a >= 12 && (s.fire.ash ?? 0) >= 1 && !s.fire.lit && !emberOn(s) && fireWant(s) < 0.6 && rnd(s) < 0.2 && !ppl.some(q => q.task?.act === 'kol')) {
    set(v, 'kol', 'Det ligger kol kvar i den slocknade elden');
    v.dur = 10 * MIN;
  } else if (a < 14) {
    if (rnd(s) < 0.45 + 0.2 * sd.barn) set(v, 'leka', 'Är barn och leker');
    else set(v, best, `Hjälper till. ${what}.`);
  } else if ((works = rnd(s) < (1 - lazy) * (0.88 + 0.12 * u) + lazy * sat * (0.6 + 0.4 * u)) && build && !job!.missing) {
    building(s, v, job!, ppl.length, live);
  } else if (works) {
    set(v, best, what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [best], tot) > 0.25 ? '. Brukar göra det.' : p.skill[best as Skill] > 10 ? '. Skicklig på det.' : '.'));
    v.dur = (60 + rnd(s) * 120) * MIN;
    withTools(s, p, v, best, what);
    if (build && job!.missing && job!.item === 'ved' && v.act === 'falla') { v.ref = job!.bit.hus; v.why = `${v.why} Stocken ska bli en vägg.`; } // trädet fälls för bygget
  } else leisure(s, p, v, u, lazy, ai);
}

// det arbete byn behöver mest just nu, vägt mot egen lust och vana. burg = hur mycket det mest behövda behövs
function bestWork(s: State, p: Person, fd: number, wd: number, ai: number, tot: number) {
  const fs = 1 + 0.25 * s.seder.v.forsiktighet; // en försiktig by vill ha större förråd
  const wFood = clamp(3.2 - fd / (2.5 * fs), 0.4, 3.5);
  const wWood = clamp(3.2 - wd / (2 * fs), 0.15, 3.5) * (ai === 3 || ai === 0 ? 1.3 : 1); // inför och under istiden väger veden tyngre
  const spearReady = freeSpears(s, p) > 0 || freeRod(s, p) || wantsSpear(s, p) || wantsRod(s, p); // spjut eller metspö finns eller kan göras
  let best: Act = 'samla', bs = -1, burg = 0;
  for (const w of WORK) {
    const need = w === 'ved' ? wWood : wFood;
    const tinder = w === 'samla' && needTinder(s);
    // nytta för byn; maten väger också in hur mycket platserna ger just nu och att fiske med händerna ger lite
    const yieldF = w === 'ved' || tinder ? 1 : clamp(prospectFor(s, p, w as Kind), 0.05, 1.3) * (w === 'fiske' ? HAND_FISH * (spearReady ? SPEAR_FISH : 1) : 1);
    const season = ACTS[w].sasong![ai];
    const col = need * (w === 'ved' ? 1 : tinder ? Math.max(0.8, season) * 3 : season * yieldF);
    const like = (4 + p.skill[w as Skill] + stat(p, ACTS[w].egenskap!, s.now) / 3) * (1 + 2 * habitShare(p, [w], tot)); // egen lust och vana
    const sc = col * like * (0.6 + rnd(s) * 0.8);
    burg = Math.max(burg, col);
    if (sc > bs) { bs = sc; best = w; }
  }
  return { best, bs, burg };
}

// att bygga eller laga en del av ett hus. Saknas material hämtar man det först (i snabbläget tas det direkt)
function building(s: State, v: Val, job: NonNullable<ReturnType<typeof buildJob>>, pop: number, live: boolean) {
  const b = job.bit, hus = s.hus?.find(h => h.id === b.hus)?.namn.toLowerCase() ?? 'huset';
  if (job.fell) { // först fälls träden där huset ska stå
    set(v, 'falla', `Fäller ett träd där ${hus} ska stå.`);
    v.dur = FALL_TID * Math.max(0.5, groundOf(s).trees[b.y * W + b.x]); v.spot = { x: b.x + 0.5, y: b.y + 0.5 }; // ett litet träd fälls fortare
    return;
  }
  set(v, 'bygga', job.repair ? `En vägg i ${hus} är sliten och behöver lagas.` : `${b.k === 'golv' ? 'Lägger golv i' : 'Bygger på'} ${hus}. ${beds(s).length < pop ? 'Alla har inte en sovplats under tak.' : ''}`.trim());
  v.tool = job.repair ? 'laga' : b.k === 'golv' ? 'golv' : 'vagg'; v.ref = b.id;
  v.dur = (60 + rnd(s) * 90) * MIN;
  if (live) { const site = siteOf(s, b); v.spot = job.need > 0 ? fetchSpot(s, job.item!) : site; if (job.need > 0) v.site = site; }
  else if (takeFor(s, job)) v.spot = siteOf(s, b);
  else set(v, 'vila', 'Det saknas material till bygget');
}

// arbetet med redskap: flinta letas vid stenarna, yxan fäller träd, korgen och spjutet görs först om de saknas
function withTools(s: State, p: Person, v: Val, best: Act, what: string) {
  const stones = needStones(s);
  if (best === 'samla' && (wantsFlint(s) || stones) && rnd(s) < 0.5) { // byn saknar flinta eller stenar till eldringen
    const fa = flintArea(p), fl = (fa !== undefined && flintSpot(s, (x, y) => areaOf(x, y) === fa)) || flintSpot(s);
    if (fl) { v.spot = fl; v.why = `${v.why} Letar efter ${stones ? 'stenar till en eldring' : 'flinta'} vid stenarna${fa !== undefined ? ' där hen vet att det finns flinta' : ''}.`; }
  }
  const ax = best === 'ved' ? axeTask(s, p) : undefined; // med yxa fälls träd och huggs ved
  if (ax) {
    set(v, ax.act, `${what}. ${ax.why}.`);
    if (ax.dur) v.dur = ax.dur;
    if (ax.act !== 'yxa') v.spot = { x: ax.x, y: ax.y };
    v.ref = ax.ref;
  }
  const { kyla, gras } = dangers(s);
  if (v.act === 'samla') { // med korg om det finns en ledig, annars flätar den som kan en först
    if (freeBaskets(s, p) > 0) { v.tool = 'korg'; v.why = v.why.replace(/\.$/, '') + '. Tar en korg.'; }
    else if (!kyla && (s.items.torrgras ?? 0) >= gras && wantsBasket(s, p)) { set(v, 'korg', `${what}. Flätar en korg av hö.`); v.dur = 40 * MIN; }
  }
  const sp = v.act === 'fiske' || v.act === 'jakt' ? freeSpear(s, p) : undefined;
  if (v.act === 'fiske') { // med metspö eller spjut om det finns ett ledigt, annars gör hen ett först
    if (freeRod(s, p)) { v.tool = 'metspo'; v.why = v.why.replace(/\.$/, '') + '. Tar ett metspö och gräver fram mask.'; }
    else if (!kyla && wantsRod(s, p)) { set(v, 'metspo', `${what}. Gör ett metspö med en krok av ben.`); v.dur = 60 * MIN; }
    else if (sp) { v.tool = sp; v.why = v.why.replace(/\.$/, '') + `. Tar ett ${sp === 'flintspjut' ? 'flintspjut' : 'träspjut'}.`; }
    else if (!kyla && wantsSpear(s, p)) makeSpearTask(s, p, v, what);
  } else if (v.act === 'jakt') { // jakten går bättre med spjut
    if (sp) { v.tool = sp; v.why = v.why.replace(/\.$/, '') + `. Tar ett ${sp === 'flintspjut' ? 'flintspjut' : 'träspjut'}.`; }
    else if (!kyla && wantsSpear(s, p)) makeSpearTask(s, p, v, what);
  }
}
function makeSpearTask(s: State, p: Person, v: Val, what: string) {
  if (spearKind(s, p) === 'flintspjut') { set(v, 'spjut', `${what}. Gör ett flintspjut med flinta och rep.`); v.tool = 'flintspjut'; v.dur = 60 * MIN; }
  else { set(v, 'spjut', `${what}. Täljer ett träspjut med ${sharpTool(s) === 'yxa' ? 'yxan' : 'en flintsten'}.`); v.dur = 40 * MIN; }
}
// slakta det fällda viltet vid elden, så länge det tar
function slaughterTask(s: State, v: Val, why: string) {
  set(v, 'slakta', why);
  v.dur = Math.min(2 * HOUR, (vilt(s) / KANIN / SLAKT_TIMME) * HOUR + 5 * MIN);
}
// handarbete vid elden: den som kan göra en kniv gör det när byn saknar en, den som har kniv slaktar viltet, och den
// som kan tvinna rep gör det när byn behöver rep
function craft(s: State, p: Person, v: Val, why: string) {
  if (wantsKnife(s, p)) { set(v, 'kniv', `${why}. Gör en flintkniv.`); v.dur = 40 * MIN; return; }
  if (canSlaughter(s, p)) { slaughterTask(s, v, `${why}. Slaktar viltet med kniven.`); return; }
  set(v, 'hantverk', why);
  if (wantsRope(s, p)) { v.tool = 'rep'; v.why = `${why}. Tvinnar rep av hö.`; }
}

// egen lust: vila, hantverk, umgänge, promenad, bad eller att sitta vid stranden. u = hur akut byn behöver arbete
function leisure(s: State, p: Person, v: Val, u: number, lazy: number, ai: number) {
  const now = s.now;
  const wv = (1 - p.rest) * 2 + lazy * 0.6;
  const wh = (p.skill.hantverk / 10 + p.pot.flit / 20) * (u < 0.25 ? 1.5 : 0.6);
  const wsoc = (1 - p.social) * 2;
  // promenad: den nyfikne går gärna ut och ser sig omkring. Bad: när det är varmt i vattnet
  const calm = u < 0.5 ? 1 : 0.3, temp = temperature(s), shore = bathSpot(s);
  const wp = (0.3 + stat(p, 'nyfikenhet', now) / 15) * calm;
  const wb = temp >= 15 && shore ? clamp((temp - 14) / 8, 0, 1.2) * calm : 0;
  // sitta vid stranden och se ut över vattnet: lugnt, året om, mest för den som inte är så sällskaplig
  const ws = shore ? (0.2 + (20 - stat(p, 'vanlighet', now)) / 60) * calm : 0;
  const r = rnd(s) * (wv + wh + wsoc + wp + wb + ws);
  if (r < wv) set(v, 'vila', lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus');
  else if (r < wv + wh) craft(s, p, v, u < 0.25 ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete');
  else if (r < wv + wh + wsoc) set(v, 'samtal', 'Vill umgås');
  else if (r < wv + wh + wsoc + wp) {
    // nyfikna och modiga går längre bort
    const far = 4 + (stat(p, 'nyfikenhet', now) + stat(p, 'mod', now)) / 40 * 14;
    set(v, 'promenad', far > 12 ? 'Är nyfiken och vill se vad som finns längre bort' : 'Vill sträcka på benen');
    v.spot = walkSpot(s, far); v.dur = (60 + rnd(s) * 90) * MIN;
  } else if (r < wv + wh + wsoc + wp + wb) { set(v, 'bada', `Det är varmt (${Math.round(temp)} grader) och skönt att bada`); v.spot = shore; v.dur = (30 + rnd(s) * 30) * MIN; }
  else { set(v, 'strand', ai === 0 ? 'Vill se ut över isen en stund' : 'Vill sitta vid vattnet och se ut över sjön'); v.spot = strandSpot(s); v.dur = (30 + rnd(s) * 60) * MIN; }
}

// på natten: en vakt, och de andra håller sig vid elden och berättar, gör handarbete, umgås eller sover
function night(s: State, p: Person, v: Val, a: number) {
  const now = s.now;
  const guardDay = Math.floor((now - s.founded - 7 * HOUR) / DAY);
  const adults = living(s).filter(q => ageOf(q, now) >= 16 && ageOf(q, now) < 60);
  if (guardDay !== s.lastGuardDay && adults.length) {
    // välj nattens vakt (modigast med lite slump), byts varje natt
    s.lastGuardDay = guardDay;
    const g = adults.sort((x, y) => (y.pot.mod + rnd(s) * 8) - (x.pot.mod + rnd(s) * 8))[0];
    g.task = undefined; g.guardDay = guardDay;
  }
  if (p.guardDay === guardDay && a >= 16) { set(v, 'vakt', 'Håller vakt i natt'); return; }
  const r = rnd(s);
  const story = (p.skill.berattande + (a > 50 ? 6 : 0)) / 40;
  const craftW = (p.skill.hantverk + stat(p, 'flit', now)) / 70;
  // på natten håller man sig vid lägret; de modiga går lite längre ut i mörkret för att bära in saker
  const near = 2 + stat(p, 'mod', now) / 20 * 8, gt = a >= 12 && r < 0.35 && s.stackar?.length ? haulJob(s, near) : undefined;
  if (gt) { set(v, 'bara', `Mörkt, ${near > 6 ? 'men är modig och ' : ''}${gt.why[0].toLowerCase()}${gt.why.slice(1)}`); v.spot = gt; v.dur = 2 * HOUR; }
  else if (a < 8) { if (r < 0.6) set(v, 'samtal', 'Mörkt, sitter med de vuxna vid elden'); else set(v, 'sova', 'Barn sover på natten'); }
  else if (r < story) set(v, 'beratta', 'Mörkt, berättar för de andra vid elden');
  else if (r < story + craftW) craft(s, p, v, 'Mörkt, gör handarbete vid elden');
  else if (r < 0.9) set(v, 'samtal', 'Mörkt, umgås vid elden');
  else set(v, 'vila', 'Mörkt, vilar vid elden');
}
