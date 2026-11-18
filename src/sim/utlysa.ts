// ---------- egna byn utlyser (steg 11.8.11–11.8.12, Flera samhällen: Uppdragen i tal) ----------
// Den som förlorat något eller någon lägger undan en belöning ur det hen har över och utlyser ett uppdrag. Det hen har över är
// det hen äger i förrådet utom maten; belöningen tas silvret först och sedan det som är värt mest, i hela saker, och den är
// borta ur förrådet tills någon klarat uppdraget (då får finnaren den) eller tiden är ute (då går den tillbaka, uppdrag.ts).
// Den som förlorat någon är den anhöriga till ett saknat sällskap (vilsegang.ts). Den som förlorat något är den som blivit rånad
// på vägen: rövarna behåller det värdefulla i sitt läger (vaktat.ts), och den som ägde det (insatsen i resans bok) lägger undan
// UTLYSA.andel av sakernas värde, så långt det hen har över räcker, när hen kommit hem, och utlyser det vaktade föremålet.
// Var det byns saker (det som rövarna tog när de plundrade byn, byns insatser och den saknade som ingen anhörig saknar) är det
// styrets sak: det står i byns nöd (Varlden.nod) tills styret utlyser det. Med skattelagen har budgeten delen Uppdrag, som
// saknar UTLYSA.styre av nödens värde i silver; det delen får läggs undan och utlyses, och ledaren vet om det
import { balans } from './balans';
import { BUDGET, BUDGET_LIST } from './budget';
import { alive, count } from './folk';
import { ownedStock, use } from './lager';
import { byPlats } from './landmarken';
import { radNr } from './radtal';
import { HEMKROK } from './resa';
import { isFood } from './saker';
import { ledareOf } from './styre';
import { belonVarde, larUppdrag, UppdragId, uppdragen, UPPDRAGTAL, utlys } from './uppdrag';
import { behalls, PLUNDRADKROK } from './vaktat';
import { VAKTKROK } from './vagran';
import { grundvarde } from './varde';
import type { Varlden } from './varlden';
import { DAY, Person, State } from './typer';

export const UTLYSA = balans('utlysa', {
  andel: 0.5, // den som blivit rånad lägger undan så stor del av det förlorades värde ...
  styre: 0.5, // ... och styret så stor del av byns förlust (i silver)
});

// det p har över: det hen äger i förrådet utom maten, i hela saker
export function harOver(s: State, p: Person): [string, number][] {
  return Object.entries(ownedStock(s, p)).filter(([k, n]) => !isFood(k) && Math.floor(n) >= 1 && grundvarde(k) > 0).map(([k, n]) => [k, Math.floor(n)] as [string, number]);
}
export const overVarde = (s: State, p: Person) => harOver(s, p).reduce((a, [k, n]) => a + n * grundvarde(k), 0);
// p lägger undan en belöning värd högst mal (grundvärde) ur det hen har över: silvret först, sedan det som är värt mest
export function laggUndan(s: State, p: Person, mal: number): Record<string, number> {
  const ut: Record<string, number> = {};
  let v = 0;
  for (const [k, n] of harOver(s, p).sort((a, b) => (b[0] === 'silver' ? 1 : 0) - (a[0] === 'silver' ? 1 : 0) || grundvarde(b[0]) - grundvarde(a[0]) || a[0].localeCompare(b[0]))) {
    const m = Math.min(n, Math.floor((mal - v) / grundvarde(k)));
    if (m < 1) continue;
    use(s, undefined, k, m, true, p.id);
    ut[k] = m; v += m * grundvarde(k);
  }
  return ut;
}

