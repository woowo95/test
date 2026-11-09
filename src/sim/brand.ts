import { han, mark, tal } from './ord';
import { tabortBuske } from './buskar';
import { freeTools, tingOf } from './agande';
import { balans } from './balans';
import { brasorOf } from './brasor';
import { hearthOf } from './eld';
import { rasar } from './bygg';
import { Bit, MATERIAL, bitAt, dorrDef, touch, vagBort } from './byggnad';
import { Station, stationAt, stationDef, taBort } from './stationer';
import { ALDER, ageOf, alive, count, livet, living, log } from './folk';
import { Kroppsdel, kanGa, skada } from './halsa';
import { kronika } from './historik';
import { naVattnet } from './is';
import { eldPlats, vaderstreck } from './karta';
import { bynsAvstand, bynsMitt } from './omrade';
import { avbryt, minska, nagotPa, stacksOf, tidy } from './lager';
import { die } from './liv';
import { groundOf, markslag } from './mark';
import { TORR } from './trad';
import { nyStubbe } from './skog';
import { faltAt, faltBrann, faltIndex, grodaPa } from './odling';
import { wearUsed } from './redskap';
import { larma, larmNu } from './rykten';
import { SAKER } from './saker';
import { isLight, kalender } from './tid';
import { drickPlats } from './torst';
import { DAY, H, HEARTHS, HOUR, HOUR_S, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { allaBarn, drabbadHus, upplev } from './uppvaxt';
import { VAG, isSoil } from './vag';
import { blixtNu, snoPaMarken, torrTim, vaderNu } from './vader';
import { hash3 } from './slump';
import { larmAvbryter } from './handlingar';
import { tecken } from './religion';
import { paSig } from './utrustning';
import { notis } from './notiser';

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

// gnista är en chans per fem minuter speltid, oavsett hur långt steget är (en tidsenhet, inget balanstal)
const FEM_MIN = 5 * MIN / SEC;
// spridningen räknas i delsteg om fem sekunder inne i varje slag (steg 6.4.1), likadant i levande läget och snabbläget
const DELSTEG = 5;

// Balanstal (regel 8)
export const BRAND = balans('brand', {
  gnista: 0.001, // chansen per steg (5 minuter) att en gnista från en brinnande eld når marken, gånger eldstadens spread ...
  gnistaR: 2, // ... så här många rutor bort (slumpas)
  blixt: 0.5, // chansen att blixten slår ner nära byn när den slår ner (blixtNu i vader.ts) ...
  blixtR: 30, // ... så här många rutor från byns mitt (bynsMitt i omrade.ts, slumpas)
  ljusR: 4, // en brinnande ruta i brandens kant lyser så här många rutor bort (steg 9.2.20, raden brand i LJUSKALLOR)
  sprid: 0.7, // chansen per delsteg (5 sekunder) att elden tar sig från en ruta till en grannruta när marken är helt torr, gånger det som kan brinna där (antändning): i torrt högt gräs ungefär var femte sekund
  hornet: 0.7, // ... gånger det här till en ruta snett bredvid
  torrTim: 48, // marken är helt torr efter så här många torra timmar (torrTim i vader.ts; två dygn, två år i spelet, steg 9.2.25) ...
  arstid: [0, 0.6, 1, 0.8], // ... och så här torr i tidsåldern (istid, vår, sommar, höst)
  sno: 0.85, // snön på marken gör den blöt (steg 9.2.102): torrheten gånger 1 − sno × snön (snoPaMarken i vader.ts, 0 till 1), så att branden sprids sämre ju mer snö som ligger men aldrig stoppas helt
  vind: 1.5, // blåsten (0 till 1) sprider elden så här mycket mer med vinden, och mindre mot den (steg 6.4.4) ...
  motvind: 0.15, // ... men aldrig mindre än så här mycket (gånger) rakt mot vinden
  gnistVind: 3, // gnistorna flyger så här många rutor till med vinden i full blåst
  regn: 2, // regnet släcker en ruta så här fort (rutor per timme i det kraftigaste regnet), och sprider den mindre
  // det som kan brinna: [antändning 0 till 1, timmar det brinner, hur lätt det släcks]. Högt gräs brinner snabbast, kort gräs
  // medel, skogen och det som är av trä lite långsammare (steg 6.4.1). Det sista talet gångrar händerna och vattensäcken: kort
  // gräs väldigt lätt, högt gräs lätt, skog och trä väldigt svårt, så en brand som vuxit in i skogen är svår att släcka (steg 6.4.2)
  // brandens fart (steg 9.2.25): skogen och det korta gräset tar eld lättare än förut (0,2 och 0,4)
  skog: [0.35, 3, 0.3], ung: [0.3, 1, 0.6], buske: [1, 1, 1.2], hog: [1, 0.5, 2], kort: [0.6, 0.3, 4], groda: [0.5, 0.5, 2], vagg: [0.25, 2, 0.3], sak: [0.35, 1, 1],
  aska: 0.32, // gräset på en ruta som brunnit (0 till 1; just över bar jord, så att det inte blir en stig)
  trad: 0.5, // träden dör när så här stor del av rutan har brunnit
  vaggSkick: 1.2, // en vägg tappar så här mycket av sitt skick gånger andelen som brunnit
  maxR: 40, // elden tar sig aldrig längre än så här många rutor från där den började
  svart: 3, // marken syns svart så här många dygn (år i spelet) efter att den brunnit
  sagd: 3, // branden syns i loggen när så här många rutor har börjat brinna ...
  stor: 20, // ... och i krönikan när den bränt så här många, eller när den kommit nära byn
  sikt: 20, // man ser elden så här många rutor bort på dagen ...
  siktNatt: 0.5, // ... och så här stor del av det på natten (men glöden syns)
  hot: 10, // elden hotar byn när en ruta brinner så här nära byns område (utanforByn): då släcker de vuxna
  fara: 2, // den som är så här nära en brinnande ruta och inte släcker går undan ...
  undan: 6, // ... så här många rutor bort ...
  undanMin: 30, // ... i så här många minuter
  handMin: 20, // ett pass att släcka med händerna (minuter) ...
  hand: 1.5, // ... släcker så här många rutor i timmen ...
  handR: 1.6, // ... inom så här många rutor från den som släcker
  fyllMin: 2, // minuter att fylla vattensäcken
  sackRutor: 4, // en säck vatten släcker så här många rutor (gånger hur lätt rutan släcks, högst helt) ...
  sackR: 2.5, // ... inom så här många rutor från där den hälls
  brannHand: 0.15, // chansen i timmen att få en brännskada när man släcker med händerna ...
  brannHandGrad: [0.1, 0.4], // ... så här svår (slumpas mellan)
  iElden: 3, // den som står i en brinnande ruta bränns med den här takten (i timmen) ...
  iEldenGrad: [0.2, 0.7], // ... så här svårt (slumpas mellan)
  // den som brinner (steg 6.4.16): kläderna eller håret tar eld, och hen bränns tills elden är släckt
  tarEld: 0.5, // chansen att man börjar brinna när man bränns i en brinnande ruta ...
  tarEldHand: 0.2, // ... när man bränns medan man släcker med händerna ...
  vaggEld: 0.3, // ... och i timmen när man står bredvid en brinnande vägg (elden hoppar över)
  brinnSkada: 6, // den som brinner får brännskador med den här takten (i timmen) ...
  brinnGrad: [0.1, 0.4], // ... så här svåra (slumpas mellan)
  plaggBrinner: 1.5, // chansen i timmen att ett plagg man har på sig brinner upp
  regnSlacker: 6, // regnet släcker den som brinner med den här takten (i timmen, i det kraftigaste regnet)
  vattenR: 4, // den som brinner går i vattnet om det är så här nära (rutor) ...
  rullMin: 1, // ... annars kastar hen plagget som brinner, eller rullar på marken så här många minuter
  hjalpR: 8, // de som står så här nära (rutor) springer dit och släcker med vattensäcken, ett skinn, en filt eller händerna ...
  hjalpMin: 0.5, // ... och det tar så här många minuter när de är framme
});

// en brinnande ruta: rutan, timmar den brunnit, timmar den kan brinna, hur långt den släckts (1 = släckt)
export type BrandRuta = [number, number, number, number];
// branden som pågår: när och var den började (kalla = gnistor eller blixten), rutorna som brinner och de som brunnit klart,
// hur många rutor som tagit eld, och vad den gjort
// brann = det av trä som brunnit upp (golv, dörrar, stationer, möbler och redskap), namnet och hur många (steg 6.4.3)
export interface Brand { t: number; x: number; y: number; kalla: 'gnista' | 'blixt'; r: BrandRuta[]; ut: number[]; n: number; trad: number; vagg: number; saker: number; skadade: number; slackt: number; hot?: 1; sagd?: 1; kallor?: number[]; brann?: Record<string, number> }

// ett tal mellan 0 och 1 ur byns frö, tiden (i steg), en ruta eller person och ett salt (hash3 i slump.ts, drar inget ur
// slumpföljderna)
const hash = hash3;
const ur = (s: State, a: number, salt: number) => hash(s.seed + salt * 7919, Math.round(s.now / SEC), a);
const chans = (takt: number, dtSec: number) => 1 - Math.exp(-takt * dtSec / HOUR_S); // takt i timmen under dtSec sekunder

// branden sprids högst BRAND.maxR rutor från där den började, eller från en ruta som tänts i testläget (kallor, steg 4.5.6.6)
const nara = (b: Brand, x: number, y: number) => Math.hypot(x - b.x, y - b.y) <= BRAND.maxR || !!b.kallor?.some(i => Math.hypot(x - i % W, y - Math.floor(i / W)) <= BRAND.maxR);
// hur torr marken är (0 till 1): torra timmar, tidsåldern, och snön som blöter marken
export function torrhet(s: State) {
  const sno = 1 - BRAND.sno * Math.max(0, Math.min(1, snoPaMarken(s))); // snön blöter marken (steg 9.2.102)
  if (s.testTorr) return sno; // testläget: marken är torkad helt (steg 9.2.24), men snön ligger kvar
  return Math.min(1, torrTim(s) / BRAND.torrTim) * BRAND.arstid[kalender(s).ai] * sno;
}
// hur lätt biten v tar eld: en vägg eller ett golv efter materialet, en öppning med en dörr som en vägg (steg 6.4.3)
const bitBrinner = (v: Bit | undefined) => !v ? undefined : v.k === 'oppning' ? (v.dorr ? 1 : undefined) : v.b >= 1 ? MATERIAL[v.m]?.brinner : undefined;
// en station eller möbel brinner om något den är gjord av brinner (inte stenringen)
const stationBrinner = (t: Station | undefined) => !!t && Object.keys(stationDef(t.k)?.av ?? {}).some(k => !SAKER[k]?.brinnerInte);
// ett redskap som ligger på marken eller i en möbel (ingen bär det)
const tingPaMarken = (s: State) => tingOf(s).filter(t => t.hos === undefined && t.lass === undefined && t.x !== undefined && t.y !== undefined && !SAKER[t.k]?.brinnerInte);
// det som kan brinna på en ruta: [antändning, timmar, hur lätt det släcks (det svåraste)], eller undefined. Sakerna slås upp en gång per steg
function bransleAv(s: State) {
  let saker: Set<number> | undefined;
  const g = groundOf(s);
  return (i: number): [number, number, number] | undefined => {
    const x = i % W, y = Math.floor(i / W);
    let f = 0, tim = 0, sl = Infinity;
    const lagg = (r: readonly number[], k = 1) => { if (r[0] * k > f) f = r[0] * k; if (r[1] > tim) tim = r[1]; if (r[2] < sl) sl = r[2]; };
    const fa = faltAt(s, x, y), v = bitAt(s, x, y);
    if (fa) { if (grodaPa(fa, faltIndex(fa, x, y))) lagg(BRAND.groda); }
    else if (!v && isSoil(g.tiles[i]) && !g.built?.[i]) { const m = markslag(g, i); if (m !== 'bar') lagg(BRAND[m]); } // inte under ett golv eller en vägg
    const b = bitBrinner(v);
    if (b) lagg(BRAND.vagg, b);
    if (s.stationer?.length && stationBrinner(stationAt(s, x, y))) lagg(BRAND.sak);
    saker ??= new Set([...stacksOf(s).filter(st => st.n >= 1 && !SAKER[st.k]?.brinnerInte).map(st => st.y * W + st.x), ...tingPaMarken(s).map(t => Math.floor(t.y!) * W + Math.floor(t.x!))]);
    if (saker.has(i)) lagg(BRAND.sak);
    return f > 0 ? [f, tim, sl] : undefined;
  };
}

// rutorna som brinner (1) och som brunnit klart (2) i branden, för att slå upp dem fort (byggs om efter en laddning)
const karta = new WeakMap<Brand, Uint8Array>();
function kartaOf(b: Brand) {
  let k = karta.get(b);
  if (!k) { k = new Uint8Array(W * H); for (const i of b.ut) k[i] = 2; for (const r of b.r) k[r[0]] = 1; karta.set(b, k); }
  return k;
}
// bara brandens kant räknas (steg 6.4.5): en ruta vars grannar alla brinner eller har brunnit kan inte sprida elden mer,
// och den hoppas över tills den slocknar. Grannarna börjar aldrig om, så det ändrar ingenting i hur branden går
const inreKarta = new WeakMap<Brand, Uint8Array>();
function inreOf(b: Brand) {
  let k = inreKarta.get(b);
  if (!k) { k = new Uint8Array(W * H); inreKarta.set(b, k); }
  return k;
}
// hur många av de brinnande rutorna som räknas, alltså brandens kant (scenariot brandkant)
export const brandKant = (s: State) => s.brand ? s.brand.r.filter(r => !inreOf(s.brand!)[r[0]]).length : 0;
// brinner ruta i?
export const brinner = (s: State, i: number) => !!s.brand && kartaOf(s.brand)[i] === 1;
// ljuset från branden (steg 9.2.20): rutorna i brandens kant som inte är släckta, en gång per tid (frågas ofta)
const ljusMinne = new WeakMap<Brand, { t: number; r: number[] }>();
export function brandLjus(s: State): readonly number[] {
  const b = s.brand;
  if (!b) return [];
  const m = ljusMinne.get(b);
  if (m && m.t === s.now) return m.r;
  const inre = inreOf(b), r = b.r.filter(q => !inre[q[0]] && q[3] < 1).map(q => q[0]);
  ljusMinne.set(b, { t: s.now, r });
  return r;
}
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

// testläget (steg 4.5.6.6): rutan (x, y) tar eld, med tand som en blixt, och sedan sprids branden efter de vanliga reglerna.
// Brinner inget på rutan (vatten, sten, bar jord) tänds inget; i snön tänds det, men branden sprids sämre (steg 9.2.102), och svaret säger varför. Bara i kopian av byn
export function tandTest(s: State, x: number, y: number): { ok: boolean; text: string } {
  if (!inMap(x, y)) return { ok: false, text: 'Rutan är utanför kartan' };
  const i = y * W + x, k = s.brand && kartaOf(s.brand)[i];
  if (k === 1) return { ok: false, text: 'Det brinner redan där' };
  if (k === 2) return { ok: false, text: 'Rutan har redan brunnit' };
  const g = groundOf(s), vad = g.tiles[i] === T.Vatten ? 'vatten' : !isSoil(g.tiles[i]) ? 'sten' : markslag(g, i) === 'bar' ? 'bar jord' : 'inget som brinner';
  const fu = bransleAv(s)(i);
  if (!fu) return { ok: false, text: `Inget brinner där (${vad})` };
  const ny = !s.brand;
  tand(s, i, 'blixt', 0);
  if (!ny) (s.brand!.kallor ??= []).push(i);
  const e = eldPlats(s), d = Math.round(Math.hypot(x - e.x, y - e.y));
  // hur torr marken är och hur fort branden väntas sprida sig till en grannruta av samma slag (steg 9.2.24): en chans per
  // delsteg (5 sekunder, spelets tid) på sprid × antändningen × torrheten
  const dry = torrhet(s), p5 = BRAND.sprid * fu[0] * dry, slag = MARKORD[markslag(g, i)] ?? 'där';
  const fart = p5 > 0 ? (() => { const sek = 5 / Math.min(1, p5); return sek < 90 ? `en ruta på ungefär ${Math.round(sek)} sekunder ${slag}` : `en ruta på ungefär ${Math.round(sek / 60)} minuter ${slag}`; })() : 'den sprider sig inte';
  const text = `Testläget: en brand tändes ${d ? `${d} ${d === 1 ? 'ruta' : 'rutor'} ${vaderstreck(s, x, y)} om elden` : 'vid elden'} (torrhet ${Math.round(dry * 100)} %, ${fart}).` + (dry <= 0 ? ' Marken är för blöt för att den ska sprida sig.' : snoPaMarken(s) > 0 ? ' Snön på marken gör att den sprids sämre.' : '');
  log(s, text, 'world');
  return { ok: true, text };
}

const MARKORD: Record<string, string> = { skog: 'i skogen', ung: 'i ungskogen', buske: 'bland buskarna', hog: 'i det höga gräset', kort: 'i det korta gräset' };
// testläget (steg 9.2.24): marken torkas helt, så att en brand kan provas när som helst (bara i kopian av byn)
export function torkaTest(s: State): { ok: boolean; text: string } {
  s.testTorr = 1;
  return { ok: true, text: 'Testläget: marken är helt torr, också i istiden, tills testläget stängs (snön blöter den ändå lite)' };
}
// blixten slog ner på rutan (steg 9.2.21): den syns i gränssnittet en kort stund. Bara nedslagen den senaste timmen sparas
export function nedslag(s: State, x: number, y: number) {
  const i = y * W + x, g = groundOf(s);
  if (isSoil(g.tiles[i]) && !g.built?.[i]) (s.aska ??= []).push([i, Math.round(s.now)]); // rutan svärtas alltid (steg 9.2.26)
  s.nedslag = [...(s.nedslag ?? []).filter(n => s.now - n.t < HOUR).slice(-7), { x, y, t: s.now }];
}
// testläget (steg 6.4.7): en vanlig blixt slår ner på rutan (x, y). Den tänder som blixten i vädret (gnistor nedan): bara
// när det finns något som brinner och marken är torr nog, med en ny slumpsiffra för varje blixt. Svaret säger om den tände och varför
export function blixtTest(s: State, x: number, y: number): { ok: boolean; text: string } {
  if (!inMap(x, y)) return { ok: false, text: 'Rutan är utanför kartan' };
  nedslag(s, x, y);
  const i = y * W + x, k = s.brand && kartaOf(s.brand)[i], dry = torrhet(s), fu = bransleAv(s)(i);
  const g = groundOf(s), vad = g.tiles[i] === T.Vatten ? 'i vattnet' : !isSoil(g.tiles[i]) ? 'i berget' : markslag(g, i) === 'bar' ? 'på bar jord' : 'där inget brinner';
  const var_ = `${Math.round(Math.hypot(x - eldPlats(s).x, y - eldPlats(s).y))} rutor ${vaderstreck(s, x, y)} om elden`;
  let text: string;
  if (k === 1) text = `Blixten slog ner ${var_}, där det redan brinner`;
  else if (k === 2) text = `Blixten slog ner ${var_}, där det redan har brunnit`;
  else if (!fu) text = `Blixten slog ner ${var_} ${vad}, och inget tog eld`;
  else if (dry <= 0) text = `Blixten slog ner ${var_}, men marken är för blöt och inget tog eld`;
  else {
    const ny = !s.brand, fore = s.brand?.n ?? 0;
    count(s, 'blixtProv'); // varje blixt får en egen slumpsiffra, räknad i byn och inte i modulen (regel 4)
    tand(s, i, 'blixt', hash(s.seed + 3860, Math.round(s.now / SEC), s.stat!.blixtProv) / dry);
    const tande = (s.brand?.n ?? 0) > fore;
    if (tande && !ny) (s.brand!.kallor ??= []).push(i);
    text = tande ? `Blixten slog ner ${var_} och tände marken` : `Blixten slog ner ${var_} men tände inte (marken är ${dry < 0.5 ? 'bara lite' : 'ganska'} torr, och det var tur)`;
  }
  log(s, 'Testläget: ' + text + '.', 'world');
  return { ok: true, text };
}

// ---------- varje steg (steg.ts) ----------
export function brandSteg(s: State, dtSec: number) {
  const dry = torrhet(s);
  if (dry > 0) gnistor(s, dtSec, dry);
  const b = s.brand;
  if (!b) return;
  const v = vaderNu(s), k = kartaOf(b), inre = inreOf(b), bransle = bransleAv(s);
  // elden tar sig till grannrutorna, i delsteg om fem sekunder (steg 6.4.1): det som tänds i ett delsteg sprider sig i nästa
  const n = Math.max(1, Math.round(dtSec / DELSTEG)), dt = dtSec / n;
  const sprid = BRAND.sprid * dry * (1 - v.nb) * dt / DELSTEG;
  // med vinden fortare, mot den långsammare (steg 6.4.4): en faktor per grannruta, efter hur väl hållet stämmer med vinden
  const vx = Math.cos(v.rikt), vy = Math.sin(v.rikt), medVind = (dx: number, dy: number) => Math.max(BRAND.motvind, 1 + BRAND.vind * v.vind * (dx * vx + dy * vy) / Math.hypot(dx, dy));
  const fv: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) fv.push(dx || dy ? medVind(dx, dy) * (dx && dy ? BRAND.hornet : 1) : 0);
  if (sprid > 0) for (let d = 0; d < n; d++) {
    const slag = Math.round(s.now / SEC) - Math.round((n - 1 - d) * dt), kvar = (n - 1 - d) * dt; // delstegets tid, och tiden kvar av slaget
    const nya: number[] = [];
    for (const [i] of b.r) {
      if (inre[i]) continue;
      const x = i % W, y = Math.floor(i / W);
      let kant = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx, c = sprid * fv[(dy + 1) * 3 + dx + 1];
        if ((!dx && !dy) || !inMap(nx, ny) || k[j]) continue;
        kant = true;
        if (!nara(b, nx, ny)) continue;
        const u = hash(s.seed + 3851, slag, i * 9 + (dy + 1) * 3 + dx + 1);
        if (u >= c) continue; // antändningen är högst 1: slå bara upp det som brinner när det kan behövas
        const fu = bransle(j);
        if (fu && u < c * fu[0]) nya.push(j);
      }
      if (!kant) inre[i] = 1; // grannarna brinner eller har brunnit: rutan sprider aldrig mer
    }
    for (const j of nya) {
      const fore = b.r.length;
      tand(s, j, b.kalla, 0, bransle);
      if (b.r.length > fore) b.r[fore][1] = (kvar - dtSec) / HOUR_S; // har brunnit bara resten av slaget när slaget räknas nedan
    }
  }
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
  const delar = [`brände ${mark(b.ut.length)}`, b.trad && `${tal(b.trad, true)} träd`, b.vagg && `rev ${b.vagg === 1 ? 'en vägg' : `${tal(b.vagg)} väggar`}`, b.saker && `${b.saker === 1 ? 'en sak' : `${tal(b.saker)} saker`}`, b.brann && `och det här brann upp: ${brannText(b)}`].filter(Boolean);
  log(s, `Elden har slocknat. Den ${delar.join(', ')}${b.skadade ? `, och ${tal(b.skadade)} brändes` : ''}.`, 'world');
  if (b.hot || b.ut.length >= BRAND.stor) {
    notis(s, 'motgang', `Elden har slocknat. Den ${delar.join(', ')}${b.skadade ? `, och ${tal(b.skadade)} brändes` : ''}.`);
    kronika(s, `En eldsvåda ${b.kalla === 'blixt' ? 'efter ett blixtnedslag ' : ''}brände ${mark(b.ut.length)}${b.vagg ? ` och ${b.vagg === 1 ? 'en vägg' : `${tal(b.vagg)} väggar`}` : ''}${b.hot ? ' nära byn' : ''}.`, 'motgang');
    allaBarn(s, 'brand');
    for (const p of living(s)) if (p.born < b.t) livet(s, p, 'mg:brand'); // de som klarade den (steg 3.9.8)
  }
  for (const p of living(s)) if (Math.hypot(p.x - b.x, p.y - b.y) < 14) tecken(s, p, 'brandStopp'); // branden som stannade (steg 8.5.18)
  delete s.brand;
}

