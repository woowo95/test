// ---------- värde ----------
// Varje sak har ett grundvärde som spelet räknar ur registren, ungefär i arbetstimmar (steg 1.4.1):
// - det man samlar: tiden det tar att skaffa en (takten i arbetet i handlingar.ts, eller `tid` i saker.ts),
// - det man gör: värdet av det den görs av plus arbetstiden (`av` och `min` i saker.ts),
// - ett påslag per teknisk nivå (tekniken som behövs och de tekniker den bygger på, teknik.ts), och för sällsynta råvaror.
// En sak från en senare teknik är alltid värd mer än de enkla råvarorna av samma slag (mappen i saker.ts), även när
// råvaran tar längre tid att samla: kött är värt mer än bär. Grundvärdet är fast; i ett byte värderar var och en saken
// som grundvärdet gånger sitt eget behov av den (behovAv i behov.ts). Ett ting och en stack är värda grundvärdet gånger sitt skick; kvaliteten räknas in
// när den finns (steg 2.2.2).
// Byns rikedom är förrådet, redskapen och husen (husets material och arbete). Delningen (delning.ts) läser den.
import { ACTS, SNABBARE } from './handlingar';
import { SAKER, SAK_LIST } from './saker';
import { TEK } from './teknik';
import { agarVarde, wornOf } from './lager';
import { Ting, tingOf } from './agande';
import { kvVarde } from './kvalitet';
import { Bit, Hus, MATERIAL, bitsOf, housesOf } from './byggnad';
import { State } from './typer';
import { balans } from './balans';

export const ARBETE = 1; // värdet av en arbetstimme
// Balanstalen (regel 8). Läses bara inne i funktionerna: varde.ts ingår i en ring av importer
export const VARDE = balans('varde', {
  nivaPaslag: 0.25, // så mycket mer en sak är värd för varje teknisk nivå
  sallsynt: 1.5, // så mycket mer en sällsynt råvara är värd
  konst: 0.5, // så mycket mer ett mästerverk med ristningar eller en målning är värt (steg 4.3.3)
  kartKand: 3, kartRykte: 1, // en karta är värd bladet plus så mycket för varje känd plats och varje rykte, gånger kvaliteten (steg 11.7.5)
});

// det som kommer ur en bränning (kolet ur milan, järnet ur blästerugnen; brann.ts) görs som en sak: värdet av det som går in
// plus arbetet vid stationen, delat på det som kommer ut, och tekniken för bränningen ger nivån. Registreras av brann.ts
interface Ur { av: Record<string, number>; min: number; ger: number; tek: string; tid?: undefined; act?: undefined; sallsynt?: undefined }
const UR: Record<string, Ur> = {};
export function vardeUr(k: string, u: Ur) { UR[k] = u; raVarde.clear(); varden.clear(); sakNiva.clear(); }

