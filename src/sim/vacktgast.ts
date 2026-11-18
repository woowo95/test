// ---------- bybor på besök i den väckta byn (steg 11.13.10, Flera samhällen: Den väckta byn i tal) ----------
// När ett sällskap kommer fram till en väckt by kliver resenärerna in i den som gäster med hela sin person: kroppen, minnena,
// det de kan och tänker och det de bär, som gästen som kommer igen (gastTillbaka i gast.ts). De kommer in från kanten som pekar
// mot hembyn, går till elden och lever där som andra gäster (gastvardag.ts): de äter ur sin del av sällskapets mat, dricker,
// sover och kan bli sjuka och dö. Medan de är i byn räknar byn deras kroppar, och sällskapets egna behov står still. När
// sällskapet vänder hem tar var och en med sig det som ändrats tillbaka till personen i huvudbyn, och maten som är kvar går
// tillbaka i packningen. Den som dog i byn är död på vägen (dorPaVagen), och byn får veta det när beskedet kommer hem
import type { Person, State } from './typer';
import { SEC, useMap } from './typer';
import { BESOKET, gastAv, gastGar, nyttGastId } from './gast';
import { GASTVARD } from './gastvardag';
import { skrivVanor } from './vanor';
import { kantMotBy } from './grannbyar';
import { eldPlats } from './karta';
import { gaMot } from './rovare';
import { count } from './folk';
import { freeNear } from './byggnad';
import { FOOD, SAKER } from './saker';
import { DODSORSAKER, type Dodsorsak } from './liv';
import { dorPaVagen, resenarer, Sallskap, sallskapNu, tappa, vackKrok } from './resa';

export const VACKTGAST = {
  nara: 1.5, // så nära elden stannar besökaren (rutor)
};
const vacktBy = (s: State, sl: Sallskap) => { const nr = s.varld?.platser?.find(p => p.nr === sl.mal)?.by; return nr === undefined ? undefined : s.vackta?.find(b => b.vackt === nr && b.vackI === undefined); };
// sällskapet framme: resenärerna kliver in i den väckta byn, om byn dit är väckt och färdig
export function besokIn(s: State, sl: Sallskap) {
  const b = vacktBy(s, sl), vl = s.varld;
  if (!b || !vl || sl.gaster) return;
  const folk = resenarer(s, sl);
  if (!folk.length) return;
  skrivVanor();
  // maten: var och en får lika många hela portioner ur packningen, den som håller kortast först
  const mat: [string, number][] = [], kinds = FOOD.filter(k => (sl.pack[k] ?? 0) >= 1).sort((a, c) => (SAKER[a]!.haller ?? 99) - (SAKER[c]!.haller ?? 99));
  const per = Math.floor(kinds.reduce((a, k) => a + Math.floor(sl.pack[k]!), 0) / folk.length);
  let behov = per * folk.length;
  for (const k of kinds) { const n = Math.min(behov, Math.floor(sl.pack[k]!)); if (n <= 0) continue; tappa(sl, k, n); mat.push([k, n]); behov -= n; }
  useMap(b);
  const kant = kantMotBy(b, vl.huvud) ?? eldPlats(b);
  useMap(s);
  sl.gaster = [];
  sl.vacktMat = mat;
  for (const p of folk) {
    const g = JSON.parse(JSON.stringify(p)) as Person;
    for (const f of BESOKET) delete (g as unknown as Record<string, unknown>)[f];
    delete g.ute; delete g.dodVag;
    g.id = nyttGastId(b); g.x = kant.x; g.y = kant.y;
    g.gast = { sort: 'besok', hemRad: vl.huvud, fas: 'kommer', mat: per, vatten: GASTVARD.sack };
    b.people.push(g);
    // det hen bär följer med som gästens ting
    for (const t of s.ting ?? []) if (t.bar === p.id) (b.gastTing ??= []).push({ ...JSON.parse(JSON.stringify(t)), agare: g.id, bar: g.id });
    sl.gaster.push([p.id, g.id]);
  }
  count(s, 'besok in', folk.length); count(b, 'besökare kom', folk.length);
}
// sällskapet vänder hem: var och en tar med sig det som ändrats tillbaka, och maten som är kvar går i packningen
export function besokUt(s: State, sl: Sallskap, t: number) {
  const par = sl.gaster;
  if (!par) return;
  delete sl.gaster;
  const b = vacktBy(s, sl);
  let kvar = 0;
  for (const [mid, gid] of par) {
    const p = s.people.find(q => q.id === mid), g = b && gastAv(b, gid);
    if (!p || !g) continue; // byn somnade medan de var där: personen är som när hen gick in
    kvar += Math.floor(g.gast?.mat ?? 0);
    if (g.died !== undefined) dorPaVagen(s, sl, p, dodsorsak(g.cause), Math.min(g.died, t));
    else {
      skrivVanor();
      const kropp = JSON.parse(JSON.stringify(g)) as Record<string, unknown>;
      for (const f of [...BESOKET, 'fran']) delete kropp[f];
      Object.assign(p, kropp);
    }
    if (b) { b.gastTing = b.gastTing?.filter(x => x.agare !== gid); if (!b.gastTing?.length) delete b.gastTing; if (g.died === undefined) gastGar(b, gid); }
  }
  // maten tillbaka i hela portioner, av de sorter som togs, den som håller längst först
  for (const [k, n] of [...(sl.vacktMat ?? [])].reverse()) { const m = Math.min(n, kvar); if (m > 0) { sl.pack[k] = (sl.pack[k] ?? 0) + m; kvar -= m; } }
  delete sl.vacktMat;
  // sällskapets behov är kropparnas när de går
  const folk = resenarer(s, sl);
  if (folk.length && sl.behov) { sl.behov.matt = folk.reduce((a, p) => a + p.hunger, 0) / folk.length; sl.behov.vatska = folk.reduce((a, p) => a + p.torst, 0) / folk.length; }
  count(s, 'besok ut', par.length);
}
// gästens dödsorsak som orsak i liv.ts (texten i DODSORSAKER), annars kyla
function dodsorsak(cause: string | undefined): Dodsorsak {
  for (const [k, d] of Object.entries(DODSORSAKER)) if (cause && (d.text === cause || k === cause)) return k as Dodsorsak;
  return cause?.includes('svält') ? 'svalt' : cause?.includes('sjuk') ? 'sjukdom' : 'kyla';
}
// besökarna i byn: de går från kanten till elden och stannar där (TAKTER i steg.ts)
export function besokSteg(s: State, dtSec: number) {
  const t0 = s.now - dtSec * SEC;
  for (const p of s.people) {
    const g = p.gast;
    if (g?.sort !== 'besok' || p.died !== undefined || g.fas !== 'kommer') continue;
    const mal = eldPlats(s), kvar = gaMot(s, p, mal.x + 0.5, mal.y + 1.5, dtSec, t0);
    if (kvar < 0) { const f = freeNear(s, mal.x, mal.y + 2); p.x = f.x + 0.5; p.y = f.y + 0.5; }
    if (kvar <= VACKTGAST.nara) { g.fas = 'pratar'; g.path = undefined; g.pk = undefined; }
  }
}
// den väckta byn på världsplatsen nr som spelaren kan gå in i: där egna bybor är på besök just nu (steg 11.13.11, ui/vacktvy.ts)
export function vacktMedBesok(s: State, nr: number): State | undefined {
  for (const sl of sallskapNu(s.varld)) if (sl.mal === nr && sl.gaster?.length) { const b = vacktBy(s, sl); if (b) return b; }
  return undefined;
}
vackKrok.framme = besokIn;
vackKrok.vander = besokUt;
