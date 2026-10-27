import { KOM, bitsOf, byId, dorrDef, fnOf, gridOf, husById, insulation, komOf, rumsFunktioner, sakNamn, sovplatser } from '../../sim';
import { iconImg } from '../../ikoner';
import { cap, esc, fmtN, pLink } from '../hjalp';
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
    const h = husById(s, ui.husId);
    if (!h) return '<p class="muted">Huset finns inte längre.</p>';
    const bits = bitsOf(s).filter(b => b.hus === h.id), klar = bits.filter(b => b.b >= 1).length;
    const rum = gridOf(s).rooms.filter(r => r.hus === h.id), sov = rum.reduce((n, r) => n + sovplatser(s, r), 0);
    const bra = [sov ? `${sov} sovplatser` : '', rum.length ? `håller värmen ${Math.round(Math.max(...rum.map(r => insulation(s, r))) * 100)} %` : ''].filter(x => x).join(', ');
    const status = klar < bits.length ? `Byggs: ${klar} av ${bits.length} delar klara.` : bra ? `${cap(bra)}.` : '';
    // dörren i öppningen (DORRAR i byggnad.ts, steg 2.2.16): symbolen, och förklaringen när musen är över
    const dorrar = bits.filter(b => b.k === 'oppning').map(b => {
      const d = dorrDef(b.dorr), om = d ? `${d.namn}: släpper ut ${Math.round(d.tat * 100)} % mindre värme än en öppen dörröppning` : 'Öppen dörröppning: värmen går ut här';
      return d ? `<span title="${esc(om)}" aria-label="${esc(om)}">${iconImg(d.ikon)} ${esc(d.namn)}</span>` : `<span class="muted" title="${esc(om)}" aria-label="${esc(om)}">Öppen dörröppning</span>`;
    }).join(', ');
    // vad huset används till efter det som står i det (RUMSFUNKTIONER i byggnader.ts, steg 2.2.17)
    const anv = klar === bits.length ? rumsFunktioner(s, h).map(f => `<span title="${esc(`${f.namn}: ${f.om}`)}" aria-label="${esc(f.namn)}">${f.ikon} ${esc(f.namn)}</span>`).join(' · ') : '';
    const kom = komOf(h), fn = fnOf(h), agare = h.ag !== undefined ? byId(s, h.ag) : undefined;
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
    <div class="phead"><div><h2><span title="${esc(`${fn.namn}: ${fn.behov}`)}" aria-label="${esc(fn.namn)}">${fn.ikon}</span> ${esc(h.namn)}</h2><p class="muted">${status}</p>${anv ? `<p>${anv}</p>` : ''}${agare ? `<p class="muted">Ägs av ${pLink(agare)} och familjen.</p>` : ''}${dorrar && klar === bits.length ? `<p>${dorrar}</p>` : ''}</div></div>
    <h3>Materialet kom från</h3>${rader ? `<dl class="kv">${rader}</dl>` : '<p class="muted">Huset byggdes innan byn började minnas var materialet kom ifrån.</p>'}`;
  },
};
