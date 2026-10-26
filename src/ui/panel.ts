import { FOLDERS, amountOf, grundvarde, isTool, kortTal, ownedSum, sakNamn, wornOf } from '../sim';
import { iconImg } from '../ikoner';
import { eld } from './flikar/eld';
import { folk, logg } from './flikar/folk';
import { hog, lager } from './flikar/lager';
import { hus } from './flikar/hus';
import { person } from './flikar/person';
import { seder } from './flikar/seder';
import { teknik } from './flikar/teknik';
import { $, hjalpKlick } from './hjalp';
import { piles, s, ui } from './lage';
import { renderPorts } from './portratt';

// panelen till höger: flikarna och listan över allt byn äger.
// En ny flik: en fil i flikar/ som exporterar en Flik, och en rad i FLIKAR nedan. Knappen skapas av sig själv
export interface Flik {
  namn: string; // texten på flikknappen
  knapp?: string; // visas under en annan flikknapp i stället för en egen (elden, lagret och högen öppnas från kartan)
  html(): string; // innehållet; byggs om ett par gånger i sekunden
  klick?(el: HTMLElement): boolean; // tryck i sidan som fliken tar hand om, även när den inte är öppen; true = klart
}
const FLIKAR = { folk, logg, person, eld, lager, hog, hus, seder, teknik } satisfies Record<string, Flik>;
export type FlikId = keyof typeof FLIKAR;
const ALLA: Record<FlikId, Flik> = FLIKAR;
const IDS = Object.keys(FLIKAR) as FlikId[];

// flikknapparna: en för varje flik som inte visas under en annan
const nav = document.querySelector<HTMLElement>('.tabs')!;
nav.innerHTML = IDS.filter(id => !ALLA[id].knapp).map(id => `<button type="button" role="tab" data-tab="${id}" aria-selected="false">${ALLA[id].namn}</button>`).join('');

export function visa(id: FlikId) { ui.tab = id; renderPanel(true); }
// flikarna som visas under personknappen (personen, elden, lagret, högen, huset): ett tryck på tom mark stänger dem
export const ärPersonflik = (id: FlikId) => (ALLA[id].knapp ?? id) === 'person';
export function selectPerson(id: number) { ui.selected = id; ui.tab = 'person'; renderPanel(true); renderPorts(); }

// det som senast skrevs i panelen: är det samma skrivs det inte om (markering, musen över och fokus står kvar)
let panelHtml = '';
export function renderPanel(force = false) {
  const cur = ALLA[ui.tab], under = cur.knapp ?? ui.tab;
  for (const b of nav.querySelectorAll<HTMLButtonElement>('button')) {
    const id = b.dataset.tab as FlikId;
    b.setAttribute('aria-selected', String(id === under));
    b.textContent = id === under ? cur.namn : ALLA[id].namn;
  }
  renderOwned();
  if (!force && (ui.busy || performance.now() - ui.lastPointer < 800)) return;
  const html = cur.html();
  if (!force && html === panelHtml) return;
  panelHtml = html; $('panelBody').innerHTML = html;
}
document.addEventListener('pointerdown', () => { ui.lastPointer = performance.now(); }, true);
document.addEventListener('click', e => {
  const el = e.target as HTMLElement;
  const b = el.closest<HTMLElement>('[data-id]');
  if (b) { selectPerson(Number(b.dataset.id)); return; }
  if (hjalpKlick(el)) { renderPanel(true); return; }
  for (const id of IDS) if (ALLA[id].klick?.(el)) { renderPanel(true); return; }
  const tb = el.closest<HTMLElement>('.tabs button');
  if (tb) visa(tb.dataset.tab as FlikId);
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
