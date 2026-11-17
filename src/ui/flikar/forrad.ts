import { FOLDERS, amountOf, grundvarde, isTool, kortTal, ownedSum, rikedomDelar, sakNamn, wornOf } from '../../sim';
import { iconImg, tecknet } from '../../ikoner';
import { esc, hjalpOppen } from '../hjalp';
import { piles, s } from '../lage';
import type { Flik } from '../panel';

// Förrådet som en flik utan runsten (steg 11.1.6): rikedomen i sidhuvudet öppnar och stänger den, på datorn och i mobilen, och
// rubriken i spalten till vänster på datorn öppnar den också. Allt byn har i förrådet, i samma mappar som spalten (FOLDERS):
// symbolen, namnet, hur mycket och hur mycket av det som är invånarnas egna. Ett tryck på en rad öppnar saken (sak.ts)
const antal = (k: string, n: number) => isTool(k) ? Math.ceil(n - 1e-9) : Math.max(1, Math.round(n));
export const forradRader = () => FOLDERS.map(f => ({ f, ks: f.k.map(k => ({ k, n: amountOf(s, k) })).filter(r => r.n >= (isTool(r.k) ? 1e-6 : 0.5)) })).filter(r => r.ks.length);
function forradHtml() {
  const rows = forradRader(), ute = piles().filter(p => !p.stored), r = rikedomDelar(s);
  const rik = `<p class="small" title="${esc(`Byns rikedom (ungefär arbetstimmar): förrådet ${Math.round(r.forrad)}, redskapen ${Math.round(r.redskap)}, husen ${Math.round(r.hus)}`)}">${tecknet('sym_vag', '⚖', 14)} ${Math.round(r.forrad + r.redskap + r.hus)}</p>`;
  const mappar = rows.map(({ f, ks }) => {
    const id = `forrad-${f.namn}`, ut = !hjalpOppen(id); // mapparna är utfällda från början; ett tryck fäller ihop
    const sum = f.summa ? ` <span class="muted">${Math.round(ks.reduce((a, q) => a + q.n, 0))}</span>` : '';
    const lista = ks.map(q => {
      const eg = Math.min(q.n, ownedSum(s, q.k)), v = grundvarde(q.k);
      const t = `${sakNamn(q.k)}${eg >= 0.5 ? `: byns ${Math.round(q.n - eg)}, invånarnas egna ${Math.round(eg)}` : ''}${v ? `. ⚖ ${kortTal(v)} styck, ${kortTal(wornOf(s, q.k) * v)} allt efter skicket` : ''}`;
      return `<li class="klick" data-sak="k:${q.k}" title="${esc(t)}" tabindex="0" role="button">${iconImg(q.k)}<span>${esc(sakNamn(q.k))}</span><span class="n">${antal(q.k, q.n)}</span></li>`;
    }).join('');
    return `<h3 class="klick falla" data-hjalp="${id}" aria-expanded="${ut}" tabindex="0" role="button">${esc(f.namn)}${sum}</h3>${ut ? `<ul class="forradlista">${lista}</ul>` : ''}`;
  }).join('');
  return `${rik}${mappar || '<p class="muted">Förrådet är tomt.</p>'}${ute.length ? `<p class="muted">${ute.length} ${ute.length === 1 ? 'hög' : 'högar'} på marken</p>` : ''}`;
}
export const forrad: Flik = { namn: 'Förrådet', knapp: 'rikedom', band: () => 'forrad', html: forradHtml };
