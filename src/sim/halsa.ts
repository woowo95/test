import { UPPV, upplev } from './uppvaxt';
// Kroppen (steg 2.5.1). Kroppen har tio delar (KROPPSDELAR): huvud, bål, två armar, två händer, två ben och två fötter (Björn, efter
// v55). Olyckor i farliga arbeten (OLYCKOR) ger skador (SKADOR) i en del: ett sår blöder tills det levrat sig, gör ont och
// gör delen sämre tills det läkt. Den som skadat benen eller fötterna går långsammare (rorlighet), den som skadat armarna eller
// händerna arbetar långsammare (handighet). Blodet (p.blod) kommer tillbaka när man inte blöder och är mätt och otörstig; under
// HALSA.blodDod förblöder man. Mycket svåra skador i huvudet eller bålen dödar direkt, men det är sällsynt. Hälsan i
// gränssnittet och valet (halsa) är en sammanfattning: den gamla hälsan (svält, kyla, törst, sjukdom), blodet och smärtan.
// Vården (steg 2.5.2): ett öppet sår kan bli infekterat (mindre risk med ett förband), och en infektion som inte rengörs växer
// till kallbrand och döden. Vården är en egen handling (varda): man trycker på ett sår som blöder, lägger ett förband av mossa
// (saker.ts; den hittas när man letar i naturen och ibland på ett fällt träd) och rengör ett infekterat sår, på sig själv eller
// på någon annan. Den som inte kan gå kravlar hem, långsamt, eller bärs hem av den som vårdar hen. Man läker fortare när man
// vilar eller sover, och fortare inne. Smuts och hygien kommer med hygienen (2.7). Fliken Hälsa (steg 2.5.3) läser skadeLista,
// delSkada och förmågorna (FORMAGOR)
import { ACTS } from './handlingar';
import { ALDER, KROPP, ageOf, alive, byId, count, forstaGang, living, log, think } from './folk';
import { amountOf, avbryt } from './lager';
import { fearPlace } from './minne';
import { TORST } from './torst';
import { getable, takeMaterial } from './behov';
import { bedFor } from './bygg';
import { freeNear, roomAt } from './byggnad';
import { campDist } from './plats';
import { isForest, tileOf } from './mark';
import { eldPlats } from './karta';
import { chance, clamp, pick, rnd } from './slump';
import { Act, HOUR, HOUR_S, Person, Skill, State, Stock, Task } from './typer';
import { balans } from './balans';
import { blodDroppar, blodas } from './blod';
import { lakFaktor, styrkaFaktor, yrselFaktor } from './naring';
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
  smartaHumor: 0.2, // ... och smärtan sänker humöret så här mycket (gånger smärtan) ...
  ontGrans: 0.2, // ... från den här smärtan (tanken "Har ont", och texten i personrutan)
  minst: 0.2, // rörligheten och händigheten går aldrig under detta
  skicklig: 25, // risken för en olycka gånger 1 − färdigheten / skicklig
  // vården (steg 2.5.2)
  infRisk: 0.01, // chansen i timmen att ett öppet sår blir infekterat ...
  forband: 0.25, // ... gånger detta med ett förband
  infTim: 36, // timmar för en infektion som inte rengörs att växa från ingenting till döden
  infLak: 8, // timmar för en rengjord infektion att gå tillbaka helt ...
  renTim: 6, // ... och så länge ett rengjort sår håller sig rent
  kallbrand: 0.6, // från här är infektionen kallbrand, och att rengöra hjälper inte längre
  infSmarta: 0.5, // infektionen gör så här ont (gånger infektionen)
  vardFel: 0.15, // man trycker på och lägger förband på sår av minst den här graden
  vardMin: 5, // minuter att trycka på såren, lägga förband och rengöra
  vardR: 30, // man går för att vårda den som är högst så här många rutor bort
  vardHand: 0.5, // den som vårdar någon annan har minst så här bra händer
  hemma: 6, // så nära lägret är man hemma (rutor): längre bort kravlar den som inte kan gå, eller bärs
  krypFel: 0.6, // den som har ett ben eller en fot som är så här skadad kan inte gå, utan kravlar ...
  krypFart: 0.002, // ... med den här farten jämfört med att gå (ungefär en ruta på fem minuter)
  baraFart: 0.6, // den som bär någon går så här fort
  buren: 6, // timmar som den skadade som mest väntar på att bäras hem
  vila: 1.5, // man läker så här mycket fortare när man sover eller vilar ...
  inne: 1.25, // ... och så här mycket fortare till inne i ett hus
  vilaOnt: 0.5, // den som har så här ont, eller ett infekterat sår, vilar hellre än arbetar
  mossaTakt: 1, // så mycket mossa man hittar i timmen när man letar i skogen ...
  mossaUte: 0.3, // ... och så stor del av det utanför skogen
  mossaVill: 8, // man tar med sig mossa hem tills byn har så här mycket
  mossaTrad: 0.3, // chansen att ett fällt träd har mossa på sig ...
  mossaStam: 2, // ... och så mycket
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
// för en skada av grad 1 att läka för den som är mätt och otörstig, tecken = symbolen i fliken Hälsa (platshållare)
interface SkadaDef { namn: string; ett: string; tecken: string; blod: number; smarta: number; fel: number; lakTim: number }
export const SKADOR = {
  skarsar: { namn: 'Skärsår', ett: 'ett skärsår', tecken: '🔪', blod: 1, smarta: 0.5, fel: 0.4, lakTim: 24 },
  bett: { namn: 'Bett', ett: 'ett bett', tecken: '🦷', blod: 0.8, smarta: 0.6, fel: 0.5, lakTim: 36 },
  klos: { namn: 'Klösmärken', ett: 'klösmärken', tecken: '🐾', blod: 0.6, smarta: 0.4, fel: 0.3, lakTim: 24 },
  benbrott: { namn: 'Benbrott', ett: 'ett benbrott', tecken: '🦴', blod: 0, smarta: 1, fel: 1, lakTim: 120 },
  krossar: { namn: 'Krossår', ett: 'ett krossår', tecken: '🪨', blod: 0.4, smarta: 0.7, fel: 0.7, lakTim: 48 },
} satisfies Record<string, SkadaDef>;
export type SkadaTyp = keyof typeof SKADOR;
const SKADA: Record<SkadaTyp, SkadaDef> = SKADOR;
// en skada: del, typ, grad (0–1, sjunker när den läker), blödningen kvar (1 = som nyss, 0 = levrad) och när den hände.
// f = ett förband av mossa ligger på, inf = infektionen (0–1; vid 1 dör man), ren = rengjord till den tiden (steg 2.5.2)
export interface Skada { d: Kroppsdel; k: SkadaTyp; g: number; b: number; t: number; f?: 1; inf?: number; ren?: number }
const oppet = (w: Skada) => SKADA[w.k].blod > 0; // ett öppet sår (inte ett benbrott)

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
// gången gånger detta (steg.ts): skadorna och yrseln av brist på mineraler (steg 2.6.2)
export const rorlighet = (p: Person) => forlust(p, 'rorlighet') * yrselFaktor(p);
// den som har ett ben eller en fot som är för skadad kan inte gå, utan kravlar (steg 2.5.2)
export const kanGa = (p: Person) => !p.skador?.length || ![...BEN, ...FOTTER].some(d => delFel(p, d) >= HALSA.krypFel);
export const gangFart = (p: Person) => kanGa(p) ? rorlighet(p) : HALSA.krypFart;
export const hemma = (s: State, p: Person) => campDist(s, Math.floor(p.x), Math.floor(p.y)) <= HALSA.hemma;
const infektion = (p: Person) => { let v = 0; for (const w of p.skador ?? []) v = Math.max(v, w.inf ?? 0); return v; };
// arbetet gånger detta (workRate i ekonomi.ts): skadorna och styrkan, som sjunker av brist på protein och mineraler (steg 2.6.2)
export const handighet = (p: Person) => forlust(p, 'handighet') * styrkaFaktor(p);
export function smarta(p: Person) {
  let v = 0;
  for (const w of p.skador ?? []) v += SKADA[w.k].smarta * w.g + HALSA.infSmarta * (w.inf ?? 0);
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
  return Math.max(0, Math.min(p.health, (b - HALSA.blodDod) / (1 - HALSA.blodDod), 1 - HALSA.smarta * smarta(p), 1 - infektion(p)));
}
// mätt och inte törstig: såren läker fullt, blodet kommer tillbaka och hälsan stiger (halsaLage i steg.ts)
export const lakerFullt = (p: Person) => p.hunger > KROPP.lakerMat && p.torst > TORST.laker;
// ---------- det som syns (personrutan och fliken Hälsa, steg 2.5.3) ----------
// varje skada som en rad: symbolen, vad och var, hur svår, om den blöder, vad som är gjort och hur det går. Personrutan och
// fliken Hälsa läser bara den, så att de aldrig räknar på olika sätt. Timmarna kvar räknar inte med vilan (vilaLak)
// ikon och vard är pixelbildernas nycklar i ikoner.ts (skadan, och förbandet och rengjort)
export interface SkadeRad { d: Kroppsdel; tecken: string; ikon: string; namn: string; grad: string; bloder: boolean; gjort: string[]; vard: string[]; gar: string; battre: boolean }
export function skadeLista(p: Person, now: number): SkadeRad[] {
  const lak = (lakerFullt(p) ? 1 : HALSA.lakSamre) * lakFaktor(p);
  return (p.skador ?? []).map(w => {
    const sk = SKADA[w.k], ren = (w.ren ?? 0) > now, kall = (w.inf ?? 0) >= HALSA.kallbrand;
    const gar = w.inf === undefined ? `läker, ungefär ${Math.ceil(w.g * sk.lakTim / lak)} timmar kvar` : kall ? 'kallbrand, blir sämre' : ren ? 'infekterat men rengjort, blir bättre' : 'infekterat, blir sämre';
    return {
      d: w.d, tecken: w.inf === undefined ? sk.tecken : kall ? '☠️' : '🦠', ikon: 's_' + (w.inf === undefined ? w.k : kall ? 'kall' : 'inf'), namn: `${sk.namn} i ${DEL[w.d].i}`,
      grad: w.g >= HALSA.radd ? 'mycket svårt' : w.g >= HALSA.avbryt ? 'svårt' : 'lätt', bloder: w.b > 0 && oppet(w),
      gjort: [...w.f ? ['förband av mossa'] : [], ...ren ? ['rengjort'] : []], vard: [...w.f ? ['s_forb'] : [], ...ren ? ['s_ren'] : []], gar, battre: w.inf === undefined || (ren && !kall),
    };
  });
}
export const skadeText = (p: Person, now: number) => skadeLista(p, now).map(r => `${r.namn}${r.grad === 'lätt' ? '' : ', ' + r.grad}${r.bloder ? ', blöder' : ''}${r.gjort.map(g => ', ' + g).join('')}, ${r.gar}`);
// hur skadad en del ser ut i bilden (0 = hel, 1 = förstörd): det sämsta av hur mycket sämre den är och infektionen där
export function delSkada(p: Person, d: Kroppsdel) {
  let v = delFel(p, d);
  for (const w of p.skador ?? []) if (w.d === d) v = Math.max(v, w.inf ?? 0);
  return Math.min(1, v);
}

