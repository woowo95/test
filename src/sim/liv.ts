import { uppvaxtDod, uppvaxtFodd } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { ALDER, REL, ageOf, alive, byId, count, isParent, living, log, newPerson, relKey, startSkills, think } from './folk';
import { Sed, sedEvent } from './seder';
import { pair } from './varld';
import { avgMood } from './humor';
import { chance, clamp, pick, rnd } from './slump';
import { DAY, HOUR_S, Person, SEC, State } from './typer';
import { foodDays } from './ekonomi';
import { avbryt, put, releaseOwner } from './lager';
import { inherit, packUp } from './arv';
import { balans } from './balans';
import { RELT } from './relationer';
import { rykteDod, startSmak } from './rykten';

// ---------- balanstal (regel 8) ----------
// Befolkningen regleras av naturen, inte av ett fast tak: en trång by får färre barn och fler som flyttar, en liten by lockar
// nybyggare, och en by med knapp mat får färre barn, fler som flyttar och färre nybyggare. Längder är i dygn (år i spelet),
// åldrar i år i spelet. Åldrarna för vuxen och barn (ALDER) står i folk.ts
const LIV = balans('liv', {
  // trängsel: 0 upp till trangFran invånare, 1 vid trangFran + trangSpann, högst trangMax
  trangFran: 24, trangSpann: 16, trangMax: 3, // (14 före steg 2.12.6: spelet byggs för ca 30 invånare)
  // hur många barn byn vill ha (birthWish): fler i en liten by, färre i en stor
  barnLiten: 20, // en by på så här många eller färre vill ha fler barn (10 före steg 2.12.6) ...
  barnLitenOkning: 0.03, // ... så här mycket mer för varje invånare under
  barnTrangFran: 26, barnTrangTapp: 0.035, barnMin: 0.15, // över detta minskar viljan så här mycket per invånare, aldrig under Min (16 före steg 2.12.6)
  // hur många som flyttar ut (emigrationRate, per dygn)
  nojd: 0.6, // snitthumör över detta ger inget missnöje (och en by utan invånare räknas som nöjd)
  missnoje: 4, missnojeMax: 1.5, // missnöjet = (Nöjd - humöret) gånger detta, högst Max
  flyttaFran: 6, flyttaSpann: 20, flyttaMin: 0.1, // i en liten by spelar missnöjet mindre roll: 0,1 vid sex invånare eller färre, 1 vid 26
  flyttTrang: 0.3, flyttTrangMissnoje: 2.5, // trängseln i kvadrat gånger (Trang + Missnoje gånger missnöjet)
  flyttMissnoje: 0.12, // ... plus så mycket gånger missnöjet, även i en by som inte är trång
  // nybyggare (immigrationRate, per dygn)
  nybyggareUnder: 10, // under så här många invånare kommer nybyggare ...
  nybyggare: 0.3, // ... så många per dygn i en tom by, mindre ju fler som bor där
  nybyggareMatMin: 0.3, nybyggareMat: 0.7, // knapp mat jagar bort dem: gånger Min + Mat gånger hur gott om mat byn haft
  nybyggareAlder: 17, nybyggareAlderSpann: 18, // en nybyggare är mellan Alder och Alder + Spann år
  parChans: 0.35, // chansen att en nybyggare kommer med en partner
  medhavd: 2, // rötter nybyggaren har med sig från vandringen (MEDHAVT nedan)
  // hur gott om mat byn haft (matGott): 0 vid matGottFran dygns mat i snitt, 1 vid Fran + Spann eller mer
  matGottFran: 1, matGottSpann: 2.5, matStart: 4, // (1,4 och 2,7 före steg 2.12.6: hela familjer flyttade fast maten räckte) // en by som ännu saknar snitt räknas som om den hade Start dygns mat
  matSnittDygn: 1, // snittet glider över så många dygn (ett år i spelet)
  barnMatTapp: 0.6, barnMatFran: 6, barnMatSpann: 4, // knapp mat ger så här mycket färre barn, från sju invånare (full effekt vid Fran + Spann)
  hungerTakt: 0.6, hungerFran: 7, hungerSpann: 4, // knapp mat får så här många att flytta per dygn, från åtta invånare
  // vilka som flyttar (emigrate)
  parFran: 18, parTill: 38, // ett par där hen som valts är över Fran och under Till flyttar tillsammans (med sina barn under ALDER.vuxen)
  ensamFran: 16, ensamTill: 40, // annars ger sig en ensam vuxen i den åldern av
  // död och födsel
  barnsang: 0.025, // chansen att modern dör i barnsäng
  barnDod: 5, // ett barn som dör under så här många år sörjs av hela byn (sedan Barn)
  sedSvalt: 0.15, sedKyla: 0.1, sedJakt: 0.04, // hur mycket Försiktighet ökar när någon dör av svält, kyla eller under en jakt
  sedBarn: 0.08, // ... och Barn när ett barn dör
  // tankarna efter en död eller flytt: styrkan (humör) och hur länge de varar (dygn)
  sorjPartner: -0.3, sorjPartnerDygn: 1.2, // partnern
  sorjNara: -0.25, sorjNaraDygn: 1, // förälder och barn
  saknar: -0.12, saknarDygn: 0.6, // en annan som tyckte om den döda (relationen över REL.saknar)
  saknarFlytt: -0.08, saknarFlyttDygn: 0.5, // den som tyckte om någon som flyttar
  fodMor: 0.2, fodFar: 0.18, fodDygn: 1, // glädjen över ett nytt barn
});

