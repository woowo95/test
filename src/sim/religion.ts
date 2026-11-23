import { stor as storOrd, tal } from './ord';
import { notis } from './notiser';
import { chansTid, clamp, gauss, pick, rnd } from './slump';
import { SKRIFT } from './skriftTal';
import { troshusKlart } from './troshus';
import { DAY, HOUR, Person, Rel, State } from './typer';
import { balans } from './balans';
import { ALDER, ageOf, alive, count, isParent, living, log, relKey, stat } from './folk';
import { UPPV, formas, upplev } from './uppvaxt';
import { yearNo } from './tid';
import { kronika } from './historik';
import { bytaChans, egendomIVed } from './kultlatt';
import type { IntryckTyp } from './rykten';
import { isSick } from './sjukdom';
import { kyrkansForrad } from './kyrka';
import { releaseOwner } from './lager';
import { kyrkaId } from './egendom';
import { kronikaBer } from './berattelser';

// Religionen (fas 4.1, "Religion" i designdokumentet). Andligheten (steg 4.1.1.1) är en egenskap hos varje person, 0–100:
// hur viktigt det heliga är för hen, inte vad hen tror på. Den ärvs delvis och flyttas av upplevelserna (uppvaxt.ts, steg
// 4.1.1.3). Den finns från början men syns i gränssnittet först när den första tron finns.

// ---------- balanstal (regel 8) ----------
export const ANDE = balans('andlighet', {
  dromDygn: 7, dromOp: 50, // den som sover ensam drömmer om en död hen stått nära (bättre relation än dromOp) som dött de senaste dromDygn dygnen
  arv: 0.6, // så stor del av ett barns andlighet kommer från föräldrarnas snitt; resten är en egen dragning
  arvSlump: 8, // så mycket (gånger gauss) det ärvda ändras
  // upplevelserna som flyttar andligheten (steg 4.1.1.3, "Andlighetens riktning" i designdokumentet)
  riktning: 0.6, // chansen att den går uppåt är hälften plus så här mycket gånger (andligheten − 50) / 100: den troende ser ett tecken, den tvivlande en slump
  vuxen: 8, // så mycket en upplevelse flyttar andligheten hos en vuxen ...
  barn: 16, // ... och hos ett barn
});
export const TRO = balans('tro', {
  takTro: 4, // högst så många trosriktningar samtidigt i byn (steg 8.5.11)
  spridBy: 0.5, // så mycket ett samtal kan få den som tvivlar att byta tro (steg 8.5.12)
  // den första tron (steg 4.1.2.1, "Den första tron" i designdokumentet)
  grunda: 60, // så andlig måste den vara som tolkar ett tecken till en egen tro (chansen står i TECKENTAL)
  namn: 3, // när så här många tror får tron ett namn, en symbol och en berättelse (steg 4.1.2.3)
  styrka: 60, // så stark är tron hos den som grundar den (0–100)
  bekrafta: 10, // ett nytt tecken gör tron så här mycket starkare hos den som redan tror
  drom: 0.004, // chansen per sovtimme att någon drömmer något hen inte kan förklara (bara den mycket andliga tolkar det)
  samma: 24, // den som var med om samma sak inom så här många timmar efter att någon tolkade den delar den tron
  skalaSlump: 15, // så mycket (gånger gauss) en ny tros skalor skiljer sig från tecknets
  // tron sprids i samtal (steg 4.1.2.2)
  sprid: 0.0003, // chansen att lyssnaren börjar tro i ett vanligt samtal (man talar med varandra hundratals gånger på några dygn), gånger det som följer:
  spridMin: 20, // den som har lägre andlighet än så här övertygas inte i samtal
  spridKarisma: 10, // talarens karisma (1–20) delad med detta ...
  spridAnde: 50, // ... talarens andlighet delad med detta, och lyssnarens delad med detta i kvadrat (den världsliga övertygas nästan aldrig) ...
  spridRel: 100, // ... 1 plus relationen (−100 till 100) delad med detta ...
  bekrTid: 3, // ... och gånger bekrFaktor om ett tecken bekräftat tron de senaste så här många dygnen (år i spelet)
  bekrFaktor: 2,
  styrkaNy: 40, // så stark är tron hos den som just börjat tro
  samtalStyrka: 2, // ett samtal mellan två som tror likadant gör lyssnarens tro så här mycket starkare
});
// trons tyngd (steg 10.3.8, "Tyngdens delar" i designdokumentet; startvärden)
export const TYNGD = balans('tyngd', {
  alderFran: 0.25, // en ny tro väger så här mycket per troende ...
  alderDygn: 28, // ... och full vikt efter så här många dygn, sedan inte mer
  prast: 4, // en präst
  egendom: 2, // kyrkans egendom ger upp till så här mycket ...
  egendomVed: 20, // ... fullt vid värdet av så här mycket ved
  hus: 3, // varje färdigt hus
  s1: 1, s2: 3, s3: 8, s4: 16, // tyngden ett bud av storlek 1, 2, 3 och 4 kräver
});
// gudarna (steg 4.1.5, "Gudarna" i designdokumentet; startvärden)
export const GUD = balans('gudar', {
  ande: 35, // en tro under så här på skalan Natur – Människa ser sina gudar som andar i djur, träd och platser ...
  forfader: 65, // ... och en tro över så här ser dem som förfäder: döda bybor som blivit heliga. Mellan dem gudar i människoform
  en: 70, // en tro över så här på skalan Många – En har bara en gud, som tar över de nya områdena
  fod: 0.15, // chansen att en stor händelse i ett område som tron saknar en gud för föder en ny gud
  forfaderChans: 0.005, // chansen per timme att en död bybo som byn berättar om blir förfader i en tro på Människa-sidan
  generation: 20, // tidigast så här många dygn (år i spelet) efter döden, och när ingen som kände hen lever
  glom: 10, // en gud som inget i hens område bekräftat på så här många dygn (år i spelet) bleknar och glöms, om tron har fler gudar
});

