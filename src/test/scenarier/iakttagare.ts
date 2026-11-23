// Iakttagarna (steg 10.2.106): det långa som bara iakttar byar, utan att ställa dem i ett särskilt läge, körs i testbyarna i npm
// test i stället för i egna byar, så att inga byar räknas två gånger (Så hålls testet kort i fliken Läget). Varje iakttagare är en
// rad i registret IAKTTAGARE: ny() ger ett tomt minne, se() tittar på byn efter varje steg, slut() i slutet av en bit, ihop() lägger
// ihop två bitar i följd (den senare sist) och kolla() ger kontrollerna över alla byar, som ett scenario. Minnet går mellan
// processerna som JSON. delby.ts kör iakttagarna i varje bit och test.ts skriver kontrollerna (OK/FEL namn, som scenarierna).
import { ACTS, DAY, DJUR, FN, SAKER, TEKNIK, fnId, housesOf, knows, living, tingOf, type State } from '../../sim';
import * as SIM from '../../sim';
import { STEG_TIM } from '../kor';
import type { Koll } from './hjalp';

export interface Iakttagare<M> { text: string; ny: () => M; se: (s: State, m: M) => void; slut?: (s: State, m: M) => void; ihop: (a: M, b: M) => M; kolla: (byar: { seed: number; m: M }[]) => Koll[] }
type Mangd = Record<string, 1>;
const union = (a: Mangd, b: Mangd): Mangd => ({ ...a, ...b });

