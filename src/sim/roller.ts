// Tre roller vid larm (steg 9.5.19, Hälsosystemet i detalj: Tre roller vid larm): när ett hot kommer delas byn i kämpar, hjälpare och
// gömda, ur ett värde av ålder, mod och hälsa (viljan, rovarVilja i rovare.ts) plus det hotet lägger till. Varje hot är en rad i
// LARMHOT med sina två gränser; vargarna och rövarna fyller i sina rader när allt är laddat. Rollen väljs när larmet går och väljs om
// när något händer (någon skadas eller dör, s.larmV) eller efter LARMROLL.giltig timmar, och syns i kortet
import { HOUR, Person, State } from './typer';
import { balans } from './balans';

export type LarmRoll = 'kampe' | 'hjalpare' | 'gomd';
export const ROLLNAMN: Record<LarmRoll, string> = { kampe: 'Kämpe', hjalpare: 'Hjälpare', gomd: 'Gömmer sig' };
export interface LarmHot { namn: string; plus: (s: State, p: Person) => number; kampe: () => number; hjalp: () => number }
export const LARMHOT: Record<string, LarmHot> = {};
export const LARMROLL = balans("larmroll", { giltig: 1, hotVikt: 60 /* hotet på en plats och på vägen dit (0–1) väger så många rutors väg (steg B.48) */ }); // en roll gäller så här många timmar innan den väljs om
// värdet (viljan att möta hotet) och vem som alls kan slåss (vuxenKan) sätts av rovare.ts, som de två hoten delar
export const viljaKrok = { vilja: (_s: State, _p: Person) => 0, kan: (_s: State, _p: Person) => true };
// hur stort hotet är från gänget p vet om (steg B.29, rovarHot i rovare.ts): 0 = inget, mot 1 när det är alldeles intill
// vag: hotet på platsen (x, y) och på vägen dit (steg B.48)
export const hotKrok = { fara: (_s: State, _p: Person) => 0, vag: (_s: State, _p: Person, _x: number, _y: number) => 0 };
// platsen som väljs av den som inte slåss (gömslet, väntplatsen, vården): vägen dit och hotet på den (steg B.48)
export const vagMedHot = (s: State, p: Person, at: { x: number; y: number }) => Math.hypot(at.x - p.x, at.y - p.y) + LARMROLL.hotVikt * hotKrok.vag(s, p, at.x, at.y);
export function tryggast<T extends { x: number; y: number }>(s: State, p: Person, platser: T[]): T | undefined {
  let bast: T | undefined, bd = Infinity;
  for (const at of platser) { const d = vagMedHot(s, p, at); if (d < bd) { bd = d; bast = at; } }
  return bast;
}
// något har hänt (någon skadades eller dog): rollerna väljs om nästa gång de frågas
export const nyttILarmet = (s: State) => { s.larmV = (s.larmV ?? 0) + 1; };
export function rollVid(s: State, p: Person, hot: string): LarmRoll {
  const r = LARMHOT[hot], v = s.larmV ?? 0, l = p.larmRoll;
  if (l && l.hot === hot && l.v === v && s.now - l.t < LARMROLL.giltig * HOUR) return l.roll;
  const x = viljaKrok.vilja(s, p) + r.plus(s, p);
  const roll: LarmRoll = x >= r.kampe() ? 'kampe' : x >= r.hjalp() ? 'hjalpare' : 'gomd';
  p.larmRoll = { hot, roll, v, t: s.now };
  return roll;
}
// rollen p har i ett larm som pågår nu (för kortet), annars undefined
export const larmRollNu = (s: State, p: Person) => p.larmRoll && s.now - p.larmRoll.t < LARMROLL.giltig * HOUR ? p.larmRoll : undefined;
