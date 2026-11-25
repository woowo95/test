import { antal, lista, och, stor, tal } from './ord';
import { kartaBorta, larOrt, rovareSedda, gastensPlatser } from './ort';
import { SKRIFT } from './skriftTal';
import { runtByn, utanforByn } from './omrade';
import { balans } from './balans';
import { KLOCKA, SLAGHINDER, kanNa } from './klocka';
import { blodas } from './blod';
import { isParent, ALDER, KROPP, ageOf, alive, byId, count, isSick, living, log, makeName, stat } from './folk';
import { halsa, horsel, kanGa } from './halsa';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { Klan, klanById, klanerOf } from './klaner';
import { klanHandelse } from './byrel';
import { kantMot } from './grannbyar';
import { addTo, amountOf, avbryt, carryKind, dropLoad, isCarrying, zoneAt, zoneOf, zonesOf } from './lager';
import { hundSkaller, tamArt, tamStulen, tamUte } from './tamdjur';
import { DORRAR, bitAt, bitsOf, freeNear, isWall, husById, roomAt } from './byggnad';
import { LARM, handelse, horLarm } from './rykten';
import { SAKER, SAK_LIST } from './saker';
import { vattenNu } from './sjo';
import { avst, clamp, hash3, rnd } from './slump';
import { STRID, VAPEN, personKampe, efterKampen, harSlagits, type Kampe } from './strid';
import { isLight, lightLevel } from './tid';
import { larmAvbryter } from './handlingar';
import { lagGaller } from './lagar';
import { ledareOf } from './styre';
import { DAY, HOUR, MIN, Person, SEC, State, T, Task, W, H, inMap } from './typer';
import { vaderNu } from './vader';
import { grundvarde } from './varde';
import { gomSig, iHus, kanterna, setRovarVal, vargIStrid, vargStrid } from './varg';
import { bastaVapen, taVapen } from './vakt';
import { foddNar, gastNyckel } from './gastliv';
import { gastAv, gastAvvapna, gastGar, gastTillbaka, gastTingOf, gasterNu, nyGast, nyttGastId } from './gast';
import { brytKlar, fangeVal, fangelseDorr, fangelseLedigt, satt as sattIFangelset } from './fangelse';
import { notis } from './notiser';
import type { TalkEvent } from './samtal';
import { groundOf, isForest, tileOf } from './mark';
import { findPath, markFart } from './vag';
import { GANG } from './gang';
import { Grav, kvarlevor } from './kvarlevor';
import { RADER, hamndKlar, huggDorr, iFarten, klanMinns, overtygelse, radSeger, svarTrohet, tandaHus } from './rader';
import { bjornarOf } from './djur';
import { bjornStrid } from './bjorn';
import { tingOf, type Ting } from './agande';
import { viktOf } from './saker';
import { LARMHOT, hotKrok, larmBleknar, larmGaller, nyttILarmet, rollVid, viljaKrok } from './roller';
import { KartStrid, djurIKartStrid, kartStridBorja, kartStridMed, kartStrider } from './kartstrid';
import { EFTER, FAROR, MED, gastKrok } from './efterstrid';
import { tanke } from './tankar';
import { forlustFore, forlustEfter } from './tankelage';
import { allaBarn } from './uppvaxt';
import { kronikaBer } from './berattelser';
import { glesPlats } from './trangsel';

