import { ageOf, count, doingAct, living, log } from './folk';
import { knows } from './teknik';
import { clamp, rnd } from './slump';
import { Act, State, Person } from './typer';
import { ACTS, toolRow } from './handlingar';
import { SAKER, gruppOf } from './saker';
import { amountOf, gain, put, use } from './lager';
import { getable, takeMaterial, takeRecipe } from './behov';
import { addDel } from './egendom';
import { addTool, freeTools, halvOf, nTools, ownsFree, wearTool } from './agande';

// ---------- redskap: spjut ----------
// Ett träspjut är en pinne som täljs spetsig med något vasst, en flintsten eller en yxa. Det vassa används bara som verktyg
// och finns kvar. Ett flintspjut har en flintspets som surras fast med rep, och håller mycket längre. Alla spjut används
// både till fiske och jakt. Med spjut får man fisk mycket oftare än med händerna, men träspjutet slits fort.
// Varje spjut är ett eget ting med skick och ägare (agande.ts); den som fiskar eller jagar har det i handen.
// Vad ett redskap ger i ett arbete och hur länge det håller står i handlingens rad (handlingar.ts).
// redskapen i ett arbete i grupper av sådana som kan ersätta varandra (alla spjut), det bästa först
export function toolGroups(act: Act) {
  const g: Record<string, string[]> = {};
  for (const k in ACTS[act].redskap ?? {}) (g[gruppOf(k)] ??= []).push(k);
  return g;
}
export const SPJUT = toolGroups('jakt').spjut; // det bästa först
export const SPJUT_FORSOK = ACTS.fiske.redskap!.fiskespjut.haller!; // så många fiskeförsök (fem minuter vardera) ett träspjut håller
export const isSpear = (k?: string) => !!k && gruppOf(k) === 'spjut';
export const spears = (s: State) => SPJUT.reduce((a, k) => a + nTools(s, k), 0);
// ett ledigt redskap av några slag: sitt eget först, annars det bästa som ingen annan arbetar med (agande.ts)
export const freeOfKinds = (s: State, p: Person, ks: string[]) => ks.find(k => ownsFree(s, p, k)) ?? ks.find(k => freeTools(s, p, k) > 0);
export const freeSpear = (s: State, p: Person) => freeOfKinds(s, p, SPJUT);
// slitage på redskapet i handen under arbetet: n enheter av arbetet (handlingens slits, eller försök). Går det sönder
// räknas det, och första gången står det i loggen
export function wearUsed(s: State, p: Person, n: number) {
  const r = toolRow(p.task), k = p.task?.tool;
  if (!r?.haller || !k) return;
  if (!wearTool(s, p, k, n / r.haller)) return;
  const tr = SAKER[k]?.trasig;
  if (tr) count(s, tr.stat);
  if (p.task) p.task.tool = undefined;
  if (tr?.text && s.stat![tr.stat] === 1) log(s, tr.text.replace('{namn}', p.name), 'world', [p.id]);
}
const sharpTool = (s: State) => amountOf(s, 'yxa') >= 1 ? 'yxa' : amountOf(s, 'flinta') >= 1 ? 'flinta' : undefined;
// ett flintspjut kräver en flinta utöver den som sparas att tända eld med, rep och en gren
// Materialet tas i behovsstegen (behov.ts): sitt eget, byns, en gåva, och annars av andras (en lindrig stöld)
const canFlintSpear = (s: State, p: Person) => knows(p, 'flintspjut') && getable(s, p, 'flinta') >= 2 && getable(s, p, 'rep') >= 1 && getable(s, p, 'grenar') >= 1;
const canMakeSpear = (s: State, p: Person) => !!sharpTool(s) && getable(s, p, 'grenar') >= 1;
// byn vill ha ungefär ett spjut per tre vuxna, när någon väl har börjat fiska eller jaga
const spearsWanted = (s: State) => (s.stat?.fiskeForsok ?? 0) > 0 || (s.stat?.prod_jakt ?? 0) > 0 ? clamp(Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3), 1, 4) : 0;
const wantsSpear = (s: State, p: Person) => (!!halvOf(s, p, SPJUT) || knows(p, 'fiskespjut') && canMakeSpear(s, p) || canFlintSpear(s, p)) && spears(s) < spearsWanted(s) && !doingAct(s, 'spjut', p);
// det spjut hen gör: det hen redan har påbörjat, annars ett flintspjut om hen kan och det finns material, annars ett träspjut
export const spearKind = (s: State, p: Person) => halvOf(s, p, SPJUT)?.halv!.gor ?? (canFlintSpear(s, p) ? 'flintspjut' : 'fiskespjut');
// kan p börja göra ett spjut av slaget k (materialet tas när arbetet börjar, paborjat.ts)
export const canStartSpear = (s: State, p: Person, k: string) => k === 'flintspjut' ? canFlintSpear(s, p) : canMakeSpear(s, p);
// spjutet är klart (materialet togs när arbetet började)
export function spearDone(s: State, p: Person, k: string) {
  addTool(s, k, p);
  if (k === 'flintspjut') {
    count(s, 'flintspjutGjorda');
    if (s.stat!.flintspjutGjorda === 1) log(s, `${p.name} gjorde byns första flintspjut: en flintspets surrad med rep vid en pinne. Det håller mycket längre än ett träspjut.`, 'world', [p.id]);
    return;
  }
  count(s, 'spjutGjorda');
  if (s.stat!.spjutGjorda === 1) log(s, `${p.name} täljde byns första träspjut med ${sharpTool(s) === 'yxa' ? 'en yxa' : 'en flintsten'}. Nu går fisket lättare.`, 'world', [p.id]);
}
// ett spjut görs på en gång (i testerna)
export function makeSpear(s: State, p: Person) {
  const k = spearKind(s, p);
  if (!canStartSpear(s, p, k)) return;
  takeRecipe(s, p, k); spearDone(s, p, k);
}
// ---------- rep ----------
// Rep tvinnas av växtfibrer (hö) vid elden på kvällen av den som kan det, eller tas från senor när vilt slaktas. Det är samma rep
// oavsett material. Rep behövs till flintspjut och metspö.
const REP_GRAS = 2, REP_TIMME = 60 / SAKER.rep!.skaffa!.min!, REP_VILL = 4; // rep per timme
export const wantsRope = (s: State, p: Person) => knows(p, 'rep') && amountOf(s, 'rep') < REP_VILL && getable(s, p, 'torrgras') >= REP_GRAS + 6; // lite hö sparas till elden
export function twineRope(s: State, p: Person, hours: number) {
  const n = Math.min(hours * REP_TIMME, (getable(s, p, 'torrgras') - 6) / REP_GRAS, REP_VILL - amountOf(s, 'rep'));
  if (n <= 0) return;
  takeMaterial(s, p, 'torrgras', n * REP_GRAS);
  gain(s, p, 'rep', n);
  const first = !(s.stat?.rep);
  count(s, 'rep', n);
  if (first) log(s, `${p.name} började tvinna rep av hö vid elden.`, 'world', [p.id]);
}