// ---------- förmågorna (registret, steg 2.5.3) ----------
// staplarna i fliken Hälsa: värdet (1 = fullt, för smärtan 1 = så ont det kan göra), det som sänker det just nu och vad
// det påverkar. Syn, hörsel, tal och medvetande kommer med de finare kroppsdelarna (ögon, öron, käke)
interface FormagaDef { namn: string; tecken: string; ont?: true; varde(p: Person): number; delar(p: Person): { namn: string; v: number }[]; gor: string }
// skadade delar, och sist bristen (steg 2.6.2), så att 1 + summan blir värdet
const delarAv = (p: Person, vikt: 'rorlighet' | 'handighet') => {
  const r = (Object.keys(DEL) as Kroppsdel[]).filter(d => (DEL[d][vikt] ?? 0) * delFel(p, d) > 0).map(d => ({ namn: DEL[d].namn, v: -(DEL[d][vikt] ?? 0) * delFel(p, d) }));
  const f = forlust(p, vikt), b = vikt === 'rorlighet' ? yrselFaktor(p) : styrkaFaktor(p);
  return b < 1 ? [...r, { namn: vikt === 'rorlighet' ? 'Yrsel (brist på mineraler)' : 'Brist på protein eller mineraler', v: -f * (1 - b) }] : r;
};
export const FORMAGOR = {
  rorlighet: { namn: 'Rörlighet', tecken: '🦵', varde: rorlighet, delar: p => delarAv(p, 'rorlighet'), gor: 'Gångfarten. Den som har ett ben eller en fot som är mycket skadad kan inte gå, utan kravlar hem eller bärs.' },
  handighet: { namn: 'Händighet', tecken: '✋', varde: handighet, delar: p => delarAv(p, 'handighet'), gor: 'Hur fort arbetet går, och om man kan vårda en annan.' },
  blod: { namn: 'Blod', tecken: '🩸', varde: p => p.blod ?? 1, delar: p => blodning(p) > 0 ? [{ namn: 'Blöder i timmen', v: -blodning(p) }] : [], gor: `Hälsan. Under ${Math.round(HALSA.blodDod * 100)} % förblöder man. Blodet kommer tillbaka på ${HALSA.blodTillbaka} timmar för den som inte blöder och är mätt och otörstig.` },
  smarta: { namn: 'Smärta', tecken: '😣', ont: true, varde: smarta, delar: p => (p.skador ?? []).map(w => ({ namn: `${SKADA[w.k].namn} i ${DEL[w.d].i}`, v: -(SKADA[w.k].smarta * w.g + HALSA.infSmarta * (w.inf ?? 0)) })), gor: 'Hälsan och humöret. Den som har mycket ont vilar hellre än arbetar.' },
} satisfies Record<string, FormagaDef>;
export type Formaga = keyof typeof FORMAGOR;

