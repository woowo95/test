// En testby sammanfattad med RADTAL en gång per dygn (steg 11.2.10, Flera samhällen: Raden mäts mot testbyarna). Skriver som
// JSON en rad per dygn (ett år i spelet): folk, mat i dygn, rikedom per person, antal tekniker byn kan per nivå, andelen med en
// tro och om byn dött ut (återgrundats) någon gång till och med det dygnet
import './utc';
import { STEG_DYGN, korBy } from './kor';
import { TEK, alive, foodDays, lasRad } from '../sim';

const [seed, dagar] = process.argv.slice(2).map(Number);
export interface RadMatt { folk: number; matDygn: number; rikPer: number; tek: Record<number, number>; tro: number; dott: number }
const dygn: RadMatt[] = [];
let steg = 0;
korBy(seed, dagar, s => {
  if (++steg % STEG_DYGN) return;
  const tal = lasRad(s), folk = s.people.filter(alive), kan = new Set<string>(), tek: Record<number, number> = {};
  for (const p of folk) for (const id in p.tek ?? {}) if ((p.tek![id] ?? 0) >= 1) kan.add(id);
  for (const id of kan) { const n = TEK[id]?.niva; if (n) tek[n] = (tek[n] ?? 0) + 1; }
  dygn.push({ folk: tal.folk, matDygn: foodDays(s), rikPer: tal.rikedom / Math.max(1, tal.folk), tek, tro: folk.length ? folk.filter(p => p.tro !== undefined).length / folk.length : 0, dott: (s.stat?.atergrundad ?? 0) > 0 ? 1 : 0 });
});
console.log(JSON.stringify({ seed, dygn }));
