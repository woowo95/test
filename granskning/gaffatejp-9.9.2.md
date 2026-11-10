# Gaffatejp i koden (steg 9.9.2)

Regler som tvingar fram ett resultat i stället för att systemen ger det. Inget är ändrat. Svara med numren du säger ja till, så blir de steg i Färdplanen.

**Hur genomgången gjordes:** hela `src/sim/` (135 filer, drygt 37 000 rader) är läst rad för rad av nio hjälpmodeller, en filgrupp var, med reglerna ur `GRANSKNING.md`. Jag har sedan kontrollerat att varje citerad rad finns i koden. Undantag: `berattelser.ts` (texter), `varld.ts` (uppgraderingar av sparade byar) och `typer.ts` är skummade efter logik som styr byn; gränssnittet (`src/ui/`) och testerna är inte lästa, eftersom de inte avgör vad människorna gör. Bedömningen "gaffatejp eller grundregel" är hjälparnas och min; raderna under Gränsfall är de vi är osäkra på. Radnumren gäller commit e4216284.

**Åtta av fynden lade jag själv in under fas 9**, de flesta i fasens balans, och de är märkta "min". De gjorde att gränserna höll, men flera är just sådant som reglerna förbjuder: resultatet rättades i stället för systemet. Brandens tal (gnistan, spridningen, släckningen) ändrades också mot ett resultat, men de är balanstal och står inte som fynd.

## Fynd 1–23 (den första genomgången, kompletterade)

