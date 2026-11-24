import { HUS, bedTile, sjukKrok, sovplatser } from './byggnader';
import { Hus, Rum, gridOf } from './byggnad';
import { balans } from './balans';
import { brasorOf } from './brasor';
import { eldPlats } from './karta';
import { SMUTS, flackNu, flackarOf } from './smuts';
import { isKlar, stationDef, stationerOf, storlekAv } from './stationer';
import { living } from './folk';
import { HOUR, Person, State, W } from './typer';
import { ljusAt } from './ljus';
import { isLight } from './tid';
import { knows } from './teknik';

// ---------- rummen och deras taggar (steg 7.2.1) ----------
// Ett rum är det som är inneslutet av väggar och dörrar (gridOf i byggnad.ts räknar fram det när en vägg ändras). Funktionen,
// som säger vem som sover där och vad som får stå där, sitter på rummet (rumFnId i byggnader.ts). Taggarna säger vad rummet
// är av det som står i det: varje rad i RUMSTYPER är en tagg, och ett rum får alla taggar vars krav det uppfyller. Flyttas
// möblerna ändras taggarna. En kombinationstagg visas i stället för sina delar, men delarnas effekter gäller.
// En ny rumstyp blir en rad. Hövdingens sal, hovet och smedjan kommer med det de kräver.
export const RUM = balans('rum', {
  vilaSjuk: 0.1, // en frisk som sover i en sjukstuga vilar så här mycket sämre (steg 12.4.10 och 13.1.14)
  sovrumMax: 2, // ett rum med så här många sovplatser eller färre (och minst en) är ett sovrum; fler är en sovsal
  forradMin: 3, // så många hyllor, kistor, ställ eller lagerrutor innan rummet är ett förråd
  pryttMin: 3, // så många saker som pryder innan rummet är prytt
  smutsMin: 0.2, // en fläck på golvet räknas som smuts när den är så här tydlig
  hyddaMax: 12, // rutor: ett rum med sovplatser och kök räknas som en hydda upp till den här ytan
  salPlatser: 8, // så många sittplatser (bord gånger bordPlatser) en samlingssal har
  bordPlatser: 4, // ungefär så många sitter vid ett bord
  vilaKok: 0.12, // så mycket sämre man vilar i ett kök (rök)
  vilaVerkstad: 0.08, // så mycket sämre man vilar i en verkstad (oljud och spån)
  vilaScen: 0.05, // så mycket sämre man vilar bredvid en scen (oljud på kvällen)
  // rummens plus (steg 12.1.143)
  ljusMin: 0.5, // ljuset inne som räknas som ljust när det är mörkt ute
  plusLjust: 0.04, // tanken för den som sover eller äter i ett varmt och ljust rum
  plusPynt: 0.04, // tanken för den som sover eller äter i ett fint pyntat rum
  plusEget: 0.06, // så mycket bättre man vilar i ett eget rum
});

