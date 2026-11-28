// ---------- det en by gör mot en annan (steg 11.6.5, Flera samhällen: Relationen och läget mellan två byar) ----------
// Registret BYHANDLINGAR: varje rad är något en by kan göra mot en by i sitt grannät, med en poäng och det som händer. En gång
// om dygnet (ett år i spelet; raden 'byarnas handlingar' i PERIODRADER) väljer varje by i världen som har en ledare den
// handling och den granne som ger högst poäng, och gör den om poängen är över noll. Poängen vägs av ledarens personlighet
// (egenskaperna ur nyckeln, radperson.ts) och av trons skalor (hur krigisk byns tro är), och ett litet slumptal ur världens frö
// gör att samma by inte alltid väljer samma sak. Relationen (byrel.ts) är det som ändras; BYHANDELSER säger hur mycket.
// Raderna: handelsfärden (11.6.6), gåvan (11.6.14), anfallen (11.6.16), kriget (11.6.22), sändebudet (11.6.23) och
// uppdragen (11.8.9). Huvudbyn väljer ur samma register när handlingen kan bli en resa med verkliga bybor.
import { balans } from './balans';
import { BYLAGEN, BYREL, byHandelse, byLage, gavaRel, lageSedan, relation, sattLage } from './byrel';
import { count } from './folk';
import { varldPlatsNr } from './landmarken';
import { lever } from './rad';
import { fastEgenskaper, radLedare } from './radperson';
import { BYSORTER, radNr, VarldRad } from './radtal';
import { clamp } from './slump';
import { PERIODRADER, varldSlump } from './varldslag';
import { SAKER, isFood, viktOf } from './saker';
import { grundvarde } from './varde';
import { Varlden } from './varlden';
import { DAY, SEC, Stat, State } from './typer';
import { radHar, gruppAv, radLaggTill, radMarkId, radOverskott, radTaUr, sakGrupp, radGruppPaslag, radTar, radVill, VARUGRUPP_IDS, VarugruppId } from './priser';
import { RAD, radDoda, rikMal } from './rad';
import { KOHANDELSER, laggIKo, periodSlut, PERIODER } from './varldslag';
import { byPlats } from './landmarken';
import { trampaFard, trampaPlatser, sallskapTyngd } from './leder';
import { narmasteMal, packaVag, sparadVag, vagRutor } from './vagval';
import { VARLD } from './varldmark';
import { varldMark } from './varlden';
import type { VarldPlats } from './landmarken';
import { radKanner } from './ort';
import { silverKvar } from './gruva';
import { gruvPlanFor, klunkarPerSack, RESA, sallskapNu, silverPlan, tomGruva, vagDygn } from './resa';
import { anfallUtfall, BYANFALL, enhet, flockStorlek, forsvarare, lockVarde, radKraft, vinstChans } from './radanfall';
import { varldHandelse } from './varldkronika';
import { flockKrok } from './rovare';
import { radKommer } from './rader';
import { VAKTKROK } from './vagran';
import { avslutaUppdrag, belonVarde, fyndId, ruinKvar, ruinRad, taRuin, uppdragDef, uppdragNr } from './uppdrag';
import { fardAntal, fardDoda, fardPerson, namnFolk } from './fardfolk';
import { plundradNod } from './byflytt';
import { valjDragfordon } from './fordon';
import { ageIndex, iIstiden } from './tid';
import { RECEPT } from './recept';
import { HANDEL, HANDLARSORTER, HANDLARVAROR, HANDLAR_UTR, HVara, HandlarLast, KARAVAN, handlarFram, handlarKrok, kgOf, utrVikt } from './handel';
import type { TamArtId } from './tamdjur';
import { gaLangs, orkFart, type Gang, type ResBehov } from './resa';
import { FARDKROK, fardBehov, fardLetaFart, packaFard, packaUr } from './fardresa';
import { snoPaMarken } from './vader';
import { isLight } from './tid';
import { vagMellan } from './vagval';
import { fardSlut, resStat } from './resstat';

export const BYHANDLING = balans('byhandling', {
  slump: 0.1, // så mycket kan slumpen flytta en poäng åt varje håll
  radsla: 2, // högst så mycket väger att grannen är starkare (styrkan delad med den egna)
  // handelsfärden (steg 11.6.6)
  last: 80, // så mycket (i grundvärde) bär en handelsfärd (ställt i steg 11.6.7 med npm run radhandel)
  barare: 2, // så många går med en handelsfärd
  dygnKostnad: 0.3, // det en bärare kostar per dygn på vägen, i grundvärde (maten och arbetet hemma)
  minRel: -10, // byarna handlar inte med den de ser lägre på än så
  skala: 20, // en vinst på så mycket (i grundvärde) är en poäng
  // gåvan (steg 11.6.14)
  gava: 40, // så mycket (i grundvärde) av det byn har över ger den bort
  gavaMal: 40, // gåvan lönar sig tills relationen nått hit
  gavaKostnad: 0.1, // det gåvan kostar i poäng (bärarnas tid, det som kunde bytts)
  gavaFull: 2, // en gåva som höjer mottagarens syn så mycket väger fullt i poängen (en större väger högst dubbelt)
  // plundringen (steg 11.6.16)
  plundraRel: 0, // fejden: byn vill plundra den den ser lägre på än minus så mycket ...
  plundraFull: 50, // ... och vill det fullt ut vid minus så mycket mer
  plundraVan: 20, // svälten: en by som saknar mat plundrar en granne den inte ser så här väl på
  plundraRik: 3, // avunden (steg B.66): en granne som är så många gånger rikare per person än byn själv, utöver lika rik, vill byn plundra fullt ut
  dodVarde: 20, // en död egen väger så mycket (i grundvärde) mot bytet
  plundraKostnad: 0.2, // det anfallet kostar i poäng (tiden, risken för hämnd)
  // kriget (steg 11.6.22)
  krigRel: 30, // byn vill gå i krig mot den den ser lägre på än minus så mycket ...
  krigFull: 50, // ... och vill det fullt ut vid minus så mycket mer
  // sändebudet (steg 11.6.23)
  beskedMal: 30, // det vänliga beskedet lönar sig tills relationen nått hit
  beskedRel: 20, // det ovänliga beskedet: byn vill skicka det till den den ser lägre på än minus så mycket ...
  beskedFull: 50, // ... och vill det fullt ut vid minus så mycket mer
  beskedKostnad: 0.15, // det sändebudet kostar i poäng (budets tid på vägen)
  uppdragKostnad: 0.2, // det ett uppdrag kostar i poäng utöver resan (risken, arbetet hemma) (steg 11.8.9)
  gruvaKostnad: 0.2, // det en gruvfärd kostar i poäng utöver resan (risken i gruvan, arbetet hemma) (steg 15.1.28)
  krigKostnad: 0.3, // det kriget kostar i poäng (de döda och arbetet hemma)
  fredDygn: 8, // efter så många dygn (år i spelet) i krig väger tröttheten lika mycket som fejden
});

// det poängen räknas ur: byn som gör (r), grannen (mot), hur r ser på mot, ledarens egenskaper (1–20) och trons krigiskhet (0–1)
export interface ByCtx { s: State; vl: Varlden; r: VarldRad; mot: VarldRad; rel: number; led?: Record<Stat, number>; krig: number; t: number; gruva?: VarldPlats } // t: när handlingen görs; gruva: silvergruvan gruvfärden går till (steg 15.1.28)
export interface ByHandlingDef { namn: string; poang: (c: ByCtx) => number; gor: (c: ByCtx) => void }
// en egenskap hos ledaren från 0 till 1 (en by utan känd ledare är mitt emellan)
export const ledDrag = (c: ByCtx, k: Stat) => ((c.led?.[k] ?? 10.5) - 1) / 19;
// hur mycket starkare grannen är, mellan 1/radsla och radsla
const radsla = (c: ByCtx) => clamp((radKraft(c.mot) + 1) / (radKraft(c.r) + 1), 1 / BYHANDLING.radsla, BYHANDLING.radsla); // stridsvärdet (steg 15.1.152)