// den tekniska nivån: en teknik utan krav är nivå 1, och varje teknik den bygger på lägger till en
const tekNiva = new Map<string, number>();
function nivaOfTek(id: string): number {
  let n = tekNiva.get(id);
  if (n === undefined) { const t = TEK[id]; n = 1 + Math.max(0, ...(t?.krav ?? []).map(nivaOfTek)); tekNiva.set(id, n); }
  return n;
}
// en saks nivå: tekniken den kräver, eller den högsta nivån bland det den görs av. Råvaror utan teknik är nivå 0
const sakNiva = new Map<string, number>();
export function nivaOf(k: string): number {
  let n = sakNiva.get(k);
  if (n === undefined) {
    const f = UR[k] ?? SAKER[k]?.skaffa;
    n = Math.max(f?.tek ? nivaOfTek(f.tek) : 0, ...Object.keys(f?.av ?? {}).map(nivaOf));
    sakNiva.set(k, n);
  }
  return n;
}
// arbetstimmar för att skaffa en i ett arbete: grundtakten i handlingen (eller i arbetet den hör till) gånger årstidernas
// medel och arbetets takt. Där platsen avgör takten (takt 0 eller ingen takt) räknas en full plats. Samlandets fart (steg 2.12.4)
// räknas inte: den gör bara att famnen fylls på en tur, och gången dit och mellan buskarna tar ändå tiden
function actTid(act: string) {
  const a = ACTS[act as keyof typeof ACTS], d = a?.arbete ? ACTS[a.arbete as keyof typeof ACTS] : a;
  if (!a || !d?.bas) return 0;
  const sas = d.sasong ? d.sasong.reduce((x, y) => x + y, 0) / d.sasong.length : 1;
  return 1 / (d.bas * SNABBARE * sas * (a.takt || 1));
}
// värdet innan golvet för nivån
const raVarde = new Map<string, number>();
function rakna(k: string): number {
  let v = raVarde.get(k);
  if (v !== undefined) return v;
  const f = UR[k] ?? SAKER[k]?.skaffa;
  if (SAKER[k]?.varde !== undefined) v = SAKER[k]!.varde!; // silvret
  else if (!f) v = 0;
  else {
    // en sak med egen tid (hö, flinta) räknas på den; arbetet (act) säger då bara vem som skaffar den (steg 6.2.19)
    let x = (f.tid ?? 0) / SNABBARE + (f.act && f.tid === undefined ? actTid(f.act) : 0) + (f.min ?? 0) / 60 * ARBETE;
    for (const j in f.av ?? {}) x += f.av![j] * grundvarde(j);
    x /= f.ger ?? 1; // ett recept som ger flera (en ved blir fyra näver)
    v = x * (1 + VARDE.nivaPaslag * nivaOf(k)) * (f.sallsynt ? VARDE.sallsynt : 1);
  }
  raVarde.set(k, v);
  return v;
}
// grundvärdet för en (ett styck, en portion) i nytt skick
const varden = new Map<string, number>();
export function grundvarde(k: string): number {
  let v = varden.get(k);
  if (v !== undefined) return v;
  v = rakna(k);
  const n = nivaOf(k), mapp = SAKER[k]?.mapp;
  if (n > 0 && mapp) { // golvet: mer än de enkla råvarorna av samma slag
    const ra = SAK_LIST.filter(j => SAKER[j]!.mapp === mapp && nivaOf(j) === 0 && !SAKER[j]!.skaffa?.av && SAKER[j]!.varde === undefined).map(rakna); // det köpta med fast värde (saltet) höjer inte golvet
    if (ra.length) v = Math.max(v, Math.max(...ra) * (1 + VARDE.nivaPaslag * n));
  }
  varden.set(k, v);
  return v;
}

// grundvärdet av en uppsättning saker (id till mängd), lagt till `start` (summeras i uppsättningens ordning)
export function varuVarde(o: Record<string, number>, start = 0) { let v = start; for (const k in o) v += o[k] * grundvarde(k); return v; }

