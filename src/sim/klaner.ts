import { DAY, Person, SEC, State } from './typer';
import { balans } from './balans';
import { clamp, pick, rnd } from './slump';
import { ALDER, ageOf, count, log, makeName } from './folk';
import { kronika } from './historik';

// ---------- grannklanerna (steg 4.4.3) ----------
// Byn är inte ensam i världen. Grannklanerna finns ännu inte på någon karta (den utzoomade världskartan är steg 11.1.3): de är
// en lista med namn, var de bor, hur många de är, hur starka (de som kan slåss), hur mycket de har (ungefär arbetstimmar, som
// byns rikedom i varde.ts), hur de ser på byn (inställningen, −100 till 100: byns anseende hos dem) och några namngivna
// personer. De växer och krymper av sig själva en gång om dygnet (ett år i spelet), och inställningen glöms långsamt mot det
// neutrala. Handlarna kommer från dem (handel.ts): en klan som tycker illa om byn skickar ingen handlare, varje byte med
// klanens handlare gör den lite vänligare, och märker handlaren att byn lurat hen blir den mindre vänlig. Invandrarna kommer
// därifrån (steg 4.4.4.2), och de som bryter sig ut ur byn blir en av dem (steg 4.4.4.1).
export const KLAN = balans('klan', {
  antal: 4, // så många grannklaner finns när byn grundas
  folk: [12, 60], // så många är de från början
  styrka: [0.25, 0.5], // så stor del av dem kan slåss
  resurser: [15, 30], // så mycket har de per person (ungefär arbetstimmar)
  vaxt: 0.01, // så mycket växer en klan per dygn (ett år i spelet), i snitt ...
  vaxtSpann: 0.04, // ... plus eller minus så mycket, slumpat varje dygn
  inst: [-15, 35], // inställningen till byn från början
  glomma: 0.03, // så stor del av inställningen glöms varje dygn, mot det neutrala
  handelMin: -30, // en klan som tycker sämre om byn än så skickar ingen handlare
  handel: 2, // ett byte med klanens handlare gör klanen så mycket vänligare
  lurad: 10, // så mycket mindre vänlig blir klanen när handlaren märker att byn lurat hen ...
  marka: 0.03, // ... och chansen att hen märker det, per poäng i handlarens Handel
  handlarePer: 2, // så många handlare har en klan som mest (namngivna personer), sedan kommer samma igen
  utbrytFran: 30, // en familj som flyttar ur en by med så många invånare eller fler blir en ny grannklan (steg 4.4.4.1) ...
  utbrytInst: 50, // ... som tycker så här om byn från början
});

// klanernas namn: ett register, så att fler är en rad till
export const KLAN_NAMN = ['Björnklanen', 'Älvfolket', 'Stenbyn', 'Ugglornas folk', 'Rävklanen', 'Tranfolket', 'Sälfolket', 'Granklanen', 'Vargåsens folk', 'Mossbyn', 'Laxfolket', 'Hjortklanen'];
// rollerna hos klanernas namngivna personer
export const KLAN_ROLLER: Record<string, { namn: string }> = {
  hovding: { namn: 'Hövding' },
  aldste: { namn: 'Den äldste' },
  jagare: { namn: 'Jägare' },
  handlare: { namn: 'Handlare' },
  grundare: { namn: 'Grundare' },
  barn: { namn: 'Barn' },
};
// var klanerna bor (handel.ts har vad som är sällsynt där, HEM)
export const KLAN_HEM = ['kusten i söder', 'fjällen i norr', 'skogarna i öster', 'sjöarna i väster', 'älvdalen', 'byarna vid havet'];

export interface KlanPerson { namn: string; sex: 'm' | 'k'; roll: string; id?: number } // id = personens id i byn, för den som kom därifrån
export interface Klan {
  id: number; namn: string; hem: string;
  folk: number; styrka: number; resurser: number; // hur många, hur många som kan slåss och hur mycket de har (hela tal)
  inst: number; // inställningen till byn, −100 till 100 (byns anseende hos dem)
  personer: KlanPerson[];
  utbrytare?: true; // klanen grundades av några som lämnade byn (steg 4.4.4.1)
  grundad?: number; // när, om den grundades efter byn
}
export const klanerOf = (s: State) => s.klaner ?? [];
export const klanById = (s: State, id: number | undefined) => id === undefined ? undefined : s.klaner?.find(k => k.id === id);
const mellan = (s: State, [a, b]: readonly number[]) => a + rnd(s, 'klan') * (b - a);
export const instText = (v: number) => v >= 50 ? 'vänner' : v >= 15 ? 'vänliga' : v > -15 ? 'neutrala' : v > -50 ? 'misstänksamma' : 'fientliga';

