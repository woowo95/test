// Sjukdomarna (steg 9.5.1–9.5.2, "Sjukdomarna i detalj" i designdokumentet). Varje sjukdom är en rad i registret SJUKDOMAR
// med sitt eget förlopp: orsaken, hur starkt den smittar, inkubationen (sjuk men utan tecken), hur länge den varar för en frisk
// vuxen, tecknen i varje stadium, följderna, vården som hjälper, dödligheten per ålder och om man blir immun efteråt. Tiderna är
// dygn (ett dygn är ett år i spelet och en dag i verkligheten).
// Motståndet (steg 9.5.2): sjukdomen och kroppens motstånd är två tal 0–1 hos den sjuke, och båda växer varje slag. Motståndet
// växer i radens takt (1 på radens längd för en frisk vuxen) gånger näringen, vilan, värmen och läkeörten; sjukdomen växer i
// samma takt gånger radens farlighet för hens ålder och en slumpfaktor som dras när hen insjuknar, fortare för den som arbetar.
// Når sjukdomen 1 först dör hen av sjukdomen (dödsorsaken heter som raden); når motståndet 1 först blir hen frisk, och immun om
// raden säger det. Dödligheten per ålder ställs alltså in med farligheten, inte med en tärning vid slutet: farligheten f ger
// döden när slumpfaktorn (jämnt mellan 1 − SJUK.spann och 1 + SJUK.spann) gånger f är större än 1, för en frisk och vilad.
// Filen är systemets enda ställe: registret, insjuknandet, förloppet och texterna.
import { DAY, HOUR_S, State, Person } from './typer';
import { balans } from './balans';
import { ageOf, ALDER, KROPP, count } from './folk';
import { clamp, rnd } from './slump';
import { naringNu, mattnad } from './naring';
import { living, byId } from './folk';
import { roomAt } from './byggnad';
import { eldarOf, eldXY } from './eld';

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
    dod: { barn: 0, vuxen: 0, gammal: 0 }, foljd: { hosta: 0.5 }, vard: ['vila', 'varme'], arbete: 0.7,
    stadier: [{ fran: 0, text: 'Förkyld, snuvig' }, { fran: 0.4, text: 'Förkyld, hostar' }],
  },
  lunginflammation: {
    namn: 'Lunginflammation', orsak: ['kyla', 'smitta'], smitta: 0.01, inkubation: [0.1, 0.2], langd: [4, 6],
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
  naringMin: 0.4, // motståndet gånger näringen, aldrig mindre än så här (en svältande har ändå lite motstånd)
  lakeort: 2, // läkeörten eller teet (9.5.6) gånger motståndet
  // chansen att bli sjuk av orsaken, gånger det här: sjukdomarna varar dygn i stället för timmar som förut (steg 9.5.1), så
  // chansen är lika mycket mindre, och lika många är sjuka som förut. Vatten och skämd mat ger magsjuka, rått kött
  // matförgiftning och kylan förkylning
  vatten: 0.11, skamd: 0.22, ratt: 0.3, kyla: 0.12,
  // smittan (steg 9.5.3): så här nära (rutor) räknas som bredvid, och så här nära samma eld som att sitta vid den
  nara: 1.5, eldNara: 3,
  rum: 0.6, eld: 0.5, // i samma rum och vid samma eld smittar det så här mycket av radens smitta (bredvid: hela)
});

