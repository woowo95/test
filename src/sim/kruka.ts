// Lerkrukan (steg 9.4.11, Arbetsstationer och möbler: Leran och lerkrukan, Tre storlekar): ett ting med kvalitet, skick och
// ägare, inte en möbel, i tre storlekar som är rader i registret KRUKOR. Den byggs upp för hand av lera med sand i (1, 2 eller 4
// lera), torkar fortare i värme och torka och långsammare i kyla och regn, och bränns sedan i en eld som brinner. Torkningen och
// bränningen är väntan och inget arbete. Om krukan spricker i bränningen avgör kvaliteten; en sprucken kruka blir skärvor.
// Medan den torkar och bränns (t.ler) är den inte färdig och går inte att använda
import { balans } from './balans';
import { tingOf, Ting } from './agande';
import { villAv } from './forradsmal';
import { pyntOf, sittAt, sovrum, stationAt } from './stationer';
import { temperature, vaderNu } from './vader';
import { ALDER, ageOf, count, forstaGang, living, log } from './folk';
import { rnd } from './slump';
import { kvOf } from './kvalitet';
import { State, W } from './typer';

export interface KrukaDef { namn: string; lera: number; rymmer: number; vikt: number; min: number }
export const KRUKOR = {
  liten: { namn: 'Liten lerkruka', lera: 1, rymmer: 2, vikt: 0.5, min: 3 },
  mellan: { namn: 'Mellanstor lerkruka', lera: 2, rymmer: 5, vikt: 1, min: 4 },
  stor: { namn: 'Stor lerkruka', lera: 4, rymmer: 10, vikt: 2, min: 6 },
} satisfies Record<string, KrukaDef>;
export type KrukSlag = keyof typeof KRUKOR;
export const KRUK_LIST = Object.keys(KRUKOR) as KrukSlag[];
export const krukSak = (k: KrukSlag) => `lerkruka_${k}`; // saken i SAKER
export const krukaAv = (sak: string): KrukaDef | undefined => (KRUKOR as Record<string, KrukaDef>)[sak.replace(/^lerkruka_/, '')] && sak.startsWith('lerkruka_') ? (KRUKOR as Record<string, KrukaDef>)[sak.replace(/^lerkruka_/, '')] : undefined;
export const KRUKA = balans('kruka', {
  torkTim: 24, // en kruka torkar på ungefär så här många timmar i vanligt väder ...
  varm: 0.05, // ... fortare för varje grad över 10 (så här mycket mer per grad) och långsammare under
  regn: 0.3, // ... och så här fort när det regnar eller snöar
  spricka: [0.6, 0.3, 0.1, 0.05, 0.02, 0], // chansen att den spricker i bränningen, per kvalitet (usel till ★)
});
// krukan är formad: den är rå och ska torka
export function krukaFormad(t: Ting) { t.ler = 0; }
// en gång i timmen: de råa krukorna torkar, och de torra bränns i elden när den brinner
export function stepKrukor(s: State) {
  krukorHem(s);
  const torka = Math.max(0.1, 1 + KRUKA.varm * (temperature(s) - 10)) * (vaderNu(s).nb > 0 ? KRUKA.regn : 1) / KRUKA.torkTim;
  for (const t of [...tingOf(s)]) {
    if (t.ler === undefined) continue;
    if (t.ler < 1) { t.ler = Math.min(1, t.ler + torka); continue; }
    if (!s.fire.lit) continue;
    // bränningen i elden: kvaliteten avgör om den spricker
    if (rnd(s, 'kvalitet') < KRUKA.spricka[kvOf(t)]) {
      s.ting = tingOf(s).filter(q => q !== t);
      count(s, 'krukaSprack');
      if (forstaGang(s, 'krukaSprackForsta')) log(s, 'En lerkruka sprack när den brändes i elden och blev skärvor.', 'world');
      continue;
    }
    t.ler = undefined;
    count(s, 'krukaBrand');
    if (forstaGang(s, 'krukaBrandForsta')) log(s, 'Den första lerkrukan brändes i elden och är färdig.', 'world');
  }
}
export const krukaKlar = (t: Ting) => t.ler === undefined;
// ägaren ställer sin lediga lerkruka i rummet där hen sover, som pynt (steg 9.4.12), när hen inte har något pynt där. Efter arbetet
// ställs den tillbaka i förrådet som redskapen (placeTools), och sedan hit igen
export function krukorHem(s: State) {
  for (const p of living(s)) {
    if (ageOf(p, s.now) < ALDER.vuxen || pyntOf(s, p)) continue;
    const rum = sovrum(s, p), k = rum && tingOf(s).find(t => t.k.startsWith('lerkruka_') && t.agare === p.id && t.ler === undefined && t.hos === undefined && t.lass === undefined && t.bar === undefined && t.krok === undefined);
    if (!rum || !k) continue;
    const i = rum.tiles.find(j => { const x = j % W, y = Math.floor(j / W); return !stationAt(s, x, y) && !sittAt(s, x, y) && !tingOf(s).some(t => t.x === x && t.y === y) && !(s.stackar ?? []).some(a => a.x === x && a.y === y); });
    if (i === undefined) continue;
    k.x = i % W; k.y = Math.floor(i / W); k.vid = undefined;
    count(s, 'krukaHem');
  }
}
export const krukaVill = (s: State) => villAv(s, 'lerkruka'); // hur många lerkrukor byn vill ha (REDSKAPMAL i forradsmal.ts, steg 9.4.12)

