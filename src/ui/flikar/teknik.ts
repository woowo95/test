import { ACTS, MATERIAL, SLAG, Person, SAKER, TEK, TEKNIK, Tek, amountOf, harSak, hasMaterial, knows, living, sakNamn, tiondel } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, esc, hjalpKnapp, hjalpText, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// teknikträdet som symboler: det som inte kräver något till vänster, sträck till det som är låst bakom det.
// Ett tryck på en symbol visar mer om den.
let tekSel: string | undefined;
export const teknik: Flik = {
  namn: 'Teknik',
  html: tekHtml,
  klick(el) {
    const tn = el.closest<HTMLElement>('[data-tek]');
    if (tn) { tekSel = tekSel === tn.dataset.tek ? undefined : tn.dataset.tek; return true; }
    const tg = el.closest<HTMLElement>('[data-tekgo]'); // en teknik i personfliken: öppna den i trädet
    if (tg) { ui.tab = 'teknik'; tekSel = tg.dataset.tekgo; return true; }
    return false;
  },
};

function tekHtml() {
  const ppl = living(s);
  // kolumn efter hur många steg av krav som ligger före; det man kan från början är ingen teknik och visas inte
  const depth: Record<string, number> = {};
  const dep = (id: string): number => depth[id] ??= TEK[id].krav.length ? 1 + Math.max(...TEK[id].krav.map(dep)) : 0;
  TEKNIK.forEach(t => dep(t.id));
  const cols = Math.max(...Object.values(depth)) + 1;
  // plats för varje nod i procent: kolumn efter djup, jämnt fördelat i höjdled
  const pos: Record<string, { x: number; y: number }> = {};
  for (let c = 0; c < cols; c++) {
    // i höjdled nära det de kräver, så att sträcken korsar varandra så lite som möjligt
    const mitt = (id: string) => TEK[id].krav.reduce((a, k) => a + pos[k].y, 0) / Math.max(1, TEK[id].krav.length);
    const ids = TEKNIK.filter(t => depth[t.id] === c).map(t => t.id).sort((a, b) => mitt(a) - mitt(b));
    ids.forEach((id, i) => { pos[id] = { x: cols > 1 ? 15 + c * (70 / (cols - 1)) : 50, y: (i + 0.5) / ids.length * 100 }; });
  }
  // linjerna visar vad som är låst bakom vad: en teknik kräver en annan
  const lines = TEKNIK.flatMap(t => t.krav.map(k => `<line x1="${pos[k].x}" y1="${pos[k].y}" x2="${pos[t.id].x}" y2="${pos[t.id].y}"/>`));
  const nodes = TEKNIK.map(t => {
    const kan = ppl.filter(p => knows(p, t.id)).length, best = Math.max(0, ...ppl.map(p => p.tek?.[t.id] ?? 0));
    const ring = !kan && best > 0.01 ? `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" pathLength="100" stroke-dasharray="${Math.round(best * 100)} 100"/></svg>` : '';
    // ! bara när det spelar roll: ingen kan det och ingen kan komma på det, för det som behövs finns inte i byn
    const brist = !kan && !hasMaterial(s, t) ? `<span class="brist" title="${esc(`Ingen kan komma på det nu: ${saknas(t)} finns inte i byn.`)}">!</span>` : '';
    const title = t.namn + (kan ? `: ${kan} kan det` : '');
    return `<button type="button" class="tnod ${kan ? 'kan' : best > 0.01 ? 'pa' : 'ok'}${tekSel === t.id ? ' sel' : ''}" data-tek="${t.id}" style="left:${pos[t.id].x}%;top:${pos[t.id].y}%" title="${esc(title)}" aria-label="${esc(title)}">${iconImg(t.id, 24)}${ring}${kan ? `<span class="antal">${kan}</span>` : ''}${brist}</button>`;
  });
  const h = Math.max(150, Math.max(...Array.from({ length: cols }, (_, c) => TEKNIK.filter(t => depth[t.id] === c).length)) * 64);
  return `<div class="tekhead">${hjalpKnapp('teknik', 'Hur fungerar teknik?')}</div>
    ${hjalpText('teknik', `<p class="muted small">Den som arbetar med något kommer så småningom på hur det kan göras bättre. Nyfikenheten avgör hur ofta hen funderar och intelligensen hur fort det går. Det man kan lärs ut i samtal. Dör alla som kan något försvinner kunskapen. Ett sträck betyder att tekniken till höger kräver den till vänster. Siffran är hur många som kan tekniken och ringen hur långt den som funderat mest har kommit. Tryck på en teknik för att se vad den kräver och hur man kommer på den.</p>`)}
    <div class="ttrad" style="height:${h}px"><svg class="tlinjer" viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>${nodes.join('')}</div>
    ${tekInfo(ppl)}`;
}
const lista = (xs: string[], och = 'och') => xs.length > 1 ? xs.slice(0, -1).join(', ') + ` ${och} ` + xs[xs.length - 1] : xs[0] ?? '';
// det som saknas i byn för att någon ska kunna komma på tekniken
const saknas = (t: Tek) => lista(t.material.filter(g => !g.some(k => harSak(s, k))).map(g => lista(g.map(k => sakNamn(k).toLowerCase()), 'eller')));
// receptet: det som går åt för att göra en sak av tekniken (saker.ts), eller för en ruta av ett bygge (byggnad.ts)
function recept(t: Tek): { k: string; n: number; per?: string }[] {
  const av = SAKER[t.id]?.skaffa?.av;
  if (av) return Object.entries(av).map(([k, n]) => ({ k, n }));
  return Object.values(MATERIAL).filter(m => m.tek === t.id && m.item).map(m => ({ k: m.item!, n: m.n, per: m.namn.toLowerCase() }));
}
// det som visas när man tryckt på en symbol i trädet
function tekInfo(ppl: Person[]) {
  const t = tekSel ? TEK[tekSel] : undefined;
  if (!t) return '';
  const kan = ppl.filter(p => knows(p, t.id));
  const pa = ppl.filter(p => !knows(p, t.id) && (p.tek?.[t.id] ?? 0) > 0.01).sort((a, b) => b.tek![t.id] - a.tek![t.id]).slice(0, 5);
  const r = recept(t);
  const rtext = 'Det som går åt: ' + lista(r.map(x => `${sakNamn(x.k).toLowerCase()} ×${tiondel(x.n)}${x.per ? ` per ${x.per}` : ''}`));
  const mat = r.map(x => `<span class="${amountOf(s, x.k) >= x.n ? '' : 'saknas'}">${iconImg(x.k, 16) || esc(sakNamn(x.k))}<small>${tiondel(x.n)}</small></span>`).join('<i>+</i>');
  // hur den upptäcks: arbetet där man kommer på den, tekniken man måste kunna först och det som måste finnas i byn
  const arb = lista([...new Set(t.omr.map(a => SLAG[ACTS[a].slag ?? 'hantverk'].toLowerCase()))], 'eller');
  const krav = t.krav.length ? ` om hen kan ${lista(t.krav.map(k => TEK[k].namn.toLowerCase()))}` : '';
  const finns = lista(t.material.map(g => lista(g.map(k => sakNamn(k).toLowerCase()), 'eller')));
  return `<div class="tinfo"><div class="tektop">${iconImg(t.id, 24)}<b>${esc(t.namn)}</b>${r.length ? `<span class="tmat" title="${esc(rtext)}">${mat}</span>` : ''}</div>
    <p class="small">${esc(t.text)} ${esc(t.effekt)}</p>
    <p class="small muted">Den som ${esc(arb)} kan komma på det${esc(krav)}, när det finns ${esc(finns)} i byn.</p>
    ${kan.length ? `<p class="kan">${kan.map(pLink).join(', ')}</p>` : '<p class="muted small">Ingen kan det.</p>'}
    ${pa.length ? `<div class="tank">${pa.map(p => `${pLink(p)}${bar(p.tek![t.id], 'skill')}`).join('')}</div>` : ''}</div>`;
}