// en ny persons andlighet: grundarna och de som flyttar in slumpas jämnt över 0–100, ett barn får en del av föräldrarnas
// snitt. Drar ur personens egen följd 'tro', så att inget annat ändras
export function nyAndlighet(s: State, p: Person, mother?: Person, father?: Person) {
  const egen = rnd(s, 'tro', p) * 100;
  if (!mother || !father) return Math.round(egen);
  const snitt = (andlighet(s, mother) + andlighet(s, father)) / 2;
  return Math.round(clamp(ANDE.arv * snitt + (1 - ANDE.arv) * egen + gauss(s, 'tro', p) * ANDE.arvSlump, 0, 100));
}
// ett barn växer upp i föräldrarnas tro (steg 12.1.22, Religion: Tron får fäste): det föds in i den tro föräldrarna som lever
// har, och har den som vuxen om inte något hen varit med om (tvivlet, en annan tro, en syn) får hen att lämna den. Tror
// föräldrarna olika växer barnet upp i den ena, oftare den vars tro är starkast. Drar ur barnets egen följd 'tro'
export function fodTro(s: State, p: Person, mother?: Person, father?: Person) {
  const f = [mother, father].filter((q): q is Person => !!q && alive(q) && troOf(s, q.tro) !== undefined);
  if (!f.length) return;
  const vikt = (q: Person) => Math.max(1, q.troStyrka ?? 0);
  const q = f.length === 2 && f[0].tro !== f[1].tro && rnd(s, 'tro', p) * (vikt(f[0]) + vikt(f[1])) >= vikt(f[0]) ? f[1] : f[0];
  p.tro = q.tro; p.troStyrka = TRO.styrkaNy;
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

// ---------- trons tyngd (registret, steg 10.3.8) ----------
// vad en tro kan bestämma kommer ur dess tyngd: summan av raderna i TYNGDDELAR, räknad när någon frågar och aldrig sparad.
// Varje bud kräver tyngden för sin storlek (TYNGD.s1–s4). Ett antaget bud står kvar när tyngden sjunker
interface TyngdDel { namn: string; v: (s: State, tr: Tro) => number }
const tyngdAlder = (s: State, tr: Tro) => TYNGD.alderFran + (1 - TYNGD.alderFran) * clamp((s.now - tr.t) / (TYNGD.alderDygn * DAY), 0, 1);
export const TYNGDDELAR: Record<string, TyngdDel> = {
  troende: { namn: 'De troende', v: (s, tr) => living(s).filter(p => p.tro === tr.id && ageOf(p, s.now) >= ALDER.vuxen).reduce((a, p) => a + (p.troStyrka ?? 0) / 100, 0) * tyngdAlder(s, tr) },
  prast: { namn: 'Prästen', v: (s, tr) => { const q = tr.prast !== undefined ? s.people.find(p => p.id === tr.prast) : undefined; return q && alive(q) && q.tro === tr.id ? TYNGD.prast : 0; } },
  egendom: { namn: 'Kyrkans egendom', v: (s, tr) => { const f = kyrkansForrad(s, tr); return TYNGD.egendom * clamp(egendomIVed(f) / TYNGD.egendomVed, 0, 1); } },
  hus: { namn: 'Trons hus', v: (s, tr) => troshusKlart(s, tr) ? TYNGD.hus : 0 },
};
export const tyngdDelar = (s: State, tr: Tro) => Object.entries(TYNGDDELAR).map(([id, d]) => ({ id, namn: d.namn, v: d.v(s, tr) }));
export const tyngd = (s: State, tr: Tro) => tyngdDelar(s, tr).reduce((a, d) => a + d.v, 0);
export const tyngdFor = (storlek: number) => [0, TYNGD.s1, TYNGD.s2, TYNGD.s3, TYNGD.s4][storlek] ?? Infinity;
// räcker trons tyngd till ett bud av den här storleken?
export const rymsBud = (s: State, tr: Tro, storlek: number) => tyngd(s, tr) >= tyngdFor(storlek);
// etiketten (steg 10.3.8): den första som stämmer. Inga gränser, bara vad tron har
export const ETIKETTER: { namn: string; text: string; har: (s: State, tr: Tro) => boolean }[] = [
  { namn: 'Kyrka', text: 'Trons hus står klart.', har: (s, tr) => troshusKlart(s, tr) },
  { namn: 'Präst', text: 'Tron har en präst.', har: (s, tr) => TYNGDDELAR.prast.v(s, tr) > 0 },
  { namn: 'Helig plats', text: 'Tron har en helig plats.', har: (s, tr) => !!s.heliga?.some(h => h.tro === tr.id && h.skandad === undefined) },
  { namn: 'Delad tro', text: 'Tron har fått sitt namn.', har: (_s, tr) => !!tr.namn },
  { namn: 'Personlig tro', text: 'Bara några få tror.', har: () => true },
];
export const troEtikett = (s: State, tr: Tro) => ETIKETTER.find(e => e.har(s, tr))!;

// ---------- skalorna (registret) ----------
// de nio skalorna ("Nio skalor" i designdokumentet), 0–100 från den ena sidan till den andra. En tro börjar med de två första
// synliga; de andra låses upp för hela byn när det de styr dyker upp (oppnas). Då får varje tro ett värde på skalan. steg = där
// villkoret kommer, när det inte finns än
interface SkalaDef { namn: [string, string]; text: [string, string]; oppnas?: (s: State) => boolean; steg?: string }
export const SKALOR = {
  natur: { namn: ['Natur', 'Människa'], text: ['Andar i djur, träd, väder och platser', 'Förfäder, hjältar och helgon'] },
  manga: { namn: ['Många', 'En'], text: ['Många andar eller gudar', 'En enda gud'] },
  prast: { namn: ['Var och en', 'Präster'], text: ['Var och en möter det heliga själv', 'Präster förmedlar, regler och ordning'], oppnas: s => !!s.tron?.some(t => t.prast !== undefined) },
  livet: { namn: ['Nuet', 'Livet efter'], text: ['Hjälp nu: jaktlycka, hälsa, väder', 'Ett liv efter döden, lön eller straff där'], oppnas: s => (s.stat?.begravd_troende ?? 0) > 0 || (s.stat?.ritual_forsta_begravning ?? 0) > 0, /* första gången en troende begravs, vilken form det än blir (steg 10.4.5) */ steg: '10.1 (den första begravningsritualen)' },
  forlat: { namn: ['Förlåtande', 'Straffande'], text: ['Bikt, bot och förlåtelse', 'Vrede, stränga bud, syndabockar'], oppnas: s => !!s.tron?.some(t => t.slut === undefined && rymsBud(s, t, 1)) },
  fest: { namn: ['Fest', 'Försakelse'], text: ['Fest, dans och rus', 'Fasta, askes, avstå'], oppnas: s => !!s.tron?.some(t => t.slut === undefined && rymsBud(s, t, 1)) },
  krig: { namn: ['Fridsam', 'Krigisk'], text: ['Inget våld, inga blodsoffer', 'Offer och heligt krig'], oppnas: s => !!s.tron?.some(t => t.prast !== undefined) || (s.stat?.drap ?? 0) > 0 },
  oppen: { namn: ['Öppen', 'Sluten'], text: ['Välkomnar andra trosriktningar', 'Omvänder eller fördriver andra'], oppnas: s => (s.tron ?? []).filter(t => t.slut === undefined).length >= 2 },
  sprid: { namn: ['Sprider sig', 'Ärvs'], text: ['Försöker vinna nya följare', 'Ärvs bara inom släkten eller hålls hemlig'], oppnas: s => !!s.tron?.some(t => t.slut === undefined && rymsBud(s, t, 1)) },
} satisfies Record<string, SkalaDef>;
export type SkalaId = keyof typeof SKALOR;
const SDEF: Record<SkalaId, SkalaDef> = SKALOR;
export const SKALA_IDS = Object.keys(SKALOR) as SkalaId[];
// skalans värde för tron (natur och manga har alla; de andra när de låsts upp)
export const skalaV = (tr: Tro, k: SkalaId) => k === 'natur' ? tr.natur : k === 'manga' ? tr.manga : tr.sk?.[k];
export const skalaSyns = (s: State, k: SkalaId) => !SDEF[k].oppnas || !!s.troSkalor?.includes(k);
// skalan låses upp: varje tro får ett värde. Drar ur följden 'tro' hos grundaren eller den första som tror
export function satSkala(s: State, tr: Tro, k: SkalaId) {
  const p = s.people.find(q => q.id === tr.grundare && alive(q)) ?? troende(s, tr)[0] ?? s.people.find(q => q.id === tr.grundare);
  (tr.sk ??= {})[k] = p ? Math.round(rnd(s, 'tro', p) * 100) : 50;
}

// ---------- gudarna (registret, steg 4.1.5) ----------
// ett område som en gud råder över: namn (i listor och fliken), om (i meningar: "råder över åskan och himlen"), forled: ordleden
// som namnet börjar med (Is-grim, Eld-vald), i: var anden bor på Natur-sidan, heder: hedersnamnen (rykten.ts) som knyter en död
// bybo till området, och symbolen (ikoner.ts). Händelserna som föder området står där de händer (gudHandelse)
// djur: arterna guden kan göra heliga (steg 10.3.15); mat: huvudingredienserna i gudens matbud (steg 10.3.16)
interface GudDef { namn: string; om: string; forled: string[]; i: string[]; heder: IntryckTyp[]; djur: string[]; mat: string[]; sym: string }
export const GUDAR = {
  aska: { namn: 'Åska och himmel', om: 'åskan och himlen', forled: ['Dun', 'Blix', 'Sky', 'Ås'], i: ['åskmolnen', 'den stora örnen', 'den höga eken'], heder: [], djur: [], mat: [], sym: 'gud_aska' },
  sjon: { namn: 'Sjön och vattnet', om: 'sjön och vattnet', forled: ['Djup', 'Våg', 'Sjö', 'Strand'], i: ['den stora gäddan', 'djupet', 'forsen'], heder: [], djur: [], mat: ['fisk'], sym: 'gud_sjon' },
  skord: { namn: 'Skörd och jord', om: 'skörden och jorden', forled: ['Ax', 'Korn', 'Mull', 'Fröd'], i: ['den första tuvan', 'det gamla äppelträdet', 'åkerns sten'], heder: ['generos', 'flitig', 'rattvis'], djur: ['far', 'get'], mat: ['sad'], sym: 'gud_skord' },
  doden: { namn: 'Döden', om: 'döden', forled: ['Grav', 'Mörk', 'Natt', 'Skugg'], i: ['korpen', 'den döda granen', 'mossen'], heder: [], djur: ['fagel'], mat: [], sym: 'gud_doden' },
  jakt: { namn: 'Jakt och skog', om: 'jakten och skogen', forled: ['Varg', 'Hjort', 'Skog', 'Björk'], i: ['den vita hjorten', 'den gamla vargen', 'den stora granen'], heder: ['vargdodare', 'bjorndodare'], djur: ['varg', 'radjur', 'kanin'], mat: ['kott'], sym: 'gud_jakt' },
  elden: { namn: 'Elden', om: 'elden', forled: ['Eld', 'Glöd', 'Brand', 'Bål'], i: ['glöden', 'den svarta stenen vid elden', 'röken'], heder: [], djur: [], mat: [], sym: 'gud_elden' },
  vintern: { namn: 'Vintern och isen', om: 'vintern och isen', forled: ['Is', 'Frost', 'Snö', 'Rim'], i: ['isen på sjön', 'snöugglan', 'den frusna forsen'], heder: [], djur: [], mat: [], sym: 'gud_vintern' },
  solen: { namn: 'Solen', om: 'solen', forled: ['Sol', 'Ljus', 'Dag', 'Glans'], i: ['solstenen', 'lärkan', 'kullen i öster'], heder: [], djur: [], mat: ['bar'], sym: 'gud_solen' },
  atten: { namn: 'Ätten', om: 'ätten och barnen', forled: ['Ätt', 'Ung', 'Barn', 'Stam'], i: ['den gamla linden', 'källan', 'björnmodern'], heder: ['hjalpsam'], djur: ['bjorn'], mat: [], sym: 'gud_atten' },
  kriget: { namn: 'Kriget', om: 'kriget och striden', forled: ['Sköld', 'Spjut', 'Strid', 'Hugg'], i: ['vildsvinet', 'den kluvna stenen', 'korpen'], heder: ['stark'], djur: ['fagel'], mat: [], sym: 'gud_kriget' },
  hantverk: { namn: 'Hantverket', om: 'hantverket', forled: ['Smid', 'Sten', 'Hamr', 'Tälj'], i: ['flintberget', 'bävern', 'den gamla stubben'], heder: ['skicklig', 'rik'], djur: [], mat: [], sym: 'gud_hantverk' },
} satisfies Record<string, GudDef>;
export type GudOmr = keyof typeof GUDAR;
export const GUD_OMR: Record<GudOmr, GudDef> = GUDAR;
// namnets slut (Is-grim, Eld-vald, Djup-hild), och namnen på verkliga gudar som aldrig får bli ett namn
const EFTERLED = ['grim', 'vald', 'hild', 'mund', 'gerd', 'run', 'ulf', 'björn', 'dis', 'vi', 'stav', 'frid'];
const VERKLIGA = new Set(['tor', 'oden', 'odin', 'frej', 'frey', 'freja', 'freyja', 'loke', 'loki', 'balder', 'baldr', 'tyr', 'njord', 'heimdall', 'brage', 'idun', 'frigg', 'ull', 'vidar', 'vale', 'hod', 'höder', 'sif', 'skade', 'hel', 'ran', 'ägir', 'aegir', 'forsete', 'mimer', 'gefjon', 'eir', 'nanna', 'gerd', 'magne', 'mode', 'ymer', 'surt', 'sol', 'mane', 'jord', 'saga']);
const FORMER = { ande: ['ande', 'Anden'], gud: ['gud', 'Guden'], forfader: ['förfader', 'Förfadern'] } as const; // obestämd och bestämd form
export type GudForm = keyof typeof FORMER;
export const formNamn = (f: GudForm, bestamd = false) => FORMER[f][bestamd ? 1 : 0];
// en gud i en tro: områdena den råder över, namnet, formen, var anden bor (i) eller vem förfadern var (pid), när den kom
// (t och året ar), när något i dess område senast bekräftade den (bekr), berättelsen om hur den kom till och när den glömdes
export interface Gud { omr: GudOmr[]; namn: string; form: GudForm; i?: string; pid?: number; t: number; ar: number; bekr: number; ber: string; slut?: number }
export const gudarOf = (tr: Tro) => (tr.gudar ?? []).filter(g => g.slut === undefined);
const stor = (t: string) => t[0].toUpperCase() + t.slice(1);
const gudPerson = (s: State, tr: Tro) => s.people.find(q => q.id === tr.grundare && alive(q)) ?? troende(s, tr)[0];

// ---------- tecknen (registret) ----------
// det oförklarliga som kan bli en tro (steg 4.1.2.1). text: vad hen var med om ({om} = vem eller vad), natur: var tron börjar på
// skalan Natur – Människa (0 = andar i djur, väder och platser, 100 = förfäder och helgon). bakom, vill och svek: tolkningen,
// en av varje slumpas: vem eller vad som står bakom, vad den vill och vad som händer om man sviker den. sym: symbolen (ikoner.ts) och
// namn: namnen tron kan få när den delas av TRO.namn (steg 4.1.2.3). omr: gudens område (steg 4.1.5)
interface TeckenDef { text: string; natur: number; omr: GudOmr; sym: string; namn: string[]; bakom: string[]; vill: string[]; svek: string[]; i?: string[] } // i = där anden som tecknet föder kan bo, i stället för områdets (steg 13.1.9)
export const TECKEN = {
  blixt: { text: 'blixten som slog ner', natur: 15, omr: 'aska', sym: 'tro_blixt', namn: ['Åskans tro', 'Hammarens folk', 'Tordönets väg'],
    bakom: ['Den som bor i åskmolnen', 'Himlens hammare', 'Den stora fågeln vars vingar dånar'],
    vill: ['att man tystnar när det mullrar', 'en bit av varje byte på den höga stenen', 'att elden i byn aldrig får slockna'],
    svek: ['blixten slår ner i ens hus', 'skogen brinner', 'barnen blir döva'] },
  brand: { text: 'elden som spred sig i skogen', natur: 20, omr: 'elden', sym: 'tro_brand', namn: ['Eldens tro', 'Lågans folk', 'Askans väg'],
    bakom: ['Den röda som äter skogen', 'Eldens moder', 'Den hungriga i lågorna'],
    vill: ['ved i elden varje kväll innan man äter själv', 'att ingen spottar i elden', 'att askan bärs ut till skogen'],
    svek: ['elden tar huset', 'lågorna kommer om natten', 'man fryser ihjäl'] },
  vinterSlut: { text: 'den hårda vintern som tog slut', natur: 25, omr: 'vintern', sym: 'tro_vinter', namn: ['Vinterns tro', 'Isens folk', 'Den långa nattens väg'],
    bakom: ['Den vita som sover under isen', 'Vinterns gamle', 'Solen som kom tillbaka'],
    vill: ['att man delar maten när det är kallt', 'att den första snön hälsas med tystnad', 'att man tänder eld i mörkret'],
    svek: ['vintern kommer tillbaka och stannar', 'isen tar barnen', 'kölden kryper in i husen'] },
  torkaSlut: { text: 'regnet som kom efter torkan', natur: 20, omr: 'solen', sym: 'tro_regn', namn: ['Regnets tro', 'Källans folk', 'Molnens väg'],
    bakom: ['Den som bär regnet', 'Molnens moder', 'Källans ande'],
    vill: ['att det första vattnet hälls ut på marken', 'att ingen slösar med vatten', 'att man sjunger när det regnar'],
    svek: ['regnet uteblir', 'sjön torkar ut', 'grödorna vissnar'] },
  flodSlut: { text: 'vattnet som drog sig tillbaka', natur: 15, omr: 'sjon', sym: 'tro_flod', namn: ['Djupets tro', 'Sjöns folk', 'Vågornas väg'],
    bakom: ['Den som bor i djupet', 'Sjöns herre', 'Vattnets vrede'],
    vill: ['en fisk tillbaka i vattnet för varje fångst', 'att man inte bygger för nära stranden', 'att man är tyst vid strandkanten'],
    svek: ['vattnet stiger igen', 'fisken försvinner', 'någon drunknar'] },
  jakt: { text: 'haren som gick att fånga med bara händerna', natur: 15, omr: 'jakt', sym: 'tro_hare', namn: ['Bytets tro', 'Skogens folk', 'Jägarens väg'],
    bakom: ['Harens moder', 'Skogens herre', 'Den gröna som ger bytet'],
    vill: ['att den första biten lämnas i skogen', 'att man tackar bytet', 'att ingen jagar mer än man behöver'],
    svek: ['djuren flyr', 'spjuten missar', 'jägaren blir själv jagad'] },
  barnFrisk: { text: 'att {om} överlevde en svår sjukdom', natur: 75, omr: 'atten', sym: 'tro_barn', namn: ['Förfädernas tro', 'De dödas folk', 'Minnets väg'],
    bakom: ['De döda som vakar över barnen', 'Den gamla modern', 'Förfäderna'],
    vill: ['att man talar om de döda vid elden', 'att barnen får äta först', 'att ingen glöms'],
    svek: ['sjukdomen kommer tillbaka', 'barnen blir sjuka', 'de döda vänder sig bort'] },
  drom: { text: 'en dröm', natur: 65, omr: 'doden', sym: 'tro_drom', namn: ['Drömmarnas tro', 'Nattens folk', 'Rösternas väg'],
    bakom: ['Den som talar i sömnen', 'Förfäderna', 'Rösten i mörkret'],
    vill: ['att man berättar sina drömmar', 'att man sover med huvudet mot elden', 'att man lyssnar på de gamla'],
    svek: ['drömmarna blir mardrömmar', 'man går vilse i skogen', 'de döda kommer tillbaka'] },
  // en ny tolkning av de heliga kvädena (steg 10.6.3): profeten i en tro med en helig skrift grundar en ny tro på den
  tolkning: { text: 'en ny tolkning av de heliga kvädena', natur: 60, omr: 'doden', sym: 'tro_drom', namn: ['De nya ordens tro', 'Tolkarnas folk', 'Den andra läsningens väg'],
    bakom: ['Den som talar genom kvädena', 'Rösten bakom orden', 'De gamla orden'],
    vill: ['att man läser kvädena på nytt', 'att man lyssnar på det som inte sägs', 'att man ifrågasätter de gamla prästerna'],
    svek: ['orden tystnar', 'kvädena glöms', 'de gamla prästerna får rätt'] },
  // fler tecken (steg 8.5.18)
  tornado: { text: "tornadon som gick förbi", natur: 20, omr: 'aska', sym: 'tro_blixt', namn: ["Stormens tro", "Virvelns folk", "Vindens väg"],
    bakom: ["Den som går på himlen", "Vindens moder", "Den vridna"], vill: ["att man binder fast det man äger", "att man lämnar en bit åt vinden", "att ingen ropar i blåsten"], svek: ["vinden tar huset", "stormen kommer tillbaka", "taket lyfter i natten"] },
  brandStopp: { text: "branden som stannade", natur: 25, omr: 'elden', sym: 'tro_brand', namn: ["Den stannade eldens tro", "Askgränsens folk", "Lågans väg"],
    bakom: ["Den som höll elden tillbaka", "Eldens herre", "Den som säger stopp"], vill: ["att man lämnar ett bränt träd stå", "att ingen eldar nära gränsen", "att man tackar elden"], svek: ["elden går över gränsen", "skogen brinner igen", "lågorna tar byn"] },
  overlevde: { text: "att {om} överlevde", natur: 70, omr: 'jakt', sym: 'tro_hare', namn: ["Överlevarnas tro", "Ärrens folk", "Rovdjurets väg"],
    bakom: ["Den som skonade", "Rovdjurets moder", "Den som höll tillbaka bettet"], vill: ["att man bär ett ben från bytet", "att man inte skrattar åt rovdjuren", "att man berättar vad som hände"], svek: ["rovdjuret kommer tillbaka", "såret går upp", "man går ensam i skogen en gång för mycket"] },
  barnAska: { text: "barnet som föddes i åskan", natur: 40, omr: 'aska', sym: 'tro_blixt', namn: ["Åskbarnets tro", "De födda under himlens folk", "Dånets barn"],
    bakom: ["Den som dånade när barnet kom", "Himlens fader", "Blixtens moder"], vill: ["att barnet får ett särskilt namn", "att man lyssnar på barnet", "att ingen slår ett åskbarn"], svek: ["barnet blir sjukt", "åskan slår ner vid huset", "det blir inga fler barn"] },
  ingenDog: { text: "vintern där ingen frös eller svalt ihjäl", natur: 60, omr: 'vintern', sym: 'tro_vinter', namn: ["Den milda vinterns tro", "De levandes folk", "De skonades väg"],
    bakom: ["Den som höll döden borta", "Vinterns moder", "De döda som vaktade"], vill: ["att man äter tillsammans när isen går", "att man tackar för varje vinter", "att alla räknas när våren kommer"], svek: ["nästa vinter tar dubbelt", "någon försvinner i snön", "kylan kommer tidigt"] },
  skord: { text: "den första skörden", natur: 35, omr: 'skord', sym: 'tro_regn', namn: ["Skördens tro", "Jordens folk", "Fältets väg"],
    bakom: ["Den som bor i jorden", "Fältets moder", "Den gamla under fältet"], vill: ["att det första kornet läggs tillbaka", "att ingen trampar på fältet", "att man sjunger när man sår"], svek: ["jorden ger inget", "sädesfältet ruttnar", "svälten kommer"] },
  dubbelt: { text: "fältet som gav dubbelt", natur: 35, omr: 'skord', sym: 'tro_regn', namn: ["Dubbla kärvens tro", "Överflödets folk", "Fältets väg"],
    bakom: ["Den som lägger till", "Jordens rika moder", "Fältets herre"], vill: ["att man ger bort det man fick för mycket", "att man lämnar en kärve kvar", "att man inte räknar högt"], svek: ["fältet ger inget nästa år", "råttorna kommer", "det hela vänder"] },
  fynd: { text: "fyndet på den märkliga platsen", natur: 30, omr: 'jakt', sym: 'tro_hare', namn: ["Fyndets tro", "Sökarnas folk", "Stenens väg"],
    bakom: ["Den som gömde det", "Platsens ande", "Den som lämnar spår"], vill: ["att man lämnar något i utbyte", "att platsen inte visas för främlingar", "att man går dit en gång om året"], svek: ["man går vilse", "det man hittade förloras", "platsen stänger sig"] },
  svampsyn: { text: "svampen som gav syner", natur: 20, omr: 'jakt', sym: 'tro_drom', namn: ["Synernas tro", "De seendes folk", "Svampens väg"],
    bakom: ["Den som talar genom svampen", "Skogens öga", "Den gröna rösten"], vill: ["att man äter den bara i sällskap", "att man berättar vad man såg", "att man tackar skogen"], svek: ["synerna blir onda", "man hittar inte hem", "rösten tystnar"] },
  dodDrom: { text: "att {om} kom tillbaka i en dröm", natur: 75, omr: 'doden', sym: 'tro_drom', namn: ["De dödas tro", "Minnets folk", "Drömmens väg"],
    bakom: ["De döda som kommer om natten", "Den som går mellan", "Förfäderna"], vill: ["att man lägger mat på graven", "att man talar med de döda", "att man inte sover ensam"], svek: ["den döde kommer tillbaka varje natt", "man får inte sova", "de döda vänder sig bort"] },
  frosjo: { text: "sjön som frös på en natt", natur: 15, omr: 'vintern', sym: 'tro_vinter', namn: ["Isens tro", "Stilla vattnets folk", "Köldens väg"],
    bakom: ["Den som lägger locket på", "Isens herre", "Vattnets vinterande"], vill: ["att man inte går först på isen", "att man bryter en vak och lämnar en fisk", "att man är tyst vid isen"], svek: ["isen brister", "fisken dör", "vattnet kommer aldrig tillbaka"] },
  bonSvar: { text: "bönen som fick svar", natur: 55, omr: 'atten', sym: 'tro_drom', namn: ["Svarets tro", "De hörda folk", "Bönens väg"],
    bakom: ["Den som lyssnar", "Den hörande", "Rösten som svarar"], vill: ["att man ber varje kväll", "att man tackar högt", "att man ber för andra"], svek: ["ingen svarar mer", "man blir ensam i sin nöd", "bönen vänds mot en"] },
  // tvillingarna och björnen som vände om (steg 10.3.7)
  tvillingar: { text: "tvillingarna {om} som föddes levande", natur: 60, omr: 'atten', sym: 'tro_barn', namn: ["Tvillingarnas tro", "De dubbla folk", "Det delade blodets väg"],
    bakom: ["Den som gav två i stället för ett", "Moderns moder", "De två i mörkret"], vill: ["att tvillingar aldrig skiljs åt", "att man delar allt i två lika delar", "att man tackar vid varje födsel"], svek: ["den ena tvillingen tas tillbaka", "det blir inga fler barn", "syskon blir ovänner"] },
  bjornVande: { text: "björnen som vände om", natur: 20, omr: 'jakt', sym: 'tro_hare', namn: ["Björnens tro", "Den skonades folk", "Ramens väg"],
    bakom: ["Skogens gamle", "Den som går på fyra och på två", "Björnmodern"], vill: ["att ingen säger björnens namn högt", "att man lämnar honung i skogen", "att man går tyst förbi idet"], svek: ["björnen kommer tillbaka och vänder inte", "ramen tar boskapen", "man möter den ensam i mörkret"] },
  // det glödande järnet ur blästerugnen (steg 13.1.9): tron får hantverkets gud, och anden kan bo i städet
  jarn: { text: 'det glödande järnet som rann ur ugnen', natur: 35, omr: 'hantverk', sym: 'tro_brand', namn: ['Järnets tro', 'Smidets folk', 'Glödens väg'],
    bakom: ['Den som bor i ugnen', 'Smeden under jorden', 'Den som gör sten till järn'], vill: ['att det första järnet ur varje ugn ges tillbaka till myren', 'att ingen svär vid städet', 'att elden i ässjan släcks med vatten och aldrig med jord'], svek: ['järnet spricker', 'ugnen ger bara slagg', 'elden i smedjan tar huset'],
    i: ['städet', 'ässjans glöd', 'den röda myren'] },
} satisfies Record<string, TeckenDef>;
export type TeckenTyp = keyof typeof TECKEN;
const TDEF: Record<TeckenTyp, TeckenDef> = TECKEN;
// chansen att tolka varje tecken till en egen tro (steg 8.5.18), ett balanstal per rad
// alla trosnamnen (raden i världen, steg 11.3.11)
export const TRONAMN: readonly string[] = Object.values(TECKEN).flatMap(d => (d as TeckenDef).namn);
export const TECKENTAL = balans('tecken', {
  blixt: 0.3, brand: 0.3, vinterSlut: 0.3, torkaSlut: 0.3, flodSlut: 0.3, jakt: 0.3, barnFrisk: 0.3, drom: 0.3,
  tornado: 0.25, brandStopp: 0.2, overlevde: 0.2, barnAska: 0.2, ingenDog: 0.1, skord: 0.1, dubbelt: 0.15, fynd: 0.1, svampsyn: 0.25, dodDrom: 0.15, frosjo: 0.1, bonSvar: 0.2,
  tvillingar: 0.2, bjornVande: 0.1, jarn: 0.3, tolkning: 0, // tolkningen tolkas inte ur ett tecken: profeten grundar tron direkt (kult.ts)
} satisfies Record<TeckenTyp, number>);
export const teckenText = (k: TeckenTyp, om?: string) => TDEF[k].text.replace('{om}', om ?? '');

// ---------- tron ----------
// en tro (steg 4.1.2): vem som grundade den (id och namn), när, tecknet den kom ur och tolkningen. natur och manga är de två
// första skalorna (0–100: Natur – Människa och Många – En). bekr: när ett tecken senast bekräftade den. slut: när den sista
// som trodde dog. ar: året den kom. namn, sym och ber (berättelsen om hur den började) får den när TRO.namn tror (steg 4.1.2.3).
// sk: värdet på de skalor som låsts upp efter de två första, gudar: trons gudar (steg 4.1.5)
export interface Tro { hogtidDag?: number; // dygnet då högtiden hölls: också en helig dag (steg 10.3.16)
  bud?: import('./kyrka').AntagetBud[]; plan?: import('./troshus').TrosPlan; planRutor?: number; /* planen för trons hus och dess golvrutor (steg 10.3.18) */ planVuxna?: number; planNej?: Record<string, { pa: number; golv: number }>; /* de vuxna troende när storleken avgjordes, och en möbel som fick nej: skalans sida och husets golvrutor då (steg 10.3.21) */ roster?: import('./rost').Omrostning[]; nedrostat?: Record<string, number>; // trons omröstningar, och det som röstats ned och vilar (steg 10.3.2)
  skrift?: boolean; /* tron har en helig skrift (steg 10.6.3, skrift.ts), räknat en gång i timmen */ forrad?: Record<string, number>; /* bara i äldre sparfiler (före steg 10.3.17) */ framPris?: string; /* det kyrkan lagt undan för ett framträdande (steg 10.7.18) */ hov?: { x: number; y: number; prog: number; klar?: number }; tempel?: { x: number; y: number; prog: number; klar?: number }; /* hov, tempel och gudabild bara i äldre sparfiler (före steg 10.3.19) */ fodda?: number; offrad?: number; gudabild?: number; helgon?: { id: number; namn: string; t: number; krönika: string; myt: string }[]; kvade?: { t: number; text: string; av: number; larjunge?: number }; x?: number; y?: number; prast?: number; hogtid?: number; heligKand?: { x: number; y: number; t: number; om: string }[]; brollop?: number; fodd?: number; vuxen?: number; leddBon?: number; myrOffer?: number; /* när offret i myren senast lades i kön (steg 12.1.5) */ profeter?: number[]; gravSlag?: 'helig' | 'vatten' | 'bryn' | 'by'; /* bara i äldre sparfiler (före steg 10.4.6) */ id: number; grundare: number; gnamn: string; t: number; k: TeckenTyp; om?: string; bakom: string; vill: string; svek: string; natur: number; manga: number; bekr: number; slut?: number; ar: number; namn?: string; sym?: string; ber?: string; sk?: Partial<Record<SkalaId, number>>; gudar?: Gud[] }
export const troOf = (s: State, id: number | undefined) => id === undefined ? undefined : s.tron?.find(t => t.id === id);
export const troende = (s: State, tr: Tro) => living(s).filter(p => p.tro === tr.id);
// tolkningen som meningar: "Den som bor i åskmolnen vill att man tystnar när det mullrar. Om man sviker: blixten slår ner i ens hus."
export const tolkning = (tr: Tro) => `${tr.bakom} vill ${tr.vill}. Om man sviker: ${tr.svek}.`;

// p var med om tecknet k: det är en upplevelse (som kan flytta andligheten), det bekräftar tron hen redan har, och den som är
// mycket andlig och inte tror på något kan tolka det till en egen tro. Drar ur personens följd 'tro'
export function tecken(s: State, p: Person, k: TeckenTyp, om?: string) {
  if (!alive(p) || ageOf(p, s.now) < UPPV.fran) return;
  count(s, 'tecken_' + k); // byns statistik: tecknen som någon var med om
  const text = teckenText(k, om);
  upplev(s, p, 'tecken', text);
  const egen = troOf(s, p.tro);
  if (egen) { egen.bekr = s.now; p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + TRO.bekrafta); count(s, 'tro_bekr'); if (egen.namn) gudFor(s, egen, TDEF[k].omr, text); return; }
  if (formas(s, p) || andlighet(s, p) < TRO.grunda || rnd(s, 'tro', p) >= TECKENTAL[k]) return;
  // var någon annan med om samma sak och tolkade den nyss, delar hen den tron i stället för att grunda en egen
  const samma = s.tron?.find(t => t.k === k && t.om === om && t.slut === undefined && s.now - t.t <= TRO.samma * HOUR);
  if (samma) { p.tro = samma.id; p.troStyrka = TRO.styrka; count(s, 'tro_samma'); log(s, `${p.name} såg samma tecken som ${samma.gnamn} och tror nu likadant.`, 'rel', [p.id, samma.grundare]); return; }
  grunda(s, p, k, om);
}
export const TRO_PROV = { utanTak: false }; // scenarierna som prövar många tecken i samma by
// trons grundvärden ur tecknet d och grundaren p (fynd 195): vem som står bakom, vad den vill och skalorna, slumpen i den här ordningen
function nyTro(s: State, p: Person, d: (typeof TDEF)[TeckenTyp], huvud: Pick<Tro, 'id' | 'grundare' | 'gnamn' | 't' | 'ar' | 'k' | 'om'>): Tro {
  return {
    ...huvud,
    bakom: pick(s, d.bakom, 'tro', p), vill: pick(s, d.vill, 'tro', p), svek: pick(s, d.svek, 'tro', p),
    natur: Math.round(clamp(d.natur + gauss(s, 'tro', p) * TRO.skalaSlump, 0, 100)), manga: Math.round(clamp(rnd(s, 'tro', p) * 100, 0, 100)), bekr: s.now, x: Math.floor(p.x), y: Math.floor(p.y),
  };
}
// gudens berättelse: anden i i (form ande) eller guden som en människa, med tecknet h, året ar och trons namn tro (fynd 195)
const gudBer = (form: 'ande' | 'gud', h: string, ar: number, tro: string, namn: string, om: string, i?: string) => form === 'ande'
  ? `Det började med ${h}, år ${ar}. De som tror på ${liten(tro)} förstod att det var anden i ${i} som visat sig. Anden heter ${namn} och råder över ${om}.`
  : `År ${ar}, med ${h}, visade sig ${namn} för dem som tror på ${liten(tro)}. ${namn} ser ut som en människa och råder över ${om}.`;
