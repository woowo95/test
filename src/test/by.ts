// npm run by -- fil [minuter] (steg 12.1.40, Teknisk plattform: Byn som fil): en by som sparats till fil i testläget (ui/byfil.ts)
// läses utan grafik. Utskriften: vad var och en gör just nu (handling, skäl, fas, plats och det hen bär) och kroppens behov,
// förråden mot sina mål och de behov som är öppna. Med ett antal minuter stegas byn så länge (i svensk tid, som i spelet), och
// för varje arbete skrivs hur tiden delades mellan att gå, att arbeta på stället och att stå still på vägen (samlarnas tid)
import './svensktid';
import { readFileSync } from 'node:fs';
import { ACTS, MIN, living, nastaSteg, step } from '../sim';
import { lasByfil } from '../ui/byfil';
import { behovNu, folkNu, forradNu, pr, tid } from './bylage';

const [fil, minArg] = process.argv.slice(2);
if (!fil) { console.log('Användning: npm run by -- fil [minuter]'); process.exit(1); }
const minuter = minArg === undefined ? 0 : Number(minArg);
if (!(minuter >= 0)) { console.log('Minuterna ska vara ett tal, 0 eller mer.'); process.exit(1); }
const s = lasByfil(readFileSync(fil, 'utf8'));
console.log(`By ${s.seed}, ${tid(s.now)}, ${living(s).filter(p => !p.gast).length} invånare\n`);
console.log(folkNu(s));
console.log(`\nFörråden:\n  ${forradNu(s)}`);
console.log(`\nÖppna behov:\n  ${behovNu(s)}`);

if (minuter > 0) {
  // byn stegas i korta slag (högst 10 sekunder, så att varje rörelse syns), och tiden per arbete räknas
  const del: Record<string, { ga: number; plats: number; still: number }> = {}, slut = s.now + minuter * MIN;
  while (s.now < slut) {
    const fore = new Map(living(s).map(p => [p, { x: p.x, y: p.y, act: p.task?.act, phase: p.task?.phase }]));
    const t0 = s.now;
    step(s, Math.min(nastaSteg(s), 10, (slut - s.now) / 1000));
    const dt = (s.now - t0) / 1000;
    for (const [p, f] of fore) {
      if (!f.act || !ACTS[f.act].arbete) continue;
      const d = (del[f.act] ??= { ga: 0, plats: 0, still: 0 }), flytt = Math.hypot(p.x - f.x, p.y - f.y);
      if (flytt > 0.05) d.ga += dt; else if (f.phase === 'do') d.plats += dt; else d.still += dt;
    }
  }
  console.log(`\nEfter ${minuter} minuter (${tid(s.now)}). Tiden per arbete, alla tillsammans:`);
  for (const [a, d] of Object.entries(del).sort((x, y) => (y[1].ga + y[1].plats + y[1].still) - (x[1].ga + x[1].plats + x[1].still))) {
    const sum = d.ga + d.plats + d.still;
    console.log(`  ${ACTS[a as keyof typeof ACTS].namn}: ${Math.round(sum / 60)} min, går ${pr(d.ga / sum)} %, arbetar på stället ${pr(d.plats / sum)} %, står still på vägen ${pr(d.still / sum)} %`);
  }
  console.log('');
  console.log(folkNu(s));
}
