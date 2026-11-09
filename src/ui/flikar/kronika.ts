// Krönikan (steg 5.4.2 och 9.2.125): byns händelser i en lista, krönikan (historik.ts, sparad för alltid) och händelseloggen
// (s.log, de senaste 400 raderna) tillsammans, under en rubrik per år. En rad med symboler överst väljer vad som visas och i
// vilken ordning: bara det viktiga (krönikan) eller allt, kategorin (steg 9.2.73), året, personen och nyast eller äldst först.
// Den förklarande texten kommer fram när man trycker på en symbol. Kartan över tid står i stenen Byns tal (steg 9.2.126), och
// graferna också (steg 9.3.2). Öppnas med runstenen Krönika.
import { AGES, KRONIKA_KAT, type LogEntry, type Person, kalender, kronikaKat } from '../../sim';
import { tecknet } from '../../ikoner';
import { fritidLista } from './fram';
import { clockTxt, esc, linkify, namnI } from '../hjalp';
import { ritaOm, s } from '../lage';
import type { Flik } from '../panel';

interface Rad { t: number; text: string; slag?: string; kind?: LogEntry['kind']; viktig?: boolean; ids: number[]; byte?: LogEntry['byte']; bnr?: number; fram?: number; match?: number } // byte och fram ger knappen till redogörelsen
// var en person står med i en krönikerad: krönikan sparar bara texten, så personen hittas på namnet
const iText = (text: string, folk: Person[]) => folk.filter(p => namnI(text, p.name) >= 0).map(p => p.id);
// viktigt: bara krönikan (annars krönikan och händelseloggen); nyast: senast först; forkl: symbolen vars förklaring visas
export const val: { viktigt: boolean; nyast: boolean; ar?: number; person?: number; kat?: string; forkl?: string } = { viktigt: true, nyast: true }; // (exporterat för scenarierna)
function rader(): Rad[] {
  const krona: Rad[] = (s.hist?.kronika ?? []).map(([t, text, slag]) => ({ t, text, slag, viktig: true, ids: iText(text, s.people) }))
    .filter(r => val.kat === undefined || kronikaKat(r.slag) === val.kat).sort((a, b) => a.t - b.t);
  if (val.viktigt || val.kat !== undefined) return krona; // en kategori finns bara i krönikan
  // allt: loggens rader, och krönikans rader som inte redan står i loggen (samma text vid samma tid)
  const logg: Rad[] = s.log.map(l => ({ t: l.t, text: l.text, kind: l.kind, ids: l.ids, byte: l.byte, bnr: l.bnr, fram: l.fram, match: l.match }));
  const iLoggen = new Set(logg.map(r => `${r.t}|${r.text}`));
  for (const r of logg) if (krona.some(k => k.t === r.t && k.text === r.text)) r.viktig = true;
  return [...krona.filter(k => !iLoggen.has(`${k.t}|${k.text}`)), ...logg].sort((a, b) => a.t - b.t);
}
// symbolerna överst och vad de betyder (förklaringen kommer fram när man trycker)
const FORKL: Record<string, string> = {
  viktigt: 'Bara det viktiga: krönikan, det byn minns för alltid.',
  allt: 'Allt: krönikan och allt annat som hänt den senaste tiden (de senaste 400 raderna i händelseloggen).',
  nyast: 'Nyast först.', aldst: 'Äldst först.',
  ar: 'Ett år i taget: bläddra med pilarna, eller tryck på året för alla år.',
  person: 'Bara det en person var med om.',
};
const knapp = (data: string, pressed: boolean, sym: string, alt: string, namn: string) => `<button type="button" ${data} aria-pressed="${pressed}" title="${esc(namn)}" aria-label="${esc(namn)}">${tecknet(sym, alt, 16)}</button>`;
function symbolRad(folk: Person[], aren: number[]) {
  const i = val.ar === undefined ? -1 : aren.indexOf(val.ar);
  const aldre = i < 0 ? aren.at(-1) : aren[i - 1], nyare = i < 0 ? undefined : aren[i + 1];
  const pil = (dit: number | undefined, tecken: string, namn: string) => `<button type="button" data-kar="${dit ?? ''}" ${dit === undefined ? 'disabled' : ''} title="${namn}" aria-label="${namn}">${tecken}</button>`;
  const kat = KRONIKA_KAT.map(k => `<button type="button" data-kkat="${k.id}" aria-pressed="${k.id === val.kat}" title="${k.namn}" aria-label="${k.namn}">${tecknet(k.ikon, k.tecken, 16)}</button>`).join('');
  const forkl = val.forkl ? FORKL[val.forkl] ?? KRONIKA_KAT.find(k => k.id === val.forkl)?.namn : undefined;
  return `<div class="pdelar kfilter" role="toolbar" aria-label="Visa">
      ${knapp('data-kvis="viktigt"', val.viktigt, 'sym_stjarna', '⭐', 'Bara det viktiga')}${knapp('data-kvis="allt"', !val.viktigt, 'sym_skriftrulle', '📜', 'Allt')}
      ${knapp('data-kordning="nyast"', val.nyast, 'sym_ned', '⬇', 'Nyast först')}${knapp('data-kordning="aldst"', !val.nyast, 'sym_upp', '⬆', 'Äldst först')}</div>
    <div class="pdelar kkat" role="toolbar" aria-label="Kategori">${kat}</div>
    <div class="kblad">${pil(aldre, '◀', 'Året före')}<button type="button" data-kar="alla" aria-pressed="${val.ar === undefined}" title="${val.ar === undefined ? 'Alla år' : 'Visa alla år'}">${val.ar === undefined ? 'Alla år' : `År ${val.ar}`}</button>${pil(nyare, '▶', 'Året efter')}
      <span title="Person">${tecknet('sym_person', '🧑', 16)}</span><select data-kperson aria-label="Person" title="Visa bara det en person var med om"><option value="">Alla</option>${folk.map(p => `<option value="${p.id}"${p.id === val.person ? ' selected' : ''}>${esc(p.name)}${p.died !== undefined ? ' †' : ''}</option>`).join('')}</select></div>
    ${forkl ? `<p class="muted small kforkl">${esc(forkl)}</p>` : ''}`;
}
export const kronika: Flik = {
  namn: 'Krönika',
  html() {
    const alla = rader(), ar = (t: number) => kalender(s, t).ar;
    if (val.person !== undefined && !alla.some(r => r.ids.includes(val.person!))) val.person = undefined; // inte med här (t.ex. bara i loggen)
    const folk = [...new Set(alla.flatMap(r => r.ids))].map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p).sort((a, b) => a.name.localeCompare(b.name, 'sv') || a.born - b.born);
    const medPerson = val.person === undefined ? alla : alla.filter(r => r.ids.includes(val.person!));
    const aren = [...new Set(medPerson.map(r => ar(r.t)))].sort((a, b) => a - b);
    if (val.ar !== undefined && !aren.includes(val.ar)) val.ar = aren.length ? aren.reduce((b, a) => Math.abs(a - val.ar!) < Math.abs(b - val.ar!) ? a : b) : undefined;
    const iAret = val.ar === undefined ? medPerson : medPerson.filter(r => ar(r.t) === val.ar);
    const visas = (val.nyast ? iAret.slice().reverse() : iAret).slice(0, 300);
    let html = '', forra: number | undefined;
    for (const r of visas) {
      const a = ar(r.t);
      if (a !== forra) { html += `${forra === undefined ? '' : '</ol>'}<h4 class="kar">År ${a}</h4><ol class="logg">`; forra = a; }
      const k = kalender(s, r.t), cls = [r.kind ? `k-${r.kind}` : '', r.viktig && !val.viktigt ? 'viktig' : ''].filter(Boolean).join(' ');
      html += `<li${cls ? ` class="${cls}"` : ''}><span class="when">${r.kind ? clockTxt(r.t) : AGES[k.ai]}</span>${linkify({ t: r.t, text: r.text, kind: r.kind ?? 'world', ids: r.ids, byte: r.byte, bnr: r.bnr, fram: r.fram, match: r.match })}</li>`;
    }
    // Fritid (steg 9.2.67): de senaste framträdandena och matcherna överst, med knappen till redogörelsen
    const fritid = val.kat === 'fritid' ? fritidLista() : '';
    return symbolRad(folk, aren) + (fritid ? `<h4 class="kar">Framträdanden och matcher</h4>${fritid}` : '') + (html ? html + '</ol>' : fritid ? '' : '<p class="muted">Inget har hänt här än.</p>');
  },
  klick(el) {
    const kk = el.closest<HTMLElement>('[data-kkat]');
    if (kk) { val.kat = val.kat === kk.dataset.kkat ? undefined : kk.dataset.kkat; val.forkl = kk.dataset.kkat; return true; }
    const o = el.closest<HTMLElement>('[data-kordning]');
    if (o) { val.nyast = o.dataset.kordning === 'nyast'; val.forkl = o.dataset.kordning; return true; }
    const b = el.closest<HTMLElement>('[data-kvis], [data-kar]');
    if (!b) return false;
    if (b.dataset.kvis) { val.viktigt = b.dataset.kvis === 'viktigt'; val.forkl = b.dataset.kvis; return true; }
    const a = b.dataset.kar;
    val.ar = a === 'alla' ? (val.ar === undefined ? kalender(s, s.now).ar : undefined) : a ? Number(a) : val.ar;
    val.forkl = 'ar';
    return true;
  },
};
if (typeof document !== 'undefined') document.addEventListener('change', e => {
  const el = (e.target as Element).closest<HTMLSelectElement>('[data-kperson]');
  if (!el) return;
  val.person = el.value ? Number(el.value) : undefined; val.forkl = 'person';
  ritaOm();
});
