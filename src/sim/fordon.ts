// Fordonen (steg 10.10.2): kälken, och senare släden och vagnen (10.10.3, 11.3.6), är rader i registret FORDON. De är till för
// det som är för tungt eller otympligt att bära: det som lyfts med båda händerna (lyft i SAKER, virket) och det ingen orkar bära.
// Bär, grenar och annat smått bärs som förut. Fordonet följer med i bördan (tk.ting, som redskapen på rutan) och ställs i
// förrådet när bördan läggs där. Lasset är vikt, och farten på varje underlag gånger gångfarten: på snö och is full fart, på
// barmark FORDON.kalke.bar. Den som hämtar något tungt tar händerna eller fordonet efter vad turen ger per tid (valjFordon)
import { tingOf, ledigtTing } from './agande';
import { roofed } from './byggnad';
import { snoSmalt } from './brand';
import { groundOf, tileOf } from './mark';
import { SAKER, viktOf } from './saker';
import { snoPaMarken } from './vader';
import { Person, State, Task, inMap } from './typer';
import { balans } from './balans';

export interface FordonRad { sak: string; drar: 'manniska' | 'djur'; lass: number; bar: number; namn: string }
export const FORDON_TAL = balans('fordon', {
  kalkeLass: 60, // så mycket vikt kälken rymmer: 3 virke
  kalkeBar: 0.4, // kälkens fart på barmark, som del av gångfarten (på snö och is: 1)
});
export const FORDON: Record<string, FordonRad> = {
  kalke: { sak: 'kalke', namn: 'Kälke', drar: 'manniska', lass: FORDON_TAL.kalkeLass, bar: FORDON_TAL.kalkeBar },
};
export const fordonRad = (k: string) => Object.values(FORDON).find(f => f.sak === k);
// fordonet i bördan, eller undefined
export const fordonI = (s: State, t?: Task) => { if (!t?.ting?.length) return undefined; for (const id of t.ting) { const g = tingOf(s).find(q => q.id === id); const f = g && fordonRad(g.k); if (f) return f; } return undefined; };
// fordonets fart på rutan (x, y), som del av gångfarten: full på is och på snö som inte smält, annars barmarkens
export function fordonFart(s: State, f: FordonRad, x: number, y: number) {
  const fx = Math.floor(x), fy = Math.floor(y);
  if (inMap(fx, fy) && groundOf(s).tiles[tileOf(x, y)] === 0) return 1; // isen (den som går på vattnet går på is)
  const sno = roofed(s, x, y) ? 0 : Math.min(1, snoPaMarken(s)) * (1 - snoSmalt(s, x, y));
  return f.bar + (1 - f.bar) * sno;
}
// ryms bördan b i fordonet: bara det som lyfts med båda händerna, och högst lasset
export const fordonRyms = (f: FordonRad) => (b: Record<string, number>) => Object.keys(b).every(k => b[k] <= 1e-9 || SAKER[k]?.lyft) && Object.values(b).reduce((a, v) => a + v, 0) <= f.lass + 1e-9;
// hur många av saken k fordonet tar
export const fordonTar = (f: FordonRad, k: string) => SAKER[k]?.lyft ? Math.floor((f.lass + 1e-9) / viktOf(k)) : 0;
// p ska hämta saken k vid (x, y), och kan bära iHand av den i händerna: ett ledigt fordon som ger mer per tid än händerna, eller
// undefined. Turen fram och tillbaka går i fordonets fart, så det som ges per tid är antalet gånger farten
export function valjFordon(s: State, p: Person, k: string, x: number, y: number, iHand: number, finns = Infinity) {
  if (!SAKER[k]?.lyft) return undefined;
  let bast: { id: number; v: number } | undefined;
  for (const f of Object.values(FORDON)) {
    if (f.drar !== 'manniska') continue;
    const g = ledigtTing(s, p, f.sak);
    if (!g) continue;
    const v = Math.min(finns, fordonTar(f, k)) * fordonFart(s, f, x, y);
    if (v > iHand + 1e-9 && v > (bast?.v ?? 0)) bast = { id: g.id, v };
  }
  return bast && tingOf(s).find(g => g.id === bast!.id);
}
// fordonet tas med i bördan: det följer med tills bördan läggs i förrådet (storeTings) eller där p står (dropLoad)
export function taFordon(s: State, p: Person, t: Task, id: number) {
  const g = tingOf(s).find(q => q.id === id);
  if (!g) return;
  g.hos = undefined; g.krok = undefined; g.x = g.y = undefined; g.lass = p.id; (t.ting ??= []).push(g.id);
}
