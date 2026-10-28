// npm run detaljer -- [by …]: den långa utskriften för en eller flera byar i 90 dygn (90 år i spelet), när något behöver undersökas
import { ALDER, BEAT, HOUR, createState, step, living, AGES, ageIndex, ageOf, serialize, State, SED_LIST, foodOf, amountOf, STACK_ORDER } from '../sim';
import { START as start, STEG_DYGN, markStat } from './kor';

const valda = process.argv.slice(2).map(Number);
for (const seed of valda.length ? valda : [1, 42, 777]) {
  const s = createState(seed, start);
  const days = 90;
  const t0 = performance.now();
  let minFood = 1e9, firstFire = -1, litSteps = 0, steps = 0, accidents = 0;
  const acts: Record<string, number> = {};
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < STEG_DYGN; i++) {
      step(s, BEAT); minFood = Math.min(minFood, foodOf(s));
      steps++; if (s.fire.lit) litSteps++;
      // en olycka på toa: tanken är just tänkt, så den har hela sina 4 h kvar (den räknas bara det steget)
      for (const p of living(s)) { if (p.thoughts.some(t => t.text === 'Kissade på sig' && t.until - s.now === 4 * HOUR)) accidents++; if (ageOf(p, s.now) >= ALDER.vuxen && p.task) acts[p.task.act] = (acts[p.task.act] || 0) + 1; }
      if (firstFire < 0 && s.fire.lit) firstFire = (s.now - start) / HOUR;
    }
    if (d % 7 === 6 || d === days - 1) {
      const ppl = living(s);
      console.log(`seed ${seed} dag ${d + 1} ${AGES[ageIndex(s)]}: pop ${ppl.length}, mat ${foodOf(s).toFixed(0)}, ved ${amountOf(s, 'ved').toFixed(0)}, snittålder ${(ppl.reduce((a, p) => a + ageOf(p, s.now), 0) / (ppl.length || 1)).toFixed(1)}, eld ${s.fire.lit ? 'brinner' : 'släckt'}`);
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
  console.log('seder:', SED_LIST.map(k => `${k} ${s.seder.v[k].toFixed(2)}`).join(', '), '| olyckor på toa', accidents);
  console.log('taggar:', living(s).filter(p => p.tag).map(p => `${p.name}: ${p.tag}`).join(', '), '| fått en tagg', living(s).filter(p => p.kallad?.length).length);
  console.log(s.seder.log.map(l => l.text).join('\n'));
  const m = markStat(s);
  console.log(`mark: ${m.skog} skog, ${m.ung} ungskog, ${m.hog} högt gräs, ${m.kort} kort gräs, ${m.bar} bar jord/stig | fällda träd ${s.fallda ?? 0}, stammar ${(s.stockar ?? []).length} | kol i förrådet ${Math.round(amountOf(s, 'kol'))}, kolhög ${s.fire.ash ?? 0}`);
}
function roundItems(s: State) { const o: Record<string, number> = {}; for (const k of STACK_ORDER) { const n = Math.round(amountOf(s, k)); if (n) o[k] = n; } return o; }
