import { balans } from './balans';
import { PERSONLOGG, PLOGG, type PersonloggId, type PersonloggSlag, type PersonRad } from './personlogg';
import { personHand } from './personlogg';
import { ALDER, KROPP, REL, ageOf, alive, byId, count, isKin, isParent, living, log, namnSlut, relKey, stat } from './folk';
import { ACTS, Act, slagIkon } from './handlingar';
import { TAGS } from './seder';
import { kronika } from './historik';
import { Bevis, HANDELSER, INTRYCK, IntryckTyp, bevisText, intryckOm, intryckText, samlatIntryck } from './rykten';
import { SAKER, sakNamn } from './saker';
import { moodOf } from './humor';
import { roomAt } from './byggnad';
import { HOUR, LogEntry, MIN, Person, Rel, SKILLS, SKILL_NAMES, STATS, Skill, Stat, State, Upplevelse } from './typer';
import { upplev, upplevelseText } from './uppvaxt';
import { isLight, kalender } from './tid';
import { temperature, vaderNu } from './vader';
import { hash3 } from './slump';
import { ganger, gen, goraNamn, han, honom, och, slaktOrd, talOrd } from './ord';
import { isSick } from './sjukdom';

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
  glomtDygn: 6, // eftermälet (steg 6.7.4): så här många dygn efter döden säger texten att det är länge sedan
  skon: 5, // skönheten står alltid med (steg 3.9.7) när den ligger så här långt från mitten (10) eller mer
  aldstBy: 4, // den äldsta i byn nämns när byn har minst så här många invånare
  mycket: 0.6, // beskrivningen får en mening till när minst fem delar (de fasta med) sticker ut så här mycket (vikt 0–1)
  // mer ur livet (steg 3.9.8)
  mangaBarn: 4, // föräldern nämns med barnen från så här många barn
  bastSk: 10, // bäst i byn på en färdighet räknas från den här nivån (färdigheterna går till 20, mästare vid 16)
  vardMin: 5, // den som vårdat andra så här många gånger nämns för det
  raddMod: 13, // ett vargbett gör den rädd för vargar som har lägre mod än så här
  starkRadd: 14, // ... och styrkan där hen kallas stark men rädd
  rik: 2, // rik med så här många gånger byns median (rikedomen i humor.ts), fattig med den här delen eller mindre:
  fattig: 0.4,
  mycketPrat: 20, // två som pratat så här många gånger har pratat mycket (relationerna, steg 6.7.7)
  langtan: 50, // längtan efter någon med så här mycket romans (rom, 0–100) eller mer, när hen inte har någon partner
  lekNamn: 0.5, // så ofta får den som har samma namnslut som en förälder eller ett barn i livet binamnet Lill- eller Stor- (steg 4.5.4.8)
  // mästerverken och de usla sakerna (steg 3.9.4)
  glad: 0.7, // göraren var glad med humöret så här högt ...
  ledsen: 0.35, // ... och nedstämd så här lågt
  nara: 5, // den som var närmast inom så här många rutor var med
  sorgDygn: 5, // en nära släkting som dog för högst så här många dygn sedan: göraren sörjde
  barnDygn: 3, // ett barn som föddes för högst så här många dygn sedan: göraren hade fått barn
  inskr: 0.6, // så stor del av mästerverken får en tillägnan, när det finns någon att tillägna dem
  // konsten i sakerna (steg 4.3.3): ett mästerverk (inte kläderna) får ristningar eller en målning av det göraren minns starkast
  // om en annan (helst en död), när intrycket är minst konstMin starkt. Det håller minnet av den döde vid liv (rykten.ts) och
  // höjer värdet (varde.ts)
  konst: 0.8, // så stor del av mästerverken får ett motiv, när göraren minns någon
  konstMin: 0.2,
  malning: 0.4, // så stor del av dem är målade; de andra är ristade
  dimma: 0.5, // dimman räknas från den här tätheten
  // samtalens ämnen (steg 3.9.5)
  dodDygn: 2, // man pratar om den som dog för högst så här många dygn sedan
  kallt: -5, // ... om kylan från den här temperaturen (°C) och neråt
  varmt: 25, // ... om värmen från den här och uppåt
  hungrigOver: 0.05, // ... och om maten strax innan man äter: mättnaden under ätgränsen (KROPP.hungrig) plus så här mycket
  pratTim: 2, // personrutan visar det senaste samtalet i så här många timmar
  // relationerna utförligt (steg 3.9.6)
  kemi: 0.4, // personkemin (−1 till 1) nämns från så här långt från noll
  relIntryck: 3, // så här många av intrycken visas
});

// ---------- registren ----------
// en variant: texten, eller texten med ett villkor
export type Variant = string | { t: string; om: (f: Fyllning) => boolean };
export type Fyllning = Record<string, string | number | boolean | undefined>;

// öknamnen och hedersnamnen per intryck: [mannens, kvinnans]
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
  valbargad: { namn: [['den välbärgade', 'den välbärgade'], ['Smörbyttan', 'Smörbyttan'], ['den välförsedde', 'den välförsedda'], ['Mjölsäcken', 'Mjölsäcken']] }, // steg 4.5.4.7
  rik: { namn: [['den rike', 'den rika'], ['den förmögne', 'den förmögna'], ['Guldpungen', 'Guldpungen'], ['Fullkistan', 'Fullkistan']] },
  rattvis: { namn: [['den rättvise', 'den rättvisa'], ['Vågen', 'Vågen'], ['den vise', 'den visa'], ['Domaren', 'Domarinnan']] },
  orattvis: { namn: [['den orättvise', 'den orättvisa'], ['den hårde', 'den hårda'], ['Snedvågen', 'Snedvågen'], ['den stränge', 'den stränga']] },
  stark: { namn: [['den starke', 'den starka'], ['Björnen', 'Björnen'], ['Järnarmen', 'Järnarmen'], ['Eken', 'Eken']] },
  feg: { namn: [['Haren', 'Haren'], ['den rädde', 'den rädda'], ['Darraren', 'Darrerskan'], ['Hönan', 'Hönan']] },
  arrig: { namn: [['Ärret', 'Ärret'], ['Sneansikte', 'Sneansikte'], ['den ärrade', 'den ärrade'], ['Krokkäke', 'Krokkäke']] }, // ett ärr i ansiktet (steg 8.2.4)
  smakfull: { namn: [['den smakfulle', 'den smakfulla'], ['Prydnaden', 'Prydnaden'], ['den fine', 'den fina'], ['Pärlan', 'Pärlan']] }, // pyntet (steg 4.3.4)
  vargdodare: { namn: [['Vargdödaren', 'Vargdödaren'], ['Vargbane', 'Vargbane'], ['den modige', 'den modiga'], ['Ulvspjutet', 'Ulvspjutet']] },
  bjorndodare: { namn: [['Björndödaren', 'Björndödaren'], ['Björnbane', 'Björnbane'], ['den orädde', 'den orädda'], ['Björnfällen', 'Björnfällen']] }, // steg 6.6.6
};
export const BINAMN: Record<IntryckTyp, BinamnDef> = BDEF;

