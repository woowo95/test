import { ageOf, living, log } from './folk';
import { count } from './fynd';
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
export const canMakeSpear = (s: State) => !!sharpTool(s) && item(s, 'pinnar') + item(s, 'grenar') >= 1;
// byn vill ha ungefär ett spjut per tre vuxna, när någon väl har börjat fiska
export const spearsWanted = (s: State) => (s.stat?.fiskeForsok ?? 0) > 0 ? Math.max(1, Math.min(4, Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3))) : 0;
export const wantsSpear = (s: State, p: Person) => canMakeSpear(s) && spears(s) < spearsWanted(s) && !living(s).some(q => q !== p && q.task?.act === 'spjut');
export function makeSpear(s: State, p: Person) {
  const tool = sharpTool(s);
  if (!tool || !canMakeSpear(s)) return;
  if (item(s, 'pinnar') >= 1) s.items.pinnar--; else s.items.grenar--;
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
