import { stor, tal } from './ord';
// Sjukdomarna (steg 9.5.1–9.5.2, "Sjukdomarna i detalj" i designdokumentet). Varje sjukdom är en rad i registret SJUKDOMAR
// med sitt eget förlopp: orsaken, hur starkt den smittar, inkubationen (sjuk men utan tecken), hur länge den varar för en frisk
// vuxen, tecknen i varje stadium, följderna, vården som hjälper, dödligheten per ålder och om man blir immun efteråt. Tiderna är
// dygn (ett dygn är ett år i spelet och en dag i verkligheten).
// Motståndet (steg 9.5.2): sjukdomen och kroppens motstånd är två tal 0–1 hos den sjuke, och båda växer varje slag. Motståndet
// växer i radens takt (1 på radens längd för en frisk vuxen) gånger näringen (protein och vitaminer), vilan, värmen och läkeörten; sjukdomen växer i
// samma takt gånger radens farlighet för hens ålder och en slumpfaktor som dras när hen insjuknar, fortare för den som arbetar.
// Når sjukdomen 1 först dör hen av sjukdomen (dödsorsaken heter som raden); når motståndet 1 först blir hen frisk, och immun om
// raden säger det. Dödligheten per ålder ställs alltså in med farligheten, inte med en tärning vid slutet: farligheten f ger
// döden när slumpfaktorn (jämnt mellan 1 − SJUK.spann och 1 + SJUK.spann) gånger f är större än 1, för en frisk och vilad.
// Filen är systemets enda ställe: registret, insjuknandet, förloppet och texterna.
import { hp } from './gast';
import { DAY, HOUR_S, State, Person } from './typer';
import type { Dodsorsak } from './liv';
import { balans } from './balans';
import { ARSTID, iIstiden } from './tid';
import { ageOf, ALDER, KROPP, count } from './folk';
import { chansPer, clamp, rnd } from './slump';
import { bristGrad } from './naring';
import { living } from './folk';
import { roomAt } from './byggnad';
import { eldarOf, eldXY } from './eld';
import { notis } from './notiser';
import { kn, learnK } from './kunskap';
import { kronika } from './historik';
import { tanke } from './tankar';
import { allaBarn } from './uppvaxt';
import { HALSA, botad } from './halsa';
import { kronikaBer } from './berattelser';

