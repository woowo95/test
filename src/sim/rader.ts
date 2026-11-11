// Räderna från grannklanerna (system 8.8), som bygger på rövarflocken (rovare.ts). En räd är en flock från en klan byn känner, med ett skäl: plundra,
// personlig hämnd eller heligt krig. Registret SKAL har en rad per skäl: när det gäller (`galler`), vikten i lottningen och vad flocken gör efter segern.
// Talen står i balansregistret RADER. Dörrarna mot anfallare (system 8.9) står här också.
import { DAY, MIN, Person, State, W } from './typer';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { ALDER, ageOf, alive, byId, count, isKin, living, log } from './folk';
import { kronika } from './historik';
import { notis } from './notiser';
import { Klan, klanById, klanerOf } from './klaner';
import { rikedom } from './varde';
import { Rovarflock, forsvaret, rovarnaKommer } from './rovare';
import { gastAv } from './gast';
import { andlighet, troende } from './religion';
import { larma } from './rykten';
import { die } from './liv';
import { amountOf, addTo, ownsAmount } from './lager';
import { SAKER, SAK_LIST } from './saker';
import { tingOf } from './agande';
import { grundvarde } from './varde';
import { vaderNu } from './vader';
import { Bit, bitsOf, housesOf, roomAt } from './byggnad';
import { DORRAR } from './byggnad';
import { tand } from './brand';

