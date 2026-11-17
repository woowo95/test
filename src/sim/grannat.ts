// ---------- grannätet (steg 11.2.21, Flera samhällen: Lederna i tal) ----------
// Varje by har ett grannät: de närmaste byarna som går att nå till fots (GRANNAT.antal), räknat i vägens kostnad och inte
// fågelvägen, med vägen (sparad i vl.vagar, vagval.ts) och restiden i dygn (kostnaden delad med VARLD.gangPerDygn; ett dygn är
// ett år i spelet). Grannätet räknas när världen skapas, med en sökning från varje by, och står på byns plats (p.grannar).
// En by på en ö utan andra byar har inga grannar. Färdsätten med packdjur och vagn får sina vägar när resorna kommer.
import { balans } from './balans';
import { VARLD, VarldMark } from './varldmark';
import { Varlden } from './varlden';
import { VarldPlats } from './landmarken';
import { narmasteMal, packaVag } from './vagval';

export const GRANNAT = balans('grannat', {
  antal: 6, // så många grannar har varje by
});
export interface Granne { nr: number; kostnad: number; dygn: number } // platsens nummer, vägens kostnad och restiden till fots

// grannätet för en by: de närmaste byarna, med vägarna sparade i världen
export function byGrannar(vl: Varlden, v: VarldMark, p: VarldPlats, nu: number): Granne[] {
  const byar = new Map((vl.platser ?? []).filter(q => q.k === 'by' && q !== p).map(q => [q.y * v.w + q.x, q] as const));
  const a = p.y * v.w + p.x, funna = narmasteMal(vl, v, a, new Set(byar.keys()), GRANNAT.antal, 'fots');
  const vagar = vl.vagar ??= [];
  return funna.map(f => {
    const kostnad = Math.round(f.kostnad * 1000) / 1000;
    if (!vagar.some(x => x.fs === 'fots' && x.fran === a && x.till === f.till)) vagar.push({ fran: a, till: f.till, fs: 'fots', steg: packaVag(f.rutor, v.w), kostnad, t: nu });
    return { nr: byar.get(f.till)!.nr, kostnad, dygn: Math.round(kostnad / VARLD.gangPerDygn * 100) / 100 };
  });
}
// alla byars grannät (när världen skapas)
export function laggGrannat(vl: Varlden, v: VarldMark, nu: number) {
  for (const p of vl.platser ?? []) if (p.k === 'by') p.grannar = byGrannar(vl, v, p, nu);
}
