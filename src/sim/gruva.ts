// ---------- silvergruvan (steg 11.10.1, Flera samhällen: Silvergruvan) ----------
// Silvergruvan är en plats i bergen på världskartan (raden silvergruva i LANDMARKEN), ett hål i marken som aldrig tar slut.
// Världen har SILVER.gruvor gruvor; de läggs ut som de andra platserna, på de bergsrutor som en hash ur världens frö väljer
// först, och en värld som sparats utan gruva får sina när sparfilen läses (varld.ts). Ett sällskap ur huvudbyn reser dit med
// skälet hämta (RESMAL i resa.ts) och bryter silver där nere; hur länge och hur mycket räknas i resa.ts.
import { balans } from './balans';
import { hash3 } from './slump';
import { laggPlats } from './landmarken';
import { MARK_IDS, VarldMark } from './varldmark';
import { Varlden } from './varlden';

export const SILVER = balans('silver', {
  gruvor: 2, // så många silvergruvor har världen
  perTimme: 0.6, // hela silver en utvilad person bryter per timme nere (arbetet mot nästa silver får ha decimaler)
  trott: 36, // kroppen tröttnar: takten faller till en tredjedel efter så här många timmar nere
  olycka: 0.004, // risken per person och timme nere för en olycka
  rykte: 0.5, // det väntade silvret gånger så här mycket när byn bara hört rykten om gruvan
  maxDygn: 3, // längst så många dygn (år i spelet) nere
});
// silvret en person bryter från timme a till timme b nere: takten perTimme · e^(−h/trott), summerad
export const silverMellan = (a: number, b: number) => SILVER.perTimme * SILVER.trott * (Math.exp(-a / SILVER.trott) - Math.exp(-b / SILVER.trott));
// gruvorna i en värld: så många som fattas läggs på de bergsrutor hashen väljer först
export function laggGruvor(vl: Varlden, v: VarldMark, t = 0) {
  let n = (vl.platser ?? []).filter(p => p.k === 'silvergruva').length;
  if (n >= SILVER.gruvor) return;
  const berg: [number, number][] = [];
  for (let i = 0; i < v.w * v.h; i++) if (MARK_IDS[v.mark[i]] === 'berg') berg.push([hash3(vl.fro, i, 0x47525556), i]);
  berg.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, i] of berg) {
    if (n >= SILVER.gruvor) break;
    if (laggPlats(vl, v, 'silvergruva', i % v.w, Math.floor(i / v.w), t)) n++;
  }
}
