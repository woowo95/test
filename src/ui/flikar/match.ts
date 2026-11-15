// matchens sammanställning (steg 5.4.8.1) med berättelsen högst upp (steg 5.4.8.2): öppnas med knappen vid raden i Händelser eller i notisen (matchKnapp i hjalp.ts),
// som framträdandet (fram.ts). Allt läses ur minnet som sparades när matchen avgjordes (matchMinneAv i sim/sport.ts): sporten,
// platsen och hur länge den varade, spelarna med färdigheten i sportens färdighet och summan, vem som vann och glädjen.
// I en lagsport (steg 10.7.14) visas de två lagen med summan och vinnarlaget. Publiken kommer med steg 10.7.16. Symbolerna först; texten kommer fram när man håller över raden
import { MIN, MatchMinne, SKILL_NAMES, SPORT_AV, matchBerattelse, matchMinneAv } from '../../sim';
import { iconImg } from '../../ikoner';
import { clockTxt, esc, vemLank } from '../hjalp';
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

const minuter = (a: number, b: number) => Math.max(1, Math.round((b - a) / MIN));

export function matchHtml(m?: MatchMinne) {
  if (!m) return '<p class="muted">Matchen är glömd.</p>';
  const ber = matchBerattelse(s, m); // berättelsen högst upp (steg 5.4.8.2)
  const d = SPORT_AV[m.k], fard = d ? SKILL_NAMES[d.skill] : '';
  const huvud = `<h2>${iconImg('boll', 18)} ${esc(d?.namn ?? 'Matchen')}</h2><p class="muted">${esc(clockTxt(m.t))}</p>${ber ? `<p class="ovBer">${esc(ber)}</p>` : ''}`;
  const fakta = [
    `<li title="Platsen">${iconImg('a_leka', 16)} I byn</li>`,
    `<li title="${esc(`Matchen varade i ${minuter(m.t, m.slut)} minuter`)}">{sym_klocka} ${minuter(m.t, m.slut)} min</li>`,
    m.vinnLag !== undefined ? `<li title="Laget som vann">{sym_medalj} Lag ${m.vinnLag + 1}</li>` : m.vnamn ? `<li title="Den som vann">{sym_medalj} ${vemLank(m.vinnare!, m.vnamn)}</li>` : '',
    m.glad ? `<li title="${esc(`De som vann blev gladare: +${m.glad} i humöret (av 100) i en timme`)}">{sym_pil_upp} +${m.glad}</li>` : '',
    m.ledsen ? `<li title="${esc(`De som förlorade blev ledsna: -${m.ledsen} i humöret (av 100) i en timme`)}">{sym_pil_ned} -${m.ledsen}</li>` : '',
  ].join('');
  const grupp = (sp: MatchMinne['spelare'], rubrik: string, vann: boolean) => {
    const sum = sp.reduce((a, x) => a + x.f, 0);
    const lista = sp.slice().sort((a, b) => b.f - a.f).map(x => `<li title="${esc(`${x.namn}: ${fard.toLowerCase()} ${x.f} av 20`)}">${!vann && x.id === m.vinnare && m.vinnLag === undefined ? '{sym_medalj} ' : ''}${vemLank(x.id, x.namn)} <span class="muted">${x.f}</span></li>`).join('');
    return `<h3 title="${esc(`Var och ens färdighet i ${fard.toLowerCase()} (0–20) och summan`)}">${vann ? '{sym_medalj} ' : ''}${rubrik} (${sp.length}) <span class="muted">${esc(fard)} ${sum}</span></h3><ul class="fame">${lista}</ul>`;
  };
  const spel = m.vinnLag !== undefined ? ([0, 1] as const).map(l => grupp(m.spelare.filter(x => x.l === l), `Lag ${l + 1}`, m.vinnLag === l)).join('') : grupp(m.spelare, 'Spelarna', false);
  if (m.installd) return `${huvud}<p>{sym_nej} Det kom för få, så det blev ingen match.</p><ul class="fame">${fakta}</ul>${m.spelare.length ? spel : ''}`;
  return `${huvud}<ul class="fame">${fakta}</ul>${spel}`;
}
