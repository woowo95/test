import { PROJEKT_BEHOV, dangers, num, projekt as lista } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// byns projekt (projekt.ts): det byn saknar, det mest värda först. Symbolerna först: projektet, behovet det fyller och en
// stapel för värdet; resten står när musen är över
const tip = (t: string) => `title="${esc(t)}" aria-label="${esc(t)}"`;
export const projekt: Flik = {
  namn: 'Projekt',
  html() {
    const rader = lista(s, dangers(s)), max = Math.max(1e-9, ...rader.map(r => r.varde));
    const rad = (r: (typeof rader)[number]) => {
      const b = PROJEKT_BEHOV[r.d.behov];
      const om = `${r.d.namn}: ${b.namn.toLowerCase()}. Byn saknar ${Math.round(r.brist * 100)} % av det den vill ha. Kostar ${num(r.d.kostnad(), 1)} arbetstimmar med materialet. ${r.kan ? `${r.kan} kan göra det nu` : 'Ingen kan göra det nu'}.`;
      return `<dt ${tip(om)}>${iconImg(r.d.ikon, 20)} ${iconImg(b.ikon)}</dt><dd ${tip(om)}>${bar(r.varde / max)} ${r.gor.length ? r.gor.map(p => pLink(p)).join(', ') : r.kan ? '' : '<span class="muted">ingen kan</span>'}</dd>`;
    };
    return `<div class="tekhead">${hjalpKnapp('projekt', 'Hur väljer byn vad den gör?')}</div>
    ${hjalpText('projekt', '<p class="muted small">Det byn saknar mest per arbete och material görs först. Stapeln är värdet: hur mycket det behövs gånger hur mycket byn saknar, delat med vad det kostar. Den som har tid för handarbete gör det mest värda hen kan, och på dagen tävlar det med arbetet om maten och veden när ingen fara går före. Husen väljs för sig.</p>')}
    ${rader.length ? `<dl class="kv">${rader.map(rad).join('')}</dl>` : '<p class="muted">Byn saknar inget den kan bygga.</p>'}`;
  },
};
