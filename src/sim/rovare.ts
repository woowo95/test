import { antal, lista, och, stor, tal } from './ord';
import { utanforByn } from './omrade';
import { balans } from './balans';
import { KLOCKA, SLAGHINDER, kanNa } from './klocka';
import { blodas } from './blod';
import { isParent, ALDER, KROPP, ageOf, alive, byId, count, isSick, living, log, makeName, ovning, stat, think } from './folk';
import { halsa, horsel, kanGa } from './halsa';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { Klan, andraInst, klanById, klanerOf } from './klaner';
import { addTo, amountOf, avbryt, carryKind, dropLoad, isCarrying, zoneOf, zonesOf } from './lager';
import { hundSkaller, tamArt, tamStulen, tamUte } from './tamdjur';
import { DORRAR, bitAt, bitsOf, freeNear, husById, roomAt } from './byggnad';
import { LARM } from './rykten';
import { SAKER, SAK_LIST } from './saker';
import { vattenNu } from './sjo';
import { clamp, hash3, rnd } from './slump';
import { SLAGSMAL, VAPEN, personKampe, slitKastat, svartSkadad } from './strid';
import { isLight, lightLevel } from './tid';
import { larmAvbryter } from './handlingar';
import { lagGaller } from './lagar';
import { ledareOf } from './styre';
import { DAY, HOUR, MIN, Person, SEC, State, T, Task, W, H, inMap } from './typer';
import { vaderNu } from './vader';
import { grundvarde, rikedom } from './varde';
import { husPlats, iHus, kanterna, setHotVilja, setRovarVal, skyddVidElden } from './varg';
import { taVapen } from './vakt';
import { foddNar, gastNyckel } from './gastliv';
import { gastAv, gastGar, gastTillbaka, nyGast, nyttGastId } from './gast';
import { notis } from './notiser';
import type { TalkEvent } from './samtal';
import { groundOf, tileOf } from './mark';
import { findPath, markFart } from './vag';
import { GANG } from './gang';
import { kvarlevor } from './kvarlevor';
import { RADER, hamndKlar, huggDorr, iFarten, klanMinns, overtygelse, radDygn, radSeger, svarTrohet, tandaHus } from './rader';
import { bjornarOf, vargarOf } from './djur';
import { tingOf } from './agande';
import { viktOf } from './saker';
import { LARMHOT, rollVid, viljaKrok } from './roller';
import { KartStrid, kartStridBorja, kartStridMed, kartStrider } from './kartstrid';
import { EFTER, FAROR, gastKrok } from './efterstrid';

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
  lur: 22, // flocken stannar så här många rutor från förrådet och väntar (lurMin minuter) innan den går till anfall (steg 6.6.9) ...
  lurMin: [15, 30], // ... minst, högst
  vaktSer: 26, folkSer: 12, nattSer: 0.5, dimmaSer: 0.5, // vakten ser rövare inom så här många rutor, andra inom folkSer, gånger nattSer i mörkret
  gissFel: 0.5, // vaktens gissning av antalet: fel med upp till så här stor del, gånger avståndet / vaktSer (andra gissar som på längsta avståndet)
  bredvid: 2, // var och en går mot en egen punkt upp till så här många rutor från gängets mål (steg 10.2.25) ...
  filBredd: 1.1, // ... och går en egen fil så här många rutor från de andras
  fartSpann: 0.08, // ... och så här mycket fortare eller långsammare än en bybo
  nara: 1.5, // rövarna är framme vid förrådet så här nära
  // rövarnas val (steg 10.1.9–10.1.15, ROVARHANDLINGAR)
  rastR: 3, // rastplatsen: så här nära mitten håller de sig, och så långt går den som går omkring
  rastaPoang: 0.35, gaPoang: 0.35, prataPoang: 0.3, // poängen för att vila, gå omkring och prata på rastplatsen (steg 10.2.24: vilan vann nästan alltid med 0,5)
  pratSek: 40, // den som pratar samtalar ungefär en gång på så här många sekunder
  rastSek: [20, 90], // en vila, en promenad eller ett samtal på rastplatsen varar så här många sekunder
  valKvar: 0.2, valBrus: 0.3, // det hen redan gör har så här mycket försteg i valet, och vilan, promenaden och samtalet slumpas med så här mycket
  horhall: 30, // den som varnar hörs så här många rutor (gånger LARM.natt på natten): hörhållet är stort (steg 10.1.12) ...
  varnaSek: 4, // ... och att varna tar så här många sekunder
  fackelSer: 1, // på natten syns ett gäng med en tänd fackla som på dagen (gånger detta), annars gånger nattSer (steg 10.1.10)
  moter: 6, // en rövare och den som står emot börjar slåss när de är så här nära varandra (rutor) ...
  slaIvagen: 0.5, hotaPoang: 0.6, taBordaPoang: 0.8, // ... och den som inte står emot men är så nära: den aggressiva slår (gånger aggressionen / 10), den modiga hotar (gånger modet / 10), och den som har plats tar det hen bär (steg 10.2.26)
  slaMod: 0.5, slaHot: 0.6, // viljan att slå: per tio steg mod över 10, och minus detta per gång fler som står emot än de själva
  hotVapen: 2, // i hotet räknas var och en som 1 + detta gånger vapnets skada
  flyBlod: 2.5, flyHot: 0.8, flyDoda: 1.2, // viljan att fly: blodet hen förlorat, övermakten hen ser (mindre för den modiga) och delen av flocken som är borta
  taSek: 12, // så många sekunder tar det att ta en sak ur förrådet (steg 10.1.15): tiden följer hur mycket det finns att ta
  gavSigTim: 2, // den som flytt eller gett upp i striden står inte emot igen på så här många timmar
  motR: 10, // de vuxna som är vakna och så här nära möter rövarna, om de är kämpar (rovarRoll, steg 9.2.116) ...
  lyder: 0.5, lyderPlus: 0.15, iver: 0.2, // över den här Envälde-seden lyder man ledaren (så mycket mer vilja), och så mycket drar Fejd och Krig till striden eller från den (steg 8.7.9, 10.1.13)
  pliktPlus: 0.3, familjPlus: 0.05, smabarnMinus: 0.15, // lagen om stridsplikt, den som har partner eller barn i byn att försvara, och föräldern till ett litet barn (steg 10.1.13)
  gerUpp: 1.5, // ... och så många gånger mer när byn gett upp
  bar: 20, // så mycket väger det varje rövare som står kvar kan bära (steg 8.7.16)
  boskapR: 30, // varje rövare driver bort ett betesdjur som står ute inom så här många rutor (steg 9.8.12)
  styrka: [8, 14], mod: [8, 15], uthallighet: [9, 14], smidighet: [8, 14], skicklighet: [6, 11], // rövarnas kroppar (lägst, högst)
  fiende: 15, // när byn dödar rövare blir klanen så här mycket ovänligare för var och en
  flockarMots: 20, djurChans: 0.2, djurR: 6, // två flockar slåss när de är så här nära, och ett rovdjur anfaller så här ofta inom djurR rutor (steg 8.7.18–8.7.19)
  testVanta: 1, // testläget: gänget rastar så här många minuter innan anfallet, i stället för lurMin; inget annat skiljer (steg 10.1.16)
  larmTim: 2, // ... om hen inte redan fått larmet de senaste så här många timmarna
  anfallUt: 2, // en flock som setts så här nära byns område (utanforByn) eller inne i det gör att byn går i anfallsläge (steg 9.2.104)
  lurUt: 3, // väntplatsen ligger minst så här många rutor utanför byns område (utanforByn), också för en vanlig flock (steg 9.2.103)
  // vem som strider, hjälper eller gömmer sig (steg 9.2.116, rovarVilja): mod / 20 + iver, minus skadad × det som fattas i hälsan,
  // sjuk när hen är sjuk och gammal för de gamla, plus seden, familjen, plikten och ledaren (rovarVilja). Från kampeFran strider hen, från hjalpFran hjälper hen och står bakom en bit bakom kämparna, annars gömmer hen sig
  budMarg: 1.2, budMax: 2, // budbäraren (steg 9.2.117) går bara om vägen dit, gånger budMarg, hinns före anfallet, och ger upp efter budMax timmar
  kampeFran: 0.15, hjalpFran: 0.05, skadad: 1, sjuk: 0.5, gammal: 0.3, bakom: 3,
});

