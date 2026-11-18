// ---------- radens regler (fas 11.3, Flera samhällen: Radens regler) ----------
// En by i världen som inte går i simuleringen lever efter radens regler: hela tal som räknas i världens perioder
// (varldslag.ts) med världens slump. Reglerna rör aldrig en rad som läses ur en by (huvudbyns rad, radtal.ts). Balanstalen står
// i blocket RAD.
//
// Bärkraften (steg 11.3.1) är hur många platsen kan föda: platsens grundtal gånger det teknikerna ger. Grundtalet är vad
// marken runt platsen föder (VARLDMARK.barkraft för rutan och de åtta runt den, och floderna), och kolumnen rad i TEKNIK säger
// hur mycket mer varje teknik ger: bärkraft (odling, fiske, fångst), förvaring (torkning, rökning, hyllor), styrka (vapen,
// sköld) och rikedom (hus, redskap).
//
// Maten, födda och döda (steg 11.3.2) räknas en gång i timmen (ungefär 15 dagar i spelet). De arbetsföra skaffar ett överskott
// över behovet vid låg trängsel (RAD.overskott), som sjunker mot noll när folket når bärkraften och blir brist över den;
// i istiden är överskottet och bristen en bråkdel (RAD.istid). Det som blir över läggs undan upp till förvaringens tak (RAD.forvaringDygn dygns mat,
// mer med teknikerna). Tar maten slut dör en del av dem som blir utan (RAD.svaltDod), och världens krönika får raden Svält.
// Födda räknas med huvudbyns regler för lusten till barn, maten och trängseln (fodVilja och fodslarPerAr i steg.ts, barnMatAv i
// liv.ts), och döda av ålder och olyckor med RAD.dod. Allt blir hela tal ur det väntade antalet (antalUr).
//
// Rikedomen och styrkan (steg 11.3.3) räknas samma timme: rikedomen går mot ett mål som teknikerna sätter (RAD.rikPer per
// person) och sjunker i nöd, och styrkan går mot folket gånger andelen som kan slåss (RAD.styrka), mer med vapen och sköld.
// Kunskapen (steg 11.3.9) räknas en gång per dygn (ett år i spelet): varje öppen teknik (byn kan kraven) kommer byn på med
// chansen ett delat med nivåns mål i testbyarna (TEKTAL.nivaDygn) gånger trögheten (RAD.troghet), mindre i en liten by
// (folket mot RAD.kunskapFolk). En teknik som en by inom räckhåll kan sprids med RAD.sprid per dygn när byarna mött varandra
// och är vänliga (relationen minst RAD.vanlig, byrel.ts), inom RAD.kontaktDygn. En teknik som ingen annan av byns tekniker bygger på kan tappas, med
// en chans som växer ju färre byn är (RAD.tappa, under RAD.tappaFolk).
import { balans } from './balans';
import { TEK, TEKNIK, TEKTAL } from './teknik';
import { relation } from './byrel';
import { TRONAMN } from './religion';
import { MARK_IDS, VARLDMARK, VarldMark } from './varldmark';
import { BYSORTER, radKrok, radNr, VarldRad } from './radtal';
import { byPlats, varldPlatsNr } from './landmarken';
import { KROPP } from './folk';
import { barnMatAv, matGottAv } from './liv';
import { fodslarPerAr, fodVilja } from './steg';
import { ageIndex, iIstiden } from './tid';
import { EFTERSTEG, PERIODRADER, antalUr, periodSlut, varldSlump } from './varldslag';
import { varldHandelse } from './varldkronika';
import { relGlom } from './byrel';
import { Varlden, varldMark } from './varlden';
import { DAY, State } from './typer';
import { RADPRIS, radRikedomUr, radVaror, radVill, VARUGRUPP_IDS, markGrupp } from './priser';

