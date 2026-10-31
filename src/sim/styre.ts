import { ALDER, REL, ageOf, alive, byId, count, franMitt, isKin, living, log, relKey, stat, think } from './folk';
import { ARSTIDER, Fyllning, fyll, kronikaBer, och, personFalt, valjVariant } from './berattelser';
import { skada } from './halsa';
import { die, leave } from './liv';
import { moodOf } from './humor';
import { clamp } from './slump';
import { DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { kronika } from './historik';
import { Sed, drar, influence } from './seder';
import { knows } from './teknik';
import { Bevis, HANDELSER, HandelseTyp, allmant, handelse, ryktbarhet, vittnen } from './rykten';
import { ISTID, ageIndex, hourOf, isLight, kallTid } from './tid';
import { temperature, vaderNu } from './vader';

// Styret (steg 3.5, "Ledarskap och makt" i designdokumentet).
// Ledarskap är en teknik som man kommer på och lär ut i samtal (teknik.ts). Bara den som kan den kan bli ledare: när byn har
// minst LED.vuxna vuxna väljs den mest omtyckta med hög karisma av dem som kan tekniken och inte har dåligt anseende. Dör ledaren
// väljs nästa på samma sätt; kan ingen vuxen tekniken har byn ingen ledare, och påbuden upphör (en by kan glömma ledarskapet).
// Den första ledaren låser upp den första vågskålen, seden Allmogen – Envälde (seder.ts). Ledaren drar sederna med ungefär
// en tredjedel av byns vikt, mer vid Envälde och hög legitimitet. Legitimiteten räknas ur folkets stöd, tiden vid makten och
// vintrarna byn klarat, och sjunker av orättvisa straff; den sparas inte. Påbuden (matlager, vedlager, torkat) kommer ur ledarens
// personlighet och ses över en gång per årstid; straffen delas ut på kvällen för det ledaren sett eller hört som rykte.

// ---------- balanstal (regel 8) ----------
export const LED = balans('ledare', {
  vuxna: 6, // en ledare väljs först när byn har minst så här många vuxna ...
  anseende: 0, // ... bland dem som kan ledarskap och inte har ett anseende under detta (rykten.ts)
  karisma: 2, // valet: stödet (relationen till de andra vuxna, -100 till 100) plus karisman gånger så här mycket
  // titlarna (steg 3.10.18): Kung eller Drottning och Jarl från så här många invånare och så här mycket Envälde
  kungFolk: 60, kungRang: 0.85, jarlFolk: 30, jarlRang: 0.6,
  jarnHard: 1.6, jarnLeg: 0.3, // Järnhanden: hårdheten utan humöret (straff) minst så här, och legitimiteten under så här
  krig: 3, // Krigshövding: vargjakter och strider med vargar under ledarens tid, minst så här många
  vis: 14, // Den vise: intelligens minst så här
  faderStod: 0.75, faderEmp: 14, // Byfader eller Bymoder: stödet (legitimiteten) och empatin minst så här
  hovding: 0.35, // styrelseformen är ett hövdingadöme från så här mycket Envälde
  // ledarens vikt i sederna: byns vikt gånger sedVikt × (1 + sedRang × Envälde) × (sedLegBas + legitimiteten)
  sedVikt: 0.5, sedRang: 1, sedLegBas: 0.5,
  // legitimiteten (0 till 1): stödet (0,5 + snittrelationen / 200) gånger wStod, tiden vid makten (1 - e^(-dygn / tidDygn))
  // gånger wTid, och vintrarna (högst vintrar) gånger wVint, minus orättvisan
  wStod: 0.6, wTid: 0.2, wVint: 0.2, tidDygn: 4, vintrar: 2,
  orattDygn: 3, // orättvisan bleknar med en tidskonstant på så här många dygn
  tanke: 0.04, // ledaren mår så här mycket bättre (tanken Leder byn)
});
export const PAB = balans('pabud', {
  andel: 0.5, // ledarens del av påbuden: andel × (legBas + legitimiteten) × (1 + rang × Envälde), högst max
  legBas: 0.5, rang: 1, max: 0.8,
  plan: 0.4, // inför och under istiden lägger en intelligent ledare (intelligens över 10) till så här mycket per steg (6) på lagren
});
export const STR = balans('straff', {
  dygn: 2, // ledaren dömer för det som hänt de senaste så här många dygnen
  timme: 20, // på kvällen vid den här timmen
  rang: 1, // hårdheten: 1 + rang × Envälde + empati × (10 - empatin) / 10 + humor × (0,5 - humöret), mellan min och max
  empati: 0.3, humor: 0.4, min: 0.3, max: 2.5,
  agg: 0.3, // ... plus agg × (aggressionen − 10) / 10 (steg 3.7.6)
  nara: 0.7, // sina nära (partner, släkt, goda vänner) straffar ledaren så här mycket mildare
  skam: 0.3, slag: 0.6, utvis: 0.9, // straffet: från så här mycket (händelsens vikt gånger hårdheten) skam, slag och utvisning
  slagRang: 0.2, utvisRang: 0.4, // ... slag bara från så här mycket Envälde, och utvisning bara för dråp och från så här mycket
  skamDygn: 1, // skammen: inte äta vid bordet eller sitta vid elden med de andra så här länge
  tanke: 0.06, tankeDygn: 1, // den straffade mår så här mycket sämre per steg i straffet
  slagG: 0.15, // slaget ger ett blåmärke med så här stor svårighet
  familjOp: 12, // ett orättvist straff: den straffades familj tycker så här mycket sämre om ledaren ...
  straffadOp: 8, // ... och den straffade så här mycket sämre
  oratt: 0.08, // ... och legitimiteten sjunker så här mycket (bleknar, LED.orattDygn)
  hord: 0.5, // de som ser straffet hör om brottet med så här stor del av händelsens vikt
  sparas: 30, // så här många rättegångar sparas (steg 3.10.17), de äldsta glöms
});

// ---------- registren ----------
// titlarna (bara text, steg 3.10.18), i den ordning de prövas: den första som passar vinner. namn = [mannens, kvinnans].
// Titeln väljs när ledaren väljs och ses över varje årstid när påbuden sätts. Präst och schaman hör till religionen
interface TitelLage { vuxna: Person[]; folk: number; rang: number; leg: number; stod: number; hard: number; krig: number }
const TITLAR: { namn: [string, string]; passar: (s: State, p: Person, x: TitelLage) => boolean }[] = [
  { namn: ['Kung', 'Drottning'], passar: (_s, _p, x) => x.folk >= LED.kungFolk && x.rang >= LED.kungRang },
  { namn: ['Jarl', 'Jarl'], passar: (_s, _p, x) => x.folk >= LED.jarlFolk && x.rang >= LED.jarlRang },
  { namn: ['Järnhanden', 'Järnhanden'], passar: (_s, _p, x) => x.hard >= LED.jarnHard && x.leg < LED.jarnLeg }, // ett öknamn som folket använder
  { namn: ['Krigshövding', 'Krigshövding'], passar: (_s, _p, x) => x.krig >= LED.krig }, // och seden Fejd när den finns (9.2.3)
  { namn: ['Hövding', 'Hövding'], passar: (_s, _p, x) => x.rang >= LED.hovding },
  { namn: ['Storjägare', 'Storjägare'], passar: (_s, p) => p.tag === 'Jägare' },
  { namn: ['Den vise', 'Den visa'], passar: (_s, p) => p.pot.intelligens >= LED.vis },
  { namn: ['Byfader', 'Bymoder'], passar: (s, p, x) => x.stod >= LED.faderStod && stat(p, 'empati', s.now) >= LED.faderEmp },
  { namn: ['Äldste', 'Äldsta'], passar: (s, p, x) => ageOf(p, s.now) >= ALDER.aldre && x.vuxna.every(q => ageOf(q, s.now) <= ageOf(p, s.now)) },
  { namn: ['Ålderman', 'Ålderman'], passar: () => true }, // byns valda förman
];
const TITELNAMN = new Set(TITLAR.flatMap(t => t.namn));
const hon = (p: Person) => p.sex === 'k' ? 'hon' : 'han', hennes = (p: Person) => p.sex === 'k' ? 'hennes' : 'hans';
const stor = (t: string) => t[0].toUpperCase() + t.slice(1);
// styrelseformerna: namnet och texten byggs ur sederna (fler former när de finns, 9.2), den första som passar
const FORMER: { namn: string; passar: (s: State) => boolean; text: (l: Person, titel: string) => string }[] = [
  { namn: 'Hövdingadöme', passar: s => (s.seder.v.rang ?? 0) >= LED.hovding,
    text: (l, t) => `${l.name}, ${t.toLowerCase()}, bestämmer över byn. ${stor(hon(l))} dömer hårt, och byn gör som ${hon(l)} säger.` },
  { namn: 'Folkting', passar: () => true,
    text: (l, t) => `Byn lyssnar på ${l.name}, ${t.toLowerCase()}. ${stor(hon(l))} bestämmer inte mycket själv, men ${hennes(l)} ord väger tungt. När ${hon(l)} dör väljer byn en ny bland dem som kan leda.` },
];
// vågskålarna: sederna som låses upp av styret, i den ordning de visas. steg = när en låst vågskål byggs
export const VAGSKALAR: { id: string; sed?: Sed; namn: string; steg?: string }[] = [
  { id: 'rang', sed: 'rang', namn: 'Allmogen – Envälde' },
  { id: 'fortjanst', namn: 'Förtjänst – Härkomst', steg: '9.2.1' },
];
// påbuden: vad ledaren tycker (åt vilket håll från byns egen sed, som en sed från -1 till 1). sed = byns egen sed som påbudet
// blandas med (saknas: 0). Hur påbudet används står i val.ts
interface PabudDef { namn: string; text: string; sed?: Sed; asikt: (s: State, l: Person) => number }
const PDEF = {
  matlager: { namn: 'Matlager', text: 'Hur många dygn mat byn ska ha i förrådet innan den slappnar av', sed: 'forsiktighet', asikt: (s, l) => lagerAsikt(s, l) },
  vedlager: { namn: 'Vedlager', text: 'Hur många dygn ved byn ska ha i förrådet', sed: 'forsiktighet', asikt: (s, l) => lagerAsikt(s, l) },
  torkat: { namn: 'Torkat', text: 'Hur mycket av köttet och fisken som torkas på torkställningen', asikt: (s, l) => lagerAsikt(s, l) },
} satisfies Record<string, PabudDef>;
export type Pabud = keyof typeof PDEF;
export const PABUD: Record<Pabud, PabudDef> = PDEF;
export const PABUD_LIST = Object.keys(PDEF) as Pabud[];
// en försiktig ledare vill ha större lager, och en intelligent planerar inför istiden
function lagerAsikt(s: State, l: Person) {
  return clamp(drar(s, l).forsiktighet + (kallTid(ageIndex(s)) ? PAB.plan * (l.pot.intelligens - 10) / 6 : 0), -1, 1);
}

// ---------- data ----------
export interface Ledare { id: number; namn: string; titel: string; forr?: string[]; fran: number; till?: number; slut?: string } // forr: titlarna före den sista
export interface Styre {
  ledare?: number; sedan?: number; titel?: string; // ledaren nu, när hen valdes och titeln
  vintrar?: number; // istider byn klarat under ledaren
  krig0?: number; // byns vargjakter och strider med vargar när ledaren valdes (titeln Krigshövding)
  ai?: number; // årstiden förra timmen
  historia: Ledare[]; // alla ledare
  oppna: string[]; // vågskålarna som låsts upp
  pabud?: Partial<Record<Pabud, number>>; pabudAi?: number; // ledarens åsikt om påbuden, och årstiden de sattes
  oratt?: number; orattT?: number; // orättvisan och när den senast ökade
  domt?: string[]; // fallen som redan dömts
  ratt?: Rattegang[]; // rättegångarna, de senaste STR.sparas (steg 3.10.17)
}
// en rättegång (steg 3.10.17): det som behövs för att visa den. Texten skrivs när den visas (rattegang nedan), med domens timme
export interface Rattegang {
  t: number; led: number; ledNamn: string; om: number; namn: string; // när, ledaren och den dömda
  b: Bevis; // brottet (b.sett: ledaren såg det själv, annars hörde hen det som rykte; b.falsk: det var inte sant)
  sett: number[]; hort: number[]; // de levande som själva sett brottet, och de som hört det som rykte
  hard: number; rang: number; emp: number; hum: number; agg: number; // hårdheten och vad sederna och ledaren lade till
  nara?: true; steg: number; lagom: number; // ledaren stod den dömda nära, straffet och det byn tyckte var lagom
  oratt?: true; leg?: number; van?: number; // orättvis: legitimiteten den kostade och hur många som tyckte sämre om ledaren
  publik: number; dog?: true; // hur många som såg straffet, och om den dömda dog av slaget
  regn?: true; sno?: true; kallt?: true; eld?: true; natt?: true; // vädret och elden
}
const styreOf = (s: State) => s.styre ??= { historia: [], oppna: [] };
export const ledareOf = (s: State) => { const id = s.styre?.ledare; const p = id === undefined ? undefined : byId(s, id); return p && alive(p) ? p : undefined; };
export const sedOppen = (s: State, k: Sed) => k !== 'rang' || !!s.styre?.oppna.includes('rang');

// ---------- legitimiteten ----------
export function legitimitet(s: State) {
  const st = s.styre, l = ledareOf(s);
  if (!st || !l) return { v: 0, stod: 0, tid: 0, vint: 0, oratt: 0 };
  let op = 0, w = 0;
  for (const q of living(s)) {
    if (q === l) continue;
    const wq = influence(s, q); if (!wq) continue;
    op += (s.rels[relKey(l.id, q.id)]?.op ?? 0) * wq; w += wq;
  }
  const stod = clamp(0.5 + (w ? op / w : 0) / 200, 0, 1);
  const tid = 1 - Math.exp(-(s.now - (st.sedan ?? s.now)) / (LED.tidDygn * DAY));
  const vint = Math.min(1, (st.vintrar ?? 0) / LED.vintrar);
  const oratt = (st.oratt ?? 0) * Math.exp(-(s.now - (st.orattT ?? s.now)) / (LED.orattDygn * DAY));
  return { v: clamp(stod * LED.wStod + tid * LED.wTid + vint * LED.wVint - oratt, 0, 1), stod, tid, vint, oratt };
}
// ledarens vikt i sederna (seder.ts): en del av byns samlade vikt
export function ledarVikt(s: State): { p: Person; w: number } | undefined {
  const l = ledareOf(s);
  if (!l) return;
  return { p: l, w: LED.sedVikt * (1 + LED.sedRang * Math.max(0, s.seder.v.rang ?? 0)) * (LED.sedLegBas + legitimitet(s).v) };
}

// ---------- påbuden ----------
export function pabudAndel(s: State) {
  if (!ledareOf(s) || !s.styre?.pabud) return 0;
  return clamp(PAB.andel * (PAB.legBas + legitimitet(s).v) * (1 + PAB.rang * Math.max(0, s.seder.v.rang ?? 0)), 0, PAB.max);
}
// påbudet k: byns egen sed blandad med ledarens åsikt (som en sed, -1 till 1); utan ledare byns egen
export function pabud(s: State, k: Pabud) {
  const d: PabudDef = PABUD[k], egen = d.sed ? s.seder.v[d.sed] : 0, a = pabudAndel(s);
  return a ? egen * (1 - a) + (s.styre!.pabud![k] ?? egen) * a : egen;
}
function sattPabud(s: State, l: Person, ai: number) {
  const st = styreOf(s), forr = st.pabud;
  st.pabud = Object.fromEntries(PABUD_LIST.map(k => [k, PABUD[k].asikt(s, l)]));
  st.pabudAi = ai;
  if (!forr) log(s, `${l.name} bestämmer hur stora förråd byn ska ha.`, 'world', [l.id]);
}

// ---------- valet ----------
const vuxnaOf = (s: State) => living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
function valj(s: State) {
  const vuxna = vuxnaOf(s);
  if (vuxna.length < LED.vuxna) return;
  let best: Person | undefined, bv = -Infinity;
  for (const c of vuxna) {
    if (!knows(c, 'ledarskap') || ryktbarhet(s, c.id).a < LED.anseende) continue;
    let op = 0, w = 0;
    for (const q of vuxna) { if (q === c) continue; const wq = influence(s, q); op += (s.rels[relKey(c.id, q.id)]?.op ?? 0) * wq; w += wq; }
    const v = (w ? op / w : 0) + stat(c, 'karisma', s.now) * LED.karisma;
    if (v > bv) { bv = v; best = c; }
  }
  if (!best) return;
  const st = styreOf(s), forsta = !st.historia.length;
  st.ledare = best.id; st.sedan = s.now; st.vintrar = 0; st.pabud = undefined; st.oratt = 0; st.krig0 = krig(s);
  const titel = st.titel = titelFor(s, best, vuxna);
  st.historia.push({ id: best.id, namn: best.name, titel, fran: s.now });
  count(s, 'ledare_vald');
  if (forsta) { st.oppna.push('rang'); best.fame.push('Byns första ledare'); kronikaBer(s, 'k_forstaLedare', best.id, { ...personFalt(best), titel: titel.toLowerCase() }); }
  else kronikaBer(s, 'k_ledare', best.id, { ...personFalt(best), titel: titel.toLowerCase() });
  log(s, forsta ? `Byn har fått sin första ledare: ${best.name}, ${titel.toLowerCase()}. Byn börjar fundera på om alla är lika mycket värda.` : `${best.name} är byns nya ledare, ${titel.toLowerCase()}.`, 'world', [best.id]);
}
// titeln (steg 3.10.18): den första raden i TITLAR som passar
const krig = (s: State) => (s.stat?.vargjakt ?? 0) + (s.stat?.vargstrid ?? 0);
function titelFor(s: State, l: Person, vuxna: Person[]) {
  const lg = legitimitet(s), d = hardDelar(s, l);
  const x: TitelLage = { vuxna, folk: living(s).length, rang: s.seder.v.rang ?? 0, leg: lg.v, stod: lg.stod, hard: 1 + d.rang + d.emp + d.agg, krig: krig(s) - (s.styre?.krig0 ?? krig(s)) };
  return TITLAR.find(t => t.passar(s, l, x))!.namn[l.sex === 'k' ? 1 : 0];
}
export const ledarTitel = (s: State, l: Person) => titelFor(s, l, vuxnaOf(s));
// titeln ses över varje årstid, och genast om den inte finns i TITLAR (en sparad by från före steg 3.10.18)
function seOverTitel(s: State, l: Person) {
  const st = s.styre!, ny = titelFor(s, l, vuxnaOf(s)), forr = st.titel;
  if (ny === forr) return;
  st.titel = ny;
  const h = st.historia[st.historia.length - 1];
  if (h?.id === l.id && h.till === undefined) { if (forr && TITELNAMN.has(forr)) (h.forr ??= []).push(forr); h.titel = ny; }
  if (forr && TITELNAMN.has(forr)) { log(s, `Byn kallar nu ${l.name} för ${ny.toLowerCase()}.`, 'world', [l.id]); kronika(s, `Byn började kalla ${l.name} för ${ny.toLowerCase()}.`); }
}
function slutar(s: State, varfor: string) {
  const st = s.styre!, h = st.historia[st.historia.length - 1], l = byId(s, st.ledare!);
  if (h && h.till === undefined) { h.till = s.now; h.slut = varfor; }
  if (l) kronika(s, `${l.name} slutade leda byn (${varfor}).`);
  st.ledare = undefined; st.sedan = undefined; st.titel = undefined; st.pabud = undefined; st.pabudAi = undefined;
  if (!vuxnaOf(s).some(p => knows(p, 'ledarskap'))) log(s, 'Ingen i byn kan leda den längre. Påbuden gäller inte mer.', 'world');
}

// ---------- straffen ----------
const STRAFF = ['tillrättavisar', 'skämmer ut', 'slår', 'driver ut'] as const;
const BROTT = new Set<HandelseTyp>(['stold', 'stoldLindrig', 'sla', 'misshandel', 'drap', 'logn', 'overdrev']);
// straffets steg (0 till 3) för vikten v gånger hårdheten
function stegOf(v: number, h: HandelseTyp, rang: number) {
  if (h === 'drap' && rang >= STR.utvisRang && v >= STR.utvis) return 3;
  if (rang >= STR.slagRang && v >= STR.slag) return 2;
  return v >= STR.skam ? 1 : 0;
}
const brottText = (b: Bevis) => HANDELSER[b.h].text.replace('{om}', b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något');
// hårdhetens delar (1 + delarna, mellan STR.min och STR.max): sederna och ledarens empati, humör och aggression
function hardDelar(s: State, l: Person) {
  return { rang: STR.rang * (s.seder.v.rang ?? 0), emp: STR.empati * (10 - stat(l, 'empati', s.now)) / 10, hum: STR.humor * (0.5 - moodOf(l, s.now)), agg: STR.agg * franMitt(l, 'aggression', s.now) };
}
function doma(s: State, l: Person) {
  const st = styreOf(s), now = s.now, rang = s.seder.v.rang ?? 0;
  const domt = (st.domt ??= []);
  // det värsta som var och en gjort, det ledaren sett eller hört de senaste dygnen
  const fall = new Map<number, Bevis>();
  for (const e of l.intryck ?? []) for (const b of e.bev ?? []) {
    if (!BROTT.has(b.h) || now - b.t > STR.dygn * DAY || domt.includes(`${e.om}:${b.h}:${Math.round(b.t)}`)) continue;
    const q = byId(s, e.om);
    if (!q || !alive(q) || ageOf(q, now) < ALDER.vuxen) continue; // barn straffas inte
    const f = fall.get(e.om);
    if (!f || HANDELSER[b.h].vikt > HANDELSER[f.h].vikt) fall.set(e.om, b);
  }
  if (!fall.size) return;
  const delar = hardDelar(s, l);
  const hard0 = clamp(1 + delar.rang + delar.emp + delar.hum + delar.agg, STR.min, STR.max);
  const v = vaderNu(s), ratt = (st.ratt ??= []);
  for (const [id, b] of fall) {
    const q = byId(s, id)!;
    for (const e of l.intryck ?? []) if (e.om === id) for (const x of e.bev ?? []) if (BROTT.has(x.h)) domt.push(`${id}:${x.h}:${Math.round(x.t)}`);
    const nara = l.partner === id || isKin(l, q) || (s.rels[relKey(l.id, id)]?.op ?? 0) > REL.van;
    const vikt = HANDELSER[b.h].vikt, steg = stegOf(vikt * hard0 * (nara ? STR.nara : 1), b.h, rang);
    // det byn tycker är lagom: vikten gånger hårdheten som sederna godtar
    const lagom = stegOf(vikt * clamp(1 + STR.rang * rang, STR.min, STR.max), b.h, rang);
    const orattvist = steg > lagom || (nara && steg < lagom) || !!b.falsk;
    const sett = vittnen(s, l).filter(x => x !== q);
    const r: Rattegang = { t: now, led: l.id, ledNamn: l.name, om: id, namn: q.name, b: { ...b }, ...kanner(s, l, q, b), hard: hard0, ...delar,
      ...(nara ? { nara: true } : {}), steg, lagom, publik: sett.length, ...(v.lage === 'regn' ? { regn: true } : {}), ...(v.sno ? { sno: true } : {}),
      ...(temperature(s) < 0 ? { kallt: true } : {}), ...(s.fire.lit ? { eld: true } : {}), ...(!isLight(now) ? { natt: true } : {}) };
    ratt.push(r);
    count(s, 'straff'); count(s, 'straff_' + steg);
    log(s, `${l.name} ${STRAFF[steg]} ${q.name} för att ${hon(q)} ${brottText(b)}.`, 'rel', [l.id, q.id]);
    allmant(s, q, b, STR.hord, sett); // de som ser straffet får höra om brottet
    think(q, `Straffades av ${l.name}`, -STR.tanke * (steg + 1), now, STR.tankeDygn * DAY);
    if (steg === 1) q.skam = now + STR.skamDygn * DAY;
    if (steg === 2) { const dod = skada(s, q, 'bal', 'blamarke', STR.slagG, 'drap', `när ${l.name} straffade hen`); if (dod) { r.dog = true; die(s, q, dod); continue; } }
    if (steg === 3) { kronikaBer(s, 'k_utvisad', q.id, { ...personFalt(q), ledare: l.name, varfor: `för att ${hon(q)} ${brottText(b)}` }); count(s, 'utvisad'); leave(s, q); }
    if (orattvist) {
      count(s, 'straff_orattvist');
      handelse(s, l, 'orattvisDom', q);
      st.oratt = legitimitet(s).oratt + STR.oratt; st.orattT = now;
      r.oratt = true; r.leg = STR.oratt; r.van = 0;
      for (const f of living(s)) if (f !== l && (f === q || f.partner === id || isKin(f, q))) {
        const rel = s.rels[relKey(l.id, f.id)];
        if (rel) { rel.op = clamp(rel.op - (f === q ? STR.straffadOp : STR.familjOp), -100, 100); r.van++; }
      }
    } else handelse(s, l, 'dom', q);
  }
  if (domt.length > 200) domt.splice(0, domt.length - 200);
  if (ratt.length > STR.sparas) ratt.splice(0, ratt.length - STR.sparas);
}
// de levande (utom ledaren och den dömda) som har brottet b om q bland sina bevis: själva sett, eller hört som rykte
function kanner(s: State, l: Person, q: Person, b: Bevis) {
  const sett: number[] = [], hort: number[] = [];
  for (const x of living(s)) {
    if (x === l || x === q) continue;
    const e = x.intryck?.find(e => e.om === q.id && e.bev?.some(y => y.h === b.h && y.t === b.t && y.mot === b.mot));
    const y = e?.bev!.find(y => y.h === b.h && y.t === b.t && y.mot === b.mot);
    if (y) (y.sett ? sett : hort).push(x.id);
  }
  return { sett, hort };
}

// ---------- rättegångarna i fliken Styre (steg 3.10.17) ----------
const STRAFF_DA = ['tillrättavisade', 'skämde ut', 'slog', 'drev ut'];
const STRAFF_INF = ['få höra hur fel det var', 'skämmas ut inför alla', 'få stryk', 'drivas ut ur byn'];
export const STRAFF_NAMN = ['Tillrättavisning', 'Skam', 'Slag', 'Utvisning'];
// texten om en rättegång: berättelsen ur mallarna r_ratt och r_folk (berattelser.ts), brottet och namnen på dem som visste
export function rattegang(s: State, r: Rattegang) {
  const q = byId(s, r.om), l = byId(s, r.led), namn = (ids: number[]) => och(ids.map(id => byId(s, id)?.name ?? 'någon som glömts'));
  const f: Fyllning = { ...(q ? personFalt(q) : { namn: r.namn, hen: 'hen', honom: 'hen' }), ledare: r.ledNamn, lhen: l ? hon(l) : 'hen',
    brott: brottText(r.b), straff: STRAFF_DA[r.steg], straffInf: STRAFF_INF[r.steg], arstid: ARSTIDER[ageIndex(s, r.t)],
    regn: !!r.regn, sno: !!r.sno, kallt: !!r.kallt, eld: !!r.eld, natt: !!r.natt, sjalv: !!r.b.sett, falsk: !!r.b.falsk,
    oratt: !!r.oratt, hard: r.steg > r.lagom, utvisad: r.steg === 3, dog: !!r.dog, manga: r.publik >= 5 };
  const t = Math.round(r.t / HOUR), nyckel = r.om * 7919 + r.led;
  return {
    berattelse: `${fyll(valjVariant(s, 'r_ratt', nyckel, f, t), f)} ${fyll(valjVariant(s, 'r_folk', nyckel, f, t), f)}`,
    brott: brottText(r.b), sett: r.sett.length ? namn(r.sett) : '', hort: r.hort.length ? namn(r.hort) : '',
  };
}

// ---------- en gång i timmen ----------
export function stepStyre(s: State) {
  const st = s.styre;
  if (!st && !living(s).some(p => knows(p, 'ledarskap'))) return;
  const ai = ageIndex(s);
  if (st?.ledare !== undefined) {
    const l = byId(s, st.ledare);
    if (!l || !alive(l)) slutar(s, l?.left !== undefined ? 'lämnade byn' : 'dog');
    else if (st.ai === ISTID && ai !== ISTID) st.vintrar = (st.vintrar ?? 0) + 1;
  }
  if (st) st.ai = ai;
  if (s.styre?.ledare === undefined) valj(s);
  const l = ledareOf(s);
  if (!l) return;
  s.styre!.ai = ai;
  think(l, 'Leder byn', LED.tanke, s.now, 2 * HOUR);
  if (s.styre!.pabudAi !== ai || !TITELNAMN.has(s.styre!.titel ?? '')) seOverTitel(s, l);
  if (s.styre!.pabudAi !== ai) sattPabud(s, l, ai);
  if (Math.floor(hourOf(s.now)) === STR.timme) doma(s, l);
}
// skammen: den straffade håller sig undan bordet och elden (val.ts)
export const skams = (p: Person, now: number) => p.skam !== undefined && p.skam > now;
export const styrelseform = (s: State) => FORMER.find(f => f.passar(s))!;
