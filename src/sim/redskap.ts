import { ageOf, count, living, log } from './folk';
import { knows } from './teknik';
import { State, Person } from './typer';
import { item } from './saker';

// ---------- redskap: spjut ----------
// Ett träspjut är en pinne som täljs spetsig med något vasst, en flintsten eller en yxa. Det vassa används bara som verktyg
// och finns kvar. Ett flintspjut har en flintspets som surras fast med rep, och håller mycket längre. Alla spjut används
// både till fiske och jakt. Med spjut får man fisk mycket oftare än med händerna, men träspjutet slits fort.
// Byns spjut ligger i förrådet; ett halvt slitet spjut räknas som 0,5.
export const SPJUT_FORSOK = 60; // så många fiskeförsök (fem minuter vardera) ett träspjut håller
export const SPJUT = ['flintspjut', 'fiskespjut']; // det bästa först
const LIV: Record<string, number> = { fiskespjut: 1, flintspjut: 4 }; // hur länge spjutet håller jämfört med ett träspjut
export const isSpear = (k?: string) => !!k && SPJUT.includes(k);
const count1 = (s: State, k: string) => Math.ceil(item(s, k) - 1e-9);
export const spears = (s: State) => SPJUT.reduce((a, k) => a + count1(s, k), 0);
const inUse = (s: State, p: Person, k: string) => living(s).filter(q => q !== p && q.task?.tool === k).length;
// ett ledigt spjut, det bästa först: de som inte redan används av någon annan som fiskar eller jagar
export const freeSpear = (s: State, p: Person) => SPJUT.find(k => count1(s, k) - inUse(s, p, k) > 0);
export const freeSpears = (s: State, p: Person) => SPJUT.reduce((a, k) => a + count1(s, k) - inUse(s, p, k), 0);
export const sharpTool = (s: State) => item(s, 'yxa') >= 1 ? 'yxa' : item(s, 'flinta') >= 1 ? 'flinta' : undefined;
// ett flintspjut kräver en flinta utöver den som sparas att tända eld med, rep och en gren
const canFlintSpear = (s: State, p: Person) => knows(p, 'flintspjut') && item(s, 'flinta') >= 2 && item(s, 'rep') >= 1 && item(s, 'grenar') >= 1;
export const canMakeSpear = (s: State) => !!sharpTool(s) && item(s, 'grenar') >= 1;
// byn vill ha ungefär ett spjut per tre vuxna, när någon väl har börjat fiska eller jaga
export const spearsWanted = (s: State) => (s.stat?.fiskeForsok ?? 0) > 0 || (s.stat?.prod_jakt ?? 0) > 0 ? Math.max(1, Math.min(4, Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3))) : 0;
export const wantsSpear = (s: State, p: Person) => (knows(p, 'fiskespjut') && canMakeSpear(s) || canFlintSpear(s, p)) && spears(s) < spearsWanted(s) && !living(s).some(q => q !== p && q.task?.act === 'spjut');
// det spjut hen gör: ett flintspjut om hen kan och det finns material, annars ett träspjut
export const spearKind = (s: State, p: Person) => canFlintSpear(s, p) ? 'flintspjut' : 'fiskespjut';
export function makeSpear(s: State, p: Person) {
  if (spearKind(s, p) === 'flintspjut') {
    s.items.flinta--; s.items.rep--; s.items.grenar--;
    s.items.flintspjut = item(s, 'flintspjut') + 1;
    count(s, 'flintspjutGjorda');
    if (s.stat!.flintspjutGjorda === 1) log(s, `${p.name} gjorde byns första flintspjut: en flintspets surrad med rep vid en pinne. Det håller mycket längre än ett träspjut.`, 'world', [p.id]);
    return;
  }
  const tool = sharpTool(s);
  if (!tool || !canMakeSpear(s)) return;
  s.items.grenar--;
  s.items.fiskespjut = item(s, 'fiskespjut') + 1;
  count(s, 'spjutGjorda');
  if (s.stat!.spjutGjorda === 1) log(s, `${p.name} täljde byns första träspjut med ${tool === 'yxa' ? 'en yxa' : 'en flintsten'}. Nu går fisket lättare.`, 'world', [p.id]);
}
// ett försök (n försök) sliter på spjutet; när det är helt slitet går det sönder
export function wearSpear(s: State, p: Person, n = 1) {
  const k = p.task?.tool;
  if (!k || !isSpear(k)) return;
  const before = count1(s, k);
  s.items[k] = Math.max(0, item(s, k) - n / (SPJUT_FORSOK * LIV[k]));
  if (count1(s, k) < before) {
    count(s, 'spjutTrasiga');
    if (p.task) p.task.tool = undefined;
    if (s.stat!.spjutTrasiga === 1) log(s, `${p.name}s ${k === 'flintspjut' ? 'flintspjut' : 'träspjut'} gick sönder.${k === 'fiskespjut' ? ' Träspjuten håller inte länge.' : ''}`, 'world', [p.id]);
  }
}

