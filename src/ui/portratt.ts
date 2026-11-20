import { Person, halsa, ageOf, alive, byId, living, moodOf, taskName, yrkeNamn } from '../sim';
import { $, LAG, bar, esc, lagstBehov, tempBar, trend } from './hjalp';
import { s, ui, uppgiftVid, vidNyBy } from './lage';
import { figurSvg, portrattImg, portrattUrl } from './folkbild';
import { skapad } from './utseende';
import { bytesNu } from './jakt';
import { iconImg } from '../ikoner';

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
      el.innerHTML = `<img class="pf" alt="" width="64" height="64"><span class="pn"></span><span class="pa"></span><span class="pbehov"></span>`;
      portEls.set(p.id, el);
    }
    if (row.children[k] !== el) row.insertBefore(el, row.children[k] ?? null);
    const lag = lagstBehov(p), lagK = lag?.ikon ?? '', pb = el.children[3] as HTMLElement;
    el.classList.toggle('low', !!lag);
    if (pb.dataset.k !== lagK) { pb.dataset.k = lagK; pb.innerHTML = lag ? iconImg(lag.ikon, 16) : ''; pb.title = lag?.namn ?? ''; }
    el.setAttribute('aria-pressed', String(ui.selected === p.id));
    const img = el.children[0] as HTMLImageElement, u = portrattUrl(skapad(s, p));
    if (img.getAttribute('src') !== u) img.src = u; // bara när porträttet ändrats (steg 5.2.3.2)
    el.children[1].textContent = p.name;
    el.children[2].textContent = shortAct(p); // yrket står i rutan när man håller musen över kortet (steg 10.2.53)
  });
  if (tipId !== undefined) showTip(tipId);
}
let tipId: number | undefined;
function showTip(id: number) {
  const p = byId(s, id), el = portEls.get(id), tip = $('portTip');
  if (!p || !el || !alive(p)) { hideTip(); return; }
  tipId = id;
  const m = moodOf(p, s.now), why = uppgiftVid(p)?.why, lagst = lagstBehov(p), h = halsa(p); // skälet ur samma uppgift som den som syns
  tip.innerHTML = `<div class="tiphead">${portrattImg(skapad(s, p), 'big')}<h4>${esc(p.name)}</h4>${figurSvg(skapad(s, p), 'kortfigur', 'Figuren')}</div><p class="op">${p.sex === 'k' ? 'Kvinna' : 'Man'}, ${Math.floor(ageOf(p, s.now))} år${yrkeNamn(s, p) ? ' · ' + esc(yrkeNamn(s, p)!) : ''}</p>
    <p>${shortAct(p)}</p>${why ? `<p class="op">${esc(why)}</p>` : ''}
    <dl><dt>Humör</dt><dd>${bar(m, m < LAG.olycklig ? 'low' : '', trend(p, 'humor', m))}</dd><dt>Mättnad</dt><dd>${bar(p.hunger, p.hunger < LAG.hunger ? 'low' : '', trend(p, 'hunger', p.hunger))}</dd>
    <dt>Vila</dt><dd>${bar(p.rest, '', trend(p, 'rest', p.rest))}</dd><dt>Hälsa</dt><dd>${bar(h, h < LAG.halsa ? 'low' : '', trend(p, 'health', h))}</dd><dt>Temperatur</dt><dd>${tempBar(p.warm, trend(p, 'warm', p.warm))}</dd></dl>
    ${lagst ? `<p class="op">Lägst just nu: ${esc(lagst.namn.toLowerCase())}</p>` : ''}<p class="op">Tryck för att välja. Ögat i rutan följer.</p>`;
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
