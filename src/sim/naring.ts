// Näringen (steg 2.6.1, beslut). Varje person har fem näringsvärden (registret NARING): energi, protein, fett, vitaminer och
// mineraler, från 0 (slut) till 1 (fyllt). Maten fyller dem efter sitt innehåll (`naring` i SAKER, saker.ts), och de sjunker
// olika fort. Mättnaden (p.hunger) är en sammanfattning: värdena vägda med `vikt`. Talen är valda så att mättnaden sjunker som
// förut (KROPP.hungerTim) när inget värde är slut, och så att en portion höjer den lika mycket som förut när inget värde
// redan är fyllt. Den som är mätt kan alltså ändå ha brist på något (steg 2.6.2): under NARINGBAL.brist ger värdet en brist
// (`brist` i registret) som gör en sämre, man äter helst mat med det man saknar (`matOrdning`, takeFood i lager.ts) och
// berättar om det i samtal (`berattaBrist`, samtal.ts), så att den som hämtar mat vet vad byn längtar efter (`onskan`, val.ts).
// Fliken Hälsa visar värdena och bristerna (person.ts)
import { Act, HOUR, Person } from './typer';
import { FOOD, SAKER } from './saker';
import { clamp } from './slump';
import { balans } from './balans';
import { think } from './folk';

export const NARINGBAL = balans('naring', {
  brist: 0.2, // under detta värde har man brist; bristen växer till full när värdet är slut
  trott: 0.6, // energi: vilan sjunker så mycket fortare vid full brist (trötthet)
  svag: 0.3, // protein: arbetet går så mycket långsammare vid full brist (styrkan sjunker) ...
  lakProtein: 0.5, // ... och sår läker så mycket långsammare
  fryser: 0.4, // fett: kylan biter så mycket mer vid full brist
  skorbjugg: 120, // vitaminer: timmar för hälsan att sjunka från full till död vid full brist (skörbjugg) ...
  lakVitamin: 0.5, // ... och sår läker så mycket långsammare
  yrsel: 0.25, // mineraler: gången så mycket långsammare vid full brist (yrsel) ...
  kramp: 0.15, // ... och arbetet (kramp)
  svett: 1, // mineraler sjunker så mycket fortare för den som är för varm och arbetar tungt (man tappar salt)
  minns: 24, // timmar man minns att någon längtar efter något
  onskan: 0.5, // så mycket mer värt det är att hämta mat som har det man själv eller någon man pratat med längtar efter
  tanke: 0.06, // humöret för den som längtar efter något
});

interface BristDef { namn: string; tecken: string; gor: string }
interface NaringDef { namn: string; tecken: string; vikt: number; takt: number; fran: string; langtar: string; brist: BristDef }
// vikt = hur mycket värdet väger i mättnaden (summan är 1), takt = hur fort det sjunker jämfört med de andra, fran = var det
// finns (designdokumentet), tecken = symbolen (platshållare), langtar = det man säger att man längtar efter, brist = vad
// brist på det heter och gör (symbolen är en platshållare)
export const NARING = {
  energi: { namn: 'Energi', tecken: '⚡', vikt: 0.4, takt: 1.1, fran: 'stärkelse, sött och fett', langtar: 'rötter', brist: { namn: 'Trötthet', tecken: '😩', gor: 'Vilan sjunker fortare.' } },
  protein: { namn: 'Protein', tecken: '🍖', vikt: 0.2, takt: 0.9, fran: 'kött, fisk, ärtor och ägg', langtar: 'kött', brist: { namn: 'Svaghet', tecken: '🦴', gor: 'Styrkan sjunker: arbetet går långsammare, och sår läker långsammare.' } },
  fett: { namn: 'Fett', tecken: '🧈', vikt: 0.15, takt: 0.8, fran: 'djurfett, fet fisk, nötter och olja', langtar: 'något fett', brist: { namn: 'Fryser lätt', tecken: '🥶', gor: 'Kylan biter mer.' } },
  vitamin: { namn: 'Vitaminer', tecken: '🍓', vikt: 0.125, takt: 0.8, fran: 'grönt, bär och frukt', langtar: 'bär', brist: { namn: 'Skörbjugg', tecken: '🦷', gor: 'Hälsan sjunker, och sår läker långsammare.' } },
  mineral: { namn: 'Mineraler', tecken: '🧂', vikt: 0.125, takt: 0.9, fran: 'salt, grönt, kött och fisk', langtar: 'svamp', brist: { namn: 'Yrsel och kramp', tecken: '😵', gor: 'Gången och arbetet går långsammare. Den som arbetar hårt i värmen tappar salt.' } },
} satisfies Record<string, NaringDef>;
export type Naring = keyof typeof NARING;
export const NARINGAR = Object.keys(NARING) as Naring[];
const DEF: Record<Naring, NaringDef> = NARING;
// så att mättnaden sjunker 1 / KROPP.hungerTim i timmen när inget värde är slut
const TAKT = 1 / NARINGAR.reduce((a, k) => a + DEF[k].vikt * DEF[k].takt, 0);
const lika = (v: number) => Object.fromEntries(NARINGAR.map(k => [k, v])) as Record<Naring, number>;

