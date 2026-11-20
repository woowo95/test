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
import { ALDER, ageOf, count, forstaGang, living, log } from './folk';
import { rnd } from './slump';
import { hourOf, isLight } from './tid';
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
  kolMiss: 2, // varje missad tillsyn vid milan ger så här mycket mindre kol (steg 12.2.2)
  tillsynMin: 2, // en tillsyn tar så här många minuter ...
  tillsynSen: 0.5, // ... och kommer ingen inom så här många timmar efter tiden är den missad
  ugnMalm: 8, ugnKol: 10, // en blåsning i blästerugnen tar så här mycket malm och kol (steg 12.2.3) ...
  ugnUt: 6, // ... och ger så här mycket järn
  ugnTim: 4, // ugnen går så här många timmar efter klockan
  ugnLadda: 7, ugnTomma: 4, // minuter att ladda och tända, och att bryta ut luppen och slå ur slaggen
  ugnMiss: 1, // varje missat pass vid bälgen ger så här mycket mindre järn
});
export interface BranningDef {
  namn: string; station: string; tek: string; act: 'kola' | 'blasa'; // handlingen vid stationen
  in: Record<string, number>; ut: Record<string, number>;
  tim: number; // så många timmar bränningen går efter klockan
  ladda: number; tomma: number; // minuter att ladda och tända, och att tömma
  torr?: string; // det som läggs in ska vara torrt (veden: torrVed i blotved.ts)
  ladda_text: string; tomma_text: string;
  tillsyn: number[]; miss: Record<string, number>; // tiderna att se till (timmar efter tändningen) och vad en missad tillsyn kostar (steg 12.2.2)
  tillsyn_text: string;
}
export const BRANNINGAR: Record<string, BranningDef> = {
  kolmila: {
    namn: 'Kolmila', station: 'kolmila', tek: 'kolmila', act: 'kola', in: { ved: BRANN.kolVed }, ut: { kol: BRANN.kolUt }, tim: BRANN.kolTim,
    ladda: BRANN.kolLadda, tomma: BRANN.kolTomma, torr: 'ved',
    ladda_text: 'Reser och täcker ved till en kolmila och tänder den.', tomma_text: 'River kolmilan och tar ut kolet.',
    tillsyn: [1, 2, 3], miss: { kol: BRANN.kolMiss }, tillsyn_text: 'Tätar sprickorna i kolmilan.',
  },
  // blästerugnen (steg 12.2.3): malm och kol blir järn. Malmen rostas på ugnens eld när den laddas, och luppen (järnklumpen) och
  // slaggen finns bara i texten och bilden. Vid passen trampas bälgen
  blasterugn: {
    namn: 'Blåsning', station: 'blasterugn', tek: 'blasterugn', act: 'blasa', in: { malm: BRANN.ugnMalm, kol: BRANN.ugnKol }, ut: { jarn: BRANN.ugnUt }, tim: BRANN.ugnTim,
    ladda: BRANN.ugnLadda, tomma: BRANN.ugnTomma,
    ladda_text: 'Rostar malmen, laddar blästerugnen med malm och kol och tänder.', tomma_text: 'Bryter ut luppen ur blästerugnen och slår ur slaggen.',
    tillsyn: [1, 2, 3], miss: { jarn: BRANN.ugnMiss }, tillsyn_text: 'Trampar bälgen vid blästerugnen.',
  },
};
// bränningen i en station: sorten, när den tändes, när den är klar, och vems det som lades in var
export interface Branning { st: number; b: string; t0: number; slut: number; klar?: 1; ag?: Record<string, number>; sedd?: number; mi?: number; miss?: number } // sedd och mi: tillsynerna som gjorts och missats (bitar), miss: hur många som missats (steg 12.2.2)
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
  return b ? { act: d.act, text: d.tomma_text, min: d.tomma, spot: vidStation(t), ref: t.id }
    : { act: d.act, text: d.ladda_text, min: d.ladda, spot: vidStation(t), ref: t.id };
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
  const ut = utfall(d, b.miss ?? 0);
  for (const [k, n] of Object.entries(ut)) if (n > 0) tk.items[k] = (tk.items[k] ?? 0) + n;
  dropLoad(s, tk, p.x, p.y);
  for (const [k, n] of Object.entries(ut)) count(s, 'brant_' + k, n);
  if (forstaGang(s, 'branningTomd_' + id)) log(s, `${p.name} rev byns första ${d.namn.toLowerCase()} och tog ut ${Object.entries(d.ut).map(([k, n]) => `${n} ${k}`).join(' och ')}.`, 'world', [p.id]);
}
// det som kommer ut med så många missade tillsyner (aldrig under noll)
export const utfall = (d: BranningDef, miss: number) => Object.fromEntries(Object.entries(d.ut).map(([k, n]) => [k, Math.max(0, n - miss * (d.miss[k] ?? 0))]));
// ---------- tillsynen (steg 12.2.2, Järnet: Tillsynen) ----------
// En bränning ska ses till vid kända tider (tillsyn, timmar efter tändningen). Kommer ingen inom BRANN.tillsynSen timmar efter
// tiden är tillsynen missad, och varje missad tillsyn ger mindre ut (miss). Tiderna är en regel om världen; vem som går är ingen
// regel: raden passa i ARBETEN (val.ts) är ett Tillfälle som prövas när tiden för tillsynen är inne, och farorna går före som vanligt
const tidFor = (b: Branning, d: BranningDef, k: number) => b.t0 + d.tillsyn[k] * HOUR;
// tillsynen som kan göras nu vid bränningen b: den första vars tid har kommit och som varken gjorts eller missats
export function tillsynNu(s: State, b: Branning) {
  const d = BRANNINGAR[b.b];
  for (let k = 0; k < d.tillsyn.length; k++) {
    if ((b.sedd ?? 0) & (1 << k)) continue;
    const t = tidFor(b, d, k);
    if (s.now < t) return undefined;
    if (s.now <= t + BRANN.tillsynSen * HOUR) return { k, fran: t, till: t + BRANN.tillsynSen * HOUR };
  }
  return undefined;
}
// tiderna för bränningen (stationens text i gränssnittet): klockslag och om tillsynen gjorts, missats eller väntar
export function tillsynTider(s: State, b: Branning) {
  const d = BRANNINGAR[b.b];
  return d.tillsyn.map((_, k) => { const t = tidFor(b, d, k); return { t, sedd: !!((b.sedd ?? 0) & (1 << k)), missad: !((b.sedd ?? 0) & (1 << k)) && s.now > t + BRANN.tillsynSen * HOUR }; });
}
// bränningen på stationen i text (rutan under musen i gränssnittet): när den är klar och tillsynens tider, ✓ gjord, ✗ missad
const kl = (t: number) => { const h = hourOf(t), m = Math.round((h % 1) * 60); return `${Math.floor(h) + (m === 60 ? 1 : 0)}:${String(m % 60).padStart(2, '0')}`; };
export function branningText(s: State, t: Station) {
  const b = branningI(s, t);
  if (!b) return undefined;
  const tider = tillsynTider(s, b).map(x => `${x.sedd ? '✓' : x.missad ? '✗' : '○'} ${kl(x.t)}`).join(' ');
  return `🔥 ${b.slut <= s.now ? 'klar' : 'klar ' + kl(b.slut)}${tider ? ' · tillsyn ' + tider : ''}`;
}
// en bränning som behöver ses till nu och som ingen redan går till (den första), för p
export function passaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen) return undefined;
  for (const b of branningarOf(s)) {
    const d = BRANNINGAR[b.b], n = tillsynNu(s, b), t = stationerOf(s).find(x => x.id === b.st);
    if (!n || !t || !knows(p, d.tek)) continue;
    if (living(s).some(q => q !== p && q.task?.act === 'passa' && q.task.ref === t.id)) continue;
    return { b, t, n, d };
  }
  return undefined;
}
export const passaUppgift = (v: NonNullable<ReturnType<typeof passaVal>>) => ({ act: 'passa' as const, text: v.d.tillsyn_text, min: BRANN.tillsynMin, spot: vidStation(v.t), ref: v.t.id });
// tillsynen är gjord (KLAR i steg.ts): den räknas, om den inte hann bli missad medan den gjordes
export function passaKlar(s: State, p: Person, tk: Task) {
  const b = branningarOf(s).find(x => x.st === tk.ref), n = b && tillsynNu(s, b);
  if (!b || !n) return;
  b.sedd = (b.sedd ?? 0) | (1 << n.k);
  count(s, 'tillsyn_' + b.b);
  if (forstaGang(s, 'tillsynForsta_' + b.b)) log(s, `${p.name} såg till ${BRANNINGAR[b.b].namn.toLowerCase()}n.`, 'world', [p.id]);
}
// utfallet som väntas om bränningen tänds vid tiden t: tillsynerna som faller på dagen antas bli gjorda, de på natten
// missas (projektet kol tänder hellre när tillsynen faller på dagen)
export function vantatUtfall(d: BranningDef, t: number) {
  const natt = d.tillsyn.filter(h => !isLight(t + h * HOUR)).length, ut = utfall(d, natt), full = Object.values(d.ut).reduce((a, n) => a + n, 0);
  return full > 0 ? Object.values(ut).reduce((a, n) => a + n, 0) / full : 1;
}
// en rad i TAKTER (steg.ts): bränningarna som blivit klara sedan sist märks, en gång var, och tillsynerna vars sista stund gått
// räknas som missade (inget räknas medan de går: varje tid är känd)
export function branningSteg(s: State) {
  for (const b of branningarOf(s)) {
    const d = BRANNINGAR[b.b];
    for (let k = 0; k < d.tillsyn.length; k++) {
      const bit = 1 << k;
      if ((b.sedd ?? 0) & bit || ((b.mi ?? 0) & bit) || s.now <= tidFor(b, d, k) + BRANN.tillsynSen * HOUR) continue;
      b.mi = (b.mi ?? 0) | bit; b.miss = (b.miss ?? 0) + 1; count(s, 'tillsynMissad_' + b.b);
    }
    if (!b.klar && b.slut <= s.now) { b.klar = 1; count(s, 'branningKlar_' + b.b); }
  }
  // en bränning vars station är borta (riven, bränd) finns inte längre
  if (s.branningar?.some(b => !stationerOf(s).some(t => t.id === b.st))) { s.branningar = s.branningar.filter(b => stationerOf(s).some(t => t.id === b.st)); if (!s.branningar.length) delete s.branningar; }
}
// en bränning av sorten b som brunnit klart och ska tömmas, för den vuxna p: att ta ut det som kommit ut är arbete för samma
// projekt som att ladda, och har kolets eller järnets värde
const klarI = (s: State, p: Person, b: string) => ageOf(p, s.now) >= ALDER.vuxen ? branningsStationer(s, b).find(t => { const x = branningI(s, t); return !!x && x.slut <= s.now; }) : undefined;
// kolet som projekt: ingen egen brist, men den som vill ha något som kräver kol kolar, och vill då ha ved till milan (receptet)
laggTillProjekt({
  kol: {
    namn: 'Kol', vikt: 1,
    brist: () => 0,
    kostnad: () => grundvarde('kol') * BRANN.kolUt,
    kan: (s, p) => !!klarI(s, p, 'kolmila') || !!laddbar(s, p, 'kolmila') && rnd(s, 'val', p) < vantatUtfall(BRANNINGAR.kolmila, s.now), // hellre när tillsynen faller på dagen (steg 12.2.2)
    recept: (s, p) => klarI(s, p, 'kolmila') ? { av: {} } : knows(p, 'kolmila') && branningsStationer(s, 'kolmila').some(t => !branningI(s, t)) ? { av: { ...BRANNINGAR.kolmila.in } } : undefined,
    uppgift: (s, p) => { const t = klarI(s, p, 'kolmila') ?? laddbar(s, p, 'kolmila'); return t && branningUppgift(s, t); },
  },
});
// järnet som projekt (steg 12.2.3): som kolet, ingen egen brist; den som vill ha järn blåser, och vill då ha malm och kol (receptet)
laggTillProjekt({
  jarn: {
    namn: 'Järn', vikt: 1,
    brist: () => 0,
    kostnad: () => grundvarde('jarn') * BRANN.ugnUt,
    kan: (s, p) => !!klarI(s, p, 'blasterugn') || kanSmidaOm(s, p) || !!laddbar(s, p, 'blasterugn') && rnd(s, 'val', p) < vantatUtfall(BRANNINGAR.blasterugn, s.now), // järnskrotet smids om först (steg 12.2.7)
    recept: (s, p) => klarI(s, p, 'blasterugn') ? { av: {} } : knows(p, 'blasterugn') && branningsStationer(s, 'blasterugn').some(t => !branningI(s, t)) ? { av: { ...BRANNINGAR.blasterugn.in } } : undefined,
    uppgift: (s, p) => { const k = klarI(s, p, 'blasterugn'); if (k) return branningUppgift(s, k); if (kanSmidaOm(s, p)) return omsmidUppgift(s, p); const t = laddbar(s, p, 'blasterugn'); return t && branningUppgift(s, t); },
  },
});
import { kanSmidaOm, omsmidUppgift } from './jarnsaker';
