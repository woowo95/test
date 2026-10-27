import { Act, DAY, HOUR, MIN, Person, SEC, State, Task } from './typer';
import { halvOf, newTing, tingOf } from './agande';
import { takeRecipe } from './behov';
import { BYN } from './egendom';
import { alive, byId, count, living } from './folk';
import { put } from './lager';
import { isForest, tileOf } from './mark';
import { GORS, borjaTool, minOf, toolDone } from './redskap';
import { fallTid } from './skog';
import { startStation, tillbehorDef } from './stationer';
import { dorrDef } from './byggnad';
import { DRICKA_ACTS, drickMin } from './torst';
import { HALSA } from './halsa';

// ---------- påbörjat arbete (steg 1.5.14) ----------
// Ett redskap görs i ett enda arbete, men arbetet kan avbrytas (natten, toan, kylan). Det som inte blev klart blir en sak,
// ett påbörjat redskap (ett ting av slaget `paborjat` med `halv`, agande.ts): materialet tas när arbetet börjar, och det
// som är kvar av arbetet sparas. Bara den som började kan arbeta vidare på det. Det ägs och går i arv som andra saker och är
// värt vad materialet är värt. Medan ingen arbetar med det slits det fort (HALV_TID) och blir till sist sitt material igen,
// som tillhör den som äger det: ingenting går förlorat.
// Ett träd som någon har börjat fälla står kvar halvfällt (s.halvfallt), och vem som helst med yxa kan fälla det färdigt.
// Arbetstiden räknas från att man kommit fram, så att vägen dit inte äter av den. Handlingarna där ett redskap görs och vad
// de kan ge står i GORS (redskap.ts), som läser det ur saker.ts.
export const HALV_TID = 2 * DAY; // så länge ett påbörjat redskap håller när ingen arbetar med det (två år i spelet)
export const GA_TID = HOUR; // så länge man högst går till arbetet innan man väljer något annat
export const GOR_ACTS = Object.keys(GORS) as Act[];
// handlingar där arbetstiden räknas från att man kommit fram
export const startsOnArrival = (act: Act) => !!GORS[act] || act === 'falla' || act === 'station' || act === 'tillbehor' || act === 'dorr' || DRICKA_ACTS.has(act) || act === 'varda'; // och att dricka (torst.ts) och vården (halsa.ts)
const halvById = (s: State, id?: number) => id === undefined ? undefined : tingOf(s).find(t => t.id === id && t.halv);

// framme: arbeta vidare på det man har påbörjat, eller ta materialet och börja. Saknas materialet blir det inget
export function startWork(s: State, p: Person, tk: Task) {
  if (tk.act === 'station') { startStation(s, p, tk); return; } // en station byggs vidare där den står (stationer.ts)
  if (tk.act === 'dorr') { tk.until = s.now + (dorrDef(tk.tool)?.min ?? 0) * MIN; return; } // en dörr i en öppning (bygg.ts)
  if (DRICKA_ACTS.has(tk.act)) { tk.until = s.now + drickMin(tk.act) * MIN; return; } // att dricka (torst.ts)
  if (tk.act === 'varda') { tk.until = s.now + HALSA.vardMin * MIN; return; } // vården (halsa.ts)
  if (tk.act === 'tillbehor') { tk.until = s.now + (tillbehorDef(tk.tool ?? '')?.min ?? 0) * MIN; return; } // ett tillbehör till en möbel (stationer.ts)
  if (tk.act === 'falla') { const i = tileOf(tk.tx, tk.ty); tk.until = s.now + Math.max(0, fallTid(s, i) - (s.halvfallt?.[i] ?? 0)); return; }
  const ger = GORS[tk.act];
  if (!ger) return;
  let t = halvOf(s, p, ger);
  if (!t) {
    const k = borjaTool(s, p, tk.act);
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
// arbetet är klart: det påbörjade blir ett redskap (true)
export function finishHalf(s: State, p: Person, tk: Task) {
  const t = halvById(s, tk.ref);
  if (!t || !GORS[tk.act] || t.halv!.kvar > MIN) return false; // (arbetet är klart när tiden är slut; annars ligger det kvar)
  s.ting = tingOf(s).filter(q => q !== t);
  toolDone(s, p, t.halv!.gor);
  return true;
}
// varje timme: det som ingen arbetar med slits, och det som är utslitet blir sitt material igen hos ägaren.
// Halvfällda träd som inte längre står där glöms
export function stepPaborjat(s: State) {
  const iArbete = new Set(living(s).filter(q => q.task?.phase === 'do' && GORS[q.task.act]).map(q => q.task!.ref));
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
