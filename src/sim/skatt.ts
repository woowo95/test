// ---------- skatten på rikedomen (steg 10.5.3) ----------
// Med skattelagen betalar varje vuxen över SKATT.alder en gång per dygn (ett år i spelet) en procent av det hen äger
// (förmögenheten i personrutan: hus, djur och påbörjat räknas men är aldrig betalning) till byns förråd. Man betalar med hela
// saker och silver i tre nivåer: först det man har över (över bufferten, redskap man kan avvara och silvret), sedan bufferten
// och ting som inte bärs, sist plaggen man bär och redskapen man arbetar med. I varje nivå väljs det som kommer närmast det som
// är kvar att betala; det man betalar för mycket är byns, och det som fattas faller bort. Medan lagen gäller ger ingen en del av
// det hen skaffar till byn (delning.ts).
import { DAY, Person, State } from './typer';
import { balans } from './balans';
import { ageOf, count, isParent, living, log } from './folk';
import { LAGAR, LagTalDef, efterlevs, lagGaller, lagTal, talPlats } from './lagar';
import { drar } from './seder';
import { clamp } from './slump';
import { formogenhetDelar, grundvarde, tingVarde } from './varde';
import { payable } from './behov';
import { ownMove, ownedStock } from './lager';
import { Ting, tingOf } from './agande';
import { BYN } from './egendom';
import { skuldKrok } from './liv';

export const SKATT = balans('skatt', {
  procent: 0.05, // så stor del av förmögenheten betalas per dygn (år i spelet)
  alder: 18, // från den här åldern (år) betalar man
  timme: 20, // klockan då skatten tas
  hogGanger: 2, // över den övre ribban är procenten så många gånger högre (steg 10.5.4)
  miss: 0.05, // den som betalar en högre procent än hen tycker är rätt blir så här mycket missnöjd per dygn, gånger den del som ligger över
  lutar: 0.5, // så mycket lutningen mot Sammanhållning flyttar den procent var och en vill ha
  skuldMiss: 0.05, // skulden gör så här missnöjd per dygn, gånger skulden delat med förmögenheten (högst 1) (steg 10.5.5)
  skuldMax: 2, // silvret blir högst så här mycket mer värt för den som har en skuld, efter skulden mot det lösa hen äger
});

// en sak man kan betala med: värdet per styck, hur många och hur de lämnas till byn
interface Betalning { v: number; n: number; ta: (m: number) => number }
const avStack = (s: State, p: Person, k: string, n: number): Betalning => ({ v: grundvarde(k), n: Math.floor(n + 1e-9), ta: m => ownMove(s, k, m, p.id, BYN) });
const avTing = (t: Ting): Betalning => ({ v: tingVarde(t), n: 1, ta: () => { t.agare = BYN; t.hos = t.krok = t.bar = undefined; return 1; } });
// ett ting som inte kan lämnas: påbörjat, en protes, en kruka med mat eller vätska, det som ännu torkar och det heliga
const kanGes = (t: Ting) => !t.halv && t.pa === undefined && !t.kok && !t.inne && t.ler === undefined && t.helig === undefined;
const bars = (p: Person, t: Ting) => t.bar === p.id || t.hos === p.id || t.krok === p.id;

