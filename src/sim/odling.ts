import { stubbeOn } from './stubbar';
import { tabortBuske } from './buskar';
import { OMRADE_DELAR, bynsMitt, iByn, omrade, utanforByn } from './omrade';
import { ALDER, ageOf, alive, count, familjOf, forstaGang, gjort, living, log, ovning, stat } from './folk';
import { FYND, richness, takeFrom } from './fynd';
import { kunnighet } from './ekonomi';
import { SNABBARE } from './handlingar';
import { DAY, H, HOUR, HOUR_S, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { getMap, hash } from './karta';
import { groundOf } from './mark';
import { FOREST, VAG } from './vag';
import { knows, tankePa } from './teknik';
import { getable, takeMaterial } from './behov';
import { utsadeKrok } from './ratter';
import { freeTools, nTools, wearTool } from './agande';
import { SAKER } from './saker';
import { PLATS } from './plats';
import { ledig, stationerOf, storlekAv } from './stationer';
import { amountOf, gain } from './lager';
import { temperature, vaxtFaktor } from './vader';
import { TORKA } from './torka';
import { iVattnetNu } from './sjo';
import { ISTID, iIstiden, isLight, kalender } from './tid';
import { tecken } from './religion';

// ---------- odling (steg 2.10.2–) ----------
// Vilda grödor växer på kartan som andra växter: vild rova på ängarna och vilda ärter i skogsbrynet (registret VILDA, lager i
// FYND i fynd.ts). Den som samlar där de växer plockar frön till grödan (rovfrön och ärtfrön i saker.ts, steg 3.10.23.8) och tar
// med sig dem tills byn har så många den vill ha, och får lite mat på köpet (små rötter och ärtor). Fröna kan inte ätas. Bara
// den som plockar vilda frön kommer på tekniken Odling (raden odling i teknik.ts, `nar`),
// och fortare ju fler byn plockat (statistiken vildgrodor, `okar`); det räknas också när byn redan har nog (steg 2.10.11).
//
// Fälten (steg 2.10.3, 2.10.13, 3.10.23): den som kan odla och har frön till ett minsta fält röjer ett fält på jord utanför
// byn, där inga stora träd står: gräs, buskar och ungskog tas bort. Fältet har ingen fast storlek: ägaren gör det så stort
// som familjen behöver (ODLING.rutorPerMun per person) och hen har frön till, i rader från lägret och utåt. Bredden slås fram
// för varje fält (bredder), så att fälten får olika form med sidorna sidaMin–sidaMax rutor. Sedan
// grävs jorden upp, fortare med benspaden, och fröna sås. Man röjer, gräver, sår och skördar en ruta i taget, men gör klart
// hela fältet i ett steg innan nästa börjar; varje ruta tar kort tid, så att en stor by kan ha stora fält. Grödan (GRODOR)
// växer när det är varmt nog, och frost dödar den: mest tål rovorna. Inget växer i istiden. Den mogna grödan skördas av den
// som äger fältet, och det går före förbättringar i valet (val.ts), för den blir övermogen och ruttnar om den står för länge.
// Skörden är mat och nya frön; sedan växer fältet om ägaren behöver och har frön till fler rutor, och jorden grävs upp igen.
// Bara en person sköter ett fält och äger både fältet och skörden (ägandet, beslut), och en familj har ett fält; dör hen
// eller flyttar tar en annan som kan odla över det. Ett fält där ingen arbetat på länge och där inget växer blir gräs igen.
// Arbetet är projektet 'falt' (projekt.ts), handlingen 'odla' med steget som task.tool.
// Under torkan vissnar grödan om ägaren inte vattnar den med vattensäcken (steg 3.8.2, torst.ts). Bördighet och fukt kommer i steg 8.3.1, kompost och fler grödor i 8.3.2.
export const ODLING = balans('odling', {
  villPer: 6, // byn vill ha så mycket av en gröda per invånare; mindre gör grödan mer värd att så (grodorNu)
  froTakt: 6, // frön per arbetstimme på en mycket rik plats (gånger kunnigheten och SNABBARE; 3 före balansen av fas 2, steg 2.12.2)
  froUttag: 0.1, // varje frö tar så här mycket ur platsen
  froLeta: 0.3, // den som samlar går till de vilda grödorna för att plocka frön med VAL.fronChans, om någon ruta har så här mycket (steg 2.10.11)
  vildMat: 0.25, // mat per plockat frö (VILDA mat, steg 3.10.23.8), bara när fröna tas med: mindre per timme än bären
  // fälten (steg 2.10.3, 2.10.13, 3.10.23)
  rutorPerMun: 5, // (äldre) rutor per person; sedan steg 9.7.1 räknas fältets storlek ur förrådsmålen (faltBehov)
  faltForrad: 3.5, // fältet ska ge så här många gånger familjens förrådsmål för mat per skörd (steg 9.7.1) ...
  rutaMat: 3, // ... med så här mycket mat per ruta
  flerAter: 0.4, // en flerårig gröda börjar växa igen härifrån efter skörden (steg 9.7.9)
  skillFart: 20, // färdigheten Odling gör arbetet 1 + odling / skillFart gånger så snabbt (steg 9.7.7) ...
  skillSkord: 40, // ... och skörden 1 + odling / skillSkord gånger så stor ...
  skillOvning: 0.15, // ... och växer så här mycket per arbetad timme på fältet
  pMogen: 5, pRoja: 2, pBereda: 2, pSa: 3, pAvst: 0.05, // poängen för arbetet på en ruta (steg 9.7.1), minus så mycket per ruta bort
  faltMin: 16, faltMax: 64, // ... men minst och högst så här många (2 och 200 före steg 3.10.23); ett nytt fält läggs först när ägaren har frön till faltMin rutor
  sidaMin: 3, sidaMax: 12, // fältets bredd och antalet rader när det har alla rutor det ska ha (steg 3.10.23.2; högst 10 brett före)
  faltStig: 3, // fältet ligger utanför byns område och så många rutor från allt som står, med plats för en stig (steg 3.10.14) ...
  faltTill: 25, // ... och dess första rad högst så här många rutor utanför byns område (omrade.ts, steg 6.2.4; 8 före steg 6.2.9)
  skogKost: 8, // ett vuxet träd på platsen räknas som så många rutor längre bort: det fälls först (steg 3.6.9). Så väljer byn en glänta eller äng en bit bort före skog nära byn (steg 6.2.9; 2 före)
  // arbetet per ruta är kort, så att fälten kan bli stora (Björn efter v107, steg 2.10.13; kortare i steg 3.10.23.4)
  rojaMin: 3, // minuters arbete per ruta att röja gräs, buskar och ungskog (5 före steg 3.10.23)
  beredaMin: 4, // minuters arbete per ruta att gräva upp jorden för hand (8 före steg 3.10.23) ...
  beredaSpade: 4 / 1.5, // ... så här många gånger fortare med benspaden: 1,5 minuter (3,2 före steg 3.10.23) ...
  spadeSlit: 0.0125, // ... som slits så här mycket per ruta
  saMin: 1, // minuters arbete per ruta att så (2 före steg 3.10.23)
  froPerRuta: 1, // frön som sås per ruta (2 före steg 3.10.23.3)
  skordaMin: 2, // minuters arbete per ruta att skörda (3 före steg 3.10.23)
  pass: 90, // man arbetar på fältet högst så här många minuter åt gången
  vaxGrad: 4, // grödan växer bara när det är varmare än så här många grader
  overDygn: 1, // en mogen gröda står så här många dygn innan den börjar bli övermogen ...
  ruttDygn: 1.5, // ... och har sedan ruttnat helt efter så här många dygn till (skörden minskar under tiden)
  grasDygn: 3, // ett fält där ingen arbetat på så här många dygn och där inget växer blir gräs igen
  // på hösten blir nätterna kalla, och grödan hinner inte mogna innan frosten tar den (steg 2.12.2):
  artMarg: 5, // ärter (korn före steg 3.10.23.8) sås bara om de hinner mogna med så här många dygn tillgodo före istiden (1,5 före steg 2.12.2); annars rovor ...
  rovMarg: 3, // ... med så här många dygn tillgodo
  // talen som stod lösa (kodgenomgången 3.10.25), med samma värden
  vildAvst: 8, // platsen för vilda frön är värd hälften så här många rutor från byn
});

// grödorna (steg 2.10.3): sak = det som skördas (saker.ts), fro = fröna den sås med, dygn = hur länge den växer innan den är
// mogen, perRuta = skörden per ruta, fron = frön tillbaka per ruta i snitt (rovorna äts hela, så de ger få; varje ruta ger hela
// frön, froTillbaka), frost = den dör när det blir kallare än så här
export interface GrodaDef { namn: string; sak: string; fro: string; dygn: number; perRuta: number; fron: number; frost: number; tek?: string; fukt: number; bord?: number; varm?: [number, number]; flerarig?: true; ater?: number; plats?: 'falt' | 'kruka' | 'lada' } // plats = var grödan odlas (steg 9.7.16): på fältet (utan värde), i en lerkruka eller i en blomlåda vid huset // ater = hur långt den fleråriga börjar växa igen efter skörden (annars ODLING.flerAter) // flerarig = skördas flera gånger och vilar under istiden (steg 9.7.9) // fukt = den fukt grödan växer bäst i (steg 9.7.3); bord = bördigheten den behöver för att växa alls, varm = temperaturerna den växer bäst i (steg 9.7.8) // tek = tekniken som krävs utöver odlingen
export const GRODOR = {
  rovor: { namn: 'Rovor', sak: 'rovor', fro: 'rovfron', dygn: 3, perRuta: 3, fron: 1.5, frost: -6, fukt: 0.45 }, // snabba och härdiga; 1 eller 2 frön per ruta (steg 3.10.23.3); dygn 2 och perRuta 5 före steg 3.10.23.5; frost -3 före steg 2.12.2
  // ärterna har kornets tal och plats (steg 3.10.23.8; korn kommer tillbaka som säd från handlarna i steg 11.4.2)
  lin: { namn: 'Lin', sak: 'ratlin', fro: 'linfron', dygn: 3, perRuta: 2, fron: 1.5, frost: -3, fukt: 0.6, tek: 'lin' }, // steg 7.7.7: linfrön köps av handlaren
  arter: { namn: 'Ärter', sak: 'arter', fro: 'artfron', dygn: 4, perRuta: 3, fron: 2, frost: -4, fukt: 0.5 },
  lok: { namn: 'Lök', sak: 'lok', fro: 'lok', dygn: 3, perRuta: 3, fron: 1, frost: -4, fukt: 0.55 }, // löken (steg 9.6.20): lökarna är sitt eget utsäde
  kal: { namn: 'Kål', sak: 'kal', fro: 'kalfron', dygn: 4, perRuta: 3, fron: 1, frost: -10, fukt: 0.6, bord: 0.7, varm: [2, 18] }, // steg 9.7.8: kräver gödsel men tål kyla
  bonor: { namn: 'Bönor', sak: 'bonor', fro: 'bonor', dygn: 4, perRuta: 3, fron: 1, frost: -2, fukt: 0.5, varm: [12, 28] }, // protein; vill ha värme
  jordgubbar: { namn: 'Jordgubbar', sak: 'jordgubbar', fro: 'jordgubbsplanta', dygn: 3, perRuta: 2, fron: 0, frost: -30, fukt: 0.55, flerarig: true }, // steg 9.7.9: planteras en gång och ger igen
  appeltrad: { namn: 'Äppelträd', sak: 'appel', fro: 'appelplanta', dygn: 20, perRuta: 4, fron: 0, frost: -40, fukt: 0.5, flerarig: true, ater: 0.85 }, // steg 9.7.13: bär först efter många år, sedan varje år i generationer
  hassel: { namn: 'Hassel', sak: 'notter', fro: 'notter', dygn: 15, perRuta: 3, fron: 0, frost: -40, fukt: 0.45, flerarig: true, ater: 0.85 }, // steg 9.7.14: nötterna plockas en gång om året
  rolleka: { namn: 'Rölleka', sak: 'rolleka', fro: 'rolleka', dygn: 3, perRuta: 2, fron: 0, frost: -30, fukt: 0.5, flerarig: true, plats: 'kruka' }, // steg 9.7.16: örterna i krukor vid husen, inte på fälten
  korn: { namn: 'Korn', sak: 'korn', fro: 'korn', dygn: 4, perRuta: 3, fron: 1, frost: -4, fukt: 0.45, tek: 'sadesodling' }, // säden från handlarna (steg 9.6.11): kornet är sitt eget utsäde // håller länge; dygn 3, perRuta 4 och fron 6 före steg 3.10.23; frost -1 före steg 2.12.2
} satisfies Record<string, GrodaDef>;
export type GrodaSlag = keyof typeof GRODOR;

// fältets steg: namnet i inforutan, och det man gör (task.tool, namnet i handlingen odla). Växer har inget arbete
export const FALT_STEG = {
  roja: { namn: 'Röjs', gor: 'Röjer ett fält' },
  bereda: { namn: 'Ska grävas upp', gor: 'Gräver upp jorden' },
  sa: { namn: 'Ska sås', gor: 'Sår' },
  vaxer: { namn: 'Växer' },
  mogen: { namn: 'Mogen', gor: 'Skördar' },
} as const;
export type FaltSteg = keyof typeof FALT_STEG;
// ett fält: hörnet (x, y) av den första raden, närmast lägret, bredden w, åt vilket håll raderna växer (dir, 1 nedåt och -1
// uppåt), antalet rutor n, ägaren, steget, hur många rutor som är klara i steget och arbetet som är kvar på nästa (ms), hur
// många rutor som såddes, grödan, hur långt den vuxit (0–1), när den mognade och när någon senast arbetade där
// r = rutorna (steg 9.7.1): varje ruta är en enhet med sitt eget steg, sin gröda, hur långt den vuxit, när den mognade och
// arbetet som är kvar på den. Fältets steg, gröda, vuxit och mogen är en sammanfattning av rutorna (sammanfatta), för bilden
export interface Ruta { st: FaltSteg; g?: GrodaSlag; v?: number; m?: number; kvar?: number; fu?: number; sj?: number } // sj = sjuk sedan den tiden (steg 9.7.12) // fu = fukten (steg 9.7.2)
export interface Falt { r?: Ruta[]; id: number; x: number; y: number; w: number; dir: number; n: number; agare: number; steg: FaltSteg; klara: number; kvar: number; sadda?: number; groda?: GrodaSlag; vuxit?: number; mogen?: number; rord: number; vatten?: number; fore?: number[]; bered?: number[]; skott?: number[] } // vatten: hur länge grödan klarar sig under torkan (1 = nyss vattnad, torka.ts)
// fore, bered och skott (steg 3.10.6, rutan i panelen) per ruta k: vad som växte där innan fältet (MARK_FORE), när den bereddes och
// när någon sist arbetade på den
// arbetet per ruta i steget (ms)
const minPer = (steg: FaltSteg) => (steg === 'roja' ? ODLING.rojaMin : steg === 'bereda' ? ODLING.beredaMin : steg === 'sa' ? ODLING.saMin : steg === 'mogen' ? ODLING.skordaMin : 0) * MIN;
const INGA: Falt[] = [];
export const faltOf = (s: State) => s.falt ?? INGA;
export const faltById = (s: State, id?: number) => id === undefined ? undefined : faltOf(s).find(f => f.id === id);
// ruta nummer k på fältet (x, y): raderna fylls från lägret och utåt
const rutaXY = (f: Falt, k: number) => ({ x: f.x + k % f.w, y: f.y + f.dir * Math.floor(k / f.w) });
export const faltRuta = (f: Falt, k: number) => { const r = rutaXY(f, k); return r.y * W + r.x; };
// vad som växte på rutan innan den blev fält (steg 3.10.6), efter trädet på den
export const MARK_FORE = ['Gräs', 'Ungskog', 'Skog'];
function noteraFore(s: State, f: Falt, fran: number) {
  const g = groundOf(s), fore = (f.fore ??= []);
  for (let k = fran; k < f.n; k++) { const tr = g.trees[faltRuta(f, k)]; fore[k] = tr >= FOREST ? 2 : tr >= VAG.ungskog ? 1 : 0; }
}
export const faltRutor = (f: Falt) => { const r: number[] = []; for (let k = 0; k < f.n; k++) r.push(faltRuta(f, k)); return r; };
// fältet på rutan: rutorna sparas per by tills ett fält läggs till, växer eller försvinner (byggV)
const rutCache = new WeakMap<State, { key: string; at: Map<number, Falt> }>();
export function faltAt(s: State, x: number, y: number) {
  if (!s.falt?.length || !inMap(x, y)) return undefined;
  const key = `${s.byggV ?? 0}:${s.falt.length}:${s.nextFalt ?? 0}`;
  let c = rutCache.get(s);
  if (!c || c.key !== key) { const at = new Map<number, Falt>(); for (const f of s.falt) for (const i of faltRutor(f)) at.set(i, f); c = { key, at }; rutCache.set(s, c); }
  return c.at.get(y * W + x);
}
// vilken ruta i fältet (x, y) är, eller -1
export function faltIndex(f: Falt, x: number, y: number) {
  const dx = x - f.x, rad = (y - f.y) * f.dir, k = rad * f.w + dx;
  return dx >= 0 && dx < f.w && rad >= 0 && k < f.n ? k : -1;
}
// står det en gröda på ruta k: sådd, och inte redan skördad
export const grodaPa = (f: Falt, k: number) => { const r = rutorAv(f)[k]; return !!r && (r.st === 'vaxer' || r.st === 'mogen'); };
// mitten av rutan där arbetet i steget fortsätter
const rutaMitt = (f: Falt, k: number) => { const r = rutaXY(f, k); return { x: r.x + 0.5, y: r.y + 0.5 }; };
// hur långt arbetet i steget kommit (0–1), eller grödan vuxit
export function faltKlar(f: Falt) {
  if (f.steg === 'vaxer') return f.vuxit ?? 0;
  if (f.steg === 'mogen') return 1;
  const r = rutorAv(f);
  return r.length ? r.filter(x => x.st !== f.steg).length / r.length : 1;
}
// skörden som andel av den fulla: den minskar när grödan blivit övermogen
export function skordAndel(s: State, f: Falt, k?: number) {
  const m = k === undefined ? (f.steg === 'mogen' ? f.mogen : undefined) : rutorAv(f)[k]?.st === 'mogen' ? rutorAv(f)[k].m : undefined;
  if (m === undefined) return 0;
  const over = (s.now - m) / DAY - ODLING.overDygn;
  return over <= 0 ? 1 : Math.max(0, 1 - over / ODLING.ruttDygn);
}
// rutorna (steg 9.7.1): ett fält från före steget får sina rutor ur fältets steg
export function rutorAv(f: Falt): Ruta[] {
  if (f.r && f.r.length === f.n) return f.r;
  const r: Ruta[] = f.r ?? [];
  for (let k = r.length; k < f.n; k++) {
    const st = f.steg, klar = k < f.klara, sadd = k < (f.sadda ?? 0);
    r[k] = st === 'roja' ? { st: klar ? 'bereda' : 'roja' } : st === 'bereda' ? { st: klar ? 'sa' : 'bereda' } : st === 'sa' ? (klar && f.groda ? { st: 'vaxer', g: f.groda, v: 0 } : { st: 'sa' })
      : st === 'vaxer' ? (sadd && f.groda ? { st: 'vaxer', g: f.groda, v: f.vuxit ?? 0 } : { st: 'sa' }) : sadd && !klar && f.groda ? { st: 'mogen', g: f.groda, m: f.mogen ?? 0 } : klar ? { st: 'bereda' } : { st: 'sa' };
  }
  f.r = r;
  return r;
}
// fältets steg, gröda och växt som en sammanfattning av rutorna, för bilden och de andra systemen: det mest brådskande steget
const STEG_ORDNING: FaltSteg[] = ['mogen', 'roja', 'bereda', 'sa', 'vaxer'];
export function sammanfatta(f: Falt) {
  const r = rutorAv(f);
  f.steg = STEG_ORDNING.find(st => r.some(x => x.st === st)) ?? 'bereda';
  const vx = r.filter(x => x.st === 'vaxer' || x.st === 'mogen'), n: Record<string, number> = {};
  for (const x of vx) n[x.g!] = (n[x.g!] ?? 0) + 1;
  f.groda = vx.length ? (Object.keys(n) as GrodaSlag[]).sort((a, b) => n[b] - n[a] || a.localeCompare(b))[0] : undefined;
  f.sadda = vx.length || undefined;
  const v = r.filter(x => x.st === 'vaxer');
  f.vuxit = v.length ? v.reduce((a, x) => a + (x.v ?? 0), 0) / v.length : undefined;
  const m = r.filter(x => x.st === 'mogen').map(x => x.m ?? 0);
  f.mogen = m.length ? Math.min(...m) : undefined;
  f.klara = r.filter(x => x.st !== f.steg).length;
  f.kvar = minPer(f.steg);
}
// fält från före steg 2.10.13 (varld.ts) var 2 × 2 rutor, och arbetet räknades för hela fältet
export function migrateFalt(s: State) {
  for (const f of s.falt ?? []) if (f.w === undefined) {
    Object.assign(f, { w: 2, dir: 1, n: 4, klara: 0, kvar: minPer(f.steg) });
    if (f.steg === 'vaxer' || f.steg === 'mogen') f.sadda = 4;
  }
}

// dygn tills istiden börjar (0 i istiden)
function dygnTillIstid(s: State) {
  const k = kalender(s);
  if (iIstiden(k.ai)) return 0;
  return (k.slut - s.now) / DAY + ((ISTID - k.ai - 1 + 8) % 4) * 7;
}
// grödorna som kan sås nu, den bästa först: ärter om de hinner mogna före istiden med marginal, och rovor om de hinner
// Vilken gröda som sås avgörs av en poäng över alla rader i GRODOR (steg 9.6.11): skörden per ruta gånger grundvärdet och hur
// mycket byn saknar av den, för de grödor som hinner mogna före istiden (ärterna med större marginal) och som någon kan odla
export function grodorNu(s: State): GrodaSlag[] {
  const d = dygnTillIstid(s), folk = Math.max(1, living(s).length);
  const kan = (Object.keys(GRODOR) as GrodaSlag[]).filter(g => ((GRODOR[g] as GrodaDef).plats ?? 'falt') === 'falt' && ((GRODOR[g] as GrodaDef).flerarig && d > 0 || d >= GRODOR[g].dygn + (g === 'arter' ? ODLING.artMarg : ODLING.rovMarg)) && /* en flerårig gröda vilar över istiden (steg 9.7.9) */ (!(GRODOR[g] as GrodaDef).tek || living(s).some(p => knows(p, (GRODOR[g] as GrodaDef).tek!))));
  const poang = (g: GrodaSlag) => GRODOR[g].perRuta * grundvarde(GRODOR[g].sak) * clamp(1 - amountOf(s, GRODOR[g].sak) / (folk * ODLING.villPer), 0.1, 1);
  return kan.map(g => ({ g, p: poang(g) })).sort((a, b) => b.p - a.p || a.g.localeCompare(b.g)).map(x => x.g);
}
// kornet (steg 9.6.11): när byn fått sitt första korn av handlarna kommer de som kan odla på sädesodlingen
export function kornUpptackt(s: State) {
  if (amountOf(s, 'korn') <= 0 || living(s).some(p => knows(p, 'sadesodling'))) return;
  const t = TEK.sadesodling, nya = living(s).filter(p => knows(p, 'odling'));
  for (const p of nya) learn(s, p, t);
  if (nya.length && forstaGang(s, 'sadesodling')) log(s, `Byn har fått korn av handlarna, och ${nya[0].name} förstår att det kan sås på fältet.`, 'world', [nya[0].id]);
}
export const grodaNu = (s: State): GrodaSlag | undefined => grodorNu(s)[0];
const kanOdla = (s: State, p: Person) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'odling');
// p:s fält: det hen äger, annars ett som ingen levande äger (den som tar över det blir ägare när arbetet börjar)
export function egetFalt(s: State, p: Person) {
  const fs = faltOf(s);
  return fs.find(f => f.agare === p.id) ?? fs.find(f => !agareLever(s, f));
}
const agareLever = (s: State, f: Falt) => s.people.some(q => q.id === f.agare && alive(q));
// äger någon annan i p:s familj ett fält? En familj har ett fält
const familjFalt = (s: State, p: Person) => familjOf(s, p.id).some(q => q !== p && faltOf(s).some(f => f.agare === q.id));
// så många rutor p:s fält ska ha (steg 9.7.1): familjens matbehov via förrådsmålen (portionerna per dygn gånger förrådets dygn
// och taket), gånger faltForrad, delat med maten per ruta; mellan faltMin och faltMax ...
export const faltBehov = (s: State, p: Person) => clamp(Math.ceil(Math.max(1, familjOf(s, p.id).length) * EKONOMI.matPerDygn * FORRADSMAL.mat.dygn * FORRADSMAL.mat.matt * ODLING.faltForrad / ODLING.rutaMat), ODLING.faltMin, ODLING.faltMax);
// ... och så många hen har frön till med grödan g, eller med den av grödorna som kan sås nu som hen har flest frön till
const froRutor = (s: State, p: Person, g: GrodaSlag) => Math.floor(getable(s, p, GRODOR[g].fro) / ODLING.froPerRuta);
const froNu = (s: State, p: Person) => { let m = 0; for (const g of grodorNu(s)) m = Math.max(m, froRutor(s, p, g)); return m; };
const storlek = (s: State, p: Person) => Math.min(faltBehov(s, p), froNu(s, p));
// bredderna ett nytt fält kan få (steg 3.10.23.2): de där fältet får sidaMin–sidaMax rader när det har alla behov rutor (en rad
// räknas när den är minst halvfull). Den som slås fram ur byns frö och fältets nummer nr kommer först (ingen slump dras, så att
// spelet och ikappräkningen blir lika) och sedan de andra, om den första inte får plats
export function bredder(s: State, nr: number, behov: number) {
  const ok: number[] = [];
  for (let w = ODLING.sidaMin; w <= ODLING.sidaMax; w++) { const r = behov / w; if (r >= ODLING.sidaMin - 0.5 && r <= ODLING.sidaMax) ok.push(w); }
  if (!ok.length) ok.push(ODLING.sidaMin);
  const i = Math.floor(hash(s.seed ^ 0x2f1d, nr, 0) * ok.length);
  return [...ok.slice(i), ...ok.slice(0, i)];
}
// ett fält med bredden w har högst sidaMax rader
const iRader = (w: number, n: number) => Math.min(n, w * ODLING.sidaMax);
// var p:s nya fält läggs och hur brett det blir: den första bredden som får plats
function nyttFalt(s: State, p: Person) {
  const n = storlek(s, p);
  for (const w of bredder(s, (s.nextFalt ?? 0) + 1, faltBehov(s, p))) { const at = faltSite(s, w, iRader(w, n)); if (at) return { ...at, w, n: iRader(w, n) }; }
  return undefined;
}
// åt vilket håll raderna växer från första raden y: bort från lägret
export const faltRiktning = (s: State, y: number) => y + 0.5 >= bynsMitt(s).y ? 1 : -1;
// byns gräns för fälten (steg 3.10.14, byns område från steg 6.2.4): ett fält ligger utanför byns område (omrade.ts) och
// minst faltStig + 1 rutor från allt som står, också latrinen och slaktbänken i utkanten, som inte hör till området men inte
// får något fält inpå sig (nara). Räknas om när något byggs eller området ändras
interface Grans { key: string; nara: Uint8Array }
const gransCache = new WeakMap<State, Grans>();
export function byGrans(s: State): Grans {
  const st = stationerOf(s), key = `${omrade(s).key}:${s.byggV ?? 0}:${st.length}`;
  const c = gransCache.get(s);
  if (c && c.key === key) return c;
  const nara = new Uint8Array(W * H), M = ODLING.faltStig;
  const rekt = (x0: number, y0: number, w: number, h: number) => {
    for (let y = Math.max(0, y0 - M); y <= Math.min(H - 1, y0 + h - 1 + M); y++) for (let x = Math.max(0, x0 - M); x <= Math.min(W - 1, x0 + w - 1 + M); x++) nara[y * W + x] = 1;
  };
  for (const d of Object.values(OMRADE_DELAR)) for (const r of d.rutor(s)) rekt(r.x, r.y, r.w, r.h);
  for (const t of st) { const { w, h } = storlekAv(t); rekt(t.x, t.y, w, h); }
  const g: Grans = { key, nara };
  gransCache.set(s, g);
  return g;
}
// ligger rutan utanför byns område, med plats för en stig emellan?
const utanfor = (s: State, g: Grans, x: number, y: number) => !g.nara[y * W + x] && !iByn(s, x, y);
// kan rutan bli en del av ett fält: jord (inte sand eller sten) utan stora träd, ledig, utanför byns gräns och inte på ett annat fält
function rutaFri(s: State, g: Grans, x: number, y: number) {
  if (!inMap(x, y) || x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  const i = y * W + x, t = getMap(s.seed).tiles[i];
  return (t === T.Gras || t === T.Skog) && (groundOf(s).trees[i] < FOREST || nTools(s, 'yxa') > 0) && utanfor(s, g, x, y) && ledig(s, x, y) && !faltAt(s, x, y) && !(s.hagar ?? []).some(h => x >= h.x - 1 && x <= h.x + h.w && y >= h.y - 1 && y <= h.y + h.h)
    && !(s.angar ?? []).some(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h); // inte på slåtterängen (steg 9.8.9) // inte i en hage eller på dess staket (steg 9.8.4). I skogen fälls träden först, med en yxa (steg 3.6.9)
}

// var ett nytt fält med n rutor och bredden w läggs: alla rutor fria och utanför byns gräns, första raden högst faltTill rutor
// utanför byns område och så nära det som det går (utanforByn), lite ungskog. Samma plats varje gång (ingen slump). Sparas per by och timme (regel 4)
const siteCache = new WeakMap<State, { key: string; at?: { x: number; y: number } }>();
export function faltSite(s: State, w: number, n: number) {
  const key = `${Math.floor(s.now / HOUR)}:${s.byggV ?? 0}:${faltOf(s).length}:${s.stackar?.length ?? 0}:${s.hagar?.length ?? 0}:${s.angar?.length ?? 0}:${w}:${n}`;
  const c = siteCache.get(s);
  if (c && c.key === key) return c.at;
  const at = hittaSite(s, w, n);
  siteCache.set(s, { key, at });
  return at;
}
function hittaSite(s: State, w: number, n: number) {
  const o = omrade(s), gr = byGrans(s), g = groundOf(s), rader = Math.ceil(n / w), b = Math.min(w, n);
  const R = ODLING.faltTill + w + rader + 1;
  let best: { x: number; y: number } | undefined, bs = Infinity;
  for (let y = Math.max(0, o.y0 - R); y <= Math.min(H - 1, o.y1 + R); y++) for (let x = Math.max(0, o.x0 - R); x <= Math.min(W - 1, o.x1 + R); x++) {
    const mx = x + b / 2, my = y + 0.5, u0 = utanforByn(s, mx, my), u = u0 + JORD.vattenKost * Math.min(djupOf(s.seed).land[y * W + x], JORD.vattenMax); // ett fält nära vatten är värt mer (steg 9.7.4)
    if (u0 > ODLING.faltTill || u >= bs) continue; // längre bort än den bästa hittills: blir aldrig bättre
    const ny = { x, y, w, dir: faltRiktning(s, y), n } as Falt;
    let ok = true, unga = 0;
    for (let k = 0; k < n && ok; k++) { const r = rutaXY(ny, k); if (!rutaFri(s, gr, r.x, r.y)) ok = false; else { const tr = g.trees[r.y * W + r.x]; unga += tr >= FOREST ? ODLING.skogKost : tr; if (u + unga >= bs) ok = false; } }
    if (!ok) continue;
    const sc = u + unga;
    if (sc < bs) { bs = sc; best = { x, y }; }
  }
  return best;
}

// uppgiften på fältet för p (projektet falt i projekt.ts, och skörden i val.ts): nästa steg på hens fält, där arbetet
// fortsätter, eller att röja ett nytt om hen inte har något och har frön. Inget i mörkret
// ett träd fälls och en stubbe grävs bort innan rutan röjs (skog.ts, steg 3.6.9 och 6.5.7)
export interface FaltUppgift { tool: FaltSteg; text: string; min: number; spot: { x: number; y: number }; ref?: number; ruta?: number }
// fälten p sköter (steg 9.7.1): ägandet avgör, så hela familjen arbetar på familjens fält; annars ett som ingen levande äger
function familjensFalt(s: State, p: Person) {
  const fam = new Set(familjOf(s, p.id).map(q => q.id)); fam.add(p.id);
  const fs = faltOf(s).filter(f => fam.has(f.agare) && agareLever(s, f));
  if (fs.length) return fs;
  const fri = faltOf(s).find(f => !agareLever(s, f));
  return fri ? [fri] : [];
}
// grödan som sås på en ruta: den med högst poäng (grodorNu, steg 9.6.11) som p har frön till
const grodaRuta = (s: State, p: Person, i?: number) => grodorNu(s).find(g => froRutor(s, p, g) >= 1 && (i === undefined || (GRODOR[g] as GrodaDef).bord === undefined || bordighet(s, i) >= (GRODOR[g] as GrodaDef).bord!)); // en krävande gröda bara på bördig jord (steg 9.7.8)
// poängen för arbetet på ruta k: den mogna först (den övermogna mer bråttom), sedan röjning, sådd och grävning
function rutPoang(s: State, p: Person, f: Falt, k: number) {
  const r = rutorAv(f)[k];
  if (r.st === 'mogen') return ODLING.pMogen * (2 - skordAndel(s, f, k));
  if (r.st === 'roja') return iVagen(s, faltRuta(f, k)) ? 0 : ODLING.pRoja;
  if (r.st === 'bereda') return ODLING.pBereda;
  if (r.st === 'sa') return grodaRuta(s, p, faltRuta(f, k)) ? ODLING.pSa : 0; // en gröda som trivs på just den rutan (steg 9.9.3)
  return 0;
}
// den ruta på fälten fs som ger mest poäng, minus vägen dit (ingen slump: samma i spelet och ikappräkningen)
function bastaRuta(s: State, p: Person, fs: Falt[], st?: FaltSteg) {
  let best: { f: Falt; k: number } | undefined, bp = 0;
  for (const f of fs) for (let k = 0; k < f.n; k++) {
    const r = rutorAv(f)[k];
    if (st && r.st !== st) continue;
    const v = rutPoang(s, p, f, k);
    if (v <= 0) continue;
    const c = rutaMitt(f, k), poang = v - ODLING.pAvst * Math.hypot(c.x - p.x, c.y - p.y);
    if (!best || poang > bp) { best = { f, k }; bp = poang; }
  }
  return best;
}
// det p gör på fältet: den ruta på familjens fält som ger mest poäng, eller att röja ett nytt fält om familjen inget har och
// hen har frön. Inget i mörkret. Ett träd fälls och en stubbe grävs bort innan rutan röjs (skog.ts, steg 3.6.9 och 6.5.7)
const iVagen = (s: State, i: number) => groundOf(s).trees[i] >= FOREST || stubbeOn(s, i % W, Math.floor(i / W));
export function faltUppgift(s: State, p: Person): FaltUppgift | undefined {
  if (!isLight(s.now) || !kanOdla(s, p)) return undefined;
  const fs = familjensFalt(s, p);
  if (fs.length) {
    const b = bastaRuta(s, p, fs);
    if (!b) return undefined;
    const st = rutorAv(b.f)[b.k].st;
    return { tool: st, text: `${(FALT_STEG[st] as { gor?: string }).gor}.`, min: ODLING.pass, spot: rutaMitt(b.f, b.k), ref: b.f.id, ruta: b.k };
  }
  if (familjFalt(s, p) || storlek(s, p) < ODLING.faltMin) return undefined;
  const at = nyttFalt(s, p);
  return at && { tool: 'roja', text: `${FALT_STEG.roja.gor}.`, min: ODLING.pass, spot: { x: at.x + 0.5, y: at.y + 0.5 } };
}
// arbetet på fältet (val.ts): den mogna grödan skördas före förbättringar, och den vars familj har ett fält arbetar på det när
// ingen fara går före. Ett nytt fält är ett projekt (projekt.ts)
export function faltNu(s: State, p: Person, fara: boolean) {
  const u = faltUppgift(s, p);
  if (!u || u.ref === undefined) return undefined;
  if (u.tool === 'mogen') return u;
  const f = faltById(s, u.ref);
  return !fara && f && (f.agare === p.id || familjOf(s, p.id).some(q => q.id === f.agare)) ? u : undefined;
}
// hur stor del av byns fält som har arbete att göra, eller 1 om någon som kan odla har frön men inget fält (projekt.ts)
export function faltBrist(s: State) {
  if (faltOf(s).some(f => rutorAv(f).some(r => r.st !== 'vaxer'))) return 1;
  return grodorNu(s).some(g => amountOf(s, GRODOR[g].fro) >= ODLING.froPerRuta * ODLING.faltMin) && living(s).some(p => kanOdla(s, p) && !egetFalt(s, p) && !familjFalt(s, p)) ? 1 : 0;
}

// fart på fältet: att gräva upp jorden går fortare med benspaden
const fart = (s: State, p: Person, st: FaltSteg) => (st === 'bereda' && freeTools(s, p, 'benspade') ? ODLING.beredaSpade : 1) * (1 + (p.skill.odling ?? 0) / ODLING.skillFart); // färdigheten Odling (steg 9.7.7)
// arbetet som är kvar på rutorna i steget st (ms), utan farten: på sådden bara så många rutor som det finns frön till
function kvarTid(s: State, p: Person, f: Falt, st: FaltSteg) {
  let ms = 0, n = 0;
  const fro = st === 'sa' ? grodorNu(s).reduce((a, g) => a + froRutor(s, p, g), 0) : Infinity;
  for (const r of rutorAv(f)) if (r.st === st && n < fro) { ms += r.kvar ?? minPer(st); n++; }
  return ms;
}
// nästa ruta i steget st på fältet, närmast ruta k (den som arbetar står kvar och tar rutorna i ordning)
function nastaI(s: State, p: Person, f: Falt, st: FaltSteg, k: number) {
  const r = rutorAv(f);
  for (let d = 0; d < f.n; d++) for (const j of [k + d, k - d]) {
    if (j < 0 || j >= f.n || r[j].st !== st) continue;
    if (st === 'roja' && iVagen(s, faltRuta(f, j))) continue;
    if (st === 'sa' && !grodaRuta(s, p, faltRuta(f, j))) continue; // ingen gröda trivs på den här rutan: nästa
    return j;
  }
  return -1;
}
// framme (paborjat.ts): arbeta på rutan, eller röja ett nytt fält där det ska ligga, med den bredd som platsen valdes för
// (eller den första som får plats där, om något ändrats sedan). Den som arbetar på ett fält som ingen äger blir ägare
export function startOdla(s: State, p: Person, tk: Task) {
  let f = faltById(s, tk.ref);
  if (!f && tk.tool === 'roja' && !faltOf(s).some(q => q.agare === p.id) && !familjFalt(s, p) && storlek(s, p) >= ODLING.faltMin) {
    const x = Math.floor(tk.tx), y = Math.floor(tk.ty), gr = byGrans(s), at = nyttFalt(s, p);
    const passar = (w: number) => {
      const ny: Falt = { id: 0, x, y, w, dir: faltRiktning(s, y), n: iRader(w, storlek(s, p)), agare: p.id, steg: 'roja', klara: 0, kvar: minPer('roja'), rord: s.now };
      for (let k = 0; k < ny.n; k++) { const r = rutaXY(ny, k); if (!rutaFri(s, gr, r.x, r.y)) return undefined; }
      ny.r = Array.from({ length: ny.n }, () => ({ st: 'roja' as FaltSteg }));
      return ny;
    };
    const ny = at && at.x === x && at.y === y ? passar(at.w) : bredder(s, (s.nextFalt ?? 0) + 1, faltBehov(s, p)).map(passar).find(q => q);
    if (ny) {
      f = ny; f.id = s.nextFalt = (s.nextFalt ?? 0) + 1;
      (s.falt ??= []).push(f);
      noteraFore(s, f, 0);
      s.byggV = (s.byggV ?? 0) + 1; // en ny sak på kartan: platserna räknas om
    }
  }
  const fam = f && (f.agare === p.id || familjOf(s, p.id).some(q => q.id === f!.agare));
  if (!f || tk.tool === 'vaxer' || (!fam && agareLever(s, f))) { tk.ref = undefined; tk.until = s.now; return; }
  const k = nastaI(s, p, f, tk.tool as FaltSteg, tk.fr ?? 0);
  if (k < 0) { tk.ref = undefined; tk.until = s.now; return; }
  if (!agareLever(s, f)) f.agare = p.id;
  f.rord = s.now;
  tk.ref = f.id; tk.fr = k; tk.until = s.now + Math.min(ODLING.pass * MIN, kvarTid(s, p, f, tk.tool as FaltSteg) / fart(s, p, tk.tool as FaltSteg));
}
// medan man arbetar: en ruta i taget i samma steg, närmast den förra. När inga rutor är kvar i steget, eller fröna tar slut, slutar arbetet
export function workOdla(s: State, p: Person, tk: Task, dtSec: number) {
  const f = faltById(s, tk.ref), st = tk.tool as FaltSteg;
  if (!f || st === 'vaxer') { tk.until = s.now; return; }
  let t = dtSec * SEC * fart(s, p, st), k = nastaI(s, p, f, st, tk.fr ?? 0);
  while (t > 0 && k >= 0) {
    const r = rutorAv(f)[k];
    r.kvar ??= minPer(st);
    if (t < r.kvar - 1) { r.kvar -= t; break; } // en millisekund kvar räknas som klar (avrundningen)
    t -= r.kvar; r.kvar = undefined;
    rutaKlar(s, p, f, k);
    k = nastaI(s, p, f, st, k);
  }
  f.rord = s.now;
  ovning(p, 'odling', dtSec / HOUR_S * ODLING.skillOvning * (0.4 + stat(p, 'intelligens', s.now) / 20)); // färdigheten Odling växer (steg 9.7.7)
  if (k < 0) tk.until = s.now; else tk.fr = k;
  sammanfatta(f);
}
// ruta k är klar i sitt steg och går till nästa (steg 9.7.1)
function rutaKlar(s: State, p: Person, f: Falt, k: number) {
  gjort(s, p, 'odlat', 1);
  const r = rutorAv(f)[k], nu = Math.round(s.now); (f.skott ??= [])[k] = nu; if (r.st === 'bereda') (f.bered ??= [])[k] = nu;
  if (r.st === 'roja') {
    const i = faltRuta(f, k), g = groundOf(s); g.trees[i] = 0; g.cover[i] = 0; tabortBuske(g, i); // gräs, buskar och ungskog är borta
    r.st = 'bereda';
    if (forstaGang(s, 'faltForst')) { log(s, `${p.name} röjde byns första fält. Där ska frön sås.`, 'world', [p.id]); p.fame.push('Röjde byns första fält'); }
  } else if (r.st === 'bereda') {
    if (freeTools(s, p, 'benspade') && wearTool(s, p, 'benspade', ODLING.spadeSlit)) { const tr = SAKER.benspade?.trasig; if (tr) count(s, tr.stat); }
    const i = faltRuta(f, k); if (bordighet(s, i) < 1 - REST.godsla / 2 && getable(s, p, 'kompost') >= 1) { takeMaterial(s, p, 'kompost', 1); (s.bord ??= {})[i] = Math.min(1, bordighet(s, i) + REST.godsla); if (s.bord[i] >= 1) delete s.bord[i]; count(s, 'godslat'); } // den färdiga komposten (steg 9.7.6)
    r.st = 'sa';
  } else if (r.st === 'sa') {
    const g = grodaRuta(s, p, faltRuta(f, k));
    if (!g) return;
    takeMaterial(s, p, GRODOR[g].fro, ODLING.froPerRuta); count(s, 'fronSadda', ODLING.froPerRuta); // fröna som såtts (scenariot falt)
    Object.assign(r, { st: 'vaxer', g, v: 0 }); count(s, 'sadd');
    if (forstaGang(s, 'saddForst')) log(s, `${p.name} sådde ${GRODOR[g].namn.toLowerCase()} på fältet.`, 'world', [p.id]);
  } else if (r.st === 'mogen') {
    const d = GRODOR[r.g!], a = skordAndel(s, f, k);
    if (forstaGang(s, 'skord_tecken')) tecken(s, p, 'skord'); else if (a >= 1.5) tecken(s, p, 'dubbelt'); // den första skörden och fältet som gav mycket (steg 8.5.18)
    const b = bordSkord(s, faltRuta(f, k)); utarma(s, faltRuta(f, k)); // bördigheten (steg 9.7.2)
    if (Math.abs((r.fu ?? d.fukt) - d.fukt) < 0.1 && kn(p, 'fukt') < 1) learnK(p, 'fukt', JORD.larFukt, s.now); // den som ser grödan trivas lär sig fukten (steg 9.7.3)
    const sk = 1 + (p.skill.odling ?? 0) / ODLING.skillSkord; // en skicklig odlare får mer (steg 9.7.7)
    if (a > 0) { gain(s, p, d.sak, d.perRuta * a * b * sk); gain(s, p, d.fro, froTillbaka(s, f, k, d, r.m) * a); count(s, 'skord', d.perRuta * a * b * sk); }
    if (forstaGang(s, 'skordForst')) { log(s, `${p.name} skördade byns första ${d.namn.toLowerCase()}.`, 'world', [p.id]); p.fame.push(`Skördade byns första ${d.namn.toLowerCase()}`); }
    gain(s, p, 'vaxtrest', 1); // växtresterna (steg 9.7.5)
    f.r![k] = (d as GrodaDef).flerarig ? { st: 'vaxer', g: r.g, v: (d as GrodaDef).ater ?? ODLING.flerAter, fu: r.fu } : { st: 'bereda' }; // en flerårig gröda växer igen (steg 9.7.9), annars grävs jorden upp
  }
}
// frön tillbaka från ruta k (steg 3.10.23.3): fron är snittet, och rutan ger hela frön, slaget fram ur byns frö, fältet, rutan
// och när grödan mognade (ingen slump dras, så att spelet och ikappräkningen blir lika)
export const froTillbaka = (s: State, f: Falt, k: number, d: GrodaDef, mogen = f.mogen) => Math.floor(d.fron) + (hash(s.seed ^ 0x51f7 ^ Math.imul(f.id, 7919), k, Math.floor((mogen ?? 0) / HOUR)) < d.fron % 1 ? 1 : 0);
// arbetet är slut: behöver ägaren ett större fält och inget på fältet väntar, växer det
export function finishOdla(s: State, p: Person, tk: Task) {
  const f = faltById(s, tk.ref);
  if (!f) return;
  f.rord = s.now;
  if (!rutorAv(f).some(r => r.st === 'roja' || r.st === 'mogen')) storre(s, p, f);
  sammanfatta(f);
}
// behöver ägaren ett större fält och har frön till det, växer fältet med de lediga rutorna i raderna utåt, som röjs först
function storre(s: State, p: Person, f: Falt) {
  const mal = Math.min(ODLING.faltMax, storlek(s, p), iRader(f.w, Infinity));
  let n = f.n;
  const gr = byGrans(s);
  while (n < mal) { const r = rutaXY(f, n); if (!rutaFri(s, gr, r.x, r.y)) break; n++; }
  if (n <= f.n) return;
  const fore = f.n;
  rutorAv(f);
  f.n = n; s.byggV = (s.byggV ?? 0) + 1;
  for (let k = fore; k < n; k++) f.r![k] = { st: 'roja' };
  noteraFore(s, f, fore);
}
// grödan är borta (frost, röta, eld, flod, torka eller tornado) på rutorna (alla med gröda, eller de i rutor): de ska sås igen
function forlorad(s: State, f: Falt, varfor: string, rutor?: Set<number>) {
  const r = rutorAv(f), ks: number[] = [];
  for (let k = 0; k < f.n; k++) if ((r[k].st === 'vaxer' || r[k].st === 'mogen') && (!rutor || rutor.has(faltRuta(f, k)))) ks.push(k);
  if (!ks.length) return;
  const d = GRODOR[r[ks[0]].g!], agare = s.people.find(q => q.id === f.agare);
  log(s, `${varfor} tog ${d.namn.toLowerCase()}na på ${agare ? agare.name + 's' : 'ett'} fält.`, 'world', agare ? [agare.id] : undefined);
  count(s, varfor === 'Sjukdomen' ? 'vaxtsjukDod' : varfor === 'Fåglarna' ? 'fagelAt' : varfor === 'Hararna' ? 'hareAt' : varfor === 'Frosten' ? 'frostdod' : varfor === 'Torkan' ? 'vissnat' : varfor === 'Översvämningen' ? 'drankt falt' : varfor === 'Elden' ? 'brant falt' : varfor === 'Tornadon' ? 'tornado falt' : 'ruttnat');
  for (const k of ks) r[k] = { st: 'sa' };
  if (!r.some(x => x.st === 'vaxer' || x.st === 'mogen')) f.vatten = undefined;
  f.rord = s.now; // gräset börjar ta fältet först nu, när det står utan gröda (inte från sådden)
  sammanfatta(f);
}

// grödan på fältet brann i en eldsvåda (brand.ts, steg 3.8.5)
export function faltBrann(s: State, f: Falt) { forlorad(s, f, 'Elden'); }
// tornadon (steg 6.4.11) förstör grödan på rutorna den går över
export function faltTornado(s: State, rutor: Set<number>) {
  for (const f of faltOf(s)) forlorad(s, f, 'Tornadon', rutor);
}

// varje timme (steg.ts): grödorna växer ruta för ruta när det är varmt nog och dör i frost eller ruttnar, och ett fält där inget
// växer och som ingen sköter blir gräs igen. Inget träd växer på rutorna som röjts
export function stepOdling(s: State) {
  kornUpptackt(s);
  jordTimme(s); // bördigheten och fukten (steg 9.7.2)
  if (!s.falt?.length) return;
  const temp = temperature(s), istid = iIstiden(kalender(s).ai), g = groundOf(s);
  for (const f of [...s.falt]) {
    const r = rutorAv(f);
    for (let k = 0; k < f.n; k++) if (r[k].st !== 'roja') { const i = faltRuta(f, k); g.trees[i] = 0; g.cover[i] = 0; }
    const grodor = r.some(x => x.st === 'vaxer' || x.st === 'mogen');
    if (grodor) {
      const frost = new Set<number>();
      for (let k = 0; k < f.n; k++) if ((r[k].st === 'vaxer' || r[k].st === 'mogen') && !(GRODOR[r[k].g!] as GrodaDef).flerarig && (istid || temp < GRODOR[r[k].g!].frost)) frost.add(faltRuta(f, k)); // den fleråriga vilar i stället (steg 9.7.9)
      if (frost.size) forlorad(s, f, 'Frosten', frost);
      if (s.flod) { const fl = new Set(faltRutor(f).filter(i => iVattnetNu(s, i))); if (fl.size) forlorad(s, f, 'Översvämningen', fl); } // steg 3.8.3 (flod.ts)
      skadedjur(s, f); // fåglarna och hararna (steg 9.7.11)
      vaxtsjukdom(s, f); // växtsjukdomen (steg 9.7.12)
      const rutt = new Set<number>();
      for (let k = 0; k < f.n; k++) if (r[k].st === 'mogen' && skordAndel(s, f, k) <= 0) rutt.add(faltRuta(f, k));
      if (rutt.size) forlorad(s, f, 'Rötan', rutt);
      // under torkan vissnar grödan om ingen vattnar den (steg 3.8.2, torst.ts)
      if (r.some(x => x.st === 'vaxer')) {
        if (s.sjoTorr?.pa) { f.vatten = (f.vatten ?? 1) - 1 / TORKA.falt; if (f.vatten <= 0) forlorad(s, f, 'Torkan'); }
        else f.vatten = undefined;
      }
      if (temp > ODLING.vaxGrad && !istid) for (const x of r) if (x.st === 'vaxer' && x.sj === undefined) { /* en sjuk planta växer inte (steg 9.7.12) */ x.v = Math.min(1, (x.v ?? 0) + vaxtFaktor(s) * fuktFaktor(x.fu, GRODOR[x.g!].fukt) * kravFaktor(s, f, r.indexOf(x), x.g!, temp) / (GRODOR[x.g!].dygn * 24)); if (x.v >= 1) { x.st = 'mogen'; x.m = s.now; x.v = undefined; } } // fortare i blöt mark (steg 2.11.1)
      sammanfatta(f);
      continue;
    }
    if (s.now - f.rord > ODLING.grasDygn * DAY) {
      s.falt = s.falt.filter(q => q !== f);
      s.byggV = (s.byggV ?? 0) + 1;
      log(s, 'Ett fält som ingen skött har vuxit igen med gräs.', 'world');
      count(s, 'faltIgen');
    }
  }
}
// de vilda grödorna (lager i FYND, steg 3.10.23.8): grödan i GRODOR vars frön de ger, och maten man får när man plockar
export const VILDA = {
  vildrova: { groda: 'rovor', mat: 'rotter' }, // små rötter
  arter: { groda: 'arter', mat: 'arter' }, // ärtor
  vildlok: { groda: 'lok', mat: 'lok' },
  hassel: { groda: 'hassel', mat: 'notter', alltid: true }, // den vilda hasseln (steg 9.7.14): nötterna plockas alltid, och kan också sättas // löken (steg 9.6.20): lökarna som sparas sätts på fältet
} satisfies Record<string, { groda: GrodaSlag; mat: string; alltid?: true }>;
const VILDA_IDS = Object.keys(VILDA) as (keyof typeof VILDA)[];
// fröna grödorna sås med
const FROSORTER = [...new Set(Object.values(GRODOR).map(g => g.fro))];

// hur många familjer byn plockar vilda frön åt (steg 3.10.23.3): de som kan odla och saknar fält. Innan någon i byn kan odla
// räknas alla familjer med en vuxen, så att plockandet ger tankar på odling. En gång i timmen (regel 4)
const famCache = new WeakMap<State, { key: number; n: number }>();
export function fronFamiljer(s: State) {
  const key = Math.floor(s.now / HOUR), c = famCache.get(s);
  if (c && c.key === key) return c.n;
  const vuxna = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen), kan = vuxna.some(p => knows(p, 'odling')), sedda = new Set<number>();
  let n = 0;
  for (const p of vuxna) {
    if (sedda.has(p.id) || (kan && !knows(p, 'odling'))) continue;
    for (const q of familjOf(s, p.id)) sedda.add(q.id);
    if (!faltOf(s).some(f => f.agare === p.id) && !familjFalt(s, p)) n++;
  }
  famCache.set(s, { key, n });
  return n;
}
// utsädet (steg 10.2.32): fröna av sorten k till fälten byn har och planerar. Varje fält sås om med sin gröda, och varje familj
// som saknar fält får ett minsta fält, delat på frösorterna. Det sparas (går inte i krukan, brygden eller kvarnen) och plockas
// tills byn har det
export function utsade(s: State, k: string) {
  let rutor = 0;
  for (const f of faltOf(s)) if (f.groda && GRODOR[f.groda].fro === k) rutor += f.n;
  return Math.ceil((rutor + fronFamiljer(s) * ODLING.faltMin / FROSORTER.length) * ODLING.froPerRuta);
}
// har byn nog frön till utsädet, med dem som bärs (bar)
function fronNog(s: State, bar?: Partial<Record<string, number>>) {
  let har = 0, vill = 0;
  for (const k of FROSORTER) { har += amountOf(s, k) + (bar?.[k] ?? 0); vill += utsade(s, k); }
  return har >= vill;
}

