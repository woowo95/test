import { State, Person, Task } from './typer';
import { SAKER, isTool } from './saker';
import { alive, byId, count, getRel, isKin, log, stat, think } from './folk';
import { clamp, rnd } from './slump';

// ---------- ägande och handplatsen ----------
// Varje redskap är ett eget ting (s.ting) med skick (c, 1 = nytt), ägare och, om någon har det i handen, vem (hos).
// Den som gör ett redskap äger det. Redskap från före ägandet, och redskap vars ägare dött eller flyttat, är byns (BYN).
// Förrådet, maten och husen är byns. Det som samlas, fiskas och jagas tillhör den som skaffade det, men byn är generös
// och allt läggs genast i byns förråd.
// Handplatsen: var och en har en hand och kan ha ett redskap i den, utöver bördan. Den som arbetar med ett redskap har det
// i handen. Ett eget redskap behåller man i handen när arbetet är slut; byns och lånade redskap läggs tillbaka i förrådet.
// Man tar sitt eget redskap först, sedan byns, och lånar annars av någon som inte använder sitt (släkt, eller någon som
// inte är osams med en; den unga byn är generös).
// s.items[k] för ett redskap är alltid summan av tingens skick, så att lagret och listorna fungerar som förut.
import { BYN } from './egendom';
export interface Ting { id: number; k: string; c: number; agare: number; hos?: number }
export const tingOf = (s: State) => (s.ting ??= []);
export const toolsOf = (s: State, k: string) => tingOf(s).filter(t => t.k === k);
export const nTools = (s: State, k: string) => tingOf(s).reduce((n, t) => n + (t.k === k ? 1 : 0), 0);
export const heldBy = (s: State, p: Person) => tingOf(s).find(t => t.hos === p.id);
const KINDS = () => Object.keys(SAKER).filter(isTool);
const SPJUT = ['flintspjut', 'fiskespjut'];
const TOOL_ACTS: Record<string, string[]> = { fiske: [...SPJUT, 'metspo'], jakt: SPJUT, samla: ['korg'], slakta: ['kniv'], falla: ['yxa'], hugga: ['yxa'] };
// redskapet en uppgift använder (task.tool kan också vara t.ex. vagg eller rep, eller det spjut som görs)
export const usesTool = (t?: Task) => t && t.tool && TOOL_ACTS[t.act]?.includes(t.tool) ? t.tool : undefined;

function newTing(s: State, k: string, c: number, agare: number): Ting {
  const t = { id: s.nextTing = (s.nextTing ?? 0) + 1, k, c, agare };
  tingOf(s).push(t);
  return t;
}
// p gjorde ett redskap: det läggs i förrådet och är hens
export function addTool(s: State, k: string, p: Person) {
  syncTools(s);
  newTing(s, k, 1, p.id);
  s.items[k] = (s.items[k] ?? 0) + 1;
}

// lånar ägaren ut till p? Släkt och partner alltid, andra om de inte är osams
function lends(s: State, owner: number, p: Person) {
  if (owner === BYN || owner === p.id) return true;
  const o = byId(s, owner);
  if (!o || !alive(o)) return true;
  return o.partner === p.id || isKin(o, p) || getRel(s, o, p).op > -10;
}
// kan p ta tinget? Inte om någon annan arbetar med det
function usable(s: State, p: Person, t: Ting) {
  if (t.hos !== undefined && t.hos !== p.id) {
    const q = byId(s, t.hos);
    if (q && alive(q) && usesTool(q.task) === t.k) return false;
  }
  return lends(s, t.agare, p);
}
// i vilken ordning p tar: det hen har i handen, sitt eget, byns, och sist lånat. Inom det: bäst skick
const rank = (p: Person, t: Ting) => t.hos === p.id ? 0 : t.agare === p.id ? 1 : t.agare === BYN ? 2 : t.hos === undefined ? 3 : 4;
export const freeOf = (s: State, p: Person, k: string) => toolsOf(s, k).filter(t => usable(s, p, t));
export const freeTools = (s: State, p: Person, k: string) => freeOf(s, p, k).length;
export const ownsFree = (s: State, p: Person, k: string) => freeOf(s, p, k).some(t => t.agare === p.id);
// p tar ett redskap av slaget k i handen. Det hen hade i handen läggs i förrådet
export function take(s: State, p: Person, k: string): Ting | undefined {
  const c = freeOf(s, p, k).sort((a, b) => rank(p, a) - rank(p, b) || b.c - a.c)[0];
  if (!c) return;
  for (const t of tingOf(s)) if (t.hos === p.id && t !== c) t.hos = undefined;
  c.hos = p.id;
  return c;
}
// slitage på redskapet p arbetar med (i handen, annars hens eget, annars det sämsta). true = det gick sönder
export function wearTool(s: State, p: Person, k: string, v: number) {
  const ts = toolsOf(s, k);
  const t = ts.find(x => x.hos === p.id) ?? ts.find(x => x.agare === p.id) ?? ts.sort((a, b) => a.c - b.c)[0];
  if (!t) return false;
  t.c -= v;
  if (t.c > 1e-9) { s.items[k] = Math.max(0, (s.items[k] ?? 0) - v); return false; }
  s.ting = tingOf(s).filter(x => x !== t);
  s.items[k] = ts.reduce((n, x) => n + (x === t ? 0 : x.c), 0);
  return true;
}
// redskap i handen slits sakta även när de inte används, som i lagret
export function wearCarried(s: State, rate: (k: string) => number) {
  for (const t of tingOf(s)) if (t.hos !== undefined) { const v = Math.min(t.c, rate(t.k)); t.c -= v; s.items[t.k] = Math.max(0, (s.items[t.k] ?? 0) - v); }
  s.ting = tingOf(s).filter(t => t.c > 1e-9);
}