// det en nybyggare har med sig från vandringen: sak och hur mycket (hen äger det)
const MEDHAVT: Record<string, number> = { rotter: LIV.medhavd };

// ---------- dödsorsakerna (registret) ----------
// text = det som står efter namnet ("dog av svält"), i loggen, krönikan och byns räknare ('dog av svält', som testerna läser).
// sed = seden som ändras, hur mycket, och texten efter namnet i sedernas logg. En olycka i ett farligt arbete (OLYCKOR i halsa.ts) pekar hit
interface DodDef { text: string; sed?: { k: Sed; d: number; text: string } }
const DOD = {
  svalt: { text: 'av svält', sed: { k: 'forsiktighet', d: LIV.sedSvalt, text: 'svalt ihjäl. Byn har blivit mer försiktig.' } },
  kyla: { text: 'av kyla', sed: { k: 'forsiktighet', d: LIV.sedKyla, text: 'frös ihjäl. Byn har blivit mer försiktig.' } },
  jakt: { text: 'under en jakt', sed: { k: 'forsiktighet', d: LIV.sedJakt, text: 'dog under en jakt. Byn blev lite försiktigare.' } },
  torst: { text: 'av törst' }, // steg 2.4.1
  blod: { text: 'av blodförlust', sed: { k: 'forsiktighet', d: LIV.sedJakt, text: 'förblödde. Byn blev lite försiktigare.' } }, // steg 2.5.1
  kallbrand: { text: 'av kallbrand', sed: { k: 'forsiktighet', d: LIV.sedJakt, text: 'dog av kallbrand. Byn blev lite försiktigare.' } }, // steg 2.5.2
  svamp: { text: 'av svampförgiftning' },
  skorbjugg: { text: 'av skörbjugg' }, // brist på vitaminer (steg 2.6.2)
  sjukdom: { text: 'av sjukdom' },
  alderdom: { text: 'av ålderdom' },
  barnsjukdom: { text: 'av en barnsjukdom' },
  olycka: { text: 'i en olycka' },
  barnsang: { text: 'i barnsäng' },
  varg: { text: 'av vargar', sed: { k: 'forsiktighet', d: LIV.sedJakt, text: 'dödades av vargar. Byn blev lite försiktigare.' } }, // steg 3.7.1 (varg.ts)
  drap: { text: 'av våld' }, // slagen till döds i ett utbrott (steg 3.2.3, humor.ts)
} satisfies Record<string, DodDef>;
export type Dodsorsak = keyof typeof DOD;
export const DODSORSAKER: Record<Dodsorsak, DodDef> = DOD;

