// Kroppen (steg 2.5.1). Kroppen har tio delar (KROPPSDELAR): huvud, bål, två armar, två händer, två ben och två fötter (Björn, efter
// v55). Olyckor i farliga arbeten (OLYCKOR) ger skador (SKADOR) i en del: ett sår blöder tills det levrat sig, gör ont och
// gör delen sämre tills det läkt. Den som skadat benen eller fötterna går långsammare (rorlighet), den som skadat armarna eller
// händerna arbetar långsammare (handighet). Blodet (p.blod) kommer tillbaka när man inte blöder och är mätt och otörstig; under
// HALSA.blodDod förblöder man. Mycket svåra skador i huvudet eller bålen dödar direkt, men det är sällsynt. Hälsan i
// gränssnittet och valet (halsa) är en sammanfattning: den gamla hälsan (svält, kyla, törst, sjukdom), blodet och smärtan.
// Förband, att krypa hem och att bli buren kommer i 2.5.2, fliken Hälsa med figuren i 2.5.3
import { ACTS } from './handlingar';
import { KROPP, count, log, think } from './folk';
import { avbryt } from './lager';
import { fearPlace } from './minne';
import { TORST } from './torst';
import { chance, clamp, pick, rnd } from './slump';
import { Act, HOUR, HOUR_S, Person, Skill, State } from './typer';
import { balans } from './balans';
import type { Dodsorsak } from './liv';

// ---------- balanstal (regel 8) ----------
export const HALSA = balans('halsa', {
  blodTim: 0.6, // ett öppet sår av grad 1 (och blod 1 i SKADOR) tar så här mycket blod i timmen (1 = allt blod) ...
  levrar: 1.5, // ... och har levrat sig efter levrar × (0,5 + graden) timmar
  blodDod: 0.4, // under så här mycket blod förblöder man
  blodTillbaka: 48, // timmar för blodet att komma tillbaka helt för den som inte blöder och är mätt och otörstig
  dodGrad: 0.95, // en skada i huvudet eller bålen av minst den här graden dödar direkt (sällsynt)
  radd: 0.5, // en skada av minst den här graden gör de som såg den rädda för platsen
  avbryt: 0.3, // från den här graden slutar man arbeta
  logg: 0.4, // skador från den här graden står i loggen
  lakSamre: 1 / 3, // den som är hungrig eller törstig läker så här mycket långsammare
  smarta: 0.6, // hälsan som visas är högst 1 − smarta × smärtan ...
  smartaHumor: 0.2, // ... och smärtan sänker humöret så här mycket (gånger smärtan)
  minst: 0.2, // rörligheten och händigheten går aldrig under detta
  skicklig: 25, // risken för en olycka gånger 1 − färdigheten / skicklig
});

// ---------- kroppsdelarna (registret) ----------
// livsviktig = en mycket svår skada där dödar direkt; rorlighet och handighet = hur mycket delen betyder för gången och
// händerna (summan över alla delar är 1)
interface DelDef { namn: string; i: string; livsviktig?: true; rorlighet?: number; handighet?: number }
export const KROPPSDELAR = {
  huvud: { namn: 'Huvud', i: 'huvudet', livsviktig: true },
  bal: { namn: 'Bål', i: 'bålen', livsviktig: true },
  armV: { namn: 'Vänster arm', i: 'vänstra armen', handighet: 0.2 },
  armH: { namn: 'Höger arm', i: 'högra armen', handighet: 0.2 },
  handV: { namn: 'Vänster hand', i: 'vänstra handen', handighet: 0.3 },
  handH: { namn: 'Höger hand', i: 'högra handen', handighet: 0.3 },
  benV: { namn: 'Vänster ben', i: 'vänstra benet', rorlighet: 0.3 },
  benH: { namn: 'Höger ben', i: 'högra benet', rorlighet: 0.3 },
  fotV: { namn: 'Vänster fot', i: 'vänstra foten', rorlighet: 0.2 },
  fotH: { namn: 'Höger fot', i: 'högra foten', rorlighet: 0.2 },
} satisfies Record<string, DelDef>;
export type Kroppsdel = keyof typeof KROPPSDELAR;
const DEL: Record<Kroppsdel, DelDef> = KROPPSDELAR;
const ARMAR: Kroppsdel[] = ['armV', 'armH'], HANDER: Kroppsdel[] = ['handV', 'handH'], BEN: Kroppsdel[] = ['benV', 'benH'], FOTTER: Kroppsdel[] = ['fotV', 'fotH'];

