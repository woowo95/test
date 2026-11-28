// ---------- dagsarbetet (steg 14.1.4, Ekonomi och handel: Dagsarbetet, i fliken Människan) ----------
// Lönen är ett och samma system för byn, kyrkan och personerna. En gång per dygn (ett år i spelet) betalas fjolårets
// anställningar och nya görs upp. En anställning är en rad i s.anst: vem som betalar (av, en ägare: BYN, en kyrka eller en
// person), arbetet (en rad i DAGSVERK), den anställda (p), lönen räknad i hela silver och det hon hunnit. En person betalar med
// silvret och sedan med det hen har över, som i bytena (Gränsen mot fas 14). Varje anställning är ett
// lönesamtal: den som betalar bjuder högst vad arbetet är värt efter det personen hann förra gången (verket: timmarna gånger
// hur fort skickligheten gör arbetet, KUNNA), arbetaren begär det hen får på annat håll (eget arbete eller ett annat bud), och
// lönen blir mitt emellan. Byn bjuder högst det lönelagen säger för en vanlig arbetstimme, ur budgetdelen arbetet hör till, och
// ledaren står för anställningen. För ett barn betalar föräldern, och barnets lön går till föräldern som försörjer det (10.5.10).
// I valet av arbete ger anställningen mer omtanke om den man arbetar åt (omtanke.ts, vardRatt i halsa.ts, vakterna i val.ts).
import { HOUR_S, Person, State, Task } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { ALDER, ageOf, byId, count, forstaGang, living, log } from './folk';
import { lagGaller, lagTal } from './lagar';
import { ARBETE, grundvarde } from './varde';
import { fromByn, ownMove, ownsId } from './lager';
import { BUDGET, BUDGET_KVAR, budgetAndel, budgetId, bynsAv } from './budget';
import { MATERIAL, bitById, bitsOf, husById } from './byggnad';
import { BYN, kyrkaId } from './egendom';
import { FOOD } from './saker';
import { foodDaysAll, matPerDygn } from './ekonomi';
import { FORRADSMAL, buffert } from './forradsmal';
import { egnaMatDygn, forsorjer, payable } from './behov';
import { kunnaFart } from './kunna';
import { tanke } from './tankar';
import { ledareOf } from './styre';
import { vardBehov } from './halsa';
import { TEK, TEKNIK, canThink, knows, tekSkill } from './teknik';

