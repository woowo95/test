import { honom } from './ord';
import { personNara } from './personlogg';
import { upplev, uppvaxtDod, uppvaxtFodd } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { kronika } from './historik';
import { ALDER, REL, ageOf, alive, budTillfalle, byId, count, isParent, living, log, newPerson, raddAkt, relKey, startSkills, think } from './folk';
import { pair } from './varld';
import { avgMood } from './humor';
import { chance, clamp, pick, rnd } from './slump';
import { Act, DAY, HOUR, HOUR_S, MIN, Person, SEC, State, T, W } from './typer';
import { vattenNu } from './sjo';
import { tileOf } from './mark';
import { foodDays } from './ekonomi';
import { avbryt, put, releaseOwner } from './lager';
import { inherit, packUp } from './arv';
import { balans } from './balans';
import { RELT } from './relationer';
import { rykteDod, startSmak } from './rykten';
import { tecken, GudOmr, gudHandelse } from './religion';
import { TEK, TEKNIK, knows, kunskapDod } from './teknik';
import { KLAN, andraInst, klanById, klanerOf, utbrytning } from './klaner';
import { gaMot } from './rovare';
import { kanterna } from './varg';
import { eldPlats, getMap } from './karta';
import { freeNear, isWall } from './byggnad';
import { gastGar, nyttGastId } from './gast';
import { notis } from './notiser';
import { vaderNu } from './vader';
import { nyKvarleva } from './kvarlevor';
import { gravgava } from './kultlatt';
import { barSmitta, insjukna } from './sjukdom';
import { nyttILarmet } from './roller';
import { forlossRisk } from './forlossning';

// ---------- balanstal (regel 8) ----------
// Befolkningen regleras av naturen, inte av ett fast tak: en trång by får färre barn och fler som flyttar, en liten by lockar
// nybyggare, och en by med knapp mat får färre barn, fler som flyttar och färre nybyggare. Längder är i dygn (år i spelet),
// åldrar i år i spelet. Åldrarna för vuxen och barn (ALDER) står i folk.ts
export const LIV = balans('liv', {
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
  matGottFran: 0.6, matGottSpann: 1.5, matStart: 4, // (1 och 2,5 före steg 3.10.26, samma skäl som STEG.matDygn; 1,4 och 2,7 före steg 2.12.6: hela familjer flyttade fast maten räckte) // en by som ännu saknar snitt räknas som om den hade Start dygns mat
  matSnittDygn: 1, // snittet glider över så många dygn (ett år i spelet)
  barnMatTapp: 0.6, barnMatFran: 6, barnMatSpann: 4, // knapp mat ger så här mycket färre barn, från sju invånare (full effekt vid Fran + Spann)
  hungerTakt: 0.6, hungerFran: 7, hungerSpann: 4, // knapp mat får så här många att flytta per dygn, från åtta invånare
  // vilka som flyttar (emigrate)
  parFran: 18, parTill: 38, // ett par där hen som valts är över Fran och under Till flyttar tillsammans (med sina barn under ALDER.vuxen)
  ensamFran: 16, ensamTill: 40, // annars ger sig en ensam vuxen i den åldern av
  // död och födsel
  barnDod: 5, // ett barn som dör under så här många år sörjs av hela byn (sedan Barn)
  // tankarna efter en död eller flytt: styrkan (humör) och hur länge de varar (dygn)
  sorjPartner: -0.3, sorjPartnerDygn: 1.2, // partnern
  sorjNara: -0.25, sorjNaraDygn: 1, // förälder och barn
  saknar: -0.12, saknarDygn: 0.6, // en annan som tyckte om den döda (relationen över REL.saknar)
  // sorgen i stadier (steg 9.2.33) hos partnern, föräldrar och barn och den bästa vännen: först "Förlorade sin vän" med
  // tyngden gånger forlust i forlustDygn, sedan "Sörjer" med tyngden i sorgens dygn, och sist "Saknar" med saknar i saknasDygn
  forlust: 1.5, forlustDygn: 2, saknasDygn: 6,
  saknarFlytt: -0.08, saknarFlyttDygn: 0.5, // den som tyckte om någon som flyttar
  fodMor: 0.2, fodFar: 0.18, fodDygn: 1, // glädjen över ett nytt barn
});