export function grunda(s: State, p: Person, k: TeckenTyp, om?: string) {
  const d = TDEF[k], tron = (s.tron ??= []);
  if (!TRO_PROV.utanTak && tron.filter(t => t.slut === undefined).length >= TRO.takTro) return; // högst några trosriktningar samtidigt (steg 8.5.11)
  const tr = nyTro(s, p, d, { id: tron.length + 1, grundare: p.id, gnamn: p.name, t: s.now, ar: yearNo(s), k, ...om ? { om } : {} });
  tron.push(tr);
  for (const sk of s.troSkalor ?? []) satSkala(s, tr, sk); // skalorna som redan låsts upp i byn
  p.tro = tr.id; p.troStyrka = TRO.styrka;
  count(s, 'tro_ny');
  log(s, `${p.name} tolkade ${teckenText(k, om)} som ett tecken. ${tolkning(tr)}`, 'rel', [p.id]);
  kronikaBer(s, 'k_tro', tr.id, { grundare: p.name, tecken: teckenText(k, om) }); // (steg 12.1.135)
  notis(s, 'tro', `${p.name} tolkade ${teckenText(k, om)} som ett tecken, och en ny tro började i byn. ${tolkning(tr)}`, [p.id]); // (steg 12.1.137)
}

// ---------- namnet och berättelsen (steg 4.1.2.3) ----------
// berättelserna om hur tron började. {grundare}, {tecken}, {ar}, {Bakom} och {bakom} (med liten bokstav), {vill} och {svek}
const BERATTELSE = [
  'Allt började med {tecken}, år {ar}. {grundare} förstod att det var {bakom} som visat sig. Sedan dess vet de troende att {bakom} vill {vill}. De säger att {svek} om man sviker.',
  '{grundare} var med om {tecken} och tolkade det som ett tecken: {Bakom} vill {vill}. Den som sviker får se hur {svek}.',
  'De troende berättar om {tecken} år {ar}. Det var då {bakom} talade till {grundare}. {Bakom} vill {vill}, och de säger att {svek} om man sviker.',
  'Sedan {tecken} år {ar} vet de som tror att {bakom} finns. {grundare} såg det först. {Bakom} vill {vill}. Den som sviker får se hur {svek}.',
  'Ingen kunde förklara {tecken}, utom {grundare}: {bakom} hade visat sig. Därför vet de troende att {bakom} vill {vill}, och att {svek} om man sviker.',
  '{grundare} säger att {bakom} låg bakom {tecken} år {ar}. {Bakom} vill {vill}. Sviker man, får man se hur {svek}.',
];
const liten = (t: string) => t[0].toLowerCase() + t.slice(1);
export const troNamn = (tr: Tro) => tr.namn ?? `Tron på ${liten(tr.bakom)}`;
function berattelse(s: State, tr: Tro, p: Person) {
  return pick(s, BERATTELSE, 'tro', p).replace(/\{grundare\}/g, tr.gnamn).replace(/\{tecken\}/g, teckenText(tr.k, tr.om)).replace(/\{ar\}/g, String(tr.ar))
    .replace(/\{Bakom\}/g, tr.bakom).replace(/\{bakom\}/g, liten(tr.bakom)).replace(/\{vill\}/g, tr.vill).replace(/\{svek\}/g, tr.svek);
}
// tron delas av TRO.namn: den får ett namn som ingen annan tro har, tecknets symbol och berättelsen. Drar ur följden 'tro' hos den
// som grundade den (eller den första som tror, om grundaren är död)
function namnge(s: State, tr: Tro, folk: Person[]) {
  const p = s.people.find(q => q.id === tr.grundare && alive(q)) ?? folk[0], d = TDEF[tr.k];
  const tagna = new Set((s.tron ?? []).map(t => t.namn));
  const fria = d.namn.filter(n => !tagna.has(n));
  tr.namn = fria.length ? pick(s, fria, 'tro', p) : `Den nya ${liten(pick(s, d.namn, 'tro', p))}`;
  tr.sym = d.sym; tr.ber = berattelse(s, tr, p);
  nyGud(s, tr, d.omr, teckenText(tr.k, tr.om), p); // den första guden kommer ur tecknet
  count(s, 'tro_namn');
  log(s, `${storOrd(tal(folk.length))} tror nu på ${liten(tr.bakom)}. Tron har fått ett namn: ${tr.namn}.`, 'rel', folk.map(q => q.id));
  kronika(s, `År ${yearNo(s)}: ${tr.namn} fick sitt namn. ${tr.ber}`, 'tro');
}

