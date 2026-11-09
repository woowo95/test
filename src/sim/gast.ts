// Gästerna är personer (steg 9.2.111, "Ekonomi och handel: Gästerna är personer" i designdokumentet): handlaren, rövarna,
// främlingarna och de andra som kommer till byn är människor av samma slag som byborna. En gäst ligger bland folket
// (s.people) med en gästrad (gast: sorten, klanen och hemmet) och ett negativt id, så att hen aldrig tar en bybos id och
// är samma part i ett byte som förut (byte.ts). Det som bara gäller byn (invånare, befolkning, seder, styre, omröstningar,
// arbetsordning, förråd) räknar bara byborna: alive() och living() i folk.ts släpper inte in gäster. Gästens egen kropp,
// egenskaper och färdigheter räknas ur byns frö och gästens nyckel med hash3, aldrig ur spelets slumpföljder, så att byn
// utvecklas likadant vare sig en gäst kommer eller inte. Ett nytt slag av gäst är en rad i GASTSORTER
import type { Person, State, Stat, Skill } from './typer';
import { STATS, SKILLS } from './typer';
import { hash3 } from './slump';
import { EGENSKAP } from './folk';

export const GASTSORTER = {
  handlare: { namn: 'Handlare' },
  rovare: { namn: 'Rövare' },
  framling: { namn: 'Främling' },
} as const;
export type GastSort = keyof typeof GASTSORTER;
// mat är portionerna kvar i packningen och sover att gästen sover (steg 9.2.113, gastvardag.ts).
// vapen, bar, spar, pk och anhorig gäller rövarna (steg 9.2.112, rovare.ts): vapnet hen kom med, bytet hen bär, vägen för bilden
// (tid och plats efter varandra), rutorna kvar på vägen och rutan hen hittat vägen till och vems anhörig hen är när flocken hämnas
export interface GastRad { sort: GastSort; klan?: number; hem?: string; vapen?: import('./strid').Vapen; bar?: Record<string, number>; spar?: number[]; path?: number[]; pk?: number; anhorig?: string; mat?: number; sover?: 1 }

// lever gästen och är kvar på kartan
export const gastLever = (p: Person) => !!p.gast && p.died === undefined && p.left === undefined;
export const gasterNu = (s: State, sort?: GastSort) => s.people.filter(p => gastLever(p) && (!sort || p.gast!.sort === sort));
export const gastAv = (s: State, id: number) => s.people.find(p => p.id === id && p.gast);
// handlaren som person: namnet, hemmet, klanen, platsen och färdigheten Handel står där
export function hp(s: State, h: { id: number }): Person {
  const p = gastAv(s, h.id);
  if (!p) throw new Error(`gästen ${h.id} finns inte bland folket`);
  return p;
}

// ett nytt id för en gäst som inte är handlaren (handlarens id är −handlarNr): långt under alla andra, och aldrig samma två gånger
export const nyttGastId = (s: State) => -1e9 - (s.gastNr = (s.gastNr ?? 0) + 1);
// en gäst skapas som en bybo, men ur hash3 (se ovan): samma frö och nyckel ger samma person
export function nyGast(s: State, o: { id: number; namn: string; sex: 'm' | 'k'; fodd: number; rad: GastRad; x: number; y: number; nyckel: number; skill?: Partial<Record<Skill, number>>; pot?: Partial<Record<Stat, number>> }): Person {
  let i = 0;
  const r = () => hash3(s.seed, o.nyckel, i++, 0x51ed270b);
  const pot = {} as Record<Stat, number>;
  for (const k of STATS) { const u = r() * 2 - 1; pot[k] = Math.max(1, Math.min(20, Math.round((EGENSKAP.mitt + Math.sign(u) * Math.abs(u) ** EGENSKAP.utprag * EGENSKAP.vidd) * 10) / 10)); }
  Object.assign(pot, o.pot); // egenskaper som sorten bestämmer (rövarnas styrka och mod, rovare.ts)
  const skill = {} as Record<Skill, number>;
  for (const k of SKILLS) skill[k] = o.skill?.[k] ?? 0;
  const p: Person = {
    id: o.id, name: o.namn, sex: o.sex, born: o.fodd, gast: o.rad,
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, toa: 0.8, torst: 1, blod: 1, habit: {}, thoughts: [],
    x: o.x, y: o.y, fame: [], hue: Math.floor(r() * 360),
  };
  if (o.rad.klan !== undefined) p.fran = o.rad.klan;
  return p;
}
// gästen lämnar kartan: hen tas ur folket (klanen minns hen, klaner.ts)
export function gastGar(s: State, id: number) {
  s.people = s.people.filter(p => !(p.id === id && p.gast));
}
