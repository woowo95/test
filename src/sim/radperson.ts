// ---------- ledaren och de fasta personerna i raden (steg 11.3.10, Flera samhällen: Radens regler) ----------
// En by i världen som har en ledare (BYSORTER) har en fast person som leder den, med samma egenskaper som en bybo: allt om hen
// räknas ur hens nyckel (namnet, könet, åldern när hen blir ledare, hur gammal hen blir och egenskaperna), så samma nyckel
// ger alltid samma person. Hur gammal hen blir dras när hen tillsätts, med samma risk för ålder och olyckor som i byn
// (KROPP.dodBas, dodAlder och dodTakt), så bytet sker vid en känd tid: det ligger i världens kö (KOHANDELSER.ledare).
// De fasta personerna sparas i liten form (FastPerson i radtal.ts: namn, kön, född, roll, nyckeln och dödsdagen);
// egenskaperna byggs ur nyckeln när de behövs (fastEgenskaper). Den första ledaren är hövdingen huvudbyn redan känner (eller
// grundaren av en by som bröt sig ur), och vid bytet blir den nya hövding i huvudbyns förbindelse. När ledaren byts faller
// hälften av mutornas verkan bort (ledarBytet i byrel.ts), och världens krönika får raden Ny ledare.
import { balans } from './balans';
import { ledarBytet } from './byrel';
import { KROPP, egenskaperUr, namnUr } from './folk';
import { lever } from './rad';
import { BYSORTER, FastPerson, VarldRad } from './radtal';
import { hash3 } from './slump';
import { KOHANDELSER, PERIODRADER, laggIKo, periodSlut } from './varldslag';
import { varldHandelse } from './varldkronika';
import { Varlden } from './varlden';
import { DAY, SEC, Stat, State } from './typer';

export const RADPERSON = balans('radperson', {
  ledareFran: 25, ledareTill: 50, // en ny ledare är så här gammal (år i spelet, alltså dygn)
});

// slumptalen ur en nyckel: samma nyckel (och del) ger alltid samma följd
export const nyckelSlump = (nyckel: number, del = 0) => { let i = 0; return () => hash3(nyckel, i++, del, 0x46415354); };
// åldern vid döden för den som lever vid a0 år, ur slumptalet u: Gompertz-risken som i byn (steg.ts), utan små barns extra risk
export function dodsAlder(a0: number, u: number): number {
  const H = (a: number) => KROPP.dodBas * a + KROPP.dodAlder / KROPP.dodTakt * Math.exp(KROPP.dodTakt * a);
  const mal = H(a0) - Math.log(Math.max(1e-12, u));
  let lo = a0, hi = a0 + 10;
  while (H(hi) < mal) hi += 10;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (H(m) < mal) lo = m; else hi = m; }
  return hi;
}
// en fast person ur sin nyckel, vid tiden t; namnet och könet kan komma från någon huvudbyn redan känner
export function fastUr(nyckel: number, t: number, roll: FastPerson['roll'], o: { namn?: string; kon?: 'm' | 'k' } = {}): FastPerson {
  const r = nyckelSlump(nyckel), kon0: 'm' | 'k' = r() < 0.5 ? 'm' : 'k', kon = o.kon ?? kon0, namn = namnUr(kon, r);
  const alder = RADPERSON.ledareFran + r() * (RADPERSON.ledareTill - RADPERSON.ledareFran);
  const fodd = Math.round(t - alder * DAY);
  return { namn: o.namn ?? namn, kon, fodd, roll, nyckel, dor: Math.max(t + 1, Math.round(fodd + dodsAlder(alder, r()) * DAY)) };
}
// egenskaperna, som en bybos, ur nyckeln (en egen följd, så att de inte beror på namnet)
export const fastEgenskaper = (f: FastPerson): Record<Stat, number> | undefined => f.nyckel === undefined ? undefined : egenskaperUr(nyckelSlump(f.nyckel, 1));
export const radLedare = (r: VarldRad): FastPerson | undefined => r.ledare === undefined ? undefined : r.fasta[r.ledare];

// huvudbyns förbindelse får den nya ledaren som hövding, och den döda försvinner ur den
function synLedare(r: VarldRad, f: FastPerson, gammal?: FastPerson) {
  const k = r.syn;
  if (!k) return;
  if (gammal) k.personer = k.personer.filter(q => !(q.namn === gammal.namn && q.sex === gammal.kon && (q.roll === 'hovding' || q.roll === 'grundare')));
  if (!k.personer.some(q => q.namn === f.namn && q.sex === f.kon)) k.personer.unshift({ namn: f.namn, sex: f.kon, roll: 'hovding', fodd: f.fodd });
}
// en ny ledare tillsätts vid tiden t, och hens död läggs i kön
export function tillsatt(vl: Varlden, r: VarldRad, t: number, forsta = false): FastPerson {
  const kand = forsta ? r.syn?.personer.find(q => q.roll === 'hovding') ?? r.syn?.personer.find(q => q.roll === 'grundare') : undefined;
  const nyckel = Math.floor(hash3(vl.fro, r.nr, Math.floor(t / SEC), 0x4c454452) * 2 ** 31);
  const f = fastUr(nyckel, t, 'ledare', kand ? { namn: kand.namn, kon: kand.sex } : {});
  r.fasta.push(f); r.ledare = r.fasta.length - 1;
  laggIKo(vl, f.dor!, 'ledare', { sak: r.nr, data: { nyckel } });
  return f;
}

// ledaren dör vid sin tid: en ny tillsätts i en by som lever, och mutorna förlorar hälften av sin verkan
KOHANDELSER.ledare = (_s: State, vl: Varlden, p) => {
  const r = vl.rader?.find(x => x.nr === p.sak), l = r && radLedare(r);
  if (!r || !l || l.nyckel !== p.data?.nyckel) return;
  r.fasta.splice(r.ledare!, 1); delete r.ledare;
  ledarBytet(vl, r.nr);
  if (!lever(vl, r) || !BYSORTER[r.sort].ledare) return;
  synLedare(r, tillsatt(vl, r, p.t), l);
  varldHandelse(vl, 'nyLedare', p.t, { by: r.nr });
};
// varje timme: en by som lever efter radens regler och ska ha en ledare men saknar en får en
PERIODRADER.push({ namn: 'radens ledare', period: 'timme', fn: (_s, vl, n) => {
  for (const r of vl.rader ?? []) if (r.ledare === undefined && lever(vl, r) && BYSORTER[r.sort].ledare) synLedare(r, tillsatt(vl, r, periodSlut(vl, 'timme', n), true));
} });
