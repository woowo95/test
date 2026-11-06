// Namnen (texter/README.md, punkt 1f): makeName i src/sim/folk.ts sätter ihop en början (N1), ibland en mitt (N2) och ett
// slut (NM eller NK). När början slutar på en konsonant blir det ibland tre eller fyra konsonanter i rad (Osllo, Kolrkfast,
// Ylvlle, Irnkel, Tusskleif). foga() i folk.ts (steg 6.7.6): mitten tas bara med när den inte ger fler än två konsonanter i rad
// (j räknas inte, så att -björn går bra). Slumpen dras som förut; bara det som sätts ihop ändras.
// npm-fritt: npx tsx texter/namn.ts skriver 60 namn före och efter och alla namn som ändras av de vanliga delarna.
import { N1, N2, NK, NM, foga } from '../src/sim/folk';

const stor = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
let x = 12345; const r = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648, pick = <T,>(l: T[]) => l[Math.floor(r() * l.length)];
const ut: string[] = [];
for (let i = 0; i < 60; i++) { const a = pick(N1), m = r() < 0.7 ? pick(N2) : '', sl = pick(r() < 0.5 ? NK : NM); const fore = stor(a + m + sl), efter = stor(foga(a, m, sl)); ut.push(fore === efter ? fore : `${fore} → ${efter}`); }
console.log(ut.join(', '));
let andras = 0, alla = 0;
for (const a of N1) for (const m of ['', ...N2]) for (const sl of [...NK, ...NM]) { alla++; if (foga(a, m, sl) !== a + m + sl) andras++; }
console.log(`\n${andras} av ${alla} möjliga namn ändras.`);
console.log('Björns exempel: ' + [['Os', 'll', 'o'], ['Kol', 'rk', 'fast'], ['Ylv', 'll', 'e'], ['I', 'rn', 'kel'], ['Tus', 'sk', 'leif']].map(([a, m, sl]) => `${stor(a + m + sl)} → ${stor(foga(a, m, sl))}`).join(', '));