// ---------- den som förlorat något (steg 11.8.11) ----------
// de rånade minns vad rövarna behöll: ägaren är den vars insats har saken (mest av den), annars byn
VAKTKROK.forlorat = (_s, sl, L, tog) => {
  for (const [k, n] of tog) {
    if (!behalls(k) || n < 1) continue;
    const ins = sl.insatser.filter(i => i.sak === k).sort((a, b) => b.n - a.n)[0];
    (sl.forlust ??= []).push([ins?.agare ?? 'by', n * grundvarde(k), L.nr]);
  }
};
// hemma: var och en som förlorat något utlyser det vaktade föremålet, en gång per läger
HEMKROK.f = (s, sl, t) => {
  const vl = s.varld;
  if (!vl || !sl.forlust?.length) return;
  const per = new Map<string, { ag: number | 'by'; v: number; L: number }>();
  for (const [ag, v, L] of sl.forlust) { const key = `${ag}:${L}`, x = per.get(key); if (x) x.v += v; else per.set(key, { ag, v, L }); }
  delete sl.forlust;
  for (const { ag, v, L } of per.values()) {
    const q = byPlats(vl, L), r = radNr(vl, L);
    if (!q || !r?.stulet) continue;
    if (ag === 'by') { styretNod(vl, { k: 'vaktat', mal: q.nr, varde: v, t }); continue; }
    const p = s.people.find(x => x.id === ag);
    if (!p || !alive(p) || uppdragen(vl).some(u => u.k === 'vaktat' && u.mal === q.nr && u.av.person === p.id)) continue;
    const belon = laggUndan(s, p, UTLYSA.andel * v);
    if (!Object.keys(belon).length) { count(s, 'utlysa inget över'); continue; }
    const u = utlys(vl, 'vaktat', q.nr, { k: 'person', person: p.id }, belon, t);
    if (u) { larUppdrag(s, p, u.id, 1, { t, v: belonVarde(u), mal: u.mal, k: 'vaktat' }); count(s, 'utlysa person'); }
  }
};

// ---------- styret utlyser (steg 11.8.12) ----------
// byns nöd: det byn förlorat som ingen enskild utlyser, tills styret gör det eller nöden är för gammal (UPPDRAGTAL.tid)
export interface Nod { k: UppdragId; mal: number; om?: number; varde: number; t: number }
export function styretNod(vl: Varlden, n: Nod) { (vl.nod ??= []).push(n); }
export const nodNu = (s: State): Nod[] => { const vl = s.varld; if (!vl?.nod) return []; vl.nod = vl.nod.filter(n => s.now - n.t < UPPDRAGTAL.tid * DAY); if (!vl.nod.length) delete vl.nod; return vl.nod ?? []; };
// byn plundrades: det värdefulla rövarna behöll var byns
PLUNDRADKROK.f = (s, L, tog) => {
  const vl = s.varld, q = vl && byPlats(vl, L.nr), v = tog.filter(([k]) => behalls(k)).reduce((a, [k, n]) => a + n * grundvarde(k), 0);
  if (vl && q && v > 0) styretNod(vl, { k: 'vaktat', mal: q.nr, varde: v, t: s.now });
};
// budgetens del: det den får (silver) delas på nöden efter värdet, i hela saker, och utlyses
BUDGET.uppdrag = {
  namn: 'Uppdrag', sym: '📜', text: 'Belöningar för det byn förlorat: det rövarna tog och de saknade som ingen anhörig letar efter',
  finns: s => nodNu(s).length > 0,
  saknar: s => { const v = nodNu(s).reduce((a, n) => a + n.varde, 0), m = Math.floor(UTLYSA.styre * v / grundvarde('silver')); const ut: Record<string, number> = {}; if (m >= 1) ut.silver = m; return ut; },
  ge: (s, k, n) => {
    const vl = s.varld, nod = nodNu(s), sum = nod.reduce((a, x) => a + x.varde, 0), led = ledareOf(s);
    if (!vl || !nod.length || sum <= 0) return;
    for (const x of nod) {
      const m = Math.floor(n * x.varde / sum + 1e-9);
      if (m < 1) continue;
      use(s, undefined, k, m, true);
      const u = utlys(vl, x.k, x.mal, { k: 'styre' }, { [k]: m }, s.now, x.om !== undefined ? { om: x.om } : {});
      if (!u) continue;
      if (led) larUppdrag(s, led, u.id, 1, { t: s.now, v: belonVarde(u), mal: u.mal, k: u.k });
      count(s, 'utlysa styret');
    }
    delete vl.nod;
  },
  vill: () => 0.5,
};
if (!BUDGET_LIST.includes('uppdrag')) BUDGET_LIST.push('uppdrag');
