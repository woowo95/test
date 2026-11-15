// ---------- skatten på rikedomen (steg 10.5.3) ----------
// Med skattelagen betalar varje vuxen över SKATT.alder en gång per dygn (ett år i spelet) en procent av det hen äger
// (förmögenheten i personrutan: hus, djur och påbörjat räknas men är aldrig betalning) till byns förråd. Man betalar med hela
// saker och silver i tre nivåer: först det man har över (över bufferten, redskap man kan avvara och silvret), sedan bufferten
// och ting som inte bärs, sist plaggen man bär och redskapen man arbetar med. I varje nivå väljs det som kommer närmast det som
// är kvar att betala; det man betalar för mycket är byns, och det som fattas faller bort. Medan lagen gäller ger ingen en del av
// det hen skaffar till byn (delning.ts).
import { DAY, Person, State } from './typer';
import { balans } from './balans';
import { ageOf, count, living, log } from './folk';
import { efterlevs, lagGaller } from './lagar';
import { formogenhetDelar, grundvarde, tingVarde } from './varde';
import { payable } from './behov';
import { ownMove, ownedStock } from './lager';
import { Ting, tingOf } from './agande';
import { BYN } from './egendom';

export const SKATT = balans('skatt', {
  procent: 0.05, // så stor del av förmögenheten betalas per dygn (år i spelet)
  alder: 18, // från den här åldern (år) betalar man
  timme: 20, // klockan då skatten tas
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
// vad p ska betala för tiden dt (i spelets tid)
export const skattAv = (s: State, p: Person, dt: number) => SKATT.procent * formogenhetDelar(s, p.id).sum * dt / DAY * efterlevs(s);
export const betalarSkatt = (s: State, p: Person) => !p.gast && ageOf(p, s.now) >= SKATT.alder;

// en gång per dygn (TAKTER, klockan SKATT.timme), också i en by utan ledare; dt = tiden sedan sist i spelets tid
export function skattDygn(s: State, dt: number) {
  const lag = s.styre?.lagar?.find(l => l.id === 'skatt');
  if (!lag || !lagGaller(s, 'skatt')) return;
  const tid = Math.min(dt, s.now - lag.t);
  if (tid <= 0) return;
  let sum = 0;
  for (const p of living(s)) if (betalarSkatt(s, p)) sum += betala(s, p, skattAv(s, p, tid));
  if (sum <= 0) return;
  count(s, 'skattVarde', sum);
  log(s, `Skatten gav byns förråd saker värda ${Math.round(sum)}.`, 'world');
}
