import { bedTile, sovplatser } from './byggnader';
import { Rum } from './byggnad';
import { balans } from './balans';
import { brasorOf } from './brasor';
import { eldPlats } from './karta';
import { flackNu, flackarOf } from './smuts';
import { isKlar, stationDef, stationerOf, storlekAv } from './stationer';
import { living } from './folk';
import { HOUR, State, W } from './typer';

// ---------- rummen och deras taggar (steg 7.2.1) ----------
// Ett rum är det som är inneslutet av väggar och dörrar (gridOf i byggnad.ts räknar fram det när en vägg ändras). Funktionen,
// som säger vem som sover där och vad som får stå där, sitter på rummet (rumFnId i byggnader.ts). Taggarna säger vad rummet
// är av det som står i det: varje rad i RUMSTYPER är en tagg, och ett rum får alla taggar vars krav det uppfyller. Flyttas
// möblerna ändras taggarna. En kombinationstagg visas i stället för sina delar, men delarnas effekter gäller.
// En ny rumstyp blir en rad. Hövdingens sal, hovet och smedjan kommer med det de kräver.
export const RUM = balans('rum', {
  sovrumMax: 2, // ett rum med så här många sovplatser eller färre (och minst en) är ett sovrum; fler är en sovsal
  forradMin: 3, // så många hyllor, kistor, ställ eller lagerrutor innan rummet är ett förråd
  pryttMin: 3, // så många saker som pryder innan rummet är prytt
  smutsMin: 0.2, // en fläck på golvet räknas som smuts när den är så här tydlig
  hyddaMax: 12, // rutor: ett rum med sovplatser och kök räknas som en hydda upp till den här ytan
  langhusSov: 8, // så många sovplatser ett långhus har
  salPlatser: 8, // så många sittplatser (bord gånger bordPlatser) en samlingssal har
  bordPlatser: 4, // ungefär så många sitter vid ett bord
  vilaKok: 0.12, // så mycket sämre man vilar i ett kök (rök)
  vilaVerkstad: 0.08, // så mycket sämre man vilar i en verkstad (oljud och spån)
  vilaScen: 0.05, // så mycket sämre man vilar bredvid en scen (oljud på kvällen)
});

