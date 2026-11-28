import { balans } from './balans';
import { PERSONLOGG, PLOGG, type PersonloggId, type PersonloggSlag, type PersonRad } from './personlogg';
import { personHand } from './personlogg';
import { ALDER, KROPP, REL, ageOf, alive, byId, count, isKin, isParent, living, log, namnSlut, relKey, stat, vuxnaOf } from './folk';
import { ACTS, Act, slagIkon } from './handlingar';
import { TAGS } from './seder';
import { kronika, tre } from './historik';
import { Bevis, HANDELSER, INTRYCK, IntryckTyp, arvAndel, bevisText, intryckOm, intryckText, foralderRykte, kandVikt, samlatIntryck } from './rykten';
import { SAKER, gruppOf, sakNamn } from './saker';
import { moodOf } from './humor';
import { Hus, housesOf, husById, roomAt } from './byggnad';
import { bedTile, fnId } from './byggnader';
import { bynsMitt } from './omrade';
import { DAY, HOUR, LogEntry, MIN, Person, W, Rel, SKILLS, SKILL_NAMES, STATS, Skill, Stat, State, Upplevelse } from './typer';
import { type UpplevelseTyp, upplev, upplevelseText } from './uppvaxt';
import { isLight, kalender } from './tid';
import { temperature, vaderNu } from './vader';
import { hash3 } from './slump';
import { TEXTLYSS, type TextLyssnare, bestamd, ganger, gen, goraNamn, han, hans, heltOrd, honom, och, slaktOrd, spelTid, talOrd } from './ord';
export { bestamd } from './ord';
import { isSick, SJUKDOMAR } from './sjukdom';
import { harTanke } from './tankar';
import { tamArt } from './tamdjur';
import { LED, legitimitet } from './styre';
import { brinnerNara } from './eld';

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
  delar: 2, // beskrivningen (steg 10.2.52) tar så här många delar, de fasta med, och fyller ut med delar slumpade efter vikten ...
  viktig: 0.85, // ... och en del med så här hög vikt är alltid med (att någon sörjer sin närmaste, binamnet, ledaren)
  utkant: 0.75, utkantHus: 3, // hen bor i utkanten: huset står minst så här långt ut av det längsta husets avstånd från byns mitt, när byn har så här många hus
  verkstadNara: 6, // hen bor mitt emot verkstaden: verkstadshuset står så här nära (rutor mellan väggarna)
  langeHus: 10, // hen har bott länge i sitt hus: hen äger huset hen sover i, och det har stått i så här många dygn
  // mer ur livet (steg 3.9.8)
  mangaBarn: 4, // föräldern nämns med barnen från så här många barn
  bastSk: 10, // bäst i byn på en färdighet räknas från den här nivån (färdigheterna går till 20, mästare vid 16)
  vardMin: 5, // den som vårdat andra så här många gånger nämns för det
  raddMod: 13, // ett vargbett gör den rädd för vargar som har lägre mod än så här
  starkRadd: 14, // ... och styrkan där hen kallas stark men rädd
  rik: 2, // rik med så här många gånger byns median (rikedomen i humor.ts), fattig med den här delen eller mindre:
  fattig: 0.4,
  mycketPrat: 20, // två som pratat så här många gånger har pratat mycket (relationerna, steg 6.7.7)
  yngreLarare: 5, // den som lär någon som är så här många år äldre (steg 15.1.117)
  aldersSkillnad: 20, // två vänner med så här många års skillnad i ålder (steg 15.1.117)
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
  bildHandelse: 2, // ett intryck med en händelse bakom väger så här mycket mer som motiv, så att bilden helst visar en händelse (steg 10.7.1)
  dimma: 0.5, // dimman räknas från den här tätheten
  // samtalens ämnen (steg 3.9.5)
  dodDygn: 2, // man pratar om den som dog för högst så här många dygn sedan
  kallt: -5, // ... om kylan från den här temperaturen (°C) och neråt
  varmt: 25, // ... om värmen från den här och uppåt
  hungrigOver: 0.05, // ... och om maten strax innan man äter: mättnaden under ätgränsen (KROPP.hungrig) plus så här mycket
  pratTim: 2, // personrutan visar det senaste samtalet i så här många timmar
  // relationerna utförligt (steg 3.9.6)
  kemi: 0.4, // personkemin (−1 till 1) nämns från så här långt från noll
  relIntryck: 2, // så här många av intrycken visas
  eldNara: 4, // samtalet hålls nära elden när en eld brinner så här nära (rutor, steg 15.1.116)
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
  tigger: { namn: [['tiggaren', 'tiggerskan'], ['Skålen', 'Skålen'], ['Tomskål', 'Tomskål']] }, // steg 10.5.11
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
  pahittig: { namn: [['den kloke', 'den kloka'], ['Finurlig', 'Finurlig'], ['den listige', 'den listiga'], ['Hittaren', 'Hittaren']] }, // steg 10.4.9
  skvaller: { namn: [['Skvallret', 'Skvallerbyttan'], ['Pratmakaren', 'Pratmakerskan'], ['Sladdertacka', 'Sladdertacka'], ['den lösmynte', 'den lösmynta']] }, // steg 10.8.6
  aventyrare: { namn: [['Äventyraren', 'Äventyrerskan'], ['Vägfararen', 'Vägfarerskan'], ['den bereste', 'den beresta'], ['Vidfamnaren', 'Vidfamnerskan']] }, // steg 11.8.17
  // binamnen för intrycken från de nya systemen (steg 12.1.134)
  forsvarare: { namn: [['Försvararen', 'Försvarerskan'], ['Sköldmuren', 'Sköldmön'], ['den trofaste', 'den trofasta'], ['Grindvakten', 'Grindvakten']] },
  botare: { namn: [['Botaren', 'Boterskan'], ['Läkehand', 'Läkehand'], ['den milde', 'den milda'], ['Örtkunnig', 'Örtkunnig']] },
  daligLakare: { namn: [['Kvacksalvaren', 'Kvacksalverskan'], ['Dödshand', 'Dödshand'], ['den klumpige', 'den klumpiga'], ['Gravgrävaren', 'Gravgräverskan']] },
  scenBra: { namn: [['Skalden', 'Skaldmön'], ['Guldtunga', 'Guldtunga'], ['den älskade', 'den älskade'], ['Lyssnarsamlaren', 'Lyssnarsamlerskan']] },
  scenDalig: { namn: [['Gäspet', 'Gäspet'], ['den tråkige', 'den tråkiga'], ['Sömnsången', 'Sömnsången'], ['Gnällaren', 'Gnällerskan']] },
  skrivkunnig: { namn: [['Skrivaren', 'Skriverskan'], ['Runkarlen', 'Runkvinnan'], ['den lärde', 'den lärda'], ['Fjäderpennan', 'Fjäderpennan']] },
  from: { namn: [['den fromme', 'den fromma'], ['Bönemannen', 'Bönekvinnan'], ['den helige', 'den heliga'], ['Offraren', 'Offrerskan']] },
  gudlos: { namn: [['den gudlöse', 'den gudlösa'], ['Hädaren', 'Häderskan'], ['den otrogne', 'den otrogna'], ['Gudsföraktaren', 'Gudsförakterskan']] },
  suput: { namn: [['Suputen', 'Suputen'], ['Ölstruten', 'Ölstruten'], ['den törstige', 'den törstiga'], ['Hornet', 'Hornet']] },
  lurendrejare: { namn: [['Lurendrejaren', 'Lurendrejerskan'], ['Rävtungan', 'Rävtungan'], ['den listige', 'den listiga'], ['Fiffaren', 'Fifferskan']] },
  hederlig: { namn: [['den hederlige', 'den hederliga'], ['Rakvågen', 'Rakvågen'], ['den ärlige', 'den ärliga'], ['Rätthand', 'Rätthand']] },
  vittberest: { namn: [['den vittbereste', 'den vittberesta'], ['Vandraren', 'Vandrerskan'], ['Långfararen', 'Långfarerskan'], ['Vägmätaren', 'Vägmäterskan']] },
  brandslackare: { namn: [['Brandsläckaren', 'Brandsläckerskan'], ['Vattenbäraren', 'Vattenbärerskan'], ['den orädde', 'den orädda'], ['Eldtämjaren', 'Eldtämjerskan']] },
  djurvan: { namn: [['Herden', 'Herdinnan'], ['Djurvännen', 'Djurvännen'], ['den milde', 'den milda'], ['Fårfadern', 'Fårmodern']] },
  fangelsekund: { namn: [['Fängelsekunden', 'Fängelsekunden'], ['Bojan', 'Bojan'], ['den inlåste', 'den inlåsta'], ['Gallret', 'Gallret']] },
  forutseende: { namn: [['den framsynte', 'den framsynta'], ['Förrådsvakt', 'Förrådsvakt'], ['den vise', 'den visa'], ['Vinterhövding', 'Vinterhövding']] },
};
export const BINAMN: Record<IntryckTyp, BinamnDef> = BDEF;

