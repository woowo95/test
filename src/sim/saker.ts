import type { TidSlag } from './tider';
import { kladSaker } from './klader';
// ---------- saker ----------
// Allt byn kan äga står här: mat, bränsle, sten och redskap. Lager, slitage, listorna i panelen och det som bärs hem
// frågar registret. En ny sak läggs till här (och får en ikon i ikoner.ts).
export interface SakDef {
  namn: string;
  stack?: number; // en full börda: vad en normalstark vuxen bär. Saknas = ingen egen stack
  vikt?: number; // kg per styck (steg 2.3.1). Saknas = en full famn (BORDA_KG) delad med stacken
  hander?: 1 | 2; // låst till så många händer (som pilbågen); annars räknas det fram ur vikten och styrkan (utrustning.ts)
  rymmer?: number; // det som hålls i en hand rymmer så många fulla famnar (korgen)
  ruta?: number; // hur mycket som ryms i en stack på en ruta i lagret; saknas = en börda
  mapp?: string; // mappen i listan över allt byn äger
  mat?: number; // mat: i vilken ordning den äts, lägst först (det som förstörs fortast)
  naring?: Partial<Record<import('./naring').Naring, number>>; // mat: hur mycket den har av varje näring, jämfört med de andra (naring.ts); en portion höjer ändå mättnaden lika mycket
  ra?: true; // rått kött eller rå fisk: den som äter det blir lite sur och kan bli matförgiftad (matlagning.ts, steg 2.8.1)
  haller?: number; // mat och sådant som ruttnar som mat: hur många dygn (år i spelet) den håller i lagret i rumstemperatur och utan tak (LAGER i lager.ts)
  slits?: number; // det som försvinner av skicket per timme
  blir?: { k: string; per: number }; // det den faller sönder till när skicket är slut, och hur många av den per styck
  redskap?: true; // räknas styckvis; skicket är hur mycket som finns kvar av redskapet
  grupp?: string; // redskap av samma slag som kan ersätta varandra (alla spjut), och görs på samma sätt (redskap.ts)
  trasig?: { stat: string; text?: string }; // när redskapet går sönder i arbetet: det som räknas, och texten första gången ({namn} = den som arbetade)
  dold?: true; // syns inte för invånarna
  i?: string; // ligger gömd i stackarna av det slaget (stack.dold) och har ingen egen stack
  skaffa?: Skaffa; // hur en skaffas; grundvärdet räknas ur det (varde.ts). Saknas = inget värde
  gors?: Gors; // ett redskap som görs i ett eget arbete (redskap.ts): texterna och vad som räknas
  klad?: Klad; // ett klädesplagg (steg 2.3.2, utrustning.ts)
  mark?: true; // ligger kvar på marken där den hamnade: ingen bär, äger eller lagrar den (toa-högen, smuts.ts)
  brinnerInte?: true; // brinner inte upp i en eldsvåda (brand.ts, steg 3.8.5); allt annat i förrådet gör det
}
// ett klädesplagg: platsen på kroppen (PLATSER i utrustning.ts), så stor del mindre kyla för den som har det på sig, och hur
// många dygn (år i spelet) det håller på kroppen
// krok = redskapet hänger i plagget när man bär (bältet, steg 2.3.3): det tar inga händer och väger inget för bördan
interface Klad { plats: string; varme: number; dygn: number; krok?: true }
// ett redskap som görs: text = vad den som gör det gör, stat = räknas varje gång ett blir klart, forsta = loggen första
// gången, fame = det den som gjorde det blir ihågkommen för, igen = loggen de andra gångerna, nyfiken = byn blir nyfiknare
// första gången (REDSKAP.nyfiken), med den texten. {namn} = den som gjorde det, {verktyg} = verktyget (skaffa.verktyg)
interface Gors { text: string; stat: string; forsta: string; fame?: string; igen?: string; nyfiken?: string }
// hur en sak skaffas: samlas i ett arbete (act, takten i handlingar.ts) eller på annat sätt (tid = arbetstimmar för en),
// eller görs av andra saker (av = så många av varje, min = minuters arbete; det är också så lång tid det tar att göra ett redskap
// eller ett rep; slag = vilket slag av arbete tiden hör till, med minuterna i TIDSLAG i tider.ts, steg 2.12.8). tek = tekniken som behövs, sallsynt = svår att hitta,
// verktyg = något av dem behövs men finns kvar (det första som finns används), med ordet för det i texterna
interface Skaffa { act?: string; tid?: number; av?: Record<string, number>; min?: number; slag?: TidSlag; tek?: string; sallsynt?: true; verktyg?: Record<string, string> }

