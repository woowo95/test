import { SAKER } from './saker';
import { STATIONER, TILLBEHOR } from './stationer';
import { DORRAR, MATERIAL } from './byggnad';
import { ODLING } from './odling';

// ---------- arbetstiderna (steg 2.12.8) ----------
// Riktlinjen för hur lång tid ett arbete får ta (Arbete, Arbetstider i designdokumentet). Spelet följer klockan, så det är
// riktiga minuter (en minut är ungefär sex timmar i spelet). Varje tid i registren har sitt slag: sakerna på raden
// (skaffa.slag i saker.ts), stationerna, möblerna, tillbehören och dörrarna är stationer, väggar och golv har slaget i k
// (MATERIAL i byggnad.ts) och fältets steg är fältrutor. Scenariot tider larmar när en tid ligger utanför sitt slag.
// Turerna när man samlar (en full börda på 10–20 minuter) väntar på Björns svar i steg 2.12.4 och står inte här än.
export const TIDSLAG = {
  liten: { namn: 'Liten sak (rep, spjut, kniv)', min: 2, max: 4 },
  stor: { namn: 'Stor sak (yxa, kläder, säck)', min: 2, max: 5 },
  station: { namn: 'Station eller möbel', min: 10, max: 20 },
  vagg: { namn: 'Vägg (per ruta)', min: 20, max: 20 },
  golv: { namn: 'Golv (per ruta)', min: 5, max: 10 },
  falt: { namn: 'Fältruta', min: 2, max: 8 },
  // inte i riktlinjen: att slakta, rensa, grilla och torka en bit (förslag, Björn kan ändra)
  bearbeta: { namn: 'Bearbeta mat och vilt', min: 2, max: 8 },
};
export type TidSlag = keyof typeof TIDSLAG;

// alla tider i registren: namnet, slaget och minuterna
export function allaTider(): { namn: string; slag: TidSlag | undefined; min: number }[] {
  const ut: { namn: string; slag: TidSlag | undefined; min: number }[] = [];
  for (const d of Object.values(SAKER)) if (d?.skaffa?.min !== undefined) ut.push({ namn: d.namn, slag: d.skaffa.slag, min: d.skaffa.min });
  for (const d of [...Object.values(STATIONER), ...Object.values(TILLBEHOR), ...Object.values(DORRAR)]) ut.push({ namn: d.namn, slag: 'station', min: d.min });
  for (const m of Object.values(MATERIAL)) if (m.k === 'vagg' || m.k === 'golv') ut.push({ namn: m.namn, slag: m.k, min: m.tim * 60 });
  for (const [k, n] of [['röja', ODLING.rojaMin], ['gräva', ODLING.beredaMin], ['så', ODLING.saMin], ['skörda', ODLING.skordaMin]] as const) ut.push({ namn: `Fältruta: ${k}`, slag: 'falt', min: n });
  return ut;
}
// tiderna som ligger utanför sitt slag, eller saknar slag
export const tiderUtanfor = () => allaTider().filter(t => !t.slag || t.min < TIDSLAG[t.slag].min - 1e-9 || t.min > TIDSLAG[t.slag].max + 1e-9);
