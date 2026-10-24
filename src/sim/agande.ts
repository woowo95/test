import { State, Person } from './typer';
import { SAKER, isTool } from './saker';
import { actsOf, usesTool } from './handlingar';
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
// Tinget är det enda som finns om ett redskap: hur många byn har räknas på tingen (lager.ts: amountOf). Ett redskap är
// i någons hand (hos), i någons börda (lass, när det bärs mellan lagerplatser) eller ligger på en ruta (x, y). Det som
// ännu inte har någon ruta (nygjort, tillbakalagt) får en plats i förrådet av lager.ts.
import { BYN } from './egendom';
export interface Ting { id: number; k: string; c: number; agare: number; hos?: number; lass?: number; x?: number; y?: number }
export const tingOf = (s: State) => (s.ting ??= []);
export const toolsOf = (s: State, k: string) => tingOf(s).filter(t => t.k === k);
export const nTools = (s: State, k: string) => tingOf(s).reduce((n, t) => n + (t.k === k ? 1 : 0), 0);
export const heldBy = (s: State, p: Person) => tingOf(s).find(t => t.hos === p.id);
const KINDS = () => Object.keys(SAKER).filter(isTool);

export function newTing(s: State, k: string, c: number, agare: number): Ting {
  const t = { id: s.nextTing = (s.nextTing ?? 0) + 1, k, c, agare };
  tingOf(s).push(t);
  return t;
}
// p gjorde ett redskap: det läggs i förrådet och är hens
export function addTool(s: State, k: string, p: Person) { newTing(s, k, 1, p.id); }

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
  c.hos = p.id; c.x = c.y = c.lass = undefined;
  return c;
}
// slitage på redskapet p arbetar med (i handen, annars hens eget, annars det sämsta). true = det gick sönder
export function wearTool(s: State, p: Person, k: string, v: number) {
  const ts = toolsOf(s, k);
  const t = ts.find(x => x.hos === p.id) ?? ts.find(x => x.agare === p.id) ?? ts.sort((a, b) => a.c - b.c)[0];
  if (!t) return false;
  t.c -= v;
  if (t.c > 1e-9) return false;
  s.ting = tingOf(s).filter(x => x !== t);
  return true;
}
// i slutet av varje steg: ägare som dött eller flyttat gör tinget till byns. Den som inte längre arbetar med ett redskap
// lägger tillbaka det som inte är hens eget; ett eget redskap behålls i handen. En börda som inte bärs längre (den som bar
// den dog eller fick annat att göra) hamnar i förrådet
export function tidyTools(s: State) {
  if (!s.ting) migrate(s);
  for (const t of tingOf(s)) {
    if (t.agare !== BYN) { const o = byId(s, t.agare); if (!o || !alive(o)) t.agare = BYN; }
    if (t.lass !== undefined) { const q = byId(s, t.lass); if (!q || !alive(q) || !q.task?.ting?.includes(t.id)) t.lass = undefined; }
    if (t.hos === undefined) continue;
    const q = byId(s, t.hos);
    if (!q || !alive(q)) t.hos = undefined;
    else if (usesTool(q.task) !== t.k && t.agare !== q.id) t.hos = undefined;
  }
}
// äldre sparfiler: redskapen räknades bara som summor (s.items, och i v30 ägarlistor). Varje helt redskap blir ett ting.
// Före v40 fanns redskapen också som summor och stackar bredvid tingen, och de som bars låg i s.tingVag
export function migrateTools(s: State) {
  if (!s.ting) migrate(s);
  const vag = s.tingVag ?? [];
  for (const p of s.people) {
    const tk = p.task;
    for (const k in tk?.items ?? {}) {
      if (!isTool(k)) continue;
      for (let n = tk!.items![k]; n > 1e-6;) {
        const i = vag.findIndex(t => t.k === k), t: Ting = i >= 0 ? vag.splice(i, 1)[0] : newTing(s, k, Math.min(1, n), BYN);
        if (i >= 0) tingOf(s).push(t);
        t.c = Math.min(t.c, n); n -= t.c; t.hos = undefined; t.lass = p.id; (tk!.ting ??= []).push(t.id);
      }
      delete tk!.items![k]; if (tk!.cond) delete tk!.cond[k];
    }
    if (tk?.items && !Object.keys(tk.items).length) tk.items = undefined;
  }
  delete s.tingVag; delete s.items;
}
function migrate(s: State) {
  s.ting = [];
  for (const k of KINDS()) {
    let n = s.items?.[k] ?? 0;
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
      if (!t || rnd(s, 'dela', g) >= willing(s, g, m)) continue;
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
