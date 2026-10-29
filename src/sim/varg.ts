import { balans } from './balans';
import { kronikaBer, personFalt, talOrd } from './berattelser';
import { blodas } from './blod';
import { bedFor } from './bygg';
import { Bit, Rum, bitAt, dorrDef, roomAt, freeNear, gridOf } from './byggnad';
import { dodaDjur, dragOf, djurOf, grupperOf, halsaOf, satDjurHalsa } from './djur';
import { ALDER, KROPP, ageOf, byId, count, forstaGang, getRel, isSick, living, log, ovning, stat, think } from './folk';
import { halsa, kanGa, skada } from './halsa';
import { Act } from './handlingar';
import { eldPlats, getMap } from './karta';
import { punktIRuta } from './mark';
import { addTo, amountOf, avbryt, foodOf, zoneOf } from './lager';
import { die } from './liv';
import { handelse, larma, larmNu } from './rykten';
import { SAKER } from './saker';
import { clamp, rnd } from './slump';
import { STRID, SLAGSMAL, VAPEN, Avsikt, Strid, Uppstallning, djurKampe, foljet, kastat, nyStrid, personKampe, stridTillSlut, svartSkadad } from './strid';
import { ledareOf } from './styre';
import { ageIndex, iIstiden, isLight } from './tid';
import { hardVinter } from './vader';
import { MOTGANG } from './motgang';
import { H, HOUR, MIN, Person, SEC, State, T, Task, Vargflock, W } from './typer';
import { taVapen } from './vakt';
import { snoPaMarken, vaderNu } from './vader';

// ---------- vargen och vakten (steg 3.7.1) ----------
// Under istiden kommer vargar in på kartan från kanten, oftast i flock och ibland en ensam. En flock stryker omkring en tid
// och drar sedan vidare och försvinner. Den undviker elden och grupper av människor, jagar kaniner, och en hungrig flock
// kan anfalla en människa som är ensam; ju större flock, desto modigare. På natten smyger den ibland fram till förrådet och
// stjäl mat, men bara när ingen är vaken i närheten. Varje varg är en individ med mod och hälsa (djur.ts), och flocken är
// hungrig (s.vargar, sparat i byn och stegat likadant i båda lägena med byns följd 'varg').
// Den som ser vargar ropar (larma i rykten.ts), vakten vid elden ser längst och väcker byn när vargarna är nära, och den som
// väckts håller sig vaken vid elden en stund (val.ts). Byns ledare (eller den modigaste) kan kalla till vargjakt när byn
// vet om flocken: oftare när byn är hungrig, har spjut och är många mot få vargar. Vem som följer med avgör modet, tycket
// för den som kallar och seden om strid. Striden räknas med stridens regler (strid.ts), med flockens mod som en sida: den
// flyr när en varg faller eller ledarvargen dör. Bett blir ofta infekterade. En dödad varg blir en fälld varg som bärs hem
// och slaktas (redskap.ts), och den som dödade den blir en vargdödare (rykten.ts)
export const VARG = balans('varg', {
  kommer: 0.03, // chansen i timmen under istiden att en flock kommer, när ingen är på kartan
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
  ser: 14, // flocken ser en ensam människa inom så här många rutor
  anfall: 0.7, // en flock (minst två) anfaller när hunger × (0,5 + modet) är över detta ...
  anfallChans: 0.3, // ... med den här chansen i varje slag (fem minuter)
  flockMod: 0.15, // modet gånger 1 + flockMod × (vargarna − 1): större flock, modigare
  stjalHunger: 0.4, // på natten smyger en så här hungrig flock fram till förrådet ...
  stjalChans: 0.05, // ... med den här chansen i varje slag
  vaken: 5, // och vänder om någon är vaken inom så här många rutor
  stjalPer: 1.5, // så många saker mat (kött först) en varg tar, avrundat
  stjalMat: 0.15, // hungern sjunker så här mycket per sak den tar
  kaninR: 6, kaninChans: 0.4, kaninMat: 0.25, // en hungrig flock nära en kaningrupp tar en kanin i timmen med den här chansen, och hungern sjunker så här mycket
  // att se vargar och väcka byn
  vaktSer: 24, folkSer: 10, nattSer: 0.6, // vakten ser vargar inom så här många rutor, andra inom folkSer, gånger nattSer i mörkret
  larmTim: 2, // samma flock larmas om högst så här ofta
  vack: 30, // vakten väcker byn när flocken är så här nära elden
  vakenTim: 1, // den som väckts håller sig vaken vid elden så här många timmar
  // vargjakten
  jaktTim: 3, // jägarna letar efter flocken högst så här många timmar
  jaktMax: 6, // högst så många följer med
  jaktVet: 6, // byn vet om flocken i så här många timmar efter ett larm
  kraftVarg: 1.1, // en vargs styrka mot jägarnas: 0,5 + 2 × vapnets skada (händerna 0,78, flintspjutet 1,4)
  jaktKvot: 1.3, // jakten blir av när jägarnas styrka mot vargarnas, gånger (1 + nod × byns hunger) och (0,7 + 0,6 × kallarens mod / 20), är över detta ...
  nod: 1, // ... byns hunger: 1 − maten per person / matNog
  matNog: 8,
  jaktChans: 0.5, // ... och då med den här chansen i timmen (i dagsljus)
  foljMod: 1, foljTycke: 1, foljSed: 0.5, foljNod: 0.5, foljSlump: 0.4, // den som följer med: modet, tycket för den som kallar, seden om strid, byns hunger och slump ...
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
  smaBarn: 8, // en förälder stannar hos sina barn under den här åldern
  // dörren (steg 3.7.21): en hungrig flock som inte ser någon ensam väntar utanför en stängd dörr så här många timmar
  vantaTim: 2,
});

