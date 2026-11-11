# Att sortera inför fas 10

Anteckningar från diskussionschatten efter fas 9 (v524). **Planen står nu i Färdplanen i designdokumentet: 10.1 Striden på kartan och 10.2 Rättningar efter fas 9.** Den här filen är underlaget och ändras inte mer; där den och Färdplanen säger olika gäller Färdplanen. Promenaden som står still letas inte efter nu.

## Gaffatejpen i `granskning/gaffatejp-9.9.2.md` (numren där)

Rekommendation från diskussionschatten, inte Björns svar:

- **Först: 23.** Nästan allt nytt i fas 9 ligger på nivån Rädda, så en svältande by brygger vin och hunden äter kött under svält. Nivån ska följa vad saken betyder för byn.
- **Ja, tvingar fram ett resultat:** 3 (elden har fasta reserver och styr andra system), 4, 5 och 9 (inget byggs vid kyla, bara mat bärs in vid svält), 8 (ingen arbetar över förrådets tak; by 2 stod still i dygn utan yxa).
- **Ja, små:** 6, 12, 14, 15, 16, 17, 18, 20, 21.
- **Ja men gå igenom raderna:** 10 (en i taget på många rader; en del kan vara grundregler).
- **Designfrågor för Björn:** 1 (inga motgångar de första 10 dygnen), 2 (högst en motgång per tidsålder), 11 (exakt en vakt per natt), 13 (nybyggare och omgrundning med gratis rötter, spelets säkerhetsnät), 19 (handlarens gränser).
- **Nej:** 22 (lagerplatsernas tillväxt, stabilitet).
- **Eget system:** 7 (Förbättra i fast ordning; stort).

## Annat ur rapporten efter 9.9

- **Gaffatejpsökningen är inte klar:** striden, hälsan, tornadon, branden, religionen, minnet, rykten, framträdandena och matlagningen är inte lästa. Förslag: ett eget steg som läser dem på samma sätt.
- **Promenaden som fastnar** hittades aldrig (troligen i ritkoden). Står inte i designdokumentet. Förslag: ett steg.
- **Torkhuset och vedboden** ritas som tak utan väggar. Förslag: ett litet steg.
- **Svampförgiftningen** dödade 20–28 personer i 16 byar men bryter ingen gräns. Jagas inte; är svampen för farlig är det en fråga om hur världen är (ett balanstal i `fynd.ts`, `giftAndel`/`giftMax`).
- **Jamfor mot versionen före fas 9, `utseende` och prestandan** kördes inte. Hör till 10.9.2 och 10.9.3; jamfor kan köras en gång på MacBooken nu som information.
- **Bildstilens kort** (björnens och vargens anfall, den kolnade stammen) är inte inbyggda. Täcks av 10.9.1.
- **Riktad-kartan** byggs om (kodchatten).

## Grenen

Kärnan i CLAUDE.md och ARKITEKTUR.md (commit c5a4f31) finns bara på `claude/sweet-knuth-f0xnmb` och behöver föras in i main.

## Mer från Björn

### 1. Gaffatejplistan är nu hela `src/sim/` (main 78906e42)

Kodchatten har läst hela `src/sim/` rad för rad (nio hjälpare, 135 filer, drygt 37 000 rader). Listan i `granskning/gaffatejp-9.9.2.md` har nu 99 punkter: fynd 1–23 med tillägg, nya fynd 24–71 efter system och gränsfallen 72–99. Bedömningen är inte prövad av någon annan. Bara skummade: berattelser.ts, varld.ts, typer.ts. Gränssnittet och testerna är inte lästa. Rekommendationen ovan gäller bara 1–23 och behöver göras om för hela listan.

Det viktigaste enligt kodchatten:

- **Åtta fynd lade kodchatten själv in under fas 9**, mest i balansen (märkta "min"). De fick gränserna att hålla men rättar resultatet: +0,6 stridsmod och en gratis sten mot rövarna; en fredlig by försvarar sig lika bra som en krigisk; ingen förälder stannar hos barnen när rövarna kommer; hö, grenar, lera och virke räknas som "till hands" för teknikerna; svampens tabu har en särlösning; minnet behåller en lärdom av varje slag; vedboden byggs inte om den tar sista lagerplatsen; tamdjurens kön är varannan hane och hona.
- **"En i taget" (fynd 10) är större:** bara en person i hela byn kan bygga en station eller möbel åt gången, och samma för att grilla, torka, koka, baka och tända eld. En flaskhals för hela uppbyggnaden.
- **Mycket i fas 9 sker utan att någon väljer det eller lägger tid:** dricka vin, mjölk och te, sätta och plocka örter i krukor, lägga ut äng och hagar, vatten till den som inte kan gå.
- **Fasta tak i stället för förrådsmål:** flinta, mossa, frön, utsäde, rätter och bröd, drycker, mjärdar, torkställningar, flockens storlek.
- **Elden styr andra system på fler ställen:** var hus får stå, om man går in i ett varmt rum, och om kylan alls räknas som en fara.

