// Lerkrukan (steg 9.4.11, Arbetsstationer och möbler: Leran och lerkrukan, Tre storlekar): ett ting med kvalitet, skick och
// ägare, inte en möbel, i tre storlekar som är rader i registret KRUKOR. Den byggs upp för hand av lera med sand i (1, 2 eller 4
// lera), torkar fortare i värme och torka och långsammare i kyla och regn, och bränns sedan i en eld som brinner. Torkningen och
// bränningen är väntan och inget arbete. Om krukan spricker i bränningen avgör kvaliteten; en sprucken kruka blir skärvor.
// Medan den torkar och bränns (t.ler) är den inte färdig och går inte att använda
import { balans } from './balans';
import { tingOf, Ting } from './agande';
import { villAv } from './forradsmal';
import { pyntLust, pyntOf, sittAt, sovrum, stationAt } from './stationer';
import { temperature, vaderNu } from './vader';
import { ALDER, ageOf, count, forstaGang, living, log } from './folk';
import { clamp, rnd } from './slump';
import { PERFEKT, kvOf } from './kvalitet';
import { HOUR, Person, State, W } from './typer';

export interface KrukaDef { namn: string; lera: number; rymmer: number; vikt: number; min: number }
export const KRUKOR = {
  liten: { namn: 'Liten lerkruka', lera: 1, rymmer: 2, vikt: 0.5, min: 3 },
  mellan: { namn: 'Mellanstor lerkruka', lera: 2, rymmer: 5, vikt: 1, min: 4 },
  stor: { namn: 'Stor lerkruka', lera: 4, rymmer: 10, vikt: 2, min: 4 },
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
    const rum = sovrum(s, p), k = rum && tingOf(s).find(t => t.k.startsWith('lerkruka_') && t.agare === p.id && t.ler === undefined && t.kok === undefined /* en rätt som lagas på elden flyttas inte */ && t.hos === undefined && t.lass === undefined && t.bar === undefined && t.krok === undefined);
    if (!rum || !k) continue;
    const i = rum.tiles.find(j => { const x = j % W, y = Math.floor(j / W); return !stationAt(s, x, y) && !sittAt(s, x, y) && !tingOf(s).some(t => t.x === x && t.y === y) && !(s.stackar ?? []).some(a => a.x === x && a.y === y); });
    if (i === undefined) continue;
    k.x = i % W; k.y = Math.floor(i / W); k.vid = undefined;
    count(s, 'krukaHem');
  }
}
export const krukaVill = (s: State) => villAv(s, 'lerkruka');

// ---------- utseendet (steg 10.7.2) ----------
// Lerkrukan har tre utseenden, rader i registret KRUKA_UTSEENDEN, så att husen inte ser likadana ut. Vilket en kruka har följer
// krukan själv (dess nummer) och ändrar varken glädjen, värdet eller smaken. En kruka med en växt i ritas med växten, högre ju mer
// den vuxit
export const KRUKA_UTSEENDEN = [
  { id: 'rundad', namn: 'Rundad' }, // den Björn valde i bildstilen (steg 4.5.2)
  { id: 'hog', namn: 'Hög och smal' }, // platshållare tills Björn valt
  { id: 'skal', namn: 'Låg och vid' }, // platshållare tills Björn valt
] as const;
export const krukaUtseende = (t: { id: number }) => KRUKA_UTSEENDEN[t.id % KRUKA_UTSEENDEN.length];
// det kartan ritar för krukan: bilden och växten i den (sorten och hur långt den vuxit)
export function krukaBild(t: Ting) {
  const u = krukaUtseende(t);
  return { ikon: u.id === 'rundad' ? t.k : `lerkruka_${u.id}`, ...(t.vaxt ? { vaxt: { g: t.vaxt.g, v: Math.min(1, t.vaxt.v), ...(krukaBlommar(t) ? { blommar: true } : {}) } } : {}) };
} // hur många lerkrukor byn vill ha (REDSKAPMAL i forradsmal.ts, steg 9.4.12)


