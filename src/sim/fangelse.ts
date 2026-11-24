import { husIMening } from './ord';
import { DAY, HOUR, MIN, Person, State, W } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { REL, byId, count, isKin, log, relKey, stat, living } from './folk';
import { bitsOf, dorrDef, gridOf, housesOf, husById, type Hus } from './byggnad';
import { moodOf } from './humor';
import { tanke } from './tankar';
import { hemma, kanGa, utanVard, vardatSjuk } from './halsa';
import { handelse } from './rykten';

// ---------- fängelset (steg 11.12.1, Fångar och fängelset i designdokumentet) ----------
// Ett hus med funktionen Fängelse och en trädörr. Styret vill ha det genom påbudet Fängelse, och byn bygger det som ett projekt
// (BYGGNADER.fangelse i byggnader.ts). Den som sitter där (Person.fange) går inte ut genom dörren, men kan slå sönder den på
// trädörrens 20 minuter (RADER.dorrMin): hen har lämnat redskap och vapen utanför, och bommen hålls av dem som är inne. Då går
// larmet rymning, och den som rymt är fri. För en bybo är rymningen ett brott (HANDELSER.rymning) som döms som andra brott
export const FANG = balans('fangelse', {
  domDygn: 10, // domarna till Slag eller hårdare de senaste så här många dygnen (år i spelet) drar viljan att ha ett fängelse ...
  domVikt: 0.35, // ... så här mycket var
  rang: 0.3, // seden Rang drar så här mycket
  aggression: 0.04, // och ledarens aggression över mitten (10) så här mycket per steg
  bas: 0.5, // viljan börjar så här långt under noll
  galler: 0.33, // byn vill ha ett fängelse när viljan är över så här
  akut: 0.6, // byggbehovets vikt när byn vill ha ett fängelse och saknar ett, eller det är fullt
  bryt: 0.75, // fången börjar slå sönder dörren när viljan att komma ut går över detta
  modV: 0.04, // viljan att komma ut: modet över mitten (10), per steg ...
  humorV: 0.8, // ... lågt humör (1 − humöret) ...
  dygnV: 0.05, // ... varje dygn som återstår ...
  brandV: 1, // ... och mycket när det brinner nära
  fangenMin: 30, // så länge går fången till sin plats innan hen väljer igen (minuter)
  brytMin: 20, // trädörrens tid utan yxa och bom (RADER.dorrMin, Dörrar mot anfallare), i minuter: en kopia, eftersom rader.ts genom sina importer läser fangelse.ts
  lasGanger: 2, // bakom en låst dörr tar det så här många gånger längre (steg 12.5.6)
  // mat och vatten till fången (steg 11.12.2): var och en går när fångens hunger eller törst gånger närheten är minst hjalp
  hjalp: 0.15, // familj och partner (närhet 1) går tidigt ...
  van: 0.5, // ... en vän (närhet så här) senare ...
  framling: 0.2, // ... och en främling först när nöden är stor
  // straffet Fängelse (steg 11.12.3): domen är 1 till 5 hela dygn (år i spelet) efter brottets vikt
  domPerVikt: 5, // dygn per vikt (dråp 1 ger fem dygn, en stöld 0,5 tre)
  dom: 0.75, // i en dom utan lag blir det fängelse från så här mycket (händelsens vikt gånger hårdheten), mellan slag och utvisning
  // fångens dygn (steg 11.12.4): tanken Sitter inlåst är bas och dygn per helt dygn inne, högst tak, och bleknar så här många dygn efter
  tankeBas: 0.05, tankeDygn: 0.05, tankeTak: 0.3, tankeEfter: 2,
  besok: 0.4, // lusten att gå till dörren och prata på fritiden: närheten (bara familj och vänner) gånger detta, bredvid vilan och umgänget
  besokMin: 20, // ett besök vid dörren tar så här många minuter
  eld: 0.3, // elden: fångens köld (1 − värmen) gånger närheten gånger detta ska nå hjalp, så det händer sällan
  eldTim: 6, // en ved brinner så här många timmar i fängelset ...
  eldHeat: 0.6, // ... och värmer den som sitter där som en eld på så här stor styrka
  uppDygn: 0.5, // upplevelsen när fången släpps: 1 + så här mycket per dygn efter det första gånger effekten
  domareOp: 4, // och synen på den som dömde sjunker så här mycket per dygn inne
  // vakten vid fängelset (steg 11.12.5): en rad med poäng i Försörjningen, dag och natt, poängen vakt gånger fångens aggression / 10
  vakt: 3, // (maten i nöd har poäng kring 20, så i en by i nöd tar ingen vakten)
  vaktPass: 60, // ett vaktpass i minuter
  vaktSank: 0.35, // en vakt vid dörren sänker fångens vilja att komma ut så här mycket
  vaktNara: 3, // vakten står vid dörren: så här nära (rutor) räknas
  stoppBas: -0.1, stoppMod: 0.04, stoppNara: 0.3, // den som hör larmet går dit när bas + (modet − 10) × mod − närheten × nara > 0
  stoppMin: 15, // larmet räknas så här många minuter
  nattVakt: 0.5, // varje fånge räknas som så här mycket mer hot när byn väljer nattens vakter (vaktHot i val.ts)
});
// larmet, brottet och branden sätts av steg.ts, så att den här filen inte drar in dem (och importerna inte går runt)
export const fangelseKrok: { larma(s: State, p: Person): void; brott(s: State, p: Person): void; brinner(s: State, x: number, y: number): boolean; matStack(s: State, p: Person, ved?: boolean): { x: number; y: number } | undefined; slass(s: State, vakter: Person[], q: Person): void; taMat(s: State, p: Person, ved?: boolean): string | undefined; ata(s: State, q: Person, k: string): void; upplev(s: State, p: Person, om: string, ggr: number): void } = { larma: () => undefined, brott: () => undefined, brinner: () => false, matStack: () => undefined, taMat: () => undefined, ata: () => undefined, upplev: () => undefined, slass: () => undefined };
// domarna till ett hårt straff (fältet hard i STRAFF_REG, styre.ts, som sätter hardStraff när den laddas: styre.ts läser fangelse.ts)
let hardStraff: (steg: number) => boolean = () => false;
export const satHardStraff = (f: typeof hardStraff) => { hardStraff = f; };
export const hardaDomar = (s: State) => (s.styre?.ratt ?? []).filter(r => s.now - r.t < FANG.domDygn * DAY && hardStraff(r.steg)).length;
// hur mycket byn vill ha ett fängelse (steg 12.1.27: ett byhus som andra, inget påbud), −1 till 1: de hårda domarna, seden Rang
// och ledarens aggression om byn har en ledare
export function fangelseVilja(s: State) {
  const l = s.styre?.ledare === undefined ? undefined : s.people.find(p => p.id === s.styre!.ledare && p.died === undefined);
  return clamp(hardaDomar(s) * FANG.domVikt + (s.seder.v.rang ?? 0) * FANG.rang + (l ? (stat(l, 'aggression', s.now) - 10) * FANG.aggression : 0) - FANG.bas, -1, 1);
}
export const fangelseHus = (s: State) => housesOf(s).filter(h => h.fn === 'fangelse');
// dörröppningen i fängelset
export const fangelseDorr = (s: State, h: Hus) => bitsOf(s).find(b => b.hus === h.id && b.k === 'oppning');
// fängelset räknas som byggt när huset är klart och en dörr som stängs hänger i öppningen
export const fangelseKlart = (s: State, h: Hus) => !!h.klar && !!dorrDef(fangelseDorr(s, h)?.dorr)?.stanger;
export const fangar = (s: State, h?: Hus) => s.people.filter(p => p.fange && (!h || p.fange.hus === h.id));
// rutorna inne i fängelset
// fångens ruta bland n: gästernas id är negativa (steg 11.12.6)
const platsNr = (p: Person, n: number) => ((p.id % Math.max(1, n)) + Math.max(1, n)) % Math.max(1, n);
const rutorI = (s: State, h: Hus) => gridOf(s).rooms.filter(r => r.hus === h.id).flatMap(r => r.tiles);
// platserna: så många som sitter där nu och en till (ett tomt fängelse har en plats), så att det byggs ut när det är fullt
export const fangelsePlatser = (s: State) => Math.max(1, fangar(s).length + 1);
// byggbehovet (BYGGNADER.fangelse): när byn vill ha ett fängelse och saknar ett, eller det som finns är fullt
export function fangelseAkut(s: State) {
  if (fangelseVilja(s) <= FANG.galler) return { v: 0, plats: 0 };
  const hs = fangelseHus(s), fullt = hs.length > 0 && hs.every(h => rutorI(s, h).length > 0 && fangar(s, h).length >= rutorI(s, h).length);
  return !hs.length || fullt ? { v: FANG.akut, plats: fangelsePlatser(s) } : { v: 0, plats: 0 };
}
// ett byggt fängelse med ledig plats (straffet Fängelse kräver det, steg 11.12.3)
export const fangelseLedigt = (s: State) => fangelseHus(s).find(h => fangelseKlart(s, h) && fangar(s, h).length < rutorI(s, h).length);
// domens längd i hela dygn för ett brott med vikten v
export const fangelseDygn = (v: number) => clamp(Math.round(v * FANG.domPerVikt), 1, 5);
// p sätts i fängelset h (av domen i steg 11.12.3 och fångarna i 11.12.6, och av scenarierna): till = när hen släpps. Den dömde
// går dit själv (ga), annars hamnar p inne direkt
export function satt(s: State, p: Person, h: Hus, varfor: string, till?: number, ga = false) {
  p.fange = { hus: h.id, t: s.now, varfor, ...(till !== undefined ? { till } : {}) };
  const i = rutorI(s, h)[platsNr(p, rutorI(s, h).length)];
  if (i !== undefined && !ga) { p.x = i % W + 0.5; p.y = Math.floor(i / W) + 0.5; }
  p.task = undefined; count(s, 'fangelse_in');
}
// viljan att komma ut: modet, lågt humör, dygnen som återstår och mycket vid brand
export function utVilja(s: State, p: Person) {
  const f = p.fange!, kvar = f.till !== undefined ? Math.max(0, f.till - s.now) / DAY : 1;
  return (stat(p, 'mod', s.now) - 10) * FANG.modV + (1 - moodOf(p, s.now)) * FANG.humorV + kvar * FANG.dygnV + (fangelseKrok.brinner(s, p.x, p.y) ? FANG.brandV : 0) - (vakterVid(s, f.hus).length ? FANG.vaktSank : 0);
}
// fångens val (chooseTask i val.ts frågar först): sitta kvar inne, eller slå sönder dörren när viljan går över FANG.bryt.
// Saknas fängelset eller dörren, eller har tiden gått, är hen fri och väljer som vanligt (false)
export function fangeVal(s: State, p: Person): boolean {
  const f = p.fange;
  if (!f) return false;
  const h = husById(s, f.hus), dorr = h && fangelseDorr(s, h);
  if (!h || !dorr || !dorrDef(dorr.dorr)?.stanger) { slapps(s, p); count(s, 'fangelse_ut_oppet'); return false; }
  if (f.till !== undefined && s.now >= f.till) { slapps(s, p); count(s, 'fangelse_slappt'); log(s, `${p.name} släpptes ur fängelset.`, 'world', [p.id]); return false; }
  // tanken Sitter inlåst växer för varje helt dygn inne och bleknar efter frigivningen (steg 11.12.4)
  tanke(p, 'inlast', s.now, { v: -Math.min(FANG.tankeTak, FANG.tankeBas + FANG.tankeDygn * Math.floor((s.now - f.t) / DAY)), tid: FANG.tankeEfter * DAY });
  const rutor = rutorI(s, h);
  if (!rutor.length) { p.fange = undefined; return false; }
  if (utVilja(s, p) >= FANG.bryt) {
    // en vakt vid dörren går emot hen i ett slagsmål (steg 11.12.5): ger fången upp sitter hen kvar
    const vakter = vakterVid(s, h.id);
    if (vakter.length) { count(s, 'fangelse_stoppad'); fangelseKrok.slass(s, vakter, p); return true; }
    // på rutan inne vid dörren
    const inne = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (dorr.y + dy) * W + dorr.x + dx).find(i => rutor.includes(i)) ?? rutor[0];
    const min = FANG.brytMin * (dorrDef(dorr.dorr)?.last ? FANG.lasGanger : 1); // den låsta dörren tar dubbelt så lång tid (steg 12.5.6)
    p.task = { act: 'rymma', phase: 'go', tx: inne % W + 0.5, ty: Math.floor(inne / W) + 0.5, until: s.now + min * MIN, arbTid: min * MIN, carry: 0, why: 'Vill ut ur fängelset', dark: false, ref: dorr.id };
    count(s, 'fangelse_bryter');
    fangelseKrok.larma(s, p); // slagen mot dörren hörs (steg 11.12.5)
    return true;
  }
  const i = rutor[platsNr(p, rutor.length)];
  p.task = { act: 'fangen', phase: 'go', tx: i % W + 0.5, ty: Math.floor(i / W) + 0.5, until: s.now + FANG.fangenMin * MIN, carry: 0, why: f.varfor, dark: false };
  return true;
}
// dörren är sönder (KLAR i steg.ts): hen är fri, larmet rymning går, och för en bybo är rymningen ett brott
export function brytKlar(s: State, p: Person, ref?: number) {
  const b = bitsOf(s).find(q => q.id === ref);
  if (!b || !p.fange) return;
  // en vakt som står vid dörren när den ger vika går emot fången (steg 11.12.5)
  const vakter = vakterVid(s, p.fange.hus);
  if (vakter.length) { count(s, 'fangelse_stoppad'); fangelseKrok.slass(s, vakter, p); return; }
  b.dorr = undefined; count(s, 'dorr_sonder'); count(s, 'rymning');
  const h = husById(s, p.fange.hus);
  slapps(s, p);
  log(s, `${p.name} slog sönder dörren och rymde ur ${h ? husIMening(h.namn) : 'fängelset'}.`, 'world', [p.id]);
  fangelseKrok.larma(s, p);
  if (!p.gast) fangelseKrok.brott(s, p);
}
// fången kommer ut (steg 11.12.4): tiden inne blir en upplevelse, starkare ju fler dygn, och synen på den som dömde sjunker
export function slapps(s: State, p: Person) {
  const f = p.fange;
  p.fange = undefined;
  if (!f) return;
  const dygn = (s.now - f.t) / DAY;
  if (dygn < 0.5) return;
  const n = Math.max(1, Math.round(dygn));
  fangelseKrok.upplev(s, p, `i ${n} år`, 1 + Math.max(0, dygn - 1) * FANG.uppDygn);
  handelse(s, p, 'satt'); // (steg 12.1.134)
  if (f.av !== undefined && f.av !== p.id) { const r = s.rels[relKey(p.id, f.av)]; if (r) r.op = clamp(r.op - FANG.domareOp * dygn, -100, 100); }
}
// ---------- vakten (steg 11.12.5) ----------
// de som vaktar fängelset hus just nu, vid dörren
export function vakterVid(s: State, hus: number) {
  const h = husById(s, hus), d = h && fangelseDorr(s, h);
  return d ? s.people.filter(q => q.task?.act === 'fangvakt' && q.task.phase === 'do' && Math.hypot(q.x - d.x - 0.5, q.y - d.y - 0.5) <= FANG.vaktNara) : [];
}
// poängen för att vakta (raden fangvakt i ARBETEN): den farligaste fången, efter aggressionen
export function fangvaktPoang(s: State, p: Person) {
  if (p.fange) return 0;
  let f = 0;
  for (const q of fangar(s)) if (q !== p) f = Math.max(f, stat(q, 'aggression', s.now) / 10);
  return f * FANG.vakt;
}
// någon annan vaktar redan (raden har sin arbetare)
export const fangvaktFull = (s: State, p: Person) => s.people.some(q => q !== p && q.task?.act === 'fangvakt');
// platsen för vakten: utanför dörren till det fängelse där den farligaste fången sitter
export function fangvaktPlats(s: State) {
  const q = fangar(s).sort((a, b) => stat(b, 'aggression', s.now) - stat(a, 'aggression', s.now))[0], h = q && husById(s, q.fange!.hus);
  return h ? utanforDorr(s, h) : undefined;
}
// den som hör larmet rymning går dit när modet räcker, mindre villigt om hen står fången nära
export function stoppaVilja(s: State, p: Person, q: Person) {
  return FANG.stoppBas + (stat(p, 'mod', s.now) - 10) * FANG.stoppMod - (fangNarhet(s, p, q) - FANG.framling) * FANG.stoppNara;
}
// den som slår på dörren just nu och som p hört larmet om (raden stoppa i ARBETEN)
export function stoppaVal(s: State, p: Person): { spot: { x: number; y: number }; ref: number; why: string } | undefined {
  if (p.fange || !p.larm?.rymning || s.now - p.larm.rymning.t > FANG.stoppMin * MIN) return undefined;
  const q = s.people.find(o => o.fange && o.task?.act === 'rymma');
  const h = q && husById(s, q.fange!.hus), spot = h && utanforDorr(s, h);
  return q && spot && stoppaVilja(s, p, q) > 0 ? { spot, ref: q.id, why: `Hör att ${q.name} slår på fängelsets dörr och går dit` } : undefined;
}
// framme vid dörren (LAMNA i steg.ts): slår fången fortfarande blir det ett slagsmål
export function stoppaFram(s: State, p: Person, t: import('./typer').Task) {
  const q = byId(s, t.ref);
  p.task = undefined;
  if (q?.fange && q.task?.act === 'rymma') { count(s, 'fangelse_stoppad'); fangelseKrok.slass(s, [p], q); }
}
// ---------- besöket vid dörren (steg 11.12.4) ----------
// rutan utanför fängelsets dörr
export function utanforDorr(s: State, h: Hus) {
  const d = fangelseDorr(s, h), inne = new Set(rutorI(s, h));
  if (!d) return undefined;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = (d.y + dy) * W + d.x + dx; if (!inne.has(i - 2 * (dy * W + dx)) || inne.has(i)) continue; return { x: d.x + dx + 0.5, y: d.y + dy + 0.5 }; }
  return undefined;
}
// lusten att gå till dörren och prata (leisure i val.ts): den fånge p står närmast, bara familj och vänner
export function besokVal(s: State, p: Person): { w: number; spot: { x: number; y: number }; ref: number; why: string } | undefined {
  if (p.fange) return undefined;
  let best: Person | undefined, bn = 0;
  for (const q of fangar(s)) { const n = fangNarhet(s, p, q); if (q !== p && n >= FANG.van && n > bn) { best = q; bn = n; } }
  const h = best && husById(s, best.fange!.hus), spot = h && utanforDorr(s, h);
  return best && spot ? { w: bn * FANG.besok, spot, ref: best.id, why: `Går till fängelset och pratar med ${best.name} genom dörren` } : undefined;
}
// den lilla elden i fängelset brinner (värmen i steg.ts)
export const fangEldBrinner = (s: State, hus: number) => (s.fangEld?.[hus] ?? 0) > s.now;
// ---------- mat och vatten till fången (steg 11.12.2) ----------
// hur nära p står fången q: familj och partner 1, en vän FANG.van, annars FANG.framling
export function fangNarhet(s: State, p: Person, q: Person) {
  if (p.partner === q.id || q.partner === p.id || isKin(p, q)) return 1; // partnern, föräldrarna, barnen och syskonen (steg 12.1.60)
  const op = s.rels[relKey(p.id, q.id)]?.op ?? 0;
  return op > REL.van ? FANG.van : FANG.framling;
}
// p går när fångens nöd (hunger eller törst, 0–1) gånger närheten är stor nog
export const hjalperFange = (s: State, p: Person, q: Person, nod: number) => nod * fangNarhet(s, p, q) >= FANG.hjalp;
// maten till fången och till den som inte kan gå (Vård: den som ligger får mat och vatten buret till sig, med samma vikt som fången;
// vattnet är vattenVal i torst.ts) (ARBETEN i val.ts): den hungrigaste som p går till och som ingen annan bär mat till, och det
// närmaste i förrådet där det finns mat
// Ved till en liten eld (steg 11.12.4) är en rad i samma arbete: fångens köld gånger närheten gånger FANG.eld, så det händer sällan
export function matTillFange(s: State, p: Person): { spot: { x: number; y: number }; ref: number; why: string; ved?: true } | undefined {
  if (p.fange || !kanGa(p)) return undefined;
  let best: Person | undefined, bn = 0, ved = false;
  for (const q of [...fangar(s), ...living(s).filter(o => !o.fange && !kanGa(o) && hemma(s, o) && !utanVard(s, o))]) {
    if (q === p || s.people.some(o => o !== p && o.task?.act === 'barmat' && o.task.ref === q.id)) continue;
    const nod = 1 - q.hunger, kold = !q.fange || fangEldBrinner(s, q.fange.hus) ? 0 : (1 - q.warm) * FANG.eld;
    if (nod > bn && hjalperFange(s, p, q, nod)) { best = q; bn = nod; ved = false; }
    if (kold > bn && hjalperFange(s, p, q, kold)) { best = q; bn = kold; ved = true; }
  }
  if (!best) return undefined;
  const spot = fangelseKrok.matStack(s, p, ved); // det närmaste i förrådet där det ligger mat eller ved (sätts av steg.ts)
  return spot ? { spot, ref: best.id, why: ved ? `Hämtar ved åt ${best.name}, som fryser i fängelset` : `Hämtar mat åt ${best.name}, som ${best.fange ? 'sitter i fängelset' : best.svimmat ? 'är medvetslös' : 'inte kan gå'}`, ...(ved ? { ved: true as const } : {}) } : undefined;
}
// maten eller veden är tagen (KLAR i steg.ts): en hel portion av det som finns, eller en ved, och den bärs till fången
export function matTagen(s: State, p: Person, t: import('./typer').Task) {
  const ved = t.tool === 'ved', q = byId(s, t.ref), k = q ? fangelseKrok.taMat(s, p, ved) : undefined;
  if (!q || !k) { t.until = s.now; return; }
  t.tool = k; t.phase = 'back'; t.tx = q.x; t.ty = q.y; t.why = ved ? `Bär ved till ${q.name}` : `Bär mat till ${q.name}`;
}
// framme hos fången (LAMNA i steg.ts): hen äter portionen, eller veden tänds och brinner FANG.eldTim timmar
export function matFram(s: State, p: Person, t: import('./typer').Task) {
  const q = byId(s, t.ref);
  if (q?.fange && t.tool === 'ved' && Math.hypot(q.x - p.x, q.y - p.y) <= 2) { (s.fangEld ??= {})[q.fange.hus] = s.now + FANG.eldTim * HOUR; tanke(q, 'tandeEldAt', s.now, { namn: p.name }); count(s, 'eld at fangen'); }
  else if (q && t.tool && Math.hypot(q.x - p.x, q.y - p.y) <= 2) { fangelseKrok.ata(s, q, t.tool); vardatSjuk(s, p, q); tanke(q, 'barMatTill', s.now, { namn: p.name }); count(s, q.fange ? 'bar mat till fangen' : 'bar mat till sjuk'); }
  p.task = undefined;
}
// den som sitter inne och de som vill ut (gränssnittet och scenarierna)
