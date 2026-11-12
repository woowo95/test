import { HOUR, Person, State } from './typer';
import { alive, byId, count, living, think } from './folk';
import { balans } from './balans';
import { roomAt } from './byggnad';
import { handelse } from './rykten';
import { kvOf } from './kvalitet';
import { isKlar, krukaHemma, sovrum, stationDef, stationRum, stationerOf } from './stationer';

// ---------- pyntet i hemmen (steg 4.3.4) ----------
// Lerkrukan och bonaden är möbler som bara är till för att pynta (pynt i STATIONER, stationer.ts).
// Var och en som är vuxen och sover inne bygger ett åt sig själv, av den sort hen tycker om (pyntSort), och ställer det i
// rummet där hen sover: i familjens hus eller i byns hus där hen sover. Högst ett var, så att byn inte fylls av små saker.
// Som alla möbler får det en kvalitet när det blir klart, och ett mästerverk kan få en berättelse och ett motiv (4.3.3).
// Varje timme: ägaren som är i rummet trivs (en tanke, mer ju finare pyntet är), och de andra som är vakna där ser det och
// får ett bättre intryck av ägaren (smakfull, rykten.ts), också det mer ju finare det är. Ett uselt pynt ger ingenting.
// Fler sorters pynt kommer senare (steg 10.3.1.2).
export const PYNT = balans('pynt', {
  glad: [0, 0.01, 0.02, 0.03, 0.05, 0.08], // ägarens humör i rummet med pyntet, per kvalitet (usel till ★) ...
  gladTim: 1.5, // ... och så många timmar efter att hen gått därifrån
  syn: [0, 0.005, 0.01, 0.015, 0.025, 0.05], // så mycket (vikten i intrycket smakfull) får den som ser det varje timme
});
export const PYNT_TANKE = 'Trivs med sitt pynt';

// står p i rummet rum?
const iRum = (s: State, p: Person, rum: unknown) => !!rum && roomAt(s, Math.floor(p.x), Math.floor(p.y)) === rum;

// en gång i timmen (steg.ts)
export function stepPynt(s: State) {
  // pyntet räknas på det som står i rummet (steg 9.4.12): möblerna och lerkrukorna i rummet där ägaren sover
  const pynt: { o: Person; rum: unknown; q: number; namn: string }[] = [];
  for (const t of stationerOf(s)) {
    const d = stationDef(t.k);
    if (!d?.pynt || !isKlar(t) || t.ag === undefined) continue;
    const o = byId(s, t.ag), rum = stationRum(s, t);
    if (o && alive(o) && rum) pynt.push({ o, rum, q: kvOf(t), namn: d.namn.toLowerCase() });
  }
  for (const o of living(s)) { const k = krukaHemma(s, o); if (k) pynt.push({ o, rum: sovrum(s, o), q: kvOf(k), namn: 'lerkruka' }); }
  for (const { o, rum, q, namn } of pynt) {
    if (PYNT.glad[q] > 0 && iRum(s, o, rum)) { think(o, PYNT_TANKE, PYNT.glad[q], s.now, PYNT.gladTim * HOUR); count(s, 'pyntGlad'); }
    if (PYNT.syn[q] <= 0) continue;
    for (const v of living(s)) {
      if (v === o || v.task?.act === 'sova' || !iRum(s, v, rum)) continue;
      handelse(s, o, 'pynt', undefined, namn, v, PYNT.syn[q]);
      count(s, 'pyntSedd');
    }
  }
}
