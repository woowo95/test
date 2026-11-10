// Vätskor och behållare (steg 9.4.14, Arbetsstationer och möbler: Vätskor och behållare). En vätska finns bara i en behållare:
// vattensäcken, lerkrukorna och näveraskan är ting med ett innehåll (t.inne: vilken vätska och hur mycket, i hela delar). Vätskorna
// är rader i registret VATSKOR med färgen i paletten och de behållare den passar i. Salvan och benlimmet är inga vätskor men är
// kladdiga och förvaras på samma sätt. Ett recept som ger något av dem behöver en ledig behållare som passar (tillverka.ts), och
// när det används blir den tomma behållaren kvar där den stod. Bilden: behållaren med en yta i vätskans färg (ui/foremal.ts)
import { tingOf, Ting } from './agande';
import { krukaAv } from './kruka';
import { DAY, HOUR, Person, State } from './typer';
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
export function drickTe(s: State, p: Person) {
  if ((p.te?.till ?? 0) > s.now || !(isSick(p, s.now) || p.warm < KROPP.fryser || (p.skador ?? []).some(w => w.inf !== undefined)) || !hemma(s, p)) return; // också den med ett infekterat sår (steg 9.5.25)
  const k = medVatska(s, 'te');
  if (!k) return;
  const q = k.inne!.q ?? 2;
  taVatska(s, 'te', 1);
  p.te = { till: s.now + TE.tim * HOUR, q };
  if (p.warm < KROPP.fryser) p.warm = Math.min(1, p.warm + TE.varm);
  count(s, 'teDrucket');
  if (forstaGang(s, 'teForsta')) log(s, `${p.name} drack ett örtte av rölleka.`, 'world', [p.id]);
}
// läkesalvan på såret (steg 9.5.10, halsa.ts): byns salva finns i näveraskarna och de små krukorna
salvaKrok.har = s => vatskaAv(s, 'salva');
salvaKrok.ta = s => { const k = medVatska(s, 'salva'); if (!k) return undefined; const q = k.inne!.q ?? 2; taVatska(s, 'salva', 1); return q; };
// vattnet till sköljningen av ett sår (steg 9.5.25, halsa.ts): kokt vatten först, annars vanligt vatten i en behållare; det tas
vattenKrok.ta = s => { if (vatskaAv(s, 'kokt') > 0) { taVatska(s, 'kokt', 1); return 'kokt'; } if (vatskaAv(s, 'vatten') > 0) { taVatska(s, 'vatten', 1); return 'vatten'; } return undefined; };
// hur mycket teet hjälper motståndet just nu (1 = inget)
export const teFaktor = (s: State, p: Person, lakeort: number) => (p.te?.till ?? 0) > s.now ? 1 + (lakeort - 1) * TE.verkan[p.te!.q] : 1;

