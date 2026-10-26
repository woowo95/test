import { take } from './agande';
import { PLATS, campCenter, campDist, campKey } from './plats';
import { RESERV, foodDays } from './ekonomi';
import { ACTS, WORK, usesTool } from './handlingar';
import { canLight, emberOn, fireWant, needStones, needTinder, woodDays } from './eld';
import { ALDER, KROPP, ageOf, isSick, living, stat } from './folk';
import { FANGST, Kind, flintSpot, shoreOf, wantsFlint } from './fynd';
import { coldOf, temperature } from './vader';
import { DJUR, KANIN, SLAKT_TIMME, TILLVERKA, minOf, abborrar, canClean, canSlaughter, freeOfKinds, toolGroups, vilt, wantsKnife, wantsRope } from './redskap';
import { areaOf, flintArea, pickSpot, prospectFor } from './minne';
import { getMap } from './karta';
import { amountOf, avbryt, fetchSpot, haulJob } from './lager';
import { bedFor, buildJob, siteOf } from './bygg';
import { bitAt, blocked, freeNear, roomAt } from './byggnad';
import { bedTile, homeless, samlingRum, varmareInne } from './byggnader';
import { isForest, punktIRuta } from './mark';
import { axeTask, fallTid } from './skog';
import { GA_TID, startsOnArrival } from './paborjat';
import { duty, dygn, habitShare, habitTotal } from './seder';
import { clamp, pick, pickNarmaste, rnd } from './slump';
import { ARSTID, ageIndex, iIstiden, isLight, kallTid, yearNo } from './tid';
import { Act, H, HOUR, MIN, Person, Skill, Stat, State, T, W, inMap } from './typer';
import { balans } from './balans';

