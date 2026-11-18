// ---------- byggda platser på leden (steg 11.9.5, Flera samhällen: Världen i tal, landmärkena och Lederna) ----------
// Bron, spången och den röjda passagen är vanliga projekt för en by i världen. En gång om dygnet (ett år i spelet) ser varje by
// över lederna nära sig, där den är den närmaste byn: på en ruta där en plats av sorten får ligga räknas vad den sparar för dem
// som går där (rutans kostnad före och efter, gånger hur många som går där per dygn ur ledens slitage) över en tid framåt, i
// det arbete de annars gjort hemma. Är det värt mer än materialet och dagsverkena, och har byn materialet, betalar den och
// bygger; platsen kommer när dagsverkena är gjorda. Platsen ändrar kostnaden på sin ruta (rutKostnad i landmarken.ts), och
// vägarna nära den räknas om.
import { balans } from './balans';
import { count } from './folk';
import { byPlats, hinder, LandmarkId, LANDMARKEN, laggPlats, rutKostnad } from './landmarken';
import { LEDTAL, ledFart, ledSlitageNu } from './leder';
import { radHar, radRikedomUr, radVaror, VarugruppId } from './priser';
import { lever } from './rad';
import { radNr, VarldRad } from './radtal';
import { UTPOST } from './utpost';
import { varldHandelse } from './varldkronika';
import { KOHANDELSER, PERIODRADER, laggIKo, periodSlut, varldSlump } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { MARK_IDS, VARLD, VarldMark } from './varldmark';
import { billigasteVag, packaVag, vagRutor } from './vagval';
import { DAY, State } from './typer';

// det en plats kostar: materialet i grundvärde per varugrupp (hela saker) och dagsverkena (en person ett dygn)
export interface PlatsBygge { varor: Partial<Record<VarugruppId, number>>; dagsverken: number }
export const PLATSBYGGE = {
  bro: { varor: { virke: 20, sten: 10 }, dagsverken: 10 },
  spang: { varor: { virke: 8 }, dagsverken: 4 },
  passage: { varor: {}, dagsverken: 6 },
} as const satisfies Partial<Record<LandmarkId, PlatsBygge>>;
export type PlatsByggeId = keyof typeof PLATSBYGGE;
export const PLATSBYGGE_IDS = Object.keys(PLATSBYGGE) as PlatsByggeId[];
export const PLATSTAL = balans('platsbygge', {
  rutor: 6, // lederna så här många världsrutor från byn eller närmare
  horisont: 40, // så många dygn (år i spelet) framåt räknar byn med det platsen sparar
  folk: 4, // så många arbetar på platsen samtidigt: dagsverkena delat med dem är dygnen det tar
  chans: 0.3, // chansen per dygn att en by ser över sina leder
  minFolk: 8, // byn har minst så många
});
const A = { se: 51 };

