import { JAKT, Jaktforsok, Person, SEC, living } from '../sim';
import { s, ui, vidNyBy } from './lage';

// ---------- jakten som syns (Björn efter v159) ----------
// Simuleringen planerar varje jaktförsök när det börjar (tk.jf, jakt.ts). Här visas det i tur och ordning: jägaren smyger
// fram, ett par steg i taget med pauser, och stannar där hen tänker kasta (eller går ända fram). Sedan siktar hen och kastar
// (eller sticker, eller griper). Kaninen sitter kvar så länge den inte sett jägaren; ser den hen får den ett utropstecken och
// flyr. Den träffade kaninen ligger kvar tills jägaren hämtar den, och jägaren hämtar spjutet och går tillbaka. Simuleringen
// ligger före bilden, så försöken sparas här tills tiden som visas har passerat dem
const forsok = new Map<number, Jaktforsok[]>(); // per jägare: de senaste försöken
vidNyBy.push(() => forsok.clear());
const SMYG = 0.8, // så stor del av smygtiden går åt till att smyga fram, sedan slår jägaren till
  STEG_S = 12, GAR_S = 5, // jägaren smyger GAR_S sekunder och står still resten av varje STEG_S
  SIKTA_S = 25, SIKTA_SETT_S = 2, // sekunder jägaren siktar på en kanin som sitter still, och efter en som flyr
  KAST_FART = 8, // rutor i sekunden som spjutet eller stenen flyger
  FLY = 6, FLY_S = 1.6, // kaninen flyr så här många rutor på så här många sekunder
  LARM_S = 2.5, // så länge utropstecknet syns
  GA = 1.6; // rutor i sekunden jägaren går när hen hämtar och går tillbaka (som GANG.fart i gang.ts)

// varje bildruta: de försök som pågår i simuleringen sparas, så att de finns kvar när tiden som visas kommer dit
export function samlaJakt() {
  for (const p of living(s)) {
    const f = p.task?.act === 'jakt' ? p.task.jf : undefined;
    if (!f) continue;
    const l = forsok.get(p.id) ?? [];
    if (!l.some(x => x.t === f.t)) { l.push(f); if (l.length > 4) l.shift(); forsok.set(p.id, l); }
  }
}
const langd = (f: Jaktforsok) => JAKT.smygSek + f.extra;
const aktivt = (pid: number) => forsok.get(pid)?.find(f => ui.nu >= f.t && ui.nu < f.t + langd(f) * SEC);

type P = { x: number; y: number };
const mot = (a: P, b: P, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const avst = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
// hur försöket går, i sekunder från början: var jägaren stannar (P), när hen slår till och var kaninen och det kastade hamnar
function forlopp(f: Jaktforsok) {
  const T = JAKT.smygSek, tA = T * SMYG, R = { x: f.x, y: f.y }, S = { x: f.sx, y: f.sy }, d0 = avst(R, S);
  const P = d0 > f.stopp ? mot(R, S, f.stopp / d0) : S; // där jägaren stannar, på vägen mellan hen och kaninen
  const kast = f.kast > 0, tK = kast ? tA + (f.sett ? SIKTA_SETT_S : SIKTA_S) : tA, tI = tK + (kast ? Math.max(0.6, f.kast / KAST_FART) : 0.5);
  const tF = f.sett ? tA : f.ut === 'fangad' ? Infinity : tI; // när kaninen flyr
  const dP = avst(R, P) || 1, ut = { x: (R.x - P.x) / dP, y: (R.y - P.y) / dP }; // bort från jägaren
  const kanin = (u: number) => u < tF ? R : mot(R, { x: R.x + ut.x * FLY, y: R.y + ut.y * FLY }, Math.min(1, (u - tF) / FLY_S));
  const traffad = kanin(tI); // där kaninen var när det slog till
  const G = kast ? (f.ut === 'miss' || f.ut === 'flydde' ? { x: traffad.x + ut.x, y: traffad.y + ut.y } : traffad) : f.ut === 'fangad' ? traffad : undefined; // det jägaren hämtar
  const E = langd(f), tG = G ? tI + avst(P, G) / GA : tI; // jägaren är framme vid det hen hämtar
  const tL = Math.max(tG + 3, E - avst(G ?? P, S) / GA); // ... och går tillbaka så att hen är framme när försöket är slut
  return { tA, tK, tI, tF, P, S, R, G, E, tG, tL, kanin, kast };
}

// var jägaren syns och vilken symbol hen har över huvudet, när ett försök pågår vid tiden som visas
export function jaktPlats(p: Person): { x: number; y: number; mark?: string } | undefined {
  const f = p.task?.act === 'jakt' || forsok.has(p.id) ? aktivt(p.id) : undefined;
  if (!f) return undefined;
  const u = (ui.nu - f.t) / SEC, o = forlopp(f);
  if (u < o.tA) { // smyger: några steg, och står still och lyssnar
    const n = Math.max(1, Math.floor(o.tA / STEG_S)), k = Math.floor(u / STEG_S), d = Math.min(1, (u - k * STEG_S) / GAR_S);
    return { ...mot(o.S, o.P, Math.min(1, (k + d) / n)), mark: 'a_smyga' };
  }
  if (u < o.tI) return { ...o.P, mark: o.kast ? 'a_sikta' : 'a_jaga' };
  const G = o.G ?? o.P;
  if (u < o.tG) return mot(o.P, G, (u - o.tI) / Math.max(0.01, o.tG - o.tI));
  if (u < o.tL) return G;
  return mot(G, o.S, Math.min(1, (u - o.tL) / Math.max(0.01, o.E - o.tL)));
}

// kaninerna som någon jagar just nu: var de syns, om de ligger fångade, och om de nyss såg jägaren (utropstecknet).
// Spjutet eller stenen i luften: från, till och hur långt det kommit
export interface JagadKanin { id: number; x: number; y: number; ligger: boolean; larm: boolean }
export function jagade(): { kaniner: JagadKanin[]; kast: { fran: P; till: P; k: number; sten: boolean }[] } {
  const kaniner: JagadKanin[] = [], kast: { fran: P; till: P; k: number; sten: boolean }[] = [];
  for (const [pid] of forsok) {
    const f = aktivt(pid);
    if (!f) continue;
    const u = (ui.nu - f.t) / SEC, o = forlopp(f);
    if (o.kast && u >= o.tK && u < o.tI) kast.push({ fran: o.P, till: o.kanin(o.tI), k: (u - o.tK) / (o.tI - o.tK), sten: f.v === 'sten' });
    const ligger = f.ut === 'fangad' && u >= o.tI;
    if (ligger && u >= o.tG) continue; // jägaren har tagit upp den
    if (!ligger && u >= o.tF + FLY_S) continue; // den har flytt och syns som de andra kaninerna igen
    kaniner.push({ id: f.id, ...o.kanin(ligger ? o.tI : u), ligger, larm: u >= o.tF && u < o.tF + LARM_S });
  }
  return { kaniner, kast };
}
