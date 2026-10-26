// Nyckeltalen: det korBy mäter i varje by (kor.ts) och som testerna visar och jämför. Registret säger en gång vad varje tal
// heter, vilken enhet det har, åt vilket håll det är bättre och hur stor skillnad som spelar roll. Raden per by i npm test,
// facit (test.ts), balans.ts, jamfor.ts (också --satt och --svep) och natur.ts läser härifrån.
// Ett nytt nyckeltal är en ny rad här och en rad i korBy (kor.ts) som räknar fram det: typen Nyckeltal kräver den raden.
// Spara då nytt facit (npm run facit), eftersom facit saknar talet.
// Filen importerar inget från simuleringen.

interface MattDef {
  k: string;       // namnet i Nyckeltal, i facit och i jamfor-cachen
  namn: string;    // etiketten i tabellerna (balans, jamfor, natur)
  kort: string;    // etiketten i raden per by (npm test)
  enhet: string;   // står efter en bys värde i raden per by
  dec: number;     // decimaler för en bys värde (ett snitt i jamfor får en decimal till)
  bra: 1 | -1 | 0; // 1: högre är bättre, -1: lägre är bättre, 0: bara information (visas, men aldrig som bättre eller sämre)
  // jamfor: en skillnad i snitt per by som inte spelar någon roll; en stor skillnad är STOR gånger så mycket.
  // Saknas lika jämförs talet inte i jamfor.
  lika?: number;
  andel?: (n: Record<string, number>) => boolean; // jämförs som andelen byar där det är sant, i procent
  saknas?: true;   // -1 betyder att det inte mättes, och byn räknas då inte för det talet
  samst?: true;    // jamfor --svep visar också den sämsta byn
  dator?: true;    // datorns mått (körtid, storlek), inte hur byn mår: står sist i raden per by och jämförs inte i jamfor
  facit?: (nu: number, facit: number) => boolean; // npm test: hur mycket det får skilja mot facit; saknas: inget alls
  visa?: (v: number) => string; // en bys värde i raden per by, om det inte är talet med dec decimaler och enheten
}

// en stor skillnad i jamfor är så här många gånger det som inte spelar någon roll (lika)
export const STOR = 3;
// sparfilens storlek varierar lite mellan körningar: högst 2 KB eller 10 % mot facit räknas inte som en ändring
const nara = (a: number, b: number) => Math.abs(a - b) <= Math.max(2, b * 0.1);

const DEF = [
  { k: 'pop', namn: 'invånare', kort: 'pop', enhet: '', dec: 0, bra: 1, lika: 1 },
  // gånger alla dog eller flyttade och en vandrare grundade byn på nytt. I jamfor räknas en by som dör ut en gång,
  // hur många gånger den än grundas på nytt: annars väger en enda by för tungt
  { k: 'atergrundad', namn: 'byar som dog ut', kort: 'återgrundad', enhet: ' ggr', dec: 0, bra: -1, lika: 0.05, andel: n => n.atergrundad > 0 },
  // invandring följer av att byn lockar, men ger också fler munnar: bara information
  { k: 'invandrade', namn: 'invandrade', kort: 'in', enhet: '', dec: 0, bra: 0 },
  // utvandring följer av trängsel och hunger
  { k: 'utvandrade', namn: 'utvandrade', kort: 'ut', enhet: '', dec: 0, bra: -1 },
  { k: 'fodda', namn: 'födda', kort: 'födda', enhet: '', dec: 0, bra: 1 },
  { k: 'doda', namn: 'döda', kort: 'döda', enhet: '', dec: 0, bra: -1, lika: 1, samst: true },
  { k: 'svalt', namn: 'svalt ihjäl', kort: 'svält', enhet: '', dec: 0, bra: -1, lika: 0.5, samst: true },
  { k: 'kyla', namn: 'frös ihjäl', kort: 'kyla', enhet: '', dec: 0, bra: -1, lika: 0.5, samst: true },
  // timmar då någon i byn var mycket hungrig
  { k: 'hunger', namn: 'hungertimmar', kort: 'hunger', enhet: ' h', dec: 0, bra: -1, lika: 3 },
  // snitthumör, mätt varje timme
  { k: 'humor', namn: 'humör', kort: 'humör', enhet: '', dec: 2, bra: 1, lika: 0.01 },
  // lägsta förråd när en istid tar slut (den första tar slut efter 34 dygn)
  { k: 'vintermat', namn: 'mat efter vintern', kort: 'vintermat', enhet: '', dec: 0, bra: 1, lika: 10, saknas: true },
  { k: 'vinterved', namn: 'ved efter vintern', kort: 'vinterved', enhet: '', dec: 0, bra: 1, lika: 10, saknas: true },
  // procent av tiden elden brann. Elden är ett verktyg, inte ett mål (CLAUDE.md): bara information
  { k: 'eld', namn: 'eld brann %', kort: 'eld', enhet: ' %', dec: 0, bra: 0, lika: 2 },
  // körtiden beror på hur mycket annat datorn gör samtidigt, så den visas men jämförs aldrig med facit
  { k: 'ms', namn: 'körtid ms', kort: 'körtid', enhet: ' ms', dec: 0, bra: -1, dator: true, facit: () => true, visa: v => (v / 1000).toFixed(1) + ' s' },
  { k: 'kb', namn: 'sparfil KB', kort: 'sparfil', enhet: ' KB', dec: 0, bra: -1, dator: true, facit: nara },
  // den största delen av sparfilen (ett dokument i molnet rymmer DOK_KB, kor.ts)
  { k: 'delKb', namn: 'största delen KB', kort: 'största delen', enhet: ' KB', dec: 0, bra: -1, dator: true, facit: nara },
] as const satisfies readonly MattDef[];

export type Nyckel = (typeof DEF)[number]['k'];
// nyckeltalen för en by, som korBy ger dem
export type Nyckeltal = Record<Nyckel, number>;
export type Matt = MattDef & { k: Nyckel };
// registret, i den ordning talen visas
export const NYCKELTAL: readonly Matt[] = DEF;

const PER_NAMN = new Map<string, Matt>(NYCKELTAL.map(m => [m.k, m]));
// raden för ett nyckeltal
export const matt = (k: Nyckel): Matt => PER_NAMN.get(k)!;

// en bys värde så som det räknas: 1 eller 0 för en andel, undefined om det inte mättes
export function vardeAv(m: Matt, n: Record<string, number>): number | undefined {
  if (m.andel) return m.andel(n) ? 1 : 0;
  const v = n[m.k];
  return m.saknas && v < 0 ? undefined : v;
}
// en bys värde i text, med enheten
export const tal = (m: Matt, v: number) => m.visa ? m.visa(v) : v.toFixed(m.dec) + m.enhet;
// ett snitt eller en median av flera byar i text, utan enheten (den står i etiketten): en andel i procent
export const snittTal = (m: Matt, v: number, extra = 1) => m.andel ? Math.round(v * 100) + ' %' : v.toFixed(m.dec + extra);

// medianen: det mittersta värdet (av två mittersta det övre), och snittet
export const median = (v: number[]) => { const a = [...v].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
export const medel = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