// var man plockar vilda frön med flit (val.ts, steg 2.10.11): den rikaste rutan med vilda grödor inom en halv dags gång,
// och närmare är bättre. Ingen när byn har nog frön eller inget växer. Samma plats för alla under timmen (regel 4)
const vildCache = new WeakMap<State, { key: number; at?: { x: number; y: number } }>();
export function vildFronPlats(s: State) {
  if (fronNog(s)) return undefined;
  const key = Math.floor(s.now / HOUR), c = vildCache.get(s);
  if (c && c.key === key) return c.at;
  const mid = bynsMitt(s);
  let at: { x: number; y: number } | undefined, bs = 0;
  for (let y = Math.max(0, Math.floor(mid.y - PLATS.dagY)); y < Math.min(H, mid.y + PLATS.dagY); y++) for (let x = Math.max(0, Math.floor(mid.x - PLATS.dagX)); x < Math.min(W, mid.x + PLATS.dagX); x++) {
    let r = 0;
    for (const k of VILDA_IDS) r += richness(s, k, x + 0.5, y + 0.5);
    if (r < ODLING.froLeta) continue;
    const sc = r / (1 + utanforByn(s, x, y) / ODLING.vildAvst);
    if (sc > bs) { bs = sc; at = { x: x + 0.5, y: y + 0.5 }; }
  }
  vildCache.set(s, { key, at });
  return at;
}

