import { freeTools } from './agande';
import { balans } from './balans';
import { brasorOf } from './brasor';
import { rasar } from './bygg';
import { MATERIAL, bitAt, touch } from './byggnad';
import { ALDER, ageOf, alive, count, livet, living, log } from './folk';
import { Kroppsdel, kanGa, skada } from './halsa';
import { kronika } from './historik';
import { naVattnet } from './is';
import { eldPlats } from './karta';
import { avbryt, minska, stacksOf, tidy } from './lager';
import { die } from './liv';
import { MARK, groundOf, markslag } from './mark';
import { faltAt, faltBrann, faltIndex, grodaPa } from './odling';
import { wearUsed } from './redskap';
import { larma, larmNu } from './rykten';
import { SAKER } from './saker';
import { isLight, kalender } from './tid';
import { drickPlats } from './torst';
import { DAY, H, HEARTHS, HOUR, HOUR_S, MIN, Person, SEC, State, Task, W, inMap } from './typer';
import { allaBarn } from './uppvaxt';
import { FOREST, VAG, isSoil } from './vag';
import { blixtNu, snoPaMarken, torrTim, vaderNu } from './vader';

// Eldsvådor och skogsbrand (steg 3.8.5, "Motgångarna i spelet" och "Elden" i designdokumentet). Inte en rad i MOTGANGAR:
// branden har ingen tid i kalendern utan börjar när en gnista eller blixten tänder något som brinner. Gnistor flyger från
// lägerelden (spread i HEARTHS, typer.ts: lägerelden mest, kakelugnen nästan inte) och från brasorna, och blixten slår ner
// i åskan (blixtNu i vader.ts). Det som kan brinna på en ruta är marken (skog, ungskog och gräs; bar jord och byns mark inte),
// grödorna, väggarna av trä och ris (brinner i MATERIAL, byggnad.ts) och sakerna i förrådet (utom de som inte brinner,
// brinnerInte i saker.ts). Elden tar sig till grannrutorna, fortare när marken är torr (torrTim i vader.ts: en per torr
// timme, mindre när det regnat) och på sommaren, och när det blåser, och långsammare i regn; regnet släcker den också. En ruta
// brinner tills det som brann är slut (timmarna i BRAND efter det som brinner) eller tills den släcks. Det som brunnit blir
// aska: skogen blir en planta i bar mark, som växer upp när gräset kommit tillbaka (growGround i mark.ts), väggarna tappar
// skick och rasar, sakerna och grödan brinner upp. Folk som ser branden ropar (larma i rykten.ts). När den är nära byn
// släcker de vuxna: med vattensäcken (hämtar vatten och häller på flera rutor) eller med händerna (långsamt, och man kan få
// brännskador); de andra går undan. Den som står i elden bränns. Allt räknas med hashade tal ur tiden och rutan, så att
// det levande läget och ikappräkningen blir lika. Branden sparas i s.brand och det som brunnit nyss i s.aska (det svarta).

