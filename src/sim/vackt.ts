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
import { grundvarde, rikedomDelar } from './varde';
import { radVaror, sakerIGrupp, VARUGRUPP_IDS, VarugruppId } from './priser';
import { isFood, SAKER } from './saker';
import { ar_vatska } from './vatskor';
import { isStored, laggIn, lagerNy, lagerStorre, stacksOf } from './lager';
import { newTing } from './agande';
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
import { lasRad, radNr, VarldRad } from './radtal';
import { startSmak } from './rykten';
import { newSeder, sederTarget } from './seder';
import { rnd } from './slump';
import { stepDelning } from './delning';
import { DAY, HOUR, Person, State, useMap } from './typer';
import { byggLiven } from './vacktliv';
import { byggRelationer } from './vacktrel';
import { byggKronika } from './vacktkronika';
import { count } from './folk';
import { KOHANDELSER, laggIKo, PERIODRADER } from './varldslag';
import { lever } from './rad';
import { sallskapNu, vackKrok } from './resa';
import { pair, tomBy } from './varld';
import { varldMark } from './varlden';
import { MARK_IDS } from './varldmark';
import { KARTA } from './kartflytt';
import { byggMinne, somna } from './vacktsomna';
import { byggFasta } from './vacktfasta';
import { larOrt, ORT, O_BESOKT, O_KANT, radKanner } from './ort';
import { varldPlatsNr } from './landmarken';

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
  ort: 0.6, // chansen att en vuxen minns en plats byn känner (steg 11.13.15) ...
  ortBesokt: 0.3, // ... och att den som minns en plats byn besökt själv varit där; annars känner hen den
});

// en byggare lägger en del av byn på plats: b = den väckta byn, s = huvudbyn, r = raden
export interface Byggare { namn: string; bygg: (b: State, s: State, r: VarldRad) => void }
export const BYGGARE: Byggare[] = [
  { namn: 'de fasta', bygg: (b, _s, r) => byggFasta(b, r) }, // de huvudbyn känner och radens fasta personer först (steg 11.13.13)
  { namn: 'folket', bygg: (b, _s, r) => byggFolk(b, r) }, // radens antal, med åldrar, kön och släkt
  { namn: 'kunskapen', bygg: (b, _s, r) => byggKunskap(b, r) }, // radens tekniker spridda på folket (steg 11.13.4)
  { namn: 'platserna', bygg: (b, _s, r) => byggPlatser(b, r) }, // det byn vet om platserna i världen, spritt på de vuxna (steg 11.13.15)
  { namn: 'minnet', bygg: (b, _s, r) => byggMinne(b, r.minne, byggFardigt) }, // husen, gravarna och de heliga platserna från förra besöket (steg 11.13.12)
  { namn: 'husen', bygg: (b, _s, r) => byggHus(b, r) }, // de gemensamma husen, stationerna och möblerna (steg 11.13.6)
  { namn: 'hemmen', bygg: b => byggHem(b) }, // ett hem per hushåll runt det som redan står (steg 11.13.5)
  { namn: 'förråden', bygg: (b, _s, r) => byggForrad(b, r) }, // radens mat och rikedom i hela saker, hos ägare (steg 11.13.7)
  { namn: 'relationerna', bygg: (b, _s, r) => byggRelationer(b, r) }, // vänner, ovänner och par som i en by i samma ålder (steg 11.13.18)
  { namn: 'liven', bygg: (b, _s, r) => byggLiven(b, r) }, // ett liv bakåt för var och en, med den riktiga släkten och de dödas gravar (steg 11.13.16)
  { namn: 'krönikan', bygg: (b, _s, r) => byggKronika(b, r) }, // byns krönika bakåt ur världens krönika och folkets liv (steg 11.13.17)
];

// byns frö: ur huvudbyns frö och radens nummer, så att samma rad alltid får samma karta
export const vacktFro = (s: State, nr: number) => ((s.seed * 7919 + nr * 104729) % 2147483646) + 1;

