// ---------- världens slag och slump (steg 11.2.17, Flera samhällen: Världen i tal: världens slag och slump) ----------
// Världen har fasta perioder räknade från världens början (PERIODER): en timme i verkligheten (ungefär 15 dagar i spelet) och
// ett dygn (ett år i spelet). Det som räknas varje period står som rader i PERIODRADER (fylls av raden i 11.3 och senare), och
// varje rad räknar världens rader i ordning efter sitt nummer. Har flera perioder gått räknas de en i taget i tidsordning, och
// det som händer vid en känd tid (ett sällskap kommer fram, ett läger bryts upp) ligger i kön (vl.ko), sorterad på tiden, och
// räknas vid den tiden av sin rad i KOHANDELSER. Allt räknas mot klockan och aldrig per slag, så det levande läget och
// ikappräkningen ger exakt samma värld. Slumpen utanför byn är en hash av världens frö, sakens nummer, periodens nummer och
// ärendet (varldSlump); inga slumpföljder sparas i världen, och byns slump rörs aldrig.
import { hash3 } from './slump';
import { SEC, State } from './typer';
import { Varlden } from './varlden';

export type PeriodId = 'timme' | 'dygn';
// perioderna i verklig tid; i spelet är en timme ungefär 15 dagar och ett dygn ett år
export const PERIODER: Record<PeriodId, { sek: number }> = {
  timme: { sek: 3600 },
  dygn: { sek: 86400 },
};
export const PERIOD_IDS = Object.keys(PERIODER) as PeriodId[];

// det som räknas varje period, i registrets ordning: n är periodens nummer från världens början (0 är den första)
export interface PeriodRad { namn: string; period: PeriodId; fn: (s: State, vl: Varlden, n: number) => void }
export const PERIODRADER: PeriodRad[] = [];

// kön: det som händer vid en känd tid
export interface KoPost { t: number; nr: number; typ: string; sak?: number; data?: Record<string, number> }
export const KOHANDELSER: Record<string, (s: State, vl: Varlden, p: KoPost) => void> = {};

// ett tal mellan 0 och 1 ur världens frö, sakens nummer (rad, sällskap, plats), periodens nummer och ärendet
export const varldSlump = (vl: Varlden, sak: number, period: number, arende: number) =>
  hash3(hash3(vl.fro, sak, period, 0x534c4147) * 2 ** 31 | 0, arende, period, 0x4152454e);
// ett antal hela händelser ur det väntade antalet: heltalsdelen sker säkert och resten är en chans
export const antalUr = (vantat: number, slump: number) => Math.floor(vantat) + (slump < vantat - Math.floor(vantat) ? 1 : 0);

// periodernas slut och när världen började (den första gången huvudbyns tid; förhistorien flyttar den bakåt)
const borjan = (s: State, vl: Varlden) => vl.borjan ??= s.founded;
export const periodSlut = (vl: Varlden, k: PeriodId, n: number) => vl.borjan! + (n + 1) * PERIODER[k].sek * SEC;
export const periodNu = (vl: Varlden, k: PeriodId, t: number) => Math.floor((t - vl.borjan!) / (PERIODER[k].sek * SEC));

// lägg något i kön vid tiden t; kön hålls sorterad på tiden och, vid samma tid, på när den lades in
export function laggIKo(vl: Varlden, t: number, typ: string, o: { sak?: number; data?: Record<string, number> } = {}): KoPost {
  const ko = vl.ko ??= [], p: KoPost = { t, nr: vl.nastaKo = (vl.nastaKo ?? 0) + 1, typ, ...o };
  let i = ko.length;
  while (i > 0 && ko[i - 1].t > t) i--;
  ko.splice(i, 0, p);
  return p;
}

// världen fram till nu: det som ligger först i tiden räknas först, kön före perioderna vid samma tid och timmen före dygnet
export const varldSteg = (s: State) => varldTill(s, s.now);
// världen räknas fram till tiden till (förhistorien, forhistoria.ts, räknar fram till huvudbyns grundande)
export function varldTill(s: State, till: number) {
  const vl = s.varld;
  if (!vl) return;
  borjan(s, vl);
  const klar = vl.perioder ??= { timme: 0, dygn: 0 };
  for (let varv = 0; varv < 1e6; varv++) {
    const ko = vl.ko?.[0];
    let nasta: PeriodId | 'ko' | undefined, t = till;
    if (ko && ko.t <= t) { nasta = 'ko'; t = ko.t; }
    for (const k of PERIOD_IDS) { const ts = periodSlut(vl, k, klar[k]); if (ts <= till && (nasta === undefined || ts < t)) { nasta = k; t = ts; } }
    if (!nasta) return;
    if (nasta === 'ko') { vl.ko!.shift(); KOHANDELSER[ko!.typ]?.(s, vl, ko!); continue; }
    const n = klar[nasta]++;
    for (const r of PERIODRADER) if (r.period === nasta) r.fn(s, vl, n);
  }
}

// världens rader får tillsammans kosta högst så stor del av huvudbyns datortid (Världens kostnad och lagringen); mäts med
// npm run varldkostnad (steg 11.2.18)
export const VARLDKOSTNAD = { andel: 0.02 };
