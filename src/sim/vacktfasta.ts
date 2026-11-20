// ---------- de fasta personerna i den väckta byn (steg 11.13.13, Flera samhällen: Den väckta byn i tal) ----------
// Byn byggs med de fasta personerna först: de huvudbyn känner (personerna i förbindelsen, r.syn: hövdingen, handlarna och de
// som kommit därifrån) och radens fasta personer (r.fasta: ledaren och de sällskapet mött). Den som har hela sin person sparad
// (kropp, gast.ts) kommer som den är; de andra byggs med sitt namn, kön och födelsedag, och ledaren med egenskaperna ur sin
// nyckel (fastEgenskaper). Den som är borta (i huvudbyn som gäst) eller död är inte där. När bybor från huvudbyn kommer på
// besök har de sina relationer med de fasta (KlanPerson.rel, gastrel.ts), och när de går hem följer det som hänt med tillbaka
import type { GastRel } from './gastrel';
import type { KlanPerson } from './klaner';
import { fastEgenskaper } from './radperson';
import type { FastPerson, VarldRad } from './radtal';
import { newPerson, nyPerson, relKey } from './folk';
import { freeNear } from './byggnad';
import { eldPlats } from './karta';
import { DAY, Person, State } from './typer';

const STANDARD_ALDER = 35; // år i spelet, för den som saknar födelsedag
// de fasta i raden: personerna i förbindelsen, sedan radens fasta som inte redan finns där
export function fastaI(r: VarldRad, t: number): { namn: string; kon: 'm' | 'k'; fodd?: number; roll: string; kp?: KlanPerson; fp?: FastPerson }[] {
  const ut: ReturnType<typeof fastaI> = [];
  const doda = new Set((r.syn?.doda ?? []).map(d => d.namn));
  for (const kp of r.syn?.personer ?? []) if (kp.borta === undefined && !doda.has(kp.namn)) ut.push({ namn: kp.namn, kon: kp.sex, fodd: kp.fodd, roll: kp.roll, kp });
  for (const fp of r.fasta) {
    if (fp.dor !== undefined && fp.dor <= t) continue;
    const q = ut.find(x => x.namn === fp.namn);
    if (q) q.fp = fp; // (hövdingen är radens ledare: egenskaperna ur nyckeln)
    else ut.push({ namn: fp.namn, kon: fp.kon, fodd: fp.fodd, roll: fp.roll, fp });
  }
  return ut;
}
// byggaren: de fasta först, så att folket fylls på runt dem (byggFolk i vackt.ts)
export function byggFasta(b: State, r: VarldRad) {
  const f0 = eldPlats(b);
  for (const q of fastaI(r, b.now).slice(0, Math.max(0, Math.round(r.tal.folk)))) {
    let p: Person;
    if (q.kp?.kropp) {
      p = nyPerson({ ...JSON.parse(JSON.stringify(q.kp.kropp)), id: b.nextId++, x: f0.x, y: f0.y } as Person);
      p.mother = undefined; p.father = undefined; p.partner = undefined; // släkten finns i den andra byn
      const at = freeNear(b, f0.x + 1, f0.y + 1); p.x = at.x; p.y = at.y;
    } else {
      p = newPerson(b, q.kon, q.fodd ?? b.now - STANDARD_ALDER * DAY);
      p.name = q.namn;
      const eg = q.fp && fastEgenskaper(q.fp);
      if (eg) p.pot = { ...eg };
    }
    p.fastRoll = q.roll;
    b.people.push(p);
  }
}
// den fasta personen i byn som är kp (samma namn och fast)
const fastAv = (b: State, kp: KlanPerson) => b.people.find(p => p.fastRoll !== undefined && p.died === undefined && p.name === kp.namn);
// besökarna kommer in: relationerna mellan de fasta och var och en (par: huvudbyns id och gästens id i byn)
export function fastaRelIn(b: State, r: VarldRad | undefined, par: [number, number][]) {
  for (const kp of r?.syn?.personer ?? []) {
    const f = fastAv(b, kp);
    if (!f || !kp.rel) continue;
    for (const [mid, gid] of par) {
      const g: GastRel | undefined = kp.rel[mid];
      if (g) b.rels[relKey(f.id, gid)] = { chem: g.chem, op: g.op, rom: 0, talks: g.n, flags: 0 };
    }
  }
}
// besökarna går hem: det som hänt mellan de fasta och var och en följer med tillbaka
export function fastaRelUt(b: State, r: VarldRad | undefined, par: [number, number][]) {
  for (const kp of r?.syn?.personer ?? []) {
    const f = fastAv(b, kp);
    if (!f) continue;
    for (const [mid, gid] of par) {
      const rel = b.rels[relKey(f.id, gid)];
      if (!rel) continue;
      const g = (kp.rel ??= {})[mid];
      kp.rel[mid] = { ...(g ?? { irr: 0 }), chem: rel.chem, op: rel.op, n: rel.talks } as GastRel;
    }
  }
}

// ---------- nya fasta personer (steg 11.13.14) ----------
// När byn somnar blir de som besökarna mött (pratat med) fasta personer i förbindelsen, med hela sin person och sina relationer
// med huvudbyns folk, så att de finns där nästa gång och kan komma på besök själva. De fasta som redan fanns sparas som de är nu
const kroppAv = (p: Person) => { const k = JSON.parse(JSON.stringify(p)) as Record<string, unknown>; for (const f of ['id', 'x', 'y', 'task', 'gast', 'fastRoll', 'path', 'pk']) delete k[f]; return k as KlanPerson['kropp']; };
export function nyaFasta(b: State, r: VarldRad) {
  const bes = b.besokare ?? {}, gids = Object.keys(bes).map(Number);
  if (!gids.length && !r.syn) return;
  for (const p of b.people) {
    if (p.gast || p.died !== undefined) continue;
    const rel: Record<number, GastRel> = {};
    for (const gid of gids) { const q = b.rels[relKey(p.id, gid)]; if (q && q.talks > 0) rel[bes[gid]] = { chem: q.chem, op: q.op, irr: 0, n: q.talks }; }
    const kp = r.syn?.personer.find(q => q.namn === p.name && p.fastRoll !== undefined);
    if (kp) { kp.kropp = kroppAv(p); kp.fodd = p.born; for (const [m, g] of Object.entries(rel)) (kp.rel ??= {})[+m] = { ...(kp.rel?.[+m] ?? {}), ...g }; continue; }
    if (!Object.keys(rel).length || p.fastRoll !== undefined) continue;
    if (r.syn) r.syn.personer.push({ namn: p.name, sex: p.sex, roll: 'mott', fodd: p.born, rel, kropp: kroppAv(p) });
    else if (!r.fasta.some(q => q.namn === p.name)) r.fasta.push({ namn: p.name, kon: p.sex, fodd: p.born, roll: 'mott' });
    p.fastRoll = 'mott';
  }
}
