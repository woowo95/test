// ---------- delning ----------
// Ju fattigare byn är, desto mer av det folk skaffar ger de till byns gemensamma förråd. Hur rik byn är avgör ensamt
// hur mycket: rikedomen är värdet av förrådet, redskapen och husen (varde.ts).
// En ny by är så fattig att nästan allt blir gemensamt; vid DELNING.rik och mer är det man skaffar ens eget. Andelen
// räknas varje timme och läses av lager.ts när något läggs i förrådet. Redskap delas inte (den som gör dem äger dem).
// Skatten (steg 8.4.17) är en lag: en del till byn, eller till ledarens förråd under Envälde.
import { clamp } from './slump';
import { rikedom } from './varde';
import { State } from './typer';
import { balans } from './balans';
import { LAG, efterlevs, lagGaller } from './lagar';

export interface Delning { andel: number; ledare?: { id: number; andel: number } } // ledare: skatten som går till ledarens förråd (steg 8.4.17)

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
  // skatten (steg 8.4.17): till byns förråd, eller till ledarens när seden står åt Envälde
  let led: Delning['ledare'];
  if (lagGaller(s, 'skatt')) {
    const t = LAG.skatt * efterlevs(s), l = s.styre?.ledare;
    if (l !== undefined && (s.seder.v.rang ?? 0) > LAG.skattLedare) led = { id: l, andel: t };
    else a += t;
  }
  const andel = clamp(a, 0, 1);
  s.delning = led ? { andel, ledare: { id: led.id, andel: Math.min(led.andel, 1 - andel) } } : { andel };
}
