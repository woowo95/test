// ---------- delning i nöd ----------
// I en fattig och liten by blir mycket av det folk skaffar gemensamt: ju kortare tid förrådet räcker, desto större del
// av det nya går till byn (andel per slag). I en helt ny by blir allt gemensamt. Systemet stängs av när byn blir stor
// eller rik, och slås bara på igen i en katastrof, när byn är nära att dö ut. (När skatt införs, steg 9.5.3, stängs det
// också av: då är det skatten som ger byn dess del.) Andelen läses av lager.ts när något läggs i förrådet.
import { foodOf, amountOf } from './lager';
import { woodDays } from './eld';
import { living, log } from './folk';
import { kronika } from './historik';
import { FOOD, SAKER, SAK_LIST, isTool } from './saker';
import { State } from './typer';

export interface Delning { pa: boolean; topp: number; andel: Record<string, number> }

export const DELA_ALLT = 4; // räcker förrådet kortare än så många dygn blir allt nytt av slaget byns
export const DELA_INGET = 8; // räcker det längre blir inget byns
export const DELA_STOR = 12; // så många människor: byn klarar sig utan delningen
const MAT_DYGN = 1.6; // mat per människa och dygn

const andelOf = (dygn: number) => Math.min(1, Math.max(0, (DELA_INGET - dygn) / (DELA_INGET - DELA_ALLT)));

export const delningOf = (s: State) => s.delning ??= { pa: true, topp: 0, andel: {} };

// varje timme: är delningen på, och hur stor del av det nya av varje slag går till byn
export function stepDelning(s: State) {
  const d = delningOf(s), pop = living(s).length;
  d.topp = Math.max(d.topp, pop);
  const matDygn = pop ? foodOf(s) / (pop * MAT_DYGN) : 0, vedDygn = woodDays(s);
  if (d.pa && (pop >= DELA_STOR || (matDygn >= DELA_INGET && vedDygn >= DELA_INGET))) {
    d.pa = false;
    log(s, 'Byn har det gott ställt. Det var och en skaffar är nu bara ens eget.', 'world');
    kronika(s, 'Byn slutade dela allt nytt: det var och en skaffar är ens eget.');
  } else if (!d.pa && pop > 0 && pop <= Math.max(3, d.topp / 3)) {
    d.pa = true;
    log(s, 'Byn är i nöd. Det folk skaffar delas nu med alla.', 'world');
    kronika(s, 'Byn var nära att dö ut och började dela allt nytt.');
  }
  d.andel = {};
  if (!d.pa) return;
  for (const k of SAK_LIST) {
    if (isTool(k)) continue;
    const nod = SAKER[k]!.nod;
    d.andel[k] = andelOf(FOOD.includes(k) ? matDygn : k === 'ved' || k === 'grenar' ? vedDygn : nod ? amountOf(s, k) / nod : 0);
  }
}