export const DAGS = balans('dagsarbete', {
  tim: 4, // så många timmar arbete (verk) den som betalar räknar med av någon som inte haft arbetet förut
  minne: 0.5, // så stor del av det man räknar med nästa gång som är det personen hann i år
  eget: 0.25, // det en timme eget arbete är värt för den som har nog med egen mat, gånger värdet av en arbetstimme ...
  nod: 2, // ... och så mycket mer för den som inte har någon
  vard: 3, // en timmes vård är värd så många arbetstimmar för den som är skadad
  lara: 1, // en timme hos en mästare är värd så många arbetstimmar för den som vill lära sig
  hjalpare: 2, // så många bygghjälpare anställer den som bygger högst
  minVerk: 0.05, // den som arbetat mindre än så här har inte börjat och får ingen lön
  miss: 0.01, // den som inte fick sin lön blir så här mycket missnöjd per timme, gånger den del som inte betalades
  fickMinne: 0.5, // så stor del av den del av lönen man fått som är fjolårets
});
// mal: det anställningen gäller (den skadade, eleven). till: den som får lönen när det inte är den anställda själv
export interface Anst { av: number; arb: string; p: number; lon: number; tim: number; verk: number; mal?: number; del?: string; t: number }
// ett bud: av vill ha antal personer, en timmes vanligt verk är värt tim, och det finns högst timMax timmar att göra. tak: det av kan betala
export interface LonBud { av: number; antal: number; tim: number; tak: number; timMax?: number; mal?: number; kan?(p: Person): boolean }
export interface Dagsverk {
  namn: string; sym: string;
  del?: string; // byns budgetdel
  ostort?: true; // gör eget arbete samtidigt (mästaren), så att timmen inte kostar något
  gor(s: State, a: Anst, p: Person, tk?: Task): boolean; // gör p (eller eleven hos p) arbetet nu
  bud(s: State): LonBud[];
}
export const lonNu = (s: State) => lagGaller(s, 'lon') && lagGaller(s, 'skatt');
export const anstAv = (s: State, p: Person) => s.anst?.find(a => a.p === p.id);
// anställd av byn i arbetet arb (i år)
export const anstByn = (p: Person, arb: string) => p.anst?.av === BYN && p.anst.arb === arb;
// föräldern som försörjer p, modern först
const forsorjare = (s: State, p: Person) => [p.mother, p.father].map(id => living(s).find(q => q.id === id)).find(g => !!g && forsorjer(s, g, p));
// den som betalar för p: hen själv, eller för ett barn föräldern
const betalare = (s: State, p: Person) => forsorjare(s, p) ?? p;
const silverAv = (s: State, id: number) => Math.floor(ownsId(s, id, 'silver') + 1e-9);
// det id kan betala en lön med: dagsarbetet ligger på samma byten som allt annat (Gränsen mot fas 14 i fliken Människan), så en
// person betalar med silvret och det hen har över, värderat efter grundvärdet (som kunden vid disken, kundPung i foretag.ts).
// Kyrkan betalar med sitt silver
export const formaga = (s: State, id: number) => {
  const p = id > 0 ? byId(s, id) : undefined;
  return p ? Math.floor(payable(s, p, []).reduce((a, w) => a + (w.t ? 0 : w.n * grundvarde(w.k)), 0) + 1e-9) : silverAv(s, id);
};

// det byn kan betala ur delen: delens andel av byns silver och av maten över bufferten
const bynsTak = (s: State, del: string) => {
  const mat = Math.max(0, foodDaysAll(s) - buffert(s, 'mat')) * matPerDygn(s) * grundvarde('bar');
  return Math.floor(budgetAndel(s, del) * (bynsAv(s, 'silver') + ownsId(s, budgetId(del), 'silver') + mat) + 1e-9);
};
const bynsBud = (s: State, del: string, antal: number, timMax?: number): LonBud[] => lonNu(s) && antal > 0 ? [{ av: BYN, antal, tim: lagTal(s, 'lon', 'tim'), tak: bynsTak(s, del), timMax }] : [];
const vuxna = (s: State) => living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vuxen);
// timmarna som är kvar att bygga, och vems bygget är
const byggTim = (b: import('./byggnad').Bit) => b.forb || b.k === 'oppning' ? 0 : (1 - b.b) * (MATERIAL[b.m]?.tim ?? 0);
const bitAgare = (s: State, b: import('./byggnad').Bit) => { const h = b.hus !== undefined ? husById(s, b.hus) : undefined; return h?.tro !== undefined ? kyrkaId(h.tro) : h?.ag ?? BYN; };
const bygger = (s: State, tk?: Task) => tk?.act === 'bygga' ? bitById(s, tk.ref) : undefined;
const tim = (s: State, f: (b: import('./byggnad').Bit) => boolean) => bitsOf(s).reduce((n, b) => n + (f(b) ? byggTim(b) : 0), 0);
const antalFor = (t: number) => Math.min(DAGS.hjalpare, Math.ceil(t / DAGS.tim));

