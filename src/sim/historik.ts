import { living } from './folk';
import { amountOf, foodOf } from './lager';
import { skogAndel } from './mark';
import { avgMood } from './humor';
import { DAY, Historik, State, WEEK } from './typer';
import { TORST } from './torst';

// ---------- byns historik ----------
// Några nyckeltal sparas en gång i timmen (en timme är ca 15 dagar i spelet). Efter en vecka (en tidsålder) slås
// timmarna ihop till ett värde per dygn (ett år i spelet), så att historiken räcker till byns början utan att växa
// mycket. Viktiga händelser sparas för alltid i krönikan. Historiken sparas i egna delar, en per vecka (serializeParts
// i steg.ts), och läses inte av simuleringen: graferna (steg 5.3.1) läser den.
// hur: 'snitt' = medelvärdet över dygnet när timmarna slås ihop, 'sist' = det sista värdet (det som räknas upp)
const HISTORIK_TAL: { id: string; namn: string; hur: 'snitt' | 'sist'; varde: (s: State) => number }[] = [
  { id: 'folk', namn: 'Invånare', hur: 'snitt', varde: s => living(s).length },
  { id: 'mat', namn: 'Mat i förrådet', hur: 'snitt', varde: s => foodOf(s) },
  { id: 'tra', namn: 'Trä i förrådet', hur: 'snitt', varde: s => amountOf(s, 'ved') },
  { id: 'humor', namn: 'Humör', hur: 'snitt', varde: s => avgMood(s, 0) },
  { id: 'hunger', namn: 'Mycket hungriga', hur: 'snitt', varde: s => living(s).filter(p => p.hunger < 0.15).length },
  { id: 'torst', namn: 'Mycket törstiga', hur: 'snitt', varde: s => living(s).filter(p => p.torst < TORST.farligt).length }, // steg 2.4.1
  { id: 'skadade', namn: 'Skadade', hur: 'snitt', varde: s => living(s).filter(p => p.skador?.length).length }, // steg 2.5.1
  { id: 'skog', namn: 'Skog, andel av marken', hur: 'snitt', varde: s => skogAndel(s) },
  { id: 'fukt', namn: 'Fukt i marken', hur: 'snitt', varde: s => s.vader?.fukt ?? 0.5 }, // steg 2.11.1
  { id: 'sno', namn: 'Snö på marken', hur: 'snitt', varde: s => s.vader?.sno ?? 0 }, // steg 2.11.1
  { id: 'fodda', namn: 'Födda sedan byns början', hur: 'sist', varde: s => (s.stat?.fodda as number) ?? 0 },
  { id: 'doda', namn: 'Döda sedan byns början', hur: 'sist', varde: s => (s.stat?.doda as number) ?? 0 },
];

const ny = (): Historik => ({ tal: HISTORIK_TAL.map(t => t.id), tim: [], dygn: [], kronika: [] });
const histOf = (s: State) => (s.hist ??= ny());

// en viktig händelse i krönikan: en kort rad som sparas för alltid
export function kronika(s: State, text: string) { histOf(s).kronika.push([Math.round(s.now), text]); }

// varje timme: en rad med nyckeltalen, och timmar äldre än en vecka slås ihop till ett värde per dygn
export function historikSteg(s: State) {
  const h = histOf(s);
  if (h.tal.join() !== HISTORIK_TAL.map(t => t.id).join()) omordna(h); // registret har ändrats sedan byn sparades
  h.tim.push([s.now, ...HISTORIK_TAL.map(t => Math.round(t.varde(s) * 1000) / 1000)]);
  const grans = Math.floor((s.now - WEEK) / DAY) * DAY; // hela dygn som är äldre än en vecka
  while (h.tim.length && h.tim[0][0] < grans) {
    const d = Math.floor(h.tim[0][0] / DAY), rader: number[][] = [];
    while (h.tim.length && Math.floor(h.tim[0][0] / DAY) === d) rader.push(h.tim.shift()!);
    h.dygn.push([d * DAY, ...HISTORIK_TAL.map((t, i) => t.hur === 'sist' ? rader[rader.length - 1][i + 1]
      : Math.round(rader.reduce((a, r) => a + r[i + 1], 0) / rader.length * 1000) / 1000)]);
  }
}
// ett nytt nyckeltal får inget värde bakåt (NaN sparas som null), ett borttaget försvinner
function omordna(h: Historik) {
  const ids = HISTORIK_TAL.map(t => t.id), flytta = (r: number[]) => [r[0], ...ids.map(id => { const i = h.tal.indexOf(id); return i < 0 ? NaN : r[i + 1]; })];
  h.tim = h.tim.map(flytta); h.dygn = h.dygn.map(flytta); h.tal = ids;
}

// sparningen: historiken delas i en del per vecka sedan byns början, så att varje del ryms i ett dokument
// (högst 256 KB) och de gamla delarna inte ändras
export function histParts(s: State, h: Historik): Record<string, Historik> {
  const ut: Record<string, Historik> = {}, del = (t: number) => (ut['historik-' + Math.max(0, Math.floor((t - s.founded) / WEEK))] ??= { tal: h.tal, tim: [], dygn: [], kronika: [] });
  for (const r of h.dygn) del(r[0]).dygn.push(r);
  for (const r of h.tim) del(r[0]).tim.push(r);
  for (const k of h.kronika) del(k[0]).kronika.push(k);
  return ut;
}
export function joinHist(delar: Historik[]): Historik {
  const h: Historik = { tal: delar[0].tal, tim: [], dygn: [], kronika: [] };
  for (const d of delar) { h.tim.push(...d.tim); h.dygn.push(...d.dygn); h.kronika.push(...d.kronika); }
  h.tim.sort((a, b) => a[0] - b[0]); h.dygn.sort((a, b) => a[0] - b[0]); h.kronika.sort((a, b) => a[0] - b[0]);
  return h;
}