// gnistor från elden och brasorna, och blixten när den slår ner (en gång i timmen)
function gnistor(s: State, dtSec: number, dry: number) {
  const v = vaderNu(s), takt = BRAND.gnista * dry * (1 + BRAND.vind * v.vind) * (1 - v.nb) * dtSec / FEM_MIN;
  const fx = Math.cos(v.rikt) * v.vind * BRAND.gnistVind, fy = Math.sin(v.rikt) * v.vind * BRAND.gnistVind; // gnistorna flyger med vinden (steg 6.4.4)
  const fran = (x: number, y: number, spread: number, salt: number) => {
    if (ur(s, salt, 3852) >= takt * spread) return;
    const R = BRAND.gnistaR, nx = x + Math.round((ur(s, salt, 3853) * 2 - 1) * R + fx), ny = y + Math.round((ur(s, salt, 3854) * 2 - 1) * R + fy);
    if (inMap(nx, ny) && (nx !== x || ny !== y)) tand(s, ny * W + nx, 'gnista', ur(s, salt, 3855));
  };
  if (s.fire.lit) { const e = eldPlats(s); fran(e.x, e.y, (HEARTHS.find(h => h.id === s.fire.hearth) ?? HEARTHS[0]).spread, 0); }
  for (const f of brasorOf(s)) if (f.lit) fran(f.at!.x, f.at!.y, hearthOf(f).spread, f.id! + 1); // de andra lägereldarna gnistrar som den första (steg 4.5.6.8)
  if (Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR) && blixtNu(s) && ur(s, 0, 3856) < BRAND.blixt) {
    const e = bynsMitt(s), R = BRAND.blixtR, nx = e.x + Math.round((ur(s, 0, 3857) * 2 - 1) * R), ny = e.y + Math.round((ur(s, 0, 3858) * 2 - 1) * R);
    if (inMap(nx, ny)) { count(s, 'blixt nara'); nedslag(s, nx, ny); tand(s, ny * W + nx, 'blixt', ur(s, 0, 3859) / dry); }
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
      if (a >= BRAND.trad) tabortBuske(g, i); // busken brinner upp (steg 6.5.3)
      // brandens spår (steg 9.2.26): ett stort träd blir en kolnad stam som står kvar som torrakan (s.kolnad) tills den faller
      // eller huggs, ett litet blir en svart stubbe, och en planta brinner upp
      if (g.trees[i] > 0 && a >= BRAND.trad) {
        if (g.trees[i] >= VAG.ungskog) { b.trad++; count(s, 'brand trad'); }
        if (g.trees[i] >= 1 && g.alder) {
          if ((g.alder[i] ?? 0) < TORR(g.art, i)) g.alder[i] = TORR(g.art, i);
          if (!(s.kolnad ??= []).includes(i)) s.kolnad.push(i);
        } else {
          if (g.trees[i] >= VAG.ungskog) { nyStubbe(s, x, y, 0); s.stubbar![s.stubbar!.length - 1].kol = 1; }
          g.trees[i] = 0;
        }
        if (s.halvfallt) delete s.halvfallt[i];
      }
      (s.aska ??= []).push([i, Math.round(s.now)]);
    }
    // väggen tappar skick och rasar; ett golv av trä eller hö blir jordgolv, och dörren brinner upp (steg 6.4.3)
    const v = bitAt(s, x, y), br = bitBrinner(v), upp = a >= BRAND.trad;
    if (v && br && v.k === 'vagg') {
      v.c -= a * BRAND.vaggSkick; rev = true;
      if (v.c <= 0) { const h = rasar(s, v); b.vagg++; count(s, 'brand vagg'); drabbadHus(s, h, 'eldsvådan som förstörde huset'); }
    } else if (v && br && upp) {
      if (v.k === 'golv') { brann(b, MATERIAL[v.m].namn); if (MATERIAL[v.m].vag) vagBort(s, v); else v.m = 'jord'; }
      else { brann(b, dorrDef(v.dorr)?.namn ?? 'Dörr'); delete v.dorr; }
      count(s, 'brand ' + v.k); rev = true;
    }
    // stationen eller möbeln brinner upp, med redskapen i den, och redskapen som ligger på marken
    const st = s.stationer?.length ? stationAt(s, x, y) : undefined;
    if (upp && st && stationBrinner(st)) {
      for (const k of tingOf(s).filter(q => q.vid === st.id && q.hos === undefined && q.lass === undefined && !SAKER[q.k]?.brinnerInte)) { brann(b, SAKER[k.k]?.namn ?? k.k); s.ting = tingOf(s).filter(q => q !== k); }
      brann(b, stationDef(st.k)?.namn ?? st.k); count(s, 'brand station'); taBort(s, st); flytt = true;
    }
    if (upp) for (const k of tingPaMarken(s)) if (Math.floor(k.x!) === x && Math.floor(k.y!) === y) { brann(b, SAKER[k.k]?.namn ?? k.k); s.ting = tingOf(s).filter(q => q !== k); count(s, 'brand redskap'); }
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

