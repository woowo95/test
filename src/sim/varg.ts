import { loggNamn } from './gast';
import { gen, heltOrd } from './ord';
import { doljISno } from './utrustning';
import { heligtAvstar } from './kultlatt';
import { antal, han, honom, lista, stor, svaraText, tal } from './ord';
import { utanforByn } from './omrade';
import { balans } from './balans';
import { KLOCKA, SLAGHINDER, kanNa } from './klocka';
import { GANG } from './gang';
import { kronikaBer, och, personFalt, sakVarg } from './berattelser';
import { redskapIHanden } from './agande';
import { blodas } from './blod';
import { bedFor } from './bygg';
import { varmareInne } from './byggnader';
import { Bit, Rum, bitAt, bitsOf, dorrDef, roomAt, freeNear, gridOf } from './byggnad';
import { dodaDjur, dragOf, djurOf, grupperOf, halsaOf, satDjurHalsa } from './djur';
import { upplev } from './uppvaxt';
import { ALDER, KROPP, ageOf, alive, byId, count, forstaGang, franMitt, isSick, livet, living, log, stat } from './folk';
import { halsa, kanGa } from './halsa';
import { Act, larmAvbryter } from './handlingar';
import { brinnerNara, eldXY, eldarOf } from './eld';
import { eldPlats, getMap } from './karta';
import { groundOf, punktIRuta } from './mark';
import { findPath } from './vag';
import { addTo, amountOf, avbryt, foodOf, zoneOf } from './lager';
import { anseende, handelse, horLarm, larma, larmNu } from './rykten';
import { KOTTSLAG, SAKER } from './saker';
import { DJUR, type Djurart } from './redskap';
import { vattenNu } from './sjo';
import { avst, clamp, rnd, chansPer } from './slump';
import { SLAGSMAL, VAPEN, Avsikt, djurKampe, personKampe, efterKampen, harSlagits } from './strid';
import { DjurMed, KartStrid, kartStridBorja, kartStrider } from './kartstrid';
import { EFTER, Efter, FAROR, STRIDSLAG } from './efterstrid';
import { kvarById } from './kvarlevor';
import { jaktFoljer, jaktKallare, jaktPlatsVid, jaktSamlas } from './rovdjursjakt';
import { ageIndex, iIstiden, isLight } from './tid';
import { coldOf, hardVinter, temperature } from './vader';
import { MOTGANG } from './motgang';
import { GRANNAR4, H, HOUR, MIN, Person, SEC, State, T, Task, Vargflock, W } from './typer';
import { taVapen } from './vakt';
import { vaderNu } from './vader';
import { notis } from './notiser';
import { lamnaFallt, styckaFallt } from './styckning';
import { tecken } from './religion';
import { hotKrok, LARMHOT, LARMROLL, rollVid, vagMedHot, viljaKrok } from './roller';
import { glesPlats } from './trangsel';

// ---------- vargen och vakten (steg 3.7.1) ----------
// Under istiden kommer vargar in på kartan från kanten, oftast i flock och ibland en ensam. En flock stryker omkring en tid
// och drar sedan vidare och försvinner. Den undviker elden och grupper av människor, jagar kaniner, och en hungrig flock
// kan anfalla en människa som är ensam; ju större flock, desto modigare. På natten smyger den ibland fram till förrådet och
// stjäl mat, men bara när ingen är vaken i närheten. Varje varg är en individ med mod och hälsa (djur.ts), och flocken är
// hungrig (s.vargar, sparat i byn och stegat likadant i båda lägena med byns följd 'varg').
// Den som ser vargar ropar (larma i rykten.ts), vakten vid elden ser längst och väcker byn när vargarna är nära, och den som
// väckts håller sig vaken vid elden en stund (val.ts). Den som såg flocken först kallar till vargjakt om hen vågar (modet
// mot flockens storlek), annars ledaren eller den modigaste som vågar (steg 3.10.20), när byn vet om flocken: oftare när byn
// är hungrig, har spjut och är många mot få vargar. Vem som följer med avgör modet, tycket för den som kallar, seden om
// strid och den som kallar: anseendet, karisman, om hen är vargdödare och om hen leder byn. Striden räknas med stridens regler (strid.ts), med flockens mod som en sida: den
// flyr när en varg faller eller ledarvargen dör. Bett blir ofta infekterade. En dödad varg blir en fälld varg som bärs hem
// och slaktas (redskap.ts), och den som dödade den blir en vargdödare (rykten.ts)
export const VARG = balans('varg', {
  vagSok: 30, vagFlytt: 3, // flocken söker en ny väg runt hinder högst var så här många sekunder, och behåller den när målet flyttat sig högst så här många rutor
  kommer: 0.08, // chansen i timmen under istiden att en flock kommer, när ingen är på kartan (0,03 före steg 3.10.15: nu finns vargar nästan hela vintern)
  ensam: 0.3, // chansen att det är en ensam varg ...
  flockMax: 6, // ... annars 2 till så här många
  stannarTim: [12, 36], // så många timmar stannar flocken innan den drar vidare (minst, högst)
  hunger0: [0.2, 0.6], // hungern när den kommer
  hungerTim: 0.03, // hungern växer så här mycket i timmen
  gaFart: 0.006, // rutor i sekunden när flocken stryker omkring eller smyger ...
  flyFart: 0.05, // ... och när den flyr eller drar vidare
  vandra: 12, // så långt bort (rutor) flocken går mot nästa plats
  eldR: 9, // flocken håller sig så här långt från en brinnande eld ...
  eldHunger: 0.8, // ... utom när hungern är minst så här stor
  grupp: 6, // den som har någon annan inom så här många rutor är inte ensam
  undvik: 10, // flocken går undan från en grupp (minst två) som kommer så här nära
  ser: 14, // flocken ser en ensam människa inom så här många rutor ...
  vit: 0.4, // ... och så stor del kortare den som är klädd vitt i snön (steg 10.7.22: ser × (1 − vit × doljISno))
  anfall: 0.7, // en flock (minst två) anfaller när hunger × (0,5 + modet) är över detta ...
  anfallChans: 0.3, // ... med den här chansen på en minut (chansPer, steg 10.2.15: förr per slag om fem minuter, men flocken som såg den ensamma hann gå därifrån innan den anföll)
  flockMod: 0.15, // modet gånger 1 + flockMod × (vargarna − 1): större flock, modigare
  stjalHunger: 0.4, // på natten smyger en så här hungrig flock fram till förrådet ...
  stjalChans: 0.05, // ... med den här chansen på en minut (förr per slag om fem minuter, steg 10.2.15)
  vaken: 5, // och vänder om någon är vaken inom så här många rutor
  stjalPer: 1.5, // så många saker mat (kött först) en varg tar, avrundat
  stjalMat: 0.15, // hungern sjunker så här mycket per sak den tar
  tamMat: 0.5, // hungern sjunker så här mycket när flocken tar ett får eller en get (steg 9.8.12)
  ater: 0.1, // hungern sjunker så här mycket i minuten medan flocken äter av den den dödat (steg B.11)
  kaninR: 6, kaninChans: 0.4, kaninMat: 0.25, // en hungrig flock nära en kaningrupp tar en kanin i timmen med den här chansen, och hungern sjunker så här mycket
  // att se vargar och väcka byn
  vaktSer: 24, folkSer: 10, nattSer: 0.6, // vakten ser vargar inom så här många rutor, andra inom folkSer, gånger nattSer i mörkret
  larmTim: 2, // samma flock larmas om högst så här ofta
  vack: 25, // vakten väcker byn när flocken är så här nära byns område (utanforByn)
  vakenTim: 1, // den som väckts håller sig vaken vid elden så här många timmar
  // vargjakten
  jaktTim: 3, // jägarna letar efter flocken högst så här många timmar
  kallMin: 30, // den som ska följa med på vargjakten har så här många minuter på sig att komma iväg (nivån Tillfälle i val.ts, steg 6.1.14)
  jaktVet: 6, // byn vet om flocken i så här många timmar efter ett larm
  kraftVarg: 1.1, // en vargs styrka mot jägarnas: kraftBas + kraftSkada × vapnets skada (händerna 0,78, flintspjutet 1,4)
  jaktKvot: 1.3, // jakten blir av när jägarnas styrka mot vargarnas, gånger (1 + nod × byns hunger) och (kallarBas + kallarMod × kallarens mod / 20), är över detta ...
  nod: 1, // ... byns hunger: 1 − maten per person / matNog
  matNog: 8,
  jaktChans: 0.5, // ... och då med den här chansen i timmen (i dagsljus)
  foljMod: 1, foljTycke: 1, foljSed: 0.5, foljNod: 0.5, foljSlump: 0.4, // den som följer med: modet, tycket för den som kallar, seden om strid, byns hunger och slump ...
  // ... och gehöret för den som kallar (steg 3.10.20): byns anseende för hen (per invånare, -1 till 1), karisman från mitten,
  // vargdödare och ledare
  foljAns: 0.5, foljKar: 0.3, foljDrap: 0.3, foljLed: 0.3,
  folj: 0.2, // ... är tillsammans över detta
  na: 4, // jägarna anfaller när flocken är så här nära ...
  samlas: 8, // ... med de jägare som är så här nära den första ...
  samlasTim: 0.5, // ... när de andra har kommit fram, eller när den första väntat så här många timmar
  spara: 1.5, // jägarna följer blodspåret och fäller en skadad varg som sprang, med chansen spara × (1 − vargens blod)
  flyrJakt: 0.3, // flocken springer innan striden med den här chansen, gånger jägarnas antal mot vargarnas (högst 1)
  // striden
  bettInf: 0.3, // ett vargbett blir infekterat med den här chansen
  // skyddet (steg 3.7.15): den vuxna vågar möta flocken när mod / 20 + fler × (de vuxna som kan slåss / vargarna) är över vagar
  fler: 0.3,
  vagar: 0.8,
  // rollerna mot vargarna (steg 9.2.121): samma värde av ålder, mod och hälsa som mot rövarna (rovarVilja i rovare.ts), plus fler × (de
  // vuxna som kan slåss / vargarna); från vagar strider man (väntar med vapen vid elden), från hjalpFran håller man sig bakom, annars gömmer man sig
  hjalpFran: 0.5,
  bakom: 3, // hjälparna står så här många rutor bakom kämparna vid elden
  seddTim: 3, // larmet håller så länge flocken är nära byn och har setts de senaste så här många timmarna ...
  naraByn: 25, // ... och är så här nära byns område (utanforByn)
  // dörren (steg 3.7.21): en hungrig flock som inte ser någon ensam väntar utanför en stängd dörr så här många timmar
  vantaTim: 2,
  // talen som stod lösa i flockens val och i striden (kodgenomgången 3.10.25), med samma värden
  motKanin: 0.3, kaninEld: 1.5, // en flock hungrigare än motKanin går mot en kaningrupp som ligger mer än eldR × kaninEld från elden ...
  kaninHunger: 0.2, // ... och tar en kanin bara när hungern är minst så här stor
  dimmaSer: 0.5, // tät dimma tar bort så här stor del av vargarnas syn
  anfallFart: 4, // flocken springer så här många gånger flyFart när den anfaller
  kraftBas: 0.5, kraftSkada: 2, // en jägares styrka i jaktens kvot: kraftBas + kraftSkada × vapnets skada ...
  kallarBas: 0.7, kallarMod: 0.6, // ... och kvoten gånger kallarBas + kallarMod × kallarens mod / 20
  stridModBas: 0.6, stridModDrag: 0.8, // vargens mod i striden gånger stridModBas + stridModDrag × vargens drag (0–1) ...
  stridHungerBas: 0.7, stridHunger: 0.6, // ... och gånger stridHungerBas + stridHunger × flockens hunger
});

