// tillfälligt prov (steg 12.1.229): hur de som fryser ihjäl hade det timmen innan
import '../src/test/utc';
import { korBy } from '../src/test/kor';
import { living, temperature, HOUR } from '../src/sim';
import { roomAt } from '../src/sim/byggnad';
import { heatAt } from '../src/sim/eld';
import { SAKER } from '../src/sim/saker';
import { tingOf } from '../src/sim/agande';
import { fuelStock } from '../src/sim/eld';
const [seed, dagar] = process.argv.slice(2).map(Number);
const snap = new Map<number, string[]>();
let sist = -1; const sett = new Set<number>();
korBy(seed, dagar, s => {
  for (const p of s.people) if (p.died !== undefined && !sett.has(p.id) && sett.add(p.id) && p.cause?.includes('kyla')) console.log(`dag ${(s.now / 24 / HOUR).toFixed(1)} ${p.name} ${p.cause} | ${(snap.get(p.id) ?? []).join(' || ')}`);
  const h = Math.floor(s.now / HOUR); if (h === sist) return; sist = h;
  const kl = tingOf(s).filter(t => SAKER[t.k]?.klad && t.bar !== undefined);
  for (const p of living(s)) {
    const l = snap.get(p.id) ?? []; l.push(`w${p.warm.toFixed(2)} t${temperature(s).toFixed(0)} ${p.task?.act ?? '-'} ${roomAt(s, p.x, p.y) ? 'inne' : 'ute'} heat${heatAt(s, p.x, p.y).toFixed(2)} eld${s.fire.fuel.toFixed(1)} ved${Math.round(fuelStock(s))} kl${kl.filter(t => t.bar === p.id).length}`);
    if (l.length > 4) l.shift(); snap.set(p.id, l);
  }
});
