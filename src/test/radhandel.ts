// npm run radhandel -- [byar] [dygn] (8 världar i 30 dygn om inget anges): handeln mellan byarna i världen (steg 11.6.7, Flera
// samhällen: Priset och handeln mellan byar). Världar utan förhistoria går dygn för dygn (ett dygn är ett år i spelet), och
// skrivs ut per period: handelsfärder per by och dygn, hur långt isär priserna är mellan grannar (medelskillnaden i gruppens
// påslag över grannparen, per grupp) och hur stor del av rutorna på vägarna mellan grannar som blivit stig eller bättre.
import './utc';
process.env.BALANS = [process.env.BALANS, 'forhist.ar=0'].filter(Boolean).join(',');
const SIM = await import('../sim');
type VarldRad = import('../sim').VarldRad;

const byar = Number(process.argv[2]) || 8, dygn = Number(process.argv[3]) || 30, steg = Math.max(1, Math.round(dygn / 6));
type Rad = { d: number; farder: number; spr: Record<string, number>; stig: number; byar: number };
const ut: Rad[][] = [];
const median = (l: number[]) => { const v = l.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)]! : 0; };
for (let i = 0; i < byar; i++) {
  const s = SIM.createState(1000 + i * 7, Date.UTC(2026, 0, 1)), vl = s.varld!, v = SIM.varldMark(s)!;
  const rader: Rad[] = [];
  let fore = 0;
  for (let d = 1; d <= dygn; d++) {
    SIM.varldTill(s, s.now += SIM.DAY);
    if (d % steg && d !== dygn) continue;
    const lev = vl.rader!.filter(r => SIM.lever(vl, r));
    const par: [VarldRad, VarldRad][] = [];
    for (const r of lev) for (const m of SIM.radGrannar(vl, r)) if (m.nr > r.nr && m.nr !== vl.huvud) par.push([r, m]);
    const spr: Record<string, number> = {};
    for (const g of SIM.VARUGRUPP_IDS) spr[g] = par.length ? par.reduce((a, [x, y]) => a + Math.abs(SIM.radGruppPaslag(s, x, g) - SIM.radGruppPaslag(s, y, g)), 0) / par.length : 0;
    // vägarna mellan grannarna: andelen rutor som är stig eller bättre
    let n = 0, st = 0;
    for (const vg of vl.vagar ?? []) if (vg.fs === 'fots') for (const ru of SIM.vagRutor(vg, v.w)) { n++; if (SIM.ledKlass(vl, ru) !== 'obanad') st++; }
    const fram = s.stat?.radhandel_fram ?? 0;
    rader.push({ d, farder: (fram - fore) / Math.max(1, lev.length) / steg, spr, stig: n ? st / n : 0, byar: lev.length });
    fore = fram;
  }
  ut.push(rader);
  process.stderr.write('.');
}
process.stderr.write('\n');
const f = (x: number, d = 2) => x.toFixed(d);
console.log(`Handeln mellan byarna, ${byar} världar i ${dygn} dygn (${dygn} år i spelet), median över världarna`);
console.log('dygn  byar  färder/by/dygn  stig  ' + SIM.VARUGRUPP_IDS.map(g => g.padStart(8)).join(''));
for (let k = 0; k < ut[0]!.length; k++) {
  const l = ut.map(x => x[k]!).filter(Boolean);
  console.log(`${String(l[0]!.d).padStart(4)}  ${String(median(l.map(x => x.byar))).padStart(4)}  ${f(median(l.map(x => x.farder)), 3).padStart(14)}  ${f(median(l.map(x => x.stig))).padStart(4)}  ` + SIM.VARUGRUPP_IDS.map(g => f(median(l.map(x => x.spr[g]!))).padStart(8)).join(''));
}
