// npm run balans -- [antal byar = 20] [dygn = 90]
// Kör många slumpade byar parallellt och visar median, sämsta och bästa värde för varje nyckeltal. Vad som är bättre
// står i registret NYCKELTAL (nyckeltal.ts); tal som bara är information visas med lägsta och högsta värde.
// Byarna sparas i samma cache som jamfor (bycache.ts): en by som jamfor redan kört med samma kod körs inte igen, och jamfor
// efter balansen kör bara de byar balansen inte redan kört (testkedjan efter v530). Med BALANS satt körs allt som vanligt.
import './utc';
import { writeFileSync } from 'node:fs';
import { ALLVARLIGT, korJson, pool, seedAv, sek } from './pool';
import { byCacheFil, kodHash, lasByCache } from './bycache';
import { NYCKELTAL, Matt, Nyckeltal, median, snittTal, vardeAv } from './nyckeltal';
import { matUnderTestet } from './matare';
matUnderTestet(); // datorns kärnor och minne under testet (steg 9.2.61)

const [antal = 20, dagar = 90] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Ut = { seed: number; n: Nyckeltal; vakter: string[]; stat?: Record<string, number>; tek?: string[]; tro?: { vuxna: number; troende: number; tron: number; dygn: number } };

const t0 = Date.now();
const fil = process.env.BALANS?.trim() ? undefined : byCacheFil(kodHash(), '', dagar), sparade = fil ? lasByCache<Ut>(fil) : {};
const fran = seeds.filter(seed => sparade[seed]).length;
const res = await pool(seeds.map(seed => () => sparade[seed] ? Promise.resolve(sparade[seed]) : korJson<Ut>('en.ts', [String(seed), String(dagar)], `by ${seed}`)
  .then(r => (sparade[seed] = r)).catch((e: Error) => { console.log(e.message); process.exit(ALLVARLIGT); }))); // en krasch: kedjan stannar
if (fil) writeFileSync(fil, JSON.stringify(sparade));
if (fran) console.log(`(${fran} byar fanns redan sparade av jamfor eller en tidigare balans med samma kod)`);

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
// tron (steg 12.6.6, Tron får fäste): byar med en levande tro, andelen vuxna med en tro där tron funnits i 20 dygn, och byar med flera
const medTro = res.filter(r => r.tro), gamla = medTro.filter(r => r.tro!.dygn >= 20 && r.tro!.vuxna);
const andelar = gamla.map(r => Math.round(100 * r.tro!.troende / r.tro!.vuxna)).sort((a, b) => a - b);
if (medTro.length) console.log(`tron: en levande tro i ${medTro.filter(r => r.tro!.tron).length} av ${medTro.length} byar (av ${medTro.filter(r => r.tro!.vuxna >= 20).length} med minst 20 vuxna: ${medTro.filter(r => r.tro!.vuxna >= 20 && r.tro!.tron).length}), flera i ${medTro.filter(r => r.tro!.tron > 1).length}; vuxna med en tro där tron funnits i 20 dygn: ${andelar.length ? andelar.join(' ') + ' %' : 'ingen by'}`);
const vakter = res.flatMap(r => r.vakter.map(v => `by ${r.seed}: ${v}`));
// statistiken och teknikerna per by sparas i balans-stat.json (används för gräns 4: varje nytt system används i de flesta byarna)
writeFileSync('balans-stat.json', JSON.stringify(res.map(r => ({ seed: r.seed, stat: r.stat, tek: r.tek }))));
console.log(vakter.length ? 'VAKTER LARMAR:\n  ' + vakter.join('\n  ') : 'Vakter: inga fel.');
if (vakter.length) process.exitCode = ALLVARLIGT; // en kedja (npm run kedja) stannar då, så att larmet ses genast
