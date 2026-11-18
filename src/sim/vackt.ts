// ---------- den väckta byn (fas 11.13, Flera samhällen: Den väckta byn i tal) ----------
// En by i världen som huvudbyns sällskap besöker väcks: byn byggs direkt ur radens tal av registret BYGGARE, där varje rad lägger
// en del av byn på plats, i registrets ordning. Allt dras ur byns frö och radens tal som de är när väckningen börjar, så att
// samma rad alltid ger samma by. Den väckta byn går sedan i samma slag som huvudbyn (s.vackta, steg 11.13.1)
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, familjOf, living, newPerson, startSkills } from './folk';
import { BYGGNADER, Fn, HUS, homeless } from './byggnader';
import { delarIRad, fyllPlatser, STATIONER, StationDef, StationSlag, stationSite, storlek } from './stationer';
import { knows } from './teknik';
import { nyKvalitet } from './kvalitet';
import { nyEld } from './brasor';
import { grundvarde } from './varde';
import { planeraHus } from './byggplan';
import { bitsOf, housesOf, Hus, MATERIAL, touch } from './byggnad';
import { workOn } from './bygg';
import { groundOf } from './mark';
import { kronaOver } from './skog';
import { changed, put } from './lager';
import { W } from './typer';
import { ACTS } from './handlingar';
import { TEK } from './teknik';
import { clamp } from './slump';
import { byPlats } from './landmarken';
import { radNr, VarldRad } from './radtal';
import { startSmak } from './rykten';
import { newSeder, sederTarget } from './seder';
import { rnd } from './slump';
import { stepDelning } from './delning';
import { DAY, Person, State, useMap } from './typer';
import { pair, tomBy } from './varld';
import { varldMark } from './varlden';
import { MARK_IDS } from './varldmark';
import { KARTA } from './kartflytt';

export const VACKT = balans('vackt', {
  inkorning: 6, // timmar i verkligheten som byn går i simuleringen före ankomsten (ett kvarts år i spelet), steg 11.13.8
  parFran: 19, parTill: 52, // de vuxnas åldrar i ett hushåll (år i spelet)
  barnMax: 4, // så många barn som mest i ett hushåll
  modersAlder: 17, // modern är minst så mycket äldre än barnet
  ensam: 0.15, // chansen att ett hushåll är en ensam äldre
  aldreFran: 50, aldreTill: 72, // den ensammas ålder
  kunskap: 0.7, // chansen att en vuxen kan en teknik på nivå 1; varje nivå högre gånger detta igen (steg 11.13.4)
  lar: 6, larVuxen: 20, // åldern då man börjar kunna tekniker och då man kan dem som en vuxen
  stationer: 0.4, // stationerna och möblerna kostar högst så stor del av radens rikedom, i grundvärdet av materialet (steg 11.13.6)
});

// en byggare lägger en del av byn på plats: b = den väckta byn, s = huvudbyn, r = raden
export interface Byggare { namn: string; bygg: (b: State, s: State, r: VarldRad) => void }
export const BYGGARE: Byggare[] = [
  { namn: 'folket', bygg: (b, _s, r) => byggFolk(b, r) }, // radens antal, med åldrar, kön och släkt
  { namn: 'kunskapen', bygg: (b, _s, r) => byggKunskap(b, r) }, // radens tekniker spridda på folket (steg 11.13.4)
  { namn: 'husen', bygg: (b, _s, r) => byggHus(b, r) }, // de gemensamma husen, stationerna och möblerna (steg 11.13.6)
  { namn: 'hemmen', bygg: b => byggHem(b) }, // ett hem per hushåll runt det som redan står (steg 11.13.5)
];

// byns frö: ur huvudbyns frö och radens nummer, så att samma rad alltid får samma karta
export const vacktFro = (s: State, nr: number) => ((s.seed * 7919 + nr * 104729) % 2147483646) + 1;