// håll tingen i takt med förrådet och folket. Ändras s.items för ett redskap av något annat än tingen (sparfiler, tester,
// ett redskap som bärs mellan lagerplatser) läggs skillnaden till eller dras från i förrådet: det som tas bort väntar
// i s.tingVag och kommer tillbaka med samma ägare när lika mycket läggs tillbaka
export function syncTools(s: State) {
  if (!s.ting) migrate(s);
  const ts = tingOf(s);
  for (const k of KINDS()) {
    let sum = 0;
    for (const t of ts) if (t.k === k) sum += t.c;
    let d = (s.items[k] ?? 0) - sum;
    if (d > 1e-6) {
      const vag = s.tingVag ?? [];
      for (let i = 0; i < vag.length && d > 1e-6; i++) if (vag[i].k === k) { const t = vag.splice(i--, 1)[0]; t.c = Math.min(t.c, d); ts.push(t); d -= t.c; }
      while (d > 1e-6) { const c = Math.min(1, d); newTing(s, k, c, BYN); d -= c; }
      if (s.tingVag && !s.tingVag.length) delete s.tingVag;
    } else if (d < -1e-6) {
      const stored = ts.filter(t => t.k === k).sort((a, b) => (a.hos === undefined ? 0 : 1) - (b.hos === undefined ? 0 : 1) || a.c - b.c);
      for (const t of stored) {
        if (d >= -1e-6) break;
        const v = Math.min(t.c, -d);
        d += v;
        if (v >= t.c - 1e-9) { ts.splice(ts.indexOf(t), 1); t.hos = undefined; (s.tingVag ??= []).push(t); }
        else t.c -= v;
      }
    }
    if (s.items[k] !== undefined) s.items[k] = ts.reduce((n, t) => n + (t.k === k ? t.c : 0), 0);
  }
  if (s.tingVag && s.tingVag.length > 20) s.tingVag.splice(0, s.tingVag.length - 20);
  // ägare som dött eller flyttat: tinget blir byns. Den som inte längre arbetar med ett redskap lägger tillbaka det
  // som inte är hens eget; ett eget redskap behålls i handen
  for (const t of ts) {
    if (t.agare !== BYN) { const o = byId(s, t.agare); if (!o || !alive(o)) t.agare = BYN; }
    if (t.hos === undefined) continue;
    const q = byId(s, t.hos);
    if (!q || !alive(q)) t.hos = undefined;
    else if (usesTool(q.task) !== t.k && t.agare !== q.id) t.hos = undefined;
  }
}
// gamla sparfiler: redskapen räknades bara som summor (och i v30 ägarlistor). Varje helt redskap blir ett ting
function migrate(s: State) {
  s.ting = [];
  for (const k of KINDS()) {
    let n = s.items[k] ?? 0;
    const ag = s.agare?.[k] ?? [];
    for (let i = 0; n > 1e-6; i++) { const c = Math.min(1, n); newTing(s, k, c, ag[i] ?? BYN); n -= c; }
  }
  delete s.agare;
  for (const p of s.people) { const k = usesTool(p.task); if (k && alive(p)) take(s, p, k); }
}
// vad p äger
export const ownedBy = (s: State, p: Person) => tingOf(s).filter(t => t.agare === p.id);