export const RAD = balans('rad', {
  // bärkraften (steg 11.3.1)
  flod: 1, // en flodruta runt platsen föder så många till
  grundUtan: 15, // grundtalet för en by utan plats i världen
  // maten, födda och döda (steg 11.3.2)
  overskott: 1.5, // så mycket mer än behovet skaffar de vid låg trängsel; noll när folket når bärkraften
  istid: 0.3, // i istiden är överskottet (och bristen över bärkraften) så stor del
  forvaringDygn: 60, // så många dygns mat (år i spelet) får plats i förrådet, gånger 1 + teknikernas förvaring
  svaltDod: 0.1, // så stor del av dem som blir utan mat en timme (ungefär 15 dagar i spelet) dör
  modrar: 0.2, // så stor del av folket är kvinnor som kan få barn och har en partner
  dod: 0.04, // så stor del dör av ålder och olyckor per dygn (ett år i spelet)
  startMat: 19, // en ny by har så många dygns mat
  // rikedom och styrka (steg 11.3.3)
  rikPer: 200, // rikedomen går mot så mycket per person (värdet, som RADTAL.rikedom), gånger 1 + teknikernas rikedom ...
  rikDygn: 0.5, // ... och kommer så stor del av vägen dit per dygn (ett år i spelet)
  rikNod: 0.02, // en timme i nöd (maten slut) tar så stor del av rikedomen
  styrka: 0.35, // styrkan går mot folket gånger så stor del (de som kan slåss), gånger 1 + teknikernas styrka, högst folket ...
  styrkaDygn: 0.5, // ... och kommer så stor del av vägen dit per dygn
  styrkaUtanBarn: 0.8, // i en rad utan barn (ett läger, BYSORTER) kan så stor del slåss
  // kunskapen (steg 11.3.9)
  troghet: 2.5, // en öppen teknik tar så många gånger nivåns mål i testbyarna (TEKTAL.nivaDygn) i snitt ...
  kunskapFolk: 15, // ... i en by med så många eller fler; en mindre by i proportion
  sprid: 0.2, // chansen per dygn att en teknik sprids från en vänlig by inom räckhåll ...
  kontaktDygn: 3, // ... så här många dygns gång bort (år i spelet) eller närmare
  vanlig: 15, // byarna är vänliga när relationen är minst så mycket
  tappa: 0.05, // chansen per dygn att en by tappar en teknik som inget annat bygger på, i en by med ett fåtal ...
  tappaFolk: 12, // ... och noll från så här många
  // tron (steg 11.3.11)
  troNy: 0.2, // chansen per dygn att en by utan tro får en
  troSprid: 0.2, // chansen per dygn att en vänlig grannes tro sprids till byn (inom RAD.kontaktDygn)
  troStart: 10, // en ny tro i byn börjar med så många procent troende ...
  troMal: 25, // ... och andelen går mot så många procent ...
  troDygn: 0.2, // ... så stor del av vägen per dygn; en annan tro utan en vänlig granne som delar den går lika fort mot noll
});

export type RadKolumn = 'barkraft' | 'forvaring' | 'styrka' | 'rikedom';
// teknikernas tillskott i en kolumn: summan av andelarna för det byn kan (0 = inget)
// (räknas en gång per lista: raden får en ny lista när teknikerna ändras)
const tillskott = new WeakMap<string[], Partial<Record<RadKolumn, number>>>();
export function tekTillskott(r: VarldRad, k: RadKolumn): number {
  let m = tillskott.get(r.tek);
  if (!m) tillskott.set(r.tek, m = {});
  let n = m[k];
  if (n === undefined) { n = 0; for (const id of r.tek) n += TEK[id]?.rad?.[k] ?? 0; m[k] = n; }
  return n;
}
// det en ny by kan från början: nivå 1, som en grupp människor kan när de grundar en by (testbyarna kan dem första dygnet)
export const startTek = () => Object.values(TEK).filter(t => t.niva === 1).map(t => t.id);
// platsens grundtal: vad marken på rutan och de åtta runt den föder, och floderna
export function grundtal(v: VarldMark, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= v.w || yy >= v.h) continue;
    const i = yy * v.w + xx;
    n += VARLDMARK[MARK_IDS[v.mark[i]]].barkraft + (v.flod[i] ? RAD.flod : 0);
  }
  return n;
}
// hur många raden kan föda
export function barkraft(v: VarldMark | undefined, r: VarldRad): number {
  const g = v && r.x !== undefined && r.y !== undefined ? grundtal(v, r.x, r.y) : RAD.grundUtan;
  return g * (1 + tekTillskott(r, 'barkraft'));
}

// portioner per person och dygn (ett år i spelet): det en vuxen äter enligt kroppen
export const portionerPerDygn = () => 24 / KROPP.hungerTim / KROPP.mattar;
// radens regler gäller en by i världen med folk som inte går i simuleringen
export const lever = (vl: Varlden, r: VarldRad) => r.nr !== vl.huvud && BYSORTER[r.sort].folk && r.tal.folk > 0;
// maten i dygn (år i spelet) och förvaringens tak
export const matDygn = (r: VarldRad) => r.tal.folk ? r.tal.mat / (r.tal.folk * portionerPerDygn()) : 0;
export const forradTak = (r: VarldRad) => Math.round(r.tal.folk * portionerPerDygn() * RAD.forvaringDygn * (1 + tekTillskott(r, 'forvaring')));
// ärendena i världens slump för raden
const A = { mat: 1, svalt: 2, fodda: 3, doda: 4, rik: 5, styrka: 6, rikDel: 32 };

