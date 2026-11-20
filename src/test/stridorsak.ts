// Vad en strid på kartan gällde, som npm run strid räknar den (strid-en.ts). Oftast stridens egen orsak, men björnen som
// anfaller rövarna (djurMotRovare i rovare.ts) startar samma strid som när den anfaller byn: den räknas för sig, som
// vargarna mot rövarna (steg 12.1.162). Scenariot bjornrovare prövar det
import { byId, KartStrid, State } from '../sim';
export function stridOrsak(s: State, g: KartStrid): string {
  const sida0 = g.st.kampar.filter(k => k.sida === 0);
  // alla på byns sida är gäster, och bland dem finns rövare (den som dog kan vara borta ur s.people)
  const rovarna = sida0.length > 0 && sida0.every(k => k.gast) && sida0.some(k => byId(s, k.pid)?.gast?.sort === 'rovare');
  return g.orsak === 'Anfölls av en björn' && rovarna ? 'Björnen mot rövarna' : g.orsak;
}