// det en nybyggare har med sig från vandringen: sak och hur mycket (hen äger det)
const MEDHAVT: Record<string, number> = { rotter: LIV.medhavd };

// ---------- dödsorsakerna (registret) ----------
// text = det som står efter namnet ("dog av svält"), i loggen, krönikan och byns räknare ('dog av svält', som testerna läser).
// sorg = familjen och vännerna sörjer på ett sätt som gör dem mer förutseende (upplevelsen sorjde, steg 4.5.4.9). En olycka i ett farligt arbete (OLYCKOR i halsa.ts) pekar hit
// gud = gudens område som döden hör till (steg 4.1.5); de andra dödsfallen hör till Döden
interface DodDef { text: string; sorg?: true; gud?: GudOmr }
const DOD = {
  svalt: { text: 'av svält', gud: 'skord', sorg: true },
  kyla: { text: 'av kyla', gud: 'vintern', sorg: true },
  jakt: { text: 'under en jakt', gud: 'jakt' },
  torst: { text: 'av törst' }, // steg 2.4.1
  blod: { text: 'av blodförlust' }, // steg 2.5.1
  kallbrand: { text: 'av kallbrand' }, // steg 2.5.2
  svamp: { text: 'av svampförgiftning' },
  skorbjugg: { text: 'av skörbjugg' }, // brist på vitaminer (steg 2.6.2)
  sjukdom: { text: 'av sjukdom' },
  magsjuka: { text: 'av magsjuka' }, matforgiftning: { text: 'av matförgiftning' }, forkylning: { text: 'av förkylning' }, // sjukdomarna (steg 9.5.1, sjukdom.ts): dödsorsaken heter som raden
  lunginflammation: { text: 'av lunginflammation' }, massling: { text: 'av mässlingen', sorg: true }, koppor: { text: 'av kopporna', sorg: true },
  alderdom: { text: 'av ålderdom' },
  barnsjukdom: { text: 'av en barnsjukdom' },
  olycka: { text: 'i en olycka' },
  barnsang: { text: 'i barnsäng', gud: 'atten' },
  varg: { text: 'av vargar', gud: 'jakt', sorg: true }, // steg 3.7.1 (varg.ts)
  bjorn: { text: 'av en björn', gud: 'jakt', sorg: true }, // steg 6.6.5 (bjorn.ts)
  tornado: { text: 'i en tornado', gud: 'aska' }, // steg 3.8.4 (tornado.ts)
  brand: { text: 'i en eldsvåda', gud: 'elden' }, // steg 3.8.5 (brand.ts)
  rovare: { text: 'av rövare', gud: 'kriget', sorg: true }, // steg 4.4.5 (rovare.ts)
  avrattad: { text: 'för sitt brott', gud: 'kriget' }, // dödsstraffet (steg 8.4.8)
  drap: { text: 'av våld', gud: 'kriget' },
  offrad: { text: 'som offer', gud: 'kriget' }, // människooffret (budet, steg 8.6.6) // slagen till döds i ett utbrott (steg 3.2.3, humor.ts)
} satisfies Record<string, DodDef>;
export type Dodsorsak = keyof typeof DOD;
export const DODSORSAKER: Record<Dodsorsak, DodDef> = DOD;

