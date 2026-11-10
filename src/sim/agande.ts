import { MIN, State, Person } from './typer';
import { REDSKAP_SLAG, SAKER, isTool } from './saker';
import { ACTS, usesTool } from './handlingar';
import { alive, byId } from './folk';
import { kvHaller } from './kvalitet';

// ---------- ägande och handplatsen ----------
// Varje redskap är ett eget ting (s.ting) med skick (c, 1 = nytt), ägare och, om någon har det i handen, vem (hos).
// Den som gör ett redskap äger det. Redskap från före ägandet, och redskap vars ägare dött eller flyttat, är byns (BYN).
// Förrådet, maten och husen är byns. Det som samlas, fiskas och jagas tillhör den som skaffade det, men byn är generös
// och allt läggs genast i byns förråd.
// Handplatsen: var och en har en hand och kan ha ett redskap i den, utöver bördan. Den som arbetar med ett redskap har det
// i handen. Ett eget redskap behåller man i handen när arbetet är slut; byns och lånade redskap läggs tillbaka i förrådet.
// Man tar sitt eget redskap först, sedan byns, och lånar annars av någon som inte använder sitt. Lån, gåvor och byten går
// genom behovsstegen (behov.ts).
// Tinget är det enda som finns om ett redskap: hur många byn har räknas på tingen (lager.ts: amountOf). Ett redskap är
// i någons hand (hos), i någons börda (lass, när det bärs mellan lagerplatser) eller ligger på en ruta (x, y). Det som
// ännu inte har någon ruta (nygjort, tillbakalagt) får en plats i förrådet av lager.ts.
import { BYN, lends } from './egendom';
// halv = ett påbörjat redskap (paborjat.ts): vad det ska bli, materialet som tagits till det, hur länge arbetet har kvar och vem som började
interface Halv { gor: string; av: Record<string, number>; kvar: number; ag: number }
// vid = stationen tinget hör till och ligger vid när ingen använder det (kniven vid slaktbänken, stationer.ts), bar = den
// som har plagget på sig (utrustning.ts, steg 2.3.2)
export interface Ting { vaxt?: { g: string; v: number }; kok?: { r: string; n: number; kvar: number; ag: Record<string, number>; h?: number }; pa?: number; inne?: { v: import('./vatskor').VatskaId; n: number; q?: number; t?: number }; ler?: number; id: number; k: string; c: number; agare: number; hos?: number; lass?: number; x?: number; y?: number; halv?: Halv; vid?: number; bar?: number; av?: number; gjord?: number; kopt?: number; q?: number; ber?: import('./berattelser').SakMinne; tand?: number; tandT?: number; krok?: number; fylld?: 1 } // kok = rätten som står på elden i krukan, hur många portioner, den passiva tiden kvar och vems den blir (steg 9.6.3, matlagning.ts) // pa = protesen sitter på personen med det id:t (steg 9.5.11, protes.ts); inne = vätskan i behållaren och hur mycket (steg 9.4.14, vatskor.ts; fylld är det gamla: en fylld vattensäck) // ler = lerkrukan torkar (0–1) och bränns sedan; utan ler är den färdig (steg 9.4.11, kruka.ts); av, gjord: vem som gjorde det och när (steg 2.3.5), kopt: när det köptes av en handlare (steg 5.3.5.3), q = kvaliteten (kvalitet.ts), ber = berättelsen om ett mästerverk eller en usel sak (steg 3.9.4), tand = den som bär facklan tänd och tandT = när den senast räknades (ljus.ts, steg 6.3.6), krok = den i vars bälte redskapet hänger medan hen arbetar med ett annat (steg 7.1.1)
export const tingOf = (s: State) => (s.ting ??= []);
// hur stor del av arbetet med ett påbörjat redskap som är gjort (0 till 1), för framstegscirkeln på kartan och i panelerna
export const halvKlar = (h: Halv) => Math.min(1, Math.max(0, 1 - h.kvar / ((SAKER[h.gor]?.skaffa?.min ?? 1) * MIN)));
export const toolsOf = (s: State, k: string) => tingOf(s).filter(t => t.k === k);
// en vattensäck som står fylld (steg 7.6.6): örtköket tar vattnet ur den, och säcken töms men finns kvar
export const fylldSack = (s: State) => tingOf(s).find(t => t.inne?.v === 'vatten' && t.inne.n > 0); // en behållare med vatten i (steg 9.4.14)
export const nTools = (s: State, k: string) => tingOf(s).reduce((n, t) => n + (t.k === k ? 1 : 0), 0);
// det redskap av slagen ks som p har påbörjat (paborjat.ts)
export const halvOf = (s: State, p: Person, ks: readonly string[]) => tingOf(s).find(t => t.halv?.ag === p.id && ks.includes(t.halv.gor));
export const heldBy = (s: State, p: Person) => tingOf(s).find(t => t.hos === p.id);
// redskapen som hänger i p:s bälte medan hen arbetar med ett annat (steg 7.1.1)
export const iKroken = (s: State, p: Person) => tingOf(s).filter(t => t.krok === p.id);
// har p tinget med sig: i handen eller i bältet
export const harMed = (p: Person, t: Ting) => t.hos === p.id || t.krok === p.id;
// hur många krokar p:s bälte har (0 utan bälte)
const krokar = (s: State, p: Person) => { let n = 0; for (const t of tingOf(s)) if (t.bar === p.id) n = Math.max(n, SAKER[t.k]?.klad?.krok ?? 0); return n; };
// kan tinget t hänga i p:s bälte när hen tar ett annat redskap i handen (steg 7.1.1)? Det är hens eget, hänger i bältet
// enligt sakregistret, och bältet har en ledig krok utöver den som redskapet i handen hänger i när hen bär
const kanHanga = (s: State, p: Person, t: Ting) => t.agare === p.id && SAKER[t.k]?.hanger === 'balte' && !t.halv && iKroken(s, p).filter(x => x !== t).length < krokar(s, p) - 1;
// redskapet av slaget k som p har i handen
export const redskapIHanden = (s: State, p: Person, k: string) => tingOf(s).find(t => t.hos === p.id && t.k === k);