1. **Motgångarna börjar inte förrän byn är 10 dygn gammal** (`motgang.ts:93`, `forstaDygn: 10`). En ny by drabbas aldrig av hård vinter, torka, översvämning eller tornado de första 10 dygnen (10 år i spelet). Kunde vara en faktor på motgångens chans efter byns ålder eller förråd. Litet. **Också:** samma sorts tröskel för rövarna (`rovare.ts:125`, ingen flock under 300 i rikedom), räderna (`rader.ts:61`, under 500) och handlaren (`handel.ts:361`, under 400). Chansen växer redan med rikedomen, så trösklarna behövs inte.
2. **Högst en motgång per tidsålder** (`motgang.ts:16`). Kunde vara oberoende chanser per motgång. Litet till mellan. Designfråga.
3. **Byn sparar fasta reserver till elden** (`forradsmal.ts:81` `sparas`: 6 ved, 15 grenar, 6 hö, 1 flinta). Ett recept eller bygge får inte ta de sista, oavsett vad elden faktiskt förbrukar. Elden styr alltså andra system. Kunde vara eldens del av materialets buffert i förrådsmålen. Mellan. **Också** (hela genomgången): samma reserv stoppar stationer och tillbehör (`stationer.ts:843, 1009`), väggar och dörrar (`bygg.ts:65, 358`) och rep, spjut, korg och metspö (`redskap.ts:74–267`, hö och flinta "sparas till elden").
4. **Inget byggs och inga projekt görs när kylan är en fara, på 18 ställen** (`projekt.ts`, `kan: … !f.kyla`; `val.ts:842`; `steg.ts:1212`). Ett undantag inne i nivåerna i stället för att tiden mot värmen vägs i poängen. Kunde vara en enda dämpning i projektets värde. Mellan. **Också:** hovet och templet (`kyrka.ts:165`), och ett bygge som redan pågår avbryts (`steg.ts:1217`). Bygget har redan en mjuk dämpning för hunger (`val.ts:856`) som kunde användas för kylan.
5. **Vid svält bärs bara mat in, vid kyla bärs inget in** (`val.ts:591–595`). Ett filter i stället för att varje sak som ligger ute har ett värde. Mellan.
6. **Rädda har ett golv på 25 %** (`val.ts:93` `raddaMin`), så att det som inte ruttnar ändå bärs in. Kunde vara värdet av det som ligger ute. Litet.
7. **Förbättra väljs i en fast ordning** (`val.ts:895` `forbattra` och `val.ts:919` `fylla`): försök, teknikarbete, varor till handlaren, underhåll, gå i lära; och mat, ved, grenar, hö. Den som står först tar allt. Kunde vara rader med poäng, som nivå 6. Stort. **Också:** hantverket på fritiden (`craft`, `val.ts:1115–1131`) är samma sorts kedja utan poäng: slakta, rensa, torka, grilla, gå i lära, pröva, projekt, samtal.
8. **Över förrådens tak arbetar ingen, med särskilda undantag för grenar och yxa** (`val.ts:904`, `val.ts:988`). Byn slutar arbeta tvärt vid taket. Det här gör också att en by med fulla förråd slutar arbeta mot nästa teknik (jag såg det i by 2: full mat efter två dygn, sedan fritid i flera dygn utan yxa). Kunde vara ett mjukt tak där värdet av en sak till sjunker med mängden. Mellan. **Också:** ett eget undantag i `bestWork` (`val.ts:997`, `mattad`): veden "mättas" när personen saknar yxa eller kylan är en fara, "annars samlas grenar utan slut".
9. **Bygget väljs bort när timmer saknas och ingen yxa finns** (`val.ts:842–843`). En rättning efter ett fel där grenar samlades utan slut. Yxan är redan ett projekt som bygget kunde ärva bristen från. Litet.
10. **En i taget, hårt, på många rader** (`val.ts`: fågelskrämma, staket, sopor, tömma latrinen, vittja; `projekt.ts`: flytta lager, lera, flytta station, uppsatt, ljus; `eld.ts:385, 391`). Arbetsordningen har redan ett mjukt tak för antal arbetare per rad. Mellan. **Också, och större än jag skrev:** `doingAct` frågar om någon i hela byn gör handlingen. Bara en person i hela byn kan alltså bygga en station eller möbel åt gången, vilken som helst (`stationer.ts:841, 849`), en gör tillbehör (`stationer.ts:1002, 1008`), en grillar, torkar, kokar, steker och bakar (`matlagning.ts:56, 190, 270, 319, 342`), en gör ett redskap per grupp och en slaktar per djurart (`redskap.ts:147–265`), en tänder eld i hela byn (`eld.ts:393`). Det är en flaskhals för hela uppbyggnaden.
11. **Exakt en vakt varje natt, den modigaste** (`val.ts:1200`). Antalet kunde följa hotet (vargar, rövare, varsel) och påbud. Mellan.
12. **Ingen prövar sig fram till en teknik utan överskott av mat och ved** (`teknik.ts:310`, `forsokMat: 1.1`, `forsokVed: 2`). En hård nolla före poängen, fast nivåerna redan sätter farorna först. Kunde vara en faktor som växer med överskottet. Litet. **Också:** samma nolla i sporten (`sport.ts:118`: ingen match under 1,1 dygns mat eller 2 dygns ved) och kyrkskatten (`kyrka.ts:123`: bara när byn har 10 ved över).
13. **Nybyggare kommer under tio invånare, och en tom by grundas på nytt med gratis rötter** (`liv.ts:201`, `liv.ts:323`, `MEDHAVT`). Resultatet "byn dör inte ut" tvingas fram. Kunde följa byns rykte, förråd och grannklanerna. Mellan. Designfråga. **Också:** en by som dött ut grundas på nytt direkt, vad den än dog av (`liv.ts:211`), och de nya får mat "så att man hinner samla innan man svälter" (`liv.ts:310`).
14. **Djurhållningen har en egen gräns för svält** (`boskap.ts:134, 147`, `tamdjur.ts:109`): 2 saker mat per människa, och "ett par blir kvar". Kunde använda samma svältmått som valet av aktivitet, och väga slaktvärdet mot fodret. Litet. **Också:** valpen äts vid samma egna svältmått (`tamdjur.ts:124`). Se också fynd 50 om slakten.
15. **När veden tryter sköts bara den mest använda elden** (`eld.ts:384`). Kunde vara ett värde per eld efter hur många som värmer sig där. Litet.
16. **Vilda hasselnötter plockas "alltid"** (`odling.ts:575, 636`), också när förrådet är fullt. Kunde följa matbristen. Litet.
17. **Högst ett pynt per person** (`stationer.ts:701`). Kunde vara att glädjen av ett pynt till avtar. Litet. **Också:** själva taket står i `stationer.ts:710`; kistan har samma (`stationer.ts:699`), och en kruka som pynt stänger ute en bonad (`kruka.ts:59`).
18. **En främling blir mätt utan att någon mat går åt** (`kyrka.ts:264`, budet om främlingar). De andra buden tar maten ur förrådet. Kunde gå genom gåvan. Litet.
19. **En bybo köper högst tre slag av handlaren, och besöken kläms mellan två gränser** (`handel.ts`, `egnaMax: 3`, `dygnMin/dygnMax`). Litet. Gränsfall: att handlaren inte kommer i istiden är en grundregel. **Också:** högst 2 av varje slag, en gång per besök, och byn handlar alltid före byborna (`handel.ts:582, 693–697`).
20. **Byggplanen föreslår förbättringar först vid 30 ved** (`byggplan.ts:54` `forbVed`). Ett fast tal som inte beror på vad förbättringen kostar. Litet.
21. **Barn hjälper till med det byn behöver mest, med en fast chans att leka** (`val.ts:640`). Kunde vara poängraderna med en vikt efter åldern och barnets egen lust. Litet.
22. **Lagerplatserna växer högst fyra steg i timmen** (`lager.ts:37`). Troligen en spärr för stabiliteten och ingen gaffatejp. Med för att du ska kunna avgöra.
23. **Nästan allt nytt i fas 9 ligger på nivån Rädda** (`val.ts:609–620`): brygga, klippa, mjölka, hamla, hage, staket, fågelskrämma. De går alltså före Försörjning och har ingen koll av om något verkligen behöver räddas, så en hungrig by kan brygga vin av sina bär. Hunden äter också kött under svält. Hittat av felsökningen, inte av gaffatejp-genomgången. Kunde ligga på Förbättra, eller ha poäng efter behovet. Mellan. Den konkreta orsaken står i fynd 34 (bryggningen).

