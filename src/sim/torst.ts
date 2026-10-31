// Törst (steg 2.4.1 och 2.4.2). Törsten är ett eget behov (p.torst, 1 = släckt, 0 = uttorkad) och slås inte ihop med mättnaden.
// Man dricker vid vattnet och bär inte hem det. Vattnet är olika smutsigt på olika ställen (smutsOf i sjo.ts); smutsigt vatten
// ger ont i magen, och var vattnet är rent eller smutsigt blir lärdomar (slaget 'vatten' i minne.ts) som sprids i samtal.
// När isen ligger på sjön smälter man snö vid elden, eller hugger upp ett hål i isen (steg 2.11.3, is.ts). Den som är för varm (steg 2.3.4) eller arbetar tungt törstar fortare.
// Sätten att dricka står i registret DRICKA; val.ts väljer när, steg.ts räknar törsten och vad som händer när man dricker.
// Med vattensäcken (steg 2.10.1) hämtar en vuxen vatten åt den som inte kan gå och ligger hemma; utan säck får hen vatten av
// de andra (fatt), och när törsten blir farlig också om säcken inte kommer
import { strandNu } from './sjo';
import { ACTS } from './handlingar';
import { ALDER, ageOf, alive, byId, count, forstaGang, isSick, living, log, think } from './folk';
import { areaOf, findL, observe } from './minne';
import { magont, vattenSmuts } from './smuts';
import { getMap, perKarta } from './karta';
import { bitAt, gridOf } from './byggnad';
import { stationRutor } from './stationer';
import { groundOf } from './mark';
import { clamp, rnd } from './slump';
import { halMin, halVal, islagt, naVattnet } from './is';
import { Act, GRANNAR4, H, HOUR, HOUR_S, Person, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { hemma, kanGa } from './halsa';
import { freeTools, nTools } from './agande';
import { wearUsed } from './redskap';
import { Falt, faltById, faltOf, faltRutor } from './odling';
import { TORKA } from './torka';

// ---------- balanstal (regel 8) ----------
export const TORST = balans('torst', {
  tim: 9, // timmar från släckt törst till uttorkad för den som är vaken och inte arbetar tungt
  somn: 0.4, // i sömnen törstar man så här mycket långsammare
  varm: 1.5, // den som är varmare än idealet törstar 1 + varm × (värmen − 1) gånger fortare (steg 2.4.2) ...
  tungt: 1.5, // ... och den som arbetar tungt så här mycket fortare
  torstig: 0.45, // under detta går man och dricker (högre för den lata, lat) ...
  lat: 0.1,
  farligt: 0.15, // ... och under detta genast, före allt annat utom toa-nöden; det är också "mycket törstig" i historiken
  laker: 0.2, // hälsan läker bara när törsten är över detta
  tomTim: 6, // timmar som det tar att törsta ihjäl från full hälsa när törsten är slut
  drickMin: 3, // så många minuter man dricker vid vattnet ...
  snoMin: 15, // ... och så länge det tar att smälta snö vid elden
  sok: 16, // man dricker vid stranden inom så här många rutor ...
  smutsPris: 25, // ... och går hellre så här många rutor längre än till vatten man tror är helt smutsigt
  okant: 0.3, // så smutsigt tror man att vatten man inte vet något om är
  mag: 0.2, // chansen att få ont i magen är vattnets smuts gånger detta (0,4 före balansen av fas 2, steg 2.12.1) ...
  magMin: 2, magSpann: 4, // ... och man är sjuk i magMin + slump × magSpann timmar
  fyllMin: 3, // så många minuter det tar att fylla vattensäcken vid vattnet (steg 2.10.1)
  hamtaR: 30, // man hämtar vatten åt den som inte kan gå och är högst så här många rutor bort
});

// sätten att dricka (registret): handlingen, platsen den görs på, när den väljs och skälet
interface DrickaDef { act: Act; why: string; min: () => number; nar: (s: State, p: Person) => boolean }
export const DRICKA: DrickaDef[] = [
  // den som inte kan gå och är hemma får vatten av de andra där hen ligger (steg 2.5.2, halsa.ts)
  // Har byn en vattensäck väntar hen på den som hämtar vatten i den, tills törsten blir farlig (steg 2.10.1)
  { act: 'fatt', why: 'Kan inte gå och får vatten av de andra', min: () => TORST.drickMin, nar: (s, p) => !kanGa(p) && hemma(s, p) && (nTools(s, 'vattensack') < 1 || tortarFarligt(p)) },
  // isen ligger på sjön: den som kan smälter snö vid en brinnande eld, annars hugger man upp ett hål i isen
  { act: 'smalta', why: 'Är törstig och smälter snö vid elden', min: () => TORST.snoMin, nar: s => islagt(s) && s.fire.lit },
  { act: 'dricka', why: 'Är törstig och går och dricker vid vattnet', min: () => TORST.drickMin, nar: () => true },
];
export const DRICKA_ACTS = new Set<Act>(DRICKA.map(d => d.act));
// så många minuter man dricker när man kommit fram (paborjat.ts: tiden räknas från framkomsten), med hålet i isen
export const drickMin = (s: State, p: Person, act: Act) => (DRICKA.find(d => d.act === act)?.min() ?? 0) + (act === 'dricka' ? halMin(s, p) : 0);

// törsten per timme just nu, och delarna den beror på (personrutan visar dem)
export function torstDelar(p: Person) {
  const pd = p.task && ACTS[p.task.act];
  const somn = p.task?.act === 'sova', varm = Math.max(0, p.warm - 1), tungt = !!pd?.tungt && p.task!.phase === 'do';
  const takt = (somn ? TORST.somn : 1) * (1 + TORST.varm * varm) * (tungt ? TORST.tungt : 1) / TORST.tim;
  return { takt, somn, varm, tungt };
}
// törsten i behovsstegen (steg.ts). Små barn får dricka av de vuxna
export function torstSteg(s: State, p: Person, a: number, dtSec: number) {
  if (a < ALDER.smabarn) { p.torst = 1; return; }
  p.torst = clamp(p.torst - dtSec / HOUR_S * torstDelar(p).takt, 0, 1);
  if (p.torst < TORST.farligt) think(p, 'Är mycket törstig', -0.15, s.now, HOUR);
}
export const torstig = (p: Person, lazy: number) => p.torst < TORST.torstig + TORST.lat * lazy;
export const tortarFarligt = (p: Person) => p.torst < TORST.farligt;

// stranden som går att nå till fots från elden (inte en ö), en gång per karta
const nabar = perKarta(seed => {
  const t = getMap(seed).tiles, f = getMap(seed).fire, ok = new Uint8Array(W * H), st = [Math.floor(f.y) * W + Math.floor(f.x)];
  ok[st[0]] = 1;
  while (st.length) {
    const j = st.pop()!, x = j % W, y = (j - x) / W;
    for (const [dx, dy] of GRANNAR4) {
      const xx = x + dx, yy = y + dy, k = yy * W + xx;
      if (inMap(xx, yy) && !ok[k] && t[k] !== T.Vatten) { ok[k] = 1; st.push(k); }
    }
  }
  return ok;
});
// de sammanhängande områdena man kan gå i, med samma regler som vägsökningen (vag.ts): inte genom vatten, väggar eller
// förvaring. Räknas om när något byggs (s.byggV). Ett hus vid vattnet kan stänga in en bit strand som ingen når; den som
// valde att dricka där kom aldrig fram, valde samma plats igen och törstade ihjäl (steg 2.12.6). 0 = går inte att stå på
const omraden = new WeakMap<State, { key: string; id: Int32Array }>();
function omradeOf(s: State) {
  stationRutor(s); gridOf(s); // väggarna och förvaringen i marken (groundOf) är aktuella
  const key = `${s.byggV ?? 0}:${s.stationer?.length ?? 0}`;
  let o = omraden.get(s);
  if (o?.key === key) return o.id;
  const g = groundOf(s), id = new Int32Array(W * H), stopp = (i: number) => g.tiles[i] === T.Vatten || g.solid?.[i] === 1 || g.hinder?.[i] === 1;
  let n = 0;
  for (let i0 = 0; i0 < W * H; i0++) {
    if (id[i0] || stopp(i0)) continue;
    id[i0] = ++n;
    const st = [i0];
    while (st.length) {
      const j = st.pop()!, x = j % W, y = (j - x) / W;
      for (const [dx, dy] of GRANNAR4) { const xx = x + dx, yy = y + dy, k = yy * W + xx; if (inMap(xx, yy) && !id[k] && !stopp(k)) { id[k] = n; st.push(k); } }
    }
  }
  omraden.set(s, { key, id });
  return id;
}
// hur smutsigt personen tror att vattnet är i ett område: det hen minns, och för resten en gissning
function tror(p: Person, a: number) {
  const l = findL(p, 'vatten', a);
  return l ? l.v * l.c + TORST.okant * (1 - l.c) : TORST.okant;
}
// var man dricker: den strandruta i närheten som är bäst när vägen dit och smutsen man tror finns vägs ihop. Utan strand i
// närheten den närmaste som går att nå. undefined = det finns inget vatten att nå
export function drickPlats(s: State, p: Person) {
  const sh = strandNu(s), nb = nabar(s.seed), m = getMap(s.seed).tiles, px = Math.floor(p.x), py = Math.floor(p.y), tro = new Map<number, number>();
  // området hen står i (eller bredvid, om hen står i en dörr eller vid förvaringen); utan något går hen rakt över som förut
  const id = omradeOf(s), mitt = new Set<number>(), pi = py * W + px;
  if (inMap(px, py)) { if (id[pi]) mitt.add(id[pi]); else for (const [dx, dy] of GRANNAR4) if (inMap(px + dx, py + dy) && id[pi + dy * W + dx]) mitt.add(id[pi + dy * W + dx]); }
  let best: { x: number; y: number } | undefined, bs = Infinity;
  const prova = (x: number, y: number, nara: boolean) => {
    const i = y * W + x;
    if (!inMap(x, y) || !sh[i] || !nb[i] && m[i] !== T.Vatten || bitAt(s, x, y) || (mitt.size && !mitt.has(id[i]))) return;
    const a = areaOf(x, y);
    let t = tro.get(a);
    if (t === undefined) tro.set(a, t = tror(p, a));
    const v = Math.hypot(x - px, y - py) + (nara ? t * TORST.smutsPris : 0);
    if (v < bs) { bs = v; best = { x: x + 0.5, y: y + 0.5 }; }
  };
  for (let y = py - TORST.sok; y <= py + TORST.sok; y++) for (let x = px - TORST.sok; x <= px + TORST.sok; x++) prova(x, y, true);
  if (!best) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) prova(x, y, false); // längre bort: bara den närmaste
  return best;
}
// det som väljs när man är törstig (val.ts): handlingen, skälet, hur länge och var. undefined = inget vatten att nå
export function drickVal(s: State, p: Person) {
  const d = DRICKA.find(x => x.nar(s, p))!;
  if (d.act !== 'fatt' && !kanGa(p) && hemma(s, p)) return undefined; // väntar på vattensäcken
  if (d.act === 'smalta') return { act: d.act, why: d.why, min: d.min() };
  if (d.act === 'fatt') return { act: d.act, why: d.why, min: d.min(), spot: { x: p.x, y: p.y } };
  const h = halVal(s, p);
  if (islagt(s) && !h) return undefined; // isen är för tjock för det man har
  const spot = drickPlats(s, p);
  if (!spot) return undefined;
  return { act: d.act, why: h ? `Är törstig och hugger upp ett hål i isen med ${h.namn} för att dricka` : d.why, min: d.min(), spot };
}
// framme: man dricker. Vid vattnet lär man sig hur smutsigt det är där, och smutsigt vatten kan ge ont i magen
export function drick(s: State, p: Person, t: Task) {
  p.torst = 1;
  if (t.act === 'smalta') { count(s, 'smalt sno'); return; }
  if (t.act === 'fatt') { count(s, 'fick vatten'); return; }
  count(s, 'drack');
  const x = Math.floor(t.tx), y = Math.floor(t.ty);
  observe(s, p, 'vatten', x, y);
  if (inMap(x, y)) smutsigt(s, p, y * W + x);
}
// vattnet från rutan i kan ge ont i magen, efter hur smutsigt det är där (med toa-smutsen i närheten, steg 2.7.2)
function smutsigt(s: State, p: Person, i: number) {
  const smuts = vattenSmuts(s, i);
  if (smuts > 0 && !isSick(p, s.now) && rnd(s, 'halsa', p) < smuts * TORST.mag) {
    p.sickUntil = s.now + (TORST.magMin + rnd(s, 'halsa', p) * TORST.magSpann) * HOUR; p.sickWhy = 'Ont i magen av smutsigt vatten';
    think(p, 'Fick ont i magen av vattnet', -0.1, s.now, 6 * HOUR);
    count(s, 'magont av vatten');
    magont(s, i); // kom smutsen från toaletten lär sig byn något om hygien (smuts.ts)
  }
}

