import { foodDays } from './ekonomi';
import { ALDER, ageOf, isParent, living, log } from './folk';
import { clamp } from './slump';
import { Act, DAY, HOUR, Person, SEDER, Sed, Seder, State } from './typer';
import { balans } from './balans';

// ---------- balanstal (regel 8) ----------
// Sederna (arbete, gemenskap, barn, nyfikenhet, försiktighet, från -1 till 1) rör sig långsamt mot det invånarna drar åt och
// händelserna formar. Åldrarna för rösten i sederna och för yrkestaggarna står i ALDER (folk.ts)
export const SED = balans('seder', {
  mitt: 10, // en vanlig människas egenskap (egenskaper går från 1 till 20) ...
  spann: 6, // ... och så mycket över eller under är ett helt steg åt ena hållet
  // åt vilket håll personen drar sederna, efter sin personlighet
  barnEmpati: 0.8, // barn: empatin gånger så här mycket ...
  barnForalder: 0.1, // ... och så mycket mer för den som själv är förälder
  forsMod: 0.7, // försiktighet: modet (omvänt) gånger så här mycket ...
  forsInt: 0.3, // ... och intelligensen gånger så här mycket
  // inflytandet: hur mycket varje persons röst väger (efter ålder, ALDER), gånger 0,5 + karisma / rostKarisma
  rostUng: 0.5, // under ALDER.fullvuxen
  rostAldre: 1.5, // över ALDER.aldre
  rostBas: 0.5,
  rostKarisma: 20,
  snittVikt: 1.8, // målet för en sed är byns snitt gånger så här mycket plus händelserna, från -1 till 1
  evMax: 0.4, // händelserna formar en sed högst så här mycket åt vardera hållet ...
  evDygn: 6, // ... och effekten bleknar med en tidskonstant på så här många dygn
  rorDygn: 2, // sederna rör sig mot målet med en tidskonstant på så här många dygn
  overflodDygn: 20, // är maten i förrådet fler dygn än så här blir byn lugnare: arbetsseden minskar ...
  overflod: 0.0005, // ... med så här mycket per timme
  // pliktkänslan (0 till 1): bas + (flit - mitt) * pliktFlit + (empati - mitt) * pliktEmpati + arbetsseden * pliktSed
  pliktBas: 0.6,
  pliktFlit: 0.035,
  pliktEmpati: 0.015,
  pliktSed: 0.08,
  pliktMin: 0.05,
  pliktMax: 0.98,
  vanaDygn: 4, // vanorna bleknar med en tidskonstant på så här många dygn (tiden räknas mot yrkestaggar)
  // yrkestaggar (bara namn, påverkar inte vad man gör): den som har en tagg behåller den lättare
  taggMinTim: 6, // minst så här många timmar av vanor för att få en tagg
  taggBehallMin: 0.8, // den som har taggen klarar så här stor del av taggens minsta andel ...
  taggKvot: 1.5, // ... och måste göra så här många gånger mer än snittet, annars taggKvotBehall
  taggKvotBehall: 1.2,
  taggMangaNy: 0.3, // ju fler som har samma tagg, desto svårare: 1 + taggMangaNy för varje annan (taggMangaBehall för den som har den)
  taggMangaBehall: 0.12,
  taggPoangBehall: 1.3, // den som har taggen får så här många gånger högre poäng
});

// ---------- seder ----------
export function newSeder(): Seder {
  const z = () => ({ arbete: 0, gemenskap: 0, barn: 0, nyfikenhet: 0, forsiktighet: 0 });
  return { v: z(), ev: z(), log: [] };
}
const dev = (v: number) => (v - SED.mitt) / SED.spann;
// åt vilket håll personen drar sederna, efter sin personlighet
function personSeder(s: State, p: Person): Record<Sed, number> {
  const q = p.pot, kids = s.people.some(c => isParent(p, c));
  return {
    arbete: dev(q.flit),
    gemenskap: dev(q.empati),
    barn: dev(q.empati) * SED.barnEmpati + (kids ? SED.barnForalder : 0),
    nyfikenhet: dev((q.nyfikenhet + q.intelligens) / 2),
    forsiktighet: -dev(q.mod) * SED.forsMod + dev(q.intelligens) * SED.forsInt,
  };
}
// inflytande över sederna: vuxna och äldre väger mest, karismatiska hörs mer
export function influence(s: State, p: Person) {
  const a = ageOf(p, s.now);
  return (a < ALDER.vuxen ? 0 : a < ALDER.fullvuxen ? SED.rostUng : a > ALDER.aldre ? SED.rostAldre : 1) * (SED.rostBas + p.pot.karisma / SED.rostKarisma);
}
export function sederTarget(s: State): Record<Sed, number> {
  const t = { arbete: 0, gemenskap: 0, barn: 0, nyfikenhet: 0, forsiktighet: 0 };
  let tw = 0;
  for (const p of living(s)) {
    const w = influence(s, p); if (!w) continue;
    tw += w; const ps = personSeder(s, p);
    for (const k of SEDER) t[k] += ps[k] * w;
  }
  for (const k of SEDER) t[k] = clamp((tw ? t[k] / tw : 0) * SED.snittVikt + s.seder.ev[k], -1, 1);
  return t;
}
// händelser som formar sederna; effekten bleknar under några veckor
export function sedEvent(s: State, k: Sed, d: number, text?: string) {
  s.seder.ev[k] = clamp(s.seder.ev[k] + d, -SED.evMax, SED.evMax);
  if (text) { s.seder.log.push({ t: s.now, text }); if (s.seder.log.length > 30) s.seder.log.splice(0, s.seder.log.length - 30); }
}
// sederna rör sig långsamt mot det invånarna och händelserna drar mot
export function stepSeder(s: State) {
  const sd = s.seder, dt = s.now - (sd.at ?? s.now);
  sd.at = s.now;
  if (dt <= 0) return;
  const kd = Math.exp(-dt / (SED.evDygn * DAY));
  for (const k of SEDER) sd.ev[k] *= kd;
  if (foodDays(s) > SED.overflodDygn) sedEvent(s, 'arbete', -SED.overflod * dt / HOUR); // långt överflöd gör byn lugnare
  const t = sederTarget(s), f = 1 - Math.exp(-dt / (SED.rorDygn * DAY));
  for (const k of SEDER) sd.v[k] += (t[k] - sd.v[k]) * f;
}

