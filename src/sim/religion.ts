import { clamp, gauss, rnd } from './slump';
import { Person, State } from './typer';
import { balans } from './balans';

// Religionen (fas 4.1, "Religion" i designdokumentet). Andligheten (steg 4.1.1.1) är en egenskap hos varje person, 0–100:
// hur viktigt det heliga är för hen, inte vad hen tror på. Den ärvs delvis och flyttas av upplevelserna (uppvaxt.ts, steg
// 4.1.1.3). Den finns från början men syns i gränssnittet först när den första tron finns.

// ---------- balanstal (regel 8) ----------
export const ANDE = balans('andlighet', {
  arv: 0.6, // så stor del av ett barns andlighet kommer från föräldrarnas snitt; resten är en egen dragning
  arvSlump: 8, // så mycket (gånger gauss) det ärvda ändras
  // upplevelserna som flyttar andligheten (steg 4.1.1.3, "Andlighetens riktning" i designdokumentet)
  riktning: 0.6, // chansen att den går uppåt är hälften plus så här mycket gånger (andligheten − 50) / 100: den troende ser ett tecken, den tvivlande en slump
  vuxen: 8, // så mycket en upplevelse flyttar andligheten hos en vuxen ...
  barn: 16, // ... och hos ett barn
});

// en ny persons andlighet: grundarna och de som flyttar in slumpas jämnt över 0–100, ett barn får en del av föräldrarnas
// snitt. Drar ur personens egen följd 'tro', så att inget annat ändras
export function nyAndlighet(s: State, p: Person, mother?: Person, father?: Person) {
  const egen = rnd(s, 'tro', p) * 100;
  if (!mother || !father) return Math.round(egen);
  const snitt = (andlighet(s, mother) + andlighet(s, father)) / 2;
  return Math.round(clamp(ANDE.arv * snitt + (1 - ANDE.arv) * egen + gauss(s, 'tro', p) * ANDE.arvSlump, 0, 100));
}
// andligheten: den man föddes med (alla har en: en äldre sparfil får den i migrate, varld.ts) plus det upplevelserna flyttat
// (u.n, steg 4.1.1.3), inom 0–100
export function andlighet(_s: State, p: Person) {
  let v = p.andlig ?? 50;
  for (const u of p.upp ?? []) v += u.n ?? 0;
  return clamp(v, 0, 100);
}
// åt vilket håll och hur mycket en upplevelse flyttar p:s andlighet (uppvaxt.ts upplev): uppåt med chansen hälften plus
// ANDE.riktning gånger hur andlig hen redan är. Om tron hjälpte kommer med bönen (steg 10.1). Drar ur personens följd 'tro'
export function andeRiktning(s: State, p: Person, vuxen: boolean) {
  const upp = rnd(s, 'tro', p) < 0.5 + ANDE.riktning * (andlighet(s, p) - 50) / 100;
  return (upp ? 1 : -1) * (vuxen ? ANDE.vuxen : ANDE.barn);
}
// andligheten syns i gränssnittet först när den första tron finns (steg 4.1.2.1)
export const andligSyns = (s: State) => !!s.tron?.length;

// ---------- tron ----------
export interface Tro { id: number }