export type SjukOrsak = 'vatten' | 'skamd' | 'ratt' | 'svamp' | 'kyla' | 'smitta';
export interface SjukStadium { fran: number; text: string } // från hur långt sjukdomen kommit (0–1): det kortet säger
export interface SjukDef {
  namn: string; orsak: SjukOrsak[]; utifran?: true; // utifran = uppstår aldrig i byn, kommer med handlare och främlingar (9.5.5)
  smitta: number; // hur starkt den smittar (0 = inte alls), prövas varje timme hos dem nära (9.5.3)
  inkubation: [number, number]; // dygn sjuk utan tecken
  langd: [number, number]; // dygn tills en frisk, vilad vuxen blivit frisk
  dod: { barn: number; vuxen: number; gammal: number }; // så stor del dör utan vård (små barn under ALDER.smabarn, gamla över ALDER.gammal)
  stadier: SjukStadium[];
  foljd: { feber?: number; hosta?: number; diarre?: number }; // följderna (9.5.4): feber sänker medvetandet, hosta orken, diarré ökar törsten
  vard: string[]; // det som hjälper (vården, 9.5.29 och 9.5.33)
  immun?: true;
  arbete: number; // så mycket orkar den sjuke i arbetet
  blir?: { k: string; why: string }; // den som förlorar mot sjukdomen dör inte av den utan får den här (steg 10.10.12: förkylningen blir lunginflammation)
}
const DEF = {
  magsjuka: {
    namn: 'Magsjuka', orsak: ['vatten', 'skamd', 'smitta'], smitta: 0.02, inkubation: [0.1, 0.3], langd: [1, 2],
    dod: { barn: 0.08, vuxen: 0, gammal: 0.05 }, foljd: { diarre: 1 }, vard: ['vatten', 'vila'], arbete: 0.4,
    stadier: [{ fran: 0, text: 'Magsjuk, ont i magen' }, { fran: 0.5, text: 'Magsjuk, diarré och kräkningar' }],
  },
  matforgiftning: {
    namn: 'Matförgiftning', orsak: ['ratt'], smitta: 0, inkubation: [0.05, 0.15], langd: [0.3, 0.8],
    dod: { barn: 0, vuxen: 0, gammal: 0 }, foljd: { diarre: 0.5 }, vard: ['vatten', 'vila'], arbete: 0.5,
    stadier: [{ fran: 0, text: 'Matförgiftad, illamående' }],
  },
  svampforgiftning: {
    namn: 'Svampförgiftning', orsak: ['svamp'], smitta: 0, inkubation: [0.05, 0.1], langd: [0.8, 1.2],
    dod: { barn: 0.4, vuxen: 0.15, gammal: 0.3 }, foljd: { feber: 0.5, diarre: 1 }, vard: ['motgift', 'vatten', 'vila'], arbete: 0.2,
    stadier: [{ fran: 0, text: 'Förgiftad av svamp, ont i magen' }, { fran: 0.5, text: 'Förgiftad av svamp, svag och yr' }],
  },
  forkylning: {
    namn: 'Förkylning', orsak: ['kyla', 'smitta'], smitta: 0.04, inkubation: [0.3, 0.6], langd: [2, 3],
    dod: { barn: 0, vuxen: 0, gammal: 0 }, foljd: { hosta: 0.5 }, vard: ['vila', 'varme'], arbete: 0.7, blir: { k: 'lunginflammation', why: 'efter en förkylning som inte vilades bort' },
    stadier: [{ fran: 0, text: 'Förkyld, snuvig' }, { fran: 0.4, text: 'Förkyld, hostar' }],
  },
  lunginflammation: {
    namn: 'Lunginflammation', orsak: ['smitta'], smitta: 0.01, inkubation: [0.1, 0.2], langd: [4, 6],
    dod: { barn: 0.2, vuxen: 0.02, gammal: 0.33 }, foljd: { feber: 1, hosta: 1 }, vard: ['vila', 'varme', 'lakeort'], arbete: 0.2,
    stadier: [{ fran: 0, text: 'Lunginflammation, hostar och har feber' }, { fran: 0.5, text: 'Lunginflammation, hög feber' }],
  },
  massling: {
    namn: 'Mässlingen', orsak: ['smitta'], utifran: true, smitta: 0.3, inkubation: [0.5, 1], langd: [3, 4],
    dod: { barn: 0.1, vuxen: 0.02, gammal: 0.04 }, foljd: { feber: 1 }, vard: ['vila', 'vatten'], immun: true, arbete: 0.2,
    stadier: [{ fran: 0, text: 'Mässlingen, feber' }, { fran: 0.3, text: 'Mässlingen, feber och utslag' }],
  },
  koppor: {
    namn: 'Kopporna', orsak: ['smitta'], utifran: true, smitta: 0.2, inkubation: [0.5, 1], langd: [6, 8],
    dod: { barn: 0.33, vuxen: 0.33, gammal: 0.33 }, foljd: { feber: 1 }, vard: ['vila', 'vatten'], immun: true, arbete: 0.1,
    stadier: [{ fran: 0, text: 'Kopporna, hög feber' }, { fran: 0.3, text: 'Kopporna, utslag över hela kroppen' }, { fran: 0.7, text: 'Kopporna, blåsor som torkar' }],
  },
} satisfies Record<string, SjukDef>;
export type SjukId = keyof typeof DEF;
export const SJUKDOMAR: Record<SjukId, SjukDef> = DEF;
export const SJUK_IDS = Object.keys(DEF) as SjukId[];

