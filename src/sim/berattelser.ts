import { balans } from './balans';
import { ALDER, ageOf, alive, byId, count, living, log } from './folk';
import { ACTS, Act, slagIkon } from './handlingar';
import { TAGS } from './seder';
import { kronika } from './historik';
import { HANDELSER, INTRYCK, IntryckTyp, intryckOm, samlatIntryck } from './rykten';
import { SAKER, sakNamn } from './saker';
import { moodOf } from './humor';
import { HOUR, Person, STATS, Stat, State, Upplevelse } from './typer';
import { upplevelseText } from './uppvaxt';
import { isLight, kalender } from './tid';
import { temperature, vaderNu } from './vader';

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
  // mästerverken och de usla sakerna (steg 3.9.4)
  glad: 0.7, // göraren var glad med humöret så här högt ...
  ledsen: 0.35, // ... och nedstämd så här lågt
  nara: 5, // den som var närmast inom så här många rutor var med
  sorgDygn: 5, // en nära släkting som dog för högst så här många dygn sedan: göraren sörjde
  barnDygn: 3, // ett barn som föddes för högst så här många dygn sedan: göraren hade fått barn
  inskr: 0.6, // så stor del av mästerverken får en tillägnan, när det finns någon att tillägna dem
  dimma: 0.5, // dimman räknas från den här tätheten
  // samtalens ämnen (steg 3.9.5)
  dodDygn: 2, // man pratar om den som dog för högst så här många dygn sedan
  kallt: -5, // ... om kylan från den här temperaturen (°C) och neråt
  varmt: 25, // ... om värmen från den här och uppåt
  hungrig: 0.4, // ... och om maten när mättnaden är under den här
  pratTim: 2, // personrutan visar det senaste samtalet i så här många timmar
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
  // krönikan (steg 3.9.3). Alla har {arstid} ('istiden', 'våren' …), och villkoren kallt, sno, regn, natt och blast
  k_dog: [
    '{helt} dog {orsak}, {alder} år gammal.',
    'Byn sörjde när {helt} dog {orsak}. {Hen} blev {alder} år.',
    '{alder} år fick {namn} leva innan {hen} dog {orsak}.',
    'Det var {arstid} när {helt} dog {orsak}, {alder} år gammal.',
    '{helt} är borta. {Hen} dog {orsak} vid {alder} års ålder.',
    'En tystnad föll över byn: {helt} dog {orsak}, {alder} år gammal.',
    'Elden brann lågt den kvällen. {helt} hade dött {orsak}, {alder} år gammal.',
    '{helt} dog {orsak}. {Hen} hann bli {alder} år.',
    { t: '{partner} vakade hos {helt} till slutet. {Hen} dog {orsak}, {alder} år gammal.', om: f => !!f.partner },
    { t: '{helt} dog {orsak}, {alder} år gammal, och lämnade {barn} barn efter sig.', om: f => (f.barn as number) > 1 },
    { t: 'Snön föll när {helt} dog {orsak}. {Hen} blev {alder} år.', om: f => f.sno === true },
    { t: 'Mitt i natten dog {helt} {orsak}, {alder} år gammal.', om: f => f.natt === true },
  ],
  k_fodd: [
    '{namn} föddes, {barnet} till {foraldrar}.',
    'Ett nytt barn kom till byn: {namn}, {barnet} till {foraldrar}.',
    'Ett skrik hördes i byn: {namn} hade fötts, {barnet} till {foraldrar}.',
    '{namn} föddes. {mor} höll sitt barn i famnen hela natten.',
    'Byn fick en ny invånare, {namn}, {barnet} till {foraldrar}.',
    'Det var {arstid} när {namn} föddes, {barnet} till {foraldrar}.',
    '{mor} födde {namn}, och byn samlades för att se barnet.',
    'Så kom {namn} till världen, {barnet} till {foraldrar}.',
    { t: 'Mitt i natten föddes {namn}, {barnet} till {foraldrar}.', om: f => f.natt === true },
    { t: 'I kylan föddes {namn}, {barnet} till {foraldrar}, och alla samlades kring elden.', om: f => f.kallt === true },
    { t: '{foraldrar} fick ett barn till, {namn}.', om: f => (f.syskon as number) > 0 },
  ],
  k_forstaEld: [
    '{namn} tände byns första eld.',
    'Det var {namn} som fick gnistan att ta i torrt gräs. Byn hade fått sin första eld.',
    'Byn hade frusit länge. Sedan tände {namn} den första elden, och alla samlades kring den.',
    'Röken steg för första gången över byn: {namn} hade tänt en eld.',
    '{namn} slog sten mot sten tills det tog eld. Det var byns första eld.',
    'Ingen glömmer när {namn} tände byns första eld.',
    'Det var {arstid} när {namn} tände byns första eld.',
    '{namn} blåste liv i den första glöden, och byn fick sin första eld.',
    { t: 'Mitt i natten tände {namn} byns första eld, och mörkret drog sig undan.', om: f => f.natt === true },
    { t: 'I kylan tände {namn} byns första eld, och ingen behövde frysa den natten.', om: f => f.kallt === true },
  ],
  k_uppfann: [
    '{namn} uppfann {teknik}.',
    'Ingen hade gjort det förut: {namn} kom på {teknik}.',
    'Det var {namn} som först förstod sig på {teknik}.',
    '{namn} satt länge och funderade. Sedan kom {hen} på {teknik}.',
    'Byn fick {teknik}, och det var {namn} som kom på det.',
    'Det var {arstid} när {namn} kom på {teknik}.',
    '{namn} prövade och misslyckades, prövade igen, och till sist hade {hen} uppfunnit {teknik}.',
    'Alla kom för att se när {namn} visade {teknik} för första gången.',
    { t: 'Medan regnet föll kom {namn} på {teknik}.', om: f => f.regn === true },
    { t: 'En kall dag kom {namn} på {teknik}.', om: f => f.kallt === true },
  ],
  k_husKlar: [
    '{hus} blev färdigt.',
    '{hus} stod färdigt, och {namn} lade den sista biten.',
    'Det sista lades på plats av {namn}: {hus} var färdigt.',
    'Efter mycket arbete stod {hus} färdigt.',
    'Det var {arstid} när {hus} blev färdigt.',
    'Byn samlades och såg på när {namn} gjorde klart {hus}.',
    '{namn} torkade svetten ur pannan. {hus} var färdigt.',
    'Nu stod {hus} färdigt, och byn var lite större.',
    { t: 'Precis före kylan blev {hus} färdigt.', om: f => f.kallt === true },
    { t: 'I regnet gjorde {namn} klart {hus}, och nu kunde man sitta torrt.', om: f => f.regn === true },
  ],
  k_forstaLedare: [
    '{namn} blev byns första ledare ({titel}).',
    'Byn hade aldrig haft någon som bestämde. Nu blev {namn} den första, {titel}.',
    'De flesta lyssnade redan på {namn}, och nu blev {hen} byns första ledare, {titel}.',
    'Det var {arstid} när byn fick sin första ledare: {namn}, {titel}.',
    'Vid elden bestämdes det: {namn} skulle leda byn, den första som {titel}.',
    'Från den dagen ledde {namn} byn, den första som gjorde det. Man kallade {honom} {titel}.',
    'Byn valde {namn} till sin första ledare, {titel}, och började undra om alla är lika mycket värda.',
    'Den första som ledde byn var {namn}, {titel}.',
    { t: 'En kall tid behövde byn någon som bestämde. Det blev {namn}, byns första ledare, {titel}.', om: f => f.kallt === true },
  ],
  k_ledare: [
    '{namn} blev byns ledare ({titel}).',
    'Byn fick en ny ledare: {namn}, {titel}.',
    'Nu var det {namn} som ledde byn, {titel}.',
    'Det var {arstid} när {namn} blev byns ledare, {titel}.',
    'De flesta lyssnade på {namn}, och {hen} blev byns ledare, {titel}.',
    'Byn valde {namn}, {titel}, att leda den.',
    'Vid elden bestämdes det att {namn} skulle leda byn, {titel}.',
    'Från den dagen ledde {namn} byn. Man kallade {honom} {titel}.',
  ],
  k_utvisad: [
    '{ledare} drev ut {namn} ur byn {varfor}.',
    '{namn} fick lämna byn. {ledare} drev ut {honom} {varfor}.',
    'Det var {arstid} när {ledare} drev ut {namn} ur byn {varfor}.',
    'Ingen talade för {namn} när {ledare} drev ut {honom} {varfor}.',
    '{namn} gick ensam ut ur byn. {ledare} hade drivit ut {honom} {varfor}.',
    '{ledare} pekade mot skogen, och {namn} fick gå {varfor}.',
    'Byn såg på när {ledare} drev ut {namn} {varfor}.',
    'Så slutade tiden i byn för {namn}: {ledare} drev ut {honom} {varfor}.',
    { t: 'I kylan fick {namn} lämna byn. {ledare} drev ut {honom} {varfor}.', om: f => f.kallt === true },
    { t: 'I snön syntes spåren efter {namn} länge sedan {ledare} drivit ut {honom} {varfor}.', om: f => f.sno === true },
  ],
  k_skadad: [
    '{namn} skadades svårt i ett slagsmål med {mot}.',
    'Det blev slagsmål mellan {namn} och {mot}, och {namn} skadades svårt.',
    '{namn} och {mot} kom i luven på varandra. Det slutade med att {namn} låg svårt skadad.',
    'Det var {arstid} när {namn} skadades svårt i ett slagsmål med {mot}.',
    'Ingen kunde stoppa slagsmålet mellan {namn} och {mot} förrän {namn} låg svårt skadad.',
    'Ord blev slag, och {namn} skadades svårt av {mot}.',
    'Byn talade länge om slagsmålet där {mot} skadade {namn} svårt.',
    '{namn} bar länge märkena efter slagsmålet med {mot}.',
    { t: 'Mitt i natten slogs {namn} och {mot}, och {namn} skadades svårt.', om: f => f.natt === true },
    { t: 'I snön syntes blodet efter slagsmålet där {mot} skadade {namn} svårt.', om: f => f.sno === true },
  ],
  k_skadadLek: [
    '{namn} skadades svårt när barnen brottades med {mot}.',
    'Leken gick för långt: {namn} skadades svårt när {hen} brottades med {mot}.',
    'Det började som en lek mellan {namn} och {mot} men slutade med att {namn} skadades svårt.',
    'Det var {arstid} när {namn} skadades svårt i en lek med {mot}.',
    'De vuxna kom springande när {namn} skadades svårt i leken med {mot}.',
    'Barnen brottades, och {namn} skadades svårt av {mot}.',
    'Ingen hade trott att leken mellan {namn} och {mot} kunde gå så illa: {namn} skadades svårt.',
    '{namn} skadades svårt när {hen} lekte med {mot}, och byn blev rädd.',
  ],
  k_forstaVarg: [
    '{namn} dödade byns första varg.',
    'Det var {namn} som fällde byns första varg.',
    'Byn hade länge varit rädd för vargarna. Sedan dödade {namn} den första.',
    'Det var {arstid} när {namn} dödade byns första varg.',
    'Alla kom ut för att se vargen som {namn} hade fällt, byns första.',
    '{namn} stod över den döda vargen. Det var den första byn fällt.',
    'Ingen glömmer när {namn} dödade byns första varg.',
    'Med en väl riktad stöt dödade {namn} byns första varg.',
    { t: 'I snön dödade {namn} byns första varg.', om: f => f.sno === true },
    { t: 'Mitt i natten dödade {namn} byns första varg.', om: f => f.natt === true },
  ],
  k_vargjakt: [
    '{folk} gick på vargjakt mot {vargar} och fällde {fallde}.{svara}',
    'Det var {arstid} när {folk} gick på vargjakt mot {vargar}. De fällde {fallde}.{svara}',
    '{folk} tog sina spjut och gick mot {vargar}. De fällde {fallde}.{svara}',
    'Byn skickade {folk} på vargjakt mot {vargar}, och de fällde {fallde}.{svara}',
    'Med spjuten i händerna gick {folk} mot {vargar}. De fällde {fallde}.{svara}',
    '{folk} följde spåren till {vargar} och fällde {fallde}.{svara}',
    'Det var en vargjakt byn talade om länge: {folk} mot {vargar}, och de fällde {fallde}.{svara}',
    '{folk} gick ut för att göra slut på {vargar}, och fällde {fallde}.{svara}',
    { t: 'I snön följde {folk} spåren till {vargar} på vargjakt, och de fällde {fallde}.{svara}', om: f => f.sno === true },
    { t: 'I blåsten gick {folk} på vargjakt mot {vargar}, och de fällde {fallde}.{svara}', om: f => f.blast === true },
  ],
  k_vargSprang: [
    '{namn} gick på vargjakt{med}, men vargarna sprang innan de hann fram.',
    'Vargarna var borta innan {namn}{med} hann fram. Vargjakten blev ingenting.',
    '{namn} gick på vargjakt{med}, men vargarna hörde dem och sprang.',
    'Det var {arstid} när {namn} gick på vargjakt{med}. Vargarna sprang innan de hann fram.',
    'Vargjakten slutade innan den börjat: vargarna sprang när {namn}{med} kom.',
    '{namn} gick på vargjakt{med}, men såg bara vargarnas ryggar.',
    'Vargarna var för snabba för {namn}{med} på vargjakten.',
    'Ingen varg föll den dagen. {namn} gick på vargjakt{med}, men vargarna sprang.',
    { t: 'I snön syntes vargarnas spår, men de sprang innan {namn}{med} på vargjakten hann fram.', om: f => f.sno === true },
  ],
  k_vargAnfall: [
    '{svara} skadades svårt när vargar anföll.',
    'Vargarna anföll, och {svara} skadades svårt.',
    'Det var {arstid} när vargar anföll och {svara} skadades svårt.',
    'Ingen hann undan när vargarna kom: {svara} skadades svårt.',
    'Vargarnas tänder fick tag, och {svara} skadades svårt.',
    'Byn kommer ihåg dagen då vargarna anföll och {svara} skadades svårt.',
    'Vargarna kom ur skogen, och {svara} skadades svårt.',
    '{svara} skadades svårt när vargar anföll, och byn blev rädd.',
    { t: 'Mitt i natten anföll vargar, och {svara} skadades svårt.', om: f => f.natt === true },
  ],
  k_atergrundad: [
    '{namn} grundade byn på nytt.',
    'Byn hade stått tom. Sedan kom {namn} och grundade den på nytt.',
    '{namn} hittade de övergivna husen och stannade. Byn levde igen.',
    'Det var {arstid} när {namn} grundade byn på nytt.',
    'Ingen bodde kvar, men {namn} kom vandrande och grundade byn på nytt.',
    'I askan efter den gamla byn tände {namn} en ny eld och grundade byn på nytt.',
    'Byn var tom tills {namn} kom och grundade den på nytt.',
    '{namn} fann en övergiven boplats och gjorde den till sin. Byn grundades på nytt.',
    { t: 'I kylan hittade {namn} den övergivna boplatsen och grundade byn på nytt.', om: f => f.kallt === true },
  ],
  // mästerverken och de usla sakerna (steg 3.9.4). {saken} = sakens namn i bestämd form, {den} = den/det/de, {pa} = "på våren" osv.
  m_gjord: [
    '{namn} gjorde {saken} {pa}{vader}, och det blev ett mästerverk.',
    'Det var {arstid} när {namn} gjorde {saken}{vader}. {Den} blev bättre än något {hen} gjort förut.',
    '{Saken} gjordes av {namn} {pa}{vader}. Den som håller i {den} märker genast att {den} är något utöver det vanliga.',
    'När {namn} gjorde {saken} {pa} tog {hen} god tid på sig med varje del, och det syns.',
    '{namn} lade allt {hen} kunde i {saken}. Det var {arstid}{vader}.',
    'Ingen i byn hade sett något liknande när {namn} visade upp {saken} {pa}.',
    '{Saken} gjordes {pa}{vader} av {namn}, som genast förstod att {den} blev något särskilt.',
    'Det tog {namn} tid att göra {saken} {pa}, men när {den} var klar ville alla se {den}.',
    { t: '{namn} var på gott humör den dagen {pa} när {hen} gjorde {saken}, och glädjen syns i varje del.', om: f => f.glad === true },
    { t: '{namn} var nedstämd när {hen} gjorde {saken} {pa}, men händerna gjorde ett mästerverk ändå.', om: f => f.ledsen === true },
    { t: 'Det var natt när {namn} gjorde klart {saken}, i skenet från elden.', om: f => f.natt === true },
  ],
  m_liv: [
    { t: 'Det var dagarna efter att {om} föddes, och {namn} arbetade med ett nytt barn i tankarna.', om: f => f.l === 'barn' },
    { t: '{om} hade just fötts, och {namn} ville göra något som höll länge.', om: f => f.l === 'barn' },
    { t: 'Det var strax efter att {om} dog, och {namn} arbetade för att slippa tänka.', om: f => f.l === 'sorg' },
    { t: '{namn} sörjde {om} när {hen} gjorde {den}, och kanske är det därför {den} blev så fin.', om: f => f.l === 'sorg' },
    { t: '{namn} var sjuk och borde ha vilat, men satt uppe och arbetade.', om: f => f.l === 'sjuk' },
    { t: 'Febern höll {namn} vaken, och {hen} arbetade i stället för att sova.', om: f => f.l === 'sjuk' },
    { t: '{namn} väntade barn och arbetade med händerna på magen mellan varven.', om: f => f.l === 'gravid' },
    { t: '{namn} bar på ett barn när {hen} gjorde {den}, och tänkte på det som skulle komma.', om: f => f.l === 'gravid' },
    { t: '{namn} var byns ledare då och hade lite tid över, men tog den här tiden ändå.', om: f => f.l === 'ledare' },
    { t: 'Mellan allt {namn} hade att göra som ledare fann {hen} stunder till det här arbetet.', om: f => f.l === 'ledare' },
  ],
  m_nara: [
    '{nara} satt bredvid och såg på medan {namn} arbetade.',
    '{nara} var den första som fick se {saken}.',
    'Det var {nara} som först sa att {den} var ett mästerverk.',
    '{nara} var där och har berättat om det sedan.',
    '{nara} satt bredvid {namn} och pratade, och {namn} lyssnade med ett halvt öra.',
    '{nara} hämtade det {namn} behövde medan {hen} arbetade.',
    'Ingen annan än {nara} var där när {saken} blev klar.',
    '{nara} säger att {namn} inte sa ett ord medan {hen} arbetade.',
  ],
  m_inskr: [
    'I {den} har {namn} ristat sitt märke och orden "Åt {at}{som}."',
    'Inristat står det "Åt {at}{som}." {namn} gjorde {den} till {at}.',
    '{namn} ristade in en tillägnan: "Åt {at}{som}."',
    'Längs kanten står det, bredvid {namn}s märke: "Åt {at}{som}."',
    'Under {namn}s tecken står det "Åt {at}{som}."',
    'Den som vänder på {saken} ser {namn}s märke och orden "Åt {at}{som}."',
    'Det var åt {at} som {saken} gjordes, och det står där: "Åt {at}{som}."',
    'Inristat finns {namn}s tecken och en tillägnan: "Åt {at}{som}."',
  ],
  m_perfekt: [
    'Byn kallar {den} {egen}.',
    '{Den} har ett eget namn: {egen}.',
    '{egen}, säger man, och alla vet vad som menas.',
    'Så fullkomlig blev {saken} att {den} fick ett namn: {egen}.',
    'Ingen säger {saken} om {den}. {Den} heter {egen}.',
    'Vid elden talar man om {egen}, som {namn} gjorde.',
    'Barnen viskar namnet när de ser {den}: {egen}.',
    '{egen} kallas {den}, och namnet kommer att leva längre än {namn}.',
  ],
  m_varg: [
    'Med {den} fällde {vem} en varg.',
    '{vem} hade {den} i handen när {hen2} fällde en varg.',
    'En varg föll för {den}, i {vem}s händer.',
    '{Den} har smakat vargblod: {vem} fällde en varg med {den}.',
    'Det var med {den} som {vem} dödade en varg.',
    '{vem} fällde en varg, och det var {saken} som gjorde det.',
    'Sedan {vem} fällde en varg med {den} är {den} något mer än ett redskap.',
    'Vargen som {vem} fällde dog för {den}.',
  ],
  u_gjord: [
    '{namn} gjorde {saken} {pa}{vader}. Det borde {hen} kanske inte ha gjort.',
    'Byn skrattar fortfarande åt {saken} som {namn} gjorde {pa}.',
    '{Saken} är {namn}s verk, och det syns, tyvärr.',
    'Ingen vill låna {saken}. {namn} gjorde {den} {pa}{vader}, och mer än så finns inte att säga.',
    '{namn} säger att {saken} blev som {hen} tänkt sig. Ingen tror på det.',
    'Det går att använda {saken}, om man inte är noga. {namn} gjorde {den} {pa}.',
    'Barnen gör sig lustiga över {saken}, som {namn} gjorde {pa}{vader}.',
    '"Det håller nog en dag till", säger {namn} om {saken} varje dag.',
    { t: '{namn} var på dåligt humör när {hen} gjorde {saken}, och det märks.', om: f => f.ledsen === true },
    { t: '{namn} hade bråttom in ur blåsten när {hen} gjorde {saken}.', om: f => f.vader === ' i blåsten' },
    { t: 'Det var mörkt när {namn} gjorde {saken}. Det är det enda {hen} har att skylla på.', om: f => f.natt === true },
  ],
  u_nara: [
    '{nara} såg {namn} göra {saken} och sa ingenting, vilket sa allt.',
    '{nara} skrattade så att {namn} blev röd i ansiktet.',
    '{nara} var där och har berättat om det för alla sedan.',
    'Det var {nara} som först började skratta.',
    '{nara} försökte hjälpa till, men det blev inte bättre av det.',
    '{nara} höll god min men berättade det för hela byn vid elden.',
    '{nara} satt bredvid och bet sig i läppen för att inte skratta.',
    '{nara} frågade vad det skulle bli. Det undrar byn fortfarande.',
  ],
  // samtalens ämnen (steg 3.9.5): {namn} och {med} pratade, {om} är det de pratade om
  p_gral: [
    '{namn} och {med} grälade.',
    '{namn} och {med} kom i luven på varandra.',
    '{namn} och {med} kunde inte hålla sams.',
    'Det blev hårda ord mellan {namn} och {med}.',
    '{namn} och {med} grälade så att andra vände sig om.',
    '{namn} sa något som {med} inte tålde, och sedan var grälet igång.',
    '{namn} och {med} skildes osams.',
    'Det blev gräl mellan {namn} och {med}, som så ofta förut.',
  ],
  p_varsel: [
    '{namn} varnade {med} för {om}.',
    '{namn} berättade för {med} att {om} kommer.',
    '{namn} sa till {med} att det är bäst att samla inför {om}.',
    '{namn} och {med} pratade om {om} som kommer.',
    '{namn} hade anat {om}, och nu vet {med} det också.',
    '{namn} sänkte rösten och berättade om {om} för {med}.',
    '{med} fick höra av {namn} att {om} är på väg.',
    '{namn} och {med} undrade hur de ska klara {om}.',
  ],
  p_fara: [
    '{namn} varnade {med} för {om}.',
    '{namn} berättade för {med} om {om}.',
    '{namn} sa åt {med} att hålla sig borta från {om}.',
    '{namn} och {med} pratade om {om}, och båda blev lite rädda.',
    '{med} fick höra om {om} av {namn}.',
    '{namn} gjorde {om} farligare än det kanske är när {med} lyssnade.',
    '{namn} och {med} pratade lågt om {om}.',
    '{namn} lärde {med} att vara rädd för {om}.',
  ],
  p_rykte: [
    '{namn} berättade för {med} vad man säger om {om}.',
    '{namn} och {med} skvallrade om {om}.',
    '{namn} viskade till {med} om {om}.',
    '{namn} och {med} pratade om {om}, som inte var där.',
    '{med} fick höra ett och annat om {om} av {namn}.',
    '{namn} hade mycket att säga om {om}, och {med} lyssnade.',
    '{namn} och {med} undrade över {om}.',
    '{namn} visste något om {om} som {med} inte visste.',
  ],
  p_teknik: [
    '{namn} lärde {med} om {om}.',
    '{namn} visade {med} hur {om} går till.',
    '{namn} och {med} pratade om {om}.',
    '{med} frågade {namn} om {om}.',
    '{namn} förklarade {om} för {med}.',
    '{namn} och {med} funderade över {om}.',
    '{namn} lät {med} se hur {om} går till.',
    '{med} lärde sig om {om} av {namn}.',
  ],
  p_kunskap: [
    '{namn} lärde {med} att {om}.',
    '{namn} visade {med} hur man ska {om}.',
    '{namn} och {med} pratade om att {om}.',
    '{med} fick lära sig av {namn} att {om}.',
    '{namn} förklarade för {med} hur man ska {om}.',
    '{med} frågade {namn} hur man ska {om}.',
    '{namn} var noga med att {med} skulle kunna {om}.',
    '{namn} och {med} övade på att {om}.',
  ],
  p_plats: [
    '{namn} berättade för {med} var det finns {om}.',
    '{namn} och {med} pratade om var man hittar {om}.',
    '{namn} visste ett bra ställe för {om} och sa det till {med}.',
    '{med} fick veta av {namn} var det finns {om}.',
    '{namn} och {med} jämförde var de hittat {om}.',
    '{namn} beskrev för {med} vägen till {om}.',
    '{namn} sa till {med} att det finns {om} på ett ställe {namn} vet.',
    '{namn} och {med} pratade om {om} och var det brukar finnas.',
  ],
  p_langtan: [
    '{namn} sa till {med} att {namn} längtar efter {om}.',
    '{namn} och {med} pratade om hur gott {om} vore.',
    '{namn} klagade för {med} att {namn} inte fått {om} på länge.',
    '{namn} och {med} drömde om {om}.',
    '{med} fick höra att {namn} saknar {om}.',
    '{namn} pratade om {om} så att {med} också blev sugen.',
    '{namn} och {med} undrade var de kan få tag på {om}.',
    '{namn} sa att {om} är det {namn} längtar mest efter.',
  ],
  p_karlek: [
    '{namn} och {med} flirtade.',
    '{namn} och {med} satt tätt intill varandra och pratade lågt.',
    '{namn} sa något fint till {med}.',
    '{namn} fick {med} att skratta och rodna.',
    '{namn} och {med} tittade länge på varandra.',
    '{namn} och {med} pratade om ingenting och om allt.',
    '{namn} försökte vinna {med}s hjärta.',
    '{namn} och {med} log mot varandra mer än de pratade.',
  ],
  p_trost: [
    '{namn} tröstade {med}.',
    '{namn} lade armen om {med} och lyssnade.',
    '{namn} sa till {med} att det kommer bli bättre.',
    '{med} fick gråta ut hos {namn}.',
    '{namn} satt hos {med} tills det kändes lite lättare.',
    '{namn} lyssnade när {med} hade det svårt.',
    '{namn} försökte muntra upp {med}.',
    '{med} berättade vad som tyngde, och {namn} lyssnade.',
  ],
  p_dod: [
    '{namn} och {med} pratade om {om}, som är död.',
    '{namn} och {med} mindes {om}.',
    '{namn} berättade för {med} om när {om} levde.',
    '{namn} och {med} saknar {om}.',
    '{namn} och {med} undrade hur det blir utan {om}.',
    '{namn} och {med} pratade lågt om {om}.',
    '{namn} sa att {om} var en bra människa, och {med} höll med.',
    '{namn} och {med} sörjde {om} tillsammans.',
  ],
  p_vader: [
    '{namn} och {med} pratade om {om}.',
    '{namn} klagade på {om} för {med}.',
    '{namn} och {med} undrade hur länge {om} ska hålla i sig.',
    '{namn} sa till {med} att {om} aldrig varit värre.',
    '{namn} och {med} tittade upp mot himlen och pratade om {om}.',
    '{namn} och {med} höll med varandra om {om}.',
    '{med} fick höra vad {namn} tycker om {om}.',
    '{namn} och {med} pratade om {om}, som man gör.',
  ],
  p_mat: [
    '{namn} och {med} pratade om maten.',
    '{namn} klagade för {med} att {namn} är hungrig.',
    '{namn} och {med} undrade om maten räcker.',
    '{namn} och {med} pratade om vad de ska äta.',
    '{namn} sa till {med} att magen knorrar.',
    '{namn} och {med} pratade om den senaste goda måltiden.',
    '{namn} och {med} räknade på vad som finns kvar att äta.',
    '{namn} och {med} pratade om var man kan hitta mat.',
  ],
  p_arbete: [
    '{namn} berättade för {med} om livet som {om}.',
    '{namn} och {med} pratade om arbetet.',
    '{namn} klagade för {med} på hur slitsamt det är att vara {om}.',
    '{namn} berättade stolt för {med} om dagens arbete.',
    '{namn} och {med} pratade om vad som ska göras i morgon.',
    '{namn} förklarade för {med} hur en {om} gör.',
    '{med} fick höra allt om arbetet som {om}.',
    '{namn} och {med} pratade om hur arbetet går.',
  ],
  p_barn: [
    '{namn} och {med} pratade om barnen.',
    '{namn} berättade för {med} vad barnen hittat på.',
    '{namn} och {med} undrade hur barnen ska klara sig.',
    '{namn} var stolt och berättade om barnen för {med}.',
    '{namn} klagade för {med} på barnen.',
    '{namn} och {med} pratade om barnen och vad de ska bli.',
    '{namn} och {med} skrattade åt något barnen gjort.',
    '{namn} oroade sig för barnen, och {med} lyssnade.',
  ],
  p_vardag: [
    '{namn} och {med} småpratade.',
    '{namn} och {med} pratade om lite av varje.',
    '{namn} och {med} skämtade.',
    '{namn} och {med} pratade om vad som hänt i byn.',
    '{namn} och {med} pratade en stund.',
    '{namn} berättade en lustig historia för {med}.',
    '{namn} och {med} pratade om ingenting särskilt.',
    '{namn} och {med} satt och pratade.',
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
  kronika(s, text, heder ? 'hedersnamn' : 'oknamn');
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

// ---------- krönikan (steg 3.9.3) ----------
const ARSTIDER = ['istiden', 'våren', 'sommaren', 'hösten'];
const TAL = ['ingen', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'];
export const talOrd = (n: number) => TAL[n] ?? String(n);
export const och = (l: string[]) => l.length > 1 ? `${l.slice(0, -1).join(', ')} och ${l[l.length - 1]}` : l[0] ?? '';
// en händelse som en liten berättelse i krönikan, med årstiden, vädret och natten (loggen behåller sin korta rad).
// Raden får mallens id som slag, så att den kan hittas utan att läsa texten
export function kronikaBer(s: State, mall: MallId, nyckel: number, f: Fyllning) {
  const v = vaderNu(s);
  const g: Fyllning = { arstid: ARSTIDER[kalender(s).ai], kallt: temperature(s) < 0, sno: v.sno, regn: v.lage === 'regn', blast: v.lage === 'blast', natt: !isLight(s.now), ...f };
  kronika(s, berattelse(s, mall, nyckel + (s.hist?.kronika.length ?? 0) * 7919, g), mall);
}
// fälten för en person: namnet, namnet byn gav och hen
export const personFalt = (p: Person): Fyllning => ({ namn: p.name, helt: heltNamn(p), hen: hen(p), honom: p.sex === 'm' ? 'honom' : 'henne' });

// ---------- mästerverken och de usla sakerna (steg 3.9.4) ----------
// När ett mästerverk eller en usel sak blir klar sparas det som berättelsen behöver: görarens humör, årstiden, vädret,
// natten, göraren (g), vem som var nära, vem saken gjordes åt och något om görarens liv just då. Texten skrivs när den visas (sakens
// inforuta), med tiden 0 så att den står kvar. Ett perfekt mästerverk (★) får ett eget namn, och ett vapen som fäller en
// varg minns det (vargdöden i varg.ts); ett perfekt vapen heter sedan Vargdräparen.
export type SakLiv = 'barn' | 'sorg' | 'sjuk' | 'gravid' | 'ledare';
export interface SakMinne { g: number; h: number; ai: number; v?: string; natt?: 1; nara?: number; at?: number; l?: SakLiv; lo?: number; namn?: string; varg?: number }
type SakGrupp = 'egg' | 'vapen' | 'klad' | 'mobel' | 'redskap';
const PA = ['under istiden', 'på våren', 'på sommaren', 'på hösten'];
const VADER_ORD: Record<string, string> = { regn: ' i regnet', sno: ' i snön', blast: ' i blåsten', dimma: ' i dimman' };
// det egna namnet: en förled efter det som hände när saken gjordes och en efterled efter vad saken är
const FORLED = { sorg: 'Sorg', barn: 'Glädje', sno: 'Snö', regn: 'Regn', blast: 'Storm', dimma: 'Dim', natt: 'Natt', glad: 'Sol', ledsen: 'Tår', ai: ['Vinter', 'Vår', 'Sommar', 'Höst'] };
const EFTERLED: Record<SakGrupp, string[]> = {
  egg: ['eggen', 'bettet', 'skäraren'], vapen: ['udden', 'stöten', 'spetsen'], klad: ['värmen', 'skinnet', 'skyddet'],
  mobel: ['vilan', 'vännen', 'hemmet'], redskap: ['handen', 'hjälpen', 'vännen'],
};
const SOM = ['', ', som aldrig frös', ', som alltid kommer hem', ', mitt ljus', ', som skrattar', ', av hela mitt hjärta', ', som jag aldrig glömmer', ', i vinter och i sommar'];
const sakGrupp = (k: string): SakGrupp => {
  const d = SAKER[k];
  return !d ? 'mobel' : d.klad ? 'klad' : d.grupp === 'spjut' ? 'vapen' : k === 'kniv' || k === 'yxa' ? 'egg' : 'redskap';
};
// sakens namn i bestämd form och pronomenet: flintkniven/den, träspjutet/det, skinnskorna/de
const NEUTRUM = ['spjut', 'spö', 'bord', 'ställ', 'bälte'];
export function bestamd(namn: string): [string, string] {
  const n = namn.toLowerCase();
  if (n === 'litet bord') return ['det lilla bordet', 'det'];
  if (n.endsWith('skor')) return [n + 'na', 'de'];
  if (NEUTRUM.some(e => n.endsWith(e))) return [n + (/[aeiouyåäö]$/.test(n) ? 't' : 'et'), 'det'];
  return [n + (/[aeiouyåäö]$/.test(n) ? 'n' : 'en'), 'den'];
}

// saken t (ett ting eller en möbel) blev ett mästerverk eller usel: spara det berättelsen behöver
export function sakMinne(s: State, p: Person, t: { id: number; k: string; q?: number; ber?: SakMinne }) {
  const v = vaderNu(s), dag = 24 * HOUR;
  const vad = v.sno ? 'sno' : v.lage === 'regn' || v.lage === 'blast' ? v.lage : v.dimma > BERATT.dimma ? 'dimma' : undefined;
  const m: SakMinne = { g: p.id, h: Math.round(moodOf(p, s.now) * 100) / 100, ai: kalender(s).ai };
  if (vad) m.v = vad;
  if (!isLight(s.now)) m.natt = 1;
  let bast = BERATT.nara;
  for (const q of living(s)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (q !== p && d < bast) { bast = d; m.nara = q.id; } }
  // åt vem: partnern, annars det yngsta barnet, annars bästa vännen
  const partner = p.partner !== undefined ? byId(s, p.partner) : undefined, barn = s.people.filter(c => alive(c) && (c.mother === p.id || c.father === p.id)).sort((a, b) => b.born - a.born)[0];
  const at = partner && alive(partner) ? partner : barn ?? (p.bast !== undefined ? byId(s, p.bast) : undefined);
  if (at && alive(at) && hash(s.seed, t.id, 3) < BERATT.inskr) m.at = at.id;
  // något om görarens liv just då
  const nytt = s.people.find(c => (c.mother === p.id || c.father === p.id) && s.now - c.born < BERATT.barnDygn * dag);
  const sorg = s.people.find(c => c.died !== undefined && s.now - c.died < BERATT.sorgDygn * dag && (c.id === p.partner || c.mother === p.id || c.father === p.id || p.mother === c.id || p.father === c.id));
  const liv: [SakLiv, number?] | undefined = sorg ? ['sorg', sorg.id] : nytt ? ['barn', nytt.id] : p.sickUntil !== undefined && p.sickUntil > s.now ? ['sjuk']
    : p.pregnantSince !== undefined ? ['gravid'] : s.styre?.ledare === p.id ? ['ledare'] : undefined;
  if (liv) { m.l = liv[0]; if (liv[1] !== undefined) m.lo = liv[1]; }
  if ((t.q ?? 0) >= 5) {
    const ef = EFTERLED[sakGrupp(t.k)], fore = liv?.[0] === 'sorg' || liv?.[0] === 'barn' ? FORLED[liv[0]] : vad ? FORLED[vad as 'sno'] : m.natt ? FORLED.natt
      : m.h >= BERATT.glad ? FORLED.glad : m.h <= BERATT.ledsen ? FORLED.ledsen : FORLED.ai[m.ai];
    m.namn = fore + ef[Math.floor(hash(s.seed, t.id, 4) * ef.length)];
  }
  t.ber = m;
}
// ett vapen med ett minne fällde en varg: det minns vem som gjorde det, och ett perfekt vapen döps om
export function sakVarg(s: State, t: { id: number; k: string; q?: number; ber?: SakMinne } | undefined, vem: Person) {
  if (!t?.ber || t.ber.varg !== undefined) return;
  t.ber.varg = vem.id;
  const g = sakGrupp(t.k);
  if ((t.q ?? 0) >= 5 && (g === 'vapen' || g === 'egg')) {
    const gammalt = t.ber.namn; t.ber.namn = 'Vargdräparen';
    log(s, `${gammalt ?? sakNamn(t.k)} heter nu Vargdräparen: ${vem.name} fällde en varg med den.`, 'world', [vem.id]);
  }
}
// berättelsen om saken t (namnet = sakens namn), eller inget om den inte har något minne
export function sakBerattelse(s: State, t: { id: number; k: string; q?: number; ber?: SakMinne }, namn: string) {
  const m = t.ber, p = m && byId(s, m.g);
  if (!m || !p) return '';
  const [saken, den] = bestamd(namn), q = t.q ?? 0, usel = q === 0;
  const f: Fyllning = { namn: p.name, hen: hen(p), saken, den, pa: PA[m.ai], arstid: ARSTIDER[m.ai], vader: m.v ? VADER_ORD[m.v] : '', glad: m.h >= BERATT.glad, ledsen: m.h <= BERATT.ledsen, natt: m.natt === 1, l: m.l, egen: m.namn, perfekt: q >= 5 };
  const nara = m.nara !== undefined ? byId(s, m.nara) : undefined, at = m.at !== undefined ? byId(s, m.at) : undefined, lo = m.lo !== undefined ? byId(s, m.lo) : undefined;
  const vem = m.varg !== undefined ? byId(s, m.varg) : undefined;
  const del = (mall: MallId, n: number, g: Fyllning = {}) => fyll(valjVariant(s, mall, t.id * 16 + n, { ...f, ...g }, 0), { ...f, ...g });
  const ut = [del(usel ? 'u_gjord' : 'm_gjord', 0)];
  if (!usel && m.l && (lo || m.lo === undefined)) ut.push(del('m_liv', 1, { om: lo?.name }));
  if (nara) ut.push(del(usel ? 'u_nara' : 'm_nara', 2, { nara: nara.name }));
  if (!usel && at) ut.push(del('m_inskr', 3, { at: at.name, som: SOM[Math.floor(hash(s.seed, t.id, 5) * SOM.length)] }));
  if (vem) ut.push(del('m_varg', 4, { vem: vem === p ? p.name : vem.name, hen2: hen(vem) }));
  if (q >= 5 && m.namn) ut.push(del('m_perfekt', 5));
  return ut.join(' ');
}

// ---------- samtalens ämnen (steg 3.9.5) ----------
// Vad ett samtal handlade om: det som delades i samtalet (en motgång som kommer, en farlig plats, ett rykte, en teknik,
// något man kan, en plats, det man längtar efter), annars något som passar läget (en död nyss, vädret, maten, arbetet,
// barnen). Det som delas anmäls med delade() där det händer (minne.ts, rykten.ts, teknik.ts, motgang.ts, naring.ts), och
// det med högst prio blir ämnet. ikon: symbolen i pratbubblan när den inte kommer från det som delades (platsens,
// teknikens eller intryckets egen bild). Texten i personrutan är mallen p_<ämne> ovan. Ämnet väljs utan spelets slump
export interface AmneDef { prio: number; namn: string; ikon?: string }
const ADEF = {
  gral: { prio: 100, namn: 'Gräl' },
  varsel: { prio: 90, namn: 'En motgång som kommer' },
  fara: { prio: 80, namn: 'En farlig plats' },
  rykte: { prio: 70, namn: 'Ett rykte' },
  teknik: { prio: 60, namn: 'En teknik' },
  kunskap: { prio: 55, namn: 'Något man kan' },
  plats: { prio: 50, namn: 'En plats' },
  langtan: { prio: 40, namn: 'Det man längtar efter', ikon: 's_mat' },
  karlek: { prio: 30, namn: 'Kärlek' },
  trost: { prio: 25, namn: 'Tröst', ikon: 's_trost' },
  dod: { prio: 20, namn: 'En död', ikon: 's_dod' },
  vader: { prio: 10, namn: 'Vädret' },
  mat: { prio: 10, namn: 'Maten', ikon: 's_mat' },
  arbete: { prio: 10, namn: 'Arbetet' },
  barn: { prio: 10, namn: 'Barnen', ikon: 's_barn' },
  vardag: { prio: 0, namn: 'Lite av varje' },
} satisfies Record<string, AmneDef>;
export type AmneId = keyof typeof ADEF;
export const AMNEN: Record<AmneId, AmneDef> = ADEF;
// det senaste samtalet: med vem (m), ämnet (k), symbolen (i), vad det handlade om (o) och när (t)
export interface Prat { m: number; k: AmneId; i?: string; o?: string; t: number }
// det som delats i samtalet som pågår (converse i samtal.ts nollställer det före och läser det efter)
let delat: { k: AmneId; i?: string; o?: string } | undefined;
export function samtalBorjar() { delat = undefined; }
export function delade(k: AmneId, i?: string, o?: string) { if (!delat || AMNEN[k].prio > AMNEN[delat.k].prio) delat = { k, i, o }; }
const VADER_PRAT: Record<string, string> = { regn: 'regnet', sno: 'snön', blast: 'blåsten', aska: 'åskan', dimma: 'dimman' };
// ämnet för samtalet mellan a och b av slaget kind, sparat hos båda
export function samtalAmne(s: State, a: Person, b: Person, kind: string) {
  let x: { k: AmneId; i?: string; o?: string } | undefined = kind === 'gräl' ? { k: 'gral' } : delat ?? (kind === 'flirt' ? { k: 'karlek' } : kind === 'tröst' ? { k: 'trost' } : undefined);
  if (!x) {
    const val: { k: AmneId; i?: string; o?: string }[] = [{ k: 'vardag' }];
    const dag = 24 * HOUR, dod = s.people.filter(c => c.died !== undefined && s.now - c.died < BERATT.dodDygn * dag).sort((c, d) => d.died! - c.died!)[0];
    if (dod) val.push({ k: 'dod', o: dod.name });
    const v = vaderNu(s), t = temperature(s), vl = v.sno ? 'sno' : VADER_PRAT[v.lage] ? v.lage : undefined;
    if (vl) val.push({ k: 'vader', i: 'vader_' + vl, o: VADER_PRAT[vl] });
    else if (t <= BERATT.kallt) val.push({ k: 'vader', i: 'vader_sno', o: 'kylan' });
    else if (t >= BERATT.varmt) val.push({ k: 'vader', i: 'vader_klart', o: 'värmen' });
    if (a.hunger < BERATT.hungrig) val.push({ k: 'mat' });
    if (a.tag && a.tag !== 'Dagdrivare') { const tg = TAGS.find(g => g.tag === a.tag), sl = tg?.acts.map(k => ACTS[k].slag).find(k => k); val.push({ k: 'arbete', i: sl && slagIkon(sl), o: a.tag.toLowerCase() }); }
    if (s.people.some(c => alive(c) && (c.mother === a.id || c.father === a.id) && ageOf(c, s.now) < ALDER.vuxen)) val.push({ k: 'barn' });
    x = val[Math.floor(hash(s.seed, a.id * 997 + b.id, Math.round(s.now / 60)) * val.length)];
  }
  const i = x.i ?? AMNEN[x.k].ikon;
  a.prat = { m: b.id, k: x.k, t: s.now, ...(i ? { i } : {}), ...(x.o ? { o: x.o } : {}) };
  b.prat = { ...a.prat, m: a.id };
  return a.prat;
}
// texten om p:s senaste samtal ("Ask och Ylva pratade om vädret"), eller inget om det är längesedan
export function pratText(s: State, p: Person) {
  const x = p.prat, q = x && byId(s, x.m);
  if (!x || !q || s.now - x.t > BERATT.pratTim * HOUR) return '';
  const f: Fyllning = { namn: p.name, med: q.name, om: x.o ?? '' };
  return fyll(valjVariant(s, `p_${x.k}` as MallId, p.id + q.id, f, Math.round(x.t / 60)), f);
}