// nivåerna i ordning; varje nivå byggs när den behövs, efter det som redan lämnats
function nivaer(s: State, p: Person): (() => Betalning[])[] {
  return [
    () => payable(s, p, []).map(v => v.t ? avTing(v.t) : avStack(s, p, v.k, v.n)),
    () => [
      ...Object.entries(ownedStock(s, p)).map(([k, n]) => avStack(s, p, k, n)),
      ...tingOf(s).filter(t => t.agare === p.id && kanGes(t) && !bars(p, t)).map(avTing),
    ],
    () => tingOf(s).filter(t => t.agare === p.id && kanGes(t) && bars(p, t)).map(avTing),
  ];
}
// p betalar belopp (i grundvärde); ger värdet som lämnades
export function betala(s: State, p: Person, belopp: number) {
  let kvar = belopp, gav = 0;
  for (const niva of nivaer(s, p)) {
    if (kvar <= 1e-9) break;
    const bs = niva().filter(b => b.v > 1e-9 && b.n > 0);
    for (;;) {
      // det som kommer närmast det som är kvar, och bara om det kommer närmare än att inte betala alls
      let bast: Betalning | undefined, bd = kvar;
      for (const b of bs) if (b.n > 0) { const d = Math.abs(kvar - b.v); if (d < bd - 1e-9) { bast = b; bd = d; } }
      if (!bast) break;
      const m = bast.v <= kvar ? Math.min(bast.n, Math.max(1, Math.floor(kvar / bast.v + 1e-9))) : 1, fick = bast.ta(m);
      if (fick <= 0) { bast.n = 0; continue; }
      bast.n -= fick; kvar -= fick * bast.v; gav += fick * bast.v;
      if (kvar <= 1e-9) break;
    }
  }
  return gav;
}
// förmögenheten hos var och en och snittet bland dem i skatteåldern, en gång per läge (talen frågar det för var och en)
const snittCache = new WeakMap<State, { t: number; n: number; w: Map<number, number>; m: number }>();
function formogenhet(s: State) {
  const c = snittCache.get(s), n = s.people.length;
  if (c && c.t === s.now && c.n === n) return c;
  const w = new Map<number, number>(), alder = lagGaller(s, 'skatt') ? lagTal(s, 'skatt', 'alder') : SKATT.alder;
  let sum = 0, k = 0;
  for (const p of living(s)) { if (p.gast) continue; const v = formogenhetDelar(s, p.id).sum; w.set(p.id, v); if (ageOf(p, s.now) >= alder) { sum += v; k++; } }
  const r = { t: s.now, n, w, m: k ? sum / k : 0 };
  snittCache.set(s, r);
  return r;
}
const egen = (s: State, p: Person) => { const f = formogenhet(s); return { w: f.w.get(p.id) ?? formogenhetDelar(s, p.id).sum, m: f.m }; };
const lutning = (s: State, p: Person) => clamp(drar(s, p).gemenskap ?? 0, -1, 1);
// skattelagens tal (steg 10.5.4): procenten, åldern och de två ribborna, med det var och en vill ha
const PROCENT: LagTalDef = {
  namn: 'procenten', sym: '%', stege: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2], start: SKATT.procent, visa: v => `${Math.round(v * 100)} %`,
  vill: (s, p) => {
    const { w, m } = egen(s, p);
    let i = talPlats(PROCENT, SKATT.procent * (1 + SKATT.lutar * lutning(s, p)));
    if (w < m) i++; else if (w > 1.5 * m) i--;
    return PROCENT.stege[clamp(i, 0, PROCENT.stege.length - 1)];
  },
};
const UNDRE: LagTalDef = {
  namn: 'den undre ribban', sym: '⤓', stege: [0, 20, 40, 60, 80, 100, 150, 200], start: 0, ingen: 0, visa: v => v ? `${v}` : 'ingen',
  vill: (s, p) => { const { w, m } = egen(s, p); return w < m / 2 ? UNDRE.stege.find(v => v > w) ?? 200 : lutning(s, p) > 0.3 ? m / 4 : 0; },
};
const OVRE: LagTalDef = {
  namn: 'den övre ribban', sym: '⤒', stege: [0, 1000, 800, 600, 400, 300, 200], start: 0, ingen: Infinity, visa: v => v ? `${v}` : 'ingen',
  vill: (s, p) => { const { w, m } = egen(s, p); return w < m ? 2 * m : Infinity; },
};
const ALDERN: LagTalDef = {
  namn: 'åldern', sym: '⌛', stege: [14, 16, 18, 20], start: SKATT.alder, visa: v => `${v} år`,
  vill: (s, p) => ageOf(p, s.now) < 20 || living(s).some(c => isParent(p, c) && ageOf(c, s.now) >= 14 && ageOf(c, s.now) < 20) ? 20 : 18,
};