// mättnaden av näringsvärdena
export const mattnad = (n: Record<Naring, number>) => NARINGAR.reduce((a, k) => a + DEF[k].vikt * n[k], 0);
// p:s näringsvärden. Den som inte har några (en äldre sparning) eller vars mättnad satts direkt (testerna) har alla värden
// lika med mättnaden. naringNu ändrar inget (gränssnittet), naringOf sparar dem i p (simuleringen). Sparfilen avrundar
// värdena och mättnaden var för sig till tre decimaler (steg.ts), så de får skilja så mycket efter en inläsning
const stammer = (p: Person) => !!p.naring && Math.abs(mattnad(p.naring) - p.hunger) <= 2e-3;
export const naringNu = (p: Person): Readonly<Record<Naring, number>> => stammer(p) ? p.naring! : lika(p.hunger);
export function naringOf(p: Person) {
  if (!stammer(p)) p.naring = lika(p.hunger);
  return p.naring!;
}
// hur mycket värdet k sjunker i timmen för en vuxen (fliken Hälsa visar det)
export const sjunker = (k: Naring, hungerTim: number) => DEF[k].takt * TAKT / hungerTim;
// h timmar av hunger (needsStep i steg.ts; barnen blir hungriga långsammare): varje värde sjunker i sin takt
// svett = den som är för varm och arbetar tungt tappar mineraler fortare
export function naringSjunker(p: Person, h: number, hungerTim: number, svett = false) {
  const n = naringOf(p);
  for (const k of NARINGAR) n[k] = clamp(n[k] - h * sjunker(k, hungerTim) * (svett && k === 'mineral' ? 1 + NARINGBAL.svett : 1), 0, 1);
  p.hunger = mattnad(n);
}
// vad en hel portion av maten k fyller i varje värde, skalat så att den höjer mättnaden med 1 (eat i behov.ts gör det till 0,55)
const innehall = new Map<string, Record<Naring, number>>();
export function naringI(k: string) {
  let r = innehall.get(k);
  if (!r) {
    const ra = { ...lika(0), ...SAKER[k]?.naring ?? lika(1) }, sum = mattnad(ra);
    r = lika(0); for (const x of NARINGAR) r[x] = sum > 0 ? ra[x] / sum : 1;
    innehall.set(k, r);
  }
  return r;
}
// p äter: f = hur mycket maten skulle höja en mättnad där inget är fyllt, per slag (det som fyller ett värde över 1 går förlorat)
export function ata(p: Person, per: Record<string, number>) {
  const n = naringOf(p);
  for (const k in per) { const i = naringI(k); for (const x of NARINGAR) n[x] = clamp(n[x] + per[k] * i[x], 0, 1); }
  p.hunger = mattnad(n);
}