Övrigt: kartan för riktad byggdes fortfarande om och är inte committad.

### 2. Björns lista (spelet, gränssnittet, testerna)

Björns punkter, grupperade men inte bedömda. **F** = en fråga som Björn vill ha svar på.

**Personbeskrivningarna och porträtten**
- Fler rader i personbeskrivningarna om hur man bor: bor i utkanten av byn, mitt emot verkstaden, har bott länge i sitt hus och liknande.
- Beskrivningarna ska vara något kortare och mer slumpade: all sorts information behöver inte alltid vara med. Det viktigaste är alltid med, till exempel att någon sörjer sin närmaste som gått bort.
- Porträttkorten längst ner som alltid syns blir smalare: namnet under porträttet och yrket bort. Vad personen gör just nu står kvar. Porträtten görs lite större om det behövs för att namnet ska få plats. Fler personer får plats samtidigt.
- Ta bort kön och ålder bredvid porträttet där uppe igen.
- **F:** ett eget porträtt för riktigt små barn, upp till ungefär 5 år? Få variationer behövs, men hårfärgen och hudfärgen ska följa med när barnet växer upp. Är 5 år en rimlig gräns, och är det en bra idé?

**Samtalen**
- Det står att en person samtalar vid elden fast hen är ensam där.
- Vissa samtalar trots att de är långt ifrån varandra. De ska försöka stå nära varandra när de pratar, och samtalet ska ta slut om någon av dem går för långt bort.

**Bilden och animationerna**
- **F:** nu när man kan zooma längre in blir vissa saker suddiga. Är det svårt att lösa?
- Personerna ska ha en tydligare liten lysande cirkel runt sig, så att man ser var de är mitt i natten. Ljuset är bara för bilden och gör inte att de ser bättre. Björn tror att steget gjorts förut, men att det antingen inte blev gjort eller lyser för lite för att synas.
- Sittanimationen får bara visas på stolar och andra sittplatser.
- Gåanimationen visas fortfarande ofta när de står still. Testerna fångar inte upp det, för det sker fortfarande utan att något test varnar.
- Ta bort strecken bakom vågarna (sederna). De gör det bara otydligare.

**Snö, vatten och eld**
- Nu när det finns lerkrukor att koka i ska man inte längre kunna smälta snö vid elden direkt. Snön läggs först i en kruka, och krukan används för att smälta den. En snöfylld lerkruka blir troligen en ny sak.
- Snön ska smälta av eldens värme, både lägerelden och skogsbranden. Det kopplas ihop med värmesystemet som redan finns.

**Husen och sängarna**
- **F:** vad är ett bäggbräde (bäddbräde?)? Björn funderar på att ta bort det, eftersom det inte fungerar så bra visuellt i spelet.
- **F:** ett tomt hus står som verkstad. Rummen ska få sina taggar efter vad som står i dem, så varför står det verkstad i ett tomt hus?
- Fler ska få sängar snabbare. Alla kolonister ska ha en säng på ett eller annat sätt efter inte alltför lång tid. Att sova direkt på marken gör bara mycket primitiva byar. Man tränger in sig i första långhuset, och annars byggs sängarna ute tills man får ett eget hus. (Balans.)
- Nätterna är tråkiga och händelselösa. De kanske kan arbeta mer med hantverk på natten, till exempel vid arbetsbänkarna, så att det händer mer.

**Lärdomarna (10.3)**
- **F:** gör lärdomarna om var saker växer någon skillnad för var kolonisterna jagar, samlar och fiskar? Blir byarna olika i ett test med och utan lärdomar, och hur stor är skillnaden?
- Lärdomarna handlar mycket om platser. Man ska kunna trycka så att kameran flyttas till platsen de pratar om, kanske med en nål på kartan där platsen är.

