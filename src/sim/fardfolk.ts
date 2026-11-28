// ---------- de som går på en annan bys färd (steg B.39, Flera samhällen: Priset och handeln mellan byar) ----------
// När en färd ger sig av får den så många av byns kända personer som den har folk: de i förbindelsen (r.syn) och radens fasta,
// de som lever, är vuxna, inte leder byn och inte är borta eller ute på en annan färd. Räcker de inte får byn nya personer ur
// namnregistret (fastUr, ur världens frö), som sparas bland radens fasta med rollen fard. Namnen sparas på färden, med ledaren
// av färden först. Handlaren till huvudbyn är en av byns handlare, och sändebudet och flocken har samma namn när de kommer in.
import type { RadFard } from './byhandling';
import { enhet } from './radanfall';
import { KLAN } from './klaner';
import { fastUr, radLedare } from './radperson';
import { FastPerson, VarldRad, radNr } from './radtal';
import { SAKER } from './saker';
import { VARUGRUPPER, VarugruppId } from './priser';
import { byPlats, varldPlatsNr } from './landmarken';
import { tamArt } from './tamdjur';
import { uppdragDef, uppdragNr } from './uppdrag';
import { fastaI } from './vacktfasta';
import { varldSlump } from './varldslag';
import { Varlden } from './varlden';
import { DAY, State } from './typer';
import { balans } from './balans';

export const FARDFOLK = balans('fardfolk', {
  vuxen: 16, // år i spelet, så gammal är den yngsta som går på en färd
});
const nyFast = (vl: Varlden, r: VarldRad, f: RadFard, i: number): FastPerson => {
  const p = fastUr(Math.floor(varldSlump(vl, r.nr, f.id, 0x46445246 + i) * 2 ** 31), f.t0, 'fard');
  return p;
};
// färden f får sitt folk: n personer ur byn
export function namnFolk(vl: Varlden, f: RadFard, n: number) {
  const r = radNr(vl, f.fran);
  if (!r) return;
  const ute = new Set((vl.farder ?? []).flatMap(x => x !== f && x.fran === f.fran ? x.folk ?? [] : [])), led = radLedare(r)?.namn;
  // de döda av radens färdfolk glöms, så att listan inte växer
  const l = r.ledare === undefined ? undefined : r.fasta[r.ledare];
  r.fasta = r.fasta.filter(p => p.roll !== 'fard' || p.dor === undefined || p.dor > f.t0);
  if (l) r.ledare = r.fasta.indexOf(l);
  const pool = fastaI(r, f.t0).filter(p => p.namn !== led && p.roll !== 'hovding' && p.kp?.id === undefined && !ute.has(p.namn) && (p.fodd === undefined || f.t0 - p.fodd >= FARDFOLK.vuxen * DAY));
  const folk: string[] = [];
  if (f.handlare && r.syn) { // handlaren: en av byns handlare, och en ny när byn har få (som klanHandlare)
    const har = pool.filter(p => p.roll === 'handlare'), u = varldSlump(vl, r.nr, f.id, 0x46444c48);
    if (har.length >= KLAN.handlarePer || har.length && u < 0.5) folk.push(har[Math.floor(u * har.length) % har.length].namn);
    else { const p = nyFast(vl, r, f, 900); r.syn.personer.push({ namn: p.namn, sex: p.kon, roll: 'handlare', fodd: p.fodd }); folk.push(p.namn); }
  }
  const forst = f.anfall ? pool.filter(p => p.roll === 'rovare') : []; // de som rövat förut går på plundringen igen
  for (const p of [...forst, ...pool.filter(q => !forst.includes(q) && q.roll !== 'handlare' && q.roll !== 'rovare'), ...pool.filter(q => q.roll === 'handlare')]) if (folk.length < n && !folk.includes(p.namn)) folk.push(p.namn);
  const tagna = new Set([...fastaI(r, f.t0).map(p => p.namn), ...ute, ...folk]);
  for (let i = 0; folk.length < n && i < n + 40; i++) {
    const p = nyFast(vl, r, f, i);
    if (tagna.has(p.namn)) continue; // två i samma by heter inte lika
    tagna.add(p.namn); r.fasta.push(p); folk.push(p.namn);
  }
  if (folk.length) f.folk = folk;
}
// namnet och könet på den i:te som går, när hen kommer in på huvudbyns karta
export function fardPerson(vl: Varlden, f: RadFard, i: number): { namn: string; sex: 'm' | 'k' } | undefined {
  const namn = f.folk?.[i], r = namn !== undefined ? radNr(vl, f.fran) : undefined;
  const p = r && fastaI(r, f.t0).find(q => q.namn === namn);
  return p && { namn: p.namn, sex: p.kon };
}
// n av dem som går dör vid t: de sista i raden. Har huvudbyn sett vem som dog (byns döda i förbindelsen) är det de
export function fardDoda(vl: Varlden, f: RadFard, n: number, t: number) {
  const r = radNr(vl, f.fran);
  if (!f.folk || !r) return;
  const doda = new Set((r.syn?.doda ?? []).filter(d => d.t >= f.t0).map(d => d.namn)), kanda = f.folk.filter(q => doda.has(q)).slice(0, n), rest = f.folk.filter(q => !kanda.includes(q));
  const ut = [...kanda, ...rest.splice(Math.max(0, rest.length - (n - kanda.length)))];
  for (const namn of ut) { const p = r.fasta.find(q => q.namn === namn && q.roll !== 'ledare'); if (p) p.dor = Math.min(p.dor ?? t, t); else if (r.syn) r.syn.personer = r.syn.personer.filter(q => q.namn !== namn || q.roll === 'handlare'); }
  f.folk = f.folk.filter(q => !ut.includes(q));
}