## Nya fynd från hela genomgången

### Rövare, strid och jakt

24. **Byborna får +0,6 i stridsmod och en gratis sten mot rövarna** (`rovare.ts:474`, `strid.ts:646`). **Jag lade själv in den i fasens balans (9.9.4)**, för att byborna flydde för lätt. Det är gaffatejp: stenen är ingen sak byn äger, och modet borde komma ur egenskapen, hotet och rövarnas styrka (balanstalen `ROVARE.styrka/mod`, `STRID.hot`). Litet.
25. **En fredlig by försvarar sig lika bra som en krigisk** (`rovare.ts:414`): seden Fejd/Krig klipps vid noll och kan bara öka viljan. **Också min, från fasens balans.** Seden borde få gå negativ, och resultatet rättas med modet. Litet.
26. **Ingen förälder stannar hos barnen när rövarna kommer** (`rovare.ts:89, 424`). **Också min, från fasens balans**, för att fler vuxna skulle slåss. Kunde vara en faktor för familjeband i `rovarVilja`. Kommentaren i `varg.ts:247` säger fortfarande att föräldern stannar. Litet.
27. **Rövarna vänder om när fler än 1,5 gånger så många väntar med vapen** (`rovare.ts:708`). Striden har redan stridsmodet och hotet, där den svagare sidan drar sig undan; tröskeln går förbi det. Litet.
28. **Rövarna letar i förråden i precis 2 minuter, "så att byn hinner reagera"** (`rovare.ts:742`). Tiden kunde följa antalet lagerplatser och bytets värde. Litet.
29. **Varg- och björnjakt: minst fyra med spjut, högst 6 respektive 8 jägare** (`varg.ts:84, 508`, `bjorn.ts:45–46`). Kvoten mellan jägarnas styrka och djurets säger redan om gruppen räcker. Litet.
30. **Jägaren väljer byte i fast ordning: rådjur, kanin, fågel** (`jakt.ts:143–154`). Kunde vara bytets värde (kött per tid och chans). Att rådjur kräver spjut är en grundregel. Litet till mellan.

### Maten och dryckerna

