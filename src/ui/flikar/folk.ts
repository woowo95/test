import { ageOf, living, moodOf, taskName, timeLabel } from '../../sim';
import { bar, esc, hex, linkify, sickNow, trend } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// alla som bor i byn, äldst först
export const folk: Flik = {
  namn: 'Invånare',
  html() {
    const rows = living(s).slice().sort((a, b) => b.born < a.born ? 1 : -1).sort((a, b) => ageOf(b, s.now) - ageOf(a, s.now));
    return `<ul class="folk">${rows.map(p => {
      const m = moodOf(p, s.now);
      return `<li><button class="row" data-id="${p.id}" type="button"><span class="dot" style="background:${hex(p)}"></span><span class="nm">${esc(p.name)}${p.tag ? ` <span class="tag">${esc(p.tag)}</span>` : ''}${sickNow(p) ? ` <span class="tag sjuk">sjuk</span>` : ''}</span><span class="age">${Math.floor(ageOf(p, s.now))} år</span><span class="act">${p.task ? taskName(p.task) : '–'}</span><span class="rb">${bar(m, m < 0.35 ? 'low' : '', trend(p, 'humor', m))}</span></button></li>`;
    }).join('')}</ul>`;
  },
};

// det som hänt i byn, senast först
export const logg: Flik = {
  namn: 'Händelser',
  html: () => `<ol class="logg">${s.log.slice().reverse().slice(0, 150).map(l => `<li class="k-${l.kind}"><span class="when">${timeLabel(s, l.t)}</span>${linkify(l)}</li>`).join('')}</ol>`,
};
