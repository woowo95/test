import { FOLDERS, amountOf, grundvarde, isTool, kortTal, ownedSum, sakNamn, wornOf } from '../sim';
import { iconImg } from '../ikoner';
import { eld } from './flikar/eld';
import { kronika } from './flikar/kronika';
import { hog, lager } from './flikar/lager';
import { hus } from './flikar/hus';
import { sjo } from './flikar/sjo';
import { falt } from './flikar/falt';
import { station } from './flikar/station';
import { person } from './flikar/person';
import { teknik } from './flikar/teknik';
import { sak } from './flikar/sak';
import { filt } from './flikar/filt';
import { fram } from './flikar/fram';
import { match } from './flikar/match';
import { djur } from './flikar/djur';
import { grannar } from './flikar/grannar';
import { seder } from './flikar/seder';
import { religion } from './flikar/religion';
import { styre } from './flikar/styre';
import { tal } from './flikar/tal';
import { $, hjalpKlick } from './hjalp';
import { OPPNAR, bubblaKlick } from './bubbla';
import { piles, s, satRitaOm, ui, vidNyBy } from './lage';
import { renderPorts } from './portratt';
import { bandHtml, stenHtml } from './runstenar';

// panelerna: flikarna och listan över allt byn äger.
// En ny flik: en fil i flikar/ som exporterar en Flik, och en rad i FLIKAR nedan. Knappen skapas av sig själv
export interface Flik {
  namn: string; // texten på flikknappen
  knapp?: string; // visas under en annan flikknapp i stället för en egen (elden, lagret och högen öppnas från kartan)
  html(): string; // innehållet; byggs om ett par gånger i sekunden
  klick?(el: HTMLElement): boolean; // tryck i sidan som fliken tar hand om, även när den inte är öppen; true = klart
  syns?(): boolean; // annars är knappen en blek sten som inte går att trycka på (grannarna när byn har grannar)
  band?(): string; // bandet överst är en annan fliks (Byn visar den öppna delens band, steg 5.3.3.2)
}
// runstenarna uppifrån (steg 9.3.1–9.3.2): Seder, Tro, Styre, Teknik, Krönika, Byns tal och Omvärlden
const FLIKAR = { seder, religion, styre, teknik, kronika, tal, grannar, person, eld, lager, hog, hus, station, sjo, falt, sak, djur, filt, fram, match } satisfies Record<string, Flik>;
export type FlikId = keyof typeof FLIKAR;
const ALLA: Record<FlikId, Flik> = FLIKAR;
const IDS = Object.keys(FLIKAR) as FlikId[];

// panelerna ovanpå kartan (steg 5.3.1.1): personens panel till vänster visar personen och det man tryckt på (elden, lagret,
// högen, huset, stationen, sjön, fältet, saken, djuret, filten), den öppna flikens panel till höger, och flikknapparna står
// i en kolumn längst till höger. Ett tryck på den öppna flikens knapp stänger den, och krysset stänger en panel
const nav = document.querySelector<HTMLElement>('.tabs')!;
// knapparna är runstenar (steg 5.3.3.1, ui/runstenar.ts); namnet syns när musen är över
nav.innerHTML = IDS.filter(id => !ALLA[id].knapp && id !== 'person').map(id => `<button type="button" role="tab" class="runsten" data-tab="${id}" aria-selected="false" title="${ALLA[id].namn}" aria-label="${ALLA[id].namn}">${stenHtml(id, ALLA[id].namn)}</button>`).join('');

// flikarna som visas i personens panel (personen, elden, lagret, högen, huset, stationen, sjön, fältet, saken, djuret)
export const ärPersonflik = (id: FlikId | undefined) => !!id && (ALLA[id].knapp ?? id) === 'person';
// det man trycker på (elden, högen, huset, stationen, sjön, fältet, saken, djuret …) visas i en mindre ruta där man tryckte, och
// personens panel står kvar (steg 5.3.5.1)
export const ärRuta = (id: FlikId | undefined) => ärPersonflik(id) && id !== 'person';
let tryck = { x: 0, y: 0 }, flytta = false;
// på en liten skärm är panelerna ark nerifrån (steg 5.3.7, ui/ark.ts), och bara ett är öppet åt gången: det som öppnas sist
export const smal = matchMedia('(max-width: 820px)');
export function visa(id: FlikId) {
  if (ärRuta(id)) flytta = true;
  if (ärPersonflik(id)) ui.tab = id; else { ui.hoger = id; if (smal.matches) { ui.selected = undefined; if (!ärRuta(ui.tab)) ui.tab = undefined; } }
  renderPanel(true);
}
export function selectPerson(id: number) { ui.selected = id; ui.tab = 'person'; if (smal.matches) ui.hoger = undefined; renderPanel(true); renderPorts(); }
// rutan stängs: personens panel står kvar om en person är vald
export function stangRuta() { ui.tab = ui.selected !== undefined ? 'person' : undefined; }
export function stang(sida: 'v' | 'h' | 'r') {
  if (sida === 'h') ui.hoger = undefined;
  else if (sida === 'r') stangRuta();
  else { ui.selected = undefined; if (!ärRuta(ui.tab)) ui.tab = undefined; }
  renderPanel(true); renderPorts();
}

