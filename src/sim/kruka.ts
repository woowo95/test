// Lerkrukan (steg 9.4.11, Arbetsstationer och möbler: Leran och lerkrukan, Tre storlekar): ett ting med kvalitet, skick och
// ägare, inte en möbel, i tre storlekar som är rader i registret KRUKOR. Den byggs upp för hand av lera med sand i (1, 2 eller 4
// lera), torkar fortare i värme och torka och långsammare i kyla och regn, och bränns sedan i en eld som brinner. Torkningen och
// bränningen är väntan och inget arbete. Om krukan spricker i bränningen avgör kvaliteten; en sprucken kruka blir skärvor.
// Medan den torkar och bränns (t.ler) är den inte färdig och går inte att använda
import { balans } from './balans';
import { tingOf, Ting } from './agande';
import { temperature, vaderNu } from './vader';
import { count, forstaGang, log } from './folk';
import { rnd } from './slump';
import { kvOf } from './kvalitet';
import { State } from './typer';

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