export const DAGSVERK: Record<string, Dagsverk> = {
  vakt: { namn: 'Vakt', sym: '🛡️', del: 'vakter', gor: (_s, _a, _p, tk) => tk?.act === 'vakt', bud: s => bynsBud(s, 'vakter', Math.max(1, Math.round(vaktAntalKrok.f(s)))) },
  byggen: { namn: 'Byns byggen', sym: '🏠', del: 'byggen', gor: (s, _a, _p, tk) => tk?.lon === 'byggen' || !!BUDGET.byggen.bit!(s, bygger(s, tk) ?? INGEN),
    bud: s => bynsBud(s, 'byggen', antalFor(tim(s, b => BUDGET.byggen.bit!(s, b)))) },
  vagar: { namn: 'Vägar och bryggor', sym: '🛤️', del: 'vagar', gor: (s, _a, _p, tk) => !!BUDGET.vagar.bit!(s, bygger(s, tk) ?? INGEN),
    bud: s => bynsBud(s, 'vagar', antalFor(tim(s, b => BUDGET.vagar.bit!(s, b)))) },
  forradet: { namn: 'Byns förråd', sym: '📦', del: 'forradet', gor: (_s, _a, _p, tk) => tk?.lon === 'forradet', bud: s => bynsBud(s, 'forradet', vuxna(s).length) },
  // bygghjälpen: den som äger ett hus som byggs, eller kyrkan, anställer dem som bygger
  bygghjalp: { namn: 'Bygghjälp', sym: '🏠', gor: (s, a, _p, tk) => { const b = bygger(s, tk); return !!b && bitAgare(s, b) === a.av; },
    bud: s => {
      const t = new Map<number, number>();
      for (const b of bitsOf(s)) { const ag = b.hus === undefined ? BYN : bitAgare(s, b); if (ag !== BYN) t.set(ag, (t.get(ag) ?? 0) + byggTim(b)); }
      return [...t].filter(([ag, n]) => n > 0 && (ag < 0 || byId(s, ag) && living(s).some(q => q.id === ag))).map(([av, n]) => ({ av, antal: antalFor(n), tim: ARBETE, tak: formaga(s, av), timMax: n,
        kan: (p: Person) => av < 0 ? p.tro !== undefined && kyrkaId(p.tro) === av : p.partner !== av }));
    } },
  vard: { namn: 'Vård', sym: '🩹', gor: (_s, a, _p, tk) => tk?.act === 'varda' && tk.ref === a.mal,
    bud: s => living(s).filter(q => !q.gast && (q.skador?.length || q.sjuk) && vuxna(s).some(g => g !== q && vardBehov(s, q, g))).map(q => { const b = betalare(s, q); return { av: b.id, antal: 1, tim: ARBETE * DAGS.vard, tak: formaga(s, b.id), timMax: 1, mal: q.id, kan: (p: Person) => p !== q }; }) },
  // undervisningen: lärlingen, eller för barnet föräldern, betalar mästaren
  undervisning: { namn: 'Undervisning', sym: '📜', ostort: true, gor: (s, a) => { const q = byId(s, a.mal); return q?.task?.act === 'lara' && q.lar?.av === a.p; },
    bud: s => living(s).filter(q => !q.gast && ageOf(q, s.now) >= ALDER.uppfinner).map(q => { const b = betalare(s, q); return { av: b.id, antal: 1, tim: ARBETE * DAGS.lara, tak: formaga(s, b.id), mal: q.id, kan: (m: Person) => q !== m && (q.lar ? q.lar.av === m.id : kanLaraUt(s, m, q)) }; }).filter(b => b.tak >= 1) },
};
const INGEN = {} as import('./byggnad').Bit;
// hur många vakter natten vill ha (val.ts sätter kroken)
export const vaktAntalKrok: { f: (s: State) => number } = { f: () => 1 };
// m kan en svår teknik som q kan lära sig, och har ingen annan lärling
const kanLaraUt = (s: State, m: Person, q: Person) => ageOf(m, s.now) >= ALDER.vuxen && !living(s).some(o => o !== q && o.lar?.av === m.id) && TEKNIK.some(t => t.niva >= 4 && knows(m, t.id) && !knows(q, t.id) && canThink(q, t) && q.skill[tekSkill(TEK[t.id])] < m.skill[tekSkill(TEK[t.id])]);