// ---------- val av aktivitet ----------
// Balanstalen (regel 8): vikter, chanser, avstånd och hur länge ett pass varar. Kroppens gränser (KROPP) och åldrarna (ALDER)
// står i folk.ts, halv dags gång (PLATS) i plats.ts, reserverna (RESERV) i ekonomi.ts och tidsålderns faktorer (ARSTID) i tid.ts.
// Längder är i minuter om inget annat sägs; ett val varar minst X och upp till X + Spann
const VAL = balans('val', {
  // alla pass
  pass: 0.5, // dagens pass är så stor del av vad de var före steg 1.5.11 (arbete, bygge och fritid kortas lika mycket)
  vilaMin: 20, vilaSpann: 40, // ett val som inte säger annat (nöd och grundbehov)
  toaMin: 4, toaSpann: 4, // ett toabesök
  // var man arbetar (spotFor)
  provar: 260, // så många slumpade rutor prövas runt lägret
  narAvst: 4, // arbetsplatser ligger minst så många rutor från lägret ...
  narAvstAng: 5, // ... på ängen och avsides minst så många
  langtAvsides: 9, // ... och avsides högst så långt
  narmaste: 6, // utan särskild resurs väljs bland så många av de närmaste platserna
  gangMin: 0.7, gangSpann: 0.3, // en promenad går så här stor del av sträckan
  strandNara: 15, // stranden som räknas ligger närmare lägret än så här många rutor
  // faror
  fryserAndel: 0.25, // kylan är en fara när fler än så här stor andel fryser (kallt)
  gammalSover: 0.6, // chansen att den som är över sovGammal sover på natten
  // dagen: byns behov mot egen lust
  baraChans: 0.25, baraTim: 3, // chansen att bära in det som ligger ute, och hur länge (timmar)
  slaktChans: 0.5, // chansen att slakta vilt som finns
  rensaChans: 0.5, // ... och att rensa fisk som finns
  slaktMaxTim: 2, rensaMaxTim: 1, extraMin: 5, // slakt och rensning varar högst så här många timmar och 5 minuter över vad det tar
  byggLaga: 1.2, byggHalvt: 3, byggNytt: 0.8, // hur mycket bygget väger: en vägg som lagas, ett hus som är påbörjat, ett nytt
  byggUtan: 3, // ... plus så mycket gånger andelen som saknar sovplats under tak
  byggMatFran: 0.5, byggMatSpann: 2, byggMatMin: 0.1, // maten dämpar bygget: (matdygn - Fran) / Spann, aldrig under Min
  letaFlinta: 0.1, // flinta över detta (och inget behov av stenar) gör att någon letar flinta till en yxa ...
  letaMat: 1.5, // ... om maten räcker så många dygn ...
  letaChans: 0.3, // ... och med denna chans
  stenarChans: 0.5, // chansen att den som samlar letar flinta eller stenar vid stenarna när byn saknar det (och ett helt pass)
  tandHamtare: 3, // så många hämtar tändmaterial åt en släckt eld som mest
  akut: 3, // arbetet är helt akut när det mest behövda väger så här mycket
  kolEld: 0.6, kolChans: 0.2, kolMin: 10, // kol hämtas ur den släckta elden när elden vill ha mindre än så här, med denna chans, i så många minuter
  lekBas: 0.45, lekSed: 0.2, // en yngre än vuxen leker med denna chans (plus seden Barn gånger Sed)
  flitigBas: 0.88, flitigAkut: 0.12, // chansen att arbeta för den flitige: Bas + Akut gånger hur akut arbetet är
  latBas: 0.6, latAkut: 0.4, // ... och för den lata (gånger hur väl de egna behoven är fyllda)
  arbeteMin: 60, arbeteSpann: 120, // ett arbetspass
  byggMin: 60, byggSpann: 90, // ett pass med bygge
  // lusten att arbeta och vikten av byns behov
  lustBas: 4, lustEgenskap: 3, lustVana: 2, // lusten = (Bas + färdigheten + egenskapen / Egenskap) gånger (1 + Vana gånger andelen vana)
  brusMin: 0.6, brusSpann: 0.8, // slumpbrus på poängen: mellan Min och Min + Spann
  forsiktig: 0.25, // en försiktig by vill ha så mycket större förråd
  behovTomt: 3.2, behovMax: 3.5, // vikten av ett tomt förråd av mat eller ved, och den högsta vikten
  matDygn: 2.5, matMin: 0.4, // för mat: förrådets dygn dämpar vikten, aldrig under Min
  vedDygn: 2, vedMin: 0.15, // ... och för ved
  tandMin: 0.8, tandVikt: 3, // tändmaterial: årstiden räknas minst Min, gånger Vikt
  prospektMin: 0.05, prospektMax: 1.3, // hur mycket platserna ger just nu räknas mellan dessa
  // fritid (leisure): vikter (ju större desto oftare), u = hur akut byn behöver arbete
  vilaVikt: 2, vilaLat: 0.6, // vila: per saknad vila, plus för den lata
  hantSkill: 10, hantFlit: 20, // handarbete: färdigheten delad med Skill plus flit-anlaget delat med Flit
  hantLugn: 0.25, hantLugnVikt: 1.5, hantAkutVikt: 0.6, // ... gånger Lugn när u är under Lugn (byn har det gott ställt), annars Akut
  umgasVikt: 2, // umgänge: per saknat umgänge
  lugn: 0.5, lugnAkut: 0.3, // promenad, bad och strand: vikt gånger 1 när u är under Lugn, annars gånger Akut
  promBas: 0.3, promNyfiken: 15, // promenad: Bas plus nyfikenheten delad med Nyfiken
  badTemp: 15, badNoll: 14, badSpann: 8, badMax: 1.2, // bad: vattnet minst Temp grader, vikten (temp - Noll) / Spann, högst Max
  strandBas: 0.2, strandDiv: 60, // strand: Bas plus (20 - empatin) / Div
  promNar: 4, promBort: 14, // en promenad går 4 rutor plus upp till 14 för den nyfikna och modiga
  promMin: 60, promSpann: 90, // en promenad
  badPassMin: 30, badPassSpann: 30, // ett bad
  strandMin: 30, strandSpann: 60, // en stund vid stranden
  // natten
  vaktByte: 7, // nattens vakt byts klockan 7 (timmar)
  vaktSlump: 8, // vakten är den modigaste med så här mycket slump (i mod)
  berattaAlder: 50, berattaBonus: 6, berattaDiv: 40, // berättande: (färdigheten + Bonus över Alder) / Div
  nattHantDiv: 70, // handarbete: (hantverk + flit) / Div
  nattNar: 2, nattLangt: 8, nattBara: 0.35, nattBaraTim: 2, // de modiga går upp till Nar + Langt rutor för att bära in, med denna chans, i så många timmar
  nattBarnSamtal: 0.6, // ett barn sitter med de vuxna med denna chans, annars sover det
  nattSamtal: 0.9, // annars umgås man tills detta, sedan vilar man
});
// var en handling görs, efter platsen i handlingar.ts
export function spotFor(s: State, act: Act, p: Person): { x: number; y: number } {
  const m = getMap(s.seed);
  const f = m.fire, d = ACTS[act], plats = d.plats ?? 'skog';
  if (plats === 'elden') {
    // när det är kallt samtalar och berättar man i samlingshuset, om det är varmare där än vid elden (byggnader.ts)
    const sal = d.social ? samlingRum(s) : undefined, c = sal ? coldOf(temperature(s)) : 0;
    if (sal && c > 0 && varmareInne(s, sal, c)) return punktIRuta(s, pick(s, sal.tiles, 'val', p), p);
    for (let k = 0; ; k++) { // runt elden, men inte i en husvägg
      const ang = rnd(s, 'val', p) * Math.PI * 2, r = d.radie ?? 1.3 + rnd(s, 'val', p) * 0.9, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      if (k >= 11 || !blocked(s, x, y)) return k >= 11 ? freeNear(s, f.x + 0.5, f.y + 1.5) : { x, y };
    }
  }
  if (plats === 'kol') return { x: f.x + 0.5 + (rnd(s, 'val', p) - 0.5) * 0.6, y: f.y + 1.1 };
  if (plats === 'sang') { // i huset om det finns plats under tak, annars på marken en bit från elden
    // i huset om det är varmare där än vid elden
    const bed = bedFor(s, p), c = coldOf(temperature(s)), rum = bed && roomAt(s, bed.x, bed.y);
    if (bed && rum && (varmareInne(s, rum, c) || c === 0)) return bed; // när det inte är kallt räcker värmen överallt
    for (let k = 0; k < 12; k++) {
      const ang = (p.id * 2.399 + rnd(s, 'val', p) * 0.5) % (Math.PI * 2), r = 1.8 + rnd(s, 'val', p) * 1.2, x = f.x + 0.5 + Math.cos(ang) * r, y = f.y + 0.5 + Math.sin(ang) * r;
      if (inMap(x, y) && !blocked(s, x, y)) return { x, y };
    }
    return freeNear(s, f.x + 0.5, f.y + 2);
  }
  if (plats === 'lek') { // lekplatsen ligger söder om elden, men aldrig i vattnet
    for (let k = 0; k < 12; k++) {
      const x = f.x + (rnd(s, 'val', p) - 0.5) * PLATS.lekBredd, y = f.y + PLATS.lekFran + rnd(s, 'val', p) * PLATS.lekDjup;
      if (inMap(x, y) && !blocked(s, x, y)) return { x, y };
    }
    return freeNear(s, f.x + 0.5, f.y + 1.5);
  }
  // ute på marken: vid stranden, på ängen och i skogen, eller avsides (toa)
  const strand = plats === 'strand' ? shoreOf(s.seed) : undefined;
  const want = (t: number, x: number, y: number) => {
    if (bitAt(s, x, y)) return false; // inte i husen
    if (strand) return strand[y * W + x] === 1;
    if (plats === 'ang') return t === T.Gras || t === T.Skog;
    if (plats === 'avsides') return t === T.Gras || t === T.Skog || t === T.Sand;
    return isForest(s, y * W + x); // grenar och vilt finns i skogen
  };
  // arbetsplatser räknas från byns läger (eld och lagerplatser), inte bara från elden
  const cands: { x: number; y: number; d: number }[] = [], mid = campCenter(s);
  const min = plats === 'ang' || plats === 'avsides' ? VAL.narAvstAng : VAL.narAvst, max = plats === 'avsides' ? VAL.langtAvsides : Infinity;
  for (let i = 0; i < VAL.provar; i++) {
    const x = Math.floor(mid.x + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagX)), y = Math.floor(mid.y + (rnd(s, 'val', p) - 0.5) * (2 * PLATS.dagY));
    if (!inMap(x, y)) continue;
    const d = campDist(s, x, y);
    if (d < min || d > max) continue;
    if (want(m.tiles[y * W + x], x, y)) cands.push({ x, y, d });
  }
  cands.sort((a, b) => a.d - b.d);
  // mat: gå dit det finns mest att hämta, inte för långt bort; annars en av de närmaste platserna
  const c = (d.resurs ? pickSpot(s, p, d.resurs, cands) : pickNarmaste(s, cands, VAL.narmaste, 'val', p)) ?? nearestWanted(s, want) ?? { x: mid.x, y: mid.y };
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
    const ang = rnd(s, 'val') * Math.PI * 2, r = far * (VAL.gangMin + rnd(s, 'val') * VAL.gangSpann);
    const x = clamp(f.x + 0.5 + Math.cos(ang) * r, 0.5, W - 0.5), y = clamp(f.y + 0.5 + Math.sin(ang) * r, 0.5, H - 0.5);
    if (!blocked(s, x, y)) return { x, y };
  }
  return freeNear(s, f.x + 0.5, f.y + 3);
}
// stranden nära byns läger: rutorna på land vid vattnet, närmare lägret än strandNara och utan hus (ok), och badplatsen, den
// närmaste av dem. Sparas tills lägret ändras eller något byggs (ett nytt hus kan stå på stranden)
const strandCache = new WeakMap<State, { key: string; ok: number[]; bad?: { x: number; y: number } }>();
function strandOf(s: State) {
  const key = `${campKey(s)},${s.byggV ?? 0}`;
  let c = strandCache.get(s);
  if (c?.key !== key) {
    const sh = shoreOf(s.seed), ok: number[] = [];
    let bad: { x: number; y: number } | undefined, bd = VAL.strandNara;
    for (let i = 0; i < W * H; i++) {
      if (!sh[i]) continue;
      const x = i % W, y = Math.floor(i / W);
      if (bitAt(s, x, y)) continue;
      const d = campDist(s, x, y);
      if (d < VAL.strandNara) ok.push(i);
      if (d < bd) { bd = d; bad = { x: x + 0.5, y: y + 0.5 }; }
    }
    strandCache.set(s, c = { key, ok, bad });
  }
  return c;
}
const bathSpot = (s: State) => strandOf(s).bad;
// en plats på land vid vattnet, inte för långt från byns läger
function strandSpot(s: State) {
  const { ok, bad } = strandOf(s);
  if (!ok.length) return bad;
  const i = pick(s, ok, 'val');
  return { x: i % W + 0.5, y: Math.floor(i / W) + 0.5 };
}
// Faror går före förbättringar. En korg eller ett spjut gör maten lättare att få tag i, men när kylan är en fara väntar
// sådant: tid och hö går då först till värmen. Inför och under istiden sparar man hö till det.
function dangers(s: State) {
  const ppl = living(s), freezing = ppl.filter(q => q.warm < KROPP.kallt).length / (ppl.length || 1), ai = ageIndex(s);
  const cold = coldOf(temperature(s)) > 0 || freezing > VAL.fryserAndel;
  return { kyla: cold && !s.fire.lit && !emberOn(s), gras: kallTid(ai) || cold ? RESERV.torrgrasKyla : 0 };
}
// elden är släckt och kan inte tändas för att det saknas tändmaterial, och för få hämtar det
const tinderNeeded = (s: State) => !s.fire.lit && !emberOn(s) && !canLight(s) && needTinder(s) && living(s).filter(q => q.task?.act === 'samla').length < VAL.tandHamtare;
// det som väljs: handlingen, varför, hur länge, och var om det inte följer av handlingen
interface Val { act: Act; why: string; dur: number; spot?: { x: number; y: number }; ref?: number; tool?: string; site?: { x: number; y: number }; sok?: true }
const set = (v: Val, act: Act, why: string) => { v.act = act; v.why = why; return true; };
// dagens pass är hälften så långa som förr (steg 1.5.11, VAL.pass), arbete och fritid lika, så att tiden fördelas som förut men
// folk väljer om oftare och syns gå mellan platserna

