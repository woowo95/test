// ---------- flytten mellan byarna (fas 11.3, Flera samhällen: Flytten, nya byar och undergången) ----------
// Flytten (steg 11.3.5): ur en by i världen flyttar folk med huvudbyns regler för trängsel och hunger (emigrationRate och
// hungerFlyttAv i liv.ts, med ett neutralt humör), räknat en gång i timmen (ungefär 15 dagar i spelet). De som flyttar samma
// timme går tillsammans och väljer bland byarna i grannätet inom räckhåll (FLYTT.dygn), med vikt efter trängseln där (folket
// delat med bärkraften), avståndet och relationen till byn (byrel.ts). Huvudbyn är en av dem. De kommer fram när restiden till
// fots har gått (kön, varldslag.ts): till en by i världen läggs de till folket, och till huvudbyn kommer var och en som en
// främling (framling i liv.ts), som byn tar emot eller visar bort; den som visas bort går hem igen. Varje flytt är ett släktband
// mellan byarna.
//
// Nya byar (steg 11.3.7): en grupp som flyttar kan i stället grunda en egen by på den närmaste lediga byplatsen inom räckhåll.
// Chansen (NYBY.chans) växer med gruppens storlek (fullt från NYBY.grupp) och moderbyns (fullt från NYBY.moder). Den nya byn
// minns sin moderby (raden.fran, ett släktband i byrel.ts), tar med sig sin del av maten och kan en del av moderbyns tekniker
// (NYBY.tek av var och en, och bara det vars krav den kan). Världens krönika får raden Delad.
// Splittringen (steg 11.3.12): andelen i moderbyn med en annan tro än byns höjer chansen (NYBY.tro); de som har den tron går
// med gruppen och den nya byn får den, annars tar gruppen med sig moderbyns tro.
//
// Undergången (steg 11.3.8): en by utan folk går under. Raden och platsen blir en ruin, och det som fanns kvar blir hela saker
// (raden.kvar): silvret, och en del av rikedomen (RUIN.kvar) som saker byn kunde göra, valda med världens slump efter
// grundvärdet. Maten ruttnar. Världens krönika får raden Gått under, och huvudbyn förlorar sin förbindelse med byn.
import { balans } from './balans';
import { mots, nyttSlaktband, relation, grundlage } from './byrel';
import { emigrationRate, hungerFlyttAv, LIV, matGottAv } from './liv';
import { barkraft, lever, matDygn, styrkaMal } from './rad';
import { BYSORTER, BysortDef, radKrok, radNr, VarldRad } from './radtal';
import { clamp } from './slump';
import { KOHANDELSER, PERIODRADER, antalUr, laggIKo, periodSlut, varldSlump } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { MARK_IDS, VARLD, VarldMark } from './varldmark';
import { byRutor } from './placering';
import { byPlats, hinder, LANDMARKEN, laggPlats, varldPlatsNr } from './landmarken';
import { narmasteMal } from './vagval';
import { byGrannar } from './grannat';
import { varldHandelse } from './varldkronika';
import { TEK } from './teknik';
import { SAKER } from './saker';
import { grundvarde } from './varde';
import { klanerAndrade } from './klaner';
import { log } from './folk';
import { kronika } from './historik';
import { DAY, State } from './typer';

export const FLYTT = balans('flytt', {
  dygn: 3, // byarna i grannätet så här många dygns gång bort (år i spelet) eller närmare är inom räckhåll
  narDygn: 1, // en by så många dygns gång bort väger hälften så mycket som en alldeles intill
  trang: 1.5, // trängseln där (folket delat med bärkraften) väger 1,5 − trängseln, aldrig under noll
});
export const RUIN = balans('ruin', {
  kvar: 0.05, // så stor del av rikedomen blir kvar som saker i ruinen
});
export const NYBY = balans('nyby', {
  chans: 0.3, // chansen att en grupp som flyttar grundar en egen by, när gruppen och moderbyn är stora nog ...
  grupp: 4, // ... gruppen så många eller fler (färre: i proportion) ...
  moder: 30, // ... och moderbyn så många eller fler (färre: i proportion)
  tek: 0.7, // den nya byn kan så stor del av moderbyns tekniker
  tro: 2, // chansen blir 1 + så här mycket gånger andelen med en annan tro än byns gånger större (steg 11.3.12)
});
// ärendena i världens slump (timmen; rad.ts har 1–6)
const A = { flytt: 11, mal: 12, ut: 13, ny: 14, tek: 15, ruin: 16, in: 17, lager: 18 };
const platsAv = (vl: Varlden, r: VarldRad) => { const p = byPlats(vl, r.nr); return p?.k === 'by' ? p : undefined; };

