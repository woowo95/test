import { Person, State } from './typer';
import { balans } from './balans';
import { clamp, pick, pickViktat, rnd } from './slump';
import { makeName } from './folk';

// ---------- grannbyarnas förbindelse med byn (steg 4.4.3; från steg 11.2.15 världens byar) ----------
// Byn är inte ensam i världen. Grannarna är världens byar i huvudbyns grannät (grannbyar.ts): varje sådan rad i världen bär
// byns förbindelse med den (raden.syn, en Klan här): namn, var den ligger, hur många de är, hur starka (de som kan slåss), hur
// mycket de har (ungefär arbetstimmar, som byns rikedom i varde.ts), hur de ser på byn (inställningen, −100 till 100: byns
// anseende hos dem), några namngivna personer och restiden dit till fots. De växer och krymper av sig själva en gång om dygnet
// (ett år i spelet) efter radens regler (rad.ts), och inställningen glöms långsamt mot det neutrala. Ju längre bort en by ligger, desto mer sällan kommer
// handlare, främlingar och räder därifrån (narhet). Handlarna kommer från dem (handel.ts): en klan som tycker illa om byn skickar ingen handlare, varje byte med
// klanens handlare gör den lite vänligare, och märker handlaren att byn lurat hen blir den mindre vänlig. Invandrarna kommer
// därifrån (steg 4.4.4.2), och de som bryter sig ut ur byn blir en av dem (steg 4.4.4.1).
export const KLAN = balans('klan', {
  naraDygn: 1, // en grannby så här många dygns gång bort (ett år i spelet) eller närmare kommer man ifrån som förut; dubbelt så långt bort hälften så ofta
  folk: [12, 60], // så många är de från början
  styrka: [0.25, 0.5], // så stor del av dem kan slåss
  resurser: [15, 30], // så mycket har de per person (ungefär arbetstimmar)
  inst: [-15, 35], // inställningen till byn från början
  handelMin: -30, // en klan som tycker sämre om byn än så skickar ingen handlare
  marka: 0.03, // chansen att hen märker det, per poäng i handlarens Handel
  handlarePer: 2, // så många handlare har en klan som mest (namngivna personer), sedan kommer samma igen
  utbrytFran: 30, // en familj som flyttar ur en by med så många invånare eller fler blir en ny grannklan (steg 4.4.4.1) ...
  utbrytInst: 50, // ... som tycker så här om byn från början
  // främlingar (steg 4.4.4.2, framling i liv.ts): de flesta i byn är barn till dem som redan bor där
  framlingNara: 1.6, // främlingen stannar och pratar så här nära ledaren (rutor, steg 9.2.115)
  framlingPrat: 40, // och pratar så här många minuter innan byn avgör
  framlingTek: 0.6, // chansen att främlingen kan en teknik som ingen i byn kan (men vars krav byn kan)
  taEmot: 0.45, // chansen att byn låter hen stanna, från början ...
  taEmotTek: 0.35, // ... plus så mycket om hen kan något nytt ...
  taEmotInst: 0.3, // ... plus så mycket gånger klanens inställning (−1 till 1) ...
  taEmotSed: 0.2, // ... plus så mycket gånger seden Förnyelse – Tradition (−1 till 1) ...
  taEmotTrang: 0.4, // ... minus så mycket när byn är trång (0 till 1) ...
  taEmotMat: 0.3, // ... och minus så mycket när maten är knapp (0 till 1)
});