// den tomma byn: marken ur byns frö och världsrutans marksort
export function vacktGrund(s: State, r: VarldRad, now = s.now): State {
  const vl = s.varld, v = varldMark(s), p = vl && byPlats(vl, r.nr);
  const mark = v && p ? MARK_IDS[v.mark[p.y * v.w + p.x]] : undefined;
  const b = tomBy(vacktFro(s, r.nr), r.grundad, now, { W: KARTA.bredd, H: KARTA.hojd }, { varld: vl, vackt: r.nr, ...(mark && mark !== 'hav' && mark !== 'sjo' ? { varldmark: mark } : {}) });
  b.seder = newSeder();
  return b;
}
// väck raden nr: byn byggs med alla rader i BYGGARE
export function vackBy(s: State, nr: number): State | undefined {
  const r = s.varld && radNr(s.varld, nr);
  if (!r) return undefined;
  const b = vacktGrund(s, r);
  b.vackRad = JSON.parse(JSON.stringify(r));
  for (const g of BYGGARE) { useMap(b); g.bygg(b, s, r); }
  vackKlar(s, b);
  return b;
}
// byn är byggd: sederna och delningen räknas, och byn går i slagen
function vackKlar(s: State, b: State) {
  useMap(b);
  b.seder.v = sederTarget(b);
  stepDelning(b);
  b.vackFore = lasRad(b); // det byn ändrar från och med nu läggs till raden när den somnar (steg 11.13.12)
  delete b.vackI;
  useMap(s);
}

