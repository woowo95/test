import type { DjurStrid } from './strid';
import { ALDER, ageOf, count, doingAct, forstaGang, gjort, living, log } from './folk';
import { knows } from './teknik';
import { clamp, rnd } from './slump';
import { Act, State, Person } from './typer';
import { ACTS, ACT_LIST, toolRow } from './handlingar';
import { SAKER, SAK_LIST, gruppOf, isTool, sakNamn } from './saker';
import { nyKvalitet } from './kvalitet';
import { amountOf, gain, put, use } from './lager';
import { getable, takeMaterial, takeRecipe } from './behov';
import { addDel } from './egendom';
import { RESERV } from './ekonomi';
import { addTool, freeTools, halvOf, nTools, ownsFree, wearTool } from './agande';
import { balans } from './balans';
import { sedEvent } from './seder';
import { fartVid, kanGoras, nyttVid, slitVid, tommaKnivplatser, tommaPlatser } from './stationer';
import { smutsa } from './smuts';

// ---------- balanstal (regel 8) ----------
// Hur många redskap byn vill ha och vad den sparar när den gör dem. Hur mycket ett redskap kräver står i receptet (skaffa.av
// i saker.ts) och läses därifrån (RECEPT); hur länge det håller och vad det ger står i handlingens rad (handlingar.ts).
// Ett redskap räknas per vuxen från ALDER.vuxen (yxan från yxaFran)
export const REDSKAP = balans('redskap', {
  flintaSparas: 1, // flintor som sparas att tända eld med: ett redskap av flinta görs bara av det som är över (receptet plus detta)
  spjutPerVuxna: 3, spjutMin: 1, spjutMax: 4, // byn vill ha ett spjut (och ett metspö) per så här många vuxna, minst Min och högst Max
  korgPerVuxna: 3, korgMin: 1, korgMax: 5, // ... en korg
  yxaPerVuxna: 4, yxaMin: 1, yxaMax: 3, yxaFran: 16, yxaBygge: 1, // ... en yxa, räknat på dem som är över Fran år, och Bygge till medan ett hus byggs (träden där det ska stå)
  knivar: 1, // ... så många knivar, och en till för varje tom knivplats vid en station (stationer.ts)
  repVill: 4, // ... så många rep (tvinnat eller från senor)
  maskPerGrav: 4, // en grävning ger så här många maskar
  slaktMinDel: 2, // vilt slaktas när det finns minst 1 / Del kanin
  kottMin: 0.8, kottMax: 1.2, kottFull: 20, // slakten ger så stor del av köttet (slakt.kott i DJUR) utan jaktfärdighet, och så stor del med färdigheten Full eller mer
  spadar: 1, // så många benspadar byn vill ha (steg 2.7.2)
  vattensackar: 1, // så många vattensäckar byn vill ha (steg 2.10.1)
  bensylSlits: 0.1, // ett plagg som sys slits bensylen vid slöjdbänken så här mycket (tio plagg per bensyl, steg 2.3.2)
  nyfiken: 0.08, // ett redskap med nyfiken i saker.ts (yxan) gör sedernas nyfikenhet så här mycket större första gången
});
// vad ett slag kräver, ur receptet (skaffa.av i saker.ts)
const av = (k: string) => SAKER[k]!.skaffa!.av!;
const REP = av('rep');

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
// slitage på redskapet i handen: n av det handlingen slits per (ACTS.slits: träd, kaniner, fiskeförsök, djur eller det som
// samlas, steg 2.3.12), så att ett redskap räcker lika länge hur fort arbetet än går. Går det sönder räknas det, och första
// gången står det i loggen. Alla redskap slits så (steg 2.2.1); dessutom slits allt sakta där det ligger eller bärs (wearStore i lager.ts)
export function wearUsed(s: State, p: Person, n: number) {
  const r = toolRow(p.task), k = p.task?.tool;
  if (!r?.haller || !k) return;
  if (!wearTool(s, p, k, n / r.haller)) return;
  const tr = SAKER[k]?.trasig, forsta = tr ? forstaGang(s, tr.stat) : false;
  if (p.task) { p.task.tool = undefined; if (r.kravs) p.task.until = s.now; } // utan yxan slutar man fälla och hugga
  if (tr?.text && forsta) log(s, tr.text.replace('{namn}', p.name), 'world', [p.id]);
}
// byn vill ha ungefär ett spjut per tre vuxna, när någon väl har börjat fiska eller jaga
const spearsWanted = (s: State) => (s.stat?.fiskeForsok ?? 0) > 0 || (s.stat?.prod_jakt ?? 0) > 0 ? clamp(Math.floor(living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen).length / REDSKAP.spjutPerVuxna), REDSKAP.spjutMin, REDSKAP.spjutMax) : 0;
// ---------- rep ----------
// Rep tvinnas av växtfibrer (hö) av den som kan det, vid slöjdbänken (stationer.ts) och fortare där, annars för hand vid
// elden, eller tas från senor när vilt slaktas. Det är samma rep
// oavsett material. Rep behövs till flintspjut och metspö.
const REP_TIMME = 60 / SAKER.rep!.skaffa!.min!; // rep per timme
export const wantsRope = (s: State, p: Person) => knows(p, 'rep') && amountOf(s, 'rep') < REDSKAP.repVill && getable(s, p, 'torrgras') >= REP.torrgras + RESERV.torrgras; // lite hö sparas till elden
export function twineRope(s: State, p: Person, hours: number) {
  const f = fartVid(s, p, 'tvinna'), bank = f > 1; // vid slöjdbänken
  const n = Math.min(hours * REP_TIMME * f, (getable(s, p, 'torrgras') - RESERV.torrgras) / REP.torrgras, REDSKAP.repVill - amountOf(s, 'rep'));
  if (n <= 0) return;
  takeMaterial(s, p, 'torrgras', n * REP.torrgras);
  gain(s, p, 'rep', n);
  const first = !(s.stat?.rep);
  count(s, 'rep', n);
  if (first) log(s, `${p.name} började tvinna rep av hö ${bank ? 'vid slöjdbänken' : 'i byn'}.`, 'world', [p.id]);
  if (bank) count(s, 'repBank', n);
}