// ---------- lönesamtalet ----------
// det personen hinner i arbetet, i timmar av vanligt verk: efter det hen hann förra gångerna
export const vantatVerk = (p: Person, arb: string) => p.verk?.[arb] ?? DAGS.tim;
// det en timme eget arbete är värt för p: mer ju mindre egen mat hen har
export function egetVarde(s: State, p: Person) {
  const mal = Math.max(0.1, buffert(s, 'mat') * (FORRADSMAL.mat.egenFull ?? 1));
  return ARBETE * DAGS.eget * (1 + DAGS.nod * clamp(1 - egnaMatDygn(s, p) / mal, 0, 1));
}
interface Par { b: LonBud; arb: string; p: Person; varde: number; krav: number }
// byns och alla andras bud möter arbetarna: den anställning som ger mest över det arbetaren begär görs upp först
export function anstallDygn(s: State) {
  for (const p of s.people) p.anst = undefined;
  s.anst = [];
  const folk = vuxna(s), eget = new Map(folk.map(p => [p, egetVarde(s, p)])), par: Par[] = [];
  for (const arb in DAGSVERK) for (const b of DAGSVERK[arb].bud(s)) {
    if (b.tak < 1) continue;
    for (const p of folk) {
      if (p.id === b.av || b.kan && !b.kan(p)) continue;
      const h = Math.min(vantatVerk(p, arb), b.timMax ?? Infinity);
      const varde = b.tim * h, krav = DAGSVERK[arb].ostort ? 0 : eget.get(p)! * h;
      if (Math.floor(varde + 1e-9) >= 1 && varde > krav) par.push({ b, arb, p, varde, krav });
    }
  }
  par.sort((x, y) => (y.varde - y.krav) - (x.varde - x.krav) || x.p.id - y.p.id || x.b.av - y.b.av);
  const plats = new Map<LonBud, number>(), kvar = new Map<string, number>(), upptagen = new Set<Person>();
  for (const { b, arb, p, varde, krav } of par) {
    if (upptagen.has(p) || (plats.get(b) ?? 0) >= b.antal) continue;
    const kassa = b.av === BYN ? 'del:' + DAGSVERK[arb].del : 'ag:' + b.av, tak = kvar.get(kassa) ?? b.tak;
    // det bästa andra budet hen har är också något hen kan få på annat håll
    const annat = par.reduce((m, q) => q.p === p && q.b !== b && (plats.get(q.b) ?? 0) < q.b.antal ? Math.max(m, (q.krav + q.varde) / 2) : m, krav);
    const lon = Math.min(tak, Math.floor(varde + 1e-9), Math.max(1, Math.round(Math.max(annat, (krav + varde) / 2))));
    if (lon < 1 || lon < krav - 1e-9) continue;
    s.anst.push({ av: b.av, arb, p: p.id, lon, tim: 0, verk: 0, mal: b.mal, del: b.av === BYN ? DAGSVERK[arb].del : undefined, t: s.now });
    p.anst = { av: b.av, arb, mal: b.mal, w: lon / Math.max(1, Math.min(vantatVerk(p, arb), b.timMax ?? Infinity)) / ARBETE };
    upptagen.add(p); plats.set(b, (plats.get(b) ?? 0) + 1); kvar.set(kassa, tak - lon);
    count(s, 'anstalld'); count(s, 'anstalld_' + arb);
    if (forstaGang(s, 'anstalld')) { const l = ledareOf(s), av = b.av > 0 ? byId(s, b.av)?.name : b.av === BYN ? l?.name ?? 'Byn' : 'Kyrkan'; log(s, `${av} anställde ${p.name} för ett år: ${DAGSVERK[arb].namn.toLowerCase()}, ${lon} silver.`, 'world', [p.id]); }
  }
}
// ---------- arbetet och lönen ----------
// varje minut (TAKTER): timmarna och verket räknas, och den som inte fick sin lön blir missnöjd
export function lonRakna(s: State, dt: number) {
  for (const a of s.anst ?? []) {
    const p = byId(s, a.p), q = a.arb === 'undervisning' ? byId(s, a.mal) : p;
    if (!p || p.died !== undefined || !DAGSVERK[a.arb]?.gor(s, a, p, p.task)) continue;
    a.tim += dt / HOUR_S;
    a.verk += dt / HOUR_S * (q?.task ? kunnaFart(s, p, q.task.act, q.task.tool) : 1);
  }
  for (const p of living(s)) if (p.lonObetald) p.missnoje = clamp((p.missnoje ?? 0) + DAGS.miss * p.lonObetald * dt / HOUR_S, 0, 1);
}
// lönen delen är skyldig för årets anställningar (det budgeten ska ge delen)
export const skuldFor = (s: State, del: string) => (s.anst ?? []).reduce((n, a) => n + (a.del === del && a.av === BYN && a.verk >= DAGS.minVerk && byId(s, a.p)?.died === undefined ? a.lon : 0), 0); // den döda får ingen lön (lonDygn), så den reserveras inte
// av betalar n silver till p: silvret först, sedan (byn) hela saker av den mat byn har över bufferten. Svarar med det som betalades
function betala(s: State, a: Anst, till: number) {
  const id = a.del ? budgetId(a.del) : a.av, silver = Math.min(a.lon, silverAv(s, id));
  let kvar = a.lon - (silver >= 1 ? ownMove(s, 'silver', silver, id, till) : 0);
  if (kvar < a.lon) count(s, 'lonSilver', a.lon - kvar);
  // en person betalar resten med det hen har över, det mest värda först, i hela saker som inte är värda mer än det som är kvar
  const q = a.av > 0 ? byId(s, a.av) : undefined;
  if (q && kvar >= 1 - 1e-9) for (const w of payable(s, q, ['silver']).filter(x => !x.t).sort((x, y) => grundvarde(y.k) - grundvarde(x.k) || (x.k < y.k ? -1 : 1))) {
    const v = grundvarde(w.k), m = v > 0 ? Math.min(Math.floor(w.n + 1e-9), Math.floor(kvar / v + 1e-9)) : 0;
    if (m < 1) continue;
    const g = ownMove(s, w.k, m, a.av, till);
    kvar -= g * v; if (g) count(s, 'lonVaror', g);
    if (kvar < 1 - 1e-9) break;
  }
  if (a.av === BYN) for (const k of FOOD) {
    const v = grundvarde(k);
    while (kvar >= v - 1e-9 && v > 0 && foodDaysAll(s) > buffert(s, 'mat')) {
      if (bynsAv(s, k) >= 1) { if (fromByn(s, k, 1, till) < 1) break; }
      else if (ownsId(s, BUDGET_KVAR, k) >= 1) { if (ownMove(s, k, 1, BUDGET_KVAR, till) < 1) break; }
      else break;
      kvar -= v; count(s, 'lonVaror', 1);
    }
  }
  return a.lon - Math.max(0, kvar);
}
// en gång per dygn, efter budgeten (TAKTER): lönerna betalas, det var och en hann blir ihågkommet, och nya anställningar görs upp
export function lonDygn(s: State) {
  const sedd = new Set<number>();
  for (const a of s.anst ?? []) {
    const p = byId(s, a.p);
    if (!p || p.died !== undefined) continue;
    if (a.verk < DAGS.minVerk) continue; // kom aldrig i gång: ingen lön, och inget att minnas
    (p.verk ??= {})[a.arb] = vantatVerk(p, a.arb) * (1 - DAGS.minne) + a.verk * DAGS.minne;
    const fick = betala(s, a, betalare(s, p).id), andel = clamp(fick / a.lon, 0, 1);
    sedd.add(p.id);
    p.lonFick = (p.lonFick ?? 1) * (1 - DAGS.fickMinne) + andel * DAGS.fickMinne;
    p.lonObetald = andel < 1 - 1e-9 ? 1 - andel : undefined;
    if (p.lonObetald) { tanke(p, 'lonObetald', s.now); count(s, 'lonStruket', a.lon - fick); } else count(s, 'lonBetald');
  }
  for (const p of s.people) if (p.lonObetald && !sedd.has(p.id)) p.lonObetald = undefined;
  anstallDygn(s);
}
