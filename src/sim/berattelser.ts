import { balans } from './balans';
import { ALDER, ageOf, alive, count, living, log } from './folk';
import { kronika } from './historik';
import { HANDELSER, INTRYCK, IntryckTyp, intryckOm } from './rykten';
import { HOUR, Person, State } from './typer';
import { temperature } from './vader';

// Berättelserna (steg 3.9, "Berättelser" i designdokumentet): texterna om människorna, händelserna och sakerna. Varje
// text är en mall i registret BERATTELSER med många varianter; varianten väljs ur byns frö, personen och tiden (hash),
// aldrig ur spelets slump, så att det levande läget och ikappräkningen blir lika. En variant kan ha ett villkor (om),
// t.ex. personligheten, humöret eller årstiden. {namn}, {binamn}, {skal} osv. fylls i ur fälten.
// Öknamnen och hedersnamnen (steg 3.9.1): när minst hälften av de vuxna har samma starka intryck av någon får hen ett
// namn efter det ("Ask Lögnaren", "Brand den flitige"). Namnet stannar livet ut och finns kvar i minnet efter döden;
// en människa har högst ett, och ett nytt tar bara över om det är mycket starkare.

// Balanstal (regel 8)
export const BERATT = balans('beratt', {
  andel: 0.5, // så stor del av de vuxna (utom hen själv) måste ha samma starka intryck ...
  stark: 0.7, // ... och ett intryck är starkt från den här styrkan (styrka × säkerhet)
  minVuxna: 4, // byn måste ha minst så här många andra vuxna för att ge namn
  byte: 1.5, // ett nytt namn tar över om det är så här många gånger starkare än det gamla
  timmar: 6, // byn ser efter nya namn så här ofta (timmar)
});

// ---------- registren ----------
// en variant: texten, eller texten med ett villkor
export type Variant = string | { t: string; om: (f: Fyllning) => boolean };
export type Fyllning = Record<string, string | number | boolean | undefined>;

// öknamnen och hedersnamnen per intryck: [mannens, kvinnans]. '*' före namnet = det står efter förnamnet utan "den"
interface BinamnDef { namn: [string, string][] }
const BDEF: Record<IntryckTyp, BinamnDef> = {
  valdsam: { namn: [['Knytnäven', 'Knytnäven'], ['den vilde', 'den vilda'], ['Slagskämpen', 'Slagskämpen'], ['den hårde', 'den hårda']] },
  tjuv: { namn: [['Tjuven', 'Tjuven'], ['Långfinger', 'Långfinger'], ['den snatige', 'den snatiga'], ['Räven', 'Räven']] },
  elak: { namn: [['den elake', 'den elaka'], ['Taggen', 'Taggen'], ['den bittre', 'den bittra'], ['Nässlan', 'Nässlan']] },
  logn: { namn: [['Lögnaren', 'Lögnerskan'], ['Silvertunga', 'Silvertunga'], ['den falske', 'den falska'], ['Skrönan', 'Skrönan']] },
  klapare: { namn: [['Klåparen', 'Klåparen'], ['Tummen', 'Tummen'], ['den klumpige', 'den klumpiga'], ['Spillan', 'Spillan']] },
  lat: { namn: [['den late', 'den lata'], ['Sömntuta', 'Sömntuta'], ['Solsittaren', 'Solsitterskan'], ['den tröge', 'den tröga']] },
  fattig: { namn: [['den fattige', 'den fattiga'], ['Tomhand', 'Tomhand'], ['Barfota', 'Barfota'], ['den arme', 'den arma']] },
  generos: { namn: [['den givmilde', 'den givmilda'], ['Öppenhand', 'Öppenhand'], ['den gode', 'den goda'], ['Gåvogivaren', 'Gåvogiverskan']] },
  hjalpsam: { namn: [['Hjälparen', 'Hjälperskan'], ['den gode', 'den goda'], ['Räddaren', 'Räddarinnan'], ['den trofaste', 'den trofasta']] },
  skicklig: { namn: [['Mästaren', 'Mästarinnan'], ['den skicklige', 'den skickliga'], ['Guldhand', 'Guldhand'], ['den kloke', 'den kloka']] },
  flitig: { namn: [['den flitige', 'den flitiga'], ['Myran', 'Myran'], ['den outtröttlige', 'den outtröttliga'], ['Morgonstjärnan', 'Morgonstjärnan']] },
  rik: { namn: [['den rike', 'den rika'], ['Förrådet', 'Förrådet'], ['den välbärgade', 'den välbärgade'], ['Fullkistan', 'Fullkistan']] },
  rattvis: { namn: [['den rättvise', 'den rättvisa'], ['Vågen', 'Vågen'], ['den vise', 'den visa'], ['Domaren', 'Domarinnan']] },
  orattvis: { namn: [['den orättvise', 'den orättvisa'], ['den hårde', 'den hårda'], ['Snedvågen', 'Snedvågen'], ['den stränge', 'den stränga']] },
  stark: { namn: [['den starke', 'den starka'], ['Björnen', 'Björnen'], ['Järnarmen', 'Järnarmen'], ['Eken', 'Eken']] },
  feg: { namn: [['Haren', 'Haren'], ['den rädde', 'den rädda'], ['Darraren', 'Darrerskan'], ['Hönan', 'Hönan']] },
  vargdodare: { namn: [['Vargdödaren', 'Vargdödaren'], ['Vargbane', 'Vargbane'], ['den modige', 'den modiga'], ['Ulvspjutet', 'Ulvspjutet']] },
};
export const BINAMN: Record<IntryckTyp, BinamnDef> = BDEF;