// Balanstal (regel 8)
export const BRAND = balans('brand', {
  gnista: 0.004, // chansen per steg (5 minuter) att en gnista från en brinnande eld når marken, gånger eldstadens spread ...
  gnistaR: 2, // ... så här många rutor bort (slumpas)
  blixt: 0.5, // chansen att blixten slår ner nära byn när den slår ner (blixtNu i vader.ts) ...
  blixtR: 30, // ... så här många rutor från elden (slumpas)
  sprid: 0.06, // chansen per steg att elden tar sig från en ruta till en grannruta, gånger det som kan brinna där (antändning)
  hornet: 0.7, // ... gånger det här till en ruta snett bredvid
  torrTim: 120, // marken är helt torr efter så här många torra timmar (torrTim i vader.ts) ...
  arstid: [0, 0.6, 1, 0.8], // ... och så här torr i tidsåldern (istid, vår, sommar, höst)
  sno: 0.2, // inget brinner när det ligger mer snö än så här (snoPaMarken i vader.ts)
  vind: 1.5, // blåsten (0 till 1) sprider elden så här mycket mer
  regn: 2, // regnet släcker en ruta så här fort (rutor per timme i det kraftigaste regnet), och sprider den mindre
  // det som kan brinna: [antändning 0 till 1, timmar det brinner]
  skog: [0.3, 3], ung: [0.6, 1], hog: [1, 0.5], kort: [0.35, 0.3], groda: [0.5, 0.5], vagg: [0.4, 2], sak: [0.5, 1],
  aska: 0.32, // gräset på en ruta som brunnit (0 till 1; just över bar jord, så att det inte blir en stig)
  trad: 0.5, // träden dör när så här stor del av rutan har brunnit
  vaggSkick: 1.2, // en vägg tappar så här mycket av sitt skick gånger andelen som brunnit
  maxR: 40, // elden tar sig aldrig längre än så här många rutor från där den började
  svart: 3, // marken syns svart så här många dygn (år i spelet) efter att den brunnit
  sagd: 3, // branden syns i loggen när så här många rutor har börjat brinna ...
  stor: 20, // ... och i krönikan när den bränt så här många, eller när den kommit nära byn
  sikt: 20, // man ser elden så här många rutor bort på dagen ...
  siktNatt: 0.5, // ... och så här stor del av det på natten (men glöden syns)
  hot: 15, // elden hotar byn när en ruta brinner så här nära byns eld: då släcker de vuxna
  fara: 2, // den som är så här nära en brinnande ruta och inte släcker går undan ...
  undan: 6, // ... så här många rutor bort ...
  undanMin: 30, // ... i så här många minuter
  handMin: 20, // ett pass att släcka med händerna (minuter) ...
  hand: 1.5, // ... släcker så här många rutor i timmen ...
  handR: 1.6, // ... inom så här många rutor från den som släcker
  fyllMin: 2, // minuter att fylla vattensäcken
  sackRutor: 4, // en säck vatten släcker så här många rutor ...
  sackR: 2.5, // ... inom så här många rutor från där den hälls
  brannHand: 0.15, // chansen i timmen att få en brännskada när man släcker med händerna ...
  brannHandGrad: [0.1, 0.4], // ... så här svår (slumpas mellan)
  iElden: 3, // den som står i en brinnande ruta bränns med den här takten (i timmen) ...
  iEldenGrad: [0.2, 0.7], // ... så här svårt (slumpas mellan)
});

// en brinnande ruta: rutan, timmar den brunnit, timmar den kan brinna, hur långt den släckts (1 = släckt)
export type BrandRuta = [number, number, number, number];
// branden som pågår: när och var den började (kalla = gnistor eller blixten), rutorna som brinner och de som brunnit klart,
// hur många rutor som tagit eld, och vad den gjort
export interface Brand { t: number; x: number; y: number; kalla: 'gnista' | 'blixt'; r: BrandRuta[]; ut: number[]; n: number; trad: number; vagg: number; saker: number; skadade: number; slackt: number; hot?: 1; sagd?: 1 }

// ett tal mellan 0 och 1 ur byns frö, tiden (i steg), en ruta eller person och ett salt (drar inget ur slumpföljderna)
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 1, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const ur = (s: State, a: number, salt: number) => hash(s.seed + salt * 7919, Math.round(s.now / SEC), a);
const chans = (takt: number, dtSec: number) => 1 - Math.exp(-takt * dtSec / HOUR_S); // takt i timmen under dtSec sekunder

