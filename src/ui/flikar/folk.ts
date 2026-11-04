import { type Person, ageOf, anseendeSym, formogenheter, halsa, living, moodOf, taskName, yrkeNamn } from '../../sim';
import { iconImg } from '../../ikoner';
import { LAG, ansTecken, bar, clockTxt, esc, linkify, moodWord, num, prickar, trend } from '../hjalp';
import { s, uppgiftVid } from '../lage';
import type { Flik } from '../panel';
import { portrattImg } from '../folkbild';
import { skapad } from '../utseende';

// Folket (steg 5.3.3.4): alla som bor i byn, samma lista som porträttraden men större och sorterbar. Varje rad (steg 3.10.5):
// namnet med yrket och de små symbolerna (ledare, skadad, sjuk, väntar barn), åldern, vad hen gör, förmögenheten, anseendet
// och två mätare: humöret överst och hälsan under. Registret SORT: vad listan kan sorteras efter (tryck igen = omvänt)
interface Sort { id: string; tecken: string; namn: string; v(p: Person, form: Map<number, number>): number | string }
const SORT: Sort[] = [
  { id: 'alder', tecken: '🕓', namn: 'Ålder', v: p => p.born },
  { id: 'namn', tecken: '🪪', namn: 'Namn', v: p => p.name },
  { id: 'gor', tecken: '🚶', namn: 'Vad hen gör', v: p => (t => t ? taskName(t) : '~')(uppgiftVid(p)) },
  { id: 'humor', tecken: '😊', namn: 'Humör', v: p => moodOf(p, s.now) },
  { id: 'halsa', tecken: '❤️', namn: 'Hälsa', v: p => halsa(p) },
  { id: 'form', tecken: '💰', namn: 'Förmögenhet', v: (p, f) => -(f.get(p.id) ?? 0) },
];
let sortId = 'alder', omvant = false;
export const folk: Flik = {
  namn: 'Folket',
  html() {
    const form = formogenheter(s).egen, so = SORT.find(x => x.id === sortId)!;
    const rows = living(s).sort((a, b) => { const x = so.v(a, form), y = so.v(b, form); return (typeof x === 'string' ? x.localeCompare(y as string, 'sv') : x - (y as number)) * (omvant ? -1 : 1) || a.born - b.born; });
    const knappar = `<div class="pdelar sortrad" role="toolbar" aria-label="Sortera efter">${SORT.map(x => `<button type="button" data-fsort="${x.id}" aria-pressed="${x.id === sortId}" title="Sortera efter ${x.namn.toLowerCase()}${x.id === sortId ? (omvant ? ' (omvänt)' : '') : ''}" aria-label="${x.namn}">${x.tecken}${x.id === sortId ? `<span class="pil">${omvant ? '▲' : '▼'}</span>` : ''}</button>`).join('')}</div>`;
    return `${knappar}<ul class="folk">${rows.map(p => {
      const m = moodOf(p, s.now), h = halsa(p), f = Math.round(form.get(p.id) ?? 0), a = anseendeSym(s, p.id);
      const ans = a ? `<span class="ans" title="${a === '😇' ? 'Gott' : a === '😈' ? 'Dåligt' : 'Blandat'} anseende i byn">${ansTecken(a, 12)}</span>` : '';
      const matare = `<span class="matare"><span title="Humör: ${moodWord(m).toLowerCase()}">${bar(m, m < LAG.humor ? 'low' : '', trend(p, 'humor', m))}</span><span title="Hälsa: ${num(h * 100, 0)} %">${bar(h, h < LAG.halsa ? 'low' : 'halsa', trend(p, 'health', h))}</span></span>`;
      return `<li><button class="row" data-id="${p.id}" type="button">${portrattImg(skapad(s, p), "")}<span class="nm">${esc(p.name)}${yrkeNamn(s, p) ? ` <span class="tag">${esc(yrkeNamn(s, p)!)}</span>` : ''}${prickar(p)}</span><span class="age">${Math.floor(ageOf(p, s.now))} år</span><span class="act">${(t => t ? taskName(t) : '–')(uppgiftVid(p))}</span><span class="rb"><span class="form" title="Förmögenhet: värdet av allt hen äger, ungefär i arbetstimmar">${iconImg('i_rik', 12)}${f}</span>${ans}${matare}</span></button></li>`;
    }).join('')}</ul>`;
  },
  klick(el) {
    const b = el.closest<HTMLElement>('[data-fsort]');
    if (!b) return false;
    if (sortId === b.dataset.fsort) omvant = !omvant; else { sortId = b.dataset.fsort!; omvant = false; }
    return true;
  },
};

// det som hänt i byn, senast först
export const logg: Flik = {
  namn: 'Händelser',
  html: () => `<ol class="logg">${s.log.slice().reverse().slice(0, 150).map(l => `<li class="k-${l.kind}"><span class="when">${clockTxt(l.t)}</span>${linkify(l)}</li>`).join('')}</ol>`,
};
