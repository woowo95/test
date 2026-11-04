// Kartan över tid (steg 5.4.5.2): bilderna av kartan som sparas en gång per dygn (ett år i spelet, sim/kartminne.ts) visas
// i krönikan under filtret Kartan. Man drar i reglaget fram och tillbaka genom åren och ser skogen, stigarna, fälten och
// husen växa fram, utan folk. Bara utseende: spelet läser det aldrig. En ny sorts ruta är en rad i KARTRUTA och en färg här.
import { AGES, H, KARTRUTA, W, kalender, kartrutor, lasKarta, packaKarta } from '../sim';
import { farg } from '../palett';
import { s } from './lage';

// färgen per ruta, i bildstilens palett (ramp och ton)
export const KARTFARG: Record<string, string> = {
  vatten: farg('skiffer', 1), sand: farg('ben', 2), sten: farg('kol', 2), lera: farg('jord', 2),
  skog: farg('barr', 0), ung: farg('barr', 1), hog: farg('oliv', 1), kort: farg('oliv', 2), bar: farg('jord', 3),
  falt: farg('senap', 1), golv: farg('jord', 1), vagg: farg('jord', 0), station: farg('ben', 3), eld: farg('rost', 2),
};
const FARG_K: Record<string, string> = Object.fromEntries(KARTRUTA.map(r => [r.k, KARTFARG[r.id]]));

// bilderna: de sparade och sist kartan som den är nu
export function kartbilder(): { t: number; p: string }[] {
  const b = (s.hist?.kartor ?? []).map(([t, p]) => ({ t, p }));
  b.push({ t: s.now, p: packaKarta(kartrutor(s)) });
  return b;
}
export const kartNamn = (t: number, nu = false) => { const k = kalender(s, t); return `År ${k.ar}, ${AGES[k.ai].toLowerCase()}${nu ? ' (nu)' : ''}`; };
// en bild som en data-URL (en punkt per ruta, skalad i CSS utan utjämning); utan webbläsare (scenarierna) en tom sträng
const cache = new Map<string, string>();
export function kartUrl(p: string) {
  if (typeof document === 'undefined') return '';
  let u = cache.get(p);
  if (!u) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d')!, r = lasKarta(p), im = g.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const f = parseInt((FARG_K[r[i]] ?? '#000000').slice(1), 16); im.data.set([f >> 16, (f >> 8) & 255, f & 255, 255], i * 4); }
    g.putImageData(im, 0, 0); u = c.toDataURL();
    if (cache.size > 60) cache.clear();
    cache.set(p, u);
  }
  return u;
}
let valt: number | undefined; // vilken bild som visas (undefined = nu)
export function kartminneHtml() {
  const b = kartbilder(), i = valt === undefined || valt >= b.length ? b.length - 1 : valt, nu = i === b.length - 1;
  return `<div class="kartminne"><img id="kmBild" src="${kartUrl(b[i].p)}" alt="Kartan ${kartNamn(b[i].t, nu)}" width="${W}" height="${H}">
    <input id="kmReglage" type="range" min="0" max="${b.length - 1}" value="${i}" aria-label="Året" title="Dra för att se kartan år för år">
    <p class="muted" id="kmNamn">${kartNamn(b[i].t, nu)}</p>
    <details><summary class="muted">Färgerna</summary><p class="kmFarger">${KARTRUTA.map(r => `<span><i style="background:${KARTFARG[r.id]}"></i>${r.namn}</span>`).join('')}</p></details></div>`;
}
// reglaget byter bild utan att panelen ritas om
if (typeof document !== 'undefined') document.addEventListener('input', e => {
  const el = e.target as HTMLInputElement;
  if (el.id !== 'kmReglage') return;
  const b = kartbilder(), i = Math.min(b.length - 1, Number(el.value)), nu = i === b.length - 1;
  valt = nu ? undefined : i;
  const img = document.getElementById('kmBild') as HTMLImageElement | null, n = document.getElementById('kmNamn');
  if (img) { img.src = kartUrl(b[i].p); img.alt = `Kartan ${kartNamn(b[i].t, nu)}`; }
  if (n) n.textContent = kartNamn(b[i].t, nu);
});
