// Vätskor och behållare (steg 9.4.14, Arbetsstationer och möbler: Vätskor och behållare). En vätska finns bara i en behållare:
// vattensäcken, lerkrukorna och näveraskan är ting med ett innehåll (t.inne: vilken vätska och hur mycket, i hela delar). Vätskorna
// är rader i registret VATSKOR med färgen i paletten och de behållare den passar i. Salvan och benlimmet är inga vätskor men är
// kladdiga och förvaras på samma sätt. Ett recept som ger något av dem behöver en ledig behållare som passar (tillverka.ts), och
// när det används blir den tomma behållaren kvar där den stod. Bilden: behållaren med en yta i vätskans färg (ui/foremal.ts)
import { tingOf, Ting } from './agande';
import { BYN } from './egendom';
import { krukaAv } from './kruka';
import { DAY, HOUR, MIN, Person, State } from './typer';
import { balans } from './balans';
import { KROPP, count, forstaGang, log, think } from './folk';
import { isSick } from './sjukdom';
import { hemma, salvaKrok, vattenKrok } from './halsa';

// örtteet (steg 9.5.8, Hälsosystemet i detalj: Teet och salvan): den som fryser eller är sjuk och är i byn dricker en del ur en
// kruka med te. Det värmer, och den sjuke står emot bättre en stund (SJUK.lakeort i sjukdom.ts), mer ju bättre teet är, men
// mindre än salvan på såret (9.5.10)
export const TE = balans('te', {
  varm: 0.15, // så mycket varmare blir den som fryser
  tim: 6, // så länge teet hjälper den sjuke
  verkan: [0.3, 0.4, 0.5, 0.6, 0.7, 0.9], // hur mycket av läkeörtens verkan teet har, per kvalitet (usel till ★)
});
// vill p ha örtte: sjuk, fryser eller har ett infekterat sår (steg 9.5.25), är hemma och har inte druckit nyss (steg 10.2.34: ett val, valet i val.ts)
export const villTe = (s: State, p: Person) => (p.te?.till ?? 0) <= s.now && (isSick(p, s.now) || p.warm < KROPP.fryser || (p.skador ?? []).some(w => w.inf !== undefined)) && hemma(s, p) && !!medVatska(s, 'te');
export function drickTe(s: State, p: Person) {
  const k = medVatska(s, 'te');
  if (!k) return;
  const q = k.inne!.q ?? 2;
  taVatska(s, 'te', 1);
  p.te = { till: s.now + TE.tim * HOUR, q };
  drack(s, p, 'te', VATSKOR.te.dryck);
}
// läkesalvan på såret (steg 9.5.10, halsa.ts): byns salva finns i näveraskarna och de små krukorna
salvaKrok.har = s => vatskaAv(s, 'salva');
salvaKrok.ta = s => { const k = medVatska(s, 'salva'); if (!k) return undefined; const q = k.inne!.q ?? 2; taVatska(s, 'salva', 1); return q; };
// vattnet till sköljningen av ett sår (steg 9.5.25, halsa.ts): kokt vatten först, annars vanligt vatten i en behållare; det tas
vattenKrok.ta = s => { if (vatskaAv(s, 'kokt') > 0) { taVatska(s, 'kokt', 1); return 'kokt'; } if (vatskaAv(s, 'vatten') > 0) { taVatska(s, 'vatten', 1); return 'vatten'; } return undefined; };
// hur mycket teet hjälper motståndet just nu (1 = inget)
export const teFaktor = (s: State, p: Person, lakeort: number) => (p.te?.till ?? 0) > s.now ? 1 + (lakeort - 1) * TE.verkan[p.te!.q] : 1;

