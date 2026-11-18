// ---------- huvudbyns sändebud (steg 11.6.23, Flera samhällen: Sändebudet) ----------
// En gång om dygnet väger staten (ledaren) och kyrkan (översteprästen) i huvudbyn var för sig om de vill sända ett besked till
// en granne, med samma poäng som världens byar (raden besked i BYHANDLINGAR, beskedTon i byhandling.ts) men med sina egna
// egenskaper; det högsta över noll blir byns bud (vl.bud), utan omröstning. Budet väntar på den bybo som helst bär det: resan
// väljs i valet av aktivitet (resaPlan i resa.ts), med äran gånger lämpligheten som resans värde. Bär ingen budet inom
// SANDEBUD.giltig dygn glöms det. Beskedet verkar när budet kommit fram (budFram i resa.ts)
import { balans } from './balans';
import { byCtx, beskedTon, radGrannar, BeskedTon } from './byhandling';
import { lever } from './rad';
import { radNr } from './radtal';
import { count, stat } from './folk';
import { ledarenNu } from './liv';
import { overstePrast } from './kyrka';
import { PERIODRADER, varldSlump, periodSlut } from './varldslag';
import { BYHANDLING } from './byhandling';
import { DAY, Person, STATS, Stat, State } from './typer';
import { Varlden } from './varlden';
import { byPlats } from './landmarken';
import { kannerOrt } from './ort';

export const SANDEBUD = balans('sandebud', {
  giltig: 3, // så många dygn (år i spelet) väntar budet på någon som bär det
});
export const BUDGIVARE = {
  staten: { namn: 'Staten', vem: (s: State) => ledarenNu(s) },
  kyrkan: { namn: 'Kyrkan', vem: (s: State) => overstePrast(s) },
} as const satisfies Record<string, { namn: string; vem: (s: State) => Person | undefined }>;
export type Budgivare = keyof typeof BUDGIVARE;
const sandebudUte = (vl: Varlden) => !!vl.sallskap?.some(sl => sl.skal === 'sandebud' && sl.skede !== 'hemma' && sl.skede !== 'forsvunnet');
// det huvudbyn vill sända i perioden n: givaren, grannen och tonen med högst poäng (med slumpens lilla del), eller inget
export function huvudBudVal(s: State, vl: Varlden, n: number): { av: Budgivare; mot: number; ton: BeskedTon; p: number } | undefined {
  const h = vl.huvud === undefined ? undefined : radNr(vl, vl.huvud);
  if (!h) return undefined;
  const t = periodSlut(vl, 'dygn', n), gr = radGrannar(vl, h).filter(g => lever(vl, g));
  let bast: { av: Budgivare; mot: number; ton: BeskedTon; p: number } | undefined;
  (Object.keys(BUDGIVARE) as Budgivare[]).forEach((av, j) => {
    const p = BUDGIVARE[av].vem(s);
    if (!p) return;
    const led = Object.fromEntries(STATS.map(k => [k, stat(p, k, s.now)])) as Record<Stat, number>;
    gr.forEach((g, i) => {
      const pl = byPlats(vl, g.nr);
      if (!pl || kannerOrt(s, p, pl.nr) === undefined) return; // bara till en by givaren känner till
      const b = beskedTon({ ...byCtx(s, vl, h, g, t), led });
      const v = b.p + (varldSlump(vl, h.nr, n, 0x5342 + i * 8 + j) - 0.5) * 2 * BYHANDLING.slump;
      if (v > 0 && (!bast || v > bast.p)) bast = { av, mot: g.nr, ton: b.ton, p: v };
    });
  });
  return bast;
}
export function huvudBud(s: State, vl: Varlden, n: number) {
  const t = periodSlut(vl, 'dygn', n);
  if (vl.bud && t - vl.bud.t < SANDEBUD.giltig * DAY) return;
  vl.bud = undefined;
  if (sandebudUte(vl)) return;
  const v = huvudBudVal(s, vl, n);
  if (!v) return;
  vl.bud = { mot: v.mot, ton: v.ton, av: v.av, t };
  count(s, 'huvudbud_' + v.av);
}
PERIODRADER.push({ namn: 'huvudbyns sändebud', period: 'dygn', fn: (s, vl, n) => huvudBud(s, vl, n) });
