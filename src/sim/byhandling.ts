// ---------- det en by gör mot en annan (steg 11.6.5, Flera samhällen: Relationen och läget mellan två byar) ----------
// Registret BYHANDLINGAR: varje rad är något en by kan göra mot en by i sitt grannät, med en poäng och det som händer. En gång
// om dygnet (ett år i spelet; raden 'byarnas handlingar' i PERIODRADER) väljer varje by i världen som har en ledare den
// handling och den granne som ger högst poäng, och gör den om poängen är över noll. Poängen vägs av ledarens personlighet
// (egenskaperna ur nyckeln, radperson.ts) och av trons skalor (hur krigisk byns tro är), och ett litet slumptal ur världens frö
// gör att samma by inte alltid väljer samma sak. Relationen (byrel.ts) är det som ändras; BYHANDELSER säger hur mycket.
// Fler rader kommer med sina steg: handelsfärden (11.6.6), gåvan (11.6.14), mutan (11.6.15), anfallen (11.6.16), kriget
// (11.6.22) och sändebudet (11.6.23). Huvudbyn väljer ur samma register när handlingen kan bli en resa med verkliga bybor.
import { balans } from './balans';
import { byHandelse, relation } from './byrel';
import { count } from './folk';
import { varldPlatsNr } from './landmarken';
import { lever } from './rad';
import { fastEgenskaper, radLedare } from './radperson';
import { BYSORTER, radNr, VarldRad } from './radtal';
import { clamp } from './slump';
import { PERIODRADER, varldSlump } from './varldslag';
import { SAKER, isFood, viktOf } from './saker';
import { grundvarde } from './varde';
import { Varlden } from './varlden';
import { DAY, Stat, State } from './typer';
import { gruppAv, radGruppPaslag, radHar, radRikedomUr, radTar, radVaror, radVill, VARUGRUPP_IDS, VarugruppId } from './priser';
import { rikMal } from './rad';
import { KOHANDELSER, laggIKo, periodSlut } from './varldslag';
import { byPlats } from './landmarken';
import { trampaFard, sallskapTyngd } from './leder';
import { vagRutor } from './vagval';
import { HANDEL, HANDLARSORTER, HANDLARVAROR, HANDLAR_UTR, HVara, HandlarLast, handlarFram, handlarKrok, kgOf } from './handel';

export const BYHANDLING = balans('byhandling', {
  slump: 0.1, // så mycket kan slumpen flytta en poäng åt varje håll
  fjaskMal: 30, // fjäsket lönar sig tills relationen nått hit
  fjaskKostnad: 0.1, // det fjäsket kostar i poäng (tid, ära)
  radsla: 2, // högst så mycket väger att grannen är starkare (styrkan delad med den egna)
  // handelsfärden (steg 11.6.6)
  last: 80, // så mycket (i grundvärde) bär en handelsfärd (ställt i steg 11.6.7 med npm run radhandel)
  barare: 2, // så många går med en handelsfärd
  dygnKostnad: 0.3, // det en bärare kostar per dygn på vägen, i grundvärde (maten och arbetet hemma)
  portion: 0.5, // en portion mat i grundvärde
  minRel: -10, // byarna handlar inte med den de ser lägre på än så
  skala: 20, // en vinst på så mycket (i grundvärde) är en poäng
});

// det poängen räknas ur: byn som gör (r), grannen (mot), hur r ser på mot, ledarens egenskaper (1–20) och trons krigiskhet (0–1)
export interface ByCtx { s: State; vl: Varlden; r: VarldRad; mot: VarldRad; rel: number; led?: Record<Stat, number>; krig: number; t: number } // t: när handlingen görs
export interface ByHandlingDef { namn: string; poang: (c: ByCtx) => number; gor: (c: ByCtx) => void }
// en egenskap hos ledaren från 0 till 1 (en by utan känd ledare är mitt emellan)
export const ledDrag = (c: ByCtx, k: Stat) => ((c.led?.[k] ?? 10.5) - 1) / 19;
// hur mycket starkare grannen är, mellan 1/radsla och radsla
const radsla = (c: ByCtx) => clamp((c.mot.tal.styrka + 1) / (c.r.tal.styrka + 1), 1 / BYHANDLING.radsla, BYHANDLING.radsla);