export const SJUK = balans('sjuk', {
  spann: 0.5, // slumpfaktorn på sjukdomens takt: mellan 1 − spann och 1 + spann
  arbetar: 1.5, // sjukdomen växer så här mycket fortare för den som arbetar
  vila: 2, // motståndet växer dubbelt för den som sover
  fryser: 0.5, // ... och hälften för den som fryser
  naringMin: 0.4, // motståndet vid full brist på protein eller vitaminer (naringMot, steg 15.1.107): en svältande har ändå lite motstånd
  lakeort: 2, // läkeörten eller teet (9.5.6) gånger motståndet
  barnMot: 0.5, // motståndet gånger detta för barn under ALDER.barnsjuk (steg 15.1.112, Sjukdomar: Motståndet)
  // chansen att bli sjuk av orsaken, gånger det här: sjukdomarna varar dygn i stället för timmar som förut (steg 9.5.1), så
  // chansen är lika mycket mindre, och lika många är sjuka som förut. Vatten och skämd mat ger magsjuka, rått kött
  // matförgiftning och kylan förkylning
  vatten: 0.11, skamd: 0.22, ratt: 0.3, kyla: 0.12,
  smutsig: 0.15, // chansen till magsjuka för en måltid av mat som plockats där toa-smutsen var full (steg 10.11.14)
  // smittan (steg 9.5.3): så här nära (rutor) räknas som bredvid, och så här nära samma eld som att sitta vid den
  nara: 1.5, eldNara: 3,
  rum: 0.6, eld: 0.5, // i samma rum och vid samma eld smittar det så här mycket av radens smitta (bredvid: hela)
  // följderna (steg 9.5.4): febern sänker medvetandet som en infektion (HALSA.medInf), hostan orken och diarrén ökar törsten
  hosta: 0.3, diarre: 1,
  vilaFran: 0.3, // från så här långt kommen sjukdom vilar den sjuke hellre (vilaHellre), och lägger sig med feber
  ligga: 0.6, // ... och utan feber när sjukdomen kommit så här långt
  kopparOga: 0.1, // så stor del av dem som överlever kopporna förlorar ett öga
  // smittan utifrån (steg 9.5.5): risken att en handlare eller främling bär mässlingen eller kopporna, och hur stor del av dem
  // som är mässlingen
  utifran: 0.03, massling: 0.7,
  vet: 0.3, // den som kan Smittan håller sig undan de sjuka: smittan nära och vid elden gånger det här
  epidemi: 1 / 3, // krönikan skriver om en epidemi när så stor del av byn varit sjuk i samma sjukdom
});
// förkylningens takt per sekund (steg 9.5.1): kylan, oftare i istiden; ai är tidsålderns nummer (ageIndex)
export const forkylning = (ai: number) => (iIstiden(ai) ? ARSTID.sjukIstid : ARSTID.sjuk) * SJUK.kyla / 86400;

// den sjukes tillstånd: raden, när hen smittades, när tecknen kommer (inkubationen), sjukdomen och motståndet (0–1), och
// slumpfaktorn på sjukdomens takt (dras när hen insjuknar)
export interface Sjuk { k: SjukId; t0: number; tecken: number; grad: number; mot: number; r: number; why?: string; av?: number; st?: number } // av: den som smittade hen (9.5.3); st: stadiet som syns (9.5.4)

const mellan = ([a, b]: [number, number], r: number) => a + (b - a) * r;
// farligheten för p: f så att slumpfaktorn gånger f är större än motståndets vanliga takt för radens andel (dod), när
// slumpfaktorn är jämnt fördelad kring 1
function farlighet(d: SjukDef, p: Person, now: number) {
  const a = ageOf(p, now), dod = a < ALDER.smabarn ? d.dod.barn : a >= ALDER.gammal ? d.dod.gammal : d.dod.vuxen;
  // motståndet växer i snitt så här mycket fortare för den som sover en tredjedel av dygnet, som man brukar
  const vanligt = 1 + (SJUK.vila - 1) / 3;
  return vanligt * (dod <= 0 ? 1 - SJUK.spann - 0.15 : 1 / (1 + SJUK.spann - 2 * SJUK.spann * clamp(dod, 0, 1)));
}

