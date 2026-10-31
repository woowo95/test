import { ALDER, ageOf, count, franMitt, getRel, isParent, livet, living, log, relKey, stat, think } from './folk';
import { Kroppsdel, SkadaTyp, halsa, skada } from './halsa';
import { die, leave } from './liv';
import { skiljas } from './samtal';
import { upplev } from './uppvaxt';
import { blodas } from './blod';
import { clamp, gauss, rnd } from './slump';
import { isLight } from './tid';
import { Ting, tingOf } from './agande';
import { Act } from './handlingar';
import { SAKER } from './saker';
import { DAY, HOUR, MIN, Person, State, Task } from './typer';
import { formogenheter } from './varde';
import { balans } from './balans';
import { LARM, handelse, larma, skitsnack, skitsnackOm } from './rykten';

// Humöret (steg 3.2, "Humör, psykiskt mående och ondska" i designdokumentet): ett grundläge, behoven och tankarna
// (think i folk.ts), och förväntningarna (steg 3.2.1). Var och en vänjer sig långsamt vid sin rikedom, värdet av det hen
// äger plus en del av byns gemensamma. Den som blivit rikare än hen är van vid blir gladare och den som blivit fattigare
// ledsnare, och den som är van vid mycket kräver mer för att vara glad. Så blir en rik by inte glad bara av att vara rik,
// och en by som går dåligt vänjer sig.
// Utbrotten (steg 3.2.2): den som mår mycket dåligt kan brista ut. Risken varje timme växer ju lägre humöret är och ju fler
// utbrott hen haft nyss, och hur allvarligt det blir beror också på empatin och slumpen. Behoven går före (val.ts), och efter
// ett utbrott mår man lite bättre en stund. De allvarliga (steg 3.2.3): ligga kvar i bädden, göra slut, slå, misshandla, flytta
// ut och, mycket sällan, dråp. De som ser det tycker sämre om den som slår (rykten.ts), och ett barn som blir slaget av sin förälder minns det alltid.
// Barnen (steg 3.2.4) skriker och gråter, trotsar och slår sönder något, puttas med ett syskon eller springer iväg en
// stund, mer sällan med en förälder nära och efter lek.

