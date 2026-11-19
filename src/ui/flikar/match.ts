// matchens sammanställning (steg 5.4.8.1) med berättelsen högst upp (steg 5.4.8.2): öppnas med knappen vid raden i Händelser eller i notisen (matchKnapp i hjalp.ts),
// som framträdandet (fram.ts). Allt läses ur minnet som sparades när matchen avgjordes (matchMinneAv i sim/sport.ts): sporten,
// platsen och hur länge den varade, spelarna med färdigheten i sportens färdighet och summan, vem som vann och glädjen.
// I en lagsport (steg 10.7.14) visas de två lagen med summan och vinnarlaget. Publiken (steg 10.7.16) står sist, med glädjen de fick. Symbolerna först; texten kommer fram när man håller över raden
import { MIN, MatchMinne, SKILL_NAMES, SPORT, SPORT_AV, matchBerattelse, matchMinneAv } from '../../sim';
import { iconImg } from '../../ikoner';
import { clockTxt, esc, vemLank, tioSkala } from '../hjalp';
import { s, ui } from '../lage';
import { redogKlick } from '../notiser';
import type { Flik } from '../panel';

export const match: Flik = {
  namn: 'Matchen', knapp: 'person', html: () => matchHtml(matchMinneAv(s, ui.matchNr)),
  klick: redogKlick('match', 'match', nr => { ui.matchNr = nr; }),
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
    m.ledsen ? `<li title="${esc(`De som förlorade blev ledsna: −${m.ledsen} i humöret (av 100) i en timme`)}">{sym_pil_ned} −${m.ledsen}</li>` : '',
    m.pris ? `<li title="${esc(m.pris.fick !== undefined ? `Tävlingens pris: ${m.pris.avNamn}s ${m.pris.sak}, som ${m.pris.fickNamn} fick` : `Tävlingens pris: ${m.pris.avNamn}s ${m.pris.sak}, som inte fanns kvar`)}">${iconImg(m.pris.k, 16)} ${vemLank(m.pris.av, m.pris.avNamn)}${m.pris.fick !== undefined ? ` → ${vemLank(m.pris.fick, m.pris.fickNamn!)}` : ' {sym_nej}'}</li>` : '',
    m.publik?.length ? `<li title="${esc(`${m.publik.length} stod och tittade och blev gladare: +${Math.round(SPORT.tittaGladje * 100)} i humöret (av 100) i en timme`)}">{sym_oga} ${m.publik.length}</li>` : '',
  ].join('');
  const grupp = (sp: MatchMinne['spelare'], rubrik: string, vann: boolean) => {
    const sum = sp.reduce((a, x) => a + x.f, 0);
    const tio = (v: number) => tioSkala(v); // färdigheten 0 till 10, som i personens Egenskaper (steg 11.1.47)
    const lista = sp.slice().sort((a, b) => b.f - a.f).map(x => `<li title="${esc(`${x.namn}: ${fard.toLowerCase()} ${tio(x.f)} av 10`)}">${!vann && x.id === m.vinnare && m.vinnLag === undefined ? '{sym_medalj} ' : ''}${vemLank(x.id, x.namn)} <span class="muted">${tio(x.f)}</span></li>`).join('');
    return `<h3 title="${esc(`Var och ens färdighet i ${fard.toLowerCase()} (0–10) och summan`)}">${vann ? '{sym_medalj} ' : ''}${rubrik} (${sp.length}) <span class="muted">${esc(fard)} ${tio(sum)}</span></h3><ul class="fame">${lista}</ul>`;
  };
  const spel = m.vinnLag !== undefined ? ([0, 1] as const).map(l => grupp(m.spelare.filter(x => x.l === l), `Lag ${l + 1}`, m.vinnLag === l)).join('') : grupp(m.spelare, 'Spelarna', false);
  if (m.installd) return `${huvud}<p>{sym_nej} Det kom för få, så det blev ingen match.</p><ul class="fame">${fakta}</ul>${m.spelare.length ? spel : ''}`;
  const pub = m.publik?.length ? `<h3 title="De som stod runt om och tittade">Publiken (${m.publik.length})</h3><ul class="fame">${m.publik.map(x => `<li>${vemLank(x.id, x.namn)}</li>`).join('')}</ul>` : '';
  return `${huvud}<ul class="fame">${fakta}</ul>${spel}${pub}`;
}