const flockarna = (s: State) => s.vargar ?? [];
const avst = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const vaken = (p: Person) => p.task?.act !== 'sova';
// flockens mod: vargarnas medelmod (0–1) gånger storleken
function flockMod(f: Vargflock) {
  let m = 0;
  for (const id of f.vargar) m += dragOf('varg', id).mod ?? 0.5;
  return m / Math.max(1, f.vargar.length) * (1 + VARG.flockMod * (f.vargar.length - 1));
}
// den närmaste punkten på kartans kant
function kanten(x: number, y: number) {
  const ut = [x, W - x, y, H - y], i = ut.indexOf(Math.min(...ut));
  return { x: i === 0 ? 0.3 : i === 1 ? W - 0.3 : x, y: i === 2 ? 0.3 : i === 3 ? H - 0.3 : y };
}
// flocken går mot (x, y) med farten (rutor i sekunden), aldrig in i ett stängt hus: är den raka vägen stängd tar den steget
// snett åt sidan. Svarar hur långt det är kvar, eller −1 när den inte kommer någonstans
const SNETT = [0, 0.8, -0.8, 1.6, -1.6];
function ga(s: State, f: Vargflock, fart: number, dtSec: number) {
  const dx = f.mx - f.x, dy = f.my - f.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return 0;
  const l = Math.min(d, fart * dtSec);
  for (const v of SNETT) {
    const c = Math.cos(v), sn = Math.sin(v), x = clamp(f.x + (dx * c - dy * sn) / d * l, 0.3, W - 0.3), y = clamp(f.y + (dx * sn + dy * c) / d * l, 0.3, H - 0.3);
    if (stangd(s, x, y)) continue;
    f.x = x; f.y = y;
    return v ? Math.hypot(f.mx - f.x, f.my - f.y) : d - l;
  }
  return -1;
}
// ett nytt mål en bit bort, bort från elden (och mot en kaningrupp när flocken är hungrig)
function nyttMal(s: State, f: Vargflock, bort?: { x: number; y: number }) {
  const e = eldPlats(s), ex = e.x + 0.5, ey = e.y + 0.5;
  if (bort) { const d = avst(f, bort) || 1; f.mx = clamp(f.x + (f.x - bort.x) / d * VARG.vandra, 1, W - 1); f.my = clamp(f.y + (f.y - bort.y) / d * VARG.vandra, 1, H - 1); return; }
  const g = f.hunger > 0.3 ? grupperOf(s).filter(q => q.n > 0 && Math.hypot(q.x - ex, q.y - ey) > VARG.eldR * 1.5).sort((a, b) => avst(a, f) - avst(b, f))[0] : undefined;
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
    id: nr, vargar: Array.from({ length: n }, (_, j) => 10_000_000 + nr * 8 + j), x, y, mx: x, my: y, kom: s.now,
    gar: s.now + (VARG.stannarTim[0] + rnd(s, 'varg') * (VARG.stannarTim[1] - VARG.stannarTim[0])) * HOUR,
    hunger: Math.min(1, VARG.hunger0[0] + rnd(s, 'varg') * (VARG.hunger0[1] - VARG.hunger0[0]) + MOTGANG.hardHunger * hv), gor: 'stryker',
  };
  nyttMal(s, f);
  (s.vargar ??= []).push(f);
  count(s, 'vargflockar'); count(s, 'vargar', n);
}