// det som brann upp skrivs i branden (namnet och hur många)
function brann(b: Brand, namn: string) { (b.brann ??= {})[namn] = (b.brann[namn] ?? 0) + 1; }
// det som brann upp, i ord: "Kista, Trägolv ×3"
const brannText = (b: Brand) => Object.entries(b.brann ?? {}).map(([k, n]) => n > 1 ? `${k.toLowerCase()} (${tal(n)})` : k.toLowerCase()).join(', ');

// brinner det nära byn (dess område, steg 6.2.4)? Då släcker de vuxna
function hotar(s: State, b: Brand) {
  const ut = bynsAvstand(s);
  return b.r.some(r => ut.at(r[0]) <= BRAND.hot);
}
// den brinnande rutan närmast byns område
function narmastByn(s: State, b: Brand) {
  const ut = bynsAvstand(s);
  let best = -1, bd = Infinity;
  for (const r of b.r) { const d = ut.at(r[0]); if (d < bd) { bd = d; best = r[0]; } }
  return best;
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
  larma(s, 'brand', 1, ser);
  for (const p of ser) tecken(s, p, b.kalla === 'blixt' ? 'blixt' : 'brand'); // det oförklarliga (steg 4.1.2.1)
}
// den som vet om elden avbryter det hen gör när hen ska släcka eller gå undan (inte den som slåss, vårdar eller bärs)
function soker(s: State, b: Brand, hot: boolean) {
  for (const p of living(s)) {
    if (!p.task || !larmAvbryter(p.task.act, 'brand') || larmNu(s, p)?.vad !== 'brand' || !brandMal(s, b, p, hot)) continue;
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
    if (dod) { die(s, p, dod); continue; }
    upplev(s, p, 'drabbad', 'eldsvådan'); // steg 4.1.1.2
    if (ur(s, p.id, 3867) < BRAND.tarEld) antand(s, p, 'i elden');
  }
  // elden hoppar över från en brinnande vägg till den som står bredvid
  for (const p of living(s)) {
    if (p.brinner !== undefined || !alive(p)) continue;
    const x = Math.floor(p.x), y = Math.floor(p.y);
    let vid = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inMap(x + dx, y + dy) && k[(y + dy) * W + x + dx] === 1 && bitAt(s, x + dx, y + dy)?.k === 'vagg') vid = true;
    if (vid && ur(s, p.id, 3868) < chans(BRAND.vaggEld, dtSec)) antand(s, p, 'från väggen');
  }
}