// ---------- död, födsel, flytt ----------
// vad den som dog i en olycka gjorde ({nar} i k_dog, steg 6.7.7): "när han fällde ett träd"
const NAR_AKT: Partial<Record<Act, string>> = {
  falla: 'fällde ett träd', hugga: 'högg ved', klyva: 'klöv virke', jakt: 'var ute på jakt', fiske: 'fiskade', ved: 'samlade grenar', samla: 'samlade bär',
  bygga: 'byggde', odla: 'arbetade på fältet', bada: 'badade i sjön', vatten: 'hämtade vatten', slakta: 'slaktade', rensa: 'rensade fisk',
  elda: 'lade ved på elden', promenad: 'var ute och gick', vakt: 'höll vakt', leka: 'lekte', sport: 'spelade', grilla: 'grillade mat',
};
const hen = (p: Person) => p.sex === 'm' ? 'han' : 'hon';
// den som sörjer mest ({sorjer} i k_dog): partnern i livet, annars bästa vännen, annars en förälder i livet
function sorjer(s: State, p: Person) {
  const lev = (id?: number) => { const q = id !== undefined ? byId(s, id) : undefined; return q && alive(q) ? q.name : undefined; };
  return lev(p.partner) ?? lev(p.bast) ?? lev(p.mother) ?? lev(p.father);
}
export function die(s: State, p: Person, orsak: Dodsorsak) {
  nyttILarmet(s); // en död: rollerna vid larmet väljs om (steg 9.5.19)
  const { text: cause, sorg } = DODSORSAKER[orsak], akt = p.task?.act;
  avbryt(s, p); // bördan läggs ner medan hen ännu lever, så att den ärvs
  p.died = s.now; p.cause = cause;
  raddAkt(s, p, akt, `${p.name} dog ${cause}`, orsak); // de som såg det blir rädda för det hen gjorde (steg 8.4.10)
  if (p.gjort) p.gjort.t = {}; // de döda gör inget mer det senaste dygnet (steg 3.10.6)
  const a = Math.floor(ageOf(p, s.now));
  log(s, `${p.name} dog ${cause}, ${a} år gammal.`, 'death', [p.id]); notis(s, 'dod', `${p.name} dog ${cause}, ${a} år gammal.`, [p.id], { x: Math.floor(p.x), y: Math.floor(p.y) });
  count(s, 'doda'); count(s, 'dog ' + cause); personNara(s, p, `${p.name} dog ${cause}, ${a} år gammal.`); /* de som stod hen nära (steg 9.2.107) */ kronikaBer(s, a < 1 ? 'k_dogSpad' : 'k_dog', p.id, { ...personFalt(p), orsak: cause, alder: a, nar: orsak === 'olycka' && akt && NAR_AKT[akt] ? `när ${hen(p)} ${NAR_AKT[akt]}` : undefined, sorjer: sorjer(s, p), mor: byId(s, p.mother)?.name ?? 'Modern', partner: (q => q && alive(q) ? q.name : undefined)(byId(s, p.partner)), barn: s.people.filter(q => (q.mother === p.id || q.father === p.id) && alive(q)).length });
  nyKvarleva(s, 'kropp', p, p.name); // kroppen ligger kvar där hen dog (steg 8.5.1)
  gravgava(s, p); // gravgåvan läggs undan innan arvet (steg 8.5.6)
  inherit(s, p); // arvingarna får det hen ägde (arv.ts); efter dödsraden, så att orsaken står före verkan (steg 6.7.5)
  releaseOwner(s, p.id); // det som blev kvar blir byns
  gudHandelse(s, DODSORSAKER[orsak].gud ?? 'doden', `döden som tog ${p.name}`); // tron söker en gud för det (steg 4.1.5)
  if (a >= ALDER.hogAlder) p.fame.push(`Blev ${a} år gammal`);
  uppvaxtDod(s, p); // barnen som miste hen eller såg det (steg 3.1.2)
  rykteDod(s, p); // byn minns hen (steg 3.4.1)
  kunskapDod(s, p); // lärlingen och det som ingen annan kan (steg 4.2.3.4)
  for (const q of living(s)) {
    // den som var gift sörjer mer, den bästa vännen länge och en nära vän lite mer än en vän (steg 3.1.1)
    const r = s.rels[relKey(p.id, q.id)], varPartner = q.partner === p.id;
    // sorgen i stadier (steg 9.2.33): först förlusten med stor tyngd, sedan sorgen och sist saknaden, svag och länge (sorgTimme)
    if (varPartner) { q.partner = undefined; const f = r?.gift !== undefined ? RELT.giftSorj : 1; sorj(s, q, p, 'sin partner', LIV.sorjPartner * f, LIV.sorjPartnerDygn * f); }
    else if (isParent(q, p)) sorj(s, q, p, 'sitt barn', LIV.sorjNara, LIV.sorjNaraDygn);
    else if (isParent(p, q)) sorj(s, q, p, p.sex === 'k' ? 'sin mor' : 'sin far', LIV.sorjNara, LIV.sorjNaraDygn);
    else if (q.bast === p.id) sorj(s, q, p, 'sin vän', RELT.bastSorj, RELT.bastSorjDygn);
    else if (r && r.op > REL.saknar) { const f = r.op > REL.naraVan ? RELT.naraSorj : 1; think(q, `Saknar ${p.name}`, LIV.saknar * f, s.now, LIV.saknarDygn * f * DAY); }
    // familjen och vännerna sörjer en död som kom av svält, kyla, vargar eller rövare (steg 4.5.4.9)
    if (sorg && (varPartner || isParent(p, q) || isParent(q, p) || q.bast === p.id || (r && r.op > REL.saknar) || (q.mother !== undefined && q.mother === p.mother) || (q.father !== undefined && q.father === p.father))) upplev(s, q, 'sorjde', `${p.name}, som dog ${cause}`);
  }
}