export const RADER = balans('rader', {
  rikedom: 500, // ingen räd förrän byns rikedom är över så här mycket
  forsvar: 0.2, // lockelsen är rikedomen minus så här stor del av försvaret
  chans: 0.01, // chansen per dygn, för varje 500 i lockelse och för varje klan som har ett skäl
  skyddDygn: 3, // chansen efter en räd stiger igen med den här tidskonstanten (ingen fast vila)
  per: 150, // en anfallare för varje så här mycket i rikedom
  viktPlundra: 1, viktHamnd: 0.2, viktHeligt: 0.1, // skälet lottas med vikter
  ifarten: 0.5, // chansen att den som flyr griper en sak i farten
  anhorig: 0.7, // chansen att en till tre av anfallarna i en hämndräd är anhöriga till den döde
  hamndSaker: 2, // bytet i hämnd och heligt krig, saker per anfallare
  hittaNara: 3, // hämnden: så nära (rutor) måste anfallarna komma för att hitta den de söker (steg 8.8.5)
  troTapp: 30, troNy: 40, utanTro: 50, // den som ger upp i ett heligt krig: tappar så mycket i tron, och får anfallarnas tro som en dragning
  skandad: 20, // de troende tappar så mycket när deras heliga plats skändas
  smitta: 0.1, // för varje bybo som gett upp sjunker de andras mod så här mycket
  overtygelse: 0.5, // i ett heligt krig läggs andligheten gånger tron till modet, upp till så här mycket
  storStrid: 4, // en räd med minst så här många anfallare är en stor strid, som stannar ikappräkningen (steg 8.8.9)
  krigiskFran: 70, // heligt krig: klanens tro står över så här åt Krigisk
  dorrMin: 20, dorrYxa: 8, dorrBom: 2, // så många minuter det tar att hugga sönder en stängd trädörr, med yxa, och gånger detta om den är bommad (steg 8.9.1)
  tandaMin: 30, tandaChans: 0.2, tandaInst: -60, // att tända ett hus (steg 8.9.3): tid, chans och hur illa klanen ska tycka om byn
});
export type RadSkal = 'plundra' | 'hamnd' | 'heligt';
const lockelse = (s: State) => rikedom(s) - RADER.forsvar * forsvaret(s);
const perPerson = (s: State) => rikedom(s) / Math.max(1, living(s).length);
const klanPerPerson = (k: Klan) => k.resurser * 50 / Math.max(1, k.folk);
// skälen (registret). galler = skälet gäller för klanen (steg 8.8.2, 8.8.4, 8.8.6)
const SKAL: Record<RadSkal, { vikt(): number; galler(s: State, k: Klan): boolean }> = {
  plundra: { vikt: () => RADER.viktPlundra, galler: (s, k) => klanPerPerson(k) < perPerson(s) / 2 },
  hamnd: { vikt: () => RADER.viktHamnd, galler: (s, k) => !!k.doda?.some(d => { const m = byId(s, d.av); return m && alive(m); }) },
  heligt: { vikt: () => RADER.viktHeligt, galler: (_s, k) => (k.krigisk ?? 0) > RADER.krigiskFran },
};
// en spridning kring 1 där det dubbla är ovanligt och det tredubbla sällsynt
const spridning = (s: State) => { const r = rnd(s, 'rovare'); return r < 0.04 ? 3 : r < 0.15 ? 2 : r < 0.3 ? 0.5 : 0.7 + rnd(s, 'rovare') * 0.6; };
// en gång per dygn (från rovarSteg)
export function radDygn(s: State, tvingaSkal?: RadSkal, tvingaKlan?: Klan) {
  const lock = lockelse(s);
  if (!tvingaSkal && (rikedom(s) < RADER.rikedom || s.rovare)) return;
  for (const k of tvingaKlan ? [tvingaKlan] : klanerOf(s)) {
    const skal = (Object.keys(SKAL) as RadSkal[]).filter(q => SKAL[q].galler(s, k));
    if (!skal.length && !tvingaSkal) continue;
    const skydd = k.radT === undefined ? 1 : 1 - Math.exp(-(s.now - k.radT) / (RADER.skyddDygn * DAY));
    if (!tvingaSkal && rnd(s, 'rovare') >= RADER.chans * lock / 500 * skydd) continue;
    const tot = skal.reduce((a, q) => a + SKAL[q].vikt(), 0); let x = rnd(s, 'rovare') * tot, val = skal[0] ?? 'plundra';
    for (const q of skal) { x -= SKAL[q].vikt(); if (x <= 0) { val = q; break; } }
    val = tvingaSkal ?? val;
    const n = clamp(Math.round(rikedom(s) / RADER.per * spridning(s)), 2, Math.max(2, k.styrka));
    const forra = s.rovare;
    rovarnaKommer(s, n, false, k.id);
    const f = forra ? s.rovareFler![s.rovareFler!.length - 1] : s.rovare!; // fanns redan en flock väntar den nya bland flockarna (steg 8.7.18)
    f.skal = val; f.rad = true; k.radT = s.now;
    if (val === 'hamnd') hamndForbered(s, f, k);
    count(s, 'rad'); count(s, 'rad_' + val);
    const text = { plundra: `${k.namn} kommer för att plundra byn.`, hamnd: `${k.namn} kommer för att hämnas.`, heligt: `${k.namn} kommer i sin guds namn.` }[val];
    log(s, text, 'world'); notis(s, 'anfall', text, []);
    return;
  }
}
// personlig hämnd (steg 8.8.4): klanen minns sina döda med namn, och en till tre av anfallarna är anhöriga, med högst mod
function hamndForbered(s: State, f: Rovarflock, k: Klan) {
  const d = k.doda!.find(q => { const m = byId(s, q.av); return m && alive(m); })!;
  f.mal = d.av;
  if (rnd(s, 'rovare') >= RADER.anhorig) return;
  const n = 1 + Math.floor(rnd(s, 'rovare') * 3), rel = ['syskon', 'barn', 'förälder'];
  f.folk.slice(0, n).forEach((id, i) => { const r = gastAv(s, id); if (!r) return; r.pot.mod = 20; r.gast!.anhorig = `${rel[i % 3]} till ${d.namn}, som ${byId(s, d.av)?.name} dödade`; });
}
// klanen minns den döde och vem som dödade (från stridSlut i rovare.ts)
export function klanMinns(s: State, f: Rovarflock, r: Person, av: number | undefined) {
  const k = klanById(s, f.klan);
  if (!k) return;
  k.styrka = Math.max(0, k.styrka - 1); k.folk = Math.max(1, k.folk - 1);
  if (av !== undefined) (k.doda ??= []).push({ namn: r.name, av, t: s.now });
  if (f.mal !== undefined) { const m = byId(s, f.mal); if (!m || !alive(m)) k.doda = k.doda?.filter(q => q.av !== f.mal); }
}
// flocken vann (steg 8.8.2, 8.8.5, 8.8.7): plundringen tar så mycket de bär, hämnden och det heliga kriget högst två saker per anfallare
export function radSeger(s: State, f: Rovarflock): boolean {
  const k = klanById(s, f.klan);
  if (f.skal === 'hamnd') {
    const m = byId(s, f.mal);
    if (m && alive(m) && Math.hypot(m.x - f.x, m.y - f.y) > RADER.hittaNara) { if (f.letat) f.gor = 'letar'; else borjaLeta(s, f, m); return true; } // hen är inte här: hus för hus
    hamndKlar(s, f, m, true);
    return true;
  }
  if (f.skal === 'heligt') { riverHeligt(s, k); taMedSaker(s, f); return true; }
  return false;
}
// hämndens gång (steg 8.8.5): är den de söker inte på slagfältet letar flocken hus för hus, närmast först (letaSteg i rovare.ts)
export function borjaLeta(s: State, f: Rovarflock, m: Person) {
  f.letar = housesOf(s).filter(h => h.klar).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y)).map(h => h.id);
  f.gor = 'letar'; f.letat = true; count(s, 'hamnd_letar');
  log(s, `${gastAv(s, f.folk[0] ?? 0)?.name ?? 'Anfallarna'} letar efter ${m.name}, hus för hus.`, 'world', [m.id]);
}
// hämnden är klar: den de sökte dör om de hittade hen, och de tar med sig högst två saker var, ur hens och familjens först
export function hamndKlar(s: State, f: Rovarflock, m: Person | undefined, hittad: boolean) {
  const k = klanById(s, f.klan);
  if (m && alive(m) && hittad) { count(s, 'hamnd_doda'); log(s, `${gastAv(s, f.folk[0] ?? 0)?.name ?? 'Anfallarna'} hittade ${m.name} och hämnades.`, 'world', [m.id]); die(s, m, 'rovare'); }
  else if (m && alive(m)) { count(s, 'hamnd_miste'); log(s, `${gastAv(s, f.folk[0] ?? 0)?.name ?? 'Anfallarna'} hittade inte ${m.name} och gav sig av.`, 'world', [m.id]); }
  if (k && (!m || !alive(m))) k.doda = k.doda?.filter(q => q.av !== f.mal); // klanen glömmer den döde när hämnden är tagen
  taMedSaker(s, f, m);
}
function taMedSaker(s: State, f: Rovarflock, m?: Person) {
  const familj = m ? living(s).filter(p => isKin(p, m) || p.partner === m.id) : [];
  for (const r of f.folk.map(id => gastAv(s, id)).filter(q => !!q) as Person[]) {
    let n = RADER.hamndSaker;
    for (const k of SAK_LIST.filter(q => !SAKER[q]!.redskap).sort((a, b) => grundvarde(b) - grundvarde(a))) {
      while (n > 0 && amountOf(s, k) >= 1 && (familj.length === 0 || familj.some(p => ownsAmount(s, p, k) >= 1) || n === 1)) { addTo(s, k, -1); (r.gast!.bar ??= {})[k] = (r.gast!.bar![k] ?? 0) + 1; n--; }
      if (n <= 0) break;
    }
  }
}
// heligt krig river det heliga (steg 8.8.7): hovet rivs till rester, heliga platser märks som skändade och de troende tappar i tro
function riverHeligt(s: State, k: Klan | undefined) {
  count(s, 'heligt_krig');
  for (const tr of s.tron ?? []) {
    if (tr.hov) { tr.hov = undefined; log(s, `${k?.namn ?? 'Anfallarna'} rev hovet.`, 'world'); kronika(s, `${k?.namn ?? 'Anfallarna'} rev hovet.`, 'rovare'); }
    tr.gudabild = undefined;
    for (const p of troende(s, tr)) p.troStyrka = Math.max(0, (p.troStyrka ?? 0) - RADER.skandad);
  }
  for (const h of s.heliga ?? []) h.skandad = s.now;
}
// den som ger upp i ett heligt krig svär trohet till anfallarnas gud (steg 8.8.6, 8.8.8)
export function svarTrohet(s: State, f: Rovarflock, p: Person) {
  if (f.skal !== 'heligt') return;
  const k = klanById(s, f.klan);
  count(s, 'svurit');
  if (p.tro === undefined) { p.drag = { namn: k?.namn ?? 'anfallarna', v: RADER.utanTro, t: s.now }; }
  else { p.troStyrka = Math.max(0, (p.troStyrka ?? 0) - RADER.troTapp); p.drag = { namn: k?.namn ?? 'anfallarna', v: RADER.troNy, t: s.now }; if (RADER.troNy > (p.troStyrka ?? 0)) { p.tro = undefined; count(s, 'svurit_bytt'); } }
  log(s, `${p.name} svor trohet till ${k?.namn ?? 'anfallarnas'} gud.`, 'rel', [p.id]);
}
// övertygelsen (steg 8.8.8): i ett heligt krig håller andligheten och trons styrka emot, så att den mest övertygade hellre faller än svär
export const overtygelse = (s: State, f: Rovarflock, p: Person) => f.skal !== 'heligt' ? 0 : RADER.overtygelse * andlighet(s, p) / 100 * (p.troStyrka ?? 0) / 100;
// saker i farten (steg 8.8.3): den som flyr griper en sak hen passerar om ingen försvarare är nära
export function iFarten(s: State, r: Person) {
  if (r.gast!.bar || rnd(s, 'rovare') >= RADER.ifarten) return;
  const a = (s.stackar ?? []).find(q => Math.hypot(q.x - r.x, q.y - r.y) <= 1 && q.n >= 1 && !living(s).some(p => ageOf(p, s.now) >= ALDER.vuxen && Math.hypot(p.x - q.x, p.y - q.y) <= 2));
  if (a) { addTo(s, a.k, -1); r.gast!.bar = { [a.k]: 1 }; count(s, 'ifarten'); }
}
// ---------- dörrarna mot anfallare (system 8.9) ----------
// plundrare går hellre till ett öppet hus eller förrådet (steg 8.9.2): en stängd trädörr huggs bara sönder om inget annat finns att ta, eller av den
// som vill döda någon. Det tar tid, fortare med yxa och långsammare om den är bommad, och det larmar byn
const stangdDorrBit = (s: State) => bitsOf(s).find(b => b.dorr && (DORRAR as Record<string, { stanger?: boolean }>)[b.dorr]?.stanger);
// en dörr är bommad när någon är inne i huset (steg 8.9.1): de som är inne bommar den. Att hålla emot dörren kommer i 11.4.18
export const bommad = (s: State, b: Bit) => b.hus !== undefined && living(s).some(q => roomAt(s, q.x, q.y)?.hus === b.hus);
// mal = dörren till huset där den de söker är (hämnden, letaSteg i rovare.ts); annars en stängd dörr när det inte finns något ute
export function huggDorr(s: State, f: Rovarflock, folk: Person[], mal?: Bit) {
  const d = f.hugger;
  if (d) {
    if (s.now < d.till) return true;
    const b = bitsOf(s).find(q => q.id === d.bit);
    if (b) { b.dorr = undefined; count(s, 'dorr_sonder'); log(s, 'Anfallarna högg sönder en dörr.', 'world'); }
    f.hugger = undefined;
    return false;
  }
  const vill = !!mal || f.skal === 'hamnd' || !SAK_LIST.some(k => SAKER[k]!.redskap ? tingOf(s).some(q => q.k === k && q.bar === undefined && q.hos === undefined && q.lass === undefined) : amountOf(s, k) >= 1); // inget ute att ta
  if (!vill) return false;
  const b = mal ?? stangdDorrBit(s);
  if (!b) return false;
  const yxa = f.folk.some(id => (s.gastTing ?? []).some(t => t.agare === id && t.k === 'yxa')) /* en yxa bland det de bär (steg 10.1.8) */, bom = bommad(s, b) ? RADER.dorrBom : 1;
  f.hugger = { bit: b.id, till: s.now + (yxa ? RADER.dorrYxa : RADER.dorrMin) * bom * MIN };
  count(s, bom > 1 ? 'dorr_bommad' : 'dorr_hugg');
  larma(s, 'rovare', f.folk.length, folk.slice(0, 1));
  return true;
}
// att tända ett hus (steg 8.9.3): det tar tid, går inte i regn och görs bara för att utrota byn eller av de blodtörstiga
export function tandaHus(s: State, f: Rovarflock) {
  const k = klanById(s, f.klan);
  if (!k || k.inst > RADER.tandaInst || vaderNu(s).lage === 'regn' || f.tant || rnd(s, 'rovare') >= RADER.tandaChans) return;
  const h = housesOf(s).find(q => q.klar);
  if (!h) return;
  f.tant = true; count(s, 'hus_tant');
  log(s, `Anfallarna tände eld på ${h.namn.toLowerCase()}.`, 'world'); kronika(s, `Anfallarna tände eld på ${h.namn.toLowerCase()}.`, 'rovare');
  tand(s, h.y * W + h.x, 'rovare' as never, 1);
}
export const storRad = (f: Rovarflock | undefined) => !!f?.rad && f.folk.length >= RADER.storStrid;
// pågår en stor strid med någon av flockarna (steg 8.8.9): den stannar ikappräkningen
export const storStridNu = (s: State) => [s.rovare, ...(s.rovareFler ?? [])].some(f => storRad(f) && f!.gor === 'slass');
