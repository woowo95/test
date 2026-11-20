// Lerkrukan (steg 9.4.11, Arbetsstationer och möbler: Leran och lerkrukan, Tre storlekar): ett ting med kvalitet, skick och
// ägare, inte en möbel, i tre storlekar som är rader i registret KRUKOR. Den byggs upp för hand av lera med sand i (1, 2 eller 4
// lera), torkar fortare i värme och torka och långsammare i kyla och regn, och bränns sedan i en eld som brinner. Torkningen och
// bränningen är väntan och inget arbete. Om krukan spricker i bränningen avgör kvaliteten; en sprucken kruka blir skärvor.
// Medan den torkar och bränns (t.ler) är den inte färdig och går inte att använda
import { balans } from './balans';
import { tingOf, Ting } from './agande';
import { villAv } from './forradsmal';
import { krukaHemma, pyntLust, pyntOf, sittAt, sovrum, stationAt } from './stationer';
import { temperature, vaderNu } from './vader';
import { ALDER, ageOf, count, forstaGang, living, log, ovning } from './folk';
import { clamp, rnd } from './slump';
import { PERFEKT, kvOf } from './kvalitet';
import { HOUR, Person, State, Task, W } from './typer';

export interface KrukaDef { namn: string; lera: number; rymmer: number; vikt: number; min: number }
export const KRUKOR = {
  liten: { namn: 'Liten lerkruka', lera: 1, rymmer: 2, vikt: 0.5, min: 3 },
  mellan: { namn: 'Mellanstor lerkruka', lera: 2, rymmer: 5, vikt: 1, min: 4 },
  stor: { namn: 'Stor lerkruka', lera: 4, rymmer: 10, vikt: 2, min: 4 },
} satisfies Record<string, KrukaDef>;
export type KrukSlag = keyof typeof KRUKOR;
export const krukaAv = (sak: string): KrukaDef | undefined => (KRUKOR as Record<string, KrukaDef>)[sak.replace(/^lerkruka_/, '')] && sak.startsWith('lerkruka_') ? (KRUKOR as Record<string, KrukaDef>)[sak.replace(/^lerkruka_/, '')] : undefined;
export const KRUKA = balans('kruka', {
  torkTim: 24, // en kruka torkar på ungefär så här många timmar i vanligt väder ...
  varm: 0.05, // ... fortare för varje grad över 10 (så här mycket mer per grad) och långsammare under
  regn: 0.3, // ... och så här fort när det regnar eller snöar
  upp: 2, // minuter att ta upp krukan och göra den redo att bäras till rummet (steg 10.11.17)
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
// ägaren bär sin lediga lerkruka till rummet där hen sover, som pynt (steg 9.4.12), när hen inte har något pynt där (steg 10.11.17:
// krukan flyttar sig inte själv). Efter arbetet ställs den tillbaka i förrådet som redskapen (placeTools), och sedan bärs den hit
// igen. Raden krukaHem i ARBETEN (val.ts) väljer det bland det man gör för att göra det bättre; hen går till krukan, tar upp den
// (KLAR i steg.ts), bär den till en fri ruta i rummet och ställer ner den där (LAMNA i steg.ts)
const fri = (s: State, x: number, y: number) => !stationAt(s, x, y) && !sittAt(s, x, y) && !tingOf(s).some(t => t.x === x && t.y === y) && !(s.stackar ?? []).some(a => a.x === x && a.y === y);
const barsHem = (s: State, p: Person, t: Ting) => living(s).some(q => q !== p && q.task?.act === 'krukaHem' && q.task.ref === t.id);
export function krukaHemVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || pyntOf(s, p)) return undefined;
  const rum = sovrum(s, p), k = rum && tingOf(s).find(t => t.k.startsWith('lerkruka_') && t.agare === p.id && t.ler === undefined && t.kok === undefined /* en rätt som lagas på elden flyttas inte */ && t.hos === undefined && t.lass === undefined && t.bar === undefined && t.krok === undefined && t.x !== undefined && t.y !== undefined && !barsHem(s, p, t));
  if (!rum || !k) return undefined;
  const i = rum.tiles.find(j => fri(s, j % W, Math.floor(j / W)));
  return i === undefined ? undefined : { t: k, i };
}
// framme vid krukan: hen tar upp den och bär den mot rummet
export function krukaUpp(s: State, p: Person, tk: Task) {
  const v = krukaHemVal(s, p);
  if (!v || v.t.id !== tk.ref) return;
  const k = v.t;
  k.hos = p.id; k.x = k.y = k.vid = undefined;
  tk.phase = 'back'; tk.tx = v.i % W + 0.5; tk.ty = Math.floor(v.i / W) + 0.5; tk.why = 'Bär sin lerkruka till rummet där hen sover';
}
// framme i rummet: krukan ställs på rutan, eller där hen står om rutan blivit upptagen
export function krukaNer(s: State, p: Person, tk: Task) {
  slappKruka(s, tk, p, tk.tx, tk.ty);
  p.task = undefined;
}
// krukan som bärs ställs ner på (x, y) om rutan är fri, annars får den en plats i förrådet (placeTools): också när bäraren
// avbryts på vägen (avbryt i lager.ts)
export function slappKruka(s: State, tk: Task, p: Person, x: number, y: number) {
  if (tk.act !== 'krukaHem' || tk.phase !== 'back') return;
  const k = tingOf(s).find(t => t.id === tk.ref && t.hos === p.id);
  if (!k) return;
  k.hos = undefined;
  const fx = Math.floor(x), fy = Math.floor(y);
  if (fri(s, fx, fy)) { k.x = fx; k.y = fy; if (krukaHemma(s, p) === k) count(s, 'krukaHem'); }
}
// hur många lerkrukor byn vill ha (REDSKAPMAL i forradsmal.ts, steg 9.4.12)
export const krukaVill = (s: State) => villAv(s, 'lerkruka');