// Nya saker läggs sist, och ordningen ska inte ändras. Den styr i vilken ordning saker betalas i ett byte (payable i behov.ts),
// hur gamla sparfiler läggs ut (storeFromSums i lager.ts, STACK_ORDER), i vilken ordning mapparna visas (FOLDERS) och vilket av två
// matslag med samma `mat` som äts först (FOOD). Var en ny stack hamnar i förrådet avgörs inte av ordningen (zoneSpot i lager.ts)
const DEF = {
  bar: { namn: 'Bär', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 4, naring: { energi: 0.8, vitamin: 2, mineral: 0.3, protein: 0.1, fett: 0.1 }, haller: 3 },
  rotter: { namn: 'Rötter', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 5, naring: { energi: 1.4, mineral: 0.6, vitamin: 0.8, protein: 0.3, fett: 0.1 }, haller: 6 },
  kott: { namn: 'Kaninkött', skaffa: { min: 3, slag: 'bearbeta', tek: 'kniv' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 2, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, ra: true, haller: 2 }, // slaktat vilt (en kanin, 2 fällt vilt i hela saker sedan steg 2.10.7, ger 3 kött, ett ben och ett skinn; värdet delas ur kaninens i DJUR, redskap.ts, steg 3.6.13); köttet håller ett par dygn, fisken ett (steg 2.2.9). Köttet är eget för varje art (steg 3.7.14): nyckeln kott är kaninens, så att sparade byar behåller det
  fisk: { namn: 'Fiskkött', skaffa: { av: { abborre: 1 }, min: 2, slag: 'bearbeta' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.3 }, ra: true, haller: 1 },
  svamp: { namn: 'Svamp', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 3, naring: { protein: 0.6, mineral: 0.8, vitamin: 1, energi: 0.5, fett: 0.1 }, haller: 2 },
  ved: { namn: 'Trä', skaffa: { act: 'hugga', tek: 'yxa' }, stack: 25, mapp: 'Bränsle', slits: 0.0004, blir: { k: 'grenar', per: 2 } },
  grenar: { namn: 'Grenar', skaffa: { act: 'ved' }, stack: 50, mapp: 'Bränsle', slits: 0.0006 },
  torrgras: { namn: 'Hö', skaffa: { tid: 0.4 }, stack: 50, mapp: 'Bränsle', slits: 0.006 }, // hö ruttnar på ett par dygn när det ligger utanför lagret (steg 2.2.9)
  kol: { namn: 'Kol', skaffa: { tid: 0.3 }, stack: 25, mapp: 'Bränsle' },
  flinta: { namn: 'Flinta', skaffa: { tid: 8, sallsynt: true }, stack: 10, mapp: 'Sten', brinnerInte: true },
  yxa: { namn: 'Flintyxa', skaffa: { av: { flinta: 1, grenar: 1 }, min: 5, slag: 'stor', tek: 'yxa' }, vikt: 1.5, stack: 1, mapp: 'Redskap', slits: 0.0004, redskap: true, trasig: { stat: 'yxorTrasiga', text: '{namn}s yxa gick sönder.' },
    gors: { text: 'Gör en flintyxa.', stat: 'yxa1', forsta: '{namn} gjorde byns första yxa av en pinne och en flintsten. Nu kan byn fälla träd.', fame: 'Gjorde byns första yxa', igen: '{namn} gjorde en flintyxa.', nyfiken: 'Flintyxan har gjort byn nyfiken på vad mer som går att tillverka.' } },
  fiskespjut: { namn: 'Träspjut', skaffa: { av: { grenar: 1 }, min: 4, slag: 'liten', tek: 'fiskespjut', verktyg: { yxa: 'yxan', flinta: 'en flintsten' } }, vikt: 1, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s träspjut gick sönder. Träspjuten håller inte länge.' },
    gors: { text: 'Täljer ett träspjut med {verktyg}.', stat: 'spjutGjorda', forsta: '{namn} täljde byns första träspjut med {verktyg}. Nu går fisket lättare.' } },
  korg: { namn: 'Korg', skaffa: { av: { torrgras: 3 }, min: 5, slag: 'stor', tek: 'korg' }, vikt: 0.5, rymmer: 0.8, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, trasig: { stat: 'korgarTrasiga', text: '{namn}s korg gick sönder.' },
    gors: { text: 'Flätar en korg av hö.', stat: 'korgarGjorda', forsta: '{namn} flätade byns första korg av hö.' } },
  // giftig svamp som av misstag hamnat i förrådet bland den ätliga (fynd.ts). Den ligger i svampstacken och syns inte
  giftsvamp: { namn: 'Giftig svamp', haller: 2, dold: true, i: 'svamp' },
  sten: { namn: 'Sten', skaffa: { tid: 0.8 }, stack: 10, mapp: 'Sten', brinnerInte: true },
  rep: { namn: 'Rep', skaffa: { av: { torrgras: 2 }, min: 4, slag: 'liten', tek: 'rep' }, stack: 20, mapp: 'Material', slits: 0.0003 },
  ben: { namn: 'Ben', skaffa: { min: 3, slag: 'bearbeta', tek: 'kniv' }, stack: 20, mapp: 'Material', brinnerInte: true },
  flintspjut: { namn: 'Flintspjut', skaffa: { av: { flinta: 1, rep: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'flintspjut' }, vikt: 1.2, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s flintspjut gick sönder.' },
    gors: { text: 'Gör ett flintspjut med flinta och rep.', stat: 'flintspjutGjorda', forsta: '{namn} gjorde byns första flintspjut: en flintspets surrad med rep vid en pinne. Det håller mycket längre än ett träspjut.' } },
  metspo: { namn: 'Metspö', skaffa: { av: { rep: 1, ben: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'metspo' }, vikt: 0.6, stack: 1, mapp: 'Redskap', slits: 0.0005, redskap: true, trasig: { stat: 'metspoTrasiga' },
    gors: { text: 'Gör ett metspö med en krok av ben.', stat: 'metspoGjorda', forsta: '{namn} gjorde byns första metspö, med en krok av ben.' } },
  // ett fällt djur, helt som det är (vilket djur det än är). En kanin fyller famnen, så stacken är en kanin
  vilt: { namn: 'Fällt vilt', skaffa: { act: 'jakt' }, stack: 2, ruta: 20, mapp: 'Mat', mat: 1.5, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, ra: true, haller: 2 },
  kniv: { namn: 'Flintkniv', skaffa: { av: { flinta: 1, grenar: 1 }, min: 4, slag: 'liten', tek: 'kniv' }, vikt: 0.3, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'knivarTrasiga', text: '{namn}s flintkniv gick sönder.' },
    gors: { text: 'Gör en flintkniv.', stat: 'knivarGjorda', forsta: '{namn} gjorde byns första flintkniv. Nu kan viltet slaktas.' } },
  skinn: { namn: 'Kaninskinn', skaffa: { min: 5, slag: 'bearbeta', tek: 'kniv' }, stack: 10, mapp: 'Material', slits: 0.0006 }, // nyckeln skinn är kaninens (steg 3.7.14)
  // vargen (steg 3.7.14, vargen själv i 3.7.1): den fällda vargen bärs hem hel och slaktas med kniv till vargkött, ben och ett
  // vargskinn. Den äts inte som den är. Vargskinnet är tjockare än kaninens och blir kläder av vargskinn (klader.ts), som värmer mer
  varg: { namn: 'Fälld varg', skaffa: { act: 'jakt' }, stack: 1, mapp: 'Material', haller: 3 }, // en varg är en full famn
  vargkott: { namn: 'Vargkött', skaffa: { min: 3, slag: 'bearbeta', tek: 'kniv' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 2, naring: { protein: 2, fett: 1.2, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, ra: true, haller: 2 },
  vargskinn: { namn: 'Vargskinn', skaffa: { min: 5, slag: 'bearbeta', tek: 'kniv' }, stack: 5, mapp: 'Material', slits: 0.0006 },
  // en hel fisk som den fångats (DJUR i redskap.ts). Den rensas vid elden till fiskkött (fisk), som är det man äter;
  // bara när inget annat finns äts den som den är
  abborre: { namn: 'Abborre', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 1.2, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.3 }, ra: true, haller: 1 }, // den hela fisken äts strax efter fiskköttet: innan byn har en slaktbänk rensas den inte (steg 2.2.8)
  // ett redskap som någon har börjat göra men inte gjort klart (paborjat.ts). Det slits och värderas där, inte här
  paborjat: { namn: 'Påbörjat', vikt: 0.5, stack: 1, mapp: 'Redskap', redskap: true },
  // bensylen (steg 2.3.2): ett ben som slipas spetsigt mot en sten. Den ligger på slöjdbänken (stationer.ts), och med den sys kläderna
  bensyl: { namn: 'Bensyl', skaffa: { av: { ben: 1 }, min: 4, slag: 'liten', tek: 'bensyl', verktyg: { sten: 'en sten', flinta: 'en flinta' } }, vikt: 0.05, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'bensylTrasiga' },
    gors: { text: 'Slipar en bensyl av ett ben mot {verktyg}.', stat: 'bensylGjorda', forsta: '{namn} slipade byns första bensyl av ett ben. Med den kan man sy skinn.' } },
  // kläderna (steg 2.3.2, plagg och material sedan steg 3.10.12): ett plagg av varje material som passar, till exempel
  // rock_vargskinn, "Rock av vargskinn" (PLAGG och MATERIAL i klader.ts). De sys vid slöjdbänken med bensylen, eller flätas
  // (bältet, steg 2.3.3). Den som gjort dem äger dem och har dem på sig
  ...kladSaker(),
  // mossan (steg 2.5.2): hittas när man letar i naturen och ibland när ett träd fälls. Ett förband av mossa på ett sår (halsa.ts)
  mossa: { namn: 'Mossa', skaffa: { act: 'samla' }, stack: 50, mapp: 'Material', slits: 0.0006 },
  // benspaden (steg 2.7.2): tre ben som ett blad, surrade med rep vid en gren, görs vid slöjdbänken. Med den grävs latrinen
  // (stationer.ts) och rötterna fortare (samla i handlingar.ts)
  benspade: { namn: 'Benspade', skaffa: { av: { ben: 3, rep: 1, grenar: 1 }, min: 5, slag: 'stor', tek: 'benspade' }, vikt: 0.8, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'benspadarTrasiga', text: '{namn}s benspade gick sönder.' },
    gors: { text: 'Surrar ihop en benspade av ben, rep och en gren.', stat: 'benspadarGjorda', forsta: '{namn} gjorde byns första benspade av tre ben. Med den gräver man fram rötter fortare, och gropar.' } },
  // maten som grillats (steg 2.8.1, RATTER i matlagning.ts): en enkel rätt som håller längre än den råa och äts först
  grillfisk: { namn: 'Grillad fisk', skaffa: { av: { fisk: 1 }, min: 7.5, slag: 'bearbeta', tek: 'grill' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.5, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.3 }, haller: 2 },
  grillkott: { namn: 'Grillat kött', skaffa: { av: { kott: 1 }, min: 7.5, slag: 'bearbeta', tek: 'grill' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.6, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, haller: 3 },
  // det torkade köttet och den torkade fisken (steg 2.8.2, TORKAS i matlagning.ts): håller så länge något får hålla i lagret
  // (LAGER.maxDygn) och äts sist
  torrkott: { namn: 'Torkat kött', skaffa: { av: { kott: 1 }, min: 5, slag: 'bearbeta', tek: 'tork' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 8, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.2 }, haller: 20 },
  torrfisk: { namn: 'Torkad fisk', skaffa: { av: { fisk: 1 }, min: 5, slag: 'bearbeta', tek: 'tork' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 7, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.2 }, haller: 20 },
  // vattensäcken (steg 2.10.1): ett skinn som sys ihop till en säck vid slöjdbänken med bensylen. Med den hämtar man vatten
  // åt den som inte kan gå (torst.ts), och senare till fälten. Den tar en hand
  vattensack: { namn: 'Vattensäck', skaffa: { av: { skinn: 2, rep: 1 }, min: 5, slag: 'stor', tek: 'vattensack' }, vikt: 0.5, hander: 1, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'vattensackarTrasiga', text: '{namn}s vattensäck gick sönder.' },
    gors: { text: 'Syr en vattensäck av skinn.', stat: 'vattensackarGjorda', forsta: '{namn} sydde byns första vattensäck. Med den kan man bära vatten till den som inte kan gå.' } },
  // fröna (steg 2.10.2, odling.ts): tas med från de vilda grödorna när man samlar, rovfrön från den vilda rovan och ärtfrön
  // (artfron, sist i registret) från de vilda ärterna (steg 3.10.23.8; rovfröna hette frön förut och har deras plats). De kan
  // inte ätas, och de sås på fälten
  rovfron: { namn: 'Rovfrön', skaffa: { act: 'samla' }, stack: 50, mapp: 'Material', haller: 20 }, // förstörs som maten: nästan inte i kylan, så att de klarar istiden (steg 2.12.2)
  // grödorna från fälten (steg 2.10.3, odling.ts). Rovorna håller en vinter i lagret, de torkade ärterna flera år. Ärterna har
  // kornets plats och tal (steg 3.10.23.8), men mer protein och mindre energi
  rovor: { namn: 'Rovor', skaffa: { tid: 0.2, tek: 'odling' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 6, naring: { energi: 1.4, vitamin: 1, mineral: 0.6, protein: 0.2, fett: 0.1 }, haller: 8 },
  arter: { namn: 'Ärter', skaffa: { tid: 0.25, tek: 'odling' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 6.5, naring: { protein: 1.6, energi: 1.4, mineral: 0.7, vitamin: 0.4, fett: 0.1 }, haller: 20 }, // håller så länge något får hålla (LAGER.maxDygn), men det torkade äts sist
  // toa-högen (steg 2.10.5): en toa-fläck på marken (FLACKAR i smuts.ts), som går att trycka på. Den bleknar bort av sig själv
  toa: { namn: 'Toa-hög', mark: true },
  artfron: { namn: 'Ärtfrön', skaffa: { act: 'samla' }, stack: 50, mapp: 'Material', haller: 20 }, // fröna från de vilda ärterna (steg 3.10.23.8), som rovfröna
} satisfies Record<string, SakDef>;

type Sak = keyof typeof DEF;
export const SAKER: Record<string, SakDef | undefined> = DEF;
export const SAK_LIST = Object.keys(DEF) as Sak[];
export const sak = (k: string) => SAKER[k];
export const sakNamn = (k: string) => SAKER[k]?.namn ?? k;
// namnet på ett ting: ett påbörjat redskap (paborjat.ts) heter som det ska bli
export const tingNamn = (t: { k: string; halv?: { gor: string } }) => t.halv ? `${sakNamn(t.halv.gor)} (inte klar)` : sakNamn(t.k);

// en full famn, det en normalstark vuxen bär med båda händerna, väger så här mycket (kg). Vikten och bördan räknas i
// fulla famnar (bordOf), så att en stack av vad som helst är en famn
export const BORDA_KG = 20;
export const viktOf = (k: string) => SAKER[k]?.vikt ?? BORDA_KG / stackOf(k);
export const bordOf = (k: string) => viktOf(k) / BORDA_KG; // hur stor del av en full famn en styck är
export const STACK: Record<string, number> = Object.fromEntries(SAK_LIST.filter(k => SAKER[k]!.stack).map(k => [k, SAKER[k]!.stack!]));
export const STACK_ORDER = Object.keys(STACK);
export const RUTA: Record<string, number> = Object.fromEntries(STACK_ORDER.map(k => [k, SAKER[k]!.ruta ?? STACK[k]])); // hur mycket som ryms på en ruta
const STACK_STD = 25; // stackens och rutans storlek för ett slag som saknar egen (gamla sparfiler, prov)
export const stackOf = (k: string) => STACK[k] ?? STACK_STD;
export const rutaOf = (k: string) => RUTA[k] ?? STACK_STD;
export const FOOD = SAK_LIST.filter(k => SAKER[k]!.mat !== undefined).sort((a, b) => SAKER[a]!.mat! - SAKER[b]!.mat!) as string[]; // i den ordning de äts
export const isFood = (k: string) => SAKER[k]?.mat !== undefined;
export const isTool = (k: string) => !!SAKER[k]?.redskap;
export const REDSKAP_SLAG = SAK_LIST.filter(isTool); // alla redskapsslag, i registrets ordning
export const gruppOf = (k: string) => SAKER[k]?.grupp ?? k;
export const KLAD_SLAG = SAK_LIST.filter(k => SAKER[k]!.klad); // klädesplaggen (steg 2.3.2)
// mappar i listan över allt byn äger; maten med det som håller längst först. summa = antalen läggs ihop på mappens rad
const MAPP_SUMMA = new Set(['Mat', 'Bränsle']);
export const FOLDERS: { namn: string; k: string[]; summa: boolean }[] = [...new Set(SAK_LIST.map(k => SAKER[k]!.mapp).filter(m => m))].map(namn => ({
  namn: namn!, k: SAK_LIST.filter(k => SAKER[k]!.mapp === namn).sort((a, b) => (SAKER[b]!.mat ?? 0) - (SAKER[a]!.mat ?? 0)), summa: MAPP_SUMMA.has(namn!),
}));
