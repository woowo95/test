// Gästernas vardag (steg 9.2.113, "Ekonomi och handel: Gästerna är personer" i designdokumentet): det som gäller byborna gäller
// gästen. Hen blir hungrig, trött, törstig och kall, äter ur sin egen packning (gast.mat, portioner hen kom med), dricker ur sin
// vattensäck, sover när hen väntar och ingen handlar, kan bli sjuk och dö, och vårdas av byborna (vardVal i halsa.ts). Gästens
// egna handlingar (gå till byn, vänta, handla vid filten, plundra, fly, gå hem) är rader i handlingsregistret med sorten som
// krav (ACTS[act].gast); gastAkt sätter den som passar det sorten gör just nu. Allt dras ur gästens egna slumpföljder (p.rngs),
// aldrig byns, så att byn utvecklas likadant vare sig en gäst kommer eller inte, så länge gästen inte behöver något av byn
import { rovarFlockar } from './rovare';
import type { Act, Person, State } from './typer';
import { H, HOUR, HOUR_S, T, W } from './typer';
import { vattenNu } from './sjo';
import { balans } from './balans';
import { chance, clamp } from './slump';
import { ACTS } from './handlingar';
import { KROPP, ageOf, count, log } from './folk';
import { ata, naringSjunker } from './naring';
import { TORST, gastSackKrok, torstSteg } from './torst';
import { halsaLage } from './steg';
import { forkylning, insjukna, sjukSteg } from './sjukdom';
import { ageIndex } from './tid';
import { nyKvarleva } from './kvarlevor';
import { notis } from './notiser';
import { handlarenDog } from './handel';
import { gasterNu, type GastSort } from './gast';
import { tanke } from './tankar';

export const GASTVARD = balans('gastvard', {
  matsack: 6, // portionerna i packningen när gästen kommer
  atUnder: 0.45, // gästen äter när mättnaden är under detta
  portion: 0.4, // så mycket en portion höjer mättnaden
  drickUnder: 0.4, // och dricker ur vattensäcken under detta ...
  sack: 4, // ... som rymmer så här många klunkar och fylls när gästen går förbi vattnet (steg 10.2.35)
  sackNara: 1.5, // så nära vattnet (rutor) fyller gästen säcken
  sovUnder: 0.35, // somnar när vilan är under detta, om ingen handlar
  vaken: 0.95, // och vaknar när den är så här hög
  somnTim: 6, // timmar sömn från tom till full vila
  vakenTim: 18, // timmar vaken från full till tom vila
  klad: 0.85, // så mycket av kylan gästens reskläder tar (gästen är klädd för vägen)
});

gastSackKrok.fyll = q => { if (q.gast) q.gast.vatten = GASTVARD.sack; }; // vattnet som byborna bär till gästen (torst.ts, steg 12.1.228)

// får p göra handlingen? Gästernas handlingar kräver sorten, och byborna gör dem aldrig
export function kanGora(p: Person, act: Act) {
  const g = (ACTS[act] as { gast?: readonly GastSort[] }).gast;
  return g ? !!p.gast && g.includes(p.gast.sort) : true;
}

// det gästen gör just nu, ur det sorten gör (handel.ts och rovare.ts styr dem): handlingen och platsen
function gastAkt(s: State, p: Person): Act {
  const g = p.gast!;
  if (g.sover) return 'sova';
  if (g.sort === 'handlare') {
    const h = s.handlare;
    if (!h || h.id !== p.id) return 'gaHem';
    return h.fas === 'kommer' ? 'gastKommer' : h.fas === 'vantar' ? 'gastVantar' : h.fas === 'handlar' ? 'gastHandla' : 'gaHem';
  }
  if (g.sort === 'rovare') {
    const f = rovarFlockar(s).find(f => f?.folk.includes(p.id));
    if (!f) return 'gaHem';
    return f.gor === 'kommer' ? 'gastKommer' : f.gor === 'vantar' ? 'gastVantar' : f.gor === 'flyr' ? 'gastFly' : 'plundra';
  }
  if (g.sort === 'folje') { // karavanens följe går när ledaren går (steg 11.11.6)
    const h = s.handlare;
    if (!h?.folj?.includes(p.id)) return 'gaHem';
    return h.fas === 'kommer' ? 'gastKommer' : h.fas === 'gar' ? 'gaHem' : 'gastLager';
  }
  if (g.sort === 'besok' && g.fas === 'pratar' && g.gor === 'hjalper') return 'bygga'; // besökaren hjälper byn att bygga (steg 11.13.23)
  if (g.sort === 'framling' || g.sort === 'besok') return g.fas === 'pratar' ? 'gastVantar' : g.fas === 'gar' ? 'gaHem' : 'gastKommer';
  return 'gastKommer';
}
function satt(s: State, p: Person, act: Act) {
  if (!kanGora(p, act)) return;
  if (p.task?.act === act) { p.task.tx = p.x; p.task.ty = p.y; return; }
  p.task = { act, phase: 'do', tx: p.x, ty: p.y, until: s.now + HOUR, carry: 0, why: ACTS[act].namn };
}

