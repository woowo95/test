// redogörelsen för ett framträdande (steg 5.4.7.1): öppnas med knappen vid raden i Händelser eller i notisen (framKnapp i hjalp.ts). Allt läses ur
// minnet som sparades när framträdandet slutade (framMinneAv i sim/framtradande.ts), inte ur loggen: vem som uppträdde, formen,
// instrumentet, budskapet och om ledaren betalade, publiken och mottagningen. Symbolerna först; texten kommer fram när man
// håller över raden
import { BUDSKAP, FRAM_AV, FramMinne, SPORT_AV, framBerattelse, framMinneAv, sakNamn, timeLabel } from '../../sim';
import { iconImg } from '../../ikoner';
import { clockTxt, esc, framKnapp, matchKnapp, vemLank } from '../hjalp';
import { s, ui } from '../lage';
import { notisVal } from '../notiser';
import type { Flik } from '../panel';

export const fram: Flik = {
  namn: 'Framträdandet', knapp: 'person', html: () => framHtml(framMinneAv(s, ui.framNr)),
  klick(el) {
    const b = el.closest<HTMLElement>('[data-fram]');
    if (!b) return false;
    ui.framNr = Number(b.dataset.fram); ui.tab = 'fram'; notisVal.oppen = false;
    return true;
  },
};

// ändringen som tal och pil
const andring = (a: number, b: number) => { const d = b - a; return d > 0 ? `{sym_pil_upp} +${d}` : d < 0 ? `{sym_pil_ned} ${d}` : '='; };
const medel = (v: number[]) => v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;

export function framHtml(m?: FramMinne) {
  if (!m) return '<p class="muted">Framträdandet är glömt.</p>';
  const d = FRAM_AV[m.k], bud = m.bud ? BUDSKAP[m.bud] : undefined;
  const huvud = `<h2>${esc(d?.namn ?? 'Framträdandet')}</h2><p class="muted">${esc(clockTxt(m.t))}</p>`;
  const fakta = [
    `<li title="Den som uppträdde">${iconImg('scen', 16)} ${vemLank(m.p, m.namn)}</li>`,
    m.inst ? `<li title="${esc(`Instrumentet: ${sakNamn(m.inst).toLowerCase()}`)}">${iconImg(m.inst, 16)} ${esc(sakNamn(m.inst))}</li>` : '',
    bud ? `<li title="Budskapet">${esc(bud.namn)}${m.om ? ` <span class="muted">(${esc(m.om)})</span>` : ''}</li>` : '',
    m.betalt ? `<li title="${esc(`${m.ledare ?? 'Ledaren'} betalade för framträdandet med en ${m.betalt}`)}">${iconImg('silver', 14)} <span class="muted">betalt med</span> ${esc(m.betalt)}</li>` : '',
  ].join('');
  const text = `<p class="ovBer">${esc(framBerattelse(s, m) || m.text)}</p>`; // berättelsen (steg 5.4.7.2)
  if (m.inget) return `${huvud}${text}<ul class="fame">${fakta}</ul><p>{sym_nej} Ingen kom och lyssnade.</p>`;
  const pub = m.publik ?? [];
  const r0 = medel(pub.map(x => x.r0)), r1 = medel(pub.map(x => x.r1));
  const mott = [
    m.glad ? `<li title="${esc(`Publiken blev gladare: +${m.glad} i humöret (av 100) i några timmar`)}">{sym_pil_upp} Glädje +${m.glad}</li>` : '',
    pub.length ? `<li title="${esc(`Hur mycket publiken i snitt gillar ${m.namn} (−100 till 100): ${r0} före, ${r1} efter`)}">{sym_hjarta_rott} ${esc(m.namn)}: ${r0} → ${r1} ${andring(r0, r1)}</li>` : '',
    m.ledare && pub.some(x => x.l0 !== undefined) ? (() => { const l = pub.filter(x => x.l0 !== undefined), a = medel(l.map(x => x.l0!)), b = medel(l.map(x => x.l1!)); return `<li title="${esc(`Hur mycket publiken i snitt gillar ledaren ${m.ledare} efter ${m.bud === 'hana' ? 'hånet' : 'hyllningen'}: ${a} före, ${b} efter`)}">{sym_hjarta_rott} ${esc(m.ledare)}: ${a} → ${b} ${andring(a, b)}</li>`; })() : '',
    m.rykte?.length ? `<li title="${esc(`Ryktet om ${m.om ?? 'någon'} spreds till ${m.rykte.join(', ')}`)}">Ryktet till ${esc(m.rykte.join(', '))}</li>` : '',
    m.tro?.length ? `<li title="${esc(`Tron övertygade ${m.tro.join(', ')}`)}">Tron övertygade ${esc(m.tro.join(', '))}</li>` : '',
  ].join('');
  const lista = pub.map(x => `<li title="${esc(`${x.namn} gillar ${m.namn}: ${x.r0} före, ${x.r1} efter${x.l0 !== undefined ? `; ledaren: ${x.l0} före, ${x.l1} efter` : ''}`)}">${vemLank(x.id, x.namn)} <span class="muted">${x.r0} → ${x.r1}</span> ${andring(x.r0, x.r1)}</li>`).join('');
  return `${huvud}${text}<ul class="fame">${fakta}</ul><h3>Mottagningen</h3><ul class="fame">${mott}</ul><h3>Publiken (${m.n})</h3><ul class="fame">${lista}</ul>`;
}

// de senaste framträdandena och matcherna (steg 9.2.67): en rad per tillfälle, det nyaste först, med formens eller sportens namn,
// vem och när; knappen öppnar redogörelsen. person = bara de hen var med i, scen = bara de på den scenen (där pågår ett
// framträdande står det överst), matcher = false utan matcherna
export function fritidLista(o: { person?: number; scen?: number; matcher?: boolean; antal?: number } = {}) {
  const fr = (s.framtradanden ?? []).filter(m => m.nr !== undefined && (o.person === undefined || m.p === o.person) && (o.scen === undefined || m.scen === o.scen))
    .map(m => ({ t: m.t, html: `${iconImg('scen', 12)} ${esc(FRAM_AV[m.k]?.namn ?? m.k)}: ${esc(m.namn)}${framKnapp(m.nr!)}` }));
  const ma = o.matcher === false || o.scen !== undefined ? [] : (s.matcher ?? []).filter(m => !m.installd && (o.person === undefined || m.spelare.some(q => q.id === o.person)))
    .map(m => ({ t: m.t, html: `${iconImg('boll', 12)} ${esc(SPORT_AV[m.k]?.namn ?? m.k)}: ${esc(m.spelare.map(q => q.namn).join(', '))}${m.vnamn ? `, ${esc(m.vnamn)} vann` : ''}${matchKnapp(m.nr)}` }));
  const nu = s.fram && (o.scen === undefined || s.fram.scen === o.scen) && (o.person === undefined || s.fram.p === o.person)
    ? `<li><span class="when">Pågår</span>${iconImg('scen', 12)} ${esc(FRAM_AV[s.fram.k]?.namn ?? s.fram.k)}: ${esc(s.people.find(p => p.id === s.fram!.p)?.name ?? '')}</li>` : '';
  const rader = [...fr, ...ma].sort((a, b) => b.t - a.t).slice(0, o.antal ?? 20);
  return nu || rader.length ? `<ol class="logg">${nu}${rader.map(r => `<li><span class="when">${esc(timeLabel(s, r.t))}</span>${r.html}</li>`).join('')}</ol>` : '';
}
