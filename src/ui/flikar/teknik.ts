import { ACTS, ACT_LIST, ACT_NAMES, Act, Person, TEK, TEKNIK, hasMaterial, item, knows, living, sakNamn } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// teknikträdet som symboler: arbetet till vänster, teknikerna till höger, sträck mellan det som hänger ihop.
// Ett tryck på en symbol visar mer om den.
let tekSel: string | undefined, tekHelp = false;
export const teknik: Flik = {
  namn: 'Teknik',
  html: tekHtml,
  klick(el) {
    const tn = el.closest<HTMLElement>('[data-tek]');
    if (tn) { tekSel = tekSel === tn.dataset.tek ? undefined : tn.dataset.tek; return true; }
    const tg = el.closest<HTMLElement>('[data-tekgo]'); // en teknik i personfliken: öppna den i trädet
    if (tg) { ui.tab = 'teknik'; tekSel = tg.dataset.tekgo; return true; }
    if (el.closest('[data-tekhelp]')) { tekHelp = !tekHelp; return true; }
    return false;
  },
};

// teknik som en annan teknik bygger på: krav, eller ett redskap som kan användas som material
const tekFrom = (t: (typeof TEKNIK)[number]) => [...new Set([...t.krav, ...t.material.flat().filter(k => TEK[k])])];
function tekHtml() {
  const ppl = living(s);
  const roots = ACT_LIST.filter(a => ACTS[a].ikon && TEKNIK.some(t => t.omr.includes(a))); // arbetet visas med sin ikon
  const depth: Record<string, number> = {};
  const dep = (id: string): number => depth[id] ??= 1 + Math.max(0, ...tekFrom(TEK[id]).map(dep));
  TEKNIK.forEach(t => dep(t.id));
  const cols = Math.max(...Object.values(depth)) + 1;
  // plats för varje nod i procent: kolumn efter djup, jämnt fördelat i höjdled
  const pos: Record<string, { x: number; y: number }> = {};
  const place = (ids: string[], col: number) => ids.forEach((id, i) => { pos[id] = { x: 12 + col * (76 / (cols - 1)), y: (i + 0.5) / ids.length * 100 }; });
  place(roots.map(r => 'a:' + r), 0);
  for (let c = 1; c < cols; c++) place(TEKNIK.filter(t => depth[t.id] === c).map(t => t.id), c);
  const lines: string[] = [];
  for (const t of TEKNIK) {
    for (const a of t.omr) if (pos['a:' + a]) lines.push(`<line class="omr" x1="${pos['a:' + a].x}" y1="${pos['a:' + a].y}" x2="${pos[t.id].x}" y2="${pos[t.id].y}"/>`);
    for (const k of tekFrom(t)) lines.push(`<line class="${t.krav.includes(k) ? 'krav' : 'mat'}" x1="${pos[k].x}" y1="${pos[k].y}" x2="${pos[t.id].x}" y2="${pos[t.id].y}"/>`);
  }
  const node = (id: string, inner: string, cls: string, title: string, extra = '') =>
    `<button type="button" class="tnod ${cls}${tekSel === id ? ' sel' : ''}" data-tek="${id}" style="left:${pos[id].x}%;top:${pos[id].y}%" title="${esc(title)}" aria-label="${esc(title)}">${inner}${extra}</button>`;
  const nodes = [
    ...roots.map(a => node('a:' + a, iconImg(ACTS[a].ikon!, 20), 'rot', ACT_NAMES[a])),
    ...TEKNIK.map(t => {
      const kan = ppl.filter(p => knows(p, t.id)).length, best = Math.max(0, ...ppl.map(p => p.tek?.[t.id] ?? 0));
      const ring = !kan && best > 0.01 ? `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(best * 100)} 100"/></svg>` : '';
      return node(t.id, iconImg(t.id, 24), kan ? 'kan' : best > 0.01 ? 'pa' : 'ok', t.namn, ring + (kan ? `<span class="antal">${kan}</span>` : '') + (hasMaterial(s, t) ? '' : '<span class="brist">!</span>'));
    }),
  ];
  const h = Math.max(150, Math.max(roots.length, ...Array.from({ length: cols }, (_, c) => TEKNIK.filter(t => depth[t.id] === c).length)) * 64);
  return `<div class="tekhead"><button type="button" class="hjalp" data-tekhelp aria-expanded="${tekHelp}" title="Hur fungerar teknik?">?</button></div>
    ${tekHelp ? `<p class="muted small">Den som arbetar med något kommer så småningom på hur det kan göras bättre. Nyfikenheten avgör hur ofta hen funderar och intelligensen hur fort det går. Det man kan lärs ut i samtal. Dör alla som kan något försvinner kunskapen. Siffran är hur många som kan tekniken, ringen hur långt den som funderat mest har kommit, och ! att materialet saknas i byn.</p>` : ''}
    <div class="ttrad" style="height:${h}px"><svg class="tlinjer" viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>${nodes.join('')}</div>
    ${tekInfo(ppl)}`;
}
// det som visas när man tryckt på en symbol i trädet
function tekInfo(ppl: Person[]) {
  if (!tekSel) return '';
  if (tekSel.startsWith('a:')) {
    const a = tekSel.slice(2) as Act, ts = TEKNIK.filter(t => t.omr.includes(a));
    return `<div class="tinfo"><div class="tektop">${iconImg(ACTS[a].ikon!, 20)}<b>${esc(ACT_NAMES[a])}</b></div><p class="small muted">Den som arbetar med det här kan komma på ${ts.map(t => iconImg(t.id, 14) + ' ' + esc(t.namn.toLowerCase())).join(', ')}.</p></div>`;
  }
  const t = TEK[tekSel];
  if (!t) return '';
  const kan = ppl.filter(p => knows(p, t.id));
  const pa = ppl.filter(p => !knows(p, t.id) && (p.tek?.[t.id] ?? 0) > 0.01).sort((a, b) => b.tek![t.id] - a.tek![t.id]).slice(0, 5);
  const mat = t.material.map(g => g.map(k => `<span class="${item(s, k) >= 1 ? '' : 'saknas'}" title="${esc(sakNamn(k))}">${iconImg(k, 16) || esc(sakNamn(k))}</span>`).join('<i>/</i>')).join('<i>+</i>');
  return `<div class="tinfo"><div class="tektop">${iconImg(t.id, 24)}<b>${esc(t.namn)}</b><span class="tmat">${mat}</span></div>
    <p class="small">${esc(t.text)} ${esc(t.effekt)}</p>
    ${kan.length ? `<p class="kan">${kan.map(pLink).join(', ')}</p>` : '<p class="muted small">Ingen kan det.</p>'}
    ${pa.length ? `<div class="tank">${pa.map(p => `${pLink(p)}${bar(p.tek![t.id], 'skill')}`).join('')}</div>` : ''}</div>`;
}
