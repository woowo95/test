// npm run recept [-- filter …]: alla recept i registret RECEPT (src/sim/recept.ts), grupperade efter vad de gör
// (sak, station, tillbehör, dörr, plagg), med material, arbetsminuter, tekniken som krävs och verktygen.
// Med filter visas bara de recept vars namn eller grupp innehåller något av orden, t.ex. `npm run recept -- kniv plagg`.
import './utc';
import { RECEPT, RECEPT_LIST } from '../sim/recept';
import type { ReceptRad } from '../sim/recept';

const filter = process.argv.slice(2).map(f => f.toLowerCase());
const GRUPP: Record<ReceptRad['var'], string> = { sak: 'Saker', station: 'Stationer', tillbehor: 'Tillbehör', dorr: 'Dörrar', plagg: 'Plagg' };
for (const g of Object.keys(GRUPP) as ReceptRad['var'][]) {
  const rader = RECEPT_LIST.filter(id => (RECEPT[id] as ReceptRad).var === g && (!filter.length || filter.some(f => id.toLowerCase().includes(f) || g.includes(f))));
  if (!rader.length) continue;
  console.log(`\n${GRUPP[g]} (${rader.length})`);
  for (const id of rader) {
    const r = RECEPT[id] as ReceptRad;
    const av = Object.entries(r.av ?? {}).map(([k, n]) => `${n} ${k}`).join(' + ') || '—';
    const extra = [r.ger && r.ger !== 1 ? `ger ${r.ger}` : '', r.mangd ? `mängd ${r.mangd}` : '', r.tek ? `kräver ${r.tek}` : '',
      r.verktyg ? 'verktyg ' + Object.values(r.verktyg).join('/') : '', r.slag ? `tid: ${r.slag}` : ''].filter(Boolean).join(', ');
    console.log(`  ${id.padEnd(16)} ${av.padEnd(34)} ${String(r.min).padStart(4)} min${extra ? '  ' + extra : ''}`);
  }
}
