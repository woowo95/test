// ---------- det vaktade föremålet (steg 11.13.27, Flera samhällen: Uppdragen i tal) ----------
// Ett rövarläger behåller det värdefulla det tar som det är: en sak värd minst VAKTAT.minVarde (grundvärde), som inte är mat,
// silver eller ett levande djur, läggs i lägrets stulna saker (VarldRad.stulet) i stället för i radens varor. Det gäller allt
// lägret tar, på vägen (vagran.ts) och när en flock kommer hem med byte. Den som blivit rånad på vägen vet var rövarna kom ifrån
// och minns det som ett fynd (fyndId för lägrets plats, sorten vaktat) med värdet av det som tagits, och huvudbyns ledare får
// veta det när en flock från lägret plundrat byn. Det berättas och väger som mål för en resa som andra fynd. När sällskapet kommer
// fram vaktas sakerna av en del av lägrets folk (VAKTAT.vakter), och ledaren väljer det som kostar minst: att smyga in (chansen
// efter sällskapets smidighet och hur många som vaktar, och misslyckas det blir det strid), att köpa tillbaka sakerna (för
// VAKTAT.pris gånger värdet, ur packningen), att slåss (med stridens regler, som på vägen) eller att gå därifrån (det man förlorar
// är sakernas värde). Den lilla kartan för lägret (vacktplats.ts) visar sakerna som är kvar
import { balans } from './balans';
import { count, stat } from './folk';
import { byPlats } from './landmarken';
import { ledareOf } from './styre';
import { radTar, radTarKrok } from './priser';
import { radNr, VarldRad } from './radtal';
import { resenarer, Sallskap, UPPDRAGFRAM } from './resa';
import { isFood, SAKER } from './saker';
import { clamp, rnd } from './slump';
import { avslutaUppdrag, fyndId, larUppdrag, uppdragen } from './uppdrag';
import { grundvarde } from './varde';
import { lista, packVarde, rovarKampe, taUrPack, VAKTKROK, vagStrid, vagValen } from './vagran';
import { kanGa } from './halsa';
import { anfallUtr, BYANFALL } from './radanfall';
import { State } from './typer';
import type { Varlden } from './varlden';

export const VAKTAT = balans('vaktat', {
  minVarde: 10, // en sak värd minst så mycket (grundvärde) behåller rövarna som den är
  vakter: 0.5, // så stor del av lägrets folk vaktar sakerna (minst en)
  smyg: 0.5, // chansen att smyga in för ett sällskap med lagom smidighet (10) mot en vakt ...
  smygVikt: 0.3, // ... så mycket mer per 10 smidighet över det ...
  smygHalv: 4, // ... och chansen halveras för varje så många vakter
  pris: 1.5, // rövarna säljer tillbaka sakerna för så många gånger värdet
});

export const behalls = (k: string) => k !== 'silver' && !isFood(k) && !k.startsWith('lev') && !!SAKER[k] && grundvarde(k) >= VAKTAT.minVarde;
radTarKrok.behall = (r, k, n) => {
  if (r.sort !== 'rovarlager' || !behalls(k)) return false;
  (r.stulet ??= {})[k] = (r.stulet[k] ?? 0) + Math.floor(n);
  return true;
};
export const stulVarde = (r: VarldRad) => Object.entries(r.stulet ?? {}).reduce((a, [k, n]) => a + n * grundvarde(k), 0);
// lägret vid platsen nr, om det står och har något stulet
export function lagerVid(vl: Varlden, nr: number): VarldRad | undefined {
  const p = vl.platser?.find(q => q.nr === nr), r = p?.k === 'rovarlager' && p.by !== undefined ? radNr(vl, p.by) : undefined;
  return r && r.sort === 'rovarlager' ? r : undefined;
}
// p vet att lägret L har det stulna (fyndet med lägrets plats), med värdet som det ser ut nu
export function saStulet(s: State, vl: Varlden, p: import('./typer').Person, L: VarldRad, t: number, c = 1) {
  const q = byPlats(vl, L.nr);
  if (!q) return;
  const v = Math.round(stulVarde(L)), l = larUppdrag(s, p, fyndId(q.nr), c, { t, v, mal: q.nr, k: 'vaktat' });
  l.v = v; l.t = t; l.c = Math.max(l.c, c);
  count(s, 'vaktat_vet');
}
// de rånade på vägen vet var rövarna kom ifrån (vagran.ts anropar efter att bytet gått till lägret)
VAKTKROK.ranad = (s, sl, L, t) => ranadesAv(s, sl, L, t);
VAKTKROK.plundrad = (s, L, tog) => { plundradAv(s, L); PLUNDRADKROK.f?.(s, L, tog); };
export const PLUNDRADKROK: { f?: (s: State, L: VarldRad, tog: [string, number][]) => void } = {}; // byns saker som lägret tog: styret utlyser (steg 11.8.12, utlysa.ts)
export function ranadesAv(s: State, sl: Sallskap, L: VarldRad, t: number) {
  const vl = s.varld;
  if (!vl || !L.stulet) return;
  for (const p of resenarer(s, sl)) saStulet(s, vl, p, L, t);
}
// en flock från ett läger har plundrat huvudbyn: ledaren får veta vart det stulna tog vägen
export function plundradAv(s: State, L: VarldRad) {
  const vl = s.varld, led = ledareOf(s);
  if (vl && led && L.stulet) saStulet(s, vl, led, L, s.now, 0.5);
}