// ---------- örter i krukor (steg 9.7.16, Odlingen i detalj: Örter i krukor) ----------
// Örterna (raderna i GRODOR med plats kruka) odlas inte på fälten utan i lerkrukor vid husen. Den som kan odla och har en ledig
// liten eller mellanstor kruka sätter en ört i den; den växer där (inne året om, ute när det är varmt) och ägaren plockar den när
// den är mogen, och den växer igen. Krukan är pynt som förut (pyntOf i stationer.ts)
export const ORTKRUKA = balans('ortkruka', {
  plock: 2, // så många örter ger en mogen kruka
  ater: 0.3, // så långt har örten vuxit igen efter plocket
  // vilken växt en ledig kruka får (steg 10.7.3): örten väger efter byns brist (förrådet mot ortMal), blomman efter ägarens lust
  // till pynt gånger blomVikt, och den högsta sätts
  ortMal: 10, // så många av varje ört vill byn ha i förrådet
  blomVikt: 0.6,
});
// blomman (steg 10.7.3): en växt i krukan med blom (GRODOR) blommar när den vuxit upp, och då är krukan ett kvalitetssteg finare pynt
export const krukaBlommar = (t: Ting) => !!t.vaxt && !!(GRODOR[t.vaxt.g as GrodaSlag] as GrodaDef).blom && t.vaxt.v >= 1;
export const krukaPyntQ = (t: Ting) => Math.min(PERFEKT, kvOf(t) + (krukaBlommar(t) ? 1 : 0));
// p:s lediga kruka, där en växt kan sättas
const ledigKruka = (s: State, p: Person) => tingOf(s).find(q => q.agare === p.id && (q.k === 'lerkruka_liten' || q.k === 'lerkruka_mellan') && q.ler === undefined && !q.inne && !q.vaxt && !q.kok && q.hos === undefined);
// poängen för växten g i p:s kruka
export function krukPoang(s: State, p: Person, g: GrodaSlag) {
  const d = GRODOR[g] as GrodaDef;
  return d.blom ? pyntLust(s, p) * ORTKRUKA.blomVikt : clamp(1 - amountOf(s, d.sak) / ORTKRUKA.ortMal, 0, 1);
}
const krukVal = (s: State, p: Person, finns: (g: GrodaSlag) => boolean) => {
  let bast: GrodaSlag | undefined, bv = -1;
  for (const g of ortKrukor()) { if (!finns(g)) continue; const v = krukPoang(s, p, g); if (v > bv) { bv = v; bast = g; } }
  return bast;
};
// hur många blommor byn vill ha: en per ledig kruka vars ägare hellre vill ha en blomma än en ört. Räknas en gång i timmen
const villCache = new WeakMap<State, { h: number; n: number }>();
export function blommaVill(s: State) {
  const h = Math.floor(s.now / HOUR), c = villCache.get(s);
  if (c && c.h === h) return c.n;
  let n = 0;
  for (const p of living(s)) if (ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'odling') && ledigKruka(s, p) && krukVal(s, p, () => true) === 'blomma') n++;
  villCache.set(s, { h, n });
  return n;
}
const ortKrukor = () => (Object.keys(GRODOR) as GrodaSlag[]).filter(g => (GRODOR[g] as GrodaDef).plats === 'kruka');
export function stepOrtKrukor(s: State, dt = 3600) {
  const temp = temperature(s), tim = dt / 3600; // växten räknas med tiden sedan sist
  for (const t of tingOf(s)) {
    if (!t.vaxt) continue;
    const inne = t.x !== undefined && !!roomAt(s, t.x + 0.5, t.y! + 0.5);
    if (!inne && temp <= ODLING.vaxGrad) continue;
    const d = GRODOR[t.vaxt.g as GrodaSlag] as GrodaDef;
    t.vaxt.v += tim / (d.dygn * 24);
    if (d.blom) { if (t.vaxt.v >= 1 + d.blom / d.dygn) { t.vaxt.v = 0; count(s, 'blommaVissnar'); } continue; } // blomman blommar, vissnar ner och kommer igen
    if (t.vaxt.v < 1) continue;
    const p = living(s).find(q => q.id === t.agare);
    if (!p) continue;
    put(s, GRODOR[t.vaxt.g as GrodaSlag].sak, ORTKRUKA.plock, { [p.id]: ORTKRUKA.plock });
    t.vaxt.v = ORTKRUKA.ater; count(s, 'ortKruka');
    if (forstaGang(s, 'ortKruka')) log(s, `${p.name} plockade röllekan som växer i hens lerkruka.`, 'world', [p.id]);
  }
  for (const p of living(s)) {
    if (ageOf(p, s.now) < ALDER.vuxen || !knows(p, 'odling')) continue;
    const t = ledigKruka(s, p);
    const g = t && krukVal(s, p, x => getable(s, p, GRODOR[x].fro) >= 1); // den växt som väger mest av dem p har (steg 10.7.3)
    if (!t || !g) continue;
    takeMaterial(s, p, GRODOR[g].fro, 1);
    t.vaxt = { g, v: 0 }; count(s, g === 'blomma' ? 'blommaSatt' : 'ortSatt');
    if (g === 'blomma' ? forstaGang(s, 'blommaSatt') : forstaGang(s, 'ortSatt')) log(s, `${p.name} satte ${g === 'blomma' ? 'en blomma' : 'en rölleka'} i en lerkruka vid huset.`, 'world', [p.id]);
  }
}
import { GRODOR, GrodaDef, GrodaSlag, ODLING } from './odling';
import { roomAt } from './byggnad';
import { amountOf, put } from './lager';
import { getable, takeMaterial } from './behov';
import { knows } from './teknik';