// rollerna hos klanernas namngivna personer
export const KLAN_ROLLER: Record<string, { namn: string }> = {
  hovding: { namn: 'Hövding' },
  aldste: { namn: 'Den äldste' },
  jagare: { namn: 'Jägare' },
  handlare: { namn: 'Handlare' },
  grundare: { namn: 'Grundare' },
  barn: { namn: 'Barn' },
};
// var klanerna bodde i en sparad by från före v531, och vad som var sällsynt där (priset i en sådan by tills den fått sin plats i
// världen). Gästernas liv i gastliv.ts reser dit
export const KLAN_HEM: readonly { namn: string; sallsynt: readonly string[] }[] = [
  { namn: 'kusten i söder', sallsynt: ['skinn', 'vargskinn', 'ved'] },
  { namn: 'fjällen i norr', sallsynt: ['rovfron', 'artfron', 'bar'] },
  { namn: 'skogarna i öster', sallsynt: ['fisk', 'torrfisk', 'flinta'] },
  { namn: 'sjöarna i väster', sallsynt: ['flinta', 'sten', 'kott'] },
  { namn: 'älvdalen', sallsynt: ['skinn', 'ben', 'torrkott'] },
  { namn: 'byarna vid havet', sallsynt: ['ved', 'rep', 'torrkott'] },
];
export const KLAN_HEM_NAMN = KLAN_HEM.map(h => h.namn);

export interface KlanPerson { namn: string; sex: 'm' | 'k'; roll: string; id?: number; fodd?: number; rel?: Record<number, import('./gastrel').GastRel>; kropp?: Omit<Person, 'id' | 'x' | 'y' | 'task' | 'gast'>; borta?: number } // id = personens id i byn, för den som kom därifrån; fodd = när hen föddes (gästens liv, steg 4.5.7.7, gastliv.ts); rel = handlarens relationer till byborna (steg 4.5.7.11, gastrel.ts); kropp = hela personen medan hen är hemma, borta = sedan när (steg 9.2.114, gast.ts)
export interface Klan {
  doda?: { namn: string; av: number; t: number }[]; krigisk?: number; radT?: number; // klanens döda, trons Fridsam – Krigisk och senaste räden (system 8.8)
  id: number; namn: string; hem: string;
  folk: number; styrka: number; resurser: number; // hur många, hur många som kan slåss och hur mycket de har (hela tal)
  inst: number; // inställningen till byn, −100 till 100 (byns anseende hos dem)
  personer: KlanPerson[];
  utbrytare?: true; // klanen grundades av några som lämnade byn (steg 4.4.4.1)
  grundad?: number; // när, om den grundades efter byn
  pris?: Record<string, number>; // de slumpade priserna före v532 (steg 10.5.14); tas bort när byn laddas, priset finns i raden (priser.ts)
  rad?: number; dygn?: number; sallsynt?: string[]; // raden i världen, restiden dit till fots och det som är sällsynt på marken där (steg 11.2.15)
}
// förbindelserna med världens byar, i radernas ordning (räknas om när en rad läggs till eller går under); en ruin har ingen
const lista = new WeakMap<object, { n: number; k: Klan[] }>();
export function klanerOf(s: State): Klan[] {
  const r = s.varld?.rader;
  if (!r) return [];
  let c = lista.get(r);
  if (!c || c.n !== r.length) lista.set(r, c = { n: r.length, k: r.flatMap(x => x.syn && x.sort !== 'ruin' ? [x.syn] : []) });
  return c.k;
}
// en by har gått under (byflytt.ts): listan räknas om
export const klanerAndrade = (s: State) => { if (s.varld?.rader) lista.delete(s.varld.rader); };
export const klanById = (s: State, id: number | undefined) => id === undefined ? undefined : klanerOf(s).find(k => k.id === id);
// hur nära byn ligger: 1 inom KLAN.naraDygn, sedan i proportion mot restiden
export const narhet = (k: Klan) => k.dygn === undefined ? 1 : Math.min(1, KLAN.naraDygn / Math.max(1e-6, k.dygn));
const mellan = (s: State, [a, b]: readonly number[]) => a + rnd(s, 'klan') * (b - a);
export const instText = (v: number) => v >= 50 ? 'vänner' : v >= 15 ? 'vänliga' : v > -15 ? 'neutrala' : v > -50 ? 'misstänksamma' : 'fientliga';

