import { JAKTSYN, Jaktforsok, Person, SEC, Task, arRadjur, jaktForlopp, living, taskName, taskText } from '../sim';
import { s, ui, vidNyBy } from './lage';

// ---------- jakten som syns (Björn efter v159, omskriven i steg 4.5.4.1) ----------
// Simuleringen planerar varje jaktförsök när det börjar (tk.jf) och räknar när allt händer (jaktForlopp i sim/jakt.ts).
// Här visas det i tur och ordning: jägaren letar efter hararna och går mot dem, smyger sedan jämnt fram (inga ryck) och
// stannar där hen tänker kasta (eller går ända fram), siktar 3–5 sekunder och kastar (eller sticker, eller griper). Haren
// sitter kvar så länge den inte sett jägaren; ser den hen får den ett utropstecken och flyr bort från jägaren, och hela
// flocken följer med (simuleringen flyttar flocken, djur.ts). Den träffade haren ligger kvar tills jägaren hämtar den, och
// jägaren hämtar spjutet och går tillbaka. Simuleringen ligger före bilden, så försöken sparas här tills tiden som visas
// har passerat dem
const forsok = new Map<number, Jaktforsok[]>(); // per jägare: de senaste försöken
vidNyBy.push(() => forsok.clear());
const LARM_S = 2.5, // så länge utropstecknet syns
  SLINGA = 1.2; // så mycket (rutor) jägaren slingrar åt sidan när hen letar

// varje bildruta: de försök som pågår i simuleringen sparas, så att de finns kvar när tiden som visas kommer dit
export function samlaJakt() {
  for (const p of living(s)) {
    const f = p.task?.act === 'jakt' ? p.task.jf : undefined;
    if (!f) continue;
    const l = forsok.get(p.id) ?? [];
    if (!l.some(x => x.t === f.t)) { l.push(f); if (l.length > 4) l.shift(); forsok.set(p.id, l); }
  }
}
const aktivt = (pid: number) => forsok.get(pid)?.find(f => ui.nu >= f.t && ui.nu < f.t + jaktForlopp(f).E * SEC);

type P = { x: number; y: number };
const mot = (a: P, b: P, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const avst = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
// vad jägaren gör vid tiden u (sekunder från början): var hen är, symbolen över huvudet och texten under Gör just nu
type Fas = { x: number; y: number; mark?: string; text: string };
function fasAv(f: Jaktforsok, u: number): Fas {
  const o = jaktForlopp(f), dj = arRadjur(f.id) ? 'rådjuret' : 'haren'; // rådjuret (steg 6.6.2)
  if (u < o.tS) { // letar: slingrar sig fram mot platsen där hen börjar smyga, i jämn fart
    const k = u / o.tS, d = avst(o.S, o.Q), nx = d > 0.01 ? -(o.Q.y - o.S.y) / d : 0, ny = d > 0.01 ? (o.Q.x - o.S.x) / d : 0;
    const sv = Math.sin(k * Math.PI * 3) * Math.sin(k * Math.PI) * SLINGA * Math.min(1, d / 2);
    const at = mot(o.S, o.Q, k);
    return { x: at.x + nx * sv, y: at.y + ny * sv, text: 'letar efter harar' };
  }
  if (u < o.tA) return { ...mot(o.Q, o.P, (u - o.tS) / (o.tA - o.tS)), mark: 'a_smyga', text: arRadjur(f.id) ? 'smyger mot ett rådjur' : 'smyger mot en hare' };
  if (u < o.tK) return { ...o.P, mark: o.kast ? 'a_sikta' : 'a_jaga', text: o.kast ? 'siktar' : f.hand ? `griper ${dj}` : 'sticker' };
  if (u < o.tI) return { ...o.P, mark: 'a_sikta', text: 'kastar' };
  const G = o.G ?? o.P, fangad = f.ut === 'fangad';
  const hamtar = o.kast ? (fangad ? `hämtar ${dj}` : f.v === 'sten' ? 'hämtar stenen' : 'hämtar spjutet') : fangad ? `tar ${dj}` : `ser ${dj} springa`;
  if (u < o.tG) return { ...mot(o.P, G, Math.min(1, (u - o.tI) / Math.max(0.01, o.tG - o.tI - 3))), text: hamtar };
  return { ...mot(G, o.S, Math.min(1, (u - o.tG) / Math.max(0.01, o.E - o.tG - 1))), text: fangad ? (arRadjur(f.id) ? 'tar hand om rådjuret' : 'bär haren') : 'går tillbaka' };
}

// var jägaren syns och vilken symbol hen har över huvudet, när ett försök pågår vid tiden som visas
export function jaktPlats(p: Person): { x: number; y: number; mark?: string } | undefined {
  const f = p.task?.act === 'jakt' || forsok.has(p.id) ? aktivt(p.id) : undefined;
  return f && fasAv(f, (ui.nu - f.t) / SEC);
}
// det jägaren gör just nu i bilden (Gör just nu, steg 4.5.4.1), eller ingenting om inget försök syns
export function jaktText(p: Person): string | undefined {
  const f = p.task?.act === 'jakt' || forsok.has(p.id) ? aktivt(p.id) : undefined;
  return f && fasAv(f, (ui.nu - f.t) / SEC).text;
}

// kaninerna som någon jagar just nu: var de syns, om de ligger fångade, och om de nyss såg jägaren (utropstecknet).
// Spjutet eller stenen i luften: från, till och hur långt det kommit
export interface JagadKanin { id: number; x: number; y: number; ligger: boolean; larm: boolean; radjur: boolean }
export function jagade(): { kaniner: JagadKanin[]; kast: { fran: P; till: P; k: number; sten: boolean }[] } {
  const kaniner: JagadKanin[] = [], kast: { fran: P; till: P; k: number; sten: boolean }[] = [];
  for (const [pid] of forsok) {
    const f = aktivt(pid);
    if (!f) continue;
    const u = (ui.nu - f.t) / SEC, o = jaktForlopp(f);
    if (o.kast && u >= o.tK && u < o.tI) kast.push({ fran: o.P, till: o.kanin(o.tI), k: (u - o.tK) / (o.tI - o.tK), sten: f.v === 'sten' });
    const ligger = f.ut === 'fangad' && u >= o.tI;
    if (ligger && u >= o.tG - 3) continue; // jägaren har tagit upp den
    if (!ligger && u >= o.tF + JAKTSYN.flyS) continue; // den har flytt och syns med de andra i flocken igen (som flytt med den)
    kaniner.push({ id: f.id, ...o.kanin(ligger ? o.tI : u), ligger, larm: u >= o.tF && u < o.tF + LARM_S, radjur: arRadjur(f.id) });
  }
  return { kaniner, kast };
}
// texten under Gör just nu: det jägaren gör i bilden, annars uppgiftens text (handlingar.ts)
export const gorText = (p: Person, t: Task) => { const j = t.act === 'jakt' ? jaktText(p) : undefined; return j ? `${taskName(t)}: ${j}` : taskText(t); };
