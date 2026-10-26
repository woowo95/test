// Utvecklas byn likadant i spelet som när den räknas ikapp? Båda räknar i samma femminuterstakt (steg.ts), men spelet
// spelar dessutom in vägen folk går (spar) och tar emot samtalen för pratbubblorna. Samma by körs på båda sätten och
// jämförs varje timme: de ska vara exakt lika.
// npm run likhet -- [timmar = 720] [byar = 4]: byarna 3, 5, 7, … körs samtidigt i egna processer (ca 1 min datortid).
// Standardlängden 720 timmar (30 dygn, 30 år i spelet) räcker för första huset (efter 2–6 dygn) och första istiden
// (från dygn 21–27). Felkod 1 om någon by är olik eller kraschar.
import { createHash } from 'node:crypto';
import { createState, step, living, serialize, spar, BEAT, State, foodOf, fuelStock, TalkEvent } from '../sim';
import { START, STEG_TIM } from './kor';
import { kanonisk, korJson, pool, sek } from './pool';

const kort = (s: State) => ({ folk: living(s).length, mat: Math.round(foodOf(s)), bransle: Math.round(fuelStock(s)) });
type Svar = { seed: number; olik: number; spel: ReturnType<typeof kort>; ikapp: ReturnType<typeof kort> };
const heltal = (v: string | undefined, standard: number) => v === undefined ? standard : /^[1-9]\d*$/.test(v) ? Number(v) : NaN;

const i = process.argv.indexOf('--by');
if (i >= 0) { // en by i en egen process
  const seed = Number(process.argv[i + 1]), timmar = Number(process.argv[i + 2]);
  const hash = (s: State) => createHash('sha1').update(kanonisk(serialize(s))).digest('hex');
  const spel = createState(seed, START), ikapp = createState(seed, START);
  let olik = -1;
  for (let h = 0; h < timmar && olik < 0; h++) {
    spar.pa = true;
    for (let k = 0; k < STEG_TIM; k++) { spar.v = new WeakMap(); step(spel, BEAT, [] as TalkEvent[]); }
    spar.pa = false;
    for (let k = 0; k < STEG_TIM; k++) step(ikapp, BEAT);
    if (hash(spel) !== hash(ikapp)) olik = h + 1;
  }
  console.log(JSON.stringify({ seed, olik, spel: kort(spel), ikapp: kort(ikapp) } satisfies Svar));
} else {
  const [timmar, antal] = [heltal(process.argv[2], 720), heltal(process.argv[3], 4)];
  if (!(timmar > 0 && antal > 0)) { console.log('Användning: npm run likhet -- [timmar] [byar], två heltal större än 0'); process.exit(1); }
  const t0 = Date.now(), seeds = Array.from({ length: antal }, (_, k) => 3 + 2 * k);
  const svar = await pool(seeds.map(seed => () => korJson<Svar>('likhet.ts', ['--by', String(seed), String(timmar)], `by ${seed}`).catch((e: Error) => e)));
  let lika = 0;
  for (const r of svar) {
    if (r instanceof Error) console.log(r.message);
    else if (r.olik < 0) { lika++; console.log(`by ${String(r.seed).padStart(3)}: exakt lika i ${timmar} timmar (${r.spel.folk} invånare)`); }
    else console.log(`by ${String(r.seed).padStart(3)}: OLIKA efter ${r.olik} timmar · spelet ${JSON.stringify(r.spel)} · ikapp ${JSON.stringify(r.ikapp)}`);
  }
  const dygn = +(timmar / 24).toFixed(1);
  console.log(`${lika} av ${antal} byar exakt lika i spelet och ikappräkningen under ${timmar} timmar (${dygn} dygn, ${dygn} år i spelet). (${sek(t0)} s, datorns tid)`);
  if (lika < antal) process.exitCode = 1;
}
