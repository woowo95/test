// npm run balans -- [antal byar = 20] [dygn = 90]
// Kör många slumpade byar parallellt och visar median, sämsta och bästa värde för varje nyckeltal. Vad som är bättre
// står i registret NYCKELTAL (nyckeltal.ts); tal som bara är information visas med lägsta och högsta värde.
import { korJson, pool, seedAv, sek } from './pool';
import { NYCKELTAL, Matt, Nyckeltal, median, snittTal, vardeAv } from './nyckeltal';

const [antal = 20, dagar = 90] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Ut = { seed: number; n: Nyckeltal; vakter: string[] };

const t0 = Date.now();
const res = await pool(seeds.map(seed => () => korJson<Ut>('en.ts', [String(seed), String(dagar)], `by ${seed}`)));

console.log(`${antal} byar, ${dagar} dygn (${dagar} år i spelet) (${sek(t0)} s, datorns tid)`);
// en by med andel (byar som dog ut) står på raden under tabellen i stället
const visas = NYCKELTAL.filter(m => !m.andel);
const rad = (m: Matt, a: string, b: string, c: string) => console.log(m.namn.padEnd(20) + a.padStart(8) + b.padStart(8) + c.padStart(8));
const tabell = (rader: Matt[]) => {
  for (const m of rader) {
    const v = res.map(r => vardeAv(m, r.n)).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
    if (!v.length) { rad(m, '–', '–', '–'); continue; } // mättes inte i någon by
    const f = (x: number) => snittTal(m, x, 0);
    // högre är bättre (eller bara information): sämst är det lägsta. Lägre är bättre: sämst är det högsta
    const [samst, bast] = m.bra < 0 ? [v[v.length - 1], v[0]] : [v[0], v[v.length - 1]];
    rad(m, f(median(v)), f(samst), f(bast));
  }
};
console.log('                      median   sämst    bäst');
tabell(visas.filter(m => m.bra !== 0));
console.log('bara information:     median   lägst   högst');
tabell(visas.filter(m => m.bra === 0));
const utdoda = res.filter(r => r.n.atergrundad > 0).map(r => `${r.seed}: ${r.n.atergrundad} ggr`);
console.log(`utdöda och återgrundade byar: ${utdoda.length}${utdoda.length ? ' (' + utdoda.join(', ') + ')' : ''}, under 6 invånare: ${res.filter(r => r.n.pop < 6).length}`);
const vakter = res.flatMap(r => r.vakter.map(v => `by ${r.seed}: ${v}`));
console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
