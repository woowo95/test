import { createState, step, living, DAY, AGES, ageIndex, ageOf, serialize, State, SEDER, coverOf, getMap } from '../sim';
import { STIG, BAR, hasCover } from '../vag';

const start = Date.parse('2026-10-20T08:00:00+02:00');
const valda = process.argv.slice(2).map(Number);
for (const seed of valda.length ? valda : [1, 42, 777]) {
  const s = createState(seed, start);
  const days = 90;
  const t0 = performance.now();
  let minFood = 1e9, firstFire = -1, litSteps = 0, steps = 0, accidents = 0;
  const acts: Record<string, number> = {};
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < 288; i++) {
      step(s, 300, false); minFood = Math.min(minFood, s.food);
      steps++; if (s.fire.lit) litSteps++;
      for (const p of living(s)) { if (p.thoughts.some(t => t.text === 'Kissade på sig' && t.until - s.now > 4 * 3600000 - 300001)) accidents++; if (ageOf(p, s.now) >= 14 && p.task) acts[p.task.act] = (acts[p.task.act] || 0) + 1; }
      if (firstFire < 0 && s.fire.lit) firstFire = (s.now - start) / 3600000;
    }
    if (d % 7 === 6 || d === days - 1) {
      const ppl = living(s);
      console.log(`seed ${seed} dag ${d + 1} ${AGES[ageIndex(s)]}: pop ${ppl.length}, mat ${s.food.toFixed(0)}, ved ${s.wood.toFixed(0)}, snittålder ${(ppl.reduce((a, p) => a + ageOf(p, s.now), 0) / (ppl.length || 1)).toFixed(1)}, eld ${s.fire.lit ? 'brinner' : 'släckt'}`);
    }
  }
  const kinds: Record<string, number> = {};
  for (const l of s.log) kinds[l.kind] = (kinds[l.kind] || 0) + 1;
  const deaths = s.log.filter(l => l.kind === 'death').map(l => l.text.replace(/^\S+ dog /, '')).map(t => t.split(',')[0]);
  const dc: Record<string, number> = {}; for (const d of deaths) dc[d] = (dc[d] || 0) + 1;
  const f = s.fire;
  console.log('logg', kinds, 'dödsorsaker', dc, 'minFood', minFood.toFixed(0), 'tid', (performance.now() - t0).toFixed(0) + 'ms', 'storlek', (serialize(s).length / 1024).toFixed(0) + 'KB');
  console.log(`eld: första efter ${firstFire.toFixed(1)} h, brann ${(litSteps / steps * 100).toFixed(0)} % av tiden, tänd ${f.lightings} ggr, slocknade ${f.outs} ggr, försök totalt ${f.tryTotal}, ved bränd ${f.totalBurned.toFixed(0)}, förråd ${JSON.stringify(roundItems(s))}`);
  console.log(s.log.filter(l => /eld|glöd|gniststen/i.test(l.text)).slice(0, 6).map(l => l.text).join('\n'));
  const ta = Object.values(acts).reduce((a, b) => a + b, 0);
  console.log('vuxnas tid:', Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / ta * 100).toFixed(0)}%`).join(', '));
  console.log('seder:', SEDER.map(k => `${k} ${s.seder.v[k].toFixed(2)}`).join(', '), '| olyckor på toa', accidents);
  console.log('taggar:', living(s).filter(p => p.tag).map(p => `${p.name}: ${p.tag}`).join(', '), '| tagg-loggar', s.log.filter(l => l.text.includes('kallas nu')).length);
  console.log(s.seder.log.map(l => l.text).join('\n'));
  const cov = coverOf(s), tl = getMap(s.seed).tiles;
  let stig = 0, bar = 0; for (let i = 0; i < cov.length; i++) if (hasCover(tl[i])) { if (cov[i] < BAR) bar++; else if (cov[i] < STIG) stig++; }
  console.log(`mark: ${stig} rutor stig, ${bar} rutor bar jord | kol i förrådet ${Math.round(s.items.kol ?? 0)}, kolhög ${s.fire.ash ?? 0}`);
}
function roundItems(s: State) { const o: Record<string, number> = {}; for (const k in s.items) o[k] = Math.round(s.items[k]); return o; }
