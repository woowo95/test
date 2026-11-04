import { FOLDERS, amountOf, grundvarde, isTool, kortTal, ownedSum, sakNamn, wornOf } from '../sim';
import { iconImg } from '../ikoner';
import { eld } from './flikar/eld';
import { folk, logg } from './flikar/folk';
import { hog, lager } from './flikar/lager';
import { hus } from './flikar/hus';
import { sjo } from './flikar/sjo';
import { falt } from './flikar/falt';
import { station } from './flikar/station';
import { person } from './flikar/person';
import { seder } from './flikar/seder';
import { teknik } from './flikar/teknik';
import { sak } from './flikar/sak';
import { filt } from './flikar/filt';
import { djur } from './flikar/djur';
import { grannar } from './flikar/grannar';
import { styre } from './flikar/styre';
import { religion } from './flikar/religion';
import { $, hjalpKlick } from './hjalp';
import { piles, s, ui } from './lage';
import { renderPorts } from './portratt';
import { bandHtml, stenHtml } from './runstenar';

// panelerna: flikarna och listan över allt byn äger.
// En ny flik: en fil i flikar/ som exporterar en Flik, och en rad i FLIKAR nedan. Knappen skapas av sig själv
export interface Flik {
  namn: string; // texten på flikknappen
  knapp?: string; // visas under en annan flikknapp i stället för en egen (elden, lagret och högen öppnas från kartan)
  html(): string; // innehållet; byggs om ett par gånger i sekunden
  klick?(el: HTMLElement): boolean; // tryck i sidan som fliken tar hand om, även när den inte är öppen; true = klart
  syns?(): boolean; // knappen visas bara när detta är sant (styret när byn haft en ledare, steg 3.5.4)
}
const FLIKAR = { folk, logg, person, eld, lager, hog, hus, station, sjo, falt, seder, styre, religion, grannar, teknik, sak, djur, filt } satisfies Record<string, Flik>;
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
export function visa(id: FlikId) { if (ärPersonflik(id)) ui.tab = id; else ui.hoger = id; renderPanel(true); }
export function selectPerson(id: number) { ui.selected = id; ui.tab = 'person'; renderPanel(true); renderPorts(); }
function stang(sida: 'v' | 'h') {
  if (sida === 'h') ui.hoger = undefined;
  else { ui.tab = undefined; ui.selected = undefined; }
  renderPanel(true); renderPorts();
}

// en panel och det som senast skrevs i den: är det samma skrivs det inte om (markering, musen över och fokus står kvar)
interface Sida { el: HTMLElement; body: HTMLElement; html: string; musOver: boolean }
const SIDOR: Record<'v' | 'h', Sida> = {
  v: { el: $('vPanel'), body: $('vBody'), html: '', musOver: false },
  h: { el: $('hPanel'), body: $('panelBody'), html: '', musOver: false },
};
function skriv(sd: Sida, id: FlikId | undefined, force: boolean) {
  sd.el.hidden = !id;
  if (!id) { sd.html = ''; return; }
  if (!force && (ui.busy || performance.now() - ui.lastPointer < 800 || sd.musOver)) return;
  const html = bandHtml(id) + ALLA[id].html(); // bandet överst i fliken (steg 5.3.3.1)
  if (!force && html === sd.html) return;
  sd.html = html; sd.body.innerHTML = html;
}
export function renderPanel(force = false) {
  if (ui.hoger && (ALLA[ui.hoger].syns?.() ?? true) === false) ui.hoger = undefined;
  for (const b of nav.querySelectorAll<HTMLButtonElement>('button')) {
    const id = b.dataset.tab as FlikId;
    b.setAttribute('aria-selected', String(id === ui.hoger));
    // en flik som inte går att öppna än står kvar som en blek sten (steg 5.3.3.1)
    const kan = ALLA[id].syns?.() ?? true;
    if (b.disabled === kan) { b.disabled = !kan; b.title = kan ? ALLA[id].namn : `${ALLA[id].namn}: går inte att öppna än`; }
  }
  document.body.classList.toggle('vOppen', !!ui.tab);
  renderOwned();
  skriv(SIDOR.v, ui.tab, force);
  skriv(SIDOR.h, ui.hoger, force);
}
// musen står över något i en panel som förklaras när man håller musen över det: då skrivs panelen inte om, så att
// förklaringen och markeringen står kvar (steg 2.3.7)
for (const sd of Object.values(SIDOR)) {
  sd.body.addEventListener('pointerover', e => { sd.musOver = !!(e.target as Element).closest('[title], [data-i], title'); });
  sd.body.addEventListener('pointerleave', () => { sd.musOver = false; });
}
document.addEventListener('pointerdown', () => { ui.lastPointer = performance.now(); }, true);
document.addEventListener('click', e => {
  const el = e.target as HTMLElement;
  const x = el.closest<HTMLElement>('[data-stang]');
  if (x) { stang(x.dataset.stang as 'v' | 'h'); return; }
  const b = el.closest<HTMLElement>('[data-id]');
  if (b) { selectPerson(Number(b.dataset.id)); return; }
  if (hjalpKlick(el)) { renderPanel(true); return; }
  for (const id of IDS) if (ALLA[id].klick?.(el)) { renderPanel(true); return; }
  const tb = el.closest<HTMLElement>('.tabs button');
  if (tb) { const id = tb.dataset.tab as FlikId; if (ui.hoger === id) stang('h'); else visa(id); }
});

// listan till vänster över allt i förrådet, i mappar som kan fällas ihop: en sak per rad, symbolen och antalet, namnet när musen är över
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
    return `<button type="button" class="fold" data-f="${f.namn}" aria-expanded="${!closed.has(f.namn)}">${closed.has(f.namn) ? '▸' : '▾'} ${f.namn}${sum}</button>${closed.has(f.namn) ? '' : `<ul>${ks.map(r => `<li title="${tipOf(r.k, r.n)}">${iconImg(r.k)}<span class="n">${isTool(r.k) ? Math.ceil(r.n - 1e-9) : Math.max(1, Math.round(r.n))}</span></li>`).join('')}</ul>`}`;
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