// ---------- balanstal (regel 8) ----------
export const HUMOR = balans('humor', {
  bas: 0.55, // grundhumöret
  hungerLag: 0.2, hungerMinus: 0.2, // hungern under 0,2 drar ner humöret med 0,2 ...
  hungerHog: 0.6, hungerPlus: 0.05, // ... och över 0,6 upp 0,05
  viloLag: 0.2, viloMinus: 0.12,
  socialLag: 0.2, socialMinus: 0.1,
  socialHog: 0.7, socialPlus: 0.05,
  halsaLag: 0.6, halsaMinus: 0.12,
  // förväntningarna (steg 3.2.1)
  forvDygn: 5, // förväntningen glider mot rikedomen; efter så här många dygn har en ändring nästan två tredjedelar slagit igenom
  forvC: 30, // läggs till både rikedom och förväntan, så att den som äger nästan inget inte svänger av småsaker
  rikare: 0.06, rikareMax: 0.1, // rikare eller fattigare än man är van vid: rikare * ln((rikedom + forvC) / (förväntan + forvC)), högst ± rikareMax
  normal: 150, // en vanlig förväntan (ungefär vad en vuxen äger i en by som klarar sig), som inte ger något
  van: 0.04, vanMax: 0.1, // van vid mer eller mindre än normal: −van * ln((förväntan + forvC) / (normal + forvC)), högst ± vanMax
  visa: 0.01, // mindre än så här räknas inte
  // utbrotten (steg 3.2.2)
  grans: 0.35, // under detta humör finns en risk för utbrott
  risk: 0.03, // risken i timmen (på dagen) vid humöret 0; vid gränsen 0, rakt emellan
  eskal: 0.5, // varje utbrott nyss ökar risken med så stor del
  utbDygn: 3, // utbrotten nyss klingar av: efter så här många dygn är ett nästan två tredjedelar glömt
  vantar: 6, // timmar ett utbrott väntar på att behoven är klara (annars blir det inget)
  grad2: 0.75, // allvaret (hur långt under gränsen, delat med gränsen, plus det nedan) från vilket det blir grad 2
  allvUtb: 0.15, // allvaret ökar så mycket per utbrott nyss
  allvEmp: 0.3, // ... och med (10 − empatin) / 10 gånger så mycket
  allvSlump: 0.25, // ... och med slumpen (gauss) gånger så mycket
  allvAgg: 0.2, // ... och med (aggressionen − 10) / 10 gånger så mycket (steg 3.7.6)
  aggVal: 1, // bland utbrotten med samma grad väger de våldsamma (hard) 1 + aggVal × (aggressionen − 10) / 10, minst aggMin
  aggMin: 0.2,
  // blodtörsten (steg 3.7.6, 0–1): aggressionen, låg empati och dåligt humör, så här mycket var
  torstAgg: 0.5, torstEmp: 0.3, torstHumor: 0.4,
  drapTorst: 0.6, // dråp också för den vars blodtörst är minst så här stor (och har minst drapUtb utbrott nyss)
  lattnad: 0.1, lattnadTim: 6, // "Fick ur mig det": så mycket bättre humör i så många timmar efter ett utbrott
  elakHumor: 0.08, elakTim: 12, // den som någon var elak mot: så mycket sämre humör i så många timmar
  elakOp: 6, // ... och relationen sjunker så mycket
  malAvst: 15, // den man är elak mot är den närmaste inom så många rutor ...
  argOp: -25, // ... eller den inom malAvst man tycker minst om, om relationen är högst så här (hämnd, steg 3.7.17)
  // de allvarliga utbrotten (steg 3.2.3)
  grad3: 1, grad4: 1.25, grad5: 1.5, // allvaret från vilket det blir grad 3 (bädden, göra slut, slå), 4 (misshandel, flytta ut) och 5 (dråp)
  drapEmp: 6, drapUtb: 2, // dråp bara för den som har högst så här mycket empati och minst så här många utbrott nyss (annars misshandel)
  barnSla: 0.25, // den som slår och har ett barn nära slår barnet med den här chansen
  brytOp: 50, // den som bryter en vänskap: relationen sjunker så mycket ...
  brytTanke: 0.15, brytDygn: 3, // ... och den andra mår så mycket sämre i så många dygn
  flyttaVuxna: 2, // man flyttar ut bara om minst så här många andra vuxna blir kvar (annars flyr man ut i skogen)
  // barnens utbrott (steg 3.2.4), från ALDER.smabarn
  foraldNara: 6, foraldRisk: 0.5, // med en förälder inom så många rutor är risken så stor del
  lekTim: 6, lekRisk: 0.5, // inom så många timmar efter lek är risken så stor del
  puttHumor: 0.05, puttTim: 4, puttOp: 3, // det syskon som blir puttat: så mycket sämre humör i så många timmar, och relationen
});

