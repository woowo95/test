// ---------- grannätet (steg 11.2.21, Flera samhällen: Lederna i tal) ----------
// Varje by har ett grannät: de närmaste byarna som går att nå till fots (GRANNAT.antal), räknat i vägens kostnad och inte
// fågelvägen, med vägen (sparad i vl.vagar, vagval.ts) och restiden i dygn (kostnaden delad med VARLD.gangPerDygn; ett dygn är
// ett år i spelet). Grannätet räknas när världen skapas, med en sökning från varje by, och står på byns plats (p.grannar).
// En by på en ö utan andra byar har inga grannar. Färdsätten med packdjur och vagn får sina vägar när resorna kommer.
import { balans } from './balans';
import { VARLD, VarldMark } from './varldmark';
import { Varlden } from './varlden';
import { VarldPlats } from './landmarken';
import { narmasteMal, packaVag, sparadVag } from './vagval';

export const GRANNAT = balans('grannat', {
  antal: 6, // så många grannar har varje by minst: de närmaste, och de byar som har den bland sina (en väg går åt båda hållen, steg 15.1.142)
});
export interface Granne { nr: number; kostnad: number; dygn: number; bak?: 1 } // platsens nummer, vägens kostnad och restiden till fots; bak = grannen har byn bland sina närmaste, men inte tvärtom (steg 15.1.142)

// grannätet för en by: de närmaste byarna, med vägarna sparade i världen
export function byGrannar(vl: Varlden, v: VarldMark, p: VarldPlats, nu: number): Granne[] {
  const byar = new Map((vl.platser ?? []).filter(q => q.k === 'by' && q !== p).map(q => [q.y * v.w + q.x, q] as const));
  const a = p.y * v.w + p.x, funna = narmasteMal(vl, v, a, new Set(byar.keys()), GRANNAT.antal, 'fots');
  const vagar = vl.vagar ??= [];
  return funna.map(f => {
    const kostnad = Math.round(f.kostnad * 1000) / 1000;
    if (!sparadVag(vl, 'fots', a, f.till)) vagar.push({ fran: a, till: f.till, fs: 'fots', steg: packaVag(f.rutor, v.w), kostnad, t: nu });
    return { nr: byar.get(f.till)!.nr, kostnad, dygn: Math.round(kostnad / VARLD.gangPerDygn * 100) / 100 };
  });
}
// alla byars grannät (när världen skapas)
export function laggGrannat(vl: Varlden, v: VarldMark, nu: number) {
  for (const p of vl.platser ?? []) if (p.k === 'by') p.grannar = byGrannar(vl, v, p, nu);
  grannarBada(vl);
}
// en väg går åt båda hållen (steg 15.1.142): har en by en granne som inte har den tillbaka, får grannen länken baklänges, med samma
// kostnad och restid (vägen finns redan i vl.vagar)
export function grannarBada(vl: Varlden) {
  const byar = new Map((vl.platser ?? []).filter(q => q.k === 'by').map(q => [q.nr, q] as const));
  for (const p of byar.values()) for (const g of p.grannar ?? []) {
    const q = byar.get(g.nr);
    if (!q || q.grannar?.some(x => x.nr === p.nr)) continue;
    const l = q.grannar ??= [], i = l.findIndex(x => x.kostnad > g.kostnad); // i ordning efter vägens kostnad, som de närmaste
    l.splice(i < 0 ? l.length : i, 0, { nr: p.nr, kostnad: g.kostnad, dygn: g.dygn, bak: 1 });
  }
}
// byarna nya räknas om (en by har flyttat eller grundats): deras länkar baklänges tas först bort ur alla listor, sedan får de sina
// närmaste och grannätet görs ömsesidigt igen
export function nyaGrannar(vl: Varlden, v: VarldMark, nya: VarldPlats[], nu: number) {
  const nr = new Set(nya.map(p => p.nr));
  for (const q of vl.platser ?? []) if (q.grannar) q.grannar = q.grannar.filter(g => !(g.bak && nr.has(g.nr)));
  for (const p of nya) p.grannar = byGrannar(vl, v, p, nu);
  grannarBada(vl);
}