export interface VatskaDef { namn: string; farg: number; i: string[]; haller?: number } // haller = så många dygn den håller i krukan; sedan hälls den ut (saften blir sur)
export const VATSKOR = {
  vatten: { namn: 'Vatten', farg: 0x3b6ea5, i: ['vattensack', 'lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] },
  tjara: { namn: 'Tjära', farg: 0x24201d, i: ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] },
  salva: { namn: 'Salva', farg: 0x647025, i: ['naverask', 'lerkruka_liten'] },
  benlim: { namn: 'Benlim', farg: 0xbdb39b, i: ['naverask', 'lerkruka_liten'] },
  kokt: { namn: 'Kokat vatten', farg: 0x8a9c9e, i: ['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'] }, // kokat i en lerkruka (steg 9.5.25): rent, till såren och att dricka
  vin: { namn: 'Vin', farg: 0x521100, i: ['lerkruka_stor'], haller: 40 }, // vinet (steg 9.6.12, brygg.ts): i stora krukor, blir bättre med tiden
  ol: { namn: 'Öl', farg: 0x906f0f, i: ['lerkruka_stor'], haller: 6 }, // ölet (steg 9.6.13, brygg.ts): i stora krukor, håller sex dygn
  saft: { namn: 'Saft', farg: 0x742a01, i: ['lerkruka_mellan'], haller: 2 }, // bär krossade i en mellanstor kruka (steg 9.6.9): den första drycken, håller två dygn
  te: { namn: 'Örtte', farg: 0x906f0f, i: ['lerkruka_liten'] }, // örtteet av rölleka (steg 9.5.8): kokas och står kvar i den lilla krukan
} satisfies Record<string, VatskaDef>;
export type VatskaId = keyof typeof VATSKOR;
export const ar_vatska = (k: string): k is VatskaId => k in VATSKOR;
// så mycket en behållare rymmer: krukans storlek (KRUKOR), annars en del (säcken och asken)
export const karRymmer = (t: Ting) => krukaAv(t.k)?.rymmer ?? 1;
const behallare = (t: Ting) => t.k === 'vattensack' || t.k === 'naverask' || !!krukaAv(t.k);
// en ledig behållare som passar vätskan v: tom, färdig (inte en kruka som torkar) och inte i någons hand
export const ledigFor = (s: State, v: VatskaId) => tingOf(s).filter(t => behallare(t) && !t.inne && t.ler === undefined && t.hos === undefined && t.lass === undefined && t.bar === undefined && (VATSKOR[v].i as string[]).includes(t.k)).sort((a, b) => karRymmer(a) - karRymmer(b) || a.id - b.id)[0];
// hur mycket av vätskan byn har, i alla behållare
export const vatskaAv = (s: State, v: VatskaId) => tingOf(s).reduce((n, t) => n + (t.inne?.v === v ? t.inne.n : 0), 0);
// den första behållaren med vätskan v
export const medVatska = (s: State, v: VatskaId) => tingOf(s).find(t => t.inne?.v === v && t.inne.n > 0);
// n av vätskan v hälls i en ledig behållare (fylls till det den rymmer). Ger behållaren, eller undefined om ingen fanns
export function fyllVatska(s: State, v: VatskaId, n: number, t = ledigFor(s, v)) {
  if (!t || n <= 0) return undefined;
  t.inne = { v, n: Math.min(karRymmer(t), n), t: s.now }; // t = när den gjordes (saften håller två dygn)
  return t;
}
// n av vätskan v tas ur behållarna; en tömd behållare blir kvar där den stod. Ger hur mycket som togs
export function taVatska(s: State, v: VatskaId, n: number) {
  let kvar = n;
  for (const t of tingOf(s)) {
    if (kvar <= 0) break;
    if (t.inne?.v !== v) continue;
    const d = Math.min(kvar, t.inne.n);
    t.inne.n -= d; kvar -= d;
    if (t.inne.n <= 0) t.inne = undefined;
  }
  return n - kvar;
}

// en gång i timmen (steg.ts): en vätska som har en hållbarhet (saften) och är äldre än den hälls ut, och krukan blir tom
export function vatskorTimme(s: State) {
  for (const t of tingOf(s)) {
    const v = t.inne?.v, h = v ? (VATSKOR[v] as VatskaDef).haller : undefined;
    if (h === undefined || t.inne!.t === undefined || s.now - t.inne!.t < h * DAY) continue;
    count(s, v === 'saft' ? 'saftSur' : 'vatskaUthalld', t.inne!.n); t.inne = undefined;
  }
}
// drycken (steg 9.6.9–9.6.10): den törstige som är hemma dricker saft när det finns, annars kokat vatten, och den släcker törsten och ger lite glädje
export const DRYCK = balans('dryck', {
  slacker: 0.5, // så mycket av törsten en del saft släcker
  saftGlad: 0.03, saftTim: 4, // tanken av att dricka saft, och hur länge
});
export function drickDryck(s: State, p: Person) {
  if (!torstig(p, 0) || !hemma(s, p)) return;
  // det kokade vattnet (steg 9.6.10): rent, så att den som dricker det inte får ont i magen av smutsigt vatten
  if (!medVatska(s, 'saft')) { if (medVatska(s, 'kokt')) { taVatska(s, 'kokt', 1); p.torst = 1; count(s, 'koktDrucket'); } return; }
  taVatska(s, 'saft', 1);
  p.torst = Math.min(1, p.torst + DRYCK.slacker);
  think(p, 'Drack saft', DRYCK.saftGlad, s.now, DRYCK.saftTim * HOUR);
  count(s, 'saftDrucken');
  if (forstaGang(s, 'saftForsta')) log(s, `${p.name} drack byns första saft av krossade bär.`, 'world', [p.id]);
}
import { torstig } from './torst';
// vinet och ölet för berusningen (rus.ts, steg 9.6.14)
alkoholKrok.finns = (s, v) => !!medVatska(s, v);
alkoholKrok.ta = (s, v) => taVatska(s, v, 1) > 0;
import { alkoholKrok } from './rus';