// det som står i rummet, räknat en gång per rum
export interface RumInfo {
  rutor: number; sida: number; sov: number; folk: number; bord: number; eld: number; arbete: number; forvar: number; scen: number;
  tork: number; pynt: number; smuts: number; slakt: number; bara: Set<string>;
}
export type RumSlag = 'grund' | 'egenskap' | 'kombination';
export interface RumsTyp {
  namn: string; ikon: string; om: string; slag: RumSlag;
  krav: (i: RumInfo, t: Set<string>) => boolean;
  delar?: string[]; // kombinationen visas i stället för de här taggarna
}
export const RUMSTYPER = {
  sovrum: { namn: 'Sovrum', ikon: '🛏️', slag: 'grund', om: 'En eller två sover här', krav: i => i.sov >= 1 && i.sov <= RUM.sovrumMax },
  sovsal: { namn: 'Sovsal', ikon: '🛏️', slag: 'grund', om: 'Tre eller fler kan sova här', krav: i => i.sov > RUM.sovrumMax },
  matsal: { namn: 'Matsal', ikon: 'bord', slag: 'grund', om: 'Här står ett bord, så att man kan äta under tak', krav: i => i.bord >= 1 },
  kok: { namn: 'Kök', ikon: 'lagereld', slag: 'grund', om: 'Här finns en härd', krav: i => i.eld >= 1 },
  forrad: { namn: 'Förråd', ikon: '📦', slag: 'grund', om: 'Hyllor, kistor, ställ eller lagerrutor', krav: i => i.forvar >= RUM.forradMin },
  verkstad: { namn: 'Verkstad', ikon: 'verkstad', slag: 'grund', om: 'Här står en arbetsbänk', krav: i => i.arbete >= 1 },
  scensal: { namn: 'Scensal', ikon: 'scen', slag: 'grund', om: 'Här står en scen', krav: i => i.scen >= 1 },
  vedbod: { namn: 'Vedbod', ikon: 'ved', slag: 'grund', om: 'Bara ved på golvet', krav: i => i.bara.size === 1 && i.bara.has('ved') && i.sov === 0 },
  slakteri: { namn: 'Slakteri', ikon: 'slaktbank', slag: 'grund', om: 'Här står en slaktbänk', krav: i => i.slakt >= 1 },
  torkhus: { namn: 'Torkhus', ikon: 'tork', slag: 'grund', om: 'En torkställning under tak', krav: i => i.tork >= 1 },
  varmt: { namn: 'Varmt', ikon: 'lagereld', slag: 'egenskap', om: 'Härden värmer rummet', krav: i => i.eld >= 1 },
  prytt: { namn: 'Prytt', ikon: 'bonad', slag: 'egenskap', om: 'Minst tre saker pryder rummet', krav: i => i.pynt >= RUM.pryttMin },
  trangt: { namn: 'Trångt', ikon: '👥', slag: 'egenskap', om: 'Fler sover här än ytan räcker till', krav: i => i.folk > i.sov },
  smutsigt: { namn: 'Smutsigt', ikon: '😣', slag: 'egenskap', om: 'Smuts på golvet', krav: i => i.smuts >= 1 },
  hydda: { namn: 'Hydda', ikon: '🏠', slag: 'kombination', om: 'Man sover och lagar mat i samma lilla rum', krav: (i, t) => (t.has('sovrum') || t.has('sovsal')) && t.has('kok') && i.rutor <= RUM.hyddaMax, delar: ['sovrum', 'sovsal', 'kok'] },
  langhus: { namn: 'Långhus', ikon: '🏠', slag: 'kombination', om: 'Sovsal, kök och matsal i ett', krav: (i, t) => t.has('sovsal') && t.has('kok') && t.has('matsal') && i.sov >= RUM.langhusSov, delar: ['sovsal', 'kok', 'matsal'] },
  storstuga: { namn: 'Storstuga', ikon: '🏠', slag: 'kombination', om: 'Kök och matsal, och ingen sover här', krav: (i, t) => t.has('kok') && t.has('matsal') && i.sov === 0, delar: ['kok', 'matsal'] },
  samlingssal: { namn: 'Samlingssal', ikon: '🪑', slag: 'kombination', om: 'Bord i ett varmt rum med många sittplatser, och ingen sover här', krav: (i, t) => t.has('matsal') && t.has('varmt') && i.bord * RUM.bordPlatser >= RUM.salPlatser && i.sov === 0, delar: ['matsal', 'varmt'] },
  gillesal: { namn: 'Gillesal', ikon: 'scen', slag: 'kombination', om: 'En samlingssal med en scen', krav: (_i, t) => t.has('samlingssal') && t.has('scensal'), delar: ['samlingssal', 'scensal'] },
} satisfies Record<string, RumsTyp>;
export type RumTagg = keyof typeof RUMSTYPER;
const TYPER = RUMSTYPER as Record<string, RumsTyp>;
export const RUMSTYP_LIST = Object.keys(RUMSTYPER) as RumTagg[];

// taggar som passar dåligt ihop ger ett minus i stället för att vara förbjudna. a och b = taggarna, vila = så mycket sämre man vilar
export interface RumMinus { namn: string; a: RumTagg[]; b: RumTagg[]; vila?: number }
export const RUM_MINUS: RumMinus[] = [
  { namn: 'Rök där man sover', a: ['kok'], b: ['sovrum', 'sovsal'], vila: RUM.vilaKok },
  { namn: 'Oljud och spån där man sover', a: ['verkstad'], b: ['sovrum', 'sovsal'], vila: RUM.vilaVerkstad },
  { namn: 'Oljud på kvällen', a: ['scensal'], b: ['sovrum', 'sovsal'], vila: RUM.vilaScen },
  { namn: 'Blod och smuts vid maten', a: ['slakteri'], b: ['kok', 'matsal'] },
  { namn: 'Råttor vid sovplatserna', a: ['forrad'], b: ['sovrum', 'sovsal'] },
  { namn: 'Trångt och smutsigt', a: ['trangt'], b: ['smutsigt'] },
];