// ---------- redskap: metspö ----------
// Ett metspö görs av en gren, ett rep och en krok av ben. Mask grävs fram före fisket och sätts på kroken; varje napp
// tar en mask. Med metspö nappar fisken oftare och sitter kvar bättre än på spjutet.
export const MASK_PER_GRAV = 4;
export const canMakeRod = (s: State, p: Person) => knows(p, 'metspo') && getable(s, p, 'rep') >= 1 && getable(s, p, 'ben') >= 1 && getable(s, p, 'grenar') >= 1;
const rods = (s: State) => nTools(s, 'metspo');
const wantsRod = (s: State, p: Person) => (!!halvOf(s, p, ['metspo']) || canMakeRod(s, p)) && rods(s) < spearsWanted(s) && !doingAct(s, 'metspo', p);
export function makeRod(s: State, p: Person) { if (canMakeRod(s, p)) { takeRecipe(s, p, 'metspo'); rodDone(s, p); } }
export function rodDone(s: State, p: Person) {
  addTool(s, 'metspo', p);
  count(s, 'metspoGjorda');
  if (s.stat!.metspoGjorda === 1) log(s, `${p.name} gjorde byns första metspö, med en krok av ben.`, 'world', [p.id]);
}

// ---------- redskap: korg ----------
// En korg flätas av hö av den som kan det. Med korg bär man hem mer från varje tur och spiller mindre bär.
// Korgen slits när den används och håller ungefär 40 arbetstimmar.
const KORG_GRAS = 3;
const baskets = (s: State) => nTools(s, 'korg');
// ungefär en korg per tre vuxna
const basketsWanted = (s: State) => clamp(Math.floor(living(s).filter(p => ageOf(p, s.now) >= 14).length / 3), 1, 5);
export const canMakeBasket = (s: State, p: Person) => getable(s, p, 'torrgras') >= KORG_GRAS;
const wantsBasket = (s: State, p: Person) => (!!halvOf(s, p, ['korg']) || knows(p, 'korg') && canMakeBasket(s, p)) && baskets(s) < basketsWanted(s) && !doingAct(s, 'korg', p);
export function basketDone(s: State, p: Person) {
  addTool(s, 'korg', p);
  count(s, 'korgarGjorda');
  if (s.stat!.korgarGjorda === 1) log(s, `${p.name} flätade byns första korg av hö.`, 'world', [p.id]);
}

