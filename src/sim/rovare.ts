import { antal, lista, och, stor, tal } from './ord';
import { utanforByn } from './omrade';
import { balans } from './balans';
import { blodas } from './blod';
import { ALDER, KROPP, ageOf, alive, byId, count, isSick, living, log, makeName, ovning, stat, think } from './folk';
import { halsa, horsel, kanGa, skada } from './halsa';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { Klan, andraInst, klanById, klanerOf } from './klaner';
import { addTo, amountOf, avbryt, dropLoad, zoneOf, zonesOf } from './lager';
import { die } from './liv';
import { DORRAR, bitAt, bitsOf, freeNear, husById, isWall, roomAt } from './byggnad';
import { LARM, larma } from './rykten';
import { SAKER, SAK_LIST } from './saker';
import { vattenNu } from './sjo';
import { clamp, rnd } from './slump';
import { SLAGSMAL, STRID, VAPEN, Strid, StridGang, Uppstallning, Vapen, foljet, personKampe, slitKastat, sparaStrid, spelaUpp, svartSkadad, vadretIStriden } from './strid';
import { isLight } from './tid';
import { DAY, HOUR, MIN, Person, SEC, State, T, Task, W, H } from './typer';
import { vaderNu } from './vader';
import { grundvarde, rikedom } from './varde';
import { husPlats, iHus, kanterna, setHotVilja, setRovarVal, smaBarnOf, skyddVidElden, soker } from './varg';
import { taVapen } from './vakt';
import { foddNar, gastNyckel } from './gastliv';
import { gastAv, gastGar, gastTillbaka, nyGast, nyttGastId } from './gast';
import { notis } from './notiser';
import { groundOf, tileOf } from './mark';
import { findPath, markFart } from './vag';
import { GANG } from './gang';
import { kvarlevor } from './kvarlevor';
import { RADER, borjaLeta, hamndKlar, huggDorr, iFarten, klanMinns, overtygelse, radDygn, radSeger, svarTrohet, tandaHus } from './rader';
import { ledareOf } from './styre';
import { lagGaller } from './lagar';
import { bjornarOf, vargarOf } from './djur';
import { tingOf } from './agande';
import { bedFor } from './bygg';
import { viktOf } from './saker';

// ---------- rövarflocken (steg 4.4.5) ----------
// En grundversion av anfallen (stora räder, krig, tribut och murar ligger i 11.2). När byn är rik (Byns rikedom, varde.ts, med
// försvaret räknat emot: de vuxna som kan slåss och deras vapen) kan en liten flock rövare komma: folk från en grannklan som
// inte tycker om byn (klaner.ts), annars fredlösa utan klan. Flocken samlas en stund i kartans kant, där den kan upptäckas.
// Den som är vaken och nära ser den, vakten ser längst och gissar hur många de är (gissningen blir sämre ju längre bort de
// står), ropar (larma i rykten.ts) och väcker byn; sedan delar sig byn (rovarSkydd, steg 9.2.116): kämparna tar vapen och väntar vid
// förrådet, hjälparna en bit bakom dem, och barnen, de svaga och de räddaste gömmer sig. En liten flock väntar på mörkret, och ett tyst
// anfall (natt, få rövare, ingen vaken som ser dem) kommer fram osett. Rövarna går mot förrådet. Ser de att byn väntar med
// fler än de själva vänder de om. Annars slåss de med dem som står i vägen (striden i strid.ts, 3.7), med avsikten att skada,
// och plundrar det mest värda i förrådet (inte redskapen) om de vinner eller ingen står emot. Sedan flyr de mot kanten. Går
// striden dåligt flyr de utan något. Rövarna är inte bybor: var och en har ett namn, kroppens tal och ett vapen, och den som
// dör i striden är borta. Allt stegas likadant i båda lägena med byns följd 'rovare'.
export const ROVARE = balans('rovare', {
  forsvarMest: 0.2, // försvaret sänker chansen högst så här mycket (steg 8.7.13)
  kommer: 0.012, // chansen i timmen att en flock kommer, gånger hur rik byn är (rik nedan), när ingen flock är på kartan ...
  rikFran: 300, // ... rikedomen minus försvaret från vilken byn lockar rövare ...
  rikSpann: 1000, // ... och så mycket mer för den största chansen
  forsvarBas: 15, forsvarSkada: 60, // försvaret: varje vuxen som kan slåss räknas forsvarBas + forsvarSkada × vapnets skada
  vilaDygn: 6, // så många dygn efter en flock kommer ingen ny
  antal: [2, 5], // så många rövare (minst, högst)
  samlasTim: [2, 5], // så många timmar samlas flocken i kanten
  lur: 22, // flocken stannar så här många rutor från förrådet och väntar (lurMin minuter) innan den går till anfall (steg 6.6.9) ...
  lurMin: [15, 30], // ... minst, högst
  vaktSer: 26, folkSer: 12, nattSer: 0.5, dimmaSer: 0.5, // vakten ser rövare inom så här många rutor, andra inom folkSer, gånger nattSer i mörkret
  gissFel: 0.5, // vaktens gissning av antalet: fel med upp till så här stor del, gånger avståndet / vaktSer (andra gissar som på längsta avståndet)
  vack: 35, // vakten väcker byn när flocken är så här nära byns område (utanforByn)
  ser: 14, // rövarna ser byns försvar inom så här många rutor från förrådet, när de är så nära eller väntar utanför byn ...
  overmakt: 1.5, // ... och vänder om när fler än så här många gånger rövarna väntar med vapen
  nara: 1.5, // rövarna är framme vid förrådet så här nära
  rotaMin: 2, // så många minuter (en minut är ungefär sex timmar i spelet) går rövarna mellan förråden och letar innan de tar något (steg 9.2.120)
  motR: 10, // de vuxna som är vakna och så här nära möter rövarna, om de är kämpar (rovarRoll, steg 9.2.116) ...
  lyder: 0.5, iver: 0.2, // över den här Envälde-seden lyder man ledaren, och så mycket Fejd och Krig drar till striden (steg 8.7.9)
  gerUpp: 1.5, // ... och så många gånger mer när byn gett upp
  bar: 20, // så mycket väger det varje rövare som står kvar kan bära (steg 8.7.16)
  styrka: [8, 14], mod: [8, 15], uthallighet: [9, 14], smidighet: [8, 14], skicklighet: [6, 11], // rövarnas kroppar (lägst, högst)
  fiende: 15, // när byn dödar rövare blir klanen så här mycket ovänligare för var och en
  flockarMots: 20, djurChans: 0.2, djurR: 6, // två flockar slåss när de är så här nära, och ett rovdjur anfaller så här ofta inom djurR rutor (steg 8.7.18–8.7.19)
  testNara: 12, // i testläget dyker flocken upp så här många rutor från elden om ingen plats längre ut finns (steg 4.5.7.10) ...
  testUt: 40, // ... annars ungefär så här många rutor utanför byns område (steg 9.2.103), som en vanlig flock men kortare: ...
  testSamlas: 1, // ... den samlas så här många minuter (en minut är ungefär sex timmar i spelet) ...
  testVanta: 1, // ... och väntar så här många minuter på väntplatsen innan anfallet (steg 9.2.80)
  narR: 6, // den som är vaken och kommer så här nära flocken ser den och får larmet, också när någon annan redan sett den (steg 9.2.105)
  larmTim: 2, // ... om hen inte redan fått larmet de senaste så här många timmarna
  anfallUt: 2, // en flock som setts så här nära byns område (utanforByn) eller inne i det gör att byn går i anfallsläge (steg 9.2.104)
  lurUt: 3, // väntplatsen ligger minst så här många rutor utanför byns område (utanforByn), också för en vanlig flock (steg 9.2.103)
  // vem som strider, hjälper eller gömmer sig (steg 9.2.116, rovarVilja): mod / 20 + iver, minus skadad × det som fattas i hälsan,
  // sjuk när hen är sjuk, gammal för de gamla och barn när hen har små barn (gånger barnAnnan när en annan vuxen redan är hos
  // dem). Från kampeFran strider hen, från hjalpFran hjälper hen och står bakom en bit bakom kämparna, annars gömmer hen sig
  budMarg: 1.2, budMax: 2, // budbäraren (steg 9.2.117) går bara om vägen dit, gånger budMarg, hinns före anfallet, och ger upp efter budMax timmar
  kampeFran: 0.33, hjalpFran: 0.2, skadad: 1, sjuk: 0.5, gammal: 0.3, barn: 0.25, barnAnnan: 0.3, bakom: 3,
});

