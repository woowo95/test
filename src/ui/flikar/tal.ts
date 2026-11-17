import { GRAFER, grafHtml, langdRad } from '../graf';
import { kartminneHtml } from '../kartminne';
import { tecknet } from '../../ikoner';
import { delRad } from '../hjalp';
import type { Flik } from '../panel';

// stenen Byns tal (steg 9.3.2, "Runstenarna" och "Statistik och djupdykning" i designdokumentet): byns grafer under varandra,
// flyttade ur Krönikan: invånarna, humöret, elden, förrådet, byns rikedom (Hela byn, En person eller En sak) och matlagningen.
// En ny graf är en rad i GRAFER (ui/graf.ts); här står de i den ordningen. Kartan över tid (ui/kartminne.ts) är en flik här
// bredvid graferna (steg 9.2.126), med en symbol för Graferna och en för Kartan överst
export const talVal: { vy: 'grafer' | 'kartan' } = { vy: 'grafer' };
// delraden med namn under symbolerna (steg 11.1.38, som i Styre och Krönikan): Graferna och Byn över tid
const DELAR = [{ id: 'grafer', tecken: '↗', namn: 'Graferna' }, { id: 'kartan', tecken: '🏘', namn: 'Byn över tid' }];
export const tal: Flik = {
  namn: 'Byns tal',
  html: () => delRad('data-tvy', DELAR.map(d => ({ ...d, tecken: tecknet(d.id === 'grafer' ? 'sym_pil_upp' : 'sym_byn', d.tecken, 16) })), talVal.vy)
    + (talVal.vy === 'kartan' ? kartminneHtml() : langdRad() + Object.keys(GRAFER).map((id, i) => grafHtml(id, i === 0)).join('')),
  klick(el) {
    const b = el.closest<HTMLElement>('[data-tvy]');
    if (!b) return false;
    talVal.vy = b.dataset.tvy === 'kartan' ? 'kartan' : 'grafer';
    return true;
  },
};