// ---------- gudarna (steg 4.1.5) ----------
// en död bybo som byn fortfarande berättar om (ett hedersnamn), eller trons grundare, kan bli förfader: tidigast GUD.generation
// dygn efter döden och när ingen som var gammal nog att minnas hen lever. omr: det område hen hör till (hedersnamnet), eller
// för grundaren trons första gud. Den som redan är förfader i tron blir det inte igen
function forfaderOmr(s: State, tr: Tro, p: Person): GudOmr | undefined {
  if (p.died === undefined || s.now - p.died < GUD.generation * DAY || tr.gudar?.some(g => g.pid === p.id)) return;
  if (living(s).some(q => ageOf(q, p.died!) >= UPPV.fran)) return;
  const h = p.binamn && (Object.keys(GUDAR) as GudOmr[]).find(o => (GUD_OMR[o].heder as string[]).includes(p.binamn!.k));
  return h || (p.id === tr.grundare ? tr.gudar?.[0]?.omr[0] : undefined);
}
const forfaderNamn = (p: Person) => p.binamn ? `${p.name} ${p.binamn.namn}` : p.name; // som heltNamn (berattelser.ts)
// ett nytt namn av ordled: forleden ur området och ett efterled, aldrig en verklig gud och aldrig ett namn en annan gud i byn har
function gudNamn(s: State, omr: GudOmr, p: Person | undefined) {
  const tagna = new Set((s.tron ?? []).flatMap(t => (t.gudar ?? []).map(g => g.namn)));
  let n = '';
  for (let i = 0; i < 8; i++) {
    n = stor(pick(s, GUD_OMR[omr].forled, 'tro', p).toLowerCase() + pick(s, EFTERLED, 'tro', p));
    if (!VERKLIGA.has(n.toLowerCase()) && !tagna.has(n)) break;
  }
  return n;
}
// en ny gud i området omr, född ur händelsen h (en fras: "blixten som slog ner"). Formen följer Natur – Människa; på Människa-sidan
// blir den en förfader om det finns en död bybo som hör till området, annars en gud i människoform. Drar ur följden 'tro' hos p
function nyGud(s: State, tr: Tro, omr: GudOmr, h: string, p: Person | undefined) {
  const d = GUD_OMR[omr], ar = yearNo(s), tro = troNamn(tr);
  const fp = tr.natur > GUD.forfader ? s.people.find(q => !alive(q) && forfaderOmr(s, tr, q) === omr) : undefined;
  let g: Gud;
  if (fp) g = forfader(s, tr, fp, omr);
  else if (tr.natur < GUD.ande) {
    const t = TDEF[tr.k], i = pick(s, t?.i && t.omr === omr ? t.i : d.i, 'tro', p), namn = gudNamn(s, omr, p); // tecknet kan säga var anden bor (steg 13.1.9)
    g = { omr: [omr], namn, form: 'ande', i, t: s.now, ar, bekr: s.now, ber: gudBer('ande', h, ar, tro, namn, d.om, i) };
  } else {
    const namn = gudNamn(s, omr, p);
    g = { omr: [omr], namn, form: 'gud', t: s.now, ar, bekr: s.now, ber: gudBer('gud', h, ar, tro, namn, d.om) };
  }
  (tr.gudar ??= []).push(g);
  count(s, 'gud_ny'); count(s, 'gud_' + g.form);
  log(s, `${tro} har fått en ${formNamn(g.form)}: ${g.namn}, som råder över ${d.om}.`, 'rel', troende(s, tr).map(q => q.id));
  kronika(s, `År ${ar}: ${g.ber}`, 'tro');
}
function forfader(s: State, tr: Tro, p: Person, omr: GudOmr): Gud {
  const namn = forfaderNamn(p), ar = yearNo(s), dar = yearNo(s, p.died!);
  return { omr: [omr], namn, form: 'forfader', pid: p.id, t: s.now, ar, bekr: s.now, ber: `${namn} levde i byn och dog år ${dar}. Ingen som kände ${p.sex === 'k' ? 'henne' : 'honom'} lever längre, men byn berättar fortfarande om ${p.sex === 'k' ? 'henne' : 'honom'}, och de som tror på ${liten(troNamn(tr))} säger att ${p.name} vakar över ${GUD_OMR[omr].om}.` };
}
// något i området omr hände i tron tr (h: händelsen som en fras): guden för området bekräftas, och finns ingen kan en ny födas
// (GUD.fod). En tro långt åt En har bara en gud, som tar över området i stället
function gudFor(s: State, tr: Tro, omr: GudOmr, h: string) {
  const gudar = gudarOf(tr), g = gudar.find(x => x.omr.includes(omr));
  if (g) { g.bekr = s.now; count(s, 'gud_bekr'); return; }
  const p = gudPerson(s, tr);
  if (!p || rnd(s, 'tro', p) >= GUD.fod) return;
  if (tr.manga > GUD.en && gudar.length) {
    const en = gudar[0]; en.omr.push(omr); en.bekr = s.now; count(s, 'gud_omr');
    log(s, `${en.namn} råder nu också över ${GUD_OMR[omr].om}, säger de som tror på ${liten(troNamn(tr))}.`, 'rel', troende(s, tr).map(q => q.id));
    return;
  }
  nyGud(s, tr, omr, h, p);
}
// en stor händelse i byn (steg 4.1.5): varje tro som har ett namn och troende hör om den
export function gudHandelse(s: State, omr: GudOmr, h: string) {
  for (const tr of s.tron ?? []) if (tr.namn && tr.slut === undefined && tr.gudar?.length) gudFor(s, tr, omr, h);
}
// varje timme: en tro på Människa-sidan kan göra en död bybo till förfader, och en gud som inget bekräftat på länge glöms
function gudSteg(s: State, tr: Tro, h = 1) {
  const gudar = gudarOf(tr);
  if (!gudar.length) return;
  if (tr.natur > GUD.forfader && tr.manga <= GUD.en) {
    const p = gudPerson(s, tr);
    if (p && rnd(s, 'tro', p) < chansTid(GUD.forfaderChans, 1, h)) {
      const fp = s.people.find(q => !alive(q) && forfaderOmr(s, tr, q));
      if (fp) {
        const g = forfader(s, tr, fp, forfaderOmr(s, tr, fp)!);
        tr.gudar!.push(g); count(s, 'gud_ny'); count(s, 'gud_forfader');
        log(s, `${troNamn(tr)} har fått en förfader: ${g.namn}, som vakar över ${GUD_OMR[g.omr[0]].om}.`, 'rel', troende(s, tr).map(q => q.id));
        kronika(s, `År ${yearNo(s)}: ${g.ber}`, 'tro');
      }
    }
  }
  if (gudar.length < 2) return;
  for (const g of gudar) if (s.now - g.bekr > GUD.glom * DAY && gudarOf(tr).length > 1) {
    g.slut = s.now; count(s, 'gud_glomd');
    log(s, `Ingen ber längre till ${g.namn}. ${formNamn(g.form, true)} bleknar och glöms.`, 'rel', []);
  }
}

