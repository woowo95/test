// Utvecklas byn likadant i spelet som när den räknas ikapp? Båda räknar i samma femminuterstakt (steg.ts), men spelet
// spelar dessutom in vägen folk går (spar) och tar emot samtalen för pratbubblorna. Samma by körs på båda sätten och
// jämförs varje timme: de ska vara exakt lika (npm run likhet -- [timmar] [byar]).
import { createHash } from 'node:crypto';
import { createState, step, living, serialize, spar, BEAT, State, foodOf, fuelStock, TalkEvent } from '../sim';
import { START } from './kor';
const [seed, timmar] = [Number(process.argv[2] ?? 3), Number(process.argv[3] ?? 96)];
const hash = (s: State) => createHash('sha1').update(serialize(s)).digest('hex');
const spel = createState(seed, START), ikapp = createState(seed, START);
let olik = -1;
for (let h = 0; h < timmar && olik < 0; h++) {
  spar.pa = true;
  for (let i = 0; i < 3600 / BEAT; i++) { spar.v = new WeakMap(); step(spel, BEAT, [] as TalkEvent[]); }
  spar.pa = false;
  for (let i = 0; i < 3600 / BEAT; i++) step(ikapp, BEAT);
  if (hash(spel) !== hash(ikapp)) olik = h + 1;
}
const kort = (s: State) => ({ folk: living(s).length, mat: Math.round(foodOf(s)), bransle: Math.round(fuelStock(s)) });
console.log(JSON.stringify({ seed, olik, spel: kort(spel), ikapp: kort(ikapp) }));