31. **Byn lagar, steker och bakar under ett fast tak: en rätt och ett bröd per invånare** (`matlagning.ts:270, 319, 342`). Borde vara förrådsmål ur vad byn äter. Litet till mellan.
32. **Torkningen sparar rått för exakt ett dygn och hänger upp resten; högst 4 torkställningar** (`matlagning.ts:165, 183`). Torkad mat har inget eget mål inför vintern. Mellan.
33. **Det som grillas och kokas väljs i listans ordning** (`matlagning.ts:54, 245–253`, `ratter.ts:108`): kött och fisk före säd, vad byn än har över. Kunde vara poäng per råvara (värde, hur snart den ruttnar, överskott). Mellan.
34. **Bryggningen: fast mål på 10 av varje dryck, fast ordning (tappa, vin, öl, mälta), och ingen fråga om bären behövs som mat** (`brygg.ts:41–58`). Bären borde ha sitt värde som mat i förrådsmålen, så att vinet ärver bristen. Mellan.
35. **Man dricker vin och öl utan att välja det och utan att det tar tid** (`rus.ts:63–65`): 15 % chans per kvällstimme, medan man gör något annat, med ett tak på ruset. Borde vara en handling med poäng. Mellan.
36. **Den som är hemma dricker utan tid, i fast ordning mjölk, saft, kokt vatten; teet likaså** (`vatskor.ts:22–32, 109–119`). Mellan.
37. **Den som inte kan gå får vatten utan att någon bär det, och små barn är aldrig törstiga** (`torst.ts:62, 83, 171`). Gratis vatten som tar bort en fara. Mellan.
38. **Vattenhämtningen går i fast ordning: en törstig, sedan ett torrt fält, sedan örtköket** (`torst.ts:207–222`). Ett fält som vissnar väntar alltid. Tre rader med poäng. Litet till mellan.
39. **Örterna i krukorna sätts och plockas utan att någon arbetar** (`kruka.ts:80–103`). Finns redan som steg 10.7.11.
40. **Antalet mjärdar är en fast formel, 2 per 8 invånare** (`fisk.ts:106`), utan koppling till hur mycket fisk byn äter. Litet.
41. **Det byn vill ha av salva, tjära, lim, tvål och rep är fasta antal** (`tillverka.ts:6–31`, `redskap.ts:77, 154`), inte ur förbrukningen. Litet till mellan.

### Förråd och material

42. **Byn slutar leta flinta vid 4 flintor och yxor, och letar inte alls när den svälter** (`steg.ts:942, 1036`, `eld.ts:82, 418`, `val.ts:1056`). Ett eget tak vid sidan av förrådsmålet, på fyra ställen. Litet till mellan.
43. **Bara en famn ved i taget till elden, "så att elden matas oftare"** (`steg.ts:715`). Bördan och eldens behov borde räcka. Litet.
44. **Byn byter aldrig bort de sista 10 av varje material** (`behov.ts:513`). Fast tal i stället för bufferten i förrådsmålen. Litet.
45. **12 korn sparas alltid till utsäde** (`ratter.ts:138`, används i `projekt.ts:175`, `matlagning.ts:244, 308`, `brygg.ts:56`). Talet beror inte på fältens storlek. Litet.
46. **Frön plockas tills byn har "nog" (16 rutor per familj), sedan inga alls** (`odling.ts:598–636`). Borde vara ett förrådsmål ur fälten som planeras. Mellan.
47. **Mossa samlas tills byn har 8** (`halsa.ts:708`), ett eget tak bredvid förrådsmålet för mossa. Litet.
48. **Saker nära lägret bärs inte in när förrådet är fullt, "annars bärs samma saker fram och tillbaka"** (`lager.ts:1126–1135`). Litet.

### Djuren och odlingen

49. **Flocken får aldrig bli större än 12** (`boskap.ts:75, 146`), fast betet och höet redan begränsar. Mellan.
50. **Slakten följer fasta regler: "gammal" vid 75 % av livslängden, höstslakt under 7 hö per djur, och "ett par blir kvar"** (`boskap.ts:144–149`). Kunde vara djurets värde mot fodret. Mellan.
51. **En björk hamlas bara när höet inte räcker, och högst en per dygn** (`slatter.ts:146`). Litet.
52. **Ängen och hagarna läggs ut av byn själv: högst en äng, högst fyra hagar, alltid 6 × 6 rutor** (`slatter.ts:53`, `hage.ts:93–96`). Ingen person väljer det, och storleken följer inte antalet djur. Mellan.
53. **Tamdjurens kön är varannan hane och hona, "så att två djur alltid är ett par"** (`tamdjur.ts:55`). **Min, från 9.9.3.** Kunde slumpas, eller vara handlarens vara. Litet.
54. **Ärterna har en egen såmarginal** (`odling.ts:219`, `g === 'arter'`). Borde följa grödans frosttålighet, som redan står i registret. Litet.

### Bygget och elden

