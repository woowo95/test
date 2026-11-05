import type { DjurStrid } from './strid';
import { KROPP, count, doingAct, forstaGang, gjort, living, log } from './folk';
import { knows } from './teknik';
import { clamp, rnd } from './slump';
import { Act, HOUR, State, Person } from './typer';
import { ACTS, ACT_LIST, toolRow } from './handlingar';
import { SAKER, SAK_LIST, gruppOf, isTool, sakNamn } from './saker';
import { nyKvalitet } from './kvalitet';
import { amountOf, gain, put, use } from './lager';
import { getable, Recept, takeMaterial, takeRecipe } from './behov';
import { addDel } from './egendom';
import { TROSKEL, villAv } from './forradsmal';
import { addTool, freeTools, halvOf, nTools, ownsFree, tingOf, wearTool } from './agande';
import { KLADER, KLADMATERIAL, PLAGG, PLAGG_LIST, kladAv, materialTill, valMaterial } from './klader';
import { ageIndex, kallTid } from './tid';
import { grundvarde } from './varde';
import { anseendeSym } from './rykten';
import { DORRAR, DORR_LIST } from './byggnad';
import { utanDorr } from './bygg';
import { balans } from './balans';
import { fartVid, kanGoras, nyttVid, slitVid } from './stationer';
import { smutsa } from './smuts';