// drycken (steg 9.6.9–9.6.10, 10.7.23): balanstalen för dryckerna i VATSKOR
export const DRYCK = balans('dryck', {
  slacker: 0.5, // så mycket av törsten en del saft eller mjölk släcker
  olSlacker: 0.5, vinSlacker: 0.25, // ... och en del öl och vin (steg 10.7.23)
  saftGlad: 0.03, saftTim: 4, // tanken av att dricka saft, och hur länge
  mjolkProtein: 0.15, mjolkFett: 0.1, // mjölken (steg 9.8.8) fyller protein och fett så här mycket per del
  mjolkVarde: 1.2, saftVarde: 1.1, koktVarde: 1, vattenVarde: 0.9, smak: 0.5, // hur gärna man dricker mjölk, saft och kokt vatten, och hur mycket smaken (−1 till 1) drar (steg 10.2.34)
  vinKvall: 1.1, olKvall: 1, // hur gärna man tar vin och öl på kvällen (steg 10.7.23)
});
// en dryck (steg 10.7.23, Mat, matlagning och dryck: Dryck): slacker = så stor del av törsten en del släcker (1 = all), ren =
// rent att dricka (det kokta), varm = så mycket varmare den som fryser blir, torst = hur gärna den dricks mot törsten hemma,
// kvall = hur gärna den tas på kvällen, alkohol = hur mycket rus en del ger (rus.ts), mat = näringen en del fyller, tanke = tanken
// av att dricka den och hur länge (timmar), stat = det som räknas, forsta = raden i loggen första gången ({namn} dricker)
export interface DryckDef { slacker: number; ren?: true; varm?: number; torst?: number; kvall?: number; alkohol?: number; mat?: { protein?: number; fett?: number }; tanke?: [string, number, number]; stat: string; forsta?: string }
export interface VatskaDef { namn: string; farg: number; i: string[]; haller?: number; dryck?: DryckDef } // haller = så många dygn den håller i krukan; sedan hälls den ut (saften blir sur)
export const VATSKOR = {
  vatten: { namn: 'Vatten', farg: 0x3b6ea5, i: ['vattensack', 'lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'], dryck: { slacker: 1, torst: DRYCK.vattenVarde, stat: 'krukvattenDrucket' } }, // som dryck bara i en lerkruka (dryckKarl)
  tjara: { namn: 'Tjära', farg: 0x24201d, i: ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] },
  salva: { namn: 'Salva', farg: 0x647025, i: ['naverask', 'lerkruka_liten'] },
  benlim: { namn: 'Benlim', farg: 0xbdb39b, i: ['naverask', 'lerkruka_liten'] },
  kokt: { namn: 'Kokat vatten', farg: 0x8a9c9e, i: ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'], dryck: { slacker: 1, ren: true, torst: DRYCK.koktVarde, stat: 'koktDrucket' } }, // kokat i en lerkruka (steg 9.5.25): rent, till såren och att dricka
  vin: { namn: 'Vin', farg: 0x521100, i: ['lerkruka_stor'], haller: 40, dryck: { slacker: DRYCK.vinSlacker, kvall: DRYCK.vinKvall, alkohol: 0.35, stat: 'drack_vin' } }, // vinet (steg 9.6.12, brygg.ts): i stora krukor, blir bättre med tiden
  ol: { namn: 'Öl', farg: 0x906f0f, i: ['lerkruka_stor'], haller: 6, dryck: { slacker: DRYCK.olSlacker, kvall: DRYCK.olKvall, alkohol: 0.25, stat: 'drack_ol' } }, // ölet (steg 9.6.13, brygg.ts): i stora krukor, håller sex dygn
  saft: { namn: 'Saft', farg: 0x742a01, i: ['lerkruka_mellan'], haller: 2, dryck: { slacker: DRYCK.slacker, torst: DRYCK.saftVarde, tanke: ['Drack saft', DRYCK.saftGlad, DRYCK.saftTim], stat: 'saftDrucken', forsta: '{namn} drack byns första saft av krossade bär.' } }, // bär krossade i en mellanstor kruka (steg 9.6.9): den första drycken, håller två dygn
  mjolk: { namn: 'Mjölk', farg: 0xbdb39b, i: ['lerkruka_liten', 'lerkruka_mellan'], haller: 1, dryck: { slacker: DRYCK.slacker, torst: DRYCK.mjolkVarde, mat: { protein: DRYCK.mjolkProtein, fett: DRYCK.mjolkFett }, stat: 'mjolkDrucken', forsta: '{namn} drack byns första getmjölk.' } }, // getmjölken (steg 9.8.8, boskap.ts): håller ett dygn
  black: { namn: 'Bläck', farg: 0x24201d, i: ['lerkruka_liten'] }, // sot av kol och vatten (steg 10.6.4): en liten kruka räcker till 2 blad
  te: { namn: 'Örtte', farg: 0x906f0f, i: ['lerkruka_liten'], dryck: { slacker: 0, varm: TE.varm, stat: 'teDrucket', forsta: '{namn} drack ett örtte av rölleka.' } }, // dricks av den som är sjuk eller fryser (villTe), inte mot törsten
  sno: { namn: 'Snö', farg: 0xdad0bb, i: ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] }, // snön som smälts i en kruka vid elden (steg 10.2.50, torst.ts): blir vatten // örtteet av rölleka (steg 9.5.8): kokas och står kvar i den lilla krukan
} satisfies Record<string, VatskaDef>;
export type VatskaId = keyof typeof VATSKOR;
export const ar_vatska = (k: string): k is VatskaId => k in VATSKOR;
// så mycket en behållare rymmer: krukans storlek (KRUKOR), annars en del (säcken och asken)
export const karRymmer = (t: Ting) => krukaAv(t.k)?.rymmer ?? 1;
const behallare = (t: Ting) => t.k === 'vattensack' || t.k === 'naverask' || !!krukaAv(t.k);
// en ledig behållare som passar vätskan v: tom, färdig (inte en kruka som torkar) och inte i någons hand
export const ledigFor = (s: State, v: VatskaId) => tingOf(s).filter(t => behallare(t) && !t.inne && !t.vaxt && !t.kok && t.ler === undefined && t.hos === undefined && t.lass === undefined && t.bar === undefined && (VATSKOR[v].i as string[]).includes(t.k)).sort((a, b) => karRymmer(a) - karRymmer(b) || a.id - b.id)[0];
// hur mycket av vätskan byn har, i alla behållare
// kyrkans krukor (steg 10.3.23): ingen annan dricker ur dem
const kyrkans = (t: Ting) => t.agare !== undefined && t.agare < 0;
export const vatskaAv = (s: State, v: VatskaId) => tingOf(s).reduce((n, t) => n + (t.inne?.v === v && !kyrkans(t) ? t.inne.n : 0), 0);
// den första behållaren med vätskan v
export const medVatska = (s: State, v: VatskaId) => tingOf(s).find(t => t.inne?.v === v && t.inne.n > 0 && !kyrkans(t));
// n av vätskan v hälls i en ledig behållare (fylls till det den rymmer). Ger behållaren, eller undefined om ingen fanns
export function fyllVatska(s: State, v: VatskaId, n: number, t = ledigFor(s, v)) {
  if (!t || n <= 0) return undefined;
  t.inne = { v, n: Math.min(karRymmer(t), n), t: s.now }; // t = när den gjordes (saften håller två dygn)
  if (kyrkans(t)) t.agare = BYN; // kyrkans tomma kruka som fylls igen blir byns (steg 10.3.23)
  return t;
}
// n av vätskan v tas ur behållarna; en tömd behållare blir kvar där den stod. Ger hur mycket som togs
// det som tas ur krukorna räknas som förbrukat (val.ts sätter kroken, eftersom förrådsmålen läses efter den här filen)
export const vatskaKrok = { tagen: (_s: State, _v: string, _n: number) => undefined as void };
export function taVatska(s: State, v: VatskaId, n: number) {
  vatskaKrok.tagen(s, v, n); // dryckerna följer förbrukningen (steg 10.2.12, forradsmal.ts)
  let kvar = n;
  for (const t of tingOf(s)) {
    if (kvar <= 0) break;
    if (t.inne?.v !== v || kyrkans(t)) continue;
    const d = Math.min(kvar, t.inne.n);
    t.inne.n -= d; kvar -= d;
    if (t.inne.n <= 0) t.inne = undefined;
  }
  return n - kvar;
}

