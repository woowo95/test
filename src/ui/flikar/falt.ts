import { DAY, FALT_STEG, GRODOR, ODLING, byId, faltById, faltKlar, grodaPa, living, skordAndel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, durTxt, esc, fmtN, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// ett fält (steg 2.10.14): öppnas genom att trycka på fältet på kartan. Ett tryck till på en gröda i fältet visar grödan.
// Fältet: ägaren, storleken, steget och hur långt det kommit, grödan och vem som arbetar där. Grödan: hur långt den vuxit,
// vad den ger vid skörden och när frosten tar den
export const falt: Flik = { namn: 'Fältet', knapp: 'person', html: () => (ui.faltRuta >= 0 ? grodaHtml() : faltHtml()) };

function faltHtml() {
  const f = faltById(s, ui.faltId);
  if (!f) return '<p class="muted">Fältet har vuxit igen med gräs.</p>';
  const ag = byId(s, f.agare), d = f.groda && GRODOR[f.groda], rader = Math.ceil(f.n / f.w), vaxer = f.steg === 'vaxer' || f.steg === 'mogen';
  const antal = f.steg === 'mogen' ? f.sadda ?? f.n : f.n, arbetar = living(s).filter(p => p.task?.act === 'odla' && p.task.ref === f.id);
  return `
    <div class="phead">${iconImg(d ? (f.steg === 'mogen' ? d.sak : 'grodd') : 'odling', 32)}<div><h2>Fält</h2>
    <p class="muted">${ag ? `${pLink(ag)}s familj` : 'Ingen äger det'} · ${f.n} rutor (${Math.min(f.w, f.n)} × ${rader})</p></div></div>
    <h3>Just nu</h3><dl class="kv">
      <dt>${esc(FALT_STEG[f.steg].namn)}</dt><dd>${bar(faltKlar(f))}<span>${Math.round(faltKlar(f) * 100)} %</span></dd>
      ${f.steg !== 'vaxer' ? `<dt>Rutor klara</dt><dd>${f.klara} av ${antal}</dd>` : ''}
      ${d && vaxer ? `<dt>${iconImg(d.sak, 14)} Gröda</dt><dd>${esc(d.namn)} på ${f.sadda ?? 0} rutor</dd>` : ''}
      ${f.steg === 'mogen' ? `<dt>Skörden</dt><dd>${bar(skordAndel(s, f))}<span>${Math.round(skordAndel(s, f) * 100)} %</span></dd>` : ''}
      ${arbetar.length ? `<dt>Arbetar</dt><dd>${arbetar.map(pLink).join(', ')}</dd>` : ''}
      <dt>Senast skött</dt><dd>för ${durTxt(s.now - f.rord)} sedan</dd>
    </dl>
    ${vaxer ? '<p class="muted">Tryck på en gröda för att se den.</p>' : ''}`;
}

function grodaHtml() {
  const f = faltById(s, ui.faltId), k = ui.faltRuta;
  if (!f || !f.groda || !grodaPa(f, k)) return '<p class="muted">Grödan är skördad eller borta.</p>';
  const d = GRODOR[f.groda], mogen = f.steg === 'mogen', a = mogen ? skordAndel(s, f) : 1, ag = byId(s, f.agare);
  const over = mogen && f.mogen !== undefined ? ODLING.overDygn * DAY - (s.now - f.mogen) : 0;
  return `
    <div class="phead">${iconImg(mogen ? d.sak : 'grodd', 32)}<div><h2>${esc(d.namn)}</h2>
    <p class="muted">${ag ? `På ${pLink(ag)}s fält` : 'På ett fält'} · ruta ${k + 1} av ${f.sadda ?? 0}</p></div></div>
    <dl class="kv">
      <dt>${mogen ? 'Mogen' : 'Växer'}</dt><dd>${bar(mogen ? 1 : f.vuxit ?? 0)}<span>${Math.round((mogen ? 1 : f.vuxit ?? 0) * 100)} %</span></dd>
      ${mogen ? `<dt>Skörda</dt><dd>${over > 0 ? `inom ${durTxt(over)}, sedan blir den övermogen` : `övermogen, ${Math.round(a * 100)} % kvar`}</dd>`
        : `<dt>Mogen</dt><dd>om ungefär ${durTxt((1 - (f.vuxit ?? 0)) * d.dygn * DAY)} när det är varmt</dd>`}
      <dt>Ger</dt><dd>${iconImg(d.sak, 14)} ${fmtN(d.perRuta * a)} och ${iconImg('fron', 14)} ${fmtN(d.fron * a)} frön</dd>
      <dt>Frosten</dt><dd>dör när det blir kallare än ${d.frost} grader, och i istiden</dd>
    </dl>`;
}