// ---------- redskap: metspö ----------
// Ett metspö görs av en gren, ett rep och en krok av ben. Mask grävs fram före fisket och sätts på kroken; varje napp
// tar en mask. Med metspö nappar fisken oftare och sitter kvar bättre än på spjutet.

// ---------- redskap: korg ----------
// En korg flätas av hö av den som kan det. Med korg bär man hem mer från varje tur och spiller mindre bär.
// Korgen slits för varje sak som samlas i den (haller i handlingar.ts).
// ungefär en korg per tre vuxna
const basketsWanted = (s: State) => clamp(Math.floor(living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen).length / REDSKAP.korgPerVuxna), REDSKAP.korgMin, REDSKAP.korgMax);

// ---------- redskap: kniv och slakt ----------
// En flintkniv är en vass flintskärva med ett skaft. Utan kniv och slaktbänk äter byn direkt av det fällda djuret. Med kniv
// slaktas det vid slaktbänken till mer kött, ett ben och ett skinn. Ett djur med senor ger dessutom ibland ett rep, men bara om den som
// slaktar kan tekniken Rep (fisk har inga senor). Köttet och skinnet är eget för varje art (kaninkött, vargkött, kaninskinn,
// vargskinn; steg 3.7.14), men benen är samma sak.
// Jaktfärdigheten avgör hur mycket kött man får ut av djuret (kottFaktor, steg 2.2.3).
// Kniven kräver en flinta utöver den som sparas att tända eld med. Fisken rensas med händerna till fiskkött.
// Viltet slaktas och fisken rensas bara vid slaktbänken (bara i STATIONER, stationer.ts; Björn, steg 2.2.6 och 2.2.8); innan
// byn har en äts de som de är. Den som slaktar måste ha en kniv: bänkens, som ligger kvar där, eller sin egen.
// DJUR: varje art som fångas. sak = saken den ligger i förrådet som, mat = hur mycket av saken ett djur är (uppätet som
// det är), slakt = det ett djur ger slaktat eller rensat, rep = chansen per djur att senorna blir ett rep, timme = djur per
// timme, maxTim = arbetet varar högst så här många timmar, act = arbetet där det görs (vid slaktbänken), kniv = det kräver en kniv (och att man kan tekniken), minDel = det görs när
// det finns minst 1 / minDel djur, stat = räknas (i djur), forsta = loggen första gången. En ny art blir en rad här (fler
// fiskar: steg 7.4.3). kott = köttet, som blir mer med jaktfärdigheten (kottAv). Flera arter kan ha samma arbete (kaninen och
// vargen slaktas): arbetet tar den första arten i registret som finns i förrådet. Allt är hela saker (steg 3.6.13). Värdet av det ett djur ger: varde = hur djurets värde delas på
// det slaktade, i delar per styck (kött, ben och skinn har inget recept i saker.ts). Utan varde står receptet i saker.ts
// (skaffa.av, som fisken av en abborre); scenariot "djur" kontrollerar att de stämmer med raden här.
export interface Djurart { sak: string; kott?: string; mat: number; slakt: Record<string, number>; varde?: Record<string, number>; rep: number; timme: number; maxTim: number; act: Act; kniv?: true; minDel: number; stat: string; forsta: string; strid?: DjurStrid } // strid = hur djuret slåss (strid.ts, steg 3.7.5)
export const DJUR = {
  kanin: { sak: 'vilt', kott: 'kott', mat: SAKER.vilt!.stack!, slakt: { kott: 3, ben: 1, skinn: 1 }, varde: { kott: 4, ben: 1, skinn: 2 }, rep: 0.15, timme: 15, maxTim: 2, act: 'slakta', kniv: true, minDel: REDSKAP.slaktMinDel, stat: 'slaktat', forsta: '{namn} slaktade byns första vilt med en flintkniv. Det gav mer kött, ett ben och ett skinn.', strid: { namn: 'Kaninen', art: 'Kanin', alder: 6, styrka: 2, uthallighet: 6, mod: 2, smidighet: 16, skicklighet: 4, fart: 1.4, vapen: 'bett' } },
  abborre: { sak: 'abborre', mat: 1, slakt: { fisk: 1 }, rep: 0, timme: 30, maxTim: 1, act: 'rensa', minDel: 1, stat: 'rensat', forsta: '{namn} rensade byns första abborre. Den blev fiskkött.' },
  varg: { sak: 'varg', kott: 'vargkott', mat: 1, slakt: { vargkott: 12, ben: 3, vargskinn: 1 }, varde: { vargkott: 4, ben: 1, vargskinn: 12 }, rep: 0.6, timme: 2, maxTim: 2, act: 'slakta', kniv: true, minDel: 1, stat: 'slaktatVarg', forsta: '{namn} slaktade byns första varg. Den gav mycket kött, ben och ett tjockt vargskinn.', strid: { namn: 'Vargen', art: 'Varg', alder: 12, styrka: 10, uthallighet: 14, mod: 10, smidighet: 16, skicklighet: 9, fart: 1.5, vapen: 'vargbett' } }, // snabb och svår att träffa, duckar men parerar inte och biter hårt (steg 3.7.1)
} satisfies Record<string, Djurart>;
export const DJURARTER: readonly Djurart[] = Object.values(DJUR);
export const KANIN = DJUR.kanin.mat; // så mycket mat en kanin är, uppäten som den är: en stack fällt vilt (saker.ts)
export const SLAKT = DJUR.kanin.slakt; // det en kanin ger slaktad
const knives = (s: State) => nTools(s, 'kniv');
// så många djur av arten som finns i förrådet
export const djurKvar = (s: State, art: Djurart) => amountOf(s, art.sak) / art.mat;
// p kan slakta eller rensa arten: byn har stationen om det bara görs där (viltet och fisken vid slaktbänken), det finns
// tillräckligt, en kniv som ingen annan slaktar med (om det behövs), och ingen
// annan gör det redan
export const canProcess = (s: State, p: Person, art: Djurart) => kanGoras(s, art.act) && (!art.kniv || knows(p, 'kniv') && freeTools(s, p, 'kniv') >= 1) && djurKvar(s, art) >= 1 / art.minDel && !doingAct(s, art.act, p);
// slakta eller rensa i hours timmar. Köttet, benet, skinnet och senorna är deras som ägde djuren, inte den som gör det
export function bearbeta(s: State, p: Person, art: Djurart, hours: number) {
  const n = Math.min(hours * art.timme, djurKvar(s, art));
  if (n <= 0 || art.kniv && knives(s) < 1 || !kanGoras(s, art.act)) { if (p.task) p.task.until = s.now; return; }
  const vems = stycka(s, p, art, n);
  // senorna blir med liten chans ett helt rep, som tillhör den som ägde mest av djuren
  if (art.rep > 0 && knows(p, 'rep') && amountOf(s, 'rep') < REDSKAP.repVill && rnd(s, 'arbete', p) < n * art.rep) {
    const agare = Object.keys(vems).sort((a, b) => vems[b] - vems[a])[0];
    put(s, 'rep', 1, agare !== undefined ? { [agare]: 1 } : undefined);
    count(s, 'repAvSenor');
  }
  if (art.kniv) wearUsed(s, p, n); // kniven håller för ungefär 250 kaniner
  const first = !(s.stat?.[art.stat]);
  count(s, art.stat, n);
  smutsa(s, art.act, n); // slaktbänken blir blodig (smuts.ts)
  if (first) log(s, art.forsta.replace('{namn}', p.name), 'world', [p.id]);
}
// så stor del av köttet p får ut av djuret: mer ju bättre hen är på jakt. Köttet per djur blir ett helt tal (kottAv)
export const kottAv = (p: Person, m0: number) => Math.max(1, Math.round(m0 * kottFaktor(p)));
export const kottFaktor = (p: Person) => REDSKAP.kottMin + (REDSKAP.kottMax - REDSKAP.kottMin) * clamp(p.skill.jakt / REDSKAP.kottFull, 0, 1);
// det som fångats delas upp: köttet och resten är deras som ägde fångsten
function stycka(s: State, p: Person, art: Djurart, n: number) {
  const vems = use(s, p, art.sak, n * art.mat);
  for (const [k, m0] of Object.entries(art.slakt)) { const m = k === art.kott ? kottAv(p, m0) : m0; put(s, k, n * m, addDel({}, vems, m / art.mat)); }
  return vems;
}