// ---------- utbrotten (steg 3.2.2–3.2.3) ----------
// slagen av utbrott: graden (1 lindrigast, 5 dråp), handlingen (handlingar.ts), hur länge (minuter: min plus upp till spann) och
// vad som hände (loggen). `mal` säger vem det går ut över (den närmaste, partnern eller bästa vännen, eller ärkefienden) och
// `ting` att det behövs en sak att slå sönder; finns ingen blir det `annars` (eller tjura). `vald` är slagen: skadornas grad
// (från, till), hur många, vilka och var, hur mycket relationen med den slagne sjunker och den slagnes tanke (hur mycket, dygn).
// De som såg det får intrycket att den som slog är våldsam (rykten.ts, steg 3.3.1). `hard` = våldsamt: den aggressiva väljer det hellre (steg 3.7.6). `skvaller` = den närmaste att snacka skit
// med, om det finns någon man ogillar. Att flytta ut händer direkt (utbrottRisk)
type Mal = 'nast' | 'nara' | 'arke' | 'syskon' | 'skvaller';
interface Vald { g: [number, number]; n: number; typer: SkadaTyp[]; delar: Kroppsdel[]; op: number; tanke: number; dygn: number }
interface UtbDef { grad: number; act: Act; min: number; spann: number; text: string; mal?: Mal; ting?: true; annars?: string; vald?: Vald; barn?: true; hard?: true }
export const UTBROTT = {
  grata: { grad: 1, act: 'grata', min: 20, spann: 20, text: 'brister i gråt' },
  tjura: { grad: 1, act: 'tjura', min: 60, spann: 60, text: 'går undan och tjurar' },
  elak: { grad: 2, act: 'elak', min: 10, spann: 10, text: 'är elak mot', mal: 'nast', hard: true },
  skitsnack: { grad: 2, act: 'skvallra', min: 10, spann: 10, text: 'snackar skit med', mal: 'skvaller', annars: 'elak' }, // steg 3.3.3 (rykten.ts)
  krossa: { grad: 2, act: 'krossa', min: 10, spann: 10, text: 'slår sönder', ting: true, hard: true },
  fly: { grad: 2, act: 'fly', min: 90, spann: 90, text: 'flyr ut i skogen' },
  badd: { grad: 3, act: 'badd', min: 240, spann: 240, text: 'lägger sig och orkar inte gå upp' },
  slut: { grad: 3, act: 'slut', min: 10, spann: 10, text: 'gör slut med', mal: 'nara', annars: 'elak' },
  sla: { grad: 3, act: 'sla', min: 5, spann: 5, text: 'slår', mal: 'nast', hard: true, vald: { g: [0.1, 0.3], n: 1, typer: ['blamarke'], delar: ['huvud', 'bal', 'armV', 'armH'], op: 15, tanke: 0.15, dygn: 2 } },
  misshandel: { grad: 4, act: 'sla', min: 10, spann: 10, text: 'misshandlar', mal: 'nast', hard: true, vald: { g: [0.3, 0.7], n: 2, typer: ['blamarke', 'krossar', 'benbrott'], delar: ['huvud', 'bal', 'armV', 'armH', 'benV', 'benH'], op: 35, tanke: 0.3, dygn: 5 } },
  flytta: { grad: 4, act: 'fly', min: 0, spann: 0, text: 'står inte ut längre och lämnar byn', annars: 'fly' },
  drap: { grad: 5, act: 'sla', min: 10, spann: 10, text: 'slår ihjäl', mal: 'arke', annars: 'misshandel', vald: { g: [1, 1], n: 0, typer: [], delar: [], op: 0, tanke: 0, dygn: 0 } },
  // barnens (steg 3.2.4): bara de, och de har bara dessa
  skrika: { grad: 1, act: 'skrika', min: 10, spann: 20, text: 'skriker och gråter', barn: true },
  trotsa: { grad: 2, act: 'krossa', min: 5, spann: 5, text: 'trotsar och slår sönder', ting: true, hard: true, annars: 'puttas', barn: true },
  puttas: { grad: 2, act: 'elak', min: 5, spann: 5, text: 'puttas med', mal: 'syskon', hard: true, annars: 'skrika', barn: true },
  rymma: { grad: 2, act: 'fly', min: 30, spann: 30, text: 'springer iväg en stund', barn: true },
} satisfies Record<string, UtbDef>;
export type Utbrott = keyof typeof UTBROTT;
const UTB: Record<Utbrott, UtbDef> = UTBROTT;
const UTB_LISTA = Object.keys(UTBROTT) as Utbrott[], VUXNAS = UTB_LISTA.filter(k => !UTB[k].barn), BARNENS = UTB_LISTA.filter(k => UTB[k].barn);
export const UTBROTT_ACTS = [...new Set(UTB_LISTA.filter(k => k !== 'flytta').map(k => UTB[k].act))] as Act[];