export type VaktVal = 'smyga' | 'kopa' | 'slass' | 'ga';
// det ledaren väntar sig att förlora med varje val (grundvärde), och chansen att smyga in
export function vaktValen(s: State, sl: Sallskap, L: VarldRad): { kost: Record<VaktVal, number>; vakter: number; smyg: number; pris: number } {
  const v = stulVarde(L), vakter = Math.max(1, Math.round(L.tal.folk * VAKTAT.vakter));
  const folk = resenarer(s, sl).filter(p => kanGa(p));
  const smid = folk.length ? folk.reduce((a, p) => a + stat(p, 'smidighet', s.now), 0) / folk.length : 0;
  const smyg = folk.length ? clamp(VAKTAT.smyg + VAKTAT.smygVikt * (smid - 10) / 10, 0.02, 0.95) * 0.5 ** ((vakter - 1) / VAKTAT.smygHalv) : 0;
  const pris = Math.ceil(v * VAKTAT.pris), slass = vagValen(s, sl, vakter * anfallUtr(L), 0).slass;
  return { kost: { smyga: (1 - smyg) * slass, kopa: packVarde(sl) >= pris ? pris - v : Infinity, slass, ga: v }, vakter, smyg, pris };
}
const forst = (k: Record<VaktVal, number>): VaktVal => (['ga', 'kopa', 'smyga', 'slass'] as VaktVal[]).reduce((a, b) => k[b] < k[a] ? b : a);

UPPDRAGFRAM.vaktat = (s, sl, t) => {
  const vl = s.varld, L = vl && lagerVid(vl, sl.mal);
  if (!vl || !L) return undefined;
  const namn = 'Det vaktade föremålet', fick: Record<string, number> = {};
  const klar = (hur: 'klart' | 'tomt' | 'misslyckat', text: string) => {
    if (hur === 'klart') for (const u of uppdragen(vl).filter(x => x.k === 'vaktat' && x.mal === sl.mal)) { for (const [k, n] of Object.entries(u.belon)) fick[k] = (fick[k] ?? 0) + n; u.belon = {}; avslutaUppdrag(s, vl, u, true); } // belöningarna som utlysts för det (steg 11.8.11)
    for (const p of resenarer(s, sl)) saStulet(s, vl, p, L, t);
    return { namn, hur, fick, text };
  };
  if (!L.stulet || L.tal.folk <= 0) { delete L.stulet; return klar('tomt', 'Lägret hade inget kvar av det som stulits.'); }
  const val = vaktValen(s, sl, L), ta = () => { Object.assign(fick, L.stulet); delete L.stulet; };
  let gjort = forst(val.kost);
  count(s, `vaktat ${gjort}`);
  if (gjort === 'ga') return klar('misslyckat', `${val.vakter} rövare vaktade det stulna i ${L.namn}. Det var inte värt striden, och sällskapet gick därifrån.`);
  if (gjort === 'kopa') {
    const tog = taUrPack(sl, val.pris);
    ta();
    for (const [k, n] of tog) radTar(L, k, n); // betalningen går till lägret
    return klar('klart', `Köpte tillbaka det stulna i ${L.namn} för ${lista(tog)}.`);
  }
  if (gjort === 'smyga') {
    if (rnd(s, 'resa') < val.smyg) { ta(); count(s, 'vaktat smog'); return klar('klart', `Smög in i ${L.namn} medan ${val.vakter} rövare vaktade, och kom ut med det stulna.`); }
    gjort = 'slass';
  }
  const u = vagStrid(s, sl, Array.from({ length: val.vakter }, () => rovarKampe(L)), 'rovare', t);
  L.tal.folk = Math.max(0, L.tal.folk - u.doda); L.tal.styrka = Math.max(0, Math.min(L.tal.styrka, L.tal.folk) - u.doda);
  const forst2 = val.kost.smyga < val.kost.slass ? 'Vakterna såg dem. ' : '';
  if (u.vann) { ta(); count(s, 'vaktat vann'); return klar('klart', `${forst2}Sällskapet slogs mot ${val.vakter} rövare i ${L.namn} och vann${u.doda ? `, och ${u.doda} rövare dog` : ''}. De tog tillbaka det stulna.`); }
  const tog = taUrPack(sl, (val.vakter - u.doda) * BYANFALL.bar);
  for (const [k, n] of tog) radTar(L, k, n);
  return klar('misslyckat', `${forst2}Sällskapet slogs mot ${val.vakter} rövare i ${L.namn} och förlorade${tog.length ? `. Rövarna tog ${lista(tog)}` : ''}.`);
};