// hur torr marken är (0 till 1): torra timmar, tidsåldern, och ingenting under snön
export function torrhet(s: State) {
  if (snoPaMarken(s) > BRAND.sno) return 0;
  return Math.min(1, torrTim(s) / BRAND.torrTim) * BRAND.arstid[kalender(s).ai];
}
// det som kan brinna på en ruta: [antändning, timmar], eller undefined. Sakerna slås upp en gång per steg
function bransleAv(s: State) {
  let saker: Set<number> | undefined;
  const g = groundOf(s);
  return (i: number): [number, number] | undefined => {
    const x = i % W, y = Math.floor(i / W);
    let f = 0, tim = 0;
    const lagg = (r: readonly number[], k = 1) => { if (r[0] * k > f) f = r[0] * k; if (r[1] > tim) tim = r[1]; };
    const fa = faltAt(s, x, y), v = bitAt(s, x, y);
    if (fa) { if (grodaPa(fa, faltIndex(fa, x, y))) lagg(BRAND.groda); }
    else if (!v && isSoil(g.tiles[i]) && !g.built?.[i]) { const m = markslag(g, i); if (m !== 'bar') lagg(BRAND[m]); } // inte under ett golv eller en vägg
    const b = v && v.b >= 1 ? MATERIAL[v.m]?.brinner : undefined;
    if (b) lagg(BRAND.vagg, b);
    saker ??= new Set(stacksOf(s).filter(st => st.n >= 1 && !SAKER[st.k]?.brinnerInte).map(st => st.y * W + st.x));
    if (saker.has(i)) lagg(BRAND.sak);
    return f > 0 ? [f, tim] : undefined;
  };
}

// rutorna som brinner (1) och som brunnit klart (2) i branden, för att slå upp dem fort (byggs om efter en laddning)
const karta = new WeakMap<Brand, Uint8Array>();
function kartaOf(b: Brand) {
  let k = karta.get(b);
  if (!k) { k = new Uint8Array(W * H); for (const i of b.ut) k[i] = 2; for (const r of b.r) k[r[0]] = 1; karta.set(b, k); }
  return k;
}
// brinner ruta i?
export const brinner = (s: State, i: number) => !!s.brand && kartaOf(s.brand)[i] === 1;
// rutorna som brinner just nu (gränssnittet ritar lågorna)
export const brinnande = (s: State): readonly BrandRuta[] => s.brand?.r ?? [];

// ruta i tar eld (om den kan; u = talet som ska vara under antändningen): en ny brand eller en ruta till i den som pågår. Scenariot brand tänder också
export function tand(s: State, i: number, kalla: Brand['kalla'], u: number, bransle = bransleAv(s)) {
  const fu = bransle(i);
  if (!fu || u >= fu[0]) return;
  let b = s.brand;
  if (!b) { b = s.brand = { t: s.now, x: i % W, y: Math.floor(i / W), kalla, r: [], ut: [], n: 0, trad: 0, vagg: 0, saker: 0, skadade: 0, slackt: 0 }; count(s, 'brand'); count(s, 'brand ' + kalla); }
  const k = kartaOf(b);
  if (k[i]) return;
  k[i] = 1; b.r.push([i, 0, fu[1], 0]); b.n++; count(s, 'brand ruta');
  if (!b.sagd && b.n >= BRAND.sagd) {
    b.sagd = 1;
    log(s, b.kalla === 'blixt' ? 'Blixten tände skogen. Det brinner!' : 'Gnistor från elden tände marken. Det brinner!', 'world');
  }
}