export function newTing(s: State, k: string, c: number, agare: number): Ting {
  const t = { id: s.nextTing = (s.nextTing ?? 0) + 1, k, c, agare };
  tingOf(s).push(t);
  return t;
}
// p gjorde ett redskap: det läggs i förrådet och är hens
export function addTool(s: State, k: string, p: Person) { return newTing(s, k, 1, p.id); }

// kan p ta tinget? Inte om någon bär det i bördan, arbetar med det eller har det på sig
function usable(s: State, p: Person, t: Ting) {
  if (t.ler !== undefined || t.vaxt) return false; // en ört växer i krukan (steg 9.7.16) // en lerkruka som torkar eller ska brännas är inte färdig (steg 9.4.11)
  if (t.lass !== undefined || (t.bar !== undefined && t.bar !== p.id) || (t.krok !== undefined && t.krok !== p.id)) return false;
  if (t.hos !== undefined && t.hos !== p.id) {
    const q = byId(s, t.hos);
    if (q && alive(q) && usesTool(q.task) === t.k) return false;
  }
  return lends(s, t.agare, p);
}
// i vilken ordning p tar: det hen har i handen, sitt eget, byns, och sist lånat. Inom det: bäst skick
const rank = (p: Person, t: Ting) => harMed(p, t) ? 0 : t.agare === p.id ? 1 : t.agare === BYN ? 2 : t.hos === undefined ? 3 : 4;
const freeOf = (s: State, p: Person, k: string) => toolsOf(s, k).filter(t => usable(s, p, t));
export const freeTools = (s: State, p: Person, k: string) => freeOf(s, p, k).length;
export const ownsFree = (s: State, p: Person, k: string) => freeOf(s, p, k).some(t => t.agare === p.id);
// p tar ett redskap av slaget k i handen, ur bältet om det hänger där. Det hen hade i handen hängs i bältet om det får
// plats där (steg 7.1.1), annars läggs det i förrådet
export function take(s: State, p: Person, k: string): Ting | undefined {
  const c = freeOf(s, p, k).sort((a, b) => rank(p, a) - rank(p, b) || b.c - a.c)[0];
  if (!c) return;
  c.krok = undefined;
  for (const t of tingOf(s)) if (t.hos === p.id && t !== c) { t.hos = undefined; if (kanHanga(s, p, t)) t.krok = p.id; }
  c.hos = p.id; c.x = c.y = c.lass = undefined;
  return c;
}
// slitage på redskapet p arbetar med (i handen, annars hens eget, annars det sämsta). true = det gick sönder
export function wearTool(s: State, p: Person, k: string, v: number) {
  const ts = toolsOf(s, k);
  const t = ts.find(x => x.hos === p.id) ?? ts.find(x => x.agare === p.id) ?? ts.sort((a, b) => a.c - b.c)[0];
  if (!t) return false;
  t.c -= v / kvHaller(t); // ett bättre redskap håller längre (kvalitet.ts)
  if (t.c > 1e-9) return false;
  s.ting = tingOf(s).filter(x => x !== t);
  return true;
}
// i slutet av varje steg: ägare som dött eller flyttat gör tinget till byns. Den som inte längre arbetar med ett redskap
// lägger tillbaka det som inte är hens eget; ett eget redskap behålls i handen. En börda som inte bärs längre (den som bar
// den dog eller fick annat att göra) hamnar i förrådet
export function tidyTools(s: State) {
  for (const t of tingOf(s)) {
    if (t.agare !== BYN) { const o = byId(s, t.agare); if (!o || !alive(o)) t.agare = BYN; }
    if (t.bar !== undefined) { const q = byId(s, t.bar); if (!q || !alive(q)) t.bar = undefined; } // den döde har inte plagget på sig
    if (t.krok !== undefined) { const q = byId(s, t.krok); if (!q || !alive(q) || t.hos !== undefined || !kanHanga(s, q, t)) t.krok = undefined; } // bältet har slitits ut, eller tinget har bytt ägare
    if (t.lass !== undefined) { const q = byId(s, t.lass); if (!q || !alive(q) || !q.task?.ting?.includes(t.id)) t.lass = undefined; }
    if (t.hos === undefined) continue;
    const q = byId(s, t.hos);
    if (!q || !alive(q)) t.hos = undefined;
    else if (usesTool(q.task) !== t.k && t.agare !== q.id && !(q.task && ACTS[q.task.act].vapen)) t.hos = undefined; // vakten har byns vapen i handen hela natten (vakt.ts), och den som väntar på vargarna (varg.ts)
  }
}
// äldre sparfiler: redskapen räknades bara som summor (s.items, och i v30 ägarlistor). Varje helt redskap blir ett ting.
// Före v40 fanns redskapen också som summor och stackar bredvid tingen, och de som bars låg i s.tingVag
export function migrateTools(s: State) {
  if (!s.ting) toolsFromItems(s);
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
// varje helt redskap i s.items (och ägarlistorna i v30) blir ett ting. s.items lämnas, eftersom storeFromSums läser det
export function toolsFromItems(s: State) {
  s.ting = [];
  for (const k of REDSKAP_SLAG) {
    let n = s.items?.[k] ?? 0;
    const ag = s.agare?.[k] ?? [];
    for (let i = 0; n > 1e-6; i++) { const c = Math.min(1, n); newTing(s, k, c, ag[i] ?? BYN); n -= c; }
  }
  delete s.agare;
  for (const p of s.people) { const k = usesTool(p.task); if (k && alive(p)) take(s, p, k); }
}
// vad p äger
export const ownedBy = (s: State, p: Person) => tingOf(s).filter(t => t.agare === p.id);
