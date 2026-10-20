// Kör en enda by och skriver nyckeltalen som JSON (används av balanskörningen).
import { korBy } from './kor';
const [seed, dagar] = process.argv.slice(2).map(Number);
const r = korBy(seed, dagar);
console.log(JSON.stringify({ seed, n: r.n, vakter: r.vakter }));
