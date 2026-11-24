// ---------- lönelagen (steg 10.5.9 och 14.1.4) ----------
// Lönen är en teknik som kräver lag: man kan komma på den i samtal när byn tagit in LON.skattFor i skatt (grundvärde). Lönelagen
// säger hur mycket byn högst bjuder för en arbetstimme, och gäller bara så länge skattelagen gäller. Anställningarna och lönerna
// står i dagsarbete.ts; här är lagen, tekniken, budgetdelarna och medborgarlönen.
import { Person, State } from './typer';
import { knows } from './teknik';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, ageOf, count, living, log } from './folk';
import { LAGAR, LagTalDef, lagGaller } from './lagar';
import { fjardedel, lutning } from './seder';
import { fromByn } from './lager';
import { BUDGET, BUDGET_LIST, BudgetDef, budgetLonKrok } from './budget';
import { BYN } from './egendom';
import { lonNu, skuldFor } from './dagsarbete';

export const LON = balans('lon', {
  skattFor: 100, // så mycket (grundvärde) byn tagit in i skatt innan någon kan komma på lönen
  start: 0.5, // lönen per arbetad timme från början, i silver (hälften av värdet av en arbetstimme)
  omt: 1, // lönen läggs till omtanken om byn så här mycket, gånger lönen delat med värdet av en arbetstimme
  anst: 0.1, // den som är anställd av byn vill att byn ska bjuda så här mycket mer, gånger lönen från början
  medborgar: 2, // medborgarlönen: så mycket silver varje vuxen får per år, när delen fått det den saknar
  prio: 0.6, // hur väl lönelagen väcks som fråga när någon kan lön
  lutar: 0.3, // så mycket lutningen mot Sammanhållning flyttar rösten om lönelagen och lönen var och en vill ha
});

const vuxna = (s: State) => living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vuxen);
// en gång i timmen, efter omtanken (TAKTER): den som är anställd av byn bryr sig mer om byns arbete, efter lönen per timme och
// den del av lönen man fått
export function lonOmtanke(s: State) {
  for (const p of living(s)) if (p.anst && p.anst.av === BYN && p.omt !== undefined) p.omt += LON.omt * p.anst.w * (p.lonFick ?? 1);
}

const TIM: LagTalDef = {
  namn: 'lönen per timme', ord: 'lön', sym: '💰', stege: [0.25, 0.5, 1, 2], start: LON.start, visa: v => `${v} silver`,
  // den som arbetar mycket för byn vill ha mer, och lutningen mot Sammanhållning drar uppåt
  vill: (s, p) => LON.start * (1 + LON.lutar * lutning(s, p) + (p.anst?.av === BYN ? LON.anst : 0)),
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