// en timme (ungefär 15 dagar i spelet) för raden: maten, svälten, födda och döda
export function radMat(s: State, vl: Varlden, r: VarldRad, n: number) {
  const v = varldMark(s), t = periodSlut(vl, 'timme', n), folk = r.tal.folk, P = portionerPerDygn() / 24;
  const behov = folk * P, tr = folk / Math.max(1, barkraft(v, r));
  const skaffar = BYSORTER[r.sort].egenMat ? behov * Math.max(0, 1 + RAD.overskott * (iIstiden(ageIndex(s, t - 1)) ? RAD.istid : 1) * (1 - tr)) : 0;
  let mat = r.tal.mat + antalUr(skaffar - behov, varldSlump(vl, r.nr, n, A.mat));
  let doda = 0;
  if (mat < 0) { // de som blir utan: en del dör
    doda = Math.min(folk, antalUr(Math.min(folk, -mat / P) * RAD.svaltDod, varldSlump(vl, r.nr, n, A.svalt)));
    mat = 0;
    if (doda && !(r.svalt !== undefined && t - r.svalt < DAY)) { r.svalt = t; varldHandelse(vl, 'svalt', t, { by: r.nr }); }
  }
  // födda och döda av ålder och olyckor (per dygn, en timme i taget)
  const dygnMat = folk ? mat / (folk * portionerPerDygn()) : 0;
  const fodda = BYSORTER[r.sort].barn ? antalUr(folk * RAD.modrar * fodslarPerAr(fodVilja(folk, dygnMat, barnMatAv(matGottAv(dygnMat), folk), 0)) / 24, varldSlump(vl, r.nr, n, A.fodda)) : 0;
  doda += antalUr((folk - doda) * RAD.dod / 24, varldSlump(vl, r.nr, n, A.doda));
  r.tal.folk = Math.max(0, folk - Math.min(folk, doda) + fodda);
  r.tal.mat = Math.min(mat, forradTak(r));
  radRikedom(s, vl, r, n, mat === 0);
  r.t = t;
}
// huvudbyns förbindelse med byn följer raden, när alla världens rader räknat
EFTERSTEG.push((_s, vl) => { for (const r of vl.rader ?? []) if (r.syn) { r.syn.folk = r.tal.folk; r.syn.styrka = r.tal.styrka; r.syn.resurser = r.tal.rikedom; } });

// rikedomens och styrkans mål
export const rikMal = (r: VarldRad) => r.tal.folk * RAD.rikPer * (1 + tekTillskott(r, 'rikedom'));
export const styrkaMal = (r: VarldRad) => Math.min(r.tal.folk, Math.round(r.tal.folk * (BYSORTER[r.sort].barn ? RAD.styrka : RAD.styrkaUtanBarn) * (1 + tekTillskott(r, 'styrka'))));
// så stor del av vägen en timme tar, när en hel dygns väg är del
const perTimme = (del: number) => 1 - (1 - del) ** (1 / 24);
// en timme: rikedomen går mot teknikernas mål och sjunker i nöd, och styrkan går mot folket
// rikedomen är husen och tillgången i varje varugrupp (steg 11.6.3, priser.ts): var del går mot sin del av målet, mer i en
// grupp som byns mark ger mycket av och mindre i en där marken har sällsynt (markGrupp, steg 11.6.7)
function radRikedom(s: State, vl: Varlden, r: VarldRad, n: number, nod: boolean) {
  const varor = radVaror(r), mal = rikMal(r);
  let i = 0;
  const flytta = (v: number, m: number) => Math.max(0, v + antalUr(nod ? -v * RAD.rikNod : (m - v) * perTimme(RAD.rikDygn), varldSlump(vl, r.nr, n, i++ ? A.rikDel + i : A.rik)));
  r.hus = flytta(r.hus ?? 0, mal * RADPRIS.husAndel);
  for (const g of VARUGRUPP_IDS) if (g !== 'mat') varor[g] = flytta(varor[g] ?? 0, radVill(r, g, mal) * markGrupp(s, r, g)); // byn gör mer av det marken ger mycket av (steg 11.6.7)
  r.tal.rikedom = radRikedomUr(r);
  const st = r.tal.styrka;
  r.tal.styrka = Math.min(r.tal.folk, Math.max(0, st + antalUr((styrkaMal(r) - st) * perTimme(RAD.styrkaDygn), varldSlump(vl, r.nr, n, A.styrka))));
}

