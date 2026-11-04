// Namnen (texter/README.md, punkt 1f): makeName i src/sim/folk.ts sätter ihop en början (N1), ibland en mitt (N2) och ett
// slut (NM eller NK). När början slutar på en konsonant blir det ibland tre eller fyra konsonanter i rad (Osllo, Kolrkfast,
// Ylvlle, Irnkel, Tusskleif). Förslaget foga(): mitten tas bara med när den inte ger fler än två konsonanter i rad
// (j räknas inte, så att -björn går bra). Slumpen dras som förut; bara det som sätts ihop ändras.
// npm-fritt: npx tsx texter/namn.ts skriver 60 namn före och efter och alla namn som ändras av de vanliga delarna.
import { N1, N2, NK, NM } from '../src/sim/folk';

const KONS = /[bcdfghjklmnpqrstvwxz]/;
// konsonanter som går bra i slutet av en stavelse (CODA) och i början av nästa (ONSET), som i Askborg, Verkmund och Astrid
const CODA = ['rk', 'rn', 'nd', 'st', 'sk', 'lv', 'rd', 'ns', 'ld', 'lf', 'rg', 'ng', 'lm', 'rm', 'lg', 'nk', 'rv'];
const ONSET = ['tr', 'kr', 'gr', 'br', 'dr', 'fr', 'bj', 'sk', 'st', 'sv', 'kv', 'sm', 'sn'];
// går konsonanterna k att uttala mitt i ett namn? Två går nästan alltid, tre bara som coda + konsonant eller konsonant + onset
const gar = (k: string) => k.length <= 2 || (
  k.length === 3 && k[0] !== k[1] && k[1] !== k[2] && ((CODA.includes(k.slice(0, 2)) && 'bdfgmv'.includes(k[2])) || ('rlns'.includes(k[0]) && ONSET.includes(k.slice(1)))));
// alla konsonantklungor i namnet går att uttala
const klungor = (n: string) => (n.toLowerCase().slice(1).match(/[bcdfghjklmnpqrstvwxz]+/g) ?? []).filter(k => !n.toLowerCase().endsWith(k));
const uttalbart = (n: string) => klungor(n).every(gar);
const langst = (n: string) => Math.max(0, ...klungor(n).map(k => k.length));
// mitten tas bort när namnet blir svårt att uttala med den och lättare utan den (eller bara kortare klungor)
export function foga(borjan: string, mitt: string, slut: string) {
  const med = borjan + mitt + slut, utan = borjan + slut;
  if (mitt && !uttalbart(med) && (uttalbart(utan) || langst(utan) < langst(med))) return utan;
  return med;
}
const stor = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
let x = 12345; const r = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648, pick = <T,>(l: T[]) => l[Math.floor(r() * l.length)];
const ut: string[] = [];
for (let i = 0; i < 60; i++) { const a = pick(N1), m = r() < 0.7 ? pick(N2) : '', sl = pick(r() < 0.5 ? NK : NM); const fore = stor(a + m + sl), efter = stor(foga(a, m, sl)); ut.push(fore === efter ? fore : `${fore} → ${efter}`); }
console.log(ut.join(', '));
let andras = 0, alla = 0;
for (const a of N1) for (const m of ['', ...N2]) for (const sl of [...NK, ...NM]) { alla++; if (foga(a, m, sl) !== a + m + sl) andras++; }
console.log(`\n${andras} av ${alla} möjliga namn ändras.`);
console.log('Björns exempel: ' + [['Os', 'll', 'o'], ['Kol', 'rk', 'fast'], ['Ylv', 'll', 'e'], ['I', 'rn', 'kel'], ['Tus', 'sk', 'leif']].map(([a, m, sl]) => `${stor(a + m + sl)} → ${stor(foga(a, m, sl))}`).join(', '));
