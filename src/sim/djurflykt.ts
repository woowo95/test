// Djuren flyr från faror (steg 10.10.29, Djuren i detalj: Djurens egenskaper). Faran är en rad i registret DJURFAROR: var den är
// just nu och hur långt ut den skrämmer. Ett tamdjur flyr när det kommer närmare en fara än TAMFLYKT.r gånger faran gånger
// (1,5 − modet): det modiga går närmare. Det springer bort med TAMFLYKT.fart rutor i sekunden gånger sin snabbhet och stannar i
// hagen om det står i den. Ett dragdjur som flyr sliter sig från släden: kusken tappar bördan och släden blir stående med
// lasset där hen står (avbryt, lager.ts), och djuret går tillbaka till sin hage som efter en tur
import { balans } from './balans';
import { brinnande } from './brand';
import { hageById } from './hage';
import { blocked } from './byggnad';
import { avbryt } from './lager';
import { tingOf } from './agande';
import { count, living, log } from './folk';
import { tamArt, tamEg, tamdjurOf, Tamdjur } from './tamdjur';
import { BIN } from './bin';
import { State, W, inMap } from './typer';

export const TAMFLYKT = balans('tamflykt', {
  r: 4, // ett djur med modet 0,5 flyr när det är så här många gånger farans storlek från den
  fart: 1, // rutor i sekunden för ett djur med snabbheten 1
});
interface Fara { x: number; y: number; r: number }
// faran: namnet och var den finns just nu, med sin storlek i rutor (det djuret håller avstånd till)
export const DJURFAROR: { namn: string; var: (s: State) => Fara[] }[] = [
  { namn: 'uppretade bin', var: s => (s.retade ?? []).map(b => ({ x: b.x, y: b.y, r: BIN.retadR / 2 })) },
  { namn: 'elden', var: s => brinnande(s).map(r => ({ x: r[0] % W + 0.5, y: Math.floor(r[0] / W) + 0.5, r: 1 })) },
  { namn: 'vargarna', var: s => (s.vargar ?? []).filter(f => f.vargar.length > 0).map(f => ({ x: f.x, y: f.y, r: 1.5 })) },
];
// faran närmast djuret, mätt i farans storlek, eller ingen
function narmast(farar: Fara[], d: Tamdjur) {
  let b: { f: Fara; l: number; k: number } | undefined;
  for (const f of farar) { const l = Math.hypot(d.x - f.x, d.y - f.y), k = l / f.r; if (!b || k < b.k) b = { f, l, k }; }
  return b;
}
export function tamFaraSteg(s: State, dt: number) {
  const farar = DJURFAROR.flatMap(r => r.var(s));
  if (!farar.length) return;
  for (const d of tamdjurOf(s)) {
    if (d.fahus !== undefined) continue;
    const e = tamEg(d), n = narmast(farar, d);
    if (!n || n.k >= TAMFLYKT.r * (1.5 - e.mod)) continue;
    // det förspända djuret sliter sig från släden
    const g = tingOf(s).find(q => q.djur === d.id && q.lass !== undefined);
    if (g) {
      const p = living(s).find(q => q.id === g.lass);
      if (p) avbryt(s, p);
      g.djur = undefined; count(s, 'djurSlitSig');
      log(s, `${tamArt(d.art).ord[3][0].toUpperCase()}${tamArt(d.art).ord[3].slice(1)} blev rädd och slet sig från släden.`, 'world');
    }
    const dx = d.x - n.f.x, dy = d.y - n.f.y, v = n.l > 0.1 ? [dx / n.l, dy / n.l] : [Math.cos(d.id), Math.sin(d.id)];
    const st = Math.min(TAMFLYKT.r * (1.5 - e.mod) * n.f.r - n.l, TAMFLYKT.fart * e.snabbhet * dt);
    if (st <= 0) continue;
    let nx = d.x + v[0] * st, ny = d.y + v[1] * st;
    const h = hageById(s, d.hage);
    if (h && d.x >= h.x && d.x < h.x + h.w && d.y >= h.y && d.y < h.y + h.h) { nx = Math.min(h.x + h.w - 0.5, Math.max(h.x + 0.5, nx)); ny = Math.min(h.y + h.h - 0.5, Math.max(h.y + 0.5, ny)); }
    if (inMap(Math.floor(nx), Math.floor(ny)) && !blocked(s, nx, ny)) { d.x = nx; d.y = ny; count(s, 'djurFlyr'); }
  }
}
