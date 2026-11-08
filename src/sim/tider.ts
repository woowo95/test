import { SAKER } from './saker';
import { STATIONER, TILLBEHOR } from './stationer';
import { DORRAR, MATERIAL } from './byggnad';
import { ODLING } from './odling';
import type { Act } from './typer';
import { ACTS } from './handlingar';
import { GORS } from './redskap';

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
  falt: { namn: 'Fältruta', min: 1, max: 8 }, // 1: att så en ruta tar en minut (steg 3.10.23.4; 2 före)
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

// ---------- tidsslaget för varje handling (steg 9.2.63) ----------
// Varje handling har ett slag som typkontrollen kräver: ett arbete i TIDSLAG, som inte får ta längre än slagets längsta tid,
// eller en stund (det som inte är ett arbete med en tid: samlandet och de andra passen, vilan, samtalet, bygget per pass).
// Vakten i npm test och npm run balans (forLangtArbete, kor.ts) larmar när ett arbete tar längre tid än sitt slag, också de
// arbeten vars tid inte står i registren. Arbetet får ta TID_MARG gånger slagets längsta tid, för den som är långsam
export const TID_MARG = 1.5;
// Slaget räknas för varje handling i ACTS: ett hantverk efter sakerna det gör (skaffa.slag i saker.ts, den längsta), en station, ett tillbehör och en dörr är en station, och resten en stund. En ny
// handling får alltså alltid ett slag (en ny sak kräver redan sitt slag, steg 2.12.8)
// att slakta, rensa, grilla och torka görs i omgångar (en hel fångst i ett pass, SLAKT i redskap.ts), så passet är en stund;
// tiden per bit står i SLAKT och prövas av scenariot tider
const BEARBETA = new Set<string>(), STATION_AKT = new Set(['station', 'tillbehor', 'dorr']);
let tidAkt: Record<Act, TidSlag | 'stund'> | undefined; // räknas när den behövs (saker.ts läser den här filen när den laddas)
export function tidSlagAv(a: Act): TidSlag | 'stund' {
  tidAkt ??= Object.fromEntries((Object.keys(ACTS) as Act[]).map(x => {
    if (BEARBETA.has(x)) return [x, 'bearbeta'];
    if (STATION_AKT.has(x)) return [x, 'station'];
    const ks = GORS[x];
    if (ks?.length) { const sl = ks.map(k => SAKER[k]?.skaffa?.slag).filter((y): y is TidSlag => !!y); return [x, sl.sort((y, z) => TIDSLAG[z].max - TIDSLAG[y].max)[0] ?? 'stund']; }
    return [x, 'stund'];
  })) as Record<Act, TidSlag | 'stund'>;
  return tidAkt[a] ?? 'stund';
}
// tar arbetet t, som börjar nu, längre tid än sitt slag? Svarar med vad som är fel, annars undefined
export function forLangtArbete(t: { act: Act; until: number }, nu: number): string | undefined {
  const slag = tidSlagAv(t.act);
  if (!slag || slag === 'stund') return undefined;
  const min = (t.until - nu) / 60000, max = TIDSLAG[slag].max * TID_MARG;
  return min > max + 1e-6 ? `${t.act} tar ${Math.round(min)} minuter, slaget ${TIDSLAG[slag].namn.toLowerCase()} högst ${TIDSLAG[slag].max} (gånger ${TID_MARG})` : undefined;
}