// ---------- den som brinner (steg 6.4.16) ----------
// p börjar brinna: hen och de vuxna nära slutar med det de gör och väljer på nytt (Fara i val.ts)
export function antand(s: State, p: Person, var_: string) {
  if (p.brinner !== undefined || !alive(p)) return;
  p.brinner = s.now;
  count(s, 'brinner');
  log(s, `${p.name} brinner (${var_.replace(/\bhen\b/, han(p))})!`, 'world', [p.id]);
  avbryt(s, p);
  for (const q of living(s)) if (q !== p && hjalpare(s, q, p)) avbryt(s, q);
}
// q kan hjälpa den som brinner: en vuxen som kan gå, inte brinner själv och står nära
const hjalpare = (s: State, q: Person, p: Person) => q.brinner === undefined && kanGa(q) && ageOf(q, s.now) >= ALDER.vuxen && Math.hypot(q.x - p.x, q.y - p.y) <= BRAND.hjalpR;
export const slacktP = (s: State, p: Person, hur: string) => {
  if (p.brinner === undefined) return;
  delete p.brinner;
  count(s, 'brinner slackt'); count(s, `brinner slackt ${hur}`);
}
// varje slag (steg.ts, efter brandSteg): den som brinner bränns, plaggen kan brinna upp, och regnet släcker
export function brinnerSteg(s: State, dtSec: number) {
  const v = vaderNu(s), DELAR: Kroppsdel[] = ['armV', 'armH', 'benV', 'benH', 'bal', 'handV', 'handH', 'huvud'];
  for (const p of living(s)) {
    if (p.brinner === undefined) continue;
    if (!alive(p)) { delete p.brinner; continue; }
    if (v.nb > 0 && ur(s, p.id, 3869) < chans(BRAND.regnSlacker * v.nb, dtSec)) { slacktP(s, p, 'regnet'); continue; }
    if (ur(s, p.id, 3871) < chans(BRAND.brinnSkada, dtSec)) {
      const d = DELAR[Math.floor(ur(s, p.id, 3872) * DELAR.length)], g = BRAND.brinnGrad[0] + ur(s, p.id, 3873) * (BRAND.brinnGrad[1] - BRAND.brinnGrad[0]);
      count(s, 'brinner skadad');
      const dod = skada(s, p, d, 'brannskada', g, 'brand', 'när hen brann');
      if (dod) { die(s, p, dod); delete p.brinner; continue; }
    }
    const pl = paSig(s, p).filter(t => !SAKER[t.k]?.brinnerInte);
    if (pl.length && ur(s, p.id, 3874) < chans(BRAND.plaggBrinner, dtSec)) {
      const t = pl[Math.floor(ur(s, p.id, 3875) * pl.length)];
      s.ting = tingOf(s).filter(q => q !== t);
      count(s, 'brinner plagg');
      log(s, `${p.name}s ${SAKER[t.k]?.namn ?? t.k} brann upp.`, 'world', [p.id]);
    }
  }
}
// den som brinner släcker sig själv (Fara i val.ts, först): i vattnet om det är nära, annars kastar hen plagget eller rullar på marken
export function slackaSigVal(s: State, p: Person) {
  if (p.brinner === undefined) return;
  const vatten = naVattnet(s, p) ? drickPlats(s, p) : undefined;
  if (vatten && Math.hypot(vatten.x - p.x, vatten.y - p.y) <= BRAND.vattenR) return { act: 'slackaSig' as const, why: 'Brinner och springer i vattnet', spot: vatten, dur: 0.2 * MIN };
  const spot = { x: p.x, y: p.y };
  const pl = paSig(s, p).find(t => !SAKER[t.k]?.brinnerInte);
  if (pl) return { act: 'slackaSig' as const, why: `Brinner och sliter av sig ${SAKER[pl.k]?.namn ?? pl.k}`, spot, dur: 0.3 * MIN, ref: pl.id };
  return { act: 'slackaSig' as const, why: 'Brinner och rullar på marken', spot, dur: BRAND.rullMin * MIN };
}
// de som står nära den som brinner springer dit och släcker (Fara i val.ts, före att släcka branden i byn)
export function hjalpaVal(s: State, p: Person) {
  if (p.brinner !== undefined) return;
  let m: Person | undefined, md = Infinity;
  for (const q of living(s)) {
    if (q.brinner === undefined || q === p || !hjalpare(s, p, q)) continue;
    if (living(s).some(o => o !== p && o.task?.act === 'hjalpaBrinnande' && o.task.ref === q.id)) continue; // någon annan hjälper redan
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < md) { md = d; m = q; }
  }
  if (!m) return;
  const med = freeTools(s, p, 'vattensack') >= 1 ? 'vattensäcken' : `det ${han(p)} har`;
  return { act: 'hjalpaBrinnande' as const, why: `Släcker elden på ${m.name} med ${med}`, spot: { x: m.x, y: m.y }, dur: BRAND.hjalpMin * MIN, ref: m.id };
}
// klart (KLAR i steg.ts): den som brann är släckt; ett plagg som slets av ligger på marken
export function slackaSigKlar(s: State, p: Person, t: Task) {
  const pl = t.ref !== undefined ? tingOf(s).find(q => q.id === t.ref && q.bar === p.id) : undefined;
  if (pl) { delete pl.bar; const x = Math.floor(p.x), y = Math.floor(p.y); if (!nagotPa(s, x, y)) { pl.x = x; pl.y = y; } } // ligger något redan där får plagget en plats i förrådet (placeTools)
  slacktP(s, p, pl ? 'plagget' : t.why?.includes('vattnet') ? 'vattnet' : 'rullade');
}
export function hjalpaKlar(s: State, p: Person, t: Task) {
  const q = living(s).find(o => o.id === t.ref);
  if (q && q.brinner !== undefined && Math.hypot(q.x - p.x, q.y - p.y) <= 1.5) slacktP(s, q, 'hjälp');
}