// ---------- att göra ett redskap som saknas ----------
// Varje redskap med gors i saker.ts görs i ett eget arbete vid slöjdbänken, eller utan bänk inne i byn (steg 2.10.6; korgen bara vid slöjdbänken), som heter som redskapets grupp (yxa, spjut, metspo,
// kniv, korg). Receptet (skaffa.av), tekniken (skaffa.tek), verktyget (skaffa.verktyg), tiden (skaffa.min) och texterna
// (gors) står i sakens rad. Här står hur många byn vill ha av varje grupp. Ett nytt redskap blir en rad i saker.ts, och
// en ny grupp också en rad i VILL och en handling (handlingar.ts).
// så många minuter det tar att göra en (saker.ts)
export const minOf = (k: string) => SAKER[k]!.skaffa!.min!;
// redskapen som görs, i grupper av sådana som kan ersätta varandra, det bästa först (i den ordning handlingarna tar dem)
const ORDNING = ACT_LIST.flatMap(a => Object.keys(ACTS[a].redskap ?? {}));
const plats = (k: string) => { const i = ORDNING.indexOf(k); return i < 0 ? ORDNING.length : i; };
export const GORS: Record<string, string[]> = {};
for (const k of SAK_LIST) if (SAKER[k]!.gors) (GORS[gruppOf(k)] ??= []).push(k);
for (const ks of Object.values(GORS)) ks.sort((a, b) => plats(a) - plats(b));
// hur många byn vill ha av varje grupp
const VILL: Record<string, (s: State) => number> = {
  spjut: spearsWanted,
  metspo: spearsWanted, // ett metspö per spjut
  korg: basketsWanted,
  kniv: s => REDSKAP.knivar + tommaKnivplatser(s), // och en till för en tom knivplats vid slaktbänken
  bensyl: s => tommaPlatser(s, 'bensyl'), // en till slöjdbänken (steg 2.3.2)
  skinnrock: s => living(s).length, // en per person (steg 2.3.2)
  skinnskor: s => living(s).length,
  balte: s => living(s).length, // ett per person (steg 2.3.3)
  benspade: () => REDSKAP.spadar, // till latrinen och rötterna (steg 2.7.2)
  vattensack: () => REDSKAP.vattensackar, // till den som inte kan gå (steg 2.10.1)
  // en yxa per fyra över yxaFran år, och en till medan ett hus byggs (för träden där det ska stå)
  yxa: s => clamp(Math.floor(living(s).filter(q => ageOf(q, s.now) >= REDSKAP.yxaFran).length / REDSKAP.yxaPerVuxna), REDSKAP.yxaMin, REDSKAP.yxaMax) + (s.hus?.some(h => !h.klar) ? REDSKAP.yxaBygge : 0),
};
// hur många byn vill ha av gruppen g, och hur många den har (projekt.ts)
export const villAv = (s: State, g: string) => VILL[g](s);
export const harAv = (s: State, g: string) => GORS[g].reduce((a, k) => a + nTools(s, k), 0);
// verktyget som används till k (det första som finns i byn), eller undefined. En sliten yxa är fortfarande en yxa
const verktygFor = (s: State, k: string) => Object.keys(SAKER[k]!.skaffa!.verktyg ?? {}).find(m => isTool(m) ? nTools(s, m) >= 1 : amountOf(s, m) >= 1);
const ordFor = (s: State, k: string) => { const m = verktygFor(s, k); return m ? SAKER[k]!.skaffa!.verktyg![m] : ''; };
// p kan få tag i det som behövs till k: verktyget och materialet, och en flinta över att tända eld med.
// Materialet tas i behovsstegen (behov.ts): sitt eget, byns, en gåva, och annars av andras (en lindrig stöld)
const hasRecipe = (s: State, p: Person, k: string) => (!SAKER[k]!.skaffa!.verktyg || !!verktygFor(s, k))
  && Object.entries(av(k)).every(([m, n]) => getable(s, p, m) >= n + (m === 'flinta' ? REDSKAP.flintaSparas : 0) - 1e-9); // 1e-9: avrundningen i förrådet