// rövarnas vapen (ett slumpas för var och en)
const ROVARVAPEN: Vapen[] = ['kniv', 'yxa', 'fiskespjut', 'flintspjut', 'sten'];
// fodd: gästens liv (steg 4.5.7.7, gastliv.ts). x, y: var rövaren står (steg 6.6.9; saknas i sparade byar från före v450 och
// sätts då vid flocken), path och pk: vägen och målrutan den gäller, spar: vägen för bilden, tid och plats efter varandra
// rövarna är personer (steg 9.2.112, "Rövarna är människor" i designdokumentet): flocken minns bara deras id (folk), och var och
// en ligger bland folket som en gäst (gast.ts) med kropp, sår, blod, egenskaper och färdigheter som en bybo. Vapnet, bytet och
// vägen för bilden står i gästraden
export const rovarna = (s: State, f: { folk: number[] }): Person[] => f.folk.map(id => gastAv(s, id)).filter((p): p is Person => !!p);
const gr = (r: Person) => r.gast!;
// x, y: ledaren (den första rövaren), mx, my: ledarens mål. lurat: flocken har väntat utanför byn. test: flocken kom från
// testläget och samlas och väntar kortare (steg 9.2.103). anfall: flocken har setts i eller nära byn, och byn går mot den (steg 9.2.104)
// striden vid förrådet som pågår (steg 6.6.10): striden (strid.ts) och när den började (t0), och arenans hörn på kartan (ox, oy)
export interface RovarStrid extends StridGang { t0: number; ox: number; oy: number; fri?: number[] } // fri: bybor som redan lämnat striden (steg 9.2.77)
export interface Rovarflock { skal?: import('./rader').RadSkal; rad?: boolean; mal?: number; hugger?: { bit: number; till: number }; tant?: boolean; id: number; klan?: number; folk: number[]; x: number; y: number; mx: number; my: number; gor: 'samlas' | 'kommer' | 'vantar' | 'slass' | 'flyr' | 'letar' | 'rotar'; letar?: number[]; rotar?: { x: number; y: number; min: number }[]; rotat?: boolean; letat?: boolean; till: number; strid?: RovarStrid; sedd?: number; gissning?: number; vackt?: boolean; lurat?: boolean; test?: boolean; anfall?: boolean; bud?: { av: number; till: number; t: number } }

const avst = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const vaken = (p: Person) => p.task?.act !== 'sova';
const mellan = (s: State, [a, b]: readonly number[]) => a + rnd(s, 'rovare') * (b - a);
const vuxenKan = (s: State, p: Person) => { const a = ageOf(p, s.now); return a >= ALDER.vaktFran && a < ALDER.vaktTill && !isSick(p, s.now) && halsa(p) >= KROPP.svag && kanGa(p); };

// byns försvar: de vuxna som kan slåss, med sina vapen
export function forsvaret(s: State) {
  let f = 0;
  for (const p of living(s)) if (vuxenKan(s, p)) f += ROVARE.forsvarBas + ROVARE.forsvarSkada * VAPEN[personKampe(s, p, 0, 0, 0, 0).vapen].skada;
  return f;
}
// hur mycket byn lockar rövare (0–1): rikedomen minus försvaret
// (steg 8.7.13) rikedomen väger mest: försvaret sänker chansen bara lite, högst en femtedel, eftersom rövarna har svårt att veta hur bra försvar byn har
export const lockar = (s: State) => { const rik = rikedom(s); return clamp((rik - ROVARE.rikFran) / ROVARE.rikSpann, 0, 1) * (1 - ROVARE.forsvarMest * clamp(forsvaret(s) / Math.max(1, rik), 0, 1)); };
// (steg 8.7.14) skyddet efter ett anfall avtar med tiden i stället för en fast vila
export const efterAnfall = (s: State) => s.rovarVila === undefined ? 1 : 1 - Math.exp(-Math.max(0, s.now - s.rovarVila) / (ROVARE.vilaDygn * DAY));