// en hungrig flock nära en kaningrupp tar en kanin
function kaninJakt(s: State, f: Vargflock) {
  if (f.hunger < 0.2) return;
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
  const natt = isLight(s.now) ? 1 : VARG.nattSer, dimma = 1 - 0.5 * vaderNu(s).dimma;
  const ser = (q: Person) => vaken(q) && avst(q, f) < (q.task?.act === 'vakt' ? VARG.vaktSer : VARG.folkSer) * natt * dimma;
  const vakt = folk.find(q => q.task?.act === 'vakt' && ser(q)), p = vakt ?? folk.find(ser);
  if (!p) return;
  f.sedd = s.now;
  if (forstaGang(s, 'vargSedd')) log(s, `${p.name} såg ${f.vargar.length > 1 ? `en flock vargar (${f.vargar.length})` : 'en ensam varg'} för första gången.`, 'world', [p.id]);
  const hort = larma(s, f.x, f.y, 'varg', f.vargar.length, [p]);
  // vakten väcker de vuxna som sover när flocken är nära byn
  const e = eldPlats(s);
  if (vakt && Math.hypot(f.x - e.x - 0.5, f.y - e.y - 0.5) < VARG.vack) {
    let n = 0;
    for (const q of folk) if (q.task?.act === 'sova' && ageOf(q, s.now) >= ALDER.vaktFran && !(skyddas(s, q) && iHus(s, q))) { avbryt(s, q); q.task = undefined; q.larm = { t: s.now, x: f.x, y: f.y, vad: 'varg', storlek: f.vargar.length, led: 0 }; n++; }
    if (n) { count(s, 'vargVackt', n); log(s, `${vakt.name} höll vakt och väckte byn: vargar nära.`, 'world', [vakt.id]); }
  }
  soker(s, [p, ...hort]);
}
// har p hört att vargar är nära (ropet eller vakten) inom VARG.vakenTim?
const vargLarm = (s: State, p: Person) => { const l = larmNu(s, p); return l && l.vad === 'varg' && s.now - l.t < VARG.vakenTim * HOUR ? l : undefined; };

// ---------- skyddet när vargen kommer (steg 3.7.15) ----------
// När ropet hörs eller vakten väcker byn går barnen, de gamla, de sjuka och de svårt skadade in i närmaste hus, familjens eget
// först, och utan hus till elden nära de vuxna. Den som redan sover i ett hus sover vidare. En förälder med små barn stannar
// hos dem. De vuxna som vågar möta flocken (modet mot flockens storlek) tar sitt eget bästa vapen eller byns och samlas vid
// elden. Det varar VARG.vakenTim; sedan läggs vapnet tillbaka (agande.ts: tidyTools)
const skyddas = (s: State, p: Person) => { const a = ageOf(p, s.now); return a < ALDER.vaktFran || a >= ALDER.gammal || isSick(p, s.now) || halsa(p) < KROPP.svag; };
const iHus = (s: State, p: Person) => !!roomAt(s, Math.floor(p.x), Math.floor(p.y));
const smaBarnOf = (s: State, p: Person) => living(s).filter(c => (c.mother === p.id || c.father === p.id) && ageOf(c, s.now) < VARG.smaBarn);
// närmaste plats under tak: den egna sängen om den är under tak, annars en ruta i närmaste rum
function husPlats(s: State, p: Person) {
  const bed = bedFor(s, p);
  if (bed && roomAt(s, Math.floor(bed.x), Math.floor(bed.y))) return bed;
  let bast: number | undefined, bd = Infinity;
  for (const r of gridOf(s).rooms) for (const i of r.tiles) { const d = Math.hypot(i % W + 0.5 - p.x, Math.floor(i / W) + 0.5 - p.y); if (d < bd) { bd = d; bast = i; } }
  return bast === undefined ? undefined : punktIRuta(s, bast, p);
}
const vidElden = (s: State) => { const e = eldPlats(s); return freeNear(s, e.x + 0.5, e.y + 1.5); };
// vad p gör när vargar är nära (val.ts), eller undefined
export function vargSkydd(s: State, p: Person): { act: Act; why: string; spot?: { x: number; y: number }; dur: number } | undefined {
  const fi = kanGa(p) ? instangd(s, p) : undefined; // en varg väntar utanför dörren (steg 3.7.21)
  if (fi) return { act: 'gomma', why: `${fi.vargar.length > 1 ? 'Vargarna' : 'Vargen'} väntar utanför dörren`, spot: { x: p.x, y: p.y }, dur: Math.max(MIN, fi.vantar! + VARG.vantaTim * HOUR - s.now) };
  const l = vargLarm(s, p);
  if (!l || !kanGa(p)) return;
  const dur = Math.max(MIN, l.t + VARG.vakenTim * HOUR - s.now), a = ageOf(p, s.now);
  if (skyddas(s, p)) {
    if (p.task?.act === 'sova' && iHus(s, p)) return;
    const hus = husPlats(s, p);
    return hus ? { act: 'gomma', why: 'Vargar är nära, gömmer sig i huset', spot: hus, dur } : { act: 'gomma', why: 'Vargar är nära, håller sig vid elden nära de vuxna', spot: vidElden(s), dur };
  }
  const barn = smaBarnOf(s, p)[0];
  if (barn) { const hus = husPlats(s, barn); return { act: 'gomma', why: 'Vargar är nära, stannar hos barnen', spot: hus ?? vidElden(s), dur }; }
  const vuxna = living(s).filter(q => !skyddas(s, q) && kanGa(q)).length;
  if (a >= ALDER.vaktFran && stat(p, 'mod', s.now) / 20 + VARG.fler * vuxna / Math.max(1, l.storlek) > VARG.vagar) return { act: 'forsvar', why: `Vargar är nära, tar ${taVapen(s, p) ? 'ett vapen' : 'det som finns'} och väntar vid elden`, dur };
  return { act: 'samtal', why: 'Vargar är nära, håller sig vaken vid elden', dur };
}
// den som hör ropet avbryter det hen gör och söker skydd (inte den som slåss, vårdar, bärs eller håller vakt)
const AVBRYTS_INTE = new Set<string>(['strid', 'vargjakt', 'vakt', 'buren', 'fatt', 'varda', 'gomma', 'forsvar']);
function soker(s: State, folk: Person[]) {
  for (const q of folk) {
    if (!q.task || AVBRYTS_INTE.has(q.task.act) || q.task.act === 'sova' && iHus(s, q) || !vargLarm(s, q)) continue; // den som sover i ett hus sover vidare
    avbryt(s, q); q.task = undefined; count(s, 'vargSkydd');
  }
}