**Händelseloggen och flikarna**
- Händelseloggen har otroligt många flikar och underflikar och måste förenklas. **F:** vad ska bort?
- Allt i kolonistens personliga händelselogg flyttas till en ny flik i kolonistens ruta, till exempel byten, framträdanden, matcher och viktiga händelser.
- Värmekartorna behöver inte flyttas när man fäller ut flikarna till höger. Det gör inget om de täcks.

**Seder, lagar och ledarskap**
- Vågen i sederna är otydlig. Att någon levde i överflöd kan se ut att dra vågen mycket åt ett håll, fast den ändå lutar åt det andra. Allt som påverkar vågen kan sammanfattas under symbolerna, så att det syns varför den lutar som den gör.
- Fliken Påbud ska heta Lagar, och alla lagar och påbud ska stå där.
- **F:** vad är tabun? Björn såg det för första gången nu, under ledarskap.
- Trycker man på en omröstning ska det tydligt stå vad lagen eller påbudet de röstade om gör.
- Man ska kunna läsa mer om de olika rollerna i ledarskapet, till exempel förvaltare och ålderkvinna. Styrets beskrivning ska alltid ha några korta ord om varje roll, så att bilden blir komplett.

**Testerna och prestandan**
- Alla tester på den lokala datorn mäter den aktiva tiden per kärna, så att man ser om testerna behöver anpassas efter kärnorna.
- **F:** kodgenomgången i slutet av varje fas konstaterar ofta att profilen är platt, så att det inte finns något att optimera. Men det betyder väl inte att varje enskild del inte kan optimeras, även om alla delar tar ungefär lika mycket processorkraft? Björn är orolig att vi går miste om mycket optimering med det resonemanget.

### 3. Striden: Björns beskrivning och kodchattens svar

**Björns fråga till kodchatten (sammanfattad nära hans ord)**

Striderna fungerar så dåligt att Björn funderar på att slänga hela stridskoden och börja om; kodchatten får avgöra om det är bättre att utgå från koden som finns. Så här ska det fungera:

- **Steg 1:**
  - Rövarna dyker upp på kartan och ser ut som helt vanliga kolonister, med ifylld "fejkad" information så att de ser ut som riktiga personer. Informationen ska ändå följa logiken.
  - Samma gäller handlare, gäster och fler sorters personer i framtiden. Det ska vara ett robust system för olika saker, egentligen samma system som för kolonisterna, fast informationen inte har vuxit fram under spelet.
  - Olika sorters personer kan vägas mot olika saker: rövare har oftare ärr, rövarkläder och vapen. Senare kan personer från samma by likna varandra.
  - Vapen och kläder syns både i förrådet och på personen, som för kolonisterna.
  - Rövarna står inte stilla som robotar. De går runt lite och pratar med varandra. Kanske slår de upp ett litet läger i kartans utkant; det måste i så fall gå fort, och idag tar det lång tid att få upp en eld.
  - En vakt kan få syn på dem, kanske genom att se elden, och varnar byn. Varningen behöver inte vara så avancerad som idag; det är realistiskt att hela byn får veta. Men den som är långt borta, till exempel på jakt, borde inte få veta.
  - Kolonisterna gör sig redo: hämtar vapen och skydd, och de som vill gömma sig gör det.
- **Steg 2:**
  - Efter ett tag (balanstal och lite slump) anfaller rövarna. De går mot byn och möter byborna, som då står redo.
  - Ingen går "på räls". Möter de en kolonist på vägen eller blir angripna av en björn ska de reagera rimligt och inte bara gå förbi.
  - Varje person slåss realistiskt: står mitt emot den hen slåss mot (i närstrid) tills någon flyr, blir för skadad eller dör.
  - Varje attack i animationen är en attack i koden som kan göra skada, och animationen går olika fort efter vapnets takt.
  - Den som kan slåss vidare när motståndaren försvinner går till nästa mål, så ibland blir det flera mot en.
  - Det här steget är längst ifrån vad det borde vara just nu.
- **Steg 3:** en sida vinner, och följderna står tydligt beskrivna.
- **Testknappen:** ett anfall som startas i testläget ska vara representativt för ett organiskt anfall, eventuellt med kortare väntan.
- **Robust simulering:** ett system som går att bygga ut med till exempel en stor drake med magiska attacker, hundra gnomer, olika strategier och miljöer.
- **Jakten:** hänger delvis ihop med striden och ska fungera efter omskrivningen.
- **Arbetssätt:** läs koden och diskutera med Björn innan något programmeras. Det är viktigt att det blir rätt.

**Kodchattens svar (sammanfattat)**