// ---------- redskap: kniv och slakt ----------
// En flintkniv är en vass flintskärva med ett skaft. Utan kniv äter byn direkt av det fällda djuret. Med kniv slaktas det
// vid elden till mer kött, ett ben och ett skinn. Ett djur med senor ger dessutom ibland ett rep, men bara om den som
// slaktar kan tekniken Rep (fisk har inga senor). Kött, ben och skinn är samma vilket djur det än kommer från.
// Kniven kräver en flinta utöver den som sparas att tända eld med. Fisken rensas med händerna vid elden till fiskkött.
// DJUR: varje art som fångas. sak = saken den ligger i förrådet som, mat = hur mycket av saken ett djur är (uppätet som
// det är), slakt = det ett djur ger slaktat eller rensat, rep = chansen per djur att senorna blir ett rep, timme = djur per
// timme. En ny art blir en rad här (fler fiskar: steg 7.4.3).
interface Djurart { sak: string; mat: number; slakt: Record<string, number>; rep: number; timme: number }
export const DJUR = {
  kanin: { sak: 'vilt', mat: SAKER.vilt!.stack!, slakt: { kott: 2.1, ben: 1, skinn: 1 }, rep: 0.15, timme: 3 },
  abborre: { sak: 'abborre', mat: 1, slakt: { fisk: 1 }, rep: 0, timme: 30 },
} satisfies Record<string, Djurart>;
export const KANIN = DJUR.kanin.mat; // så mycket mat en kanin är, uppäten som den är: en stack fällt vilt (saker.ts)
export const SLAKT = DJUR.kanin.slakt; // det en kanin ger slaktad
export const SLAKT_TIMME = DJUR.kanin.timme; // kaniner per timme
const knives = (s: State) => nTools(s, 'kniv');
export const vilt = (s: State) => amountOf(s, 'vilt');
export const canMakeKnife = (s: State, p: Person) => getable(s, p, 'flinta') >= 2 && getable(s, p, 'grenar') >= 1;
export const wantsKnife = (s: State, p: Person) => (!!halvOf(s, p, ['kniv']) || knows(p, 'kniv') && canMakeKnife(s, p)) && knives(s) < 1 && !doingAct(s, 'kniv', p);
export function makeKnife(s: State, p: Person) { if (canMakeKnife(s, p)) { takeRecipe(s, p, 'kniv'); knifeDone(s, p); } }
export function knifeDone(s: State, p: Person) {
  addTool(s, 'kniv', p);
  count(s, 'knivarGjorda');
  if (s.stat!.knivarGjorda === 1) log(s, `${p.name} gjorde byns första flintkniv. Nu kan viltet slaktas.`, 'world', [p.id]);
}
// det finns vilt att slakta (minst en halv kanin) och en kniv som ingen annan slaktar med
export const canSlaughter = (s: State, p: Person) => knows(p, 'kniv') && freeTools(s, p, 'kniv') >= 1 && vilt(s) >= KANIN / 2 && !doingAct(s, 'slakta', p);
export function slaughter(s: State, p: Person, hours: number) {
  const n = Math.min(hours * SLAKT_TIMME, vilt(s) / KANIN); // kaniner
  if (n <= 0 || knives(s) < 1) { if (p.task) p.task.until = s.now; return; }
  // köttet, benet, skinnet och senorna är deras som ägde viltet, inte slaktarens
  const art: Djurart = DJUR.kanin, vems = stycka(s, p, art, n);
  // senorna blir med liten chans ett helt rep, som tillhör den som ägde mest av viltet
  if (art.rep > 0 && knows(p, 'rep') && amountOf(s, 'rep') < REP_VILL && rnd(s, 'arbete', p) < n * art.rep) {
    const agare = Object.keys(vems).sort((a, b) => vems[b] - vems[a])[0];
    put(s, 'rep', 1, agare !== undefined ? { [agare]: 1 } : undefined);
    count(s, 'repAvSenor');
  }
  wearUsed(s, p, n); // kniven håller för ungefär 250 kaniner
  const first = !(s.stat?.slaktat);
  count(s, 'slaktat', n);
  if (first) log(s, `${p.name} slaktade byns första vilt med en flintkniv. Det gav mer kött, ett ben och ett skinn.`, 'world', [p.id]);
}

