// Raden överst (steg 5.3.1.2): namnet, tidsstaven med årstiden och nyckeltalen i enkla, platta rutor med en pixelsymbol och
// ett tal, och vågbandet längst ner mot kartan. Björn valde nyckeltalen (2026-11-04): temperaturen och vädret, rikedomen och
// antalet kolonister i byn. Ett nytt nyckeltal är en rad i RUTOR och en ruta med samma id i template.html.
import { AGES, ALDER, VADERLAGE, ageOf, kalender, living, rikedomDelar, temperature, vaderNu, vindFran } from '../sim';
import { tecknet } from '../ikoner';
import { GUI } from '../guibilder';
import { $ } from './hjalp';
import { s, ui } from './lage';
import { renderPanel, visa } from './panel';
import { val as kronikaVal } from './flikar/kronika';
import { harNotiser, notisHtml, notisKlick, notisKnapp, notisTitel, notisVal } from './notiser';

interface Ruta {
  html(t: number): string; // symbolen och talet
  title(t: number): string; // det som syns när musen är över eller när man trycker
  klick?(): void;
  syns?(): boolean; // annars dold (notiserna innan den första kommit)
}
const grader = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)} °C`;
// vindens riktning (steg 6.4.4): en liten pil åt det håll vinden blåser, större i hård vind
const vindPil = (t: number) => {
  const v = vaderNu(s, t), px = Math.round(8 + 8 * v.vind);
  return `<svg width="${px}" height="${px}" viewBox="0 0 8 8" style="transform:rotate(${Math.round(v.rikt * 180 / Math.PI)}deg);vertical-align:middle;shape-rendering:crispEdges" aria-hidden="true"><path d="M0 3h5V1l3 3-3 3V5H0z" fill="currentColor"/></svg>`;
};
const vindText = (t: number) => { const v = vaderNu(s, t); return `${v.vind >= 0.5 ? 'Hård vind' : v.vind > 0 ? 'Blåsigt' : 'Svag vind'} från ${vindFran(v.rikt)}`; };
export const RUTOR: Record<string, Ruta> = {
  // temperaturen och vädret (steg 2.11.1): vädrets symbol och graderna
  calTemp: {
    html: t => `${tecknet('vader_' + vaderNu(s, t).lage, VADERLAGE[vaderNu(s, t).lage].ikon, 16)}${vindPil(t)}${tecknet('sym_termometer', '🌡', 16)} ${grader(Math.round(temperature(s, t)))}`,
    title: t => { const v = VADERLAGE[vaderNu(s, t).lage]; return `${v.namn}, ${grader(Math.round(temperature(s, t)))}. ${v.text}\n${vindText(t)}.`; },
  },
  // byns rikedom (varde.ts); ett tryck öppnar förrådet (panel.ts, steg 5.3.3.4)
  calRik: {
    html: () => { const r = rikedomDelar(s); return `${tecknet('sym_vag', '⚖', 16)} ${Math.round(r.forrad + r.redskap + r.hus)}`; },
    title: () => {
      const r = rikedomDelar(s), sum = r.forrad + r.redskap + r.hus, a = s.delning?.andel ?? 0;
      return `Byns rikedom: ${Math.round(sum)} (ungefär arbetstimmar). Tryck för att öppna förrådet\nFörrådet ${Math.round(r.forrad)} · redskapen ${Math.round(r.redskap)} · husen ${Math.round(r.hus)}\n${a > 0 ? `${Math.round(a * 100)} % av det folk skaffar går till byn` : 'Byn är så rik att folk behåller det de skaffar'}`;
    },
  },
  // kolonisterna i byn; porträttraden längst ner är listan över folket (steg 6.9.15), och ett tryck här öppnar graferna i Krönikan
  calFolk: {
    html: () => `${tecknet('sym_folk', '👥', 16)} ${living(s).length}`,
    title: t => { const f = living(s), barn = f.filter(p => ageOf(p, t) < ALDER.vuxen).length; return `${f.length} i byn${barn ? `, varav ${barn} barn` : ''}. Tryck för att se graferna`; },
    klick: () => { if (ui.hoger === 'kronika' && kronikaVal.visning === 'grafer') { ui.hoger = undefined; renderPanel(true); } else { kronikaVal.visning = 'grafer'; visa('kronika'); } },
  },
  // notiserna (steg 5.4.3.2, ui/notiser.ts): brevet med antalet olästa; ett tryck öppnar genomgången under raden
  calNotis: { html: notisKnapp, title: notisTitel, syns: harNotiser, klick: () => { notisKlick('oppna'); renderPanel(true); } },
};
for (const [id, r] of Object.entries(RUTOR)) if (r.klick) $(id).addEventListener('click', r.klick);

// tidsstaven: en ruta per dag i tidsåldern, fylld fram till i dag, efter årstidens namn
function stav(t: number) {
  const k = kalender(s, t);
  return `<span class="stavnamn">${AGES[k.ai]}</span><span class="stav" aria-hidden="true">${Array.from({ length: k.av }, (_, i) => `<i class="${i < k.dag ? 'f' : ''}${i === k.dag - 1 ? ' nu' : ''}"></i>`).join('')}</span>`;
}
const skriv = (el: HTMLElement, html: string) => { if (el.dataset.v !== html) { el.innerHTML = html; el.dataset.v = html; } };
export function renderRaden(t = ui.nu) {
  const k = kalender(s, t), age = $('calAge');
  skriv(age, stav(t));
  age.title = `${AGES[k.ai]}, dag ${k.dag} av ${k.av}`;
  age.setAttribute('aria-label', age.title);
  for (const [id, r] of Object.entries(RUTOR)) { const el = $(id); el.hidden = r.syns ? !r.syns() : false; skriv(el, r.html(t)); el.title = r.title(t); }
  const ruta = $('notisRuta'), oppen = notisVal.oppen && harNotiser();
  ruta.hidden = !oppen; $('calNotis').setAttribute('aria-expanded', String(oppen));
  if (oppen) skriv(ruta, notisHtml());
}

// vågbandet (Björns ja till g_vag): rutan på 8 × 7 punkter upprepas över hela bredden, i hel skala, på grundens beige
{
  const V = GUI.vag, c = document.createElement('canvas'); c.width = V.w; c.height = V.h;
  const g = c.getContext('2d')!;
  g.fillStyle = V.bg; g.fillRect(0, 0, V.w, V.h);
  V.rader.forEach((rad, y) => [...rad].forEach((k, x) => { const f = V.pal[k]; if (f) { g.fillStyle = f; g.fillRect(x, y, 1, 1); } }));
  const rot = document.documentElement.style;
  rot.setProperty('--vag', `url(${c.toDataURL()})`); rot.setProperty('--vag-h', `${V.h}px`);
}