// p kan tekniken och kan få tag i det som behövs
export const canMake = (s: State, p: Person, k: string) => { const tek = SAKER[k]!.skaffa!.tek; return (!tek || knows(p, tek)) && hasRecipe(s, p, k); };
// det slag i gruppen g som p gör: det hen redan har påbörjat, annars det bästa hen kan göra, annars det enklaste
export const kindFor = (s: State, p: Person, g: string) => { const ks = GORS[g]; return halvOf(s, p, ks)?.halv!.gor ?? ks.find(k => canMake(s, p, k)) ?? ks[ks.length - 1]; };
// det slag p börjar göra när hen kommer fram, om hen kan (paborjat.ts)
export const borjaTool = (s: State, p: Person, g: string) => { const k = kindFor(s, p, g); return canMake(s, p, k) ? k : undefined; };
// p vill göra ett redskap i gruppen g: hen har påbörjat ett eller kan göra ett, byn har färre än den vill, och ingen
// annan gör ett. spar = hö som ska sparas till värmen (ett recept med hö görs bara när byn har så mycket). Det som bara
// görs vid en station (korgen vid slöjdbänken, stationer.ts) görs inte förrän byn har den
export const wantsTool = (s: State, p: Person, g: string, spar = 0) => {
  const ks = GORS[g];
  return kanGoras(s, g as Act) && (!!halvOf(s, p, ks) || ks.some(k => canMake(s, p, k) && (!av(k).torrgras || amountOf(s, 'torrgras') >= spar)))
    && harAv(s, g) < VILL[g](s) && !doingAct(s, g as Act, p);
};
// arbetet att göra ett redskap i gruppen g. tool = slaget som görs när gruppen har flera (namnet på arbetet, handlingar.ts)
export function makeTask(s: State, p: Person, g: string) {
  const k = kindFor(s, p, g);
  return { act: g as Act, text: SAKER[k]!.gors!.text.replace('{verktyg}', ordFor(s, k)), min: minOf(k), tool: GORS[g].length > 1 ? k : undefined };
}
// redskapet k är klart (materialet togs när arbetet började, paborjat.ts). Första gången står det i loggen. En kniv läggs
// vid slaktbänken om knivplatsen där står tom, och blir byns, och en bensyl likadant vid slöjdbänken (stationer.ts). Ett
// plagg sys med bänkens bensyl, och den slits för varje (REDSKAP.bensylSlits)
export function toolDone(s: State, p: Person, k: string) {
  const t = addTool(s, k, p); t.av = p.id; t.gjord = s.now; // vem som gjorde det och när (inforutan, steg 2.3.5)
  nyKvalitet(s, p, t, !!p.task && fartVid(s, p, p.task.act) > 1, sakNamn(k).toLowerCase()); // hur bra det blev (kvalitet.ts)
  nyttVid(s, t); gjort(s, p, 'gjort');
  if (SAKER[k]!.klad) slitVid(s, k as Act, REDSKAP.bensylSlits);
  const g = SAKER[k]!.gors!, text = (t: string) => t.replace('{namn}', p.name).replace('{verktyg}', ordFor(s, k));
  if (forstaGang(s, g.stat)) {
    log(s, text(g.forsta), 'world', [p.id]);
    if (g.fame) p.fame.push(g.fame);
    if (g.nyfiken) sedEvent(s, 'nyfikenhet', REDSKAP.nyfiken, g.nyfiken);
  } else if (g.igen) log(s, text(g.igen), 'world', [p.id]);
}
// ett redskap görs på en gång (i testerna)
export function makeTool(s: State, p: Person, g: string) {
  const k = kindFor(s, p, g);
  if (hasRecipe(s, p, k)) { takeRecipe(s, p, k); toolDone(s, p, k); }
}
