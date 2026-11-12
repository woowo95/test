import { Act, DAY, HOUR, MIN, Person, SEC, State, Task } from './typer';
import { LJUS, UPPSATT } from './ljus';
import { halvOf, newTing, tingOf } from './agande';
import { takeRecipe } from './behov';
import { BYN } from './egendom';
import { alive, byId, count, living } from './folk';
import { put, stacksOf } from './lager';
import { SAKER } from './saker';
import { isForest, tileOf } from './mark';
import { GORS, borjaTool, minOf, toolDone } from './redskap';
import { fallTid } from './skog';
import { fartVid, startStation, tillbehorDef } from './stationer';
import { dorrDef } from './byggnad';
import { DRICKA_ACTS, TORST, drickMin, startSmalta } from './torst';
import { halMin } from './is';
import { ACTS } from './handlingar';
import { balans } from './balans';
import { HALSA } from './halsa';
import { startOdla } from './odling';

// ---------- påbörjat arbete (steg 1.5.14) ----------
// Ett redskap görs i ett enda arbete, men arbetet kan avbrytas (natten, toan, kylan). Det som inte blev klart blir en sak,
// ett påbörjat redskap (ett ting av slaget `paborjat` med `halv`, agande.ts): materialet tas när arbetet börjar, och det
// som är kvar av arbetet sparas. Bara den som började kan arbeta vidare på det. Det ägs och går i arv som andra saker och är
// värt vad materialet är värt. Medan ingen arbetar med det slits det fort (HALV_TID) och blir till sist sitt material igen,
// som tillhör den som äger det: ingenting går förlorat.
// Ett träd som någon har börjat fälla står kvar halvfällt (s.halvfallt), och vem som helst med yxa kan fälla det färdigt.
// Arbetstiden räknas från att man kommit fram, så att vägen dit inte äter av den. Handlingarna där ett redskap görs och vad
// de kan ge står i GORS (redskap.ts), som läser det ur saker.ts.
const PABORJAT = balans('paborjat', {
  halvDygn: 2, // så många dygn (år i spelet) håller ett påbörjat redskap när ingen arbetar med det
  gaTim: 1, // så många timmar går man högst till arbetet innan man väljer något annat
});
export const HALV_TID = PABORJAT.halvDygn * DAY;
export const GA_TID = PABORJAT.gaTim * HOUR;
export const GOR_ACTS = Object.keys(GORS) as Act[];
// handlingar där arbetstiden räknas från att man kommit fram: att göra ett redskap, de med framme i ACTS och att dricka (torst.ts)
export const startsOnArrival = (act: Act) => !!GORS[act] || !!ACTS[act]?.framme || DRICKA_ACTS.has(act);
const halvById = (s: State, id?: number) => id === undefined ? undefined : tingOf(s).find(t => t.id === id && t.halv);

