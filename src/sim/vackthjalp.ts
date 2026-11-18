// ---------- hjälp på en plats i den väckta byn (steg 11.13.23, Flera samhällen: Uppdragen i tal) ----------
// Ett sällskap som kommer för att hjälpa en by stannar några dygn (UPPDRAGTAL.hjalpDygn) och arbetar i den väckta byn. Byn
// behöver hjälp med ett bygge: ett hus den redan börjat på, annars det hus byn behöver mest just nu (BYGGNADER.akut), som byn
// planerar när hjälpen kommer. Besökarna går till den närmaste delen som inte är byggd, tar materialet ur byns förråd och
// bygger som en bybo (workOn i bygg.ts), och byborna bygger på samma hus. Varje timme vid bygget räknas, och när sällskapet
// vänder avgör timmarna om hjälpen är given (hjalpSlut i resa.ts). Den som sover, är för långt borta eller saknar material
// arbetar inte
import { balans } from './balans';
import { BYGGNADER, Fn } from './byggnader';
import { bitsOf, housesOf, Hus, MATERIAL } from './byggnad';
import { workOn } from './bygg';
import { planeraHus } from './byggplan';
import { amountOf, use } from './lager';
import { gaMot } from './rovare';
import { count } from './folk';
import { HOUR_S, SEC, State } from './typer';

export const VACKTHJALP = balans('vackthjalp', {
  nara: 1.5, // så nära bygget står den som bygger (rutor)
});

// bygget byn behöver hjälp med: ett hus som inte är färdigt, annars det byn behöver mest, som planeras nu
export function hjalpBygge(b: State): Hus | undefined {
  const ofardig = ofardiga(b)[0];
  if (ofardig) return ofardig;
  let bast: { fn: Fn; a: ReturnType<(typeof BYGGNADER)[Fn]['akut']> } | undefined;
  for (const fn of Object.keys(BYGGNADER) as Fn[]) { const a = BYGGNADER[fn].akut(b); if (a.v > (bast?.a.v ?? 0)) bast = { fn, a }; }
  return bast ? planeraHus(b, bast.fn, bast.a) : undefined;
}
const ofardiga = (b: State) => housesOf(b).filter(h => h.klar === undefined && bitsOf(b).some(q => q.hus === h.id && q.b < 1));

// besökarna som hjälper: till bygget och arbeta (TAKTER via besokSteg i vacktgast.ts)
export function hjalpSteg(s: State, dtSec: number) {
  const t0 = s.now - dtSec * SEC;
  let hus: Set<number> | undefined;
  for (const p of s.people) {
    const g = p.gast;
    if (!g?.hjalp || p.died !== undefined || g.fas !== 'pratar' || g.sover) continue;
    hus ??= new Set(ofardiga(s).map(h => h.id));
    let bit, bd = Infinity;
    for (const q of bitsOf(s)) if (q.hus !== undefined && hus.has(q.hus) && q.b < 1) { const d = Math.hypot(q.x + 0.5 - p.x, q.y + 0.5 - p.y); if (d < bd) { bd = d; bit = q; } }
    g.gor = undefined;
    if (!bit) continue;
    if (bd > VACKTHJALP.nara) { if (gaMot(s, p, bit.x + 0.5, bit.y + 0.5, dtSec, t0) > VACKTHJALP.nara) continue; }
    const M = MATERIAL[bit.m];
    if (M.item && bit.mat < M.n) { // materialet ur byns förråd, i hela saker
      const beh = Math.ceil(M.n - bit.mat - 1e-9);
      if (amountOf(s, M.item) < beh) continue;
      use(s, undefined, M.item, beh, true);
      bit.mat += beh;
    }
    g.gor = 'hjalper';
    g.hjalpTim = (g.hjalpTim ?? 0) + dtSec / HOUR_S;
    if (workOn(s, p, bit, dtSec)) count(s, 'hjälpen byggde');
  }
}