// mallarna: id → varianterna (minst åtta). {namn} = förnamnet, {binamn} = namnet byn gav, {helt} = båda, {skal} = varför
const MDEF = {
  hedersnamn: [
    'Byn har börjat kalla {namn} för {binamn}, för {hen} {skal}.',
    'Sedan {hen} {skal} säger alla {helt}.',
    '{namn} {skal}. Från den dagen hette {hen} {helt}.',
    'Ingen minns vem som sa det först, men nu är {namn} {binamn} för hela byn. {Hen} {skal}.',
    'Vid elden talar man om {namn} som {binamn}. Det var när {hen} {skal}.',
    '{helt}, säger de nu, och {namn} låtsas inte höra det men ler. {Hen} {skal}.',
    'Barnen ropar {binamn} efter {namn}. {Hen} {skal}, och det har de inte glömt.',
    'Så fick {namn} sitt namn: {hen} {skal}, och byn kallar {hen} {helt}.',
    { t: 'Det var en kall tid när {namn} {skal}. Sedan dess heter {hen} {helt}.', om: f => f.kallt === true },
    { t: 'De gamla nickar när de säger {helt}. {Hen} {skal}, och sådant minns man.', om: f => (f.gamla as number) > 0 },
  ],
  oknamn: [
    'Bakom ryggen kallar byn {namn} för {binamn}. {Hen} {skal}.',
    '{namn} {skal}, och nu heter {hen} {helt} i allas mun.',
    'Ingen säger det högt när {namn} hör, men alla vet vem {binamn} är. {Hen} {skal}.',
    'Sedan {hen} {skal} säger man {helt}, och man fnissar när man säger det.',
    'Det är inget fint namn, {binamn}. Men {namn} {skal}.',
    'Vid elden viskar man om {helt}. Det var när {hen} {skal}.',
    'Barnen härmar {namn} och ropar {binamn}. {Hen} {skal}, och det sitter i.',
    'Så fick {namn} sitt namn: {hen} {skal}, och nu är {hen} {helt}.',
    { t: '{namn} blev arg när {hen} hörde att {hen} heter {binamn}. Men {hen} {skal}.', om: f => f.arg === true },
    { t: 'Det var i kylan som {namn} {skal}. Ingen har glömt det: {hen} heter {helt}.', om: f => f.kallt === true },
  ],
} satisfies Record<string, Variant[]>;
export type MallId = keyof typeof MDEF;
export const BERATTELSER: Record<MallId, Variant[]> = MDEF;

// ---------- att välja och fylla i ----------
function hash(a: number, b: number, c: number) {
  let h = Math.imul(a ^ 0x5bd1e995, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 7, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
// väljer en variant ur mallen: bara de vars villkor stämmer, och samma nyckel ger alltid samma text
export function valjVariant(s: State, mall: MallId, nyckel: number, f: Fyllning = {}) {
  const v = BERATTELSER[mall].filter(x => typeof x === 'string' || x.om(f));
  const x = v[Math.floor(hash(s.seed, nyckel, Math.round(s.now / HOUR)) * v.length)];
  return typeof x === 'string' ? x : x.t;
}
export function fyll(text: string, f: Fyllning) {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = f[k] ?? f[k.toLowerCase()];
    const t = v === undefined ? '' : String(v);
    return k[0] === k[0].toUpperCase() && k[0] !== k[0].toLowerCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  });
}
export const berattelse = (s: State, mall: MallId, nyckel: number, f: Fyllning = {}) => fyll(valjVariant(s, mall, nyckel, f), f);