// framme: arbeta vidare på det man har påbörjat, eller ta materialet och börja. Saknas materialet blir det inget
export function startWork(s: State, p: Person, tk: Task) {
  if (tk.act === 'station') { startStation(s, p, tk); return; } // en station byggs vidare där den står (stationer.ts)
  if (tk.act === 'odla') { startOdla(s, p, tk); return; } // på fältet (odling.ts)
  if (tk.act === 'ljus') { tk.until = s.now + LJUS.min * MIN; return; } // ett talgljus på bordet (ljus.ts)
  if (tk.act === 'uppsatt') { tk.until = s.now + UPPSATT.min * MIN; return; } // en uppsatt fackla (ljus.ts)
  if (tk.act === 'dorr') { tk.until = s.now + (dorrDef(tk.tool)?.min ?? 0) * MIN; return; } // en dörr i en öppning (bygg.ts)
  if (DRICKA_ACTS.has(tk.act)) { tk.until = s.now + drickMin(s, p, tk.act) * MIN; startSmalta(s, p, tk); return; } // att dricka (torst.ts); snön i en kruka vid elden (steg 10.2.50)
  if (tk.act === 'varda') { tk.until = s.now + HALSA.vardMin * MIN; return; } // vården (halsa.ts)
  if (tk.act === 'vatten') { tk.until = s.now + (TORST.fyllMin + halMin(s, p)) * MIN; return; } // vattensäcken fylls (torst.ts), med hålet i isen (is.ts)
  if (tk.act === 'tillbehor') { tk.until = s.now + (tillbehorDef(tk.tool ?? '')?.min ?? 0) * MIN; return; } // ett tillbehör till en möbel (stationer.ts)
  if (tk.act === 'falla') { const i = tileOf(tk.tx, tk.ty); tk.until = s.now + Math.max(0, fallTid(s, i) - (s.halvfallt?.[i] ?? 0)); return; }
  // framme: arbetet tar sin tid från framkomsten, inte det som blev över av tiden för vägen dit; den som redan stod där står inte
  // och väntar (steg 9.2.130)
  if (tk.arbTid !== undefined && ACTS[tk.act]?.framme) { tk.until = s.now + tk.arbTid; tk.arbTid = undefined; return; }
  const ger = GORS[tk.act];
  if (!ger) return;
  tk.hamtat = undefined; // materialet som bars hit ligger redan i det påbörjade (steg 9.2.43)
  let t = halvOf(s, p, ger);
  if (!t) {
    const k = borjaTool(s, p, tk.act, tk.handel ? tk.tool : undefined); // till handlaren: slaget hen ska ha (steg 6.2.11)
    if (!k) { tk.ref = undefined; tk.until = s.now; return; }
    t = newTing(s, 'paborjat', 1, p.id);
    t.halv = { gor: k, av: takeRecipe(s, p, k), kvar: minOf(k) * MIN, ag: p.id };
  } else count(s, 'fortsatt'); // byns statistik: arbete som avbröts och togs upp igen
  tk.ref = t.id; tk.until = s.now + t.halv!.kvar / fartVid(s, p, tk.act); // vid slöjdbänken lite fortare (stationer.ts)
}
// medan man arbetar: arbetet går framåt och det påbörjade slits inte
export function workHalf(s: State, p: Person, tk: Task, dtSec: number) {
  if (tk.act === 'falla') { const i = tileOf(tk.tx, tk.ty), h = (s.halvfallt ??= {}); h[i] = (h[i] ?? 0) + dtSec * SEC; return; }
  const t = halvById(s, tk.ref);
  if (t) { t.halv!.kvar = Math.max(0, t.halv!.kvar - dtSec * SEC * fartVid(s, p, tk.act)); t.c = 1; }
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

// ---------- hämtningen (steg 9.2.43, Hämtningen i designdokumentet) ----------
// Inget flyttas av sig självt: den som ska göra något och inte har påbörjat det går först till lagret där materialet ligger,
// tar det (det påbörjade skapas där, med materialet i), bär det i det hen bär (task.hamtat) och börjar först framme vid platsen.
// Svarar true när hen gick till lagret i stället för att börja
export function hamtaForst(s: State, p: Person, tk: Task) {
  const ger = GORS[tk.act];
  if (!ger || tk.site || halvOf(s, p, ger)) return false;
  const k = borjaTool(s, p, tk.act, tk.handel ? tk.tool : undefined);
  if (!k) return false;
  const av = Object.keys(SAKER[k]?.skaffa?.av ?? {});
  if (!av.length) return false;
  // den närmaste stacken av något av materialet; ligger det inte i en stack (hos någon, i en kista) börjar man som förut
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (const a of stacksOf(s)) if (av.includes(a.k) && a.n >= 1) { const d = Math.hypot(a.x + 0.5 - p.x, a.y + 0.5 - p.y); if (d < bd) { bd = d; bast = { x: a.x + 0.5, y: a.y + 0.5 }; } }
  if (!bast || bd < 1) return false;
  tk.site = { x: tk.tx, y: tk.ty }; tk.tx = bast.x; tk.ty = bast.y; tk.phase = 'go'; tk.hamta = 1;
  count(s, 'hamtar');
  return true;
}
// framme vid lagret: materialet tas (det påbörjade skapas med det i) och bärs till platsen. Fanns det inte längre slutar arbetet
export function hamtat(s: State, p: Person, tk: Task) {
  const ger = GORS[tk.act]!, site = tk.site!;
  tk.site = undefined; tk.hamta = undefined;
  const k = borjaTool(s, p, tk.act, tk.handel ? tk.tool : undefined);
  if (!k) { tk.until = s.now; return; }
  const t = newTing(s, 'paborjat', 1, p.id);
  t.halv = { gor: k, av: takeRecipe(s, p, k), kvar: minOf(k) * MIN, ag: p.id };
  if (!halvOf(s, p, ger)) { tk.until = s.now; return; }
  tk.hamtat = Object.fromEntries(Object.entries(t.halv.av).filter(([, n]) => n > 0));
  tk.tx = site.x; tk.ty = site.y; tk.phase = 'go';
}
