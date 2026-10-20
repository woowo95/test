import { createState, step, living, DAY, AGES, ageIndex, ageOf, serialize } from './sim';

const start = Date.parse('2026-10-20T08:00:00+02:00');
for (const seed of [1, 42, 777]) {
  const s = createState(seed, start);
  const days = 90;
  const t0 = performance.now();
  let minFood = 1e9;
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 288; i++) { step(s, 300, false); minFood = Math.min(minFood, s.food); }
    if (d % 7 === 6 || d === days - 1) {
      const ppl = living(s);
      console.log(`seed ${seed} dag ${d + 1} ${AGES[ageIndex(s)]}: pop ${ppl.length}, mat ${s.food.toFixed(0)}, ved ${s.wood.toFixed(0)}, snittålder ${(ppl.reduce((a, p) => a + ageOf(p, s.now), 0) / (ppl.length || 1)).toFixed(1)}`);
    }
  }
  const kinds: Record<string, number> = {};
  for (const l of s.log) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
  const deaths = s.log.filter(l => l.kind === 'death').map(l => l.text.replace(/^\S+ dog /, '')).map(t => t.split(',')[0]);
  const dc: Record<string, number> = {}; for (const d of deaths) dc[d] = (dc[d] || 0) + 1;
  console.log('logg', kinds, 'dödsorsaker', dc, 'minFood', minFood.toFixed(0), 'tid', (performance.now() - t0).toFixed(0) + 'ms', 'storlek', (serialize(s).length / 1024).toFixed(0) + 'KB');
  console.log(s.log.slice(-6).map(l => l.text).join('\n'));
}