// p insjuknar i k (ingen blir sjuk i två saker samtidigt; den som är immun blir inte sjuk). why = orsaken i texten ("av
// smutsigt vatten"). Ger true om hen blev sjuk
export function insjukna(s: State, p: Person, k: SjukId, why?: string) {
  if (p.sjuk || p.immun?.[k]) return false;
  const d = SJUKDOMAR[k];
  p.sjuk = { k, t0: s.now, tecken: s.now + mellan(d.inkubation, rnd(s, 'halsa', p)) * DAY, grad: 0, mot: 0, r: 1 - SJUK.spann + 2 * SJUK.spann * rnd(s, 'halsa', p), ...(why ? { why } : {}) };
  count(s, 'sjuk_' + k);
  return true;
}
// har tecknen kommit (efter inkubationen): bara då är hen sjuk för sig själv och de andra
export const isSick = (p: Person, now: number) => !!p.sjuk && now >= p.sjuk.tecken;
// det kortet säger: stadiet och orsaken
export function sjukText(p: Person) {
  const j = p.sjuk;
  if (!j) return 'Sjuk';
  const d = SJUKDOMAR[j.k], st = [...d.stadier].reverse().find(q => j.grad >= q.fran) ?? d.stadier[0];
  return st.text + (j.why ? ` ${j.why}` : '');
}
// följderna (steg 9.5.4): hur mycket feber, hosta och diarré den sjuke har nu (0–1), mer ju längre sjukdomen kommit
export function foljd(p: Person, now: number, k: 'feber' | 'hosta' | 'diarre') {
  if (!p.sjuk || !isSick(p, now)) return 0;
  return (SJUKDOMAR[p.sjuk.k].foljd[k] ?? 0) * (0.5 + 0.5 * p.sjuk.grad);
}
// svårt sjuk: sjukdomen har kommit så långt att den sjuke lägger sig också utan feber (SJUK.ligga, steg 12.1.46), eller den gamla
// klockan. Loggen (steg.ts) och upplevelserna (uppvaxt.ts) frågar här
export const svartSjukNu = (p: Person, now: number) => isSick(p, now) && (!p.sjuk || p.sjuk.grad >= SJUK.ligga);
// den sjuke lägger sig när febern är hög eller sjukdomen kommit långt (val.ts); annars arbetar hen med det hen orkar
export const ligger = (p: Person, now: number) => isSick(p, now) && (!p.sjuk || !!SJUKDOMAR[p.sjuk.k].foljd.feber && p.sjuk.grad >= SJUK.vilaFran || p.sjuk.grad >= SJUK.ligga);
// hur mycket den sjuke orkar i arbetet (1 för den som är frisk)
export const sjukOrkar = (p: Person, now: number) => !isSick(p, now) ? 1 : p.sjuk ? SJUKDOMAR[p.sjuk.k].arbete * (1 - SJUK.hosta * foljd(p, now, 'hosta')) : 0.3; // hostan tar orken (9.5.4)
// stadiet som syns nu (index i radens stadier)
const stadiumNu = (j: Sjuk) => { const st = SJUKDOMAR[j.k].stadier; let i = 0; st.forEach((q, n) => { if (j.grad >= q.fran) i = n; }); return i; };

