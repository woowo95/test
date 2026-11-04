import { GUI } from '../guibilder';

// Ramen och hörnen på panelerna (steg 5.3.1.4): Björns val Ormen ur bildstilen (src/guibilder.ts). Hörnet är ritat
// för det övre vänstra hörnet och speglas till de andra tre; det sticker ut utanför ramen. Ramen själv (kol, grått, kol
// på sidorna och kol överst och nederst, som i bilden) står i template.html (.panel). En punkt i bilden är en punkt på skärmen.
const H = GUI.horn;
const HORN = ['tv', 'th', 'nv', 'nh'] as const;
function hornUrl(speglaX: boolean, speglaY: boolean) {
  const c = document.createElement('canvas'); c.width = H.w; c.height = H.h;
  const g = c.getContext('2d')!;
  H.rader.forEach((rad, y) => [...rad].forEach((k, x) => {
    const f = H.pal[k]; if (!f) return;
    g.fillStyle = f; g.fillRect(speglaX ? H.w - 1 - x : x, speglaY ? H.h - 1 - y : y, 1, 1);
  }));
  return c.toDataURL();
}
const rot = document.documentElement.style;
for (const h of HORN) rot.setProperty(`--horn-${h}`, `url(${hornUrl(h[1] === 'h', h[0] === 'n')})`);
rot.setProperty('--horn-w', `${H.w}px`); rot.setProperty('--horn-h', `${H.h}px`);
rot.setProperty('--horn-x', `${H.kant.x}px`); rot.setProperty('--horn-y', `${H.kant.y}px`);
for (const p of document.querySelectorAll<HTMLElement>('.panel'))
  p.insertAdjacentHTML('beforeend', HORN.map(h => `<i class="horn ${h}" aria-hidden="true"></i>`).join(''));