// ---------- varje steg (steg.ts) ----------
export function brandSteg(s: State, dtSec: number) {
  const dry = torrhet(s);
  if (dry > 0) gnistor(s, dtSec, dry);
  const b = s.brand;
  if (!b) return;
  const v = vaderNu(s), k = kartaOf(b), slag = Math.round(s.now / SEC);
  // elden tar sig till grannrutorna
  const sprid = BRAND.sprid * dry * (1 + BRAND.vind * v.vind) * (1 - v.nb) * dtSec / 300, bransle = bransleAv(s);
  const nya: number[] = [];
  if (sprid > 0) for (const [i] of b.r) {
    const x = i % W, y = Math.floor(i / W);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, j = ny * W + nx, c = sprid * (dx && dy ? BRAND.hornet : 1);
      if ((!dx && !dy) || !inMap(nx, ny) || k[j] || Math.hypot(nx - b.x, ny - b.y) > BRAND.maxR) continue;
      const u = hash(s.seed + 3851, slag, i * 9 + (dy + 1) * 3 + dx + 1);
      if (u >= c) continue; // antändningen är högst 1: slå bara upp det som brinner när det kan behövas
      const fu = bransle(j);
      if (fu && u < c * fu[0]) nya.push(j);
    }
  }
  for (const j of nya) tand(s, j, b.kalla, 0, bransle);
  // rutorna brinner, regnet släcker, och det som brunnit klart blir aska
  const regn = v.nb * BRAND.regn * dtSec / HOUR_S;
  for (const r of b.r) { r[1] += dtSec / HOUR_S; r[3] += regn; }
  slocknar(s, b);
  // de som ser elden ropar, de som är nära byn släcker och de andra går undan
  const hot = hotar(s, b);
  if (hot && !b.hot) { b.hot = 1; log(s, 'Elden närmar sig byn!', 'world'); count(s, 'brand hot'); }
  ser(s, b);
  soker(s, b, hot);
  iElden(s, b, dtSec);
  if (b.r.length) return;
  // branden är slut
  const delar = [`brände ${b.ut.length} ${b.ut.length === 1 ? 'ruta' : 'rutor'}`, b.trad && `${b.trad} träd`, b.vagg && `rev ${b.vagg} ${b.vagg === 1 ? 'vägg' : 'väggar'}`, b.saker && `${b.saker} saker`].filter(Boolean);
  log(s, `Elden har slocknat. Den ${delar.join(', ')}${b.skadade ? `, och ${b.skadade} brändes` : ''}.`, 'world');
  if (b.hot || b.ut.length >= BRAND.stor) {
    kronika(s, `En eldsvåda ${b.kalla === 'blixt' ? 'efter ett blixtnedslag ' : ''}brände ${b.ut.length} rutor${b.vagg ? ` och ${b.vagg} ${b.vagg === 1 ? 'vägg' : 'väggar'}` : ''}${b.hot ? ' nära byn' : ''}.`);
    allaBarn(s, 'brand');
    for (const p of living(s)) if (p.born < b.t) livet(s, p, 'mg:brand'); // de som klarade den (steg 3.9.8)
  }
  delete s.brand;
}

// gnistor från elden och brasorna, och blixten när den slår ner (en gång i timmen)
function gnistor(s: State, dtSec: number, dry: number) {
  const v = vaderNu(s), takt = BRAND.gnista * dry * (1 + BRAND.vind * v.vind) * (1 - v.nb) * dtSec / 300;
  const fran = (x: number, y: number, spread: number, salt: number) => {
    if (ur(s, salt, 3852) >= takt * spread) return;
    const R = BRAND.gnistaR, nx = x + Math.round((ur(s, salt, 3853) * 2 - 1) * R), ny = y + Math.round((ur(s, salt, 3854) * 2 - 1) * R);
    if (inMap(nx, ny) && (nx !== x || ny !== y)) tand(s, ny * W + nx, 'gnista', ur(s, salt, 3855));
  };
  if (s.fire.lit) { const e = eldPlats(s); fran(e.x, e.y, (HEARTHS.find(h => h.id === s.fire.hearth) ?? HEARTHS[0]).spread, 0); }
  const ring = HEARTHS.find(h => h.id === 'stenring')!.spread; // brasan är en stenring (brasor.ts)
  for (const t of brasorOf(s)) if (t.eld?.lit) fran(t.x, t.y, ring, t.id + 1);
  if (Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR) && blixtNu(s) && ur(s, 0, 3856) < BRAND.blixt) {
    const e = eldPlats(s), R = BRAND.blixtR, nx = e.x + Math.round((ur(s, 0, 3857) * 2 - 1) * R), ny = e.y + Math.round((ur(s, 0, 3858) * 2 - 1) * R);
    if (inMap(nx, ny)) { count(s, 'blixt nara'); tand(s, ny * W + nx, 'blixt', ur(s, 0, 3859) / dry); }
  }
}