// Viljan i tre steg: 1. nöd, 2. grundbehov, 3. byns behov mot egen lust (på dagen) eller kvällen vid elden (på natten).
// Man går sedan dit (steg.ts)
export function chooseTask(s: State, p: Person) {
  const a = ageOf(p, s.now), light = isLight(s.now), lazy = 1 - duty(s, p);
  const v: Val = { act: 'vila', why: '', dur: (VAL.vilaMin + rnd(s, 'val', p) * VAL.vilaSpann) * MIN }; // 20–60 min
  if (!needs(s, p, v, a, lazy, light)) { if (light) day(s, p, v, a, lazy); else night(s, p, v, a); }
  if (v.act === 'toa') v.dur = (VAL.toaMin + rnd(s, 'val', p) * VAL.toaSpann) * MIN;
  const sp0 = v.spot ?? spotFor(s, v.act, p), sp = freeNear(s, sp0.x, sp0.y); // aldrig i en husvägg
  p.task = { act: v.act, phase: 'go', tx: sp.x, ty: sp.y, until: s.now + v.dur + (startsOnArrival(v.act) ? GA_TID : 0), carry: 0, why: v.why, dark: !light, ref: v.ref, tool: v.tool, site: v.site, sok: v.sok };
  const k = usesTool(p.task);
  if (k && !take(s, p, k)) p.task.tool = undefined; // redskapet tas i handen: det egna först (agande.ts)
}

