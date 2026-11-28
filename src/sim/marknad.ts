// ---------- marknaderna (steg 14.1.14, Ägande: Handel mellan kolonister, i fliken Människan) ----------
// En marknad är en plats och en dag när många möts och handlar. Var och en vet vad hen saknar som någon annan har över (raderna i
// BRUK), och vad hen har över som någon saknar. När det byborna tillsammans skulle vinna på att mötas är värt mer än en stund av
// var vuxens dag kallar den som vinner mest till marknad nästa dag på torget (byns mitt). Dit går man på fritiden efter vad man
// själv vinner (raden marknad i FRITID), och den som kommit fram handlar med dem som är där, efter samma regler som i samtal.
import { HOUR, MIN, type Person, type State, type Task } from './typer';
import { balans } from './balans';
import { ageOf, ALDER, count, log, living } from './folk';
import { brukAv, bytenMellan, DELA, materialOver, overOf, saknarNu } from './behov';
import { grundvarde } from './varde';
import { hourOf } from './tid';
import { freeNear } from './byggnad';
import { bynsMitt } from './omrade';
import { iHelaForradet } from './lager';

export const MARKNAD = balans('marknad', {
  minst: 3, // vinsten per vuxen (i silver) som gör marknaden värd att kalla till
  oppnar: 10, timmar: 5, // när på dagen den öppnar, och så länge står den
  besok: 15, // ett besök tar så många minuter
  vikt: 0.15, // en silvers vinst är värd så mycket i fritidens val, utan tak (steg 15.1.156)
  radie: 5, // den som är så nära platsens mitt är på marknaden
  byten: 6, // så många byten hinner man med under ett besök
});
export interface Marknad { x: number; y: number; t: number; slut: number; lust: Record<number, number>; byten: number }
export const marknadOppen = (s: State) => s.marknad && s.now >= s.marknad.t && s.now < s.marknad.slut ? s.marknad : undefined;
// det g har över av slaget (eller behovet) k, så att p kan få det: samma fråga som bytet (overOf, Alla saker byts efter samma regler)
export const harOver = (s: State, g: Person, p: Person, k: string) => { const r = brukAv(k), b = r.behov?.(); return b ? overOf(s, g, b, p) >= b.minst : r.ting ? !!r.over?.(s, g, k) : materialOver(s, g, k) >= 1; };
const slagVarde = (k: string) => { const b = brukAv(k).behov?.(); return b ? Math.max(...b.slag.map(q => grundvarde(q))) : grundvarde(k); };
// vad var och en skulle vinna på att alla möttes: hälften för den som får saken, och hälften för den som har den över
export function handelslust(s: State): Map<number, number> {
  const folk = living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.hjalper), ut = new Map<number, number>();
  for (const p of folk) for (const k of saknarNu(s, p)) {
    const andra = folk.filter(g => g !== p && harOver(s, g, p, k));
    if (!andra.length) continue;
    const v = slagVarde(k) * (DELA.saknar - DELA.over);
    ut.set(p.id, (ut.get(p.id) ?? 0) + v / 2);
    for (const g of andra) ut.set(g.id, (ut.get(g.id) ?? 0) + v / 2 / andra.length);
  }
  return ut;
}
// en gång per dygn (TAKTER), på kvällen: är det värt att mötas i morgon?
export function marknadDygn(s: State) {
  if (s.marknad && s.now < s.marknad.slut) return;
  s.marknad = undefined;
  const vuxna = living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vuxen), l = handelslust(s);
  const sum = [...l.values()].reduce((a, b) => a + b, 0);
  if (!vuxna.length || sum < MARKNAD.minst * vuxna.length) return; // hur många som än bor i byn (steg 15.1.156): det är vinsten per vuxen som avgör
  const vem = vuxna.reduce((a, b) => (l.get(b.id) ?? 0) > (l.get(a.id) ?? 0) ? b : a), m = bynsMitt(s);
  const t = s.now + ((MARKNAD.oppnar - hourOf(s.now) + 24) % 24 || 24) * HOUR, q = freeNear(s, m.x + 0.5, m.y + 0.5);
  s.marknad = { x: q.x, y: q.y, t, slut: t + MARKNAD.timmar * HOUR, lust: Object.fromEntries(l), byten: 0 };
  count(s, 'marknad');
  log(s, `${vem.name} kallade till marknad på ${s.torg ? 'torget' : 'platsen mitt i byn'}.`, 'world', [vem.id]);
}
// lusten att gå dit nu (FRITID)
export const marknadVikt = (s: State, p: Person) => { const m = marknadOppen(s); return m ? (m.lust[p.id] ?? 0) * MARKNAD.vikt : 0; };
export function marknadVal(s: State, p: Person) {
  const m = marknadOppen(s);
  if (!m) return undefined;
  const a = p.id * 2.4 % 6.28, r = 1.5 + p.id % 3; // var och en har sin plats kring mitten
  return { why: 'Går till marknaden', spot: freeNear(s, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r), dur: MARKNAD.besok * MIN, ref: Math.round(m.t / 1000) };
}
export const paMarknaden = (s: State, m: Marknad) => living(s).filter(q => !q.gast && q.task?.act === 'marknad' && q.task.phase === 'do' && Math.hypot(q.x - m.x, q.y - m.y) <= MARKNAD.radie);
// p byter med alla som står på marknaden, med den hen vinner mest hos först i BRUK:s ordning (steg 15.1.22): när hen kommer fram och
// när besöket är slut, så att två som är där samtidigt byter vem som än kom först. Bytet gäller allt de äger, inte bara det inom
// räckhåll (som köpet hos grannen). Antalet byten under besöket räknas på uppgiften (prog)
export function marknadByt(s: State, p: Person, t?: Task) {
  const m = marknadOppen(s);
  if (!m) return;
  let kvar = MARKNAD.byten - (t?.prog ?? 0);
  iHelaForradet(() => {
    for (const g of paMarknaden(s, m)) {
      if (g === p) continue;
      while (kvar > 0 && bytenMellan(s, p, g) === 'byte') { kvar--; m.byten++; count(s, 'marknadByte'); }
    }
  });
  if (t) t.prog = MARKNAD.byten - kvar;
}
// besöket är slut (KLAR i steg.ts): de sista bytena, och ärendet är gjort
export function marknadKlar(s: State, p: Person, t?: Task) {
  const m = marknadOppen(s);
  if (!m) return;
  marknadByt(s, p, t);
  m.lust[p.id] = 0; // hen har gjort sina ärenden
  if (t?.prog) count(s, 'marknadBesok');
}
