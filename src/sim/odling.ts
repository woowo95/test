import { ALDER, ageOf, alive, count, familjOf, forstaGang, living, log } from './folk';
import { FYND, richness, takeFrom } from './fynd';
import { kunnighet } from './ekonomi';
import { SNABBARE } from './handlingar';
import { DAY, H, HOUR, HOUR_S, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { eldPlats, getMap, hash } from './karta';
import { groundOf } from './mark';
import { FOREST, VAG } from './vag';
import { knows, tankePa } from './teknik';
import { getable, takeMaterial } from './behov';
import { freeTools, nTools, wearTool } from './agande';
import { SAKER } from './saker';
import { PLATS, campCenter, campDist } from './plats';
import { byAvstand, ledig, lekplats, paLek, stationDef, stationerOf, storlekAv } from './stationer';
import { housesOf } from './byggnad';
import { amountOf, gain, zonesOf } from './lager';
import { temperature, vaxtFaktor } from './vader';
import { TORKA } from './torka';
import { iVattnetNu } from './sjo';
import { ISTID, iIstiden, isLight, kalender } from './tid';

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
  froTakt: 6, // frön per arbetstimme på en mycket rik plats (gånger kunnigheten och SNABBARE; 3 före balansen av fas 2, steg 2.12.2)
  froUttag: 0.1, // varje frö tar så här mycket ur platsen
  froLeta: 0.3, // den som samlar går till de vilda grödorna för att plocka frön med VAL.fronChans, om någon ruta har så här mycket (steg 2.10.11)
  vildMat: 0.25, // mat per plockat frö (VILDA mat, steg 3.10.23.8), bara när fröna tas med: mindre per timme än bären
  // fälten (steg 2.10.3, 2.10.13, 3.10.23)
  rutorPerMun: 5, // ett fält ska ha så här många rutor per person i ägarens familj (3 före steg 3.10.23) ...
  faltMin: 16, faltMax: 64, // ... men minst och högst så här många (2 och 200 före steg 3.10.23); ett nytt fält läggs först när ägaren har frön till faltMin rutor
  sidaMin: 3, sidaMax: 12, // fältets bredd och antalet rader när det har alla rutor det ska ha (steg 3.10.23.2; högst 10 brett före)
  faltStig: 3, // fältet ligger utanför byns yttersta hus, station och lagerplats, med så många rutor fritt emellan för en stig (steg 3.10.14) ...
  faltTill: 15, // ... och dess första rad högst så här många rutor från elden (9 från lägret före steg 3.10.14, värdet från 3.10.23.6) ...
  faltUtom: 4, // ... men alltid så här många rutor utanför byns gräns, också när byn är större än så (steg 3.10.14)
  skogKost: 2, // ett vuxet träd på platsen räknas som så många rutor längre bort: det fälls först (steg 3.6.9)
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
  lekStraff: 20, // ett fält på lekplatsen får så här många poäng till (färre är bättre)
  vildAvst: 8, // platsen för vilda frön är värd hälften så här många rutor från byn
});

