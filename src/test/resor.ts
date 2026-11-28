// npm run resor -- [dygn] [fil …] (5 dygn och testbyarna 1, 1511 och 4634 efter 20 dygn om inget anges; ett dygn är ett år i
// spelet): alla resor i några världar (steg 15.1.84, Flera samhällen: Vägens händelser i tal). De sparade testbyarna
// (test/facit-byar/) räknas vidare som spelet gör det, en by per process samtidigt, och det världens statistik räknat om resorna
// när det hände (resstat.ts, nycklarna "resor <sort> …") skrivs ut per sort: huvudbyns sällskap per skäl och världens byars färder
// (by:handel, by:gava, by:besked, by:anfall, by:uppdrag, by:handlare, by:flytt). För varje sort: antalet resor som slutat, dygnen
// på vägen, händelserna per resa och vilka, maten kvar vid hemkomsten, timmarna utan mat och utan vatten per resa och hur många
// som skadades och dog. Inget i spelet ändras.
import './utc';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../../test/facit-byar/', import.meta.url)), FIL = fileURLToPath(import.meta.url);
type Tal = Record<string, number>;

if (process.argv[2] === '--en') { // en by: skriv det som ändrats i statistiken som JSON
  const { DAY, nastaSteg, step } = await import('../sim');
  const { lasBy } = await import('./delby');
  const s = lasBy(DIR + process.argv[3]), dygn = Number(process.argv[4]);
  const fore: Tal = { ...s.stat ?? {} }, mal = s.now + dygn * DAY;
  while (s.now < mal) step(s, nastaSteg(s));
  const ut: Tal = {};
  for (const [k, v] of Object.entries(s.stat ?? {})) if (k.startsWith('resor ') && v - (fore[k] ?? 0)) ut[k] = v - (fore[k] ?? 0);
  console.log(JSON.stringify(ut));
} else {
  const dygn = Number(process.argv[2]) || 5, filer = process.argv.slice(3).length ? process.argv.slice(3) : ['1-20.json.gz', '1511-20.json.gz', '4634-20.json.gz'];
  console.error(`Resorna i ${filer.length} världar i ${dygn} dygn (${dygn} år i spelet): ${filer.join(', ')}`);
  const svar = await Promise.all(filer.map(f => new Promise<Tal>((ok, fel) => {
    const p = spawn(process.execPath, [...process.execArgv, FIL, '--en', f, String(dygn)], { stdio: ['ignore', 'pipe', 'inherit'] });
    let txt = '';
    p.stdout.on('data', d => { txt += d; });
    p.on('close', c => { if (c) fel(new Error(`${f}: felkod ${c}`)); else { process.stderr.write('.'); ok(JSON.parse(txt.trim().split('\n').pop()!)); } });
  })));
  process.stderr.write('\n');
  const sum: Tal = {};
  for (const t of svar) for (const [k, v] of Object.entries(t)) sum[k] = (sum[k] ?? 0) + v;
  const sorter = [...new Set(Object.keys(sum).map(k => k.split(' ')[1]!))].sort((a, b) => +a.startsWith('by:') - +b.startsWith('by:') || a.localeCompare(b));
  const f = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
  console.log('sort            resor  dygn/resa  händelser/resa  mat kvar/resa  tim utan mat/resa  tim utan vatten/resa  skadade  döda  försvunna');
  for (const sort of sorter) {
    const g = (k: string) => sum[`resor ${sort} ${k}`] ?? 0, n = g('antal'), per = (k: string) => n ? g(k) / n : 0;
    const by = sort.startsWith('by:');
    console.log(`${sort.padEnd(14)}  ${String(n).padStart(5)}  ${f(per('dygn'), 2).padStart(9)}  ${(by ? '–' : f(per('händelser'), 2)).padStart(14)}  ${(by ? '–' : f(per('mat'))).padStart(13)}  ${(by ? '–' : f(per('utan mat'))).padStart(17)}  ${(by ? '–' : f(per('utan vatten'))).padStart(20)}  ${String(by ? '–' : g('skadade')).padStart(7)}  ${String(g('döda')).padStart(4)}  ${String(by ? '–' : g('försvunna')).padStart(9)}`);
    const h = Object.entries(sum).filter(([k]) => k.startsWith(`resor ${sort} h `)).map(([k, v]) => [k.slice(`resor ${sort} h `.length), v] as const).sort((a, b) => b[1] - a[1]);
    if (h.length) console.log(`${''.padEnd(16)}händelserna: ${h.map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
  console.log('(– : världens byars färder har inga händelser, ingen packning och inga skador på vägen förrän 15.1.85–15.1.87 är byggda)');
}
