import { living } from './folk';
import { amountOf, foodOf } from './lager';
import { skogAndel } from './mark';
import { avgMood } from './humor';
import { DAY, Historik, RikRad, State, WEEK } from './typer';
import { TORST } from './torst';
import { kartminneSteg } from './kartminne';
import { formogenheter, rikedomDelar } from './varde';
import { SAK_LIST, isTool } from './saker';
import { tingOf } from './agande';

// ---------- byns historik ----------
// Några nyckeltal sparas en gång i timmen (en timme är ca 15 dagar i spelet). Efter en vecka (en tidsålder) slås
// timmarna ihop till ett värde per dygn (ett år i spelet), så att historiken räcker till byns början utan att växa
// mycket. Viktiga händelser sparas för alltid i krönikan. Historiken sparas i egna delar, en per vecka (serializeParts
// i steg.ts). Byn beror aldrig på den (scenariot historik): simuleringen läser bara krönikans längd, som väljer textens
// variant i kronikaBer (berattelser.ts); graferna (steg 5.4.1, ui/graf.ts) läser resten med historikSerie.
// hur: 'snitt' = medelvärdet över dygnet när timmarna slås ihop, 'sist' = det sista värdet (det som räknas upp)
export const HISTORIK_TAL: { id: string; namn: string; hur: 'snitt' | 'sist'; varde: (s: State) => number }[] = [
  { id: 'folk', namn: 'Invånare', hur: 'snitt', varde: s => living(s).length },
  { id: 'mat', namn: 'Mat i förrådet', hur: 'snitt', varde: s => foodOf(s) },
  { id: 'tra', namn: 'Ved i förrådet', hur: 'snitt', varde: s => amountOf(s, 'ved') },
  { id: 'eld', namn: 'Trä på elden', hur: 'snitt', varde: s => s.fire.fuel }, // steg 5.4.1: den första lägerelden
  { id: 'humor', namn: 'Humör', hur: 'snitt', varde: s => avgMood(s, 0) },
  { id: 'hunger', namn: 'Mycket hungriga', hur: 'snitt', varde: s => living(s).filter(p => p.hunger < 0.15).length },
  { id: 'torst', namn: 'Mycket törstiga', hur: 'snitt', varde: s => living(s).filter(p => p.torst < TORST.farligt).length }, // steg 2.4.1
  { id: 'skadade', namn: 'Skadade', hur: 'snitt', varde: s => living(s).filter(p => p.skador?.length).length }, // steg 2.5.1
  { id: 'skog', namn: 'Skog, andel av marken', hur: 'snitt', varde: s => skogAndel(s) },
  { id: 'fukt', namn: 'Fukt i marken', hur: 'snitt', varde: s => s.vader?.fukt ?? 0.5 }, // steg 2.11.1
  { id: 'sno', namn: 'Snö på marken', hur: 'snitt', varde: s => s.vader?.sno ?? 0 }, // steg 2.11.1
  { id: 'fodda', namn: 'Födda sedan byns början', hur: 'sist', varde: s => (s.stat?.fodda as number) ?? 0 },
  { id: 'doda', namn: 'Döda sedan byns början', hur: 'sist', varde: s => (s.stat?.doda as number) ?? 0 },
  { id: 'utbrott', namn: 'Utbrott sedan byns början', hur: 'sist', varde: s => (s.stat?.utbrott as number) ?? 0 }, // steg 3.2.2
];

const ny = (): Historik => ({ tal: HISTORIK_TAL.map(t => t.id), tim: [], dygn: [], kronika: [] });
const histOf = (s: State) => (s.hist ??= ny());

