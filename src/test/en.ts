// Kör en enda by och skriver nyckeltalen som JSON (används av balanskörningen).
import './utc';
import { korBy } from './kor';
import { living, vuxnaOf, DAY } from '../sim';
const [seed, dagar] = process.argv.slice(2).map(Number);
const r = korBy(seed, dagar);
// stat och teknikerna som någon levande kan följer med, så att balanskörningen kan visa om varje nytt system används
const tek = [...new Set(living(r.s).flatMap(p => Object.keys(p.tek ?? {}).filter(k => (p.tek![k] ?? 0) >= 1)))].sort();
// tron (steg 12.6.6): de vuxna, de vuxna med en tro och hur länge den äldsta levande tron funnits, i dygn
const vuxna = vuxnaOf(r.s), tron = (r.s.tron ?? []).filter(t => t.slut === undefined);
const tro = { vuxna: vuxna.length, troende: vuxna.filter(p => p.tro !== undefined).length, tron: tron.length, dygn: tron.length ? Math.max(...tron.map(t => (r.s.now - t.t) / DAY)) : 0 };
console.log(JSON.stringify({ seed, n: r.n, vakter: r.vakter, stat: r.s.stat ?? {}, tek, tro }));
