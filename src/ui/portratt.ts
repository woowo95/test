import { KROPP, Person, halsa, ageOf, alive, byId, living, moodOf, taskName } from '../sim';
import { $, LAG, bar, esc, hex, tempBar, trend } from './hjalp';
import { s, ui, vidNyBy } from './lage';

// porträttraden överst på kartan: en knapp per invånare, med mer om personen när musen är över den.
// Ett tryck väljer personen (data-id, fångas i panel.ts), ett dubbeltryck följer hen med kameran
export function stopFollow() { if (ui.follow === undefined) return; ui.follow = undefined; $('followChip').hidden = true; }
function startFollow(id: number) {
  ui.follow = id; const chip = $('followChip'), p = byId(s, id);
  chip.hidden = false; chip.textContent = `Följer ${p?.name ?? ''} ✕`;
}
$('followChip').addEventListener('click', stopFollow);
vidNyBy.push(stopFollow);
const portEls = new Map<number, HTMLButtonElement>();
const shortAct = (p: Person) => p.task ? taskName(p.task) : '–';
export function renderPorts() {
  const row = $('ports'), ppl = living(s).sort((a, b) => a.born - b.born);
  const ids = new Set(ppl.map(p => p.id));
  for (const [id, el] of portEls) if (!ids.has(id)) { el.remove(); portEls.delete(id); }
  ppl.forEach((p, k) => {
    let el = portEls.get(p.id);
    if (!el) {
      el = document.createElement('button'); el.type = 'button'; el.className = 'port'; el.dataset.id = String(p.id);
      el.innerHTML = `<span class="dot"></span><span class="pn"></span><span class="pi"></span><span class="pa"></span>`;
      portEls.set(p.id, el);
    }
    if (row.children[k] !== el) row.insertBefore(el, row.children[k] ?? null);
    const low = p.hunger < LAG.hunger || halsa(p) < KROPP.svag || p.warm < LAG.varmeRad || moodOf(p, s.now) < LAG.olycklig;
    el.classList.toggle('low', low);
    el.setAttribute('aria-pressed', String(ui.selected === p.id));
    (el.children[0] as HTMLElement).style.background = hex(p);
    el.children[1].textContent = p.name;
    el.children[2].textContent = p.tag ?? '';
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
  tip.innerHTML = `<h4>${esc(p.name)}</h4><p class="op">${p.sex === 'k' ? 'Kvinna' : 'Man'}, ${Math.floor(ageOf(p, s.now))} år${p.tag ? ' · ' + esc(p.tag) : ''}</p>
    <p>${shortAct(p)}</p>${p.task?.why ? `<p class="op">${esc(p.task.why)}</p>` : ''}
    <dl><dt>Humör</dt><dd>${bar(m, m < LAG.humor ? 'low' : '', trend(p, 'humor', m))}</dd><dt>Mättnad</dt><dd>${bar(p.hunger, p.hunger < LAG.hunger ? 'low' : '', trend(p, 'hunger', p.hunger))}</dd>
    <dt>Vila</dt><dd>${bar(p.rest, '', trend(p, 'rest', p.rest))}</dd><dt>Hälsa</dt><dd>${bar(halsa(p), halsa(p) < LAG.halsa ? 'low' : '', trend(p, 'health', halsa(p)))}</dd><dt>Temperatur</dt><dd>${tempBar(p.warm, trend(p, 'warm', p.warm))}</dd></dl>
    <p class="op">Klicka för att välja, dubbelklicka för att följa.</p>`;
  const wrap = $('ports').parentElement!.getBoundingClientRect(), r = el.getBoundingClientRect();
  tip.hidden = false;
  tip.style.top = `${r.bottom - wrap.top + 6}px`;
  tip.style.left = `${Math.max(8, Math.min(wrap.width - tip.offsetWidth - 8, r.left - wrap.left))}px`;
}
function hideTip() { tipId = undefined; $('portTip').hidden = true; }
const portOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.port');
$('ports').addEventListener('pointerover', e => { const b = portOf(e); if (b) showTip(Number(b.dataset.id)); });
$('ports').addEventListener('pointerleave', hideTip);
$('ports').addEventListener('dblclick', e => { const b = portOf(e); if (b) startFollow(Number(b.dataset.id)); });