// ---------- öknamnen och hedersnamnen (steg 3.9.1) ----------
export interface Binamn { k: IntryckTyp; namn: string; v: number; t: number; skal?: string }
const hen = (p: Person) => p.sex === 'm' ? 'han' : 'hon';
// namnet efter förnamnet: "Ask Lögnaren", "Brand den flitige"
export const heltNamn = (p: Person) => p.binamn ? `${p.name} ${p.binamn.namn}` : p.name;
export const arHeder = (b: Binamn) => INTRYCK[b.k].tecken > 0;
// varför: det starkaste beviset någon i byn har (utan namnet först), annars intryckets ord
function skalTill(s: State, p: Person, k: IntryckTyp) {
  let bast: { t: string; v: number } | undefined;
  for (const q of living(s)) {
    const e = intryckOm(q, p.id, k);
    for (const b of e?.bev ?? []) {
      const v = HANDELSER[b.h].vikt + (b.sett ? 0.1 : 0);
      if (!bast || v > bast.v) bast = { t: HANDELSER[b.h].text.replace('{om}', b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något'), v };
    }
  }
  return bast?.t ?? `var så ${INTRYCK[k].namn}`;
}
// var BERATT.timmar timme: hur många av de andra vuxna som har samma starka intryck av var och en
export function stepBerattelser(s: State) {
  if (Math.round(s.now / HOUR) % BERATT.timmar) return;
  const vuxna = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
  if (vuxna.length - 1 < BERATT.minVuxna) return;
  for (const p of living(s)) {
    const andra = vuxna.filter(q => q !== p), m = new Map<IntryckTyp, { n: number; v: number }>();
    for (const q of andra) for (const e of q.intryck ?? []) {
      if (e.om !== p.id || e.v * e.c < BERATT.stark) continue;
      const x = m.get(e.k) ?? { n: 0, v: 0 }; x.n++; x.v += e.v * e.c; m.set(e.k, x);
    }
    let bast: [IntryckTyp, number] | undefined;
    for (const [k, x] of m) if (x.n >= andra.length * BERATT.andel && (!bast || x.v > bast[1])) bast = [k, x.v];
    if (!bast) continue;
    const [k, v] = bast, gammalt = p.binamn;
    if (gammalt && (gammalt.k === k ? (gammalt.v = Math.max(gammalt.v, v), true) : v < gammalt.v * BERATT.byte)) continue;
    gebinamn(s, p, k, v);
  }
}
function gebinamn(s: State, p: Person, k: IntryckTyp, v: number) {
  const val = BINAMN[k].namn, i = Math.floor(hash(s.seed, p.id, val.length + k.length) * val.length);
  const namnet = val[i][p.sex === 'm' ? 0 : 1];
  const skal = skalTill(s, p, k), fore = p.binamn;
  p.binamn = { k, namn: namnet, v, t: s.now, skal };
  const heder = INTRYCK[k].tecken > 0;
  const f: Fyllning = { namn: p.name, binamn: namnet, helt: heltNamn(p), hen: hen(p), skal, kallt: temperature(s) < 0, gamla: living(s).filter(q => ageOf(q, s.now) >= ALDER.gammal).length, arg: !heder && hash(s.seed, p.id, 3) < 0.5 };
  const text = berattelse(s, heder ? 'hedersnamn' : 'oknamn', p.id, f);
  log(s, `${heder ? '🏅' : '🗯️'} ${text}`, 'rel', [p.id]);
  kronika(s, text);
  p.fame.push(`Kallades ${heltNamn(p)}${fore ? ` (förut ${fore.namn})` : ''}`);
  count(s, 'binamn'); count(s, heder ? 'hedersnamn' : 'oknamn');
}
// för personrutan: symbolen (heder eller skam) och förklaringen
export function binamnInfo(p: Person) {
  const b = p.binamn;
  if (!b) return undefined;
  return { namn: b.namn, sym: arHeder(b) ? '🏅' : '🗯️', heder: arHeder(b), varfor: `${p.name} ${b.skal ?? `var så ${INTRYCK[b.k].namn}`}`, intryck: INTRYCK[b.k].namn, alive: alive(p) };
}