// ---------- samtalen (samtal.ts) ----------
// samtalsslagen som för tron vidare och hur mycket (ett djupt samtal mest, ett gräl inte alls)
const SPRID_SLAG: Record<string, number> = { 'djupt samtal': 2, 'berättelse': 1.5, 'tröst': 1.5, 'småprat': 1, 'skämt': 0.5, 'flirt': 0.5 };
// a talar med b (steg 4.1.2.2): den som tror försöker övertyga den som inte tror på något. Chansen beror på talarens karisma och
// andlighet, lyssnarens andlighet, hur mycket de tycker om varandra och om ett tecken nyss bekräftat tron. Två som tror
// likadant stärker varandra. Byta tro kommer med steg 10.1.2.4. Drar ur talarens följd 'tro'
// chansen att a får b, som inte tror på något, att tro på tr i ett samtal som väger f
export const spridChans = (s: State, tr: Tro, a: Person, b: Person, r: Rel, f: number) => TRO.sprid * f * (stat(a, 'karisma', s.now) / TRO.spridKarisma) * (andlighet(s, a) / TRO.spridAnde) * (andlighet(s, b) / TRO.spridAnde) ** 2
  * Math.max(0, 1 + r.op / TRO.spridRel) * (s.now - tr.bekr < TRO.bekrTid * DAY ? TRO.bekrFaktor : 1) * (tr.skrift ? SKRIFT.heligSprid : 1); // en tro med en helig skrift sprids lättare (steg 10.6.3)