// vad p gör åt branden: släcker (de vuxna när elden är nära byn), eller går undan (den som är nära elden)
type BrandMal = { act: 'slacka' | 'flyEld'; why: string; spot: { x: number; y: number }; dur: number; tool?: string; ref?: number };
// den brinnande ruta som någon redan släcker med händerna
const slacks = (s: State, i: number, utom: Person) => living(s).some(q => q !== utom && q.task?.act === 'slacka' && !q.task.tool && q.task.ref === i);
function brandMal(s: State, b: Brand, p: Person, hot: boolean): BrandMal | undefined {
  if (!kanGa(p) || !b.r.length) return;
  const n = narmast(b, p.x, p.y);
  if (hot && ageOf(p, s.now) >= ALDER.vuxen) {
    const mal = narmastByn(s, b); // det som brinner närmast byn först
    if (freeTools(s, p, 'vattensack') >= 1 && naVattnet(s, p)) {
      const spot = drickPlats(s, p);
      if (spot) return { act: 'slacka', why: 'Hämtar vatten i säcken till elden', spot, dur: BRAND.fyllMin * MIN, tool: 'vattensack', ref: mal };
    }
    const ut = bynsAvstand(s), m = narmast(b, p.x, p.y, i => slacks(s, i, p) || ut.at(i) > BRAND.hot); // bara det som brinner nära byn
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
// hur lätt den brinnande rutan i släcks (det svåraste som brinner där; 1 om inget finns kvar)
const latt = (s: State, i: number) => bransleAv(s)(i)?.[2] ?? 1;
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
  r[3] += BRAND.hand * latt(s, r[0]) * dtSec / HOUR_S;
  if (k[r[0]] === 1 && ur(s, p.id, 3864) < chans(BRAND.brannHand, dtSec)) {
    const DELAR: Kroppsdel[] = ['handV', 'handH', 'armV', 'armH'];
    const d = DELAR[Math.floor(ur(s, p.id, 3865) * DELAR.length)], g = BRAND.brannHandGrad[0] + ur(s, p.id, 3866) * (BRAND.brannHandGrad[1] - BRAND.brannHandGrad[0]);
    b.skadade++; count(s, 'brand skadad');
    const dod = skada(s, p, d, 'brannskada', g, 'brand', 'när hen släckte elden');
    if (dod) die(s, p, dod);
    else if (ur(s, p.id, 3876) < BRAND.tarEldHand) antand(s, p, 'när hen släckte');
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
    const sl = bransleAv(s);
    for (const q of nara.slice(0, BRAND.sackRutor)) q.r[3] = Math.min(1, q.r[3] + (sl(q.r[0])?.[2] ?? 1));
    if (nara.length) { count(s, 'brand sack'); wearUsed(s, p, 1); }
    slocknar(s, b);
  }
  p.task = undefined;
}

// det svarta efter elden: rutorna som brann och när (gränssnittet ritar dem mörka). Det gamla tas bort (timblocket i steg.ts)
export function askaSteg(s: State) {
  // de kolnade stammarna som fallit eller huggits glöms (steg 9.2.26), och det svarta ligger kvar där en stam står
  if (s.kolnad?.length) { const g = groundOf(s); s.kolnad = s.kolnad.filter(i => g.trees[i] >= 1 && (g.alder?.[i] ?? 0) >= TORR(g.art, i)); if (!s.kolnad.length) delete s.kolnad; }
  if (s.aska?.length && s.aska[0][1] < s.now - BRAND.svart * DAY) {
    const stam = new Set(s.kolnad ?? []);
    s.aska = s.aska.filter(a => a[1] >= s.now - BRAND.svart * DAY || stam.has(a[0]));
    if (!s.aska.length) delete s.aska;
  }
}
