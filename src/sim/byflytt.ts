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
import { balans } from './balans';
import { mots, nyttSlaktband, relation, grundlage } from './byrel';
import { emigrationRate, hungerFlyttAv, LIV, matGottAv } from './liv';
import { barkraft, lever, matDygn } from './rad';
import { BYSORTER, radKrok, VarldRad } from './radtal';
import { clamp } from './slump';
import { KOHANDELSER, PERIODRADER, antalUr, laggIKo, periodSlut, varldSlump } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { VARLD, VarldMark } from './varldmark';
import { byRutor } from './placering';
import { hinder, laggPlats } from './landmarken';
import { narmasteMal } from './vagval';
import { byGrannar } from './grannat';
import { varldHandelse } from './varldkronika';
import { TEK } from './teknik';
import { DAY, State } from './typer';

export const FLYTT = balans('flytt', {
  dygn: 3, // byarna i grannätet så här många dygns gång bort (år i spelet) eller närmare är inom räckhåll
  narDygn: 1, // en by så många dygns gång bort väger hälften så mycket som en alldeles intill
  trang: 1.5, // trängseln där (folket delat med bärkraften) väger 1,5 − trängseln, aldrig under noll
});
export const NYBY = balans('nyby', {
  chans: 0.3, // chansen att en grupp som flyttar grundar en egen by, när gruppen och moderbyn är stora nog ...
  grupp: 4, // ... gruppen så många eller fler (färre: i proportion) ...
  moder: 30, // ... och moderbyn så många eller fler (färre: i proportion)
  tek: 0.7, // den nya byn kan så stor del av moderbyns tekniker
});
// ärendena i världens slump (timmen; rad.ts har 1–6)
const A = { flytt: 11, mal: 12, ut: 13, ny: 14, tek: 15 };
const radNr = (vl: Varlden, nr: number) => vl.rader?.find(r => r.nr === nr);
const platsAv = (vl: Varlden, r: VarldRad) => vl.platser?.find(p => p.k === 'by' && p.by === r.nr);

// hur många som vill flytta ur raden per dygn (ett år i spelet): trängseln och hungern, med huvudbyns regler
export const flyttPerDygn = (r: VarldRad) => emigrationRate(r.tal.folk, LIV.nojd) + hungerFlyttAv(matGottAv(matDygn(r)), r.tal.folk);

// byarna inom räckhåll från raden, med vikten för den som flyttar dit
export function flyttMal(vl: Varlden, v: VarldMark | undefined, r: VarldRad): { r: VarldRad; dygn: number; vikt: number }[] {
  const ut: { r: VarldRad; dygn: number; vikt: number }[] = [];
  for (const g of platsAv(vl, r)?.grannar ?? []) {
    if (g.dygn > FLYTT.dygn) continue;
    const p = vl.platser?.find(q => q.nr === g.nr), m = p?.by !== undefined ? radNr(vl, p.by) : undefined;
    if (!m || m.nr === r.nr || !BYSORTER[m.sort].folk || (m.tal.folk <= 0 && m.nr !== vl.huvud)) continue;
    if (m.nr === vl.huvud && !r.syn) continue; // till huvudbyn flyttar den som har en förbindelse dit
    const tr = clamp(FLYTT.trang - m.tal.folk / Math.max(1, barkraft(v, m)), 0, FLYTT.trang);
    const rel = relation(vl, r.nr, m.nr) ?? grundlage(vl, r.nr, m.nr);
    const vikt = tr * (1 + rel / 100) / 2 / (1 + g.dygn / FLYTT.narDygn);
    if (vikt > 0) ut.push({ r: m, dygn: g.dygn, vikt });
  }
  return ut;
}

// chansen att gruppen grundar en egen by, när moderbyn ännu har dem kvar
export const nyChans = (r: VarldRad, grupp: number) => NYBY.chans * Math.min(1, grupp / NYBY.grupp) * Math.min(1, r.tal.folk / NYBY.moder); // r.tal.folk: moderbyn innan de går
// byrutorna i världen (marken och vattnet; räknas en gång per värld)
const rutor = new WeakMap<VarldMark, number[]>();
// gruppen grundar en ny by på den närmaste lediga byplatsen inom räckhåll; undefined om ingen finns
export function nyBy(s: State, vl: Varlden, r: VarldRad, grupp: number, t: number): VarldRad | undefined {
  const v = varldMark(s), hem = platsAv(vl, r);
  if (!v || !hem) return undefined;
  let alla = rutor.get(v); if (!alla) rutor.set(v, alla = byRutor(v));
  const lediga = new Set(alla.filter(i => !hinder(vl, v, 'by', i % v.w, Math.floor(i / v.w))));
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
  vl.rader!.push(ny);
  p.by = nr;
  p.grannar = byGrannar(vl, v, p, t);
  hem.grannar = byGrannar(vl, v, hem, t);
  mots(vl, r.nr, nr);
  varldHandelse(vl, 'delad', t, { by: r.nr, mot: nr });
  return ny;
}

// en timme: de som flyttar ur raden grundar en egen by eller ger sig av tillsammans mot en by
export function radFlytt(s: State, vl: Varlden, r: VarldRad, n: number) {
  const ant = Math.min(r.tal.folk, antalUr(flyttPerDygn(r) / 24, varldSlump(vl, r.nr, n, A.flytt)));
  if (!ant) return;
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
// de som flyttade kommer fram: till en by i världen läggs de till folket, till huvudbyn kommer var och en som en främling
KOHANDELSER.flytt = (_s, vl, p) => {
  const fran = p.data!.fran, n = p.data!.n, m = radNr(vl, p.sak!);
  nyttSlaktband(vl, fran, p.sak!);
  if (p.sak === vl.huvud) { for (let i = 0; i < n; i++) (vl.tillHuvud ??= []).push(fran); return; }
  if (m && BYSORTER[m.sort].folk) m.tal.folk += n;
  else { const hem = radNr(vl, fran); if (hem) hem.tal.folk += n; } // byn finns inte längre: de går hem igen
};

// varje timme, efter maten: flytten ur varje by i världen som lever efter radens regler
PERIODRADER.push({ namn: 'flytten', period: 'timme', fn: (s, vl, n) => { for (const r of [...vl.rader ?? []]) if (lever(vl, r)) radFlytt(s, vl, r, n); } });
