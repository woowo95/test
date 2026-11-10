# Att sortera inför fas 10

Anteckningar från diskussionschatten efter fas 9 (v524). Inget är bestämt eller inlagt i Färdplanen än. Mer information kommer från Björn; sedan sorteras allt och de godkända punkterna blir steg i fas 10.

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

(fylls på)