// den tomma byn: marken ur byns frö och världsrutans marksort
export function vacktGrund(s: State, r: VarldRad): State {
  const vl = s.varld, v = varldMark(s), p = vl && byPlats(vl, r.nr);
  const mark = v && p ? MARK_IDS[v.mark[p.y * v.w + p.x]] : undefined;
  const b = tomBy(vacktFro(s, r.nr), r.grundad, s.now, { W: KARTA.bredd, H: KARTA.hojd }, { varld: vl, vackt: r.nr, ...(mark && mark !== 'hav' && mark !== 'sjo' ? { varldmark: mark } : {}) });
  b.seder = newSeder();
  return b;
}
// väck raden nr: byn byggs med alla rader i BYGGARE
export function vackBy(s: State, nr: number): State | undefined {
  const r = s.varld && radNr(s.varld, nr);
  if (!r) return undefined;
  const b = vacktGrund(s, r);
  for (const g of BYGGARE) { useMap(b); g.bygg(b, s, r); }
  useMap(b);
  b.seder.v = sederTarget(b);
  stepDelning(b);
  useMap(s);
  return b;
}

const mellan = (b: State, fran: number, till: number) => fran + rnd(b, 'vackt') * (till - fran);
const fodd = (b: State, alder: number) => b.now - alder * DAY;
// folket: hushåll efter hushåll tills raden är full. Ett hushåll är ett par med barn, eller ibland en ensam äldre
export function byggFolk(b: State, r: VarldRad) {
  const n = Math.max(1, Math.round(r.tal.folk));
  const ny = (sex: 'm' | 'k', alder: number, mor?: Person, far?: Person) => { const p = newPerson(b, sex, fodd(b, alder), mor, far); b.people.push(p); return p; };
  while (b.people.length < n) {
    const kvar = n - b.people.length;
    if (kvar === 1 || rnd(b, 'vackt') < VACKT.ensam) { ny(rnd(b, 'vackt') < 0.5 ? 'm' : 'k', mellan(b, VACKT.aldreFran, VACKT.aldreTill)); continue; }
    const ka = mellan(b, VACKT.parFran, VACKT.parTill), ma = Math.max(VACKT.parFran, ka + mellan(b, -3, 6));
    const k = ny('k', ka), m = ny('m', ma);
    pair(b, k, m, true);
    const barn = Math.min(n - b.people.length, Math.floor(rnd(b, 'vackt') * (VACKT.barnMax + 1)), Math.max(0, Math.floor(ka - VACKT.modersAlder)));
    for (let i = 0; i < barn; i++) ny(rnd(b, 'vackt') < 0.5 ? 'm' : 'k', mellan(b, 0, ka - VACKT.modersAlder), k, m);
  }
  for (const p of b.people) { startSkills(b, p, ageOf(p, b.now)); startSmak(b, p); }
}