export const BYHANDLINGAR = {
  // gåvan (steg 11.6.14): byn ger bort det den har mest över till en granne den vill stå väl med, mer av en ledare med
  // empati och mot en starkare granne; mottagarens syn höjs efter gåvans värde när den kommer fram. Huvudbyns gåvor och gåvor
  // till huvudbyn går med sändebudet (11.6.23)
  gava: {
    namn: 'Gåva',
    poang: c => { const a = gavaAffar(c); return a ? vanVilja(c, BYHANDLING.gavaMal) * (0.5 + ledDrag(c, 'empati')) * radsla(c) * (1 - c.krig / 2) * Math.min(2, gavaRel(a.n * enhet(a.g)) / BYHANDLING.gavaFull) - BYHANDLING.gavaKostnad : -1; },
    gor: c => { const a = gavaAffar(c); if (a) skickaFard(c, a, true); },
  },
  // sändebudet (steg 11.6.23): byn skickar ett bud med ett vänligt besked till en granne den vill stå väl med (mer av en ledare
  // med karisma) eller ett ovänligt till en den ser långt ner på (mer av en aggressiv ledare och en krigisk tro);
  // poängen ger också tonen (beskedTon). Beskedet verkar först när budet kommit fram; till huvudbyn kommer budet som en gäst
  // och beskedet verkar efter samtalet med ledaren (liv.ts). Ett vänligt bud bär byns gåva när den har något över
  besked: {
    namn: 'Skicka besked',
    poang: c => c.r.nr === c.vl.huvud || !kanSkicka(c.vl, c.r, 1) || beskedUte(c.vl, c.r.nr, c.mot.nr) || beskedGivet(c) || restid(c.vl, c.r, c.mot) === undefined ? -1 : beskedTon(c).p,
    gor: c => skickaBud(c, beskedTon(c).ton),
  },
  // plundringen (steg 11.6.16): en flock ur byns styrka anfaller en granne den ser ner på (en fejd), eller som den inte är vän med
  // när den själv saknar mat (svälten) eller när grannen är mycket rikare per person (avunden, steg B.66), mer av en aggressiv ledare och en krigisk tro, när bytet väger mer än de döda man väntar sig; anfallet avgörs när flocken kommer fram (radanfall.ts)
  plundra: {
    namn: 'Plundring',
    poang: c => {
      const n = c.r.nr === c.vl.huvud ? 0 : flockStorlek(c.r, radUte(c.vl, c.r.nr), c.mot); // också mot huvudbyn: då kommer flocken som rövare (steg 11.6.20); så stor som bytet och försvaret drar (steg 12.1.21)
      if (!n || restid(c.vl, c.r, c.mot) === undefined) return -1;
      const fejd = Math.max(BYLAGEN[byLage(c.vl, c.r.nr, c.mot.nr)].fejd, clamp((-c.rel - BYHANDLING.plundraRel) / BYHANDLING.plundraFull, 0, 1)); // i krig vill byn plundra fullt ut
      const svalt = c.rel < BYHANDLING.plundraVan ? clamp(1 - c.r.tal.mat / Math.max(1, radVill(c.r, 'mat', rikMal(c.r))), 0, 1) : 0;
      const perP = (q: VarldRad) => q.tal.rikedom / Math.max(1, q.tal.folk);
      const avund = c.rel < BYHANDLING.plundraVan ? clamp((perP(c.mot) / Math.max(1, perP(c.r)) - 1) / BYHANDLING.plundraRik, 0, 1) : 0; // rikedomen lockar också utan fejd (steg B.66), samma mått på båda sidor
      const vilja = Math.max(fejd, svalt, avund) * (0.5 + ledDrag(c, 'aggression')) * (0.5 + c.krig);
      const p = vinstChans(c.r, c.mot, n), byte = lockVarde(c.mot, n); // det som finns över bärbördan lockar ändå (steg 12.1.21)
      const doda = n * (p * BYANFALL.dodVinnare + (1 - p) * BYANFALL.dod);
      return vilja * (p * byte - doda * BYHANDLING.dodVarde) / BYHANDLING.skala - BYHANDLING.plundraKostnad;
    },
    gor: c => {
      const n = flockStorlek(c.r, radUte(c.vl, c.r.nr), c.mot), dygn = restid(c.vl, c.r, c.mot);
      if (!n || dygn === undefined) return;
      skicka(c.s, c.vl, { id: fardNr(c.vl), fran: c.r.nr, till: c.mot.nr, g: 'mat', n: 0, anfall: n, t0: c.t, t1: c.t + dygn * DAY }, n);
      count(c.s, 'radanfall_ut');
    },
  },
  // kriget (steg 11.6.22): en by går i krig mot en granne den ser långt ner på, mer av en aggressiv ledare och en krigisk tro och
  // när den själv är starkare. Kriget är ett läge mellan byarna (BYLAGEN i byrel.ts): de handlar inte och vill plundra varandra.
  // Det ovänliga beskedet är ett steg på vägen (steg 12.1.114): kriget går att välja mot en granne som fått beskedet, när
  // relationen sjunkit vidare sedan dess
  krig: {
    namn: 'Krig',
    poang: c => {
      if (krigUte(c) || byLage(c.vl, c.r.nr, c.mot.nr) !== 'fred' || !beskedGivet(c) || c.rel >= c.vl.ovanligt![`${c.r.nr}>${c.mot.nr}`]!) return -1;
      const fejd = clamp((-c.rel - BYHANDLING.krigRel) / BYHANDLING.krigFull, 0, 1);
      return fejd * (0.5 + ledDrag(c, 'aggression')) * (0.5 + c.krig) / radsla(c) - BYHANDLING.krigKostnad;
    },
    gor: c => { sattLage(c.vl, c.r.nr, c.mot.nr, 'krig', c.t); if (c.vl.ovanligt) delete c.vl.ovanligt[`${c.r.nr}>${c.mot.nr}`]; varldHandelse(c.vl, 'krig', c.t, { by: c.r.nr, mot: c.mot.nr }); count(c.s, 'bykrig'); },
  },
  // freden: tröttheten växer med tiden i krig och med en ledare med empati, och fejden och aggressionen håller kriget igång
  fred: {
    namn: 'Fred',
    poang: c => {
      if (krigUte(c) || byLage(c.vl, c.r.nr, c.mot.nr) !== 'krig') return -1;
      const dygn = (c.t - (lageSedan(c.vl, c.r.nr, c.mot.nr) ?? c.t)) / DAY, fejd = clamp((-c.rel - BYHANDLING.krigRel) / BYHANDLING.krigFull, 0, 1);
      return dygn / BYHANDLING.fredDygn * (0.5 + ledDrag(c, 'empati')) * radsla(c) - fejd * (0.5 + ledDrag(c, 'aggression')) * (0.5 + c.krig);
    },
    gor: c => { sattLage(c.vl, c.r.nr, c.mot.nr, 'fred', c.t); varldHandelse(c.vl, 'fred', c.t, { by: c.r.nr, mot: c.mot.nr }); count(c.s, 'byfred'); },
  },
  // handelsfärden (steg 11.6.6): byn säljer det den har överflöd av där det är dyrast, när vinsten är större än resans kostnad
  handel: {
    namn: 'Handelsfärd',
    poang: c => { const a = fardAffar(c); return a ? a.vinst / BYHANDLING.skala : -1; },
    gor: c => { const a = fardAffar(c); if (a) skickaFard(c, a); },
  },
  // uppdraget (steg 11.8.9): byn ger sig av mot ett uppdrag den känner till, ett utlyst uppdrag i grannbyn (hjälpen) eller det
  // som finns kvar i en ruin i grannätet, när det väntade bytet är värt mer än resan; den som kommer först tar det
  uppdrag: {
    namn: 'Uppdrag',
    poang: c => { const a = kanSkicka(c.vl, c.r, BYHANDLING.barare) ? uppdragAffar(c) : undefined; return a ? (a.varde - BYHANDLING.barare * 2 * a.dygn * BYHANDLING.dygnKostnad) / BYHANDLING.skala - BYHANDLING.uppdragKostnad : -1; },
    gor: c => {
      const a = uppdragAffar(c);
      if (!a) return;
      skicka(c.s, c.vl, { id: fardNr(c.vl), fran: c.r.nr, till: c.mot.nr, g: 'mat', n: 0, uppdrag: a.id, t0: c.t, t1: c.t + a.dygn * DAY }, BYHANDLING.barare);
      count(c.s, 'raduppdrag_ut');
    },
  },
  // gruvfärden (steg 15.1.28): byn skickar bärare till en silvergruva den känner, när det väntade silvret är värt mer än resan,
  // räknat som uppdraget; framme tas silvret ur gruvan så långt det räcker, och det bärs hem
  gruva: {
    namn: 'Gruvfärd',
    poang: c => { const a = gruvAffar(c); return a ? (a.silver * grundvarde('silver') - BYHANDLING.barare * 2 * a.dygn * BYHANDLING.dygnKostnad) / BYHANDLING.skala - BYHANDLING.gruvaKostnad : -1; },
    gor: c => {
      const a = gruvAffar(c);
      if (!a || !c.gruva) return;
      skicka(c.s, c.vl, { id: fardNr(c.vl), fran: c.r.nr, till: c.gruva.nr, gruva: true, vant: a.silver, nere: a.nere, g: 'mat', n: 0, t0: c.t, t1: c.t + a.dygn * DAY }, BYHANDLING.barare);
      count(c.s, 'radgruva_ut');
    },
  },
} as const satisfies Record<string, ByHandlingDef>;
// ---------- gruvfärden (steg 15.1.28, Silvergruvan i tal i fliken Samhället) ----------
// restiden från byn r till platsen q med vägvalet till fots, som i grannätet (narmasteMal); vägen sparas i världen
function gruvRestid(s: State, vl: Varlden, r: VarldRad, q: VarldPlats): number | undefined {
  const h = byPlats(vl, r.nr), v = varldMark(s);
  if (!h || !v) return undefined;
  const a = h.y * v.w + h.x, b = q.y * v.w + q.x;
  let vag = sparadVag(vl, 'fots', a, b);
  if (!vag) {
    const f = narmasteMal(vl, v, a, new Set([b]), 1, 'fots')[0];
    if (!f) return undefined;
    vag = { fran: a, till: b, fs: 'fots', steg: packaVag(f.rutor, v.w), kostnad: Math.round(f.kostnad * 1000) / 1000, t: s.now };
    (vl.vagar ??= []).push(vag);
  }
  return Math.round(vag.kostnad / VARLD.gangPerDygn * 100) / 100;
}
// silvret de som redan är på väg till gruvan q väntas ta: byarnas gruvfärder och huvudbyns sällskap
function gruvVantat(s: State, vl: Varlden, q: VarldPlats) {
  let n = 0;
  for (const f of vl.farder ?? []) if (f.gruva && f.till === q.nr && f.t2 === undefined) n += f.vant ?? 0;
  for (const sl of sallskapNu(vl)) if (sl.skal === 'hamta' && sl.mal === q.nr && sl.skede !== 'hemat') n += gruvPlanFor(s, sl)?.silver ?? 0;
  return n;
}
// det byn c.r väntar sig av en färd till gruvan c.gruva: silvret BYHANDLING.barare bärare med en vuxens bärförmåga bryter
// (silverPlan, med RESA.margMitt), högst det som finns kvar när det andra väntas ta är draget, tiden nere och dygnen dit
function gruvAffar(c: ByCtx): { silver: number; nere: number; dygn: number } | undefined {
  const { s, vl, r, gruva: q } = c;
  if (!q || r.nr === vl.huvud || r.tal.folk < BYHANDLING.barare * 2 || vl.farder?.some(f => f.fran === r.nr && f.gruva)) return undefined;
  const dygn = gruvRestid(s, vl, r, q);
  if (dygn === undefined) return undefined;
  // vattnet (steg 15.1.86): saknar gruvan vatten räcker tiden nere så länge som säckarna, högst två per bärare, när byn kan sy dem
  const v = varldMark(s), h = byPlats(vl, r.nr), vd = v && h ? vagDygn(s, h.y * v.w + h.x, q.y * v.w + q.x) : undefined;
  const sackar = r.tek.includes('vattensack') ? BYHANDLING.barare * RESA.sackar : 0;
  const plan = silverPlan(BYHANDLING.barare, BYHANDLING.barare * RESA.hander - sackar * viktOf('vattensack'), dygn, RESA.margMitt, 'silvergruva', vd?.slut ?? 0, sackar * klunkarPerSack());
  const kvar = Math.floor(silverKvar(q) - gruvVantat(s, vl, q) + 1e-9), silver = Math.min(plan?.silver ?? 0, kvar);
  return plan && silver >= 1 ? { silver, nere: plan.nere, dygn } : undefined;
}
// silvergruvorna byn r känner (radKanner): kända, besökta eller ett rykte
const kandaGruvor = (vl: Varlden, r: VarldRad) => (vl.platser ?? []).filter(q => q.k === 'silvergruva' && radKanner(vl, r, q.nr) !== undefined);
// färden är framme vid gruvan: silvret tas ur gruvan så långt det räcker och bärs hem; är gruvan tom tas den bort, som när
// huvudbyns sällskap tömmer den (tomGruva i resa.ts)
function gruvFardFram(s: State, vl: Varlden, f: RadFard) {
  const q = varldPlatsNr(vl, f.till);
  const fick = q?.k === 'silvergruva' ? Math.max(0, Math.min(f.vant ?? 0, Math.floor(silverKvar(q) + 1e-9))) : 0;
  if (q && fick > 0) { (q.inne ??= {}).silver = Math.floor(silverKvar(q) + 1e-9) - fick; f.silver = (f.silver ?? 0) + fick; }
  if (q && fick > 0 && silverKvar(q) < 1) tomGruva(s, q);
  count(s, fick > 0 ? 'radgruva_silver' : 'radgruva_tom', Math.max(1, fick));
}
// det byn r väntar sig av ett uppdrag hos grannen mot (en levande by med ett utlyst uppdrag, eller en ruin): numret (fyndId för
// ruinen), värdet (i grundvärde, högst det bärarna bär) och dygnen dit. Huvudbyn reser med verkliga bybor (resa.ts)
function uppdragAffar(c: ByCtx): { id: number; varde: number; dygn: number } | undefined {
  const { vl, r, mot } = c, dygn = restid(vl, r, mot), q = byPlats(vl, mot.nr);
  if (r.nr === vl.huvud || dygn === undefined || !q || vl.farder?.some(f => f.fran === r.nr && f.uppdrag !== undefined)) return undefined;
  const ruin = ruinRad(vl, q.nr);
  if (ruin) {
    const v = Object.entries(ruinKvar(vl, ruin, c.t)).reduce((a, [k, n]) => a + n * grundvarde(k), 0);
    return v > 0 ? { id: fyndId(q.nr), varde: Math.min(BYHANDLING.last, v), dygn } : undefined;
  }
  let bast: { id: number; varde: number; dygn: number } | undefined;
  for (const u of vl.uppdrag ?? []) if (u.mal === q.nr && u.av.rad !== r.nr && (uppdragDef(u.k).gor === 'hjalpa' || (uppdragDef(u.k).gor === 'strida' && !!u.kand?.includes(r.nr)))) { // det vaktade som budbäraren berättat om (steg 11.8.13)
    const v = belonVarde(u);
    if (!bast || v > bast.varde) bast = { id: u.id, varde: v, dygn };
  }
  return bast;
}
// färden kommer fram till uppdraget: den tar det som finns kvar i ruinen (så mycket bärarna bär) eller belöningen för hjälpen,
// och bär det hem som byte; har någon hunnit före finns inget
// det vaktade (steg 11.8.13, utlysa.ts): färden tar det stulna i fick och säger om den vann
export const RADUPPDRAGKROK: { strida?: (s: State, vl: Varlden, f: RadFard, u: import('./uppdrag').Utlyst, fick: Record<string, number>) => boolean } = {};
function uppdragFardFram(s: State, vl: Varlden, f: RadFard) {
  const q = byPlats(vl, f.till), fick: Record<string, number> = {};
  if (!q) return;
  if (f.uppdrag! < 0) { const ruin = ruinRad(vl, q.nr); if (ruin) Object.assign(fick, taRuin(s, vl, ruin, f.t1, BYHANDLING.last, k => grundvarde(k))); }
  else { const u = uppdragNr(vl, f.uppdrag!); if (u && u.mal === q.nr && (uppdragDef(u.k).gor !== 'strida' || RADUPPDRAGKROK.strida?.(s, vl, f, u, fick))) { Object.assign(fick, u.belon); u.belon = {}; avslutaUppdrag(s, vl, u, true); } }
  const byte: Partial<Record<VarugruppId, number>> = {};
  for (const [k, n] of Object.entries(fick)) { if (k === 'silver') { f.silver = (f.silver ?? 0) + Math.floor(n); continue; } const g = sakGrupp(k); byte[g] = (byte[g] ?? 0) + n * grundvarde(k) / enhet(g); }
  for (const g of Object.keys(byte) as VarugruppId[]) { byte[g] = Math.floor(byte[g]! + 1e-9); if (!byte[g]) delete byte[g]; }
  f.byte = byte;
  count(s, Object.keys(byte).length || f.silver ? 'raduppdrag_klart' : 'raduppdrag_tomt');
}
export type ByHandlingId = keyof typeof BYHANDLINGAR;
export const BYHANDLING_IDS = Object.keys(BYHANDLINGAR) as ByHandlingId[];
const DEF: Record<ByHandlingId, ByHandlingDef> = BYHANDLINGAR;