// 1–2. nöd (sjuk, svag, fryser farligt, måste på toa genast) och grundbehov (toa, värme, vila).
// En lat person tillgodoser grundbehoven tidigare än en flitig. true = något valdes
function needs(s: State, p: Person, v: Val, a: number, lazy: number, light: boolean) {
  const lit = s.fire.lit, sick = isSick(p, s.now);
  if (a < ALDER.smabarn) return set(v, 'sova', 'Är ett litet barn');
  if (p.toa < KROPP.toaGenast) return set(v, 'toa', 'Måste gå på toa genast');
  if (sick) return set(v, 'sova', 'Är sjuk');
  if (p.health < KROPP.svag) return set(v, 'sova', 'Är för svag för att orka något');
  if (p.warm < KROPP.farligt && lit) return set(v, 'varma', 'Fryser farligt');
  // elden går inte att tända för att tändmaterial saknas: den som fryser men orkar hämtar det i stället för att gå in.
  // Kylan är faran och elden det enda som hjälper mot den (några räcker; de andra går in och väntar)
  if (p.warm < KROPP.kallt + KROPP.latVarme * lazy && a >= ALDER.vuxen && tinderNeeded(s)) return set(v, 'samla', 'Fryser, men utan tändmaterial blir det ingen eld');
  if (p.warm < KROPP.farligt && bedTile(s, p) !== undefined) return set(v, 'vila', 'Fryser farligt och går in i huset');
  if (!light && a > ALDER.sovGammal && rnd(s, 'val', p) < VAL.gammalSover) return set(v, 'sova', 'Är gammal och sover på natten');
  if (p.toa < KROPP.toaBehov + KROPP.latToa * lazy) return set(v, 'toa', 'Behöver gå på toa');
  if (p.warm < KROPP.kallt + KROPP.latVarme * lazy && lit) return set(v, 'varma', 'Fryser');
  if (p.warm < KROPP.kallt + KROPP.latVarme * lazy && bedTile(s, p) !== undefined) return set(v, 'vila', 'Fryser och går in i huset');
  if (p.rest < (light ? KROPP.trottDag : KROPP.trottNatt) + KROPP.latVila * lazy) return set(v, 'vila', 'Är trött');
  return false;
}