export function birth(s: State, mother: Person) {
  const father = byId(s, mother.pregnantBy ?? mother.partner); // den hon blev gravid med; partnern bara i sparfiler där det saknas
  const risk = forlossRisk(s, mother); // förloppet och riskerna med hjälparens vård (steg 9.5.29, forlossning.ts)
  mother.pregnantSince = undefined; mother.lastBirth = s.now; mother.foder = undefined;
  if (mother.task?.act === 'foder') mother.task.until = s.now;
  if (rnd(s, 'halsa', mother) < risk.barn) { // barnet dör (dödfött, eller dog i förlossningen)
    count(s, 'dodfodda'); log(s, `${mother.name}s barn dog när det föddes. ${risk.f.text}`, 'death', [mother.id]); notis(s, 'dodfodd', `${mother.name}s barn dog när det föddes. ${risk.f.text}`, [mother.id]);
    think(mother, 'Förlorade sitt barn i förlossningen', -0.4, s.now, 3 * DAY);
    if (rnd(s, 'halsa', mother) < risk.mor) die(s, mother, 'barnsang');
    return;
  }
  const ch = newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', s.now, mother, father);
  ch.x = mother.x; ch.y = mother.y;
  s.people.push(ch);
  // loggen, notisen och krönikan får samma text ur mallen k_fodd (steg 6.7.7)
  if (vaderNu(s).aska) { for (const q of [mother, father]) if (q) tecken(s, q, 'barnAska'); count(s, 'barn i åska'); } // steg 8.5.18
  const ft = kronikaBer(s, 'k_fodd', ch.id, { namn: ch.name, barnet: ch.sex === 'k' ? 'dotter' : 'son', mor: mother.name, foraldrar: mother.name + (father ? ' och ' + father.name : ''), syskon: s.people.filter(q => q !== ch && q.mother === mother.id).length });
  log(s, ft + (risk.f.namn !== 'Vanlig' ? ' ' + risk.f.text : ''), 'birth', [ch.id, mother.id, ...(father ? [father.id] : [])]).m = 'k_fodd'; notis(s, 'fodd', ft + (risk.f.namn !== 'Vanlig' ? ' ' + risk.f.text : ''), [ch.id, mother.id, ...(father ? [father.id] : [])]); // texten om förloppet (steg 9.5.29)
  count(s, 'fodda'); personNara(s, ch, ft, [mother.id, ...(father ? [father.id] : [])]); // syskonen (steg 9.2.107)
  uppvaxtFodd(s, ch); startSmak(s, ch);
  gudHandelse(s, 'atten', `barnet ${ch.name} som föddes`); // steg 4.1.5
  think(mother, `Fick barnet ${ch.name}`, LIV.fodMor, s.now, LIV.fodDygn * DAY);
  if (father && alive(father)) think(father, `Fick barnet ${ch.name}`, LIV.fodFar, s.now, LIV.fodDygn * DAY);
  const kids = s.people.filter(q => q.mother === mother.id).length;
  if (kids === 6) mother.fame.push('Mor till många barn');
  if (risk.tva && s.people.filter(q => q.mother === mother.id && q.born === s.now).length < 2) { const tv = newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', s.now, mother, father); tv.x = mother.x; tv.y = mother.y; s.people.push(tv); count(s, 'fodda'); count(s, 'tvillingar'); uppvaxtFodd(s, tv); startSmak(s, tv); } // tvillingar (steg 9.5.29)
  if (rnd(s, 'halsa', mother) < risk.mor) die(s, mother, 'barnsang');
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
  if (s.klaner?.length && chance(s, KLAN.framling / 86400, dtSec, 'klan')) framling(s);
}
// en främling från en grannklan som inte tycker illa om byn (steg 4.4.4.2). Hen kan ofta en teknik som ingen i byn kan, men
// vars krav byn kan, och tekniken under den. Främlingen kommer gående (steg 9.2.115): hen är en gäst som går in på kartan
// från närmaste kanten, mot ledaren (eller elden när byn saknar ledare), pratar med hen en stund och stannar som bybo eller
// går igen (framlingSteg). Byn avgör: ledaren, eller de vuxna om byn saknar ledare. Det väger tekniken, klanens inställning,
// seden Förnyelse – Tradition, trängseln och maten. Klanen minns hur det gick
export function framling(s: State, tvinga?: { tek?: string; ja?: boolean }) {
  const kan = klanerOf(s).filter(k => k.inst > KLAN.handelMin);
  if (!kan.length) return undefined;
  const k = pick(s, kan, 'klan'), folk = living(s);
  const kunnat = new Set(folk.flatMap(p => Object.keys(p.tek ?? {}).filter(id => knows(p, id))));
  const nya = TEKNIK.filter(t => !kunnat.has(t.id) && t.krav.every(id => kunnat.has(id)));
  const tek = tvinga ? tvinga.tek : nya.length && rnd(s, 'klan') < KLAN.framlingTek ? pick(s, nya, 'klan').id : undefined;
  const sex = rnd(s, 'klan') < 0.5 ? 'm' : 'k';
  const age = LIV.nybyggareAlder + rnd(s, 'folk') * LIV.nybyggareAlderSpann, p = newPerson(s, sex, s.now - age * DAY);
  startSkills(s, p, age); startSmak(s, p);
  p.fran = k.id;
  if (tek) { const lar = (id: string) => { if (knows(p, id)) return; (p.tek ??= {})[id] = 1; for (const x of TEK[id]?.krav ?? []) lar(x); }; lar(tek); }
  // gästen: id som en gäst, och bybons id väntar tills hen får stanna
  const blir = p.id, ut = kanten(s, p.x, p.y);
  p.id = nyttGastId(s); p.x = ut.x; p.y = ut.y;
  p.gast = { sort: 'framling', klan: k.id, hem: k.hem, blir, fas: 'kommer', ...(tek ? { tek } : {}), ...(tvinga?.ja !== undefined ? { ja: tvinga.ja } : {}) };
  s.people.push(p);
  count(s, 'framlingKommer');
  log(s, `En främling från ${k.namn} kommer gående mot byn.`, 'move', [p.id]);
  return p;
}
// närmaste kanten som inte är vatten, från (x, y)
function kanten(s: State, x: number, y: number) {
  const m = getMap(s.seed);
  return kanterna(x, y).find(k => m.tiles[Math.floor(k.y) * W + Math.floor(k.x)] !== T.Vatten) ?? kanterna(x, y)[0];
}
const ledarenNu = (s: State) => { const lid = s.styre?.ledare, l = lid === undefined ? undefined : byId(s, lid); return l && alive(l) ? l : undefined; };
// främlingarna går, pratar och går igen (steg.ts, varje slag)
export function framlingSteg(s: State, dtSec: number) {
  const t0 = s.now - dtSec * SEC;
  for (const p of s.people.filter(q => q.gast?.sort === 'framling' && q.died === undefined && q.left === undefined)) {
    const g = p.gast!;
    if (g.fas === 'kommer') {
      const l = ledarenNu(s), mal = l ?? eldPlats(s), kvar = gaMot(s, p, mal.x, mal.y + (l ? 0.8 : 1.2), dtSec, t0);
      if (kvar < 0) { const f = freeNear(s, mal.x, mal.y + 1.2); p.x = f.x; p.y = f.y; } // ingen väg: hen hittar fram ändå
      if (kvar <= KLAN.framlingNara) {
        g.fas = 'pratar'; g.till = s.now + KLAN.framlingPrat * MIN; g.path = undefined; g.pk = undefined;
        log(s, `${p.name} från ${klanById(s, g.klan)?.namn ?? 'en grannklan'} pratar med ${l ? l.name : 'byn'}.`, 'move', [p.id, ...(l ? [l.id] : [])]);
        if (l) think(l, 'Pratade med en främling', 0.05, s.now, 6 * HOUR);
      }
    } else if (g.fas === 'pratar') {
      if (s.now >= (g.till ?? 0)) framlingBeslut(s, p);
    } else if (g.fas === 'gar') {
      const ut = kanten(s, p.x, p.y), kvar = gaMot(s, p, ut.x, ut.y, dtSec, t0);
      if (kvar >= 0 && kvar < 0.5 || kvar < 0) gastGar(s, p.id, true);
    }
  }
}
// samtalet är slut: byn avgör om främlingen får stanna
export function framlingBeslut(s: State, p: Person) {
  const g = p.gast!, k = klanById(s, g.klan);
  if (!k) { g.fas = 'gar'; return undefined; }
  const pop = living(s).length, tek = g.tek;
  const v = KLAN.taEmot + (tek ? KLAN.taEmotTek : 0) + k.inst / 100 * KLAN.taEmotInst + (s.seder.v.nyfikenhet ?? 0) * KLAN.taEmotSed
    - Math.min(1, crowd(pop)) * KLAN.taEmotTrang - (1 - matGott(s)) * KLAN.taEmotMat;
  const ja = g.ja ?? rnd(s, 'klan') < v;
  const l = ledarenNu(s), vem = l ? l.name : 'Byn', tekNamn = tek ? TEK[tek]?.namn.toLowerCase() : '';
  if (!ja) {
    andraInst(k, -KLAN.nejInst); count(s, 'framlingNej');
    g.fas = 'gar'; g.path = undefined; g.pk = undefined;
    log(s, `${p.name} från ${k.namn} kom till byn${tek ? ` och kunde ${tekNamn}` : ''}. ${vem} ville inte att ${honom(p)} skulle stanna, och ${p.sex === 'k' ? 'hon' : 'han'} går vidare.`, 'move', [p.id]);
    return undefined;
  }
  // hen blir bybo: samma person, med bybons id
  const gid = p.id;
  p.id = g.blir!; p.gast = undefined; p.task = undefined;
  if (isWall(s, p.x, p.y) || vattenNu(s)[tileOf(p.x, p.y)] === T.Vatten) { const f = freeNear(s, Math.floor(p.x), Math.floor(p.y)); p.x = f.x + 0.5; p.y = f.y + 0.5; } // gästen gick sista biten rakt fram: bybon står aldrig i en vägg eller i vattnet
  for (const q of s.people) if (q.task?.med === gid) q.task.med = p.id;
  upplev(s, p, 'flyttade');
  for (const m in MEDHAVT) put(s, m, MEDHAVT[m], { [p.id]: MEDHAVT[m] });
  andraInst(k, KLAN.stannarInst); count(s, 'framling'); if (tek) count(s, 'framlingTek'); budTillfalle(s, 'framling', p); // främlingen får mat (budet, steg 8.6.6)
  const text = `${p.name} från ${k.namn} kom till byn${tek ? ` och kunde ${tekNamn}, som ingen i byn kunde` : ''}. ${vem} lät ${honom(p)} stanna.`;
  log(s, text, 'move', [p.id]); notis(s, 'inflytt', text, [p.id]);
  if (tek) kronika(s, text, 'flytt');
  return p;
}
// en nybyggare (ibland ett par) kommer vandrande och slår sig ner, med lite rötter (ungefär ett dygns mat, ett år i spelet)
function immigrate(s: State, alone: boolean) {
  const mk = (sex: 'm' | 'k') => {
    const age = LIV.nybyggareAlder + rnd(s, 'folk') * LIV.nybyggareAlderSpann, p = newPerson(s, sex, s.now - age * DAY);
    startSkills(s, p, age); startSmak(s, p);
    { const k = barSmitta(s); if (k) insjukna(s, p, k, 'utifrån'); } // främlingen kan bära en sjukdom (steg 9.5.5)
    s.people.push(p);
    upplev(s, p, 'flyttade'); // steg 4.1.1.2
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

// de i med lämnar byn tillsammans: bördan läggs ner först, sedan packar var och en det hen orkar bära av allt hen äger (arv.ts)
// och resten blir byns. Den som blir kvar släpper sin partner, som när någon dör; ett par som flyttar tillsammans är kvar som par
export function leave(s: State, ...med: Person[]) {
  for (const p of med) { avbryt(s, p); p.left = s.now; packUp(s, p); releaseOwner(s, p.id); }
  for (const q of living(s)) {
    const p = med.find(x => x.id === q.partner);
    if (p) { q.partner = undefined; think(q, `Saknar ${p.name}`, LIV.saknarFlytt, s.now, LIV.saknarFlyttDygn * DAY); }
  }
}

function emigrate(s: State) {
  const now = s.now, barn = (...f: Person[]) => living(s).filter(c => f.some(q => isParent(q, c)) && ageOf(c, now) < ALDER.vuxen);
  const cands = living(s).filter(p => p.partner !== undefined && ageOf(p, now) > LIV.parFran && ageOf(p, now) < LIV.parTill);
  if (!cands.length) { // inget ungt par: en ensam vuxen ger sig av
    const one = living(s).filter(p => p.partner === undefined && ageOf(p, now) >= LIV.ensamFran && ageOf(p, now) < LIV.ensamTill);
    if (!one.length) return;
    const p = pick(s, one, 'flytt'), med = [p, ...barn(p)]; // en ensam förälder tar med sina barn
    leave(s, ...med);
    const ut = `${p.name} lämnade byn${med.length > 1 ? ` med ${med.length - 1} barn` : ''} för att söka lyckan på annat håll.`;
    log(s, ut, 'move', med.map(g => g.id)); notis(s, 'utflytt', ut, med.map(g => g.id));
    count(s, 'utvandrade', med.length);
    return;
  }
  const a = pick(s, cands, 'flytt'), b = byId(s, a.partner);
  if (!b) return;
  const group = [a, b, ...barn(a, b)], pop = living(s).length;
  leave(s, ...group);
  const n = group.length - 2;
  count(s, 'utvandrade', group.length);
  log(s, `Byn blev trång. ${a.name} och ${b.name} lämnade byn${n ? ` med ${n} barn` : ''} för att grunda en egen boplats.`, 'move', group.map(g => g.id));
  for (const q of living(s)) for (const g of group) { const r = s.rels[relKey(q.id, g.id)]; if (r && r.op > REL.saknar) { think(q, `Saknar ${g.name}`, LIV.saknarFlytt, now, LIV.saknarFlyttDygn * DAY); break; } }
  utbrytning(s, group, pop); // ur en mycket stor by blir de en ny grannklan (steg 4.4.4.1)
}

// sorgen i stadier (steg 9.2.33): q förlorade p. Först förlusten, och sorgTimme byter till sorgen och saknaden
function sorj(s: State, q: Person, p: Person, ord: string, v: number, dygn: number) {
  think(q, `Förlorade ${ord}, ${p.name}`, v * LIV.forlust, s.now, LIV.forlustDygn * DAY);
  (q.sorg ??= []).push({ namn: p.name, ord, v, dygn, t0: s.now });
}
// en gång i timmen (steg.ts): den som sörjer går från förlusten till sorgen och sedan till saknaden
export function sorgTimme(s: State) {
  for (const q of living(s)) {
    if (!q.sorg?.length) continue;
    for (const g of q.sorg) {
      const t1 = g.t0 + LIV.forlustDygn * DAY, t2 = t1 + g.dygn * DAY;
      if (s.now >= t1 && !g.s2) { g.s2 = 1; q.thoughts = q.thoughts.filter(x => x.text !== `Förlorade ${g.ord}, ${g.namn}`); think(q, `Sörjer ${g.namn}`, g.v, s.now, t2 - s.now); }
      if (s.now >= t2 && !g.s3) { g.s3 = 1; think(q, `Saknar ${g.namn}`, LIV.saknar, s.now, LIV.saknasDygn * DAY); }
    }
    q.sorg = q.sorg.filter(g => !g.s3);
    if (!q.sorg.length) delete q.sorg;
  }
}