// det som står i rummet, räknat en gång per rum
export interface RumInfo {
  rutor: number; sov: number; folk: number; bord: number; eld: number; arbete: number; forvar: number; scen: number;
  tork: number; pynt: number; smuts: number; slakt: number; krubba: number; kok: number; bara: Set<string>; smedja?: number; skap?: number; badd?: number; sjukTek?: boolean;
}
export type RumSlag = 'grund' | 'egenskap' | 'kombination';
export interface RumsTyp {
  namn: string; ikon: string; om: string; slag: RumSlag;
  krav: (i: RumInfo, t: Set<string>) => boolean;
  delar?: string[]; // kombinationen visas i stället för de här taggarna
  sova?: true; ata?: true; // här sover eller äter man (rummens plus, steg 12.1.143)
}
export const RUMSTYPER = {
  sovrum: { namn: 'Sovrum', ikon: '🛏️', slag: 'grund', om: 'En eller två sover här', sova: true, krav: i => i.sov >= 1 && i.sov <= RUM.sovrumMax },
  sovsal: { namn: 'Sovsal', ikon: '🛏️', slag: 'grund', om: 'Tre eller fler kan sova här', sova: true, krav: i => i.sov > RUM.sovrumMax },
  matsal: { namn: 'Matsal', ikon: 'bord', slag: 'grund', om: 'Här står ett bord, så att man kan äta under tak', ata: true, krav: i => i.bord >= 1 },
  kok: { namn: 'Kök', ikon: 'lagereld', slag: 'grund', om: 'Här finns en härd, ett örtkök, en bakugn eller en kvarnsten', krav: i => i.eld >= 1 || i.kok >= 1 }, // steg 10.2.92
  forrad: { namn: 'Förråd', ikon: '📦', slag: 'grund', om: 'Hyllor, kistor, ställ eller lagerrutor', krav: i => i.forvar >= RUM.forradMin },
  verkstad: { namn: 'Verkstad', ikon: 'verkstad', slag: 'grund', om: 'Här står en arbetsbänk', krav: i => i.arbete >= 1 },
  scensal: { namn: 'Scensal', ikon: 'scen', slag: 'grund', om: 'Här står en scen', krav: i => i.scen >= 1 },
  vedbod: { namn: 'Vedbod', ikon: 'ved', slag: 'grund', om: 'Bara ved på golvet', krav: i => i.bara.size === 1 && i.bara.has('ved') && i.sov === 0 },
  slakteri: { namn: 'Slakteri', ikon: 'slaktbank', slag: 'grund', om: 'Här står en slaktbänk', krav: i => i.slakt >= 1 },
  fahus: { namn: 'Fähus', ikon: 'krubba', slag: 'grund', om: 'Här står en krubba med hö, och här står djuren i istiden', krav: i => i.krubba >= 1 }, // steg 10.2.88
  torkhus: { namn: 'Torkhus', ikon: 'tork', slag: 'grund', om: 'En torkställning under tak', krav: i => i.tork >= 1 },
  smedja: { namn: 'Smedja', ikon: 'smedja', slag: 'grund', om: 'Här står en ässja och ett städ', krav: i => (i.smedja ?? 0) >= 1 }, // steg 12.2.4 (smedja.ts)
  varmt: { namn: 'Varmt', ikon: 'lagereld', slag: 'egenskap', om: 'Härden värmer rummet', krav: i => i.eld >= 1 },
  prytt: { namn: 'Prytt', ikon: 'kruka', slag: 'egenskap', om: 'Minst tre saker pryder rummet', krav: i => i.pynt >= RUM.pryttMin },
  trangt: { namn: 'Trångt', ikon: '👥', slag: 'egenskap', om: 'Fler sover här än ytan räcker till', krav: i => i.folk > i.sov },
  smutsigt: { namn: 'Smutsigt', ikon: '😣', slag: 'egenskap', om: 'Smuts på golvet', krav: i => i.smuts >= 1 },
  hydda: { namn: 'Hydda', ikon: '🏠', slag: 'kombination', om: 'Man sover och lagar mat i samma lilla rum', krav: (i, t) => (t.has('sovrum') || t.has('sovsal')) && t.has('kok') && i.rutor <= RUM.hyddaMax, delar: ['sovrum', 'sovsal', 'kok'] },
  langhus: { namn: 'Långhus', ikon: '🏠', slag: 'kombination', om: 'Sovsal, kök och matsal i ett', krav: (i, t) => t.has('sovsal') && t.has('kok') && t.has('matsal') && i.sov >= HUS.langhus, delar: ['sovsal', 'kok', 'matsal'] },
  storstuga: { namn: 'Storstuga', ikon: '🏠', slag: 'kombination', om: 'Kök och matsal, och ingen sover här', krav: (i, t) => t.has('kok') && t.has('matsal') && i.sov === 0, delar: ['kok', 'matsal'] },
  samlingssal: { namn: 'Samlingssal', ikon: '🪑', slag: 'kombination', om: 'Bord i ett varmt rum med många sittplatser, och ingen sover här', krav: (i, t) => t.has('matsal') && t.has('varmt') && i.bord * RUM.bordPlatser >= RUM.salPlatser && i.sov === 0, delar: ['matsal', 'varmt'] },
  // sjukstugan (steg 13.1.14, mobler.ts): bäddar i ett varmt rum med en hylla eller kista för salvan, förbanden och teet, när byn
  // kan tekniken. Kravet frågar bara det som står i rummet (inte vem som sover där), så att valet av sovplats kan fråga det
  sjukstuga: { namn: 'Sjukstuga', ikon: 'sjukbadd', slag: 'kombination', om: 'Bäddar i ett varmt rum med en hylla eller kista för salvan och förbanden. Här vilar de sjuka och skadade och läker fortare', krav: i => sjukstugaKrav(i), delar: ['sovrum', 'sovsal', 'varmt'] },
  gillesal: { namn: 'Gillesal', ikon: 'scen', slag: 'kombination', om: 'En samlingssal med en scen', krav: (_i, t) => t.has('samlingssal') && t.has('scensal'), delar: ['samlingssal', 'scensal'] },
} satisfies Record<string, RumsTyp>;
export type RumTagg = keyof typeof RUMSTYPER;
const TYPER = RUMSTYPER as Record<string, RumsTyp>;
export const RUMSTYP_LIST = Object.keys(RUMSTYPER) as RumTagg[];