// ---------- död, födsel, flytt ----------
export function die(s: State, p: Person, orsak: Dodsorsak) {
  const { text: cause, sed } = DODSORSAKER[orsak];
  avbryt(s, p); // bördan läggs ner medan hen ännu lever, så att den ärvs
  p.died = s.now; p.cause = cause;
  inherit(s, p); // arvingarna får det hen ägde (arv.ts)
  releaseOwner(s, p.id); // det som blev kvar blir byns
  const a = Math.floor(ageOf(p, s.now));
  log(s, `${p.name} dog ${cause}, ${a} år gammal.`, 'death', [p.id]);
  count(s, 'doda'); count(s, 'dog ' + cause); kronikaBer(s, 'k_dog', p.id, { ...personFalt(p), orsak: cause, alder: a, partner: (q => q && alive(q) ? q.name : undefined)(byId(s, p.partner)), barn: s.people.filter(q => (q.mother === p.id || q.father === p.id) && alive(q)).length });
  if (sed) sedEvent(s, sed.k, sed.d, `${p.name} ${sed.text}`);
  if (a < LIV.barnDod) sedEvent(s, 'barn', LIV.sedBarn, `Byn sörjer barnet ${p.name} och värnar mer om sina barn.`);
  if (a >= ALDER.hogAlder) p.fame.push(`Blev ${a} år gammal`);
  uppvaxtDod(s, p); // barnen som miste hen eller såg det (steg 3.1.2)
  rykteDod(s, p); // byn minns hen (steg 3.4.1)
  for (const q of living(s)) {
    // den som var gift sörjer mer, den bästa vännen länge och en nära vän lite mer än en vän (steg 3.1.1)
    const r = s.rels[relKey(p.id, q.id)];
    if (q.partner === p.id) { q.partner = undefined; const f = r?.gift !== undefined ? RELT.giftSorj : 1; think(q, `Sörjer ${p.name}`, LIV.sorjPartner * f, s.now, LIV.sorjPartnerDygn * f * DAY); }
    else if (isParent(p, q) || isParent(q, p)) think(q, `Sörjer ${p.name}`, LIV.sorjNara, s.now, LIV.sorjNaraDygn * DAY);
    else if (q.bast === p.id) think(q, `Sörjer ${p.name}`, RELT.bastSorj, s.now, RELT.bastSorjDygn * DAY);
    else if (r && r.op > REL.saknar) { const f = r.op > REL.naraVan ? RELT.naraSorj : 1; think(q, `Saknar ${p.name}`, LIV.saknar * f, s.now, LIV.saknarDygn * f * DAY); }
  }
}

export function birth(s: State, mother: Person) {
  const father = byId(s, mother.pregnantBy ?? mother.partner); // den hon blev gravid med; partnern bara i sparfiler där det saknas
  mother.pregnantSince = undefined; mother.lastBirth = s.now;
  const ch = newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', s.now, mother, father);
  ch.x = mother.x; ch.y = mother.y;
  s.people.push(ch);
  log(s, `${ch.name} föddes, ${ch.sex === 'k' ? 'dotter' : 'son'} till ${mother.name}${father ? ' och ' + father.name : ''}.`, 'birth', [ch.id, mother.id, ...(father ? [father.id] : [])]);
  count(s, 'fodda'); kronikaBer(s, 'k_fodd', ch.id, { namn: ch.name, barnet: ch.sex === 'k' ? 'dotter' : 'son', mor: mother.name, foraldrar: mother.name + (father ? ' och ' + father.name : ''), syskon: s.people.filter(q => q !== ch && q.mother === mother.id).length });
  uppvaxtFodd(s, ch); startSmak(s, ch);
  think(mother, `Fick barnet ${ch.name}`, LIV.fodMor, s.now, LIV.fodDygn * DAY);
  if (father && alive(father)) think(father, `Fick barnet ${ch.name}`, LIV.fodFar, s.now, LIV.fodDygn * DAY);
  const kids = s.people.filter(q => q.mother === mother.id).length;
  if (kids === 6) mother.fame.push('Mor till många barn');
  if (rnd(s, 'halsa', mother) < LIV.barnsang) die(s, mother, 'barnsang');
}

