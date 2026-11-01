// npm run texter -- [byar = 8] [dygn = 45] (steg 4.5.1.1): alla texter som spelet skriver, sorterade efter mall och variant.
// Kör byarna parallellt (texter-en.ts) och skriver texter.txt: för varje mall i BERATTELSER hur många gånger den användes och
// hur många av varianterna som valdes, och för varje variant hur ofta den valdes, mallen och några exempel ifyllda. Varianter
// som aldrig valdes står med "aldrig". Delarna av beskrivningen (BESK_DELAR) står sist, med exempel. Mallar som aldrig
// användes alls står överst i sammanfattningen. texter.json har samma sak för kontrollerna (steg 4.5.1.2)
import { writeFileSync } from 'node:fs';
import { BERATTELSER, BESK_DELAR } from '../sim/berattelser';
import { korJson, pool, seedAv, sek } from './pool';
import type { Fel, Samlat } from './texter-en';
import { KONTROLLER, STIL } from './textkoll';

const [byar = 8, dagar = 45] = process.argv.slice(2).map(Number);
const t0 = Date.now();
const res = await pool(Array.from({ length: byar }, (_, i) => seedAv(i)).map(seed => () => korJson<{ seed: number; ut: Samlat; fel: Fel }>('texter-en.ts', [String(seed), String(dagar)], `by ${seed}`)));

// alla byarnas texter i ett
const alla: Samlat = {};
for (const r of res) for (const m in r.ut) for (const i in r.ut[m]) {
  const v = ((alla[m] ??= {})[+i] ??= { n: 0, ex: [] }), w = r.ut[m][+i];
  v.n += w.n;
  for (const e of w.ex) if (v.ex.length < 6 && !v.ex.includes(e)) v.ex.push(e);
}
const fel: Fel = {};
for (const r of res) for (const k in r.fel) {
  const x = (fel[k] ??= { n: 0, ex: [] });
  x.n += r.fel[k].n;
  for (const e of r.fel[k].ex) if (x.ex.length < 12 && !x.ex.some(y => y.text === e.text)) x.ex.push(e);
}
writeFileSync('texter.json', JSON.stringify({ alla, fel }));

const rader: string[] = [`Texterna i ${byar} byar under ${dagar} dygn (${dagar} år i spelet). Beskrivningar, samtal, relationer och sakernas berättelser skrivs en gång per dygn för alla, som om någon tittade.`, ''];
const raw = (x: (typeof BERATTELSER)[keyof typeof BERATTELSER][number]) => typeof x === 'string' ? x : `(villkor) ${x.t}`;
const mallar = Object.keys(BERATTELSER) as (keyof typeof BERATTELSER)[];
const oanvanda = mallar.filter(m => !alla[m]);
let aldrig = 0, varianter = 0;
const del: string[] = [];
for (const m of mallar) {
  const v = BERATTELSER[m], a = alla[m] ?? {}, n = Object.values(a).reduce((x, y) => x + y.n, 0);
  const valda = v.filter((_, i) => a[i]).length;
  varianter += v.length; aldrig += v.length - valda;
  del.push(`== ${m}: använd ${n} gånger, ${valda} av ${v.length} varianter valda`);
  v.forEach((x, i) => {
    const w = a[i];
    del.push(`  [${i}] ${w ? `${w.n}×`.padStart(6) : 'aldrig'}  ${raw(x)}`);
    for (const e of w?.ex ?? []) if (e !== raw(x)) del.push(`           – ${e}`);
  });
  del.push('');
}
del.push('== Beskrivningens delar (BESK_DELAR)');
for (const d of BESK_DELAR) {
  const w = alla['del:' + d.id]?.[-1];
  del.push(`  ${d.id}: ${w ? `${w.n}×` : 'aldrig'}`);
  for (const e of w?.ex ?? []) del.push(`           – ${e}`);
}
rader.push(`${mallar.length} mallar med ${varianter} varianter; ${aldrig} varianter valdes aldrig.`);
rader.push(`Mallar som aldrig användes (${oanvanda.length}): ${oanvanda.join(', ') || 'inga'}`);
const felRader: string[] = ['== Fel som kontrollerna hittade (steg 4.5.1.2)'];
for (const k of [...KONTROLLER, ...STIL]) {
  const x = fel[k.id];
  felRader.push(`  ${k.namn}: ${x ? `${x.n} gånger` : 'inga'}${STIL.includes(k) ? ' (stilen, i beskrivningarna)' : ''}`);
  for (const e of x?.ex ?? []) felRader.push(`           – ${e.mall} (${e.vad}): ${e.text}`);
}
felRader.push('');
rader.push(`Fel: ${[...KONTROLLER, ...STIL].map(k => `${k.id} ${fel[k.id]?.n ?? 0}`).join(', ')} (se nedan)`);
rader.push(`Beskrivningens delar som aldrig användes: ${BESK_DELAR.filter(d => !alla['del:' + d.id]).map(d => d.id).join(', ') || 'inga'}`, '');
writeFileSync('texter.txt', [...rader, ...felRader, ...del].join('\n') + '\n');
console.log(rader.join('\n'));
console.log(`Allt står i texter.txt (och texter.json). (${sek(t0)} s, datorns tid)`);