// ---------- skadorna (registret) ----------
// blod = hur mycket såret blöder vid grad 1, smarta = hur ont det gör, fel = hur mycket sämre delen blir, lakTim = timmar
// för en skada av grad 1 att läka för den som är mätt och otörstig
interface SkadaDef { namn: string; ett: string; blod: number; smarta: number; fel: number; lakTim: number }
export const SKADOR = {
  skarsar: { namn: 'Skärsår', ett: 'ett skärsår', blod: 1, smarta: 0.5, fel: 0.4, lakTim: 24 },
  bett: { namn: 'Bett', ett: 'ett bett', blod: 0.8, smarta: 0.6, fel: 0.5, lakTim: 36 },
  klos: { namn: 'Klösmärken', ett: 'klösmärken', blod: 0.6, smarta: 0.4, fel: 0.3, lakTim: 24 },
  benbrott: { namn: 'Benbrott', ett: 'ett benbrott', blod: 0, smarta: 1, fel: 1, lakTim: 120 },
  krossar: { namn: 'Krossår', ett: 'ett krossår', blod: 0.4, smarta: 0.7, fel: 0.7, lakTim: 48 },
} satisfies Record<string, SkadaDef>;
export type SkadaTyp = keyof typeof SKADOR;
const SKADA: Record<SkadaTyp, SkadaDef> = SKADOR;
// en skada: del, typ, grad (0–1, sjunker när den läker), blödningen kvar (1 = som nyss, 0 = levrad) och när den hände
export interface Skada { d: Kroppsdel; k: SkadaTyp; g: number; b: number; t: number }

// ---------- olyckorna (registret) ----------
// per handling, medan den görs: risk per timme (mindre för den skicklige), skadorna och delarna som kan drabbas, gradens
// spann (de flesta skador är lätta: min + slump² × (max − min)), dödsorsaken om den dödar direkt och när det hände
interface OlyckaDef { risk: number; typer: SkadaTyp[]; delar: Kroppsdel[]; min: number; max: number; dod: Dodsorsak; nar: string }
export const OLYCKOR: Partial<Record<Act, OlyckaDef>> = {
  jakt: { risk: 0.01, typer: ['bett', 'klos', 'benbrott'], delar: [...ARMAR, ...HANDER, ...BEN, ...FOTTER, 'bal'], min: 0.1, max: 1, dod: 'jakt', nar: 'under en jakt' },
  falla: { risk: 0.03, typer: ['krossar', 'benbrott'], delar: [...BEN, ...FOTTER, ...ARMAR, 'huvud'], min: 0.15, max: 1, dod: 'olycka', nar: 'när ett träd föll' },
  hugga: { risk: 0.005, typer: ['skarsar'], delar: [...FOTTER, ...BEN], min: 0.1, max: 0.9, dod: 'olycka', nar: 'med yxan' },
  slakta: { risk: 0.01, typer: ['skarsar'], delar: HANDER, min: 0.05, max: 0.8, dod: 'olycka', nar: 'när hen slaktade' },
  rensa: { risk: 0.005, typer: ['skarsar'], delar: HANDER, min: 0.05, max: 0.6, dod: 'olycka', nar: 'när hen rensade fisk' },
  kniv: { risk: 0.01, typer: ['skarsar'], delar: HANDER, min: 0.05, max: 0.7, dod: 'olycka', nar: 'när hen slog flinta' },
};

// ---------- det kroppen ger ----------
// hur mycket sämre en del är just nu (0 = hel, 1 = går inte att använda)
export function delFel(p: Person, d: Kroppsdel) {
  let f = 0;
  for (const w of p.skador ?? []) if (w.d === d) f += SKADA[w.k].fel * w.g;
  return Math.min(1, f);
}
function forlust(p: Person, vikt: 'rorlighet' | 'handighet') {
  if (!p.skador?.length) return 1;
  let v = 0;
  for (const d of Object.keys(DEL) as Kroppsdel[]) v += (DEL[d][vikt] ?? 0) * delFel(p, d);
  return Math.max(HALSA.minst, 1 - v);
}
export const rorlighet = (p: Person) => forlust(p, 'rorlighet'); // gången gånger detta (steg.ts)
export const handighet = (p: Person) => forlust(p, 'handighet'); // arbetet gånger detta (workRate i ekonomi.ts)
export function smarta(p: Person) {
  let v = 0;
  for (const w of p.skador ?? []) v += SKADA[w.k].smarta * w.g;
  return Math.min(1, v);
}
// blodet personen förlorar i timmen just nu
export function blodning(p: Person) {
  let v = 0;
  for (const w of p.skador ?? []) v += HALSA.blodTim * SKADA[w.k].blod * w.g * w.b;
  return v;
}
// hälsan som visas och som valet läser: den gamla hälsan (svält, kyla, törst, sjukdom), blodet och smärtan
export function halsa(p: Person) {
  const b = p.blod ?? 1;
  if (b >= 1 && !p.skador?.length) return p.health;
  return Math.max(0, Math.min(p.health, (b - HALSA.blodDod) / (1 - HALSA.blodDod), 1 - HALSA.smarta * smarta(p)));
}
const lakerFullt = (p: Person) => p.hunger > KROPP.lakerMat && p.torst > TORST.laker;
// det som syns i personrutan: skadorna med del, typ och hur länge de har kvar att läka
export function skadeText(p: Person) {
  return (p.skador ?? []).map(w => `${SKADA[w.k].namn} i ${DEL[w.d].i}${w.g >= HALSA.avbryt ? ', svårt' : ''}${w.b > 0 && SKADA[w.k].blod > 0 ? ', blöder' : ''}, läker på ${Math.ceil(w.g * SKADA[w.k].lakTim / (lakerFullt(p) ? 1 : HALSA.lakSamre))} timmar`);
}