// rutorna som brunnit klart eller släckts: det som brann där blir aska efter hur stor del som hann brinna
function slocknar(s: State, b: Brand) {
  const k = kartaOf(b), kvar: BrandRuta[] = [], g = groundOf(s);
  let rev = false, flytt = false;
  for (const r of b.r) {
    if (r[1] < r[2] && r[3] < 1) { kvar.push(r); continue; }
    const i = r[0], x = i % W, y = Math.floor(i / W), a = Math.min(1, r[1] / r[2]);
    k[i] = 2; b.ut.push(i);
    if (r[3] >= 1) { b.slackt++; count(s, 'brand slackt'); }
    count(s, 'brand ut');
    // marken: gräset blir aska, och träden dör (där det var skog kommer en planta, som växer upp när gräset är tillbaka)
    if (isSoil(g.tiles[i]) && !g.built?.[i]) {
      if (g.cover[i] > BRAND.aska) g.cover[i] -= a * (g.cover[i] - BRAND.aska);
      if (g.trees[i] > 0 && a >= BRAND.trad) {
        if (g.trees[i] >= VAG.ungskog) { b.trad++; count(s, 'brand trad'); }
        g.trees[i] = g.trees[i] >= FOREST ? MARK.nyPlanta : 0;
        if (s.halvfallt) delete s.halvfallt[i];
      }
      (s.aska ??= []).push([i, Math.round(s.now)]);
    }
    // väggen tappar skick och rasar
    const v = bitAt(s, x, y), br = v && v.b >= 1 ? MATERIAL[v.m]?.brinner : undefined;
    if (v && br) {
      v.c -= a * BRAND.vaggSkick; rev = true;
      if (v.c <= 0) { rasar(s, v); b.vagg++; count(s, 'brand vagg'); }
    }
    // sakerna brinner upp, och grödan
    for (const st of stacksOf(s)) {
      if (st.x !== x || st.y !== y || st.n < 1 || SAKER[st.k]?.brinnerInte) continue;
      const n = Math.min(Math.floor(st.n), Math.round(st.n * a));
      if (n > 0) { minska(s, st, n); b.saker += n; count(s, 'brand sak', n); flytt = true; }
    }
    const fa = faltAt(s, x, y);
    if (fa && grodaPa(fa, faltIndex(fa, x, y))) { faltBrann(s, fa); count(s, 'brand falt'); }
  }
  b.r = kvar;
  if (rev) touch(s);
  if (flytt) tidy(s);
}

// brinner det nära byns eld? Då släcker de vuxna
function hotar(s: State, b: Brand) {
  const e = eldPlats(s);
  return b.r.some(r => Math.hypot(r[0] % W - e.x, Math.floor(r[0] / W) - e.y) <= BRAND.hot);
}
// den närmaste brinnande rutan till (x, y) och avståndet dit
function narmast(b: Brand, x: number, y: number, utom?: (i: number) => boolean) {
  let best = -1, bd = Infinity;
  for (const r of b.r) {
    if (utom?.(r[0])) continue;
    const d = Math.hypot(r[0] % W + 0.5 - x, Math.floor(r[0] / W) + 0.5 - y);
    if (d < bd) { bd = d; best = r[0]; }
  }
  return { i: best, d: bd };
}

