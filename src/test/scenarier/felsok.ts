// Verktygen för att hitta felen (steg 12.1.40–12.1.44, Att hitta felen i fliken Läget): byn som fil, rapporten, vakterna för
// det orimliga och granskaren. Vakterna och granskaren körs med egna kommandon (npm run rimligt, npm run granska) och ligger
// inte i de vanliga testerna; scenarierna här prövar bara att verktygen själva gör rätt
import * as SIM from '../../sim';
import { SCENARIER, testBy } from './hjalp';
import { byTillFil, lasByfil } from '../../ui/byfil';

SCENARIER.byfil = {
  text: 'Byn som fil (steg 12.1.40, ui/byfil.ts): en by som sparats till fil och lästs in igen är exakt lika, också när båda räknas vidare två timmar',
  kor: () => {
    const s = testBy(10), text = byTillFil(s), s2 = lasByfil(text);
    const lika = byTillFil(s2) === text;
    SIM.step(s, 2 * 3600); SIM.step(s2, 2 * 3600);
    const vidare = SIM.serialize(s) === SIM.serialize(s2);
    let fel = false; try { lasByfil('{"inte":"en by"}'); } catch { fel = true; }
    return [
      [`byn ur filen är samma text som byn (${Math.round(text.length / 1024)} KB)`, lika],
      ['de två byarna är exakt lika efter två timmar till', vidare],
      ['en fil som inte är en by ger ett fel', fel],
    ];
  },
};
