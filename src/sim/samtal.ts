import { fraktionSamtal } from './rost';
import { personHand } from './personlogg';
import { barnTill, upplev } from './uppvaxt';
import { ALDER, REL, ageOf, alive, budTillfalle, byId, count, franMitt, getRel, isKin, living, log, similarity, stat, think } from './folk';
import { blocked, isWall } from './byggnad';
import { sittAt, stationAt } from './stationer';
import { berattaBrist } from './naring';
import { moodOf } from './humor';
import { clamp, pickViktat, rnd } from './slump';
import { DAY, HOUR, Person, Rel, SEC, State } from './typer';
import { pair } from './varld';
import { share } from './minne';
import { askForGift } from './behov';
import { ACTS } from './handlingar';
import { balans } from './balans';
import { RELT, arArke, arBast, arMentor, arRivaler, minnsRel, skiljGrans } from './relationer';
import { tankePa } from './teknik';
import { loggBer, samtalAmne, samtalBorjar } from './berattelser';
import { predika } from './religion';
import { tystISporten } from './sport';

// ---------- balanstal (regel 8) ----------
// Samtalen: vem man pratar med, vilket slags samtal det blir, hur det går och vad det ger, och humöret. Relationen (op) går från
// -100 till 100 och humöret från 0 till 1 (gränserna för relationen, REL, står i folk.ts, åldern för flirt i ALDER)
export const SAMTAL = balans('samtal', {
  lagTanke: 0.5, // lag kommer man på hälften så fort som ledarskap, när man redan kan det
  radie: 4, // så nära (rutor) måste två vara för att prata, utan en hel vägg mellan sig (steg 10.2.16)
  ensamSek: 60, // den som har gått för att samtala och inte har någon att prata med så här länge (sekunder) slutar (steg 10.2.16)
  // den som väljer att samtala går fram till någon (steg 4.5.6.7): bland dem som gör något socialt inom sokR rutor från platsen
  // man skulle gått till, och ställer sig isar rutor från hen; när samtalet är slut går man isarGa rutor åt andra hållet och
  // står där isarTid sekunder innan man gör något annat
  sokR: 10,
  isar: 1,
  isarGa: 2,
  isarTid: 60,
  // vem man pratar med: vikten är 1 + op / valOp + kemi * valKemi + valPartner för partnern, minst valMin
  valMin: 0.1,
  valOp: 40,
  valKemi: 0.5,
  valPartner: 1.5,
  // vilket slag det blir, i den ordningen: gräl (dåligt humör eller osams), berättelse, flirt, tröst, djupt samtal, skämt, småprat
  gralHumor: 0.2, // är humöret lägre än så här grälar man ofta ...
  gralHumorChans: 0.2, // ... med så här stor chans (0,3 och 0,35 före steg 2.12.6)
  gralAgg: 0.5, // chanserna att gräla gånger 1 + gralAgg × (aggressionen − 10) / 10, minst gralAggMin (steg 3.7.6)
  gralAggMin: 0.3,
  gralOsamsChans: 0.05, // är man osams (under REL.gral) grälar man med så här stor chans. Det var 0,5 före steg 2.12.6: ett gräl
  // drog ner relationen under gränsen, och sedan blev det mest gräl tills alla i byn var ovänner (-100) och inga nya par blev till
  flirtBas: 0.12, // chansen att det blir flirt: flirtBas + romans / flirtRom, och flirtKemi mer om kemin är över flirtKemiGr
  flirtRom: 250,
  flirtKemiGr: 0.3,
  flirtKemi: 0.08,
  trostHumor: 0.35, // den andra har lägre humör än så här: man tröstar med chansen empati / trostEmpati
  trostEmpati: 25,
  djuptChans: 0.3, // är man goda vänner (över REL.van) blir det ett djupt samtal med så här stor chans
  skamtChans: 0.25, // annars ett skämt med så här stor chans, annars småprat
  // hur samtalet går (ut): kemi * utKemi + likhet * utLikhet + empatin hos båda / utEmpati - utAvdrag + (slump - 0,5) * utBrus
  utKemi: 1.1,
  utLikhet: 0.7,
  utEmpati: 40,
  utAvdrag: 0.55,
  utBrus: 1.4,
  slaktUt: 0.35, // släkt går det så här mycket bättre för
  charmDiv: 15, // charmen hos den andra (karisma och skönhet, 0 till 20) ger (charm - 8) / charmDiv till vänskapen (like)
  // vad ett samtal ger: relationen ändras med vikten gånger (ut + like), där like är charmen. Vikten per slag (SAMTALSSLAG nedan):
  vSmaprat: 1,
  vSkamt: 1.6,
  vDjupt: 2.6,
  vTrost: 2.2,
  vBerattelse: 1.2,
  vFlirt: 1,
  skamtOvan: 1.2, // ett skämt som faller dåligt (ut under noll) gör det så här mycket värre
  gralOp: 3, // ett gräl sänker relationen med gralOp + slump * gralSpann ...
  gralSpann: 3,
  gralTankeEgen: 0.08, // ... och den som började mår så här mycket sämre i gralTim timmar, den andra gralTankeAndra
  gralTankeAndra: 0.1,
  gralTim: 6,
  trostMin: -0.3, // en tröst där ut + like (like: charmen, ovan) är över detta gör den tröstade gladare ...
  trostTanke: 0.08, // ... så här mycket i trostTim timmar
  trostTim: 4,
  skaldLar: 0.5, // ... och skaldskapen (steg 4.3.2.5) med skaldLar gånger lika mycket
  berattaLar: 0.04, // en berättelse övar berättande med berattaLar * (berattaInt + intelligens / berattaDiv)
  berattaInt: 0.5,
  berattaDiv: 20,
  ledTanke: 240, // ett samtal (inte gräl) får den vuxna att tänka på ledarskap i så här många sekunder (steg 3.5.1, teknik.ts)
  flirtAtt: 40, // attraktionen (skönhet och karisma hos den andra) är (skönhet + karisma) / flirtAtt, och romansen ökar med (ut + attraktion) * flirtRomOk
  flirtRomOk: 4,
  umgange: 0.06, // båda blir så här mycket mer sociala av ett samtal
  gavaMin: -0.5, // frågar man efter en gåva (mat, ved, redskap) om ut + like är över detta
  skiltRom: 10, // romansen är så här stor efter en separation ...
  skiltTanke: 0.15, // ... och båda mår så här mycket sämre i skiltDygn dygn
  skiltDygn: 1,
});

