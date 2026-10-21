import { campCenter, campDist, campKey } from './plats';
import { foodDays } from './ekonomi';
import { ACTS, WORK, isWork } from './handlingar';
import { canLight, emberOn, heatAt, fireWant, needTinder, woodDays } from './eld';
import { ageOf, living, stat } from './folk';
import { HAND_FISH, Kind, SPEAR_FISH, flintSpot, shoreOf, wantsFlint } from './fynd';
import { coldOf, temperature } from './vader';
import { freeBaskets, freeSpears, sharpTool, wantsBasket, wantsSpear } from './redskap';
import { areaOf, flintArea, pickSpot, prospectFor } from './minne';
import { getMap } from './karta';
import { fetchSpot, haulJob } from './lager';
import { bedFor, buildJob, siteOf, takeFor } from './bygg';
import { beds, bitAt, blocked, freeNear, roomAt, shelterOf } from './byggnad';
import { isForest, tread } from './mark';
import { axeTask } from './skog';
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
// Viljan i tre steg:
// 1. Nöd: sjuk, svag, fryser farligt eller måste på toa genast. Inget annat räknas.
// 2. Grundbehov: toa, värme och vila. En lat person tillgodoser dem tidigare än en flitig.
// 3. Byns behov mot egen lust, vägda med pliktkänslan.
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
// sådant: tid och torrt gräs går då först till värmen. Inför och under istiden sparar man gräs till det.
export function dangers(s: State) {
  const ppl = living(s), freezing = ppl.filter(q => q.warm < 0.4).length / (ppl.length || 1), ai = ageIndex(s);
  const cold = coldOf(temperature(s)) > 0 || freezing > 0.25;
  return { kyla: cold && !s.fire.lit && !emberOn(s), gras: ai === 0 || ai === 3 || cold ? 12 : 0, svalt: foodDays(s) < 1 };
}
// elden är släckt och kan inte tändas för att det saknas tändmaterial, och för få hämtar det
const tinderNeeded = (s: State) => !s.fire.lit && !emberOn(s) && !canLight(s) && needTinder(s) && living(s).filter(q => q.task?.act === 'samla').length < 3;
export function chooseTask(s: State, p: Person, live: boolean) {
  const a = ageOf(p, s.now), now = s.now;
  const light = isLight(now);
  const sick = p.sickUntil !== undefined && p.sickUntil > now;
  const lazy = 1 - duty(s, p), lit = s.fire.lit, sd = s.seder.v;
  let act: Act, why: string, spot: { x: number; y: number } | undefined, ref: number | undefined, tool: string | undefined, siteNext: { x: number; y: number } | undefined;
  let dur = (20 + rnd(s) * 40) * 60 * SEC; // 20–60 min
  const set = (x: Act, w: string) => { act = x; why = w; };
  if (a < 3) set('sova', 'Är ett litet barn');
  else if (p.toa < 0.12) set('toa', 'Måste gå på toa genast');
  else if (sick) set('sova', 'Är sjuk');
  else if (p.health < 0.4) set('sova', 'Är för svag för att orka något');
  else if (p.warm < 0.25 && lit) set('varma', 'Fryser farligt');
  // elden går inte att tända för att tändmaterial saknas: den som fryser men orkar hämtar det i stället för att gå in.
  // Kylan är faran och elden det enda som hjälper mot den (några räcker; de andra går in och väntar)
  else if (p.warm < 0.4 + 0.15 * lazy && a >= 14 && tinderNeeded(s)) set('samla', 'Fryser, men utan tändmaterial blir det ingen eld');
  else if (p.warm < 0.25 && beds(s).length) set('vila', 'Fryser farligt och går in i huset');
  else if (!light && a > 68 && rnd(s) < 0.6) set('sova', 'Är gammal och sover på natten');
  else if (p.toa < 0.25 + 0.1 * lazy) set('toa', 'Behöver gå på toa');
  else if (p.warm < 0.4 + 0.15 * lazy && lit) set('varma', 'Fryser');
  else if (p.warm < 0.4 + 0.15 * lazy && beds(s).length) set('vila', 'Fryser och går in i huset');
  else if (p.rest < (light ? 0.15 : 0.12) + 0.2 * lazy) set('vila', 'Är trött');
  else if (light) {
    let gt: ReturnType<typeof haulJob>;
    if (a < 8) set('leka', 'Är barn och leker');
    else if (s.stackar?.length && rnd(s) < 0.25 && (gt = haulJob(s))) { set('bara', gt.why); spot = gt; dur = 3 * HOUR; }
    else {
      const fd = foodDays(s), wd = woodDays(s), ai = ageIndex(s);
      const fs = 1 + 0.25 * sd.forsiktighet; // en försiktig by vill ha större förråd
      const wFood = clamp(3.2 - fd / (2.5 * fs), 0.4, 3.5);
      const wWood = clamp(3.2 - wd / (2 * fs), 0.15, 3.5) * (ai === 3 || ai === 0 ? 1.3 : 1); // inför och under istiden väger veden tyngre
      const tot = habitTotal(p);
      const spearReady = freeSpears(s, p) > 0 || wantsSpear(s, p); // spjut finns eller kan täljas
      let best: Act = 'samla', bs = -1, burg = 0;
      for (const w of WORK) {
        const need = w === 'ved' ? wWood : wFood;
        const tinder = w === 'samla' && needTinder(s);
        // nytta för byn; maten väger också in hur mycket platserna ger just nu och att fiske med händerna ger lite
        const yieldF = w === 'ved' || tinder ? 1 : clamp(prospectFor(s, p, w as Kind), 0.05, 1.3) * (w === 'fiske' ? HAND_FISH * (spearReady ? SPEAR_FISH : 1) : 1);
        const season = ACTS[w].sasong![ai];
        const col = need * (w === 'ved' ? 1 : tinder ? Math.max(0.8, season) * 3 : season * yieldF);
        const like = (4 + p.skill[w as Skill] + stat(p, ACTS[w].egenskap!, now) / 3) * (1 + 2 * habitShare(p, [w], tot)); // egen lust och vana
        const sc = col * like * (0.6 + rnd(s) * 0.8);
        burg = Math.max(burg, col);
        if (sc > bs) { bs = sc; best = w; }
      }
      // bygget: väger mer ju fler som saknar sovplats under tak, inför och under istiden, och när en vägg behöver lagas
      const job = buildJob(s, p), ppl = living(s);
      let build = false;
      if (job) {
        const homeless = Math.max(0, ppl.length - beds(s).length) / (ppl.length || 1);
        const col = ((job.repair ? 1.2 : 0.5) + 2.4 * homeless) * (ai === 3 || ai === 0 ? 1.4 : 1);
        const like = (4 + p.skill.hantverk + stat(p, 'flit', now) / 3) * (1 + 2 * habitShare(p, ['bygga'], tot));
        const sc = col * like * (0.6 + rnd(s) * 0.8);
        burg = Math.max(burg, col);
        if (sc > bs) { build = true; if (job.missing) best = job.item === 'torrgras' ? 'samla' : 'ved'; }
      }
      const u = clamp(burg / 3, 0, 1); // hur akut byn behöver arbete
      let works = false;
      const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
      const what = build && job!.missing ? `Bygget behöver ${job!.item === 'torrgras' ? 'torrt gräs' : 'grenar'}` : best === 'ved' ? `Byn behöver ved, förrådet räcker ${dygn(wd)}` : best === 'samla' && needTinder(s) ? 'Byn behöver tändmaterial till elden' : `Byn behöver mat, förrådet räcker ${dygn(fd)}`;
      const workWhy = () => what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [best], tot) > 0.25 ? '. Brukar göra det.' : p.skill[best as Skill] > 10 ? '. Skicklig på det.' : '.');
      if (a >= 12 && (s.fire.ash ?? 0) >= 1 && !lit && !emberOn(s) && fireWant(s) < 0.6 && rnd(s) < 0.2 && !living(s).some(q => q.task?.act === 'kol')) {
        set('kol', 'Det ligger kol kvar i den slocknade elden');
        dur = 10 * 60 * SEC;
      } else if (a < 14) {
        if (rnd(s) < 0.45 + 0.2 * sd.barn) set('leka', 'Är barn och leker');
        else set(best, `Hjälper till. ${what}.`);
      } else if ((works = rnd(s) < (1 - lazy) * (0.88 + 0.12 * u) + lazy * sat * (0.6 + 0.4 * u)) && build && !job!.missing) {
        const b = job!.bit, hus = s.hus?.find(h => h.id === b.hus)?.namn.toLowerCase() ?? 'huset';
        set('bygga', job!.repair ? `En vägg i ${hus} är sliten och behöver lagas.` : `${b.k === 'golv' ? 'Lägger golv i' : 'Bygger på'} ${hus}. ${beds(s).length < ppl.length ? 'Alla har inte en sovplats under tak.' : ''}`.trim());
        tool = job!.repair ? 'laga' : b.k === 'golv' ? 'golv' : 'vagg'; ref = b.id;
        dur = (60 + rnd(s) * 90) * 60 * SEC;
        if (live) { const site = siteOf(s, b); spot = job!.need > 0 ? fetchSpot(s, job!.item!) : site; if (job!.need > 0) siteNext = site; }
        else if (takeFor(s, job!)) spot = siteOf(s, b);
        else set('vila', 'Det saknas material till bygget');
      } else if (works) {
        set(best, workWhy());
        dur = (60 + rnd(s) * 120) * 60 * SEC;
        if (best === 'samla' && wantsFlint(s) && rnd(s) < 0.3) { // byn saknar flinta till en yxa
          const fa = flintArea(p), fl = (fa !== undefined && flintSpot(s, (x, y) => areaOf(x, y) === fa)) || flintSpot(s);
          if (fl) { spot = fl; why = `${why!} Letar efter flinta vid stenarna${fa !== undefined ? ' där hen vet att det finns' : ''}.`; }
        }
        const ax = best === 'ved' ? axeTask(s, p) : undefined; // med yxa fälls träd och huggs ved
        if (ax) {
          set(ax.act, `${what}. ${ax.why}.`);
          if (ax.dur) dur = ax.dur;
          if (ax.act !== 'yxa') spot = { x: ax.x, y: ax.y };
          ref = ax.ref;
        }
        const { kyla, gras } = dangers(s);
        if (act! === 'samla') { // med korg om det finns en ledig, annars flätar den som kan en först
          if (freeBaskets(s, p) > 0) { tool = 'korg'; why = why!.replace(/\.$/, '') + '. Tar en korg.'; }
          else if (!kyla && (s.items.torrgras ?? 0) >= gras && wantsBasket(s, p)) { set('korg', `${what}. Flätar en korg av torrt gräs.`); dur = 40 * 60 * SEC; }
        }
        if (best === 'fiske') { // med spjut om det finns ett ledigt, annars täljer hen ett först
          if (freeSpears(s, p) > 0) { tool = 'fiskespjut'; why = why!.replace(/\.$/, '') + '. Tar ett fiskespjut.'; }
          else if (!kyla && wantsSpear(s, p)) { set('spjut', `${what}. Täljer ett fiskespjut med ${sharpTool(s) === 'yxa' ? 'yxan' : 'en flintsten'}.`); dur = 40 * 60 * SEC; }
        }
      } else {
        // egen lust: vila, hantverk eller umgänge
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
        if (r < wv) set('vila', lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus');
        else if (r < wv + wh) set('hantverk', u < 0.25 ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete');
        else if (r < wv + wh + wsoc) set('samtal', 'Vill umgås');
        else if (r < wv + wh + wsoc + wp) {
          // nyfikna och modiga går längre bort
          const far = 4 + (stat(p, 'nyfikenhet', now) + stat(p, 'mod', now)) / 40 * 14;
          set('promenad', far > 12 ? 'Är nyfiken och vill se vad som finns längre bort' : 'Vill sträcka på benen');
          spot = walkSpot(s, far); dur = (60 + rnd(s) * 90) * 60 * SEC;
        } else if (r < wv + wh + wsoc + wp + wb) { set('bada', `Det är varmt (${Math.round(temp)} grader) och skönt att bada`); spot = shore; dur = (30 + rnd(s) * 30) * 60 * SEC; }
        else { set('strand', ai === 0 ? 'Vill se ut över isen en stund' : 'Vill sitta vid vattnet och se ut över sjön'); spot = strandSpot(s); dur = (30 + rnd(s) * 60) * 60 * SEC; }
      }
    }
  } else {
    const guardDay = Math.floor((s.now - s.founded - 7 * HOUR) / DAY);
    const adults = living(s).filter(q => ageOf(q, s.now) >= 16 && ageOf(q, s.now) < 60);
    if (guardDay !== s.lastGuardDay && adults.length) {
      // välj nattens vakt (modigast med lite slump), byts varje natt
      s.lastGuardDay = guardDay;
      const g = adults.sort((x, y) => (y.pot.mod + rnd(s) * 8) - (x.pot.mod + rnd(s) * 8))[0];
      g.task = undefined; g.guardDay = guardDay;
    }
    if (p.guardDay === guardDay && a >= 16) set('vakt', 'Håller vakt i natt');
    else {
      const r = rnd(s);
      const story = (p.skill.berattande + (a > 50 ? 6 : 0)) / 40;
      const craft = (p.skill.hantverk + stat(p, 'flit', s.now)) / 70;
      // på natten håller man sig vid lägret; de modiga går lite längre ut i mörkret för att bära in saker
      const near = 2 + stat(p, 'mod', now) / 20 * 8, gt = a >= 12 && r < 0.35 && s.stackar?.length ? haulJob(s, near) : undefined;
      if (gt) { set('bara', `Mörkt, ${near > 6 ? 'men är modig och ' : ''}${gt.why[0].toLowerCase()}${gt.why.slice(1)}`); spot = gt; dur = 2 * HOUR; }
      else if (a < 8) { if (r < 0.6) set('samtal', 'Mörkt, sitter med de vuxna vid elden'); else set('sova', 'Barn sover på natten'); }
      else if (r < story) set('beratta', 'Mörkt, berättar för de andra vid elden');
      else if (r < story + craft) set('hantverk', 'Mörkt, gör handarbete vid elden');
      else if (r < 0.9) set('samtal', 'Mörkt, umgås vid elden');
      else set('vila', 'Mörkt, vilar vid elden');
    }
  }
  if (act! === 'toa') dur = (4 + rnd(s) * 4) * 60 * SEC;
  const sp0 = spot ?? spotFor(s, act!, p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
  if (!live) { p.x = sp.x; p.y = sp.y; tread(s, sp.x, sp.y, isWork(act!) ? 2 : 1); }
  p.task = { act: act!, phase: live ? 'go' : 'do', tx: sp.x, ty: sp.y, until: s.now + dur, carry: 0, why: why!, dark: !light, ref, tool, site: siteNext };
}