// ---------- rövarflocken (steg 4.4.5, Striden på kartan i designdokumentet) ----------
// När världen skickar dem (radanfall.ts, steg 11.6.20) kommer ett gäng rövare: folk från en grannklan som inte
// tycker om byn (klaner.ts), annars fredlösa utan klan. Rövarna är människor (gäster, gast.ts) med kropp, sår och vapen. Gänget
// går in från kartans kant till en rastplats utanför byn, där var och en vilar, går omkring och pratar, och går sedan mot byn.
// Gänget har ingen ledare: alla har samma mål och var och en går sin egen väg bredvid de andra. Var och en väljer vad hen gör ur
// registret ROVARHANDLINGAR med poäng (Samma val för alla); det finns ingen fast följd av lägen, och flockens läge (f.gor) är
// bara det de flesta gör, för texterna. Den som ser dem varnar, och byn gör sig redo (rovarSkydd, roller.ts). Striderna, med
// byn, med djuren och med andra gäng, sker på kartan (kartstrid.ts). Rövarna tar det mest värda tills de bär så mycket de orkar
// och går hem. Allt stegas likadant i båda lägena med byns följd 'rovare'.
export const ROVARE = balans('rovare', {
  vilaDygn: 6, // så många dygn efter en flock kommer ingen ny
  antal: [2, 5], // så många rövare (minst, högst)
  lur: 30, // flocken stannar så här många rutor från förrådet och väntar (lurMin minuter) när alla kommit fram, innan den går till anfall (steg 6.6.9 och B.27) ...
  lurMin: [1, 5], // ... minst, högst
  vaktSer: 90, folkSer: 45, nattSer: 0.3, dimmaSer: 0.5, // vakten ser rövare inom så här många rutor (steg 10.2.97: också gänget på rastplatsen på andra sidan byn), andra inom folkSer, gånger nattSer i mörkret
  gissFel: 0.5, // vaktens gissning av antalet: fel med upp till så här stor del, gånger avståndet / vaktSer (andra gissar som på längsta avståndet)
  bredvid: 2, // var och en går mot en egen punkt upp till så här många rutor från gängets mål (steg 10.2.25) ...
  filBredd: 1.1, // ... och går en egen fil så här många rutor från de andras
  vagSok: 30, vagFlytt: 3, // en väg som inte gick att hitta söks igen efter så här många sekunder, och vägen behålls när målet flyttat sig högst så här många rutor
  fartSpann: 0.08, // ... och upp till så här mycket långsammare än en bybo
  taUt: 4, taProv: 12, // platsen att ta ur förrådet från söks så här många rutor från målet, och så många av de närmaste lediga prövas (steg B.58)
  nara: 1.5, // rövarna är framme vid förrådet så här nära
  // rövarnas val (steg 10.1.9–10.1.15, ROVARHANDLINGAR)
  isKostnad: 5, // den som hamnat på vattnet (isen) går därifrån över det: så mycket kostar en sådan ruta i vägsökningen (steg B.43)
  utanVag: 10, // den som anfaller och inte hittar någon väg till målet står kvar och prövar igen, och ger upp efter så här många minuter (steg B.43)
  stillSek: 60, // gänget väntar inte på den som stått still så här länge på väg till rastplatsen (steg B.44)
  rastR: 3, // rastplatsen: så här nära mitten håller de sig, och så långt går den som går omkring
  rastaPoang: 0.35, gaPoang: 0.2, prataPoang: 0.38, // poängen för att vila, gå omkring och prata på rastplatsen (steg 10.2.24: vilan vann nästan alltid med 0,5; steg 10.2.94: mer prat, mindre gång)
  sparEfter: 0.15, // bilden: det som flyttar rövaren efter en gång som redan sparats till samma tid visas så här många sekunder senare (steg 10.2.96)
  pratSek: 15, // den som pratar samtalar ungefär en gång på så här många sekunder (snart när två står bredvid varandra, steg 10.2.94)
  rastSek: [20, 90], // en vila, en promenad eller ett samtal på rastplatsen varar så här många sekunder
  valKvar: 0.2, valBrus: 0.3, // det hen redan gör har så här mycket försteg i valet, och vilan, promenaden och samtalet slumpas med så här mycket
  horhall: 30, // den som varnar hörs så här många rutor (gånger LARM.natt på natten): hörhållet är stort (steg 10.1.12) ...
  varnaSek: 4, // ... och att varna tar så här många sekunder
  ser: 3, serSkog: 0.5, // den som är vaken, ute och har gänget inom synhåll upptäcker det så här många gånger per minut på halva synhållet: oftare ju närmare, vid synhållets kant inte alls (steg B.57), och gånger serSkog när gänget går i skog
  fackelSer: 0.5, // på natten syns ett gäng med en tänd fackla så här långt jämfört med på dagen, annars gånger nattSer (steg 10.1.10)
  moter: 6, // en rövare och den som står emot börjar slåss när de är så här nära varandra (rutor) ...
  slaIvagen: 0.5, hotaPoang: 0.6, taBordaPoang: 0.8, // ... och den som inte står emot men är så nära: den aggressiva slår (gånger aggressionen / 10), den modiga hotar (gånger modet / 10), och den som har plats tar det hen bär (steg 10.2.26)
  slaOvetande: 0.5, // ... och så mycket mer mot den som inte vet om gänget: hen kan överraskas (steg B.57)
  slaMod: 0.5, slaHot: 0.6, // viljan att slå: per tio steg mod över 10, och minus detta per gång fler som står emot än de själva
  hotVapen: 2, // i hotet räknas var och en som 1 + detta gånger vapnets skada
  flyBlod: 2.5, flyHot: 0.8, flyDoda: 1.2, // viljan att fly: blodet hen förlorat, övermakten hen ser (mindre för den modiga) och delen av flocken som är borta
  platsAvst: 10, // platserna att plundra väljs efter värdet delat med avståndet plus så här många rutor (steg 13.1.5) ...
  platsMin: 3, // ... och en plats där det som ligger är värt mindre än så här är inte värd besväret
  taSek: 12, // så många sekunder tar det att ta en sak ur förrådet (steg 10.1.15): tiden följer hur mycket det finns att ta
  gavSig: 1, gavSigTim: 2, // den som flytt eller gett upp i striden har så här mycket mindre vilja att stå emot, och det avtar till noll på så här många timmar (steg 12.1.82)
  lyder: 0.5, lyderPlus: 0.15, iver: 0.2, // över den här Envälde-seden lyder man ledaren (så mycket mer vilja), och så mycket drar Fejd och Krig till striden eller från den (steg 8.7.9, 10.1.13)
  pliktPlus: 0.3, familjPlus: 0.05, smabarnMinus: 0.15, // lagen om stridsplikt, den som har partner eller barn i byn att försvara, och föräldern till ett litet barn (steg 10.1.13)
  gerUpp: 1.5, // ... och så många gånger mer när byn gett upp
  bar: 20, // så mycket väger det varje rövare som står kvar kan bära (steg 8.7.16)
  boskapR: 30, // varje rövare driver bort ett betesdjur som står ute inom så här många rutor (steg 9.8.12)
  styrka: [8, 14], mod: [8, 15], uthallighet: [9, 14], smidighet: [8, 14], skicklighet: [6, 11], // rövarnas kroppar (lägst, högst)
  testVanta: 4, // testläget: gänget rastar så här många minuter innan anfallet, i stället för lurMin, så att man hinner se livet på rastplatsen (steg 10.1.16 och 10.2.31); inget annat skiljer
  radFram: 2, radIsar: 1.3, radUt: 6, /* så långt letas fri mark till raden (steg B.49) */ // de som väntar på gänget står så här många rutor från målet mot gänget, i en rad med så här många rutor mellan sig (steg B.5)
  // den som är i underläge väntar på de andra (steg B.17): räcker de som samlats (motVilja, steg B.47) möter de gänget, de högst samlNara rutor från raden eller
  // från gruppens egen mitt är samlade (byn väntar samlAvst rutor bortom målet sett från gänget), och de som hinner till raden innan gänget kommit samlHinner
  // gånger så långt räknas med. Är alla inom samlVag rutor framme väntar man inte längre
  // (den som bestämt sig för att möta dem tål mer, samlKvar, så att valet inte vippar)
  samlKvar: 0.6, samlHinner: 1, samlNara: 6, samlVag: 60, samlAvst: 11,
  radFlytt: 2.5, // hjälparen går till en ny plats bakom raden när den hen har är så här många rutor från den (steg B.14)
  foljSek: 12, // den som inte står emot och springer undan följs så här många sekunder (steg B.14), sedan går rövaren vidare
  anfallUt: 2, // en flock som setts så här nära byns område (utanforByn) eller inne i det gör att byn går i anfallsläge (steg 9.2.104)
  rundUt: 6, // på väg till rastplatsen går gänget runt byn, så här många rutor utanför byns område (steg B.16)
  lurUt: 15, // väntplatsen ligger minst så här många rutor utanför byns område (utanforByn), också för en vanlig flock (steg 9.2.103)
  // vem som strider, hjälper eller gömmer sig (steg 9.2.116, rovarVilja): mod / 20 + iver, minus skadad × det som fattas i hälsan,
  // sjuk när hen är sjuk och gammal för de gamla, plus seden, familjen, plikten och ledaren (rovarVilja). Från kampeFran strider hen, från hjalpFran hjälper hen och står bakom en bit bakom kämparna, annars gömmer hen sig
  hotAvst: 20, hotSteg: 6, // hotet i valet (steg B.29, rovarHot): på så här många rutor väger gänget hälften
  budMarg: 1.2, budMax: 2, // budbäraren (steg 9.2.117) går bara om vägen dit, gånger budMarg, hinns före anfallet, och ger upp efter budMax timmar
  overmakt: 0.2, // övermakten i viljan vid larmet (steg B.32): så mycket mindre vilja per gång starkare gänget är än de egna som kan slåss
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
// x, y: mitten av gänget (steg 10.2.25), mx, my: målet. test: flocken kom från testläget och rastar kortare (steg 9.2.103).
// anfall: flocken har setts i eller nära byn, och byn går mot den (steg 9.2.104). strider: hur många strider flocken varit i
export interface Rovarflock { ingenMer?: number; /* så många hade larmet när alla på väg till raden var framme och inte räckte (steg B.47 och B.60) */ radMal?: { x: number; y: number }; /* målet raden väntar vid (steg B.33) */ fard?: number; hemN?: number; hemBar?: Record<string, number>; /* världens färd som skickade flocken, hur många som kommit hem och vad de bar (steg 11.6.20) */ rast?: { x: number; y: number }; vantat?: boolean; anfaller?: boolean; anfallT?: number; /* när det gick till anfall (steg B.13) */ kom?: number; frammeT?: number; /* när gänget kom, och när alla var framme vid rastplatsen, för mätningen (steg B.56) */ klar?: boolean; radKlar?: boolean; antal?: number; strider?: number; tagit?: Record<string, number>; gravTagit?: Record<string, number>; /* det som togs ur gravarna (steg 13.1.5) */ sx?: number; sy?: number; skal?: import('./rader').RadSkal; rad?: boolean; mal?: number; hugger?: { bit: number; till: number }; tant?: boolean; id: number; klan?: number; folk: number[]; x: number; y: number; mx: number; my: number; gor: 'kommer' | 'vantar' | 'slass' | 'flyr' | 'letar' | 'rotar'; /* det de flesta gör, för texterna (steg 10.2.30) */ letar?: number[]; letat?: boolean; till: number; sedd?: number; gissning?: number; test?: boolean; anfall?: boolean; bud?: { av: number; till: number; t: number } }

// för mätningen av striderna (npm run strid, steg B.56): varje gäng som kommer (läses aldrig av spelet)
export const rovarProv: { kom?: (f: Rovarflock) => void } = {};
const vaken = (p: Person) => p.task?.act !== 'sova';
const mellan = (s: State, [a, b]: readonly number[]) => a + rnd(s, 'rovare') * (b - a);
export const vuxenKan = (s: State, p: Person) => { const a = ageOf(p, s.now); return a >= ALDER.vaktFran && a < ALDER.vaktTill && halsa(p) >= KROPP.svag && kanGa(p); }; // den sjuka kan slåss men vill mindre (ROVARE.sjuk i rovarVilja)

// (steg 8.7.14) skyddet efter ett anfall avtar med tiden i stället för en fast vila
export const efterAnfall = (s: State) => s.rovarVila === undefined ? 1 : 1 - Math.exp(-Math.max(0, s.now - s.rovarVila) / (ROVARE.vilaDygn * DAY));

// testläget (steg 4.5.4.4): en liten, mellanstor eller stor flock kommer nu (så många rövare). Flocken kommer in från kanten
// som ett vanligt gäng (steg 10.1.16) och väntar kortare (ROVARE.testVanta); en rad i Händelser säger var (steg 4.5.6.4). Svarar med raden, eller skälet till att ingen flock kan komma
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
// (steg 9.2.103): gänget kommer in från kartans kant som ett vanligt gäng och rastar kortare (ROVARE.testVanta),
// men går annars som en vanlig flock
// Rövare kommer bara när en by eller ett läger i världen skickar dem (steg 11.6.20, plundringen i byhandling.ts), med så många som
// flocken där är; klan = -1 är ett gäng utan klan
export function rovarnaKommer(s: State, tvinga: number, direkt?: boolean, klan?: number, vilka?: ({ namn: string; sex: 'm' | 'k' } | undefined)[]) { // vilka: de som gav sig av på färden (steg B.39)
  // en ny flock kan komma medan en annan är på kartan (steg 8.7.18): den går samtidigt med den (rovareFler, rovarSteg)
  const forra = s.rovare;
  const m = getMap(s.seed); // testläget kommer in från kanten som ett vanligt gäng (steg 10.1.16): bara väntan är kortare
  // den grannklan som tycker sämst om byn, om någon inte tycker om den
  const k: Klan | undefined = klan !== undefined ? klanById(s, klan) : klanerOf(s).filter(q => q.inst < 0).sort((a, b) => a.inst - b.inst)[0];
  // gänget kommer in från kanten som pekar mot grannbyn (steg 11.2.22), annars från en slumpad kant
  const mot = kantMot(s, k?.id);
  let x = mot?.x ?? 0, y = mot?.y ?? 0;
  for (let i = 0; i < 20 && !mot; i++) {
    const sida = Math.floor(rnd(s, 'rovare') * 4), l = rnd(s, 'rovare');
    x = sida === 0 ? 0.5 : sida === 1 ? W - 0.5 : l * W; y = sida === 2 ? 0.5 : sida === 3 ? H - 0.5 : l * H;
    if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break;
  }
  const n = tvinga;
  const folk: number[] = Array.from({ length: n }, (_, i) => { // gänget har ingen ledare (steg 10.2.25)
    const slump = rnd(s, 'rovare') < 0.5 ? 'm' as const : 'k' as const; // man eller kvinna som alla andra (steg 10.2.100)
    const hem = vilka?.[i] ?? k?.personer.find(q => q.roll === 'rovare' && q.kropp); // en som flydde hem förra gången kommer igen (steg 9.2.114); slumpen dras ändå
    const sex = hem?.sex ?? slump;
    const namn = hem?.namn ?? makeName(s, sex, 'rovare'); // vapnet och kläderna kommer ur registret GASTUTRUSTNING (gast.ts, steg 10.1.8)
    const styrka = mellan(s, ROVARE.styrka), uthallighet = mellan(s, ROVARE.uthallighet), mod = mellan(s, ROVARE.mod), smidighet = mellan(s, ROVARE.smidighet), skick = mellan(s, ROVARE.skicklighet);
    const ov = Math.max(0, (skick - 5) * 2); // skickligheten i striden är 5 + färdigheten / 2, som hos en bybo (personKampe)
    const p = nyGast(s, { id: nyttGastId(s), namn, sex: hem?.sex ?? sex, fodd: foddNar(s.seed, gastNyckel(k?.id, namn), 'rovare', s.now), rad: { sort: 'rovare', klan: k?.id }, x, y, nyckel: gastNyckel(k?.id, namn), pot: { styrka, uthallighet, mod, smidighet }, skill: { narstrid: ov, traff: ov } }); // drar ingen slump
    gastTillbaka(s, p);
    gastensPlatser(s, p); // det hens by känner (steg 11.4.11)
    s.people.push(p);
    return p.id;
  });
  folk.forEach((id, j) => { const g = gastAv(s, id)?.gast; if (g) g.fil = j - (folk.length - 1) / 2; }); // var sin fil bredvid de andra (steg 10.2.25)
  const nr = s.rovarNr = (s.rovarNr ?? 0) + 1;
  // testläget (steg 9.2.103): gänget rastar ROVARE.testVanta minuter i stället för den vanliga väntan
  s.rovare = { id: nr, klan: k?.id, folk, x, y, mx: x, my: y, gor: 'kommer', till: 0, kom: s.now, ...(direkt ? { test: true } : {}) };
  stallUpp(s, s.rovare, x, y);
  s.rovarVila = s.now;
  rovarProv.kom?.(s.rovare);
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
// där en rövare kan stå och gå: samma regel som gången (findPath), allt utom vatten och väggar. Golvet, dörren och möblerna i ett hus
// går att stå på (steg B.58)
const farSta = (s: State, x: number, y: number) => inMap(x, y) && !iVatten(s, x, y) && !isWall(s, x, y);
// avståndet från q till den närmaste rövaren
const narmast = (s: State, f: Rovarflock, q: { x: number; y: number }) => Math.min(...rovarna(s, f).map(r => Math.hypot(r.x! - q.x, r.y! - q.y)));
// rövarens egen plats kring (x, y), på land
function egenPlats(s: State, x: number, y: number, r: Person) {
  const [dx, dy] = egenPunkt(r), px = clamp(x + dx, 0.3, W - 0.3), py = clamp(y + dy, 0.3, H - 0.3);
  return iVatten(s, px, py) && !iVatten(s, x, y) ? { x, y } : { x: px, y: py };
}
function spara(s: State, r: Person, t: number) {
  const sp = gr(r).spar ??= [];
  if (sp.length >= 3 && sp[sp.length - 3] >= t - 1e-9 && sp.length > 3) t = sp[sp.length - 3] + ROVARE.sparEfter * SEC; // bilden går bara framåt: det som flyttade hen efter en gång som redan sparats kommer efter den (steg 10.2.96)
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
export function gaMot(s: State, r: Person, mx: number, my: number, sek: number, t0: number, fartF = 1, runt?: Uint8Array) {
  const g = groundOf(s), mal = tileOf(mx, my);
  if (gr(r).pk !== mal) {
    // ett mål som flyttat sig högst ROVARE.vagFlytt rutor behåller vägen (den sista biten går rakt); ett mål som inte gick att nå
    // prövas igen först efter ROVARE.vagSok sekunder: vägsökningen går över hela kartan
    const pk = gr(r).pk, nara = pk !== undefined && !!gr(r).path?.length && Math.hypot(pk % W - mx, Math.floor(pk / W) - my) <= ROVARE.vagFlytt;
    if (nara) gr(r).pk = mal;
    else if (gr(r).ingen !== undefined && s.now - (gr(r).ingenT ?? 0) < ROVARE.vagSok * SEC && Math.hypot(gr(r).ingen! % W - mx, Math.floor(gr(r).ingen! / W) - my) <= ROVARE.vagFlytt) return -1; // (också ett mål nära det som inte gick)
    else {
      gr(r).pk = mal; gr(r).path = findPath(g, r.x, r.y, mx, my, false, iVatten(s, r.x, r.y) ? ROVARE.isKostnad : undefined, runt) ?? undefined;
      if (!gr(r).path) { gr(r).pk = undefined; gr(r).ingen = mal; gr(r).ingenT = s.now; return -1; }
      gr(r).ingen = undefined;
    }
  }
  if (!gr(r).spar?.length) spara(s, r, t0);
  let tid = 0;
  for (;;) {
    const sist = !gr(r).path?.length, i = sist ? 0 : gr(r).path![0];
    let wx = sist ? mx : (i % W) + 0.5, wy = sist ? my : Math.floor(i / W) + 0.5;
    const nx = gr(r).path?.[1];
    if (!sist && nx !== undefined) { // bredvid de andra i gänget (steg 10.2.25): var och en går en egen linje vid sidan av vägen, om marken där går att gå på
      const ux = (nx % W) + 0.5 - wx, uy = Math.floor(nx / W) + 0.5 - wy, ul = Math.hypot(ux, uy) || 1, o = sidaOm(r), sx = wx - uy / ul * o, sy = wy + ux / ul * o; // vägens riktning, inte rövarens
      if (farSta(s, sx, sy)) { wx = sx; wy = sy; }
      // en punkt hen redan passerat, sett i vägens riktning, hoppas över om det är fritt till nästa: i vägens hörn ligger filens punkt
      // bakom den som går i filen, och hen ska inte gå tillbaka till den (steg B.20)
      if ((wx - r.x!) * ux + (wy - r.y!) * uy < 0 && fritt(s, r.x!, r.y!, wx + ux, wy + uy)) { gr(r).path!.shift(); continue; }
    }
    if (!sist) { const q = iVagen(s, wx, wy, mx, my); if (q) { wx = q.x; wy = q.y; } } // någon står på nästa punkt på vägen: bredvid hen (steg B.49)
    // ingen går genom en människa: man kliver åt sidan runt hen. Står rövaren redan där (vägen går tätt bakom den hen gått
    // runt), tränger hen sig förbi
    const runt = (q => q && Math.hypot(q.x - r.x!, q.y - r.y!) > 1e-3 ? q : undefined)(runtOm(s, r, wx, wy, mx, my));
    if (runt) { wx = runt.x; wy = runt.y; }
    const fart = GANG.fart * fartF * Math.max(0.5, markFart(g, tileOf(r.x!, r.y!)));
    const d = Math.hypot(wx - r.x!, wy - r.y!), kan = (sek - tid) * fart;
    if (d > kan) { r.x! += (wx - r.x!) / d * kan; r.y! += (wy - r.y!) / d * kan; spara(s, r, t0 + sek * SEC); return d - kan + (gr(r).path?.length ?? 0); }
    r.x = wx; r.y = wy; tid += d / fart;
    if (runt) continue; // förbi: vidare mot vägen
    if (sist) { spara(s, r, t0 + tid * SEC); return 0; }
    gr(r).path!.shift(); spara(s, r, t0 + tid * SEC);
  }
}
// en människa i byn som står på eller tätt intill vägens punkt (wx, wy): den fria punkten STRID.kropp bredvid hen, närmast vägens
function iVagen(s: State, wx: number, wy: number, mx: number, my: number) {
  const q = living(s).find(o => !o.gast && o.ute === undefined && Math.hypot(o.x - wx, o.y - wy) < STRID.kropp && Math.hypot(o.x - mx, o.y - my) >= STRID.kropp);
  if (!q) return undefined;
  const v0 = Math.atan2(wy - q.y, wx - q.x);
  for (const dv of [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, Math.PI]) { const x = q.x + Math.cos(v0 + dv) * STRID.kropp, y = q.y + Math.sin(v0 + dv) * STRID.kropp; if (farSta(s, x, y)) return { x, y }; }
  return undefined;
}
// marken på den raka linjen går att gå på (inget vatten, inget hus)
function fritt(s: State, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.4);
  for (let i = 1; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (!farSta(s, x, y)) return false; }
  return true;
}
// en människa i byn som står på sträckan från rövaren r till (wx, wy) närmare än halva STRID.kropp: punkten bredvid hen, på
// rövarens sida, dit r kliver först (gaMot). Den rövaren går mot (målet mx, my) går hen fram till, och förbi den som står
// tätt intill nästa punkt på vägen tränger hen sig
function runtOm(s: State, r: Person, wx: number, wy: number, mx: number, my: number) {
  const ux = wx - r.x!, uy = wy - r.y!, l2 = ux * ux + uy * uy, halv = STRID.kropp / 2;
  if (l2 < 1e-9) return undefined;
  for (const q of living(s)) {
    if (q.gast || q.ute !== undefined || Math.hypot(q.x - mx, q.y - my) < STRID.kropp || Math.hypot(q.x - wx, q.y - wy) < STRID.kropp * 0.99) continue; // den som står på vägen själv går det inte att gå runt
    const t = clamp(((q.x - r.x!) * ux + (q.y - r.y!) * uy) / l2, 0, 1), px = r.x! + ux * t - q.x, py = r.y! + uy * t - q.y;
    if (Math.hypot(px, py) >= halv || Math.hypot(r.x! - q.x, r.y! - q.y) < halv) continue;
    const l = Math.sqrt(l2), sida = (r.x! - q.x) * -uy / l + (r.y! - q.y) * ux / l >= 0 ? 1 : -1; // åt det håll rövaren redan står
    const x = q.x - uy / l * STRID.kropp * sida, y = q.y + ux / l * STRID.kropp * sida;
    if (farSta(s, x, y)) return { x, y };
  }
  return undefined;
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
  const d = avst(f, m), v = Math.atan2(f.y - m.y, f.x - m.x), by = runtByn(s, 0);
  let nast: { x: number; y: number } | undefined; // den första som går att nå, också genom byn
  for (const dv of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
    for (let r = Math.min(d, ROVARE.lur); r <= d; r++) {
      const x = clamp(m.x + Math.cos(v + dv) * r, 0.5, W - 0.5), y = clamp(m.y + Math.sin(v + dv) * r, 0.5, H - 0.5);
      if (utanforByn(s, x, y) < ROVARE.lurUt && r + 1 <= d) continue;
      const vag = !iVatten(s, x, y) && !bitAt(s, Math.floor(x), Math.floor(y)) && findPath(groundOf(s), f.x, f.y, x, y, false, undefined, runtByn(s, ROVARE.rundUt)); // dit gänget kan gå
      if (vag) { const at = { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 }; if (!vag.some(i => by[i])) return at; nast ??= at; }
      break;
    }
  }
  return nast;
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
// så långt ser q gänget: vakten längst, kortare på natten (men längre bort när gänget har en tänd fackla) och i dimma
export function synhall(s: State, f: Rovarflock, q: Person) {
  const ljus = lightLevel(s.now) > 0 ? 1 : facklaTand(s, f) ? ROVARE.fackelSer : ROVARE.nattSer;
  return (q.task?.act === 'vakt' ? ROVARE.vaktSer : ROVARE.folkSer) * ljus * (1 - ROVARE.dimmaSer * vaderNu(s).dimma);
}
// Att se dem: var och en som är vaken och ute och har gänget inom synhåll kan upptäcka det (en chans per tid) och vet sedan (larmet hos personen). Den som är långt borta vet
// ingenting förrän hen själv ser dem eller hör en varning. Vakthunden hör dem före vakten (steg 9.8.11)
function seSteg(s: State, f: Rovarflock, folk: Person[], dtSec: number) {
  const strid = flockStrid(s, f), horStrid = LARM.hor * (isLight(s.now) ? 1 : LARM.natt);
  if (!strid && !pavag(s, f)) return; // (steg B.51)
  const chans = 1 - Math.exp(-ROVARE.ser * dtSec / 60);
  // en chans per tid som växer ju närmare gänget är jämfört med synhållet, och mindre när den närmaste rövaren går i skog (steg B.57)
  const synsFor = (q: Person) => {
    const syn = synhall(s, f, q);
    let d = Infinity, skog = false;
    const rum = roomAt(s, q.x, q.y); // den som är inne ser bara den som är i samma rum
    for (const r of rovarna(s, f)) { if (rum && roomAt(s, r.x, r.y) !== rum) continue; const a = Math.hypot(r.x - q.x, r.y - q.y); if (a < d) { d = a; skog = inMap(r.x, r.y) && isForest(s, tileOf(r.x, r.y)); } }
    if (d >= syn || ageOf(q, s.now) < ALDER.smabarn) return false;
    return rnd(s, 'rovare') < 1 - (1 - chans) ** ((syn / Math.max(0.5, d) - 1) * (skog ? ROVARE.serSkog : 1));
  };
  const ser = (q: Person) => vaken(q) && (synsFor(q) || !!strid && horsel(q) >= LARM.dov && strid.st.kampar.some(k => k.lage === 'strid' && Math.hypot(k.x - q.x, k.y - q.y) < horStrid)); // striden hörs (steg B.29)
  const hund = hundSkaller(s, d => narmast(s, f, d));
  for (const q of folk) {
    if (!alive(q) || harLarm(s, q, f)) continue;
    const viaHund = hund?.p === q;
    if (!ser(q) && !viaHund) continue;
    if (viaHund && q.task?.act === 'sova') { avbryt(s, q); q.task = undefined; }
    if (f.sedd === undefined) { // den första som ser dem gissar hur många de är (sämre på långt håll)
      const n = f.folk.length, fel = ROVARE.gissFel * Math.min(1, narmast(s, f, q) / Math.max(1, synhall(s, f, q))) * (rnd(s, 'rovare') * 2 - 1);
      f.sedd = s.now; f.gissning = Math.max(1, Math.round(n * (1 + fel))); f.sx = f.x; f.sy = f.y; // där flocken sågs (steg 9.2.122)
      count(s, 'rovarSedda');
      rovareSedda(s, q, f.klan); // ett rykte om byn de kom ifrån (steg 11.4.2)
      const text = `${q.name} såg rövare ${f.anfaller ? 'på väg mot byn' : 'utanför byn'}, ungefär ${f.gissning} (${fran(s, f)}).`;
      log(s, text, 'world', [q.id]); notis(s, 'anfall', text, [q.id], { x: Math.floor(f.x), y: Math.floor(f.y) });
    }
    larmOm(s, q, f, f.gissning ?? f.folk.length, 0);
    if (vuxenKan(s, q)) nyttILarmet(s);
    count(s, 'rovarSer');
    if (q.task && (q.task.act === 'vakt' || larmAvbryter(q.task.act, 'varg'))) { avbryt(s, q); q.task = undefined; } // hen väljer på nytt: först varnar hen (rovarSkydd)
  }
}
// Larmet: att varna är en handling (varna i handlingar.ts). Alla inom hörhåll (ROVARE.horhall, stort; hornet hörs över hela kartan)
// hör den som varnar, och var och en som hör varnar själv vidare, så att larmet sprider sig genom byn led för led. De vuxna som
// sover väcks; den som sover i ett hus och inte kan slåss sover vidare
function hors(s: State, fran: Person, r: number) {
  const horn = (s.ting ?? []).some(t => t.k === 'horn' && (t.hos === fran.id || t.agare === fran.id));
  const led = (fran.larm?.rovare?.led ?? 0) + 1, st = fran.larm?.rovare?.storlek ?? 1;
  let n = 0;
  const om = fran.larm?.rovare?.om, nya = (o: Person) => !harLarm(s, o) || !!om && !!o.larm!.rovare!.om && om.some(i => !o.larm!.rovare!.om!.includes(i));
  for (const o of living(s)) {
    if (o === fran || !nya(o) || horsel(o) < LARM.dov || (!horn && avst(o, fran) > r)) continue;
    horLarm(o, { t: s.now, vad: 'rovare', storlek: Math.max(1, Math.round(st * (1 + LARM.forvrang * (2 * rnd(s, 'rykte', o) - 1)))), led, ...(om ? { om: [...new Set([...(harLarm(s, o) ? o.larm!.rovare!.om ?? [] : []), ...om])] } : {}) });
    tanke(o, 'hordeRop', s.now, { vad: 'rövare', v: -LARM.oro, tid: LARM.oroTim * HOUR });
    count(s, 'larm_hort'); n++;
    if (vuxenKan(s, o)) nyttILarmet(s); // de egna blev fler: rollerna väljs om (steg B.60)
    if (!o.task) continue;
    if (o.task.act === 'sova') { if (vuxenKan(s, o)) { avbryt(s, o); o.task = undefined; count(s, 'rovarVackt'); } continue; }
    if (o.task.act === 'vakt' || larmAvbryter(o.task.act, 'varg')) { avbryt(s, o); o.task = undefined; }
  }
  return n;
}
function varnaSteg(s: State, folk: Person[]) {
  for (const q of folk) {
    const l = q.larm?.rovare;
    if (!alive(q) || q.task?.act !== 'varna' || !l || l.varnat) continue;
    l.varnat = 1;
    const n = hors(s, q, ROVARE.horhall * (isLight(s.now) ? 1 : LARM.natt));
    count(s, 'rovarVarnar');
    if (l.led === 0) log(s, `${q.name} varnade byn: rövare!${n ? ` ${stor(tal(n))} hörde det.` : ''}`, 'world', [q.id]);
  }
}
// gänget är inne i byns område eller alldeles utanför (för texterna)
const iByn = (s: State, f: Rovarflock) => Math.min(...rovarna(s, f).map(r => utanforByn(s, r.x, r.y))) < ROVARE.anfallUt;

// den som väntar med vapen (mot rövarna eller vargarna)
const forsvarar = (q: Person) => q.task?.act === 'forsvarRovare' || q.task?.act === 'forsvar';
// budbäraren (steg 9.2.117, "Anfallet nära byn" i designdokumentet): när flocken väntar utanför byn och några vuxna som kan slåss
// inte hört ropet, springer den vuxna som har larmet och står närmast och hämtar dem, om hen hinner fram före anfallet. Ropet
// sprids från hen på vägen. Budet är klart när den som skulle hämtas har larmet, eller när budMax timmar gått
export const rovarFlockar = (s: State) => [s.rovare, ...(s.rovareFler ?? [])].filter((f): f is Rovarflock => !!f); // alla rövarflockar på kartan (steg 8.7.18)
// vet hen om rövarna (om gänget f) nu? Larmet gäller så länge gänget är kvar på kartan (larmGaller i roller.ts, steg B.59), så ett gäng man vet
// om är inget nytt när det går till anfall, när striden börjar eller när det stannat länge (steg B.51)
const harLarm = (s: State, q: Person, f?: Rovarflock) => { const l = larmGaller(s, q, 'rovare'); return !!l && (!f || !l.om || l.om.includes(f.id)); };
// larmet om gänget f: ett gäng till är ett nytt larm att varna för, ett gäng man vet om är det inte (steg B.51)
const larmOm = (s: State, q: Person, f: Rovarflock, storlek: number, led: number, varnat?: 1) => { const om = harLarm(s, q) ? q.larm!.rovare!.om ?? [] : []; horLarm(q, { t: s.now, vad: 'rovare', storlek, led, om: [...om, f.id], ...(varnat ? { varnat } : {}) }); };
// ett gäng som flyr eller bär hem det de tagit är inget nytt hot
const pavag = (s: State, f: Rovarflock) => f.gor !== 'flyr' && !f.klar && rovarna(s, f).some(r => !gr(r).flytt && !gr(r).nojd);
// Hotet som q känner det (steg B.29, "Att se dem" i fliken Människan): hur nära det närmaste gänget är hen eller byn, vare sig gänget
// ligger stilla eller rör sig. Ett gäng som flyr hotar ingen. Utan gäng på kartan vet man bara det man hört (larmet, som tas bort när det
// sista gänget är borta, rovarSteg). Valet väger det som en fara (raden redo i val.ts)
export function rovarHot(s: State, q: Person) {
  const fl = rovarFlockar(s).filter(f => f.folk.length);
  if (!fl.length) return harLarm(s, q) ? 1 : 0; // ett gammalt larm är inget hot (steg B.46)
  const ute = utanforByn(s, q.x, q.y) > 0;
  let h = 0;
  for (const f of fl) {
    const fria = f.gor === 'flyr' ? [] : rovarna(s, f).filter(r => !gr(r).flytt);
    if (!fria.length) continue;
    const d = Math.min(...fria.map(r => ute ? Math.hypot(r.x - q.x, r.y - q.y) : Math.min(Math.hypot(r.x - q.x, r.y - q.y), utanforByn(s, r.x, r.y))));
    h = Math.max(h, 1 / (1 + d / ROVARE.hotAvst));
  }
  return h;
}
hotKrok.fara = (s, p) => p.larm?.rovare ? rovarHot(s, p) : 0;
// hotet på en plats och på vägen dit (steg B.48): hur nära de rövare p vet om är, där vägen kommer närmast dem (hotSteg rutor isär)
hotKrok.vag = (s, p, x, y) => {
  if (!p.larm?.rovare) return 0;
  const dit = Math.hypot(x - p.x, y - p.y), n = Math.max(1, Math.ceil(dit / ROVARE.hotSteg));
  let d = Infinity;
  for (const f of rovarFlockar(s)) {
    if (f.gor === 'flyr' || !harLarm(s, p, f)) continue;
    for (const r of rovarna(s, f)) if (!gr(r).flytt) for (let i = 1; i <= n; i++) d = Math.min(d, Math.hypot(p.x + (x - p.x) * i / n - r.x, p.y + (y - p.y) * i / n - r.y));
  }
  return d === Infinity ? 0 : 1 / (1 + d / ROVARE.hotAvst);
};
// den som står redo, hjälper eller gömmer sig går tillbaka till sitt när inget gäng längre hotar: alla flyr
const REDO = new Set<string>(['forsvarRovare', 'hjalpaRovare', 'gomma']);
function lugnar(s: State, folk: Person[]) {
  for (const q of folk) if (q.task && REDO.has(q.task.act) && q.larm?.rovare && (q.task.act !== 'gomma' || q.task.hot === 'rovare') && (!s.rovare || rovarHot(s, q) <= 0)) { avbryt(s, q); q.task = undefined; count(s, 'rovarLugn'); }
}
function budFor(s: State, p: Person) {
  const b = rovarFlockar(s).find(f => f.bud?.av === p.id)?.bud;
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
// rövarnas rad bland hoten (steg 9.5.19, roller.ts): viljan som den är, och rövarnas två gränser
viljaKrok.vilja = rovarVilja; viljaKrok.kan = vuxenKan;
// den som nyss flytt eller gett upp i en strid med rövarna (steg 10.1.14) vill mindre stå emot igen, och det avtar (steg 12.1.82)
export const gavSigAvdrag = (s: State, p: Person) => p.gavSig === undefined ? 0 : ROVARE.gavSig * Math.max(0, 1 - (s.now - p.gavSig) / (ROVARE.gavSigTim * HOUR));
// övermakten (steg B.32): gängets styrka som p vet om den (larmet säger hur många de är) delad med de egnas, räknad med vapnen som i hotet.
// folk = de som skulle möta gänget: innan någon valt är det alla som kan slåss, sedan de som samlats (moterNu). Vapnet är det var och en
// har eller kan ta, varje vapen en gång
const kraftMed = (skada: number) => 1 + ROVARE.hotVapen * skada;
export function overmakt(s: State, n: number, f: Rovarflock | undefined, folk: Person[]) {
  const fria = f ? rovarna(s, f).filter(q => !gr(q).flytt) : [], tagna = new Set<number>();
  const en = fria.length ? fria.reduce((a, q) => a + kraftMed(vapenSkada(s, q)), 0) / fria.length : kraftMed(0);
  let vi = 0;
  for (const q of folk) {
    const har = vapenSkada(s, q), t = bastaVapen(s, q, tagna), b = t ? VAPEN[t.k as keyof typeof VAPEN].skada : 0;
    if (t && b > har) tagna.add(t.id); // (reserveras bara när det är bättre än det hen har, steg B.55)
    vi += kraftMed(Math.max(har, b));
  }
  return n * en / Math.max(0.5, vi);
}
const overmaktAvdrag = (over: number) => ROVARE.overmakt * Math.max(0, over - 1);
// om de egna räcker (steg B.47): viljan att möta gänget med dem som skulle stå i raden, minus övermakten. En enda regel, vid larmet
// (var och ens egen) och i mötet (gruppens medel)
const motVilja = (s: State, p: Person, over: number) => rovarVilja(s, p) - gavSigAvdrag(s, p) - overmaktAvdrag(over);
const narmasteFlock = (s: State, p: { x: number; y: number }) => rovarFlockar(s).filter(q => q.folk.length && q.gor !== 'flyr').sort((a, b) => avst(a, p) - avst(b, p))[0];
// de som övermakten räknas mot (steg B.60): alla som har larmet om gänget och kan slåss, en gång och lika för alla, vem som än väljer först.
// När alla på väg till raden är framme och ändå inte räcker räknas bara de som står där (steg B.47), tills fler fått larmet
const medLarm = (s: State, f?: Rovarflock) => living(s).filter(q => vuxenKan(s, q) && harLarm(s, q, f));
const ingenMer = (s: State, f?: Rovarflock) => f?.ingenMer !== undefined && medLarm(s, f).length <= f.ingenMer;
const kanMota = (s: State, p: Person, f?: Rovarflock) => { const i = ingenMer(s, f), l = medLarm(s, f).filter(q => !i || q === p || q.task?.act === 'forsvarRovare'); return l.includes(p) ? l : [...l, p]; };
LARMHOT.rovare = { namn: 'Rövarna', nara: (s, _p, l) => rovarFlockar(s).some(f => f.folk.length > 0 && (!l.om || l.om.includes(f.id))), plus: (s, p) => { const f = narmasteFlock(s, p); return motVilja(s, p, p.larm?.rovare && vuxenKan(s, p) ? overmakt(s, ingenMer(s, f) ? f!.folk.length : p.larm.rovare.storlek ?? 1, f, kanMota(s, p, f)) : 1) - rovarVilja(s, p); }, kampe: () => ROVARE.kampeFran, hjalp: () => ROVARE.hjalpFran };
// rollen som ändrats (fler har fått larmet, någon har skadats) ändrar också det hen gör (steg B.60)
const ROLLACT: Record<string, string[]> = { kampe: ['forsvarRovare'], hjalpare: ['hjalpaRovare'], gomd: ['gomma'] };
function rollByte(s: State, folk: Person[]) {
  for (const q of folk) {
    const tk = q.task;
    if (!tk || !REDO.has(tk.act) || (tk.act === 'gomma' && tk.hot !== 'rovare') || !harLarm(s, q) || q.larmRoll?.hot !== 'rovare' || q.larmRoll.v === (s.larmV ?? 0)) continue;
    if (ROLLACT[rollVid(s, q, 'rovare')].includes(tk.act)) continue;
    avbryt(s, q); q.task = undefined; count(s, 'rovarRollByte');
  }
}
function rovarSkydd(s: State, p: Person, _storlek: number, dur: number) {
  // den som vet men inte varnat än varnar först (steg 10.1.12)
  if (!!p.larm?.rovare && !p.larm.rovare.varnat && vaken(p) && ageOf(p, s.now) >= ALDER.smabarn) return { act: 'varna' as const, why: 'Varnar för rövare', spot: { x: p.x, y: p.y }, dur: ROVARE.varnaSek * SEC };
  const bud = budFor(s, p);
  if (bud) return { act: 'budRovare' as const, why: `Rövare är nära, springer och hämtar ${bud.name}`, spot: { x: bud.x, y: bud.y }, dur };
  if (rovarHot(s, p) <= 0) return undefined; // gänget flyr
  // rollen vid larmet (steg 9.5.19); den som nyss flytt eller gett upp i striden vill mindre (gavSigAvdrag)
  const roll = rollVid(s, p, 'rovare');
  if (roll !== 'gomd') {
    // de gör sig redo i byn: kämparna vid förrådet med det vapen som finns, hjälparna en bit bakom. Den som ser rövarna går mot dem (flockVal)
    const vapen = taVapen(s, p) ? 'ett vapen' : 'det som finns', f = narmasteFlock(s, p);
    const spot = radPlats(s, p, f, roll === 'kampe' ? 0 : ROVARE.bakom, living(s));
    return roll === 'kampe' ? { act: 'forsvarRovare' as const, why: `Rövare är nära, tar ${vapen} och väntar vid förrådet`, spot, dur } : { act: 'hjalpaRovare' as const, why: 'Rövare är nära, håller sig bakom kämparna vid förrådet', spot, dur };
  }
  return gomSig(s, p, 'Rövare', 'rovare', dur);
}
// fri mark att stå på i raden (steg B.49): inte i ett hus, en vägg eller vatten och inte på lagret
const friMark = (s: State, x: number, y: number) => inMap(x, y) && !bitAt(s, x, y) && !iVatten(s, x, y) && !roomAt(s, Math.floor(x), Math.floor(y)) && zoneAt(s, Math.floor(x), Math.floor(y)) < 0;
// den fria marken närmast (x, y) där ingen av de andra i raden står (upptagna, rutorna)
function radRuta(s: State, x: number, y: number, upptagna?: Set<number>) {
  const duger = (a: number, b: number) => friMark(s, a, b) && !upptagna?.has(tileOf(a, b));
  if (duger(x, y)) return { x, y };
  let bast: { x: number; y: number } | undefined, bd = Infinity;
  for (let dy = -ROVARE.radUt; dy <= ROVARE.radUt; dy++) for (let dx = -ROVARE.radUt; dx <= ROVARE.radUt; dx++) {
    const d = dx * dx + dy * dy;
    if (d < bd && duger(x + dx, y + dy)) { bd = d; bast = { x: x + dx, y: y + dy }; }
  }
  return bast ?? freeNear(s, x, y);
}
// Raden som väntar på gänget (steg B.5, B.14 och B.33, "Mötet" i fliken Människan): ROVARE.radFram rutor från målet mot hållet gänget kommer
// ifrån, och i striden och när byn går emot där kämparna står. Hållet är från målet mot rastplatsen, så att raden står still när rövarna rör
// sig vid målet. Utan gäng (bara larmet) är det målet självt. bakom = för den som hjälper: utan kämpar finns ingen rad att stå bakom, och
// då är det väntplatsen (steg B.32)
function radMal(s: State, f: Rovarflock, fria: Person[]) {
  const m = f.radMal; // målet är detsamma så länge någon i gänget är på väg dit
  if (m && fria.some(r => avst(malFor(s, f, r), m) < 1)) return m;
  const ny = malFor(s, f, [...fria].sort((a, b) => avst(a, malet(s)) - avst(b, malet(s)))[0] ?? f);
  return f.radMal = { x: ny.x, y: ny.y };
}
export function radLinje(s: State, f: Rovarflock) {
  const mal = radMal(s, f, rovarna(s, f).filter(r => !gr(r).flytt)), fran = f.rast ?? f, d = Math.max(0.01, avst(fran, mal)), ux = (fran.x - mal.x) / d, uy = (fran.y - mal.y) / d;
  let fram = Math.min(ROVARE.radFram, d);
  while (fram < d && fram < ROVARE.radFram + ROVARE.radUt && !friMark(s, mal.x + ux * fram, mal.y + uy * fram)) fram = Math.min(d, fram + 0.5); // framför huset eller lagret, inte i det (steg B.49)
  return { mal, ux, uy, mitten: { x: mal.x + ux * fram, y: mal.y + uy * fram }, vantM: vantPlats(s, f, mal, ux, uy) };
}
// väntplatsen (steg B.48): samlAvst rutor från målet, åt det håll som är längst från både vägen gänget kommer och vägen det går hem
function vantPlats(s: State, f: Rovarflock, mal: { x: number; y: number }, ux: number, uy: number) {
  const h = kantMot(s, f.klan) ?? kanterna(mal.x, mal.y)[0], hd = Math.max(0.01, avst(h, mal)), hx = (h.x - mal.x) / hd, hy = (h.y - mal.y) / hd;
  let bast = { x: mal.x - ux * ROVARE.samlAvst, y: mal.y - uy * ROVARE.samlAvst }, bp = Infinity;
  for (let i = 0; i < 12; i++) {
    const v = i * Math.PI / 6, c = Math.cos(v), n = Math.sin(v), at = { x: mal.x + c * ROVARE.samlAvst, y: mal.y + n * ROVARE.samlAvst };
    const fri = freeNear(s, at.x, at.y);
    if (Math.hypot(fri.x - at.x, fri.y - at.y) > 1.5) continue; // i vattnet eller i en vägg
    const mot = Math.max(c * ux + n * uy, c * hx + n * hy);
    if (mot < bp - 1e-9) { bp = mot; bast = at; }
  }
  return bast;
}
function radMitt(s: State, f: Rovarflock | undefined, folk: Person[], bakom = false) {
  if (!f) return undefined;
  const g = flockStrid(s, f), l = radLinje(s, f);
  const slass = g ? g.st.kampar.filter(k => k.sida === 0 && k.lage === 'strid') : [], kampar = folk.filter(q => alive(q) && q.task?.act === 'forsvarRovare' && narmasteFlock(s, q) === f), vantar = kampar.filter(q => q.task!.vantar);
  const rad = slass.length ? slass : vantar.length ? vantar : f.anfall && !f.anfaller ? kampar.filter(q => q.task!.phase === 'do') : [];
  const c = rad.length ? { x: rad.reduce((a, k) => a + k.x, 0) / rad.length, y: rad.reduce((a, k) => a + k.y, 0) / rad.length } : bakom && !kampar.length ? l.vantM : l.mitten;
  return { x: c.x, y: c.y, ux: l.ux, uy: l.uy };
}
// platsen i raden, bak rutor bakom den (hjälparen): den närmast mitten där ingen står (trängseln, glesPlats i trangsel.ts)
function radPlats(s: State, p: Person, f: Rovarflock | undefined, bak: number, folk: Person[]) {
  const m = radMitt(s, f, folk, bak > 0) ?? { ...malet(s), ux: 0, uy: -1 };
  return glesPlats(s, p, k => { const sida = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ROVARE.radIsar; return radRuta(s, m.x - m.ux * bak - m.uy * sida, m.y - m.uy * bak + m.ux * sida); })!;
}
setRovarVal(rovarSkydd);

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
  hot: number; last: number; kvar: number; brus: (k: string) => number } // brus: rövarens slumptal för handlingen k, dragna en gång per val
// den som står emot: väntar med vapen, håller vakt eller slåss
const starEmot = (q: Person) => forsvarar(q) || q.task?.act === 'vakt' || q.task?.act === 'strid';
// ... och kan det: frisk nog att slåss. Den som nyss fallit, flytt eller gett upp ser rövaren inte som någon i vägen så länge rädslan varar
const gavSigNyss = (s: State, q: Person) => gavSigAvdrag(s, q) > 0;
// den som gömt sig, inne eller vid elden, står inte i vägen för den som går förbi (steg 10.2.26 och B.15)
const gomd = (s: State, q: Person) => q.task?.act === 'gomma' && (q.task.phase === 'do' || iHus(s, q));
const kanStaEmot = (s: State, q: Person) => starEmot(q) && vuxenKan(s, q);
// flockens strid på kartan, om den pågår
export const flockStrid = (s: State, f: Rovarflock) => kartStrider(s).find(g => g.efter?.typ === 'rovare' && g.efter.flock === f.id);
// rövaren är med i en strid på kartan, flockens eller någon annan (steg 10.2.96: den som striden flyttar går inte samtidigt)
const iStriden = (_s: State, _f: Rovarflock, p: Person) => kartStrider(_s).some(g => !g.fri?.includes(p.id) && !g.st.slut && g.st.kampar.some(k => k.pid === p.id));
// det rövaren bär av bytet, i vikt
const lastAv = (r: Person) => Object.entries(gr(r).bar ?? {}).reduce((a, [k, n]) => a + viktOf(k) * n, 0);
// lagerplatsen närmast rövaren där det ligger något att ta
// handlarens last (steg 11.11.7): medan hen väntar eller handlar ligger lasten vid hen, och rövarna tar ur den som ur förrådet.
// Djuren och vagnarna i lägret tas inte
const handlarLast = (s: State) => { const h = s.handlare; if (!h || (h.fas !== 'vantar' && h.fas !== 'handlar') || !h.varor.some(w => w.n >= 1)) return undefined; const p = gastAv(s, h.id); return p && p.died === undefined ? { h, x: p.x, y: p.y } : undefined; };
// Platserna att plundra (steg 13.1.5): lagerplatserna, handlarens last och gravarna med något i. Rövaren väljer efter värdet av
// det som ligger där, delat med avståndet (plus ROVARE.platsAvst rutor), så att en rik plats lite längre bort går före en fattig nära
const gravVarde = (g: Grav) => (g.saker ?? []).reduce((a, x) => a + grundvarde(x.k) * x.n, 0);
export const gravVid = (s: State, r: { x: number; y: number }) => (s.gravar ?? []).find(g => g.saker?.some(a => a.n >= 1) && avst(r, { x: g.x + 0.5, y: g.y + 0.5 }) <= ROVARE.nara + 1);
function taPlats(s: State, r: Person) {
  let b: { x: number; y: number } | undefined, bv = 0;
  const prova = (c: { x: number; y: number }, v: number) => { const w = v / (avst(r, c) + ROVARE.platsAvst); if (v >= ROVARE.platsMin && w > bv) { bv = w; b = c; } };
  const hl = handlarLast(s); if (hl) prova({ x: hl.x, y: hl.y }, hl.h.varor.reduce((a, w) => a + grundvarde(w.k) * w.n, 0));
  for (const z of zonesOf(s)) { let v = 0; for (const a of s.stackar ?? []) if (a.n >= 1 && a.x >= z.x && a.x < z.x + z.w && a.y >= z.y && a.y < z.y + z.h) v += grundvarde(a.k) * a.n; prova({ x: z.x + z.w / 2, y: z.y + z.h / 2 }, v); }
  for (const g of s.gravar ?? []) if (g.saker?.length) prova({ x: g.x + 0.5, y: g.y + 0.5 }, gravVarde(g));
  return b;
}
// dit rövaren går när flocken anfaller: hämnden letar hus för hus (f.letar), annars den närmaste lagerplatsen med något i, annars förrådet
function malFor(s: State, f: Rovarflock, r: Person) {
  if (f.gor === 'letar' || f.letar?.length) { const h = f.letar?.length ? husById(s, f.letar[0]) : undefined; if (h) return { x: h.x + h.w / 2, y: h.y + h.h / 2 }; }
  return taPlats(s, r) ?? malet(s);
}
export const ROVARHANDLINGAR: Record<RovarGor, { namn: string; ansikte?: 'arg' | 'lugn' | 'radd'; poang: (c: RCtx) => number; gor: (c: RCtx) => void }> = {
  // till rastplatsen utanför byn, innan flocken anfaller
  tillRast: { namn: 'Går mot rastplatsen', ansikte: 'lugn', poang: c => !c.f.anfaller && c.f.rast && avst(c.r, c.f.rast) > ROVARE.rastR ? 1 : -1, gor: c => { ga(c, c.f.rast!, runtByn(c.s, ROVARE.rundUt)); } }, // runt byn (steg B.16)
  // på rastplatsen: vilar, går omkring lite och pratar med de andra
  // var och en vilar på sin egen plats runt rastplatsen, så att gänget sprider ut sig (steg 10.2.24)
  rasta: { namn: 'Rastar', poang: c => c.f.anfaller ? -1 : ROVARE.rastaPoang, gor: c => { const g = gr(c.r); if (!c.f.rast) return; if (g.vx === undefined && avst(c.r, c.f.rast) <= ROVARE.rastR && !iVatten(c.s, c.r.x, c.r.y) && !rovarna(c.s, c.f).some(q => q !== c.r && avst(q, c.r) < 0.8)) { g.vx = c.r.x!; g.vy = c.r.y!; } /* vilar där hen står, om ingen står på samma plats (steg 10.2.94) */ const p = rastPunkt(c); if (avst(c.r, p) > 0.6 && ga(c, p) < 0) g.vx = undefined; } },
  gaOmkring: { namn: 'Går omkring', poang: c => c.f.anfaller || !c.f.rast ? -1 : ROVARE.gaPoang, gor: c => { const d = ga(c, rastPunkt(c)); if (d < 0) gr(c.r).vx = undefined; else if (d < 0.6) gr(c.r).gorTill = 0; } },
  // pratar med den närmaste i gänget: går fram och samtalar i samma samtalssystem som byn, med pratbubbla (steg 10.2.24)
  prata: { namn: 'Pratar', poang: c => c.f.anfaller || c.kvar < 2 ? -1 : ROVARE.prataPoang, gor: c => {
    const o = rovarna(c.s, c.f).filter(q => q !== c.r).sort((a, b) => avst(a, c.r) - avst(b, c.r))[0];
    if (!o) return;
    if (avst(o, c.r) > 1.4) { ga(c, { x: o.x + 0.8, y: o.y }); return; }
    if (rnd(c.s, 'rovare') < c.dt / ROVARE.pratSek) rovarPrat.prata?.(c.s, c.r, o, c.ev); // ungefär ett samtal på pratSek sekunder
  } },
  // mot målet när flocken anfaller
  motMalet: { namn: 'Går mot byn', ansikte: 'lugn', poang: c => c.f.anfaller && !gr(c.r).nojd && !c.f.klar && avst(c.r, c.mal) > ROVARE.nara ? 1 : -1, gor: c => { const g = gr(c.r); if (ga(c, c.mal) >= 0) g.utanVag = undefined; else if (c.s.now - (g.utanVag ??= c.s.now) > ROVARE.utanVag * MIN) g.flytt = true; } }, // ingen väg dit: hen står kvar och prövar igen (steg B.43), och ger upp efter en stund
  // slår den som står i vägen: den som står emot inom ROVARE.moter. Modet drar till striden och övermakten från den
  // den som inte står emot men står i vägen slår bara den aggressiva, när inget annat lockar mer
  sla: { namn: 'Slåss', ansikte: 'arg', poang: c => c.fiende ? 1.5 + ROVARE.slaMod * (stat(c.r, 'mod', c.s.now) - 10) / 10 - ROVARE.slaHot * Math.max(0, c.hot - 1) : c.ivagen ? (ROVARE.slaIvagen + (harLarm(c.s, c.ivagen, c.f) ? 0 : ROVARE.slaOvetande)) * stat(c.r, 'aggression', c.s.now) / 10 + c.brus('sla') * ROVARE.valBrus : -1, gor: c => slaSteg(c) },
  // mötet på vägen (steg 10.2.26): den som inte står emot men är nära kan hotas bort eller bli av med det hen bär, efter modet och
  // målet; annars går rövaren förbi mot byn. Slumpen (valBrus) gör att olika rövare väljer olika
  hota: { namn: 'Hotar', ansikte: 'arg', poang: c => c.ivagen && !c.fiende ? ROVARE.hotaPoang * stat(c.r, 'mod', c.s.now) / 10 + c.brus('hota') * ROVARE.valBrus : -1, gor: c => motet(c, false) },
  taBorda: { namn: 'Tar det hen bär', ansikte: 'arg', poang: c => c.ivagen && !c.fiende && !!c.ivagen.task && isCarrying(c.ivagen.task) ? ROVARE.taBordaPoang * (1 - c.last / ROVARE.bar) + c.brus('taBorda') * ROVARE.valBrus : -1, gor: c => motet(c, true) },
  // tar ur förrådet när ingen står emot i närheten
  ta: { namn: 'Tar ur förrådet', ansikte: 'arg', poang: c => c.f.anfaller && !c.fiende && !gr(c.r).nojd && (avst(c.r, c.mal) <= ROVARE.nara + 0.5 || vidTaPlats(c)) && !c.f.klar ? 1.2 : -1, gor: c => taSteg(c) },
  // bär hem bytet
  // bär hem bytet: när hen tagit det hen orkar eller inget mer finns (nojd), när flocken är klar, eller när någon står emot och hen redan bär något
  baraHem: { namn: 'Bär hem bytet', ansikte: 'radd', poang: c => gr(c.r).nojd || c.f.klar || (c.last > 0 && !!c.fiende) ? 2 : -1, gor: c => hemat(c) },
  // flyr: blodet, övermakten hen ser, modet och hur många i flocken som är kvar
  fly: { namn: 'Flyr', ansikte: 'radd', poang: c => (gr(c.r).flytt ? 3 : -0.6) + ROVARE.flyBlod * (1 - c.r.blod) + ROVARE.flyHot * Math.max(0, c.hot - 1) * (1 - (stat(c.r, 'mod', c.s.now) - 10) / 10) + ROVARE.flyDoda * (1 - c.kvar / Math.max(1, c.f.antal ?? c.kvar)), gor: c => { gr(c.r).flytt = true; hemat(c); } },
};
// platsen där rövaren vilar eller dit hen går omkring (steg B.43): på land kring rastplatsen, som byborna väljer sin (glesPlats), och den
// behålls tills hen väljer något annat eller inte hittar någon väg dit
function rastPunkt(c: RCtx) {
  const g = gr(c.r), m = c.f.rast!;
  if (g.vx === undefined || g.vy === undefined) {
    const at = glesPlats(c.s, c.r, () => { const p = freeNear(c.s, m.x + (rnd(c.s, 'rovare') - 0.5) * 2 * ROVARE.rastR, m.y + (rnd(c.s, 'rovare') - 0.5) * 2 * ROVARE.rastR); return inMap(p.x, p.y) && !iVatten(c.s, p.x, p.y) && !bitAt(c.s, p.x, p.y) ? p : undefined; }) ?? m;
    g.vx = at.x; g.vy = at.y;
  }
  return { x: g.vx, y: g.vy };
}
// på sin egen plats vid målet eller på väg dit, också när den ligger längre från målet (steg B.58)
const vidTaPlats = (c: RCtx) => { const g = gr(c.r), v = g.taVid; return g.gor === 'ta' && !!v && Math.hypot(v.mx - c.mal.x, v.my - c.mal.y) <= 0.5 && avst(c.r, c.mal) <= ROVARE.taUt * 1.5 + 1; };
const RGOR = Object.keys(ROVARHANDLINGAR) as RovarGor[];
// går mot punkten, i en bybos fart med samma vägsökning. Svarar hur långt det är kvar, −1 när det inte finns någon väg
// var och en går mot sin egen plats i klungan runt målet, så att de inte står på samma punkt
function ga(c: RCtx, m: { x: number; y: number }, runt?: Uint8Array) {
  // var och en går sin egen väg bredvid de andra (steg 10.2.25): mot en egen punkt kring målet, lite olika fort, och inte i
  // rutan där en annan i gänget redan står
  const [dx0, dy0] = egenPunkt(c.r), n = clamp((avst(c.r, m) - 3) / 5, 0, 1), dx = dx0 * n, dy = dy0 * n; // nära målet går alla dit
  const k = { x: clamp(m.x + dx, 0.3, W - 0.3), y: clamp(m.y + dy, 0.3, H - 0.3) };
  const upptagen = rovarna(c.s, c.f).some(o => o !== c.r && tileOf(o.x!, o.y!) === tileOf(k.x, k.y)) || personI(c.s, k.x, k.y);
  const fri = !upptagen && farSta(c.s, k.x, k.y) ? gaMot(c.s, c.r, k.x, k.y, c.dt, c.s.now - c.dt * SEC, egenFart(c.r), runt) : -1;
  return fri >= 0 ? fri : gaMot(c.s, c.r, m.x, m.y, c.dt, c.s.now - c.dt * SEC, egenFart(c.r), runt); // ingen väg till den egna punkten: rakt mot målet
}
// rövarens egen punkt kring det gänget går mot (upp till ROVARE.bredvid rutor åt sidan) och egen fart (ROVARE.fartSpann), fasta för var och en
const egenPunkt = (r: Person): [number, number] => { const v = hash3(r.id, 11, 0) * Math.PI * 2, d = ROVARE.bredvid * (0.4 + 0.6 * hash3(r.id, 12, 0)); return [Math.cos(v) * d, Math.sin(v) * d]; };
const sidaOm = (r: Person) => (gr(r).fil ?? (hash3(r.id, 14, 0) - 0.5) * 2) * ROVARE.filBredd; // rutor åt sidan om vägen: var och en sin fil
const egenFart = (r: Person) => 1 - hash3(r.id, 13, 0) * ROVARE.fartSpann; // aldrig fortare än en bybo
// mot kanten som pekar mot grannbyn (steg 11.2.22), annars den närmaste; den som kommer dit är borta från kartan, hem till
// grannbyn (steg 9.2.114)
function hemat(c: RCtx) {
  const { s, f, r } = c;
  // vägen ut väljs en gång (den närmaste kanten som går att nå) och hålls sedan: annars byter hen kant fram och tillbaka vid en sjö,
  // där det finns väg till den närmaste kanten från en ruta men inte från nästa
  const g = gr(r);
  let kvar = g.ut ? ga(c, g.ut) : -1;
  if (kvar < 0) { // ingen väg ut: hen står kvar och prövar alla kanter igen efter en stund (steg B.43)
    g.ut = undefined;
    if (g.utT !== undefined && s.now - g.utT < ROVARE.vagSok * SEC) return;
    g.utT = s.now;
    for (const k of [kantMot(s, f.klan), ...kanterna(r.x, r.y)]) { if (!k) continue; kvar = ga(c, k); if (kvar >= 0) { g.ut = k; g.utT = undefined; break; } }
    if (kvar < 0) return;
  }
  if (f.rad) iFarten(s, r, c.dt); // saker i farten (steg 8.8.3)
  if (kvar >= 0.5) return;
  f.folk = f.folk.filter(id => id !== r.id);
  if (f.fard !== undefined) { f.hemN = (f.hemN ?? 0) + 1; for (const [k, n] of Object.entries(g.bar ?? {})) (f.hemBar ??= {})[k] = (f.hemBar[k] ?? 0) + n; } // det hen bär kommer till byn som skickade flocken
  gastGar(s, r.id, true);
}
// mötet (steg 10.1.14): striden börjar där de möts, och den som redan pågår får en till
// rövaren går fram till den hen mött på vägen och hotar hen bort eller tar det hen bär (steg 10.2.26). Den som hotas ger upp
// en stund (gavSig) och väljer på nytt: hen varnar och går undan
function motet(c: RCtx, ta: boolean) {
  const { s, r } = c, q = c.ivagen!, g = gr(r);
  if (avst(q, r) > 1.5) { (g.foljt ??= {})[q.id] ??= s.now; ga(c, { x: q.x, y: q.y }); return; }
  if (ta && q.task && isCarrying(q.task)) {
    const k = carryKind(q.task.act), n = Math.floor(q.task.carry + 1e-9), bar = (g.bar ??= {});
    if (k && n >= 1) bar[k] = (bar[k] ?? 0) + n;
    for (const [kk, m] of Object.entries(q.task.items ?? {})) if (m >= 1) bar[kk] = (bar[kk] ?? 0) + Math.floor(m);
    q.task.carry = 0; q.task.items = undefined; count(s, 'rovarTogBorda');
    log(s, `En rövare tog det ${q.name} bar.`, 'world', [q.id]);
  } else count(s, 'rovarHotade');
  tanke(q, 'hotadRovare', s.now);
  q.gavSig = s.now; q.larmRoll = undefined; avbryt(s, q); q.task = undefined;
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
  // byn kuvar när fängelset har ledig plats och seden lutar mot Förlikning (steg 11.12.6): då ger rövarna upp i stället för att fly
  const avsikt = fangelseLedigt(s) && s.seder.v.fejd < 0 ? 'kuva' : 'skada';
  const ny = kartStridBorja(s, avsikt, [mot, rov], f.anfall ? 'rövare i byn' : 'rövare vid byn', { typ: 'rovare', egen: true, flock: f.id });
  for (const k of ny.st.kampar) { const p = k.pid !== undefined ? byId(s, k.pid) : undefined; if (p && !p.gast) overtygad(s, f, k, p); if (p?.gast && f.mal !== undefined) k.jagar = f.mal; } // övertygelsen (steg 8.8.8), och hämnden riktar sig mot målet (steg 8.8.5)
  f.strider = (f.strider ?? 0) + 1;
  count(s, 'rovarStrid');
  for (const p of mot) { if (!harLarm(s, p, f)) larmOm(s, p, f, f.gissning ?? f.folk.length, p.larm?.rovare?.led ?? 0, 1); hors(s, p, LARM.hor * (isLight(s.now) ? 1 : LARM.natt)); } // striden hörs: de som slåss ropar
  count(s, 'rovarStridRop');
}
// plundringen (steg 10.1.15): en sak i taget ur lagerplatsen hen står vid, det med högst pris per vikt först
// var och en tar ur förrådet från sin egen plats bredvid det (steg B.49): den närmaste rutan intill målet där ingen annan står eller
// ska stå. Svarar om hen är framme; går det inte att komma dit tar hen där hen står, om ingen annan står i rutan
function paTaPlats(c: RCtx) {
  const { s, f, r, mal } = c, g = gr(r), andra = rovarna(s, f).filter(o => o !== r && !gr(o).flytt);
  const tagen = (x: number, y: number) => andra.some(o => tileOf(o.x, o.y) === tileOf(x, y) || (gr(o).gor === 'ta' && gr(o).taVid && tileOf(gr(o).taVid!.x, gr(o).taVid!.y) === tileOf(x, y))) || personI(s, x, y);
  if (g.taVid && (Math.hypot(g.taVid.mx - mal.x, g.taVid.my - mal.y) > 0.5 || andra.some(o => tileOf(o.x, o.y) === tileOf(g.taVid!.x, g.taVid!.y)))) g.taVid = undefined;
  if (!g.taVid) {
    // rutorna intill målet, den närmaste hen själv först, och när de är tagna de lediga längre från målet, i tur och ordning (steg B.58)
    const fria: { x: number; y: number; p: number }[] = [], n = ROVARE.taUt;
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
      const x = Math.floor(mal.x) + dx + 0.5, y = Math.floor(mal.y) + dy + 0.5, ut = Math.max(0, Math.hypot(x - mal.x, y - mal.y) - ROVARE.nara - 0.4);
      if (farSta(s, x, y) && !tagen(x, y)) fria.push({ x, y, p: 100 * ut + Math.hypot(x - r.x, y - r.y) });
    }
    fria.sort((a, b) => a.p - b.p);
    const at = fria.slice(0, ROVARE.taProv).find(k => tileOf(k.x, k.y) === tileOf(r.x, r.y) || findPath(groundOf(s), r.x, r.y, k.x, k.y)); // dit man kan gå
    if (!at) return true; // ingen ledig ruta: hen tar där hen står
    g.taVid = { x: at.x, y: at.y, mx: mal.x, my: mal.y };
  }
  if (avst(g.taVid, r) < 0.3) return true;
  const kvar = gaMot(s, r, g.taVid.x, g.taVid.y, c.dt, s.now - c.dt * SEC, egenFart(r));
  if (kvar < 0) return true; // ingen väg just nu: hen tar där hen står
  return kvar < 0.3;
}
// en människa i byn står still i rutan (den som går flyttar sig själv)
const personI = (s: State, x: number, y: number) => living(s).some(q => !q.gast && q.ute === undefined && q.task?.phase === 'do' && tileOf(q.x, q.y) === tileOf(x, y));
function taSteg(c: RCtx) {
  const { s, f, r } = c, g = gr(r);
  // hämnden och det heliga kriget (rader.ts): när flocken är framme och ingen står emot gör den det den kom för, en gång
  if (f.skal && !f.radKlar) { f.radKlar = true; if (radSeger(s, f)) { if ((f.gor as string) !== 'letar') { tandaHus(s, f); f.klar = true; } return; } }
  if (f.gor === 'letar' || f.letar?.length) { letaSteg(s, f, c.folk); return; }
  if (huggDorr(s, f, c.folk)) return; // en stängd dörr huggs sönder (steg 8.9.1–8.9.2)
  if (!paTaPlats(c)) return; // till sin egen plats vid förrådet (steg B.49)
  forlustFore(s, 'ran'); // förmögenheten när plundringen börjar (steg 12.1.131)
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
// en stulen karta (steg 11.7.5): rövaren lär sig platserna på den
export function stulenKarta(s: State, r: Person, t: Ting) { for (const x of t.skrift?.platser ?? []) larOrt(s, r, x.nr, x.v, SKRIFT.kartaC, { t: x.t }); }
function taEn(s: State, f: Rovarflock, r: Person) {
  const gavUpp = living(s).some(p => p.task?.act === 'fly' && ageOf(p, s.now) >= ALDER.vuxen); // att fly är att ge upp (steg 8.7.17)
  const bar = ROVARE.bar * (gavUpp ? ROVARE.gerUpp : 1), vikt = lastAv(r);
  const fritt = (k: string) => tingOf(s).find(q => q.k === k && q.bar === undefined && q.hos === undefined && q.lass === undefined);
  const hl = handlarLast(s), vidH = hl && avst(r, hl) <= ROVARE.nara + 1 ? hl.h : undefined; // handlarens last som annat byte (steg 11.11.7)
  const iLast = (q: string) => !!vidH?.varor.some(w => w.k === q && w.n >= 1);
  // vid en grav tas bara det som ligger i den (steg 13.1.5)
  const grav = vidH ? undefined : gravVid(s, r), iGrav = (q: string) => !!grav?.saker?.some(a => a.k === q && a.n >= 1);
  const k = SAK_LIST.filter(q => vikt + viktOf(q) <= bar && (grav ? iGrav(q) : iLast(q) || (SAKER[q]!.redskap ? !!fritt(q) : amountOf(s, q) >= 1))).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a)))[0];
  if (!k) return false;
  if (grav) { const a = grav.saker!.find(x => x.k === k && x.n >= 1)!; a.n -= 1; grav.saker = grav.saker!.filter(x => x.n >= 1); if (!grav.saker.length) grav.saker = undefined; (f.gravTagit ??= {})[k] = (f.gravTagit[k] ?? 0) + 1; count(s, 'rovarGrav'); }
  else if (iLast(k)) { const w = vidH!.varor.find(x => x.k === k && x.n >= 1)!; w.n -= 1; vidH!.varor = vidH!.varor.filter(x => x.n >= 1); count(s, 'rovatHandlare'); }
  else if (SAKER[k]!.redskap) { const t = fritt(k)!; s.ting = s.ting!.filter(q => q !== t); kartaBorta(s, t); stulenKarta(s, r, t); } else addTo(s, k, -1);
  (gr(r).bar ??= {})[k] = (gr(r).bar![k] ?? 0) + 1;
  if (!grav) (f.tagit ??= {})[k] = (f.tagit[k] ?? 0) + 1;
  count(s, 'rovat');
  return true;
}
// flocken har tagit det den vill: en rad om det, boskapen drivs bort, kanske tänds ett hus, och sedan bär de hem
export function taKlart(s: State, f: Rovarflock) {
  if (f.klar) return;
  f.klar = true;
  const drev: string[] = []; // boskapen (steg 9.8.12): varje rövare driver bort ett får eller en get som står ute, det närmaste först
  for (const _r of rovarna(s, f)) { const d = tamUte(s).filter(q => avst(q, f) < ROVARE.boskapR).sort((a, b) => avst(a, f) - avst(b, f))[0]; if (!d) break; tamStulen(s, d); drev.push(`${tamArt(d.art).ord[0]} ${tamArt(d.art).ord[1]}`); }
  const tagna = f.tagit ?? {}, gravar = f.gravTagit ?? {}, tog = [...Object.values(tagna), ...Object.values(gravar)].reduce((a, b) => a + b, 0) + drev.length, tyst = f.sedd === undefined;
  const lista = (m: Record<string, number>) => [...SAK_LIST.filter(k => m[k]).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a))).map(k => antal(m[k], k))];
  const tog_ = lista(tagna), grav_ = lista(gravar); // ur gravarna för sig (steg 13.1.5)
  count(s, 'rovarPlundring'); if (tyst) count(s, 'rovarTyst');
  const vad = [...tog_.length ? [`tog ${och(tog_)} ur förrådet`] : [], ...grav_.length ? [`tog ${och(grav_)} ur gravarna`] : [], ...drev.length ? [`drev bort ${och(drev)} som stod ute`] : []].join(' och '); // djuren stod ute, inte i förrådet (steg 12.1.119)
  const text = tog ? `Rövare ${fran(s, f)} ${tyst ? 'smög in i byn osedda och ' : ''}${vad}.` : `Rövare ${fran(s, f)} kom till förrådet men hittade inget att ta.`;
  log(s, text, 'world'); if (tog) { notis(s, 'motgang', text); kronikaBer(s, 'k_rovare', Math.floor(s.now / HOUR), { fran: fran(s, f), vad, tyst }); allaBarn(s, 'rovarePlundring'); } // mallen (steg 12.1.135)
  tandaHus(s, f); // (steg 8.9.3)
  forlustEfter(s, 'ran'); // (steg 12.1.131)
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
// vapnets skada för var och en räknas en gång per slag och inte för varje rövare (steg 10.2.101: hotet kostade mest i striden)
const vapenMinne = new WeakMap<State, { t: number; m: Map<number, number> }>();
function vapenSkada(s: State, p: Person) {
  let c = vapenMinne.get(s);
  if (!c || c.t !== s.now) vapenMinne.set(s, c = { t: s.now, m: new Map() });
  let v = c.m.get(p.id);
  if (v === undefined) c.m.set(p.id, v = VAPEN[personKampe(s, p, 0, 0, 0, 0).vapen].skada);
  return v;
}
function hotMot(s: State, f: Rovarflock, r: Person, folk: Person[]) {
  const kraft = (p: Person) => 1 + ROVARE.hotVapen * vapenSkada(s, p);
  const de = folk.filter(q => alive(q) && kanStaEmot(s, q) && avst(q, r) < KLOCKA.faraSyn).reduce((a, q) => a + kraft(q), 0);
  const vi = rovarna(s, f).filter(q => !gr(q).flytt && avst(q, r) < KLOCKA.faraSyn).reduce((a, q) => a + kraft(q), 0);
  return de / Math.max(0.5, vi);
}
// De som möter gänget (steg B.17, "Mötet" i fliken Människan): de som hinner till raden före gänget, eller är samlade där byn väntar, om de är många
// och starka nog för sitt mod. De andra väntar, också den som är ensam (steg B.32)
function moterNu(s: State, f: Rovarflock, rad: Person[], fria: Person[], radM: { x: number; y: number }, vantM: { x: number; y: number }) {
  const dg = fria.length ? Math.min(...fria.map(r => avst(r, radM))) : Infinity;
  // räcker de som samlats? (den som bestämt sig för att möta dem tål mer, samlKvar)
  const rack = (l: Person[]) => { if (!l.length) return false; const over = overmakt(s, f.folk.length, f, l) * (l.some(p => p.task?.vantar === false) ? ROVARE.samlKvar : 1); return l.reduce((a, p) => a + motVilja(s, p, over), 0) / l.length >= ROVARE.kampeFran; };
  const hinner = rad.filter(p => avst(p, radM) <= Math.max(ROVARE.samlNara, dg * ROVARE.samlHinner)), samlade = samladGrupp(rad), alla = rad.filter(p => avst(p, vantM) <= ROVARE.samlVag);
  const moter = new Set([...(rack(hinner) ? hinner : []), ...(rack(samlade) ? samlade : [])]);
  // alla som är på väg är framme och de räcker ändå inte: ingen väntar på ingen, rollen väljs om med dem som står där (steg B.47)
  const slut = alla.length > 0 && !moter.size && alla.every(p => samlade.includes(p));
  if (slut) f.ingenMer = medLarm(s, f).length;
  if (slut && !flockStrid(s, f)) for (const p of alla) { p.larmRoll = undefined; if (rollVid(s, p, 'rovare') !== 'kampe') { avbryt(s, p); p.task = undefined; } }
  return moter;
}
// de som är samlade (steg B.33): den största gruppen, räknad från dess egen mitt, så att den som går med de andra räknas var de än är
export function samladGrupp(rad: Person[]) {
  let b: Person[] = [];
  for (const p of rad) { const g = rad.filter(q => avst(q, p) <= ROVARE.samlNara); if (g.length > b.length) b = g; }
  const m = { x: b.reduce((a, q) => a + q.x, 0) / b.length, y: b.reduce((a, q) => a + q.y, 0) / b.length };
  return rad.filter(q => avst(q, m) <= ROVARE.samlNara);
}
// flocken väljer och gör: var och en för sig
// samtalet mellan två rövare (samtal.ts, satt i steg.ts så att filerna inte importerar varandra)
export const rovarPrat: { prata?: (s: State, a: Person, b: Person, ev?: TalkEvent[]) => void } = {};
function flockVal(s: State, f: Rovarflock, folk: Person[], dtSec: number, ev?: TalkEvent[]) {
  f.antal ??= f.folk.length;
  // rastplatsen (steg 10.1.9): utanför byns område på vägen mot förrådet; väntan börjar när alla är framme (steg B.27)
  if (!f.rast) { const m = malet(s); f.rast = lurPlats(s, f, m) ?? { x: f.x, y: f.y }; f.vantat = false; }
  const fo = rovarna(s, f);
  if (!f.anfaller) {
    const gar = fo.filter(r => !gr(r).flytt && kanGa(r) && !iStriden(s, f, r)); // de som är på väg till rastplatsen eller framme
    // den som inte kommer vidare väntar gänget inte på (steg B.44): den utan väg dit, eller som stått still en stund
    for (const r of fo) { const g = gr(r); if (!g.still || Math.hypot(g.still.x - r.x, g.still.y - r.y) > 0.5) g.still = { x: r.x, y: r.y, t: s.now }; }
    const framme = (r: Person) => avst(r, f.rast!) <= ROVARE.rastR * 1.5, fast = (r: Person) => gr(r).ingen !== undefined && s.now - gr(r).still!.t > 5 * SEC || s.now - gr(r).still!.t > ROVARE.stillSek * SEC;
    if (!f.vantat && gar.some(framme) && gar.every(r => framme(r) || fast(r))) { f.vantat = true; f.frammeT = s.now; f.till = s.now + (f.test ? ROVARE.testVanta : mellan(s, ROVARE.lurMin)) * MIN; }
    if (f.vantat && s.now >= f.till) { f.anfaller = true; f.anfallT = s.now; count(s, 'rovarGarTill'); if (isLight(s.now)) count(s, 'rovarGarTillDag'); if (f.sedd !== undefined) { count(s, 'rovarGarTillSedd'); if (isLight(s.now)) count(s, 'rovarGarTillDagSedd'); } } // hur ofta byn sett gänget innan det anfaller (npm run strid)
    if (f.vantat && f.sedd !== undefined) budSteg(s, f, folk);
  }
  // de som står emot och är nära en rövare som slåss ger sig in i striden (steg 10.1.14)
  const strid = flockStrid(s, f);
  if (strid) for (const q of folk) {
    if (!alive(q) || !vaken(q) || q.task?.act === 'strid' || !(forsvarar(q) || q.task?.act === 'vakt') || !vuxenKan(s, q)) continue;
    if (strid.st.kampar.some(k => k.lage === 'strid' && Math.hypot(k.x - q.x, k.y - q.y) < ROVARE.moter)) { taVapen(s, q); kartStridMed(s, strid, q, 0); }
  }
  // de som står emot och vet om gänget (steg 10.2.27 och B.5): de går inte ut mot rövarna utan samlas där gänget är på väg (förrådet,
  // en lagerplats i byns utkant eller elden, malFor), mellan gänget och målet, och väntar. Var och en har sin plats i raden bredvid
  // de andra (ROVARE.radIsar), så att den som kommer senare ställer sig bredvid och ingen möter gänget ensam. Står gänget inne i
  // byns område utan att anfalla går byn emot det (Anfallet nära byn). Striden börjar när en rövare kommer nära, var de än är
  // var och en möter det närmaste gänget, när det finns flera
  const rad = folk.filter(q => alive(q) && vaken(q) && q.task?.act === 'forsvarRovare' && kanStaEmot(s, q) && narmasteFlock(s, q) === f).sort((a, b) => a.id - b.id);
  const fria = fo.filter(x => !gr(x).flytt); // den som flyr jagas inte
  const { ux, uy, mitten, vantM } = radLinje(s, f); // raden har ett mål och ett håll: gängets, inte var och ens närmaste rövares
  const moter = moterNu(s, f, rad, fria, mitten, vantM), star = new Set<number>(); // rutorna i raden som är tagna (steg B.49)
  rad.forEach((q, i) => {
    const r = [...fria].sort((a, b) => avst(a, q) - avst(b, q))[0];
    if (!r || q.task?.act !== 'forsvarRovare') return; // (rollen kan ha valts om nyss, steg B.47)
    const ser = avst(r, q) <= KLOCKA.faraSyn, vet = ser || harLarm(s, q, f);
    if (!vet) return;
    if (avst(r, q) < ROVARE.moter && !flockStrid(s, f)) { slaSteg({ s, f, r, folk, dt: dtSec, mal: r, fiende: q, hot: 1, last: 0, kvar: f.folk.length, brus: () => 0 }); return; } // (striden väljer inget, så inga slumptal)
    const tk = q.task!, mot = f.anfall && !f.anfaller, strid = flockStrid(s, f);
    const sida = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * ROVARE.radIsar;
    const vantar = !strid && !moter.has(q); tk.vantar = vantar;
    let m: { x: number; y: number } = r, why = mot ? 'Rövarna är i byn, går mot dem' : 'Ställer sig mellan rövarna och det de är ute efter';
    if (strid) { // striden pågår: hen går dit och går med i den (steg B.17)
      m = strid.st.kampar.filter(k => k.lage === 'strid' && !k.hjalp).sort((a, b) => a.sida - b.sida || Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y))[0] ?? r; why = 'Går till striden';
    } else if (vantar) { m = { x: vantM.x - uy * sida, y: vantM.y + ux * sida }; why = 'Väntar in de andra'; }
    // platsen i raden: ROVARE.radFram rutor från målet mot gänget, och var och en ROVARE.radIsar rutor från den förra, åt sidan
    else if (!mot) m = { x: mitten.x - uy * sida, y: mitten.y + ux * sida };
    tk.why = why;
    if (Math.hypot(tk.tx - m.x, tk.ty - m.y) > 1.5) { const at = strid || mot && !vantar ? freeNear(s, m.x, m.y) : radRuta(s, m.x, m.y, star); /* man går dit på land, aldrig ut i vattnet */ if (Math.hypot(tk.tx - at.x, tk.ty - at.y) > 0.6) { tk.tx = at.x; tk.ty = at.y; tk.phase = 'go'; tk.path = undefined; tk.pk = undefined; } }
    star.add(tileOf(tk.tx, tk.ty));
  });
  // hjälparna följer raden och står kvar bakom den (steg B.14)
  const hj = folk.filter(q => alive(q) && vaken(q) && q.task?.act === 'hjalpaRovare' && !!q.larm?.rovare && narmasteFlock(s, q) === f), mitt = hj.length ? radMitt(s, f, folk, true) : undefined;
  if (mitt && f.gor !== 'flyr') for (const q of hj) {
    const tk = q.task!, dx = tk.tx - mitt.x, dy = tk.ty - mitt.y, langs = -(dx * mitt.ux + dy * mitt.uy); // rutor bakom raden
    if (Math.abs(langs - ROVARE.bakom) <= ROVARE.radFlytt && Math.hypot(dx, dy) < ROVARE.bakom + ROVARE.radFlytt + hj.length * ROVARE.radIsar) continue;
    const at = radPlats(s, q, f, ROVARE.bakom, folk);
    tk.tx = at.x; tk.ty = at.y; tk.phase = 'go'; tk.path = undefined; tk.pk = undefined;
  }
  // hämnden som letat igenom alla hus utan att hitta den de söker ger sig av (letaSteg, steg 8.8.5)
  if (f.gor === 'letar' && f.anfaller && !f.klar && !f.letar?.length) letaSteg(s, f, folk);
  const lagen: Record<string, number> = {};
  for (const r of fo) {
    if (iStriden(s, f, r)) { lagen.sla = (lagen.sla ?? 0) + 1; gr(r).gor = 'sla'; gr(r).varStrid = true; continue; } // striden på kartan för hen
    const g = gr(r);
    if (g.varStrid && !g.flytt) { const st = flockStrid(s, f); if (!st || st.fri?.includes(r.id)) { if (st?.fri?.includes(r.id)) g.flytt = true; g.varStrid = undefined; } } // den som flytt ur striden flyr
    const narmast1 = (l: Person[]) => l.sort((a, b) => avst(a, r) - avst(b, r))[0];
    const fiende = narmast1(folk.filter(q => alive(q) && vaken(q) && kanStaEmot(s, q) && avst(q, r) < ROVARE.moter));
    const ivagen = fiende ? undefined : narmast1(folk.filter(q => alive(q) && vaken(q) && !starEmot(q) && !gavSigNyss(s, q) && !gomd(s, q) && kanGa(q) && ageOf(q, s.now) >= ALDER.vuxen && avst(q, r) < ROVARE.moter && !(g.foljt?.[q.id] !== undefined && s.now - g.foljt[q.id] > ROVARE.foljSek * SEC))); // den som rövaren ser på vägen (steg 10.2.26), och inte redan följt länge nog (steg B.14)
    if (g.foljt) for (const id in g.foljt) { const q = byId(s, +id); if (!q || avst(q, r) >= ROVARE.moter * 2) delete g.foljt[id]; }
    // slumptalen i valet dras en gång per val: när valets tid är slut eller rövaren ser någon ny (en fiende eller någon i vägen),
    // så att valet inte slumpas om varje slag och ett möte på vägen får sitt slumptal en gång
    const sag = fiende ? fiende.id : ivagen ? -1 - ivagen.id : undefined, nytt = s.now >= (g.gorTill ?? 0) || g.sag !== sag;
    if (nytt || !g.brus) { g.brus = {}; g.sag = sag; }
    const brus = (k: string) => g.brus![k] ??= rnd(s, 'rovare', r); // ur rövarens egen följd, som andra val
    const c: RCtx = { ev, s, f, r, folk, dt: dtSec, mal: malFor(s, f, r), fiende, ivagen, hot: hotMot(s, f, r, folk), last: lastAv(r), kvar: f.folk.length, brus };
    // valet: högst poäng, och det hen redan gör har ett litet försteg; en vila eller en promenad på rastplatsen varar en stund
    let bast: RovarGor = 'rasta', bp = -Infinity;
    const lugn = g.gor === 'rasta' || g.gor === 'gaOmkring' || g.gor === 'prata';
    for (const k of RGOR) {
      let p = ROVARHANDLINGAR[k].poang(c);
      if (p < 0 && k !== 'fly') continue;
      if (k === g.gor && (!lugn || s.now < (g.gorTill ?? 0))) p += ROVARE.valKvar;
      else if (k === 'rasta' || k === 'gaOmkring' || k === 'prata') p += brus(k) * ROVARE.valBrus;
      if (p > bp) { bp = p; bast = k; }
    }
    const bytt = bast !== g.gor;
    if (bytt) { g.gor = bast; g.vx = undefined; g.vy = undefined; g.taTid = 0; }
    if (bytt || nytt) g.gorTill = s.now + mellan(s, ROVARE.rastSek) * SEC; // valet varar en stund, också när rövaren väljer samma igen
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
// ---------- fångarna (steg 11.12.6, "Fångar från striden" i fliken Människan) ----------
// rövaren r ger upp (eller ligger kvar) i en strid där byn kuvar: hen lämnar gänget, lägger ner vapnen och det hen bär, som blir
// byns byte där hen står, och väntar på hur striden slutar
export function geUpp(s: State, r: Person) {
  const g = r.gast; if (!g || g.sort === 'fange') return;
  const f = rovarFlockar(s).find(q => q.folk.includes(r.id));
  if (f) f.folk = f.folk.filter(id => id !== r.id);
  tappar(s, r);
  count(s, 'fange_vapen', gastAvvapna(s, r));
  g.sort = 'fange'; g.gor = undefined; g.flytt = undefined; g.path = undefined; g.pk = undefined; g.ut = undefined;
  r.task = { act: 'fangeVantar', phase: 'do', tx: r.x, ty: r.y, until: s.now + HOUR, carry: 0, why: 'Har gett upp' };
  count(s, 'fange_gav');
}
// striden är slut: vann byn förs de som gett upp till fängelset så länge det har plats; de övriga släpps och går
function tasTillFange(s: State, r: Person, vann: boolean) {
  const h = vann ? fangelseLedigt(s) : undefined;
  if (!h) { r.gast!.fas = 'gar'; count(s, 'fange_slappt'); return; }
  sattIFangelset(s, r, h, 'Tagen till fånga i en strid med rövare', undefined, true);
  r.gast!.tagen = s.now;
  count(s, 'fange_tagen');
}
// fångarnas slag: den som väntar står kvar, den som tagits går till fängelset (till rutan utanför dörren och in) och sitter
// sedan inne som en bybo (fangeVal i fangelse.ts), och den som släppts eller rymt går ut ur byn och hem
function fangeSteg(s: State, dtSec: number) {
  for (const p of gasterNu(s, 'fange')) {
    const g = p.gast!;
    if (!p.fange && g.tagen !== undefined) g.fas = 'gar'; // släppt eller rymd
    if (!p.fange) {
      if (g.fas !== 'gar') continue; // väntar på hur striden slutar
      if (p.task?.act !== 'gaHem') p.task = { act: 'gaHem', phase: 'go', tx: p.x, ty: p.y, until: s.now + DAY, carry: 0, why: 'Går hem' };
      if (!kanGa(p)) continue;
      g.ut ??= kantMot(s, g.klan) ?? kanterna(p.x, p.y)[0];
      const kvar = gaMot(s, p, g.ut.x, g.ut.y, dtSec, s.now - dtSec * SEC);
      if (kvar === 0 || Math.min(p.x, W - p.x, p.y, H - p.y) <= 0.31) { gastGar(s, p.id, true); count(s, 'fange_gick'); }
      continue;
    }
    if (p.task?.act === 'buren') continue; // bärs till fängelset (vardVal i halsa.ts)
    if (!p.task || s.now >= p.task.until || (p.task.act !== 'fangen' && p.task.act !== 'rymma')) {
      if (!fangeVal(s, p)) continue;
    }
    const t = p.task!;
    if (t.phase === 'go') {
      const h = husById(s, p.fange.hus), d = h && fangelseDorr(s, h);
      if (!d || roomAt(s, Math.floor(p.x), Math.floor(p.y))?.hus === h!.id) { p.x = t.tx; p.y = t.ty; t.phase = 'do'; spara(s, p, s.now); continue; }
      if (!kanGa(p)) continue; // den sårade ligger tills hen kan gå
      const ute = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: d.x + dx, y: d.y + dy })).find(q => inMap(q.x, q.y) && roomAt(s, q.x, q.y)?.hus !== h!.id && !bitAt(s, q.x + 0.5, q.y + 0.5)) ?? { x: d.x, y: d.y + 1 };
      const kvar = gaMot(s, p, ute.x + 0.5, ute.y + 0.5, dtSec, s.now - dtSec * SEC);
      if (kvar === 0) { p.x = t.tx; p.y = t.ty; t.phase = 'do'; spara(s, p, s.now); count(s, 'fange_in'); }
    } else if (t.act === 'rymma' && s.now >= t.until) brytKlar(s, p, t.ref);
  }
}
// fången som inte kan gå bärs till rutan inne vid fängelsets dörr (bara i halsa.ts); undefined = hen är redan inne
export function fangeMal(s: State, q: Person): { x: number; y: number } | undefined {
  const h = q.fange && husById(s, q.fange.hus), d = h && fangelseDorr(s, h);
  if (!h || !d || roomAt(s, Math.floor(q.x), Math.floor(q.y))?.hus === h.id) return undefined;
  const inne = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: d.x + dx, y: d.y + dy })).find(t => roomAt(s, t.x, t.y)?.hus === h.id);
  return inne && { x: inne.x + 0.5, y: inne.y + 0.5 };
}
// striden med rövarna är slut (EFTER i efterstrid.ts): raden om den, klanen och tankarna. Såren och de döda är redan på riktigt
// övertygelsen i det heliga kriget (steg 8.8.8) läggs till modet och till stridsmodet, som räknas ur modet när striden börjar,
// också för den som kommer till striden senare (MED, steg 12.1.58)
function overtygad(s: State, f: Rovarflock, k: Kampe, p: Person) {
  const o = 20 * overtygelse(s, f, p);
  if (o <= 0) return;
  k.st.mod += o; k.modNu = Math.min(1, k.modNu + o / 20 * STRID.modMod);
}
MED.rovare = (s, e, k, p) => { const f = rovarFlockar(s).find(q => q.id === e.flock); if (f && !p.gast) overtygad(s, f, k as Kampe, p); };
EFTER.rovare = (s, e, vinnare, strid) => {
  const g = strid as KartStrid, st = g.st, f = rovarFlockar(s).find(q => q.id === e.flock);
  const bybor = st.kampar.filter(k => k.sida === 0).map(k => ({ k, p: k.pid !== undefined ? byId(s, k.pid) : undefined })), rov = st.kampar.filter(k => k.sida === 1);
  const doda = rov.filter(k => k.lage === 'dod').length, svara: string[] = [];
  if (st.avsikt === 'kuva') { // fångarna (steg 11.12.6): de som gett upp eller ligger kvar
    let tagna = 0;
    for (const k of rov) {
      const r = k.pid !== undefined ? gastAv(s, k.pid) : undefined;
      if (!r || r.died !== undefined || (k.lage !== 'ger' && k.lage !== 'nere' && r.gast!.sort !== 'fange')) continue;
      geUpp(s, r); tasTillFange(s, r, vinnare === 0);
      if (r.fange) tagna++;
    }
    if (tagna) log(s, `Byn tog ${tal(tagna)} rövare till fånga.`, 'world');
  }
  for (const { k, p } of bybor) {
    if (!p || !alive(p)) continue;
    if (k.lage === 'strid') handelse(s, p, 'forsvarade'); else if (k.lage === 'flykt') handelse(s, p, 'sprang'); // (steg 12.1.134)
    if (f && k.lage === 'ger') svarTrohet(s, f, p); // heligt krig (steg 8.8.6)
    if (k.lage !== 'strid') { p.gavSig = s.now; p.larmRoll = undefined; } // den som fallit, flytt eller gett upp vill mindre stå emot, och rollen väljs om (steg 12.1.82)
    efterKampen(s, p, st, k, svara, vinnare === 0 ? 'drevBortRovare' : 'slogsRovare', vinnare === 0);
  }
  const forst = bybor[0]?.k;
  if (forst) blodas(s, forst.x, forst.y, 'jakt', 1);
  const namn = lista(bybor.map(b => b.k.namn)), n = rov.length;
  const dodaBybor = bybor.filter(b => b.k.lage === 'dod').map(b => b.k.namn);
  const text = `${namn} slogs med ${tal(n)} rövare ${f ? fran(s, f) : ''} ${f?.anfall ? 'i byn' : 'vid byn'}. ${doda ? `${stor(tal(doda))} rövare dog. ` : ''}${dodaBybor.length ? `${lista(dodaBybor)} dog. ` : ''}${vinnare === 1 ? `${n > 1 ? 'Rövarna' : 'Rövaren'} vann.` : vinnare === 0 ? `${n > 1 ? 'Rövarna' : 'Rövaren'} flydde.` : 'Ingen vann.'}${svara.length ? ` ${lista(svara)} skadades svårt.` : ''}`.replace(/ +/g, ' ');
  const ids = bybor.map(b => b.k.pid!).filter(x => x !== undefined), plats = forst ? { x: Math.floor(forst.x), y: Math.floor(forst.y) } : undefined;
  if (harSlagits(st)) { log(s, text, 'world', ids); notis(s, 'strid', text, ids, plats); kronika(s, text, 'rovare'); } // (utan ett slag är det ingen strid att skriva om, steg B.18)
  if (f && vinnare === 0) for (const r of rovarna(s, f)) gr(r).flytt = true; // den slagna flocken flyr
  if (vinnare === 0 && s.styre && ledareOf(s)) s.styre.vunna = (s.styre.vunna ?? 0) + 1; // byn slog tillbaka rövarna: en vunnen strid i ledarens framgång (steg 8.3.9, fynd 456)
  if (vinnare === 0) allaBarn(s, 'rovareBort'); // barnen som såg det (steg 12.1.133)
};
// två gäng som slagits (flockarMots): den slagna sidan flyr, och i den andra den som flydde eller gav upp, som mot byn
EFTER.rovarMot = (s, _e, vinnare, strid) => { for (const k of (strid as KartStrid).st.kampar) { const r = k.pid !== undefined ? gastAv(s, k.pid) : undefined; if (r?.gast && r.died === undefined && (k.sida !== vinnare || k.lage === 'flykt' || k.lage === 'ger' || k.lage === 'borta')) gr(r).flytt = true; } };
// en rövare dör i striden (gastKrok i efterstrid.ts): hen ligger kvar med det hen bar, klanen minns det och blir ovänligare
gastKrok.dod = (s, r, av) => {
  const f = rovarFlockar(s).find(q => q.folk.includes(r.id));
  if (!f) return;
  count(s, 'rovarDoda');
  fallenFiende(s, r, r.x, r.y);
  klanMinns(s, f, r, av && !av.gast ? av.id : undefined);
  const k = klanById(s, f.klan); if (k) klanHandelse(s.varld, k, 'dodade');
  r.died = s.now; r.cause = 'i en strid';
  f.folk = f.folk.filter(id => id !== r.id);
  gastGar(s, r.id);
};
gastKrok.spara = (s, r, t) => spara(s, r, t ?? s.now);
gastKrok.ger = (s, r, avsikt) => { if (avsikt === 'kuva') geUpp(s, r); };
// rövare och bybor som kan nå varandra under ett slag, plus synhållet: då går byn i korta steg (FAROR i efterstrid.ts, kanNa i klocka.ts)
// (också medan byn vet om ett gäng som väntar: larmet går led för led och budbäraren springer, och det ska inte ta fem minuter per led)
FAROR.push(s => rovarFlockar(s).some(f => f.folk.length > 0 && (!!f.anfaller || (f.sedd !== undefined && !f.klar) || rovarna(s, f).some(r => living(s).some(q => kanNa(avst(q, r), GANG.fart, GANG.fart))))));
// den fallne ligger kvar med det hen hade, tills någon avrustar hen (steg 8.7.5)
function fallenFiende(s: State, r: Person, x: number, y: number) {
  const g = gr(r), saker: Record<string, number> | undefined = g.bar && Object.keys(g.bar).length ? { ...g.bar } : undefined;
  g.bar = undefined;
  // fiendens egna vapen och plagg ligger kvar på kroppen med kvalitet och slitage tills någon avrustar hen (steg 10.3.6); bytet ligger för sig
  const ting = gastTingOf(s, r).map(t => ({ k: t.k, c: t.c, ...(t.q !== undefined ? { q: t.q } : {}), ...(t.ber ? { ber: t.ber } : {}) })); // ett heligt ting de tagit behåller kvalitet och berättelse (steg 10.3.20)
  s.gastTing = (s.gastTing ?? []).filter(t => t.agare !== r.id);
  kvarlevor(s).push({ id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k: 'fiende', x: Math.floor(x), y: Math.floor(y), t: s.now, vem: -1, namn: r.name, text: r.name, ...(saker ? { saker } : {}), ...(ting.length ? { ting } : {}) });
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
  if (!f.folk.length) flockTom(s, f);
  if (!f.folk.length && s.rovare === f) s.rovare = undefined; // en tom flock bland de andra sållas bort i rovarSteg
}
// flocken är borta från kartan (steg 11.6.20): världens färd får veta hur många som kom hem och vad de bar (byhandling.ts)
export const flockKrok = { slut: (_s: State, _f: Rovarflock) => {} };
function flockTom(s: State, f: Rovarflock) { if (f.fard === undefined) return; flockKrok.slut(s, f); f.fard = undefined; }