// den närmaste p kan vara elak mot (eller slå), och en sak p kan slå sönder (sin egen helst, annars byns; ingen som någon har i
// handen, på sig eller i en börda)
// arg: helst den nära som p är arg på (tjuven efter en upptäckt stöld, steg 3.7.17)
export function utbMal(s: State, p: Person, arg = false) {
  let b: Person | undefined, bd = HUMOR.malAvst, a: Person | undefined, ao = HUMOR.argOp;
  for (const q of living(s)) {
    if (q === p || ageOf(q, s.now) < ALDER.smabarn) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bd) { bd = d; b = q; }
    const op = arg && d < HUMOR.malAvst ? s.rels[relKey(p.id, q.id)]?.op : undefined;
    if (op !== undefined && op <= ao) { ao = op; a = q; }
  }
  return a ?? b;
}
export function utbTing(s: State, p: Person): Ting | undefined {
  const fria = tingOf(s).filter(t => t.hos === undefined && t.bar === undefined && t.lass === undefined && !t.halv);
  const egna = fria.filter(t => t.agare === p.id);
  const av = egna.length ? egna : fria.filter(t => t.agare === 0);
  return av.length ? av[Math.floor(rnd(s, 'humor', p) * av.length)] : undefined;
}
// den det går ut över: den närmaste (den som slår tar ibland sitt eget barn, steg 3.2.3), partnern eller bästa vännen, eller
// ärkefienden om hen är nära
function malFor(s: State, p: Person, k: Utbrott, m: Mal) {
  const nar = (q: Person) => Math.hypot(q.x - p.x, q.y - p.y) < HUMOR.malAvst;
  if (m === 'nara') return living(s).find(q => q.id === p.partner) ?? living(s).find(q => q.id === p.bast);
  if (m === 'arke') return living(s).find(q => q.id === p.arke && nar(q));
  if (m === 'skvaller') { const l = utbMal(s, p); return l && skitsnackOm(s, p, l) ? l : undefined; }
  if (m === 'syskon') return living(s).find(q => q !== p && ((q.mother !== undefined && q.mother === p.mother) || (q.father !== undefined && q.father === p.father)) && ageOf(q, s.now) >= ALDER.smabarn && nar(q));
  if (k === 'sla' && rnd(s, 'humor', p) < HUMOR.barnSla) {
    const barn = living(s).filter(c => isParent(p, c) && ageOf(c, s.now) >= ALDER.smabarn && ageOf(c, s.now) < ALDER.vuxen && nar(c));
    if (barn.length) return barn[Math.floor(rnd(s, 'humor', p) * barn.length)];
  }
  return utbMal(s, p, true);
}
// blodtörsten (steg 3.7.6): aggressionen, låg empati och dåligt humör, 0–1
export const blodtorst = (s: State, p: Person) => clamp(HUMOR.torstAgg * franMitt(p, 'aggression', s.now) - HUMOR.torstEmp * franMitt(p, 'empati', s.now) + HUMOR.torstHumor * (0.5 - moodOf(p, s.now)) * 2, 0, 1);
// dråp kräver låg empati eller stor blodtörst, och flera utbrott nyss
const kanDrapa = (s: State, p: Person) => (stat(p, 'empati', s.now) <= HUMOR.drapEmp || blodtorst(s, p) >= HUMOR.drapTorst) && (p.utb ?? 0) >= HUMOR.drapUtb;

// utbrottet som väntar hos p (eller inget, om det väntat för länge): slaget, med vem eller vad, och hur länge
export function utbrottNu(s: State, p: Person): { k: Utbrott; rad: UtbDef; dur: number; mal?: Person; ting?: Ting } | undefined {
  const u = p.ubr;
  if (!u) return;
  p.ubr = undefined;
  if (s.now - u.t > HUMOR.vantar * HOUR || !(u.k in UTBROTT)) return;
  let k = u.k as Utbrott, mal: Person | undefined, ting: Ting | undefined;
  for (;;) { // finns ingen att gå ut över, eller inget att slå sönder, blir det något lindrigare
    const rad = UTB[k];
    mal = rad.mal ? malFor(s, p, k, rad.mal) : undefined; ting = rad.ting ? utbTing(s, p) : undefined;
    if ((!rad.mal || mal) && (!rad.ting || ting) && (k !== 'drap' || kanDrapa(s, p))) break;
    k = (rad.annars ?? 'tjura') as Utbrott;
  }
  const rad = UTB[k];
  return { k, rad, mal, ting, dur: (rad.min + rnd(s, 'humor', p) * rad.spann) * MIN };
}

