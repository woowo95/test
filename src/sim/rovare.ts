import { antal, lista, och, stor, tal } from './ord';
import { utanforByn } from './omrade';
import { balans } from './balans';
import { blodas } from './blod';
import { ALDER, KROPP, ageOf, alive, byId, count, isSick, living, log, makeName, ovning, stat, think } from './folk';
import { halsa, kanGa, skada } from './halsa';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { Klan, andraInst, klanById, klanerOf } from './klaner';
import { addTo, amountOf, avbryt, dropLoad, zoneOf } from './lager';
import { die } from './liv';
import { bitAt, isWall } from './byggnad';
import { larma } from './rykten';
import { SAKER, SAK_LIST } from './saker';
import { vattenNu } from './sjo';
import { clamp, rnd } from './slump';
import { SLAGSMAL, STRID, VAPEN, Strid, StridGang, Uppstallning, Vapen, foljet, personKampe, slitKastat, sparaStrid, spelaUpp, svartSkadad, vadretIStriden } from './strid';
import { isLight } from './tid';
import { DAY, HOUR, MIN, Person, SEC, State, T, Task, W, H } from './typer';
import { vaderNu } from './vader';
import { grundvarde, rikedom } from './varde';
import { kanterna, soker } from './varg';
import { foddNar, gastNyckel } from './gastliv';
import { notis } from './notiser';
import { groundOf, tileOf } from './mark';
import { findPath, markFart } from './vag';
import { GANG } from './gang';
import { kvarlevor } from './kvarlevor';
import { huggDorr, iFarten, klanMinns, overtygelse, radDygn, radSeger, svarTrohet, tandaHus } from './rader';
import { ledareOf } from './styre';
import { lagGaller } from './lagar';
import { bjornarOf, vargarOf } from './djur';
import { tingOf } from './agande';
import { viktOf } from './saker';

// ---------- rövarflocken (steg 4.4.5) ----------
// En grundversion av anfallen (stora räder, krig, tribut och murar ligger i 11.2). När byn är rik (Byns rikedom, varde.ts, med
// försvaret räknat emot: de vuxna som kan slåss och deras vapen) kan en liten flock rövare komma: folk från en grannklan som
// inte tycker om byn (klaner.ts), annars fredlösa utan klan. Flocken samlas en stund i kartans kant, där den kan upptäckas.
// Den som är vaken och nära ser den, vakten ser längst och gissar hur många de är (gissningen blir sämre ju längre bort de
// står), ropar (larma i rykten.ts) och väcker byn; sedan skyddar sig byn som när vargar kommer (vargSkydd i varg.ts): barnen
// och de svaga gömmer sig och de vuxna som vågar tar vapen och väntar vid elden. En liten flock väntar på mörkret, och ett tyst
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
  motR: 10, // de vuxna som är vakna och så här nära möter rövarna ...
  lyder: 0.5, iver: 0.2, // över den här Envälde-seden lyder man ledaren, och så mycket Fejd och Krig drar till striden (steg 8.7.9)
  fler: 0.3, vagar: 0.8, // ... om de vågar: mod / 20 + fler × (de som kan slåss / rövarna) är över vagar (som mot vargarna)
  gerUpp: 1.5, // ... och så många gånger mer när byn gett upp
  bar: 20, // så mycket väger det varje rövare som står kvar kan bära (steg 8.7.16)
  styrka: [8, 14], mod: [8, 15], uthallighet: [9, 14], smidighet: [8, 14], skicklighet: [6, 11], // rövarnas kroppar (lägst, högst)
  fiende: 15, // när byn dödar rövare blir klanen så här mycket ovänligare för var och en
  flockarMots: 20, djurChans: 0.2, djurR: 6, // två flockar slåss när de är så här nära, och ett rovdjur anfaller så här ofta inom djurR rutor (steg 8.7.18–8.7.19)
  testNara: 12, // i testläget dyker flocken upp så här många rutor från elden (steg 4.5.7.10)
});

