import { clamp } from './slump';
import { HOUR, State } from './typer';
import { hourOf, yearPos } from './tid';
import { balans } from './balans';

// Balanstal (regel 8): temperaturen och hur fort man kyls
export const VADER = balans('vader', {
  medel: [-10, 6, 16, 6], // medeltemperatur (grader) mitt i istid, vår, sommar, höst
  glidFran: 0.6, // efter så här stor del av en tidsålder glider temperaturen mot nästa ...
  glidSpann: 0.4, // ... under resten av den (så här stor del)
  sol: 4.5, // solen ger så här många grader över dygnet ...
  solTopp: 15, // ... varmast klockan så här mycket (eftermiddag), kallast tolv timmar senare
  // det slumpmässiga vädret är tre vågor: styrkan (grader) och perioden (timmar)
  vaderStor: 3,
  vaderStorTim: 31,
  vaderMellan: 2,
  vaderMellanTim: 79,
  vaderLiten: 1.2,
  vaderLitenTim: 7.3,
  kallFran: 6, // under så här många grader kyls man ...
  kallDiv: 70, // ... med (kallFran - temperaturen) / kallDiv av värmen per timme
});

// ---------- väder: temperatur ----------
// Temperaturen följer årstiden mjukt (varje tidsålder glider över i nästa), solen över dygnet
// och ett långsamt slumpmässigt väder. Den räknas fram ur tiden, så den behöver inte sparas.
export function temperature(s: State, t = s.now) {
  const c = yearPos(s, t); // var i året: 0 = istidens början
  const i = Math.floor(c), q = c - i;
  // under slutet av varje tidsålder glider temperaturen mot nästa
  const a = VADER.medel[i], b = VADER.medel[(i + 1) % 4], f = clamp((q - VADER.glidFran) / VADER.glidSpann, 0, 1);
  const base = a + (b - a) * (f * f * (3 - 2 * f));
  const sun = VADER.sol * Math.cos((hourOf(t) - VADER.solTopp) / 24 * Math.PI * 2); // varmast mitt på eftermiddagen, kallast i gryningen
  const p = s.seed * 0.618;
  const weather = VADER.vaderStor * Math.sin(t / (VADER.vaderStorTim * HOUR) * 2 * Math.PI + p) + VADER.vaderMellan * Math.sin(t / (VADER.vaderMellanTim * HOUR) * 2 * Math.PI + p * 3.1) + VADER.vaderLiten * Math.sin(t / (VADER.vaderLitenTim * HOUR) * 2 * Math.PI + p * 7.7);
  return base + sun + weather;
}
// hur fort man kyls ner utan eld, del av värmen per timme
export function coldOf(temp: number) { return Math.max(0, (VADER.kallFran - temp) / VADER.kallDiv); }