// p slår q: skadorna (eller döden), relationen, den slagnes tanke och de som såg det (rykten.ts). Ett barn som blir slaget av sin förälder minns det
// alltid, och värre om det händer igen
function slar(s: State, p: Person, q: Person, k: Utbrott, v: Vald) {
  const r = getRel(s, p, q);
  r.op = clamp(r.op - v.op, -100, 100);
  handelse(s, p, k === 'drap' ? 'drap' : k === 'misshandel' ? 'misshandel' : 'sla', q);
  if (k === 'drap') { count(s, 'drap'); blodas(s, q.x, q.y, 'skada', 1); die(s, q, 'drap'); return; }
  for (let i = 0; i < v.n; i++) {
    const t = v.typer[Math.floor(rnd(s, 'humor', p) * v.typer.length)], d = v.delar[Math.floor(rnd(s, 'humor', p) * v.delar.length)];
    const dod = skada(s, q, d, t, v.g[0] + rnd(s, 'humor', p) * (v.g[1] - v.g[0]), 'drap', `när ${p.name} slog hen`);
    if (dod) { count(s, 'drap'); die(s, q, dod); return; }
  }
  think(q, `${p.name} slog mig`, -v.tanke, s.now, v.dygn * DAY);
  if (isParent(p, q) && ageOf(q, s.now) < ALDER.vuxen) {
    count(s, 'utb_barn'); livet(s, p, 'slogBarn');
    upplev(s, q, q.upp?.some(u => u.k === 'slagen') ? 'slagenIgen' : 'slagen', p.name);
  }
}

// när utbrottet börjar: loggen, statistiken och den som får ta emot det
export function utbrottBorjar(s: State, p: Person, k: Utbrott, mal?: Person, ting?: Ting) {
  const rad = UTB[k];
  count(s, 'utbrott'); count(s, 'utb_' + k);
  p.utb = (p.utb ?? 0) + 1;
  if (!rad.barn && rad.grad >= 2 && rnd(s, 'humor', p) < LARM.falskt) larma(s, p.x, p.y, 'fara', 1 + Math.floor(rnd(s, 'humor', p) * 5), [p], true); // ett falskt larm (steg 3.7.11)
  if (mal) {
    const van = k === 'slut' && p.partner !== mal.id;
    log(s, `${p.name} mår dåligt och ${van ? 'bryter vänskapen med' : rad.text} ${mal.name}.`, 'rel', [p.id, mal.id]);
    if (k === 'elak') {
      think(mal, `${p.name} var elak mot mig`, -HUMOR.elakHumor, s.now, HUMOR.elakTim * HOUR);
      getRel(s, p, mal).op -= HUMOR.elakOp;
      handelse(s, p, 'elak', mal);
    } else if (k === 'skitsnack') {
      skitsnack(s, p, mal);
    } else if (k === 'puttas') {
      think(mal, `${p.name} puttade mig`, -HUMOR.puttHumor, s.now, HUMOR.puttTim * HOUR);
      getRel(s, p, mal).op -= HUMOR.puttOp;
    } else if (k === 'slut') {
      const r = getRel(s, p, mal);
      if (!van) skiljas(s, p, mal, r);
      else { r.op = clamp(r.op - HUMOR.brytOp, -100, 100); think(mal, `${p.name} bröt vänskapen`, -HUMOR.brytTanke, s.now, HUMOR.brytDygn * DAY); }
    } else if (rad.vald) slar(s, p, mal, k, rad.vald);
  } else log(s, `${p.name} mår dåligt och ${rad.text}${ting ? (ting.agare === p.id ? ' sin egen ' : ' byns ') + (SAKER[ting.k]?.namn ?? ting.k).toLowerCase() : ''}.`, 'rel', [p.id]);
}

// symbolen för utbrottets grad (steg 3.10.13): utbrottet är uppgiftens task.tool (val.ts)
export const utbIkon = (t: Task) => t.tool && t.tool in UTBROTT ? 'utb' + UTB[t.tool as Utbrott].grad : undefined;

