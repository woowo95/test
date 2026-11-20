// ---------- lönen ur skatten (steg 10.5.9) ----------
// Lönen är en teknik som kräver lag: man kan komma på den i samtal när byn tagit in LON.skattFor i skatt (grundvärde). Den gäller
// när lönelagen röstats igenom, och bara så länge skattelagen gäller. Arbete för byn ger lön per arbetad timme: att bygga byns
// hus, vägar och bryggor, byns projekt, vakten och att bära mat, ved och tändmaterial till byns förråd. Det som bärs hem i ett
// sådant arbete blir byns. Eget arbete ger aldrig lön. Lönen betalas en gång per dygn (ett år i spelet), efter budgeten, ur den
// budgetdel arbetet hör till: delens silver först, sedan hela saker av den mat byn har över bufferten. Det som inte kan betalas
// stryks; den som inte fick sin lön blir missnöjd varje timme och arbetar mindre för byn. I valet av arbete läggs lönen till
// omtanken om byn, gånger den del av lönen man verkligen fått de senaste åren.
import { DAY, HOUR_S, Person, State } from './typer';
import { knows } from './teknik';
import { forsorjer } from './behov';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, ageOf, count, living, log, think } from './folk';
import { LAGAR, LagTalDef, lagGaller, lagTal } from './lagar';
import { drar } from './seder';
import { ARBETE, grundvarde } from './varde';
import { ownMove, ownsId } from './lager';
import { BUDGET, BUDGET_LIST, BudgetDef, BUDGET_KVAR, budgetId, bynsAv, budgetLonKrok } from './budget';
import { fromByn } from './lager';
import { bitById } from './byggnad';
import { FOOD } from './saker';
import { foodDaysAll } from './ekonomi';
import { buffert } from './forradsmal';
import type { Task } from './typer';

export const LON = balans('lon', {
  skattFor: 100, // så mycket (grundvärde) byn tagit in i skatt innan någon kan komma på lönen
  start: 0.5, // lönen per arbetad timme från början, i silver (hälften av värdet av en arbetstimme)
  miss: 0.01, // den som inte fick sin lön blir så här mycket missnöjd per timme, gånger den del som inte betalades
  omt: 1, // lönen läggs till omtanken om byn så här mycket, gånger lönen delat med värdet av en arbetstimme
  minne: 0.5, // så stor del av den del av lönen man fått som är fjolårets; resten är åren innan
  medborgar: 2, // medborgarlönen: så mycket silver varje vuxen får per år, när delen fått det den saknar
  prio: 0.6, // hur väl lönelagen väcks som fråga när någon kan lön
  lutar: 0.3, // så mycket lutningen mot Sammanhållning flyttar rösten om lönelagen och lönen var och en vill ha
});

const lutning = (s: State, p: Person) => clamp(drar(s, p).gemenskap ?? 0, -1, 1);
export const lonNu = (s: State) => lagGaller(s, 'lon') && lagGaller(s, 'skatt');
const vuxna = (s: State) => living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vuxen);
// föräldern som försörjer p, modern först
const forsorjare = (s: State, p: Person) => [p.mother, p.father].map(id => living(s).find(q => q.id === id)).find(g => !!g && forsorjer(s, g, p));
const fjardedel = (x: number) => clamp(Math.round(x * 4) / 4, 0, 1);

// budgetdelen som p:s arbete just nu betalas ur, om det är arbete för byn
export function lonDel(s: State, tk?: Task): string | undefined {
  if (!tk || !lonNu(s)) return undefined;
  if (tk.act === 'vakt') return 'vakter';
  if (tk.lon) return tk.lon;
  if (tk.act === 'bygga') { const b = bitById(s, tk.ref); if (b) return BUDGET.byggen.bit!(s, b) ? 'byggen' : BUDGET.vagar.bit!(s, b) ? 'vagar' : undefined; }
  return undefined;
}
// lönen delen är skyldig för årets timmar, i hela silver uppåt (det budgeten ska ge delen)
const skuldFor = (s: State, del: string) => { const w = lagTal(s, 'lon', 'tim'); let n = 0; for (const p of living(s)) n += (p.lonTim?.[del] ?? 0) * w; return Math.ceil(n - 1e-9); };

