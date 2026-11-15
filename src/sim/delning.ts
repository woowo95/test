// ---------- delning ----------
// Ju fattigare byn är, desto mer av det folk skaffar ger de till byns gemensamma förråd. Hur rik byn är avgör ensamt
// hur mycket: rikedomen är värdet av förrådet, redskapen och husen (varde.ts).
// En ny by är så fattig att nästan allt blir gemensamt; vid DELNING.rik och mer är det man skaffar ens eget. Andelen
// räknas varje timme och läses av lager.ts när något läggs i förrådet. Redskap delas inte (den som gör dem äger dem).
// Med skattelagen (steg 10.5.3, skatt.ts) ger ingen något av det hen skaffar: skatten på rikedomen fyller byns förråd i stället.
import { clamp } from './slump';
import { rikedom } from './varde';
import { State } from './typer';
import { balans } from './balans';
import { efterlevs, lagGaller } from './lagar';

export interface Delning { andel: number }

// Balanstalet (regel 8)
export const DELNING = balans('delning', {
  sed: 0.3, // så mycket seden Sammanhållning – Självförsörjning flyttar andelen (steg 10.5.1)
  rik: 600, // så rik är byn när ingen längre ger något av det de skaffar till byn (ungefär arbetstimmar, varde.ts)
});

// hur stor del av det nya som går till byn: allt i en by utan något, inget i en rik by, och jämnt mindre däremellan
const andelOf = (rik: number) => clamp(1 - rik / DELNING.rik, 0, 1);

// varje timme (steg.ts) och när en by skapas
export function stepDelning(s: State) {
  let a = andelOf(rikedom(s));
  a += (s.seder.v.gemenskap ?? 0) * DELNING.sed; // Sammanhållning – Självförsörjning, från byns första dag (steg 10.5.1)
  if (lagGaller(s, 'matdelning')) a = Math.max(a, efterlevs(s)); // förrådet delas lika (steg 8.4.1)
  if (lagGaller(s, 'skatt')) a = 0; // skatten på rikedomen i stället (steg 10.5.3)
  s.delning = { andel: clamp(a, 0, 1) };
}