// vad p ska betala för tiden dt (i spelets tid): procenten av det över den undre ribban, och den dubbla över den övre
export function skattAv(s: State, p: Person, dt: number) {
  const w = formogenhetDelar(s, p.id).sum, pr = lagTal(s, 'skatt', 'procent'), u = lagTal(s, 'skatt', 'undre'), o = Math.max(u, lagTal(s, 'skatt', 'ovre'));
  const v = pr * Math.max(0, Math.min(w, o) - u) + pr * SKATT.hogGanger * Math.max(0, w - o);
  return v * dt / DAY * efterlevs(s);
}
export const betalarSkatt = (s: State, p: Person) => !p.gast && ageOf(p, s.now) >= lagTal(s, 'skatt', 'alder');

// ---------- skulden (steg 10.5.5) ----------
// det som fattas står kvar som skuld till byn och läggs på nästa års skatt, utan ränta och utan tak. Skulden gör silvret mer
// värt för den som har den (behovAv), och säljaren nöjer sig med ett lägre pris för sitt hus (saljPris i byggplan.ts)
export function skuldFaktor(s: State, p: Person) {
  if (!p.skatteskuld) return 1;
  const f = formogenhetDelar(s, p.id), losa = f.redskap + f.klader + f.forrad;
  return 1 + Math.min(SKATT.skuldMax, p.skatteskuld / Math.max(1, losa));
}
// den döda betalar skulden ur det hen ägde, efter gravgåvan och före arvet; resten stryks (liv.ts)
export function skuldVidDoden(s: State, p: Person) {
  if (!p.skatteskuld) return;
  // (betalningen görs som om hen ännu ägde: förrådet stryker de dödas andelar i de stackar som ändras, och det är arvingarnas)
  const dog = p.died; p.died = undefined;
  const v = betala(s, p, p.skatteskuld);
  p.died = dog;
  if (v > 0) { count(s, 'skattVarde', v); count(s, 'skuldDod', v); log(s, `Byn tog saker värda ${Math.round(v)} för ${p.name}s skatteskuld.`, 'death', [p.id]); }
  delete p.skatteskuld;
}
export const struken = (s: State) => { for (const p of s.people) delete p.skatteskuld; };

// en gång per dygn (TAKTER, klockan SKATT.timme), också i en by utan ledare; dt = tiden sedan sist i spelets tid
export function skattDygn(s: State, dt: number) {
  const lag = s.styre?.lagar?.find(l => l.id === 'skatt');
  if (!lag || !lagGaller(s, 'skatt')) { if (s.people.some(p => p.skatteskuld)) struken(s); return; }
  const tid = Math.min(dt, s.now - lag.t);
  if (tid <= 0) return;
  let sum = 0;
  const pr = lagTal(s, 'skatt', 'procent');
  for (const p of living(s)) if (betalarSkatt(s, p)) {
    const ska = skattAv(s, p, tid) + (p.skatteskuld ?? 0), gav = betala(s, p, ska), w = formogenhetDelar(s, p.id).sum;
    sum += gav;
    if (ska - gav > 1e-9) p.skatteskuld = ska - gav; else delete p.skatteskuld; // det som fattas blir skuld (steg 10.5.5)
    if (p.skatteskuld) p.missnoje = clamp((p.missnoje ?? 0) + SKATT.skuldMiss * Math.min(1, p.skatteskuld / Math.max(1, w)) * tid / DAY, 0, 1);
    const vill = PROCENT.vill(s, p); // den som betalar mer än hen tycker är rätt blir missnöjd (steg 10.5.4)
    if (pr > vill) p.missnoje = clamp((p.missnoje ?? 0) + SKATT.miss * (pr - vill) / pr * tid / DAY, 0, 1);
  }
  if (sum <= 0) return;
  count(s, 'skattVarde', sum);
  log(s, `Skatten gav byns förråd saker värda ${Math.round(sum)}.`, 'world');
}

// lagens tal och skulden vid döden läggs till när allt är laddat (steg.ts)
export function skattRegister() {
  LAGAR.skatt.tal = { procent: PROCENT, alder: ALDERN, undre: UNDRE, ovre: OVRE };
  skuldKrok.f = skuldVidDoden;
}
