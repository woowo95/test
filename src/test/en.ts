// Kör en enda by och skriver nyckeltalen som JSON (används av balanskörningen).
import './utc';
import { korBy } from './kor';
import { living } from '../sim';
const [seed, dagar] = process.argv.slice(2).map(Number);
const r = korBy(seed, dagar);
// stat och teknikerna som någon levande kan följer med, så att balanskörningen kan visa om varje nytt system används
const tek = [...new Set(living(r.s).flatMap(p => Object.keys(p.tek ?? {}).filter(k => (p.tek![k] ?? 0) >= 1)))].sort();
console.log(JSON.stringify({ seed, n: r.n, vakter: r.vakter, stat: r.s.stat ?? {}, tek }));
