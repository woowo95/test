// mäter förhistoriens datortid (steg 11.3.13): FORHIST.ar ur BALANS
import * as SIM from '../sim';
const fron = (process.env.FRON ?? "1,1511,4634,7,42").split(",").map(Number);
for (const f of fron) {
  const t0 = performance.now();
  const s = SIM.createState(f, Date.UTC(2026, 0, 1));
  const ms = performance.now() - t0, vl = s.varld!;
  const lev = vl.rader!.filter(r => SIM.lever(vl, r)), ruin = vl.rader!.filter(r => r.sort === 'ruin');
  const folk = lev.map(r => r.tal.folk).sort((a, b) => a - b), tek = lev.map(r => r.tek.length).sort((a, b) => a - b);
  console.log(`frö ${f}: ${Math.round(ms)} ms, ${lev.length} byar (folk ${folk[0]}–${folk[folk.length - 1]}, tekniker ${tek[0]}–${tek[tek.length - 1]}), ${ruin.length} ruiner, ${SIM.klanerOf(s).length} grannar, krönikan ${vl.kronika?.length}`);
}