export function predika(s: State, a: Person, b: Person, r: Rel, kind: string, ganger = 1) { // ganger: ett framträdande väger som så många samtal (framtradande.ts)
  const tr = troOf(s, a.tro), f = SPRID_SLAG[kind];
  if (!tr || !f || !alive(b) || ageOf(b, s.now) < UPPV.fran) return;
  if (b.tro === tr.id) { b.troStyrka = Math.min(100, (b.troStyrka ?? 0) + TRO.samtalStyrka); return; }
  // byta tro (steg 8.5.12): den som har en annan tro lyssnar när tron svikit hen
  if (b.tro !== undefined) { const annan = troOf(s, b.tro); if (annan && rnd(s, 'tro', a) < bytaChans(b, skalaV(tr, 'oppen') ?? 50) * TRO.spridBy * f * ganger * (tr.skrift ? SKRIFT.heligSprid : 1)) { b.tro = tr.id; b.troStyrka = TRO.styrkaNy; b.tvivel = undefined; count(s, 'tro_byte'); log(s, `${b.name} lämnade ${troNamn(annan).toLowerCase()} för ${troNamn(tr).toLowerCase()}.`, 'rel', [a.id, b.id]); } return; }
  if (andlighet(s, b) < TRO.spridMin) return;
  if (rnd(s, 'tro', a) >= spridChans(s, tr, a, b, r, f * ganger)) return;
  b.tro = tr.id; b.troStyrka = TRO.styrkaNy;
  count(s, 'tro_sprid');
  log(s, `${a.name} har övertygat ${b.name}: ${tr.bakom} vill ${tr.vill}.`, 'rel', [a.id, b.id]);
}

