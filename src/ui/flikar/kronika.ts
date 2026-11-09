// Krönikan (steg 5.4.2): byns viktiga händelser över hela tiden (krönikan i historik.ts, sparad för alltid) och
// händelseloggen (s.log, de senaste 400 raderna) i en lista, senast först och under en rubrik per år. Filtret: Stort =
// krönikan (med kategorierna, steg 9.2.73), Allt = loggen och Kartan = kartan över tid; graferna har en egen sten, Byns tal (steg 9.3.2). Man bläddrar år för år med pilarna (eller ser alla år) och kan välja en person: raderna där hen
// står med. Öppnas med runstenen Krönika. Ett nytt filter är en rad i VISNING.
import { AGES, KRONIKA_KAT, type LogEntry, type Person, kalender, kronikaKat } from '../../sim';
import { tecknet } from '../../ikoner';
import { fritidLista } from './fram';
import { clockTxt, esc, linkify, namnI } from '../hjalp';
import { ritaOm, s } from '../lage';
import type { Flik } from '../panel';
import { kartminneHtml } from '../kartminne';

interface Rad { t: number; text: string; slag?: string; kind?: LogEntry['kind']; ids: number[]; byte?: LogEntry['byte']; bnr?: number; fram?: number; match?: number } // byte och fram ger knappen till redogörelsen
// var en person står med i en krönikerad: krönikan sparar bara texten, så personen hittas på namnet
const iText = (text: string, folk: Person[]) => folk.filter(p => namnI(text, p.name) >= 0).map(p => p.id);
const VISNING: Record<string, { namn: string; title: string; rader(): Rad[] }> = {
  stort: { namn: 'Krönikan', title: 'Krönikan: det viktiga som hänt sedan byns början', rader: () => (s.hist?.kronika ?? []).map(([t, text, slag]) => ({ t, text, slag, ids: iText(text, s.people) })).filter(r => val.kat === undefined || kronikaKat(r.slag) === val.kat) },
  allt: { namn: 'Allt', title: 'Allt som hänt i byn den senaste tiden (de senaste 400 raderna)', rader: () => s.log.map(l => ({ t: l.t, text: l.text, kind: l.kind, ids: l.ids, byte: l.byte, bnr: l.bnr, fram: l.fram, match: l.match })) },
  kartan: { namn: 'Kartan', title: 'Kartan år för år: skogen, stigarna och husen (steg 5.4.5.2)', rader: () => [] },
};
export const val: { visning: string; ar?: number; person?: number; kat?: string } = { visning: 'stort' }; // det som visas (exporterat för scenariot kronikalista)

