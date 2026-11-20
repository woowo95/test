// Tankarna (steg 12.1.131): registret TANKAR med en rad per tanke: texten, styrkan (v, hur mycket den drar humöret),
// hur länge den varar (tid, ms) och händelsen som ger den (nar). Ett system ger en tanke genom att nämna raden:
// tanke(p, 'fryser', now). En text med namn tar dem som argument: tanke(p, 'gralade', now, { namn: b.name }).
// Styrkan och tiden står i raden när de är fasta tal. Hör de till ett annat systems balanstal (regel 8: talen för ett
// system står på ett ställe) saknas de i raden och ges vid anropet ({ v, tid }); f gör raden starkare eller svagare.
// Några tankar har texten i en annan rad som redan beskriver saken (kvalitetens nivåer i KVALITET, måltidens nivå i
// MALTIDSNIVA, det man ser i KVARLEVOR, drycken i VATSKOR, ritualerna i KULT); de tar texten som argumentet text.
// Humöret läser tankarna i p.thoughts (moodOf i humor.ts). Samma text är samma tanke: en ny ersätter den gamla (think i folk.ts).
import { think } from './folk';
import { gen } from './ord';
import { DAY, HOUR, Person } from './typer';

export interface TankeDef<A = {}> {
  text: string | ((a: A) => string);
  v?: number; // styrkan: saknas den kommer den från systemets balanstal vid anropet
  tid?: number; // hur länge tanken sitter i (ms); saknas den kommer den vid anropet
  nar: string; // händelsen som ger tanken
}
const rad = <A = {}>(d: TankeDef<A>) => d;
export const PYNT_TANKE = 'Trivs med sitt pynt';