// ---------- rep ----------
// Rep tvinnas av växtfibrer (hö) vid elden på kvällen av den som kan det, eller tas från senor vid jakt. Det är samma rep
// oavsett material. Rep behövs till flintspjut och metspö.
export const REP_GRAS = 2, REP_TIMME = 1, REP_VILL = 4;
export const wantsRope = (s: State, p: Person) => knows(p, 'rep') && item(s, 'rep') < REP_VILL && item(s, 'torrgras') >= REP_GRAS + 6; // lite hö sparas till elden
export function twineRope(s: State, p: Person, hours: number) {
  const n = Math.min(hours * REP_TIMME, (item(s, 'torrgras') - 6) / REP_GRAS, REP_VILL - item(s, 'rep'));
  if (n <= 0) return;
  s.items.torrgras -= n * REP_GRAS;
  s.items.rep = item(s, 'rep') + n;
  const first = !(s.stat?.rep);
  count(s, 'rep', n);
  if (first) log(s, `${p.name} började tvinna rep av hö vid elden.`, 'world', [p.id]);
}
// senor från vilt blir rep, för den som kan det
export const SENOR = 0.06; // rep per kött

// ---------- redskap: metspö ----------
// Ett metspö görs av en gren, ett rep och en krok av ben. Mask grävs fram före fisket och sätts på kroken; varje napp
// tar en mask. Med metspö nappar fisken oftare och sitter kvar bättre än på spjutet.
export const METSPO_FORSOK = 200, MASK_PER_GRAV = 4;
export const canMakeRod = (s: State, p: Person) => knows(p, 'metspo') && item(s, 'rep') >= 1 && item(s, 'ben') >= 1 && item(s, 'grenar') >= 1;
export const rods = (s: State) => count1(s, 'metspo');
export const freeRod = (s: State, p: Person) => rods(s) - inUse(s, p, 'metspo') > 0;
export const wantsRod = (s: State, p: Person) => canMakeRod(s, p) && rods(s) < spearsWanted(s) && !living(s).some(q => q !== p && q.task?.act === 'metspo');
export function makeRod(s: State, p: Person) {
  if (!canMakeRod(s, p)) return;
  s.items.rep--; s.items.ben--; s.items.grenar--;
  s.items.metspo = item(s, 'metspo') + 1;
  count(s, 'metspoGjorda');
  if (s.stat!.metspoGjorda === 1) log(s, `${p.name} gjorde byns första metspö, med en krok av ben.`, 'world', [p.id]);
}
export function wearRod(s: State, p: Person) {
  const before = rods(s);
  s.items.metspo = Math.max(0, item(s, 'metspo') - 1 / METSPO_FORSOK);
  if (rods(s) < before) { count(s, 'metspoTrasiga'); if (p.task) p.task.tool = undefined; }
}

// ---------- redskap: korg ----------
// En korg flätas av hö av den som kan det. Med korg bär man hem mer från varje tur och spiller mindre bär.
// Korgen slits när den används och håller ungefär KORG_TIMMAR arbetstimmar.
export const KORG_GRAS = 3, KORG_TIMMAR = 40, KORG_SKORD = 1.15;
export const baskets = (s: State) => Math.ceil(item(s, 'korg') - 1e-9);
export const freeBaskets = (s: State, p: Person) => baskets(s) - living(s).filter(q => q !== p && q.task?.tool === 'korg').length;
// ungefär en korg per tre vuxna
export const basketsWanted = (s: State) => Math.max(1, Math.min(5, Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3)));
export const wantsBasket = (s: State, p: Person) => knows(p, 'korg') && item(s, 'torrgras') >= KORG_GRAS && baskets(s) < basketsWanted(s) && !living(s).some(q => q !== p && q.task?.act === 'korg');
export function makeBasket(s: State, p: Person) {
  if (item(s, 'torrgras') < KORG_GRAS) return;
  s.items.torrgras -= KORG_GRAS;
  s.items.korg = item(s, 'korg') + 1;
  count(s, 'korgarGjorda');
  if (s.stat!.korgarGjorda === 1) log(s, `${p.name} flätade byns första korg av hö.`, 'world', [p.id]);
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