// kategorierna i krönikan (steg 9.2.73, KRONIKA_KAT i historik.ts): en symbol per kategori; ett tryck visar bara den, ett till alla
const katRad = () => val.visning !== 'stort' ? '' : `<div class="pdelar kkat" role="toolbar" aria-label="Kategori">${KRONIKA_KAT.map(k => `<button type="button" data-kkat="${k.id}" aria-pressed="${k.id === val.kat}" title="${k.namn}" aria-label="${k.namn}">${tecknet(k.ikon, k.tecken, 16)}</button>`).join('')}</div>`;
const filterKnappar = () => `<div class="pdelar kfilter" role="toolbar" aria-label="Visa">${Object.entries(VISNING).map(([id, x]) => `<button type="button" data-kvis="${id}" aria-pressed="${id === val.visning}" title="${x.title}">${x.namn}</button>`).join('')}</div>${katRad()}`;
export const kronika: Flik = {
  namn: 'Krönika',
  html() {
    if (val.visning === 'kartan') return filterKnappar() + kartminneHtml(); // kartan över tid (ui/kartminne.ts)
    const v = VISNING[val.visning], alla = v.rader(), ar = (t: number) => kalender(s, t).ar;
    if (val.person !== undefined && !alla.some(r => r.ids.includes(val.person!))) val.person = undefined; // inte med här (t.ex. bara i krönikan)
    const folk = [...new Set(alla.flatMap(r => r.ids))].map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p).sort((a, b) => a.name.localeCompare(b.name, 'sv') || a.born - b.born);
    const medPerson = val.person === undefined ? alla : alla.filter(r => r.ids.includes(val.person!));
    const aren = [...new Set(medPerson.map(r => ar(r.t)))].sort((a, b) => a - b);
    if (val.ar !== undefined && !aren.includes(val.ar)) val.ar = aren.length ? aren.reduce((b, a) => Math.abs(a - val.ar!) < Math.abs(b - val.ar!) ? a : b) : undefined;
    const rader = (val.ar === undefined ? medPerson : medPerson.filter(r => ar(r.t) === val.ar)).slice().reverse().slice(0, 300);
    const i = val.ar === undefined ? -1 : aren.indexOf(val.ar);
    const pil = (dit: number | undefined, tecken: string, namn: string) => `<button type="button" data-kar="${dit ?? ''}" ${dit === undefined ? 'disabled' : ''} title="${namn}" aria-label="${namn}">${tecken}</button>`;
    const aldre = i < 0 ? aren.at(-1) : aren[i - 1], nyare = i < 0 ? undefined : aren[i + 1];
    const knappar = `${filterKnappar()}
      <div class="kblad">${pil(aldre, '◀', 'Året före')}<button type="button" data-kar="alla" aria-pressed="${val.ar === undefined}" title="${val.ar === undefined ? 'Alla år' : 'Visa alla år'}">${val.ar === undefined ? 'Alla år' : `År ${val.ar}`}</button>${pil(nyare, '▶', 'Året efter')}
      <select data-kperson aria-label="Person" title="Visa bara det en person var med om"><option value="">Alla</option>${folk.map(p => `<option value="${p.id}"${p.id === val.person ? ' selected' : ''}>${esc(p.name)}${p.died !== undefined ? ' †' : ''}</option>`).join('')}</select></div>`;
    let html = '', forra: number | undefined;
    for (const r of rader) {
      const a = ar(r.t);
      if (a !== forra) { html += `${forra === undefined ? '' : '</ol>'}<h4 class="kar">År ${a}</h4><ol class="logg">`; forra = a; }
      const k = kalender(s, r.t);
      html += `<li${r.kind ? ` class="k-${r.kind}"` : ''}><span class="when">${r.kind ? clockTxt(r.t) : AGES[k.ai]}</span>${linkify({ t: r.t, text: r.text, kind: r.kind ?? 'world', ids: r.ids, byte: r.byte, bnr: r.bnr, fram: r.fram, match: r.match })}</li>`;
    }
    // Fritid (steg 9.2.67): de senaste framträdandena och matcherna överst, med knappen till redogörelsen
    const fritid = val.visning === 'stort' && val.kat === 'fritid' ? fritidLista() : '';
    return knappar + (fritid ? `<h4 class="kar">Framträdanden och matcher</h4>${fritid}` : '') + (html ? html + '</ol>' : fritid ? '' : '<p class="muted">Inget har hänt här än.</p>');
  },
  klick(el) {
    const kk = el.closest<HTMLElement>('[data-kkat]');
    if (kk) { val.kat = val.kat === kk.dataset.kkat ? undefined : kk.dataset.kkat; return true; }
    const b = el.closest<HTMLElement>('[data-kvis], [data-kar]');
    if (!b) return false;
    if (b.dataset.kvis) { val.visning = b.dataset.kvis; return true; }
    const a = b.dataset.kar;
    val.ar = a === 'alla' ? (val.ar === undefined ? kalender(s, s.now).ar : undefined) : a ? Number(a) : val.ar;
    return true;
  },
};
if (typeof document !== 'undefined') document.addEventListener('change', e => {
  const el = (e.target as Element).closest<HTMLSelectElement>('[data-kperson]');
  if (!el) return;
  val.person = el.value ? Number(el.value) : undefined;
  ritaOm();
});