// byn går i slagen: raden står still för sina regler medan byn lever (steg 11.13.12)
function vaknar(s: State, b: State) { const r = s.varld && radNr(s.varld, b.vackt); if (r) r.vaken = 1; }
// ---------- väckningen i skeden (steg 11.13.8) ----------
// När ett sällskap ger sig av mot en by i världen börjar byn väckas: radens tal fryses (en kopia i byn), och varje rad i BYGGARE
// räknas vid en känd tid under resan, jämnt fördelade från avfärden till starten. Starten är den väntade ankomsten (vägens dygn,
// vagDygn) minus inkörningen (VACKT.inkorning), eller avfärden om resan är kortare. Sedan går byn i slagen med huvudbyn, så att
// den har levt en stund när sällskapet kommer. Tiderna ligger i världens kö, så levande läge och ikappräkning ger samma by
export function borjaVacka(s: State, nr: number, t0: number, dygn: number) {
  const vl = s.varld, r = vl && radNr(vl, nr);
  if (!vl || !r || r.nr === vl.huvud || r.sort !== 'by' || !lever(vl, r) || r.tal.folk < 1 || s.vackta?.some(b => b.vackt === nr)) return undefined;
  const start = Math.max(t0, t0 + dygn * DAY - VACKT.inkorning * HOUR);
  const b = vacktGrund(s, r, start);
  b.vackI = 0; b.vackRad = JSON.parse(JSON.stringify(r));
  (s.vackta ??= []).push(b);
  useMap(s);
  BYGGARE.forEach((_, i) => laggIKo(vl, Math.round(t0 + (start - t0) * (i + 1) / BYGGARE.length), 'vackSteg', { sak: nr, data: { i } }));
  count(s, 'vackning_borjad');
  return b;
}
KOHANDELSER.vackSteg = (s, _vl, p) => {
  const b = s.vackta?.find(x => x.vackt === p.sak && x.vackI === p.data?.i);
  if (!b || !b.vackRad) return;
  useMap(b);
  BYGGARE[b.vackI!].bygg(b, s, b.vackRad);
  b.vackI!++;
  if (b.vackI! >= BYGGARE.length) { vackKlar(s, b); vaknar(s, b); count(s, 'vackt'); }
  useMap(s);
};
// en väckt by somnar när inget sällskap längre är på väg dit eller där, och det byn ändrat skrivs till raden (somna i vacktsomna.ts)
export function vacktSomna(s: State) {
  const vl = s.varld;
  if (!vl || !s.vackta?.length) return;
  const mal = new Set(sallskapNu(vl).filter(sl => sl.skede !== 'hemat').map(sl => vl.platser?.find(q => q.nr === sl.mal)?.by));
  const fore = s.vackta.length;
  for (const b of s.vackta) if (!(b.vackt === undefined || mal.has(b.vackt) || b.vackHall)) somna(s, b);
  s.vackta = s.vackta.filter(b => b.vackt === undefined || mal.has(b.vackt) || b.vackHall);
  if (s.vackta.length < fore) count(s, 'vackt_somnat', fore - s.vackta.length);
  if (!s.vackta.length) delete s.vackta;
}
vackKrok.borja = borjaVacka;
PERIODRADER.push({ namn: 'väckta byar som somnar', period: 'timme', fn: s => vacktSomna(s) });
// testknappen: raden nr väcks genast och går i slagen med huvudbyn tills den somnar av sig själv eller testknappen trycks igen
export function vackTest(s: State, nr: number) {
  if (s.vackta?.some(b => b.vackt === nr)) { for (const b of s.vackta.filter(x => x.vackt === nr)) somna(s, b); s.vackta = s.vackta.filter(b => b.vackt !== nr); if (!s.vackta.length) delete s.vackta; return undefined; }
  const b = vackBy(s, nr);
  if (b) { b.vackHall = 1; (s.vackta ??= []).push(b); vaknar(s, b); }
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
  for (const p of b.people) if (!p.fastRoll || !Object.values(p.skill).some(v => v > 0)) { startSkills(b, p, ageOf(p, b.now)); startSmak(b, p); } // (den som kom med hela sin person kan redan det hen kan)
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

// platserna: varje vuxen minns en plats byn känner (radKanner i ort.ts) med chansen VACKT.ort, på radens nivå, utom att bara en
// del av dem som minns en plats byn besökt själva varit där (VACKT.ortBesokt). Uppgifterna är från i dag, säkra som en gästs
// (ORT.gastKant och gastRykte). Byns egen plats och närområdet känner alla ändå (kannerOrt). Så kan de berätta om världen
export function byggPlatser(b: State, r: VarldRad) {
  const vl = b.varld, egen = vl && byPlats(vl, r.nr);
  if (!vl || !egen) return;
  const nr = new Set<number>(r.besokt ?? []);
  for (const x of egen.grannar ?? []) { nr.add(x.nr); for (const y of varldPlatsNr(vl, x.nr)?.grannar ?? []) nr.add(y.nr); }
  nr.delete(egen.nr);
  const platser = [...nr].sort((a, c) => a - c).map(n => [n, radKanner(vl, r, n)] as const).filter(([n, v]) => v !== undefined && varldPlatsNr(vl, n));
  for (const p of b.people) {
    if (ageOf(p, b.now) < ALDER.vuxen) continue;
    for (const [n, v] of platser) {
      if (rnd(b, 'vackt') >= VACKT.ort) continue;
      const niva = v === O_BESOKT && rnd(b, 'vackt') >= VACKT.ortBesokt ? O_KANT : v!;
      larOrt(b, p, n, niva, niva === O_BESOKT ? 1 : niva === O_KANT ? ORT.gastKant : ORT.gastRykte);
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
    const tomt = housesOf(b).find(h => h.fn === 'familjehus' && h.ag === undefined); // ett familjehus ur minnet som ingen äger (steg 11.13.12)
    if (tomt) { tomt.ag = o.id; continue; }
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

// förråden och ägandet: radens mat (portioner) och rikedom (grundvärde) blir hela saker, som i ruinen och handlarens last: bland
// det byn kan göra (sakens tek) dras saker med byns slump, tills gruppens del är slut. Rikedomen som inte redan står i husen och
// maten delas på varugrupperna som radens tillgång (radVaror). Maten väljs efter hur länge den håller: det som ligger i ett förråd är
// det som inte ruttnat. Varje sak ägs av en vuxen, dragen efter slumpen; redskapen blir ting hos sin ägare. Silvret är radens.
// Delningen (stepDelning) räknas efteråt, som i en by som lever. Raden ändras inte
const VACKSAK = (k: string, tek: Set<string>) => { const d = SAKER[k]; return !!d && !d.mark && !d.dold && !d.i && !d.fordon && !ar_vatska(k) && k !== 'silver' && (!d.skaffa?.tek || tek.has(d.skaffa.tek)); };
export function byggForrad(b: State, r: VarldRad) {
  const tek = new Set(r.tek), vuxna = b.people.filter(p => ageOf(p, b.now) >= ALDER.vuxen);
  const agare = () => (vuxna.length ? vuxna[Math.floor(rnd(b, 'vackt') * vuxna.length)] : b.people[0])?.id;
  const varor = radVaror({ ...r, varor: r.varor ? { ...r.varor } : undefined });
  const ovriga = VARUGRUPP_IDS.filter(g => g !== 'mat'), radSum = ovriga.reduce((a, g) => a + (varor[g] ?? 0), 0);
  const dra = (g: VarugruppId, budget: number, per: (k: string) => number, vikt: (k: string) => number) => {
    const l = sakerIGrupp(g).filter(k => VACKSAK(k, tek) && (g !== 'mat' || isFood(k)) && per(k) > 0);
    for (let i = 0; i < 400 && l.length && budget > 0; i++) {
      const tot = l.reduce((a, k) => a + vikt(k), 0);
      let x = rnd(b, 'vackt') * tot, k = l[0];
      for (const q of l) { x -= vikt(q); if (x < 0) { k = q; break; } }
      const n = Math.min(1 + Math.floor(rnd(b, 'vackt') * (SAKER[k]!.redskap ? 1 : SAKER[k]!.stack ?? 5)), Math.floor(budget / per(k)));
      if (n <= 0) { l.splice(l.indexOf(k), 1); continue; }
      const ag = agare();
      if (ag === undefined) return;
      if (SAKER[k]!.redskap) for (let j = 0; j < n; j++) newTing(b, k, 1, ag); else laggIn(b, k, n, ag);
      budget -= n * per(k);
    }
  };
  dra('mat', Math.floor(r.tal.mat), () => 1, k => SAKER[k]!.haller ?? 10);
  iLagret(b, false); // det som ligger utanför lagret räknas inte i rikedomen
  const d = rikedomDelar(b), kvar = Math.max(0, r.tal.rikedom - d.hus - d.forrad - d.redskap); // det som inte redan står i husen och maten
  for (const g of ovriga) dra(g, radSum > 0 ? kvar * (varor[g] ?? 0) / radSum : 0, grundvarde, () => 1);
  if (r.tal.silver >= 1) laggIn(b, 'silver', Math.floor(r.tal.silver), agare());
  iLagret(b);
}
// det som inte fått plats i lagret ligger bredvid: byn gör lagret större eller en ny lagerplats, som när den lever (lagerStorre
// och lagerNy), och lägger in det som låg utanför. Sedan ett förrådshus om byn vill ha ett (BYGGNADER.forrad)
function iLagret(b: State, hus = true) {
  for (let n = 0; n < 40; n++) {
    const ute = stacksOf(b).filter(a => !isStored(b, a.x, a.y));
    if (!ute.length) break;
    if (!lagerStorre(b) && !lagerNy(b)) break;
    b.stackar = (b.stackar ?? []).filter(a => !ute.includes(a));
    for (const a of ute) put(b, a.k, a.n, a.ag, a.c);
  }
  const a = BYGGNADER.forrad.akut(b);
  if (hus && a.v > 0 && b.people.some(p => (p.tek?.timmervagg ?? 0) >= 1)) { const h = planeraHus(b, 'forrad', a); if (h) byggFardigt(b, h); }
}
// testknappen Väck: den närmaste levande grannbyn till huvudbyn väcks, eller somnar om den redan är väckt
export function vackTestNarmast(s: State): { ok: boolean; text: string } {
  const vl = s.varld, h = vl && radNr(vl, vl.huvud);
  if (!vl || !h) return { ok: false, text: 'Det finns ingen värld runt byn' };
  const hem = byPlats(vl, h.nr), avst = (r: VarldRad) => { const p = byPlats(vl, r.nr); return hem && p ? Math.max(Math.abs(p.x - hem.x), Math.abs(p.y - hem.y)) : Infinity; };
  const r = (vl.rader ?? []).filter(q => q.nr !== vl.huvud && q.sort === 'by' && lever(vl, q) && q.tal.folk >= 1).sort((a, c) => avst(a) - avst(c) || a.nr - c.nr)[0];
  if (!r) return { ok: false, text: 'Ingen by i världen lever' };
  const namn = byPlats(vl, r.nr)?.namn ?? 'byn';
  const b = vackTest(s, r.nr);
  if (!b) return { ok: true, text: `${namn} somnade` };
  return { ok: true, text: `${namn} väcktes: ${b.people.length} invånare, ${housesOf(b).length} hus och ${(b.stationer ?? []).length} stationer` };
}