// varje slag (steg.ts): en flock kommer, ses, går in mot byn och flyr
export function rovarSteg(s: State, dtSec: number, ev?: TalkEvent[]) {
  fangeSteg(s, dtSec);
  if (!s.rovare && !s.rovareFler?.length) return;
  // alla flockar på kartan går samtidigt (steg 8.7.18): den första (s.rovare) och de som kom medan den var här (rovareFler).
  // Var och en har sin egen strid; den som redan slåss i en strid ger sig inte in i en annan
  const folk = living(s);
  for (const f of rovarFlockar(s)) {
    if (!f) continue;
    if (f.folk.length) { facklaSteg(s, f); seSteg(s, f, folk, dtSec); f.anfall = iByn(s, f); } // facklan på natten, och var och en som har gänget inom synhåll ser det
    if (f.folk.length) flockVal(s, f, folk, dtSec, ev);
  }
  rollByte(s, folk);
  larmBleknar(s, folk, 'rovare');
  varnaSteg(s, folk); // de som varnar hörs, och larmet sprids led för led (steg 10.1.12)
  if (rovarFlockar(s).some(f => f && f.sedd !== undefined && f.gor !== 'flyr')) barnRop(s, folk);
  for (const f of rovarFlockar(s)) if (!f.folk.length) flockTom(s, f);
  if (s.rovare && !s.rovare.folk.length) s.rovare = undefined;
  if (s.rovareFler) { s.rovareFler = s.rovareFler.filter(q => q.folk.length); if (!s.rovare) s.rovare = s.rovareFler.shift(); if (!s.rovareFler.length) s.rovareFler = undefined; }
  lugnar(s, folk);
  if (!s.rovare) for (const q of folk) if (q.larm?.rovare) delete q.larm.rovare; // det sista gänget är borta: ingen fara längre
  // möts flockar från klaner som inte tycker om varandra slåss de
  if (s.rovare) for (const o of s.rovareFler ?? []) flockarMots(s, s.rovare, o);
  for (const f of rovarFlockar(s)) if (f) djurMotRovare(s, f);
}
// två gäng från klaner som inte tycker om varandra och som har varandra inom synhåll är två sidor som kan slåss (steg 10.2.29):
// striden körs på kartan som all annan strid, och stridsmodet och hotet avgör om något av dem drar sig undan
function flockarMots(s: State, a: Rovarflock, b: Rovarflock) {
  if (a.klan === b.klan || flockStrid(s, a) || flockStrid(s, b) || kartStrider(s).some(g => g.efter?.typ === 'rovarMot')) return;
  const ka = klanById(s, a.klan), kb = klanById(s, b.klan);
  if ((ka?.inst ?? 0) > 0 && (kb?.inst ?? 0) > 0) return;
  const ra = rovarna(s, a).filter(r => !gr(r).flytt), rb = rovarna(s, b).filter(r => !gr(r).flytt); // de som flyr från den förra striden är inte med
  if (!ra.some(x => rb.some(y => avst(x, y) < KLOCKA.faraSyn))) return;
  count(s, 'flockarSlass');
  log(s, `Två rövargäng möttes vid byn och slogs med varandra.`, 'world'); kronika(s, 'Två rövargäng slogs med varandra vid byn.', 'rovare');
  kartStridBorja(s, 'skada', [ra, rb], 'två rövargäng', { typ: 'rovarMot' });
}
// djuren bryr sig inte om klanen (steg 8.7.19 och 10.2.29): en björn eller vargflock och ett gäng som har varandra inom synhåll
// slåss på kartan som byborna gör, och varje rövare väljer själv i striden (slåss, fly)
function djurMotRovare(s: State, f: Rovarflock) {
  if (flockStrid(s, f)) return; // inte mitt i striden med byn
  const fo = rovarna(s, f).filter(r => !kartStrider(s).some(g => g.st.kampar.some(k => k.pid === r.id)));
  if (!fo.length) return;
  const nara = (d: { x: number; y: number }) => fo.some(r => avst(r, d) < KLOCKA.faraSyn);
  for (const v of s.vargar ?? []) if (v.vargar.length && v.gor !== 'ater' && v.gor !== 'flyr' && nara(v) && !vargIStrid(s, v)) { vargStrid(s, v, fo, 'skada', 'nära byn', true); count(s, 'djurMotRovare'); return; }
  const b = bjornarOf(s, s.now).find(d => d.art === 'bjorn');
  const undan = s.bjornUndan && s.now >= s.bjornUndan.fran && s.now < s.bjornUndan.fran + (s.bjornUndan.till - s.bjornUndan.fran) / 3; // den som går bort efter en strid (steg 9.2.30), och flocken som äter eller flyr (steg B.11), anfaller ingen: annars började en ny strid varje sekund (steg B.20)
  if (b && !undan && nara(b) && !djurIKartStrid(s, 'bjorn')) { bjornStrid(s, b.id, fo, false, 'skada'); count(s, 'djurMotRovare'); }
}
// slaget hålls kort medan ett gäng är på kartan (klocka.ts, steg 10.2.14)
SLAGHINDER.push(s => rovarFlockar(s).some(f => f.folk.length > 0) ? KLOCKA.slag : undefined);