// testläget (steg 4.5.4.4): en liten, mellanstor eller stor flock kommer nu (så många rövare). Flocken dyker upp en bit
// utanför byn, ungefär ROVARE.testNara rutor från elden, och går direkt till anfall utan att vänta på mörkret (steg
// 4.5.7.10); en rad i Händelser säger var (steg 4.5.6.4). Svarar med raden, eller skälet till att ingen flock kan komma
// just nu (rovarHinder)
export const ROVARFLOCK = { liten: ROVARE.antal[0], mellan: ROVARE.antal[1], stor: 2 * ROVARE.antal[1] } as const;
export const rovarHinder = (s: State) => s.rovare ? 'Det finns redan en rövarflock vid byn' : undefined;
export function skickaRovare(s: State, n: number): { ok: boolean; text: string } {
  const h = rovarHinder(s);
  if (h) return { ok: false, text: h };
  rovarnaKommer(s, n, true);
  const f = s.rovare!, e = eldPlats(s), d = Math.round(Math.hypot(f.x - e.x - 0.5, f.y - e.y - 0.5));
  const text = `Testläget: ${n} rövare dyker upp ${d} rutor ${vaderstreck(s, f.x, f.y)} om elden, samlas en minut, väntar en minut utanför byn och går till anfall om ungefär två minuter.`;
  log(s, text, 'world');
  return { ok: true, text };
}
// en flock kommer till en punkt i kanten som inte är vatten. tvinga = ett scenario eller testläget (antalet); direkt = testläget
// (steg 9.2.103): flocken dyker upp ungefär ROVARE.testUt rutor utanför byns område (testPlats) och samlas och väntar kortare,
// men går annars som en vanlig flock
export function rovarnaKommer(s: State, tvinga?: number, direkt?: boolean, klan?: number) {
  if (!tvinga && rnd(s, 'rovare') >= ROVARE.kommer * lockar(s) * efterAnfall(s)) return;
  // en ny flock kan komma medan en annan är på kartan (steg 8.7.18): den går samtidigt med den (rovareFler, rovarSteg)
  const forra = s.rovare;
  const m = getMap(s.seed), nara = direkt ? testPlats(s) ?? narByn(s) : undefined;
  let x = nara?.x ?? 0, y = nara?.y ?? 0;
  for (let i = 0; !nara && i < 20; i++) {
    const sida = Math.floor(rnd(s, 'rovare') * 4), l = rnd(s, 'rovare');
    x = sida === 0 ? 0.5 : sida === 1 ? W - 0.5 : l * W; y = sida === 2 ? 0.5 : sida === 3 ? H - 0.5 : l * H;
    if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break;
  }
  // den grannklan som tycker sämst om byn, om någon inte tycker om den
  const k: Klan | undefined = klan !== undefined ? klanById(s, klan) : klanerOf(s).filter(q => q.inst < 0).sort((a, b) => a.inst - b.inst)[0];
  const n = tvinga ?? Math.round(mellan(s, ROVARE.antal));
  const folk: number[] = Array.from({ length: n }, () => {
    const sex = rnd(s, 'rovare') < 0.8 ? 'm' as const : 'k' as const;
    const hem = k?.personer.find(q => q.roll === 'rovare' && q.kropp); // en som flydde hem förra gången kommer igen (steg 9.2.114); slumpen dras ändå
    const namn = hem?.namn ?? makeName(s, sex, 'rovare'), vapen = ROVARVAPEN[Math.floor(rnd(s, 'rovare') * ROVARVAPEN.length)];
    const styrka = mellan(s, ROVARE.styrka), uthallighet = mellan(s, ROVARE.uthallighet), mod = mellan(s, ROVARE.mod), smidighet = mellan(s, ROVARE.smidighet), skick = mellan(s, ROVARE.skicklighet);
    const ov = Math.max(0, (skick - 5) * 2); // skickligheten i striden är 5 + färdigheten / 2, som hos en bybo (personKampe)
    const p = nyGast(s, { id: nyttGastId(s), namn, sex: hem?.sex ?? sex, fodd: foddNar(s.seed, gastNyckel(k?.id, namn), 'rovare', s.now), rad: { sort: 'rovare', klan: k?.id, vapen }, x, y, nyckel: gastNyckel(k?.id, namn), pot: { styrka, uthallighet, mod, smidighet }, skill: { narstrid: ov, traff: ov } }); // drar ingen slump
    gastTillbaka(s, p);
    s.people.push(p);
    return p.id;
  });
  const nr = s.rovarNr = (s.rovarNr ?? 0) + 1;
  // testläget (steg 9.2.103): flocken samlas ROVARE.testSamlas minuter, aldrig den vanliga väntan
  s.rovare = { id: nr, klan: k?.id, folk, x, y, mx: x, my: y, gor: 'samlas', till: s.now + (direkt ? ROVARE.testSamlas * MIN : mellan(s, ROVARE.samlasTim) * HOUR), ...(direkt ? { test: true } : {}) };
  stallUpp(s, s.rovare, x, y);
  s.rovarVila = s.now;
  if (forra) { (s.rovareFler ??= []).push(s.rovare); s.rovare = forra; count(s, 'tvaFlockar'); }
  count(s, 'rovarflockar'); count(s, 'rovare', n);
}
// platsen där testlägets flock dyker upp (steg 9.2.103): ungefär ROVARE.testUt rutor utanför byns område, på land och utanför
// husen, åt ett slumpat håll från förrådet; undefined = ingen hittades (då narByn)
function testPlats(s: State) {
  const m = malet(s), vt = vattenNu(s), v0 = rnd(s, 'rovare') * 2 * Math.PI;
  for (let i = 0; i < 24; i++) {
    const v = v0 + i * Math.PI / 12;
    for (let r = ROVARE.lur; r < W; r++) {
      const x = Math.floor(m.x + Math.cos(v) * r), y = Math.floor(m.y + Math.sin(v) * r);
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) break;
      if (utanforByn(s, x + 0.5, y + 0.5) < ROVARE.testUt) continue;
      if (vt[y * W + x] !== T.Vatten && !isWall(s, x + 0.5, y + 0.5) && !bitAt(s, x, y)) return { x: x + 0.5, y: y + 0.5 };
      break;
    }
  }
  return undefined;
}
// en ruta ungefär ROVARE.testNara rutor från elden, på land och utanför husen (testläget, steg 4.5.7.10); undefined = ingen hittades
function narByn(s: State) {
  const e = eldPlats(s), vt = vattenNu(s);
  for (let i = 0; i < 48; i++) {
    const v = rnd(s, 'rovare') * 2 * Math.PI, r = ROVARE.testNara + (i >> 4) * 3 * (i % 2 ? 1 : -1);
    const x = Math.floor(e.x + 0.5 + Math.cos(v) * r), y = Math.floor(e.y + 0.5 + Math.sin(v) * r);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || vt[y * W + x] === T.Vatten || bitAt(s, x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return undefined;
}
const fran = (s: State, f: Rovarflock) => { const k = klanById(s, f.klan); return k ? `från ${k.namn}` : 'utan klan'; };

// ---------- rövarna som människor (steg 6.6.9) ----------
// Varje rövare står och går för sig, i en bybos fart (GANG.fart gånger marken) med samma vägsökning som byborna (findPath).
// Ledaren (den första) går mot flockens mål och de andra efter, var och en mot sin plats i en lös klunga bakom ledaren
// (KLUNGA). spar är vägen för bilden: tid och plats efter varandra, de senaste SPAR_SEK sekunderna
const KLUNGA = [[0, 0], [-1, 0.8], [1, 0.8], [0, 1.6], [-1.6, 1.6], [1.6, 1.6], [-0.8, 2.4], [0.8, 2.4], [-2, 0.4], [2, 0.4]];
const SPAR_SEK = 900;
const iVatten = (s: State, x: number, y: number) => vattenNu(s)[tileOf(x, y)] === T.Vatten;
// avståndet från q till den närmaste rövaren
const narmast = (s: State, f: Rovarflock, q: { x: number; y: number }) => Math.min(...rovarna(s, f).map(r => Math.hypot(r.x! - q.x, r.y! - q.y)));
// platsen i klungan kring (x, y) för rövare nummer j, på land
function klungPlats(s: State, x: number, y: number, j: number) {
  const [dx, dy] = KLUNGA[j % KLUNGA.length], px = clamp(x + dx, 0.3, W - 0.3), py = clamp(y + dy, 0.3, H - 0.3);
  return iVatten(s, px, py) && !iVatten(s, x, y) ? { x, y } : { x: px, y: py };
}
function spara(s: State, r: Person, t: number) {
  const sp = gr(r).spar ??= [];
  sp.push(Math.round(t), Math.round(r.x! * 1000) / 1000, Math.round(r.y! * 1000) / 1000);
  let i = 0; while (i + 3 < sp.length && sp[i + 3] < s.now - SPAR_SEK * SEC) i += 3;
  if (i) sp.splice(0, i);
}
// rövarna ställer sig i klungan kring (x, y): när flocken kommer, efter tornadon och i en sparad by från före v450
export function stallUpp(s: State, f: Rovarflock, x: number, y: number) {
  rovarna(s, f).forEach((r, j) => { const p = klungPlats(s, x, y, j); r.x = p.x; r.y = p.y; gr(r).path = undefined; gr(r).pk = undefined; spara(s, r, s.now); });
  f.x = x; f.y = y;
}
// rövaren går mot (mx, my) i sek sekunder från tiden t0. Svarar hur långt det är kvar (rutor), eller −1 när det inte finns någon väg
export function gaMot(s: State, r: Person, mx: number, my: number, sek: number, t0: number) {
  const g = groundOf(s), mal = tileOf(mx, my);
  if (gr(r).pk !== mal) {
    gr(r).pk = mal; gr(r).path = findPath(g, r.x, r.y, mx, my) ?? undefined;
    if (!gr(r).path) { gr(r).pk = undefined; return -1; }
  }
  if (!gr(r).spar?.length) spara(s, r, t0);
  let tid = 0;
  for (;;) {
    const sist = !gr(r).path?.length, i = sist ? 0 : gr(r).path![0];
    const wx = sist ? mx : (i % W) + 0.5, wy = sist ? my : Math.floor(i / W) + 0.5;
    const fart = GANG.fart * Math.max(0.5, markFart(g, tileOf(r.x!, r.y!)));
    const d = Math.hypot(wx - r.x!, wy - r.y!), kan = (sek - tid) * fart;
    if (d > kan) { r.x! += (wx - r.x!) / d * kan; r.y! += (wy - r.y!) / d * kan; spara(s, r, t0 + sek * SEC); return d - kan + (gr(r).path?.length ?? 0); }
    r.x = wx; r.y = wy; tid += d / fart;
    if (sist) { spara(s, r, t0 + tid * SEC); return 0; }
    gr(r).path!.shift(); spara(s, r, t0 + tid * SEC);
  }
}
// var rövaren syns vid tiden t (bilden): mellan punkterna i spar
export function rovarPlats(r: Person, t: number) {
  const sp = r.gast?.spar;
  if (!sp?.length) return { x: r.x ?? 0, y: r.y ?? 0 };
  if (t <= sp[0]) return { x: sp[1], y: sp[2] };
  for (let i = 3; i < sp.length; i += 3) if (sp[i] >= t) { const a = (t - sp[i - 3]) / Math.max(1, sp[i] - sp[i - 3]); return { x: sp[i - 2] + (sp[i + 1] - sp[i - 2]) * a, y: sp[i - 1] + (sp[i + 2] - sp[i - 1]) * a }; }
  return { x: sp[sp.length - 2], y: sp[sp.length - 1] };
}
// flocken går: ledaren mot (mx, my), de andra mot sin plats i klungan bakom ledaren. Svarar hur långt ledaren har kvar, eller
// −1 när den inte kommer fram
function flockGar(s: State, f: Rovarflock, sek: number) {
  const t0 = s.now - sek * SEC, fo = rovarna(s, f), led = fo[0];
  const kvar = gaMot(s, led, f.mx, f.my, sek, t0);
  fo.forEach((r, j) => { if (j) { const p = klungPlats(s, led.x!, led.y!, j); gaMot(s, r, p.x, p.y, sek, t0); } });
  f.x = led.x!; f.y = led.y!;
  return kvar;
}
// platsen där flocken väntar utanför byn: ROVARE.lur rutor från förrådet på vägen dit, eller längre ut så att den ligger minst
// ROVARE.lurUt rutor utanför byns område (steg 9.2.103), på land; aldrig längre bort än flocken står
function lurPlats(s: State, f: Rovarflock, m: { x: number; y: number }) {
  const d = avst(f, m), v = Math.atan2(f.y - m.y, f.x - m.x);
  for (const dv of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
    for (let r = Math.min(d, ROVARE.lur); r <= d; r++) {
      const x = clamp(m.x + Math.cos(v + dv) * r, 0.5, W - 0.5), y = clamp(m.y + Math.sin(v + dv) * r, 0.5, H - 0.5);
      if (utanforByn(s, x, y) < ROVARE.lurUt && r + 1 <= d) continue;
      if (!iVatten(s, x, y) && !bitAt(s, Math.floor(x), Math.floor(y))) return { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 };
      break;
    }
  }
  return undefined;
}

// förrådet (eller elden när byn inte har något förråd)
export function malet(s: State) {
  const z = zoneOf(s);
  if (z) return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
  const e = eldPlats(s);
  return { x: e.x + 0.5, y: e.y + 0.5 };
}

// de som är vakna ser flocken: vakten ser längst, gissar hur många de är och väcker byn när de är nära (en gång, också om
// flocken sågs långt bort först)
function ses(s: State, f: Rovarflock, folk: Person[]) {
  if (f.sedd !== undefined && f.vackt) return;
  const natt = isLight(s.now) ? 1 : ROVARE.nattSer, dimma = 1 - ROVARE.dimmaSer * vaderNu(s).dimma;
  const rad = (q: Person) => (q.task?.act === 'vakt' ? ROVARE.vaktSer : ROVARE.folkSer) * natt * dimma;
  const ser = (q: Person) => vaken(q) && narmast(s, f, q) < rad(q);
  const vakt = folk.find(q => q.task?.act === 'vakt' && ser(q));
  const vack = () => { if (vakt && !f.vackt && Math.min(...rovarna(s, f).map(r => utanforByn(s, r.x, r.y))) < ROVARE.vack) { f.vackt = true; vacka(s, f, vakt, folk); } };
  if (f.sedd !== undefined) { vack(); return; }
  const p = vakt ?? folk.find(ser);
  if (!p) return;
  const n = f.folk.length, fel = ROVARE.gissFel * (vakt ? narmast(s, f, p) / rad(p) : 1) * (rnd(s, 'rovare') * 2 - 1);
  f.sedd = s.now; f.gissning = Math.max(1, Math.round(n * (1 + fel)));
  count(s, 'rovarSedda');
  log(s, `${p.name} såg rövare ${f.gor === 'samlas' ? f.test ? 'samlas utanför byn' : 'samlas vid kartans kant' : 'på väg mot byn'}, ungefär ${f.gissning} (${fran(s, f)}).`, 'world', [p.id]);
  notis(s, 'anfall', `${p.name} såg rövare ${f.gor === 'samlas' ? f.test ? 'samlas utanför byn' : 'samlas vid kartans kant' : 'på väg mot byn'}, ungefär ${f.gissning} (${fran(s, f)}).`, [p.id], { x: Math.floor(f.x), y: Math.floor(f.y) });
  const hort = larma(s, 'rovare', f.gissning, [p]);
  vack();
  soker(s, [p, ...hort]);
}
// vakten väcker de vuxna som sover
function vacka(s: State, f: Rovarflock, vakt: Person, folk: Person[]) {
  let n = 0;
  for (const q of folk) if (q.task?.act === 'sova' && vuxenKan(s, q)) { avbryt(s, q); q.task = undefined; q.larm = { t: s.now, vad: 'rovare', storlek: f.gissning ?? f.folk.length, led: 0 }; n++; }
  if (n) { count(s, 'rovarVackt', n); log(s, `${vakt.name} höll vakt och väckte byn: rövare på väg.`, 'world', [vakt.id]); }
}

// anfallsläget (steg 9.2.104): flocken har setts inne i byns område eller nära det. Alla i byn får larmet, de vuxna som sover
// väcks, och de som väntade vid förrådet väljer på nytt, så att de som vågar går mot flocken där den står
const iByn = (s: State, f: Rovarflock) => Math.min(...rovarna(s, f).map(r => utanforByn(s, r.x, r.y))) < ROVARE.anfallUt;
function anfall(s: State, f: Rovarflock, folk: Person[]) {
  f.anfall = true;
  const st = f.gissning ?? f.folk.length;
  for (const q of folk) {
    if (!alive(q)) continue;
    q.larm = { t: s.now, vad: 'rovare', storlek: st, led: 0 };
    if ((q.task?.act === 'sova' && vuxenKan(s, q)) || q.task?.act === 'forsvarRovare' || q.task?.act === 'hjalpaRovare') { avbryt(s, q); q.task = undefined; }
  }
  soker(s, folk);
  count(s, 'rovarAnfall');
  const text = `Rövarna är i byn ${fran(s, f)}! Hela byn får larmet, och de som vågar går mot dem.`;
  log(s, text, 'world'); notis(s, 'anfall', text, [], { x: Math.floor(f.x), y: Math.floor(f.y) });
}
// alla som ser rövarna reagerar (steg 9.2.105): den som är vaken och kommer nära flocken utan att redan ha larmet ser den,
// ropar och söker skydd eller ger sig in, så att ingen går rakt igenom flocken
function narFlocken(s: State, f: Rovarflock, folk: Person[]) {
  for (const q of folk) {
    if (!alive(q) || !vaken(q) || q.task?.act === 'strid' || forsvarar(q) || q.task?.act === 'gomma' || narmast(s, f, q) >= ROVARE.narR) continue; // den som redan står emot eller gömmer sig ropar inte igen
    if (q.larm?.vad === 'rovare' && s.now - q.larm.t < ROVARE.larmTim * HOUR) continue;
    const hort = larma(s, 'rovare', f.gissning ?? f.folk.length, [q]);
    count(s, 'rovarNara');
    log(s, `${q.name} kom nära rövarna ${fran(s, f)} och ropade.`, 'world', [q.id]);
    soker(s, [q, ...hort]);
  }
}
// flocken som byn går mot (anfallsläget), om någon
const anfallsFlock = (s: State) => [s.rovare, ...(s.rovareFler ?? [])].find(f => f?.anfall && f.folk.length && f.gor !== 'flyr' && f.gor !== 'slass');

// den som väntar med vapen (mot rövarna eller vargarna)
const forsvarar = (q: Person) => q.task?.act === 'forsvarRovare' || q.task?.act === 'forsvar';
// budbäraren (steg 9.2.117, "Anfallet nära byn" i designdokumentet): när flocken väntar utanför byn och några vuxna som kan slåss
// inte hört ropet, springer den vuxna som har larmet och står närmast och hämtar dem, om hen hinner fram före anfallet. Ropet
// sprids från hen på vägen. Budet är klart när den som skulle hämtas har larmet, eller när budMax timmar gått
const flockar = (s: State) => [s.rovare, ...(s.rovareFler ?? [])].filter((f): f is Rovarflock => !!f);
const harLarm = (s: State, q: Person) => q.larm?.vad === 'rovare' && s.now - q.larm.t < ROVARE.larmTim * HOUR;
function budFor(s: State, p: Person) {
  const b = flockar(s).find(f => f.bud?.av === p.id)?.bud;
  const t = b ? byId(s, b.till) : undefined;
  return t && alive(t) && !harLarm(s, t) ? t : undefined;
}
// barnen ropar medan de springer för att gömma sig (steg 9.2.118): den som barnet springer förbi och inte vet om rövarna hör ropet
function barnRop(s: State, folk: Person[]) {
  const hor = LARM.hor * (isLight(s.now) ? 1 : LARM.natt);
  for (const b of folk) {
    if (ageOf(b, s.now) >= ALDER.vuxen || !harLarm(s, b) || b.task?.act !== 'gomma' || b.task.phase !== 'go' || !vaken(b)) continue;
    if (!folk.some(q => q !== b && alive(q) && !harLarm(s, q) && horsel(q) >= LARM.dov && avst(q, b) <= hor)) continue;
    const hort = larma(s, 'rovare', b.larm!.storlek, [b]);
    count(s, 'rovarBarnRop'); soker(s, hort);
  }
}
const tidDit = (d: number) => d / GANG.fart * SEC; // spelets tid för att gå d rutor
function budSteg(s: State, f: Rovarflock, folk: Person[]) {
  if (f.bud) {
    const b = byId(s, f.bud.av), t = byId(s, f.bud.till);
    const klar = !b || !alive(b) || !t || !alive(t) || harLarm(s, t) || s.now - f.bud.t > ROVARE.budMax * HOUR;
    if (!klar) {
      if (b.task?.act !== 'budRovare') return;
      const hor = LARM.hor * (isLight(s.now) ? 1 : LARM.natt);
      if (folk.some(q => q !== b && alive(q) && !harLarm(s, q) && avst(q, b) <= hor)) { const hort = larma(s, 'rovare', f.gissning ?? f.folk.length, [b]); count(s, 'rovarBudRop'); soker(s, hort); }
      return;
    }
    if (t && alive(t) && harLarm(s, t)) count(s, 'rovarBudFram');
    f.bud = undefined;
    if (b?.task?.act === 'budRovare') { avbryt(s, b); b.task = undefined; }
    return;
  }
  const ute = folk.filter(q => alive(q) && vuxenKan(s, q) && !harLarm(s, q));
  if (!ute.length) return;
  const kan = folk.filter(q => alive(q) && vaken(q) && vuxenKan(s, q) && harLarm(s, q) && q.task?.act !== 'vakt' && q.task?.act !== 'strid' && q.task?.act !== 'budRovare');
  let bast: [Person, Person, number] | undefined;
  for (const q of kan) for (const t of ute) { const d = avst(q, t); if (!bast || d < bast[2]) bast = [q, t, d]; }
  if (!bast || tidDit(bast[2]) * ROVARE.budMarg > f.till - s.now) return;
  const [q, t] = bast;
  f.bud = { av: q.id, till: t.id, t: s.now };
  avbryt(s, q); q.task = undefined;
  count(s, 'rovarBud');
  log(s, `${q.name} springer för att hämta ${t.name}: rövare väntar utanför byn.`, 'world', [q.id, t.id]);
}

// vem som strider, hjälper eller gömmer sig när rövare är nära (steg 9.2.116, anropas från vargSkydd i varg.ts): åldern, modet och
// hälsan vägs ihop till ett värde (rovarVilja), och två gränser delar folket i kämpar, hjälpare och gömda. Barnen och den som inte
// kan slåss gömmer sig alltid. Kämparna väntar vid förrådet (eller går mot flocken i anfallsläget), hjälparna en bit bakom dem
export function rovarVilja(s: State, p: Person) {
  const a = ageOf(p, s.now);
  if (a < ALDER.vaktFran || !vuxenKan(s, p)) return -Infinity;
  const iver = ((s.seder.v.fejd ?? 0) + (s.seder.v.krig ?? 0)) * ROVARE.iver;
  return stat(p, 'mod', s.now) / 20 + iver - ROVARE.skadad * (1 - halsa(p)) - (isSick(p, s.now) ? ROVARE.sjuk : 0) - (a >= ALDER.gammal ? ROVARE.gammal : 0);
}
export const rovarRoll = (v: number): 'kampe' | 'hjalpare' | 'gomd' => v >= ROVARE.kampeFran ? 'kampe' : v >= ROVARE.hjalpFran ? 'hjalpare' : 'gomd';
function rovarSkydd(s: State, p: Person, _storlek: number, dur: number) {
  const bud = budFor(s, p);
  if (bud) return { act: 'budRovare' as const, why: `Rövare är nära, springer och hämtar ${bud.name}`, spot: { x: bud.x, y: bud.y }, dur };
  const barn = smaBarnOf(s, p)[0], hosBarnen = barn ? husPlats(s, barn) : undefined;
  const annan = !!barn && living(s).some(q => q !== p && q.task?.act === 'gomma' && ageOf(q, s.now) >= ALDER.vaktFran && (!hosBarnen || Math.hypot(q.task.tx - hosBarnen.x, q.task.ty - hosBarnen.y) < 3));
  const roll = rovarRoll(rovarVilja(s, p) - (barn ? ROVARE.barn * (annan ? ROVARE.barnAnnan : 1) : 0));
  if (roll !== 'gomd') {
    const af = anfallsFlock(s), m = malet(s), vinkel = (p.id * 2.399) % (2 * Math.PI), vapen = taVapen(s, p) ? 'ett vapen' : 'det som finns';
    if (af) { // anfallsläget (steg 9.2.104): kämparna går mot flocken, hjälparna stannar en bit bakom, mot förrådet
      const d = Math.max(0.01, avst(af, m)), ux = (m.x - af.x) / d, uy = (m.y - af.y) / d, r = roll === 'kampe' ? 0 : ROVARE.bakom;
      const spot = freeNear(s, af.x + ux * r + Math.cos(vinkel) * 1.5, af.y + uy * r + Math.sin(vinkel) * 1.5);
      return roll === 'kampe' ? { act: 'forsvarRovare' as const, why: `Rövarna är i byn, tar ${vapen} och går mot dem`, spot, dur } : { act: 'hjalpaRovare' as const, why: 'Rövarna är i byn, håller sig bakom kämparna', spot, dur };
    }
    const r = 1.5 + (p.id % 3) * 0.6 + (roll === 'kampe' ? 0 : ROVARE.bakom); // var och en på sin plats runt förrådet
    const spot = freeNear(s, m.x + Math.cos(vinkel) * r, m.y + Math.sin(vinkel) * r);
    return roll === 'kampe' ? { act: 'forsvarRovare' as const, why: `Rövare är nära, tar ${vapen} och väntar vid förrådet`, spot, dur } : { act: 'hjalpaRovare' as const, why: 'Rövare är nära, håller sig bakom kämparna vid förrådet', spot, dur };
  }
  if (barn && ageOf(p, s.now) >= ALDER.vaktFran) return { act: 'gomma' as const, why: 'Rövare är nära, stannar hos barnen', spot: hosBarnen ?? skyddVidElden(s), dur };
  if (p.task?.act === 'sova' && iHus(s, p)) return undefined;
  const hus = husPlats(s, p);
  return { act: 'gomma' as const, why: hus ? 'Rövare är nära, gömmer sig i huset' : 'Rövare är nära, håller sig vid elden nära de vuxna', spot: hus ?? skyddVidElden(s), dur };
}
setRovarVal(rovarSkydd);
setHotVilja(rovarVilja);

// de vuxna som möter rövarna vid förrådet: vakna, nära och modiga nog (de som väntar med vapen och vakten står alltid kvar)
const familjHotad = (s: State, q: Person, f: Rovarflock) => { const p = byId(s, q.partner); return !!p && avst(p, f) < ROVARE.motR; };
function motstand(s: State, f: Rovarflock, folk: Person[], vid: { x: number; y: number } = malet(s)) {
  const m = vid, kan = folk.filter(q => alive(q) && vaken(q) && vuxenKan(s, q) && avst(q, m) < ROVARE.motR && q.task?.act !== 'gomma' && q.task?.act !== 'hjalpaRovare'); // hjälparna står bakom och går inte in i striden (steg 9.2.116); räknat från förrådet, dit rövarna går (steg 9.2.74), eller från flocken när den letar hus för hus
  // vem som strider (steg 8.7.9): mod, åldern, vem som hotas, seden Förlikning – Fejd och styret. Vid Envälde lyder man ledaren, och lagen om stridsplikt säger vem som måste gå
  const l = ledareOf(s), lyder = (s.seder.v.rang ?? 0) > ROVARE.lyder && !!l && kan.includes(l), plikt = lagGaller(s, 'stridsplikt');
  return kan.filter(q => forsvarar(q) || q.task?.act === 'vakt' || lyder || plikt || (q.partner !== undefined && familjHotad(s, q, f)) || rovarRoll(rovarVilja(s, q)) === 'kampe'); // samma värde som valet (steg 9.2.116)
}

// striden mellan byns folk och rövarna (steg 6.6.10): den börjar där de står, på en plats runt förrådet, och går i spelets
// tid. Varje slag räknas striden om från början till tiden som gått (spelaUpp i strid.ts), så att den blir likadan i båda
// lägena och kan ritas på kartan steg för steg. Den som kommer till (motstand) under striden ger sig in i den. När striden är
// slut blir skadorna riktiga
const iArenan = (v: number, max: number) => clamp(v, 0.5, max - 0.5);
// dit bybon flyr (steg 9.2.76): sin säng eller elden, på platsen
function flyMal(s: State, p: Person, ox: number, oy: number) {
  const b = bedFor(s, p) ?? eldPlats(s);
  return { x: b.x + 0.5 - ox, y: b.y + 0.5 - oy };
}
// rövaren i striden räknas som en bybo (personKampe, steg 9.2.112): egenskaperna med åldern, skickligheten och siktet ur
// färdigheterna, blodet och såren hen har; vapnet är det hen kom med
const rovarKampe = (s: State, r: Person, id: number, x: number, y: number, ledare: boolean): Uppstallning['kampar'][number] =>
  ({ id, namn: r.name, sida: 1, blod0: r.blod, st: { styrka: stat(r, 'styrka', s.now), uthallighet: stat(r, 'uthallighet', s.now), mod: stat(r, 'mod', s.now), smidighet: stat(r, 'smidighet', s.now), skicklighet: 5 + (r.skill.narstrid ?? 0) / 2, sikte: 5 + (r.skill.traff ?? 0) / 2 }, vapen: gr(r).vapen ?? 'hand', klader: [], fart: 1, x, y, ...(ledare ? { ledare: 'fram' as const } : {}) });
// den som slåss står kvar i striden tills den är slut (eller högst STRID.maxTid sekunder)
function iStriden(s: State, p: Person, g: RovarStrid) {
  if (p.died !== undefined) return; // en död ger sig inte in i striden
  avbryt(s, p);
  p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: g.t0 + (STRID.maxTid + 300) * SEC, carry: 0, why: 'Slåss med rövare' };
}
export function borjaStrid(s: State, f: Rovarflock, folk: Person[]) {
  // hämnden (steg 8.8.5): är anfallarna fler och den de söker inte här går de som blir över förbi slagfältet och letar
  const m = f.skal === 'hamnd' && f.mal !== undefined ? byId(s, f.mal) : undefined;
  if (m && alive(m) && !folk.includes(m) && f.folk.length > folk.length + 1) {
    const over = f.folk.splice(folk.length + 1);
    const o0 = gastAv(s, over[0]), ny: Rovarflock = { ...f, id: s.rovarNr = (s.rovarNr ?? 0) + 1, folk: over, strid: undefined, hugger: undefined, letar: undefined, letat: undefined, x: o0?.x ?? f.x, y: o0?.y ?? f.y };
    borjaLeta(s, ny, m); (s.rovareFler ??= []).push(ny); count(s, 'hamnd_forbi');
  }
  // platsen (steg 9.2.76): så stor att alla som är med och alla som kan komma till (inom motR från förrådet) står där de står,
  // utan att flyttas till en kant
  const fm = malet(s), n = f.folk.length, c = f.anfall ? { x: f.x, y: f.y } : fm, xs = [c.x - ROVARE.motR - 3, c.x + ROVARE.motR + 3], ys = [c.y - ROVARE.motR - 3, c.y + ROVARE.motR + 3]; // i anfallsläget runt flocken (steg 9.2.104)
  for (const q of [...folk, ...rovarna(s, f)]) { xs.push(q.x - 3, q.x + 3); ys.push(q.y - 3, q.y + 3); }
  const ox = Math.floor(Math.min(...xs)), oy = Math.floor(Math.min(...ys)), w = Math.ceil(Math.max(...xs)) - ox, h = Math.ceil(Math.max(...ys)) - oy;
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => { const k = personKampe(s, p, i + 1, 0, p.x - ox, p.y - oy); k.st.mod += 20 * overtygelse(s, f, p); k.fly = flyMal(s, p, ox, oy); return k; }); // övertygelsen (steg 8.8.8)
  rovarna(s, f).forEach((r, j) => { const x = r.x - ox, y = r.y - oy, l = Math.hypot(x + ox - fm.x, y + oy - fm.y) || 1; kampar.push({ ...rovarKampe(s, r, folk.length + j + 1, x, y, j === 0 && n > 1), fly: { x: x + (x + ox - fm.x) / l * 20, y: y + (y + oy - fm.y) / l * 20 }, ...(f.mal !== undefined ? { jagar: f.mal } : {}) }); }); // hämnden riktar sig mot målet (steg 8.8.5); rövarna flyr bort från förrådet
  foljet(s, kampar);
  const blod: Record<number, number> = {};
  rovarna(s, f).forEach((r, j) => { if (r.blod < 1) blod[folk.length + j + 1] = r.blod; });
  const g: RovarStrid = { u: { avsikt: 'skada', w, h, ...vadretIStriden(s), kampar }, fro: Math.floor(rnd(s, 'strid') * 2147483647), blod, in: [], t0: s.now, ox, oy };
  f.strid = g; f.gor = 'slass';
  count(s, 'rovarStrid');
  for (const p of folk) iStriden(s, p, g);
}
// striden räknad till tiden nu (för bilden: tiden som visas)
export const rovarStridNu = (g: RovarStrid, nu: number) => spelaUpp(g, Math.max(0, (nu - g.t0) / SEC));
// ett slag i striden: de nya ger sig in, rövarna står där striden har dem. Svarar när striden är slut: om rövarna vann
function stridGar(s: State, f: Rovarflock, folk: Person[]): boolean | undefined {
  const g = f.strid!, st = rovarStridNu(g, s.now), n = g.u.kampar.length;
  rovarna(s, f).forEach((r, j) => { const k = st.kampar[n - f.folk.length + j]; if (!k) return; const x = g.ox + k.x, y = g.oy + k.y; if (!iVatten(s, x, y)) { r.x = x; r.y = y; gr(r).path = undefined; } });
  if (st.slut) return stridSlut(s, f, st);
  slappFria(s, g, st);
  const med = new Set(st.kampar.map(k => k.pid).filter(x => x !== undefined));
  for (const p of motstand(s, f, folk, f)) {
    if (med.has(p.id) || p.task?.act === 'strid') continue;
    const id = n + g.in!.length + 1;
    g.in!.push({ t: st.t, k: { ...personKampe(s, p, id, 0, iArenan(p.x - g.ox, g.u.w), iArenan(p.y - g.oy, g.u.h)), fly: flyMal(s, p, g.ox, g.oy) } });
    iStriden(s, p, g);
  }
  return undefined;
}
// den som flytt, gett upp eller dragit sig undan har lämnat striden (steg 9.2.77): handlingen strid slutar, och hen står där hen
// sprang. Skadorna blir riktiga när striden är slut (stridSlut), men hen flyttas inte tillbaka dit
export function slappFria(s: State, g: StridGang & { ox: number; oy: number; fri?: number[] }, st: Strid) {
  for (const k of st.kampar) {
    if (k.pid === undefined || !(k.lage === 'borta' || k.lage === 'ger') || g.fri?.includes(k.pid)) continue; // den som flyr är fri när hen kommit undan (borta)
    const p = levande(s, k.pid); if (!p) continue;
    (g.fri ??= []).push(k.pid);
    const x = g.ox + k.x, y = g.oy + k.y;
    if (!iVatten(s, x, y) && !isWall(s, x, y)) { p.x = x; p.y = y; }
    if (p.task?.act === 'strid') { p.task.until = s.now; p.task.why = k.lage === 'ger' ? 'Gav upp i striden' : 'Flydde från striden'; }
  }
}
// striden är slut: de döda rövarna är borta, skadorna blir riktiga skador (som mot vargarna) och striden sparas i byn
// den fallne ligger kvar med det hen hade, tills någon avrustar hen (steg 8.7.5)
function fallenFiende(s: State, r: Person, x: number, y: number) {
  const g = gr(r), saker: Record<string, number> = { ...g.bar };
  if (g.vapen && SAKER[g.vapen]) saker[g.vapen] = (saker[g.vapen] ?? 0) + 1;
  g.bar = undefined;
  kvarlevor(s).push({ id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k: 'fiende', x: Math.floor(x), y: Math.floor(y), t: s.now, vem: -1, namn: r.name, text: r.name, saker });
}
function stridSlut(s: State, f: Rovarflock, st: Strid) {
  const g = f.strid!, vinnare = st.slut!.vinnare, n = f.folk.length;
  f.strid = undefined;
  sparaStrid(s, { t: g.t0, orsak: f.anfall ? 'rövare i byn' : 'rövare vid förrådet', u: g.u, fro: g.fro, ...(Object.keys(g.blod ?? {}).length ? { blod: g.blod } : {}), ...(g.in?.length ? { in: g.in } : {}), vinnare });
  const rov = st.kampar.filter(k => k.sida === 1 && k.pid === undefined), kvar: number[] = [];
  rovarna(s, f).forEach((r, j) => { const k = rov[j]; if (k?.lage === 'dod') { count(s, 'rovarDoda'); fallenFiende(s, r, g.ox + (k.x ?? 0), g.oy + (k.y ?? 0)); const hit = [...st.logg].reverse().find(q => q.h === 'traff' && q.b === k.id); klanMinns(s, f, r, st.kampar.find(o => o.id === hit?.a)?.pid); gastGar(s, r.id); } else { r.blod = Math.max(0.05, k?.blod ?? r.blod); kvar.push(r.id); } });
  const doda = n - kvar.length;
  f.folk = kvar;
  const led = gastAv(s, kvar[0] ?? 0); if (led) { f.x = led.x; f.y = led.y; }
  if (doda) { const k = klanById(s, f.klan); if (k) andraInst(k, -ROVARE.fiende * doda); }
  const svara: string[] = [], folk: Person[] = [];
  for (const k of st.kampar) {
    const p = k.pid !== undefined ? levande(s, k.pid) : undefined;
    if (!p) continue;
    folk.push(p);
    let dod = k.lage === 'dod';
    for (const w of k.skador) {
      if (!dod && skada(s, p, w.d, w.k, w.g, 'rovare', 'i en strid med rövare')) dod = true;
      const sk = p.skador?.[p.skador.length - 1];
      if (!dod && sk && w.fast) sk.fast = 1;
    }
    slitKastat(s, p, st, k);
    if (dod) { count(s, 'dodRovare'); die(s, p, 'rovare'); continue; }
    if (k.lage === 'ger') svarTrohet(s, f, p); // heligt krig (steg 8.8.6)
    const x = g.ox + k.x, y = g.oy + k.y;
    if (!g.fri?.includes(p.id) && !iVatten(s, x, y) && !isWall(s, x, y)) { p.x = x; p.y = y; } // där striden lämnade hen, men aldrig i vattnet eller en vägg; den som redan lämnat striden står där hen gick (steg 9.2.77)
    if (svartSkadad(k)) svara.push(p.name);
    p.blod = Math.min(p.blod ?? 1, Math.max(0, k.blod));
    ovning(p, 'narstrid', SLAGSMAL.ovning);
    think(p, vinnare === 0 ? 'Drev bort rövarna' : 'Slogs med rövare', vinnare === 0 ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    if (p.task?.act === 'strid') p.task.until = s.now;
  }
  const alla = st.kampar.filter(k => k.pid !== undefined);
  const forst = alla[0];
  if (forst) blodas(s, g.ox + forst.x, g.oy + forst.y, 'jakt', 1);
  const namn = lista(alla.filter(k => k.sida === 0).map(k => k.namn));
  const text = `${namn} slogs med ${tal(n)} rövare ${fran(s, f)} ${f.anfall ? 'i byn' : 'vid förrådet'}. ${doda ? `${stor(tal(doda))} ${doda === 1 ? 'rövare dog' : 'rövare dog'}. ` : ''}${vinnare === 1 ? 'Rövarna vann.' : 'Rövarna flydde.'}${svara.length ? ` ${lista(svara)} skadades svårt.` : ''}`;
  const ids = alla.map(k => k.pid!), plats = forst ? { x: Math.floor(g.ox + forst.x), y: Math.floor(g.oy + forst.y) } : { x: Math.floor(f.x), y: Math.floor(f.y) };
  log(s, text, 'world', ids); notis(s, 'strid', text, ids, plats);
  kronika(s, text, 'rovare');
  return vinnare === 1 && f.folk.length > 0;
}
const levande = (s: State, id: number) => { const p = byId(s, id); return p && alive(p) ? p : undefined; };
// hela striden på en gång (scenarierna): börjar och räknas till slutet
export function rovarStrid(s: State, f: Rovarflock, folk: Person[]) {
  borjaStrid(s, f, folk);
  const st = spelaUpp(f.strid!);
  return stridSlut(s, f, st);
}

// rövarna tar så mycket de kan bära, det med högst pris per vikt först, redskapen inräknade (steg 8.7.16)
// de som rövarna kommit i kontakt med och som inte gett upp eller gömt sig (steg 9.2.119): nära flocken, vakna, och de står
// emot, hjälper till eller håller vakt. Så länge någon står kvar tar rövarna ingenting; det blir strid först
function starKvar(s: State, f: Rovarflock, folk: Person[]) {
  return folk.filter(q => alive(q) && vaken(q) && vuxenKan(s, q) && avst(q, f) < ROVARE.motR && (forsvarar(q) || q.task?.act === 'hjalpaRovare' || q.task?.act === 'vakt'));
}
export function plundra(s: State, f: Rovarflock, tyst: boolean) {
  let tog = 0;
  // att fly är att ge upp (steg 8.7.17): flyr alla som möter rövarna tar de vad de vill, också ur kistor och hyllor
  const gavUpp = living(s).some(p => p.task?.act === 'fly' && ageOf(p, s.now) >= ALDER.vuxen);
  const bar = ROVARE.bar * (gavUpp ? ROVARE.gerUpp : 1);
  if (gavUpp) { count(s, 'byGavUpp'); log(s, 'Byn gav upp, och rövarna tog vad de ville.', 'world'); }
  // redskapen räknas styckvis (ett slitet redskap är ändå ett), det andra i hela saker
  const fritt = (k: string) => tingOf(s).some(q => q.k === k && q.bar === undefined && q.hos === undefined && q.lass === undefined);
  const varor = SAK_LIST.filter(k => SAKER[k]!.redskap ? fritt(k) : amountOf(s, k) >= 1).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a)));
  const tagna: Record<string, number> = {};
  for (const r of rovarna(s, f)) {
    let vikt = 0;
    for (const k of varor) {
      while (vikt + viktOf(k) <= bar && amountOf(s, k) >= 1 && !SAKER[k]!.redskap) { addTo(s, k, -1); vikt += viktOf(k); tog++; tagna[k] = (tagna[k] ?? 0) + 1; (gr(r).bar ??= {})[k] = (gr(r).bar![k] ?? 0) + 1; }
      if (SAKER[k]!.redskap && vikt + viktOf(k) <= bar) { const t = tingOf(s).find(q => q.k === k && q.bar === undefined && q.hos === undefined && q.lass === undefined); if (t) { s.ting = s.ting!.filter(q => q !== t); vikt += viktOf(k); tog++; tagna[k] = (tagna[k] ?? 0) + 1; (gr(r).bar ??= {})[k] = (gr(r).bar![k] ?? 0) + 1; } }
    }
  }
  const tog_ = varor.filter(k => tagna[k]).map(k => antal(tagna[k], k));
  count(s, 'rovarPlundring'); if (tog) count(s, 'rovat', tog);
  if (tyst) count(s, 'rovarTyst');
  const text = tog ? `Rövare ${fran(s, f)} ${tyst ? 'smög in i byn osedda och ' : ''}tog ${och(tog_)} ur förrådet.` : `Rövare ${fran(s, f)} kom till förrådet men hittade inget att ta.`;
  log(s, text, 'world'); if (tog) notis(s, 'motgang', text);
  if (tog) kronika(s, text, 'rovare');
}
// rövaren som faller tappar det hen bär där hen ligger; det är byns igen
export function tappar(s: State, r: Person) {
  const g = gr(r);
  if (!g.bar) return;
  const n = Object.values(g.bar).reduce((a, b) => a + b, 0);
  dropLoad(s, { act: 'bara', carry: 0, items: { ...g.bar } } as unknown as Task, r.x, r.y);
  g.bar = undefined;
  if (n) count(s, 'rovarTappat', n);
}