// ---------- balanstal (regel 8) ----------
// Vad byn sparar när den gör redskap (hur många den vill ha står i REDSKAPMAL i forradsmal.ts, steg 6.2.17). Hur mycket ett redskap kräver står i receptet (skaffa.av
// i saker.ts) och läses därifrån (RECEPT); hur länge det håller och vad det ger står i handlingens rad (handlingar.ts).
export const REDSKAP = balans('redskap', {
  maskPerGrav: 4, // en grävning ger så här många maskar
  slaktMinDel: 2, // vilt slaktas när det finns minst 1 / Del kanin
  kottMin: 0.8, kottMax: 1.2, kottFull: 20, // slakten ger så stor del av köttet (slakt.kott i DJUR) utan jaktfärdighet, och så stor del med färdigheten Full eller mer
  slitet: 0.25, // ett redskap eller plagg som har så här lite kvar (t.c) är slitet: ett nytt görs medan det håller (underhållet, steg 6.2.12)
  bensylSlits: 0.1, // ett plagg som sys slits bensylen vid slöjdbänken så här mycket (tio plagg per bensyl, steg 2.3.2)
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
// ---------- rep ----------
// Rep tvinnas av växtfibrer (hö) av den som kan det, vid slöjdbänken (stationer.ts) och fortare där, annars för hand vid
// elden, eller tas från senor när vilt slaktas. Det är samma rep
// oavsett material. Rep behövs till flintspjut och metspö.
const REP_TIMME = 60 / SAKER.rep!.skaffa!.min!; // rep per timme
export const wantsRope = (s: State, p: Person) => knows(p, 'rep') && amountOf(s, 'rep') < TROSKEL.repVill && getable(s, p, 'torrgras') >= REP.torrgras + TROSKEL.torrgras; // lite hö sparas till elden
export function twineRope(s: State, p: Person, hours: number, vill: number = TROSKEL.repVill) { // vill: så många rep byn vill ha (fler att byta med handlaren, steg 6.2.11)
  const f = fartVid(s, p, 'tvinna'), bank = f > 1; // vid slöjdbänken
  const n = Math.min(hours * REP_TIMME * f, (getable(s, p, 'torrgras') - TROSKEL.torrgras) / REP.torrgras, vill - amountOf(s, 'rep'));
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

// ---------- redskap: kniv och slakt ----------
// En flintkniv är en vass flintskärva med ett skaft. Utan kniv och slaktbänk äter byn direkt av det fällda djuret. Med kniv
// slaktas det vid slaktbänken till mer kött, ett ben och ett skinn. Ett djur med senor ger dessutom ibland ett rep, men bara om den som
// slaktar kan tekniken Rep (fisk har inga senor). Köttet och skinnet är eget för varje art (kaninkött, vargkött, kaninskinn,
// vargskinn; steg 3.7.14), men benen är samma sak. Talgen, djurfettet, är också samma sak för alla arter: kaninen ger 1, vargen 3
// (rådjuret 2 och björnen 6 när de kommer; steg 6.3.5).
// Jaktfärdigheten avgör hur mycket kött man får ut av djuret (kottFaktor, steg 2.2.3).
// Kniven kräver en flinta utöver den som sparas att tända eld med. Fisken rensas med händerna till fiskkött.
// Viltet slaktas och fisken rensas bara vid slaktbänken (bara i STATIONER, stationer.ts; Björn, steg 2.2.6 och 2.2.8); innan
// byn har en äts de som de är. Den som slaktar måste ha en kniv: bänkens, som ligger kvar där, eller sin egen.
// DJUR: varje art som fångas. sak = saken den ligger i förrådet som, mat = hur mycket av saken ett djur är (uppätet som
// det är), slakt = det ett djur ger slaktat eller rensat, rep = chansen per djur att senorna blir ett rep, timme = djur per
// timme, maxTim = arbetet varar högst så här många timmar, act = arbetet där det görs (vid slaktbänken), kniv = det kräver en kniv (och att man kan tekniken), minDel = det görs när
// det finns minst 1 / minDel djur, stat = räknas (i djur), forsta = loggen första gången. En ny art blir en rad här (fler
// fiskar: steg 7.4.3). kott = köttet, som blir mer med jaktfärdigheten (kottAv). Flera arter kan ha samma arbete (kaninen och
// vargen slaktas): arbetet tar den första arten i registret som finns i förrådet. Allt är hela saker (steg 3.6.13). Kött, ben och skinn har inget recept i saker.ts och är värda
// golvet för sin nivå (varde.ts); där receptet finns (skaffa.av, som fisken av en abborre) kontrollerar scenariot "djur" att
// det stämmer med raden här.
export interface Djurart { sak: string; kott?: string; mat: number; slakt: Record<string, number>; rep: number; timme: number; maxTim: number; act: Act; kniv?: true; minDel: number; stat: string; forsta: string; strid?: DjurStrid } // strid = hur djuret slåss (strid.ts, steg 3.7.5)
export const DJUR = {
  kanin: { sak: 'vilt', kott: 'kott', mat: 2, // en kanin är två fällt vilt (4 kg styck sedan steg 4.5.5.1)
    slakt: { kott: 3, ben: 1, skinn: 1, talg: 1 }, rep: 0.15, timme: 15, maxTim: 2, act: 'slakta', kniv: true, minDel: REDSKAP.slaktMinDel, stat: 'slaktat', forsta: '{namn} slaktade byns första vilt med en flintkniv. Det gav mer kött, ett ben och ett skinn.', strid: { namn: 'Haren', art: 'Hare', alder: 6, styrka: 2, uthallighet: 6, mod: 2, smidighet: 16, skicklighet: 4, fart: 1.4, vapen: 'bett' } },
  abborre: { sak: 'abborre', mat: 1, slakt: { fisk: 1 }, rep: 0, timme: 30, maxTim: 1, act: 'rensa', minDel: 1, stat: 'rensat', forsta: '{namn} rensade byns första abborre. Den blev fiskkött.' },
  varg: { sak: 'varg', kott: 'vargkott', mat: 1, slakt: { vargkott: 12, ben: 3, vargskinn: 1, talg: 3 }, rep: 0.6, timme: 2, maxTim: 2, act: 'slakta', kniv: true, minDel: 1, stat: 'slaktatVarg', forsta: '{namn} slaktade byns första varg. Den gav mycket kött, ben och ett tjockt vargskinn.', strid: { namn: 'Vargen', art: 'Varg', alder: 12, styrka: 10, uthallighet: 14, mod: 10, smidighet: 16, skicklighet: 9, fart: 1.5, vapen: 'vargbett' } }, // snabb och svår att träffa, duckar men parerar inte och biter hårt (steg 3.7.1)
} satisfies Record<string, Djurart>;
export const DJURARTER: readonly Djurart[] = Object.values(DJUR);
export const KANIN = DJUR.kanin.mat; // så mycket mat en kanin är, uppäten som den är: två fällt vilt (saker.ts)
export const SLAKT = DJUR.kanin.slakt; // det en kanin ger slaktad
const knives = (s: State) => nTools(s, 'kniv');
// så många djur av arten som finns i förrådet
export const djurKvar = (s: State, art: Djurart) => amountOf(s, art.sak) / art.mat;
// p kan slakta eller rensa arten: byn har stationen om det bara görs där (viltet och fisken vid slaktbänken), det finns
// tillräckligt, en kniv som ingen annan slaktar med (om det behövs; hen kan kniven eller äger en köpt, steg 4.5.4.16), och ingen
// annan gör det redan
export const canProcess = (s: State, p: Person, art: Djurart) => kanGoras(s, art.act, p) && (!art.kniv || (knows(p, 'kniv') || tingOf(s).some(t => t.agare === p.id && t.k === 'kniv')) && freeTools(s, p, 'kniv') >= 1) && djurKvar(s, art) >= 1 / art.minDel && !doingAct(s, art.act, p);
// slakta eller rensa i hours timmar. Köttet, benet, skinnet och senorna är deras som ägde djuren, inte den som gör det
export function bearbeta(s: State, p: Person, art: Djurart, hours: number) {
  const n = Math.min(hours * art.timme, djurKvar(s, art));
  if (n <= 0 || art.kniv && knives(s) < 1 || !kanGoras(s, art.act)) { if (p.task) p.task.until = s.now; return; }
  const vems = stycka(s, p, art, n);
  // senorna blir med liten chans ett helt rep, som tillhör den som ägde mest av djuren
  if (art.rep > 0 && knows(p, 'rep') && amountOf(s, 'rep') < TROSKEL.repVill && rnd(s, 'arbete', p) < n * art.rep) {
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
// (gors) står i sakens rad. Hur många byn vill ha av varje grupp står i REDSKAPMAL (forradsmal.ts). Ett nytt redskap blir en rad i saker.ts, och
// en ny grupp också en rad i REDSKAPMAL (forradsmal.ts) och en handling (handlingar.ts).
// så många minuter det tar att göra en (saker.ts)
export const minOf = (k: string) => SAKER[k]!.skaffa!.min!;
// redskapen som görs, i grupper av sådana som kan ersätta varandra, det bästa först (i den ordning handlingarna tar dem)
const ORDNING = ACT_LIST.flatMap(a => Object.keys(ACTS[a].redskap ?? {}));
const plats = (k: string) => { const i = ORDNING.indexOf(k); return i < 0 ? ORDNING.length : i; };
export const GORS: Record<string, string[]> = {};
for (const k of SAK_LIST) if (SAKER[k]!.gors) (GORS[gruppOf(k)] ??= []).push(k);
for (const ks of Object.values(GORS)) ks.sort((a, b) => plats(a) - plats(b));
// hur många byn har av gruppen g (hur många den vill ha: villAv i forradsmal.ts, steg 6.2.17)
export const harAv = (s: State, g: string) => GORS[g].reduce((a, k) => a + nTools(s, k), 0);
// verktyget som används till k (det första som finns i byn), eller undefined. En sliten yxa är fortfarande en yxa
const verktygFor = (s: State, k: string) => Object.keys(SAKER[k]!.skaffa!.verktyg ?? {}).find(m => isTool(m) ? nTools(s, m) >= 1 : amountOf(s, m) >= 1);
const ordFor = (s: State, k: string) => { const m = verktygFor(s, k); return m ? SAKER[k]!.skaffa!.verktyg![m] : ''; };
// p kan få tag i det som behövs till k: verktyget och materialet, och en flinta över att tända eld med.
// Materialet tas i behovsstegen (behov.ts): sitt eget, byns, en gåva, och annars av andras (en lindrig stöld)
const hasRecipe = (s: State, p: Person, k: string) => (!SAKER[k]!.skaffa!.verktyg || !!verktygFor(s, k))
  && Object.entries(av(k)).every(([m, n]) => getable(s, p, m) >= n + (m === 'flinta' ? TROSKEL.flintaSparas : 0) - 1e-9); // 1e-9: avrundningen i förrådet
// p kan tekniken och kan få tag i det som behövs
export const canMake = (s: State, p: Person, k: string) => { const tek = SAKER[k]!.skaffa!.tek; return (!tek || knows(p, tek)) && hasRecipe(s, p, k); };
// det slag i gruppen g som p gör: det hen redan har påbörjat, annars det bästa hen kan göra (ett plagg: det material hen
// väljer, materialVal), annars det enklaste
export const kindFor = (s: State, p: Person, g: string) => {
  const ks = GORS[g], halv = halvOf(s, p, ks)?.halv!.gor;
  if (halv) return halv;
  if (!(g in PLAGG)) return ks.find(k => canMake(s, p, k)) ?? ks[ks.length - 1];
  const kan = ks.filter(k => canMake(s, p, k));
  return materialVal(s, p, g, kan) ?? ks[ks.length - 1];
};
// ---------- kläderna: valet av material (steg 3.10.12, valMaterial i klader.ts) ----------
// läget när p ska sy ett plagg i gruppen g av något av slagen ks (alla går att göra nu): kylan (hösten, istiden eller någon
// som fryser), hotet (vargar sedda nära byn eller en strid i byn nyligen), vad varje material värmer och skyddar, hur mycket
// som finns kvar, det som behövs till annat (plagg som andra saknar och dörrar som saknas, när någon kan göra dem) och
// värdet. Den som syr åt sig själv (har inget plagg av slaget) och har gott anseende tar det finare (punkt 6)
function materialVal(s: State, p: Person, g: string, ks: string[]) {
  if (ks.length <= 1) return ks[0];
  const ai = ageIndex(s), folk = living(s), nara = (t?: number) => t !== undefined && s.now - t < KLADER.hotTim * HOUR;
  const kyla = kallTid(ai) || folk.some(q => q.warm < KROPP.fryser);
  const hot = (s.vargar ?? []).some(f => nara(f.sedd)) || (s.strider ?? []).some(m => nara(m.t));
  const lage = ks.map(k => {
    const r = kladAv(k)!, M = KLADMATERIAL[r.mat], till = materialTill(r.plagg, r.mat);
    let behovs = 0;
    for (const q of PLAGG_LIST) if (PLAGG[q].slag.includes(M.slag)) behovs += Math.max(0, villAv(s, q) - harAv(s, q) - (q === g ? 1 : 0)) * materialTill(q, r.mat);
    for (const d of DORR_LIST) { const n = (DORRAR[d].av as Record<string, number>)[M.sak]; if (n && folk.some(q => DORRAR[d].tek.every(t => knows(q, t)))) behovs += n * utanDorr(s, d).length; }
    return { k, varme: SAKER[k]!.klad!.varme, skydd: M.skydd, kvar: amountOf(s, M.sak) - till, behovs, till, finhet: M.finhet, varde: grundvarde(k) };
  });
  const egen = !tingOf(s).some(t => (t.agare === p.id || t.bar === p.id) && gruppOf(t.k) === g);
  return valMaterial(lage, { kyla, hot, fin: egen && anseendeSym(s, p.id) === '😇' });
}
// det slag p börjar göra när hen kommer fram, om hen kan (paborjat.ts)
export const borjaTool = (s: State, p: Person, g: string, handel?: string) => { const k = handel && GORS[g].includes(handel) ? handel : kindFor(s, p, g); return canMake(s, p, k) ? k : undefined; };
// arbetet att göra ett redskap av slaget k att byta med handlaren (steg 6.2.11, varorna i val.ts): p kan göra det (eller har
// påbörjat ett av slaget), där det görs, och ingen annan gör ett i gruppen. undefined annars
export function handelTask(s: State, p: Person, k: string) {
  const g = gruppOf(k), ks = GORS[g];
  if (!ks?.includes(k) || !kanGoras(s, g as Act, p) || doingAct(s, g as Act, p)) return undefined;
  const halv = halvOf(s, p, ks)?.halv!.gor;
  if (halv ? halv !== k : !canMake(s, p, k)) return undefined;
  return { act: g as Act, text: SAKER[k]!.gors!.text.replace('{verktyg}', ordFor(s, k)), min: minOf(k), tool: k };
}
// p vill göra ett redskap i gruppen g: hen har påbörjat ett eller kan göra ett, byn har färre än den vill, och ingen
// annan gör ett. spar = hö som ska sparas till värmen (ett recept med hö görs bara när byn har så mycket). Det som bara
// görs vid en station (korgen vid slöjdbänken, stationer.ts) görs inte förrän byn har den
export const wantsTool = (s: State, p: Person, g: string, spar = 0) => {
  const ks = GORS[g];
  return kanGoras(s, g as Act, p) && (!!halvOf(s, p, ks) || ks.some(k => canMake(s, p, k) && (!av(k).torrgras || amountOf(s, 'torrgras') >= spar)))
    && harAv(s, g) < villAv(s, g) && !doingAct(s, g as Act, p);
};
// underhållet (steg 6.2.12, nivån Förbättra i val.ts): en grupp där byn har så många den vill, men några av dem är slitna
// (REDSKAP.slitet) så att de hela är färre än byn vill ha. Inget lagas: ett nytt görs medan det gamla håller, och det gamla
// används tills det går sönder. p kan göra ett (eller har påbörjat ett) och ingen annan gör ett i gruppen. undefined annars
export function underhallGrupp(s: State, p: Person) {
  for (const g in GORS) {
    const ks = GORS[g], vill = villAv(s, g);
    if (!vill || harAv(s, g) < vill) continue; // färre än byn vill: det vanliga arbetet gör dem
    const hela = tingOf(s).reduce((n, t) => n + (ks.includes(t.k) && t.c >= REDSKAP.slitet ? 1 : 0), 0);
    if (hela >= vill || !kanGoras(s, g as Act, p) || doingAct(s, g as Act, p)) continue;
    if (halvOf(s, p, ks) || ks.some(k => canMake(s, p, k))) return g;
  }
  return undefined;
}
// materialet p saknar till ett redskap i gruppen g som byn vill ha fler av: p kan tekniken och har verktyget till det första
// slaget hen kan göra, men inte materialet (projekt.ts, steg 6.1.17). undefined när p kan göra det, eller inte kan alls
export function receptTill(s: State, p: Person, g: string): Recept | undefined {
  const ks = GORS[g];
  if (!kanGoras(s, g as Act, p) || harAv(s, g) >= villAv(s, g) || doingAct(s, g as Act, p) || halvOf(s, p, ks)) return undefined;
  const k = ks.find(k => { const tek = SAKER[k]!.skaffa!.tek; return (!tek || knows(p, tek)) && (!SAKER[k]!.skaffa!.verktyg || !!verktygFor(s, k)); });
  return k ? { av: av(k), spar: m => m === 'flinta' ? TROSKEL.flintaSparas : 0 } : undefined;
}
// arbetet att göra ett redskap i gruppen g. tool = slaget som görs när gruppen har flera (namnet på arbetet, handlingar.ts)
export function makeTask(s: State, p: Person, g: string) {
  const k = kindFor(s, p, g);
  return { act: g as Act, text: SAKER[k]!.gors!.text.replace('{verktyg}', ordFor(s, k)), min: minOf(k), tool: GORS[g].length > 1 ? k : undefined };
}
// redskapet k är klart (materialet togs när arbetet började, paborjat.ts). Första gången står det i loggen. En kniv läggs
// vid slaktbänken om knivplatsen där står tom, och blir byns, och en bensyl likadant vid slöjdbänken (stationer.ts). Ett
// plagg (och en vattensäck) sys med bänkens bensyl, och den slits för varje (REDSKAP.bensylSlits)
export function toolDone(s: State, p: Person, k: string) {
  const t = addTool(s, k, p); t.av = p.id; t.gjord = s.now; // vem som gjorde det och när (inforutan, steg 2.3.5)
  nyKvalitet(s, p, t, !!p.task && fartVid(s, p, p.task.act) > 1, sakNamn(k).toLowerCase()); // hur bra det blev (kvalitet.ts)
  nyttVid(s, t); gjort(s, p, 'gjort');
  slitVid(s, gruppOf(k) as Act, REDSKAP.bensylSlits); // det som kräver bänkens redskap (plaggen och vattensäcken), efter arbetet och inte saken
  const g = SAKER[k]!.gors!, text = (t: string) => t.replace('{namn}', p.name).replace('{verktyg}', ordFor(s, k));
  if (forstaGang(s, g.stat)) {
    log(s, text(g.forsta), 'world', [p.id]);
    if (g.fame) p.fame.push(g.fame);
  } else if (g.igen) log(s, text(g.igen), 'world', [p.id]);
}
// ett redskap görs på en gång (i testerna)
export function makeTool(s: State, p: Person, g: string) {
  const k = kindFor(s, p, g);
  if (hasRecipe(s, p, k)) { takeRecipe(s, p, k); toolDone(s, p, k); }
}
