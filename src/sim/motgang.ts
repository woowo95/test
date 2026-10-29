import { balans } from './balans';
import { ageOf, alive, count, living, log } from './folk';
import { delade } from './berattelser';
import { kronika } from './historik';
import { clamp, rnd } from './slump';
import { kalender, yearNo } from './tid';
import { DAY, HOUR, Person, Rel, State } from './typer';
import { allaBarn } from './uppvaxt';

// Motgångarna (steg 3.8, "Motgångarna i spelet" i designdokumentet): en hård vinter, torka, översvämning och tornado.
// Varje motgång är en rad i registret MOTGANGAR och räknas ur byns frö och tiden, precis som vädret (vader.ts), så att
// det levande läget och ikappräkningen får samma motgångar. För varje tidsålder dras ett tal; motgångarna som hör till
// årstiden tar var sin del av det efter sin chans, så att det aldrig blir två på en gång. Under byns första
// MOTGANG.forstaDygn dygn kommer ingen.
// Vad den hårda vintern gör står där den gör det: kylan och snön i vader.ts (hardVinter), veden i eld.ts och vargarna i
// varg.ts. De äldsta anar den i förväg; varslet sprids i samtal (minne.ts) och får byn att samla mer (val.ts).

// Balanstal (regel 8)
export const MOTGANG = balans('motgang', {
  forstaDygn: 10, // ingen motgång under byns första så här många dygn (år i spelet)
  hardGrader: [5, 8], // den hårda vintern är så här många grader kallare (slumpas mellan) ...
  hardSno: 0.06, // ... det snöar oftare: gränsen för nederbörd (regnFran i vader.ts) sänks så här mycket ...
  hardVed: 0.3, // ... elden äter så här mycket mer ved ...
  hardVarg: 2, // ... och vargarna kommer så här många gånger oftare ...
  hardHunger: 0.2, // ... och så här mycket hungrigare
  varselDygn: [1, 2], // de äldsta anar motgången så här många dygn i förväg (slumpas mellan) ...
  gammal: 30, // ... om de är minst så här gamla (år)
  varselSaker: 0.8, // så säker är den som anar det själv ...
  berattar: 0.4, // ... chansen i ett samtal att den som vet berättar om det ...
  troBas: 0.6, troDiv: 200, troMin: 0.3, troMax: 0.95, // ... hur mycket den som lyssnar tror på det: troBas + relationen / troDiv
  glomGrans: 0.2, // den som är mindre säker än så här berättar det inte vidare
  samla: 0.6, // den som vet vill ha så här mycket större förråd av mat och ved (gånger säkerheten) ...
  samlaFors: 0.5, // ... och mer i en förutseende by: (1 − samlaFors + samlaFors × försiktigheten), högst 1 + samlaFors
});

// ---------- motgångarna (registret) ----------
// namn och tecken: i gränssnittet (ikon = pixelsymbolen i ikoner.ts), tider: tidsåldrarna den kan komma i
// (0 istid, 1 vår, 2 sommar, 3 höst), chans: att den kommer en sådan tidsålder, varsel: att de äldsta anar den,
// text: vad som händer (när musen är över symbolen), anar: vad den som anar den tänker, borjar och slutar: händelseloggen
interface MotgangDef { namn: string; tecken: string; ikon: string; tider: number[]; chans: number; varsel?: true; text: string; anar: string; borjar: string; slutar: string }
export const MOTGANGAR = {
  hardVinter: {
    namn: 'Hård vinter', tecken: '🥶', ikon: 'm_hardVinter', tider: [0], chans: 0.2, varsel: true,
    text: 'Istiden är flera grader kallare än vanligt och det snöar mer. Sjön fryser tidigare och tjockare, elden äter mer ved och vargarna kommer oftare och hungrigare.',
    anar: 'Känner i lederna att vintern blir hård',
    borjar: 'En hård vinter har kommit. Kylan biter hårdare än någon minns.',
    slutar: 'Den hårda vintern är över.',
  },
} satisfies Record<string, MotgangDef>;
export type MotgangId = keyof typeof MOTGANGAR;
const DEF: Record<MotgangId, MotgangDef> = MOTGANGAR;
const IDS = Object.keys(DEF) as MotgangId[];

