// ---------- rövarlägrets vapen (steg B.70, Striden på kartan: Rikedomen lockar) ----------
// Gänget från ett rövarläger går med lägrets egna vapen och skydd. Det lägret tagit som det är (VarldRad.stulet och
// VarldRad.vapen, vaktat.ts) och det som går att få ur lägrets varor delas ut, det bästa först: först ett vapen åt var och en,
// sedan skydden. Den som blir utan tar med sig stenar. Det en rövare bär hem igen går tillbaka till lägret; det de döda bar
// ligger kvar där de föll. Lägret gör bara det dess tekniker kan göra (steg 15.1.153).
// Gängen från byarna (steg 15.1.153, Striden i detalj: Stridsvärdet) får vapen och skydd ur det hembyns tekniker kan göra och
// rikedomen räcker till, samma som världen räknar stridsvärdet med (radUtrustning i radanfall.ts), och några av dem bågar eller
// slungor när byn kan göra dem. Kläderna mot kylan kommer ur GASTUTRUSTNING (gast.ts), utom på platser där skyddet sitter
import { gastAv, gastTingOf, LAGERKROK } from './gast';
import { BYANFALL, byKanGora, radKastvapen, radUtrustning } from './radanfall';
import { kladAv, PLAGG } from './klader';
import { gruppAv, radHar, radTar, radTaUr } from './priser';
import { SAKER } from './saker';
import { TVA_HAND, VAPEN, VAPEN_LIST } from './strid';
import type { VarldRad } from './radtal';
import type { Person, State } from './typer';
import { grundvarde } from './varde';

// vapnen en rövare kan bära, det bästa först (slagets skada, eller kastets för det som mest kastas eller skjuts), och skydden, ett av varje slag
const styrka = (k: string) => { const v = VAPEN[k as keyof typeof VAPEN] as { skada: number; kast?: { skada: number } }; return Math.max(v.skada, v.kast?.skada ?? 0); };
export const LAGERVAPEN = VAPEN_LIST.filter(k => k !== 'sten' && SAKER[k]?.redskap).sort((a, b) => styrka(b) - styrka(a)) as string[];
export const LAGERSKYDD: readonly (readonly string[])[] = [['rustning_lader'], ['hjalm_lader'], ['jarnskold', 'skold']];
const SKYDD = LAGERSKYDD.flat();
export const arVapen = (k: string) => LAGERVAPEN.includes(k) || SKYDD.includes(k);
const pris = (k: string) => Math.max(1, Math.round(grundvarde(k)));

// tar saken k ur lägret: en den har, annars ur varorna när de räcker till den
function tagSak(r: VarldRad, k: string): boolean {
  for (const f of ['stulet', 'vapen'] as const) {
    const lista = r[f];
    if (!lista?.[k]) continue;
    if (--lista[k] <= 0) delete lista[k];
    if (!Object.keys(lista).length) delete r[f];
    return true;
  }
  return false;
}
function tagVara(r: VarldRad, k: string): boolean {
  const g = gruppAv(k);
  if (!g || radHar(r, g) < pris(k)) return false;
  radTaUr(r, g, pris(k));
  return true;
}
// gänget från lägret r får sina vapen och skydd
export function bevapna(s: State, r: VarldRad, gang: Person[]) {
  const ar = new Set(gang.map(p => p.id));
  s.gastTing = (s.gastTing ?? []).filter(t => !ar.has(t.agare) || !arVapen(t.k)); // det vapen och skydd registret gav kommer ur lägret i stället
  const ge = (p: Person, k: string, falt?: 'hos' | 'bar') => s.gastTing!.push({ id: -(s.gastTingNr = (s.gastTingNr ?? 0) + 1), k, c: 1, agare: p.id, ...(falt ? { [falt]: p.id } : {}) });
  const gor = (k: string) => byKanGora(r.tek, k); // det lägret kan göra av sina varor
  for (const p of gang) ge(p, LAGERVAPEN.find(k => tagSak(r, k) || gor(k) && tagVara(r, k)) ?? 'sten', 'hos');
  for (const slag of LAGERSKYDD) for (const p of gang) { const k = slag.find(q => tagSak(r, q) || gor(q) && tagVara(r, q)); if (k) ge(p, k, SAKER[k]?.klad ? 'bar' : undefined); else break; }
}
// platsen på kroppen där plagget k sitter
const platsAv = (k: string) => { const r = kladAv(k); return r ? (PLAGG as Record<string, { plats: string }>)[r.plagg]?.plats : undefined; };
// gänget från byn r (steg 15.1.153): var och en får det byn kan göra och har råd med, och några ett vapen att skjuta eller kasta med
export function bevapnaBy(s: State, r: VarldRad, gang: Person[]) {
  const u = radUtrustning(r), kast = radKastvapen(r), platser = new Set(u.klader.map(platsAv));
  const ar = new Set(gang.map(p => p.id));
  s.gastTing = (s.gastTing ?? []).filter(t => !ar.has(t.agare) || !arVapen(t.k) && !(t.bar !== undefined && platser.has(platsAv(t.k)))); // registrets vapen och skydd, och plaggen där skyddet sitter
  const ge = (p: Person, k: string, falt?: 'hos' | 'bar') => s.gastTing!.push({ id: -(s.gastTingNr = (s.gastTingNr ?? 0) + 1), k, c: 1, agare: p.id, ...(falt ? { [falt]: p.id } : {}) });
  gang.forEach((p, i) => {
    const skjuter = !!kast && Math.round((i + 1) * BYANFALL.kastDel) > Math.round(i * BYANFALL.kastDel); // var tredje ungefär, den andra först
    const v = skjuter ? kast! : u.vapen;
    if (v !== 'hand') ge(p, v, 'hos');
    if (skjuter && u.vapen !== 'hand' && (VAPEN[u.vapen] as { liten?: true }).liten) ge(p, u.vapen); // närstridsvapnet i bältet
    for (const k of u.klader) ge(p, k, 'bar');
    if (u.skold && !TVA_HAND.has(v)) ge(p, u.skoldJarn ? 'jarnskold' : 'skold');
  });
}
// en rövare kom hem till lägret: vapnen och skydden går tillbaka
export function lamnaVapen(s: State, r: VarldRad, id: number) {
  const p = gastAv(s, id);
  if (p) for (const t of gastTingOf(s, p)) if (arVapen(t.k)) radTar(r, t.k, 1);
}
LAGERKROK.bevapna = bevapna; LAGERKROK.lamna = lamnaVapen; LAGERKROK.bevapnaBy = bevapnaBy;