// Det i registren som bara händer i vissa byar: namnet och varför. Allt annat ska hända i minst en av byarna
export const SALLSYNT: Record<string, string> = {
  fagel: 'fågeln fälls i ungefär hälften av byarna på 35 dygn (mätt i tolv byar efter system 10.1: åtta fåglar i sex byar), eftersom jägaren bara smyger på en fågel när ingen kanin eller inget rådjur finns nära; scenariot faglar prövar den',
  naverask: 'sen teknik i fas 9 (steg 9.4.13): byn vill ha näveraskar först när någon kan koka i örtköket; scenariot vatskor prövar den',
  lerkruka: 'lerkrukan (steg 9.4.11) kräver tekniken Lerkruka (nivå 3) och lera; scenarierna lera och kruka prövar den',
  lera: 'leran (steg 9.4.10) grävs bara när byn gör av med den, till lerkrukorna; scenariot lera prövar den',
  smalta: 'snön smälts bara när sjön är frusen, elden brinner och det finns en ledig lerkruka (steg 10.2.50), inte i alla byar på 35 dygn; scenariot torst prövar det',
  lyra: 'lyran görs bara vid snickarbänken med kniven där (steg 9.4.5, nivå 4), sällan på 35 dygn; scenarierna snickarbank och scen prövar den',
  flyttStation: 'en station ute flyttas bara när den används mycket och står långt från husen och lagren (steg 9.4.8); scenariot mittenstation prövar det',
  tork: 'torkställningen görs bara när byn har kött och fisk över för ett dygn, och de hungrigare byarna kommer på den sent; scenariot tork prövar den',
  koka_te: 'örtteet (steg 9.5.8) kräver tekniken Örtte på nivå 4 och en lerkruka; scenariot vatskor prövar det',
  orte: 'som koka_te; scenariot vatskor prövar det',
  protes: 'proteserna (steg 9.5.11) görs först när någon förlorat en del och byn har snickarbänken; scenariot protes prövar dem', krycka: 'som protes; scenarierna protes och benbrott prövar den', traben: 'som protes; scenariot protes prövar det', krok: 'som protes; scenariot protes prövar den', ogonlapp: 'görs bara åt den som förlorat ett öga (steg 9.5.11); scenariot protes prövar den',
  nal: 'nålen (steg 9.5.15) görs när ett stort sår ska sys; scenariot pilisaret prövar den', koka_vatten: 'kokat vatten (steg 9.5.25) kräver lerkrukan och ett infekterat sår; scenariot infektion prövar det', skara_lin: 'remsor av lin kräver lintyg (steg 9.5.15); scenariot pilisaret prövar dem', lakesalva: 'läkesalvan (steg 9.5.10) är en teknik på nivå 5; scenariot salva prövar den',
  snickarbank: 'snickarbänken (steg 9.4.4) kräver klyvplatsen, sällan på 35 dygn; scenariot snickarbank prövar den',
  halsband_fjaderband: 'fjädrarna kommer bara från fåglarna, som få byar fångar, och halsbanden är få; scenariot fjaderband prövar det',
  fangeVantar: 'rövaren som ger upp i en strid väntar på hur striden slutar (steg 11.12.6), och rövarna ger sällan upp på 50 dygn; scenarierna fangar och fangeval prövar det',
  tatuera: 'märket görs åt den som varit med om något stort och med en bennål, som inte alla byar har; scenariot tatuering prövar det',
  matta: 'vävs vid vävstolen, som är sen och sällsynt; scenariot pynt prövar mattan', blomma: 'plockas bara till en lerkruka med blommor (steg 10.7.3), och krukorna är sällsynta; scenariot blommor prövar den',
  vedbod: 'kräver mycket ved ute, hinner inte alltid komma på 35 dygn; scenariot skjul prövar den',
  bjorn: 'björnen finns i få byar och fälls sällan (steg 6.6.4–6.6.6); scenarierna bjorn och bjornjakt prövar den',
  bjornjakt: 'björnen jagas bara när den finns nära och jägarna är många nog (steg 6.6.6); scenariot bjornjakt prövar det',
  bjornskinn: 'björnskinn blir det bara av en fälld björn (se bjorn); scenariot bjornjakt prövar slakten',
  bjornkott: 'björnkött blir det bara av en fälld björn (se bjorn); scenariot bjornjakt prövar slakten',
  bjorndel: 'ett björnstycke blir det bara av en fälld björn (se bjorn); scenariot bjornjakt prövar det',
  rock_bjornskinn: 'en rock av björnskinn behöver ett björnskinn (se bjorn); scenariot plagg prövar plaggen',
  skor_bjornskinn: 'skor av björnskinn behöver ett björnskinn (se bjorn); scenariot plagg prövar plaggen',
  rock: 'plaggen sys vid slöjdbänken med bensylen, som de hungrigare byarna efter 6.6 kommer på sent eller inte alls på 35 dygn; scenariot plagg prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  koa: 'handlaren kommer bara när en grannby med överflöd skickar hen (steg 11.6.8); scenariot handelsko prövar kön; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  fjadrar: 'fjädrar blir det bara när en fälld fågel slaktas och inte äts hel; fåglarna jagas bara när ingen kanin eller inget rådjur finns nära (steg 6.6.3), och i de hungriga byarna äts de; scenariot faglar prövar slakten; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  kol: 'kol blir det bara när elden brunnit ut helt',
  flyttaeld: 'elden flyttas bara när ett hus behöver platsen eller byn har minst tre hus och vuxit ifrån elden (steg 2.10.4); scenariot eldflytt prövar det',
  tillbehor: 'skinnfällen i bädden görs bara när byn har skinn över och kommit på skinnfällen, i 1 av 4 byar på 35 dygn sedan v324; scenariot skinnfall prövar det',
  hantverk: 'handarbete utan sak väljs inte sedan v55; rep tvinnas som en egen handling och resten är projekt',
  metspo: 'sen teknik efter fiskespjutet och repet, hinner inte alltid komma på 35 dygn',
  korg: 'sen teknik efter slöjdbänken, hinner inte alltid komma på 35 dygn',
  buren: 'bara den som inte kan gå (ett svårt skadat ben eller en fot) långt från lägret bärs hem; scenariot vard prövar det',
  vatten: 'bara den som inte kan gå får vatten i säcken; scenariot vattensack prövar det',
  vattensack: 'sen teknik efter skinnkläderna (steg 2.10.1), hinner inte alltid komma på 35 dygn; scenariot vattensack prövar säcken',
  odling: 'sen teknik (steg 2.10.2): byn kommer på den när den samlat mycket av de vilda grödorna, sällan på 35 dygn; scenarierna odling och falt prövar den',
  odla: 'bara efter odlingen och ett röjt fält (steg 2.10.3), sällan på 35 dygn; scenariot falt prövar det',
  rovor: 'grödor blir det bara på ett sått fält (steg 2.10.3); scenariot falt prövar det',
  forrad: 'förrådshuset byggs när maten ruttnar eller förrådet är fullt, i ungefär var femte by på 30 dygn sedan kvaliteten (steg 2.2.2); scenariot forradshus prövar det',
  samling: 'blir det bara av en sovsal som ingen längre sover i (steg 1.6.4); scenariot funktion prövar det',
  verkstad: 'blir det bara när en station hamnar i ett hus där ingen sover (steg 2.2.17), inte i alla byar på 35 dygn; scenariot verkstad prövar det',
  krossa: 'utbrotten är sällsynta (Björn efter v138: de blir vanligare med motgångar och attacker); att slå sönder något och barnens trots prövas i scenarierna utbrott och barnutbrott',
  skams: 'straffet skam döms bara när en ledare straffar någon för ett brott, och brotten är sällsynta; scenariot ledare prövar det',
  elak: 'utbrotten är sällsynta; att vara elak prövas i scenariot utbrott',
  grata: 'utbrotten är sällsynta; att gråta prövas i scenariot utbrott',
  tjura: 'utbrotten är sällsynta; att tjura prövas i scenariot utbrott',
  skvallra: 'utbrotten är sällsynta; skitsnacket prövas i scenariot rykten',
  skrika: 'barnens utbrott är sällsynta; att skrika prövas i scenariot barnutbrott',
  fly: 'utbrotten är sällsynta; att springa iväg prövas i scenarierna utbrott och barnutbrott',
  torka: 'kött och fisk hängs bara upp när byn har mat över för ett dygn, och i en hungrig by blir inget över; scenariot tork prövar det',
  torrkott: 'torkat kött blir det bara när kött blir över (se torka); scenariot tork prövar det',
  torrfisk: 'det som blir över när byn har mat för ett dygn hängs upp; sedan byarna blev större (steg 2.12.6) äts fisken oftast färsk, och oftare blir köttet från ett slaktat djur över; scenariot tork prövar det',
  vargjakt: 'vargarna kommer bara i istiden (steg 3.7.13), inte i alla byar på 35 dygn; scenariot varg prövar vargjakten',
  varg: 'vargarna kommer bara i istiden (steg 3.7.13); scenariot varg prövar dem',
  flintspjut: 'sedan skogen gjordes om (steg 5.1.4) görs inget flintspjut i de fyra byarna på 35 dygn; byarna klarar sig med träspjutet, och det ses över i fasens Balans (5.5)',
  vargkott: 'vargkött blir det bara av en fälld varg (steg 3.7.14); scenariot varg prövar det',
  vargskinn: 'vargskinn blir det bara av en fälld varg (steg 3.7.14); scenariot varg prövar det',
  slacka: 'eldsvådor nära byn kommer bara när marken är torr på sommaren (steg 3.8.5); scenariot brand prövar att släcka',
  slackaSig: 'en person fattar eld bara i en eldsvåda nära byn (steg 10.2.27); scenariot brinner prövar det',
  hjalpaBrinnande: 'som slackaSig: någon hjälper den som brinner; scenariot brinner prövar det',
  gastFly: 'rövarna kommer till få byar på 35 dygn, och de flyr bara efter en förlorad strid; scenarierna rovargang och rovarstrid prövar det',
  gaHem: 'handlaren och främlingen kommer till få byar på 35 dygn och går hem när besöket är slut; scenarierna handlare och framling prövar det',
  ang: 'ängen märks ut först när byn har betesdjur och en hage (steg 10.2.36), i få byar på 35 dygn; scenariot slatter prövar den',
  gastKommer: 'gästen är på väg in en kort stund innan hen väntar vid filten (det som räknas här); scenarierna handlare och rovargang prövar det',
  jordgubbar: 'jordgubbarna sätts sällan på 35 dygn, när andra grödor ger mer; scenariot flerarig prövar dem', jordgubbsplanta: 'som jordgubbar; scenariot flerarig prövar dem',
  undan: 'tornadon kommer sällan, bara på sommaren och hösten och inte i alla byar på 35 dygn (steg 3.8.4); scenariot tornado prövar att gå undan',
  flyBin: 'bara den som står nära ett uppretat bo flyr (steg 10.10.27); scenariot retad prövar det',
  flyEld: 'bara den som står nära en brinnande ruta och inte släcker går undan (steg 3.8.5); scenariot brand prövar branden',
  rock_vargskinn: 'en rock av vargskinn behöver två vargskinn, alltså två fällda vargar (steg 3.7.14), sällan på 35 dygn; scenariot plagg prövar den',
  skor_vargskinn: 'skor av vargskinn behöver ett vargskinn, alltså en fälld varg (steg 3.7.14), sällan på 35 dygn; scenariot plagg prövar dem',
  vargdel: 'en styckdel av varg blir det bara när en fälld varg är för tung att bära hem (steg 6.6.1); scenariot styckning prövar det',
  talgljus: 'talgljuset görs av två talg (steg 6.3.8), och talg blir det bara av slaktade rådjur och vargar, i 1 av 4 byar på 35 dygn; scenariot talgljus prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  ljus: 'ett talgljus ställs bara fram när byn har ett (se talgljus); scenariot talgljus prövar det',
  uppsatt: 'en fackla sätts bara upp när byn har en över (steg 6.3.7), och facklan görs i 1 av 4 byar på 35 dygn; scenariot uppsatt prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skinnfall: 'skinnfällen kommer man bara på när byn har skinn över och halmbäddar (steg 2.2.15), sällan på 35 dygn sedan skinnen blev kvar där djuret styckades (steg 6.6.1); scenariot skinnfall prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skinndorr: 'skinndörren kommer man bara på när byn har skinn över och ett hus med en öppen dörröppning (steg 2.2.16), sällan på 35 dygn; scenariot dorr prövar den; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  skogsvard: 'skogsvården kommer man bara på när de närmaste träden att fälla står långt bort (steg 6.5.2), sällan på 35 dygn; scenariot skogsvard prövar den; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns',
  plantera: 'plantor flyttas bara av den som kan skogsvården (se skogsvard); scenariot skogsvard prövar det',
  budRovare: 'budbäraren springer bara när en flock väntar utanför byn och någon inte hört ropet (steg 9.2.117); scenariot rovarbud prövar det',
  skilja: 'man går emellan bara när två slåss nära en (steg 10.1.4); scenariot stridkarta prövar det',
  undanStrid: 'man går undan bara när två slåss nära en (steg 10.1.4); scenariot stridkarta prövar det',
  hjalpaRovare: 'man håller sig bakom kämparna bara när rövare eller vargar är nära byn (steg 9.2.116 och 9.2.121); scenarierna rovarforsvar och vargskydd prövar det',
  forsvarRovare: 'man väntar på rövarna med vapen bara när rövare är nära byn (steg 9.2.74), och de kommer bara till en rik by; scenariot rovarforsvar prövar det',
  ridning: 'ridningen (steg 11.11.4) är en teknik på nivå 5 som öppnas först efter tio körningar med häst, och hästen köps sällan på 50 dygn; scenariot ridning prövar den',
  ridsadel: 'ridsadeln (steg 11.11.4) kräver ridningen; scenariot ridning prövar den', sy_ridsadel: 'som ridsadel; scenariot ridning prövar den',
  packsadel: 'packsadeln (steg 11.11.4) görs när byn ska resa med packdjur, och resorna är sällsynta på 50 dygn; scenariot packsadel prövar den', sy_packsadel: 'som packsadel; scenariot packsadel prövar den',
  talt: 'tältet (steg 11.11.2) görs när byn ska resa och sova ute, och resorna är sällsynta på 50 dygn; scenariot talt prövar det', sy_talt: 'som talt; scenariot talt prövar det',
  vagn: 'vagnen (steg 11.11.3) byggs när byn ska frakta mycket på en resa, och resorna är sällsynta på 50 dygn; scenarierna vagn och karavan prövar den',
  fangelse: 'fängelset (system 11.12) byggs först när ledaren gett påbudet om fängelse, som sällan händer på 50 dygn; scenarierna fangelse och fangar prövar det',
};
// det som har samma skäl: nycklarna och skälet en gång
for (const [ks, why] of [
  [['lerkruka_liten', 'lerkruka_mellan', 'lerkruka_stor'], 'som lerkruka; scenarierna lera och kruka prövar den'],
  [['trumma', 'benflojt'], 'instrumenten görs bara till scenen, som kräver plankor och tekniken på nivå 3 (steg 10.2.90) och sällan står klar på 35 dygn; scenariot scen prövar dem'],
  [['byxor_vargskinn', 'byxor_bjornskinn', 'mossa_bjornskinn', 'mossa_vargskinn', 'snoskor_vargskinn', 'snoskor_bjornskinn', 'halsband_tandband', 'halsband_benband', 'tunika_lintyg', 'skjorta_lintyg', 'byxor_lader', 'mossa_lader', 'byxor_kaninskinn', 'mossa_kaninskinn', 'snoskor_kaninskinn', 'koka_salva', 'koka_lim', 'koka_tval', 'koka_tjara', 'garva', 'spinna', 'vava', 'snara', 'grop', 'byxor', 'mossa', 'snoskor', 'halsband', 'tunika', 'skjorta', 'salva', 'benlim', 'tval', 'tjara', 'lader', 'ratlin', 'lin', 'linfron', 'trad', 'lintyg', 'vargtand', 'garvning', 'vavstol', 'slanda', 'torkhus', 'mjarde', 'torrgadda', 'torrmort', 'grillgadda', 'grillmort', 'gaddkott', 'mortkott', 'gadda', 'mort', 'rolleka', 'leksak', 'gor_leksak', 'hugga_sten', 'klyva_plank', 'huggen_sten', 'plankor', 'vittja', 'harden', 'stenhuggarplats', 'klyvplats', 'ortkok', 'fangstbank', 'stockvag', 'brygga'], 'sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den'],
  [['barmat', 'fangen', 'fangvakt', 'stoppa', 'besokFange', 'rymma'], 'fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det'],
  [['skor', 'rock_kaninskinn', 'skor_kaninskinn'], 'som rock; scenariot plagg prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns'],
  [['axelrem', 'ryggsack', 'axelrem_kaninskinn', 'axelrem_vargskinn', 'axelrem_bjornskinn', 'ryggsack_kaninskinn', 'ryggsack_vargskinn', 'ryggsack_bjornskinn'], 'sen teknik i fas 7 (steg 7.1.2–7.1.3, nivå 5), hinner inte alltid komma på 35 dygn; scenarierna axelrem och ryggsack prövar den'],
  [['badd', 'slut', 'sla'], 'de allvarliga utbrotten kommer bara när humöret är mycket lågt; scenariot vald prövar det'],
] as [string[], string][]) for (const k of ks) SALLSYNT[k] = why;
// fas 8 (system 8.2, 8.3, 8.5 och 8.6): det som kräver en ledare, en präst eller en tro på en viss nivå hinner sällan komma på 35 dygn
for (const k of ['medvetslos', 'mantel', 'prastdrakt', 'tecken', 'mask', 'koka_rokelse', 'koka_olja', 'rokelse', 'brannolja', 'rustning', 'hjalm', 'skold', 'bage', 'slunga', 'horn', 'pilar', 'gor_pilar', 'avrusta', 'rusta']) SALLSYNT[k] ??= 'kräver en ledare eller en tro på en viss nivå; scenarierna mantel, ritualer och kyrkan prövar det';
for (const k of SIM.KLAD_SLAG) if (/^(mantel|prastdrakt|tecken|mask|rustning|hjalm)_/.test(k)) SALLSYNT[k] ??= 'bara ledaren eller en präst, och de troende när tron har nått långt; scenarierna mantel och kyrkan prövar det';
// fas 9, system 9.6: matlagningen, dryckerna och det nya kräver lerkrukan, sädesodlingen eller en teknik på nivå 4–5, som byarna sällan
// hinner komma på 35 dygn; varje sak har sitt scenario
for (const [ks, why] of [
  [[...SIM.RATT_SAKER, 'koka_mat', 'steka'], 'rätterna (steg 9.6.3 och 9.6.21) kräver lerkrukan och stekhällen; scenarierna kokning och stek prövar dem'],
  [['ulltrad', 'ylle', 'spinna_ull', 'vava_ull', 'tunika_ylle', 'skjorta_ylle', 'kappa', 'sjal', 'kappa_ylle', 'sjal_ylle', 'mantel_ylle'], 'ullen (steg 9.8.14) kräver får, vävstolen och sländan; scenariot ylle prövar den'],
  [['mata', 'hage', 'valla', 'klippa', 'mjolka', 'avliva', 'slatter', 'skara', 'ull', 'slaktfar', 'slaktget', 'djurhorn', 'levget', 'levhons', 'far', 'get', 'fahus', 'farkott', 'getkott', 'farskinn', 'getskinn', 'rock_farskinn', 'rock_getskinn', 'skor_farskinn', 'skor_getskinn', 'axelrem_farskinn', 'axelrem_getskinn', 'byxor_farskinn', 'byxor_getskinn', 'mossa_farskinn', 'mossa_getskinn', 'snoskor_farskinn', 'snoskor_getskinn', 'ryggsack_farskinn', 'ryggsack_getskinn', 'ko', 'levko', 'slaktko', 'kokott', 'kohud', 'rock_kohud', 'skor_kohud', 'axelrem_kohud', 'byxor_kohud', 'mossa_kohud', 'snoskor_kohud', 'ryggsack_kohud'], 'de tama djuren (system 9.8) kommer först när byn köpt får, getter eller höns av handlaren, och djuren är dyra; scenarierna boskap, hage, hagflytt, mjolk, tamslakt, slatter och hons prövar dem'],
  [['kal', 'bonor', 'kalfron', 'appel', 'appelplanta', 'levfar'], 'kålen, bönorna, äppelträdet och fåren (steg 9.7.8, 9.7.13 och 9.8.5) kommer med handlaren, och byn köper dem inte alltid inom 35 dygn; scenarierna grodor, flerarig och boskap prövar dem'],
  [['hamla', 'lovkarve'], 'lövtäkten (steg 9.8.16) kräver betesdjur och för lite hö; scenariot hamla prövar den'],
  [['tomma_latrin'], 'latrinen töms (steg 9.7.6) bara när byn har en kompost och latrinen är nästan full; scenariot kompost prövar det'],
  [['krossa_saft'], 'saften (steg 9.6.9) kräver lerkrukan; scenariot saft prövar den'],
  [['pergament', 'gora_pergament', 'riva_black'], 'pergamentet och bläcket (steg 10.6.4) är en sen teknik på nivå 6 efter garvningen; scenariot pergament prövar dem'],
  [['bok', 'skrivpulpet'], 'böckerna (steg 10.6.6) kräver pergamentet och snickarbänken, en teknik på nivå 7; scenariot bok prövar dem'],
  [['skriva', 'lasa', 'blad'], 'att skriva och läsa (steg 10.6.5) kräver pergamentet och bläcket, en sen teknik; scenariot skriva prövar det'],
  [['korn', 'sadesodling', 'malt', 'malta', 'mjol', 'mala_korn', 'kvarnsten', 'brod', 'baka', 'bakugn'], 'kornet (steg 9.6.11) kommer bara med handlarna, och mjölet, maltet och brödet efter det; scenarierna sad, kvarn och brod prövar dem'],
  [['bryggkar', 'tappa', 'ol'], 'vinet och ölet (steg 9.6.12–9.6.13) är tekniker på nivå 4–5; scenarierna vin och ol prövar dem'],
  [['supa'], 'supandet (steg 9.6.15) kräver vin eller öl i byn; scenariot bakfylla prövar det'],
  [['nat', 'braxen', 'sik', 'braxkott', 'sikkott'], 'nätet (steg 9.6.16) är en teknik på nivå 4, och braxen och sik fångas mest i nätet; scenarierna nat och braxen prövar dem'],
  [['salt', 'saltfisk', 'saltkott', 'salta_fisk', 'salta_kott', 'salta_vargkott', 'salta_radjurkott', 'salta_farkott', 'salta_kokott', 'salta_getkott', 'salta_fagelkott', 'salta_bjornkott'], 'saltet (steg 9.6.19) kommer bara med handlarna; scenariot salt prövar det'],
  [['rokeri', 'roka', 'rokfisk', 'rokkott'], 'rökeriet (steg 9.6.8) är en teknik på nivå 5; scenariot rokeri prövar det'],
  [['fagelkott'], 'fågelkött ger bara en fågel som fångas eller en slaktad höna; scenarierna faglar och hons prövar det'],
  [['stekhall'], 'stekhällen (steg 9.6.21) är en teknik på nivå 4; scenariot stek prövar den'],
  [['koka_buljong'], 'buljongen (steg 10.7.24) kokas i en mellanstor lerkruka, som kräver tekniken Lerkruka; scenariot drycker prövar den'],
  [['branna', 'sprit'], 'spriten (steg 10.7.26) bränns i brännpannan på bryggkaret, som kommer efter vinet och ölet; scenariot sprit prövar den'],
  [['mjod'], 'mjödet (steg 10.7.25) kräver honung från vildbin och bryggkaret; scenariot mjod prövar det'],
  [['gropa'], 'festmåltiden i kokgropen (steg 10.7.28) kräver tekniken Kokgrop efter lerkrukan och en ritual eller ett bröllop; scenariot festmaltid prövar den'],
  [['troshus'], 'trons hus kommer först när en tro vuxit och bestämt planen del för del i buden (steg 10.3.18–10.3.19); i testbyarna efter 40–50 dygn eller inte alls; scenarierna troshusplan och troshusut prövar det'],
  [['rock_radjursskinn', 'axelrem_radjursskinn', 'ryggsack_radjursskinn', 'mossa_radjursskinn', 'skor_radjursskinn', 'byxor_radjursskinn', 'snoskor_radjursskinn'], 'rådjursskinnet är ett klädmaterial, men rådjuren är få och skinnen räcker till ett plagg här och där, olika i varje by'],
  [['rock_vitskinn', 'byxor_vitskinn', 'mossa_vitskinn', 'skor_vitskinn', 'snoskor_vitskinn', 'axelrem_vitskinn', 'ryggsack_vitskinn'], 'vitskinnet (steg 10.7.22) kommer bara från harar som slaktas under istiden, och plaggen görs sällan av det; scenariot vinterpals prövar det'],
  [['vildsvin', 'vildsvindel'], 'vildsvinen (steg 10.10.4) står långt inne i skogen, och jägaren letar där kaninerna brukar vara, så hen kommer sällan nära en flock; scenariot vildsvin prövar jakten'],
  [['kalke', 'slade'], 'kälken och släden (steg 10.10.1–10.10.2) är tekniker på nivå 3–4 efter snickarbänken och repet; scenariot kalke prövar dem'],
  [['byggsten', 'bryta'], 'byggstenen (steg 10.10.5) kräver stenhuggarplatsen och stockvägen, nivå 4, och en plan av sten; scenariot byggsten prövar den'],
  [['gris', 'kulting', 'slaktgris', 'bur', 'svinkott', 'levoxe', 'levhast', 'salta_svinkott', 'rock_svinskinn', 'skor_svinskinn', 'axelrem_svinskinn', 'byxor_svinskinn', 'mossa_svinskinn', 'snoskor_svinskinn', 'ryggsack_svinskinn'], 'fläsket kommer bara från ett vildsvin som fällts (sällan, steg 10.10.4) eller från grisen; grisen kommer ur buren (nivå 5, steg 10.10.13), oxen och hästen med handlaren (steg 10.10.3), och byn hinner sällan dit på 50 dygn; scenarierna bur, gris och dragdjur prövar dem'],
  [['skatta', 'bivax', 'vaxljus'], 'bikupan (steg 10.10.16) kommer först när byn tagit honung ur vildbon, och skattningen och vaxet efter det; scenarierna bikupa, skattning och vaxljus prövar dem'],
  [['benspade'], 'benspaden (steg 2.7.2) kräver tre ben, och benen går först till sylen, nålarna och snarorna, så den görs sent eller inte alls på 50 dygn; scenarierna latrin och lera prövar den'],
  [['naver'], 'nävern (steg 6.3.3) täljs bara när en eld tänds med försök och höet inte räcker, och sedan 10.6.12 tänds eldarna oftast med en brand från en eld som brinner; scenariot naver prövar den'],
  [['kolmila', 'kola', 'passa', 'blasterugn', 'blasa', 'malm', 'jarn', 'jarnskrot', 'smedja', 'smida'], 'järnet (system 12.2) börjar med kolmilan, en teknik på nivå 4 efter örtköket, och blästerugnen och smedjan på nivå 5, och malmen hämtas i bergen eller myren; scenarierna kolmila, blaster, jarngruva, jarnskrot och smedja prövar det'],
  [['jarnspjut', 'jarnskold', 'jarnhjalm', 'jarnhjalm_jarn', 'ringbrynja', 'ringbrynja_jarn', 'svard', 'vapensmide'], 'järnvapnen och rustningen (steg 12.2.7–12.2.9) smids i smedjan med vapensmidet, nivå 6; scenarierna vapensmide och jarnvapen prövar dem'],
  [['isborr', 'sag', 'ullsax', 'jarnnal', 'jarnhacka', 'jarngryta', 'eldstal', 'jarnyxa', 'jarnkniv', 'lie', 'spanne', 'spanne_jarn', 'las'], 'redskapen av järn (steg 12.2.10–12.2.17) smids i smedjan, nivå 5–6, och kräver järnet; scenarierna jarnredskap, jarnsmycke, isborr, sag, ullsax, jarnnal, hacka, gryta och las prövar dem'],
  [['torv'], 'torven (system 12.2) grävs med benspaden i myren, och både benspaden och en myr nära byn är sällsynta; scenariot torv prövar den'],
  [['drejskiva'], 'drejskivan (steg 12.4.1) är en teknik på nivå 4 efter lerkrukan och stenhuggarplatsen; scenariot drejskiva prövar den'],
  [['fyll_lampa'], 'oljelampan (steg 12.4.2) kräver brännolja och en lampa; scenarierna brannolja och oljelampa prövar den'],
  [['stol', 'sang'], 'stolen och sängen (steg 12.4.3–12.4.4) görs vid snickarbänken, nivå 4; scenarierna stol och sang prövar dem'],
  [['tunna', 'laggkar'], 'tunnan (steg 12.4.6) laggas vid snickarbänken med laggkärlet, nivå 5 efter bryggkaret; scenariot tunna prövar den'],
  [['ost', 'ysta'], 'osten (steg 12.4.7) ystas av mjölk, och mjölk har bara en by med tamdjur; scenariot ost prövar den'],
  [['brunn'], 'brunnen (steg 12.4.8) kräver benspaden och stenhuggarplatsen, nivå 4; scenariot brunn prövar den'],
  [['utedass'], 'utedasset (steg 12.4.9) är en teknik på nivå 5 efter latrinen och klyvplatsen; scenariot utedass prövar det'],
  [['sjukstuga'], 'sjukstugan (steg 12.4.10) är en teknik på nivå 5 efter halmbädden och örtteet; scenariot sjukstuga prövar den'],
  [['fyrfat'], 'fyrfatet (steg 12.4.11) är en teknik på nivå 4 efter lerkrukan, och elden i det tänds bara när det är kallt inne; scenariot fyrfat prövar det'],
  [['maltid', 'sate', 'satta', 'pall'], 'måltiden vid bordet kräver ett bord, och pallen snickarbänken; testbyarna efter tändningen på 2 minuter (fasens Balans 12.6) är små och bygger inga bord på 50 dygn, eftersom bordet väger lätt mot latrinen, vattnet och kläderna, utan att någon gräns bryts; scenarierna bord, maltidsniva och stol prövar dem'],
  [['klaPa'], 'ett varmare plagg tas på bara när någon fryser och har ett plagg över, och testbyarna i fasens Balans (12.6) har få plagg; scenarierna kladvarme och klader prövar det'],
  [['bagborr', 'hylla', 'skinnklader'], 'bågborren, hyllan och skinnkläderna är tekniker på nivå 3–4 som de små testbyarna i fasens Balans (12.6) inte kommer på på 50 dygn, utan att någon gräns bryts; scenarierna bagborr, forvaring och klader prövar dem'],
  [['staket'], 'staketet runt fältet sätts bara när djur äter av ett sått fält, och få testbyar sår; scenariot staket prövar det'],
  [['varna'], 'man varnar de andra bara när rövare eller vargar är nära och någon inte hört larmet; scenarierna larm och larm2 prövar det'],
  [['skramma'], 'fågelskrämman sätts upp på ett sått fält när fåglarna äter av det, och få testbyar sår; scenariot skadedjur prövar den'],
  [['ortPlocka'], 'örten plockas ur en lerkruka med örter, och krukorna är sällsynta; scenariot ortkruka prövar det'],
  [['oljelampa'], 'oljelampan (steg 12.4.2) formas av lera när byn har brännolja; scenariot oljelampa prövar den'],
  [['resa', 'silver'], 'en resa (system 11.5) börjar när en nyfiken och modig bybo med mat över hört rykten om en plats, och testbyarna i fasens Balans (12.6) har sällan mat över; silvret kommer från resorna och handeln; scenarierna samlaresa och silvergruva prövar dem'],
  [['plundra'], 'rövarna plundrar bara en by de besegrat, och i testbyarna vinner de sällan på 50 dygn; scenariot plundring prövar det'],
  [['penna'], 'fjäderpennan (steg 12.4.14) skärs när någon ska skriva, och att skriva kräver pergamentet, nivå 6; scenariot skriva prövar den'],
] as [string[], string][]) for (const k of ks) SALLSYNT[k] ??= why;