// ---------- varje steg ----------
// en ny skada: loggen, byns räknare, rädsla för platsen och att arbetet avbryts. Returnerar dödsorsaken om den dödar direkt
export function skada(s: State, p: Person, d: Kroppsdel, k: SkadaTyp, g: number, dod: Dodsorsak, nar: string): Dodsorsak | undefined {
  (p.skador ??= []).push({ d, k, g, b: SKADA[k].blod > 0 ? 1 : 0, t: s.now });
  count(s, 'skador'); count(s, 'skada ' + SKADA[k].namn.toLowerCase());
  if (DEL[d].livsviktig && g >= HALSA.dodGrad) return dod;
  if (g >= HALSA.logg) log(s, `${p.name} fick ${SKADA[k].ett} i ${DEL[d].i} ${nar}.`, 'world', [p.id]);
  if (g >= HALSA.radd) fearPlace(s, p, '', `${p.name} skadades svårt där`);
  if (g >= HALSA.avbryt) avbryt(s, p);
  return undefined;
}
// olyckor i det farliga arbete man gör just nu (OLYCKOR)
function olyckaSteg(s: State, p: Person, dtSec: number): Dodsorsak | undefined {
  const t = p.task, o = t && t.phase === 'do' ? OLYCKOR[t.act] : undefined;
  if (!o) return undefined;
  const pd = ACTS[t!.act], sk: Skill | undefined = pd.arbete ?? (pd.hantverk ? 'hantverk' : undefined);
  if (!chance(s, o.risk * (1 - (sk ? p.skill[sk] : 0) / HALSA.skicklig) / HOUR_S, dtSec, 'halsa', p)) return undefined;
  const k = pick(s, o.typer, 'halsa', p), d = pick(s, o.delar, 'halsa', p), u = rnd(s, 'halsa', p);
  return skada(s, p, d, k, o.min + u * u * (o.max - o.min), o.dod, o.nar);
}
// kroppen varje steg (healthStep i steg.ts): olyckor, blödningen, läkningen och blodet som kommer tillbaka.
// Returnerar dödsorsaken om personen dog
export function halsaSteg(s: State, p: Person, dtSec: number): Dodsorsak | undefined {
  const dod = olyckaSteg(s, p, dtSec);
  if (dod) return dod;
  if (!p.skador?.length) { if ((p.blod ?? 1) < 1 && lakerFullt(p)) p.blod = Math.min(1, p.blod! + dtSec / (HALSA.blodTillbaka * HOUR_S)); return undefined; }
  const h = dtSec / HOUR_S, blod = blodning(p), lak = lakerFullt(p) ? 1 : HALSA.lakSamre;
  p.blod = clamp((p.blod ?? 1) - blod * h, 0, 1);
  for (const w of p.skador) {
    if (w.b > 0) w.b = Math.max(0, w.b - h / (HALSA.levrar * (0.5 + w.g)));
    w.g -= h * lak / SKADA[w.k].lakTim;
  }
  p.skador = p.skador.filter(w => w.g > 0);
  if (!p.skador.length) p.skador = undefined;
  else if (blod === 0 && lak === 1) p.blod = Math.min(1, p.blod + h / HALSA.blodTillbaka);
  if (p.blod < HALSA.blodDod) return 'blod';
  const ont = smarta(p);
  if (ont > 0.2) think(p, 'Har ont', -HALSA.smartaHumor * ont, s.now, HOUR);
  return undefined;
}