// ---------- utseendet (steg 10.7.2) ----------
// Lerkrukan har två utseenden, rader i registret KRUKA_UTSEENDEN, så att husen inte ser likadana ut. Vilket en kruka har följer
// krukan själv (dess nummer) och ändrar varken glädjen, värdet eller smaken. En kruka med en växt i ritas med växten, högre ju mer
// den vuxit
export const KRUKA_UTSEENDEN = [
  { id: 'rundad', namn: 'Rundad' }, // den Björn valde i bildstilen (steg 4.5.2)
  { id: 'hog', namn: 'Hög och smal' }, // platshållare tills Björn valt
] as const;
export const krukaUtseende = (t: { id: number }) => KRUKA_UTSEENDEN[t.id % KRUKA_UTSEENDEN.length];
// det kartan ritar för krukan: bilden och växten i den (sorten och hur långt den vuxit)
export function krukaBild(t: Ting) {
  const u = krukaUtseende(t);
  return { ikon: u.id === 'rundad' ? t.k : `lerkruka_${u.id}`, ...(t.vaxt ? { vaxt: { g: t.vaxt.g, v: Math.min(1, t.vaxt.v), ...(krukaBlommar(t) ? { blommar: true } : {}) } } : {}) };
}


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
  plockMin: 2, // att plocka den mogna örten tar så här många minuter (en liten sak; steg 10.10.11) ...
  sattMin: 1, // ... och att sätta ett frö i en ledig kruka så här många
  ovning: 0.01, // odlingen växer så mycket för varje plock eller sådd
});
// blomman (steg 10.7.3): en växt i krukan med blom (GRODOR) blommar när den vuxit upp, och då är krukan ett kvalitetssteg finare pynt
export const krukaBlommar = (t: Ting) => !!t.vaxt && !!(GRODOR[t.vaxt.g as GrodaSlag] as GrodaDef).blom && t.vaxt.v >= 1;
export const krukaPyntQ = (t: Ting) => Math.min(PERFEKT, kvOf(t) + (krukaBlommar(t) ? 1 : 0));
// krukan står på en ruta (inte i någons händer, på en kälke eller i en möbel): bara där sätts och plockas något (steg 10.10.11)
const paRuta = (q: Ting) => q.hos === undefined && q.lass === undefined && q.vid === undefined && q.x !== undefined && q.y !== undefined;
// någon annan arbetar redan vid krukan
const upptagen = (s: State, p: Person, t: Ting) => living(s).some(q => q !== p && (q.task?.act === 'ortPlocka' || q.task?.act === 'ortSatta') && q.task.ref === t.id);
// p:s lediga kruka, där en växt kan sättas
const ledigKruka = (s: State, p: Person) => tingOf(s).find(q => q.agare === p.id && (q.k === 'lerkruka_liten' || q.k === 'lerkruka_mellan') && q.ler === undefined && !q.inne && !q.vaxt && !q.kok && paRuta(q) && !upptagen(s, p, q));
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
// växterna i krukorna växer med tiden sedan sist (inne året om, ute när det är varmt). Örten väntar mogen i krukan tills ägaren
// plockar den och vissnar inte; blomman blommar, vissnar ner och kommer igen
export function stepOrtKrukor(s: State, dt = 3600) {
  const temp = temperature(s), tim = dt / 3600;
  for (const t of tingOf(s)) {
    if (!t.vaxt) continue;
    const inne = t.x !== undefined && !!roomAt(s, t.x + 0.5, t.y! + 0.5);
    if (!inne && temp <= ODLING.vaxGrad) continue;
    const d = GRODOR[t.vaxt.g as GrodaSlag] as GrodaDef;
    if (d.blom) { t.vaxt.v += tim / (d.dygn * 24); if (t.vaxt.v >= 1 + d.blom / d.dygn) { t.vaxt.v = 0; count(s, 'blommaVissnar'); } continue; }
    t.vaxt.v = Math.min(1, t.vaxt.v + tim / (d.dygn * 24));
  }
}
// ---------- krukan som arbete (steg 10.10.11, Odlingen i detalj: Örtkrukan som arbete) ----------
// ägaren plockar den mogna örten (Försörjning i valet av aktivitet, bredvid mjölkningen) ...
export function ortPlockaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen) return undefined;
  return tingOf(s).find(t => t.agare === p.id && t.vaxt && !(GRODOR[t.vaxt.g as GrodaSlag] as GrodaDef).blom && t.vaxt.v >= 1 && paRuta(t) && !upptagen(s, p, t));
}
export function ortPlockaKlar(s: State, p: Person, ref?: number) {
  const t = tingOf(s).find(q => q.id === ref);
  if (!t || !t.vaxt || t.vaxt.v < 1 || !paRuta(t)) return;
  const g = t.vaxt.g as GrodaSlag;
  put(s, GRODOR[g].sak, ORTKRUKA.plock, { [p.id]: ORTKRUKA.plock });
  t.vaxt.v = ORTKRUKA.ater; count(s, 'ortKruka'); ovning(p, 'odling', ORTKRUKA.ovning);
  if (forstaGang(s, 'ortKruka')) log(s, `${p.name} plockade röllekan som växer i hens lerkruka.`, 'world', [p.id]);
}
// ... och sätter ett frö i en ledig kruka (Förbättra, bredvid staketet): den växt som väger mest av dem hen har frö till (steg 10.7.3)
export function ortSattaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !knows(p, 'odling')) return undefined;
  const t = ledigKruka(s, p), g = t && krukVal(s, p, x => getable(s, p, GRODOR[x].fro) >= 1);
  return t && g ? { t, g } : undefined;
}
export function ortSattaKlar(s: State, p: Person, ref?: number) {
  const v = ortSattaVal(s, p);
  if (!v || v.t.id !== ref) return;
  const { t, g } = v;
  takeMaterial(s, p, GRODOR[g].fro, 1);
  t.vaxt = { g, v: 0 }; count(s, g === 'blomma' ? 'blommaSatt' : 'ortSatt'); ovning(p, 'odling', ORTKRUKA.ovning);
  if (g === 'blomma' ? forstaGang(s, 'blommaSatt') : forstaGang(s, 'ortSatt')) log(s, `${p.name} satte ${g === 'blomma' ? 'en blomma' : 'en rölleka'} i en lerkruka vid huset.`, 'world', [p.id]);
}
import { GRODOR, GrodaDef, GrodaSlag, ODLING } from './odling';
import { roomAt } from './byggnad';
import { amountOf, put } from './lager';
import { getable, takeMaterial } from './behov';
import { knows } from './teknik';
