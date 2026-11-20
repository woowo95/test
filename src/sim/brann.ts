// Bränningarna (steg 12.2.1, Landskapet och järnet: Järnet: Kolmilan, Bränningarna). Kolmilan (och blästerugnen i 12.2.3) är en
// station där något läggs in, brinner en känd tid efter klockan och tas ut. Varje sort är en rad i registret BRANNINGAR: vad
// som läggs in, vad som kommer ut, hur länge det går och hur lång tid det tar att ladda och tända och att tömma. Inget räknas
// löpande: när bränningen tänds är tiden när den är klar känd (slut), och raden bränningarna i TAKTER (steg.ts) ser bara vilka
// som blivit klara. Bränningarna sparas i s.branningar, en per station.
// Kolmilan: en kolbotten som grävs med spaden på 10 minuter, utan material (tekniken Kolning). Varje bränning tar 20 torr ved,
// som reses och täcks (5 minuter) och tänds (2 minuter); sedan brinner milan 4 timmar efter klockan (ett sjättedels år i
// spelet), och till sist rivs den och töms (4 minuter): 10 kol. Blöt ved och torv går inte att kola. Ingen vill ha kol för dess
// egen skull: projektet kol har ingen egen brist, och den som vill ha något som kräver kol vill ha kol (arv i projekt.ts), och
// då ved till milan, eftersom projektets recept är bränningens (BRANNINGAR). En mila som brunnit klart töms av den som har tid
// (raden kolmila i ARBETEN, val.ts)
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, log } from './folk';
import { HOUR, Person, State, Task } from './typer';
import { Station, isKlar, stationerOf, vidStation } from './stationer';
import { knows } from './teknik';
import { getable, takeMaterial } from './behov';
import { torrVed } from './blotved';
import { dropLoad } from './lager';
import { grundvarde } from './varde';
import { laggTillProjekt } from './projekt';