// ---------- varje steg ----------
// en ny skada: loggen, byns räknare, rädsla för platsen och att arbetet avbryts. Returnerar dödsorsaken om den dödar direkt
export function skada(s: State, p: Person, d: Kroppsdel, k: SkadaTyp, g: number, dod: Dodsorsak, nar: string): Dodsorsak | undefined {
  (p.skador ??= []).push({ d, k, g, b: SKADA[k].blod > 0 ? 1 : 0, t: s.now });
  if (SKADA[k].blod > 0) blodas(s, p.x, p.y, 'skada', g * SKADA[k].blod);
  count(s, 'skador'); count(s, 'skada ' + SKADA[k].namn.toLowerCase());
  if (g >= UPPV.skadaGrad) upplev(s, p, 'skadad', `${SKADA[k].ett} ${nar}`); // ett barn minns det (steg 3.1.2)
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
  const h = dtSec / HOUR_S, blod = blodning(p), mat = lakerFullt(p), lak = (mat ? 1 : HALSA.lakSamre) * vilaLak(s, p) * lakFaktor(p);
  p.blod = clamp((p.blod ?? 1) - blod * h, 0, 1);
  blodDroppar(s, p, blod, dtSec);
  for (const w of p.skador) {
    if (w.b > 0) w.b = Math.max(0, w.b - h / (HALSA.levrar * (0.5 + w.g)));
    infSteg(s, p, w, h, dtSec);
    if (w.inf === undefined) w.g -= h * lak / SKADA[w.k].lakTim; // ett infekterat sår läker inte
  }
  if (p.skador.some(w => (w.inf ?? 0) >= 1)) return 'kallbrand';
  p.skador = p.skador.filter(w => w.g > 0);
  if (!p.skador.length) p.skador = undefined;
  else if (blod === 0 && mat) p.blod = Math.min(1, p.blod + h / HALSA.blodTillbaka);
  if (p.blod < HALSA.blodDod) { blodas(s, p.x, p.y, 'forblodning', 1); return 'blod'; }
  const ont = smarta(p);
  if (ont > HALSA.ontGrans) think(p, 'Har ont', -HALSA.smartaHumor * ont, s.now, HOUR);
  return undefined;
}

