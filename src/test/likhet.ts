// Utvecklas byn likadant i spelet som när den räknas ikapp? Den första byn får en resa (steg 11.5.19). Båda räknar i samma femminuterstakt (steg.ts), men spelet
// spelar dessutom in vägen folk går (spar) och tar emot samtalen för pratbubblorna. Samma by körs på båda sätten och
// jämförs varje timme: de ska vara exakt lika.
// npm run likhet -- [timmar = 720] [byar = 4]: byarna 3, 5, 7, … körs samtidigt i egna processer (ca 1 min datortid).
// Standardlängden 720 timmar (30 dygn, 30 år i spelet) räcker för första huset (efter 2–6 dygn) och första istiden
// (från dygn 21–27). Felkod 1 om någon by är olik eller kraschar.
import './utc';
import { createHash } from 'node:crypto';
import { createState, step, living, serialize, spar, State, foodOf, fuelStock, TalkEvent, ageOf, kanGa, byPlats, varldMark, vagDygn, samlaResa } from '../sim';
import { BEAT, START, STEG_TIM } from './kor';
import { ALLVARLIGT, kanonisk, korJson, pool, sek } from './pool';
import { matUnderTestet } from './matare';
matUnderTestet(); // datorns kärnor och minne under testet (steg 9.2.61)

const kort = (s: State) => ({ folk: living(s).length, mat: Math.round(foodOf(s)), bransle: Math.round(fuelStock(s)) });
type Svar = { seed: number; olik: number; spel: ReturnType<typeof kort>; ikapp: ReturnType<typeof kort>; resa?: boolean };
// Byn med en resa (steg 11.5.19): den första byn får ett sällskap efter RESA_TIM timmar, i spelet och i ikappräkningen likadant,
// så att resan (samlas, packar, går, är framme, kommer hem) räknas med. Att resan startas är testets, inte spelets.
const RESA_TIM = 48;
function startaResa(s: State) {
  const vl = s.varld, hem = vl && vl.huvud !== undefined ? byPlats(vl, vl.huvud) : undefined, vm = varldMark(s);
  if (!vl || !hem || !vm) return false;
  const led = living(s).find(q => ageOf(q, s.now) >= 18 && ageOf(q, s.now) < 50 && kanGa(q));
  const mal = (vl.platser ?? []).filter(q => q.nr !== hem.nr && q.k !== 'by').sort((a, b) => Math.hypot(a.x - hem.x, a.y - hem.y) - Math.hypot(b.x - hem.x, b.y - hem.y)).find(q => vagDygn(s, hem.y * vm.w + hem.x, q.y * vm.w + q.x));
  return !!led && !!mal && !!samlaResa(s, led, { mal: mal.nr, namn: mal.namn, skal: 'se', varde: 30, dygn: 6, fara: 0.3, sc: 1, varor: [] });
}
const heltal = (v: string | undefined, standard: number) => v === undefined ? standard : /^[1-9]\d*$/.test(v) ? Number(v) : NaN;

const i = process.argv.indexOf('--by');
if (i >= 0) { // en by i en egen process
  const seed = Number(process.argv[i + 1]), timmar = Number(process.argv[i + 2]), medResa = process.argv.includes('--resa');
  const hash = (s: State) => createHash('sha1').update(kanonisk(serialize(s))).digest('hex');
  const spel = createState(seed, START), ikapp = createState(seed, START);
  let olik = -1, resa: boolean | undefined;
  for (let h = 0; h < timmar && olik < 0; h++) {
    if (medResa && h === RESA_TIM) { resa = startaResa(spel); if (startaResa(ikapp) !== resa) olik = h; }
    spar.pa = true;
    for (let k = 0; k < STEG_TIM; k++) { spar.v = new WeakMap(); step(spel, BEAT, [] as TalkEvent[]); }
    spar.pa = false;
    for (let k = 0; k < STEG_TIM; k++) step(ikapp, BEAT);
    if (hash(spel) !== hash(ikapp)) olik = h + 1;
  }
  console.log(JSON.stringify({ seed, olik, spel: kort(spel), ikapp: kort(ikapp), resa } satisfies Svar));
} else {
  const [timmar, antal] = [heltal(process.argv[2], 720), heltal(process.argv[3], 4)];
  if (!(timmar > 0 && antal > 0)) { console.log('Användning: npm run likhet -- [timmar] [byar], två heltal större än 0'); process.exit(1); }
  const t0 = Date.now(), seeds = Array.from({ length: antal }, (_, k) => 3 + 2 * k);
  const svar = await pool(seeds.map(seed => () => korJson<Svar>('likhet.ts', ['--by', String(seed), String(timmar), ...(seed === seeds[0] && timmar > RESA_TIM ? ['--resa'] : [])], `by ${seed}`).catch((e: Error) => e)));
  let lika = 0;
  for (const r of svar) {
    if (r instanceof Error) console.log(r.message);
    else if (r.olik < 0) { lika++; console.log(`by ${String(r.seed).padStart(3)}: exakt lika i ${timmar} timmar (${r.spel.folk} invånare${r.resa === undefined ? '' : r.resa ? ', med en resa' : ', resan kunde inte starta'})`); }
    else console.log(`by ${String(r.seed).padStart(3)}: OLIKA efter ${r.olik} timmar · spelet ${JSON.stringify(r.spel)} · ikapp ${JSON.stringify(r.ikapp)}`);
  }
  const dygn = +(timmar / 24).toFixed(1);
  console.log(`${lika} av ${antal} byar exakt lika i spelet och ikappräkningen under ${timmar} timmar (${dygn} dygn, ${dygn} år i spelet). (${sek(t0)} s, datorns tid)`);
  // en by som kraschade: kedjan stannar (ALLVARLIGT); en by som inte är lika samlas
  process.exitCode = svar.some(r => r instanceof Error) ? ALLVARLIGT : lika < antal ? 1 : 0;
}
