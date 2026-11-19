// redogörelsen för en resa (steg 11.5.13): öppnas med knappen vid raden i Händelser eller i notisen (resaKnapp i hjalp.ts), som
// framträdandet (fram.ts). Allt läses ur sällskapet som kommit hem (redogorelseAv i sim/resa.ts): vilka som reste, dagboken med
// varje händelse i den ordning de skedde och en ruta för hur bytet delades. Symbolerna först; texten kommer fram när man håller
// över raden
import { DAGBOK, RESA, SAKER, redogorelseAv, type Agare, type Redogorelse } from '../../sim';
import { clockTxt, esc, vemLank } from '../hjalp';
import { s, ui } from '../lage';
import { notisVal } from '../notiser';
import type { Flik } from '../panel';

export const resa: Flik = {
  namn: 'Resan', knapp: 'person', html: () => resaHtml(redogorelseAv(s, ui.resaNr)),
  klick(el) {
    const b = el.closest<HTMLElement>('[data-resa]');
    if (!b) return false;
    ui.resaNr = Number(b.dataset.resa); ui.tab = 'resa'; notisVal.oppen = false;
    return true;
  },
};

const namn = (id: number) => s.people.find(p => p.id === id)?.name ?? 'någon';
const vem = (a: Agare) => a === 'by' ? 'Byn' : vemLank(a, namn(a));
const sak = (k: string, n: number) => `${n} ${esc((SAKER[k]?.namn ?? k).toLowerCase())}`;

export function resaHtml(r?: Redogorelse) {
  if (!r) return '<p class="muted">Resan är glömd.</p>';
  const huvud = `<h2>🎒 ${esc(r.titel)}</h2><p class="muted">${esc(clockTxt(r.borjan))} till ${esc(clockTxt(r.hem))}</p>`;
  const folk = `<ul class="fame">${r.medl.map(id => `<li title="${id === r.ledare ? 'Ledde resan' : 'Följde med'}">${id === r.ledare ? '⭐' : '🚶'} ${vemLank(id, namn(id))}</li>`).join('')}</ul>`;
  const bok = `<h3>Dagboken</h3><ul class="fame">${r.dagbok.map(([t, text, slag]) => {
    const d = slag ? DAGBOK[slag] : undefined;
    return `<li title="${esc(`${d?.namn ?? ''} ${clockTxt(t)}`)}">${d?.sym ?? '·'} ${esc(text)}</li>`;
  }).join('')}</ul>`;
  const d = r.delning;
  if (!d) return huvud + folk + bok;
  const rad = (l: [Agare, string, number][]) => l.length ? l.map(([a, k, n]) => `<li>${vem(a)}: ${sak(k, n)}</li>`).join('') : '<li class="muted">Inget</li>';
  const delning = `<h3>Hur bytet delades</h3>
    <ul class="fame"><li title="Värdet av det sällskapet hade med sig hem, utöver insatserna">💰 Bytet ${Math.round(d.varde)}</li><li title="Värdet av det som satsades och gick åt">{sym_pil_ned} Gått åt ${Math.round(d.gatt)}</li><li title="Bytet minus det som gått åt">${d.vinst >= 0 ? '{sym_pil_upp}' : '{sym_pil_ned}'} Vinst ${Math.round(d.vinst)}</li></ul>
    <h3>Tillbaka till ägarna</h3><ul class="fame">${rad(d.tillbaka)}</ul>
    <h3>Bytet</h3><ul class="fame">${rad(d.byte)}</ul>
    <h3>Andelarna</h3><ul class="fame">${d.andelar.map(([a, n]) => `<li title="${esc(`Andelar (en per resenär och en per ${RESA.andelVarde} i värde som satsats) och fordran: det som gått åt av insatsen plus delen av vinsten`)}">${vem(a)}: ${n} ${n === 1 ? 'andel' : 'andelar'}, fordran ${Math.round(d.fordran.find(f => f[0] === a)?.[1] ?? 0)}</li>`).join('')}</ul>`;
  return huvud + folk + bok + delning;
}