// ---------- befolkningen regleras ----------
// En stor by blir trång: fler flyttar ut och färre vill ha barn. En liten by lockar nybyggare och barn blir viktigare.
// Att hålla nere befolkningen är starkare än att höja den. Nöjda invånare stannar, så en välfungerande by kan bli stor.
// När byn är liten spelar humöret mindre roll för om folk flyttar.
const crowd = (pop: number) => clamp((pop - LIV.trangFran) / LIV.trangSpann, 0, LIV.trangMax); // 0 upp till 24 invånare, 1 vid 40
export function birthWish(pop: number) { return pop <= LIV.barnLiten ? 1 + LIV.barnLitenOkning * (LIV.barnLiten - pop) : clamp(1 - (pop - LIV.barnTrangFran) * LIV.barnTrangTapp, LIV.barnMin, 1); }
export function emigrationRate(pop: number, mood: number) { // flyttar per dygn
  const unhappy = clamp((LIV.nojd - mood) * LIV.missnoje, 0, LIV.missnojeMax), w = clamp((pop - LIV.flyttaFran) / LIV.flyttaSpann, LIV.flyttaMin, 1);
  return crowd(pop) ** 2 * (LIV.flyttTrang + LIV.flyttTrangMissnoje * unhappy * w) + LIV.flyttMissnoje * unhappy * w;
}
export const immigrationRate = (pop: number) => pop < LIV.nybyggareUnder ? LIV.nybyggare * (LIV.nybyggareUnder - pop) / LIV.nybyggareUnder : 0; // nybyggare per dygn
// Hur gott om mat byn har haft (steg 1.7.2): maten i förrådet räknad i dygn för alla, som ett glidande snitt över ungefär
// ett dygn (ett år i spelet) så att årstiderna jämnas ut. 0 vid 1 dygns mat i snitt, 1 vid 3,5 eller mer. Är maten knapp
// föds färre barn (barnMat), fler flyttar (hungerFlytt) och färre nybyggare stannar: så når byn det tak som marken och redskapen kan föda, utan
// att folk svälter ihjäl. En by på sju eller färre flyttar inte för maten
export const matGott = (s: State) => clamp(((s.matSnitt ?? LIV.matStart) - LIV.matGottFran) / LIV.matGottSpann, 0, 1);
export const barnMat = (s: State, pop: number) => 1 - LIV.barnMatTapp * (1 - matGott(s)) * clamp((pop - LIV.barnMatFran) / LIV.barnMatSpann, 0, 1); // färre barn: från sju invånare
export const hungerFlytt = (s: State, pop: number) => LIV.hungerTakt * (1 - matGott(s)) * clamp((pop - LIV.hungerFran) / LIV.hungerSpann, 0, 1); // flyttar per dygn
export function regulate(s: State, dtSec: number) {
  const pop = living(s).length;
  if (pop === 0) { refound(s); return; }
  const fd = foodDays(s);
  s.matSnitt = s.matSnitt === undefined ? fd : s.matSnitt + (fd - s.matSnitt) * Math.min(1, dtSec * SEC / (LIV.matSnittDygn * DAY));
  if (rnd(s, 'flytt') < dtSec / HOUR_S) { // humöret räknas om ungefär en gång i timmen
    const rate = emigrationRate(pop, avgMood(s, LIV.nojd)) + hungerFlytt(s, pop);
    if (chance(s, rate / 86400, HOUR_S, 'flytt')) emigrate(s);
  }
  if (chance(s, immigrationRate(pop) * (LIV.nybyggareMatMin + LIV.nybyggareMat * matGott(s)) / 86400, dtSec, 'flytt')) immigrate(s, false);
}
// en nybyggare (ibland ett par) kommer vandrande och slår sig ner, med lite rötter (ungefär ett dygns mat, ett år i spelet)
function immigrate(s: State, alone: boolean) {
  const mk = (sex: 'm' | 'k') => {
    const age = LIV.nybyggareAlder + rnd(s, 'folk') * LIV.nybyggareAlderSpann, p = newPerson(s, sex, s.now - age * DAY);
    startSkills(s, p, age); startSmak(s, p);
    s.people.push(p);
    for (const k in MEDHAVT) put(s, k, MEDHAVT[k], { [p.id]: MEDHAVT[k] }); // lite mat från vandringen, så att man hinner samla innan man svälter
    return p;
  };
  const a = mk(rnd(s, 'folk') < 0.5 ? 'm' : 'k');
  if (!alone && rnd(s, 'flytt') < LIV.parChans) {
    const b = mk(a.sex === 'm' ? 'k' : 'm');
    pair(s, a, b, true);
    log(s, `${a.name} och ${b.name} kom vandrande och slog sig ner i byn.`, 'move', [a.id, b.id]);
  } else log(s, `${a.name} kom vandrande och slog sig ner i byn.`, 'move', [a.id]);
  count(s, 'invandrade');
  return a;
}
// alla är borta: en vandrare hittar den övergivna boplatsen och grundar byn på nytt
function refound(s: State) {
  const p = immigrate(s, true);
  p.grundare = 'ny';
  count(s, 'atergrundad'); kronikaBer(s, 'k_atergrundad', p.id, personFalt(p));
  log(s, `${p.name} hittade den övergivna boplatsen och grundade byn på nytt.`, 'world', [p.id]);
}