// hur många som vill flytta ur raden per dygn (ett år i spelet): trängseln och hungern, med huvudbyns regler
export const flyttPerDygn = (r: VarldRad) => emigrationRate(r.tal.folk, LIV.nojd) + hungerFlyttAv(matGottAv(matDygn(r)), r.tal.folk);
// så stor del av dem som flyttar gör det för hungern (0 till 1)
export const hungerDel = (r: VarldRad) => { const a = flyttPerDygn(r); return a > 0 ? hungerFlyttAv(matGottAv(matDygn(r)), r.tal.folk) / a : 0; };

// rövarlägret (steg 11.6.17): de som flyttar för hunger kan slå läger som rövare i stället för att söka sig till en by, och
// hungriga ur byarna intill dras dit; lägret skaffar ingen egen mat och föder inga barn (BYSORTER), så det lever på det
// flocken tar (plundringen i byhandling.ts) och löses upp när folket är slut
export const ROVLAGER = balans('rovarlager', {
  chans: 0.5, // chansen att en grupp som flyttar slår läger som rövare, gånger hur stor del av flytten som är hunger
  dras: 0.6, // ett läger inom räckhåll väger så här mycket för den som flyttar, gånger hungerns del av flytten
});
export const lagerChans = (r: VarldRad) => ROVLAGER.chans * hungerDel(r);

// byarna inom räckhåll från raden, med vikten för den som flyttar dit
export function flyttMal(vl: Varlden, v: VarldMark | undefined, r: VarldRad): { r: VarldRad; dygn: number; vikt: number }[] {
  const ut: { r: VarldRad; dygn: number; vikt: number }[] = [];
  for (const g of platsAv(vl, r)?.grannar ?? []) {
    if (g.dygn > FLYTT.dygn) continue;
    const p = varldPlatsNr(vl, g.nr), m = radNr(vl, p?.by);
    if (!m || m.nr === r.nr || !BYSORTER[m.sort].folk || (m.tal.folk <= 0 && m.nr !== vl.huvud)) continue;
    if (m.nr === vl.huvud && !r.syn) continue; // till huvudbyn flyttar den som har en förbindelse dit
    const tr = clamp(FLYTT.trang - m.tal.folk / Math.max(1, barkraft(v, m)), 0, FLYTT.trang);
    const rel = relation(vl, r.nr, m.nr) ?? grundlage(vl, r.nr, m.nr);
    const vikt = tr * (1 + rel / 100) / 2 / (1 + g.dygn / FLYTT.narDygn);
    if (vikt > 0) ut.push({ r: m, dygn: g.dygn, vikt });
  }
  // rövarlägren inom räckhåll (lägrets grannät går till byarna omkring), för den som flyttar för hunger
  const hem = platsAv(vl, r), hd = hungerDel(r);
  if (hem && hd > 0) for (const m of vl.rader ?? []) {
    if (m.sort !== 'rovarlager' || m.tal.folk <= 0) continue;
    const g = byPlats(vl, m.nr)?.grannar?.find(q => q.nr === hem.nr);
    if (g && g.dygn <= FLYTT.dygn) ut.push({ r: m, dygn: g.dygn, vikt: hd * ROVLAGER.dras / (1 + g.dygn / FLYTT.narDygn) });
  }
  return ut;
}

