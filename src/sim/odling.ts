import { ALDER, ageOf, alive, count, familjOf, forstaGang, living, log } from './folk';
import { FYND, richness, takeFrom } from './fynd';
import { amountOf, gain } from './lager';
import { kunnighet } from './ekonomi';
import { SNABBARE } from './handlingar';
import { DAY, H, HOUR, HOUR_S, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { clamp } from './slump';
import { eldPlats, getMap } from './karta';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { knows, tankePa } from './teknik';
import { getable, takeMaterial } from './behov';
import { freeTools, wearTool } from './agande';
import { SAKER } from './saker';
import { PLATS, campCenter, campDist } from './plats';
import { ledig, lekplats, paLek } from './stationer';
import { temperature, vaxtFaktor } from './vader';
import { ISTID, iIstiden, isLight, kalender } from './tid';

// ---------- odling (steg 2.10.2–) ----------
// Vilda grödor växer på kartan som andra växter: vildkorn på ängarna och vilda ärter i skogsbrynet (lagren i VILDA, rader i
// FYND i fynd.ts). Den som samlar där de växer plockar frön (fron i saker.ts) och tar med sig dem tills byn har så många den
// vill ha. Fröna kan inte ätas. Bara den som plockar vilda frön kommer på tekniken Odling (raden odling i teknik.ts, `nar`),
// och fortare ju fler byn plockat (statistiken vildgrodor, `okar`); det räknas också när byn redan har nog (steg 2.10.11).
//
// Fälten (steg 2.10.3, 2.10.13): den som kan odla och har frön röjer ett fält på jord nära byn, där inga stora träd står:
// gräs, buskar och ungskog tas bort. Fältet har ingen fast storlek: ägaren gör det så stort som familjen behöver
// (ODLING.rutorPerMun per person) och hen har frön till, i rader från lägret och utåt, högst faltBredd rutor brett. Sedan
// grävs jorden upp, fortare med benspaden, och fröna sås. Man röjer, gräver, sår och skördar en ruta i taget, men gör klart
// hela fältet i ett steg innan nästa börjar; varje ruta tar kort tid, så att en stor by kan ha stora fält. Grödan (GRODOR)
// växer när det är varmt nog, och frost dödar den: mest tål rovorna. Inget växer i istiden. Den mogna grödan skördas av den
// som äger fältet, och det går före förbättringar i valet (val.ts), för den blir övermogen och ruttnar om den står för länge.
// Skörden är mat och nya frön; sedan växer fältet om ägaren behöver och har frön till fler rutor, och jorden grävs upp igen.
// Bara en person sköter ett fält och äger både fältet och skörden (ägandet, beslut), och en familj har ett fält; dör hen
// eller flyttar tar en annan som kan odla över det. Ett fält där ingen arbetat på länge och där inget växer blir gräs igen.
// Arbetet är projektet 'falt' (projekt.ts), handlingen 'odla' med steget som task.tool.
// Bördighet, fukt och vattning kommer i steg 8.3.1, kompost och fler grödor i 8.3.2.
export const ODLING = balans('odling', {
  froTakt: 6, // frön per arbetstimme på en mycket rik plats (gånger kunnigheten och SNABBARE; 3 före balansen av fas 2, steg 2.12.2)
  froUttag: 0.1, // varje frö tar så här mycket ur platsen
  froVill: 40, // man tar med sig frön tills byn har så här många (20 före steg 2.12.2)
  froLeta: 0.3, // den som samlar går till de vilda grödorna för att plocka frön med VAL.fronChans, om någon ruta har så här mycket (steg 2.10.11)
  // fälten (steg 2.10.3, 2.10.13)
  rutorPerMun: 3, // ett fält ska ha så här många rutor per person i ägarens familj ...
  faltMin: 2, faltMax: 200, // ... men minst och högst så här många
  faltBredd: 10, // ett fält är högst så här många rutor brett; det växer i rader bort från lägret
  faltFran: 3, faltTill: 9, // fältets första rad ligger så här många rutor från byns läger ...
  faltAvst: 5, // ... helst så här långt
  // arbetet per ruta är kort, så att fälten kan bli stora (Björn efter v107, steg 2.10.13)
  rojaMin: 5, // minuters arbete per ruta att röja gräs, buskar och ungskog
  beredaMin: 8, // minuters arbete per ruta att gräva upp jorden för hand ...
  beredaSpade: 2.5, // ... så här många gånger fortare med benspaden ...
  spadeSlit: 0.0125, // ... som slits så här mycket per ruta
  saMin: 2, // minuters arbete per ruta att så
  froPerRuta: 2, // frön som sås per ruta
  skordaMin: 3, // minuters arbete per ruta att skörda
  pass: 90, // man arbetar på fältet högst så här många minuter åt gången
  vaxGrad: 4, // grödan växer bara när det är varmare än så här många grader
  overDygn: 1, // en mogen gröda står så här många dygn innan den börjar bli övermogen ...
  ruttDygn: 1.5, // ... och har sedan ruttnat helt efter så här många dygn till (skörden minskar under tiden)
  grasDygn: 3, // ett fält där ingen arbetat på så här många dygn och där inget växer blir gräs igen
  // på hösten blir nätterna kalla, och grödan hinner inte mogna innan frosten tar den (steg 2.12.2):
  kornMarg: 5, // korn sås bara om det hinner mogna med så här många dygn tillgodo före istiden (1,5 före steg 2.12.2); annars rovor ...
  rovMarg: 3, // ... med så här många dygn tillgodo
});

// grödorna (steg 2.10.3): sak = det som skördas (saker.ts), dygn = hur länge den växer innan den är mogen, perRuta = skörden
// per ruta, fron = frön tillbaka per ruta (rovorna äts hela, så de ger få), frost = den dör när det blir kallare än så här
export interface GrodaDef { namn: string; sak: string; dygn: number; perRuta: number; fron: number; frost: number }
export const GRODOR = {
  rovor: { namn: 'Rovor', sak: 'rovor', dygn: 2, perRuta: 5, fron: 2, frost: -6 }, // snabba och härdiga; lika många frön som de kostar (steg 2.10.11); frost -3 före steg 2.12.2
  korn: { namn: 'Korn', sak: 'korn', dygn: 3, perRuta: 4, fron: 6, frost: -4 }, // håller länge; 3 dygn (Björn efter v107, steg 2.10.11); fron 2,5 och frost -1 före steg 2.12.2
} satisfies Record<string, GrodaDef>;
export type GrodaSlag = keyof typeof GRODOR;
export const GRODA_LIST = Object.keys(GRODOR) as GrodaSlag[];

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
export interface Falt { id: number; x: number; y: number; w: number; dir: number; n: number; agare: number; steg: FaltSteg; klara: number; kvar: number; sadda?: number; groda?: GrodaSlag; vuxit?: number; mogen?: number; rord: number }
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
// mitten av fältet, och mitten av rutan där arbetet i steget fortsätter
export function faltMitt(f: Falt) {
  const rader = Math.ceil(f.n / f.w);
  return { x: f.x + Math.min(f.w, f.n) / 2, y: f.dir > 0 ? f.y + rader / 2 : f.y + 1 - rader / 2 };
}
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
// grödan som sås nu: korn om det hinner mogna före istiden med marginal, annars rovor om de hinner, annars ingen
export function grodaNu(s: State): GrodaSlag | undefined {
  const d = dygnTillIstid(s);
  if (d >= GRODOR.korn.dygn + ODLING.kornMarg) return 'korn';
  return d >= GRODOR.rovor.dygn + ODLING.rovMarg ? 'rovor' : undefined;
}
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
// ... och så många hen har frön till
const froRutor = (s: State, p: Person) => Math.floor(getable(s, p, 'fron') / ODLING.froPerRuta);
const storlek = (s: State, p: Person) => Math.min(faltBehov(s, p), froRutor(s, p));
// ett nytt fält är så brett att det blir ungefär fyrkantigt när det har alla rutor det ska ha
const bredd = (s: State, p: Person) => clamp(Math.ceil(Math.sqrt(faltBehov(s, p))), 1, ODLING.faltBredd);
// åt vilket håll raderna växer från första raden y: bort från lägret
const riktning = (s: State, y: number) => y + 0.5 >= campCenter(s).y ? 1 : -1;
// kan rutan bli en del av ett fält: jord (inte sand eller sten) utan stora träd, ledig och inte på ett annat fält
function rutaFri(s: State, x: number, y: number) {
  if (!inMap(x, y) || x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
  const i = y * W + x, t = getMap(s.seed).tiles[i];
  return (t === T.Gras || t === T.Skog) && groundOf(s).trees[i] < FOREST && ledig(s, x, y) && !faltAt(s, x, y);
}

// var ett nytt fält med n rutor och bredden w läggs: alla rutor fria, första raden faltFran–faltTill rutor från lägret,
// helst faltAvst, lite ungskog och inte i lekplatsen. Samma plats varje gång (ingen slump). Sparas per by och timme (regel 4)
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
  const f = eldPlats(s), R = ODLING.faltTill + 2, g = groundOf(s), lekR = lekplats(s), rader = Math.ceil(n / w), b = Math.min(w, n);
  let best: { x: number; y: number } | undefined, bs = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = f.x + dx, y = f.y + dy, d = campDist(s, x + b / 2, y + 0.5);
    if (d < ODLING.faltFran || d > ODLING.faltTill) continue;
    const ny = { x, y, w, dir: riktning(s, y), n } as Falt;
    let ok = true, unga = 0;
    for (let k = 0; k < n && ok; k++) { const r = rutaXY(ny, k); if (!rutaFri(s, r.x, r.y)) ok = false; else unga += g.trees[r.y * W + r.x]; }
    if (!ok) continue;
    const lek = paLek(lekR, x, ny.dir > 0 ? y : y - rader + 1, b, rader) ? 20 : 0;
    const sc = Math.abs(d - ODLING.faltAvst) + lek + unga;
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
    // sådden: frön till en ruta till, eller att sådden avslutas när fröna tagit slut
    if (f.steg === 'sa' && f.klara === 0 && (froRutor(s, p) < 1 || !grodaNu(s))) return undefined;
    return { tool: f.steg, text: `${FALT_STEG[f.steg].gor}.`, min: ODLING.pass, spot: nastaRuta(f), ref: f.id };
  }
  if (familjFalt(s, p) || storlek(s, p) < ODLING.faltMin || !grodaNu(s)) return undefined;
  const at = faltSite(s, bredd(s, p), storlek(s, p));
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
  return amountOf(s, 'fron') >= ODLING.froPerRuta * ODLING.faltMin && grodaNu(s) && living(s).some(p => kanOdla(s, p) && !egetFalt(s, p) && !familjFalt(s, p)) ? 1 : 0;
}

