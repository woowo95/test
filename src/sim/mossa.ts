// Mossan (steg 12.1.6, Landskapet och järnet: Myrar: Mossan). Mossan växer bara i myren: en rad i FYND (fynd.ts) på myrens rutor,
// 4 i en full ruta, och en tömd ruta är full igen efter ungefär 60 dygn (60 år i spelet), utom i istiden. Den plockas för hand på
// en tur av 5 minuter vid den rikaste mossrutan nära byn, som ger upp till 10 mossa och läggs i en hög där. Mossan går till
// förbanden (halsa.ts): mossa under en remsa är det bästa förbandet. Byn vill ha en mossa per invånare när kartan har en myr
// (MATERIALMAL i forradsmal.ts); bristen är det som fattas, som för repet. En by utan myr lägger förband av remsor eller köper mossa
import { amountOf, dropLoad } from './lager';
import { richness, richnessFor, takeFrom } from './fynd';
import { eldPlats } from './karta';
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, log } from './folk';
import { Person, State, Task, W } from './typer';
import { myrOf } from './myr';
import { clamp } from './slump';
import { grundvarde } from './varde';
import { iPlatsMinne } from './stationer';
import { laggTillProjekt } from './projekt';
import { villHaAv } from './forradsmal';

export const MOSSA = balans('mossa', {
  perTur: 10, // högst så mycket mossa en tur ger ...
  min: 5, // ... på så här många minuter (en tur att samla, efter arbetstiderna)
  avstand: 0.01, // varje ruta från elden drar så mycket av platsens värde, så att den närmaste vinner vid lika rikedom
  minst: 1, // en ruta med mindre mossa än så här är inte värd att gå till
});
const LAGER = ['mossa'] as const;
// den rikaste mossrutan, och den närmaste vid lika. Bara myrens rutor prövas
export const mossaPlats = (s: State) => iPlatsMinne('mossa', () => sok(s));
function sok(s: State) {
  const a = myrOf(s.seed);
  if (!a) return undefined;
  const e = eldPlats(s), rik = richnessFor(s, LAGER);
  let bast: { x: number; y: number } | undefined, bv = -Infinity;
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const r = rik(0, i);
    if (r < MOSSA.minst) continue;
    const x = i % W, y = Math.floor(i / W), v = r - Math.hypot(x - e.x, y - e.y) * MOSSA.avstand;
    if (v > bv) { bv = v; bast = { x: x + 0.5, y: y + 0.5 }; }
  }
  return bast;
}
// turen är klar: mossan tas ur rutorna runt platsen, den rikaste först, och läggs i en hög där den plockades
export function mossaPlockad(s: State, p: Person, t: Task) {
  let n = 0;
  for (let dy = -1; dy <= 1 && n < MOSSA.perTur; dy++) for (let dx = -1; dx <= 1 && n < MOSSA.perTur; dx++) {
    const x = Math.floor(t.tx) + dx + 0.5, y = Math.floor(t.ty) + dy + 0.5, m = Math.min(MOSSA.perTur - n, Math.floor(richness(s, 'mossa', x, y) + 1e-9));
    if (m <= 0) continue;
    takeFrom(s, 'mossa', x, y, m); n += m;
  }
  if (n <= 0) return;
  t.items = { ...(t.items ?? {}), mossa: (t.items?.mossa ?? 0) + n };
  dropLoad(s, t, p.x, p.y);
  count(s, 'mossaPlockad', n);
  if (forstaGang(s, 'mossaForsta')) log(s, `${p.name} plockade mossa i myren. Under en remsa blir den det bästa förbandet.`, 'world', [p.id]);
}
// bristen: det som fattas av det byn vill ha
const brist = (s: State) => { const v = villHaAv(s, 'mossa'); return v > 0 ? clamp(1 - amountOf(s, 'mossa') / v, 0, 1) : 0; };
laggTillProjekt({
  mossplock: {
    namn: 'Mossa', vikt: 1,
    brist,
    kostnad: () => grundvarde('mossa') * MOSSA.perTur,
    kan: (s, p) => ageOf(p, s.now) >= ALDER.vuxen && brist(s) > 0 && !!mossaPlats(s),
    uppgift: s => { const at = mossaPlats(s); return at && { act: 'plockaMossa', text: 'Plockar mossa i myren.', min: MOSSA.min, spot: at }; },
  },
});