export const TANKAR = {
  // ---- kroppen och vädret
  fryser: rad({ text: 'Fryser', v: -0.12, tid: HOUR, nar: 'värmen under KROPP.fryser (steg.ts, gastvardag.ts)' }),
  forVarm: rad({ text: 'För varm', v: -0.08, tid: HOUR, nar: 'riktigt varmt (forVarm i steg.ts)' }),
  vamsAvElden: rad({ text: 'Värms av elden', tid: HOUR, nar: 'nära en eld; styrkan är eldens värme (steg.ts)' }),
  blot: rad({ text: 'Blöt av regnet', v: -0.05, tid: HOUR, nar: 'blöt över VADER.blotTanke (steg.ts)' }),
  kissade: rad({ text: 'Kissade på sig', v: -0.12, tid: 4 * HOUR, nar: 'kom inte till toan i tid (steg.ts)' }),
  svalter: rad({ text: 'Svälter', v: -0.25, tid: 3 * HOUR, nar: 'svälter (steg.ts)' }),
  torstig: rad({ text: 'Är mycket törstig', v: -0.15, tid: HOUR, nar: 'törsten under TORST.farligt (torst.ts)' }),
  ontVatten: rad({ text: 'Fick ont i magen av vattnet', v: -0.1, tid: 6 * HOUR, nar: 'drack orent vatten (torst.ts)' }),
  langtar: rad({ text: (a: { vad: string }) => `Längtar efter ${a.vad}`, tid: HOUR, nar: 'brist på en näring (naring.ts)' }),
  benetDrogs: rad({ text: 'Benet drogs rätt, det gjorde ont', v: -0.1, tid: 2 * HOUR, nar: 'benbrottet sattes (halsa.ts)' }),
  harOnt: rad({ text: 'Har ont', tid: HOUR, nar: 'smärta över HALSA.ontGrans (halsa.ts)' }),
  forloradeDel: rad({ text: (a: { del: string }) => `Förlorade ${a.del}`, v: -0.3, tid: 3 * DAY, nar: 'miste en kroppsdel (halsa.ts)' }),
  naken: rad({ text: 'Är naken', tid: 2 * HOUR, nar: 'har inga kläder alls (steg.ts)' }),
  nakenDel: rad({ text: (a: { delar: string }) => `Har inget på ${a.delar}`, tid: 2 * HOUR, nar: 'saknar plagg på en del av kroppen (steg.ts)' }),
  svampGift: rad({ text: 'Blev förgiftad av en svamp', nar: 'åt en giftig svamp (fynd.ts)' }),
  // ---- vilan och fritiden
  sovBadd: rad({ text: 'Sov gott i halmbädden', v: 0.09, tid: 8 * HOUR, nar: 'sov i en bädd; f = hur utvilad (steg.ts)' }),
  sovGolv: rad({ text: 'Sov gott på golvet i huset', v: 0.07, tid: 8 * HOUR, nar: 'sov på golvet inne; f = hur utvilad (steg.ts)' }),
  sovTak: rad({ text: 'Sov under tak', v: 0.05, tid: 8 * HOUR, nar: 'sov under tak; f = hur utvilad (steg.ts)' }),
  promenad: rad({ text: 'Tog en skön promenad', v: 0.06, tid: 6 * HOUR, nar: 'promenaden (steg.ts)' }),
  bada: rad({ text: 'Badade i sjön', v: 0.08, tid: 6 * HOUR, nar: 'badet (steg.ts)' }),
  strand: rad({ text: 'Satt vid vattnet och fick ro', v: 0.06, tid: 6 * HOUR, nar: 'satt vid stranden (steg.ts)' }),
  ifred: rad({ text: 'Fick vara ifred', nar: 'fick vara ensam på toan (smuts.ts)' }),
  // ---- smutsen
  blodSmuts: rad({ text: 'Blod och smuts i byn', nar: 'ser blod eller smuts nära (smuts.ts)' }),
  akelSmuts: rad({ text: 'Äcklad av smuts', nar: 'står där det är smutsigt (smuts.ts)' }),
  akelToa: rad({ text: 'Äcklad av toa i huset', nar: 'har en toa i sitt rum (smuts.ts)' }),
  // ---- maten och drycken
  daligMat: rad({ text: 'Maten var dålig', v: -0.05, tid: 6 * HOUR, nar: 'åt mat av låg kvalitet (behov.ts)' }),
  vidBordet: rad({ text: 'Åt vid bordet', nar: 'åt vid ett bord (behov.ts)' }),
  smutsigMat: rad({ text: 'Åt smutsig mat och blev magsjuk', v: -0.2, tid: DAY / 2, nar: 'smutsig mat (behov.ts)' }),
  skamdMat: rad({ text: 'Åt skämd mat och blev magsjuk', v: -0.2, tid: DAY / 2, nar: 'skämd mat (behov.ts)' }),
  maltid: rad({ text: (a: { text: string }) => a.text, nar: 'måltidens nivå; texten i MALTIDSNIVA (behov.ts)' }),
  trottPa: rad({ text: (a: { mat: string }) => `${a.mat} igen`, nar: 'samma mat för många gånger (behov.ts)' }),
  gott: rad({ text: (a: { text: string }) => a.text, nar: 'åt något gott (GOTT i behov.ts)' }),
  vallagad: rad({ text: 'Maten var vällagad', nar: 'kockens hand (behov.ts)' }),
  byggsRatt: rad({ text: 'Åt byns egen rätt', nar: 'byns specialitet (special.ts)' }),
  smakGott: rad({ text: 'Fick äta något gott', nar: 'maten man tycker om (rykten.ts)' }),
  smakAckligt: rad({ text: 'Fick äta något äckligt', nar: 'maten man inte tycker om (rykten.ts)' }),
  atRatt: rad({ text: 'Åt rått', nar: 'åt rått kött eller rå fisk (matlagning.ts)' }),
  matforgiftad: rad({ text: 'Blev matförgiftad av rått kött eller rå fisk', tid: 12 * HOUR, nar: 'förgiftad av rå mat (matlagning.ts)' }),
  drack: rad({ text: (a: { dryck: string }) => 'Drack ' + a.dryck, nar: 'kände ruset (rus.ts)' }),
  bakfull: rad({ text: 'Bakfull', nar: 'ruset gick över efter fyllan (rus.ts)' }),
  dryck: rad({ text: (a: { text: string }) => a.text, nar: 'drycken; texten i VATSKOR (vatskor.ts)' }),
  gastabud: rad({ text: 'Åt på gästabudet', tid: DAY / 4, nar: 'styrets gästabud (budget.ts)' }),
  // ---- arbetet och sakerna
  kvalitet: rad({ text: (a: { text: string }) => a.text, nar: 'gjorde något; texten i KVALITET (kvalitet.ts)' }),
  falldeTrad: rad({ text: 'Fällde ett träd', nar: 'första trädet (skog.ts)' }),
  tradFalldes: rad({ text: 'Ett träd fälldes', tid: 2 * HOUR, nar: 'den som drar åt Värna när ett träd fälls (seder.ts)' }),
  sattePlanta: rad({ text: 'Satte en planta', nar: 'satte en planta (skogsvard.ts)' }),
  tandeElden: rad({ text: 'Tände elden', nar: 'tände elden (eld.ts)' }),
  flyttadeElden: rad({ text: 'Flyttade elden', nar: 'flyttade elden (eldflytt.ts)' }),
  komPa: rad({ text: (a: { vad: string }) => `Kom på hur man kan ${a.vad}`, nar: 'kom på en teknik (teknik.ts)' }),
  pynt: rad({ text: PYNT_TANKE, nar: 'har pynt i sitt rum (pynt.ts)' }),
  lonObetald: rad({ text: 'Fick inte hela sin lön', v: -0.1, tid: DAY / 4, nar: 'lönen räckte inte (lon.ts)' }),
  // ---- gåvor, byten och handel
  fickGava: rad({ text: (a: { sak: string; namn: string }) => `Fick ${a.sak} av ${a.namn}`, v: 0.1, tid: 12 * HOUR, nar: 'fick en gåva (behov.ts)' }),
  gavGava: rad({ text: (a: { sak: string; namn: string }) => `Gav ${a.sak} till ${a.namn}`, v: 0.05, tid: 6 * HOUR, nar: 'gav en gåva (behov.ts)' }),
  togSparat: rad({ text: (a: { namn: string; sak: string }) => `${a.namn} tog av det jag sparat (${a.sak})`, tid: 12 * HOUR, nar: 'någon tog av det man sparat (behov.ts)' }),
  vetAttJagTog: rad({ text: (a: { namn: string }) => `${a.namn} vet att jag tog`, v: -0.05, tid: 6 * HOUR, nar: 'den som tog blev sedd (behov.ts)' }),
  lurad: rad({ text: (a: { namn: string }) => `Blev lurad av ${a.namn}`, nar: 'märkte att hen blev lurad i ett byte (behov.ts)' }),
  bytte: rad({ text: (a: { varor: string; namn: string }) => `Bytte till sig ${a.varor} av ${a.namn}`, nar: 'ett byte mellan två (behov.ts)' }),
  smaprat: rad({ text: (a: { namn: string }) => `Småpratade med ${a.namn}`, nar: 'pratet vid handlarens filt gick bra (handel.ts)' }),
  smapratTrogt: rad({ text: (a: { namn: string }) => `Småpratet med ${a.namn} gick trögt`, nar: 'pratet vid handlarens filt gick dåligt (handel.ts)' }),
  tomhant: rad({ text: (a: { namn: string }) => `Gick tomhänt från ${a.namn}`, nar: 'fick inget byte hos handlaren (handel.ts)' }),
  // ---- samtal och relationer
  gralade: rad({ text: (a: { namn: string }) => `Grälade med ${a.namn}`, nar: 'den som började grälet (samtal.ts)' }),
  gralAndra: rad({ text: (a: { namn: string }) => `Grälade med ${a.namn}`, nar: 'den andra i grälet (samtal.ts)' }),
  troststes: rad({ text: (a: { namn: string }) => `Tröstades av ${a.namn}`, nar: 'ett tröstande samtal (samtal.ts)' }),
  skilda: rad({ text: (a: { ord: string; namn: string }) => `${a.ord} ${a.namn}`, nar: 'skilsmässa eller gick skilda vägar (samtal.ts)' }),
  gifte: rad({ text: (a: { namn: string }) => `Gifte sig med ${a.namn}`, v: 0.15, tid: DAY, nar: 'giftermålet (relationer.ts)' }),
  tillsammans: rad({ text: (a: { namn: string }) => `Blev tillsammans med ${a.namn}`, v: 0.15, tid: DAY, nar: 'blev ett par (varld.ts)' }),
  avundsjuk: rad({ text: (a: { namn: string }) => `Avundsjuk på ${a.namn}`, nar: 'avund (rykten.ts)' }),
  ljugerOm: rad({ text: (a: { namn: string }) => `${a.namn} ljuger om mig`, nar: 'någon sprider lögner (rykten.ts)' }),
  hordeRop: rad({ text: (a: { vad: string }) => `Hörde rop: ${a.vad}`, nar: 'ett larm (rykten.ts, rovare.ts)' }),
  slogMig: rad({ text: (a: { namn: string }) => `${a.namn} slog mig`, nar: 'blev slagen i ett utbrott (humor.ts)' }),
  elakMot: rad({ text: (a: { namn: string }) => `${a.namn} var elak mot mig`, nar: 'någon var elak (humor.ts)' }),
  puttade: rad({ text: (a: { namn: string }) => `${a.namn} puttade mig`, nar: 'ett barn puttades (humor.ts)' }),
  brotVanskap: rad({ text: (a: { namn: string }) => `${a.namn} bröt vänskapen`, nar: 'vänskapen bröts (humor.ts)' }),
  fickUr: rad({ text: 'Fick ur mig det', nar: 'ett utbrott är över (humor.ts)' }),
  forlatInte: rad({ text: (a: { namn: string }) => `${a.namn} förlät mig inte`, v: -0.03, tid: 12 * HOUR, nar: 'boten togs inte emot (skuld.ts)' }),
  fickBot: rad({ text: (a: { vad: string; namn: string }) => `Fick ${a.vad} av ${a.namn} som bot`, v: 0.05, tid: 12 * HOUR, nar: 'fick bot (skuld.ts)' }),
  forlat: rad({ text: (a: { namn: string }) => `${a.namn} förlät mig`, v: 0.05, tid: 12 * HOUR, nar: 'boten togs emot (skuld.ts)' }),
  togHandOm: rad({ text: (a: { namn: string }) => `${a.namn} tog hand om mig`, v: 0.1, tid: 12 * HOUR, nar: 'någon vårdade en (halsa.ts)' }),
  gavVatten: rad({ text: (a: { namn: string }) => `${a.namn} gav mig vatten`, v: 0.1, tid: 12 * HOUR, nar: 'någon bar vatten till en (torst.ts)' }),
  pratadeSandebud: rad({ text: 'Pratade med ett sändebud', v: 0.05, tid: 6 * HOUR, nar: 'ledaren tog emot ett sändebud (liv.ts)' }),
  pratadeFramling: rad({ text: 'Pratade med en främling', v: 0.05, tid: 6 * HOUR, nar: 'ledaren tog emot en främling (liv.ts)' }),
  // ---- livet och döden
  fickBarnet: rad({ text: (a: { namn: string }) => `Fick barnet ${a.namn}`, nar: 'ett barn föddes (liv.ts)' }),
  forloradeBarnet: rad({ text: 'Förlorade sitt barn i förlossningen', v: -0.4, tid: 3 * DAY, nar: 'barnet dog i förlossningen (liv.ts)' }),
  saknarDod: rad({ text: (a: { namn: string }) => `Saknar ${a.namn}`, nar: 'en vän dog (liv.ts)' }),
  saknarFlytt: rad({ text: (a: { namn: string }) => `Saknar ${a.namn}`, nar: 'en nära flyttade (liv.ts)' }),
  saknarSorg: rad({ text: (a: { namn: string }) => `Saknar ${a.namn}`, nar: 'sorgen har blivit saknad (liv.ts)' }),
  forlorade: rad({ text: (a: { ord: string; namn: string }) => `Förlorade ${a.ord}, ${a.namn}`, nar: 'en nära dog (liv.ts)' }),
  sorjer: rad({ text: (a: { namn: string }) => `Sörjer ${a.namn}`, nar: 'sorgen efter den första tiden (liv.ts)' }),
  barUt: rad({ text: (a: { namn: string }) => `Bar ut ${a.namn} i skogen`, v: 0, tid: 6 * HOUR, nar: 'bar ut en död (grav.ts)' }),
  begravdeFiende: rad({ text: (a: { namn: string }) => `Begravde fienden ${a.namn}`, v: 0, tid: 6 * HOUR, nar: 'begravde en fiende (grav.ts)' }),
  begravde: rad({ text: (a: { namn: string }) => `Begravde ${a.namn}`, v: -0.02, tid: 6 * HOUR, nar: 'begravde en bybo (grav.ts)' }),
  begravdes: rad({ text: (a: { namn: string }) => `${a.namn} begravdes`, tid: 12 * HOUR, nar: 'familjen och de nära vid en begravning (grav.ts)' }),
  skandade: rad({ text: (a: { namn: string }) => `Skändade ${a.namn}`, v: 0, tid: 6 * HOUR, nar: 'skändade en död (grav.ts)' }),
  togAvFiende: rad({ text: 'Tog det en fallen fiende bar', v: -0.02, tid: 6 * HOUR, nar: 'tog en död fiendes saker (grav.ts)' }),
  gjordeGrav: rad({ text: (a: { en: string; grav: string; namn: string }) => `Gjorde ${a.en} ${a.grav} åt ${a.namn}`, v: 0.02, tid: 6 * HOUR, nar: 'byggde en grav (grav.ts)' }),
  stodVidGraven: rad({ text: 'Stod vid graven', tid: 6 * HOUR, nar: 'besökte en grav (grav.ts)' }),
  sagKvar: rad({ text: (a: { text: string }) => a.text, nar: 'såg något som ligger kvar; texten i KVARLEVOR (kvarlevor.ts)' }),
  sagLigga: rad({ text: (a: { namn: string }) => `Såg ${a.namn} ligga där`, nar: 'såg en nära ligga död (kvarlevor.ts)' }),
  sagSkandas: rad({ text: (a: { namn: string }) => `Såg ${a.namn} skändas`, nar: 'såg en nära skändas (kvarlevor.ts)' }),
  // ---- faror och strid
  klaradeVargar: rad({ text: 'Klarade sig mot vargarna', nar: 'vann mot vargarna (varg.ts)' }),
  anfollsVargar: rad({ text: 'Anfölls av vargar', nar: 'förlorade mot vargarna (varg.ts)' }),
  drevBortRovare: rad({ text: 'Drev bort rövarna', nar: 'vann mot rövarna (rovare.ts)' }),
  slogsRovare: rad({ text: 'Slogs med rövare', nar: 'förlorade mot rövarna (rovare.ts)' }),
  hotadRovare: rad({ text: 'Hotades av rövare', v: -0.15, tid: 6 * HOUR, nar: 'rövarna hotade (rovare.ts)' }),
  sagBjorn: rad({ text: 'Såg en björn', nar: 'mötte en björn (bjorn.ts)' }),
  sagBjornUngar: rad({ text: 'Såg en björn med ungar', nar: 'mötte en björn med ungar (bjorn.ts)' }),
  falldeBjorn: rad({ text: 'Fällde björnen på björnjakten', nar: 'björnjakten lyckades (bjorn.ts)' }),
  bjornUndan: rad({ text: 'Björnen kom undan', nar: 'björnjakten misslyckades (bjorn.ts)' }),
  anfollsBjorn: rad({ text: 'Anfölls av en björn', nar: 'björnen anföll (bjorn.ts)' }),
  sagBjornSlass: rad({ text: 'Såg en björn slåss med folk', nar: 'flydde från björnstriden (bjorn.ts)' }),
  falldeVildsvin: rad({ text: 'Fällde ett vildsvin som anföll', nar: 'vann mot vildsvinet (jakt.ts)' }),
  anfollsVildsvin: rad({ text: 'Anfölls av ett vildsvin', nar: 'förlorade mot vildsvinet (jakt.ts)' }),
  vadaskott: rad({ text: (a: { namn: string }) => `Träffade ${a.namn} av misstag`, nar: 'ett vådaskott (strid.ts)' }),
  vannSlagsmal: rad({ text: (a: { namn: string }) => `Vann slagsmålet mot ${a.namn}`, nar: 'vann ett slagsmål (strid.ts)' }),
  forloradeSlagsmal: rad({ text: (a: { namn: string }) => `Förlorade slagsmålet mot ${a.namn}`, nar: 'förlorade ett slagsmål (strid.ts)' }),
  // ---- styret och fängelset
  straffad: rad({ text: (a: { namn: string }) => `Straffades av ${a.namn}`, nar: 'ledaren straffade (styre.ts)' }),
  lederByn: rad({ text: 'Leder byn', tid: 2 * HOUR, nar: 'ledaren (styre.ts)' }),
  angav: rad({ text: 'Angav en sammansvärjning', v: 0.02, tid: DAY, nar: 'angav en sammansvärjning (rost.ts)' }),
  inlast: rad({ text: 'Sitter inlåst', nar: 'sitter i fängelset, värre för varje dygn (fangelse.ts)' }),
  tandeEldAt: rad({ text: (a: { namn: string }) => `${a.namn} tände en eld åt mig`, v: 0.1, tid: 12 * HOUR, nar: 'någon tände en eld åt fången (fangelse.ts)' }),
  barMatTill: rad({ text: (a: { namn: string }) => `${a.namn} bar mat till mig`, v: 0.1, tid: 12 * HOUR, nar: 'någon bar mat till fången (fangelse.ts)' }),
  // ---- fester, sport och framträdanden
  ingenLyssnade: rad({ text: 'Ingen kom och lyssnade', nar: 'ingen publik (framtradande.ts)' }),
  dansade: rad({ text: (a: { till: string }) => `Dansade till ${a.till}`, nar: 'dansade till ett framträdande (framtradande.ts)' }),
  lyssnade: rad({ text: (a: { pa: string }) => `Lyssnade på ${a.pa}`, nar: 'lyssnade på ett framträdande (framtradande.ts)' }),
  uppträdde: rad({ text: (a: { antal: string }) => `Uppträdde för ${a.antal} vid elden`, nar: 'uppträdde (framtradande.ts)' }),
  fickForBerattelse: rad({ text: (a: { en: string; sak: string; namn: string; om: string }) => `Fick ${a.en} ${a.sak} av ${a.namn} för att berätta om ${a.om}`, v: 0.05, tid: 6 * HOUR, nar: 'ett beställt framträdande om ett minne (framtradande.ts)' }),
  fickForHyllning: rad({ text: (a: { en: string; sak: string; namn: string; honom: string }) => `Fick ${a.en} ${a.sak} av ${a.namn} för att hylla ${a.honom}`, v: 0.05, tid: 6 * HOUR, nar: 'ett beställt framträdande som hyllar ledaren (framtradande.ts)' }),
  fickForTro: rad({ text: (a: { vad: string; namn: string }) => `Fick ${a.vad} av ${a.namn} för att tala om tron`, v: 0.05, tid: 6 * HOUR, nar: 'ett beställt framträdande om tron (framtradande.ts)' }),
  ingenSpela: rad({ text: 'Ingen ville spela', nar: 'ingen att spela med (sport.ts)' }),
  sagMatch: rad({ text: (a: { namn: string }) => `Såg ${a.namn}`, nar: 'publiken vid en match (sport.ts)' }),
  vannMatch: rad({ text: (a: { namn: string }) => `Vann ${a.namn}`, nar: 'vann en match (sport.ts)' }),
  forloradeMatch: rad({ text: (a: { namn: string }) => `Förlorade ${a.namn}`, nar: 'förlorade en match (sport.ts)' }),
  vannTavling: rad({ text: (a: { sak: string }) => `Vann ${a.sak} i tävlingen`, nar: 'vann en tävling (sport.ts)' }),
  // ---- skriften
  resteMinnessten: rad({ text: (a: { namn: string }) => `Reste en sten efter ${a.namn}`, v: 0.03, tid: 12 * HOUR, nar: 'ristade en minnessten (skrift.ts)' }),
  ristadeHeliga: rad({ text: 'Ristade de heliga kvädena', v: 0.03, tid: 12 * HOUR, nar: 'ristade en helig sten (skrift.ts)' }),
  ristadeLag: rad({ text: 'Ristade en lag', v: 0.03, tid: 12 * HOUR, nar: 'ristade en lag (skrift.ts)' }),
  resteBedrift: rad({ text: 'Reste en sten om sin bedrift', v: 0.03, tid: 12 * HOUR, nar: 'ristade en sten om sig själv (skrift.ts)' }),
  lasteHeliga: rad({ text: 'Läste de heliga kvädena', nar: 'den som tror läste de heliga kvädena (skrift.ts)' }),
  skrev: rad({ text: (a: { titel: string }) => `Skrev ${a.titel}`, v: 0.02, tid: 6 * HOUR, nar: 'skrev ett blad eller en bok (skrift.ts)' }),
  laste: rad({ text: (a: { av: string; vad: string }) => `Läste ${gen(a.av)} ${a.vad}`, nar: 'läste ett kväde eller en berättelse (skrift.ts)' }),
  // ---- resorna
  klaradeUppdrag: rad({ text: (a: { namn: string }) => `Klarade ${a.namn}`, nar: 'ett uppdrag lyckades (resa.ts)' }),
  tomPlats: rad({ text: 'Kom fram till en tom plats', nar: 'uppdragets plats var tom (resa.ts)' }),
  uppdragGickInte: rad({ text: 'Uppdraget gick inte', nar: 'ett uppdrag misslyckades (resa.ts)' }),
  // ---- tron
  badBon: rad({ text: 'Bad sin bön', tid: 6 * HOUR, nar: 'vardagsbönen (kult.ts)' }),
  kult: rad({ text: (a: { text: string }) => a.text, tid: 6 * HOUR, nar: 'en handling i kulten; texten är handlingens namn (kult.ts)' }),
  ritual: rad({ text: (a: { text: string }) => a.text, tid: 12 * HOUR, nar: 'var med i en ritual; texten är ritualens namn (kult.ts)' }),
  vanhelgad: rad({ text: 'Någon vanhelgade vår heliga plats', v: -0.15, tid: 2 * DAY, nar: 'den heliga platsen vanhelgades (kult.ts)' }),
  hogtidMat: rad({ text: 'Högtidens mat saknades', tid: 12 * HOUR, nar: 'högtidens mat fanns inte (kult.ts)' }),
  ingetOffra: rad({ text: 'Hade inget att offra', tid: 12 * HOUR, nar: 'inget att offra (kult.ts)' }),
  brotBud: rad({ text: (a: { bud: string }) => `Bröt mot budet: ${a.bud}`, tid: 12 * HOUR, nar: 'bröt mot ett bud (kyrka.ts)' }),
  gavTron: rad({ text: 'Gav en gåva till tron', v: 0.02, tid: 6 * HOUR, nar: 'gav en gåva till tron (kyrka.ts)' }),
  prastMat: rad({ text: 'Fick mat av tron', v: 0.03, tid: 6 * HOUR, nar: 'prästen fick mat ur kyrkans förråd (kyrka.ts)' }),
  trosMat: rad({ text: 'Fick mat av tron', v: 0.05, tid: 6 * HOUR, nar: 'en hungrig fick mat av kyrkan (kyrka.ts)' }),
  tackade: rad({ text: 'Tackade gudarna för maten', tid: 12 * HOUR, nar: 'budet att tacka (kyrka.ts)' }),
  halsadeElden: rad({ text: 'Hälsade elden i morse', tid: 12 * HOUR, nar: 'budet att hälsa elden (kyrka.ts)' }),
  badForFodd: rad({ text: 'Bad för den som fötts eller dött', tid: 12 * HOUR, nar: 'budet att be vid födsel och död (kyrka.ts)' }),
  djurSaknas: rad({ text: 'Tron kräver djur, och det finns inget att offra', tid: DAY, nar: 'djuroffret gick inte (kyrka.ts)' }),
  hamnas: rad({ text: (a: { namn: string }) => `Måste hämnas på ${a.namn}`, v: -0.03, tid: 2 * DAY, nar: 'budet om hämnd (kyrka.ts)' }),
  tingBorta: rad({ text: 'Vårt heliga ting är borta', nar: 'det heliga tinget förstördes eller stals (kyrka.ts)' }),
  olSaknades: rad({ text: 'Ölet saknades vid högtiden', tid: 12 * HOUR, nar: 'inget öl vid högtiden (kyrka.ts)' }),
  ingenKvad: rad({ text: 'Ingen kvad om tron vid högtiden', tid: 12 * HOUR, nar: 'ingen skald vid högtiden (kyrka.ts)' }),
  hordeKvade: rad({ text: (a: { skald: string }) => `Hörde ${gen(a.skald)} kväde om tron`, tid: 12 * HOUR, nar: 'skalden kvad om tron (kyrka.ts)' }),
  hordeSorgkvade: rad({ text: (a: { skald: string; om: string }) => `Hörde ${gen(a.skald)} sorgkväde om ${a.om}`, tid: 12 * HOUR, nar: 'skalden kvad om den döde (kyrka.ts)' }),
  forstaSkord: rad({ text: 'Gav det första ur skörden till tron', tid: 12 * HOUR, nar: 'budet om det första ur skörden (kyrka.ts)' }),
} satisfies Record<string, TankeDef<any>>;

export type TankeId = keyof typeof TANKAR;
type ArgOf<K extends TankeId> = (typeof TANKAR)[K] extends TankeDef<infer A> ? A : {};
// v och tid i stället för radens, f gånger radens styrka
export interface TankeVal { v?: number; f?: number; tid?: number }
type Args<K extends TankeId> = {} extends ArgOf<K> ? [x?: TankeVal] : [x: ArgOf<K> & TankeVal];

// texten till en tanke (för att leta upp den i p.thoughts)
export function tankeText<K extends TankeId>(k: K, ...[x]: Args<K>): string {
  const t = (TANKAR[k] as TankeDef<any>).text;
  return typeof t === 'string' ? t : t(x);
}
// ge p tanken k
export function tanke<K extends TankeId>(p: Person, k: K, now: number, ...[x]: Args<K>) {
  const d = TANKAR[k] as TankeDef<any>, o: TankeVal = x ?? {};
  const v = o.v ?? d.v, tid = o.tid ?? d.tid;
  if (v === undefined || tid === undefined) throw new Error(`tanken ${k} behöver styrka och tid vid anropet`);
  think(p, typeof d.text === 'string' ? d.text : d.text(x), o.f === undefined ? v : v * o.f, now, tid);
}