function rumInfo(s: State, r: Rum): RumInfo {
  const rutor = new Set(r.tiles), i: RumInfo = { rutor: r.tiles.length, sida: 0, sov: sovplatser(s, r), folk: 0, bord: 0, eld: 0, arbete: 0, forvar: 0, scen: 0, tork: 0, pynt: 0, smuts: 0, slakt: 0, bara: new Set() };
  if (r.tiles.length) {
    const xs = r.tiles.map(t => t % W), ys = r.tiles.map(t => Math.floor(t / W));
    i.sida = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1;
  }
  for (const p of living(s)) { const t = bedTile(s, p); if (t !== undefined && rutor.has(t)) i.folk++; }
  for (const t of stationerOf(s)) {
    if (!isKlar(t)) continue;
    const { w, h } = storlekAv(t);
    let inne = false;
    for (let y = t.y; y < t.y + h && !inne; y++) for (let x = t.x; x < t.x + w && !inne; x++) inne = rutor.has(y * W + x);
    if (!inne) continue;
    const d = stationDef(t.k);
    if (!d) continue;
    if (d.platser) i.bord++;
    if (d.forvar) i.forvar++;
    if (d.pynt) i.pynt++;
    if (t.k === 'scen') i.scen++;
    if (t.k === 'tork') i.tork++;
    if (t.k === 'slaktbank') i.slakt++;
    if (d.gor.length && t.k !== 'scen' && t.k !== 'tork') i.arbete++;
  }
  const e = eldPlats(s);
  if (rutor.has(e.y * W + e.x)) i.eld++;
  for (const f of brasorOf(s)) if (f.at && rutor.has(f.at.y * W + f.at.x)) i.eld++;
  const lagret = new Set<number>();
  for (const a of s.stackar ?? []) { const t = a.y * W + a.x; if (rutor.has(t) && a.n > 0) { i.bara.add(a.k); lagret.add(t); } }
  i.forvar += lagret.size;
  for (const f of flackarOf(s)) if (rutor.has(f.i) && flackNu(f, s.now) >= RUM.smutsMin) i.smuts++;
  return i;
}

// taggarna räknas högst en gång i timmen per rum, och om när något byggs (de frågar bara det som redan står)
const cache = new WeakMap<State, { v: string; m: Map<string, Set<RumTagg>> }>();
export function rumTaggar(s: State, r: Rum): Set<RumTagg> {
  const v = `${s.byggV ?? 0}:${Math.floor(s.now / HOUR)}:${stationerOf(s).length}`, key = r.tiles.length ? String(Math.min(...r.tiles)) : `t${r.id}`;
  let c = cache.get(s);
  if (!c || c.v !== v) { c = { v, m: new Map() }; cache.set(s, c); }
  let t = c.m.get(key);
  if (t) return t;
  const i = rumInfo(s, r), set = new Set<string>();
  // i registrets ordning: en kombination kan fråga efter en tagg som står före den
  for (const k of RUMSTYP_LIST) if (TYPER[k].krav(i, set)) set.add(k);
  t = set as Set<RumTagg>;
  c.m.set(key, t);
  return t;
}
// taggarna som visas: en kombination står i stället för sina delar
export function rumVisas(s: State, r: Rum): RumsTyp[] {
  const t = rumTaggar(s, r), bort = new Set<string>();
  for (const k of t) for (const d of TYPER[k].delar ?? []) bort.add(d);
  return [...t].filter(k => !bort.has(k)).map(k => TYPER[k]);
}
// det som passar dåligt ihop i rummet
export function rumMinus(s: State, r: Rum): RumMinus[] {
  const t = rumTaggar(s, r);
  return RUM_MINUS.filter(m => m.a.some(k => t.has(k)) && m.b.some(k => t.has(k)));
}
// så stor del av vilan man får i rummet (1 = allt): det som passar dåligt ihop med att sova
export function rumVila(s: State, r: Rum | undefined) {
  if (!r) return 1;
  let v = 1;
  for (const m of rumMinus(s, r)) if (m.vila) v *= 1 - m.vila;
  return v;
}
// rummets namn efter taggarna, till gränssnittet
export const rumNamn = (s: State, r: Rum) => rumVisas(s, r).map(t => t.namn).join(', ');
