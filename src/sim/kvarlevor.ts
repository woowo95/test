// Det som blir kvar av en människa (steg 8.2.3 och 8.5.1): en avhuggen kroppsdel eller en död kropp, som en sak på rutan där det
// hände. Registret KVARLEVOR: en rad per slag. Allt ruttnar som maten (`haller`, dygn), och den som ser det får en tanke
// (`se`, svagare för en kroppsdel än för en kropp).
import { DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { alive, byId, isParent, living, relKey, think } from './folk';
import { upplev } from './uppvaxt';

export const KVAR = balans('kvar', {
  seR: 4, // så många rutor bort ser man det
  seTim: 6, // så länge sitter tanken i (timmar i spelet)
  nara: 2.5, // ... och så mycket mer för den som stod den döda nära
});
export interface KvarDef { namn: string; ikon: string; haller: number; se: number; tanke: string }
export const KVARLEVOR = {
  del: { namn: 'Kroppsdel', ikon: 'kroppsdel', haller: 4, se: -0.04, tanke: 'Såg en avhuggen kroppsdel' },
  kropp: { namn: 'Död kropp', ikon: 'dodkropp', haller: 8, se: -0.1, tanke: 'Såg en död kropp' },
} satisfies Record<string, KvarDef>;
export type KvarSlag = keyof typeof KVARLEVOR;
export const gravAt = (s: State, x: number, y: number) => s.gravar?.find(g => g.x === x && g.y === y);
export type GravStil = 'jord' | 'hog' | 'bal' | 'vatten';
export interface Grav { x: number; y: number; t: number; vem: number; namn: string; stil: GravStil; tro?: number; ovardig?: true }
export interface Kvarleva { id: number; k: KvarSlag; x: number; y: number; t: number; vem: number; namn: string; text: string; bars?: number }
export const kvarlevor = (s: State) => (s.kvarlevor ??= []);
export function nyKvarleva(s: State, k: KvarSlag, p: Person, text: string) {
  const q: Kvarleva = { id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k, x: Math.floor(p.x), y: Math.floor(p.y), t: s.now, vem: p.id, namn: p.name, text };
  kvarlevor(s).push(q);
  return q;
}
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
    for (const p of living(s)) if (p.id !== q.vem && Math.hypot(p.x - q.x, p.y - q.y) <= KVAR.seR) {
      const nar = nara(s, p, q.vem); // mer för den som stod den döda nära (steg 8.5.1)
      think(p, nar ? `Såg ${q.namn} ligga där` : d.tanke, d.se * (nar ? KVAR.nara : 1), s.now, KVAR.seTim * HOUR);
      if (q.k === 'kropp' && !p.sedDod?.includes(q.vem)) { (p.sedDod ??= []).push(q.vem); upplev(s, p, 'sagDod', q.namn); } // en av upplevelserna som flyttar andligheten (steg 8.5.4)
    }
  }
}


export const nara = (s: State, p: Person, id: number) => { const d = byId(s, id); return !!d && (p.partner === id || isParent(p, d) || isParent(d, p) || (s.rels[relKey(p.id, id)]?.op ?? 0) > 40); };
// bäraren avbröts: kroppen läggs ner där hen är
export function kroppTappad(s: State) {
  for (const q of s.kvarlevor ?? []) if (q.bars !== undefined) { const b = byId(s, q.bars); if (!b || !alive(b) || b.task?.ref !== q.id || b.task?.act !== 'grava') { if (b) { q.x = Math.floor(b.x); q.y = Math.floor(b.y); } q.bars = undefined; q.t = s.now; } }
}