// medan man samlar (UTFALL samla i steg.ts): frön från de vilda grödorna där man står, var och en till sin gröda, och lite mat
// (ODLING.vildMat per frö), och platsen töms lite. Den som plockar tänker på odling (steg 2.10.11). När byn har nog plockar man
// och tänker ändå, men tar inte med sig fler och lämnar platsen. Svaret är det man tar med sig: frön och mat per sak
export function froFynd(s: State, p: Person, tk: Task, dtSec: number) {
  const ta = !fronNog(s, tk.items);
  const sk = kunnighet(p.skill.samla) * SNABBARE * dtSec / HOUR_S, ut: Record<string, number> = {};
  let n = 0;
  for (const k of VILDA_IDS) {
    const r = richness(s, k, tk.tx, tk.ty);
    if (r <= 0) continue;
    const g = ODLING.froTakt * r / FYND[k].topp * sk;
    n += g;
    if (!ta && !(VILDA[k] as { alltid?: true }).alltid) continue; // nötterna är mat och plockas alltid (steg 9.7.14)
    takeFrom(s, k, tk.tx, tk.ty, g * ODLING.froUttag);
    const v = VILDA[k], fro = GRODOR[v.groda].fro;
    ut[fro] = (ut[fro] ?? 0) + g; ut[v.mat] = (ut[v.mat] ?? 0) + g * ODLING.vildMat;
  }
  if (n <= 0) return ut;
  count(s, 'vildgrodor', n);
  tankePa(s, p, 'odling', dtSec);
  if (ta && forstaGang(s, 'froForst')) log(s, `${p.name} tog med sig frön från de vilda grödorna. De går inte att äta.`, 'world', [p.id]);
  return ut;
}
import { TEK, learn } from './teknik';
import { grundvarde } from './varde';
import { EKONOMI } from './ekonomi';
import { FORRADSMAL } from './forradsmal';