const flockarna = (s: State) => s.vargar ?? [];
// den brinnande lägereld som är närmast flocken, inom VARG.eldR (mitten av rutan, som nyttMal)
function narmasteEld(s: State, f: Vargflock) {
  let b: { x: number; y: number } | undefined, bd = VARG.eldR;
  for (const e of eldarOf(s)) if (e.lit) { const p = eldXY(s, e), m = { x: p.x + 0.5, y: p.y + 0.5 }, d = avst(f, m); if (d < bd) { bd = d; b = m; } }
  return b;
}
const vaken = (p: Person) => p.task?.act !== 'sova';
// flockens mod: vargarnas medelmod (0–1) gånger storleken
function flockMod(f: Vargflock) {
  let m = 0;
  for (const id of f.vargar) m += dragOf('varg', id).mod;
  return m / Math.max(1, f.vargar.length) * (1 + VARG.flockMod * (f.vargar.length - 1));
}
// den närmaste punkten på var och en av kartans fyra kanter, den närmaste först
export function kanterna(x: number, y: number) {
  const ut = [x, W - x, y, H - y];
  return [0, 1, 2, 3].sort((a, b) => ut[a] - ut[b]).map(i => ({ x: i === 0 ? 0.3 : i === 1 ? W - 0.3 : x, y: i === 2 ? 0.3 : i === 3 ? H - 0.3 : y }));
}
// flocken går mot (x, y) med farten (rutor i sekunden), aldrig in i ett stängt hus och aldrig ut i vattnet, som folket (inte
// heller på isen; kodgenomgången 3.10.25). Står den i vattnet (isen smälte under den) får den gå åt alla håll, så att den
// kommer i land. Är den raka vägen stängd tar den steget snett åt sidan. Svarar hur långt det är kvar, eller −1 när den inte
// kommer någonstans
const SNETT = [0, 0.8, -0.8, 1.6, -1.6];
// en vägg (gridOf solid) går ingen varg igenom, vare sig rummet är stängt eller inte
const vagg = (s: State, x: number, y: number) => gridOf(s).solid?.[Math.floor(y) * W + Math.floor(x)] === 1;
function ga(s: State, f: Vargflock, fart: number, dtSec: number, sokt = false): number {
  // vägen runt det som står i vägen (ett hus, en vägg): flocken följer den så länge målet är detsamma
  const mal = Math.floor(f.my) * W + Math.floor(f.mx);
  // ett mål som flyttat sig några rutor (den som flocken jagar går) behåller vägen; ett annat mål tar bort den
  if (f.vag && f.vag.m !== mal) { const vx = f.vag.m % W, vy = Math.floor(f.vag.m / W); if (f.vag.ingen || Math.hypot(vx - Math.floor(f.mx), vy - Math.floor(f.my)) > VARG.vagFlytt) f.vag = undefined; else f.vag.m = mal; }
  while (f.vag?.t.length) {
    const i = f.vag.t[0], wx = i % W + 0.5, wy = Math.floor(i / W) + 0.5;
    if (Math.hypot(wx - f.x, wy - f.y) < 0.4) { f.vag.t.shift(); continue; }
    const l = Math.min(Math.hypot(wx - f.x, wy - f.y), fart * dtSec), d = Math.hypot(wx - f.x, wy - f.y);
    const x = f.x + (wx - f.x) / d * l, y = f.y + (wy - f.y) / d * l;
    if (stangd(s, x, y) || vagg(s, x, y)) { f.vag = undefined; break; } // en dörr har stängts på vägen: vägen sökes om
    f.x = x; f.y = y;
    return Math.hypot(f.mx - f.x, f.my - f.y);
  }
  if (f.vag && !f.vag.ingen) f.vag = undefined;
  const dx = f.mx - f.x, dy = f.my - f.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return 0;
  const l = Math.min(d, fart * dtSec), vt = vattenNu(s), vatten = (x: number, y: number) => vt[Math.floor(y) * W + Math.floor(x)] === T.Vatten;
  const iVatten = vatten(f.x, f.y);
  // rakt fram om det går; annars en väg runt det som står i vägen, och finns ingen väg snett åt sidan
  const fram = (v: number) => {
    const c = Math.cos(v), sn = Math.sin(v), x = clamp(f.x + (dx * c - dy * sn) / d * l, 0.3, W - 0.3), y = clamp(f.y + (dx * sn + dy * c) / d * l, 0.3, H - 0.3);
    if (stangd(s, x, y) || vagg(s, x, y) || (!iVatten && vatten(x, y))) return false;
    f.x = x; f.y = y; return true;
  };
  if (fram(0)) return d - l;
  // en ny väg söks högst var VARG.vagSok sekund (en takt per tid): vägsökningen går över hela kartan
  const far = !sokt && !f.vag?.ingen && s.now - (f.vagT ?? -Infinity) >= VARG.vagSok * 1000;
  if (far) f.vagT = s.now;
  const vag = far ? findPath(groundOf(s), f.x, f.y, f.mx, f.my) : undefined;
  if (vag?.length) { f.vag = { m: mal, t: vag }; return ga(s, f, fart, dtSec, true); }
  if (far && !vag) f.vag = { m: mal, t: [], ingen: true }; // ingen väg dit: den söks inte igen förrän målet är ett annat
  for (const v of SNETT) if (v && fram(v)) return Math.hypot(f.mx - f.x, f.my - f.y);
  return -1;
}
// ett nytt mål en bit bort, bort från elden (och mot en kaningrupp när flocken är hungrig)
function nyttMal(s: State, f: Vargflock, bort?: { x: number; y: number }) {
  const e = eldPlats(s), ex = e.x + 0.5, ey = e.y + 0.5;
  if (bort) { const d = avst(f, bort) || 1; f.mx = clamp(f.x + (f.x - bort.x) / d * VARG.vandra, 1, W - 1); f.my = clamp(f.y + (f.y - bort.y) / d * VARG.vandra, 1, H - 1); return; }
  const g = f.hunger > VARG.motKanin ? grupperOf(s).filter(q => q.n > 0 && Math.hypot(q.x - ex, q.y - ey) > VARG.eldR * VARG.kaninEld).sort((a, b) => avst(a, f) - avst(b, f))[0] : undefined;
  if (g && avst(g, f) < VARG.vandra * 2) { f.mx = g.x; f.my = g.y; return; }
  let bx = f.x, by = f.y, bd = -1;
  for (let i = 0; i < 3; i++) {
    const v = rnd(s, 'varg') * Math.PI * 2, x = clamp(f.x + Math.cos(v) * VARG.vandra, 1, W - 1), y = clamp(f.y + Math.sin(v) * VARG.vandra, 1, H - 1);
    const d = Math.hypot(x - ex, y - ey);
    if (d > bd) { bd = d; bx = x; by = y; }
  }
  f.mx = bx; f.my = by;
}