// ärendena för kunskapen (dygnet): teknikens nummer i TEKNIK efter sorten
const K = { ny: 1 << 16, tappa: 2 << 16, sprid: 3 << 16, tro: 4 << 16 };
const nivaMal = (niva: number) => TEKTAL.nivaDygn[Math.min(TEKTAL.nivaDygn.length, niva) - 1];
// grannarna inom räckhåll (grannätet på byns plats)
export function grannRader(vl: Varlden, r: VarldRad, dygn: number): VarldRad[] {
  const p = byPlats(vl, r.nr);
  return (p?.grannar ?? []).filter(g => g.dygn <= dygn).flatMap(g => { const m = radNr(vl, varldPlatsNr(vl, g.nr)?.by); return m && BYSORTER[m.sort].folk ? [m] : []; });
}
// ett dygn: nya tekniker, spridda tekniker och tappade tekniker
export function radKunskap(vl: Varlden, r: VarldRad, n: number) {
  const kan = new Set(r.tek), ny: string[] = [], liten = Math.min(1, r.tal.folk / RAD.kunskapFolk);
  const vanner = grannRader(vl, r, RAD.kontaktDygn).filter(m => (relation(vl, r.nr, m.nr) ?? -Infinity) >= RAD.vanlig);
  TEKNIK.forEach((t, i) => {
    if (kan.has(t.id) || !t.krav.every(k => kan.has(k))) return;
    if (varldSlump(vl, r.nr, n, K.ny + i) < liten / (nivaMal(t.niva) * RAD.troghet)) { ny.push(t.id); return; }
    vanner.forEach(m => { if (!ny.includes(t.id) && m.tek.includes(t.id) && varldSlump(vl, r.nr, n, K.sprid + i * 64 + (m.nr % 64)) < RAD.sprid) ny.push(t.id); });
  });
  // tappade: det som ingen annan teknik byn kan bygger på
  const tappa = RAD.tappa * Math.max(0, 1 - r.tal.folk / RAD.tappaFolk), bort = new Set<string>();
  if (tappa > 0) TEKNIK.forEach((t, i) => {
    if (!kan.has(t.id) || r.tek.some(id => TEK[id]?.krav.includes(t.id))) return;
    if (varldSlump(vl, r.nr, n, K.tappa + i) < tappa) bort.add(t.id);
  });
  if (!ny.length && !bort.size) return;
  r.tek = TEKNIK.map(t => t.id).filter(id => (kan.has(id) && !bort.has(id)) || ny.includes(id));
}

// ---------- tron (steg 11.3.11) ----------
// En by utan tro får en med RAD.troNy per dygn: ett namn som ingen annan by i världen har och en läggning från fridsam till
// krigisk. Har en vänlig granne inom räckhåll en tro sprids den med RAD.troSprid: till en by utan tro blir den byns tro, och
// till en by med en annan tro blir den byns andra tro (annan). Andelen troende går mot RAD.troMal, RAD.troDygn av vägen per
// dygn och minst en procent; den andra tron växer bara medan en vänlig granne delar den och går annars mot noll. Blir den
// andra tron större än byns byter de plats. Grannbyns krigiskhet (Klan.krigisk) följer tron.
const steg = (v: number, mal: number) => v === mal ? v : v + Math.sign(mal - v) * Math.max(1, Math.round(Math.abs(mal - v) * RAD.troDygn));
function nyTroNamn(vl: Varlden, u: number) {
  const tagna = new Set((vl.rader ?? []).flatMap(r => [r.tro?.namn, r.tro?.annan?.namn]));
  const fria = TRONAMN.filter(n => !tagna.has(n));
  return fria.length ? fria[Math.floor(u * fria.length)] : `Den nya ${TRONAMN[Math.floor(u * TRONAMN.length)].toLowerCase()}`;
}
export function radTro(vl: Varlden, r: VarldRad, n: number) {
  const vanner = grannRader(vl, r, RAD.kontaktDygn).filter(m => m.tro && (relation(vl, r.nr, m.nr) ?? -Infinity) >= RAD.vanlig);
  const u = (i: number) => varldSlump(vl, r.nr, n, K.tro + i);
  const fran = vanner.find((m, i) => m.tro!.namn !== r.tro?.namn && m.tro!.namn !== r.tro?.annan?.namn && u(10 + i) < RAD.troSprid)?.tro;
  if (!r.tro) {
    if (fran) r.tro = { namn: fran.namn, andel: RAD.troStart, krig: fran.krig };
    else if (u(0) < RAD.troNy) r.tro = { namn: nyTroNamn(vl, u(1)), andel: RAD.troStart, krig: Math.round(u(2) * 100) };
  } else {
    r.tro.andel = steg(r.tro.andel, RAD.troMal);
    const a = r.tro.annan;
    if (a) {
      a.andel = steg(a.andel, vanner.some(m => m.tro!.namn === a.namn) ? RAD.troMal : 0);
      if (a.andel <= 0) delete r.tro.annan;
      else if (a.andel > r.tro.andel) { const { annan: _, ...forr } = r.tro; r.tro = { ...a, annan: forr }; }
    } else if (fran) r.tro.annan = { namn: fran.namn, andel: RAD.troStart, krig: fran.krig };
  }
  if (r.tro && r.syn) r.syn.krigisk = r.tro.krig;
}