// ---------- jordens värden (steg 9.7.2, Odlingen i detalj: Jorden) ----------
// Bördigheten ligger i marken (s.bord, bara de rutor där den inte är full) och finns kvar när fältet växer igen: den sjunker med
// varje skörd och kommer långsamt tillbaka där inget växer. Den drar ner skörden (bordSkord). Fukten finns per ruta på fältet:
// den stiger med regnet och närheten till vatten och sjunker i värmen. Båda syns när man håller musen över rutan
export const JORD = balans('jord', {
  skord: 0.08, // så mycket av bördigheten tar en skörd
  ater: 0.03, // så mycket kommer tillbaka per dygn där inget växer
  minSkord: 0.6, // på helt utarmad jord ger skörden så här stor del
  regn: 0.08, // så mycket fuktigare i timmen när det regnar
  torka: 0.01, // så mycket torrare i timmen vid 15 grader, mer i värme
  nara: 0.03, // fukten dras så här mycket i timmen mot närheten till vatten
  naraRutor: 8, // vatten närmare än så här många rutor gör jorden fuktigare ...
  torrMark: 0.35, // ... och längre bort dras fukten mot så här mycket
  fuktKans: 0.8, fuktMin: 0.4, // grödan växer 1 − fuktKans × skillnaden mot sin bästa fukt gånger så fort, minst fuktMin (steg 9.7.3)
  vattenKost: 0.25, vattenMax: 16, // ett fält räknas så här många rutor längre bort per ruta från vattnet (högst vattenMax), när platsen väljs (steg 9.7.4)
  vattnaMarg: 0.15, // man vattnar rutor som är så här mycket torrare än det man vattnar till
  karlRutor: 5, // en mellanstor lerkruka räcker till så här många rutor (säcken: TORKA.sackRutor)
  gissa: 0.8, // den som inte har lärdomen vattnar till så här blött
  larFukt: 0.1, // så mycket av lärdomen om fukten får den som skördar en ruta som växte i rätt fukt
});
export const bordighet = (s: State, i: number) => s.bord?.[i] ?? 1;
export const bordSkord = (s: State, i: number) => JORD.minSkord + (1 - JORD.minSkord) * bordighet(s, i);
export const fuktAv = (f: Falt, k: number) => rutorAv(f)[k]?.fu ?? 0.5;
// närheten till vatten (0–1): 1 vid stranden
const vattenNara = (s: State, i: number) => JORD.torrMark + (1 - JORD.torrMark) * clamp(1 - djupOf(s.seed).land[i] / JORD.naraRutor, 0, 1); // fukten jorden dras mot
function jordTimme(s: State) {
  const temp = temperature(s), regn = vaderNu(s).nb > 0, odlat = new Set<number>();
  for (const f of faltOf(s)) {
    const r = rutorAv(f);
    for (let k = 0; k < f.n; k++) {
      const i = faltRuta(f, k), x = r[k], fu = x.fu ?? vattenNara(s, i) * 0.5 + 0.25;
      x.fu = clamp(fu + (regn ? JORD.regn : 0) - JORD.torka * Math.max(0.2, 1 + (temp - 15) / 10) + JORD.nara * (vattenNara(s, i) - fu), 0, 1);
      if (x.st === 'vaxer' || x.st === 'mogen') odlat.add(i);
    }
  }
  for (const k in s.bord ?? {}) { const i = Number(k); if (odlat.has(i)) continue; const v = s.bord![i] + JORD.ater / 24; if (v >= 1) delete s.bord![i]; else s.bord![i] = v; }
}
// skörden tar av bördigheten på rutan
function utarma(s: State, i: number) { (s.bord ??= {})[i] = Math.max(0, bordighet(s, i) - JORD.skord); }
import { djupOf } from './sjo';
import { vaderNu } from './vader';

