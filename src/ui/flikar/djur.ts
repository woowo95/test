import { DJUR, INDIVID, djurOf, dragOf, grupperOf, halsaOf, kortTal, vargarOf } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, condBar, esc } from '../hjalp';
import { djurSynliga } from '../vaxter';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// ett djur (steg 3.7.13): öppnas genom att trycka på det på kartan. Egenskaperna som staplar, som människornas (Björn efter
// v159): namnet, stapeln och talet, och texten syns när man håller musen över raden. Stapeln för styrka och snabbhet är full
// för den starkaste och snabbaste av arten (artens värde plus spannet mellan individerna, INDIVID.spann)
const rad = (namn: string, andel: number, varde: string, text: string, cls = '') =>
  `<dt title="${esc(text)}">${esc(namn)}</dt><dd title="${esc(text)}">${cls === 'cond' ? condBar(andel) : bar(andel, cls)}<span>${varde}</span></dd>`;
function djurHtml() {
  const d = djurSynliga().find(x => x.id === ui.djurId) ?? [...djurOf(s, ui.nu), ...vargarOf(s)].find(x => x.id === ui.djurId);
  if (!d) return '<p class="muted">Djuret syns inte längre här.</p>';
  const art = DJUR[d.art].strid, drag = dragOf(d.art, d.id), h = halsaOf(s, d.id), g = d.art === 'kanin' ? grupperOf(s, ui.nu).find(x => x.id === d.grupp) : undefined;
  const f = d.art === 'varg' ? s.vargar?.find(x => x.id === d.grupp) : undefined, topp = 1 + INDIVID.spann;
  const jfr = (v: number, bas: number) => v > bas * 1.08 ? 'mer än de flesta' : v < bas * 0.92 ? 'mindre än de flesta' : 'som de flesta';
  const pr = (v: number) => `${Math.round(v * 100)} %`;
  return `
    <div class="phead">${iconImg(d.art, 32)}<div><h2>${esc(art.art)}</h2></div></div>
    <dl class="kv">
      ${rad('Ålder', drag.alder / art.alder, `${drag.alder} år`, `${drag.alder} år gammal. En ${art.art.toLowerCase()} blir högst ${art.alder} år.`)}
      ${rad('Styrka', drag.styrka / (art.styrka * topp), kortTal(drag.styrka), `Styrka ${kortTal(drag.styrka)}, ${jfr(drag.styrka, art.styrka)}`)}
      ${rad('Snabbhet', drag.snabbhet / (art.fart * topp), kortTal(drag.snabbhet), `Snabbhet ${kortTal(drag.snabbhet)}, ${jfr(drag.snabbhet, art.fart)}${drag.alder / art.alder > 0.7 ? '. Den är gammal och har blivit långsammare' : ''}`)}
      ${drag.skygghet !== undefined ? rad('Skygghet', drag.skygghet, pr(drag.skygghet), 'Hur tidigt den märker den som smyger och flyr', 'skill') : ''}
      ${rad('Hälsa', h.blod, pr(h.blod), h.sar > 0 ? 'Skadad: blodet och såren läker med tiden' : 'Frisk', 'cond')}
      ${h.sar > 0 ? `<dt title="Summan av såren. De läker med tiden">Sår</dt><dd title="Summan av såren. De läker med tiden"><span>${kortTal(h.sar)}</span></dd>` : ''}
      ${drag.mod !== undefined ? rad('Mod', drag.mod, pr(drag.mod), 'Hur modig vargen är. Flocken blir modigare ju fler den är, och den flyr när en varg faller eller ledarvargen dör', 'skill') : ''}
      ${f ? rad('Hunger', f.hunger, pr(f.hunger), 'Flockens hunger. En hungrig flock jagar harar, smyger till förrådet på natten och kan anfalla den som är ensam', f.hunger > 0.6 ? 'low' : '') : ''}
      ${f ? `<dt>Flock</dt><dd title="${esc(f.vargar.length > 1 ? `Flocken har ${f.vargar.length} vargar${f.vargar[0] === d.id ? '. Den här är ledarvargen' : ''}` : 'En ensam varg')}"><span>${f.vargar.length} st</span></dd>` : ''}
      ${g ? `<dt>Grupp</dt><dd title="Gruppen har ${g.n} harar just nu"><span>${g.n} st</span></dd>` : ''}
    </dl>`;
}
export const djur: Flik = { namn: 'Djuret', knapp: 'person', html: djurHtml };