// taggar som passar dåligt ihop ger ett minus i stället för att vara förbjudna. a och b = taggarna, vila = så mycket sämre man vilar
export interface RumMinus { namn: string; a: RumTagg[]; b: RumTagg[]; vila?: number; vem?: (s: State, p: Person) => boolean } // vem: bara den som vilan gäller (annars alla)
export const sjukstugaKrav = (i: RumInfo) => (i.badd ?? 0) >= 1 && i.eld >= 1 && (i.skap ?? 0) >= 1 && !!i.sjukTek;
export const RUM_MINUS: RumMinus[] = [
  { namn: 'Rök där man sover', a: ['kok'], b: ['sovrum', 'sovsal'], vila: RUM.vilaKok },
  { namn: 'Oljud och spån där man sover', a: ['verkstad'], b: ['sovrum', 'sovsal'], vila: RUM.vilaVerkstad },
  { namn: 'Oljud på kvällen', a: ['scensal'], b: ['sovrum', 'sovsal'], vila: RUM.vilaScen },
  { namn: 'Blod och smuts vid maten', a: ['slakteri'], b: ['kok', 'matsal'] },
  { namn: 'Råttor vid sovplatserna', a: ['forrad'], b: ['sovrum', 'sovsal'] },
  { namn: 'Trångt och smutsigt', a: ['trangt'], b: ['smutsigt'] },
  { namn: 'Frisk bland de sjuka', a: ['sjukstuga'], b: ['sjukstuga'], vila: RUM.vilaSjuk, vem: (s, p) => !sjukKrok.vill(s, p) }, // steg 13.1.14: bara den friska vilar sämre i sjukstugan
];

// taggar som passar bra ihop ger ett plus (steg 12.1.143), på samma sätt som RUM_MINUS. krav frågar taggarna (t) och om det är ljust
// inne när det är mörkt ute (ljust); vila = så mycket bättre man vilar där, tanke = den goda tanken hos den som sover eller äter där.
// Villkoren läser RUMSTYPER (sova, ata och slag), inte en fast lista, så att en ny tagg räknas med av sig själv
export interface RumPlus { id: string; namn: string; ikon: string; om: string; krav: (t: Set<string>, ljust: boolean) => boolean; vila?: number; tanke?: number }
const sover = (t: Set<string>) => [...t].some(k => TYPER[k]?.sova), ater = (t: Set<string>) => [...t].some(k => TYPER[k]?.ata);
export const RUM_PLUS: RumPlus[] = [
  { id: 'ljust', namn: 'Varmt och ljust', ikon: 'lagereld', om: 'Ett varmt rum med ljus inne när det är mörkt ute', krav: (t, ljust) => t.has('varmt') && ljust, get tanke() { return RUM.plusLjust; } },
  { id: 'pynt', namn: 'Fint pyntat', ikon: 'kruka', om: 'Ett prytt rum där man sover eller äter', krav: t => t.has('prytt') && (sover(t) || ater(t)), get tanke() { return RUM.plusPynt; } },
  // ett sovrum som inte delas med någon annan funktion: ingen annan grundtagg i RUMSTYPER
  { id: 'eget', namn: 'Eget rum', ikon: '🛏️', om: 'Ett sovrum som inte delas med någon annan funktion', krav: t => t.has('sovrum') && [...t].every(k => k === 'sovrum' || TYPER[k]?.slag !== 'grund'), get vila() { return RUM.plusEget; } },
];
const PLUS_TANKE: Record<string, string> = { ljust: 'Varmt och ljust inne', pynt: 'Fint pyntat omkring sig', eget: 'Har ett eget rum' };
export const rumPlusTanke = (id: string) => PLUS_TANKE[id] ?? id;

