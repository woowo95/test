// när byarna kommer på teknik och hur många som kan den
import { createState, step, living, TEKNIK, knows, DAY, amountOf } from '../sim';
import { START } from './kor';
const seeds = process.argv.slice(2).map(Number);
for (const seed of seeds.length ? seeds : [1, 2, 3, 4, 5, 6]) {
  const s = createState(seed, START), forst: Record<string, number> = {};
  for (let i = 0; i < 90 * 24 * 12; i++) {
    step(s, 300);
    if (i % 12 === 0) for (const t of TEKNIK) if (forst[t.id] === undefined && living(s).some(p => knows(p, t.id))) forst[t.id] = Math.round((s.now - s.founded) / DAY * 10) / 10;
  }
  const kan = Object.fromEntries(TEKNIK.map(t => [t.id, living(s).filter(p => knows(p, t.id)).length]));
  console.log(JSON.stringify({ seed, pop: living(s).length, forst, kan, yxor: Math.round(amountOf(s, 'yxa')), korgar: Math.round(amountOf(s, 'korg')), spjut: Math.round(amountOf(s, 'fiskespjut')), flintspjut: Math.round(amountOf(s, 'flintspjut')), metspo: Math.round(amountOf(s, 'metspo')), rep: Math.round(amountOf(s, 'rep')), ben: Math.round(amountOf(s, 'ben')), gjort: { flintspjut: s.stat?.flintspjutGjorda ?? 0, metspo: s.stat?.metspoGjorda ?? 0, rep: Math.round(s.stat?.rep ?? 0) }, fisk: { hand: (s.stat?.fisk ?? 0) - (s.stat?.spjutFisk ?? 0) - (s.stat?.metFisk ?? 0), spjut: s.stat?.spjutFisk ?? 0, met: s.stat?.metFisk ?? 0 } }));
}
