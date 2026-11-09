import { allaBarn, upplev } from './uppvaxt';
import { personHand } from './personlogg';
import { TROSKEL } from './forradsmal';
import { delade, fyll, kronikaBer, larFalt, loggBer, personFalt } from './berattelser';
import { kronika } from './historik';
import { ALDER, ageOf, alive, byId, count, living, log, stat, think } from './folk';
import { rnd } from './slump';
import { amountOf, use } from './lager';
import { SAKER, isTool } from './saker';
import { STATIONER, TILLBEHOR, framFri, isKlar, stationerOf, vidStation } from './stationer';
import { DORRAR, MATERIAL } from './byggnad';
import { tingOf } from './agande';
import { Act, HOUR, HOUR_S, MIN, Person, Skill, State, Task, inMap } from './typer';
import { balans } from './balans';
import { finnsKlyvStam } from './skog';
import { ACTS, ACT_LIST, forsokVad } from './handlingar';
import type { SamtalDef } from './samtal';
import { lartUt } from './relationer';
import { gudHandelse } from './religion';
import { notis } from './notiser';
import { TEKNAMN, gora, goraUtan, lista, och } from './ord';

// ---------- teknik ----------
// Ingen föds med kunskapen om hur man gör en yxa. Den som arbetar med något kommer så småningom på hur det kan göras
// bättre: ju nyfiknare, desto oftare funderar hen på det, och ju intelligentare, desto fortare går det. Det som kommits
// på kan var och en bara själv, tills hen lärt någon annan i samtal. Dör den som kan något utan att ha lärt ut det är
// kunskapen borta.
export interface Tek {
  id: string; namn: string; text: string; effekt: string;
  omr: Act[]; // arbete där man kommer på den
  krav: string[]; // teknik man måste kunna först
  niva: number; // 1 för grundnivån (inga krav), annars ett mer än det högsta den kräver (steg 2.12.9)
  // arbetstimmar för en person med medelmåttig nyfikenhet och intelligens. Mätt med npm run teknik, så att en by som gör
  // arbetet som vanligt kommer på tekniken inom TEKTAL.nivaDygn för nivån, räknat från när den blev öppen
  tid: number;
  // ju mer byn har gjort av något (statistiken stat), desto fortare kommer man på det: tiden delas med 1 + stat / per, högst
  // TEKTAL.okarMax gånger fortare (odlingen, steg 2.10.2)
  okar?: { stat: string; per: number };
  // det enda tillfälle då man kommer på den, i stället för arbetet i omr: systemet som har det tillfället anropar tankePa
  // (odlingen kommer man bara på när man plockar vilda frön, steg 2.10.11). Texten visas i teknikträdet
  nar?: string;
  // försöksplatsen (steg 4.2.1.1): nivå 4–5 kommer man bara på genom att pröva sig fram vid en station som redan finns
  // tidigare i kedjan (stationernas sorter i STATIONER; tom lista = elden). Den som prövar kan kraven och är skicklig i
  // färdigheten skill. Varje försök tar en hel sak av materialet och ger ingenting
  forsok?: { vid: string[]; skill: Skill; vad: string }; // vad: det den som prövar sig fram försöker komma på, efter "Försöker komma på" (steg 9.2.106)
  // det episka ögonblicket (steg 4.2.1.3): raden i krönikan när den första i byn kommer på den, med {namn} och {hen}
  episk?: string;
}
// trädet på bredden (steg 2.12.7, Björn efter v115): grillen efter slaktbänken, torkställningen efter grillen, hyllor och
// kistor efter bordet, metspöet efter träspjutet, skinndörren och skinnfällen efter skinnkläderna
export const TEKNIK: Tek[] = [
  { id: 'korg', namn: 'Korg', text: 'En korg flätad av hö.', effekt: 'Man bär hem mer från varje tur och spiller mindre bär.',
    omr: ['samla', 'hantverk'], krav: ['flatarbank'], niva: 3, tid: 9 }, // korgen flätas bara vid slöjdbänken
  { id: 'yxa', namn: 'Flintyxa', text: 'En vass flintsten bunden vid en pinne.', effekt: 'Med yxa kan man fälla träd och hugga trä.',
    omr: ['samla', 'ved', 'hantverk'], krav: [], niva: 1, tid: 5 },
  { id: 'fiskespjut', namn: 'Träspjut', text: 'En pinne som täljts spetsig med en flintsten eller en yxa.', effekt: 'Ger mycket mer fisk än händerna och hjälper på jakten, men slits fort.',
    omr: ['fiske', 'ved'], krav: [], niva: 1, tid: 7 },
  { id: 'rep', namn: 'Rep', text: 'Växtfibrer som tvinnas till rep på kvällen vid elden. Senor från slaktat vilt blir också rep.', effekt: 'Rep behövs till flintspjut och metspö.',
    omr: ['hantverk', 'samla'], krav: [], niva: 1, tid: 10 },
  { id: 'flintspjut', namn: 'Flintspjut', text: 'En flintspets som surras fast med rep vid en pinne.', effekt: 'Håller fyra gånger så länge som ett träspjut.',
    omr: ['fiske', 'jakt', 'hantverk'], krav: ['fiskespjut', 'rep'], niva: 2, tid: 16 },
  { id: 'stenhuggarplats', namn: 'Stenhuggarplats', text: 'En plats där stenen huggs till.', effekt: 'Där görs huggen sten.', omr: ['hantverk'], krav: ['yxa'], niva: 2, tid: 6 },
  { id: 'klyvplats', namn: 'Klyvplats', text: 'En plats där virket klyvs till plankor.', effekt: 'Där görs plankor.', omr: ['hantverk', 'bygga'], krav: ['yxa'], niva: 2, tid: 6 },
  { id: 'harden', namn: 'Härd', text: 'En fyrkant av huggna stenar på golvet, med ett rökhål i taket.', effekt: 'Härden värmer hela huset och drar mindre ved än lägerelden.', omr: ['bygga'], krav: ['stenhuggarplats', 'timmervagg'], niva: 3, tid: 6 },
  { id: 'ortkok', namn: 'Örtkök', text: 'En liten eld där man kokar och blandar örter, talg och annat.', effekt: 'Där görs salva, tjära, benlim och tvål.', omr: ['hantverk'], krav: ['flatarbank'], niva: 3, tid: 6 },
  { id: 'leksak', namn: 'Leksak', text: 'En träfigur, en boll av skinn eller en docka av halm.', effekt: 'Ett barn som har en leksak får färre utbrott.', omr: ['hantverk'], krav: ['kniv'], niva: 2, tid: 6 },
  { id: 'snara', namn: 'Snara', text: 'En böjd gren, ett rep och en spärr av ben.', effekt: 'Snaran fångar kaniner och fåglar medan ingen är där.', omr: ['jakt'], krav: ['fangstbank', 'rep'], niva: 4, tid: 6, forsok: { vid: ['fangstbank'], skill: 'jakt', vad: 'hur man binder en snara' }, episk: '{namn} band en snara som fångar medan ingen är där.' },
  { id: 'grop', namn: 'Fångstgrop', text: 'En täckt grop där större vilt faller ner.', effekt: 'Gropen fångar rådjur medan ingen är där.', omr: ['jakt'], krav: ['fangstbank'], niva: 4, tid: 6, forsok: { vid: ['fangstbank'], skill: 'jakt', vad: 'hur man gräver en fångstgrop' }, episk: '{namn} grävde en grop som det stora viltet faller ner i.' },
  { id: 'garvning', namn: 'Garvning', text: 'Skinnet hängs upp, skrapas och mjukas upp med talg.', effekt: 'Vid ställningen blir skinn och talg till läder.', omr: ['jakt', 'hantverk'], krav: ['kniv', 'skinnklader'], niva: 5, tid: 6, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur skinn blir till läder' }, episk: '{namn} kom på hur skinnet blir till läder.' },
  { id: 'lin', namn: 'Lin', text: 'Linfrön som sås på fälten, och skörden rötas innan den kan spinnas.', effekt: 'Byn kan odla lin.', omr: ['odla'], krav: ['odling'], niva: 2, tid: 6 },
  { id: 'slanda', namn: 'Slända', text: 'En pinne med en tyngd som snurrar linet till tråd.', effekt: 'Med sländan spinner man lintråd var som helst.', omr: ['hantverk'], krav: ['lin'], niva: 3, tid: 6 },
  { id: 'vavstol', namn: 'Vävstol', text: 'En ram med vävtyngder av sten.', effekt: 'Vid vävstolen vävs tråden till lintyg.', omr: ['hantverk'], krav: ['slanda'], niva: 4, tid: 6, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man väver tyg' }, episk: '{namn} band ihop en ram med tyngder av sten och vävde det första tyget.' },
  { id: 'fangstbank', namn: 'Fångstbänk', text: 'En bänk för fällor och burar.', effekt: 'Byn kan bygga en fångstbänk, där mjärdar och fällor görs.',
    omr: ['fiske', 'jakt'], krav: ['flatarbank', 'rep'], niva: 3, tid: 6 },
  { id: 'mjarde', namn: 'Mjärde', text: 'En flätad korg som fisken simmar in i men inte ut ur.', effekt: 'Mjärden sätts ut i vattnet och fångar fisk medan ingen är där.',
    omr: ['fiske'], krav: ['fangstbank'], niva: 4, tid: 6, forsok: { vid: ['fangstbank'], skill: 'fiske', vad: 'hur man flätar en mjärde' }, episk: '{namn} flätade en korg som fisken simmar in i men inte ut ur.' },
  { id: 'stockvag', namn: 'Stockväg', text: 'Stockar som läggs tätt tvärs över färdriktningen, som kavelbroarna över blöt mark.', effekt: 'Byn kan lägga en väg av virke på gångstråken. Den går inte fortare för folk, men vagnar kan gå på den.',
    omr: ['bygga'], krav: ['timmervagg'], niva: 3, tid: 6 },
  { id: 'brygga', namn: 'Brygga', text: 'Stockar på pålar ut i vattnet, där man kan stå och nå längre ut.', effekt: 'Byn kan bygga en brygga. Därifrån når man fisken längre ut, och vattnet är rent.',
    omr: ['bygga', 'fiske'], krav: ['stockvag'], niva: 4, tid: 6, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man bygger en brygga' }, episk: '{namn} gick längre ut än någon annan och satte en stock på pålar: byns första brygga.' },
  { id: 'metspo', namn: 'Metspö', text: 'Ett spö med ett rep och en krok av ben från slaktat vilt. Mask grävs fram och sätts på kroken.', effekt: 'Fisken nappar oftare och sitter kvar bättre än på spjutet.',
    omr: ['fiske'], krav: ['rep', 'fiskespjut'], niva: 2, tid: 4 },
  { id: 'kniv', namn: 'Flintkniv', text: 'En vass flintskärva med ett skaft av trä.', effekt: 'Med kniv slaktas vilt till mer kött, ben, skinn och senor.',
    omr: ['jakt', 'hantverk'], krav: [], niva: 1, tid: 6.5 },
  { id: 'timmervagg', namn: 'Timmerhus', text: 'Stockar som huggs till och läggs på varandra till en vägg, och trä som läggs som golv.', effekt: 'Byn kan bygga hus att sova i, med väggar och golv av trä.',
    omr: ['ved', 'falla', 'hugga', 'hantverk'], krav: ['yxa'], niva: 2, tid: 4 },
  // stationerna och möblerna är tekniker som byn måste komma på innan de kan byggas (steg 2.2.11); tekniken har samma id
  // som stationen i STATIONER (stationer.ts) och receptet är stationens material
  { id: 'slaktbank', namn: 'Slaktbänk', text: 'En kluven stock på ben, där viltet slaktas och fisken rensas.', effekt: 'Viltet slaktas och fisken rensas bara vid slaktbänken, och en kniv ligger kvar vid den.',
    omr: ['jakt', 'hantverk'], krav: ['kniv'], niva: 2, tid: 12 },
  { id: 'flatarbank', namn: 'Slöjdbänk', text: 'Två plankor på ben, med två stolpar och ett rep spänt emellan.', effekt: 'Vid bänken tvinnas rep dubbelt så fort, enkla redskap görs lite fortare, och korgar flätas bara där.',
    omr: ['hantverk'], krav: ['rep'], niva: 2, tid: 1 },
  { id: 'halmbadd', namn: 'Halmbädd', text: 'Hö som bäddas på en ram av grenar på golvet i huset.', effekt: 'Den som sover i en halmbädd vilar upp sig fortare.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg'], niva: 3, tid: 4 },
  // borden (steg 2.2.15): en teknik för alla tre storlekarna, med samma id som det minsta (bord i STATIONER)
  { id: 'bord', namn: 'Bord', text: 'Kluvna stockar på ben, med stubbar att sitta på runt omkring.', effekt: 'Vid bordet äter man tillsammans, blir glad av det och samtalar.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg'], niva: 3, tid: 4 },
  // förvaringen (steg 2.3.6): en teknik för hyllan, kistan och redskapsstället, med samma id som hyllan
  { id: 'hylla', namn: 'Hyllor och kistor', text: 'Hyllor och ställ av trä och rep i förrådshuset, och kistor i sovrummet för egna redskap och kläder.', effekt: 'Flera högar ryms på samma plats, så att lagret tar mindre plats. I kistan slits det som under tak.',
    omr: ['hantverk'], krav: ['rep', 'bord'], niva: 4, tid: 3.3, forsok: { vid: ['bord', 'bord2', 'bord3', 'flatarbank'], skill: 'hantverk', vad: 'hur man bygger hyllor och kistor' }, episk: '{Namn} hade byggt och rivit om och om igen vid bordet. Till sist stod den första hyllan, och den höll.' },
  // tillbehören till möblerna (TILLBEHOR i stationer.ts, steg 2.2.14) har också samma id som raden där
  { id: 'skinnfall', namn: 'Skinnfäll', text: 'Skinn som sys ihop till ett täcke och läggs i halmbädden.', effekt: 'Den som sover under en skinnfäll fryser mindre.',
    omr: ['hantverk', 'jakt'], krav: ['halmbadd', 'skinnklader'], niva: 5, tid: 16, forsok: { vid: ['halmbadd', 'flatarbank'], skill: 'hantverk', vad: 'hur man syr en skinnfäll' }, episk: 'Natt efter natt sydde {namn} skinn mot skinn, tills den första fällen var varm nog att sova under.' },
  // dörrarna (DORRAR i byggnad.ts, steg 2.2.16) har också samma id som raden där
  { id: 'skinndorr', namn: 'Skinndörr', text: 'En hud som hängs i dörröppningen.', effekt: 'Huset släpper ut mindre värme genom dörren.',
    omr: ['bygga', 'hantverk'], krav: ['timmervagg', 'skinnklader'], niva: 5, tid: 6.7, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man gör en dörr av skinn' }, episk: '{Namn} hängde hud efter hud i dörröppningen innan {hen} fick den att sluta tätt. Den kvällen stannade värmen kvar i huset.' },
  { id: 'tradorr', namn: 'Trädörr', text: 'Kluvna bräder som surras ihop med rep och hängs i dörröppningen.', effekt: 'Huset håller värmen bättre, och dörren stängs när någon gömmer sig för vargarna.',
    omr: ['bygga', 'hantverk'], krav: ['timmervagg', 'rep'], niva: 3, tid: 4 },
  // kläderna (steg 2.3.2): bensylen slipas av ett ben och läggs vid slöjdbänken, och med den sys kläderna där
  { id: 'bensyl', namn: 'Bensyl', text: 'Ett vasst ben som slipas mot en sten eller en flinta.', effekt: 'Med bensylen vid slöjdbänken kan man sy skinn.',
    omr: ['hantverk'], krav: ['flatarbank', 'kniv'], niva: 3, tid: 4.2 },
  { id: 'skinnklader', namn: 'Skinnkläder', text: 'Skinn som sys ihop med rep av senor till en rock och ett par skor.', effekt: 'Den som har kläderna på sig fryser mindre.',
    omr: ['hantverk', 'jakt'], krav: ['bensyl'], niva: 4, tid: 14, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man syr kläder av skinn' }, episk: 'Efter många förstörda skinn vid slöjdbänken drog {namn} på sig den första rock som byn hade sett.' },
  // vattensäcken (steg 2.10.1): sys av skinn som kläderna. Man kommer på den när man ger vatten åt den som inte kan gå
  { id: 'fackla', namn: 'Fackla', text: 'En käpp som klyvs i toppen, med torrt gräs och talg i klykan.', effekt: 'Den som går ut i mörkret tänder en fackla vid elden och ser vart den går.',
    omr: ['jakt', 'hantverk'], krav: ['slaktbank'], niva: 3, tid: 4 },
  { id: 'vattensack', namn: 'Vattensäck', text: 'Ett skinn som sys ihop till en säck och knyts med rep.', effekt: 'Man kan bära vatten till den som inte kan gå till vattnet.',
    omr: ['hantverk', 'dricka', 'varda'], krav: ['skinnklader'], niva: 5, tid: 5.4, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man syr en säck som håller vatten' }, episk: 'Vattnet rann ut genom varje söm {namn} sydde. Men till sist höll säcken tätt, och {hen} bar vatten utan att spilla en droppe.' },
  // bältet (steg 2.3.3): kommer man på när man bär hem både redskap och börda, ganska tidigt
  { id: 'balte', namn: 'Bälte', text: 'Ett rep som flätas till ett bälte runt midjan.', effekt: 'Redskapet hänger i bältet när man bär hem, så båda händerna är fria och man bär mer.',
    omr: ['ved', 'samla', 'fiske', 'hantverk'], krav: ['rep'], niva: 2, tid: 11 },
  { id: 'axelrem', namn: 'Axelrem', text: 'En rem av skinn och rep som hängs över axeln.', effekt: 'Spjutet, metspöt och vattensäcken hänger på axeln när man bär hem, så båda händerna är fria.', // steg 7.1.2
    omr: ['jakt', 'fiske', 'hantverk'], krav: ['skinnklader', 'balte'], niva: 5, tid: 5.4, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man gör en axelrem' },
    episk: 'Remmen gled av axeln varje gång {namn} böjde sig. Men till sist satt den, och {hen} bar hem med båda händerna fria.' },
  // ryggsäcken (steg 7.1.3): kommer man på när man ofta går hem med en full korg
  { id: 'ryggsack', namn: 'Ryggsäck', text: 'En säck av skinn med remmar av rep som bärs på ryggen.', effekt: 'Den som samlar plockar rakt ner i den, har båda händerna fria och bär dubbelt så mycket hem.',
    omr: ['samla', 'hantverk'], krav: ['korg', 'skinnklader'], niva: 5, tid: 5.4, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man syr en ryggsäck' },
    episk: 'Säcken sprack i sömmarna gång på gång. Men {namn} sydde om den tills den höll, och {hen} bar hem dubbelt så mycket.' },
  // sportens föremål (steg 4.3.1.2, sport.ts): man kommer på dem när man spelar
  { id: 'mal', namn: 'Mål', text: 'En ring av grenar som binds med rep och ställs upp i byn.', effekt: 'Man tävlar i att kasta mot målet.',
    omr: ['sport', 'hantverk'], krav: ['rep'], niva: 2, tid: 4 },
  { id: 'boll', namn: 'Boll', text: 'Ett skinn som sys ihop runt en näve hö.', effekt: 'Med bollen och ett slagträ spelar man bollspel.',
    omr: ['sport', 'hantverk'], krav: ['kniv'], niva: 2, tid: 4 },
  { id: 'slagtra', namn: 'Slagträ', text: 'Ett stycke trä som täljs till ett grepp och en bred ände.', effekt: 'Med slagträet och en boll spelar man bollspel.',
    omr: ['sport', 'hantverk'], krav: ['kniv'], niva: 2, tid: 3 },
  // scenen och instrumenten (steg 4.3.2.2, framtradande.ts): man kommer på dem när man uppträder
  { id: 'scen', namn: 'Scen', text: 'Ett golv av kluvna stockar en bit från elden, där den som uppträder syns för alla.', effekt: 'Vid scenen ligger byns instrument, och där blir det sång och musik.',
    omr: ['upptrada'], krav: ['rep'], niva: 2, tid: 4 },
  { id: 'trumma', namn: 'Trumma', text: 'Ett skinn som spänns över en ring av trä.', effekt: 'Med trumman vid scenen kan man sjunga och spela.',
    omr: ['upptrada', 'hantverk'], krav: ['kniv'], niva: 2, tid: 4 },
  { id: 'benflojt', namn: 'Benflöjt', text: 'Ett ihåligt ben med hål att blåsa och sätta fingrarna på.', effekt: 'Med benflöjten vid scenen kan man spela.',
    omr: ['upptrada', 'hantverk'], krav: ['kniv'], niva: 2, tid: 4 },
  { id: 'lyra', namn: 'Lyra', text: 'En ram av trä med strängar av rep som man knäpper på.', effekt: 'Sången och musiken till lyran gör publiken gladare än med andra instrument.',
    omr: ['upptrada', 'hantverk'], krav: ['scen', 'rep'], niva: 3, tid: 6 },
  // pyntet (steg 4.3.4, pynt.ts): lerkrukan, bonaden och det snidade väggbrädet i rummet där man sover; varje möbel är sin egen teknik
  { id: 'kruka', namn: 'Lerkruka', text: 'En kruka av lera från stranden, formad för hand och bränd i elden, bara för att vara vacker.', effekt: 'Den som tycker om krukor ställer en där den sover, trivs där, och de som ser den tycker bättre om ägaren.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg'], niva: 3, tid: 4 },
  { id: 'bonad', namn: 'Bonad', text: 'Ett skinn som hängs på väggen, med mönster och fransar av rep.', effekt: 'Den som tycker om bonader hänger en där den sover, trivs där, och de som ser den tycker bättre om ägaren.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg', 'rep'], niva: 3, tid: 4 },
  { id: 'vaggbrade', namn: 'Snidat väggbräde', text: 'Ett bräde med snidade mönster som sätts upp på väggen.', effekt: 'Den som tycker om väggbräden sätter upp ett där den sover, trivs där, och de som ser det tycker bättre om ägaren.',
    omr: ['hantverk', 'bygga'], krav: ['timmervagg', 'kniv'], niva: 3, tid: 4 },
  // latrinen och benspaden (steg 2.7.2): spaden görs av ben, rep och en gren vid slöjdbänken, och med den grävs latrinen
  // (LATRIN i STATIONER, samma id) och rötterna fortare
  { id: 'benspade', namn: 'Benspade', text: 'Tre ben bredvid varandra som ett blad, surrade med rep vid en gren som skaft.', effekt: 'Med spaden gräver man fram rötter fortare, och gropar.',
    omr: ['hantverk', 'samla'], krav: ['slaktbank', 'rep'], niva: 3, tid: 5 },
  { id: 'latrin', namn: 'Latrin', text: 'En grop i byns utkant, grävd med benspaden.', effekt: 'Man går på toa på ett ställe, närmare än förut, och lämnar ingen smuts efter sig. Gropen fylls och måste ersättas.',
    omr: ['toa', 'hantverk', 'bygga'], krav: ['benspade'], niva: 4, tid: 9, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man gräver en latrin' }, episk: '{Namn} grävde och fyllde igen, grop efter grop, innan {hen} visste var och hur djupt. Byn fick sin första latrin.' },
  // grillställningen (steg 2.8.1, matlagning.ts; grill i STATIONER, samma id)
  { id: 'grill', namn: 'Grillställning', text: 'Två grenar med en klyka var på var sin sida om elden, och ett spett med vev som vilar i klykorna, surrat med rep.', effekt: 'Kött och fisk grillas över elden. Den grillade maten håller längre, och den som äter den blir inte sjuk av rått kött.',
    omr: ['hantverk', 'slakta', 'rensa', 'fiske'], krav: ['rep', 'slaktbank'], niva: 3, tid: 5.4 },
  // torkställningen (steg 2.8.2, matlagning.ts; tork i STATIONER, samma id)
  { id: 'tork', namn: 'Torkställning', text: 'Två A av korsade grenar som bär en lång slå, surrade med rep. På slån hänger köttet i remsor och fisken i stjärten.', effekt: 'Det kött och den fisk som byn inte hinner äta torkar på fem dygn och håller sedan länge i lagret.',
    omr: ['hantverk', 'slakta', 'rensa', 'fiske'], krav: ['rep', 'grill'], niva: 4, tid: 14, forsok: { vid: ['grill'], skill: 'matlagning', vad: 'hur man torkar kött och fisk' }, episk: 'Gång på gång brann köttet eller ruttnade vid grillen. Men en morgon hängde de första remsorna torra och goda på {namn}s slå.' },
  // odlingen (steg 2.10.2, odling.ts): kommer man bara på när man plockar vilda frön (froFynd), fortare ju fler vilda frön
  // byn plockat; det krävs inte så många (Björn efter v107, steg 2.10.11)
  { id: 'odling', namn: 'Odling', text: 'Frön som sätts i jorden blir nya grödor.', effekt: 'Man kan så frön på ett fält och skörda grödorna.',
    omr: ['samla'], krav: [], niva: 1, tid: 0.15, okar: { stat: 'vildgrodor', per: 5 }, nar: 'plockar vilda frön' },
  // skogsvården (steg 6.5.2, skogsvard.ts): kommer man på när man fäller träd långt från byn
  { id: 'skogsvard', namn: 'Skogsvård', text: 'Att gräva upp en planta som står i skuggan och sätta den där skogen behövs.', effekt: 'Man kan flytta plantor närmare byn, så att skogen växer tillbaka där den fällts.',
    omr: [], krav: ['yxa'], niva: 2, tid: 0.5, nar: 'fäller träd långt från byn' },
  // ledarskapet kommer man på i samtal (steg 3.5.1, styre.ts): bara den som kan det kan bli byns ledare
  { id: 'ledarskap', namn: 'Ledarskap', text: 'Att förstå vad som krävs för att byn ska lyssna på en: att höra alla, döma rättvist och tänka på hela byn.', effekt: 'Bara den som kan ledarskap kan bli byns ledare.',
    omr: [], krav: [], niva: 1, tid: 12, nar: 'i samtal' },
  // vapnen och rustningen (system 8.7): kommer man på vid slöjdbänken
  { id: 'rustning', namn: 'Läderrustning', text: 'Tjockt läder som tar emot det vassa.', effekt: 'Rustningen och hjälmen skyddar i striden.', omr: ['hantverk'], krav: ['skinnklader'], niva: 5, tid: 10, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man gör en rustning av läder' }, episk: '{Namn} sydde läder i lager tills det höll för en kniv.' },
  { id: 'skold', namn: 'Sköld', text: 'Ved och rep som man håller framför sig.', effekt: 'Skölden tar emot slag och pilar.', omr: ['hantverk'], krav: ['yxa'], niva: 2, tid: 10 },
  { id: 'bage', namn: 'Pilbåge', text: 'En böjd stav och ett spänt rep, och pilar av ved och flinta.', effekt: 'Bågen når långt.', omr: ['hantverk', 'jakt'], krav: ['kniv'], niva: 2, tid: 10 },
  { id: 'slunga', namn: 'Slunga', text: 'En läderrem som kastar stenar långt.', effekt: 'Slungan kastar stenar långt.', omr: ['hantverk', 'jakt'], krav: ['skinnklader'], niva: 5, tid: 8, forsok: { vid: ['flatarbank'], skill: 'hantverk', vad: 'hur man gör en slunga' }, episk: '{Namn} snurrade läderremmen, och stenen for över sjön.' },
  { id: 'horn', namn: 'Horn', text: 'Ett urholkat ben som ljuder långt.', effekt: 'Hornet hörs över hela kartan, och trumman längre än ett rop.', omr: ['hantverk'], krav: ['kniv'], niva: 2, tid: 8 },
  // lagarna (steg 8.4.1): samma mönster som Ledarskap. Bara den som kan den kan stifta en lag, så en by kan glömma sina lagar
  { id: 'lag', namn: 'Lag', text: 'Att bestämma i förväg vad som är fel och vad det kostar, så att det blir likadant varje gång.', effekt: 'Den som kan lag kan lägga fram en lag.', omr: [], krav: ['ledarskap'], niva: 2, tid: 14, nar: 'i samtal' },
];
for (const t of TEKNIK) TEKNAMN[t.namn.toLowerCase()] = t.id; // ordlagret hittar verbet efter namnet (ord.ts)
export const TEK = Object.fromEntries(TEKNIK.map(t => [t.id, t])) as Record<string, Tek>;
for (const t of TEKNIK) if (t.forsok) forsokVad[t.id] = t.forsok.vad;

// Balanstal (regel 8): hur fort man kommer på något står i raden för tekniken (`tid`, arbetstimmar), och här vad det ger och hur man lär ut
// det. Åldrarna för att komma på och lära sig tekniker står i ALDER (folk.ts)
export const TEKTAL = balans('teknik', {
  materialMin: 1, // materialet till en teknik räknas finnas i byn när det är minst så här mycket (ett redskap räknas om det finns)
  kommaPa: 0.15, // den som kommer på något mår så här mycket bättre ...
  kommaPaTim: 12, // ... i så här många timmar
  larChansBra: 0.5, // chansen att den som kan något lär ut det i ett samtal: i en berättelse eller ett djupt samtal (lar i SAMTALSSLAG, samtal.ts) ...
  larChans: 0.2, // ... och i andra samtal
  larFramsteg: 0.2, // den som lyssnar kommer så här långt (av 1) mot tekniken i ett samtal, gånger larBas + intelligens / 20
  larBas: 0.5,
  okarMax: 3, // en teknik med `okar` kommer man på högst så här många gånger fortare
  // dygn (år i spelet) från att en teknik blivit öppen (kraven kan man och materialet finns) tills en by som gör arbetet som
  // vanligt kommer på den, för nivå 1, 2, 3 …: grundnivån inom ett par dygn och senare nivåer några dygn till (Björn efter
  // v115, steg 2.12.9). Tiderna (tid i raderna) mäts fram mot dem med npm run teknik
  nivaDygn: [2, 3, 4, 5, 6],
  // experimenten (steg 4.2.1.1): den som prövar sig fram har minst så här mycket i färdigheten (forsok i raden) ...
  forsokSkill: 4,
  forsokMin: 90, // ... ett försök tar så här många minuter och tar en hel sak av materialet
  forsokChans: 0.3, // chansen att den skicklige prövar sig fram i stället för annat handarbete, för en medelmåttigt nyfiken i en by utan sed åt något håll ...
  forsokSed: 0.5, // ... gånger 1 + seden Förnyelse – Tradition (-1 till 1) gånger så här mycket, och gånger nyfikenheten / 10 (steg 4.2.1.2)
  // spridningen efter nivå (steg 4.2.3): i samtal lärs bara det upp till den här nivån ...
  larNiva: 2,
  bredvidAvst: 3, // ... nivå 3 lär man sig av den som arbetar med samma sak inom så här många rutor ...
  bredvidTim: 8, // ... efter så här många timmar bredvid (gånger larBas + intelligens / 20, som i samtal) ...
  laraMin: 15, // lärlingen går till mästaren när hen arbetar med tekniken och har minst så här många minuter kvar ...
  laraMax: 120, // ... och stannar högst så här många minuter
  laraSida: 0.6, // ... och sitter så här många rutor vid sidan av hen
  // ... och nivå 4–5 bara som lärling: lärlingen kan det efter så här många timmar av sitt eget arbete med det tekniken hör till,
  // medan mästaren lever i byn (gånger larBas + intelligens / 20). Ungefär 4 dygn (förslag 3–5 dygn, mäts och balanseras i 4.5)
  larlingTim: 10,
});

export const knows = (p: Person, id: string) => (p.tek?.[id] ?? 0) >= 1;
// finns saken i byn: ett redskap räknas om det finns, hur slitet det än är; annat räknas i mängd
// virket (steg 4.5.5.2) räknas som till hands när det kan klyvas: en fälld stam och en yxa i byn; annars kluvs det aldrig innan någon kan en teknik som behöver det
export const harSak = (s: State, k: string) => isTool(k) ? tingOf(s).some(q => q.k === k) : amountOf(s, k) >= TEKTAL.materialMin || (k === 'virke' && finnsKlyvStam(s) && tingOf(s).some(q => q.k === 'yxa'));
// det som måste finnas i byn för att man ska komma på tekniken: en av sakerna i varje grupp. Det räknas ur receptet
// (steg 2.12.5): det som har samma id som tekniken (en sak, station, ett tillbehör eller en dörr), annars det första
// redskapet eller väggmaterialet som tekniken ger. Varje sak i receptet är en grupp, och verktygen (ett av dem räcker) en
export const recept = (id: string): { av: Record<string, number>; verktyg: string[] } | undefined => {
  const sak = SAKER[id]?.skaffa ?? Object.values(SAKER).find(d => d?.redskap && d.skaffa?.tek === id)?.skaffa;
  if (sak?.av) return { av: sak.av, verktyg: Object.keys(sak.verktyg ?? {}) };
  const st = (STATIONER as Record<string, { av: Record<string, number>; verktyg?: string }>)[id] ?? (TILLBEHOR as Record<string, { av: Record<string, number> }>)[id] ?? (DORRAR as Record<string, { av: Record<string, number> }>)[id];
  if (st) return { av: st.av, verktyg: 'verktyg' in st && st.verktyg ? [st.verktyg] : [] };
  const m = Object.values(MATERIAL).find(d => d.tek === id && d.item);
  return m?.item ? { av: { [m.item]: m.n }, verktyg: [] } : undefined;
};
const MAT: Record<string, string[][]> = {};
export const materialOf = (t: Tek) => MAT[t.id] ??= (r => r ? [...Object.keys(r.av).map(k => [k]), ...(r.verktyg.length ? [r.verktyg] : [])] : [])(recept(t.id));
export const hasMaterial = (s: State, t: Tek) => materialOf(t).every(g => g.some(k => harSak(s, k)));
export const canThink = (p: Person, t: Tek) => !knows(p, t.id) && t.krav.every(k => knows(p, k));

// den som kommer på eller lär sig något
export function learn(s: State, p: Person, t: Tek, from?: Person) {
  p.tek![t.id] = 1;
  if (p.lar?.tek === t.id) p.lar = undefined; // lärlingen har lärt sig klart och kan själv bli mästare
  if (p.halvminne) { p.halvminne = p.halvminne.filter(k => k !== t.id); if (!p.halvminne.length) p.halvminne = undefined; }
  if (from) { personHand(s, p, 'lart', `Lärde sig ${gora(t)} av ${from.name}.`); loggBer(s, 'l_lart', p.id * 997 + from.id, { ...larFalt(s, p), av: from.name, lara: goraUtan(t) }, 'skill', [p.id, from.id], { slag: 'lar', k: p.id, n: p.name, d: `${from.name}|${gora(t)}` }); return; }
  const first = !s.people.some(q => q !== p && knows(q, t.id)) && !(s.stat?.['tek_' + t.id]);
  count(s, 'tek_' + t.id);
  // nivå 4–5: det episka ögonblicket, en egen rad per teknik (steg 4.2.1.3); annars en berättelse ur mallen
  if (first && t.episk) kronika(s, fyll(t.episk, personFalt(p)), 'episk');
  else if (first) kronikaBer(s, 'k_uppfann', p.id, { ...personFalt(p), teknik: t.namn.toLowerCase(), lara: goraUtan(t) });
  log(s, `${p.name} kom på hur man kan ${goraUtan(t)}. ${t.effekt}`, 'skill', [p.id]);
  personHand(s, p, 'lart', `Kom på hur man kan ${goraUtan(t)}.`); // steg 9.2.107
  if (first) notis(s, 'teknik', `${p.name} kom på hur man kan ${goraUtan(t)}. ${t.effekt}`, [p.id]);
  think(p, `Kom på hur man kan ${goraUtan(t)}`, TEKTAL.kommaPa, s.now, TEKTAL.kommaPaTim * HOUR);
  if (first) { p.fame.push(`Uppfann ${t.namn.toLowerCase()}`); allaBarn(s, 'uppfinning', `lärde sig ${gora(t)}`); upplev(s, p, 'egenTeknik', `hur man kan ${goraUtan(t)}`); gudHandelse(s, 'hantverk', `konsten ${gora(t)}, som ${p.name} kom på`); }
}

// arbete för tankarna framåt mot det som hör till arbetet (omr). Hantverk (slag hantverk i handlingar.ts: att tvinna rep,
// fläta en korg, göra ett redskap) räknas som hantverk, utom det som själv står i någon tekniks omr: att slakta och rensa
// ger bara idéer till de tekniker som nämner dem (grillen och torkställningen). Andra handlingar ger inga idéer
const OMR = new Set(TEKNIK.flatMap(t => t.omr));
const HANTVERK = new Set(ACT_LIST.filter(a => ACTS[a].slag === 'hantverk'));
const omrAv = (act: Act): Act => HANTVERK.has(act) ? 'hantverk' : act;
export function thinkWhileWorking(s: State, p: Person, act0: Act, dtSec: number) {
  const act = OMR.has(act0) ? act0 : omrAv(act0);
  if (!OMR.has(act) || ageOf(p, s.now) < ALDER.uppfinner) return;
  for (const t of TEKNIK) if (!t.nar && !t.forsok && t.omr.includes(act)) framat(s, p, t, dtSec); // nivå 4–5 bara genom försök (steg 4.2.1.1)
}
// tillfället i nar (raden i TEKNIK): p tänker på tekniken id i dtSec sekunder
export function tankePa(s: State, p: Person, id: string, dtSec: number) {
  if (ageOf(p, s.now) >= ALDER.uppfinner) framat(s, p, TEK[id], dtSec);
}
function framat(s: State, p: Person, t: Tek, dtSec: number) {
  if (!canThink(p, t) || !hasMaterial(s, t)) return;
  const nyf = stat(p, 'nyfikenhet', s.now) / 10, intel = stat(p, 'intelligens', s.now) / 10;
  p.tek ??= {};
  // arbetstimmarna medan tekniken är öppen och ingen i byn kommit på den än (npm run teknik, steg 2.12.9)
  if (!s.stat?.['tek_' + t.id]) count(s, 'tekTim_' + t.id, dtSec / HOUR_S);
  const okar = t.okar ? Math.min(TEKTAL.okarMax, 1 + (s.stat?.[t.okar.stat] ?? 0) / t.okar.per) : 1;
  const d = Math.min(1 - (p.tek[t.id] ?? 0), dtSec / HOUR_S / t.tid * nyf * intel * okar);
  p.tek[t.id] = (p.tek[t.id] ?? 0) + d; count(s, 'tekTankt', d);
  if (p.tek[t.id] >= 1) learn(s, p, t);
}

// ---------- experimenten (steg 4.2.1.1) ----------
// Det nya kommer man inte på av sig själv i det vanliga arbetet: den skicklige prövar sig fram vid en station som redan finns.
// Försöket tar en hel sak av materialet och ger ingenting, men för hen närmare tekniken (som framat, räknat i försökstimmar)
const stationForsok = (s: State, t: Tek) => stationerOf(s).find(q => t.forsok!.vid.includes(q.k) && isKlar(q) && framFri(s, q));
// det i receptet som går åt i ett försök: sakerna, inte verktygen
const forbrukas = (t: Tek) => Object.keys(recept(t.id)?.av ?? {}).filter(k => !isTool(k));
const kanForsoka = (s: State, p: Person, t: Tek) => !!t.forsok && ageOf(p, s.now) >= ALDER.uppfinner && canThink(p, t) && hasMaterial(s, t)
  && p.skill[t.forsok.skill] >= TEKTAL.forsokSkill && (r => !r.length || r.some(k => amountOf(s, k) >= 1))(forbrukas(t)) && (!t.forsok.vid.length || !!stationForsok(s, t));
// hur ofta (steg 4.2.1.2): sedvanan mot nya sätt (seden nyfikenhet, Förnyelse – Tradition) och personens nyfikenhet. Bara när
// byn har ett överskott av mat och ved (matDygn, vedDygn); farorna avgörs i valet (val.ts), där de går före
export const forsokChans = (s: State, p: Person, matDygn: number, vedDygn: number) => matDygn < TROSKEL.forsokMat || vedDygn < TROSKEL.forsokVed ? 0
  : TEKTAL.forsokChans * Math.max(0, 1 + (s.seder?.v.nyfikenhet ?? 0) * TEKTAL.forsokSed) * stat(p, 'nyfikenhet', s.now) / 10;
// vad p kan pröva sig fram till nu, och var: den teknik hen kommit längst mot (så att försöken samlas på en sak)
export function forsokVal(s: State, p: Person): { id: string; spot?: { x: number; y: number }; min: number } | undefined {
  let bast: Tek | undefined;
  for (const t of TEKNIK) if (kanForsoka(s, p, t) && (!bast || (p.tek?.[t.id] ?? 0) > (p.tek?.[bast.id] ?? 0))) bast = t;
  if (!bast) return undefined;
  const st = bast.forsok!.vid.length ? stationForsok(s, bast) : undefined;
  return { id: bast.id, spot: st && vidStation(st), min: TEKTAL.forsokMin };
}
export function forsokSteg(s: State, p: Person, tk: Task, dtSec: number) {
  const t = tk.tool ? TEK[tk.tool] : undefined;
  if (!t?.forsok) return;
  if (!canThink(p, t)) { tk.until = Math.min(tk.until, s.now); return; } // hen kan det redan (någon lärde hen under tiden): försöket slutar
  count(s, 'forsokTim', dtSec / HOUR_S);
  framat(s, p, t, dtSec);
}
export function forsokKlar(s: State, p: Person, tk: Task) {
  const t = tk.tool ? TEK[tk.tool] : undefined;
  if (!t?.forsok) return;
  const kan = forbrukas(t).filter(k => amountOf(s, k) >= 1);
  if (kan.length) use(s, p, kan[Math.floor(rnd(s, 'kunskap', p) * kan.length)], 1); // materialet går åt, och inget blir kvar (latrinen tar inget: en grop som grävs igen)
  count(s, 'forsok'); count(s, 'forsok_' + t.id);
}

// Förbättra är aldrig tom (steg 6.1.18): det arbete där p kan komma på en öppen teknik (kraven kan hen, materialet finns), den
// hen kommit längst mot. Bara arbete som ok godtar (det vanliga arbetet i val.ts); inte tekniker med ett eget tillfälle (nar)
// eller som bara kommer av försök
export function tekArbete(s: State, p: Person, ok: (a: Act) => boolean): { act: Act; t: Tek } | undefined {
  let bast: { act: Act; t: Tek } | undefined;
  for (const t of TEKNIK) {
    if (t.nar || t.forsok || !canThink(p, t) || !hasMaterial(s, t)) continue;
    const act = t.omr.find(ok);
    if (act && (!bast || (p.tek?.[t.id] ?? 0) > (p.tek?.[bast.t.id] ?? 0))) bast = { act, t };
  }
  return bast;
}

// i samtal lär den som kan något ut det, och den som lyssnar lär sig fortare ju intelligentare hen är
export function teach(s: State, a: Person, b: Person, slag: SamtalDef, mer = 1) { // mer: mentorn lär ut mer (relationer.ts)
  if (!a.tek || ageOf(b, s.now) < ALDER.lar) return;
  for (const t of TEKNIK) {
    if (t.niva > TEKTAL.larNiva || !knows(a, t.id) || knows(b, t.id) || !t.krav.every(k => knows(b, k))) continue; // nivå 3 och uppåt lärs inte i prat (steg 4.2.3.1)
    if (rnd(s, 'kunskap', a) > TEKTAL[slag.lar ?? 'larChans'] * mer) continue;
    lartUt(s, a, b);
    delade('teknik', t.id, t.namn.toLowerCase()); // samtalets ämne (steg 3.9.5)
    b.tek ??= {};
    const d = Math.min(1 - (b.tek[t.id] ?? 0), TEKTAL.larFramsteg * (TEKTAL.larBas + stat(b, 'intelligens', s.now) / 20));
    b.tek[t.id] = (b.tek[t.id] ?? 0) + d; count(s, 'tekLart', d);
    if (b.tek[t.id] >= 1) learn(s, b, t, a);
  }
}

// ---------- att arbeta bredvid och lärlingen (steg 4.2.3.2–4.2.3.4) ----------
// Nivå 3 lär man sig av den som kan och arbetar med samma sak nära en. Nivå 4–5 bara som lärling hos en mästare: den som kan
// tekniken (den som kom på den är den första) har en lärling i taget. Lärlingen lär sig i sitt arbete med det tekniken hör till
// så länge mästaren lever i byn, och går till mästaren och arbetar bredvid när hen arbetar med det (laraVal)
const BREDVID = TEKNIK.filter(t => t.niva >= 3 && !t.nar);
const arbetarMed = (q: Person, t: Tek) => q.task?.phase === 'do' && t.omr.includes(omrAv(q.task.act));
const nara = (p: Person, q: Person) => Math.hypot(p.x - q.x, p.y - q.y) <= TEKTAL.bredvidAvst;
export function arbetaBredvid(s: State, p: Person, tk: Task, dtSec: number) {
  if (tk.phase !== 'do' || ageOf(p, s.now) < ALDER.lar) return;
  const act = OMR.has(tk.act) ? tk.act : omrAv(tk.act);
  for (const t of BREDVID) {
    if (!t.omr.includes(act) || !canThink(p, t)) continue;
    const mastare = t.niva >= 4;
    if (mastare && p.lar?.tek !== t.id) continue;
    const m = mastare ? byId(s, p.lar!.av) : undefined;
    const vid = mastare ? (m && alive(m) ? m : undefined)
      : s.people.find(q => q !== p && alive(q) && knows(q, t.id) && arbetarMed(q, t) && nara(p, q));
    if (!vid) continue;
    p.tek ??= {};
    const d = Math.min(1 - (p.tek[t.id] ?? 0), dtSec / HOUR_S / (mastare ? TEKTAL.larlingTim : TEKTAL.bredvidTim) * (TEKTAL.larBas + stat(p, 'intelligens', s.now) / 20));
    p.tek[t.id] = (p.tek[t.id] ?? 0) + d; count(s, mastare ? 'tekLarling' : 'tekBredvid', d);
    if (p.tek[t.id] >= 1) { learn(s, p, t, vid); if (mastare) count(s, 'larlingKlar'); }
  }
}
// lärlingen går till mästaren när hen arbetar med tekniken (valet i val.ts) och arbetar bredvid så länge mästaren håller på
export function laraVal(s: State, p: Person): { m: Person; spot: { x: number; y: number }; min: number } | undefined {
  if (!p.lar) return undefined;
  const m = byId(s, p.lar.av), t = TEK[p.lar.tek];
  if (!m || !alive(m) || !m.task || !arbetarMed(m, t)) return undefined;
  const kvar = (m.task.until - s.now) / MIN;
  if (kvar < TEKTAL.laraMin) return undefined;
  const x = inMap(m.x + TEKTAL.laraSida, m.y) ? m.x + TEKTAL.laraSida : m.x - TEKTAL.laraSida; // bredvid mästaren, på andra sidan vid kartans kant
  return { m, spot: { x, y: m.y }, min: Math.min(kvar, TEKTAL.laraMax) };
}
// varje timme: en mästare utan lärling tar sig en. Hen lär ut den av sina tekniker som färst kan, till den som är skickligast
// i färdigheten och har kommit längst (kraven ska hen kunna). Den som redan är lärling hos någon väljs inte
export function stepLarlingar(s: State) {
  const ppl = living(s);
  for (const p of ppl) if (p.lar && !ppl.some(m => m.id === p.lar!.av)) halvminne(s, p); // mästaren har flyttat
  for (const m of ppl) {
    if (ageOf(m, s.now) < ALDER.uppfinner || ppl.some(q => q.lar?.av === m.id)) continue;
    const tek = TEKNIK.filter(t => t.niva >= 4 && knows(m, t.id)).sort((a, b) => ppl.filter(q => knows(q, a.id)).length - ppl.filter(q => knows(q, b.id)).length);
    for (const t of tek) {
      const sk = t.forsok?.skill ?? 'hantverk', poang = (q: Person) => q.skill[sk] + (q.tek?.[t.id] ?? 0) * 10;
      const c = ppl.filter(q => q !== m && !q.lar && ageOf(q, s.now) >= ALDER.uppfinner && canThink(q, t)).sort((a, b) => poang(b) - poang(a) || a.id - b.id)[0];
      if (!c) continue;
      c.lar = { av: m.id, tek: t.id }; count(s, 'larling');
      log(s, `${c.name} blev lärling hos ${m.name} för att lära sig ${goraUtan(t)}.`, 'skill', [c.id, m.id]);
      break;
    }
  }
}
// lärlingen som miste sin mästare innan hen lärt sig klart: det hen hunnit lära sig blir ett halvminne, som gör det lättare att
// komma på det igen genom försök eller att lära sig klart hos en annan mästare
function halvminne(s: State, p: Person) {
  const id = p.lar!.tek; p.lar = undefined;
  if ((p.tek?.[id] ?? 0) > 0) { (p.halvminne ??= []).includes(id) || p.halvminne.push(id); count(s, 'halvminne'); }
}
// när någon dör (die i liv.ts): lärlingen får ett halvminne, och det som ingen annan i byn kan nu skrivs i krönikan som förlorat
export function kunskapDod(s: State, p: Person) {
  const ppl = living(s);
  const larling = ppl.filter(q => q.lar?.av === p.id), borta = TEKNIK.filter(t => knows(p, t.id) && !ppl.some(q => knows(q, t.id)));
  const halv = larling.filter(q => borta.some(t => t.id === q.lar!.tek) && (q.tek?.[q.lar!.tek] ?? 0) > 0);
  for (const q of larling) halvminne(s, q);
  if (!ppl.length || !borta.length) return; // byn dör ut, eller någon annan kan det
  count(s, 'tekForlorad', borta.length);
  const konst = och(borta.map(t => gora(t))); // "att odla och att leda byn"
  kronika(s, `Med ${p.name} dog konsten ${konst}.${halv.length ? ` ${lista(halv.map(q => q.name))} hade inte lärt sig klart och minns det bara till hälften.` : ''}`, 'forlust');
}

// äldre sparfiler: den som redan gjort yxor eller spjut kan det
export function migrateTek(s: State) {
  for (const p of s.people) {
    if ((p.habit?.yxa ?? 0) > 0 || p.fame.some(f => f.includes('första yxa'))) (p.tek ??= {}).yxa = 1;
    if ((p.habit?.spjut ?? 0) > 0) (p.tek ??= {}).fiskespjut = 1;
  }
}