// en flock kommer in från kanten under istiden, oftare och hungrigare i en hård vinter (steg 3.8.1, motgang.ts)
function kommer(s: State) {
  const hv = hardVinter(s);
  if (flockarna(s).length || !iIstiden(ageIndex(s)) || rnd(s, 'varg') >= VARG.kommer * (1 + (MOTGANG.hardVarg - 1) * hv)) return;
  const m = getMap(s.seed);
  let x = 0, y = 0;
  for (let i = 0; i < 20; i++) {
    const sida = Math.floor(rnd(s, 'varg') * 4), l = rnd(s, 'varg');
    x = sida === 0 ? 0.5 : sida === 1 ? W - 0.5 : l * W; y = sida === 2 ? 0.5 : sida === 3 ? H - 0.5 : l * H;
    if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break;
  }
  const n = rnd(s, 'varg') < VARG.ensam ? 1 : 2 + Math.floor(rnd(s, 'varg') * (VARG.flockMax - 1));
  const nr = s.vargNr = (s.vargNr ?? 0) + 1;
  const f: Vargflock = {
    id: nr, vargar: Array.from({ length: n }, (_, j) => 10_000_000 + nr * 8 + j), x, y, mx: x, my: y,
    gar: s.now + (VARG.stannarTim[0] + rnd(s, 'varg') * (VARG.stannarTim[1] - VARG.stannarTim[0])) * HOUR,
    hunger: Math.min(1, VARG.hunger0[0] + rnd(s, 'varg') * (VARG.hunger0[1] - VARG.hunger0[0]) + MOTGANG.hardHunger * hv), gor: 'stryker',
  };
  if (n > 1 && rnd(s, 'tamdjur') < VALP.chans) { f.valp = true; count(s, 'vargvalpar'); } // en valp går med flocken (steg 9.8.2), ur djurens egen följd
  nyttMal(s, f);
  (s.vargar ??= []).push(f);
  count(s, 'vargflockar'); count(s, 'vargar', n);
}

// en hungrig flock nära en kaningrupp tar en kanin
function kaninJakt(s: State, f: Vargflock) {
  if (f.hunger < VARG.kaninHunger) return;
  const g = grupperOf(s).find(q => q.n > 0 && avst(q, f) < VARG.kaninR);
  if (!g || rnd(s, 'varg') >= VARG.kaninChans) return;
  const k = djurOf(s).find(d => d.grupp === g.id);
  if (!k) return;
  dodaDjur(s, k.id); blodas(s, k.x, k.y, 'jakt', 1);
  f.hunger = Math.max(0, f.hunger - VARG.kaninMat);
  count(s, 'vargKanin');
}

// de som är vakna ser flocken och ropar; vakten ser längst och väcker byn när flocken är nära
function ses(s: State, f: Vargflock, folk: Person[]) {
  if (f.sedd !== undefined && s.now - f.sedd < VARG.larmTim * HOUR) return;
  const natt = isLight(s.now) ? 1 : VARG.nattSer, dimma = 1 - VARG.dimmaSer * vaderNu(s).dimma;
  const ser = (q: Person) => vaken(q) && avst(q, f) < (q.task?.act === 'vakt' ? VARG.vaktSer : VARG.folkSer) * natt * dimma;
  const hund = folk.some(q => q.task?.act === 'vakt' && ser(q)) ? undefined : hundSkaller(s, d => avst(d, f)); // vakthunden hör flocken före vakten (steg 9.8.11)
  if (hund && hund.p.task?.act === 'sova') { avbryt(s, hund.p); hund.p.task = undefined; }
  const vakt = folk.find(q => q.task?.act === 'vakt' && ser(q)) ?? hund?.p, p = vakt ?? folk.find(ser);
  if (!p) return;
  f.sedd = s.now; f.sag = p.id; f.sx = f.x; f.sy = f.y; // där flocken sågs (märket på kartan, steg 9.2.122)
  if (forstaGang(s, 'vargSedd')) log(s, `${p.name} såg ${f.vargar.length > 1 ? `en flock på ${tal(f.vargar.length)} vargar` : 'en ensam varg'} för första gången.`, 'world', [p.id]);
  notis(s, 'anfall', `${p.name} såg ${f.vargar.length > 1 ? `en flock på ${tal(f.vargar.length)} vargar` : 'en ensam varg'} nära byn.`, [p.id], { x: Math.floor(f.x), y: Math.floor(f.y) });
  const hort = larma(s, 'varg', f.vargar.length, [p]);
  // vakten väcker de vuxna som sover när flocken är nära byn
  if (vakt && utanforByn(s, f.x, f.y) < VARG.vack) {
    let n = 0;
    for (const q of folk) if (q.task?.act === 'sova' && ageOf(q, s.now) >= ALDER.vaktFran && !(skyddas(s, q) && iHus(s, q))) { avbryt(s, q); q.task = undefined; horLarm(q, { t: s.now, vad: 'varg', storlek: f.vargar.length, led: 0 }); n++; }
    if (n) { count(s, 'vargVackt', n); log(s, hund ? `${gen(vakt.name)} hund skällde och väckte byn: vargar nära.` : `${vakt.name} höll vakt och väckte byn: vargar nära.`, 'world', [vakt.id]); }
  }
  soker(s, [p, ...hort]);
}
// har p hört att vargar är nära (ropet eller vakten) inom VARG.vakenTim?
// (eller rövare, steg 4.4.5: byn skyddar sig likadant)
// Larmet om vargarna håller så länge flocken är nära byn och har setts nyligen (steg 9.2.121), inte bara en timme efter ropet
// vargarnas rad bland hoten (steg 9.5.19, roller.ts): viljan plus fler × (de vuxna som kan slåss / vargarna i larmet)
// utan larm (den som kallar till vargjakt, steg 12.1.82) räknas den största flocken byn sett nyligen
const kandFlock = (s: State) => Math.max(1, ...flockarna(s).filter(f => f.sedd !== undefined && s.now - f.sedd < VARG.jaktVet * HOUR).map(f => f.vargar.length));
LARMHOT.varg = { namn: 'Vargarna', plus: (s, p) => VARG.fler * living(s).filter(q => viljaKrok.kan(s, q)).length / Math.max(1, larmNu(s, p, 'varg')?.storlek ?? kandFlock(s)), kampe: () => VARG.vagar + 1e-12, hjalp: () => VARG.hjalpFran };
export const vargLarm = (s: State, p: Person) => { const v = larmNu(s, p, 'varg'), r = larmNu(s, p, 'rovare'); return v && (s.now - v.t < VARG.vakenTim * HOUR || vargarNara(s)) ? v : r && s.now - r.t < VARG.vakenTim * HOUR ? r : undefined; }; // vargarna eller rövarna (ett larm per sort, steg 12.1.211)
export const vargarNara = (s: State) => flockarna(s).some(f => f.gor !== 'flyr' && f.vargar.length > 0 && f.sedd !== undefined && s.now - f.sedd < VARG.seddTim * HOUR && utanforByn(s, f.x, f.y) < VARG.naraByn);