// bästa fukten (steg 9.7.3): grödan växer långsammare ju längre fukten är från den den vill ha
export const fuktFaktor = (fu: number | undefined, ideal: number) => Math.max(JORD.fuktMin, 1 - JORD.fuktKans * Math.abs((fu ?? ideal) - ideal));
// den fukt p vattnar till (steg 9.7.4): den som har lärdomen vattnar till grödans bästa fukt, de andra gissar på blött
export const vattnaTill = (p: Person, g: GrodaSlag) => kn(p, 'fukt') >= 0.5 ? GRODOR[g].fukt : JORD.gissa;
import { kn, learnK } from './kunskap';

// vattningen (steg 9.7.4): rutorna på fältet som växer och är torrare än p vattnar till, de torraste först
export function torraRutor(f: Falt, p: Person) {
  const r = rutorAv(f), ut: number[] = [];
  for (let k = 0; k < f.n; k++) if (r[k].st === 'vaxer' && (r[k].fu ?? 0.5) < vattnaTill(p, r[k].g!) - JORD.vattnaMarg) ut.push(k);
  return ut.sort((a, b) => (r[a].fu ?? 0.5) - (r[b].fu ?? 0.5) || a - b);
}
// p vattnar n rutor med vattnet hen bar dit
export function vattnaRutor(s: State, f: Falt, p: Person, n: number) {
  const r = rutorAv(f), ks = torraRutor(f, p).slice(0, n);
  for (const k of ks) r[k].fu = Math.max(r[k].fu ?? 0, vattnaTill(p, r[k].g!));
  if (ks.length) count(s, 'vattnadeRutor', ks.length);
  return ks.length;
}
import { REST } from './rester';