// fart på fältet: att gräva upp jorden går fortare med benspaden
const fart = (s: State, p: Person, f: Falt) => f.steg === 'bereda' && freeTools(s, p, 'benspade') ? ODLING.beredaSpade : 1;
// sådden är slut när nästa ruta inte är påbörjad och fröna inte räcker till den
const froSlut = (s: State, p: Person, f: Falt) => f.steg === 'sa' && f.kvar >= minPer('sa') && froRutor(s, p) < 1;
// arbetet som är kvar i steget (ms), utan farten: på sådden bara så många rutor som det finns frön till
function kvarTid(s: State, p: Person, f: Falt) {
  let n = antal(f) - f.klara;
  if (f.steg === 'sa') n = Math.min(n, froRutor(s, p) + (f.kvar < minPer('sa') ? 1 : 0));
  return n <= 0 ? 0 : f.kvar + (n - 1) * minPer(f.steg);
}
// framme (paborjat.ts): arbeta vidare på fältet, eller röja ett nytt där det ska ligga. Den som arbetar blir ägare
export function startOdla(s: State, p: Person, tk: Task) {
  let f = faltById(s, tk.ref);
  if (!f && tk.tool === 'roja' && !faltOf(s).some(q => q.agare === p.id) && !familjFalt(s, p)) {
    const x = Math.floor(tk.tx), y = Math.floor(tk.ty), n = storlek(s, p);
    const ny: Falt = { id: 0, x, y, w: bredd(s, p), dir: riktning(s, y), n, agare: p.id, steg: 'roja', klara: 0, kvar: minPer('roja'), rord: s.now };
    let ok = n >= ODLING.faltMin;
    for (let k = 0; k < n && ok; k++) { const r = rutaXY(ny, k); ok = rutaFri(s, r.x, r.y); }
    if (ok) {
      f = ny; f.id = s.nextFalt = (s.nextFalt ?? 0) + 1;
      (s.falt ??= []).push(f);
      s.byggV = (s.byggV ?? 0) + 1; // en ny sak på kartan: platserna räknas om
    }
  }
  if (!f || f.steg !== tk.tool || f.steg === 'vaxer') { tk.ref = undefined; tk.until = s.now; return; }
  if (f.steg === 'sa' && !f.groda) {
    const gr = grodaNu(s);
    if (!gr || froRutor(s, p) < 1) { tk.ref = undefined; tk.until = s.now; return; }
    f.groda = gr;
  }
  f.agare = p.id; f.rord = s.now;
  tk.ref = f.id; tk.until = s.now + Math.min(ODLING.pass * MIN, kvarTid(s, p, f) / fart(s, p, f));
}
// medan man arbetar: en ruta i taget. När steget är klart, eller fröna tar slut, slutar arbetet
export function workOdla(s: State, p: Person, tk: Task, dtSec: number) {
  const f = faltById(s, tk.ref);
  if (!f || f.steg === 'vaxer' || f.steg !== tk.tool) return;
  let t = dtSec * SEC * fart(s, p, f);
  while (t > 0 && f.klara < antal(f) && !froSlut(s, p, f)) {
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
  if (f.steg === 'roja') { const i = faltRuta(f, f.klara), g = groundOf(s); g.trees[i] = 0; g.cover[i] = 0; } // gräs, buskar och ungskog är borta
  else if (f.steg === 'bereda') { if (freeTools(s, p, 'benspade') && wearTool(s, p, 'benspade', ODLING.spadeSlit)) { const tr = SAKER.benspade?.trasig; if (tr) count(s, tr.stat); } }
  else if (f.steg === 'sa') { takeMaterial(s, p, 'fron', ODLING.froPerRuta); count(s, 'fronSadda', ODLING.froPerRuta); } // fröna som såtts (scenariot falt)
  else if (f.steg === 'mogen') {
    const d = GRODOR[f.groda!], a = skordAndel(s, f);
    if (a > 0) { gain(s, p, d.sak, d.perRuta * a); gain(s, p, 'fron', d.fron * a); count(s, 'skord', d.perRuta * a); }
  }
}
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
  const mal = Math.min(ODLING.faltMax, storlek(s, p));
  let n = f.n;
  while (n < mal) { const r = rutaXY(f, n); if (!rutaFri(s, r.x, r.y)) break; n++; }
  if (n <= f.n) { nasta(f, 'bereda'); return; }
  const fore = f.n;
  f.n = n; s.byggV = (s.byggV ?? 0) + 1;
  nasta(f, 'roja'); f.klara = fore; // de gamla rutorna är redan röjda
}
// grödan är borta (frost eller röta): fröna måste sås igen
function forlorad(s: State, f: Falt, varfor: string) {
  const d = GRODOR[f.groda!], agare = s.people.find(q => q.id === f.agare);
  log(s, `${varfor} tog ${d.namn.toLowerCase()}na på ${agare ? agare.name + 's' : 'ett'} fält.`, 'world', agare ? [agare.id] : undefined);
  count(s, varfor === 'Frosten' ? 'frostdod' : 'ruttnat');
  nasta(f, 'sa'); f.groda = undefined; f.vuxit = undefined; f.mogen = undefined; f.sadda = undefined;
}

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
      if (f.steg === 'mogen') { if (skordAndel(s, f) <= 0) forlorad(s, f, 'Rötan'); continue; }
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
// lagren i FYND med vilda grödor, som ger frön
export const VILDA = ['vildkorn', 'arter'] as const;

