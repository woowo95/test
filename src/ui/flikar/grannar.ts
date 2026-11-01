import { KLAN_ROLLER, instText, klanerOf } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// grannklanerna (steg 4.4.3, klaner.ts): en lista utan karta (världskartan är steg 11.1.3). Namn, var de bor, hur många de
// är, hur många som kan slåss, hur mycket de har, hur de ser på byn och de namngivna personerna. Texten syns med musen över
const ROLL_IKON: Record<string, string> = { hovding: 'ledarskap', handlare: 'handlare', aldste: 'i_legend', jagare: 'i_vargdodare', grundare: 'i_rik' };
function grannarHtml() {
  const k = klanerOf(s);
  if (!k.length) return '<p class="muted">Byn känner inga grannar.</p>';
  return k.map(c => {
    const t = instText(c.inst), cls = c.inst <= -15 ? 'low' : '';
    const per = c.personer.map(p => `<li title="${esc(`${KLAN_ROLLER[p.roll]?.namn ?? p.roll}: ${p.namn}`)}">${iconImg(ROLL_IKON[p.roll] ?? '', 12)} ${esc(p.namn)}</li>`).join('');
    return `<div class="tekhead"><b title="${esc(`${c.namn} bor vid ${c.hem}${c.utbrytare ? '. Grundad av några som lämnade byn' : ''}`)}">${esc(c.namn)}</b> <span class="muted">${esc(c.hem)}</span></div>
    <dl class="kv">
      <dt title="Så många är de">👥</dt><dd title="Så många är de"><span>${c.folk}</span></dd>
      <dt title="Så många kan slåss">⚔️</dt><dd title="Så många kan slåss"><span>${c.styrka}</span></dd>
      <dt title="Så mycket har de (ungefär arbetstimmar)">${iconImg('i_rik', 12)}</dt><dd title="Så mycket har de (ungefär arbetstimmar)"><span>${c.resurser}</span></dd>
      <dt title="${esc(`Hur de ser på byn: ${t} (${c.inst} av −100 till 100)`)}">♥</dt><dd title="${esc(`Hur de ser på byn: ${t} (${c.inst} av −100 till 100)`)}">${bar((c.inst + 100) / 200, cls)}<span>${esc(t)}</span></dd>
    </dl>
    <ul class="bytt">${per}</ul>`;
  }).join('');
}
export const grannar: Flik = { namn: 'Grannar', syns: () => !!s.klaner?.length, html: grannarHtml };
