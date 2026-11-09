import { GRAFER, grafHtml } from '../graf';
import type { Flik } from '../panel';

// stenen Byns tal (steg 9.3.2, "Runstenarna" och "Statistik och djupdykning" i designdokumentet): byns grafer under varandra,
// flyttade ur Krönikan: invånarna, humöret, elden, förrådet, byns rikedom (Hela byn, En person eller En sak) och matlagningen.
// En ny graf är en rad i GRAFER (ui/graf.ts); här står de i den ordningen
export const tal: Flik = {
  namn: 'Byns tal',
  html: () => Object.keys(GRAFER).map(grafHtml).join(''),
};
