import { balans } from './balans';
import { ALDER, ageOf, alive, byId, count, living, log } from './folk';
import { ACTS, Act } from './handlingar';
import { kronika } from './historik';
import { HANDELSER, INTRYCK, IntryckTyp, intryckOm, samlatIntryck } from './rykten';
import { sakNamn } from './saker';
import { HOUR, Person, STATS, Stat, State, Upplevelse } from './typer';
import { upplevelseText } from './uppvaxt';
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
  drag: 4, // beskrivningen (steg 3.9.2) nämner en egenskap som ligger så här långt från mitten (10) eller mer
  smak: 0.4, // ... och en smak (tycke, -1 till 1) som är så här stark eller starkare
  rykte: 1.5, // ... och vad byn tycker om hen, när intrycken tillsammans är så här starka
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
  // personen (steg 3.9.2). {alder} = 'ung kvinna', 'gammal man' osv., {drag1} och {drag2} = de egenskaper som sticker ut
  besk_drag2: [
    '{namn} är en {alder}, {drag1} och {drag2}.',
    '{namn} är {drag1} och {drag2}, säger de som känner {honom}.',
    'En {alder}, {drag1} men också {drag2}: så är {namn}.',
    'Den som möter {namn} ser en {alder} som är {drag1} och {drag2}.',
    '{namn} föddes {drag1}, och {drag2} har {hen} alltid varit.',
    'Man vet var man har {namn}: {drag1} och {drag2}.',
    '{namn}, en {alder}, är mer {drag1} än de flesta och lika {drag2}.',
    'Om {namn} säger man två saker: {hen} är {drag1}, och {hen} är {drag2}.',
    { t: '{namn} är bara ett barn men redan {drag1} och {drag2}.', om: f => f.ung === true },
    { t: 'Åren har gjort {namn} till en {alder}, {drag1} och {drag2}.', om: f => f.gammal === true },
  ],
  besk_drag1: [
    '{namn} är en {alder}, {drag1} som få.',
    '{namn} är {drag1}, mer än något annat.',
    'Det första man märker hos {namn} är att {hen} är {drag1}.',
    'En {alder} som är {drag1}: det är {namn}.',
    '{namn} har alltid varit {drag1}.',
    'Alla vet att {namn} är {drag1}.',
    'Om {namn} säger man mest att {hen} är {drag1}.',
    '{namn}, en {alder}, är {drag1} ut i fingerspetsarna.',
    { t: '{namn} är bara ett barn, men redan {drag1}.', om: f => f.ung === true },
    { t: '{namn} är en {alder} och har varit {drag1} i alla sina år.', om: f => f.gammal === true },
  ],
  besk_drag0: [
    '{namn} är en {alder} som inte sticker ut.',
    '{namn} är en {alder} som de flesta andra.',
    'Det finns inte mycket att säga om {namn}: en {alder} bland andra.',
    '{namn} är en {alder}, varken det ena eller det andra.',
    'En {alder} som går sin egen stilla väg: det är {namn}.',
    '{namn} är en vanlig {alder}, och kanske trivs {hen} med det.',
    'Man lägger inte alltid märke till {namn}, en {alder} som andra.',
    '{namn} är en {alder} utan stora gåvor och utan stora fel.',
  ],
  // {binamn} = öknamnet eller hedersnamnet, {yrke} = yrket, {rykte} = det byn mest ser hen som
  besk_binamn: [
    'Byn kallar {honom} {binamn}.',
    'I byn heter {hen} {binamn}, och det vet alla varför.',
    'De flesta säger {binamn} när de talar om {honom}.',
    'Namnet {binamn} har följt {honom} länge.',
    '{binamn}, säger man, och alla vet vem det är.',
    'Barnen kallar {honom} {binamn} och vet inte ens vad {hen} egentligen heter.',
    'Byn gav {honom} namnet {binamn}, och det har fastnat.',
    'Vid elden heter {hen} {binamn}.',
  ],
  besk_yrkeRykte: [
    '{Hen} arbetar mest som {yrke}, och byn ser {honom} som {rykte}.',
    'Som {yrke} är {hen} känd i byn, och de flesta tycker att {hen} är {rykte}.',
    '{Hen} är {yrke} till sin syssla, och {rykte} i byns ögon.',
    'Byn känner {honom} som {yrke}, och som {rykte}.',
    'De andra vet två saker om {honom}: {hen} är {yrke}, och {hen} är {rykte}.',
    'Om dagarna är {hen} {yrke}. Vid elden säger man att {hen} är {rykte}.',
    'En {yrke} är {hen}, och {rykte} säger byn.',
    '{Hen} går som {yrke}, och ryktet säger att {hen} är {rykte}.',
  ],
  besk_yrke: [
    '{Hen} arbetar mest som {yrke}.',
    'Om dagarna är {hen} {yrke}.',
    'Byn känner {honom} som {yrke}.',
    'Det mesta av sin tid är {hen} {yrke}.',
    '{Hen} är {yrke} till sin syssla.',
    'Som {yrke} gör {hen} sitt för byn.',
    'Fråga vem som helst: {hen} är {yrke}.',
    'Ett liv som {yrke} är vad {hen} lever.',
  ],
  besk_rykte: [
    'Byn ser {honom} som {rykte}.',
    'De flesta i byn tycker att {hen} är {rykte}.',
    'Ryktet säger att {hen} är {rykte}.',
    'Vid elden säger man att {hen} är {rykte}.',
    'I byns ögon är {hen} {rykte}.',
    'Den som frågar i byn får höra att {hen} är {rykte}.',
    '{rykte}, säger man om {honom}.',
    'Byn har bestämt sig: {hen} är {rykte}.',
  ],
  // {partner}, {van} = bästa vännen, {fiende} = ärkefienden
  besk_partnerVan: [
    '{Hen} lever med {partner}, och {van} är {hans} bästa vän.',
    '{partner} är {hans} partner och {van} {hans} närmaste vän.',
    'Hemma finns {partner}; utanför huset står {van} {honom} närmast.',
    '{Hen} delar sitt liv med {partner} och sina hemligheter med {van}.',
    'Om kvällarna sitter {hen} hos {partner}, om dagarna går {hen} ofta med {van}.',
    'Två står {honom} nära: {partner}, som {hen} lever med, och vännen {van}.',
    '{Hen} har {partner} och {hen} har {van}, och mer behöver {hen} inte.',
    '{partner} är {hans} partner. {van} är den {hen} går till när något tynger.',
  ],
  besk_partner: [
    '{Hen} lever med {partner}.',
    '{partner} är {hans} partner.',
    'Hemma finns {partner}, som {hen} delar allt med.',
    '{Hen} och {partner} hör ihop.',
    '{Hen} delar säng och bröd med {partner}.',
    'Den som står {honom} närmast är {partner}.',
    'Om kvällarna sitter {hen} hos {partner}.',
    '{partner} och {hen} har varandra.',
  ],
  besk_van: [
    '{van} är {hans} bästa vän.',
    'Den som står {honom} närmast är vännen {van}.',
    '{Hen} går ofta med {van}, {hans} bästa vän.',
    'Med {van} delar {hen} sina hemligheter.',
    'När något tynger går {hen} till {van}.',
    '{van} och {hen} är som syskon.',
    '{Hen} litar mest av alla på {van}.',
    'Var {van} är, där är ofta {hen} också.',
  ],
  besk_fiende: [
    '{fiende} kan {hen} inte med.',
    'Med {fiende} har {hen} inget gott att dela.',
    '{fiende} är den {hen} helst går en omväg kring.',
    'Mellan {honom} och {fiende} är det ont blod.',
    '{Hen} och {fiende} kommer aldrig att bli vänner.',
    'Nämn {fiende} och {hen} mörknar.',
    '{fiende} är {hans} ovän sedan länge.',
    'Det är kallt mellan {honom} och {fiende}.',
  ],
  // smaken: {vad} = arbetet (det står att hen gör det, 'samlar bär och rötter') eller maten
  besk_arbeteGilla: [
    '{Hen} trivs bäst när {hen} {vad}.',
    'Ingenting gör {honom} gladare än när {hen} {vad}.',
    'Man hör {honom} vissla när {hen} {vad}.',
    'När {hen} {vad} glömmer {hen} tiden.',
    'Det är när {hen} {vad} som {hen} är sig själv.',
    '{Hen} är som lyckligast när {hen} {vad}.',
    'Ge {honom} en dag då {hen} {vad}, och {hen} klagar inte.',
    'De säger att {hen} ler när {hen} {vad}.',
  ],
  besk_arbeteOgilla: [
    '{Hen} suckar tungt när {hen} {vad}.',
    'Inget är värre för {honom} än när {hen} {vad}.',
    'Man ser på {honom} att {hen} inte trivs när {hen} {vad}.',
    'När {hen} {vad} muttrar {hen} för sig själv.',
    '{Hen} drar benen efter sig när {hen} {vad}.',
    'Det är tungt för {honom} när {hen} {vad}.',
    '{Hen} ser aldrig så sur ut som när {hen} {vad}.',
    'Det tar emot för {honom} varje gång {hen} {vad}.',
  ],
  besk_matGilla: [
    '{Hen} äter helst {vad}.',
    'Inget smakar {honom} bättre än {vad}.',
    'Finns det {vad} i förrådet blir {hen} glad.',
    '{Hen} tar alltid lite extra när det finns {vad}.',
    'Det sägs att {hen} kan gå långt för {vad}.',
    '{vad} är det bästa {hen} vet.',
    '{Hen} har alltid tyckt om {vad}.',
    'Ge {honom} {vad}, och {hen} är nöjd.',
  ],
  besk_matOgilla: [
    '{Hen} rör helst inte {vad}.',
    '{vad} äter {hen} bara när inget annat finns.',
    '{Hen} rynkar på näsan åt {vad}.',
    'Ingen får {honom} att tycka om {vad}.',
    '{Hen} lämnar {vad} till de andra.',
    'Det sägs att {hen} hellre går hungrig än äter {vad}.',
    '{vad} har {hen} aldrig tyckt om.',
    '{Hen} skjuter undan {vad} när det kommer fram.',
  ],
  // det starkaste minnet: {minne} = upplevelsen ('var nära att svälta ihjäl'), {vid} = åldern då
  besk_minne: [
    'När {hen} var {vid} år {minne}, och det har {hen} aldrig glömt.',
    '{Hen} bär med sig ett minne från när {hen} var {vid}: {hen} {minne}.',
    'Det är länge sedan, men {hen} {minne} när {hen} var {vid}, och det märks än.',
    'Något hände när {hen} var {vid} år: {hen} {minne}. Det gjorde {honom} till den {hen} är.',
    'Ibland tänker {hen} på när {hen} var {vid}: {hen} {minne}.',
    'Det som formade {honom} mest var när {hen} {minne}, {vid} år gammal.',
    'Ingen som var där har glömt när {hen} {minne}. {Hen} var {vid} år.',
    '{Hen} talar sällan om det, men {hen} {minne} när {hen} var {vid}.',
  ],
  besk_inget: [
    'Mer än så vet byn inte om {honom} än.',
    '{Hen} har inte hunnit bli känd för något än.',
    'Vad {hen} ska bli känd för vet ingen än.',
    'Livet har inte hunnit sätta sina spår i {honom} än.',
    '{Hen} har ännu inte gjort något som byn minns.',
    'Ännu har inget hänt som byn berättar om.',
    'Det mesta i {hans} liv har inte hänt än.',
    'Ingen har ännu något att berätta om {honom}.',
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
// t: tiden i timmar (en ny text varje timme), eller 0 för en text som står kvar (beskrivningen av en person)
export function valjVariant(s: State, mall: MallId, nyckel: number, f: Fyllning = {}, t = Math.round(s.now / HOUR)) {
  const v = BERATTELSER[mall].filter(x => typeof x === 'string' || x.om(f));
  const x = v[Math.floor(hash(s.seed, nyckel, t) * v.length)];
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

// ---------- personen (steg 3.9.2) ----------
// orden för en egenskap som sticker ut: [hög, låg]
const DRAG: Record<Stat, [string, string]> = {
  styrka: ['stark', 'klen'], uthallighet: ['seg', 'snart trött'], intelligens: ['klok', 'trög i tanken'],
  nyfikenhet: ['nyfiken på allt', 'rädd för det nya'], karisma: ['talför', 'tystlåten'], skonhet: ['vacker', 'ful'],
  flit: ['arbetsam', 'bekväm av sig'], empati: ['varmhjärtad', 'kall'], mod: ['modig', 'rädd av sig'],
  minne: ['minnesgod', 'glömsk'], smidighet: ['vig', 'klumpig'], aggression: ['hetlevrad', 'fridsam'],
};
const alderOrd = (a: number, sex: 'm' | 'k') => a < ALDER.vuxen ? (sex === 'm' ? 'pojke' : 'flicka') : a < 25 ? (sex === 'm' ? 'ung man' : 'ung kvinna') : a < ALDER.gammal ? (sex === 'm' ? 'man' : 'kvinna') : (sex === 'm' ? 'gammal man' : 'gammal kvinna');
const liten = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
// de egenskaper som skiljer sig mest från det vanliga (10), högst två, och bara de som sticker ut (minst BERATT.drag)
function personDrag(p: Person) {
  return STATS.map(k => [k, p.pot[k] - 10] as const).filter(([, d]) => Math.abs(d) >= BERATT.drag)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2).map(([k, d]) => DRAG[k][d > 0 ? 0 : 1]);
}
// smaken som sticker ut mest: [text, tycke] eller inget
function smakText(p: Person) {
  let bast: [string, number] | undefined;
  for (const [k, v] of Object.entries(p.smak ?? {})) if (Math.abs(v) >= BERATT.smak && (!bast || Math.abs(v) > Math.abs(bast[1]))) bast = [k, v];
  if (!bast) return undefined;
  const [k, v] = bast, slag = k.slice(0, 2), vad = k.slice(2);
  if (slag === 'a:' && ACTS[vad as Act]) return { slag: 'arbete', vad: liten(ACTS[vad as Act].namn), v };
  if (slag === 'm:') return { slag: 'mat', vad: liten(sakNamn(vad)), v };
  return undefined;
}
// upplevelsen som gjorde mest med hen
function starkastUpp(p: Person) {
  let bast: Upplevelse | undefined, bv = 0;
  for (const u of p.upp ?? []) { if (u.k === 'skilsmassa' || u.k === 'gral') continue; const v = Object.values(u.e).reduce((a, x) => a + Math.abs(x ?? 0), 0); if (v > bv) { bv = v; bast = u; } }
  return bast;
}
// 2–4 meningar om vem hen är: egenskaperna och åldern, yrket och vad byn tycker, de viktigaste relationerna och smaken
// eller minnet. Texten väljs ur personens id, så den är densamma tills något i den ändras
export function beskrivning(s: State, p: Person) {
  const a = ageOf(p, s.now), drag = personDrag(p), Hen = hen(p);
  const f: Fyllning = { namn: p.name, hen: Hen, honom: p.sex === 'm' ? 'honom' : 'henne', hans: p.sex === 'm' ? 'hans' : 'hennes', alder: alderOrd(a, p.sex), drag1: drag[0], drag2: drag[1], ung: a < ALDER.vuxen, gammal: a >= ALDER.gammal };
  const ut: string[] = [];
  const nyck = (i: number) => p.id * 8 + i;
  ut.push(fyll(valjVariant(s, drag.length >= 2 ? 'besk_drag2' : drag.length ? 'besk_drag1' : 'besk_drag0', nyck(0), f, 0), f));
  // yrket och vad byn tycker
  const by = samlatIntryck(s, p.id)[0];
  f.yrke = p.tag && p.tag !== 'Dagdrivare' ? liten(p.tag) : undefined;
  f.rykte = by && by[1] >= BERATT.rykte ? INTRYCK[by[0]].namn : undefined;
  f.gott = by ? INTRYCK[by[0]].tecken > 0 : undefined;
  f.binamn = p.binamn?.namn;
  if (f.binamn) ut.push(fyll(valjVariant(s, 'besk_binamn', nyck(1), f, 0), f));
  else if (f.yrke && f.rykte) ut.push(fyll(valjVariant(s, 'besk_yrkeRykte', nyck(1), f, 0), f));
  else if (f.yrke) ut.push(fyll(valjVariant(s, 'besk_yrke', nyck(1), f, 0), f));
  else if (f.rykte) ut.push(fyll(valjVariant(s, 'besk_rykte', nyck(1), f, 0), f));
  // relationerna: partnern, bästa vännen, ärkefienden, mentorn
  const namnPa = (id?: number) => { const q = id !== undefined ? byId(s, id) : undefined; return q ? q.name : undefined; };
  f.partner = alive(p) ? namnPa(p.partner) : undefined; f.van = namnPa(p.bast); f.fiende = namnPa(p.arke); f.mentor = namnPa(p.mentor);
  const rel = f.partner && f.van ? 'besk_partnerVan' : f.partner ? 'besk_partner' : f.van ? 'besk_van' : undefined;
  if (rel) ut.push(fyll(valjVariant(s, rel, nyck(2), f, 0), f));
  if (f.fiende) ut.push(fyll(valjVariant(s, 'besk_fiende', nyck(3), f, 0), f));
  // smaken, annars det starkaste minnet
  const sm = smakText(p), u = starkastUpp(p);
  if (ut.length < 4 && sm) { f.vad = sm.vad; ut.push(fyll(valjVariant(s, `besk_${sm.slag}${sm.v > 0 ? 'Gilla' : 'Ogilla'}` as MallId, nyck(4), f, 0), f)); }
  if (ut.length < 4 && u) { f.minne = liten(upplevelseText(u)); f.vid = u.a; ut.push(fyll(valjVariant(s, 'besk_minne', nyck(5), f, 0), f)); }
  if (ut.length < 2) ut.push(fyll(valjVariant(s, 'besk_inget', nyck(6), f, 0), f));
  return ut.slice(0, 4).join(' ');
}
