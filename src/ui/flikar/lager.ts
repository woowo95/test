import { OUT_WEAR, condOf, living, sakNamn, zonesOf } from '../../sim';
import { iconImg } from '../../ikoner';
import { carryTxt, condBar, esc, fmtN, pLink } from '../hjalp';
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
    const what = !z.slag ? '' : z.slag === 'mat' ? 'Här läggs maten. ' : 'Här läggs material och redskap. ';
    return `
    <div class="phead"><div><h2>${esc(z.namn ?? 'Lagret')}</h2><p class="muted">${what}Byn gör lagerplatsen större när den blir full och mindre när den står tom.${zs.length > 1 ? ` Prioritet ${z.prio ?? 0} av ${zs.length}.` : ''}</p></div></div>
    <h3>Stackar</h3>${ps.length ? `<dl class="kv stk">${ps.map(p => `<dt>${iconImg(p.k)}${sakNamn(p.k)}${p.max === 1 ? '' : ` ${fmtN(p.n)} st`}</dt><dd>${condBar(condOf(p))}<span>${Math.round(condOf(p) * 100)} %</span></dd>`).join('')}</dl>` : '<p class="muted">Lagret är tomt.</p>'}
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
    <div class="phead"><div><h2>${mark ? 'På marken' : 'Bredvid lagret'}</h2><p class="muted">${mark ? 'Lades ner av någon som kallades bort till något annat.' : 'Fick inte plats i lagret.'} Slits ${OUT_WEAR} gånger fortare än i lagret.</p></div></div>
    <dl class="kv">${ps.map(p => `<dt>${iconImg(p.k)}${sakNamn(p.k)}${p.max === 1 ? '' : ` ${fmtN(p.n)} st`}</dt><dd>${condBar(condOf(p))}<span>${Math.round(condOf(p) * 100)} %</span></dd>`).join('')}</dl>
    ${who.length ? `<p class="muted">${who.map(p => pLink(p)).join(', ')} är på väg för att bära in det.</p>` : ''}`;
  },
};
