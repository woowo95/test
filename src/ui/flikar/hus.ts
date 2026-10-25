import { KOM, bitsOf, byId, gridOf, housesOf, insulation, komOf, sakNamn } from '../../sim';
import { iconImg } from '../../ikoner';
import { esc, fmtN, pLink } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// var materialet kom ifrån (bygg.ts): en symbol per sätt, förklaringen när musen är över
const HUR: Record<typeof KOM[number], { ikon: string; namn: string }> = {
  byn: { ikon: '🏘️', namn: 'Från byns förråd' },
  eget: { ikon: '🙋', namn: 'Byggarnas eget' },
  familj: { ikon: '👪', namn: 'Från familjen' },
  gava: { ikon: '🎁', namn: 'Skänkt' },
  fallt: { ikon: '🪓', namn: 'Stockar från träd som fälldes för bygget' },
  stold: { ikon: '🫳', namn: 'Taget utan lov' },
};

// ett hus: öppnas genom att trycka på det på kartan
export const hus: Flik = {
  namn: 'Huset',
  knapp: 'person',
  html() {
    const h = housesOf(s).find(q => q.id === ui.husId);
    if (!h) return '<p class="muted">Huset finns inte längre.</p>';
    const bits = bitsOf(s).filter(b => b.hus === h.id), klar = bits.filter(b => b.b >= 1).length;
    const rum = gridOf(s).rooms.filter(r => r.hus === h.id), sov = rum.reduce((n, r) => n + r.tiles.length, 0);
    const status = klar < bits.length ? `Byggs: ${klar} av ${bits.length} delar klara.` : `${sov} sovplatser${rum.length ? `, håller värmen ${Math.round(Math.max(...rum.map(r => insulation(s, r))) * 100)} %` : ''}.`;
    const kom = komOf(h);
    const rader = KOM.map(hur => {
      const xs = kom.filter(q => q.hur === hur);
      if (!xs.length) return '';
      const per: Record<string, number> = {};
      for (const q of xs) per[q.k] = (per[q.k] ?? 0) + q.n;
      const vem = hur === 'byn' || hur === 'eget' ? [] : [...new Set(xs.map(q => q.vem))].map(id => byId(s, id)).filter(p => p);
      const txt = Object.entries(per).map(([k, n]) => `${fmtN(n)} ${sakNamn(k).toLowerCase()}`).join(', ');
      const title = `${HUR[hur].namn}: ${txt}`;
      return `<dt title="${esc(title)}" aria-label="${esc(title)}">${HUR[hur].ikon}</dt><dd>${Object.entries(per).map(([k, n]) => `${iconImg(k)}${fmtN(n)}`).join(' ')}${vem.length ? ` <span class="muted">${vem.map(p => pLink(p)).join(', ')}</span>` : ''}</dd>`;
    }).join('');
    return `
    <div class="phead"><div><h2>${esc(h.namn)}</h2><p class="muted">${status}</p></div></div>
    <h3>Materialet kom från</h3>${rader ? `<dl class="kv">${rader}</dl>` : '<p class="muted">Huset byggdes innan byn började minnas var materialet kom ifrån.</p>'}`;
  },
};
