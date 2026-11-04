import { KARTBILDER, SYMNAMN, SYMTECKEN } from '../kartbilder';
import { iconCanvas } from '../ikoner';

// Spelets emojier som pixelsymboler (steg 5.3.2.1). Texterna i spelet skriver fortfarande emojin (eller {sym_…} där samma
// emoji har flera betydelser, t.ex. {sym_toa} för toan och 💧 för vattnet), och här byts den mot bildstilens symbol när texten
// kommer in i sidan: i panelerna, loggen, ryktena, tipsrutorna och arenan. Symbolerna är 16 punkter höga och visas i hel
// skala, också mitt i en textrad. Registret är SYMTECKEN i kartbilder.ts (ur bildstilens tecken, 5.2.4.2). I en tipsruta
// (title) och i en rullista går ingen bild: där stryks emojin, och står den ensam blir den symbolens namn
const EXTRA: Record<string, string> = { '★': 'sym_stjarna' }; // det perfekta mästerverket och legenden i texterna
const idAv = (e: string) => SYMTECKEN[e] ?? EXTRA[e];
const nycklar = [...Object.keys(SYMTECKEN), ...Object.keys(EXTRA)].sort((a, b) => b.length - a.length);
const skydda = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const SYM_RE = new RegExp(`\\{(sym_[a-z0-9_]+)\\}|(${nycklar.map(skydda).join('|')})\\uFE0F?`, 'gu');
export const symNamn = (id: string) => SYMNAMN[id] ?? id.replace(/^sym_/, '');

// texten i delar: text och symbolernas id (för sidan, och för scenariot som kontrollerar att inga emojier blir kvar)
export function symDelar(t: string): (string | { id: string })[] {
  const ut: (string | { id: string })[] = [];
  let i = 0;
  SYM_RE.lastIndex = 0; // matchAll börjar där regexen senast stannade
  for (const m of t.matchAll(SYM_RE)) {
    const id = m[1] ?? idAv(m[2].replace(/️/g, ''));
    if (!id || !KARTBILDER[id]) continue;
    if (m.index! > i) ut.push(t.slice(i, m.index));
    ut.push({ id }); i = m.index! + m[0].length;
  }
  if (i < t.length) ut.push(t.slice(i));
  return ut;
}
// texten utan symboler (tipsrutor och rullistor): står bara symbolen kvar blir det dess namn
export function symUtan(t: string) {
  const d = symDelar(t);
  if (!d.some(x => typeof x !== 'string')) return t;
  const text = d.filter((x): x is string => typeof x === 'string').join('').replace(/ {2,}/g, ' ').trim();
  return text || d.filter((x): x is { id: string } => typeof x !== 'string').map(x => symNamn(x.id)).join(', ');
}

const urls: Record<string, string> = {};
const url = (id: string) => (urls[id] ??= iconCanvas('kb_' + id).toDataURL());
function bild(id: string) {
  const b = KARTBILDER[id], img = document.createElement('img');
  img.className = 'ikon sym'; img.src = url(id); img.width = b.w; img.height = b.h; img.alt = symNamn(id);
  return img;
}

const UTAN_BILD = new Set(['OPTION', 'TITLE', 'TEXTAREA', 'SCRIPT', 'STYLE']);
const ATTR = ['title', 'aria-label', 'placeholder'];
function bytText(n: Text) {
  const t = n.data;
  SYM_RE.lastIndex = 0;
  if (!SYM_RE.test(t)) return;
  const par = n.parentElement;
  if (!par) return;
  if (UTAN_BILD.has(par.tagName) || par instanceof SVGElement) { const u = symUtan(t); if (u !== t) n.data = u; return; }
  const d = symDelar(t);
  if (d.length === 1 && typeof d[0] === 'string') return;
  const f = document.createDocumentFragment();
  for (const x of d) f.append(typeof x === 'string' ? document.createTextNode(x) : bild(x.id));
  n.replaceWith(f);
}
function bytAttr(el: Element, a: string) {
  const v = el.getAttribute(a);
  if (!v) return;
  SYM_RE.lastIndex = 0;
  if (!SYM_RE.test(v)) return;
  const u = symUtan(v);
  if (u !== v) el.setAttribute(a, u);
}
function ga(rot: Node) {
  if (rot.nodeType === Node.TEXT_NODE) { bytText(rot as Text); return; }
  if (rot.nodeType !== Node.ELEMENT_NODE) return;
  const el = rot as Element;
  for (const a of ATTR) bytAttr(el, a);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), text: Text[] = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) text.push(n as Text);
    else for (const a of ATTR) bytAttr(n as Element, a);
  }
  for (const t of text) bytText(t);
}
// allt som kommer in i sidan efter starten byts när det kommer (innerHTML, textContent och nya tipsrutor)
if (typeof document !== 'undefined') {
  ga(document.body);
  new MutationObserver(lista => {
    for (const r of lista) {
      if (r.type === 'childList') r.addedNodes.forEach(ga);
      else if (r.type === 'characterData') bytText(r.target as Text);
      else if (r.type === 'attributes' && r.attributeName) bytAttr(r.target as Element, r.attributeName);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
}