// grödans krav (steg 9.7.8): en krävande gröda växer inte alls där bördigheten är för låg, och utanför sina temperaturer
// växer den hälften så fort
export function kravFaktor(s: State, f: Falt, k: number, g: GrodaSlag, temp: number) {
  const d = GRODOR[g] as GrodaDef;
  if (d.bord !== undefined && bordighet(s, faltRuta(f, k)) < d.bord) return 0;
  if (d.varm && (temp < d.varm[0] || temp > d.varm[1])) return 0.5;
  return 1;
}

// ---------- staketet (steg 9.7.10, Odlingen i detalj: Det som hotar fältet) ----------
// En byggdel som djuren inte går över: en rad av pinnar och slanor av grenar på rutorna runt fältet. Folk kliver över den.
// Den som kan tekniken Staket och har grenar sätter en ruta i taget (STAKET.min minuter) runt familjens fält, tills fältet är inhägnat
export const STAKET = balans('staket', { min: 3, grenar: 2 });
const staketSet = new WeakMap<State, { n: number; set: Set<number> }>();
export const harStaket = (s: State, i: number) => { const l = s.staket ?? []; let c = staketSet.get(s); if (!c || c.n !== l.length) staketSet.set(s, c = { n: l.length, set: new Set(l) }); return c.set.has(i); };
// rutorna runt fältet (utanför det, på land) som ska ha staket
export function staketRutor(s: State, f: Falt) {
  const egna = new Set(faltRutor(f)), t = getMap(s.seed).tiles, ut: number[] = [];
  for (const i of egna) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = i % W + dx, y = Math.floor(i / W) + dy, j = y * W + x;
    if (!inMap(x, y) || egna.has(j) || t[j] === T.Vatten || ut.includes(j)) continue;
    ut.push(j);
  }
  return ut.sort((a, b) => a - b);
}
export const faltInhagnat = (s: State, f: Falt) => staketRutor(s, f).every(i => harStaket(s, i));
// nästa staketruta p sätter: runt familjens fält, när hen kan tekniken och har grenar
export function staketVal(s: State, p: Person) {
  if (!knows(p, 'staket') || getable(s, p, 'grenar') < STAKET.grenar || !isLight(s.now)) return undefined;
  for (const f of familjensFalt(s, p)) { const i = staketRutor(s, f).find(j => !harStaket(s, j)); if (i !== undefined) return { f, i }; }
  return undefined;
}
export function staketKlar(s: State, p: Person, i?: number) {
  if (i === undefined || harStaket(s, i) || getable(s, p, 'grenar') < STAKET.grenar) return;
  takeMaterial(s, p, 'grenar', STAKET.grenar);
  (s.staket ??= []).push(i); count(s, 'staket');
  if (forstaGang(s, 'staket')) log(s, `${p.name} satte upp byns första staket runt fältet.`, 'world', [p.id]);
}