// en viktig händelse i krönikan: en kort rad som sparas för alltid
// slag: vad raden handlar om (mallens id i BERATTELSER, steg 3.9.3), så att den kan hittas utan att läsa texten
// Raden läggs i tidsordning: i ett steg räknar var och en sin egen tid (taskStep i steg.ts), så den som skrivs sist kan ha
// hänt lite tidigare. Då blir krönikan likadan när delarna läses in igen (joinHist sorterar på tiden)
export function kronika(s: State, text: string, slag?: string) {
  const k = histOf(s).kronika, t = Math.round(s.now);
  let i = k.length;
  while (i > 0 && k[i - 1][0] > t) i--;
  k.splice(i, 0, slag ? [t, text, slag] : [t, text]);
}

// varje timme: en rad med nyckeltalen, och timmar äldre än en vecka slås ihop till ett värde per dygn
export function historikSteg(s: State) {
  const h = histOf(s);
  if (h.tal.join() !== HISTORIK_TAL.map(t => t.id).join()) omordna(h); // registret har ändrats sedan byn sparades
  h.tim.push([s.now, ...HISTORIK_TAL.map(t => Math.round(t.varde(s) * 1000) / 1000)]);
  kartminneSteg(s); // en bild av kartan per dygn (steg 5.4.5.2)
  rikSteg(s); // byns rikedom, var och ens förmögenhet och antalet av varje sak per dygn (steg 6.9.13)
  const grans = Math.floor((s.now - WEEK) / DAY) * DAY; // hela dygn som är äldre än en vecka
  while (h.tim.length && h.tim[0][0] < grans) {
    const d = Math.floor(h.tim[0][0] / DAY), rader: number[][] = [];
    while (h.tim.length && Math.floor(h.tim[0][0] / DAY) === d) rader.push(h.tim.shift()!);
    h.dygn.push([d * DAY, ...HISTORIK_TAL.map((t, i) => slaIhop(t.hur, rader.map(r => r[i + 1])))]);
  }
}
// byns rikedom per dygn (steg 6.9.13): en rad när ett nytt dygn börjat (och den första när byn grundats), med rikedomen i
// delar (förrådet, redskapen och husen, som i sidhuvudet), varje levande persons förmögenhet och hur många av varje sak byn
// har (redskap räknas styck, annat i mängd). Hela tal och bara det som inte är noll, så att raden blir kort
export function rikSteg(s: State) {
  const h = s.hist; if (!h) return;
  const r = (h.rik ??= []), dygn = Math.floor(s.now / DAY);
  if (r.length && Math.floor(r[r.length - 1][0] / DAY) === dygn) return;
  r.push(rikRad(s));
}
export function rikRad(s: State): RikRad {
  const d = rikedomDelar(s), egen = formogenheter(s).egen, folk: Record<string, number> = {}, saker: Record<string, number> = {};
  for (const p of living(s)) folk[p.id] = Math.round(egen.get(p.id) ?? 0);
  const styck: Record<string, number> = {};
  for (const t of tingOf(s)) styck[t.k] = (styck[t.k] ?? 0) + 1;
  for (const k of SAK_LIST) { const n = Math.round(isTool(k) ? styck[k] ?? 0 : amountOf(s, k)); if (n) saker[k] = n; }
  return [Math.round(s.now), Math.round(d.forrad), Math.round(d.redskap), Math.round(d.hus), folk, saker];
}
// raden just nu, räknad en gång per stund och by (grafens serier läser den var för sig)
const nuRad = new WeakMap<State, { t: number; r: RikRad }>(); // per by (regel 4)
const rikNu = (s: State) => { let c = nuRad.get(s); if (c?.t !== s.now) nuRad.set(s, c = { t: s.now, r: rikRad(s) }); return c.r; };
// en serie ur rikedomens rader åt grafen (ui/graf.ts): [tid, värde], en punkt per dygn och sist värdet just nu
export function rikSerie(s: State, varde: (r: RikRad) => number | undefined): [number, number][] {
  const ut: [number, number][] = [];
  for (const r of s.hist?.rik ?? []) { const v = varde(r); if (v !== undefined) ut.push([r[0], v]); }
  const nu = varde(rikNu(s));
  if (nu !== undefined) { if (ut.length && ut[ut.length - 1][0] >= s.now) ut.pop(); ut.push([s.now, nu]); }
  return ut;
}