// ---------- byns rikedom ----------
interface Rikedom { forrad: number; redskap: number; hus: number }
// vad ett ting är värt: ett påbörjat redskap (paborjat.ts) är värt sitt material, ett redskap grundvärdet gånger skicket
// och kvaliteten (kvalitet.ts)
// kartans värde (steg 11.7.5): bladet plus VARDE.kartKand för varje känd plats och VARDE.kartRykte för varje rykte, gånger
// kvaliteten. kanner = det köparen redan vet om en plats (nivån, undefined: okänd): hen räknar bara platser hen känner sämre
export function kartVarde(k: { platser?: { nr: number; v: number }[]; q?: number }, kanner?: (nr: number) => number | undefined) {
  let v = grundvarde('blad');
  for (const x of k.platser ?? []) if (!kanner || (kanner(x.nr) ?? -1) < x.v) v += x.v >= 1 ? VARDE.kartKand : VARDE.kartRykte;
  return v * kvVarde(k);
}
// det som ligger i tinget och är värt något utöver det (vinet som mognat, tunna.ts, steg 12.4.6), satt där (filen läses efter den här)
export const vardeKrok = { inne: (_t: Ting) => 0 };
export const tingVarde = (t: Ting) => (t.skrift?.platser ? kartVarde(t.skrift) * t.c : t.halv ? varuVarde(t.halv.av) : grundvarde(t.k) * t.c * kvVarde(t) * (t.ber?.mo ? 1 + VARDE.konst : 1)) + (t.inne ? vardeKrok.inne(t) : 0);
export function rikedomDelar(s: State): Rikedom {
  let forrad = 0, redskap = 0, hus = 0;
  for (const k of SAK_LIST) if (!SAKER[k]!.redskap) forrad += wornOf(s, k) * grundvarde(k);
  for (const t of tingOf(s)) redskap += tingVarde(t);
  redskap += djurVarde(s); // djuren räknas som redskapen (steg 9.8.1)
  for (const b of bitsOf(s)) if (b.hus !== undefined) hus += bitVarde(b);
  return { forrad, redskap, hus };
}
// husen: materialet som lagts i väggar och golv och arbetet med dem, gånger skicket
const bitVarde = (b: Bit) => { const M = MATERIAL[b.m]; return M ? ((M.item ? b.mat * grundvarde(M.item) : 0) + M.tim * Math.min(1, b.b) * ARBETE) * b.c : 0; };
export const husVarde = (s: State, h: Hus) => bitsOf(s).reduce((a, b) => a + (b.hus === h.id ? bitVarde(b) : 0), 0);
export function rikedom(s: State) { const r = rikedomDelar(s); return r.forrad + r.redskap + r.hus; }

// ---------- var och ens förmögenhet (steg 3.2.1) ----------
// egen: vad var och en äger (andelar i förrådet, redskap och egna hus); byn: det gemensamma, byns rikedom minus det som är någons
export function formogenheter(s: State) {
  const egen = agarVarde(s, grundvarde);
  const lagg = (id: number, v: number) => egen.set(id, (egen.get(id) ?? 0) + v);
  for (const t of tingOf(s)) if (t.agare) lagg(t.agare, tingVarde(t));
  for (const h of housesOf(s)) if (h.ag !== undefined) lagg(h.ag, husVarde(s, h));
  for (const d of tamdjurOf(s)) if (d.agare !== undefined) lagg(d.agare, tamArt(d.art).varde); // djuren (steg 9.8.1)
  if (s.hons?.agare !== undefined) lagg(s.hons.agare, honsVarde(s)); // hönsen (steg 9.8.10)
  for (const t of samhallen(s)) if (t.ag !== undefined) lagg(t.ag, BIN.varde); // bisamhällena (steg 10.10.17)
  egen.delete(0); // byns del räknas som resten
  let sum = 0; for (const v of egen.values()) sum += v;
  return { egen, byn: Math.max(0, rikedom(s) - sum) };
}
// djuren id äger: tamdjuren, hönsen och bisamhällena, som räknas med redskapen och aldrig är betalning (skatten)
export const agdaDjur = (s: State, id: number) => djurVarde(s, id) + (s.hons?.agare === id ? honsVarde(s) : 0) + samhallen(s).filter(t => t.ag === id).length * BIN.varde;
// en persons förmögenhet i delar (steg 3.6.4): redskapen, kläderna (var de än ligger, också i kistan), andelarna i förrådet och egna hus
export function formogenhetDelar(s: State, id: number) {
  let redskap = 0, klader = 0, hus = 0;
  for (const t of tingOf(s)) if (t.agare === id) { if (SAKER[t.k]?.klad) klader += tingVarde(t); else redskap += tingVarde(t); }
  redskap += agdaDjur(s, id); // djuren (steg 9.8.1), hönsen och bisamhällena (steg 12.1.60)
  const forrad = agarVarde(s, grundvarde).get(id) ?? 0;
  for (const h of housesOf(s)) if (h.ag === id) hus += husVarde(s, h);
  return { redskap, klader, forrad, hus, sum: redskap + klader + forrad + hus };
}
import { djurVarde, tamArt, tamdjurOf } from './tamdjur';
import { honsVarde } from './hons';
import { BIN, samhallen } from './bin';
