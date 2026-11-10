import type { TidSlag } from './tider';
import { RECEPT } from './recept';
import { kladSaker } from './klader';
import { rattSaker } from './ratter';
// ---------- saker ----------
// Allt byn kan äga står här: mat, bränsle, sten och redskap. Lager, slitage, listorna i panelen och det som bärs hem
// frågar registret. En ny sak läggs till här (och får en ikon i ikoner.ts).
export interface SakDef {
  namn: string;
  ett?: true; // ett ett-ord (ett rep, ett bär); annars ett en-ord. För kontrollen av texterna (steg 4.5.1.2)
  stack?: number; // en full börda: vad en normalstark vuxen bär. Saknas = ingen egen stack
  vikt?: number; // hur mycket en styck tar av en hand (steg 6.1.8; en vanlig hand orkar 10, utrustning.ts). Saknas = VIKT_STACK delat med stacken
  hander?: 1 | 2; // låst till så många händer (som pilbågen); annars räknas det fram ur vikten och styrkan (utrustning.ts)
  rymmer?: number; // det som hålls i en hand rymmer så mycket vikt, av vilka slag som helst (korgen)
  ruta?: number; // hur mycket som ryms i en stack på en ruta i lagret; saknas = en börda
  mapp?: string; // mappen i listan över allt byn äger
  mat?: number; // mat: i vilken ordning den äts, lägst först (det som förstörs fortast)
  naring?: Partial<Record<import('./naring').Naring, number>>; // mat: hur mycket den har av varje näring, jämfört med de andra (naring.ts); en portion höjer ändå mättnaden lika mycket
  ra?: true; // rått kött eller rå fisk: den som äter det blir lite sur och kan bli matförgiftad (matlagning.ts, steg 2.8.1)
  haller?: number; // mat och sådant som ruttnar som mat: hur många dygn (år i spelet) den håller i lagret i rumstemperatur och utan tak (LAGER i lager.ts)
  slits?: number; // det som försvinner av skicket per timme
  blir?: { k: string; per: number }; // det den faller sönder till när skicket är slut, och hur många av den per styck
  redskap?: true; // räknas styckvis; skicket är hur mycket som finns kvar av redskapet
  hanger?: 'balte' | 'axel'; // var redskapet hänger när det inte används (steg 7.1.1): i bältet eller på axeln (axelremmen, steg 7.1.2). Saknas = det hänger ingenstans
  grupp?: string; // redskap av samma slag som kan ersätta varandra (alla spjut), och görs på samma sätt (redskap.ts)
  trasig?: { stat: string; text?: string }; // när redskapet går sönder i arbetet: det som räknas, och texten första gången ({namn} = den som arbetade)
  dold?: true; // syns inte för invånarna
  i?: string; // ligger gömd i stackarna av det slaget (stack.dold) och har ingen egen stack
  skaffa?: Skaffa; // hur en skaffas; grundvärdet räknas ur det (varde.ts). Saknas = inget värde
  gors?: Gors; // ett redskap som görs i ett eget arbete (redskap.ts): texterna och vad som räknas
  klad?: Klad; // ett klädesplagg (steg 2.3.2, utrustning.ts)
  mark?: true; // ligger kvar på marken där den hamnade: ingen bär, äger eller lagrar den (toa-högen, smuts.ts)
  varde?: number; // ett fast grundvärde, när saken inte skaffas i byn (silvret, steg 4.4.1.3)
  brinnerInte?: true; // brinner inte upp i en eldsvåda (brand.ts, steg 3.8.5); allt annat i förrådet gör det
}
// ett klädesplagg: platsen på kroppen (PLATSER i utrustning.ts), så stor del mindre kyla för den som har det på sig, och hur
// många dygn (år i spelet) det håller på kroppen
// krok = så många redskap hänger i plagget (bältet, steg 2.3.3 och 7.1.1): de tar inga händer och väger inget för bördan
interface Klad { plats: string; varme: number; dygn: number; krok?: number; axel?: number; rygg?: number; snoTar?: number }
// ett redskap som görs: text = vad den som gör det gör, stat = räknas varje gång ett blir klart, forsta = loggen första
// gången, fame = det den som gjorde det blir ihågkommen för, igen = loggen de andra gångerna
// {namn} = den som gjorde det, {verktyg} = verktyget (skaffa.verktyg)
interface Gors { text: string; stat: string; forsta: string; fame?: string; igen?: string }
// hur en sak skaffas: samlas i ett arbete (act, takten i handlingar.ts) eller på annat sätt (tid = arbetstimmar för en),
// eller görs av andra saker (av = så många av varje, min = minuters arbete; det är också så lång tid det tar att göra ett redskap
// eller ett rep; slag = vilket slag av arbete tiden hör till, med minuterna i TIDSLAG i tider.ts, steg 2.12.8). tek = tekniken som behövs, sallsynt = svår att hitta,
// verktyg = något av dem behövs men finns kvar (det första som finns används), med ordet för det i texterna, ger = så många blir det av receptet (nävern, steg 6.3.3)
interface Skaffa { ger?: number; act?: string; tid?: number; av?: Record<string, number>; min?: number; slag?: TidSlag; tek?: string; sallsynt?: true; verktyg?: Record<string, string> }