export const BYHANDLINGAR = {
  // fjäsket: vänliga ord till en granne man vill stå väl med, mest mot en starkare granne och av en ledare med karisma; en
  // krigisk tro fjäskar mindre
  fjask: {
    namn: 'Fjäsk',
    poang: c => Math.max(0, BYHANDLING.fjaskMal - c.rel) / 100 * (0.5 + ledDrag(c, 'karisma')) * radsla(c) * (1 - c.krig / 2) - BYHANDLING.fjaskKostnad,
    gor: c => byHandelse(c.vl, 'fjask', c.r.nr, c.mot.nr),
  },
  // handelsfärden (steg 11.6.6): byn säljer det den har överflöd av där det är dyrast, när vinsten är större än resans kostnad
  handel: {
    namn: 'Handelsfärd',
    poang: c => { const a = fardAffar(c); return a ? a.vinst / BYHANDLING.skala : -1; },
    gor: c => { const a = fardAffar(c); if (a) skickaFard(c, a); },
  },
} as const satisfies Record<string, ByHandlingDef>;
export type ByHandlingId = keyof typeof BYHANDLINGAR;
export const BYHANDLING_IDS = Object.keys(BYHANDLINGAR) as ByHandlingId[];
const DEF: Record<ByHandlingId, ByHandlingDef> = BYHANDLINGAR;

