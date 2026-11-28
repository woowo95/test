// ---------- rövarlägrets vapen (steg B.70, Striden på kartan: Rikedomen lockar) ----------
// Gänget från ett rövarläger går med lägrets egna vapen och skydd. Det lägret tagit som det är (VarldRad.stulet och
// VarldRad.vapen, vaktat.ts) och det som går att få ur lägrets varor delas ut, det bästa först: först ett vapen åt var och en,
// sedan skydden. Den som blir utan tar med sig stenar. Det en rövare bär hem igen går tillbaka till lägret; det de döda bar
// ligger kvar där de föll. Gängen från byarna får sin utrustning ur GASTUTRUSTNING (gast.ts) som förut
import { GASTUTRUSTNING, gastAv, gastTingOf, LAGERKROK } from './gast';
import { gruppAv, radHar, radTar, radTaUr } from './priser';
import { SAKER } from './saker';
import { kladAv, PLAGG } from './klader';
import { SKYDD, VAPEN, VAPEN_LIST } from './strid';
import type { VarldRad } from './radtal';
import type { Person, State } from './typer';
import { grundvarde } from './varde';

// vapnen en rövare kan bära, det bästa först (slagets skada, eller kastets för det som mest kastas eller skjuts), och skydden, ett av varje slag
const styrka = (k: string) => { const v = VAPEN[k as keyof typeof VAPEN] as { skada: number; kast?: { skada: number } }; return Math.max(v.skada, v.kast?.skada ?? 0); };
export const LAGERVAPEN = VAPEN_LIST.filter(k => k !== 'sten' && SAKER[k]?.redskap).sort((a, b) => styrka(b) - styrka(a)) as string[];
// skydden ur registret (steg 15.1.178): för kroppen och huvudet de plagg i SKYDD (strid.ts) som rustningen eller vapensmidet gör,
// det som tar mest först, och sist sköldarna
const skyddSumma = (k: string) => Object.values(SKYDD[k].tar).reduce((a, b) => a + (b ?? 0), 0);
const skyddPa = (plats: string) => Object.keys(SKYDD).filter(k => { const r = kladAv(k), pl = r && PLAGG[r.plagg]; return !!pl && pl.plats === plats && (pl.tek === 'rustning' || pl.tek === 'vapensmide'); }).sort((a, b) => skyddSumma(b) - skyddSumma(a));
export const LAGERSKYDD: readonly (readonly string[])[] = [skyddPa('yttre'), skyddPa('huvud'), ['jarnskold', 'skold']];
const ALLA_SKYDD = LAGERSKYDD.flat();
export const arVapen = (k: string) => LAGERVAPEN.includes(k) || ALLA_SKYDD.includes(k);
// det en rövare brukar ha (utan null och facklan): bara det görs ur lägrets varor
const vanliga = (v: [string | null, number][]) => v.flatMap(([k]) => k ? [k] : []);
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
  const u = GASTUTRUSTNING.rovare, gors = vanliga(u.vapen);
  for (const p of gang) ge(p, LAGERVAPEN.find(k => tagSak(r, k) || gors.includes(k) && tagVara(r, k)) ?? 'sten', 'hos');
  const gorSkydd = vanliga(u.plagg.skydd ?? []);
  for (const slag of LAGERSKYDD) for (const p of gang) { const k = slag.find(q => tagSak(r, q) || gorSkydd.includes(q) && tagVara(r, q)); if (k) ge(p, k, SAKER[k]?.klad ? 'bar' : undefined); else break; }
}
// en rövare kom hem till lägret: vapnen och skydden går tillbaka
export function lamnaVapen(s: State, r: VarldRad, id: number) {
  const p = gastAv(s, id);
  if (p) for (const t of gastTingOf(s, p)) if (arVapen(t.k)) radTar(r, t.k, 1);
}
LAGERKROK.bevapna = bevapna; LAGERKROK.lamna = lamnaVapen;
