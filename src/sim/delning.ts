// ---------- delning ----------
// Ju fattigare byn är, desto mer av det folk skaffar ger de till byns gemensamma förråd. Hur rik byn är avgör ensamt
// hur mycket: rikedomen är värdet av förrådet, redskapen och husen (varde.ts).
// En ny by är så fattig att nästan allt blir gemensamt; vid DELA_RIK och mer är det man skaffar ens eget. Andelen
// räknas varje timme och läses av lager.ts när något läggs i förrådet. Redskap delas inte (den som gör dem äger dem).
// Skatt kommer i steg 9.5.3.
import { clamp } from './slump';
import { rikedom } from './varde';
import { State } from './typer';

export interface Delning { rik: number; andel: number }

export const DELA_RIK = 250; // så rik är byn när ingen längre ger något av det de skaffar till byn (ungefär arbetstimmar, varde.ts)

// hur stor del av det nya som går till byn: allt i en by utan något, inget i en rik by, och jämnt mindre däremellan
const andelOf = (rik: number) => clamp(1 - rik / DELA_RIK, 0, 1);

// varje timme (steg.ts) och när en by skapas
export function stepDelning(s: State) { const rik = rikedom(s); s.delning = { rik, andel: andelOf(rik) }; }
