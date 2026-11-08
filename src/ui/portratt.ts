import { KROPP, Person, halsa, ageOf, alive, byId, living, moodOf, taskName, yrkeNamn } from '../sim';
import { $, LAG, bar, esc, tempBar, trend } from './hjalp';
import { s, ui, uppgiftVid, vidNyBy } from './lage';
import { figurSvg, portrattImg, portrattUrl } from './folkbild';
import { skapad } from './utseende';
import { bytesNu } from './jakt';

// porträttraden överst på kartan: en knapp per invånare, med mer om personen när musen är över den.
// Ett tryck väljer personen (data-id, fångas i panel.ts), ett dubbeltryck följer hen med kameran
export function stopFollow() { if (ui.follow === undefined) return; ui.follow = undefined; $('followChip').hidden = true; }
// en bybo, eller en gäst med sitt namn (rövaren i testläget, steg 6.6.12: id under noll, ui/gaster.ts)
export function startFollow(id: number, namn?: string) {
  ui.follow = id; const chip = $('followChip'), p = id > 0 ? byId(s, id) : undefined;
  chip.hidden = false; chip.textContent = `Följer ${namn ?? p?.name ?? ''} ✕`;
}
$('followChip').addEventListener('click', stopFollow);
vidNyBy.push(stopFollow);
const portEls = new Map<number, HTMLButtonElement>();
const shortAct = (p: Person) => { const b = bytesNu(p); if (b) return b.split(':')[0]; const t = uppgiftVid(p); return t ? taskName(t) : '–'; }; // den som byter visar det (steg 9.2.46) // vid tiden som visas (steg 4.5.6.5)
export function renderPorts() {
  const row = $('ports'), ppl = living(s).sort((a, b) => a.born - b.born);
  const ids = new Set(ppl.map(p => p.id));
  for (const [id, el] of portEls) if (!ids.has(id)) { el.remove(); portEls.delete(id); }
  ppl.forEach((p, k) => {
    let el = portEls.get(p.id);
    if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'port'; el.dataset.id = String(p.id);
      el.innerHTML = `<img class="pf" alt="" width="64" height="64"><span class="pn"></span><span class="pi"></span><span class="pa"></span>`;
      portEls.set(p.id, el);
    }
    if (row.children[k] !== el) row.insertBefore(el, row.children[k] ?? null);
    const low = p.hunger < LAG.hunger || halsa(p) < KROPP.svag || p.warm < LAG.varmeRad || moodOf(p, s.now) < LAG.olycklig;
    el.classList.toggle('low', low);
    el.setAttribute('aria-pressed', String(ui.selected === p.id));
    const img = el.children[0] as HTMLImageElement, u = portrattUrl(skapad(s, p));
    if (img.getAttribute('src') !== u) img.src = u; // bara när porträttet ändrats (steg 5.2.3.2)
    el.children[1].textContent = p.name;
    el.children[2].textContent = yrkeNamn(s, p) ?? '';
    el.children[3].textContent = shortAct(p);
  });
  if (tipId !== undefined) showTip(tipId);
}
let tipId: number | undefined;
function showTip(id: number) {
  const p = byId(s, id), el = portEls.get(id), tip = $('portTip');
  if (!p || !el || !alive(p)) { hideTip(); return; }
  tipId = id;
  const m = moodOf(p, s.now);
  tip.innerHTML = `<div class="tiphead">${portrattImg(skapad(s, p), 'big')}<h4>${esc(p.name)}</h4>${figurSvg(skapad(s, p), 'kortfigur', 'Figuren')}</div><p class="op">${p.sex === 'k' ? 'Kvinna' : 'Man'}, ${Math.floor(ageOf(p, s.now))} år${yrkeNamn(s, p) ? ' · ' + esc(yrkeNamn(s, p)!) : ''}</p>
    <p>${shortAct(p)}</p>${p.task?.why ? `<p class="op">${esc(p.task.why)}</p>` : ''}
    <dl><dt>Humör</dt><dd>${bar(m, m < LAG.humor ? 'low' : '', trend(p, 'humor', m))}</dd><dt>Mättnad</dt><dd>${bar(p.hunger, p.hunger < LAG.hunger ? 'low' : '', trend(p, 'hunger', p.hunger))}</dd>
    <dt>Vila</dt><dd>${bar(p.rest, '', trend(p, 'rest', p.rest))}</dd><dt>Hälsa</dt><dd>${bar(halsa(p), halsa(p) < LAG.halsa ? 'low' : '', trend(p, 'health', halsa(p)))}</dd><dt>Temperatur</dt><dd>${tempBar(p.warm, trend(p, 'warm', p.warm))}</dd></dl>
    <p class="op">Klicka för att välja, dubbelklicka för att följa.</p>`;
  const wrap = $('ports').parentElement!.getBoundingClientRect(), r = el.getBoundingClientRect();
  tip.hidden = false;
  tip.style.top = `${Math.max(8, r.top - wrap.top - tip.offsetHeight - 6)}px`; // ovanför raden, som står längst ner (steg 5.3.3.4)
  tip.style.left = `${Math.max(8, Math.min(wrap.width - tip.offsetWidth - 8, r.left - wrap.left))}px`;
}
function hideTip() { tipId = undefined; $('portTip').hidden = true; }
const portOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.port');
$('ports').addEventListener('pointerover', e => { const b = portOf(e); if (b) showTip(Number(b.dataset.id)); });
$('ports').addEventListener('pointerleave', hideTip);
// porträttraden går att scrolla (steg 6.8.13): hjulet uppåt och nedåt flyttar raden i sidled när den inte får plats
$('ports').addEventListener('wheel', e => { const el = $('ports'); if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; e.preventDefault(); el.scrollLeft += e.deltaY; hideTip(); }, { passive: false });
$('ports').addEventListener('dblclick', e => { const b = portOf(e); if (b) startFollow(Number(b.dataset.id)); });