// sover handlaren? När hen väntar eller sitter vid filten och ingen handlar eller står i kö
function kanSova(s: State, p: Person) {
  const h = s.handlare;
  if (p.gast!.sort === 'folje') return !!h?.folj?.includes(p.id) && (h.fas === 'vantar' || h.fas === 'handlar'); // följet sover i lägret
  if (p.gast!.sort === 'fange') return !!p.fange && p.task?.act === 'fangen' && p.task.phase === 'do'; // fången sover i fängelset
  if (p.gast!.sort === 'besok') return p.gast!.fas === 'pratar'; // besökaren sover i byn hen besöker (steg 11.13.10)
  if (p.gast!.sort !== 'handlare') return false;
  return !!h && h.id === p.id && (h.fas === 'vantar' || (h.fas === 'handlar' && !h.affar && !h.ko?.length));
}

// står gästen vid vattnet (en vattenruta inom GASTVARD.sackNara)?
function vidVattnet(s: State, p: Person) {
  const v = vattenNu(s), r = Math.ceil(GASTVARD.sackNara);
  for (let y = Math.floor(p.y) - r; y <= Math.floor(p.y) + r; y++) for (let x = Math.floor(p.x) - r; x <= Math.floor(p.x) + r; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) > GASTVARD.sackNara) continue;
    if (v[y * W + x] === T.Vatten) return true;
  }
  return false;
}
// ett slag för varje gäst (steg.ts, efter byborna). varme = gästens värme efter slaget, räknad som en bybos i steg.ts
export function gastVardag(s: State, dtSec: number, varme: (p: Person) => number) {
  const h = dtSec / HOUR_S, now = s.now;
  for (const p of gasterNu(s)) {
    const g = p.gast!, a = ageOf(p, now);
    g.mat ??= GASTVARD.matsack;
    // behoven
    naringSjunker(p, h, KROPP.hungerTim);
    if (p.hunger < GASTVARD.atUnder && g.mat >= 1) { g.mat--; ata(p, { torrmort: GASTVARD.portion / 2, rotter: GASTVARD.portion / 2 }); count(s, 'gast at'); }
    torstSteg(s, p, a, dtSec);
    g.vatten ??= GASTVARD.sack;
    if (g.vatten < GASTVARD.sack && vidVattnet(s, p)) g.vatten = GASTVARD.sack; // säcken fylls när gästen går förbi vattnet
    if (p.torst < GASTVARD.drickUnder && g.vatten >= 1) { g.vatten--; p.torst = 1; count(s, 'gast drack'); }
    p.warm = varme(p);
    p.social = clamp(p.social - dtSec / (KROPP.socialTim * HOUR_S), 0, 1);
    // sömnen
    if (g.sover && (p.rest >= GASTVARD.vaken || !kanSova(s, p))) { g.sover = undefined; if (p.rest >= GASTVARD.vaken) count(s, 'gast sov'); }
    else if (!g.sover && p.rest < GASTVARD.sovUnder && kanSova(s, p)) g.sover = 1;
    p.rest = clamp(p.rest + h * (g.sover ? 1 / GASTVARD.somnTim : -1 / GASTVARD.vakenTim), 0, 1);
    if (p.warm < KROPP.fryser) tanke(p, 'fryser', now);
    // hälsan, som en bybos (healthStep i steg.ts), utan ålderdom och olyckor
    const hl = halsaLage(p, now);
    if (hl === 'svalt') p.health -= dtSec / (KROPP.svaltTim * HOUR_S);
    else if (hl === 'frys') p.health -= dtSec / (KROPP.frysTim * HOUR_S);
    else if (hl === 'torst') p.health -= dtSec / (TORST.tomTim * HOUR_S); // som en bybo (steg 12.1.64)
    else if (hl === 'laker') p.health = clamp(p.health + dtSec / (KROPP.lakerTim * HOUR_S), 0, 1);
    const sjukDod = sjukSteg(s, p, dtSec, !!g.sover, false);
    if (!p.sjuk && chance(s, forkylning(ageIndex(s)), dtSec, 'halsa', p)) insjukna(s, p, 'forkylning');
    if (sjukDod || p.health <= 0) { gastDor(s, p, sjukDod ? 'av sjukdom' : p.hunger <= 0 ? 'av svält' : p.torst <= 0 && p.warm >= KROPP.frysdod ? 'av törst' : 'av kyla'); continue; }
    if (g.sort !== 'fange') satt(s, p, gastAkt(s, p)); // fången styrs av fangeSteg i rovare.ts (steg 11.12.6)
  }
}

// gästen dör: kroppen ligger kvar så att byborna kan begrava den (kvarlevor.ts), handlarens besök tar slut och rövaren
// lämnar flocken
export function gastDor(s: State, p: Person, orsak: string) {
  p.died = s.now; p.cause = orsak; p.task = undefined;
  count(s, 'gaster doda');
  nyKvarleva(s, 'framling', p, p.name); // en egen rad i KVARLEVOR (steg 10.4.13)
  if (p.gast!.sort === 'handlare' && s.handlare?.id === p.id) handlarenDog(s, s.handlare);
  for (const f of rovarFlockar(s)) if (f) f.folk = f.folk.filter(id => id !== p.id);
  const t = `${p.name}${p.gast!.hem ? ' från ' + p.gast!.hem : ''} dog ${orsak}.`;
  log(s, t, 'death', [p.id]); notis(s, 'gast', t, [p.id], { x: Math.floor(p.x), y: Math.floor(p.y) });
}
