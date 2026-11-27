// ---------- silvergruvan (steg 11.10.1, Flera samhällen: Silvergruvan) ----------
// Silvergruvan är en plats i bergen på världskartan (raden silvergruva i LANDMARKEN), ett hål i marken med SILVER.innehall silver
// (platsens inne). När det sista är brutet är gruvan tom: den tas bort ur världen och en ny läggs på ett berg där ingen gruva
// legat förut (steg 15.1.10).
// Världen har SILVER.gruvor gruvor; de läggs ut som de andra platserna, på de bergsrutor som en hash ur världens frö väljer
// först, och en värld som sparats utan gruva får sina när sparfilen läses (varld.ts). Ett sällskap ur huvudbyn reser dit med
// skälet hämta (RESMAL i resa.ts) och bryter silver där nere; hur länge och hur mycket räknas i resa.ts.
import { balans } from './balans';
import { hash3 } from './slump';
import { laggPlats } from './landmarken';
import { MARK_IDS, VarldMark } from './varldmark';
import { Varlden } from './varlden';
import type { State } from './typer';

export const SILVER = balans('silver', {
  gruvor: 2, // så många silvergruvor har världen
  perTimme: 0.6, // hela silver en utvilad person bryter per timme nere (arbetet mot nästa silver får ha decimaler)
  trott: 36, // kroppen tröttnar: takten faller till en tredjedel efter så här många timmar nere
  olycka: 0.004, // risken per person och timme nere för en olycka
  rykte: 0.5, // det väntade silvret gånger så här mycket när byn bara hört rykten om gruvan
  maxDygn: 3, // längst så många dygn (år i spelet) nere
  innehall: 300, // så många hela silver finns i en gruva; när de är brutna är den tom och en ny finns på ett annat berg (steg 15.1.10)
});
// järngruvan (steg 12.2.13, Landskapet och järnet: Järngruvan): som silvergruvan, men där bryts malm, samma sak som den ur myren
export const JARNGRUVA = balans('jarngruva', {
  gruvor: 2, // så många järngruvor har världen
  perTimme: 2, // hela malm en person bryter per timme nere (malmen väger 4, så sällskapet bär fullt på några timmar)
});
// det gruvan ger: sakens id och hur mycket en person bryter från timme a till timme b nere
export const GRUVSAK: Record<string, { sak: string; mellan: (a: number, b: number) => number }> = {
  silvergruva: { sak: 'silver', mellan: (a, b) => silverMellan(a, b) },
  jarngruva: { sak: 'malm', mellan: (a, b) => JARNGRUVA.perTimme * (b - a) },
};
// silvret en person bryter från timme a till timme b nere: takten perTimme · e^(−h/trott), summerad
export const silverMellan = (a: number, b: number) => SILVER.perTimme * SILVER.trott * (Math.exp(-a / SILVER.trott) - Math.exp(-b / SILVER.trott));
// gruvorna i en värld: så många som fattas läggs på de bergsrutor hashen väljer först
export function laggGruvor(vl: Varlden, v: VarldMark, t = 0) {
  laggJarngruvor(vl, v, t);
  let n = (vl.platser ?? []).filter(p => p.k === 'silvergruva').length;
  if (n >= SILVER.gruvor) return;
  const berg: [number, number][] = [];
  for (let i = 0; i < v.w * v.h; i++) if (MARK_IDS[v.mark[i]] === 'berg' && !vl.tommaGruvor?.includes(i)) berg.push([hash3(vl.fro, i, 0x47525556), i]); // inte där en gruva tömts
  berg.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, i] of berg) {
    if (n >= SILVER.gruvor) break;
    if (laggPlats(vl, v, 'silvergruva', i % v.w, Math.floor(i / v.w), t)) n++;
  }
}
// järngruvorna (steg 12.2.13): så många som fattas, på bergsrutor som en annan hash väljer. En värld som sparats utan dem får
// sina första gången raden bränningarna i TAKTER ser den (vl.jarnLagd), eftersom gruvan alltid funnits där
export function laggJarngruvor(vl: Varlden, v: VarldMark, t = 0) {
  vl.jarnLagd = 1;
  let n = (vl.platser ?? []).filter(p => p.k === 'jarngruva').length;
  if (n >= JARNGRUVA.gruvor) return;
  const berg: [number, number][] = [];
  for (let i = 0; i < v.w * v.h; i++) if (MARK_IDS[v.mark[i]] === 'berg') berg.push([hash3(vl.fro, i, 0x4a41524e), i]);
  berg.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, i] of berg) {
    if (n >= JARNGRUVA.gruvor) break;
    if (laggPlats(vl, v, 'jarngruva', i % v.w, Math.floor(i / v.w), t)) n++;
  }
}
// en värld som sparats före järngruvorna får dem nu (raden bränningarna i TAKTER)
export function jarngruvorSteg(s: State) { if (s.varld && !s.varld.jarnLagd) { const v = varldMarkKrok.f?.(s); if (v) laggJarngruvor(s.varld, v, s.now); } }
export const varldMarkKrok: { f?: (s: State) => VarldMark | undefined } = {};
// silvret som finns kvar i gruvan p (platsens inne, SILVER.innehall från början)
export const silverKvar = (p: { k: string; inne?: Record<string, number> }) => p.k === 'silvergruva' ? p.inne?.silver ?? SILVER.innehall : Infinity;
