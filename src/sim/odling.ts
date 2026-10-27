import { count, forstaGang, log } from './folk';
import { FYND, richness, takeFrom } from './fynd';
import { amountOf } from './lager';
import { kunnighet } from './ekonomi';
import { SNABBARE } from './handlingar';
import { HOUR_S, Person, State, Task } from './typer';
import { balans } from './balans';

// ---------- odling (steg 2.10.2–) ----------
// Vilda grödor växer på kartan som andra växter: vildkorn på ängarna och vilda ärter i skogsbrynet (lagren i VILDA, rader i
// FYND i fynd.ts). Den som samlar där de växer tar med sig frön (fron i saker.ts) tills byn har så många den vill ha. Fröna
// kan inte ätas. Byn räknar hur mycket den samlat av de vilda grödorna (statistiken vildgrodor), och ju mer, desto fortare
// kommer den som samlar på tekniken Odling (raden odling i teknik.ts, `okar`). Fälten kommer i steg 2.10.3.
export const ODLING = balans('odling', {
  froTakt: 3, // frön per arbetstimme på en mycket rik plats (gånger kunnigheten och SNABBARE)
  froUttag: 0.1, // varje frö tar så här mycket ur platsen
  froVill: 20, // man tar med sig frön tills byn har så här många
});
// lagren i FYND med vilda grödor, som ger frön
export const VILDA = ['vildkorn', 'arter'] as const;

// medan man samlar (UTFALL samla i steg.ts): frön från de vilda grödorna där man står, och platsen töms lite
export function froFynd(s: State, p: Person, tk: Task, dtSec: number) {
  if (amountOf(s, 'fron') + (tk.items?.fron ?? 0) >= ODLING.froVill) return 0;
  const sk = kunnighet(p.skill.samla) * SNABBARE * dtSec / HOUR_S;
  let n = 0;
  for (const k of VILDA) {
    const r = richness(s, k, tk.tx, tk.ty);
    if (r <= 0) continue;
    const g = ODLING.froTakt * r / FYND[k].topp * sk;
    takeFrom(s, k, tk.tx, tk.ty, g * ODLING.froUttag);
    n += g;
  }
  if (n <= 0) return 0;
  count(s, 'vildgrodor', n);
  if (forstaGang(s, 'froForst')) log(s, `${p.name} tog med sig frön från de vilda grödorna. De går inte att äta.`, 'world', [p.id]);
  return n;
}