// ett tal mellan 0 och 1 ur byns frö och tidsålderns början (samma sätt som vädret i vader.ts)
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 1, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const timNr = (start: number) => Math.round(start / HOUR);
// motgången i tidsåldern ai som börjar vid start, eller ingen
export function motgangVid(s: State, start: number, ai: number): MotgangId | undefined {
  if (start < s.founded + MOTGANG.forstaDygn * DAY) return;
  const u = hash(s.seed, timNr(start), 3801);
  let acc = 0;
  for (const k of IDS) {
    const d = DEF[k];
    if (!d.tider.includes(ai)) continue;
    acc += d.chans;
    if (u < acc) return k;
  }
}
// hur många grader kallare den hårda vintern som börjar vid start är
export const hardGrader = (s: State, start: number) => MOTGANG.hardGrader[0] + hash(s.seed, timNr(start), 3802) * (MOTGANG.hardGrader[1] - MOTGANG.hardGrader[0]);
// motgången som pågår vid tiden t, med tidsålderns början och slut
export function motgangNu(s: State, t = s.now) {
  const k = kalender(s, t), id = motgangVid(s, k.start, k.ai);
  return id ? { id, start: k.start, slut: k.slut } : undefined;
}
// motgången som kommer i nästa tidsålder (den som börjar när den här slutar)
export function motgangNasta(s: State, t = s.now) {
  const k = kalender(s, t), id = motgangVid(s, k.slut, (k.ai + 1) % 4);
  return id ? { id, start: k.slut } : undefined;
}
export const motgangDef = (k: MotgangId) => DEF[k];

// ---------- varslet ----------
// den som anar (eller hört om) en motgång: p.varsel = { k, t: när den börjar, c: hur säker, src: vem hen hörde det av }
const vetOm = (s: State, p: Person) => p.varsel && p.varsel.t > s.now - DAY * 7 ? p.varsel : undefined;
// den äldsta i byn anar motgången (om hen är gammal nog)
function anar(s: State, k: MotgangId, start: number) {
  const gamla = living(s).filter(p => ageOf(p, s.now) >= MOTGANG.gammal).sort((a, b) => ageOf(b, s.now) - ageOf(a, s.now));
  const p = gamla[0];
  if (!p) return;
  p.varsel = { k, t: start, c: MOTGANG.varselSaker };
  count(s, 'varsel');
  log(s, `${p.name} är en av de äldsta i byn och ${DEF[k].anar.toLowerCase()}.`, 'world', [p.id]);
}
// i ett samtal (minne.ts): den som vet berättar ibland om motgången som kommer. Drar bara ur slumpen när a vet något
export function delaVarsel(s: State, a: Person, b: Person, r: Rel) {
  const v = vetOm(s, a);
  if (!v || v.t <= s.now || v.c < MOTGANG.glomGrans || rnd(s, 'minne', a) >= MOTGANG.berattar) return;
  delade('varsel', DEF[v.k].ikon, DEF[v.k].namn.toLowerCase()); // samtalets ämne (steg 3.9.5)
  const c = v.c * clamp(MOTGANG.troBas + r.op / MOTGANG.troDiv, MOTGANG.troMin, MOTGANG.troMax);
  const e = vetOm(s, b);
  if (e && e.t === v.t && e.c >= c) return;
  b.varsel = { k: v.k, t: v.t, c, src: a.id };
  count(s, 'varselBerattat');
}
// hur mycket större förråd p vill ha när hen vet att en motgång kommer (val.ts): större i en förutseende by
export function varselSamla(s: State, p: Person) {
  const v = vetOm(s, p);
  if (!v || v.t <= s.now || !DEF[v.k].varsel) return 0;
  return MOTGANG.samla * v.c * (1 - MOTGANG.samlaFors + MOTGANG.samlaFors * s.seder.v.forsiktighet);
}
// hur många i byn som vet att motgången k kommer (gränssnittet)
export const varslade = (s: State, start: number) => living(s).filter(p => p.varsel?.t === start).length;

// ---------- varje timme (steg.ts) ----------
// varslet några dygn innan, och när motgången börjar och slutar: händelseloggen, byns krönika och barnens upplevelser
export function stepMotgang(s: State) {
  const m = (s.motgang ??= {});
  const nasta = motgangNasta(s);
  if (nasta && DEF[nasta.id].varsel && m.varslad !== nasta.start) {
    const dygn = MOTGANG.varselDygn[0] + hash(s.seed, timNr(nasta.start), 3803) * (MOTGANG.varselDygn[1] - MOTGANG.varselDygn[0]);
    if (s.now >= nasta.start - dygn * DAY) { m.varslad = nasta.start; anar(s, nasta.id, nasta.start); }
  }
  const nu = motgangNu(s);
  if (nu && m.pagar?.t !== nu.start) {
    m.pagar = { k: nu.id, t: nu.start, dog: deadCount(s) };
    count(s, 'motgang_' + nu.id);
    log(s, DEF[nu.id].borjar, 'world');
    kronika(s, `År ${yearNo(s)}: ${DEF[nu.id].borjar.split('.')[0]}.`);
    allaBarn(s, nu.id);
  } else if (!nu && m.pagar) {
    const dog = deadCount(s) - m.pagar.dog, d = DEF[m.pagar.k];
    log(s, `${d.slutar}${dog ? ` ${dog} dog under den.` : ' Alla klarade sig.'}`, 'world');
    kronika(s, `${d.namn} tog slut${dog ? `. ${dog} dog under den` : ' och alla klarade sig'}.`);
    delete m.pagar;
  }
  for (const p of s.people) if (p.varsel && (!alive(p) || p.varsel.t < s.now - DAY * 7)) delete p.varsel;
}
const deadCount = (s: State) => s.stat?.doda ?? 0;
