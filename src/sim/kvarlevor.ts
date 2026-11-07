// Det som blir kvar av en människa (steg 8.2.3 och 8.5.1): en avhuggen kroppsdel eller en död kropp, som en sak på rutan där det
// hände. Registret KVARLEVOR: en rad per slag. Allt ruttnar som maten (`haller`, dygn), och den som ser det får en tanke
// (`se`, svagare för en kroppsdel än för en kropp).
import { DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { living, think } from './folk';

export const KVAR = balans('kvar', {
  seR: 4, // så många rutor bort ser man det
  seTim: 6, // så länge sitter tanken i (timmar i spelet)
});
export interface KvarDef { namn: string; ikon: string; haller: number; se: number; tanke: string }
export const KVARLEVOR = {
  del: { namn: 'Kroppsdel', ikon: 'kroppsdel', haller: 4, se: -0.04, tanke: 'Såg en avhuggen kroppsdel' },
  kropp: { namn: 'Död kropp', ikon: 'dodkropp', haller: 8, se: -0.1, tanke: 'Såg en död kropp' },
} satisfies Record<string, KvarDef>;
export type KvarSlag = keyof typeof KVARLEVOR;
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
  s.kvarlevor = s.kvarlevor.filter(q => q.bars !== undefined || s.now - q.t < KVARLEVOR[q.k].haller * DAY);
  for (const q of s.kvarlevor) {
    const d: KvarDef = KVARLEVOR[q.k];
    for (const p of living(s)) if (p.id !== q.vem && Math.hypot(p.x - q.x, p.y - q.y) <= KVAR.seR) think(p, d.tanke, d.se, s.now, KVAR.seTim * HOUR);
  }
}