// rövarnas vapen (ett slumpas för var och en)
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
export interface Rovarflock { rast?: { x: number; y: number }; vantat?: boolean; anfaller?: boolean; klar?: boolean; radKlar?: boolean; antal?: number; strider?: number; tagit?: Record<string, number>; sx?: number; sy?: number; skal?: import('./rader').RadSkal; rad?: boolean; mal?: number; hugger?: { bit: number; till: number }; tant?: boolean; id: number; klan?: number; folk: number[]; x: number; y: number; mx: number; my: number; gor: 'samlas' | 'kommer' | 'vantar' | 'slass' | 'flyr' | 'letar' | 'rotar'; letar?: number[]; rotar?: { x: number; y: number; min: number }[]; rotat?: boolean; letat?: boolean; till: number; sedd?: number; gissning?: number; vackt?: boolean; lurat?: boolean; test?: boolean; anfall?: boolean; bud?: { av: number; till: number; t: number } }

const avst = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const vaken = (p: Person) => p.task?.act !== 'sova';
const mellan = (s: State, [a, b]: readonly number[]) => a + rnd(s, 'rovare') * (b - a);
const vuxenKan = (s: State, p: Person) => { const a = ageOf(p, s.now); return a >= ALDER.vaktFran && a < ALDER.vaktTill && halsa(p) >= KROPP.svag && kanGa(p); }; // den sjuka kan slåss men vill mindre (ROVARE.sjuk i rovarVilja)

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
  const text = `Testläget: ${n} rövare kommer in från kartans kant ${d} rutor ${vaderstreck(s, f.x, f.y)} om elden, rastar ${ROVARE.testVanta === 1 ? 'en minut' : `${ROVARE.testVanta} minuter`} utanför byn och går sedan till anfall, som ett vanligt gäng.`;
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
  const m = getMap(s.seed), nara = undefined as { x: number; y: number } | undefined; // testläget kommer in från kanten som ett vanligt gäng (steg 10.1.16): bara väntan är kortare
  let x = nara?.x ?? 0, y = nara?.y ?? 0;
  for (let i = 0; !nara && i < 20; i++) {
    const sida = Math.floor(rnd(s, 'rovare') * 4), l = rnd(s, 'rovare');
    x = sida === 0 ? 0.5 : sida === 1 ? W - 0.5 : l * W; y = sida === 2 ? 0.5 : sida === 3 ? H - 0.5 : l * H;
    if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break;
  }
  // den grannklan som tycker sämst om byn, om någon inte tycker om den
  const k: Klan | undefined = klan !== undefined ? klanById(s, klan) : klanerOf(s).filter(q => q.inst < 0).sort((a, b) => a.inst - b.inst)[0];
  const n = tvinga ?? Math.round(mellan(s, ROVARE.antal));
  const folk: number[] = Array.from({ length: n }, () => { // gänget har ingen ledare (steg 10.2.25)
    const sex = rnd(s, 'rovare') < 0.8 ? 'm' as const : 'k' as const;
    const hem = k?.personer.find(q => q.roll === 'rovare' && q.kropp); // en som flydde hem förra gången kommer igen (steg 9.2.114); slumpen dras ändå
    const namn = hem?.namn ?? makeName(s, sex, 'rovare'); // vapnet och kläderna kommer ur registret GASTUTRUSTNING (gast.ts, steg 10.1.8)
    const styrka = mellan(s, ROVARE.styrka), uthallighet = mellan(s, ROVARE.uthallighet), mod = mellan(s, ROVARE.mod), smidighet = mellan(s, ROVARE.smidighet), skick = mellan(s, ROVARE.skicklighet);
    const ov = Math.max(0, (skick - 5) * 2); // skickligheten i striden är 5 + färdigheten / 2, som hos en bybo (personKampe)
    const p = nyGast(s, { id: nyttGastId(s), namn, sex: hem?.sex ?? sex, fodd: foddNar(s.seed, gastNyckel(k?.id, namn), 'rovare', s.now), rad: { sort: 'rovare', klan: k?.id }, x, y, nyckel: gastNyckel(k?.id, namn), pot: { styrka, uthallighet, mod, smidighet }, skill: { narstrid: ov, traff: ov } }); // drar ingen slump
    gastTillbaka(s, p);
    s.people.push(p);
    return p.id;
  });
  folk.forEach((id, j) => { const g = gastAv(s, id)?.gast; if (g) g.fil = j - (folk.length - 1) / 2; }); // var sin fil bredvid de andra (steg 10.2.25)
  const nr = s.rovarNr = (s.rovarNr ?? 0) + 1;
  // testläget (steg 9.2.103): flocken samlas ROVARE.testSamlas minuter, aldrig den vanliga väntan
  s.rovare = { id: nr, klan: k?.id, folk, x, y, mx: x, my: y, gor: 'kommer', till: 0, ...(direkt ? { test: true } : {}) };
  stallUpp(s, s.rovare, x, y);
  s.rovarVila = s.now;
  if (forra) { (s.rovareFler ??= []).push(s.rovare); s.rovare = forra; count(s, 'tvaFlockar'); }
  count(s, 'rovarflockar'); count(s, 'rovare', n);
}
const fran = (s: State, f: Rovarflock) => { const k = klanById(s, f.klan); return k ? `från ${k.namn}` : 'utan klan'; };

