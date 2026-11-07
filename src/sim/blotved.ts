import { balans } from './balans';
import { roofed } from './byggnad';
import { KROPP } from './folk';
import { heatAt } from './eld';
import { amountOf, stacksOf } from './lager';
import { HOUR_S, State } from './typer';
import { nederbord, temperature, vaderNu } from './vader';
import { stationerOf } from './stationer';

// ---------- blöt ved (steg 7.3.4) ----------
// Ved är antingen helt torr eller helt blöt, inga grader. En vedhög ute utan tak blir blöt efter en kort stund i regn och snö. Den
// torkar inte medan det regnar, och när regnet slutat torkar den efter en torktid, som går fortare under tak och nära elden och
// långsammare när det är kallt. Läggs blöt ved på en torr hög blir högen blöt (lager.ts). Blöt ved är svårare att tända och
// brinner fortare, och man tar torr ved först (takeFuel i eld.ts). På en torkställning ute står torkningen still medan det
// regnar eller snöar (steg 7.3.5): tiden fortsätter när det slutat
export const BLOTVED = balans('blotved', {
  regnTim: 1, // så många timmar i regn innan en hög ute är blöt ...
  snoTim: 3, // ... och i snöfall
  torkTim: 24, // så många timmar det tar att torka ute när det inte regnar (ett dygn = ett år i spelet)
  takFart: 2, // under tak går det så här många gånger fortare ...
  eldFart: 4, // ... och nära en lägereld så här många gånger
  varmFran: 10, // grader där torkningen går i vanlig takt ...
  varmPer: 20, // ... och ändras så här många grader ger dubbelt så fort
  kallMin: 0.25, // aldrig långsammare än så här stor del
  brann: 0.5, // blöt ved brinner så här mycket fortare
  tand: 0.6, // finns bara blöt ved är chansen att tända så här stor del
});
export function stepBlotVed(s: State, dtSec: number) {
  const h = dtSec / HOUR_S, nb = nederbord(s), sno = vaderNu(s).sno, temp = temperature(s);
  const varm = Math.max(BLOTVED.kallMin, Math.pow(2, (temp - BLOTVED.varmFran) / BLOTVED.varmPer));
  for (const a of stacksOf(s)) {
    if (a.k !== 'ved') continue;
    const tak = roofed(s, a.x, a.y);
    if (nb && !tak) {
      a.vat = (a.vat ?? 0) + h / (sno ? BLOTVED.snoTim : BLOTVED.regnTim); a.tork = undefined;
      if (a.vat >= 1) { a.blot = 1; a.vat = undefined; }
      continue;
    }
    a.vat = undefined;
    if (!a.blot) continue;
    const fart = (tak ? BLOTVED.takFart : 1) * (heatAt(s, a.x + 0.5, a.y + 0.5) > KROPP.eldNara ? BLOTVED.eldFart : 1) * varm;
    a.tork = (a.tork ?? 0) + h * fart / BLOTVED.torkTim;
    if (a.tork >= 1) { a.blot = undefined; a.tork = undefined; }
  }
  if (nb) for (const t of stationerOf(s)) if (t.tork?.length && !roofed(s, t.x, t.y)) for (const q of t.tork) q.t += dtSec * 1000;
}
// så mycket torr ved byn har
export function torrVed(s: State) {
  let n = amountOf(s, 'ved');
  for (const a of stacksOf(s)) if (a.k === 'ved' && a.blot) n -= a.n;
  return Math.max(0, n);
}