// var man plockar vilda frön med flit (val.ts, steg 2.10.11): den rikaste rutan med vilda grödor inom en halv dags gång,
// och närmare är bättre. Ingen när byn har nog frön eller inget växer. Samma plats för alla under timmen (regel 4)
const vildCache = new WeakMap<State, { key: number; at?: { x: number; y: number } }>();
export function vildFronPlats(s: State) {
  if (amountOf(s, 'fron') >= ODLING.froVill) return undefined;
  const key = Math.floor(s.now / HOUR), c = vildCache.get(s);
  if (c && c.key === key) return c.at;
  const mid = campCenter(s);
  let at: { x: number; y: number } | undefined, bs = 0;
  for (let y = Math.max(0, Math.floor(mid.y - PLATS.dagY)); y < Math.min(H, mid.y + PLATS.dagY); y++) for (let x = Math.max(0, Math.floor(mid.x - PLATS.dagX)); x < Math.min(W, mid.x + PLATS.dagX); x++) {
    let r = 0;
    for (const k of VILDA) r += richness(s, k, x + 0.5, y + 0.5);
    if (r < ODLING.froLeta) continue;
    const sc = r / (1 + campDist(s, x, y) / 8);
    if (sc > bs) { bs = sc; at = { x: x + 0.5, y: y + 0.5 }; }
  }
  vildCache.set(s, { key, at });
  return at;
}

// medan man samlar (UTFALL samla i steg.ts): frön från de vilda grödorna där man står, och platsen töms lite. Den som plockar
// tänker på odling (steg 2.10.11). När byn har nog plockar man och tänker ändå, men tar inte med sig fler och lämnar platsen
export function froFynd(s: State, p: Person, tk: Task, dtSec: number) {
  const ta = amountOf(s, 'fron') + (tk.items?.fron ?? 0) < ODLING.froVill;
  const sk = kunnighet(p.skill.samla) * SNABBARE * dtSec / HOUR_S;
  let n = 0;
  for (const k of VILDA) {
    const r = richness(s, k, tk.tx, tk.ty);
    if (r <= 0) continue;
    const g = ODLING.froTakt * r / FYND[k].topp * sk;
    if (ta) takeFrom(s, k, tk.tx, tk.ty, g * ODLING.froUttag);
    n += g;
  }
  if (n <= 0) return 0;
  count(s, 'vildgrodor', n);
  tankePa(s, p, 'odling', dtSec);
  if (!ta) return 0;
  if (forstaGang(s, 'froForst')) log(s, `${p.name} tog med sig frön från de vilda grödorna. De går inte att äta.`, 'world', [p.id]);
  return n;
}
