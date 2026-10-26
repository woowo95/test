// npm run natur -- [antal byar = 16] [dygn = 35]
// Människornas avtryck på naturen (steg 1.7.2): hur mycket bär, svamp och rötter som finns kvar nära byn (inom 12 rutor,
// snitt över dygnen utom istiden), hur långt från lägret man samlar, jagar och fiskar, andelen skog inom 15 rutor
// före och efter, hur många rutor som är stigar och bar jord, och hur stor byn blir med och utan redskap för maten.
import { korJson, pool, seedAv, sek } from './pool';

const [antal = 16, dagar = 35] = process.argv.slice(2).map(Number);
const seeds = Array.from({ length: antal }, (_, i) => seedAv(i));
type Ut = { seed: number; pop: number; svalt: number; utvandrade: number; fodda: number; hunger: number; vintermat: number; doda: number; larm: string[]; kvar: number; gang: number; skog0: number; skog: number; stig: number; matdagar: number; fallda: number; hus: number; husDag: number; vakter: number };
const t0 = Date.now();
const kor = (utan: boolean) => seeds.map(seed => () => korJson<Ut>('natur-en.ts', [String(seed), String(dagar), utan ? 'utan' : 'med'], `by ${seed}`));
const alla = await pool([...kor(false), ...kor(true)]);
const med = alla.slice(0, antal), utan = alla.slice(antal);
const median = (v: number[]) => { const a = [...v].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const f = (rs: Ut[], fn: (r: Ut) => number, d = 0) => median(rs.map(fn)).toFixed(d);
console.log(`${antal} byar, ${dagar} dygn (${dagar} år i spelet), median (${sek(t0)} s, datorns tid)`);
console.log('                          med redskap   utan redskap');
const rad = (namn: string, fn: (r: Ut) => number, d = 0) => console.log(namn.padEnd(26) + f(med, fn, d).padStart(11) + f(utan, fn, d).padStart(15));
rad('invånare', r => r.pop);
rad('födda', r => r.fodda);
rad('utvandrade', r => r.utvandrade);
rad('svalt ihjäl', r => r.svalt);
rad('döda', r => r.doda);
rad('hungertimmar', r => r.hunger);
rad('mat i förrådet, dygn', r => r.matdagar, 1);
rad('mat efter vintern', r => r.vintermat);
rad('växter kvar nära byn %', r => r.kvar * 100);
rad('avstånd till maten', r => r.gang, 1);
rad('skog nära byn före %', r => r.skog0 * 100);
rad('skog nära byn efter %', r => r.skog * 100);
rad('stigar och bar jord', r => r.stig);
rad('fällda träd', r => r.fallda);
rad('färdiga hus', r => r.hus);
rad('första huset klart, dygn', r => r.husDag, 1);
const v = alla.reduce((a, r) => a + r.vakter, 0);
console.log(v ? 'VAKTER LARMAR:\n  ' + alla.flatMap((r, i) => r.larm.map(l => `by ${r.seed} ${i < antal ? 'med' : 'utan'}: ${l}`)).join('\n  ') : 'Vakter: inga fel.');
