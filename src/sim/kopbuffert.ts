// ---------- köpa i stället för att samla (steg 14.1.15, Ekonomi och handel, i fliken Människan) ----------
// Att skaffa något genom byte vägs mot att samla det själv: vad en timme ger. För bytet är det varorna, i vad de är värda för
// köparen, minus det betalningen är värd för hen, per timme att gå dit och handla: i affären eller hos en granne som har över.
// Samlandets timme är värd egetVarde (dagsarbete.ts). Finns inget att köpa är det noll. Den som har mycket silver eller mycket
// över köper därför hellre, och den fattiga samlar. Maten köps upp till familjens gräns för egen mat, veden till det man själv
// vill ha, och det köpta är köparens. Marknaden går man till på fritiden (marknad.ts), och bytena när man möts är kvar.
import { type Act, MIN, type Person, type State, type Task } from './typer';
import { balans } from './balans';
import { ageOf, ALDER, alive, byId, count, living } from './folk';
import { type Behov, behovAv, betalaAv, betalVaror, bytaHos, MAT, overEget, osams, personPart } from './behov';
import { VED } from './eld';
import { grundvarde } from './varde';
import { egetVarde } from './dagsarbete';
import { vilMangd } from './affar';
import { SOVER, erbjudandet, type Erbjudande, KASSA } from './kassa';
import { ownsAmount } from './lager';
import { kroppFart } from './gang';

export const KOPBUFFERT = balans('kopbuffert', {
  prat: 4, // så många minuter tar bytet hos grannen
  mest: 3, // köpet räknas som högst så många gånger mer än vad en timme samlande ger
  langd: 40, // så långt går man för att byta
  nara: 4, // så nära måste grannen vara när man kommer fram
  medel: 24, // det glidande medlet av vad en timme samlande ger glömmer hälften på så många timmar (steg 15.1.19)
});
// arbetena som skaffar maten och veden själv (steg 15.1.19): det köpet vägs mot
export const SAMLAR: Record<'mat' | 'ved', readonly Act[]> = { mat: ['samla', 'jakt', 'fiske'], ved: ['ved', 'hugga'] };
// en gång i timmen (TAKTER): värdet som burits hem i arbetena och timmarna i dem (de som arbetar nu, gånger tiden sedan sist)
// läggs till det glidande medlet
export function samlaTimme(s: State, dtSec: number) {
  const h = dtSec / 3600, kvar = Math.pow(0.5, h / KOPBUFFERT.medel), folk = living(s);
  for (const id of ['mat', 'ved'] as const) {
    const arb = SAMLAR[id], v = arb.reduce((a, k) => a + (s.hemburet?.[k] ?? 0), 0), tim = folk.filter(p => p.task && arb.includes(p.task.act)).length * h;
    const m = (s.samlaGer ??= {})[id] ??= { v: 0, h: 0 };
    m.v = m.v * kvar + v; m.h = m.h * kvar + tim;
  }
  s.hemburet = undefined;
}
// vad en timme samlande av behovet id ger, i grundvärde: medlet, eller utan mätningar inget svar
export const samlaPerTimme = (s: State, id: 'mat' | 'ved') => { const m = s.samlaGer?.[id]; return m && m.h >= 1 ? m.v / m.h : undefined; };
export interface Kopval { faktor: number; kund?: Erbjudande; granne?: number; k?: string; spot?: { x: number; y: number }; dur: number }
const behovet = (id: 'mat' | 'ved'): Behov => id === 'mat' ? MAT : VED;
// köpets värde per timme, med vägen dit i köparens fart (gang.ts, steg 15.1.55), mot vad en timme samlande ger, värderat som p värderar varan k (steg 15.1.19); utan mätningar mot det en
// timme åt sig själv är värd
const perTimme = (s: State, p: Person, id: 'mat' | 'ved', k: string, net: number, d: number, min: number) => { const g = samlaPerTimme(s, id); return net / (d / kroppFart(p, s.now) / 3600 + min / 60) / Math.max(0.01, g !== undefined ? g * behovAv(s, p, k) : egetVarde(s, p)); };
// det bästa p kan köpa av behovet id, mot vad en timme samlande ger
export function kopval(s: State, p: Person, id: 'mat' | 'ved'): Kopval | undefined {
  if (p.gast || ageOf(p, s.now) < ALDER.hjalper) return undefined;
  const b = behovet(id);
  let bast: Kopval | undefined;
  const prova = (v: Kopval) => { if (v.faktor > (bast?.faktor ?? 0)) bast = v; };
  // affären
  if (s.foretag?.some(f => f.verk.includes('affar'))) {
    const e = erbjudandet(s, p, 'affar', undefined, k => b.slag.includes(k));
    if (e) prova({ faktor: perTimme(s, p, id, e.k, e.net, Math.hypot(e.disk.x - p.x, e.disk.y - p.y), KASSA.tal / 2), kund: e, dur: 0 });
  }
  // en granne som har över
  let M: ReturnType<typeof personPart> | undefined;
  for (const g of living(s)) {
    if (g === p || g.gast || (g.task && SOVER.has(g.task.act)) || osams(s, g, p)) continue;
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d > KOPBUFFERT.langd) continue;
    const over = overEget(s, g, b);
    if (over < b.minst) continue;
    M ??= personPart(s, p);
    for (const k of b.slag) {
      const n = Math.floor(Math.min(vilMangd(s, p, k), over / (b.per?.[k] ?? 1), ownsAmount(s, g, k)) + 1e-9);
      if (n < 1) continue;
      const G = personPart(s, g), ger = n * grundvarde(k) * G.varde(k), far = n * grundvarde(k) * behovAv(s, p, k);
      const bet = betalaAv(betalVaror(M, G, b.slag), G, ger);
      if (bet.fick < ger - 1e-9) continue;
      prova({ faktor: perTimme(s, p, id, k, far - bet.kost, d, KOPBUFFERT.prat), granne: g.id, k, spot: { x: g.x, y: g.y }, dur: KOPBUFFERT.prat * MIN }); // varje sort vägs, och prova behåller det bästa köpet
    }
  }
  if (bast) bast.faktor = Math.min(KOPBUFFERT.mest, bast.faktor);
  return bast;
}
// framme hos grannen (MEDAN i steg.ts, i första slaget, steg 15.1.20): bytet som i alla byten. Har grannen gått blir det inget
export function bytHosKlar(s: State, p: Person, t: Task) {
  const g = byId(s, t.ref), k = t.tool as string | undefined;
  if (!g || !k || !alive(g) || Math.hypot(g.x - p.x, g.y - p.y) > KOPBUFFERT.nara || (g.task && SOVER.has(g.task.act))) { count(s, 'kopMissat'); return; }
  const n = vilMangd(s, p, k);
  if (n >= 1 && bytaHos(s, p, g, k, n) > 0) count(s, 'kopGranne');
}