// ---------- färdens ruta ----------
export interface FardRuta { titel: string; fran: string; till: string; varfor: string; folk: string[]; antal: number; djur: string[]; bar: string[]; hemat: boolean; kvar: number } // kvar: dygn till dit den ska (eller hem)
const grupp = (g: VarugruppId, n: number) => g === 'mat' ? `${n} portioner mat` : `${VARUGRUPPER[g].namn.toLowerCase()} värt ${Math.round(n * enhet(g))}`;
// så många är med på färden (utan namn i en äldre sparning)
export const fardAntal = (f: RadFard, barare: number) => f.flytt ?? f.folk?.length ?? f.anfall ?? (f.besked ? 1 : f.handlare ? f.last?.folk ?? 1 : barare);
export function fardRuta(s: State, f: RadFard, barare: number): FardRuta | undefined {
  const vl = s.varld, a = vl && byPlats(vl, f.fran), b = vl && (byPlats(vl, f.till) ?? varldPlatsNr(vl, f.till));
  if (!vl || !a || !b) return undefined;
  const hemat = f.vg ? f.gar === 'hem' : f.t2 !== undefined && s.now >= f.t1, u = f.uppdrag !== undefined && f.uppdrag >= 0 ? uppdragNr(vl, f.uppdrag) : undefined;
  const titel = f.flytt ? 'Flytt' : f.uppdrag !== undefined ? 'Uppdrag' : f.besked ? 'Sändebud' : f.anfall !== undefined ? 'Plundring' : f.gava ? 'Gåva' : f.last?.vagnar ? 'Karavan' : f.handlare ? 'Handlare' : 'Handelsfärd';
  const varfor = f.flytt ? `Flyttar till ${b.namn}` : f.uppdrag !== undefined ? (u ? uppdragDef(u.k).namn : 'Hämta det som finns kvar i ruinen') : f.besked ? (f.besked === 'besked' ? 'Ett vänligt besked' : 'Ett ovänligt besked') : f.anfall !== undefined ? `Plundra ${b.namn}` : f.gava ? `Ge en gåva till ${b.namn}` : f.handlare ? `Handla i ${b.namn}` : `Sälja ${VARUGRUPPER[f.g].namn.toLowerCase()} i ${b.namn}`;
  const bar: string[] = [], varor = new Map<string, number>();
  for (const w of [...f.last?.varor ?? [], ...f.hem ?? []]) varor.set(w.k, (varor.get(w.k) ?? 0) + w.n);
  for (const [k, n] of varor) bar.push(`${n} ${(SAKER[k as keyof typeof SAKER]?.namn ?? k).toLowerCase()}`);
  const silver = (hemat ? f.silver ?? 0 : 0) + (f.last?.silver ?? 0);
  if (silver > 0) bar.push(`${silver} silver`);
  if (!hemat && f.n > 0) bar.push(grupp(f.g, f.n));
  if (hemat && f.h && f.hn) bar.push(grupp(f.h, f.hn));
  if (hemat) for (const [g, n] of Object.entries(f.byte ?? {}) as [VarugruppId, number][]) if (n > 0) bar.push(grupp(g, n));
  const djur = [...f.last?.djur ? [tamArt(f.last.djur).namn] : [], ...f.last?.vagnar ? [f.last.vagnar === 1 ? 'en vagn' : `${f.last.vagnar} vagnar`] : []];
  return { titel, fran: a.namn, till: b.namn, varfor, folk: f.folk ?? [], antal: fardAntal(f, barare), djur, bar, hemat, kvar: Math.max(0, ((hemat ? f.t2! : f.t1) - s.now) / DAY) };
}
