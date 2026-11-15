// Byggstenen (steg 10.10.5, Byggsystemet: det som ska byggas, Byggstenen): en tung sten (40 vikt) som bryts och huggs till på en
// ruta intill berget, 5 minuter per sten, och blir liggande i en hög där (högst BYGGSTEN.perRuta per ruta), eftersom ingen orkar
// bära den. Den körs hem på kälken eller släden som annat tungt (bärandet i lager.ts och valjFordon i fordon.ts). Stenen bryts
// när Byggplanen planerat något av sten: förrådsmålet (MATERIALMAL i forradsmal.ts) räknar det planerade, som virket klyvs för ett
// planerat hus, och det som planeras av sten är rader i registret STENBEHOV (stenbron och stenväggen, steg 10.10.6 och 10.10.7).
// Frakten (stenFrakt) är stenens vikt gånger avståndet till berget, delat med det största lasset byn har; utan kälke eller
// släde går stenen inte att frakta, och då planeras inget av sten
import { balans } from './balans';
import { count, forstaGang, log } from './folk';
import { dropLoad } from './lager';
import { groundOf } from './mark';
import { bynsMitt, omrade } from './omrade';
import { viktOf } from './saker';
import { H, Person, State, T, Task, W, inMap } from './typer';
import { iPlatsMinne } from './stationer';
import { FORDON, lassAv } from './fordon';
import { tingOf } from './agande';
import { tamdjurOf, tamArt } from './tamdjur';

export const BYGGSTEN = balans('byggsten', {
  min: 5, // en sten bryts och huggs till på så här många minuter (efter arbetstiderna: en stor sak)
  perRuta: 4, // högst så här många stenar ligger i högen på en ruta vid berget
  sokR: 60, // berget söks så här många rutor från byns mitt
});

// det byn planerat av sten: hur många byggstenar varje plan behöver (stenbron och stenväggen lägger till sina rader)
export const STENBEHOV: Record<string, (s: State) => number> = {};
export const stenTillPlan = (s: State) => Object.values(STENBEHOV).reduce((a, f) => a + f(s), 0);

const GR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const stenarPa = (s: State, x: number, y: number) => (s.stackar ?? []).filter(q => q.x === x && q.y === y && q.k === 'byggsten').reduce((a, q) => a + q.n, 0);
// rutan närmast byns mitt som är land intill berget och har plats för en sten till i högen (en gång i projektvalet)
export const bergPlats = (s: State) => iPlatsMinne('byggsten', () => sokBerg(s));
function sokBerg(s: State) {
  const m = bynsMitt(s), t = groundOf(s).tiles, R = BYGGSTEN.sokR + Math.ceil(Math.sqrt(omrade(s).n / Math.PI));
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (let y = Math.max(0, Math.floor(m.y - R)); y < Math.min(H, m.y + R + 1); y++) for (let x = Math.max(0, Math.floor(m.x - R)); x < Math.min(W, m.x + R + 1); x++) {
    const d = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (d >= bd || !inMap(x, y)) continue;
    const i = y * W + x;
    if (t[i] === T.Sten || t[i] === T.Vatten) continue;
    if (!GR4.some(([dx, dy]) => inMap(x + dx, y + dy) && t[(y + dy) * W + x + dx] === T.Sten)) continue;
    if (stenarPa(s, x, y) >= BYGGSTEN.perRuta) continue;
    bd = d; bast = { x: x + 0.5, y: y + 0.5 };
  }
  return bast;
}
// det största lasset byn kan köra: kälken, och släden med det starkaste dragdjuret
export function storstaLass(s: State) {
  let l = 0;
  for (const f of Object.values(FORDON)) {
    if (!tingOf(s).some(g => g.k === f.sak)) continue;
    if (f.drar === 'djur') for (const d of tamdjurOf(s)) { if (tamArt(d.art).styrka) l = Math.max(l, lassAv(f, d)); }
    else l = Math.max(l, lassAv(f));
  }
  return l;
}
// frakten av en byggsten från berget till byn, i vikt gånger rutor per lass: Infinity när byn inget har att köra den på
export function stenFrakt(s: State) {
  const b = bergPlats(s), lass = storstaLass(s);
  if (!b || lass < viktOf('byggsten')) return Infinity;
  const m = bynsMitt(s);
  return viktOf('byggsten') * Math.hypot(b.x - m.x, b.y - m.y) / lass;
}
// stenen är bruten: den läggs i högen där den bröts
export function stenBruten(s: State, p: Person, t: Task) {
  t.items = { ...(t.items ?? {}), byggsten: (t.items?.byggsten ?? 0) + 1 };
  dropLoad(s, t, p.x, p.y);
  if (s.arbBehov) s.arbBehov.bv = undefined; // projektens brist räknas om (bristNu i projekt.ts): en sten är mycket av det som planerats
  count(s, 'byggstenBruten');
  if (forstaGang(s, 'byggstenForsta')) log(s, `${p.name} bröt byns första byggsten vid berget.`, 'world', [p.id]);
}