// vad flocken gör i det här slaget
function flockSteg(s: State, f: Rovarflock, folk: Person[], dtSec: number) {
  if (f.gor === 'flyr') {
    // var och en springer mot sin närmaste kant och är borta när hen når den
    const t0 = s.now - dtSec * SEC;
    f.folk = f.folk.filter(id => {
      const r = gastAv(s, id); if (!r) return false;
      let kvar = -1;
      for (const k of kanterna(r.x, r.y)) { kvar = gaMot(s, r, k.x, k.y, dtSec, t0); if (kvar >= 0) break; }
      if (f.rad) iFarten(s, r); // saker i farten (steg 8.8.3)
      if (kvar >= 0.5) return true;
      gastGar(s, id, true); // borta från kartan, hem till klanen (steg 9.2.114)
      return false;
    });
    const led = gastAv(s, f.folk[0] ?? 0);
    if (led) { f.x = led.x; f.y = led.y; } else count(s, 'rovarBorta');
    return;
  }
  if (f.gor === 'slass') { // striden pågår (steg 6.6.10)
    const vann = stridGar(s, f, folk);
    if (vann === undefined) return;
    if (vann) { const kvar = starKvar(s, f, folk); if (kvar.length) { count(s, 'rovarStarKvar'); borjaStrid(s, f, kvar); return; } } // står någon kvar blir det strid igen (steg 9.2.119)
    f.gor = 'flyr';
    if (vann) { if (!radSeger(s, f)) plundra(s, f, false); if ((f.gor as Rovarflock['gor']) !== 'letar') tandaHus(s, f); } // radSeger kan sätta letar
    return;
  }
  if (f.gor === 'letar') { letaSteg(s, f, folk, dtSec); return; }
  if (f.gor === 'rotar') { rotaSteg(s, f, folk, dtSec); return; }
  // anfallsläget (steg 9.2.104): när de som går mot flocken är nära börjar striden där flocken står
  if (f.anfall && folk.some(q => forsvarar(q) && avst(q, f) < ROVARE.motR)) { const mot = motstand(s, f, folk, f); if (mot.length) { borjaStrid(s, f, mot); return; } }
  if (f.gor === 'samlas') {
    if (s.now < f.till) return;
    // en liten flock väntar på mörkret
    f.gor = 'kommer';
  }
  const m = malet(s);
  // byn väntar med fler än rövarna: de vänder om
  if (avst(f, m) < ROVARE.ser || f.gor === 'vantar') {
    const vantar = folk.filter(q => forsvarar(q) && avst(q, m) < ROVARE.ser).length;
    if (vantar > f.folk.length * ROVARE.overmakt) { f.gor = 'flyr'; count(s, 'rovarVande'); log(s, `Rövarna ${fran(s, f)} såg att byn väntade på dem med vapen och vände om.`, 'world'); return; }
  }
  if (f.gor === 'vantar' && f.sedd !== undefined) budSteg(s, f, folk);
  if (f.gor === 'vantar') { if (s.now < f.till) return; f.gor = 'kommer'; }
  // först till en plats utanför byn, där flocken väntar en stund; sedan till förrådet
  const lur = !f.lurat && avst(f, m) > ROVARE.lur + 1 ? lurPlats(s, f, m) : undefined;
  const mal = lur ?? m;
  f.mx = mal.x; f.my = mal.y;
  const kvar = flockGar(s, f, dtSec);
  if (kvar < 0) { f.gor = 'flyr'; return; }
  if (lur) {
    if (kvar > ROVARE.nara) return;
    f.lurat = true; f.gor = 'vantar'; f.till = s.now + (f.test ? ROVARE.testVanta : mellan(s, ROVARE.lurMin)) * MIN;
    return;
  }
  if (kvar > ROVARE.nara) return;
  // framme vid förrådet: striden börjar, eller rövarna plundrar när ingen står emot
  const mot = motstand(s, f, folk);
  if (mot.length) { borjaStrid(s, f, mot); return; }
  const star = starKvar(s, f, folk);
  if (star.length) { count(s, 'rovarStarKvar'); borjaStrid(s, f, star); return; } // de som står bakom står också emot (steg 9.2.119)
  if (huggDorr(s, f, folk)) return; // en stängd dörr huggs sönder (steg 8.9.1–8.9.2)
  if (!f.rotat && !f.rad) { borjaRota(s, f); return; } // först letar de en stund i förråden (steg 9.2.120)
  rovarnaTar(s, f, folk);
}
// rövarna tar det de valt och ger sig av: hämnden letar vidare, annars plundrar de och tänder kanske ett hus
function rovarnaTar(s: State, f: Rovarflock, folk: Person[]) {
  f.gor = 'flyr';
  if (!radSeger(s, f)) plundra(s, f, f.sedd === undefined);
  if ((f.gor as Rovarflock['gor']) === 'letar') return; // radSeger: hämnden letar vidare hus för hus (steg 8.8.5)
  tandaHus(s, f); // (steg 8.9.3)
  larma(s, 'rovare', f.folk.length, folk.filter(q => vaken(q) && avst(q, f) < ROVARE.folkSer));
}
// rövarna rotar i förråden (steg 9.2.120, "Plundringen" i designdokumentet): de går mellan lagerplatserna och förrådshusen, närmast
// först, och letar efter det mest värdefulla i ROVARE.rotaMin minuter sammanlagt, så att byn hinner reagera. Den som kommer och står
// emot under tiden gör att det blir strid; när de letat klart tar de det dyraste de kan bära (plundra)
function borjaRota(s: State, f: Rovarflock) {
  const stopp = zonesOf(s).map(z => ({ x: z.x + z.w / 2, y: z.y + z.h / 2 }));
  if (!stopp.length) stopp.push(malet(s));
  const ut: { x: number; y: number }[] = [];
  let p: { x: number; y: number } = f;
  while (stopp.length) { stopp.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); p = stopp.shift()!; ut.push(p); }
  f.gor = 'rotar'; f.rotat = true; f.rotar = ut.map(q => ({ x: q.x, y: q.y, min: ROVARE.rotaMin / ut.length })); f.till = 0;
  count(s, 'rovarRotar');
}
function rotaSteg(s: State, f: Rovarflock, folk: Person[], dtSec: number) {
  const mot = motstand(s, f, folk, f);
  if (mot.length) { borjaStrid(s, f, mot); return; }
  const star = starKvar(s, f, folk);
  if (star.length) { count(s, 'rovarStarKvar'); borjaStrid(s, f, star); return; }
  const mal = f.rotar?.[0];
  if (!mal) { rovarnaTar(s, f, folk); return; }
  f.mx = mal.x; f.my = mal.y;
  if (!f.till) {
    const kvar = flockGar(s, f, dtSec);
    if (kvar < 0) { f.rotar!.shift(); return; } // dit går det inte att gå
    if (kvar > ROVARE.nara) return;
    f.till = s.now + mal.min * MIN; // framme: de letar här en stund
    return;
  }
  if (s.now < f.till) return;
  f.rotar!.shift(); f.till = 0;
}