// ---------- vattensäcken (steg 2.10.1) ----------
// Den som inte kan gå och ligger hemma törstar. En vuxen som kan gå tar byns vattensäck, fyller den vid vattnet (där hen
// skulle ha druckit själv) och bär den till hen. Det väljs som vården, före förbättringarna (val.ts). Säcken slits en gång per tur
const hamtas = (s: State, q: Person) => living(s).some(o => o.task?.act === 'vatten' && !o.task.falt && o.task.ref === q.id);
// under torkan (steg 3.8.2) vattnar ägaren sitt fält med säcken när grödan snart vissnar, om ingen annan redan gör det
const vattnas = (s: State, f: Falt) => living(s).some(o => o.task?.act === 'vatten' && o.task.falt && o.task.ref === f.id);
const torrtFalt = (s: State, p: Person) => s.sjoTorr?.pa ? faltOf(s).find(f => f.agare === p.id && f.steg === 'vaxer' && (f.vatten ?? 1) < TORKA.vattna && !vattnas(s, f)) : undefined;
// det som väljs (val.ts): den närmaste som behöver vatten och som ingen annan redan hämtar åt, och vattnet att fylla säcken vid
export function vattenVal(s: State, p: Person): { spot: { x: number; y: number }; ref: number; why: string; falt?: true } | undefined {
  if (ageOf(p, s.now) < ALDER.vuxen || !kanGa(p) || freeTools(s, p, 'vattensack') < 1) return undefined;
  let best: Person | undefined, bd = TORST.hamtaR;
  for (const q of living(s)) {
    if (q === p || kanGa(q) || !torstig(q, 0) || ageOf(q, s.now) < ALDER.smabarn || !hemma(s, q)) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d >= bd || hamtas(s, q)) continue;
    best = q; bd = d;
  }
  const f = best ? undefined : torrtFalt(s, p);
  const spot = (best || f) && naVattnet(s, p) && drickPlats(s, p); // genom isen bara med ett hål (is.ts)
  if (!spot) return undefined;
  return best ? { spot, ref: best.id, why: `Hämtar vatten i säcken åt ${best.name}` } : { spot, ref: f!.id, why: 'Hämtar vatten till sitt fält', falt: true };
}
// säcken är fylld (KLAR i steg.ts): bär den till den törstige. Utan säck i handen blir det inget
export function vattenFylld(s: State, p: Person, t: Task) {
  if (t.falt) { const f = faltById(s, t.ref); if (!t.tool || !f) return; const r = faltRutor(f), i = r[Math.floor(r.length / 2)]; t.phase = 'back'; t.tx = i % W + 0.5; t.ty = Math.floor(i / W) + 0.5; t.why = 'Vattnar sitt fält'; return; }
  const q = byId(s, t.ref);
  if (!t.tool || !q || !alive(q)) return;
  const x = Math.floor(t.tx), y = Math.floor(t.ty);
  observe(s, p, 'vatten', x, y);
  t.vatten = inMap(x, y) ? y * W + x : undefined;
  t.phase = 'back'; t.tx = q.x; t.ty = q.y; t.why = `Bär vatten till ${q.name}`;
}
// framme hos den törstige (arrive i steg.ts): hen dricker, och säcken slits
export function vattenFram(s: State, p: Person, t: Task) {
  if (t.falt) { // vattnet på fältet: en säck räcker till TORKA.sackRutor rutor
    const f = faltById(s, t.ref);
    if (f && f.vatten !== undefined) {
      f.vatten = Math.min(1, f.vatten + TORKA.sackRutor / f.n);
      count(s, 'vattnat');
      if (forstaGang(s, 'vattnat falt')) log(s, `${p.name} bar vatten i säcken till sitt fält för att grödan inte skulle vissna i torkan.`, 'world', [p.id]);
      wearUsed(s, p, 1);
    }
    p.task = undefined; return;
  }
  const q = byId(s, t.ref);
  if (q && alive(q) && Math.hypot(q.x - p.x, q.y - p.y) <= 2) {
    q.torst = 1; // (forstaGang räknar 'bar vatten' varje gång)
    think(q, `${p.name} gav mig vatten`, 0.1, s.now, 12 * HOUR);
    if (forstaGang(s, 'bar vatten')) log(s, `${p.name} bar vatten i säcken till ${q.name}, som inte kunde gå.`, 'world', [p.id, q.id]);
    if (t.vatten !== undefined) smutsigt(s, q, t.vatten);
    wearUsed(s, p, 1);
  }
  p.task = undefined;
}