// ---------- skyddet när vargen kommer (steg 3.7.15) ----------
// När ropet hörs eller vakten väcker byn går barnen, de gamla, de sjuka och de svårt skadade in i närmaste hus, familjens eget
// först, och utan hus till elden nära de vuxna. Den som redan sover i ett hus sover vidare. En förälder med små barn stannar
// hos dem. De vuxna som vågar möta flocken (modet mot flockens storlek) tar sitt eget bästa vapen eller byns och samlas vid
// elden. Det varar VARG.vakenTim; sedan läggs vapnet tillbaka (agande.ts: tidyTools)
// den som inte kan slåss (barnen, de för gamla och de för svaga, vuxenKan i rovare.ts): samma förlager som mot rövarna (steg 12.1.82)
export const skyddas = (s: State, p: Person) => !viljaKrok.kan(s, p);
export const iHus = (s: State, p: Person) => !!roomAt(s, Math.floor(p.x), Math.floor(p.y));
// närmaste plats under tak: den egna sängen om den är under tak, annars en ruta i närmaste rum
// Vet p om rövare väger hotet på platsen och på vägen dit (steg B.48, roller.ts), och sängen är en av platserna
export function husPlats(s: State, p: Person) {
  const bed = bedFor(s, p), iRum = bed && roomAt(s, Math.floor(bed.x), Math.floor(bed.y)) ? bed : undefined, hotat = !!p.larm?.rovare;
  if (iRum && !hotat) return iRum;
  let bast: number | undefined, bd = Infinity;
  for (const r of gridOf(s).rooms) for (const i of r.tiles) { const at = { x: i % W + 0.5, y: Math.floor(i / W) + 0.5 }, d = hotat ? vagMedHot(s, p, at) : Math.hypot(at.x - p.x, at.y - p.y); if (d < bd) { bd = d; bast = i; } }
  if (iRum && vagMedHot(s, p, iRum) - LARMROLL.hotVikt / 10 <= bd) return iRum; // den egna sängen hellre, om den inte är farligare
  return bast === undefined ? undefined : punktIRuta(s, bast, p);
}
export const skyddVidElden = (s: State) => { const e = eldPlats(s); return freeNear(s, e.x + 0.5, e.y + 1.5); };
// de som gömmer sig vid elden sprider ut sig (steg B.15): platsen närmast den vanliga där ingen står (trängseln, glesPlats i trangsel.ts)
// och när rövarna är nära elden den sida av den, eller den plats längre bort, där hotet är mindre (steg B.48)
const gomdVidElden = (s: State, p: Person) => {
  const e = eldPlats(s), vid = { x: e.x + 0.5, y: e.y + 1.5 }, platser = hotKrok.vag(s, p, vid.x, vid.y) > 0 ? [vid, ...GOMRINGAR.flatMap(r => [0, 1, 2, 3, 4, 5, 6, 7].map(i => freeNear(s, vid.x + Math.cos(i * Math.PI / 4) * r, vid.y + Math.sin(i * Math.PI / 4) * r)))] : [vid];
  // vid elden är man nära de vuxna: en plats längre från elden måste vara mindre hotad för att vara bättre, hur nära den än ligger p
  const pris = (at: { x: number; y: number }) => Math.hypot(at.x - vid.x, at.y - vid.y) + LARMROLL.hotVikt * hotKrok.vag(s, p, at.x, at.y);
  const m = platser.length < 2 ? vid : platser.map(at => ({ at, d: pris(at) })).reduce((a, b) => b.d < a.d ? b : a).at;
  return glesPlats(s, p, k => { const v = k * 2.399, r = 0.9 * Math.sqrt(k); return freeNear(s, m.x + Math.cos(v) * r, m.y + Math.sin(v) * r); })!;
};
const GOMRINGAR = [4, 9, 15, 22]; // så många rutor från elden den som gömmer sig prövar platserna runt den
// vad p gör när vargar är nära (val.ts), eller undefined
type Skydd = { act: Act; why: string; spot?: { x: number; y: number }; dur: number; hot?: 'rovare' | 'varg' };
// valet när rövare är nära (rovarSkydd i rovare.ts, som sätter det här när modulen laddas, så att varg.ts inte behöver importera rovare.ts)
let rovarVal: ((s: State, p: Person, storlek: number, dur: number) => Skydd | undefined) | undefined;
export const setRovarVal = (f: typeof rovarVal) => { rovarVal = f; };
export function vargSkydd(s: State, p: Person): Skydd | undefined {
  const fi = kanGa(p) ? instangd(s, p) : undefined; // en varg väntar utanför dörren (steg 3.7.21)
  if (fi) return { act: 'gomma', why: `${fi.vargar.length > 1 ? 'Vargarna' : 'Vargen'} väntar utanför dörren`, hot: 'varg', spot: { x: p.x, y: p.y }, dur: Math.max(MIN, fi.vantar! + VARG.vantaTim * HOUR - s.now) };
  const l = vargLarm(s, p);
  if (!l || !kanGa(p)) return;
  const dur = l.vad === 'varg' && vargarNara(s) ? HOUR : Math.max(MIN, l.t + VARG.vakenTim * HOUR - s.now), fi2 = l.vad === 'rovare' ? 'Rövare' : 'Vargar';
  if (l.vad === 'rovare' && rovarVal) return rovarVal(s, p, l.storlek, dur); // rövarna väljs med sina egna tal (steg 9.2.75, rovare.ts)
  // rollerna (steg 9.2.121): kämpe, hjälpare eller gömd, med samma värde som mot rövarna; ingen står och pratar vid elden
  const roll = rollVid(s, p, 'varg');
  if (roll === 'kampe') return { act: 'forsvar', why: `${fi2} är nära, tar ${taVapen(s, p) ? 'ett vapen' : 'det som finns'} och väntar vid elden`, dur };
  if (roll === 'hjalpare') {
    const e = eldPlats(s), vinkel = (p.id * 2.399) % (2 * Math.PI);
    return { act: 'hjalpaRovare', why: `${fi2} är nära, håller sig bakom kämparna vid elden`, spot: freeNear(s, e.x + 0.5 + Math.cos(vinkel) * VARG.bakom, e.y + 0.5 + Math.sin(vinkel) * VARG.bakom), dur };
  }
  return gomSig(s, p, fi2, l.vad === 'rovare' ? 'rovare' : 'varg', dur);
}
// den som inte slåss eller hjälper: sover hen i ett hus sover hen vidare, annars gömmer hen sig i närmaste hus och utan hus
// vid elden nära de vuxna (mot vargarna och rövarna)
const HUSTRYGGT = 0.3; // ett hus är så mycket tryggare än ute (steg B.48)
export function gomSig(s: State, p: Person, vad: string, hot: 'rovare' | 'varg', dur: number): Skydd | undefined {
  if (p.task?.act === 'sova' && iHus(s, p)) return;
  // i huset om det är varmare där än vid elden, som sovplatsen (val.ts, plats sang): ett kallt hus skyddar inte mot kylan
  const plats = husPlats(s, p), c = coldOf(temperature(s)), rum = plats && roomAt(s, plats.x, plats.y);
  const eld = gomdVidElden(s, p), hus = plats && (!rum || c === 0 || varmareInne(s, rum, c)) && (hot !== 'rovare' || hotKrok.vag(s, p, plats.x, plats.y) <= hotKrok.vag(s, p, eld.x, eld.y) + HUSTRYGGT) ? plats : undefined;
  return { act: 'gomma', why: `${vad} är nära, ${hus ? 'gömmer sig i huset' : avst(eld, skyddVidElden(s)) > 6 ? 'håller sig undan' : 'håller sig vid elden nära de vuxna'}`, hot, spot: hus ?? eld, dur };
}
// den som hör ropet avbryter det hen gör och söker skydd (inte den som slåss, vårdar, bärs eller håller vakt)
export function soker(s: State, folk: Person[]) {
  for (const q of folk) {
    if (!q.task || !larmAvbryter(q.task.act, 'varg') || q.task.act === 'sova' && iHus(s, q) || !vargLarm(s, q)) continue; // den som sover i ett hus sover vidare
    avbryt(s, q); q.task = undefined; count(s, 'vargSkydd');
  }
}

// den som är ensam: ingen annan nära, inte bakom en stängd dörr och inte vid en brinnande eld (steg 3.7.21: en skinndörr
// stoppar ingen)
function ensam(s: State, p: Person, folk: Person[]) {
  if (iStangt(s, p) || brinnerNara(s, p.x, p.y, VARG.eldR)) return false;
  return !folk.some(q => q !== p && avst(q, p) < VARG.grupp);
}

