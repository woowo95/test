import { BRASA, ELD, FireLog, HOUR, amountOf, byId, eldById, eldFaktor, emberOn, fireHeat, fireWant, hearthOf, heatRadius, igniterOf, living } from '../../sim';
import { bar, clockTxt, durTxt, esc, fmtN, num, pLink, times } from '../hjalp';
import { s, ui } from '../lage';
import type { Flik } from '../panel';

// elden: öppnas genom att trycka på en lägereld på kartan (den första eller en till, ui.eld, steg 4.5.6.8)
export const eld: Flik = { namn: 'Elden', knapp: 'person', html: fireHtml };

function spreadWord(v: number) { return v >= 0.8 ? 'Hög' : v >= 0.3 ? 'Måttlig' : v >= 0.1 ? 'Låg' : 'Mycket låg'; }
function fireEntry(e: FireLog) {
  const who = pLink(byId(s, e.id));
  const txt = e.k === 'tänd' ? (e.id ? `${who} tände elden${e.n && e.n > 1 ? ` efter ${e.n} försök` : ''}.` : 'Byns grundare tände elden.')
    : e.k === 'fyll' ? `${who} lade på ${fmtN(e.n ?? 0)} ved.`
    : e.k === 'glöd' ? `${who} blåste liv i glöden.`
    : e.k === 'sprack' ? `Flintan som ${who} slog med sprack.`
    : `Elden slocknade. Den hade bränt ${fmtN(e.n ?? 0)} ved.`;
  return `<li><span class="when">${clockTxt(e.t)}</span>${txt}</li>`;
}
function fireHtml() {
  const f = eldById(s, ui.eld) ?? s.fire, forsta = f === s.fire, h = hearthOf(f), now = s.now, ig = igniterOf(s);
  const glod = emberOn(s, f), [fr, fv] = eldFaktor(s, f), takt = h.burn * fr * fv; // som stepFire i eld.ts: regnet och den hårda vintern
  const status = f.lit ? 'Brinner' : glod ? `Glöder. Ny ved får den att brinna igen (${durTxt(f.emberUntil! - now)} kvar).` : (f.ash ?? 0) >= 1 ? 'Utbrunnen. Kvar ligger en svart hög med kol.' : 'Släckt. Den måste tändas på nytt.';
  const hit = (p: { task?: { ref?: number } }) => forsta ? p.task?.ref === undefined : p.task?.ref === f.id;
  const tender = living(s).find(p => p.task?.act === 'elda' && hit(p)), lighter = living(s).find(p => p.task?.act === 'tanda' && hit(p));
  const fills = Object.entries(f.fills).map(([id, n]) => ({ p: byId(s, Number(id)), n })).filter(x => x.p).sort((a, b) => b.n - a.n).slice(0, 6);
  const tgt = forsta ? fireWant(s) : f.want ?? 0;
  return `
    <div class="phead"><span class="dot big" style="background:${f.lit ? '#e2702e' : glod ? '#b3361e' : '#4b4640'}"></span><div><h2>${esc(h.name)}</h2>
    <p class="muted">${esc(h.desc)}${forsta ? '' : ' En lägereld till, nära sovplatserna.'}</p><p class="status">${status}</p></div></div>
    <h3>Just nu</h3><dl class="kv">
      <dt>Trä på elden</dt><dd>${bar(f.fuel / h.maxFuel)}<span>${fmtN(f.fuel)} av ${h.maxFuel}</span></dd>
      <dt>Värme</dt><dd>${bar(fireHeat(s, f))}<span>${f.lit ? `${num(heatRadius(s, f))} rutor ut` : '–'}</span></dd>
      <dt>Förbrukning</dt><dd>${num(takt)} ved i timmen${fr > 1 || fv > 1 ? ` <span class="muted">(${[fr > 1 ? 'regnet' : '', fv > 1 ? 'den hårda vintern' : ''].filter(Boolean).join(' och ')})</span>` : ''}</dd>
      <dt>Räcker</dt><dd>${f.lit ? `ca ${durTxt(f.fuel / takt * HOUR)}` : '–'}</dd>
      <dt>Önskat</dt><dd>${fmtN(tgt)} ved på elden</dd>
      ${f.wantWhy && byId(s, f.wantBy) ? `<dt>Önskas av</dt><dd>${pLink(byId(s, f.wantBy))}: ${esc(f.wantWhy).toLowerCase()}</dd>` : ''}
      ${tender ? `<dt>Hämtar trä</dt><dd>${pLink(tender)}</dd>` : ''}
    </dl>
    ${f.lit ? `<h3>Denna eld</h3><dl class="kv fam">
      <dt>Brunnit i</dt><dd>${durTxt(now - (f.litAt ?? now))}</dd>
      <dt>Tändes</dt><dd>${f.litAt !== undefined ? clockTxt(f.litAt) : '–'}</dd>
      <dt>Tänd av</dt><dd>${f.litBy !== undefined ? pLink(byId(s, f.litBy)) : forsta ? 'Byns grundare' : '–'}</dd>
      <dt>Trä använt</dt><dd>${fmtN(f.burned)}</dd></dl>` : ''}
    ${forsta ? '' : `<h3>Sover nära</h3><p class="muted">När ingen sover nära den och den är släckt tas den isär efter ${BRASA.tomDygn} dygn, och stenarna läggs i en hög.</p>${(f.folk ?? []).map(id => byId(s, id)).filter(p => p).map(p => pLink(p)).join(' ') || '<span class="muted">Ingen</span>'}`}
    <h3>Tändning</h3><dl class="kv fam">
      <dt>Tänddon</dt><dd>${ig ? `${esc(ig.name)} (${fmtN(amountOf(s, ig.id))} i förrådet)` : 'Inget. Någon måste hitta en flinta.'}</dd>
      <dt>Stenring</dt><dd>${f.ring || !forsta ? 'Ligger runt eldplatsen' : `Behövs till den första elden: ${fmtN(amountOf(s, 'sten'))} av ${ELD.ring} stenar`}</dd>
      <dt>Hö</dt><dd>${fmtN(amountOf(s, 'torrgras'))} i förrådet</dd>
      <dt>Bränsle</dt><dd>${fmtN(amountOf(s, 'ved'))} ved och ${fmtN(amountOf(s, 'grenar'))} grenar i förrådet (grenar brinner fort)</dd>
      ${(f.ash ?? 0) >= 1 ? `<dt>Kolhög</dt><dd>${f.ash} kol i den gamla elden, ligger kvar ca ${durTxt((f.ashUntil ?? now) - now)}</dd>` : ''}
      ${amountOf(s, 'kol') >= 1 ? `<dt>Kol</dt><dd>${fmtN(amountOf(s, 'kol'))} i förrådet</dd>` : ''}
      ${ig ? `<dt>Per försök</dt><dd>${ig.grass} hö och ${ig.sticks} grenar (eller 1 kol), ca ${ig.minutes} minuter${(f.ash ?? 0) >= 1 ? '. Kolhögen tar lättare fyr.' : ''}</dd>` : ''}
      ${!f.lit ? `<dt>Försök</dt><dd>${f.tries} sedan elden slocknade${lighter ? `, ${pLink(lighter)} försöker nu` : ''}</dd>` : ''}
    </dl>
    <h3>Totalt</h3><dl class="kv fam">
      <dt>Brunnit</dt><dd>${f.litSec > 0 ? durTxt(f.litSec * 1000) : 'Aldrig'}</dd>
      <dt>Trä bränt</dt><dd>${Math.round(f.totalBurned)}</dd>
      <dt>Tänd</dt><dd>${times(f.lightings)}, ${f.tryTotal} försök</dd>
      <dt>Slocknat</dt><dd>${times(f.outs)}</dd></dl>
    <h3>Eldstaden</h3><dl class="kv fam">
      <dt>Mest trä</dt><dd>${h.maxFuel}</dd>
      <dt>Välbehag</dt><dd>+${Math.round(h.comfort * 100)} i humör nära elden</dd>
      <dt>Inomhus</dt><dd>${h.indoor ? 'Ja' : 'Nej'}</dd>
      <dt>Spridningsrisk</dt><dd>${spreadWord(h.spread)}</dd></dl>
    ${fills.length ? `<h3>Fyller oftast på</h3><ul class="rels">${fills.map(x => `<li>${pLink(x.p)}<span></span><span></span><span class="muted">${times(x.n)}</span></li>`).join('')}</ul>` : ''}
    <h3>Historik</h3>${f.log.length ? `<ol class="logg">${f.log.slice().reverse().slice(0, 40).map(fireEntry).join('')}</ol>` : '<p class="muted">Elden har aldrig brunnit.</p>'}`;
}
