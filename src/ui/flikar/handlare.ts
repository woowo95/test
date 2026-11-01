import { HANDEL, HANDLAR_UTR, grundvarde, handlarVarde, kgOf, kortTal, rymmer, sakNamn } from '../../sim';
import { iconImg } from '../../ikoner';
import { esc } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// handlaren (steg 4.4.1.5): öppnas genom att trycka på hen på kartan. Varorna med priset i silver (det hen värderar dem
// till, handlarVarde), silvret, packningen och bytena under besöket. Texten syns när man håller musen över raden
const pris = (k: string, q?: number) => Math.max(1, Math.round(grundvarde(k) * handlarVarde(s, s.handlare!, k) * (q === undefined ? 1 : 0.6 + 0.2 * q)));
function handlarHtml() {
  const h = s.handlare;
  if (!h) return '<p class="muted">Handlaren har gått hem.</p>';
  const fas = h.fas === 'kommer' ? 'På väg till byn' : h.fas === 'handlar' ? 'Vid filten' : 'På väg hem';
  const varor = h.varor.map(w => `<li title="${esc(`${sakNamn(w.k)}: ungefär ${pris(w.k, w.q)} silver styck`)}">${iconImg(w.k, 16)} ${w.n > 1 ? `${w.n} ` : ''}<span>${pris(w.k, w.q)}</span>${iconImg('silver', 12)}</li>`).join('');
  const bytt = (h.bytt ?? []).slice().reverse().map(b => `<li>${esc(`${b.vem}: ${b.fick} mot ${b.gav}`)}</li>`).join('');
  const ko = h.ko?.length ?? 0;
  return `
    <div class="phead">${iconImg('handlare', 32)}<div><h2>${esc(h.namn)}</h2><p class="muted" title="${esc(`Handlare från ${h.hem}`)}">${esc(fas)}</p></div></div>
    <dl class="kv">
      <dt title="Silvret handlaren har med sig">${iconImg('silver', 12)}</dt><dd title="Silvret handlaren har med sig"><span>${Math.round(h.silver)}</span></dd>
      <dt title="${esc(`${HANDLAR_UTR[h.utr]?.namn ?? h.utr}: så mycket bär hen och så mycket rymmer den`)}">kg</dt><dd title="${esc(`${HANDLAR_UTR[h.utr]?.namn ?? h.utr}: så mycket bär hen och så mycket rymmer den`)}"><span>${kortTal(kgOf(h.varor))} / ${rymmer(h)}</span></dd>
      <dt title="Färdigheten Handel (0–20)">Handel</dt><dd title="Färdigheten Handel (0–20)"><span>${h.handel}</span></dd>
      ${ko ? `<dt title="Så många står i kö vid filten">Kö</dt><dd title="Så många står i kö vid filten"><span>${ko}</span></dd>` : ''}
    </dl>
    <h3 title="Det handlaren har kvar, med priset i silver (hen tar ${Math.round(HANDEL.vinst * 100)} % över värdet)">Varor</h3>
    <ul class="varor">${varor || '<li class="muted">Inget kvar</li>'}</ul>
    ${bytt ? `<h3 title="Bytena under besöket, det senaste först">Bytt</h3><ul class="bytt">${bytt}</ul>` : ''}`;
}
export const handlare: Flik = { namn: 'Handlaren', knapp: 'person', html: handlarHtml };
