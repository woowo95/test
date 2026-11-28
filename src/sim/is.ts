import { gen } from './ord';
// Isen på sjöarna (steg 2.11.3). Vattnet har en egen temperatur som följer luftens långsamt, med ungefär två dygns
// fördröjning (två år i spelet). När vattnet kyls under noll lägger sig isen, och den växer fortare ju kallare det är och
// ju tunnare den är (tjock is skyddar vattnet under); snö på isen gör att den växer långsammare. Över noll smälter den.
// Det ger ungefär 15 cm när istiden börjar och 35–40 cm som mest, och isen går upp i början av våren. Alla sjöar har
// samma is. Allt räknas varje timme i stepIs (steg.ts), likadant i spelet och i ikappräkningen.
// Den som fiskar eller dricker när isen ligger hugger först upp ett hål (registret ISHAL): tunn is med händerna, tjockare
// med en sten, yxan, spjutet och spaden genom is upp till 30 cm, och bara isborren av järn (steg 12.2.11) genom den tjockaste isen. Fisket genom hålet är pimpling; det ger lika mycket som fisket från
// stranden efter årstiden. Ett hål som huggits upp är en vak: isen där börjar om från 0 cm och växer igen som resten av sjön,
// så den som kommer tillbaka till vaken hugger genom tunnare is (steg 13.1.15)
import { balans } from './balans';
import { amountOf } from './lager';
import { freeOfKinds, SPJUT } from './redskap';
import { snoPaMarken, temperature } from './vader';
import { Person, State } from './typer';
import { tecken } from './religion';
import { count, forstaGang, living, log } from './folk';
import { wearTool } from './agande';
import { rnd } from './slump';
import { getMap } from './karta';
import { T, W } from './typer';
import { iVattnetNu, narmasteLand } from './sjo';

export const IS = balans('is', {
  frosSyn: 0.2, // chansen att var och en ser tecknet när sjön frös (steg 8.5.18)
  borrHal: 200, // isborren håller för så här många hål (steg 12.2.11)
  halMax: 30, // yxan, spjutet och spaden tar sig genom is upp till så här många cm; tjockare is bara isborren (steg 12.2.11)
  vattenTim: 48, // vattnets temperatur närmar sig luftens så här långsamt (timmar)
  forst: 0.5, // när vattnet kyls under noll blir isen så här många cm per grad under noll
  vaxer: 1, // isen växer vaxer × köld / (bas + tjockleken) cm per timme (köld = grader under noll) ...
  bas: 2,
  snoSkyddar: 0.5, // ... och upp till så här mycket långsammare med snö på isen
  smalter: 0.3, // cm per timme och grad över noll
  // man går på isen (steg 12.1.209): sjön går att gå över när isen ligger. Ju tunnare isen är, desto mer väger risken att gå
  // igenom (genomIsen i halsa.ts): vägen över isen kostar mer, och fiskaren som väljer en plats ute på isen väger risken.
  // Tjockleken räknas i nivåer (nivaer stycken upp till tunn), så att vägarna bara söks om när isen byter nivå
  tunnKost: 20, // en ruta helt tunn is kostar som så här många rutors gång (vägsökningen), mindre ju tjockare
  tunnRadsla: 1, // fiskeplatsen ute på isen är värd så här mycket mindre gånger hur tunn isen är
  nivaer: 3,
  vakIgen: 1, // en vak som frusit så här nära sjöns tjocklek (cm) är sjön igen (steg 15.1.185)
  vakNara: 1.5, // en vak räknas för den som hugger inom så här många rutor från den (steg 13.1.15)
  tunn: 12, // isen bär sämre ju tunnare den är under så här många cm: risken att gå genom den gånger 1 − cm / tunn (genomIsen i halsa.ts, steg 12.1.141)
});
export interface Vak { x: number; y: number; cm: number } // ett hål i isen: rutan där det höggs och isens tjocklek där (steg 13.1.15)
export interface IsMinne { vatten: number; cm: number; vakar?: Vak[] } // vattnets temperatur (grader), isens tjocklek (cm) och vakarna

