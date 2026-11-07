// ---------- delning ----------
// Ju fattigare byn är, desto mer av det folk skaffar ger de till byns gemensamma förråd. Hur rik byn är avgör ensamt
// hur mycket: rikedomen är värdet av förrådet, redskapen och husen (varde.ts).
// En ny by är så fattig att nästan allt blir gemensamt; vid DELNING.rik och mer är det man skaffar ens eget. Andelen
// räknas varje timme och läses av lager.ts när något läggs i förrådet. Redskap delas inte (den som gör dem äger dem).
// Skatt kommer i steg 9.5.3.
import { clamp } from './slump';
import { rikedom } from './varde';
import { State } from './typer';
import { balans } from './balans';
import { LAG, efterlevs, lagGaller } from './lagar';

export interface Delning { andel: number }

// Balanstalet (regel 8)
export const DELNING = balans('delning', {
  sed: 0.3, // så mycket seden Ägande och delning flyttar andelen
  rik: 250, // så rik är byn när ingen längre ger något av det de skaffar till byn (ungefär arbetstimmar, varde.ts)
});

// hur stor del av det nya som går till byn: allt i en by utan något, inget i en rik by, och jämnt mindre däremellan
const andelOf = (rik: number) => clamp(1 - rik / DELNING.rik, 0, 1);

// varje timme (steg.ts) och när en by skapas
export function stepDelning(s: State) {
  let a = andelOf(rikedom(s));
  if (s.styre?.oppna?.includes('delning')) a += (s.seder.v.delning ?? 0) * DELNING.sed; // seden Ägande och delning (steg 8.4.12)
  if (lagGaller(s, 'matdelning')) a = Math.max(a, efterlevs(s)); // förrådet delas lika (steg 8.4.1)
  if (lagGaller(s, 'skatt')) a += LAG.skatt * efterlevs(s); // skatten (steg 8.4.17)
  s.delning = { andel: clamp(a, 0, 1) };
}