55. **Ett hus får stå där elden står bara om elden går att tända igen, och elden flyttas bara då** (`byggplan.ts:721`, `eldflytt.ts:79`, `bygg.ts:118`). Elden styr bygget. Mellan.
56. **Den som fryser går inte in i ett varmt rum om elden går att tända** (`byggnader.ts:435`). Ett förbud i stället för att vägarna vägs. Litet.
57. **Tändmaterial samlas bara när ingen eld glöder, och kylan räknas som fara bara när ingen eld glöder** (`eld.ts:204`, `val.ts:409`). Att elden finns stänger av faran, hur många som än fryser. Litet.
58. **Högst två brasor, och en ny först när veden räcker fyra dygn per eld** (`brasor.ts:39–40, 101`). Litet till mellan.
59. **Förbättringar föreslås bara när inget behov finns och ingen annan förbättring pågår; en husaffär och ett skadat hus i taget** (`byggplan.ts:748, 500, 401`). Mellan.
60. **Vedboden byggs inte om den tar byns sista vanliga lagerplats** (`byggplan.ts:591`). **Min, från 9.9.3**, efter ett fel. Lagerbristen borde vara en kostnad i vedbodens poäng. Litet.
61. **Ett skadat hus byggs aldrig upp där elden står** (`byggplan.ts:475`), medan ett nytt hus får det mot ett straff i poängen. Litet.
62. **En tom sovsal byter funktion i fast ordning: verkstad, förråd, samling, rivs** (`byggnader.ts:426–429`). Mellan.
63. **Bara vuxna släcker, och bara när det brinner inom 10 rutor från byn** (`brand.ts:598`, `BRAND.hot`). Värdet av det som hotas (fält, förråd, hus) räknas inte. Mellan.

### Tekniken, tron, handeln och människorna

64. **Hö, grenar, lera och virke räknas som "till hands" för teknikernas krav fast inget ligger i förrådet** (`teknik.ts:240–244`). **Min, från 9.9.4 och 9.9.5** ("annars kom ingen på repet"). Tre handskrivna undantag; borde vara en gemensam fråga till värmekartorna om det finns nära byn. Litet till mellan.
65. **Svampens tabu har en särlösning** (`lagar.ts:193–205`): tabut stänger inte samlandet, samlarna låter svampen stå. **Min, från 9.9.4** ("byn svalt"). Tabu borde vara en faktor på handlingens poäng. Mellan.
66. **Minnet behåller en lärdom av varje slag, för att vattnet inte ska glömmas** (`minne.ts:164`). **Min, från 9.9.5.** Taket på 20 lärdomar eller värderingen är det som brister. Litet.
67. **Yxan, spjutet och spaden går genom all is** (`is.ts:35`, "tillfälligt" tills isborren i 7.4.4). Litet.
68. **Ingen byter tillbaka ett slag inom en timme, "så att två inte byter fram och tillbaka"** (`byte.ts:34, 117`). Behovet borde sjunka hos den som fått saken. Litet.
69. **Gästens törst fylls på gratis** (`gastvardag.ts:81`), medan maten i matsäcken tar slut. Litet.
70. **Den som far illa flyttar bara om två andra vuxna blir kvar** (`humor.ts:237`). En spärr mot att byn töms. Litet.
71. **Materialet till kläder väljs i fast rangordning** (`klader.ts:157–171`): kyla, strid, det som saknas, det som finns, det dyra, smak; en tidigare punkt avgör alltid. Kunde vara en summa med vikter. Mellan.

## Gränsfall (osäkra: kan vara grundregler)

Kortare beskrivna. Säg till om du vill ha någon av dem utredd.