// 3. på dagen: byns behov mot egen lust, vägda med pliktkänslan
function day(s: State, p: Person, v: Val, a: number, lazy: number) {
  const sd = s.seder.v;
  let gt: ReturnType<typeof haulJob>;
  v.dur *= VAL.pass;
  if (a < ALDER.hjalper) { set(v, 'leka', 'Är barn och leker'); return; }
  if (s.stackar?.length && rnd(s, 'val', p) < VAL.baraChans && (gt = haulJob(s))) { set(v, 'bara', gt.why); v.spot = gt; v.dur = VAL.baraTim * HOUR; return; }
  if (a >= ALDER.vuxen && canSlaughter(s, p) && rnd(s, 'val', p) < VAL.slaktChans) { slaughterTask(s, v, 'Det finns vilt att slakta innan det blir dåligt'); return; }
  if (a >= ALDER.rensar && canClean(s, p) && rnd(s, 'val', p) < VAL.rensaChans) { cleanTask(s, v, 'Det finns fisk att rensa innan den blir dålig'); return; }
  const fd = foodDays(s), wd = woodDays(s), ai = ageIndex(s), tot = habitTotal(p);
  let { best, bs, burg } = bestWork(s, p, fd, wd, ai, tot);
  // bygget: väger mer ju fler som saknar sovplats under tak, inför och under istiden, när en vägg behöver lagas och när huset inte är klart
  const job = buildJob(s, p), ppl = living(s);
  let build = false;
  if (job) {
    const utan = homeless(s) / (ppl.length || 1);
    const halvt = !job.repair && !s.hus?.find(h => h.id === job.bit.hus)?.klar; // ett påbörjat hus vill man göra klart, även när det sista är ett hörn
    // hungern är en fara och går före: räcker maten mindre än två och ett halvt dygn väger bygget mindre
    const col = ((job.repair ? VAL.byggLaga : halvt ? VAL.byggHalvt : VAL.byggNytt) + VAL.byggUtan * utan) * (kallTid(ai) ? ARSTID.byggKall : 1) * clamp((fd - VAL.byggMatFran) / VAL.byggMatSpann, VAL.byggMatMin, 1);
    const sc = poang(s, p, col, lust(s, p, 'hantverk', 'flit', ['bygga'], tot));
    burg = Math.max(burg, col);
    if (sc > bs) { build = true; if (job.missing) best = job.item === 'torrgras' ? 'samla' : 'ved'; }
  }
  // har byn flinta till elden (en sprucken räknas) men inte till en yxa går någon och letar vid stenarna, också när plockning inte är det mest behövda.
  // Yxan är en förbättring: bara när maten räcker och inte inför eller under istiden. En i taget
  const leta = !build && a >= ALDER.vuxen && amountOf(s, 'flinta') > VAL.letaFlinta && !needStones(s) && wantsFlint(s) && fd >= VAL.letaMat && !kallTid(ai) && !ppl.some(q => q !== p && q.task?.why?.includes('vid stenarna')) && rnd(s, 'val', p) < VAL.letaChans;
  if (leta) best = 'samla';
  const u = clamp(burg / VAL.akut, 0, 1); // hur akut byn behöver arbete
  const sat = Math.min(p.hunger, p.rest, p.social); // hur väl de egna behoven är fyllda
  const what = leta ? `Byn behöver ${needStones(s) ? 'stenar' : 'flinta'}` : build && job!.missing ? `Bygget behöver ${job!.item === 'torrgras' ? 'hö' : job!.item === 'ved' ? 'trä' : 'grenar'}` : best === 'ved' ? `Byn behöver trä, förrådet räcker ${dygn(wd)}` : best === 'samla' && needTinder(s) ? 'Byn behöver tändmaterial till elden' : `Byn behöver mat, förrådet räcker ${dygn(fd)}`;
  let works = false;
  if (a >= ALDER.ansvar && (s.fire.ash ?? 0) >= 1 && !s.fire.lit && !emberOn(s) && fireWant(s) < VAL.kolEld && rnd(s, 'val', p) < VAL.kolChans && !ppl.some(q => q.task?.act === 'kol')) {
    set(v, 'kol', 'Det ligger kol kvar i den slocknade elden');
    v.dur = VAL.kolMin * MIN;
  } else if (a < ALDER.vuxen) {
    if (rnd(s, 'val', p) < VAL.lekBas + VAL.lekSed * sd.barn) set(v, 'leka', 'Är barn och leker');
    else set(v, best, `Hjälper till. ${what}.`);
  } else if ((works = rnd(s, 'val', p) < (1 - lazy) * (VAL.flitigBas + VAL.flitigAkut * u) + lazy * sat * (VAL.latBas + VAL.latAkut * u)) && build && !job!.missing) {
    building(s, p, v, job!);
  } else if (works) {
    set(v, best, what + (lazy < 0.2 ? '. Plikttrogen.' : habitShare(p, [best], tot) > 0.25 ? '. Brukar göra det.' : p.skill[best as Skill] > 10 ? '. Skicklig på det.' : '.'));
    v.dur = (VAL.arbeteMin + rnd(s, 'val', p) * VAL.arbeteSpann) * MIN * VAL.pass;
    withTools(s, p, v, best, what, leta);
    if (build && job!.missing && job!.item === 'ved' && v.act === 'falla') { v.ref = job!.bit.hus; v.why = `${v.why} Stocken ska bli en vägg.`; } // trädet fälls för bygget
  } else leisure(s, p, v, u, lazy, ai);
}

