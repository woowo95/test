// Torven (steg 12.1.3, Landskapet och järnet: Myrar: Torven). Torven är en rad i FYND på myrens rutor och tar aldrig slut. Den
// grävs med spaden, och ingen teknik krävs: en tur på 8 minuter ger 8 torv, två fulla händer. En torv värmer som en halv ved
// (TORV.varde) och räknas i byns bränsle bredvid ved och grenar (fuelStock, fuelFor och takeFuel i eld.ts); den får ligga i
// vedboden som veden. Torven är blöt när den grävs: den blöta torven är saken blottorv, som torkar efter samma regler som den
// blöta veden (blotved.ts) men tre gånger långsammare, och blir torv när den är torr; torv som ligger ute i regnet blir blöt igen.
// Blöt torv tänds och brinner som blöt ved. Vem som gräver är ingen regel: när byn arbetar för veden (raden ved i bestWork,
// val.ts) väljer den som har en spade torven när en tur ger mer bränsle per minut med vägen inräknad än det andra trät ger
// (torvHellre): en by med skog nära hugger ved, och en by som huggit ner sin skog gräver torv. Torv går inte att kola.
import { BLOTVED } from './blotved';
import { roofed } from './byggnad';
import { KROPP, count, forstaGang, log } from './folk';
import { heatAt } from './eld';
import { changed, dropLoad, stacksOf } from './lager';
import { eldPlats } from './karta';
import { HOUR_S, Person, State, Task, W } from './typer';
import { nederbord, temperature, vaderNu } from './vader';
import { TORV, myrOf } from './myr';
import { freeTools } from './agande';
import { wearUsed } from './redskap';
import { addDel } from './egendom';
import { GANG } from './gang';
import { SPADAR, myrFrusen } from './malm';

export { TORV } from './myr'; // talen ligger i myr.ts, som eld.ts läser utan att ladda resten av torven
// den närmaste myrrutan (torven finns på hela myren och tar aldrig slut). Ingen när myren är frusen
const narmaste = new WeakMap<State, { nyckel: string; at?: { x: number; y: number } }>();
export function torvPlats(s: State) {
  const a = myrOf(s.seed);
  if (!a || myrFrusen(s)) return undefined;
  const e = eldPlats(s), nyckel = `${s.seed}|${e.x},${e.y}|${a.length}`;
  const c = narmaste.get(s);
  if (c?.nyckel === nyckel) return c.at;
  let at: { x: number; y: number } | undefined, bd = Infinity;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const x = i % W, y = Math.floor(i / W), d = Math.hypot(x - e.x, y - e.y);
    if (d < bd) { bd = d; at = { x: x + 0.5, y: y + 0.5 }; }
  }
  narmaste.set(s, { nyckel, at });
  return at;
}
// bränsle (i ved) per minut av en tur torv, med vägen dit och tillbaka
export function torvTakt(s: State) {
  const at = torvPlats(s);
  if (!at) return 0;
  const e = eldPlats(s), vag = 2 * Math.hypot(at.x - e.x - 0.5, at.y - e.y - 0.5) / (GANG.fart * 60);
  return TORV.perTur * TORV.varde / (TORV.min + vag);
}
// gräver p hellre torv än hämtar annat trä (withTools i val.ts): en ledig spade och en tur som ger mer per minut. tradNara = p
// har ett träd att fälla eller en stam att hugga (axeTask i skog.ts)
export function torvHellre(s: State, p: Person, tradNara: boolean) {
  const sp = SPADAR.find(k => freeTools(s, p, k) > 0);
  if (!sp) return undefined;
  const at = torvPlats(s);
  if (!at || torvTakt(s) <= (tradNara ? TORV.vedFall : TORV.vedGrenar)) return undefined;
  return { spot: at, tool: sp };
}
// turen är klar: torven läggs blöt i en hög där den grävdes, och bärs in som annat
export function torvGravd(s: State, p: Person, t: Task) {
  if (t.tool) wearUsed(s, p, 1);
  t.items = { ...(t.items ?? {}), blottorv: (t.items?.blottorv ?? 0) + TORV.perTur };
  dropLoad(s, t, p.x, p.y);
  count(s, 'torvGravd', TORV.perTur);
  if (forstaGang(s, 'torvForsta')) log(s, `${p.name} grävde torv i myren. Torven är blöt och får torka innan den brinner bra.`, 'world', [p.id]);
}
// den blöta torven torkar och den torra blir blöt i regnet, efter samma regler som veden (stepBlotVed i blotved.ts), tre
// gånger långsammare. En stack byter sak när den torkat eller blivit blöt; ligger det redan en stack av den andra saken på
// rutan läggs de ihop
export function torvTorkar(s: State, dtSec: number) {
  const st = stacksOf(s);
  if (!st.some(a => a.k === 'blottorv' || a.k === 'torv')) return;
  const h = dtSec / HOUR_S, nb = nederbord(s), sno = vaderNu(s).sno, temp = temperature(s);
  const varm = Math.max(BLOTVED.kallMin, Math.pow(2, (temp - BLOTVED.varmFran) / BLOTVED.varmPer));
  const byt = (a: typeof st[number], k: string) => {
    a.vat = undefined; a.tork = undefined;
    const b = st.find(q => q !== a && q.k === k && q.x === a.x && q.y === a.y && q.n > 0);
    if (b) { b.n += a.n; if (a.ag) b.ag = addDel(b.ag ?? {}, a.ag); a.n = 0; a.ag = undefined; } else a.k = k;
    changed(s);
  };
  for (const a of [...st]) {
    if (a.n <= 0 || (a.k !== 'blottorv' && a.k !== 'torv')) continue;
    const tak = roofed(s, a.x, a.y);
    if (nb && !tak) {
      if (a.k === 'blottorv') { a.tork = undefined; continue; }
      a.vat = (a.vat ?? 0) + h / (sno ? BLOTVED.snoTim : BLOTVED.regnTim);
      if (a.vat >= 1) byt(a, 'blottorv');
      continue;
    }
    a.vat = undefined;
    if (a.k !== 'blottorv') continue;
    const fart = (tak ? BLOTVED.takFart : 1) * (heatAt(s, a.x + 0.5, a.y + 0.5) > KROPP.eldNara ? BLOTVED.eldFart : 1) * varm;
    a.tork = (a.tork ?? 0) + h * fart / (BLOTVED.torkTim * TORV.torkGanger);
    if (a.tork >= 1) byt(a, 'torv');
  }
}