// ---------- samtalens slag (registret) ----------
// Vilket slag det blir väljs i converse, i den ordning som står i SAMTAL. v = vikten: relationen ändras med v gånger (ut + like).
// dela = talet i MINNE (minne.ts) som gör att man berättar mer om platser. lar = talet i TEKTAL (teknik.ts) som är chansen att
// lära ut en teknik; saknas det gäller larChans. Pratbubblans färg står i ui/manniskor.ts
export interface SamtalDef { v: number; dela?: 'delaBerattelse' | 'delaDjupt'; lar?: 'larChansBra' }
const SLAG = {
  'småprat': { v: SAMTAL.vSmaprat },
  'skämt': { v: SAMTAL.vSkamt },
  'djupt samtal': { v: SAMTAL.vDjupt, dela: 'delaDjupt', lar: 'larChansBra' },
  'tröst': { v: SAMTAL.vTrost },
  'berättelse': { v: SAMTAL.vBerattelse, dela: 'delaBerattelse', lar: 'larChansBra' },
  'flirt': { v: SAMTAL.vFlirt },
  'gräl': { v: 0 },
} satisfies Record<string, SamtalDef>;
export type Samtalsslag = keyof typeof SLAG;
export const SAMTALSSLAG: Record<Samtalsslag, SamtalDef> = SLAG;