// egen lust att arbeta med färdigheten skill: färdigheten och egenskapen som hjälper, gånger vanan (acts: handlingarna som räknas)
const lust = (s: State, p: Person, skill: Skill, egenskap: Stat, acts: Act[], tot: number) => (VAL.lustBas + p.skill[skill] + stat(p, egenskap, s.now) / VAL.lustEgenskap) * (1 + VAL.lustVana * habitShare(p, acts, tot));
// byns behov (col) gånger lusten, med ett slumpbrus mellan brusMin och brusMin + brusSpann (drar ett tal ur 'val')
const poang = (s: State, p: Person, col: number, like: number) => col * like * (VAL.brusMin + rnd(s, 'val', p) * VAL.brusSpann);
// det arbete byn behöver mest just nu, vägt mot egen lust och vana. burg = hur mycket det mest behövda behövs
function bestWork(s: State, p: Person, fd: number, wd: number, ai: number, tot: number) {
  const fs = 1 + VAL.forsiktig * s.seder.v.forsiktighet; // en försiktig by vill ha större förråd
  const wFood = clamp(VAL.behovTomt - fd / (VAL.matDygn * fs), VAL.matMin, VAL.behovMax);
  const wWood = clamp(VAL.behovTomt - wd / (VAL.vedDygn * fs), VAL.vedMin, VAL.behovMax) * (kallTid(ai) ? ARSTID.vedKall : 1); // inför och under istiden väger veden tyngre
  let best: Act = 'samla', bs = -1, burg = 0;
  for (const w of WORK) {
    const need = w === 'ved' ? wWood : wFood;
    const tinder = w === 'samla' && needTinder(s);
    // nytta för byn; maten väger också in hur mycket platserna ger just nu och att fiske med händerna ger lite
    const yieldF = w === 'ved' || tinder ? 1 : clamp(prospectFor(s, p, w as Kind), VAL.prospektMin, VAL.prospektMax) * (w === 'fiske' ? FANGST.handFiske : 1) * toolGain(s, p, w);
    const season = ACTS[w].sasong![ai];
    const col = need * (w === 'ved' ? 1 : tinder ? Math.max(VAL.tandMin, season) * VAL.tandVikt : season * yieldF);
    const sc = poang(s, p, col, lust(s, p, w as Skill, ACTS[w].egenskap!, [w], tot)); // egen lust och vana
    burg = Math.max(burg, col);
    if (sc > bs) { bs = sc; best = w; }
  }
  return { best, bs, burg };
}

// att bygga eller laga en del av ett hus. Saknas material hämtar man det först
function building(s: State, p: Person, v: Val, job: NonNullable<ReturnType<typeof buildJob>>) {
  const b = job.bit, hus = s.hus?.find(h => h.id === b.hus)?.namn.toLowerCase() ?? 'huset';
  if (job.fell) { // först fälls träden där huset ska stå
    set(v, 'falla', `Fäller ett träd där ${hus} ska stå.`);
    v.dur = fallTid(s, b.y * W + b.x); v.spot = { x: b.x + 0.5, y: b.y + 0.5 }; // ett litet träd fälls fortare
    v.tool = 'yxa';
    return;
  }
  set(v, 'bygga', job.repair ? `En vägg i ${hus} är sliten och behöver lagas.` : `${b.k === 'golv' ? 'Lägger golv i' : 'Bygger på'} ${hus}. ${homeless(s) > 0 ? 'Alla har inte en sovplats under tak.' : ''}`.trim());
  v.tool = job.repair ? 'laga' : b.k === 'golv' ? 'golv' : 'vagg'; v.ref = b.id;
  v.dur = (VAL.byggMin + rnd(s, 'val', p) * VAL.byggSpann) * MIN * VAL.pass;
  const site = siteOf(s, b); v.spot = job.need > 0 ? fetchSpot(s, job.item!) : site; if (job.need > 0) v.site = site;
}

