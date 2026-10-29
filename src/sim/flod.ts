import { balans } from './balans';
import { count, log } from './folk';
import { motgangNu, motgangTal } from './motgang';
import { roofed } from './byggnad';
import { stacksOf, tidy } from './lager';
import { forvarAt } from './stationer';
import { isFood, viktOf } from './saker';
import { vattenNu } from './sjo';
import { vattnetAndrat } from './torka';
import { DAY, HOUR, State, T, W } from './typer';

// Översvämningen (steg 3.8.3, "Motgångarna i spelet" i designdokumentet). En av motgångarna i registret MOTGANGAR
// (motgang.ts), på våren och hösten: efter ett långt regn stiger sjön en ruta i taget, en till tre rutor upp på marken
// närmast stranden (djupOf.land i sjo.ts), står kvar ett par dygn och sjunker. Vattnet följer rutorna och stoppas inte av
// väggar (vattnet som det är nu i sjo.ts). På en ruta som hamnar under vatten förstörs maten, lätta saker flyter bort ute
// men stannar inne i ett hus, och tunga saker ligger kvar och slits fortare (wearMult i lager.ts); det som ligger i kistor
// och på hyllor klarar sig. Fält under vatten dör (odling.ts). Ingen lägger något på en ruta under vatten (usable i lager.ts)
// och folk går runt vattnet (blocked i byggnad.ts). Nivån räknas ur tiden, och allt som ändrar vattnet sker här, i timsteget,
// så att det levande läget och ikappräkningen får samma vatten.

// Balanstal (regel 8)
export const FLOD = balans('flod', {
  borjar: [0.5, 2], // vattnet börjar stiga så här många dygn (år i spelet) in i tidsåldern (slumpas mellan) ...
  hojd: [1, 3], // ... och stiger så här många rutor upp på land (slumpas mellan, hela rutor) ...
  stigTim: 6, // ... en ruta var så här många timmar ...
  staDygn: 1.5, // ... står kvar högst så här många dygn ...
  sjunkTim: 12, // ... och sjunker en ruta var så här många timmar
  regn: 0.25, // från ett halvt dygn innan vattnet stiger tills det står som högst är gränsen för regn (regnFran i vader.ts) så här mycket lägre
  regnFore: 12, // ... (timmar innan)
  latt: 0.5, // saker som väger högst så här mycket (kg per styck: grenar, hö, mossa, frön) flyter bort ute
  slit: 3, // tunga saker under vatten slits så här många gånger fortare
});

// hur översvämningen i tidsåldern som börjar vid start blir: när vattnet börjar stiga och hur högt det når
function forlopp(s: State, start: number) {
  const b = start + (FLOD.borjar[0] + motgangTal(s, start, 3811) * (FLOD.borjar[1] - FLOD.borjar[0])) * DAY;
  const topp = Math.min(FLOD.hojd[1], FLOD.hojd[0] + Math.floor(motgangTal(s, start, 3812) * (FLOD.hojd[1] - FLOD.hojd[0] + 1)));
  const hogst = (topp - 1) * FLOD.stigTim, sjunker = hogst + FLOD.staDygn * 24; // timmar efter b
  return { b, topp, hogst, sjunker };
}
// hur många rutor upp på land vattnet står vid tiden t (0 = som vanligt)
export function flodNiva(s: State, t = s.now) {
  const m = motgangNu(s, t);
  if (m?.id !== 'oversvamning') return 0;
  const f = forlopp(s, m.start), x = (t - f.b) / HOUR;
  if (x < 0) return 0;
  if (x <= f.sjunker) return Math.min(f.topp, 1 + Math.floor(x / FLOD.stigTim));
  return Math.max(0, f.topp - 1 - Math.floor((x - f.sjunker) / FLOD.sjunkTim));
}
// regnar det kraftigt inför översvämningen (vader.ts)
export function flodRegn(s: State, t = s.now) {
  const m = motgangNu(s, t);
  if (m?.id !== 'oversvamning') return false;
  const f = forlopp(s, m.start), x = (t - f.b) / HOUR;
  return x >= -FLOD.regnFore && x <= f.hogst;
}

// ---------- varje timme (steg.ts) ----------
export function stepFlod(s: State) {
  const niva = flodNiva(s), fore = s.flod?.niva ?? 0;
  if (niva === fore) return;
  const gammalt = vattenNu(s); // vattnet innan något ändras här
  if (niva && s.sjoTorr) delete s.sjoTorr; // sjön är full igen efter en torka
  if (niva) s.flod = { niva }; else delete s.flod;
  vattnetAndrat(s, gammalt, false);
  if (niva > fore) {
    dranker(s, gammalt);
    count(s, 'flod stiger');
    log(s, fore ? 'Vattnet fortsätter att stiga.' : 'Sjön svämmar över. Vattnet stiger upp på stranden.', 'world');
  } else log(s, niva ? 'Vattnet sjunker undan.' : 'Vattnet har dragit sig tillbaka till stranden.', 'world');
}
// det som vattnet nådde: maten förstörs och lätta saker flyter bort ute; tunga saker och det i kistor och på hyllor ligger kvar
function dranker(s: State, fore: Uint8Array) {
  const efter = vattenNu(s);
  let mat = 0, bort = 0;
  for (const a of stacksOf(s)) {
    const i = a.y * W + a.x;
    if (efter[i] !== T.Vatten || fore[i] === T.Vatten || forvarAt(s, a.x, a.y)) continue;
    if (isFood(a.k)) { mat += a.n; a.n = 0; a.dold = undefined; }
    else if (viktOf(a.k) <= FLOD.latt && !roofed(s, a.x, a.y)) { bort += a.n; a.n = 0; a.dold = undefined; }
  }
  if (mat) { count(s, 'flod mat', mat); log(s, `Vattnet förstörde ${mat} mat i lagret.`, 'world'); }
  if (bort) { count(s, 'flod flot bort', bort); log(s, `${bort} lätta saker flöt bort med vattnet.`, 'world'); }
  if (mat || bort) tidy(s);
}