// ---------- samtal ----------
// vikten för att välja b att samtala med: relationen, kemin, partnern, bästa vännen och mentorn
const valVikt = (s: State, a: Person, b: Person) => { const r = getRel(s, a, b); return Math.max(SAMTAL.valMin, 1 + r.op / SAMTAL.valOp + r.chem * SAMTAL.valKemi + (b.partner === a.id ? SAMTAL.valPartner : 0)
  + (arBast(a, b) ? RELT.valBast : 0) + (arMentor(a, b) || arMentor(b, a) ? RELT.valMentor : 0)); };
// den som väljer att samtala (handlingen samtal, val.ts) går fram till någon och ställer sig bredvid hen, ungefär en ruta
// isär (steg 4.5.6.7): bland dem som redan gör något socialt nära platsen, viktat som samtalen. Den andra blir kvar där
// hen är (den som tvinnar, rensar eller vaktar flyttar sig inte), och samtalar hen också vänder hen sig mot den som kom.
// Finns ingen, eller ingen plats bredvid, går man till platsen vid elden som förut
export function samtalMed(s: State, p: Person) {
  const t = p.task!, now = s.now;
  const kand = living(s).filter(q => q !== p && q.task?.phase === 'do' && kanPrata(s, q) && q.task.med === undefined && !ACTS[q.task.act].vandra && !ACTS[q.task.act].tur && !ACTS[q.task.act].radie && ageOf(q, now) >= ALDER.smabarn
    && Math.hypot(q.x - t.tx, q.y - t.ty) < SAMTAL.sokR);
  if (!kand.length) return;
  const q = pickViktat(s, kand, kand.map(b => valVikt(s, p, b)), 'samtal', p);
  const upptagen = (x: number, y: number) => living(s).some(o => o !== p && o !== q && Math.hypot(o.x - x, o.y - y) < SAMTAL.isar * 0.6);
  const a0 = Math.atan2(p.y - q.y, p.x - q.x);
  for (let k = 0; k < 8; k++) {
    const ang = a0 + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * Math.PI / 4, x = q.x + Math.cos(ang) * SAMTAL.isar, y = q.y + Math.sin(ang) * SAMTAL.isar;
    if (blocked(s, x, y) || stationAt(s, x, y) || sittAt(s, x, y) || upptagen(x, y)) continue;
    t.tx = x; t.ty = y; t.med = q.id;
    if (q.task!.act === 'samtal') q.task!.med = p.id;
    count(s, 'samtal bredvid');
    return;
  }
}
// samtalet är slut (steg 4.5.6.7): man går ett par rutor bort från den man pratat med, åt var sitt håll, och står där en stund
// innan man väljer något annat. true = så blev det
export function skiljsAt(s: State, p: Person) {
  const t = p.task!, q = t.med !== undefined ? byId(s, t.med) : undefined;
  if (q?.task?.med === p.id) q.task.med = undefined;
  t.med = undefined;
  if (!q || !alive(q)) return false;
  const ang = Math.atan2(p.y - q.y, p.x - q.x);
  for (let k = 0; k < 6; k++) {
    const v = ang + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * Math.PI / 5, x = p.x + Math.cos(v) * SAMTAL.isarGa, y = p.y + Math.sin(v) * SAMTAL.isarGa;
    if (blocked(s, x, y) || stationAt(s, x, y) || sittAt(s, x, y)) continue; // inte på en stubbe vid bordet
    t.tx = x; t.ty = y; t.phase = 'go'; t.skiljs = 1; t.until = s.now + SAMTAL.isarTid * SEC; t.path = undefined; t.pk = undefined;
    count(s, 'samtal isar');
    return true;
  }
  return false;
}
// om p håller på med något socialt just nu (vid elden, i samtal); hur nära man ska vara för att prata står i SAMTAL.radie
export const isSocial = (p: Person) => !!p.task && p.task.phase === 'do' && !!ACTS[p.task.act].social;
// kan p prata just nu (steg 9.2.100)? En social aktivitet där registret inte säger att man är tyst
export const kanPrata = (s: State, p: Person) => isSocial(p) && !ACTS[p.task!.act].tyst && !(p.task!.act === 'sport' && tystISporten(s, p));
// hur länge ett samtal syns efteråt: bubblan i byn och ämnet i personrutan (sekunder i spelet, steg 3.10.3 och 4.5.3.3)
export const PRATAR_SEK = 20;
// står en hel vägg mellan a och b (steg 10.2.16)? En dörr eller en öppning gör det inte (isWall: bara väggens rutor)
export function vaggMellan(s: State, a: { x: number; y: number }, b: { x: number; y: number }) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 0.25);
  for (let i = 1; i < n; i++) { const f = i / n; if (isWall(s, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)) return true; }
  return false;
}
// två som kan höra varandra: nära (SAMTAL.radie) och utan vägg emellan
export const horHar = (s: State, a: Person, b: Person) => Math.hypot(b.x - a.x, b.y - a.y) < SAMTAL.radie && !vaggMellan(s, a, b);
// den som p pratar med just nu: båda gör något socialt, står nära och samtalet är färskt (bara för gränssnittet)
export function pratarMed(s: State, p: Person) {
  const m = p.prat?.m, q = m !== undefined ? s.people.find(x => x.id === m) : undefined;
  return q && alive(q) && kanPrata(s, p) && kanPrata(s, q) && horHar(s, p, q) && s.now - p.prat!.t < PRATAR_SEK * SEC ? q : undefined;
}
export interface TalkEvent { a: number; b: number; kind: Samtalsslag; good: boolean; t: number; i?: string } // i: ämnets symbol (steg 3.9.5)
// ger den andra om samtalet blev ett gräl (steg 3.7.2: gräl kan bli slagsmål, strid.ts)
export function converse(s: State, a: Person, others: Person[], events?: TalkEvent[]): Person | undefined {
  const now = s.now;
  if (!others.length) return;
  // välj samtalspartner viktad efter relation
  const b = pickViktat(s, others, others.map(o => valVikt(s, a, o)), 'samtal', a); // bästa vänner och mentorer (steg 3.1.1)
  fraktionSamtal(s, a, b); // viljan att byta ledare sprids (steg 8.3.11)
  const r = getRel(s, a, b);
  const aa = ageOf(a, now), ba = ageOf(b, now);
  const mood = moodOf(a, now);
  let kind: Samtalsslag;
  const canFlirt = aa >= ALDER.flirtFran && ba >= ALDER.flirtFran && a.sex !== b.sex && !isKin(a, b) && Math.abs(aa - ba) < ALDER.flirtSkillnad &&
    ((a.partner === undefined && b.partner === undefined) || a.partner === b.id);
  // med sin ärkefiende grälar man nästan alltid, med en rival lite oftare (steg 3.1.1)
  const gralExtra = arArke(a, b) ? RELT.arkeGral : arRivaler(a, b) ? RELT.rivalGral : 0;
  const ag = Math.max(SAMTAL.gralAggMin, 1 + SAMTAL.gralAgg * franMitt(a, 'aggression', now)) * (1 + RUS.gral * rusAv(a)); // den aggressiva grälar oftare (steg 3.7.6), och den berusade (steg 9.6.15)
  if ((mood < SAMTAL.gralHumor && rnd(s, 'samtal', a) < SAMTAL.gralHumorChans * ag) || (r.op < REL.gral && rnd(s, 'samtal', a) < SAMTAL.gralOsamsChans * ag) || (gralExtra && rnd(s, 'samtal', a) < gralExtra * ag)) kind = 'gräl';
  else if (a.task?.act === 'beratta') kind = 'berättelse';
  else if (canFlirt && rnd(s, 'samtal', a) < SAMTAL.flirtBas + r.rom / SAMTAL.flirtRom + (r.chem > SAMTAL.flirtKemiGr ? SAMTAL.flirtKemi : 0) + RUS.flirt * rusAv(a)) kind = 'flirt';
  else if (moodOf(b, now) < SAMTAL.trostHumor && rnd(s, 'samtal', a) < stat(a, 'empati', now) / SAMTAL.trostEmpati) kind = 'tröst';
  else if (r.op > REL.van && rnd(s, 'samtal', a) < SAMTAL.djuptChans) kind = 'djupt samtal';
  else if (rnd(s, 'samtal', a) < SAMTAL.skamtChans) kind = 'skämt';
  else kind = 'småprat';

  // hur samtalet går: kemi, likhet och empati, och hur charmig och vacker den andra är. Den med låg karisma och
  // skönhet blir lättare illa omtyckt.
  const charm = (stat(b, 'karisma', now) + stat(b, 'skonhet', now)) / 2;
  let out = r.chem * SAMTAL.utKemi + similarity(a, b) * SAMTAL.utLikhet + (stat(a, 'empati', now) + stat(b, 'empati', now)) / SAMTAL.utEmpati - SAMTAL.utAvdrag + (rnd(s, 'samtal', a) - 0.5) * SAMTAL.utBrus;
  // charmen påverkar vänskapen, inte förälskelsen (den har egen dragning), och inte mellan par och släkt
  const like = a.partner === b.id || isKin(a, b) ? 0 : (charm - 8) / SAMTAL.charmDiv;
  if (isKin(a, b)) out += SAMTAL.slaktUt;
  if (kind === 'gräl') {
    r.op -= SAMTAL.gralOp + rnd(s, 'samtal', a) * SAMTAL.gralSpann;
    think(a, `Grälade med ${b.name}`, -SAMTAL.gralTankeEgen, now, SAMTAL.gralTim * HOUR);
    think(b, `Grälade med ${a.name}`, -SAMTAL.gralTankeAndra, now, SAMTAL.gralTim * HOUR);
    samtalAmne(s, a, b, kind); minnsRel(s, a, b, 'gral');
    if (a.partner === b.id) barnTill(s, a, b, 'gral'); // föräldrar som grälar ofta formar barnen (steg 3.1.2)
  } else {
    // vänskap växer allt långsammare ju närmare man redan är; ovänskap fördjupas lättare
    const d = SAMTALSSLAG[kind].v * (out + like) * (kind === 'skämt' && out < 0 ? SAMTAL.skamtOvan : 1);
    r.op += d;
    if (kind === 'tröst' && out + like > SAMTAL.trostMin) think(b, `Tröstades av ${a.name}`, SAMTAL.trostTanke, now, SAMTAL.trostTim * HOUR);
    if (kind === 'berättelse') { a.skill.berattande = clamp(a.skill.berattande + SAMTAL.berattaLar * (SAMTAL.berattaInt + a.pot.intelligens / SAMTAL.berattaDiv), 0, 20); a.skill.skaldskap = clamp(a.skill.skaldskap + SAMTAL.skaldLar * SAMTAL.berattaLar * (SAMTAL.berattaInt + a.pot.intelligens / SAMTAL.berattaDiv), 0, 20); }
    if (kind === 'flirt') {
      const att = (stat(b, 'skonhet', now) + stat(b, 'karisma', now)) / SAMTAL.flirtAtt;
      r.rom = clamp(r.rom + (out + att) * SAMTAL.flirtRomOk, 0, 100);
    }
    samtalBorjar(); // det som delas nu blir samtalets ämne (steg 3.9.5, berattelser.ts)
    share(s, a, b, r, SAMTALSSLAG[kind]); // man berättar vad man vet och lär ut vad man kan
    predika(s, a, b, r, kind); // och den som tror försöker övertyga (steg 4.1.2.2, religion.ts)
    if (a.tek?.ledarskap) tankePa(s, a, 'lag', SAMTAL.ledTanke * SAMTAL.lagTanke); // och sedan på lag (steg 8.4.1)
    tankePa(s, a, 'ledarskap', SAMTAL.ledTanke); // och kommer på vad som krävs för att leda (steg 3.5.1)
    berattaSmak(a, b, r.op); // och om sin favoritmat eller det man avskyr (steg 9.6.6)
    berattaBrist(a, b, now); // och vad man längtar efter ("jag längtar efter kött", steg 2.6.2)
    samtalAmne(s, a, b, kind);
    if (kind !== 'flirt' && out + like > SAMTAL.gavaMin) askForGift(s, a, b); // den som saknar något frågar efter det (mat, ved, redskap: behov.ts)
  }
  r.op = clamp(r.op, -100, 100);
  r.talks++;
  a.social = clamp(a.social + SAMTAL.umgange, 0, 1); b.social = clamp(b.social + SAMTAL.umgange, 0, 1);
  events?.push({ a: a.id, b: b.id, kind, good: kind !== 'gräl' && out > 0, t: now, i: a.prat?.i });

  if (r.op > REL.naraVan && !(r.flags & 1) && !isKin(a, b) && a.partner !== b.id) { r.flags |= 1; loggBer(s, 'l_vanner', a.id * 997 + b.id, { namn: a.name, med: b.name }, 'rel', [a.id, b.id]); }
  if (r.op < REL.ovan && !(r.flags & 2)) { r.flags |= 2; loggBer(s, 'l_ovanner', a.id * 997 + b.id, { namn: a.name, med: b.name }, 'rel', [a.id, b.id]); }
  if (r.rom > REL.parRom && r.op > REL.van && a.partner === undefined && b.partner === undefined && canFlirt && !budTillfalle(s, 'par', a, b)) pair(s, a, b); // buden om giftermål (steg 8.6.6)
  if (a.partner === b.id && r.op < skiljGrans(r)) skiljas(s, a, b, r); // ett gift par håller mer (steg 3.1.1)
  return kind === 'gräl' ? b : undefined;
}
// paret a och b går isär (när relationen blivit för dålig, eller i ett utbrott, humor.ts). En skilsmässa tar hårdare
export function skiljas(s: State, a: Person, b: Person, r: Rel) {
  const gift = r.gift !== undefined, f = gift ? RELT.skiljTanke : 1, ord = gift ? 'Skilde sig' : 'Separerade', now = s.now;
  a.partner = undefined; b.partner = undefined; r.rom = SAMTAL.skiltRom; r.par = undefined; r.gift = undefined;
  log(s, gift ? `${a.name} och ${b.name} skilde sig.` : `${a.name} och ${b.name} gick skilda vägar.`, 'rel', [a.id, b.id]);
  personHand(s, a, 'relation', gift ? `Skilde sig från ${b.name}.` : `Gick skilda vägar med ${b.name}.`); personHand(s, b, 'relation', gift ? `Skilde sig från ${a.name}.` : `Gick skilda vägar med ${a.name}.`); // steg 9.2.107
  if (gift) count(s, 'skilsmassa');
  barnTill(s, a, b, 'skilsmassa'); // barnen minns det (steg 3.1.2)
  upplev(s, b, 'lamnad', a.name); // den som blev lämnad (steg 4.1.1.2)
  think(a, `${ord} från ${b.name}`, -SAMTAL.skiltTanke * f, now, SAMTAL.skiltDygn * f * DAY); think(b, `${ord} från ${a.name}`, -SAMTAL.skiltTanke * f, now, SAMTAL.skiltDygn * f * DAY);
}
import { berattaSmak } from './rykten';
import { RUS, rusAv } from './rus';