// kunskapen: varje teknik i raden kan en del av folket, fler ju lägre nivån och ju äldre man är, som i en by där man lärt av
// varandra. Den äldsta vuxna som fått flest tekniker kan den om ingen annan gör det, så att byn inte glömt något. Den som kan en
// teknik har färdigheten i arbetet där man kommer på den efter sin ålder, som de andra färdigheterna (startSkills)
export function byggKunskap(b: State, r: VarldRad) {
  const folk = b.people, alder = new Map(folk.map(p => [p.id, ageOf(p, b.now)]));
  const vuxen = (p: Person) => clamp((alder.get(p.id)! - VACKT.lar) / (VACKT.larVuxen - VACKT.lar), 0, 1);
  const tekn = r.tek.filter(id => TEK[id]).sort((a, c) => TEK[a].niva - TEK[c].niva || (a < c ? -1 : 1));
  for (const id of tekn) {
    const chans = VACKT.kunskap ** (TEK[id].niva - 1);
    let kan = 0;
    for (const p of folk) if (rnd(b, 'vackt') < chans * vuxen(p) && TEK[id].krav.every(k => (p.tek?.[k] ?? 0) >= 1)) { (p.tek ??= {})[id] = 1; kan++; }
    if (kan) continue;
    const vem = folk.filter(p => vuxen(p) >= 1).sort((a, c) => Object.keys(c.tek ?? {}).length - Object.keys(a.tek ?? {}).length || alder.get(c.id)! - alder.get(a.id)!)[0] ?? folk[0];
    if (vem) { vem.tek ??= {}; for (const k of [...TEK[id].krav, id]) vem.tek[k] = 1; }
  }
  for (const p of folk) {
    const a = alder.get(p.id)!;
    for (const id in p.tek ?? {}) for (const act of TEK[id]?.omr ?? []) {
      const k = ACTS[act]?.arbete;
      if (k) p.skill[k] = Math.max(p.skill[k] ?? 0, clamp((a - ALDER.skickFran) * 0.25 * (0.4 + rnd(b, 'vackt')) * (p.pot.intelligens / 12), 0, 12));
    }
  }
}

// ett planerat hus byggs färdigt på en gång: träden och stubbarna på platsen är borta, alla delar är klara, och den sista byggs
// av en bybo som vanligt (workOn), så att huset blir färdigt som andra hus
export function byggFardigt(b: State, h: Hus) {
  const bs = bitsOf(b).filter(q => q.hus === h.id), p = living(b)[0];
  if (!bs.length || !p) return;
  const g = groundOf(b);
  for (const i of kronaOver(b, h)) g.trees[i] = 0;
  for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) g.trees[y * W + x] = 0;
  b.stubbar = b.stubbar?.filter(k => !(k.x >= h.x && k.y >= h.y && k.x < h.x + h.w && k.y < h.y + h.h));
  for (const q of bs) { q.mat = MATERIAL[q.m]?.n ?? 0; q.b = q === bs[bs.length - 1] ? 0.999 : 1; }
  touch(b);
  workOn(b, p, bs[bs.length - 1], 3600);
  const inne = (b.stackar ?? []).filter(a => a.x >= h.x && a.y >= h.y && a.x < h.x + h.w && a.y < h.y + h.h);
  b.stackar = (b.stackar ?? []).filter(a => !inne.includes(a));
  for (const a of inne) put(b, a.k, a.n, a.ag, a.c);
  changed(b); h.barUt = undefined; touch(b);
}
// hemmen: som i en riktig by har en familj (ett par med minst HUS.familjMin) ett eget familjehus, och alla andra sover i byns
// sovsalar. Husen är av det material teknikerna ger, som när byn bygger själv (planeraHus i byggplan.ts). Utan väggar att bygga
// med (timmerväggen) finns inga hus, som i en by som inte kommit så långt
export function byggHem(b: State) {
  if (!b.people.some(p => (p.tek?.timmervagg ?? 0) >= 1)) return;
  for (const o of [...b.people].sort((a, c) => a.id - c.id)) {
    const pa = byId(b, o.partner);
    if (!pa || !alive(pa) || pa.id < o.id) continue;
    const folk = familjOf(b, o.id);
    if (folk.length < HUS.familjMin || housesOf(b).some(h => h.ag === o.id || h.ag === pa.id)) continue;
    const h = planeraHus(b, 'familjehus', { v: 1, plats: folk.length, ag: o.id });
    if (h) byggFardigt(b, h);
  }
  sovsalar(b);
}
// sovsalar tills alla har en sovplats under tak, och familjehus som byggs ut när familjen inte ryms (BYGGNADER.familjehus)
function sovsalar(b: State) {
  if (!b.people.some(p => (p.tek?.timmervagg ?? 0) >= 1)) return;
  for (let n = 0; n < 20; n++) {
    const f = BYGGNADER.familjehus.akut(b), u = homeless(b);
    const h = f.v > 0 && f.hus !== undefined ? planeraHus(b, 'familjehus', f) : u > 0 ? planeraHus(b, 'sovsal', { v: 1, plats: u }) : undefined;
    if (!h) break;
    byggFardigt(b, h);
  }
}