// ---------- skadedjuren och fågelskrämman (steg 9.7.11) ----------
// Fåglar äter fröna (en ruta som nyss såtts) och harar plantorna (en ruta som vuxit en bit), med en chans per ruta och timme.
// Staketet (faltInhagnat) håller hararna ute och fågelskrämman fåglarna; fåglarna vänjer sig inte vid den. Hararna är fler där
// det finns mycket vilt. Slumpen är slagen ur byns frö, fältet, rutan och timmen, så att spelet och ikappräkningen blir lika
export const SKADEDJUR = balans('skadedjur', {
  fagel: 0.004, // chansen i timmen att fåglarna tar fröna på en ruta som vuxit mindre än fro
  hare: 0.003, // chansen i timmen att hararna tar plantan på en ruta som vuxit mer, gånger viltet på platsen
  fro: 0.2, // så långt har grödan vuxit när den inte längre är frön för fåglarna
  min: 10, // minuter för att sätta upp en fågelskrämma, av grenar och hö
});
export const harSkramma = (s: State, f: Falt) => (s.skramma ?? []).includes(f.id);
function skadedjur(s: State, f: Falt) {
  const r = rutorAv(f), h = Math.floor(s.now / HOUR), fagel = new Set<number>(), hare = new Set<number>(), stangt = faltInhagnat(s, f), skramma = harSkramma(s, f);
  for (let k = 0; k < f.n; k++) {
    if (r[k].st !== 'vaxer' || (GRODOR[r[k].g!] as GrodaDef).flerarig) continue;
    const i = faltRuta(f, k), u = hash(s.seed ^ 0x3a17, i, h), fro = (r[k].v ?? 0) < SKADEDJUR.fro;
    if (fro && !skramma && u < SKADEDJUR.fagel) fagel.add(i);
    else if (!fro && !stangt && u < SKADEDJUR.hare * (0.3 + Math.min(1.2, richness(s, 'jakt', i % W, Math.floor(i / W))))) hare.add(i);
  }
  if (fagel.size) forlorad(s, f, 'Fåglarna', fagel);
  if (hare.size) forlorad(s, f, 'Hararna', hare);
}
// fågelskrämman: den som kan tekniken sätter upp en vid familjens fält som saknar en
export function skrammaVal(s: State, p: Person) {
  if (!knows(p, 'fagelskramma') || getable(s, p, 'grenar') < 2 || getable(s, p, 'torrgras') < 2 || !isLight(s.now)) return undefined;
  return familjensFalt(s, p).find(f => !harSkramma(s, f) && rutorAv(f).some(r => r.st === 'sa' || r.st === 'vaxer'));
}
export function skrammaKlar(s: State, p: Person, id?: number) {
  const f = faltById(s, id);
  if (!f || harSkramma(s, f) || getable(s, p, 'grenar') < 2 || getable(s, p, 'torrgras') < 2) return;
  takeMaterial(s, p, 'grenar', 2); takeMaterial(s, p, 'torrgras', 2);
  (s.skramma ??= []).push(f.id); count(s, 'skramma');
  if (forstaGang(s, 'skramma')) log(s, `${p.name} satte upp byns första fågelskrämma vid fältet.`, 'world', [p.id]);
}