// utanFolk: utan att räkna vem som sover där (valet av sovplats frågar om rummet är en sjukstuga, steg 13.1.14)
export function rumInfo(s: State, r: Rum, utanFolk = false): RumInfo {
  const rutor = new Set(r.tiles), i: RumInfo = { rutor: r.tiles.length, sov: sovplatser(s, r), folk: 0, bord: 0, eld: 0, arbete: 0, forvar: 0, scen: 0, tork: 0, pynt: 0, smuts: 0, slakt: 0, krubba: 0, kok: 0, bara: new Set(), sjukTek: living(s).some(q => knows(q, 'sjukstuga')) };
  if (!utanFolk) for (const p of living(s)) { const t = bedTile(s, p); if (t !== undefined && rutor.has(t)) i.folk++; }
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
    if (t.k === 'smedja') i.smedja = (i.smedja ?? 0) + 1; // steg 12.2.4
    if (d.sover) i.badd = (i.badd ?? 0) + 1; // halmbädden och sängen
    if (t.k === 'hylla' || t.k === 'kista') i.skap = (i.skap ?? 0) + 1; // för salvan och förbanden i sjukstugan (steg 13.1.14)
    if (d.fahus) i.krubba++;
    if (d.varmer) i.eld++; // fyrfatet värmer rummet som en härd (taggen Varmt, steg 12.4.11)
    if (d.kok) i.kok++;
    if (d.gor.length && t.k !== 'scen' && t.k !== 'tork' && !d.kok) i.arbete++; // kökets stationer gör rummet till ett kök, inte en verkstad
  }
  const e = eldPlats(s);
  if (rutor.has(e.y * W + e.x)) i.eld++;
  for (const f of brasorOf(s)) if (f.at && rutor.has(f.at.y * W + f.at.x)) i.eld++;
  const lagret = new Set<number>();
  for (const a of s.stackar ?? []) { const t = a.y * W + a.x; if (rutor.has(t) && a.n > 0) { i.bara.add(a.k); lagret.add(t); } }
  i.forvar += lagret.size;
  for (const f of flackarOf(s)) if (rutor.has(f.i) && flackNu(f, s.now) >= RUM.smutsMin) i.smuts += f.k === 'toa' ? SMUTS.toaInne : 1; // en toahög väger tyngre i rummets smuts (steg 11.1.73)
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
// det som passar bra ihop i rummet (steg 12.1.143). Simuleringen räknar plusen vid timmens början (raden rummens plus i TAKTER,
// steg 12.1.210) och sparar dem i byn, så att svaret inte beror på vem som frågar först; husfliken och vilan läser bara svaret.
// Ett rum som byggts sedan dess har inget plus förrän nästa timme
const rumNyckel = (r: Rum) => r.tiles.length ? String(Math.min(...r.tiles)) : `t${r.id}`;
export function rumPlusTimme(s: State) {
  const m: Record<string, string[]> = {};
  for (const r of gridOf(s).rooms) {
    if (!r.tiles.length) continue;
    const t = rumTaggar(s, r) as Set<string>;
    let ljust = false;
    if (!isLight(s.now) && t.has('varmt')) for (const i of r.tiles) if (ljusAt(s, i % W + 0.5, Math.floor(i / W) + 0.5) >= RUM.ljusMin) { ljust = true; break; }
    const l = RUM_PLUS.filter(p => p.krav(t, ljust)).map(p => p.id);
    if (l.length) m[rumNyckel(r)] = l;
  }
  s.rumPlus = m;
}
export function rumPlus(s: State, r: Rum): RumPlus[] {
  const l = s.rumPlus?.[rumNyckel(r)];
  return l ? RUM_PLUS.filter(p => l.includes(p.id)) : [];
}
// det som passar dåligt ihop i rummet
export function rumMinus(s: State, r: Rum): RumMinus[] {
  const t = rumTaggar(s, r);
  return RUM_MINUS.filter(m => m.a.some(k => t.has(k)) && m.b.some(k => t.has(k)));
}
// så stor del av vilan man får i rummet (1 = allt): det som passar dåligt ihop med att sova, och det som passar bra ihop
export function rumVila(s: State, r: Rum | undefined, p?: Person) {
  if (!r) return 1;
  let v = 1;
  for (const m of rumMinus(s, r)) if (m.vila && (!m.vem || p && m.vem(s, p))) v *= 1 - m.vila;
  for (const m of rumPlus(s, r)) if (m.vila) v *= 1 + m.vila; // det som passar bra ihop (steg 12.1.143)
  return v;
}
// ett färdigt hus där inget står (inget rum har en tagg) heter tomt hus tills något står där (steg 10.2.39)
export const husTomt = (s: State, h: Hus) => !!h.klar && gridOf(s).rooms.filter(r => r.hus === h.id && r.tiles.length).every(r => rumTaggar(s, r).size === 0);
export const husVisas = (s: State, h: Hus) => husTomt(s, h) ? 'Tomt hus' : h.namn;
