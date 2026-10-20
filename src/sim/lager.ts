import { stat, ageOf, log } from './folk';
import { getMap } from './karta';
import { Act, H, Person, State, T, Task, W } from './typer';

// ---------- lager och stackar ----------
// Byns saker ligger i stackar på en lagerplats nära elden. En ruta rymmer en stack av ett slag. Tunga och skrymmande
// saker har mindre stackar. En full stack är vad en normalstark vuxen bär utan hjälpmedel.
// Mängderna räknas fortfarande som summor (s.food, s.wood, s.items); stackarna fördelas ur summorna på lagerplatsens rutor.
export const STACK: Record<string, number> = { mat: 25, ved: 25, grenar: 50, pinnar: 50, torrgras: 50, kol: 25, flinta: 10, gniststen: 10, yxa: 1, fiskespjut: 1 };
export const STACK_ORDER = Object.keys(STACK);
export const STACK_NAMES: Record<string, string> = { mat: 'Mat', ved: 'Ved', grenar: 'Grenar', pinnar: 'Små pinnar', torrgras: 'Torrt gräs', kol: 'Kol', flinta: 'Flinta', gniststen: 'Gniststen', yxa: 'Flintyxa', fiskespjut: 'Fiskespjut' };
export interface Zone { x: number; y: number; w: number; h: number }
export interface Pile { k: string; n: number; max: number; x: number; y: number }
const MAX_W = 6, MAX_H = 5;

export function zoneOf(s: State): Zone {
  if (!s.lager) { const st = getMap(s.seed).stock; s.lager = { x: st.x, y: st.y, w: 2, h: 2 }; }
  return s.lager;
}
export const amountOf = (s: State, k: string) => k === 'mat' ? s.food : k === 'ved' ? s.wood : s.items[k] ?? 0;
// hur många stackar ett slag behöver (ett halvt slitet spjut tar också en plats)
const pilesFor = (n: number, max: number) => Math.max(1, Math.ceil(n / max - 1e-9));
const shown = (k: string, n: number) => n >= (STACK[k] === 1 ? 1e-6 : 0.5);
export const pilesNeeded = (s: State) => STACK_ORDER.reduce((a, k) => a + (shown(k, amountOf(s, k)) ? pilesFor(amountOf(s, k), STACK[k]) : 0), 0);
// stackarna ruta för ruta: fulla stackar först, resten i den sista. Det som inte får plats ligger bredvid (x = -1)
export function pilesOf(s: State): Pile[] {
  const z = zoneOf(s), out: Pile[] = [];
  let i = 0;
  for (const k of STACK_ORDER) {
    let n = amountOf(s, k);
    if (!shown(k, n)) continue;
    const max = STACK[k];
    for (let j = pilesFor(n, max); j > 0; j--, i++) {
      const v = Math.min(n, max); n -= v;
      const inside = i < z.w * z.h;
      out.push({ k, n: v, max, x: inside ? z.x + (i % z.w) : -1, y: inside ? z.y + Math.floor(i / z.w) : -1 });
    }
  }
  return out;
}
export const inZone = (z: Zone, x: number, y: number) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;

// rutor som går att lägga saker på: land, inte vid elden
function usable(s: State, x: number, y: number) {
  const m = getMap(s.seed), f = m.fire;
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const t = m.tiles[y * W + x];
  return t !== T.Vatten && t !== T.Sten && Math.max(Math.abs(x - f.x), Math.abs(y - f.y)) > 1;
}
const allUsable = (s: State, z: Zone) => { for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (!usable(s, x, y)) return false; return true; };

// invånarna gör lagerplatsen större när den blir full och mindre när den står tom (en gång i timmen)
export function tidyStore(s: State) {
  const need = pilesNeeded(s);
  for (let k = 0; k < 4 && need > zoneOf(s).w * zoneOf(s).h; k++) {
    const z = zoneOf(s);
    const tries: Zone[] = [
      { ...z, w: z.w + 1 }, { ...z, h: z.h + 1 }, { ...z, x: z.x - 1, w: z.w + 1 }, { ...z, y: z.y - 1, h: z.h + 1 },
    ].filter(n => n.w <= MAX_W && n.h <= MAX_H && allUsable(s, n)).sort((a, b) => Math.abs(a.w - a.h) - Math.abs(b.w - b.h));
    if (!tries[0]) break;
    s.lager = tries[0];
    if (need <= tries[0].w * tries[0].h) log(s, `Lagerplatsen blev för liten, så byn gjorde den större (${tries[0].w} × ${tries[0].h} rutor).`, 'world');
  }
  const z = zoneOf(s), have = z.w * z.h;
  if (have > 4 && need <= have / 2 - 1) {
    const n = z.w >= z.h ? { ...z, w: z.w - 1 } : { ...z, h: z.h - 1 };
    if (n.w * n.h >= need + 1) s.lager = n;
  }
}

// var man lägger ner det man bär: vid en stack av samma slag som inte är full, annars en ledig ruta
export function dropSpot(s: State, k: string) {
  const z = zoneOf(s), ps = pilesOf(s);
  const same = ps.find(p => p.k === k && p.x >= 0 && p.n < p.max);
  if (same) return { x: same.x + 0.5, y: same.y + 0.5 };
  const i = Math.min(ps.length, z.w * z.h - 1);
  return { x: z.x + (i % z.w) + 0.5, y: z.y + Math.floor(i / z.w) + 0.5 };
}
export const fetchSpot = (s: State, k: string) => { const p = pilesOf(s).find(q => q.k === k && q.x >= 0); return p ? { x: p.x + 0.5, y: p.y + 0.5 } : dropSpot(s, k); };

// det en uppgift ger: mat från insamling, jakt och fiske; grenar från vedplockning; ved från huggning
export const carryKind = (act: Act) => act === 'ved' ? 'grenar' : act === 'hugga' || act === 'elda' ? 'ved' : 'mat';
// hur mycket en person orkar bära, i fulla stackar: en normalstark vuxen bär en stack, starka mer, barn och gamla mindre
export function capacity(s: State, p: Person) {
  const a = ageOf(p, s.now);
  return (0.5 + stat(p, 'styrka', s.now) / 20) * (a < 10 ? 0.35 : a < 15 ? 0.65 : 1);
}
// hur full bördan är, i stackar
export function load(t: Task) {
  let l = t.carry / STACK[carryKind(t.act)];
  for (const k in t.items ?? {}) l += t.items![k] / (STACK[k] ?? 25);
  return l;
}
// lägg det som bärs i förrådet (när man kommer hem, eller när man kallas bort till något annat)
export function storeLoad(s: State, t: Task) {
  const k = carryKind(t.act);
  if (k === 'mat') s.food += t.carry; else if (k === 'ved') s.wood += t.carry; else s.items[k] = (s.items[k] ?? 0) + t.carry;
  for (const i in t.items ?? {}) s.items[i] = (s.items[i] ?? 0) + t.items![i];
  t.carry = 0; t.items = undefined;
}
