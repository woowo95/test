import { gen } from './ord';
import { foljdKrok } from './foljdkrok';
import { antal, honom, och, talOrd } from './ord';
import { gastensPlatser, horOmGast, raknaBynVet } from './ort';
import { personNara } from './personlogg';
import { upplev, uppvaxtDod, uppvaxtFodd, type UpplevelseTyp } from './uppvaxt';
import { kronikaBer, personFalt } from './berattelser';
import { kronika } from './historik';
import { ALDER, REL, ageOf, alive, budTillfalle, byId, count, isParent, living, log, makeName, paKartan, newPerson, raddAkt, relKey, startSkills, uppkalladLogg } from './folk';
import { pair, stallVagn } from './varld';
import { avgMood } from './humor';
import { chance, clamp, hash3, pick, pickViktat, rnd } from './slump';
import { klanTatKrok } from './tatkrok';
import { fargKrok } from './fargkrok';
import { Act, DAY, HOUR_S, MIN, Person, SEC, State, T, W } from './typer';
import { vattenNu } from './sjo';
import { tileOf } from './mark';
import { foodDays } from './ekonomi';
import { foodOf } from './lager';
import { ageIndex, foreIstiden, kallTid, kalender } from './tid';
import { amountOf, avbryt, put, releaseOwner } from './lager';
import { inherit, packUp } from './arv';
import { balans } from './balans';
import { RELT } from './relationer';
import { rykteDod, startSmak, handelse } from './rykten';
import { tecken, GudOmr, gudHandelse } from './religion';
import { TEK, TEKNIK, knows, kunskapDod } from './teknik';
import { KLAN, klanById, klanerOf, narhet, type Klan } from './klaner';
import { radKrok, type FlyttDelar } from './radtal';
import { BYREL, byHandelse, gavaRel, klanHandelse } from './byrel';
import { kantMot, utbrytning } from './grannbyar';
import { handlarenDog, prisIPrat } from './handel';
import { gaMot } from './rovare';
import { kanterna } from './varg';
import { eldPlats, getMap } from './karta';
import { freeNear, isWall } from './byggnad';
import { GASTSORTER, GastSortDef, gastGar, nyGast, nyttGastId } from './gast';
import { laggIn } from './lager';
import { grundvarde } from './varde';
import { notis } from './notiser';
import { vaderNu } from './vader';
import { nyKvarleva } from './kvarlevor';
import { gravgava } from './kultlatt';
import { barSmitta, insjukna } from './sjukdom';
import { nyttILarmet } from './roller';
import { forlossRisk } from './forlossning';
import { tanke, tankeText } from './tankar';
import { HALSA } from './halsa';
import { flyttRad, flyttVikt, sattFlyttSkal, type BynsSkal } from './flyttskal';

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
  // barnen och vinterns mat (steg 12.6.5): inför och under istiden räknas maten mot den byn behöver för att klara vintern, dygnen
  // kvar till istidens slut gånger så här mycket (det som inte går att skaffa i istiden). 0: maten räknas som förut (matGott)
  barnVinter: 0,
  hungerTakt: 0.6, hungerFran: 7, hungerSpann: 4, // knapp mat får så här många att flytta per dygn, från åtta invånare
  // vilka som flyttar (emigrate)
  parFran: 18, parTill: 38, // ett par där hen som valts är över Fran och under Till flyttar tillsammans (med sina barn under ALDER.vuxen)
  ensamFran: 16, ensamTill: 40, // den som är ensam ger sig av i den åldern
  // död och födsel
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
// foljd (steg 13.9.3): upplevelsen de levande får av dödsfallet, när foljdNar gäller (en följd som drar en sed tillbaka, foljder i SEDER)
interface DodDef { text: string; sorg?: true; gud?: GudOmr; foljd?: UpplevelseTyp; foljdNar?: (s: State) => boolean }
const DOD = {
  svalt: { text: 'av svält', gud: 'skord', sorg: true, foljd: 'svaltVidSkog', foljdNar: s => foljdKrok.skogNara(s) && foljdKrok.viltNara(s) }, // med vilt och skog nära: mot det odlade (steg 15.1.159)
  kyla: { text: 'av kyla', gud: 'vintern', sorg: true, foljd: 'frosIhjal', foljdNar: s => amountOf(s, 'ved') >= 1 }, // medan andra hade ved
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
  drunkning: { text: 'under isen', gud: 'vintern', sorg: true }, // genom isen (OLYCKOR_LAGE i halsa.ts, steg 12.1.141)
  barnsang: { text: 'i barnsäng', gud: 'atten' },
  varg: { text: 'av vargar', gud: 'jakt', sorg: true }, // steg 3.7.1 (varg.ts)
  bjorn: { text: 'av en björn', gud: 'jakt', sorg: true }, // steg 6.6.5 (bjorn.ts)
  tornado: { text: 'i en tornado', gud: 'aska' }, // steg 3.8.4 (tornado.ts)
  brand: { text: 'i en eldsvåda', gud: 'elden' },
  bistick: { text: 'av bistick' }, // steg 10.10.22 (halsa.ts binStick) // steg 3.8.5 (brand.ts)
  rovare: { text: 'av rövare', gud: 'kriget', sorg: true, foljd: 'stupade' }, // steg 4.4.5 (rovare.ts)
  avrattad: { text: 'för sitt brott', gud: 'kriget' }, // dödsstraffet (steg 8.4.8)
  drap: { text: 'av våld', gud: 'kriget' },
  forsvunnen: { text: 'på en resa och kom aldrig hem', sorg: true }, // steg 11.5.18 (resa.ts)
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
// skatteskulden och arvsskatten betalas efter gravgåvan och före arvet (skatt.ts, steg 10.5.5–10.5.6)
export const skuldKrok: { f?: (s: State, p: Person) => void } = {};
export function die(s: State, p: Person, orsak: Dodsorsak) {
  nyttILarmet(s); // en död: rollerna vid larmet väljs om (steg 9.5.19)
  const { text: cause, sorg } = DODSORSAKER[orsak], akt = p.task?.act;
  avbryt(s, p); // bördan läggs ner medan hen ännu lever, så att den ärvs
  p.died = s.now; p.cause = cause;
  if (p.vardadAv && s.now - p.vardadAv.t <= HALSA.botDygn * DAY && (p.sjuk || p.skador?.length)) { const v = byId(s, p.vardadAv.id); if (v && alive(v)) handelse(s, v, 'vardDog', p); } // dog i någons vård (steg 12.1.134)
  if (p.gast?.sort === 'handlare' && s.handlare?.id === p.id) handlarenDog(s, s.handlare); // handlaren som dör (i en brand, ett slagsmål) avslutar besöket, som i gastDor
  raddAkt(s, p, akt); // de som såg det blir rädda för det hen gjorde (steg 8.4.10)
  if (p.gjort) p.gjort.t = {}; // de döda gör inget mer det senaste dygnet (steg 3.10.6)
  const a = Math.floor(ageOf(p, s.now));
  const aText = a < 1 ? 'som spädbarn' : `${a <= 12 ? talOrd(a) : a} år gammal`; // åldern med ord för de små (steg 12.1.120)
  log(s, `${p.name} dog ${cause}, ${aText}.`, 'death', [p.id]); notis(s, 'dod', `${p.name} dog ${cause}, ${aText}.`, [p.id], p.ute === undefined ? { x: Math.floor(p.x), y: Math.floor(p.y) } : undefined);
  count(s, 'doda'); count(s, 'dog ' + cause); personNara(s, p, `${p.name} dog ${cause}, ${aText}.`, [], 'ont'); /* de som stod hen nära (steg 9.2.107) */ kronikaBer(s, a < 1 ? 'k_dogSpad' : 'k_dog', p.id, { ...personFalt(p), orsak: cause, alder: a <= 12 ? talOrd(a) : a, nar: orsak === 'olycka' && akt && NAR_AKT[akt] ? `när ${hen(p)} ${NAR_AKT[akt]}` : undefined, sorjer: sorjer(s, p), mor: byId(s, p.mother)?.name ?? 'Modern', partner: (q => q && alive(q) ? q.name : undefined)(byId(s, p.partner)), ...(n => ({ barn: n, barnOrd: talOrd(n) }))(s.people.filter(q => (q.mother === p.id || q.father === p.id) && alive(q)).length) });
  if (p.ute === undefined) nyKvarleva(s, 'kropp', p, p.name); // kroppen ligger kvar där hen dog (steg 8.5.1); den som dör på resan ligger inte på byns karta
  gravgava(s, p); // gravgåvan läggs undan innan arvet (steg 8.5.6)
  skuldKrok.f?.(s, p);
  const dodFarg = fargKrok.dodFarg(s, p); // färgen hen bar, innan kläderna ärvs (steg 13.3.5)
  inherit(s, p); // arvingarna får det hen ägde (arv.ts); efter dödsraden, så att orsaken står före verkan (steg 6.7.5)
  releaseOwner(s, p.id); // det som blev kvar blir byns
  gudHandelse(s, DODSORSAKER[orsak].gud ?? 'doden', `döden som tog ${p.name}`); // tron söker en gud för det (steg 4.1.5)
  if (a >= ALDER.hogAlder) p.fame.push(`Blev ${a} år gammal`);
  uppvaxtDod(s, p); // barnen som miste hen eller såg det (steg 3.1.2)
  const fd: DodDef = DODSORSAKER[orsak];
  if (fd.foljd && !p.gast && (fd.foljdNar?.(s) ?? true)) for (const q of living(s)) if (q !== p && !q.gast) upplev(s, q, fd.foljd, p.name); // följden för byn (steg 13.9.3)
  rykteDod(s, p); // byn minns hen (steg 3.4.1)
  kunskapDod(s, p); // lärlingen och det som ingen annan kan (steg 4.2.3.4)
  for (const q of s.people) if (q.partner === p.id && alive(q) && !paKartan(q)) q.partner = undefined; // den som är på resa släpper också sin partner (sorgen när beskedet når hen, steg 11.5.18)
  for (const q of living(s)) {
    // den som var gift sörjer mer, den bästa vännen länge och en nära vän lite mer än en vän (steg 3.1.1)
    const r = s.rels[relKey(p.id, q.id)], varPartner = q.partner === p.id;
    // sorgen i stadier (steg 9.2.33): först förlusten med stor tyngd, sedan sorgen och sist saknaden, svag och länge (sorgTimme)
    if (varPartner) { q.partner = undefined; const f = r?.gift !== undefined ? RELT.giftSorj : 1; sorj(s, q, p, 'sin partner', LIV.sorjPartner * f, LIV.sorjPartnerDygn * f, dodFarg); }
    else if (isParent(q, p)) sorj(s, q, p, 'sitt barn', LIV.sorjNara, LIV.sorjNaraDygn, dodFarg);
    else if (isParent(p, q)) sorj(s, q, p, p.sex === 'k' ? 'sin mor' : 'sin far', LIV.sorjNara, LIV.sorjNaraDygn, dodFarg);
    else if (q.bast === p.id) sorj(s, q, p, 'sin vän', RELT.bastSorj, RELT.bastSorjDygn, dodFarg);
    else if (r && r.op > REL.saknar) { const f = r.op > REL.naraVan ? RELT.naraSorj : 1; tanke(q, 'saknarDod', s.now, { namn: p.name, v: LIV.saknar * f, tid: LIV.saknarDygn * f * DAY }); }
    // familjen och vännerna sörjer en död som kom av svält, kyla, vargar eller rövare (steg 4.5.4.9)
    if (sorg && (varPartner || isParent(p, q) || isParent(q, p) || q.bast === p.id || (r && r.op > REL.saknar) || (q.mother !== undefined && q.mother === p.mother) || (q.father !== undefined && q.father === p.father))) upplev(s, q, 'sorjde', `${p.name}, som dog ${cause}`);
  }  if (!p.gast) raknaBynVet(s); // det byn vet utan hen (steg 11.4.6)
}

export function birth(s: State, mother: Person) {
  const father = byId(s, mother.pregnantBy ?? mother.partner); // den hon blev gravid med; partnern bara i sparfiler där det saknas
  const risk = forlossRisk(s, mother); // förloppet och riskerna med hjälparens vård (steg 9.5.29, forlossning.ts)
  mother.pregnantSince = undefined; mother.lastBirth = s.now; mother.foder = undefined;
  if (mother.task?.act === 'foder') mother.task.until = s.now;
  if (rnd(s, 'halsa', mother) < risk.barn) { // barnet dör (dödfött, eller dog i förlossningen)
    count(s, 'dodfodda'); log(s, `${gen(mother.name)} barn dog när det föddes. ${risk.f.text}`, 'death', [mother.id]); notis(s, 'dodfodd', `${gen(mother.name)} barn dog när det föddes. ${risk.f.text}`, [mother.id]);
    tanke(mother, 'forloradeBarnet', s.now);
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
  count(s, 'fodda'); personNara(s, ch, ft, [mother.id, ...(father ? [father.id] : [])], 'gott'); // syskonen (steg 9.2.107)
  uppvaxtFodd(s, ch); startSmak(s, ch); uppkalladLogg(s, ch);
  gudHandelse(s, 'atten', `barnet ${ch.name} som föddes`); // steg 4.1.5
  tanke(mother, 'fickBarnet', s.now, { namn: ch.name, v: LIV.fodMor, tid: LIV.fodDygn * DAY });
  if (father && alive(father)) tanke(father, 'fickBarnet', s.now, { namn: ch.name, v: LIV.fodFar, tid: LIV.fodDygn * DAY });
  const kids = s.people.filter(q => q.mother === mother.id).length;
  if (kids === 6) mother.fame.push('Mor till många barn');
  if (risk.tva && s.people.filter(q => q.mother === mother.id && q.born === s.now).length < 2) { const tv = newPerson(s, rnd(s, 'folk') < 0.5 ? 'm' : 'k', s.now, mother, father); tv.x = mother.x; tv.y = mother.y; s.people.push(tv); const ft2 = kronikaBer(s, 'k_fodd', tv.id, { namn: tv.name, barnet: tv.sex === 'k' ? 'dotter' : 'son', mor: mother.name, foraldrar: mother.name + (father ? ' och ' + father.name : ''), syskon: s.people.filter(q => q !== tv && q.mother === mother.id).length }); log(s, ft2, 'birth', [tv.id, mother.id, ...(father ? [father.id] : [])]).m = 'k_fodd'; notis(s, 'fodd', ft2, [tv.id, mother.id, ...(father ? [father.id] : [])]); /* tvillingen får sin rad i loggen, notiserna och krönikan (steg 9.9.3) */ count(s, 'fodda'); count(s, 'tvillingar'); uppvaxtFodd(s, tv); startSmak(s, tv); uppkalladLogg(s, tv); } // tvillingar (steg 9.5.29)
  if (rnd(s, 'halsa', mother) < risk.mor) die(s, mother, 'barnsang');
  const tv = s.people.filter(q => q.mother === mother.id && q.born === s.now && alive(q));
  if (tv.length >= 2) for (const q of [mother, father]) if (q) tecken(s, q, 'tvillingar', tv.map(b => b.name).join(' och ')); // tvillingar som föds levande (steg 10.3.7)
}

// ---------- befolkningen regleras ----------
// En stor by blir trång: fler flyttar ut och färre vill ha barn. En liten by lockar nybyggare och barn blir viktigare.
// Att hålla nere befolkningen är starkare än att höja den. Nöjda invånare stannar, så en välfungerande by kan bli stor.
// När byn är liten spelar humöret mindre roll för om folk flyttar.
const crowd = (pop: number) => clamp((pop - LIV.trangFran) / LIV.trangSpann, 0, LIV.trangMax); // 0 upp till 24 invånare, 1 vid 40
export function birthWish(pop: number) { return pop <= LIV.barnLiten ? 1 + LIV.barnLitenOkning * (LIV.barnLiten - pop) : clamp(1 - (pop - LIV.barnTrangFran) * LIV.barnTrangTapp, LIV.barnMin, 1); }
// flyttarna per dygn delade efter orsaken: trängseln och missnöjet (det som missnöjet lägger till i en trång by räknas till missnöjet)
export function flyttDelar(pop: number, mood: number) {
  const unhappy = clamp((LIV.nojd - mood) * LIV.missnoje, 0, LIV.missnojeMax), w = clamp((pop - LIV.flyttaFran) / LIV.flyttaSpann, LIV.flyttaMin, 1), c = crowd(pop) ** 2;
  return { trang: c * LIV.flyttTrang, missnoje: c * LIV.flyttTrangMissnoje * unhappy * w + LIV.flyttMissnoje * unhappy * w };
}
export function emigrationRate(pop: number, mood: number) { const d = flyttDelar(pop, mood); return d.trang + d.missnoje; } // flyttar per dygn
export const immigrationRate = (pop: number) => pop < LIV.nybyggareUnder ? LIV.nybyggare * (LIV.nybyggareUnder - pop) / LIV.nybyggareUnder : 0; // nybyggare per dygn
// Hur gott om mat byn har haft (steg 1.7.2): maten i förrådet räknad i dygn för alla, som ett glidande snitt över ungefär
// ett dygn (ett år i spelet) så att årstiderna jämnas ut. 0 vid 1 dygns mat i snitt, 1 vid 3,5 eller mer. Är maten knapp
// föds färre barn (barnMat), fler flyttar (hungerFlytt) och färre nybyggare stannar: så når byn det tak som marken och redskapen kan föda, utan
// att folk svälter ihjäl. En by på sju eller färre flyttar inte för maten
// samma regler ur ett snitt av maten i dygn (gott, 0–1), för en by i världen (rad.ts, steg 11.3.2)
export const matGottAv = (snitt: number) => clamp((snitt - LIV.matGottFran) / LIV.matGottSpann, 0, 1);
export const barnMatAv = (gott: number, pop: number) => 1 - LIV.barnMatTapp * (1 - gott) * clamp((pop - LIV.barnMatFran) / LIV.barnMatSpann, 0, 1); // färre barn: från sju invånare
export const hungerFlyttAv = (gott: number, pop: number) => LIV.hungerTakt * (1 - gott) * clamp((pop - LIV.hungerFran) / LIV.hungerSpann, 0, 1); // flyttar per dygn
export const matGott = (s: State) => matGottAv(s.matSnitt ?? LIV.matStart);
// hur väl maten räcker vintern ut (steg 12.6.5): 0 utan mat, 1 när förrådet räcker barnVinter gånger dygnen kvar till istidens slut
export function vinterGott(s: State) {
  const k = kalender(s), kvar = (k.slut - s.now) / DAY + (foreIstiden(k.ai) ? 7 : 0);
  return clamp(foodDays(s) / Math.max(1, LIV.barnVinter * kvar), 0, 1);
}
export const barnMat = (s: State, pop: number) => barnMatAv(LIV.barnVinter > 0 && kallTid(ageIndex(s)) ? vinterGott(s) : matGott(s), pop);
export const hungerFlytt = (s: State, pop: number) => hungerFlyttAv(matGott(s), pop);
export function regulate(s: State, dtSec: number) {
  const pop = living(s).length;
  if (pop === 0) { if (!s.people.some(alive)) refound(s); return; } // byn är tom bara när ingen bybo lever, inte när alla är borta (steg 11.2.4)
  const fd = foodDays(s);
  s.matSnitt = s.matSnitt === undefined ? fd : s.matSnitt + (fd - s.matSnitt) * Math.min(1, dtSec * SEC / (LIV.matSnittDygn * DAY));
  if (rnd(s, 'flytt') < dtSec / HOUR_S) { // humöret räknas om ungefär en gång i timmen
    const d = { ...flyttDelar(pop, avgMood(s, LIV.nojd)), hunger: hungerFlytt(s, pop) }, rate = d.trang + d.missnoje + d.hunger;
    if (chance(s, rate / 86400, HOUR_S, 'flytt')) emigrate(s, (Object.keys(d) as FlyttSkal[]).reduce((m, k) => d[k] > d[m] ? k : m), { hunger: rate > 0 ? d.hunger / rate : 0, missnoje: rate > 0 ? d.missnoje / rate : 0 }); // texten efter den största orsaken (steg 12.1.65)
  }
  if (chance(s, immigrationRate(pop) * (LIV.nybyggareMatMin + LIV.nybyggareMat * matGott(s)) / 86400, dtSec, 'flytt')) immigrate(s, false);
  // de som flyttat hit från en by i världen kommer som främlingar (flytten, byflytt.ts, steg 11.3.5)
  for (const fran of s.varld?.tillHuvud?.splice(0) ?? []) framling(s, undefined, fran);
  // grannbyarnas sändebud kommer som gäster (steg 11.6.23)
  for (const b of s.varld?.budTillHuvud?.splice(0) ?? []) sandebud(s, b.fran, b.ton, b.gava, b.vem);
}
// ---------- sändebudet från en grannby (steg 11.6.23, Flera samhällen: Sändebudet) ----------
// Budet går in på kartan från kanten mot grannbyn, går till ledaren (eller elden), pratar med hen en stund som främlingen gör,
// och efter samtalet verkar beskedet: huvudbyns syn på grannbyn går upp (vänligt) eller ner (ovänligt). En gåva läggs i
// förrådet, som hela saker. Dör budet eller går det innan samtalet är klart ändrar det inget. Sedan går hen hem igen
export function sandebud(s: State, fran: number, ton: import('./byhandling').BeskedTon, gava?: import('./handel').HVara[], vem?: { namn: string; sex: 'm' | 'k' }) {
  const rad = s.varld?.rader?.find(r => r.nr === fran), k = rad?.syn;
  if (!k) return undefined;
  const sex0 = rnd(s, 'klan') < 0.5 ? 'm' as const : 'k' as const, namn0 = makeName(s, sex0, 'klan'), sex = vem?.sex ?? sex0, namn = vem?.namn ?? namn0, age = 25 + rnd(s, 'klan') * 20;
  const id = nyttGastId(s), ut = kantMot(s, k.id) ?? kanten(s, W / 2, 0);
  const p = nyGast(s, { id, namn, sex, fodd: s.now - age * DAY, rad: { sort: 'sandebud', klan: k.id, hem: k.hem, fas: 'kommer', besked: ton, hemRad: fran, ...gava?.length ? { gava } : {} }, x: ut.x, y: ut.y, nyckel: (s.gastNr ?? 0) * 7919 + fran, skill: { handel: Math.round(5 + rnd(s, 'klan') * 10) } });
  s.people.push(p);
  count(s, 'sandebudKommer');
  log(s, `Ett sändebud från ${k.namn} kommer gående mot byn.`, 'move', [p.id]);
  return p;
}
// samtalet är slut: sändebudets besked verkar, gåvan läggs i förrådet, och budet går hem
// budet med lösen för en fånge (steg 11.12.7): fangeval.ts sätter kroken
export const budKrok: { losen?: (s: State, bud: Person) => void; blirBybo?: (s: State, p: Person, k?: Klan) => void } = {};
export function beskedVerkar(s: State, p: Person) {
  const g = p.gast!, vl = s.varld, k = klanById(s, g.klan), r = vl?.rader?.find(x => x.nr === g.hemRad);
  g.fas = 'gar'; g.path = undefined; g.pk = undefined;
  if (g.losenFor !== undefined) { budKrok.losen?.(s, p); return; }
  if (!vl || !r || vl.huvud === undefined || !g.besked) return;
  byHandelse(vl, g.besked, r.nr, vl.huvud);
  let varde = 0;
  for (const w of g.gava ?? []) { laggIn(s, w.k, w.n); varde += w.n * grundvarde(w.k); }
  if (varde > 0) byHandelse(vl, 'gava', r.nr, vl.huvud, gavaRel(varde) / BYREL.gava);
  const l = ledarenNu(s), vem = l ? l.name : 'byn', vanligt = g.besked === 'besked';
  const gavaText = g.gava?.length ? `, och lämnade ${och(g.gava.map(w => antal(w.n, w.k)))} som gåva` : '';
  const text = `${p.name}, sändebud från ${k?.namn ?? 'en grannby'}, bar ${vanligt ? 'ett vänligt' : 'ett ovänligt'} besked till ${vem}${gavaText}.`;
  g.gava = undefined;
  count(s, vanligt ? 'sandebudVanligt' : 'sandebudOvanligt');
  log(s, text, 'move', [p.id, ...l ? [l.id] : []]); notis(s, 'sandebud', text, [p.id]); kronika(s, text, 'sandebud');
}
// en främling från en grannby: den som flyttat hit från byn fran (flytten, byflytt.ts, steg 11.3.5), annars (scenarierna) från
// en grannby som inte tycker illa om byn (steg 4.4.4.2), oftare från en som ligger nära (narhet). Hen kan ofta en teknik som ingen i byn kan, men
// vars krav byn kan, och tekniken under den. Främlingen kommer gående (steg 9.2.115): hen är en gäst som går in på kartan
// från kanten som pekar mot grannbyn (steg 11.2.22), mot ledaren (eller elden när byn saknar ledare), pratar med hen en stund och stannar som bybo eller
// går igen (framlingSteg). Byn avgör: ledaren, eller de vuxna om byn saknar ledare. Det väger tekniken, klanens inställning,
// seden Förnyelse – Tradition, trängseln och maten. Klanen minns hur det gick
export function framling(s: State, tvinga?: { tek?: string; ja?: boolean }, fran?: number) {
  const kan = klanerOf(s).filter(k => k.inst > KLAN.handelMin);
  const egen = fran === undefined ? undefined : s.varld?.rader?.find(r => r.nr === fran)?.syn;
  if (!egen && !kan.length) return undefined;
  const k = egen ?? pickViktat(s, kan, kan.map(narhet), 'klan'), folk = living(s);
  const kunnat = new Set(folk.flatMap(p => Object.keys(p.tek ?? {}).filter(id => knows(p, id))));
  const nya = TEKNIK.filter(t => !kunnat.has(t.id) && t.krav.every(id => kunnat.has(id)));
  const tek = tvinga ? tvinga.tek : nya.length && rnd(s, 'klan') < KLAN.framlingTek ? pick(s, nya, 'klan').id : undefined;
  const sex = rnd(s, 'klan') < 0.5 ? 'm' : 'k';
  const age = LIV.nybyggareAlder + rnd(s, 'folk') * LIV.nybyggareAlderSpann, p = newPerson(s, sex, s.now - age * DAY);
  startSkills(s, p, age); startSmak(s, p);
  p.fran = k.id;
  if (tek) { const lar = (id: string) => { if (knows(p, id)) return; (p.tek ??= {})[id] = 1; for (const x of TEK[id]?.krav ?? []) lar(x); }; lar(tek); }
  // gästen: id som en gäst, och bybons id väntar tills hen får stanna
  const blir = p.id, ut = kantMot(s, k.id) ?? kanten(s, p.x, p.y);
  p.id = nyttGastId(s); p.x = ut.x; p.y = ut.y;
  p.gast = { sort: 'framling', klan: k.id, hem: k.hem, blir, fas: 'kommer', ...(tek ? { tek } : {}), ...(tvinga?.ja !== undefined ? { ja: tvinga.ja } : {}), ...(egen ? { hemRad: fran } : {}) };
  gastensPlatser(s, p); // det hens by känner (steg 11.4.11)
  { let i = 0; klanTatKrok.klan(s, p, k.id, () => hash3(s.seed, blir, i++, 0x7a71e5)); } // klanens märken, ur hens egen slump (steg 12.1.165)
  s.people.push(p);
  count(s, 'framlingKommer');
  log(s, `En främling från ${k.namn} kommer gående mot byn.`, 'move', [p.id]);
  return p;
}
// närmaste kanten som inte är vatten, från (x, y): när grannbyn inte har någon plats i världen
function kanten(s: State, x: number, y: number) {
  const m = getMap(s.seed);
  return kanterna(x, y).find(k => m.tiles[Math.floor(k.y) * W + Math.floor(k.x)] !== T.Vatten) ?? kanterna(x, y)[0];
}
export const ledarenNu = (s: State) => { const lid = s.styre?.ledare, l = lid === undefined ? undefined : byId(s, lid); return l && alive(l) ? l : undefined; };
// främlingarna går, pratar och går igen (steg.ts, varje slag)
export function framlingSteg(s: State, dtSec: number) {
  const t0 = s.now - dtSec * SEC;
  for (const p of s.people.filter(q => q.gast && (GASTSORTER[q.gast.sort] as GastSortDef).efter && q.died === undefined && q.left === undefined)) { // främlingar och sändebud (GASTSORTER.efter)
    const g = p.gast!;
    if (g.fas === 'kommer') {
      const l = ledarenNu(s), mal = l ?? eldPlats(s), kvar = gaMot(s, p, mal.x, mal.y + (l ? 0.8 : 1.2), dtSec, t0);
      if (kvar < 0) { const f = freeNear(s, mal.x, mal.y + 1.2); p.x = f.x; p.y = f.y; } // ingen väg: hen hittar fram ändå
      if (kvar <= KLAN.framlingNara) {
        g.fas = 'pratar'; g.till = s.now + KLAN.framlingPrat * MIN; g.path = undefined; g.pk = undefined;
        log(s, `${p.name} från ${klanById(s, g.klan)?.namn ?? 'en grannklan'} pratar med ${l ? l.name : 'byn'}.`, 'move', [p.id, ...(l ? [l.id] : [])]);
        if (l) { tanke(l, g.sort === 'sandebud' ? 'pratadeSandebud' : 'pratadeFramling', s.now); prisIPrat(s, l, p); horOmGast(s, l, p, 1); } // främlingen berättar vad något kostar (steg 10.5.15) och var hen kommer ifrån (steg 11.4.2)
      }
    } else if (g.fas === 'pratar') {
      if (s.now >= (g.till ?? 0)) { if ((GASTSORTER[g.sort] as GastSortDef).efter === 'besked') beskedVerkar(s, p); else framlingBeslut(s, p); }
    } else if (g.fas === 'gar') {
      const ut = kantMot(s, g.klan) ?? kanten(s, p.x, p.y), kvar = gaMot(s, p, ut.x, ut.y, dtSec, t0); // hem mot grannbyn (steg 11.2.22)
      if (kvar >= 0 && kvar < 0.5 || kvar < 0) gastGar(s, p.id, true);
    }
  }
}
// hur gärna byn tar emot någon från klanen k (främlingen, och fången som vill stanna, steg 11.12.7): tekniken, klanens
// inställning, seden Förnyelse – Tradition, trängseln och maten
export function taEmotVilja(s: State, k: Klan, tek?: string) {
  return KLAN.taEmot + (tek ? KLAN.taEmotTek : 0) + k.inst / 100 * KLAN.taEmotInst + (s.seder.v.nyfikenhet ?? 0) * KLAN.taEmotSed
    - Math.min(1, crowd(living(s).length)) * KLAN.taEmotTrang - (1 - matGott(s)) * KLAN.taEmotMat;
}
// fången som tas upp i byn (steg 11.12.7, fangeval.ts): gästen blir bybo med ett nytt id, och plaggen hen bär blir hens
budKrok.blirBybo = (s, p, k) => {
  const gid = p.id, id = s.nextId++;
  for (const t of (s.gastTing ?? []).filter(t => t.agare === gid)) (s.ting ??= []).push({ id: s.nextTing = (s.nextTing ?? 0) + 1, k: t.k, c: t.c, agare: id, ...(t.bar !== undefined ? { bar: id } : {}), ...(t.hos !== undefined ? { hos: id } : {}), ...(t.q !== undefined ? { q: t.q } : {}), ...(t.ber ? { ber: t.ber } : {}) });
  s.gastTing = s.gastTing?.filter(t => t.agare !== gid); if (!s.gastTing?.length) delete s.gastTing;
  p.id = id; p.gast = undefined; p.task = undefined; p.fange = undefined; if (k) p.fran = k.id;
  if (isWall(s, p.x, p.y) || vattenNu(s)[tileOf(p.x, p.y)] === T.Vatten) { const f = freeNear(s, Math.floor(p.x), Math.floor(p.y)); p.x = f.x + 0.5; p.y = f.y + 0.5; }
  upplev(s, p, 'flyttade');
  if (k) klanHandelse(s.varld, k, 'mottagen');
  const text = `${p.name}, som satt fången i byn, fick stanna och blev en av byns folk.`;
  log(s, text, 'move', [p.id]); notis(s, 'inflytt', text, [p.id]); kronika(s, text, 'flytt');
};
// samtalet är slut: byn avgör om främlingen får stanna
export function framlingBeslut(s: State, p: Person) {
  const g = p.gast!, k = klanById(s, g.klan);
  if (!k) { g.fas = 'gar'; return undefined; }
  const tek = g.tek, v = taEmotVilja(s, k, tek);
  const ja = g.ja ?? rnd(s, 'klan') < v;
  const l = ledarenNu(s), vem = l ? l.name : 'Byn', tekNamn = tek ? TEK[tek]?.namn.toLowerCase() : '';
  if (!ja) {
    klanHandelse(s.varld, k, 'bortvisad'); count(s, 'framlingNej');
    const hem = g.hemRad === undefined ? undefined : s.varld?.rader?.find(r => r.nr === g.hemRad);
    if (hem && hem.tal.folk >= 0 && hem.sort === 'by') hem.tal.folk += 1; // den som flyttat hit går hem igen (byflytt.ts)
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
  klanHandelse(s.varld, k, 'mottagen'); count(s, 'framling'); if (tek) count(s, 'framlingTek'); budTillfalle(s, 'framling', p); // främlingen får mat (budet, steg 8.6.6)
  const text = `${p.name} från ${k.namn} kom till byn${tek ? ` och kunde ${tekNamn}, som ingen i byn kunde` : ''}. ${vem} lät ${honom(p)} stanna.`;
  log(s, text, 'move', [p.id]); notis(s, 'inflytt', text, [p.id]);
  if (tek) kronika(s, text, 'flytt');
  return p;
}
// en nybyggare (ibland ett par) kommer vandrande och slår sig ner, med lite rötter (ungefär ett dygns mat, ett år i spelet)
// i en by med en värld kommer nybyggarna ur en by i grannätet, som får färre invånare (steg 11.6.13); kan ingen by skicka dem
// kommer ingen. Den som återgrundar byn (alone) kommer långt bortifrån och tas inte ur någon by
export function immigrate(s: State, alone: boolean): Person | undefined {
  const par = !alone && rnd(s, 'flytt') < LIV.parChans;
  const ur = alone ? undefined : radKrok.nybyggare(s, par ? 2 : 1);
  if (ur === null) return undefined;
  const mk = (sex: 'm' | 'k') => {
    const age = LIV.nybyggareAlder + rnd(s, 'folk') * LIV.nybyggareAlderSpann, p = newPerson(s, sex, s.now - age * DAY);
    startSkills(s, p, age); startSmak(s, p);
    { const k = barSmitta(s); if (k) insjukna(s, p, k, 'utifrån'); } // främlingen kan bära en sjukdom (steg 9.5.5)
    s.people.push(p);
    upplev(s, p, 'flyttade'); // steg 4.1.1.2
    for (const k in MEDHAVT) put(s, k, MEDHAVT[k], { [p.id]: MEDHAVT[k] }); // lite mat från vandringen, så att man hinner samla innan man svälter
    return p;
  };
  const a = mk(rnd(s, 'folk') < 0.5 ? 'm' : 'k'), varifran = ur ? ` från ${ur.namn}` : '';
  if (ur?.syn) a.fran = ur.syn.id;
  if (par) {
    const b = mk(a.sex === 'm' ? 'k' : 'm');
    if (ur?.syn) b.fran = ur.syn.id;
    pair(s, a, b, true);
    log(s, `${a.name} och ${b.name} kom vandrande${varifran} och slog sig ner i byn.`, 'move', [a.id, b.id]);
  } else log(s, `${a.name} kom vandrande${varifran} och slog sig ner i byn.`, 'move', [a.id]);
  count(s, 'invandrade');
  return a;
}
// alla är borta: en vandrare hittar den övergivna boplatsen och grundar byn på nytt
function refound(s: State) {
  const p = immigrate(s, true)!;
  p.grundare = 'ny';
  stallVagn(s); // hen kom med en vagn långt bortifrån (steg 11.6.13)
  count(s, 'atergrundad'); kronikaBer(s, 'k_atergrundad', p.id, personFalt(p));
  log(s, `${p.name} hittade den övergivna boplatsen och grundade byn på nytt.`, 'world', [p.id]);
}

// de i med lämnar byn tillsammans: bördan läggs ner först, sedan packar var och en det hen orkar bära av allt hen äger (arv.ts)
// och resten blir byns. Den som blir kvar släpper sin partner, som när någon dör; ett par som flyttar tillsammans är kvar som par
export function leave(s: State, ...med: Person[]) {
  for (const p of med) { avbryt(s, p); p.left = s.now; p.skatteskuld = undefined; packUp(s, p); releaseOwner(s, p.id); } // skulden stryks när hen flyttar (steg 10.5.5)
  for (const q of living(s)) {
    const p = med.find(x => x.id === q.partner);
    if (p) { q.partner = undefined; tanke(q, 'saknarFlytt', s.now, { namn: p.name, v: LIV.saknarFlytt, tid: LIV.saknarFlyttDygn * DAY }); }
  }
  for (const q of s.people) if (alive(q) && !paKartan(q) && med.some(x => x.id === q.partner)) q.partner = undefined; // också den som är på resa
}

type FlyttSkal = BynsSkal;
// de som flyttade räknas, och deras vänner saknar dem
function utflyttade(s: State, med: Person[]) {
  count(s, 'utvandrade', med.length);
  for (const q of living(s)) for (const g of med) { const r = s.rels[relKey(q.id, g.id)]; if (r && r.op > REL.saknar) { tanke(q, 'saknarFlytt', s.now, { namn: g.name, v: LIV.saknarFlytt, tid: LIV.saknarFlyttDygn * DAY }); break; } }
}
// någon lämnar byn (B.42): den som går väljs efter de egna skälen (flyttVikt), och en partner och barnen följer med
function emigrate(s: State, skal: FlyttSkal, delar: FlyttDelar) {
  const now = s.now, folk = living(s), barn = (...f: Person[]) => folk.filter(c => f.some(q => isParent(q, c)) && ageOf(c, now) < ALDER.vuxen);
  const cands = folk.filter(p => p.partner !== undefined ? byId(s, p.partner) && ageOf(p, now) > LIV.parFran && ageOf(p, now) < LIV.parTill : ageOf(p, now) >= LIV.ensamFran && ageOf(p, now) < LIV.ensamTill);
  if (!cands.length) return;
  const a = pickViktat(s, cands, cands.map(p => flyttVikt(s, p, folk)), 'flytt'), b = byId(s, a.partner);
  const vuxna = b ? [a, b] : [a], med = [...vuxna, ...barn(...vuxna)];
  for (const p of vuxna) sattFlyttSkal(s, p, skal);
  const mat = foodOf(s);
  leave(s, ...med);
  const ny = b && utbrytning(s, med, folk.length); // ur en mycket stor by blir de en ny by i världen (steg 4.4.4.1, grannbyar.ts)
  if (!ny) flyttRad(s, med, vuxna.length, b ? 'för att grunda en egen boplats' : 'för att söka lyckan på annat håll');
  utflyttade(s, med);
  if (!ny) radKrok.utflytt(s, med.length, { delar, mat: mat - foodOf(s), med }); // annars går de till en by i världen (byflytt.ts, steg 11.3.5)
}

// sorgen i stadier (steg 9.2.33): q förlorade p. Först förlusten, och sorgTimme byter till sorgen och saknaden
function sorj(s: State, q: Person, p: Person, ord: string, v: number, dygn: number, dodFarg?: string) {
  tanke(q, 'forlorade', s.now, { ord, namn: p.name, v: v * LIV.forlust, tid: LIV.forlustDygn * DAY });
  if (dodFarg) fargKrok.sorjer(q, dodFarg); // tycke för den färg den döda bar (steg 13.3.5)
  (q.sorg ??= []).push({ namn: p.name, vem: p.id, ord, v, dygn, t0: s.now });
}
// en gång i timmen (steg.ts): den som sörjer går från förlusten till sorgen och sedan till saknaden
export function sorgTimme(s: State) {
  for (const q of living(s)) {
    if (!q.sorg?.length) continue;
    for (const g of q.sorg) {
      const t1 = g.t0 + LIV.forlustDygn * DAY, t2 = t1 + g.dygn * DAY;
      if (s.now >= t1 && !g.s2) { g.s2 = 1; const ft = tankeText('forlorade', { ord: g.ord, namn: g.namn }); q.thoughts = q.thoughts.filter(x => x.text !== ft); tanke(q, 'sorjer', s.now, { namn: g.namn, v: g.v, tid: t2 - s.now }); }
      if (s.now >= t2 && !g.s3) { g.s3 = 1; tanke(q, 'saknarSorg', s.now, { namn: g.namn, v: LIV.saknar, tid: LIV.saknasDygn * DAY }); }
    }
    q.sorg = q.sorg.filter(g => !g.s3);
    if (!q.sorg.length) q.sorg = undefined;
  }
}