// chansen att gruppen grundar en egen by, när moderbyn ännu har dem kvar
// (steg 11.3.12): gånger 1 + NYBY.tro gånger andelen i byn med en annan tro än byns, högst 1
export const nyChans = (r: VarldRad, grupp: number) => Math.min(1, NYBY.chans * Math.min(1, grupp / NYBY.grupp) * Math.min(1, r.tal.folk / NYBY.moder) * (1 + NYBY.tro * (r.tro?.annan?.andel ?? 0) / 100)); // r.tal.folk: moderbyn innan de går
// tron i den nya byn (steg 11.3.12): har moderbyn en annan tro går de som har den med gruppen, så många som ryms, och den nya
// byn får den tron; annars tar gruppen med sig moderbyns tro. Andelarna räknas i hela personer
function delaTro(r: VarldRad, ny: VarldRad, grupp: number) {
  const t = r.tro;
  if (!t) return;
  const fore = r.tal.folk + grupp, a = t.annan;
  const troende = a ? Math.round(a.andel / 100 * fore) : 0, med = Math.min(grupp, troende);
  if (!a || !med) { ny.tro = { namn: t.namn, andel: t.andel, krig: t.krig }; return; }
  ny.tro = { namn: a.namn, andel: Math.round(100 * med / grupp), krig: a.krig };
  const kvar = troende - med;
  if (kvar > 0 && r.tal.folk > 0) a.andel = Math.round(100 * kvar / r.tal.folk); else delete t.annan;
}
// byrutorna i världen (marken och vattnet; räknas en gång per värld)
const rutor = new WeakMap<VarldMark, number[]>();
// gruppen grundar en ny by på den närmaste lediga byplatsen inom räckhåll; undefined om ingen finns
export function nyBy(s: State, vl: Varlden, r: VarldRad, grupp: number, t: number): VarldRad | undefined {
  const v = varldMark(s), hem = platsAv(vl, r);
  if (!v || !hem) return undefined;
  let alla = rutor.get(v); if (!alla) rutor.set(v, alla = byRutor(v));
  // bara rutorna inom räckhåll: varje steg kostar minst 1, så en ruta längre bort i x eller y än räckhållet nås inte
  const nar = FLYTT.dygn * VARLD.gangPerDygn, inom = (i: number) => Math.abs(i % v.w - hem.x) <= nar && Math.abs(Math.floor(i / v.w) - hem.y) <= nar;
  const lediga = new Set(alla.filter(i => inom(i) && !hinder(vl, v, 'by', i % v.w, Math.floor(i / v.w))));
  const [f] = narmasteMal(vl, v, hem.y * v.w + hem.x, lediga, 1, 'fots');
  if (!f || f.kostnad / VARLD.gangPerDygn > FLYTT.dygn) return undefined;
  const p = laggPlats(vl, v, 'by', f.till % v.w, Math.floor(f.till / v.w), t);
  if (!p) return undefined;
  const nr = vl.nastaRad = (vl.nastaRad ?? 0) + 1;
  // teknikerna: var och en med chansen NYBY.tek, och bara det vars krav den nya byn kan (i moderbyns ordning, kraven först)
  const tek: string[] = [];
  r.tek.forEach((id, j) => { if (varldSlump(vl, nr, j, A.tek) < NYBY.tek && (TEK[id]?.krav ?? []).every(k => tek.includes(k))) tek.push(id); });
  const mat = Math.min(r.tal.mat, Math.round(r.tal.mat * grupp / Math.max(1, r.tal.folk + grupp))); // sin del av maten
  r.tal.mat -= mat;
  const ny: VarldRad = { nr, sort: 'by', namn: p.namn, x: p.x, y: p.y, grundad: t, fran: r.nr, t, tal: { folk: grupp, mat, rikedom: 0, silver: 0, styrka: 0 }, tek, fasta: [] };
  delaTro(r, ny, grupp);
  vl.rader!.push(ny);
  p.by = nr;
  p.grannar = byGrannar(vl, v, p, t);
  hem.grannar = byGrannar(vl, v, hem, t);
  mots(vl, r.nr, nr);
  varldHandelse(vl, 'delad', t, { by: r.nr, mot: nr });
  return ny;
}

// rutorna där ett rövarläger får ligga (räknas en gång per värld)
const lagerRutor = new WeakMap<VarldMark, number[]>();
// gruppen slår läger som rövare på den närmaste lediga platsen inom räckhåll; undefined om ingen finns
export function nyttLager(s: State, vl: Varlden, r: VarldRad, grupp: number, t: number): VarldRad | undefined {
  const v = varldMark(s), hem = platsAv(vl, r);
  if (!v || !hem) return undefined;
  let alla = lagerRutor.get(v);
  if (!alla) { const mk = LANDMARKEN.rovarlager.mark as readonly string[]; alla = []; for (let i = 0; i < v.w * v.h; i++) if (mk.includes(MARK_IDS[v.mark[i]])) alla.push(i); lagerRutor.set(v, alla); }
  const nar = FLYTT.dygn * VARLD.gangPerDygn, inom = (i: number) => Math.abs(i % v.w - hem.x) <= nar && Math.abs(Math.floor(i / v.w) - hem.y) <= nar;
  const lediga = new Set(alla.filter(i => inom(i) && !hinder(vl, v, 'rovarlager', i % v.w, Math.floor(i / v.w))));
  const [f] = narmasteMal(vl, v, hem.y * v.w + hem.x, lediga, 1, 'fots');
  if (!f || f.kostnad / VARLD.gangPerDygn > FLYTT.dygn) return undefined;
  const p = laggPlats(vl, v, 'rovarlager', f.till % v.w, Math.floor(f.till / v.w), t);
  if (!p) return undefined;
  const nr = vl.nastaRad = (vl.nastaRad ?? 0) + 1;
  const mat = Math.min(r.tal.mat, Math.round(r.tal.mat * grupp / Math.max(1, r.tal.folk + grupp))); // sin del av maten
  r.tal.mat -= mat;
  const ny: VarldRad = { nr, sort: 'rovarlager', namn: p.namn, x: p.x, y: p.y, grundad: t, fran: r.nr, t, tal: { folk: grupp, mat, rikedom: 0, silver: 0, styrka: 0 }, tek: [...r.tek], fasta: [] };
  ny.tal.styrka = styrkaMal(ny); // de som ger sig av är de som orkar
  vl.rader!.push(ny);
  p.by = nr;
  p.grannar = byGrannar(vl, v, p, t);
  mots(vl, r.nr, nr);
  varldHandelse(vl, 'lager', t, { by: r.nr, mot: nr });
  return ny;
}