// ---------- varje timme (steg.ts) ----------
// drömmarna, barnet som blev friskt, tron som fick sitt namn och tron som dog med sin sista troende
export function stepReligion(s: State, h = 1) { // h: timmarna sedan sist (TAKTER)
  for (const p of living(s)) {
    if (p.task?.act === 'sova' && rnd(s, 'tro', p) < chansTid(TRO.drom, 1, h)) {
      const d = p.partner === undefined ? s.people.find(q => !alive(q) && q.died !== undefined && s.now - q.died < ANDE.dromDygn * DAY && (s.rels[relKey(p.id, q.id)]?.op ?? 0) > ANDE.dromOp) : undefined;
      if (d) tecken(s, p, 'dodDrom', d.name); else tecken(s, p, 'drom');
    }
    if (p.svartSjuk && !isSick(p, s.now)) {
      p.svartSjuk = undefined;
      if (formas(s, p)) for (const q of living(s)) if (isParent(q, p)) tecken(s, q, 'barnFrisk', p.name);
    }
  }
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined) continue;
    const folk = troende(s, tr);
    if (!folk.length) { tr.slut = s.now; releaseOwner(s, kyrkaId(tr.id)); count(s, 'tro_slut'); continue; } // kyrkans del blir byns (steg 10.3.17)
    if (!tr.namn && folk.length >= TRO.namn) namnge(s, tr, folk);
    gudSteg(s, tr, h);
  }
  // skalorna som låses upp när det de styr dyker upp
  for (const k of SKALA_IDS) if (SDEF[k].oppnas && !s.troSkalor?.includes(k) && SDEF[k].oppnas!(s)) {
    (s.troSkalor ??= []).push(k);
    for (const tr of s.tron ?? []) if (tr.slut === undefined) satSkala(s, tr, k);
    count(s, 'tro_skala');
    log(s, `Tron i byn har fått en ny sida: ${SDEF[k].namn[0]} – ${SDEF[k].namn[1]}.`, 'rel', []);
  }
}

