import { DAY, FALT_STEG, GRODOR, MARK_FORE, ODLING, byId, faltById, faltKlar, grodaPa, living, skordAndel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, durTxt, esc, fmtN, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// ett fält (steg 2.10.14): öppnas genom att trycka på fältet på kartan. Ett tryck till på en ruta i fältet visar rutan.
// Fältet: ägaren, storleken, steget och hur långt det kommit, grödan och vem som arbetar där. Rutan: grödan om något växer
// där (hur långt den vuxit, vad den ger vid skörden och när frosten tar den) och marken (steg 3.10.6): vad som växte där
// innan, när rutan bereddes och när den sist sköttes. Fukten (3.8.2) och bördigheten (8.3.1) kommer i samma ruta
export const falt: Flik = { namn: 'Fältet', knapp: 'person', html: () => (ui.faltRuta >= 0 ? rutaHtml() : faltHtml()) };

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
    <p class="muted">Tryck på en ruta för att se ${vaxer ? 'grödan och ' : ''}marken.</p>`;
}

// marken på ruta k (steg 3.10.6)
function markHtml(f: NonNullable<ReturnType<typeof faltById>>, k: number) {
  const fore = f.fore?.[k], bered = f.bered?.[k], skott = f.skott?.[k];
  return `<h3>Marken</h3><dl class="kv">
      ${fore != null ? `<dt>Växte innan</dt><dd>${MARK_FORE[fore]}</dd>` : ''}
      <dt>Bereddes</dt><dd>${bered != null ? `för ${durTxt(s.now - bered)} sedan` : 'inte än'}</dd>
      <dt>Senast skött</dt><dd>${skott != null ? `för ${durTxt(s.now - skott)} sedan` : 'inte än'}</dd>
    </dl>`;
}
function rutaHtml() {
  const f = faltById(s, ui.faltId), k = ui.faltRuta;
  if (!f || k >= f.n) return '<p class="muted">Fältet har vuxit igen med gräs.</p>';
  const ag = byId(s, f.agare), vid = ag ? `På ${pLink(ag)}s fält` : 'På ett fält';
  if (!f.groda || !grodaPa(f, k)) return `
    <div class="phead">${iconImg('odling', 32)}<div><h2>Ruta på fältet</h2>
    <p class="muted">${vid} · ruta ${k + 1} av ${f.n}</p></div></div>
    <p class="muted">${f.groda ? 'Här växer inget.' : 'Inget är sått här.'}</p>${markHtml(f, k)}`;
  const d = GRODOR[f.groda], mogen = f.steg === 'mogen', a = mogen ? skordAndel(s, f) : 1;
  const over = mogen && f.mogen !== undefined ? ODLING.overDygn * DAY - (s.now - f.mogen) : 0;
  return `
    <div class="phead">${iconImg(mogen ? d.sak : 'grodd', 32)}<div><h2>${esc(d.namn)}</h2>
    <p class="muted">${vid} · ruta ${k + 1} av ${f.sadda ?? 0}</p></div></div>
    <dl class="kv">
      <dt>${mogen ? 'Mogen' : 'Växer'}</dt><dd>${bar(mogen ? 1 : f.vuxit ?? 0)}<span>${Math.round((mogen ? 1 : f.vuxit ?? 0) * 100)} %</span></dd>
      ${mogen ? `<dt>Skörda</dt><dd>${over > 0 ? `inom ${durTxt(over)}, sedan blir den övermogen` : `övermogen, ${Math.round(a * 100)} % kvar`}</dd>`
        : `<dt>Mogen</dt><dd>om ungefär ${durTxt((1 - (f.vuxit ?? 0)) * d.dygn * DAY)} när det är varmt</dd>`}
      <dt>Ger</dt><dd>${iconImg(d.sak, 14)} ${fmtN(d.perRuta * a)} och ${iconImg(d.fro, 14)} ${fmtN(d.fron * a)} frön</dd>
      <dt>Frosten</dt><dd>dör när det blir kallare än ${d.frost} grader, och i istiden</dd>
    </dl>${markHtml(f, k)}`;
}