// det som fångats delas upp: köttet och resten är deras som ägde fångsten, inte den som slaktar eller rensar
function stycka(s: State, p: Person, art: Djurart, n: number) {
  const vems = use(s, p, art.sak, n * art.mat);
  for (const [k, m] of Object.entries(art.slakt)) put(s, k, n * m, addDel({}, vems, m / art.mat));
  return vems;
}
// fisken rensas vid elden av den som är där, med händerna; en i taget rensar
export const abborrar = (s: State) => amountOf(s, DJUR.abborre.sak);
export const canClean = (s: State, p: Person) => abborrar(s) >= 1 && !doingAct(s, 'rensa', p);
export function clean(s: State, p: Person, hours: number) {
  const art: Djurart = DJUR.abborre, n = Math.min(hours * art.timme, abborrar(s) / art.mat);
  if (n <= 0) { if (p.task) p.task.until = s.now; return; }
  stycka(s, p, art, n);
  const first = !(s.stat?.rensat);
  count(s, 'rensat', n);
  if (first) log(s, `${p.name} rensade byns första abborre vid elden. Den blev fiskkött.`, 'world', [p.id]);
}

// ---------- att göra ett redskap som saknas ----------
// För varje grupp av redskap (handlingarnas redskap, saker.ts): när någon vill göra ett, och vad hen gör då. spar = hö
// som ska sparas till elden
// så många minuter det tar att göra en (saker.ts)
export const minOf = (k: string) => SAKER[k]!.skaffa!.min!;
interface Tillverka { vill: (s: State, p: Person, spar: number) => boolean; gor: (s: State, p: Person) => { act: Act; text: string; min: number; tool?: string } }
export const TILLVERKA: Record<string, Tillverka> = {
  korg: { vill: (s, p, spar) => (!!halvOf(s, p, ['korg']) || amountOf(s, 'torrgras') >= spar) && wantsBasket(s, p), gor: () => ({ act: 'korg', text: 'Flätar en korg av hö.', min: minOf('korg') }) },
  metspo: { vill: (s, p) => wantsRod(s, p), gor: () => ({ act: 'metspo', text: 'Gör ett metspö med en krok av ben.', min: minOf('metspo') }) },
  spjut: {
    vill: (s, p) => wantsSpear(s, p),
    gor: (s, p) => spearKind(s, p) === 'flintspjut' ? { act: 'spjut', text: 'Gör ett flintspjut med flinta och rep.', min: minOf('flintspjut'), tool: 'flintspjut' }
      : { act: 'spjut', text: `Täljer ett träspjut med ${sharpTool(s) === 'yxa' ? 'yxan' : 'en flintsten'}.`, min: minOf('fiskespjut') },
  },
};
