// Det lilla av tron som resten av spelet frågar om: om en ruta är helig, om någon är präst, kön till ritualerna och gravgåvan. Egen fil utan
// tunga beroenden, eftersom lager, skogen, kläderna, döden och relationerna läses tidigt (kult.ts läser dem).
import { Person, State } from './typer';
import type { Ritual, RitualId } from './kult';
export const heligRuta = (s: State, x: number, y: number) => !!s.heliga?.some(h => h.x === x && h.y === y); // där fälls och byggs inget
export const arPrast = (s: State, p: Person) => !!s.tron?.some(t => t.prast === p.id);
export function nyRitual(s: State, k: RitualId, d: Partial<Ritual> = {}) { (s.ritualKo ??= []).push({ k, start: s.now, slut: 0, x: d.x ?? 0, y: d.y ?? 0, ...d }); }
const LIVET_EFTER = 60; // Nuet – Livet efter: över så här blir det gravhög med gåvor (KULT.livetEfter)
// gravgåvan (steg 8.5.6): i en tro långt åt Livet efter läggs en hel sak ur den dödas egendom i graven i stället för att ärvas
export function gravgava(s: State, p: Person) {
  const tr = s.tron?.find(t => t.id === p.tro);
  if (!tr || (tr.sk?.livet ?? 0) < LIVET_EFTER) return;
  const g = (s.ting ?? []).find(t => t.agare === p.id && t.bar === undefined);
  if (g) { s.ting = s.ting!.filter(t => t !== g); s.stat = s.stat ?? {}; s.stat.gravgava = (s.stat.gravgava ?? 0) + 1; }
}
// byta tro (steg 8.5.12): i samtal, när tron svikit en. Var och en har en tro i taget
export const bytaChans = (p: Person, oppen: number) => ((p.tvivel ?? 0) * 0.5 + 0.02) * (1 - (p.troStyrka ?? 0) / 150) * (1 - oppen / 200);