// grödorna (steg 2.10.3): sak = det som skördas (saker.ts), fro = fröna den sås med, dygn = hur länge den växer innan den är
// mogen, perRuta = skörden per ruta, fron = frön tillbaka per ruta i snitt (rovorna äts hela, så de ger få; varje ruta ger hela
// frön, froTillbaka), frost = den dör när det blir kallare än så här
export interface GrodaDef { namn: string; sak: string; fro: string; dygn: number; perRuta: number; fron: number; frost: number }
export const GRODOR = {
  rovor: { namn: 'Rovor', sak: 'rovor', fro: 'rovfron', dygn: 3, perRuta: 3, fron: 1.5, frost: -6 }, // snabba och härdiga; 1 eller 2 frön per ruta (steg 3.10.23.3); dygn 2 och perRuta 5 före steg 3.10.23.5; frost -3 före steg 2.12.2
  // ärterna har kornets tal och plats (steg 3.10.23.8; korn kommer tillbaka som säd från handlarna i steg 11.4.2)
  arter: { namn: 'Ärter', sak: 'arter', fro: 'artfron', dygn: 4, perRuta: 3, fron: 2, frost: -4 }, // håller länge; dygn 3, perRuta 4 och fron 6 före steg 3.10.23; frost -1 före steg 2.12.2
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
export interface Falt { id: number; x: number; y: number; w: number; dir: number; n: number; agare: number; steg: FaltSteg; klara: number; kvar: number; sadda?: number; groda?: GrodaSlag; vuxit?: number; mogen?: number; rord: number; vatten?: number; fore?: number[]; bered?: number[]; skott?: number[] } // vatten: hur länge grödan klarar sig under torkan (1 = nyss vattnad, torka.ts)
// fore, bered och skott (steg 3.10.6, rutan i panelen) per ruta k: vad som växte där innan fältet (MARK_FORE), när den bereddes och
// när någon sist arbetade på den
// arbetet per ruta i steget (ms)
const minPer = (steg: FaltSteg) => (steg === 'roja' ? ODLING.rojaMin : steg === 'bereda' ? ODLING.beredaMin : steg === 'sa' ? ODLING.saMin : steg === 'mogen' ? ODLING.skordaMin : 0) * MIN;
// så många rutor steget har: alla, utom skörden som bara har de sådda
const antal = (f: Falt) => f.steg === 'mogen' ? f.sadda ?? f.n : f.n;
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
export const grodaPa = (f: Falt, k: number) => (f.steg === 'vaxer' || f.steg === 'mogen') && k >= 0 && k < (f.sadda ?? 0) && !(f.steg === 'mogen' && k < f.klara);
// mitten av rutan där arbetet i steget fortsätter
const nastaRuta = (f: Falt) => { const r = rutaXY(f, Math.min(f.klara, Math.max(0, antal(f) - 1))); return { x: r.x + 0.5, y: r.y + 0.5 }; };
// hur långt arbetet i steget kommit (0–1), eller grödan vuxit
export function faltKlar(f: Falt) {
  if (f.steg === 'vaxer') return f.vuxit ?? 0;
  if (f.steg === 'mogen') return 1;
  const n = antal(f);
  return n ? Math.min(1, (f.klara + (f.klara < n ? 1 - f.kvar / (minPer(f.steg) || 1) : 0)) / n) : 1;
}
// skörden som andel av den fulla: den minskar när grödan blivit övermogen
export function skordAndel(s: State, f: Falt) {
  if (f.steg !== 'mogen' || f.mogen === undefined) return 0;
  const over = (s.now - f.mogen) / DAY - ODLING.overDygn;
  return over <= 0 ? 1 : Math.max(0, 1 - over / ODLING.ruttDygn);
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
export function grodorNu(s: State): GrodaSlag[] {
  const d = dygnTillIstid(s), r: GrodaSlag[] = [];
  if (d >= GRODOR.arter.dygn + ODLING.artMarg) r.push('arter');
  if (d >= GRODOR.rovor.dygn + ODLING.rovMarg) r.push('rovor');
  return r;
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
// så många rutor p:s fält ska ha: rutorPerMun per person i familjen, mellan faltMin och faltMax ...
export const faltBehov = (s: State, p: Person) => clamp(ODLING.rutorPerMun * Math.max(1, familjOf(s, p.id).length), ODLING.faltMin, ODLING.faltMax);
// ... och så många hen har frön till med grödan g, eller med den av grödorna som kan sås nu som hen har flest frön till
const froRutor = (s: State, p: Person, g: GrodaSlag) => Math.floor(getable(s, p, GRODOR[g].fro) / ODLING.froPerRuta);
const froNu = (s: State, p: Person) => { let m = 0; for (const g of grodorNu(s)) m = Math.max(m, froRutor(s, p, g)); return m; };
const storlek = (s: State, p: Person) => Math.min(faltBehov(s, p), froNu(s, p));
// grödan p sår på n rutor: den första som kan sås nu och som hen har frön till alla rutorna med, annars den hen har flest frön till
function grodaFor(s: State, p: Person, n: number): GrodaSlag | undefined {
  let best: GrodaSlag | undefined, bn = 0;
  for (const g of grodorNu(s)) { const r = froRutor(s, p, g); if (r >= n) return g; if (r > bn) { bn = r; best = g; } }
  return best;
}
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
export const faltRiktning = (s: State, y: number) => y + 0.5 >= campCenter(s).y ? 1 : -1;
// byns gräns (steg 3.10.14): hur långt från elden byns yttersta hus, station, lagerplats eller eld står åt varje håll (SEKTORER
// väderstreck, och ett hus räknas också i de två närmaste åt varje sida, så att byn blir rund), och rutorna närmare än
// faltStig + 1 rutor från något av dem (nara). Stationerna i utkanten (latrinen och slaktbänken) flyttar inte gränsen men får
// inget fält inpå sig. Räknas om när något byggs eller lägret ändras
const SEKTORER = 16;
interface Grans { key: string; ut: Float64Array; nara: Uint8Array; fx: number; fy: number }
const gransCache = new WeakMap<State, Grans>();
const sektor = (dx: number, dy: number) => (Math.round(Math.atan2(dy, dx) / (2 * Math.PI) * SEKTORER) + SEKTORER) % SEKTORER;
export function byGrans(s: State): Grans {
  const f = eldPlats(s), hus = housesOf(s), st = stationerOf(s), zs = zonesOf(s);
  const key = `${s.byggV ?? 0}:${f.x},${f.y}:${st.length}:${hus.map(h => `${h.x},${h.y},${h.w},${h.h}`).join(';')}:${zs.map(z => `${z.x},${z.y},${z.w},${z.h}`).join(';')}`;
  const c = gransCache.get(s);
  if (c && c.key === key) return c;
  const ut = new Float64Array(SEKTORER), nara = new Uint8Array(W * H), M = ODLING.faltStig;
  const rekt = (x0: number, y0: number, w: number, h: number, granser: boolean) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (granser) {
        const d = Math.hypot(x - f.x, y - f.y), k = sektor(x - f.x, y - f.y);
        for (let j = -2; j <= 2; j++) { const q = (k + j + SEKTORER) % SEKTORER; if (d > ut[q]) ut[q] = d; }
      }
      for (let yy = Math.max(0, y - M); yy <= Math.min(H - 1, y + M); yy++) for (let xx = Math.max(0, x - M); xx <= Math.min(W - 1, x + M); xx++) nara[yy * W + xx] = 1;
    }
  };
  rekt(f.x, f.y, 1, 1, true);
  for (const z of zs) rekt(z.x, z.y, z.w, z.h, true);
  for (const h of hus) rekt(h.x, h.y, h.w, h.h, true);
  for (const t of st) { const { w, h } = storlekAv(t); rekt(t.x, t.y, w, h, !stationDef(t.k)?.utkant); }
  const g: Grans = { key, ut, nara, fx: f.x, fy: f.y };
  gransCache.set(s, g);
  return g;
}
// ligger rutan utanför byns gräns, med plats för en stig emellan?
const utanfor = (g: Grans, x: number, y: number) => !g.nara[y * W + x] && Math.hypot(x - g.fx, y - g.fy) > g.ut[sektor(x - g.fx, y - g.fy)];
// så långt från elden som fältets första rad får ligga åt det hållet
const tillAt = (g: Grans, x: number, y: number) => Math.max(ODLING.faltTill, g.ut[sektor(x - g.fx, y - g.fy)] + ODLING.faltStig + ODLING.faltUtom);
// kan rutan bli en del av ett fält: jord (inte sand eller sten) utan stora träd, ledig, utanför byns gräns och inte på ett annat fält
function rutaFri(s: State, g: Grans, x: number, y: number) {
  if (!inMap(x, y) || x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  const i = y * W + x, t = getMap(s.seed).tiles[i];
  return (t === T.Gras || t === T.Skog) && (groundOf(s).trees[i] < FOREST || nTools(s, 'yxa') > 0) && utanfor(g, x, y) && ledig(s, x, y) && !faltAt(s, x, y); // i skogen fälls träden först, med en yxa (steg 3.6.9)
}

// var ett nytt fält med n rutor och bredden w läggs: alla rutor fria och utanför byns gräns, första raden högst tillAt rutor
// från elden och så nära byn som det går (byAvstand: lägret och husen, som för stationerna), lite ungskog och inte i
// lekplatsen. Samma plats varje gång (ingen slump). Sparas per by och timme (regel 4)
const siteCache = new WeakMap<State, { key: string; at?: { x: number; y: number } }>();
export function faltSite(s: State, w: number, n: number) {
  const key = `${Math.floor(s.now / HOUR)}:${s.byggV ?? 0}:${faltOf(s).length}:${s.stackar?.length ?? 0}:${w}:${n}`;
  const c = siteCache.get(s);
  if (c && c.key === key) return c.at;
  const at = hittaSite(s, w, n);
  siteCache.set(s, { key, at });
  return at;
}
function hittaSite(s: State, w: number, n: number) {
  const f = eldPlats(s), gr = byGrans(s), g = groundOf(s), lekR = lekplats(s), rader = Math.ceil(n / w), b = Math.min(w, n);
  const R = Math.ceil(Math.max(ODLING.faltTill, ...gr.ut.map(u => u + ODLING.faltStig + ODLING.faltUtom))) + 2;
  let best: { x: number; y: number } | undefined, bs = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = f.x + dx, y = f.y + dy, mx = x + b / 2, my = y + 0.5;
    if (Math.hypot(mx - f.x, my - f.y) > tillAt(gr, mx, my)) continue;
    const ny = { x, y, w, dir: faltRiktning(s, y), n } as Falt;
    let ok = true, unga = 0;
    for (let k = 0; k < n && ok; k++) { const r = rutaXY(ny, k); if (!rutaFri(s, gr, r.x, r.y)) ok = false; else { const tr = g.trees[r.y * W + r.x]; unga += tr >= FOREST ? ODLING.skogKost : tr; } }
    if (!ok) continue;
    const lek = paLek(lekR, x, ny.dir > 0 ? y : y - rader + 1, b, rader) ? ODLING.lekStraff : 0;
    const sc = byAvstand(s, mx, my) + lek + unga;
    if (sc < bs) { bs = sc; best = { x, y }; }
  }
  return best;
}

// uppgiften på fältet för p (projektet falt i projekt.ts, och skörden i val.ts): nästa steg på hens fält, där arbetet
// fortsätter, eller att röja ett nytt om hen inte har något och har frön. Inget i mörkret
export interface FaltUppgift { tool: FaltSteg; text: string; min: number; spot: { x: number; y: number }; ref?: number }
export function faltUppgift(s: State, p: Person): FaltUppgift | undefined {
  if (!isLight(s.now) || !kanOdla(s, p)) return undefined;
  const f = egetFalt(s, p);
  if (f) {
    if (f.steg === 'vaxer') return undefined;
    if (f.steg === 'roja' && f.klara < f.n && groundOf(s).trees[faltRuta(f, f.klara)] >= FOREST) return undefined; // trädet fälls först (skog.ts, steg 3.6.9)
    // sådden: frön till en ruta till, eller att sådden avslutas när fröna tagit slut
    if (f.steg === 'sa' && f.klara === 0 && !grodaFor(s, p, f.n)) return undefined;
    return { tool: f.steg, text: `${FALT_STEG[f.steg].gor}.`, min: ODLING.pass, spot: nastaRuta(f), ref: f.id };
  }
  if (familjFalt(s, p) || storlek(s, p) < ODLING.faltMin) return undefined;
  const at = nyttFalt(s, p);
  return at && { tool: 'roja', text: `${FALT_STEG.roja.gor}.`, min: ODLING.pass, spot: { x: at.x + 0.5, y: at.y + 0.5 } };
}
// arbetet på p:s fält (val.ts): den mogna grödan skördas före förbättringar, och den som har börjat på sitt fält arbetar vidare
// på det tills det är sått, när ingen fara går före. Ett nytt fält är ett projekt (projekt.ts)
export function faltNu(s: State, p: Person, fara: boolean) {
  const u = faltUppgift(s, p);
  if (!u || u.ref === undefined) return undefined;
  if (u.tool === 'mogen') return u;
  return !fara && faltById(s, u.ref)?.agare === p.id ? u : undefined;
}
// hur stor del av byns fält som har arbete att göra, eller 1 om någon som kan odla har frön men inget fält (projekt.ts)
export function faltBrist(s: State) {
  const fs = faltOf(s), arbete = fs.filter(f => f.steg !== 'vaxer').length;
  if (arbete) return 1;
  return grodorNu(s).some(g => amountOf(s, GRODOR[g].fro) >= ODLING.froPerRuta * ODLING.faltMin) && living(s).some(p => kanOdla(s, p) && !egetFalt(s, p) && !familjFalt(s, p)) ? 1 : 0;
}

// fart på fältet: att gräva upp jorden går fortare med benspaden
const fart = (s: State, p: Person, f: Falt) => f.steg === 'bereda' && freeTools(s, p, 'benspade') ? ODLING.beredaSpade : 1;
// sådden är slut när nästa ruta inte är påbörjad och fröna inte räcker till den
const froSlut = (s: State, p: Person, f: Falt) => f.steg === 'sa' && f.kvar >= minPer('sa') && (!f.groda || froRutor(s, p, f.groda) < 1);
// arbetet som är kvar i steget (ms), utan farten: på sådden bara så många rutor som det finns frön till
function kvarTid(s: State, p: Person, f: Falt) {
  let n = antal(f) - f.klara;
  if (f.steg === 'sa') n = Math.min(n, (f.groda ? froRutor(s, p, f.groda) : 0) + (f.kvar < minPer('sa') ? 1 : 0));
  return n <= 0 ? 0 : f.kvar + (n - 1) * minPer(f.steg);
}
// framme (paborjat.ts): arbeta vidare på fältet, eller röja ett nytt där det ska ligga, med den bredd som platsen valdes för
// (eller den första som får plats där, om något ändrats sedan). Den som arbetar blir ägare
export function startOdla(s: State, p: Person, tk: Task) {
  let f = faltById(s, tk.ref);
  if (!f && tk.tool === 'roja' && !faltOf(s).some(q => q.agare === p.id) && !familjFalt(s, p) && storlek(s, p) >= ODLING.faltMin) {
    const x = Math.floor(tk.tx), y = Math.floor(tk.ty), gr = byGrans(s), at = nyttFalt(s, p);
    const passar = (w: number) => {
      const ny: Falt = { id: 0, x, y, w, dir: faltRiktning(s, y), n: iRader(w, storlek(s, p)), agare: p.id, steg: 'roja', klara: 0, kvar: minPer('roja'), rord: s.now };
      for (let k = 0; k < ny.n; k++) { const r = rutaXY(ny, k); if (!rutaFri(s, gr, r.x, r.y)) return undefined; }
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
  // en annan som lever hann före och tog över fältet (båda valde samma fält utan ägare)
  if (!f || f.steg !== tk.tool || f.steg === 'vaxer' || (f.agare !== p.id && agareLever(s, f))) { tk.ref = undefined; tk.until = s.now; return; }
  if (f.steg === 'sa' && f.klara === 0) { // grödan väljs när sådden börjar
    const gr = grodaFor(s, p, f.n);
    if (!gr) { tk.ref = undefined; tk.until = s.now; return; }
    f.groda = gr;
  }
  f.agare = p.id; f.rord = s.now;
  tk.ref = f.id; tk.until = s.now + Math.min(ODLING.pass * MIN, kvarTid(s, p, f) / fart(s, p, f));
}
// medan man arbetar: en ruta i taget. När steget är klart, eller fröna tar slut, slutar arbetet
export function workOdla(s: State, p: Person, tk: Task, dtSec: number) {
  const f = faltById(s, tk.ref);
  if (!f || f.steg === 'vaxer' || f.steg !== tk.tool) { tk.until = s.now; return; } // steget ändrades (grödan frös, eller en annan blev klar)
  let t = dtSec * SEC * fart(s, p, f);
  while (t > 0 && f.klara < antal(f) && !froSlut(s, p, f)) {
    if (f.steg === 'roja' && groundOf(s).trees[faltRuta(f, f.klara)] >= FOREST) { tk.until = s.now; break; } // ett träd fälls först (steg 3.6.9)
    if (t < f.kvar - 1) { f.kvar -= t; break; } // en millisekund kvar räknas som klar (avrundningen)
    t -= f.kvar;
    rutaKlar(s, p, f);
    f.klara++; f.kvar = f.klara < antal(f) ? minPer(f.steg) : 0;
  }
  f.rord = s.now;
  if (f.klara >= antal(f) || froSlut(s, p, f)) tk.until = s.now;
}
// en ruta är klar i steget
function rutaKlar(s: State, p: Person, f: Falt) {
  const nu = Math.round(s.now); (f.skott ??= [])[f.klara] = nu; if (f.steg === 'bereda') (f.bered ??= [])[f.klara] = nu;
  if (f.steg === 'roja') { const i = faltRuta(f, f.klara), g = groundOf(s); g.trees[i] = 0; g.cover[i] = 0; } // gräs, buskar och ungskog är borta
  else if (f.steg === 'bereda') { if (freeTools(s, p, 'benspade') && wearTool(s, p, 'benspade', ODLING.spadeSlit)) { const tr = SAKER.benspade?.trasig; if (tr) count(s, tr.stat); } }
  else if (f.steg === 'sa') { takeMaterial(s, p, GRODOR[f.groda!].fro, ODLING.froPerRuta); count(s, 'fronSadda', ODLING.froPerRuta); } // fröna som såtts (scenariot falt)
  else if (f.steg === 'mogen') {
    const d = GRODOR[f.groda!], a = skordAndel(s, f);
    if (a > 0) { gain(s, p, d.sak, d.perRuta * a); gain(s, p, d.fro, froTillbaka(s, f, f.klara, d) * a); count(s, 'skord', d.perRuta * a); }
  }
}
// frön tillbaka från ruta k (steg 3.10.23.3): fron är snittet, och rutan ger hela frön, slaget fram ur byns frö, fältet, rutan
// och när grödan mognade (ingen slump dras, så att spelet och ikappräkningen blir lika)
export const froTillbaka = (s: State, f: Falt, k: number, d: GrodaDef) => Math.floor(d.fron) + (hash(s.seed ^ 0x51f7 ^ Math.imul(f.id, 7919), k, Math.floor((f.mogen ?? 0) / HOUR)) < d.fron % 1 ? 1 : 0);
// arbetet är slut: är steget klart på hela fältet går det till nästa
export function finishOdla(s: State, p: Person, tk: Task) {
  const f = faltById(s, tk.ref);
  if (!f || f.steg === 'vaxer' || f.steg !== tk.tool) return;
  f.rord = s.now;
  if (f.klara < antal(f) && !(f.klara > 0 && froSlut(s, p, f))) return;
  if (f.steg === 'roja') {
    if (forstaGang(s, 'faltForst')) { log(s, `${p.name} röjde byns första fält. Där ska frön sås.`, 'world', [p.id]); p.fame.push('Röjde byns första fält'); }
    nasta(f, 'bereda');
  } else if (f.steg === 'bereda') nasta(f, 'sa');
  else if (f.steg === 'sa') {
    count(s, 'sadd');
    if (forstaGang(s, 'saddForst')) log(s, `${p.name} sådde ${GRODOR[f.groda!].namn.toLowerCase()} på fältet.`, 'world', [p.id]);
    f.sadda = f.klara; nasta(f, 'vaxer'); f.vuxit = 0;
  } else if (f.steg === 'mogen') {
    const d = GRODOR[f.groda!];
    if (forstaGang(s, 'skordForst')) { log(s, `${p.name} skördade byns första ${d.namn.toLowerCase()}.`, 'world', [p.id]); p.fame.push(`Skördade byns första ${d.namn.toLowerCase()}`); }
    f.groda = undefined; f.vuxit = undefined; f.mogen = undefined; f.sadda = undefined;
    storre(s, p, f);
  }
}
function nasta(f: Falt, steg: FaltSteg) { f.steg = steg; f.klara = 0; f.kvar = minPer(steg); }
// efter skörden: behöver ägaren ett större fält och har frön till det, växer det med de lediga rutorna i raderna utåt, som
// röjs först. Annars grävs jorden upp igen
function storre(s: State, p: Person, f: Falt) {
  const mal = Math.min(ODLING.faltMax, storlek(s, p), iRader(f.w, Infinity));
  let n = f.n;
  const gr = byGrans(s);
  while (n < mal) { const r = rutaXY(f, n); if (!rutaFri(s, gr, r.x, r.y)) break; n++; }
  if (n <= f.n) { nasta(f, 'bereda'); return; }
  const fore = f.n;
  f.n = n; s.byggV = (s.byggV ?? 0) + 1;
  noteraFore(s, f, fore);
  nasta(f, 'roja'); f.klara = fore; // de gamla rutorna är redan röjda
}
// grödan är borta (frost eller röta): fröna måste sås igen
function forlorad(s: State, f: Falt, varfor: string) {
  const d = GRODOR[f.groda!], agare = s.people.find(q => q.id === f.agare);
  log(s, `${varfor} tog ${d.namn.toLowerCase()}na på ${agare ? agare.name + 's' : 'ett'} fält.`, 'world', agare ? [agare.id] : undefined);
  count(s, varfor === 'Frosten' ? 'frostdod' : varfor === 'Torkan' ? 'vissnat' : varfor === 'Översvämningen' ? 'drankt falt' : varfor === 'Elden' ? 'brant falt' : 'ruttnat');
  nasta(f, 'sa'); f.vatten = undefined; f.groda = undefined; f.vuxit = undefined; f.mogen = undefined; f.sadda = undefined;
  f.rord = s.now; // gräset börjar ta fältet först nu, när det står utan gröda (inte från sådden)
}

// grödan på fältet brann i en eldsvåda (brand.ts, steg 3.8.5)
export function faltBrann(s: State, f: Falt) { if (f.groda) forlorad(s, f, 'Elden'); }

// varje timme (steg.ts): grödorna växer när det är varmt nog och dör i frost eller ruttnar, och ett fält som ingen sköter
// blir gräs igen. Inget träd växer på rutorna som röjts
export function stepOdling(s: State) {
  if (!s.falt?.length) return;
  const temp = temperature(s), istid = iIstiden(kalender(s).ai), g = groundOf(s);
  for (const f of [...s.falt]) {
    const rojda = f.steg === 'roja' ? f.klara : f.n;
    for (let k = 0; k < rojda; k++) { const i = faltRuta(f, k); g.trees[i] = 0; g.cover[i] = 0; }
    if (f.steg === 'vaxer' || f.steg === 'mogen') {
      const d = GRODOR[f.groda!];
      if (istid || temp < d.frost) { forlorad(s, f, 'Frosten'); continue; }
      if (s.flod && faltRutor(f).some(i => iVattnetNu(s, i))) { forlorad(s, f, 'Översvämningen'); continue; } // steg 3.8.3 (flod.ts)
      if (f.steg === 'mogen') { if (skordAndel(s, f) <= 0) forlorad(s, f, 'Rötan'); continue; }
      // under torkan vissnar grödan om ingen vattnar den (steg 3.8.2, torst.ts)
      if (s.sjoTorr?.pa) { f.vatten = (f.vatten ?? 1) - 1 / TORKA.falt; if (f.vatten <= 0) { forlorad(s, f, 'Torkan'); continue; } }
      else f.vatten = undefined;
      if (temp > ODLING.vaxGrad) f.vuxit = Math.min(1, (f.vuxit ?? 0) + vaxtFaktor(s) / (d.dygn * 24)); // fortare i blöt mark (steg 2.11.1)
      if (f.vuxit! >= 1) { nasta(f, 'mogen'); f.mogen = s.now; }
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
} satisfies Record<string, { groda: GrodaSlag; mat: string }>;
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
// har byn nog frön, med dem som bärs (bar): frön till ett minsta fält för varje sådan familj
function fronNog(s: State, bar?: Partial<Record<string, number>>) {
  let falt = 0;
  for (const k of FROSORTER) falt += Math.floor((amountOf(s, k) + (bar?.[k] ?? 0)) / (ODLING.froPerRuta * ODLING.faltMin));
  return falt >= fronFamiljer(s);
}

// var man plockar vilda frön med flit (val.ts, steg 2.10.11): den rikaste rutan med vilda grödor inom en halv dags gång,
// och närmare är bättre. Ingen när byn har nog frön eller inget växer. Samma plats för alla under timmen (regel 4)
const vildCache = new WeakMap<State, { key: number; at?: { x: number; y: number } }>();
export function vildFronPlats(s: State) {
  if (fronNog(s)) return undefined;
  const key = Math.floor(s.now / HOUR), c = vildCache.get(s);
  if (c && c.key === key) return c.at;
  const mid = campCenter(s);
  let at: { x: number; y: number } | undefined, bs = 0;
  for (let y = Math.max(0, Math.floor(mid.y - PLATS.dagY)); y < Math.min(H, mid.y + PLATS.dagY); y++) for (let x = Math.max(0, Math.floor(mid.x - PLATS.dagX)); x < Math.min(W, mid.x + PLATS.dagX); x++) {
    let r = 0;
    for (const k of VILDA_IDS) r += richness(s, k, x + 0.5, y + 0.5);
    if (r < ODLING.froLeta) continue;
    const sc = r / (1 + campDist(s, x, y) / ODLING.vildAvst);
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
    if (!ta) continue;
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