// arbetet med redskap: flinta letas vid stenarna, yxan fäller träd, korgen och spjutet görs först om de saknas
function withTools(s: State, p: Person, v: Val, best: Act, what: string, leta = false) {
  const stones = needStones(s);
  if (best === 'samla' && (wantsFlint(s) || stones) && (leta || rnd(s, 'val', p) < VAL.stenarChans)) { // byn saknar flinta eller stenar till eldringen. Stenarna ligger långt bort, så där letar man ett helt pass
    const fa = flintArea(p), fl = (fa !== undefined && flintSpot(s, (x, y) => areaOf(x, y) === fa)) || flintSpot(s);
    if (fl) { v.spot = fl; v.dur /= VAL.pass; v.sok = true; v.why = `${v.why} Letar efter ${stones ? 'stenar till en eldring' : 'flinta'} vid stenarna${fa !== undefined ? ' där hen vet att det finns flinta' : ''}.`; }
  }
  const ax = best === 'ved' ? axeTask(s, p) : undefined; // med yxa fälls träd och huggs ved
  if (ax) {
    set(v, ax.act, `${what}. ${ax.why}.`);
    if (ax.dur) v.dur = ax.dur;
    if (ax.act !== 'yxa') { v.spot = { x: ax.x, y: ax.y }; v.tool = 'yxa'; }
    v.ref = ax.ref;
  }
  // med det bästa redskapet som är ledigt; finns inget gör den som kan ett först (inte när kylan är en fara)
  const { kyla, gras } = dangers(s), rader = ACTS[v.act].redskap;
  if (rader) for (const [g, ks] of Object.entries(toolGroups(v.act))) {
    if (!rader[ks[0]].tar) continue; // yxan väljs med arbetet (axeTask)
    const k = freeOfKinds(s, p, ks);
    if (k) { v.tool = k; v.why = v.why.replace(/\.$/, '') + '. ' + rader[k].tar; return; }
    const t = TILLVERKA[g];
    if (t && !kyla && t.vill(s, p, gras)) { const m = t.gor(s, p); set(v, m.act, `${what}. ${m.text}`); v.dur = m.min * MIN; if (m.tool) v.tool = m.tool; return; }
  }
}
// hur mycket mer arbetet ger med det redskap som finns ledigt eller kan göras (det bästa först)
function toolGain(s: State, p: Person, act: Act) {
  for (const [g, ks] of Object.entries(toolGroups(act))) {
    if (freeOfKinds(s, p, ks) || TILLVERKA[g]?.vill(s, p, 0)) return ACTS[act].redskap![ks[0]].ger ?? 1;
  }
  return 1;
}
// slakta det fällda viltet vid elden, så länge det tar
function slaughterTask(s: State, v: Val, why: string) {
  set(v, 'slakta', why); v.tool = 'kniv';
  v.dur = Math.min(VAL.slaktMaxTim * HOUR, (vilt(s) / KANIN / SLAKT_TIMME) * HOUR + VAL.extraMin * MIN);
}
// rensa fisken vid elden, så länge det tar
function cleanTask(s: State, v: Val, why: string) {
  set(v, 'rensa', why);
  v.dur = Math.min(VAL.rensaMaxTim * HOUR, (abborrar(s) / DJUR.abborre.timme) * HOUR + VAL.extraMin * MIN);
}
// handarbete vid elden: den som kan göra en kniv gör det när byn saknar en, den som har kniv slaktar viltet, och den
// som kan tvinna rep gör det när byn behöver rep
function craft(s: State, p: Person, v: Val, why: string) {
  if (wantsKnife(s, p)) { set(v, 'kniv', `${why}. Gör en flintkniv.`); v.dur = minOf('kniv') * MIN; return; }
  if (canSlaughter(s, p)) { slaughterTask(s, v, `${why}. Slaktar viltet med kniven.`); return; }
  if (canClean(s, p)) { cleanTask(s, v, `${why}. Rensar fisken.`); return; }
  set(v, 'hantverk', why);
  if (wantsRope(s, p)) { v.tool = 'rep'; v.why = `${why}. Tvinnar rep av hö.`; }
}