// sätten att hugga upp ett hål i isen (registret), det snabbaste först: hur tjock is det går igenom (cm), minuter per cm
// och om personen har det. Redskapet behöver inte vara ledigt länge, så det tas inte ifrån någon
interface HalDef { id: string; namn: string; max: number; minPerCm: number; har: (s: State, p: Person) => boolean }
const harRedskap = (s: State, p: Person, ks: string[]) => ks.includes(p.task?.tool ?? '') || !!freeOfKinds(s, p, ks);
export const ISHAL: HalDef[] = [
  // isborren av järn (steg 12.2.11) borrar genom den tjockaste isen, tre gånger så fort som yxan; yxan, spjutet och spaden tar
  // sig bara genom is upp till 30 cm (IS.halMax)
  { id: 'isborr', namn: 'isborren', max: Infinity, minPerCm: 0.1, har: (s, p) => harRedskap(s, p, ['isborr']) },
  { id: 'yxa', namn: 'yxan', max: IS.halMax, minPerCm: 0.3, har: (s, p) => harRedskap(s, p, ['yxa', 'jarnyxa']) },
  { id: 'spjut', namn: 'spjutet', max: IS.halMax, minPerCm: 0.5, har: (s, p) => harRedskap(s, p, ['jarnspjut', ...SPJUT]) },
  { id: 'benspade', namn: 'spaden', max: IS.halMax, minPerCm: 0.5, har: (s, p) => harRedskap(s, p, ['benspade']) },
  { id: 'sten', namn: 'en sten', max: 15, minPerCm: 0.6, har: s => amountOf(s, 'sten') >= 1 },
  { id: 'hand', namn: 'händerna', max: 5, minPerCm: 1, har: () => true },
];

const minneOf = (s: State) => (s.is ??= { vatten: Math.max(0, temperature(s)), cm: 0 });
// isens tjocklek i cm (0 = öppet vatten) och vattnets temperatur
export const isCm = (s: State) => s.is?.cm ?? 0;
// isens tjocklek där man hugger vid (x, y): sjöns, eller den tunnaste vakens inom IS.vakNara rutor (steg 13.1.15)
export function isCmVid(s: State, x: number, y: number) {
  let cm = isCm(s);
  for (const v of s.is?.vakar ?? []) if (v.cm < cm && Math.hypot(v.x - x, v.y - y) <= IS.vakNara) cm = v.cm;
  return cm;
}
export const islagt = (s: State) => isCm(s) > 0;
// isens nivå (steg 12.1.209): 0 = ingen is, 1 till nivaer = tunn is, nivaer + 1 = is som bär (IS.tunn cm eller mer)
export const isNiva = (s: State) => { const cm = isCm(s); return cm > 0 ? 1 + Math.min(IS.nivaer, Math.floor(cm / (IS.tunn / IS.nivaer))) : 0; };
// hur tunn isen är (1 = helt tunn, 0 = den bär), efter nivån
export const isTunnhet = (s: State) => { const n = isNiva(s); return n ? 1 - (n - 1) / IS.nivaer : 0; };
// vad en ruta på isen kostar i vägsökningen (findPath), undefined = ingen is: vattnet går inte att gå på
export const isKost = (s: State) => isNiva(s) ? 1 + IS.tunnKost * isTunnhet(s) : undefined;
export const vattenGrader = (s: State) => s.is?.vatten ?? Math.max(0, temperature(s)); // ändrar inget (gränssnittet frågar)

// varje timme (steg.ts). h: timmarna sedan sist (steg 12.1.107)
export function stepIs(s: State, h = 1) {
  const m = minneOf(s), t = temperature(s);
  if (m.cm <= 0) {
    m.vatten += (t - m.vatten) * Math.min(1, h / IS.vattenTim);
    if (m.vatten < 0) { if (m.cm === 0) for (const p of living(s)) if (rnd(s, 'tro', p) < IS.frosSyn) tecken(s, p, 'frosjo'); m.cm = -m.vatten * IS.forst; m.vatten = 0; } // sjön som frös (steg 8.5.18)
  } else {
    // sjön och vakarna växer och smälter likadant, var och en från sin tjocklek (steg 13.1.15)
    const andra = (cm: number) => t < 0 ? cm + IS.vaxer * -t / (IS.bas + cm) * (1 - IS.snoSkyddar * snoPaMarken(s)) * h : Math.max(0, cm - IS.smalter * t * h);
    m.cm = andra(m.cm);
    if (m.vakar) { for (const v of m.vakar) v.cm = Math.min(m.cm, andra(v.cm)); m.vakar = m.vakar.filter(v => v.cm < m.cm - IS.vakIgen); if (!m.vakar.length) delete m.vakar; } // en vak som frusit nästan lika tjock som resten av sjön är borta
  }
  if (m.cm <= 0) { delete m.vakar; iLand(s); }
}
// när isen har gått upp tar sig den som står ute på sjön i land (steg 12.1.209): till närmaste ruta på land, och vägen söks om
function iLand(s: State) {
  const m = getMap(s.seed).tiles;
  for (const p of living(s)) {
    const i = Math.floor(p.y) * W + Math.floor(p.x);
    if (m[i] !== T.Vatten || !iVattnetNu(s, i)) continue; // sjön, inte översvämningen
    const l = narmasteLand(s, Math.floor(p.x), Math.floor(p.y));
    if (!l) continue;
    p.x = l.x + 0.5; p.y = l.y + 0.5;
    if (p.task) { p.task.path = undefined; p.task.pk = undefined; }
    count(s, 'iLandIsen');
  }
}


