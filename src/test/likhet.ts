// Utvecklas byn likadant i levande läge som i snabbläget? Samma by körs i båda lägena och jämförs.
// Slumpen gör att det aldrig blir exakt lika, så flera byar körs och snittet jämförs.
import { createState, step, living, State, fuelStock, TEKNIK, ageOf, bitsOf, beds, groundOf, isSoil, BAR, foodOf, amountOf, setAmount } from '../sim';
import { START } from './kor';
const [seed, live, timmar] = [Number(process.argv[2] ?? 3), process.argv[3] !== 'snabb', Number(process.argv[4] ?? 48)];
const s: State = createState(seed, START);
const dt = live ? 0.5 : 300;
if (process.env.BYGG) { // BYGG=1: alla vuxna kan timmervägg och byn har yxor från början, så att bygget kan jämföras
  for (const p of living(s)) if (ageOf(p, s.now) >= 14) Object.assign((p.tek ??= {}), { yxa: 1, timmervagg: 1 });
  setAmount(s, 'yxa', 2);
}
const tid: Record<string, number> = {}, forst: Record<string, number> = {}, antal: Record<string, number> = {}, forra = new Map<number, object>();
for (let i = 0; i < timmar * 3600 / dt; i++) {
  step(s, dt, live);
  for (const p of living(s)) {
    const a = p.task?.act ?? '-'; tid[a] = (tid[a] ?? 0) + dt / 3600;
    if (p.task && forra.get(p.id) !== p.task) { antal[a] = (antal[a] ?? 0) + 1; forra.set(p.id, p.task); } // hur många gånger handlingen valts
  }
  for (const t of TEKNIK) if (forst[t.id] === undefined && s.stat?.['tek_' + t.id]) forst[t.id] = i * dt / 3600;
}
const st = s.stat ?? {}, ppl = living(s), g = groundOf(s);
let stigar = 0, trampat = 0; // bar jord och kort gräs (trampad mark)
for (let i = 0; i < g.cover.length; i++) if (isSoil(g.tiles[i])) { if (g.cover[i] < BAR) stigar++; else if (g.cover[i] < 0.6) trampat++; }
const ut: Record<string, number> = {
  ...Object.fromEntries(Object.entries(st).filter(([k]) => k.startsWith('prod_')).map(([k, v]) => [k, v as number])),
  fisk: st.fisk ?? 0, samtal: st.samtal ?? 0, mat: foodOf(s), bransle: fuelStock(s),
  byggt: bitsOf(s).filter(b => b.k !== 'oppning' && b.b >= 1).length, sovplatser: beds(s).length, lagat: st.lagat ?? 0,
  stigar, trampat, gras: amountOf(s, 'torrgras'), flinta: amountOf(s, 'flinta'), folk: ppl.length,
  teknik: TEKNIK.reduce((a, t) => a + ppl.reduce((b, p) => b + Math.min(1, p.tek?.[t.id] ?? 0), 0), 0),
  ...Object.fromEntries(TEKNIK.map(t => ['kan_' + t.id, ppl.filter(p => (p.tek?.[t.id] ?? 0) >= 1).length])),
  ...Object.fromEntries(TEKNIK.map(t => ['forst_' + t.id, forst[t.id] ?? timmar])),
  ...Object.fromEntries(Object.entries(tid).map(([k, v]) => ['t_' + k, v])),
  ...Object.fromEntries(Object.entries(antal).map(([k, v]) => ['n_' + k, v])), // gånger valt
};
console.log(JSON.stringify({ seed, live, ut }));