// när utbrottet är över (steg.ts): saken är sönder, och man mår lite bättre
export function utbrottKlar(s: State, p: Person, t: Task) {
  if (t.act === 'krossa' && t.ref !== undefined) {
    const x = tingOf(s).find(q => q.id === t.ref && q.hos === undefined && q.bar === undefined && q.lass === undefined);
    if (x) { s.ting = tingOf(s).filter(q => q !== x); count(s, 'utb_sonder_' + x.k); }
  }
  think(p, 'Fick ur mig det', HUMOR.lattnad, s.now, HUMOR.lattnadTim * HOUR);
}

// att flytta ut (steg 3.2.3) händer direkt, inte som en handling: bara den som inte har en partner i byn, och bara om minst
// HUMOR.flyttaVuxna andra vuxna blir kvar. Barnen som inte har den andra föräldern i byn följer med
export function flyttaUt(s: State, p: Person) {
  const folk = living(s), now = s.now;
  if (folk.some(q => q.id === p.partner) || folk.filter(q => q !== p && ageOf(q, now) >= ALDER.vuxen).length < HUMOR.flyttaVuxna) return false;
  const barn = folk.filter(c => isParent(p, c) && ageOf(c, now) < ALDER.vuxen && !folk.some(o => o !== p && isParent(o, c)));
  utbrottBorjar(s, p, 'flytta');
  for (const g of [p, ...barn]) leave(s, g);
  count(s, 'utvandrade', 1 + barn.length);
  return true;
}

// risken för ett utbrott den här timmen (på dagen): större ju sämre p mår och ju fler utbrott nyss. Ett barn brister mer sällan
// med en förälder nära och efter lek
export function utbrottChans(s: State, p: Person) {
  const m = moodOf(p, s.now);
  if (m >= HUMOR.grans) return 0;
  let risk = HUMOR.risk * (HUMOR.grans - m) / HUMOR.grans * (1 + HUMOR.eskal * (p.utb ?? 0));
  if (ageOf(p, s.now) < ALDER.vuxen) {
    if (living(s).some(q => isParent(q, p) && Math.hypot(q.x - p.x, q.y - p.y) < HUMOR.foraldNara)) risk *= HUMOR.foraldRisk;
    if (p.lekt !== undefined && s.now - p.lekt < HUMOR.lekTim * HOUR) risk *= HUMOR.lekRisk;
  }
  return risk;
}

// en gång i timmen (stepHumor): utbrotten nyss klingar av, och den som mår mycket dåligt kan brista ut (barnen bara i sina slag). Graden beror på
// hur dåligt hen mår, utbrotten nyss, empatin och slumpen; slaget slumpas bland dem med den graden
export function utbrottRisk(s: State, p: Person, ljust: boolean) {
  if (p.utb) { p.utb *= Math.exp(-HOUR / (HUMOR.utbDygn * DAY)); if (p.utb < 0.01) p.utb = undefined; }
  const a = ageOf(p, s.now), barn = a < ALDER.vuxen;
  if (p.task?.act === 'leka' && p.task.phase === 'do') p.lekt = s.now; // barnen: leken (steg 3.2.4)
  if (!ljust || p.ubr || a < ALDER.smabarn) return;
  const m = moodOf(p, s.now);
  if (m >= HUMOR.grans) return;
  const djup = (HUMOR.grans - m) / HUMOR.grans, utb = p.utb ?? 0;
  if (rnd(s, 'humor', p) >= utbrottChans(s, p)) return;
  const allv = djup + HUMOR.allvUtb * utb + HUMOR.allvEmp * (10 - stat(p, 'empati', s.now)) / 10 + HUMOR.allvSlump * gauss(s, 'humor', p) + HUMOR.allvAgg * franMitt(p, 'aggression', s.now);
  let grad = allv >= HUMOR.grad5 ? 5 : allv >= HUMOR.grad4 ? 4 : allv >= HUMOR.grad3 ? 3 : allv >= HUMOR.grad2 ? 2 : 1;
  if (barn) grad = Math.min(grad, 2);
  const av = (barn ? BARNENS : VUXNAS).filter(k => UTB[k].grad === grad);
  const ag = Math.max(HUMOR.aggMin, 1 + HUMOR.aggVal * franMitt(p, 'aggression', s.now)); // den aggressiva slår hellre (steg 3.7.6)
  const w = av.map(k => UTB[k].hard ? ag : 1);
  let u = rnd(s, 'humor', p) * w.reduce((a, b) => a + b, 0), k = av[av.length - 1];
  for (let i = 0; i < av.length; i++) { u -= w[i]; if (u < 0) { k = av[i]; break; } }
  if (k === 'flytta') { if (flyttaUt(s, p)) return; k = 'fly'; }
  p.ubr = { k, t: s.now };
}


