// ---------- flytten mellan byarna (fas 11.3, Flera samhällen: Flytten, nya byar och undergången) ----------
// Flytten (steg 11.3.5): ur en by i världen flyttar folk med huvudbyns regler för trängsel och hunger (emigrationRate och
// hungerFlyttAv i liv.ts, med ett neutralt humör), räknat en gång i timmen (ungefär 15 dagar i spelet). De som flyttar samma
// timme går tillsammans och väljer bland byarna i grannätet inom räckhåll (FLYTT.dygn), med vikt efter trängseln där (folket
// delat med bärkraften), avståndet och relationen till byn (byrel.ts). Huvudbyn är en av dem. De kommer fram när restiden till
// fots har gått (kön, varldslag.ts): till en by i världen läggs de till folket, och till huvudbyn kommer var och en som en
// främling (framling i liv.ts), som byn tar emot eller visar bort; den som visas bort går hem igen. Varje flytt är ett släktband
// mellan byarna.
import { balans } from './balans';
import { mots, nyttSlaktband, relation, grundlage } from './byrel';
import { emigrationRate, hungerFlyttAv, LIV, matGottAv } from './liv';
import { barkraft, lever, matDygn } from './rad';
import { BYSORTER, radKrok, VarldRad } from './radtal';
import { clamp } from './slump';
import { KOHANDELSER, PERIODRADER, antalUr, laggIKo, periodSlut, varldSlump } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { VarldMark } from './varldmark';
import { DAY, State } from './typer';

export const FLYTT = balans('flytt', {
  dygn: 3, // byarna i grannätet så här många dygns gång bort (år i spelet) eller närmare är inom räckhåll
  narDygn: 1, // en by så många dygns gång bort väger hälften så mycket som en alldeles intill
  trang: 1.5, // trängseln där (folket delat med bärkraften) väger 1,5 − trängseln, aldrig under noll
});
// ärendena i världens slump (timmen; rad.ts har 1–6)
const A = { flytt: 11, mal: 12, ut: 13 };
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

// en timme: de som flyttar ur raden ger sig av tillsammans mot en by
export function radFlytt(s: State, vl: Varlden, r: VarldRad, n: number) {
  const ant = Math.min(r.tal.folk, antalUr(flyttPerDygn(r) / 24, varldSlump(vl, r.nr, n, A.flytt)));
  if (!ant) return;
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
