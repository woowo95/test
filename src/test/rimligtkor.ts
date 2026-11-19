// npm run rimligt -- [byar] [dygn] (steg 12.1.42): vakterna för det orimliga (RIMLIGT i rimligt.ts) i några byar. Utan tal de tre
// testbyarna (1, 1511 och 4634) i 10 dygn (10 år i spelet); med ett antal byarna 1, 2, 3 … Varje by körs i en egen process,
// samtidigt, och provas varje minut. Utskriften: antalet larm per vakt och de första larmen för var och en. Felkoden är 1 om
// något larmar. Ligger inte i npm test, koll eller snabbkoll förrän byarna går igenom utan larm
import './utc';
import { createState, step } from '../sim';
import { START } from './kor';
import { LAG_PRIO, korSkript } from './pool';
import { type Larm, RIMLIGT, Rimlig } from './rimligt';

const PROV = 60; // sekunder i spelet mellan proven

const i = process.argv.indexOf('--by');
if (i >= 0) { // en by i en egen process: larmen som JSON
  const seed = Number(process.argv[i + 1]), dygn = Number(process.argv[i + 2]);
  const s = createState(seed, START), r = new Rimlig(s, seed);
  for (let k = 0; k < dygn * 86400 / PROV; k++) { step(s, PROV); r.prov(PROV); }
  console.log(JSON.stringify(r.larmen));
} else {
  const arg = process.argv.slice(2).map(Number);
  const byar = arg[0] ? Array.from({ length: arg[0] }, (_, k) => k + 1) : [1, 1511, 4634], dygn = arg[1] ?? 10;
  const t0 = Date.now();
  const ut = await Promise.all(byar.map(b => korSkript('rimligtkor.ts', ['--by', String(b), String(dygn)], {}, LAG_PRIO)));
  const alla: Larm[] = [];
  ut.forEach((u, k) => { if (u.code || !u.out.trim()) console.log(`by ${byar[k]}: KRASCH ${u.err.slice(-400)}`); else alla.push(...JSON.parse(u.out.trim().split('\n').pop()!) as Larm[]); });
  const tid = (l: Larm) => { const d = new Date(l.t); return `dygn ${Math.floor((l.t - START) / 86400000)} kl ${d.toISOString().slice(11, 16)}`; };
  console.log(`Vakterna för det orimliga: ${byar.length} byar i ${dygn} dygn (${dygn} år i spelet)\n`);
  for (const v of RIMLIGT) {
    const l = alla.filter(x => x.vakt === v.id), per = new Set(l.map(x => x.by));
    console.log(`${l.length ? 'LARM' : 'OK  '} ${v.id} (${v.namn}): ${l.length} larm i ${per.size} av ${byar.length} byar`);
    const grupper: Record<string, number> = {};
    for (const x of l) grupper[x.grupp ?? '–'] = (grupper[x.grupp ?? '–'] ?? 0) + 1;
    if (Object.keys(grupper).length > 1) console.log(`       slagen: ${Object.entries(grupper).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    const exempel = Object.keys(grupper).length > 1 ? Object.keys(grupper).slice(0, 10).map(g => l.find(x => (x.grupp ?? '–') === g)!) : l.slice(0, 6);
    for (const x of exempel) console.log(`       by ${x.by}, ${tid(x)}${x.vem ? `, ${x.vem}` : ''}: ${x.text}`);
  }
  console.log(`\n(${Math.round((Date.now() - t0) / 1000)} s datortid)`);
  if (alla.length) process.exitCode = 1;
}