radKrok.startTek = startTek;
radKrok.startMat = folk => Math.round(folk * portionerPerDygn() * RAD.startMat);

// varje timme: radens regler för varje by i världen som lever efter dem, i ordning efter numret; en väckt by (r.vaken) lever i
// simuleringen i stället (steg 11.13.12)
// varje dygn (ett år i spelet): kunskapen i varje by i världen som lever efter radens regler
PERIODRADER.push({ namn: 'radens kunskap', period: 'dygn', fn: (_s, vl, n) => { for (const r of vl.rader ?? []) if (lever(vl, r) && !r.vaken) radKunskap(vl, r, n); } });
// varje dygn: tron i varje by i världen som lever efter radens regler (steg 11.3.11)
PERIODRADER.push({ namn: 'radens tro', period: 'dygn', fn: (_s, vl, n) => { for (const r of vl.rader ?? []) if (lever(vl, r) && !r.vaken) radTro(vl, r, n); } });
// varje dygn (ett år i spelet): relationerna mellan byarna glöms mot grundläget (byrel.ts, steg 11.3.4)
PERIODRADER.push({ namn: 'relationerna glöms', period: 'dygn', fn: (_s, vl) => relGlom(vl) });
PERIODRADER.push({ namn: 'radens mat', period: 'timme', fn: (s, vl, n) => { for (const r of vl.rader ?? []) if (lever(vl, r) && !r.vaken) radMat(s, vl, r, n); } });

// ---------- vakten för raden (steg 11.3.14, Flera samhällen: Raden mäts mot testbyarna) ----------
// Det stora testet (vakta i src/test/kor.ts, en gång i timmen) larmar om något som inte får finnas i världen: ett tal i en rad
// som inte är ett helt tal (eller är negativt), en by som vuxit långt över vad platsen föder, eller
// fler byar som gått under än RADVAKT.dott av alla som funnits
export const RADVAKT = balans('radvakt', {
  barkraft: 3, // en by får ha högst så många gånger platsens bärkraft ...
  folk: 20, // ... plus så många
  dott: 0.6, // högst så stor del av byarna som funnits har gått under
});
export function radVakt(s: State): [string, string][] {
  const vl = s.varld, fel: [string, string][] = [];
  if (!vl?.rader) return fel;
  const v = varldMark(s);
  let byar = 0, ruiner = 0;
  for (const r of vl.rader) {
    for (const k of Object.keys(r.tal) as (keyof typeof r.tal)[]) {
      const x = r.tal[k];
      if (!Number.isInteger(x) || x < 0) fel.push(['radens tal', `${r.namn} (${r.nr}) ${k} = ${x}`]);
    }
    if (r.nr === vl.huvud) continue;
    if (BYSORTER[r.sort].folk) {
      if (r.sort === 'by') byar++; // läger och utposter är inga byar som kan gå under
      const tak = RADVAKT.barkraft * barkraft(v, r) + RADVAKT.folk;
      if (r.tal.folk > tak) fel.push(['raden växer utan gräns', `${r.namn} (${r.nr}) folk ${r.tal.folk}, bärkraften ${Math.round(barkraft(v, r))}`]);
    } else if (r.sort === 'ruin') { byar++; ruiner++; }
  }
  if (byar >= 10 && ruiner > RADVAKT.dott * byar) fel.push(['raderna dör ut', `${ruiner} av ${byar} byar har gått under`]);
  return fel;
}