// ---------- infektionen och läkningen (steg 2.5.2) ----------
// man läker fortare när man sover eller vilar på sin sovplats, och fortare till inne i ett hus
function vilaLak(s: State, p: Person) {
  const t = p.task;
  if (!t || t.phase !== 'do' || ACTS[t.act].plats !== 'sang' || !ACTS[t.act].vila) return 1;
  return HALSA.vila * (roomAt(s, p.x, p.y) ? HALSA.inne : 1);
}
// ett öppet sår kan bli infekterat; infektionen växer tills den rengörs, och från kallbranden hjälper inte det
function infSteg(s: State, p: Person, w: Skada, h: number, dtSec: number) {
  if (w.inf === undefined) {
    if (!oppet(w) || !chance(s, HALSA.infRisk * (w.f ? HALSA.forband : 1) / HOUR_S, dtSec, 'halsa', p)) return;
    w.inf = 0; count(s, 'infektioner');
    if (w.g >= HALSA.logg) log(s, `${p.name}s sår i ${DEL[w.d].i} blev infekterat.`, 'world', [p.id]);
    return;
  }
  if ((w.ren ?? 0) > s.now && w.inf < HALSA.kallbrand) {
    w.inf -= h / HALSA.infLak;
    if (w.inf <= 0) { w.inf = undefined; w.ren = undefined; count(s, 'infektioner botade'); }
    return;
  }
  const fore = w.inf;
  w.inf += h / HALSA.infTim;
  if (fore < HALSA.kallbrand && w.inf >= HALSA.kallbrand) { count(s, 'kallbrand'); log(s, `${p.name} fick kallbrand i ${DEL[w.d].i}.`, 'world', [p.id]); }
}

