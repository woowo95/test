// Trängseln (steg B.9): en egen fil, så att alla som väljer en plats kan fråga utan att importera val.ts
import { balans } from './balans';
import { REL, living, relKey } from './folk';
import type { Person, State } from './typer';

export const TRANGSEL = balans('trangsel', {
  isar: 1.05, isarForsok: 24, // trängseln (steg 3.6.8 och B.9): den som väljer en plats fritt prövar så här många platser och räknar dem som står eller är på väg inom isar rutor ...
  trangsel: 1, // ... och platsens poäng sjunker så här mycket för var och en av dem ...
  sitt: 0.2, // den som väljer en sittplats räknar varje sådan som så många stubbar vila mindre (steg B.21): hellre en ledig plats för sig själv, men hellre intill någon än på marken
  van: 1, // ... och stiger så här mycket vid ett bord där en god vän sitter (steg B.21)
});

// trängseln (steg B.9, "Ingen står tätt i onödan" i designdokumentet): en kropp tar plats. Den som väljer var hen ska stå, sitta eller
// vänta prövar platser ur prova (upp till TRANGSEL.isarForsok, undefined är en plats som inte går) och tar den med högst poäng: poang (högst 0)
// minus TRANGSEL.trangsel för var och en som står eller är på väg inom TRANGSEL.isar rutor. En plats utan någon nära och utan avdrag tas genast.
// Alla som väljer en plats fritt frågar här (vid elden, i vilan, i väntan, i samlingssalen och med handarbetet i byn)
// avdraget för trängseln på platsen at (andra = de andra på kartan): det som glesPlats, vilPlats och ledigPlats räknar med
export function trangselVid(andra: readonly Person[], at: { x: number; y: number }) {
  let n = 0;
  for (const q of andra) if (Math.hypot(q.x - at.x, q.y - at.y) < TRANGSEL.isar || (q.task && q.task.phase !== 'back' && Math.hypot(q.task.tx - at.x, q.task.ty - at.y) < TRANGSEL.isar)) n++;
  return TRANGSEL.trangsel * n;
}
// trängseln vid en sittplats, i så många stubbar vilan är värd: avdraget, och plus för en god vän som sitter eller ska sitta vid samma bord (platser)
export function sittTrangsel(s: State, p: Person, andra: readonly Person[], at: { x: number; y: number }, platser: readonly { x: number; y: number }[]) {
  const van = andra.some(q => q.task && q.task.phase !== 'back' && (s.rels[relKey(p.id, q.id)]?.op ?? 0) > REL.van && platser.some(b => Math.floor(q.task!.tx) === b.x && Math.floor(q.task!.ty) === b.y));
  return TRANGSEL.sitt * (trangselVid(andra, at) - (van ? TRANGSEL.van : 0));
}
export function glesPlats(s: State, p: Person, prova: (k: number) => { x: number; y: number } | undefined, poang?: (at: { x: number; y: number }) => number) {
  const andra = living(s).filter(q => q !== p);
  let bast: { x: number; y: number } | undefined, bp = -Infinity;
  for (let k = 0; k < TRANGSEL.isarForsok; k++) {
    const at = prova(k); if (!at) continue;
    const v = (poang?.(at) ?? 0) - trangselVid(andra, at);
    if (v > bp) { bp = v; bast = at; }
    if (v >= 0) break;
  }
  return bast;
}
