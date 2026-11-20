// ---------- fälten och djuren i den väckta byn (steg 11.13.20, Flera samhällen: Den väckta byn i tal) ----------
// Byggaren lägger det en by i samma ålder har ute på marken, efter det folket kan. Varje hushåll där någon kan odla har ett fält
// så stort som familjen behöver (faltBehov i odling.ts), där ett nytt fält skulle läggas, med marken röjd. Utanför istiden växer
// en gröda som kan sås nu (grodorNu), olika långt kommen; annars är jorden uppgrävd och väntar. Ägaren har frön till nästa sådd.
// Djuren köps i en riktig by av handlarna, så de är en del av rikedomen: en andel av radens rikedom (VACKTDJUR.andel) blir hela
// djur, med betesdjuren bara där någon kan sätta staket. De betar i en hage med staketet helt runt om, som byn skulle märka ut
// den (hageSida och faltSite). Dragdjuren finns där byn kan göra ett fordon. Några hushåll har en hund, och ibland har byn höns.
// Byggaren körs före förråden, så att djuren och fröna räknas in i rikedomen (rikedomDelar) och förråden får resten
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, familjOf } from './folk';
import { faltBehov, faltFardigt, faltOf, faltRiktning, faltSite, GRODOR, grodorNu, ODLING, sammanfatta, type Ruta } from './odling';
import { HAGE, hagarOf, hageSida, nyHage } from './hage';
import { HONS } from './hons';
import { laggIn } from './lager';
import { bynsMitt } from './omrade';
import { SAKER, SAK_LIST } from './saker';
import { rnd } from './slump';
import { knows } from './teknik';
import { iIstiden, kalender } from './tid';
import { nyttTamdjur, TAMDJUR, TamArtId, tamArt } from './tamdjur';
import { DAY, Person, State } from './typer';
import type { VarldRad } from './radtal';

export const VACKTDJUR = balans('vacktdjur', {
  andel: 0.12, // så stor del av radens rikedom står i djuren
  hund: 0.3, // chansen att ett hushåll har en hund
  hons: 0.4, // chansen att byn har en hönsflock ...
  honsMin: 4, honsMax: 12, // ... med så här många hönor
  vuxit: 0.9, // grödan på fälten har vuxit högst så långt
});
const BETE: TamArtId[] = ['far', 'get', 'ko'], DRAG: TamArtId[] = ['oxe', 'hast'];

// hushållen: ett par (den med lägst id) eller en vuxen utan partner och utan föräldrar i byn
export function hushallen(b: State): Person[] {
  const ut: Person[] = [];
  for (const p of [...b.people].sort((a, c) => a.id - c.id)) {
    if (!alive(p) || p.gast) continue;
    const pa = byId(b, p.partner);
    if (pa && alive(pa)) { if (p.id < pa.id) ut.push(p); continue; }
    if (ageOf(p, b.now) >= ALDER.vuxen && !byId(b, p.mother) && !byId(b, p.father)) ut.push(p);
  }
  return ut;
}

export function byggFalt(b: State, r: VarldRad) {
  byggFalten(b);
  byggDjuren(b, r);
}

// ett fält per hushåll där någon vuxen kan odla
function byggFalten(b: State) {
  const istid = iIstiden(kalender(b).ai), grodor = istid ? [] : grodorNu(b);
  for (const h of hushallen(b)) {
    const fam = [h, ...familjOf(b, h.id).filter(q => q !== h)], odlare = fam.find(q => ageOf(q, b.now) >= ALDER.vuxen && knows(q, 'odling'));
    if (!odlare || faltOf(b).some(f => fam.some(q => q.id === f.agare))) continue;
    const n = faltBehov(b, odlare), g = grodor.length ? grodor[Math.floor(rnd(b, 'vackt') * Math.min(2, grodor.length))] : undefined;
    const v = rnd(b, 'vackt') * VACKTDJUR.vuxit, ruta = (): Ruta => (g ? { st: 'vaxer', g, v } : { st: 'sa' });
    const f = minnesFalt(b, odlare, ruta) ?? faltFardigt(b, odlare, n, ruta);
    if (!f) continue;
    const fro = GRODOR[g ?? grodorNu(b)[0] ?? 'rovor'].fro;
    laggIn(b, fro, f.n * ODLING.froPerRuta, odlare.id); // frön till nästa sådd
  }
}