// en panel och det som senast skrevs i den: är det samma skrivs det inte om (markering, musen över och fokus står kvar)
interface Sida { el: HTMLElement; body: HTMLElement; html: string; musOver: boolean }
const SIDOR: Record<'v' | 'h' | 'r', Sida> = {
  v: { el: $('vPanel'), body: $('vBody'), html: '', musOver: false },
  h: { el: $('hPanel'), body: $('panelBody'), html: '', musOver: false },
  r: { el: $('ruta'), body: $('rutaBody'), html: '', musOver: false },
};
// rutan läggs bredvid trycket och hålls inom fönstret, till vänster om runstenarna
function placeraRuta() {
  const el = SIDOR.r.el, b = el.offsetWidth, h = el.offsetHeight, m = 8;
  const hoger = (document.querySelector<HTMLElement>('.tabs')?.offsetWidth ?? 0) + m;
  const topp = parseFloat(getComputedStyle(document.body).getPropertyValue('--topp')) || 0;
  let x = tryck.x + 14, y = tryck.y + 14;
  if (x + b > innerWidth - hoger) x = tryck.x - b - 14;
  if (y + h > innerHeight - m) y = innerHeight - m - h;
  el.style.left = `${Math.max(m, Math.min(x, innerWidth - hoger - b))}px`;
  el.style.top = `${Math.max(topp + m, y)}px`;
}
function skriv(sd: Sida, id: FlikId | undefined, force: boolean) {
  sd.el.hidden = !id;
  if (sd.el.dataset.flik !== (id ?? '')) sd.el.dataset.flik = id ?? ''; // fliken styr bredden (lagret, steg 9.2.97)
  if (!id) { sd.html = ''; return; }
  if (!force && (ui.busy || performance.now() - ui.lastPointer < 800 || sd.musOver)) return;
  const html = bandHtml(ALLA[id].band?.() ?? id) + ALLA[id].html(); // bandet överst i fliken (steg 5.3.3.1)
  if (!force && html === sd.html) return;
  sd.html = html; sd.body.innerHTML = html;
}
satRitaOm(() => renderPanel(true));
// bakåtknappen (steg 6.9.5): panelerna minns vad man tittat på. Det som bestämmer vad panelerna visar sparas när det ändras,
// och ← (bredvid krysset) går tillbaka ett steg, så att man kommer tillbaka till personen, fliken eller saken man såg
const VY = ['tab', 'hoger', 'selected', 'styreDel', 'omvDel', 'personDel', 'eld', 'husId', 'stationId', 'sjoNr', 'faltId', 'faltRuta', 'hogAt', 'filtAt', 'framNr', 'matchNr', 'byteNr', 'djurId', 'sak', 'lagerNr'] as const;
const BAKAT_MAX = 30;
const bakat: string[] = [];
let vyNu = '';
vidNyBy.push(() => { bakat.length = 0; vyNu = ''; }); // en ny by har inget att gå tillbaka till
const vyAv = () => JSON.stringify(VY.map(k => ui[k]));
function minnsVy() {
  const v = vyAv();
  if (v === vyNu) return;
  if (vyNu) { bakat.push(vyNu); if (bakat.length > BAKAT_MAX) bakat.shift(); }
  vyNu = v;
}
export function tillbaka() {
  const v = bakat.pop();
  if (!v) return;
  const x = JSON.parse(v) as unknown[];
  VY.forEach((k, i) => { (ui as Record<string, unknown>)[k] = x[i] ?? undefined; });
  vyNu = v; flytta = ärRuta(ui.tab);
  renderPanel(true); renderPorts();
}
export function renderPanel(force = false) {
  if (ui.hoger && (!ALLA[ui.hoger] || (ALLA[ui.hoger].syns?.() ?? true) === false)) ui.hoger = undefined; // också en flik som inte finns längre (Byn, steg 9.3.1)
  minnsVy();
  for (const b of document.querySelectorAll<HTMLButtonElement>('.panel > .bakat')) b.hidden = !bakat.length;
  for (const b of nav.querySelectorAll<HTMLButtonElement>('button')) {
    const id = b.dataset.tab as FlikId;
    b.setAttribute('aria-selected', String(id === ui.hoger));
    // en flik som inte går att öppna än står kvar som en blek sten (steg 5.3.3.1)
    const kan = ALLA[id].syns?.() ?? true;
    if (b.disabled === kan) { b.disabled = !kan; b.title = kan ? ALLA[id].namn : `${ALLA[id].namn}: går inte att öppna än`; }
  }
  const vanster = ui.tab === 'person' || (ärRuta(ui.tab) && ui.selected !== undefined) ? 'person' : undefined;
  document.body.classList.toggle('vOppen', !!vanster);
  document.body.classList.toggle('hOppen', !!ui.hoger); // kartans knappar flyttar till vänster om den högra panelen (steg 5.3.6)
  renderOwned();
  skriv(SIDOR.v, vanster, force);
  skriv(SIDOR.h, ui.hoger, force);
  const dold = SIDOR.r.el.hidden;
  skriv(SIDOR.r, ärRuta(ui.tab) ? ui.tab : undefined, force);
  if ((flytta || dold) && !SIDOR.r.el.hidden) { flytta = false; placeraRuta(); }
}
// musen står över något i en panel som förklaras när man håller musen över det: då skrivs panelen inte om, så att
// förklaringen och markeringen står kvar (steg 2.3.7)
for (const sd of Object.values(SIDOR)) {
  sd.body.addEventListener('pointerover', e => { sd.musOver = !!(e.target as Element).closest('[title], [data-i], title'); });
  sd.body.addEventListener('pointerleave', () => { sd.musOver = false; });
}
document.addEventListener('pointerdown', e => {
  ui.lastPointer = performance.now();
  if (!SIDOR.r.el.contains(e.target as Node)) tryck = { x: e.clientX, y: e.clientY };
}, true);
document.addEventListener('click', e => {
  const el = e.target as HTMLElement;
  // förklaringen i en bubbla (steg 9.2.68): ett tryck på det som inte öppnar något visar den, och nästa tryck stänger den
  if (bubblaKlick(el) && !el.closest(OPPNAR)) return;
  if (el.closest('.panel > .bakat')) { tillbaka(); return; }
  const x = el.closest<HTMLElement>('[data-stang]');
  if (x) { stang(x.dataset.stang as 'v' | 'h' | 'r'); return; }
  const b = el.closest<HTMLElement>('[data-id]');
  if (b) { selectPerson(Number(b.dataset.id)); return; }
  if (hjalpKlick(el)) { renderPanel(true); return; }
  if (el.closest('[data-kvsort]')) { ui.kvSort = !ui.kvSort; renderPanel(true); return; } // stackarna efter kvalitet (steg 9.2.18)
  for (const id of IDS) if (ALLA[id].klick?.(el)) { renderPanel(true); return; }
  const tb = el.closest<HTMLElement>('.tabs button');
  if (tb) { const id = tb.dataset.tab as FlikId; if (ui.hoger === id) stang('h'); else visa(id); }
});