// ---------- vilja ----------
// pliktkänsla 0–1: hur mycket personen jobbar för byn i stället för sig själv
export function duty(s: State, p: Person) {
  return clamp(SED.pliktBas + (p.pot.flit - SED.mitt) * SED.pliktFlit + (p.pot.empati - SED.mitt) * SED.pliktEmpati + s.seder.v.arbete * SED.pliktSed, SED.pliktMin, SED.pliktMax);
}
// tid räknas mot yrkestaggar och bleknar, så att de senaste åren väger mest
export const HABIT_FADE = SED.vanaDygn * DAY;
// Vanornas slag i den ordning de lades till, som for-in ger dem. Med fler än ett tiotal slag blir vanobjektet ett
// uppslagsverk i V8, och då är for-in långsamt, så listan sparas per vanobjekt. Bara addHabit lägger till slag
const vanSlag = new WeakMap<Record<string, number>, string[]>();
function habitKeys(h: Record<string, number>) {
  let ks = vanSlag.get(h);
  if (!ks) vanSlag.set(h, ks = Object.keys(h));
  return ks;
}
export function habitTotal(p: Person) {
  const h = p.habit;
  let t = 0;
  for (const k of habitKeys(h)) t += h[k];
  return t;
}
// alla vanor bleknar med faktorn hf, och tim timmar läggs till act
export function addHabit(p: Person, act: Act, hf: number, tim: number) {
  const h = p.habit, ks = habitKeys(h);
  for (const k of ks) h[k] *= hf;
  if (!(act in h)) ks.push(act);
  h[act] = (h[act] ?? 0) + tim;
}
export function habitShare(p: Person, acts: readonly Act[], tot = habitTotal(p)) {
  if (!(tot > 0)) return 0;
  let a = 0;
  for (const k of acts) a += p.habit[k] ?? 0;
  return a / tot;
}
export const TAGS: { tag: string; acts: Act[]; min: number }[] = [
  { tag: 'Jägare', acts: ['jakt'], min: 0.2 },
  { tag: 'Fiskare', acts: ['fiske'], min: 0.2 },
  { tag: 'Samlare', acts: ['samla'], min: 0.2 },
  { tag: 'Trähuggare', acts: ['ved', 'falla', 'hugga'], min: 0.15 },
  { tag: 'Hantverkare', acts: ['hantverk'], min: 0.15 },
  { tag: 'Byggare', acts: ['bygga'], min: 0.12 },
  { tag: 'Berättare', acts: ['beratta'], min: 0.06 },
  { tag: 'Eldvaktare', acts: ['elda', 'tanda'], min: 0.02 },
  { tag: 'Väktare', acts: ['vakt'], min: 0.08 },
  { tag: 'Dagdrivare', acts: ['vila'], min: 0.3 },
];
// taggen går till den som gör något klart mer än andra i byn; den som redan har en tagg behåller den lättare
export function updateTags(s: State) {
  const ppl = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
  const tot = new Map(ppl.map(p => [p, habitTotal(p)]));
  const avg = TAGS.map(t => ppl.reduce((a, p) => a + habitShare(p, t.acts, tot.get(p)), 0) / (ppl.length || 1));
  // ju fler som redan har ett yrke, desto svårare att få samma (bara namnet, det påverkar inte vad man gör)
  const holders = new Map<string, number>();
  for (const p of ppl) if (p.tag) holders.set(p.tag, (holders.get(p.tag) ?? 0) + 1);
  for (const p of ppl) {
    let best: string | undefined, br = 0;
    if (tot.get(p)! >= SED.taggMinTim) TAGS.forEach((t, i) => {
      const sh = habitShare(p, t.acts, tot.get(p)), keep = p.tag === t.tag, r = sh / (avg[i] || 1e-9);
      const many = 1 + (keep ? SED.taggMangaBehall : SED.taggMangaNy) * ((holders.get(t.tag) ?? 0) - (keep ? 1 : 0));
      if (sh >= t.min * (keep ? SED.taggBehallMin : 1) && r >= (keep ? SED.taggKvotBehall : SED.taggKvot) * many && r * (keep ? SED.taggPoangBehall : 1) / many > br) { best = t.tag; br = r * (keep ? SED.taggPoangBehall : 1) / many; }
    });
    if (best !== p.tag) {
      if (p.tag) holders.set(p.tag, holders.get(p.tag)! - 1);
      if (best) holders.set(best, (holders.get(best) ?? 0) + 1);
      p.tag = best;
      const txt = `${p.name} kallas nu för ${best?.toLowerCase()}.`;
      if (best && best !== 'Dagdrivare' && !p.kallad?.includes(best)) { (p.kallad ??= []).push(best); log(s, txt, 'skill', [p.id]); }
    }
  }
}
export const dygn = (v: number) => `${v >= 10 ? Math.round(v) : v.toFixed(1).replace('.', ',')} dygn`;
