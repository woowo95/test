// npm run strid -- [antal byar = 24] [dygn = 35]
// Varje bys resultat sparas i node_modules/.cache/strid/<commit> när byn är klar. En avbruten körning (Ctrl-C, SIGTERM) skriver ihop
// det som hunnit bli klart, och nästa körning på samma commit fortsätter där (har något ändrats sedan commiten börjar den om)
// Striderna i många byar, per slag (det striden gällde): hur många strider, hur många på varje sida, hur stor del av byns vuxna som
// var med, hur länge de varade, vem som vann, döda, skadade, gav upp och flydde, och hur ofta ett slag träffar
import './utc';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arenan } from './strid-arena';
import { korJson, pool, seedAv, sek } from './pool';
import { median } from './nyckeltal';

const [antal = 24, dagar = 35] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Sida = { vapen?: string; n: number; folk: number; dod: number; ger: number; flykt: number; nere: number; skadade: number; skador: number; slag: number; traffar: number };
type Rad = { grader: number[]; flytt: [number, number][]; allvar: number; kampar: number; t0: number; t1: number; tunga: number; dag: number; orsak: string; vinnare: number; sek: number; vuxna: number; kom: number; by: Sida; mot: Sida; h: Record<string, number>; sort: string; forsok: Record<string, number>; slut: [string[], string[]]; efter: number };
type Ut = { seed: number; pop: number; rader: Rad[]; anfall?: { n: number; sedd: number; dag: number; dagSedd: number }; vakter: number; larm: string[]; rikt?: number; lager?: number; lagerFolk?: Record<string, number>; gangen?: { ur?: string; namn?: string; vapen?: string[]; n: number; sedd?: number; framme?: number; anfall?: number; dag: boolean; chans?: number; vann?: boolean }[] };
const t0 = Date.now();
const git = (k: string) => { try { return execSync(`git ${k}`, { encoding: 'utf8' }).trim(); } catch { return ''; } };
const orord = !git('status --porcelain --untracked-files=no -- src') && git('rev-parse --short HEAD'); // ett oändrat bygge fortsätter där det slutade
const tal = (process.env.BALANS ?? "").replace(/[^\w.=,/-]+/g, "").replace(/\//g, "_"); // andra balanstal ger andra byar: de sparas för sig
const mapp = `node_modules/.cache/strid/${orord || "andrad"}-${dagar}${tal && `-${tal}`}`;
if (!orord) rmSync(mapp, { recursive: true, force: true });
mkdirSync(mapp, { recursive: true });
const rs: Ut[] = [];
let skrivet = false;
const avbruten = () => { if (!skrivet) rapport(); process.exit(130); };
process.prependListener('SIGINT', avbruten); process.prependListener('SIGTERM', avbruten);
await pool(seeds.map(seed => async () => {
  const fil = `${mapp}/${seed}.json`;
  if (existsSync(fil)) { rs.push(JSON.parse(readFileSync(fil, 'utf8'))); return; }
  try { const r = await korJson<Ut>('strid-en.ts', [String(seed), String(dagar)], `by ${seed}`); writeFileSync(fil, JSON.stringify(r)); rs.push(r); console.error(`by ${seed} klar (${rs.length} av ${antal}, ${sek(t0)} s)`); }
  catch (e) { console.error((e as Error).message); process.exitCode = 1; }
}));
rapport();
console.log('\nARENAN: samma strider 300 gånger var, jämnstarka vuxna; slutet för den ena sidan | den andra');
arenan(300);
function rapport() {
skrivet = true;
const alla = rs.flatMap(r => r.rader.map(x => ({ ...x, seed: r.seed })));
const orsaker = [...new Set(alla.map(x => x.orsak))].sort((a, b) => alla.filter(x => x.orsak === b).length - alla.filter(x => x.orsak === a).length);
console.log(`${rs.length} av ${antal} byar, ${dagar} dygn (${dagar} år i spelet), ${sek(t0)} s datorns tid; ${alla.length} strider`);
const m = (v: number[], d = 0) => v.length ? median(v).toFixed(d) : '–';
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
for (const o of orsaker) {
  const x = alla.filter(q => q.orsak === o), byar = new Set(x.map(q => q.seed)).size;
  console.log(`\n${o.toUpperCase()}: ${x.length} strider i ${byar} av ${rs.length} byar`);
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
// ---------- per sorts strid (steg B.10): hur länge, hur försöken gick och hur de slutade ----------
const SORTER = ['rövare', 'vargar', 'björnen', 'vildsvinet', 'slagsmål', 'brottning', 'lek', 'annan strid mellan bybor'];
const SLUT = ['flydde', 'drog sig undan', 'gav upp', 'för skadad', 'dog direkt', 'förblödde', 'skildes åt', 'står'];
console.log('\nPER SORTS STRID (de som förlorade eller lämnade striden; står = slogs till slutet)');
for (const o of SORTER) {
  const x = alla.filter(q => q.sort === o); if (!x.length) { console.log(`  ${o}: ingen`); continue; }
  const t = x.filter(q => q.t1 - q.t0 >= 1000).map(q => q.sek).sort((a, b) => a - b), f: Record<string, number> = {};
  for (const q of x) for (const k in q.forsok) f[k] = (f[k] ?? 0) + q.forsok[k];
  const n = sum(Object.values(f)) || 1, pr = (k: string) => `${(100 * (f[k] ?? 0) / n).toFixed(0)} %`;
  const avg = x.filter(q => q.vinnare >= 0), per = (sd: 0 | 1) => { const a: Record<string, number> = {}; for (const q of x) for (const k of q.slut[sd]) a[k] = (a[k] ?? 0) + 1; return SLUT.filter(k => a[k]).map(k => `${k} ${a[k]}`).join(', '); };
  const forl: Record<string, number> = {}; for (const q of avg) { const ss = q.slut[1 - q.vinnare].filter(k => k !== 'står'); const a: Record<string, number> = {}; for (const k of ss) a[k] = (a[k] ?? 0) + 1; const b = Object.keys(a).sort((u, v) => a[v] - a[u])[0]; if (b) forl[b] = (forl[b] ?? 0) + 1; }
  console.log(`  ${o.toUpperCase()}: ${x.length} strider, varav ${x.length - t.length} på 0 sekunder (räknas inte i längden), längd median ${m(t)} s (en fjärdedel under ${t[Math.floor(t.length / 4)] ?? '–'}, en fjärdedel över ${t[Math.floor(t.length * 3 / 4)] ?? '–'}, längst ${t[t.length - 1] ?? '–'}); byns sida vann ${avg.filter(q => q.vinnare === 0).length} av ${x.length}, oavgjort ${x.length - avg.length}`);
  console.log(`    försöken (${(n / Math.max(1, t.length)).toFixed(0)} per strid): ${sum(x.map(q => q.tunga))} av ${n} blev ett slag som gav mer än en skråma (${(100 * sum(x.map(q => q.tunga)) / n).toFixed(1)} %); träffar ${((100 * ((f.traff ?? 0) + (f.tog ?? 0))) / n).toFixed(0)} %, missar ${pr('miss')}, pareras ${pr('parera')}, duckas ${pr('duck')}, knuffar ${((100 * ((f.knuff ?? 0) + (f.omkull ?? 0))) / n).toFixed(0)} %`);
  const gr = x.flatMap(q => q.grader ?? []).sort((u, v) => u - v), fl = x.flatMap(q => q.flytt ?? []), dm = sum(x.map(q => q.by.dod + q.mot.dod));
  if (gr.length) console.log(`    skadan per träff: median ${gr[gr.length >> 1].toFixed(3)} (en fjärdedel över ${gr[Math.floor(gr.length * 0.75)].toFixed(3)}); av ${fl.length} som flydde hade ${fl.filter(w => w[0] >= 0.2 || w[1] < 0.85).length} ett ordentligt sår (svåraste såret minst 0,2 eller blodet under 85 %); av ${sum(x.map(q => q.kampar ?? 0))} som slogs fick ${sum(x.map(q => q.allvar ?? 0))} ett; döda ${(dm / x.length).toFixed(2)} per strid och efteråt ${(sum(x.map(q => q.efter)) / x.length).toFixed(2)}`);
  console.log(`    striderna slutade mest med att förlorarna: ${Object.entries(forl).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${(100 * c / Math.max(1, avg.length)).toFixed(0)} %`).join(', ')}`);
  console.log(`    byns sida: ${per(0)}; motståndarna: ${per(1)}; förblödde inom ett dygn efteråt ${sum(x.map(q => q.efter))}`);
}
// ett rån är alla strider med rövare i samma by samma dygn, från första stridens början till sista stridens slut
const ran = new Map<string, { t0: number; t1: number; n: number }>();
for (const q of alla) if (q.sort === 'rövare') { const k = `${q.seed}:${Math.floor(q.dag)}`, r = ran.get(k); if (r) { r.t0 = Math.min(r.t0, q.t0); r.t1 = Math.max(r.t1, q.t1); r.n++; } else ran.set(k, { t0: q.t0, t1: q.t1, n: 1 }); }
const rl = [...ran.values()].map(r => (r.t1 - r.t0) / 60000);
console.log(`  RÅNEN: ${rl.length}, strider per rån (median) ${m([...ran.values()].map(r => r.n))}, från första till sista striden (median) ${m(rl, 1)} minuter, längst ${rl.length ? Math.max(...rl).toFixed(1) : '–'} minuter`);
const an = (k: 'n' | 'sedd' | 'dag' | 'dagSedd') => rs.reduce((a, r) => a + (r.anfall?.[k] ?? 0), 0);
console.log(`\nRÖVARNAS ANFALL: ${an('n')} gånger gick ett gäng till anfall; byn hade sett det innan ${an('sedd')} gånger, på dagen ${an('dagSedd')} av ${an('dag')}`);
// gängen (steg B.56): hur många som kom, och hur lång tid det tog från att de kom tills de sågs, tills alla var framme och till anfallet
const gg = rs.flatMap(r => (r.gangen ?? []).map(g => ({ ...g, seed: r.seed }))), mn = (x?: number) => x === undefined ? 'aldrig' : `${(x / 60).toFixed(1)} min`;
console.log(`\nGÄNGEN: ${gg.length} kom (tiden i verkligheten från att gänget kom; median: sågs ${mn(gg.length ? median(gg.filter(g => g.sedd !== undefined).map(g => g.sedd!)) : undefined)}, alla framme ${mn(median(gg.filter(g => g.framme !== undefined).map(g => g.framme!)))}, anfall ${mn(median(gg.filter(g => g.anfall !== undefined).map(g => g.anfall!)))}); anföll ${gg.filter(g => g.anfall !== undefined).length}, sågs innan anfallet på dagen ${gg.filter(g => g.anfall !== undefined && g.dag && g.sedd !== undefined && g.sedd <= g.anfall).length} av ${gg.filter(g => g.anfall !== undefined && g.dag).length}, på natten ${gg.filter(g => g.anfall !== undefined && !g.dag && g.sedd !== undefined && g.sedd <= g.anfall).length} av ${gg.filter(g => g.anfall !== undefined && !g.dag).length}`);
for (const g of gg) console.log(`  by ${g.seed}: ${g.n} rövare, sågs ${mn(g.sedd)}, alla framme ${mn(g.framme)}, anfall ${mn(g.anfall)}${g.anfall !== undefined ? g.dag ? ' (dag)' : ' (natt)' : ''}`);
// flockens storlek och vapen per avsändare (steg B.70), och gängen per by efter byns rikedom (steg B.71)
for (const ur of ['läger', 'by', 'okänd']) {
  const g = gg.filter(x => x.ur === ur); if (!g.length) continue;
  const vp: Record<string, number> = {}; for (const x of g) for (const k of x.vapen ?? []) vp[k] = (vp[k] ?? 0) + 1;
  console.log(`  från ${ur}: ${g.length} gäng, storlek median ${median(g.map(x => x.n))} (${g.map(x => x.n).sort((a, b) => a - b).join(', ')}), vapen ${Object.entries(vp).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
}
// världens anfall (steg 15.1.152): chansen världen räknade med när flocken kom, och om gänget vann (tog något). Stämmer de inte ställs
// BYANFALL.antalVikt in i fasens Balans
const va = gg.filter(g => g.chans !== undefined);
if (va.length) {
  console.log(`\nVÄRLDENS ANFALL: ${va.length} gäng som världen skickade; chansen världen räknade med i snitt ${(100 * va.reduce((a, g) => a + g.chans!, 0) / va.length).toFixed(0)} %, gänget vann ${va.filter(g => g.vann).length} (${(100 * va.filter(g => g.vann).length / va.length).toFixed(0)} %)`);
  for (const [fr, till] of [[0, 0.33], [0.33, 0.67], [0.67, 1.01]]) { const x = va.filter(g => g.chans! >= fr && g.chans! < till); if (x.length) console.log(`  chans ${(100 * fr).toFixed(0)}–${Math.min(100, 100 * till).toFixed(0)} %: ${x.length} gäng, vann ${x.filter(g => g.vann).length}`); }
  for (const g of va) console.log(`  by ${g.seed}: ${g.n} från ${g.namn}, chans ${(100 * g.chans!).toFixed(0)} %, ${g.vann ? 'vann' : 'vann inte'}`);
}
const rikast = [...rs].sort((a, b) => (b.rikt ?? 0) - (a.rikt ?? 0)), tre = Math.max(1, Math.floor(rikast.length / 3)), gn = (r: Ut) => r.gangen?.length ?? 0;
console.log('\nGÄNGEN PER BY (rikast per person först, snittet under tiden):');
for (const r of rikast) console.log(`  by ${r.seed}: rikedom ${Math.round(r.rikt ?? 0)} per person, ${gn(r)} gäng${gn(r) ? ` (${r.gangen!.map(g => `${g.n} från ${g.ur === 'läger' ? 'lägret ' : ''}${g.namn}`).join(', ')})` : ''}; ${r.lager ?? 0} läger i världen${Object.keys(r.lagerFolk ?? {}).length ? `, folket kom från ${Object.entries(r.lagerFolk!).map(([k, n]) => `${k} ${n}`).join('; ')}` : ''}`);
const topp = rikast.slice(0, tre), botten = rikast.slice(-tre), gsum = (l: Ut[]) => l.reduce((a, r) => a + gn(r), 0);
const smaLager = gg.filter(g => g.ur === 'läger').length, storaBy = gg.filter(g => g.ur === 'by').length;
console.log(`  rikaste tredjedelen ${gsum(topp)} gäng (median ${median(topp.map(gn))}), fattigaste ${gsum(botten)}; gräns: minst dubbelt så många och median minst 2 ${gsum(topp) >= 2 * gsum(botten) && gsum(topp) > 0 && median(topp.map(gn)) >= 2 ? '✓' : '✗'}; från läger ${smaLager}, från byar ${storaBy} ${smaLager > storaBy ? '✓' : '✗'}`);
const v = rs.reduce((a, r) => a + r.vakter, 0);
console.log(v ? '\nVAKTER LARMAR:\n  ' + rs.flatMap(r => r.larm.map(l => `by ${r.seed}: ${l}`)).join('\n  ') : '\nVakter: inga fel.');
}
