// Trängseln (steg B.9): en egen fil, så att alla som väljer en plats kan fråga utan att importera val.ts
import { balans } from './balans';
import { living } from './folk';
import type { Person, State } from './typer';

export const TRANGSEL = balans('trangsel', {
  isar: 1.05, isarForsok: 24, // trängseln (steg 3.6.8 och B.9): den som väljer en plats fritt prövar så här många platser och räknar dem som står eller är på väg inom isar rutor ...
  trangsel: 1, // ... och platsens poäng sjunker så här mycket för var och en av dem ...
});

// trängseln (steg B.9, "Ingen står tätt i onödan" i designdokumentet): en kropp tar plats. Den som väljer var hen ska stå, sitta eller
// vänta prövar platser ur prova (upp till TRANGSEL.isarForsok, undefined är en plats som inte går) och tar den med högst poäng: poang (högst 0)
// minus TRANGSEL.trangsel för var och en som står eller är på väg inom TRANGSEL.isar rutor. En plats utan någon nära och utan avdrag tas genast.
// Alla som väljer en plats fritt frågar här (vid elden, i vilan, i väntan, i samlingssalen och med handarbetet i byn)
export function glesPlats(s: State, p: Person, prova: (k: number) => { x: number; y: number } | undefined, poang?: (at: { x: number; y: number }) => number) {
  const andra = living(s).filter(q => q !== p);
  let bast: { x: number; y: number } | undefined, bp = -Infinity;
  for (let k = 0; k < TRANGSEL.isarForsok; k++) {
    const at = prova(k); if (!at) continue;
    let n = 0;
    for (const q of andra) if (Math.hypot(q.x - at.x, q.y - at.y) < TRANGSEL.isar || (q.task && q.task.phase !== 'back' && Math.hypot(q.task.tx - at.x, q.task.ty - at.y) < TRANGSEL.isar)) n++;
    const v = (poang?.(at) ?? 0) - TRANGSEL.trangsel * n;
    if (v > bp) { bp = v; bast = at; }
    if (v >= 0) break;
  }
  return bast;
}
