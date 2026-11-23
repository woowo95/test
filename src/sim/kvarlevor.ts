// Det som blir kvar av en människa (steg 8.2.3 och 8.5.1): en avhuggen kroppsdel eller en död kropp, som en sak på rutan där det
// hände. Registret KVARLEVOR: en rad per slag. Allt ruttnar som maten (`haller`, dygn), och den som ser det får en tanke
// (`se`, svagare för en kroppsdel än för en kropp).
import { DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { alive, byId, isParent, living, relKey } from './folk';
import { upplev } from './uppvaxt';
import { klanById } from './klaner';
import { klanHandelse } from './byrel';
import { tanke } from './tankar';

export const KVAR = balans('kvar', {
  seR: 4, // så många rutor bort ser man det
  seTim: 6, // så länge sitter tanken i (timmar i spelet)
  nara: 2.5, // ... och så mycket mer för den som stod den döda nära
});
export interface KvarDef { namn: string; ikon: string; haller: number; se: number; tanke: string }
export const KVARLEVOR = {
  del: { namn: 'Kroppsdel', ikon: 'kroppsdel', haller: 4, se: -0.04, tanke: 'Såg en avhuggen kroppsdel' },
  fiende: { namn: 'Fallen fiende', ikon: 'dodkropp', haller: 6, se: -0.03, tanke: 'Såg en fallen fiende' }, // steg 8.7.5
  kropp: { namn: 'Död kropp', ikon: 'dodkropp', haller: 8, se: -0.1, tanke: 'Såg en död kropp' },
  framling: { namn: 'Död främling', ikon: 'dodkropp', haller: 8, se: -0.05, tanke: 'Såg en död främling' }, // en gäst som dött (steg 10.4.13)
  skandad: { namn: 'Skändad kropp', ikon: 'skandad', haller: 8, se: -0.2, tanke: 'Såg en skändad kropp' }, // lagd åt djuren eller vid stigen (steg 10.4.13)
} satisfies Record<string, KvarDef>;
export type KvarSlag = keyof typeof KVARLEVOR;
export const gravAt = (s: State, x: number, y: number) => s.gravar?.find(g => g.x === x && g.y === y);
export type GravStil = 'jord' | 'bal' | 'vatten'; // gravhögen är en vård (steg 10.4.2)
export type GravVard = 'gravstolpe' | 'gravbrada' | 'stockram' | 'gravhus' | 'gravhog' | 'gravsten' | 'stensattning' | 'skeppssattning';
// en sak som ligger i eller på en grav (steg 13.1.3): en vanlig sak med sitt antal, skick och sin kvalitet, och den döda som ägare.
// t = när den lades där (maten ruttnar efter det)
export interface GravSak { k: string; n: number; c: number; q?: number; ber?: import('./berattelser').SakMinne; t: number }
export interface Grav { saker?: GravSak[]; x: number; y: number; t: number; vem: number; namn: string; stil: GravStil; tro?: number; ovardig?: true; med?: string[]; vard?: GravVard; stor?: true; fiende?: true; text?: string; textAv?: { id: number; namn: string }; textBev?: import('./rykten').Bevis[]; gavor?: number; lagad?: number } // gavor = gåvorna som lagts på graven, lagad = när den senast lagades (steg 10.4.8); med = sakerna som följde den döde (steg 10.3.5); vard = det som står på graven, stor = ledare, helgon eller legend (steg 10.4.2); text = gravtexten, vem som ristade och händelserna (steg 10.4.4)
export interface Kvarleva { gods?: GravSak[]; /* det som följer den döda i graven (steg 13.1.3) */ id: number; k: KvarSlag; x: number; y: number; t: number; vem: number; namn: string; text: string; bars?: number; saker?: Record<string, number>; med?: string[]; ting?: { k: string; c: number; q?: number; ber?: import('./berattelser').SakMinne }[]; bud?: string[]; naraT?: number; annanT?: number; vag?: 'bal' | 'vatten' | 'jord'; ode?: import('./grav').OdeId; utburen?: true; vaka?: number; klaner?: number[]; grav?: { x: number; y: number; del: number; hel: number } } // klaner = de klaner vars gäster sett den skändade kroppen (steg 10.4.13); grav = den halvgrävda graven: rutan, hur stor del som är grävd och hela tiden för den som gräver nu // ode = vad som görs med kroppen och utburen = lagd i skogen (steg 10.4.7); ting = fiendens egna vapen och plagg (steg 10.3.6)
export const kvarlevor = (s: State) => (s.kvarlevor ??= []);
export function nyKvarleva(s: State, k: KvarSlag, p: Person, text: string) {
  const q: Kvarleva = { id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k, x: Math.floor(p.x), y: Math.floor(p.y), t: s.now, vem: p.id, namn: p.name, text };
  kvarlevor(s).push(q);
  if (k === 'kropp' || k === 'framling') kroppKrok.f?.(s, q, p);
  return q;
}
// det som görs när en kropp blir kvar (grav.ts, steg 10.4.5): trons seder, buden som gällde och när byn vill begrava hen
export const kroppKrok: { f?: (s: State, q: Kvarleva, p: Person) => void } = {};
export const kvarAt = (s: State, x: number, y: number) => s.kvarlevor?.find(q => q.x === x && q.y === y);
export const kvarById = (s: State, id: number) => s.kvarlevor?.find(q => q.id === id);
// varje timme: det som ruttnat bort försvinner, och den som ser det får en tanke
export function kvarTimme(s: State) {
  if (!s.kvarlevor?.length) return;
  kroppTappad(s);
  s.kvarlevor = s.kvarlevor.filter(q => q.bars !== undefined || s.now - q.t < KVARLEVOR[q.k].haller * DAY);
  for (const q of s.kvarlevor) {
    const d: KvarDef = KVARLEVOR[q.k];
    if (q.bars !== undefined) continue;
    if (q.k === 'skandad') { for (const p of s.people) if (p.died === undefined && p.ute === undefined && p.id !== q.vem && Math.hypot(p.x - q.x, p.y - q.y) <= KVAR.seR) sagSkandad(s, p, q); continue; }
    for (const p of living(s)) if (p.id !== q.vem && Math.hypot(p.x - q.x, p.y - q.y) <= KVAR.seR) {
      const nar = nara(s, p, q.vem); // mer för den som stod den döda nära (steg 8.5.1)
      { const o = { v: d.se * (nar ? KVAR.nara : 1), tid: KVAR.seTim * HOUR }; if (nar) tanke(p, 'sagLigga', s.now, { namn: q.namn, ...o }); else tanke(p, 'sagKvar', s.now, { text: d.tanke, ...o }); };
      if ((q.k === 'kropp' || q.k === 'framling') && !p.sedDod?.includes(q.vem)) { (p.sedDod ??= []).push(q.vem); upplev(s, p, 'sagDod', q.namn); } // en av upplevelserna som flyttar andligheten (steg 8.5.4)
    }
  }
}


// att se en skändad kropp eller skändningen (steg 10.4.13): tanken, en gång upplevelsen, och en gäst gör sin klan ovänligare, en gång per kropp och klan
export function sagSkandad(s: State, p: Person, q: Kvarleva) {
  if (p.gast) {
    const k = klanById(s, p.gast!.klan);
    if (k && !q.klaner?.includes(k.id)) { (q.klaner ??= []).push(k.id); klanHandelse(s.varld, k, 'skandad'); }
    return;
  }
  const nar = nara(s, p, q.vem);
  { const o = { v: KVARLEVOR.skandad.se * (nar ? KVAR.nara : 1), tid: KVAR.seTim * HOUR }; if (nar) tanke(p, 'sagSkandas', s.now, { namn: q.namn, ...o }); else tanke(p, 'sagKvar', s.now, { text: KVARLEVOR.skandad.tanke, ...o }); };
  if (!p.sedSkand?.includes(q.id)) { (p.sedSkand ??= []).push(q.id); upplev(s, p, 'sagSkandad', q.namn); }
}
export const nara = (s: State, p: Person, id: number) => { const d = byId(s, id); return !!d && (p.partner === id || isParent(p, d) || isParent(d, p) || (s.rels[relKey(p.id, id)]?.op ?? 0) > 40); };
// bäraren avbröts: kroppen läggs ner där hen är
export function kroppTappad(s: State) {
  for (const q of s.kvarlevor ?? []) if (q.bars !== undefined) { const b = byId(s, q.bars); if (!b || !alive(b) || b.task?.ref !== q.id || b.task?.act !== 'grava') { if (b) { q.x = Math.floor(b.x); q.y = Math.floor(b.y); } q.bars = undefined; q.t = s.now; } }
}