// grannarna till byn r som lever och är byar (huvudbyn är med)
export function radGrannar(vl: Varlden, r: VarldRad): VarldRad[] {
  const p = (vl.platser ?? []).find(q => q.by === r.nr);
  const ut: VarldRad[] = [];
  for (const g of p?.grannar ?? []) {
    const q = varldPlatsNr(vl, g.nr), m = q?.by !== undefined ? radNr(vl, q.by) : undefined;
    if (m && m.nr !== r.nr && BYSORTER[m.sort].folk && (m.nr === vl.huvud || lever(vl, m))) ut.push(m);
  }
  return ut;
}
export const byCtx = (s: State, vl: Varlden, r: VarldRad, mot: VarldRad, t = s.now): ByCtx => {
  const l = radLedare(r);
  return { s, vl, r, mot, rel: relation(vl, r.nr, mot.nr) ?? 0, led: l ? fastEgenskaper(l) : undefined, krig: (r.tro?.krig ?? 50) / 100, t };
};
// det byn r väljer i perioden n: handlingen och grannen med högst poäng (med slumpens lilla del), eller inget
export function byVal(s: State, vl: Varlden, r: VarldRad, n: number): { id: ByHandlingId; c: ByCtx; poang: number } | undefined {
  let bast: { id: ByHandlingId; c: ByCtx; poang: number } | undefined;
  const gr = radGrannar(vl, r), t = periodSlut(vl, 'dygn', n);
  for (let i = 0; i < gr.length; i++) {
    const c = byCtx(s, vl, r, gr[i], t);
    BYHANDLING_IDS.forEach((id, j) => {
      const p = DEF[id].poang(c) + (varldSlump(vl, r.nr, n, 0x4248 + i * 64 + j) - 0.5) * 2 * BYHANDLING.slump;
      if (p > 0 && (!bast || p > bast.poang)) bast = { id, c, poang: p };
    });
  }
  // ruinerna i grannätet: bara uppdraget (steg 11.8.9)
  const ruiner = (byPlats(vl, r.nr)?.grannar ?? []).map(g => varldPlatsNr(vl, g.nr)).map(q => q && ruinRad(vl, q.nr)).filter((x): x is VarldRad => !!x);
  ruiner.forEach((m, i) => {
    const c = byCtx(s, vl, r, m, t), p = DEF.uppdrag.poang(c) + (varldSlump(vl, r.nr, n, 0x5255 + i) - 0.5) * 2 * BYHANDLING.slump;
    if (p > 0 && (!bast || p > bast.poang)) bast = { id: 'uppdrag', c, poang: p };
  });
  // silvergruvorna byn känner: bara gruvfärden (steg 15.1.28)
  kandaGruvor(vl, r).forEach((q, i) => {
    const c = { ...byCtx(s, vl, r, r, t), gruva: q }, p = DEF.gruva.poang(c) + (varldSlump(vl, r.nr, n, 0x4752 + i) - 0.5) * 2 * BYHANDLING.slump;
    if (p > 0 && (!bast || p > bast.poang)) bast = { id: 'gruva', c, poang: p };
  });
  return bast;
}
// en gång om dygnet: varje by i världen med en ledare gör det den valt
export function byarnasHandlingar(s: State, vl: Varlden, n: number) {
  for (const r of [...vl.rader ?? []]) {
    if (!lever(vl, r) || !BYSORTER[r.sort].ledare) continue;
    const v = byVal(s, vl, r, n);
    if (!v) continue;
    DEF[v.id].gor(v.c);
    count(s, 'byhandling_' + v.id);
  }
}
// ---------- handelsfärden mellan två byar (steg 11.6.6, Flera samhällen: Priset och handeln mellan byar) ----------
// En by med överflöd i en varugrupp (mer än den vill ha) letar i sitt grannät efter den by där gruppen är dyrast jämfört med
// hemma, när resans kostnad (bärarna, dit och hem) är dragen, och skickar en handelsfärd om relationen tillåter åt båda håll.
// Lasten (hela grundvärden, maten i portioner) lämnar byn när färden går och läggs i mottagarens förråd när den kommer fram;
// mottagaren betalar med silver och, när silvret inte räcker, med det den själv har mest överflöd av. Betalningen bärs hem och
// läggs i byns förråd när färden kommer hem. Färden trampar vägen åt båda håll och syns på världskartan. Huvudbyn som mål kommer
// med handlaren (11.6.8).
export interface RadFard { gruva?: true; vant?: number; nere?: number; /* gruvfärden (steg 15.1.28): till är gruvans plats, vant det väntade silvret och nere dygnen i gruvan */ uppdrag?: number; /* uppdraget färden går mot (steg 11.8.9) */ besked?: BeskedTon; /* sändebudets besked (steg 11.6.23) */ gava?: true; anfall?: number; byte?: Partial<Record<VarugruppId, number>>; id: number; fran: number; till: number; g: VarugruppId; n: number; t0: number; t1: number; t2?: number; silver?: number; h?: VarugruppId; hn?: number; handlare?: true; last?: HandlarLast; hem?: HVara[]; mott?: string[]; folk?: string[] /* namnen på dem som går (steg B.39, fardfolk.ts) */; flytt?: number /* de som flyttar (steg 15.1.85) */; gar?: 'ut' | 'hem' /* färden går dit eller hem (steg 15.1.85) */; vg?: Gang /* gången längs vägen, som huvudbyns sällskap (steg 15.1.85) */; pack?: Record<string, number>; behov?: ResBehov; matNasta?: number; halsa?: number; letaHel?: number; letaArb?: number /* packningen, behoven, maten som tar slut, hälsan och letandet (steg 15.1.86, fardresa.ts) */; dagbok?: [number, string, import('./resa').DagbokId?][] /* det som hänt på vägen (steg 15.1.87) */; } // mott: de sällskap färden mött på vägen (steg 11.6.12) // last: handlarens varor och silver på väg till huvudbyn; hem: det hen bär hem (steg 11.6.9) // handlare: färden är en handlare som går till huvudbyn (steg 11.6.8)
// tonen i beskedet och dess poäng: det vänliga eller det ovänliga, det som lönar sig mest (huvudbyns stat och kyrka väljer
// likadant, sandebud.ts)
// fejden (steg 12.1.114): ju längre ner byn ser på grannen under beskedRel, desto mindre vill den vara vänlig (gåvan och det
// vänliga beskedet) och desto mer vill den vara ovänlig; vid beskedRel + beskedFull är det vänliga inget val alls
const fejdMot = (c: ByCtx) => clamp((-c.rel - BYHANDLING.beskedRel) / BYHANDLING.beskedFull, 0, 1);
// viljan att vara vänlig (gåvan och det vänliga beskedet): den växer ju längre relationen är under målet, men bara ner till
// fejdens gräns (−beskedRel); därunder växer den inte mer, och fejden tar den ner till noll (steg 12.6.8)
const vanVilja = (c: ByCtx, mal: number) => clamp(mal - c.rel, 0, mal + BYHANDLING.beskedRel) / 100 * (1 - fejdMot(c));
export function beskedTon(c: ByCtx): { ton: BeskedTon; p: number } {
  const fejd = fejdMot(c);
  const van = vanVilja(c, BYHANDLING.beskedMal) * (0.5 + ledDrag(c, 'karisma')) * radsla(c) * (1 - c.krig / 2) - BYHANDLING.beskedKostnad;
  const ovan = fejd * (0.5 + ledDrag(c, 'aggression')) * (0.5 + c.krig) / radsla(c) - BYHANDLING.beskedKostnad;
  return ovan > van ? { ton: 'ovanligt', p: ovan } : { ton: 'besked', p: van };
}
export type BeskedTon = 'besked' | 'ovanligt';
// byn har skickat ett ovänligt besked till grannen och ser fortfarande lika illa på den (steg 12.1.114): beskedet är inte längre ett
// val mot den grannen, och kriget är det. vl.ovanligt har relationen när beskedet skickades; har relationen stigit över gränsen
// för beskedet (det hjälpte) gäller det inte längre
const beskedGivet = (c: ByCtx) => { const v = c.vl.ovanligt?.[`${c.r.nr}>${c.mot.nr}`]; return v !== undefined && c.rel < -BYHANDLING.beskedRel; };
// en fientlig handling mellan a och b (steg 15.1.74): det ovänliga beskedet och anfallet. vl.ovanligt får a:s syn på b just då,
// om den inte redan har en lägre; minnet bleknar som relationen (relGlom i byrel.ts)
function fientlig(vl: Varlden, a: number, b: number) {
  const k = `${a}>${b}`, v = Math.round(relation(vl, a, b) ?? 0), o = (vl.ovanligt ??= {});
  o[k] = o[k] === undefined ? v : Math.min(o[k], v);
}
// ett bud från byn a till b är redan på väg
const beskedUte = (vl: Varlden, a: number, b: number) => !!vl.farder?.some(f => f.besked && f.fran === a && f.till === b);
// budet ger sig av: en färd utan last, med byns gåva när beskedet är vänligt och byn har något över
function skickaBud(c: ByCtx, ton: BeskedTon) {
  const { s, vl, r, mot } = c, dygn = restid(vl, r, mot);
  if (dygn === undefined) return;
  const t0 = c.t, f: RadFard = { id: fardNr(vl), fran: r.nr, till: mot.nr, g: 'mat', n: 0, t0, t1: t0 + dygn * DAY, besked: ton };
  if (ton === 'ovanligt') fientlig(vl, r.nr, mot.nr); // relationen när beskedet gick
  const a = ton === 'besked' && kanSkicka(vl, r, BYHANDLING.barare) ? gavaGrupp(s, vl, r, mot) : undefined; // gåvan: det byn har mest över
  if (a) {
    if (mot.nr === vl.huvud) { let i = 0; const l = packaRad(r, () => varldSlump(vl, r.nr, f.id, 0x4247 + i++), g => g === a.g ? a.n : 0, radHandlarSort(s, r), radDjur(s, r), iIstiden(ageIndex(s, t0))); if (l.varor.length) f.last = { ...l, silver: 0 }; } // till huvudbyn: hela saker som budet bär
    else { f.g = a.g; f.n = a.n; radTaUr(r, a.g, a.n); f.gava = true; }
  }
  skicka(s, vl, f, 1);
  count(s, 'radbesked_ut');
}
// kriget gäller två byar i världen, inte huvudbyn (den väljer själv, senare)
const krigUte = (c: ByCtx) => c.r.nr === c.vl.huvud || c.mot.nr === c.vl.huvud;
// så många ur byn nr är ute på en färd (steg 15.1.73): de räknas bort ur byns folk så länge de är borta, så att byn aldrig
// skickar fler än den har (flocken, bärarna, budet och handlarens följe)
export const radUte = (vl: Varlden, nr: number) => (vl.farder ?? []).reduce((a, f) => a + (f.fran === nr && !f.flytt ? f.anfall ?? f.folk?.length ?? (f.besked ? 1 : BYHANDLING.barare) : 0), 0); // de som flyttar är redan dragna ur folket
// de vuxna i byn som är hemma och kan gå (de som kan slåss, utom de som är ute)
export const ledigaVuxna = (vl: Varlden, r: VarldRad) => Math.max(0, Math.min(r.tal.folk, r.tal.styrka) - radUte(vl, r.nr));
// en ny färd med n som går kräver minst dubbelt så många lediga vuxna (steg 15.1.73): byn behåller folk hemma
export const kanSkicka = (vl: Varlden, r: VarldRad, n: number) => ledigaVuxna(vl, r) >= n * 2;
// det som redan är på väg till byn nr i gruppen g (handelsfärder och gåvor som inte kommit fram, steg 15.1.73)
export const paVag = (vl: Varlden, nr: number, g: VarugruppId) => (vl.farder ?? []).reduce((a, f) => a + (f.till === nr && f.t2 === undefined && !f.handlare && !f.anfall && f.g === g ? f.n : 0), 0);
const restid = (vl: Varlden, r: VarldRad, mot: VarldRad) => {
  const p = byPlats(vl, r.nr), q = byPlats(vl, mot.nr);
  return p?.grannar?.find(g => g.nr === q?.nr)?.dygn;
};
// det mottagaren kan betala med utom gruppen g: silvret och det den har mest överflöd av, i grundvärde
function betalning(s: State, mot: VarldRad, g: VarugruppId): { silver: number; h?: VarugruppId; hVarde: number } {
  let h: VarugruppId | undefined, hVarde = 0;
  for (const k of VARUGRUPP_IDS) {
    if (k === g) continue;
    const v = radOverskott(mot, k) * enhet(k) / radGruppPaslag(s, mot, k);
    if (v > hVarde) { h = k; hVarde = v; }
  }
  return { silver: mot.tal.silver, h, hVarde: Math.floor(hVarde) };
}
export interface FardAffar { g: VarugruppId; n: number; dygn: number; vinst: number }
// den bästa affären för byn c.r hos grannen c.mot: gruppen, lasten i enheter och vinsten i grundvärde efter resans kostnad
export function fardAffar(c: ByCtx): FardAffar | undefined {
  const { s, vl, r, mot } = c;
  if (c.rel < BYHANDLING.minRel || (relation(vl, mot.nr, r.nr) ?? 0) < BYHANDLING.minRel || !BYLAGEN[byLage(vl, r.nr, mot.nr)].handel) return undefined;
  const huvud = mot.nr === vl.huvud;
  if (huvud && (!r.syn || handlarUte(s, r.nr))) return undefined; // byns handlare är redan på väg till huvudbyn eller där
  if (!kanSkicka(vl, r, BYHANDLING.barare)) return undefined;
  const dygn = restid(vl, r, mot);
  if (dygn === undefined) return undefined;
  const kostnad = 2 * dygn * BYHANDLING.barare * BYHANDLING.dygnKostnad;
  let bast: FardAffar | undefined;
  for (const g of VARUGRUPP_IDS) {
    const ov = radOverskott(r, g);
    if (ov <= 0) continue;
    const hemma = radGruppPaslag(s, r, g), dar = radGruppPaslag(s, mot, g, paVag(vl, mot.nr, g)); // mottagarens pris med det som redan är på väg dit
    if (dar <= hemma) continue;
    const b = huvud ? undefined : betalning(s, mot, g), kan = b ? (b.silver + b.hVarde) / dar : BYHANDLING.last; // så mycket grundvärde mottagaren kan köpa (huvudbyn betalar med det den har)
    const n = Math.floor(Math.min(ov, BYHANDLING.last / enhet(g), kan / enhet(g)));
    if (n <= 0) continue;
    const vinst = n * enhet(g) * (dar - hemma) - kostnad;
    if (!bast || vinst > bast.vinst) bast = { g, n, dygn, vinst };
  }
  return bast;
}
// gåvan (steg 11.6.14): det byn har mest över (i grundvärde), högst BYHANDLING.gava, i hela enheter; inte till eller från huvudbyn
export function gavaAffar(c: ByCtx): FardAffar | undefined {
  const { vl, r, mot } = c;
  if (r.nr === vl.huvud || mot.nr === vl.huvud || !kanSkicka(vl, r, BYHANDLING.barare)) return undefined;
  const dygn = restid(vl, r, mot), b = gavaGrupp(c.s, vl, r, mot);
  return dygn === undefined || !b ? undefined : { ...b, dygn, vinst: 0 };
}
// färderna mellan byarna (kodgenomgången, fynd 156): nästa nummer (det används i världens slump, så det tas när färden
// skapas), färden som ger sig av med tyngd personer, den som vänder hem nu lika lång väg och de döda som dras av byns folk och styrka
const fardNr = (vl: Varlden) => vl.nastaFard = (vl.nastaFard ?? 0) + 1;
// platsen färden går till: grannbyns, eller gruvans för gruvfärden (steg 15.1.28)
export const fardDit = (vl: Varlden, f: RadFard) => f.gruva ? varldPlatsNr(vl, f.till) : byPlats(vl, f.till);
const fardPlats = (vl: Varlden, f: RadFard, nr: number) => nr === f.till ? fardDit(vl, f) : byPlats(vl, nr);
// stigen trampas där färden går, dit eller (hem) tillbaka
function trampaFardDit(s: State, f: RadFard, tyngd: number, t: number, hem = false) {
  if (!f.gruva) { if (hem) trampaFard(s, f.till, f.fran, tyngd, t); else trampaFard(s, f.fran, f.till, tyngd, t); return; }
  const vl = s.varld, a = vl && byPlats(vl, f.fran), b = vl && fardDit(vl, f);
  if (a && b) trampaPlatser(s, hem ? b : a, hem ? a : b, tyngd, t);
}
// färderna börjar utspridda över dygnet (steg 15.1.73): byn väljer en gång om dygnet, och de som går ger sig av vid en tid ur
// världens slump under det kommande dygnet; de räknas som ute (radUte) från valet
function skicka(s: State, vl: Varlden, f: RadFard, tyngd: number) {
  const d = Math.floor(varldSlump(vl, f.fran, f.id, 0x55545350) * DAY);
  f.t0 += d; f.t1 += d;
  (vl.farder ??= []).push(f);
  namnFolk(vl, f, f.handlare ? f.last?.folk ?? 1 : tyngd);
  packaFard(s, vl, f, fardFart(s)); // maten, vattnet, tälten och fodret ur byns förråd (steg 15.1.86)
  if (!gaUt(s, vl, f, f.fran, f.till, 'ut')) { trampaFardDit(s, f, sallskapTyngd(tyngd), f.t0); laggIKo(vl, f.t1, 'fardFram', { sak: f.id }); } // utan väg: som förut, vid den väntade tiden
}
// färden vänder hem från målet; den går lika fort som dit
function vandHem(s: State, vl: Varlden, f: RadFard, tyngd: number) {
  const dygn = f.t1 - f.t0;
  f.t1 = s.now; f.t2 = s.now + dygn;
  if (!gaUt(s, vl, f, f.till, f.fran, 'hem')) { f.t0 = s.now - dygn; trampaFardDit(s, f, sallskapTyngd(tyngd), s.now, true); laggIKo(vl, f.t2, 'fardHem', { sak: f.id }); }
}
// ---------- färderna går (steg 15.1.85, Flera samhällen: Alla resor i ett system) ----------
// En färd från en by i världen går som huvudbyns sällskap (gaLangs i resa.ts): ruta för ruta längs vägen i dagsljuset, i samma
// fart (en frisk vuxen 1, i snö RESA.snoFart), och rastar på natten. Den kommer fram när gången når målet, inte vid en uträknad
// tid. Varje timme i världen (PERIODRADER) går färderna i bitar om tio minuter, som sällskapen (TAKTER), från tiden de gav sig av
const platsFor = (vl: Varlden, nr: number) => byPlats(vl, nr) ?? varldPlatsNr(vl, nr);
export function gaUt(s: State, vl: Varlden, f: RadFard, fran: number, till: number, gar: 'ut' | 'hem'): boolean {
  const v = varldMark(s), a = platsFor(vl, fran), b = platsFor(vl, till);
  if (!v || !a || !b) return false;
  const i = a.y * v.w + a.x, j = b.y * v.w + b.x, vag = i === j ? undefined : vagMellan(vl, v, i, j, 'fots', s.now);
  if (!vag) return false;
  f.gar = gar; f.vg = { ruta: i, vag: { fran: vag.fran, till: vag.till, steg: vag.steg }, pos: 0, gang: 0 };
  return true;
}
// färdens fart: färdfolket är friska vuxna (1); snön bromsar som för sällskapet
export const fardFart = (s: State, f?: RadFard) => (snoPaMarken(s) >= RESA.snoFran ? RESA.snoFart : 1) * (f ? orkFart(f) : 1); // orken som sällskapets (steg 15.1.86)
const fardTyngd = (f: RadFard) => sallskapTyngd(fardAntal(f, BYHANDLING.barare), f.last?.djur && !f.last.vagnar ? 1 : 0, f.last?.vagnar ?? 0);
export function farderGar(s: State, vl: Varlden, n: number) {
  const tb = periodSlut(vl, 'timme', n), bit = 600 * SEC;
  for (const f of [...vl.farder ?? []]) {
    if (f.gruva && !f.gar && f.vg) { // nere i gruvan: de äter och dricker som sällskapet framme (steg 15.1.86)
      for (let t = tb - PERIODER.timme.sek * SEC + bit; t <= tb + 1e-6 && !f.gar; t += bit) if (!fardBehov(s, vl, f, t, bit, true)) break;
      continue;
    }
    if (!f.gar || !f.vg) continue;
    for (let t = tb - PERIODER.timme.sek * SEC + bit; t <= tb + 1e-6 && f.gar && f.vg; t += bit) {
      if (t <= f.t0) continue; // har inte gett sig av
      if (!fardBehov(s, vl, f, t, bit)) break; // de äter, dricker och rastar som sällskapet (steg 15.1.86); alla dog
      if (!isLight(t)) continue; // natt: rastar
      if (!gaLangs(s, f.vg, 'fots', fardFart(s, f) * fardLetaFart(f, t), fardTyngd(f), t, bit)) continue;
      if (f.gar === 'ut') fardFramme(s, vl, f, t);
      else { f.gar = undefined; fardHemma(s, vl, f, t); }
    }
  }
}
// maten tog slut och ledaren vände (MATSLUT, fardresa.ts): färden går hem härifrån med det den bär
FARDKROK.vand = (s, vl, f, t) => {
  if (f.gar !== 'ut' || !f.vg) return;
  const v = varldMark(s), a = f.vg.ruta, b = platsFor(vl, f.fran);
  if (!v || a === undefined || !b) return;
  const vag = a === b.y * v.w + b.x ? undefined : vagMellan(vl, v, a, b.y * v.w + b.x, 'fots', t);
  if (f.n > 0 && !f.anfall) { f.h = f.g; f.hn = f.n; f.n = 0; } // lasten bärs hem igen
  f.t1 = t; f.t2 = t + (t - f.t0);
  if (!vag) { fardHemma(s, vl, f, t); return; }
  f.gar = 'hem'; f.vg = { ...f.vg, ruta: a, vag: { fran: vag.fran, till: vag.till, steg: vag.steg }, pos: 0, gang: 0 };
};
// de som flyttar ger sig av (byflytt.ts): en färd med n personer, som kommer fram när den gått dit
export function skickaFlytt(s: State, vl: Varlden, fran: number, till: number, n: number, t0: number, dygn: number) {
  const f: RadFard = { id: fardNr(vl), fran, till, g: 'mat', n: 0, t0, t1: t0 + dygn * DAY, flytt: n };
  (vl.farder ??= []).push(f);
  packaFard(s, vl, f, fardFart(s)); // maten för vägen, ur byn de lämnar (steg 15.1.86)
  if (!gaUt(s, vl, f, fran, till, 'ut')) { vl.farder = vl.farder.filter(x => x !== f); laggIKo(vl, f.t1, 'flytt', { sak: till, data: { fran, n } }); } // utan väg: som förut
}
// gåvan: det byn r har över (högst BYHANDLING.gava i grundvärde, i hela enheter) som mottagaren mot behöver mest, efter
// mottagarens pris med det den redan har och det som redan är på väg dit (steg 15.1.73); huvudbyn har ingen rad att se i
function gavaGrupp(s: State, vl: Varlden, r: VarldRad, mot: VarldRad): { g: VarugruppId; n: number } | undefined {
  let bast: { g: VarugruppId; n: number; v: number } | undefined;
  for (const g of VARUGRUPP_IDS) {
    const n = Math.floor(Math.min(radOverskott(r, g), BYHANDLING.gava / enhet(g)));
    const v = n * enhet(g) * (mot.nr === vl.huvud ? 1 : radGruppPaslag(s, mot, g, paVag(vl, mot.nr, g)));
    if (n > 0 && (!bast || v > bast.v)) bast = { g, n, v };
  }
  return bast && { g: bast.g, n: bast.n };
}
function skickaFard(c: ByCtx, a: FardAffar, gava = false) {
  const { s, vl, r, mot } = c, t0 = c.t, huvud = mot.nr === vl.huvud, n = huvud ? 0 : a.n; // till huvudbyn går handlaren (lasten: 11.6.9)
  radTaUr(r, a.g, n);
  const f: RadFard = { id: fardNr(vl), fran: r.nr, till: mot.nr, g: a.g, n, t0, t1: t0 + a.dygn * DAY, ...huvud ? { handlare: true as const } : {}, ...gava ? { gava: true as const } : {} };
  if (huvud) { let i = 0; f.last = packaRad(r, () => varldSlump(vl, r.nr, f.id, 0x484c + i++), g => radOverskott(r, g), radHandlarSort(s, r), radDjur(s, r), iIstiden(ageIndex(s, t0))); } // handlarens varor ur raden (steg 11.6.9)
  skicka(s, vl, f, BYHANDLING.barare);
  count(s, gava ? 'radgava_ut' : huvud ? 'handlare_skickad' : 'radhandel_ut');
}
// handlarsorten (steg 11.6.10): byns dragdjur kommer ur marken där den ligger, oxen på slätten och hästen i skogen (bete åt
// dem); på annan mark har byn inga. Byn skickar den sista sorten i HANDLARSORTER som den är rik nog för och kan utrusta
export function radDjur(s: State, r: VarldRad): 'oxe' | 'hast' | undefined {
  const m = radMarkId(s, r);
  return m === 'slatt' ? 'oxe' : m === 'skog' ? 'hast' : undefined;
}
export function radHandlarSort(s: State, r: VarldRad): string {
  const per = r.tal.rikedom / Math.max(1, r.tal.folk) / RAD.rikPer, djur = !!radDjur(s, r);
  let ut = 'vandrande';
  for (const [id, d] of Object.entries(HANDLARSORTER)) if (per >= d.rik && (!d.djur || djur) && (!d.tek || r.tek.includes(d.tek))) ut = id;
  return ut;
}
handlarKrok.person = (s, f, i) => fardPerson(s.varld!, f, i); // följets namn (steg B.39)
handlarKrok.sorter = s => { const vl = s.varld, h = vl && radNr(vl, vl.huvud); return vl && h ? radGrannar(vl, h).filter(r => r.syn).map(r => radHandlarSort(s, r)) : []; };
// lasten ur byns rad (steg 11.6.9, Flera samhällen: Det som kommer till huvudbyn kommer ur en rad): när byn skickar sin handlare
// dras varorna ur HANDLARVAROR bland det byns tekniker kan göra (sakens tek), högst det byn har över i sakens varugrupp
// (over, i grundvärde och maten i portioner), och dras ur raden genast; silvret tas ur radens silver. Slumpen är världens
// (rand), så att det blir lika i det levande läget och ikappräkningen. Det hen har kvar och har köpt går hem till raden (fardHem)
// o.kg: den som packar bär så här mycket (företagets gäst, steg 15.1.11); o.utanSilver: silvret tas för sig
export function packaRad(r: VarldRad, rand: () => number, over: (g: VarugruppId) => number, sort = 'vandrande', djur?: TamArtId, sno = false, o: { kg?: number; utanSilver?: true } = {}): HandlarLast {
  const utr = HANDLARSORTER[sort].utr, f0 = HANDLAR_UTR[utr]?.fordon, d = f0 ? djur : undefined; // packdjuret (steg 11.11.5)
  // i snö tar karavanen släden när byn kan göra den (steg 11.11.8): det fordon som tar mest i fart gånger lass
  const f = f0 === 'vagn' && sno && r.tek.includes(RECEPT.slade.tek) ? valjDragfordon(['vagn', 'slade'], 'sno') : f0;
  // karavanen (steg 11.11.6): så många vagnar som byn kan avvara folk till, och lasten efter dem
  const karavan = f0 === 'vagn' && !!d, vmax = karavan ? Math.max(1, Math.min(KARAVAN.maxVagnar, Math.floor(r.tal.folk * KARAVAN.folkAndel / KARAVAN.folkPerVagn))) : 1;
  const kg = o.kg ?? utrVikt(utr, d, vmax, f);
  const helt = ([a, b]: readonly [number, number] | number[]) => a + Math.floor(rand() * (b - a + 1));
  const [a0, b0] = HANDEL.vardeVaror, mal = (a0 + rand() * (b0 - a0)) * vmax, ut: HVara[] = [];
  const kvar: Partial<Record<VarugruppId, number>> = {};
  const rader = HANDLARVAROR.filter(v => SAKER[v.k] && gruppAv(v.k) && (!SAKER[v.k]!.skaffa?.tek || r.tek.includes(SAKER[v.k]!.skaffa!.tek!)));
  const per = (k: string) => gruppAv(k) === 'mat' && isFood(k) ? 1 : grundvarde(k);
  let varde = 0;
  for (let i = 0; i < 30 * vmax && varde < mal && rader.length; i++) {
    const tot = rader.reduce((x, v) => x + v.vikt, 0);
    let x = rand() * tot, rad = rader[0];
    for (const v of rader) { x -= v.vikt; if (x < 0) { rad = v; break; } }
    const g = gruppAv(rad.k)!, k = kvar[g] ??= Math.max(0, over(g));
    const n = Math.min(helt(rad.n), Math.floor(k / Math.max(1e-9, per(rad.k))));
    if (n <= 0 || kgOf(ut) + n * viktOf(rad.k) > kg * HANDEL.fylla) continue;
    const f = ut.find(w => w.k === rad.k && !SAKER[rad.k]!.redskap);
    if (f) f.n += n; else if (SAKER[rad.k]!.redskap) for (let j = 0; j < n; j++) ut.push({ k: rad.k, n: 1, q: 2 }); else ut.push({ k: rad.k, n });
    kvar[g] = k - n * per(rad.k);
    radTar(r, rad.k, -n);
    varde += n * grundvarde(rad.k);
  }
  const silver = o.utanSilver ? 0 : Math.min(Math.floor(r.tal.silver), helt(HANDLARSORTER[sort].silver));
  radTar(r, 'silver', -silver);
  if (!karavan) return { varor: ut, silver, sort, ...d ? { djur: d } : {} };
  const vagnar = Math.max(1, Math.min(vmax, Math.ceil(varde / Math.max(1, mal / vmax)))); // en vagn för varje handlarlast av värdet
  return { varor: ut, silver, sort, djur: d, vagnar, folk: vagnar * KARAVAN.folkPerVagn, ...f !== f0 ? { fordon: f } : {} };
}
// färden kommer fram: lasten läggs i mottagarens förråd och mottagaren betalar efter sitt pris. Kön har bara färder ur en äldre
// sparning; sedan steg 15.1.85 kommer färderna fram när de gått dit (farderGar)
KOHANDELSER.fardFram = (s, vl, p) => { const f = vl.farder?.find(x => x.id === p.sak); if (f) fardFramme(s, vl, f, p.t ?? s.now); };
export function fardFramme(s: State, vl: Varlden, f: RadFard, t: number) {
  const p = { t };
  f.gar = undefined; f.t1 = t; // framme: den går inte längre dit
  const r = radNr(vl, f.fran), mot = radNr(vl, f.till);
  if (f.flytt) { flyttFram(s, vl, f, t); return; }
  if (f.gruva) { f.t2 = f.t1 + (f.nere ?? 0) * DAY + (f.t1 - f.t0); gruvFardFram(s, vl, f); laggIKo(vl, f.t1 + (f.nere ?? 0) * DAY, 'gruvUpp', { sak: f.id }); return; } // gruvfärden (steg 15.1.28): bärarna stannar i gruvan och går sedan hem
  if (f.handlare) { handlarFram(s, f.fran); return; }
  if (f.uppdrag !== undefined) { uppdragFardFram(s, vl, f); hemFran(s, vl, f, BYHANDLING.barare, p.t); return; } // handlaren väntar vid kartans kant och går in när det är fritt (handel.ts)
  f.t2 = f.t1 + (f.t1 - f.t0);
  if (f.besked) beskedFram(s, vl, f, r, mot); // sändebudet (steg 11.6.23): en gåva läggs i förrådet nedan
  if (f.besked && mot?.nr === vl.huvud) { hemFran(s, vl, f, 1, p.t); return; }
  if (f.anfall && mot?.nr === vl.huvud) { if (r && lever(vl, r)) { huvudAnfall(s, f, r); return; } } // flocken går in på huvudbyns karta och kommer hem när den lämnat den
  else if (f.anfall) { if (r && mot && lever(vl, r)) anfallFram(s, vl, f, r, mot); }
  else if (f.gava && mot && BYSORTER[mot.sort].folk && mot.tal.folk > 0) { // gåvan läggs i förrådet och mottagaren ser bättre på givaren
    radLaggTill(mot, f.g, f.n);
    if (r) byHandelse(vl, 'gava', r.nr, mot.nr, gavaRel(f.n * enhet(f.g)) / BYREL.gava);
    f.n = 0;
    count(s, 'radgava_fram');
  } else if (!f.besked && mot && BYSORTER[mot.sort].folk && mot.tal.folk > 0) {
    const pris = f.n * enhet(f.g) * radGruppPaslag(s, mot, f.g), b = betalning(s, mot, f.g);
    radLaggTill(mot, f.g, f.n);
    const sv = Math.min(b.silver, Math.round(pris));
    mot.tal.silver -= sv; f.silver = sv;
    if (b.h && pris - sv >= 1) {
      const hp = radGruppPaslag(s, mot, b.h), hn = Math.min(Math.max(0, radOverskott(mot, b.h)), Math.floor((pris - sv) * hp / enhet(b.h)));
      if (hn > 0) { radTaUr(mot, b.h, hn); f.h = b.h; f.hn = hn; }
    }
    if (r) { byHandelse(vl, 'handel', r.nr, mot.nr); byHandelse(vl, 'handel', mot.nr, r.nr); }
    count(s, 'radhandel_fram');
  } else { f.h = f.g; f.hn = f.n; } // byn finns inte längre: lasten bärs hem igen
  hemFran(s, vl, f, BYHANDLING.barare, p.t);
}
// framme går färden hem igen: i en äldre sparning (ingen gång) vid den väntade tiden
function hemFran(s: State, vl: Varlden, f: RadFard, tyngd: number, t: number) {
  f.t2 = f.t1 + (f.t1 - f.t0);
  gaHemNu(s, vl, f, tyngd, t);
}
function gaHemNu(s: State, vl: Varlden, f: RadFard, tyngd: number, t: number) {
  if (f.vg && gaUt(s, vl, f, f.till, f.fran, 'hem')) return;
  trampaFardDit(s, f, sallskapTyngd(tyngd), t, true);
  laggIKo(vl, f.t2!, 'fardHem', { sak: f.id });
}
// gruvfärdens bärare har brutit klart och går hem (steg 15.1.28)
KOHANDELSER.gruvUpp = (s, vl, p) => { const f = vl.farder?.find(x => x.id === p.sak); if (f) gaHemNu(s, vl, f, BYHANDLING.barare, p.t ?? s.now); };
// de som flyttade kommer fram (som KOHANDELSER.flytt i byflytt.ts): färden är slut
function flyttFram(s: State, vl: Varlden, f: RadFard, t: number) {
  vl.farder = (vl.farder ?? []).filter(x => x !== f);
  packaUr(radNr(vl, f.till) ?? radNr(vl, f.fran), f); // det som blev över har de med sig (steg 15.1.86)
  fardSlut(s, 'flytt', (t - f.t0) / DAY); // (steg 15.1.84)
  KOHANDELSER.flytt?.(s, vl, { t, nr: 0, typ: 'flytt', sak: f.till, data: { fran: f.fran, n: f.flytt! } });
}
// sändebudet kommer fram: till huvudbyn går budet in som en gäst (liv.ts, efter samtalet), annars verkar beskedet genast hos
// mottagaren; finns mottagaren inte längre ändrar det inget
function beskedFram(s: State, vl: Varlden, f: RadFard, r: VarldRad | undefined, mot: VarldRad | undefined) {
  if (!r || !mot || !BYSORTER[mot.sort].folk || (mot.nr !== vl.huvud && mot.tal.folk <= 0)) return;
  if (mot.nr === vl.huvud) { (vl.budTillHuvud ??= []).push({ fran: r.nr, ton: f.besked!, vem: fardPerson(vl, f, 0), ...f.last?.varor.length ? { gava: f.last.varor } : {} }); f.last = undefined; return; }
  byHandelse(vl, f.besked!, r.nr, mot.nr);
  count(s, 'radbesked_fram');
}
// färden kommer hem med betalningen
KOHANDELSER.fardHem = (s, vl, p) => { const f = vl.farder?.find(x => x.id === p.sak); if (f) fardHemma(s, vl, f, p.t ?? s.now); };
export function fardHemma(s: State, vl: Varlden, f: RadFard, t: number) {
  const p = { t }, i = vl.farder?.indexOf(f) ?? -1;
  if (i < 0) return;
  const r = radNr(vl, f.fran);
  vl.farder!.splice(i, 1);
  packaUr(r && r.tal.folk > 0 ? r : undefined, f); // det som inte gått åt kommer hem (steg 15.1.86)
  fardSlut(s, fardSort(f), (p.t - f.t0) / DAY); // (steg 15.1.84)
  if (!r || !BYSORTER[r.sort].folk || r.tal.folk <= 0) return;
  r.tal.silver += f.silver ?? 0;
  if (f.h && f.hn) radLaggTill(r, f.h, f.hn);
  for (const w of f.hem ?? []) radTar(r, w.k, w.n); // handlarens varor (steg 11.6.9)
  for (const w of f.besked ? f.last?.varor ?? [] : []) radTar(r, w.k, w.n); // gåvan som inte kom fram
  for (const [g, n] of Object.entries(f.byte ?? {}) as [VarugruppId, number][]) radLaggTill(r, g, n); // bytet (steg 11.6.16)
  if (f.anfall && f.till === vl.huvud && f.hem?.length) VAKTKROK.plundrad(s, r, f.hem.map(w => [w.k, w.n] as [string, number])); // ledaren får veta vart det stulna tog vägen (steg 11.13.27)
}
// flocken kommer fram (steg 11.6.16): uträkningen i radanfall.ts, de döda dras ur båda byarna, bytet tas ur försvararnas förråd
// och bärs hem, och försvararnas syn på anfallarna sjunker för plundringen och för varje dödad
function anfallFram(s: State, vl: Varlden, f: RadFard, r: VarldRad, mot: VarldRad) {
  if (!BYSORTER[mot.sort].folk || mot.tal.folk <= 0) return; // byn finns inte längre: flocken går hem
  const hade = VARUGRUPP_IDS.reduce((a, g) => a + radHar(mot, g) * enhet(g), 0); // det byn hade före anfallet (för nöden)
  const u = anfallUtfall(r, mot, f.anfall!, i => varldSlump(vl, r.nr, f.id, 0x414e + i), enhet);
  count(s, 'radanfall_med', f.anfall! + forsvarare(mot)); // alla som var med, för andelen döda (steg 11.6.19)
  radDoda(r, u.dodaA); radDoda(mot, u.dodaF); resStat(s, 'by:anfall', 'döda', u.dodaA);
  f.anfall! -= u.dodaA; fardDoda(vl, f, u.dodaA, f.t1);
  for (const [g, n] of Object.entries(u.byte) as [VarugruppId, number][]) radTaUr(mot, g, n);
  f.byte = u.byte;
  plundradNod(mot, u.varde, hade, u.dodaF); // den plundrade byn får nöd, som driver folk ut (steg 15.1.76)
  fientlig(vl, r.nr, mot.nr); fientlig(vl, mot.nr, r.nr); // anfallet är en fientlig handling mellan byarna (steg 15.1.74)
  byHandelse(vl, 'plundring', r.nr, mot.nr);
  if (u.dodaF) byHandelse(vl, 'dodade', r.nr, mot.nr, u.dodaF);
  varldHandelse(vl, 'rad', f.t1, { by: r.nr, mot: mot.nr });
  count(s, 'radanfall_fram'); if (u.vann) count(s, 'radanfall_vann'); count(s, 'radanfall_doda', u.dodaA + u.dodaF);
}
// flocken kommer till huvudbyn (steg 11.6.20): rövarna går in från kanten mot byn som skickade dem, så många som flocken är,
// och skälet kommer ur klanens syn på huvudbyn (rader.ts). Färden väntar tills flocken lämnat kartan (flockKrok.slut)
function huvudAnfall(s: State, f: RadFard, r: VarldRad) {
  const fl = radKommer(s, r.syn, f.anfall!, undefined, Array.from({ length: f.anfall! }, (_, i) => fardPerson(s.varld!, f, i)), r);
  fl.fard = f.id;
  const h = radNr(s.varld!, s.varld!.huvud); if (h) fl.chans = vinstChans(r, h, f.anfall!); // det världen räknade med, för npm run strid (steg 15.1.152)
  count(s, 'varldsanfall');
}
// flocken är borta från huvudbyns karta: de som inte kom hem är döda, och det de bar går hem till byn
flockKrok.slut = (s, fl) => {
  const vl = s.varld, f = vl?.farder?.find(x => x.id === fl.fard), r = f && radNr(vl!, f.fran);
  if (!vl || !f) return;
  const hem = fl.hemN ?? 0, doda = Math.max(0, f.anfall! - hem);
  if (r) radDoda(r, doda);
  fardDoda(vl, f, doda, s.now);
  count(s, 'varldsanfall_doda', doda); resStat(s, 'by:anfall', 'döda', doda);
  f.anfall = hem;
  f.hem = Object.entries(fl.hemBar ?? {}).filter(([k, n]) => k in SAKER && n > 0).map(([k, n]) => ({ k: k as HVara['k'], n }));
  if (r && f.hem.length) varldHandelse(vl, 'rad', s.now, { by: r.nr, mot: vl.huvud });
  if (!hem) { vl.farder = vl.farder!.filter(x => x !== f); fardSlut(s, fardSort(f), (s.now - f.t0) / DAY); return; }
  vandHem(s, vl, f, hem);
};
// byns handlare är på väg till huvudbyn, väntar vid kanten eller är där
const handlarUte = (s: State, nr: number) => !!s.varld?.farder?.some(f => f.handlare && f.fran === nr) || !!s.handlarVantar?.includes(nr);
// handlaren har gått från huvudbyn (handel.ts): färden hem börjar, lika lång som dit; dog hen kommer färden aldrig hem
handlarKrok.hem = (s, rad, last) => {
  const vl = s.varld, f = vl?.farder?.find(x => x.handlare && x.fran === rad && x.t2 === undefined);
  if (!vl || !f) return;
  const bar = last ?? f.last; // kom hen aldrig in bär hen hem det hen tog med sig
  if (bar) { f.silver = bar.silver; f.hem = bar.varor; delete f.last; }
  vandHem(s, vl, f, 1);
};
handlarKrok.borta = (s, rad) => { const vl = s.varld; if (vl?.farder) vl.farder = vl.farder.filter(x => { const ut = !!x.handlare && x.fran === rad; if (ut) fardSlut(s, 'handlare', (s.now - x.t0) / DAY); return !ut; }); };
// färdens sort i världens statistik (npm run resor, steg 15.1.84)
export const fardSort = (f: RadFard) => f.flytt ? 'flytt' : f.uppdrag !== undefined ? 'uppdrag' : f.besked ? 'besked' : f.anfall !== undefined ? 'anfall' : f.gava ? 'gava' : f.handlare ? 'handlare' : 'handel';
// var färden är nu, i världens rutor (för kartan): längs vägen ut och sedan hem
const fardRutor = (vl: Varlden, w: number, a: number, b: number) => {
  const v = sparadVag(vl, 'fots', a, b);
  if (v) return vagRutor(v, w);
  const u = sparadVag(vl, 'fots', b, a);
  return u ? vagRutor(u, w).reverse() : undefined;
};
// rutorna färden går över mellan tiderna ta och tb, på vägen ut och hem (för mötena på vägen, steg 11.6.12)
export function fardSpar(vl: Varlden, f: RadFard, ta: number, tb: number, w: number): number[] {
  if (f.vg) { const ut = [...f.vg.spar ?? [], ...f.gar && f.vg.ruta !== undefined ? [f.vg.ruta] : []]; delete f.vg.spar; return ut; } // rutorna färden gått sedan sist, som sällskapets (steg 15.1.85)
  const ut: number[] = [];
  for (const [fr, ti, a, b] of [[f.fran, f.till, f.t0, f.t1], [f.till, f.fran, f.t1, f.t2]] as [number, number, number, number | undefined][]) {
    if (b === undefined) continue;
    const lo = Math.max(ta, a), hi = Math.min(tb, b);
    if (hi < lo) continue;
    const p = fardPlats(vl, f, fr), q = fardPlats(vl, f, ti), v = p && q ? fardRutor(vl, w, p.y * w + p.x, q.y * w + q.x) : undefined;
    if (!v?.length) continue;
    const del = (t: number) => (t - a) / Math.max(1, b - a) * (v.length - 1);
    for (let i = Math.max(0, Math.floor(del(lo))); i <= Math.min(v.length - 1, Math.ceil(del(hi))); i++) ut.push(v[i]);
  }
  return ut;
}
export function fardLage(vl: Varlden, f: RadFard, t: number, w: number): { x: number; y: number; dx: number } | undefined {
  if (t < f.t0) return undefined; // har inte gett sig av än (steg 15.1.73)
  if (f.vg) { // färden står på sin ruta längs vägen, som sällskapet (steg 15.1.85)
    if (!f.gar || f.vg.ruta === undefined || !f.vg.vag) return undefined;
    const v = vagRutor(f.vg.vag as Parameters<typeof vagRutor>[0], w), i = f.vg.pos ?? 0, a = v[i] ?? f.vg.ruta, b = v[Math.min(v.length - 1, i + 1)] ?? a;
    return { x: a % w, y: Math.floor(a / w), dx: Math.sign(b % w - a % w) };
  }
  if (t >= f.t1 && f.t2 === undefined) return undefined; // framme (handlaren i huvudbyn)
  const ut = t < f.t1, a = fardPlats(vl, f, ut ? f.fran : f.till), b = fardPlats(vl, f, ut ? f.till : f.fran);
  if (!a || !b) return undefined;
  const v = fardRutor(vl, w, a.y * w + a.x, b.y * w + b.x);
  if (!v?.length) return undefined;
  const del = ut ? (t - f.t0) / Math.max(1, f.t1 - f.t0) : (t - f.t1) / Math.max(1, (f.t2 ?? f.t1) - f.t1);
  const x = Math.min(v.length - 1, Math.max(0, del * (v.length - 1))), i = Math.floor(x), j = Math.min(v.length - 1, i + 1), d = x - i;
  const ax = v[i] % w, ay = Math.floor(v[i] / w), bx = v[j] % w, by = Math.floor(v[j] / w);
  return { x: ax + (bx - ax) * d, y: ay + (by - ay) * d, dx: Math.sign(bx - ax) };
}
PERIODRADER.push({ namn: 'byarnas handlingar', period: 'dygn', fn: (s, vl, n) => byarnasHandlingar(s, vl, n) });
PERIODRADER.push({ namn: 'färderna går', period: 'timme', fn: (s, vl, n) => farderGar(s, vl, n) });
