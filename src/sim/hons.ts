// ---------- hönsen (steg 9.8.10, Djuren i detalj: Hönsen, grisen och katten) ----------
// Hönsen är en flock utan individer (s.hons): bara hur många hönor byn har, var flocken går och vem som äger den. De kommer med
// handlaren (varan levhons i HANDLARVAROR, handel.ts) och blir en höna i flocken när de ligger i byn; den som köpte dem äger
// flocken (köper någon annan fler blir de ändå en del av samma flock, och den förste äger den). Hönsen går lösa i byn och
// letar mat själva, så ingen matar dem. De värper ett ägg om dygnet var, utom i istiden, och äggen hamnar i förrådet som
// ägarens. Flocken räknas i ägarens förmögenhet och ärvs som djuren. Allt stegas en gång i timmen (stepHons, steg.ts), likadant
// i båda lägena, med byns följd 'tamdjur'.
import { balans } from './balans';
import { count, forstaGang, log } from './folk';
import { changed, put, stacksOf, tidy } from './lager';
import { rnd } from './slump';
import { State } from './typer';
import { iIstiden, kalender } from './tid';
import { bynsMitt } from './omrade';

export const HONS = balans('hons', {
  agg: 1 / 24, // en höna värper så här många ägg i timmen: ett om dygnet (ett år i spelet)
  r: 6, // flocken går lös högst så här långt (rutor) från byns mitt
  steg: 1.5, // så långt flocken flyttar sig i timmen
  varde: 4, // vad en höna är värd i silver (förmögenheten och arvet)
  max: 20, // byn håller inte fler hönor än så här
});
export interface Hons { n: number; x: number; y: number; agare?: number; agg: number }
export const honsOf = (s: State) => (s.hons && s.hons.n > 0 ? s.hons : undefined);

export function stepHons(s: State) {
  kopta(s);
  const h = honsOf(s);
  if (!h) return;
  // flocken strövar runt i byn
  const m = bynsMitt(s), v = rnd(s, 'tamdjur') * Math.PI * 2;
  let x = h.x + Math.cos(v) * HONS.steg, y = h.y + Math.sin(v) * HONS.steg;
  const dx = x - m.x, dy = y - m.y, d = Math.hypot(dx, dy);
  if (d > HONS.r) { x = m.x + dx / d * HONS.r; y = m.y + dy / d * HONS.r; }
  h.x = x; h.y = y;
  if (iIstiden(kalender(s).ai)) return;
  h.agg += h.n * HONS.agg;
  const n = Math.floor(h.agg + 1e-9);
  if (n < 1) return;
  h.agg -= n;
  put(s, 'agg', n, h.agare !== undefined ? { [h.agare]: n } : undefined);
  count(s, 'honsAgg', n);
  if (forstaGang(s, 'honsAgg')) log(s, 'Hönsen värpte sina första ägg i byn.', 'world', h.agare !== undefined ? [h.agare] : []);
}

// de köpta hönorna (varan levhons) blir en del av flocken, ägd av den som köpte dem först
function kopta(s: State) {
  let n = 0;
  for (const a of stacksOf(s)) {
    if (a.k !== 'levhons' || a.n < 1 - 1e-9) continue;
    const ag = a.ag ?? {}, agare = Object.keys(ag).map(Number).sort((x, y) => (ag[y] ?? 0) - (ag[x] ?? 0) || x - y)[0];
    const h = (s.hons ??= { n: 0, x: a.x + 0.5, y: a.y + 0.5, agg: 0 });
    if (h.n === 0) { h.agare = agare; h.x = a.x + 0.5; h.y = a.y + 0.5; }
    const k = Math.min(Math.floor(a.n + 1e-9), HONS.max - h.n);
    h.n += Math.max(0, k); n += Math.max(0, k);
    a.n = 0; a.ag = undefined;
    if (k > 0) { count(s, 'honsKopt', k); if (forstaGang(s, 'forsta_hons')) log(s, 'Byn fick sina första höns av handlaren. De går lösa i byn och värper.', 'world', agare !== undefined ? [agare] : []); }
  }
  if (n) { tidy(s); changed(s); }
}
// flockens värde, för ägarens förmögenhet (varde.ts)
export const honsVarde = (s: State) => (honsOf(s)?.n ?? 0) * HONS.varde;
