// En testby i bitar (steg 9.2.17). En by kan inte delas på flera kärnor, eftersom varje timme bygger på den förra. I stället går
// testbyarna i npm test i delar om DEL dygn, och varje del börjar från byn som den förra slutade med, sparad och inläst. En bit
// (några delar efter varandra) kan då börja från en sparad by och ge exakt samma by som om hela körningen gått från början,
// och bitarna körs samtidigt. Facit sparar byn vid bitarnas gränser (test/facit-byar/).
//   node --import tsx src/test/delby.ts --bit <frö> <från dygn> <till dygn> [sparad by in eller -] [sparad by ut] [--alla <mapp>]
// skriver sista raden som JSON: delarnas summor, nyckeltalen i slutet, vakterna och tiden. --alla sparar byn vid varje
// delgräns i mappen och tiden för varje del (för npm run facit, som väljer gränserna).
import './utc';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createState, migrate, serialize, type State } from '../sim';
import { Ack, korBy, START } from './kor';
import type { Nyckeltal } from './nyckeltal';

export const DEL = 10; // dygn per del (10 år i spelet): byn sparas och läses in så här ofta, och bitarnas gränser ligger på delgränserna
export const lasBy = (fil: string): State => migrate(JSON.parse(gunzipSync(readFileSync(fil)).toString('utf8')));
export const sparaBy = (fil: string, s: State) => writeFileSync(fil, gzipSync(serialize(s), { level: 9 }));

export interface BitSvar { seed: number; fran: number; till: number; ack: Ack[]; n: Nyckeltal; vakter: string[]; ms: number; delMs: number[] }

// delarnas summor och den sista delens nyckeltal blir byns nyckeltal, som om allt gått i en körning
export function laggIhop(bitar: BitSvar[]): { n: Nyckeltal; vakter: string[]; ms: number } {
  const ack = bitar.flatMap(b => b.ack), sist = bitar[bitar.length - 1].n, sum = (k: keyof Ack) => ack.reduce((a, x) => a + x[k], 0);
  const minst = (k: 'vintermat' | 'vinterved') => Math.min(...ack.map(x => x[k] ?? Infinity)); // en del utan vintern har Infinity, som blir null i JSON
  const humorN = sum('humorN'), steg = sum('steg'), vm = minst('vintermat'), vv = minst('vinterved'), ms = bitar.reduce((a, b) => a + b.ms, 0);
  const n: Nyckeltal = {
    ...sist,
    hunger: sum('hunger'),
    humor: humorN ? +(sum('humor') / humorN).toFixed(3) : 0,
    vintermat: Number.isFinite(vm) ? Math.round(vm) : -1,
    vinterved: Number.isFinite(vv) ? Math.round(vv) : -1,
    eld: steg ? Math.round(sum('lit') / steg * 100) : 0,
    ms,
  };
  return { n, vakter: bitar.flatMap(b => b.vakter), ms };
}

const arg = process.argv.slice(2);
if (arg[0] === '--bit') {
  const [seed, fran, till] = arg.slice(1, 4).map(Number), inFil = arg[4], utFil = arg[5] && arg[5] !== '-' ? arg[5] : undefined;
  const alla = arg.indexOf('--alla') >= 0 ? arg[arg.indexOf('--alla') + 1] : undefined;
  let s = fran === 0 || !inFil || inFil === '-' ? createState(seed, START) : lasBy(inFil);
  const ack: Ack[] = [], delMs: number[] = [], vakter: string[] = [];
  let n: Nyckeltal | undefined;
  for (let d = fran; d < till; d += DEL) {
    const r = korBy(seed, Math.min(DEL, till - d), undefined, s);
    ack.push(r.ack); delMs.push(r.n.ms); vakter.push(...r.vakter); n = r.n;
    s = migrate(JSON.parse(serialize(r.s))); // sparad och inläst, som när en bit börjar från en sparad by
    if (alla && d + DEL < till) sparaBy(`${alla}/${seed}-${d + DEL}.json.gz`, s);
  }
  if (utFil) sparaBy(utFil, s);
  const svar: BitSvar = { seed, fran, till, ack, n: n!, vakter, ms: delMs.reduce((a, b) => a + b, 0), delMs };
  console.log(JSON.stringify(svar));
}