// mallarna: id → varianterna (minst åtta). {namn} = förnamnet, {binamn} = namnet byn gav, {helt} = båda, {skal} = varför
// (det som hänt), {tillstand} = det byn tycker att hen är när ingen har ett bevis (tillst, steg 6.7.6)
const MDEF = {
  hedersnamn: [
    { t: 'Byn har börjat kalla {namn} för {binamn}, för {hen} {skal}.', om: f => !f.tillst },
    { t: 'Sedan {hen} {skal} säger alla {helt}.', om: f => !f.tillst },
    { t: '{namn} {skal}. Från den dagen hette {hen} {helt}.', om: f => !f.tillst },
    { t: 'Ingen minns vem som sa det först, men nu är {namn} {binamn} för hela byn. {Hen} {skal}.', om: f => !f.tillst },
    { t: 'Vid elden talar man om {namn} som {binamn}. Det var när {hen} {skal}.', om: f => !f.tillst },
    { t: '{helt}, säger de nu, och {namn} låtsas inte höra det men ler. {Hen} {skal}.', om: f => !f.tillst },
    { t: 'Barnen ropar {binamn} efter {namn}. {Hen} {skal}, och det har de inte glömt.', om: f => !f.tillst },
    { t: 'Så fick {namn} sitt namn: {hen} {skal}, och byn kallar {honom} {helt}.', om: f => !f.tillst },
    { t: 'Det var en kall tid när {namn} {skal}. Sedan dess heter {hen} {helt}.', om: f => !f.tillst && f.kallt === true },
    { t: 'De gamla nickar när de säger {helt}. {Hen} {skal}, och sådant minns man.', om: f => !f.tillst && (f.gamla as number) > 0 },
    { t: 'Alla vet att {namn} är {tillstand}, och nu säger de {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Byn har börjat kalla {namn} för {binamn}. {Hen} är {tillstand}, och det har alla sett.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{namn} är {tillstand}, och därför heter {hen} nu {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Vid elden talar man om {namn} som {binamn}, för {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Barnen ropar {binamn} efter {namn}. {Hen} är {tillstand}, det vet alla.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Ingen minns vem som sa det först, men {namn} är {tillstand}, och nu heter {hen} {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{helt}, säger de nu. {namn} är {tillstand}, och det ser alla.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Så fick {namn} sitt namn: {hen} är {tillstand}, och byn kallar {honom} {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
  ],
  oknamn: [
    { t: 'Bakom ryggen kallar byn {namn} för {binamn}. {Hen} {skal}.', om: f => !f.tillst },
    { t: '{namn} {skal}, och nu heter {hen} {helt} i allas mun.', om: f => !f.tillst },
    { t: 'Ingen säger det högt när {namn} hör, men alla vet vem {binamn} är. {Hen} {skal}.', om: f => !f.tillst },
    { t: 'Sedan {hen} {skal} säger man {helt}, och man fnissar när man säger det.', om: f => !f.tillst },
    { t: 'Det är inget fint namn, {binamn}. Men {namn} {skal}.', om: f => !f.tillst },
    { t: 'Vid elden viskar man om {helt}. Det var när {hen} {skal}.', om: f => !f.tillst },
    { t: 'Barnen härmar {namn} och ropar {binamn}. {Hen} {skal}, och det sitter i.', om: f => !f.tillst },
    { t: 'Så fick {namn} sitt namn: {hen} {skal}, och nu är {hen} {helt}.', om: f => !f.tillst },
    { t: '{namn} blev arg när {hen} hörde att {hen} heter {binamn}. Men {hen} {skal}.', om: f => !f.tillst && f.arg === true },
    { t: 'Det var i kylan som {namn} {skal}. Ingen har glömt det: {hen} heter {helt}.', om: f => !f.tillst && f.kallt === true },
    { t: 'Bakom ryggen kallar byn {namn} för {binamn}, för alla vet att {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{namn} är {tillstand}, och nu heter {hen} {helt} i allas mun.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Ingen säger det högt när {namn} hör, men alla vet vem {binamn} är: {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Det är inget fint namn, {binamn}. Men {namn} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Barnen härmar {namn} och ropar {binamn}, för {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Vid elden viskar man om {helt}. Alla vet att {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Så fick {namn} sitt namn: {hen} är {tillstand}, och nu är {hen} {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Man fnissar när man säger {helt}, för {namn} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
  ],
  // personen (steg 3.9.2). {alder} = 'ung kvinna', 'gammal man' osv., {drag1} och {drag2} = de egenskaper som sticker ut
  besk_drag2: [
    { t: '{namn} är en {alder}, {drag1} {bind} {drag2}.', om: f => !!f.alder },
    { t: 'De som känner {namn} säger att {hen} är {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: 'En {alder}, {drag1} men också {drag2}: så är {namn}.', om: f => !!f.alder && f.bind === 'men' },
    { t: 'Den som möter {namn} ser en {alder} som är {drag1} {bind} {drag2}.', om: f => !!f.alder },
    { t: '{namn} föddes {drag1}, och {drag2} har {hen} alltid varit.', om: f => !f.syns && f.bind === 'och' },
    { t: 'Man vet var man har {namn}: {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn}, en {alder}, är mer {drag1} än de flesta och lika {drag2}.', om: f => !!f.alder && f.bind === 'och' },
    { t: 'Om {namn} säger man två saker: {hen} är {drag1}, och {hen} är {drag2}.', om: f => !f.syns },
    { t: '{namn} är {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} är {drag1}, men {drag2} är {hen} också.', om: f => !f.syns && f.bind === 'men' },
    { t: '{namn} är bara ett barn men redan {drag1} {bind} {drag2}.', om: f => !f.syns && f.ung === true && !f.liten },
    { t: 'Åren har gjort {namn} till en {alder}, {drag1} {bind} {drag2}.', om: f => f.gammal === true },
    // steg 6.7.7
    { t: '{Drag1} och {drag2}: så beskriver byn {namn}.', om: f => !f.syns && f.bind === 'och' },
    { t: 'Arbetar man bredvid {namn} märker man att {hen} är {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} är {drag1}. {Hen} är också {drag2}.', om: f => !f.syns && f.bind === 'och' },
    { t: 'Två saker vet alla om {namn}: {hen} är {drag1} och {drag2}.', om: f => !f.syns },
    { t: 'Ingen kan säga att {namn} inte är {drag1}, och {drag2} är {hen} med.', om: f => !f.syns },
    { t: '{namn}, {drag1} {bind} {drag2}, är en {alder} som syns i byn.', om: f => !!f.alder },
    { t: 'Redan som barn är {namn} {drag1}, och {drag2} likaså.', om: f => !f.syns && f.ung === true && !f.liten },
    { t: '{namn} har varit {drag1} och {drag2} så länge någon minns.', om: f => !f.syns && f.gammal === true },
  ],
  besk_drag1: [
    { t: '{namn} är en {alder}, {drag1} som få.', om: f => !!f.alder },
    { t: '{namn} är {drag1}, mer än något annat.', om: f => !f.syns },
    { t: 'Det första man märker hos {namn} är att {hen} är {drag1}.', om: f => !f.syns },
    { t: 'En {alder} som är {drag1}: det är {namn}.', om: f => !!f.alder },
    { t: '{namn} har alltid varit {drag1}.', om: f => !f.syns },
    { t: 'Alla vet att {namn} är {drag1}.', om: f => !f.syns },
    { t: 'Om {namn} säger man mest att {hen} är {drag1}.', om: f => !f.syns },
    { t: '{namn}, en {alder}, är {drag1} ut i fingerspetsarna.', om: f => !!f.alder },
    { t: '{namn} är {drag1} ut i fingerspetsarna.', om: f => !f.syns },
    { t: '{namn} är bara ett barn, men redan {drag1}.', om: f => !f.syns && f.ung === true && !f.liten },
    { t: '{namn} är en {alder} och har varit {drag1} i alla sina år.', om: f => f.gammal === true },
  ],
  besk_drag0: [
    { t: '{namn} är en {alder} som inte sticker ut.', om: f => !!f.alder },
    { t: '{namn} är en {alder} som de flesta andra.', om: f => !!f.alder },
    { t: 'Det finns inte mycket att säga om {namn}: en {alder} bland andra.', om: f => !!f.alder },
    { t: '{namn} är en {alder}, varken det ena eller det andra.', om: f => !!f.alder },
    { t: 'En {alder} som går sin egen stilla väg: det är {namn}.', om: f => !!f.alder },
    { t: '{namn} är en vanlig {alder}, och kanske trivs {hen} med det.', om: f => !!f.alder },
    { t: 'Man lägger inte alltid märke till {namn}, en {alder} som andra.', om: f => !!f.alder },
    { t: '{namn} är en {alder} utan stora gåvor och utan stora fel.', om: f => !!f.alder },
    { t: '{namn} sticker inte ut.', om: f => !f.alder },
    { t: '{namn} är som de flesta andra i byn.', om: f => !f.alder },
    { t: '{namn} går sin egen stilla väg.', om: f => !f.alder },
    { t: '{namn} har varken stora gåvor eller stora fel.', om: f => !f.alder },
  ],
  // ett drag som går emot åldern (steg 6.7.2): {trots} = draget, en gammal som är vig eller ett barn som är klokt
  besk_trots: [
    { t: 'Men trots åren är {hen} {trots}.', om: f => f.gammal === true },
    { t: 'Åren har inte tagit det ifrån {honom}: {hen} är fortfarande {trots}.', om: f => f.gammal === true },
    { t: 'Fast {hen} är gammal är {hen} {trots} som en ung.', om: f => f.gammal === true },
    { t: 'Trots sin ålder är {hen} lika {trots} som förr.', om: f => f.gammal === true },
    { t: '{Hen} är ung, men {trots} som en gammal.', om: f => f.ung === true },
    { t: 'Trots att {hen} är så ung är {hen} {trots}.', om: f => f.ung === true },
    { t: 'Redan som barn är {hen} {trots}.', om: f => f.ung === true },
    { t: '{Hen} är bara ett barn, men {trots} som en vuxen.', om: f => f.ung === true },
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
    'Man säger om {honom} att {hen} är {rykte}.',
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
    '{Hen} var {vid} år när {hen} {minne}, och det har {hen} aldrig glömt.',
    '{Hen} bär med sig ett minne från när {hen} var {vid}: {hen} {minne}.',
    'Det är länge sedan, men {hen} {minne} när {hen} var {vid}, och det märks än.',
    'Något hände när {hen} var {vid} år: {hen} {minne}. Det gjorde {honom} till den {hen} är.',
    'Ibland tänker {hen} på när {hen} var {vid}: {hen} {minne}.',
    'Det som formade {honom} mest var när {hen} {minne}, {vid} år gammal.',
    'Ingen som var där har glömt när {hen} {minne}. {Hen} var {vid} år.',
    '{Hen} talar sällan om det, men {hen} {minne} när {hen} var {vid}.',
  ],
  // vem hen är i byn (steg 3.9.7). {ny} = grundade byn på nytt, {kvar} = lever
  besk_grundare: [
    'Det var {namn} och de andra första som grundade byn.',
    '{Hen} var en av dem som slog sig ner här först.',
    'När byn grundades var {namn} med.',
    { t: '{Hen} hör till grundarna: {hen} var här när här inte fanns något.', om: f => f.kvar !== false },
    'Byn finns för att {namn} och de andra slog sig ner vid sjön.',
    { t: '{namn} minns hur det var innan byn fanns, för {hen} var med och grundade den.', om: f => f.kvar !== false },
    'De första stigarna här trampade {namn}.',
    '{Hen} var här från början och såg byn växa fram.',
    { t: '{namn} hittade den tomma boplatsen och grundade byn på nytt.', om: f => f.ny === true },
    { t: 'Byn hade stått tom tills {namn} kom och grundade den på nytt.', om: f => f.ny === true },
  ],
  // skönheten: {del} = det vackra eller fula som syns ('förföriska ögon')
  besk_vacker: [
    '{namn} har {del}, och det vet {hen} om.',
    'Folk ser efter {namn}: {hen} har {del}.',
    'Det man minns hos {namn} är att {hen} har {del}.',
    'Många säger att {namn} är den vackraste i byn, med {del}.',
    { t: '{namn} har {del}, {verkan}.', om: f => !!f.verkan },
    { t: '{Hen} har {del}, {verkan}.', om: f => !!f.verkan },
    { t: 'Det första man ser hos {namn} är {del}, {verkan}.', om: f => !!f.verkan },
    'Ingen kan låta bli att se på {namn}; {hen} har {del}.',
    '{namn} är vacker, med {del}.',
    'Byn talar om att {namn} har {del}.',
  ],
  besk_ful: [
    '{namn} har {del}, och barnen skrattar bakom {hans} rygg.',
    'Det första man ser hos {namn} är att {hen} har {del}.',
    '{Hen} är ingen skönhet: {hen} har {del}.',
    'Med {del} är {namn} lätt att känna igen på långt håll.',
    '{namn} har {del}, men {hen} bryr sig inte om vad de andra säger.',
    'Ingen kallar {namn} vacker; {hen} har {del}.',
    'De som känner {honom} säger att man vänjer sig vid att {hen} har {del}.',
    '{Hen} har {del}, och det har {hen} fått höra.',
  ],
  // {ar} = åldern
  besk_aldst: [
    'Ingen i byn är äldre än {namn}, som är {ar} år.',
    '{namn} är äldst i byn, {ar} år gammal.',
    'Med sina {ar} år är {namn} byns äldsta.',
    '{Hen} har levt längre än alla andra här: {ar} år.',
    'När de unga vill veta hur det var förr frågar de {namn}. {Hen} är {ar} år och äldst i byn.',
    'Byns äldsta är {namn}, {ar} år.',
    '{ar} år har {namn} levt, längre än någon annan i byn.',
    'Ingen har sett så många vintrar som {namn}, som nu är {ar} år.',
  ],
  // {vad} = det hen är känd som ('mästare i snickeri', 'byns första ledare')
  besk_titel: [
    '{Hen} är känd som {vad}.',
    'Byn vet att {hen} är {vad}.',
    'Alla vet vem {namn} är: {vad}.',
    'Det sägs om {namn} att {hen} är {vad}.',
    '{namn} är {vad}, och det är byn stolt över.',
    'Fråga i byn, och du får höra att {hen} är {vad}.',
    'Bland mycket annat är {hen} {vad}.',
    'Byn minns {honom} som {vad}.',
  ],
  // {vad} = det hen uppfann ('lerkrukor och rep')
  besk_uppfann: [
    'Det var {namn} som kom på hur man kan {vad}.',
    '{Hen} var den första som kunde {vad}, och byn har haft nytta av det sedan dess.',
    'Utan {namn} hade ingen i byn kunnat {vad}.',
    'Att {vad}: det var {namn} som kom på det.',
    'Byn har {honom} att tacka för att den kan {vad}.',
    'En dag kom {namn} på hur man kan {vad}. Ingen hade tänkt på det förut.',
    '{Hen} är den som kom på hur man kan {vad}.',
    'Det var i {hans} huvud som konsten att {vad} föddes.',
  ],
  // {vad} = det hen gjorde ('tände byns första eld och fällde byns första träd')
  besk_bedrift: [
    'Byn minns att {hen} {vad}.',
    'Det var {namn} som {vad}.',
    'En gång var det {namn} som {vad}, och det berättar man om än.',
    'Vid elden berättar man hur {namn} {vad}.',
    '{Hen} {vad}, och ingen har glömt det.',
    'Det är {namn} man tänker på när man minns vem som {vad}.',
    'Barnen får höra hur {namn} {vad}.',
    'Byn glömmer inte att {hen} {vad}.',
  ],
  // den döda som stod hen närmast: {dod} = namnet, {vem} = 'mor', 'son', 'hustru', 'vän' …
  besk_sorjer: [
    '{Hen} sörjer {dod}, {hans} {vem}.',
    'Sedan {dod} dog går {hen} tyst omkring.',
    '{Hen} saknar {dod}, {hans} {vem}, och det syns.',
    'Döden tog {dod} ifrån {honom}, och sorgen sitter kvar.',
    'Ibland ser man {honom} stå vid graven efter {dod}.',
    '{dod}, {hans} {vem}, är död, och {hen} har inte kommit över det.',
    'Om kvällarna tänker {hen} på {dod}.',
    'Det är tomt för {honom} sedan {dod} gick bort.',
  ],
  besk_saknar: [
    '{Hen} minns {dod}, {hans} {vem}, som är död.',
    'Ibland talar {hen} om {dod}, {hans} {vem}.',
    '{Hen} har förlorat {dod}, {hans} {vem}.',
    '{dod}, {hans} {vem}, lever inte längre, men {hen} har inte glömt.',
    'Ibland tänker {hen} på {dod}.',
    '{Hen} bär minnet av {dod} med sig.',
    'Det var länge sedan {dod} dog, men {hen} minns.',
    '{Hen} har sett {dod}, {hans} {vem}, dö.',
  ],
  // vapnet hen föredrar: {vad} = vapnet ('flintkniv', 'bara händerna')
  besk_vapenGilla: [
    'I strid tar {hen} helst {vad}.',
    '{Hen} litar mest på {vad} när det blir bråk.',
    'Ge {honom} {vad}, och {hen} är inte rädd för något.',
    'Med {vad} i handen känner {hen} sig trygg.',
    '{Hen} har lärt sig slåss med {vad}.',
    'Blir det strid griper {hen} efter {vad}.',
    '{vad} är {hans} vapen.',
    'Ingen hanterar {vad} som {namn}.',
  ],
  besk_vapenOgilla: [
    '{Hen} litar inte på {vad} i strid.',
    'Med {vad} har {hen} aldrig haft tur.',
    '{Hen} lämnar helst {vad} åt andra när det blir bråk.',
    'Efter det som hänt tar {hen} aldrig {vad} till en strid.',
    '{vad} känns fel i {hans} hand.',
    '{Hen} har förlorat för många gånger med {vad}.',
    'Ge inte {honom} {vad}; {hen} vill hellre ha något annat.',
    '{Hen} slåss sämre med {vad} än med något annat.',
  ],
  // mer ur livet (steg 3.9.8). {foralder} = 'mor' eller 'far', {vad} = 'fem barn'
  besk_barn: [
    '{Hen} är {foralder} till {vad}.',
    '{vad} kallar {honom} {foralder}.',
    '{Hen} har {vad}.',
    'Huset är fullt av {hans} {vad}.',
    'Med {vad} har {hen} alltid någon omkring sig.',
    '{Hen} har fött upp {vad}.',
    'Byn växer tack vare {honom}: {hen} har {vad}.',
    'Det är inte lätt att hålla reda på {hans} {vad}.',
  ],
  besk_foraldralos: [
    '{Hen} förlorade både mor och far som liten.',
    '{Hen} växte upp utan föräldrar.',
    'Både {hans} mor och far dog medan {hen} var barn.',
    'Ingen mor och ingen far fanns kvar när {hen} växte upp.',
    'Byn fick bli {hans} familj när föräldrarna dog.',
    '{Hen} blev föräldralös som liten.',
    'Det var andra som fick ta hand om {honom} när föräldrarna dog.',
    '{Hen} minns knappt sina föräldrar.',
  ],
  besk_forstFodd: [
    '{Hen} var det första barnet som föddes i byn.',
    'Ingen i byn föddes före {honom}.',
    '{Hen} är byns förstfödda.',
    'När {hen} kom till världen var {hen} det första barnet i byn.',
    'Byns första barn var {namn}.',
    '{Hen} var det första nya livet i byn.',
    'Med {honom} började byns barn.',
    'Alla minns när byns första barn kom: det var {namn}.',
  ],
  // {vem} = föräldern som grundade byn, {fo} = 'mor' eller 'far', {barnord} = 'dotter' eller 'son'
  besk_grundarbarn: [
    '{Hen} är {barnord} till {vem}, en av dem som grundade byn.',
    '{vem}, som var med och grundade byn, är {hans} {fo}.',
    'Som {barnord} till {vem} har {hen} byn i blodet.',
    '{Hen} är barn till en av de första: {vem}.',
    'En av byns grundare, {vem}, är {hans} {fo}.',
    '{Hen} föddes in i byn som {vem} var med och grundade.',
    'Byn som {vem} grundade är {hans} arv.',
    '{Hen} är {barnord} till {vem}, och det vet alla.',
  ],
  // {vad} = färdigheten ('jakt', 'hantverk')
  besk_bast: [
    'Ingen i byn är bättre på {vad} än {namn}.',
    '{Hen} är bäst i byn på {vad}.',
    'När det gäller {vad} slår ingen {honom}.',
    'Vill man lära sig {vad} går man till {namn}.',
    'I {vad} har {hen} ingen like i byn.',
    'Byn vet att ingen klarar {vad} bättre än {namn}.',
    'Ingen i byn kan mäta sig med {honom} i {vad}.',
    'Om {vad} vet {hen} mer än någon annan i byn.',
  ],
  // bedrifterna i tal: {vad} = 'tre vargar', 'många gånger', 'två hus'
  besk_vargar: [
    '{Hen} har dödat {vad}.',
    'Vargarna har lärt sig frukta {namn}: {hen} har fällt {vad}.',
    'Med egna händer har {hen} fällt {vad}.',
    'När vargarna kom fällde {hen} {vad}.',
    '{vad} har {namn} fällt i strid.',
    '{Hen} har {vad} på sitt samvete, och byn tackar {honom} för det.',
    'Det är {namn} som har fällt {vad}.',
    'Byn berättar gärna att {namn} har dödat {vad}.',
  ],
  besk_vardat: [
    '{Hen} har vårdat sjuka och skadade {vad}.',
    'Många har {namn} att tacka för att såren läkte.',
    'Det är {namn} man går till när man är sjuk eller skadad.',
    '{Hen} har tagit hand om andra {vad}.',
    '{Hans} händer har lagt om sår {vad}.',
    'Många i byn lever tack vare {hans} vård.',
    '{Hen} har suttit hos de sjuka {vad}.',
    'Byn vet att {namn} tar hand om den som är illa ute.',
  ],
  besk_hus: [
    '{Hen} har byggt {vad} i byn.',
    'Det var {namn} som gjorde färdigt {vad}.',
    '{Hen} har lagt sista handen vid {vad}.',
    'Folk sover under tak som {namn} har byggt.',
    '{Hen} har varit med och byggt {vad}.',
    'Byn har {namn} att tacka för {vad}.',
    'Ett av husen i byn har {hen} byggt med egna händer.',
    'Med sina händer har {hen} rest {vad}.',
  ],
  // {vem} = lärlingen eller läraren (mentorn, steg 3.1.1)
  besk_larare: [
    '{Hen} lär {vem} allt {hen} kan.',
    '{vem} följer {honom} och lär sig.',
    '{Hen} har tagit {vem} under sina vingar.',
    'Det är {namn} som lär upp {vem}.',
    '{vem} ser upp till {honom} och vill bli lika skicklig.',
    '{Hen} har en lärling: {vem}.',
    'Vart {hen} går följer {vem} efter för att lära sig.',
    '{Hen} visar {vem} hur man gör.',
  ],
  besk_larling: [
    '{Hen} lär sig av {vem}.',
    '{vem} är {hans} lärare.',
    '{Hen} följer {vem} och ser hur det görs.',
    '{Hen} ser upp till {vem} och vill bli lika skicklig.',
    '{Hen} går i lära hos {vem}.',
    'Vart {vem} går följer {namn} efter.',
    '{vem} har tagit {honom} under sina vingar.',
    '{Hen} har mycket att lära av {vem}, och vet om det.',
  ],
  // rädslan efter ett vargbett; stark = en kontrast (stark men rädd)
  besk_raddVarg: [
    'Sedan vargen bet {honom} är {hen} rädd för vargar.',
    '{Hen} bär märken efter vargens tänder, och rädslan sitter kvar.',
    'När vargarna ylar kryper {hen} närmare elden.',
    '{Hen} har känt vargens tänder och glömmer det aldrig.',
    'Ett vargbett har gjort {honom} rädd för skogen om natten.',
    'Sedan vargen bet {honom} ser {hen} sig ofta om i skogen.',
    'Bara ordet varg får {honom} att rysa.',
    'Vargen bet {honom} en gång, och {hen} har inte glömt det.',
    { t: 'Stark som {hen} är, blir {hen} ändå rädd när vargarna ylar.', om: f => f.stark === true },
    { t: 'Så stark {hen} är, och ändå rädd för vargar sedan bettet.', om: f => f.stark === true },
  ],
  // {vad} = det hen överlevt ('svält och en hård vinter')
  besk_overlevt: [
    '{Hen} har överlevt {vad}.',
    '{Hen} har klarat sig igenom {vad}.',
    'Livet har inte varit lätt: {hen} har gått igenom {vad}.',
    '{Hen} har överlevt {vad}, och det har gjort {honom} seg.',
    'Det krävs mycket för att knäcka {honom}; {hen} har klarat {vad}.',
    '{Hen} vet hur det är att nästan dö: {hen} har överlevt {vad}.',
    'Byn har sett {honom} klara {vad}.',
    '{Hen} har varit nära döden, men klarat {vad}.',
  ],
  // ägodelarna: {vad} = mästerverkets namn
  besk_mastarverk: [
    '{Hen} äger {vad}, ett mästerverk som hela byn känner.',
    '{vad} är {hans}, och hela byn vet det.',
    'Mästerverket {vad} tillhör {namn}.',
    '{Hen} vaktar {vad} som ögonstenen.',
    'Det är {namn} som äger {vad}.',
    'Alla vet vem {vad} tillhör: {namn}.',
    '{Hen} skulle aldrig skiljas från {vad}.',
    'Av allt {hen} äger är {hen} stoltast över {vad}.',
  ],
  besk_egetHus: [
    '{Hen} har ett eget hus.',
    '{Hen} bor i ett eget hus.',
    'Huset {hen} bor i är {hans} eget.',
    '{Hen} sover under eget tak.',
    '{Hen} har ett hus som är {hans} eget.',
    'Inte alla har ett eget hus, men det har {namn}.',
    'I byn finns ett hus som är {hans}.',
    '{Hen} har eget tak över huvudet.',
  ],
  besk_rik: [
    '{Hen} äger mer än de flesta i byn.',
    '{Hen} är rik.',
    'Få i byn har så mycket som {namn}.',
    '{Hen} har samlat på sig mycket.',
    'Det saknas inget hos {namn}.',
    '{Hen} är en av de rikaste i byn.',
    'Andra tittar avundsjukt på allt {hen} äger.',
    '{Hans} kista är full.',
  ],
  besk_fattig: [
    '{Hen} äger nästan ingenting.',
    '{Hen} är fattig.',
    'Få i byn har så lite som {namn}.',
    '{Hen} har knappt något eget.',
    '{Hen} är en av de fattigaste i byn.',
    'Det {hen} äger ryms i en hand.',
    '{Hen} har aldrig haft mycket.',
    'Väldigt lite av allt i byn är {hans}.',
  ],
  // {titel} = ledarens titel ('Äldste', 'Den vise')
  besk_ledare: [
    '{Hen} leder byn, och man kallar {honom} {titel}.',
    '{Hen} är byns ledare.',
    'Det är {namn} som bestämmer i byn.',
    'När byn ska bestämma något väger {hans} ord tyngst.',
    'Som {titel} leder {hen} byn.',
    '{Hen} har byn i sina händer.',
    'Alla vet vem som leder byn: {namn}, {titel}.',
    'Byn följer {honom}; {hen} är dess ledare.',
  ],
  // {vad} = det byn inte glömt ('har stulit från andra och slagit sitt barn')
  besk_skam: [
    'Byn har inte glömt att {hen} {vad}.',
    'Det sägs att {hen} {vad}.',
    'Det finns en skam i {hans} liv: {hen} {vad}.',
    '{Hen} {vad}, och det hänger kvar vid {honom}.',
    'Folk viskar om att {hen} {vad}.',
    'Man litar inte helt på {honom}, eftersom {hen} {vad}.',
    'Ingen har glömt att {namn} {vad}.',
    'Allt i {hans} liv är inte {hen} stolt över: {hen} {vad}.',
  ],
  // arvet: {vad} = egenskapen ('styrka'), {adj} = 'stark', {fo} = 'fars' eller 'mors', {fo2} = 'far' eller 'mor'
  besk_arv: [
    '{Hen} har sin {fo} {vad}.',
    '{Hen} har fått sin {fo} {vad}.',
    'Alla ser att {hen} har ärvt sin {fo} {vad}.',
    'Sin {fo} {vad} har {hen} fått i arv.',
    'Man känner igen {hans} {fo} {vad} i {honom}.',
    'Precis som {hans} {fo2} är {hen} {adj}.',
    'Folk säger att {hen} är lika {adj} som sin {fo2}.',
    '{Hans} {vad} har {hen} efter sin {fo2}.',
  ],
  // längtan: {vem} = den hen är förälskad i
  besk_langtan: [
    '{Hen} längtar efter {vem}.',
    'I hemlighet tänker {hen} ofta på {vem}.',
    '{Hans} ögon söker sig gärna till {vem}.',
    '{Hen} skulle vilja vara mer än vän med {vem}.',
    'Det är {vem} som {hen} drömmer om.',
    'När {vem} kommer förbi blir {hen} tyst.',
    '{Hen} har ett gott öga till {vem}.',
    'Hjärtat slår fortare hos {honom} när {vem} är nära.',
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
  // eftermälet (steg 6.7.4, m_eftermale): en död beskrivs i dåtid. {orsak} = 'av svält', {arstid}, {ar} = året, {aldern} = åldern
  // med ord; spad = dog innan ett år, ung = under 25, gammal
  e_dog: [
    { t: '{namn} dog {orsak} {arstid} år {ar}, {aldern} år gammal.', om: f => !f.spad },
    { t: '{namn} dog {orsak} {arstid} år {ar}, bara {aldern} år gammal.', om: f => f.ung === true && !f.spad },
    { t: '{namn} hann bli {aldern} år innan {hen} dog {orsak}, {arstid} år {ar}.', om: f => f.gammal === true },
    { t: '{Arstid} år {ar} dog {namn} {orsak}. {Hen} blev {aldern} år.', om: f => !f.spad },
    { t: '{namn} dog {orsak} när {hen} var {aldern} år, {arstid} år {ar}.', om: f => !f.spad },
    { t: '{namn} lever inte längre. {Hen} dog {orsak} {arstid} år {ar}, {aldern} år gammal.', om: f => !f.spad },
    { t: '{namn} levde ett långt liv och dog {orsak} {arstid} år {ar}, {aldern} år gammal.', om: f => f.gammal === true },
    { t: '{Arstid} år {ar} tog döden {namn}: {hen} dog {orsak}, {aldern} år gammal.', om: f => !f.spad },
    { t: '{namn} dog {orsak} {arstid} år {ar}, innan {hen} hunnit fylla ett år.', om: f => f.spad === true },
    { t: '{namn} blev inte ens ett år. {Hen} dog {orsak} {arstid} år {ar}.', om: f => f.spad === true },
  ],
  // vem hen var: {alder} = 'ung kvinna', 'gammal man' (med det som syns framför), {drag1}, {drag2}, {bind} som i besk_drag2
  e_drag2: [
    { t: '{namn} var en {alder}, {drag1} {bind} {drag2}.', om: f => !!f.alder },
    { t: 'En {alder}, {drag1} {bind} {drag2}: så var {namn}.', om: f => !!f.alder },
    { t: 'De som kände {namn} minns att {hen} var {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: 'I livet var {namn} {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: 'Man minns {namn} som {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} var {drag1}, men {drag2} var {hen} också.', om: f => !f.syns && f.bind === 'men' },
    { t: '{namn} var mer {drag1} än de flesta och lika {drag2}.', om: f => !f.syns && f.bind === 'och' },
    { t: 'Alla som kände {namn} visste att {hen} var {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} var {drag1} {bind} {drag2} så länge {hen} levde.', om: f => !f.syns },
  ],
  e_drag1: [
    { t: '{namn} var en {alder}, {drag1} som få.', om: f => !!f.alder },
    { t: 'En {alder} som var {drag1}: sådan var {namn}.', om: f => !!f.alder },
    { t: '{namn} var {drag1}, mer än något annat.', om: f => !f.syns },
    { t: 'Det man minns om {namn} är att {hen} var {drag1}.', om: f => !f.syns },
    { t: '{namn} var {drag1} i hela sitt liv.', om: f => !f.syns },
    { t: 'Alla visste att {namn} var {drag1}.', om: f => !f.syns },
    { t: 'Om {namn} sa man mest att {hen} var {drag1}.', om: f => !f.syns },
    { t: '{namn} var {drag1} ut i fingerspetsarna.', om: f => !f.syns },
  ],
  e_drag0: [
    { t: '{namn} var en {alder} som inte stack ut.', om: f => !!f.alder },
    { t: '{namn} var en {alder} som de flesta andra.', om: f => !!f.alder },
    { t: '{namn} var en {alder} utan stora gåvor och utan stora fel.', om: f => !!f.alder },
    { t: 'En {alder} som gick sin egen stilla väg: det var {namn}.', om: f => !!f.alder },
    { t: '{namn} stack inte ut.', om: f => !f.alder },
    { t: '{namn} var som de flesta andra i byn.', om: f => !f.alder },
    { t: '{namn} gick sin egen stilla väg.', om: f => !f.alder },
    { t: '{namn} hade varken stora gåvor eller stora fel.', om: f => !f.alder },
  ],
  // namnet byn gav, yrket och ryktet: {binamn}, {yrke}, {rykte}
  e_rykte: [
    { t: 'Byn kallade {honom} {binamn}.', om: f => !!f.binamn },
    { t: 'I byn hette {hen} {binamn}, och det minns man än.', om: f => !!f.binamn },
    { t: 'Namnet {binamn} följde {honom} livet ut.', om: f => !!f.binamn },
    { t: '{Hen} arbetade mest som {yrke}, och byn såg {honom} som {rykte}.', om: f => !f.binamn && !!f.yrke && !!f.rykte },
    { t: 'Som {yrke} gjorde {hen} sitt för byn.', om: f => !f.binamn && !!f.yrke && !f.rykte },
    { t: 'Om dagarna var {hen} {yrke}.', om: f => !f.binamn && !!f.yrke && !f.rykte },
    { t: 'Byn såg {honom} som {rykte}.', om: f => !f.binamn && !!f.rykte },
    { t: 'Man minns {honom} som {rykte}.', om: f => !f.binamn && !!f.rykte },
    { t: 'I byns ögon var {hen} {rykte}.', om: f => !f.binamn && !!f.rykte },
  ],
  // sist: att byn minns. lange = mer än BERATT.glomtDygn dygn sedan, barn = hen har levande barn
  e_minns: [
    'Vid elden berättar man fortfarande om {honom}.',
    'Byn har inte glömt {honom}.',
    '{hans} namn lever kvar i byn.',
    'De som var med minns hur det var när {hen} levde.',
    { t: 'Det är länge sedan nu, men några minns {honom} än.', om: f => f.lange === true },
    { t: 'Barnen som föddes efteråt har bara hört talas om {honom}.', om: f => f.lange === true },
    { t: 'Ännu talar man om {honom} vid elden.', om: f => !f.lange },
    { t: 'Saknaden efter {honom} har inte gått över.', om: f => !f.lange },
    { t: '{hans} barn bär minnet av {honom} vidare.', om: f => f.barn === true },
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
    // steg 6.7.7
    { t: '{helt} dog {orsak} {nar}. {Hen} blev {alder} år.', om: f => !!f.nar },
    { t: 'En olycka tog {helt} {nar}. {Hen} blev {alder} år.', om: f => !!f.nar },
    { t: '{helt} kom aldrig tillbaka. {Hen} dog {orsak} {nar}, {alder} år gammal.', om: f => !!f.nar },
    { t: '{helt} dog {orsak}, {alder} år gammal. Mest av alla sörjer {sorjer}.', om: f => !!f.sorjer },
    { t: 'Ingen grät som {sorjer} när {helt} dog {orsak}. {Hen} blev {alder} år.', om: f => !!f.sorjer },
    { t: '{Sorjer} satt länge vid elden efter att {helt} dött {orsak}, {alder} år gammal.', om: f => !!f.sorjer },
    { t: '{helt} dog {orsak} {nar}, {alder} år gammal, och {sorjer} sörjer {honom}.', om: f => !!f.nar && !!f.sorjer },
  ],
  // ett barn som dog innan det fyllt ett år (steg 4.5.1.4): som k_dog, utan åldern
  k_dogSpad: [
    '{helt} dog {orsak}, innan {hen} hunnit fylla ett år.',
    'Byn sörjde när lilla {namn} dog {orsak}. {Hen} blev inte ens ett år.',
    '{namn} fick bara några månader innan {hen} dog {orsak}.',
    'Det var {arstid} när lilla {namn} dog {orsak}.',
    '{helt} är borta. {Hen} dog {orsak} som spädbarn.',
    'En tystnad föll över byn: lilla {namn} dog {orsak}.',
    'Elden brann lågt den kvällen. Lilla {namn} hade dött {orsak}.',
    '{mor} höll {namn} i famnen till slutet. {Hen} dog {orsak}, inte ens ett år gammal.',
    { t: 'Snön föll när lilla {namn} dog {orsak}.', om: f => f.sno === true },
    { t: 'Mitt i natten dog lilla {namn} {orsak}.', om: f => f.natt === true },
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
    '{namn} var den första i byn som kunde {lara}.',
    'Ingen hade gjort det förut: {namn} kom på hur man kan {lara}.',
    'Det var {namn} som först förstod hur man kan {lara}.',
    '{namn} satt länge och funderade. Sedan kom {hen} på hur man kan {lara}.',
    'Nu kan byn {lara}, och det var {namn} som kom på hur.',
    'Det var {arstid} när {namn} kom på hur man kan {lara}.',
    '{namn} prövade och misslyckades, prövade igen, och till sist kunde {hen} {lara}.',
    'Alla kom för att se när {namn} för första gången visade hur man kan {lara}.',
    { t: 'Medan regnet föll kom {namn} på hur man kan {lara}.', om: f => f.regn === true },
    { t: 'En kall dag kom {namn} på hur man kan {lara}.', om: f => f.kallt === true },
  ],
  // {hus2} = huset när {namn} redan nämnts: 'hans hus' i stället för 'Fannbjörns hus' (textminnet, steg 6.7.3)
  k_husKlar: [
    '{Hus} blev {klart}.',
    '{namn} lade den sista biten, och {hus2} stod {klart}.',
    '{namn} lade det sista på plats, och nu var {hus2} {klart}.',
    'Efter mycket arbete stod {hus} {klart}.',
    'Det var {arstid} när {hus} blev {klart}.',
    'Byn samlades och såg på när {namn} gjorde klart {hus2}.',
    '{namn} torkade svetten ur pannan. {Hus2} var {klart}.',
    'Nu stod {hus} {klart}, och byn var lite större.',
    { t: 'Precis före kylan blev {hus} {klart}.', om: f => f.kallt === true },
    { t: 'I regnet gjorde {namn} klart {hus2}, och nu kunde man sitta torrt.', om: f => f.regn === true },
  ],
  k_forstaLedare: [
    '{namn} blev byns första ledare ({titel}).',
    'Byn hade aldrig haft någon som bestämde. Nu blev {namn} den första, och man kallade {honom} {titel}.',
    'De flesta lyssnade redan på {namn}, och nu blev {hen} byns första ledare, {titel}.',
    'Det var {arstid} när byn fick sin första ledare: {namn}, {titel}.',
    'Vid elden bestämdes det: {namn} skulle bli byns första ledare och kallas {titel}.',
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
  // rättegångarna (steg 3.10.17): domen vid elden och hur folket tog den. {ledare} och {lhen} = ledaren, {namn} och {hen} = den
  // dömda, {brott} = "stal en kniv av Ask", {straff} = "skämde ut", {straffInf} = "skämmas ut inför alla"
  r_ratt: [
    'På kvällen samlades byn vid elden. {ledare} {straff} {namn} för att {hen} {brott}.',
    '{ledare} lät {namn} stå fram vid elden och {straff} {honom} för att {hen} {brott}.',
    'Det var {arstid} när {namn} fick svara för att {hen} {brott}. {ledare} {straff} {honom}.',
    '{ledare} satt länge tyst vid elden och tänkte på det {namn} gjort. Till sist bestämde {lhen} sig: {namn} skulle {straffInf}.',
    'Frågan om {namn} togs upp vid elden: {hen} {brott}. {ledare} {straff} {honom}.',
    '{ledare} kallade {namn} till elden. {Hen} {brott}, och {ledare} {straff} {honom} inför byn.',
    'Den kvällen fick {namn} svara inför {ledare} för att {hen} {brott}. Domen blev att {hen} skulle {straffInf}.',
    { t: 'Ryktet hade gått att {namn} {brott}. På kvällen tog {ledare} upp saken, och domen blev att {namn} skulle {straffInf}.', om: f => !f.sjalv },
    { t: '{ledare} hade själv sett när {namn} {brott}. Vid elden fick {namn} sitt straff: {ledare} {straff} {honom}.', om: f => f.sjalv === true },
    { t: 'Regnet föll över elden när {ledare} dömde {namn}. {Hen} {brott}, och {ledare} {straff} {honom}.', om: f => f.regn === true },
    { t: 'Snön föll tyst när {ledare} dömde {namn} för att {hen} {brott}. Domen blev att {hen} skulle {straffInf}.', om: f => f.sno === true },
    { t: 'Det var kallt, och byn trängdes kring elden när {ledare} {straff} {namn} för att {hen} {brott}.', om: f => f.kallt === true && f.eld === true },
    { t: 'Elden hade slocknat, men byn samlades ändå på platsen. {ledare} {straff} {namn} för att {hen} {brott}.', om: f => !f.eld },
    { t: 'Elden sprakade i mörkret när {ledare} {straff} {namn}. {Hen} {brott}.', om: f => f.eld === true && f.natt === true },
  ],
  // varje rättegång är rättvis eller orättvis (falsk, för hård eller för mild mot ledarens nära), eller slutade med döden
  r_folk: [
    { t: 'De flesta tyckte att {namn} fick vad {hen} förtjänade.', om: f => !f.oratt && !f.dog },
    { t: 'Ingen sa emot. Byn tyckte att domen var rättvis.', om: f => !f.oratt && !f.dog },
    { t: 'Folket nickade. Så skulle det vara.', om: f => !f.oratt && !f.dog },
    { t: 'Det blev tyst runt elden, men ingen tyckte att {ledare} hade gjort fel.', om: f => !f.oratt && !f.dog },
    { t: 'Efteråt talade man om domen vid elden, och de flesta höll med {ledare}.', om: f => !f.oratt && !f.dog },
    { t: 'Många hade kommit för att se, och de gick därifrån nöjda med domen.', om: f => !f.oratt && !f.dog && f.manga === true },
    { t: 'Ingen följde {namn} till skogsbrynet. Byn tyckte att {ledare} hade gjort rätt.', om: f => !f.oratt && !f.dog && f.utvisad === true },
    { t: 'Men det som sades om {namn} var inte sant. {Hen} hade inte gjort det, och de som visste det teg.', om: f => f.oratt === true && f.falsk === true && !f.dog },
    { t: 'Senare visade det sig att ryktet om {namn} var falskt. Domen var orättvis, och det kostade {ledare} folkets förtroende.', om: f => f.oratt === true && f.falsk === true && !f.dog },
    { t: 'Många tyckte att straffet var för hårt, och det mumlades om {ledare} länge efteråt.', om: f => f.oratt === true && !f.falsk && f.hard === true && !f.dog },
    { t: 'Familjen till {namn} glömde inte hur hårt {ledare} hade dömt.', om: f => f.oratt === true && !f.falsk && f.hard === true && !f.dog },
    { t: 'Det var för hårt, tyckte byn. Fler än en såg på {ledare} med andra ögon efter den kvällen.', om: f => f.oratt === true && !f.falsk && f.hard === true && !f.dog },
    { t: 'Alla visste att {namn} stod {ledare} nära, och många tyckte att {hen} slapp för lätt undan.', om: f => f.oratt === true && !f.falsk && !f.hard && !f.dog },
    { t: 'Byn mumlade: hade det varit någon annan hade straffet blivit hårdare.', om: f => f.oratt === true && !f.falsk && !f.hard && !f.dog },
    { t: 'Slaget var för hårt. {namn} dog av det, och byn glömde aldrig den kvällen.', om: f => f.dog === true },
    { t: '{namn} reste sig aldrig igen efter slaget. Det var en mörk kväll i byn.', om: f => f.dog === true },
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
  // björnjakten (steg 6.6.6, bjorn.ts)
  k_bjornjakt: [
    '{folk} gick på björnjakt och fällde björnen.{svara}',
    'Det var {arstid} när {folk} gick på björnjakt. De fällde björnen.{svara}',
    'Byn talade länge om björnjakten: {folk} mot björnen, och björnen föll.{svara}',
    'Med spjuten i händerna gick {folk} mot björnen, och de fällde den.{svara}',
    { t: 'I regnet följde {folk} björnens spår och fällde den.{svara}', om: f => f.regn === true },
    'Björnen var stor och stark, men {folk} fällde den.{svara}',
    'Det tog lång tid, men till slut låg björnen död framför {folk}.{svara}',
    'När {folk} kom hem från björnjakten bar de björnen med sig.{svara}',
  ],
  k_bjornjaktMiss: [
    '{folk} gick på björnjakt, men björnen kom undan.{svara}',
    'Det var {arstid} när {folk} gick på björnjakt. Björnen var för stark, och den gick sin väg.{svara}',
    'Björnen stod emot {folk} på björnjakten och kom undan.{svara}',
    'Det blev ingen björn den gången. {folk} fick gå hem utan den.{svara}',
    'Björnen slog sig fri från {folk} och sprang in i skogen.{svara}',
    '{folk} jagade björnen länge, men den var snabbare.{svara}',
    'Björnen tog sig undan, och {folk} gick hem tomhänta.{svara}',
    'Ingen fällde björnen den dagen, fast {folk} försökte.{svara}',
  ],
  k_bjornSprang: [
    '{namn} gick på björnjakt{med}, men björnen hörde dem och försvann in i skogen.',
    'Det var {arstid} när {namn} gick på björnjakt{med}. Björnen gick undan innan de hann fram.',
    'Björnen märkte {namn}{med} på björnjakten och gick sin väg.',
    '{namn} smög efter björnen{med}, men den var borta innan de kom nära.',
    'När {namn} kom fram{med} fanns bara björnens spår kvar.',
    'Björnen var för vaksam. {namn}{med} såg den bara springa sin väg.',
    '{namn} gick på björnjakt{med}, men skogen var tom när de kom fram.',
    'Det blev ingen strid. Björnen hörde {namn}{med} och gav sig av.',
  ],
  k_forstaBjorn: [
    '{namn} dödade byns första björn.',
    'Det var {namn} som fällde byns första björn.',
    'Ingen i byn hade fällt en björn förut. Sedan gjorde {namn} det.',
    'Det var {arstid} när {namn} dödade byns första björn.',
    'Byn hade aldrig fått en björn förut, men {namn} fällde en.',
    'Den första björnen som byn fick, den fällde {namn}.',
    'Länge var björnen det byn var räddast för. Sedan fällde {namn} den första.',
    'Alla i byn kom ut för att se den första björnen. {namn} hade fällt den.',
  ],
  k_bjornAnfall: [
    'En björn anföll {folk}.{svara}',
    'Det var {arstid} när en björn anföll {folk}.{svara}',
    '{folk} kom för nära en björn, och den anföll.{svara}',
    'Byn kommer ihåg dagen då björnen anföll {folk}.{svara}',
    'Björnen kom ur skogen och gick rakt mot {folk}.{svara}',
    'Ingen hade sett björnen förrän den anföll {folk}.{svara}',
    'Björnen reste sig och anföll {folk}.{svara}',
    'Det var en arg björn som anföll {folk}.{svara}',
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
  // mästerverken och de usla sakerna (steg 3.9.4). {saken} = sakens namn i bestämd form, {den} = den/det/de, {pa} = "en vår" osv.
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
  m_konst: [
    '{Den} är smyckad med {konst} som visar {motiv}.',
    '{namn} har {gjort} {motiv} på {saken}.',
    'Den som tittar noga på {saken} ser {konst} som visar {motiv}.',
    'På {saken} finns {konst} av {motiv}, så att ingen ska glömma.',
    '{konst2} på {saken} visar {motiv}.',
    '{namn} ville att byn skulle minnas, och {konst} på {saken} visar {motiv}.',
    'Runt {saken} går {konst} som visar {motiv}.',
    'Den som vill veta vad som hänt i byn kan se på {saken}: {konst} visar {motiv}.',
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
    '{namn} visade {med} vad {om} är för något.',
    '{namn} och {med} pratade om {om}.',
    '{med} frågade {namn} om {om}.',
    '{namn} förklarade {om} för {med}.',
    '{namn} och {med} funderade över {om}.',
    '{namn} lät {med} pröva på {om}.',
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
    '{namn} sa till {med} att det finns {om} på ett ställe {hen} vet.',
    '{namn} och {med} pratade om {om} och var det brukar finnas.',
  ],
  p_langtan: [
    '{namn} sa till {med} att {hen} längtar efter {om}.',
    '{namn} och {med} pratade om hur gott det vore med {om}.',
    '{namn} klagade för {med} att {hen} inte fått {om} på länge.',
    '{namn} och {med} drömde om {om}.',
    '{med} fick höra att {namn} saknar {om}.',
    '{namn} pratade om {om} så att {med} också blev sugen.',
    '{namn} och {med} undrade var de kan få tag på {om}.',
    '{namn} sa att {om} var det {hen} längtade mest efter.',
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
    // steg 6.7.7
    '{namn} och {med} pratade om vem som gjort vad i dag.',
    '{namn} frågade {med} hur det gått, och {med} berättade.',
    '{namn} och {med} pratade om de andra i byn.',
    '{namn} och {med} satt tysta en stund, och sedan pratade de.',
    '{namn} och {med} skrattade åt något som hänt.',
    '{namn} och {med} pratade om vad som ska göras i morgon.',
    { t: '{namn} och {med} pratade om {arstid} och vad den för med sig.', om: f => !!f.arstid },
    { t: 'Det var sent, och {namn} och {med} pratade lågt.', om: f => !!f.natt },
    { t: '{namn} och {med} satt nära elden och pratade om kylan.', om: f => !!f.kallt },
    { t: 'Regnet föll, och {namn} och {med} pratade under taket.', om: f => !!f.regn && !!f.inne },
    { t: '{namn} berättade för {med} om arbetet som {yrke}.', om: f => !!f.yrke },
    { t: '{namn} och {med} pratade om barnen.', om: f => !!f.barn },
  ],
  // relationerna utförligt (steg 3.9.6): vad {namn} tycker om {om}, efter hur nära de är
  r_partner: [
    '{namn} älskar {om}.',
    '{namn} kan inte tänka sig ett liv utan {om}.',
    '{namn} delar allt med {om}.',
    '{namn} litar mer på {om} än på någon annan.',
    '{namn} blir glad bara {om} kommer in.',
    '{namn} och {om} hör ihop.',
    '{namn} saknar {om} så fort de är ifrån varandra.',
    '{namn} har valt {om} för livet.',
  ],
  r_nara: [
    '{namn} tycker mycket om {om}.',
    '{namn} och {om} står varandra nära.',
    '{namn} skulle göra vad som helst för {om}.',
    '{namn} söker sig gärna till {om}.',
    '{namn} litar på {om}.',
    '{namn} och {om} har inga hemligheter för varandra.',
    '{namn} går till {om} när något är svårt.',
    '{namn} saknar {om} när de inte ses.',
    'När {om} är borta ser {namn} ofta bort mot stigen.',
    '{namn} sparar det bästa av maten åt {om}.',
    'Det {namn} tänker säger {namn} först till {om}.',
    '{namn} och {om} sitter ofta bredvid varandra vid elden.',
    // steg 6.7.7
    '{namn} känner sig trygg när {om} är nära.',
    '{namn} och {om} förstår varandra utan många ord.',
    'Blir det bråk ställer sig {namn} alltid på samma sida som {om}.',
    '{namn} kan prata med {om} om allt.',
    'Det syns på {namn} att {om} betyder mycket.',
    { t: '{namn} och {om} har pratat så många gånger att de vet vad den andra ska säga.', om: f => !!f.mycketPrat },
    { t: '{namn} och {om} har slagits sida vid sida, och det glömmer de inte.', om: f => !!f.sida },
    { t: '{namn} och {om} har grälat, men de blev alltid sams igen.', om: f => !!f.gral },
    { t: '{namn} är bara ett barn, men {hen} följer {om} vart {om} än går.', om: f => !!f.ung },
    { t: 'De gamla säger att {namn} och {om} är som syskon.', om: f => !!f.gammal && !f.kin },
    { t: '{namn} blir glad bara {om} sätter sig bredvid.', om: f => !!f.glad },
    { t: 'Barnen de fått tillsammans håller {namn} och {om} nära varandra.', om: f => !!f.barn },
  ],
  r_van: [
    '{namn} tycker om {om}.',
    '{namn} trivs i sällskap med {om}.',
    '{namn} ser {om} som en vän.',
    '{namn} pratar gärna med {om}.',
    '{namn} och {om} kommer bra överens.',
    '{namn} skrattar gärna åt det {om} säger.',
    '{namn} hjälper {om} när det behövs.',
    '{namn} gillar {om}.',
    '{namn} sätter sig gärna bredvid {om} vid elden.',
    '{namn} och {om} har roligt när de arbetar ihop.',
    '{namn} lyssnar när {om} berättar något.',
    '{namn} delar gärna med sig till {om}.',
    // steg 6.7.7
    '{namn} hälsar alltid glatt på {om}.',
    'Med {om} har {namn} lätt att prata.',
    '{namn} och {om} hjälps åt när det behövs.',
    'Det är sällan ett ont ord mellan {namn} och {om}.',
    '{namn} tycker att {om} är bra att ha i byn.',
    { t: '{namn} och {om} har pratat många kvällar vid elden.', om: f => !!f.mycketPrat },
    { t: '{namn} och {om} har slagits sida vid sida.', om: f => !!f.sida },
    { t: '{namn} ser upp till {om} och vill vara i närheten.', om: f => !!f.ung },
    { t: '{namn} skrattar när {om} är i närheten.', om: f => !!f.glad },
    { t: 'Ett gräl har de haft, men {namn} tycker ändå om {om}.', om: f => !!f.gral },
  ],
  r_bekant: [
    '{namn} känner {om} men inte så väl.',
    '{namn} har inget särskilt emot {om}.',
    '{namn} hälsar på {om} men inte mer.',
    '{namn} vet vem {om} är, men de står inte varandra nära.',
    '{namn} pratar med {om} ibland.',
    '{namn} och {om} har inte mycket gemensamt.',
    '{namn} bryr sig inte mycket om {om}, varken åt det ena eller det andra hållet.',
    '{namn} och {om} lever mest var för sig.',
    '{namn} och {om} nickar åt varandra, mer blir det inte.',
    '{namn} vet inte mycket om {om}, och frågar inte heller.',
    'För {namn} är {om} en av de andra i byn, inte mer.',
    '{namn} och {om} har aldrig haft mycket att säga varandra.',
    // steg 6.7.7
    '{namn} vet vad {om} heter, och inte mycket mer.',
    '{namn} och {om} har inte mycket att säga varandra.',
    'Det är sällan {namn} tänker på {om}.',
    '{namn} har inget ont att säga om {om}, och inget gott heller.',
    '{namn} och {om} arbetar ibland nära varandra, men pratar lite.',
    { t: '{namn} och {om} har bara pratat några få gånger.', om: f => !f.mycketPrat && (f.talks as number) > 0 },
    { t: '{namn} och {om} har aldrig pratat med varandra.', om: f => !f.talks },
    { t: '{namn} är för liten för att bry sig om {om}.', om: f => !!f.ung },
    { t: '{namn} har sett {om} växa upp, men de står inte varandra nära.', om: f => !!f.gammal && !!f.omUng },
  ],
  r_ogillar: [
    '{namn} tycker inte om {om}.',
    '{namn} undviker {om} när det går.',
    '{namn} blir på dåligt humör av {om}.',
    '{namn} litar inte på {om}.',
    '{namn} himlar med ögonen åt {om}.',
    '{namn} tycker att {om} är besvärlig.',
    '{namn} och {om} kommer inte överens.',
    '{namn} säger helst inget alls till {om}.',
    '{namn} vänder sig bort när {om} börjar prata.',
    '{namn} suckar när {om} sätter sig vid elden.',
    '{namn} tycker att {om} tar för mycket plats.',
    '{namn} väntar ut {om} hellre än att gå bredvid.',
    // steg 6.7.7
    '{namn} blir trött på {om} fort.',
    '{namn} går hellre åt ett annat håll än bredvid {om}.',
    'Det blir sällan ett vänligt ord från {namn} till {om}.',
    '{namn} lyssnar inte gärna på {om}.',
    { t: '{namn} har grälat med {om} och har inte glömt det.', om: f => !!f.gral },
    { t: '{namn} och {om} har slagits, och det sitter kvar.', om: f => !!f.slag },
    { t: 'Barnet {namn} gömmer sig när {om} kommer.', om: f => !!f.ung },
    { t: '{namn} blir på sämre humör av att se {om}.', om: f => !f.glad },
  ],
  r_ovan: [
    '{namn} kan inte med {om}.',
    '{namn} hatar {om}.',
    '{namn} vill inte ha med {om} att göra.',
    '{namn} ser {om} som en fiende.',
    '{namn} blir arg bara {om} syns.',
    '{namn} och {om} är ovänner.',
    '{namn} har inget gott att säga om {om}.',
    '{namn} går en omväg för att slippa {om}.',
    '{namn} spottar i elden när någon nämner {om}.',
    '{namn} har inte glömt vad {om} gjort, och tänker inte glömma.',
    'Mellan {namn} och {om} finns bara kyla.',
    '{namn} skulle inte räcka {om} vatten, inte ens en varm dag.',
    // steg 6.7.7
    '{namn} vill inte ens se {om}.',
    'Om {namn} fick välja skulle {om} lämna byn.',
    '{namn} tänker på {om} med vrede.',
    '{namn} vänder ryggen till när {om} går förbi.',
    'Det finns ingen frid mellan {namn} och {om}.',
    { t: '{namn} och {om} har slagits, och det kan hända igen.', om: f => !!f.slag },
    { t: '{namn} och {om} grälar så fort de ses.', om: f => !!f.gral },
    { t: '{namn} är bara ett barn, men {hen} är rädd för {om}.', om: f => !!f.ung },
    { t: 'Många vintrar har gått, men {namn} har inte förlåtit {om}.', om: f => !!f.gammal },
  ],
  r_kemiBra: [
    'Det klickade mellan dem från början.',
    'De har alltid haft lätt för varandra.',
    'De har samma sätt att se på saker.',
    'Det var lätt mellan dem från första stund.',
    'De förstår varandra utan många ord.',
    'De drar sig till varandra.',
    'De skrattar åt samma saker.',
    'Det har alltid varit enkelt mellan dem.',
  ],
  r_kemiDalig: [
    'De har haft svårt för varandra från början.',
    'De skaver mot varandra hur de än gör.',
    'De ser på saker på helt olika sätt.',
    'Det har aldrig stämt mellan dem.',
    'De missförstår varandra hela tiden.',
    'De retar sig på varandra.',
    'De har aldrig förstått sig på varandra.',
    'Det har alltid skurit sig mellan dem.',
  ],
  // giftermålen i krönikan (steg 5.4.4, så att berättelsen om tiden borta kan nämna dem). {a} och {b} = paret
  k_gift: [
    '{a} och {b} gifte sig.',
    'Det blev bröllop i byn: {a} och {b} gifte sig.',
    '{a} och {b} lovade att höra ihop livet ut.',
    'Det var {arstid} när {a} och {b} gifte sig.',
    'Byn samlades när {a} och {b} gifte sig.',
    'Efter lång tid tillsammans gifte sig {a} och {b}.',
    { t: 'I snön gifte sig {a} och {b}.', om: f => f.sno === true },
    { t: 'En ljus natt gifte sig {a} och {b}.', om: f => f.natt === true && f.kallt !== true },
  ],
  // berättelsen om tiden borta (steg 5.4.4, ui/borta.ts): kronikans rader binds ihop av de här meningarna.
  // {ar} = antal år (i ord), {fore} och {nu} = invånare när man gick och nu, {fodda} och {doda} = antal (i ord)
  b_lugnt: [
    'Det hände inte mycket. Folket gick till sina sysslor och kom hem till elden.',
    'Byn levde sitt stilla liv medan du var borta.',
    'Ingen dog och ingen föddes. Det var en lugn tid.',
    'Tiden gick, och byn var sig lik.',
    'Det var lugnt i byn medan du var borta.',
    'Inget särskilt hände medan du var borta. Byn arbetade, åt och sov.',
    'Livet i byn gick sin vanliga gång.',
    'Dagarna gick som de brukar i byn, utan något som krönikan behövde minnas.',
    { t: 'Det var kallt, men lugnt i byn medan du var borta.', om: f => f.kallt === true },
  ],
  b_inledning: [
    'Medan du var borta gick {ar} år.',
    '{Ar} år hann gå innan du kom tillbaka.',
    'Du var borta i {ar} år, och mycket hann hända.',
    '{Ar} år gick. När du gick bodde {fore} i byn, och nu bor {nu} där.',
    { t: 'Medan du var borta gick {ar} år. {Fodda} barn föddes och {doda} dog.', om: f => Number(f.foddaTal) > 0 && Number(f.dodaTal) > 0 },
    { t: 'Det blev {ar} år, och byn växte: från {fore} till {nu} invånare.', om: f => Number(f.nuTal) > Number(f.foreTal) },
    { t: 'Det blev {ar} tunga år, och byn krympte: från {fore} till {nu} invånare.', om: f => Number(f.nuTal) < Number(f.foreTal) },
    { t: '{Ar} år gick, och byn är lika stor som när du gick: {nu} invånare.', om: f => f.nuTal === f.foreTal },
    { t: '{Ar} år gick utan att någon dog i byn.', om: f => f.doda === 'ingen' },
  ],
  b_ar: [
    'Året därpå var år {ar}.',
    'Så gick byn in i år {ar}.',
    'Så kom år {ar}.',
    'Sedan började år {ar}.',
    'År {ar}:',
    { t: 'År {ar} blev ett sorgens år.', om: f => Number(f.dodaTal) > 0 },
    { t: 'År {ar} blev ett tungt år för byn.', om: f => Number(f.dodaTal) > 1 },
    { t: 'År {ar} var ett gott år.', om: f => f.dodaTal === 0 && Number(f.foddaTal) > 0 },
    { t: 'År {ar} föddes det barn i byn.', om: f => f.dodaTal === 0 && Number(f.foddaTal) > 1 },
  ],
  b_arLugnt: [
    'Inget stort hände under år {ar}.',
    'År {ar} var stilla. Folket arbetade och åt.',
    'Under år {ar} levde byn som den brukar.',
    'Det var lugnt i byn år {ar}.',
    'År {ar} var ett lugnt år.',
    'Under år {ar} hände inget som krönikan minns.',
    'År {ar} gick stilla förbi.',
    'År {ar} levde byn som vanligt.',
  ],
  b_alder: [
    '{Arstid} varade från år {fran} till {till}.',
    'Sedan följde {arstid}, år {fran} till {till}.',
    'Så kom {arstid}, från år {fran} till {till}.',
    'Under {arstid}, år {fran} till {till}:',
    '{Arstid} kom, och varade från år {fran} till {till}.',
    'Sedan kom {arstid} (år {fran} till {till}).',
    { t: '{Arstid} (år {fran} till {till}) blev en tung tid.', om: f => Number(f.dodaTal) > 1 },
    { t: '{Arstid} (år {fran} till {till}) var en god tid för byn.', om: f => f.dodaTal === 0 && Number(f.foddaTal) > 0 },
    { t: '{Arstid} (år {fran} till {till}) var en lugn tid.', om: f => f.tomt === true },
  ],
  b_ovrigt: [ // {n} = antalet i ord; en (ensam småsak) har egna varianter
    { t: '{N} mindre saker hände också.', om: f => f.n !== 'en' },
    { t: 'Utöver det hände {n} småsaker, som står i krönikan.', om: f => f.n !== 'en' },
    { t: 'Det hände också {n} andra saker, men inget av dem var stort.', om: f => f.n !== 'en' },
    { t: 'Annat, mindre, hände också: {n} saker till.', om: f => f.n !== 'en' },
    { t: '{N} småsaker till står i krönikan.', om: f => f.n !== 'en' },
    { t: 'Till det kom {n} mindre händelser.', om: f => f.n !== 'en' },
    { t: 'Krönikan minns {n} saker till, men de var små.', om: f => f.n !== 'en' },
    { t: 'Det blev också {n} mindre saker att tala om.', om: f => f.n !== 'en' },
    { t: 'Något litet hände också, som står i krönikan.', om: f => f.n === 'en' },
    { t: 'En småsak till står i krönikan.', om: f => f.n === 'en' },
    { t: 'Något mindre hände också.', om: f => f.n === 'en' },
    { t: 'Krönikan minns en sak till, men den var liten.', om: f => f.n === 'en' },
  ],
  b_nu: [
    'Nu bor {antal} människor i byn.',
    'När du kommer tillbaka bor {antal} i byn.',
    'Byn har i dag {antal} invånare.',
    'Nu bor {antal} i byn.',
    { t: 'Nu bor {antal} i byn, och {ledare} leder den.', om: f => !!f.ledare },
    { t: 'I dag bor {antal} i byn. Det är {ledare} som bestämmer.', om: f => !!f.ledare },
    { t: 'Nu bor {antal} i byn, och ingen leder den.', om: f => !f.ledare },
    { t: 'Nu bor {antal} i byn, i {hus}.', om: f => !!f.hus },
    { t: 'Byn har {hus} och {antal} invånare.', om: f => !!f.hus },
  ],
  // berättelsen om en affär med handlaren (steg 5.4.6.2, handelsber.ts): {kund} och {handlare} = namnen, {vara} = det kunden
  // ville ha (eller det hen sålde, salj), {bud} = antal bud i ord, byn = kunden handlade för byn
  h_start: [
    '{Kund} gick fram till {handlare} och ville ha {vara}.',
    '{Kund} hade sett {vara} på filten och ville köpa.',
    '{Kund} satte sig vid filten mitt emot {handlare}. Det var {vara} {kund} ville ha.',
    'Det var {vara} som fick {kund} att gå fram till {handlare}.',
    '{Kund} pekade på {vara} och frågade vad {handlare} ville ha för det.',
    '{Kund} hade länge velat ha {vara}, och nu låg det på filten.',
    { t: '{Kund} gick fram till {handlare} för byns räkning. Byn behövde {vara}.', om: f => f.byn === true && f.salj !== true },
    { t: 'Byn skickade {kund}, och det var {vara} byn ville ha.', om: f => f.byn === true && f.salj !== true },
    { t: '{Kund} hade {vara} över och ville sälja det för silver.', om: f => f.salj === true },
    { t: '{Kund} bar fram {vara} och frågade om {handlare} ville köpa.', om: f => f.salj === true },
  ],
  // ett argument ur registret HANDELSARG (handelsber.ts): {arg} = argumentets id
  h_arg: [
    { t: '{Kund} påpekade att {vara} var slarvigt gjort.', om: f => f.arg === 'slitet' },
    { t: '"Se på det här, det håller inte länge", sa {kund} om {vara}.', om: f => f.arg === 'slitet' },
    { t: 'Det syntes att {vara} inte var väl gjort, och det sa {kund} också.', om: f => f.arg === 'slitet' },
    { t: '{Handlare} visade hur fint {vara} var gjort.', om: f => f.arg === 'fint' },
    { t: '"Sådant arbete hittar du inte i någon by här omkring", sa {handlare}.', om: f => f.arg === 'fint' },
    { t: '{Handlare} lät {kund} känna på {vara}, som var mycket väl gjort.', om: f => f.arg === 'fint' },
    { t: '"Vintern är nära", påminde {handlare}. "Då vill du inte vara utan."', om: f => f.arg === 'vinter' },
    { t: '{Handlare} talade om hösten och om att kölden snart kommer.', om: f => f.arg === 'vinter' },
    { t: 'Löven föll, och {handlare} menade att det inte var läge att pruta inför vintern.', om: f => f.arg === 'vinter' },
    { t: '{Kund} sa att ingen hade något över under istiden.', om: f => f.arg === 'istid' },
    { t: '"Det är istid, vi har knappt nog åt oss själva", sa {kund}.', om: f => f.arg === 'istid' },
    { t: '{Kund} pekade på snön och sa att byn inte hade mycket att ge.', om: f => f.arg === 'istid' },
    { t: '{Handlare} visste att byn saknade {vara}, och sa det rakt ut.', om: f => f.arg === 'behov' },
    { t: '"Ni har inget sådant själva", sa {handlare}. "Det ser jag."', om: f => f.arg === 'behov' },
    { t: '{Handlare} märkte hur mycket {kund} behövde {vara}.', om: f => f.arg === 'behov' },
    { t: '{Handlare} sa att vägen hit hade varit lång.', om: f => f.arg === 'langt' },
    { t: '"Jag har burit det här i många dagar", sa {handlare}.', om: f => f.arg === 'langt' },
    { t: '{Handlare} talade om den långa vägen och om hur tung packningen var.', om: f => f.arg === 'langt' },
    { t: '{Kund} påminde om att de var vänner sedan förra gången.', om: f => f.arg === 'vanner' },
    { t: '"Vi har gjort goda affärer förut, du och jag", sa {kund}.', om: f => f.arg === 'vanner' },
    { t: '{Kund} och {handlare} kände varandra sedan tidigare, och det märktes.', om: f => f.arg === 'vanner' },
    { t: '{Kund} smickrade {handlare} och berömde varorna på filten.', om: f => f.arg === 'smicker' },
    { t: '"Du har de finaste varorna jag sett", sa {kund} med ett leende.', om: f => f.arg === 'smicker' },
    { t: '{Kund} log och talade vänligt, och {handlare} lyssnade.', om: f => f.arg === 'smicker' },
    { t: '{Kund} visste vad saker var värda och pressade priset.', om: f => f.arg === 'skicklig' },
    { t: '{Kund} räknade högt och visade att priset var för högt.', om: f => f.arg === 'skicklig' },
    { t: '{Kund} var van att handla och lät sig inte luras.', om: f => f.arg === 'skicklig' },
    { t: 'De kom bra överens från första stund.', om: f => f.arg === 'kemiGod' },
    { t: '{Kund} och {handlare} skrattade åt samma saker.', om: f => f.arg === 'kemiGod' },
    { t: 'Det var lätt att prata, för de tyckte om varandra.', om: f => f.arg === 'kemiGod' },
    { t: 'Det var något med {kund} som {handlare} inte tyckte om.', om: f => f.arg === 'kemiDalig' },
    { t: 'De hade svårt att förstå varandra.', om: f => f.arg === 'kemiDalig' },
    { t: '{Handlare} såg misstänksamt på {kund} hela tiden.', om: f => f.arg === 'kemiDalig' },
    { t: '{Kund} talade för hela byn och ville ha ett pris som byn kunde betala.', om: f => f.arg === 'byn' },
    { t: '"Det är inte för min egen skull", sa {kund}. "Hela byn behöver det."', om: f => f.arg === 'byn' },
    { t: '{Handlare} blev irriterad över ett bud som var alldeles för lågt.', om: f => f.arg === 'irriterad' },
    { t: '"Försöker du lura mig?" sa {handlare} när budet kom.', om: f => f.arg === 'irriterad' },
    { t: 'Ett av buden var så snålt att {handlare} blev sur.', om: f => f.arg === 'irriterad' },
  ],
  // stämningen: nej = antal nej i ord (nejTal = talet), upp/ner = relationen blev bättre eller sämre
  h_stamning: [
    { t: 'Det gick fort, och ingen behövde höja rösten.', om: f => f.nejTal === 0 },
    { t: 'Det var en lugn förhandling.', om: f => f.nejTal === 0 },
    { t: '{Handlare} nickade nästan direkt.', om: f => f.nejTal === 0 },
    { t: '{Handlare} sa nej {nej} gång, och {kund} fick lägga till lite.', om: f => f.nejTal === 1 },
    { t: 'Det första budet räckte inte, men de var inte långt ifrån varandra.', om: f => f.nejTal === 1 },
    { t: '{Kund} fick höja en gång innan det började likna något.', om: f => f.nejTal === 1 },
    { t: 'Det blev en seg förhandling. {Handlare} sa nej {nej} gånger.', om: f => Number(f.nejTal) > 1 },
    { t: 'De prutade länge, och {handlare} skakade på huvudet {nej} gånger.', om: f => Number(f.nejTal) > 1 },
    { t: '{Kund} lade till och tog bort, bud efter bud.', om: f => Number(f.nejTal) > 1 },
    { t: 'Stämningen blev sämre för varje nej.', om: f => Number(f.nejTal) > 1 && f.ner === true },
  ],
  // hur det slutade: avbruten = de blev inte överens, upp = handlaren tyckte bättre om kunden efteråt
  h_slut: [
    { t: 'Till slut tog de i hand.', om: f => f.avbruten !== true },
    { t: 'Efter {bud} bud var de överens, och de skakade hand.', om: f => f.avbruten !== true && f.bud !== 'ett' },
    { t: 'De blev överens, och {kund} bar hem det.', om: f => f.avbruten !== true },
    { t: 'Det blev en affär, och båda såg nöjda ut.', om: f => f.avbruten !== true && f.upp === true },
    { t: '{Handlare} gick nöjd därifrån och tyckte lite bättre om {kund} efteråt.', om: f => f.avbruten !== true && f.upp === true },
    { t: 'Affären blev av, men ingen av dem log.', om: f => f.avbruten !== true && f.upp !== true },
    { t: 'Efter {bud} bud gav {kund} upp och gick tomhänt.', om: f => f.avbruten === true },
    { t: 'De blev aldrig överens, och {kund} gick därifrån.', om: f => f.avbruten === true },
    { t: '{Kund} reste sig och gick. Det blev ingen affär.', om: f => f.avbruten === true },
    { t: '{Handlare} packade tillbaka {vara}, och {kund} gick hem utan något.', om: f => f.avbruten === true },
  ],
  // berättelsen om ett framträdande (steg 5.4.7.2, framber.ts): {namn} = den som uppträdde, {amne} = vad det handlade om,
  // {inst} = instrumentet (bestämd form), form = formens id, bud = budskapet, {om} = den det handlade om, {ledare}, {betalt}
  f_start: [
    { t: '{Namn} kvad vid elden om {amne}.', om: f => f.form === 'kvade' },
    { t: 'När elden brann som bäst började {namn} kväda om {amne}.', om: f => f.form === 'kvade' },
    { t: '{Namn} reste sig och höll ett tal om {amne}.', om: f => f.form === 'tal' },
    { t: 'Alla tystnade när {namn} började tala om {amne}.', om: f => f.form === 'tal' },
    { t: '{Namn} lärde de andra vad som går att veta om {amne}.', om: f => f.form === 'forelasning' },
    { t: 'Den kvällen fick de andra lära sig om {amne} av {namn}.', om: f => f.form === 'forelasning' },
    { t: 'Med röster och stora rörelser spelade {namn} upp en berättelse om {amne}.', om: f => f.form === 'teater' },
    { t: '{Namn} spelade teater om {amne} och gav varje person en egen röst.', om: f => f.form === 'teater' },
    { t: '{Namn} sjöng om {amne} till {inst}.', om: f => f.form === 'sang' },
    { t: 'Till {inst} sjöng {namn} en sång om {amne}.', om: f => f.form === 'sang' },
    { t: '{Namn} tog fram {inst} och spelade för de andra.', om: f => f.form === 'musik' },
    { t: 'Tonerna från {inst} hördes över byn när {namn} spelade.', om: f => f.form === 'musik' },
  ],
  // budskapet (bara när det fanns ett): bud = person, hylla, hana eller tro; betalt = ledaren betalade
  f_bud: [
    { t: 'Det handlade egentligen om {om}, och alla förstod vad {namn} menade.', om: f => f.bud === 'person' },
    { t: 'Alla visste vem det gällde: {om}.', om: f => f.bud === 'person' },
    { t: '{Namn} lade inte fingrarna emellan när det gällde {om}.', om: f => f.bud === 'person' },
    { t: 'Det var en hyllning till {ledare}, som leder byn.', om: f => f.bud === 'hylla' && !f.betalt },
    { t: '{Namn} lovordade {ledare} inför hela publiken.', om: f => f.bud === 'hylla' && !f.betalt },
    { t: '{Ledare} hade betalat med en {betalt} för att bli hyllad, och det blev {ledare} också.', om: f => f.bud === 'hylla' && !!f.betalt },
    { t: 'Framträdandet var beställt: {ledare} hade gett {namn} en {betalt} för det.', om: f => f.bud === 'hylla' && !!f.betalt },
    { t: '{Namn} drev med {ledare} och härmade sättet att gå.', om: f => f.bud === 'hana' },
    { t: 'Det var inte svårt att höra att det var {ledare} som hånades.', om: f => f.bud === 'hana' },
    { t: '{Namn} gjorde narr av {ledare}, som tror sig vara förmer än de andra.', om: f => f.bud === 'hana' },
    { t: 'Det var tron som låg {namn} varmast om hjärtat.', om: f => f.bud === 'tro' },
    { t: '{Namn} ville att de andra skulle tro som {namn} själv.', om: f => f.bud === 'tro' },
  ],
  // publiken: {n} = hur många i ord, nTal = talet
  f_publik: [
    { t: 'Bara {n} satt och lyssnade.', om: f => f.nTal === 1 },
    { t: 'Publiken var liten, bara en enda.', om: f => f.nTal === 1 },
    { t: 'En enda satt kvar vid elden och lyssnade.', om: f => f.nTal === 1 },
    { t: '{N} satt runt elden och lyssnade.', om: f => Number(f.nTal) > 1 },
    { t: 'Publiken var {n} till antalet.', om: f => Number(f.nTal) > 1 },
    { t: '{N} hade samlats för att lyssna.', om: f => Number(f.nTal) > 1 },
    { t: 'Nästan hela byn var där, {n} stycken.', om: f => Number(f.nTal) > 5 },
    { t: 'De var {n} som lyssnade den kvällen.', om: f => Number(f.nTal) > 1 },
  ],
  // mottagningen: bra = ett gott framträdande, dalig = ett dåligt (annars mitt emellan), form = formens id
  f_mott: [
    { t: 'Publiken skrattade så att det hördes över hela byn.', om: f => f.bra === true && f.form === 'teater' },
    { t: 'Några nynnade med, och någon klappade takten.', om: f => f.bra === true && (f.form === 'sang' || f.form === 'musik') },
    { t: 'Det blev alldeles tyst runt elden, och någon torkade en tår.', om: f => f.bra === true && (f.form === 'kvade' || f.form === 'sang') },
    { t: 'De som lyssnade nickade och höll med.', om: f => f.bra === true && f.form === 'tal' },
    { t: 'De lyssnade noga och ville höra mer.', om: f => f.bra === true && f.form === 'forelasning' },
    { t: 'Efteråt ville alla prata om det.', om: f => f.bra === true },
    { t: 'Det var ett av de bästa framträdandena på länge, och publiken blev glad.', om: f => f.bra === true },
    { t: 'Publiken lyssnade artigt.', om: f => f.bra !== true && f.dalig !== true },
    { t: 'Det var inte märkvärdigt, men ingen klagade.', om: f => f.bra !== true && f.dalig !== true },
    { t: 'Några lyssnade, andra tittade in i elden.', om: f => f.bra !== true && f.dalig !== true },
    { t: 'Det blev tyst på fel sätt, och några tittade bort.', om: f => f.dalig === true },
    { t: 'Publiken skruvade på sig.', om: f => f.dalig === true },
    { t: '{Namn} tappade tråden flera gånger, och publiken tyckte sämre om {namn} efteråt.', om: f => f.dalig === true && f.ner === true },
  ],
  // vad det ledde till (en mening per sak): verkan = hylla, hana, rykte eller tro; {rykte} och {tro} = namnen
  f_verkan: [
    { t: 'Efteråt såg publiken på {ledare} med lite större respekt.', om: f => f.verkan === 'hylla' },
    { t: 'Flera i publiken tyckte lite bättre om {ledare} efter det.', om: f => f.verkan === 'hylla' },
    { t: 'Publiken skrattade åt {ledare}, och {ledare} blev arg på {namn}.', om: f => f.verkan === 'hana' },
    { t: 'Det blev skratt, men {ledare} tyckte inte att det var roligt.', om: f => f.verkan === 'hana' },
    { t: 'Snart visste {rykte} vad {namn} tyckte om {om}.', om: f => f.verkan === 'rykte' },
    { t: 'Efteråt pratade {rykte} om det som sagts om {om}.', om: f => f.verkan === 'rykte' },
    { t: '{Tro} började tro på det {namn} talat om.', om: f => f.verkan === 'tro' },
    { t: 'Efter den kvällen trodde {tro} också.', om: f => f.verkan === 'tro' },
  ],
  // ingen kom (steg 5.4.7.1)
  f_inget: [
    '{Namn} ställde sig vid elden för att uppträda, men ingen kom.',
    '{Namn} väntade på publik, men elden var tom.',
    'Ingen kom för att lyssna på {namn} den kvällen.',
    '{Namn} hade förberett sig, men alla hade annat för sig.',
    'Platsen vid elden förblev tom, och {namn} fick vänta förgäves.',
    'Det blev inget framträdande: ingen kom.',
    '{Namn} såg sig omkring, men ingen satte sig för att lyssna.',
    'Elden sprakade, men ingen kom för att höra {namn}.',
  ],
  // Berättelsen om en match (steg 5.4.8.2, matchber.ts): början efter sporten ({sport} = sporten, {spelare} = namnen, {n} = hur många)
  m_start: [
    { t: '{Spelare} brottades mitt i byn.', om: f => f.sport === 'brottning' },
    { t: 'Det blev brottning i byn, och {spelare} tog tag i varandra.', om: f => f.sport === 'brottning' },
    { t: '{Spelare} drog i var sin ände av repet.', om: f => f.sport === 'dragkamp' },
    { t: 'Det blev dragkamp i byn: {n} drog i repet.', om: f => f.sport === 'dragkamp' },
    { t: '{Spelare} kastade mot målet i tur och ordning.', om: f => f.sport === 'kast' },
    { t: 'Det blev kast mot mål i byn, och {n} ställde upp.', om: f => f.sport === 'kast' },
    { t: '{Spelare} gjorde snöbollar och kastade dem på varandra.', om: f => f.sport === 'snoboll' },
    { t: 'Det blev snöbollskrig i byn, med {n} som kastade.', om: f => f.sport === 'snoboll' },
    { t: '{Spelare} spelade boll i byn.', om: f => f.sport === 'bollspel' },
    { t: 'Det blev bollspel, och {n} sprang efter bollen.', om: f => f.sport === 'bollspel' },
  ],
  // hur matchen gick: jämnt, överlägset eller däremellan, och hur länge den höll på
  m_lopp: [
    { t: 'Det var jämnt länge, och ingen kunde säga vem som skulle vinna.', om: f => f.jamnt === true },
    { t: 'Det böljade fram och tillbaka ända till slutet.', om: f => f.jamnt === true },
    { t: 'Det var så jämnt att det avgjordes på det allra sista.', om: f => f.jamnt === true },
    { t: 'Det höll på länge, och alla var trötta efteråt.', om: f => f.jamnt === true && f.lang === true },
    { t: 'Det var aldrig jämnt.', om: f => f.overlagset === true },
    { t: 'Det var avgjort långt innan det var slut.', om: f => f.overlagset === true },
    { t: 'Det gick fort, och de andra hann knappt börja.', om: f => f.overlagset === true && f.kort === true },
    { t: 'Det var en hård match.', om: f => f.jamnt !== true && f.overlagset !== true },
    { t: 'Det gick fram och tillbaka en stund.', om: f => f.jamnt !== true && f.overlagset !== true },
    { t: 'Det höll på en god stund.', om: f => f.jamnt !== true && f.overlagset !== true && f.kort !== true },
  ],
  // vem som vann: {vinnare}, och {bast} = den som var skickligast. skrall = den svagare vann
  m_vinst: [
    { t: 'Till slut vann {vinnare}, fast {bast} var skickligare.', om: f => f.skrall === true },
    { t: 'Ingen hade trott det, men {vinnare} vann över {bast}.', om: f => f.skrall === true },
    { t: '{Vinnare} vann oväntat, och {bast} fick se sig slagen.', om: f => f.skrall === true },
    { t: 'Det var {vinnare} som vann, som alla hade trott.', om: f => f.skrall !== true && f.favorit === true },
    { t: '{Vinnare} var bäst på planen och vann.', om: f => f.skrall !== true && f.favorit === true },
    { t: '{Vinnare} vann, ingen var förvånad.', om: f => f.skrall !== true && f.favorit === true },
    { t: 'Till slut vann {vinnare}.', om: f => f.skrall !== true },
    { t: 'Det var {vinnare} som vann.', om: f => f.skrall !== true },
    { t: '{Vinnare} vann och såg nöjd ut.', om: f => f.skrall !== true },
  ],
  // efteråt
  m_slut: [
    { t: 'Efteråt var alla på gott humör.', om: f => f.glad === true },
    { t: 'De som spelat skrattade länge åt det efteråt.', om: f => f.glad === true },
    { t: 'De gick därifrån glada och svettiga.', om: f => f.glad === true },
    { t: 'Det pratades om matchen resten av dagen.', om: f => f.glad === true },
    { t: 'Efteråt satte de sig och vilade.', om: f => f.lang === true },
    { t: 'Sedan gick var och en tillbaka till sitt.', om: f => f.glad !== true },
    { t: 'Sedan gick de tillbaka till arbetet.', om: f => f.glad !== true },
    { t: 'Det var en dag som andra.', om: f => f.glad !== true },
  ],
  // matchen som inte blev av: {sport} = sporten, {spelare} = de som kom
  m_installd: [
    { t: '{Spelare} väntade på de andra, men det kom för få för {sportnamn}.', om: f => !!f.spelare },
    { t: '{Spelare} ville ha {sportnamn}, men ingen annan ville vara med.', om: f => !!f.spelare },
    { t: '{Spelare} stod och väntade en god stund, men det kom inte fler.', om: f => !!f.spelare },
    { t: '{Spelare} gav upp till slut: det kom för få för {sportnamn}.', om: f => !!f.spelare },
    'Det blev ingen {sportnamn}: det kom för få.',
    'Det skulle ha blivit {sportnamn}, men det kom för få.',
    'Ingen ville vara med, så det blev ingen {sportnamn}.',
    'Ingen kom. Det blev ingen {sportnamn}.',
  ],
  // ---------- loggens vanligaste rader (steg 6.7.7) ----------
  // Skrivs med loggBer (nedan). Den första varianten är den gamla fasta raden, så att inget fakta försvinner
  l_byte: [ // {namn} fick {fatt} av {med} och gav {betal}; desperat = {namn} höll på att dö
    { t: '{namn} och {med} bytte: {fatt} mot {betal}.', om: f => !f.desperat },
    { t: '{namn} fick {fatt} av {med} och gav {betal} för det.', om: f => !f.desperat },
    { t: '{namn} gav {med} {betal} för {fatt}.', om: f => !f.desperat },
    { t: '{med} lät {namn} få {fatt} mot {betal}.', om: f => !f.desperat },
    { t: '{namn} och {med} kom överens: {fatt} mot {betal}.', om: f => !f.desperat },
    { t: 'Ett byte mellan {namn} och {med}: {fatt} mot {betal}.', om: f => !f.desperat },
    { t: '{namn} och {med} bytte: {fatt} mot {betal}. {namn} höll på att dö.', om: f => !!f.desperat },
    { t: '{namn} höll på att dö och fick {fatt} av {med} mot {betal}.', om: f => !!f.desperat },
  ],
  l_gava: [ // {namn} gav {varor} till {om}; fara = {om} höll på att dö, barn = {om} är ett barn
    { t: '{namn} gav {varor} till {om}.', om: f => !f.fara },
    { t: '{om} fick {varor} av {namn}.', om: f => !f.fara },
    { t: '{namn} lät {om} få {varor}.', om: f => !f.fara },
    { t: '{namn} gav {om} {varor} och bad inte om något tillbaka.', om: f => !f.fara },
    { t: '{namn} gav {varor} till barnet {om}.', om: f => !f.fara && !!f.barn },
    { t: '{namn} gav {varor} till {om}, som höll på att dö.', om: f => !!f.fara },
    { t: '{om} höll på att dö, och {namn} gav {honom2} {varor}.', om: f => !!f.fara },
    { t: '{namn} räckte {om} {varor}.', om: f => !f.fara },
    { t: 'Utan att fråga om något gav {namn} {varor} till {om}.', om: f => !f.fara },
  ],
  l_vanner: [
    '{namn} och {med} har blivit nära vänner.',
    '{namn} och {med} söker sig till varandra nu. De är nära vänner.',
    'Det har vuxit fram en vänskap mellan {namn} och {med}.',
    '{namn} och {med} har blivit goda vänner.',
    'Nu är {namn} och {med} vänner, och det syns.',
    '{namn} har fått en vän i {med}, och {med} i {namn}.',
    '{namn} och {med} har hittat varandra. De är nära vänner nu.',
    'Där {namn} är, där är ofta {med}. De har blivit nära vänner.',
  ],
  l_bastaVanner: [
    '{namn} och {med} har blivit bästa vänner.',
    'Ingen står {namn} så nära som {med}. De är bästa vänner.',
    '{namn} och {med} är bästa vänner nu.',
    'Av alla i byn har {namn} valt {med}. De är bästa vänner.',
    '{namn} och {med} är oskiljaktiga. De har blivit bästa vänner.',
    '{namn} har ingen närmare än {med}, och {med} ingen närmare än {namn}.',
    'Det är {med} som {namn} går till först. De är bästa vänner.',
    '{namn} och {med} delar allt nu. De har blivit bästa vänner.',
  ],
  l_ovanner: [
    '{namn} och {med} har blivit ovänner.',
    'Det har blivit ont blod mellan {namn} och {med}.',
    '{namn} och {med} är inte vänner längre. De är ovänner.',
    '{namn} och {med} går inte ihop. De har blivit ovänner.',
    'Mellan {namn} och {med} är det kallt nu. De är ovänner.',
    '{namn} och {med} vill inte längre se varandra. De är ovänner.',
    'Det som fanns mellan {namn} och {med} är borta. De har blivit ovänner.',
    '{namn} vänder sig bort när {med} kommer. De är ovänner nu.',
  ],
  l_rivaler: [
    '{namn} och {med} har blivit rivaler.',
    '{namn} vill vara bättre än {med}, och {med} vill vara bättre än {namn}. De är rivaler.',
    '{namn} och {med} tävlar om allt nu. De har blivit rivaler.',
    'Det är en tävlan mellan {namn} och {med}. De har blivit rivaler.',
    '{namn} och {med} gör samma arbete, och båda vill vara bäst. De är rivaler.',
    '{namn} håller ögonen på {med}, och {med} på {namn}. De har blivit rivaler.',
    'Mellan {namn} och {med} är det en tävlan nu. De är rivaler.',
    '{namn} vill inte vara sämre än {med}. De har blivit rivaler.',
  ],
  l_arke: [ // {namn} ser {om} som sin ärkefiende
    '{namn} ser nu {om} som sin ärkefiende.',
    'Ingen hatar {namn} som {om}. {om} är {hans} ärkefiende nu.',
    'För {namn} är {om} nu den värsta fienden.',
    '{namn} har bestämt sig: {om} är {hans} ärkefiende.',
    '{namn} hatar {om} mer än någon annan i byn.',
    'Ingen i byn står {namn} så långt ifrån som {om}. {om} är {hans} ärkefiende.',
    '{namn} har en fiende nu, och det är {om}.',
    'Det finns ingen {namn} hatar som {om}. {om} är {hans} ärkefiende.',
  ],
  l_slagsmal: [ // {namn} och {mot} slogs {orsak} ('efter ett gräl'); {vinnare} vann, eller ingen vann (ingen)
    { t: '{namn} och {mot} slogs {orsak}. {vinnare} vann.', om: f => !f.ingen },
    { t: 'Det blev slagsmål {orsak}. {namn} och {mot} slogs, och {vinnare} vann.', om: f => !f.ingen },
    { t: '{namn} och {mot} slogs {orsak}, och {vinnare} gick segrande därifrån.', om: f => !f.ingen },
    { t: '{Orsak} slogs {namn} och {mot}. {vinnare} vann.', om: f => !f.ingen && String(f.orsak).startsWith('efter') },
    { t: 'Mitt i natten slogs {namn} och {mot}. {vinnare} vann.', om: f => !f.ingen && !!f.natt },
    { t: '{namn} och {mot} slogs {orsak}. Ingen vann.', om: f => !!f.ingen },
    { t: '{namn} och {mot} slogs {orsak}, men ingen av dem vann.', om: f => !!f.ingen },
    { t: '{namn} och {mot} slogs {orsak}, och {vinnare} vann.', om: f => !f.ingen },
    { t: 'Ingen av {namn} och {mot} vann när de slogs {orsak}.', om: f => !!f.ingen },
  ],
  l_larm: [ // {namn} ropade larm om {vadtext} ('vargarna kommer'); {n} hörde det, ensam = bara en, falskt = det var inte sant
    { t: '{namn} ropade larm: {vadtext}. {N} hörde det.', om: f => !f.falskt },
    { t: '{namn} ropade att {vadtext}, och {n} hörde ropet.', om: f => !f.falskt && !f.ensam },
    { t: '"{Vadtext}!" ropade {namn}. {N} hörde det.', om: f => !f.falskt },
    { t: 'Ropet från {namn} hördes av {n}: {vadtext}.', om: f => !f.falskt && !f.ensam },
    { t: '{namn} ropade larm, och en hörde det: {vadtext}.', om: f => !f.falskt && !!f.ensam },
    { t: '{namn} ropade falskt larm: {vadtext}. {N} hörde det.', om: f => !!f.falskt },
    { t: '{namn} ropade att {vadtext}, men det var inte sant. {N} hörde det.', om: f => !!f.falskt },
    { t: '{namn} ropade larm. {N} hörde det: {vadtext}.', om: f => !f.falskt },
    { t: '{namn} ropade larm, men det var inget: {vadtext}. {N} hörde det.', om: f => !!f.falskt },
  ],
  l_magsjuk: [
    '{namn} blev magsjuk av skämd mat.',
    'Maten {namn} åt var skämd, och nu har {hen} ont i magen.',
    '{namn} åt något som stod för länge och blev sjuk i magen.',
    'Skämd mat gjorde {namn} magsjuk.',
    '{namn} ligger med ont i magen. Maten var skämd.',
    '{namn} åt skämd mat och blev magsjuk.',
    'Det var något fel på maten, och nu är {namn} magsjuk.',
    '{namn} har ont i magen. Maten {hen} åt var skämd.',
  ],
  l_raMat: [ // {vad} = det som åts ('rå fisk')
    '{namn} blev matförgiftad av {vad}.',
    '{namn} åt {vad} och blev sjuk av det.',
    'Det var {vad} som gjorde {namn} sjuk.',
    '{namn} borde ha grillat maten. Nu är {hen} matförgiftad.',
    '{namn} åt {vad} och blev matförgiftad.',
    '{Vad} var inte bra för {namn}. Nu är {hen} matförgiftad.',
    '{namn} blev sjuk av {vad}.',
    'Maten var rå, och {namn} blev matförgiftad av {vad}.',
  ],
  l_svartSjuk: [
    '{namn} blev svårt sjuk.',
    'En svår sjukdom har drabbat {namn}.',
    '{namn} ligger med feber och orkar inte resa sig.',
    '{namn} är mycket sjuk, och de andra oroar sig.',
    { t: 'Kylan tog {namn}, som blev svårt sjuk.', om: f => !!f.kallt },
    '{namn} har blivit svårt sjuk.',
    '{namn} ligger sjuk, och det är allvarligt.',
    'Sjukdomen har tagit hårt på {namn}.',
  ],
  l_lart: [ // {namn} har lärt sig av {av} att {lara}
    '{namn} har lärt sig av {av} att {lara}.',
    '{av} har lärt {namn} att {lara}.',
    'Nu kan {namn} också {lara}. {av} visade {honom} hur.',
    '{namn} såg på när {av} arbetade, och nu kan {hen} själv {lara}.',
    'Det tog sin tid, men nu kan {namn} {lara}. Det var {av} som lärde {honom}.',
    { t: 'Barnet {namn} har lärt sig av {av} att {lara}.', om: f => !!f.ung },
    '{av} visade {namn} hur man kan {lara}, och nu kan {hen} det.',
    '{namn} kan nu {lara}. {av} lärde {honom}.',
  ],
  l_rykte: [ // {rykte} = vad {namn} sägs vara ('en lögnare'); heder = ett gott rykte
    'Det går rykten om att {namn} är {rykte}.',
    'Folk viskar om att {namn} är {rykte}.',
    'Man säger i byn att {namn} är {rykte}.',
    'Ryktet går: {namn} är {rykte}.',
    { t: 'Det har börjat sägas att {namn} är {rykte}, och det sägs med respekt.', om: f => !!f.heder },
    { t: 'Bakom ryggen på {namn} säger man att {hen} är {rykte}.', om: f => !f.heder },
    'Det sägs att {namn} är {rykte}.',
    'I byn har man börjat säga att {namn} är {rykte}.',
  ],
  l_flinta: [ // {plats} = 'vid stenarna', 'i sanden vid stranden' eller tomt
    { t: '{namn} hittade en flintsten {plats}.', om: f => !!f.plats },
    { t: 'Bland stenarna låg en flinta, och {namn} tog den.', om: f => f.plats === 'vid stenarna' },
    { t: '{namn} fick syn på en flintsten i sanden vid stranden.', om: f => f.plats === 'i sanden vid stranden' },
    { t: '{namn} hittade en flintsten.', om: f => !f.plats },
    { t: 'En flintsten! {namn} hittade den {plats}.', om: f => !!f.plats },
    { t: '{namn} hittade en flinta {plats}.', om: f => !!f.plats },
    { t: '{namn} hittade en flinta.', om: f => !f.plats },
    { t: '{namn} tog upp en flintsten {plats}.', om: f => !!f.plats },
    { t: 'Där {namn} letade låg en flintsten.', om: f => !f.plats },
  ],
  // personens händelser (steg 9.2.108, personlogg.ts): det som läggs till efter händelsen, färgat av personligheten och humöret
  // när det hände. {hen} och {honom} är personen; orolig, modig, glad, nere och talfor är villkoren
  h_ont: [
    { t: 'Det skrämde {honom}.', om: f => f.orolig === true },
    { t: '{Hen} har svårt att släppa det.', om: f => f.orolig === true },
    { t: '{Hen} tar det med fattning.', om: f => f.modig === true },
    { t: '{Hen} biter ihop.', om: f => f.modig === true },
    { t: 'Det tynger {honom}.', om: f => f.nere === true },
    { t: '{Hen} har inte orkat tänka på annat sedan dess.', om: f => f.nere === true },
    { t: '{Hen} försöker se framåt.', om: f => f.glad === true },
    { t: '', om: f => !f.orolig && !f.modig && !f.nere && !f.glad },
  ],
  h_gott: [
    { t: '{Hen} är stolt över det.', om: f => f.modig === true || f.glad === true },
    { t: '{Hen} gläds åt det.', om: f => f.glad === true },
    { t: 'Det lyfte {honom} lite.', om: f => f.nere === true },
    { t: '{Hen} vågar knappt tro att det är sant.', om: f => f.orolig === true },
    { t: '{Hen} har berättat det för alla.', om: f => f.talfor === true },
    { t: 'Det gav {honom} mod.', om: f => f.orolig === true },
    { t: '{Hen} tänker gärna tillbaka på det.', om: f => f.glad === true || f.nere === true },
    { t: '', om: f => !f.orolig && !f.modig && !f.nere && !f.glad && !f.talfor },
  ],
} satisfies Record<string, Variant[]>;
export type MallId = keyof typeof MDEF;
export const BERATTELSER: Record<MallId, Variant[]> = MDEF;

// ---------- att välja och fylla i ----------
// ett tal mellan 0 och 1 ur byns frö och två tal, med berättelsernas egna konstanter (hash3 i slump.ts)
const hash = (a: number, b: number, c: number) => hash3(a, b, c, 0x5bd1e995, 7);
// väljer en variant ur mallen: bara de vars villkor stämmer, och samma nyckel ger alltid samma text
// t: tiden i timmar (en ny text varje timme), eller 0 för en text som står kvar (beskrivningen av en person)
// undvik: en ifylld text som inte passar (beskrivningen undviker samma början två gånger); då tas nästa variant som passar
export function valjVariant(s: State, mall: MallId, nyckel: number, f: Fyllning = {}, t = Math.round(s.now / HOUR), undvik?: (text: string) => boolean) {
  const v = BERATTELSER[mall].filter(x => typeof x === 'string' || x.om(f));
  const i0 = Math.floor(hash(s.seed, nyckel, t) * v.length);
  let x = v[i0];
  if (undvik) for (let k = 0; k < v.length; k++) { const y = v[(i0 + k) % v.length]; if (!undvik(fyll(typeof y === 'string' ? y : y.t, f))) { x = y; break; } }
  const text = typeof x === 'string' ? x : x.t;
  if (textLyssnare) textLyssnare(mall, BERATTELSER[mall].indexOf(x), fyll(text, f), f);
  return text;
}
// verktyget som samlar texterna (npm run texter, steg 4.5.1.1): får varje vald variant (mallen, variantens plats i mallen och
// texten ifylld, och fälten), varje del av en beskrivning (mallen 'del:<id>', plats -1) och hela beskrivningen ('beskrivning').
// Bara i verktyget och testernas vakt (steg 4.5.1.2); spelet sätter den aldrig
let textLyssnare: ((mall: string, i: number, text: string, f: Fyllning) => void) | undefined;
export function lyssnaPaTexter(f: typeof textLyssnare) { textLyssnare = f; }
export function fyll(text: string, f: Fyllning) {
  return text.replace(/\{(\w+)\}/g, (_, k: string, i: number) => {
    const v = f[k] ?? f[k.toLowerCase()];
    let t = v === undefined ? '' : String(v);
    if (k === 'arstid' && text.slice(Math.max(0, i - 8), i) === 'Det var ') t = OBEST[t] ?? t; // "Det var sommar när" (steg 6.7.6)
    return k[0] === k[0].toUpperCase() && k[0] !== k[0].toLowerCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  });
}
export const berattelse = (s: State, mall: MallId, nyckel: number, f: Fyllning = {}) => fyll(valjVariant(s, mall, nyckel, f), f);

// ---------- öknamnen och hedersnamnen (steg 3.9.1) ----------
export interface Binamn { k: IntryckTyp; namn: string; v: number; t: number; skal?: string; tillst?: true } // tillst = inget bevis, bara det byn tycker (steg 6.7.6)
const hen = (p: Person) => p.sex === 'm' ? 'han' : 'hon';
// namnet efter förnamnet: "Ask Lögnaren", "Brand den flitige"
export const heltNamn = (p: Person) => p.binamn ? `${p.name} ${p.binamn.namn}` : p.name;
export const arHeder = (b: Binamn) => INTRYCK[b.k].tecken > 0;
// varför: det starkaste beviset någon i byn har (utan namnet först), annars intryckets ord som ett tillstånd (tillst, steg
// 6.7.6): "är välbärgad", "är en lögnare"
const tillstand = (k: IntryckTyp) => INTRYCK[k].som ?? INTRYCK[k].namn;
function skalTill(s: State, p: Person, k: IntryckTyp): { skal: string; tillst: boolean } {
  let bast: { t: string; v: number } | undefined;
  for (const q of living(s)) {
    const e = intryckOm(q, p.id, k);
    for (const b of e?.bev ?? []) {
      const v = HANDELSER[b.h].vikt + (b.sett ? 0.1 : 0);
      if (!bast || v > bast.v) bast = { t: HANDELSER[b.h].text.replace('{om}', b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något'), v };
    }
  }
  return bast ? { skal: bast.t, tillst: false } : { skal: '', tillst: true };
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
// har en förälder eller ett barn i livet samma namnslut (Torbjörn och Tuskbjörn) kallas ibland den yngre Lill- och den
// äldre Stor- (Lillbjörn, Storbjörn, steg 4.5.4.8). Drar ingen slump
export function lekNamn(s: State, p: Person) {
  const slut = namnSlut(p.name);
  if (!slut || slut.length < 3 || hash(s.seed, p.id, 11) >= BERATT.lekNamn) return undefined;
  const q = living(s).find(x => x !== p && (isParent(x, p) || isParent(p, x)) && namnSlut(x.name) === slut);
  return q ? (p.born > q.born ? 'Lill' : 'Stor') + slut : undefined;
}
export function gebinamn(s: State, p: Person, k: IntryckTyp, v: number) {
  const val = BINAMN[k].namn, i = Math.floor(hash(s.seed, p.id, val.length + k.length) * val.length);
  const namnet = lekNamn(s, p) ?? val[i][p.sex === 'm' ? 0 : 1];
  const { skal, tillst } = skalTill(s, p, k), fore = p.binamn;
  p.binamn = { k, namn: namnet, v, t: s.now, ...(tillst ? { tillst: true as const } : { skal }) };
  const heder = INTRYCK[k].tecken > 0;
  upplev(s, p, heder ? 'hedersnamn' : 'oknamn', namnet); // steg 4.1.1.2
  const f: Fyllning = { namn: p.name, binamn: namnet, helt: heltNamn(p), hen: hen(p), honom: p.sex === 'm' ? 'honom' : 'henne', skal, tillst, tillstand: tillstand(k), kallt: temperature(s) < 0, gamla: living(s).filter(q => ageOf(q, s.now) >= ALDER.gammal).length, arg: !heder && hash(s.seed, p.id, 3) < 0.5 };
  const text = berattelse(s, heder ? 'hedersnamn' : 'oknamn', p.id, f);
  log(s, `${heder ? '🏅' : '🗯️'} ${text}`, 'rel', [p.id]);
  kronika(s, text, heder ? 'hedersnamn' : 'oknamn');
  p.fame.push(`Kallades ${heltNamn(p)}${fore ? ` (förut ${fore.namn})` : ''}`); personHand(s, p, 'titel', `Kallas ${heltNamn(p)}.`);
  count(s, 'binamn'); count(s, heder ? 'hedersnamn' : 'oknamn');
}
// för personrutan: symbolen (heder eller skam) och förklaringen
export function binamnInfo(p: Person) {
  const b = p.binamn;
  if (!b) return undefined;
  return { namn: b.namn, sym: arHeder(b) ? '🏅' : '🗯️', heder: arHeder(b), varfor: `${p.name} ${b.skal ?? `är ${tillstand(b.k)}`}`, intryck: INTRYCK[b.k].namn, bevis: !!b.skal, alive: alive(p) }; // bevis: utan skäl säger varfor bara samma sak igen (steg 6.7.8)
}

// ---------- personen (steg 3.9.2) ----------
// orden för en egenskap som sticker ut: [hög, låg]
const DRAG: Record<Stat, [string, string]> = {
  styrka: ['stark', 'klen'], uthallighet: ['uthållig', 'snabbt trött'], intelligens: ['klok', 'trög i tanken'],
  nyfikenhet: ['nyfiken på allt', 'rädd för det nya'], karisma: ['talför', 'tystlåten'], skonhet: ['vacker', 'ful'],
  flit: ['arbetsam', 'bekväm av sig'], empati: ['varmhjärtad', 'kall'], mod: ['modig', 'rädd av sig'],
  minne: ['minnesgod', 'glömsk'], smidighet: ['vig', 'klumpig'], aggression: ['hetlevrad', 'fridsam'],
};
// tomt för de medelålders: att någon är en man eller en kvinna säger inget (steg 6.7.2); ung, gammal, pojke och flicka gör det
const alderOrd = (a: number, sex: 'm' | 'k') => a < ALDER.vuxen ? (sex === 'm' ? 'pojke' : 'flicka') : a < 25 ? (sex === 'm' ? 'ung man' : 'ung kvinna') : a < ALDER.gammal ? '' : (sex === 'm' ? 'gammal man' : 'gammal kvinna');
// dragens tecken (steg 6.7.2): + bra, − dåligt; tystlåten och fridsam räknas som bra. Två drag med samma tecken binds med och, annars med men
const TECKEN: Record<string, number> = {};
for (const [k, [hog, lag]] of Object.entries(DRAG)) { TECKEN[hog] = k === 'aggression' ? -1 : 1; TECKEN[lag] = k === 'aggression' || k === 'karisma' ? 1 : -1; }
// det som syns står framför åldern ("en vacker kvinna"), och det som går emot åldern får en egen mening
const SYNS = new Set(['vacker', 'ful', 'stark', 'klen']);
const MOT_GAMMAL = new Set(['vig', 'stark', 'uthållig', 'nyfiken på allt']), MOT_UNG = new Set(['klok', 'minnesgod', 'modig']);
const liten = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
// de egenskaper som skiljer sig mest från det vanliga (10), högst två, och bara de som sticker ut (minst BERATT.drag)
// skönheten hos en vuxen som sticker ut mycket har en egen del i beskrivningen (steg 3.9.7)
const skonDel = (s: State, p: Person) => Math.abs(p.pot.skonhet - 10) >= BERATT.skon && ageOf(p, s.now) >= ALDER.vuxen;
function personDrag(s: State, p: Person) {
  return STATS.map(k => [k, p.pot[k] - 10] as const).filter(([k, d]) => Math.abs(d) >= BERATT.drag && !(k === 'skonhet' && skonDel(s, p)))
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
  if (slag === 'v:') return { slag: 'vapen', vad: vad === 'hand' ? 'bara händerna' : liten(sakNamn(vad)), v }; // vapnet hen föredrar (steg 3.7.10)
  return undefined;
}
// upplevelsen som gjorde mest med hen
function starkastUpp(p: Person) {
  let bast: Upplevelse | undefined, bv = 0;
  for (const u of p.upp ?? []) { if (u.k === 'skilsmassa' || u.k === 'gral') continue; const v = Object.values(u.e).reduce((a, x) => a + Math.abs(x ?? 0), 0); if (v > bv) { bv = v; bast = u; } }
  return bast;
}
// Vem hen är i byn (steg 3.9.7): beskrivningen byggs av delar ur registret BESK_DELAR. Varje del har ett villkor (vikt 0
// = gäller inte) och hur mycket den sticker ut (vikt upp till 1). Egenskaperna och åldern kommer alltid först; de fasta
// delarna (grundare, skönheten, äldst i byn) står alltid med när de gäller, och sedan tas de som sticker ut mest. Texten
// blir 2–4 meningar, och en mening längre (5) när det finns mycket att säga. Delarna står i registrets ordning
interface Besk { s: State; p: Person; f: Fyllning; nyck: (i: number) => number; borjan: Set<string>; hors?: boolean; sist?: boolean; andra?: RegExp }
interface BeskDel { id: string; fast?: true; vikt: (b: Besk) => number; text: (b: Besk) => string }
// början på en mening (de två första orden), så att två meningar i samma beskrivning inte börjar likadant
const borjan = (t: string) => t.split(/(?<=[.!?])\s+/).map(x => x.split(' ').slice(0, 2).join(' ').toLowerCase());
// hörsägen (steg 6.7.3, b_sager): "säger", "talar om" står bara en gång i en beskrivning
const HORS = /\bsäger\b|\btalar om\b/;
const mening = (b: Besk, m: MallId, i: number) => {
  const t = namnMinne(b, fyll(valjVariant(b.s, m, b.nyck(i), b.f, 0, x => { const y = namnMinne(b, x, true); return borjan(y).some(z => b.borjan.has(z)) || (!!b.hors && HORS.test(y)); }), b.f));
  for (const y of borjan(t)) b.borjan.add(y);
  if (HORS.test(t)) b.hors = true;
  return t.charAt(0).toUpperCase() + t.slice(1);
};
// textminnet (steg 6.7.3, m_namn): när personen var den som nämndes sist (ingen annan av samma kön sedan) byts namnet först i
// meningen mot hon eller han, efter en preposition mot henne eller honom och i genitiv mot hennes eller hans. Har någon annan av
// samma kön nämnts sedan, byts ett hon eller han först i meningen mot namnet. prov: bara pröva, minnet ändras inte
const PREP = 'av|med|om|till|åt|för|utan|efter|hos|mot|kring|på|vid|från|bredvid|runt';
function namnMinne(b: Besk, text: string, prov = false) {
  const p = b.p, n = p.name, Han = p.sex === 'm' ? 'Han' : 'Hon', honom = p.sex === 'm' ? 'honom' : 'henne', hans = p.sex === 'm' ? 'hans' : 'hennes';
  const fore = '(?<![\\wåäöÅÄÖ])', efter = '(?![\\wåäöÅÄÖ])', ord = (x: string) => new RegExp(fore + x + efter, 'g');
  b.andra ??= ord(`(?:${b.s.people.filter(q => q.sex === p.sex && q.name !== n).map(q => q.name).join('|') || '\u0000'})`);
  const inte = p.binamn ? `(?! ${p.binamn.namn})` : '';
  let sist = b.sist;
  const ut = text.split(/(?<=[.!?])\s+/).map(m => {
    let x = m;
    if (sist) x = x.replace(new RegExp(`^${n}s ${inte}`), `${hans[0].toUpperCase()}${hans.slice(1)} `).replace(new RegExp(`^${n}${efter}${inte}(?!,)`), Han)
      .replace(new RegExp(`${fore}(${PREP}) ${n}${efter}${inte}`, 'g'), `$1 ${honom}`).replace(new RegExp(`${fore}${n}s `, 'g'), `${hans} `);
    else if (sist === false) x = x.replace(new RegExp(`^${Han}${efter}`), n);
    const iP = Math.max(x.lastIndexOf(n), ord('(?:hon|han|henne|honom|hennes|hans|Hon|Han|Hennes|Hans)').test(x) ? 0 : -1);
    let iA = -1; for (const a of x.matchAll(b.andra!)) iA = Math.max(iA, a.index!);
    if (iA >= 0 || iP >= 0) sist = iP > iA;
    return x;
  }).join(' ');
  if (!prov) b.sist = sist;
  return ut;
}
// de viktiga händelserna i hens liv (p.fame): uppfinningarna för sig, namnet byn gav och den höga åldern står i egna delar
const FAME_EGEN = /^(Uppfann|Kallades|Blev \d+ år)/;
const TITEL = /^(Mästare i|Byns första ledare|Mor till)/; // det hen är; resten är det hen gjorde ('Tände byns första eld')
// den döda som stod hen närmast: [personen, vad hen var för hen, sörjer hen nu]
function saknad(s: State, p: Person) {
  let bast: [Person, string, boolean] | undefined;
  for (const q of s.people) {
    if (q.died === undefined || q.id === p.id) continue;
    const r = s.rels[relKey(p.id, q.id)], sorj = p.thoughts.some(t => (t.text === `Sörjer ${q.name}` || t.text.startsWith('Förlorade ') && t.text.endsWith(`, ${q.name}`)) && t.until > s.now); // också förlusten, sorgens första stadium (steg 9.2.33)
    const vem = isParent(q, p) ? (q.sex === 'k' ? 'mor' : 'far') : isParent(p, q) ? (q.sex === 'k' ? 'dotter' : 'son')
      : r?.gift !== undefined || r?.par !== undefined ? (q.sex === 'k' ? 'hustru' : 'man') : sorj ? 'vän' : undefined;
    if (vem && (!bast || (sorj && !bast[2]) || (sorj === bast[2] && q.died > bast[0].died!))) bast = [q, vem, sorj];
  }
  return bast;
}
// det vackraste eller fulaste i ansiktet (steg 5.2.3.3): porträttet sätter det (ui/utseende.ts), så att beskrivningen
// säger det som syns. Utan porträtten (proven utan gränssnitt) väljs ur SKONA
export const BESK_ANSIKTE: { del?: (s: State, p: Person) => string | undefined } = {};
const SKONA: Record<'vacker' | 'ful', string[]> = {
  vacker: ['förföriska ögon', 'ett leende som får folk att stanna upp', 'ett ansikte som folk vänder sig om efter', 'blankt, tjockt hår', 'en röst som man gärna lyssnar på', 'mörka, djupa ögon', 'en hy som lyser i solen', 'ett skratt som smittar'],
  ful: ['en näsa som pekar åt sidan', 'ett ansikte som barnen stirrar på', 'tänder som spretar åt alla håll', 'en käke som en sten', 'små, misstänksamma ögon', 'en röst som skär i öronen', 'öron som står ut', 'en gång som en anka'],
};
// det vackra gör något med dem som ser det (steg 6.7.3, b_vacker): en verkan som passar just den delen, i stället för ett fast slut
const VERKAN: [RegExp, string][] = [
  [/ögonfransar/, 'och den som möter blicken tittar gärna en gång till'],
  [/ögon/, 'och den som möter dem glömmer vad den skulle säga'],
  [/leende/, 'och den som får det blir glad en lång stund'],
  [/röst/, 'och när {hen} sjunger vid elden blir alla tysta'],
  [/hår|kalufs/, 'som barnen gärna vill fläta'],
  [/skratt/, 'och det sprider sig runt elden'],
  [/kinder/, 'som lyser upp även en grå dag'],
  [/hy/, 'och den blir bara vackrare av sommaren'],
  [/ansikte/, 'och främlingar stannar upp när de ser det'],
];
// delen ur SKONA när porträtten saknas: två levande i byn får inte samma, så grannar ser olika ut (de äldre väljer först)
function skonaDel(s: State, p: Person) {
  const sida = p.pot.skonhet > 10 ? 'vacker' : 'ful', l = SKONA[sida], tagna = new Set<number>();
  for (const q of living(s).filter(q => q === p || (skonDel(s, q) && (q.pot.skonhet > 10 ? 'vacker' : 'ful') === sida)).sort((a, c) => a.id - c.id)) {
    let i = Math.floor(hash(s.seed, q.id, 11) * l.length);
    for (let k = 0; k < l.length && tagna.has(i); k++) i = (i + 1) % l.length;
    if (q === p) return l[i];
    tagna.add(i);
  }
  return l[Math.floor(hash(s.seed, p.id, 11) * l.length)];
}
export const BESK_DELAR: BeskDel[] = [
  { id: 'grundare', fast: true, vikt: b => b.p.grundare ? 1 : 0, text: b => mening(b, 'besk_grundare', 10) },
  { id: 'skonhet', fast: true, vikt: b => skonDel(b.s, b.p) ? 1 : 0, text: b => {
    b.f.del = BESK_ANSIKTE.del?.(b.s, b.p) ?? skonaDel(b.s, b.p);
    const v = b.p.pot.skonhet > 10 ? VERKAN.find(([r]) => r.test(String(b.f.del))) : undefined;
    b.f.verkan = v ? v[1].replace('{hen}', hen(b.p)) : undefined;
    return mening(b, b.p.pot.skonhet > 10 ? 'besk_vacker' : 'besk_ful', 11);
  } },
  { id: 'aldst', fast: true, vikt: b => {
    const l = living(b.s);
    if (!alive(b.p) || l.length < BERATT.aldstBy || ageOf(b.p, b.s.now) < ALDER.gammal) return 0;
    return l.every(q => q === b.p || q.born > b.p.born) ? 1 : 0;
  }, text: b => { b.f.ar = Math.floor(ageOf(b.p, b.s.now)); return mening(b, 'besk_aldst', 12); } },
  { id: 'ledare', vikt: b => alive(b.p) && b.s.styre?.ledare === b.p.id ? 0.95 : 0, text: b => { b.f.titel = (b.s.styre?.titel ?? 'ledare').toLowerCase(); return mening(b, 'besk_ledare', 20); } },
  { id: 'namn', vikt: b => b.f.binamn ? 0.9 : b.f.yrke && b.f.rykte ? 0.85 : b.f.rykte ? 0.8 : b.f.yrke ? 0.5 : 0,
    text: b => mening(b, b.f.binamn ? 'besk_binamn' : b.f.yrke && b.f.rykte ? 'besk_yrkeRykte' : b.f.yrke ? 'besk_yrke' : 'besk_rykte', 1) },
  { id: 'titel', vikt: b => titlar(b.p).length ? 0.8 : 0, text: b => { b.f.vad = liten(titlar(b.p)[0]); return mening(b, 'besk_titel', 13); } },
  { id: 'familj', vikt: b => familj(b.s, b.p)?.[1] ?? 0, text: b => { const [m, , f] = familj(b.s, b.p)!; Object.assign(b.f, f); return mening(b, m, 21); } },
  { id: 'bast', vikt: b => !b.f.liten && bastPa(b.s, b.p) ? 0.7 : 0, text: b => { b.f.vad = SKILL_NAMES[bastPa(b.s, b.p)!].toLowerCase(); return mening(b, 'besk_bast', 22); } },
  { id: 'uppfann', vikt: b => uppfann(b.p).length ? 0.75 : 0, text: b => { b.f.vad = och(uppfann(b.p).slice(-3)); return mening(b, 'besk_uppfann', 14); } },
  { id: 'bedrift', vikt: b => bedrifter(b.p).length ? 0.7 : 0, text: b => { b.f.vad = ihop(bedrifter(b.p).slice(-2).map(liten)); return mening(b, 'besk_bedrift', 15); } },
  { id: 'tal', vikt: b => talDel(b.p)?.[1] ?? 0, text: b => { const [m, , vad] = talDel(b.p)!; b.f.vad = vad; return mening(b, m, 23); } },
  { id: 'larare', vikt: b => !b.f.liten && alive(b.p) && laraVem(b.s, b.p) ? 0.5 : 0, text: b => { const [m, q] = laraVem(b.s, b.p)!; b.f.vem = q.name; return mening(b, m, 24); } },
  { id: 'rel', vikt: b => b.f.partner || b.f.van ? 0.6 : 0, text: b => mening(b, b.f.partner && b.f.van ? 'besk_partnerVan' : b.f.partner ? 'besk_partner' : 'besk_van', 2) },
  { id: 'langtan', vikt: b => langtar(b.s, b.p) ? 0.55 : 0, text: b => { b.f.vem = langtar(b.s, b.p)!.name; return mening(b, 'besk_langtan', 25); } },
  { id: 'fiende', vikt: b => b.f.fiende ? 0.65 : 0, text: b => mening(b, 'besk_fiende', 3) },
  { id: 'saknad', vikt: b => { const d = alive(b.p) ? saknad(b.s, b.p) : undefined; return d ? (d[2] ? 0.85 : 0.45) : 0; }, text: b => {
    const [q, vem, sorj] = saknad(b.s, b.p)!;
    b.f.dod = q.name; b.f.vem = vem;
    return mening(b, sorj ? 'besk_sorjer' : 'besk_saknar', 16);
  } },
  { id: 'overlevt', vikt: b => overlevt(b.p).length ? 0.45 + 0.05 * overlevt(b.p).length : 0, text: b => { b.f.vad = och(overlevt(b.p)); return mening(b, 'besk_overlevt', 26); } },
  { id: 'radd', vikt: b => (b.p.liv?.bett ?? 0) > 0 && b.p.pot.mod < BERATT.raddMod ? 0.55 : 0, text: b => { b.f.stark = b.p.pot.styrka >= BERATT.starkRadd; return mening(b, 'besk_raddVarg', 27); } },
  { id: 'arv', vikt: b => arvet(b.s, b.p) ? 0.45 : 0, text: b => {
    const [k, q] = arvet(b.s, b.p)!;
    Object.assign(b.f, { vad: ARV_ORD[k], adj: DRAG[k][0], fo: q.sex === 'k' ? 'mors' : 'fars', fo2: q.sex === 'k' ? 'mor' : 'far' });
    return mening(b, 'besk_arv', 28);
  } },
  { id: 'ago', vikt: b => agodel(b.s, b.p)?.[1] ?? 0, text: b => { const [m, , vad] = agodel(b.s, b.p)!; b.f.vad = vad; return mening(b, m, 29); } },
  { id: 'skam', vikt: b => skammen(b.p).length ? 0.6 : 0, text: b => { b.f.vad = ihop(skammen(b.p)); return mening(b, 'besk_skam', 30); } },
  { id: 'smak', vikt: b => { if (b.f.liten) return 0; const m = smakText(b.p); return m ? 0.3 + 0.3 * Math.abs(m.v) : 0; }, text: b => {
    const m = smakText(b.p)!;
    b.f.vad = m.vad;
    return mening(b, `besk_${m.slag}${m.v > 0 ? 'Gilla' : 'Ogilla'}` as MallId, 4);
  } },
  { id: 'minne', vikt: b => starkastUpp(b.p) ? 0.4 : 0, text: b => {
    const u = starkastUpp(b.p)!;
    b.f.minne = liten(upplevelseText(u)); b.f.vid = u.a;
    return mening(b, 'besk_minne', 5);
  } },
];
// mer ur livet (steg 3.9.8). Familjen: [mallen, vikten, fyllningen], den som sticker ut mest
function familj(s: State, p: Person): [MallId, number, Fyllning] | undefined {
  const barn = s.people.filter(c => c.mother === p.id || c.father === p.id).length, fo = p.sex === 'k' ? 'mor' : 'far';
  if (barn >= BERATT.mangaBarn && !titlar(p).some(x => x.startsWith('Mor till'))) return ['besk_barn', 0.7, { foralder: fo, vad: `${talOrd(barn)} barn` }];
  const mor = byId(s, p.mother ?? -1), far = byId(s, p.father ?? -1), vuxen = p.born + ALDER.vuxen * 24 * HOUR;
  if (mor && far && mor.died !== undefined && far.died !== undefined && Math.max(mor.died, far.died) < vuxen) return ['besk_foraldralos', 0.65, {}];
  if (!p.grundare && s.people.every(q => q.grundare || q.born >= p.born)) return ['besk_forstFodd', 0.6, {}];
  const g = [mor, far].find(q => q?.grundare);
  if (g && !p.grundare) return ['besk_grundarbarn', 0.5, { vem: g.name, fo: g.sex === 'k' ? 'mor' : 'far', barnord: p.sex === 'k' ? 'dotter' : 'son' }];
  return undefined;
}
// färdigheten där hen är bäst bland de vuxna i byn (striden räknas inte), från BERATT.bastSk
function bastPa(s: State, p: Person): Skill | undefined {
  if (!alive(p) || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  const vuxna = living(s).filter(q => q !== p && ageOf(q, s.now) >= ALDER.vuxen);
  let bast: Skill | undefined;
  for (const k of SKILLS) if (k !== 'narstrid' && k !== 'traff' && p.skill[k] >= BERATT.bastSk && vuxna.every(q => q.skill[k] < p.skill[k]) && (!bast || p.skill[k] > p.skill[bast])) bast = k;
  return bast;
}
// bedrifterna i tal (räknade i p.liv när de hände): [mallen, vikten, texten]
const ggrOrd = ganger;
function talDel(p: Person): [MallId, number, string] | undefined {
  const l = p.liv ?? {};
  if (l.vargar) return ['besk_vargar', 0.65 + Math.min(0.2, 0.05 * l.vargar), l.vargar === 1 ? 'en varg' : `${talOrd(l.vargar)} vargar`];
  if (l.hus) return ['besk_hus', 0.55 + Math.min(0.15, 0.05 * l.hus), l.hus === 1 ? 'ett hus' : `${talOrd(l.hus)} hus`];
  if ((l.vardat ?? 0) >= BERATT.vardMin) return ['besk_vardat', 0.55, ggrOrd(l.vardat)];
  return undefined;
}
// läraren (mentorn, steg 3.1.1) eller lärlingen: den unga som har hen som mentor
function laraVem(s: State, p: Person): [MallId, Person] | undefined {
  const m = p.mentor !== undefined ? byId(s, p.mentor) : undefined;
  if (m && alive(m)) return ['besk_larling', m];
  const l = living(s).find(q => q.mentor === p.id);
  return l ? ['besk_larare', l] : undefined;
}
// den hen är förälskad i, när hen inte har någon partner
function langtar(s: State, p: Person) {
  if (!alive(p) || p.partner !== undefined || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  let bast: Person | undefined, br = BERATT.langtan;
  for (const q of living(s)) {
    const r = q !== p ? s.rels[relKey(p.id, q.id)] : undefined;
    if (r && r.rom >= br && ageOf(q, s.now) >= ALDER.vuxen && !isKin(p, q)) { br = r.rom; bast = q; }
  }
  return bast;
}
// det hen överlevt: svält, köld, sjukdom, en svår skada och motgångarna (i tal när det hänt flera gånger)
const OVERLEVT: [string, string, string][] = [['svalt', 'svält', 'svält'], ['frys', 'svår köld', 'svår köld'], ['sjuk', 'en svår sjukdom', 'svåra sjukdomar'], ['skadad', 'en svår skada', 'svåra skador'], ['mg:hardVinter', 'en hård vinter', 'hårda vintrar'], ['mg:torka', 'en torka', 'torkor'], ['mg:oversvamning', 'en översvämning', 'översvämningar'], ['mg:tornado', 'en tornado', 'tornador'], ['mg:brand', 'en eldsvåda', 'eldsvådor']];
function overlevt(p: Person) {
  if (!alive(p)) return [];
  const l = p.liv ?? {};
  return OVERLEVT.filter(([k]) => l[k]).map(([k, ett, fler]) => l[k] === 1 || ett === fler ? (l[k] > 1 ? `${ett} ${talOrd(l[k])} gånger` : ett) : `${talOrd(l[k])} ${fler}`).slice(0, 3);
}
// den egenskap hen har efter en förälder: båda höga (BERATT.drag eller mer). [egenskapen, föräldern]
const ARV_ORD: Record<Stat, string> = { styrka: 'styrka', uthallighet: 'uthållighet', intelligens: 'klokhet', nyfikenhet: 'nyfikenhet', karisma: 'talförhet', skonhet: 'skönhet', flit: 'flit', empati: 'värme', mod: 'mod', minne: 'minne', smidighet: 'smidighet', aggression: 'hetta' };
function arvet(s: State, p: Person): [Stat, Person] | undefined {
  let bast: [Stat, Person, number] | undefined;
  for (const id of [p.mother, p.father]) {
    const q = id !== undefined ? byId(s, id) : undefined;
    if (!q) continue;
    for (const k of STATS) { const v = Math.min(p.pot[k], q.pot[k]) - 10; if (v >= BERATT.drag && (!bast || v > bast[2])) bast = [k, q, v]; }
  }
  return bast && [bast[0], bast[1]];
}
// ägodelarna: ett mästerverk (med namn), annars rik eller fattig, annars eget hus
function agodel(s: State, p: Person): [MallId, number, string?] | undefined {
  if (!alive(p)) return undefined;
  const m = (s.ting ?? []).find(t => t.agare === p.id && t.ber?.namn);
  if (m) return ['besk_mastarverk', 0.65, m.ber!.namn];
  const vuxna = living(s).filter(q => ageOf(q, s.now) >= ALDER.vuxen && q.forv), w = p.forv?.w;
  if (w !== undefined && vuxna.length >= BERATT.aldstBy && ageOf(p, s.now) >= ALDER.vuxen) {
    const l = vuxna.map(q => q.forv!.w).sort((a, b) => a - b), med = l[Math.floor(l.length / 2)];
    if (med > 0 && w >= BERATT.rik * med) return ['besk_rik', 0.5];
    if (med > 0 && w <= BERATT.fattig * med) return ['besk_fattig', 0.5];
  }
  if (s.hus?.some(h => h.ag === p.id && h.klar !== undefined)) return ['besk_egetHus', 0.4];
  return undefined;
}
// skammen: det byn inte glömt
function skammen(p: Person) {
  const l = p.liv ?? {}, ut: string[] = [];
  if (l.stal || p.upp?.some(u => u.k === 'tjuv')) ut.push('har stulit från andra');
  if (l.ran) ut.push('har tagit saker med våld');
  if (l.slogBarn) ut.push('har slagit sitt barn');
  if (p.skam !== undefined) ut.push('har straffats av ledaren');
  return ut.slice(0, 2);
}
const titlar = (p: Person) => p.fame.filter(x => TITEL.test(x));
const uppfann = (p: Person) => p.fame.filter(x => x.startsWith('Uppfann ')).map(x => goraNamn(x.slice(8))); // vad hen kom på: "odla" (ordlagret)
const bedrifter = (p: Person) => p.fame.filter(x => !FAME_EGEN.test(x) && !TITEL.test(x));
// två bedrifter med samma verb säger verbet en gång: 'byggde byns första bord och byns första slaktbänk'
const ihop = (l: string[]) => l.length === 2 && l[0].split(' ')[0] === l[1].split(' ')[0] ? `${l[0]} och ${l[1].split(' ').slice(1).join(' ')}` : och(l);
// eftermälet (steg 6.7.4, m_eftermale): en död beskrivs i dåtid, först döden (e_dog), sedan vem hen var, grundandet, namnet
// byn gav, det hen kom på eller gjorde och sist att byn minns hen. Det som bara passar en levande (smaken, vem hen litar
// på, utseendet när man möter hen) står inte med
function eftermale(s: State, p: Person) {
  const a = Math.floor(ageOf(p, s.now)), k = kalender(s, p.died!);
  let drag = personDrag(s, p), alder = alderOrd(a, p.sex);
  const syns = drag.length === 2 ? drag.find(d => SYNS.has(d)) : undefined;
  if (syns) { alder = `${syns} ${alder || (p.sex === 'm' ? 'man' : 'kvinna')}`; drag = drag.filter(d => d !== syns); }
  if (drag.length === 2 && (TECKEN[drag[0]] ?? 1) < (TECKEN[drag[1]] ?? 1)) drag = [drag[1], drag[0]];
  const bind = drag.length === 2 && (TECKEN[drag[0]] ?? 1) !== (TECKEN[drag[1]] ?? 1) ? 'men' : 'och';
  const by = samlatIntryck(s, p.id)[0];
  const f: Fyllning = { namn: p.name, hen: hen(p), honom: p.sex === 'm' ? 'honom' : 'henne', hans: p.sex === 'm' ? 'hans' : 'hennes', alder, drag1: drag[0], drag2: drag[1], bind, syns: !!syns,
    orsak: p.cause ?? 'av okänd orsak', arstid: ARSTIDER[k.ai], ar: k.ar, aldern: talOrd(a, true), spad: a < 1, ung: a >= 1 && a < 25, gammal: a >= ALDER.gammal, kvar: false,
    binamn: p.binamn?.namn, yrke: p.tag && p.tag !== 'Dagdrivare' ? liten(p.tag) : undefined, rykte: by && by[1] >= BERATT.rykte ? INTRYCK[by[0]].som ?? INTRYCK[by[0]].namn : undefined,
    lange: s.now - p.died! > BERATT.glomtDygn * 24 * HOUR, barn: s.people.some(c => (c.mother === p.id || c.father === p.id) && alive(c)), ny: p.grundare === 'ny' };
  const b: Besk = { s, p, f, nyck: i => p.id * 8 + i, borjan: new Set() };
  const ut = [mening(b, 'e_dog', 40), mening(b, drag.length >= 2 ? 'e_drag2' : drag.length ? 'e_drag1' : 'e_drag0', 41)];
  if (p.grundare) ut.push(mening(b, 'besk_grundare', 10));
  if (f.binamn || f.yrke || f.rykte) ut.push(mening(b, 'e_rykte', 42));
  if (uppfann(p).length) { f.vad = och(uppfann(p).slice(-3)); ut.push(mening(b, 'besk_uppfann', 14)); }
  else if (bedrifter(p).length) { f.vad = ihop(bedrifter(p).slice(-2).map(liten)); ut.push(mening(b, 'besk_bedrift', 15)); }
  ut.push(mening(b, 'e_minns', 43));
  textLyssnare?.('beskrivning', -1, ut.join(' '), f);
  return ut.join(' ');
}
export function beskrivning(s: State, p: Person) {
  if (p.died !== undefined) return eftermale(s, p);
  const a = ageOf(p, s.now), Hen = hen(p), ung = a < ALDER.vuxen, gammal = a >= ALDER.gammal;
  let drag = personDrag(s, p), alder = alderOrd(a, p.sex), trots: string | undefined;
  if (drag.length === 2) { // ett drag som går emot åldern får en egen mening (besk_trots)
    trots = drag.find(d => (gammal && MOT_GAMMAL.has(d)) || (ung && MOT_UNG.has(d)));
    if (trots) drag = drag.filter(d => d !== trots);
  }
  const syns = drag.length === 2 ? drag.find(d => SYNS.has(d)) : undefined;
  if (syns) { alder = `${syns} ${alder || (p.sex === 'm' ? 'man' : 'kvinna')}`; drag = drag.filter(d => d !== syns); }
  if (drag.length === 2 && (TECKEN[drag[0]] ?? 1) < (TECKEN[drag[1]] ?? 1)) drag = [drag[1], drag[0]]; // det bra först: "modig men glömsk"
  const bind = drag.length === 2 && (TECKEN[drag[0]] ?? 1) !== (TECKEN[drag[1]] ?? 1) ? 'men' : 'och';
  const f: Fyllning = { namn: p.name, hen: Hen, honom: p.sex === 'm' ? 'honom' : 'henne', hans: p.sex === 'm' ? 'hans' : 'hennes', alder, drag1: drag[0], drag2: drag[1], bind, trots, syns: !!syns, ung, liten: a < ALDER.vuxen / 2, gammal, kvar: alive(p), ny: p.grundare === 'ny' };
  const b: Besk = { s, p, f, nyck: i => p.id * 8 + i, borjan: new Set() };
  // yrket och vad byn tycker, och relationerna
  const by = samlatIntryck(s, p.id)[0];
  f.yrke = p.tag && p.tag !== 'Dagdrivare' ? liten(p.tag) : undefined;
  f.rykte = by && by[1] >= BERATT.rykte ? INTRYCK[by[0]].som ?? INTRYCK[by[0]].namn : undefined;
  f.gott = by ? INTRYCK[by[0]].tecken > 0 : undefined;
  f.binamn = p.binamn?.namn;
  const namnPa = (id?: number) => { const q = id !== undefined ? byId(s, id) : undefined; return q ? q.name : undefined; };
  f.partner = alive(p) ? namnPa(p.partner) : undefined; f.van = namnPa(p.bast); f.fiende = namnPa(p.arke); f.mentor = namnPa(p.mentor);
  const delar = BESK_DELAR.map((d, i) => ({ d, i, v: d.vikt(b) })).filter(x => x.v > 0);
  const fasta = delar.filter(x => x.d.fast), andra = delar.filter(x => !x.d.fast).sort((x, y) => y.v - x.v || x.i - y.i);
  const max = Math.max(fasta.length, delar.filter(x => x.v >= BERATT.mycket).length >= 5 ? 4 : 3);
  const valda = [...fasta, ...andra].slice(0, max).sort((x, y) => x.i - y.i);
  const ut = [mening(b, drag.length >= 2 ? 'besk_drag2' : drag.length ? 'besk_drag1' : 'besk_drag0', 0), ...trots ? [mening(b, 'besk_trots', 31)] : [], ...valda.map(x => { const t = x.d.text(b); textLyssnare?.('del:' + x.d.id, -1, t, b.f); return t; })];
  if (ut.length < 2) ut.push(mening(b, 'besk_inget', 6));
  textLyssnare?.('beskrivning', -1, ut.join(' '), f);
  return ut.join(' ');
}

// ---------- krönikan (steg 3.9.3) ----------
export const ARSTIDER = ['istiden', 'våren', 'sommaren', 'hösten'];
const OBEST: Record<string, string> = { istiden: 'istid', våren: 'vår', sommaren: 'sommar', hösten: 'höst' };
export { talOrd, och }; // talen och listorna bor i ordlagret (steg 6.7.1)
// en händelse som en liten berättelse i krönikan, med årstiden, vädret och natten (loggen behåller sin korta rad).
// Raden får mallens id som slag, så att den kan hittas utan att läsa texten
// början på en rad utan namnen (ord med stor bokstav): 'Sige prövade och misslyckades' och 'Gunve prövade och …' är samma början
const tre = (x: string) => x.split(/\s+/).filter(o => !/^[A-ZÅÄÖ]/.test(o)).slice(0, 3).join(' ').toLowerCase().replace(/[^a-zåäö ]/g, '');
export function kronikaBer(s: State, mall: MallId, nyckel: number, f: Fyllning) {
  const v = vaderNu(s);
  const g: Fyllning = { arstid: ARSTIDER[kalender(s).ai], kallt: temperature(s) < 0, sno: v.sno, regn: v.lage === 'regn', blast: v.lage === 'blast', natt: !isLight(s.now), ...f };
  // varianten väljs ur nyckeln och timmen; en som börjar som någon av de tre senaste raderna med samma mall hoppas över
  // (textminnet, steg 6.7.3, m_upprepning). Minnet ligger utanför historiken, så att byn blir likadan utan den
  const tm = (s.textminne ??= {}), forra = (tm[mall] ??= []);
  const text = fyll(valjVariant(s, mall, nyckel, g, undefined, x => forra.includes(tre(x))), g);
  forra.push(tre(text)); if (forra.length > 3) forra.shift();
  kronika(s, text, mall);
  return text;
}
// en rad i händelseloggen ur en mall (steg 6.7.7): som kronikaBer, med årstiden, vädret och natten, och raden minns mallen
// (m), så att den kan hittas utan att läsa texten. sam = raden kan samlas med andra av samma slag (SAMLA i folk.ts)
export function loggBer(s: State, mall: MallId, nyckel: number, f: Fyllning, kind: LogEntry['kind'], ids: number[], sam?: Parameters<typeof log>[4]) {
  const v = vaderNu(s);
  const g: Fyllning = { arstid: ARSTIDER[kalender(s).ai], kallt: temperature(s) < 0, sno: v.sno, regn: v.lage === 'regn', natt: !isLight(s.now), ...f };
  const e = log(s, fyll(valjVariant(s, mall, nyckel, g), g), kind, ids, sam);
  if (!e.sam || e.sam.d.length === 1) e.m = mall; else delete e.m;
  return e;
}
// fälten för den som lärt sig något (l_lart)
export const larFalt = (s: State, p: Person): Fyllning => ({ namn: p.name, hen: hen(p), honom: p.sex === 'm' ? 'honom' : 'henne', ung: ageOf(p, s.now) < ALDER.vuxen });
// fälten för en person: namnet, namnet byn gav och hen
export const personFalt = (p: Person): Fyllning => ({ namn: p.name, helt: heltNamn(p), hen: hen(p), honom: p.sex === 'm' ? 'honom' : 'henne' });

// ---------- mästerverken och de usla sakerna (steg 3.9.4) ----------
// När ett mästerverk eller en usel sak blir klar sparas det som berättelsen behöver: görarens humör, årstiden, vädret,
// natten, göraren (g), vem som var nära, vem saken gjordes åt och något om görarens liv just då. Texten skrivs när den visas (sakens
// inforuta), med tiden 0 så att den står kvar. Ett perfekt mästerverk (★) får ett eget namn, och ett vapen som fäller en
// varg minns det (vargdöden i varg.ts); ett perfekt vapen heter sedan Vargdräparen.
export type SakLiv = 'barn' | 'sorg' | 'sjuk' | 'gravid' | 'ledare';
export interface SakMinne { g: number; h: number; ai: number; v?: string; natt?: 1; nara?: number; at?: number; l?: SakLiv; lo?: number; namn?: string; varg?: number; mo?: Motiv } // mo = konsten på saken (steg 4.3.3)
// motivet på ett mästerverk (steg 4.3.3): personen (om, namnet, intrycket) och händelsen (b), om det fanns en; mal = målat
export interface Motiv { om: number; namn: string; k: IntryckTyp; b?: Bevis; mal?: 1 }
type SakGrupp = 'egg' | 'vapen' | 'klad' | 'mobel' | 'redskap';
const PA = ['under istiden', 'en vår', 'en sommar', 'en höst']; // en sommar, inte på sommaren som om varje år (steg 6.7.6)
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
// sakens namn i bestämd form och pronomenet: flintkniven/den, träspjutet/det, skorna av kaninskinn/de (ett plagg av ett
// material, klader.ts: bara plagget får bestämd form)
const NEUTRUM = ['spjut', 'spö', 'bord', 'ställ', 'bälte'];
export function bestamd(namn: string): [string, string] {
  const av = namn.indexOf(' av ');
  if (av > 0) { const [b, h] = bestamd(namn.slice(0, av)); return [b + namn.slice(av).toLowerCase(), h]; }
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
  const sorg = s.people.find(c => c.died !== undefined && s.now - c.died < BERATT.sorgDygn * dag && (c.partner === p.id || c.mother === p.id || c.father === p.id || p.mother === c.id || p.father === c.id)); // den dödes partner står kvar (die() i liv.ts släpper bara den levandes)
  const liv: [SakLiv, number?] | undefined = sorg ? ['sorg', sorg.id] : nytt ? ['barn', nytt.id] : isSick(p, s.now) ? ['sjuk']
    : p.pregnantSince !== undefined ? ['gravid'] : s.styre?.ledare === p.id ? ['ledare'] : undefined;
  if (liv) { m.l = liv[0]; if (liv[1] !== undefined) m.lo = liv[1]; }
  const mo = (t.q ?? 0) >= 4 && sakGrupp(t.k) !== 'klad' && hash(s.seed, t.id, 6) < BERATT.konst ? motiv(s, p) : undefined;
  if (mo) { if (hash(s.seed, t.id, 7) < BERATT.malning) mo.mal = 1; m.mo = mo; }
  if ((t.q ?? 0) >= 5) {
    const ef = EFTERLED[sakGrupp(t.k)], fore = liv?.[0] === 'sorg' || liv?.[0] === 'barn' ? FORLED[liv[0]] : vad ? FORLED[vad as 'sno'] : m.natt ? FORLED.natt
      : m.h >= BERATT.glad ? FORLED.glad : m.h <= BERATT.ledsen ? FORLED.ledsen : FORLED.ai[m.ai];
    m.namn = fore + ef[Math.floor(hash(s.seed, t.id, 4) * ef.length)];
  }
  t.ber = m;
}
// det göraren p minns starkast om en annan, helst en död (den räknas dubbelt): personen och händelsen bakom intrycket
function motiv(s: State, p: Person): Motiv | undefined {
  let bast, b = BERATT.konstMin;
  for (const e of p.intryck ?? []) {
    if (e.om === p.id) continue;
    const q = byId(s, e.om), v = e.v * e.c * (!q || !alive(q) ? 2 : 1);
    if (v > b) { b = v; bast = e; }
  }
  if (!bast) return undefined;
  const mo: Motiv = { om: bast.om, namn: bast.namn, k: bast.k };
  if (bast.bev?.[0]) mo.b = { ...bast.bev[0] };
  return mo;
}
// vad motivet visar: händelsen ("Åsa när hon fällde vargen" blir "hur Åsa fällde en varg"), annars personen och vad hen var
export function motivText(s: State, mo: Motiv) {
  if (mo.b) return 'hur ' + bevisText(mo.b, mo.namn).replace(/\.$/, '');
  const d = INTRYCK[mo.k], q = byId(s, mo.om);
  return `${mo.namn}, som ${q && alive(q) ? 'är' : 'var'} ${d.som ?? d.namn.toLowerCase()}`;
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
  if (!usel && m.mo) ut.push(del('m_konst', 6, { konst: m.mo.mal ? 'en målning' : 'ristningar', konst2: m.mo.mal ? 'Målningen' : 'Ristningarna', gjort: m.mo.mal ? 'målat' : 'ristat', motiv: motivText(s, m.mo) }));
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
export interface Prat { m: number; k: AmneId; i?: string; o?: string; t: number; fr?: number } // fr = den som talade (samma hos båda)
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
    if (a.hunger < KROPP.hungrig + BERATT.hungrigOver) val.push({ k: 'mat' });
    if (a.tag && a.tag !== 'Dagdrivare') { const tg = TAGS.find(g => g.tag === a.tag), sl = tg?.acts.map(k => ACTS[k].slag).find(k => k); val.push({ k: 'arbete', i: sl && slagIkon(sl), o: a.tag.toLowerCase() }); }
    if (s.people.some(c => alive(c) && (c.mother === a.id || c.father === a.id) && ageOf(c, s.now) < ALDER.vuxen)) val.push({ k: 'barn' });
    x = val[Math.floor(hash(s.seed, a.id * 997 + b.id, Math.round(s.now / MIN)) * val.length)];
  }
  const i = x.i ?? AMNEN[x.k].ikon;
  a.prat = { m: b.id, k: x.k, t: s.now, fr: a.id, ...(i ? { i } : {}), ...(x.o ? { o: x.o } : {}) }; // a talar: delar, lär ut, tröstar
  b.prat = { ...a.prat, m: a.id };
  return a.prat;
}
// texten om p:s senaste samtal ("Ask och Ylva pratade om vädret"), eller inget om det är längesedan
export function pratText(s: State, p: Person) {
  const x = p.prat, q = x && byId(s, x.m);
  if (!x || !q || s.now - x.t > BERATT.pratTim * HOUR) return '';
  const [t, l] = (x.fr ?? p.id) === p.id ? [p, q] : [q, p]; // den som talade först, i bådas ruta
  // årstiden och natten från när samtalet hölls, vädret nu (samtalet är högst några timmar gammalt), steg 6.7.7
  const v = vaderNu(s), h = roomAt(s, t.x, t.y);
  const f: Fyllning = { namn: t.name, hen: hen(t), med: l.name, om: x.o ?? '', arstid: ARSTIDER[kalender(s).ai], natt: !isLight(x.t), kallt: temperature(s) < 0, regn: v.lage === 'regn', inne: !!h,
    yrke: t.tag && t.tag !== 'Dagdrivare' ? t.tag.toLowerCase() : undefined, barn: s.people.some(c => alive(c) && (c.mother === t.id || c.father === t.id) && ageOf(c, s.now) < ALDER.vuxen) };
  return fyll(valjVariant(s, `p_${x.k}` as MallId, p.id + q.id, f, Math.round(x.t / MIN)), f);
}

// ---------- relationerna utförligt (steg 3.9.6) ----------
// Ett tryck på en relation i personrutan: vad p tycker om q och varför. Personkemin, vad de varit med om tillsammans
// (samtal, barn, det den äldre lärt den yngre, gräl, slagsmål, lek, strider sida vid sida och gåvor åt båda hållen, Rel.minns)
// och vad p tror om q: intrycken, de hen sett själv och ryktena hen hört (rykten.ts). Texten väljs utan slump (hash)
export function relationText(s: State, p: Person, q: Person, r: Rel): string[] {
  // fälten som varianterna väljer på (steg 6.7.7): åldrarna, humöret, samtalen och det de varit med om tillsammans
  const barnIhop = s.people.some(c => (c.mother === p.id && c.father === q.id) || (c.mother === q.id && c.father === p.id));
  const f: Fyllning = { namn: p.name, om: q.name, hen: hen(p), ung: ageOf(p, s.now) < ALDER.vuxen, gammal: ageOf(p, s.now) >= ALDER.gammal, omUng: ageOf(q, s.now) < ALDER.vuxen,
    glad: moodOf(p, s.now) >= BERATT.glad, talks: r.talks ?? 0, mycketPrat: (r.talks ?? 0) >= BERATT.mycketPrat, sida: !!r.minns?.sida, gral: !!r.minns?.gral, slag: !!r.minns?.slag, barn: barnIhop, kin: isKin(p, q) };
  const mall: MallId = p.partner === q.id ? 'r_partner' : r.op > REL.naraVan ? 'r_nara' : r.op > REL.vanOrd ? 'r_van' : r.op > REL.osams ? 'r_bekant' : r.op > REL.ovan ? 'r_ogillar' : 'r_ovan';
  const nyckel = p.id * 7919 + q.id, ut: string[] = [fyll(valjVariant(s, mall, nyckel, f, 0), f)];
  const sl = slaktOrd(p, q); // släkten först: "Igik är Ylvars far." (steg 6.7.2)
  if (sl) ut.unshift(`${q.name} är ${gen(p.name)} ${sl}.`);
  if (Math.abs(r.chem) >= BERATT.kemi) ut.push(valjVariant(s, r.chem > 0 ? 'r_kemiBra' : 'r_kemiDalig', nyckel, f, 0));
  const ggr = ganger;
  const m = r.minns ?? {}, gjort: string[] = [];
  if (r.talks) gjort.push(`pratat ${ggr(r.talks)}`);
  if (m.sida) gjort.push(`slagits sida vid sida ${ggr(m.sida)}`);
  if (m.lek) gjort.push(`brottats på lek ${ggr(m.lek)}`);
  if (m.gral) gjort.push(`grälat ${ggr(m.gral)}`);
  if (m.slag) gjort.push(`slagits mot varandra ${ggr(m.slag)}`);
  if (gjort.length) ut.push(`De har ${och(gjort)}.`);
  const barn = s.people.filter(c => (c.mother === p.id && c.father === q.id) || (c.mother === q.id && c.father === p.id)).length;
  if (barn) ut.push(`De har ${barn === 1 ? 'ett' : talOrd(barn)} barn tillsammans.`);
  if (r.lart) { const [a, b] = ageOf(p, s.now) > ageOf(q, s.now) ? [p, q] : [q, p]; ut.push(`${a.name} har lärt ${b.name} något ${ggr(r.lart)}.`); }
  const gav = m.gav ?? [0, 0], g = gav[p.id < q.id ? 0 : 1], fick = gav[p.id < q.id ? 1 : 0];
  const gavor = (n: number) => n === 1 ? 'en gåva' : `${talOrd(n)} gåvor`;
  if (g) ut.push(`${p.name} har gett ${q.name} ${gavor(g)}${fick ? ` och fått ${fick === 1 ? 'en' : talOrd(fick)} tillbaka` : ' men aldrig fått något tillbaka'}.`);
  else if (fick) ut.push(`${q.name} har gett ${p.name} ${gavor(fick)}, men ${p.name} har aldrig gett något tillbaka.`);
  // intrycken som meningar (steg 6.7.3, m_intryck): de två starkaste, med vad hen såg eller vem hen hörde det av; lika bevis slås ihop
  const Hen = cap(hen(p)), qHan = hen(q), honomP = p.sex === 'm' ? 'honom' : 'henne';
  for (const e of (p.intryck ?? []).filter(x => x.om === q.id).sort((x, y) => y.v * y.c - x.v * x.c).slice(0, Math.min(2, BERATT.relIntryck))) {
    const t = intryckText(s, e), sjalv = e.src === undefined && !e.led, osaker = e.c < 0.4 ? ', men är inte säker' : '';
    const bev = new Map<string, number>();
    for (const b of e.bev ?? []) { const x = HANDELSER[b.h].text.replace('{om}', b.motNamn === p.name ? honomP : b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något'); bev.set(x, (bev.get(x) ?? 0) + 1); }
    const [vad, n] = [...bev].sort((a, b) => b[1] - a[1])[0] ?? [];
    const gjorde = vad ? `${q.name} ${vad}${n! > 1 ? ` ${ganger(n!)}` : ''}` : undefined;
    if (sjalv) ut.push(gjorde ? `${Hen} har själv sett att ${gjorde} och tycker att ${qHan} är ${t.som}${osaker}.` : `${Hen} tycker att ${q.name} är ${t.som}${osaker}.`);
    else { const fran = byId(s, e.src ?? -1)?.name; ut.push(`${fran ? `Från ${fran}` : 'Från andra'} har ${hen(p)} hört att ${gjorde ?? `${q.name} är ${t.som}`}${osaker}.`); }
  }
  return ut;
}
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// raderna som visas (steg 9.2.108), senaste först: samma slag samma dygn (ett år i spelet) blir en rad, och texten får ett
// tillägg som färgas av personligheten och humöret när det hände. Valet av text följer byns frö och raden, aldrig slumpen
export interface VisadRad { t: number; k: PersonloggId; text: string; alla: string[] }
export function personRader(s: State, p: Person): VisadRad[] {
  const ut: VisadRad[] = [], h = p.hand ?? [];
  for (let i = h.length - 1; i >= 0;) {
    const [t, k] = h[i], dygn = Math.floor(t / (24 * HOUR)), grupp: PersonRad[] = [];
    while (i >= 0 && h[i][1] === k && Math.floor(h[i][0] / (24 * HOUR)) === dygn) grupp.push(h[i--]);
    grupp.reverse();
    const alla = grupp.map(r => r[2]), sist = grupp[grupp.length - 1];
    let text = alla.slice(0, PLOGG.visaHela).join(' ');
    if (alla.length > PLOGG.visaHela) text += ` Och ${alla.length - PLOGG.visaHela} ${alla.length - PLOGG.visaHela === 1 ? 'sak' : 'saker'} till av samma slag det året.`;
    const tillagg = kanslaRad(s, p, k, sist);
    ut.push({ t: sist[0], k, text: tillagg ? `${text} ${tillagg}` : text, alla });
  }
  return ut;
}
function kanslaRad(s: State, p: Person, k: PersonloggId, r: PersonRad) {
  const d: PersonloggSlag = PERSONLOGG[k], ton = typeof d.ton === 'function' ? d.ton(r[2]) : d.ton;
  if (!ton) return '';
  const hum = (r[3] ?? 5) / 9, mod = stat(p, 'mod', r[0]);
  const f = { hen: han(p), honom: honom(p), orolig: mod <= PLOGG.orolig, modig: mod >= PLOGG.modig, talfor: stat(p, 'karisma', r[0]) >= PLOGG.talfor, glad: hum > PLOGG.glad, nere: hum < PLOGG.nere };
  return fyll(valjVariant(s, ton === 'ont' ? 'h_ont' : 'h_gott', p.id * 7919 + Math.round(r[0] / 60), f, 0), f);
}
