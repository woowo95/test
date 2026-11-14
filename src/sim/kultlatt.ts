// Det lilla av tron som resten av spelet frågar om: om en ruta är helig, om någon är präst, kön till ritualerna och gravgåvan. Egen fil utan
// tunga beroenden, eftersom lager, skogen, kläderna, döden och relationerna läses tidigt (kult.ts läser dem).
import { Person, State } from './typer';
import type { Ting } from './agande';
import type { Ritual, RitualId } from './kult';
export const heligRuta = (s: State, x: number, y: number) => !!s.heliga?.some(h => h.x === x && h.y === y); // där fälls och byggs inget
export const arPrast = (s: State, p: Person) => !!s.tron?.some(t => t.prast === p.id);
export function nyRitual(s: State, k: RitualId, d: Partial<Ritual> = {}) { (s.ritualKo ??= []).push({ k, start: s.now, slut: 0, x: d.x ?? 0, y: d.y ?? 0, ...d }); }
// den dödes saker (steg 10.3.5): två bud i den dödes tro. Gravgåvor: den finaste saken hen bar (på sig, i handen eller i bältet) följer hen,
// och bar hen inget den finaste hen ägde. Det den döde bar följer med: allt hen bar, och inget av det ärvs. Sakerna läggs på kroppen (med)
// och följer den i graven, på bålet eller i vattnet; graven minns dem. Utan bud ärvs allt
let vardeAv: (t: Ting) => number = t => t.q ?? 0;
// värdet av kyrkans egendom räknat i ved, för trons tyngd (steg 10.3.8); sätts av kult.ts, som läser värdena
let iVed: (o: Record<string, number>) => number = () => 0;
export const satEgendomVarde = (f: typeof iVed) => { iVed = f; };
export const egendomIVed = (o: Record<string, number>) => iVed(o);
export const satGravVarde = (f: typeof vardeAv) => { vardeAv = f; };
export function gravgava(s: State, p: Person) {
  const tr = s.tron?.find(t => t.id === p.tro), har = (id: string) => !!tr?.bud?.some(b => b.id === id);
  if (!tr) return;
  const bar = (s.ting ?? []).filter(t => t.bar === p.id || t.krok === p.id), agt = (s.ting ?? []).filter(t => t.agare === p.id && t.bar === undefined && t.krok === undefined);
  const finast = (l: Ting[]) => l.sort((a, b) => vardeAv(b) - vardeAv(a))[0];
  const med = new Set<Ting>(har('medfolj') ? bar : []);
  if (har('gravgava')) { const g = finast(bar.filter(t => !med.has(t))) ?? (med.size ? undefined : finast(agt)); if (g) med.add(g); }
  if (!med.size) return;
  s.ting = s.ting!.filter(t => !med.has(t));
  s.stat = s.stat ?? {}; s.stat.gravgava = (s.stat.gravgava ?? 0) + med.size;
  const kr = s.kvarlevor?.filter(k => k.k === 'kropp' && k.vem === p.id).pop();
  if (kr) kr.med = [...med].map(t => t.k);
}
// byta tro (steg 8.5.12): i samtal, när tron svikit en. Var och en har en tro i taget
export const bytaChans = (p: Person, oppen: number) => ((p.tvivel ?? 0) * 0.5 + 0.02) * (1 - (p.troStyrka ?? 0) / 150) * (1 - oppen / 200);
