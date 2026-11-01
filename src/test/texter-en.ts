// En by för npm run texter (steg 4.5.1.1): kör byn i [dygn] med en lyssnare på texterna och skriver det som samlats som JSON.
// Texterna som simuleringen skriver (loggen, krönikan, namnen) räknas varje gång de skrivs. Texterna som bara visas när man
// trycker på något skrivs här som om någon tittade (titta i textkoll.ts): för alla i byn var TITTA_TIM timme.
// Varje text går också genom kontrollerna (steg 4.5.1.2), också stilen (upprepningar och långa meningar)
import { step, BEAT, createState } from '../sim';
import { lyssnaPaTexter } from '../sim/berattelser';
import { START, STEG_DYGN, STEG_TIM } from './kor';
import { kollaText, konI, titta } from './textkoll';

export const TITTA_TIM = 24;
export const EXEMPEL = 4; // så många olika ifyllda texter sparas per variant
export type Samlat = Record<string, Record<number, { n: number; ex: string[] }>>;
// felen per kontroll: hur många och några exempel (mallen, det som hittades och texten)
export type Fel = Record<string, { n: number; ex: { mall: string; vad: string; text: string }[] }>;

const [seed, dagar] = process.argv.slice(2).map(Number);
const ut: Samlat = {}, fel: Fel = {};
const s = createState(seed, START), kon = konI(s);
lyssnaPaTexter((mall, i, text, f) => {
  const v = ((ut[mall] ??= {})[i] ??= { n: 0, ex: [] });
  v.n++;
  if (v.ex.length < EXEMPEL && !v.ex.includes(text)) v.ex.push(text);
  for (const k of kollaText(text, f, kon, mall === 'beskrivning', mall === 'beskrivning')) {
    const x = (fel[k.id] ??= { n: 0, ex: [] });
    x.n++;
    if (x.ex.length < 8 && !x.ex.some(e => e.text === text)) x.ex.push({ mall, vad: k.vad, text });
  }
});
for (let i = 0; i < dagar * STEG_DYGN; i++) {
  step(s, BEAT);
  if (i % (STEG_TIM * TITTA_TIM) === STEG_TIM * TITTA_TIM - 1) titta(s);
}
console.log(JSON.stringify({ seed, ut, fel }));