// den som är ensam: ingen annan nära, inte bakom en stängd dörr och inte vid en brinnande eld (steg 3.7.21: en skinndörr
// stoppar ingen)
function ensam(s: State, p: Person, folk: Person[]) {
  const e = eldPlats(s);
  if (iStangt(s, p) || (s.fire.lit && Math.hypot(p.x - e.x - 0.5, p.y - e.y - 0.5) < VARG.eldR)) return false;
  return !folk.some(q => q !== p && avst(q, p) < VARG.grupp);
}

// vad flocken gör i det här slaget
function flockSteg(s: State, f: Vargflock, folk: Person[], dtSec: number) {
  const e = eldPlats(s), eld = { x: e.x + 0.5, y: e.y + 0.5 };
  if (f.gor !== 'flyr' && s.now >= f.gar) { f.gor = 'flyr'; f.jagare = undefined; }
  if (f.gor === 'flyr') {
    const k = kanten(f.x, f.y); f.mx = k.x; f.my = k.y;
    if (ga(s, f, VARG.flyFart, dtSec) < 0.5) { f.vargar = []; count(s, 'vargflockBorta'); }
    return;
  }
  // jägarna går mot flocken (som inte märker dem förrän de är nära)
  if (f.jagare) for (const id of f.jagare) {
    const q = byId(s, id), tk = q?.task;
    if (tk?.act === 'vargjakt' && tk.phase === 'go' && Math.hypot(tk.tx - f.x, tk.ty - f.y) > 3) { const sp = freeNear(s, f.x, f.y); tk.tx = sp.x; tk.ty = sp.y; }
  }
  if (f.gor === 'anfaller') {
    const p = f.byte !== undefined ? byId(s, f.byte) : undefined;
    if (!p || p.health <= 0 || !ensam(s, p, folk)) { f.gor = 'stryker'; f.byte = undefined; nyttMal(s, f); return; }
    const m = vagIn(s, f, p); f.mx = m.x; f.my = m.y;
    const kvar = ga(s, f, VARG.flyFart * 4, dtSec);
    if (kvar < 0) { f.gor = 'stryker'; f.byte = undefined; nyttMal(s, f); return; } // kommer inte fram
    if (m === p && kvar < 1) { f.gor = 'stryker'; f.byte = undefined; vargStrid(s, f, [p], 'skada', 'när vargarna anföll'); nyttMal(s, f, p); }
    return;
  }
  if (f.gor === 'smyger') {
    if (folk.some(q => vaken(q) && avst(q, f) < VARG.vaken)) { f.gor = 'stryker'; nyttMal(s, f, eld); return; }
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
  if (s.fire.lit && avst(f, eld) < VARG.eldR && f.hunger < VARG.eldHunger) { slutaVanta(f); nyttMal(s, f, eld); ga(s, f, VARG.flyFart, dtSec); return; }
  if (f.gor === 'vantar') { vanta(s, f, folk, dtSec); return; }
  if (n >= 2 && f.hunger * (0.5 + mod) > VARG.anfall) {
    const p = bytet(s, f, folk);
    if (p && rnd(s, 'varg') < VARG.anfallChans) { f.gor = 'anfaller'; f.byte = p.id; count(s, 'vargAnfall'); return; }
    if (!p) { // ingen är ensam: flocken kan vänta utanför ett stängt hus där någon gömmer sig
      const o = stangdDorr(s, f, folk);
      if (o && !f.trottnat && rnd(s, 'varg') < VARG.anfallChans) { borjaVanta(s, f, o, folk); return; }
    }
  }
  const z = zoneOf(s);
  if (z && !isLight(s.now) && f.hunger > VARG.stjalHunger && (!s.fire.lit || f.hunger >= VARG.eldHunger) && rnd(s, 'varg') < VARG.stjalChans) {
    f.gor = 'smyger'; f.mx = z.x + z.w / 2; f.my = z.y + z.h / 2; count(s, 'vargSmyger'); return;
  }
  if (ga(s, f, VARG.gaFart, dtSec) < 1) nyttMal(s, f);
}
const bytet = (s: State, f: Vargflock, folk: Person[]) => folk.filter(q => avst(q, f) < VARG.ser && ensam(s, q, folk)).sort((a, b) => avst(a, f) - avst(b, f))[0];

// ---------- dörren och vargen (steg 3.7.21) ----------
// En dörr som stängs (stanger i DORRAR, byggnad.ts: trädörren) stängs när någon gömmer sig i huset (3.7.15), och vargarna kommer
// aldrig igenom den: de går inte in i huset eller dess väggar (ga). Ser en hungrig flock ingen som är ensam kan den vänta utanför
// dörren en stund (VARG.vantaTim) och stänga in dem som är där: de håller sig gömda (vargSkydd), men de vuxna som vågar möta
// flocken går ut och slåss. Efter ett tag tröttnar flocken (och väntar inte vid någon dörr igen), och ser den någon ensam i byn jagar den hellre den. En skinndörr
// håller bara värmen inne och stoppar ingen; den som är ensam i ett hus med en öppen dörr kan anfallas där
const GRANNAR = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const RUNT = [...GRANNAR, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const; // också snett, för hörnen
const grannRum = (s: State, x: number, y: number) => RUNT.map(([dx, dy]) => roomAt(s, x + dx + 0.5, y + dy + 0.5)).filter((r): r is Rum => !!r);
// rummet är stängt: alla dess öppningar har en dörr som stängs, och någon gömmer sig där
export function stangt(s: State, r: Rum) {
  if (!r.open) return false;
  const g = gridOf(s);
  for (const i of r.walls) { const b = g.at.get(i)!; if (b.k === 'oppning' && !dorrDef(b.dorr)?.stanger) return false; }
  return living(s).some(q => q.task?.act === 'gomma' && roomAt(s, q.x, q.y) === r);
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
  for (const [dx, dy] of GRANNAR) {
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
  const q = folk.filter(p => p.task?.act === 'gomma' && avst(p, f) < VARG.ser && iStangt(s, p)).sort((a, b) => avst(a, f) - avst(b, f))[0];
  const r = q && roomAt(s, q.x, q.y);
  return r ? oppningar(s, r).sort((a, b) => avst(f, a) - avst(f, b))[0] : undefined;
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
  for (const q of inne) if (q.task && !AVBRYTS_INTE.has(q.task.act) && q.task.act !== 'sova') { avbryt(s, q); q.task = undefined; }
  log(s, `${f.vargar.length > 1 ? 'Vargarna' : 'Vargen'} väntar utanför dörren${inne.length ? `, och ${inne.map(q => q.name).join(', ')} är instängda` : ''}.`, 'world', inne.map(q => q.id));
}
// de vuxna i huset som vågar gå ut och möta flocken: modet och hur många de är mot vargarna (som vargSkydd)
function modiga(s: State, inne: Person[], f: Vargflock) {
  const kan = inne.filter(q => !skyddas(s, q) && kanGa(q) && ageOf(q, s.now) >= ALDER.vaktFran);
  return kan.filter(q => stat(q, 'mod', s.now) / 20 + VARG.fler * kan.length / Math.max(1, f.vargar.length) > VARG.vagar);
}
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
  if (p && rnd(s, 'varg') < VARG.anfallChans) { slutaVanta(f); f.gor = 'anfaller'; f.byte = p.id; count(s, 'vargAnfall'); return; }
  f.mx = ut.x; f.my = ut.y;
  if (ga(s, f, VARG.flyFart, dtSec) > 1) return;
  const modigaUt = modiga(s, folk.filter(q => roomAt(s, q.x, q.y) === r), f); // de som vågar går ut och slåss
  if (!modigaUt.length) return;
  slutaVanta(f); count(s, 'vargDorrStrid');
  for (const q of modigaUt) { q.x = ut.x; q.y = ut.y; }
  vargStrid(s, f, modigaUt, 'skada', 'utanför dörren');
  if (f.gor !== 'flyr') nyttMal(s, f, ut);
}

// flocken tar mat ur förrådet: köttet först, hela saker
const STJALS = ['vilt', 'varg', 'kott', 'vargkott', 'fisk', 'abborre', 'grillkott', 'torrkott'];
function stjal(s: State, f: Vargflock) {
  let n = Math.max(1, Math.round(f.vargar.length * VARG.stjalPer)), tog = 0;
  for (const k of STJALS) while (n > 0 && SAKER[k] && amountOf(s, k) >= 1) { addTo(s, k, -1); n--; tog++; }
  if (!tog) return;
  f.hunger = Math.max(0, f.hunger - VARG.stjalMat * tog);
  count(s, 'vargStal', tog);
  log(s, `Vargar smög in i byn i mörkret och tog ${tog} ${tog === 1 ? 'sak' : 'saker'} mat ur förrådet.`, 'world');
}

// ledaren (eller den modigaste) kallar till vargjakt när byn vet om flocken
function jaktBeslut(s: State, f: Vargflock, folk: Person[]) {
  if (f.jagare || f.gor === 'flyr' || !isLight(s.now) || f.sedd === undefined || s.now - f.sedd > VARG.jaktVet * HOUR) return;
  const kan = folk.filter(q => ageOf(q, s.now) >= ALDER.vaktFran && ageOf(q, s.now) < ALDER.vaktTill && !isSick(q, s.now) && halsa(q) >= KROPP.svag && kanGa(q) && q.task?.act !== 'strid' && q.task?.act !== 'vargjakt' && !larmNu(s, q)?.falskt);
  if (!kan.length) return;
  const led = ledareOf(s), kallar = led && kan.includes(led) ? led : kan.reduce((a, q) => stat(q, 'mod', s.now) > stat(a, 'mod', s.now) ? q : a);
  const nod = clamp(1 - foodOf(s) / Math.max(1, folk.length) / VARG.matNog, 0, 1), sed = (s.seder.v as Record<string, number>).strid ?? 0;
  const vill = kan.map(q => ({ q, v: q === kallar ? Infinity : VARG.foljMod * (stat(q, 'mod', s.now) - 10) / 10 + VARG.foljTycke * getRel(s, q, kallar).op / 100 + VARG.foljSed * sed + VARG.foljNod * nod + VARG.foljSlump * (rnd(s, 'varg', q) - 0.5) }))
    .filter(x => x.v > VARG.folj).sort((a, b) => b.v - a.v).slice(0, VARG.jaktMax).map(x => x.q);
  const kraft = vill.reduce((a, q) => a + 0.5 + 2 * VAPEN[personKampe(s, q, 0, 0, 0, 0).vapen].skada, 0);
  const kvot = kraft / (f.vargar.length * VARG.kraftVarg) * (1 + VARG.nod * nod) * (0.7 + 0.6 * stat(kallar, 'mod', s.now) / 20);
  if (kvot < VARG.jaktKvot || rnd(s, 'varg') >= VARG.jaktChans) return;
  f.jagare = vill.map(q => q.id);
  const sp = freeNear(s, f.x, f.y);
  for (const q of vill) { avbryt(s, q); q.task = { act: 'vargjakt', phase: 'go', tx: sp.x, ty: sp.y, until: s.now + VARG.jaktTim * HOUR, carry: 0, why: q === kallar ? 'Kallar till vargjakt' : `Följer ${kallar.name} på vargjakt` }; }
  count(s, 'vargjakt');
  log(s, `${kallar.name} kallade till vargjakt${vill.length > 1 ? `, och ${vill.length - 1} följde med` : ''} (${f.vargar.length > 1 ? `en flock på ${f.vargar.length}` : 'en ensam varg'}).`, 'world', vill.map(q => q.id));
}

// jägaren som kommit fram (MEDAN i steg.ts): anfaller flocken med de jägare som är nära
export function vargjaktSteg(s: State, p: Person, tk: Task) {
  if (tk.carry || tk.prog) return;
  const f = flockarna(s).find(x => x.jagare?.includes(p.id));
  if (!f || f.gor === 'flyr') { tk.until = s.now; tk.prog = 1; return; }
  if (avst(p, f) > VARG.na) { const sp = freeNear(s, f.x, f.y); tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; return; }
  const alla = f.jagare!.map(id => byId(s, id)).filter((q): q is Person => !!q && q.health > 0 && q.task?.act === 'vargjakt');
  const med = alla.filter(q => avst(q, p) <= VARG.samlas);
  if (med.length < alla.length && s.now - (f.samlas ??= s.now) < VARG.samlasTim * HOUR) return; // väntar in de andra
  f.jagare = undefined; f.samlas = undefined;
  if (rnd(s, 'varg') < VARG.flyrJakt * Math.min(1, med.length / f.vargar.length)) {
    f.gor = 'flyr'; count(s, 'vargjaktFlydde');
    for (const q of med) { q.task!.until = s.now; q.task!.prog = 1; }
    log(s, `Vargarna märkte jägarna och sprang innan ${p.name} och de andra hann fram.`, 'world', med.map(q => q.id));
    kronikaBer(s, 'k_vargSprang', p.id, { ...personFalt(p), med: med.length > 1 ? ` med ${talOrd(med.length - 1)} till` : '' }); // steg 3.7.16
    return;
  }
  vargStrid(s, f, med, 'doda', 'på vargjakt');
  if (f.vargar.length) f.gor = 'flyr'; // de som är kvar drar vidare
}

// en strid mellan folk och flocken. De dödade vargarna bärs hem av jägarna (på vargjakt)
export function vargStrid(s: State, f: Vargflock, folk: Person[], avsikt: Avsikt, orsak: string): Strid {
  const W0 = 16, H0 = 8, n = f.vargar.length, modF = 1 + VARG.flockMod * (n - 1);
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => personKampe(s, p, 0, 0, 3, H0 / 2 + (i - (folk.length - 1) / 2)));
  f.vargar.forEach((id, j) => {
    const d = dragOf('varg', id), k = djurKampe('varg', 0, 1, W0 - 3, H0 / 2 + (j - (n - 1) / 2));
    k.fart = d.snabbhet; k.st.styrka = d.styrka; k.st.mod = clamp(k.st.mod * (0.6 + 0.8 * (d.mod ?? 0.5)) * modF * (0.7 + 0.6 * f.hunger), 1, 20);
    if (j === 0 && n > 1) { k.ledare = 'fram'; k.namn = 'Ledarvargen'; } else if (n > 1) k.namn = `Varg ${j + 1}`; // ledarvargen: faller den sjunker modet hos de andra
    kampar.push(k);
  });
  kampar.forEach((k, i) => { k.id = i + 1; });
  foljet(s, kampar);
  const halt = clamp(Math.max(((s.vader?.fukt ?? 0) - STRID.leraFran) / (1 - STRID.leraFran), snoPaMarken(s) * STRID.snoHalt), 0, 1);
  const u: Uppstallning = { avsikt, w: W0, h: H0, vind: vaderNu(s).vind, dimma: vaderNu(s).dimma, halt, kampar };
  const fro = Math.floor(rnd(s, 'strid') * 2147483647), st = nyStrid(u, fro);
  f.vargar.forEach((id, j) => { st.kampar[folk.length + j].blod = halsaOf(s, id).blod; });
  stridTillSlut(st);
  const vinnare = st.slut!.vinnare;
  (s.strider ??= []).push({ t: s.now, orsak: 'vargar ' + orsak, u, fro, vinnare });
  if (s.strider.length > SLAGSMAL.sparas) s.strider.splice(0, s.strider.length - SLAGSMAL.sparas);
  count(s, 'strider'); count(s, 'vargstrid');
  soker(s, larma(s, folk[0].x, folk[0].y, 'varg', n, folk.filter(vaken)));
  // vargarna: de döda och de skadade, och vem som dödade
  const doda: Person[] = [], kvar: number[] = [];
  f.vargar.forEach((id, j) => {
    const k = st.kampar[folk.length + j];
    // en skadad varg som sprang under vargjakten: jägarna följer blodspåret och fäller den med en chans som växer med skadan
    const spar = avsikt === 'doda' && k.lage !== 'dod' && k.lage !== 'strid' && k.blod < 1 && rnd(s, 'varg') < VARG.spara * (1 - k.blod);
    if (spar) { count(s, 'vargSpar'); log(s, `Jägarna följde blodspåret och fällde den skadade vargen.`, 'world', folk.map(p => p.id)); }
    if (k.lage === 'dod' || spar) {
      dodaDjur(s, id);
      const forsta = forstaGang(s, 'vargDodad'); // räknar också
      const r = [...st.logg].reverse().find(x => x.h === 'traff' && x.b === k.id), fallde = r && folk[r.a! - 1];
      if (fallde) { handelse(s, fallde, 'vargdodare'); if (forsta) { log(s, `${fallde.name} dödade byns första varg.`, 'world', [fallde.id]); kronikaBer(s, 'k_forstaVarg', fallde.id, personFalt(fallde)); } }
      doda.push(fallde ?? folk[0]);
    } else { kvar.push(id); satDjurHalsa(s, id, k.blod, halsaOf(s, id).sar + k.skador.reduce((a, w) => a + w.g, 0)); }
  });
  f.vargar = kvar;
  // folket: skadorna blir riktiga skador, och vargbett blir ofta infekterade
  const bar = new Set<Person>(), svara: string[] = [];
  st.kampar.slice(0, folk.length).forEach((k, i) => {
    const p = folk[i];
    let dod = k.lage === 'dod';
    for (const w of k.skador) {
      if (!dod && skada(s, p, w.d, w.k, w.g, 'varg', `i en strid med vargar`)) dod = true;
      const sk = p.skador?.[p.skador.length - 1];
      if (!dod && sk && w.fast) sk.fast = 1;
      if (!dod && sk && w.k === 'bett' && rnd(s, 'varg', p) < VARG.bettInf) { sk.inf ??= 0; count(s, 'vargbettInf'); }
    }
    for (const r of st.logg) if (r.a === k.id && r.v && (r.kast || r.h === 'vada')) kastat(s, p, r.v, (VAPEN as Record<string, { kast?: { rack: number } }>)[r.v].kast!.rack / 2, p.x, p.y, () => rnd(s, 'strid'));
    if (dod) { count(s, 'dodVarg'); die(s, p, 'varg'); return; }
    if (svartSkadad(k)) svara.push(p.name);
    p.blod = Math.min(p.blod ?? 1, Math.max(0, k.blod));
    ovning(p, 'narstrid', SLAGSMAL.ovning);
    think(p, vinnare === 0 ? 'Klarade sig mot vargarna' : 'Anfölls av vargar', vinnare === 0 ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    avbryt(s, p);
    const tid = Math.max(SLAGSMAL.minst, st.slut!.t) * SEC;
    // den som står kvar efter en vargjakt bär hem en fälld varg (den som dödade den först)
    if (avsikt === 'doda' && k.lage === 'strid' && doda.length > bar.size) {
      bar.add(p);
      p.task = { act: 'vargjakt', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 1, prog: 1, why: 'Bär hem en fälld varg' };
    } else p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + tid, carry: 0, why: orsak };
  });
  if (doda.length > bar.size) count(s, 'vargKvar', doda.length - bar.size); // fler fällda än det fanns bärare
  blodas(s, folk[0].x, folk[0].y, 'jakt', 1);
  const namn = folk.map(p => p.name).join(' och ');
  log(s, `${namn} slogs med ${n > 1 ? `${n} vargar` : 'en varg'} ${orsak}. ${doda.length ? `${doda.length} ${doda.length === 1 ? 'varg dog' : 'vargar dog'}. ` : ''}${vinnare === 0 ? 'Vargarna förlorade.' : vinnare === 1 ? 'Vargarna vann.' : 'Ingen vann.'}`, 'world', folk.map(p => p.id));
  // krönikan (steg 3.7.16): varje vargjakt, och den som skadades svårt när vargarna anföll (döden skriver die)
  const och = (l: string[]) => l.length > 1 ? `${l.slice(0, -1).join(', ')} och ${l[l.length - 1]}` : l[0];
  if (avsikt === 'doda') kronikaBer(s, 'k_vargjakt', folk[0].id, { folk: och(folk.map(p => p.name)), vargar: n > 1 ? `${talOrd(n)} vargar` : 'en varg', fallde: talOrd(doda.length), svara: svara.length ? ` ${och(svara)} skadades svårt.` : '' });
  else if (svara.length) kronikaBer(s, 'k_vargAnfall', folk[0].id, { svara: och(svara) });
  if (vinnare !== 1 || doda.length) f.gor = 'flyr';
  return st;
}

// varje slag (steg.ts): flockar kommer och går, ser och ses, jagar kaniner och bestämmer om jakten
export function vargSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme) kommer(s);
  if (!s.vargar?.length) return;
  const folk = living(s);
  for (const f of s.vargar) {
    if (nyTimme) { f.hunger = Math.min(1, f.hunger + VARG.hungerTim); kaninJakt(s, f); }
    ses(s, f, folk);
    if (nyTimme) jaktBeslut(s, f, folk);
    if (f.vargar.length) flockSteg(s, f, folk, dtSec);
  }
  s.vargar = s.vargar.filter(f => f.vargar.length);
  if (!s.vargar.length) s.vargar = undefined;
}
