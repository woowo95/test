import { balans } from './balans';
import { ageOf, alive, count, livet, living, log, stat } from './folk';
import { delade } from './berattelser';
import { kronika } from './historik';
import { clamp, rnd } from './slump';
import { kalender, yearNo } from './tid';
import { DAY, HOUR, Person, Rel, State } from './typer';
import { allaBarn } from './uppvaxt';
import { tornadoTid } from './tornado';

// Motgångarna (steg 3.8, "Motgångarna i spelet" i designdokumentet): en hård vinter, torka, översvämning och tornado.
// Varje motgång är en rad i registret MOTGANGAR och räknas ur byns frö och tiden, precis som vädret (vader.ts), så att
// det levande läget och ikappräkningen får samma motgångar. För varje tidsålder dras ett tal; motgångarna som hör till
// årstiden tar var sin del av det efter sin chans, så att det aldrig blir två på en gång. Under byns första
// MOTGANG.forstaDygn dygn kommer ingen.
// Vad torkan gör står i torka.ts (steg 3.8.2), översvämningen i flod.ts (steg 3.8.3) och tornadon i tornado.ts (steg 3.8.4). Vad den hårda vintern gör står där den gör det: kylan och snön i vader.ts (hardVinter), veden i eld.ts och vargarna i
// varg.ts. De äldsta anar den i förväg, och den klokaste i byn ännu tidigare och säkrare (steg 3.8.6); varslet sprids i
// samtal (minne.ts) och får byn att samla mer (val.ts).

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
  klokDygn: [1, 3], // den klokaste i byn anar den så här många dygn i förväg (steg 3.8.6), tidigare ju klokare ...
  klokSaker: [0.8, 0.95], // ... och så här säker ...
  klokFran: 10, klokTill: 20, // ... från den här intelligensen (den som är mindre klok anar inget) till den här (då det tidigaste och säkraste)
  klokAlder: 14, // den klokaste räknas bland dem som är minst så här gamla (år)
  berattar: 0.4, // ... chansen i ett samtal att den som vet berättar om det ...
  troBas: 0.6, troDiv: 200, troMin: 0.3, troMax: 0.95, // ... hur mycket den som lyssnar tror på det: troBas + relationen / troDiv
  glomGrans: 0.2, // den som är mindre säker än så här berättar det inte vidare
  samla: 0.6, // den som vet vill ha så här mycket större förråd av mat och ved (gånger säkerheten) ...
  samlaFors: 0.5, // ... och mer i en förutseende by: (1 − samlaFors + samlaFors × försiktigheten), högst 1 + samlaFors
});