// en timme: de som flyttar ur raden grundar en egen by eller ger sig av tillsammans mot en by
export function radFlytt(s: State, vl: Varlden, r: VarldRad, n: number) {
  const ant = Math.min(r.tal.folk, antalUr(flyttPerDygn(r) / 24, varldSlump(vl, r.nr, n, A.flytt)));
  if (!ant) return;
  if (varldSlump(vl, r.nr, n, A.lager) < lagerChans(r)) {
    r.tal.folk -= ant;
    if (nyttLager(s, vl, r, ant, periodSlut(vl, 'timme', n))) return;
    r.tal.folk += ant; // ingen ledig plats: de gör som de andra
  }
  if (varldSlump(vl, r.nr, n, A.ny) < nyChans(r, ant)) {
    r.tal.folk -= ant;
    if (nyBy(s, vl, r, ant, periodSlut(vl, 'timme', n))) return;
    r.tal.folk += ant; // ingen ledig plats inom räckhåll: de flyttar till en by
  }
  const mal = flyttMal(vl, varldMark(s), r);
  const sum = mal.reduce((a, m) => a + m.vikt, 0);
  if (!sum) return; // ingen by inom räckhåll: de stannar
  let x = varldSlump(vl, r.nr, n, A.mal) * sum, val = mal[mal.length - 1];
  for (const m of mal) { x -= m.vikt; if (x < 0) { val = m; break; } }
  r.tal.folk -= ant;
  mots(vl, r.nr, val.r.nr);
  laggIKo(vl, periodSlut(vl, 'timme', n) + val.dygn * DAY, 'flytt', { sak: val.r.nr, data: { fran: r.nr, n: ant } });
}

// de som lämnar huvudbyn (emigrate i liv.ts) väljer en by i världen på samma sätt och kommer fram efter restiden; slumpen är
// världens (huvudbyns nummer och tiden)
radKrok.utflytt = (s, n) => {
  const vl = s.varld, h = vl?.rader?.find(r => r.nr === vl.huvud);
  if (!vl || !h || n <= 0) return;
  const mal = flyttMal(vl, varldMark(s), h).filter(m => m.r.nr !== vl.huvud), sum = mal.reduce((a, m) => a + m.vikt, 0);
  if (!sum) return; // ingen by inom räckhåll: de söker lyckan längre bort
  let x = varldSlump(vl, h.nr, Math.floor(s.now / 1000), A.ut) * sum, val = mal[mal.length - 1];
  for (const m of mal) { x -= m.vikt; if (x < 0) { val = m; break; } }
  mots(vl, h.nr, val.r.nr);
  laggIKo(vl, s.now + val.dygn * DAY, 'flytt', { sak: val.r.nr, data: { fran: h.nr, n } });
};
// nybyggarna till huvudbyn (immigrate i liv.ts) kommer ur en by i grannätet inom räckhåll som har fler än de n som går, oftare
// ur en by nära (steg 11.6.13); finns ingen sådan by kommer ingen
radKrok.nybyggare = (s, n) => {
  const vl = s.varld, h = vl?.rader?.find(r => r.nr === vl.huvud);
  if (!vl || !h) return undefined;
  const fran: { r: VarldRad; vikt: number }[] = [];
  for (const g of platsAv(vl, h)?.grannar ?? []) {
    if (g.dygn > FLYTT.dygn) continue;
    const m = radNr(vl, varldPlatsNr(vl, g.nr)?.by);
    if (m && m.nr !== h.nr && BYSORTER[m.sort].folk && m.tal.folk > n) fran.push({ r: m, vikt: 1 / (1 + g.dygn / FLYTT.narDygn) });
  }
  const sum = fran.reduce((a, m) => a + m.vikt, 0);
  if (!sum) return null;
  let x = varldSlump(vl, h.nr, Math.floor(s.now / 1000), A.in) * sum, val = fran[fran.length - 1];
  for (const m of fran) { x -= m.vikt; if (x < 0) { val = m; break; } }
  val.r.tal.folk -= n;
  mots(vl, val.r.nr, h.nr); nyttSlaktband(vl, val.r.nr, h.nr);
  return val.r;
};
// de som flyttade kommer fram: till en by i världen läggs de till folket, till huvudbyn kommer var och en som en främling
KOHANDELSER.flytt = (_s, vl, p) => {
  const fran = p.data!.fran, n = p.data!.n, m = radNr(vl, p.sak!);
  nyttSlaktband(vl, fran, p.sak!);
  if (p.sak === vl.huvud) { for (let i = 0; i < n; i++) (vl.tillHuvud ??= []).push(fran); return; }
  if (m && BYSORTER[m.sort].folk) m.tal.folk += n;
  else { const hem = radNr(vl, fran); if (hem) hem.tal.folk += n; } // byn finns inte längre: de går hem igen
};