// de som är vakna och ser elden ropar (som vid vargen och tornadon)
function ser(s: State, b: Brand) {
  const sikt = BRAND.sikt * (isLight(s.now) ? 1 : BRAND.siktNatt);
  const ser = living(s).filter(p => p.task?.act !== 'sova' && p.task?.act !== 'badd' && larmNu(s, p)?.vad !== 'brand' && narmast(b, p.x, p.y).d <= sikt);
  if (!ser.length) return;
  if (!living(s).some(p => larmNu(s, p)?.vad === 'brand')) count(s, 'brand sedd');
  const n = narmast(b, ser[0].x, ser[0].y).i;
  larma(s, n % W + 0.5, Math.floor(n / W) + 0.5, 'brand', 1, ser);
}
// den som vet om elden avbryter det hen gör när hen ska släcka eller gå undan (inte den som slåss, vårdar eller bärs)
const AVBRYTS_INTE = new Set<string>(['strid', 'vargjakt', 'buren', 'fatt', 'varda', 'undan', 'slacka', 'flyEld']);
function soker(s: State, b: Brand, hot: boolean) {
  for (const p of living(s)) {
    if (!p.task || AVBRYTS_INTE.has(p.task.act) || larmNu(s, p)?.vad !== 'brand' || !brandMal(s, b, p, hot)) continue;
    avbryt(s, p); count(s, 'brand avbryter');
  }
}
// den som står i en brinnande ruta bränns
function iElden(s: State, b: Brand, dtSec: number) {
  const k = kartaOf(b), DELAR: Kroppsdel[] = ['fotV', 'fotH', 'benV', 'benH', 'handV', 'handH', 'bal'];
  for (const p of living(s)) {
    const x = Math.floor(p.x), y = Math.floor(p.y);
    if (!alive(p) || !inMap(x, y) || k[y * W + x] !== 1 || ur(s, p.id, 3860) >= chans(BRAND.iElden, dtSec)) continue;
    const d = DELAR[Math.floor(ur(s, p.id, 3861) * DELAR.length)], g = BRAND.iEldenGrad[0] + ur(s, p.id, 3862) * (BRAND.iEldenGrad[1] - BRAND.iEldenGrad[0]);
    b.skadade++; count(s, 'brand skadad');
    const dod = skada(s, p, d, 'brannskada', g, 'brand', 'i elden');
    if (dod) die(s, p, dod);
  }
}

// vad p gör åt branden: släcker (de vuxna när elden är nära byn), eller går undan (den som är nära elden)
type BrandMal = { act: 'slacka' | 'flyEld'; why: string; spot: { x: number; y: number }; dur: number; tool?: string; ref?: number };
// den brinnande ruta som någon redan släcker med händerna
const slacks = (s: State, i: number, utom: Person) => living(s).some(q => q !== utom && q.task?.act === 'slacka' && !q.task.tool && q.task.ref === i);
function brandMal(s: State, b: Brand, p: Person, hot: boolean): BrandMal | undefined {
  if (!kanGa(p) || !b.r.length) return;
  const n = narmast(b, p.x, p.y);
  if (hot && ageOf(p, s.now) >= ALDER.vuxen) {
    const e = eldPlats(s), mal = narmast(b, e.x + 0.5, e.y + 0.5).i; // det som brinner närmast byn först
    if (freeTools(s, p, 'vattensack') >= 1 && naVattnet(s, p)) {
      const spot = drickPlats(s, p);
      if (spot) return { act: 'slacka', why: 'Hämtar vatten i säcken till elden', spot, dur: BRAND.fyllMin * MIN, tool: 'vattensack', ref: mal };
    }
    const m = narmast(b, p.x, p.y, i => slacks(s, i, p) || Math.hypot(i % W - e.x, Math.floor(i / W) - e.y) > BRAND.hot); // bara det som brinner nära byn
    if (m.i >= 0) return { act: 'slacka', why: 'Släcker elden med händerna', spot: bredvid(b, m.i, p), dur: BRAND.handMin * MIN, ref: m.i };
  }
  if (n.d > BRAND.fara) return;
  // bort från elden
  const cx = n.i % W + 0.5, cy = Math.floor(n.i / W) + 0.5, dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1, u = ur(s, p.id, 3863) * 2 * Math.PI;
  const ux = l > 0.1 ? dx / l : Math.cos(u), uy = l > 0.1 ? dy / l : Math.sin(u);
  const x = Math.min(W - 1.5, Math.max(1.5, cx + ux * (BRAND.fara + BRAND.undan))), y = Math.min(H - 1.5, Math.max(1.5, cy + uy * (BRAND.fara + BRAND.undan)));
  return { act: 'flyEld', why: 'Elden är nära, går undan', spot: { x, y }, dur: BRAND.undanMin * MIN };
}
// platsen bredvid den brinnande rutan i, på sidan mot p (inte i elden)
function bredvid(b: Brand, i: number, p: { x: number; y: number }) {
  const k = kartaOf(b), cx = i % W + 0.5, cy = Math.floor(i / W) + 0.5, dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1;
  for (const f of [1, 1.5, 2.5]) {
    const x = cx + dx / l * f, y = cy + dy / l * f;
    if (inMap(Math.floor(x), Math.floor(y)) && k[Math.floor(y) * W + Math.floor(x)] !== 1) return { x, y };
  }
  return { x: cx + dx / l, y: cy + dy / l };
}
// det p väljer när hen vet om branden (val.ts, efter vargen och tornadon)
export function brandVal(s: State, p: Person): BrandMal | undefined {
  const b = s.brand;
  if (!b || larmNu(s, p)?.vad !== 'brand') return;
  return brandMal(s, b, p, !!b.hot && hotar(s, b));
}

