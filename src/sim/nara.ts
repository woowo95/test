// Registret NARA (steg 10.2.40): en rad per källa till det som räknas som till hands nära byn (naraByn i fynd.ts). Ligger i en
// egen fil utan beroenden, så att systemen som sätter sin rad (fynd, lera, skog) kan laddas i vilken ordning som helst
import type { State } from './typer';
export const NARA: Record<string, (s: State) => boolean> = {};