// hur p hugger upp ett hål i isen just nu: det snabbaste sättet hen har som går igenom isen. undefined = det går inte
// (eller isen ligger inte: då behövs inget hål, se halMin)
// Vid (x, y) räknas vakarna där (steg 13.1.15); utan plats sjöns is
export function halVal(s: State, p: Person, x?: number, y?: number) {
  const cm = x === undefined || y === undefined ? isCm(s) : isCmVid(s, x, y);
  return cm > 0 ? ISHAL.find(h => h.max >= cm && h.har(s, p)) : undefined;
}
// p hugger eller borrar upp ett hål nu (fisket, vattnet, att dricka): isborren slits för varje hål (steg 12.2.11). Går den
// sönder räknas det, och första gången står det i loggen
export function halGjort(s: State, p: Person, x: number, y: number) {
  if (!islagt(s) || brunnKrok.vid(s, x, y)) return; // vid brunnen behövs inget hål (steg 12.1.237)
  const h = halVal(s, p, x, y);
  if (!h) return;
  // hålet blir en vak där isen börjar om från 0 cm (steg 13.1.15); en vak som redan finns där hackas upp igen
  const m = minneOf(s), vak = (m.vakar ?? []).find(v => Math.hypot(v.x - x, v.y - y) <= IS.vakNara);
  if (vak) vak.cm = 0; else (m.vakar ??= []).push({ x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, cm: 0 });
  if (h.id !== 'isborr') return;
  if (!wearTool(s, p, 'isborr', 1 / IS.borrHal)) return;
  if (forstaGang(s, 'isborrTrasig')) log(s, `${gen(p.name)} isborr var utsliten.`, 'world', [p.id]); else count(s, 'isborrTrasig');
}
// två frågor (steg 12.1.237): når p sjön (isen ligger inte, eller hen kan hugga upp ett hål), och når p vattnet alls (sjön,
// eller brunnen, vars vatten inte fryser, steg 12.4.8). Fisket frågar sjön, att dricka och hämta vatten frågar vattnet
export const naSjon = (s: State, p: Person) => !islagt(s) || !!halVal(s, p);
// vakarna (steg 13.1.15): genom en vak som p kan hugga upp når hen vattnet där, också när sjöns is är för tjock
// når p vattnet genom isen vid (x, y): öppet där (en vak som just huggits upp) eller ett hål hen kan hugga
export const genomIsenVid = (s: State, p: Person, x: number, y: number) => isCmVid(s, x, y) <= 0 || !!halVal(s, p, x, y);
export const vakNabar = (s: State, p: Person) => !!s.is?.vakar?.some(v => genomIsenVid(s, p, v.x, v.y));
export const naVattnet = (s: State, p: Person) => naSjon(s, p) || brunnFinns(s) || vakNabar(s, p);
// står (x, y) vid en brunn (vidBrunn i torst.ts, som läses efter den här filen)
export const brunnKrok = { vid: (_s: State, _x: number, _y: number) => false };
export const brunnFinns = (s: State) => !!s.stationer?.some(t => t.k === 'brunn' && t.kvar <= 0);
// vakten för arbetstiderna (kor.ts) får veta hur lång tid hålet tog när vattnet började hämtas (steg 12.1.159): halMin
// senare i slaget kan svara annat, när någon annan tagit yxan eller isborren gått sönder. Ändrar inget i spelet
export const halVakt: { lyss?: (t: object, min: number) => void } = {};
// så många minuter det tar för p att hugga upp hålet vid (x, y) (0 när isen inte ligger, vid brunnen eller när det inte går)
export function halMin(s: State, p: Person, x: number, y: number) {
  if (brunnKrok.vid(s, x, y)) return 0;
  const h = halVal(s, p, x, y);
  return h ? h.minPerCm * isCmVid(s, x, y) : 0;
}
