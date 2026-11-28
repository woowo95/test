// ---------- vad byn gör med fången (steg 11.12.7, "Fångar från striden" i fliken Människan) ----------
// Ett dygn (ett år i spelet) efter att fången togs väljer ledaren raden i FANGERADER som har högst poäng. Poängen är radens läge
// mellan Förlikning (−1) och Fejd (1) gånger det som drar åt Fejd: seden, ledarens hårdhet och om fången dödat någon i byn,
// plus radens bas. Lösen: hembyn finns i världen, är inte i krig med byn och har resurser; ett sändebud kommer inom
// FANGEVAL.losenDygn dygn med lösen i hela saker, och fången följer med hem. Kommer inget väljs på nytt utan raden. Släpps:
// fången går hem, och hembyns syn stiger. Tas upp i byn: bara om fången vill, avgjort som för främlingen. Dödas: hembyns syn
// sjunker, och den minns det. Bara fångar som byn tagit i strid (gästerna av sorten fange) ingår
import { balans } from './balans';
import { ALDER, ageOf, count, log } from './folk';
import { klanById, type Klan } from './klaner';
import { BYLAGEN, byLage, klanHandelse } from './byrel';
import { gruppAv, radVaror, radRikedomUr, radTar, VARUGRUPP_IDS } from './priser';
import { SAKER } from './saker';
import { grundvarde } from './varde';
import { antal, och } from './ord';
import { HANDLARVAROR, type HVara } from './handel';
import { lever } from './rad';
import { radNr, VarldRad } from './radtal';
import { slapps } from './fangelse';
import { gastDor } from './gastvardag';
import { budKrok, ledarenNu, sandebud, taEmotVilja } from './liv';
import { ledarHard } from './styre';
import { gasterNu } from './gast';
import { laggIn } from './lager';
import { notis } from './notiser';
import { kronika } from './historik';
import { hash3 } from './slump';
import { DAY, Person, State } from './typer';

