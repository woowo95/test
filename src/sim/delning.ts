// ---------- delning ----------
// Ju fattigare byn är, desto mer av det folk skaffar ger de till byns gemensamma förråd. Hur rik byn är avgör ensamt
// hur mycket: rikedomen är värdet av allt byn har (varje sak i förrådet och varje redskap gånger `varde` i saker.ts).
// En ny by är så fattig att nästan allt blir gemensamt; vid DELA_RIK och mer är det man skaffar ens eget. Andelen
// räknas varje timme och läses av lager.ts när något läggs i förrådet. Redskap delas inte (den som gör dem äger dem).
// Värdena är en första enkel version; det riktiga värdet på saker kommer i steg 1.4.2, och skatt i steg 9.5.3.
import { amountOf } from './lager';
import { SAKER, SAK_LIST } from './saker';
import { State } from './typer';

export interface Delning { rik: number; andel: number }

export const DELA_RIK = 600; // så rik är byn när ingen längre ger något av det de skaffar till byn

// värdet av allt byn har
export function rikedom(s: State) { let v = 0; for (const k of SAK_LIST) v += amountOf(s, k) * (SAKER[k]!.varde ?? 0); return v; }
// hur stor del av det nya som går till byn: allt i en by utan något, inget i en rik by, och jämnt mindre däremellan
export const andelOf = (rik: number) => Math.min(1, Math.max(0, 1 - rik / DELA_RIK));

// varje timme (steg.ts) och när en by skapas
export function stepDelning(s: State) { const rik = rikedom(s); s.delning = { rik, andel: andelOf(rik) }; }