// ---------- gåvor och byten i samtal ----------
// Den som saknar ett redskap hen behöver i sitt arbete tar upp det i samtalet. Den andra ger ett redskap hen har över
// (har två av slaget, eller arbetar inte med det). Har den som frågar själv något över som den andra saknar blir det ett
// byte, annars en gåva. Hur gärna man ger beror på relationen och empatin: en förälder ger nästan alltid till sitt barn,
// partner och släkt ger lätt, vänner ibland och ovänner inte. Gåvan gör dem närmare.
const actsOf = (k: string) => Object.keys(TOOL_ACTS).filter(a => TOOL_ACTS[a].includes(k));
// hur stor del av sin tid p arbetar med redskapet
function useShare(p: Person, k: string) {
  let tot = 0, n = 0;
  for (const a in p.habit) tot += p.habit[a];
  for (const a of actsOf(k)) n += p.habit[a] ?? 0;
  return tot > 0 ? n / tot : 0;
}
const ownsKind = (s: State, p: Person, k: string) => tingOf(s).some(t => t.agare === p.id && t.k === k);
const needs = (s: State, p: Person, k: string) => !ownsKind(s, p, k) && useShare(p, k) > 0.1;
// ett redskap p har över: hen har fler av slaget, eller arbetar knappt med det. Inte det hen arbetar med just nu
function spare(s: State, p: Person, k: string) {
  const own = tingOf(s).filter(t => t.agare === p.id && t.k === k);
  if (own.length < 2 && useShare(p, k) >= 0.03) return;
  return own.filter(t => !(t.hos === p.id && usesTool(p.task) === k)).sort((a, b) => b.c - a.c)[0];
}
// hur gärna giver ger till mottagaren, 0–1
export function willing(s: State, g: Person, m: Person) {
  if (m.mother === g.id || m.father === g.id) return 0.95;
  const r = getRel(s, g, m);
  if (r.op < -10) return 0;
  const emp = stat(g, 'empati', s.now) / 20;
  const base = g.partner === m.id ? 0.8 : isKin(g, m) ? 0.6 : clamp(r.op / 80, 0, 0.6);
  return clamp(base * (0.5 + emp), 0, 1);
}
function give(t: Ting, g: Person, m: Person) {
  t.agare = m.id;
  if (t.hos === g.id) t.hos = undefined;
}
// a talar med b. Saknar någon av dem ett redskap som den andra har över? Returnerar vad som hände
export function askForTool(s: State, a: Person, b: Person): 'gåva' | 'byte' | undefined {
  for (const [m, g] of [[a, b], [b, a]]) {
    for (const k of KINDS()) {
      if (!needs(s, m, k)) continue;
      const t = spare(s, g, k);
      if (!t || rnd(s) >= willing(s, g, m)) continue;
      // byte: mottagaren har något över som givaren saknar
      let back: Ting | undefined;
      for (const j of KINDS()) if (j !== k && needs(s, g, j)) { back = spare(s, m, j); if (back) break; }
      give(t, g, m);
      const namn = (SAKER[k]?.namn ?? k).toLowerCase(), r = getRel(s, a, b);
      if (back) {
        give(back, m, g);
        r.op = clamp(r.op + 2, -100, 100);
        think(m, `Bytte till sig en ${namn} av ${g.name}`, 0.06, s.now, 6 * 3600);
        think(g, `Bytte till sig en ${(SAKER[back.k]?.namn ?? back.k).toLowerCase()} av ${m.name}`, 0.06, s.now, 6 * 3600);
        count(s, 'byten');
        log(s, `${m.name} och ${g.name} bytte: en ${namn} mot en ${(SAKER[back.k]?.namn ?? back.k).toLowerCase()}.`, 'rel', [m.id, g.id]);
        return 'byte';
      }
      r.op = clamp(r.op + 4, -100, 100);
      think(m, `Fick en ${namn} av ${g.name}`, 0.1, s.now, 12 * 3600);
      think(g, `Gav en ${namn} till ${m.name}`, 0.05, s.now, 6 * 3600);
      count(s, 'gavor');
      log(s, `${g.name} gav en ${namn} till ${m.name}.`, 'rel', [g.id, m.id]);
      return 'gåva';
    }
  }
}