// en ny förbindelse med en by (grannbyar.ts ger den en rad i världen): en hövding och en äldste med namn
export function nyKlan(s: State, folk: number, inst: number, namn: string, hem: string, personer?: KlanPerson[]): Klan {
  const id = (s.klanNr = (s.klanNr ?? 0) + 1);
  const per = (r: string): KlanPerson => { const sex = rnd(s, 'klan') < 0.5 ? 'm' : 'k'; return { namn: makeName(s, sex, 'klan'), sex, roll: r }; };
  const k: Klan = {
    krigisk: Math.round(rnd(s, 'klan') * 100), // klanens tro får sina skalor när den grundas (steg 8.8.6)
    id, namn, hem, folk: Math.round(folk), styrka: 0, resurser: 0, inst: Math.round(inst),
    personer: personer ?? [per('hovding'), per('aldste'), ...(rnd(s, 'klan') < 0.5 ? [per('jagare')] : [])],
  };
  k.styrka = Math.round(k.folk * mellan(s, KLAN.styrka));
  k.resurser = Math.round(k.folk * mellan(s, KLAN.resurser));
  return k;
}
export const klanMellan = mellan;

// inställningen ändras (handel, utbrytning, invandring): hela tal mellan −100 och 100
export function andraInst(k: Klan, d: number) { k.inst = clamp(Math.round(k.inst + d), -100, 100); }

// klanen en handlare kommer ifrån (handel.ts): bland dem som inte tycker illa om byn, oftare ur de som ligger nära, och vem av klanens handlare
// alla = testläget (steg 4.5.4.4): vilken klan som helst, också en som inte tycker om byn
export function handlarKlan(s: State, alla?: boolean): { klan: Klan; person: KlanPerson } | undefined {
  const kan = klanerOf(s).filter(k => alla || k.inst > KLAN.handelMin);
  if (!kan.length) return undefined;
  const klan = pickViktat(s, kan, kan.map(narhet), 'klan'), har = klan.personer.filter(p => p.roll === 'handlare');
  if (har.length >= KLAN.handlarePer || (har.length && rnd(s, 'klan') < 0.5)) return { klan, person: pick(s, har, 'klan') };
  const sex = rnd(s, 'klan') < 0.5 ? 'm' : 'k', person = { namn: makeName(s, sex, 'klan'), sex, roll: 'handlare' } as KlanPerson;
  klan.personer.push(person);
  return { klan, person };
}


// ---------- priset hos en grannby (steg 10.5.14; från steg 11.6.3 radens pris, priser.ts) ----------
// Priset hos en grannby är priset i dess rad: gruppens påslag ur bristen gånger sakens eget (radPaslag). En förbindelse utan rad
// (en sparad by från före v531) har priset det som är sällsynt där ger. Det handlaren köper sänker priset och det hen säljer
// höjer det (radPrisAndras). priser.ts sätter krokarna när den laddas
type R = import('./radtal').VarldRad;
export const prisKrok = {
  pris: (_s: State, _r: R, _slag: string) => 1, andras: (_s: State, _r: R, _slag: string, _varde: number, _upp: 1 | -1) => {},
  satt: (_s: State, _r: R, _slag: string, _v: number) => {}, sallsynt: () => 0.5,
  radPris: (_s: State, _nr: number, _sl: string) => 1, // priset på en sak, eller en grupp ("grupp:mat"), i byn med numret nr (prisminnet, minne.ts)
  grupp: (_k: string): string | undefined => undefined, gruppNamn: (_id: string) => '',
};
const radAv = (s: State, k: Klan) => k.rad === undefined ? undefined : s.varld?.rader?.find(r => r.nr === k.rad);
export const klanPris = (s: State, k: Klan | undefined, slag: string) => {
  if (!k) return 1;
  const r = radAv(s, k);
  return r ? prisKrok.pris(s, r, slag) : 1 + ((k.sallsynt ?? KLAN_HEM.find(h => h.namn === k.hem)?.sallsynt)?.includes(slag) ? prisKrok.sallsynt() : 0);
};
// för scenarierna: priserna hos förbindelsen k blir de här
export function sattKlanPris(s: State, k: Klan, p: Record<string, number>) { const r = radAv(s, k); if (r) for (const [sl, v] of Object.entries(p)) prisKrok.satt(s, r, sl, v); }
export function prisAndras(s: State, k: Klan, slag: string, varde: number, upp: 1 | -1) { const r = radAv(s, k); if (r) prisKrok.andras(s, r, slag, varde, upp); }
