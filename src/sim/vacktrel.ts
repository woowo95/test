// ---------- relationerna i den väckta byn (steg 11.13.18, Flera samhällen: Den väckta byn i tal) ----------
// Byggaren ger varje par i byn en relation som i en by i samma ålder: kemin dras som när två möts (getRel), och hur bra de kommit
// överens är kemins plats bland alla par i byn, översatt med fördelningen i testbyarna (RELFORDELNING: så stor del av paren som är
// ärkefiender, osams, bekanta, vänner och nära vänner efter många år ihop). Den som bara bott med den andra en kort tid har kommit
// mindre långt åt något håll (VACKT_REL.ar), och släkt börjar som släkt. Ensamma vuxna som kommit varandra nära kan ha blivit ett
// par som ännu inte gift sig. Bästa vännerna och ärkefienderna blir de som relationerna säger (RELT i relationer.ts), utan
// rader i loggen, eftersom det hände före besöket. Mentorerna och rivalerna kommer när byn går
import { balans } from './balans';
import { ageOf, ALDER, getRel, isKin, isParent, REL, relKey } from './folk';
import { RELT } from './relationer';
import { rnd } from './slump';
import { DAY, Person, State } from './typer';
import type { VarldRad } from './radtal';

// fördelningen efter många år ihop: andelen par under varje gräns (u) och relationen där (op), ur testbyarna efter 15–45 dygn
export const RELFORDELNING: [number, number][] = [[0, -90], [0.03, -45], [0.14, -10], [0.7, 25], [0.85, 60], [1, 95]];
export const VACKT_REL = balans('vacktrel', {
  ar: 15, // efter så många år ihop (dygn) har relationen kommit hela vägen; före det en del
  samtal: 1, // så många samtal per år ihop
  par: 0.4, // chansen att två ensamma vuxna som är goda vänner blivit ett par
  parOp: 55, parRom: 75, // det paret minst har i relation och romantik
});
const opAv = (u: number) => { for (let i = 1; i < RELFORDELNING.length; i++) { const [u1, o1] = RELFORDELNING[i], [u0, o0] = RELFORDELNING[i - 1]; if (u <= u1) return o0 + (o1 - o0) * (u - u0) / (u1 - u0); } return RELFORDELNING.at(-1)![1]; };

export function byggRelationer(b: State, r: VarldRad) {
  const folk = b.people.filter(p => p.died === undefined);
  const ihop = (p: Person, q: Person) => Math.max(0, (b.now - Math.max(p.born, q.born, r.grundad)) / DAY);
  const par: [Person, Person, import('./typer').Rel][] = [];
  for (let i = 0; i < folk.length; i++) for (let j = i + 1; j < folk.length; j++) {
    const p = folk[i], q = folk[j];
    if (b.rels[relKey(p.id, q.id)]?.talks) continue; // de fasta som besökarna redan känner (vacktfasta.ts)
    par.push([p, q, getRel(b, p, q)]);
  }
  // kemins plats bland paren (0–1) ger relationen efter många år ihop
  const ord = par.map((x, i) => [x[2].chem, i] as const).sort((a, c) => a[0] - c[0] || a[1] - c[1]), plats = new Map(ord.map(([, i], k) => [i, (k + 0.5) / ord.length]));
  par.forEach(([p, q, rel], i) => {
    const y = ihop(p, q), f = Math.min(1, y / VACKT_REL.ar);
    const op = Math.round(Math.max(-100, Math.min(100, f * opAv(plats.get(i)!) + (isKin(p, q) ? REL.slakt : 0))));
    rel.op = p.partner === q.id ? Math.max(rel.op, op) : op;
    rel.talks = Math.round(y * VACKT_REL.samtal);
  });
  // ensamma vuxna som kommit varandra nära: ett par som ännu inte gift sig
  const ensam = (p: Person) => p.partner === undefined && ageOf(p, b.now) >= ALDER.vuxen;
  for (const p of folk) {
    if (!ensam(p)) continue;
    let bast: Person | undefined, bv = REL.van;
    for (const q of folk) { const o = b.rels[relKey(p.id, q.id)]?.op ?? 0; if (q !== p && q.sex !== p.sex && ensam(q) && !isKin(p, q) && o > bv) { bv = o; bast = q; } }
    if (!bast || rnd(b, 'vackt') >= VACKT_REL.par) continue;
    const rel = getRel(b, p, bast);
    p.partner = bast.id; bast.partner = p.id;
    rel.op = Math.max(rel.op, VACKT_REL.parOp); rel.rom = Math.max(rel.rom, VACKT_REL.parRom);
    rel.par = b.now - Math.floor(rnd(b, 'vackt') * Math.min(RELT.giftDygn, ihop(p, bast))) * DAY; // (de gifter sig efter RELT.giftDygn)
  }
  // bästa vän och ärkefiende som stepRelationer (relationer.ts) väljer dem
  const op = (p: Person, q: Person) => b.rels[relKey(p.id, q.id)]?.op;
  const topp = new Map<Person, Person | undefined>();
  for (const p of folk) {
    let best: Person | undefined, bv = RELT.bastaVan;
    for (const q of folk) { const o = op(p, q); if (q !== p && p.partner !== q.id && !isParent(p, q) && !isParent(q, p) && o !== undefined && o > bv) { bv = o; best = q; } }
    topp.set(p, best);
  }
  for (const p of folk) {
    const q = topp.get(p);
    p.bast = q && topp.get(q) === p ? q.id : undefined;
    let worst: Person | undefined, wv = RELT.arke;
    for (const x of folk) { const o = op(p, x); if (x !== p && o !== undefined && o < wv) { wv = o; worst = x; } }
    p.arke = worst?.id;
  }
}