// aldrig: allt i registren används, i minst en av testbyarna
const REG = () => ({ handlingar: Object.keys(ACTS), saker: Object.keys(SAKER), husfunktioner: [...FN] as string[], djurarter: Object.keys(DJUR), tekniker: TEKNIK.map(t => t.id) });
type Kat = keyof ReturnType<typeof REG>;
interface AldrigM { by: Record<Kat, Mangd>; steg: number }
let dold: Record<string, string> | undefined; // giftsvampen göms i svampen
const aldrig: Iakttagare<AldrigM> = {
  text: 'Allt i registren används: varje handling, sak, husfunktion, djurart och teknik förekommer i minst en av testbyarna i npm test',
  ny: () => ({ by: { handlingar: {}, saker: {}, husfunktioner: {}, djurarter: {}, tekniker: {} }, steg: 0 }),
  se: (s, m) => {
    dold ??= Object.fromEntries(Object.keys(SAKER).filter(k => SAKER[k]!.dold && SAKER[k]!.i).map(k => [SAKER[k]!.i!, k]));
    const { handlingar, saker, husfunktioner } = m.by;
    for (const p of [...living(s), ...SIM.gasterNu(s)]) if (p.task) { handlingar[p.task.act] = 1; for (const k in p.task.items ?? {}) saker[k] = 1; }
    for (const a of s.stackar ?? []) { saker[a.k] = 1; if (a.dold && dold[a.k]) saker[dold[a.k]!] = 1; }
    for (const t of tingOf(s)) saker[t.k] = 1;
    for (const f of s.flackar ?? []) if (SAKER[f.k]) saker[f.k] = 1; // toa-högen är en fläck på marken (smuts.ts)
    if (m.steg++ % STEG_TIM === 0) for (const h of housesOf(s)) husfunktioner[fnId(h)] = 1;
  },
  // vanorna har varje handling som någon gjort, också de döda och utflyttade
  slut: (s, m) => {
    for (const p of s.people) { for (const k in p.habit) m.by.handlingar[k] = 1; for (const t of TEKNIK) if (knows(p, t.id)) m.by.tekniker[t.id] = 1; }
    for (const k of Object.keys(DJUR)) if (m.by.saker[DJUR[k as keyof typeof DJUR].sak]) m.by.djurarter[k] = 1;
  },
  ihop: (a, b) => ({ by: Object.fromEntries(Object.keys(a.by).map(k => [k, union(a.by[k as Kat], b.by[k as Kat])])) as AldrigM['by'], steg: a.steg + b.steg }),
  kolla: byar => {
    const reg = REG(), n = byar.length;
    const ut: Koll[] = (Object.entries(reg) as [Kat, string[]][]).map(([kat, ks]) => {
      const antal = (k: string) => byar.filter(b => b.m.by[kat][k]).length;
      const aldrigK = ks.filter(k => !antal(k)), sallan = ks.filter(k => antal(k) && antal(k) < n);
      const txt = `${kat}: ${ks.length - aldrigK.length} av ${ks.length} används` +
        (aldrigK.length ? `, aldrig: ${aldrigK.map(k => SALLSYNT[k] ? `${k} (sällsynt: ${SALLSYNT[k]})` : k).join(', ')}` : '') +
        (sallan.length ? `; bara i några av byarna: ${sallan.map(k => `${k} ${antal(k)} av ${n}`).join(', ')}` : '');
      return [txt, aldrigK.every(k => SALLSYNT[k])] as Koll;
    });
    const okanda = Object.keys(SALLSYNT).filter(k => !Object.values(reg).some(ks => ks.includes(k)));
    return [...ut, [`listan över det sällsynta har bara sådant som finns i registren${okanda.length ? ` (inte: ${okanda.join(', ')})` : ''}`, !okanda.length]];
  },
};

