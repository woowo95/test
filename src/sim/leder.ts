// ---------- lederna (steg 11.5.1, Flera samhällen: Lederna i tal) ----------
// Varje världsruta kan ha ett slitage med en tid (vl.leder). När ett sällskap lämnar en ruta läggs dess tyngd till (en människa
// 1, ett packdjur 2, en vagn 4), och slitaget halveras på LEDTAL.halvering dygn, räknat ur tiden sedan det senast ändrades. Klassen
// är en rad i registret LEDER: obanad, stig, led och väg, med en tröskel för slitaget och en fart som delar rutans kostnad
// (vagval.ts), så att en trampad ruta är billigare och färderna drar sig till samma stråk. Klassen räknas om en gång per dygn
// (en rad i PERIODRADER): en ruta som bytt klass ger en ny kostnad, och de sparade vägarna genom den räknas om. Slitaget är
// inget som drar ur någon slump.
import { balans } from './balans';
import { DAY } from './typer';
import { Varlden, varldMark as varldMarkFor } from './varlden';
import { PERIODRADER, periodSlut } from './varldslag';
import { VarldMark } from './varldmark';
import { billigasteVag, glomVagar, packaVag, vagMellan, vagRutor } from './vagval';
import { byPlats } from './landmarken';
import { State } from './typer';
import { ageIndex, iIstiden } from './tid';

export const LEDTAL = balans('leder', {
  halvering: 20, // dygn tills slitaget är hälften (20 år i spelet, knappt tre veckor i verkligheten)
  manniska: 1, packdjur: 2, vagn: 4, // tyngden när en människa, ett packdjur eller en vagn lämnar en ruta
  glom: 0.5, // under så mycket slitage på obanad mark glöms rutan
});
export interface LedDef { namn: string; fran: number; fart: number }
// raderna i ordning: klassen är den sista vars tröskel (fran) slitaget når
export const LEDER = {
  obanad: { namn: 'Obanad mark', fran: 0, fart: 1 },
  stig: { namn: 'Stig', fran: 10, fart: 1.25 },
  led: { namn: 'Led', fran: 40, fart: 1.5 },
  vag: { namn: 'Väg', fran: 150, fart: 1.8 },
} as const satisfies Record<string, LedDef>;
export type LedId = keyof typeof LEDER;
export const LED_IDS = Object.keys(LEDER) as LedId[];

// en rutas slitage: [slitaget, när det senast ändrades, klassens nummer i LED_IDS]
export type LedSlitage = [number, number, number];
export const ledSlitageNu = (e: LedSlitage, t: number) => e[0] * Math.pow(0.5, Math.max(0, t - e[1]) / (LEDTAL.halvering * DAY));
export function klassFor(v: number): number {
  let k = 0;
  LED_IDS.forEach((id, i) => { if (v >= LEDER[id].fran) k = i; });
  return k;
}
// rutans klass (den som räknades senast) och dess fart
export const ledKlass = (vl: Varlden, i: number): LedId => LED_IDS[vl.leder?.[i]?.[2] ?? 0];
export const ledFart = (vl: Varlden, i: number) => LEDER[ledKlass(vl, i)].fart;

// ett sällskap lämnar rutorna: tyngden läggs till varje ruta (inte den sista, dit det kom)
export function trampa(vl: Varlden, rutor: number[], tyngd: number, t: number) {
  const l = vl.leder ??= {};
  for (let n = 0; n < rutor.length - 1; n++) {
    const i = rutor[n], e = l[i];
    if (e) { e[0] = ledSlitageNu(e, t) + tyngd; e[1] = t; } else l[i] = [tyngd, t, 0];
  }
}
// sällskapets tyngd: människorna, packdjuren och vagnarna
export const sallskapTyngd = (manniskor: number, packdjur = 0, vagnar = 0) => manniskor * LEDTAL.manniska + packdjur * LEDTAL.packdjur + vagnar * LEDTAL.vagn;

// en färd mellan två byars platser (raderna fran och till) trampar vägen dit till fots vid tiden t, till exempel handlaren som
// kommer (i världens kö är t händelsens tid, så att ikappräkningen trampar som det levande läget)
export function trampaFard(s: State, fran: number | undefined, till: number | undefined, tyngd: number, t = s.now) {
  const vl = s.varld, v = vl && varldMarkFor(s);
  if (!vl || !v || fran === undefined || till === undefined) return;
  const a = byPlats(vl, fran), b = byPlats(vl, till);
  if (!a || !b || a === b) return;
  const vag = vagMellan(vl, v, a.y * v.w + a.x, b.y * v.w + b.x, 'fots', t);
  if (vag) trampa(vl, vagRutor(vag, v.w), tyngd, t);
}
// klasserna räknas om vid tiden t: de rutor som bytt klass ger en ny version av kostnaderna, och vägarna genom dem räknas om
export function raknaLeder(vl: Varlden, v: VarldMark, t: number) {
  const l = vl.leder;
  if (!l) return;
  const andrade = new Set<number>();
  for (const k of Object.keys(l)) {
    const i = +k, e = l[i], nu = ledSlitageNu(e, t), kl = klassFor(nu);
    if (kl !== e[2]) { e[2] = kl; andrade.add(i); }
    if (kl === 0 && nu < LEDTAL.glom) delete l[i];
  }
  if (!andrade.size) return;
  raknaOmVagar(vl, v, t, vag => vagRutor(vag, v.w).some(i => andrade.has(i)));
}
// de sparade vägarna räknas om (de som berörs, eller alla) när kostnaderna ändrats (kodgenomgången, fynd 238)
function raknaOmVagar(vl: Varlden, v: VarldMark, t: number, berors: (vag: NonNullable<Varlden['vagar']>[number]) => boolean = () => true) {
  vl.ledVer = (vl.ledVer ?? 0) + 1;
  for (const vag of vl.vagar ?? []) {
    if (!berors(vag)) continue;
    const r = billigasteVag(vl, v, vag.fran, vag.till, vag.fs);
    if (!r) continue;
    vag.steg = packaVag(r.rutor, v.w); vag.kostnad = Math.round(r.kostnad * 1000) / 1000; vag.t = t;
  }
}
// den frusna marken (steg 11.11.8, Flera samhällen: Frusen mark): i istiden går sjö, myr och floder att korsa som slätt. När
// istiden börjar och slutar ändras kostnaderna, och alla sparade vägar räknas om
export function frysMark(s: State, vl: Varlden, v: VarldMark, t: number) {
  const fr = iIstiden(ageIndex(s, t));
  if (!!vl.frusen === fr) return;
  if (fr) vl.frusen = true; else delete vl.frusen;
  raknaOmVagar(vl, v, t);
}
PERIODRADER.push({ namn: 'frusen mark', period: 'timme', fn: (s, vl, n) => { const v = varldMarkFor(s); if (v) frysMark(s, vl, v, periodSlut(vl, 'timme', n)); } });
// marken behövs för vägarna; världslagen ger bara världen, så den packas upp här (en gång per värld, varlden.ts)
PERIODRADER.push({ namn: 'glömda vägar', period: 'dygn', fn: (_s, vl, n) => glomVagar(vl, periodSlut(vl, 'dygn', n)) }); // steg 12.1.11
PERIODRADER.push({ namn: 'lederna', period: 'dygn', fn: (s, vl, n) => { const v = varldMarkFor(s); if (v) raknaLeder(vl, v, periodSlut(vl, 'dygn', n)); } });
