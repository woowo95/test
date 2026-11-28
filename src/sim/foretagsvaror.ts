// ---------- det ägaren kan sälja (steg 15.1.96, Ekonomi och handel: Företagen, Att starta, i fliken Människan) ----------
// En affärs varor är det ägaren har över eller kan göra själv: recept hen kan där materialet finns, och det hen samlar, jagar
// eller fiskar. Kunnandet för en vara är medlet av handeln och färdigheten i arbetet som ger varan, och kostnaden är ägarens
// tid för att göra den gånger det hens tid är värd, och materialet. Så bygger en affär på ägarens styrkor utan någon regel för det.
import { SKILLS, type Act, type Person, type Skill, type State } from './typer';
import { ACTS } from './handlingar';
import { SAKER, gruppOf } from './saker';
import { RECEPT } from './recept';
import { TILLVERKA } from './tillverka';
import { DJUR, GORS, canMake } from './redskap';
import { knows } from './teknik';
import { kunnaFart } from './kunna';
import { amountOf } from './lager';
import { ARBETE, grundvarde, varuVarde } from './varde';
import { egetVarde } from './dagsarbete';

interface Satt { act: Act; av: Record<string, number>; ger: number; min?: number; tek?: string; gor?: true }
// sätten att få en k: arbetet som gör saken (GORS), tillverkningen (TILLVERKA), det som samlar den, och djuret som ger den
let SATT: Map<string, Satt[]> | undefined;
function sattFor(k: string): Satt[] {
  if (!SATT) {
    const m = new Map<string, Satt[]>(), lagg = (q: string, x: Satt) => { const l = m.get(q) ?? []; l.push(x); m.set(q, l); };
    for (const g in GORS) for (const q of GORS[g]!) { const r = (RECEPT as Record<string, { av?: Record<string, number>; min: number; ger?: number }>)[q] ?? SAKER[q]?.skaffa; lagg(q, { act: g as Act, av: r?.av ?? {}, ger: r?.ger ?? 1, min: r?.min, tek: SAKER[q]?.skaffa?.tek, gor: true }); }
    for (const d of Object.values(TILLVERKA)) lagg(d.ger, { act: d.act, av: d.av, ger: d.n, min: d.min, tek: d.tek });
    for (const q in SAKER) { const f = SAKER[q]!.skaffa; if (f?.act && !f.av && ACTS[f.act as Act]) lagg(q, { act: f.act as Act, av: {}, ger: 1, tek: f.tek }); }
    for (const art of Object.values(DJUR) as { sak: string; slakt: Record<string, number> }[]) { const f = SAKER[art.sak]?.skaffa; if (f?.act && ACTS[f.act as Act]) for (const q in art.slakt) lagg(q, { act: f.act as Act, av: {}, ger: art.slakt[q]!, tek: f.tek }); }
    SATT = m;
  }
  return SATT.get(k) ?? [];
}
// färdigheten i arbetet act: handlingens, annars arbetets, annars arbetet självt när det är en färdighet (samla, jakt, fiske)
const skillAv = (act: Act): Skill => ACTS[act]?.fardighet ?? ((SKILLS as readonly string[]).includes(ACTS[act]?.arbete ?? '') ? ACTS[act]!.arbete as Skill : (SKILLS as readonly string[]).includes(act) ? act as Skill : 'hantverk');
// p kan göra eller skaffa en k nu: tekniken och materialet
const kan = (s: State, p: Person, x: Satt, k: string) => x.gor ? canMake(s, p, k) : (!x.tek || knows(p, x.tek)) && Object.entries(x.av).every(([m, n]) => amountOf(s, m) >= n);
// det bästa sättet för p att få en k: det som kostar minst av hens tid
function bastSatt(s: State, p: Person, k: string): { x: Satt; tim: number } | undefined {
  let b: { x: Satt; tim: number } | undefined;
  for (const x of sattFor(k)) {
    if (!kan(s, p, x, k)) continue;
    const mat = varuVarde(x.av) / x.ger, tim = Math.max(0, x.min !== undefined ? x.min / 60 / x.ger : (grundvarde(k) - mat) / ARBETE) / kunnaFart(s, p, x.act, k);
    if (!b || tim < b.tim) b = { x, tim };
  }
  return b;
}
// varorna p kan göra eller skaffa själv, av dem i ks
export const kanSkaffaVaror = (s: State, p: Person, ks: Iterable<string>) => [...ks].filter(k => !!bastSatt(s, p, k));
// färdigheten för varan k hos p: arbetet hen skulle ge den med (annars det första som ger den, annars hantverket)
export const fardighetFor = (s: State, p: Person, k: string): Skill => { const x = bastSatt(s, p, k)?.x ?? sattFor(k)[0]; return x ? skillAv(x.act) : 'hantverk'; };
// det kostar p att göra en k: tiden gånger det hens tid är värd, och materialet. Undefined när hen inte kan
export function gorKostnad(s: State, p: Person, k: string): number | undefined {
  const b = bastSatt(s, p, k);
  return b && b.tim * egetVarde(s, p) + varuVarde(b.x.av) / b.x.ger;
}
// företagets namn efter varan (Hildulfs krukor): gruppens ord i plural, annars sista ordet i sakens namn
const FLER: Record<string, string> = { lerkruka: 'krukor', korg: 'korgar', yxa: 'yxor', kniv: 'knivar', spjut: 'spjut', remsa: 'remsor', plankor: 'plankor', huggen_sten: 'stenar', oljelampa: 'lampor', tval: 'tvål', vattensack: 'vattensäckar', benspade: 'spadar' };
export const varuOrd = (k: string) => FLER[gruppOf(k)] ?? FLER[k] ?? (SAKER[k]?.namn ?? k).split(' ').pop()!.toLowerCase();