// vad flocken gör i det här slaget
function flockSteg(s: State, f: Vargflock, folk: Person[], dtSec: number) {
  const e = eldPlats(s), eld = { x: e.x + 0.5, y: e.y + 0.5 };
  if (f.gor !== 'flyr' && s.now >= f.gar) { f.gor = 'flyr'; f.jagare = undefined; }
  if (f.gor === 'flyr') { // mot den närmaste kanten; står vattnet i vägen prövas de andra kanterna, närmast först
    let kvar = -1;
    for (const k of kanterna(f.x, f.y)) { f.mx = k.x; f.my = k.y; kvar = ga(s, f, VARG.flyFart, dtSec); if (kvar >= 0) break; }
    if (kvar < 0.5) { f.vargar = []; count(s, 'vargflockBorta'); }
    return;
  }
  // jägarna går mot flocken (som inte märker dem förrän de är nära). Den som inte längre jagar (avbruten, larm, skadad) är inte
  // med, och när ingen jagar är jakten slut: då kan byn kalla till en ny och flocken undviker grupper igen
  if (f.jagare) {
    f.jagare = f.jagare.filter(id => { const q = byId(s, id); return !!q && q.health > 0 && (q.task?.act === 'vargjakt' || s.now < (f.kallTill ?? 0)); });
    if (!f.jagare.length) { f.jagare = undefined; f.samlas = undefined; }
    for (const id of f.jagare ?? []) {
      const tk = byId(s, id)!.task;
      if (tk?.act === 'vargjakt' && tk.phase === 'go' && Math.hypot(tk.tx - f.x, tk.ty - f.y) > 3) { const sp = jaktPlats(s, f); if (sp) { tk.tx = sp.x; tk.ty = sp.y; } }
    }
  }
  if (f.gor === 'ater') { // efter segern (steg B.11): flocken äter av den döda tills den är mätt, kroppen är borta eller flera människor kommer
    const q = f.kropp === undefined ? undefined : kvarById(s, f.kropp), m = q && { x: q.x + 0.5, y: q.y + 0.5 };
    const storda = folk.some(a => vaken(a) && !nere(a) && avst(a, f) < VARG.undvik && folk.some(b => b !== a && !nere(b) && avst(a, b) < VARG.grupp));
    if (!m || q!.bars !== undefined || storda || f.hunger <= 0) { f.gor = 'flyr'; f.kropp = undefined; return; }
    f.mx = m.x; f.my = m.y;
    const kvar = ga(s, f, VARG.gaFart, dtSec);
    if (kvar < 0) { f.gor = 'flyr'; f.kropp = undefined; } else if (kvar < 1) f.hunger = Math.max(0, f.hunger - VARG.ater * dtSec / 60);
    return;
  }
  if (f.gor === 'anfaller') {
    const p = f.byte !== undefined ? byId(s, f.byte) : undefined;
    if (!p || p.health <= 0 || nere(p) || !ensam(s, p, folk)) { f.gor = 'stryker'; f.byte = undefined; nyttMal(s, f); return; }
    const m = vagIn(s, f, p); f.mx = m.x; f.my = m.y;
    const kvar = ga(s, f, VARG.flyFart * VARG.anfallFart, dtSec);
    if (kvar < 0) { f.gor = 'stryker'; f.byte = undefined; nyttMal(s, f); return; } // kommer inte fram
    if (m === p && kvar < 1) { f.gor = 'stryker'; f.byte = undefined; vargStrid(s, f, [p], 'skada', 'när vargarna anföll'); nyttMal(s, f, p); }
    return;
  }
  if (f.gor === 'smyger') {
    if (folk.some(q => vaken(q) && avst(q, f) < VARG.vaken)) { f.gor = 'stryker'; f.tam = undefined; nyttMal(s, f, eld); return; }
    if (f.tam !== undefined) { tamSmyger(s, f, dtSec); return; }
    const kvar = ga(s, f, VARG.gaFart, dtSec);
    if (kvar < 0) { f.gor = 'stryker'; nyttMal(s, f, eld); } // förrådet är i ett stängt hus
    else if (kvar < 1) { stjal(s, f); f.gor = 'stryker'; nyttMal(s, f, eld); }
    return;
  }
  // stryker omkring: undan från grupper och elden, mot en ensam människa när den är hungrig, eller fram till förrådet på natten
  const n = f.vargar.length, mod = flockMod(f);
  // (den som är bakom en stängd dörr är ingen fara för flocken)
  const ute = folk.filter(q => !iStangt(s, q));
  if (!f.jagare) {
    const grupp = ute.find(q => avst(q, f) < VARG.undvik && ute.some(o => o !== q && avst(o, q) < VARG.grupp));
    if (grupp) { slutaVanta(f); nyttMal(s, f, grupp); ga(s, f, VARG.flyFart, dtSec); return; }
  }
  const nara = f.hunger < VARG.eldHunger ? narmasteEld(s, f) : undefined; // undan från varje brinnande lägereld
  if (nara) { slutaVanta(f); nyttMal(s, f, nara); ga(s, f, VARG.flyFart, dtSec); return; }
  if (f.gor === 'vantar') { vanta(s, f, folk, dtSec); return; }
  if (n >= 2 && f.hunger * (0.5 + mod) > VARG.anfall) {
    const p = bytet(s, f, folk);
    if (p && chansPer(s, VARG.anfallChans, 60, dtSec, 'varg')) { f.gor = 'anfaller'; f.byte = p.id; count(s, 'vargAnfall'); return; }
    if (!p) { // ingen är ensam: flocken kan vänta utanför ett stängt hus där någon gömmer sig
      const o = stangdDorr(s, f, folk);
      if (o && !f.trottnat && chansPer(s, VARG.anfallChans, 60, dtSec, 'varg')) { borjaVanta(s, f, o, folk); return; }
    }
  }
  // ett får eller en get som står ute utan någon vaken nära (steg 9.8.12): djuret i fähuset är skyddat
  const d = f.hunger > VARG.stjalHunger ? tamBytet(s, f, folk) : undefined;
  if (d && chansPer(s, VARG.stjalChans, 60, dtSec, 'varg')) { f.gor = 'smyger'; f.tam = d.id; f.mx = d.x; f.my = d.y; count(s, 'vargSmygerTam'); return; }
  const z = zoneOf(s);
  if (z && !isLight(s.now) && f.hunger > VARG.stjalHunger && (!s.fire.lit || f.hunger >= VARG.eldHunger) && chansPer(s, VARG.stjalChans, 60, dtSec, 'varg')) {
    f.gor = 'smyger'; f.mx = z.x + z.w / 2; f.my = z.y + z.h / 2; count(s, 'vargSmyger'); return;
  }
  if (ga(s, f, VARG.gaFart, dtSec) < 1) nyttMal(s, f);
}
// flocken ser q (steg 10.7.22): den som är klädd vitt i snön syns på kortare håll
export const vargSer = (s: State, q: Person, d: number) => d < VARG.ser && (d < VARG.ser * (1 - VARG.vit) || d < VARG.ser * (1 - VARG.vit * doljISno(s, q)));
// den som ligger nere är redan fälld: flocken börjar ingen strid mot hen (steg B.11)
const nere = (q: Person) => !!q.svimmat || q.task?.act === 'medvetslos' || !kanGa(q);
const bytet = (s: State, f: Vargflock, folk: Person[]) => folk.filter(q => !nere(q) && vargSer(s, q, avst(q, f)) && ensam(s, q, folk)).sort((a, b) => avst(a, f) - avst(b, f))[0];

