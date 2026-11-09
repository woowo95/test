// npm run vard: alla behandlingar i vårdregistret VARD (src/sim/halsa.ts, steg 9.5.6), mest brådskande först, med material,
// redskap, färdigheten i Läkekonst som krävs, tiden, risken och steget där de rader som inte används än börjar användas.
import './utc';
import { VARD, VARD_LIST } from '../sim/halsa';

for (const k of [...VARD_LIST].sort((a, b) => VARD[b].bradska - VARD[a].bradska)) {
  const v = VARD[k];
  const mat = Object.entries(v.material ?? {}).map(([m, n]) => `${n} ${m}`).join(' + ') || '—';
  const extra = [v.redskap ? `redskap ${v.redskap}` : '', v.fardighet !== undefined ? `läkekonst ${v.fardighet}` : '', v.andra ? 'bara på någon annan' : '', v.senare ? `används från steg ${v.senare}` : ''].filter(Boolean).join(', ');
  console.log(`${v.namn.padEnd(14)} brådska ${v.bradska}  ${String(v.tid).padStart(3)} min  risk ${Math.round(v.risk * 100)} %  ${mat.padEnd(10)} ${extra}`);
  console.log(`  ${v.text}`);
}
