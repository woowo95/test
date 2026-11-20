// Arbetaren i en egen process (scenariot arbetare, steg 12.1.178): byn räknas som arbetaren räknar den, med modulerna
// nyss inlästa som i en Web Worker, i bitar och med en ögonblicksbild efter varannan bit. tsx src/test/arbetarprov.ts <in> <ut>:
// in är { delar, mal } (overlamna i steg.ts), ut får { delar, bitar, bilder }. Med ett tredje ord, hel, räknas byn i ett svep
// utan bitar och bilder, som sidan räknar den.
import './utc';
import { readFileSync, writeFileSync } from 'node:fs';
import { spar, stridBild } from '../sim';
import { IkappKarna } from '../ui/ikappkarna';

const [fil, utfil, satt] = process.argv.slice(2);
const { delar, mal } = JSON.parse(readFileSync(fil!, 'utf8'));
spar.pa = false; stridBild.pa = false; // som i arbetaren
const k = new IkappKarna(delar, mal);
let bitar = 0, bilder = 0;
if (satt === 'hel') k.bit(Infinity);
else while (!k.bit(20)) { if (++bitar % 2 === 0) { k.delar(); bilder++; } }
writeFileSync(utfil!, JSON.stringify({ delar: k.delar(), bitar, bilder }));
