import { Filt, byId, filtMot, grundvarde, handlarVarde, sakNamn } from '../../sim';
import { iconImg } from '../../ikoner';
import { esc, pLink } from '../hjalp';
import { s, ui } from '../lage';
import { gastById, handlarPris } from '../gaster';
import type { Flik } from '../panel';

// filten (steg 4.5.4.13): öppnas genom att trycka på en filt på kartan. En filt ensam visar vad som ligger på den och vems
// det är. Två filtar mitt emot varandra (samma par) visas alltid tillsammans, vilken av dem man än tryckt på: vad var och en
// erbjuder och priserna i silver
export const filt: Flik = { namn: 'Filten', knapp: 'person', html: filtHtml };

// filten som visas: den som ligger närmast platsen man tryckte på
export function valdFilt() {
  let best: Filt | undefined, bd = 1.5;
  for (const f of s.filtar ?? []) {
    if (f.handlare === undefined && f.slut <= ui.nu) continue;
    const d = Math.hypot(f.x - ui.filtAt.x, f.y - ui.filtAt.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}
// vems saken är: en bybo, handlaren (en gäst) eller den som handlar för byn
function vem(id: number, byn?: boolean) {
  const p = id > 0 ? byId(s, id) : undefined;
  if (p) return `${pLink(p)}${byn ? ' <span class="muted">för byn</span>' : ''}`;
  const g = gastById(id);
  return g ? `${esc(g.namn)} <span class="muted">(${esc(g.sort.toLowerCase())})</span>` : 'Någon som gått';
}
// priset i silver för en sak på filten f: det handlaren tar för sina varor, det hen ger för det en bybo erbjuder hen och
// grundvärdet mellan bybor. Hela silver, minst ett
function pris(f: Filt, mot: Filt | undefined, k: string) {
  const h = s.handlare;
  if (h && f.handlare === h.id) return handlarPris(k);
  if (h && mot?.handlare === h.id) return Math.max(1, Math.round(grundvarde(k) * handlarVarde(s, h, k)));
  return Math.max(1, Math.round(grundvarde(k)));
}
// en sida av bytet: vems, sakerna och (när det är ett byte) priserna och summan
function sida(f: Filt, id: number, varor: Filt['varor'], mot?: Filt, priser = false) {
  let sum = 0;
  const rader = varor.map(v => {
    const n = Math.round(v.n), p = pris(f, mot, v.k);
    sum += n * p;
    const t = `${sakNamn(v.k)}${n > 1 ? `, ${n} st` : ''}${priser ? `: ${p} silver styck` : ''}`;
    return `<li title="${esc(t)}">${iconImg(v.k, 16)} ${n > 1 ? `${n} ` : ''}${esc(sakNamn(v.k))}${priser ? ` <span class="muted">${p}</span>${iconImg('silver', 12)}` : ''}</li>`;
  }).join('');
  return `<div class="filtsida"><p>${vem(id, f.byn)}</p><ul class="fame">${rader || '<li class="muted">Inget</li>'}</ul>${priser && varor.length ? `<p class="muted" title="Det hen erbjuder, värt i silver">Värt ${sum} ${iconImg('silver', 12)}</p>` : ''}</div>`;
}
function filtHtml() {
  const f = valdFilt();
  if (!f) return '<p class="muted">Filten är hopplockad.</p>';
  const m = filtMot(s, f);
  if (m) {
    const [a, b] = f.handlare !== undefined || m.handlare === undefined && f.y <= m.y ? [f, m] : [m, f]; // handlarens (eller den övre) först
    return `<h2>Bytet</h2><div class="filtpar">${sida(a, a.vem ?? a.varor[0]?.fran ?? 0, a.varor, b, true)}${sida(b, b.vem ?? b.varor[0]?.fran ?? 0, b.varor, a, true)}</div>`;
  }
  // en filt ensam; en filt från före v267 har båda parternas saker: en sida per part
  const vems = f.vem !== undefined ? [f.vem] : [...new Set(f.varor.map(v => v.fran))];
  if (vems.length > 1) return `<h2>Bytet</h2><div class="filtpar">${vems.map(id => sida(f, id, f.varor.filter(v => v.fran === id), undefined, true)).join('')}</div>`;
  return `<h2>Filten</h2>${sida(f, vems[0] ?? 0, f.varor)}`;
}