// listan till vänster över allt i förrådet, i mappar som kan fällas ihop: en sak per rad, symbolen och antalet, namnet när musen är över.
// Förrådet har ingen egen runsten: rikedomen överst i sidhuvudet är knappen som öppnar och stänger det (steg 5.3.3.4)
$('calRik').addEventListener('click', () => {
  const oppna = !document.body.classList.contains('forradOppen');
  document.body.classList.toggle('forradOppen', oppna); $('calRik').setAttribute('aria-expanded', String(oppna));
  if (oppna && (ui.tab === 'person' || ui.selected !== undefined)) stang('v'); // listan står där personens panel står
});
const closed = new Set<string>();
let ownedKey = '';
// namnet, hur mycket som är byns och invånarnas egna (egendom.ts), och värdet (varde.ts)
function tipOf(k: string, n: number) {
  const eg = Math.min(n, ownedSum(s, k)), r = (v: number) => Math.round(v), v = grundvarde(k);
  const namn = eg >= 0.5 ? `${sakNamn(k)}: byns ${r(n - eg)}, invånarnas egna ${r(eg)}` : sakNamn(k);
  return v ? `${namn}&#10;⚖ ${kortTal(v)} styck, ${kortTal(wornOf(s, k) * v)} allt efter skicket` : namn;
}
function renderOwned() {
  const rows = FOLDERS.map(f => ({ f, ks: f.k.map(k => ({ k, n: amountOf(s, k) })).filter(r => r.n >= (isTool(r.k) ? 1e-6 : 0.5)) })).filter(r => r.ks.length);
  const ute = piles().filter(p => !p.stored);
  const html = `<h4>Förrådet</h4>${rows.map(({ f, ks }) => {
    const sum = f.summa ? ` <span class="n">${Math.round(ks.reduce((a, r) => a + r.n, 0))}</span>` : '';
    return `<button type="button" class="fold" data-f="${f.namn}" aria-expanded="${!closed.has(f.namn)}">${closed.has(f.namn) ? '▸' : '▾'} ${f.namn}${sum}</button>${closed.has(f.namn) ? '' : `<ul>${ks.map(r => `<li class="klick" data-sak="k:${r.k}" title="${tipOf(r.k, r.n)}" tabindex="0" role="button">${iconImg(r.k)}<span class="n">${isTool(r.k) ? Math.ceil(r.n - 1e-9) : Math.max(1, Math.round(r.n))}</span></li>`).join('')}</ul>`}`;
  }).join('') || '<p>Inget ännu</p>'}${ute.length ? `<p class="ute">${ute.length} ${ute.length === 1 ? 'hög' : 'högar'} på marken</p>` : ''}`;
  if (html === ownedKey) return;
  ownedKey = html; $('owned').innerHTML = html;
}
$('owned').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button.fold');
  if (!b) return;
  const f = b.dataset.f!; if (closed.has(f)) closed.delete(f); else closed.add(f);
  renderOwned();
});