// saker som kan finnas kvar i en ruin: det byn kunde göra och som har ett värde
const RUINSAKER = (r: VarldRad) => r.tek.filter(id => SAKER[id] && grundvarde(id) >= 0.5 && id !== 'kompost');
// byn går under: raden och platsen blir en ruin med det som fanns kvar i hela saker
export function undergang(s: State, vl: Varlden, r: VarldRad, t: number) {
  const kvar: Record<string, number> = {};
  if (r.tal.silver > 0) kvar.silver = r.tal.silver;
  const saker = RUINSAKER(r);
  let varde = r.tal.rikedom * RUIN.kvar;
  for (let i = 0; saker.length && i < 1000; i++) {
    const id = saker[Math.floor(varldSlump(vl, r.nr, i, A.ruin) * saker.length)], v = grundvarde(id);
    if (v > varde) break;
    varde -= v; kvar[id] = (kvar[id] ?? 0) + 1;
  }
  r.sort = 'ruin'; r.tal = { folk: 0, mat: 0, rikedom: 0, silver: 0, styrka: 0 }; r.t = t; delete r.varor; delete r.hus; delete r.egen;
  if (Object.keys(kvar).length) r.kvar = kvar;
  delete r.ledare;
  const p = platsAv(vl, r);
  if (p) p.k = 'ruin';
  varldHandelse(vl, 'gattUnder', t, { by: r.nr });
  if (r.syn) { // huvudbyn hör det och förlorar förbindelsen
    const text = `${r.namn} finns inte längre. Byn har gått under och är en ruin.`;
    log(s, text, 'world'); kronika(s, text, 'utflytt');
    klanerAndrade(s);
  }
}

// rövarlägret löses upp när folket är slut: platsen försvinner från kartan, och raden finns kvar för krönikan
export function lagerUpplost(vl: Varlden, r: VarldRad, t: number) {
  r.t = t; r.tal = { folk: 0, mat: 0, rikedom: 0, silver: 0, styrka: 0 }; delete r.varor; delete r.ledare;
  const p = byPlats(vl, r.nr);
  if (p) vl.platser = vl.platser!.filter(q => q !== p);
  varldHandelse(vl, 'upplost', t, { by: r.nr });
}

// varje timme, efter maten: flytten ur varje by i världen som lever efter radens regler
PERIODRADER.push({ namn: 'flytten', period: 'timme', fn: (s, vl, n) => { for (const r of [...vl.rader ?? []]) if (lever(vl, r)) radFlytt(s, vl, r, n); } });
// varje timme, sist: en by utan folk går under (huvudbyn grundas på nytt i stället, liv.ts)
PERIODRADER.push({ namn: 'undergången', period: 'timme', fn: (s, vl, n) => { for (const r of vl.rader ?? []) {
  if (r.nr === vl.huvud || r.tal.folk > 0) continue;
  if (r.sort === 'by') undergang(s, vl, r, periodSlut(vl, 'timme', n));
  else if ((BYSORTER[r.sort] as BysortDef).slut === 'folk' && byPlats(vl, r.nr)) lagerUpplost(vl, r, periodSlut(vl, 'timme', n));
} } });