// varje minut (TAKTER): timmarna för byn räknas per budgetdel, och den som inte fick sin lön blir missnöjd
export function lonRakna(s: State, dt: number) {
  if (!lonNu(s)) return;
  for (const p of living(s)) {
    if (p.gast) continue;
    const d = lonDel(s, p.task);
    if (d) (p.lonTim ??= {})[d] = (p.lonTim[d] ?? 0) + dt / HOUR_S;
    if (p.lonObetald) p.missnoje = clamp((p.missnoje ?? 0) + LON.miss * p.lonObetald * dt / HOUR_S, 0, 1);
  }
}
// en gång i timmen, efter omtanken (TAKTER): lönen läggs till omtanken om byn, gånger den del av lönen man fått
export function lonOmtanke(s: State) {
  if (!lonNu(s)) return;
  const w = lagTal(s, 'lon', 'tim') / ARBETE;
  for (const p of living(s)) if (!p.gast && p.omt !== undefined) p.omt += LON.omt * w * (p.lonFick ?? 1);
}
// en gång per dygn, efter budgeten: var och en får sin lön ur delen arbetet hör till
export function lonDygn(s: State) {
  if (!lonNu(s)) { for (const p of s.people) if (p.lonTim || p.lonObetald) { p.lonTim = undefined; p.lonObetald = undefined; } return; }
  const w = lagTal(s, 'lon', 'tim');
  for (const p of living(s)) {
    const tim = p.lonTim;
    if (!tim) { p.lonObetald = undefined; continue; }
    p.lonTim = undefined;
    const till = forsorjare(s, p) ?? p; // hela barnets lön betalas till föräldern som försörjer det (steg 10.5.10)
    let skuld = 0, fick = 0;
    for (const d of Object.keys(tim).sort()) {
      const x = tim[d] * w, n = Math.floor(x + 1e-9);
      if (x - n > 1e-9) (p.lonTim ??= {})[d] = (x - n) / w; // timmarna mot nästa silver räknas till nästa år
      if (n < 1) continue;
      skuld += n;
      const silver = Math.floor(Math.min(n, ownsId(s, budgetId(d), 'silver')) + 1e-9), m = silver >= 1 ? ownMove(s, 'silver', silver, budgetId(d), till.id) : 0;
      let kvar = n - m;
      if (m >= 1) count(s, 'lonSilver', m);
      // resten i hela saker av den mat byn har över bufferten, så länge en sak inte är värd mer än det som är kvar: byns egen,
      // och den som ingen matdel i budgeten fått (BUDGET_KVAR, steg 12.1.77)
      for (const k of FOOD) {
        const v = grundvarde(k);
        while (kvar >= v - 1e-9 && v > 0 && foodDaysAll(s) > buffert(s, 'mat')) {
          if (bynsAv(s, k) >= 1) { if (fromByn(s, k, 1, till.id) < 1) break; }
          else if (ownsId(s, BUDGET_KVAR, k) >= 1) { if (ownMove(s, k, 1, BUDGET_KVAR, till.id) < 1) break; }
          else break;
          kvar -= v; count(s, 'lonVaror', 1);
        }
      }
      fick += n - Math.max(0, kvar);
      if (kvar > 1e-9) count(s, 'lonStruket', kvar);
    }
    if (skuld <= 0) continue;
    const andel = clamp(fick / skuld, 0, 1);
    p.lonFick = (p.lonFick ?? 1) * (1 - LON.minne) + andel * LON.minne;
    p.lonObetald = andel < 1 - 1e-9 ? 1 - andel : undefined;
    if (p.lonObetald) think(p, 'Fick inte hela sin lön', -0.1, s.now, DAY / 4);
  }
}

const TIM: LagTalDef = {
  namn: 'lönen per timme', ord: 'lön', sym: '💰', stege: [0.25, 0.5, 1, 2], start: LON.start, visa: v => `${v} silver`,
  // den som arbetar mycket för byn vill ha mer, och lutningen mot Sammanhållning drar uppåt
  vill: (s, p) => LON.start * (1 + LON.lutar * lutning(s, p) + Object.values(p.lonTim ?? {}).reduce((a, x) => a + x, 0) / 100),
};
const DELAR: Record<string, BudgetDef> = {
  vakter: {
    namn: 'Vakter och försvar', sym: '🛡️', text: 'Silver till lönen för dem som håller vakt',
    finns: lonNu, saknar: () => ({}),
    vill: (s, p) => fjardedel(0.25 + 0.25 * lutning(s, p) + (p.task?.act === 'vakt' ? 0.25 : 0)),
  },
  forradet: {
    namn: 'Förrådet', sym: '📦', text: 'Silver till lönen för dem som bär mat, ved och tändmaterial till byns förråd',
    finns: lonNu, saknar: () => ({}),
    vill: (s, p) => fjardedel(0.5 + 0.25 * lutning(s, p)),
  },
  medborgarlon: {
    namn: 'Medborgarlön', sym: '🤝', text: 'Lika mycket silver till varje vuxen',
    finns: lonNu, saknar: s => { const n = vuxna(s).length * LON.medborgar; const m: Record<string, number> = {}; if (n > 0) m.silver = n; return m; },
    ge: (s, k, n) => {
      const vv = vuxna(s), per = Math.floor(n / Math.max(1, vv.length));
      if (per < 1) return 0;
      let gav = 0;
      for (const p of vv) { const m = fromByn(s, k, per, p.id); count(s, 'medborgarlon', m); gav += m; }
      if (gav >= 1) log(s, `Varje vuxen fick ${per} silver i medborgarlön ur byns förråd.`, 'world');
      return gav;
    },
    vill: (s, p) => fjardedel(0.25 + 0.5 * lutning(s, p)),
  },
};
// lagen, tekniken och delarna läggs till när allt är laddat (steg.ts)
export function lonRegister() {
  for (const id in DELAR) { BUDGET[id] = DELAR[id]; if (!BUDGET_LIST.includes(id)) BUDGET_LIST.push(id); }
  budgetLonKrok.f = skuldFor;
  LAGAR.lon = {
    namn: 'Lön', sym: '💰', text: 'Byn betalar den som arbetar för byn per timme, ur budgeten', straff: 0, om: 'att arbetet för byn inte gav något', tek: 'lon',
    kan: s => lagGaller(s, 'skatt'),
    prio: s => LON.prio * clamp(living(s).length / 20, 0, 1),
    rost: (s, p) => ({ v: 0.2 + LON.lutar * lutning(s, p), why: 'Vill att arbetet för byn ska löna sig' }),
    tal: { tim: TIM },
  };
}
// tänker man på lön i samtal (samtal.ts): den som kan lag, när byn tagit in nog i skatt
export const lonTankbar = (s: State, p: Person) => knows(p, 'lag') && (s.stat?.skattVarde ?? 0) >= LON.skattFor;