// ---------- att släcka (steg.ts) ----------
// medan man släcker med händerna: den närmaste brinnande rutan inom räckhåll släcks lite i taget, och man kan bränna sig
export function slackaSteg(s: State, p: Person, t: Task, dtSec: number) {
  const b = s.brand;
  if (t.tool) return; // vattensäcken fylls
  if (!b) { t.until = s.now; return; }
  const k = kartaOf(b);
  let r = b.r.find(q => q[0] === t.ref);
  if (!r || Math.hypot(r[0] % W + 0.5 - p.x, Math.floor(r[0] / W) + 0.5 - p.y) > BRAND.handR) {
    const n = narmast(b, p.x, p.y);
    r = n.d <= BRAND.handR ? b.r.find(q => q[0] === n.i) : undefined;
  }
  if (!r) { t.until = s.now; return; }
  t.ref = r[0];
  r[3] += BRAND.hand * dtSec / HOUR_S;
  if (k[r[0]] === 1 && ur(s, p.id, 3864) < chans(BRAND.brannHand, dtSec)) {
    const DELAR: Kroppsdel[] = ['handV', 'handH', 'armV', 'armH'];
    const d = DELAR[Math.floor(ur(s, p.id, 3865) * DELAR.length)], g = BRAND.brannHandGrad[0] + ur(s, p.id, 3866) * (BRAND.brannHandGrad[1] - BRAND.brannHandGrad[0]);
    b.skadade++; count(s, 'brand skadad');
    const dod = skada(s, p, d, 'brannskada', g, 'brand', 'när hen släckte elden');
    if (dod) die(s, p, dod);
  }
}
// säcken är fylld (KLAR i steg.ts): bär den till det som brinner. Utan säck i handen blir det inget
export function slackaFylld(s: State, p: Person, t: Task) {
  const b = s.brand;
  if (!t.tool || !b?.r.length) return;
  const i = b.r.some(r => r[0] === t.ref) ? t.ref! : narmast(b, p.x, p.y).i;
  const m = bredvid(b, i, p);
  t.ref = i; t.phase = 'back'; t.tx = m.x; t.ty = m.y; t.why = 'Bär vatten till elden';
}
// framme vid elden med säcken (arrive i steg.ts): vattnet släcker de närmaste rutorna, och säcken slits
export function slackaFram(s: State, p: Person, _t: Task) {
  const b = s.brand;
  if (b) {
    const nara = b.r.map(r => ({ r, d: Math.hypot(r[0] % W + 0.5 - p.x, Math.floor(r[0] / W) + 0.5 - p.y) })).filter(q => q.d <= BRAND.sackR).sort((a, c) => a.d - c.d || a.r[0] - c.r[0]);
    for (const q of nara.slice(0, BRAND.sackRutor)) q.r[3] = 1;
    if (nara.length) { count(s, 'brand sack'); wearUsed(s, p, 1); }
    slocknar(s, b);
  }
  p.task = undefined;
}

// det svarta efter elden: rutorna som brann och när (gränssnittet ritar dem mörka). Det gamla tas bort (timblocket i steg.ts)
export function askaSteg(s: State) {
  if (s.aska?.length && s.aska[0][1] < s.now - BRAND.svart * DAY) {
    s.aska = s.aska.filter(a => a[1] >= s.now - BRAND.svart * DAY);
    if (!s.aska.length) delete s.aska;
  }
}
