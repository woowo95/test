import { LAGER, condOf, living, sakNamn, zonesOf } from '../../sim';
import { carryTxt, condBar, esc, hjalpKnapp, hjalpText, pLink, pileTxt } from '../hjalp';
import { outPilesAt, piles, s, ui } from '../lage';
import type { Flik } from '../panel';

// en lagerplats: öppnas genom att trycka på den på kartan. Varje stack för sig, med sitt skick
export const lager: Flik = {
  namn: 'Lagret',
  knapp: 'person',
  html() {
    const zs = zonesOf(s), z = zs[Math.min(ui.lagerNr, zs.length - 1)], zi = zs.indexOf(z);
    const ps = piles().filter(p => p.zone === zi).sort((a, b) => sakNamn(a.k).localeCompare(sakNamn(b.k), 'sv') || b.n - a.n || condOf(b) - condOf(a));
    const barare = living(s).filter(p => p.task && (p.task.carry > 0.05 || p.task.items));
    // turordningen: byn lägger saker i lagerplatsen med högst prio först (lager.ts)
    const nr = zs.map((q, i) => ({ q, i })).sort((a, b) => (b.q.prio ?? 0) - (a.q.prio ?? 0)).findIndex(x => x.i === zi) + 1;
    const what = !z.slag ? '' : z.slag === 'mat' ? 'Här läggs maten. ' : 'Här läggs material och redskap. ';
    const vaxer = z.hus !== undefined ? 'Golvet i ett förrådshus: det växer inte och krymper inte.' : 'Byn gör lagerplatsen större när den blir full och mindre när den står tom.';
    return `
    <div class="phead"><div><h2>${esc(z.namn ?? 'Lagret')}</h2></div>${hjalpKnapp('lager', 'Hur fungerar lagret?')}</div>
    ${hjalpText('lager', `<p class="muted small">${what}${vaxer}${zs.length > 1 ? ` Byn lägger saker här som nummer ${nr} av ${zs.length} lagerplatser.` : ''}</p>`)}
    <h3>Stackar</h3>${ps.length ? `<dl class="kv stk">${ps.map(p => `<dt>${pileTxt(p)}</dt><dd>${condBar(condOf(p))}<span>${Math.round(condOf(p) * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Lagret är tomt.</p>'}
    <h3>På väg med saker</h3>${barare.length ? `<ul class="rels">${barare.map(p => `<li>${pLink(p)}<span class="muted">${esc(carryTxt(p))}</span></li>`).join('')}</ul>` : '<p class="muted">Ingen bär något just nu.</p>'}`;
  },
};

// en hög utanför lagerplatserna: öppnas genom att trycka på den på kartan
export const hog: Flik = {
  namn: 'Högen',
  knapp: 'person',
  html() {
    const at = ui.hogAt, ps = outPilesAt(at.x, at.y), mark = ps.some(p => !p.stored);
    if (!ps.length) return '<p class="muted">Här ligger inget längre.</p>';
    const who = living(s).filter(p => p.task?.act === 'bara' && Math.floor(p.task.tx) === at.x && Math.floor(p.task.ty) === at.y);
    return `
    <div class="phead"><div><h2>${mark ? 'På marken' : 'Bredvid lagret'}</h2></div>${hjalpKnapp('hog', 'Varför ligger det här?')}</div>
    ${hjalpText('hog', `<p class="muted small">${mark ? 'Lades ner av någon som kallades bort till något annat.' : 'Fick inte plats i lagret.'} Slits ${LAGER.ute} gånger fortare än i lagret.</p>`)}
    <dl class="kv">${ps.map(p => `<dt>${pileTxt(p)}</dt><dd>${condBar(condOf(p))}<span>${Math.round(condOf(p) * 100)} %</span></dd>`).join('')}</dl>
    ${who.length ? `<p class="muted">${who.map(p => pLink(p)).join(', ')} är på väg för att bära in det.</p>` : ''}`;
  },
};