// teknik: ingen kan något från början, repet och yxan kommer på, ingen gör dem innan någon kommit på hur, och kunskapen sprids
interface TeknikM { forst: Record<string, number>; innan: Mangd; kan: Record<string, number>; levande: number }
const teknik: Iakttagare<TeknikM> = {
  text: 'Ingen kan göra yxa, spjut eller rep från början: den som arbetar kommer på det och lär ut det i samtal (i testbyarna i npm test; scenariot teknik prövar resten)',
  ny: () => ({ forst: {}, innan: {}, kan: {}, levande: 0 }),
  se: (s, m) => {
    for (const t of TEKNIK) if (m.forst[t.id] === undefined && living(s).some(p => knows(p, t.id))) m.forst[t.id] = (s.now - s.founded) / DAY;
    if ((s.stat?.yxa1 ?? 0) > 0 && m.forst.yxa === undefined) m.innan.yxa = 1; // gjord i byn: en handlare kan sälja en yxa förut
    if (SIM.amountOf(s, 'rep') > 0 && m.forst.rep === undefined) m.innan.rep = 1;
  },
  slut: (s, m) => { m.levande = living(s).length; for (const id of ['rep', 'yxa']) m.kan[id] = living(s).filter(p => knows(p, id)).length; },
  // en teknik som någon redan kunde i en tidigare bit räknas från den biten
  ihop: (a, b) => ({ forst: { ...b.forst, ...a.forst }, innan: union(a.innan, b.innan), kan: b.kan, levande: b.levande }),
  kolla: byar => {
    const d = (m: TeknikM, k: string) => m.forst[k] === undefined ? 'aldrig' : `dygn ${m.forst[k].toFixed(1)}`;
    return [
      ['ingen kan något från början', byar.every(b => Object.values(b.m.forst).every(t => t > 0))],
      [`repet och yxan kommer på i varje by (${byar.map(b => `by ${b.seed}: rep ${d(b.m, 'rep')}, yxa ${d(b.m, 'yxa')}, spjut ${d(b.m, 'fiskespjut')}`).join('; ')})`, byar.every(b => b.m.forst.rep !== undefined && b.m.forst.yxa !== undefined)],
      ['ingen gör en yxa eller ett rep innan någon kommit på hur', byar.every(b => !b.m.innan.yxa && !b.m.innan.rep)],
      [`kunskapen sprids i samtal: i varje by där minst fem lever kan minst tre rep och yxa (${byar.map(b => `by ${b.seed}: ${b.m.kan.rep} rep, ${b.m.kan.yxa} yxa av ${b.m.levande}`).join('; ')})`, byar.every(b => b.m.levande < 5 || (b.m.kan.rep >= 3 && b.m.kan.yxa >= 3))],
    ];
  },
};

export const IAKTTAGARE: Record<string, Iakttagare<any>> = { aldrig, teknikbyar: teknik };