72. Viljan att få barn sjunker aldrig under 15 % av matbrist (`steg.ts:125`).
73. Redskapen på rutan tas med hur full bördan än är (`lager.ts:1177`), och en enda sak går alltid att bära (`utrustning.ts:102`).
74. När förrådet saknar plats läggs resten på den minsta stacken, över taket (`lager.ts:539`).
75. Första lagerdelningen är fast: maten på gamla platsen, materialet på den nya (`lager.ts:980`).
76. Maten äts i registrets ordning (`saker.ts:289`), fast näringen och skicket viker av från den.
77. En halvbyggd station har alltid bristen 1 (`forradsmal.ts:233`).
78. Den med empati från 17 stjäl aldrig, och ärkefienden får aldrig något (`behov.ts:212, 333, 407`).
79. `rusta` står på nivå 3 men prövas efter rader på nivå 6 och 9 i registret (`val.ts:596`). Ser ut som ett fel, inte gaffatejp.
80. Buden och fastan bryts när byn (inte personen) svälter eller fryser (`val.ts:774`, `behov.ts:89`).
81. Exakt en hjälpare vid en förlossning, den bästa (`forlossning.ts:41`); vårdaren går högst 30 rutor (`halsa.ts:615`); rövare vårdas aldrig (`halsa.ts:612`).
82. Främlingen som inte hittar en väg flyttas fram (`liv.ts:260`); den som blivit avskuren av vattnet flyttas till land (`torka.ts:95–115`).
83. En olycka mitt i byn gör ingen rädd för platsen (`minne.ts:305`); flinta söks bara där man är 25 % säker (`minne.ts:299`) och inom 30 rutor (`fynd.ts:606`).
84. Rövarna plundrar aldrig så länge någon står kvar (`rovare.ts:625`); skyddet efter en flock (`rovare.ts:127`, redan mjukt); en vargflock i taget, och den drar efter varje förlust (`varg.ts:183, 649`); björnen håller sig 22 rutor från byplatsen och möter var och en högst en gång om året (`djur.ts:447`, `bjorn.ts:76`).
85. Hjälparna går alltid till den som fallit (`strid.ts:473`); vakten går till elden vid vart femte stopp (`vakt.ts:59`).
86. Rövarna hugger en dörr bara när inget ligger ute (`rader.ts:177`); hämnd tar två saker per anfallare (`rader.ts:35`); klaner har alltid minst 3 personer (`klaner.ts:102`).
87. En fråga per kväll på tinget (`rost.ts:24`); den med dåligt anseende kan inte väljas (`styre.ts:275`); man berättar aldrig det dåliga om de sina (`rykten.ts:261`).
88. Redskapet från handlaren ger 0,1 mot tekniken, en gång (`handel.ts:487`); alla som kan odla får sädesodlingen när kornet kommer (`odling.ts:224`).
89. Fältet är 16–64 rutor och en familj har ett fält (`odling.ts:242, 372`); skörden går före faran (`odling.ts:381`).
90. Trädfällningen går i fast ordning: husplats, lager och fält, påbörjat, närmast (`skog.ts:95–105`); skogsvården vaknar först 8 rutor ut (`skogsvard.ts:86`).
91. Djurskötaren går högst 30–60 rutor (`tamdjur.ts:41`, `boskap.ts:87, 110`); hönsen är högst 20 och äter inget (`hons.ts:22, 55`).
92. Ingen plockar där det finns toa-smuts (`smuts.ts:136`); skogen sprids alltid in från kartkanten (`mark.ts:206`).
93. "Byn har aldrig haft eld" är en egen önskan (`eld.ts:181`); tändchansen stiger med försöken "så att otur inte håller elden släckt" (`eld.ts:220`).
94. Bryggor, infarter och stockvägar har fasta antal och trösklar (`byggplan.ts:531, 617, 639`); högst ett förrådshus per slag och ett samlingshus (`byggnader.ts:108, 171`); familjehus kräver tre i familjen (`byggnader.ts:224`).
95. Byggordningen på biten: lagning, jordgolv, väggar, trägolv (`bygg.ts:123`); ingen utbyggnad närmare elden än 4 rutor (`byggplan.ts:293`); ett hus på ett stråk bara med högst 3 rutors omväg (`strak.ts:22`).
96. Skadade ben sänker aldrig farten under hälften (`gang.ts:28`); branden når aldrig längre än 40 rutor (`brand.ts:81`); byn vill ha facklor över hela byn utan mörkerbehov (`ljus.ts:169–200`).
97. Förbättra är aldrig tom (`teknik.ts:341`); en lärling per mästare (`teknik.ts:405`); ett framträdande per kväll och en match i taget (`framtradande.ts:226`, `sport.ts:103`).
98. Högst tre offrar per högtid (`kult.ts:233`); högst fyra trosriktningar (`religion.ts:273`); prästens förslag i fast ordning (`kyrka.ts:128`); bålbegravning utan ved blir bål ändå (`grav.ts:83`).
99. Ingen bygger eller sover där vattnet nått (`sjo.ts:160`); mjärden vittjas först vid 2 fiskar (`fisk.ts:30`); latrinen töms först vid 85 % och resterna bärs bort först vid 3 (`rester.ts:17, 66`).

## Bedömt som grundregler, inte med

Receptens krav, att man bär två saker, att vattnet fryser, kompostens innehåll, arbetsordningens nivåer, ålderskraven, vargarnas och björnens antal, rövarnas storlek och tröskeln för att välja ledare. Dessutom kroppen och hälsan (skador, blod, infektion, sjukdomarnas dödlighet), stridens mekanik, vad vädret tillåter, var man får bygga, ägandets och arvets ordning, lagarnas innehåll, motgångarnas styrka, och alla tekniska skydd (cachar, tak på sökningar, golv mot avrundning).