Bedömning: släng inte allt, men släng sättet striden körs på. Reglerna för själva slagen är bra; felet är att striden inte utspelar sig i samma värld som resten av spelet. Kodchatten har läst stridskoden, rövarna, gästerna och hur striden ritas, men inte stridsavsnitten i designdokumentet.

Tre grundfel:
1. **Striden är en egen liten värld bredvid spelet.** Varje deltagare kopieras till en "kämpe" (`Kampe` i `strid.ts`) med egna koordinater och egen slump, striden räknas där och resultatet förs tillbaka. Bybon på kartan står under tiden med uppgiften "strid". Ingen kan reagera på något utanför striden, och ingen utanför kan gå in i den naturligt.
2. **Spelet tänker i slag om fem minuter.** Byborna väljer en gång per slag, men en strid är över på någon minut. Koden räknar i förväg ut vilka som "hinner fram inom 60 sekunder" och lägger dem på en lista. Rövarna styrs av en egen tillståndsmaskin (samlas, lurar, anfaller, slåss, rotar, flyr), inte av samma val som byborna. Det är rälsen.
3. **Bilden är en uppspelning, inte striden.** Kartan räknar om striden från början till "tiden som visas" och ritar ett streck mellan den som slår och den som träffas. Slagen i koden och animationen är inte samma sak.

Dessutom är rövarna personer bara till hälften: vapnet är ett eget fält i stället för en sak de bär, och de går in i striden utan kläder (`klader: []`). Slagsmål i byn räknas färdigt direkt, och varg och björn använder samma sidovärld.

Behålls:
- reglerna för ett slag i `strid.ts`: träff och miss, parera och ducka, kroppsdelar och skador, vapnens takt och räckvidd, kast, knuff och fall, tappat vapen, ork, blod, stridsmod och hot;
- gästerna som personer (`gast.ts`): rövare, handlare och främlingar är redan människor av samma slag som byborna;
- hälsan, vården och hjälparna efter striden.

Ersätts:
- sidovärlden med kopierade kämpar;
- uppspelningen från början;
- rövarnas tillståndsmaskin;
- listan över dem som hinner fram;
- lagningarna ovanpå: hemmaplansbonusen, gratisstenen och "vänder om vid 1,5 gånger så många".

I stället:
- **En värld.** Den som slåss är personen själv, på kartans rutor, med vapen och kläder ur det hen bär. Ett djur eller en drake är en kämpe av samma slag med andra tal och attacker (en rad i ett register).
- **Korta slag vid fara.** Spelet kan redan stegas i en eller tio sekunder. När ett hot är nära går hela byn i korta slag, så att alla väljer om hela tiden; när faran är över går spelet tillbaka till fem minuter. Kostnaden i ikappräkningen är inte mätt och ska mätas innan steglängden bestäms.
- **Samma val för alla.** Rövarna får mål ("ta byte", "hämnas") och väljer handling ur samma slags register som byborna: gå dit, slå den som står i vägen, fly, plundra.
- **Ett slag i koden är ett slag i bilden.** Varje attack blir en händelse med tid, vem, mot vem och längd (vapnets takt), och animationen spelar just den.
- **Testknappen** startar samma förlopp som ett organiskt anfall, med kortare väntan.

Björns tre steg i den modellen: flocken skapas som gäster med utrustning ur ett viktat register per sort, rastar i kanten, går runt och pratar, och vakten eller någon nära får syn på dem. Efter en väntan (balanstal och slump) går de mot byn, och mötet sker där de möts. Följderna blir riktiga direkt, eftersom skadorna redan sitter på personerna.

Kodchattens frågor till Björn (obesvarade):
1. **Larmet:** alla i byn och inom hörhåll vet; den som är långt borta (jägaren) får veta först när hen kommer inom hörhåll eller ser något. Räcker det?
2. **Lägret:** ska rövarna ha en rastplats med eld? Enklast är att gäster får tända en färdig lägereld direkt, som en regel för hur världen är. Eller ser vakten själva flocken?
3. **Ordningen:** först strid på kartan med korta slag (ett slagsmål och en arena som prov), sedan rövarna, sedan varg, björn och jakt? Eller rövaranfallet först?

Stridskoden på main: `strid.ts`, `rovare.ts`, `djurstrid.ts`, `varg.ts`, `bjorn.ts`, `jakt.ts`, `gast.ts`, `gastliv.ts`, `gastrel.ts`, `gastvardag.ts`.

(fylls på)