// den sjukes tillstånd: raden, när hen smittades, när tecknen kommer (inkubationen), sjukdomen och motståndet (0–1), och
// slumpfaktorn på sjukdomens takt (dras när hen insjuknar)
export interface Sjuk { k: SjukId; t0: number; tecken: number; grad: number; mot: number; r: number; why?: string; av?: number } // av: den som smittade hen (9.5.3)

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
export const isSick = (p: Person, now: number) => !!p.sjuk && now >= p.sjuk.tecken || p.sickUntil !== undefined && p.sickUntil > now;
// det kortet säger: stadiet och orsaken
export function sjukText(p: Person) {
  const j = p.sjuk;
  if (!j) return 'Sjuk';
  const d = SJUKDOMAR[j.k], st = [...d.stadier].reverse().find(q => j.grad >= q.fran) ?? d.stadier[0];
  return st.text + (j.why ? ` ${j.why}` : '');
}
// svårt sjuk: sjukdomen har kommit över hälften (upplevelserna, uppvaxt.ts), eller den gamla klockan
export const svartSjukNu = (p: Person, now: number) => isSick(p, now) && (!p.sjuk || p.sjuk.grad >= 0.5);
// den sjuke lägger sig när febern är hög eller sjukdomen kommit långt (val.ts); annars arbetar hen med det hen orkar
export const ligger = (p: Person, now: number) => isSick(p, now) && (!p.sjuk || !!SJUKDOMAR[p.sjuk.k].foljd.feber || p.sjuk.grad >= 0.5);
// hur mycket den sjuke orkar i arbetet (1 för den som är frisk)
export const sjukOrkar = (p: Person, now: number) => !isSick(p, now) ? 1 : p.sjuk ? SJUKDOMAR[p.sjuk.k].arbete : 0.3;

// smittan varje timme (steg 9.5.3, steg.ts): de som står bredvid en sjuk som smittar, är i samma rum eller sitter vid samma eld
// prövas med radens smitta; den som är immun eller redan sjuk smittas inte. Också den som ännu inte har tecken smittar
// (inkubationen), så att sjukdomen hinner spridas innan någon märker det. Djuren smittas inte
export function smittaTimme(s: State) {
  const sjuka = living(s).filter(p => p.sjuk && SJUKDOMAR[p.sjuk.k].smitta > 0);
  if (!sjuka.length) return;
  const eldar = eldarOf(s).map(f => eldXY(s, f)), vidEld = (p: Person) => eldar.findIndex(e => Math.hypot(p.x - e.x - 0.5, p.y - e.y - 0.5) < SJUK.eldNara);
  for (const p of sjuka) {
    const k = p.sjuk!.k, d = SJUKDOMAR[k], rp = roomAt(s, p.x, p.y), ep = vidEld(p);
    for (const q of living(s)) {
      if (q === p || q.sjuk || q.immun?.[k]) continue;
      const nara = Math.hypot(q.x - p.x, q.y - p.y) < SJUK.nara, rum = !!rp && roomAt(s, q.x, q.y) === rp, eld = ep >= 0 && vidEld(q) === ep;
      const v = nara ? 1 : rum ? SJUK.rum : eld ? SJUK.eld : 0;
      if (v > 0 && rnd(s, 'halsa', q) < d.smitta * v && insjukna(s, q, k)) { q.sjuk!.av = p.id; count(s, 'smittad_' + k); }
    }
  }
}
// vem som smittade hen (steg 9.5.3), om någon
export const smittadAv = (s: State, p: Person) => p.sjuk?.av !== undefined ? byId(s, p.sjuk.av) : undefined;

// förloppet varje slag (steg.ts): sjukdomen och motståndet växer. Svarar med dödsorsaken om sjukdomen vann
export function sjukSteg(s: State, p: Person, dtSec: number, sover: boolean, arbetar: boolean, lakeort = false): SjukId | undefined {
  const j = p.sjuk;
  if (!j || s.now < j.tecken) return undefined;
  const d = SJUKDOMAR[j.k], h = dtSec / HOUR_S, bas = 1 / (((d.langd[0] + d.langd[1]) / 2) * 24); // i timmen: 1 på radens längd
  const naring = Math.max(SJUK.naringMin, mattnad(naringNu(p)));
  const mot = bas * naring * (sover ? SJUK.vila : 1) * (p.warm < KROPP.kallt ? SJUK.fryser : 1) * (lakeort ? SJUK.lakeort : 1);
  j.mot = Math.min(1, j.mot + mot * h);
  j.grad = Math.min(1, j.grad + bas * farlighet(d, p, s.now) * j.r * (arbetar ? SJUK.arbetar : 1) * h);
  if (j.grad >= 1 && j.mot < 1) { count(s, 'sjukDod_' + j.k); delete p.sjuk; return j.k; }
  if (j.mot >= 1) { if (d.immun) (p.immun ??= {})[j.k] = 1; count(s, 'frisk_' + j.k); delete p.sjuk; }
  return undefined;
}