// ---------- vården (steg 2.5.2) ----------
// det q behöver av den som vårdar (g): trycka på ett sår som blöder, ett förband av mossa, rengöra ett infekterat sår och
// att bäras hem. undefined = inget
export function vardBehov(s: State, q: Person, g: Person) {
  const sk = q.skador;
  if (!sk?.length) return undefined;
  const stor = (w: Skada) => oppet(w) && w.g >= HALSA.vardFel;
  const blod = sk.some(w => stor(w) && w.b > 0);
  const forband = sk.some(w => stor(w) && !w.f && w.inf === undefined) && getable(s, g, 'mossa') >= 1;
  const rengor = sk.some(w => w.inf !== undefined && w.inf < HALSA.kallbrand && !((w.ren ?? 0) > s.now));
  const bara = g !== q && !kanGa(q) && !hemma(s, q) && q.task?.act !== 'buren';
  return blod || forband || rengor || bara ? { blod, forband, rengor, bara } : undefined;
}
const vardas = (s: State, q: Person, g: Person) => living(s).some(o => o !== g && o.task?.act === 'varda' && o.task.ref === q.id);
// vården som väljs (val.ts): sjalv = sina egna sår (före det mesta), annars den närmaste andra som behöver vård och som ingen
// annan redan går till. Den som vårdar någon annan är vuxen, kan gå och har händer som duger
export function vardVal(s: State, p: Person, sjalv: boolean): { spot: { x: number; y: number }; ref: number; why: string } | undefined {
  if (sjalv) {
    const b = vardBehov(s, p, p);
    if (!b) return undefined;
    return { spot: { x: p.x, y: p.y }, ref: p.id, why: b.blod ? 'Trycker på sitt sår så att det slutar blöda' : b.rengor ? 'Rengör sitt infekterade sår' : 'Lägger mossa på sitt sår' };
  }
  if (ageOf(p, s.now) < ALDER.vuxen || !kanGa(p) || handighet(p) < HALSA.vardHand) return undefined;
  let best: Person | undefined, bd = HALSA.vardR;
  for (const q of living(s)) {
    if (q === p || !q.skador?.length) continue;
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d >= bd || !vardBehov(s, q, p) || vardas(s, q, p)) continue;
    best = q; bd = d;
  }
  if (!best) return undefined;
  const b = vardBehov(s, best, p)!;
  return { spot: { x: best.x, y: best.y }, ref: best.id, why: b.bara && !b.blod && !b.rengor ? `Går för att bära hem ${best.name}` : `Tar hand om ${best.name}s sår` };
}
// på väg till den skadade, som kanske har flyttat sig (walk i steg.ts)
export function vardMal(s: State, tk: Task) {
  const q = byId(s, tk.ref);
  if (q && Math.hypot(q.x - tk.tx, q.y - tk.ty) > 1.5) { const f = freeNear(s, q.x, q.y); tk.tx = f.x; tk.ty = f.y; }
}
// klart (KLAR i steg.ts): såren trycks på, förband läggs och infekterade sår rengörs. Den som inte kan gå bärs sedan hem
export function vardKlar(s: State, p: Person, t: Task) {
  const q = byId(s, t.ref);
  if (!q || !alive(q) || Math.hypot(q.x - p.x, q.y - p.y) > 2) return;
  const b = vardBehov(s, q, p);
  if (!b) return;
  for (const w of q.skador ?? []) {
    if (!oppet(w) || w.g < HALSA.vardFel) continue;
    if (w.b > 0) { w.b = 0; count(s, 'sar tryckta'); }
    if (!w.f && w.inf === undefined && getable(s, p, 'mossa') >= 1) { takeMaterial(s, p, 'mossa', 1); w.f = 1; count(s, 'forband'); }
  }
  for (const w of q.skador ?? []) if (w.inf !== undefined && w.inf < HALSA.kallbrand) { w.ren = s.now + HALSA.renTim * HOUR; count(s, 'sar rengjorda'); }
  count(s, 'vard');
  if (q !== p) { count(s, 'vard av andra'); think(q, `${p.name} tog hand om mig`, 0.1, s.now, 12 * HOUR); }
  if (b.bara) bara(s, p, q, t);
}
// att bära hem den som inte kan gå: till sovplatsen, annars vid elden. Den skadade följer med (barMed)
function bara(s: State, p: Person, q: Person, t: Task) {
  avbryt(s, q);
  const f = eldPlats(s), mal = bedFor(s, q) ?? freeNear(s, f.x + 0.5, f.y + 1.6);
  q.task = { act: 'buren', phase: 'do', tx: q.x, ty: q.y, until: s.now + HALSA.buren * HOUR, carry: 0, ref: p.id, why: `Bärs hem av ${p.name}` };
  t.phase = 'back'; t.bar = q.id; t.tx = mal.x; t.ty = mal.y; t.why = `Bär hem ${q.name}`;
  if (forstaGang(s, 'buren hem')) log(s, `${p.name} bar hem ${q.name}, som inte kunde gå.`, 'world', [p.id, q.id]);
}
// den som bärs följer med den som bär. false = bäraren bär inte längre någon (den skadade dog eller slutade vänta)
export function barMed(s: State, p: Person, t: Task) {
  const q = byId(s, t.bar);
  if (!q || !alive(q) || q.task?.act !== 'buren' || q.task.ref !== p.id) { t.bar = undefined; p.task = undefined; return false; }
  q.x = p.x; q.y = p.y;
  return true;
}
// framme med den som bars: hen läggs ner där
export function lamnaAv(s: State, p: Person, t: Task) {
  const q = byId(s, t.bar);
  if (q && q.task?.act === 'buren' && q.task.ref === p.id) { q.x = p.x; q.y = p.y; q.task = undefined; }
  t.bar = undefined; p.task = undefined;
}
// den som bärs (MEDAN i steg.ts): slutar vänta om bäraren inte längre bär hen
export function burenSteg(s: State, p: Person, t: Task) {
  const g = byId(s, t.ref);
  if (!g || !alive(g) || g.task?.act !== 'varda' || g.task.bar !== p.id) p.task = undefined;
}
// den skadade vilar hellre än arbetar: när det gör mycket ont eller ett sår är infekterat
export const vilaHellre = (p: Person) => !!p.skador?.length && (smarta(p) >= HALSA.vilaOnt || infektion(p) > 0);

// ---------- mossan (steg 2.5.2) ----------
// den som letar i naturen (UTFALL samla i steg.ts) hittar mossa, mer i skogen, tills byn har så mycket den vill ha
export function mossaFynd(s: State, tk: Task, dtSec: number) {
  if (amountOf(s, 'mossa') + (tk.items?.mossa ?? 0) >= HALSA.mossaVill) return 0;
  return HALSA.mossaTakt * dtSec / HOUR_S * (isForest(s, tileOf(tk.tx, tk.ty)) ? 1 : HALSA.mossaUte);
}
// ett fällt träd har ibland mossa på sig, som den som hugger trä av stammen tar med sig (skog.ts)
export function mossaPaStam(s: State, p: Person, k: Stock) {
  if (rnd(s, 'arbete', p) < HALSA.mossaTrad) k.mossa = HALSA.mossaStam;
}
