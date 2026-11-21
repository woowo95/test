// tillfälligt prov (steg 12.1.229): elden och vad folk gör timme för timme
import '../src/test/utc';
import { korBy } from '../src/test/kor';
import { living, temperature, HOUR, DAY } from '../src/sim';
import { fuelStock } from '../src/sim/eld';
const [seed, dagar, fran = 0] = process.argv.slice(2).map(Number);
let sist = -1; const t0 = { v: -1 };
korBy(seed, dagar, s => {
  if (t0.v < 0) t0.v = s.now;
  const h = Math.floor(s.now / HOUR); if (h === sist) return; sist = h;
  const d = (s.now - t0.v) / DAY; if (d < fran) return;
  const f = s.fire, acts: Record<string, number> = {};
  const ppl = living(s);
  for (const p of ppl) { const a = p.task?.act ?? '-'; acts[a] = (acts[a] ?? 0) + 1; }
  const w = ppl.map(p => p.warm.toFixed(1)).join(',');
  console.log(`d${d.toFixed(2)} t${temperature(s).toFixed(0)} eld ${f.lit ? 'L' : '-'} fuel ${f.fuel.toFixed(1)} want ${(f.want ?? 0).toFixed(1)} ved ${Math.round(fuelStock(s))} | ${Object.entries(acts).map(([k, v]) => k + v).join(' ')} | w ${w}`);
});
