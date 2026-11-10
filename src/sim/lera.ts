// Leran (steg 9.4.10, Arbetsstationer och möbler: Leran och lerkrukan): en resurs som de andra, utan egna regler. Var den finns
// står i värmekartorna (lagret lera i fynd.ts, rikast i stranden närmast vattnet), hur mycket byn vill ha i förrådsmålen
// (MATERIALMAL), och att gräva den är ett projekt som saknar lera (projekt.ts): en tur på 3–10 minuter vid den rikaste platsen
// nära byn, med händerna eller dubbelt så fort med benspaden. Det som grävts läggs i en hög där och bärs in som annat
import { amountOf, dropLoad } from './lager';
import { materialBuffert } from './forradsmal';
import { richness, takeFrom } from './fynd';
import { bynsMitt, omrade } from './omrade';
import { balans } from './balans';
import { count, forstaGang, log } from './folk';
import { clamp } from './slump';
import { H, Person, State, Task, W, inMap } from './typer';
import { wearUsed } from './redskap';

export const LERA = balans('lera', {
  perTur: 3, // så mycket lera en tur ger på en full plats med händerna ...
  spade: 2, // ... och så här många gånger mer med benspaden
  min: 3, max: 10, // en tur tar så här många minuter (efter arbetstiderna)
  sokR: 14, // platsen söks så här många rutor från byns mitt
  minst: 0.5, // en plats med mindre än så här är inte värd att gå till
  avstand: 0.01, // varje ruta från byns mitt drar så mycket av platsens värde, så att den närmaste vinner vid lika rikedom
  rikFull: 3, // en plats med så här mycket lera ger full tur
});
// bristen: hur stor del av bufferten som saknas
export const leraBrist = (s: State) => { const n = materialBuffert(s, 'lera'); return n > 0 ? clamp(1 - amountOf(s, 'lera') / n, 0, 1) : 0; };
// den rikaste platsen nära byn, och närmast vid lika
export function leraPlats(s: State) {
  const m = bynsMitt(s), o = omrade(s), R = LERA.sokR + Math.ceil(Math.sqrt(o.n / Math.PI));
  let bast: { x: number; y: number } | undefined, bv = LERA.minst;
  for (let y = Math.max(0, m.y - R); y < Math.min(H, m.y + R + 1); y++) for (let x = Math.max(0, m.x - R); x < Math.min(W, m.x + R + 1); x++) {
    if (!inMap(x, y)) continue;
    const v = richness(s, 'lera', x + 0.5, y + 0.5) - Math.hypot(x - m.x, y - m.y) * LERA.avstand;
    if (v > bv) { bv = v; bast = { x: x + 0.5, y: y + 0.5 }; }
  }
  return bast;
}
// turen är klar: leran tas ur platsen och läggs i en hög där den grävdes
export function leraGravd(s: State, p: Person, t: Task) {
  const spade = t.tool === 'benspade', rik = richness(s, 'lera', t.tx, t.ty);
  const n = Math.max(1, Math.floor(LERA.perTur * Math.min(1, rik / LERA.rikFull) * (spade ? LERA.spade : 1) * ((t.arbTid ?? LERA.min * 60000) / (LERA.max * 60000)) + 1e-9));
  takeFrom(s, 'lera', t.tx, t.ty, n);
  if (t.tool) wearUsed(s, p, 1);
  t.items = { ...(t.items ?? {}), lera: (t.items?.lera ?? 0) + n };
  dropLoad(s, t, p.x, p.y);
  count(s, 'leraGravd', n);
  if (forstaGang(s, 'leraForsta')) log(s, `${p.name} grävde lera vid stranden.`, 'world', [p.id]);
}
