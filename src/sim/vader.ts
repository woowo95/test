import { clamp } from './slump';
import { HOUR, State, WEEK } from './typer';

// ---------- väder: temperatur ----------
// Temperaturen följer årstiden mjukt (varje tidsålder glider över i nästa), solen över dygnet
// och ett långsamt slumpmässigt väder. Den räknas fram ur tiden, så den behöver inte sparas.
const SEASON_C = [-10, 6, 16, 6]; // medeltemperatur mitt i istid, vår, sommar, höst
export function temperature(s: State, t = s.now) {
  const c = (((t - s.founded) / WEEK + 1) % 4 + 4) % 4; // var i året: 0 = istidens början
  const i = Math.floor(c), q = c - i;
  // under slutet av varje tidsålder glider temperaturen mot nästa
  const a = SEASON_C[i], b = SEASON_C[(i + 1) % 4], f = clamp((q - 0.6) / 0.4, 0, 1);
  const base = a + (b - a) * (f * f * (3 - 2 * f));
  const d = new Date(t), h = d.getHours() + d.getMinutes() / 60;
  const sun = 4.5 * Math.cos((h - 15) / 24 * Math.PI * 2); // varmast mitt på eftermiddagen, kallast i gryningen
  const p = s.seed * 0.618;
  const weather = 3 * Math.sin(t / (31 * HOUR) * 2 * Math.PI + p) + 2 * Math.sin(t / (79 * HOUR) * 2 * Math.PI + p * 3.1) + 1.2 * Math.sin(t / (7.3 * HOUR) * 2 * Math.PI + p * 7.7);
  return base + sun + weather;
}
// hur fort man kyls ner utan eld, del av värmen per timme
export function coldOf(temp: number) { return Math.max(0, (6 - temp) / 70); }