// grannarna till byn r som lever och är byar (huvudbyn är med)
export function radGrannar(vl: Varlden, r: VarldRad): VarldRad[] {
  const p = (vl.platser ?? []).find(q => q.by === r.nr);
  const ut: VarldRad[] = [];
  for (const g of p?.grannar ?? []) {
    const q = varldPlatsNr(vl, g.nr), m = q?.by !== undefined ? radNr(vl, q.by) : undefined;
    if (m && m.nr !== r.nr && BYSORTER[m.sort].folk && (m.nr === vl.huvud || lever(vl, m))) ut.push(m);
  }
  return ut;
}
export const byCtx = (s: State, vl: Varlden, r: VarldRad, mot: VarldRad, t = s.now): ByCtx => {
  const l = radLedare(r);
  return { s, vl, r, mot, rel: relation(vl, r.nr, mot.nr) ?? 0, led: l ? fastEgenskaper(l) : undefined, krig: (r.tro?.krig ?? 50) / 100, t };
};
// det byn r väljer i perioden n: handlingen och grannen med högst poäng (med slumpens lilla del), eller inget
export function byVal(s: State, vl: Varlden, r: VarldRad, n: number): { id: ByHandlingId; c: ByCtx; poang: number } | undefined {
  let bast: { id: ByHandlingId; c: ByCtx; poang: number } | undefined;
  const gr = radGrannar(vl, r), t = periodSlut(vl, 'dygn', n);
  for (let i = 0; i < gr.length; i++) {
    const c = byCtx(s, vl, r, gr[i], t);
    BYHANDLING_IDS.forEach((id, j) => {
      const p = DEF[id].poang(c) + (varldSlump(vl, r.nr, n, 0x4248 + i * 64 + j) - 0.5) * 2 * BYHANDLING.slump;
      if (p > 0 && (!bast || p > bast.poang)) bast = { id, c, poang: p };
    });
  }
  return bast;
}
// en gång om dygnet: varje by i världen med en ledare gör det den valt
export function byarnasHandlingar(s: State, vl: Varlden, n: number) {
  for (const r of [...vl.rader ?? []]) {
    if (!lever(vl, r) || !BYSORTER[r.sort].ledare) continue;
    const v = byVal(s, vl, r, n);
    if (!v) continue;
    DEF[v.id].gor(v.c);
    count(s, 'byhandling_' + v.id);
  }
}
// ---------- handelsfärden mellan två byar (steg 11.6.6, Flera samhällen: Priset och handeln mellan byar) ----------
// En by med överflöd i en varugrupp (mer än den vill ha) letar i sitt grannät efter den by där gruppen är dyrast jämfört med
// hemma, när resans kostnad (bärarna, dit och hem) är dragen, och skickar en handelsfärd om relationen tillåter åt båda håll.
// Lasten (hela grundvärden, maten i portioner) lämnar byn när färden går och läggs i mottagarens förråd när den kommer fram;
// mottagaren betalar med silver och, när silvret inte räcker, med det den själv har mest överflöd av. Betalningen bärs hem och
// läggs i byns förråd när färden kommer hem. Färden trampar vägen åt båda håll och syns på världskartan. Huvudbyn som mål kommer
// med handlaren (11.6.8).
export interface RadFard { id: number; fran: number; till: number; g: VarugruppId; n: number; t0: number; t1: number; t2?: number; silver?: number; h?: VarugruppId; hn?: number; handlare?: true; last?: HandlarLast; hem?: HVara[] } // last: handlarens varor och silver på väg till huvudbyn; hem: det hen bär hem (steg 11.6.9) // handlare: färden är en handlare som går till huvudbyn (steg 11.6.8)
const enhet = (g: VarugruppId) => g === 'mat' ? BYHANDLING.portion : 1; // en enhet i gruppens tillgång, i grundvärde
const overskott = (r: VarldRad, g: VarugruppId) => Math.floor(radHar(r, g) - radVill(r, g, rikMal(r)));
const restid = (vl: Varlden, r: VarldRad, mot: VarldRad) => {
  const p = byPlats(vl, r.nr), q = byPlats(vl, mot.nr);
  return p?.grannar?.find(g => g.nr === q?.nr)?.dygn;
};
// det mottagaren kan betala med utom gruppen g: silvret och det den har mest överflöd av, i grundvärde
function betalning(s: State, mot: VarldRad, g: VarugruppId): { silver: number; h?: VarugruppId; hVarde: number } {
  let h: VarugruppId | undefined, hVarde = 0;
  for (const k of VARUGRUPP_IDS) {
    if (k === g) continue;
    const v = overskott(mot, k) * enhet(k) / radGruppPaslag(s, mot, k);
    if (v > hVarde) { h = k; hVarde = v; }
  }
  return { silver: mot.tal.silver, h, hVarde: Math.floor(hVarde) };
}
export interface FardAffar { g: VarugruppId; n: number; dygn: number; vinst: number }
// den bästa affären för byn c.r hos grannen c.mot: gruppen, lasten i enheter och vinsten i grundvärde efter resans kostnad
export function fardAffar(c: ByCtx): FardAffar | undefined {
  const { s, vl, r, mot } = c;
  if (c.rel < BYHANDLING.minRel || (relation(vl, mot.nr, r.nr) ?? 0) < BYHANDLING.minRel) return undefined;
  const huvud = mot.nr === vl.huvud;
  if (huvud && (!r.syn || handlarUte(s, r.nr))) return undefined; // byns handlare är redan på väg till huvudbyn eller där
  if (r.tal.folk < BYHANDLING.barare * 2) return undefined;
  const dygn = restid(vl, r, mot);
  if (dygn === undefined) return undefined;
  const kostnad = 2 * dygn * BYHANDLING.barare * BYHANDLING.dygnKostnad;
  let bast: FardAffar | undefined;
  for (const g of VARUGRUPP_IDS) {
    const ov = overskott(r, g);
    if (ov <= 0) continue;
    const hemma = radGruppPaslag(s, r, g), dar = radGruppPaslag(s, mot, g);
    if (dar <= hemma) continue;
    const b = huvud ? undefined : betalning(s, mot, g), kan = b ? (b.silver + b.hVarde) / dar : BYHANDLING.last; // så mycket grundvärde mottagaren kan köpa (huvudbyn betalar med det den har)
    const n = Math.floor(Math.min(ov, BYHANDLING.last / enhet(g), kan / enhet(g)));
    if (n <= 0) continue;
    const vinst = n * enhet(g) * (dar - hemma) - kostnad;
    if (!bast || vinst > bast.vinst) bast = { g, n, dygn, vinst };
  }
  return bast;
}
// lasten tas ur byns förråd och färden ger sig av
const taUr = (r: VarldRad, g: VarugruppId, n: number) => {
  if (g === 'mat') { r.tal.mat = Math.max(0, r.tal.mat - n); return; }
  const v = radVaror(r); v[g] = Math.max(0, (v[g] ?? 0) - n); r.tal.rikedom = radRikedomUr(r);
};
const laggTill = (r: VarldRad, g: VarugruppId, n: number) => taUr(r, g, -n);
function skickaFard(c: ByCtx, a: FardAffar) {
  const { s, vl, r, mot } = c, t0 = c.t, huvud = mot.nr === vl.huvud, n = huvud ? 0 : a.n; // till huvudbyn går handlaren (lasten: 11.6.9)
  taUr(r, a.g, n);
  const f: RadFard = { id: vl.nastaFard = (vl.nastaFard ?? 0) + 1, fran: r.nr, till: mot.nr, g: a.g, n, t0, t1: t0 + a.dygn * DAY, ...huvud ? { handlare: true as const } : {} };
  if (huvud) { let i = 0; f.last = packaRad(r, () => varldSlump(vl, r.nr, f.id, 0x484c + i++), g => overskott(r, g)); } // handlarens varor ur raden (steg 11.6.9)
  (vl.farder ??= []).push(f);
  trampaFard(s, r.nr, mot.nr, sallskapTyngd(BYHANDLING.barare));
  laggIKo(vl, f.t1, 'fardFram', { sak: f.id });
  count(s, huvud ? 'handlare_skickad' : 'radhandel_ut');
}
// lasten ur byns rad (steg 11.6.9, Flera samhällen: Det som kommer till huvudbyn kommer ur en rad): när byn skickar sin handlare
// dras varorna ur HANDLARVAROR bland det byns tekniker kan göra (sakens tek), högst det byn har över i sakens varugrupp
// (over, i grundvärde och maten i portioner), och dras ur raden genast; silvret tas ur radens silver. Slumpen är världens
// (rand), så att det blir lika i det levande läget och ikappräkningen. Det hen har kvar och har köpt går hem till raden (fardHem)
export function packaRad(r: VarldRad, rand: () => number, over: (g: VarugruppId) => number): HandlarLast {
  const sort = 'vandrande', kg = HANDLAR_UTR[HANDLARSORTER[sort].utr]?.vikt ?? 0;
  const helt = ([a, b]: readonly [number, number] | number[]) => a + Math.floor(rand() * (b - a + 1));
  const [a0, b0] = HANDEL.vardeVaror, mal = a0 + rand() * (b0 - a0), ut: HVara[] = [];
  const kvar: Partial<Record<VarugruppId, number>> = {};
  const rader = HANDLARVAROR.filter(v => v.sort.includes(sort) && SAKER[v.k] && gruppAv(v.k) && (!SAKER[v.k]!.skaffa?.tek || r.tek.includes(SAKER[v.k]!.skaffa!.tek!)));
  const per = (k: string) => gruppAv(k) === 'mat' && isFood(k) ? 1 : grundvarde(k);
  let varde = 0;
  for (let i = 0; i < 30 && varde < mal && rader.length; i++) {
    const tot = rader.reduce((x, v) => x + v.vikt, 0);
    let x = rand() * tot, rad = rader[0];
    for (const v of rader) { x -= v.vikt; if (x < 0) { rad = v; break; } }
    const g = gruppAv(rad.k)!, k = kvar[g] ??= Math.max(0, over(g));
    const n = Math.min(helt(rad.n), Math.floor(k / Math.max(1e-9, per(rad.k))));
    if (n <= 0 || kgOf(ut) + n * viktOf(rad.k) > kg * HANDEL.fylla) continue;
    const f = ut.find(w => w.k === rad.k && !SAKER[rad.k]!.redskap);
    if (f) f.n += n; else if (SAKER[rad.k]!.redskap) for (let j = 0; j < n; j++) ut.push({ k: rad.k, n: 1, q: 2 }); else ut.push({ k: rad.k, n });
    kvar[g] = k - n * per(rad.k);
    radTar(r, rad.k, -n);
    varde += n * grundvarde(rad.k);
  }
  const silver = Math.min(Math.floor(r.tal.silver), helt(HANDLARSORTER[sort].silver));
  radTar(r, 'silver', -silver);
  return { varor: ut, silver, sort };
}
// färden kommer fram: lasten läggs i mottagarens förråd och mottagaren betalar efter sitt pris
KOHANDELSER.fardFram = (s, vl, p) => {
  const f = vl.farder?.find(x => x.id === p.sak);
  if (!f) return;
  const r = radNr(vl, f.fran), mot = radNr(vl, f.till);
  if (f.handlare) { handlarFram(s, f.fran); return; } // handlaren väntar vid kartans kant och går in när det är fritt (handel.ts)
  f.t2 = f.t1 + (f.t1 - f.t0);
  if (mot && BYSORTER[mot.sort].folk && mot.tal.folk > 0) {
    const pris = f.n * enhet(f.g) * radGruppPaslag(s, mot, f.g), b = betalning(s, mot, f.g);
    laggTill(mot, f.g, f.n);
    const sv = Math.min(b.silver, Math.round(pris));
    mot.tal.silver -= sv; f.silver = sv;
    if (b.h && pris - sv >= 1) {
      const hp = radGruppPaslag(s, mot, b.h), hn = Math.min(Math.max(0, overskott(mot, b.h)), Math.floor((pris - sv) * hp / enhet(b.h)));
      if (hn > 0) { taUr(mot, b.h, hn); f.h = b.h; f.hn = hn; }
    }
    if (r) { byHandelse(vl, 'handel', r.nr, mot.nr); byHandelse(vl, 'handel', mot.nr, r.nr); }
    count(s, 'radhandel_fram');
  } else { f.h = f.g; f.hn = f.n; } // byn finns inte längre: lasten bärs hem igen
  trampaFard(s, f.till, f.fran, sallskapTyngd(BYHANDLING.barare));
  laggIKo(vl, f.t2, 'fardHem', { sak: f.id });
};
// färden kommer hem med betalningen
KOHANDELSER.fardHem = (_s, vl, p) => {
  const i = vl.farder?.findIndex(x => x.id === p.sak) ?? -1;
  if (i < 0) return;
  const f = vl.farder![i], r = radNr(vl, f.fran);
  vl.farder!.splice(i, 1);
  if (!r || !BYSORTER[r.sort].folk || r.tal.folk <= 0) return;
  r.tal.silver += f.silver ?? 0;
  if (f.h && f.hn) laggTill(r, f.h, f.hn);
  for (const w of f.hem ?? []) radTar(r, w.k, w.n); // handlarens varor (steg 11.6.9)
};
// byns handlare är på väg till huvudbyn, väntar vid kanten eller är där
const handlarUte = (s: State, nr: number) => !!s.varld?.farder?.some(f => f.handlare && f.fran === nr) || !!s.handlarVantar?.includes(nr);
// handlaren har gått från huvudbyn (handel.ts): färden hem börjar, lika lång som dit; dog hen kommer färden aldrig hem
handlarKrok.hem = (s, rad, last) => {
  const vl = s.varld, f = vl?.farder?.find(x => x.handlare && x.fran === rad && x.t2 === undefined);
  if (!vl || !f) return;
  const bar = last ?? f.last; // kom hen aldrig in bär hen hem det hen tog med sig
  if (bar) { f.silver = bar.silver; f.hem = bar.varor; delete f.last; }
  const dygn = f.t1 - f.t0;
  f.t0 = s.now - dygn; f.t1 = s.now; f.t2 = s.now + dygn;
  trampaFard(s, f.till, f.fran, sallskapTyngd(1));
  laggIKo(vl, f.t2, 'fardHem', { sak: f.id });
};
handlarKrok.borta = (s, rad) => { const vl = s.varld; if (vl?.farder) vl.farder = vl.farder.filter(x => !(x.handlare && x.fran === rad)); };
// var färden är nu, i världens rutor (för kartan): längs vägen ut och sedan hem
const fardRutor = (vl: Varlden, w: number, a: number, b: number) => {
  const v = vl.vagar?.find(x => x.fs === 'fots' && x.fran === a && x.till === b);
  if (v) return vagRutor(v, w);
  const u = vl.vagar?.find(x => x.fs === 'fots' && x.fran === b && x.till === a);
  return u ? vagRutor(u, w).reverse() : undefined;
};
export function fardLage(vl: Varlden, f: RadFard, t: number, w: number): { x: number; y: number; dx: number } | undefined {
  if (t >= f.t1 && f.t2 === undefined) return undefined; // framme (handlaren i huvudbyn)
  const ut = t < f.t1, a = byPlats(vl, ut ? f.fran : f.till), b = byPlats(vl, ut ? f.till : f.fran);
  if (!a || !b) return undefined;
  const v = fardRutor(vl, w, a.y * w + a.x, b.y * w + b.x);
  if (!v?.length) return undefined;
  const del = ut ? (t - f.t0) / Math.max(1, f.t1 - f.t0) : (t - f.t1) / Math.max(1, (f.t2 ?? f.t1) - f.t1);
  const x = Math.min(v.length - 1, Math.max(0, del * (v.length - 1))), i = Math.floor(x), j = Math.min(v.length - 1, i + 1), d = x - i;
  const ax = v[i] % w, ay = Math.floor(v[i] / w), bx = v[j] % w, by = Math.floor(v[j] / w);
  return { x: ax + (bx - ax) * d, y: ay + (by - ay) * d, dx: Math.sign(bx - ax) };
}
PERIODRADER.push({ namn: 'byarnas handlingar', period: 'dygn', fn: (s, vl, n) => byarnasHandlingar(s, vl, n) });
