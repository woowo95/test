import { ACTS, FYND, ISHAL, SjoLogg, ageIndex, byId, fyndAt, isCm, living, sjoNamn, sjoVid, sjoarna, temperature, vattenGrader } from '../../sim';
import { iconImg } from '../../ikoner';
import { bar, clockTxt, esc, fmtN, pLink, times } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// en sjö: öppnas genom att trycka på vattnet på kartan. Byggd som elden: just nu, totalt, vem som oftast är där och historiken
export const sjo: Flik = { namn: 'Sjön', knapp: 'person', html: sjoHtml };

function sjoEntry(e: SjoLogg) {
  const who = pLink(byId(s, e.id));
  return `<li><span class="when">${clockTxt(e.t)}</span>${e.k === 'fisk' ? `${who} fångade en abborre.` : `${who} badade.`}</li>`;
}
// del av det föregående: napp per försök, fångst per napp
const andel = (a: number, b: number) => b ? ` (${Math.round(a / b * 100)} %)` : '';
function topp(r: Record<number, number>) {
  const xs = Object.entries(r).map(([id, n]) => ({ p: byId(s, Number(id)), n })).filter(x => x.p).sort((a, b) => b.n - a.n).slice(0, 6);
  return `<ul class="rels">${xs.map(x => `<li>${pLink(x.p)}<span></span><span class="muted">${fmtN(x.n)}</span></li>`).join('')}</ul>`;
}
// isens tjocklek och vad som tar sig igenom den (is.ts)
function isText() {
  const cm = isCm(s);
  if (cm <= 0) return 'Ingen is';
  const med = ISHAL.filter(h => h.max >= cm).map(h => h.namn);
  return `<span title="Man hugger upp ett hål för att fiska och dricka. Det går med ${med.join(', ').replace(/, ([^,]*)$/, ' eller $1')}.">${Math.round(cm)} cm</span>`;
}
function sjoHtml() {
  const n = ui.sjoNr, sj = sjoarna(s.seed), rutor = sj.rutor[n];
  if (!rutor) return '<p class="muted">Sjön finns inte.</p>';
  const st = s.sjoar?.[n], sas = ACTS.fiske.sasong![ageIndex(s)], temp = temperature(s);
  // fisken kvar: snittet i sjöns rutor mot det en mycket rik ruta har
  let fisk = 0; for (const i of rutor) fisk += fyndAt(s, 'fiske', i);
  const kvar = fisk / rutor.length / FYND.fiske.topp;
  const har = (act: string) => living(s).filter(p => p.task?.act === act && sjoVid(s, p.task.tx, p.task.ty) === n);
  const fiskar = har('fiske'), badar = har('bada');
  return `
    <div class="phead"><span class="dot big" style="background:#2f7fd0"></span><div><h2>${esc(sjoNamn(s, n))}</h2>
    <p class="muted">${rutor.length} rutor vatten. Man fiskar och badar från stranden.</p></div></div>
    <h3>Just nu</h3><dl class="kv">
      <dt>${iconImg('abborre', 14)} Fisk</dt><dd>${bar(kvar)}<span>${Math.round(kvar * 100)} %</span></dd>
      <dt>Fisket nu</dt><dd>${sas >= 1 ? 'Bra' : sas >= 0.7 ? 'Måttligt' : 'Dåligt'} efter årstiden</dd>
      <dt>Luften</dt><dd>${Math.round(temp)} grader</dd>
      <dt>Vattnet</dt><dd>${Math.round(vattenGrader(s))} grader</dd>
      <dt>Isen</dt><dd>${isText()}</dd>
      ${fiskar.length ? `<dt>Fiskar</dt><dd>${fiskar.map(pLink).join(', ')}</dd>` : ''}
      ${badar.length ? `<dt>Badar</dt><dd>${badar.map(pLink).join(', ')}</dd>` : ''}
    </dl>
    <h3>Totalt</h3>${st ? `<dl class="kv fam">
      <dt>Fiskeförsök</dt><dd>${fmtN(st.forsok)}</dd>
      <dt>Napp</dt><dd>${fmtN(st.napp)}${andel(st.napp, st.forsok)}</dd>
      <dt>Fångade fiskar</dt><dd>${fmtN(st.fisk)}${andel(st.fisk, st.napp)}</dd>
      <dt>Bad</dt><dd>${times(st.bad)}</dd></dl>` : '<p class="muted">Ingen har fiskat eller badat här.</p>'}
    ${st && st.fisk ? `<h3>Fiskar oftast</h3>${topp(st.fiskare)}` : ''}
    ${st && st.bad ? `<h3>Badar oftast</h3>${topp(st.badare)}` : ''}
    ${st?.log.length ? `<h3>Historik</h3><ol class="logg">${st.log.slice().reverse().slice(0, 40).map(sjoEntry).join('')}</ol>` : ''}`;
}