// ---------- motgångarna (registret) ----------
// namn och tecken: i gränssnittet (ikon = pixelsymbolen i ikoner.ts), tider: tidsåldrarna den kan komma i
// (0 istid, 1 vår, 2 sommar, 3 höst), chans: att den kommer en sådan tidsålder, varsel: att de äldsta anar den,
// text: vad som händer (när musen är över symbolen), anar: vad den som anar den tänker, borjar och slutar: händelseloggen,
// tid: när den pågår i tidsåldern som börjar vid start, om den inte pågår hela tidsåldern (tornadon)
interface MotgangDef { namn: string; tecken: string; ikon: string; tider: number[]; chans: number; varsel?: true; text: string; anar: string; borjar: string; slutar: string; tid?: (s: State, start: number) => { fran: number; till: number } }
export const MOTGANGAR = {
  hardVinter: {
    namn: 'Hård vinter', tecken: '🥶', ikon: 'm_hardVinter', tider: [0], chans: 0.2, varsel: true,
    text: 'Istiden är flera grader kallare än vanligt och det snöar mer. Sjön fryser tidigare och tjockare, elden äter mer ved och vargarna kommer oftare och hungrigare.',
    anar: 'Känner i lederna att vintern blir hård',
    borjar: 'En hård vinter har kommit. Kylan biter hårdare än någon minns.',
    slutar: 'Den hårda vintern är över.',
  },
  torka: {
    namn: 'Torka', tecken: '🏜️', ikon: 'm_torka', tider: [2], chans: 0.15, varsel: true,
    text: 'Nästan inget regn på hela sommaren. Marken torkar, sjöarna drar sig tillbaka och små tjärnar torkar ut. Bär, rötter och svamp växer sämre, hararna söker sig mot vattnet och grödor som inte vattnas vissnar. Fisken samlas i vattnet som är kvar.',
    anar: 'Ser på himlen och växterna att sommaren blir torr',
    borjar: 'En torka har kommit. Himlen är klar dag efter dag och marken spricker.',
    slutar: 'Torkan är över. Regnet kommer tillbaka.',
  },
  oversvamning: {
    namn: 'Översvämning', tecken: '🌊', ikon: 'm_oversvamning', tider: [1, 3], chans: 0.1,
    text: 'Efter snösmältningen eller ett långt regn stiger sjön en till tre rutor upp på land, står kvar ett par dygn och sjunker. Maten under vatten förstörs, lätta saker flyter bort ute, tunga saker ligger kvar och slits fortare och fält under vatten dör. Det som ligger i kistor och på hyllor klarar sig.',
    anar: 'Ser på sjön att vattnet kommer att stiga',
    borjar: 'Det har regnat länge och sjön är full till brädden.',
    slutar: 'Tiden med högvatten är över.',
  },
  tornado: {
    namn: 'Tornado', tecken: '🌪️', ikon: 'm_tornado', tider: [2, 3], chans: 0.05,
    text: 'Den enda stormen. Den varar några timmar och går långsamt längs en bana över kartan. I sin väg fäller den träd, river väggar (timmer håller bättre än ris) och lyfter saker ur förrådet, som hamnar utspridda runt banan; en del går sönder. Det i kistor, på hyllor och under tak som håller klarar sig. Folk som ser den ropar och går undan.',
    anar: 'Känner att luften är tung och att något kommer',
    borjar: 'En tornado kommer. Himlen är svart och det dånar.',
    slutar: 'Tornadon har dragit förbi.',
    tid: (s: State, start: number) => tornadoTid(s, start),
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
// ett tal mellan 0 och 1 för motgången som börjar vid start (salt skiljer talen åt): hur den blir (torka.ts, flod.ts)
export const motgangTal = (s: State, start: number, salt: number) => hash(s.seed, timNr(start), salt);
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
  if (!id) return undefined;
  const f = DEF[id].tid?.(s, k.start); // bara en del av tidsåldern (tornadon)
  if (f && (t < f.fran || t >= f.till)) return undefined;
  return { id, start: k.start, slut: f ? f.till : k.slut };
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
// p anar motgången k som börjar vid start, så här säker (vem: hen är en av de äldsta, eller den klokaste i byn). Den som
// redan vet det lika säkert (hen anade det själv tidigare, eller hörde det) anar inget nytt
function anar(s: State, p: Person, k: MotgangId, start: number, c: number, vem: string) {
  const e = vetOm(s, p);
  if (e && e.t === start && e.c >= c) return;
  p.varsel = { k, t: start, c };
  count(s, 'varsel');
  log(s, `${p.name} ${vem} och ${DEF[k].anar.toLowerCase()}.`, 'world', [p.id]);
}
// den äldsta i byn (om hen är gammal nog)
const aldst = (s: State) => living(s).filter(p => ageOf(p, s.now) >= MOTGANG.gammal).sort((a, b) => ageOf(b, s.now) - ageOf(a, s.now))[0];
// den klokaste i byn (steg 3.8.6) och hur klok: 0 vid klokFran och 1 vid klokTill. Den som är mindre klok än klokFran anar inget
export function klokast(s: State) {
  const p = living(s).filter(q => ageOf(q, s.now) >= MOTGANG.klokAlder).sort((a, b) => stat(b, 'intelligens', s.now) - stat(a, 'intelligens', s.now))[0];
  const i = p ? stat(p, 'intelligens', s.now) : -Infinity;
  return p && i >= MOTGANG.klokFran ? { p, f: clamp((i - MOTGANG.klokFran) / (MOTGANG.klokTill - MOTGANG.klokFran), 0, 1) } : undefined;
}
const mellan = (v: number[], f: number) => v[0] + f * (v[1] - v[0]);
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
  // den klokaste anar den tidigare, ju klokare desto tidigare och säkrare (steg 3.8.6)
  const klok = nasta && DEF[nasta.id].varsel && m.klok !== nasta.start ? klokast(s) : undefined;
  if (nasta && klok && s.now >= nasta.start - mellan(MOTGANG.klokDygn, klok.f) * DAY) {
    m.klok = nasta.start; count(s, 'varselKlok');
    anar(s, klok.p, nasta.id, nasta.start, mellan(MOTGANG.klokSaker, klok.f), 'är den klokaste i byn');
  }
  // och den äldsta 1–2 dygn innan
  if (nasta && DEF[nasta.id].varsel && m.varslad !== nasta.start) {
    const dygn = mellan(MOTGANG.varselDygn, hash(s.seed, timNr(nasta.start), 3803));
    if (s.now >= nasta.start - dygn * DAY) { m.varslad = nasta.start; const p = aldst(s); if (p) anar(s, p, nasta.id, nasta.start, MOTGANG.varselSaker, 'är en av de äldsta i byn'); }
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
    for (const p of living(s)) if (p.born < m.pagar.t) livet(s, p, 'mg:' + m.pagar.k); // de som klarade den (steg 3.9.8)
    delete m.pagar;
  }
  for (const p of s.people) if (p.varsel && (!alive(p) || p.varsel.t < s.now - DAY * 7)) delete p.varsel;
}
const deadCount = (s: State) => s.stat?.doda ?? 0;
