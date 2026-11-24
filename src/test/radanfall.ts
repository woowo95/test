// npm run radanfall -- [byar] [dygn] (8 världar i 35 dygn om inget anges): anfallen mellan byarna i världen (steg 11.6.19, Flera
// samhällen: Relationen och läget mellan två byar). Världar utan förhistoria går dygn för dygn (ett dygn är ett år i spelet) och
// skrivs ut per period, median över världarna: anfall per by och dygn, andelen anfall anfallarna vann, andelen av dem som var
// med som dog, byar som gått under per dygn, och hur många rövarläger, utposter och handelsläger som står. Sist summan för alla
// världar, att ställa mot striderna i testbyarna (npm run strid).
import './utc';
process.env.BALANS = [process.env.BALANS, 'forhist.ar=0'].filter(Boolean).join(',');
const SIM = await import('../sim');

const byar = Number(process.argv[2]) || 8, dygn = Number(process.argv[3]) || 35, steg = Math.max(1, Math.round(dygn / 7));
type Rad = { d: number; byar: number; anfall: number; vann: number; dod: number; under: number; rovar: number; utpost: number; handel: number };
const ut: Rad[][] = [];
const tot = { ut: 0, fram: 0, vann: 0, doda: 0, med: 0, under: 0, lager: 0, ovan: 0, krig: 0, relMin: 0 };
const median = (l: number[]) => { const v = l.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)]! : 0; };
for (let i = 0; i < byar; i++) {
  const s = SIM.createState(1000 + i * 7, Date.UTC(2026, 0, 1)), vl = s.varld!;
  const rader: Rad[] = [];
  const st = (k: string) => s.stat?.[k] ?? 0;
  let f0 = { fram: 0, vann: 0, doda: 0, med: 0 }, u0 = 0;
  const ovan = new Set<string>(); // de ovänliga beskeden (steg 12.1.114): vl.ovanligt har dem tills kriget börjar
  for (let d = 1; d <= dygn; d++) {
    SIM.varldTill(s, s.now += SIM.DAY);
    for (const k of Object.keys(vl.ovanligt ?? {})) ovan.add(k);
    for (const v of Object.values(vl.rel ?? {})) tot.relMin = Math.min(tot.relMin, v);
    if (d % steg && d !== dygn) continue;
    const lev = vl.rader!.filter(r => SIM.lever(vl, r) && r.sort === 'by');
    const under = (vl.kronika ?? []).filter(h => h.k === 'gattUnder').length;
    const fram = st('radanfall_fram') - f0.fram, vann = st('radanfall_vann') - f0.vann, doda = st('radanfall_doda') - f0.doda, med = st('radanfall_med') - f0.med;
    const sort = (k: string) => vl.rader!.filter(r => r.sort === k && r.tal.folk > 0).length;
    rader.push({ d, byar: lev.length, anfall: fram / Math.max(1, lev.length) / steg, vann: fram ? vann / fram : 0, dod: med ? doda / med : 0, under: (under - u0) / steg, rovar: sort('rovarlager'), utpost: sort('utpost'), handel: sort('handelslager') });
    f0 = { fram: st('radanfall_fram'), vann: st('radanfall_vann'), doda: st('radanfall_doda'), med: st('radanfall_med') }; u0 = under;
  }
  tot.ut += st('radanfall_ut'); tot.fram += st('radanfall_fram'); tot.vann += st('radanfall_vann'); tot.doda += st('radanfall_doda'); tot.med += st('radanfall_med');
  tot.ovan += ovan.size; tot.krig += st('bykrig');
  tot.under += (vl.kronika ?? []).filter(h => h.k === 'gattUnder').length; tot.lager += (vl.kronika ?? []).filter(h => h.k === 'lager').length;
  ut.push(rader);
  process.stderr.write('.');
}
process.stderr.write('\n');
const f = (x: number, d = 2) => x.toFixed(d);
console.log(`Anfallen mellan byarna, ${byar} världar i ${dygn} dygn (${dygn} år i spelet), median över världarna`);
console.log('dygn  byar  anfall/by/dygn  vunna  döda  under/dygn  rövarläger  utposter  handelsläger');
for (let k = 0; k < ut[0]!.length; k++) {
  const l = ut.map(x => x[k]!).filter(Boolean), m = (g: (r: Rad) => number, d = 2) => f(median(l.map(g)), d);
  console.log(`${String(l[0]!.d).padStart(4)}  ${m(r => r.byar, 0).padStart(4)}  ${m(r => r.anfall, 3).padStart(14)}  ${m(r => r.vann).padStart(5)}  ${m(r => r.dod).padStart(4)}  ${m(r => r.under).padStart(10)}  ${m(r => r.rovar, 0).padStart(10)}  ${m(r => r.utpost, 0).padStart(8)}  ${m(r => r.handel, 0).padStart(12)}`);
}
console.log(`Alla världar: ${tot.ut} anfall skickade, ${tot.fram} framme, ${tot.fram ? f(tot.vann / tot.fram) : '-'} vunna, ${tot.med ? f(tot.doda / tot.med) : '-'} av dem som var med dog, ${tot.under} byar gick under, ${tot.lager} rövarläger slogs upp; ${tot.ovan} ovänliga besked, ${tot.krig} krig, den sämsta relationen mellan två byar ${tot.relMin}`);
