// förklaringar går att trycka fram (steg 9.2.68): allt som visar en förklaring när musen hålls över det (title, eller <title> i en
// ritad symbol) visar den också i en liten bubbla vid det man tryckte på, så att den syns i mobilen. Nästa tryck stänger den.
// Ett ställe för hela gränssnittet: dokumentets klick (panel.ts) frågar här först. Med fingret (steg 5.3.7, som låg i trycktips.ts)
// visas förklaringen också för knappar, som samtidigt gör det de annars gör, och bubblan går bort efter TIPS_SEK sekunder

// det som behövs av ett element, så att scenariot kan pröva utan webbläsare
interface El { closest(sel: string): El | null; getAttribute(n: string): string | null; querySelector?(sel: string): { textContent: string | null } | null }

// förklaringen för det man tryckte på: närmaste title, eller texten i en ritad symbols <title>. Inget när trycket öppnar något
// (en knapp, en person, en rad som fälls ut): då är det handen och inte frågetecknet
export const OPPNAR = 'button, a, input, select, textarea, [data-id], [data-hjalp], [data-pdel], [data-sak], [data-fram], [role="button"], .klick';
export function forklaringAv(el: El, aven_knappar = false): { text: string; vid: El } | undefined {
  if (el.closest('#map canvas') || (!aven_knappar && el.closest(OPPNAR))) return undefined;
  const t = el.closest('[title]'), text = t?.getAttribute('title')?.trim();
  if (t && text) return { text, vid: t };
  const svg = el.closest('svg'), st = svg?.querySelector?.(':scope > title')?.textContent?.trim();
  return svg && st ? { text: st, vid: svg } : undefined;
}

const TIPS_SEK = 4;
// trycktes det senast med fingret? Med musen syns förklaringen för en knapp redan när musen hålls över den
let finger = false, slut: number | undefined;
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function')
  document.addEventListener('pointerdown', e => { finger = e.pointerType === 'touch'; }, true);
let bubbla: HTMLDivElement | undefined, vid: string | undefined; // vid = texten som står, så att samma sak stänger också när panelen ritats om
export const bubblaText = () => (bubbla && !bubbla.hidden ? bubbla.textContent : undefined);
// stäng bubblan; true om den var öppen
export function stangBubbla() {
  if (!bubbla || bubbla.hidden) return false;
  bubbla.hidden = true; vid = undefined;
  if (slut !== undefined) clearTimeout(slut);
  slut = undefined;
  return true;
}
// ett tryck: stänger en öppen bubbla, och visar förklaringen för det man tryckte på om det inte var samma sak igen
export function bubblaKlick(el: HTMLElement) {
  const forra = vid, var_oppen = stangBubbla(), f = forklaringAv(el, finger);
  if (!f || (var_oppen && f.text === forra)) return var_oppen;
  bubbla ??= Object.assign(document.body.appendChild(document.createElement('div')), { className: 'bubbla', role: 'tooltip' });
  bubbla.textContent = f.text; bubbla.hidden = false; vid = f.text;
  // vid det man tryckte på: under det, eller över om det inte får plats, och alltid inom skärmen
  const r = (f.vid as HTMLElement).getBoundingClientRect(), b = bubbla.getBoundingClientRect(), m = 6;
  const x = Math.max(m, Math.min(innerWidth - b.width - m, r.left + r.width / 2 - b.width / 2));
  const y = r.bottom + m + b.height <= innerHeight ? r.bottom + m : Math.max(m, r.top - m - b.height);
  bubbla.style.left = `${x}px`; bubbla.style.top = `${y}px`;
  if (finger) slut = window.setTimeout(stangBubbla, TIPS_SEK * 1000);
  return true;
}