// rövarnas vapen (ett slumpas för var och en)
const ROVARVAPEN: Vapen[] = ['kniv', 'yxa', 'fiskespjut', 'flintspjut', 'sten'];
// fodd: gästens liv (steg 4.5.7.7, gastliv.ts). x, y: var rövaren står (steg 6.6.9; saknas i sparade byar från före v450 och
// sätts då vid flocken), path och pk: vägen och målrutan den gäller, spar: vägen för bilden, tid och plats efter varandra
export interface Rovare { anhorig?: string; namn: string; sex: 'm' | 'k'; st: { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number }; vapen: Vapen; blod: number; fodd?: number; x?: number; y?: number; path?: number[]; pk?: number; spar?: number[]; bar?: Record<string, number> }
// x, y: ledaren (den första rövaren), mx, my: ledarens mål. lurat: flocken har väntat utanför byn
// striden vid förrådet som pågår (steg 6.6.10): striden (strid.ts) och när den började (t0), och arenans hörn på kartan (ox, oy)
export interface RovarStrid extends StridGang { t0: number; ox: number; oy: number }
export interface Rovarflock { skal?: import('./rader').RadSkal; rad?: boolean; mal?: number; hugger?: { bit: number; till: number }; tant?: boolean; id: number; klan?: number; folk: Rovare[]; x: number; y: number; mx: number; my: number; gor: 'samlas' | 'kommer' | 'vantar' | 'slass' | 'flyr'; till: number; strid?: RovarStrid; sedd?: number; gissning?: number; vackt?: boolean; lurat?: boolean }

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
  const text = `Testläget: ${n} rövare dyker upp ${d} rutor ${vaderstreck(s, f.x, f.y)} om elden och går till anfall.`;
  log(s, text, 'world');
  return { ok: true, text };
}
// en flock kommer till en punkt i kanten som inte är vatten. tvinga = ett scenario eller testläget (antalet); direkt = testläget:
// flocken dyker upp nära byn (narByn) och samlas inte först
export function rovarnaKommer(s: State, tvinga?: number, direkt?: boolean, klan?: number) {
  if (!tvinga && rnd(s, 'rovare') >= ROVARE.kommer * lockar(s) * efterAnfall(s)) return;
  // en ny flock kan komma medan en annan är på kartan (steg 8.7.18): den väntar i flockarna tills den får gå (rovarSteg)
  const forra = s.rovare;
  const m = getMap(s.seed), nara = direkt ? narByn(s) : undefined;
  let x = nara?.x ?? 0, y = nara?.y ?? 0;
  for (let i = 0; !nara && i < 20; i++) {
    const sida = Math.floor(rnd(s, 'rovare') * 4), l = rnd(s, 'rovare');
    x = sida === 0 ? 0.5 : sida === 1 ? W - 0.5 : l * W; y = sida === 2 ? 0.5 : sida === 3 ? H - 0.5 : l * H;
    if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break;
  }
  // den grannklan som tycker sämst om byn, om någon inte tycker om den
  const k: Klan | undefined = klan !== undefined ? klanById(s, klan) : klanerOf(s).filter(q => q.inst < 0).sort((a, b) => a.inst - b.inst)[0];
  const n = tvinga ?? Math.round(mellan(s, ROVARE.antal));
  const folk: Rovare[] = Array.from({ length: n }, () => {
    const sex = rnd(s, 'rovare') < 0.8 ? 'm' as const : 'k' as const;
    return {
      namn: makeName(s, sex, 'rovare'), sex, vapen: ROVARVAPEN[Math.floor(rnd(s, 'rovare') * ROVARVAPEN.length)], blod: 1,
      st: { styrka: mellan(s, ROVARE.styrka), uthallighet: mellan(s, ROVARE.uthallighet), mod: mellan(s, ROVARE.mod), smidighet: mellan(s, ROVARE.smidighet), skicklighet: mellan(s, ROVARE.skicklighet) },
    };
  });
  for (const r of folk) r.fodd = foddNar(s.seed, gastNyckel(k?.id, r.namn), 'rovare', s.now); // drar ingen slump
  const nr = s.rovarNr = (s.rovarNr ?? 0) + 1;
  s.rovare = { id: nr, klan: k?.id, folk, x, y, mx: x, my: y, gor: direkt ? 'kommer' : 'samlas', till: direkt ? s.now : s.now + mellan(s, ROVARE.samlasTim) * HOUR };
  stallUpp(s, s.rovare, x, y);
  s.rovarVila = s.now;
  if (forra) { (s.rovareFler ??= []).push(s.rovare); s.rovare = forra; count(s, 'tvaFlockar'); }
  count(s, 'rovarflockar'); count(s, 'rovare', n);
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
const narmast = (f: Rovarflock, q: { x: number; y: number }) => Math.min(...f.folk.map(r => Math.hypot(r.x! - q.x, r.y! - q.y)));
// platsen i klungan kring (x, y) för rövare nummer j, på land
function klungPlats(s: State, x: number, y: number, j: number) {
  const [dx, dy] = KLUNGA[j % KLUNGA.length], px = clamp(x + dx, 0.3, W - 0.3), py = clamp(y + dy, 0.3, H - 0.3);
  return iVatten(s, px, py) && !iVatten(s, x, y) ? { x, y } : { x: px, y: py };
}
function spara(s: State, r: Rovare, t: number) {
  const sp = r.spar ??= [];
  sp.push(Math.round(t), Math.round(r.x! * 1000) / 1000, Math.round(r.y! * 1000) / 1000);
  let i = 0; while (i + 3 < sp.length && sp[i + 3] < s.now - SPAR_SEK * SEC) i += 3;
  if (i) sp.splice(0, i);
}
// rövarna ställer sig i klungan kring (x, y): när flocken kommer, efter tornadon och i en sparad by från före v450
export function stallUpp(s: State, f: Rovarflock, x: number, y: number) {
  f.folk.forEach((r, j) => { const p = klungPlats(s, x, y, j); r.x = p.x; r.y = p.y; r.path = undefined; r.pk = undefined; spara(s, r, s.now); });
  f.x = x; f.y = y;
}
// rövaren går mot (mx, my) i sek sekunder från tiden t0. Svarar hur långt det är kvar (rutor), eller −1 när det inte finns någon väg
function gaMot(s: State, r: Rovare, mx: number, my: number, sek: number, t0: number) {
  const g = groundOf(s), mal = tileOf(mx, my);
  if (r.pk !== mal) {
    r.pk = mal; r.path = findPath(g, r.x!, r.y!, mx, my) ?? undefined;
    if (!r.path) { r.pk = undefined; return -1; }
  }
  if (!r.spar?.length) spara(s, r, t0);
  let tid = 0;
  for (;;) {
    const sist = !r.path?.length, i = sist ? 0 : r.path![0];
    const wx = sist ? mx : (i % W) + 0.5, wy = sist ? my : Math.floor(i / W) + 0.5;
    const fart = GANG.fart * Math.max(0.5, markFart(g, tileOf(r.x!, r.y!)));
    const d = Math.hypot(wx - r.x!, wy - r.y!), kan = (sek - tid) * fart;
    if (d > kan) { r.x! += (wx - r.x!) / d * kan; r.y! += (wy - r.y!) / d * kan; spara(s, r, t0 + sek * SEC); return d - kan + (r.path?.length ?? 0); }
    r.x = wx; r.y = wy; tid += d / fart;
    if (sist) { spara(s, r, t0 + tid * SEC); return 0; }
    r.path!.shift(); spara(s, r, t0 + tid * SEC);
  }
}
// var rövaren syns vid tiden t (bilden): mellan punkterna i spar
export function rovarPlats(r: Rovare, t: number) {
  const sp = r.spar;
  if (!sp?.length) return { x: r.x ?? 0, y: r.y ?? 0 };
  if (t <= sp[0]) return { x: sp[1], y: sp[2] };
  for (let i = 3; i < sp.length; i += 3) if (sp[i] >= t) { const a = (t - sp[i - 3]) / Math.max(1, sp[i] - sp[i - 3]); return { x: sp[i - 2] + (sp[i + 1] - sp[i - 2]) * a, y: sp[i - 1] + (sp[i + 2] - sp[i - 1]) * a }; }
  return { x: sp[sp.length - 2], y: sp[sp.length - 1] };
}
// flocken går: ledaren mot (mx, my), de andra mot sin plats i klungan bakom ledaren. Svarar hur långt ledaren har kvar, eller
// −1 när den inte kommer fram
function flockGar(s: State, f: Rovarflock, sek: number) {
  const t0 = s.now - sek * SEC, led = f.folk[0];
  const kvar = gaMot(s, led, f.mx, f.my, sek, t0);
  f.folk.forEach((r, j) => { if (j) { const p = klungPlats(s, led.x!, led.y!, j); gaMot(s, r, p.x, p.y, sek, t0); } });
  f.x = led.x!; f.y = led.y!;
  return kvar;
}
// platsen där flocken väntar utanför byn: ROVARE.lur rutor från förrådet på vägen dit, på land
function lurPlats(s: State, f: Rovarflock, m: { x: number; y: number }) {
  const d = avst(f, m), v = Math.atan2(f.y - m.y, f.x - m.x);
  for (const dv of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
    const x = clamp(m.x + Math.cos(v + dv) * Math.min(d, ROVARE.lur), 0.5, W - 0.5), y = clamp(m.y + Math.sin(v + dv) * Math.min(d, ROVARE.lur), 0.5, H - 0.5);
    if (!iVatten(s, x, y) && !bitAt(s, Math.floor(x), Math.floor(y))) return { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 };
  }
  return undefined;
}

// förrådet (eller elden när byn inte har något förråd)
function malet(s: State) {
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
  const ser = (q: Person) => vaken(q) && narmast(f, q) < rad(q);
  const vakt = folk.find(q => q.task?.act === 'vakt' && ser(q));
  const vack = () => { if (vakt && !f.vackt && Math.min(...f.folk.map(r => utanforByn(s, r.x!, r.y!))) < ROVARE.vack) { f.vackt = true; vacka(s, f, vakt, folk); } };
  if (f.sedd !== undefined) { vack(); return; }
  const p = vakt ?? folk.find(ser);
  if (!p) return;
  const n = f.folk.length, fel = ROVARE.gissFel * (vakt ? narmast(f, p) / rad(p) : 1) * (rnd(s, 'rovare') * 2 - 1);
  f.sedd = s.now; f.gissning = Math.max(1, Math.round(n * (1 + fel)));
  count(s, 'rovarSedda');
  log(s, `${p.name} såg rövare ${f.gor === 'samlas' ? 'samlas vid kartans kant' : 'på väg mot byn'}, ungefär ${f.gissning} (${fran(s, f)}).`, 'world', [p.id]);
  notis(s, 'anfall', `${p.name} såg rövare ${f.gor === 'samlas' ? 'samlas vid kartans kant' : 'på väg mot byn'}, ungefär ${f.gissning} (${fran(s, f)}).`, [p.id], { x: Math.floor(f.x), y: Math.floor(f.y) });
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

// de vuxna som möter rövarna vid förrådet: vakna, nära och modiga nog (de som väntar med vapen och vakten står alltid kvar)
const familjHotad = (s: State, q: Person, f: Rovarflock) => { const p = byId(s, q.partner); return !!p && avst(p, f) < ROVARE.motR; };
function motstand(s: State, f: Rovarflock, folk: Person[]) {
  const kan = folk.filter(q => vaken(q) && vuxenKan(s, q) && avst(q, f) < ROVARE.motR && q.task?.act !== 'gomma');
  // vem som strider (steg 8.7.9): mod, åldern, vem som hotas, seden Förlikning – Fejd och styret. Vid Envälde lyder man ledaren, och lagen om stridsplikt säger vem som måste gå
  const l = ledareOf(s), lyder = (s.seder.v.rang ?? 0) > ROVARE.lyder && !!l && kan.includes(l), plikt = lagGaller(s, 'stridsplikt');
  const iver = ((s.seder.v.fejd ?? 0) + (s.seder.v.krig ?? 0)) * ROVARE.iver;
  return kan.filter(q => q.task?.act === 'forsvar' || q.task?.act === 'vakt' || lyder || plikt || (q.partner !== undefined && familjHotad(s, q, f)) || stat(q, 'mod', s.now) / 20 + iver + ROVARE.fler * kan.length / Math.max(1, f.folk.length) > ROVARE.vagar);
}

// striden mellan byns folk och rövarna (steg 6.6.10): den börjar där de står, på en plats runt förrådet, och går i spelets
// tid. Varje slag räknas striden om från början till tiden som gått (spelaUpp i strid.ts), så att den blir likadan i båda
// lägena och kan ritas på kartan steg för steg. Den som kommer till (motstand) under striden ger sig in i den. När striden är
// slut blir skadorna riktiga
const ARENA = 2 * ROVARE.motR + 4; // platsen är så här många rutor bred och hög, med förrådet i mitten
const iArenan = (v: number) => clamp(v, 0.5, ARENA - 0.5);
const rovarKampe = (r: Rovare, id: number, x: number, y: number, ledare: boolean): Uppstallning['kampar'][number] =>
  ({ id, namn: r.namn, sida: 1, st: { ...r.st, sikte: r.st.skicklighet }, vapen: r.vapen, klader: [], fart: 1, x, y, ...(ledare ? { ledare: 'fram' as const } : {}) });
// den som slåss står kvar i striden tills den är slut (eller högst STRID.maxTid sekunder)
function iStriden(s: State, p: Person, g: RovarStrid) {
  avbryt(s, p);
  p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: g.t0 + (STRID.maxTid + 300) * SEC, carry: 0, why: 'Slåss med rövare' };
}
export function borjaStrid(s: State, f: Rovarflock, folk: Person[]) {
  const ox = Math.round(f.x - ARENA / 2), oy = Math.round(f.y - ARENA / 2), n = f.folk.length;
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => { const k = personKampe(s, p, i + 1, 0, iArenan(p.x - ox), iArenan(p.y - oy)); k.st.mod += 20 * overtygelse(s, f, p); return k; }); // övertygelsen (steg 8.8.8)
  f.folk.forEach((r, j) => kampar.push({ ...rovarKampe(r, folk.length + j + 1, iArenan((r.x ?? f.x) - ox), iArenan((r.y ?? f.y) - oy), j === 0 && n > 1), ...(f.mal !== undefined ? { jagar: f.mal } : {}) })); // hämnden riktar sig mot målet (steg 8.8.5)
  foljet(s, kampar);
  const blod: Record<number, number> = {};
  f.folk.forEach((r, j) => { if (r.blod < 1) blod[folk.length + j + 1] = r.blod; });
  const g: RovarStrid = { u: { avsikt: 'skada', w: ARENA, h: ARENA, ...vadretIStriden(s), kampar }, fro: Math.floor(rnd(s, 'strid') * 2147483647), blod, in: [], t0: s.now, ox, oy };
  f.strid = g; f.gor = 'slass';
  count(s, 'rovarStrid');
  for (const p of folk) iStriden(s, p, g);
}
// striden räknad till tiden nu (för bilden: tiden som visas)
export const rovarStridNu = (g: RovarStrid, nu: number) => spelaUpp(g, Math.max(0, (nu - g.t0) / SEC));
// ett slag i striden: de nya ger sig in, rövarna står där striden har dem. Svarar när striden är slut: om rövarna vann
function stridGar(s: State, f: Rovarflock, folk: Person[]): boolean | undefined {
  const g = f.strid!, st = rovarStridNu(g, s.now), n = g.u.kampar.length;
  f.folk.forEach((r, j) => { const k = st.kampar[n - f.folk.length + j]; if (!k) return; const x = g.ox + k.x, y = g.oy + k.y; if (!iVatten(s, x, y)) { r.x = x; r.y = y; r.path = undefined; } });
  if (st.slut) return stridSlut(s, f, st);
  const med = new Set(st.kampar.map(k => k.pid).filter(x => x !== undefined));
  for (const p of motstand(s, f, folk)) {
    if (med.has(p.id) || p.task?.act === 'strid') continue;
    const id = n + g.in!.length + 1;
    g.in!.push({ t: st.t, k: personKampe(s, p, id, 0, iArenan(p.x - g.ox), iArenan(p.y - g.oy)) });
    iStriden(s, p, g);
  }
  return undefined;
}
// striden är slut: de döda rövarna är borta, skadorna blir riktiga skador (som mot vargarna) och striden sparas i byn
// den fallne ligger kvar med det hen hade, tills någon avrustar hen (steg 8.7.5)
function fallenFiende(s: State, r: Rovare, x: number, y: number) {
  const saker: Record<string, number> = { ...r.bar };
  if (SAKER[r.vapen]) saker[r.vapen] = (saker[r.vapen] ?? 0) + 1;
  r.bar = undefined;
  kvarlevor(s).push({ id: (s.nextKvar = (s.nextKvar ?? 0) + 1), k: 'fiende', x: Math.floor(x), y: Math.floor(y), t: s.now, vem: -1, namn: r.namn, text: r.namn, saker });
}
function stridSlut(s: State, f: Rovarflock, st: Strid) {
  const g = f.strid!, vinnare = st.slut!.vinnare, n = f.folk.length;
  f.strid = undefined;
  sparaStrid(s, { t: g.t0, orsak: 'rövare vid förrådet', u: g.u, fro: g.fro, ...(Object.keys(g.blod ?? {}).length ? { blod: g.blod } : {}), ...(g.in?.length ? { in: g.in } : {}), vinnare });
  const rov = st.kampar.filter(k => k.sida === 1 && k.pid === undefined), kvar: Rovare[] = [];
  f.folk.forEach((r, j) => { const k = rov[j]; if (k?.lage === 'dod') { count(s, 'rovarDoda'); fallenFiende(s, r, g.ox + (k.x ?? 0), g.oy + (k.y ?? 0)); const hit = [...st.logg].reverse().find(q => q.h === 'traff' && q.b === k.id); klanMinns(s, f, r, st.kampar.find(o => o.id === hit?.a)?.pid); } else { r.blod = Math.max(0.05, k?.blod ?? r.blod); kvar.push(r); } });
  const doda = n - kvar.length;
  f.folk = kvar;
  if (kvar.length) { f.x = kvar[0].x!; f.y = kvar[0].y!; }
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
    if (!iVatten(s, x, y) && !isWall(s, x, y)) { p.x = x; p.y = y; } // där striden lämnade hen, men aldrig i vattnet eller en vägg
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
  const text = `${namn} slogs med ${tal(n)} rövare ${fran(s, f)} vid förrådet. ${doda ? `${stor(tal(doda))} ${doda === 1 ? 'rövare dog' : 'rövare dog'}. ` : ''}${vinnare === 1 ? 'Rövarna vann.' : 'Rövarna flydde.'}${svara.length ? ` ${lista(svara)} skadades svårt.` : ''}`;
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
export function plundra(s: State, f: Rovarflock, tyst: boolean) {
  let tog = 0;
  // att fly är att ge upp (steg 8.7.17): flyr alla som möter rövarna tar de vad de vill, också ur kistor och hyllor
  const gavUpp = living(s).some(p => p.task?.act === 'fly' && ageOf(p, s.now) >= ALDER.vuxen);
  const bar = ROVARE.bar * (gavUpp ? ROVARE.gerUpp : 1);
  if (gavUpp) { count(s, 'byGavUpp'); log(s, 'Byn gav upp, och rövarna tog vad de ville.', 'world'); }
  const varor = SAK_LIST.filter(k => amountOf(s, k) >= 1).sort((a, b) => grundvarde(b) / Math.max(0.1, viktOf(b)) - grundvarde(a) / Math.max(0.1, viktOf(a)));
  const tagna: Record<string, number> = {};
  for (const r of f.folk) {
    let vikt = 0;
    for (const k of varor) {
      while (vikt + viktOf(k) <= bar && amountOf(s, k) >= 1 && !SAKER[k]!.redskap) { addTo(s, k, -1); vikt += viktOf(k); tog++; tagna[k] = (tagna[k] ?? 0) + 1; (r.bar ??= {})[k] = (r.bar[k] ?? 0) + 1; }
      if (SAKER[k]!.redskap && vikt + viktOf(k) <= bar) { const t = tingOf(s).find(q => q.k === k && q.bar === undefined && q.hos === undefined && q.lass === undefined); if (t) { s.ting = s.ting!.filter(q => q !== t); vikt += viktOf(k); tog++; tagna[k] = (tagna[k] ?? 0) + 1; (r.bar ??= {})[k] = (r.bar[k] ?? 0) + 1; } }
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
export function tappar(s: State, r: Rovare) {
  if (!r.bar || r.x === undefined || r.y === undefined) return;
  const n = Object.values(r.bar).reduce((a, b) => a + b, 0);
  dropLoad(s, { act: 'bara', carry: 0, items: { ...r.bar } } as unknown as Task, r.x, r.y);
  r.bar = undefined;
  if (n) count(s, 'rovarTappat', n);
}

// vad flocken gör i det här slaget
function flockSteg(s: State, f: Rovarflock, folk: Person[], dtSec: number) {
  if (f.gor === 'flyr') {
    // var och en springer mot sin närmaste kant och är borta när hen når den
    const t0 = s.now - dtSec * SEC;
    f.folk = f.folk.filter(r => {
      let kvar = -1;
      for (const k of kanterna(r.x!, r.y!)) { kvar = gaMot(s, r, k.x, k.y, dtSec, t0); if (kvar >= 0) break; }
      if (f.rad) iFarten(s, r); // saker i farten (steg 8.8.3)
      return kvar >= 0.5;
    });
    if (f.folk.length) { f.x = f.folk[0].x!; f.y = f.folk[0].y!; } else count(s, 'rovarBorta');
    return;
  }
  if (f.gor === 'slass') { // striden pågår (steg 6.6.10)
    const vann = stridGar(s, f, folk);
    if (vann === undefined) return;
    if (vann) { if (!radSeger(s, f)) plundra(s, f, false); tandaHus(s, f); }
    f.gor = 'flyr';
    return;
  }
  if (f.gor === 'samlas') {
    if (s.now < f.till) return;
    // en liten flock väntar på mörkret
    f.gor = 'kommer';
  }
  const m = malet(s);
  // byn väntar med fler än rövarna: de vänder om
  if (avst(f, m) < ROVARE.ser || f.gor === 'vantar') {
    const vantar = folk.filter(q => q.task?.act === 'forsvar' && avst(q, m) < ROVARE.ser).length;
    if (vantar > f.folk.length * ROVARE.overmakt) { f.gor = 'flyr'; count(s, 'rovarVande'); log(s, `Rövarna ${fran(s, f)} såg att byn väntade på dem med vapen och vände om.`, 'world'); return; }
  }
  if (f.gor === 'vantar') { if (s.now < f.till) return; f.gor = 'kommer'; }
  // först till en plats utanför byn, där flocken väntar en stund; sedan till förrådet
  const lur = !f.lurat && avst(f, m) > ROVARE.lur + 1 ? lurPlats(s, f, m) : undefined;
  const mal = lur ?? m;
  f.mx = mal.x; f.my = mal.y;
  const kvar = flockGar(s, f, dtSec);
  if (kvar < 0) { f.gor = 'flyr'; return; }
  if (lur) {
    if (kvar > ROVARE.nara) return;
    f.lurat = true; f.gor = 'vantar'; f.till = s.now + mellan(s, ROVARE.lurMin) * MIN;
    return;
  }
  if (kvar > ROVARE.nara) return;
  // framme vid förrådet: striden börjar, eller rövarna plundrar när ingen står emot
  const mot = motstand(s, f, folk);
  if (mot.length) { borjaStrid(s, f, mot); return; }
  if (huggDorr(s, f, folk)) return; // en stängd dörr huggs sönder (steg 8.9.1–8.9.2)
  if (!radSeger(s, f)) plundra(s, f, f.sedd === undefined);
  tandaHus(s, f); // (steg 8.9.3)
  f.gor = 'flyr';
  larma(s, 'rovare', f.folk.length, folk.filter(q => vaken(q) && avst(q, f) < ROVARE.folkSer));
}

// tornadon (steg 6.4.12): rövarna drabbas som byborna. zon 0 (kärnan): alla dör; zon 1 (nära) och 2 (utkanten): var och en
// dör (med chansen dod) eller skadas (grad, med chansen skadas), och flocken kastas till platsen till och flyr. r(j, salt) är
// ett tal mellan 0 och 1 för rövare nummer j
export function rovarTornado(s: State, f: Rovarflock, zon: number, dod: number, skadas: number, grad: readonly number[], r: (j: number, salt: number) => number, till?: { x: number; y: number }) {
  const fore = f.folk.length;
  f.folk = f.folk.filter((q, j) => {
    if (zon === 0 || r(j, 1) < dod) { tappar(s, q); count(s, 'rovarDoda'); count(s, 'tornado dod'); return false; }
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
  if (!f.folk.length) s.rovare = undefined;
}

// varje slag (steg.ts): en flock kommer, ses, går in mot byn och flyr
export function rovarSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme && Math.floor(s.now / HOUR) % 24 === 12) radDygn(s); // räderna (steg 8.8.1)
  if (nyTimme) rovarnaKommer(s);
  const f = s.rovare;
  if (!f) return;
  if (f.folk.some(r => r.x === undefined)) stallUpp(s, f, f.x, f.y); // en sparad by från före v450
  const folk = living(s);
  if (f.gor !== 'flyr') ses(s, f, folk);
  if (f.folk.length) flockSteg(s, f, folk, dtSec);
  if (!f.folk.length) s.rovare = undefined;
  // de andra flockarna (steg 8.7.18): en i taget på kartan; möts de från klaner som inte tycker om varandra slåss de
  if (s.rovareFler?.length) {
    const o = s.rovareFler[0];
    if (s.rovare && nyTimme) flockarMots(s, s.rovare, o);
    if (!s.rovare) { s.rovare = s.rovareFler.shift(); if (!s.rovareFler.length) s.rovareFler = undefined; }
  }
  if (nyTimme && s.rovare) djurMotRovare(s, s.rovare);
}
// två flockar från klaner som inte tycker om varandra: en strid mellan tre parter. Den svagaste flocken flyr
function flockarMots(s: State, a: Rovarflock, b: Rovarflock) {
  if (a.klan === b.klan || avst(a, b) > ROVARE.flockarMots) return;
  const ka = klanById(s, a.klan), kb = klanById(s, b.klan);
  if ((ka?.inst ?? 0) > 0 && (kb?.inst ?? 0) > 0) return;
  count(s, 'flockarSlass');
  const svag = a.folk.length <= b.folk.length ? a : b;
  log(s, `Två rövarflockar möttes vid byn och slogs med varandra.`, 'world'); kronika(s, 'Två rövarflockar slogs med varandra vid byn.', 'rovare');
  for (const r of svag.folk) r.blod = Math.max(0.2, r.blod - 0.4);
  svag.gor = 'flyr';
}
// djuren bryr sig inte om klanen (steg 8.7.19): rovdjur anfaller rövare, handlare och gäster efter samma regler som byborna
function djurMotRovare(s: State, f: Rovarflock) {
  for (const d of vargarNara(s, f)) {
    const r = f.folk[0]; if (!r || rnd(s, 'rovare') >= ROVARE.djurChans) continue;
    r.blod = Math.max(0, r.blod - 0.3); count(s, 'djurMotRovare');
    if (r.blod <= 0.1) { f.folk.shift(); tappar(s, r); log(s, `${d} tog en av rövarna.`, 'world'); }
  }
}
const vargarNara = (s: State, f: Rovarflock) => bjornarOf(s, s.now).concat(vargarOf(s) as never).filter(d => Math.hypot(d.x - f.x, d.y - f.y) < ROVARE.djurR).map(d => d.art === 'bjorn' ? 'En björn' : 'En varg');