// hämnden letar hus för hus (steg 8.8.5): flocken går till husen i tur och ordning, närmast först. Är den de söker där, eller
// kommer de nära hen, hittas hen; står någon emot blir det strid igen. När alla hus är genomsökta ger de sig av
function letaSteg(s: State, f: Rovarflock, folk: Person[], dtSec: number) {
  const m = byId(s, f.mal ?? -1);
  if (!m || !alive(m) || avst(f, m) <= RADER.hittaNara) { hamndKlar(s, f, m, !!m && alive(m)); tandaHus(s, f); f.gor = 'flyr'; return; }
  const mot = motstand(s, f, folk, f);
  if (mot.length) { borjaStrid(s, f, mot); return; }
  const h = f.letar?.length ? husById(s, f.letar[0]) : undefined;
  if (!h) { if (f.letar?.length) { f.letar.shift(); return; } hamndKlar(s, f, m, false); f.gor = 'flyr'; return; }
  f.mx = h.x + h.w / 2; f.my = h.y + h.h / 2;
  const kvar = flockGar(s, f, dtSec);
  if (kvar < 0) { f.gor = 'flyr'; return; }
  if (kvar > ROVARE.nara) return;
  const inne = roomAt(s, m.x, m.y)?.hus === h.id;
  // är hen inne bakom en stängd dörr hugger de sig in (steg 8.9.1–8.9.2), långsammare om dörren är bommad
  const dorr = inne ? bitsOf(s).find(b => b.hus === h.id && b.dorr && (DORRAR as Record<string, { stanger?: boolean }>)[b.dorr]?.stanger) : undefined;
  if ((f.hugger || dorr) && huggDorr(s, f, folk, dorr)) return;
  if (inne) { hamndKlar(s, f, m, true); tandaHus(s, f); f.gor = 'flyr'; return; }
  f.letar!.shift();
}
// tornadon (steg 6.4.12): rövarna drabbas som byborna. zon 0 (kärnan): alla dör; zon 1 (nära) och 2 (utkanten): var och en
// dör (med chansen dod) eller skadas (grad, med chansen skadas), och flocken kastas till platsen till och flyr. r(j, salt) är
// ett tal mellan 0 och 1 för rövare nummer j
export function rovarTornado(s: State, f: Rovarflock, zon: number, dod: number, skadas: number, grad: readonly number[], r: (j: number, salt: number) => number, till?: { x: number; y: number }) {
  const fore = f.folk.length;
  f.folk = f.folk.filter((id, j) => {
    const q = gastAv(s, id); if (!q) return false;
    if (zon === 0 || r(j, 1) < dod) { tappar(s, q); gastGar(s, id); count(s, 'rovarDoda'); count(s, 'tornado dod'); return false; }
    if (r(j, 2) < skadas) q.blod = Math.max(0.05, q.blod - (grad[0] + r(j, 3) * (grad[1] - grad[0])));
    return true;
  });
  if (till && f.folk.length) stallUpp(s, f, till.x + 0.5, till.y + 0.5);
  if (f.strid) { // byborna i striden släpps, så att de inte står kvar i den när rövarna flugit iväg
    const g = f.strid;
    for (const id of [...g.u.kampar.map(k => k.pid), ...(g.in ?? []).map(q => q.k.pid)]) { const p = id !== undefined ? levande(s, id) : undefined; if (p?.task?.act === 'strid') p.task.until = s.now; }
  }
  f.gor = 'flyr'; f.strid = undefined;
  const doda = fore - f.folk.length;
  log(s, doda === fore ? `Tornadon dödade rövarna ${fran(s, f)}.` : `Tornadon kastade rövarna ${fran(s, f)} åt sidan${doda ? ` och ${doda} dog` : ''}. De flyr.`, 'world');
  if (!f.folk.length && s.rovare === f) s.rovare = undefined; // en tom flock bland de andra sållas bort i rovarSteg
}