export const FANGEVAL = balans('fangeval', {
  efter: 1, // så många dygn (år i spelet) efter att fången togs väljer ledaren
  losenDygn: 3, // budet med lösen kommer inom så många dygn
  losen: 20, // lösen i grundvärde: först hembyns silver, sedan varor ur dess förråd i hela saker (steg 15.1.26)
  sed: 1, // seden Förlikning – Fejd (−1 till 1) drar åt Fejd så här mycket
  hard: 1, // ledarens hårdhet över 1 drar åt Fejd så här mycket per enhet
  dodat: 0.6, // varje bybo fången dödat drar åt Fejd så här mycket
});
export interface FangeRadDef { namn: string; tecken: string; lage: number; bas: number; kan: (s: State, p: Person) => boolean; gor: (s: State, p: Person) => void }
// hembyn i världen: klanens rad, om den lever
function hemby(s: State, p: Person): { k: Klan; r?: VarldRad } | undefined {
  const k = klanById(s, p.gast!.klan);
  if (!k) return undefined;
  const vl = s.varld, r = vl && k.rad !== undefined ? radNr(vl, k.rad) : undefined;
  return { k, r: r && lever(vl!, r) ? r : undefined };
}
const losenVarde = () => FANGEVAL.losen;
// det hembyn har att betala med: silvret och varorna utom maten, i grundvärde
const losenHar = (r: VarldRad) => { const vr = radVaror(r); return Math.floor(r.tal.silver) * grundvarde('silver') + VARUGRUPP_IDS.reduce((a, g) => a + (g === 'mat' ? 0 : vr[g] ?? 0), 0); };
function losenKan(s: State, p: Person) {
  const h = hemby(s, p), vl = s.varld;
  if (!h?.r || !vl || vl.huvud === undefined || BYLAGEN[byLage(vl, h.r.nr, vl.huvud)].fejd >= 1) return false;
  return losenHar(h.r) >= losenVarde();
}
// lösen ur hembyn r (steg 15.1.26): först det silver den har, sedan varor ur förrådet i hela saker, ur den grupp den har mest av
// först och de dyraste sakerna i gruppen först, samma varor som raden räknar av (radVaror) och som handlaren bär (HANDLARVAROR,
// det byns tekniker kan göra). Det som inte går jämnt ut betalas
// med en sak till av den billigaste som finns. Varorna tas ur raden, och sändebudet bär dem
const losenSaker = (r: VarldRad, g: string) => HANDLARVAROR.map(v => v.k).filter(k => SAKER[k] && gruppAv(k) === g && grundvarde(k) > 0 && (!SAKER[k]!.skaffa?.tek || r.tek.includes(SAKER[k]!.skaffa!.tek!)));
function losenVaror(r: VarldRad): HVara[] {
  const ut: HVara[] = [], ta = (k: string, n: number) => { if (n < 1) return; radTar(r, k, -n); const f = ut.find(w => w.k === k); if (f) f.n += n; else ut.push({ k, n }); };
  const gs = grundvarde('silver');
  let kvar = losenVarde();
  const sv = Math.min(Math.floor(r.tal.silver), Math.ceil(kvar / gs - 1e-9));
  ta('silver', sv); kvar -= sv * gs;
  const vr = () => radVaror(r);
  for (const g of VARUGRUPP_IDS.filter(x => x !== 'mat').sort((a, b) => (vr()[b] ?? 0) - (vr()[a] ?? 0))) {
    for (const k of losenSaker(r, g).sort((a, b) => grundvarde(b) - grundvarde(a))) {
      if (kvar <= 1e-9) break;
      const gv = grundvarde(k); ta(k, Math.min(Math.floor((vr()[g] ?? 0) / gv + 1e-9), Math.floor(kvar / gv + 1e-9))); kvar = losenVarde() - ut.reduce((a, w) => a + w.n * grundvarde(w.k), 0);
    }
  }
  if (kvar > 1e-9) { // det sista: en sak till, den billigaste som ryms i någon grupp
    let bast: string | undefined;
    for (const g of VARUGRUPP_IDS) if (g !== 'mat') for (const k of losenSaker(r, g)) if ((vr()[g] ?? 0) >= grundvarde(k) - 1e-9 && (!bast || grundvarde(k) < grundvarde(bast))) bast = k;
    if (bast) ta(bast, 1);
  }
  r.tal.rikedom = radRikedomUr(r);
  return ut;
}
const slump = (s: State, p: Person, salt: number) => hash3(s.seed, p.id, Math.floor((p.gast!.tagen ?? 0) / 1000), salt);
export const FANGERADER = {
  losen: { namn: 'Lösen', tecken: '💰', lage: 0, bas: 0.4, kan: losenKan, gor: (s, p) => {
    p.gast!.losen = { t: s.now + Math.max(1, Math.ceil(slump(s, p, 1) * FANGEVAL.losenDygn * 24)) * DAY / 24, till: s.now + (FANGEVAL.losenDygn + 1) * DAY };
    count(s, 'fange_losen_begard');
  } },
  slapps: { namn: 'Släpps', tecken: '🚪', lage: -1, bas: 0, kan: () => true, gor: (s, p) => {
    const h = hemby(s, p); if (h) klanHandelse(s.varld, h.k, 'slappt');
    slapps(s, p); count(s, 'fange_slappt_ledare');
    skriv(s, p, `${ledarText(s)} släppte ${p.name}, och ${p.sex === 'k' ? 'hon' : 'han'} går hem.`);
  } },
  tasUpp: { namn: 'Tas upp i byn', tecken: '🏠', lage: -0.5, bas: 0.1, kan: (s, p) => { const h = hemby(s, p); return !!h && ageOf(p, s.now) >= ALDER.vuxen && slump(s, p, 2) < taEmotVilja(s, h.k); }, gor: (s, p) => {
    const h = hemby(s, p); slapps(s, p); budKrok.blirBybo?.(s, p, h?.k); count(s, 'fange_upptagen');
  } },
  dodas: { namn: 'Dödas', tecken: '⚔️', lage: 1, bas: -0.3, kan: () => true, gor: (s, p) => {
    const h = hemby(s, p), l = ledarenNu(s);
    if (h) { klanHandelse(s.varld, h.k, 'avrattad'); if (l) (h.k.doda ??= []).push({ namn: p.name, av: l.id, t: s.now }); }
    p.fange = undefined; count(s, 'fange_dodad');
    skriv(s, p, `${ledarText(s)} lät döda fången ${p.name}.`);
    gastDor(s, p, 'som fånge');
  } },
} satisfies Record<string, FangeRadDef>;
export type FangeRadId = keyof typeof FANGERADER;
const RADER: Record<FangeRadId, FangeRadDef> = FANGERADER;
export const FANGERAD_IDS = Object.keys(FANGERADER) as FangeRadId[];
const ledarText = (s: State) => ledarenNu(s)?.name ?? 'Byn';
function skriv(s: State, p: Person, text: string) { log(s, text, 'world', [p.id]); notis(s, 'strid', text, [p.id]); kronika(s, text, 'rovare'); }
// det som drar åt Fejd för fången p: seden, ledarens hårdhet och de bybor hen dödat
export function fejdDrag(s: State, p: Person) {
  const l = ledarenNu(s);
  return (s.seder.v.fejd ?? 0) * FANGEVAL.sed + (l ? ledarHard(s, l) - 1 : 0) * FANGEVAL.hard + (p.gast!.dodat ?? 0) * FANGEVAL.dodat;
}
export const fangePoang = (s: State, p: Person, id: FangeRadId) => RADER[id].bas + RADER[id].lage * fejdDrag(s, p);
// raden ledaren väljer: högst poäng bland dem som går och inte redan prövats
export function fangeRad(s: State, p: Person): FangeRadId {
  const ut = FANGERAD_IDS.filter(id => !p.gast!.utan?.includes(id) && RADER[id].kan(s, p));
  return ut.reduce((a, b) => fangePoang(s, p, b) > fangePoang(s, p, a) ? b : a, ut[0] ?? 'slapps');
}
function valj(s: State, p: Person) {
  const id = fangeRad(s, p);
  count(s, 'fange_val_' + id);
  RADER[id].gor(s, p);
}
// budet med lösen: när tiden är inne kommer det om hembyn fortfarande kan betala, annars väljs på nytt utan raden
function losenSteg(s: State, p: Person) {
  const g = p.gast!, l = g.losen!;
  if (l.bud === undefined && s.now >= l.t) {
    const h = hemby(s, p);
    if (!h?.r || !losenKan(s, p)) { g.losen = undefined; (g.utan ??= []).push('losen'); count(s, 'fange_losen_uteblev'); valj(s, p); return; }
    // hembyn betalar med det den har (losenVaror), och sändebudet bär det
    if (!h.r.syn) { g.losen = undefined; (g.utan ??= []).push('losen'); valj(s, p); return; }
    const bud = sandebud(s, h.r.nr, 'besked', losenVaror(h.r));
    if (!bud) { g.losen = undefined; (g.utan ??= []).push('losen'); valj(s, p); return; }
    bud.gast!.losenFor = p.id; l.bud = bud.id;
    count(s, 'fange_losen_bud');
    return;
  }
  // budet kom aldrig fram (det dog eller gick): ledaren väljer på nytt utan lösen
  if (s.now >= l.till && p.fange) { g.losen = undefined; (g.utan ??= []).push('losen'); count(s, 'fange_losen_uteblev'); valj(s, p); }
}
// budet har pratat med ledaren: lösen läggs i förrådet och fången följer med hem
budKrok.losen = (s, bud) => {
  const g = bud.gast!, p = s.people.find(q => q.id === g.losenFor && q.gast && q.died === undefined), betalt = och((g.gava ?? []).map(w => antal(w.n, w.k)));
  for (const w of g.gava ?? []) laggIn(s, w.k, w.n);
  g.gava = undefined;
  if (!p?.fange) return;
  const h = hemby(s, p); if (h) klanHandelse(s.varld, h.k, 'slappt');
  p.gast!.losen = undefined; slapps(s, p); count(s, 'fange_losen');
  skriv(s, p, `Ett sändebud betalade ${betalt || 'lösen'} i lösen för ${p.name}, som följer med hem.`);
};
// en gång i timmen (TAKTER i steg.ts): fångarna som suttit ett dygn får sitt öde
export function fangeOde(s: State) {
  for (const p of gasterNu(s, 'fange')) {
    const g = p.gast!;
    if (!p.fange || g.tagen === undefined) continue;
    if (g.losen) { losenSteg(s, p); continue; }
    if (s.now - g.tagen >= FANGEVAL.efter * DAY && !g.vald) { g.vald = 1; valj(s, p); }
  }
}