// de gemensamma husen och stationerna: varje station och möbel som någon i byn kan bygga står där en gång, den billigaste först,
// tills materialet i dem är VACKT.stationer av radens rikedom. En station som står inne och inte får plats i något hus får en
// verkstad, som när byn bygger själv (BYGGNADER.verkstad). Sedan byggs de gemensamma hus som byn vill ha efter det som står
// (samlingshuset när scenen finns), med samma behov som i en by som bygger själv. Hemmen byggs efter, runt det som redan står. Det någon äger (kistor, pynt, bäddar),
// djurens stationer och trons möbler hör till senare byggare
const GEMENSAMMA: Fn[] = ['samling', 'torkhus', 'vedbod'];
const kostnad = (d: StationDef) => Object.entries(d.av).reduce((a, [m, n]) => a + n * grundvarde(m), 0);
const gemensam = (d: StationDef) => !d.tro && !d.brasa && !d.vrak && !d.hage && !d.fahus && !d.sover && !d.golv && !d.pynt && !d.enda && !d.forvar?.privat;
export function byggHus(b: State, r: VarldRad) {
  let kvar = r.tal.rikedom * VACKT.stationer;
  const slag = (Object.keys(STATIONER) as StationSlag[]).filter(k => gemensam(STATIONER[k])).sort((a, c) => kostnad(STATIONER[a]) - kostnad(STATIONER[c]) || (a < c ? -1 : 1));
  for (const k of slag) {
    const d: StationDef = STATIONER[k], kr = kostnad(d);
    const p = b.people.filter(q => d.tek.some(t => knows(q, t))).sort((a, c) => a.id - c.id)[0];
    if (!p || kr > kvar) continue;
    let at = stationSite(b, k, p);
    if (!at && d.inne && b.people.some(q => (q.tek?.timmervagg ?? 0) >= 1)) { // en verkstad åt den
      const { w, h } = storlek(k), hus = planeraHus(b, 'verkstad', { v: HUS.verkstadAkut, plats: w * (h + 1) + HUS.verkstadExtra });
      if (hus) { byggFardigt(b, hus); at = stationSite(b, k, p); }
    }
    if (!at) continue;
    stallStation(b, p, k, at);
    kvar -= kr;
  }
  for (const fn of GEMENSAMMA) {
    const a = BYGGNADER[fn].akut(b);
    if (a.v <= 0) continue;
    const h = planeraHus(b, fn, a);
    if (h) byggFardigt(b, h);
  }
  fyllPlatser(b);
}
// stationen står färdig på platsen at, byggd av p: som när den byggs i byn (startStation och finishStation i stationer.ts)
function stallStation(b: State, p: Person, k: StationSlag, at: { x: number; y: number; rot?: 1 }) {
  const d: StationDef = STATIONER[k];
  const t: State['stationer'] extends (infer U)[] | undefined ? U : never = { id: b.nextStation = (b.nextStation ?? 0) + 1, k, x: at.x, y: at.y, kvar: 0, klar: b.now };
  if (at.rot) t.rot = 1;
  if ('inne' in at) t.inne = 1;
  const delar = delarIRad(k, at.x, at.y, at.rot); if (delar) t.delar = delar;
  if (d.agd) t.ag = p.id;
  (b.stationer ??= []).push(t);
  if (d.hard) { nyEld(b, t); const f = (b.eldar ?? []).find(q => q.id === t.id); if (f) { f.hearth = 'hard'; f.ring = undefined; } }
  if (d.mobel) nyKvalitet(b, p, t, 0, d.namn.toLowerCase());
  b.byggV = (b.byggV ?? 0) + 1;
  touch(b);
}
