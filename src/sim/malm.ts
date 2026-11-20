// Myrmalmen (steg 12.1.2, Landskapet och järnet: Malmen, Järnet: Myrmalmen i tal). Malmen är en rad i FYND (fynd.ts): den
// ligger i fläckar på myren (ungefär var femte myrruta, myrMalm i myr.ts), 4 malm i en full ruta, och en tömd ruta är full igen
// efter ungefär 30 dygn (30 år i spelet). I istiden växer inget till, och när myren är frusen går det inte att gräva. Malmen
// grävs med spaden, som krävs och slits som i annat grävande: en tur på 6 minuter vid den rikaste malmrutan nära byn ger 4 malm,
// två fulla händer, som läggs i en hög där och bärs in som annat. Byn har inget fast mål för malmen: projektet malm har ingen
// egen brist, och behovet ärvs från det byn vill ha som kräver malm (arv i projekt.ts), som järnet
import { amountOf, dropLoad } from './lager';
import { richness, richnessFor, takeFrom } from './fynd';
import { eldPlats } from './karta';
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, log } from './folk';
import { Person, State, Task, W } from './typer';
import { wearUsed } from './redskap';
import { freeTools } from './agande';
import { myrOf } from './myr';
import { isCm } from './is';
import { grundvarde } from './varde';
import { iPlatsMinne } from './stationer';
import { laggTillProjekt } from './projekt';

export const MALM = balans('malm', {
  perTur: 4, // så mycket malm en tur ger (två fulla händer) ...
  min: 6, // ... på så här många minuter (en tur att samla, efter arbetstiderna)
  avstand: 0.01, // varje ruta från elden drar så mycket av platsens värde, så att den närmaste vinner vid lika rikedom
  minst: 1, // en ruta med mindre malm än så här är inte värd att gå till
});
export const SPADAR = ['benspade'] as const; // spadarna som malmen grävs med, den bästa först
// är myren frusen: isen ligger på sjön (is.ts), och då är marken för hård att gräva i
export const myrFrusen = (s: State) => isCm(s) > 0;
// den rikaste malmrutan, och den närmaste vid lika. Bara myrens rutor prövas
const MALMLAGER = ['malm'] as const;
export const malmPlats = (s: State) => iPlatsMinne('malm', () => sokMalm(s));
function sokMalm(s: State) {
  const a = myrOf(s.seed);
  if (!a || myrFrusen(s)) return undefined;
  const e = eldPlats(s), rik = richnessFor(s, MALMLAGER);
  let bast: { x: number; y: number } | undefined, bv = -Infinity;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const r = rik(0, i);
    if (r < MALM.minst) continue;
    const x = i % W, y = Math.floor(i / W), v = r - Math.hypot(x - e.x, y - e.y) * MALM.avstand;
    if (v > bv) { bv = v; bast = { x: x + 0.5, y: y + 0.5 }; }
  }
  return bast;
}
const spadeFor = (s: State, p: Person) => SPADAR.find(k => freeTools(s, p, k) > 0);
// turen är klar: malmen tas ur rutan och läggs i en hög där den grävdes
export function malmGravd(s: State, p: Person, t: Task) {
  const n = Math.min(MALM.perTur, Math.floor(richness(s, 'malm', t.tx, t.ty) + 1e-9));
  if (n <= 0) return;
  takeFrom(s, 'malm', t.tx, t.ty, n);
  if (t.tool) wearUsed(s, p, 1);
  t.items = { ...(t.items ?? {}), malm: (t.items?.malm ?? 0) + n };
  dropLoad(s, t, p.x, p.y);
  count(s, 'malmGravd', n);
  if (forstaGang(s, 'malmForsta')) log(s, `${p.name} grävde myrmalm ur myren. Den rostbruna malmen är det järnet görs av.`, 'world', [p.id]);
}
// malmen som projekt: ingen egen brist, men den som vill ha något som kräver malm gräver den (arv i projekt.ts)
laggTillProjekt({
  malm: {
    namn: 'Myrmalm', vikt: 1,
    brist: () => 0,
    kostnad: () => grundvarde('malm') * MALM.perTur,
    kan: (s, p) => ageOf(p, s.now) >= ALDER.vuxen && !!spadeFor(s, p) && !!malmPlats(s),
    uppgift: (s, p) => { const at = malmPlats(s), sp = spadeFor(s, p); return at && sp && { act: 'malm', text: 'Gräver malm i myren.', min: MALM.min, tool: sp, spot: at }; },
  },
});
export const harMalm = (s: State) => amountOf(s, 'malm') > 0;