// smittan varje timme (steg 9.5.3, steg.ts): de som står bredvid en sjuk som smittar, är i samma rum eller sitter vid samma eld
// prövas med radens smitta; den som är immun eller redan sjuk smittas inte. Också den som ännu inte har tecken smittar
// (inkubationen), så att sjukdomen hinner spridas innan någon märker det. Djuren smittas inte. dt: sekunderna sedan sist, och
// smittan är en chans per timme (steg 12.1.107)
export function smittaTimme(s: State, dt = 3600) {
  const e = s.epidemi; // utbrottet som krönikan skrev om är över när ingen längre är sjuk i det (steg 12.1.135)
  if (e?.skriven && !living(s).some(q => q.sjuk?.k === e.k)) {
    const doda = e.ids.filter(id => s.people.some(q => q.id === id && q.died !== undefined)).length;
    kronikaBer(s, 'k_epidemi', e.ids[0] ?? 0, { sjukdom: SJUKDOMAR[e.k].namn.toLowerCase(), antal: tal(e.ids.length), doda: doda ? ` ${stor(tal(doda))} dog.` : '' });
    delete s.epidemi;
  }
  const sjuka = living(s).filter(p => p.sjuk && SJUKDOMAR[p.sjuk.k].smitta > 0);
  if (!sjuka.length) return;
  const eldar = eldarOf(s).map(f => eldXY(s, f)), vidEld = (p: Person) => eldar.findIndex(e => Math.hypot(p.x - e.x - 0.5, p.y - e.y - 0.5) < SJUK.eldNara);
  for (const p of sjuka) {
    const k = p.sjuk!.k, d = SJUKDOMAR[k], rp = roomAt(s, p.x, p.y), husP = rp?.hus, ep = vidEld(p);
    for (const q of living(s)) {
      if (q === p || q.sjuk || q.immun?.[k]) continue;
      const nara = Math.hypot(q.x - p.x, q.y - p.y) < SJUK.nara, rum = !!rp && roomAt(s, q.x, q.y) === rp, eld = ep >= 0 && vidEld(q) === ep;
      if (isSick(p, s.now) && (rum || husP !== undefined && roomAt(s, q.x, q.y)?.hus === husP)) q.smittNara = s.now; // i samma hus som en som syns vara sjuk: den som kan Smittan tvättar sig sedan med tvål (VARD.tvatta i halsa.ts, steg 13.10.18)
      const tval = ((q.tval ?? -Infinity) > s.now ? HALSA.tvalSmitta : 1) * ((p.tval ?? -Infinity) > s.now ? HALSA.tvalSmitta : 1); // den tvättade smittas och smittar hälften så lätt
      const v = (nara ? 1 : rum ? SJUK.rum : eld ? SJUK.eld : 0) * (kn(q, 'smitta') >= 0.5 ? SJUK.vet : 1) * tval; // den som kan Smittan håller sig undan (9.5.5)
      if (v > 0 && chansPer(s, d.smitta * v, 3600, dt, 'halsa', q) && insjukna(s, q, k)) { q.sjuk!.av = p.id; count(s, 'smittad_' + k); }
    }
  }
}
// smittan utifrån (steg 9.5.5): handlaren som bär en sjukdom smittar dem som står bredvid hen, så länge hen är i byn
export function smittaUtifranTimme(s: State, dt = 3600) {
  const h = s.handlare, P = h && hp(s, h), k = P?.smitta;
  if (!h || !P || !k || h.fas === 'kommer') return;
  const d = SJUKDOMAR[k];
  for (const q of living(s)) if (!q.sjuk && !q.immun?.[k] && Math.hypot(q.x - P.x, q.y - P.y) < SJUK.nara * 2 && chansPer(s, d.smitta, 3600, dt, 'halsa', q) && insjukna(s, q, k, 'av handlaren')) count(s, 'smittadUtifran_' + k);
}
// en handlare eller främling som kommer bär ibland mässlingen eller kopporna (steg 9.5.5): mässlingen vanligare. Ingen ser det
export function barSmitta(s: State): SjukId | undefined {
  if (rnd(s, 'halsa') >= SJUK.utifran) return undefined;
  return rnd(s, 'halsa') < SJUK.massling ? 'massling' : 'koppor';
}

// kunskapen Smittan (steg 9.5.5): lärs när flera i samma hus blir sjuka efter varandra i samma sjukdom, av alla som bor där
function larSmittan(s: State, p: Person, k: SjukId) {
  if (SJUKDOMAR[k].smitta <= 0) return;
  const hus = (q: Person) => roomAt(s, q.x, q.y)?.hus;
  const h = hus(p);
  if (h === undefined) return;
  const andra = living(s).filter(q => q !== p && q.sjuk?.k === k && q.sjuk.st !== undefined && hus(q) === h);
  if (!andra.length) return;
  for (const q of living(s)) if (hus(q) === h && kn(q, 'smitta') < 1) { learnK(q, 'smitta', 1, s.now); count(s, 'larSmittan'); }
}
// epidemin i krönikan (steg 9.5.5): när en tredjedel av byn varit sjuk i samma sjukdom, en gång per utbrott (utbrottet är slut
// när ingen längre är sjuk i den)
function epidemi(s: State, p: Person, k: SjukId) {
  const e = s.epidemi?.k === k && living(s).some(q => q !== p && q.sjuk?.k === k) ? s.epidemi : (s.epidemi = { k, ids: [] });
  if (!e.ids.includes(p.id)) e.ids.push(p.id);
  if (!e.skriven && e.ids.length >= Math.max(3, living(s).length * SJUK.epidemi)) { e.skriven = 1; allaBarn(s, 'epidemi'); kronika(s, `${SJUKDOMAR[k].namn} gick genom byn. ${stor(tal(e.ids.length))} blev sjuka.`, 'sjukdom'); count(s, 'epidemi'); }
}