// Nya saker läggs sist, och ordningen ska inte ändras. Den styr i vilken ordning saker betalas i ett byte (payable i behov.ts),
// hur gamla sparfiler läggs ut (storeFromSums i lager.ts, STACK_ORDER), i vilken ordning mapparna visas (FOLDERS) och vilket av två
// matslag med samma `mat` som äts först (FOOD). Var en ny stack hamnar i förrådet avgörs inte av ordningen (zoneSpot i lager.ts)
const DEF = {
  bar: { namn: 'Bär', ett: true, skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 4, naring: { energi: 0.8, vitamin: 2, mineral: 0.3, protein: 0.1, fett: 0.1 }, haller: 3 },
  rotter: { namn: 'Rötter', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 5, naring: { energi: 1.4, mineral: 0.6, vitamin: 0.8, protein: 0.3, fett: 0.1 }, haller: 6 },
  kott: { namn: 'Harkött', ett: true, skaffa: RECEPT.kott, stack: 25, ruta: 75, mapp: 'Mat', mat: 2, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, ra: true, haller: 2 }, // slaktat vilt (en kanin, 2 fällt vilt i hela saker sedan steg 2.10.7, ger 3 kött, ett ben och ett skinn; värdet är golvet för nivån, varde.ts); köttet håller ett par dygn, fisken ett (steg 2.2.9). Köttet är eget för varje art (steg 3.7.14): nyckeln kott är kaninens, så att sparade byar behåller det
  fisk: { namn: 'Fiskkött', ett: true, skaffa: RECEPT.fisk, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.3 }, ra: true, haller: 1 },
  svamp: { namn: 'Svamp', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 3, naring: { protein: 0.6, mineral: 0.8, vitamin: 1, energi: 0.5, fett: 0.1 }, haller: 2 },
  ved: { namn: 'Ved', skaffa: { act: 'hugga', tek: 'yxa' }, stack: 20, mapp: 'Bränsle', slits: 0.0004, blir: { k: 'grenar', per: 2 } },
  grenar: { namn: 'Grenar', skaffa: { act: 'ved' }, stack: 50, mapp: 'Bränsle', slits: 0.0006 },
  torrgras: { namn: 'Hö', ett: true, skaffa: { tid: 0.4, act: 'samla' }, stack: 50, mapp: 'Bränsle', slits: 0.006 }, // hö ruttnar på ett par dygn när det ligger utanför lagret (steg 2.2.9)
  kol: { namn: 'Kol', ett: true, skaffa: { tid: 0.3 }, stack: 25, mapp: 'Bränsle' },
  flinta: { namn: 'Flinta', skaffa: { tid: 8, sallsynt: true, act: 'samla' }, stack: 20, mapp: 'Sten', brinnerInte: true },
  yxa: { namn: 'Flintyxa', hanger: 'balte', skaffa: RECEPT.yxa, vikt: 6, stack: 1, mapp: 'Redskap', slits: 0.0004, redskap: true, trasig: { stat: 'yxorTrasiga', text: '{namn}s yxa gick sönder.' },
    gors: { text: 'Gör en flintyxa.', stat: 'yxa1', forsta: '{namn} gjorde byns första yxa av en pinne och en flintsten. Nu kan byn fälla träd.', fame: 'Gjorde byns första yxa', igen: '{namn} gjorde en flintyxa.' } },
  fiskespjut: { namn: 'Träspjut', hanger: 'axel', ett: true, skaffa: RECEPT.fiskespjut, vikt: 5, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s träspjut gick sönder. Träspjuten håller inte länge.' },
    gors: { text: 'Täljer ett träspjut med {verktyg}.', stat: 'spjutGjorda', forsta: '{namn} täljde byns första träspjut med {verktyg}. Nu går fisket lättare.' } },
  korg: { namn: 'Korg', skaffa: RECEPT.korg, vikt: 2, rymmer: 15, stack: 1, mapp: 'Redskap', slits: 0.001, redskap: true, trasig: { stat: 'korgarTrasiga', text: '{namn}s korg gick sönder.' },
    gors: { text: 'Flätar en korg av hö.', stat: 'korgarGjorda', forsta: '{namn} flätade byns första korg av hö.' } },
  // giftig svamp som av misstag hamnat i förrådet bland den ätliga (fynd.ts). Den ligger i svampstacken och syns inte
  giftsvamp: { namn: 'Giftig svamp', haller: 2, dold: true, i: 'svamp' },
  sten: { namn: 'Sten', skaffa: { tid: 0.8 }, stack: 10, mapp: 'Sten', brinnerInte: true },
  // proteserna (steg 9.5.11, protes.ts): den som förlorat en del får en när byn har en ledig, och har den på sig
  krycka: { namn: 'Krycka', skaffa: RECEPT.krycka, vikt: 2, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, trasig: { stat: 'proteserTrasiga', text: '{namn}s krycka gick sönder.' }, gors: { text: 'Täljer en krycka.', stat: 'kryckorGjorda', forsta: '{namn} täljde byns första krycka. Med den kan den som förlorat ett ben gå igen.' } },
  traben: { namn: 'Träben', skaffa: RECEPT.traben, vikt: 2, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, trasig: { stat: 'proteserTrasiga', text: '{namn}s träben gick sönder.' }, gors: { text: 'Täljer ett träben och binder fast remmar av rep.', stat: 'trabenGjorda', forsta: '{namn} täljde byns första träben.' } },
  krok: { namn: 'Krok', skaffa: RECEPT.krok, vikt: 0.3, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, trasig: { stat: 'proteserTrasiga', text: '{namn}s krok gick sönder.' }, gors: { text: 'Gör en krok av trä som sätts på armen.', stat: 'krokarGjorda', forsta: '{namn} gjorde byns första krok åt den som förlorat en hand.' } },
  ogonlapp: { namn: 'Ögonlapp', skaffa: RECEPT.ogonlapp, vikt: 0.1, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, trasig: { stat: 'proteserTrasiga', text: '{namn}s ögonlapp gick sönder.' }, gors: { text: 'Skär en ögonlapp av skinn.', stat: 'ogonlapparGjorda', forsta: '{namn} skar byns första ögonlapp.' } },
  // förbanden (steg 9.5.15): remsorna som läggs på såret och nålen av ben som såret sys med
  remsa: { namn: 'Remsa', skaffa: RECEPT.remsa, stack: 20, vikt: 0.05, mapp: 'Material' },
  nal: { namn: 'Bennål', skaffa: RECEPT.nal, vikt: 0.05, stack: 1, mapp: 'Redskap', slits: 0.0005, redskap: true, trasig: { stat: 'nalarTrasiga', text: '{namn}s bennål gick av.' }, gors: { text: 'Slipar en nål av ben mot {verktyg}.', stat: 'nalarGjorda', forsta: '{namn} slipade byns första bennål. Med den kan ett stort sår sys ihop.' } },
  // näveraskan (steg 9.4.13): en liten ask av näver och rep, behållaren för salvan och benlimmet (vatskor.ts, steg 9.4.14)
  naverask: { namn: 'Näverask', skaffa: RECEPT.naverask, vikt: 0.2, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'naveraskarTrasiga', text: '{namn}s näverask gick sönder.' },
    gors: { text: 'Viker en ask av näver och syr ihop den med rep.', stat: 'naveraskarGjorda', forsta: '{namn} vek byns första näverask. I den håller sig salvan och limmet.' } },
  // lerkrukan i tre storlekar (steg 9.4.11, KRUKOR i kruka.ts): ett ting med ägare, skick och kvalitet, som torkar och bränns
  lerkruka_liten: { namn: 'Liten lerkruka', skaffa: RECEPT.lerkruka_liten, vikt: 0.5, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, grupp: 'lerkruka', trasig: { stat: 'krukorTrasiga', text: '{namn}s lerkruka sprack.' },
    gors: { text: 'Bygger upp en liten lerkruka av lera med sand i.', stat: 'krukorGjorda', forsta: '{namn} byggde upp byns första lerkruka av lera. Den ska torka och brännas i elden.' } },
  lerkruka_mellan: { namn: 'Mellanstor lerkruka', skaffa: RECEPT.lerkruka_mellan, vikt: 1, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, grupp: 'lerkruka', trasig: { stat: 'krukorTrasiga', text: '{namn}s lerkruka sprack.' },
    gors: { text: 'Bygger upp en mellanstor lerkruka av lera med sand i.', stat: 'krukorGjorda', forsta: '{namn} byggde upp byns första lerkruka av lera. Den ska torka och brännas i elden.' } },
  lerkruka_stor: { namn: 'Stor lerkruka', skaffa: RECEPT.lerkruka_stor, vikt: 2, stack: 1, mapp: 'Redskap', slits: 0.0002, redskap: true, grupp: 'lerkruka', trasig: { stat: 'krukorTrasiga', text: '{namn}s lerkruka sprack.' },
    gors: { text: 'Bygger upp en stor lerkruka av lera med sand i.', stat: 'krukorGjorda', forsta: '{namn} byggde upp byns första lerkruka av lera. Den ska torka och brännas i elden.' } },
  lera: { namn: 'Lera', skaffa: { tid: 0.8 }, stack: 10, mapp: 'Sten', brinnerInte: true }, // steg 9.4.10: grävs vid stranden (fynd.ts), till lerkrukorna
  rep: { namn: 'Rep', ett: true, skaffa: RECEPT.rep, stack: 40, mapp: 'Material', slits: 0.0003 },
  talg: { namn: 'Talg', ett: true, skaffa: RECEPT.talg, stack: 30, mapp: 'Material' }, // djurfett från slakten, i hela stycken (steg 6.3.5): blir facklor och ljus
  ben: { namn: 'Ben', ett: true, skaffa: RECEPT.ben, stack: 40, mapp: 'Material', brinnerInte: true },
  flintspjut: { namn: 'Flintspjut', hanger: 'axel', ett: true, skaffa: RECEPT.flintspjut, vikt: 5, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, grupp: 'spjut', trasig: { stat: 'spjutTrasiga', text: '{namn}s flintspjut gick sönder.' },
    gors: { text: 'Gör ett flintspjut med flinta och rep.', stat: 'flintspjutGjorda', forsta: '{namn} gjorde byns första flintspjut: en flintspets surrad med rep vid en pinne. Det håller mycket längre än ett träspjut.' } },
  nat: { namn: 'Nät', ett: true, skaffa: RECEPT.nat, vikt: 3, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'natTrasiga', text: '{namn}s nät gick sönder.' },
    gors: { text: 'Knyter ett nät av lintråd vid slöjdbänken.', stat: 'natGjorda', forsta: '{namn} knöt byns första fiskenät av lintråd.' } }, // steg 9.6.16
  metspo: { namn: 'Metspö', hanger: 'axel', ett: true, skaffa: RECEPT.metspo, vikt: 4, stack: 1, mapp: 'Redskap', slits: 0.0005, redskap: true, trasig: { stat: 'metspoTrasiga' },
    gors: { text: 'Gör ett metspö med en krok av ben.', stat: 'metspoGjorda', forsta: '{namn} gjorde byns första metspö, med en krok av ben.' } },
  // ett fällt djur, helt som det är (vilket djur det än är). En kanin fyller famnen, så stacken är en kanin
  vilt: { namn: 'Fällt vilt', ett: true, skaffa: { act: 'jakt' }, stack: 5, vikt: 8, ruta: 20, mapp: 'Mat', mat: 1.5, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, ra: true, haller: 2 },
  kniv: { namn: 'Flintkniv', hanger: 'balte', skaffa: RECEPT.kniv, vikt: 2, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'knivarTrasiga', text: '{namn}s flintkniv gick sönder.' },
    gors: { text: 'Gör en flintkniv.', stat: 'knivarGjorda', forsta: '{namn} gjorde byns första flintkniv. Nu kan viltet slaktas.' } },
  skinn: { namn: 'Harskinn', ett: true, skaffa: RECEPT.skinn, stack: 30, mapp: 'Material', slits: 0.0006 }, // lätt men skrymmande (steg 4.5.5.1); nyckeln skinn är kaninens (steg 3.7.14)
  // vargen (steg 3.7.14, vargen själv i 3.7.1): den fällda vargen bärs hem hel och slaktas med kniv till vargkött, ben och ett
  // vargskinn. Den äts inte som den är. Vargskinnet är tjockare än kaninens och blir kläder av vargskinn (klader.ts), som värmer mer
  varg: { vikt: 15, namn: 'Fälld varg', skaffa: { act: 'jakt' }, stack: 1, mapp: 'Material', haller: 3 }, // en varg är en full famn
  vargkott: { namn: 'Vargkött', ett: true, skaffa: RECEPT.vargkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 2, naring: { protein: 2, fett: 1.2, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, ra: true, haller: 2 },
  vargskinn: { namn: 'Vargskinn', ett: true, skaffa: RECEPT.vargskinn, stack: 5, mapp: 'Material', slits: 0.0006 },
  slaktfar: { vikt: 12, namn: 'Slaktat får', ett: true, varde: 20, stack: 1, mapp: 'Material', haller: 3 }, slaktget: { vikt: 12, namn: 'Slaktad get', varde: 20, stack: 1, mapp: 'Material', haller: 3 }, // steg 9.8.7: ett tamdjur som avlivats, slaktas vid slaktbänken som viltet
  djurhorn: { namn: 'Djurhorn', ett: true, varde: 2, stack: 20, vikt: 0.2, mapp: 'Material' }, fiskrens: { namn: 'Fiskrens', stack: 25, ruta: 50, mapp: 'Material', haller: 2 }, // steg 9.8.7: hornen från fåren och getterna, och fiskrensen som blir agn
  radjur: { vikt: 15, namn: 'Fällt rådjur', ett: true, skaffa: { act: 'jakt' }, stack: 1, mapp: 'Material', haller: 3 }, // steg 6.6.2: en full famn, som vargen
  fagel: { namn: 'Fälld fågel', skaffa: { act: 'jakt' }, stack: 5, vikt: 8, ruta: 20, mapp: 'Mat', mat: 1, naring: { protein: 2, fett: 0.8, energi: 0.7, mineral: 0.5, vitamin: 0.3 }, ra: true, haller: 2 }, // steg 6.6.3: orre, ripa eller skogsduva, samma sak
  fjadrar: { namn: 'Fjädrar', skaffa: RECEPT.fjadrar, stack: 50, mapp: 'Material' }, // steg 6.6.3: från fåglarna, till pilar och prydnader senare
  agg: { namn: 'Ägg', ett: true, skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 1.2, fett: 0.8, energi: 0.5, mineral: 0.3, vitamin: 0.4 }, ra: true, haller: 3 }, // steg 6.6.3: hittas ibland på våren när man samlar
  radjursskinn: { namn: 'Rådjursskinn', ett: true, skaffa: RECEPT.radjursskinn, stack: 5, mapp: 'Material', slits: 0.0006 },
  // björnen (steg 6.6.6, bjorn.ts): den fällda björnen väger som fyra vargar och styckas alltid där den föll, i sex stycken.
  // Björnskinnet är det tjockaste skinnet och blir den varmaste klädern (klader.ts)
  bjorn: { vikt: 60, namn: 'Fälld björn', skaffa: { act: 'jakt' }, stack: 1, mapp: 'Material', haller: 3 },
  bjornskinn: { namn: 'Björnskinn', ett: true, skaffa: RECEPT.bjornskinn, stack: 5, mapp: 'Material', slits: 0.0006 },
  // en hel fisk som den fångats (DJUR i redskap.ts). Den rensas vid elden till fiskkött (fisk), som är det man äter;
  // bara när inget annat finns äts den som den är
  gadda: { namn: 'Gädda', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 2.4, naring: { protein: 2.2, fett: 0.3, mineral: 0.7, energi: 0.5, vitamin: 0.3 }, ra: true, haller: 1 }, // steg 7.4.3: större, ger 2 gäddkött
  mort: { namn: 'Mört', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.6, naring: { protein: 1.8, fett: 1.2, mineral: 0.9, energi: 0.7, vitamin: 0.4 }, ra: true, haller: 1 }, // fångas i mjärden, och är ett bättre bete än masken (steg 7.4.4)
  gaddkott: { namn: 'Gäddkött', ett: true, skaffa: RECEPT.gaddkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 2.2, fett: 0.3, mineral: 0.7, energi: 0.5, vitamin: 0.3 }, ra: true, haller: 1 },
  mortkott: { namn: 'Mörtkött', ett: true, skaffa: RECEPT.mortkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 1.8, fett: 1.2, mineral: 0.9, energi: 0.7, vitamin: 0.4 }, ra: true, haller: 1 },
  grillgadda: { namn: 'Grillad gädda', skaffa: RECEPT.grillgadda, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.5, naring: { protein: 2.2, fett: 0.3, mineral: 0.7, energi: 0.5, vitamin: 0.3 }, haller: 2 },
  grillmort: { namn: 'Grillad mört', skaffa: RECEPT.grillmort, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.5, naring: { protein: 1.8, fett: 1.2, mineral: 0.9, energi: 0.7, vitamin: 0.4 }, haller: 2 },
  torrgadda: { namn: 'Torkad gädda', skaffa: RECEPT.torrgadda, stack: 25, ruta: 75, mapp: 'Mat', mat: 7, naring: { protein: 2.2, fett: 0.3, mineral: 0.7, energi: 0.5, vitamin: 0.2 }, haller: 20 },
  torrmort: { namn: 'Torkad mört', skaffa: RECEPT.torrmort, stack: 25, ruta: 75, mapp: 'Mat', mat: 7, naring: { protein: 1.8, fett: 1.2, mineral: 0.9, energi: 0.7, vitamin: 0.3 }, haller: 20 },
  mjarde: { namn: 'Mjärde', skaffa: RECEPT.mjarde, stack: 1, ruta: 1, mapp: 'Redskap' }, // en flätad korg som sätts ut i vattnet (steg 7.4.2)
  huggen_sten: { namn: 'Huggen sten', skaffa: RECEPT.huggen_sten, stack: 20, vikt: 4, mapp: 'Material' }, // steg 7.5.1
  plankor: { namn: 'Plankor', skaffa: RECEPT.plankor, stack: 20, vikt: 2, mapp: 'Material' },
  rolleka: { namn: 'Rölleka', skaffa: { act: 'samla' }, stack: 25, vikt: 0.1, mapp: 'Material' }, // den första örten (steg 7.6.3): går inte att äta och håller länge
  salva: { namn: 'Salva', skaffa: RECEPT.salva, stack: 10, vikt: 0.2, mapp: 'Material' }, // steg 7.6.4–7.6.6: ingen funktion än
  tjara: { namn: 'Tjära', skaffa: RECEPT.tjara, stack: 10, vikt: 0.5, mapp: 'Material' },
  benlim: { namn: 'Benlim', skaffa: RECEPT.benlim, stack: 10, vikt: 0.3, mapp: 'Material' },
  rokelse: { namn: 'Rökelse', skaffa: RECEPT.rokelse, stack: 10, vikt: 0.2, mapp: 'Material' }, brannolja: { namn: 'Brännolja', skaffa: RECEPT.brannolja, stack: 10, vikt: 0.5, mapp: 'Material' }, // steg 8.5.16
  tval: { namn: 'Tvål', skaffa: RECEPT.tval, stack: 10, vikt: 0.2, mapp: 'Material' },
  lader: { namn: 'Läder', skaffa: RECEPT.lader, stack: 10, vikt: 1, mapp: 'Material' }, // steg 7.7.6
  ratlin: { namn: 'Rått lin', skaffa: { tid: 0.25, tek: 'lin' }, stack: 25, vikt: 0.3, mapp: 'Material' }, // rötas på torkställningen innan det kan spinnas
  lin: { namn: 'Lin', skaffa: RECEPT.lin, stack: 25, vikt: 0.3, mapp: 'Material' }, // steg 7.7.7
  linfron: { namn: 'Linfrön', skaffa: { tid: 0.25, tek: 'odling' }, stack: 25, vikt: 0.05, mapp: 'Material' },
  trad: { namn: 'Lintråd', skaffa: RECEPT.trad, stack: 25, vikt: 0.1, mapp: 'Material' }, // steg 7.7.8
  lintyg: { namn: 'Lintyg', skaffa: RECEPT.lintyg, stack: 10, vikt: 0.5, mapp: 'Material' }, // steg 7.7.9
  vargtand: { namn: 'Vargtand', skaffa: { tid: 0.1 }, stack: 25, vikt: 0.05, mapp: 'Material' }, // steg 7.7.5
  leksak: { namn: 'Leksak', skaffa: RECEPT.leksak, stack: 10, vikt: 0.2, mapp: 'Redskap' }, // steg 7.5.4
  snara: { namn: 'Snara', skaffa: RECEPT.snara, stack: 5, vikt: 0.2, mapp: 'Redskap' }, // steg 7.5.10
  grop: { namn: 'Fångstgrop', skaffa: RECEPT.grop, stack: 1, vikt: 1, mapp: 'Redskap' }, // steg 7.5.11
  abborre: { namn: 'Abborre', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 1.2, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.3 }, ra: true, haller: 1 }, // den hela fisken äts strax efter fiskköttet: innan byn har en slaktbänk rensas den inte (steg 2.2.8)
  // ett redskap som någon har börjat göra men inte gjort klart (paborjat.ts). Det slits och värderas där, inte här
  paborjat: { namn: 'Påbörjat', ett: true, vikt: 2, stack: 1, mapp: 'Redskap', redskap: true },
  // bensylen (steg 2.3.2): ett ben som slipas spetsigt mot en sten. Den ligger på slöjdbänken (stationer.ts), och med den sys kläderna
  bensyl: { namn: 'Bensyl', skaffa: RECEPT.bensyl, vikt: 0.5, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'bensylTrasiga' },
    gors: { text: 'Slipar en bensyl av ett ben mot {verktyg}.', stat: 'bensylGjorda', forsta: '{namn} slipade byns första bensyl av ett ben. Med den kan man sy skinn.' } },
  // kläderna (steg 2.3.2, plagg och material sedan steg 3.10.12): ett plagg av varje material som passar, till exempel
  // rock_vargskinn, "Rock av vargskinn" (PLAGG och MATERIAL i klader.ts). De sys vid slöjdbänken med bensylen, eller flätas
  // (bältet, steg 2.3.3). Den som gjort dem äger dem och har dem på sig
  ...kladSaker(),
  // mossan (steg 2.5.2): hittas när man letar i naturen och ibland när ett träd fälls. Ett förband av mossa på ett sår (halsa.ts)
  mossa: { namn: 'Mossa', skaffa: { act: 'samla' }, stack: 50, mapp: 'Material', slits: 0.0006 },
  // sportens föremål (steg 4.3.1.2, sport.ts): bollen sys av ett skinn fyllt med hö, slagträet täljs av trä och målet är
  // en ring av grenar med rep. De är byns och slits när man spelar
  boll: { namn: 'Boll', skaffa: RECEPT.boll, vikt: 1, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'bollarTrasiga', text: 'Bollen gick sönder i spelet.' },
    gors: { text: 'Syr ihop ett skinn fyllt med hö till en boll.', stat: 'bollarGjorda', forsta: '{namn} sydde byns första boll. Nu kan man spela bollspel.' } },
  slagtra: { namn: 'Slagträ', ett: true, skaffa: RECEPT.slagtra, vikt: 3, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'slagtraTrasiga', text: 'Slagträet gick av i spelet.' },
    gors: { text: 'Täljer ett slagträ av ett stycke trä med {verktyg}.', stat: 'slagtraGjorda', forsta: '{namn} täljde byns första slagträ. Med det slår man bollen.' } },
  mal: { namn: 'Mål', ett: true, skaffa: RECEPT.mal, vikt: 5, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'malTrasiga', text: 'Målet föll isär.' },
    gors: { text: 'Binder en ring av grenar med rep till ett mål att kasta mot.', stat: 'malGjorda', forsta: '{namn} band byns första mål av grenar. Nu tävlar man i att kasta.' } },
  // instrumenten (steg 4.3.2.2, framtradande.ts): trumman spänns av ett skinn över en ring av trä, benflöjten skärs av ett ben
  // och lyran av trä med strängar av rep. De är byns och ligger vid scenen (stationer.ts); med dem blir det sång och musik
  trumma: { namn: 'Trumma', skaffa: RECEPT.trumma, vikt: 4, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'trummorTrasiga', text: 'Trumman sprack.' },
    gors: { text: 'Spänner ett skinn över en ring av trä till en trumma.', stat: 'trummorGjorda', forsta: '{namn} spände byns första trumma. Nu kan man sjunga och spela till den vid scenen.' } },
  benflojt: { namn: 'Benflöjt', skaffa: RECEPT.benflojt, vikt: 0.5, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'benflojterTrasiga', text: 'Benflöjten sprack.' },
    gors: { text: 'Skär hål i ett ben till en flöjt med {verktyg}.', stat: 'benflojterGjorda', forsta: '{namn} skar byns första benflöjt. Nu kan man spela vid scenen.' } },
  lyra: { namn: 'Lyra', skaffa: RECEPT.lyra, vikt: 3, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'lyrorTrasiga', text: 'Lyrans ram sprack.' },
    gors: { text: 'Täljer en lyra av trä med {verktyg} och spänner strängar av rep.', stat: 'lyrorGjorda', forsta: '{namn} gjorde byns första lyra. Sången till den gör de som lyssnar gladare än något annat.' } },
  // benspaden (steg 2.7.2): tre ben som ett blad, surrade med rep vid en gren, görs vid slöjdbänken. Med den grävs latrinen
  // (stationer.ts) och rötterna fortare (samla i handlingar.ts)
  skold: { namn: 'Sköld', hanger: 'balte', skaffa: RECEPT.skold, vikt: 3, stack: 1, mapp: 'Redskap', slits: 0.0005, redskap: true, gors: { text: 'Gör en sköld.', stat: 'skoldarGjorda', forsta: '{namn} gjorde byns första sköld.' }, trasig: { stat: 'skoldarTrasiga', text: '{namn}s sköld gick sönder.' } }, // steg 8.7.3
  bage: { namn: 'Pilbåge', hanger: 'balte', skaffa: RECEPT.bage, vikt: 1, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, gors: { text: 'Gör en pilbåge.', stat: 'bagarGjorda', forsta: '{namn} gjorde byns första pilbåge.' }, trasig: { stat: 'bagarTrasiga', text: '{namn}s båge gick sönder.' } }, // steg 8.7.6
  slunga: { namn: 'Slunga', hanger: 'balte', skaffa: RECEPT.slunga, vikt: 0.2, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, gors: { text: 'Gör en slunga.', stat: 'slungorGjorda', forsta: '{namn} gjorde byns första slunga.' }, trasig: { stat: 'slungorTrasiga', text: '{namn}s slunga gick sönder.' } },
  horn: { namn: 'Horn', hanger: 'balte', skaffa: RECEPT.horn, vikt: 0.5, stack: 1, mapp: 'Redskap', slits: 0.0001, redskap: true, gors: { text: 'Gör ett horn.', stat: 'hornGjorda', forsta: '{namn} gjorde byns första horn.' }, trasig: { stat: 'hornTrasiga', text: '{namn}s horn gick sönder.' } }, // steg 8.7.11
  pilar: { namn: 'Pilar', skaffa: RECEPT.pilar, vikt: 0.1, stack: 20, mapp: 'Redskap' },
  benspade: { namn: 'Benspade', hanger: 'balte', skaffa: RECEPT.benspade, vikt: 4, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'benspadarTrasiga', text: '{namn}s benspade gick sönder.' },
    gors: { text: 'Surrar ihop en benspade av ben, rep och en gren.', stat: 'benspadarGjorda', forsta: '{namn} gjorde byns första benspade av tre ben. Med den gräver man fram rötter fortare, och gropar.' } },
  // maten som grillats (steg 2.8.1, RATTER i matlagning.ts): en enkel rätt som håller längre än den råa och äts först
  grillfisk: { namn: 'Grillad fisk', skaffa: RECEPT.grillfisk, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.5, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.3 }, haller: 2 },
  grillkott: { namn: 'Grillat kött', ett: true, skaffa: RECEPT.grillkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 0.6, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.3 }, haller: 3 },
  // det torkade köttet och den torkade fisken (steg 2.8.2, TORKAS i matlagning.ts): håller så länge något får hålla i lagret
  // (LAGER.maxDygn) och äts sist
  torrkott: { namn: 'Torkat kött', ett: true, skaffa: RECEPT.torrkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 8, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.2 }, haller: 20 },
  torrfisk: { namn: 'Torkad fisk', skaffa: RECEPT.torrfisk, stack: 25, ruta: 75, mapp: 'Mat', mat: 7, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.2 }, haller: 20 },
  // vattensäcken (steg 2.10.1): ett skinn som sys ihop till en säck vid slöjdbänken med bensylen. Med den hämtar man vatten
  // åt den som inte kan gå (torst.ts), och senare till fälten. Den tar en hand
  talgljus: { namn: 'Talgljus', ett: true, skaffa: RECEPT.talgljus, vikt: 0.3, stack: 10, mapp: 'Redskap', slits: 0.0003, redskap: true,
    gors: { text: 'Doppar en veke av torrt gräs i smält talg tills den blivit ett ljus.', stat: 'ljusGjorda', forsta: '{namn} gjorde byns första talgljus. Det står på bordet inne och lyser upp rummet på kvällen.' } },
  fackla: { namn: 'Fackla', skaffa: RECEPT.fackla, vikt: 1, hander: 1, stack: 5, mapp: 'Redskap', slits: 0.0003, redskap: true,
    gors: { text: 'Klyver en käpp i toppen och binder torrt gräs och talg i klykan till en fackla.', stat: 'facklorGjorda', forsta: '{namn} gjorde byns första fackla. Med den kan man gå ut i mörkret och se vart man går.' } }, // brinner FACKLA.brinnTim timmar och bärs tänd i en hand (ljus.ts, steg 6.3.6)
  // sländan (steg 7.7.8): med den spinner man lin till tråd var som helst, och i vävstolen fortare (steg 7.7.9)
  slanda: { namn: 'Slända', hanger: 'balte', skaffa: RECEPT.slanda, vikt: 0.3, stack: 5, mapp: 'Redskap', slits: 0.002, redskap: true, trasig: { stat: 'slandorTrasiga', text: '{namn}s slända gick sönder.' },
    gors: { text: 'Gör en slända av en pinne och en tyngd av sten.', stat: 'slandorGjorda', forsta: '{namn} gjorde byns första slända. Med den spinner man lin till tråd var som helst.' } },
  vattensack: { namn: 'Vattensäck', hanger: 'axel', skaffa: RECEPT.vattensack, vikt: 2, hander: 1, stack: 1, mapp: 'Redskap', slits: 0.0003, redskap: true, trasig: { stat: 'vattensackarTrasiga', text: '{namn}s vattensäck gick sönder.' },
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
  // silvret (steg 4.4.1.3, handel.ts): det enda som är pengar. Det kommer med handlarna och är värt en arbetstimme styck. Det
  // byts bara med handlaren än; silver mellan byborna kommer i steg 9.5.1.2
  silver: { namn: 'Silver', ett: true, varde: 1, stack: 200, mapp: 'Silver', brinnerInte: true },
  // virket (steg 4.5.5.2): kluvna stockar som klyvs ur de fällda stammarna med yxa (klyva i handlingar.ts). Stationerna och
  // möblerna byggs av virke; veden är bränsle och små saker
  virke: { namn: 'Virke', ett: true, skaffa: { act: 'klyva', tek: 'yxa' }, stack: 2, vikt: 15, mapp: 'Material', slits: 0.0002, blir: { k: 'ved', per: 5 } },
  // nävern (steg 6.3.3, eld.ts): täljs ur en ved med kniv eller yxa när elden ska tändas, fyra av en ved; en näver ersätter höet och tar lättare eld
  naver: { namn: 'Näver', skaffa: RECEPT.naver, stack: 50, mapp: 'Bränsle', slits: 0.0006 },
  // styckdelen (steg 6.6.1, styckning.ts): en bit av ett stort djur som var för tungt att bära helt och styckades där det
  // föll. Delarna är fortfarande vilt och slaktas vid slaktbänken (raden vargdel i DJUR, redskap.ts)
  vargdel: { namn: 'Vargstycke', ett: true, skaffa: { act: 'jakt' }, vikt: 10, stack: 1, mapp: 'Material', haller: 3 },
  radjurdel: { namn: 'Rådjursstycke', ett: true, skaffa: { act: 'jakt' }, vikt: 10, stack: 1, mapp: 'Material', haller: 3 },
  bjorndel: { namn: 'Björnstycke', ett: true, skaffa: { act: 'jakt' }, vikt: 10, stack: 1, mapp: 'Material', haller: 3 }, // steg 6.6.6
  korn: { namn: 'Korn', ett: true, skaffa: { tid: 0.25, tek: 'sadesodling' }, stack: 50, vikt: 0.05, mapp: 'Material', haller: 20 }, // säden (steg 9.6.11): köps av handlarna, sås och blir gröt
  malt: { namn: 'Malt', skaffa: RECEPT.malt, stack: 50, vikt: 0.05, mapp: 'Material', haller: 20 }, // kornet som grott och torkat (steg 9.6.13): till ölet
  // braxen och sik (steg 9.6.17, fisk.ts): fångas mest i nätet och rensas till eget kött
  braxen: { namn: 'Braxen', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 2.3, naring: { protein: 1.9, fett: 0.9, mineral: 0.8, energi: 0.7, vitamin: 0.3 }, ra: true, haller: 1 },
  sik: { namn: 'Sik', skaffa: { act: 'fiske' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 1.3, naring: { protein: 2, fett: 1.4, mineral: 0.7, energi: 0.8, vitamin: 0.6 }, ra: true, haller: 1 },
  braxkott: { namn: 'Braxenkött', ett: true, skaffa: RECEPT.braxkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 1.9, fett: 0.9, mineral: 0.8, energi: 0.7, vitamin: 0.3 }, ra: true, haller: 1 },
  sikkott: { namn: 'Sikkött', ett: true, skaffa: RECEPT.sikkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 1, naring: { protein: 2, fett: 1.4, mineral: 0.7, energi: 0.8, vitamin: 0.6 }, ra: true, haller: 1 },
  lok: { namn: 'Lök', skaffa: { act: 'samla' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 5.5, naring: { vitamin: 1.3, mineral: 0.6, energi: 0.6, protein: 0.2, fett: 0.1 }, haller: 10 }, // vildlöken (steg 9.6.20): smak i maten, och lökarna sätts på fältet
  brod: { namn: 'Bröd', ett: true, skaffa: RECEPT.brod, stack: 25, ruta: 75, mapp: 'Mat', mat: 5.8, naring: { energi: 1.7, protein: 0.6, mineral: 0.6, vitamin: 0.4, fett: 0.2 }, haller: 6 }, // brödet (steg 9.6.23): håller längre än annan lagad mat
  mjol: { namn: 'Mjöl', ett: true, skaffa: RECEPT.mjol, stack: 50, vikt: 0.05, mapp: 'Material', haller: 20 }, // mjölet (steg 9.6.22): malet korn som går att spara
  // saltet (steg 9.6.19): en handelsvara från byarna vid havet; saltat kött och saltad fisk håller längre, och saltet fyller mineralerna
  salt: { namn: 'Salt', ett: true, varde: 2, stack: 50, vikt: 0.05, mapp: 'Material' },
  saltfisk: { namn: 'Saltad fisk', skaffa: RECEPT.saltfisk, stack: 25, ruta: 75, mapp: 'Mat', mat: 6.95, naring: { protein: 2, fett: 0.8, mineral: 1.4, energi: 0.6, vitamin: 0.2 }, haller: 20 },
  saltkott: { namn: 'Saltat kött', ett: true, skaffa: RECEPT.saltkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 6.97, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 1.3, vitamin: 0.2 }, haller: 20 },
  // resterna (steg 9.7.5, rester.ts): ruttnar bort, och ger smuts så länge de ligger i byn
  slaktrens: { namn: 'Slaktrens', stack: 25, ruta: 50, mapp: 'Material', haller: 2 },
  vaxtrest: { namn: 'Växtrester', stack: 25, ruta: 50, mapp: 'Material', haller: 4 },
  kompost: { namn: 'Kompost', skaffa: { av: { slaktrens: 10 }, min: 2, slag: 'bearbeta' }, stack: 25, ruta: 50, mapp: 'Material' }, // färdig kompost (steg 9.7.6): gödslar fältet
  // kålen och bönorna (steg 9.7.8, odling.ts): nya grödor, med fröna från handlarna
  kal: { namn: 'Kål', skaffa: { tid: 0.25, tek: 'odling' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 5.2, naring: { vitamin: 1.8, mineral: 0.8, energi: 0.7, protein: 0.3, fett: 0.1 }, haller: 6 },
  bonor: { namn: 'Bönor', skaffa: { tid: 0.25, tek: 'odling' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 6.6, naring: { protein: 1.8, energi: 1.3, mineral: 0.7, vitamin: 0.4, fett: 0.2 }, haller: 20 },
  kalfron: { namn: 'Kålfrön', skaffa: { tid: 0.25, tek: 'odling' }, stack: 50, vikt: 0.05, mapp: 'Material', haller: 20 },
  jordgubbar: { namn: 'Jordgubbar', skaffa: { tid: 0.3, tek: 'odling' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 3.5, naring: { vitamin: 1.4, energi: 0.9, mineral: 0.4, fett: 0.1 }, haller: 2 }, // steg 9.7.9: mättar lite men gör folk glada
  jordgubbsplanta: { namn: 'Jordgubbsplanta', ett: true, varde: 1, stack: 25, vikt: 0.1, mapp: 'Material', haller: 20 },
  appel: { namn: 'Äpplen', skaffa: { tid: 0.3, tek: 'odling' }, stack: 25, ruta: 75, mapp: 'Mat', mat: 3.8, naring: { vitamin: 1.6, energi: 0.9, mineral: 0.3 }, haller: 8 }, // steg 9.7.13
  ull: { namn: 'Ull', ett: true, varde: 3, stack: 20, vikt: 0.2, mapp: 'Material' }, // klipps av fåren (steg 9.8.5, boskap.ts)
  levfar: { namn: 'Levande får', ett: true, varde: 25, stack: 1, vikt: 0, mapp: 'Material' }, levget: { namn: 'Levande get', varde: 25, stack: 1, vikt: 0, mapp: 'Material' }, // köps av handlaren och blir ett djur (steg 9.8.5)
  appelplanta: { namn: 'Äppelplanta', ett: true, varde: 2, stack: 10, vikt: 0.5, mapp: 'Material', haller: 20 },
  notter: { namn: 'Hasselnötter', skaffa: { act: 'samla' }, stack: 50, ruta: 100, mapp: 'Mat', mat: 6.8, naring: { fett: 2, protein: 1.2, energi: 1.2, mineral: 0.8, vitamin: 0.3 }, haller: 20 }, // steg 9.7.14: håller länge
  // det rökta (steg 9.6.8, matlagning.ts): håller som det torkade och smakar lite bättre
  rokfisk: { namn: 'Rökt fisk', skaffa: RECEPT.rokfisk, stack: 25, ruta: 75, mapp: 'Mat', mat: 6.8, naring: { protein: 2, fett: 0.8, mineral: 0.7, energi: 0.6, vitamin: 0.2 }, haller: 20 },
  rokkott: { namn: 'Rökt kött', ett: true, skaffa: RECEPT.rokkott, stack: 25, ruta: 75, mapp: 'Mat', mat: 6.9, naring: { protein: 2, fett: 1, energi: 0.8, mineral: 0.6, vitamin: 0.2 }, haller: 20 },
  // rätterna som kokas i lerkrukan (steg 9.6.3, ratter.ts): en rad per huvudingrediens, kategori och nivå
  ...rattSaker(),
} satisfies Record<string, SakDef>;

type Sak = keyof typeof DEF;
export const SAKER: Record<string, SakDef | undefined> = DEF;
export const SAK_LIST = Object.keys(DEF) as Sak[];
export const sak = (k: string) => SAKER[k];
export const sakNamn = (k: string) => SAKER[k]?.namn ?? (k === 'hus' ? 'Hus' : k); // huset är ingen sak, men ligger som en symbol på filten vid ett husbyte (steg 7.2.12)
// namnet på ett ting: ett påbörjat redskap (paborjat.ts) heter som det ska bli
export const tingNamn = (t: { k: string; halv?: { gor: string } }) => t.halv ? `${sakNamn(t.halv.gor)} (inte klar)` : sakNamn(t.k);

// vikten (steg 6.1.8): ett påhittat tal för hur mycket en sak tar av en hand, inte kg. En sak väger VIKT_STACK delat med
// stacken (en vanlig hand bär 5 grenar, 2 ved, 2 bär och 1 sten), eller det som står i registret (redskapen, viltet, virket)
export const VIKT_STACK = 100;
export const viktOf = (k: string) => SAKER[k]?.vikt ?? VIKT_STACK / stackOf(k);
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
