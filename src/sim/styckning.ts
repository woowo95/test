// Styckning (steg 6.6.1): ett fällt djur som väger mer än bäraren orkar med båda händerna styckas där det ligger, med kniv
// och en kort stund per del. En styckdel väger STYCK.delVikt, så djuret blir vikten delat med den, avrundat uppåt. Bäraren
// tar så många delar som händerna orkar (minst en), och resten ligger kvar som en hög på platsen tillsammans med skinnet,
// som dras av när djuret styckas. Högen hämtas i fler turer (bärandet i lager.ts) och kan tas av vargar eller ruttna.
// Delarna är fortfarande vilt och slaktas vid slaktbänken (raden för delen i DJUR, redskap.ts). Vilka arter som styckas och
// vad delen heter står i djurets rad i DJUR (del), och delen är en rad i SAKER (saker.ts)
import { balans } from './balans';
import { nTools } from './agande';
import { count } from './folk';
import { dropLoad } from './lager';
import { DJUR, Djurart } from './redskap';
import { viktOf } from './saker';
import { knows } from './teknik';
import { MIN, Person, State, Task } from './typer';
import { bordPlats } from './utrustning';

export const STYCK = balans('styckning', {
  delVikt: 10, // en styckdel väger så här mycket; djuret blir vikten / delVikt delar, avrundat uppåt
  minPerDel: 10, // så här många minuter tar det att skära loss en del
});

// arten vars fällda djur ligger i förrådet som sak k
const artAv = (k: string): Djurart | undefined => Object.values(DJUR).find(a => a.sak === k);

// kan p stycka ett djur av arten: arten styckas, hen kan kniven och byn har en
const kanStycka = (s: State, p: Person, art: Djurart) => !!art.del && knows(p, 'kniv') && nTools(s, 'kniv') >= 1;

// p ska bära hem ett fällt djur (saken k) från där hen står, och t är uppgiften som bär det (carry 1 av k). Väger det mer än
// p orkar och hen kan stycka det, blir det delar: t bär så många delar som ryms, tiden förlängs med styckningen, och resten
// läggs som en hög på platsen. Ger antalet delar som blev kvar (0 om djuret bärs helt)
export function styckaFallt(s: State, p: Person, t: Task, k: string): number {
  const art = artAv(k);
  if (!art || !art.del || viktOf(k) <= bordPlats(s, p) + 1e-9 || !kanStycka(s, p, art)) return 0;
  const delar = Math.ceil(viktOf(k) / STYCK.delVikt), dv = viktOf(art.del);
  const bar = Math.max(1, Math.min(delar, Math.floor(bordPlats(s, p) / dv + 1e-9)));
  t.carry = 0;
  t.items = { ...(t.items ?? {}), [art.del]: bar };
  t.until += delar * STYCK.minPerDel * MIN;
  const kvar = delar - bar;
  // högen: delarna som inte bärs med och skinnet, som dras av när djuret styckas
  const hog: Record<string, number> = {};
  if (kvar > 0) hog[art.del] = kvar;
  for (const [sk, m] of Object.entries(art.skinn ?? {})) hog[sk] = m;
  if (Object.keys(hog).length) dropLoad(s, { act: t.act, phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, items: hog }, p.x, p.y, p.id);
  count(s, 'styckat');
  count(s, 'styckdelar', delar);
  return kvar;
}

// fällda djur som ingen bar hem blir liggande som en hög där de föll (hämtas senare, eller tas av vargar eller ruttnar)
export function lamnaFallt(s: State, k: string, n: number, x: number, y: number) {
  if (n <= 0) return;
  dropLoad(s, { act: 'bara', phase: 'do', tx: x, ty: y, until: s.now, carry: 0, items: { [k]: n } }, x, y);
}