export const BRANN = balans('brann', {
  kolVed: 20, // en kolmila tar så här mycket torr ved ...
  kolUt: 10, // ... och ger så här mycket kol
  kolTim: 4, // milan brinner så här många timmar efter klockan
  kolLadda: 7, // minuter att resa och täcka veden (5) och tända (2)
  kolTomma: 4, // minuter att riva milan och ta ut kolet
});
export interface BranningDef {
  namn: string; station: string; tek: string;
  in: Record<string, number>; ut: Record<string, number>;
  tim: number; // så många timmar bränningen går efter klockan
  ladda: number; tomma: number; // minuter att ladda och tända, och att tömma
  torr?: string; // det som läggs in ska vara torrt (veden: torrVed i blotved.ts)
  ladda_text: string; tomma_text: string;
}
export const BRANNINGAR: Record<string, BranningDef> = {
  kolmila: {
    namn: 'Kolmila', station: 'kolmila', tek: 'kolmila', in: { ved: BRANN.kolVed }, ut: { kol: BRANN.kolUt }, tim: BRANN.kolTim,
    ladda: BRANN.kolLadda, tomma: BRANN.kolTomma, torr: 'ved',
    ladda_text: 'Reser och täcker ved till en kolmila och tänder den.', tomma_text: 'River kolmilan och tar ut kolet.',
  },
};
// bränningen i en station: sorten, när den tändes, när den är klar, och vems det som lades in var
export interface Branning { st: number; b: string; t0: number; slut: number; klar?: 1; ag?: Record<string, number> }
export const branningarOf = (s: State) => s.branningar ?? [];
export const branningI = (s: State, t: Station) => branningarOf(s).find(b => b.st === t.id);
const defFor = (t: Station) => Object.entries(BRANNINGAR).find(([, d]) => d.station === t.k);
// stationerna för bränningarna, byggda
export const branningsStationer = (s: State, b?: string) => stationerOf(s).filter(t => isKlar(t) && defFor(t) && (!b || defFor(t)![0] === b));
// har byn det som läggs in (och torrt, när det ska vara torrt)?
const harIn = (s: State, p: Person, d: BranningDef) => Object.entries(d.in).every(([k, n]) => getable(s, p, k) >= n && (d.torr !== k || torrVed(s) >= n));
// en tom station av sorten b som p kan ladda: p kan tekniken och byn har det som läggs in
export function laddbar(s: State, p: Person, b: string) {
  const d = BRANNINGAR[b];
  if (!d || ageOf(p, s.now) < ALDER.vuxen || !knows(p, d.tek) || !harIn(s, p, d)) return undefined;
  return branningsStationer(s, b).find(t => !branningI(s, t));
}
// en station vars bränning är klar och ska tömmas
export const attTomma = (s: State) => branningsStationer(s).find(t => { const b = branningI(s, t); return !!b && b.slut <= s.now; });
// uppgiften vid stationen t: ladda och tända, eller tömma
export function branningUppgift(s: State, t: Station) {
  const b = branningI(s, t), d = defFor(t)![1];
  return b ? { act: 'kola' as const, text: d.tomma_text, min: d.tomma, spot: vidStation(t), ref: t.id }
    : { act: 'kola' as const, text: d.ladda_text, min: d.ladda, spot: vidStation(t), ref: t.id };
}
// det som hämtas till stationen (HAMTAS i hamtning.ts): det som läggs in, när stationen är tom
export const branningHamtas = (s: State, tk: Task) => { const t = stationerOf(s).find(x => x.id === tk.ref), d = t && defFor(t)?.[1]; return d && !branningI(s, t!) ? { ...d.in } : undefined; };
// arbetet är klart (KLAR i steg.ts): en tom station laddas och tänds, en klar töms och det som kom ut läggs i en hög där
export function branningKlar(s: State, p: Person, tk: Task) {
  const t = stationerOf(s).find(x => x.id === tk.ref), e = t && defFor(t);
  if (!t || !e) return;
  const [id, d] = e, b = branningI(s, t);
  if (!b) {
    if (!harIn(s, p, d)) return;
    const ag: Record<string, number> = {};
    for (const [k, n] of Object.entries(d.in)) { const a = takeMaterial(s, p, k, n); for (const o in a) ag[o] = (ag[o] ?? 0) + a[o]; }
    (s.branningar ??= []).push({ st: t.id, b: id, t0: s.now, slut: s.now + d.tim * HOUR, ag: Object.keys(ag).length ? ag : undefined });
    count(s, 'branning_' + id);
    if (forstaGang(s, 'branningForsta_' + id)) log(s, `${p.name} tände byns första ${d.namn.toLowerCase()}.`, 'world', [p.id]);
    return;
  }
  if (b.slut > s.now) return;
  s.branningar = branningarOf(s).filter(x => x !== b);
  if (!s.branningar.length) delete s.branningar;
  tk.items = { ...(tk.items ?? {}) };
  for (const [k, n] of Object.entries(d.ut)) tk.items[k] = (tk.items[k] ?? 0) + n;
  dropLoad(s, tk, p.x, p.y);
  for (const [k, n] of Object.entries(d.ut)) count(s, 'brant_' + k, n);
  if (forstaGang(s, 'branningTomd_' + id)) log(s, `${p.name} rev byns första ${d.namn.toLowerCase()} och tog ut ${Object.entries(d.ut).map(([k, n]) => `${n} ${k}`).join(' och ')}.`, 'world', [p.id]);
}
// en rad i TAKTER (steg.ts): bränningarna som blivit klara sedan sist märks, en gång var (inget räknas medan de går)
export function branningSteg(s: State) {
  for (const b of branningarOf(s)) if (!b.klar && b.slut <= s.now) { b.klar = 1; count(s, 'branningKlar_' + b.b); }
  // en bränning vars station är borta (riven, bränd) finns inte längre
  if (s.branningar?.some(b => !stationerOf(s).some(t => t.id === b.st))) { s.branningar = s.branningar.filter(b => stationerOf(s).some(t => t.id === b.st)); if (!s.branningar.length) delete s.branningar; }
}
// kolet som projekt: ingen egen brist, men den som vill ha något som kräver kol kolar, och vill då ha ved till milan (receptet)
laggTillProjekt({
  kol: {
    namn: 'Kol', vikt: 1,
    brist: () => 0,
    kostnad: () => grundvarde('kol') * BRANN.kolUt,
    kan: (s, p) => !!laddbar(s, p, 'kolmila'),
    recept: (s, p) => knows(p, 'kolmila') && branningsStationer(s, 'kolmila').some(t => !branningI(s, t)) ? { av: { ...BRANNINGAR.kolmila.in } } : undefined,
    uppgift: (s, p) => { const t = laddbar(s, p, 'kolmila'); return t && branningUppgift(s, t); },
  },
});