// ---------- humöret ----------
// snitthumöret i byn; `tom` är värdet när ingen lever
export function avgMood(s: State, tom: number) { const l = living(s); return l.length ? l.reduce((a, p) => a + moodOf(p, s.now), 0) / l.length : tom; }
// humöret och, om ut finns med, delarna det består av (personrutan visar dem). Samma räkning i båda fallen
export function moodOf(p: Person, now: number, ut?: { namn: string; v: number }[]) {
  let m = HUMOR.bas;
  const del = (namn: string, v: number) => { m += v; ut?.push({ namn, v }); };
  if (p.hunger < HUMOR.hungerLag) del('Hungrig', -HUMOR.hungerMinus); else if (p.hunger > HUMOR.hungerHog) del('Mätt', HUMOR.hungerPlus);
  if (p.rest < HUMOR.viloLag) del('Trött', -HUMOR.viloMinus);
  if (p.social < HUMOR.socialLag) del('Ensam', -HUMOR.socialMinus); else if (p.social > HUMOR.socialHog) del('Umgåtts mycket', HUMOR.socialPlus);
  if (halsa(p) < HUMOR.halsaLag) del('Mår dåligt', -HUMOR.halsaMinus);
  if (p.forv) {
    const r = forvRikare(p.forv), v = forvVan(p.forv.f);
    if (Math.abs(r) >= HUMOR.visa) del(r > 0 ? 'Rikare än förut' : 'Fattigare än förut', r);
    if (Math.abs(v) >= HUMOR.visa) del(v < 0 ? 'Van vid mer' : 'Van vid lite', v);
  }
  for (const t of p.thoughts) if (t.until > now) del(t.text, t.v);
  return clamp(m, 0, 1);
}

// ---------- förväntningarna (steg 3.2.1) ----------
const forvRikare = (f: { f: number; w: number }) => clamp(HUMOR.rikare * Math.log((f.w + HUMOR.forvC) / (f.f + HUMOR.forvC)), -HUMOR.rikareMax, HUMOR.rikareMax);
const forvVan = (f: number) => clamp(-HUMOR.van * Math.log((f + HUMOR.forvC) / (HUMOR.normal + HUMOR.forvC)), -HUMOR.vanMax, HUMOR.vanMax);

// en gång i timmen (steg.ts): utbrotten (utbrottRisk) och var och ens rikedom (w) och förväntan (f). Ett barn räknar med föräldrarnas rikedom
// (den rikaste av dem som lever), eftersom det lever på deras. Den som är ny börjar med förväntan lika med rikedomen
export function stepHumor(s: State) {
  const folk = living(s);
  if (!folk.length) return;
  const { egen, byn } = formogenheter(s), del = byn / folk.length;
  const vuxen = (p: Person) => (egen.get(p.id) ?? 0) + del;
  const ids = new Set(folk.map(p => p.id));
  const k = 1 - Math.exp(-HOUR / (HUMOR.forvDygn * DAY)), ljust = isLight(s.now);
  for (const p of folk) {
    let w = vuxen(p);
    if (ageOf(p, s.now) < ALDER.vuxen) {
      const f = [p.mother, p.father].filter(id => id !== undefined && ids.has(id)).map(id => vuxen(folk.find(q => q.id === id)!));
      if (f.length) w = Math.max(...f);
    }
    if (!p.forv) p.forv = { f: w, w };
    else { p.forv.w = w; p.forv.f += (w - p.forv.f) * k; }
    utbrottRisk(s, p, ljust);
  }
}