// en ny klan: namnet som ingen annan klan har, och en hövding och en äldste med namn
export function nyKlan(s: State, folk: number, inst: number, personer?: KlanPerson[], egetNamn?: string): Klan {
  const upptagna = new Set(klanerOf(s).map(k => k.namn)), fria = KLAN_NAMN.filter(n => !upptagna.has(n));
  const id = (s.klanNr = (s.klanNr ?? 0) + 1);
  const namn = egetNamn ?? (fria.length ? pick(s, fria, 'klan') : `${pick(s, KLAN_NAMN, 'klan')} ${id}`);
  const per = (r: string): KlanPerson => { const sex = rnd(s, 'klan') < 0.5 ? 'm' : 'k'; return { namn: makeName(s, sex, 'klan'), sex, roll: r }; };
  const k: Klan = {
    id, namn, hem: pick(s, KLAN_HEM, 'klan'), folk: Math.round(folk), styrka: 0, resurser: 0, inst: Math.round(inst),
    personer: personer ?? [per('hovding'), per('aldste'), ...(rnd(s, 'klan') < 0.5 ? [per('jagare')] : [])],
  };
  k.styrka = Math.round(k.folk * mellan(s, KLAN.styrka));
  k.resurser = Math.round(k.folk * mellan(s, KLAN.resurser));
  (s.klaner ??= []).push(k);
  return k;
}
// grannklanerna när byn grundas (och i en sparad by från före v242)
export function nyaKlaner(s: State) {
  for (let i = 0; i < KLAN.antal; i++) nyKlan(s, mellan(s, KLAN.folk), mellan(s, KLAN.inst));
}

// en gång om dygnet (ett år i spelet): klanerna växer eller krymper, och inställningen glöms mot det neutrala
export function klanSteg(s: State, dtSec: number) {
  if (!s.klaner?.length || Math.floor(s.now / DAY) === Math.floor((s.now - dtSec * SEC) / DAY)) return;
  for (const k of s.klaner) {
    const f = KLAN.vaxt + (rnd(s, 'klan') * 2 - 1) * KLAN.vaxtSpann;
    k.folk = Math.max(3, Math.round(k.folk * (1 + f) + (rnd(s, 'klan') < 0.5 ? 0 : f > 0 ? 1 : -1)));
    k.styrka = Math.min(k.folk, Math.max(1, Math.round(k.folk * mellan(s, KLAN.styrka))));
    k.resurser = Math.max(0, Math.round(k.resurser * (1 + f) + k.folk * (rnd(s, 'klan') - 0.5)));
    if (k.inst) k.inst -= Math.sign(k.inst) * Math.min(Math.abs(k.inst), Math.max(1, Math.round(Math.abs(k.inst) * KLAN.glomma))); // minst ett steg, så att den når det neutrala
  }
}
// inställningen ändras (handel, utbrytning, invandring): hela tal mellan −100 och 100
export function andraInst(k: Klan, d: number) { k.inst = clamp(Math.round(k.inst + d), -100, 100); }

// klanen en handlare kommer ifrån (handel.ts): bland dem som inte tycker illa om byn, och vem av klanens handlare
export function handlarKlan(s: State): { klan: Klan; person: KlanPerson } | undefined {
  const kan = klanerOf(s).filter(k => k.inst > KLAN.handelMin);
  if (!kan.length) return undefined;
  const klan = pick(s, kan, 'klan'), har = klan.personer.filter(p => p.roll === 'handlare');
  if (har.length >= KLAN.handlarePer || (har.length && rnd(s, 'klan') < 0.5)) return { klan, person: pick(s, har, 'klan') };
  const sex = rnd(s, 'klan') < 0.5 ? 'm' : 'k', person = { namn: makeName(s, sex, 'klan'), sex, roll: 'handlare' } as KlanPerson;
  klan.personer.push(person);
  return { klan, person };
}

// en familj flyttar ur en mycket stor by (emigrate i liv.ts, steg 4.4.4.1): de blir en ny grannklan, uppkallad efter den
// första av grundarna, som tycker om byn de kom ifrån. De som flyttade är klanens namngivna personer
export function utbrytning(s: State, grupp: Person[], pop: number) {
  if (pop < KLAN.utbrytFran || grupp.length < 2) return undefined;
  const vuxna = grupp.filter(p => ageOf(p, s.now) >= ALDER.vuxen), forst = vuxna[0] ?? grupp[0];
  const namn = `${forst.name}${/[sxz]$/.test(forst.name) ? '' : 's'} folk`;
  const per = grupp.map(p => ({ namn: p.name, sex: p.sex, roll: vuxna.includes(p) ? 'grundare' : 'barn', id: p.id } as KlanPerson));
  const k = nyKlan(s, grupp.length, KLAN.utbrytInst, per, namn);
  k.utbrytare = true; k.grundad = s.now;
  k.styrka = Math.max(1, vuxna.length);
  count(s, 'utbrytning');
  const text = `${namn} är en ny grannklan vid ${k.hem}: ${grupp.map(p => p.name).join(', ')} som lämnade byn.`;
  log(s, text, 'world', grupp.map(p => p.id));
  kronika(s, text, 'flytt');
  return k;
}
