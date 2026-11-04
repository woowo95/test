// matchens sammanställning (steg 5.4.8.1) med berättelsen högst upp (steg 5.4.8.2): öppnas med knappen vid raden i Händelser eller i notisen (matchKnapp i hjalp.ts),
// som framträdandet (fram.ts). Allt läses ur minnet som sparades när matchen avgjordes (matchMinneAv i sim/sport.ts): sporten,
// platsen och hur länge den varade, spelarna med färdigheten i sportens färdighet och summan, vem som vann och glädjen.
// Lagen och publiken kommer med steg 10.3.6. Symbolerna först; texten kommer fram när man håller över raden
import { MIN, MatchMinne, SKILL_NAMES, SPORT_AV, byId, matchBerattelse, matchMinneAv } from '../../sim';
import { iconImg } from '../../ikoner';
import { clockTxt, esc, pLink } from '../hjalp';
import { s, ui } from '../lage';
import { notisVal } from '../notiser';
import type { Flik } from '../panel';

export const match: Flik = {
  namn: 'Matchen', knapp: 'person', html: () => matchHtml(matchMinneAv(s, ui.matchNr)),
  klick(el) {
    const b = el.closest<HTMLElement>('[data-match]');
    if (!b) return false;
    ui.matchNr = Number(b.dataset.match); ui.tab = 'match'; notisVal.oppen = false;
    return true;
  },
};
const vem = (id: number, namn: string) => { const p = byId(s, id); return p ? pLink(p) : esc(namn); };
const minuter = (a: number, b: number) => Math.max(1, Math.round((b - a) / MIN));

export function matchHtml(m?: MatchMinne) {
  if (!m) return '<p class="muted">Matchen är glömd.</p>';
  const ber = matchBerattelse(s, m); // berättelsen högst upp (steg 5.4.8.2)
  const d = SPORT_AV[m.k], fard = d ? SKILL_NAMES[d.skill] : '';
  const huvud = `<h2>${iconImg('boll', 18)} ${esc(d?.namn ?? 'Matchen')}</h2><p class="muted">${esc(clockTxt(m.t))}</p>${ber ? `<p class="ovBer">${esc(ber)}</p>` : ''}`;
  const fakta = [
    `<li title="Platsen">${iconImg('a_leka', 16)} Lekplatsen</li>`,
    `<li title="${esc(`Matchen varade i ${minuter(m.t, m.slut)} minuter`)}">{sym_klocka} ${minuter(m.t, m.slut)} min</li>`,
    m.vnamn ? `<li title="Den som vann">{sym_medalj} ${vem(m.vinnare!, m.vnamn)}</li>` : '',
    m.glad ? `<li title="${esc(`De som spelade blev gladare: +${m.glad} i humöret (av 100) i några timmar`)}">{sym_pil_upp} Glädje +${m.glad}</li>` : '',
  ].join('');
  const sum = m.spelare.reduce((a, x) => a + x.f, 0);
  const lista = m.spelare.slice().sort((a, b) => b.f - a.f).map(x => `<li title="${esc(`${x.namn}: ${fard.toLowerCase()} ${x.f} av 20`)}">${x.id === m.vinnare ? '{sym_medalj} ' : ''}${vem(x.id, x.namn)} <span class="muted">${x.f}</span></li>`).join('');
  const spel = `<h3 title="${esc(`Var och ens färdighet i ${fard.toLowerCase()} (0–20) och summan`)}">Spelarna (${m.spelare.length}) <span class="muted">${esc(fard)} ${sum}</span></h3><ul class="fame">${lista}</ul>`;
  if (m.installd) return `${huvud}<p>{sym_nej} Det kom för få, så det blev ingen match.</p><ul class="fame">${fakta}</ul>${m.spelare.length ? spel : ''}`;
  return `${huvud}<ul class="fame">${fakta}</ul>${spel}`;
}
