import { GRAFER, grafHtml } from '../graf';
import { kartminneHtml } from '../kartminne';
import { tecknet } from '../../ikoner';
import type { Flik } from '../panel';

// stenen Byns tal (steg 9.3.2, "Runstenarna" och "Statistik och djupdykning" i designdokumentet): byns grafer under varandra,
// flyttade ur Krönikan: invånarna, humöret, elden, förrådet, byns rikedom (Hela byn, En person eller En sak) och matlagningen.
// En ny graf är en rad i GRAFER (ui/graf.ts); här står de i den ordningen. Kartan över tid (ui/kartminne.ts) är en flik här
// bredvid graferna (steg 9.2.126), med en symbol för Graferna och en för Kartan överst
export const talVal: { vy: 'grafer' | 'kartan' } = { vy: 'grafer' };
const knapp = (vy: typeof talVal.vy, sym: string, alt: string, namn: string) => `<button type="button" data-tvy="${vy}" aria-pressed="${talVal.vy === vy}" title="${namn}" aria-label="${namn}">${tecknet(sym, alt, 16)} ${namn}</button>`;
export const tal: Flik = {
  namn: 'Byns tal',
  html: () => `<div class="pdelar kfilter" role="toolbar" aria-label="Visa">${knapp('grafer', 'sym_pil_upp', '↗', 'Graferna')}${knapp('kartan', 'sym_byn', '🏘', 'Kartan')}</div>`
    + (talVal.vy === 'kartan' ? kartminneHtml() : Object.keys(GRAFER).map(grafHtml).join('')),
  klick(el) {
    const b = el.closest<HTMLElement>('[data-tvy]');
    if (!b) return false;
    talVal.vy = b.dataset.tvy === 'kartan' ? 'kartan' : 'grafer';
    return true;
  },
};
