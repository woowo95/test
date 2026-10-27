// Törst (steg 2.4.1 och 2.4.2). Törsten är ett eget behov (p.torst, 1 = släckt, 0 = uttorkad) och slås inte ihop med mättnaden.
// Man dricker vid vattnet och bär inte hem det. Vattnet är olika smutsigt på olika ställen (smutsOf i sjo.ts); smutsigt vatten
// ger ont i magen, och var vattnet är rent eller smutsigt blir lärdomar (slaget 'vatten' i minne.ts) som sprids i samtal.
// När sjön är frusen i istiden smälter man snö vid elden. Den som är för varm (steg 2.3.4) eller arbetar tungt törstar fortare.
// Sätten att dricka står i registret DRICKA; val.ts väljer när, steg.ts räknar törsten och vad som händer när man dricker
import { ACTS } from './handlingar';
import { ALDER, count, isSick, think } from './folk';
import { areaOf, findL, observe } from './minne';
import { smutsOf } from './sjo';
import { shoreOf } from './fynd';
import { getMap, perKarta } from './karta';
import { bitAt } from './byggnad';
import { clamp, rnd } from './slump';
import { iIstiden, ageIndex } from './tid';
import { Act, H, HOUR, HOUR_S, Person, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';

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
  mag: 0.4, // chansen att få ont i magen är vattnets smuts gånger detta ...
  magMin: 2, magSpann: 4, // ... och man är sjuk i magMin + slump × magSpann timmar
});

// sätten att dricka (registret): handlingen, platsen den görs på, när den väljs och skälet
interface DrickaDef { act: Act; why: string; min: () => number; nar: (s: State) => boolean }
export const DRICKA: DrickaDef[] = [
  // istiden: sjön är frusen, och den som kan smälter snö vid en brinnande eld
  { act: 'smalta', why: 'Är törstig och smälter snö vid elden', min: () => TORST.snoMin, nar: s => iIstiden(ageIndex(s)) && s.fire.lit },
  { act: 'dricka', why: 'Är törstig och går och dricker vid vattnet', min: () => TORST.drickMin, nar: () => true },
];
export const DRICKA_ACTS = new Set<Act>(DRICKA.map(d => d.act));
// så många minuter man dricker när man kommit fram (paborjat.ts: tiden räknas från framkomsten)
export const drickMin = (act: Act) => DRICKA.find(d => d.act === act)?.min() ?? 0;

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
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, k = yy * W + xx;
      if (inMap(xx, yy) && !ok[k] && t[k] !== T.Vatten) { ok[k] = 1; st.push(k); }
    }
  }
  return ok;
});
// hur smutsigt personen tror att vattnet är i ett område: det hen minns, och för resten en gissning
function tror(p: Person, a: number) {
  const l = findL(p, 'vatten', a);
  return l ? l.v * l.c + TORST.okant * (1 - l.c) : TORST.okant;
}
// var man dricker: den strandruta i närheten som är bäst när vägen dit och smutsen man tror finns vägs ihop. Utan strand i
// närheten den närmaste som går att nå. undefined = det finns inget vatten att nå
export function drickPlats(s: State, p: Person) {
  const sh = shoreOf(s.seed), nb = nabar(s.seed), px = Math.floor(p.x), py = Math.floor(p.y), tro = new Map<number, number>();
  let best: { x: number; y: number } | undefined, bs = Infinity;
  const prova = (x: number, y: number, nara: boolean) => {
    const i = y * W + x;
    if (!inMap(x, y) || !sh[i] || !nb[i] || bitAt(s, x, y)) return;
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
  const d = DRICKA.find(x => x.nar(s))!;
  if (d.act === 'smalta') return { act: d.act, why: d.why, min: d.min() };
  const spot = drickPlats(s, p);
  if (!spot) return undefined;
  return { act: d.act, why: iIstiden(ageIndex(s)) ? 'Är törstig och hugger upp isen för att dricka' : d.why, min: d.min(), spot };
}
// framme: man dricker. Vid vattnet lär man sig hur smutsigt det är där, och smutsigt vatten kan ge ont i magen
export function drick(s: State, p: Person, t: Task) {
  p.torst = 1;
  if (t.act === 'smalta') { count(s, 'smalt sno'); return; }
  count(s, 'drack');
  const x = Math.floor(t.tx), y = Math.floor(t.ty), smuts = inMap(x, y) ? smutsOf(s.seed)[y * W + x] : 0;
  observe(s, p, 'vatten', x, y);
  if (smuts > 0 && !isSick(p, s.now) && rnd(s, 'halsa', p) < smuts * TORST.mag) {
    p.sickUntil = s.now + (TORST.magMin + rnd(s, 'halsa', p) * TORST.magSpann) * HOUR; p.sickWhy = 'Ont i magen av smutsigt vatten';
    think(p, 'Fick ont i magen av vattnet', -0.1, s.now, 6 * HOUR);
    count(s, 'magont av vatten');
  }
}