// mallarna: id → varianterna. Varje variant säger något eget, inga omskrivningar av samma påstående; antalet följer av hur mycket
// det finns att säga och hur ofta mallen läses, och aldrig färre än två (Berättelser: Registret). {namn} = förnamnet, {binamn} = namnet byn gav, {helt} = båda, {skal} = varför
// (det som hänt), {tillstand} = det byn tycker att hen är när ingen har ett bevis (tillst, steg 6.7.6)
// mallarna från de nya systemen (steg 12.1.135): krönikans varianter (iBy) och personens (iPerson, beskrivningen och eftermälet)
const iBy = (f: Fyllning) => f.person !== true, iPerson = (f: Fyllning) => f.person === true;
const MDEF = {
  hedersnamn: [
    { t: 'Byn har börjat kalla {namn} för {binamn}, för {hen} {skal}.', om: f => !f.tillst },
    { t: 'Sedan {hen} {skal}, säger alla {helt}.', om: f => !f.tillst },
    { t: '{namn} {skal}. Från den dagen hette {hen} {helt}.', om: f => !f.tillst },
    { t: 'Ingen minns vem som sa det först, men nu är {namn} {binamn} för hela byn. {Hen} {skal}.', om: f => !f.tillst },
    { t: 'Vid elden talar man om {namn} som {binamn}. Det var när {hen} {skal}.', om: f => !f.tillst },
    { t: '{helt}, säger de nu, och {namn} låtsas inte höra det men ler. {Hen} {skal}.', om: f => !f.tillst },
    { t: 'Barnen leker att de är {helt}. {Hen} {skal}, och det har de inte glömt.', om: f => !f.tillst && (f.barn as number) > 0 },
    { t: 'Så fick {namn} sitt namn: {hen} {skal}, och byn kallar {honom} {helt}.', om: f => !f.tillst },
    { t: 'Det var kallt i byn när namnet {helt} började sägas. {Hen} {skal}.', om: f => !f.tillst && f.kallt === true },
    { t: 'De gamla nickar när de säger {helt}. {Hen} {skal}, och sådant minns man.', om: f => !f.tillst && (f.gamla as number) > 0 },
    { t: 'Alla vet att {namn} är {tillstand}, och nu säger de {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Byn har börjat kalla {namn} för {binamn}. Ingen kan säga när det började, men alla tycker att {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{namn} är {tillstand}, och därför heter {hen} nu {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Vid elden talar man om {namn} som {binamn}, för {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Barnen ropar {binamn} efter {namn}. {Hen} är {tillstand}, det vet alla.', om: f => !!f.tillst && (f.barn as number) > 0 }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Ingen minns vem som sa det först, men {namn} är {tillstand}, och nu heter {hen} {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{helt}, säger de nu, för alla tycker att {namn} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Så fick {namn} sitt namn: {hen} är {tillstand}, och byn kallar {honom} {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{vittne} såg det med egna ögon när {namn} {skal}, och sedan dess säger byn {helt}.', om: f => !f.tillst && !!f.vittne },
    { t: 'Förut kallades {hen} {fore}, men sedan {hen} {skal} säger ingen det längre. Nu heter {hen} {helt}.', om: f => !f.tillst && !!f.fore },
  ],
  // Lill- och Stor-namnet (steg 4.5.4.8, fynd 500): namnet kommer av släkten, en förälder eller ett barn med samma namnslut
  slaktnamn: [
    '{namn} och {hens} {rel} {slakting} slutar likadant på namnet, så byn kallar {honom} {binamn}.',
    'När två i samma släkt slutar likadant på namnet blir det lätt fel. {namn} blev {binamn}, för {hens} {rel} heter {slakting}.',
    'När någon ropade på {slakting} vände sig {namn} om. Sedan dess heter {hen} {binamn}.',
    '{helt}, säger byn, så att ingen tar fel på {honom} och {hens} {rel} {slakting}.',
    'Namnet {binamn} kommer av släkten, för {hens} {rel} heter {slakting}.',
    'Det var barnen som började säga {binamn} om {namn}, för {hen} och {slakting} låter likadant.',
    'I släkten finns två med samma namnslut, och {namn} kallas därför {binamn}.',
    '{namn} är {binamn} i allas mun. Det är inget fel i det, bara att {hens} {rel} heter {slakting}.',
    'Den äldre blir Stor- och den yngre Lill-, så gör man i byn. {namn} blev {binamn}, och {slakting} fick behålla sitt namn.',
  ],
  oknamn: [
    { t: 'Bakom ryggen kallar byn {namn} för {binamn}. {Hen} {skal}.', om: f => !f.tillst },
    { t: '{namn} {skal}, och nu heter {hen} {helt} i allas mun.', om: f => !f.tillst },
    { t: 'Ingen säger det högt när {namn} hör, men alla vet vem {binamn} är. {Hen} {skal}.', om: f => !f.tillst },
    { t: 'Sedan {hen} {skal}, säger man {helt}, och man fnissar bakom ryggen på {honom}.', om: f => !f.tillst },
    { t: 'Det är inget fint namn, {binamn}. Men {namn} {skal}.', om: f => !f.tillst },
    { t: 'Vid elden viskar man om {helt}. Det var när {hen} {skal}.', om: f => !f.tillst },
    { t: 'Barnen härmar {namn} och ropar {binamn}. {Hen} {skal}, och det sitter i.', om: f => !f.tillst && (f.barn as number) > 0 },
    { t: 'Så fick {namn} sitt namn: {hen} {skal}, och nu är {hen} {helt}.', om: f => !f.tillst },
    { t: '{namn} brusar upp när {hen} hör namnet {binamn}. Men {hen} {skal}.', om: f => !f.tillst && f.hetlevrad === true },
    { t: 'Det var kallt i byn när man började säga {helt}. Ingen har glömt varför: {hen} {skal}.', om: f => !f.tillst && f.kallt === true },
    { t: 'Bakom ryggen kallar byn {namn} för {binamn}, för alla vet att {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: '{namn} är {tillstand}, och nu heter {hen} {helt} i allas mun.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Ingen säger det högt när {namn} hör, men alla vet vem {binamn} är: {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Det är inget fint namn, {binamn}. Men {namn} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Barnen härmar {namn} och ropar {binamn}, för {hen} är {tillstand}.', om: f => !!f.tillst && (f.barn as number) > 0 }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Vid elden viskar man om {helt}. Alla vet att {hen} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Så fick {namn} sitt namn: {hen} är {tillstand}, och nu är {hen} {helt}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Man fnissar när man säger {helt}, för {namn} är {tillstand}.', om: f => !!f.tillst }, // inget bevis: det byn tycker att hen är (steg 6.7.6)
    { t: 'Det var {vittne} som såg {namn} när {hen} {skal}. Sedan dess säger man {helt} bakom ryggen på {honom}.', om: f => !f.tillst && !!f.vittne },
    { t: 'Förr kallade man {honom} {fore}. Nu säger man {binamn}, sedan {hen} {skal}.', om: f => !f.tillst && !!f.fore },
    { t: 'Nu ger folk ogärna {namn} något. {Hen} {skal}, och därför heter {hen} {helt}.', om: f => !f.tillst && (f.k === 'tjuv' || f.k === 'lurendrejare') },
  ],
  // personen (steg 3.9.2). {alder} = 'ung kvinna', 'gammal man' osv., {drag1} och {drag2} = de egenskaper som sticker ut
  besk_drag2: [
    { t: '{namn} är en {alder}, {drag1} {bind} {drag2}.', om: f => !!f.alder },
    { t: '{namn} är en {alder} som är {drag1} {bind} {drag2}.', om: f => !!f.alder },
    { t: '{namn} är både {drag1} och {drag2}.', om: f => !f.syns && f.bind === 'och' },
    { t: '{namn} är en {alder}; {hen} är både {drag1} och {drag2}.', om: f => !!f.alder && f.bind === 'och' },
    { t: '{namn} är {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} är {drag1}, men också {drag2}.', om: f => !f.syns && f.bind === 'men' },
    { t: '{namn} är ännu inte vuxen men redan {drag1} {bind} {drag2}.', om: f => !f.syns && f.ung === true && !f.liten && f.bind !== 'men' },
    { t: '{namn} är ännu inte vuxen men redan {drag1}, fast också {drag2}.', om: f => !f.syns && f.ung === true && !f.liten && f.bind === 'men' },
    { t: '{namn} är en {alder} och har länge varit {drag1} {bind} {drag2}.', om: f => f.gammal === true },
    // steg 6.7.7
    { t: '{namn} är till sin natur {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} har länge varit {drag1} {bind} {drag2}.', om: f => !f.syns && f.gammal === true },
  ],
  besk_drag1: [
    { t: '{namn} är en {alder}, och mer än något annat {drag1}.', om: f => !!f.alder },
    { t: '{namn} är framför allt {drag1}.', om: f => !f.syns },
    { t: '{namn} är en {alder} som är {drag1}.', om: f => !!f.alder },
    { t: 'Alla i byn vet att {namn}, en {alder}, är {drag1}.', om: f => !!f.alder },
    { t: '{namn} är en {alder}, och den som känner {honom} säger att {hen} är {drag1}.', om: f => !!f.alder },
    { t: '{namn} har alltid varit {drag1}.', om: f => !f.syns },
    { t: '{namn} är ännu inte vuxen men redan {drag1}.', om: f => !f.syns && f.ung === true && !f.liten },
    { t: '{namn} är en {alder} och har varit {drag1} hela livet.', om: f => f.gammal === true },
    { t: '{namn} är {drag1}, och det är {hen} som brusar upp först när något går emot {honom}.', om: f => f.drag1 === 'hetlevrad' },
    { t: '{namn} är {drag1} och arbetar för byn också när ingen ber {honom} om det.', om: f => f.drag1 === 'arbetsam' },
    { t: '{namn} är {drag1} och sitter gärna och prövar sig fram till något nytt.', om: f => f.drag1 === 'nyfiken på allt' },
  ],
  besk_drag0: [
    { t: '{namn} är en {alder} utan särskilt utmärkande drag.', om: f => !!f.alder },
    { t: '{namn} är en {alder}; inga egenskaper sticker ut.', om: f => !!f.alder },
    { t: '{namn} är en vanlig {alder}.', om: f => !!f.alder },
    { t: '{namn} är en {alder} som i de flesta avseenden liknar andra i byn.', om: f => !!f.alder },
    { t: '{namn} är en {alder} utan större styrkor eller svagheter.', om: f => !!f.alder },
    { t: '{namn} har inga utmärkande drag.', om: f => !f.alder },
    { t: 'Inga egenskaper sticker ut hos {namn}.', om: f => !f.alder },
    { t: 'Det är svårt att säga något särskilt om {namn}, en {alder} som de flesta andra.', om: f => !!f.alder },
  ],
  // ett drag som går emot åldern (steg 6.7.2): {trots} = draget, en gammal som är vig eller ett barn som är klokt
  besk_trots: [
    { t: 'Trots sin ålder är {hen} {trots}.', om: f => f.gammal === true },
    { t: '{Hen} är gammal men {trots}.', om: f => f.gammal === true },
    { t: '{Hen} är ung men {trots}.', om: f => f.ung === true },
    { t: '{Hen} är redan {trots}, vilket är ovanligt för ett barn.', om: f => f.ung === true },
    { t: '{Hen} är ett barn men {trots}.', om: f => f.ung === true },
    { t: '{Hen} är gammal, men bär fortfarande mer än en del av de unga.', om: f => f.gammal === true && f.trots === 'stark' },
    { t: 'Åren syns på {honom}, men {hen} rör sig fortfarande lätt.', om: f => f.gammal === true && f.trots === 'vig' },
    { t: '{Hen} är bara ett barn, men lär sig fortare än många vuxna.', om: f => f.ung === true && f.trots === 'klok' },
    { t: '{Hen} är ett barn, men minns sådant som många vuxna redan har glömt.', om: f => f.ung === true && f.trots === 'minnesgod' },
  ],
  // {binamn} = öknamnet eller hedersnamnet, {yrke} = yrket, {rykte} = det byn mest ser hen som
  besk_binamn: [
    'Byn kallar {honom} {binamn}.',
    'I byn kallas {hen} oftast {binamn}.',
    '{Hen} är känd under namnet {binamn}.',
    'Även barnen kallar {honom} {binamn}.',
    { t: 'Byn kallar {honom} {binamn} sedan {hen} {bskal}.', om: f => !!f.bskal && f.heder === true },
    { t: 'Bakom ryggen kallas {hen} {binamn}, sedan {hen} {bskal}.', om: f => !!f.bskal && f.heder === false },
    { t: 'Byn kallar {honom} {binamn}, så att ingen blandar ihop {honom} med {slakt}.', om: f => !!f.slakt },
    { t: 'Ingen kan säga vad {hen} har gjort, men byn kallar {honom} {binamn} ändå.', om: f => f.btillst === true },
    { t: 'Namnet {binamn} har följt {honom} i {bar} år.', om: f => (f.barN as number) >= 2 },
  ],
  besk_yrkeRykte: [
    '{Hen} arbetar mest som {yrke} och räknas i byn som {rykte}.',
    '{Hen} är {yrke} till sysslan, och byn ser {honom} som {rykte}.',
    'Byn känner {honom} som {yrke}, och {hen} har rykte om sig att vara {rykte}.',
    '{Hen} arbetar som {yrke}, och de flesta i byn ser {honom} som {rykte}.',
    '{Hen} försörjer sig som {yrke} och anses vara {rykte}.',
    { t: '{Hen} arbetar mest som {yrke}, men det byn talar om är att {hen} {rskal}.', om: f => !!f.rskal },
    'Som {yrke} gör {hen} sitt, men i byn talas det mest om att {hen} är {rykte}.',
    'Arbetet som {yrke} fyller {hans} dagar, och byn håller {honom} för {rykte}.',
  ],
  besk_yrke: [
    '{Hen} arbetar mest som {yrke}.',
    '{Hen} är {yrke} till sysslan.',
    'Byn känner {honom} som {yrke}.',
    'Det mesta av sin tid arbetar {hen} som {yrke}.',
    '{Hen} bidrar till byn som {yrke}.',
    'Sysslan som {yrke} är det {hen} lägger sina dagar på.',
    'När något behöver göras som {yrke} är det {honom} man går till.',
    '{Hans} händer är vana vid arbetet som {yrke}.',
  ],
  besk_rykte: [
    'Byn ser {honom} som {rykte}.',
    'De flesta i byn anser att {hen} är {rykte}.',
    '{Hen} har rykte om sig att vara {rykte}.',
    'I byn räknas {hen} som {rykte}.',
    '{Hen} anses vara {rykte}.',
    { t: 'Byn ser {honom} som {rykte}, sedan {hen} {rskal}.', om: f => !!f.rskal },
    { t: 'Det {hen} berättar tror man mindre på, för {hen} räknas som {rykte}.', om: f => f.rk === 'logn' },
    { t: 'Folk ger ogärna {honom} något, för {hen} räknas som {rykte}.', om: f => f.rk === 'tjuv' || f.rk === 'lurendrejare' },
  ],
  // {partner}, {van} = bästa vännen, {fiende} = ärkefienden
  besk_partnerVan: [
    '{Hen} lever med {partner}, och {van} är {hans} bästa vän.',
    'Med {partner} delar {hen} sitt liv, och med {van} sina tankar.',
    '{Hen} bor med {partner}; {hans} närmaste vän är {van}.',
    '{Hen} är tillsammans med {partner} och har {van} som bästa vän.',
    '{partner} och {hen} hör ihop, och {van} är {hans} närmaste vän.',
    { t: '{Hen} är gift med {partner}, men det är med {van} {hen} pratar mest.', om: f => f.gift === true && f.vanPrat === true },
    'Hemma väntar {partner}, men det är {van} {hen} söker upp när något tynger.',
    '{partner} är den {hen} delar hus med, och {van} den {hen} litar mest på.',
  ],
  besk_partner: [
    '{Hen} lever med {partner}.',
    '{Hen} bor tillsammans med {partner}.',
    '{Hen} och {partner} är ett par.',
    'Ingen står {honom} närmare än {partner}.',
    { t: '{Hen} är gift med {partner}.', om: f => f.gift === true },
    { t: '{Hen} och {partner} har hållit ihop i {parAr} år.', om: f => (f.parN as number) >= 3 },
    { t: '{Hen} och {partner} har fått {barnTills} tillsammans.', om: f => !!f.barnTills },
    'Det är {partner} som {hen} vänder sig till först.',
  ],
  besk_van: [
    '{van} är {hans} bästa vän.',
    '{Hen} umgås mest med sin bästa vän, {van}.',
    '{Hen} och {van} är nära vänner.',
    '{Hen} har {van} som bästa vän.',
    '{Hen} litar mest av alla på {van}.',
    { t: '{Hen} och {van} har stått sida vid sida i strid {sidaGgr}.', om: f => !!f.sidaGgr },
    { t: '{Hen} och {van} har varit vänner sedan de var barn.', om: f => f.barndomsvan === true },
    { t: '{Hen} och {van} brukar ge varandra gåvor.', om: f => f.gavaBada === true },
    { t: '{Hen} och {van} brottas ofta på lek.', om: f => (f.lek as number) >= 2 },
  ],
  // vems barn hen är, när förälderns rykte är starkt (steg 10.8.5): {barnet} son eller dotter, {vem} föräldern, {vad} vad byn kallar föräldern
  besk_foralder: [
    '{Hen} är {barnet} till {vem}, som byn anser vara {vad}.',
    '{Hen} är känd som {barnet} till {vem}, som byn anser vara {vad}.',
    'Alla vet vems {barnet} {hen} är: {vem}, som byn anser vara {vad}.',
    { t: 'Något av glansen från {vem}, som byn ser som {vad}, faller också på {honom}.', om: f => (f.vadTecken as number) > 0 && f.arv === true },
    { t: 'Byn ser {vem} som {vad}, och det hänger kvar också vid {honom}.', om: f => (f.vadTecken as number) < 0 && f.arv === true },
    { t: '{Hans} {foOrd} {vem} lever inte längre, men byn minns {vemHonom} som {vad}.', om: f => f.vemDod === true },
    'När folk ser {honom} tänker de ofta på {vem}, som byn anser vara {vad}.',
    'Vart {hen} än går följer namnet {vem} med, och byn anser att {vem} är {vad}.',
  ],
  besk_fiende: [
    { t: '{Hen} och {fiende} är ovänner.', om: f => f.omsesidig === true },
    '{fiende} är {hans} ovän.',
    '{Hen} undviker {fiende}.',
    '{Hans} värsta ovän är {fiende}.',
    { t: '{Hen} är osams med {fiende}.', om: f => f.omsesidig === true },
    { t: '{Hen} och {fiende} har slagits {slagGgr}.', om: f => !!f.slagGgr },
    { t: '{Hen} och {fiende} har grälat {gralGgr}.', om: f => !!f.gralGgr && !f.slagGgr },
    { t: '{Hans} värsta ovän är {fiende}, men själv räknar {fiende} en annan som sin värsta.', om: f => f.omsesidig === false },
  ],
  // smaken: {vad} = arbetet (det står att hen gör det, 'samlar bär och rötter') eller maten
  besk_arbeteGilla: [
    '{Hen} trivs bäst när {hen} {vad}.',
    '{Hen} är som mest nöjd när {hen} {vad}.',
    'Det är när {hen} {vad} som {hen} trivs bäst.',
    '{Hen} är som gladast när {hen} {vad}.',
    '{Hen} klagar aldrig när {hen} {vad}.',
    '{Hans} humör stiger när {hen} {vad}.',
    'Ingen behöver be {honom} två gånger när {hen} {vad}.',
    'Tiden går fort för {honom} när {hen} {vad}.',
  ],
  besk_arbeteOgilla: [
    '{Hen} trivs inte när {hen} {vad}.',
    '{Hen} är missnöjd när {hen} {vad}.',
    'När {hen} {vad} sjunker {hans} humör.',
    '{Hen} trivs sämst när {hen} {vad}.',
    '{Hen} ogillar när {hen} {vad}.',
    'Det är när {hen} {vad} som {hen} trivs minst.',
    '{Hen} klagar ofta när {hen} {vad}.',
    'Får {hen} välja, slipper {hen} helst när {hen} {vad}.',
  ],
  besk_matGilla: [
    '{Hen} äter helst {vad}.',
    '{Hen} föredrar {vad} framför annan mat.',
    '{Hen} tar gärna extra när det finns {vad}.',
    '{Hen} har alltid tyckt om {vad}.',
    '{Hen} äter gärna {vad}.',
    'Om {hen} får välja blir det {vad}.',
    '{vad} är det {hen} längtar efter när maten är knapp.',
    'Bjuder man {honom} på {vad} blir {hen} glad.',
  ],
  besk_matOgilla: [
    '{Hen} äter helst inte {vad}.',
    '{Hen} äter {vad} bara när inget annat finns.',
    '{Hen} ogillar {vad}.',
    '{Hen} tycker inte om {vad}.',
    '{Hen} lämnar {vad} till de andra.',
    '{Hen} väljer annan mat än {vad} när det går.',
    '{Hen} har aldrig tyckt om {vad}.',
    '{Hen} undviker {vad}.',
  ],
  // det starkaste minnet: {minne} = upplevelsen ('var nära att svälta ihjäl'), {vid} = åldern då
  besk_minne: [
    { t: '{Hen} var {vid} år när {hen} {minne}.', om: f => !f.varaktig },
    { t: 'Från när {hen} var {vid} år minns {hen} särskilt att {hen} {minne}.', om: f => !f.varaktig },
    'Det starkaste minnet {hen} har är från när {hen} var {vid} år: {hen} {minne}.',
    '{Hans} starkaste minne är från {vid} års ålder: {hen} {minne}.',
    { t: 'Det som präglat {honom} mest hände när {hen} var {vid} år: {hen} {minne}.', om: f => !f.varaktig },
    { t: '{Hen} var {vid} år när {hen} {minne}. Efter det blev {hen} {blev}.', om: f => !!f.blev && !f.varaktig },
    { t: 'Det var {iarstid} år {ar} som {hen} {minne}, och det har {hen} burit med sig sedan dess.', om: f => !!f.iarstid && !f.varaktig },
    { t: 'Det {hen} minns bäst är tiden när {hen} {minne}.', om: f => f.varaktig === true },
  ],
  // det starkaste minnet från första året, innan hen fyllt ett år: {minne} = upplevelsen
  besk_minneSpad: [
    '{Hen} var bara ett spädbarn när {hen} {minne}.',
    'Det första som präglade {honom} hände innan {hen} fyllt ett år: {hen} {minne}.',
    '{Hen} minns det inte själv, men {hen} var bara ett spädbarn när {hen} {minne}.',
    { t: '{Hans} liv började svårt, för {hen} {minne} innan {hen} kunde gå.', om: f => f.svar === true },
    'Andra har berättat för {honom} att {hen} {minne} som spädbarn.',
    'Det hände innan {hen} fyllt ett år, och det har format {honom}: {hen} {minne}.',
    'Det började redan första året: {hen} {minne}.',
    { t: 'Som nyfödd {minne} {hen}, och det har satt sina spår.', om: f => !f.varaktig },
  ],
  // vem hen är i byn (steg 3.9.7). {ny} = grundade byn på nytt, {kvar} = lever
  besk_grundare: [
    '{namn} var en av dem som grundade byn.',
    '{Hen} hörde till de första som slog sig ner här.',
    'När byn grundades var {namn} med.',
    '{namn} var med när byn grundades vid sjön.',
    { t: '{namn} var med och grundade byn och har bott här sedan dess.', om: f => f.kvar !== false },
    { t: '{namn} hittade den tomma boplatsen och grundade byn på nytt.', om: f => f.ny === true },
    { t: '{namn} grundade byn på nytt efter att den stått tom.', om: f => f.ny === true },
    { t: '{Hen} är den sista som lever av dem som grundade byn.', om: f => f.kvar !== false && f.grundKvar === 0 },
    { t: 'Av dem som grundade byn lever {namn} och {grundKvarOrd} till.', om: f => f.kvar !== false && (f.grundKvar as number) > 0 },
    { t: 'De var {grundFolk} när {namn} var med och grundade byn. Nu bor {folk} här.', om: f => !f.ny && (f.folkN as number) > (f.grundN as number) },
    { t: '{namn} var med och grundade byn för {bynAr} år sedan.', om: f => (f.bynN as number) >= 2 },
  ],
  // skönheten: {del} = det vackra eller fula som syns ('förföriska ögon')
  besk_vacker: [
    '{namn} har {del}.',
    '{namn} räknas som vacker och har {del}.',
    'Det man lägger märke till hos {honom} är {del}.',
    '{namn} hör till de vackraste i byn, med {del}.',
    { t: '{namn} har {del}, {verkan}.', om: f => !!f.verkan },
    { t: '{namn} är vacker och har {del}, {verkan}.', om: f => !!f.verkan },
    { t: 'Det man minns hos {honom} är {del}, {verkan}.', om: f => !!f.verkan },
    '{namn} är vacker, med {del}.',
    { t: '{namn} har {del}, och mer än en i byn har fallit för {honom}.', om: f => (f.friare as number) >= 2 },
  ],
  besk_ful: [
    '{namn} har {del}.',
    'Det man först lägger märke till hos {honom} är {del}.',
    '{Hen} räknas inte som vacker och har {del}.',
    '{namn} är lätt att känna igen på {del}.',
    '{namn} anses inte vacker; {hen} har {del}.',
    { t: '{namn} har {del}, men {partner} valde {honom} ändå.', om: f => !!f.partner },
    'Barnen tittar gärna en extra gång på {namn}, som har {del}.',
    'Ingen tar miste på {namn}, med {del}.',
  ],
  // {ar} = åldern
  besk_aldst: [
    'Ingen i byn är äldre än {namn}, som är {ar} år.',
    '{namn} är äldst i byn, {ar} år gammal.',
    'Med sina {ar} år är {namn} byns äldsta.',
    '{Hen} har levt längre än alla andra här: {ar} år.',
    '{namn} har levt i {ar} år, längre än någon annan i byn.',
    { t: '{namn} är äldst i byn, {ar} år gammal, och har {barnbarn} i livet.', om: f => !!f.barnbarn },
    { t: 'Sedan {namn} föddes har {doda} av byns folk dött.', om: f => (f.dodaN as number) >= 3 },
    '{namn} har sett fler år än någon annan här, hela {ar}.',
  ],
  // {vad} = det hen är känd som ('mästare i snickeri', 'byns första ledare')
  besk_titel: [
    '{Hen} är känd som {vad}.',
    '{Hen} är {vad}.',
    '{namn} räknas som {vad}.',
    '{namn} är {vad}.',
    'I byn är {hen} känd som {vad}.',
    'Byn känner {honom} som {vad}.',
    'Folk talar om {honom} som {vad}.',
    'Det namn {hen} fått i byn är {vad}.',
  ],
  // {vad} = det hen uppfann ('lerkrukor och rep')
  besk_uppfann: [
    'Det var {namn} som kom på hur man kan {vad}.',
    '{Hen} var den första i byn som kunde {vad}.',
    '{namn} kom först i byn på hur man kan {vad}.',
    'Det var {namn} som först lärde byn att {vad}.',
    '{Hen} kom på hur man kan {vad}, något ingen i byn kunnat förut.',
    '{Hen} kom på hur man kan {vad}.',
    'Utan {namn} hade byn kanske ännu inte vetat hur man kan {vad}.',
    'Byn tackar {namn} för att den kan {vad}.',
  ],
  // {vad} = det hen gjorde ('tände byns första eld och fällde byns första träd')
  besk_bedrift: [
    '{Hen} {vad}.',
    'Det var {namn} som {vad}.',
    'Till {hans} bedrifter hör att {hen} {vad}.',
    '{namn} {vad}, vilket byn minns.',
    'Det var {namn} som en gång {vad}.',
    'Byn minns att {hen} {vad}.',
    'Man berättar fortfarande att {hen} {vad}.',
    'Byn har inte glömt att {namn} {vad}.',
  ],
  // ärren och det hen förlorat (steg 12.1.119): {vad} = 'har ett ärr i vänstra benet och har förlorat fingrarna på vänster hand'
  besk_skador: [
    '{Hen} {vad}.',
    'Livet har satt sina spår: {hen} {vad}.',
    'Det syns att {namn} varit med om en del. {Hen} {vad}.',
    '{namn} {vad}, men klagar sällan.',
    'Den som ser {namn} märker att {hen} {vad}.',
    'Inte allt har gått väl för {namn}: {hen} {vad}.',
    'Man ser på {honom} vad {hen} gått igenom. {Hen} {vad}.',
    '{namn} {vad}, och det glömmer {hen} inte.',
  ],
  // den döda som stod hen närmast: {dod} = namnet, {vem} = 'mor', 'son', 'hustru', 'vän' …
  besk_sorjer: [
    '{Hen} sörjer {dod}, sin {vem}.',
    '{Hen} saknar {dod}, sin {vem}.',
    '{Hen} har nyligen förlorat {dod}, sin {vem}.',
    '{dod}, {hans} {vem}, har dött, och {hen} sörjer.',
    '{Hen} har ännu inte kommit över att {dod} dog.',
    'Sorgen efter {dod}, {hans} {vem}, tynger {honom}.',
    { t: '{Hen} sörjer {dod}, sin {vem}, som dog {orsak}.', om: f => !!f.orsak },
    '{Hen} har svårt att glädja sig åt något sedan {dod} dog.',
  ],
  besk_saknar: [
    '{Hans} {vem} {dod} är död.',
    '{Hen} har förlorat {dod}, sin {vem}.',
    '{dod}, {hans} {vem}, lever inte längre.',
    '{Hen} tänker ibland på {dod}.',
    { t: '{dod} dog för länge sedan, och {hen} minns det fortfarande.', om: f => f.lange === true },
    { t: '{Hen} såg {dod}, sin {vem}, dö.', om: f => f.sag === true },
    { t: '{dod}, {hans} {vem}, dog {orsak} för {sedanAr} år sedan.', om: f => !!f.orsak && (f.sedanN as number) >= 1 },
    'Saknaden efter {dod}, {hans} {vem}, har aldrig riktigt gått över.',
  ],
  // vapnet hen föredrar: {vad} = vapnet ('flintkniv', 'bara händerna')
  besk_vapenGilla: [
    'I strid tar {hen} helst {vad}.',
    '{Hen} föredrar {vad} i strid.',
    '{Hen} slåss helst med {vad}.',
    '{Hans} föredragna vapen är {vad}.',
    '{Hen} har lärt sig slåss med {vad}.',
    'I strid väljer {hen} {vad}.',
    '{Hans} vapen är {vad}.',
    '{Hen} litar mest på {vad} i strid.',
  ],
  // den som helst slåss utan vapen (steg 12.1.119)
  besk_handGilla: [
    'I strid litar {hen} mest på nävarna.',
    '{Hen} slåss helst med nävarna.',
    'Ett vapen behöver {namn} inte; {hen} slåss hellre med händerna.',
    '{Hen} går hellre på med nävarna än med ett vapen.',
    'I ett slagsmål tar {hen} till nävarna först.',
    { t: '{namn} har starka nävar och använder dem gärna i strid.', om: f => f.stark === true },
    '{Hen} har aldrig brytt sig om vapen. Nävarna räcker.',
    'När det blir strid knyter {namn} nävarna.',
  ],
  besk_vapenOgilla: [
    '{Hen} litar inte på {vad} i strid.',
    '{Hen} undviker {vad} i strid.',
    '{Hen} tar helst inte {vad} till en strid.',
    'I strid passar {vad} inte {honom}.',
    '{Hen} föredrar andra vapen än {vad}.',
    '{Hen} slåss sämre med {vad} än med något annat.',
    '{vad} ligger illa i {hans} hand.',
    'Med {vad} har {hen} sällan haft tur i en strid.',
  ],
  // mer ur livet (steg 3.9.8). {foralder} = 'mor' eller 'far', {vad} = 'fem barn'
  besk_barn: [
    '{Hen} är {foralder} till {vad}.',
    '{Hen} har fått {vad}.',
    { t: '{Hen} har {vad}.', om: f => f.allaLever === true },
    { t: 'I {hans} familj finns {vad}.', om: f => f.allaLever === true },
    '{Hen} är {foralder} och har {vad}.',
    '{Hen} har fostrat {vad}.',
    { t: 'Av {hans} {vad} lever {levande} än.', om: f => (f.dodaBarn as number) > 0 && (f.levandeN as number) > 0 },
    'Som {foralder} har {hen} sett {vad} växa upp i byn.',
  ],
  besk_foraldralos: [
    '{Hen} förlorade både mor och far som liten.',
    '{Hen} växte upp utan föräldrar.',
    'Både {hans} mor och far dog medan {hen} var barn.',
    '{Hen} har inte haft några föräldrar sedan barndomen.',
    '{Hans} föräldrar dog medan {hen} var barn.',
    '{Hen} blev föräldralös som liten.',
    'Efter föräldrarnas död växte {hen} upp hos andra i byn.',
    { t: '{Hen} minns knappt sina föräldrar.', om: f => (f.vidFor as number) < 5 },
  ],
  besk_forstFodd: [
    '{Hen} var det första barnet som föddes i byn.',
    'Ingen i byn föddes före {honom}.',
    '{Hen} är byns första barn.',
    'Byns första barn var {namn}.',
    'Det första barnet som föddes i byn var {namn}.',
    '{namn} föddes {iarstid} år {ar}, som det första barnet i byn.',
    'Med {namn} började det: {hen} var den första som föddes här.',
    'Alla som föddes i byn efter {honom} kom senare, för {namn} var först.',
  ],
  // {vem} = föräldern som grundade byn, {fo} = 'mor' eller 'far', {barnord} = 'dotter' eller 'son'
  besk_grundarbarn: [
    '{Hen} är {barnord} till {vem}, en av dem som grundade byn.',
    '{vem}, som var med och grundade byn, är {hans} {fo}.',
    '{Hen} är {barnord} till grundaren {vem}.',
    '{Hen} är barn till {vem}, en av byns första invånare.',
    'En av byns grundare, {vem}, är {hans} {fo}.',
    '{Hen} föddes i byn som {vem} var med och grundade.',
    '{Hans} {fo} {vem} är en av byns grundare.',
    'Genom sin {fo} {vem} härstammar {hen} från byns grundare.',
  ],
  // {vad} = färdigheten ('jakt', 'hantverk')
  besk_bast: [
    'Ingen i byn är bättre på {vadAtt} än {namn}.',
    '{Hen} är bäst i byn på {vadAtt}.',
    'I {vad} är {hen} byns skickligaste.',
    '{namn} är den skickligaste i byn på {vadAtt}.',
    'Ingen i byn är så duktig på {vadAtt} som {namn}.',
    'Ingen i byn kan mäta sig med {honom} i {vad}.',
    'Om {vad} vet {hen} mer än någon annan i byn.',
    { t: 'Bara {tvaa} kommer i närheten av {honom} i {vad}.', om: f => !!f.tvaa },
  ],
  // bedrifterna i tal: {vad} = 'tre vargar', 'många gånger', 'två hus'
  besk_vargar: [
    '{Hen} har dödat {vad}.',
    '{namn} har fällt {vad}.',
    '{Hen} har fällt {vad} i strid.',
    'Under vargangreppen har {hen} fällt {vad}.',
    'Hittills har {namn} fällt {vad} i strid.',
    'I strid har {namn} dödat {vad}.',
    { t: '{namn} har fällt {vad} och bär själv märken efter ett vargbett.', om: f => f.bett === true },
    'Vargarna har fått känna på {hans} vapen: {hen} har fällt {vad}.',
  ],
  besk_vardat: [
    '{Hen} har vårdat sjuka och skadade {vad}.',
    '{namn} har lagt om sår {vad}.',
    '{namn} vårdar sjuka och skadade i byn.',
    '{Hen} har tagit hand om andra {vad}.',
    '{Hen} har skött sjuka och skadade {vad}.',
    '{Hen} har gett vård {vad}.',
    '{Hen} har suttit hos de sjuka {vad}.',
    '{namn} tar hand om sjuka och skadade.',
  ],
  besk_hus: [
    '{Hen} har byggt {vad} i byn.',
    'Det var {namn} som gjorde färdigt {vad}.',
    '{Hen} har gjort färdigt {vad}.',
    '{Hen} har varit med och byggt {vad}.',
    '{namn} har byggt {vad} med egna händer.',
    'Ett av husen i byn har {hen} byggt.',
    '{Hen} har rest {vad} i byn.',
    'Mycket av {hans} arbete står kvar i byn: {hen} har byggt {vad}.',
  ],
  // {vem} = lärlingen eller läraren (mentorn, steg 3.1.1)
  besk_larare: [
    '{Hen} lär upp {vem}.',
    '{vem} är {hans} lärling.',
    '{Hen} har {vem} som lärling.',
    'Det är {namn} som lär upp {vem}.',
    '{vem} går i lära hos {honom}.',
    '{Hen} har en lärling: {vem}.',
    '{Hen} undervisar {vem}.',
    '{Hen} visar {vem} hur man gör.',
    { t: '{Hen} lär upp {vem} i {amne}.', om: f => !!f.amne },
    '{vem} arbetar gärna bredvid {honom}, för där går lärandet fortare.',
  ],
  besk_larling: [
    '{Hen} lär sig av {vem}.',
    '{vem} är {hans} lärare.',
    '{Hen} är lärling hos {vem}.',
    '{Hans} lärare är {vem}.',
    '{Hen} går i lära hos {vem}.',
    '{vem} har {honom} som lärling.',
    { t: '{Hen} går i lära hos {vem} i {amne}, tills {hen} har kommit ikapp.', om: f => !!f.amne },
    'Varje dag tittar {hen} på hur {vem} arbetar och lär sig av det.',
  ],
  // rädslan efter ett vargbett; stark = en kontrast (stark men rädd)
  besk_raddVarg: [
    'Sedan vargen bet {honom} är {hen} rädd för vargar.',
    '{Hen} har märken efter ett vargbett och är rädd för vargar.',
    '{Hen} är rädd för vargar sedan {hen} blev biten.',
    '{Hen} har blivit biten av en varg och är sedan dess rädd.',
    'Efter ett vargbett är {hen} rädd för skogen om natten.',
    'Sedan vargen bet {honom} är {hen} försiktig i skogen.',
    { t: '{Hen} är stark men ändå rädd för vargar.', om: f => f.stark === true },
    { t: '{Hen} är stark, men sedan vargbettet är {hen} rädd för vargar.', om: f => f.stark === true },
  ],
  // {vad} = det hen överlevt ('svält och en hård vinter')
  besk_overlevt: [
    '{Hen} har överlevt {vad}.',
    '{Hen} har klarat sig igenom {vad}.',
    '{Hen} har gått igenom {vad}.',
    '{Hen} har varit nära döden: {hen} har överlevt {vad}.',
    '{Hen} har tagit sig igenom {vad}.',
    'Hittills har {hen} överlevt {vad}.',
    'Livet har prövat {honom} hårt med {vad}, men {hen} står kvar.',
    'Trots {vad} lever {hen} än.',
  ],
  // ägodelarna: {vad} = mästerverkets namn
  besk_mastarverk: [
    '{Hen} äger mästerverket {vad}.',
    '{vad} tillhör {honom}.',
    'Mästerverket {vad} tillhör {namn}.',
    '{Hen} är ägare till {vad}, ett mästerverk.',
    'Det är {namn} som äger {vad}.',
    'Bland {hans} ägodelar finns {vad}, ett mästerverk.',
    'Det mest värdefulla {hen} äger är {vad}.',
    { t: '{Hen} äger {vad}, som {gorare} gjorde.', om: f => !!f.gorare },
    { t: '{namn} gjorde mästerverket {vad} själv och har behållit det.', om: f => f.egetVerk === true },
    { t: 'Med {vad}, som {namn} äger nu, har {vargarSak} fällts.', om: f => !!f.vargarSak },
    { t: 'På {vad} är {motiv} {ristat}, och bilden stannar kvar hos den som har sett den.', om: f => !!f.motiv },
  ],
  besk_egetHus: [
    '{Hen} har ett eget hus.',
    '{Hen} bor i ett eget hus.',
    'Huset {hen} bor i är {hans} eget.',
    '{namn} äger ett eget hus, vilket inte alla i byn gör.',
    'I byn finns ett hus som är {hans}.',
    'Ett av husen i byn ägs av {namn}.',
    '{Hen} har tak över huvudet som ingen annan bestämmer över.',
    'Det hus {hen} sover i hör {honom} till.',
  ],
  besk_rik: [
    '{Hen} äger mer än de flesta i byn.',
    '{Hen} är rik.',
    'Få i byn äger så mycket som {namn}.',
    '{Hen} har samlat på sig många ägodelar.',
    '{namn} är en av de förmögnaste i byn.',
    '{Hen} är en av de rikaste i byn.',
    '{Hans} förråd är fullare än grannarnas.',
    'Det saknas sällan något hos {namn}.',
  ],
  besk_fattig: [
    '{Hen} äger nästan ingenting.',
    '{Hen} är fattig.',
    'Få i byn äger så lite som {namn}.',
    '{Hen} har knappt något eget.',
    '{Hen} är en av de fattigaste i byn.',
    'Av allt som finns i byn äger {hen} mycket lite.',
    '{Hen} får klara sig med det lilla {hen} har.',
    'Det mesta {hen} använder har {hen} lånat av andra.',
  ],
  // {titel} = ledarens titel ('Äldste', 'Den vise')
  besk_ledare: [
    '{Hen} leder byn med titeln {titel}.',
    '{Hen} är byns ledare.',
    'Det är {namn} som bestämmer i byn.',
    'I byns beslut väger {hans} ord tyngst.',
    'Som {titel} leder {hen} byn.',
    'Byns ledare är {namn}, {titel}.',
    { t: 'Sedan {namn} blev ledare har byn vuxit från {folk0} till {folk} människor.', om: f => (f.folkN as number) > (f.folk0N as number) },
    { t: 'De var {folk0} i byn när {namn} tog över, och nu är de bara {folk}.', om: f => (f.folkN as number) < (f.folk0N as number) },
    { t: '{Hen} har lett byn genom {vintrar}.', om: f => (f.vintrarN as number) >= 1 },
    { t: '{namn} tog över efter {forra}.', om: f => !!f.forra },
    { t: '{Hen} har lett byn genom {vintrarTal} vintrar.', om: f => (f.vintrarN as number) >= 2 },
    { t: 'Allt fler i byn är missnöjda med hur {hen} leder.', om: f => f.svag === true },
  ],
  // {vad} = det byn inte glömt ('har stulit från andra och slagit sitt barn')
  besk_skam: [
    'Det är känt i byn att {hen} {vad}.',
    '{Hen} {vad}.',
    'I {hans} förflutna finns något byn inte glömt: {hen} {vad}.',
    'Byn vet att {hen} {vad}.',
    'Byn minns att {namn} {vad}.',
    'Till {hans} rykte hör att {hen} {vad}.',
    'Det {hen} gjort har inte glömts: {hen} {vad}.',
    'Folk ser på {honom} med andra ögon sedan {hen} {vad}.',
  ],
  // arvet: {vad} = egenskapen ('styrka'), {adj} = 'stark', {fo} = 'fars' eller 'mors', {fo2} = 'far' eller 'mor'
  besk_arv: [
    '{Hen} har sin {fo} {vad}.',
    '{Hen} har samma {vad} som sin {fo2}.',
    'Precis som {hans} {fo2} är {hen} {adj}.',
    '{Hen} är lika {adj} som sin {fo2}.',
    '{Hans} {vad} har {hen} efter sin {fo2}.',
    { t: '{Hans} {fo2} lever inte längre, men {hans} {vad} finns kvar i {honom}.', om: f => f.foDod === true },
    { t: '{Hans} {fo2} lever inte längre, men {hans} {fo} {vad} lever vidare i {honom}.', om: f => f.foDod === true },
    { t: 'Fast {hen} ännu är ett barn syns det redan: {hen} är {adj} som sin {fo2}.', om: f => f.ung === true },
  ],
  // längtan: {vem} = den hen är förälskad i
  besk_utkant: [ // hur personen bor (steg 10.2.52)
    '{Hen} bor i utkanten av byn.',
    'Huset där {hen} sover ligger längst ut i byn.',
    '{Hen} har sin säng i ett av husen i byns utkant.',
    '{Hen} sover i byns utkant, en bit från de andra.',
    'I byns utkant har {hen} sin sovplats.',
    '{Hen} bor en bit från byns mitt.',
    'Från {hans} sovplats är det långt till de andras hus.',
    '{Hen} har valt att bo där byn tar slut.',
  ],
  besk_verkstad: [
    '{Hen} bor mitt emot verkstaden.',
    '{Hans} hus ligger nära verkstaden.',
    '{Hen} sover i huset bredvid verkstaden.',
    'Verkstaden ligger alldeles intill {hans} hus.',
    '{Hen} bor i närheten av verkstaden.',
    '{Hen} bor granne med verkstaden.',
    'Från {hans} dörr är det bara några steg till verkstaden.',
    'Ljuden från verkstaden hör {hen} där {hen} sover.',
  ],
  besk_langeHus: [
    '{Hen} har bott länge i sitt hus.',
    'Huset {hen} äger har varit {hans} hem länge.',
    '{Hen} har bott i samma hus i många år.',
    'Huset {hen} bor i har {hen} haft i många år.',
    '{Hen} har inte flyttat på länge.',
    '{Hen} har ägt sitt hus länge.',
    '{Hen} har sitt eget hus och har bott där länge.',
    'Väggarna i {hans} hus har stått länge, och {hen} har bott där hela tiden.',
  ],
  besk_langtan: [
    '{Hen} är förälskad i {vem}.',
    '{Hen} har känslor för {vem}.',
    '{Hen} är kär i {vem}.',
    '{Hen} skulle vilja vara mer än vän med {vem}.',
    '{Hen} vill bli tillsammans med {vem}.',
    '{Hen} har ögonen på {vem}.',
    '{Hen} dras till {vem}.',
    { t: '{Hen} är förälskad i {vem}, som redan har någon annan.', om: f => f.vemUpptagen === true },
  ],
  besk_inget: [
    'Mer finns inte att säga om {honom} ännu.',
    '{Hen} har inte hunnit bli känd för något än.',
    '{Hen} har inga kända bedrifter än.',
    '{Hen} har ännu inte gjort något som byn minns.',
    'Inget särskilt finns ännu att berätta om {honom}.',
    'Byn har ännu inget att berätta om {honom}.',
    'Det mesta i {hans} liv ligger ännu framför {honom}.',
    'Byn väntar fortfarande på att få se vad {hen} går för.',
  ],
  // eftermälet (steg 6.7.4, m_eftermale): en död beskrivs i dåtid. {orsak} = 'av svält', {arstid}, {ar} = året, {aldern} = åldern
  // med ord; spad = dog innan ett år, ung = under 25, gammal
  e_dog: [
    { t: '{namn} dog {orsak} {iarstid} år {ar}, {aldern} år gammal.', om: f => !f.spad },
    { t: '{namn} dog {orsak} {iarstid} år {ar}, bara {aldern} år gammal.', om: f => f.ung === true && !f.spad },
    { t: '{namn} hann bli {aldern} år innan {hen} dog {orsak}, {iarstid} år {ar}.', om: f => f.gammal === true },
    { t: '{Iarstid} år {ar} dog {namn} {orsak}. {Hen} blev {aldern} år.', om: f => !f.spad },
    { t: '{namn} dog {orsak} när {hen} var {aldern} år, {iarstid} år {ar}.', om: f => !f.spad },
    { t: '{namn} levde ett långt liv och dog {orsak} {iarstid} år {ar}, {aldern} år gammal.', om: f => f.gammal === true },
    { t: '{Iarstid} år {ar} tog döden {namn}: {hen} dog {orsak}, {aldern} år gammal.', om: f => !f.spad },
    { t: '{namn} dog {orsak} {iarstid} år {ar}, innan {hen} hunnit fylla ett år.', om: f => f.spad === true },
    { t: '{namn} dog {orsak} {iarstid} år {ar}, innan {hen} ens blivit ett år.', om: f => f.spad === true },
  ],
  // vem hen var: {alder} = 'ung kvinna', 'gammal man' (med det som syns framför), {drag1}, {drag2}, {bind} som i besk_drag2
  e_drag2: [
    { t: '{namn} var en {alder}, {drag1} {bind} {drag2}.', om: f => !!f.alder },
    { t: 'En {alder}, {drag1} {bind} {drag2}: så var {namn}.', om: f => !!f.alder },
    { t: 'De som kände {namn} minns att {hen} var {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: 'I livet var {namn} {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: 'Man minns {namn} som {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} var {drag1}, men {drag2} var {hen} också.', om: f => !f.syns && f.bind === 'men' },
    { t: '{namn} var {drag1} som få, och {drag2} därtill.', om: f => !f.syns && f.bind === 'och' },
    { t: 'Alla som kände {namn} visste att {hen} var {drag1} {bind} {drag2}.', om: f => !f.syns },
    { t: '{namn} var {drag1} {bind} {drag2} så länge {hen} levde.', om: f => !f.syns },
  ],
  e_drag1: [
    { t: '{namn} var en {alder}, {drag1} som få.', om: f => !!f.alder },
    { t: 'En {alder} som var {drag1}: sådan var {namn}.', om: f => !!f.alder },
    { t: '{namn} var en {alder}, och mest av allt {drag1}.', om: f => !!f.alder }, // fler varianter med åldersordet, som nästan alltid finns (steg 12.1.121)
    { t: 'De som minns {namn} minns en {alder} som var {drag1}.', om: f => !!f.alder },
    { t: '{namn}, en {alder}, var {drag1} så länge {hen} levde.', om: f => !!f.alder },
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
    '{Hans} namn lever kvar i byn.',
    { t: 'Det är länge sedan nu, men några minns {honom} än.', om: f => f.lange === true },
    { t: 'Barnen som föddes efteråt har bara hört talas om {honom}.', om: f => f.lange === true },
    { t: 'Saknaden efter {honom} har inte gått över.', om: f => !f.lange },
    { t: '{Hans} barn bär minnet av {honom} vidare.', om: f => f.barn === true },
    { t: '{uppkallad} bär {hans} namn i dag.', om: f => !!f.uppkallad },
    { t: '{Hans} grav ligger utanför byn.', om: f => f.grav === true },
  ],
  // krönikan (steg 3.9.3). Alla har {arstid} ('istiden', 'våren' …), och villkoren kallt, sno, regn, natt och blast
  k_dog: [
    '{helt} dog {orsak}, {alder} år gammal.',
    'Byn sörjde när {helt} dog {orsak}. {Hen} blev {alder} år.',
    '{Alder} år fick {namn} leva innan {hen} dog {orsak}.',
    'Det var {arstid} när {helt} dog {orsak}, {alder} år gammal.',
    '{helt} är borta. {Hen} dog {orsak} vid {alder} års ålder.',
    'En tystnad föll över byn: {helt} dog {orsak}, {alder} år gammal.',
    { t: 'Elden brann lågt den kvällen. {helt} hade dött {orsak}, {alder} år gammal.', om: f => f.eld === true && f.natt === true && !f.borta },
    '{helt} dog {orsak}. {Hen} hann bli {alder} år.',
    { t: '{partner} vakade hos {helt} till slutet. {Hen} dog {orsak}, {alder} år gammal.', om: f => !!f.partner && !f.borta && ['alderdom', 'sjukdom', 'magsjuka', 'matforgiftning', 'forkylning', 'lunginflammation', 'massling', 'koppor', 'barnsjukdom', 'kallbrand', 'skorbjugg', 'svalt', 'torst', 'blod'].includes(f.orsakId as string) },
    { t: '{helt} dog {orsak}, {alder} år gammal, och lämnade {barnOrd} barn efter sig.', om: f => (f.barn as number) > 1 },
    { t: 'Snön föll när {helt} dog {orsak}. {Hen} blev {alder} år.', om: f => f.sno === true && !f.borta },
    { t: 'Mitt i natten dog {helt} {orsak}, {alder} år gammal.', om: f => f.natt === true && !f.borta },
    // steg 6.7.7
    { t: '{helt} dog {orsak} {nar}. {Hen} blev {alder} år.', om: f => !!f.nar },
    { t: 'En olycka tog {helt} {nar}. {Hen} blev {alder} år.', om: f => !!f.nar },
    { t: '{helt} kom aldrig tillbaka. {Hen} dog {orsak} {nar}, {alder} år gammal.', om: f => !!f.nar && /(fällde ett träd|var ute på jakt|fiskade|samlade grenar|samlade bär|var ute och gick)$/.test(f.nar as string) },
    { t: '{helt} dog {orsak}, {alder} år gammal. Mest av alla sörjer {sorjer}.', om: f => !!f.sorjer },
    { t: 'Ingen grät som {sorjer} när {helt} dog {orsak}. {Hen} blev {alder} år.', om: f => !!f.sorjer },
    { t: '{Sorjer} satt länge vid elden efter att {helt} dött {orsak}, {alder} år gammal.', om: f => !!f.sorjer },
    { t: '{helt} dog {orsak} {nar}, {alder} år gammal, och {sorjer} sörjer {honom}.', om: f => !!f.nar && !!f.sorjer },
    { t: 'Det var första gången döden kom till byn: {helt} dog {orsak}, {alder} år gammal.', om: f => f.forsta === true },
    { t: '{helt} hade blivit gammal och trött, och till sist orkade kroppen inte mer. {Hen} blev {alder} år.', om: f => f.orsakId === 'alderdom' },
    { t: 'Hungern blev för svår för {helt}. {Hen} dog, {alder} år gammal.', om: f => f.orsakId === 'svalt' },
    { t: '{helt} dog {orsak}, {alder} år gammal, och {partner} fick leva vidare utan {honom}.', om: f => !!f.partner },
    { t: 'Kylan tog {helt} medan elden låg släckt. {Hen} blev {alder} år.', om: f => f.orsakId === 'kyla' && f.eld === false && !f.borta },
  ],
  // ett barn som dog innan det fyllt ett år (steg 4.5.1.4): som k_dog, utan åldern
  k_dogSpad: [
    '{helt} dog {orsak}, innan {hen} hunnit fylla ett år.',
    'Byn sörjde när lilla {namn} dog {orsak}. {Hen} blev inte ens ett år.',
    '{namn} fick bara några månader innan {hen} dog {orsak}.',
    'Det var {arstid} när lilla {namn} dog {orsak}.',
    '{helt} är borta. {Hen} dog {orsak} som spädbarn.',
    'En tystnad föll över byn: lilla {namn} dog {orsak}.',
    { t: 'Elden brann lågt den kvällen. Lilla {namn} hade dött {orsak}.', om: f => f.eld === true && f.natt === true && !f.borta },
    '{mor} höll {namn} i famnen till slutet. {Hen} dog {orsak}, inte ens ett år gammal.',
    { t: 'Snön föll när lilla {namn} dog {orsak}.', om: f => f.sno === true },
    { t: 'Mitt i natten dog lilla {namn} {orsak}.', om: f => f.natt === true },
  ],
  k_fodd: [
    '{namn} föddes, {barnet} till {foraldrar}.',
    'Ett nytt barn kom till byn: {namn}, {barnet} till {foraldrar}.',
    'Ett skrik hördes i byn: {namn} hade fötts, {barnet} till {foraldrar}.',
    { t: '{namn} föddes. {mor} höll sitt barn i famnen hela natten.', om: f => !f.morDor },
    'Byn fick en ny invånare, {namn}, {barnet} till {foraldrar}.',
    'Det var {arstid} när {namn} föddes, {barnet} till {foraldrar}.',
    { t: '{mor} födde {namn}, och byn samlades för att se barnet.', om: f => !f.morDor },
    'Så kom {namn} till världen, {barnet} till {foraldrar}.',
    { t: 'Mitt i natten föddes {namn}, {barnet} till {foraldrar}.', om: f => f.natt === true },
    { t: 'I kylan föddes {namn}, {barnet} till {foraldrar}, och alla samlades kring elden.', om: f => f.kallt === true && f.eld === true },
    { t: '{foraldrar} fick ett barn till, {namn}.', om: f => (f.syskon as number) > 0 },
    { t: '{namn} föddes, {barnet} till {foraldrar}, och fick sitt namn efter {efter}.', om: f => !!f.efter && !f.efterDod },
    { t: '{foraldrar} gav sin {barnet} namnet {namn}, efter {efter} som inte längre levde.', om: f => !!f.efter && f.efterDod === true },
    { t: 'Åskan gick över byn när {namn} föddes, {barnet} till {foraldrar}, och {mor} tog det som ett tecken.', om: f => f.aska === true },
    { t: 'Strax efter {syskonet} kom {namn}. {foraldrar} hade fått tvillingar.', om: f => !!f.syskonet },
    { t: '{namn} var det första barnet som föddes i byn, {barnet} till {foraldrar}.', om: f => f.forsta === true },
  ],
  k_forstaEld: [
    '{namn} tände byns första eld.',
    'Det var {namn} som fick gnistan att ta i torrt gräs. Byn hade fått sin första eld.',
    { t: 'Byn hade frusit länge. Sedan tände {namn} den första elden, och alla samlades kring den.', om: f => f.kallt === true },
    'Röken steg för första gången över byn: {namn} hade tänt en eld.',
    '{namn} slog sten mot sten tills det tog eld. Det var byns första eld.',
    'Ingen glömmer när {namn} tände byns första eld.',
    'Det var {arstid} när {namn} tände byns första eld.',
    '{namn} blåste liv i den första glöden, och byn fick sin första eld.',
    { t: 'Mitt i natten tände {namn} byns första eld, och mörkret drog sig undan.', om: f => f.natt === true },
    { t: 'I kylan tände {namn} byns första eld, och ingen behövde frysa den natten.', om: f => f.kallt === true },
    { t: 'Gnistorna slocknade gång på gång. Först efter {forsok} försök tog elden fäste, och byn hade fått sin första eld.', om: f => (f.forsokN as number) >= 5 },
    { t: '{namn} tände byns första eld och lade en ring av stenar runt den.', om: f => f.ring === true },
    { t: 'De var bara {antal} i byn när {namn} tände den första elden.', om: f => (f.antalN as number) <= 8 },
  ],
  // det första järnet ur blästerugnen och byns första smedja (steg 13.1.8)
  k_forstaJarn: [
    '{namn} tömde blästerugnen, och ur slaggen kom byns första järn.',
    'Det var {namn} som bröt upp ugnen. Där låg en klump järn, den första byn haft.',
    'Rött och tungt låg det i askan: {namn} hade fått fram byns första järn.',
    'Det var {arstid} när {namn} fick fram byns första järn ur blästerugnen.',
    'Byn samlades kring ugnen när {namn} bröt den. Där låg det första järnet.',
    '{namn} knackade bort slaggen och höll upp byns första järn.',
    'Efter en natt vid bälgen fick {namn} fram järn, det första byn sett.',
    'Malmen och kolet blev järn under {namn}s händer, för första gången i byn.',
  ],
  k_forstaSmedja: [
    '{namn} byggde byns första smedja, och snart hördes hammaren mot städet.',
    'Nu hade byn en smedja. Det var {namn} som byggde den.',
    'Vid ässjan och städet som {namn} satte upp skulle järnet smidas.',
    'Det var {arstid} när {namn} byggde byns första smedja.',
    '{namn} murade ässjan och ställde städet bredvid. Byn hade fått en smedja.',
    'Byns första smedja stod klar, och det var {namn} som byggt den.',
    'Hammarslagen ekade första gången i byn när {namn}s smedja stod klar.',
    '{namn} gav byn en smedja, där järnet nu kunde få form.',
  ],
  k_uppfann: [
    '{namn} var den första i byn som kunde {lara}.',
    'Ingen hade gjort det förut: {namn} kom på hur man kan {lara}.',
    'Det var {namn} som först förstod hur man kan {lara}.',
    '{namn} satt länge och funderade. Sedan kom {hen} på hur man kan {lara}.',
    '{namn} kom på hur man kan {lara}, och från den dagen kunde byn det.',
    'Det var {arstid} när {namn} kom på hur man kan {lara}.',
    { t: '{namn} prövade och misslyckades, prövade igen, och till sist kunde {hen} {lara}.', om: f => f.hantverk === true }, // bara hantverk, inte det sociala (steg 12.1.121)
    'Alla kom för att se när {namn} för första gången visade hur man kan {lara}.',
    { t: 'Medan regnet föll kom {namn} på hur man kan {lara}.', om: f => f.regn === true },
    { t: 'En kall dag kom {namn} på hur man kan {lara}.', om: f => f.kallt === true },
    { t: '{namn} var bara ett barn, men det var {hen} som först kom på hur man kan {lara}.', om: f => f.ung === true },
    { t: '{namn} kom på hur man kan {lara}. {effekt}', om: f => !!f.effekt && !/^Där\b/.test(f.effekt as string) },
    { t: '{namn} hade kommit på nya saker förut, och nu kom {hen} också på hur man kan {lara}.', om: f => (f.fler as number) >= 2 },
    { t: 'Snön föll utanför när {namn} kom på hur man kan {lara}.', om: f => f.sno === true },
  ],
  // {hus2} = huset när {namn} redan nämnts: 'hans hus' i stället för 'Fannbjörns hus' (textminnet, steg 6.7.3)
  k_husKlar: [
    '{Hus} blev {klart}.',
    '{namn} lade den sista biten, och {hus2} stod {klart}.',
    '{namn} lade det sista på plats, och nu var {hus2} {klart}.',
    'Efter mycket arbete stod {hus} {klart}.',
    'Det var {arstid} när {hus} blev {klart}.',
    'Byn samlades och såg på när {namn} gjorde klart {hus3}.',
    '{namn} torkade svetten ur pannan. {Hus2} var {klart}.',
    'Nu stod {hus} {klart}, och byn var lite större.',
    { t: 'Mitt i kylan blev {hus} {klart}.', om: f => f.kallt === true },
    { t: 'I regnet gjorde {namn} klart {hus3}, och nu kunde man sitta torrt.', om: f => f.regn === true },
    { t: '{Hus} stod {klart}, och nu kunde {sova} av byborna sova under tak.', om: f => !!f.sova },
    { t: '{byggare} hade burit och byggt tillsammans med {namn}, och nu stod {hus} {klart}.', om: f => !!f.byggare },
    { t: 'Det var byns första hus. {namn} lade den sista biten, och {hus2} stod {klart}.', om: f => f.forsta === true },
    { t: 'Snön föll medan {namn} gjorde klart {hus3}.', om: f => f.sno === true },
  ],
  k_forstaLedare: [
    '{namn} blev byns första ledare, och man kallade {honom} {titel}.',
    'Byn hade aldrig haft någon som bestämde. Nu blev {namn} den första, och man kallade {honom} {titel}.',
    'De flesta lyssnade redan på {namn}, och nu blev {hen} byns första ledare och kallades {titel}.',
    'Det var {arstid} när byn fick sin första ledare: {namn}, {titel}.',
    'Vid elden bestämdes det: {namn} skulle bli byns första ledare och kallas {titel}.',
    { t: 'Byn valde {namn} till sin första ledare, {titel}, och började undra om alla är lika mycket värda.', om: f => f.satt === 'val' },
    'Den första som ledde byn var {namn}, {titel}.',
    { t: 'En kall tid behövde byn någon som bestämde. Det blev {namn}, byns första ledare, {titel}.', om: f => f.kallt === true },
    'Byn hade vuxit till {vuxna} vuxna, och nu behövdes någon som bestämde. Det blev {namn}, byns första ledare, {titel}.',
  ],
  k_ledare: [
    '{namn} blev byns ledare, och man kallade {honom} {titel}.',
    'Byn fick en ny ledare: {namn}, {titel}.',
    'Det var {arstid} när {namn} blev byns ledare, {titel}.',
    'De flesta lyssnade på {namn}, och {hen} blev byns ledare, {titel}.',
    { t: 'Byn valde {namn} till ledare, och man kallade {honom} {titel}.', om: f => f.satt === 'val' },
    'Vid elden bestämdes det att {namn} skulle leda byn, {titel}.',
    'Från den dagen ledde {namn} byn. Man kallade {honom} {titel}.',
    { t: 'Efter {forra} var det {namn} som ledde byn, och man kallade {honom} {titel}.', om: f => !!f.forra },
    { t: '{namn} ärvde makten och blev byns ledare, {titel}.', om: f => f.satt === 'arv' },
    { t: '{namn} hade vunnit striden om ledarskapet, och nu ledde {hen} byn, {titel}.', om: f => f.satt === 'strid' },
    { t: 'Prästen ville ha {namn}, och så blev {hen} byns ledare, {titel}.', om: f => f.satt === 'prast' },
  ],
  k_utvisad: [
    '{ledare} drev ut {namn} ur byn {varfor}.',
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
    { t: 'På kvällen samlades byn vid elden. {ledare} {straff} {namn} för att {hen} {brott}.', om: f => f.eld === true },
    { t: '{ledare} lät {namn} stå fram vid elden och {straff} {honom} för att {hen} {brott}.', om: f => f.eld === true },
    'Det var {arstid} när {namn} fick svara för att {hen} {brott}. {ledare} {straff} {honom}.',
    { t: '{ledare} satt länge tyst vid elden och tänkte på det {namn} gjort. Till sist bestämde {lhen} sig: {namn} skulle {straffInf}.', om: f => f.eld === true },
    { t: 'Frågan om {namn} togs upp vid elden: {hen} {brott}. {ledare} {straff} {honom}.', om: f => f.eld === true },
    { t: '{ledare} kallade {namn} till elden. {Hen} {brott}, och {ledare} {straff} {honom} inför byn.', om: f => f.eld === true },
    'Den kvällen fick {namn} svara inför {ledare} för att {hen} {brott}. Domen blev att {hen} skulle {straffInf}.',
    { t: 'Ryktet hade gått att {namn} {brott}. På kvällen tog {ledare} upp saken, och domen blev att {namn} skulle {straffInf}.', om: f => !f.sjalv },
    { t: '{ledare} hade själv sett när {namn} {brott}. Vid elden fick {namn} sitt straff: {ledare} {straff} {honom}.', om: f => f.sjalv === true && f.eld === true },
    { t: 'Regnet föll över elden när {ledare} dömde {namn}. {Hen} {brott}, och {ledare} {straff} {honom}.', om: f => f.regn === true && f.eld === true },
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
    { t: 'Det blev tyst runt elden, men ingen tyckte att {ledare} hade gjort fel.', om: f => !f.oratt && !f.dog && f.eld === true },
    { t: 'Efteråt talade man om domen vid elden, och de flesta höll med {ledare}.', om: f => !f.oratt && !f.dog && f.eld === true },
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
    { t: '{namn} och {mot} kom i luven på varandra. Det slutade med att {namn} låg svårt skadad.', om: f => !f.flera }, // (med fler än en blir det 'A och B och C')
    'Det var {arstid} när {namn} skadades svårt i ett slagsmål med {mot}.',
    { t: 'Ingen kunde stoppa slagsmålet mellan {namn} och {mot} förrän {namn} låg svårt skadad.', om: f => !f.flera },
    'Ord blev slag, och {namn} skadades svårt av {mot}.',
    'Byn talade länge om slagsmålet där {mot} skadade {namn} svårt.',
    '{namn} bar länge märkena efter slagsmålet med {mot}.',
    { t: 'Mitt i natten slogs {namn} och {mot}, och {namn} skadades svårt.', om: f => f.natt === true && !f.flera },
    { t: 'I snön syntes blodet efter slagsmålet där {mot} skadade {namn} svårt.', om: f => f.sno === true },
    { t: '{namn} vann slagsmålet mot {mot}, men fick svåra sår.', om: f => f.vann === true },
    { t: '{namn} fick ett svårt sår i {del} när {hen} slogs med {mot}.', om: f => !!f.del },
    { t: '{namn} och {mot} hade länge varit ovänner, och till sist blev det slagsmål. {namn} skadades svårt.', om: f => f.ovan === true && !f.flera },
    { t: '{vanner} slogs på samma sida som {namn}, men det hjälpte inte: {namn} skadades svårt av {mot}.', om: f => !!f.vanner },
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
    'Byn hade länge varit rädd för vargarna. Sedan dödade {namn} den första.',
    'Det var {arstid} när {namn} dödade byns första varg.',
    'Alla kom ut för att se vargen som {namn} hade fällt, byns första.',
    '{namn} stod över den döda vargen. Det var den första byn fällt.',
    'Ingen glömmer när {namn} dödade byns första varg.',
    'Med en väl riktad stöt dödade {namn} byns första varg.',
    { t: 'I snön dödade {namn} byns första varg.', om: f => f.sno === true },
    { t: 'Mitt i natten dödade {namn} byns första varg.', om: f => f.natt === true },
    { t: '{namn} fällde byns första varg med {vapnet}.', om: f => !!f.vapnet },
    { t: 'Vargen var skadad och sprang, men {namn} följde blodspåret och fällde den. Det var byns första varg.', om: f => f.spar === true },
  ],
  k_vargjakt: [
    '{folk} gick på vargjakt mot {vargar} och fällde {fallde}.{svara}',
    'Det var {arstid} när {folk} gick på vargjakt mot {vargar}. {De} fällde {fallde}.{svara}',
    { t: '{folk} tog sina spjut och gick mot {vargar}. {De} fällde {fallde}.{svara}', om: f => f.spjut === true },
    'Byn skickade {folk} på vargjakt mot {vargar}, och {de} fällde {fallde}.{svara}',
    { t: 'Med spjuten i händerna gick {folk} mot {vargar}. {De} fällde {fallde}.{svara}', om: f => f.spjut === true },
    '{folk} följde spåren till {vargar} och fällde {fallde}.{svara}',
    'Det var en vargjakt byn talade om länge: {folk} mot {vargar}, och {de} fällde {fallde}.{svara}',
    '{folk} gick ut för att göra slut på {vargar} och fällde {fallde}.{svara}',
    { t: 'I snön följde {folk} spåren till {vargar} på vargjakt, och {de} fällde {fallde}.{svara}', om: f => f.sno === true },
    { t: 'I blåsten gick {folk} på vargjakt mot {vargar}, och {de} fällde {fallde}.{svara}', om: f => f.blast === true },
    { t: '{folk} fällde {fallde} av {vargar}, och ingen av jägarna skadades svårt.', om: f => !f.svara && (f.falldeN as number) > 0 },
    { t: '{folk} fällde {fallde} av {vargar}, men {de} orkade inte bära hem alla. {Kvar} fick ligga kvar i skogen.{svara}', om: f => (f.kvarN as number) > 0 && (f.falldeN as number) >= 2 },
  ],
  k_vargSprang: [
    '{namn} gick på vargjakt{med}, men vargarna sprang innan {de} hann fram.',
    'Vargarna var borta innan {namn}{med} hann fram. Vargjakten blev ingenting.',
    '{namn} gick på vargjakt{med}, men vargarna hörde {dem} och sprang.',
    'Det var {arstid} när {namn} gick på vargjakt{med}. Vargarna sprang innan {de} hann fram.',
    'Vargjakten slutade innan den börjat: vargarna sprang när {namn}{med} kom.',
    '{namn} gick på vargjakt{med}, men såg bara vargarnas ryggar.',
    'Vargarna var för snabba för {namn}{med} på vargjakten.',
    'Ingen varg föll den dagen. {namn} gick på vargjakt{med}, men vargarna sprang.',
    { t: 'I snön syntes vargarnas spår, men de sprang innan {namn}{med} på vargjakten hann fram.', om: f => f.sno === true },
  ],
  k_vargAnfall: [
    '{svara} skadades svårt när vargar anföll.',
    'Det var {arstid} när vargar anföll och {svara} skadades svårt.',
    'Ingen hann undan när vargarna kom, och {svara} bars hem med svåra sår.',
    'Vargarnas tänder fick tag i {svara}, och såren var djupa.',
    'Byn kommer ihåg dagen då vargarna anföll och {svara} skadades svårt.',
    'Vargarna kom ur skogen. {Svara} klarade sig, men med svåra sår.',
    'När vargarna anföll fick {svara} sår som tog lång tid att läka, och byn blev rädd.',
    { t: 'Mitt i natten anföll vargar, och {svara} skadades svårt.', om: f => f.natt === true },
  ],
  // björnjakten (steg 6.6.6, bjorn.ts)
  k_bjornjakt: [
    '{folk} gick på björnjakt och fällde björnen.{svara}',
    'Det var {arstid} när {folk} gick på björnjakt. {De} fällde björnen.{svara}',
    'Byn talade länge om björnjakten: {folk} mot björnen, och björnen föll.{svara}',
    'Med spjuten i händerna gick {folk} mot björnen, och {de} fällde den.{svara}',
    { t: 'I regnet följde {folk} björnens spår och fällde den.{svara}', om: f => f.regn === true },
    'Björnen var stor och stark, men {folk} fällde den.{svara}',
    'Det tog lång tid, men till slut låg björnen död framför {folk}.{svara}',
    '{folk} kom hem från björnjakten med så mycket av björnen som {de} orkade bära.{svara}',
  ],
  k_bjornjaktMiss: [
    '{folk} gick på björnjakt, men björnen kom undan.{svara}',
    'Det var {arstid} när {folk} gick på björnjakt. Björnen var för stark, och den gick sin väg.{svara}',
    'Björnen stod emot {folk} på björnjakten och kom undan.{svara}',
    'Det blev ingen björn den gången. {folk} fick gå hem utan den.{svara}',
    'Björnen slog sig fri från {folk} och sprang in i skogen.{svara}',
    '{folk} jagade björnen länge, men den var snabbare.{svara}',
    'Ingen fällde björnen den dagen, fast {folk} försökte.{svara}',
    'Spåren efter björnen ledde djupt in i skogen, och där tog de slut. {folk} vände hem.{svara}',
  ],
  k_bjornSprang: [
    '{namn} gick på björnjakt{med}, men björnen hörde {dem} och försvann in i skogen.',
    'Det var {arstid} när {namn} gick på björnjakt{med}. Björnen gick undan innan {de} hann fram.',
    'Björnen märkte {namn}{med} på björnjakten och gick sin väg.',
    '{namn} smög efter björnen{med}, men den var borta innan {de} kom nära.',
    'När {namn} kom fram{med} fanns bara björnens spår kvar.',
    'Björnen var för vaksam. {namn}{med} såg den bara springa sin väg.',
    '{namn} gick på björnjakt{med}, men skogen var tom när {de} kom fram.',
    'Det blev ingen strid. Björnen hörde {namn}{med} och gav sig av.',
  ],
  k_forstaBjorn: [
    '{namn} dödade byns första björn.',
    'Det var {namn} som fällde byns första björn.',
    'Ingen i byn hade fällt en björn förut. Sedan gjorde {namn} det.',
    'Det var {arstid} när {namn} dödade byns första björn.',
    'Byn hade aldrig fått en björn förut, men {namn} fällde en.',
    'Länge var björnen det byn var räddast för. Sedan fällde {namn} den första.',
    'Alla i byn kom ut för att se den första björnen. {namn} hade fällt den.',
    'Byns första björn blev {hans} byte. Det var {namn} som fällde den.',
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
    { t: 'Det var natt när {namn} gjorde klart {saken}, i skenet från elden.', om: f => f.natt === true && f.eld === true },
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
    { t: 'I {den} har {namn} ristat sitt märke och orden "Åt {at}{som}."', om: f => !f.klad },
    { t: 'Inristat står det "Åt {at}{som}." {namn} gjorde {den} till {at}.', om: f => !f.klad },
    '{namn} ristade in en tillägnan: "Åt {at}{som}."',
    'Längs kanten står det, bredvid {namn}s märke: "Åt {at}{som}."',
    'Under {namn}s tecken står det "Åt {at}{som}."',
    'Den som vänder på {saken} ser {namn}s märke och orden "Åt {at}{som}."',
    'Det var åt {at} som {saken} gjordes, och det står där: "Åt {at}{som}."',
    { t: 'Inristat finns {namn}s tecken och en tillägnan: "Åt {at}{som}."', om: f => !f.klad },
  ],
  m_minne: [
    { t: 'I {den} har {namn} ristat sitt märke och orden "Till minne av {om}."', om: f => !f.klad },
    { t: 'Inristat står det "Till minne av {om}."', om: f => !f.klad },
    '{namn} ristade in: "Till minne av {om}."',
    'Längs kanten står det, bredvid {namn}s märke: "Till minne av {om}."',
    'Under {namn}s tecken står det "Till minne av {om}."',
    'Den som vänder på {saken} ser orden "Till minne av {om}."',
    'Det var i sorgen efter {om} som {saken} gjordes, och det står där: "Till minne av {om}."',
    { t: 'Inristat finns {namn}s tecken och orden "Till minne av {om}."', om: f => !f.klad },
    { t: 'I {den} har {namn} sytt in sitt märke och orden "Till minne av {om}."', om: f => f.klad === true },
  ],
  m_konst: [
    '{Den} är smyckad med {konst} som visar {motiv}.',
    'På {saken} har {namn} {gjort} {motiv}.',
    'Den som tittar noga på {saken} ser {konst} som visar {motiv}.',
    'På {saken} finns {konst} av {motiv}, så att ingen ska glömma.',
    '{konst2} på {saken} visar {motiv}.',
    '{namn} ville att byn skulle minnas, och {konst} på {saken} visar {motiv}.',
    'Runt {saken} går {konst} som visar {motiv}.',
    'Den som vill veta vad som hänt i byn kan se på {saken}: {konst} visar {motiv}.',
    '{konst2} visar {motiv}, och den som ser länge tycker att bilden ser tillbaka.',
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
    { t: '{namn} säger att {saken} blev som {hen} tänkt sig. Ingen tror på det.', om: f => f.lever === true },
    'Det går att använda {saken}, om man inte är noga. {namn} gjorde {den} {pa}.',
    'Barnen gör sig lustiga över {saken}, som {namn} gjorde {pa}{vader}.',
    { t: '"Det håller nog en dag till", säger {namn} om {saken} varje dag.', om: f => f.lever === true },
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
    'Det blev hårda ord mellan {namn} och {med}.',
    '{namn} och {med} grälade så att andra vände sig om.',
    '{namn} sa något som {med} inte tålde, och sedan var grälet igång.',
    '{namn} och {med} skildes osams.',
    { t: 'Det blev gräl mellan {namn} och {med}, som så ofta förut.', om: f => f.forr === true },
    { t: 'Mitt i natten grälade {namn} och {med}, och det hördes mellan husen.', om: f => f.natt === true && !f.inne },
  ],
  p_varsel: [
    '{namn} varnade {med} för {om}.',
    '{namn} berättade för {med} att {om} kommer.',
    '{namn} sa till {med} att det är bäst att samla inför {om}.',
    '{namn} och {med} pratade om {om} som kommer.',
    '{namn} hade anat {om}, och nu vet {med} det också.',
    '{namn} sänkte rösten och berättade om {om} för {med}.',
    '{med} fick höra av {namn} att {om} är på väg.',
    '{namn} och {med} undrade hur de skulle klara {om}.',
  ],
  p_fara: [
    '{namn} varnade {med} för {om}.',
    '{namn} berättade för {med} om {om}.',
    '{namn} sa åt {med} att hålla sig borta från {om}.',
    '{namn} och {med} pratade om {om}, och båda blev lite rädda.',
    'Av {namn} fick {med} höra om {om}.',
    '{namn} gjorde nog {om} farligare än det var, men {med} lyssnade ändå.',
    '{namn} och {med} pratade lågt om {om}.',
    '{namn} lärde {med} att vara rädd för {om}.',
  ],
  p_rykte: [
    '{namn} berättade för {med} vad man säger om {om}.',
    '{namn} och {med} skvallrade om {om}.',
    '{namn} viskade till {med} om {om}.',
    '{namn} och {med} pratade om {om}, som inte var där.',
    '{namn} hade mycket att säga om {om}, och {med} lyssnade.',
    '{namn} och {med} undrade över {om}.',
    '{namn} visste något om {om} som {med} inte visste.',
    '{med} fick höra av {namn} vad folk tror om {om}.',
  ],
  p_teknik: [
    '{namn} lärde {med} hur man ska {om}.',
    '{namn} visade {med} hur man kan {om}.',
    '{namn} och {med} pratade om hur man ska {om}.',
    '{med} frågade {namn} hur man ska {om}.',
    '{namn} förklarade för {med} hur man ska {om}.',
    '{namn} och {med} funderade över hur man bäst ska {om}.',
    '{namn} lät {med} pröva på att {om}.',
    '{med} lärde sig av {namn} hur man ska {om}.',
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
    '{namn} och {med} jämförde var de hittat {om}.',
    '{namn} beskrev för {med} vägen till {om}.',
    '{namn} sa till {med} att det finns {om} på ett ställe {hen} vet.',
    '{namn} lovade att visa {med} var {om} finns.',
    '{med} frågade {namn} om {om}, och fick ett gott råd.',
  ],
  p_fjarran: [
    '{namn} berättade för {med} om {om}.',
    { t: '{namn} och {med} pratade om {om}, långt härifrån.', om: f => f.plats !== false },
    '{med} fick höra av {namn} om {om}.',
    { t: '{namn} beskrev vägen till {om} för {med}.', om: f => f.plats !== false },
    '{med} frågade {namn} om {om}.',
    '{namn} mindes {om} och berättade det för {med}.',
    { t: '{namn} och {med} undrade hur det står till i {om}.', om: f => f.plats !== false },
    '{namn} visste något om {om}, och {med} lyssnade noga.',
  ],
  p_pris: [
    '{namn} berättade för {med} {om}.',
    '{namn} och {med} pratade om {om}.',
    '{med} fick veta av {namn} {om}.',
    '{namn} och {med} undrade {om}.',
    '{med} frågade {namn} {om}.',
    '{namn} mindes {om} och berättade det för {med}.',
    '{namn} och {med} räknade på {om}.',
    '{namn} visste {om}, och {med} lyssnade noga.',
  ],
  p_langtan: [
    '{namn} sa till {med} att {hen} längtar efter {om}.',
    '{namn} och {med} pratade om hur gott det vore med {om}.',
    '{namn} klagade för {med} att {hen} inte fått {om} på länge.',
    '{namn} och {med} drömde om {om}.',
    '{namn} pratade om {om} så att {med} också blev sugen.',
    '{namn} och {med} undrade var de kan få tag på {om}.',
    { t: '{namn} sa till {med} att barnen hemma också behövde {om}.', om: f => f.barn === true },
    { t: '{namn} sa till {med} att {hen} skulle orka mer som {yrke} med {om} i magen.', om: f => !!f.yrke && f.mat === true },
  ],
  p_karlek: [
    '{namn} och {med} retades med varandra och log.',
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
    '{namn} sa till {med} att det skulle bli bättre.',
    '{med} fick gråta ut hos {namn}.',
    '{namn} satt hos {med} tills det kändes lite lättare.',
    '{namn} försökte muntra upp {med}.',
    '{med} berättade vad som tyngde, och {namn} lyssnade.',
    '{namn} höll {med} i handen en lång stund.',
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
    { t: '{om} hade varit {slakt} till {med}, och {namn} satt hos {med} och lyssnade.', om: f => !!f.slakt },
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
  p_special: [
    '{namn} berättade för {med} om {om}.',
    '{namn} och {med} pratade om {om}.',
    '{namn} sa till {med} att ingen lagar något som {om}.',
    '{namn} och {med} längtade efter {om}.',
    '{namn} lärde {med} vad som gör {om} så god.',
    '{namn} och {med} mindes när de senast fick {om}.',
    '{med} fick höra hur {namn} tycker att {om} ska lagas.',
    '{namn} och {med} grälade lite om vad som hör hemma i {om}.',
  ],
  p_mat: [
    '{namn} och {med} pratade om maten.',
    '{namn} klagade för {med} att {hen} är hungrig.',
    '{namn} och {med} undrade om maten räcker.',
    '{namn} och {med} pratade om vad de ska äta.',
    '{namn} sa till {med} att magen knorrar.',
    '{namn} och {med} pratade om den senaste goda måltiden.',
    '{namn} och {med} räknade på vad som finns kvar att äta.',
    '{namn} och {med} pratade om var man kan hitta mat.',
  ],
  p_arbete: [
    '{namn} berättade för {med} om livet som {om}.',
    '{namn} klagade för {med} på hur slitsamt det är att vara {om}.',
    '{namn} berättade stolt för {med} om dagens arbete.',
    '{namn} och {med} pratade om vad som ska göras i morgon.',
    '{namn} förklarade för {med} hur en {om} gör.',
    '{namn} och {med} pratade om hur arbetet går.',
    '{namn} visade {med} ett knep som {hen} lärt sig som {om}.',
    '{med} ville veta hur {namn} har det som {om}.',
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
  // samtalen om ämnena från de nya systemen (steg 12.1.136): {om} = vad det gällde, när det finns något
  p_djur: [
    '{namn} och {med} pratade om djuren.',
    '{namn} berättade för {med} hur djuren mår.',
    { t: '{namn} och {med} pratade om {om}.', om: f => !!f.om },
    { t: '{namn} berättade för {med} om {om}.', om: f => !!f.om },
    '{namn} och {med} undrade om djuren har bete nog.',
    '{namn} klagade för {med} på ett djur som inte lyder.',
    '{namn} och {med} pratade om djuren som dött och de som fötts.',
    '{namn} och {med} pratade om vem som ska sköta djuren.',
    { t: '{namn} och {med} undrade om djuren klarar istiden.', om: f => f.kallt === true },
  ],
  p_sjukdom: [
    '{namn} och {med} pratade om sjukdomen.',
    { t: '{namn} och {med} pratade om {om}.', om: f => !!f.om },
    { t: '{namn} var orolig för {om}, och {med} lyssnade.', om: f => !!f.om },
    '{namn} berättade för {med} hur det känns att vara sjuk.',
    '{namn} och {med} undrade vem som blir sjuk härnäst.',
    '{namn} och {med} pratade om vad som hjälper mot sjukdomen.',
    '{namn} frågade {med} om örter som läker.',
    '{namn} och {med} pratade om de som blivit friska igen.',
    '{namn} och {med} höll sig lite ifrån varandra och pratade om smittan.',
  ],
  p_strid: [
    '{namn} och {med} pratade om striden.',
    '{namn} berättade för {med} hur striden gick till.',
    '{namn} och {med} pratade om vem som slogs bäst.',
    '{namn} visade {med} hur {hen} höll spjutet.',
    '{namn} och {med} undrade om fienden kommer tillbaka.',
    '{namn} och {med} pratade om de som skadades.',
    '{namn} berättade för {med} om rädslan i striden.',
    '{namn} och {med} pratade om hur byn ska försvara sig nästa gång.',
  ],
  p_tro: [
    '{namn} och {med} pratade om tron.',
    '{namn} berättade för {med} om gudarna.',
    '{namn} och {med} pratade om ritualen.',
    '{namn} och {med} undrade vad gudarna vill.',
    '{namn} berättade för {med} vad {hen} bad om.',
    '{namn} och {med} pratade om de heliga kvädena.',
    '{namn} och {med} pratade om tecknen.',
    '{namn} och {med} pratade om vad som händer efter döden.',
  ],
  p_skord: [
    '{namn} och {med} pratade om skörden.',
    '{namn} berättade för {med} hur fältet gav i år.',
    '{namn} och {med} pratade om vädret och grödan.',
    '{namn} och {med} undrade om förrådet räcker till istiden.',
    '{namn} klagade för {med} på en dålig skörd.',
    '{namn} och {med} pratade om vad de ska så nästa år.',
    '{namn} och {med} pratade om jorden på fältet.',
    '{namn} och {med} räknade på hur mycket fältet gett.',
  ],
  p_fest: [
    '{namn} och {med} pratade om festen.',
    '{namn} berättade för {med} om dansen.',
    '{namn} och {med} pratade om sångerna vid elden.',
    '{namn} och {med} skrattade åt något som hände på festen.',
    '{namn} och {med} pratade om maten på gästabudet.',
    '{namn} och {med} pratade om vem som dansade med vem.',
    '{namn} och {med} pratade om matchen.',
    '{namn} och {med} längtade redan till nästa fest.',
  ],
  p_lagar: [
    '{namn} och {med} pratade om lagarna.',
    '{namn} och {med} pratade om vad tinget bestämde.',
    '{namn} klagade för {med} på en lag.',
    '{namn} och {med} pratade om hur byn röstade.',
    '{namn} och {med} pratade om domen på tinget.',
    '{namn} och {med} undrade om lagen är rättvis.',
    '{namn} berättade för {med} hur det var att stå inför tinget.',
    '{namn} och {med} pratade om vem som borde leda byn.',
  ],
  p_resor: [
    '{namn} och {med} pratade om resor.',
    '{namn} berättade för {med} om vägen och platserna där borta.',
    { t: '{namn} och {med} undrade när {om} kommer hem.', om: f => !!f.om },
    { t: '{namn} väntade på att {om} skulle komma hem och pratade om det med {med}.', om: f => !!f.om },
    '{namn} och {med} pratade om byarna där borta.',
    '{namn} berättade för {med} om det {hen} sett på resan.',
    '{namn} och {med} pratade om att ge sig av en dag.',
    '{namn} och {med} pratade om vad som hänt medan någon var borta.',
  ],
  p_vardag: [
    '{namn} och {med} småpratade.',
    '{namn} och {med} skämtade.',
    '{namn} och {med} pratade om vad som hänt i byn.',
    '{namn} berättade en lustig historia för {med}.',
    '{namn} och {med} pratade om ingenting särskilt.',
    // steg 6.7.7
    '{namn} och {med} pratade om vem som gjort vad i dag.',
    '{namn} frågade {med} hur det gått, och {med} berättade.',
    '{namn} och {med} pratade om de andra i byn.',
    '{namn} och {med} satt tysta en stund, och sedan pratade de.',
    '{namn} och {med} skrattade åt något som hänt.',
    '{namn} och {med} pratade om vad som ska göras i morgon.',
    { t: '{namn} och {med} pratade om {arstid} och vad den för med sig.', om: f => !!f.arstid },
    { t: 'Det var sent, och {namn} och {med} pratade lågt.', om: f => !!f.natt },
    { t: '{namn} och {med} satt nära elden och pratade om kylan.', om: f => !!f.kallt && !!f.eld },
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
    '{namn} lyser upp när {om} kommer.',
    '{namn} och {om} hör ihop.',
    '{namn} saknar {om} så fort de är ifrån varandra.',
    '{namn} har valt {om} för livet.',
    { t: 'Barnen de fått tillsammans håller {namn} och {om} nära varandra.', om: f => !!f.barn }, // paren har oftast barn, och de står i r_partner (steg 12.1.122)
    { t: 'Det är {gifttid} sedan {namn} och {om} gifte sig.', om: f => !!f.gifttid },
    { t: '{namn} och {om} har aldrig hållit bröllop, men de är ett par ändå.', om: f => !f.gift },
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
    'Det {namn} tänker säger {hen} först till {om}.',
    '{namn} och {om} sitter ofta bredvid varandra vid elden.',
    // steg 6.7.7
    '{namn} känner sig trygg när {om} är nära.',
    '{namn} och {om} förstår varandra utan många ord.',
    'Blir det bråk ställer sig {namn} alltid på samma sida som {om}.',
    { t: '{namn} och {om} har pratat så många gånger att de vet vad den andra ska säga.', om: f => !!f.mycketPrat },
    { t: '{namn} och {om} har slagits sida vid sida, och det glömmer de inte.', om: f => !!f.sida },
    { t: '{namn} och {om} har grälat, men de blev alltid sams igen.', om: f => !!f.gral },
    { t: '{namn} är bara ett barn, men {hen} följer {om} vart {omHen} än går.', om: f => !!f.ung },
    { t: 'De gamla säger att {namn} och {om} är som syskon.', om: f => !!f.gammal && !f.kin },
    { t: '{namn} blir glad bara {om} sätter sig bredvid.', om: f => !!f.glad },
    { t: 'Barnen de fått tillsammans håller {namn} och {om} nära varandra.', om: f => !!f.barn },
    { t: 'Av alla i byn är det {om} som {namn} räknar som sin bästa vän.', om: f => !!f.bast },
    { t: '{namn} tittar efter {om} lite längre än man gör efter en vän.', om: f => !!f.rom && !f.kin && !f.ung },
    { t: '{namn} står bakom {om}, som leder byn.', om: f => !!f.omLedare },
  ],
  r_van: [
    '{namn} tycker om {om}.',
    '{namn} trivs i sällskap med {om}.',
    '{namn} ser {om} som en vän.',
    '{namn} pratar gärna med {om}.',
    '{namn} och {om} kommer bra överens.',
    '{namn} skrattar gärna åt det {om} säger.',
    '{namn} hjälper {om} när det behövs.',
    '{namn} sätter sig gärna bredvid {om} vid elden.',
    '{namn} och {om} har roligt när de arbetar ihop.',
    '{namn} lyssnar när {om} berättar något.',
    '{namn} delar gärna med sig till {om}.',
    // steg 6.7.7
    '{namn} hälsar alltid glatt på {om}.',
    'Det är sällan ett ont ord mellan {namn} och {om}.',
    '{namn} tycker att {om} är bra att ha i byn.',
    { t: '{namn} och {om} har pratat många kvällar vid elden.', om: f => !!f.mycketPrat },
    { t: '{namn} och {om} har slagits sida vid sida.', om: f => !!f.sida },
    { t: '{namn} ser upp till {om} och vill vara i närheten.', om: f => !!f.ung },
    { t: '{namn} skrattar när {om} är i närheten.', om: f => !!f.glad },
    { t: 'Ett gräl har de haft, men {namn} tycker ändå om {om}.', om: f => !!f.gral },
    { t: '{namn} och {om} gör samma arbete, och det ger dem mycket att prata om.', om: f => !!f.sammaYrke && Number(f.talks) > 0 },
    { t: '{namn} blir lite blyg när {om} kommer nära.', om: f => !!f.rom && !f.kin && !f.ung },
  ],
  r_bekant: [
    '{namn} känner {om} men inte så väl.',
    '{namn} har inget särskilt emot {om}.',
    { t: '{namn} pratar med {om} ibland.', om: f => Number(f.talks) > 0 },
    '{namn} och {om} har inte mycket gemensamt.',
    '{namn} och {om} lever mest var för sig.',
    '{namn} och {om} nickar åt varandra, mer blir det inte.',
    '{namn} vet inte mycket om {om}, och frågar inte heller.',
    'För {namn} är {om} en av de andra i byn, inte mer.',
    '{namn} och {om} har aldrig haft mycket att säga varandra.',
    // steg 6.7.7
    '{namn} vet vad {om} heter, och inte mycket mer.',
    '{namn} och {om} går om varandra utan att märka det.',
    'Det är sällan {namn} tänker på {om}.',
    '{namn} har inget ont att säga om {om}, och inget gott heller.',
    '{namn} och {om} arbetar ibland nära varandra, men pratar lite.',
    { t: '{namn} och {om} har bara pratat några få gånger.', om: f => !f.mycketPrat && (f.talks as number) > 0 },
    { t: '{namn} och {om} har aldrig pratat med varandra.', om: f => !f.talks },
    { t: '{namn} är för liten för att bry sig om {om}.', om: f => !!f.liten },
    { t: '{namn} har sett {om} växa upp, men de står inte varandra nära.', om: f => !f.ung && !!f.omUng }, // varje vuxen har sett barnen växa upp (steg 12.1.122)
    { t: '{namn} och {om} gör samma arbete, men pratar sällan om det.', om: f => !!f.sammaYrke && !f.mycketPrat },
    { t: '{om} leder byn, men för {namn} är det mest ett namn.', om: f => !!f.omLedare },
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
    // steg 6.7.7
    '{namn} blir trött på {om} fort.',
    '{namn} går hellre åt ett annat håll än bredvid {om}.',
    'Det blir sällan ett vänligt ord från {namn} till {om}.',
    '{namn} lyssnar inte gärna på {om}.',
    { t: '{namn} har grälat med {om} och har inte glömt det.', om: f => !!f.gral },
    { t: '{namn} och {om} har slagits, och det sitter kvar.', om: f => !!f.slag },
    { t: 'Barnet {namn} gömmer sig när {om} kommer.', om: f => !!f.liten },
    { t: '{namn} tycker inte att {om} är den som borde leda byn.', om: f => !!f.omLedare },
    { t: 'Släkt är släkt, men {namn} har svårt för {om}.', om: f => !!f.kin },
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
    'Om {namn} fick välja skulle {om} lämna byn.',
    '{namn} tänker på {om} med vrede.',
    '{namn} vänder ryggen till när {om} går förbi.',
    { t: '{namn} och {om} har slagits, och det kan hända igen.', om: f => !!f.slag },
    { t: '{namn} och {om} grälar så fort de ses.', om: f => !!f.gral },
    { t: '{namn} är bara ett barn, men {hen} är rädd för {om}.', om: f => !!f.ung },
    { t: '{namn} har levt länge, men {om} har {hen} aldrig förlåtit.', om: f => !!f.gammal && (!!f.gral || !!f.slag) },
    { t: 'Att {om} leder byn kan {namn} inte stå ut med.', om: f => !!f.omLedare },
    { t: 'De är släkt, men {namn} vill ändå inte kännas vid {om}.', om: f => !!f.kin },
    { t: 'Det har gått så långt att den ena har gjort den andra illa i vredesmod.', om: f => !!f.illa },
    { t: '{namn} och {om} gör samma arbete, och ingen av dem vill stå bredvid den andra.', om: f => !!f.sammaYrke },
  ],
  r_kemiBra: [
    'Det klickade mellan dem från början.',
    'De har alltid haft lätt för varandra.',
    'De har samma sätt att se på saker.',
    'De tänker ofta samma sak på samma gång.',
    'De drar sig till varandra.',
    'De skrattar åt samma saker.',
    'De blir glada av att träffas.',
    'De har aldrig behövt anstränga sig för att komma överens.',
  ],
  r_kemiDalig: [
    'De har haft svårt för varandra från början.',
    'De skaver mot varandra hur de än gör.',
    'De ser på saker på helt olika sätt.',
    'Det har aldrig stämt mellan dem.',
    'De missförstår varandra hela tiden.',
    'De retar sig på varandra.',
    'De går helst åt var sitt håll.',
    'Det blir lätt tyst och kyligt när de möts.',
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
    { t: 'En ljus natt gifte sig {a} och {b}.', om: f => f.natt === true && f.arstid === 'sommaren' },
  ],
  // den som lämnade byn (flyttskal.ts, B.42): {vem} = de som gick, {mal} = vad de gick för att göra, {skal} = meningen ur k_flyttSkal
  k_flytt: [
    '{vem} lämnade byn {mal}. {skal}',
    '{vem} packade det som gick att bära och lämnade byn {mal}. {skal}',
    'Det var {arstid} när {vem} lämnade byn {mal}. {skal}',
    '{vem} gick sin väg {mal}. {skal}',
    '{vem} tog farväl och gick {mal}. {skal}',
    '{vem} bröt upp från byn {mal}. {skal}',
    { t: 'I snön lämnade {vem} byn {mal}. {skal}', om: f => f.sno === true },
    { t: 'I regnet lämnade {vem} byn {mal}. {skal}', om: f => f.regn === true },
  ],
  // de som lämnade byn slog läger som rövare (byflytt.ts, B.68): {vem} = de som gick, {lager} = lägrets namn, {skal} = k_flyttSkal
  k_rovlager: [
    '{vem} slog läger som rövare: {lager}. {skal}',
    { t: '{vem} kom aldrig fram till någon by. I {lager} blev det rövare av dem som gått. {skal}', om: f => !!f.fler },
    'Vägen slutade i {lager}, där {vem} slog läger och levde av att råna. {skal}',
    { t: 'I {lager} samlades {vem} och tog det de behövde från andra. {skal}', om: f => !!f.fler },
    'Ingen by väntade på {vem}. Nu bor rövare i {lager}. {skal}',
    'Några dygn senare hördes det: {vem} levde som rövare i {lager}. {skal}',
    'Hellre rövare än hungrig gäst. {vem} reste sitt läger, {lager}. {skal}',
    { t: 'Skogen tog emot {vem}. Deras läger kallas {lager}, och vägen dit är farlig nu. {skal}', om: f => !!f.fler },
    { t: 'Utan by och utan vänner slog {namn} läger som rövare: {lager}. {skal}', om: f => f.fredlos === true },
    { t: 'Den utvisade byggde sig ett näste, {lager}, och började leva av att råna. {skal}', om: f => f.fredlos === true },
    { t: 'I {lager} slog {vem} läger och tog det som behövdes från andra. {skal}', om: f => !f.fler },
  ],
  // skälet: {tanke} = det som tyngde hen mest (som det står i humöret), {byn} = byns skäl
  k_flyttSkal: [
    { t: 'Det som tyngde {honom} mest var ”{tanke}”, och {byn}.', om: f => !!f.tanke && !!f.byn },
    { t: '{Byn}, och {namn} bar på något eget: ”{tanke}”.', om: f => !!f.tanke && !!f.byn },
    { t: 'Det som tyngde {honom} mest var ”{tanke}”.', om: f => !!f.tanke && !f.byn },
    { t: '{namn} bar på något som inte gick att leva med: ”{tanke}”.', om: f => !!f.tanke && !f.byn },
    { t: '{namn} kunde inte stanna, för ”{tanke}” tyngde mer för var dag.', om: f => !!f.tanke && !f.byn },
    { t: 'Skälet var enkelt: {byn}.', om: f => !f.tanke && !!f.byn },
    { t: '{Byn}.', om: f => !f.tanke && !!f.byn },
    { t: '{namn} hade burit på ”{tanke}” länge, och till sist orkade {hen} inte mer.', om: f => !!f.tanke && !f.byn },
  ],
  // berättelsen om tiden borta (steg 5.4.4, ui/borta.ts): kronikans rader binds ihop av de här meningarna.
  // {ar} = antal år (i ord), {fore} och {nu} = invånare när man gick och nu, {fodda} och {doda} = antal (i ord)
  b_lugnt: [
    'Det hände inte mycket. Folket gick till sina sysslor och kom hem till elden.',
    'Byn levde sitt stilla liv medan du var borta.',
    'Ingen dog och ingen föddes. Det var en lugn tid.',
    'Tiden gick, och byn var sig lik.',
    'Inget särskilt hände medan du var borta. Byn arbetade, åt och sov.',
    'Dagarna gick som de brukar i byn, utan något som krönikan behövde minnas.',
    { t: 'Det var kallt, men lugnt i byn medan du var borta.', om: f => f.kallt === true },
    { t: 'När du gick var det {forra}. Nu är det {nuarstid}, och inget stort har hänt.', om: f => !!f.forra && f.forra !== f.nuarstid },
  ],
  b_inledning: [
    'Medan du var borta gick {ar} år.',
    '{Ar} år hann gå innan du kom tillbaka.',
    'Du var borta i {ar} år, och mycket hann hända.',
    { t: '{Ar} år gick. När du gick bodde {fore} i byn, och nu bor {nu} där.', om: f => f.nuTal !== f.foreTal },
    { t: 'Medan du var borta gick {ar} år. {Fodda} barn föddes och {doda} dog.', om: f => Number(f.foddaTal) > 0 && Number(f.dodaTal) > 0 },
    { t: 'Det blev {ar} år, och byn växte: från {fore} till {nu} invånare.', om: f => Number(f.nuTal) > Number(f.foreTal) },
    { t: 'Det blev {ar} tunga år, och byn krympte: från {fore} till {nu} invånare.', om: f => Number(f.nuTal) < Number(f.foreTal) },
    { t: '{Ar} år gick, och byn är lika stor som när du gick: {nu} invånare.', om: f => f.nuTal === f.foreTal },
    { t: '{Ar} år gick utan att någon dog i byn.', om: f => f.doda === 'ingen' },
  ],
  b_ar: [
    { t: 'Året därpå var år {ar}.', om: f => !f.forsta },
    { t: 'Så gick byn in i år {ar}.', om: f => !f.forsta },
    { t: 'Sedan började år {ar}.', om: f => !f.forsta },
    'År {ar}:',
    { t: 'År {ar} blev ett sorgens år.', om: f => Number(f.dodaTal) > 0 },
    { t: 'År {ar} blev ett tungt år för byn.', om: f => Number(f.dodaTal) > 1 },
    { t: 'År {ar} var ett gott år.', om: f => f.dodaTal === 0 && Number(f.foddaTal) > 0 },
    { t: 'År {ar} föddes det barn i byn.', om: f => f.dodaTal === 0 && Number(f.foddaTal) > 1 },
    { t: 'År {ar} föddes {fodda} barn, och {doda} dog.', om: f => Number(f.foddaTal) > 0 && Number(f.dodaTal) > 0 },
    { t: 'Samma år som du gick, år {ar}:', om: f => !!f.forsta },
  ],
  b_arLugnt: [
    'År {ar} var stilla. Folket arbetade och åt.',
    'Under år {ar} levde byn som den brukar.',
    'År {ar} var ett lugnt år.',
    'Under år {ar} hände inget som krönikan minns.',
    'År {ar} gick stilla förbi.',
    { t: 'År {ar} var ett stilla istidsår.', om: f => f.arstid === 'istiden' },
    { t: 'År {ar} var en stilla sommar.', om: f => f.arstid === 'sommaren' },
    'År {ar} blev inget att minnas, och det var gott nog.',
  ],
  b_alder: [
    '{Arstid} varade {aren}.',
    { t: 'Sedan följde {arstid}, {aren}.', om: f => !f.forsta },
    { t: 'Så kom {arstid}, {aren}.', om: f => !f.forsta },
    'Under {arstid}, {aren}:',
    { t: 'Sedan kom {arstid} ({aren}).', om: f => !f.forsta },
    { t: '{Arstid} ({aren}) blev en tung tid.', om: f => Number(f.dodaTal) > 1 },
    { t: '{Arstid} ({aren}) var en god tid för byn.', om: f => f.dodaTal === 0 && Number(f.foddaTal) > 0 },
    { t: '{Arstid} ({aren}) var en lugn tid.', om: f => f.tomt === true },
    { t: '{Arstid} hade redan börjat när du gick.', om: f => !!f.forsta },
  ],
  b_ovrigt: [ // {n} = antalet i ord; en (ensam småsak) har egna varianter
    { t: '{N} mindre saker hände också.', om: f => f.n !== 'en' },
    { t: 'Det hände också {n} andra saker, men inget av dem var stort.', om: f => f.n !== 'en' },
    { t: '{N} småsaker till står i krönikan.', om: f => f.n !== 'en' },
    { t: 'Till det kom {n} mindre händelser.', om: f => f.n !== 'en' },
    { t: 'Krönikan minns {n} saker till, men de var små.', om: f => f.n !== 'en' },
    { t: 'Något litet hände också, som står i krönikan.', om: f => f.n === 'en' },
    { t: 'En småsak till står i krönikan.', om: f => f.n === 'en' },
    { t: 'Krönikan minns en sak till, men den var liten.', om: f => f.n === 'en' },
    { t: 'Det hände också {n} mindre saker, mest {slagord}.', om: f => f.n !== 'en' && !!f.slagord },
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
    '{Kund} gick fram till {handlare} och ville ha {envara}.',
    '{Kund} hade sett {vara} på filten och ville köpa.',
    '{Kund} satte sig vid filten mitt emot {handlare}. Det var {envara} {kund} ville ha.',
    '{Kund} pekade på {vara} och frågade vad {handlare} ville ha för det.',
    '{Kund} hade länge velat ha {vara}, och nu låg det på filten.',
    { t: '{Kund} gick fram till {handlare} för byns räkning. Byn behövde {envara}.', om: f => f.byn === true && f.salj !== true },
    { t: 'Byn skickade {kund}, och det var {vara} byn ville ha.', om: f => f.byn === true && f.salj !== true },
    { t: '{Kund} hade {vara} över och ville sälja det för silver.', om: f => f.salj === true },
    { t: '{Kund} bar fram {vara} och frågade om {handlare} ville köpa.', om: f => f.salj === true },
  ],
  // ett argument ur registret HANDELSARG (handelsber.ts): {arg} = argumentets id, {bynamn} = byns namn, som handlaren säger
  // (byborna säger byn, steg 10.9.5)
  h_arg: [
    { t: '{Kund} påpekade att {vara} var slarvigt gjort.', om: f => f.arg === 'slitet' },
    { t: '"Se på det här, det håller inte länge", sa {kund} om {vara}.', om: f => f.arg === 'slitet' },
    { t: 'Det syntes att {vara} inte var väl gjort, och det sa {kund} också.', om: f => f.arg === 'slitet' },
    { t: '{Handlare} visade hur fint {vara} var gjort.', om: f => f.arg === 'fint' },
    { t: '"Sådant arbete hittar du inte i någon by här omkring", sa {handlare}.', om: f => f.arg === 'fint' },
    { t: '"Så fint gör ingen i {bynamn}", sa {handlare}.', om: f => f.arg === 'fint' && !!f.bynamn },
    { t: '{Handlare} lät {kund} känna på {vara}, som var mycket väl gjort.', om: f => f.arg === 'fint' },
    { t: '"Vintern är nära", påminde {handlare}. "Då vill du inte vara utan."', om: f => f.arg === 'vinter' },
    { t: '{Handlare} talade om hösten och om att kölden snart kommer.', om: f => f.arg === 'vinter' },
    { t: 'Löven föll, och {handlare} menade att det inte var läge att pruta inför vintern.', om: f => f.arg === 'vinter' },
    { t: '{Kund} sa att ingen hade något över under istiden.', om: f => f.arg === 'istid' },
    { t: '"Det är istid, vi har knappt nog åt oss själva", sa {kund}.', om: f => f.arg === 'istid' },
    { t: '{Kund} pekade på snön och sa att byn inte hade mycket att ge.', om: f => f.arg === 'istid' },
    { t: '{Handlare} visste att byn saknade {vara}, och sa det rakt ut.', om: f => f.arg === 'behov' },
    { t: '"Ni har inget sådant själva", sa {handlare}. "Det ser jag."', om: f => f.arg === 'behov' },
    { t: '"Sådant finns inte i {bynamn}", sa {handlare}. "Det vet jag."', om: f => f.arg === 'behov' && !!f.bynamn },
    { t: '{Handlare} märkte hur mycket {kund} behövde {envara}.', om: f => f.arg === 'behov' },
    { t: '{Handlare} sa att vägen hit hade varit lång.', om: f => f.arg === 'langt' },
    { t: '"Jag har burit det här i många dagar", sa {handlare}.', om: f => f.arg === 'langt' },
    { t: '"Det är långt till {bynamn}", sa {handlare}. "Jag har burit det här i många dagar."', om: f => f.arg === 'langt' && !!f.bynamn },
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
    { t: 'Det var något med {kund} som {handlare} inte tyckte om.', om: f => f.arg === 'kemiDalig' },
    { t: 'De hade svårt att förstå varandra.', om: f => f.arg === 'kemiDalig' },
    { t: '{Handlare} såg misstänksamt på {kund} hela tiden.', om: f => f.arg === 'kemiDalig' },
    { t: '{Kund} talade för hela byn och ville ha ett pris som byn kunde betala.', om: f => f.arg === 'byn' },
    { t: '"Det är inte för min egen skull", sa {kund}. "Hela byn behöver det."', om: f => f.arg === 'byn' },
    { t: '{Handlare} blev irriterad över ett bud som var alldeles för lågt.', om: f => f.arg === 'irriterad' },
    { t: '"Försöker du lura mig?" sa {handlare} när budet kom.', om: f => f.arg === 'irriterad' },
    { t: '"Är det så man handlar i {bynamn}?" sa {handlare} när budet kom.', om: f => f.arg === 'irriterad' && !!f.bynamn },
    { t: 'Ett av buden var så snålt att {handlare} blev sur.', om: f => f.arg === 'irriterad' },
  ],
  // stämningen: nej = antal nej i ord (nejTal = talet), upp/ner = relationen blev bättre eller sämre
  h_stamning: [
    { t: 'Det gick fort, och ingen behövde höja rösten.', om: f => f.nejTal === 0 },
    { t: '{Handlare} nickade nästan direkt.', om: f => f.nejTal === 0 },
    { t: '{Handlare} sa nej {nej} gång, och {kund} fick lägga till lite.', om: f => f.nejTal === 1 },
    { t: 'Det första budet räckte inte, men de var inte långt ifrån varandra.', om: f => f.nejTal === 1 },
    { t: '{Kund} fick höja en gång innan det började likna något.', om: f => f.nejTal === 1 },
    { t: 'De prutade länge, och {handlare} skakade på huvudet {nej} gånger.', om: f => Number(f.nejTal) > 1 },
    { t: '{Kund} lade till och tog bort, bud efter bud.', om: f => Number(f.nejTal) > 1 },
    { t: 'Stämningen blev sämre för varje nej.', om: f => Number(f.nejTal) > 1 && f.ner === true },
  ],
  // hur det slutade: avbruten = de blev inte överens, upp = handlaren tyckte bättre om kunden efteråt
  h_slut: [
    { t: 'Till slut tog de i hand.', om: f => f.avbruten !== true },
    { t: 'Efter {bud} bud var de överens, och de skakade hand.', om: f => f.avbruten !== true && f.bud !== 'ett' },
    { t: 'De blev överens, och {kund} bar hem det.', om: f => f.avbruten !== true && f.salj !== true },
    { t: 'Det blev en affär, och båda såg nöjda ut.', om: f => f.avbruten !== true && f.upp === true },
    { t: '{Handlare} gick nöjd därifrån och tyckte lite bättre om {kund} efteråt.', om: f => f.avbruten !== true && f.upp === true },
    { t: 'Affären blev av, men ingen av dem log.', om: f => f.avbruten !== true && f.upp !== true },
    { t: 'Efter {bud} bud gav {kund} upp och gick tomhänt.', om: f => f.avbruten === true },
    { t: '{Kund} reste sig och gick. Det blev ingen affär.', om: f => f.avbruten === true },
    { t: '{Handlare} packade tillbaka {vara}, och {kund} gick hem utan något.', om: f => f.avbruten === true && f.salj !== true },
  ],
  // berättelsen om ett framträdande (steg 5.4.7.2, framber.ts): {namn} = den som uppträdde, {amne} = vad det handlade om,
  // {inst} = instrumentet (bestämd form), form = formens id, bud = budskapet, {om} = den det handlade om, {ledare}, {betalt}
  f_start: [
    { t: '{Namn} kvad om {amne}.', om: f => f.form === 'kvade' },
    { t: 'När elden brann som bäst började {namn} kväda om {amne}.', om: f => f.form === 'kvade' && !f.scen },
    { t: '{Namn} reste sig och höll ett tal om {amne}.', om: f => f.form === 'tal' },
    { t: 'Alla tystnade när {namn} började tala om {amne}.', om: f => f.form === 'tal' },
    { t: '{Namn} lärde de andra vad som går att veta om {amne}.', om: f => f.form === 'forelasning' },
    { t: 'Den kvällen fick de andra lära sig om {amne} av {namn}.', om: f => f.form === 'forelasning' },
    { t: 'Med röster och stora rörelser spelade {namn} upp en berättelse om {amne}.', om: f => f.form === 'teater' },
    { t: '{Namn} gav varje person en egen röst och spelade teater om {amne}.', om: f => f.form === 'teater' },
    { t: '{Namn} tog {inst} och sjöng om {amne}.', om: f => f.form === 'sang' },
    { t: 'Till {inst} sjöng {namn} en sång om {amne}.', om: f => f.form === 'sang' },
    { t: '{Namn} tog fram {inst} och spelade för de andra.', om: f => f.form === 'musik' },
    { t: 'Tonerna från {inst} hördes över byn när {namn} spelade.', om: f => f.form === 'musik' },
    { t: '{Namn} spelade upp en berättelse om {amne}. {Om} fick spela sig själv.', om: f => f.form === 'teater' && !!f.omMed },
    { t: 'Det var mitt i istiden när {namn} började kväda om {amne}.', om: f => f.form === 'kvade' && f.arstid === 'istiden' },
  ],
  // budskapet (bara när det fanns ett): bud = person, hylla, hana eller tro; betalt = ledaren betalade, eller {kyrka} betalade med {betalt} (steg 10.7.18)
  f_bud: [
    { t: 'Det var ingen slump att det handlade om {om}. {Namn} ville påverka vad byn tyckte.', om: f => f.bud === 'person' },
    { t: '{Namn} lade inte fingrarna emellan när det gällde {om}.', om: f => f.bud === 'person' },
    { t: '{Bestallt} hade gett {namn} en {betalt} för att det skulle handla om {om}.', om: f => f.bud === 'person' && !!f.bestallt && !f.kyrka },
    { t: 'Framträdandet var beställt: {bestallt} ville att byn skulle höra om {om}.', om: f => f.bud === 'person' && !!f.bestallt },
    { t: 'Det var en hyllning till {ledare}, som leder byn.', om: f => f.bud === 'hylla' && !f.betalt },
    { t: '{Namn} lovordade {ledare} inför hela publiken.', om: f => f.bud === 'hylla' && !f.betalt },
    { t: '{Ledare} hade betalat med en {betalt} för att bli hyllad, och det blev {ledare} också.', om: f => f.bud === 'hylla' && !!f.betalt },
    { t: 'Framträdandet var beställt: {ledare} hade gett {namn} en {betalt} för det.', om: f => f.bud === 'hylla' && !!f.betalt },
    { t: '{Namn} drev med {ledare} och härmade sättet att gå.', om: f => f.bud === 'hana' },
    { t: 'Det var inte svårt att höra att det var {ledare} som hånades.', om: f => f.bud === 'hana' },
    { t: '{Namn} gjorde narr av {ledare}, som tror sig vara förmer än de andra.', om: f => f.bud === 'hana' },
    { t: '{Namn} drev med {amne} och sade att de inte fanns.', om: f => f.bud === 'hanaGud' },
    { t: 'Det var gudarna som fick höra det, och de troende teg.', om: f => f.bud === 'hanaGud' },
    { t: '{Kyrka} hade betalat {namn} med {betalt} för att tala om tron.', om: f => !!f.kyrka && f.bud === 'tro' },
    { t: '{Kyrka} hade betalat {namn} med {betalt} för att minnet av {om} skulle leva.', om: f => !!f.kyrka && f.bud === 'person' },
    { t: '{Namn} hade fått {betalt} av kyrkan för framträdandet, och det hördes.', om: f => !!f.kyrka },
    { t: 'Det var tron som låg {namn} varmast om hjärtat.', om: f => f.bud === 'tro' && !f.kyrka },
    { t: '{Namn} ville vinna fler för tron.', om: f => f.bud === 'tro' && !f.kyrka },
    { t: '{Namn} gjorde det {om} hade gjort större än det var.', om: f => f.bud === 'person' && f.vrid === 1 },
    { t: '{Namn} talade tyst om det {om} hade gjort, som om det inte var mycket att säga om.', om: f => f.bud === 'person' && f.vrid === -1 },
    { t: '{Namn} talade om gudarna som om de satt bland publiken.', om: f => f.bud === 'tro' && !f.kyrka },
  ],
  // publiken: {n} = hur många i ord, nTal = talet
  f_publik: [
    { t: 'Bara {n} satt och lyssnade.', om: f => f.nTal === 1 },
    { t: 'En enda satt kvar vid elden och lyssnade.', om: f => f.nTal === 1 && !f.scen },
    { t: '{N} satt runt elden och lyssnade.', om: f => Number(f.nTal) > 1 && !f.scen },
    { t: '{N} hade samlats för att lyssna.', om: f => Number(f.nTal) > 1 },
    { t: 'Nästan hela byn var där, {n} stycken.', om: f => Number(f.andel) >= 0.8 },
    { t: '{N} satt framför scenen och lyssnade.', om: f => Number(f.nTal) > 1 && !!f.scen },
    { t: 'Det var så kallt att de satt tätt ihop medan de lyssnade.', om: f => f.kallt === true && Number(f.nTal) > 1 },
    { t: 'Ingen av dem hade hört {namn} uppträda förut.', om: f => f.forsta === true },
  ],
  // mottagningen: bra = ett gott framträdande, dalig = ett dåligt (annars mitt emellan), form = formens id
  f_mott: [
    { t: 'Publiken skrattade så att det hördes över hela byn.', om: f => f.bra === true && f.form === 'teater' },
    { t: 'Några nynnade med, och någon klappade takten.', om: f => f.bra === true && (f.form === 'sang' || f.form === 'musik') },
    { t: 'Det blev alldeles tyst runt elden, och någon torkade en tår.', om: f => f.bra === true && (f.form === 'kvade' || f.form === 'sang') && !f.scen },
    { t: 'De som lyssnade nickade och höll med.', om: f => f.bra === true && f.form === 'tal' },
    { t: 'De lyssnade noga och ville höra mer.', om: f => f.bra === true && f.form === 'forelasning' },
    { t: 'Efteråt ville alla prata om det.', om: f => f.bra === true },
    { t: 'Det var ett av de bästa framträdandena på länge, och publiken blev glad.', om: f => f.bra === true },
    { t: 'Publiken lyssnade artigt.', om: f => f.bra !== true && f.dalig !== true },
    { t: 'Det var inte märkvärdigt, men ingen klagade.', om: f => f.bra !== true && f.dalig !== true },
    { t: 'Några lyssnade, andra tittade in i elden.', om: f => f.bra !== true && f.dalig !== true && !f.scen },
    { t: 'Det blev tyst på fel sätt, och några tittade bort.', om: f => f.dalig === true },
    { t: 'Publiken skruvade på sig.', om: f => f.dalig === true },
    { t: '{Namn} tappade tråden flera gånger, och det glömde publiken inte i första taget.', om: f => f.dalig === true && f.ner === true },
    { t: 'Efteråt såg publiken på {namn} med nya ögon.', om: f => f.bra === true && f.upp === true },
    { t: '{Inst} lät bättre än orden.', om: f => f.dalig === true && f.form === 'sang' && !!f.inst },
  ],
  // vad det ledde till (en mening per sak): verkan = hylla, hana, rykte eller tro; {rykte} och {tro} = namnen
  f_verkan: [
    { t: 'Efteråt såg publiken på {ledare} med lite större respekt.', om: f => f.verkan === 'hylla' },
    { t: 'Flera i publiken tyckte lite bättre om {ledare} efter det.', om: f => f.verkan === 'hylla' },
    { t: '{Hanad} tvivlade efteråt och tyckte sämre om {namn}.', om: f => f.verkan === 'hanaGud' },
    { t: 'De troende i publiken, {hanad}, gick därifrån med svagare tro.', om: f => f.verkan === 'hanaGud' },
    { t: 'Publiken skrattade åt {ledare}, som blev arg på {namn}.', om: f => f.verkan === 'hana' },
    { t: 'Det blev skratt, men {ledare} tyckte inte att det var roligt.', om: f => f.verkan === 'hana' },
    { t: 'Snart visste {rykte} vad {namn} tyckte om {om}.', om: f => f.verkan === 'rykte' },
    { t: 'Efteråt pratade {rykte} om det som sagts om {om}.', om: f => f.verkan === 'rykte' },
    { t: '{Tro} började tro på det {namn} talat om.', om: f => f.verkan === 'tro' },
    { t: 'Efter den kvällen trodde {tro} också.', om: f => f.verkan === 'tro' },
  ],
  // ingen kom (steg 5.4.7.1)
  f_inget: [
    { t: '{Namn} ställde sig vid elden för att uppträda, men ingen kom.', om: f => !f.scen },
    '{Namn} hade förberett sig, men alla hade annat för sig.',
    { t: 'Platsen vid elden förblev tom, och {namn} fick vänta förgäves.', om: f => !f.scen },
    'Det blev inget framträdande: ingen kom.',
    '{Namn} såg sig omkring, men ingen satte sig för att lyssna.',
    { t: 'Elden sprakade, men ingen kom för att höra {namn}.', om: f => !f.scen },
    { t: '{Inst} låg kvar orörd vid scenen, för ingen kom.', om: f => !!f.inst && !!f.scen },
    '{Namn} väntade länge, men ingen lyssnare kom.',
  ],
  // Berättelsen om en match (steg 5.4.8.2, matchber.ts): början efter sporten ({sport} = sporten, {spelare} = namnen, {n} = hur många)
  m_start: [
    { t: '{Spelare} brottades mitt i byn.', om: f => f.sport === 'brottning' },
    { t: 'Det blev brottning i byn, och {spelare} tog tag i varandra.', om: f => f.sport === 'brottning' },
    { t: '{Spelare} drog i var sin ände av repet.', om: f => f.sport === 'dragkamp' && !f.lag },
    { t: 'Det blev dragkamp i byn: {n} drog i repet.', om: f => f.sport === 'dragkamp' },
    { t: '{Spelare} kastade mot målet i tur och ordning.', om: f => f.sport === 'kast' },
    { t: 'Det blev kast mot mål i byn, och {n} ställde upp.', om: f => f.sport === 'kast' },
    { t: '{Spelare} ställde sig på en rad med var sin båge och sköt mot målet.', om: f => f.sport === 'bagskytte' }, // steg 10.7.21
    { t: 'Det blev bågskytte i byn, och {n} skyttar spände sina bågar.', om: f => f.sport === 'bagskytte' },
    { t: '{Spelare} gjorde snöbollar och kastade dem på varandra.', om: f => f.sport === 'snoboll' },
    { t: 'Det blev snöbollskrig i byn, med {n} som kastade.', om: f => f.sport === 'snoboll' },
    { t: '{Spelare} spelade boll i byn.', om: f => f.sport === 'bollspel' },
    { t: 'Det blev bollspel, och {n} sprang efter bollen.', om: f => f.sport === 'bollspel' },
    { t: 'Det var första gången byn spelade {sportnamn}.', om: f => f.forsta === true },
    { t: '{Spelare} delade upp sig i två lag och tog tag i repet.', om: f => f.sport === 'dragkamp' && !!f.lag },
  ],
  // hur matchen gick: jämnt, överlägset eller däremellan, och hur länge den höll på
  m_lopp: [
    { t: 'Det böljade fram och tillbaka ända till slutet.', om: f => f.jamnt === true },
    { t: 'Det var så jämnt att det avgjordes på det allra sista.', om: f => f.jamnt === true },
    { t: 'Det höll på länge, och alla var trötta efteråt.', om: f => f.jamnt === true && f.lang === true },
    { t: 'Det var aldrig jämnt.', om: f => f.overlagset === true },
    { t: 'Det var avgjort långt innan det var slut.', om: f => f.overlagset === true },
    { t: 'Det gick fort, och de andra hann knappt börja.', om: f => f.overlagset === true && f.kort === true },
    { t: 'Det var en hård match.', om: f => f.jamnt !== true && f.overlagset !== true },
    { t: 'Det gick fram och tillbaka en stund.', om: f => f.jamnt !== true && f.overlagset !== true },
    { t: 'Det höll på en god stund.', om: f => f.jamnt !== true && f.overlagset !== true && f.kort !== true },
    { t: 'Det skilde bara en hårsmån mellan {vinnare} och {tvaan}.', om: f => f.jamnt === true && !!f.tvaan && !f.lag },
    { t: 'Snön yrde, och det var svårt att se vem som träffade vem.', om: f => f.sport === 'snoboll' && f.jamnt === true },
    { t: 'Båda föll i gräset flera gånger innan det var avgjort.', om: f => f.sport === 'brottning' && f.jamnt === true && !f.sno },
  ],
  // vem som vann: {vinnare}, och {bast} = den som var skickligast. skrall = den svagare vann
  m_vinst: [
    { t: 'Till slut vann {vinnare}, fast {bast} var skickligare.', om: f => f.skrall === true },
    { t: 'Ingen hade trott det, men {vinnare} vann över {bast}.', om: f => f.skrall === true },
    { t: '{Vinnare} vann oväntat, och {bast} fick se sig {slagen}.', om: f => f.skrall === true },
    { t: '{Vinnare} var skickligast och vann.', om: f => f.skrall !== true && f.favorit === true },
    { t: 'Till slut vann {vinnare}.', om: f => f.skrall !== true },
    { t: '{Vinnare} vann och såg nöjd ut.', om: f => f.skrall !== true && !f.lag },
    { t: '{Vinnare} vann igen, precis som förra gången.', om: f => f.skrall !== true && f.igen === true && !f.lag },
    { t: 'Det var första gången {vinnare} vann.', om: f => f.forstaVinst === true && !f.lag },
    { t: '{Vinnare} vann, och spelarna såg nöjda ut.', om: f => f.skrall !== true && !!f.lag },
  ],
  // efteråt
  m_slut: [
    { t: 'Efteråt var vinnarna på gott humör, medan de andra surade en stund.', om: f => !!f.lag },
    { t: 'De gick därifrån svettiga, några glada och några sura.', om: f => f.kort !== true },
    { t: 'Det pratades om matchen resten av dagen.', om: f => (f.nPub as number) > 0 },
    { t: 'Efteråt satte de sig och vilade.', om: f => f.lang === true },
    { t: 'Sedan gick var och en tillbaka till sitt.', om: f => f.kort === true },
    { t: 'Sedan gick de tillbaka till arbetet.', om: f => f.kort === true || !f.nPub },
    { t: 'Det var en dag som andra.', om: f => !f.nPub },
    { t: '{Bast} var skickligast men förlorade, och det sved.', om: f => f.skrall === true && !f.lag },
    { t: 'Det hade hunnit bli mörkt när de slutade.', om: f => f.morkt === true },
    { t: '{Vinnare} var på gott humör efteråt, medan de andra surade en stund.', om: f => !f.lag && f.kort !== true },
  ],
  // publiken runt matchen (steg 10.7.16): {publik} = de som stod och tittade, nPub = hur många
  // tävlingens pris (steg 10.7.20): {pris} = saken, {givare} = ledaren, {fick} = den som fick den
  m_pris: [
    { t: 'Det var en tävling om {givares} {pris}, och {fick} vann.', om: f => !!f.prisKvar && !f.sjalv },
    { t: 'Priset var {givares} {pris}, och nu är det {ficks}.', om: f => !!f.prisKvar && !f.sjalv },
    { t: '{Fick} gick hem med {givares} {pris}, priset i tävlingen.', om: f => !!f.prisKvar && !f.sjalv },
    { t: '{Givares} {pris} var priset, och {givare} vann själv.', om: f => !!f.prisKvar && !!f.sjalv },
    { t: 'Priset skulle ha varit {givares} {pris}, men när matchen var slut fanns det inte kvar.', om: f => !f.prisKvar },
    { t: '{Fick} vann tävlingen och fick {givares} {pris} att ta med sig.', om: f => !!f.prisKvar && !f.sjalv },
    { t: '{Givare} hade satt upp {sin} {pris} som pris och fick behålla {den} själv.', om: f => !!f.prisKvar && !!f.sjalv },
    { t: '{Givare} hade lovat sin {pris} till vinnaren, men den var borta när det var dags.', om: f => !f.prisKvar },
  ],
  m_publik: [
    { t: 'Runt om stod {publik} och hejade på.', om: f => Number(f.nPub) > 1 },
    { t: '{Publik} stod en bit bort och hejade på dem.', om: f => Number(f.nPub) === 1 },
    { t: 'Det var bara {publik} som tittade, men hejandet räckte för flera.', om: f => Number(f.nPub) === 1 },
    { t: '{Publik} samlades runt platsen för att se på.', om: f => Number(f.nPub) > 1 },
    { t: '{Publik} satt i gräset och tittade på hela matchen.', om: f => Number(f.nPub) === 1 && f.sport !== 'snoboll' && !f.sno },
    { t: 'Några stannade upp för att titta: {publik}.', om: f => Number(f.nPub) > 1 },
    { t: '{Publik} följde matchen från början till slut.', om: f => Number(f.nPub) > 0 },
    { t: 'Det var {publik} som såg det hela.', om: f => Number(f.nPub) > 0 },
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
    { t: '{namn} bytte med {med}: {fatt} mot {betal}.', om: f => !f.desperat },
    { t: '{namn} fick {fatt} av {med} och gav {betal} för det.', om: f => !f.desperat },
    { t: '{namn} gav {med} {betal} för {fatt}.', om: f => !f.desperat },
    { t: '{med} lät {namn} få {fatt} mot {betal}.', om: f => !f.desperat },
    { t: '{namn} och {med} kom överens: {fatt} mot {betal}.', om: f => !f.desperat },
    { t: '{namn} och {med} bytte: {fatt} mot {betal}. {namn} höll på att dö.', om: f => !!f.desperat },
    { t: '{namn} höll på att dö och fick {fatt} av {med} mot {betal}.', om: f => !!f.desperat },
    { t: '{namn} och {med} lade fram varorna på var sin filt och tog i hand: {fatt} mot {betal}.', om: f => !f.desperat && f.stort === true && !f.handlare },
    { t: 'Handlaren {med} hade det {namn} ville ha: {fatt}. {namn} betalade med {betal}.', om: f => !f.desperat && f.handlare === 'med' },
    { t: 'Handlaren {namn} köpte {fatt} av {med} och betalade med {betal}.', om: f => !f.desperat && f.handlare === 'namn' },
    { t: 'Det var redan mörkt när {namn} och {med} gjorde upp: {fatt} mot {betal}.', om: f => !f.desperat && f.natt === true },
  ],
  l_gava: [ // {namn} gav {varor} till {om}; fara = {om} höll på att dö, barn = {om} är ett barn
    { t: '{namn} gav {varor} till {om}.', om: f => !f.fara },
    { t: '{om} fick {varor} av {namn}.', om: f => !f.fara },
    { t: '{namn} gav {om} {varor} och bad inte om något tillbaka.', om: f => !f.fara },
    { t: '{namn} gav {varor} till barnet {om}.', om: f => !f.fara && !!f.barn },
    { t: '{namn} gav {varor} till {om}, som höll på att dö.', om: f => !!f.fara },
    { t: '{om} höll på att dö, och {namn} gav {honom2} {varor}.', om: f => !!f.fara },
    { t: '{namn} räckte {om} {varor}.', om: f => !f.fara },
    { t: '{namn} gav sitt barn {om} {varor}.', om: f => !f.fara && f.foralder === true },
    { t: '{om} fick {varor} av sin bästa vän {namn}.', om: f => !f.fara && f.bast === true },
    { t: '{namn} och {om} står inte varandra nära, men {namn} gav ändå {honom2} {varor}.', om: f => !f.fara && f.inteVan === true },
  ],
  l_vanner: [
    '{namn} och {med} har blivit nära vänner.',
    '{namn} och {med} söker sig till varandra nu.',
    'Det har vuxit fram en vänskap mellan {namn} och {med}.',
    'Nu är {namn} och {med} vänner, och det syns.',
    '{namn} och {med} har funnit en vän i varandra.',
    'Där {namn} är, där är ofta {med}. De har blivit nära vänner.',
    { t: '{namn} och {med} var ovänner en gång. Nu är de nära vänner.', om: f => f.ovanForr === true },
    { t: 'När {med} behövde tröst var det {namn} som kom. Nu är de nära vänner.', om: f => f.trost === true },
    { t: '{namn} och {med} har stått sida vid sida i strid. Sedan dess är de nära vänner.', om: f => f.sida === true },
    { t: '{namn} och {med} har pratat med varandra {ggr}. Nu är de nära vänner.', om: f => f.mycketPrat === true },
    { t: 'Det skiljer många år mellan {namn} och {med}, men de har blivit nära vänner.', om: f => f.aldersSkillnad === true },
  ],
  l_bastaVanner: [
    '{namn} och {med} har blivit bästa vänner.',
    { t: 'Ingen står {namn} så nära som {med}.', om: f => !f.partner },
    'Av alla i byn har {namn} valt {med}. De är bästa vänner.',
    '{namn} och {med} är oskiljaktiga.',
    'Det är {med} som {namn} går till först. De är bästa vänner.',
    { t: '{namn} och {med} har gett varandra gåvor många gånger. De är bästa vänner.', om: f => f.gavBada === true },
    { t: '{namn} och {med} var rivaler en gång. Nu är de bästa vänner.', om: f => f.rival === true },
    { t: 'Det var ont mellan {namn} och {med} förut, men nu är de bästa vänner.', om: f => f.ovanForr === true && !f.rival },
    { t: 'Barnen {namn} och {med} har blivit bästa vänner.', om: f => f.barnBada === true },
  ],
  l_ovanner: [
    '{namn} och {med} har blivit ovänner.',
    'Det har blivit ont blod mellan {namn} och {med}.',
    { t: '{namn} och {med} är inte vänner längre.', om: f => f.forr === true },
    'Mellan {namn} och {med} är det kallt nu.',
    '{namn} och {med} vill inte längre se varandra.',
    { t: 'Det som fanns mellan {namn} och {med} är borta. De har blivit ovänner.', om: f => f.forr === true },
    '{namn} vänder sig bort när {med} kommer.',
    { t: '{namn} och {med} lever ihop, men nu är det ont mellan dem.', om: f => f.partner === true },
    { t: '{namn} och {med} är släkt, men det hjälper inte. De har blivit ovänner.', om: f => f.kin === true && !f.partner },
    { t: '{namn} och {med} har slagits mot varandra, och det har ingen av dem glömt.', om: f => f.slag === true },
  ],
  l_rivaler: [
    '{namn} och {med} har blivit rivaler.',
    '{namn} och {med} tävlar om allt nu.',
    { t: '{namn} och {med} gör samma arbete, och båda vill vara bäst. De är rivaler.', om: f => !!f.yrke },
    '{namn} håller ögonen på {med}, och {med} på {namn}.',
    'Mellan {namn} och {med} är det en tävlan nu.',
    '{namn} vill inte vara sämre än {med}. De har blivit rivaler.',
    { t: '{namn} och {med} har båda fattat tycke för {karlek}. Nu är de rivaler.', om: f => !!f.karlek },
    { t: '{namn} och {med} arbetar båda som {yrke}, och ingen av dem vill vara sämre.', om: f => !!f.yrke },
    { t: '{namn} och {med} var nära vänner förut. Nu är de rivaler.', om: f => f.forr === true },
  ],
  l_arke: [ // {namn} ser {om} som sin ärkefiende
    '{namn} ser nu {om} som sin ärkefiende.',
    'För {namn} är {om} nu den värsta fienden.',
    '{namn} har bestämt sig: {om} är {hans} ärkefiende.',
    '{namn} hatar {om} mer än någon annan i byn.',
    'Ingen i byn står {namn} så långt ifrån som {om}.',
    '{namn} har en fiende nu, och det är {om}.',
    { t: '{namn} hatar {om}, och {om} hatar {namn} lika mycket.', om: f => f.omsesidig === true },
    { t: '{namn} och {om} var nära vänner en gång. Nu hatar {namn} ingen som {om}.', om: f => f.forr === true },
    { t: '{namn} och {om} har slagits mot varandra, och nu är {om} {hans} ärkefiende.', om: f => f.slag === true },
    { t: '{om} är {hans} egen släkt, men {namn} hatar ingen som {om}.', om: f => f.kin === true },
  ],
  l_slagsmal: [ // {namn} och {mot} slogs {orsak} ('efter ett gräl'); {vinnare} vann, eller ingen vann (ingen)
    { t: '{namn} och {mot} slogs {orsak}. {vinnare} vann.', om: f => !f.ingen },
    { t: 'Det blev slagsmål {orsak}. {namn} och {mot} slogs, och {vinnare} vann.', om: f => !f.ingen },
    { t: '{namn} och {mot} slogs {orsak}, och {vinnare} gick segrande därifrån.', om: f => !f.ingen },
    { t: '{Orsak} slogs {namn} och {mot}. {vinnare} vann.', om: f => !f.ingen && String(f.orsak).startsWith('efter') },
    { t: 'Mitt i natten slogs {namn} och {mot}. {vinnare} vann.', om: f => !f.ingen && !!f.natt },
    { t: '{namn} och {mot} slogs {orsak}. Ingen vann.', om: f => !!f.ingen },
    { t: '{namn} och {mot} slogs {orsak}, men ingen av dem vann.', om: f => !!f.ingen },
    { t: '{namn} och {mot} gick på varandra {orsak}, och {vinnare} stod kvar sist.', om: f => !f.ingen },
  ],
  l_larm: [ // {namn} ropade larm om {vadtext} ('vargarna kommer'); {n} hörde det, ensam = bara en, falskt = det var inte sant
    { t: '{namn} ropade larm: {vadtext}. {N} hörde det.', om: f => !f.falskt },
    { t: '{namn} ropade att {vadtext}, och {n} hörde ropet.', om: f => !f.falskt && !f.ensam },
    { t: '"{Vadtext}!" ropade {namn}. {N} hörde det.', om: f => !f.falskt },
    { t: 'Ropet från {namn} hördes av {n}: {vadtext}.', om: f => !f.falskt && !f.ensam },
    { t: '{namn} ropade larm, och en hörde det: {vadtext}.', om: f => !f.falskt && !!f.ensam },
    { t: '{namn} ropade falskt larm: {vadtext}. {N} hörde det.', om: f => !!f.falskt },
    { t: '{namn} ropade att {vadtext}, men det var inte sant. {N} hörde det.', om: f => !!f.falskt },
    { t: '{namn} blåste i hornet, och ljudet bar långt: {vadtext}. {N} hörde det.', om: f => !f.falskt && f.horn === true },
    { t: '{namn} slog på trumman: {vadtext}. {N} hörde det.', om: f => !f.falskt && f.trumma === true },
    { t: 'Ropet gick genom natten: {vadtext}. {N} hörde {namn} i mörkret.', om: f => !f.falskt && f.natt === true && !f.horn && !f.trumma },
    { t: 'Det blåste hårt när {namn} ropade att det brinner. {N} hörde det.', om: f => !f.falskt && f.vad === 'brand' && f.blast === true },
  ],
  l_magsjuk: [
    '{namn} blev magsjuk av skämd mat.',
    'Maten {namn} åt var skämd, och nu har {hen} ont i magen.',
    '{namn} åt något som stod för länge och blev sjuk i magen.',
    'Skämd mat gjorde {namn} magsjuk.',
    '{namn} ligger med ont i magen. Maten var skämd.',
    'Det var något fel på maten, och nu är {namn} magsjuk.',
    '{namn} litade på maten, men den hade blivit dålig. Nu har {hen} ont i magen.',
    'Magen har vänt sig på {namn} efter skämd mat.',
  ],
  l_raMat: [ // {vad} = det som åts ('rå fisk')
    '{namn} blev matförgiftad av {vad}.',
    'Det var {vad} som gjorde {namn} sjuk.',
    '{namn} borde ha lagat maten. Nu är {hen} matförgiftad.',
    '{Vad} var inte bra för {namn}. Nu är {hen} matförgiftad.',
    '{namn} blev sjuk av {vad}.',
    'Maten var rå, och {namn} blev matförgiftad av {vad}.',
    '{namn} åt {vad}, och nu har {hen} fått betala för det.',
    'Efter {vad} ligger {namn} sjuk.',
  ],
  l_svartSjuk: [
    '{namn} blev svårt sjuk.',
    'En svår sjukdom har drabbat {namn}.',
    { t: '{namn} ligger med feber och orkar inte resa sig.', om: f => f.feber === true },
    '{namn} är mycket sjuk, och de andra oroar sig.',
    { t: 'Kylan tog {namn}, som blev svårt sjuk.', om: f => !!f.kallt && f.forkyld === true },
    '{namn} ligger sjuk, och det är allvarligt.',
    'Sjukdomen har tagit hårt på {namn}.',
    { t: '{namn} ligger illa till med {sjukdom}.', om: f => !!f.sjukdom },
  ],
  l_lart: [ // {namn} har lärt sig av {av} att {lara}
    '{namn} har lärt sig av {av} att {lara}.',
    '{av} har lärt {namn} att {lara}.',
    'Nu kan {namn} också {lara}. {av} visade {honom} hur.',
    { t: '{namn} såg på när {av} arbetade, och nu kan {hen} själv {lara}.', om: f => f.hur === 'bredvid' || f.hur === 'larling' },
    'Det tog sin tid, men nu kan {namn} {lara}. Det var {av} som lärde {honom}.',
    { t: 'Barnet {namn} har lärt sig av {av} att {lara}.', om: f => !!f.ung },
    '{av} visade {namn} hur man kan {lara}, och nu kan {hen} det.',
    { t: '{namn} har gått i lära hos {av}, och nu kan {hen} själv {lara}.', om: f => f.hur === 'larling' },
    { t: '{namn} satt bland dem som lyssnade på {av}, och efter det kunde {hen} {lara}.', om: f => f.hur === 'forelasning' },
    { t: 'Det var i ett samtal med {av} som {namn} lärde sig att {lara}.', om: f => f.hur === 'samtal' },
    { t: '{av} är yngre än {namn}, men det var {av} som lärde {honom} att {lara}.', om: f => f.yngreLarare === true },
  ],
  l_rykte: [ // {rykte} = vad {namn} sägs vara ('en lögnare'); heder = ett gott rykte
    'Det går rykten om att {namn} är {rykte}.',
    'Folk viskar om att {namn} är {rykte}.',
    'Man säger i byn att {namn} är {rykte}.',
    'Ryktet går: {namn} är {rykte}.',
    { t: 'Det har börjat sägas att {namn} är {rykte}, och det sägs med respekt.', om: f => !!f.heder },
    { t: 'Bakom ryggen på {namn} säger man att {hen} är {rykte}.', om: f => !f.heder },
    { t: 'Det var {fran} som berättade för {till} att {namn} är {rykte}. Så började ryktet.', om: f => !!f.fran && !f.scen },
    { t: 'Det började med att {namn} {bevis}. Nu säger man att {hen} är {rykte}.', om: f => !!f.bevis && !f.falsk },
    { t: 'Det är inte sant, men ryktet går ändå: {namn} är {rykte}.', om: f => f.falsk === true },
    { t: 'Det var på scenen som folk fick höra att {namn} är {rykte}.', om: f => f.scen === true },
    { t: '{namn} lever inte längre, men det sägs att {hen} var {rykte}.', om: f => f.dod === true },
  ],
  l_flinta: [ // {plats} = 'vid stenarna', 'i sanden vid stranden' eller tomt
    { t: '{namn} hittade en flintsten {plats}.', om: f => !!f.plats },
    { t: 'Bland stenarna låg en flinta, och {namn} tog den.', om: f => f.plats === 'vid stenarna' },
    { t: '{namn} fick syn på en flintsten i sanden vid stranden.', om: f => f.plats === 'i sanden vid stranden' },
    { t: '{namn} hittade en flintsten.', om: f => !f.plats },
    { t: '{namn} hittade en flinta.', om: f => !f.plats },
    { t: '{namn} tog upp en flintsten {plats}.', om: f => !!f.plats },
    { t: 'Där {namn} letade låg en flintsten.', om: f => !f.plats },
    { t: '{namn} hittade en flinta där ingen trodde att det fanns någon.', om: f => !f.plats },
    { t: 'Regnet fick stenarna att glänsa, och {namn} såg en flinta bland dem.', om: f => f.regn === true && f.plats === 'vid stenarna' },
    { t: 'I mörkret kände {namn} sig fram {plats} och fick tag i en flinta.', om: f => f.natt === true && !!f.plats },
    { t: 'Byn hade ingen flinta kvar när {namn} hittade en {plats}.', om: f => f.slut === true && !!f.plats },
  ],
  // personens händelser (steg 9.2.108, personlogg.ts): det som läggs till efter händelsen, färgat av personligheten och humöret
  // när det hände. {hen} och {honom} är personen; orolig, modig, glad, nere och talfor är villkoren
  h_ont: [
    { t: 'Det skrämde {honom}.', om: f => f.orolig === true },
    { t: '{Hen} har svårt att släppa det.', om: f => f.orolig === true },
    { t: '{Hen} tar det med fattning.', om: f => f.modig === true },
    { t: '{Hen} biter ihop.', om: f => f.modig === true },
    { t: 'Det tynger {honom}.', om: f => f.nere === true },
    { t: '{Hen} försöker se framåt.', om: f => f.glad === true },
    { t: 'Det gnager i {honom}.', om: f => f.orolig === true || f.nere === true },
    { t: '{Hen} skakar av sig det så gott det går.', om: f => f.modig === true || f.glad === true },
    { t: '', om: f => !f.orolig && !f.modig && !f.nere && !f.glad },
    { t: 'Det tar hårt på {honom}, för det gäller en av de närmaste.', om: f => f.slag === 'nara' && f.nere === true },
    { t: '{Hen} skulle stå där igen om det behövdes.', om: f => f.slag === 'strid' && f.modig === true },
    { t: '{Hen} är rädd att det inte ska läka.', om: f => f.slag === 'skada' && f.orolig === true },
    { t: '{Hen} ser sig om oftare nu.', om: f => f.slag === 'fara' && f.orolig === true },
    { t: 'Det kom mitt i en god tid för {honom}.', om: f => f.glad === true },
    { t: 'Det krävs mer än så för att skrämma {honom}.', om: f => f.modig === true && (f.slag === 'fara' || f.slag === 'strid') },
    { t: '{Hen} är inte den som tiger om sådant.', om: f => f.talfor === true },
  ],
  h_gott: [
    { t: '{Hen} är stolt över det.', om: f => f.modig === true || f.glad === true },
    { t: '{Hen} gläds åt det.', om: f => f.glad === true },
    { t: 'Det lyfte {honom} lite.', om: f => f.nere === true },
    { t: 'Det gjorde {honom} lite lugnare.', om: f => f.orolig === true },
    { t: '{Hen} log åt det.', om: f => f.orolig === true || f.glad === true },
    { t: '{Hen} har berättat det för alla.', om: f => f.talfor === true },
    { t: 'Det gav {honom} mod.', om: f => f.orolig === true },
    { t: '{Hen} tänker gärna tillbaka på det.', om: f => f.glad === true || f.nere === true },
    { t: '', om: f => !f.orolig && !f.modig && !f.nere && !f.glad && !f.talfor },
    { t: '{Hen} gläds med dem.', om: f => f.slag === 'nara' && f.glad === true },
    { t: '{Hen} vill gärna visa vad {hen} kan nu.', om: f => f.slag === 'lart' && f.talfor === true },
    { t: 'Det kom när allt annat kändes tungt.', om: f => f.nere === true },
    { t: 'Det hade {hen} väntat länge på.', om: f => f.slag === 'lart' || f.slag === 'yrke' },
    { t: 'Det var en stor dag för {honom}.', om: f => f.slag === 'nara' || f.slag === 'relation' },
  ],
  // ---- mallarna från de nya systemen (steg 12.1.135): krönikan skriver dem när händelsen sker (iBy), och beskrivningen och
  // eftermälet av en person som var med om den (person, varMed nedan). Fälten står vid varje mall
  // rövaranfallet (rovare.ts, när rövarna tagit det de ville ha): {fran} = varifrån, {vad} = vad de tog, {tyst} = ingen såg dem
  k_rovare: [
    { t: 'Rövare {fran} kom till byn och {vad}.', om: iBy },
    { t: 'Det var {arstid} när rövare {fran} kom. De {vad}.', om: iBy },
    { t: 'Rövarna {fran} gick inte tomhänta därifrån: de {vad}.', om: iBy },
    { t: 'Byn kommer ihåg dagen då rövare {fran} {vad}.', om: iBy },
    { t: 'Rövare {fran} {vad}, och byn fick börja om med det som var kvar.', om: iBy },
    { t: 'Ett gäng rövare {fran} {vad} innan de försvann.', om: iBy },
    { t: 'Rövarna {fran} kom, tog vad de ville och gick. De {vad}.', om: iBy },
    { t: 'Det blev en mager tid efter att rövare {fran} {vad}.', om: iBy },
    { t: 'Ingen såg rövarna {fran} komma. De {vad}.', om: f => iBy(f) && f.tyst === true },
    { t: 'Mitt i natten kom rövare {fran} och {vad}.', om: f => iBy(f) && f.natt === true },
    { t: '{namn} var med när rövarna kom till byn.', om: iPerson },
    { t: '{Hen} minns rövarna som kom till byn.', om: iPerson },
    { t: 'När rövarna kom var {namn} där.', om: iPerson },
  ],
  // branden (brand.ts, när elden slocknat): {mark} = hur mycket mark, {vaggar} = ' och två väggar' eller tomt, {blixt} och {nara}
  k_brand: [
    { t: 'En eldsvåda brände {mark}{vaggar}.', om: iBy },
    { t: 'Det var {arstid} när elden for fram och brände {mark}{vaggar}.', om: iBy },
    { t: 'Elden tog {mark}{vaggar} innan den slocknade.', om: iBy },
    { t: 'Byn minns branden som brände {mark}{vaggar}.', om: iBy },
    { t: 'Röken syntes långt när elden brände {mark}{vaggar}.', om: iBy },
    { t: 'En brand gick över {mark}{vaggar}, och askan låg kvar länge.', om: iBy },
    { t: 'Det brann: {mark} blev svart.', om: f => iBy(f) && !f.vaggar },
    { t: 'Elden kom och gick och lämnade {mark}{vaggar} i aska.', om: iBy },
    { t: 'Blixten slog ner och tände en brand som tog {mark}{vaggar}.', om: f => iBy(f) && f.blixt === true },
    { t: 'Elden kom ända in till byn och brände {mark}{vaggar}.', om: f => iBy(f) && f.nara === true },
    { t: '{namn} var med när elden brann.', om: iPerson },
    { t: '{Hen} minns den stora branden.', om: iPerson },
    { t: '{namn} såg elden komma.', om: iPerson },
    { t: 'Det brann: {mark}{vaggar} blev svarta.', om: f => iBy(f) && !!f.vaggar },
  ],
  // tornadon (motgang.ts, när den dragit förbi): {doda} = ' Två dog.' eller tomt
  k_tornado: [
    { t: 'En tornado drog fram över byn.{doda}', om: iBy },
    { t: 'Det var {arstid} när tornadon kom.{doda}', om: iBy },
    { t: 'Vinden vred sig till en tornado som drog förbi byn.{doda}', om: iBy },
    { t: 'Byn kommer ihåg tornadon.{doda}', om: iBy },
    { t: 'Himlen blev svart och en tornado gick över landet.{doda}', om: iBy },
    { t: 'Tornadon slet upp träd och tak och drog vidare.{doda}', om: iBy },
    { t: 'Efter tornadon fick byn plocka upp det som blåst bort.{doda}', om: iBy },
    { t: 'En virvel av vind gick fram och var borta lika fort.{doda}', om: iBy },
    { t: 'Ingen dog när tornadon kom, men byn glömde den inte.', om: f => iBy(f) && !f.doda },
    { t: '{namn} var med när tornadon kom.', om: iPerson },
    { t: '{Hen} minns tornadon.', om: iPerson },
    { t: '{namn} såg vinden vrida sig till en tornado.', om: iPerson },
  ],
  // översvämningen (motgang.ts, när vattnet dragit sig tillbaka): {doda}
  k_flod: [
    { t: 'Sjön svämmade över, och vattnet stod högt länge.{doda}', om: iBy },
    { t: 'Det var {arstid} när vattnet steg över stranden.{doda}', om: iBy },
    { t: 'Högvattnet kom upp på land och drog sig sakta tillbaka.{doda}', om: iBy },
    { t: 'Byn minns översvämningen.{doda}', om: iBy },
    { t: 'Vattnet tog stranden och lämnade lera efter sig.{doda}', om: iBy },
    { t: 'En översvämning gick upp på land, och byn bar undan det den kunde.{doda}', om: iBy },
    { t: 'Sjön steg och sjönk igen.{doda}', om: iBy },
    { t: 'Efter regnen kom vattnet upp på land.{doda}', om: iBy },
    { t: 'Det regnade länge innan sjön svämmade över.{doda}', om: f => iBy(f) && f.regn === true },
    { t: '{namn} var med när sjön svämmade över.', om: iPerson },
    { t: '{Hen} minns översvämningen.', om: iPerson },
    { t: '{namn} såg vattnet stiga.', om: iPerson },
  ],
  // epidemin (sjukdom.ts, när ingen längre är sjuk i den): {sjukdom}, {antal} = hur många som blev sjuka, {doda}
  k_epidemi: [
    { t: '{Sjukdom} gick genom byn. {Antal} blev sjuka.{doda}', om: iBy },
    { t: 'Det var {arstid} när {sjukdom} spred sig i byn, och {antal} blev sjuka.{doda}', om: iBy },
    { t: 'Smittan tog slut till sist. {Antal} hade haft {sjukdom}.{doda}', om: iBy },
    { t: 'Byn minns tiden med {sjukdom}, då {antal} blev sjuka.{doda}', om: iBy },
    { t: '{Sjukdom} gick från den ena till den andra tills {antal} hade haft den.{doda}', om: iBy },
    { t: 'Ett tag var nästan alla rädda för {sjukdom}. {Antal} blev sjuka.{doda}', om: iBy },
    { t: 'Det blev tyst i byn medan {sjukdom} gick runt. {Antal} blev sjuka.{doda}', om: iBy },
    { t: 'Alla klarade sig när {sjukdom} gick genom byn, fast {antal} blev sjuka.', om: f => iBy(f) && !f.doda },
    { t: '{namn} var med när smittan gick genom byn.', om: iPerson },
    { t: '{Hen} minns tiden när så många var sjuka.', om: iPerson },
    { t: '{namn} såg smittan gå från den ena till den andra.', om: iPerson },
  ],
  // tron (religion.ts, när en tro grundas, och bygg.ts, när trons hus står klart): {grundare}, {tecken}, {hus} = husets namn och {huset}
  k_tro: [
    { t: '{grundare} tolkade {tecken} som ett tecken, och en ny tro började.', om: f => iBy(f) && !f.huset },
    { t: 'Det var {arstid} när {grundare} såg ett tecken i {tecken}. Så började en ny tro.', om: f => iBy(f) && !f.huset },
    { t: '{grundare} kunde inte sluta tänka på {tecken}. Det måste betyda något, och så föddes en ny tro.', om: f => iBy(f) && !f.huset },
    { t: 'Byn minns när {grundare} började tro, efter {tecken}.', om: f => iBy(f) && !f.huset },
    { t: '{grundare} berättade för de andra om {tecken}, och några började tro.', om: f => iBy(f) && !f.huset },
    { t: '{Hus} stod klart, och de som tror har en plats att samlas på.', om: f => iBy(f) && f.huset === true },
    { t: 'De troende byggde färdigt {hus}.', om: f => iBy(f) && f.huset === true },
    { t: 'Det var {arstid} när {hus} stod klart.', om: f => iBy(f) && f.huset === true },
    { t: 'Tron fick sitt hus: {hus} stod klart.', om: f => iBy(f) && f.huset === true },
    { t: '{namn} grundade en tro.', om: iPerson },
    { t: 'Det var {namn} som först såg tecknet och började tro.', om: iPerson },
    { t: '{Hen} grundade den tro som byn talar om.', om: iPerson },
    { t: 'De troende säger att det heliga nu har ett hem i byn: {hus}.', om: f => iBy(f) && f.huset === true },
  ],
  // resan (resa.ts, när sällskapet kommer hem): {folk} = vilka, {de} = de eller hen, {resa} = färden ('en handelsresa'), {mal}, {borta}
  k_resa: [
    { t: '{folk} kom hem från {resa} till {mal}{syfte}.', om: iBy },
    { t: 'Det var {arstid} när {folk} kom hem från {resa} till {mal}{syfte}, efter {borta}.', om: iBy },
    { t: 'Efter {borta} på vägen kom {folk} hem från {resa} till {mal}{syfte}.', om: iBy },
    { t: 'Byn tog emot {folk}, som kom hem från {resa} till {mal}{syfte}.', om: iBy },
    { t: '{folk} var borta i {borta} på {resa} till {mal}{syfte}.', om: iBy },
    { t: 'Byn hade väntat länge på {folk}. {De} kom hem från {resa} till {mal}{syfte}.', om: iBy },
    { t: '{folk} kom hem från {resa} till {mal}{syfte} och hade mycket att berätta.', om: iBy },
    { t: 'Vägen till {mal} var lång, men {folk} kom hem från {resa}.', om: iBy },
    { t: 'I snön kom {folk} hem från {resa} till {mal}{syfte}.', om: f => iBy(f) && f.sno === true },
    { t: 'Ute på vägarna har {namn} varit förut.', om: iPerson },
    { t: '{Hen} har sett andra platser än byn.', om: iPerson },
    { t: '{namn} har gått långt bort från byn och kommit hem igen.', om: iPerson },
    { t: 'På vägen tog rövare en del av packningen, men {folk} kom hem från {resa} till {mal}{syfte}.', om: f => iBy(f) && f.ranad === true },
    { t: '{folk} gick ända till {mal}, men platsen fanns inte längre.', om: f => iBy(f) && f.tom === true },
    { t: '{folk} red hem från {resa} till {mal}{syfte}.', om: f => iBy(f) && f.red === true },
  ],
  // handeln (behov.ts, vid ett stort byte): {a} och {b}, {fick} = det a fick, {gav} = det a gav. {afor} och {bfor} är namnet med
  // "för byn" när någon handlar för byn; det står första gången namnet nämns, och sedan bara namnet (steg 15.1.48)
  k_handel: [
    { t: '{afor} bytte till sig {fick} av {bfor} för {gav}.', om: iBy },
    { t: 'Det var {arstid} när {afor} gjorde ett stort byte med {bfor}: {fick} för {gav}.', om: iBy },
    { t: '{afor} och {bfor} gjorde upp om ett byte: {gav} mot {fick}.', om: iBy },
    { t: 'Byn talade länge om bytet då {afor} fick {fick} av {bfor}.', om: iBy },
    { t: '{afor} gav {gav} och fick {fick} av {bfor}.', om: iBy },
    { t: '{afor} handlade med {bfor} och fick {fick}.', om: iBy },
    { t: 'Handlaren {b} hade burit sina varor långt, och {afor} bytte till sig {fick} för {gav}.', om: f => iBy(f) && f.handlareB === true },
    { t: '{afor} och {bfor} lade ut sina varor på var sin filt och tog i hand: {gav} mot {fick}.', om: f => iBy(f) && f.stort === true && !f.handlareB },
  ],
  // djuren (tamdjur.ts, när byn får sitt första tamdjur och när ett djur dör): {djur} = 'en ko', {hur} = 'av hunger', {agare}, {forsta}
  k_djur: [
    { t: 'Byn fick sitt första tamdjur: {djur}.', om: f => iBy(f) && f.forsta === true },
    { t: 'Det var {arstid} när {djur} blev byns första tamdjur.', om: f => iBy(f) && f.forsta === true },
    { t: 'Det första djuret som stannade i byn var {djur}.', om: f => iBy(f) && f.forsta === true },
    { t: '{agare} miste {djur}, som dog {hur}.', om: f => iBy(f) && !f.forsta && !!f.agare },
    { t: 'Byn miste {djur}, som dog {hur}.', om: f => iBy(f) && !f.forsta && !f.agare },
    { t: 'Det var {arstid} när {djur} dog {hur}.', om: f => iBy(f) && !f.forsta },
    { t: '{Djur} dog {hur}, och byn hade ett djur mindre.', om: f => iBy(f) && !f.forsta },
    { t: 'Byn sörjde inte länge, men {djur} som dog {hur} var saknad.', om: f => iBy(f) && !f.forsta },
    { t: '{namn} växte upp med djur.', om: iPerson },
    { t: '{Hen} är van vid djuren sedan barndomen.', om: iPerson },
    { t: 'Det fanns alltid djur omkring {namn} när {hen} var liten.', om: iPerson },
    { t: '{agare} blev den första i byn som ägde ett djur: {djur}.', om: f => iBy(f) && f.forsta === true && !!f.agare },
  ],
  // rättegången (styre.ts, när tinget dömt): {namn} = den som dömdes, {ledare}, {brott}, {straff} = 'utvisade', {fri}
  // bildstenens bild (steg 13.9.16, bildsten.ts): vad bilderna föreställer, efter motivet i BILDMOTIV. {fig} = den som avbildas
  // ('en man', 'en kvinna', 'folket i byn'), {ting} = det som hände i bild ('en stor björn', 'lågor över taken'), {motiv} = radens id
  b_bild: [
    { t: '{fig} med spjut framför {ting}', om: f => f.motiv === 'strid' },
    { t: '{fig} som lyfter yxan mot {ting}', om: f => f.motiv === 'strid' },
    { t: '{fig} och {ting} mitt i striden', om: f => f.motiv === 'strid' },
    { t: '{fig} med skölden höjd mot {ting}', om: f => f.motiv === 'strid' },
    { t: '{ting} som faller, och bakom står {fig} med vapnet i handen', om: f => f.motiv === 'strid' },
    { t: '{fig} på knä med händerna lyfta mot himlen', om: f => f.motiv === 'helig' && !f.gud },
    { t: '{fig} som ber, och ett ljus som faller ner över {ting}', om: f => f.motiv === 'helig' && !f.gud },
    { t: '{fig} framför {ting}, med blicken mot himlen', om: f => f.motiv === 'helig' && !f.gud },
    { t: '{ting} över de troende', om: f => f.motiv === 'helig' && f.gud === true },
    { t: '{ting} som stiger ner bland folket', om: f => f.motiv === 'helig' && f.gud === true },
    { t: '{ting}, och runt omkring står folk med händerna lyfta', om: f => f.motiv === 'helig' && f.gud === true },
    { t: '{fig} inför en stor publik', om: f => f.motiv === 'tavling' },
    { t: '{fig} som höjer händerna mot himlen, och folk som jublar', om: f => f.motiv === 'tavling' },
    { t: '{fig} som står främst bland de andra', om: f => f.motiv === 'tavling' },
    { t: '{fig} på en lång väg mellan berg och skog', om: f => f.motiv === 'resa' },
    { t: '{fig} med packning på ryggen, på väg hem från {ting}', om: f => f.motiv === 'resa' },
    { t: '{fig} och ett sällskap som vandrar mot {ting}', om: f => f.motiv === 'resa' },
    { t: '{fig} som visar byn {ting}', om: f => f.motiv === 'uppfinning' },
    { t: '{fig} som tänker ut {ting}', om: f => f.motiv === 'uppfinning' },
    { t: '{fig} som lär de andra {ting}', om: f => f.motiv === 'uppfinning' },
    { t: '{fig} framför {ting}', om: f => f.motiv === 'byn' },
    { t: '{ting}, och mitt i det {fig}', om: f => f.motiv === 'byn' },
    { t: 'byns hus och {ting}, och {fig} som står kvar', om: f => f.motiv === 'byn' },
    { t: '{ting}, som vakar över byns tak', om: f => f.motiv === 'helig' && f.gud === true },
  ],
  // det som ibland ristas till (steg 13.9.16): ett motiv utan något med händelsen att göra
  b_extra: [', och över dem flyger två korpar', ', och runt bilden slingrar sig en orm', ', och i hörnet står en hjort', ', och över alltihop lyser solen', ', och vid kanten växer ett stort träd', ', och under dem springer en varg', ', och runt kanten går en flätad slinga', ', och längst ner seglar ett skepp'],
  // ristarens gud på en sten om en strid eller en resa (steg 13.9.16): {gud} = 'guden Dunvald', {omr} = 'åskan och himlen', {i} = var anden bor
  b_gud: [', och över dem står {gud}, som råder över {omr}', ', och bakom dem vakar {gud}', ', och {gud} håller sin hand över dem', ', och ovanför ser {gud} ner på dem', ', och i molnen syns {gud}', ', och vid deras sida går {gud}', ', och {gud} rider före dem', ', och högst upp på stenen står {gud}'],
  // det bilderna berättar: {vad} = händelsen ('Ivar dödade en björn'), {nar} = 'en vinter', {ristare}
  // bildstenens berättelse (steg 15.1.117): 'om när {vad}', eftersom {vad} kan vara en uppfinning ('kom på hur man kan …')
  b_berattar: [
    'Den berättar om när {vad}.',
    'Den berättar om när {vad}, {nar}.',
    'Så minns byn när {vad}.',
    { t: '{Ristare} ristade den för att minnas när {vad}.', om: f => !f.egen },
    'Stenen ska minna om när {vad}.',
    'Den som kan läsa bilderna ser när {vad}.',
    { t: 'Det är {ristare} själv som står på stenen.', om: f => f.egen === true },
    'Stenen håller kvar minnet av när {vad}.',
  ],
  k_ratt: [
    { t: 'Tinget dömde {namn} för att {hen} {brott}: {ledare} {straff} {honom}{straffEfter}.', om: f => iBy(f) && !f.fri },
    { t: 'Det var {arstid} när {namn} stod inför tinget för att {hen} {brott}. {Ledare} {straff} {honom}{straffEfter}.', om: f => iBy(f) && !f.fri },
    { t: 'Byn samlades på tinget, och {ledare} {straff} {namn}{straffEfter} för att {hen} {brott}.', om: f => iBy(f) && !f.fri },
    { t: '{namn} {brott}, och {ledare} {straff} {honom}{straffEfter} inför byn.', om: f => iBy(f) && !f.fri },
    { t: 'Det var {arstid} när tinget friade {namn}.', om: f => iBy(f) && f.fri === true },
    { t: 'Byn röstade, och {namn} gick fri från tinget.', om: f => iBy(f) && f.fri === true },
    { t: '{namn} stod inför tinget men gick fri.', om: f => iBy(f) && f.fri === true },
    { t: '{namn} har stått inför tinget.', om: f => iPerson(f) && f.upp === 'fangelse' },
    { t: '{namn} såg tinget döma {uppOm}.', om: f => iPerson(f) && f.upp === 'foralderDomd' },
    { t: '{Hen} vet hur det är att dömas inför byn.', om: f => iPerson(f) && f.upp === 'fangelse' },
    { t: '{Hen} minns hur byn stod och såg på när {uppOm} dömdes.', om: f => iPerson(f) && f.upp === 'foralderDomd' },
    { t: 'Det var inte sant att {namn} {brott}, men {ledare} {straff} {honom}{straffEfter} ändå.', om: f => iBy(f) && !f.fri && f.falsk === true },
    { t: 'Många tyckte att domen var för hård när {ledare} {straff} {namn}{straffEfter} för att {hen} {brott}.', om: f => iBy(f) && !f.fri && f.hard === true },
    { t: '{namn} stod {ledare} nära, och domen blev mild: {ledare} {straff} {honom}{straffEfter}.', om: f => iBy(f) && !f.fri && f.mild === true },
    { t: 'Ingen annan var där när {ledare} {straff} {namn}{straffEfter}.', om: f => iBy(f) && !f.fri && f.publik === 0 },
    { t: '{namn} hade gjort {ledare} själv orätt, och {ledare} dömde i sin egen sak: {straff} {honom}{straffEfter}.', om: f => iBy(f) && !f.fri && f.egenSak === true },
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
  if (TEXTLYSS.f) TEXTLYSS.f(mall, BERATTELSER[mall].indexOf(x), fyll(text, f), f);
  return text;
}
// verktyget som samlar texterna (npm run texter, steg 4.5.1.1): får varje vald variant (mallen, variantens plats i mallen och
// texten ifylld, och fälten), varje del av en beskrivning (mallen 'del:<id>', plats -1) och hela beskrivningen ('beskrivning').
// Bara i verktyget och testernas vakt (steg 4.5.1.2); spelet sätter den aldrig
export function lyssnaPaTexter(f: ((mall: string, i: number, text: string, f: Fyllning) => void) | undefined) { TEXTLYSS.f = f as TextLyssnare | undefined; } // ordlagret håller lyssnaren (steg 12.1.118)
export function fyll(text: string, f: Fyllning) {
  return text.replace(/\{(\w+)\}(s(?![\p{L}]))?/gu, (_, k: string, gs: string | undefined, i: number) => {
    const v = f[k] ?? f[k.toLowerCase()];
    let t = v === undefined ? '' : String(v);
    if (k === 'arstid' && text.slice(Math.max(0, i - 8), i) === 'Det var ') t = OBEST[t] ?? t; // "Det var sommar när" (steg 6.7.6)
    if (gs) t = gen(t); // "{namn}s" är genitiv: "Asdis yxa", inte "Asdiss yxa" (steg 12.1.118)
    return k[0] === k[0].toUpperCase() && k[0] !== k[0].toLowerCase() ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  });
}
export const berattelse = (s: State, mall: MallId, nyckel: number, f: Fyllning = {}) => fyll(valjVariant(s, mall, nyckel, f), f);

// ---------- öknamnen och hedersnamnen (steg 3.9.1) ----------
export interface Binamn { k: IntryckTyp; namn: string; v: number; t: number; skal?: string; tillst?: true; slakt?: string; rel?: string } // tillst = inget bevis, bara det byn tycker (steg 6.7.6) // slakt, rel: Lill- eller Stor-namnet kommer av släktingen med samma namnslut, och vad hen är (fynd 500)
// namnet efter förnamnet: "Ask Lögnaren", "Brand den flitige"
export const heltNamn = (p: Person) => p.binamn ? `${p.name} ${p.binamn.namn}` : p.name;
export const arHeder = (b: Binamn) => INTRYCK[b.k].tecken > 0;
// varför: det starkaste beviset någon i byn har (utan namnet först), annars intryckets ord som ett tillstånd (tillst, steg
// 6.7.6): "är välbärgad", "är en lögnare"
const tillstand = (k: IntryckTyp) => INTRYCK[k].som ?? INTRYCK[k].namn;
function skalTill(s: State, p: Person, k: IntryckTyp): { skal: string; tillst: boolean; vittne?: string } {
  let bast: { t: string; v: number; q?: string } | undefined;
  for (const q of living(s)) {
    const e = intryckOm(q, p.id, k);
    for (const b of e?.bev ?? []) {
      const v = HANDELSER[b.h].vikt + (b.sett ? 0.1 : 0);
      if (!bast || v > bast.v) bast = { t: HANDELSER[b.h].text.replace('{om}', b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något'), v, q: b.sett ? q.name : undefined };
    }
  }
  return bast ? { skal: bast.t, tillst: false, vittne: bast.q } : { skal: '', tillst: true }; // vittne = den som såg det själv (steg 15.1.114)
}
// var BERATT.timmar timme: hur många av de andra vuxna som har samma starka intryck av var och en
export function stepBerattelser(s: State) {
  if (Math.round(s.now / HOUR) % BERATT.timmar) return;
  const vuxna = vuxnaOf(s);
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
export function lekNamn(s: State, p: Person) { return lekNamnAv(s, p)?.namn; }
function lekNamnAv(s: State, p: Person): { namn: string; q: Person } | undefined {
  const slut = namnSlut(p.name);
  if (!slut || slut.length < 3 || hash(s.seed, p.id, 11) >= BERATT.lekNamn) return undefined;
  const q = living(s).find(x => x !== p && (isParent(x, p) || isParent(p, x)) && namnSlut(x.name) === slut);
  return q ? { namn: (p.born > q.born ? 'Lill' : 'Stor') + slut, q } : undefined;
}
export function gebinamn(s: State, p: Person, k: IntryckTyp, v: number) {
  const lek = lekNamnAv(s, p);
  if (lek) { slaktnamn(s, p, k, v, lek.namn, lek.q); return; }
  const val = BINAMN[k].namn, i = Math.floor(hash(s.seed, p.id, val.length + k.length) * val.length);
  const namnet = val[i][p.sex === 'm' ? 0 : 1];
  const { skal, tillst, vittne } = skalTill(s, p, k), fore = p.binamn;
  p.binamn = { k, namn: namnet, v, t: s.now, ...(tillst ? { tillst: true as const } : { skal }) };
  const heder = INTRYCK[k].tecken > 0;
  upplev(s, p, heder ? 'hedersnamn' : 'oknamn', namnet); // steg 4.1.1.2
  const f: Fyllning = { namn: p.name, binamn: namnet, helt: heltNamn(p), hen: han(p), honom: honom(p), skal, tillst, tillstand: tillstand(k), kallt: temperature(s) < 0, gamla: living(s).filter(q => ageOf(q, s.now) >= ALDER.gammal).length,
    // steg 15.1.114: vem som såg det, det förra namnet, intrycket, barnen i byn och om hen är hetlevrad
    vittne: vittne !== p.name ? vittne : undefined, fore: fore?.namn, k, barn: living(s).filter(q => ageOf(q, s.now) < ALDER.vuxen).length, hetlevrad: p.pot.aggression - 10 >= BERATT.drag };
  const text = berattelse(s, heder ? 'hedersnamn' : 'oknamn', p.id, f);
  log(s, `${heder ? '🏅' : '🗯️'} ${text}`, 'rel', [p.id]);
  kronika(s, text, heder ? 'hedersnamn' : 'oknamn');
  p.fame.push(`Kallades ${heltNamn(p)}${fore ? ` (förut ${fore.namn})` : ''}`); personHand(s, p, 'titel', `Kallas ${heltNamn(p)}.`, heder ? 'gott' : 'ont');
  count(s, 'binamn'); count(s, heder ? 'hedersnamn' : 'oknamn');
}
// Lill- eller Stor-namnet (fynd 500): det ges när byn ändå skulle ge ett binamn, men skälet är släkten och inte intrycket
function slaktnamn(s: State, p: Person, k: IntryckTyp, v: number, namnet: string, q: Person) {
  const fore = p.binamn, rel = slaktOrd(p, q) ?? 'släkting';
  p.binamn = { k, namn: namnet, v, t: s.now, slakt: q.name, rel };
  const f: Fyllning = { namn: p.name, binamn: namnet, helt: heltNamn(p), hen: han(p), hens: hans(p), honom: honom(p), rel, slakting: q.name, slaktingens: gen(q.name) };
  const text = berattelse(s, 'slaktnamn', p.id, f);
  log(s, `👪 ${text}`, 'rel', [p.id, q.id]);
  kronika(s, text, 'slaktnamn');
  p.fame.push(`Kallades ${heltNamn(p)}${fore ? ` (förut ${fore.namn})` : ''}`); personHand(s, p, 'titel', `Kallas ${heltNamn(p)}.`);
  count(s, 'binamn'); count(s, 'slaktnamn');
}
export function binamnInfo(p: Person) {
  const b = p.binamn;
  if (!b) return undefined;
  if (b.slakt) return { namn: b.namn, sym: '👪', heder: true, varfor: `${p.name} heter som sin ${b.rel ?? 'släkting'} ${b.slakt} i slutet`, intryck: 'släkten', bevis: true, alive: alive(p) }; // namnet kommer av släkten (fynd 500)
  return { namn: b.namn, sym: arHeder(b) ? '🏅' : '🗯️', heder: arHeder(b), varfor: `${p.name} ${b.skal ?? `är ${tillstand(b.k)}`}`, intryck: INTRYCK[b.k].namn, bevis: !!b.skal, alive: alive(p) }; // bevis: utan skäl säger varfor bara samma sak igen (steg 6.7.8)
}

// ---------- personen (steg 3.9.2) ----------
// orden för en egenskap som sticker ut: [hög, låg]
const DRAG: Record<Stat, [string, string]> = {
  styrka: ['stark', 'klen'], uthallighet: ['uthållig', 'snabbt trött'], intelligens: ['klok', 'trög i tanken'],
  nyfikenhet: ['nyfiken på allt', 'rädd för det nya'], karisma: ['talför', 'tystlåten'], skonhet: ['vacker', 'ful'],
  flit: ['arbetsam', 'lat'], empati: ['varmhjärtad', 'kall'], mod: ['modig', 'räddhågad'],
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
  if (slag === 'v:' && vad === 'hand') return v > 0 ? { slag: 'hand', vad: 'nävarna', v } : undefined; // händerna är inget vapen man ogillar (steg 12.1.119)
  if (slag === 'v:') return { slag: 'vapen', vad: liten(sakNamn(vad)), v }; // vapnet hen föredrar (steg 3.7.10)
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
// (ett namn som Yrkan den yngre räknas som ett ord: "Yrkan den yngre är" och "Yrkan den yngre undviker" börjar olika)
const borjan = (t: string) => t.split(/(?<=[.!?])\s+/).map(x => x.replace(/ den (yngre|andre)\b/g, '_den_$1').split(' ').slice(0, 2).join(' ').toLowerCase());
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
    // en annans namn inuti personens eget räknas inte (Yrkan i Yrkan den yngre)
    let iA = -1; for (const a of x.split(n).join('\u0000'.repeat(n.length)).matchAll(b.andra!)) iA = Math.max(iA, a.index!);
    if (iA >= 0 || iP >= 0) sist = iP > iA;
    return x;
  }).join(' ');
  if (!prov) b.sist = sist;
  return ut;
}
// de viktiga händelserna i hens liv (p.fame): uppfinningarna för sig, namnet byn gav och den höga åldern står i egna delar
const FAME_EGEN = /^(Uppfann|Kallades|Blev \d+ år)/;
const TITEL = /^(Mästare i|Byns första ledare|Mor till|Den bästa i)/; // sportens titel (sport.ts) är också något hen är (steg 15.1.114) // det hen är; resten är det hen gjorde ('Tände byns första eld')
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
// huset där p sover (bedTile i byggnader.ts), om det står i ett hus
function hemHus(s: State, p: Person) {
  const t = bedTile(s, p);
  if (t === undefined) return undefined;
  const r = roomAt(s, t % W + 0.5, Math.floor(t / W) + 0.5);
  return r?.hus !== undefined ? husById(s, r.hus) : undefined;
}
const husMitt = (h: Hus) => ({ x: h.x + h.w / 2, y: h.y + h.h / 2 });
function borUtkant(s: State, p: Person) {
  const h = hemHus(s, p), alla = housesOf(s).filter(q => q.klar);
  if (!h || alla.length < BERATT.utkantHus) return false;
  const m = bynsMitt(s), d = (q: Hus) => Math.hypot(husMitt(q).x - m.x, husMitt(q).y - m.y);
  return d(h) >= BERATT.utkant * Math.max(...alla.map(d));
}
function borVidVerkstad(s: State, p: Person) {
  const h = hemHus(s, p);
  if (!h) return false;
  const mellan = (a: Hus, c: Hus) => Math.max(0, Math.max(a.x - (c.x + c.w), c.x - (a.x + a.w)), Math.max(a.y - (c.y + c.h), c.y - (a.y + a.h)));
  return housesOf(s).some(q => q !== h && q.klar && fnId(q) === 'verkstad' && mellan(h, q) <= BERATT.verkstadNara);
}
function langeIHus(s: State, p: Person) { const h = hemHus(s, p); return !!h && h.ag === p.id && !!h.klar && s.now - h.klar >= BERATT.langeHus * DAY; }
// grundarna (steg 15.1.114): hur många av dem som lever, hur stor byn var då och nu och hur länge sedan det var
function grundFalt(s: State, p: Person, f: Fyllning) {
  const grundKvar = living(s).filter(q => q.grundare && q !== p).length, grundN = s.people.filter(q => q.grundare).length, folkN = living(s).length, bynN = Math.floor((s.now - s.founded) / DAY);
  Object.assign(f, { grundKvar, grundKvarOrd: heltOrd(grundKvar), grundN, grundFolk: heltOrd(grundN), folkN, folk: heltOrd(folkN), bynN, bynAr: heltOrd(bynN) });
}
const IARSTID = ['under istiden', 'på våren', 'på sommaren', 'på hösten'];
// minnet (steg 15.1.114): upplevelser som varar en tid ("levde i överflöd") och de svåra, som ger ett svårt liv från början
const VARAKTIG = new Set<string>(['lek', 'trygg', 'djur', 'fester', 'smedjan', 'faltet', 'overflod', 'bastaVan']);
const SVAR = new Set<string>(['svalt', 'frys', 'svamp', 'sjuk', 'foralder', 'syskon', 'sagDod', 'foraldralos', 'slagen', 'slagenIgen', 'hardVinter', 'torka', 'epidemi', 'rovarePlundring', 'skadad']);
// vad upplevelsen gjorde med hen: jämförelseformen för egenskapen som ändrades mest ('mer' + DRAG ger 'mer klen')
const BLEV: Record<Stat, [string, string]> = {
  styrka: ['starkare', 'klenare'], uthallighet: ['segare', 'tröttare'], intelligens: ['klokare', 'trögare i tanken'], nyfikenhet: ['nyfiknare', 'räddare för det nya'],
  karisma: ['talförare', 'tystare'], skonhet: ['vackrare', 'fulare'], flit: ['flitigare', 'latare'], empati: ['varmare', 'kallare'], mod: ['modigare', 'räddare'],
  minne: ['minnesgodare', 'glömskare'], smidighet: ['vigare', 'klumpigare'], aggression: ['hetsigare', 'fridsammare'],
};
function blevOrd(u: Upplevelse) {
  let bast: [Stat, number] | undefined;
  for (const [k, v] of Object.entries(u.e) as [Stat, number][]) if (v && (!bast || Math.abs(v) > Math.abs(bast[1]))) bast = [k, v];
  return bast && Math.abs(bast[1]) >= 2 ? BLEV[bast[0]][bast[1] > 0 ? 0 : 1] : undefined;
}
export const BESK_DELAR: BeskDel[] = [
  { id: 'grundare', fast: true, vikt: b => b.p.grundare ? 1 : 0, text: b => { grundFalt(b.s, b.p, b.f); return mening(b, 'besk_grundare', 10); } },
  { id: 'skonhet', fast: true, vikt: b => skonDel(b.s, b.p) ? 1 : 0, text: b => {
    b.f.del = BESK_ANSIKTE.del?.(b.s, b.p) ?? skonaDel(b.s, b.p);
    const v = b.p.pot.skonhet > 10 ? VERKAN.find(([r]) => r.test(String(b.f.del))) : undefined;
    b.f.verkan = v ? v[1].replace('{hen}', han(b.p)) : undefined;
    b.f.friare = living(b.s).filter(q => q !== b.p && ageOf(q, b.s.now) >= ALDER.vuxen && (b.s.rels[relKey(q.id, b.p.id)]?.rom ?? 0) >= BERATT.langtan).length; // steg 15.1.114
    return mening(b, b.p.pot.skonhet > 10 ? 'besk_vacker' : 'besk_ful', 11);
  } },
  { id: 'aldst', fast: true, vikt: b => {
    const l = living(b.s);
    if (!alive(b.p) || l.length < BERATT.aldstBy || ageOf(b.p, b.s.now) < ALDER.gammal) return 0;
    return l.every(q => q === b.p || q.born > b.p.born) ? 1 : 0;
  }, text: b => {
    const p = b.p, bb = b.s.people.filter(c => alive(c) && b.s.people.some(m => (m.mother === p.id || m.father === p.id) && (c.mother === m.id || c.father === m.id))).length;
    const dodaN = b.s.people.filter(q => q.died !== undefined && q.died > p.born).length;
    Object.assign(b.f, { ar: Math.floor(ageOf(p, b.s.now)), barnbarn: bb ? (bb === 1 ? 'ett barnbarn' : `${heltOrd(bb)} barnbarn`) : undefined, dodaN, doda: heltOrd(dodaN) }); // steg 15.1.114
    return mening(b, 'besk_aldst', 12);
  } },
  { id: 'ledare', vikt: b => alive(b.p) && b.s.styre?.ledare === b.p.id ? 0.95 : 0, text: b => {
    const st = b.s.styre!, folkN = living(b.s).length, folk0N = st.folk0 ?? folkN, v = st.vintrar ?? 0;
    Object.assign(b.f, { titel: (st.titel ?? 'ledare').toLowerCase(), folkN, folk: heltOrd(folkN), folk0N, folk0: heltOrd(folk0N), vintrarN: v, vintrar: v === 1 ? 'en istid' : `${heltOrd(v)} istider`, vintrarTal: talOrd(v), forra: st.historia?.[st.historia.length - 2]?.namn, svag: legitimitet(b.s).v < LED.svag }); // steg 15.1.114
    return mening(b, 'besk_ledare', 20);
  } },
  { id: 'namn', vikt: b => b.f.binamn ? 0.9 : b.f.yrke && b.f.rykte ? 0.85 : b.f.rykte ? 0.8 : b.f.yrke ? 0.5 : 0,
    text: b => mening(b, b.f.binamn ? 'besk_binamn' : b.f.yrke && b.f.rykte ? 'besk_yrkeRykte' : b.f.yrke ? 'besk_yrke' : 'besk_rykte', 1) },
  { id: 'titel', vikt: b => titlar(b.p).length ? 0.8 : 0, text: b => { b.f.vad = liten(titlar(b.p)[0]); return mening(b, 'besk_titel', 13); } },
  { id: 'familj', vikt: b => familj(b.s, b.p)?.[1] ?? 0, text: b => { const [m, , f] = familj(b.s, b.p)!; Object.assign(b.f, f); return mening(b, m, 21); } },
  { id: 'bast', vikt: b => !b.f.liten && bastPa(b.s, b.p) ? 0.7 : 0, text: b => {
    const k = bastPa(b.s, b.p)!; b.f.vad = SKILL_NAMES[k].toLowerCase(); b.f.vadAtt = SKILL_ORD[k] ?? b.f.vad;
    const tvaa = living(b.s).filter(q => q !== b.p && ageOf(q, b.s.now) >= ALDER.vuxen).sort((x, y) => y.skill[k] - x.skill[k])[0]; // den som kommer närmast (steg 15.1.114)
    b.f.tvaa = tvaa && b.p.skill[k] - tvaa.skill[k] < BERATT.bastSk / 4 ? tvaa.name : undefined;
    return mening(b, 'besk_bast', 22);
  } },
  { id: 'uppfann', vikt: b => uppfann(b.p).length ? 0.75 : 0, text: b => { b.f.vad = och(uppfann(b.p).slice(-3)); return mening(b, 'besk_uppfann', 14); } },
  { id: 'bedrift', vikt: b => bedrifter(b.p).length ? 0.7 : 0, text: b => { b.f.vad = ihop(bedrifter(b.p).slice(-2).map(liten)); return mening(b, 'besk_bedrift', 15); } },
  { id: 'skador', vikt: b => alive(b.p) && skadorText(b.p) ? 0.45 : 0, text: b => { b.f.vad = skadorText(b.p); return mening(b, 'besk_skador', 16); } }, // ärren och det hen förlorat (steg 12.1.119)
  { id: 'tal', vikt: b => talDel(b.p)?.[1] ?? 0, text: b => { const [m, , vad] = talDel(b.p)!; b.f.vad = vad; b.f.bett = (b.p.liv?.bett ?? 0) > 0; return mening(b, m, 23); } },
  { id: 'larare', vikt: b => !b.f.liten && alive(b.p) && laraVem(b.s, b.p) ? 0.5 : 0, text: b => {
    const [m, q] = laraVem(b.s, b.p)!, sk = m === 'besk_larling' ? b.p.mentorSk : q.mentorSk; // ämnet lärlingen lär sig (steg 15.1.114)
    b.f.vem = q.name; b.f.amne = sk ? SKILL_NAMES[sk].toLowerCase() : undefined;
    return mening(b, m, 24);
  } },
  { id: 'rel', vikt: b => b.f.partner || b.f.van ? 0.6 : 0, text: b => mening(b, b.f.partner && b.f.van ? 'besk_partnerVan' : b.f.partner ? 'besk_partner' : 'besk_van', 2) },
  { id: 'langtan', vikt: b => langtar(b.s, b.p) ? 0.55 : 0, text: b => { const q = langtar(b.s, b.p)!; b.f.vem = q.name; b.f.vemUpptagen = q.partner !== undefined; return mening(b, 'besk_langtan', 25); } },
  { id: 'fiende', vikt: b => b.f.fiende ? 0.65 : 0, text: b => mening(b, 'besk_fiende', 3) },
  { id: 'foralder', vikt: b => alive(b.p) && foralderRykte(b.s, b.p, BERATT.rykte) ? 0.6 : 0, text: b => { // vems barn hen är (steg 10.8.5)
    const r = foralderRykte(b.s, b.p, BERATT.rykte)!;
    b.f.barnet = b.p.sex === 'm' ? 'son' : 'dotter'; b.f.vem = r.q.name; b.f.vad = INTRYCK[r.k].som ?? INTRYCK[r.k].namn;
    Object.assign(b.f, { vadTecken: INTRYCK[r.k].tecken, arv: arvAndel(b.s) > 0, vemDod: r.q.died !== undefined, foOrd: r.q.sex === 'k' ? 'mor' : 'far', vemHonom: honom(r.q) }); // steg 15.1.114
    return mening(b, 'besk_foralder', 26);
  } },
  // hur hen bor (steg 10.2.52): i utkanten, mitt emot verkstaden, länge i sitt hus
  { id: 'utkant', vikt: b => borUtkant(b.s, b.p) ? 0.35 : 0, text: b => mening(b, 'besk_utkant', 32) },
  { id: 'verkstad', vikt: b => borVidVerkstad(b.s, b.p) ? 0.3 : 0, text: b => mening(b, 'besk_verkstad', 33) },
  { id: 'langeHus', vikt: b => langeIHus(b.s, b.p) ? 0.4 : 0, text: b => mening(b, 'besk_langeHus', 34) },
  { id: 'saknad', vikt: b => { const d = alive(b.p) ? saknad(b.s, b.p) : undefined; return d ? (d[2] ? 0.85 : 0.45) : 0; }, text: b => {
    const [q, vem, sorj] = saknad(b.s, b.p)!;
    b.f.dod = q.name; b.f.vem = vem;
    const sedanN = Math.floor((b.s.now - q.died!) / DAY); // steg 15.1.114: hur och när, och om hen såg det
    Object.assign(b.f, { orsak: q.cause, sedanN, sedanAr: heltOrd(sedanN), lange: b.s.now - q.died! > BERATT.glomtDygn * DAY, sag: !!b.p.upp?.some(u => u.k === 'sagDod' && u.om === q.name) });
    return mening(b, sorj ? 'besk_sorjer' : 'besk_saknar', 16);
  } },
  { id: 'varMed', vikt: b => varMed(b.s, b.p) ? 0.4 : 0, text: b => { const u = [...b.p.upp ?? []].reverse().find(x => VAR_MED[x.k]); b.f.upp = u?.k; b.f.uppOm = u?.om; return personMall(b, varMed(b.s, b.p)!, 44); } }, // upplevelsen och vem den gällde (steg 15.1.117) // det hen var med om, med händelsens mall (steg 12.1.135)
  { id: 'overlevt', vikt: b => overlevt(b.p).length ? 0.45 + 0.05 * overlevt(b.p).length : 0, text: b => { b.f.vad = och(overlevt(b.p)); return mening(b, 'besk_overlevt', 26); } },
  { id: 'radd', vikt: b => (b.p.liv?.bett ?? 0) > 0 && b.p.pot.mod < BERATT.raddMod ? 0.55 : 0, text: b => { b.f.stark = b.p.pot.styrka >= BERATT.starkRadd; return mening(b, 'besk_raddVarg', 27); } },
  { id: 'arv', vikt: b => arvet(b.s, b.p) ? 0.45 : 0, text: b => {
    const [k, q] = arvet(b.s, b.p)!;
    Object.assign(b.f, { vad: ARV_ORD[k], adj: DRAG[k][0], fo: q.sex === 'k' ? 'mors' : 'fars', fo2: q.sex === 'k' ? 'mor' : 'far', foDod: q.died !== undefined });
    return mening(b, 'besk_arv', 28);
  } },
  { id: 'ago', vikt: b => agodel(b.s, b.p)?.[1] ?? 0, text: b => {
    const [m, , vad] = agodel(b.s, b.p)!; b.f.vad = vad;
    const ber = m === 'besk_mastarverk' ? (b.s.ting ?? []).find(t => t.agare === b.p.id && t.ber?.namn)?.ber : undefined, n = ber?.varg ?? 0; // steg 15.1.114: vem som gjorde det, vargarna och bilden
    Object.assign(b.f, { gorare: ber && ber.g !== b.p.id ? byId(b.s, ber.g)?.name : undefined, egetVerk: ber?.g === b.p.id, vargarSak: n ? (n === 1 ? 'en varg' : `${heltOrd(n)} vargar`) : undefined, motiv: ber?.mo?.namn, ristat: ber?.mo?.mal ? 'målad' : 'ristad' });
    return mening(b, m, 29);
  } },
  { id: 'skam', vikt: b => skammen(b.p).length ? 0.6 : 0, text: b => { b.f.vad = ihop(skammen(b.p)); return mening(b, 'besk_skam', 30); } },
  { id: 'smak', vikt: b => { if (b.f.liten) return 0; const m = smakText(b.p); return m ? 0.3 + 0.3 * Math.abs(m.v) : 0; }, text: b => {
    const m = smakText(b.p)!;
    b.f.vad = m.vad; b.f.stark = b.p.pot.styrka - 10 >= BERATT.drag;
    return mening(b, `besk_${m.slag}${m.v > 0 ? 'Gilla' : 'Ogilla'}` as MallId, 4);
  } },
  { id: 'minne', vikt: b => starkastUpp(b.p) ? 0.4 : 0, text: b => {
    const u = starkastUpp(b.p)!;
    b.f.minne = liten(upplevelseText(u)); b.f.vid = u.a;
    const k = u.t !== undefined ? kalender(b.s, u.t) : undefined; // steg 15.1.114: en tid eller en stund, svårt eller gott, vad det gjorde och när
    Object.assign(b.f, { varaktig: VARAKTIG.has(u.k), svar: SVAR.has(u.k), blev: blevOrd(u), iarstid: k ? IARSTID[k.ai] : undefined, ar: k?.ar });
    return mening(b, u.a < 1 ? 'besk_minneSpad' : 'besk_minne', 5);
  } },
];
// mer ur livet (steg 3.9.8). Familjen: [mallen, vikten, fyllningen], den som sticker ut mest
function familj(s: State, p: Person): [MallId, number, Fyllning] | undefined {
  const alla = s.people.filter(c => c.mother === p.id || c.father === p.id), barn = alla.length, fo = p.sex === 'k' ? 'mor' : 'far';
  const levandeN = alla.filter(alive).length; // barnen räknas med de döda; allaLever, levande och dodaBarn säger hur många som lever (steg 15.1.114)
  if (barn >= BERATT.mangaBarn && !titlar(p).some(x => x.startsWith('Mor till'))) return ['besk_barn', 0.7, { foralder: fo, vad: `${talOrd(barn)} barn`, allaLever: levandeN === barn, dodaBarn: barn - levandeN, levandeN, levande: heltOrd(levandeN) }];
  const mor = byId(s, p.mother ?? -1), far = byId(s, p.father ?? -1), vuxen = p.born + ALDER.vuxen * 24 * HOUR;
  if (mor && far && mor.died !== undefined && far.died !== undefined && Math.max(mor.died, far.died) < vuxen) return ['besk_foraldralos', 0.65, { vidFor: Math.floor((Math.max(mor.died, far.died) - p.born) / DAY) }];
  if (!p.grundare && s.people.every(q => q.grundare || q.born >= p.born)) { const k = kalender(s, p.born); return ['besk_forstFodd', 0.6, { iarstid: IARSTID[k.ai], ar: k.ar }]; }
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
// det p var med om som har en mall från de nya systemen (steg 12.1.135): den senaste upplevelsen, eller tron hen grundade
const VAR_MED: Partial<Record<UpplevelseTyp, MallId>> = { brand: 'k_brand', tornado: 'k_tornado', oversvamning: 'k_flod', epidemi: 'k_epidemi', rovareBort: 'k_rovare', rovarePlundring: 'k_rovare', ranad: 'k_rovare', resaBarn: 'k_resa', flyttade: 'k_resa', foralderDomd: 'k_ratt', fangelse: 'k_ratt', djur: 'k_djur' };
function varMed(s: State, p: Person): MallId | undefined {
  if ((s.tron ?? []).some(t => t.grundare === p.id)) return 'k_tro';
  const u = [...p.upp ?? []].reverse().find(x => VAR_MED[x.k]);
  return u && VAR_MED[u.k];
}
// en mening ur händelsens mall om personen (personens varianter)
function personMall(b: Besk, m: MallId, i: number) { b.f.person = true; const t = mening(b, m, i); delete b.f.person; return t; }
function overlevt(p: Person) {
  if (!alive(p)) return [];
  const l = p.liv ?? {};
  return OVERLEVT.filter(([k]) => l[k]).map(([k, ett, fler]) => l[k] === 1 || ett === fler ? (l[k] > 1 ? `${ett} ${talOrd(l[k])} gånger` : ett) : `${talOrd(l[k])} ${fler}`).slice(0, 3);
}
// den egenskap hen har efter en förälder: båda höga (BERATT.drag eller mer). [egenskapen, föräldern]
const ARV_ORD: Record<Stat, string> = { styrka: 'styrka', uthallighet: 'uthållighet', intelligens: 'klokhet', nyfikenhet: 'nyfikenhet', karisma: 'talförhet', skonhet: 'skönhet', flit: 'flit', empati: 'värme', mod: 'mod', minne: 'goda minne', smidighet: 'smidighet', aggression: 'hetta' };
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
  if (s.hus?.some(h => h.ag === p.id && h.klar !== undefined && h.fn !== 'naringshus')) return ['besk_egetHus', 0.4];
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
// det hen gjort (utan dubbletter); skadorna och att bli ökänd är inga bedrifter (steg 12.1.119)
const SKADA_FAME = /^(Fick ett ärr|Förlorade |Blev ökänd)/;
// färdigheten som ett ord efter "bättre på" och "kan mer om" (steg 12.1.121): "samlande" i stället för "samling"
const SKILL_ORD: Partial<Record<Skill, string>> = { samla: 'att samla', ved: 'att hugga ved', narstrid: 'att slåss', traff: 'att träffa', odling: 'att odla', matlagning: 'att laga mat', berattande: 'att berätta' };
export const bedrifter = (p: Person) => [...new Set(p.fame.filter(x => !FAME_EGEN.test(x) && !TITEL.test(x) && !SKADA_FAME.test(x)))];
// det kroppen bär efter livet, som en verbfras efter hen: "har två ärr i vänstra benet och förlorat fingrarna på vänster hand"
export function skadorText(p: Person) {
  const arr = new Map<string, number>(), borta: string[] = [];
  for (const x of p.fame) {
    const a = /^Fick ett ärr i (.+)$/.exec(x), f = /^Förlorade (.+)$/.exec(x);
    if (a) arr.set(a[1], (arr.get(a[1]) ?? 0) + 1); else if (f && !borta.includes(f[1])) borta.push(f[1]);
  }
  // båda slagen: det senaste av varje, så att meningen inte blir för lång
  const m = arr.size && borta.length ? 1 : 2;
  const ar = [...arr].slice(-m).map(([d, n]) => `${n === 1 ? 'ett ärr' : `${talOrd(n)} ärr`} i ${d}`), fo = borta.slice(-m).map(d => `förlorat ${d}`);
  return ar.length && fo.length ? `har ${och(ar)} och har ${och(fo)}` : ar.length ? `har ${och(ar)}` : fo.length ? `har ${och(fo)}` : '';
}
// två bedrifter med samma verb säger verbet en gång: 'byggde byns första bord och byns första slaktbänk'
const ihop = (l: string[]) => l.length === 2 && l[0].split(' ')[0] === l[1].split(' ')[0] ? `${l[0]} och ${l[1].split(' ').slice(1).join(' ')}` : och(l);
// eftermälet (steg 6.7.4, m_eftermale): en död beskrivs i dåtid, först döden (e_dog), sedan vem hen var, grundandet, namnet
// byn gav, det hen kom på eller gjorde och sist att byn minns hen. Det som bara passar en levande (smaken, vem hen litar
// på, utseendet när man möter hen) står inte med
// dragen i beskrivningen och eftermälet (kodgenomgången, fynd 210): ett drag som syns står framför åldern, det bra först
// ("modig men glömsk"), och två drag åt olika håll binds med men
function ordnaDrag(p: Person, drag: string[], alder: string) {
  const syns = drag.length === 2 ? drag.find(d => SYNS.has(d)) : undefined;
  if (syns) { alder = `${syns} ${alder || (p.sex === 'm' ? 'man' : 'kvinna')}`; drag = drag.filter(d => d !== syns); }
  if (drag.length === 2 && (TECKEN[drag[0]] ?? 1) < (TECKEN[drag[1]] ?? 1)) drag = [drag[1], drag[0]];
  const bind = drag.length === 2 && (TECKEN[drag[0]] ?? 1) !== (TECKEN[drag[1]] ?? 1) ? 'men' : 'och';
  return { drag, alder, syns, bind };
}
function eftermale(s: State, p: Person) {
  const a = Math.floor(ageOf(p, s.now)), k = kalender(s, p.died!);
  let drag = personDrag(s, p), alder = alderOrd(a, p.sex);
  let syns: string | undefined, bind: string;
  ({ drag, alder, syns, bind } = ordnaDrag(p, drag, alder));
  const by = samlatIntryck(s, p.id)[0];
  const f: Fyllning = { namn: p.name, hen: han(p), honom: honom(p), hans: hans(p), alder, drag1: drag[0], drag2: drag[1], bind, syns: !!syns,
    orsak: p.cause ?? 'av okänd orsak', arstid: ARSTIDER[k.ai], iarstid: ['under istiden', 'på våren', 'på sommaren', 'på hösten'][k.ai], ar: k.ar, aldern: talOrd(a, true), spad: a < 1, ung: a >= 1 && a < 25, gammal: a >= ALDER.gammal, kvar: false,
    binamn: p.binamn?.namn, yrke: p.tag && p.tag !== 'Dagdrivare' && p.tag !== 'Mästare' ? liten(p.tag) : undefined, rykte: by && by[1] >= BERATT.rykte ? INTRYCK[by[0]].som ?? INTRYCK[by[0]].namn : undefined,
    uppkallad: s.people.find(c => c.uppkallad === p.id && alive(c))?.name, grav: !!s.gravar?.some(g => g.vem === p.id && !g.fiende), // steg 15.1.115
    lange: s.now - p.died! > BERATT.glomtDygn * 24 * HOUR, barn: s.people.some(c => (c.mother === p.id || c.father === p.id) && alive(c)), ny: p.grundare === 'ny' };
  const b: Besk = { s, p, f, nyck: i => p.id * 8 + i, borjan: new Set() };
  const ut = [mening(b, 'e_dog', 40), mening(b, drag.length >= 2 ? 'e_drag2' : drag.length ? 'e_drag1' : 'e_drag0', 41)];
  if (p.grundare) ut.push(mening(b, 'besk_grundare', 10));
  if (f.binamn || f.yrke || f.rykte) ut.push(mening(b, 'e_rykte', 42));
  if (uppfann(p).length) { f.vad = och(uppfann(p).slice(-3)); ut.push(mening(b, 'besk_uppfann', 14)); }
  else if (bedrifter(p).length) { f.vad = ihop(bedrifter(p).slice(-2).map(liten)); ut.push(mening(b, 'besk_bedrift', 15)); }
  { const m = varMed(s, p); if (m) { const u = [...p.upp ?? []].reverse().find(x => VAR_MED[x.k]); f.upp = u?.k; f.uppOm = u?.om; ut.push(personMall(b, m, 44)); } } // det hen var med om (steg 12.1.135)
  ut.push(mening(b, 'e_minns', 43));
  TEXTLYSS.f?.('beskrivning', -1, ut.join(' '), f);
  return ut.join(' ');
}
// det beskrivningen vet om namnet, ryktet och relationerna (steg 15.1.114)
function beskFalt(s: State, p: Person, f: Fyllning, by: [IntryckTyp, number] | undefined) {
  const bn = p.binamn, rel = (id?: number) => id !== undefined ? s.rels[relKey(p.id, id)] : undefined;
  if (bn) { const barN = Math.floor((s.now - bn.t) / DAY); Object.assign(f, { bskal: bn.skal, heder: arHeder(bn), slakt: bn.slakt, btillst: bn.tillst === true, barN, bar: heltOrd(barN) }); }
  if (f.rykte && by) { f.rk = by[0]; f.rskal = skalTill(s, p, by[0]).skal || undefined; }
  const rp = f.partner ? rel(p.partner) : undefined, rv = f.van ? rel(p.bast) : undefined, rf = f.fiende ? rel(p.arke) : undefined;
  if (rp) {
    const parN = rp.par !== undefined ? Math.floor((s.now - rp.par) / DAY) : 0, n = s.people.filter(c => (c.mother === p.id && c.father === p.partner) || (c.father === p.id && c.mother === p.partner)).length;
    Object.assign(f, { gift: rp.gift !== undefined, parN, parAr: heltOrd(parN), barnTills: n ? (n === 1 ? 'ett barn' : `${heltOrd(n)} barn`) : undefined });
  }
  if (rv) {
    const g = rv.minns?.gav;
    Object.assign(f, { sidaGgr: rv.minns?.sida ? ganger(rv.minns.sida) : undefined, barndomsvan: !!p.upp?.some(u => u.k === 'bastaVan' && u.om === f.van), gavaBada: (g?.[0] ?? 0) > 0 && (g?.[1] ?? 0) > 0, lek: rv.minns?.lek ?? 0, vanPrat: !!rp && rv.talks > rp.talks });
  }
  if (rf) Object.assign(f, { slagGgr: rf.minns?.slag ? ganger(rf.minns.slag) : undefined, gralGgr: rf.minns?.gral ? ganger(rf.minns.gral) : undefined, omsesidig: byId(s, p.arke!)?.arke === p.id });
}
export function beskrivning(s: State, p: Person) {
  if (p.died !== undefined) return eftermale(s, p);
  const a = ageOf(p, s.now), Hen = han(p), ung = a < ALDER.vuxen, gammal = a >= ALDER.gammal;
  let drag = personDrag(s, p), alder = alderOrd(a, p.sex), trots: string | undefined;
  if (drag.length === 2) { // ett drag som går emot åldern får en egen mening (besk_trots)
    trots = drag.find(d => (gammal && MOT_GAMMAL.has(d)) || (ung && MOT_UNG.has(d)));
    if (trots) drag = drag.filter(d => d !== trots);
  }
  let syns: string | undefined, bind: string;
  ({ drag, alder, syns, bind } = ordnaDrag(p, drag, alder));
  const f: Fyllning = { namn: p.name, hen: Hen, honom: honom(p), hans: hans(p), alder, drag1: drag[0], drag2: drag[1], bind, trots, syns: !!syns, ung, liten: a < ALDER.vuxen / 2, gammal, kvar: alive(p), ny: p.grundare === 'ny' };
  const b: Besk = { s, p, f, nyck: i => p.id * 8 + i, borjan: new Set() };
  // yrket och vad byn tycker, och relationerna
  const by = samlatIntryck(s, p.id)[0];
  f.yrke = p.tag && p.tag !== 'Dagdrivare' && p.tag !== 'Mästare' ? liten(p.tag) : undefined; // Mästare är en titel, ingen syssla (steg 15.1.114)
  f.rykte = by && by[1] >= BERATT.rykte ? INTRYCK[by[0]].som ?? INTRYCK[by[0]].namn : undefined;
  f.binamn = p.binamn?.namn;
  const namnPa = (id?: number) => { const q = id !== undefined ? byId(s, id) : undefined; return q ? q.name : undefined; };
  f.partner = alive(p) ? namnPa(p.partner) : undefined; f.van = namnPa(p.bast); f.fiende = namnPa(p.arke);
  beskFalt(s, p, f, by);
  const delar = BESK_DELAR.map((d, i) => ({ d, i, v: d.vikt(b) })).filter(x => x.v > 0);
  const fasta = delar.filter(x => x.d.fast), andra = delar.filter(x => !x.d.fast).sort((x, y) => y.v - x.v || x.i - y.i);
  // kortare och olika från dygn till dygn (steg 10.2.52): de fasta och de viktigaste delarna är alltid med, och de andra fyller
  // ut till BERATT.delar, slumpade efter vikten. Slumpen är personens och dygnets (hash3), inte byns, så att texten står still under dygnet
  const viktiga = andra.filter(x => x.v >= BERATT.viktig), ovriga = andra.filter(x => x.v < BERATT.viktig), dygn = Math.floor(s.now / DAY);
  const valda = [...fasta, ...viktiga];
  for (let k = 0; ovriga.length && valda.length < BERATT.delar; k++) {
    let r = hash3(p.id, k, dygn) * ovriga.reduce((n, x) => n + x.v, 0), j = 0;
    while (j < ovriga.length - 1 && (r -= ovriga[j]!.v) > 0) j++;
    valda.push(ovriga.splice(j, 1)[0]!);
  }
  valda.sort((x, y) => x.i - y.i);
  const ut = [mening(b, drag.length >= 2 ? 'besk_drag2' : drag.length ? 'besk_drag1' : 'besk_drag0', 0), ...trots ? [mening(b, 'besk_trots', 31)] : [], ...valda.map(x => { const t = x.d.text(b); TEXTLYSS.f?.('del:' + x.d.id, -1, t, b.f); return t; })];
  if (ut.length < 2) ut.push(mening(b, 'besk_inget', 6));
  TEXTLYSS.f?.('beskrivning', -1, ut.join(' '), f);
  return ut.join(' ');
}

// ---------- krönikan (steg 3.9.3) ----------
export const ARSTIDER = ['istiden', 'våren', 'sommaren', 'hösten'];
const OBEST: Record<string, string> = { istiden: 'istid', våren: 'vår', sommaren: 'sommar', hösten: 'höst' };
export { talOrd, och }; // talen och listorna bor i ordlagret (steg 6.7.1)
// en händelse som en liten berättelse i krönikan, med årstiden, vädret och natten (loggen behåller sin korta rad).
// Raden får mallens id som slag, så att den kan hittas utan att läsa texten
// början på en rad utan namnen (ord med stor bokstav): 'Sige prövade och misslyckades' och 'Gunve prövade och …' är samma början
// årstiden, vädret och natten nu, för krönikans och loggens mallar (kodgenomgången, fynd 210)
const vaderFalt = (s: State): Fyllning => { const v = vaderNu(s); return { arstid: ARSTIDER[kalender(s).ai], kallt: temperature(s) < 0, sno: v.sno, regn: v.lage === 'regn', blast: v.lage === 'blast', natt: !isLight(s.now), eld: s.fire.lit, aska: !!v.aska }; }; // eld och åska (steg 15.1.115)
export function kronikaBer(s: State, mall: MallId, nyckel: number, f: Fyllning, vikt?: number) {
  const g: Fyllning = { ...vaderFalt(s), ...f };
  // varianten väljs ur nyckeln och timmen; en som börjar som någon av de sex senaste raderna i krönikan hoppas över, vilken
  // mall de än kom ur (textminnet, steg 6.7.3 och 15.1.120). Minnet ligger utanför historiken (kronikaVid i historik.ts)
  const forra = s.textminne?.['*'] ?? [];
  const text = fyll(valjVariant(s, mall, nyckel, g, undefined, x => forra.includes(tre(x))), g);
  kronika(s, text, mall, vikt);
  return text;
}
// en rad i händelseloggen ur en mall (steg 6.7.7): som kronikaBer, med årstiden, vädret och natten, och raden minns mallen
// (m), så att den kan hittas utan att läsa texten. sam = raden kan samlas med andra av samma slag (SAMLA i folk.ts)
export function loggBer(s: State, mall: MallId, nyckel: number, f: Fyllning, kind: LogEntry['kind'], ids: number[], sam?: Parameters<typeof log>[4]) {
  const g: Fyllning = { ...vaderFalt(s), ...f };
  const e = log(s, fyll(valjVariant(s, mall, nyckel, g), g), kind, ids, sam);
  if (!e.sam || e.sam.d.length === 1) e.m = mall; else delete e.m;
  return e;
}
// fälten för den som lärt sig något (l_lart)
export const larFalt = (s: State, p: Person): Fyllning => ({ namn: p.name, hen: han(p), honom: honom(p), ung: ageOf(p, s.now) < ALDER.vuxen });
// fälten för en person: namnet, namnet byn gav och hen
export const personFalt = (p: Person): Fyllning => ({ namn: p.name, helt: heltNamn(p), hen: han(p), honom: honom(p) });

// ---------- mästerverken och de usla sakerna (steg 3.9.4) ----------
// När ett mästerverk eller en usel sak blir klar sparas det som berättelsen behöver: görarens humör, årstiden, vädret,
// natten, göraren (g), vem som var nära, vem saken gjordes åt och något om görarens liv just då. Texten skrivs när den visas (sakens
// inforuta), med tiden 0 så att den står kvar. Ett perfekt mästerverk (★) får ett eget namn, och ett vapen som fäller en
// varg minns det (vargdöden i varg.ts); ett perfekt vapen heter sedan Vargdräparen.
export type SakLiv = 'barn' | 'sorg' | 'sjuk' | 'gravid' | 'ledare';
export interface SakMinne { g: number; h: number; ai: number; v?: string; natt?: 1; eld?: 1; nara?: number; at?: number; l?: SakLiv; lo?: number; mn?: string; namn?: string; varg?: number; mo?: Motiv } // mo = konsten på saken (steg 4.3.3)
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
  return !d ? 'mobel' : d.klad ? 'klad' : d.grupp === 'spjut' ? 'vapen' : gruppOf(k) === 'kniv' || gruppOf(k) === 'yxa' ? 'egg' : 'redskap';
};
// sakens namn i bestämd form och pronomenet: flintkniven/den, träspjutet/det, skorna av kaninskinn/de (ett plagg av ett
// material, klader.ts: bara plagget får bestämd form)
// saken t (ett ting eller en möbel) blev ett mästerverk eller usel: spara det berättelsen behöver
export function sakMinne(s: State, p: Person, t: { id: number; k: string; q?: number; ber?: SakMinne }) {
  const v = vaderNu(s), dag = 24 * HOUR;
  const vad = v.sno ? 'sno' : v.lage === 'regn' || v.lage === 'blast' ? v.lage : v.dimma > BERATT.dimma ? 'dimma' : undefined;
  const m: SakMinne = { g: p.id, h: Math.round(moodOf(p, s.now) * 100) / 100, ai: kalender(s).ai };
  if (vad) m.v = vad;
  if (!isLight(s.now)) m.natt = 1;
  if (s.fire.lit) m.eld = 1; // i skenet från elden (steg 15.1.115)
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
  if (sorg) m.mn = sorg.name; // inskriptionen "Till minne av" (steg 10.6.14): namnet står kvar när den döda är borta ur folket
  // en bildyta (skölden, steg 10.7.1) målas alltid från fin kvalitet; andra mästerverk ristas eller målas ibland
  const yta = !!SAKER[t.k]?.bildyta, q = t.q ?? 0;
  const mo = yta ? (q >= 3 ? motiv(s, p) : undefined) : q >= 4 && sakGrupp(t.k) !== 'klad' && hash(s.seed, t.id, 6) < BERATT.konst ? motiv(s, p) : undefined;
  if (mo) { if (yta || hash(s.seed, t.id, 7) < BERATT.malning) mo.mal = 1; m.mo = mo; }
  if (q > 0 && q < 4) { t.ber = { g: m.g, h: m.h, ai: m.ai, ...(mo ? { mo } : {}) }; return; } // en fin bildyta minns bara bilden
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
    const q = byId(s, e.om), v = e.v * e.c * (!q || !alive(q) ? 2 : 1) * kandVikt(s, e.om) * (e.bev?.length ? BERATT.bildHandelse : 1); // den byn minns väljs oftare (steg 10.6.14), en händelse helst (steg 10.7.1)
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
    const [saken, den] = bestamd(sakNamn(t.k), SAKER[t.k]?.ett); // bestämd form och rätt genus (steg 15.1.116)
    log(s, `${gammalt ?? saken.charAt(0).toUpperCase() + saken.slice(1)} heter nu Vargdräparen: ${vem.name} fällde en varg med ${den}.`, 'world', [vem.id]);
  }
}
// berättelsen om saken t (namnet = sakens namn), eller inget om den inte har något minne
export function sakBerattelse(s: State, t: { id: number; k: string; q?: number; ber?: SakMinne }, namn: string) {
  const m = t.ber, p = m && byId(s, m.g);
  if (!m || !p) return '';
  const [saken, den] = bestamd(namn, SAKER[t.k]?.ett), q = t.q ?? 0, usel = q === 0;
  const f: Fyllning = { namn: p.name, hen: han(p), saken, den, pa: PA[m.ai], arstid: ARSTIDER[m.ai], vader: m.v ? VADER_ORD[m.v] : '', glad: m.h >= BERATT.glad, ledsen: m.h <= BERATT.ledsen, natt: m.natt === 1, l: m.l, egen: m.namn, perfekt: q >= 5, eld: m.eld === 1, klad: sakGrupp(t.k) === 'klad', lever: alive(p) }; // steg 15.1.115
  const nara = m.nara !== undefined ? byId(s, m.nara) : undefined, at = m.at !== undefined ? byId(s, m.at) : undefined, lo = m.lo !== undefined ? byId(s, m.lo) : undefined;
  const vem = m.varg !== undefined ? byId(s, m.varg) : undefined;
  const del = (mall: MallId, n: number, g: Fyllning = {}) => fyll(valjVariant(s, mall, t.id * 16 + n, { ...f, ...g }, 0), { ...f, ...g });
  const konst = () => del('m_konst', 6, { konst: m.mo!.mal ? 'en målning' : 'ristningar', konst2: m.mo!.mal ? 'Målningen' : 'Ristningarna', gjort: m.mo!.mal ? 'målat' : 'ristat', motiv: motivText(s, m.mo!) });
  if (!usel && q < 4) return m.mo ? konst() : ''; // en fin bildyta: bara bilden (steg 10.7.1)
  const ut = [del(usel ? 'u_gjord' : 'm_gjord', 0)];
  if (!usel && m.l && (lo || m.lo === undefined)) ut.push(del('m_liv', 1, { om: lo?.name }));
  if (nara) ut.push(del(usel ? 'u_nara' : 'm_nara', 2, { nara: nara.name }));
  if (!usel && m.mn) ut.push(del('m_minne', 7, { om: m.mn })); // en sak gjord i sorg (steg 10.6.14)
  else if (!usel && at) ut.push(del('m_inskr', 3, { at: at.name, som: SOM[Math.floor(hash(s.seed, t.id, 5) * SOM.length)] }));
  if (!usel && m.mo) ut.push(konst());
  if (vem) ut.push(del('m_varg', 4, { vem: vem === p ? p.name : vem.name, hen2: han(vem) }));
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
  fjarran: { prio: 52, namn: 'Fjärran platser', ikon: 'karta' }, // en plats i världen (steg 11.4.4, ort.ts)
  pris: { prio: 45, namn: 'Ett pris', ikon: 'silver' },
  langtan: { prio: 40, namn: 'Det man längtar efter', ikon: 's_mat' },
  karlek: { prio: 30, namn: 'Kärlek' },
  trost: { prio: 25, namn: 'Tröst', ikon: 's_trost' },
  dod: { prio: 20, namn: 'En död', ikon: 's_dod' },
  vader: { prio: 10, namn: 'Vädret' },
  mat: { prio: 10, namn: 'Maten', ikon: 's_mat' },
  special: { prio: 35, namn: 'Byns egen rätt', ikon: 's_mat' }, // steg 10.7.29
  arbete: { prio: 10, namn: 'Arbetet' },
  barn: { prio: 10, namn: 'Barnen', ikon: 's_barn' },
  vardag: { prio: 0, namn: 'Lite av varje' },
  // ämnena från de nya systemen (steg 12.1.136; symbolerna är platshållare): det farliga och det nya före vardagen
  strid: { prio: 24, namn: 'En strid', ikon: 'rovare' },
  sjukdom: { prio: 22, namn: 'Sjukdom', ikon: 'i_botare' },
  resor: { prio: 18, namn: 'Resor', ikon: 'karta' },
  lagar: { prio: 16, namn: 'Lagar och tinget', ikon: 'i_rattvis' },
  tro: { prio: 15, namn: 'Tron', ikon: 'i_from' },
  djur: { prio: 12, namn: 'Djuren', ikon: 'i_djurvan' },
  skord: { prio: 12, namn: 'Skörden', ikon: 's_mat' },
  fest: { prio: 12, namn: 'Festen', ikon: 'i_scenBra' },
} satisfies Record<string, AmneDef>;
export type AmneId = keyof typeof ADEF;
export const AMNEN: Record<AmneId, AmneDef> = ADEF;
// det senaste samtalet: med vem (m), ämnet (k), symbolen (i), vad det handlade om (o) och när (t)
export interface Prat { m: number; k: AmneId; i?: string; o?: string; t: number; fr?: number; u?: 1 } // fr = den som talade (samma hos båda), u = ämnet är ett uppdrag och ingen plats (steg 15.1.115)
// det som delats i samtalet som pågår (converse i samtal.ts nollställer det före och läser det efter)
let delat: { k: AmneId; i?: string; o?: string; u?: 1 } | undefined;
export function samtalBorjar() { delat = undefined; }
export function delade(k: AmneId, i?: string, o?: string, u?: 1) { if (!delat || AMNEN[k].prio > AMNEN[delat.k].prio) delat = { k, i, o, ...(u ? { u } : {}) }; }
const VADER_PRAT: Record<string, string> = { regn: 'regnet', sno: 'snön', blast: 'blåsten', aska: 'åskan', dimma: 'dimman' };
// ämnet för samtalet mellan a och b av slaget kind, sparat hos båda
// ämnena från de nya systemen (steg 12.1.136): har p nyss varit med om saken? Svarar med vad det gällde ('' = inget särskilt)
const nara = (s: State, p: Person) => s.people.filter(q => alive(q) && q !== p && (q.id === p.partner || isParent(p, q) || isParent(q, p)));
const NYSS: [AmneId, (s: State, p: Person) => string | undefined][] = [
  ['djur', (s, p) => { const d = (s.tamdjur ?? []).find(x => x.agare === p.id); return harTanke(p, ['mittDjurDog', 'fickUnge'], s.now) ? '' : d ? tamArt(d.art).ord[2] : undefined; }],
  ['sjukdom', (s, p) => { const q = [p, ...nara(s, p)].find(x => x.sjuk); return q?.sjuk ? SJUKDOMAR[q.sjuk.k].namn.toLowerCase() : harTanke(p, ['friskIgen'], s.now) ? '' : undefined; }],
  ['strid', (s, p) => harTanke(p, ['vannSlagsmal', 'forloradeSlagsmal', 'drevBortRovare', 'slogsRovare', 'hotadRovare', 'klaradeVargar', 'anfollsVargar', 'anfollsBjorn', 'sagBjornSlass', 'falldeVildsvin', 'anfollsVildsvin'], s.now) ? '' : undefined],
  ['tro', (s, p) => harTanke(p, ['badBon', 'hordeKvade', 'hordeSorgkvade', 'lasteHeliga', 'gavTron', 'tackade', 'halsadeElden', 'badForFodd'], s.now) ? '' : undefined],
  ['skord', (s, p) => harTanke(p, ['godSkord', 'missvaxt'], s.now) ? '' : undefined],
  ['fest', (s, p) => harTanke(p, ['gastabud', 'dansade', 'lyssnade', 'sagMatch', 'uppträdde'], s.now) ? '' : undefined],
  ['lagar', (s, p) => harTanke(p, ['orattvisLag', 'straffad', 'frikandes'], s.now) ? '' : undefined],
  ['resor', (s, p) => { const q = nara(s, p).find(x => x.ute !== undefined); return q ? q.name : harTanke(p, ['komHem', 'sagStort'], s.now) ? '' : undefined; }],
];
export function samtalAmne(s: State, a: Person, b: Person, kind: string) {
  let x: { k: AmneId; i?: string; o?: string; u?: 1 } | undefined = kind === 'gräl' ? { k: 'gral' } : delat ?? (kind === 'flirt' ? { k: 'karlek' } : kind === 'tröst' ? { k: 'trost' } : undefined);
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
    for (const [k, nyss] of NYSS) { const o = nyss(s, a) ?? nyss(s, b); if (o !== undefined) val.push({ k, ...(o ? { o } : {}) }); } // det någon av dem nyss varit med om (steg 12.1.136)
    x = val[Math.floor(hash(s.seed, a.id * 997 + b.id, Math.round(s.now / MIN)) * val.length)];
  }
  const i = x.i ?? AMNEN[x.k].ikon;
  a.prat = { m: b.id, k: x.k, t: s.now, fr: a.id, ...(i ? { i } : {}), ...(x.o ? { o: x.o } : {}), ...(x.u ? { u: 1 as const } : {}) }; // a talar: delar, lär ut, tröstar
  b.prat = { ...a.prat, m: a.id };
  return a.prat;
}
// vad den döda som heter namn var för q ("far"), om det är en släkting
function slaktTill(s: State, q: Person, namn: string) { const d = s.people.find(x => x.name === namn && x.died !== undefined); return d ? slaktOrd(q, d) : undefined; }
// texten om p:s senaste samtal ("Ask och Ylva pratade om vädret"), eller inget om det är längesedan
export function pratText(s: State, p: Person) {
  const x = p.prat, q = x && byId(s, x.m);
  if (!x || !q || s.now - x.t > BERATT.pratTim * HOUR) return '';
  const [t, l] = (x.fr ?? p.id) === p.id ? [p, q] : [q, p]; // den som talade först, i bådas ruta
  // årstiden och natten från när samtalet hölls, vädret nu (samtalet är högst några timmar gammalt), steg 6.7.7
  const v = vaderNu(s), h = roomAt(s, t.x, t.y);
  const f: Fyllning = { namn: t.name, hen: han(t), med: l.name, om: x.o ?? '', arstid: ARSTIDER[kalender(s).ai], natt: !isLight(x.t), kallt: temperature(s) < 0, regn: v.lage === 'regn', inne: !!h,
    yrke: t.tag && t.tag !== 'Dagdrivare' ? t.tag.toLowerCase() : undefined, barn: s.people.some(c => alive(c) && (c.mother === t.id || c.father === t.id) && ageOf(c, s.now) < ALDER.vuxen),
    eld: brinnerNara(s, t.x, t.y, BERATT.eldNara), slakt: x.k === 'dod' && x.o ? slaktTill(s, l, x.o) : undefined, // elden där de sitter och vem den döda var för den andra (steg 15.1.116)
    plats: x.u ? false : undefined, forr: !!s.rels[relKey(t.id, l.id)]?.minns?.gral, mat: x.k === 'langtan' }; // uppdraget är ingen plats, grälen förut och längtan efter mat (steg 15.1.115)
  return fyll(valjVariant(s, `p_${x.k}` as MallId, p.id + q.id, f, Math.round(x.t / MIN)), f);
}

// ---------- relationerna utförligt (steg 3.9.6) ----------
// Ett tryck på en relation i personrutan: vad p tycker om q och varför. Personkemin, vad de varit med om tillsammans
// (samtal, barn, det den äldre lärt den yngre, gräl, slagsmål, lek, strider sida vid sida och gåvor åt båda hållen, Rel.minns)
// och vad p tror om q: intrycken, de hen sett själv och ryktena hen hört (rykten.ts). Texten väljs utan slump (hash)
export function relationText(s: State, p: Person, q: Person, r: Rel): string[] {
  // fälten som varianterna väljer på (steg 6.7.7): åldrarna, humöret, samtalen och det de varit med om tillsammans
  const barnIhop = s.people.some(c => (c.mother === p.id && c.father === q.id) || (c.mother === q.id && c.father === p.id));
  const f: Fyllning = { namn: p.name, om: q.name, hen: han(p), omHen: han(q), ung: ageOf(p, s.now) < ALDER.vuxen, gammal: ageOf(p, s.now) >= ALDER.gammal, omUng: ageOf(q, s.now) < ALDER.vuxen,
    glad: moodOf(p, s.now) >= BERATT.glad, talks: r.talks ?? 0, mycketPrat: (r.talks ?? 0) >= BERATT.mycketPrat, sida: !!r.minns?.sida, gral: !!r.minns?.gral, slag: !!r.minns?.slag, barn: barnIhop, kin: isKin(p, q),
    // steg 15.1.116: de små barnen, den bästa vännen, förälskelsen, ledaren, våldet, arbetet och äktenskapet
    liten: ageOf(p, s.now) < ALDER.barnsjuk, bast: p.bast === q.id, rom: r.rom >= BERATT.langtan, omLedare: s.styre?.ledare === q.id, illa: !!r.minns?.illa,
    sammaYrke: !!p.tag && p.tag === q.tag && p.tag !== 'Dagdrivare', gift: r.gift !== undefined, gifttid: r.gift !== undefined ? spelTid(s.now - r.gift) : undefined };
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
  if (r.lart) ut.push(`De har lärt varandra något ${ggr(r.lart)}.`); // lart räknas åt båda hållen (steg 15.1.117)
  const gav = m.gav ?? [0, 0], g = gav[p.id < q.id ? 0 : 1], fick = gav[p.id < q.id ? 1 : 0];
  const gavor = (n: number) => n === 1 ? 'en gåva' : `${talOrd(n)} gåvor`;
  if (g) ut.push(`${p.name} har gett ${q.name} ${gavor(g)}${fick ? ` och fått ${fick === 1 ? 'en' : talOrd(fick)} tillbaka` : ' men aldrig fått något tillbaka'}.`);
  else if (fick) ut.push(`${q.name} har gett ${p.name} ${gavor(fick)}, men ${p.name} har aldrig gett något tillbaka.`);
  // intrycken som meningar (steg 6.7.3, m_intryck): de två starkaste, med vad hen såg eller vem hen hörde det av; lika bevis slås ihop
  const Hen = cap(han(p)), qHan = han(q), honomP = honom(p);
  for (const e of (p.intryck ?? []).filter(x => x.om === q.id).sort((x, y) => y.v * y.c - x.v * x.c).slice(0, BERATT.relIntryck)) {
    const t = intryckText(s, e), sjalv = e.src === undefined && !e.led, osaker = e.c < 0.4 ? ', men är inte säker' : '';
    const bev = new Map<string, number>();
    for (const b of e.bev ?? []) { const x = HANDELSER[b.h].text.replace('{om}', b.motNamn === p.name ? honomP : b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något'); bev.set(x, (bev.get(x) ?? 0) + 1); }
    const [vad, n] = [...bev].sort((a, b) => b[1] - a[1])[0] ?? [];
    const gjorde = vad ? `${q.name} ${vad}${n! > 1 ? ` ${ganger(n!)}` : ''}` : undefined;
    if (sjalv) ut.push(gjorde ? `${Hen} har själv sett att ${gjorde} och tycker att ${qHan} är ${t.som}${osaker}.` : `${Hen} tycker att ${q.name} är ${t.som}${osaker}.`);
    else { const fran = byId(s, e.src ?? -1)?.name; ut.push(`${fran ? `Från ${fran}` : 'Från andra'} har ${han(p)} hört att ${gjorde ?? `${q.name} är ${t.som}`}${osaker}.`); }
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
    if (alla.length > PLOGG.visaHela) text += ` Och ${talOrd(alla.length - PLOGG.visaHela)} ${alla.length - PLOGG.visaHela === 1 ? 'sak' : 'saker'} till av samma slag det året.`;
    const tillagg = kanslaRad(s, p, k, sist);
    ut.push({ t: sist[0], k, text: tillagg ? `${text} ${tillagg}` : text, alla });
  }
  return ut;
}
function kanslaRad(s: State, p: Person, k: PersonloggId, r: PersonRad) {
  const d: PersonloggSlag = PERSONLOGG[k], ton = r[4] ?? (typeof d.ton === 'function' ? d.ton(r[2]) : d.ton);
  if (!ton) return '';
  const hum = (r[3] ?? 5) / 9, mod = stat(p, 'mod', r[0]);
  const f = { hen: han(p), honom: honom(p), orolig: mod <= PLOGG.orolig, modig: mod >= PLOGG.modig, talfor: stat(p, 'karisma', r[0]) >= PLOGG.talfor, glad: hum > PLOGG.glad, nere: hum < PLOGG.nere, slag: k }; // slag: vad raden handlar om (steg 15.1.117)
  return fyll(valjVariant(s, ton === 'ont' ? 'h_ont' : 'h_gott', p.id * 7919 + Math.round(r[0] / 60), f, 0), f);
}
