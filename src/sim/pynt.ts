import { HOUR, Person, State } from './typer';
import { alive, byId, count, living } from './folk';
import { balans } from './balans';
import { roomAt } from './byggnad';
import { handelse } from './rykten';
import { kvOf } from './kvalitet';
import { krukaPyntQ } from './kruka';
import { isKlar, krukaHemma, sovrum, stationDef, stationRum, stationerOf } from './stationer';
import { tanke } from './tankar';

// ---------- pyntet i hemmen (steg 4.3.4) ----------
// Lerkrukan (ett ting, kruka.ts) och mattorna (pynt i STATIONER, stationer.ts) är bara till för att pynta.
// Var och en som är vuxen och sover inne bygger ett åt sig själv, av den sort hen tycker om (gillarPynt i stationer.ts), och ställer det i
// rummet där hen sover: i familjens hus eller i byns hus där hen sover. Högst ett var, så att byn inte fylls av små saker.
// Som alla möbler får det en kvalitet när det blir klart, och ett mästerverk kan få en berättelse och ett motiv (4.3.3).
// Varje timme: ägaren som är i rummet trivs (en tanke, mer ju finare pyntet är), och de andra som är vakna där ser det och
// får ett bättre intryck av ägaren (smakfull, rykten.ts), också det mer ju finare det är. Ett uselt pynt ger ingenting.
export const PYNT = balans('pynt', {
  glad: [0, 0.01, 0.02, 0.03, 0.05, 0.08], // ägarens humör i rummet med pyntet, per kvalitet (usel till ★) ...
  gladTim: 1.5, // ... och så många timmar efter att hen gått därifrån
  syn: [0, 0.005, 0.01, 0.015, 0.025, 0.05], // så mycket (vikten i intrycket smakfull) får den som ser det varje timme
});

// står p i rummet rum?
const iRum = (s: State, p: Person, rum: unknown, rumAv: Map<Person, unknown>) => { if (!rum) return false; if (!rumAv.has(p)) rumAv.set(p, roomAt(s, Math.floor(p.x), Math.floor(p.y))); return rumAv.get(p) === rum; }; // (rummet frågas en gång per person)

// en gång i timmen (steg.ts)
export function stepPynt(s: State, h = 1) { // h: timmarna sedan sist (TAKTER)
  const rumAv = new Map<Person, unknown>();
  // pyntet räknas på det som står i rummet (steg 9.4.12): möblerna och lerkrukorna i rummet där ägaren sover
  const pynt: { o: Person; rum: unknown; q: number; namn: string }[] = [];
  for (const t of stationerOf(s)) {
    const d = stationDef(t.k);
    if (!d?.pynt || !isKlar(t) || t.ag === undefined) continue;
    const o = byId(s, t.ag), rum = stationRum(s, t);
    if (o && alive(o) && rum) pynt.push({ o, rum, q: Math.min(kvOf(t) + (d.pyntQ ?? 0), PYNT.glad.length - 1), namn: d.namn.toLowerCase() }); // den stora och den runda mattan är ett steg finare (steg 10.7.6)
  }
  for (const o of living(s)) { const k = krukaHemma(s, o); if (k) pynt.push({ o, rum: sovrum(s, o), q: krukaPyntQ(k), namn: 'lerkruka' }); } // en blommande kruka är ett steg finare (steg 10.7.3)
  // ägaren trivs av det finaste pyntet i rummet där hen är (en tanke, inte en per pynt)
  const glad = new Map<Person, number>();
  for (const { o, rum, q } of pynt) if (PYNT.glad[q] > 0 && iRum(s, o, rum, rumAv)) glad.set(o, Math.max(glad.get(o) ?? 0, PYNT.glad[q]));
  for (const [o, v] of glad) { tanke(o, 'pynt', s.now, { v, tid: PYNT.gladTim * HOUR }); count(s, 'pyntGlad'); }
  // de som ser det får intrycket av det finaste pyntet ägaren har i rummet, inte ett per pynt (steg 10.7.2)
  const finast: typeof pynt = [];
  for (const x of pynt) { const i = finast.findIndex(f => f.o === x.o && f.rum === x.rum); if (i < 0) finast.push(x); else if (x.q > finast[i].q) finast[i] = x; }
  for (const { o, rum, q, namn } of finast) {
    if (PYNT.syn[q] <= 0) continue;
    for (const v of living(s)) {
      if (v === o || v.task?.act === 'sova' || !iRum(s, v, rum, rumAv)) continue;
      handelse(s, o, 'pynt', undefined, namn, v, PYNT.syn[q] * h);
      count(s, 'pyntSedd');
    }
  }
}