// varje slag (steg.ts): en flock kommer, ses, går in mot byn och flyr
export function rovarSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme && Math.floor(s.now / HOUR) % 24 === 12) radDygn(s); // räderna (steg 8.8.1)
  if (nyTimme) rovarnaKommer(s);
  if (!s.rovare && !s.rovareFler?.length) return;
  // alla flockar på kartan går samtidigt (steg 8.7.18): den första (s.rovare) och de som kom medan den var här (rovareFler).
  // Var och en har sin egen strid; den som redan slåss i en strid ger sig inte in i en annan
  const folk = living(s);
  for (const f of [s.rovare, ...(s.rovareFler ?? [])]) {
    if (!f) continue;
    if (f.gor !== 'flyr') { ses(s, f, folk); if (f.sedd !== undefined && !f.anfall && f.gor !== 'slass' && f.gor !== 'letar' && iByn(s, f)) anfall(s, f, folk); if (f.sedd !== undefined && f.gor !== 'slass') narFlocken(s, f, folk); }
    if (f.folk.length) flockSteg(s, f, folk, dtSec);
  }
  if ([s.rovare, ...(s.rovareFler ?? [])].some(f => f && f.sedd !== undefined && f.gor !== 'flyr')) barnRop(s, folk);
  if (s.rovare && !s.rovare.folk.length) s.rovare = undefined;
  if (s.rovareFler) { s.rovareFler = s.rovareFler.filter(q => q.folk.length); if (!s.rovare) s.rovare = s.rovareFler.shift(); if (!s.rovareFler.length) s.rovareFler = undefined; }
  // möts flockar från klaner som inte tycker om varandra slåss de
  if (nyTimme && s.rovare) for (const o of s.rovareFler ?? []) flockarMots(s, s.rovare, o);
  if (nyTimme) for (const f of [s.rovare, ...(s.rovareFler ?? [])]) if (f) djurMotRovare(s, f);
}
// två flockar från klaner som inte tycker om varandra: en strid mellan tre parter. Den svagaste flocken flyr
function flockarMots(s: State, a: Rovarflock, b: Rovarflock) {
  if (a.klan === b.klan || avst(a, b) > ROVARE.flockarMots || a.strid || b.strid) return; // inte medan en av dem slåss med byn
  const ka = klanById(s, a.klan), kb = klanById(s, b.klan);
  if ((ka?.inst ?? 0) > 0 && (kb?.inst ?? 0) > 0) return;
  count(s, 'flockarSlass');
  const svag = a.folk.length <= b.folk.length ? a : b;
  log(s, `Två rövarflockar möttes vid byn och slogs med varandra.`, 'world'); kronika(s, 'Två rövarflockar slogs med varandra vid byn.', 'rovare');
  for (const r of rovarna(s, svag)) r.blod = Math.max(0.2, r.blod - 0.4);
  svag.gor = 'flyr';
}
// djuren bryr sig inte om klanen (steg 8.7.19): rovdjur anfaller rövare, handlare och gäster efter samma regler som byborna
function djurMotRovare(s: State, f: Rovarflock) {
  if (f.strid) return; // inte mitt i striden med byn: den har rövarna i sin ordning
  for (const d of vargarNara(s, f)) {
    const r = gastAv(s, f.folk[0] ?? 0); if (!r || rnd(s, 'rovare') >= ROVARE.djurChans) continue;
    r.blod = Math.max(0, r.blod - 0.3); count(s, 'djurMotRovare');
    if (r.blod <= 0.1) { f.folk.shift(); tappar(s, r); gastGar(s, r.id); log(s, `${d} tog en av rövarna.`, 'world'); }
  }
}
const vargarNara = (s: State, f: Rovarflock) => bjornarOf(s, s.now).filter(d => d.art === 'bjorn').concat(vargarOf(s) as never).filter(d => Math.hypot(d.x - f.x, d.y - f.y) < ROVARE.djurR).map(d => d.art === 'bjorn' ? 'En björn' : 'En varg'); // björnungarna anfaller inte