// egen lust: vila, hantverk, umgänge, promenad, bad eller att sitta vid stranden. u = hur akut byn behöver arbete
function leisure(s: State, p: Person, v: Val, u: number, lazy: number, ai: number) {
  const now = s.now;
  const wv = (1 - p.rest) * VAL.vilaVikt + lazy * VAL.vilaLat;
  const wh = (p.skill.hantverk / VAL.hantSkill + p.pot.flit / VAL.hantFlit) * (u < VAL.hantLugn ? VAL.hantLugnVikt : VAL.hantAkutVikt);
  const wsoc = (1 - p.social) * VAL.umgasVikt;
  // promenad: den nyfikne går gärna ut och ser sig omkring. Bad: när det är varmt i vattnet
  const calm = u < VAL.lugn ? 1 : VAL.lugnAkut, temp = temperature(s), shore = bathSpot(s);
  const wp = (VAL.promBas + stat(p, 'nyfikenhet', now) / VAL.promNyfiken) * calm;
  const wb = temp >= VAL.badTemp && shore ? clamp((temp - VAL.badNoll) / VAL.badSpann, 0, VAL.badMax) * calm : 0;
  // sitta vid stranden och se ut över vattnet: lugnt, året om, mest för den som inte är så sällskaplig
  const ws = shore ? (VAL.strandBas + (20 - stat(p, 'empati', now)) / VAL.strandDiv) * calm : 0;
  const r = rnd(s, 'val', p) * (wv + wh + wsoc + wp + wb + ws);
  if (r < wv) set(v, 'vila', lazy > 0.5 ? 'Har det bra och tar det lugnt' : 'Tar en paus');
  else if (r < wv + wh) craft(s, p, v, u < VAL.hantLugn ? 'Byn har det gott ställt, det finns tid för hantverk' : 'Tycker om att göra handarbete');
  else if (r < wv + wh + wsoc) set(v, 'samtal', 'Vill umgås');
  else if (r < wv + wh + wsoc + wp) {
    // nyfikna och modiga går längre bort
    const far = VAL.promNar + (stat(p, 'nyfikenhet', now) + stat(p, 'mod', now)) / 40 * VAL.promBort;
    set(v, 'promenad', far > 12 ? 'Är nyfiken och vill se vad som finns längre bort' : 'Vill sträcka på benen');
    v.spot = walkSpot(s, far); v.dur = (VAL.promMin + rnd(s, 'val', p) * VAL.promSpann) * MIN * VAL.pass;
  } else if (r < wv + wh + wsoc + wp + wb) { set(v, 'bada', `Det är varmt (${Math.round(temp)} grader) och skönt att bada`); v.spot = shore; v.dur = (VAL.badPassMin + rnd(s, 'val', p) * VAL.badPassSpann) * MIN * VAL.pass; }
  else { set(v, 'strand', iIstiden(ai) ? 'Vill se ut över isen en stund' : 'Vill sitta vid vattnet och se ut över sjön'); v.spot = strandSpot(s); v.dur = (VAL.strandMin + rnd(s, 'val', p) * VAL.strandSpann) * MIN * VAL.pass; }
}

// på natten: en vakt, och de andra håller sig vid elden och berättar, gör handarbete, umgås eller sover
function night(s: State, p: Person, v: Val, a: number) {
  const now = s.now;
  const guardDay = yearNo(s, now - VAL.vaktByte * HOUR); // vaktdygnet är kalenderns dygn, förskjutet så att det byts kl. 7
  if (guardDay !== s.lastGuardDay) {
    // välj nattens vakt (modigast med lite slump) bland de vuxna, byts varje natt
    const adults = living(s).filter(q => ageOf(q, now) >= ALDER.vaktFran && ageOf(q, now) < ALDER.vaktTill);
    if (adults.length) {
      s.lastGuardDay = guardDay;
      // ett slumptal per vuxen i byns ordning, sedan den högsta (inte i sorteringens jämförelser: deras antal beror på webbläsaren)
      let g = adults[0], gk = -Infinity;
      for (const q of adults) { const k = q.pot.mod + rnd(s, 'val') * VAL.vaktSlump; if (k > gk) { gk = k; g = q; } }
      avbryt(s, g); g.guardDay = guardDay; // det vakten bar läggs ner där hen står
    }
  }
  if (p.guardDay === guardDay && a >= ALDER.vaktFran) { set(v, 'vakt', 'Håller vakt i natt'); return; }
  const r = rnd(s, 'val', p);
  const story = (p.skill.berattande + (a > VAL.berattaAlder ? VAL.berattaBonus : 0)) / VAL.berattaDiv;
  const craftW = (p.skill.hantverk + stat(p, 'flit', now)) / VAL.nattHantDiv;
  // på natten håller man sig vid lägret; de modiga går lite längre ut i mörkret för att bära in saker
  const near = VAL.nattNar + stat(p, 'mod', now) / 20 * VAL.nattLangt, gt = a >= ALDER.ansvar && r < VAL.nattBara && s.stackar?.length ? haulJob(s, near) : undefined;
  if (gt) { set(v, 'bara', `Mörkt, ${near > 6 ? 'men är modig och ' : ''}${gt.why[0].toLowerCase()}${gt.why.slice(1)}`); v.spot = gt; v.dur = VAL.nattBaraTim * HOUR; }
  else if (a < ALDER.hjalper) { if (r < VAL.nattBarnSamtal) set(v, 'samtal', 'Mörkt, sitter med de vuxna vid elden'); else set(v, 'sova', 'Barn sover på natten'); }
  else if (r < story) set(v, 'beratta', 'Mörkt, berättar för de andra vid elden');
  else if (r < story + craftW) craft(s, p, v, 'Mörkt, gör handarbete vid elden');
  else if (r < VAL.nattSamtal) set(v, 'samtal', 'Mörkt, umgås vid elden');
  else set(v, 'vila', 'Mörkt, vilar vid elden');
}
