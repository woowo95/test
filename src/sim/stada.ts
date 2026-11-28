// Städningen (steg 14.1.2, Byggsystemet: Rummens finhet). Den som bor i rummet, eller hen eller familjen äger huset, torkar golvet
// ruta för ruta: blodet (blod.ts) och toaletternas fläckar (smuts.ts) på rutan tas bort när den är klar. Värdet av att städa är
// det finheten vinner (rum.ts) och det äcklet kostar dem som bor där (smuts.ts)
import { balans } from './balans';
import { blodOf } from './blod';
import { gridOf, husById, roomAt, type Rum } from './byggnad';
import { ALDER, ageOf, count, familjOf, forstaGang, gjort, living, log } from './folk';
import { GA_TID } from './paborjat';
import { FINHET, smutsRutor } from './rum';
import { SMUTS, flackNu, flackarOf } from './smuts';
import { sovrum } from './stationer';
import { MIN, W, type Person, type State, type Task } from './typer';

export const STADA = balans('stada', {
  min: 0.5, // så många minuter tar en ruta
  annans: 0.25, // ett rum som är någon annans angår en så här mycket av sitt eget
  allas: 0.6, // byns rum (ett hus utan ägare) angår alla så här mycket
  akel: 1, // en punkt sämre humör för den som bor där väger så här mycket mot en hel finhet
});
// hur mycket rummet angår p: sitt eget sovrum, sitt eller familjens hus, byns hus och andras
export function rumAngar(s: State, p: Person, r: Rum): number {
  if (sovrum(s, p) === r) return 1;
  const h = husById(s, r.hus);
  if (h?.ag === undefined) return STADA.allas;
  return h.ag === p.id || familjOf(s, h.ag).includes(p) ? 1 : STADA.annans;
}
// vad det är värt att städa rummet: finheten som smutsen tar, och äcklet för dem som sover där
export function stadaVarde(s: State, r: Rum, rutor = smutsRutor(s, r)): number {
  let n = 0;
  for (const v of rutor.values()) n += v;
  if (!n) return 0;
  const sover = living(s).filter(q => sovrum(s, q) === r).length;
  const toa = flackarOf(s).some(f => f.k === 'toa' && flackNu(f, s.now) > SMUTS.akel && r.tiles.includes(f.i));
  return FINHET.smuts * Math.min(1, n / FINHET.smutsFull) + (toa ? STADA.akel * sover * -SMUTS.akelHumor * SMUTS.toaInne : 0);
}
const narmast = (rutor: Map<number, number>, x: number, y: number) => {
  let bast = -1, bd = Infinity;
  for (const i of [...rutor.keys()].sort((a, b) => a - b)) { const d = Math.hypot(i % W + 0.5 - x, Math.floor(i / W) + 0.5 - y); if (d < bd) { bd = d; bast = i; } }
  return bast;
};
export interface StadaVal { rum: Rum; i: number; sc: number }
export function stadaVal(s: State, p: Person): StadaVal | undefined {
  if (ageOf(p, s.now) < ALDER.hjalper || !(s.flackar?.length || s.blod?.length)) return undefined;
  let bast: StadaVal | undefined;
  for (const r of smutsigaRum(s)) {
    const rutor = smutsRutor(s, r);
    if (!rutor.size) continue;
    // det som återstår delat med dem som redan städar där (steg 15.1.154): rutorna ingen annan torkar just nu, delade med dem och p,
    // så att en till hjälper när rummet är stort och smutsigt
    const tagna = new Set(living(s).filter(q => q !== p && q.task?.act === 'stada' && r.tiles.includes(q.task.ref ?? -1)).map(q => q.task!.ref!));
    const fria = new Map([...rutor].filter(([i]) => !tagna.has(i)));
    if (!fria.size) continue;
    const sc = stadaVarde(s, r, rutor) * rumAngar(s, p, r) * Math.min(1, fria.size / (tagna.size + 1));
    if (sc > (bast?.sc ?? 0)) bast = { rum: r, i: narmast(fria, p.x, p.y), sc };
  }
  return bast;
}
// rummen med smuts på golvet
function smutsigaRum(s: State): Rum[] {
  const ut = new Set<Rum>();
  for (const f of flackarOf(s)) { const r = roomAt(s, f.i % W, Math.floor(f.i / W)); if (r) ut.add(r); }
  for (const b of blodOf(s)) { const r = roomAt(s, Math.floor(b.x), Math.floor(b.y)); if (r) ut.add(r); }
  return gridOf(s).rooms.filter(r => ut.has(r));
}
export const stadaUppgift = (d: StadaVal) => ({ act: 'stada' as const, text: 'Torkar golvet rent.', min: STADA.min, spot: { x: d.i % W + 0.5, y: Math.floor(d.i / W) + 0.5 }, ref: d.i });
// rutan är torkad: smutsen på den är borta, och hen går till nästa smutsiga ruta i rummet
export function stadaKlar(s: State, p: Person, tk: Task) {
  const i = tk.ref ?? -1, r = i >= 0 ? roomAt(s, i % W, Math.floor(i / W)) : undefined;
  if (!r) return;
  const f0 = s.flackar?.length ?? 0, b0 = s.blod?.length ?? 0;
  if (s.flackar) s.flackar = s.flackar.filter(f => f.i !== i);
  if (s.blod) s.blod = s.blod.filter(b => Math.floor(b.y) * W + Math.floor(b.x) !== i);
  if ((s.flackar?.length ?? 0) < f0 || (s.blod?.length ?? 0) < b0) count(s, 'stadadRuta');
  const tagna = new Set(living(s).filter(q => q !== p && q.task?.act === 'stada').map(q => q.task!.ref)); // den andra rutan torkar någon annan
  const kvar = smutsRutor(s, r), n = narmast(new Map([...kvar].filter(([j]) => !tagna.has(j))), p.x, p.y);
  if (n < 0 && kvar.size) return; // de sista rutorna torkar de andra
  if (n < 0) {
    count(s, 'stadat'); gjort(s, p, 'stadat');
    if (forstaGang(s, 'forstaStad')) log(s, `${p.name} torkade golvet rent i ett av husen.`, 'world', [p.id]);
    return;
  }
  tk.ref = n; tk.tx = n % W + 0.5; tk.ty = Math.floor(n / W) + 0.5; tk.phase = 'go'; tk.pk = undefined; tk.path = undefined;
  tk.arbTid = STADA.min * MIN; tk.until = s.now + GA_TID;
}
