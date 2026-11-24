// Förväntningarna på rummen (steg 14.1.3, Byggsystemet: Rummens finhet). Var och en förväntar sig en finhet av rummet där hen
// sover eller äter, efter sin rikedom och ställning (ämbete och kändhet). Ett rum under förväntan ger en dålig tanke, ett över
// en god. Räknas i timmen efter rummens finhet och sparas hos personen (p.finForv)
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, living } from './folk';
import { prastOf } from './kult';
import { finhetAv, FINHET } from './rum';
import type { Rum } from './byggnad';
import { ryktbarhet } from './rykten';
import { clamp } from './slump';
import { tanke } from './tankar';
import { troOf } from './religion';
import type { Person, State } from './typer';

export const FORVANTAN = balans('forvantan', {
  grund: 0.2, // vad den som äger vanligt mycket och ingen känner förväntar sig
  rik: 0.08, rikNormal: 150, // varje fördubbling av rikedomen lägger till så här mycket, räknat från så här mycket silvers värde
  ledare: 0.15, prast: 0.08, // ämbetena
  kand: 0.1, kandFull: 10, // kändheten: hur starkt byn minns en (ryktbarhet), full vid så här mycket
  min: 0.05, max: 0.8,
  tanke: 0.3, // så mycket (humör) väger en hel finhet över eller under förväntan
  minst: 0.05, // en skillnad mindre än så här märks inte
  pris: 0.5, // ett hus med finheten 1 över det vanliga är värt så här mycket mer
});
export function forvantanAv(s: State, p: Person): number {
  const tr = troOf(s, p.tro);
  const stallning = (s.styre?.ledare === p.id && alive(p) ? FORVANTAN.ledare : 0) + (tr && prastOf(s, tr) === p ? FORVANTAN.prast : 0) + FORVANTAN.kand * Math.min(1, ryktbarhet(s, p.id).r / FORVANTAN.kandFull);
  return clamp(FORVANTAN.grund + FORVANTAN.rik * Math.log2(Math.max(1, p.forv?.w ?? FORVANTAN.rikNormal) / FORVANTAN.rikNormal) + stallning, FORVANTAN.min, FORVANTAN.max);
}
// var timme: vad var och en förväntar sig. Barnen har den av föräldrarna (den som förväntar sig mest)
export function forvantanTimme(s: State) {
  const folk = living(s), barn: Person[] = [];
  for (const p of folk) if (ageOf(p, s.now) >= ALDER.vuxen) p.finForv = forvantanAv(s, p); else barn.push(p);
  for (const p of barn) { const f = [p.mother, p.father].map(id => byId(s, id)?.finForv).filter((x): x is number => x !== undefined); p.finForv = f.length ? Math.max(...f) : FORVANTAN.grund; }
}
// den som sover eller äter i rummet
export function forvantanTanke(s: State, p: Person, r: Rum) {
  const f = finhetAv(s, r);
  if (f === undefined || p.finForv === undefined) return;
  const d = f - p.finForv;
  if (Math.abs(d) >= FORVANTAN.minst) tanke(p, d > 0 ? 'rumFint' : 'rumEnkelt', s.now, { v: d * FORVANTAN.tanke });
}
// finheten i husets pris (byggplan.ts): 1 för ett vanligt hus
export const finhetPris = (finhet: number | undefined) => finhet === undefined ? 1 : 1 + FORVANTAN.pris * (finhet - FINHET.vanlig);
