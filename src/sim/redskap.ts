import { ageOf, living, log } from './folk';
import { count } from './fynd';
import { knows } from './teknik';
import { State, Person } from './typer';

// ---------- redskap: fiskespjut ----------
// En pinne som täljs spetsig med något vasst, en flintsten eller en yxa. Det vassa används bara som verktyg och finns kvar.
// Med spjut får man fisk mycket oftare än med händerna, men spjutet håller inte länge: det slits lite vid varje försök.
// Byns spjut ligger i förrådet; ett halvt slitet spjut räknas som 0,5.
const item = (s: State, k: string) => s.items[k] ?? 0;
export const SPJUT_FORSOK = 60; // så många fiskeförsök (fem minuter vardera) ett spjut håller
export const spears = (s: State) => Math.ceil(item(s, 'fiskespjut') - 1e-9);
// lediga spjut: de som inte redan används av någon annan som fiskar
export const freeSpears = (s: State, p: Person) => spears(s) - living(s).filter(q => q !== p && q.task?.tool === 'fiskespjut').length;
export const sharpTool = (s: State) => item(s, 'yxa') >= 1 ? 'yxa' : item(s, 'flinta') >= 1 ? 'flinta' : undefined;
export const canMakeSpear = (s: State) => !!sharpTool(s) && item(s, 'grenar') >= 1;
// byn vill ha ungefär ett spjut per tre vuxna, när någon väl har börjat fiska
export const spearsWanted = (s: State) => (s.stat?.fiskeForsok ?? 0) > 0 ? Math.max(1, Math.min(4, Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3))) : 0;
export const wantsSpear = (s: State, p: Person) => knows(p, 'fiskespjut') && canMakeSpear(s) && spears(s) < spearsWanted(s) && !living(s).some(q => q !== p && q.task?.act === 'spjut');
export function makeSpear(s: State, p: Person) {
  const tool = sharpTool(s);
  if (!tool || !canMakeSpear(s)) return;
  s.items.grenar--;
  s.items.fiskespjut = item(s, 'fiskespjut') + 1;
  count(s, 'spjutGjorda');
  if (s.stat!.spjutGjorda === 1) log(s, `${p.name} täljde byns första fiskespjut med ${tool === 'yxa' ? 'en yxa' : 'en flintsten'}. Nu går fisket lättare.`, 'world', [p.id]);
}
// ett försök sliter på spjutet; när det är helt slitet går det sönder
export function wearSpear(s: State, p: Person) {
  const before = spears(s);
  s.items.fiskespjut = Math.max(0, item(s, 'fiskespjut') - 1 / SPJUT_FORSOK);
  if (spears(s) < before) {
    count(s, 'spjutTrasiga');
    if (p.task) p.task.tool = undefined;
    if (s.stat!.spjutTrasiga === 1) log(s, `${p.name}s fiskespjut gick sönder. Spjuten håller inte länge.`, 'world', [p.id]);
  }
}

// ---------- redskap: korg ----------
// En korg flätas av torrt gräs av den som kan det. Med korg bär man hem mer från varje tur och spiller mindre bär.
// Korgen slits när den används och håller ungefär KORG_TIMMAR arbetstimmar.
export const KORG_GRAS = 3, KORG_TIMMAR = 40, KORG_SKORD = 1.15;
export const baskets = (s: State) => Math.ceil(item(s, 'korg') - 1e-9);
export const freeBaskets = (s: State, p: Person) => baskets(s) - living(s).filter(q => q !== p && q.task?.tool === 'korg').length;
// ungefär en korg per tre vuxna
export const basketsWanted = (s: State) => Math.max(1, Math.min(5, Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3)));
// gräset till elden går först: korgen flätas bara när elden brinner och det finns gräs över till tändning
export const wantsBasket = (s: State, p: Person) => knows(p, 'korg') && s.fire.lit && item(s, 'torrgras') >= KORG_GRAS + 6 && baskets(s) < basketsWanted(s) && !living(s).some(q => q !== p && q.task?.act === 'korg');
export function makeBasket(s: State, p: Person) {
  if (item(s, 'torrgras') < KORG_GRAS) return;
  s.items.torrgras -= KORG_GRAS;
  s.items.korg = item(s, 'korg') + 1;
  count(s, 'korgarGjorda');
  if (s.stat!.korgarGjorda === 1) log(s, `${p.name} flätade byns första korg av torrt gräs.`, 'world', [p.id]);
}
export function wearBasket(s: State, p: Person, hours: number) {
  const before = baskets(s);
  s.items.korg = Math.max(0, item(s, 'korg') - hours / KORG_TIMMAR);
  if (baskets(s) < before) {
    count(s, 'korgarTrasiga');
    if (p.task) p.task.tool = undefined;
    if (s.stat!.korgarTrasiga === 1) log(s, `${p.name}s korg gick sönder.`, 'world', [p.id]);
  }
}