// ---------- dörren och vargen (steg 3.7.21) ----------
// En dörr som stängs (stanger i DORRAR, byggnad.ts: trädörren) stängs när någon gömmer sig i huset (3.7.15), och vargarna kommer
// aldrig igenom den: de går inte in i huset eller dess väggar (ga). Ser en hungrig flock ingen som är ensam kan den vänta utanför
// dörren en stund (VARG.vantaTim) och stänga in dem som är där: de håller sig gömda (vargSkydd), men de vuxna som vågar möta
// flocken går ut och slåss. Efter ett tag tröttnar flocken (och väntar inte vid någon dörr igen), och ser den någon ensam i byn jagar den hellre den. En skinndörr
// håller bara värmen inne och stoppar ingen; den som är ensam i ett hus med en öppen dörr kan anfallas där
const RUNT = [...GRANNAR4, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const; // också snett, för hörnen
const grannRum = (s: State, x: number, y: number) => RUNT.map(([dx, dy]) => roomAt(s, x + dx + 0.5, y + dy + 0.5)).filter((r): r is Rum => !!r);
// rummet är stängt: alla dess öppningar har en dörr som stängs, och någon gömmer sig där
export function stangt(s: State, r: Rum) {
  if (!r.open) return false;
  const g = gridOf(s);
  for (const i of r.walls) { const b = g.at.get(i)!; if (b.k === 'oppning' && !dorrDef(b.dorr)?.stanger) return false; }
  if ((s.vargar ?? []).some(f => f.vargar.length && roomAt(s, f.x, f.y) === r)) return false; // med en varg i rummet går dörren inte att stänga
  // någon gömmer sig i rummet, eller i ett rum innanför i samma hus (ett hus delat i två rum, steg 10.2.69): då stängs också den yttre dörren
  const innanfor = new Set<Rum>([r]);
  for (const i of r.walls) { const b = g.at.get(i)!; if (b.k === 'oppning' && b.hus === r.hus) for (const q of grannRum(s, b.x, b.y)) if (q.hus === r.hus) innanfor.add(q); }
  return living(s).some(q => { if (q.task?.act !== 'gomma') return false; const qr = roomAt(s, q.x, q.y); return !!qr && innanfor.has(qr); });
}
const iStangt = (s: State, p: { x: number; y: number }) => { const r = roomAt(s, p.x, p.y); return !!r && stangt(s, r); };
// en varg kan inte vara här: i ett stängt rum eller i dess väggar och dörrar
function stangd(s: State, x: number, y: number) {
  if (!s.hus?.length) return false;
  const r = roomAt(s, x, y);
  if (r) return stangt(s, r);
  return !!bitAt(s, x, y) && grannRum(s, Math.floor(x), Math.floor(y)).some(q => stangt(s, q));
}
// öppningarna i rummet, och platsen precis utanför en öppning
const oppningar = (s: State, r: Rum) => r.walls.map(i => gridOf(s).at.get(i)!).filter(b => b.k === 'oppning');
function utanfor(s: State, o: Bit) {
  for (const [dx, dy] of GRANNAR4) {
    const x = o.x + dx + 0.5, y = o.y + dy + 0.5;
    if (!roomAt(s, x, y) && !bitAt(s, x, y)) return { x, y };
  }
  return { x: o.x + 0.5, y: o.y + 0.5 };
}
// vägen in till den som är i ett hus: först till platsen utanför dörren, sedan genom öppningen
function vagIn(s: State, f: Vargflock, p: Person): { x: number; y: number } {
  const r = roomAt(s, p.x, p.y);
  if (!r || roomAt(s, f.x, f.y) === r) return p;
  const o = oppningar(s, r).sort((a, b) => avst(f, { x: a.x + 0.5, y: a.y + 0.5 }) - avst(f, { x: b.x + 0.5, y: b.y + 0.5 }))[0];
  if (!o) return p;
  const oc = { x: o.x + 0.5, y: o.y + 0.5 }, ut = utanfor(s, o);
  return avst(f, oc) < 0.75 ? p : avst(f, ut) < 0.3 ? oc : ut;
}
// dörren till det närmaste stängda huset där någon gömmer sig, inom synhåll
function stangdDorr(s: State, f: Vargflock, folk: Person[]) {
  const q = folk.filter(p => p.task?.act === 'gomma' && vargSer(s, p, avst(p, f)) && iStangt(s, p)).sort((a, b) => avst(a, f) - avst(b, f))[0];
  const r = q && roomAt(s, q.x, q.y);
  if (!r) return undefined;
  // dörren ut ur huset: i ett hus med flera rum (steg 10.2.69) är rummets egen öppning kanske en inre dörr
  const ut = bitsOf(s).filter(b => b.k === 'oppning' && b.hus === r.hus && GRANNAR4.some(([dx, dy]) => !roomAt(s, b.x + dx + 0.5, b.y + dy + 0.5) && !bitAt(s, b.x + dx + 0.5, b.y + dy + 0.5)));
  return (ut.length ? ut : oppningar(s, r)).sort((a, b) => avst(f, a) - avst(f, b))[0];
}
// rummet bakom dörren där flocken väntar, om det fortfarande är stängt
const vantarVid = (s: State, f: Vargflock) => f.dorr ? grannRum(s, f.dorr.x, f.dorr.y).find(r => stangt(s, r)) : undefined;
// vem i rummet som är där flocken väntar (vargSkydd)
const instangd = (s: State, p: Person) => flockarna(s).find(f => { if (f.gor !== 'vantar') return false; const r = vantarVid(s, f); return !!r && roomAt(s, p.x, p.y) === r; });
function slutaVanta(f: Vargflock) { if (f.gor === 'vantar') { f.gor = 'stryker'; f.dorr = f.vantar = undefined; } }
function borjaVanta(s: State, f: Vargflock, o: Bit, folk: Person[]) {
  f.gor = 'vantar'; f.dorr = { x: o.x, y: o.y }; f.vantar = s.now;
  const ut = utanfor(s, o); f.mx = ut.x; f.my = ut.y;
  count(s, 'vargVantar');
  const r = vantarVid(s, f), inne = folk.filter(q => r && roomAt(s, q.x, q.y) === r);
  // de som är vakna i huset slutar med det de gör och håller sig gömda
  for (const q of inne) if (q.task && larmAvbryter(q.task.act, 'varg') && q.task.act !== 'sova') { avbryt(s, q); q.task = undefined; }
  log(s, `${f.vargar.length > 1 ? 'Vargarna' : 'Vargen'} väntar utanför dörren${inne.length ? `, och ${och(inne.map(q => q.name))} är instängda` : ''}.`, 'world', inne.map(q => q.id));
}
// de vuxna i huset som vågar gå ut och möta flocken: de vars roll vid larmet är kämpe (rollVid, som vargSkydd; steg 12.1.82)
const modiga = (s: State, inne: Person[]) => inne.filter(q => rollVid(s, q, 'varg') === 'kampe');
// flocken som väntar utanför dörren
function vanta(s: State, f: Vargflock, folk: Person[], dtSec: number) {
  const r = vantarVid(s, f), o = f.dorr && bitAt(s, f.dorr.x + 0.5, f.dorr.y + 0.5);
  if (!r || !o) { slutaVanta(f); nyttMal(s, f); return; } // dörren öppnades eller ingen gömmer sig längre
  const ut = utanfor(s, o);
  if (s.now - f.vantar! > VARG.vantaTim * HOUR) { // flocken tröttnar
    slutaVanta(f); f.trottnat = true; nyttMal(s, f, ut); count(s, 'vargTrottnade');
    log(s, `${f.vargar.length > 1 ? 'Vargarna' : 'Vargen'} tröttnade på att vänta utanför dörren och drog sig bort.`, 'world');
    return;
  }
  const p = bytet(s, f, folk); // ser den någon ensam i byn jagar den hellre den
  if (p && chansPer(s, VARG.anfallChans, 60, dtSec, 'varg')) { slutaVanta(f); f.gor = 'anfaller'; f.byte = p.id; count(s, 'vargAnfall'); return; }
  f.mx = ut.x; f.my = ut.y;
  if (ga(s, f, VARG.flyFart, dtSec) > 1) return;
  const modigaUt = modiga(s, folk.filter(q => roomAt(s, q.x, q.y) === r)); // de som vågar går ut och slåss
  if (!modigaUt.length) return;
  slutaVanta(f); count(s, 'vargDorrStrid');
  for (const q of modigaUt) { q.x = ut.x; q.y = ut.y; }
  vargStrid(s, f, modigaUt, 'skada', 'utanför dörren');
  if (f.gor !== 'flyr') nyttMal(s, f, ut);
}

// flocken tar mat ur förrådet: köttet först, hela saker. Listan går art för art ur slaktregistret DJUR (redskap.ts: den fällda
// eller slaktade kroppen och delen, inte fisken som rensas), sedan köttslagen, fisken och det lagade köttet; en fälld varg i
// förrådet kan också tas (det är avsiktligt, kodgenomgången 3.10.25). Listan byggs första gången, eftersom redskap.ts genom
// sina importer läser den här filen
let stjals: string[] | undefined;
const STJALS = () => stjals ??= [...new Set([...Object.values(DJUR as Record<string, Djurart & { del?: string }>).filter(d => d.act !== 'rensa').flatMap(d => d.del ? [d.sak, d.del] : [d.sak]), ...KOTTSLAG, 'fisk', 'abborre', 'grillkott', 'torrkott', 'rokkott'])];
function stjal(s: State, f: Vargflock) {
  let n = Math.max(1, Math.round(f.vargar.length * VARG.stjalPer)), tog = 0;
  const tagna: Record<string, number> = {};
  for (const k of STJALS()) while (n > 0 && SAKER[k] && amountOf(s, k) >= 1) { addTo(s, k, -1); n--; tog++; tagna[k] = (tagna[k] ?? 0) + 1; }
  if (!tog) return;
  f.hunger = Math.max(0, f.hunger - VARG.stjalMat * tog);
  count(s, 'vargStal', tog);
  log(s, `Vargar smög in i byn i mörkret och tog ${och(Object.entries(tagna).map(([k, m]) => antal(m, k)))} ur förrådet.`, 'world');
}

// ---------- vargarna och betesdjuren (steg 9.8.12) ----------
// Ett får eller en get som står ute (inte i fähuset) och som ingen vaken människa är nära kan flocken smyga fram till och ta.
const tamBytet = (s: State, f: Vargflock, folk: Person[]) => tamUte(s).filter(d => avst(d, f) < VARG.ser && !folk.some(q => vaken(q) && avst(q, d) < VARG.vaken)).sort((a, b) => avst(a, f) - avst(b, f))[0];
function tamSmyger(s: State, f: Vargflock, dtSec: number) {
  const d = tamUte(s).find(q => q.id === f.tam);
  if (!d) { f.gor = 'stryker'; f.tam = undefined; nyttMal(s, f); return; } // djuret står inne eller är borta
  f.mx = d.x; f.my = d.y;
  const kvar = ga(s, f, VARG.gaFart, dtSec);
  if (kvar < 0) { f.gor = 'stryker'; f.tam = undefined; nyttMal(s, f); return; }
  if (kvar >= 1) return;
  tamDor(s, d, 'av vargarna'); blodas(s, d.x, d.y, 'jakt', 1);
  f.hunger = Math.max(0, f.hunger - VARG.tamMat);
  f.gor = 'stryker'; f.tam = undefined; nyttMal(s, f);
  count(s, 'vargTogTam');
  notis(s, 'motgang', `Vargar tog ${tamArt(d.art).ord[0]} ${tamArt(d.art).ord[1]} som stod ute.`, d.agare !== undefined ? [d.agare] : [], { x: Math.floor(d.x), y: Math.floor(d.y) });
}

// platsen på land där jägarna möter flocken, eller ingen när flocken står för långt ut på isen (människor går inte på vattnet)
const jaktPlats = (s: State, f: Vargflock) => jaktPlatsVid(s, f.x, f.y);

// när byn vet om flocken kallar den som såg den först till vargjakt om hen vågar, annars ledaren eller den modigaste som vågar
// (steg 3.10.20). Hur många som följer beror också på gehöret för den som kallar
export function jaktBeslut(s: State, f: Vargflock, folk: Person[]) {
  if (f.jagare || f.gor === 'flyr' || !isLight(s.now) || f.sedd === undefined || s.now - f.sedd > VARG.jaktVet * HOUR) return;
  const kan = folk.filter(q => ageOf(q, s.now) >= ALDER.vaktFran && ageOf(q, s.now) < ALDER.vaktTill && !isSick(q, s.now) && halsa(q) >= KROPP.svag && kanGa(q) && q.task?.act !== 'strid' && q.task?.act !== 'vargjakt' && !larmNu(s, q, 'fara')?.falskt);
  if (!kan.length) return;
  const vagar = (q?: Person) => !!q && kan.includes(q) && rollVid(s, q, 'varg') === 'kampe'; // rollen vid larmet (steg 12.1.82)
  const { kallar, led } = jaktKallare(s, kan, f.sag === undefined ? undefined : byId(s, f.sag), vagar);
  if (!kallar) return;
  const gehor = VARG.foljAns * clamp(anseende(s, kallar.id).a / Math.max(1, folk.length), -1, 1) + VARG.foljKar * franMitt(kallar, 'karisma', s.now)
    + (kallar.liv?.vargar ? VARG.foljDrap : 0) + (kallar === led ? VARG.foljLed : 0);
  const nod = clamp(1 - foodOf(s) / Math.max(1, folk.length) / VARG.matNog, 0, 1), sed = (s.seder.v as Record<string, number>).strid ?? 0;
  const vill = jaktFoljer(s, kan, kallar, VARG, VARG.foljSed * sed, nod, gehor, 'varg');
  const kraft = vill.reduce((a, q) => a + VARG.kraftBas + VARG.kraftSkada * VAPEN[personKampe(s, q, 0, 0, 0, 0).vapen].skada, 0);
  const kvot = kraft / (f.vargar.length * VARG.kraftVarg) * (1 + VARG.nod * nod) * (VARG.kallarBas + VARG.kallarMod * stat(kallar, 'mod', s.now) / 20);
  if (kvot < VARG.jaktKvot || rnd(s, 'varg') >= VARG.jaktChans) return;
  const sp = jaktPlats(s, f);
  if (!sp) return; // flocken står för långt ut på isen
  // den som kallar går genast; de som följer med avbryter det de gör och väljer igen, där vargjakten är ett Tillfälle i
  // arbetsordningen (vargjaktVal, steg 6.1.14): den som är i nöd tar hand om det först
  f.jagare = vill.map(q => q.id); f.kallare = kallar.id; f.kallTill = s.now + VARG.kallMin * MIN; f.jaktTill = s.now + VARG.jaktTim * HOUR;
  for (const q of vill) avbryt(s, q);
  kallar.task = { act: 'vargjakt', phase: 'go', tx: sp.x, ty: sp.y, until: f.jaktTill, carry: 0, why: 'Kallar till vargjakt' };
  count(s, 'vargjakt');
  log(s, `${kallar.name} kallade till vargjakt${vill.length > 1 ? `, och ${heltOrd(vill.length - 1)} följde med` : ''} (${f.vargar.length > 1 ? `en flock på ${heltOrd(f.vargar.length)}` : 'en ensam varg'}).`, 'world', vill.map(q => q.id));
}

// nivån Tillfälle (val.ts, steg 6.1.14): den som ska följa med på vargjakten och ännu inte gått
export function vargjaktVal(s: State, p: Person) {
  if (heligtAvstar(s, p, 'varg')) return undefined; // det heliga djuret jagas inte; den som blir anfallen försvarar sig (steg 10.3.15)
  const f = flockarna(s).find(x => x.jagare?.includes(p.id));
  if (!f || f.gor === 'flyr' || p.task?.act === 'vargjakt' || s.now >= (f.kallTill ?? 0) || s.now >= (f.jaktTill ?? 0)) return undefined;
  const sp = jaktPlats(s, f), k = f.kallare === undefined ? undefined : byId(s, f.kallare);
  if (!sp) return undefined;
  return { spot: sp, dur: f.jaktTill! - s.now, why: k ? `Följer ${k.name} på vargjakt` : 'Följer med på vargjakt' };
}

// jägaren som kommit fram (MEDAN i steg.ts): anfaller flocken med de jägare som är nära
export function vargjaktSteg(s: State, p: Person, tk: Task) {
  if (tk.carry || tk.prog) return;
  const f = flockarna(s).find(x => x.jagare?.includes(p.id));
  if (!f || f.gor === 'flyr') { tk.until = s.now; tk.prog = 1; return; }
  // längre bort än na: går närmare, om det går (står flocken på isen kommer man inte närmare än stranden, och anfaller därifrån;
  // finns ingen strand nära väntar man)
  if (avst(p, f) > VARG.na) {
    const sp = jaktPlats(s, f);
    if (!sp) return;
    if (Math.hypot(sp.x - p.x, sp.y - p.y) > 1) { tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; return; }
  }
  // de som kallats räknas tills kallelsen löpt ut, också de som inte hunnit ge sig av än, som i björnjakten (steg 12.1.59)
  const { med, vanta } = jaktSamlas(s, p, f, 'vargjakt', VARG.samlas, VARG.samlasTim);
  if (vanta) return; // väntar in de andra
  f.jagare = undefined; f.samlas = undefined;
  if (rnd(s, 'varg') < VARG.flyrJakt * Math.min(1, med.length / f.vargar.length)) {
    f.gor = 'flyr'; count(s, 'vargjaktFlydde');
    for (const q of med) { q.task!.until = s.now; q.task!.prog = 1; }
    log(s, `Vargarna märkte jägarna och sprang innan ${p.name} och de andra hann fram.`, 'world', med.map(q => q.id));
    kronikaBer(s, 'k_vargSprang', p.id, { ...personFalt(p), med: med.length > 1 ? ` med ${tal(med.length - 1)} till` : '', de: med.length > 1 ? 'de' : han(p), dem: med.length > 1 ? 'dem' : honom(p) }); // steg 3.7.16
    return;
  }
  vargStrid(s, f, med, 'doda', 'på vargjakt'); // de som är kvar drar vidare när striden är slut (vargSlut)
}

// en strid mellan folk och flocken på kartan (steg 10.1.17, kartstrid.ts): vargarna är kämpar ur registret (KAMPAR) där flocken
// står, människorna där de står, och striden stegas med byn. Såren sitter på folket när bettet träffar (STRIDSLAG.varg); när den
// är slut gör vargSlut resten. De dödade vargarna bärs hem av jägarna (på vargjakt)
export function vargStrid(s: State, f: Vargflock, folk: Person[], avsikt: Avsikt, orsak: string, utanLarm = false) {
  const n = f.vargar.length, modF = 1 + VARG.flockMod * (n - 1);
  const djur: DjurMed[] = f.vargar.map((id, j) => {
    const d = dragOf('varg', id), v = j / Math.max(1, n) * Math.PI * 2, q = freeNear(s, clamp(f.x + (n > 1 ? Math.cos(v) : 0), 0.5, W - 0.5), clamp(f.y + (n > 1 ? Math.sin(v) : 0), 0.5, H - 0.5)), k = djurKampe('varg', 0, 1, q.x, q.y);
    k.fart = d.snabbhet; k.st.styrka = d.styrka; k.st.mod = clamp(k.st.mod * (VARG.stridModBas + VARG.stridModDrag * d.mod) * modF * (VARG.stridHungerBas + VARG.stridHunger * f.hunger), 1, 20);
    if (j === 0 && n > 1) { k.ledare = 'fram'; k.namn = 'Ledarvargen'; } else if (n > 1) k.namn = `Varg ${j + 1}`; // ledarvargen: faller den sjunker modet hos de andra
    return { art: 'varg', id, k, blod: halsaOf(s, id).blod };
  });
  const med = folk.filter(p => p.gast ? p.died === undefined && p.left === undefined : alive(p)) /* också rövarna (steg 10.2.29) */;
  if (!med.length || !djur.length) return;
  if (!utanLarm) soker(s, larma(s, 'varg', n, med.filter(vaken))); // de som slåss ropar (inte rövarna, steg 10.2.29)
  kartStridBorja(s, avsikt, [med, []], 'vargar ' + orsak, { typ: 'varg', egen: true, flock: f.id, avsikt, orsak, n }, djur);
  count(s, 'djurStrid');
}
// striden med flocken som pågår på kartan
export const vargIStrid = (s: State, f: Vargflock) => kartStrider(s).find(g => g.efter?.typ === 'varg' && g.efter.flock === f.id);
// såren i striden med vargar: bettet skrämmer, och blir ofta infekterat
STRIDSLAG.varg = {
  orsak: 'varg', text: 'i en strid med vargar', dod: s => count(s, 'dodVarg'),
  sar: (s, p, w) => {
    if (w.k !== 'bett') return;
    livet(s, p, 'bett', true); upplev(s, p, 'vargbett'); if (w.g >= 0.5) tecken(s, p, 'overlevde', p.name); // rädd för vargar efteråt (steg 3.9.8, 4.1.1.2)
    const sk = p.skador?.[p.skador.length - 1];
    if (sk && rnd(s, 'varg', p) < VARG.bettInf) { sk.inf ??= 0; count(s, 'vargbettInf'); }
  },
};
// striden med vargarna är slut (EFTER.varg, kartstrid.ts): vargarna som dog och skadades, vem som bär hem, och raderna om det
function vargSlut(s: State, efter: Efter, vinnare: 0 | 1 | -1, g: KartStrid) {
  const f = flockarna(s).find(x => x.id === efter.flock), avsikt = efter.avsikt as Avsikt, orsak = String(efter.orsak ?? ''), st = g.st;
  const alla = st.kampar.filter(k => k.pid !== undefined).map(k => byId(s, k.pid!)!).filter(p => !!p), folk = alla.filter(p => alive(p));
  if (!f) return;
  const djuren = g.djur ?? [], n = djuren.length;
  const kampeAv = (p: Person) => st.kampar.find(k => k.pid === p.id)!;
  count(s, 'vargstrid');
  // vargarna: de döda och de skadade, och vem som dödade
  const doda: Person[] = [], kvar: number[] = [];
  djuren.forEach(({ k: kid, id }) => {
    const k = st.kampar.find(q => q.id === kid);
    if (!k || !f.vargar.includes(id)) return;
    // en skadad varg som sprang under vargjakten: jägarna följer blodspåret och fäller den med en chans som växer med skadan
    const spar = avsikt === 'doda' && k.lage !== 'dod' && k.lage !== 'strid' && k.blod < 1 && rnd(s, 'varg') < VARG.spara * (1 - k.blod);
    if (spar) { count(s, 'vargSpar'); log(s, `Jägarna följde blodspåret och fällde den skadade vargen.`, 'world', folk.map(p => p.id)); }
    if (k.lage === 'dod' || spar) {
      dodaDjur(s, id);
      const r = [...st.logg].reverse().find(x => x.h === 'traff' && x.b === k.id), fk = r && st.kampar.find(q => q.id === r.a), fallde = fk?.pid !== undefined ? byId(s, fk.pid) : undefined;
      const forsta = !fallde?.gast && forstaGang(s, 'vargDodad'); // räknar också; rövarens byte är inte byns (steg B.18)
      if (fallde) { handelse(s, fallde, 'vargdodare'); livet(s, fallde, 'vargar'); upplev(s, fallde, 'fallde'); if (r?.v) sakVarg(s, redskapIHanden(s, fallde, r.v), fallde); // vapnet minns vargen (steg 3.9.4)
         if (forsta) { log(s, `${fallde.name} dödade byns första varg.`, 'world', [fallde.id]); kronikaBer(s, 'k_forstaVarg', fallde.id, personFalt(fallde)); } }
      doda.push(fallde ?? folk[0] ?? alla[0]);
    } else { kvar.push(id); satDjurHalsa(s, id, k.blod, halsaOf(s, id).sar + k.skador.reduce((a, w) => a + w.g, 0)); }
  });
  f.vargar = kvar;
  if (!folk.length) { efterSegern(s, f, alla, vinnare); return; } // alla som slogs är döda
  // folket: såren sitter redan på dem (STRIDSLAG.varg); här det som hör till slutet
  const bar = new Set<Person>(), svara: string[] = [];
  folk.forEach(p => {
    const k = kampeAv(p);
    if (!k) return;
    efterKampen(s, p, st, k, svara, vinnare === 0 ? 'klaradeVargar' : 'anfollsVargar', vinnare === 0);
    avbryt(s, p);
    const tid = SLAGSMAL.minst * SEC; // striden har redan pågått på kartan (steg 9.2.29)
    // den som står kvar efter en vargjakt bär hem en fälld varg (den som dödade den först)
    if (avsikt === 'doda' && k.lage === 'strid' && doda.length > bar.size) {
      bar.add(p);
      p.task = { act: 'vargjakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 1, prog: 1, why: 'Bär hem en fälld varg' };
      styckaFallt(s, p, p.task, 'varg'); // för tung att bära: styckas där den föll (steg 6.6.1)
    } else p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 0, why: orsak };
  });
  if (doda.length > bar.size) { count(s, 'vargKvar', doda.length - bar.size); lamnaFallt(s, 'varg', doda.length - bar.size, folk[0].x, folk[0].y); } // fler fällda än det fanns bärare: de ligger kvar (steg 6.6.1)
  blodas(s, folk[0].x, folk[0].y, 'jakt', 1);
  const namn = lista(folk.map(loggNamn));
  const vargarna = n > 1 ? 'Vargarna' : 'Vargen';
  const stText = `${namn} slogs med ${n > 1 ? `${tal(n)} vargar` : 'en varg'} ${orsak}. ${doda.length ? `${stor(tal(doda.length))} ${doda.length === 1 ? 'varg dog' : 'vargar dog'}. ` : ''}${vinnare === 0 ? `${vargarna} förlorade.` : vinnare === 1 ? `${vargarna} vann.` : 'Ingen vann.'}`;
  if (harSlagits(st)) { log(s, stText, 'world', folk.map(p => p.id)); notis(s, 'strid', stText, folk.map(p => p.id), { x: Math.floor(folk[0].x), y: Math.floor(folk[0].y) }); } // (steg B.18)
  // krönikan (steg 3.7.16): varje vargjakt, och den som skadades svårt när vargarna anföll (döden skriver die)
  if (avsikt === 'doda') kronikaBer(s, 'k_vargjakt', folk[0].id, { folk: och(folk.map(p => p.name)), de: folk.length > 1 ? 'de' : han(folk[0]), vargar: n > 1 ? `${tal(n)} vargar` : 'en varg', fallde: tal(doda.length), svara: svaraText(folk, svara) });
  else if (svara.length) kronikaBer(s, 'k_vargAnfall', folk[0].id, { svara: och(svara) });
  if (avsikt === 'doda' && !f.vargar.length && f.valp) { f.valp = undefined; vargValp(s, folk.filter(p => p.died === undefined)); } // valpen står kvar (steg 9.8.2)
  efterSegern(s, f, alla, vinnare);
}
// flockens mål när striden är slut (steg B.11, som gängets efter en seger): en hungrig flock som vunnit äter av den som dog, annars
// drar den sig undan. Den som bara ligger nere lämnas
function efterSegern(s: State, f: Vargflock, alla: Person[], vinnare: 0 | 1 | -1) {
  const kropp = vinnare === 1 && f.hunger > 0 ? s.kvarlevor?.find(q => q.k !== 'del' && q.bars === undefined && alla.some(p => p.id === q.vem)) : undefined;
  if (kropp) { f.gor = 'ater'; f.kropp = kropp.id; count(s, 'vargAter'); } else { f.gor = 'flyr'; f.kropp = undefined; if (vinnare === 1) count(s, 'vargUndan'); }
}
EFTER.varg = (s, efter, vinnare, g) => vargSlut(s, efter, vinnare, g as KartStrid);

// varje slag (steg.ts): flockar kommer och går, ser och ses, jagar kaniner och bestämmer om jakten
export function vargSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme) kommer(s);
  if (!s.vargar?.length) return;
  const folk = living(s);
  for (const f of s.vargar) {
    const strid = vargIStrid(s, f);
    if (strid) { const k = (strid.djur ?? []).map(d => strid.st.kampar.find(q => q.id === d.k)!).filter(q => q && q.lage !== 'dod' && q.lage !== 'borta'); if (k.length) { f.x = k.reduce((a, q) => a + q.x, 0) / k.length; f.y = k.reduce((a, q) => a + q.y, 0) / k.length; } continue; } // flocken slåss på kartan (steg 10.1.17): den står där vargarna står
    if (nyTimme) { f.hunger = Math.min(1, f.hunger + VARG.hungerTim); kaninJakt(s, f); }
    ses(s, f, folk);
    if (nyTimme) jaktBeslut(s, f, folk);
    if (f.vargar.length) flockSteg(s, f, folk, dtSec);
  }
  s.vargar = s.vargar.filter(f => f.vargar.length || vargIStrid(s, f));
  if (!s.vargar.length) s.vargar = undefined;
}
import { VALP, hundSkaller, tamArt, tamDor, tamUte, vargValp } from './tamdjur';
// slaget hålls kort medan vargarna är på kartan (klocka.ts, steg 10.2.14)
SLAGHINDER.push(s => s.vargar?.length ? KLOCKA.slag : undefined);
// vargar och bybor som kan nå varandra under ett slag, plus synhållet, eller en flock som anfaller: byn går i korta steg (steg 10.2.18)
FAROR.push(s => (s.vargar ?? []).some(f => f.vargar.length > 0 && (f.gor === 'anfaller' || living(s).some(q => kanNa(avst(q, f), VARG.flyFart, GANG.fart)))));