// näringen i motståndet (steg 15.1.107, Sjukdomar: Motståndet): protein och vitaminer, inte mättnaden. Den som har det som
// behövs (minst NARINGBAL.brist) har fullt motstånd, och med full brist på det ena eller andra SJUK.naringMin
export const naringMot = (p: Person) => 1 - (1 - SJUK.naringMin) * Math.max(bristGrad(p, 'protein'), bristGrad(p, 'vitamin'));
// förloppet varje slag (steg.ts): sjukdomen och motståndet växer. Svarar med dödsorsaken om sjukdomen vann
// dödsorsaken när sjukdomen vann (die i liv.ts)
export const SJUK_DOD: Record<SjukId, Dodsorsak> = { magsjuka: 'magsjuka', matforgiftning: 'matforgiftning', svampforgiftning: 'svamp', forkylning: 'forkylning', lunginflammation: 'lunginflammation', massling: 'massling', koppor: 'koppor' };
export function sjukSteg(s: State, p: Person, dtSec: number, sover: boolean, arbetar: boolean, lakeort = 1): SjukId | undefined { // lakeort: läkeörten eller teet (steg 9.5.8), gånger motståndet
  const j = p.sjuk;
  if (!j || s.now < j.tecken) return undefined;
  // tecknen syns (steg 9.5.4): en notis när hen insjuknar, och när en sjukdom som smittar kommit till byn (det första fallet)
  if (j.st === undefined) {
    j.st = 0;
    larSmittan(s, p, j.k);
    epidemi(s, p, j.k);
    if (SJUKDOMAR[j.k].smitta > 0 && !living(s).some(q => q !== p && q.sjuk?.k === j.k && q.sjuk.st !== undefined)) notis(s, 'smitta', `${SJUKDOMAR[j.k].namn} har kommit till byn. ${p.name} är sjuk.`, [p.id]);
    else notis(s, 'sjuk', `${p.name} har insjuknat: ${sjukText(p).toLowerCase()}.`, [p.id]);
  }
  const d = SJUKDOMAR[j.k], h = dtSec / HOUR_S, bas = 1 / (((d.langd[0] + d.langd[1]) / 2) * 24); // i timmen: 1 på radens längd
  const mot = bas * naringMot(p) * (sover ? SJUK.vila : 1) * (p.warm < KROPP.kallt ? SJUK.fryser : 1) * (ageOf(p, s.now) < ALDER.barnsjuk ? SJUK.barnMot : 1) * lakeort; // barn under fem har långsammare motstånd (steg 15.1.112)
  j.mot = Math.min(1, j.mot + mot * h);
  j.grad = Math.min(1, j.grad + bas * farlighet(d, p, s.now) * j.r * (arbetar ? SJUK.arbetar : 1) * h);
  if (j.grad >= 1 && j.mot < 1) {
    // sjukdomen vann. Förkylningen dödar inte: den blir lunginflammation, som börjar från början med tecken direkt (steg 10.10.12)
    const b = d.blir;
    if (b) {
      p.sjuk = undefined; count(s, 'sjukBlir_' + b.k);
      insjukna(s, p, b.k as SjukId, b.why);
      const ny = p.sjuk as Sjuk | undefined;
      if (ny) { ny.tecken = s.now; ny.st = 0; notis(s, 'sjuk', `${p.name} har fått ${SJUKDOMAR[b.k as SjukId].namn.toLowerCase()} ${b.why}.`, [p.id]); }
      return undefined;
    }
    count(s, 'sjukDod_' + j.k); p.sjuk = undefined; return j.k;
  }
  if (j.mot >= 1) {
    if (d.immun) (p.immun ??= {})[j.k] = 1;
    count(s, 'frisk_' + j.k); p.sjuk = undefined; tanke(p, 'friskIgen', s.now); botad(s, p); // (steg 12.1.131, 12.1.134)
    // kopporna lämnar ärr i ansiktet, och var tionde förlorar ett öga (steg 9.5.4)
    if (j.k === 'koppor') {
      (p.arr ??= []).push({ d: 'huvud', n: 3 });
      if (rnd(s, 'halsa', p) < SJUK.kopparOga) { const o = rnd(s, 'halsa', p) < 0.5 ? 'ogaV' : 'ogaH'; if (!p.saknas?.includes(o)) (p.saknas ??= []).push(o); }
    }
    notis(s, 'sjuk', `${p.name} har blivit frisk från ${d.namn.toLowerCase()}.`, [p.id]);
    return undefined;
  }
  const st = stadiumNu(j);
  if (st > (j.st ?? 0)) { j.st = st; notis(s, 'sjuk', `${p.name} är sämre: ${sjukText(p).toLowerCase()}.`, [p.id]); }
  return undefined;
}