// p lämnar byn: bördan läggs ner först, sedan packar hen det hen orkar bära av allt hen äger (arv.ts) och resten blir byns
export function leave(s: State, p: Person) { avbryt(s, p); p.left = s.now; packUp(s, p); releaseOwner(s, p.id); }

function emigrate(s: State) {
  const now = s.now, barn = (...f: Person[]) => living(s).filter(c => f.some(q => isParent(q, c)) && ageOf(c, now) < ALDER.vuxen);
  const cands = living(s).filter(p => p.partner !== undefined && ageOf(p, now) > LIV.parFran && ageOf(p, now) < LIV.parTill);
  if (!cands.length) { // inget ungt par: en ensam vuxen ger sig av
    const one = living(s).filter(p => p.partner === undefined && ageOf(p, now) >= LIV.ensamFran && ageOf(p, now) < LIV.ensamTill);
    if (!one.length) return;
    const p = pick(s, one, 'flytt'), med = [p, ...barn(p)]; // en ensam förälder tar med sina barn
    for (const g of med) leave(s, g);
    log(s, `${p.name} lämnade byn${med.length > 1 ? ` med ${med.length - 1} barn` : ''} för att söka lyckan på annat håll.`, 'move', med.map(g => g.id));
    count(s, 'utvandrade', med.length);
    return;
  }
  const a = pick(s, cands, 'flytt'), b = byId(s, a.partner)!;
  const group = [a, b, ...barn(a, b)];
  for (const g of group) leave(s, g);
  const n = group.length - 2;
  count(s, 'utvandrade', group.length);
  log(s, `Byn blev trång. ${a.name} och ${b.name} lämnade byn${n ? ` med ${n} barn` : ''} för att grunda en egen boplats.`, 'move', group.map(g => g.id));
  for (const q of living(s)) for (const g of group) { const r = s.rels[relKey(q.id, g.id)]; if (r && r.op > REL.saknar) { think(q, `Saknar ${g.name}`, LIV.saknarFlytt, now, LIV.saknarFlyttDygn * DAY); break; } }
}
