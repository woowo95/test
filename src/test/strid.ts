// npm run strid -- [antal byar = 16] [dygn = 35]
// Striderna i många byar, per slag (det striden gällde): hur många strider, hur många på varje sida, hur stor del av byns vuxna som
// var med, hur länge de varade, vem som vann, döda, skadade, gav upp och flydde, och hur ofta ett slag träffar
import './utc';
import { korJson, pool, seedAv, sek } from './pool';
import { median } from './nyckeltal';

const [antal = 16, dagar = 35] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Sida = { vapen?: string; n: number; folk: number; dod: number; ger: number; flykt: number; nere: number; skadade: number; skador: number; slag: number; traffar: number };
type Rad = { dag: number; orsak: string; vinnare: number; sek: number; vuxna: number; kom: number; by: Sida; mot: Sida; h: Record<string, number> };
type Ut = { seed: number; pop: number; rader: Rad[]; vakter: number; larm: string[] };
const t0 = Date.now();
const rs = await pool(seeds.map(seed => () => korJson<Ut>('strid-en.ts', [String(seed), String(dagar)], `by ${seed}`)));
const alla = rs.flatMap(r => r.rader.map(x => ({ ...x, seed: r.seed })));
const orsaker = [...new Set(alla.map(x => x.orsak))].sort((a, b) => alla.filter(x => x.orsak === b).length - alla.filter(x => x.orsak === a).length);
console.log(`${antal} byar, ${dagar} dygn (${dagar} år i spelet), ${sek(t0)} s datorns tid; ${alla.length} strider`);
const m = (v: number[], d = 0) => v.length ? median(v).toFixed(d) : '–';
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
for (const o of orsaker) {
  const x = alla.filter(q => q.orsak === o), byar = new Set(x.map(q => q.seed)).size;
  console.log(`\n${o.toUpperCase()}: ${x.length} strider i ${byar} av ${antal} byar`);
  console.log(`  på byns sida (median) ${m(x.map(q => q.by.n))}, varav bybor ${m(x.map(q => q.by.folk))}, som kom till under striden ${sum(x.map(q => q.kom))} i allt; motståndare ${m(x.map(q => q.mot.n))}`);
  console.log(`  andel av byns vuxna som var med (median) ${m(x.map(q => q.vuxna ? 100 * q.by.folk / q.vuxna : 0))} %`);
  console.log(`  längd: median ${m(x.map(q => q.sek))} s, kortast ${Math.min(...x.map(q => q.sek))} s, längst ${Math.max(...x.map(q => q.sek))} s (sekunder i verkligheten, som striden spelas)`);
  console.log(`  byns sida vann ${x.filter(q => q.vinnare === 0).length}, förlorade ${x.filter(q => q.vinnare === 1).length}, oavgjort ${x.filter(q => q.vinnare === -1).length}`);
  const fler = x.filter(q => q.by.n + q.kom >= q.mot.n), farre = x.filter(q => q.by.n + q.kom < q.mot.n);
  console.log(`  när byn var minst lika många (med dem som kom till) vann den ${fler.filter(q => q.vinnare === 0).length} av ${fler.length}; när den var färre ${farre.filter(q => q.vinnare === 0).length} av ${farre.length}`);
  const vap: Record<string, number> = {}; for (const q of x) for (const w of (q.by.vapen ?? '').split(',').filter(Boolean)) vap[w] = (vap[w] ?? 0) + 1;
  if (Object.keys(vap).length) console.log(`  byns vapen när striden börjar: ${Object.entries(vap).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  const sida = (n: 'by' | 'mot', namn: string) => console.log(`  ${namn}: döda ${sum(x.map(q => q[n].dod))}, skadade ${sum(x.map(q => q[n].skadade))} (${sum(x.map(q => q[n].skador))} skador), gav upp ${sum(x.map(q => q[n].ger))}, flydde ${sum(x.map(q => q[n].flykt))}, låg nere ${sum(x.map(q => q[n].nere))}; slag ${sum(x.map(q => q[n].slag))}, träffar ${sum(x.map(q => q[n].traffar))} (${(100 * sum(x.map(q => q[n].traffar)) / Math.max(1, sum(x.map(q => q[n].slag)))).toFixed(0)} %)`);
  sida('by', 'byns sida'); sida('mot', 'motståndarna');
  const h: Record<string, number> = {}; for (const q of x) for (const k in q.h) h[k] = (h[k] ?? 0) + q.h[k];
  console.log(`  händelser per strid: ${Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${(n / x.length).toFixed(1)}`).join(', ')}`);
}
const v = rs.reduce((a, r) => a + r.vakter, 0);
console.log(v ? '\nVAKTER LARMAR:\n  ' + rs.flatMap(r => r.larm.map(l => `by ${r.seed}: ${l}`)).join('\n  ') : '\nVakter: inga fel.');