// ---------- växtsjukdomen (steg 9.7.12, Det som hotar fältet) ----------
// En chans per ruta och timme, slagen ur byns frö, rutan och timmen, som stiger med fukten, med sjuka grannrutor och med många
// rutor av samma gröda på fältet, så att blandade grödor minskar risken. En sjuk planta växer inte och dör efter VAXTSJUK.dygn
export const VAXTSJUK = balans('vaxtsjuk', {
  risk: 0.00015, // chansen i timmen för en ruta med medelfukt, utan sjuka grannar och med blandade grödor ...
  fukt: 2, // ... gånger 1 + fukt × (fukten − 0,5) ...
  granne: 1.5, // ... gånger 1 + granne för varje sjuk grannruta ...
  samma: 1.5, // ... gånger 1 + samma × andelen av fältets grödor som är samma gröda
  dygn: 1.5, // så många dygn tills en sjuk planta dör
});
function vaxtsjukdom(s: State, f: Falt) {
  const r = rutorAv(f), h = Math.floor(s.now / HOUR), vx = r.filter(x => x.st === 'vaxer' || x.st === 'mogen'), dod = new Set<number>();
  if (!vx.length) return;
  for (let k = 0; k < f.n; k++) {
    const x = r[k];
    if (x.st !== 'vaxer' && x.st !== 'mogen') continue;
    if (x.sj !== undefined) { if (s.now - x.sj >= VAXTSJUK.dygn * DAY) dod.add(faltRuta(f, k)); continue; }
    const grannar = [k - 1, k + 1, k - f.w, k + f.w].filter(j => j >= 0 && j < f.n && r[j].sj !== undefined).length;
    const samma = vx.filter(y => y.g === x.g).length / vx.length;
    const risk = VAXTSJUK.risk * Math.max(0, 1 + VAXTSJUK.fukt * ((x.fu ?? 0.5) - 0.5)) * (1 + VAXTSJUK.granne * grannar) * (1 + VAXTSJUK.samma * samma);
    if (hash(s.seed ^ 0x5b1c, faltRuta(f, k), h) < risk) { x.sj = s.now; count(s, 'vaxtsjuk'); if (forstaGang(s, 'vaxtsjuk')) log(s, `En sjukdom har kommit på grödan på ett fält. De sjuka plantorna vissnar.`, 'world'); }
  }
  if (dod.size) forlorad(s, f, 'Sjukdomen', dod);
}
utsadeKrok.av = utsade;