// en gång i timmen (steg.ts): en vätska som har en hållbarhet (saften) och är äldre än den hälls ut, och krukan blir tom
export function vatskorTimme(s: State) {
  for (const t of tingOf(s)) {
    if (t.inne?.v === 'sno') { if (snoSmalt(s, t)) count(s, 'snoSmalt'); continue; } // en snökruka som blivit stående vid elden (steg 10.2.50)
    const v = t.inne?.v, h = v ? (VATSKOR[v] as VatskaDef).haller : undefined;
    if (h === undefined || t.inne!.t === undefined || s.now - t.inne!.t < h * DAY) continue;
    count(s, v === 'saft' ? 'saftSur' : 'vatskaUthalld', t.inne!.n); t.inne = undefined;
  }
}
// drycken hemma (steg 10.2.34, 10.7.23): den som valt att dricka (handlingen dryck, torst.ts och val.ts) dricker det hen helst vill
// ha av det byn har (dryckFor), eller drycken k hen valt. Allt drycken gör står i dess rad i VATSKOR: törsten, värmen, näringen,
// ruset och tanken
export const DRYCKER = (Object.keys(VATSKOR) as VatskaId[]).filter(k => (VATSKOR[k] as VatskaDef).dryck);
export const dryckAv = (v: string) => (VATSKOR[v as VatskaId] as VatskaDef | undefined)?.dryck;
// krukan att dricka ur: vattnet bara ur en lerkruka (vattnet i säckarna bärs till fälten och till den som inte kan gå, torst.ts)
const dryckKarl = (s: State, v: VatskaId) => v === 'vatten' ? vattenKruka(s) : medVatska(s, v);
export function drickHemma(s: State, p: Person, k?: string) {
  const v = (k ?? dryckFor(s, p)) as VatskaId | undefined, d = v && dryckAv(v);
  if (!v || !d) return;
  if (v === 'te') return drickTe(s, p); // teet hjälper också den sjuke (TE)
  if (d.alkohol) { if (drickAlkohol(s, p, v)) p.torst = Math.min(1, p.torst + d.slacker); return; }
  const t = dryckKarl(s, v);
  if (!t?.inne) return;
  if (v === 'vatten') { t.inne.n -= 1; if (t.inne.n <= 0) t.inne = undefined; } else taVatska(s, v, 1);
  drack(s, p, v, d);
}
// det en del av drycken gör med den som dricker
function drack(s: State, p: Person, v: VatskaId, d: DryckDef) {
  p.torst = Math.min(1, p.torst + d.slacker);
  if (d.varm && p.warm < KROPP.fryser) p.warm = Math.min(1, p.warm + d.varm);
  if (d.mat) { const n = naringOf(p); n.protein = Math.min(1, n.protein + (d.mat.protein ?? 0)); n.fett = Math.min(1, n.fett + (d.mat.fett ?? 0)); p.hunger = mattnad(n); }
  if (d.tanke) think(p, d.tanke[0], d.tanke[1], s.now, d.tanke[2] * HOUR);
  count(s, d.stat);
  if (d.forsta && forstaGang(s, v + 'Forsta')) log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]);
}
// den dryck p helst vill ha mot törsten av det byn har: värdet i raden och smaken (smakOf) avgör, aldrig radernas ordning
export function dryckFor(s: State, p: Person): string | undefined {
  let bast: string | undefined, bv = -Infinity;
  for (const k of DRYCKER) {
    const t = dryckAv(k)!.torst;
    if (t === undefined || !dryckKarl(s, k)) continue;
    const v = t + DRYCK.smak * (p.smak?.['m:' + k] ?? 0);
    if (v > bv || v === bv && bast !== undefined && k < bast) { bv = v; bast = k; }
  }
  return bast;
}
// den dryck med alkohol p helst tar på kvällen (rus.ts): kvällens värde och smaken
export function kvallsVal(s: State, p: Person): VatskaId | undefined {
  let bast: VatskaId | undefined, bv = -Infinity;
  for (const k of DRYCKER) {
    const d = dryckAv(k)!;
    if (d.kvall === undefined || !d.alkohol || !medVatska(s, k)) continue;
    const v = d.kvall + DRYCK.smak * (p.smak?.['m:' + k] ?? 0);
    if (v > bv || v === bv && bast !== undefined && k < bast) { bv = v; bast = k; }
  }
  return bast;
}
// vattnet i en lerkruka (av snön, steg 10.2.50); vattnet i säckarna bärs till fälten och till den som inte kan gå (torst.ts)
const vattenKruka = (s: State) => tingOf(s).find(t => t.inne?.v === 'vatten' && t.inne.n > 0 && !!krukaAv(t.k));
torstDryck.finns = s => DRYCKER.some(k => dryckAv(k)!.torst !== undefined && !!dryckKarl(s, k));
torstDryck.drick = (s, p, k) => drickHemma(s, p, k);
// snön smälts i en lerkruka vid elden (steg 10.2.50): framme fylls en ledig kruka med snö och ställs vid elden. När snön stått
// där så länge det tar att smälta den (TORST.snoMin, medan en eld brinner) är den vatten. Den som väntat vid krukan dricker,
// och resten av vattnet blir kvar i krukan
torstDryck.snoKruka = s => !!ledigFor(s, 'sno');
torstDryck.snoIn = (s, p) => { const t = ledigFor(s, 'sno'); if (!t) return undefined; t.inne = { v: 'sno', n: karRymmer(t), t: s.now }; if (forstaGang(s, 'snoKruka')) log(s, `${p.name} fyllde en lerkruka med snö och ställde den vid elden.`, 'world', [p.id]); return t.id; };
torstDryck.snoDrick = (s, id) => { const t = tingOf(s).find(q => q.id === id); if (!t?.inne || t.inne.v !== 'sno' && t.inne.v !== 'vatten') return false; t.inne = { v: 'vatten', n: t.inne.n, t: s.now }; t.inne.n -= 1; if (t.inne.n <= 0) t.inne = undefined; return true; };
// snön i krukan t har smält: den har stått vid en eld som brinner så länge det tar (räknas vid den tiden, en gång i timmen)
function snoSmalt(s: State, t: Ting) {
  if (t.inne?.v !== 'sno' || t.inne.t === undefined || !nagonEld(s) || s.now - t.inne.t < TORST.snoMin * MIN) return false;
  t.inne = { v: 'vatten', n: t.inne.n, t: s.now };
  return true;
}
import { TORST, dryckKrok as torstDryck } from './torst';
import { nagonEld } from './eld';
import { mattnad, naringOf } from './naring';
// vinet och ölet för berusningen (rus.ts, steg 9.6.14)
alkoholKrok.finns = (s, v) => !!medVatska(s, v);
alkoholKrok.ta = (s, v) => taVatska(s, v, 1) > 0;
alkoholKrok.alkohol = v => dryckAv(v)?.alkohol ?? 0;
alkoholKrok.namn = v => VATSKOR[v].namn;
alkoholKrok.drycker = () => DRYCKER.filter(k => dryckAv(k)!.alkohol);
alkoholKrok.kvall = kvallsVal;
import { alkoholKrok, drickAlkohol } from './rus';
