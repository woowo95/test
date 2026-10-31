import { ageOf, anseendeSym, formogenheter, halsa, living, moodOf, taskName, yrkeNamn } from '../../sim';
import { iconImg } from '../../ikoner';
import { LAG, ansTecken, bar, clockTxt, esc, hex, linkify, moodWord, num, prickar, trend } from '../hjalp';
import { s } from '../lage';
import type { Flik } from '../panel';

// alla som bor i byn, äldst först. Varje rad (steg 3.10.5): namnet med yrket och de små symbolerna (ledare, skadad, sjuk,
// väntar barn), åldern, vad hen gör, förmögenheten, anseendet och två mätare: humöret överst och hälsan under
export const folk: Flik = {
  namn: 'Invånare',
  html() {
    const rows = living(s).sort((a, b) => a.born - b.born), form = formogenheter(s).egen;
    return `<ul class="folk">${rows.map(p => {
      const m = moodOf(p, s.now), h = halsa(p), f = Math.round(form.get(p.id) ?? 0), a = anseendeSym(s, p.id);
      const ans = a ? `<span class="ans" title="${a === '😇' ? 'Gott' : a === '😈' ? 'Dåligt' : 'Blandat'} anseende i byn">${ansTecken(a, 12)}</span>` : '';
      const matare = `<span class="matare"><span title="Humör: ${moodWord(m).toLowerCase()}">${bar(m, m < LAG.humor ? 'low' : '', trend(p, 'humor', m))}</span><span title="Hälsa: ${num(h * 100, 0)} %">${bar(h, h < LAG.halsa ? 'low' : 'halsa', trend(p, 'health', h))}</span></span>`;
      return `<li><button class="row" data-id="${p.id}" type="button"><span class="dot" style="background:${hex(p)}"></span><span class="nm">${esc(p.name)}${yrkeNamn(s, p) ? ` <span class="tag">${esc(yrkeNamn(s, p)!)}</span>` : ''}${prickar(p)}</span><span class="age">${Math.floor(ageOf(p, s.now))} år</span><span class="act">${p.task ? taskName(p.task) : '–'}</span><span class="rb"><span class="form" title="Förmögenhet: värdet av allt hen äger, ungefär i arbetstimmar">${iconImg('i_rik', 12)}${f}</span>${ans}${matare}</span></button></li>`;
    }).join('')}</ul>`;
  },
};

// det som hänt i byn, senast först
export const logg: Flik = {
  namn: 'Händelser',
  html: () => `<ol class="logg">${s.log.slice().reverse().slice(0, 150).map(l => `<li class="k-${l.kind}"><span class="when">${clockTxt(l.t)}</span>${linkify(l)}</li>`).join('')}</ol>`,
};