// ett fält ur minnesbilden som ingen äger (steg 11.13.22, byggMinne i vacktsomna.ts), det närmaste lägret först
function minnesFalt(b: State, p: Person, ruta: () => Ruta) {
  const f = faltOf(b).find(q => q.agare === 0);
  if (!f) return undefined;
  f.agare = p.id; f.r = Array.from({ length: f.n }, ruta);
  sammanfatta(f);
  return f;
}
// djuren ur en andel av rikedomen, i hela djur
function byggDjuren(b: State, r: VarldRad) {
  const vuxna = b.people.filter(p => alive(p) && !p.gast && ageOf(p, b.now) >= ALDER.vuxen);
  if (!vuxna.length) return;
  const tek = new Set(r.tek), agare = () => vuxna[Math.floor(rnd(b, 'vackt') * vuxna.length)].id;
  const staket = vuxna.some(p => knows(p, 'staket')), fordon = SAK_LIST.some(k => SAKER[k]!.fordon && (!SAKER[k]!.skaffa?.tek || tek.has(SAKER[k]!.skaffa!.tek!)));
  const arter = staket ? [...BETE, ...(fordon ? DRAG : [])] : [];
  const m = bynsMitt(b), fodd = (a: TamArtId) => b.now - (tamArt(a).vuxen + rnd(b, 'vackt') * Math.max(0, tamArt(a).liv / 2 - tamArt(a).vuxen)) * DAY;
  let budget = Math.floor(r.tal.rikedom * VACKTDJUR.andel);
  // hundarna
  for (const h of hushallen(b)) if (budget >= TAMDJUR.hund.varde && rnd(b, 'vackt') < VACKTDJUR.hund) { nyttTamdjur(b, 'hund', m.x, m.y, h.id, fodd('hund')); budget -= TAMDJUR.hund.varde; }
  // hönsen
  if (!b.hons && rnd(b, 'vackt') < VACKTDJUR.hons) {
    const n = Math.min(HONS.max, VACKTDJUR.honsMin + Math.floor(rnd(b, 'vackt') * (VACKTDJUR.honsMax - VACKTDJUR.honsMin + 1)), Math.floor(budget / HONS.varde));
    if (n >= 1) { b.hons = { n, x: m.x, y: m.y, agare: agare(), agg: 0 }; budget -= n * HONS.varde; }
  }
  // betesdjuren och dragdjuren, i hagen
  const nya = [];
  for (let i = 0; i < 200 && arter.length; i++) {
    const l = arter.filter(a => tamArt(a).varde <= budget);
    if (!l.length) break;
    const a = l[Math.floor(rnd(b, 'vackt') * l.length)];
    nya.push(nyttTamdjur(b, a, m.x, m.y, agare(), fodd(a)));
    budget -= tamArt(a).varde;
  }
  if (!nya.length) return;
  const gammal = hagarOf(b)[0]; // hagen ur minnesbilden (steg 11.13.22)
  if (gammal) { for (const d of nya) { d.hage = gammal.id; d.x = gammal.x + 0.5 + Math.floor(rnd(b, 'vackt') * gammal.w); d.y = gammal.y + 0.5 + Math.floor(rnd(b, 'vackt') * gammal.h); } return; }
  // hagen så stor som djuren behöver, eller så stor som får plats (byn gör den större när den lever)
  let n = hageSida(b), at = faltSite(b, n, n * n);
  while (!at && n > HAGE.minSida) { n--; at = faltSite(b, n, n * n); }
  if (!at) return; // ingen plats: djuren går lösa, som när de nyss köpts
  const hage = nyHage(b, { x: at.x, y: faltRiktning(b, at.y) > 0 ? at.y : at.y - (n - 1), w: n, h: n }), id = hage.id;
  b.byggV = (b.byggV ?? 0) + 1;
  for (const d of nya) { d.hage = id; d.x = hage.x + 0.5 + Math.floor(rnd(b, 'vackt') * n); d.y = hage.y + 0.5 + Math.floor(rnd(b, 'vackt') * n); }
}