// ---------- en tro ur en rad i världen (steg 11.13.19, vacktro.ts) ----------
// den väckta byns tro byggs ur radens: namnet, läggningen (krig) och de troende. Tecknet väljs ur namnet (det tecken vars
// namn tron bär, annars ur namnets bokstäver), grundaren är den äldsta troende och tron började när byn grundades eller när
// grundaren blev vuxen. Den första guden kommer ur tecknet som vanligt, men utan rader i loggen: det hände före besöket
export function troUrRad(s: State, rt: { namn: string; krig: number }, folk: Person[], t: number): Tro | undefined {
  const p = folk.slice().sort((a, b) => a.born - b.born || a.id - b.id)[0];
  if (!p) return undefined;
  const ids = Object.keys(TDEF) as TeckenTyp[];
  let h = 0; for (let i = 0; i < rt.namn.length; i++) h = (h * 31 + rt.namn.charCodeAt(i)) >>> 0;
  const k = ids.find(x => TDEF[x].namn.includes(rt.namn)) ?? ids[h % ids.length], d = TDEF[k], tron = (s.tron ??= []);
  const fran = Math.min(s.now, Math.max(t, p.born + ALDER.vuxen * DAY)), ar = yearNo(s, fran);
  const tr = nyTro(s, p, d, { id: tron.length + 1, grundare: p.id, gnamn: p.name, t: fran, ar, k });
  tron.push(tr);
  for (const sk of s.troSkalor ?? []) satSkala(s, tr, sk);
  (tr.sk ??= {}).krig = Math.round(rt.krig); // läggningen ur raden
  tr.namn = rt.namn; tr.sym = d.sym; tr.ber = berattelse(s, tr, p);
  const g = GUD_OMR[d.omr], namn = gudNamn(s, d.omr, p), hh = teckenText(k);
  const i = tr.natur < GUD.ande ? pick(s, g.i, 'tro', p) : undefined;
  tr.gudar = [i ? { omr: [d.omr], namn, form: 'ande', i, t: fran, ar, bekr: s.now, ber: gudBer('ande', hh, ar, rt.namn, namn, g.om, i) }
    : { omr: [d.omr], namn, form: 'gud', t: fran, ar, bekr: s.now, ber: gudBer('gud', hh, ar, rt.namn, namn, g.om) }];
  for (const q of folk) { q.tro = tr.id; q.troStyrka = TRO.styrka; }
  return tr;
}