// ---------- rövarna som människor (steg 6.6.9) ----------
// Varje rövare står och går för sig, i en bybos fart (GANG.fart gånger marken, lite olika för var och en) med samma vägsökning
// som byborna (findPath). Gänget har ingen ledare (steg 10.2.25): alla har samma mål, och var och en går mot sin egen punkt
// bredvid de andra (egenPunkt). spar är vägen för bilden: tid och plats efter varandra, de senaste SPAR_SEK sekunderna
const SPAR_SEK = 900;
const iVatten = (s: State, x: number, y: number) => vattenNu(s)[tileOf(x, y)] === T.Vatten;
// avståndet från q till den närmaste rövaren
const narmast = (s: State, f: Rovarflock, q: { x: number; y: number }) => Math.min(...rovarna(s, f).map(r => Math.hypot(r.x! - q.x, r.y! - q.y)));
// rövarens egen plats kring (x, y), på land
function egenPlats(s: State, x: number, y: number, r: Person) {
  const [dx, dy] = egenPunkt(r), px = clamp(x + dx, 0.3, W - 0.3), py = clamp(y + dy, 0.3, H - 0.3);
  return iVatten(s, px, py) && !iVatten(s, x, y) ? { x, y } : { x: px, y: py };
}
function spara(s: State, r: Person, t: number) {
  const sp = gr(r).spar ??= [];
  sp.push(Math.round(t), Math.round(r.x! * 1000) / 1000, Math.round(r.y! * 1000) / 1000);
  let i = 0; while (i + 3 < sp.length && sp[i + 3] < s.now - SPAR_SEK * SEC) i += 3;
  if (i) sp.splice(0, i);
}
// rövarna ställer sig var och en på sin plats kring (x, y): när flocken kommer, efter tornadon och i en sparad by från före v450
export function stallUpp(s: State, f: Rovarflock, x: number, y: number) {
  rovarna(s, f).forEach(r => { const p = egenPlats(s, x, y, r); r.x = p.x; r.y = p.y; gr(r).path = undefined; gr(r).pk = undefined; spara(s, r, s.now); });
  f.x = x; f.y = y;
}
// rövaren går mot (mx, my) i sek sekunder från tiden t0. Svarar hur långt det är kvar (rutor), eller −1 när det inte finns någon väg
export function gaMot(s: State, r: Person, mx: number, my: number, sek: number, t0: number, fartF = 1) {
  const g = groundOf(s), mal = tileOf(mx, my);
  if (gr(r).pk !== mal) {
    gr(r).pk = mal; gr(r).path = findPath(g, r.x, r.y, mx, my) ?? undefined;
    if (!gr(r).path) { gr(r).pk = undefined; return -1; }
  }
  if (!gr(r).spar?.length) spara(s, r, t0);
  let tid = 0;
  for (;;) {
    const sist = !gr(r).path?.length, i = sist ? 0 : gr(r).path![0];
    let wx = sist ? mx : (i % W) + 0.5, wy = sist ? my : Math.floor(i / W) + 0.5;
    if (!sist) { // bredvid de andra i gänget (steg 10.2.25): var och en går en egen linje vid sidan av vägen, om marken där går att gå på
      const ux = wx - r.x!, uy = wy - r.y!, ul = Math.hypot(ux, uy) || 1, o = sidaOm(r), sx = wx - uy / ul * o, sy = wy + ux / ul * o;
      if (inMap(sx, sy) && !iVatten(s, sx, sy) && !bitAt(s, sx, sy)) { wx = sx; wy = sy; }
    }
    const fart = GANG.fart * fartF * Math.max(0.5, markFart(g, tileOf(r.x!, r.y!)));
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

// ---------- facklan, att se faran och larmet (steg 10.1.10–10.1.12; "Rastplatsen", "Att se dem" och "Larmet" i designdokumentet) ----------
// Facklan: på natten håller minst en i gänget en tänd fackla, som lyser som andra facklor (ljus.ts) och syns i bilden; därför syns
// gänget på långt håll också i mörker. På dagen är den släckt
const facklor = (s: State, f: Rovarflock) => (s.gastTing ?? []).filter(t => t.k === 'fackla' && f.folk.includes(t.agare));
export const facklaTand = (s: State, f: Rovarflock) => facklor(s, f).some(t => t.tand !== undefined);
function facklaSteg(s: State, f: Rovarflock) {
  const fs = facklor(s, f);
  if (lightLevel(s.now) > 0) { for (const t of fs) if (t.tand !== undefined) { t.tand = undefined; t.tandT = undefined; } return; }
  if (fs.some(t => t.tand !== undefined)) return;
  let t = fs[0];
  if (!t) { const led = rovarna(s, f)[0]; if (!led) return; t = { id: -(s.gastTingNr = (s.gastTingNr ?? 0) + 1), k: 'fackla', c: 1, agare: led.id }; (s.gastTing ??= []).push(t); } // ett gäng går aldrig ut utan en fackla
  t.tand = t.agare; t.tandT = s.now; count(s, 'rovarFackla');
}
// så långt ser q gänget: vakten längst, kortare på natten (men som på dagen när gänget har en tänd fackla) och i dimma
export function synhall(s: State, f: Rovarflock, q: Person) {
  const ljus = lightLevel(s.now) > 0 ? 1 : facklaTand(s, f) ? ROVARE.fackelSer : ROVARE.nattSer;
  return (q.task?.act === 'vakt' ? ROVARE.vaktSer : ROVARE.folkSer) * ljus * (1 - ROVARE.dimmaSer * vaderNu(s).dimma);
}
// Att se dem: var och en som är vaken och har gänget inom synhåll ser det och vet (larmet hos personen). Den som är långt borta vet
// ingenting förrän hen själv ser dem eller hör en varning. Vakthunden hör dem före vakten (steg 9.8.11)
function seSteg(s: State, f: Rovarflock, folk: Person[]) {
  const ser = (q: Person) => vaken(q) && narmast(s, f, q) < synhall(s, f, q);
  const hund = hundSkaller(s, d => narmast(s, f, d));
  for (const q of folk) {
    if (!alive(q) || harLarm(s, q)) continue;
    const viaHund = hund?.p === q;
    if (!ser(q) && !viaHund) continue;
    if (viaHund && q.task?.act === 'sova') { avbryt(s, q); q.task = undefined; }
    if (f.sedd === undefined) { // den första som ser dem gissar hur många de är (sämre på långt håll)
      const n = f.folk.length, fel = ROVARE.gissFel * Math.min(1, narmast(s, f, q) / Math.max(1, synhall(s, f, q))) * (rnd(s, 'rovare') * 2 - 1);
      f.sedd = s.now; f.gissning = Math.max(1, Math.round(n * (1 + fel))); f.sx = f.x; f.sy = f.y; // där flocken sågs (steg 9.2.122)
      count(s, 'rovarSedda');
      const text = `${q.name} såg rövare ${f.anfaller ? 'på väg mot byn' : 'utanför byn'}, ungefär ${f.gissning} (${fran(s, f)}).`;
      log(s, text, 'world', [q.id]); notis(s, 'anfall', text, [q.id], { x: Math.floor(f.x), y: Math.floor(f.y) });
    }
    q.larm = { t: s.now, vad: 'rovare', storlek: f.gissning ?? f.folk.length, led: 0 };
    count(s, 'rovarSer');
    if (q.task && (q.task.act === 'vakt' || larmAvbryter(q.task.act, 'varg'))) { avbryt(s, q); q.task = undefined; } // hen väljer på nytt: först varnar hen (rovarSkydd)
  }
}
// Larmet: att varna är en handling (varna i handlingar.ts). Alla inom hörhåll (ROVARE.horhall, stort; hornet hörs över hela kartan)
// hör den som varnar, och var och en som hör varnar själv vidare, så att larmet sprider sig genom byn led för led. De vuxna som
// sover väcks; den som sover i ett hus och inte kan slåss sover vidare
function hors(s: State, fran: Person, r: number) {
  const horn = (s.ting ?? []).some(t => t.k === 'horn' && (t.hos === fran.id || t.agare === fran.id));
  const led = (fran.larm?.led ?? 0) + 1, st = fran.larm?.storlek ?? 1;
  let n = 0;
  for (const o of living(s)) {
    if (o === fran || harLarm(s, o) || horsel(o) < LARM.dov || (!horn && avst(o, fran) > r)) continue;
    o.larm = { t: s.now, vad: 'rovare', storlek: Math.max(1, Math.round(st * (1 + LARM.forvrang * (2 * rnd(s, 'rykte', o) - 1)))), led };
    think(o, 'Hörde rop: rövare', -LARM.oro, s.now, LARM.oroTim * HOUR);
    count(s, 'larm_hort'); n++;
    if (!o.task) continue;
    if (o.task.act === 'sova') { if (vuxenKan(s, o)) { avbryt(s, o); o.task = undefined; count(s, 'rovarVackt'); } continue; }
    if (o.task.act === 'vakt' || larmAvbryter(o.task.act, 'varg')) { avbryt(s, o); o.task = undefined; }
  }
  return n;
}
function varnaSteg(s: State, folk: Person[]) {
  for (const q of folk) {
    if (!alive(q) || q.task?.act !== 'varna' || !q.larm || q.larm.varnat) continue;
    q.larm.varnat = 1;
    const n = hors(s, q, ROVARE.horhall * (isLight(s.now) ? 1 : LARM.natt));
    count(s, 'rovarVarnar');
    if (q.larm.led === 0) log(s, `${q.name} varnade byn: rövare!${n ? ` ${stor(tal(n))} hörde det.` : ''}`, 'world', [q.id]);
  }
}
// gänget är inne i byns område eller alldeles utanför (för texterna)
const iByn = (s: State, f: Rovarflock) => Math.min(...rovarna(s, f).map(r => utanforByn(s, r.x, r.y))) < ROVARE.anfallUt;

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
    if (hors(s, b, hor)) count(s, 'rovarBarnRop');
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
      if (folk.some(q => q !== b && alive(q) && !harLarm(s, q) && avst(q, b) <= hor) && hors(s, b, hor)) count(s, 'rovarBudRop');
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
  // Vem som ställer sig i vägen (steg 10.1.13): modet, seden (Fejd och Krig drar till striden, och en fredlig by drar ifrån den),
  // den som har någon i byn att försvara, föräldern som hellre stannar hos sitt lilla barn, lagen om stridsplikt och ledaren man lyder
  const iver = ((s.seder.v.fejd ?? 0) + (s.seder.v.krig ?? 0)) * ROVARE.iver;
  const l = ledareOf(s), lyder = (s.seder.v.rang ?? 0) > ROVARE.lyder && l && l !== p ? ROVARE.lyderPlus : 0, plikt = lagGaller(s, 'stridsplikt') ? ROVARE.pliktPlus : 0;
  const nara = living(s).filter(q => q !== p && (q.id === p.partner || isParent(p, q)));
  const familj = nara.length ? ROVARE.familjPlus : 0, smabarn = nara.some(q => isParent(p, q) && ageOf(q, s.now) < ALDER.smabarn) ? ROVARE.smabarnMinus : 0;
  return stat(p, 'mod', s.now) / 20 + iver + lyder + plikt + familj - smabarn - ROVARE.skadad * (1 - halsa(p)) - (isSick(p, s.now) ? ROVARE.sjuk : 0) - (a >= ALDER.gammal ? ROVARE.gammal : 0);
}
export const rovarRoll = (v: number): 'kampe' | 'hjalpare' | 'gomd' => v >= ROVARE.kampeFran ? 'kampe' : v >= ROVARE.hjalpFran ? 'hjalpare' : 'gomd';
// rövarnas rad bland hoten (steg 9.5.19, roller.ts): viljan som den är, och rövarnas två gränser
viljaKrok.vilja = rovarVilja;
LARMHOT.rovare = { namn: 'Rövarna', plus: () => 0, kampe: () => ROVARE.kampeFran, hjalp: () => ROVARE.hjalpFran };
function rovarSkydd(s: State, p: Person, _storlek: number, dur: number) {
  // den som vet men inte varnat än varnar först (steg 10.1.12)
  if (p.larm?.vad === 'rovare' && !p.larm.varnat && vaken(p) && ageOf(p, s.now) >= ALDER.smabarn) return { act: 'varna' as const, why: 'Varnar för rövare', spot: { x: p.x, y: p.y }, dur: ROVARE.varnaSek * SEC };
  const bud = budFor(s, p);
  if (bud) return { act: 'budRovare' as const, why: `Rövare är nära, springer och hämtar ${bud.name}`, spot: { x: bud.x, y: bud.y }, dur };
  // rollen vid larmet (steg 9.5.19); den som nyss flytt eller gett upp i striden gömmer sig (steg 10.1.14)
  const roll = p.gavSig !== undefined && s.now - p.gavSig < ROVARE.gavSigTim * HOUR ? 'gomd' : rollVid(s, p, 'rovare');
  if (roll !== 'gomd') {
    // de gör sig redo i byn: kämparna vid förrådet med det vapen som finns, hjälparna en bit bakom. Den som ser rövarna går mot dem (flockVal)
    const m = malet(s), vinkel = (p.id * 2.399) % (2 * Math.PI), vapen = taVapen(s, p) ? 'ett vapen' : 'det som finns';
    const r = 1.5 + (p.id % 3) * 0.6 + (roll === 'kampe' ? 0 : ROVARE.bakom); // var och en på sin plats runt förrådet
    const spot = freeNear(s, m.x + Math.cos(vinkel) * r, m.y + Math.sin(vinkel) * r);
    return roll === 'kampe' ? { act: 'forsvarRovare' as const, why: `Rövare är nära, tar ${vapen} och väntar vid förrådet`, spot, dur } : { act: 'hjalpaRovare' as const, why: 'Rövare är nära, håller sig bakom kämparna vid förrådet', spot, dur };
  }
  if (p.task?.act === 'sova' && iHus(s, p)) return undefined;
  const hus = husPlats(s, p);
  return { act: 'gomma' as const, why: hus ? 'Rövare är nära, gömmer sig i huset' : 'Rövare är nära, håller sig vid elden nära de vuxna', spot: hus ?? skyddVidElden(s), dur };
}
setRovarVal(rovarSkydd);
setHotVilja(rovarVilja);

// ---------- rövarnas val (steg 10.1.9, 10.1.14 och 10.1.15; "Striden på kartan: Samma val för alla" i designdokumentet) ----------
// Varje rövare väljer vad hen gör på samma sätt som byborna väljer aktivitet: flocken har ett mål (ta byte, hämnas, heligt krig)
// och var och en väljer bland handlingarna i registret ROVARHANDLINGAR den med högst poäng, efter vad hen ser, hur hen mår och hur
// modig hen är. Det finns ingen fast följd av lägen: flockens läge (f.gor) är bara det de flesta gör just nu, för bilden och texterna.
//   - Rastplatsen: flocken kommer in från kanten och slår sig ner utanför byns område (f.rast). Där rastar de, går omkring och
//     pratar. Efter en väntan (ROVARE.lurMin och slumpen) går flocken till anfall (f.anfaller).
//   - Mötet: den som står emot och rövaren som kommer nära varandra (ROVARE.moter) börjar slåss, där de står, i en strid på kartan
//     (kartstrid.ts); de som kommer till ger sig in i samma strid. Om en rövare flyr avgörs av stridsmodet och hotet i striden och
//     av poängen för att fly här (blodet, hur många som står emot och hur många i flocken som är kvar).
//   - Plundringen: den som står vid en lagerplats där ingen står emot tar det mest värda, en sak i taget (ROVARE.taSek sekunder
//     per sak), och bär hem det när hen bär så mycket hen orkar eller inget mer finns.
export type RovarGor = 'tillRast' | 'rasta' | 'gaOmkring' | 'prata' | 'motMalet' | 'sla' | 'hota' | 'taBorda' | 'ta' | 'baraHem' | 'fly';
interface RCtx { ev?: TalkEvent[]; s: State; f: Rovarflock; r: Person; folk: Person[]; dt: number; mal: { x: number; y: number }; fiende?: Person; ivagen?: Person; // fiende = den närmaste som står emot, ivagen = en vuxen som inte står emot men står i vägen
  hot: number; last: number; kvar: number }
// den som står emot: väntar med vapen, håller vakt eller slåss
const starEmot = (q: Person) => forsvarar(q) || q.task?.act === 'vakt' || q.task?.act === 'strid';
// ... och kan det: frisk nog att slåss, och har inte nyss fallit, flytt eller gett upp i striden
const gavSigNyss = (s: State, q: Person) => q.gavSig !== undefined && s.now - q.gavSig < ROVARE.gavSigTim * HOUR;
const kanStaEmot = (s: State, q: Person) => starEmot(q) && vuxenKan(s, q) && !gavSigNyss(s, q);
// flockens strid på kartan, om den pågår
export const flockStrid = (s: State, f: Rovarflock) => kartStrider(s).find(g => g.efter?.typ === 'rovare' && g.efter.flock === f.id);
const iStriden = (s: State, f: Rovarflock, p: Person) => { const g = flockStrid(s, f); return !!g && !g.fri?.includes(p.id) && g.st.kampar.some(k => k.pid === p.id); };
// det rövaren bär av bytet, i vikt
const lastAv = (r: Person) => Object.entries(gr(r).bar ?? {}).reduce((a, [k, n]) => a + viktOf(k) * n, 0);
// lagerplatsen närmast rövaren där det ligger något att ta
function taPlats(s: State, r: Person) {
  let b: { x: number; y: number } | undefined, bd = Infinity;
  for (const z of zonesOf(s)) { if (!(s.stackar ?? []).some(a => a.x >= z.x && a.x < z.x + z.w && a.y >= z.y && a.y < z.y + z.h && a.n >= 1)) continue; const c = { x: z.x + z.w / 2, y: z.y + z.h / 2 }, d = avst(r, c); if (d < bd) { bd = d; b = c; } }
  return b;
}
// dit rövaren går när flocken anfaller: hämnden letar hus för hus (f.letar), annars den närmaste lagerplatsen med något i, annars förrådet
function malFor(s: State, f: Rovarflock, r: Person) {
  if (f.gor === 'letar' || f.letar?.length) { const h = f.letar?.length ? husById(s, f.letar[0]) : undefined; if (h) return { x: h.x + h.w / 2, y: h.y + h.h / 2 }; }
  return taPlats(s, r) ?? malet(s);
}
export const ROVARHANDLINGAR: Record<RovarGor, { namn: string; poang: (c: RCtx) => number; gor: (c: RCtx) => void }> = {
  // till rastplatsen utanför byn, innan flocken anfaller
  tillRast: { namn: 'Går mot rastplatsen', poang: c => !c.f.anfaller && c.f.rast && avst(c.r, c.f.rast) > ROVARE.rastR ? 1 : -1, gor: c => { ga(c, c.f.rast!); } },
  // på rastplatsen: vilar, går omkring lite och pratar med de andra
  // var och en vilar på sin egen plats runt rastplatsen, så att gänget sprider ut sig (steg 10.2.24)
  rasta: { namn: 'Rastar', poang: c => c.f.anfaller ? -1 : ROVARE.rastaPoang, gor: c => { const g = gr(c.r); if (!c.f.rast) return; g.vx ??= c.f.rast.x + (rnd(c.s, 'rovare') - 0.5) * 2 * ROVARE.rastR; g.vy ??= c.f.rast.y + (rnd(c.s, 'rovare') - 0.5) * 2 * ROVARE.rastR; if (avst(c.r, { x: g.vx, y: g.vy }) > 0.6) ga(c, { x: g.vx, y: g.vy }); } },
  gaOmkring: { namn: 'Går omkring', poang: c => c.f.anfaller || !c.f.rast ? -1 : ROVARE.gaPoang, gor: c => { const g = gr(c.r); g.vx ??= c.f.rast!.x + (rnd(c.s, 'rovare') - 0.5) * 2 * ROVARE.rastR; g.vy ??= c.f.rast!.y + (rnd(c.s, 'rovare') - 0.5) * 2 * ROVARE.rastR; if (ga(c, { x: g.vx, y: g.vy }) < 0.6) g.gorTill = 0; } },
  // pratar med den närmaste i gänget: går fram och samtalar i samma samtalssystem som byn, med pratbubbla (steg 10.2.24)
  prata: { namn: 'Pratar', poang: c => c.f.anfaller || c.kvar < 2 ? -1 : ROVARE.prataPoang, gor: c => {
    const o = rovarna(c.s, c.f).filter(q => q !== c.r).sort((a, b) => avst(a, c.r) - avst(b, c.r))[0];
    if (!o) return;
    if (avst(o, c.r) > 1.4) { ga(c, { x: o.x + 0.8, y: o.y }); return; }
    if (rnd(c.s, 'rovare') < c.dt / ROVARE.pratSek) rovarPrat.prata?.(c.s, c.r, o, c.ev); // ungefär ett samtal på pratSek sekunder
  } },
  // mot målet när flocken anfaller
  motMalet: { namn: 'Går mot byn', poang: c => c.f.anfaller && !gr(c.r).nojd && !c.f.klar && avst(c.r, c.mal) > ROVARE.nara ? 1 : -1, gor: c => { if (ga(c, c.mal) < 0) gr(c.r).flytt = true; } }, // ingen väg dit: hen ger upp
  // slår den som står i vägen: den som står emot inom ROVARE.moter. Modet drar till striden och övermakten från den
  // den som inte står emot men står i vägen slår bara den aggressiva, när inget annat lockar mer
  sla: { namn: 'Slåss', poang: c => c.fiende ? 1.5 + ROVARE.slaMod * (stat(c.r, 'mod', c.s.now) - 10) / 10 - ROVARE.slaHot * Math.max(0, c.hot - 1) : c.ivagen ? ROVARE.slaIvagen * stat(c.r, 'aggression', c.s.now) / 10 + rnd(c.s, 'rovare') * ROVARE.valBrus : -1, gor: c => slaSteg(c) },
  // mötet på vägen (steg 10.2.26): den som inte står emot men är nära kan hotas bort eller bli av med det hen bär, efter modet och
  // målet; annars går rövaren förbi mot byn. Slumpen (valBrus) gör att olika rövare väljer olika
  hota: { namn: 'Hotar', poang: c => c.ivagen && !c.fiende ? ROVARE.hotaPoang * stat(c.r, 'mod', c.s.now) / 10 + rnd(c.s, 'rovare') * ROVARE.valBrus : -1, gor: c => motet(c, false) },
  taBorda: { namn: 'Tar det hen bär', poang: c => c.ivagen && !c.fiende && !!c.ivagen.task && isCarrying(c.ivagen.task) ? ROVARE.taBordaPoang * (1 - c.last / ROVARE.bar) + rnd(c.s, 'rovare') * ROVARE.valBrus : -1, gor: c => motet(c, true) },
  // tar ur förrådet när ingen står emot i närheten
  ta: { namn: 'Tar ur förrådet', poang: c => c.f.anfaller && !c.fiende && !gr(c.r).nojd && avst(c.r, c.mal) <= ROVARE.nara + 0.5 && !c.f.klar ? 1.2 : -1, gor: c => taSteg(c) },
  // bär hem bytet
  // bär hem bytet: när hen tagit det hen orkar eller inget mer finns (nojd), när flocken är klar, eller när någon står emot och hen redan bär något
  baraHem: { namn: 'Bär hem bytet', poang: c => gr(c.r).nojd || c.f.klar || (c.last > 0 && !!c.fiende) ? 2 : -1, gor: c => hemat(c) },
  // flyr: blodet, övermakten hen ser, modet och hur många i flocken som är kvar
  fly: { namn: 'Flyr', poang: c => (gr(c.r).flytt ? 3 : -0.6) + ROVARE.flyBlod * (1 - c.r.blod) + ROVARE.flyHot * Math.max(0, c.hot - 1) * (1 - (stat(c.r, 'mod', c.s.now) - 10) / 10) + ROVARE.flyDoda * (1 - c.kvar / Math.max(1, c.f.antal ?? c.kvar)), gor: c => { gr(c.r).flytt = true; hemat(c); } },
};
const RGOR = Object.keys(ROVARHANDLINGAR) as RovarGor[];
// går mot punkten, i en bybos fart med samma vägsökning. Svarar hur långt det är kvar, −1 när det inte finns någon väg
// var och en går mot sin egen plats i klungan runt målet, så att de inte står på samma punkt
function ga(c: RCtx, m: { x: number; y: number }) {
  // var och en går sin egen väg bredvid de andra (steg 10.2.25): mot en egen punkt kring målet, lite olika fort, och inte i
  // rutan där en annan i gänget redan står
  const [dx, dy] = egenPunkt(c.r), k = { x: clamp(m.x + dx, 0.3, W - 0.3), y: clamp(m.y + dy, 0.3, H - 0.3) };
  const upptagen = rovarna(c.s, c.f).some(o => o !== c.r && tileOf(o.x!, o.y!) === tileOf(k.x, k.y));
  const fri = !upptagen && !iVatten(c.s, k.x, k.y) && !bitAt(c.s, k.x, k.y) ? gaMot(c.s, c.r, k.x, k.y, c.dt, c.s.now - c.dt * SEC, egenFart(c.r)) : -1;
  return fri >= 0 ? fri : gaMot(c.s, c.r, m.x, m.y, c.dt, c.s.now - c.dt * SEC, egenFart(c.r)); // ingen väg till den egna punkten: rakt mot målet
}
// rövarens egen punkt kring det gänget går mot (upp till ROVARE.bredvid rutor åt sidan) och egen fart (ROVARE.fartSpann), fasta för var och en
const egenPunkt = (r: Person): [number, number] => { const v = hash3(r.id, 11, 0) * Math.PI * 2, d = ROVARE.bredvid * (0.4 + 0.6 * hash3(r.id, 12, 0)); return [Math.cos(v) * d, Math.sin(v) * d]; };
const sidaOm = (r: Person) => (gr(r).fil ?? (hash3(r.id, 14, 0) - 0.5) * 2) * ROVARE.filBredd; // rutor åt sidan om vägen: var och en sin fil
const egenFart = (r: Person) => 1 + (hash3(r.id, 13, 0) - 0.5) * 2 * ROVARE.fartSpann;
// mot närmaste kanten; den som kommer dit är borta från kartan, hem till klanen (steg 9.2.114)
function hemat(c: RCtx) {
  const { s, f, r } = c;
  // vägen ut väljs en gång (den närmaste kanten som går att nå) och hålls sedan: annars byter hen kant fram och tillbaka vid en sjö,
  // där det finns väg till den närmaste kanten från en ruta men inte från nästa
  const g = gr(r);
  let kvar = g.ut ? ga(c, g.ut) : -1;
  if (kvar < 0) { g.ut = undefined; for (const k of kanterna(r.x, r.y)) { kvar = ga(c, k); if (kvar >= 0) { g.ut = k; break; } } }
  if (f.rad) iFarten(s, r, c.dt); // saker i farten (steg 8.8.3)
  if (kvar >= 0.5) return;
  f.folk = f.folk.filter(id => id !== r.id);
  gastGar(s, r.id, true);
}
// mötet (steg 10.1.14): striden börjar där de möts, och den som redan pågår får en till
// rövaren går fram till den hen mött på vägen och hotar hen bort eller tar det hen bär (steg 10.2.26). Den som hotas ger upp
// en stund (gavSig) och väljer på nytt: hen varnar och går undan
function motet(c: RCtx, ta: boolean) {
  const { s, r } = c, q = c.ivagen!, g = gr(r);
  if (avst(q, r) > 1.5) { ga(c, { x: q.x, y: q.y }); return; }
  if (ta && q.task && isCarrying(q.task)) {
    const k = carryKind(q.task.act), n = Math.floor(q.task.carry + 1e-9), bar = (g.bar ??= {});
    if (k && n >= 1) bar[k] = (bar[k] ?? 0) + n;
    for (const [kk, m] of Object.entries(q.task.items ?? {})) if (m >= 1) bar[kk] = (bar[kk] ?? 0) + Math.floor(m);
    q.task.carry = 0; q.task.items = undefined; count(s, 'rovarTogBorda');
    log(s, `En rövare tog det ${q.name} bar.`, 'world', [q.id]);
  } else count(s, 'rovarHotade');
  think(q, 'Hotades av rövare', -0.15, s.now, 6 * HOUR);
  q.gavSig = s.now; avbryt(s, q); q.task = undefined;
  g.gorTill = 0;
}
function slaSteg(c: RCtx) {
  const { s, f, r } = c, g = flockStrid(s, f);
  if (g) { kartStridMed(s, g, r, 1); return; }
  const mot = c.folk.filter(q => alive(q) && vaken(q) && q.task?.act !== 'strid' && (q === (c.fiende ?? c.ivagen) || (kanStaEmot(s, q) && avst(q, r) < ROVARE.moter + 2)));
  const rov = rovarna(s, f).filter(q => q === r || (avst(q, r) < ROVARE.moter + 2 && !gr(q).flytt));
  if (!mot.length) return;
  for (const p of mot) taVapen(s, p); // var och en tar det bästa lediga vapnet, sitt eget eller byns (vakt.ts)
  if (f.sedd === undefined) { f.sedd = s.now; f.gissning = f.folk.length; f.sx = f.x; f.sy = f.y; } // en flock som ingen sett är sedd när striden börjar
  const ny = kartStridBorja(s, 'skada', [mot, rov], f.anfall ? 'rövare i byn' : 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id });
  for (const k of ny.st.kampar) { const p = k.pid !== undefined ? byId(s, k.pid) : undefined; if (p && !p.gast) k.st.mod += 20 * overtygelse(s, f, p); if (p?.gast && f.mal !== undefined) k.jagar = f.mal; } // övertygelsen (steg 8.8.8), och hämnden riktar sig mot målet (steg 8.8.5)
  f.strider = (f.strider ?? 0) + 1;
  count(s, 'rovarStrid');
  for (const p of mot) { p.larm = { t: s.now, vad: 'rovare', storlek: f.gissning ?? f.folk.length, led: p.larm?.led ?? 0, varnat: 1 }; hors(s, p, LARM.hor * (isLight(s.now) ? 1 : LARM.natt)); } // striden hörs: de som slåss ropar
  count(s, 'rovarStridRop');
}
// plundringen (steg 10.1.15): en sak i taget ur lagerplatsen hen står vid, det med högst pris per vikt först
function taSteg(c: RCtx) {
  const { s, f, r } = c, g = gr(r);
  // hämnden och det heliga kriget (rader.ts): när flocken är framme och ingen står emot gör den det den kom för, en gång
  if (f.skal && !f.radKlar) { f.radKlar = true; if (radSeger(s, f)) { if ((f.gor as string) !== 'letar') { tandaHus(s, f); f.klar = true; } return; } }
  if (f.gor === 'letar' || f.letar?.length) { letaSteg(s, f, c.folk); return; }
  if (huggDorr(s, f, c.folk)) return; // en stängd dörr huggs sönder (steg 8.9.1–8.9.2)
  g.taTid = (g.taTid ?? 0) + c.dt;
  while (g.taTid >= ROVARE.taSek) {
    g.taTid -= ROVARE.taSek;
    if (!taEn(s, f, r)) { // hen orkar inte bära mer, eller inget mer finns: hen är nöjd och bär hem. När alla är det är plundringen klar
      g.nojd = true; g.taTid = 0;
      if (rovarna(s, f).every(q => gr(q).nojd || gr(q).flytt)) taKlart(s, f);
      return;
    }
  }
}
// rövaren tar en sak: det dyraste per vikt som hen orkar bära, redskapen inräknade (steg 8.7.16). Svarar om något togs
function taEn(s: State, f: Rovarflock, r: Person) {
  const gavUpp = living(s).some(p => p.task?.act === 'fly' && ageOf(p, s.now) >= ALDER.vuxen); // att fly är att ge upp (steg 8.7.17)
  const bar = ROVARE.bar * (gavUpp ? ROVARE.gerUpp : 1), vikt = lastAv(r);
  const fritt = (k: string) => tingOf(s).find(q => q.k === k && q.bar === undefined && q.hos === undefined && q.lass === undefined);
  const k = SAK_LIST.filter(q => vikt + viktOf(q) <= bar && (SAKER[q]!.redskap ? !!fritt(q) : amountOf(s, q) >= 1)).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a)))[0];
  if (!k) return false;
  if (SAKER[k]!.redskap) { const t = fritt(k)!; s.ting = s.ting!.filter(q => q !== t); } else addTo(s, k, -1);
  (gr(r).bar ??= {})[k] = (gr(r).bar![k] ?? 0) + 1;
  (f.tagit ??= {})[k] = (f.tagit[k] ?? 0) + 1;
  count(s, 'rovat');
  return true;
}
// flocken har tagit det den vill: en rad om det, boskapen drivs bort, kanske tänds ett hus, och sedan bär de hem
export function taKlart(s: State, f: Rovarflock) {
  if (f.klar) return;
  f.klar = true;
  const drev: string[] = []; // boskapen (steg 9.8.12): varje rövare driver bort ett får eller en get som står ute, det närmaste först
  for (const _r of rovarna(s, f)) { const d = tamUte(s).filter(q => avst(q, f) < ROVARE.boskapR).sort((a, b) => avst(a, f) - avst(b, f))[0]; if (!d) break; tamStulen(s, d); drev.push(tamArt(d.art).ord[1]); }
  const tagna = f.tagit ?? {}, tog = Object.values(tagna).reduce((a, b) => a + b, 0) + drev.length, tyst = f.sedd === undefined;
  const tog_ = [...SAK_LIST.filter(k => tagna[k]).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a))).map(k => antal(tagna[k], k)), ...(drev.length ? [`${drev.length === 1 ? 'ett djur' : `${drev.length} djur`} (${och(drev)})`] : [])];
  count(s, 'rovarPlundring'); if (tyst) count(s, 'rovarTyst');
  const text = tog ? `Rövare ${fran(s, f)} ${tyst ? 'smög in i byn osedda och ' : ''}tog ${och(tog_)} ur förrådet.` : `Rövare ${fran(s, f)} kom till förrådet men hittade inget att ta.`;
  log(s, text, 'world'); if (tog) { notis(s, 'motgang', text); kronika(s, text, 'rovare'); }
  tandaHus(s, f); // (steg 8.9.3)
}
// hämnden letar hus för hus (steg 8.8.5): flocken går till husen i tur och ordning, närmast först. Är den de söker där, eller
// kommer de nära hen, hittas hen. När alla hus är genomsökta ger de sig av
function letaSteg(s: State, f: Rovarflock, folk: Person[]) {
  const m = byId(s, f.mal ?? -1);
  if (!m || !alive(m) || avst(f, m) <= RADER.hittaNara) { hamndKlar(s, f, m, !!m && alive(m)); tandaHus(s, f); f.klar = true; f.letar = undefined; f.gor = 'flyr'; return; }
  const h = f.letar?.length ? husById(s, f.letar[0]) : undefined;
  if (!h) { if (f.letar?.length) { f.letar.shift(); return; } hamndKlar(s, f, m, false); f.klar = true; f.letar = undefined; f.gor = 'flyr'; return; }
  if (avst(f, { x: h.x + h.w / 2, y: h.y + h.h / 2 }) > ROVARE.nara + 1) return; // inte framme än (motMalet går dit)
  const inne = roomAt(s, m.x, m.y)?.hus === h.id;
  // är hen inne bakom en stängd dörr hugger de sig in (steg 8.9.1–8.9.2), långsammare om dörren är bommad
  const dorr = inne ? bitsOf(s).find(b => b.hus === h.id && b.dorr && (DORRAR as Record<string, { stanger?: boolean }>)[b.dorr]?.stanger) : undefined;
  if ((f.hugger || dorr) && huggDorr(s, f, folk, dorr)) return;
  if (inne) { hamndKlar(s, f, m, true); tandaHus(s, f); f.klar = true; f.letar = undefined; f.gor = 'flyr'; return; }
  f.letar!.shift();
}
// hotet rövaren ser: de som står emot inom synhåll (KLOCKA.faraSyn), mot rövarna i flocken som är med (var och en räknad med sitt vapen)
function hotMot(s: State, f: Rovarflock, r: Person, folk: Person[]) {
  const kraft = (p: Person) => 1 + ROVARE.hotVapen * VAPEN[personKampe(s, p, 0, 0, 0, 0).vapen].skada;
  const de = folk.filter(q => alive(q) && kanStaEmot(s, q) && avst(q, r) < KLOCKA.faraSyn).reduce((a, q) => a + kraft(q), 0);
  const vi = rovarna(s, f).filter(q => !gr(q).flytt && avst(q, r) < KLOCKA.faraSyn).reduce((a, q) => a + kraft(q), 0);
  return de / Math.max(0.5, vi);
}
// flocken väljer och gör: var och en för sig
// samtalet mellan två rövare (samtal.ts, satt i steg.ts så att filerna inte importerar varandra)
export const rovarPrat: { prata?: (s: State, a: Person, b: Person, ev?: TalkEvent[]) => void } = {};
function flockVal(s: State, f: Rovarflock, folk: Person[], dtSec: number, ev?: TalkEvent[]) {
  f.antal ??= f.folk.length;
  // rastplatsen (steg 10.1.9): utanför byns område på vägen mot förrådet; väntan börjar när den första är framme
  if (!f.rast) { const m = malet(s); f.rast = lurPlats(s, f, m) ?? { x: f.x, y: f.y }; f.vantat = false; }
  const fo = rovarna(s, f);
  if (!f.anfaller) {
    if (!f.vantat && fo.some(r => avst(r, f.rast!) <= ROVARE.rastR)) { f.vantat = true; f.till = s.now + (f.test ? ROVARE.testVanta : mellan(s, ROVARE.lurMin)) * MIN; }
    if (f.vantat && s.now >= f.till) { f.anfaller = true; count(s, 'rovarGarTill'); }
    if (f.vantat && f.sedd !== undefined) budSteg(s, f, folk);
  }
  // de som står emot och är nära en rövare som slåss ger sig in i striden (steg 10.1.14)
  const strid = flockStrid(s, f);
  if (strid) for (const q of folk) {
    if (!alive(q) || !vaken(q) || q.task?.act === 'strid' || !(forsvarar(q) || q.task?.act === 'vakt') || !vuxenKan(s, q)) continue;
    if (strid.st.kampar.some(k => k.lage === 'strid' && Math.hypot(k.x - q.x, k.y - q.y) < ROVARE.moter)) { taVapen(s, q); kartStridMed(s, strid, q, 0); }
  }
  // den som står emot går mot de rövare hen vet om (steg 10.2.27): de hen ser (inom synhåll) går hen mot, och vet hen om dem genom
  // larmet går hen dit de är på väg, också till en lagerplats i byns utkant. När de är nära varandra börjar striden, var de än är
  for (const q of folk) {
    if (!alive(q) || !vaken(q) || q.task?.act !== 'forsvarRovare' || !kanStaEmot(s, q)) continue;
    const r = [...fo].sort((a, b) => avst(a, q) - avst(b, q))[0];
    if (!r) continue;
    const ser = avst(r, q) <= KLOCKA.faraSyn, vet = ser || (q.larm?.vad === 'rovare' && s.now - q.larm.t < ROVARE.larmTim * HOUR);
    if (!vet) continue;
    if (avst(r, q) < ROVARE.moter && !flockStrid(s, f)) { slaSteg({ s, f, r, folk, dt: dtSec, mal: r, fiende: q, hot: 1, last: 0, kvar: f.folk.length }); continue; }
    const tk = q.task!, m = ser ? r : (f.anfaller ? malFor(s, f, r) : r);
    if (Math.hypot(tk.tx - m.x, tk.ty - m.y) > 1.5) { tk.tx = m.x; tk.ty = m.y; tk.phase = 'go'; tk.path = undefined; tk.pk = undefined; tk.why = ser ? 'Rövarna är här, går mot dem' : 'Går dit rövarna är på väg'; }
  }
  const lagen: Record<string, number> = {};
  for (const r of fo) {
    if (iStriden(s, f, r)) { lagen.sla = (lagen.sla ?? 0) + 1; gr(r).gor = 'sla'; gr(r).varStrid = true; continue; } // striden på kartan för hen
    const g = gr(r);
    if (g.varStrid && !g.flytt) { const st = flockStrid(s, f); if (!st || st.fri?.includes(r.id)) { if (st?.fri?.includes(r.id)) g.flytt = true; g.varStrid = undefined; } } // den som flytt ur striden flyr
    const narmast1 = (l: Person[]) => l.sort((a, b) => avst(a, r) - avst(b, r))[0];
    const fiende = narmast1(folk.filter(q => alive(q) && vaken(q) && kanStaEmot(s, q) && avst(q, r) < ROVARE.moter));
    const ivagen = fiende ? undefined : narmast1(folk.filter(q => alive(q) && vaken(q) && !starEmot(q) && !gavSigNyss(s, q) && kanGa(q) && ageOf(q, s.now) >= ALDER.vuxen && avst(q, r) < ROVARE.moter)); // den som rövaren ser på vägen (steg 10.2.26)
    const c: RCtx = { ev, s, f, r, folk, dt: dtSec, mal: malFor(s, f, r), fiende, ivagen, hot: hotMot(s, f, r, folk), last: lastAv(r), kvar: f.folk.length };
    // valet: högst poäng, och det hen redan gör har ett litet försteg; en vila eller en promenad på rastplatsen varar en stund
    let bast: RovarGor = 'rasta', bp = -Infinity;
    const lugn = g.gor === 'rasta' || g.gor === 'gaOmkring' || g.gor === 'prata';
    for (const k of RGOR) {
      let p = ROVARHANDLINGAR[k].poang(c);
      if (p < 0 && k !== 'fly') continue;
      if (k === g.gor && (!lugn || s.now < (g.gorTill ?? 0))) p += ROVARE.valKvar;
      else if (k === 'rasta' || k === 'gaOmkring' || k === 'prata') p += rnd(s, 'rovare') * ROVARE.valBrus;
      if (p > bp) { bp = p; bast = k; }
    }
    if (bast !== g.gor) { g.gor = bast; g.gorTill = s.now + mellan(s, ROVARE.rastSek) * SEC; g.vx = undefined; g.vy = undefined; g.taTid = 0; }
    lagen[bast] = (lagen[bast] ?? 0) + 1;
    ROVARHANDLINGAR[bast].gor(c);
    if (bast === 'sla') g.varStrid = true;
  }
  // flockens läge, för bilden och texterna: det de flesta gör
  const kvar = rovarna(s, f);
  if (kvar.length) { f.x = kvar.reduce((a, r) => a + r.x!, 0) / kvar.length; f.y = kvar.reduce((a, r) => a + r.y!, 0) / kvar.length; } else count(s, 'rovarBorta'); // flockens plats är mitten av gänget (steg 10.2.25)
  const mest = (ks: string[]) => ks.reduce((a, k) => a + (lagen[k] ?? 0), 0);
  if ((f.gor as string) !== 'letar' || f.klar) f.gor = !kvar.length || mest(['fly', 'baraHem']) >= kvar.length ? 'flyr' : flockStrid(s, f) ? 'slass' : mest(['ta']) ? 'rotar' : f.anfaller ? 'kommer' : f.vantat ? 'vantar' : 'kommer';
}
// striden med rövarna är slut (EFTER i efterstrid.ts): raden om den, klanen och tankarna. Såren och de döda är redan på riktigt
EFTER.rovare = (s, e, vinnare, strid) => {
  const g = strid as KartStrid, st = g.st, f = flockar(s).find(q => q.id === e.flock);
  const bybor = st.kampar.filter(k => k.sida === 0).map(k => ({ k, p: k.pid !== undefined ? byId(s, k.pid) : undefined })), rov = st.kampar.filter(k => k.sida === 1);
  const doda = rov.filter(k => k.lage === 'dod').length, svara: string[] = [];
  for (const { k, p } of bybor) {
    if (!p || !alive(p)) continue;
    if (f && k.lage === 'ger') svarTrohet(s, f, p); // heligt krig (steg 8.8.6)
    if (k.lage !== 'strid') p.gavSig = s.now; // den som fallit, flytt eller gett upp ställer sig inte i vägen igen
    slitKastat(s, p, st, k);
    if (svartSkadad(k)) svara.push(p.name);
    ovning(p, 'narstrid', SLAGSMAL.ovning);
    think(p, vinnare === 0 ? 'Drev bort rövarna' : 'Slogs med rövare', vinnare === 0 ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
  }
  const forst = bybor[0]?.k;
  if (forst) blodas(s, forst.x, forst.y, 'jakt', 1);
  const namn = lista(bybor.map(b => b.k.namn)), n = rov.length;
  const dodaBybor = bybor.filter(b => b.k.lage === 'dod').map(b => b.k.namn);
  const text = `${namn} slogs med ${tal(n)} rövare ${f ? fran(s, f) : ''} ${f?.anfall ? 'i byn' : 'vid byn'}. ${doda ? `${stor(tal(doda))} rövare dog. ` : ''}${dodaBybor.length ? `${lista(dodaBybor)} dog. ` : ''}${vinnare === 1 ? 'Rövarna vann.' : vinnare === 0 ? 'Rövarna flydde.' : 'Ingen vann.'}${svara.length ? ` ${lista(svara)} skadades svårt.` : ''}`.replace(/ +/g, ' ');
  const ids = bybor.map(b => b.k.pid!).filter(x => x !== undefined), plats = forst ? { x: Math.floor(forst.x), y: Math.floor(forst.y) } : undefined;
  log(s, text, 'world', ids); notis(s, 'strid', text, ids, plats);
  kronika(s, text, 'rovare');
  if (f && vinnare === 0) for (const r of rovarna(s, f)) gr(r).flytt = true; // den slagna flocken flyr
};
// en rövare dör i striden (gastKrok i efterstrid.ts): hen ligger kvar med det hen bar, klanen minns det och blir ovänligare
gastKrok.dod = (s, r, av) => {
  const f = flockar(s).find(q => q.folk.includes(r.id));
  if (!f) return;
  count(s, 'rovarDoda');
  fallenFiende(s, r, r.x, r.y);
  klanMinns(s, f, r, av && !av.gast ? av.id : undefined);
  const k = klanById(s, f.klan); if (k) andraInst(k, -ROVARE.fiende);
  r.died = s.now; r.cause = 'i en strid';
  f.folk = f.folk.filter(id => id !== r.id);
  gastGar(s, r.id);
};
gastKrok.spara = (s, r) => spara(s, r, s.now);
// rövare och bybor som kan nå varandra under ett slag, plus synhållet: då går byn i korta steg (FAROR i efterstrid.ts, kanNa i klocka.ts)
// (också medan byn vet om ett gäng som väntar: larmet går led för led och budbäraren springer, och det ska inte ta fem minuter per led)
FAROR.push(s => flockar(s).some(f => f.folk.length > 0 && (!!f.anfaller || (f.sedd !== undefined && !f.klar) || rovarna(s, f).some(r => living(s).some(q => kanNa(avst(q, r), GANG.fart, GANG.fart))))));
// den fallne ligger kvar med det hen hade, tills någon avrustar hen (steg 8.7.5)
function fallenFiende(s: State, r: Person, x: number, y: number) {
  const g = gr(r), saker: Record<string, number> = { ...g.bar };
  g.bar = undefined;
  kvarlevor(s).push({ id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k: 'fiende', x: Math.floor(x), y: Math.floor(y), t: s.now, vem: -1, namn: r.name, text: r.name, saker });
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
  { const g = flockStrid(s, f); if (g) for (const k of g.st.kampar) if (k.lage === 'strid') k.lage = 'ger'; } // striden med byn tar slut: rövarna har flugit iväg
  for (const q of rovarna(s, f)) gr(q).flytt = true;
  f.gor = 'flyr';
  const doda = fore - f.folk.length;
  log(s, doda === fore ? `Tornadon dödade rövarna ${fran(s, f)}.` : `Tornadon kastade rövarna ${fran(s, f)} åt sidan${doda ? ` och ${doda} dog` : ''}. De flyr.`, 'world');
  if (!f.folk.length && s.rovare === f) s.rovare = undefined; // en tom flock bland de andra sållas bort i rovarSteg
}

// varje slag (steg.ts): en flock kommer, ses, går in mot byn och flyr
export function rovarSteg(s: State, dtSec: number, ev?: TalkEvent[]) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme && Math.floor(s.now / HOUR) % 24 === 12) radDygn(s); // räderna (steg 8.8.1)
  if (nyTimme) rovarnaKommer(s);
  if (!s.rovare && !s.rovareFler?.length) return;
  // alla flockar på kartan går samtidigt (steg 8.7.18): den första (s.rovare) och de som kom medan den var här (rovareFler).
  // Var och en har sin egen strid; den som redan slåss i en strid ger sig inte in i en annan
  const folk = living(s);
  for (const f of [s.rovare, ...(s.rovareFler ?? [])]) {
    if (!f) continue;
    if (f.folk.length) { facklaSteg(s, f); seSteg(s, f, folk); f.anfall = iByn(s, f); } // facklan på natten, och var och en som har gänget inom synhåll ser det
    if (f.folk.length) flockVal(s, f, folk, dtSec, ev);
  }
  varnaSteg(s, folk); // de som varnar hörs, och larmet sprids led för led (steg 10.1.12)
  if ([s.rovare, ...(s.rovareFler ?? [])].some(f => f && f.sedd !== undefined && f.gor !== 'flyr')) barnRop(s, folk);
  if (s.rovare && !s.rovare.folk.length) s.rovare = undefined;
  if (s.rovareFler) { s.rovareFler = s.rovareFler.filter(q => q.folk.length); if (!s.rovare) s.rovare = s.rovareFler.shift(); if (!s.rovareFler.length) s.rovareFler = undefined; }
  // möts flockar från klaner som inte tycker om varandra slåss de
  if (nyTimme && s.rovare) for (const o of s.rovareFler ?? []) flockarMots(s, s.rovare, o);
  if (nyTimme) for (const f of [s.rovare, ...(s.rovareFler ?? [])]) if (f) djurMotRovare(s, f);
}
// två flockar från klaner som inte tycker om varandra: en strid mellan tre parter. Den svagaste flocken flyr
function flockarMots(s: State, a: Rovarflock, b: Rovarflock) {
  if (a.klan === b.klan || avst(a, b) > ROVARE.flockarMots || flockStrid(s, a) || flockStrid(s, b)) return; // inte medan en av dem slåss med byn
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
  if (flockStrid(s, f)) return; // inte mitt i striden med byn
  for (const d of vargarNara(s, f)) {
    const r = gastAv(s, f.folk[0] ?? 0); if (!r || rnd(s, 'rovare') >= ROVARE.djurChans) continue;
    r.blod = Math.max(0, r.blod - 0.3); count(s, 'djurMotRovare');
    if (r.blod <= 0.1) { f.folk.shift(); tappar(s, r); gastGar(s, r.id); log(s, `${d} tog en av rövarna.`, 'world'); }
  }
}
const vargarNara = (s: State, f: Rovarflock) => bjornarOf(s, s.now).filter(d => d.art === 'bjorn').concat(vargarOf(s) as never).filter(d => Math.hypot(d.x - f.x, d.y - f.y) < ROVARE.djurR).map(d => d.art === 'bjorn' ? 'En björn' : 'En varg'); // björnungarna anfaller inte
// slaget hålls kort medan ett gäng är på kartan (klocka.ts, steg 10.2.14)
SLAGHINDER.push(s => flockar(s).some(f => f.folk.length > 0) ? KLOCKA.slag : undefined);
