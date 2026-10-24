import { createState, step, living, AGES, ageIndex, ageOf, serialize, State, SEDER, groundOf } from '../sim';
import { BAR, FOREST, HIGH, isSoil } from '../sim/vag';

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
  const st = s.stat ?? {};
  const kinds = { födda: st.fodda ?? 0, döda: st.doda ?? 0, gåvor: st.gavor ?? 0, byten: st.byten ?? 0 };
  const dc = Object.fromEntries(Object.entries(st).filter(([k]) => k.startsWith('dog ')).map(([k, v]) => [k.slice(4), v]));
  const f = s.fire;
  console.log('statistik', kinds, 'dödsorsaker', dc, 'minFood', minFood.toFixed(0), 'tid', (performance.now() - t0).toFixed(0) + 'ms', 'storlek', (serialize(s).length / 1024).toFixed(0) + 'KB');
  console.log(`eld: första efter ${firstFire.toFixed(1)} h, brann ${(litSteps / steps * 100).toFixed(0)} % av tiden, tänd ${f.lightings} ggr, slocknade ${f.outs} ggr, försök totalt ${f.tryTotal}, ved bränd ${f.totalBurned.toFixed(0)}, förråd ${JSON.stringify(roundItems(s))}`);
  console.log(s.log.filter(l => /eld|glöd|flint|sten/i.test(l.text)).slice(0, 6).map(l => l.text).join('\n'));
  const ta = Object.values(acts).reduce((a, b) => a + b, 0);
  console.log('vuxnas tid:', Object.entries(acts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / ta * 100).toFixed(0)}%`).join(', '));
  console.log('seder:', SEDER.map(k => `${k} ${s.seder.v[k].toFixed(2)}`).join(', '), '| olyckor på toa', accidents);
  console.log('taggar:', living(s).filter(p => p.tag).map(p => `${p.name}: ${p.tag}`).join(', '), '| fått en tagg', living(s).filter(p => p.kallad?.length).length);
  console.log(s.seder.log.map(l => l.text).join('\n'));
  const g = groundOf(s);
  let skog = 0, planta = 0, hogt = 0, kort = 0, bar = 0;
  for (let i = 0; i < g.cover.length; i++) if (isSoil(g.tiles[i])) {
    if (g.trees[i] >= FOREST) skog++; else if (g.trees[i] > 0) planta++;
    else if (g.cover[i] >= HIGH) hogt++; else if (g.cover[i] >= BAR) kort++; else bar++;
  }
  console.log(`mark: ${skog} skog, ${planta} plantor, ${hogt} högt gräs, ${kort} kort gräs, ${bar} bar jord/stig | fällda träd ${s.fallda ?? 0}, stammar ${(s.stockar ?? []).length} | kol i förrådet ${Math.round(s.items.kol ?? 0)}, kolhög ${s.fire.ash ?? 0}`);
}
function roundItems(s: State) { const o: Record<string, number> = {}; for (const k in s.items) o[k] = Math.round(s.items[k]); return o; }