// det byn sparar på en ruta med en plats av sorten k, i grundvärde under horisonten (0 om inget)
export function platsVinst(vl: Varlden, v: VarldMark, i: number, k: PlatsByggeId, t: number): number {
  const e = vl.leder?.[i];
  if (!e) return 0;
  const fore = rutKostnad(vl, v, i, 'fots'), efter = rutKostnad(vl, v, i, 'fots', k);
  if (!isFinite(fore) || !(fore > efter)) return 0;
  const perDygn = ledSlitageNu(e, t) * Math.LN2 / LEDTAL.halvering / LEDTAL.manniska; // de som går där per dygn
  const sparat = (fore - efter) / ledFart(vl, i) / VARLD.gangPerDygn; // dygn per person
  return perDygn * sparat * UTPOST.arbete * PLATSTAL.horisont;
}
// det platsen kostar byn, i grundvärde
export const platsKostnad = (k: PlatsByggeId) => Object.values(PLATSBYGGE[k].varor as Partial<Record<VarugruppId, number>>).reduce((a: number, n) => a + (n ?? 0), 0) + PLATSBYGGE[k].dagsverken * UTPOST.arbete;
const harRad = (r: VarldRad, k: PlatsByggeId) => Object.entries(PLATSBYGGE[k].varor as Partial<Record<VarugruppId, number>>).every(([g, n]) => radHar(r, g as VarugruppId) >= (n ?? 0));
// den närmaste levande byn till rutan (Chebyshev), eller undefined
function narmasteBy(vl: Varlden, x: number, y: number): VarldRad | undefined {
  let b: VarldRad | undefined, bd = Infinity;
  for (const p of vl.platser ?? []) {
    if (p.by === undefined) continue;
    const r = radNr(vl, p.by);
    if (!r || (r.nr !== vl.huvud && (r.sort !== 'by' || !lever(vl, r)))) continue;
    const d = Math.max(Math.abs(p.x - x), Math.abs(p.y - y));
    if (d < bd) { bd = d; b = r; }
  }
  return b;
}
// det bästa bygget för byn r: rutan, sorten och vinsten utöver kostnaden
export function bastaBygge(vl: Varlden, v: VarldMark, r: VarldRad, t: number): { i: number; k: PlatsByggeId; netto: number } | undefined {
  const hem = byPlats(vl, r.nr);
  if (!hem || !vl.leder) return undefined;
  let bast: { i: number; k: PlatsByggeId; netto: number } | undefined;
  for (const nyckel of Object.keys(vl.leder)) {
    const i = +nyckel, x = i % v.w, y = Math.floor(i / v.w);
    if (Math.max(Math.abs(x - hem.x), Math.abs(y - hem.y)) > PLATSTAL.rutor) continue;
    const m = MARK_IDS[v.mark[i]];
    for (const k of PLATSBYGGE_IDS) {
      if (!(LANDMARKEN[k].mark as readonly string[]).includes(m) || hinder(vl, v, k, x, y)) continue;
      const netto = platsVinst(vl, v, i, k, t) - platsKostnad(k);
      if (netto > 0 && (!bast || netto > bast.netto) && narmasteBy(vl, x, y) === r) bast = { i, k, netto };
    }
  }
  return bast;
}
// byn r betalar och börjar bygga; platsen kommer när dagsverkena är gjorda
export function byggPlats(s: State, vl: Varlden, r: VarldRad, i: number, k: PlatsByggeId, t: number) {
  const vr = radVaror(r);
  for (const [g, n] of Object.entries(PLATSBYGGE[k].varor as Partial<Record<VarugruppId, number>>)) vr[g] = (vr[g] ?? 0) - (n ?? 0);
  r.tal.mat = Math.max(0, r.tal.mat - Math.round(PLATSBYGGE[k].dagsverken * UTPOST.arbete)); // det de annars samlat hemma
  r.tal.rikedom = radRikedomUr(r);
  laggIKo(vl, t + Math.ceil(PLATSBYGGE[k].dagsverken / PLATSTAL.folk) * DAY, 'platsKlar', { sak: r.nr, data: { i, k: PLATSBYGGE_IDS.indexOf(k) } });
  count(s, 'platsbygge_borjat');
}
// en gång om dygnet: byarna ser över sina leder
export function platsBygge(s: State, vl: Varlden, n: number) {
  const v = varldMark(s);
  if (!v || !vl.leder) return;
  const t = periodSlut(vl, 'dygn', n);
  for (const r of vl.rader ?? []) {
    if (r.sort !== 'by' || !lever(vl, r) || r.tal.folk < PLATSTAL.minFolk) continue;
    if (varldSlump(vl, r.nr, n, A.se) >= PLATSTAL.chans) continue;
    const b = bastaBygge(vl, v, r, t);
    if (b && harRad(r, b.k)) byggPlats(s, vl, r, b.i, b.k, t);
  }
}
// vägarna som går nära rutan i räknas om (de kan nu gå över platsen)
export function vagarOm(vl: Varlden, v: VarldMark, i: number, t: number, n = 3) {
  const x = i % v.w, y = Math.floor(i / v.w);
  for (const vag of vl.vagar ?? []) {
    if (!vagRutor(vag, v.w).some(j => Math.max(Math.abs(j % v.w - x), Math.abs(Math.floor(j / v.w) - y)) <= n)) continue;
    const r = billigasteVag(vl, v, vag.fran, vag.till, vag.fs);
    if (!r) continue;
    vag.steg = packaVag(r.rutor, v.w); vag.kostnad = Math.round(r.kostnad * 1000) / 1000; vag.t = t;
  }
}
KOHANDELSER.platsKlar = (s, vl, p) => {
  const v = varldMark(s), r = radNr(vl, p.sak!), k = PLATSBYGGE_IDS[p.data!.k], i = p.data!.i;
  if (!v || !k) return;
  const q = laggPlats(vl, v, k, i % v.w, Math.floor(i / v.w), p.t); // utan by: platsens by är byns egen plats (byPlats)
  if (!q) return; // någon annan plats hann dit
  vl.ledVer = (vl.ledVer ?? 0) + 1;
  vagarOm(vl, v, i, p.t);
  varldHandelse(vl, 'platsbygge', p.t, { by: r?.nr, plats: q.nr });
  count(s, 'platsbygge_' + k);
};
PERIODRADER.push({ namn: 'byggda platser på leden', period: 'dygn', fn: (s, vl, n) => platsBygge(s, vl, n) });
