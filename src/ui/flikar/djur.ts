import { DJUR, djurOf, dragOf, grupperOf, halsaOf, kortTal } from '../../sim';
import { iconImg } from '../../ikoner';
import { condBar, esc } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// ett djur (steg 3.7.13): öppnas genom att trycka på det på kartan. Symbolerna först (art, ålder, styrka, snabbhet,
// skygghet, hälsa och gruppen), och texten syns när man håller musen över dem
const rad = (tecken: string, namn: string, varde: string, text: string) =>
  `<dt title="${esc(namn)}">${tecken}</dt><dd title="${esc(text)}">${varde}</dd>`;
function djurHtml() {
  const d = djurOf(s, ui.nu).find(x => x.id === ui.djurId);
  if (!d) return '<p class="muted">Djuret syns inte längre här.</p>';
  const art = DJUR[d.art].strid, drag = dragOf(d.art, d.id), h = halsaOf(s, d.id), g = grupperOf(s, ui.nu).find(x => x.id === d.grupp);
  const jfr = (v: number, bas: number) => v > bas * 1.08 ? 'mer än de flesta' : v < bas * 0.92 ? 'mindre än de flesta' : 'som de flesta';
  return `
    <div class="phead">${iconImg(d.art, 32)}<div><h2>${esc(art.art)}</h2></div></div>
    <dl class="kv">
      ${rad('⌛', 'Ålder', `${drag.alder} år`, `${drag.alder} år gammal. En ${art.art.toLowerCase()} blir högst ${art.alder} år.`)}
      ${rad('💪', 'Styrka', kortTal(drag.styrka), `Styrka ${kortTal(drag.styrka)}, ${jfr(drag.styrka, art.styrka)}`)}
      ${rad('💨', 'Snabbhet', kortTal(drag.snabbhet), `Snabbhet ${kortTal(drag.snabbhet)}, ${jfr(drag.snabbhet, art.fart)}${drag.alder / art.alder > 0.7 ? '. Den är gammal och har blivit långsammare' : ''}`)}
      ${drag.skygghet !== undefined ? rad('👁', 'Skygghet', `${Math.round(drag.skygghet * 100)} %`, 'Hur tidigt den märker den som smyger och flyr') : ''}
      ${rad('❤', 'Hälsa', `${condBar(h.blod)}<span>${Math.round(h.blod * 100)} %</span>`, h.sar > 0 ? `Skadad: blodet och såren läker med tiden` : 'Frisk')}
      ${h.sar > 0 ? rad('🩹', 'Sår', kortTal(h.sar), 'Summan av såren. De läker med tiden') : ''}
      ${g ? rad('👥', 'Grupp', `${g.n} st`, `Gruppen har ${g.n} kaniner just nu`) : ''}
    </dl>`;
}
export const djur: Flik = { namn: 'Djuret', knapp: 'person', html: djurHtml };
