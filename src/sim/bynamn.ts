// ---------- byns namn (steg 10.9.1–10.9.5, Så blir folk ihågkomna: Byns namn) ----------
// Byn döper sig själv. Allt som visar namnet frågar här (bynsNamn): rubriken i raden överst och flikens titel i webbläsaren.
// Innan byn har döpt sig heter den Nybygget, som är det man kallar en ny boplats; en sparad by utan namn heter också det.
// Byn minns namnet, raden i namnregistret det kom ur, personen det syftar på och när det togs
import type { State } from './typer';

export interface Bynamn { namn: string; rad: string; om?: number; t: number }
export const NYBYGGET = 'Nybygget';
export const bynsNamn = (s: State) => s.bynamn?.namn ?? NYBYGGET;
