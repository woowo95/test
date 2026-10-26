import { Act, DAY, HOUR, MIN, Person, SEC, State, Task } from './typer';
import { halvOf, newTing, tingOf } from './agande';
import { takeRecipe } from './behov';
import { BYN } from './egendom';
import { alive, byId, count, living } from './folk';
import { put } from './lager';
import { isForest, tileOf } from './mark';
import { SPJUT, basketDone, canMakeBasket, canMakeKnife, canMakeRod, canStartSpear, knifeDone, minOf, rodDone, spearDone, spearKind } from './redskap';
import { axeDone, canMakeAxe, fallTid } from './skog';

// ---------- påbörjat arbete (steg 1.5.14) ----------
// Ett redskap görs i ett enda arbete, men arbetet kan avbrytas (natten, toan, kylan). Det som inte blev klart blir en sak,
// ett påbörjat redskap (ett ting av slaget `paborjat` med `halv`, agande.ts): materialet tas när arbetet börjar, och det
// som är kvar av arbetet sparas. Bara den som började kan arbeta vidare på det. Det ägs och går i arv som andra saker och är
// värt vad materialet är värt. Medan ingen arbetar med det slits det fort (HALV_TID) och blir till sist sitt material igen,
// som tillhör den som äger det: ingenting går förlorat.
// Ett träd som någon har börjat fälla står kvar halvfällt (s.halvfallt), och vem som helst med yxa kan fälla det färdigt.
// Arbetstiden räknas från att man kommit fram, så att vägen dit inte äter av den. GOR: varje handling där ett redskap görs,
// vad den kan ge, vad den börjar göra och vad som händer när det är klart. Ett nytt redskap blir en rad.
export const HALV_TID = 2 * DAY; // så länge ett påbörjat redskap håller när ingen arbetar med det (två år i spelet)
export const GA_TID = HOUR; // så länge man högst går till arbetet innan man väljer något annat
interface Gor { ger: readonly string[]; borja: (s: State, p: Person) => string | undefined; klar: (s: State, p: Person, k: string) => void }
const GOR: Partial<Record<Act, Gor>> = {
  yxa: { ger: ['yxa'], borja: (s, p) => canMakeAxe(s, p) ? 'yxa' : undefined, klar: (s, p) => axeDone(s, p) },
  spjut: { ger: SPJUT, borja: (s, p) => { const k = spearKind(s, p); return canStartSpear(s, p, k) ? k : undefined; }, klar: (s, p, k) => spearDone(s, p, k) },
  metspo: { ger: ['metspo'], borja: (s, p) => canMakeRod(s, p) ? 'metspo' : undefined, klar: (s, p) => rodDone(s, p) },
  kniv: { ger: ['kniv'], borja: (s, p) => canMakeKnife(s, p) ? 'kniv' : undefined, klar: (s, p) => knifeDone(s, p) },
  korg: { ger: ['korg'], borja: (s, p) => canMakeBasket(s, p) ? 'korg' : undefined, klar: (s, p) => basketDone(s, p) },
};
export const GOR_ACTS = Object.keys(GOR) as Act[];
// handlingar där arbetstiden räknas från att man kommit fram
export const startsOnArrival = (act: Act) => !!GOR[act] || act === 'falla';
const halvById = (s: State, id?: number) => id === undefined ? undefined : tingOf(s).find(t => t.id === id && t.halv);

// framme: arbeta vidare på det man har påbörjat, eller ta materialet och börja. Saknas materialet blir det inget
export function startWork(s: State, p: Person, tk: Task) {
  if (tk.act === 'falla') { const i = tileOf(tk.tx, tk.ty); tk.until = s.now + Math.max(0, fallTid(s, i) - (s.halvfallt?.[i] ?? 0)); return; }
  const g = GOR[tk.act];
  if (!g) return;
  let t = halvOf(s, p, g.ger);
  if (!t) {
    const k = g.borja(s, p);
    if (!k) { tk.ref = undefined; tk.until = s.now; return; }
    t = newTing(s, 'paborjat', 1, p.id);
    t.halv = { gor: k, av: takeRecipe(s, p, k), kvar: minOf(k) * MIN, ag: p.id };
  } else count(s, 'fortsatt'); // byns statistik: arbete som avbröts och togs upp igen
  tk.ref = t.id; tk.until = s.now + t.halv!.kvar;
}
// medan man arbetar: arbetet går framåt och det påbörjade slits inte
export function workHalf(s: State, _p: Person, tk: Task, dtSec: number) {
  if (tk.act === 'falla') { const i = tileOf(tk.tx, tk.ty), h = (s.halvfallt ??= {}); h[i] = (h[i] ?? 0) + dtSec * SEC; return; }
  const t = halvById(s, tk.ref);
  if (t) { t.halv!.kvar = Math.max(0, t.halv!.kvar - dtSec * SEC); t.c = 1; }
}
// arbetet är klart: det påbörjade blir ett redskap
export function finishHalf(s: State, p: Person, tk: Task) {
  const t = halvById(s, tk.ref), g = GOR[tk.act];
  if (!t || !g || t.halv!.kvar > MIN) return; // (arbetet är klart när tiden är slut; annars ligger det kvar)
  s.ting = tingOf(s).filter(q => q !== t);
  g.klar(s, p, t.halv!.gor);
}
// varje timme: det som ingen arbetar med slits, och det som är utslitet blir sitt material igen hos ägaren.
// Halvfällda träd som inte längre står där glöms
export function stepPaborjat(s: State) {
  const iArbete = new Set(living(s).filter(q => q.task?.phase === 'do' && GOR[q.task.act]).map(q => q.task!.ref));
  for (const t of tingOf(s)) {
    if (!t.halv || iArbete.has(t.id)) continue;
    t.c -= HOUR / HALV_TID;
    if (t.c > 1e-9) continue;
    const o = byId(s, t.agare), agare = t.agare !== BYN && o && alive(o) ? t.agare : undefined;
    for (const [k, n] of Object.entries(t.halv.av)) if (n > 1e-9) put(s, k, n, agare !== undefined ? { [agare]: n } : undefined);
    t.c = 0; count(s, 'upplost');
  }
  if (tingOf(s).some(t => t.halv && t.c <= 1e-9)) s.ting = tingOf(s).filter(t => !t.halv || t.c > 1e-9);
  for (const k in s.halvfallt ?? {}) if (!isForest(s, +k)) delete s.halvfallt![+k];
}