// ---------- bristen (steg 2.6.2) ----------
// hur stor bristen på k är: 0 = ingen (värdet är minst NARINGBAL.brist), 1 = full (värdet är slut)
export const bristGrad = (p: Person, k: Naring) => clamp(1 - naringNu(p)[k] / NARINGBAL.brist, 0, 1);
export const bristerNu = (p: Person) => NARINGAR.filter(k => bristGrad(p, k) > 0);
// det bristen gör, som faktorer (1 = som vanligt). Simuleringen och fliken Hälsa läser bara de här
export const trottFaktor = (p: Person) => 1 + NARINGBAL.trott * bristGrad(p, 'energi'); // vilan sjunker gånger detta (steg.ts)
export const frysFaktor = (p: Person) => 1 + NARINGBAL.fryser * bristGrad(p, 'fett'); // kylan gånger detta (varmeDelar i steg.ts)
export const styrkaFaktor = (p: Person) => (1 - NARINGBAL.svag * bristGrad(p, 'protein')) * (1 - NARINGBAL.kramp * bristGrad(p, 'mineral')); // arbetet (handighet i halsa.ts)
export const yrselFaktor = (p: Person) => 1 - NARINGBAL.yrsel * bristGrad(p, 'mineral'); // gången (rorlighet i halsa.ts)
export const lakFaktor = (p: Person) => (1 - NARINGBAL.lakProtein * bristGrad(p, 'protein')) * (1 - NARINGBAL.lakVitamin * bristGrad(p, 'vitamin')); // sår läker gånger detta
export const skorbjugg = (p: Person) => bristGrad(p, 'vitamin') / NARINGBAL.skorbjugg; // hälsan sjunker så mycket i timmen (healthStep i steg.ts)

// den som har brist äter helst det som fyller bristen: matslagen i den ordningen, annars i den vanliga (FOOD)
export function matOrdning(p: Person) {
  const b = bristerNu(p);
  if (!b.length) return FOOD;
  const v = (k: string) => { const i = naringI(k); return b.reduce((a, x) => a + bristGrad(p, x) * i[x], 0); };
  return [...FOOD].sort((a, c) => v(c) - v(a));
}
// tankarna för den som har brist ("Längtar efter kött"), och att man glömmer vad andra längtat efter (needsStep i steg.ts)
export function bristSteg(p: Person, now: number) {
  for (const k of NARINGAR) if (bristGrad(p, k) > 0) think(p, `Längtar efter ${DEF[k].langtar}`, -NARINGBAL.tanke, now, HOUR);
  if (p.langtan) for (const k of NARINGAR) if ((p.langtan[k] ?? 0) <= now) delete p.langtan[k];
  if (p.langtan && !Object.keys(p.langtan).length) p.langtan = undefined;
}
// a berättar för b vad a längtar efter (converse i samtal.ts); b minns det i NARINGBAL.minns timmar
export function berattaBrist(a: Person, b: Person, now: number) {
  for (const k of bristerNu(a)) (b.langtan ??= {})[k] = now + NARINGBAL.minns * HOUR;
}
// hur mycket mer värt det är för p att göra arbetet act (samla, jakt, fiske: bestWork i val.ts) för att maten det ger har det
// som p själv eller någon p pratat med längtar efter. 1 = inget särskilt
const basta = (x: Naring) => Math.max(...FOOD.map(k => naringI(k)[x]));
export function onskan(p: Person, act: Act, now: number) {
  const mat = FOOD.filter(k => SAKER[k]?.skaffa?.act === act);
  if (!mat.length) return 1;
  let v = 0;
  for (const x of NARINGAR) {
    const vill = Math.max(bristGrad(p, x), (p.langtan?.[x] ?? 0) > now ? 1 : 0);
    if (vill > 0) v = Math.max(v, vill * Math.max(...mat.map(k => naringI(k)[x])) / basta(x));
  }
  return 1 + NARINGBAL.onskan * v;
}