// ett dygns timmar till ett värde: bara de timmar som har ett värde räknas (steg 5.5.7). Ett tal som inte fanns då är NaN i
// minnet och null i en inläst sparfil; utan värde någon timme blir dygnet också utan värde
function slaIhop(hur: 'snitt' | 'sist', v: (number | null)[]) {
  const med = v.filter((x): x is number => Number.isFinite(x));
  if (!med.length) return NaN;
  return hur === 'sist' ? med[med.length - 1] : Math.round(med.reduce((a, x) => a + x, 0) / med.length * 1000) / 1000;
}
// när byn läses in (uppgradering 24 i varld.ts): kolumnerna i registrets ordning direkt, så att graferna har ett nytt tal
// redan före nästa timme
export function historikKolumner(s: State) {
  const h = s.hist;
  if (h && h.tal.join() !== HISTORIK_TAL.map(t => t.id).join()) omordna(h);
}
// ett nytt nyckeltal får inget värde bakåt (NaN sparas som null), ett borttaget försvinner
function omordna(h: Historik) {
  const ids = HISTORIK_TAL.map(t => t.id), flytta = (r: number[]) => [r[0], ...ids.map(id => { const i = h.tal.indexOf(id); return i < 0 ? NaN : r[i + 1]; })];
  h.tim = h.tim.map(flytta); h.dygn = h.dygn.map(flytta); h.tal = ids;
}

// en serie för graferna (steg 5.4.1): [tid, värde] från byns början till nu, ett värde per dygn för det som är äldre än en
// vecka (mitt på dygnet; dygnen slås ihop efter dygnsgränsen i UTC) och sedan ett per timme. Ett tal som inte fanns då hoppas över
export function historikSerie(s: State, id: string): [number, number][] {
  const h = s.hist;
  if (!h) return [];
  const i = h.tal.indexOf(id) + 1, ut: [number, number][] = [];
  if (i < 1) return ut;
  for (const r of h.dygn) if (Number.isFinite(r[i])) ut.push([r[0] + DAY / 2, r[i]]);
  for (const r of h.tim) if (Number.isFinite(r[i])) ut.push([r[0], r[i]]);
  return ut;
}

// sparningen: historiken delas i en del per vecka sedan byns början, så att varje del ryms i ett dokument
// (högst 256 KB) och de gamla delarna inte ändras
export function histParts(s: State, h: Historik): Record<string, Historik> {
  const ut: Record<string, Historik> = {}, del = (t: number) => (ut['historik-' + Math.max(0, Math.floor((t - s.founded) / WEEK))] ??= { tal: h.tal, tim: [], dygn: [], kronika: [] });
  for (const r of h.dygn) del(r[0]).dygn.push(r);
  for (const r of h.tim) del(r[0]).tim.push(r);
  for (const k of h.kronika) del(k[0]).kronika.push(k);
  for (const k of h.kartor ?? []) (del(k[0]).kartor ??= []).push(k);
  for (const k of h.rik ?? []) (del(k[0]).rik ??= []).push(k);
  return ut;
}
export function joinHist(delar: Historik[]): Historik {
  const h: Historik = { tal: delar[0].tal, tim: [], dygn: [], kronika: [] };
  for (const d of delar) { h.tim.push(...d.tim); h.dygn.push(...d.dygn); h.kronika.push(...d.kronika); if (d.kartor) (h.kartor ??= []).push(...d.kartor); if (d.rik) (h.rik ??= []).push(...d.rik); }
  h.kartor?.sort((a, b) => a[0] - b[0]); h.rik?.sort((a, b) => a[0] - b[0]);
  h.tim.sort((a, b) => a[0] - b[0]); h.dygn.sort((a, b) => a[0] - b[0]); h.kronika.sort((a, b) => a[0] - b[0]);
  return h;
}
