// En by för npm run texter (steg 4.5.1.1): kör byn i [dygn] med en lyssnare på texterna och skriver det som samlats som JSON.
// Texterna som simuleringen skriver (loggen, krönikan, namnen) räknas varje gång de skrivs. Texterna som bara visas när man
// trycker på något (beskrivningen av en person, samtalet, relationerna, sakernas berättelser) skrivs här som om någon tittade:
// för alla i byn var TITTA_TIM timme
import { alive, byId, living, step, BEAT, createState } from '../sim';
import { beskrivning, lyssnaPaTexter, pratText, relationText, sakBerattelse } from '../sim/berattelser';
import { sakNamn } from '../sim/saker';
import { STATIONER } from '../sim/stationer';
import { START, STEG_DYGN, STEG_TIM } from './kor';

export const TITTA_TIM = 24;
export const EXEMPEL = 4; // så många olika ifyllda texter sparas per variant
export type Samlat = Record<string, Record<number, { n: number; ex: string[] }>>;

const [seed, dagar] = process.argv.slice(2).map(Number);
const ut: Samlat = {};
lyssnaPaTexter((mall, i, text) => {
  const v = ((ut[mall] ??= {})[i] ??= { n: 0, ex: [] });
  v.n++;
  if (v.ex.length < EXEMPEL && !v.ex.includes(text)) v.ex.push(text);
});
const s = createState(seed, START);
for (let i = 0; i < dagar * STEG_DYGN; i++) {
  step(s, BEAT);
  if (i % (STEG_TIM * TITTA_TIM) !== STEG_TIM * TITTA_TIM - 1) continue;
  for (const p of living(s)) {
    beskrivning(s, p); pratText(s, p);
    for (const k in s.rels) {
      const [a, b] = k.split('-').map(Number);
      if (a !== p.id && b !== p.id) continue;
      const q = byId(s, a === p.id ? b : a);
      if (q && alive(q)) relationText(s, p, q, s.rels[k]);
    }
  }
  for (const p of s.people.filter(p => !alive(p)).slice(-5)) beskrivning(s, p);
  for (const t of s.ting ?? []) if (t.ber) sakBerattelse(s, t, sakNamn(t.k));
  for (const st of s.stationer ?? []) if (st.ber) sakBerattelse(s, st, (STATIONER as Record<string, { namn: string }>)[st.k]?.namn ?? st.k);
}
console.log(JSON.stringify({ seed, ut }));
