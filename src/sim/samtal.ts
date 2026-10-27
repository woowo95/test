import { ALDER, REL, ageOf, getRel, isKin, living, log, similarity, stat, think } from './folk';
import { halsa } from './halsa';
import { clamp, pickViktat, rnd } from './slump';
import { DAY, HOUR, Person, State } from './typer';
import { pair } from './varld';
import { share } from './minne';
import { askForGift } from './behov';
import { ACTS } from './handlingar';
import { balans } from './balans';

// ---------- balanstal (regel 8) ----------
// Samtalen: vem man pratar med, vilket slags samtal det blir, hur det går och vad det ger, och humöret. Relationen (op) går från
// -100 till 100 och humöret från 0 till 1 (gränserna för relationen, REL, står i folk.ts, åldern för flirt i ALDER)
export const SAMTAL = balans('samtal', {
  radie: 4, // så nära (rutor) måste två vara för att prata
  // vem man pratar med: vikten är 1 + op / valOp + kemi * valKemi + valPartner för partnern, minst valMin
  valMin: 0.1,
  valOp: 40,
  valKemi: 0.5,
  valPartner: 1.5,
  // vilket slag det blir, i den ordningen: gräl (dåligt humör eller osams), berättelse, flirt, tröst, djupt samtal, skämt, småprat
  gralHumor: 0.3, // är humöret lägre än så här grälar man ofta ...
  gralHumorChans: 0.35, // ... med så här stor chans
  gralOsamsChans: 0.5, // är man osams (under REL.gral) grälar man med så här stor chans
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
  berattaLar: 0.04, // en berättelse övar berättande med berattaLar * (berattaInt + intelligens / berattaDiv)
  berattaInt: 0.5,
  berattaDiv: 20,
  flirtAtt: 40, // attraktionen (skönhet och karisma hos den andra) är (skönhet + karisma) / flirtAtt, och romansen ökar med (ut + attraktion) * flirtRomOk
  flirtRomOk: 4,
  umgange: 0.06, // båda blir så här mycket mer sociala av ett samtal
  gavaMin: -0.5, // frågar man efter en gåva (mat, ved, redskap) om ut + like är över detta
  skiltRom: 10, // romansen är så här stor efter en separation ...
  skiltTanke: 0.15, // ... och båda mår så här mycket sämre i skiltDygn dygn
  skiltDygn: 1,
  // humöret: grundnivån, och vad som drar ner (Lag) eller upp (Hog) det
  humorBas: 0.55,
  humorHungerLag: 0.2, humorHungerMinus: 0.2, // hungern under 0,2 drar ner humöret med 0,2 ...
  humorHungerHog: 0.6, humorHungerPlus: 0.05, // ... och över 0,6 upp 0,05
  humorViloLag: 0.2, humorViloMinus: 0.12,
  humorSocialLag: 0.2, humorSocialMinus: 0.1,
  humorSocialHog: 0.7, humorSocialPlus: 0.05,
  humorHalsaLag: 0.6, humorHalsaMinus: 0.12,
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
// om p håller på med något socialt just nu (vid elden, i samtal); hur nära man ska vara för att prata står i SAMTAL.radie
export const isSocial = (p: Person) => !!p.task && p.task.phase === 'do' && !!ACTS[p.task.act].social;
export interface TalkEvent { a: number; b: number; kind: Samtalsslag; good: boolean; t: number }
export function converse(s: State, a: Person, others: Person[], events?: TalkEvent[]) {
  const now = s.now;
  if (!others.length) return;
  // välj samtalspartner viktad efter relation
  const w = others.map(b => { const r = getRel(s, a, b); return Math.max(SAMTAL.valMin, 1 + r.op / SAMTAL.valOp + r.chem * SAMTAL.valKemi + (b.partner === a.id ? SAMTAL.valPartner : 0)); });
  const b = pickViktat(s, others, w, 'samtal', a);
  const r = getRel(s, a, b);
  const aa = ageOf(a, now), ba = ageOf(b, now);
  const mood = moodOf(a, now);
  let kind: Samtalsslag;
  const canFlirt = aa >= ALDER.flirtFran && ba >= ALDER.flirtFran && a.sex !== b.sex && !isKin(a, b) && Math.abs(aa - ba) < ALDER.flirtSkillnad &&
    ((a.partner === undefined && b.partner === undefined) || a.partner === b.id);
  if ((mood < SAMTAL.gralHumor && rnd(s, 'samtal', a) < SAMTAL.gralHumorChans) || (r.op < REL.gral && rnd(s, 'samtal', a) < SAMTAL.gralOsamsChans)) kind = 'gräl';
  else if (a.task?.act === 'beratta') kind = 'berättelse';
  else if (canFlirt && rnd(s, 'samtal', a) < SAMTAL.flirtBas + r.rom / SAMTAL.flirtRom + (r.chem > SAMTAL.flirtKemiGr ? SAMTAL.flirtKemi : 0)) kind = 'flirt';
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
  } else {
    // vänskap växer allt långsammare ju närmare man redan är; ovänskap fördjupas lättare
    const d = SAMTALSSLAG[kind].v * (out + like) * (kind === 'skämt' && out < 0 ? SAMTAL.skamtOvan : 1);
    r.op += d;
    if (kind === 'tröst' && out + like > SAMTAL.trostMin) think(b, `Tröstades av ${a.name}`, SAMTAL.trostTanke, now, SAMTAL.trostTim * HOUR);
    if (kind === 'berättelse') { a.skill.berattande = clamp(a.skill.berattande + SAMTAL.berattaLar * (SAMTAL.berattaInt + a.pot.intelligens / SAMTAL.berattaDiv), 0, 20); }
    if (kind === 'flirt') {
      const att = (stat(b, 'skonhet', now) + stat(b, 'karisma', now)) / SAMTAL.flirtAtt;
      r.rom = clamp(r.rom + (out + att) * SAMTAL.flirtRomOk, 0, 100);
    }
    share(s, a, b, r, SAMTALSSLAG[kind]); // man berättar vad man vet och lär ut vad man kan
    if (kind !== 'flirt' && out + like > SAMTAL.gavaMin) askForGift(s, a, b); // den som saknar något frågar efter det (mat, ved, redskap: behov.ts)
  }
  r.op = clamp(r.op, -100, 100);
  r.talks++;
  a.social = clamp(a.social + SAMTAL.umgange, 0, 1); b.social = clamp(b.social + SAMTAL.umgange, 0, 1);
  events?.push({ a: a.id, b: b.id, kind, good: kind !== 'gräl' && out > 0, t: now });

  if (r.op > REL.naraVan && !(r.flags & 1) && !isKin(a, b) && a.partner !== b.id) { r.flags |= 1; log(s, `${a.name} och ${b.name} har blivit nära vänner.`, 'rel', [a.id, b.id]); }
  if (r.op < REL.ovan && !(r.flags & 2)) { r.flags |= 2; log(s, `${a.name} och ${b.name} har blivit ovänner.`, 'rel', [a.id, b.id]); }
  if (r.rom > REL.parRom && r.op > REL.van && a.partner === undefined && b.partner === undefined && canFlirt) pair(s, a, b);
  if (a.partner === b.id && r.op < REL.gral) {
    a.partner = undefined; b.partner = undefined; r.rom = SAMTAL.skiltRom;
    log(s, `${a.name} och ${b.name} gick skilda vägar.`, 'rel', [a.id, b.id]);
    think(a, `Separerade från ${b.name}`, -SAMTAL.skiltTanke, now, SAMTAL.skiltDygn * DAY); think(b, `Separerade från ${a.name}`, -SAMTAL.skiltTanke, now, SAMTAL.skiltDygn * DAY);
  }
}

// snitthumöret i byn; `tom` är värdet när ingen lever
export function avgMood(s: State, tom: number) { const l = living(s); return l.length ? l.reduce((a, p) => a + moodOf(p, s.now), 0) / l.length : tom; }
// humöret och, om ut finns med, delarna det består av (personrutan visar dem). Samma räkning i båda fallen
export function moodOf(p: Person, now: number, ut?: { namn: string; v: number }[]) {
  let m = SAMTAL.humorBas;
  const del = (namn: string, v: number) => { m += v; ut?.push({ namn, v }); };
  if (p.hunger < SAMTAL.humorHungerLag) del('Hungrig', -SAMTAL.humorHungerMinus); else if (p.hunger > SAMTAL.humorHungerHog) del('Mätt', SAMTAL.humorHungerPlus);
  if (p.rest < SAMTAL.humorViloLag) del('Trött', -SAMTAL.humorViloMinus);
  if (p.social < SAMTAL.humorSocialLag) del('Ensam', -SAMTAL.humorSocialMinus); else if (p.social > SAMTAL.humorSocialHog) del('Umgåtts mycket', SAMTAL.humorSocialPlus);
  if (halsa(p) < SAMTAL.humorHalsaLag) del('Mår dåligt', -SAMTAL.humorHalsaMinus);
  for (const t of p.thoughts) if (t.until > now) del(t.text, t.v);
  return clamp(m, 0, 1);
}
