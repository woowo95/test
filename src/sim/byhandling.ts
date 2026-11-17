// ---------- det en by gör mot en annan (steg 11.6.5, Flera samhällen: Relationen och läget mellan två byar) ----------
// Registret BYHANDLINGAR: varje rad är något en by kan göra mot en by i sitt grannät, med en poäng och det som händer. En gång
// om dygnet (ett år i spelet; raden 'byarnas handlingar' i PERIODRADER) väljer varje by i världen som har en ledare den
// handling och den granne som ger högst poäng, och gör den om poängen är över noll. Poängen vägs av ledarens personlighet
// (egenskaperna ur nyckeln, radperson.ts) och av trons skalor (hur krigisk byns tro är), och ett litet slumptal ur världens frö
// gör att samma by inte alltid väljer samma sak. Relationen (byrel.ts) är det som ändras; BYHANDELSER säger hur mycket.
// Fler rader kommer med sina steg: handelsfärden (11.6.6), gåvan (11.6.14), mutan (11.6.15), anfallen (11.6.16), kriget
// (11.6.22) och sändebudet (11.6.23). Huvudbyn väljer ur samma register när handlingen kan bli en resa med verkliga bybor.
import { balans } from './balans';
import { byHandelse, relation } from './byrel';
import { count } from './folk';
import { varldPlatsNr } from './landmarken';
import { lever } from './rad';
import { fastEgenskaper, radLedare } from './radperson';
import { BYSORTER, radNr, VarldRad } from './radtal';
import { clamp } from './slump';
import { PERIODRADER, varldSlump } from './varldslag';
import { Varlden } from './varlden';
import { Stat, State } from './typer';

export const BYHANDLING = balans('byhandling', {
  slump: 0.1, // så mycket kan slumpen flytta en poäng åt varje håll
  fjaskMal: 30, // fjäsket lönar sig tills relationen nått hit
  fjaskKostnad: 0.1, // det fjäsket kostar i poäng (tid, ära)
  radsla: 2, // högst så mycket väger att grannen är starkare (styrkan delad med den egna)
});

// det poängen räknas ur: byn som gör (r), grannen (mot), hur r ser på mot, ledarens egenskaper (1–20) och trons krigiskhet (0–1)
export interface ByCtx { s: State; vl: Varlden; r: VarldRad; mot: VarldRad; rel: number; led?: Record<Stat, number>; krig: number }
export interface ByHandlingDef { namn: string; poang: (c: ByCtx) => number; gor: (c: ByCtx) => void }
// en egenskap hos ledaren från 0 till 1 (en by utan känd ledare är mitt emellan)
export const ledDrag = (c: ByCtx, k: Stat) => ((c.led?.[k] ?? 10.5) - 1) / 19;
// hur mycket starkare grannen är, mellan 1/radsla och radsla
const radsla = (c: ByCtx) => clamp((c.mot.tal.styrka + 1) / (c.r.tal.styrka + 1), 1 / BYHANDLING.radsla, BYHANDLING.radsla);

export const BYHANDLINGAR = {
  // fjäsket: vänliga ord till en granne man vill stå väl med, mest mot en starkare granne och av en ledare med karisma; en
  // krigisk tro fjäskar mindre
  fjask: {
    namn: 'Fjäsk',
    poang: c => Math.max(0, BYHANDLING.fjaskMal - c.rel) / 100 * (0.5 + ledDrag(c, 'karisma')) * radsla(c) * (1 - c.krig / 2) - BYHANDLING.fjaskKostnad,
    gor: c => byHandelse(c.vl, 'fjask', c.r.nr, c.mot.nr),
  },
} as const satisfies Record<string, ByHandlingDef>;
export type ByHandlingId = keyof typeof BYHANDLINGAR;
export const BYHANDLING_IDS = Object.keys(BYHANDLINGAR) as ByHandlingId[];
const DEF: Record<ByHandlingId, ByHandlingDef> = BYHANDLINGAR;

// grannarna till byn r som lever och är byar (huvudbyn är med)
export function radGrannar(vl: Varlden, r: VarldRad): VarldRad[] {
  const p = (vl.platser ?? []).find(q => q.by === r.nr);
  const ut: VarldRad[] = [];
  for (const g of p?.grannar ?? []) {
    const q = varldPlatsNr(vl, g.nr), m = q?.by !== undefined ? radNr(vl, q.by) : undefined;
    if (m && m.nr !== r.nr && BYSORTER[m.sort].folk && (m.nr === vl.huvud || lever(vl, m))) ut.push(m);
  }
  return ut;
}
export const byCtx = (s: State, vl: Varlden, r: VarldRad, mot: VarldRad): ByCtx => {
  const l = radLedare(r);
  return { s, vl, r, mot, rel: relation(vl, r.nr, mot.nr) ?? 0, led: l ? fastEgenskaper(l) : undefined, krig: (r.tro?.krig ?? 50) / 100 };
};
// det byn r väljer i perioden n: handlingen och grannen med högst poäng (med slumpens lilla del), eller inget
export function byVal(s: State, vl: Varlden, r: VarldRad, n: number): { id: ByHandlingId; c: ByCtx; poang: number } | undefined {
  let bast: { id: ByHandlingId; c: ByCtx; poang: number } | undefined;
  const gr = radGrannar(vl, r);
  for (let i = 0; i < gr.length; i++) {
    const c = byCtx(s, vl, r, gr[i]);
    BYHANDLING_IDS.forEach((id, j) => {
      const p = DEF[id].poang(c) + (varldSlump(vl, r.nr, n, 0x4248 + i * 64 + j) - 0.5) * 2 * BYHANDLING.slump;
      if (p > 0 && (!bast || p > bast.poang)) bast = { id, c, poang: p };
    });
  }
  return bast;
}
// en gång om dygnet: varje by i världen med en ledare gör det den valt
export function byarnasHandlingar(s: State, vl: Varlden, n: number) {
  for (const r of [...vl.rader ?? []]) {
    if (!lever(vl, r) || !BYSORTER[r.sort].ledare) continue;
    const v = byVal(s, vl, r, n);
    if (!v) continue;
    DEF[v.id].gor(v.c);
    count(s, 'byhandling_' + v.id);
  }
}
PERIODRADER.push({ namn: 'byarnas handlingar', period: 'dygn', fn: (s, vl, n) => byarnasHandlingar(s, vl, n) });
