import { DAY, State, createState } from '../sim';
import { gammalNyckel, lasEllerFlytta, sparaBy, webbBas } from './lagring';
import { esc } from './hjalp';
import { s, ui } from './lage';

// ---------- flera byar (steg 9.2.16, Flera byar i designdokumentet) ----------
// Spelet sparar flera byar, var och en för sig, i en lista under kugghjulet. Den egna byn (den som följts från start) står
// överst och sparas som förut, i webbläsaren och i molnet (spara.ts); de andra sparas bara i webbläsaren, och historiken i
// molnet hör bara till den egna byn. En by ur testerna (fröet och dygnet) läggs till i testläget, eller med adressen
// #testby=frö:dygn när Björn ber om det i chatten. Bara den valda byn räknas i kapp och sparas; de andra ligger stilla tills
// man byter tillbaka. Den valda byn går i sin egen tid: ui.forskjut är hur långt efter klockan den ligger
const LISTA_KEY = 'samhalle-byar-v1', AKTIV_KEY = 'samhalle-aktiv-v1', byKey = (id: string) => 'samhalle-by-' + id;
export const TEST_START = Date.parse('2026-10-20T08:00:00+02:00'); // testbyarnas start (START i src/test/kor.ts)
export interface ByRad { id: string; namn: string; seed: number; dag: number }
// i webbläsarens databas (lagring.ts, steg 11.2.1): byn i delar, och antingen när den sparades (vagg, datorns tid) eller tiden i
// byn den ska räknas fram till (mal). Förut låg byn som en text (t) i det enkla minnet; den flyttas över första gången
interface Tid { vagg?: number; mal?: number }
interface Sparad extends Tid { t: string }
const las = <T>(k: string): T | undefined => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : undefined; } catch { return undefined; } };
export const byarna = (): ByRad[] => las<ByRad[]>(LISTA_KEY) ?? [];
const sattLista = (l: ByRad[]) => { try { localStorage.setItem(LISTA_KEY, JSON.stringify(l)); } catch { /* ignoreras */ } };
// den valda byn: undefined = den egna
export const aktivBy = () => { try { const v = localStorage.getItem(AKTIV_KEY); return v && byarna().some(b => b.id === v) ? v : undefined; } catch { return undefined; } };
const sattAktiv = (id: string | undefined) => { try { if (id) localStorage.setItem(AKTIV_KEY, id); else localStorage.removeItem(AKTIV_KEY); } catch { /* ignoreras */ } };

// den valda andra byn sparas i webbläsaren (saveLocal i spara.ts). false = det gick inte
export async function sparaAnnan(): Promise<boolean> {
  if (!ui.annanBy || !s) return true;
  try { await sparaBy(webbBas, byKey(ui.annanBy), s, { vagg: Date.now() } satisfies Tid); return true; } catch { return false; }
}
// en annan by ur webbläsaren, och hur långt efter klockan den ligger (ui.forskjut)
async function lasAnnan(id: string): Promise<{ by: State; forskjut: number } | undefined> {
  try {
    const r = await lasEllerFlytta<Tid>(webbBas, byKey(id), gammalNyckel(byKey(id)), txt => { const g = JSON.parse(txt) as Sparad; return { t: g.t, extra: { vagg: g.vagg, mal: g.mal } }; });
    if (!r) return undefined;
    const e = r.extra ?? {};
    return { by: r.by, forskjut: e.vagg !== undefined ? e.vagg - r.by.now : Date.now() - (e.mal ?? r.by.now) };
  } catch { return undefined; }
}

// main.ts ger funktionerna som läser in en by (räknad ikapp) och den egna byn (ur webbläsaren och molnet)
export const byte: { ladda?: (by: State) => Promise<void>; egen?: () => Promise<void>; fore?: () => void } = {};
export async function bytTill(id: string | undefined) {
  if (ui.busy || id === ui.annanBy) return;
  byte.fore?.();
  if (!id) { ui.annanBy = undefined; ui.forskjut = 0; sattAktiv(undefined); await byte.egen?.(); return; }
  const r = await lasAnnan(id);
  if (!r) { ui.byFel = 'Byn gick inte att läsa.'; return; }
  ui.annanBy = id; ui.forskjut = r.forskjut; sattAktiv(id);
  await byte.ladda?.(r.by);
}
// en by ur testerna: samma frö och start som testernas byar (createState(frö, START)), räknad fram till dygnet. Den läggs
// sist i listan och väljs
export async function laggTillTestby(seed: number, dag: number) {
  ui.byFel = '';
  if (!Number.isInteger(seed) || !Number.isInteger(dag) || dag < 0 || dag > 400) { ui.byFel = 'Fröet och dygnet ska vara hela tal (dygnet 0–400).'; return; }
  const id = `t${seed}-${dag}-${Date.now().toString(36)}`, by = createState(seed, TEST_START);
  try { await sparaBy(webbBas, byKey(id), by, { mal: TEST_START + dag * DAY } satisfies Tid); }
  catch { ui.byFel = 'Byn gick inte att spara i webbläsaren: ta bort en by först.'; return; }
  sattLista([...byarna(), { id, namn: `By ${seed}, dygn ${dag}`, seed, dag }]);
  await bytTill(id);
}
export function taBort(id: string) {
  if (id === ui.annanBy) return; // den valda byn tas inte bort; byt först
  gammalNyckel(byKey(id)).glom(); void webbBas.taBort(byKey(id)).catch(() => { /* ignoreras */ });
  sattLista(byarna().filter(b => b.id !== id));
}
// adressen #testby=frö:dygn (när Björn ber om en testby i chatten): byn läggs till och väljs, och adressen töms
export async function testbyIAdressen() {
  const m = /testby=(\d+)[:,](\d+)/.exec(location.hash);
  if (!m) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignoreras */ }
  await laggTillTestby(Number(m[1]), Number(m[2]));
  return true;
}

// listan under kugghjulet: den egna byn överst, sedan de andra med en knapp att ta bort; i testläget raden för en testby
export function byarHtml() {
  const rad = (id: string | undefined, namn: string) => `<li${id === ui.annanBy ? ' class="vald"' : ''}><button type="button" class="ghost" data-by="${id ?? ''}" ${id === ui.annanBy ? 'aria-pressed="true"' : ''}>${id === ui.annanBy ? '▸ ' : ''}${esc(namn)}</button>${id && id !== ui.annanBy ? `<button type="button" class="ghost" data-bort="${id}" title="Ta bort byn ur listan">✕</button>` : ''}</li>`;
  return `<ul class="byar">${rad(undefined, 'Den egna byn')}${byarna().map(b => rad(b.id, b.namn)).join('')}</ul>`
    + (ui.testMode ? `<div class="nyTestby"><input id="tbFro" inputmode="numeric" placeholder="Frö" size="6"><input id="tbDag" inputmode="numeric" placeholder="Dygn" size="4"><button type="button" class="ghost" id="tbLagg" title="Lägg till en by ur testerna, räknad fram till dygnet">+ By ur testerna</button></div>` : '')
    + (ui.byFel ? `<p class="muted">${esc(ui.byFel)}</p>` : '');
}
