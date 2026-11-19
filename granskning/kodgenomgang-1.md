# Kodgenomgång: förenklingar, buggar och optimeringar

Grenen varld, commit 1a090cb7. Inget i koden är ändrat. Hela spelet är läst och prövat: simuleringen, gränssnittet, programmets ram, testerna, scenarierna och bildstilen, och fyra läsningar på tvären (död kod, dubbletter, takterna och valen).

Varje fynd är prövat av en andra läsare som försökte motbevisa det. Vinst och risk är 1 till 5. Listorna är sorterade efter mest vinst för minst risk.

## Del 1: håller

Stämmer i koden och är värt att göra.

### Ta bort (93)

**1. Hela konceptkartan av världen i fas11.js ritas aldrig ut**  
Var: `bildstil/fas11.js:1-549`. Vinst 4 av 5, risk 1 av 5, liten ändring, ungefär 549 rader bort.  
I dag: Första blocket i fas11.js (rad 7-549, ca 51 KB av filens 103 KB) bygger en egen liten värld och ritar en pergamentkarta med händer, runband och stämpel. Resultatet läggs i en lokal konstant (R6) som ingen läser. Blocket lägger inget kort i VAL och lämnar inget till resten av sidan. Kommentaren på rad 547-548 säger att korten är borttagna och att ritningen bara är kvar som förlaga. Det den var förlaga till är byggt: världskartan på pergament finns i src/ui/pergament.ts och src/ui/varldbild.ts, och karavanen är avbockad i Färdplanen (11.11.6, v532). Blocket räknas ändå ut varje gång bildstilens sida öppnas.  
Förslag: Ta bort rad 1-549 (kommentaren överst och hela blocket), så att filen börjar med blocket om tecknen på världskartan. Namnen K5, R6, iBojd, KARAVANER och HAND_KANT finns bara inne i blocket. Ordet utsnitt finns på andra ställen men är där andra, egna saker. Förlagan finns kvar i git-historiken.  
Ändras i spelet: Ingen märkbar skillnad. Spelet läser inget härifrån. Bildstilens sida blir ca 50 KB mindre och slipper räkna ut en värld vid start.  
Prövningen: Blocket är ett slutet stycke kod som inte lämnar något ifrån sig, och det som det var förlaga till är redan byggt och avbockat i Färdplanen. Inget annat i bildstil/ använder dess namn.

**2. Ta bort hela fas6.js (alla sju korten tas redan bort när sidan laddas)**  
Var: `bildstil/fas6.js:1-845, bildstil/bygg.cjs:17, bildstil/README.md:11, kommentarer som pekar på fas6.js (src/ui/buske.ts:4, bildstil/djurtillspelet.cjs:7-12, bildstil/svar/a-fas6.js:2, bildstil/fas7.js:1-2, bildstil/anim.js:395)`. Vinst 4 av 5, risk 2 av 5, liten ändring, ungefär 845 rader bort.  
I dag: fas6.js lägger sju kort i valdelen: f6_i_bjorndodare, f6_lagerton, f6_nattfarg, f6_band, f6_siffror, f5_grodd och f6_brinner. Alla sju tas bort igen av senare filer när sidan laddas (fas7/7.8-nya.js, svar/0-beslut.js och svar/z-beslut.js). Filen ligger i en egen stängd ruta och lämnar inget till andra filer: ingen window-export, och inget skript läser filen som text (djurens bilder ligger redan i radjur.json, fagel.json och bjorn.json). Den sista biten (rad 841-845) ritar ingenting alls. Nästan allt annat i filen (näver, talg, fackla, buskar, rådjur, fåglar, björn) hör till kort som redan är inbyggda i spelet och aldrig läggs i valdelen.  
Förslag: Radera fas6.js och raden i bygg.cjs. Skriv om raden om fas6.js i README och rätta kommentarerna som pekar dit. Bygg bildstilen och se att valdelen har samma kort som förut. Görs detta behövs inte den del av fyndet om anim.js som tar bort TORNADOSCEN i fas6.js.  
Ändras i spelet: Nej. Spelet läser inte filen. Bildstilens sida blir ungefär 86 KB mindre och visar samma kort.  
Prövningen: Jag gick igenom alla sju korten och hittade stället där vart och ett tas bort. svar/a-fas6.js lägger själv in sina nya versioner av grodden, den som brinner och siffrorna om det gamla kortet saknas, så inget annat går sönder. Det som går förlorat är de gamla ritningarna som förlaga, men de är inbyggda i spelet.

**3. Ta bort scenerna i mark.js som ingen visar längre (ca 400 rader)**  
Var: `bildstil/mark.js: W, SCEN, ar, linjeAvst, folk, torraka (160-178), torrBjork (275-285), STADIER, sjoAvst, vatten (307-353), STIGAR, stigAvst2, skogE, vagstreck, tuvorRen, stigarRen, snoRen, skogskantRen, stadierRen, tidTrad, stadierTid, TIDNAMN, TIDTEXT, fallnaTid, brandVinter, T, lund, brandMark, svart, brandGran, brandBjork, brand, STUBBAR, stubbar, fallna; bildstil/README.md:7; src/ui/trad.ts:4-5 och 50 (kommentarer som pekar på torrakan i mark.js)`. Vinst 4 av 5, risk 2 av 5, ett steg, ungefär 400 rader bort.  
I dag: mark.js lämnar ut elva saker (rad 788): grasPunkt, tuvor, tidMark, fram, granVariant, bjorkVariant, stubbe, fallet, snoMossa, spelSd och spelVatten. Läsaren missade två: fram används i svar/c-stationer.js:138, och tidMark lämnas ut men används bara av de döda scenerna. Allt annat nås inte från något av namnen: vattnet, stigarna, snön, skogskanten, stadierna, årstiderna, lunden, brandskogen, torrakorna och scenerna med stubbar och fallna träd. Jag räknade till ungefär 400 hela rader. Marken och träden är inbyggda i spelet (stegen 5.1.3 och 5.1.4 är avbockade i Färdplanen, och spelet har egna ritningar i src/ui/mark.ts och src/ui/trad.ts).  
Förslag: Ta bort de hela funktioner och listor som räknas upp under filer, och tidMark ur exporten (den har ingen levande användare). Behåll fram. Låt gran och bjork vara som de är inuti: de ritar stubbarna och de fällda träden som spelet får genom stubbtillspelet.cjs, och de döda grenarna där (gran version 0-2, snö på granen, björk version 0-2, vårens löv) är få rader. Rätta raden i README och kommentarerna i src/ui/trad.ts som säger att torrakan finns i mark.js. Bygg bildstilen och kör stubbtillspelet.cjs: src/stubbilder.ts ska bli exakt som förut.  
Ändras i spelet: Nej. Spelets stubbar och fällda träd ritas av funktioner som blir kvar. Bildstilens sida visar samma kort.  
Prövningen: Det stämmer att scenerna inte nås, men läsarens lista över vad som används var ofullständig (fram används). README säger att ritningarna är förlaga tills marken och träden byggts in, och det är gjort. Jag avråder från att också skära inne i gran och bjork: där är vinsten liten och risken är att spelets stubbilder ändras.

**4. Den gamla vägen "stå vid busken och samla" finns kvar men körs aldrig**  
Var: `src/sim/steg.ts:816-817, 1112-1119, 1121-1124, 1163-1166, 1546 (parametern tom), 1589-1592; src/sim/val.ts:378-390 (nastaBuske); src/sim/fynd.ts:693-710 (pickMushrooms); src/sim/plats.ts:11 (PLATS.vidare); kommentarer i src/sim/handlingar.ts:54, src/sim/minne.ts:338, src/test/scenarier/redskap.ts:74`. Vinst 4 av 5, risk 2 av 5, ett steg, ungefär 50 rader bort.  
I dag: Bara samla har fältet fart, och samla har runda. Därför går samlandet alltid genom rundaSteg. tidTillTom räknas aldrig, grenen i UTFALL.samla utan plock nås aldrig, och nastaBuske och pickMushrooms anropas aldrig (inga tester eller gränssnittet använder dem heller). Blocket på rad 1589-1592 gör i dag bara en sak: arbetet (jakten) slutar när platsen är tom.  
Förslag: Ta bort tidTillTom, parametern tom, grenen utan runda i UTFALL.samla, pickMushrooms, nastaBuske och balanstalet PLATS.vidare. Skriv blocket 1589-1592 som det enda det gör. Rätta kommentarerna som nämner nastaBuske.  
Ändras i spelet: Ingen märkbar skillnad: koden körs inte i dag.  
Prövningen: Jag sökte i hela src/: inget annat anropar funktionerna, och ingen annan handling har fart. Den döda vägen gör motorn svårare att läsa och är det som håller kvar den globala variabeln plockSlag.

**5. Porträttfilen bär 100 KB beskrivningar och 3 350 rader luft**  
Var: `src/portrattkarna.ts:5-3361 (PORTRATT med ett tal per rad), 3362 (DELAR, en rad på 249 KB); bildstil/portratttillspelet.cjs:21-22 och 27-28`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 3350 rader bort.  
I dag: Filen skrivs av ett skript ur bildstilen. Registret PORTRATT skrivs med indrag (3 357 rader, 66 KB mot 38 KB på en rad). Var och en av de 165 delarna har kvar bildstilens arbetstexter: "om" (97 KB ritbeskrivningar), "av" (8 KB) och "ritad". Jag sökte i porträttkärnan, ui/utseende.ts, ui/folkbild.ts och testet kontroll.ts: ingen läser om, av eller ritad. Kärnan läser bara bilder, man och barn i delarna. Luften försvinner när spelet byggs, men texterna följer med i spelets fil.  
Förslag: Låt skriptet stryka om, av och ritad ur delarna (och PORTRATT.om) och skriva PORTRATT på en rad. En ändring i bildstil/portratttillspelet.cjs, sedan skrivs filen om. Bildstilens egna filer rörs inte.  
Ändras i spelet: Ingen skillnad i spelet. Spelets fil blir ungefär 105 KB mindre och källfilen 130 KB mindre.  
Prövningen: Stämmer: ingen kod läser texterna, och de står bara i en fil som ett skript skriver. Ändringen görs på ett ställe och porträtten ritas ur samma data som förut.

**6. Ta bort död scen- och sportkod i sida.js**  
Var: `bildstil/sida.js:263-353, 760-818, 838-911, 919-967`. Vinst 3 av 5, risk 1 av 5, ett steg, ungefär 265 rader bort.  
I dag: Bildstilens sida har kvar ritkod för val som Björn redan gjort och som är inbyggda i spelet: slaktbänken i tre versioner (ritaSlakt), forstorad, LED_M, grillen (grillStil, GRILL_L), SIKTA_BAGE, SMYG_*, SYM8_M, AKT_L, KANIN_L, torkan (torka, TK_*), tornadon uppifrån (virvel, tnUppifran, TN_*), TOA_*, eldsvådan (BR_*, ritaBrandSammanhang, BRAND_M), dragkampen (ritaDragkamp, DRAG_BILD), sporterna (bage, ritaSporten, SPORT_BILD, SPORT_JA, SPORT_VAL) och de långa dataraderna SCEN_HOJD, KULT_L och KULT (rad 816-818, ca 17 000 tecken). Jag sökte varje namn i hela bildstil/ (js, cjs, mjs, html) och i src/: inget av dem används någon annanstans. Listan VAL på rad 968 är tom och säger själv att sporterna är inbyggda och borttagna. Ett fel i fyndet: funktionen spelare (rad 912-918, med SPELARE_N) används av mark.js på åtta ställen och ska vara kvar.  
Förslag: Ta bort allt i listan utom spelare och SPELARE_N. Behåll också punkter, klot och linje (rad 821-837), som andra filer kan använda. Rör inte raderna som de tre verktygen klipper ur filen: portratttillspelet.cjs (färgerna till BAYER, Bild till spelets pixelbild, hx2/tillHex/blanda) och animtillspelet.cjs (allt fram till rubriken om kistan, rad 228). Inget av det döda ligger i de delarna. Bygg bildstilen och kör kontrollen efteråt.  
Ändras i spelet: Nej. Det gäller bara bildstilens sida, som blir ungefär 30 000 tecken mindre. Sidan ser likadan ut.  
Prövningen: Allt utom spelare är oanvänt överallt, och spelets genererade filer tar inget ur de här raderna. Fyndet måste rättas på en punkt: spelare används av mark.js och får inte tas bort. Designdokumentet behövde inte sökas; det gäller ritverktyget, inget system i spelet.

**7. Ta bort den döda koden för stockvägens och bryggans kort i fas7.js**  
Var: `bildstil/fas7.js: VAGAR (76-94), stockvag (95-120), STOCKVAG (121), OJAMN (171), STRAND, VAGEN, BX, BY, BL (179), iBrygga (180), BRYGGOR (183-187), brygga (188-238), BRYGGA (239), VAL.push (241-251), brygga i exporten (256), rubrikkommentaren rad 2; bildstil/fas7/7.8-nya.js:5 (BORT)`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 139 rader bort.  
I dag: fas7.js lägger korten f7_stockvag och f7_brygga i valdelen, och fas7/7.8-nya.js tar bort dem direkt igen (listan BORT). Koden som ritar korten ligger kvar, ungefär 140 rader. F7.brygga lämnas ut men ingen fil hämtar den. Stockvägen och bryggan är inbyggda i spelet (src/ui/foremal.ts). Funktionen ojamn hämtas bara av fas7/7.3b-vagar.js, och bara med version 0. Jag såg dessutom att korten där (f7_karra, f7_bro, f7_torg) också står i BORT, så ojamn och scenerna i 7.3b-vagar.js är troligen döda de med.  
Förslag: Ta bort det som räknas upp under filer och de två id:na ur BORT. Behåll formerna, lagg, PA_MARK, PA_RAD, bildfil, gras, R, hash, KORT och tills vidare ojamn med OJAMNA och DELAR. Att förenkla ojamn till en enda version är inte värt besväret. Gå i stället igenom fas7/7.3b-vagar.js för sig: försvinner den kan ojamn tas bort helt. Bygg bildstilen och se att valdelen är som förut.  
Ändras i spelet: Nej. Bara bildstilens källkod blir kortare.  
Prövningen: Jag sökte i alla filer i bildstil/ och ingen hämtar brygga ur F7. Båda korten tas bort vid laddningen, så koden ritar aldrig något.

**8. Ta bort scenerna i gui.js som ingen visar (men låt hörnen i gui.json vara)**  
Var: `bildstil/gui.js: bild (10-15), STENAR (49-52), BANDEN, BAND (55-63), VAG (66-72), vinkel, framsteg, STEG, FRAMSTEG, ring, RINGAR, TARTFARG, tart, TARTA (79-135), FORSLAG (173-176), T och kommentarerna 179-182; bildstil/README.md:9`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 110 rader bort.  
I dag: gui.js lämnar ut runsten, nyttBand, FLIK, EMB, SW och SH (window.GUIRITA). De används av guitillspelet.cjs, som gör spelets runstenar och band, och av kortet Byns tal i fas9/9.2-rattelser.js. Resten av filen är scener som inte läggs i valdelen: stenarna, banden, vågbandet, framstegscirkeln, ringen, tårtan och förslagen, ungefär 110 rader. En kommentar i filen säger att de ligger kvar som referens. Allt det är inbyggt i spelet (src/ui/framsteg.ts, src/ui/runstenar.ts, src/guibilder.ts). Däremot stämmer det inte att horn.ring och horn.ogla i gui.json är olästa: ritverktyget (rita.js:23) listar alla hörn som bilder man kan öppna, och två kommentarer (gui.js:74-75 och guitillspelet.cjs:4) säger att de ligger kvar om Björn ångrar sitt val av hörn.  
Förslag: Ta bort de döda scenerna i gui.js. Behåll runsten, nyttBand, FLIK, EMB, SW, SH, mask, MONSTER, fyll och exporten. Rör inte gui.json. Rätta raden i README. Kör sedan guitillspelet.cjs och se att src/guibilder.ts blir exakt som förut.  
Ändras i spelet: Nej. Spelets bilder görs av funktionerna som blir kvar.  
Prövningen: Scenerna i gui.js är döda och redan inbyggda i spelet, så de kan tas bort. Delen om gui.json faller: hörnen syns i ritverktyget och ligger kvar med avsikt om Björn ångrar sig. Vill han ändå ta bort dem är det hans val (ca 60 KB mindre sida).

**9. Död gren i bilder.mjs: API:ts eget val av bästa version körs aldrig**  
Var: `bildstil/api/bilder.mjs:341 (const tre = true), 373 och 386-402 (else-grenen), 172-191 (valet), 251-258 (spara), 93-97 (schema med val), 298-303 (uppskattning med tre)`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 48 rader bort.  
I dag: I kommandot rita/tre står const tre = true och sedan if (tre) … else …. Else-grenen, där API:t själv väljer den bästa versionen och sparar den, kan aldrig köras. Kommentaren säger att API:t inte väljer åt Björn (efter bildstil v236). Funktionerna valet och spara och val-fältet i schemat används bara där. uppskattning anropas bara med tre = true.  
Förslag: Ta bort else-grenen, funktionerna valet och spara, parametern i schema och tre-parametern i uppskattning. Låt det som står i if (tre) stå utan villkor. Den enkla kontrollera() ska vara kvar, den används av kontrolleraAllt.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Det stämmer rad för rad: grenen kan inte nås, och den gör det Björn sagt att API:t inte ska göra. Att ta bort den ändrar ingenting i en körning.

**10. Ta bort de döda platshållarritarna RITA i skapare.js**  
Var: `bildstil/skapare.js:3-5, 177-436, 456, 476-505; src/portrattkarna.ts (genererad kopia, t.ex. rad 3647)`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 230 rader bort.  
I dag: RITA har grå platshållare för varje sorts porträttdel, från tiden innan delarna var ritade. Jag räknade mot portratt.json och delar/: alla delar i sorterna huvudform, öra, näsa, öga, ögonbryn, mun, frisyr, skägg, huvudbonad, smycke, rynkor, ärr, blåmärke, förband och redskap har en ritad fil, och rocken (plagg-rock) också. Skönhetsdelarna har fil och plats, utom 'sneda drag' som inte ritar något lager alls. Platshållarna för de sorterna nås därför aldrig. Bara kropp, skalle, remmar, blod och ögonlapp används. Koden kopieras dessutom in i spelets src/portrattkarna.ts, så den döda delen finns två gånger. Rubrikkommentaren säger fortfarande 'Inga delar är ritade än'. Tatueringarna har ingen platshållare alls, vilket visar att reserven inte behövs i praktiken.  
Förslag: Behåll kropp, skalle, remmar, blod och ögonlapp. Ta bort de andra platshållarna och förenkla raderna 476, 479, 493, 498 och 505. Byt reserven på rad 456 mot att en del utan fil ritas som ingenting (annars kraschar sidan och spelet om en fil saknas). Rätta kommentaren överst. Kör sedan node bildstil/portratttillspelet.cjs så att src/portrattkarna.ts byggs om, och pröva med scenariot portratt att porträtten är desamma.  
Ändras i spelet: Nej, porträtten ritas likadant. En ny del som läggs i registret innan den ritats syns inte som grå platshållare längre, utan inte alls. I dag ritas nya delar direkt (api/rita.mjs lägger in bilden innan den visas), så det märks knappast.  
Prövningen: Räkningen mot registret och filerna bekräftar att platshållarna är onåbara, och de ligger dubbelt (också i spelets genererade fil, ca 230 rader till där). Risken är att reserven tas bort utan skydd för en saknad fil; därför ska en del utan fil ritas som ingenting.

**11. Animationskorten i anim.js som inte längre visas (död kod, ca 200 rader)**  
Var: `bildstil/anim.js:17 (SCEN), 22 (SLAG), 24-71 (RORELSER, REDSKAP, huvud, redskap, MATERIAL, splitter, traff), 90-126 (strandAvst, SKOLJ, stranden, VAGTON, vagor), 165-170 (brand), 286-396 (exempelfigurerna, figur, handling, HANDLINGAR, de fyra korten, window.TORNADOBILD); bildstil/fas6.js:781-788 (TORNADOSCEN); bildstil/README.md:10`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 200 rader bort.  
I dag: Korten med rörelserna, effekterna, tornadon och branden togs bort från bildstilens sida när allt byggdes in i spelet (v350–v354). Koden som ritade dem ligger kvar. Ingen läser den: de fyra korten läggs aldrig in i VAL, TORNADOSCEN i fas6.js används aldrig, och animtillspelet.cjs hämtar bara elden, röken, gnistorna, branden, tornadon och klockan. Spelet har egna rörelser och redskap i src/ui/arbetsbild.ts och egna vågor i src/ui/mark.ts. README säger att ritningarna står kvar som förlaga.  
Förslag: Ta bort allt i anim.js som bara korten använde. Behåll det animtillspelet.cjs hämtar: TAKT, HASTIGHET (alla rader, spelet läser också vågornas och strandens takt), EGNA, bild, prick, puff, rok, gnistor, LAGOR, brandBild, BRANDBAS, tornado, TN, TNMATT och STORLEKAR. Ta bort TORNADOSCEN i fas6.js och window.TORNADOBILD. Skriv om meningen i README om att ritningarna finns kvar som förlaga. Kör sedan node bildstil/animtillspelet.cjs och se att src/animbilder.ts blir exakt som förut.  
Ändras i spelet: Ingen skillnad i spelet. Bildstilens sida blir lite mindre.  
Prövningen: Jag hittade ingen användare av korten eller TORNADOSCEN någonstans, och spelet har egna versioner av rörelserna och vågorna. Designdokumentet säger att alla animationer är godkända och inbyggda (5.1.9, 5.2.4.8), så förlagan behövs inte längre.

**12. Den gamla sjukklockan (sickUntil) lever kvar bredvid sjukdomsregistret**  
Var: `src/sim/sjukdom.ts:134, 148, 150, 154; src/sim/steg.ts:744, 751; src/sim/ekonomi.ts:19, 32; src/sim/folk.ts:76, 233; src/sim/torst.ts:55, 197; src/sim/behov.ts:113, 117; src/sim/matlagning.ts:111; src/sim/fynd.ts:729; src/sim/gast.ts:178; src/ui/flikar/person.ts:303, 309; src/sim/typer.ts:262; testerna: src/test/scenarier/kontroll.ts:366, religion.ts:144, redskap.ts:243`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 25 rader bort.  
I dag: Ingen kod i spelet sätter p.sickUntil längre. Ändå har isSick, svartSjukNu, ligger, sjukOrkar, sickFactor, hälsosteget och personfliken en gren för den. p.sickWhy skrivs på fyra ställen men visas bara när den gamla klockan går. Balanstalen KROPP.sjukTim, EKONOMI.sjukArbete, TORST.magMin och TORST.magSpann används bara av de grenarna eller inte alls. I torst.ts finns en gren för uppgiften 'fatt' från äldre sparade byar. Tre scenarier rör fälten: kontroll.ts gör en person sjuk med sickUntil, religion.ts sätter den, och redskap.ts letar efter texten i sickWhy.  
Förslag: Ta bort sickUntil och sickWhy ur typerna och alla grenar som läser dem, de fyra balanstalen och 'fatt'-grenen. Ändra de tre scenarierna så att de gör någon sjuk med insjukna och läser orsaken ur p.sjuk.why. De många 'sickUntil: undefined' i testerna kan strykas.  
Ändras i spelet: Nej. Den gamla sjukdomen varade bara några timmar i spelet (under en timme i verkligheten), och spelet följer den verkliga klockan, så ingen sparad by har en sådan klocka som fortfarande går.  
Prövningen: Sökningen över hela src/ visar att bara tester sätter sickUntil och att sickWhy bara läses i den gamla grenen och i ett scenario. Tre scenarier måste ändras samtidigt, annars blir de röda.

**13. Den gamla sjukklockan (sickUntil, sickWhy) och fyra balanstal är döda**  
Var: `src/sim/folk.ts:76-79,233-234, src/sim/steg.ts:744,751, src/sim/sjukdom.ts:134, src/sim/gast.ts:178, src/sim/typer.ts:262, src/ui/flikar/person.ts:303-309, src/sim/fynd.ts:729, src/sim/behov.ts:113,117, src/sim/matlagning.ts:111, testerna kontroll.ts:366, redskap.ts:243, religion.ts:144`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 15 rader bort.  
I dag: Före sjukdomssystemet var man sjuk till ett klockslag (p.sickUntil). Ingen kod i spelet sätter det längre; bara ett test (kontroll.ts:366) och gamla sparade byar har det. Ändå läses det i stegen, i isSick, hos gästerna och i personfliken. Orsaken (p.sickWhy) sätts på fyra ställen men visas bara i den gamla grenen; ett test (redskap.ts:243) läser den för att se att någon blev magsjuk. KROPP.sjukMin, sjukSpann och svartSjuk läses ingenstans, och sjukTim bara av den gamla klockan.  
Förslag: Ta bort sickUntil och sickWhy ur typen och alla läsningar och skrivningar, ta bort de fyra balanstalen och låt uppgraderingen av gamla sparningar rensa fälten. Testet i kontroll.ts gör personen sjuk med p.sjuk i stället, och testet i redskap.ts frågar p.sjuk eller byns räknare. Raderna 'sickUntil: undefined' i testerna stryks.  
Ändras i spelet: ingen märkbar skillnad (en gammal sparad by där någon just var sjuk på det gamla sättet blir frisk direkt)  
Prövningen: Stämmer: inget i spelet sätter klockan, och talen läses inte. Två tester använder fälten och måste skrivas om samtidigt.

**14. Kontroller som inte kan bli röda**  
Var: `src/test/scenarier/byggnader.ts:2441, 2186, 2072, 2117, 2057, 2071, 2109, 1530, 2114, 935, 989`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Sju kontroller är alltid gröna. Rad 2441 har villkoret 'true'. Rad 2186 sätter s.infart = {klar:1} fyra rader ovanför och kollar sedan samma fält. Rad 2057 kollar att personPart har fältet 'over', som alltid finns (det är en funktion). Rad 2117 kollar att byn har en lagerplats, vilket en ny by alltid har. Rad 2071 slutar med 'b !== undefined', som alltid stämmer i en by med sex personer. Rad 2072 och 2109 kollar att de borttagna LAGER.zoner och MATERIAL.stolpe inte finns. Fyra kontroller har en bakdörr: 1530 ('eller inga högar alls'), 2114 ('om det inte regnar räknas det som rätt'), 989 ('om inga träd fanns') och 935 (området får vara lika stort fast texten säger större).  
Förslag: Ta bort de sju som alltid är gröna, eller ge dem ett riktigt villkor (rad 2441: att något ligger utanför lagret efter flytten; rad 2186: fråga spelets egen funktion om handlaren kan komma på vintern). Ta bort bakdörrarna i 1530, 2114 och 989, och pröva sedan med stegens scenarier (lagerivagen, skjul, strak, omrade) att de fortfarande är gröna. Rad 935 görs bara strikt om området verkligen växer i den byn.  
Ändras i spelet: Ingen skillnad i spelet. Grönt betyder sedan att något verkligen prövats.  
Prövningen: Alla elva raderna stämmer med koden. En detalj i fyndet var fel beskriven: rad 2057 är alltid sann för att fältet alltid finns, inte för att uttrycket ger sant åt båda håll. De skärpta kontrollerna måste köras en gång, för de kan bli röda på riktigt. Designdokumentet söktes inte: fyndet gäller bara testkod.

**15. Ta bort oanvända former(P) i sida.js**  
Var: `bildstil/sida.js:576-577, 596-723`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 130 rader bort.  
I dag: Funktionen former(P) (rad 599-723) byggde porträtt av ellipser och polygoner i den gamla porträttstilen. Ingen fil anropar den; funktionen former i fas6.js är en annan, lokal funktion med samma namn. Raden före (hex, mix, shade) används bara inne i former: det hex som skapare.js har är en egen metod, inte det här namnet. Konstanten Z = 6 på rad 577 används inte heller; de Z som finns i andra filer är lokala. morkare (rad 132) används av kartfiguren och ska vara kvar.  
Förslag: Ta bort former, hela aliasraden (hex, mix, shade), rubriken 'i dag mot förslaget' och const Z. Behåll hx2, blanda och morkare.  
Ändras i spelet: Nej. Bara bildstilens sida blir kortare.  
Prövningen: Sökningen i bildstil/ och src/ visar att former(P), hex, mix, shade och Z bara finns här. Raderna ligger utanför det som verktygen klipper ut till spelet.

**16. Kortsteg-mätaren mäter inte längre det den säger**  
Var: `src/test/kortsteg.ts:1-58; package.json (kortsteg); CLAUDE.md (raden om npm run kortsteg); jämför src/sim/steg.ts:393-404 och src/test/kostnad.ts`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 60 rader bort.  
I dag: kortsteg stegar testbyarna med 300 till 0,25 sekunder per anrop och säger sig mäta vad olika slaglängder kostar (steg 10.1.1 och 10.2.13, båda byggda). Men sedan steg 10.2.14 delar spelet självt upp tiden i slag om 2 sekunder (KLOCKA.slag), oavsett hur långt anropet är. Kolumnerna mäter därför nästan samma sak, och uppskattningen 'glest' gäller en fråga som redan är avgjord. kostnad och ikapp mäter det som behövs i dag.  
Förslag: Ta bort kortsteg.ts, raden i package.json och raden i CLAUDE.md. Vill man pröva en annan slaglängd: `BALANS="klocka.slag=1" npm run kostnad`. Låt ikapp och kostnad vara som de är; deras gemensamma del är bara tre rader.  
Ändras i spelet: Ingen skillnad i spelet. Tabellen över slaglängder försvinner; den visar ändå inte längre det rubriken säger.  
Prövningen: Stämmer, och mer än läsaren såg: verktyget är inte bara överspelat utan visar missvisande tal, eftersom anropets längd inte längre styr slagets längd. Inget annat i koden använder filen.

**17. Provknappen minne.platser och dess två testprogram**  
Var: `src/sim/minne.ts:31, 207, 224; src/test/lardom.ts (21 rader); src/test/lardom-en.ts (18 rader); package.json:28; CLAUDE.md:110`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 44 rader bort.  
I dag: Balanstalet MINNE.platser finns bara för provet i steg 10.2.64 (stänga av lärdomarna om var bär, vilt och fisk finns). Det läses i observe och plockad. Två testprogram och kommandot npm run lardom finns bara för provet, och CLAUDE.md har en rad om kommandot.  
Förslag: Ta bort talet, de två villkoren, de två testfilerna, kommandot lardom och raden i CLAUDE.md. Provet är gjort och resultatet står i steget i Färdplanen.  
Ändras i spelet: Ingen märkbar skillnad (talet är 1 i spelet). Provet går inte att köra om utan att talet läggs tillbaka.  
Prövningen: Stämmer: inget annat i src läser talet eller filerna. Steg 10.2.64 är avbockat (v527) med resultatet inskrivet. Resultatet visade att lärdomarna skickar samlare till plockade platser; vill Björn mäta det igen efter en rättning behövs provet, annars kan det bort.

**18. Fjorton exporter som aldrig används, bland dem samlarrundans gamla sökning nastaRuta**  
Var: `src/sim/val.ts:391-413 (nastaRuta med kommentar), src/sim/folk.ts:259-262 (doingAct), src/sim/djur.ts:298,344 (arFlockdjur, RADJUR_UT), src/sim/fynd.ts:669 (flintorOchYxor), src/sim/kruka.ts:22 (KrukSlag), src/sim/ratter.ts:65 (MALTIDSNIVA_LIST), src/sim/sjukdom.ts:152,188 (sjukVilar, smittadAv), src/sim/slatter.ts:234 (iFahuset), src/sim/tamdjur.ts:44 (DRAGDJUR), src/sim/tatuering.ts:31 (klanStil), src/sim/varldkronika.ts:31 (VARLDHANDELSE_IDS), src/ui/hjalp.ts:57 (merKnapp)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 42 rader bort.  
I dag: Namnen finns bara där de definieras. Jag sökte vart och ett i src, bildstil och test, och räknade dessutom alla exporter i src/sim maskinellt: tretton i src/sim och merKnapp i gränssnittet nämns ingen annanstans. Störst är nastaRuta, rundans gamla val av nästa ruta (18 rader plus fem rader kommentar). doingAct gör nästan samma sak som andraGor på raden ovanför.  
Förslag: Ta bort alla fjorton. Typkontrollen visar direkt om något ändå behövs. DRAGDJUR hör till släden (steg 10.10.3) och kan skrivas igen på en rad den dag något läser den.  
Ändras i spelet: Ingen märkbar skillnad: koden körs aldrig.  
Prövningen: Alla fjorton är bekräftat oanvända, också av testerna och bildstilen. Typkontrollen fångar ett misstag, så risken är mycket liten.

**19. Tolv funktioner och listor som ingen använder**  
Var: `src/sim/folk.ts:259 (doingAct); fynd.ts:669 (flintorOchYxor); slatter.ts:234 (iFahuset); tatuering.ts:31 (klanStil); val.ts:396 (nastaRuta); sjukdom.ts:152,188 (sjukVilar, smittadAv); samt DRAGDJUR, MALTIDSNIVA_LIST, RADJUR_UT, VARLDHANDELSE_IDS, arFlockdjur`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 30 rader bort.  
I dag: De tolv namnen ovan finns bara där de definieras (sökt på hela ord i src, också testerna och gränssnittet). Ytterligare ett antal används bara av testerna: wantsFlint, forbattraKandidater, mostUrgent, freeSpear, isSpear, spears, makeTool, svavar, storeFull, krukaVill, insatsPer, golvLedigt. Några av dem är hjälpare som testerna behöver för att ställa upp en by (t.ex. makeTool), andra prövar kod som spelet inte kör.  
Förslag: Ta bort de tolv oanvända. Gå igenom de som bara testerna använder en i taget: en hjälpare för uppställning får vara kvar; en funktion som spelet slutat använda tas bort tillsammans med kontrollen, eller så frågar testet det spelet faktiskt kör.  
Ändras i spelet: Ingen skillnad.  
Prövningen: De tolv är säkert döda och går att ta bort utan risk. Läsarens siffra på 90 rader förutsätter att alla testhjälpare också tas bort, vilket inte stämmer för alla.

**20. nastaRuta anropas aldrig**  
Var: `src/sim/val.ts:391-413 och importen hash3 på rad 65; ARKITEKTUR.md rad 25`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 23 rader bort.  
I dag: Funktionen nastaRuta står kvar med fem rader förklaring. Ingen fil i src/ anropar den, inte heller testerna eller gränssnittet. Rundan i steg.ts använder sin egen nastaMal. Bara ARKITEKTUR.md nämner den, på två ställen.  
Förslag: Ta bort funktionen, kommentaren och importen hash3 (den används bara där). Rätta de två ställena i ARKITEKTUR.md så att de pekar på nastaMal i steg.ts.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Jag sökte i hela src/ och hittade inget anrop. Koden är död och kan tas bort utan att något ändras.

**21. Utskrift utan kontroll i drag och ett för brett band för bärplockningen**  
Var: `src/test/scenarier/fas10.ts:540-551 (drag: utskrift ur testbyarna); src/test/scenarier/behov.ts:165-172 och 179-184 (aktivitet: bärplockning i åtta byar); behov.ts:109-111 och 122 (ved: ingen fryser ihjäl); behov.ts:539-550 och 560 (kropp: olyckor i två byar); behov.ts:724-734 och 744 (vard: byar tills en har vårdat)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 20 rader bort.  
I dag: Scenariot drag läser två sparade testbyar och skriver bara ut tal, utan kontroll; utskriften gjordes för att kunna sätta talet BIN.dragFullt i steg 10.10.14, som är byggt. Scenariot aktivitet kör åtta byar i ett dygn för att se att bärplockningen ger mellan 1,5 och 30 per timme "som förut"; talet har gått från 12,6 till 2,9 utan att provet märkt något. De tre andra (frysning, olyckor, vård) kör riktiga byar och kan bli röda.  
Förslag: Ta bort utskriften i drag (elva rader) och bärplockningens medel i aktivitet (åtta byar i ett dygn). Behåll frysprovet i ved, olycksprovet i kropp och byn i vard: de är de enda proven på att systemen fungerar i en riktig by.  
Ändras i spelet: Nej. Scenariot aktivitet går lite fortare. Steg 10.10.14 i Färdplanen nämner utskriften och bör rättas i samma veva.  
Prövningen: Stämmer för utskriften och bärplockningen: den ena kontrollerar inget och den andra jämför med förr med ett band på faktor tjugo. Resten av läsarens förslag håller inte: olycksprovet blir rött om risken räknas fel, och vårdbyn visar att folk verkligen vårdar sår, vilket en påsatt skada inte gör.

**22. Arton balanstal som ingen kod läser**  
Var: `src/sim/bygg.ts:41 (BYGG.lagerMarg), src/sim/folk.ts:77-78 (KROPP.sjukMin, sjukSpann), src/sim/matlagning.ts:42 (MATLAG.sjukMin, sjukSpann), src/sim/torst.ts:55 (TORST.magMin, magSpann), src/sim/rader.ts:44 (RADER.tandaMin), src/sim/rovare.ts:91 (ROVARE.motR, bara scenariot agande.ts:2740), src/sim/steg.ts:158 (STEG.blekSek), src/sim/steg.ts:1192,1204 (RUNDA.settSok, langtR), src/sim/strid.ts:77 (STRID.smidPer), src/sim/styre.ts:40,61-63 (LED.wTid, tidDygn), src/sim/kult.ts:55 (KULT.vattenR), src/sim/liv.ts:76 (LIV.barnDod), src/sim/religion.ts:35,263 (TRO.grundaChans)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 16 rader bort.  
I dag: Talen står i balansblocken och syns i npm run talen, men ingen kod läser dem. Jag sökte varje namn i hela src, bildstil och test och fann bara raden där talet står (motR också i ett scenario). Kommentarerna beskriver därför sådant som inte händer: legitimiteten räknar inte tiden vid makten (raknaLeg, styre.ts:265-277), och designdokumentet säger att steg 8.3.9 tog bort den. Relationernas takt står som siffran 600 i TAKTER (steg.ts:590), inte som STEG.blekSek. Sjukdomarnas längd kommer ur sjukdomsregistret.  
Förslag: Ta bort de arton talen. Rätta kommentarerna vid legitimiteten (styre.ts:40 och 61-62: stödet, hur ledaren tillsattes, framgångarna och vintrarna, minus orättvisan), vid TECKENTAL (religion.ts:263) och vid sjukdomstiderna. Scenariot agande.ts:2740 får använda ROVARE.moter i stället för motR.  
Ändras i spelet: Ingen märkbar skillnad: talen påverkar ingenting i dag. Den som försökt balansera med något av dem har inte fått någon effekt.  
Prövningen: Alla arton är kontrollerade med sökning: ingen läser dem. Att ta bort dem gör listan med balanstal ärlig och ändrar inget i spelet.

**23. Rövarnas lockelse och byns försvar räknas aldrig i spelet**  
Var: `src/sim/rovare.ts:60-63, 91, 127-134; src/test/scenarier/agande.ts:2072-2075, 2141, 2740`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Funktionerna lockar() och forsvaret() och talen forsvarMest, rikFull, forsvarBas och forsvarSkada finns kvar från tiden då byn själv slumpade fram rövare. Sedan steg 11.6.20 kommer rövare bara när världen skickar dem. Bara scenariot i agande.ts anropar dem. Talet motR läses inte av spelet, men ett scenario (agande.ts:2740) använder det som mått.  
Förslag: Ta bort lockar, forsvaret och de fem talen. Ta bort scenariots kontroller som bara prövar dem, och ge kontrollen på rad 2740 ett annat mått (t.ex. ROVARE.moter). efterAnfall och vilaDygn används av vaktens poäng i val.ts och ska vara kvar.  
Ändras i spelet: Ingen skillnad i spelet.  
Prövningen: Jag sökte i hela src: inget i spelet eller gränssnittet anropar dem, bara testerna. Färdplanen (11.6.20) säger att rövare bara kommer när världen skickar dem, så den gamla räkningen har ingen uppgift kvar.

**24. Tolv balanstal som ingen kod läser**  
Var: `src/sim/bygg.ts:41 (lagerMarg); src/sim/rovare.ts:91 (motR); src/sim/steg.ts:158 (blekSek), 1192 (settSok), 1204 (langtR); src/sim/strid.ts:77 (smidPer); src/sim/styre.ts:61-63 (wTid, tidDygn); src/sim/torst.ts:55 (magMin, magSpann); src/sim/matlagning.ts:42 (sjukMin, sjukSpann)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: De tolv talen finns bara där de definieras; en sökning på hela ord i src (också testerna och gränssnittet) ger inga andra träffar. Kommentarerna beskriver regler som alltså inte gäller. För tiden vid makten (wTid, tidDygn) säger designdokumentet (fliken Samhället, steg 8.3.9) att den tagits bort ur legitimiteten med flit; kommentaren i styre.ts:61-62 beskriver fortfarande den gamla formeln.  
Förslag: Ta bort de tolv talen och rätta kommentaren i styre.ts. Gå sedan igenom resten av listan (ungefär 180 tal som aldrig nämns med namn) på samma sätt, ett i taget. Att koppla in någon av reglerna i stället (t.ex. att rustning tar smidighet) är en ändring av spelet och ett eget steg om Björn vill ha det.  
Ändras i spelet: Ingen skillnad. Talen försvinner ur listan i `npm run talen`.  
Prövningen: Alla tolv är kontrollerade en och en och läses inte. Ett tal som står kvar med en kommentar om en regel som inte gäller vilseleder nästa gång någon ska balansera.

**25. Kontroller som bara upprepar ett balanstal (smalare än läsaren sa)**  
Var: `src/test/scenarier/natur.ts:1581 (faltglanta: skogKost === 8, faltTill === 25), 2529 (virke: STACK.ved === 20, vikt 5 och 16), 2536 (scen av 6 plankor), 2726 (byxor varme 0,15), 2749 (Värms av elden 0,07 och 0,04), 2643-2653 (mjarde: bänken 3x2, gädda sliter 2, näring 0,3 / 1,2 / 2,2)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Ungefär tio kontroller kräver att ett balanstal är exakt det tal som står i testet. De prövar inget som systemet gör. Ändras talet med flit blir testet rött utan att något är fel. Flera av raderna läsaren pekade på är däremot riktiga kontroller och ska stå kvar: 84 (slaktat ger mer än uppätet), 170 (historiken hålls kort), 501 och 739-740 (registren hänger ihop, teknikträdets ordning), 1238 och 1305-1307 (grillat håller längre, frost stoppar röta), 1556 och 1704 (arbetstiden under en gräns).  
Förslag: Ta bort eller skriv om bara de exakta likheterna. Gör dem till jämförelser där det går (härden värmer mer än lägerelden, veden väger mindre än virket). Mjärde-scenariot behåller det som prövar något: sätta ut, vittja, bara mört i mjärden, gäddan bäst vår och höst.  
Ändras i spelet: Ingen skillnad i spelet. Testerna blir inte röda bara för att ett balanstal ändras i Balansen.  
Prövningen: De exakta likheterna finns och prövar bara att talet är talet. Men läsaren tog med många rader som prövar riktiga samband, så bara en mindre del ska bort.

**26. Fem kontroller som aldrig kan bli röda: 'true' och 'större än eller lika med noll'**  
Var: `src/test/scenarier/fas11.ts:1605,3099,3173,3693,4997`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Fyra rader har villkoret true och är märkta '(information)'. En rad (4997) kräver att ett antal är noll eller mer, vilket alltid stämmer. Tre av raderna (3099, 3173, 3693) kör dessutom en hel värld i 20 eller 40 dygn (20 eller 40 år i spelet) bara för att visa siffror. Det kostar datortid i varje stort test.  
Förslag: Gör dem till riktiga kontroller där det finns ett rimligt krav (till exempel att minst ett bud eller en uppdragsfärd gick), annars ta bort raden och världskörningen bakom. Siffrorna om krig får gärna stå kvar som information om körningen delas med ett annat scenario (se fyndet om världskörningarna).  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Alla fem raderna är som läsaren sa. De är ofarliga men kan inte hitta fel, och tre av dem kostar datortid. Att krig sker är slump, så just den raden bör inte bli ett krav.

**27. Oanvända funktioner och rena alias i djur-, fynd- och fiskfilerna**  
Var: `src/sim/tamdjur.ts:44; src/sim/djur.ts:297, 298, 341, 344, 379, 501, 504; src/sim/fynd.ts:667-671; src/sim/fisk.ts:109; src/sim/bin.ts:174; src/sim/trad.ts:78`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Används ingenstans (sökt i hela src, också tester och gränssnitt): DRAGDJUR, arFlockdjur, RADJUR_UT, flintorOchYxor. Används bara av tester: wantsFlint, sattUtMjarde, svarmTillgang (binSteg räknar samma sak själv), arRadjur, radjurOf, radjurGrupper. Alias: bjornVarden (ett anrop i bjorn.ts), stridOf, flintFactor och packaArt används på flera ställen.  
Förslag: Ta bort de fyra oanvända. Låt binSteg använda svarmTillgang, så att testet prövar spelets kod. Byt bjornVarden mot djurStrid('bjorn'). Låt de andra aliasen och testhjälparna stå: de används på många ställen och har tydliga namn.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: De fyra oanvända är verkligen oanvända och kan tas bort utan risk. Resten är mindre värt än läsaren trodde: flintFactor, stridOf och packaArt används på flera ställen, så vinsten av att byta dem är liten.

**28. Döda rester i strid och rövare**  
Var: `src/sim/strid.ts:77; src/sim/rovare.ts:116-119, 420, 443, 576, 732; src/sim/varg.ts:294-295; src/sim/gast.ts:35; src/test/scenarier/folk.ts:2674`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: (1) STRID.smidPer läses aldrig. (2) rovarRoll används inte; rollerna väljs i roller.ts. (3) setHotVilja(rovarVilja): varg.ts sparar funktionen i hotVilja men läser den aldrig. (4) Gästens fält ledare sätts aldrig sedan gänget blev utan ledare (steg 10.2.25); bara nollställningen i geUpp och en kontroll i ett scenario rör det. (5) Rovarflock har fälten rotar, rotat, vackt och lurat som ingen kod rör, och strider som bara skrivs. (6) Kommentaren på rad 116-118 beskriver ledare och arenans hörn som inte finns längre.  
Förslag: Ta bort (1)–(3), (5) och (6), och fältet ledare på gästen med nollställningen. Låt textgrenen i stridText (strid.ts:885-887) vara kvar: den används för en ledare utan person i testarenan. Scenariots kontroll (folk.ts:2674) att ingen rövare är ledare blir då onödig eller skrivs om.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Jag sökte efter varje namn i hela src och inget av dem läses av spelet. En rättelse: textgrenen 'leder och går först' är inte död, den gäller kämpar utan person i arenan.

**29. Förrådshusets 'slag' (mat eller material) är dött, och loggen säger fel**  
Var: `src/sim/byggnader.ts:69-71, 221, 455-459, 474-480, 498, 558, 561; src/sim/bygg.ts:276; src/sim/byggplan.ts:565, 935; src/sim/byggnad.ts:31; src/test/scenarier/grund.ts:1025; src/test/scenarier/redskap.ts:428`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: forradBehov ger aldrig något slag (rad 221: huset tar emot allt). Husets slag sätts därför bara i två tester. Fältet skickas ändå runt genom funktionsbytet, flytten av ett skadat hus och byggplanen. Loggen när ett förrådshus blir klart säger alltid att 'maten' ruttnar mindre, fast huset tar allt.  
Förslag: Ta bort slag ur Akut och Hus och ställena som skickar det vidare. Skriv loggtexten utan 'maten'. Zonens slag behålls: verkstadens hyllor och delningen i matförråd och materiallager använder det. De två testerna sätter då bara zonens slag.  
Ändras i spelet: Bara loggtexten när ett förrådshus blir klart ändras, så att den stämmer.  
Prövningen: Stämmer: ingen kod i spelet sätter husets slag. Loggtexten är fel i dag, så det är också en liten rättning.

**30. Förrådsmålens cache kostar mer än det den sparar**  
Var: `src/sim/forradsmal.ts:109-123`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: mal(s, k) sparar bufferten och lyxtaket per resurs en gång i timmen i en WeakMap, med en textnyckel (timme och påbud) som byggs vid varje fråga. Det som sparas är onskatDygn: tre multiplikationer ur registret. Påbudet hämtas ändå vid varje fråga. mal() används bara av buffert() och lyxtak() i samma fil.  
Förslag: Ta bort cache, Mal-typen och mal(). buffert() och lyxtak() räknar onskatDygn direkt.  
Ändras i spelet: Nej. Samma tal kommer ut, eftersom nyckeln redan innehåller påbudet och resten är fasta balanstal.  
Prövningen: Stämmer rad för rad. Cachen sparar tre multiplikationer och kostar en textnyckel och ett uppslag, och svaret kan inte bli ett annat utan den.

**31. Kontroller som inte kan bli röda (de prövar bara att ett balanstal är större än noll)**  
Var: `src/test/scenarier/fas9.ts:467, 506, 534, 611, 713, 714, 863, 960, 1031, 1034, 1089, 1317, 1417`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Ett dussin rader kontrollerar bara att ett balanstal är över noll, att två tal är olika eller att en rad finns i ett register. Rad 611 säger "ett brott som inte sätts i tid läker snett" men prövar bara att tiden är över noll: själva regeln i halsa.ts rad 504 prövas aldrig. Rad 960 har talet 40 dygn inskrivet i testet, så testet blir rött när balanstalet ändras. Rad 467 godkänns också när byn inte har något barn.  
Förslag: Ta bort de rader som bara prövar ett tal (534, 1034, 1317, 1417, talet 40 på rad 960, den sista delen av 1089). Gör om rad 611 så att den prövar regeln på riktigt: ett brott som väntat längre än tiden blir snett när hälsan räknas. Rad 467 ska kräva att ett barn finns. Rad 713 (sex matgrupper) och raderna som bara visar att en station finns kan stå kvar: de kostar inget.  
Ändras i spelet: Ingen skillnad i spelet. Ett test (benbrottet) börjar pröva en regel som i dag inte prövas.  
Prövningen: Raderna är som läsaren säger. Det viktigaste är inte att ta bort dem utan att rad 611 lovar något som testet inte prövar. Färre rader sparas än läsaren räknade, eftersom några bör skrivas om i stället för att tas bort.

**32. svampbyar kör två byar till med samma kontroller som svamp**  
Var: `src/test/scenarier/grund.ts:489-506 (svampByar, svampKoll, svampbyar), 508-533 (svamp)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: svampbyar kör två byar i 21 dygn (21 år i spelet, tre veckor i verkligheten) och gör samma tre kontroller som svamp gör på sina två byar: minst fem kantareller, giftsvamp med eller känd, byarna lever. Delningen gjordes i steg 10.11.24 för att inget jobb skulle bli det längsta i det stora testet; designdokumentet (Läget, 'Så hålls testet kort') säger samma sak. Sedan delningen räknas varje par för sig, så de två extra byarna gör inte kontrollen säkrare, de ger bara två byar till som kan bli röda av slumpen.  
Förslag: Ta bort svampbyar och låt svamp behålla sina två byar. Slå inte ihop dem till fyra byar i ett scenario: då blir det åter ett av de längsta jobben.  
Ändras i spelet: Ingen skillnad i spelet. Det stora testet slipper två byar i 21 dygn.  
Prövningen: Scenariot prövar inget som svamp inte redan prövar, och kostar två långa byar i varje stort test. Det får bara tas bort, inte slås ihop med svamp.

**33. drag() räknar tre svar som ingen läser**  
Var: `src/sim/steg.ts:1297-1323, 1414-1419`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: drag anropas på ett ställe (rad 1414). Av svaret läses bara dr.ut och dr.bort.radsla. nara, langt och funktionen tror används aldrig, men trorOm och rutVarde byggs ändå varje gång samlaren lämnar en ruta. Kommentaren beskriver tre avstånd (nära, bort, långt) som nastaMal har ersatt.  
Förslag: Låt drag ge bara { ut, radsla }, ta bort parametern varde och anropet till trorOm, och rätta kommentaren.  
Ändras i spelet: Ingen märkbar skillnad. trorOm drar ingen slump när den byggs.  
Prövningen: Stämmer: det finns bara ett anrop, och det läser två av svaren. Liten och säker städning som också sparar lite räknande.

**34. Död platshållarkod och oanvända bitar i växt- och stridsbilden**  
Var: `src/ui/vaxter.ts:17, 34, 64, 68, 70, 75, 192; src/ui/stridkarta.ts:21; src/ui/stridbild.ts:49`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Rester efter att Björn valt bilder: platshållaren VILDBO och grenen som ritar den (boets riktiga bild finns alltid i KARTBILDER), villkoret '!KARTBILDER.hons ||' och reservbilden för hönsen (bilden finns), räknaren j i drawPlants som ökas men aldrig läses, elva färgbokstäver i BILD_FARG som bara platshållaren kunde använda, parametern _nu i djuretNu och 'export { SEC }' i stridbild.ts som ingen läser.  
Förslag: Ta bort dem. BILD_FARG behöver bara röllekans sex bokstäver (y, x, v, C, D, E). De två anropen av djuretNu slutar skicka tiden.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Allt kontrollerat: vildbo och hons finns i kartbilder.ts, ritaBild ritar bara röllekan och VILDBO, j läses aldrig, och ingen fil eller test använder SEC från stridbild.ts. Ren städning utan risk.

**35. Balanstal och registerfält som aldrig läses**  
Var: `src/sim/steg.ts:158 (STEG.blekSek), 590, 1191-1192 (RUNDA.sett, settSok), 1204 (RUNDA.langtR), 1365, 1413 (tk.sett); src/sim/handlingar.ts:64, 96, 99 (runda.stopp, r, hel); src/sim/kartflytt.ts:98; src/test/scenarier/behov.ts:976`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: STEG.blekSek läses aldrig: raden relationerna har 600 skrivet direkt, så att ändra talet gör ingenting. RUNDA.settSok och RUNDA.langtR läses ingenstans. Rundans fält stopp och hel läses inte alls, och r bara av ett scenario. tk.sett sparar de 12 senaste rutorna, men bara den sista läses.  
Förslag: Ta bort settSok, langtR, stopp och hel. Låt raden relationerna läsa STEG.blekSek. Gör tk.sett till en enda ruta (då försvinner RUNDA.sett), och låt scenariot behov läsa något annat än runda.r.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Jag sökte efter varje namn i hela src/ och fann inga läsare. Tal som syns i npm run talen men inte gör något lurar den som balanserar.

**36. Kontroller som alltid är gröna eller prövar en text mot sig själv**  
Var: `src/test/scenarier/folk.ts:2703 (rovarmotet), 2240-2241 (kronika), 3048 (ryktesval), 3114 (skvaller)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Rad 2703 har villkoret `true`. Kronikas två rader om födslar är gröna också när ingen föddes. Ryktesval 3048 jämför en text i registret med samma text skriven en gång till, och skvaller 3114 kollar att ett binamn har minst fyra tecken. De övriga raderna som läsaren pekade på håller jag inte med om: rättegång 967-968 prövar att de sparade delarna hänger ihop med den sparade hårdheten, ryktesval 3042 har ett undantag för när viljan slår i taket, slagsmal 1854 är ett äkta 'om det blev skador ska de sitta på personerna', och faror 86 (bygge högst 10 %) följer inte av rad 83.  
Förslag: Ta bort raden med `true` (eller ge den ett riktigt villkor), och raderna 3048 och binamnsdelen av 3114. Gör kronikas två rader hårda: kräv minst en födsel, eller kör byn längre om ingen föds. Rör inte rättegång, ryktesval 3042, slagsmal 1854 och faror 86.  
Ändras i spelet: Ingen skillnad i spelet. Färre rader som ser ut som skydd men inte kan larma.  
Prövningen: Hälften av listan stämmer och är lätt att rätta. Den andra hälften är riktiga kontroller och ska stå kvar, så vinsten är mindre än läsaren räknade med.

**37. Tornadon sparar en lista över alla rutor den tagit, fast den inte behövs**  
Var: `src/sim/tornado.ts:143, 231, 235, 241`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Tornadon sparar varje ruta den svept över i listan t.tagna, som följer med i sparfilen, och bygger en mängd av hela listan varje slag. En stor tornado kan ha över tiotusen rutor där. Villkoret på rad 237 tar redan varje ruta en enda gång: rutans plats längs banan är alltid densamma, och varje slag tar bara biten av banan sedan förra slaget. Listan läses inte någon annanstans (sökt i hela src/, också testerna och gränssnittet).  
Förslag: Ta bort t.tagna och mängden. Rutorna väljs bara med avståndet längs banan sedan förra slaget, som villkoret redan gör.  
Ändras i spelet: Nej. Sparfilen blir mindre under en tornado och slaget går fortare.  
Prövningen: Stämmer: listan är död och villkoret räcker ensamt. Scenarierna tornadokarna, tornadonara och tornadoutkant bör köras efteråt, och npm run samma.

**38. Rester efter gamla sparfiler och ett fält som ingen använder**  
Var: `src/sim/handel.ts:223, 298, 570; src/sim/typer.ts:486 (nastaHandlare); src/sim/delning.ts:18; ARKITEKTUR.md:80, 82`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: visaFiltar lagar varje slag en filt från före v267 som saknar par. Handlarens sort är valfri för sparade byar från före v270 och läses med en reserv (vandrande). Fältet nastaHandlare står kvar i typer.ts men läses och skrivs ingenstans (kommentaren säger själv att det inte används sedan v532). ARKITEKTUR.md beskriver fortfarande det gamla: HANDEL.rik, HANDEL.dygn och s.nastaHandlare finns inte i koden, och DELNING.rik står som 250 fast talet är 600.  
Förslag: Ta bort raden 570 och fältet nastaHandlare, och skriv om de två raderna i ARKITEKTUR.md efter hur handlarna kommer nu (skickade av grannbyarna). Gör sort till ett vanligt fält; reserven på rad 298 kostar inget och kan stå kvar för en mycket gammal sparfil som inte öppnats sedan dess.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer på alla punkter, och det viktigaste är att ARKITEKTUR.md beskriver något som inte finns, vilket vilseleder den som läser den först. En sparfil kan i teorin ligga orörd sedan före v270, därför lämnas den lilla reserven.

**39. Två kontroller som inte kan bli röda, och vårdrätten prövar inte Envälde**  
Var: `src/test/scenarier/kontroll.ts:302 och 305 (tatuering); projekt.ts:144 (påbuden i registret); sjukdom.ts:183-203 (vardratt) mot src/sim/halsa.ts:729`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Tatueringens rad 305 prövar exakt samma sak (!q.tatV) som redan ingår i rad 302. Raden om att påbuden finns i registret prövar två namn som scenariot redan använt på raderna före. Scenariot vardratt lovar i texten fyra seder men prövar tre: Envälde (ledaren och hens släkt går före) finns i koden men prövas inte.  
Förslag: Ta bort de två raderna. Lägg till en kontroll i vardratt för Envälde: sätt seden rang till 1 och en ledare, och se att ledaren får högre rätt än en främling.  
Ändras i spelet: Nej.  
Prövningen: Tre av läsarens exempel stämmer. De andra faller: trokategori prövar riktiga uppgifter i registret, 'vaxte' i lakekonst jämför före och efter på riktigt, och 'en ny by har senaste sparversionen' kan bli röd. Det viktiga är luckan för Envälde, inte raderna som sparas.

**40. Ett sextiotal exporter i spelets kod som bara testerna använder**  
Var: `src/sim/landmarken.ts:114-117 (platserUpphor), src/sim/byggnader.ts:231-242 (mostUrgent), src/sim/redskap.ts:54-59,319 (SPJUT_FORSOK, isSpear, spears, freeSpear, makeTool), src/sim/djur.ts (arRadjur, radjurGrupper, radjurOf), src/sim/rader.ts:74-77 (radDygn), src/sim/skuld.ts:154-157 (forlatSvar), src/sim/val.ts:626-629 (forbattraKandidater), src/sim/resa.ts:329-333 (insatsPer), src/sim/ort.ts:280-284 (trorOmBy), src/sim/lager.ts:936 (storeFull), src/sim/fynd.ts (aktivaRutor, wantsFlint), src/sim/stationer.ts (golvLedigt, tommaKnivplatser), src/sim/handlingar.ts:340 (ACT_NAMES), med flera`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 40 rader bort.  
I dag: Jag räknade maskinellt: 60 exporter i src/sim nämns bara i sin egen fil och i testerna. Många av dem ska vara kvar: testkrokar och vakter (lyssnaPaTexter, lyssnaPaUttag, kostNoll, balansTal, okandaBalans, husFel, radVakt, gangLangsam, trangtVidStation, tiderUtanfor, KLAR_FOR), sättare för scenarierna (sattKlanPris, setRumFn, sattUtMjarde) och registrens listor (RECEPT_LIST, SJUK_IDS med flera). Resten, uppskattningsvis 25–30, är hjälpare som spelet slutat använda. Två av dem gör att ett test prövar något spelet inte gör: mostUrgent räknar byggbehoven på samma sätt som byggbehov i byggplan.ts:165 men i en egen kopia, och platserUpphor tar bort tillfälliga platser fast spelet tar bort handelslägret med en köhändelse (utpost.ts:162).  
Förslag: Behåll krokarna, vakterna, sättarna och registrens listor. Börja med de två som vilseleder: låt scenarierna som använder mostUrgent fråga byggbehov, och skriv om eller ta bort kontrollen av platserUpphor. Flytta sedan de små hjälparna som bara testerna behöver (spjut- och rådjurshjälparna, storeFull, wantsFlint med flera) till src/test/scenarier/hjalp.ts, en fil i taget, och kör de berörda scenarierna efter varje.  
Ändras i spelet: Ingen märkbar skillnad i spelet. Några scenarier ändras så att de prövar den väg spelet faktiskt går.  
Prövningen: Det stämmer att spelet inte använder dem, och två tester prövar kod som spelet inte kör, vilket kan dölja fel. Men ungefär hälften är avsiktliga testkrokar som ska vara kvar, så vinsten är mindre än läsaren räknade med.

**41. Ratade djurversioner ritas och byggs vid varje start men används aldrig**  
Var: `bildstil/djur.js:62-66, 98-99, 119, 142, 145-179, 249; bildstil/djurtillspelet.cjs:14; bildstil/svar/c-stationer.js:234; bildstil/fas6.js:485; bildstil/forslag.js:102`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 38 rader bort.  
I dag: Tre vargar byggs men bara den första (den smala) används: i spelet, i fas6.js och i forslag.js. De två andra (tung och låg) läser ingen. Egenskapen mask är bara sann för den låga vargen; hunden och valpen i svar/y-hund.js sätter den till falsk. Harens version 1 (34 rader ritning) läser ingen: spelet tar version 2 och 3, och c-stationer.js tar version 2. Listan VARGTYP lämnas ut till sidan, men ingen läser den (svar/g-natur.js nämner den bara i en kommentar och har egna mått).  
Förslag: Ta bort vargarna tung och låg och harens version 1, och ändra de tre ställena som läser harens nummer (djurtillspelet.cjs och c-stationer.js). Ta bort VARGTYP ur det som lämnas ut. Mask-grenarna kan tas bort samtidigt, och då tas också mask: false bort hos hunden och valpen. Kör sedan djurtillspelet.cjs och se att src/djurbilder.ts blir exakt lika.  
Ändras i spelet: Ingen skillnad: spelets djurbilder ska bli exakt desamma, eftersom bara de valda ritningarna förs över.  
Prövningen: Sökningen i hela bildstil/ visar att bara varg 1 och hare 2 och 3 läses, och valet är redan inbyggt i spelet (steg 5.1.11). Risken är att ett nummer glöms när haren numreras om, och det syns direkt när djurbilderna byggs på nytt.

**42. De gamla fasta hemorterna för klanerna (KLAN_HEM) och reservvägen i priset används aldrig**  
Var: `src/sim/klaner.ts:47-57, 68, 101, 131, 138; src/sim/gastliv.ts:10, 20; src/sim/priser.ts:252; scenarierna src/test/scenarier/agande.ts:1969, 2021, 3315 och fas11.ts:593`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 12 rader bort.  
I dag: KLAN_HEM är klanernas hemtrakter från tiden före världskartan. klanPris faller tillbaka på listan om klanen saknar rad i världen, men varje klan får alltid sin rad (nyRad i grannbyar.ts, också för gamla sparfiler). Reservvägen körs alltså aldrig. Klan.pris läses bara av uppgradering 57 och ett scenario som sätter det utan verkan. klanMellan är ett andra namn på mellan. gastliv.ts använder ortsnamnen i texten om handlarens första resa.  
Förslag: Ta bort reservvägen i klanPris, prisKrok.sallsynt och aliaset klanMellan (exportera mellan). Flytta de sex ortsnamnen till gastliv.ts som en egen lista, så att gästernas livstexter inte ändras. Rätta scenarierna som använder KLAN_HEM_NAMN och hk.pris. Klan.pris kan stå kvar som typ så länge uppgradering 57 finns.  
Ändras i spelet: Ingen märkbar skillnad. Priserna ändras inte, och gästernas livshistoria är densamma om ortsnamnen flyttas i stället för att bytas.  
Prövningen: Reservvägen är död kod: alla klaner får en rad i världen. Att byta ortsnamnen mot riktiga platser i världen är en egen ändring som ändrar texter och hålls utanför.

**43. Den gamla sjukklockan (sickUntil och sickWhy) finns kvar bredvid sjukdomarna**  
Var: `src/sim/typer.ts:262; src/sim/steg.ts:744, 751; src/sim/sjukdom.ts:134; src/sim/folk.ts:233-234; src/sim/gast.ts:178; src/sim/behov.ts:113, 117; src/sim/matlagning.ts:111; src/sim/fynd.ts:729; src/ui/flikar/person.ts:303, 309; testerna: src/test/scenarier/kontroll.ts:366, redskap.ts:243, religion.ts:144 och omkring femton rader som nollställer sickUntil`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Ingenting i simuleringen sätter sickUntil längre; sjukdomarna ligger i p.sjuk sedan steg 9.5.1. Ändå läser hälsosteget, isSick och personrutan den gamla klockan. sickWhy skrivs på fyra ställen men visas bara när den gamla klockan går, alltså aldrig i en by från i dag. Tre scenarier använder fälten: kontroll.ts sätter sickUntil för att göra någon sjuk, och redskap.ts läser sickWhy för att se att någon blev magsjuk.  
Förslag: Ta bort sickUntil och sickWhy och raderna som läser och skriver dem; isSick blir bara p.sjuk. poisonUntil behålls (den ger dödsorsaken svamp). Scenarierna som sätter sickUntil eller läser sickWhy frågar p.sjuk i stället.  
Ändras i spelet: Ingen märkbar skillnad. En mycket gammal sparad by där klockan ännu inte gått ut skulle bli frisk några timmar tidigare.  
Prövningen: Sökningen över hela src/ visar att bara tester sätter klockan, och att sickWhy aldrig visas. Tre scenarier måste skrivas om lite, annars är det rent bortplock.

**44. Den gamla sjukklockan (sickUntil) sätts aldrig längre**  
Var: `src/sim/ekonomi.ts:19, 32; src/sim/sjukdom.ts:134, 148-154; src/sim/steg.ts:744, 751; src/sim/folk.ts:233-234; src/sim/gast.ts:178; src/ui/flikar/person.ts:303, 309; src/sim/typer.ts:262; src/test/scenarier/kontroll.ts:366; src/test/scenarier/religion.ts:144`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Ingen kod i spelet sätter sickUntil längre; sjukdomarna står i p.sjuk sedan steg 9.5.1. Fältet läses ändå på sju ställen: arbetsorken (med ett eget balanstal, sjukArbete), om man är sjuk, svårt sjuk och ligger, hälsan i steg.ts och två texter i personrutan. Talet 0,3 står dessutom skrivet en gång till i sjukOrkar. Två scenarier sätter fältet själva för att göra någon sjuk (kontroll.ts rad 366 och religion.ts rad 144). Fältet sickWhy används däremot fortfarande och ska vara kvar.  
Förslag: Ta bort sickUntil och grenarna för den, och balanstalet sjukArbete. Lägg en rad i UPPGRADERINGAR (varld.ts) som tar bort fältet ur gamla sparfiler. Ändra de två scenarierna så att de gör personen sjuk med en riktig sjukdom (p.sjuk). Rör inte sickWhy.  
Ändras i spelet: Ingen märkbar skillnad. Bara en by som sparades för mycket länge sedan med någon sjuk just då: den personen blir frisk direkt vid inläsningen.  
Prövningen: Stämmer: inget i src/sim skriver fältet, bara läser det. Två scenarier använder det och måste skrivas om samtidigt, annars blir de röda.

**45. Den gamla sjukklockan (sickUntil, sickWhy) kan tas bort**  
Var: `src/ui/flikar/person.ts:303, 309; src/sim/steg.ts:744, 751; src/sim/sjukdom.ts:134; src/sim/behov.ts:113, 117; src/sim/fynd.ts:729; src/sim/matlagning.ts:111; src/sim/gast.ts:178; src/sim/typer.ts:262; src/test/scenarier/redskap.ts:243; src/test/scenarier/kontroll.ts:366`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Ingen kod i simuleringen sätter sickUntil längre; sjukdomarna går genom registret (p.sjuk). Ändå räknar steg.ts och isSick med den gamla klockan, och personrutan har två grenar för den. sickWhy skrivs på tre ställen i simuleringen (behov.ts, fynd.ts, matlagning.ts). Den läses i personrutans gamla grenar, och dessutom i ett scenario: redskap.ts:243 letar efter texten "Magsjuk av skämd mat" för att se att någon blev sjuk. Scenariot kontroll.ts:366 sätter sickUntil för att göra någon sjuk.  
Förslag: Ta bort sickUntil och sickWhy: grenarna i person.ts, raden i steg.ts, halvan av isSick och tilldelningarna i behov.ts, fynd.ts och matlagning.ts. Scenariot i redskap.ts frågar i stället efter sjukdomen i registret (p.sjuk), och kontroll.ts gör personen sjuk med insjukna. De många scenarier som bara nollställer sickUntil tappar det ordet.  
Ändras i spelet: Ingen märkbar skillnad i en by som levt förbi steg 9.5.1. Den gamla klockan varade bara några timmar, så ingen sparad by har den kvar.  
Prövningen: Jag hittade ingen kod i src/sim som sätter sickUntil, så grenarna körs aldrig i spelet. Läsaren missade att två scenarier använder fälten; de måste skrivas om samtidigt, annars blir de röda.

**46. Filtens ruta: en gren för filtar från före v267 och två likadana sidor**  
Var: `src/ui/flikar/filt.ts:26-35, 76-92, 101-103; src/sim/handel.ts:570; src/ui/handel.ts:65-73`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Alla filtar som skapas i dag har en ägare (vem) och ett par. Rutan har ändå kvar en gren för en filt från före v267 med båda parternas saker, och handel.ts och kartans handel.ts har samma undantag. I pris() ger grenen för handlarens egna varor och grenen för det en bybo erbjuder samma tal (handlarPris utan kvalitet är samma formel). minneSida och sida är nästan samma funktion, men inte helt: den ena läser priset som sparades vid bytet och skriver "gav", den andra räknar priset nu.  
Förslag: Ta bort före-v267-grenarna på de tre ställena och slå ihop de två likadana grenarna i pris(). Att slå ihop minneSida och sida är valfritt och sparar lite.  
Ändras i spelet: Ingen märkbar skillnad. Bara en by som sparats före v267 medan en handlare stod i byn skulle märka något, och den handlaren har gått för länge sedan.  
Prövningen: Jag såg att de två ställen som lägger ut filtar (handel.ts:421 och 578) alltid sätter vem och par, så de gamla grenarna körs inte. De två prisgrenarna ger bevisligen samma tal.

**47. Äldre sparningar städas i slaget, varje slag och för varje person**  
Var: `src/sim/steg.ts:394 (s.stegRest), 547 (delete p.framme), 744 och 751 (p.sickUntil), 219 (hantverk med redskapet 'rep'); src/sim/varld.ts:338 (uppgradering 36); src/sim/typer.ts:222, 262, 454; src/sim/sjukdom.ts:134; src/ui/flikar/person.ts:303-309; src/test/scenarier/kontroll.ts:366`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 5 rader bort.  
I dag: Aktiviteterna kör 'delete p.framme' för varje person i varje slag, fast uppgradering 36 redan tar bort fältet och ingen kod sätter det. stegBy tar bort s.stegRest i varje anrop, fast inget sätter det. healthStep räknar den gamla sjukdomsklockan p.sickUntil, som ingen kod i spelet längre sätter; den läses också av isSick och personrutan, och scenariot kontroll sätter den själv. MEDAN.hantverk har en gren för äldre sparfiler där rep tvinnades i handarbetet; inget ger längre en uppgift med redskapet 'rep'.  
Förslag: Ta bort raderna ur slaget. Det en äldre sparfil behöver görs en gång i en ny rad i UPPGRADERINGAR (stegRest och sickUntil tas bort, en pågående hantverk-uppgift med 'rep' avbryts). Ta p.framme, stegRest och rep-grenen först. sickUntil tas sist, eftersom isSick, personrutan och ett par scenarier också läser eller sätter den.  
Ändras i spelet: Nej. En mycket gammal sparad by där någon var sjuk enligt den gamla klockan blir frisk direkt vid inläsningen.  
Prövningen: Stämmer: inget i spelet sätter längre de här fälten, och uppgraderingarna är stället för sådant. sickUntil rör fler filer än läsaren skrev (sjukdom.ts, personrutan och två scenarier), så den delen är lite större.

**48. Död och dubbel CSS i template.html**  
Var: `src/template.html:203-204 (.matare), 225 (.tag), 238 (.kv dd.helrad), 339 (.sedw), 346 (samma rad som 345), 503 (.spacer), 527-528 (#arByn), 167 och 521 ([hidden] gäller redan på rad 41), 177-178 och 182 (.tabs button), 163 och 165 (.stang och .bakat), 613 (klassen stenvert)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 11 rader bort.  
I dag: Klasserna matare, tag, helrad, sedw och spacer och id:t arByn finns inte i någon kod eller HTML i spelet (sökt i hela src; orden finns bara i bildstilens egen sida och i testernas namn). Raden för krönikans tidskolumn står två gånger. Två regler upprepar det [hidden] redan gör med !important. Alla flikknappar byggs som runstenar (ui/panel.ts:53), så grundstilen för .tabs button skrivs till stor del över direkt. Bakåtpilens regel är kryssets regel en gång till med annat avstånd från kanten. Klassen stenvert på kugghjulet har ingen regel.  
Förslag: Ta bort de döda reglerna och den dubbla raden, och slå ihop .stang och .bakat till en regel med olika right. Låt .tabs button stå kvar om det är osäkert vad runstenen ärver (teckensnitt och muspekare).  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Allt det utpekade stämde när jag sökte. Det döda kan tas bort utan risk; bara flikknapparnas grundstil bör lämnas eller prövas med en skärmbild, eftersom runstenen ärver delar av den.

**49. Ta bort rutorPng och två oanvända variabler i kontroll.js**  
Var: `bildstil/kontroll.js:339-348 (rutorPng), 366 (exporten), 123 (s1, u1)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: rutorPng (en animation som PNG för Claude att titta på) anropas inte av någon fil, varken på sidan, i kontrollera.mjs eller i API-skripten. Variablerna s1 och u1 på rad 123 används aldrig. Några exporter läses inte utifrån (SLAG, KONTROLLNAMN, GRANS, symmetri, perspektiv, likhet, olika, sammanhang), men de är bara namn på en rad och kostar inget. Det läsaren kallar en kopia av fylld i olika() är ingen kopia: den beskär bilden först och svarar ja eller nej, medan den delade räknar andelen av hela duken.  
Förslag: Ta bort rutorPng och dess namn i exporten, och s1 och u1. Låt den lokala fylld i olika() vara (byt gärna namn på den, t.ex. fyllerRutan, så att den inte förväxlas). Låt exporterna stå.  
Ändras i spelet: Nej.  
Prövningen: rutorPng och de två variablerna är döda, det stämmer. Att byta den lokala fylld mot den delade skulle ändra kontrollen att versionerna skiljer sig i form, så den delen gör jag inte. Vinsten är liten, men risken är ingen.

**50. Småsaker som bara tester eller ingen använder**  
Var: `src/sim/resa.ts:11-62 (åtta importrader från ./folk), 157 (RESMAL_IDS), 329-333 (insatsPer), 740 (varde1); src/sim/uppdrag.ts:85 (UPPDRAG_IDS); src/sim/utpost.ts:54, 92`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: varde1 är bara ett annat namn på grundvarde. RESMAL_IDS, insatsPer och UPPDRAG_IDS används bara av tester. fyndInne tar en parameter den inte använder, och utpost.ts:92 kopierar en plats i onödan. resa.ts importerar från ./folk på åtta olika rader.  
Förslag: Byt varde1 mot grundvarde, slå ihop importraderna, ta bort den oanvända parametern och kopian. De tre som bara tester använder kan tas bort om testerna räknar ur registren själva. Låt foljMed, djurMed, hittadDod och parametern viktAv i taRuin vara.  
Ändras i spelet: Nej.  
Prövningen: Delvis rätt. foljMed och djurMed är inga tomma omslag (de kontrollerar skedet och dubbletter) och används av resa.ts och ett trettiotal tester; hittadDod ger vilsegången ett tydligt namn; viktAv anropas med två olika funktioner. Resten stämmer och är ofarligt att städa.

**51. Handelsmålet med påslag testas två gånger med samma uppställning**  
Var: `src/test/scenarier/agande.ts:1006-1013 och 1027 (priser), 1053-1061 och 1088 (handelsvaror)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 9 rader bort.  
I dag: Båda scenarierna skapar samma by (alla kan kniv och yxa, samma förråd), gör yxan dyr hos grannbyarna, låter byborna lära sig det och kontrollerar att handelsmålet byter från kniv till yxa. Provet i priser gör ett steg till: det ser att målet inte ändras förrän byborna har lärt sig priset.  
Förslag: Behåll provet i priser, som säger mer, och ta bort blocket och kontrollen ur handelsvaror.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: uppställningen är ordagrant lika. Det är provet i handelsvaror som ska bort, inte det i priser, för priser kontrollerar också att sanningen utan lärdom inte räcker.

**52. Döda fält, balanstal och omslag som inget använder**  
Var: `src/sim/religion.ts:35, 263; src/sim/styre.ts:239, 254-255, 264-265, 403, 430; src/sim/rost.ts:215; src/sim/lagar.ts:200; src/test/scenarier/folk.ts:987, 3127; src/test/scenarier/kultur.ts:2291`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: TRO.grundaChans läses inte (varje tecken har sitt tal i TECKENTAL; kommentaren på rad 263 är gammal). Fältet hanSedd finns bara i typen. ledarTitel används bara av ett test. legitimitet skickar bara vidare till raknaLeg, styreAv är ett andra namn på styreOf, slutarStyre på slutar och oppnaHarkomst på oppnaSed. Raden export laggFram i lagar.ts behövs inte: ingen hämtar den därifrån, och sim.ts exporterar rost.ts redan.  
Förslag: Ta bort talet, fältet, den gamla kommentaren och raden i lagar.ts. Slå ihop legitimitet med raknaLeg, exportera styreOf och slutar under ett namn var och ta bort oppnaHarkomst. ledarTitel kan stå kvar för testet, eller så exporteras titelFor.  
Ändras i spelet: Nej. Talet tro.grundaChans försvinner ur npm run talen.  
Prövningen: Allt stämmer efter sökning i hela src, också testerna och gränssnittet. Två tester använder namnen styreAv och ledarTitel och måste följa med.

**53. Balanstal, fält och registerkolumner som ingen läser**  
Var: `src/sim/rader.ts:39 (RADER.smitta), 44 (RADER.tandaMin), 31 och 74-77 (RADER.per och radDygn, bara scenarier); src/sim/typer.ts:382 (aktOm), 486 (nastaHandlare), 511-523 (kolumnen requires); src/sim/lagar.ts:230; src/sim/radtal.ts:32-38 (BYSORTER.moder); src/sim/strid.ts:72, 526 (det smitta som används)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: RADER.smitta läses ingenstans; modet som sjunker när andra gett upp räknas med STRID.smitta i strid.ts, så talet är en dubblett. RADER.tandaMin (tiden att tända ett hus) läses inte heller: huset tänds direkt, fast kommentaren och designdokumentet (steg 8.9.3) säger att det tar tid. s.aktOm skrivs i lagar.ts men läses aldrig. s.nastaHandlare står kvar i typen fast den inte används sedan v532. Kolumnen requires i eldstäderna och tänddonen läses inte av någon. BYSORTER.moder läses bara av ett scenario. radDygn och RADER.per används bara av scenarierna.  
Förslag: Ta bort RADER.smitta, s.aktOm, s.nastaHandlare och kolumnen requires. radDygn och RADER.per flyttas till scenariernas hjälpfil. Om tandaMin: antingen byggs väntetiden som steg 8.9.3 beskriver, eller så tas talet bort och texten i dokumentet rättas; det är en egen fråga till Björn. BYSORTER.moder kan stå kvar, den beskriver sorten och kostar ingenting.  
Ändras i spelet: Ingen märkbar skillnad, så länge tiden för att tända ett hus inte byggs.  
Prövningen: Sökningen över hela src/ bekräftar att inget av dem läses i spelet. En sak ska Björn veta: att tända ett hus tar ingen tid i koden, fast designdokumentet säger att det gör det.

**54. Oanvänd funktion och tre oanvända fält i landmärkenas register**  
Var: `src/sim/landmarken.ts:19-21, 33-46, 114-117; src/test/scenarier/fas11.ts:212-215`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: platserUpphor anropas inte av spelet, bara av scenariot i fas11.ts (rad 214–215). Platser tas i stället bort i utpost.ts och byflytt.ts. Fälten tillfallig, fynd och projekt står på raderna i registret men läses aldrig av koden eller testerna.  
Förslag: Ta bort platserUpphor och raderna i scenariot som prövar den. Ta bort de tre fälten och meningen om dem i filens inledning, eller skriv upplysningen som en kommentar på raden.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Sökningen i hela src/ visar att inget i spelet använder funktionen eller fälten. Ett scenario måste rättas samtidigt.

**55. Rummens oanvända delar: sida, rumNamn och langhusSov**  
Var: `src/sim/rum.ts:23, 33, 80-84, 151; src/sim/byggnader.ts:29; src/test/scenarier/byggnader.ts:1260`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 7 rader bort.  
I dag: RumInfo.sida räknas ut för varje rum men läses aldrig. rumNamn används bara i ett test. RUM.langhusSov är 8, samma tal som HUS.langhus, men det är två olika balanstal.  
Förslag: Ta bort sida. Låt testet läsa rumVisas direkt och ta bort rumNamn. Läs HUS.langhus i stället för langhusSov.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer: jag hittade ingen läsare av sida och bara testet för rumNamn. Designdokumentet nämner en minsta sida per rumstyp, men den är inte byggd och kan räknas ut igen när den behövs.

**56. Småskräp: tom import, dubblerad grannlista och fyra if i rad**  
Var: `src/sim/bygg.ts:28; src/sim/byggsten.ts:33, 45; src/sim/kvalitet.ts:71-77; src/sim/byggnader.ts:513-515; src/sim/projekt.ts:50-52`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 7 rader bort.  
I dag: bygg.ts har en tom import från './eld'. byggsten.ts har en egen GR4 som är samma lista som GRANNAR4 i typer.ts. nyKvalitet har fyra 'om mästerverk' efter varandra. Två kommentarblock står kvar utan koden de beskriver (om samlingshuset och långhuset i byggnader.ts, och om stammen över huset i projekt.ts).  
Förslag: Ta bort importen och GR4, slå ihop de fyra villkoren till ett block i samma ordning, och flytta eller ta bort kommentarerna.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Allt stämmer. Det är ren städning. Ordningen på notisen, loggen och händelsen i nyKvalitet ska behållas när villkoren slås ihop.

**57. Död kod i mat- och djurfilerna: rader som ingen läser**  
Var: `src/sim/ratter.ts:10-19,65; src/sim/matlagning.ts:42; src/sim/slatter.ts:234; src/sim/kruka.ts:22`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: MALTIDSNIVA_LIST (ratter.ts:65), balanstalen MATLAG.sjukMin och sjukSpann (matlagning.ts:42), iFahuset (slatter.ts:234) och typen KrukSlag (kruka.ts:22) läses ingenstans, varken i spelet, gränssnittet eller testerna. Fälten namn och tecken i MATGRUPPER läses inte heller. TILLAGNING läses bara av två scenarier, men registret står beskrivet i designdokumentet (Rätterna och tillagningen). grodaNu, krukaVill och torrRutor används bara av var sitt scenario; torrRutor räknar sjöbotten och är inte samma sak som torraRutor (fältets torra rutor).  
Förslag: Ta bort MALTIDSNIVA_LIST, sjukMin, sjukSpann, iFahuset och KrukSlag. Låt TILLAGNING stå kvar, eftersom designdokumentet säger att sätten att laga mat är rader där. Låt de tre testhjälparna stå kvar (en rad var), eller skriv dem i scenarierna.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Sökningen över hela src/ visar att de fem sakerna aldrig läses. Förslaget är krympt: TILLAGNING finns i designdokumentet och läsarens byte torrRutor mot torraRutor var fel.

**58. Småstäd: oanvända exporter, en död rad och dubbla importer**  
Var: `src/sim/ord.ts:27, 52, 59 (SAKORD, sakOrd, enEtt används bara i filen), 82 (GORA.packsadel); src/sim/minne.ts:180 (trimLardomar); src/sim/skrift.ts:12+17 (minne) och 29+30 (styre); src/sim/sport.ts:25+42 (slump) och 24+32 (kartstrid)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Tre exporter i ordlagret används inte utanför filen. GORA har en rad för packsadel, men ingen teknik heter så (packsadeln sys med ryggsäckens teknik). trimLardomar är bara ett annat namn på trim, använt i ort.ts och uppdrag.ts. Fyra importrader är dubbletter ur samma fil.  
Förslag: Ta bort export-orden, raden packsadel och omslaget (exportera trim under namnet trimLardomar), och slå ihop importerna.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Allt stämmer vid sökning i hela src, också testerna och gränssnittet. Ofarligt och litet.

**59. Oanvänt och dubbletter i valet och förrådsmålen**  
Var: `src/sim/val.ts:542 (ARBETSNIVAER), 557 och 957 (arstid), 507 (r3); src/sim/forradsmal.ts:94 (sparas), 149 (r3), 199-202 (overOchUnder), 283 (taltVill); src/sim/steg.ts:1636 (r3); ARKITEKTUR.md:28`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Fältet arstid på en rad i ARBETEN används inte av någon rad. ARBETSNIVAER läses inte av någon kod; namnet nämns bara i en kommentar och i ARKITEKTUR.md. sparas() är bara ett annat namn på eldReserv() och används på åtta ställen. taltVill() är samma räkning som behovVill() på raden ovanför, men scenariot i fas11.ts anropar taltVill, så namnet ska finnas kvar. r3 finns i tre filer (också steg.ts). overOchUnder upprepar formeln för taket i materialTak.  
Förslag: Ta bort arstid och ARBETSNIVAER (och rätta raden i ARKITEKTUR.md och kommentaren). Låt taltVill anropa behovVill. Lägg r3 på ett ställe. Låt overOchUnder och materialTak dela en liten hjälpare för taket. Att byta sparas mot eldReserv på åtta ställen ger lite och kan vänta.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Allt stämmer efter sökning i hela src. Ändringarna är mekaniska och rör inte spelet.

**60. Sammanfattningar som aldrig visas i personrutan**  
Var: `src/ui/flikar/person.ts:46, 99, 101, 102, 108, 129-132`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Sammanfattningen (kort) visas bara när fliken har fler än en del. Delarna Presentation, Hälsa, Egenskaper och Kunskap är alltid ensamma i sin flik, så deras sammanfattning räknas aldrig ut och visas aldrig. Funktionen egenKort används inte till något annat. halsaKort används fortfarande i Översikt och ska vara kvar.  
Förslag: Ta bort kort från de fyra raderna i DELAR och funktionen egenKort. halsaKort behålls för Översikt.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer: rad 46 skickar en ensam del förbi sammanfattningen, och designdokumentet säger att en flik med bara en del inte har någon delrubrik. Jag hittade inga andra användningar i src/, inte heller i testerna.

**61. trorOmBy används bara av testerna**  
Var: `src/sim/ort.ts:280-284; src/test/scenarier/fas11.ts:1419, 1423, 1438`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: trorOmBy anropas inte från spelet eller gränssnittet, bara på tre ställen i ett scenario (och nämns i scenariots text). Spelet gör samma sak direkt med ortensRad och radVid (ort.ts:351-352, skrift.ts:385). ortNiva har ett anrop i spelet men elva i testerna, och gastHemOrt ett i spelet och ett i testerna.  
Förslag: Ta bort trorOmBy och låt scenariot fråga radVid(ortensRad(...)) som spelet gör. Låt ortNiva och gastHemOrt vara: testerna använder dem flitigt och de är en rad var.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer för trorOmBy: inget i spelet anropar den. Vinsten är liten, men testet prövar då den väg spelet faktiskt går.

**62. Död kod i sjukdom.ts**  
Var: `src/sim/sjukdom.ts:20, 25, 152, 188, 199`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: sjukVilar och smittadAv används ingenstans i src/ (varken spelet, gränssnittet eller testerna). Raden 'void housesOf;' finns bara för att tysta en oanvänd import, och roomAt importeras två gånger, andra gången under namnet rumVid. SJUK_IDS används av scenariot sjukdom.  
Förslag: Ta bort de två funktionerna, void-raden, importen av housesOf och den dubbla importen (använd roomAt i larSmittan). Låt SJUK_IDS vara kvar; scenariot använder den och den kostar en rad.  
Ändras i spelet: Nej.  
Prövningen: Sökningen över hela src/ ger bara definitionerna. Inget kan gå sönder, och typkontrollen visar direkt om något missats.

**63. Reservvägar kvar för bilder som nu finns**  
Var: `src/ui/foremal.ts:86, 135, 141, 146, 253, 283, 364, 371, 400`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: Flera ställen frågar först om en bild finns och ritar annars en handritad platshållare: staketet som streck (rad 141), vattnet i vattenhon (rad 283), stekhällen i tre steg (rad 364), sittplatsen (rad 371), stenvägen (rad 400), den blöta veden (rad 86), äppelträdet och sophögen. Alla de bilderna finns nu i KARTBILDER (src/kartbilder.ts), så reservvägarna körs aldrig.  
Förslag: Ta bort platshållarna för staketet och vattnet i hon, och de extra stegen för stekhällen och sittplatsen. Behåll reservvägen för stationernas kartbild (rad 276), för alla stationer har inte egen bild. Där kontrollen bara är till för typkontrollen sparas ingenting.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Jag såg att alla bilderna finns i den genererade filen. Vinsten är liten (ungefär fem rader, inte tolv), men risken är nästan ingen.

**64. Död gren för andra fläckar än toaletten**  
Var: `src/ui/smuts.ts:1, 11-12, 36-40`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: Registret FLACKAR i src/sim/smuts.ts har bara en sorts fläck, 'toa'. Blodet har ett eget system sedan v94 (blod.ts). drawFlackar ritar toa-fläcken med toaBild och hoppar vidare (rad 37), så den allmänna grenen som ritar ovala prickar (rad 38-40), hjälpfunktionen plats (rad 11), talet n och importerna fargTal och narmast körs aldrig.  
Förslag: Ta bort den allmänna grenen och det som bara den använder. En ny sorts fläck får sin bild när den byggs; ovala prickar följer ändå inte bildstilen.  
Ändras i spelet: Nej.  
Prövningen: Stämmer: grenen kan inte nås med dagens register, och Färdplanen har inget steg med en ny sorts fläck. Vinsten är liten men risken är ingen.

**65. Variabler som aldrig används i promenad, ved och drag**  
Var: `src/test/scenarier/behov.ts:234 och 255 (langtFran), 236 och 249-250 (vinkeln v i forra), 110-111 (eld); src/test/scenarier/fas10.ts:504 (W sätts två gånger på samma rad)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: I promenad räknas langtFran ut varje slag men visas aldrig och ingår inte i någon kontroll. Vinkeln v sparas men läses aldrig; vändningarna räknas i byns statistik (promVander). I ved räknas eld (hur många byar där elden brinner) men används inte. På rad 504 i fas10 sätts W två gånger i rad. De andra raderna "W = SIM.W" som läsaren pekade på behövs: kartans bredd byts när en annan by läses in (typer.ts, useMap).  
Förslag: Ta bort langtFran, vinkeln v, eld och den dubbla tilldelningen på rad 504. Rör inte de andra W-raderna (346, 349, 392, 543, 1047, 1071).  
Ändras i spelet: Nej.  
Prövningen: Stämmer för langtFran, vinkeln och rad 504, och eld i ved är oanvänd på samma sätt. Läsaren hade fel om de övriga W-raderna: de hämtar bredden på nytt efter att en ny by skapats eller lästs in.

**66. Död kod i testfilen: rad efter return, namn som bara plockas ut för att tystas, en rad som lägger till noll**  
Var: `src/test/scenarier/fas9.ts:182 och 189 (vidStation), 314 och 340 (tingOf), 1538 (b.now += 0), 942–943 (val är samma som vald)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Rad 189 står efter return och körs aldrig. Rad 340 finns bara för att typkontrollen inte ska klaga på ett namn som inte används (tsconfig har noUnusedLocals). Rad 1538 lägger till noll. Rad 943 ger samma värde ett andra namn.  
Förslag: Ta bort de raderna och de oanvända namnen där de plockas ut. Använd namnet vald direkt i stället för val.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Allt stämmer rad för rad, och inget annat använder namnen. Vinsten är liten men risken är ingen.

**67. Kontroller som aldrig kan bli röda eller som redan ligger inom en annan**  
Var: `src/test/scenarier/agande.ts:350 (delning), 2439 och 2441 (rovarforsvar), 2226 och 2231 (barnrop), 103 (agande)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: delning: 'rikP ? egenMat(rikP) : -1' har en gren som aldrig körs, eftersom rikP redan är säkrad med utropstecken på rad 346. rovarforsvar: kontrollen 'de flesta står emot' följer alltid av den senare 'alla friska står emot'. barnrop: platsen vid räknas ut men används inte (void vid). agande: !('items' in v) prövar bara att ett gammalt fält inte finns i en ny by.  
Förslag: Ta bort den döda grenen, den svagare rövarkontrollen, vid i barnrop och den gamla fältkontrollen i agande.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Alla fyra stämmer i koden. Det är småsaker, men de är ofarliga att ta bort och gör testerna lite ärligare.

**68. Småsaker som inte används: arstid, ARBETSNIVAER, statistik och exporter**  
Var: `src/sim/val.ts:542, 557, 957, 915, 980, 764-772; src/sim/handlingar.ts:65`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Fältet arstid på raderna prövas i varje val men ingen rad har det. ARBETSNIVAER (nivåernas namn) läses inte av någon kod. Statistiken raddUndvek och fylla räknas men läses aldrig (forbattra och fullaForrad läses av scenarier och ska vara kvar). skuggaNara, vaderTillater, arbetarNu, radFull och ArbRad exporteras utan att användas utanför filen. Raderna vakt (nivå 6), leka och framtradande (nivå 9) står mellan nivå 4 och 5 i registret; nivån på raden styr inte var den prövas. I handlingar.ts står rundans förklaring som kommentar på promenadens fält tur.  
Förslag: Ta bort arstid och de två olästa räknarna, sluta exportera det som bara används i filen och flytta kommentaren om rundan till rätt fält. För de tre raderna: skriv i kommentaren att de prövas före Rädda, men flytta dem inte. ARBETSNIVAER kan stå kvar som förklaring eller bli en kommentar.  
Ändras i spelet: ingen märkbar skillnad, så länge raderna inte flyttas  
Prövningen: Jag sökte i src/, testerna och gränssnittet: inget av det läses. Ofarlig städning, men raderna vakt, leka och framtradande ska inte flyttas, för då ändras ordningen på natten.

**69. hotVilja och setHotVilja används aldrig**  
Var: `src/sim/varg.ts:293-295; src/sim/rovare.ts:30, 443`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: varg.ts har variabeln hotVilja och en sättare som rovare.ts anropar, men ingen läser variabeln. Rollerna tar viljan genom viljaKrok i roller.ts (rad 14 och 20). Sökningen över hela src/ ger inga andra träffar.  
Förslag: Ta bort variabeln, sättaren, anropet och importen. Att göra om setRovarVal till ett fält i LARMHOT är en smaksak och behövs inte.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: variabeln sätts men läses aldrig någonstans. Död kod som kan tas bort utan att något ändras.

**70. Seden "andlig" låses upp på två ställen**  
Var: `src/sim/styre.ts:620; src/sim/kyrka.ts:595-599; src/sim/steg.ts:114, 277`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: stepStyre öppnar seden när minst tre har en tro, men bara när byn har en ledare. kyrkaTimme gör samma sak senare i samma timme genom en krok, och kräver bara att byn har ett styre. kyrka.ts hämtar redan annat från rost.ts, där oppnaSed ligger.  
Förslag: Ta bort raden i stepStyre och behåll kyrkans. Pröva sedan att anropa oppnaSed direkt i kyrka.ts och ta bort kroken och raden i steg.ts.  
Ändras i spelet: Nej. Seden öppnas samma timme som förut, några system senare i slaget.  
Prövningen: Stämmer: två ställen gör samma sak med samma villkor, och kyrkans täcker också byar utan ledare. Kör samma-kollen efteråt, eftersom ordningen inom timmen ändras lite.

**71. Kolumnen sort i handlarnas varor är samma på varje rad**  
Var: `src/sim/handel.ts:175-210, 279; src/sim/byhandling.ts:425; src/test/scenarier/agande.ts:1883`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Varje rad i HANDLARVAROR har sort: V, där V är alla tre sorterna av handlare. Filtren i packa och packaRad släpper därför alltid igenom allt, och scenariots kontroll av att varorna följer sorten kan aldrig bli röd. Kommentaren på rad 178-179 säger att sorten bestämmer varorna, men det gör den inte.  
Förslag: Ta bort kolumnen sort, konstanten V, de två filtren och kontrollen i scenariot, och rätta kommentaren. Vill Björn senare att vagnen har andra varor läggs kolumnen till då, på de rader som skiljer sig.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: alla rader har samma lista, så filtret gör ingenting. Designdokumentet säger bara att det finns olika sorter av handlare, inte att de har olika varor, så inget önskat försvinner.

**72. Fältet 'ute' i boendet sätts aldrig**  
Var: `src/sim/byggnader.ts:290, 322-336, 382, 388, 390`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Boende.ute är deklarerat och läses i utanBadd, homeless och utanTak. Men boende() bygger svaret utan det fältet (rad 334), och inget annat ställe sätter det. De tre grenarna körs aldrig. Att byn saknar tak fångas redan av att de gemensamma platserna är tomma.  
Förslag: Ta bort fältet och de tre läsningarna, och rätta kommentarerna som nämner bäddarna ute (steg 10.2.48).  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Jag hittade inget ställe som sätter fältet, så grenarna är döda. Att ta bort dem ändrar inget i spelet.

**73. Tom lista i utseende.ts**  
Var: `src/test/utseende.ts:49-50,123-125`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: KANDA är en tom lista (det som väntade på ritningar byggdes i v376), så raden 'väntar på ritningar' kan aldrig skrivas. LAGER=1 och DEBUG är sökhjälp som visar var och i vilket lager punkter utanför paletten ligger. De står inte i filens beskrivning eller i CLAUDE.md.  
Förslag: Ta bort KANDA och raden för 'väntar på ritningar'. Behåll LAGER och DEBUG, men skriv dem i kommentaren överst så att de går att hitta.  
Ändras i spelet: Ingen skillnad i spelet.  
Prövningen: KANDA är död kod och kan tas bort utan risk. Sökhjälpen (LAGER, DEBUG) behövs igen nästa gång palettvakten larmar, och utseende-kommandot byggs ut i steg 12.1.43, så den delen av förslaget faller.

**74. Fält i byns tillstånd som skrivs men aldrig läses, eller aldrig används alls**  
Var: `src/sim/lagar.ts:221,230 + src/sim/typer.ts:382 (s.aktOm), src/sim/typer.ts:486 (nastaHandlare), src/sim/rovare.ts:119 (Rovarflock.rotat), src/sim/styre.ts:239 (hanSedd), src/sim/rovare.ts:424 + src/sim/varg.ts:291,302 (storleken till rovarSkydd)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: s.aktOm (vad byn minns om olyckan bakom en rädsla) skrivs för varje vittne men läses aldrig, varken av spelet, gränssnittet eller testerna, och sparas ändå i sparfilen. nastaHandlare, Rovarflock.rotat och hanSedd finns bara i typerna. rovarSkydd tar emot en storlek som den inte använder; den kommer via en krok i varg.ts.  
Förslag: Ta bort de fyra fälten och skrivningen på lagar.ts:230. Parametern om till raddForAkt blir då ledig och tas bort hos anroparna. Storleken till rovarSkydd kan tas bort i samma veva (kroken i varg.ts:291 och anropet på rad 302), men det är en smaksak. Gamla sparfiler som har fälten läses ändå; de ligger bara kvar oanvända.  
Ändras i spelet: Ingen märkbar skillnad. Sparfilen blir något mindre.  
Prövningen: Sökningen bekräftar att inget läser fälten, och designdokumentet nämner inte att olyckan bakom rädslan ska visas. Liten vinst men ingen risk.

**75. animtillspelet.cjs skapar bilder och tal som spelet aldrig läser**  
Var: `bildstil/animtillspelet.cjs:58-59 (rokliten_) och 83 (ANIMTAKT.tornado); src/animbilder.ts (genererad); src/ui/animation.ts:22 (kommentaren)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Skriptet ritar fyra bilder rokliten_0–3 (rök från ett rökhål eller en mindre eld). Spelet frågar aldrig efter dem: animation.ts bygger bara namnen eld, gnistor, rok, tornado, brand och brandrok. ANIMTAKT.tornado (fotens plats) läses inte heller, spelet läser tornadoStorlek, där medel har samma tal. Härden med rökhål är byggd (7.5.3, v507) utan att använda den lilla röken.  
Förslag: Ta bort slingan för rokliten och fältet tornado i ANIMTAKT, och rätta kommentaren i animation.ts så att den pekar på tornadoStorlek. Skapa src/animbilder.ts på nytt.  
Ändras i spelet: Ingen skillnad. animbilder.ts blir fyra bilder mindre.  
Prövningen: Jag sökte i hela src och hittade ingen som läser rokliten eller ANIMTAKT.tornado. Få rader i skriptet, men spelets fil blir mindre och inget kan gå sönder.

**76. Testet av källtext och av att en fil inte finns**  
Var: `src/test/scenarier/agande.ts:3058-3059 (sammanfattning), 1489 (gastsida); src/ui/spara.ts:198`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: sammanfattning läser filen src/ui/spara.ts som text och kontrollerar att en viss rad står där ordagrant (texten 'År 2 av 5 · 40 %' under ikappräkningen, steg 11.1.64). gastsida kontrollerar att filen src/ui/flikar/handlare.ts inte finns. Det första går rött om raden skrivs om, också när spelet fungerar. Det andra kan bara bli rött om någon skapar filen igen.  
Förslag: Ta bort kontrollen av att filen inte finns. Flytta texten för förloppet i spara.ts till en liten funktion som scenariot anropar, i stället för att läsa källkoden som text.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer. Men kontrollen av källtexten är det enda som prövar förloppets text, så den bör bytas mot ett riktigt anrop och inte bara strykas. Vinsten är liten.

**77. s.aktOm skrivs men läses aldrig**  
Var: `src/sim/lagar.ts:221, 230, 261; src/sim/typer.ts:382; src/sim/folk.ts:451-454; src/sim/halsa.ts:421; src/sim/liv.ts:147`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: raddForAkt tar emot en text om olyckan och sparar den i s.aktOm, men ingen kod, ingen panel och inget test läser fältet. Kroken i folk.ts har dessutom en parameter orsak som lagar.ts inte tar emot.  
Förslag: Ta bort fältet och de två parametrarna hos kroken och de två anroparna.  
Ändras i spelet: Nej.  
Prövningen: Stämmer: fältet finns bara där det skrivs och i typen. Det är en rest från tabuna som togs bort i steg 10.2.41. En gammal sparad by kan ha fältet kvar utan att det stör.

**78. Död kod: rovarRoll, hanSedd och fält i berättelserna som ingen mall läser (klanStil väntar på gästerna)**  
Var: `src/sim/rovare.ts:420; src/sim/styre.ts:239; src/sim/framber.ts:24; src/sim/matchber.ts:30; src/sim/tatuering.ts:26-31`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: rovarRoll (rovare.ts:420) nämns bara i en kommentar; indelningen görs i rollVid. Fältet hanSedd läses och skrivs ingenstans. I framBerattelse räknas 'upp' fram men ingen f_-mall läser det (bara 'ner'), och i matchBerattelse läser ingen m_-mall 'nTal'. klanStil anropas inte heller, men designdokumentet säger att en gäst och en inflyttad ska bära sin klans stil; det är alltså en del av steg 10.7.5 som inte kopplats in, inte skräp.  
Förslag: Ta bort rovarRoll, hanSedd, 'upp' i framber och 'nTal' i matchber, och rätta kommentaren i rovare.ts:91. Låt klanStil stå och skriv i steget i Färdplanen att gästens stil återstår, eller koppla in den där gäster skapas.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Sökning i hela src/ visar att de fyra sakerna inte används någonstans. klanStil undantas: designen vill ha klanens stil på gäster, så den ska kopplas in och inte tas bort.

**79. Tom mängd BEARBETA och gammal kommentar i arbetstiderna**  
Var: `src/sim/tider.ts:14, 49, 53`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Funktionen som ger varje handling sitt tidsslag frågar först om handlingen står i mängden BEARBETA, men mängden är tom och fylls aldrig, så den grenen körs aldrig. Kommentaren överst säger att samlandets turer "väntar på Björns svar i steg 2.12.4"; det steget är avbockat i Färdplanen (v124, v132).  
Förslag: Ta bort BEARBETA och grenen, och kommentaren om 2.12.4.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Mängden är tom och används bara på den raden, och steget kommentaren väntar på är byggt sedan länge. Riskfritt.

**80. VARLDKOSTNAD finns i spelets kod men används bara av ett test**  
Var: `src/sim/varldslag.ts:73-75; src/test/varldkostnad.ts:11, 44`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Gränsen VARLDKOSTNAD (världen får kosta högst 2 % av byns datortid) exporteras från simuleringen men läses bara av testet src/test/varldkostnad.ts.  
Förslag: Flytta gränsen och kommentaren till testfilen.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Sökningen visar att bara testet läser talet. Flytten är ofarlig, men vinsten är liten.

**81. Oanvända hjälpfunktioner och dubbel klocktext**  
Var: `src/ui/hjalp.ts:19-23, 34, 57`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: merKnapp (rad 57) och hex (rad 34) används inte någonstans i src. tidForklaring och clockTxt skriver klockslaget var för sig, men med olika text emellan (dagen i tidsåldern).  
Förslag: Ta bort merKnapp och hex. Låt en liten funktion skriva 'kl. 08:05' åt både tidForklaring och clockTxt.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Jag sökte över hela src: ingen anropar merKnapp eller hex. tidForklaring kan inte använda clockTxt rakt av, men klockslaget kan delas.

**82. Död variabel och oanvänd rad i hamtning**  
Var: `src/test/scenarier/byggnader.ts:2198, 2218`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: hamtning hämtar flintans stack till variabeln 'stack' (rad 2198) och har sedan raden 'void stack' (rad 2218) bara för att typkontrollen inte ska klaga. Variabeln används aldrig.  
Förslag: Ta bort båda raderna.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: variabeln läses ingenstans och uppslaget ändrar inget i byn. Två rader bort utan risk.

**83. Tänddonen eldstål och tändstickor finns i registret men inte i spelet**  
Var: `src/sim/typer.ts:521-522; src/sim/eld.ts:121-128 (igniterOf)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Registret över tänddon har fyra rader, men bara flintan och bågborren finns som saker. Eldstål och tändstickor nämns ingen annanstans i koden. Frågan om byns bästa tänddon går ändå igenom dem först varje gång. Tändstickornas rad har halva resurser (0,5 hö och 0,5 grenar per försök), som bryter mot regeln om hela resurser. Eldstålet är ett planerat steg i Färdplanen (12.2.12) och har sin egen rad i dokumentets tabell över tänddon; tändstickor står inte i designdokumentet alls.  
Förslag: Ta bort de två raderna. Eldstålet läggs tillbaka som en riktig sak när steg 12.2.12 byggs; talen finns i designdokumentet. Att flytta eldstäderna och tänddonen från typer.ts till eld.ts är valfritt och bör göras för sig, eftersom brand.ts också läser eldstäderna.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Raderna är byggda i förväg, vilket CLAUDE.md säger att man inte ska göra, och tändstickornas rad bryter mot regeln om hela resurser. Vinsten är liten, men det är riskfritt.

**84. Handlarens rad som håller slaget kort är en dubblett av gästernas**  
Var: `src/sim/handel.ts:10, 941-942; src/sim/gast.ts:115-116, 185`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: handel.ts lägger en rad i SLAGHINDER som håller slaget kort så länge en handlare finns. Men handlaren är sedan steg 9.2.111 en gäst bland folket, och gast.ts har redan en rad som gör samma sak så länge en levande gäst finns på kartan. Handlaren tas bort ur byn i samma ögonblick som gästen går eller dör, så de två raderna säger alltid samma sak.  
Förslag: Ta bort raden i handel.ts och importen som då blir över. Läsarens större idé, att räkna glesare på natten när handlaren sover, tas inte med här: den ändrar hur tiden räknas och behöver ett eget steg med likhetstestet.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Dubbletten stämmer och är ofarlig att ta bort, men vinsten är bara två rader. Den glesare natten är en ändring av klockan och hör inte hit.

**85. Små oanvända rester: LIV.barnDod och smutsIByn**  
Var: `src/sim/liv.ts:76, src/sim/smuts.ts:226, testerna fas9.ts:1325-1334 och natur.ts:1753-1774, ARKITEKTUR.md:162-163`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Balanstalet LIV.barnDod läses ingenstans (upplevelsen barnDod i uppvaxt.ts är en annan sak). smutsIByn används bara av två tester; spelet frågar smutsPunkter och blodRutor direkt, men de är inte exporterade. MEDHAVT är ett register med en rad, vilket följer regeln om register.  
Förslag: Ta bort LIV.barnDod. Exportera smutsPunkter, låt de två testerna fråga den, ta bort smutsIByn och rätta namnet i ARKITEKTUR.md och kommentarerna i blod.ts och rester.ts. MEDHAVT får vara kvar.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer: talet är dött och smutsIByn finns bara för testerna. Liten vinst, men ingen risk.

**86. Export som ingen annan fil använder, och funktioner bara för tester**  
Var: `src/sim/stationer.ts:785, 1375 m.fl.; src/sim/byggplan.ts (Andring, Atgard, Forslag, SkadatVal, golvNu, kanTragolv, nyttLika, ritningOk)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: I stationer.ts exporteras DelRuta, Forvar, Hallare, MATTA_LIST, MATTA_TYG, MattaDef, MattaStorlek, MattaTyg, StationDel, Utkant, friRunt, hallareVid, mattaId och siteMatta utan att någon annan fil, något test eller gränssnittet använder dem. Samma sak gäller åtta namn i byggplan.ts. tommaKnivplatser och golvLedigt används bara av var sitt test.  
Förslag: Ta bort ordet export där det inte behövs. tommaKnivplatser kan flyttas till testet (det är tommaPlatser med 'kniv'). golvLedigt bygger på en funktion som inte syns utanför filen, så den får stå kvar eller bytas mot att testet frågar på ett annat sätt.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Sökningen över hela src, också testerna och gränssnittet, bekräftar listan. Det är ren städning utan risk, men det sparar nästan inga rader.

**87. Tändstickor som inte finns, och fält i eldregistren som ingen läser**  
Var: `src/sim/typer.ts:507-522 (HEARTHS, IGNITERS), src/sim/eld.ts:121-127 (igniterOf)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: IGNITERS har fyra rader: flinta, bågborr, eldstål och tändstickor. Eldstål och tändstickor finns inte som saker och kan aldrig ligga i förrådet, så igniterOf går igenom dem utan att de kan väljas. Fältet requires på eldstäder och tänddon läses aldrig, och inte heller tänddonens desc (eldstädernas desc visas i eldfliken och ska vara kvar). Kommentaren om spread säger 'används när brandsystemet finns' fast branden redan läser det (brand.ts:401). Eldstålet är ett obyggt steg i Färdplanen (12.2.12), med samma hö och pinnar som raden har. Tändstickor finns inte i Färdplanen och hör inte till spelets tid.  
Förslag: Ta bort raden tandstickor, fältet requires i båda registren och desc hos tänddonen, och rätta kommentaren om spread. Raden eldstal får stå kvar till steg 12.2.12, eller tas bort och skrivs då; den gör ingen skada.  
Ändras i spelet: Ingen märkbar skillnad: de två tänddonen har aldrig gått att få.  
Prövningen: Det stämmer i koden, och inget test räknar raderna. Vinsten är liten, men tändstickorna och de olästa fälten vilseleder den som läser registret; eldstålet är planerat och kan stå kvar.

**88. Balanstalet STEG.blekSek används inte**  
Var: `src/sim/steg.ts:158 (blekSek), 590 (raden 'relationerna' med sek: 600)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: STEG.blekSek: 600 står som balanstal och visas i npm run talen, men ingen kod läser det (en enda träff i hela src). Takten står som det fasta talet 600 i raden 'relationerna' i TAKTER. Den som prövar ett annat värde med jamfor --satt får ingen skillnad.  
Förslag: Ta bort blekSek och rätta kommentaren. Takten är radens sek i registret, och blekningen räknas per tid med STEG.blek.  
Ändras i spelet: Nej.  
Prövningen: Stämmer: talet läses ingenstans, varken i spelet, gränssnittet eller testerna. Ett balanstal som inte gör något lurar den som balanserar.

**89. Små rester: text för gamla sparningar och val som ger samma svar**  
Var: `src/ui/flikar/person.ts:633; src/ui/flikar/hus.ts:63; src/ui/flikar/filt.ts:115; src/ui/flikar/seder.ts:69`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: person.ts byter "Kom på " mot "Uppfann " i personens viktiga händelser, men simuleringen skriver redan "Uppfann …" (teknik.ts:293), så bytet träffar bara gamla sparningar. hus.ts skriver "Huset byggdes innan byn började minnas var materialet kom ifrån" när huset saknar uppgift om materialet; det gäller också ett hus som just planerats och inte fått något material än, och då är meningen fel. Två val ger samma ord åt båda hållen: 'bud' eller 'bud', och 'minns' eller 'minns'.  
Förslag: Ta bort bytet av "Kom på", byt husets mening mot en som stämmer i båda fallen (t.ex. "Inget material än" eller ett streck) och ta bort de två valen som inte väljer något.  
Ändras i spelet: Ingen märkbar skillnad i en ny by. I en mycket gammal sparad by kan en viktig händelse börja med "Kom på", och ett hus utan uppgift om materialet får en kortare text.  
Prövningen: Alla fyra stämmer i koden och inget test frågar efter texterna. Vinsten är liten men ofarlig, och husets mening är dessutom fel för ett hus som inte börjat byggas.

**90. Runstenen och bandet för Folket finns kvar i bilderna fast fliken är borta**  
Var: `src/guibilder.ts:13 (runsten.folket, band.folket och farg.folket); src/ui/runstenar.ts:9-11; bildstil/guitillspelet.cjs`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Registret STEN har ingen rad för folket, och inget annat i spelet pekar på bilderna (sökt i hela src). Runstenen i tre lägen, bandet och färgerna för Folket, ungefär 7,7 KB, skrivs ändå in i spelet. Hela delen farg i samma fil (flikarnas färger) läses inte heller av någon kod.  
Förslag: Ta bort folket ur det som guitillspelet.cjs skriver, och delen farg om den inte ska användas, och skriv om filen.  
Ändras i spelet: Ingen skillnad. Spelets fil blir ungefär 8 KB mindre.  
Prövningen: Stämmer: bilderna används inte sedan Folkets flik togs bort. En liten ändring i skriptet, utan risk för spelet.

**91. Gammal flytt av stekhällen från grillen till härden**  
Var: `src/sim/stationer.ts:1305-1312, 1670; src/test/scenarier/fas9.ts:1133-1150 (scenariot stek)`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: stekhallTillHarden körs varje timme och letar efter en stekhäll som ligger vid en grill, för att flytta den till en härd. Sedan steg 10.2.87 hör stekhällen till härden i registret, så ingen ny stekhäll hamnar vid grillen. Koden finns bara för byar sparade före v527. Scenariot stek prövar flytten.  
Förslag: Ta bort funktionen och anropet, och ta bort den kontrollen ur scenariot stek. Stryk också meningen om flytten i steg 10.2.87 om Björn vill.  
Ändras i spelet: Ingen skillnad i nya byar. En by sparad före v527 som har en stekhäll vid grillen och ännu ingen härd behåller den vid grillen; byn gör då en ny stekhäll till härden (en huggen sten, tio minuter).  
Prövningen: Det stämmer: ingen kod lägger längre en stekhäll vid grillen. Det enda som går förlorat är en stekhäll i en mycket gammal sparad by utan härd, och den görs om billigt.

**92. Kod för äldre sparfiler i motorn**  
Var: `src/sim/steg.ts:219, 394, 547, 744, 751; src/sim/varld.ts:338 (migrate); src/sim/klocka.ts:24; src/sim/sjukdom.ts:134; src/sim/typer.ts:262, 454; src/ui/flikar/person.ts:309; src/test/scenarier/kontroll.ts:366, religion.ts:144`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Fyra rester. (1) Handarbetet tvinnar rep "för äldre sparfiler", men inget i koden ger längre handarbetet verktyget rep. (2) s.stegRest tas bort i varje anrop av stegBy; migrate gör det inte. (3) p.framme tas bort för varje person i varje slag, fast migrate redan gör det när byn läses in. (4) Den gamla sjukklockan sickUntil sätts aldrig av spelet, men läses på tre ställen, och två scenarier sätter den för att göra någon sjuk.  
Förslag: Ta bort (1) och (3) direkt. Flytta (2) till en rad i migrate. Ta bort (4) sedan scenarierna kontroll och religion skrivits om till den nya sjukdomen (p.sjuk).  
Ändras i spelet: Ingen märkbar skillnad. Björns sparade by har öppnats många gånger sedan dess, så den gamla sjukklockan har gått ut och repet är klart.  
Prövningen: Stämmer, men läsaren missade att två scenarier använder sickUntil och att stegRest inte finns i migrate. Vinsten är liten, och det ska göras i den ordning som står i förslaget.

**93. Rester av pyntet: pyntSort svarar alltid kruka, och ARKITEKTUR.md beskriver borttagna möbler**  
Var: `src/sim/stationer.ts:345, 884-894; src/sim/forradsmal.ts:231; src/test/scenarier/kultur.ts:790-793, 2858, 2888; ARKITEKTUR.md:145`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Bonaden och väggbrädet är borttagna (steg 10.2.110). PYNT_SMAK har två rader: krukan, som alla tycker om, och mattan, som hälften tycker om. pyntSort ger därför alltid 'kruka', och den och PYNT_SORTER används bara av två tester. ARKITEKTUR.md beskriver fortfarande bonaden och väggbrädet.  
Förslag: Ta bort pyntSort och PYNT_SORTER och de två kontrollerna i testerna, och rätta raden i ARKITEKTUR.md och kommentaren vid rad 345. Smaktabellen kan stå kvar som register (två rader). Tas den ändå bort måste mattans tal räknas exakt som nu (hash3 med saltet 44), annars byter folk smak.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer att pyntSort bara lever i testerna och att dokumentationen är gammal. Designdokumentet har kvar två sorters pynt (krukor och mattor), så tabellen i sig gör ingen skada.

### Förenkla (38)

**94. Listan SALLSYNT upprepar samma skäl många gånger**  
Var: `src/test/scenarier/iakttagare.ts:16-202 (SALLSYNT), 208-240 (blocken med [nycklar, skäl]), 263-278 (kolla)`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 110 rader bort.  
I dag: Kontrollen 'allt i registren används' godkänner en sak som aldrig hänt om den står i SALLSYNT med ett skäl. Listan är ca 190 rader. 69 rader har samma text om 'sen teknik i fas 7 … hantverk7', och fängelsenycklarna har samma mening sju gånger. Längre ned i filen finns redan ett kortare skrivsätt: en lista nycklar och ett skäl.  
Förslag: Skriv hela listan som blocken längre ned gör: [nycklar], skäl, så att varje skäl står en gång. Behåll kontrollen och undantagslistan som de är. Släpp inte listan: då larmar testet inte längre när en vanlig sak slutar användas.  
Ändras i spelet: Nej. Bara testets källkod blir kortare.  
Prövningen: Upprepningen stämmer och går att korta utan risk. Men läsaren har fel i att kontrollen aldrig kan bli röd: en sak utanför listan som aldrig används ger rött, och en nyckel i listan som inte finns i registren ger också rött. Därför håller bara grupperingen, inte förslaget att ta bort listan. Designdokumentet (fliken Läget) nämner inte listan.

**95. Trycket och pekaren har var sin lista över vad som går att trycka på**  
Var: `src/ui/interaktion.ts:93-132, 182-196`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 10 rader bort.  
I dag: Kedjan för ett tryck (rad 105-132) och uttrycket som väljer muspekare (rad 195) räknar upp det tryckbara var för sig. De har glidit isär: pekaren saknar runsten, grav, helig plats, kvarleva, matta och sjö. Över dem visas 'grab' fast de går att trycka på. I kedjan slås nästan varje sak upp två gånger, och djurAt körs två gånger per musrörelse (rad 193 och 195).  
Förslag: En funktion, t.ex. vadAt(gx, gy), som går igenom en lista med rader i samma ordning som kedjan har i dag och svarar med det som ligger där. Trycket väljer det den svarar, pekaren blir en hand när den svarar något. Testlägets tryck (flytta, brand, blixt) ligger kvar före listan.  
Ändras i spelet: Pekaren blir en hand också över grav, runsten, helig plats, kvarleva, matta och sjö. Inget annat ändras.  
Prövningen: Stämmer rad för rad: sex tryckbara saker saknas i pekarens lista. Ordningen i kedjan avgör vad som väljs när flera saker ligger på samma ruta, så den måste behållas exakt.

**96. Scenarier som ändrar spelets register och ställer tillbaka dem för hand**  
Var: `src/test/scenarier/fas10.ts:700-701 och 735, 825-826 och 855 (MOTGANGAR), 696-697 och 734 (DRAGKALLOR); behov.ts:727-733 (OLYCKOR); grund.ts:753; religion.ts:42-63, 73-93, 103-119; folk.ts:338-382 (UPPLEVELSER)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Flera scenarier ändrar ett tal i ett register (alla motgångars chans till noll, olyckornas risk gånger tio, upplevelsernas chans till 3), kör provet och skriver tillbaka de gamla talen i ett "finally". Samma spara-ändra-återställ står två gånger i fas10 för motgångarna och fyra-fem gånger i religion.ts och folk.ts för upplevelserna. Alla ställen återställer rätt i dag.  
Förslag: En hjälpare i hjalp.ts som tar ett register, ett fält och ett nytt värde, kör provet och alltid ställer tillbaka (t.ex. medTal(MOTGANGAR, 'chans', 0, () => …)). Scenarierna anropar den. Omslaget för HALSA_PROV.grov (behov.ts:1028-1031) är redan samlat och rörs inte.  
Ändras i spelet: Nej. Bara testerna ändras. Scenarierna binasar, vinterhonung, vard och de i religion.ts och folk.ts ska köras efteråt.  
Prövningen: Stämmer, och mönstret finns på fler ställen än läsaren såg (religion.ts och folk.ts). Vinsten är liten men ändringen är ofarlig, och en gemensam hjälpare gör att ingen glömmer återställningen i nästa scenario.

**97. Tester som skriver av registrets egna tal**  
Var: `src/test/scenarier/byggnader.ts:878-880, 893-894, 1215, 2319, 2355`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: stackar skriver av stackarnas storlekar (harskinn 30, vilt 5, flinta 20 och en lista 'som förut') och jämför med samma tabell. vilafart kollar att golv och mark är exakt 0,6 och 0,4 av bädden. snickarbank och skrivpulpet kollar att receptet är exakt 2 virke, 2 plankor (eller 2 plankor, 1 virke) och 15 minuter. Ändras ett balanstal måste testet ändras på samma gång, utan att något i spelet är fel.  
Förslag: Ta bort de två första kontrollerna i stackar (behåll 'en full stack väger lika' och 'plocka upp'), raden om golv och mark i vilafart och receptraderna i snickarbank och skrivpulpet. Behåll raden om att vilan tar 2,5-3,5 timmar: den är en gräns och inte en avskrift. Arbetstiderna vaktas redan av vakten för arbetstider.  
Ändras i spelet: Ingen skillnad. Balanstal kan ändras utan att testerna måste följa med.  
Prövningen: Stämmer: kontrollerna jämför en tabell med en avskrift av samma tabell. Jag behåller vilans tidsgräns, som fyndet ville ta bort, eftersom den prövar ett spann och inte ett exakt tal.

**98. Två platser för rövarflockarna: s.rovare och s.rovareFler**  
Var: `src/sim/rovare.ts:191, 361, 878-894; src/sim/rader.ts:64, 213; src/sim/gastvardag.ts:54, 131; src/sim/grav.ts:322; src/sim/tornado.ts:308; src/sim/varld.ts:279, 337; src/sim/steg.ts:1306; src/ui/gaster.ts:61; src/ui/vaxter.ts:247`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Den första flocken ligger i s.rovare och de som kommer under tiden i listan s.rovareFler. Uttrycket [s.rovare, ...(s.rovareFler ?? [])] skrivs ut på ungefär femton ställen i sju filer, fast hjälpfunktionen flockar() finns i rovare.ts (den exporteras inte). Möten mellan gäng prövas bara mellan den första och de andra. s.rovare används på 82 ställen, de flesta i testerna.  
Förslag: Första steget, litet och säkert: exportera flockar(s) och använd den på alla ställen. En enda lista (s.rovarflockar) är ett större steg: runt 50 rader i testerna ändras och sparade byar måste flyttas över, så det görs bara om Björn vill.  
Ändras i spelet: Ingen skillnad med första steget. Med en enda lista kan också två senare gäng mötas och slåss.  
Prövningen: Stämmer. Jag krympte förslaget: att använda flockar() överallt ger det mesta av vinsten utan att röra sparade byar. Hela bytet till en lista rör 82 ställen och sparformatet och är inte värt risken nu.

**99. Samma värld körs om i flera scenarier för att se att ett system används**  
Var: `src/test/scenarier/fas11.ts:2449,2751,2799 (30 dygn); 3088,3161 (40 dygn); 2953 (20 dygn); 3688`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Handelsfärden, gåvan och mutan kör alla exakt samma värld (testbyn efter 10 dygn) i 30 dygn (30 år i spelet) och ser sedan efter var sin räknare. Kriget och sändebudet kör samma värld i 40 dygn var för sig. Det är samma uträkning flera gånger, och den kostar datortid. Kontrollerna i sig kan bli röda och behövs: ett nytt system som aldrig används är ett fel som ska rättas direkt.  
Förslag: En hjälpare varldEfter(dygn) i hjalp.ts som räknar världen en gång och minns svaret, som testBy gör. Scenarierna behåller sina egna kontroller men delar körningen. Kontrollerna flyttas inte till balanskörningen.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Körningarna är verkligen identiska, så de kan delas utan att något prövas sämre. Läsarens förslag att ta bort kontrollerna faller: balanskörningen görs först i fasens slut. Vinsten är datortid när flera scenarier körs i samma process, inte rader.

**100. De 13 filerna för väckta byar står inte i ARKITEKTUR.md**  
Var: `src/sim/vackt.ts:72-146; src/sim/vacktsomna.ts:66; ARKITEKTUR.md`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Läsaren hade fel om koden: det finns en väg, inte två. Registret BYGGARE har en rad per byggare. vackBy kör alla rader på en gång, och borjaVacka sprider samma rader över resan (köhändelsen vackSteg). Minnesbilden är redan en rad i registret (vackt.ts:78). Det som stämmer är att ARKITEKTUR.md inte nämner någon av de 13 vackt-filerna (ungefär 1 280 rader), fast regeln är att den filen läses först för att hitta rätt.  
Förslag: Skriv in vackt-filerna i ARKITEKTUR.md: registret BYGGARE, de två sätten att köra det, minnesbilden och hur en by somnar. Ingen kod ändras.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Koden är redan byggd som förslaget vill, så den delen faller. Luckan i ARKITEKTUR.md finns och är lätt att täppa till.

**101. Ett fyrtiotal krokar och små krokfiler som bara finns för att undvika import i cirkel**  
Var: `src/sim/stationseldkrok.ts (6 rader); src/sim/nara.ts (4); src/sim/stubbar.ts; src/sim/efterstrid.ts; src/sim/roller.ts; src/sim/skriftTal.ts; src/sim/kultlatt.ts; klaner.ts:128 (prisKrok); gast.ts:16; matlagning.ts:381; tornado.ts:201 med flera; ARKITEKTUR.md rad 246`. Vinst 3 av 5, risk 3 av 5, flera steg, ungefär 100 rader bort.  
I dag: Omkring 40 krokobjekt (bakKrok, prisKrok, gastKrok, flockKrok med flera) sätts av en annan fil när den laddas. Några har ett eget standardvärde som dubblerar ett balanstal, t.ex. bakKrok = 25/60 i stationseldkrok.ts, som matlagning.ts:381 sedan skriver över med KATEGORIER.brod.passiv / 60. ARKITEKTUR.md säger att importerna delvis går i cirkel och att ett block i en annan fil därför inte får läsas när filen laddas. Krokfilerna är gjorda med flit (steg 10.2.85) för att ordningen filerna läses i inte ska spela roll.  
Förslag: Gör det stegvis, inte allt på en gång. Börja med krokarna som har ett eget standardvärde eller en egen kopia av en funktion (bakKrok, rokKrok, klanById i gast.ts): byt dem mot en vanlig import där funktionen bara anropas under spelet. Kör `npm run samma` efter varje, eftersom en ändrad laddordning kan ändra ordningen i register. Behåll kroken där något läses redan vid laddningen.  
Ändras i spelet: Ingen märkbar skillnad, om ordningen i registren hålls.  
Prövningen: Krokarna gör att man inte ser vem som anropar vad, och ett värde står på två ställen. Men de finns av ett verkligt skäl (cirklarna), så det måste göras en krok i taget med samma-kollen, och vinsten är halva den läsaren räknade med.

**102. Grannbyns tal finns i två kopior: raden och "förbindelsen" (Klan)**  
Var: `src/sim/klaner.ts:59-70; src/sim/rad.ts:140,216; src/sim/byrel.ts:55-78; src/sim/rader.ts:76,90; src/sim/grannbyar.ts; src/sim/rovare.ts; src/sim/styre.ts; src/ui/flikar/grannar.ts; src/test/scenarier/fas11.ts:591,712,740`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 30 rader bort.  
I dag: Varje grannby har en rad i världen (r.tal.folk, r.tal.styrka, r.tal.rikedom, r.tro) och dessutom en förbindelse (Klan i r.syn) med samma tal en gång till (folk, styrka, resurser, krigisk). rad.ts:140 kopierar talen från raden till förbindelsen efter varje period och köpost. Ungefär 30 ställen i sex filer läser kopian. Hållningen till huvudbyn ligger i förbindelsen (Klan.inst), hållningen mellan andra byar i vl.rel; byrel.ts väljer rätt ställe. Förbindelsen i sig är önskad: designdokumentet (steg 11.2.15 och 12.1.30) säger att raden bär förbindelsen med hållningen, personerna, priserna och restiden.  
Förslag: Gör det i liten skala: ta bort de fyra kopierade talen ur Klan och låt läsarna hämta dem ur raden (en liten hjälpare radAv(k)). Kopieringen i rad.ts:140 och 216, den döda skrivningen i klanMinns och tre kontroller i scenarierna försvinner. Behåll förbindelsen för det som bara gäller huvudbyn (hållningen, personerna, de döda, restiden). Att slå ihop personlistorna och flytta hållningen till vl.rel är ett större arbete och görs inte nu.  
Ändras i spelet: Ingen märkbar skillnad. En uppgradering av sparfilen behövs som tar bort de gamla fälten.  
Prövningen: Kopian finns och hålls i takt för hand, och en skrivning till kopian (klanMinns) skrivs redan över utan att någon märkt det. Hela förslaget (ta bort Klan) är för stort och går emot designdokumentet, men de fyra dubbla talen går att ta bort utan att spelet ändras.

**103. Fritiden, kvällen och handarbetet är tre handskrivna väljare som kunde vara ett register**  
Var: `src/sim/val.ts:1328-1348 (craft), 1374-1431 (leisure), 1434-1443 (skrift), 1473-1489 (night); 601, 1337, 1388 (gå i lära på tre ställen); 573-577 och 1340-1341 (försöken på två); 798-818 och 1330-1335 (slakta, rensa, torka, grilla på två)`. Vinst 3 av 5, risk 3 av 5, flera steg, ungefär 30 rader bort.  
I dag: leisure drar först slantar i tur och ordning (lära, besök i fängelset, gravbesök, bön, skrift), var och en mot sin egen nämnare: läran räknar med bad och strand, de andra inte. Sedan kommer ett vägt val över åtta vikter med omräkning när sport eller match inte blir av. night är en trappa av trösklar på ett enda slumptal. craft är en egen poänglista över sysslor som också finns som rader på Rädda och Förbättra. Designdokumentet säger att alla nio nivåer ska vara rader i registret, också Fritid, och att ingen nivå avgörs vid sidan av registret.  
Förslag: Ett register FRITID med samma form som FORBATTRA: en rad per sak med vikt och det som görs, dag eller natt, och ett vägt val. Handarbetet blir en rad som frågar samma kandidater som Förbättra. Görs som ett eget steg med scenarierna fritid och aktivitet och npm run likhet.  
Ändras i spelet: Fördelningen på fritiden ändras lite: det som i dag prövas först (lära, besök, bön) blir något ovanligare. Kvällarna får samma sorts val som dagarna. Vikterna behöver ses över en gång.  
Prövningen: Stämmer i koden, och både principen om register och designdokumentet säger att fritiden ska vara rader. En ny fritidssyssla kräver i dag ett nytt villkor mitt i en lång funktion.

**104. Fritiden väljs med flera dragningar efter varandra i stället för en lista med vikter**  
Var: `src/sim/val.ts:1374-1443`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 20 rader bort.  
I dag: leisure drar först för lära, sedan fängelsebesök, gravbesök, bön och skrift, var och en med sin egen dragning. Summorna de vägs mot är inte desamma: lärans har bad och strand med, de andras inte. Sist kommer en dragning över åtta vikter där sport och titta räknas om till de andra om ingen följer med. Summan av vikterna skrivs ut ett tiotal gånger. Handarbetet (craft) och Förbättra löser samma sak med en lista av kandidater.  
Förslag: En lista med kandidater (vikt och vad som görs) för allt på fritiden och en enda dragning. Det som inte går just nu (ingen match att se, ingen att följa med) tas bort ur listan före dragningen.  
Ändras i spelet: Lite. Bön, gravbesök, besök hos fången och skrift väljs något mer sällan än nu, mest på sommaren när badet väger tungt, eftersom de i dag bara vägs mot vila, hantverk, umgänge och promenad. Talen kan justeras i fasens Balans. Byarna får annan slump.  
Prövningen: Det stämmer, och en lista med vikter är det arbetssätt projektet redan valt (förra genomgångens fynd 11 gjorde lärandet till en vikt bland fritidens). Det ändrar hur ofta tron och skriften väljs, så testerna för religion och skrift måste köras efteråt.

**105. Vårdregistret VARD har fasta listor bredvid sig och ett fält som aldrig sätts**  
Var: `src/sim/halsa.ts:588-592, 615-628, 631-644, 660, 666-675, 746-749; src/sim/resa.ts:1395; src/sim/paborjat.ts:56; src/test/vard.ts`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 10 rader bort.  
I dag: Behandlingarnas namn står i fasta listor i vardHamtas, vardBehov, vardKlar och VAGVARD, och vardKan har egna specialfall för amputation, salva och förband. En ny behandling måste läggas in på flera ställen; så uppstod felet med förbandsbytet. Fältet 'senare' sätts inte på någon rad. Fälten tid och risk läses bara av utskriften npm run vard: spelet använder en enda tid för all vård (HALSA.vardMin, 5 minuter) och slår aldrig risken. Ordningen i vardKlar är inte registrets ordning, och den spelar roll (avsnörningen måste komma före trycket, annars görs den aldrig).  
Förslag: Ta bort fältet 'senare'. Ge raderna de fält listorna behöver ('hemma', 'paVag', 'hamtas' och en ordning) och låt vardBehov, vardKlar, vardHamtas och VAGVARD fråga registret, med samma innehåll och samma ordning som i dag. Låt plaggAtt och rivRemsa dela sökningen efter ett plagg. Fälten tid och risk står i designdokumentet som delar av registret; de lämnas kvar tills Björn sagt om de ska byggas in eller strykas.  
Ändras i spelet: Nej, om listorna får samma innehåll och samma ordning.  
Prövningen: Listorna finns och gav ett verkligt fel. Jag ändrade förslaget: tid och risk tas inte bort, eftersom designdokumentet (Vårdregistret, steg 9.5.6) säger att varje rad har tiden och risken att det går fel; det är alltså obyggt, inte överflödigt.

**106. Flintan avgörs på fem ställen**  
Var: `src/sim/val.ts:674-679 (tandFryser), 851-853 (raden leta), 1119-1123 (projektArbete, VAL.letaChans), 1267-1270 (withTools, VAL.stenarChans och matLeta), 863 (raden tand via needTinder); src/sim/eld.ts:249-251, 524-527; src/sim/forradsmal.ts:137`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 10 rader bort.  
I dag: Flintans förrådsmål räknar redan in flintan till elden och redskapen, och raden leta har poäng efter bristen (steg 10.11.13, som skulle ersätta de fasta chanserna). Ändå finns de äldre vägarna kvar: varannan som går och samlar mat skickas till stenarna ett helt dubbelt pass när flinta eller sten är under bufferten (stenarChans 0,5), ett projekt som saknar flinta har en egen chans (letaChans 0,3), och tändraden gäller också när det är flinta som saknas. Varje samlare hittar dessutom flinta av sig själv när den är under bufferten.  
Förslag: Gör det i steg 12.1.39, som redan finns i Färdplanen och säger att flinta och stenar blir egna behov med egen handling och att den som plockar bär gör det för matens skull. Ta då bort stenarChans och matLeta i withTools, letaChans i projektArbete och flintans del av needTinder. Behåll raden leta och nödraden tandFryser. Pröva med scenarierna flinta och knapphet att byn fortfarande får sin första flinta.  
Ändras i spelet: Den som går för att samla mat samlar mat och skickas inte till stenarna på slump. Flinta letas av dem som väljer det efter bristen. Byn kan få flinta senare i början om raden leta inte får väga mer samtidigt (förra fyndet).  
Prövningen: De gamla slumpvägarna finns kvar som läsaren säger, och både steg 10.11.13 och det obyggda steget 12.1.39 säger att de ska bort. Risken är att flintan kommer senare, så det görs ihop med 12.1.39.

**107. Personloggen avgör om en händelse är ledsam genom att leta efter ord i texten**  
Var: `src/sim/personlogg.ts:19-38; src/sim/folk.ts:402 (log, ca 370 anrop); src/sim/historik.ts:66 (kronika, 75); src/sim/notiser.ts:20,82 (notis, 63); exempel: rovare.ts:814-815, gastvardag.ts:133`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 30 rader bort.  
I dag: Det finns flera kanaler för "något hände" (logg, krönika, notis, personlogg), och på ett trettiotal ställen anropas två eller tre efter varandra med samma text. Notiserna och personloggen har redan var sitt register, och personloggen får sina rader ur notiserna genom registret. Tonen för fyra slag (titel, relation, de närstående, sjukdom) avgörs genom att leta efter ord i den färdiga svenska texten (ontOrd, /frisk/), så en omskriven mening kan byta ton utan att någon märker det.  
Förslag: Gör det lilla: låt den som skriver händelsen säga tonen (gott eller ont) i stället för ordletandet, och gör en liten hjälpare för det vanliga paret logg + notis med samma text. Ett enda händelseregister för alla 370 loggrader är för stort för vinsten.  
Ändras i spelet: Ingen märkbar skillnad. Enstaka rader i en persons logg kan byta ton där ordletandet i dag gissar fel.  
Prövningen: Ordletandet är skört och lätt att byta mot ett fält. Det stora förslaget (ett register för alla händelser) faller: registren finns redan för notiser och personlogg, och 370 anrop är för mycket att röra för en liten vinst.

**108. Slå ihop pynt och matta()**  
Var: `src/test/scenarier/kultur.ts:789-833 (matta), 834-886 (pynt), 794, 845`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 10 rader bort.  
I dag: Scenariot pynt bygger en by där en person väver en matta (upp till 240 speltimmar i en slinga) och anropar sedan matta(), som bygger samma by från början och väver en matta en gång till. Smaken för mattor räknas två gånger: hos 12 personer (rad 845) och hos 60 (rad 794).  
Förslag: Låt matta() ta emot byn och personen från pynt (det som måste mätas före bygget görs före slingan), så att mattan vävs en gång. Behåll smakkontrollen med 60 personer och ta bort den med 12.  
Ändras i spelet: Nej.  
Prövningen: Stämmer: samma bygge körs två gånger, vilket också kostar testtid. Uppställningarna skiljer sig lite (virke, vilka som kan tekniken, vilka projekt som får högre vikt), så sammanslagningen måste prövas med scenariot; vinsten är ungefär 10 rader, inte 35.

**109. Klanens folk, styrka och rikedom är en kopia av raden, och rädens döda dras från kopian**  
Var: `src/sim/rad.ts:140; src/sim/rader.ts:90; src/sim/klaner.ts:63; src/sim/grannbyar.ts:37, 86; src/sim/byhandling.ts:524-529; src/test/scenarier/fas11.ts:591, 740`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 10 rader bort.  
I dag: Varje by i världen har sina tal i raden, och huvudbyns förbindelse med byn (klanen) har samma tal en gång till: folk, styrka och resurser. En rad i rad.ts kopierar över dem efter varje timme i världen. När en rövare dör i byn drar klanMinns en från kopians folk och styrka, men kopian skrivs över nästa timme. De döda dras på riktigt från raden när flocken lämnat kartan (byhandling.ts:529). Raden i klanMinns gör alltså bara att talen i grannfliken sjunker en stund och sedan går tillbaka.  
Förslag: Minsta varianten: ta bort den verkningslösa raden rader.ts:90. Den större: ta bort folk, styrka och resurser ur klanen och låt läsarna fråga raden, och ta bort kopieringen i rad.ts:140. Den större kräver en uppgradering av sparfilen, och två scenarier i fas11.ts som prövar att kopian följer raden skrivs om.  
Ändras i spelet: Ingen märkbar skillnad. Grannfliken visar samma tal utan en timmes eftersläpning och utan att talen hoppar under en räd.  
Prövningen: Koden stämmer med fyndet: kopian skrivs över varje timme, och de döda dras på riktigt i byhandling.ts. Den lilla varianten är riskfri; den större är värd att göra som ett eget steg, eftersom omkring 30 läsningar och sparfilen berörs.

**110. Arvet: fem likadana utdelningar och en utjämning i upp till hundra varv**  
Var: `src/sim/arv.ts:51-73, 74-93, 99; src/sim/lager.ts:275-286 (passOn, används bara av arvet)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Hus, redskap, djur, bikupor och höns delas ut i fem slingor med samma mönster: till den som hittills fått minst, lägg till värdet, skriv vad hen fick. Resten av förrådet delas först stack för stack (passOn), och sedan flyttas en sak i taget mellan arvingarna i upp till 100 varv. Statistiken 'arv' räknas inte när arvet bara var djur, bikupor eller höns.  
Förslag: En hjälpfunktion ge(namn, värde, byt ägare) för de fem slagen, och 'arv' räknas när någon fick något. Delningen av förrådet (passOn och utjämningen) lämnas som den är: en ny delning behöver en ny funktion i lagret som flyttar ägande också i högar utanför förrådet, och blir inte säkert kortare.  
Ändras i spelet: Ingen skillnad i vem som ärver vad. Arv av bara djur, bikupor eller höns syns i statistiken.  
Prövningen: De fem slingorna är lika och går att samla utan att spelet ändras, och statistiken har en lucka. Förslaget att också dela förrådet på ett nytt sätt tas inte med: det ändrar vem som får vad, och med en ensam arvinge (det vanliga, partnern) gör utjämningen ändå ingenting.

**111. Krönikans slag står i två register: ett i simuleringen och ett i 'medan du var borta'**  
Var: `src/ui/borta.ts:14-24, 36; src/sim/historik.ts:52-62`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: BORTA_VIKT räknar upp 26 slag av händelser med en vikt var. KRONIKA_KAT räknar upp samma slag per kategori. Ett nytt slag som bara läggs i KRONIKA_KAT får vikten 1 och räknas som en småsak i berättelsen om tiden man var borta. Så är det i dag för bland annat sjukdom, sändebud, tro, runstenar och arv.  
Förslag: Lägg vikten per slag i KRONIKA_KAT (slaget och dess vikt på samma rad) och låt borta.ts fråga registret. Behåll vikt per slag, inte per kategori, så att berättelsen blir som nu.  
Ändras i spelet: Med vikt per slag: ingen skillnad. Björn kan samtidigt se om något nyare slag (till exempel sjukdom) borde väga mer än en småsak.  
Prövningen: Stämmer, och det följer regeln om ett ställe per sak. Fyndet överdriver lite: ett slag som saknas kommer med som småsak, det försvinner inte. Ingen annan kod läser BORTA_VIKT.

**112. Två sätt att visa ett slag i bilden: händelser för folk, loggsökning för djur**  
Var: `src/ui/stridkarta.ts:8, 21-34 (djuretNu); src/ui/stridbild.ts:20-37; src/ui/vaxter.ts:94-101, 167-168; src/sim/kartstrid.ts:74-85`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Människornas slag kommer som händelser från striden: ett slag i koden är ett slag i bilden. Vargens och björnens slag hittas i stället genom att hela stridens logg kopieras och vänds för varje djur varje bildruta och söks efter ett slag de senaste 0,6 sekunderna. Knuffen gungar sedan i jämn takt efter datorns klocka. Djurens slag skickas redan som händelser, men utan uppgift om vilket djur som slog.  
Förslag: Låt slaghändelsen (SlagBild i sim/kartstrid.ts) bära kämpens nummer också för djur, och låt djuret knuffas fram under slagets egen tid, som människorna. Då försvinner loggsökningen, SLAG_SEK och den egna takten.  
Ändras i spelet: Bara bilden: vargens och björnens knuff följer varje verkligt slag i stället för att gunga i jämn takt. Knuffen mot målet och tillbaka (steg 11.14.1) finns kvar.  
Prövningen: Stämmer, och följer principen 'ett slag är en händelse' som stridbild.ts redan bygger på. Händelsen sparas inte med byn, så det nya fältet är ofarligt; scenarierna stridkarta och slagbild ska köras efteråt.

**113. Det som plockades skickas till UTFALL genom en global variabel**  
Var: `src/sim/steg.ts:1101-1124, 1363, 1377, 1388, 1400, 1424, 1546-1548`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 5 rader bort.  
I dag: rundaSteg sätter den globala plockSlag före varje anrop av workStep och nollar den efteråt, på fyra ställen. UTFALL.samla läser den. Samtidigt får workStep parametrarna runda och plock, som säger nästan samma sak. Kastar workStep ett fel ligger värdet kvar till nästa person.  
Förslag: Skicka slaget som parameter till workStep och vidare till UTFALL (i samma paket som y, rich och bar). Gör det tillsammans med fyndet om den döda vägen, så blir runda, plock och plockSlag en enda parameter.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer. Det blir enkelt och säkert först när den döda vägen utan runda är borta, så de två hör ihop.

**114. Dagens halva pass (VAL.pass och kort) bakas in i talen**  
Var: `src/sim/val.ts:98, 556, 956, 962, 1086, 1252, 1269, 1422-1429 och 'kort: true' på 47 rader i ARBETEN`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Tiderna på dagen gångras med VAL.pass = 0,5. Flaggan kort står på 47 rader, men den verkar bara en gång per val: på raden leka, som alltid prövas först på dagen. Där halveras valets grundtid (20–60 min blir 10–30). På de andra 46 raderna gör flaggan ingenting. Arbete, bygge, promenad, bad och strand gångrar själva med VAL.pass, och flintletandet delar med samma tal för att få ett helt pass.  
Förslag: Skriv de halva tiderna direkt i balanstalen (arbetspass 30 + 60 min, bygge 30 + 45, promenad, bad, strand). Dagens paus (10–30 min) sätts en gång när valet går förbi grundbehoven på dagen. Ta bort VAL.pass, fältet kort och variabeln kortat. Flintletandet får ett eget tal för sitt längre pass. Rätta raden om val.ts i ARKITEKTUR.md.  
Ändras i spelet: ingen märkbar skillnad. Att gångra med 0,5 är exakt i datorn, så tiderna blir precis desamma.  
Prövningen: Det stämmer: flaggan gör bara nytta på en rad, och talet 0,5 är en rest från steg 1.5.11. Vinsten är liten men ändringen är ofarlig och gör talen lättare att läsa.

**115. infbalans räknar om formeln i stället för att pröva spelet**  
Var: `src/test/scenarier/fas9.ts:559–572; src/sim/halsa.ts:77, 554`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Scenariot har en egen kopia av formeln för infektion och kontrollerar att kopian ger ungefär hälften. Spelets egen kod (halsa.ts rad 554) körs aldrig i testet. Den riktiga raden har dessutom fler delar än kopian: smuts nära latrinen och ett gammalt förband. Ändras eller går den riktiga koden sönder märker testet ingenting.  
Förslag: Låt testet köra spelets hälsa på många kopior av samma sår tills de läkt, och räkna hur många som blev infekterade. Så gör benbrott-scenariot redan med de öppna brotten.  
Ändras i spelet: Ingen skillnad i spelet. Testet prövar det som verkligen händer, och tar några sekunder längre.  
Prövningen: Stämmer: testet räknar bara med balanstalen och kör inte koden. Det kan visa sig att spelet inte ger hälften på riktigt, eftersom såret läker och blir mindre under tiden. Då är det en fråga för balansen, inte ett fel i testet. Designdokumentet lästes inte: scenariots egen text och kommentaren vid balanstalet säger målet (ungefär hälften).

**116. slagsmal kör om det stridkarta redan prövar (rapporten sparas, samma strid igen)**  
Var: `src/test/scenarier/folk.ts:1708-1789 (stridkarta), 1832-1894 (slagsmal, raderna 1845-1853 och 1879)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: slagsmal och stridkarta startar samma slagsmål i by 21. slagsmal kollar att rapporten sparas, vilket stridkarta också gör. slagsmal bygger dessutom en andra by och kör hela striden en gång till för att se att samma frö ger samma strid; stridkarta del 3 kräver redan att två byar blir exakt lika, och strid prövar samma frö på arenan. Raden 'de som slåss står kvar' är däremot inte samma sak som i stridkarta: den gäller att uppgiften 'strid' ligger kvar, och raden om den kissnödiga bygger på samma uppställning. slagbild prövar bilden och överlappar inte.  
Förslag: Ta bort den andra körningen (t2, sammaIgen) och 'sparad' ur slagsmal, och låt raden bli borta eller peka på stridkarta. Behåll 'står kvar' och den kissnödiga.  
Ändras i spelet: Ingen skillnad i spelet.  
Prövningen: Dubbletten finns för två av de fyra raderna, och den andra körningen kostar en hel strid i testtid. De två andra raderna prövar något eget och ska stå kvar.

**117. Sparade förrådsmål som kostar mer än räkningen de sparar**  
Var: `src/sim/forradsmal.ts:111-123`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 7 rader bort.  
I dag: Bufferten och lyxtaket för mat och ved sparas per timme i en WeakMap med en textnyckel (timmen och påbudet). Det som sparas är en enda multiplikation (onskatDygn), och påbudet slås ändå upp varje gång för att bygga nyckeln.  
Förslag: Ta bort Mal, cache och mal(). buffert blir onskatDygn(k, pabud(...), extra) och lyxtak blir matt gånger bufferten.  
Ändras i spelet: Ingen skillnad. Talen blir exakt desamma.  
Prövningen: Stämmer: nyckeln innehåller redan allt som räkningen beror på, så det sparade ger samma tal som en direkt räkning. Inget annat läser det sparade.

**118. Den lilla hjälparen f2 (två decimaler) skrivs om sju gånger**  
Var: `src/test/scenarier/fas11.ts:2450,2752,2800,2845,2892,3090,3524 (f2); 2385,2730,2777,2828,2980 (ledarens egenskap)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Raden som gör ett tal till text med två decimaler står sju gånger i filen. Raderna läsaren angav (3553, 3753) stämmer inte, men kopiorna finns på andra ställen. Uppställningen av ledarens egenskap står fem gånger, varje gång med en annan egenskap.  
Förslag: Lägg f2 en gång överst i filen eller i hjalp.ts. Se upp: namnet f2 används för annat på 2934 och 3682, så de får byta namn. Ledarens egenskap kan få en liten hjälpare medLedare(c, egenskap, värde), men det är frivilligt.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Kopiorna finns, fast på andra rader än läsaren skrev. Det är en liten städning utan risk.

**119. Grenar på marken finns i två system med var sin bokföring**  
Var: `src/sim/eld.ts:536-551, 560-565; src/sim/steg.ts:1226-1231, 1247-1250, 1262-1266, 1292-1293`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: Rundan har grenar på vissa skogsrutor (nyckeln gren:, RUNDA.ater tillbaka per dygn). Tändmaterialet har kvistar på all mark (nyckeln kvist:, ELD.tandAter per dygn). Båda blir saken grenar, och räkningen "plockat minus det som vuxit tillbaka" står på tre ställen (plockatPa, tandPaRutan, tandPlocka). tandKey har en gren för hö som aldrig nås, eftersom höet tas ur gräset före.  
Förslag: Det mindre: en gemensam funktion för det som plockats på en ruta, med farten som tal, och ta bort hö-grenen i tandKey. Det större (ett enda system för grenar och kvistar) görs inte nu.  
Ändras i spelet: Det mindre förslaget: ingen märkbar skillnad.  
Prövningen: Den döda hö-grenen och den upprepade räkningen finns i koden, och det lilla förslaget ändrar inget i spelet. Det större förslaget ändrar hur kvistarna tar slut och hör till ett eget steg om ägaren vill ha det.

**120. Uppgiften att handla byggs för hand på fyra ställen**  
Var: `src/test/scenarier/agande.ts:41-59 (helAffar, rad 51), 1298 (handelsko), 1566 (forhandling), 1691 (handlarrel)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: helAffar bygger uppgiften att handla på rad 51. handelsko, forhandling och handlarrel har var sin lokala funktion (uppgift eller upp) som bygger samma uppgift med samma fält. Två av dem ställer också personen på platsen, en gör det inte.  
Förslag: En delad funktion handlaUppgift(s, p, v, stall = true) överst i filen, som helAffar och de tre scenarierna använder.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: samma långa rad står fyra gånger. Får uppgiften ett nytt fält behöver det då bara ändras på ett ställe. Liten men säker vinst.

**121. Uppväxten räknar om mellan barn och vuxna med lösa tal 3 och 2 i koden**  
Var: `src/sim/uppvaxt.ts:31-32,126,142-153,236-254`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: De flesta upplevelser har flaggan vuxenTal: talen i registret gäller den vuxne, och barnet får chansen gånger 3 och effekten gånger 2. Det är samma tal som balanstalen UPPV.vuxenChans (1/3) och vuxenEffekt (0,5), fast baklänges och skrivna för hand. De två sätten går inte att slå ihop utan att ändra spelet, eftersom chansen har ett tak på 1 och effekten avrundas till minst 1. stepUppvaxt skriver samma tre villkor (nära svält, köld, svårt sjuk) två gånger. omText finns för sparningar från före steg 6.7.2.  
Förslag: Byt 3 och 2 mot 1 / UPPV.vuxenChans och 1 / UPPV.vuxenEffekt (samma värden, så inget ändras), och lägg de tre villkoren i en liten lista som båda looparna går igenom. Behåll flaggan vuxenTal och omText.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Håller i liten form: de lösa talen ska komma ur balanstalen, och de dubbla villkoren kan delas. Att slå ihop de två talsystemen faller, för taket och avrundningen gör att de inte räknas om lika.

**122. Fältet 'mattar' är samma tal på alla tamdjur och räknas alltid bort till noll**  
Var: `src/sim/tamdjur.ts:28-43, 127; src/sim/boskap.ts:155`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Alla sju raderna i TAMDJUR har mattar: 0,5. I mataKlar (rad 127) dras mattar × 2 = 1 från hungern, som är högst 1, så djuret blir alltid helt mätt. Fältet läses inte någon annanstans; boskap.ts nämner det bara i en kommentar.  
Förslag: Ta bort fältet ur typen och raderna, sätt hungern till 0 när djuret fått sin mat och rätta kommentaren i boskap.ts.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer: talet gör ingen skillnad i dag och ser ut som en ratt som går att vrida på fast den inte gör det. Få rader sparas eftersom varje djur står på en rad, men raderna blir kortare och ärligare.

**123. En extra textur per ikon bara för att läsa höjden**  
Var: `src/ui/scen.ts:50, 61, 66`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: scen.ts sparar en andra PIXI-textur per ikon i 'textures' (rad 50 och 61). Den används bara för att läsa bildens höjd på rad 66; själva bilden ritas med ikonUtanSkugga(k).  
Förslag: Läs höjden ur iconCanvas(k).height (eller ur texturen som redan sätts på spriten) och ta bort 'textures'.  
Ändras i spelet: Nej. Lite mindre grafikminne.  
Prövningen: Stämmer: 'textures' finns bara på de tre raderna. Höjden avgör ordningen i djupled, så den nya källan måste ge samma tal; iconCanvas är bilden texturen görs av.

**124. fordonRad letar igenom registret fast nyckeln är saken**  
Var: `src/sim/fordon.ts:11, 15, 46, 57`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: fordonRad söker igenom alla rader efter f.sak === k, fast nyckeln i registret är densamma som sak på alla fem raderna. Filen importerar två gånger från './mark', och kommentaren på rad 57 om lasset står två rader ovanför funktionen den hör till.  
Förslag: Låt fordonRad slå upp raden direkt på nyckeln, slå ihop de två importerna och flytta kommentaren till lassAv. Fältet sak kan stå kvar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer på alla tre punkterna. Mycket liten vinst men ingen risk; görs lämpligen när filen ändå öppnas.

**125. Identiska grenar i villkor i skapare.js**  
Var: `bildstil/skapare.js:649, 786; src/portrattkarna.ts:4235 (genererad kopia)`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Rad 649 väljer mellan två likadana listor beroende på om det är ett barn. Rad 786 skriver 'rikt === sida ? 10 : 10', alltså 10 i båda fallen (x0 på samma rad skiljer sig på riktigt, 4 eller 3, och ska vara kvar). Båda raderna stämmer med det läsaren såg.  
Förslag: Skriv listan en gång på rad 649 och bara 10 på rad 786. Bygg om src/portrattkarna.ts med node bildstil/portratttillspelet.cjs så att kopian i spelet följer med.  
Ändras i spelet: Nej. Resultatet är exakt detsamma.  
Prövningen: Stämmer och är ofarligt: båda grenarna ger samma värde. Vinsten är liten, bara att koden inte lurar läsaren att tro att barn eller riktning gör skillnad.

**126. Att byta om till rustning ligger i gravfilen**  
Var: `src/sim/grav.ts:319-329; src/sim/val.ts:87, 726; src/sim/steg.ts:112, 246`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: rustaVal och rustaKlar (hämta sin rustning när larmet går, steg 8.7.8) ligger i grav.ts efter avrustningen av den fallne fienden. De har inget med kroppen eller graven att göra.  
Förslag: Flytta de två funktionerna till utrustning.ts och rätta importen i val.ts och steg.ts.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Det är en ren flytt som följer regeln om ett ställe per sak; bara två filer hämtar funktionerna.

**127. Byplanens täthet: gränsen står utanför balanstalen, och lite som aldrig används**  
Var: `src/sim/byggplan.ts:113, 966-983; src/test/scenarier/kultur.ts:1569`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: byplan.tat räknas ur seden Sammanhållning och ledarens empati och används på ett ställe: under -0,5 står husen en ruta glesare. Talet -0,5 står direkt i koden och inte i PLAN (regel 8). Hjälpfunktionen egen tillåter egenskapen 'mod' som aldrig frågas, och kommentaren säger att gränssnittet visar byplanen, men inget i src/ui läser den. Ett scenario läser tat.  
Förslag: Behåll tätheten. Lägg gränsen i PLAN som ett namngivet tal (t.ex. glestFran: -0.5), ta bort 'mod' ur typen och rätta kommentaren om gränssnittet.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Designdokumentet (Byns planering) vill ha 'tätt eller glest', så tätheten ska inte tas bort. Den städade varianten följer regeln om balanstal och ändrar inget i spelet.

**128. Vanorna har en skugglista bredvid p.habit som måste skrivas tillbaka för hand**  
Var: `src/sim/vanor.ts:6-23,40-47, src/sim/steg.ts:830-831,1649,1665, src/sim/vacktgast.ts:36,79, src/sim/gast.ts:163`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 20 rader bort.  
I dag: Varje gång någon arbetat en bit gångras alla hens vanor med en blekningsfaktor (addHabit). För att det ska gå fort hålls talen i en lista bredvid vanobjektet, och skrivVanor måste anropas på fem ställen före sparning och kopiering. Glöms ett anrop sparas gamla tal. Listan är med avsikt en optimering (kommentaren i vanor.ts). Att den delas mellan byar i minnet är ingen bugg: skrivVanor skriver alla.  
Förslag: Spara en skala per person: blekningen gångrar bara skalan, och nya timmar läggs till delat med skalan. Då räcker vanobjektet, och skugglistan, skrivVanor och de fem anropen försvinner. Skalan måste sparas med personen och nollställas (talen gångras in) när den blivit mycket liten, annars tappar talen precision.  
Ändras i spelet: ingen märkbar skillnad, men talen avrundas lite annorlunda, så byarna utvecklas inte exakt som förut och nytt facit behövs  
Prövningen: Stämmer, och de fem anropen är en fälla som redan krävt lagningar hos gästerna. Men vinsten är måttlig och ändringen rör sparningen och facit, så den bör göras som ett eget steg med det stora testet.

**129. Raden fara tvingar fram arbete när Förbättra dämpats bort**  
Var: `src/sim/val.ts:547-550, 603-615, 913-923`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 6 rader bort.  
I dag: När kylan eller hungern är en fara släpps raderna på Förbättra bara igenom med 5 % chans. Det gäller också raderna som fyller mat och ved, fast de är svaret på faran. Sist på nivån står därför raden fara, som ändå skickar den som arbetar till det byn behöver mest. Den andra regeln rättar resultatet av den första. Raden fullaForrad före den väljer aldrig något; den räknar bara en statistik som scenariot projekt läser.  
Förslag: Låt dämpningen inte gälla raderna som fyller mat och ved. Ta bort raden fara. Räkna statistiken fullaForrad där fritiden väljs, med samma villkor som nu.  
Ändras i spelet: Liten skillnad. I en by i fara väljs mat eller ved efter poäng i stället för alltid det enskilt bästa arbetet. Ger inget arbete något just då (till exempel mitt i vintern) kan det bli fritid i stället för ett tvingat pass.  
Prövningen: Det stämmer i koden: en regel dämpar bort svaret på faran och en annan tvingar tillbaka det, vilket är just den sortens rättning av ett resultat som Kärnan vill undvika. Ändringen rör byar i nöd, så scenarierna faror, knapphet och hardvinter ska köras efteråt.

**130. Dygnssaker gömda bakom "är klockan just nu tolv?" i timfunktionerna**  
Var: `src/sim/styre.ts:601, 625; src/sim/kyrka.ts:594; src/sim/steg.ts:478-480`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 4 rader bort.  
I dag: stepStyre frågar varje timme om klockan är 20 (STR.timme) för trons kväll, dopet, domen, omröstningen och lagförslagen. kyrkaTimme frågar om klockan är 12 för skatt, helgon, kväden, välsignelse och bud. Det fungerar bara om funktionen anropas exakt en gång i timmen. TAKTER har redan dygnsrader med fas.  
Förslag: Gör dygnsdelarna till egna rader i TAKTER med ett dygn som takt och en fas, direkt efter raden de kommer ifrån så att ordningen blir densamma. Kvällens dom behöver själv fråga efter ledaren. STR.timme blir kvar som radens fas; talet 12 i kyrkan får ett namn.  
Ändras i spelet: Nej, om faserna och ordningen blir som i dag.  
Prövningen: Stämmer, och regeln säger att det som händer vid en känd tid räknas vid den tiden. Vinsten är mest ordning, inte färre rader, och ordningen mot missnöjet och valet av ledare måste hållas. Görs lämpligen ihop med fyndet om rädslan och fyndet om chanser per tid.

**131. Städningar som körs vid varje inläsning utan nummer**  
Var: `src/sim/varld.ts:461-464`. Vinst 1 av 5, risk 2 av 5, liten ändring.  
I dag: Före de numrerade uppgraderingarna körs fyra rensningar varje gång en by läses in (tabun, väggbrädet och nycklar som börjar med 'ho:' i s.plockat), fast de bara behövs en gång för äldre sparfiler.  
Förslag: Gör dem till en numrerad uppgradering med nästa nummer (60), så att en by går igenom dem en gång.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Filens egen regel säger att varje ändring av sparformatet får en numrerad rad. Vinsten är liten men ändringen är enkel; alla byar under nummer 60 får fortfarande rensningen.

### Korta (139)

**132. Slaktuppställningen, jaktförsöken och 'alla sover' finns i många kopior**  
Var: `src/test/scenarier/grund.ts:266-270, 2277-2279, 2342-2346, 2400-2404, 2323-2333, 2386-2396; fas10.ts:134, 161; natur.ts:1842, 1900, 2447; 'sova'-raden i ett trettiotal rader i agande.ts, natur.ts, folk.ts, fas9.ts, kultur.ts, grund.ts m.fl.`. Vinst 3 av 5, risk 1 av 5, ett steg, ungefär 45 rader bort.  
I dag: Talg, styckning, radjur och faglar (och ett scenario i fas10.ts) ställer upp slakten med samma tre rader: en slaktbänk, kniven som teknik hos alla och en kniv i en hand. Slingan som prövar jakten om och om igen (nollställ djuren, ge ett spjut, ställ jägaren, försök, läk skadorna) finns i sex kopior, inte två som läsaren såg: två i grund.ts, en i fas10.ts och tre i natur.ts. Raden som lägger någon att sova i ett prov står ett trettiotal gånger i scenariofilerna.  
Förslag: Tre hjälpare i hjalp.ts: medSlaktbank(s, person), provaJakt(by, mål, verktyg, antal, vad som räknas) och sov(s, person, timmar). Hjälparna måste göra samma saker i samma ordning, så att slumpen i testerna blir densamma.  
Ändras i spelet: Ingen skillnad i spelet. Bara testkoden blir kortare.  
Prövningen: Upprepningen är större än läsaren såg, eftersom samma slinga också står i natur.ts och fas10.ts. Det är bara testkod, och scenarierna själva visar direkt om något blev fel.

**133. Uppdragsscenarierna bygger samma person, närmaste by och utlysning sju gånger**  
Var: `src/test/scenarier/fas11.ts:3537-3545,3567-3574,3591-3598,3742-3746,3768-3772,3795-3802,3830-3837`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 30 rader bort.  
I dag: Sju scenarier väljer den modigaste vuxna, rensar lärdomarna om uppdrag, sorterar byarna efter avståndet till hembyn, låter personen känna platsen, utlyser ett uppdrag och låter personen höra om det. Raderna är nästan ordagrant lika. Sorteringen efter avstånd står på alla sju ställena.  
Förslag: En hjälpare uppdragsOpp(s, slag, belöning) som ger personen, byn och uppdraget, och en narmasteBy(vl, hem). De sju kopiorna tas bort. Scenariot på 3768 och det på 3834 har egna krav och får ta emot dem som val.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Jag såg alla sju kopiorna. Bara testkod ändras, och scenarierna själva visar om något blev fel.

**134. En gemensam modul för API-skripten (batch, kostnad, klient, sidan, pris och modell)**  
Var: `bildstil/api/bilder.mjs:36-37, 60-70, 87, 224-250; forslag.mjs:27-28, 34-43, 48, 134-160; rita.mjs:28-30, 64-77, 196-225; bestar.mjs:24-25, 53-63, 70, 267-295`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 100 rader bort.  
I dag: Fyra skript har var sin kopia av modellens namn, priset, kostnad(), klient() med nyckeln och adressen, batch() som väntar 30 sekunder i taget, öppnandet av sidan i en webbläsare och bildBlock. Kopiorna skiljer sig lite: bilder.mjs och forslag.mjs godtar bara svar som slutat normalt, rita.mjs och bestar.mjs skiljer på avböjt och för långt svar; rita.mjs räknar också tokens; forslag.mjs lägger summan i en global; bestar.mjs läser in sidan på ett annat sätt (med teckenkodning) och väntar på andra saker. Koden som tar bort bilderna ur frågorna vid torrt finns i tre skript.  
Förslag: Skapa bildstil/api/gemensamt.mjs med PRIS, MODELL, kostnad, klient, en batch som ger svar, fel, summa och tokens, oppnaSidan(vad den väntar på), bildBlock och utanBilder. MAXTOKENS och antalet versioner stannar i varje skript, de är olika. Pröva varje skript med torrt efteråt.  
Ändras i spelet: Ingen skillnad i spelet. Modell och pris ändras på ett ställe. Felmeddelandena från en batch blir lika i alla skripten.  
Prövningen: Dubbletterna finns och är nästan ordagranna. Det som håller tillbaka är att batchen inte går att pröva utan att det kostar Björns krediter, så den sammanslagna versionen måste läsas noga och prövas med torrt och rita.mjs prov.

**135. Listornas symboler: en regel i stället för fyra namnlistor och ett fyrtiotal döda platshållare**  
Var: `src/ikoner.ts:4510-4516, 4586-4588, 4591-4595 och 4606-4615 (fyra slingor som lägger bildstilens bild i 16 × 16 punkter); 4500-4507 (platshållare som skrivs över); 1732-1750 (korn) och 3821-3838 (i_bjorndodare)`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 100 rader bort.  
I dag: En sak med godkänd bild får sin symbol i listorna genom att namnet skrivs in för hand. Det finns fyra sådana ställen, inte tre: 62 namn, vattensäcken, 14 namn och listan LISTA med 36 namn. Av de första 77 namnen har 37 en äldre platshållare eller handritad bild som sätts först och sedan skrivs över. Tio handritade bilder ritas aldrig: korn, i_bjorndodare, och genom LISTA också ved, hogsate, bank, krubba, altare, vattenho, kalke och slade. Slingorna räknar inte exakt lika: en förminskar men förstorar aldrig, en förstorar men beskär det som är för stort.  
Förslag: En hjälpare (bild i rutan: förminskad om den är större, dubbelt så stor om den ryms) och en regel: saknas egen symbol men det finns en kartbild med samma namn, blir symbolen kartbilden. Då försvinner namnlistorna, de överskrivna platshållarna och de tio döda bilderna. Regeln måste ligga i uppslaget (hasIcon och iconCanvas) eller före raderna som lånar en annan saks bild (t.ex. slaktfar = radjur), annars går de sönder. LISTA behåller de rader där namnen skiljer sig (far = tam_far_1).  
Ändras i spelet: Liten: vargtand, linfron och appel blir dubbelt så stora i listorna, och radjur, fjadrar, bjorn och bjornskinn blir förminskade i stället för beskurna, om en enda regel används. Saker som i dag visas med en emoji fast de har en godkänd bild får bilden.  
Prövningen: Stämmer, och det är fler dubbletter än läsaren såg. En ny godkänd bild behöver då inte skrivas in för hand, vilket följer regeln om ett ställe per sak. Ordningen i filen måste hållas, så det görs som ett eget steg med scenarierna ikoner och symboler.

**136. Raderna i ARBETEN upprepar samma mall**  
Var: `src/sim/val.ts:638-726, 768-772, 806-818, 880-900`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 25 rader bort.  
I dag: Ett femtontal rader gör samma sak: frågar ett system och kopierar handling, skäl, plats, tid, ref och redskap till valet. Ett tjugotal rader på nivå 5–8 börjar med samma villkor och bygger sedan uppgiften med text och minuter inne i val.ts, fast texten och tiden hör till systemets egen fil (boskap, kruka, brygg, odling, rester). Bryggningens rad är till exempel en enda mycket lång rad med fyra texter.  
Förslag: En hjälpare för raderna som bara kopierar. För de andra: en funktion per system som svarar med en färdig uppgift (handling, text, minuter, plats), så att raden i ARBETEN blir kort och texten ligger hos systemet. Villkoren måste prövas i samma ordning som nu, eftersom några av dem drar slumptal.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer, och det följer principen om ett ställe per sak: texter och tider flyttar hem till sina system. Risken är liten om ordningen på villkoren behålls; samma-kollen visar om något ändrats.

**137. "Ligger tinget fritt?" skrivs om på ett fyrtiotal ställen**  
Var: `src/sim/agande.ts:24 (Ting); src/sim/stationer.ts (11 ställen); src/sim/lager.ts:433,437,454,907; src/sim/protes.ts:25,37; src/sim/kruka.ts:127,131; src/sim/matlagning.ts:300; src/sim/vatskor.ts:91; humor.ts:133,229; rovare.ts:604; rader.ts:191; styre.ts:556; grav.ts:323; utrustning.ts:270; brand.ts:158,451; tornado.ts:351,467`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 20 rader bort.  
I dag: Var ett ting är står i en rad frivilliga fält (hos, lass, bar, krok, vid, pa, inne, vaxt, kok, ler, helig). Villkoret "ingen har det" (hos, lass och bar är tomma) skrivs ut för hand på ett fyrtiotal ställen i ungefär 19 filer, med lite olika urval. Ibland är skillnaden menad (vid en station, på en krok), ibland ser den ut som en miss: ledigKruka i matlagning.ts:300 frågar inte om krukan ligger i en börda eller bärs. Två olika funktioner heter ledigKruka (kruka.ts:131 och matlagning.ts:300).  
Förslag: En liten hjälpare i agande.ts för kärnan (ingenHar(t): inte i handen, inte i en börda, inte buren) och en för "tomt kärl" (inget i, ingen växt, ingen rätt, inte obränt). Ställena byter till hjälparen och behåller sina egna tillägg. Där ett ställe saknar en del av kärnan avgörs för sig om det är ett fel. Döp om den ena ledigKruka. Ett enda platsfält i stället för tio görs inte nu.  
Ändras i spelet: Ingen märkbar skillnad. På enstaka ställen slutar en sak tas fast den är upptagen (t.ex. en kruka som någon bär).  
Prövningen: Samma villkor står på mycket många ställen med små skillnader som ingen kan överblicka, och ett nytt ställe där ett ting kan vara kräver att alla hittas. Hjälparen är billig, men varje ställe måste läsas så att menade skillnader blir kvar.

**138. Raderna i ARBETEN upprepar samma villkor, och tre har tappat dem**  
Var: `src/sim/val.ts:638-726, 775-776, 806-818, 880-901`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 10 rader bort.  
I dag: Tolv rader börjar med samma villkor (arbetar i dag, Förbättra dämpas i fara) och ofta en åldersgräns. Ett tjugotal rader slutar med samma fem tilldelningar. Sopor (899) och baka (900) saknar båda villkoren, och slåttern på Förbättra (901) saknar det första. De flyttades från Rädda i steg 10.11.21, där raderna inte har de villkoren. De dämpas alltså inte i fara som steg 10.11.20 säger, och den som tar ledigt gör dem ändå.  
Förslag: Fält på raden i stället: arbetar, forb och minAlder, som valet läser, och en hjälpare som fyller i valet av det en annan fil svarar. De tre raderna som avviker rättas samtidigt. Slumptalen dras i samma ordning som förut om villkoren prövas i samma ordning; kontrollera med npm run samma för de rader som inte ändras.  
Ändras i spelet: Sopor, bakning och slåtter på Förbättra görs mer sällan i kyla och svält, och inte av den som tar ledigt. I övrigt ingen skillnad.  
Prövningen: Stämmer rad för rad. Upprepningen är det som gjorde att tre rader tappade villkoren, och fält på raden hindrar att det händer igen.

**139. Samma hage-, kälke- och rensa-uppställning skrivs om i många scenarier**  
Var: `src/test/scenarier/fas10.ts:63-73 (dragdjur), 1138-1149 (vattenho), 1227-1238 (djurtorst); fas9.ts:1743-1752; kälken på rad 26, 37, 192, 230, 280 och släden på 85, 89, 96; behov.ts:343, 511, 572, 688 och fas10.ts:868, 986 (personen fylls)`. Vinst 2 av 5, risk 1 av 5, ett steg, ungefär 30 rader bort.  
I dag: Slingan som letar en by med får i en hage utan vatten står två gånger nästan ordagrant (vattenho och djurtorst, tio rader var). Samma kärna (staketteknik, grenar, rep, märk ut hagen, bygg staketet, valla in) finns också i dragdjur och i fas9. Raden som lägger en kälke eller släde i byns mitt finns åtta gånger. Raden som sätter alla behov till fulla och tar bort skador finns sex gånger, med små skillnader (plats, vilka fält).  
Förslag: Lägg hjälpare i hjalp.ts: en som bygger hagen i en by (med val: vilka djur, och om den ska leta en by utan vatten), en som lägger ett fordon i byns mitt och en som gör en person frisk och mätt. Scenarierna anropar dem. Skillnaderna (2 eller 3 får, 2 eller 4 rep, tekniken hos en eller alla) blir val i anropet.  
Ändras i spelet: Nej. Bara testerna ändras. Scenarierna dragdjur, vattenho, djurtorst, hage, kalke, byggsten, stenvag och stenvagg ska köras efteråt.  
Prövningen: Stämmer. Slingan i vattenho och djurtorst är samma tio rader, och fordonsraden och fyll-raden upprepas. Vinsten är ungefär hälften av det läsaren räknade, eftersom varianterna skiljer sig lite.

**140. Sökningen efter en by med rätt motgång skrivs om i sju scenarier**  
Var: `src/test/scenarier/grund.ts:745-749 (hardvinter), 795-801 (kloka), 827, 851-857 (torka), 951-961 (oversvamning), 1097-1107 (flodrest), 1246-1254 (tornado), 1798-1806 (brand), 1535 (torrAng)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 25 rader bort.  
I dag: Sju scenarier har var sin rad 'fore', som gör byn tjugo dygn äldre och ställer kalendern, och en slinga som skapar by efter by tills en har rätt motgång. Kalenderns tid och villkoret skiljer mellan dem. I oversvamning och flodrest är hela sökningen (12 rader) ordagrant densamma.  
Förslag: En hjälpare i hjalp.ts, t.ex. hittaBy(högsta frö, tidsålder, tid in i tidsåldern, villkor), som de sju anropar. Översvämningens sökning blir en egen funktion som oversvamning och flodrest delar. Att de två skulle dela själva byn går inte: varje scenario körs i sin egen process, så byn kan inte sparas mellan dem.  
Ändras i spelet: Ingen skillnad i spelet. Testerna blir kortare men går inte fortare.  
Prövningen: Upprepningen stämmer, och två scenarier har exakt samma tolv rader. Vinsten i datortid som läsaren lovade finns inte, eftersom scenarierna körs i skilda processer, men koden blir kortare utan risk.

**141. Fältet och odlingsuppgiften skrivs ut för hand i varje odlingsscenario**  
Var: `src/test/scenarier/fas9.ts:1234, 1265, 1288, 1307, 1370, 1389, 1408, 1428, 1452, 1471, 1493, 1513 (fältet); 1244, 1268, 1290, 1372, 1391, 1430, 1515 (uppgiften)`. Vinst 2 av 5, risk 1 av 5, ett steg, ungefär 20 rader bort.  
I dag: Tolv rader bygger ett helt fält med samma uppgifter (id, plats, bredd, antal rutor, ägare, steg, klara 0, kvar 0). Sju rader bygger samma odla-uppgift. Bara några få värden skiljer mellan scenarierna.  
Förslag: Två hjälpare i hjalp.ts: en som gör ett fält av det som skiljer (bredd, antal, steg, rutor, plats) och en som gör odla-uppgiften. Scenarierna anger bara det som är olika.  
Ändras i spelet: Ingen skillnad i spelet: bara testerna blir kortare och lättare att läsa.  
Prövningen: Raderna finns och är nästan lika. Läsaren räknade tio uppgifter, det är sju, och fältet står på tolv rader (rad 1371 är 1370, och 1408 hör också dit). Designdokumentet behövdes inte: fyndet gäller bara testerna.

**142. Raden som hittar 'en grannby att resa till' står på tretton ställen**  
Var: `src/test/scenarier/fas11.ts:1757,1923,3108,4710,4752,4791,4837,4868,4896,4920,4949,5128,5175,5225`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 20 rader bort.  
I dag: Samma långa rad letar bland huvudbyns grannar efter en by med folk. Den står nästan ordagrant på tretton-fjorton ställen. Skillnaden är bara kravet: mer än 0, 2 eller 4 invånare, ibland också en förbindelse eller en viss teknik. Det som följer efter (sällskap, gå bort, besök) skiljer sig mer än läsaren sa.  
Förslag: En hjälpare grannby(s, minFolk, krav?) i hjalp.ts som ger platsen och raden. Sällskapet och besöket kan få en egen hjälpare där raderna verkligen är lika, men börja med den första.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Raden finns på de ställen läsaren sa och på några till (1757, 1923, 3108, 5128). Bara testkod ändras, och scenarierna visar direkt om hjälparen väljer en annan by. Vinsten är mindre än 60 rader, för det mesta är en rad per ställe.

**143. Väckt-by-scenarierna ställer in samma rad åtta gånger**  
Var: `src/test/scenarier/fas11.ts:4499-4500,4523-4525,4547-4549,4571-4573,4601-4603,5034-5037,5087-5089`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 20 rader bort.  
I dag: En ny värld skapas med samma frö och datum, den största levande byn väljs, och radens folk, tekniker, rikedom och mat sätts med nästan samma rader. Två scenarier (fälten och skogen) har var sin egen funktion vacka som gör just detta.  
Förslag: En hjälpare storstaRad({folk, nivå, rikedom, mat, dag}) i hjalp.ts som ger byn, världen och raden. De två vacka-funktionerna blir en rad var.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer på alla ställen jag öppnade. Bara testkod ändras. Vinsten är omkring 20 rader, inte 40, för varje kopia är två eller tre rader.

**144. Tornadoscenarierna letar rutor vid banan med nästan samma kod tre gånger**  
Var: `src/test/scenarier/grund.ts:1265-1282 (tornado), 1381-1395 (tornadonara), 1428-1443 (tornadoutkant), 1503-1512 (tornadogast)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 18 rader bort.  
I dag: Tre scenarier (tornado, tornadonara, tornadoutkant) har var sin kopia av pa(), som letar en ledig ruta ett visst antal rutor vid sidan om tornadons bana. Bara sidoavståndet och gränserna skiljer. Hjälparen fran() (avståndet till banan) står i fyra scenarier. Läsaren sa fem scenarier, men tornadokarna lägger sakerna mitt på banan och har ingen sådan kod, och tornadogast räknar med delar av rutor och passar inte i samma hjälpare.  
Förslag: En gemensam funktion överst bland tornadoscenarierna i grund.ts (som torrAng för bränderna): avståndet till banan, och rutaVidBanan med sidoavstånd, minsta och största avstånd och scenariots egen ledig-kontroll. Tornado, tornadonara och tornadoutkant anropar den; tornadogast får bara dela avståndsfunktionen om den går att göra lika.  
Ändras i spelet: Ingen skillnad i spelet. Bara testkoden blir kortare, och testerna ska välja samma rutor som förut.  
Prövningen: Upprepningen finns, men i tre scenarier och inte fem, så vinsten är mindre än läsaren räknade. Det är bara testkod, och gränserna skickas in som tal, så risken är liten.

**145. BEAT = 300 är kopierad i sjutton testfiler**  
Var: `src/test/scenarier/agande.ts:23, behov.ts:7, folk.ts:15, grund.ts:13, hjalp.ts:9, kontroll.ts:21, natur.ts:10, redskap.ts:8, sparning.ts:11; src/test/kor.ts:15, detaljer.ts:5, likhet.ts:13, samma.ts:15, takt.ts:7, teknik.ts:9, texter-en.ts:10, utseende.ts:16`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 16 rader bort.  
I dag: Samma rad med samma långa kommentar står i nio scenariofiler och åtta andra testfiler. kor.ts har den men lämnar inte ut den; den lämnar redan ut STEG_TIM, som räknas ur den.  
Förslag: Lämna ut BEAT från kor.ts och hämta den därifrån i de andra filerna. Kontrollera först att ingen fil får en cirkel i sina hämtningar (hjalp.ts hämtar redan från kor.ts).  
Ändras i spelet: Nej.  
Prövningen: Stämmer, och det är fler kopior än läsaren såg (17, inte 8). Ett tal på ett ställe följer regeln om ett ställe per sak, och risken är mycket liten.

**146. Samma uppställning av mat, vuxen och teknik skrivs om i många scenarier (setMat finns redan)**  
Var: `src/test/scenarier/fas9.ts:725, 771, 792, 817, 833, 847, 857, 1100, 1137, 1152, 1213, 1683, 2276; src/test/scenarier/hjalp.ts:30`. Vinst 2 av 5, risk 1 av 5, ett steg, ungefär 15 rader bort.  
I dag: Tretton rader tömmer all mat och lägger sedan en sort, för hand. Hjälparen setMat i hjalp.ts gör just det, och används 84 gånger i de andra testfilerna men aldrig i fas9.ts. Raden som hittar första vuxna står 38 gånger i fas9.ts, och raden som ger någon en teknik 21 gånger. Fem scenarier har samma följd: töm maten, lägg några, sätt hungern, ät.  
Förslag: Använd setMat i fas9.ts. Lägg tre små hjälpare i hjalp.ts: en som hittar första vuxna, en som ger en person tekniker och en som låter en person äta en viss mat.  
Ändras i spelet: Ingen skillnad i spelet: bara testerna blir kortare.  
Prövningen: Allt stämmer i koden, och setMat gör exakt samma sak som slingan. Raderna blir mest kortare, inte färre, så vinsten i antal rader är mindre än läsaren räknade. Designdokumentet behövdes inte: fyndet gäller bara testerna.

**147. Fem egna varianter av 'vårdaren behandlar den skadade', och stationer som ställs ut för hand**  
Var: `src/test/scenarier/fas9.ts:256–257, 281, 316, 500–501, 578 (vården); 769, 849, 933, 974, 1141, 1169, 1190, 1329, 1359, 1865, 1931, 2013, 2122, 2258, 2310, 2332 (stationerna); samma vårdrad också i fas10.ts (6), byggnader.ts (3), sjukdom.ts (2), fas11.ts (1)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 15 rader bort.  
I dag: Fem scenarier i fas9.ts skriver själva samma två rader: vårdaren ställs bredvid den skadade och vården görs klar. Tre av dem har en egen liten funktion för det. Samma rad står tolv gånger till i fyra andra testfiler. En färdig station läggs i byn för hand på sexton ställen.  
Förslag: En hjälpare vardPa(s, vårdare, skadad) i hjalp.ts som alla testfilerna använder, och en stationUt(s, sort, x, y) för stationerna.  
Ändras i spelet: Ingen skillnad i spelet: bara testerna blir kortare.  
Prövningen: Stämmer, och mönstret finns i fler filer än läsaren såg, så en gemensam hjälpare gör mer nytta än hen räknade. Stationerna skrivs på två sätt (push och ny lista), men det är sexton ställen.

**148. Tre scenarier kopierar hela vägen in för en handlare**  
Var: `src/test/scenarier/fas11.ts:4204-4215,4242-4255,4291-4299`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 15 rader bort.  
I dag: Tre lokala funktioner gör samma sak: packar radens last, lägger en färd med numret 99001, tar bort handlaren som finns, säger att infarten är klar, låter handlaren komma fram, ställer klockan och räknar två steg. Sex-sju rader är ordagrant lika.  
Förslag: En hjälpare handlareKommer(bas, rad, {djur, fordon, folk, överskott}) som ger byn, handlaren och lasten. De tre scenarierna lägger bara till sina egna kontroller.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Jag såg de tre kopiorna. Bara testkod ändras. Det andra scenariot mäter lasten före och efter packningen, så hjälparen måste lämna ut det talet.

**149. Samma fyra småbitar upprepas i varje tillagning**  
Var: `src/sim/matlagning.ts:88,97-100,314-319,329-331,365-368,389-392,398-400,452-457,462-464`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 15 rader bort.  
I dag: Kokning, stekning, bakning och kokgrop har var sin kopia av slingan som räknar portionerna som inte bränns, formeln för övningen i matlagning (fem ställen), fördelningen av det färdiga efter ägarnas andelar (fyra ställen) och kockens vägda hand (kockensHand finns, men stepKok och gropUpp skriver samma räkning för hand).  
Förslag: Fyra små hjälpare som alla tillagningarna anropar. Slumpen ska dras i samma ordning som idag, och hjälparen för ägarna ska kunna hoppa över döda ägare (krukan, ugnen och gropen gör det, stekhällen inte). Pröva med npm run samma.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Kopiorna finns och är lika så när som på två små skillnader som hjälparna måste behålla. Ren ombyggnad utan ändring i spelet.

**150. Bytesuppställningen ny() finns två gånger, och korgbytet byggs upp fyra gånger**  
Var: `src/test/scenarier/agande.ts:178-185 (byte), 903-910 (bytessystem), 221-223, 915-917, 1750-1754 (filtar), 1918-1922 (handslag)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 14 rader bort.  
I dag: ny() i byte och bytessystem är lika rad för rad (tre vuxna, rik by, tomt förråd, inga vänner, två vid förrådet). Uppställningen 'a samlar och saknar korg, b har två korgar, a har 20 bär' och frågan om redskapet står i fyra scenarier. I filtar och handslag är korgbytet bara vägen fram till det som prövas (filtarna och texten om bytet), inte ett eget prov.  
Förslag: Flytta ny() till hjalp.ts som bytesBy() och lägg korgbytet som en hjälpare som de fyra scenarierna anropar. Kontrollerna i scenarierna behålls.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer att uppställningen är kopierad. Däremot är det inte samma prov fyra gånger: filtar och handslag använder bytet för att pröva annat, så inga kontroller ska tas bort, bara uppställningen delas.

**151. Samma husbygge för hand skrivs ut tre gånger, trots hjälpfunktionen husPa**  
Var: `src/test/scenarier/byggnader.ts:751-762, 1353-1359, 1395-1401, 2385-2391`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: husPa (rad 751) bygger ett hus med timmerväggar, öppning och golv. scenflytt, stockihus och mitten har var sin nästan likadan loop. Skillnaden är golvet (trä eller jord), öppningens plats, namnet och funktionen. stockhus (rad 1423-1425) lägger bara in huset utan väggar och hör inte hit, så det är tre ställen och inte fyra.  
Förslag: Ge husPa valfria val för golvmaterial, öppningens kolumn, namn och funktion, och låt de tre scenarierna anropa den.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer för tre av de fyra ställena. Husen blir desamma om öppningens plats och golvet skickas med, så proven prövar samma sak som förut.

**152. Resescenarierna har samma timslinga fem gånger och liknande sällskapsfabriker**  
Var: `src/test/scenarier/fas11.ts:1729,2042,2076,2148,2190 (slingan); 1674,1716,2017,2068,2122,2182 (fabrikerna)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Den lokala funktionen kor, som räknar resans behov en timme i taget, står ordagrant fem gånger. Sex scenarier har en egen ny() som bygger ett sällskap. Två av dem (2068 och 2182) är nästan lika. De andra fyra tar olika saker (tid, packning, häst, antal) och skiljer sig på riktigt.  
Förslag: Flytta timslingan till hjalp.ts som resaTimmar(s, timmar). Slå ihop de två lika fabrikerna (2068 och 2182) till en. Låt de andra fyra vara.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Slingan är fem rena kopior och två av fabrikerna är nästan lika. De övriga fabrikerna är för olika för en gemensam hjälpare, så vinsten är mindre än läsaren räknade.

**153. Uppställningen för att skriva en karta eller bok upprepas på fem ställen**  
Var: `src/test/scenarier/fas11.ts:3192-3198,3270,3380-3384,3420-3424,3713-3719`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Fem ställen ger skrivaren en liten lerkruka med bläck, lägger redskapen på plats, väljer vad som ska skrivas, sätter arbetet skriva och gör det klart. Det är fyra till fem rader som är nästan lika. Det före och efter (pergament, en bok som redan finns, vad som jämförs) skiljer sig.  
Förslag: En liten hjälpare skrivNu(s, p) som ger kruka och bläck, väljer, sätter arbetet och gör klart, och som lämnar tillbaka valet. Inte en stor hjälpare som ger det färdiga bladet: scenarierna prövar olika delar av vägen dit.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Kopiorna finns, men de är kortare än läsaren sa. En liten hjälpare för de gemensamma raderna är ofarlig; vinsten är måttlig.

**154. Tre nästan lika funktioner som gör ett tecken till en bild på världskartan**  
Var: `src/ui/varldskarta.ts:36-41 (teckenUrl), 74-82 (sprite), 85-92 (tecken), 151, 219`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: teckenUrl, sprite och tecken ritar alla ett tecken ur TECKEN punkt för punkt på en liten duk. Filen har också en egen kopia av esc (samma som i ui/hjalp.ts, som filen redan importerar från) och letar upp huvudbyn för hand fast huvudbynsPlats finns i varldbild.ts.  
Förslag: En funktion teckenBild(namn, spegel) med en sparad duk per namn; knappen tar dess toDataURL. Importera esc från hjalp.ts och använd huvudbynsPlats.  
Ändras i spelet: Ingen märkbar skillnad. (Saknar världen en huvudby hoppar kartan inte längre till en slumpvis plats när den öppnas.)  
Prövningen: Stämmer rad för rad. Enkel hopslagning i en fil, utan att bilden ändras.

**155. Att skapa en tro och att trycka på en knapp skrivs ut gång på gång**  
Var: `src/test/scenarier/religion.ts:243,291,321,347,390,423,453 (tro-loopen) och 304,306,357,362,364,491 (trycket); samma tryck i agande.ts:1432-1433,1706,2030,2032, folk.ts:960-961, kultur.ts:1043,1073,1172,1174,1422,1426`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Loopen 'gå fram 25 timmar och visa ett tecken tills personen har en tro' står sju gånger i religion.ts. Den långa raden som låtsas trycka på en knapp i panelen står ett tjugotal gånger i fyra filer, och kultur.ts har redan två egna små hjälpare för den.  
Förslag: Två hjälpare i hjalp.ts: fåTro(s, person, tecken) för loopen och tryckHjalp(id, grupp?) för trycket. Byt ut ställena ett i taget.  
Ändras i spelet: Nej.  
Prövningen: Stämmer, och trycket är upprepat i fler filer än läsaren såg. Raderna blir inte så många färre, men de blir mycket kortare och lättare att läsa. Läsarens siffra 35 rader var för hög.

**156. Färder mellan grannbyar skapas och vänds hem på sex ställen**  
Var: `src/sim/byhandling.ts:142-145, 184-187, 293-301, 391-395 (ny färd); 535-538, 548-551 (vänd hem); 507, 529 (avdraget av folk och styrka)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Mönstret 'ny färd med nästa nummer, lägg i listan, trampa leden, lägg ankomsten i kön' står utskrivet fyra gånger. 'Vänd hem' står två gånger med samma fyra rader, och avdraget av döda ur byns folk och styrka två gånger.  
Förslag: Tre små hjälpfunktioner: en som skapar och skickar färden, en som vänder den hem och en som drar av de döda.  
Ändras i spelet: Nej.  
Prövningen: Stämmer rad för rad. Färdens nummer används i världens slump, så numret måste tas på samma ställe som nu; i övrigt är det ett rakt byte.

**157. Samma vaktkod i snabbkoll och riktad**  
Var: `src/test/snabbkoll.ts:10-28; src/test/riktad.ts:43,187-200`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: snabbkoll och riktad har var sin kopia av samma kod: de fyra byarna, 12 dygn, körningen två i taget, genomgången av krascher och vaktlarm, utskriften och felkoden. Skillnaden är bara vilka scenarier som körs och att riktad hoppar över byarna när simuleringen inte ändrats. (koll.ts har inte samma kod, som läsaren trodde.)  
Förslag: Lägg en funktion i pool.ts som kör de fyra byarna och ger tillbaka raden att skriva ut och om något kraschade eller larmade. Båda skripten anropar den.  
Ändras i spelet: Ingen skillnad i spelet.  
Prövningen: Stämmer: koden är kopierad nästan rad för rad, och en ändring av vakterna i den ena glöms lätt i den andra. Liten vinst men ingen risk.

**158. Samma enradare för 'gör någon annan redan det här' och 'byns vuxna' på många ställen**  
Var: `src/sim/kruka.ts:57; src/sim/slatter.ts:107, 182; src/sim/bin.ts:225; src/sim/boskap.ts:98, 121, 192; src/sim/hage.ts:113, 131, 218; src/sim/smuts.ts:266; src/sim/styre.ts:307; src/sim/bynamn.ts:78; src/sim/kyrka.ts:706; src/sim/forradsmal.ts:222; src/sim/lagar.ts:206; src/sim/berattelser.ts:2157; src/sim/odling.ts:624; src/sim/rykten.ts:415; src/sim/kult.ts:243; src/sim/seder.ts:228; src/sim/folk.ts:245-262 (enTill, enTillDar, andraGor, doingAct)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Mönstret living(s).some(q => q !== p && q.task?.act === 'X' && q.task.ref === id) står utskrivet på minst elva ställen under olika namn (upptagen, barsHem …). living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen) står på tio ställen, två av dem med egna namn (vuxna, vuxnaOf). folk.ts har redan andraGor och doingAct, som gör samma slinga (den ena räknar, den andra svarar ja eller nej).  
Förslag: En hjälpare i folk.ts, t.ex. annanGor(s, p, act, ref), och en vuxna(s). Bara de ställen som är exakt lika byts. De som skiljer sig lämnas: lon.ts, handel.ts och projekt.ts räknar inte gästerna, sport.ts har en övre ålder, kult.ts rad 228 räknar från småbarn, och doingAct räknar också den som är borta på resa (alive i stället för living).  
Ändras i spelet: Nej.  
Prövningen: Stämmer: samma rad står på ett tjugotal ställen. Koden blir mer lättläst än kortare, och risken är liten så länge bara de exakt lika ställena byts.

**159. Fyra redogörelser öppnas med samma klickkod**  
Var: `src/ui/flikar/filt.ts:14-19; src/ui/flikar/fram.ts:15-20; src/ui/flikar/match.ts:14-19; src/ui/flikar/resa.ts:13-18; src/ui/hjalp.ts:210-214`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Bytet, framträdandet, matchen och resan har var sin klick-funktion på samma fem rader: hitta knappen, lägg numret i ui, byt flik och stäng notisen. Bytet stänger inte notisen, de andra tre gör det. De fyra knapparna i hjalp.ts är också nästan lika.  
Förslag: En hjälpare som ger klick-funktionen för ett slag, och en knappfunktion med slaget, texten och symbolen som argument. En ny redogörelse blir då en rad.  
Ändras i spelet: Ingen märkbar skillnad. Bytet stänger då också notisen, som de andra tre.  
Prövningen: Stämmer ordagrant i de fyra filerna. Det är samma mönster fyra gånger och passar projektets regel om register; risken är liten.

**160. Samma uppställning med chansen upprepas i tre upplevelsescenarier**  
Var: `src/test/scenarier/religion.ts:41-42 och 63, 72-73 och 93, 102-103 och 119; liknande för en enda chans på 128-129 och 196`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: vuxenliv, andeupplevelse och blekna börjar med samma två rader som sparar alla upplevelsers chans och sätter den till 3, och slutar med samma rad som ställer tillbaka. Scenariot tecken gör samma sak för en enda chans.  
Förslag: En hjälpare i religion.ts, t.ex. medSakerChans(gör), som sätter chansen, kör scenariot och ställer tillbaka. Används av de tre; tecken kan få en valfri nyckel.  
Ändras i spelet: Nej.  
Prövningen: De tre kopiorna är lika rad för rad, och hjälparen gör det svårare att glömma att ställa tillbaka chansen. Vinsten är liten men risken också.

**161. Krukor, vattensäckar och bryggkar ställs upp för hand i dryckesscenarierna**  
Var: `src/test/scenarier/kultur.ts:3660-3661, 3683, 3707, 3755, 3872-3876 (17 ställen med `hos = undefined`); samma mönster i fas9.ts (7 ställen, 933, 973) och fas11.ts (4)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Varje dryckesscenario gör sina egna små hjälpare eller skriver raden `addTool(...); t.hos = undefined; fyllVatska(...)` för hand, och bryggkaret läggs in som samma rad tre gånger i filen (och två gånger i fas9.ts). hjalp.ts har ingen hjälpare för det.  
Förslag: Tre hjälpare i hjalp.ts: `kruka(s, p, sort, vatska?, n?)`, `vattensack(s, p)` och `medBryggkar(s, id)`, som alla scenarierna använder.  
Ändras i spelet: Nej.  
Prövningen: Stämmer, och samma uppställning finns i två filer till, så en gemensam hjälpare lönar sig. Ordningen som tingen skapas i måste vara densamma, annars får de andra nummer.

**162. Samma efterarbete efter striden på fyra ställen**  
Var: `src/sim/rovare.ts:796-804; src/sim/varg.ts:656-661; src/sim/bjorn.ts:215-221; src/sim/jakt.ts:326-329; src/sim/kartstrid.ts:265-271, 289-291`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Striderna mot rövare, vargar, björn och vildsvin gör var för sig samma sak för varje bybo efteråt: slitKastat, listan över svårt skadade, övningen i närstrid och en tanke (vann eller förlorade). Tankens text skiljer sig, resten är lika. kartStridSlut har två nästan lika slut (rapport, räknare, ta bort striden).  
Förslag: En gemensam funktion i kartstrid.ts som tar tankens text och värde och gör de tre–fyra lika raderna, och ett gemensamt slut i kartStridSlut. Ordningen på anropen måste vara densamma, så att slumpen dras i samma följd.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: de fyra ställena har samma tre–fyra rader. Vinsten är mindre än läsaren räknade (ungefär 8 rader), men risken är liten och nästa best slipper kopiera dem.

**163. Nykomlingar skapas på tre ställen med samma rader**  
Var: `src/sim/liv.ts:285-307,342-352,369-374,388-396, src/sim/giftermal.ts:53-56`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Främlingen, nybyggaren och den som gifter in sig gör samma sak: newPerson, startSkills, startSmak och varifrån hen kommer. Fången som får stanna och främlingen som får stanna skapar ingen ny person (de finns redan som gäster), men har samma rad som flyttar hen ur vägg och vatten. Det medhavda (MEDHAVT, ett register med en rad) ges på två ställen. Det är alltså tre plus två ställen, inte fem lika.  
Förslag: En funktion nykomling(s, kön, ålder, från) för de tre som skapar en person, och en liten funktion för 'ställ bybon på fri mark och ge det medhavda' för de två som blir bybor. Slumpen dras i samma ordning som i dag. MEDHAVT får vara kvar som register.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer, men mindre än läsaren skrev: tre ställen skapar en person och två flyttar in en gäst. Värt att göra eftersom en ny sak som alla nykomlingar ska ha annars måste skrivas på flera ställen.

**164. Sakens ruta väljer innehåll med tolv om-satser i rad**  
Var: `src/ui/flikar/sak.ts:13-16, 206-219`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: html() har en rad per bokstav framför kolonet (f, u, H, q, R, g, h, r, b, a, v, k) och ordet tornado. Elva av dem har samma form: börjar texten med bokstaven, anropa funktionen med talet efter. "k:" skickar texten som den är, inte som tal. Vilka bokstäver som finns står som löptext i kommentaren överst.  
Förslag: Ett litet register från bokstav till funktion, som html() slår upp i. Raden för "k:" får texten i stället för talet. Kommentaren blir registret.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer. Ett register är projektets egen regel för sådant det kan finnas fler av, och ändringen är mekanisk; man måste bara komma ihåg att "k:" inte är ett tal.

**165. Tre kopior av 'rader och palett till en bild'**  
Var: `src/ui/raden.ts:69-76, src/ui/ram.ts:8-16, src/ui/runstenar.ts:13-21`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Vågbandet, panelens hörn och runstenarna gör var sin gång samma sak: skapar en canvas, fyller en punkt i taget ur rader och pal och gör en adress av den. Skillnaden är bara bakgrundsfärgen (vågen) och speglingen (hörnen).  
Förslag: En gemensam funktion bildUrl(bild, {spegla, bakgrund}) som alla tre anropar. Den behöver document och kan därför inte ligga i en fil som testerna läser utan webbläsare; lägg den i en egen liten fil i src/ui eller i runstenar.ts.  
Ändras i spelet: Nej.  
Prövningen: Stämmer: de tre slingorna är samma kod. Liten vinst, och felet syns direkt i bilden om något blir fel.

**166. Fyra nästan lika funktioner räknar andra som gör samma sak, och en används aldrig**  
Var: `src/sim/folk.ts:245-262, ARKITEKTUR.md:103`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 7 rader bort.  
I dag: enTill, enTillDar, andraGor och doingAct går alla igenom människorna och räknar dem som gör en viss handling. doingAct har inga anropare i spelet, testerna eller gränssnittet; den nämns bara i ARKITEKTUR.md.  
Förslag: Ta bort doingAct (och raden i ARKITEKTUR.md), och låt enTill och enTillDar räkna med andraGor, som får ett valfritt villkor för uppgiften.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer: doingAct är död, och de tre andra räknar på samma sätt. Ingen slump dras, så byarna blir exakt som förut.

**167. Samma små hjälpare skrivna flera gånger i flikarna**  
Var: `src/ui/flikar/person.ts:156, 168, 248-249; src/ui/flikar/match.ts:41; src/ui/hjalp.ts:118, 152-155; src/ui/flikar/seder.ts:36-39; src/ui/flikar/grannar.ts:12; src/ui/flikar/fram.ts:24; src/ui/flikar/filt.ts:45, 53`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 7 rader bort.  
I dag: visa i person.ts och tio i match.ts är samma funktion (skalan 0–20 visad som 0–10). opOrd i person.ts är ordagrant sista raden i relWord i hjalp.ts. Stapeln från mitten skrivs tre gånger med samma stil (sedBar, hallBar, ansStapel). Pilen med ändringen finns i fram.ts och inskriven en gång till i filt.ts, och raden med varor som symboler finns i filt.ts och person.ts. tioDel i religion.ts är däremot en annan sak: den räknar om från 0–100.  
Förslag: En av varje i hjalp.ts: tioSkala(v) för visa och tio, opOrd som relWord använder, mittStapel(v, klass) och varorSym(lista, storlek). tioDel lämnas som den är.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Det mesta stämmer och är ofarligt att samla. Två rättelser: tioDel har en annan skala och hör inte hit, och pilen i filt.ts visar inget tecken när inget ändrats medan den i fram.ts visar "=", så de slås bara ihop om det får bli lika.

**168. Samma styrelse-objekt skrivs ut sex gånger**  
Var: `src/test/scenarier/byggnader.ts:1631, 1677, 1740, 1809, 1845, 1908`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Samma långa rad som ger byn ett tomt styre med en lista lagar står i skatteskuld, arvsskatt, budget, matbudget, lon och forsorjning. Fem av dem har lagen om skatt, daterad tre dygn tillbaka. Raden behöver två tvångsomvandlingar av typen för att gå igenom typkontrollen. Samma mönster finns på ett tjugotal ställen i de andra scenariofilerna.  
Förslag: En hjälpare i hjalp.ts, till exempel medLagar(s, lagar), som bygger objektet på ett ställe.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: sex nästan ordagranna rader. Raderna blir inte färre i den här filen, men varje rad blir kort, och ändras styrets fält behöver bara ett ställe rättas.

**169. Samma familjeuppställning skrivs ut fem gånger**  
Var: `src/test/scenarier/byggnader.ts:104, 163-164, 1580, 1625, 1674`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Raden som sorterar invånarna efter id och hittar barnet c och föräldern a (lägsta id av mor och far) står ordagrant i familjehus, agandet, husmarknad, skatteskuld och arvsskatt. Efter den hittas partnern b på samma sätt.  
Förslag: En hjälpare familjen(s) i hjalp.ts som ger tillbaka invånarna i ordning och a, b och c.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: fem ordagrant lika rader. Vinsten är liten men ofarlig, eftersom samma personer väljs som förut.

**170. Nytt bud och bytt bud, och öldrickandet, är skrivna två gånger**  
Var: `src/sim/kyrka.ts:651, 658, 675-676, 711-712; src/sim/lagar.ts:117-118`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Frågorna nyttBud och bytBud har samma rad för att lägga in ett bud. Högtidens öl och gravölet har samma två rader för att ta en öl ur kyrkans kruka och dricka den. skrivenLag frågar samma tre ställen som skrivenVar.  
Förslag: En funktion som lägger in ett bud, en som låter någon dricka kyrkans öl, och låt skrivenLag fråga om skrivenVar gav något.  
Ändras i spelet: Nej.  
Prövningen: Stämmer rad för rad. Det är en ren hopslagning utan slump inblandad.

**171. Att bära kroppen ställs in med fyra nästan likadana block**  
Var: `src/sim/grav.ts:181-214`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: kroppUpp ställer in uppgiften fyra gånger (skändningen, skogen, vattnet, graven) med samma rader: handlingen, platsen, skälet, sluttiden, arbetstiden och redskapet. Bara platsen, tiden, texten och spaden skiljer.  
Förslag: En liten hjälpare i funktionen som tar plats, tid, skäl och redskap.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Det är en ren omskrivning på ett ställe, och scenarierna för begravning och skändning prövar alla fyra vägarna.

**172. Samma sak skrivs två gånger i upptradaKlar och småräkningar som redan finns som hjälpare**  
Var: `src/sim/framtradande.ts:115, 127, 133, 438-439, 450-458, 460, 462-466, 488; src/sim/teknik.ts:221`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Minnet för 'ingen kom' byggs två gånger med nästan samma fält (rad 438 och 450-457). TEKNIK.find(k => k.id === x.tek)! står tre gånger fast teknik.ts har uppslaget TEK. Rad 488 bygger listan 'A, B och C' för hand fast och() är importerad. Rad 466 klämmer med Math.max/Math.min fast clamp används i resten av filen. Glädjen räknas två gånger (rad 462 och 464). Villkoret för dans, d.instrument || d.id === 'sang', har en överflödig halva: sången har redan instrument: true.  
Förslag: Bygg minnets gemensamma fält i en liten hjälpare som båda ställena använder; använd TEK[x.tek], och(m.lart), clamp och en lokal variabel för glädjen; skriv dansvillkoret som d.instrument.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Alla sex punkterna stämmer med koden och ingen ändrar vad spelet gör. Det är små, säkra förkortningar i en fil med mycket långa rader.

**173. Vargflocken byggs för hand i fem scenarier och djurens nollställning står sex gånger**  
Var: `src/test/scenarier/natur.ts:1985, 2052, 2155, 2233, 2294 (flock); natur.ts:1842, 1900, 2447, grund.ts:2323, 2386 och fas10.ts:134 (nollställning av djuren)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Samma långa rad med flockens id, vargar, plats, hunger och 'stryker' skrivs fem gånger med små skillnader. Raden som nollställer djurens tillstånd inför ett jaktförsök står sex gånger i tre filer. Påståendet om scenariot ivagen stämmer inte: det ställer möbler på bestämda rutor och använder redan rätt räknare, så medBank passar inte där.  
Förslag: Två hjälpare i hjalp.ts: nyFlock(s, antal, x, y, hunger, mer?) och nollaDjur(s). Stationerna i ortvatten och slanda tas i nästa fynd.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Upprepningen stämmer och hjälparna är enkla. Raderna blir kortare och lättare att läsa, men få rader försvinner eftersom varje ställe redan är en rad.

**174. Platsens namn i text byggs på fem ställen, och ett av dem blir fel när platsen är borta**  
Var: `src/sim/ort.ts:90, 145-146, 187, 382-386; src/sim/skrift.ts:428`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: "by som heter X", "by X" och "en plats långt borta" sätts ihop för sig i berattaOrt, describeOrt, raknaBynVet och nyhetNarByn, och skrift.ts har en egen platsNamn. I describeOrt används reservtexten "en plats som inte finns längre" bara för rykten. För en känd eller besökt plats som tagits bort ur världen (utposter och tillfälliga platser tas bort, utpost.ts:179 och landmarken.ts:116) blir texten "Vet var den ligger en plats".  
Förslag: En platsText(s, nr, rykte) i ort.ts som alla fem frågar, med reservtexten på ett ställe.  
Ändras i spelet: Samma texter som i dag, utom att en försvunnen plats beskrivs rätt ("en plats som inte finns längre").  
Prövningen: Stämmer: rad 146 använder inte reservtexten för kända och besökta platser, så meningen blir trasig. En gemensam funktion rättar det och samlar texten på ett ställe.

**175. Tilliten till berättaren och "att berätta stärker minnet" står i tre filer**  
Var: `src/sim/ort.ts:58, 88, 91; src/sim/minne.ts:414, 417, 525; src/sim/uppdrag.ts:167, 194, 197`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Uttrycket för hur mycket lyssnaren tror på berättaren (MINNE.troBas, troDiv, troMin, troMax gånger lognFaktor) står ordagrant i minne.ts, ort.ts och uppdrag.ts. Raden som stärker minnet (c + berattaStark × det som fattas) står på sex ställen i samma tre filer. rykten.ts och motgang.ts har liknande uttryck men med egna tal och ska inte röras.  
Förslag: Två små exporterade funktioner i minne.ts, tillit(a, b, r) och stark(c), som de tre filerna använder.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer ordagrant på alla ställen. Ändras talet för tilliten i dag måste det göras lika i tre filer; med en funktion räcker ett ställe.

**176. Stationseldens vedräkning står två gånger**  
Var: `src/sim/stationseld.ts:41-67`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: elda och eldaVed har samma formel för hur många vedträn som behövs. eldaVed och eldaForst har samma uträkning av hur länge elden ska brinna.  
Förslag: En hjälpfunktion för vedbehovet och en för tiden.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Två formler som måste vara lika står på två ställen var, så en ändring på ena stället ger fel mängd ved som bärs dit.

**177. Flaggan 'kort' står på 45 rader men betyder bara 'på dagen, efter grundbehoven'**  
Var: `src/sim/val.ts:98, 556, 766 (leka, första raden med kort), 962, 1086, 1252, 1269, 1422-1429 och kort: true på raderna 766-929`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Flaggan kort halverar den förvalda vilotiden en gång per val, första gången en rad med flaggan nås på dagen. Den första raden med flaggan är leka, direkt efter grundbehoven, så allt därefter kortas ändå, också raderna utan flagga. Flaggan på de övriga 44 raderna gör alltså ingenting. Talet VAL.pass gångras in på åtta ställen och delas bort på ett (flintletandet).  
Förslag: Ta bort flaggan kort från raderna och halvera tiden på ett ställe i slingan: första gången en rad över nivå 4 prövas på dagen. Det ger exakt samma val. Behåll VAL.pass som balanstal: det är ett reglage för alla pass på en gång, och att skriva in de halverade tiderna i tolv tal ger risk för fel utan att spara något.  
Ändras i spelet: Ingen skillnad (kontrolleras med npm run samma).  
Prövningen: Flaggan är överflödig på nästan alla rader och gör raderna längre. Läsarens andra del, att ta bort VAL.pass, faller: talet är ett användbart reglage.

**178. Björnjakten och vargjakten är nästan samma kod två gånger**  
Var: `src/sim/bjorn.ts:101-171; src/sim/varg.ts:527-592`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 60 rader bort.  
I dag: jaktPlats, jaktBeslut, bjornjaktVal/vargjaktVal och bjornjaktSteg/vargjaktSteg följer samma gång i båda filerna: vem som kallar (den som såg, ledaren, den modigaste), vilka som följer, kraften mot djuret, samlas, gå dit, slåss. Balansblocken har samma namn på talen. Skillnaderna: björnen kräver spjut, modet att kalla räknas ur kraft i stället för antal, vargjakten väger in anseende, karisma, seden och om den som kallar dräpt vargar, och björnjakten har rättningen i nästa fynd. Färdplanen har ett obyggt steg (16.5.1) där bestarnas jakt ska gå "som vargjakten", alltså en tredje kopia.  
Förslag: En gemensam storjakt med en rad per byte (björn, vargflock) i ett register: balanstalen, om spjut krävs och vilka delar av gehöret som räknas. Skillnaderna behålls som fält, så att spelet inte ändras. Bestarna (16.5.1) blir då en rad.  
Ändras i spelet: Ingen märkbar skillnad om skillnaderna behålls som fält. Kör `npm run likhet` och scenarierna varg, kallar, bjornjakt.  
Prövningen: Koden är dubbel, de två kopiorna har redan glidit isär (nästa fynd), och en tredje jakt är planerad. Att låta anseendet gälla även björnjakten är en ändring av spelet och ingår inte.

**179. Vargjakten och björnjakten är samma kod två gånger**  
Var: `src/sim/varg.ts:528-593, 625-679; src/sim/bjorn.ts:46-63, 102-177, 193-239`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 40 rader bort.  
I dag: Att kalla till jakt, vem som följer med, att samlas vid djuret och att djuret hinner undan är skrivet en gång för vargen och en gång för björnen, nästan rad för rad. Elva av björnjaktens balanstal har samma värde som vargens; två har samma namn men annat värde (nod 0,5 mot 1, folj 0,1 mot 0,2). Kopiorna har glidit isär: björnens väntan på de kallade rättades i steg 9.9.3 men inte vargens, och bara vargjakten räknar seden och gehöret för den som kallar. Slutet efter striden liknar varandra men skiljer sig mer (flera vargar, blodspåret, valpen).  
Förslag: Ett register med en rad per djur (styrkan som krävs, chansen att djuret går undan, texterna, om seden och gehöret räknas, de tal som skiljer sig) och en gemensam kod för beslutet, valet att följa med och samlingen vid djuret. Låt skillnaderna stå som fält i raden, så att spelet inte ändras. Slutet efter striden kan vänta. Rätta först vargens väntan (fynd 3).  
Ändras i spelet: Inget om skillnaderna behålls som fält i registret. Byarna utvecklas ändå inte exakt som förut om slumpen dras i annan ordning.  
Prövningen: Stämmer: beslutet, valet och samlingen är nästan lika, och dubbletten har redan gett ett fel som bara rättades på ena stället. Vinsten är mindre än läsaren sa, för slutet efter striden skiljer sig för mycket för att slås ihop enkelt.

**180. Behovens orsaker är räknade en gång till i personrutan**  
Var: `src/ui/flikar/person.ts:296-306, 311, 314, 317; src/ui/flikar/falt.ts:54-60; src/sim/steg.ts:701-727; src/sim/odling.ts:595`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 6 rader bort.  
I dag: För värmen och törsten frågar personrutan simuleringen efter delarna (varmeDelar, torstDelar). För vila, hälsa, mättnad, gemenskap och toa sätter rutan själv ihop samma tal som needsStep i steg.ts, och kommentaren säger just "samma delar som needsStep". Fältets ruta räknar grödans växttakt med samma tre faktorer som stepOdling. Ändras ett tal i simuleringen kan rutan visa fel orsak utan att något test märker det.  
Förslag: Låt simuleringen ge delarna: en funktion per behov (som torstDelar) som både needsStep och rutan använder, och vaxtTakt(s, f, k) i odling.ts som både stepOdling och fältets ruta använder. Börja med växttakten, som är enklast.  
Ändras i spelet: Ingen märkbar skillnad i dag. Förklaringarna i rutan kan inte längre glida isär från det som faktiskt händer.  
Prövningen: Stämmer: jag jämförde raderna i person.ts med steg.ts 701-727 och de upprepar samma formler. Det rör simuleringens kärna, så räkningen får inte byta ordning; samma-kollen visar om något ändrats.

**181. Elva egna kämpe-fabriker `m(...)` och kopior av kor/rader i stridsscenarierna**  
Var: `src/test/scenarier/folk.ts:1040, 1116, 1253, 1273, 1310, 1349, 1414, 1462, 1613, 1670, 1872 (m); 1350, 1415, 1463, 1614 (kor); 1351, 1416 (rader); 1391, 1440, 1492, 1643 (texter)`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 20 rader bort.  
I dag: Samma provkämpe skrivs om elva gånger. Skillnaderna är små men finns: modet är 14 på två ställen, en har sikte, en har smidighet 14 och skicklighet 12, och platserna skiljer sig. `kor` finns fyra gånger med olika frö (3, 5, 9, 13), `rader` två gånger, och kontrollen att varje loggrad blir en hel mening fyra gånger.  
Förslag: Lägg en `kampe(id, sida, vapen, o, st)` och en `allaTexter(strider)` i hjalp.ts, och en `korStrider` som tar fröets tillägg som värde. Varje scenario behåller sina platser och egenskaper genom `o` och `st`, och sitt frö.  
Ändras i spelet: Ingen skillnad i spelet. Striderna i testerna ska få exakt samma kämpar och frö som förut, så att inga gränser behöver ändras.  
Prövningen: Stämmer rad för rad. Vinsten är måttlig eftersom varje fabrik är en rad, men nästa stridsscenario slipper kopiera. Risken är att ett värde (mod 14, sikte) tappas vid flytten och en gräns blir röd.

**182. Rövaruppställningen (alla sover, grannbyarna fientliga, förrådets mitt) skrivs om och om igen**  
Var: `src/test/scenarier/agande.ts:2071-2077, 2160-2164, 2213-2215, 2250-2252, 2282-2288, 2309-2316, 2340-2345, 2373-2375, 2418-2422, 2530, 2580, 2661, 2721-2725, 3159-3166, 3276-3280; src/sim/rovare.ts:278`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 20 rader bort.  
I dag: I filen står 19 gånger att någon läggs att sova i 20 timmar, 17 gånger att alla grannbyar görs fientliga (inst = -60) och 13 gånger en egen uträkning av förrådets mitt. SIM.malet(s) i rovare.ts räknar redan samma mitt när byn har ett förråd, och rovartest använder den. Tre scenarier har var sin lokala ny() eller sov() som gör samma sak.  
Förslag: En hjälpare i hjalp.ts (bredvid rovarGang som redan finns där) som gör grannbyarna fientliga och lägger alla att sova, och SIM.malet(s) i stället för den egna uträkningen. Scenarier där bara några sover behåller sin egen rad.  
Ändras i spelet: Ingen skillnad i spelet.  
Prövningen: Stämmer, jag räknade samma antal. Malet ger samma punkt som den egna uträkningen så länge byn har ett förråd, vilket alla de här byarna har. Vinsten i rader är mindre än läsaren räknade, eftersom mycket står på samma rad som annat.

**183. Fåglarna har egna kopior av flockdjurens hjälpare**  
Var: `src/sim/djur.ts:302-328, 416-441, 347-378, 461-478`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 20 rader bort.  
I dag: fagStart (430-441) är samma kod som flockStart (317-328), med samma slumpanrop. fagelPlatser (416-427) liknar platserAv (302-314) men ger också fågelns utseende (orre, ripa, duva). faglarOf liknar flockOf, men fåglarna flyr en gång, sprider inte ut sig och kan flyga bort från kartan (s.faglarBorta).  
Förslag: Gör inte fåglarna till en hel rad i FLOCKARTER: registret används av jakten för sådant som inte gäller fåglar (styckning, anfall, spjutkrav). Dela bara de två hjälparna: en gemensam 'start' som tar platslistan och talen, och en gemensam sökning av platser. Behåll samma salt och samma slumpanrop, så flyttar sig inga fåglar.  
Ändras i spelet: Ingen skillnad om salten och slumpanropen behålls som de är.  
Prövningen: Kopian finns, men förslaget var för stort: en rad i FLOCKARTER skulle dra in fåglarna i jaktens kod för rådjur och vildsvin. Den mindre varianten (dela start och platser) är säker och sparar ungefär 20 rader.

**184. Fyra kopior av 'närmaste lediga ruta, ny plats, ny by-rad'**  
Var: `src/sim/byflytt.ts:117-143, 148-170, 249, 264; src/sim/utpost.ts:68-86, 191; src/sim/grannbyar.ts:54-64`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 20 rader bort.  
I dag: nyBy och nyttLager i byflytt.ts är nästan rad för rad lika: lediga rutor inom räckhåll, närmaste av dem, ny plats, nytt nummer, sin del av maten, ny rad, grannar, möte och en världshändelse. De skiljer sig i sorten, teknikerna, tron och styrkan. utpost.ts och grannbyar.ts har egna, lite olika varianter (utposten letar i en fyrkant, grannbyn letar utan räckhåll). Den tomma raden med fem nollor skrivs ut på tre ställen.  
Förslag: Slå ihop nyBy och nyttLager till en funktion med sorten och det som skiljer som argument, och gör en funktion för den tomma raden. Låt utpostens och grannbyns sökning vara; de söker på andra sätt.  
Ändras i spelet: Nej, om numren och slumpen dras i samma ordning som nu.  
Prövningen: Stämmer för de två i byflytt.ts och för den tomma raden. Vinsten är mindre än läsaren räknade med, eftersom utposten och grannbyn inte är rena kopior. Samma-kollen visar om något ändrats.

**185. resa.ts räknar samma saker på många ställen**  
Var: `src/sim/resa.ts:575 (barNu), 1149, 1248 (samma uttryck); 707, 761, 899, 912, 989 och src/sim/vagmote.ts:78 (materialfiltret); 282, 342, 434, 461-465, 649, 742 m.fl. (målplatsen och hemrutan); 758-802 (köp och sälj); 580-588 och 1275-1285 (olyckan)`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 20 rader bort.  
I dag: Funktionen barNu finns redan men två ställen skriver ut samma uttryck i stället för att använda den. Filtret för vad som går att sälja eller ge bort står på sex ställen. Uppslaget av målplatsen och hemrutan upprepas ett tiotal gånger. Olyckan i gruvan och olyckan på vägen är nästan lika (gruvan har huvudet med bland kroppsdelarna och en annan text).  
Förslag: Använd barNu på de två ställena, och gör små hjälpfunktioner för filtret, målplatsen och hemrutan, och olyckan. Låt de tre köp- och säljblocken i radBesok vara: de avrundar olika, och en sammanslagning kan ändra priserna.  
Ändras i spelet: Nej.  
Prövningen: Stämmer. Bärförmågan på rad 288 och 634 räknas på ett annat sätt och hör inte hit, och köpblocken bör inte slås ihop, så vinsten är ungefär hälften av vad läsaren räknade med.

**186. Slaktens recept och DJUR-raderna upprepar samma värden per djur**  
Var: `src/sim/recept.ts:55, 110-124; src/sim/redskap.ts:117-145`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 20 rader bort.  
I dag: Nio recept för kött och åtta för skinn är identiska (3 eller 5 minuter, kniv). De flesta av de 20 raderna i DJUR upprepar timme 2, maxTim 2, slakta, kniv och minDel 1.  
Förslag: Gör köttens recept i en slinga över KOTTSLAG, och skinnens över en lista. Ge DJUR en liten hjälpfunktion med standardvärdena, så att varje rad bara säger det som skiljer.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer, och designdokumentet säger att raderna ska göras ur djurregistret. Registren har stränga typer (koden skriver t.ex. RECEPT.kott), så slingan måste behålla namnen i typen. Därför lite risk.

**187. Samma handlaruppställning skrivs ut för hand i nitton scenarier**  
Var: `src/test/scenarier/agande.ts:971-972, 1063-1064, 1146, 1189, 1240, 1286-1287, 1354-1355, 1546-1547, 1619-1620, 1732-1733, 1779-1780, 1802-1803, 1817-1818, 1837-1838, 1862-1863, 1880-1881, 1940-1941, 3307-3308`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 18 rader bort.  
I dag: Raden som skickar fram en handlare från en vänlig grannby står 18 gånger, oftast med rik by, tänd eld, ved, grenar och torrgräs före och en slinga på upp till 40 slag efter, tills handlaren står vid filten. Varianterna skiljer sig lite: med eller utan eld och bränsle, med eller utan vanligBy, olika slut på slingan (handlaren finns, handlaren handlar, någon har pratat) och ibland vagn eller packdjur. Tre av ställena är redan egna små fram-funktioner.  
Förslag: En hjälpare medHandlare(s, { eld?, vanlig?, utr? }) överst i agande.ts som gör uppställningen och ger handlaren. De ställen som väntar på något annat än att handlaren handlar behåller sin egen slinga.  
Ändras i spelet: Ingen skillnad i spelet. Scenarierna blir kortare, och det syns var de skiljer sig.  
Prövningen: Stämmer. Raderna är långa och nästan lika, och skillnaderna går att ta som val i hjälparen. Vinsten i rader är mindre än läsaren räknade, för varje ställe är redan bara en eller två rader.

**188. "Vuxna i byn" och avstånd skrivs om överallt**  
Var: `src/sim/styre.ts:307 (vuxnaOf); bynamn.ts:78; lon.ts:40; kult.ts:228; forradsmal.ts:208; sport.ts:177; handel.ts:160; projekt.ts:354; varg.ts:131; rovare.ts:121; jakt.ts:90; strid.ts:390`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 15 rader bort.  
I dag: ageOf(x, s.now) >= ALDER.vuxen står 75 gånger i src/sim, och flera filer har var sin lokala vuxna() med små skillnader: några räknar bort gäster (lon.ts, handel.ts, projekt.ts), sporten har en övre ålder, och den i kult.ts:228 räknar från småbarnsåldern trots namnet. Math.hypot står över 300 gånger, och tre filer har var sin likadan avst().  
Förslag: En arVuxen(s, p) och en vuxna(s) i folk.ts och en avst(a, b) på ett ställe. De lokala kopiorna som gör exakt samma sak tas bort; de som menar något annat (utan gäster, med övre ålder) behåller sitt tillägg. Döp om den i kult.ts efter det den räknar. Byt inte alla 300 Math.hypot; bara de lokala hjälparna och det som ändå rörs.  
Ändras i spelet: Ingen skillnad, om skillnaderna mellan varianterna behålls.  
Prövningen: Det stämmer och är enkelt, och namnet i kult.ts är direkt missvisande. Vinsten är liten och varianterna skiljer sig, så bara de som är exakt lika slås ihop.

**189. Handlarens och rövarens utseende, och kläderna, räknas i dubbla uppsättningar**  
Var: `src/ui/utseende.ts:71-76 (RADD), 107-127 (utrustad), 160-174 (buren), 175-204 (handlarSkapad, rovarSkapad)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 15 rader bort.  
I dag: handlarSkapad och rovarSkapad slumpar en person på samma sätt, i varsin tabell. De skiljer sig i en sak: rövaren nollställs på huvudbonad, smycke och kläder, handlaren behåller det slumpade. utrustad (bybor) och buren (gäster) har varsin kedja 'om plagget är rock … skor … byxor …'; gästernas räknar kappan som rock, bybornas inte, så en bybo i kappa ritas utan plagg på överkroppen. kropp() frågar dessutom själv om handlingen är fly eller gömma innan stridAnsikte svarar samma sak.  
Förslag: En funktion gastSkapad med slaget (handlare eller rövare) i nyckeln, så att en handlare och en rövare med samma namn inte får samma bild. En liten tabell plagg → fält som utrustad och buren delar. Ta bort RADD och raden i utseende.ts.  
Ändras i spelet: En bybo med kappa syns med rock på figuren, som gästerna redan gör. Annars ingen skillnad.  
Prövningen: Stämmer, med rättelsen att de två funktionerna inte är helt lika (rövaren nollställs mer), så hopslagningen måste behålla den skillnaden. Kappan som saknas hos byborna ser ut som en miss: byborna kan sy kappor och manteln räknas redan som rock.

**190. Nio nästan lika rader för att salta kött, en per köttsort**  
Var: `src/sim/tillverka.ts:17-26; src/sim/handlingar.ts:179; src/sim/recept.ts:6; src/test/scenarier/iakttagare.ts:223, 237`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 14 rader bort.  
I dag: salta_kott, salta_vargkott, salta_radjurkott och sex till är var sin lång rad i TILLVERKA och var sin handling, lika så när som på köttets namn. En ny köttsort kräver två nya rader. Grillen, torken och röken gör redan sina rader i en slinga över KOTTSLAG (matlagning.ts:56, 147, 157).  
Förslag: Gör raderna i en slinga över KOTTSLAG, som grillen och torken. Det ändrar inget i spelet. En enda rad som tar vilket kött som helst är kortare men ändrar projektets värde (köttet räknas då inte i kostnaden) och bör inte väljas utan test.  
Ändras i spelet: Ingen märkbar skillnad med slingan.  
Prövningen: Stämmer. Designdokumentet (Kött och fisk för sig) säger att raderna ska göras ur djurregistret i stället för att skrivas en och en. Handlingarnas namn finns också i typlistan, så slingan kräver lite omsorg.

**191. Tre nästan lika sökningar efter plats för en lagerplats**  
Var: `src/sim/lager.ts:1000-1010 (narmareLager), 1051-1061 (flyttaLager), 1085-1098 (newZone)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Samma slinga står tre gånger: gå igenom rutorna runt byns område, sålla bort det som ligger för nära elden, på stråk, på oanvändbar mark eller inpå en annan lagerplats, sortera efter en poäng och ta den första som går att gå till från elden. Poängen och några villkor skiljer: flytten mot mitten godtar ingen skog och har ingen gräns utanför byn, de två andra räknar skogen som en kostnad.  
Förslag: En funktion lagerKandidat(s, bredd, höjd, villkor, poäng) som de tre anropar. Var och en behåller sina egna villkor och sin egen poäng, så att platserna blir exakt desamma som i dag. Väntar på svaret om flytten mot mitten: tas den bort finns bara två sökningar kvar.  
Ändras i spelet: Ingen skillnad, så länge varje sökning behåller sina villkor och rutorna gås igenom i samma ordning.  
Prövningen: Stämmer: slingorna är lika rad för rad. Läsarens tanke att alla tre får samma regler görs inte, för det skulle flytta lagerplatser i spelet.

**192. Samma små hjälpare skrivna i flera av filerna**  
Var: `src/sim/budget.ts:56-57, 64, 211; src/sim/lon.ts:38, 40, 43; src/sim/skatt.ts:41, 85, 93, 137-139, 172, 187-189; src/sim/skuld.ts:99, 122; src/sim/handel.ts:160; src/sim/byte.ts:69; src/sim/ord.ts:109; src/sim/lager.ts:199`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 12 rader bort.  
I dag: lutning (lutningen mot Sammanhållning) står ordagrant i budget.ts, lon.ts och skatt.ts. fjardedel står i budget.ts och lon.ts. Listan över vuxna bybor skrivs på flera ställen. skatt.ts räknar skatteåldern med samma uttryck på rad 85 och 172 fast forsorjAlder på rad 41 gör just det. Knepet att tillfälligt ta bort dödsdagen för att betala ur en död persons saker står två gånger. skuld.ts har en egen hen fast honom finns i ord.ts, och en egen text för varor fast varorText finns i byte.ts.  
Förslag: Lägg lutning, fjardedel och vuxna på ett ställe och importera dem. Använd forsorjAlder i skatt.ts. Gör en hjälpare som betalar ur en död persons saker. Använd honom och varorText i skuld.ts. Låt tre saker vara: djuren i skatteskuldens tryck (det ändrar spelet), BUDG.gamla (ett eget balanstal som råkar vara 60) och bynsAv (räknar per hög och är inte säkert samma som villageAmount).  
Ändras i spelet: Ingen märkbar skillnad. Botgåvans text får samma form som andra gåvor (till exempel tre rötter i stället för 3 rot).  
Prövningen: Dubbletterna finns där läsaren säger. Tre av delförslagen ändrar spelet eller är inte säkert lika och ska lämnas, därför färre rader än läsaren räknade.

**193. Sakerna på rutan räknas med samma formel på två ställen**  
Var: `src/sim/steg.ts:1234-1251 och 1257-1276 (formlerna); 1406-1407 och 1594-1595 (hem med bördan); 1437-1482 (tre sökningar)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: sakerPaRutan och sakerLasare har var sin kopia av formeln för grenarna och för bär och rötter. Den andra är en snabb variant som byggts med flit (kommentaren säger "samma antal"). Ändras den ena utan den andra visar kartan ett annat antal än samlaren räknar med. "Bördan är full: kom ihåg platsen, gå hem" står två gånger. De tre sökningarna runt samlaren liknar varandra men har olika villkor (tändmaterialet prövar inte vatten och väggar).  
Förslag: En liten funktion per formel som båda ställena använder, och en funktion hemMedBordan. Låt de tre sökningarna vara: de gör olika saker.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Formlerna är verkligen dubbla, och risken att de glider isär är riktig. Att slå ihop de tre sökningarna håller inte: villkoren skiljer sig, och det är kod som körs ofta.

**194. Tre nästan lika register för grillat, torkat och rökt**  
Var: `src/sim/matlagning.ts:50-57,141-148,155-161,172-174; src/sim/val.ts:804,805,818`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: RATTER, TORKAS och ROKAS har samma kolumner och samma ordning på råvarorna. 'per: 1' står på varje rad. BRYGG_MALT lämnar bara tillbaka talet TORK.maltDygn, som raden ovanför redan läser direkt. Skillnaderna är små: den hela gäddan grillas bara, linet (ratlin) finns bara i torkningen, och allt rökt blir rökt fisk eller rökt kött.  
Förslag: Ett register med en rad per råvara och kolumnerna grillad, torkad och rökt, i samma ordning som idag. De tre gamla namnen blir listor som räknas ur det, så att val.ts och testerna inte ändras. Ta bort 'per' och BRYGG_MALT.  
Ändras i spelet: ingen märkbar skillnad, om ordningen på raderna behålls  
Prövningen: Stämmer, och ordningen är densamma i alla tre, så de går att slå ihop utan att något ändras. Vinsten är mindre än läsaren trodde; uppslagningarna (tidAv, torrDel, klar) skiljer på torkställning och rökeri och blir kvar.

**195. Tron byggs på två ställen: grunda och troUrRad**  
Var: `src/sim/religion.ts:304-308, 374-380, 494-505`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: troUrRad (tron i en väckt grannby) bygger samma grundvärden som grunda och skriver om gudens två berättelser ord för ord från nyGud.  
Förslag: En funktion som bygger trons grundvärden och en som ger gudens text. Slumpen måste dras i samma ordning som i dag: i nyGud dras andens plats före namnet, i troUrRad efter.  
Ändras i spelet: Nej, om slumpens ordning behålls.  
Prövningen: Stämmer: samma text och samma grundvärden står två gånger, så en ändring i den ena glöms lätt i den andra. Risken är bara att slumpen dras i annan ordning.

**196. Vad som går åt till att tända står på fyra ställen som inte säger samma sak**  
Var: `src/sim/eld.ts:217-223, 226-244, 290-296, 318-327`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 8 rader bort.  
I dag: canLight, tandHamtas, forsokTid och tryLight avgör var för sig om det blir näver, hö eller en täljd näver, och grenar eller kol. forsokTid räknar med näverns högre chans så fort byn har ett blad och ved, men tryLight täljer bara när höet saknas, så den väntade tiden blir för kort när byn har hö. tandHamtas frågar byns förråd där de andra frågar vad personen får ta.  
Förslag: En funktion som svarar vad just det här försöket använder (tändmaterial, pinnar eller kol, bränsle), som de fyra frågar.  
Ändras i spelet: Nästan ingen skillnad. Valet mellan att hämta en brand och att slå med flintan blir något riktigare, så någon by kan utvecklas lite annorlunda (nytt facit).  
Prövningen: Skillnaden mellan forsokTid och tryLight finns i koden och ger en för kort väntad tid. En gemensam funktion tar bort felet och gör tändningen lättare att ändra.

**197. Lusten att resa en sten och lusten att skriva ett blad räknar samma saker två gånger**  
Var: `src/sim/skrift.ts:78-103 (runstenLust), 313-372 (skrivLust)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Båda funktionerna går igenom sorgen efter en död (samma uppslag av den döda, samma vikt) och bedriften (samma formel för hur lusten avtar och för egenintresset, samma bevis). Skillnaderna är små: vad som räknas som redan skrivet (sten eller blad), att stenen väger in hur känd den döda är (kandVikt) och graven med text, och att bladet inte gör det. Lagen delas redan (lagLust), och de heliga kvädena skiljer sig på riktigt (stenarna halverar lusten, boken skrivs en gång).  
Förslag: En gemensam funktion för sorgen och en för bedriften, med en parameter för "finns redan", som båda använder. Bestäm samtidigt om bladet om en död också ska väga in hur känd hen är, som dokumentet säger.  
Ändras i spelet: Ingen märkbar skillnad om skillnaderna behålls. Får bladet också vikten för hur känd den döda är, skrivs det lite oftare om dem byn minns.  
Prövningen: Stämmer för sorgen och bedriften; de heliga kvädena och lagen är inte dubbletter. Designdokumentet (Människan, Hur det går till) säger att vikten för hur känd någon är gäller "en skrift av slaget Minne", men bladet saknar den, så en gemensam funktion rättar också det. Vinsten är liten.

**198. Tvillingens födelse är en kopia av det första barnets**  
Var: `src/sim/liv.ts:177-206`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Raden för tvillingen upprepar det första barnets rader (ny person, krönika, logg, notis, räkning, uppväxt, smak, uppkallning) men hoppar över föräldrarnas glädje, tecknet vid åska, raden hos syskonen (personNara), texten om förlossningens förlopp och gudarnas händelse. Inget i koden eller steg 9.5.29 säger att skillnaden är avsedd.  
Förslag: En hjälpfunktion fodBarn() som anropas en eller två gånger.  
Ändras i spelet: Tvillingen får samma tankar och händelser omkring sig som det första barnet: föräldrarna blir lite gladare, och syskonen får raden i sin logg. Nytt facit behövs.  
Prövningen: Stämmer: en lång rad är en nästan-kopia, och det som saknas ser ut som glömt. Liten ändring i ett ovanligt fall.

**199. Proteserna har två register**  
Var: `src/sim/halsa.ts:261, 269; src/sim/protes.ts:12-17, 22-25, 35-36`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 5 rader bort.  
I dag: PROTES_FEL i halsa.ts säger hur mycket varje protes ger tillbaka, bredvid registret PROTESER i protes.ts. I protes.ts står listan över ben och fötter tre gånger. Rad 22 har ett villkor som ger samma värde åt båda håll ('traben' ? 'traben' : k). Filtret för en ledig protes står två gånger på rad 25 och 36.  
Förslag: Lägg talet som ett fält ('fel') på raden i PROTESER och låt halsa.ts läsa det där. Ta bort det tomma villkoret och gör filtret till en funktion. Använd GADELAR inne i funktionen brutetBen, men inte i själva registret: halsa.ts och protes.ts läser in varandra, så en lista som hämtas när filen laddas kan vara tom.  
Ändras i spelet: Nej.  
Prövningen: Allt läsaren säger stämmer i koden, och ett register per sak är projektets princip. Den enda fällan är att de två filerna importerar varandra, vilket förslaget nu tar hänsyn till.

**200. Samma listor skrivs i bestskapare.js och bestar.mjs, och några flaggor används inte**  
Var: `bildstil/bestskapare.js:72, 75, 493, 511, 521, 1017; bildstil/api/bestar.mjs:65-67, 202, 204`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 4 rader bort.  
I dag: bestar.mjs har egna kopior av listorna över fästpunkter (FASTEN) och material (MATERIAL). Samma listor finns i bestskapare.js, som lämnar ut dem till sidan, men ingen hämtar dem därifrån: bestar.mjs läser bara bild, prov och LAGER. Även val, visa och ritaBest lämnas ut utan att någon läser dem. Flaggan ny: true står på Lindormen och Snäckbesten, men ingen kod läser den.  
Förslag: Låt bestar.mjs hämta FASTEN och MATERIAL från sidan när den öppnats, i stället för egna kopior. Ta bort ny: true och det som lämnas ut utan att läsas (val, visa, ritaBest). Tänk på att bestar.mjs kör i Node och måste ha öppnat sidan innan listorna finns; kontrollen av data körs redan efter att sidan öppnats för prov.  
Ändras i spelet: Ingen märkbar skillnad. En lista att ändra när ett nytt material eller en ny fästpunkt kommer, i stället för två som kan glida isär.  
Prövningen: Kopiorna finns och följer inte principen om ett ställe per sak; ett nytt material som läggs till på bara ett ställe ger fel i API-ritningen. Vinsten i rader är liten, och hämtningen från sidan kräver lite omsorg om ordningen.

**201. Lärdomarnas slag har sina tal utspridda i långa villkor i stället för i registret**  
Var: `src/sim/minne.ts:122-135 (LardomDef, UPPDRAGKROK, LDEF), 167, 195, 384, 420, 451; src/sim/skrift.ts:328-329, 509`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 4 rader bort.  
I dag: Registret LARDOMAR har en rad per slag. Men vad slaget väger när minnet är fullt (rad 195), hur gärna det berättas (384), hur mycket det överdrivs och dess högsta värde (420, och en gång till i skrift.ts:509), hur fort det glöms (451) och att det saknar områdesvärde (167) står som kedjor av "är det fara, annars pris, annars …" på varje ställe. Ett nytt slag kräver ändringar på sex ställen, och uppdragen har en egen krok (UPPDRAGKROK.tal) för tre av talen.  
Förslag: Lägg kolumner på raden i LardomDef (vikten när minnet är fullt, lusten att berätta, glömskan, högsta värdet, överdriften) som funktioner som läser balanstalen, och låt trim, share, tell, forget och skrivKlar fråga raden. Uppdragens tal sätts då på raden.  
Ändras i spelet: Ingen märkbar skillnad, om uttrycken flyttas oförändrade.  
Prövningen: Stämmer, och designdokumentet säger själv att "varje slag av lärdom har sina tal på sin rad i LARDOMAR" (fliken Människan, Minne). Koden blir knappt kortare, men ett nytt slag blir en rad i stället för sex ändringar.

**202. Stationernas brist är en kedja av villkor i stället för en rad i registret**  
Var: `src/sim/forradsmal.ts:284-309 (harBrist, langhusBrist, stationBrist); registret STATIONER i src/sim/stationer.ts`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 4 rader bort.  
I dag: stationBrist frågar i tur och ordning efter d.tro, d.hard, d.langhus, d.utkant.drag, d.hage, d.fahus, d.pynt, d.brasa, d.sover, d.platser, d.forvar och om d.gor innehåller 'toa' eller 'torka', och väljer en bristfunktion ur andra filer. En ny sorts station betyder ett nytt villkor här, och ordningen i kedjan avgör tyst vilken som gäller.  
Förslag: Ett fält brist på stationens rad i STATIONER med namnet på ett bristslag, och ett litet register i forradsmal.ts från namnet till funktionen (så att filerna inte importerar varandra i ring). stationBrist blir: halvbyggd ger 1, annars radens brist, annars 'en färdig räcker'. Varje rad får det bristslag som kedjan ger i dag; rader med flera av flaggorna kontrolleras en för en.  
Ändras i spelet: Ingen skillnad, om varje station får samma bristslag som kedjan väljer i dag.  
Prövningen: Stämmer, och följer principen om register och ett ställe per sak. Få rader sparas, men nästa nya station blir en rad i stället för ett villkor mitt i en kedja.

**203. Måltidens tankar är hårdkodade per maträtt**  
Var: `src/sim/behov.ts:129-144`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 4 rader bort.  
I dag: maltidTanke räknar måltidens nivå (basta) tre gånger och har egna villkor för stek, för jordgubbar (ROK.glad gånger 3) och för allt vars namn börjar på 'rok'. Att känna igen rökt mat på namnet är skört: en ny sak som heter något på 'rok' får tanken utan att någon bestämt det.  
Förslag: Räkna nivån en gång. Ge maten i SAKER (eller rättens kategori) ett fält för tanken och hur glad den gör, som pekar på balanstalen som redan finns (STEK.glad, ROK.glad), och låt maltidTanke läsa fältet i stället för namnet.  
Ändras i spelet: Nej, om fälten får samma värden och tankarna läggs i samma ordning.  
Prövningen: Stämmer med koden och bryter mot principen att sådant står som rader i ett register. Vinsten är liten i rader men tar bort gissningen på namnet.

**204. Fiskarna som rensas står i en egen lista bredvid registret**  
Var: `src/sim/val.ts:803, 1312-1313; src/sim/redskap.ts:120-124`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: RENSAS räknar upp abborre, gädda, mört, braxen och sik för hand, fast varje art i DJUR redan säger att den rensas. Viltet på raden ovanför frågar registret. En ny fisk måste läggas till på två ställen, annars rensas den aldrig. Raden rensa frågar dessutom efter arten två gånger.  
Förslag: Låt RENSAS vara de arter i registret som rensas, och fråga en gång på raden.  
Ändras i spelet: Nästan ingen. Ordningen blir registrets (braxen och sik före mört i stället för efter), så i en by med flera sorters fisk samtidigt kan en annan sort rensas först.  
Prövningen: Det stämmer: samma fem arter står på två ställen, och principen är att koden frågar registret. Ordningen ändras lite, så facit får sparas om.

**205. Hjälpare för uppgiftsliteralen**  
Var: `src/test/scenarier/kultur.ts (33 ställen, t.ex. 35, 199, 309, 1609, 1643, 2208, 3666); samma mönster i agande.ts (47), fas11.ts (14), natur.ts (14), fas9.ts (13) med flera; src/test/scenarier/hjalp.ts`. Vinst 2 av 5, risk 2 av 5, ett steg.  
I dag: `{ act: 'X', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '' } as SIM.Task` skrivs för hand 33 gånger i filen och ungefär 145 gånger i alla scenariofiler. hjalp.ts har ingen hjälpare för det.  
Förslag: En hjälpare i hjalp.ts, t.ex. `uppg(s, p, act, mer?)`, som ger uppgiften på platsen där personen står; det som skiljer (fas, tid, ref, börda) skickas med i `mer`.  
Ändras i spelet: Nej.  
Prövningen: Stämmer. Varje ställe är redan en rad, så filen blir inte kortare i rader, men raderna blir mycket kortare och lättare att läsa. Risken är liten om hjälparen ger exakt samma fält; de ställen som har andra värden (until, carry, phase) måste få dem med.

**206. Samma knapp- och fyllfunktion skrivs om i fyra block i fas11.js**  
Var: `bildstil/fas11.js:558, 565-569, 668-673, 728-733, 791-796, 607, 1085`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 14 rader bort.  
I dag: Fyra block har var sin kopia av fyll() och KNAPP() (rutan på 24 × 24 punkter i panelens färg med ram). Kopiorna är lika tecken för tecken. Två block till fyller gräs på samma sätt. Färgtabellen L är däremot inte lika mellan blocken: varje block har sina egna tecken, så den måste stå kvar per block.  
Förslag: Lägg fyll() och KNAPP() på ett ställe (i sida.js bredvid ritaSprite) och låt KNAPP ta färgtabellen som ett argument. Blocken behåller bara sin egen färgtabell och sina ritningar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Kopiorna är exakt lika och går att slå ihop utan risk, men vinsten är liten: korten i valdelen är tillfälliga och tas bort när Björn valt. Färgtabellerna skiljer sig, så läsarens 22 rader blir snarare 14.

**207. Samma lilla ritning av en pixelbild finns på sju ställen**  
Var: `src/ikoner.ts:4736-4742 (iconCanvas); src/ui/runstenar.ts:13-21; src/ui/raden.ts:69-74; src/ui/ram.ts:8-16; src/ui/varldskarta.ts:37-40, 78-81 och 88-91`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Att rita rader och palett punkt för punkt på en canvas skrivs om i varje fil som har egna bilder: ikonerna, runstenarna och banden, vågbandet, hörnen och världskartans tecken på tre ställen. Raderna i ui/vaxter.ts ritar direkt på kartan och är inte samma sak.  
Förslag: En hjälpare (rader och palett till en canvas, med spegling som val), i ui/pixel.ts eller ikoner.ts, som de sju ställena använder. Varje fil behåller sitt eget minne av färdiga bilder.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: samma tre rader står sju gånger, och ui/pixel.ts finns redan just för sådana hjälpare. Vinsten är liten men risken också.

**208. Bränderna: 'torka marken' och felraden efter torrAng skrivs om i varje scenario**  
Var: `src/test/scenarier/grund.ts:1531-1553 (torrAng); anropen 1567, 1614, 1656, 1671, 1703, 1732, 1767, 1916, 1954; torr mark 1590, 1624, 1660, 1684, 1745, 1778, 1809`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Nio brandscenarier anropar torrAng(), som letar en by med torrt sommarväder och en äng. Raden som gör marken helt torr står sju gånger, och raden som gör ett fel av torrAngs svar nio gånger. Läsaren ville också spara torrAngs svar så att sökningen görs en gång. Det ger nästan ingenting: det stora testet kör de långa scenarierna i var sin process och de korta sex och sex, så svaret kan sällan delas. Dessutom ändrar brandsmitta och brinner byn de får direkt, utan kopia, så ett sparat svar skulle bli fel för nästa scenario.  
Förslag: Bara det lilla: en hjälpare torka(x) för den torra marken, och låt torrAng kasta ett fel eller svara med färdiga kontroller, så att de två raderna i början av varje scenario blir en. Spara inte svaret i en variabel för hela modulen.  
Ändras i spelet: Ingen skillnad i spelet, och ingen märkbar skillnad i testernas datortid.  
Prövningen: Upprepningen stämmer och går att ta bort utan risk, men den stora vinsten (en sökning i stället för nio) faller på att scenarierna körs i skilda processer. Kvar blir en liten städning.

**209. Tio rövarscenarier startar var och en samma uppställning**  
Var: `src/test/scenarier/folk.ts:2608-2610, 2633-2635, 2662-2664, 2685-2687, 2713-2715, 2734-2737, 2763-2765, 2790-2792, 2889-2891, 2930-2932; src/test/scenarier/hjalp.ts:265 (rovarGang finns redan)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Varje scenario skapar by 4 och stegar den en timme (tolv steg om fem minuter; anfallet tar 24) innan gänget skickas. Sedan skiljer de sig: några använder skickaRovare, några rovarnaKommer, ett rovarGang, med tre eller fyra rövare. Mätningarna av rörelse är olika i varje scenario (avstånd från start, medelavstånd inbördes, gått mer än 0,2 rutor).  
Förslag: En liten `rovarBy()` i hjalp.ts som ger byn efter den första timmen. Gänget skickas som idag i varje scenario. Ingen gemensam `gangRorelse`: mätningarna är för olika.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Upprepningen finns, men bara de två första raderna är verkligen lika. Vinsten är liten och risken nästan ingen, så bara den lilla hjälparen är värd att göra.

**210. Väderfälten och personens drag byggs på flera ställen**  
Var: `src/sim/berattelser.ts:2575-2576 (kronikaBer), 2588-2589 (loggBer); 2505-2510 mot 2533-2537 (eftermale och beskrivning); 2136 (egen hen) och 2188, 2265, 2512, 2538, 2595, 2597, 2818 (honom/hans för hand); src/sim/ord.ts:107-109; src/sim/liv.ts:133`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Årstid, kallt, snö, regn och natt räknas fram likadant i kronikaBer och loggBer; loggBer har inte blåsten. Förberedelsen av dragen (det som syns framför åldern, det bra först, och/men) står två gånger nästan ordagrant, i beskrivningen och i eftermälet. Filen har en egen hen() och skriver honom/henne och hans/hennes för hand på sju ställen, fast ordlagret redan har han, honom och hans.  
Förslag: En hjälpare för väderfälten som kronikaBer och loggBer delar, en för dragen som beskrivningen och eftermälet delar, och ordlagrets han/honom/hans överallt. Samtalets text och mästerverkens minne passar inte i samma hjälpare (de tar natten från en annan tid och sparar på ett annat sätt) och lämnas.  
Ändras i spelet: Ingen skillnad: ingen loggmall väljer på blåsten i dag, och orden blir desamma.  
Prövningen: Upprepningarna finns där läsaren säger, utom att bara två av de fyra väderställena är lika. Det är ren städning som inte kan ändra någon text, men vinsten är liten.

**211. Samma slinga letar två gånger efter en by som kan skicka en handlare**  
Var: `src/test/scenarier/fas11.ts:2472-2482,2518-2529`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 9 rader bort.  
I dag: Två scenarier går igenom byarna, ger varje by folk och tre gånger det den vill ha, låter den möta huvudbyn och tar den första som har en affär att göra. Den andra kopian har två rader till (mat och silver).  
Förslag: En funktion forstaByMedAffar(s, medMatOchSilver?) överst i filen eller i hjalp.ts, som båda använder. Kan byggas på hjälparen i fyndet ovan.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: De två slingorna är lika sånär som på två rader. Bara testkod ändras.

**212. Små dubbletter och rester i API-skripten och anim.js**  
Var: `bildstil/api/bestar.mjs:242-243 (hard och pryd lika) och 291 (usage sparas men läses aldrig); bilder.mjs:102, 322, 325 (samma text som TOMT_NEJ skriven två gånger till); rita.mjs:221 (usage), 236-245 (allaRitade och 'void forebild') och 298 (samma text igen); bildstil/anim.js:252 (raden med vindstrecken i tornadon)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: I bestar.mjs gör fallen hard och pryd exakt samma sak. Texten om att Björn sa nej utan att skriva varför finns som konstanten TOMT_NEJ och dessutom utskriven på tre ställen; ändras den på ett ställe slutar jämförelsen mot TOMT_NEJ att fungera. delarSomSkaRitas har en parameter allaRitade som aldrig är sann, och 'void forebild' för att tysta ett värde som inte används. usage läggs i svaren från batchen men läses aldrig. I tornadons vindstreck väljs samma ton för ljust och mörkt, så villkoret gör ingenting.  
Förslag: Slå ihop hard och pryd. Använd TOMT_NEJ på alla ställen i bilder.mjs (och dela den med rita.mjs om gemensamt.mjs görs). Ta bort allaRitade, 'void forebild' och usage. Förenkla raden i anim.js till en ton, och se att src/animbilder.ts blir exakt som förut.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Allt stämmer i koden. Raderna är få, men den utskrivna nej-texten är en fälla som är värd att ta bort, och resten kostar nästan inget.

**213. Hjälpare för att gifta två och för skriftscenariernas början**  
Var: `src/test/scenarier/kultur.ts:1700-1702, 1729-1731, 3450-3452, 1832, 1872-1873, 1908-1909`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Tre scenarier löser två personer från sina par med två långa rader och parar sedan ihop dem. De tre skriftscenarierna nollställer sorg, bedrift, intryck och lärdomar med samma rad, och två av dem väntar på dagsljus med samma slinga.  
Förslag: Två hjälpare: `gift(s, a, b)` (löser paren och parar ihop) och `skriftBy(s, v)` (nollställer och väntar på dagsljus där det behövs).  
Ändras i spelet: Nej.  
Prövningen: Raderna är ordagrant lika och hjälparna ändrar inget i byarna. Det första skriftscenariot väntar inte på dagsljus, så den delen får inte läggas på där.

**214. 'Byn har det den vill ha av varje varugrupp' ställs in på fem ställen**  
Var: `src/test/scenarier/fas11.ts:2424-2427,2476,2522-2523,2724-2726,2794`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Fem ställen går igenom varugrupperna och ger byn precis det den vill ha (eller tre gånger så mycket), sätter maten på samma sätt och räknar om rikedomen. Sedan läggs ett eget överskott till, oftast virke. Slingan är densamma; talen efteråt skiljer sig.  
Förslag: En hjälpare fyllEfterVilja(rad, gånger = 1) i hjalp.ts som fyller alla grupper och maten och räknar om rikedomen. Det egna överskottet står kvar i varje scenario.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Slingan står på de fem ställena, men det är inte silver, mat och virke som läsaren skrev utan 'det byn vill ha av varje grupp'. Vinsten är liten och risken nästan ingen.

**215. Fyra handskrivna "upptäckter" med samma mönster**  
Var: `src/sim/odling.ts:229-234; src/sim/brygg.ts:91-96,124-129; src/sim/rester.ts:89-95`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Kornet, ölet, mjödet och komposten upptäcks på samma sätt: ingen kan tekniken än, alla som kan en viss annan teknik lär sig den, och en rad skrivs första gången. Villkoret som utlöser det är olika i alla fyra (korn i förrådet, antal satser vin, honung, en slump i timmen vid sophögen).  
Förslag: En gemensam funktion som får tekniken, vad man måste kunna och texten. Villkoret står kvar på varje ställe. Ingen ny kolumn i teknikregistret behövs.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Mönstret stämmer och går att samla utan att spelet ändras, men vinsten är liten eftersom villkoren och texterna är olika.

**216. Små dubbletter i byggarna för den väckta byn**  
Var: `src/sim/vackt.ts:93-99 och src/sim/vacktplats.ts:26-27; src/sim/vackt.ts:256, 271, 296, 372; src/sim/vacktfalt.ts:105-110 och src/sim/vacktsomna.ts:88-92; src/sim/vacktliv.ts:24 och 45`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Den tomma kartan (marksorten ur världsrutan, kalendern, tomBy) skapas med nästan samma långa rad för byn och för platsens lilla karta. 'Någon i byn kan timmerväggen' står fyra gånger, varav en i sovsalar som bara anropas efter att byggHem redan frågat. En hage med staketet runt om läggs med samma rader i fälten och i minnesbilden. radNamn och radNamnV gör samma sak med olika ingång.  
Förslag: En hjälpare var: kanTimra(b), nyHage(b, ruta), ett radNamn och en gemensam del för den tomma kartan.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer på de ställen som nämns. Vinsten är liten men risken också, och inget i spelet ändras.

**217. Små dubbletter i förråd, ägande och mål**  
Var: `src/sim/forradsmal.ts:94 (sparas = eldReserv), 181-184 och 199-202 (materialTak och overOchUnder räknar samma tak), 208 och 222 (vuxna räknas på två sätt), 282-283 (taltVill = behovVill); src/sim/lager.ts:570-571 (nas och iRackvidd), 658 (svavar: första villkoret följer av det andra); src/sim/agande.ts:74 och 79 (take sorterar som ledigtTing); src/sim/varde.ts:104 (halv räknas som varuVarde)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Ett knappt tiotal ställen där samma sak står två gånger: ett rent alias, två funktioner med samma kropp, samma sortering på två rader, samma tak räknat på två ställen.  
Förslag: Behåll en av varje: eldReserv eller sparas, taltVill via behovVill(s.taltBehov, s.now), vapenVill via vuxna(), iRackvidd i stället för nas, take() via ledigtTing, materialTak och overOchUnder via en gemensam takräkning, tingVarde via varuVarde, och det överflödiga villkoret i svavar bort. Tre saker i läsarens lista lämnas: grenen i shareOf (rad 388) nås vid avrundningsrester och är inte död; de två testlyssnarna lyssnar olika (den ena bara medan spelet räknar ett slag); condOf används på fem ställen i gränssnittet och gör ingen skada.  
Ändras i spelet: Ingen skillnad.  
Prövningen: De flesta punkterna stämmer och är ofarliga att slå ihop. Tre togs bort ur listan efter kontroll, eftersom de inte var döda eller dubbla.

**218. Projektens fabriker upprepar samma kostnad och vikt fem gånger**  
Var: `src/sim/projekt.ts:144-223, 373, 399-400, 435`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Fabrikerna för station, tillbehör, dörr, fälla och tillverkning skriver samma rad för kostnaden och samma uppslag av vikten. bastaProjekt upprepar formeln i personVarde. projekt() och projektVarde används bara av testerna (scenariot projekt och ett scenario för lagret).  
Förslag: Två små hjälpare, en för vikten och en för kostnaden, och låt bastaProjekt använda samma formel som personVarde. Testfunktionerna får stå kvar: de är två rader och beskriver värdet.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Hjälparna är riskfria. En gemensam fabrik för station, tillbehör och dörr ger lite mer men är inte värd besväret, och raderna som sparas är färre än läsaren räknade.

**219. Små dubbleringar och döda argument i testverktygen**  
Var: `src/test/takt.ts:1-3,9-11,21; src/test/jamfor.ts:99; src/test/balans.ts:22; src/test/hus.ts:50 (och hus-en.ts:9); src/test/samma.ts:23; src/test/pool.ts:24,40`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: takt tar emot ordet live eller snabb som inte betyder något sedan v29, och skriver en rad om 'det gamla talet'. jamfor.ts läser sparfilen för hand i stället för med lasByCache. balans.ts läser sparfilen en gång till efter körningen för att räkna hur många byar som fanns sparade. hus.ts skriver gränsen 10 som ett fast tal i texten, medan hus-en.ts har den som RUTT: ändras den ena blir texten fel. HANGT_MIN och LANGT_JOBB_S exporteras utan att något utanför pool.ts använder dem.  
Förslag: Ta bort live|snabb ur takt (och meningen i CLAUDE.md). Använd lasByCache i jamfor. Räkna antalet sparade byar före körningen i balans. Låt hus.ts hämta RUTT ur ett gemensamt ställe. Ta bort de onödiga exporterna. Låt likhet.sh och de två körfunktionerna i slaglangd.ts vara: den ena väntar och den andra inte, och skälet till likhet.sh är inte känt.  
Ändras i spelet: Ingen skillnad i spelet.  
Prövningen: Småsakerna stämmer och är ofarliga att städa, och gränsen i hus.ts kan annars bli fel i tysthet. Två delar av förslaget faller: likhet.sh (okänt skäl, två rader) och slaglangd (de två funktionerna gör olika saker och används båda).

**220. Småsaker i palett.ts: dubblett av hashen och rastret skrivet två gånger**  
Var: `src/palett.ts:93-97 (kornHash, samma räkning som platsHash i src/ui/pixel.ts:7-11); 78 och 83 (rastrets tröskel skriven två gånger); 64-70 (djupnattens spärr); ARKITEKTUR.md:230 nämner franGammal som inte finns`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: kornHash är tecken för tecken samma funktion som platsHash i ui/pixel.ts. rasterSteg upprepar uttrycket i rasterPa. ARKITEKTUR.md nämner en funktion som inte finns längre. Färgtalet räknas om för hand i några ui-filer fast fargTal finns. Djupnattens spärr "aldrig mörkare än förut" är däremot ett val från steg 9.2.12, inte en rest. iPaletten används av testerna och ska vara kvar.  
Förslag: En hash på ett ställe (pixel.ts hämtar redan ur palett.ts, så den får bo i palett.ts och pixel.ts lämnar den vidare), rasterSteg anropar rasterPa, och raden i ARKITEKTUR.md rättas. Rör inte djupnattens spärr.  
Ändras i spelet: Ingen skillnad, så länge djupnatten lämnas som den är.  
Prövningen: Dubbletten, den upprepade tröskeln och den felaktiga raden i ARKITEKTUR.md stämmer och är ofarliga att rätta. Delen om djupnatten faller: spärren valdes i steg 9.2.12 och utan den ändras nattens färger.

**221. Förrådets lägg till, ta ur och överskott finns i två filer**  
Var: `src/sim/byhandling.ts:219, 308-309, 383-387; src/sim/utpost.ts:62-66, 142`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: utpost.ts har egna kopior av att lägga något i en bys förråd, av överskottet och av uppslaget av varugruppen. byhandling.ts har samma saker, och uppslaget av varugruppen står där inskrivet för hand på rad 219.  
Förslag: Behåll en uppsättning på ett ställe och använd den i båda filerna.  
Ändras i spelet: Nej.  
Prövningen: Stämmer. Kopiorna ger samma resultat för allt som läggs till; det enda som skiljer är att den ena aldrig låter förrådet gå under noll.

**222. Namnbyggarna gen och hopsättningen finns i tre filer**  
Var: `src/sim/bynamn.ts:128, 134-138; src/sim/varldnamn.ts:38-42; src/sim/special.ts:25`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Genitivformen av ett namn (gen) står i tre filer. special.ts räknar också x och z som slutbokstäver, de andra bara s. Hopsättningen av förled och efterled står i både bynamn.ts och varldnamn.ts och gör samma sak.  
Förslag: En gen och en hopsättning på ett ställe (varldnamn.ts eller en liten namnfil) som de andra importerar. Välj regeln med s, x och z för alla.  
Ändras i spelet: Ingen märkbar skillnad. Ett namn som slutar på x eller z får rätt genitiv i nya namn; namn som redan är satta ändras inte.  
Prövningen: Tre kopior av samma regel, varav en avviker, är just det som 'ett ställe per sak' ska hindra. Liten ändring.

**223. Husets ritning (väggar, dörr, golv) byggs på två ställen**  
Var: `src/sim/byggplan.ts:275-279, 551-555, 695`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: nyttHus och skadatVal har samma slinga som lägger väggar längs kanten, en dörr och golv innanför. omkringA gör en liknande runda. I skadatVal räknas dessutom väggens material om för varje ruta.  
Förslag: En funktion husRitning(x, y, w, h, dorr, vagg, golv) som alla tre använder, med väggens material räknat en gång.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer, och funktionen räknar bara ut en lista utan att röra byn, så risken är liten.

**224. Facklor, uppsatta facklor och talgljus brinner ner med tre kopior av samma kod**  
Var: `src/sim/ljus.ts:101-107, 146-166, 252-262`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: brinn, brinnUppsatt och ljusTimme gör samma räkning (dra av tiden sedan sist, ta bort när det är slut), och uppsattaTimme och ljusTimme har samma mönster "någon vaken är nära: tänd, annars släck". De tre ligger i olika listor och räknas under olika namn i statistiken. Den gemensamma tand() räknar också tända talgljus som uppsattaTanda; talet läses inte någonstans.  
Förslag: En funktion för att brinna ner (saken, hur många timmar den brinner, och vad som görs när den är slut) och en för tänd eller släck efter behov, som de tre sorterna använder.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer, men kopiorna är korta och skiljer sig i var saken ligger och vad som räknas, så vinsten är mindre än läsaren säger (ungefär 6 rader, inte 12). Ofarligt att göra.

**225. Små dubbletter kring eldarna**  
Var: `src/sim/eld.ts:157-168, 283, 385; src/sim/ljus.ts:99, 123, 182, 210; src/sim/brasor.ts:53; src/sim/eldflytt.ts:105, 110-111; src/sim/brand.ts:401`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: heatAt och varmasteHard går igenom eldarna med samma räkning. ljus.ts rad 123 skriver om nagonEld. Väggen intill en ruta söks med samma fyra riktningar på två ställen i ljus.ts. stenPaMarken i brasor.ts är bara ett annat namn på paMarken. brand.ts letar eldstaden själv på rad 401 fast den använder hearthOf på raden under. awake tar en ålder som alltid är densamma (ett enda anrop). De två facklaHos är däremot inte lika: den i eld.ts räknar alla ting (också gästers), den i ljus.ts bara byns facklor. Och awake i eld.ts och villkoret i eldflytt.ts skiljer sig med flit (ålder, sjuk eller sängliggande, den som gömmer sig).  
Förslag: Gör de ofarliga: använd nagonEld, paMarken och hearthOf, en funktion för väggen intill, och ta bort åldern ur awake. Slå inte ihop de två facklaHos eller reglerna för vem som orkar utan att först bestämma vilken som ska gälla.  
Ändras i spelet: Ingen skillnad med det begränsade förslaget.  
Prövningen: De små dubbletterna finns och är ofarliga att ta bort. Två av läsarens punkter (facklaHos, och samma regel för eldflytt och eldskötsel) är inte rena dubbletter och skulle ändra spelet lite, så de lämnas.

**226. Regn och snö ritas med två nästan lika kodstycken, och samma slumpformel finns i flera filer**  
Var: `src/ui/vaderbild.ts:56, 105-133; src/ui/trad.ts:79; src/ui/vaxter.ts:45; src/ui/pixel.ts:20 (sinHash)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Funktionen plats i vaxter.ts är exakt samma formel som sinHash, som redan finns i pixel.ts. fast i vaderbild.ts och hs i trad.ts delar en annan sinusformel. Grenarna för snö och regn i drawVader räknar punkterna på samma sätt med olika tal. (Läsarens uppgift om kantHash i terrang.ts stämmer inte: den har en egen formel, och ett byte skulle flytta ungträden i skogskanten.)  
Förslag: Byt plats i vaxter.ts mot sinHash från pixel.ts. Lägg sinusformeln med 127,1 och 311,7 i pixel.ts för vaderbild.ts och trad.ts, med samma tal så att de godkända björkarna inte ändras. En liten funktion som ger regnets och snöns punkter. Rör inte kantHash.  
Ändras i spelet: Ingen skillnad om formlerna behålls som de är.  
Prövningen: Håller i en mindre form än läsaren skrev: två av de tre kopiorna går att ta bort utan att bilden ändras, och pixel.ts är redan platsen för sådana hjälpare. Vinsten är liten men risken nästan ingen.

**227. Sökningen efter en fri plats står två gånger i stationsdelar.ts**  
Var: `src/test/scenarier/stationsdelar.ts:15-18 och 57-60; liknande i samlande.ts:49-52 (tomPlats) och redskap.ts:81`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: I stationsdelar.ts är funktionen 'fri' och loopen som går i ringar runt byns mitt kopierade rad för rad. Samlande.ts och redskap.ts har samma idé men med 16 steg per varv i stället för 24, annan avrundning och andra villkor.  
Förslag: Gör en liten hjälpare i stationsdelar.ts för de två lika kopiorna. Rör inte samlande.ts och redskap.ts: en gemensam hjälpare skulle kunna välja en annan ruta och ändra vad de testerna mäter.  
Ändras i spelet: Nej.  
Prövningen: Två av de fyra ställena är exakt lika och kan slås ihop utan risk. De andra två skiljer sig i detaljer som avgör vilken ruta som hittas, så vinsten är mindre än läsaren räknade med.

**228. Platssökning i ring runt byns mitt skrivs om i tre scenarier**  
Var: `src/test/scenarier/byggnader.ts:2377-2382, 2421-2424, 2455`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: mitten, mittenlager och mittenstation går runt byns mitt i ring med samma räkning (32 punkter per varv, cos och sin) och tar första platsen som duger. De fyra andra ställena som fyndet nämnde (scenflytt, stockihus, skogsrojning, staende, rad 513) söker på helt olika sätt: närmaste platsen, kvadrater, fasta lägen eller en rad. De går inte att slå ihop utan att bli krångligare.  
Förslag: En liten hjälpare iRing(mitt, rMin, rMax, duger) för de tre ringsökningarna. Lämna de andra.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Håller bara för de tre ringsökningarna, som är lika rad för rad. Vinsten är liten. En gemensam hjälpare för alla sju vore större än det den ersätter.

**229. Samma gömställe skrivs tre gånger**  
Var: `src/sim/varg.ts:303-307 och 315-317; src/sim/rovare.ts:439-441`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: 'Sover hen i ett hus: sov vidare; annars gömma sig i närmaste hus, och utan hus vid elden nära de vuxna' står två gånger i vargSkydd och en tredje gång i rovarSkydd, med samma texter.  
Förslag: En funktion gomSig(s, p, vad, dur) i varg.ts som alla tre använder. rovare.ts importerar redan husPlats, iHus och skyddVidElden därifrån.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: de tre ställena ger samma svar med samma texter. En gemensam funktion är enkel och ändrar inget i spelet.

**230. Väderstrecken och vinkelformeln står i tre filer**  
Var: `src/sim/karta.ts:45-46; src/sim/grannbyar.ts:24, 29; src/sim/vader.ts:161-162; src/sim/tornado.ts:192`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: Listan med de åtta väderstrecken finns som STRECK i karta.ts, som RIKTNING i grannbyar.ts och en tredje gång som STRECK i vader.ts. Uträkningen av strecket ur en vinkel står på fyra ställen.  
Förslag: Exportera en funktion ur karta.ts som ger väderstrecket för en vinkel, och använd den i grannbyar.ts, vader.ts och tornado.ts.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer, och det finns en kopia till i vader.ts som läsaren inte såg. Enkel hopslagning utan risk.

**231. Små dubbletter i stationsfrågorna**  
Var: `src/sim/stationer.ts:523-534, 539-547, 555/591, 782/935, 1556-1560/1572-1576`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: Provet 'står en eld eller härd på rutan' står likadant i golvFri och siteMatta. flyttaStation och flyttaDel har samma villkor för en ruta. kanGoras och saknasVid gör samma uppslag. kvVid och fartVid ser lika ut men letar efter olika stationer (den som gör arbetet respektive den som gör det fortare), och lagerRuta är inskriven i friRunt för att lagerlistan ska hämtas en gång.  
Förslag: Två hjälpfunktioner: eldPa(s, x, y) och flyttRutaOk(s, x, y). Låt kvVid, fartVid och friRunt vara.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Två av dubbletterna är exakta och går att slå ihop utan risk. De andra är inte riktiga dubbletter och ska stå kvar, så vinsten är mindre än läsaren räknade med.

**232. Samma små hjälpare för färg finns på flera ställen**  
Var: `src/ui/natt.ts:73-74, 78, src/ui/skugga.ts:111-112, src/ui/pergament.ts:45, src/ui/varldbild.ts:60, src/palett.ts:75`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: rgb och platt är ordagrant lika i natt.ts och skugga.ts. pergament.ts och varldbild.ts har var sin likadan rgb (0-255). natt.ts skriver ut Bayer-tabellen för hand fast palett.ts har samma tal i BAYER. Slingorna i de två skuggprogrammen som väljer närmaste palettfärg liknar varandra men väljer olika saker, och pergamentets brus räknas ur världens frö och är inte samma som brus i pixel.ts.  
Förslag: Lägg rgb (0-1 och 0-255) och platt i palett.ts och använd BAYER i natt.ts. Låt skuggprogrammens slingor och pergamentets brus vara.  
Ändras i spelet: Nej.  
Prövningen: Dubbletterna av rgb, platt och Bayer-tabellen stämmer och är ofarliga att slå ihop. Bruset och skuggprogrammen ska inte röras: där skiljer sig koden, och bilden skulle ändras.

**233. bygg.cjs upprepar samma mappläsning åtta gånger**  
Var: `bildstil/bygg.cjs:19-22, 26, 29, 31, 34`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Fyra rader läser en mapp med skript på samma sätt (fas7, fas8, fas9, svar) och fyra rader läser en mapp med json-filer till ett objekt (delar, bilder, bestar, forslag). Mapparna bestar och forslag har en vakt ifall mappen saknas, fast båda finns. Sorteringen är numerisk för fas7-9 och vanlig för svar; det måste vara kvar. Vakten för gamla.json på rad 28 behövs: filen är genererad och finns inte i läskopian.  
Förslag: Två små hjälpare överst: en för skriptmappar (med val av numerisk sortering) och en för json-mappar (med vilket fält som är nyckel). Ta bort vakten för mapparna bestar och forslag. Låt vakten för gamla.json stå kvar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer, och ändringen är ofarlig så länge sorteringen och vakten för gamla.json behålls. Vinsten är liten: filen har 38 rader, och raderna blir mest kortare, inte färre.

**234. En hjälpfunktion för att göra en bild till PNG (tre ställen i kontroll.js, ett i forslag.js)**  
Var: `bildstil/kontroll.js:335-336 (kortPng), 346-347 (rutorPng), 352-354 (iSpeletPng), bildstil/forslag.js:89-90 (png)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Samma två rader som förstorar en bild och gör den till PNG står på tre ställen i kontroll.js (inte fyra) och en gång i forslag.js. Ett av ställena är rutorPng, som försvinner med fyndet ovan. Kvar blir två i kontroll.js och ett i forslag.js.  
Förslag: En liten funktion png(bild, skala) i kontroll.js, utlämnad i KONTROLL, som kortPng, iSpeletPng och forslag.js använder. forslag.js läses före kontroll.js, men dess png körs först när API-skripten ber om den, och då finns KONTROLL (den använder redan KONTROLL.iSpelet på samma ställe).  
Ändras i spelet: Nej.  
Prövningen: Dubbletten finns, men den är mindre än läsaren räknat: ungefär fyra rader sparas, inte 25. Det är en ofarlig städning som passar ihop med fyndet om rutorPng.

**235. Fängelsehuset ställs i ordning med samma rader fyra gånger**  
Var: `src/test/scenarier/byggnader.ts:1043-1044, 1078-1079, 1122-1123, 1168-1169`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: fangelse, fangemat, fangeliv och fangvakt gör alla samma sak: en ny by med sex personer, klockan tio, ett hus, huset blir fängelse och får en trädörr.  
Förslag: En hjälpare fangelseBy() som ger tillbaka byn och huset.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: två nästan lika rader på fyra ställen. Vinsten är liten (fyra rader), men risken är ingen.

**236. Tornadons kärna har en egen kopia av hur ett träd faller**  
Var: `src/sim/tornado.ts:359-366 (fall), 453-459`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Funktionen fall() fäller ett träd i zonen nära och i utkanten. I kärnan står samma fem rader en gång till; enda skillnaden är att gräset under trädet sätts till högt gräs.  
Förslag: Använd fall() också i kärnan, och sätt marken på raden efter (se fyndet om gräset i kärnan).  
Ändras i spelet: Nej.  
Prövningen: Stämmer: raderna är lika och ordningen blir densamma. Görs lämpligen tillsammans med fyndet om gräset i kärnan.

**237. Straffen: dubbel uträkning och sidolistor**  
Var: `src/sim/styre.ts:432-436, 459, 475, 489-490, 537, 573-575, 609, 613`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: doma räknar ledarens hårdhet med samma formel som ledarHard. De fyra listorna STRAFF, STRAFF_DA, STRAFF_INF och STRAFF_NAMN plockas ur STRAFF_REG med var sin rad; de kan inte hamna i olag eftersom de räknas ur registret. Straffet utvisning liknar funktionen utvisa men har en annan text i notisen. st.ai sätts två gånger, men den andra behövs när styret skapas i samma anrop.  
Förslag: Låt doma och ledarHard dela en liten funktion för hårdheten, och låt koden fråga STRAFF_REG direkt i stället för sidolistorna. Låt utvisningen och de två raderna med st.ai vara.  
Ändras i spelet: Nej.  
Prövningen: Hårdheten och sidolistorna stämmer och är ofarliga att slå ihop. Två delar av fyndet stämmer inte: utvisningen har en egen notistext, och den andra st.ai är inte överflödig. Vinsten är liten.

**238. Samma slinga som räknar om sparade vägar står två gånger**  
Var: `src/sim/leder.ts:79-84, 93-97`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: raknaLeder och frysMark har samma rader: för varje sparad väg räknas den billigaste vägen om, packas och får ny kostnad och tid. Enda skillnaden är att raknaLeder hoppar över vägar som inte går genom en ändrad ruta.  
Förslag: En liten funktion som räknar om vägarna, med ett valfritt villkor för vilka som berörs. Båda anropar den.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Raderna är likadana och ligger i samma fil. Liten vinst, nästan ingen risk.

**239. Gästens saker släpps på marken med samma kod på två ställen, och gastAv räknas två gånger**  
Var: `src/sim/gast.ts:98-113, 145-149`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: gastTingBort och gastAvvapna har samma långa uttryck för att lägga ett ting på rutan (rad 100 och 109). gastGar slår upp samma gäst två gånger i rad.  
Förslag: En hjälpare som lägger gästens ting på rutan och som båda använder, och en variabel för gästen i gastGar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Raderna är likadana ord för ord. Liten vinst, ingen risk.

**240. Var något läggs avgörs på fyra ställen**  
Var: `src/sim/lager.ts:458 (placeOn), 521-526 (dropSpot), 607 (place), 1149 (storeTings), 1196-1217 (dropLoad)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Samma val står på fyra ställen: 'rutan där man står om den hör till förrådet och har plats, annars bästa plats i en lagerplats, annars bredvid'. place och storeTings har hela valet, placeOn och dropSpot de två sista leden. dropLoad har dessutom en egen sökning i ringar runt rutan där bördan släpps.  
Förslag: En funktion platsFor(s, k, occ, at) som place, storeTings, placeOn och dropSpot anropar. dropLoads egen ringsökning lämnas: den fyller flera rutor i tur och ordning runt en punkt utanför förrådet, och ett byte till ringTiles ändrar vilken grannruta som tas.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Valet står verkligen fyra gånger och går att samla utan att något ändras. Delen om dropLoad tas inte med, för den ändrar var saker hamnar på marken och kräver nytt facit för liten vinst.

**241. Samma nollställning av en byggbit skrivs fem gånger**  
Var: `src/sim/byggplan.ts:906, 915, 916, 918, 961`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: När en bit byter material skrivs samma rad på fem ställen: nytt material, bygget på noll, materialet på noll, skicket helt och märket förbättring. Två av ställena avviker lite: en öppning är klar direkt, och rad 961 sätter inget förbättringsmärke.  
Förslag: En liten funktion bytMaterial(b, m, forb) som sätter materialet, slaget ur MATERIAL och nollställer bygget; en öppning blir klar direkt.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer. Stenväggen har samma slag (vägg) som timmer i MATERIAL, så en gemensam funktion ger samma resultat överallt.

**242. Djurets ruta: samma radbyggare och jämförelser flera gånger**  
Var: `src/ui/flikar/djur.ts:30, 48, 60, 76-77, 91`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Hjälparen rd (en rad med text vid musen) står likadant i tamHtml och honsHtml. jfr ("mer än de flesta") och pr (procent) står både för de tama och de vilda djuren. Ordet för gruppen (flockartens namn, fåglar eller harar) räknas ut två gånger på samma rad.  
Förslag: Lyft rd, jfr och pr till filens topp och räkna gruppens ord en gång. Raden "Tamhet 0 %" för vilda djur lämnas kvar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Dubbletterna stämmer och är ofarliga att lyfta. Läsarens förslag att ta bort "Tamhet 0 %" för vilda djur tog jag bort: designdokumentet säger att djur har samma etiketter, tama som vilda, så raden är avsiktlig.

**243. Småsaker i main.ts**  
Var: `src/main.ts:6 (importerar ur ./sim/vackt fast sim.ts:196 redan lämnar den vidare), 156 och 193 (två lyssnare på kugghjulet), 209 och 243 (MAX_SLAG), 271, 274 och 278 (laddningsrutan göms tre gånger), 138-143 (testknapparna som en kedja av if)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Huvudfilen är i övrigt ren. Importen på rad 6 går förbi sim.ts, mot regeln i ARKITEKTUR.md (sex andra ui-filer gör samma sak). Kugghjulet har två lyssnare. Laddningsrutan göms på rad 278 fast en av raderna 271 och 274 alltid redan har gjort det. MAX_SLAG är en yttre spärr på 5 000 slag per bildruta som tidsgränsen på 40 ms nästan alltid hinner före.  
Förslag: Importera vackTestNarmast ur ./sim, slå ihop de två lyssnarna och ta bort den sista raden som gömmer laddningsrutan. MAX_SLAG kan stå kvar som säkerhet; den kostar ingenting. Testknapparna blir ett register först om fler läggs till.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Allt stämmer men är smått. Importen är värd att rätta eftersom den bryter en regel som står i ARKITEKTUR.md; resten är städning som kan göras i samma veva.

**244. Samma plats-funktion står i fem ritualer**  
Var: `src/sim/kult.ts:234-244`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Raderna för bröllop, dop och vuxenblivande i RITUALER har ordagrant samma 'plats' (trons heliga plats, annars elden). Högtiden och den ledda bönen har en annan gemensam (trons hus, annars den heliga platsen, annars elden).  
Förslag: Två namngivna funktioner som raderna pekar på.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer ordagrant. Det är en ren omskrivning utan risk.

**245. Beskrivningens delar räknar samma sak två gånger, och några fält används aldrig**  
Var: `src/sim/berattelser.ts:2350-2408 (BESK_DELAR), 2544 (f.gott), 2547 (f.mentor), 82 och 2819 (relIntryck), 2794 och 2810 (barn ihop)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Varje del i beskrivningen har en vikt och en text, och båda anropar samma hjälpfunktion, så det räknas två gånger när personrutan ritas. Fälten gott och mentor fylls i men ingen mall läser dem. Balanstalet relIntryck (3) står inom en gräns på högst 2 och kan därför bara sänka, aldrig höja. Barnen ihop räknas på två ställen i relationens text.  
Förslag: Stryk de två döda fälten och låt relIntryck vara det enda talet (sätt det till 2 och ta bort den fasta gränsen). Att bygga om alla delar så att de räknar en gång är mer ändring än det sparar och kan vänta.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Jag sökte efter läsare av gott och mentor och fann inga, och relIntryck står mycket riktigt inom Math.min(2, …). Den delen är säker städning. Dubbelräkningen sker bara när rutan ritas och kostar nästan inget, så ombyggnaden av delarna är inte värd det.

**246. Samma rad som drar döda ur en bys folk och styrka på fyra ställen**  
Var: `src/sim/byhandling.ts:507 (en egen liten funktion dra), 529; src/sim/vaktat.ts:109; src/sim/vagran.ts:149`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Regeln "folket minskar med de döda, och styrkan med lika många men aldrig över folket" är skriven för hand på fyra ställen i tre filer. På ett av dem (byhandling.ts:507) finns den redan som en liten funktion, men bara där.  
Förslag: En funktion radDoda(r, n) i rad.ts bredvid de andra reglerna för raden, som alla fyra anropar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: De fyra raderna är exakt lika, och regeln hör hemma på ett ställe. Vinsten är liten, men risken är ingen.

**247. riv och rivHus gör samma sak**  
Var: `src/sim/byggnader.ts:464-470; src/sim/bygg.ts:263-269`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Två funktioner river ett hus och lämnar tillbaka en del av träet, med nästan samma rader. Skillnaden: riv ger träet till byn och skriver i loggen och krönikan, rivHus ger det till husets ägare.  
Förslag: Låt riv anropa rivHus med ett val för vem som får träet, och behålla sin logg.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Det är en liten städning utan risk, så länge skillnaden i vem som får träet behålls.

**248. Teknikens ruta säger två gånger hur tekniken lärs**  
Var: `src/ui/flikar/teknik.ts:63, 75, 89, 91`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: larsText(t) står i fetstil överst i rutan ('Nivå 3: lärs genom att arbeta bredvid någon', steg 11.1.32). sprids(t) säger samma sak sist i rutan med andra ord ('Man lär sig det genom att arbeta bredvid någon som kan.', steg 4.2.3). Båda har nivå 3 inskriven för hand bredvid balanstalet TEKTAL.larNiva.  
Förslag: Behåll raden överst och ta bort meningen sist. Flytta 'en lärling i taget' till raden överst, så att inget försvinner.  
Ändras i spelet: Rutan om en teknik säger en gång, inte två, hur den lärs.  
Prövningen: Stämmer: båda skrivs ut i samma ruta. Bara text, ingen risk.

**249. krubba upprepar två rader ur medFahus**  
Var: `src/test/scenarier/fas9.ts:2304–2313 (medFahus), 2324–2332 (krubba), 2009 (slatter använder medFahus)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Scenariot krubba måste stanna mellan att fähuset byggs och att krubban ställs dit, så det skriver om två rader ur medFahus: slingan som bygger hus tills det finns ett fähus, och raden som ställer krubban (rad 2310 och 2332 är lika). medFahus är märkt export men används bara i samma fil.  
Förslag: Dela medFahus i två små funktioner i samma fil: en som bygger fähuset och en som ställer krubban. medFahus och krubba använder båda. Ta bort export.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer, och ändringen är ofarlig. Vinsten är liten: två rader, inte sju, och funktionerna kan ligga kvar i fas9.ts eftersom ingen annan fil använder dem.

**250. Svampen plockas på två vägar med samma kod för att känna igen giftsvampen**  
Var: `src/sim/fynd.ts:693-719; src/sim/steg.ts:1109, 1124`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: pickMushrooms (den äldre vägen, per tid) och svampPlock (på samlarrundan) har samma två rader som avgör om plockaren känner igen den giftiga svampen (704-705 och 715-716). Den äldre vägen anropas fortfarande från samlandet när inget plock pågår (steg.ts:1124).  
Förslag: Bryt ut de två raderna till en liten gemensam funktion ('känner igen giftsvampen'). Ta inte bort den äldre vägen: den anropas fortfarande.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Kopian är bara två rader, så vinsten är liten, men regeln för hur man känner igen giftsvampen ska stå på ett ställe. Att ta bort den äldre vägen går inte utan att veta att den aldrig körs, och det syns inte i koden.

**251. Plikten räknas med samma formel två gånger**  
Var: `src/sim/seder.ts:191-199`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: duty och pliktDelar skriver ut samma delar av plikten var för sig, också raden om arbetsplikten och samhällstjänsten. Ändras den ena måste den andra ändras likadant, annars visar personrutan fel.  
Förslag: duty blir summan av pliktDelar, hållen inom gränserna. duty frågas ofta, så mät med npm run kostnad att det inte blir dyrare; annars räcker en gemensam hjälpare för lagens del.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Summan av delarna i samma ordning ger samma tal, så byn räknar som förut.

**252. Samma filter två gånger i vattenhon, och gästens hemby slås upp på tre ställen**  
Var: `src/sim/vattenho.ts:33-38; src/sim/ort.ts:128, 138, 318`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: hoBrist räknar först hagarna med djur som inte når vattnet och anropar sedan utanHo, som räknar samma lista en gång till och lägger till "saknar ho". I ort.ts slås gästens hemby upp i gastHemOrt och gastensPlatser på samma sätt. rovareSedda gör nästan samma sak men bara med klanens by (inte byn gästen flyttat ifrån), så den är inte exakt lik.  
Förslag: En funktion ger hagarna som behöver en ho; utanHo filtrerar den och hoBrist delar längderna. gastensPlatser kan använda samma uppslag som gastHemOrt. rovareSedda lämnas eller får klanen som den är.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer för vattenhon och för två av de tre ställena i ort.ts. Vinsten är liten men ändringen är helt ofarlig.

**253. Radernas namn och värden i platsens ruta står i två listor**  
Var: `src/sim/ort.ts:333-339 och 351-353`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: bildRader bygger en post med åtta namn (finns kvar, invånare, mat, rikedom, styrka, ledare, tro, lyder under), och RUTARADER räknar upp samma åtta namn med sina rubriker. En ny rad måste läggas till på båda ställena.  
Förslag: Ett register med en rad per uppgift: rubriken och en funktion som ger värdet ur bilden. platsRuta går igenom registret för både "sant" och "tror".  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer, och ett register per sak är projektets egen princip. Vinsten är liten men risken obefintlig; raden "Finns kvar: Nej" för en by som gått under måste behållas som specialfall.

**254. Småsaker som räknas två gånger**  
Var: `src/sim/halsa.ts:415-416, 494, 514; src/sim/humor.ts:249-250, 269-272; src/sim/forlossning.ts:41-44`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: skada() anropar narOm två gånger i rad (det andra anropet gör inget, eftersom orden redan är utbytta). Blodets återhämtning står på två ställen i halsaSteg, en gång för den utan sår och en gång för den med sår som slutat blöda. utbrottRisk räknar humöret och utbrottChans räknar det en gång till. Förlossningens hjälpare sorteras med vårdkvaliteten uträknad i varje jämförelse. I rus.ts hittade jag ingen upprepning av villkoret ingetRus som spelar roll (kvallsDryck och supa frågar var sin gång, för olika saker).  
Förslag: Ta bort det dubbla narOm-anropet. Låt utbrottRisk skicka humöret till utbrottChans. Räkna hjälparnas vårdkvalitet en gång före sorteringen. Låt blodets återhämtning vara: de två ställena har olika villkor.  
Ändras i spelet: Nej.  
Prövningen: De tre första stämmer och är ofarliga att rätta. Vinsten är liten, så det görs bäst när filerna ändå öppnas för något annat fynd.

**255. Fältets hjälptext står ordagrant tre gånger**  
Var: `src/ui/flikar/falt.ts:21, 51, 64`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Hjälptexten om vad fältet gör står inskriven tre gånger i samma fil, tillsammans med samma ?-knapp. I de andra rutorna (elden, huset, sjön, stationen, lagret, högen) står knappen och texten en gång var, med olika innehåll runt omkring.  
Förslag: Lägg fältets knapp och text i en konstant eller liten funktion som de tre ställena använder. Resten lämnas.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Bara fältets del håller. En gemensam hjälpare för alla rutor sparar nästan inget, eftersom knappen och texten hamnar på olika ställen i varje ruta. Förrådet och Tro kan inte använda fallUt: de är utfällda från början och vänder på vad öppet betyder, och scenariot religion prövar just det.

**256. kor2 i sjukdom.ts är en kopia av kor**  
Var: `src/test/scenarier/sjukdom.ts:76,82,93 (kor2) mot hjalp.ts:45 (kor); projekt.ts:19-29 mot hjalp.ts:208-220 (valjer)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: kor2 kör 12 steg om 300 sekunder per timme, precis som kor. Enda skillnaden: kor2 anropar sin funktion en gång i timmen, kor efter varje steg. De två 'valjer' är däremot olika: den i projekt.ts låter en person i taget välja med behoven på 1 och räknar projekt med skälet 'Byn saknar'; den delade låter alla välja varv efter varv med 0,9 och lägger tillbaka redskapen emellan.  
Förslag: Ta bort kor2 och använd kor på de två ställena. Låt valjer i projekt.ts vara.  
Ändras i spelet: Nej.  
Prövningen: kor2 är en ren kopia och kan bort; kontrollen på rad 76 tål att köras efter varje steg. Att slå ihop de två valjer faller: de räknar olika, och gränsvärdena i scenariot projekt skulle behöva mätas om.

**257. medBankFas9 gör samma sak som medBank i hjalp.ts**  
Var: `src/test/scenarier/fas9.ts:184, 191; src/test/scenarier/hjalp.ts:52–60`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: fas9.ts har en egen funktion som ställer en slöjdbänk i byn. Den används på ett enda ställe (näverasken, rad 184). medBank i hjalp.ts gör samma sak och används redan för slöjdbänken i sex andra scenarier.  
Förslag: Ta bort medBankFas9 och anropa medBank(s, 'flatarbank') på rad 184.  
Ändras i spelet: Ingen skillnad. Scenariot läser bara hur fort och bra näverasken görs vid bänken.  
Prövningen: Stämmer. En liten skillnad: finns ingen plats för bänken bygger medBank ett hus först, medan den egna funktionen ställer bänken på en fast ruta. Det påverkar inte det scenariot mäter. En rad sparas, inte tre.

**258. 'Det mål som ligger längst bort och går att nå' står två gånger**  
Var: `src/test/scenarier/fas11.ts:2015,2121`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Samma långa rad väljer det resmål bland grannarna som ligger längst bort och har en väg dit. Den står ordagrant i två scenarier.  
Förslag: Lägg den som en hjälpare bredvid grannby-hjälparen i det första fyndet och gör det i samma steg.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Raderna är identiska. Vinsten är en rad, så det är bara värt att göra tillsammans med det första fyndet.

**259. Förkylningens chans står på två ställen, och två nästan lika chansfunktioner**  
Var: `src/sim/steg.ts:753; src/sim/gastvardag.ts:118; src/sim/tid.ts:21-23 (ARSTID.sjukIstid, sjuk); src/sim/slump.ts:83-85 (chance och chansPer); src/sim/varg.ts och src/sim/rus.ts:80 (de som använder chansPer)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Chansen att bli förkyld är utskriven en gång för byborna och en gång för gästerna, med samma uttryck. I slump.ts finns två chansfunktioner: en som tar en takt per sekund och en som tar en chans per period. De räknar olika och ger inte samma svar för samma tal.  
Förslag: En funktion för förkylningens takt i sjukdom.ts, som båda ställena anropar. Balanstalen bör stå kvar i ARSTID, där allt som årstiden ändrar är samlat; flyttas de byter de namn i balanslistan. De två chansfunktionerna lämnas som de är.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Uttrycket står två gånger, och en ändring på det ena stället glöms lätt på det andra. Bara den delen är värd att göra; att flytta talen och slå ihop chansfunktionerna ger ingenting.

**260. Rövarkämpens skicklighet är skriven krångligt, och anfallUtr räknas två gånger**  
Var: `src/sim/vagran.ts:118-123 (och 125-179)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: I rovarKampe står skickligheten som 5 + max(0, (mitt − 5) · 2) / 2, vilket är detsamma som max(5, mitt), och anfallUtr(L) räknas två gånger på samma rad. Händelserna för rån och rovdjur har samma tre val (betala, fly, slåss) men olika texter, olika byte och olika följder.  
Förslag: Skriv skickligheten som Math.max(5, mitt) och räkna anfallUtr en gång. Slå inte ihop rån och rovdjur: det som skiljer (texterna, bytet till lägret, rövarnas döda) är mer än det som är lika.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Den lilla förenklingen är säker och ger samma tal. Den gemensamma funktionen för mötet tas inte med; den skulle få lika många parametrar som rader den sparar.

**261. Glansen på mästerverk står på fyra ställen i samma funktion**  
Var: `src/ui/foremal.ts:78, 84, 89, 92`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Samma rad, 'if ((pl.q ?? 0) >= MASTERVERK) glans(…)', står i fyra grenar av drawPile. Den sista grenen (flera små symboler, rad 93) och det påbörjade (rad 72) har ingen glans.  
Förslag: En liten hjälpfunktion för glansen i drawPile som de fyra grenarna anropar. Rita den inte i de två grenarna som saknar den i dag.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Raderna blir kortare och lättare att läsa, men knappt färre. Glansen ska inte läggas till där den saknas i dag.

**262. Rikedomsgrafen räknar listan med saker tre gånger och väljer förvald sak på två ställen**  
Var: `src/ui/graf.ts:32, 39, 49`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Samma uttryck för den förvalda saken (ved om den finns, annars den första) står i två funktioner, rikSerier och rikTopp. rikSaker() går igenom hela rikedomens historia och räknas upp till fem gånger när grafen ritas.  
Förslag: En liten funktion för den förvalda saken som båda använder, och räkna listan en gång per ritning.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer, fast uttrycket står i två funktioner och inte i en. Liten och ofarlig ändring; grafen ritas bara när panelen ritas.

**263. En hjälpare för att sätta en ledare i en by som redan finns**  
Var: `src/test/scenarier/kultur.ts:108, 1009, 1039, 1070, 1161, 1294, 1329 (medLedare på 1352-1357)`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Samma långa rad `s.styre = { historia: [...], oppna: ['rang'], ledare: l.id, sedan: s.now, titel: 'Ålderman', satt: 1, pabud: ... }` står sju gånger utöver den i medLedare. medLedare går inte att anropa rakt av: den skapar en ny by och ger alla teknikerna ledarskap och lag, medan de sju ställena har en by som redan är uppställd (rikDag, testBy) och olika påbud.  
Förslag: Bryt ut raden till `satLedare(s, l, mer?)` som medLedare också använder, och anropa den på de sju ställena med det som skiljer (påbuden, lugn).  
Ändras i spelet: Nej.  
Prövningen: Upprepningen finns, men förslaget att anropa medLedare skulle byta by och ändra testerna; en liten hjälpare för bara styret är säker. Vinsten är kortare rader, inte färre.

**264. Blixttron skrivs för hand fem gånger**  
Var: `src/test/scenarier/kultur.ts:551, 631, 653, 907, 2389`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Samma tro (blixten, "Den som bor i åskmolnen") skrivs ut som en lång rad fem gånger; bara grundaren och ibland skalorna skiljer. medTro passar inte: den gör en annan, gammal tro, lägger till invånare och gör alla till ivriga troende.  
Förslag: En liten hjälpare `blixtTro(s, grundare, sk?)` som de fem ställena anropar. Använd inte medTro.  
Ändras i spelet: Nej.  
Prövningen: Upprepningen stämmer och en hjälpare är säker, men medTro skulle ändra byarna i testerna. Fem långa rader blir fem korta; antalet rader är detsamma.

**265. Hjälpare för 'alla tycker om alla'**  
Var: `src/test/scenarier/kultur.ts:317, 337, 487, 506, 668, 2115`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Slingan som sätter alla relationer till 100 står sex gånger i filen (inte sju), en gång med bara de vuxna.  
Förslag: En hjälpare `allaGillar(s, folk = s.people)`.  
Ändras i spelet: Nej.  
Prövningen: Stämmer och är ofarligt, men vinsten är liten: sex rader blir sex kortare rader. Görs lämpligen samtidigt med de andra hjälparna.

**266. Samma långa uttryck skrivs två gånger i en kontroll**  
Var: `src/test/scenarier/kultur.ts:2080, 1616`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: På rad 2080 räknas högtiderna vid fest och försakelse ut i en inbäddad funktion, en gång för texten och en gång för kontrollen. På rad 1616 står samma långa taskName-uttryck två gånger. Det är ingen jämförelse med sig själv: resultatet jämförs med den väntade texten "Går till X:s kropp". Men syns aldrig någon gå till kroppen prövas en påhittad uppgift i stället, så den delen blir svagare.  
Förslag: Räkna ut värdena en gång i variabler före listan och använd dem i både texten och kontrollen.  
Ändras i spelet: Nej.  
Prövningen: Dubbleringen stämmer och rättas säkert på några minuter; raderna blir läsbara. Påståendet att kontrollen jämför med sig själv stämmer inte.

**267. Orsaken till att en gröda dog översätts med en lång kedja av villkor**  
Var: `src/sim/odling.ts:549-566,583-592,822-823,861`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: forlorad() får orsaken som en text ('Torkan', 'Frosten', 'Fåglarna' och sex till) och gör om den till statistikens namn med en kedja av nio jämförelser. Ett stavfel i en av texterna ger tyst statistiken 'ruttnat'.  
Förslag: Ett litet register över orsakerna (nyckel, ordet i krönikan, statistikens namn) som forlorad slår upp i. Statistikens namn ska vara desamma som idag, eftersom scenarierna läser dem.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer, och ett register följer regeln om ett ställe per sak och fångar stavfel i typkontrollen. Koden blir tydligare men knappast kortare.

**268. "Gör någon annan redan det här?" skrivs för hand på ett femtontal ställen**  
Var: `src/sim/boskap.ts:98,121,192; src/sim/hage.ts:113,131,218; src/sim/slatter.ts:64,107,182; src/sim/kruka.ts:57,129; src/sim/folk.ts:236-262`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Frågan om någon annan redan arbetar med samma djur, ruta eller kruka står inskriven för hand på femton ställen i src/sim. Hjälparna enTill och enTillDar i folk.ts gör något annat: de släpper in en till med en viss chans (arbetsordningens mjuka tak). doingAct finns, men den frågar inte efter målet.  
Förslag: En ny hjälpare i folk.ts bredvid doingAct, som också tar målet (till exempel gorDar(s, handling, mål, utom)), och använd den på alla ställena. Byt inte till enTillDar: då kan två personer börja klippa samma får.  
Ändras i spelet: ingen märkbar skillnad med den nya hjälparen. Med enTillDar, som läsaren föreslog, skulle spelet ändras.  
Prövningen: Upprepningen stämmer, och ARKITEKTUR.md säger att frågor om personer ska vara hjälpare i folk.ts. Läsarens förslag var fel hjälpare, så förslaget är rättat. Raderna blir tydligare men inte färre.

**269. Det en by i världen känner räknas ut på två ställen på nästan samma sätt**  
Var: `src/sim/ort.ts:303-311 och 317-326; src/sim/vackt.ts:217-232`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 5 rader bort.  
I dag: gastensPlatser (ort.ts) och byggPlatser (vackt.ts) bygger båda mängden av det byn besökt, grannarna och grannarnas grannar. Sedan frågar de radKanner för varje plats, som går igenom grannarna en gång till, och väljer säkerheten med samma kedja: besökt 1, känt ORT.gastKant, annars ORT.gastRykte. byggPlatser skiljer sig lite: den tar bort den egna platsen, sorterar platserna och slumpar per person.  
Förslag: En funktion radensPlatser(vl, r) som ger listan (plats, nivå) och en liten funktion för gästens säkerhet per nivå. De två anroparna använder dem. Sorteringen i byggPlatser måste vara kvar, annars dras slumpen i en annan ordning.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer: samma mängd och samma säkerhetskedja står på två ställen. Vinsten är några rader, och risken är låg så länge ordningen i byggPlatser behålls.

**270. Högtidens ätande står två gånger i samma funktion**  
Var: `src/sim/kult.ts:295-322, 388-419`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 4 rader bort.  
I dag: I hogtidSlut står samma rad för ätandet två gånger (rad 407 och 408): ta maten, äta, räkna gille_mat och atit och s.fest.at. Valet av mat liknar det i ritualMat, men ritualMat räknar bara det man äger (det som ska hämtas) medan hogtidSlut också räknar det man bär. festMat väljer ur förrådet på ett annat sätt.  
Förslag: Slå ihop de två raderna för ätandet i hogtidSlut till en. Låt ritualMat, festMat och hogtidSlut vara kvar var för sig: de räknar olika (hämta, bröllopets förråd, det man bär).  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Upprepningen inne i hogtidSlut stämmer och är ofarlig att slå ihop. De tre funktionerna är däremot inte samma sak, så vinsten är mindre än läsaren trodde (omkring 4 rader, inte 25).

### Buggar (95)

**271. Riktad kontroll saknar fas 11-scenarierna**  
Var: `src/test/riktad.ts:22-40 (jämför src/test/scenario.ts:8-27)`. Vinst 4 av 5, risk 1 av 5, liten ändring, ungefär 16 rader bort.  
I dag: scenario.ts läser in scenariofilen fas11 (151 scenarier), men riktad.ts slutar vid fas10. I riktad finns därför inga fas 11-scenarier. De väljs aldrig efter en ändring, inte ens när man ändrar i scenariot självt. De räknas inte som nya, och `riktad -- --karta` bygger ingen karta för dem. Det stora testet och snabbkollen kör dem ändå, eftersom de går genom scenario.ts.  
Förslag: Lägg listan över scenariofilerna i en egen fil (t.ex. src/test/scenarier/alla.ts) som både scenario.ts och riktad.ts läser in. Då kan ingen fil glömmas nästa gång en fas får egna scenarier.  
Ändras i spelet: Ingen skillnad i spelet. Kommandot `riktad` kör efter rättningen också fas 11-scenarierna när det som ändrats berör dem.  
Prövningen: Stämmer: raden för fas11 finns i scenario.ts men saknas i riktad.ts, och riktad väljer bara bland de scenarier den själv läst in. En liten rättning som täpper ett verkligt hål i den riktade kollen.

**272. Väggen i dörrprovet på kartan byggs aldrig (koden står i en kommentar)**  
Var: `src/test/scenarier/folk.ts:1084-1103 (scenariot blockera); src/sim/kartstrid.ts:187 (provVarld)`. Vinst 4 av 5, risk 1 av 5, liten ändring.  
I dag: På rad 1086 står raden som bygger väggrutorna efter en kommentar på samma rad, så den körs aldrig. Mängden `rutor` är tom, och provVarld ger då en värld utan vägg. Kontrollerna om dörren på kartan (ingen förbi, ingen i en vägg, går igenom när hen fallit) och raden om femtio strider genom dörren är gröna utan att någon vägg finns.  
Förslag: Flytta kommentaren till en egen rad och låt `for`-raden stå för sig. Kör scenariot blockera. Blir något rött, rättas det i striden på kartan och inte i testet.  
Ändras i spelet: Spelet ändras inte. Testet börjar pröva det det säger. Det kan visa ett riktigt fel i hur strider på kartan hanterar väggar.  
Prövningen: Jag läste raden: `for`-satsen står inne i kommentaren, och provVarld med en tom mängd har inga väggar. Kontrollen 'ingen i en vägg' kan alltså aldrig bli röd idag.

**273. Scenariot filtplats finns två gånger och det första körs aldrig (samma sak med rovarmote)**  
Var: `src/test/scenarier/agande.ts:1774-1796 och 3103-3117 (filtplats); agande.ts:2657-2716 och src/test/scenarier/folk.ts:2710 (rovarmote)`. Vinst 4 av 5, risk 1 av 5, liten ändring.  
I dag: SCENARIER.filtplats sätts två gånger i samma fil. Den andra skriver över den första. Det första scenariot (fyra kontroller: filtarna en ruta isär, handlaren bakom sin filt, fri mark, lagerplats inte fri) körs därför aldrig. Jag hittade samma fel med rovarmote: det i agande.ts (tio kontroller om mötet och poängen för att fly, steg 10.1.14) skrivs över av ett annat rovarmote i folk.ts, som läses in senare. Namnen gravplats (kultur.ts och fas11.ts) och trad (natur.ts och fas9.ts) finns också två gånger, utanför den här delen.  
Förslag: Ge det ena scenariot i varje par ett eget namn (till exempel filtfri och rovarflykt), så att båda körs. Lägg en spärr där scenarierna registreras eller körs, som larmar när ett namn sätts två gånger. Rätta det som de återuppväckta scenarierna då visar.  
Ändras i spelet: Spelet ändras inte. Två scenarier som legat tysta körs igen och kan visa fel som ingen sett.  
Prövningen: Stämmer: namnet står två gånger och scenarierna ligger i en vanlig post, så det sista vinner. Det är en riktig lucka i testerna, och den finns på fler ställen än läsaren såg. Designdokumentet behövdes inte för det här.

**274. Samlarens gamla väg för sten och flinta körs fortfarande och ger falska flintfynd**  
Var: `src/sim/eld.ts:519-532 (balanstalen rad 85, 89-90); src/sim/steg.ts:1102-1124, 1423; src/sim/fynd.ts:693; src/test/scenarier/redskap.ts:701-707`. Vinst 4 av 5, risk 2 av 5, liten ändring, ungefär 30 rader bort.  
I dag: Allt samlande går på rundan (steg.ts rad 811), där sten och flinta plockas som hela saker från rutan. Ändå räknar forageItems sten per timme och slår en chans för flinta, och steg.ts kastar bort båda (utanStenar). Flintgrenen har då redan skrivit "hittade flinta" i loggen, räknat fyndet i statistiken, dragit flinta från kartan, lagt platsen på minnet och gett ett tecken, utan att någon flinta kom hem. Det riktiga plocket på rundan (steg.ts rad 1105) skriver däremot ingenting i loggen. Grenen "else if (y > 0)" och svampen på rad 1124 nås aldrig, eftersom plockSlag alltid är satt när samla körs.  
Förslag: Ta bort sten- och flintgrenen ur forageItems, utanStenar, den döda grenen i samla och pickMushrooms (som då inte används), och balanstalen ELD.stenTakt, flintaTakt och flintaOkand (de används bara där). Flytta loggraden l_flinta och tecknet till det riktiga plocket i steg.ts, så att berättelsen finns kvar. Scenariot redskap (rad 701-707) justeras, och scenariot flinta kontrolleras: det räknar i dag också de falska fynden.  
Ändras i spelet: Loggen säger att någon hittat flinta bara när flintan kom hem, och flintan på kartan tar inte slut i onödan. Slumpföljden ändras, så samma by utvecklas lite annorlunda (nytt facit).  
Prövningen: Stämmer rad för rad: det gamla fyndet loggas och räknas men kastas bort, och det riktiga plocket loggas inte. Loggraden och tecknet måste flyttas med, annars försvinner de helt.

**275. Svampsyner räknas vid var femte måltid, också utan svamp**  
Var: `src/sim/fynd.ts:722; src/sim/behov.ts:105; src/sim/religion.ts:247, 268, 288-299`. Vinst 4 av 5, risk 2 av 5, liten ändring.  
I dag: eatPoison körs för varje måltid (behov.ts:105). Första raden (fynd.ts:722) slår en slump på 0,2 och ger tecknet 'svampsyn' innan koden har sett om det finns någon giftsvamp alls. Tecknet ger en upplevelse, stärker tron hos den som redan tror och kan grunda en ny tro. Talet 0,2 står direkt i koden.  
Förslag: Flytta raden ner till grenen där personen faktiskt blev förgiftad, och ta bort slumpen 0,2 eller gör den till ett balanstal. Designdokumentet (fliken Samhället, tecknen i 8.5.18) säger: 'svampen som gav syner (svampförgiftningen som man överlevde)'.  
Ändras i spelet: Ja: svampsynerna blir sällsynta i stället för att komma vid var femte måltid, så tron stärks och grundas mer sällan den vägen. Det är en rättelse mot det som står i designdokumentet.  
Prövningen: Stämmer: raden står före kollen av giftsvampen och körs vid varje måltid. Designdokumentet säger att tecknet hör till en förgiftning man överlevt, så koden gör något annat än det som är bestämt.

**276. Pilar ger blåmärken och fastnar aldrig i såret**  
Var: `src/sim/strid.ts:188, 196, 596-597, 626; src/test/scenarier/fas9.ts:492-500 (scenariot pilisaret)`. Vinst 4 av 5, risk 2 av 5, liten ändring.  
I dag: Ett kast eller skott räknas med vapnets närstridsslag (v.slag). Pilbågen har slaget 'slag' (man slår med bågen på nära håll), så en pil som träffar blir ett blåmärke eller krossår, aldrig ett sticksår. Ett vapen fastnar bara när slaget är 'stick', så pilen sitter aldrig kvar, fast bågens rad säger fastnar: true. Scenariot pilisaret ser bara att flaggan finns och lägger såret för hand.  
Förslag: Ge KastDef ett eget slag (pilen: stick) och använd det i kasta(): kv.slag ?? v.slag. Lägg till en kontroll i scenariot att en pil som träffar ger ett sticksår och kan fastna.  
Ändras i spelet: Pilar ger sticksår som blöder mer och kan sitta kvar tills de dras ut, i stället för blåmärken. Bågen blir farligare.  
Prövningen: Stämmer i koden. Designdokumentet (Vapnet i såret, steg 9.5.21) säger att en pil ger ett sticksår och sitter kvar, så detta är ett fel och inget val.

**277. Lärlingen i öl, mjöd och gödsel lär sig aldrig klart, och försöken mot dem kan inte lyckas**  
Var: `src/sim/teknik.ts:89, 91, 185 (raderna), 330 (kanForsoka), 394 (BREDVID), 427-441 (stepLarlingar); src/sim/brygg.ts:91-95, 124-128; src/sim/rester.ts:89-94; src/test/scenarier/mastare.ts:24; src/ui/flikar/teknik.ts:91`. Vinst 4 av 5, risk 2 av 5, liten ändring.  
I dag: Öl, mjöd och gödsel är de enda teknikerna på nivå 4–5 med ett eget tillfälle (nar). Byn upptäcker dem genom en händelse, och då lär sig alla som kan kraven. Tiden 1000 timmar betyder att ingen ska tänka sig fram. Men stepLarlingar ger ändå en mästare en lärling i dem, och arbetaBredvid hoppar över alla tekniker med nar. Lärlingen kommer aldrig framåt, och både mästaren och lärlingen är upptagna tills mästaren dör. Den som fått kraven senare kan alltså aldrig lära sig öl, mjöd eller gödsel av någon. kanForsoka släpper också igenom de tre: ett försök tar 90 minuter och en sak av materialet och ger nästan ingenting. Raderna har en försöksrad bara för att scenariot forsok kräver att alla tekniker på nivå 4–5 har en, och teknikrutan säger därför felaktigt att man kan pröva sig fram till dem.  
Förslag: Låt lärlingen lära sig de tre hos mästaren: BREDVID tar med tekniker med nar när nivån är 4 eller högre. Stäng försöken för tekniker med nar (ett villkor !t.nar i kanForsoka), ta bort försöksraden på de tre, och rätta scenariot forsok och texten i teknikrutan så att de undantar tekniker med eget tillfälle. Talet 1000 kan stå kvar för sädesodlingen, som också har det.  
Ändras i spelet: Ja, lite: de som växer upp efter upptäckten kan lära sig brygga öl och mjöd och gödsla som lärlingar, ingen fastnar som lärling, och ingen slösar material och tid på försök som inte kan lyckas.  
Prövningen: Stämmer i koden: de tre är de enda med både nar och nivå 5, lärlingen väljs men kan aldrig bli klar, och försöken ger 0,15 % per gång. Jag valde sättet där lärlingen lär sig, för designdokumentet säger att nivå 4–5 lärs som lärling. Designdokumentet söktes (Färdplan 4.2.3.3).

**278. Förbandet byts aldrig hemma i byn**  
Var: `src/sim/halsa.ts:94, 554, 618, 631-644, 666-675, 746; src/sim/resa.ts:1395; src/sim/halsonotiser.ts:53; src/ui/flikar/person.ts:351`. Vinst 4 av 5, risk 2 av 5, liten ändring.  
I dag: Behandlingen 'byta' (Byta förband) finns i vårdregistret, och ett förband som suttit längre än 12 timmar i spelet (ungefär två minuter i verkligheten) dubblar risken för infektion. Men hemma i byn frågar ingen efter den: vardBehov räknar inte 'byta' som ett behov, och listan i vardKlar saknar den. Bara sällskapet på resa byter förband. Personens kort och hälsonotisen säger ändå att förbandet behöver bytas. Inget scenario prövar bytet.  
Förslag: Lägg 'byta' i vardBehov (som ett förbandsbehov), i listan i vardKlar och i det vårdaren hämtar (vardHamtas), så att samma vård görs hemma som på resa. Lägg till en kontroll i ett scenario. Designdokumentet säger att förbandet ska bytas, så regeln ska inte tas bort.  
Ändras i spelet: Ja, lite: sår i byn får nytt förband och infekteras mer sällan. Det går åt fler remsor och mer mossa. Byarna utvecklas annorlunda (nytt facit).  
Prövningen: Jag läste vardBehov, vardKlar och VAGVARD: 'byta' finns bara på resan. Designdokumentet (Vården, Vårdregistret) säger att förbandet byts och räknar upp 'byta förband' bland raderna, så det är ett fel och inget val.

**279. Varma kläder stoppas av kylan fast de ska vara undantagna**  
Var: `src/sim/val.ts:550, 888; src/sim/projekt.ts:109, 372, 435; src/test/scenarier/agande.ts:619-635`. Vinst 4 av 5, risk 2 av 5, liten ändring.  
I dag: Steg 10.2.71 säger att kylan som fara inte stoppar arbetet med det som skyddar mot kylan. Undantaget finns i projektets värde (bastaProjekt). Men raden projekt går först genom forbNu, som bara släpper igenom var tjugonde gång (VAL.projFara 0,05) när kylan eller hungern är en fara. Rockar och skor sys alltså nästan aldrig på dagen när byn fryser. Scenariot prövar bara värdet, inte att raden nås. Pysslet på fritiden och kvällen går inte genom forbNu och fungerar.  
Förslag: Låt raden projekt fråga efter det bästa projektet först, och hoppa över forbNu när det skyddar mot kylan (motKyla). Övriga projekt dämpas som i dag, eftersom designdokumentet säger att ett projekt tas sällan när kylan eller hungern är en fara. Läsarens förslag (ingen forbNu alls på raden) skulle ta bort dämpningen vid svält, där projekten inte har någon annan. Lägg till en kontroll i scenariot klader att raden väljs i kyla.  
Ändras i spelet: När byn fryser syr folk rockar och skor på dagen, i stället för nästan aldrig. Övriga projekt som i dag.  
Prövningen: Koden gör inte det steg 10.2.71 och designdokumentet säger. Rättningen är liten och rör bara plaggen som värmer.

**280. Mjärden vittjas inte, geten mjölkas inte och honungen tas inte när byn har ont om mat**  
Var: `src/sim/val.ts:854-859 (mat, egenMat), 871-882 (vittja, ortPlocka, skatta, mjolka), 936-947 (vinnare), 958-969`. Vinst 4 av 5, risk 2 av 5, liten ändring.  
I dag: Raderna vittja, plocka örten, skatta och mjölka står på nivå 6 efter poängraderna. Valet prövar dem bara när ingen poängrad vinner. Raden egenMat har inget tak, och matraden räknas aldrig som full när byn svälter. I en hungrig by vinner därför alltid mat eller egenMat, och fisken står kvar i mjärden. Designdokumentet (Arbetsordningen, Försörjning) säger dessutom att vittja fällorna hör till Rädda, inte Försörjning; mjölkningen, örten och skattningen ska ligga på Försörjning.  
Förslag: Flytta vittja till Rädda, som dokumentet säger. Pröva mjölka, skatta och plocka örten före poängraderna på nivå 6 (flytta raderna uppåt i registret). De tar 2–5 minuter och ger mat direkt. Att göra dem till poängrader i matens skala kan vänta till en större omgörning.  
Ändras i spelet: En hungrig by tömmer mjärdarna och mjölkar djuren först, i stället för sist. Mer mat i knappa tider. Byar med fällor och djur blir något mättare.  
Prövningen: Stämmer i koden, och för mjärden står det rätta redan i designdokumentet. Att flytta fyra rader är litet och gör att maten som redan finns tas tillvara.

**281. Utflyttningens text säger alltid 'Byn blev trång', också när orsaken är hunger eller missnöje**  
Var: `src/sim/liv.ts:214-217,236-239,428-451, src/sim/grannbyar.ts:117`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Chansen att någon flyttar räknas ur trängsel, missnöje och matbrist tillsammans. Men när ett par flyttar skrivs alltid 'Byn blev trång. X och Y lämnade byn för att grunda en egen boplats', även i en liten by som svälter. Paret ger ingen notis utom när de grundar en ny by ur en mycket stor by (utbrytningen). Den ensamme ger en notis, men hens vänner får ingen tanke om saknad (bara partnern får det).  
Förslag: Välj texten efter den största delen av chansen (trångt, hungrigt, missnöjt), och låt båda grenarna ge samma notis och samma saknad genom en gemensam funktion. Ingen ny slump dras, så byarna utvecklas nästan som förut (bara tankarna om saknad tillkommer).  
Ändras i spelet: Loggen säger rätt orsak när folk flyttar, spelaren får en notis också när ett par lämnar byn, och vänner saknar också den som flyttar ensam.  
Prövningen: Stämmer: texten är fast och stämmer inte med orsaken, och de två grenarna behandlar notis och saknad olika utan skäl. Inget test läser texten.

**282. Personens händelser får fel känsla: tonen gissas ur textens ord**  
Var: `src/sim/personlogg.ts:19-36 (ontOrd, blandat, ton); src/sim/berattelser.ts:2849-2855 (kanslaRad), 2192 (Kallas …); src/sim/rost.ts:290; src/sim/notiser.ts:97`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Varje rad i personens händelser får ett tillägg efter om händelsen var god eller ond. För slagen titel, relation och nära avgörs det genom att leta efter ord i texten (dog, bröt, skilde, ökänd …). Allt som inte träffar ett ord räknas som gott. Ett öknamn skrivs "Kallas Ask Tjuven." och räknas därför som gott, så den som fått ett skamnamn får en glad eller stolt rad. Samma sak för den som spridit lögner om ledaren och blivit avslöjad (notisen 'ledare' går till slaget titel).  
Förslag: Låt den som skriver raden säga tonen: personHand får ett valfritt sista fält (gott eller ont), och öknamnet skickar 'ont'. Notiser som kan vara både och får tonen i sitt anrop. Ordlistan kan då tas bort eller bli kvar bara som reserv för gamla rader.  
Ändras i spelet: Bara texten i personens händelser: öknamn och avslöjat fulspel får en ledsen eller skamsen rad i stället för en glad. Byns utveckling ändras inte, för tillägget räknas först när rutan ritas.  
Prövningen: Jag följde vägen i koden: "Kallas …" träffar inget ord i listan och blir gott, också för ett öknamn. Rättelsen är liten och rör bara text som visas.

**283. Påbudens värden skrivs som en kedja i fliken, och fyra påbud visar fel text**  
Var: `src/ui/flikar/styre.ts:66-69, 80, 120; src/sim/styre.ts:174-195`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: varde(k, v) i fliken Styre har ett fall var för tystnad, hån, torkat, bygg och vinter. Allt annat visas som förrådsmål: 'ved för N år' för vedlagret och 'mat för N år' för alla andra. Påbuden nattvakten, skriv ner lagarna, fängelse och utfärder har kommit till senare och har inget eget fall, så deras kort säger till exempel 'Hur många som håller vakt om natten: mat för 3 år'. Lagarna har redan sin visning i registret (visa).  
Förslag: Ge varje rad i PABUD en visa-funktion, som lagarna har, och låt fliken anropa den. Skriv riktiga ord för nattvakten, lagskriften, fängelset och utfärderna.  
Ändras i spelet: Korten för fyra påbud i fliken Styre, och raden om en omröstning om dem, får rätt text. Inget i simuleringen ändras.  
Prövningen: Mer än ett regelbrott: kedjan har redan gett fel text för fyra påbud, just för att ett nytt påbud kräver en ändring på två ställen. Rättningen är liten och rör bara texten.

**284. prov() i bestskaparen ritar nya kroppsformer från API:t fel eller kraschar**  
Var: `bildstil/bestskapare.js:577, 632-645, 714, 732, 993-1008; bildstil/api/bestar.mjs:157, 258`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: Kropparna skrivs utan förskjutningen OY (15 punkter, platsen för vingarna) och flyttas ner av nerOY, som körs en enda gång vid start (rad 645). nerOY fyller också i benparen när kroppen inte anger några. prov() lägger in en ny del efter start och kör aldrig nerOY på den. För en kropp utan egna benpar blir benparen då tomma (rad 577 ger undefined), och rad 732 kraschar när benen ska ritas. Alla tre kropparna i bestar/kropp.json saknar egna benpar och har ben, så också omritning av dem (bestar.mjs rad 157) träffas. Med egna benpar kraschar det inte, men bål, hals och fästpunkter hamnar 15 punkter för högt medan formerna flyttas rätt (rad 714), så bilden och kontrollen 'går utanför bilden' blir fel.  
Förslag: Kör nerOY på kroppen i prov() innan den läggs in, så att prov ritar samma bild som sidan gör efter start. Om nerOY i stället flyttas in i apiDel måste startraden KROPPAR.forEach(nerOY) ändras så att API:ts kroppar inte flyttas två gånger.  
Ändras i spelet: Ingen skillnad i spelet. Verktyget som låter API:t rita nya kroppsformer till bestskaparen slutar underkänna eller visa dem fel.  
Prövningen: Koden visar felet tydligt: nerOY körs bara vid start och prov lägger in delen efteråt. Rättelsen är en rad i ett ritverktyg och rör inte spelet. Jag har bara läst koden, inte kört den.

**285. Fyra 'kontroller' som bara skriver VARNING och aldrig kan bli röda**  
Var: `src/test/scenarier/folk.ts:170, 197, 203, 210, 243 (samtal, liv, utflyttning); src/test/scenario.ts:73-78`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: Fyra kända fel prövas med en utskrift 'VARNING' i stället för en kontrollrad. scenario.ts räknar bara kontrollrader, så scenariot är grönt även om felet finns. Scenariernas egna texter lovar ändå just detta (barnets far är den hon blev gravid med, en död mor gör inget mer, det de bar på läggs ner). Koden ser rättad ut på alla fyra ställen: tell i minne.ts rör inte tiden, birth i liv.ts tar pregnantBy först, leave i liv.ts anropar avbryt, och personslingan i steg.ts frågar alive.  
Förslag: Gör varje VARNING till en vanlig kontrollrad med samma villkor. Ta bort hänvisningarna till gamla fynd-nummer och orden 'se VARNING' på rad 210. Blir en rad röd finns felet kvar och rättas i systemet.  
Ändras i spelet: Ingen skillnad i spelet. Testerna larmar om något av de fyra felen kommer tillbaka.  
Prövningen: Stämmer: ingen del av testkörningen räknar dessa VARNING-rader som fel. Felen verkar rättade, så raderna bör bli gröna direkt och sedan skydda mot återfall.

**286. De flesta stationer saknar namn när de byggs**  
Var: `src/sim/handlingar.ts:281, 295, 352; src/sim/stationer.ts:164-377; src/sim/sport.ts:92`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: Handlingen station har en handskriven lista med 14 namn ('Bygger en slaktbänk' …). STATIONER har 39 sorter och dessutom mattorna. För de övriga 25 (bland dem fångstbänken, snickarbänken, vävstolen, härden, komposten, bakugnen, kvarnstenen, bryggkaret, rökeriet, bikupan, scenen och altaret) står det bara 'Bygger en station'. Tillbehören har likadant bara ett namn (skinnfällen).  
Förslag: Fyll listan ur STATIONER när stationer.ts laddas, som sport.ts redan gör för sporterna, och ta bort den handskrivna listan. Varje station behöver då en kort text (dagens fält bygger är en hel mening, och verbet skiljer: bäddar, gräver, sätter upp). Samma sak för tillbehören.  
Ändras i spelet: Personrutan och rutan under musen säger vilken station som byggs, för alla stationer.  
Prövningen: Felet finns och är större än läsaren räknade: 25 stationer, inte 18. Det syns i spelet och rättas på det sätt registren redan används för sporterna.

**287. Den enkla begravningen hänger på gravölet i stället för på samlingen**  
Var: `src/sim/grav.ts:260-271`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: I gravKlar hör else-grenen med den enkla begravningens tanke och loggrad till raden om gravölet, inte till raden om samlingen. En tro med samling men utan gravöl ger därför både ritualen Begravning och tanken om den enkla begravningen. En tro med gravöl men utan samling ger varken tanken eller raden i loggen. Kommentaren på rad 260 och designdokumentet säger att den enkla är den utan samling.  
Förslag: Låt else-grenen höra till samlingen: finns en samling blir det ritualen, annars den enkla begravningen. Gravölet blir ett eget villkor bredvid.  
Ändras i spelet: Ja, lite: familjen får inte längre dubbelt humör efter en begravning med samling, och en begravning utan samling ger alltid tanken och raden i loggen.  
Prövningen: Stämmer rad för rad. Scenarierna prövar bara fallen utan tro och med både samling och gravöl, så felet syns inte där och rättningen stör dem inte.

**288. Döda resenärer äter, dricker och räknas i tält och oväder**  
Var: `src/sim/resa.ts:498 (nattTapp), 521-539 (behovBit), 1241 (oväder), 1584 (lamnaKvar); jfr resenarer() 621 och dorPaVagen 1426`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: Den som dör på vägen står kvar i sällskapets medlemslista, för att byn ska få beskedet när någon kommer hem. Men maten, vattnet, tälten och ovädret räknar hela listan. Ett sällskap på tre där en dött äter alltså tre portioner per mål, behöver tre vattensäckar och delar tälten på tre. Den som lämnas kvar får också en mindre del av maten.  
Förslag: Räkna antalet med resenarer(s, sl).length (de som lever) på de fyra ställena. Listan med medlemmar ska stå kvar, den behövs för beskedet hemma.  
Ändras i spelet: Ja, lite: ett sällskap som förlorat någon gör av med mindre mat och vatten på resten av resan.  
Prövningen: Stämmer rad för rad: fyra ställen räknar sl.medl.length medan farten, lasten och gruvan räknar bara de levande. Det är ett rent fel och rättningen är fyra små byten.

**289. Karavanens ledare får inte veta vilka platser hens by känner**  
Var: `src/sim/handel.ts:350-356 (kommer), 374-378 (handlarKarta), 489-495 (karavanFolje), 629 (kanner); src/sim/ort.ts:317`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: Handlaren läggs sist bland personerna (rad 350). Har hen vagnar lägger karavanFolje (rad 352) till följet efter hen. Sedan ges platserna till den sista personen i listan (rad 354), som då är en i följet. Handlaren själv får inga platser, så kartan (rad 356) hittar inget att rita och hen känner ingen ort i bytena.  
Förslag: Spara handlarens person i en variabel direkt efter att hen lagts till, och använd den i gastTillbaka, gastensPlatser och resten av funktionen. Det tar samtidigt bort flera uppslag av handlaren i samma funktion.  
Ändras i spelet: Handlare med vagn (karavaner) kan börja ha kartor med sig och känner platserna runt sin by, som de vandrande handlarna redan gör. I dag har de bara det om de varit i byn förut.  
Prövningen: Stämmer rad för rad: följet läggs till mellan de två raderna, och platserna hamnar hos fel person. Rättelsen är en variabel och rör inget annat.

**290. Kodkommentar syns som text i stationens ruta**  
Var: `src/ui/flikar/station.ts:117-121`. Vinst 3 av 5, risk 1 av 5, liten ändring.  
I dag: Två kommentarsrader ("// rubrikerna i samma ordning för alla stationer (steg 11.1.56) …") står inne i texten som rutan visar, mellan huvudet och "Används nu". De skrivs därför ut som vanlig text i rutan för varje station och möbel.  
Förslag: Flytta de två raderna ut ur texten, till ovanför return.  
Ändras i spelet: Textraden som börjar med "//" försvinner ur rutan för stationer och möbler. Inget annat ändras.  
Prövningen: Jag såg raderna inne i mallsträngen (den börjar på rad 117 och slutar på rad 131). Det är ett rent fel som syns för spelaren och är ofarligt att rätta.

**291. Flinta loggas som hittad men kastas bort på rundan**  
Var: `src/sim/steg.ts:1101-1124, 1423 (utanStenar); src/sim/eld.ts:519-532 (forageItems); src/test/scenarier/grund.ts:536-546 (scenariot flinta)`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Samlandet går alltid som runda, och då stryks sten och flinta ur det forageItems ger. Men forageItems har redan slagit sin chans för flinta: den räknar fyndet i statistiken, tar flinta ur kartan, skriver berättelsen "hittade flinta" och kan ge tecknet om flintan på en märklig plats. Samlaren får ingen flinta. Den riktiga flintan plockas som en sak på rutan (steg.ts:1105-1108), och där skrivs ingen berättelse och ges inget tecken.  
Förslag: Ta bort sten- och flintdelen ur forageItems och ta bort utanStenar. Flytta berättelsen l_flinta och tecknet till stället där flintan faktiskt plockas på rundan.  
Ändras i spelet: Ja, lite. Krönikan säger bara att någon hittat flinta när någon fick den. Flintan på kartan minskar inte längre utan att någon får den. Statistiken räknar bara riktiga fynd. Slumpen dras färre gånger, så testerna visar "annan utveckling" och nytt facit behövs. Scenariot flinta räknar samma statistik och ska köras.  
Prövningen: Stämmer rad för rad. Designdokumentet (Människan, "Allt räknas i saker") säger att flintan ligger i hela bitar vid stenarna och i sanden, så den gamla chansen per timme är en rest som ljuger i krönikan.

**292. Två olika räkningar av en persons förmögenhet: skatten räknar inte höns och bikupor**  
Var: `src/sim/varde.ts:120-140; src/sim/lager.ts:217-221; användare: src/sim/skatt.ts:87, 92, 119, 130, 154, 185; src/ui/flikar/person.ts:107, 239; src/sim/humor.ts:318; src/sim/byggplan.ts:218 och 393; src/sim/historik.ts:99`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: formogenheter (humöret, byggplanen, historiken) räknar andelar i förrådet, ting, hus, tamdjur, hönsen och bisamhällena. formogenhetDelar (skatten och personens flik) räknar samma sak en gång till, men utan hönsen och bisamhällena. Designdokumentet säger att skatten räknas på förmögenheten i personrutan med hus och djur. Skatten anropar formogenhetDelar för varje person, och varje anrop går igenom alla stackar.  
Förslag: En funktion som räknar allas förmögenhet i delar (redskap, kläder, förråd, hus, djur) på en genomgång. formogenheter och formogenhetDelar läser ur den, så att hönsen och bikuporna kommer med i skatten och i personens flik. Hönsen och bina räknas som djur och är aldrig betalning (skatt.ts rad 185 drar redan av djuren). Urvalet av stackar lämnas som det är.  
Ändras i spelet: Den som äger höns eller bikupor blir lite rikare i skattens ögon och betalar lite mer skatt. Personens flik visar samma summa som resten av spelet räknar med.  
Prövningen: Stämmer: hönsen och bisamhällena saknas i den ena räkningen, fast dokumentet säger att djuren räknas i skatten. En gemensam räkning tar bort felet och gör skatten billigare att räkna.

**293. Kontroller som aldrig kan bli röda**  
Var: `src/test/scenarier/kultur.ts:2744, 2775-2776, 2810, 1574, 1576, 1466, 2075, 2651, 1345, 1347, 2504`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 4 rader bort.  
I dag: Stämmer för de flesta. Alltid sant: `|| true` (2744, de anhöriga i hämnden prövas aldrig), `true` (2810), och 2775-2776 bygger en hel by och en räd som ingen kontroll läser. Kan aldrig bli rött i praktiken: `!varna || ledsen` (1574, sant om ingen drar åt Värna), `!!rader && !!ring` (1576, ser bara att formen har ett namn, inte att den följer sederna), `!r || ägaren är d eller den förra` (1466, sant också när ingen bot betalas), `mat0 >= 0` (2075, hunger är aldrig under noll). Döda rester: `void kt0` (2651), `!!m` (1345), `!!h` (1347), `!!l` (2504). Däremot är 1615 (stod <= 1), 3155, 2502 och 1316 riktiga kontroller som kan bli röda; de ska inte röras.  
Förslag: Gör de sju svaga kontrollerna till riktiga jämförelser (till exempel: det finns någon som drar åt Värna och hen blir ledsen; de två formerna är olika; yxan ägs av den drabbade), och ta bort `|| true`, blocket på 2775-2776 och de döda variablerna.  
Ändras i spelet: Nej. Men en kontroll som blir skarp kan bli röd och visa ett riktigt fel, som då måste undersökas.  
Prövningen: Jag läste varje rad: sju kontroller kan inte bli röda och ger falsk trygghet, och fyra rader är döda rester. Fyra av de utpekade (1615, 3155, 2502, 1316) är riktiga och har strukits ur listan.

**294. Skyddet bakom träd och väggar mot pilar gäller aldrig i byn**  
Var: `src/sim/strid.ts:75, 329, 421, 434, 589; src/test/scenarier/folk.ts:1069`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: En pil eller ett kast mot någon bakom ett hinder ska träffa hindret hälften av gångerna (STRID.bakomTrad, steg 8.7.7). Villkoret kräver st.hinder, arenans gamla väggar. Striderna i byn sker på kartan och frågar världen om väggarna, och har inga st.hinder. st.hinder sätts bara i ett scenario (folk.ts:1069). Regeln slår alltså aldrig till i spelet.  
Förslag: Låt villkoret gälla också när det finns en värld: (st.hinder?.length || varld) && !sikt(...). Funktionen sikt frågar redan världen genom iVagg. Se efter vad världen räknar som hinder (väggar och vatten; träden bör prövas). Att ta bort den gamla Strid.hinder och låta scenariot använda provVarld kan göras samtidigt men är inte nödvändigt.  
Ändras i spelet: Den som står bakom en husvägg träffas mer sällan av pilar och kast. Lite färre träffar för skyttar i byn.  
Prövningen: Stämmer i koden. Färdplanens steg 8.7.7 är avbockat och säger att träd, väggar och vatten är skydd mot pilar, så regeln ska lagas och inte tas bort.

**295. Rädslan för handlingar bleknar och sprids bara i byar som har en ledare**  
Var: `src/sim/styre.ts:602, 612, 624-625; src/sim/lagar.ts:205-207, 244-256; src/test/scenarier/kultur.ts:1462`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: raddDygn (rädslan blir svagare och berättas för vänner) anropas bara sist i stepStyre, efter raderna som avbryter när byn saknar ledare. Rädslan uppstår ändå i alla byar (halsa.ts 421, liv.ts 147). En by utan ledare, till exempel varje ny by med färre än sex vuxna, glömmer därför aldrig sin rädsla för björnjakt, vargjakt, bad eller spel.  
Förslag: Ge raddDygn en egen rad i TAKTER med ett dygn som takt och en fas, som skatten och gravDygn, och ta bort anropet ur stepStyre. Scenariot i kultur.ts som anropar lagDygn rättas samtidigt.  
Ändras i spelet: Ja, lite: byar utan ledare börjar glömma och sprida sina rädslor som andra byar. Facit behöver sparas om.  
Prövningen: Stämmer. Rädslan har inget med ledaren att göra, och designdokumentet (steg 10.2.41) säger att var och ens rädslor finns kvar och sprids. Att de fryser utan ledare är ett fel, ingen regel om världen.

**296. Klanens rikedom per person räknas femtio gånger för högt när rädens skäl lottas**  
Var: `src/sim/rader.ts:47-60 (klanPerPerson rad 48); src/sim/rad.ts:140; src/sim/grannbyar.ts:86; src/ui/flikar/grannar.ts:23`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Skälet plundra ska gälla när klanen har mindre än hälften så mycket per person som byn (steg 8.8.2 i Färdplanen). Klanens rikedom gångras med 50, från tiden då den räknades i arbetstimmar (15–30 per person). Sedan fas 11 är talet en kopia av radens rikedom, som går mot 200 per person i samma mått som byns. Klanen ser därför femtio gånger rikare ut, och skälet plundra gäller i praktiken aldrig. Har klanen en död att hämnas eller en krigisk tro blir räden alltid hämnd eller heligt krig, i stället för att lottas 1 : 0,2 : 0,1.  
Förslag: Ta bort gångningen med 50 på rad 48, så att jämförelsen blir den som står i steg 8.8.2. Behåll villkoret; designdokumentet beskriver det. Lottningen på rad 59-60 kan samtidigt bli ett anrop till den färdiga viktade dragningen i slump.ts, om den drar ur samma slumpström.  
Ändras i spelet: Ja, lite: en fattig klan som har någon att hämnas eller en krigisk tro kommer oftast för att plundra igen, och hämnd och heligt krig blir så sällsynta som vikterna säger. En klan som inte är fattig påverkas inte.  
Prövningen: Koden stämmer med fyndet, och designdokumentet (steg 8.8.2) säger hälften så mycket i värde per person med samma värdetabell för båda. Rättningen är en rad; förslaget att ta bort villkoret helt följs inte, eftersom villkoret är beskrivet som önskat.

**297. Övertygelsen i det heliga kriget höjer nästan inte stridsmodet**  
Var: `src/sim/rovare.ts:574-575; src/sim/strid.ts:350-353, 632; src/sim/rader.ts:40, 168`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: När striden med rövarna börjar läggs 20 × övertygelsen till bybons mod efter att striden skapats. Men stridsmodet (modNu) räknas ur modet redan när striden skapas, och räknas aldrig om. Tillägget påverkar bara hur fort modet sjunker av skador (rad 632). Den som går in i striden senare (kartStridMed) får inget tillägg alls. Inget scenario prövar det.  
Förslag: Lägg tillägget också på stridsmodet när striden börjar (k.modNu += övertygelsen × STRID.modMod), och ge samma tillägg till den som kommer till senare.  
Ändras i spelet: I ett heligt krig står starkt troende bybor emot märkbart längre innan de ger upp eller flyr. Annars ingen skillnad.  
Prövningen: Stämmer i koden. Designdokumentet (Att ge upp i en räd, steg 8.8.8) säger att övertygelsen läggs till modet så att den starkt troende hellre faller än svär; det gör den inte i dag.

**298. "Går i lära" ger ingenting för tekniker utanför hantverket**  
Var: `src/sim/teknik.ts:299-301 (omrAv), 396-424 (arbetaBredvid, laraVal); src/sim/handlingar.ts:247; src/sim/val.ts:601, 1337, 1387-1388; src/sim/steg.ts:835`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: Aktiviteten lara (lärlingen sätter sig bredvid mästaren) räknas som hantverk. arbetaBredvid går bara igenom teknikerna i det området. Är lärlingens teknik en jakt-, fiske-, mat- eller byggteknik (snara, fångstgrop, bur, vin, bakugn med flera) finns den inte bland hantverkets tekniker, och tiden hos mästaren ger ingen framgång alls. För hantverksteknikerna ger den samma som vilket hantverk som helst.  
Förslag: Låt lara räknas som lärlingens egen teknik i arbetaBredvid: när uppgiften är lara prövas tekniken i p.lar.tek, oavsett område. Aktiviteten står kvar; designdokumentet beskriver lärlingen hos mästaren. Att ta bort hela aktiviteten är ett större val som inte behövs för att rätta felet.  
Ändras i spelet: Ja, lite: lärlingar i jakt-, fiske-, mat- och byggtekniker lär sig också medan de sitter hos mästaren, så de blir klara fortare än i dag.  
Prövningen: Stämmer: lara blir området hantverk i omrAv, och en teknik med annat område finns då inte i listan som arbetaBredvid går igenom. Jag ändrade förslaget till rättningen i stället för att ta bort aktiviteten, eftersom lärlingskapet står som byggt och önskat i Färdplanen (4.2.3.3).

**299. Sällskap som aldrig ställs in: ledaren dör eller någon kommer inte till packningen**  
Var: `src/sim/resa.ts:77 (packTim), 427 (sl.packar), 431-456 (resaVal, resaSteg), 887-892 (stallIn), 1051-1059 (samlasSteg); src/sim/val.ts:697`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: Bara ledaren, på plats vid samlingsplatsen, kan avgöra om resan blir av eller ställs in. Dör ledaren medan sällskapet samlas står det kvar för alltid, och de andra skickas om och om igen att vänta sex timmar. När sällskapet packar finns ingen tidsgräns alls: en som lever men inte kan ta sig dit (till exempel med ett skadat ben) håller kvar alla, och maten är då redan uttagen ur förrådet. Fältet sl.packar sätts men läses aldrig. Ingen annan fil städar (sökt i hela src). Designdokumentet säger att resan ställs in om ledaren inte får ihop sällskapet inom en timme.  
Förslag: En kontroll där sällskapen redan räknas: finns ingen levande ledare, eller har samlandet eller packandet varat längre än sin tid, ställs resan in. stallIn lägger i dag inte tillbaka packningen; det måste läggas till för skedet packar (maten, tälten, varorna och insatserna).  
Ändras i spelet: Ja: resor som fastnat ställs in i stället för att binda folk och mat för alltid.  
Prövningen: Stämmer: stallIn anropas bara från ledarens eget steg, och inget städar när ledaren dör eller någon saknas i packskedet. Sällsynt, men när det händer går flera vuxna förlorade för byn tills sparningen laddas om.

**300. Måltiden vid bordet hämtar första bästa mat, inte den maten personen sedan får äta**  
Var: `src/sim/hamtning.ts:94; src/sim/lager.ts:761-779; src/sim/naring.ts:102`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: HAMTAS.maltid bär till bordet den första maten i listan FOOD som personen får ta. När hen äter väljer takeFood i en annan ordning (matOrdning: det som fyller en brist först) och hoppar över mat som är för skämd, det heliga djurets kött och mat som tron förbjuder. Den som burit en sådan mat till bordet äter den inte, och den som har en brist bär inte dit maten som fyller den.  
Förslag: En liten gemensam funktion 'vilken mat tar p först' som både HAMTAS.maltid och takeFood frågar, med samma ordning och samma undantag.  
Ändras i spelet: Den som äter vid bordet bär dit det hen faktiskt äter: maten som fyller en brist först, aldrig för skämd eller förbjuden mat. Färre måltider vid bordet där inget äts. Byarna i testerna utvecklas lite annorlunda (nytt facit).  
Prövningen: Stämmer: hämtningen och ätandet väljer mat efter olika regler. Det är ett fel i ett system som redan finns och rättas i systemet, inte med en ny regel.

**301. Bara den första elden räknas på många ställen fast alla eldar ska vara lika**  
Var: `src/sim/torst.ts:73 (jfr vatskor.ts:193); src/sim/matlagning.ts:307, 311, 326; src/sim/kruka.ts:39; src/sim/projekt.ts:188; src/sim/steg.ts:287; src/sim/varg.ts:394; src/sim/forradsmal.ts:131; src/sim/brasor.ts:71, 92; src/sim/val.ts:295`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: eld.ts säger att alla eldar är lika och har nagonEld(s). Platsen "vid elden" väljs också efter den eld man hör till eller den närmaste som brinner (val.ts rad 295). Men koka mat, koka te, bränna krukor och smälta snö frågar s.fire.lit, alltså bara den första elden. Brinner härden i huset men inte den första elden kan ingen koka. Smälta snö kräver den första elden för att väljas (torst.ts) men vilken eld som helst för att bli klart (vatskor.ts).  
Förslag: Byt s.fire.lit mot nagonEld(s) för att koka mat och te, bränna krukor och smälta snö. Grillen står vid den första elden och behåller sin fråga. Vargarna (varg.ts), önskan om en lägereld till (brasor.ts) och tändmaterialets mål (forradsmal.ts) handlar mer om just byns mitt och bör ses över var för sig, inte bytas blint.  
Ändras i spelet: I en by med härd eller flera lägereldar går det att koka, smälta snö och bränna krukor så länge någon eld brinner, inte bara när den allra första gör det.  
Prövningen: Stämmer, och torst.ts och vatskor.ts säger emot varandra om samma sak. Rättningen följer det koden och dokumentet redan säger (en andra eld fungerar exakt som den första), men de tre ställen som gäller byns mitt ska inte ändras utan eftertanke.

**302. Jakten säger 'letar efter harar' vid alla djur, och djurets namn väljs på fyra ställen**  
Var: `src/ui/jakt.ts:34-59`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Rad 39 skriver alltid 'letar efter harar', också när försöket gäller rådjur eller fågel, fast rad 34, 41, 45 och 47 skiljer på arterna. Valet av djurets namn görs på fyra ställen. jaktPlats och jaktText har samma inledning, och villkoret 'jagar eller har ett försök' är onödigt: aktivt(pid) svarar ändå tomt utan försök. jaktText används bara i filen men är exporterad.  
Förslag: En liten funktion som ger djurets namn för försöket (hare, rådjur, fågel) i de former som behövs, använd på alla ställena och i raden om att leta. Slå ihop inledningen i jaktPlats och jaktText och ta bort det överflödiga villkoret.  
Ändras i spelet: Texten under Gör just nu säger rätt djur när någon letar efter rådjur eller fågel. Inget annat.  
Prövningen: Stämmer: texten för att leta är den enda som inte frågar efter arten. Inget test läser texten, så rättningen är ofarlig.

**303. ortvatten och slanda ger stationen id ur fel räknare**  
Var: `src/test/scenarier/natur.ts:2672 och 2703; samma fel i src/test/scenarier/byggnader.ts:1252 och 1360; rätt räknare i src/sim/stationer.ts:1132, src/sim/varld.ts:44 och src/test/scenarier/hjalp.ts:55`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Testen ger örtköket och vävstolen sitt id ur husens och väggarnas räknare (nextBit) i stället för stationernas (nextStation). I en ny by har vagnen redan id 1, och den nya stationen får också id 1. Den som slår upp en station på id får då vagnen. Testerna är gröna i dag eftersom de inte slår upp just den stationen på id.  
Förslag: Använd medBank(s, 'ortkok') och medBank(s, 'vavstol'), eller byt räknaren till nextStation om platsen måste vara den som står i testet. Rätta de två ställena i byggnader.ts samtidigt.  
Ändras i spelet: Ingen skillnad i spelet. Testerna slutar bygga en by som inte kan finnas.  
Prövningen: Stämmer: två stationer får samma id som vagnen. Det är ofarligt i dag men ger fel så snart koden slår upp stationen på id. Att det förklarar ett ostadigt scenario finns det inget belägg för; byarna är samma varje gång.

**304. Skäl som inte stämmer med villkoret som valde handlingen**  
Var: `src/sim/val.ts:831-833 (barn), 856 (mat), 865 (tand), 922 (fara), 1267-1269 (withTools); src/sim/handlingar.ts:347 (gomFor)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Flera av fallen är redan steg i Färdplanen: barnens skäl och radens fara i 12.1.45, tändmaterialet och flintan i 12.1.39. För barnet är det dessutom mer än text: det får också flaggan tandmat och går efter tändmaterial. Kvar utanför de stegen: matradens andra text ("Mer mat till förrådet") kan aldrig visas, eftersom raden har poäng 0 då. gomFor avgör texten "Gömmer sig för …" genom att leta efter ord i skälets början.  
Förslag: Ta bort den döda texten på matraden. Skicka hotets slag (rövare, varg, björn) som ett fält på uppgiften i stället för att läsa det ur skälet. Resten görs i stegen 12.1.39 och 12.1.45.  
Ändras i spelet: Ingen ändring i spelet för det som är kvar. Texten om vem man gömmer sig för går inte sönder om skälet skrivs om.  
Prövningen: Det mesta är redan planerat i 12.1.39 och 12.1.45. De två som är kvar är små, säkra rättningar.

**305. Den vita kanten runt tama djur har fel storlek**  
Var: `src/ui/vaxter.ts:212-213 (kant), 108, 116-117, 171; src/sim/tamdjur.ts:30-34 (ikon)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Kanten runt ett markerat djur ritas med en fast låda per art, uppräknad i koden. Tama djur får lådan för sin platshållar-art: valpen (20×14 punkter) får vargens låda (28×19), och fåret och geten (17–30 breda, 14–20 höga) får rådjurets (28×31), så ramen är för stor. Hunden och hönan råkar passa ungefär. Lådan tar inte heller hänsyn till att djur framifrån och bakifrån är smalare.  
Förslag: Låt ritaDjur lägga bildens bredd, höjd och fot i listan över synliga djur (den har redan bilden) och rita kanten efter det. Då försvinner tabellen, och varje ny djurbild får rätt kant av sig själv.  
Ändras i spelet: Bara bilden: markeringen sitter tätt runt valp, får och get, och runt alla djur som ses framifrån eller bakifrån.  
Prövningen: Stämmer mot bildernas mått i kartbilder.ts. Liten och ofarlig rättning som också tar bort en uppräknad lista.

**306. Tårtan över en persons tid lyser bara upp de tolv första bitarna**  
Var: `src/template.html:483-485; src/ui/flikar/person.ts:614-624 och 638-653`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: När musen är över en bit blir alla bitar bleka, och två mycket långa CSS-rader ger biten under musen färgen tillbaka, uppräknat för bit 0 till 11. Koden har ingen gräns på tolv: varje grupp över en procent får en egen bit. Grupperna är de tolv slagen av arbete, Handel, varje handling utan slag och Annat, alltså fler än tolv möjliga. Den trettonde biten och uppåt (de minsta) blir bara bleka när man pekar på dem.  
Förslag: Ersätt uppräkningen med något som inte beror på antalet: låt koden som redan sätter klassen vald vid tryck också sätta en klass när musen är över en bit eller rad. Två rader på över 1 000 tecken blir en kort regel.  
Ändras i spelet: Ingen skillnad, utom att även bit tretton och uppåt lyser upp.  
Prövningen: Uppräkningen slutar på 11 medan antalet bitar inte har någon gräns, så felet kan visas hos en person som gjort lite av mycket. Rättelsen tar samtidigt bort två oläsliga rader.

**307. Syskon räknas fel i närheten till fången**  
Var: `src/sim/fangelse.ts:204-206 (jämför isKin i folk.ts:389-392)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: fangNarhet har en egen släktkontroll. Syskonraden jämför fäderna utan att kontrollera att fadern är känd: har p en känd mor men ingen känd far, och fången inte heller har någon känd far (grundare och gäster har ingen), räknas de som syskon. Då bär p mat tidigt och går på besök som till en anhörig. Kontrollen är också olika åt de två hållen. Det kräver ett barn utan känd far, vilket är ovanligt (birth i liv.ts:177 kan ge det när fadern inte hittas).  
Förslag: Använd isKin(p, q) för släkten och behåll partnern på raden före. isKin vaktar redan mot okänd far.  
Ändras i spelet: Bybor utan känd far slutar behandla en främmande fånge som familj. Annars ingen skillnad.  
Prövningen: Stämmer: raden blir sann när båda saknar far. Felet är ovanligt men riktigt, och rättningen använder en funktion som redan finns.

**308. Seden Andlig visas med ett annat tal i fliken än det byn räknar med**  
Var: `src/sim/seder.ts:74, 107, 163-172`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Raden 'andlig' har en egen dragning (minnet gånger 0,05). drar() skriver över den med andligheten på rad 107, så byn räknar bara med andligheten. sedLaggning, som fliken Seder visar, lägger ihop båda.  
Förslag: Sätt radens dragning till 0, så att fliken och byn räknar likadant, och låt kommentaren säga att andligheten läggs till i drar().  
Ändras i spelet: Bara talet i fliken Seder ändras lite; byn räknar som förut.  
Prövningen: Stämmer: de två funktionerna ska enligt kommentaren ge samma tal men gör det inte. Rättningen rör bara det som visas.

**309. Texter som inte stämmer: 'hen' om en viss person och 'vid elden' på scenen**  
Var: `src/sim/tatuering.ts:85-86; src/sim/val.ts:892; src/sim/framtradande.ts:55, 482; src/sim/berattelser.ts:1752; src/test/textkoll.ts:46`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Tatueringens texter skriver 'efter att hen blev vuxen', 'för att hen dödade någon' och i valet 'X vill minnas att hen ...'. Textkollen har en kontroll som larmar för 'hen' om en viss person; den slår inte till bara för att tatueringar sällan händer i testbyarna. Tanken 'Uppträdde för N vid elden' och kvädets text 'kväder vid elden' (och mallen 'kvad vid elden' i berättelsen) skrivs också när framträdandet sker på scenen eller i gillesalen.  
Förslag: Använd han() ur ord.ts i de tre tatueringstexterna. Skriv tanken som 'Uppträdde för N' och kvädets texter utan 'vid elden'. Lägg platsens ord (pannan, kinden, halsen) i registret TATUERINGAR i stället för de två nästlade villkoren.  
Ändras i spelet: Bara texterna: rätt pronomen i loggen, valet och personens berättelse, och inget 'vid elden' när man står på scenen.  
Prövningen: Alla ställena stämmer, och 'hen' om en viss person bryter mot ordlagrets regel som textkollen vaktar. Bara texter ändras; scenarier som letar efter orden får ses över.

**310. Markerad kvarleva och runsten får aldrig sin vita kant: fel bokstav i sakVar**  
Var: `src/ui/lage.ts:94-108 (jfr src/ui/interaktion.ts:113, 116, 126, src/ui/flikar/sak.ts:208-219 och src/ui/foremal.ts:315-316)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: sakVar ger platsen för den markerade saken, och foremal.ts ritar den vita kanten där. Den letar kvarlevor under bokstaven 'k', men trycket sätter 'q:<id>'. 'k:' betyder i stället ett slag i förrådet (panel.ts). En markerad kvarleva får därför ingen kant. Runsten ('R:') och hage ('H:') finns inte alls i sakVar. Raden för 'a' (rad 98) gör samma sak som rad 96.  
Förslag: Byt 'k' mot 'q', lägg till runstenen och lägg 'a' i samma rad som de andra rutorna. Hagen är ett område och inte en ruta: den behöver kanten runt alla sina rutor, som fältet får i foremal.ts, inte en rad i sakVar.  
Ändras i spelet: Kvarlevan och runstenen får den vita kanten när de är markerade, som allt annat. Hagen får den om kanten för området också byggs. Inget i simuleringen ändras.  
Prövningen: Stämmer: 'q:' och 'R:' sätts av trycket men finns inte i sakVar, så kanten ritas aldrig. Liten och ofarlig rättning som bara syns i bilden.

**311. Testläget och Ny by går att trycka på under snabbspolningen**  
Var: `src/main.ts:100-115 (testläget), 196-201 (ny by); src/ui/spara.ts:161-212 (catchUp räknar den by som är vald just då); src/ui/byar.ts:45; src/template.html:545`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: När ikappräkningen visas som snabbspolning släpper överlägget igenom tryck, så kugghjulet fungerar. Bytet av by är redan spärrat (bytTill gör ingenting medan ui.busy är sant), så den delen av fyndet stämmer inte. Testläget och Ny by är inte spärrade. Slås testläget på räknas kopian fram till klockan i stället för byn. Väljs Ny by tar räkningen slut direkt, men rutan Välkommen tillbaka blir stående över hela skärmen utan knapp, tills sidan laddas om. Byn själv tar inte skada i något av fallen.  
Förslag: Låt testläget och Ny by göra ingenting medan ui.busy är sant, som bytet av by redan gör. En rad per knapp.  
Ändras i spelet: Inget i vanligt spel. De två knapparna svarar inte förrän byn räknats ikapp.  
Prövningen: Två av tre knappar saknar spärren som den tredje har, och Ny by kan lämna en ruta som inte går att stänga. Felet är sällsynt och ofarligt, men rättelsen är två rader efter ett mönster som redan finns.

**312. Skatteskuldens ordningskoll kan bli grön när loggraden saknas**  
Var: `src/test/scenarier/byggnader.ts:1664 (jämför 1692 och 1723)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Kontrollen 'den dödas skuld betalas före arvingarna' jämför platsen för två rader i händelseloggen med '<'. Saknas raden om skatteskulden blir dess plats -1, och -1 är alltid mindre än arvets plats. Ordningen räknas då som rätt fast raden aldrig skrevs. Systerprovet arvsskatt (rad 1723) kräver att båda raderna finns. Resten av kontrollen (byn fick 12, barnet ärvde, skulden är borta) är riktig.  
Förslag: Kräv att båda platserna är 0 eller högre, som rad 1723 gör.  
Ändras i spelet: Ingen skillnad i spelet. Testet kan bli rött när det ska.  
Prövningen: Stämmer: loggraden skrivs i skatt.ts rad 140, och utan den blir jämförelsen sann av sig själv. Rättelsen är en halv rad och kan inte ändra spelet.

**313. Byns första mästare kan utropas flera gånger**  
Var: `src/sim/steg.ts:1578-1583, 1720-1731 (compact)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: "Byns första mästare" avgörs genom att leta efter titeln bland personerna i byn. Varje timme tas döda och utflyttade utöver de 120 senaste bort. När den förra mästaren rensats bort får nästa mästare notisen igen, och alla i byn får upplevelsen en gång till.  
Förslag: Använd forstaGang(s, 'mastare_' + färdigheten), som filen redan gör för andra första-gången-händelser. Lägg en rad i migrate som sätter märket i sparade byar där någon redan har titeln.  
Ändras i spelet: Bara i gamla byar med över 120 döda: notisen och humörlyftet kommer en gång per färdighet. Utan raden i migrate kommer notisen en gång till i en sparad by.  
Prövningen: Stämmer i koden. Designdokumentet räknar "första mästaren i en färdighet" som en engångshändelse, och rättelsen är en rad med ett mönster som redan finns.

**314. Stranden och badplatsen följer inte torkan och översvämningen**  
Var: `src/sim/val.ts:443-468; src/sim/sjo.ts:126-131, 154`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: strandOf sparar strandrutorna och badplatsen tills byns område ändras eller något byggs. Rutorna kommer ur stranden som den är just nu, som flyttar sig med torkan, översvämningen och bryggorna, men det står inte i nyckeln. Under en torka badar och sitter man därför vid den gamla strandkanten, en bit från vattnet. Räknas listan om under torkan (något byggs) ligger den i stället fel när vattnet kommit tillbaka.  
Förslag: Lägg vattnets version (torkans version, översvämningens nivå och bryggornas version, som sjo.ts redan håller reda på) i nyckeln.  
Ändras i spelet: Under torka går de som badar eller sitter vid stranden till den nya strandkanten, och tillbaka när vattnet stiger. Bara byar med torka eller översvämning får annan utveckling.  
Prövningen: Jag läste båda filerna: det sparade värdet räknas inte om när vattnet flyttar sig. Rättningen är en rad och rör bara var man badar och sitter.

**315. Ett sårat djur glöms när ett annat djurs hälsa sparas**  
Var: `src/sim/djur.ts:655-660; src/sim/jakt.ts:254, 301`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: satDjurHalsa sparar ett djur som förlorat blod eller har sår (rad 658). Men när listan rensas behålls bara djur som förlorat blod (rad 657). Ett djur med sår men fullt blod försvinner ur listan så fort ett annat djur skadas. Såren räknas i jakten: ett djur dör när gamla och nya sår tillsammans når gränsen (jakt.ts:254).  
Förslag: Använd samma villkor på båda ställena (blod under 1 eller sår över 0), som en liten gemensam funktion.  
Ändras i spelet: Liten: ett skadat djur som inte blöder förblir skadat tills såret läkt av sig självt, och är lättare att fälla vid nästa försök, som det är tänkt.  
Prövningen: Stämmer: de två villkoren på raderna intill varandra säger olika saker, och såren används på riktigt i jakten. Rättelsen är en rad.

**316. Logik som läser texten som visas för spelaren**  
Var: `src/sim/flod.ts:89; src/sim/lager.ts:1321; src/sim/brand.ts:630, 654`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Hur många som redan bär undan mat från vattnet räknas genom att se om uppgiftens förklarande text börjar med 'Vattnet stiger'; texten sätts i lager.ts. I branden avgörs statistiken för hur någon släckte sig (vattnet eller rullade) av om ordet 'vattnet' står i texten. Ändras formuleringen slutar räkningen att fungera utan att något test larmar.  
Förslag: Sätt ett eget valfritt fält på uppgiften (t.ex. skal: 'flod' och 'vatten') och läs det i stället för texten.  
Ändras i spelet: Nej i dag. Det tar bort en fälla för framtida textändringar.  
Prövningen: Stämmer på båda ställena. Fältet måste vara valfritt eftersom uppgiften sparas med byn.

**317. Vargjakten väntar inte in dem som kallats (felet som rättades för björnen finns kvar)**  
Var: `src/sim/varg.ts:581-583 (jämför bjorn.ts:163-167 och varg.ts:347)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: När den första jägaren är framme räknas bara de som redan har uppgiften vargjakt. Den som kallats men först äter eller värmer sig räknas inte, så den som kallade kan anfalla flocken utan att vänta på dem. Björnjakten hade samma fel och rättades i steg 9.9.3. De flesta följare ger sig av direkt, så felet märks bara när någon är i nöd.  
Förslag: Samma villkor som björnen: de kallade räknas tills kallelsen löpt ut (f.kallTill), och med är de som är framme och jagar.  
Ändras i spelet: Vargjägarna väntar oftare in varandra (högst en halv timme i spelet), så färre möter flocken ensamma och skadas.  
Prövningen: Stämmer rad för rad, och kommentaren vid björnen beskriver just det här felet. Rättningen är två rader som redan finns prövade i björnjakten.

**318. Chansen till björnjakt slås om vid varje nytt möte med björnen**  
Var: `src/sim/bjorn.ts:84, 98, 122`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Chansen till björnjakt ska slås en gång i timmen, och timmen sparas på s.bjornJakt. Men varje gång en ny person möter björnen byts hela s.bjornJakt mot ett nytt objekt utan timme (rad 84), så beslutet körs och tärningen slås igen i samma slag, också om den redan slagits den timmen.  
Förslag: Uppdatera sedd, sag, x och y på det objekt som finns och behåll timme.  
Ändras i spelet: Björnjakt blir något ovanligare när flera möter björnen samma timme. Byarna utvecklas inte exakt som förut.  
Prövningen: Stämmer: det nya objektet saknar timme, så vakten på rad 98 släpper igenom ett slag till. Det bryter mot regeln att en chans räknas per tid, och rättningen är en rad.

**319. Prästen försörjs med ett bär som försvinner; ingen äter det**  
Var: `src/sim/kyrka.ts:376-380`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Utgiften försörja prästen tar ett bär ur kyrkans egendom och ger prästen bara en glad tanke. Bäret äts inte och mättar ingen. Utgiften för de fattiga på raden under låter mottagaren äta. Båda räknar bara med bär: har kyrkan fisk eller kött men inga bär väljs utgiften aldrig.  
Förslag: Låt prästen äta bäret med ata, som den fattige gör. Som en andra del: låt båda utgifterna ta den mat kyrkan har mest av, som gravölet redan gör (rad 709-710).  
Ändras i spelet: Ja, lite: prästen blir mätt av kyrkans mat. Med den andra delen kan kyrkan dela ut annan mat än bär.  
Prövningen: Stämmer. En hel sak mat försvinner utan att någon äter den, medan raden under och gravölet gör rätt. Designdokumentet (Kyrkans ekonomi) säger att kyrkan försörjer prästerna.

**320. Trons "heliga skrift" räknar bara stenar, inte de heliga kvädena i en bok**  
Var: `src/sim/skrift.ts:49 (slaget helig: sten och bok), 221, 266, 352-353; src/sim/religion.ts:439, 445; src/sim/kult.ts:192, 202; src/sim/kyrka.ts:639`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: runstenTimme sätter tr.skrift en gång i timmen, och ser bara efter heliga runstenar. Prästen kan också skriva de heliga kvädena i en bok, men boken räknas inte: tron sprids inte lättare och buden blir inte svårare att rösta bort av den.  
Förslag: Låt raden i runstenTimme också räkna en bokdel med trons nummer (k.tro === tr.id). Flaggan på tron står kvar: designdokumentet säger att svaret räknas en gång i timmen och sparas på tron, så att inget söks i varje samtal.  
Ändras i spelet: Ja, lite: en tro vars kväden står i en bok får samma fördelar som en med en helig sten (sprids lättare, buden sitter hårdare, profeten grundar oftare en ny tolkning).  
Prövningen: Stämmer att boken inte räknas, och designdokumentet (Samhället, Heliga skrifter) talar om en tro "med skrifter" och att kvädena skrivs i en bok. Läsarens andra del faller: den sparade flaggan är beskriven och önskad i dokumentet, så den tas inte bort.

**321. Ingen läser byns böcker när bläcket är slut och inga lösa blad finns**  
Var: `src/sim/val.ts:1435; src/sim/skrift.ts:461-473 (lasVal)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Fritidsvalet för skrift börjar med "finns det ett skrivet blad eller bläck i byn, annars inget". Böcker räknas inte. En by som har allt i böcker och fått slut på bläcket läser därför inte sina handböcker, kartböcker eller heliga kväden, fast lasVal skulle hitta dem.  
Förslag: Låt villkoret också godta en bok (t.k === 'bok').  
Ändras i spelet: Ja, lite: böcker blir lästa också när byn saknar bläck och lösa blad, så en teknik som bara står kvar i en handbok går inte förlorad av den orsaken.  
Prövningen: Stämmer: villkoret ser bara ting av slaget blad och behållare med bläck, och lasVal anropas inte annars. Rättningen är ett ord i ett villkor.

**322. Brottning på den heliga dagen: budet räknas en gång per slag, slumpen dras varje slag och övningen uteblir**  
Var: `src/sim/sport.ts:301-314; src/sim/kyrka.ts:302 (budHindrar)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: I sportSteg, när ringen är ledig, dras först en motståndare med slump och sedan frågas budet om ingen strid. Hindrar budet räknas statistiken bud_ingenStrid och steget avbryts. Det händer varje slag så länge matchen pågår: statistiken ökar en gång per slag och spelare, slumptalet dras varje slag (så antalet dragningar beror på slagets längd, tvärt emot regeln om klockan), och den troende får ingen övning och ingen speltid räknad.  
Förslag: Fråga budet innan motståndaren dras, och hoppa bara över kampen (ingen return). Räkna budet en gång per match och spelare, till exempel med en markering på matchen.  
Ändras i spelet: Knappt märkbart: statistiken för budet blir rimlig, slumpen dras inte i onödan, och den troende som står i ringen får speltiden räknad som de andra.  
Prövningen: Stämmer rad för rad. Räkningen per slag och slumpdragningen per slag bryter mot regeln att inget räknas per slag. Om den troende ska få övning utan att brottas är en liten smaksak; det viktiga är räknaren och slumpen.

**323. ARKITEKTUR beskriver ett äldre framträdande än det som finns**  
Var: `ARKITEKTUR.md:142; src/sim/framtradande.ts:88; src/sim/roller.ts; src/sim/tatuering.ts`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Kodkartans rad om framtradande.ts säger att framVal körs i night efter vakten, att chansen är FRAM.vilja × framKval när minst FRAM.publik sitter vid elden (PUBLIK), och att föreläsningen delar lärdomar med share. Inget av FRAM.vilja, FRAM.publik eller PUBLIK finns kvar i koden. Kallelsen (viljaTim, framProv, lyssnaVal), föreläsningens ämne, gruppen och beställda minnen nämns inte alls i ARKITEKTUR. Filerna roller.ts och tatuering.ts nämns inte heller. Kommentaren vid FRAM.egen hänvisar till ett tal 'publik' som inte finns.  
Förslag: Skriv om raden efter koden som den är, lägg till rader för roller.ts och tatuering.ts, och rätta kommentaren vid FRAM.egen.  
Ändras i spelet: Ingen märkbar skillnad (bara dokumentationen som Claude läser före varje ändring).  
Prövningen: Sökning i ARKITEKTUR.md bekräftar att de gamla namnen står kvar och att de nya inte finns där. Kartan läses före varje ändring, så fel där leder till fel i koden; rättelsen kan inte ha sönder något.

**324. Fem krönikerader har ett slag som ingen kategori känner till**  
Var: `src/sim/historik.ts:52-62 (KRONIKA_KAT); src/sim/giftermal.ts:49 och 60, src/sim/byflytt.ts:257 ('utflytt'); src/sim/resa.ts:1204 ('grannar'); src/sim/special.ts:38 ('mat'); src/ui/flikar/kronika.ts:21-22; src/ui/borta.ts:22; src/test/scenarier/agande.ts:2904`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Krönikans filter visar en rad i en kategori bara om radens slag står i kategorins lista. Tre anrop skriver slaget 'utflytt' (listan har 'flytt'), hemkomsten från en turné skriver 'grannar' (det är kategorins namn, inte ett slag) och byns tradition skriver 'mat' (finns inte). De raderna syns bara när ingen kategori är vald. Scenariot kronikakat har redan en kontroll, men den ser bara slag som råkar skrivas under tre dygn.  
Förslag: Enklast: lägg 'utflytt' i Liv, 'grannar' i Handel och grannar och 'mat' i en passande kategori i KRONIKA_KAT. Då hamnar också rader i redan sparade byar rätt. Gör scenariots kontroll fast: en lista över alla slag som koden skriver, som jämförs med registret.  
Ändras i spelet: Utflyttningar genom giftermål och byflytt, hemkomsten från en turné och byns tradition syns under rätt kategori i Krönikan. Inget i byns utveckling ändras.  
Prövningen: Jag räknade alla slag som skrivs och jämförde med registret: just de tre saknas. Rättelsen är några ord i ett register och kan inte ändra byn.

**325. "Blödningen har stoppats" kan skrivas medan såret fortfarande blöder**  
Var: `src/sim/halsonotiser.ts:21 (blods), 29-32 (blods och stoppad), 35-38 (infektion och infborta); src/sim/halsa.ts:333-338 (tidKvar, blodning), 502 (såret levrar sig lite i taget)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Notisen "Blödningen hos X har stoppats" kommer när personen inte längre förblöder inom 24 timmar. Ett litet eller medelstort sår levrar sig lite i taget, så tiden kvar går över 24 timmar medan såret fortfarande blöder svagt, och då står det att blödningen stoppats. Samma värde räknas och sparas dessutom två gånger: blods och stoppad är samma tal, liksom infektion och infborta.  
Förslag: Låt texten säga "Blödningen hos X har avtagit" när såret fortfarande blöder och "har stoppats" först när blödningen är noll. Att slå ihop de två paren till en rad var sparar bara ett par rader och kräver att raden kan välja notis efter riktning; det är inte värt besväret.  
Ändras i spelet: Bara notisens ord. Faran är över i båda fallen, så notisen kommer vid samma tid som i dag.  
Prövningen: Jag kontrollerade att blödningen sjunker gradvis (halsa.ts:502), så notisen kan komma innan såret slutat blöda. Det är ett litet fel i en text, och rättelsen kan inte ändra byn. Sammanslagningen av paren håller inte som egen vinst.

**326. Raden om första gången någon fyller vattenhon skrivs aldrig**  
Var: `src/sim/vattenho.ts:56-57 (forstaGang i src/sim/folk.ts:485, count i folk.ts:449)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: hoFyll räknar först upp räknaren hoFylld med antalet vatten och frågar sedan forstaGang med samma namn. forstaGang räknar själv upp samma räknare med 1 och svarar ja bara om den då är exakt 1. Den är redan minst 2, så svaret blir alltid nej. Raden "X hällde vatten i vattenhon åt djuren" kommer aldrig, och räknaren blir ett för hög per påfyllning.  
Förslag: Fråga forstaGang med ett eget namn (t.ex. hoFylldForst), eller titta på räknaren före count. En rad.  
Ändras i spelet: Första gången någon fyller vattenhon skrivs det i loggen, som det var tänkt. Inget annat ändras.  
Prövningen: Stämmer rad för rad: count går före forstaGang med samma namn, så villkoret kan aldrig bli sant. Räknaren hoFylld läses bara av scenariot som skillnad och det tål en etta mindre per påfyllning.

**327. Budgeten bokför att en del fick något också när inget lämnades**  
Var: `src/sim/budget.ts:118 (kyrkan.ge), 124-131 (gavor.ge), 175-184, 211; src/sim/lon.ts:128-133; src/sim/lager.ts:240-250 (fromByn); src/ui/flikar/styre.ts:105-108`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: I budgetDygn skrivs det delen fick, och räknaren budgetVarde höjs, direkt efter att delen lämnat vidare, utan att se vad som verkligen lämnades. Gåvorna och medborgarlönen delar silvret jämnt och avrundar nedåt: räcker det inte till ett silver var lämnas inget alls, och annars blir resten kvar hos byn. Fliken Styre visar ändå att delen fick allt. Byns silver räknas dessutom över alla högar medan fromByn bara tar ur det som ligger i förrådet.  
Förslag: Låt ge svara hur mycket som lämnades, och bokför det talet i fick och i räknaren (också för grenen som bara flyttar ägare). Om silvret ska delas så att några får ett silver när det inte räcker till alla är en ändring i spelet och kan vänta.  
Ändras i spelet: Siffrorna i budgeten i fliken Styre stämmer med vad som verkligen lämnades. Inget annat ändras om bara bokföringen rättas.  
Prövningen: Stämmer: det som visas och räknas är det tilldelade, inte det lämnade. Att rätta bokföringen ändrar bara siffror som visas; den andra halvan av förslaget (dela ut ett silver till några) lämnas eftersom den ändrar vem som får.

**328. Hälsoflikens förklaring stämmer inte med talen den förklarar**  
Var: `src/sim/halsa.ts:282, 291, 293-318, 381-387, 396`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Listan för medvetandet (medDelar) saknar bigiftet, som själva talet (medvetande) räknar med. Smärtans lista saknar antalet bistick (w.n) och den kroniska smärtan av det som läkt fel. Händighetens lista saknar medvetandet, blodförlusten, ruset och den spjälade armen, och rörlighetens saknar ruset. Spelaren ser alltså delar som inte räcker till talet bredvid.  
Förslag: Lägg till raderna som saknas i listorna (bigift, bistickens antal, kronisk smärta, lågt medvetande, blek och yr, berusad, spjälad arm), och lägg en kontroll i scenariot halsoflik att delarna ger värdet. Behåll den snabba uträkningen av medvetandet: kommentaren säger att den frågas i varje arbetsbit och därför inte bygger en lista. Händigheten och rörligheten är produkter av faktorer, så en ren summa går inte att göra av dem.  
Ändras i spelet: Nej, bara förklaringen i hälsofliken blir rätt.  
Prövningen: Jag jämförde listorna med uträkningarna rad för rad, och delarna saknas. Jag ändrade förslaget: att räkna allt som en lista vore långsammare (medvetandet) och går inte för tal som är produkter, så det räcker att fylla i raderna.

**329. Andligheten i byn visas på två skalor på samma rad**  
Var: `src/ui/flikar/religion.ts:88 (jämför 60-61, 74)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: I listan "Andligheten i byn" säger texten vid musen "Andlighet X av 10", men talet sist på raden är andligheten avrundad på skalan 0–100. Listan De troende strax ovanför har ingen siffra alls bredvid stapeln.  
Förslag: Ta bort talet sist på raden, så att stapeln står ensam som i De troende. Vill man ha ett tal ska det vara på skalan 0–10.  
Ändras i spelet: Talet 0–100 efter varje person i Tro-flikens lista försvinner; stapeln och texten vid musen är kvar.  
Prövningen: Stämmer. Designdokumentet (Tydligare gränssnitt: Tro) säger att andligheten visas 0 till 10 i en stapel "utan tal bredvid", så talet är en rest; därför ändrade jag förslaget från att byta skala till att ta bort talet.

**330. Stridsansiktet minns mellan byar**  
Var: `src/ui/stridansikte.ts:16-26`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: När någon slåss sparas tiden i en tabell för hela programmet, med bara personens nummer som nyckel. Den töms inte när en annan by visas, fast alla andra sådana tabeller i gränssnittet töms med vidNyBy. Varje by numrerar sina personer från 1. Visas sedan en by med tidigare klocka (till exempel tillbaka från testläget, som spolat fram) blir tiden sedan striden negativ, och personen med samma nummer ser arg ut tills klockan gått förbi.  
Förslag: Töm tabellen med vidNyBy (en rad), och räkna bara tider som ligger bakåt (0 <= s.now - t < minne).  
Ändras i spelet: Ingen i en annan by ser arg ut utan orsak. Annars ingen skillnad.  
Prövningen: Stämmer: tabellen senast finns inte i vidNyBy, och nextId börjar på 1 i varje by. Rättningen är en rad och kan inte ändra något annat.

**331. Såren blöder två gånger under en strid på kartan**  
Var: `src/sim/strid.ts:102-103, 498, 518, 630, 762; src/sim/kartstrid.ts:205, 216; src/sim/halsa.ts:55, 337, 495-496; src/sim/steg.ts:759`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 6 rader bort.  
I dag: Striden har sin egen blödning (STRID.blodSek på kämpens sår) och hälsan sin (HALSA.blodTim på personens sår). På kartan sätts såret på personen direkt, kämpens blod läses från personen före varje stridssteg och skrivs tillbaka efter, och hälsan räknas för alla varje slag. Samma sår drar alltså blod i båda. Stridens takt är ungefär sex gånger hälsans (3,6 mot 0,6 per timme), så dubbelräkningen är runt en sjättedel. När en vän trycker på såret i striden (rad 518) stoppas bara stridens blödning; personens sår blöder vidare.  
Förslag: Ett ställe för blodet: på kartan räknar bara hälsan blödningen (med en faktor för ansträngningen i strid), och att trycka på såret gäller personens sår. Stridens egen blödning behövs då bara där det inte finns någon person (arenan, djuren). Balanstalet ställs i fasens Balans om en gräns bryts.  
Ändras i spelet: Skadade förblöder något långsammare under strid. Att trycka på såret börjar gälla det riktiga såret, så den räddade blöder mindre också efter striden.  
Prövningen: Jag räknade om talen och de stämmer: samma sår blöder i två system samtidigt, och trycket på såret når inte personens sår. Det är ett fel mot 'ett ställe per sak', men ändringen rör balansen i striderna och bör vara ett eget steg med det stora testet.

**332. Blöt ved blir torr när den flyttas, tvärtemot kommentaren och designdokumentet**  
Var: `src/sim/blotved.ts:13 och 35-36; src/sim/lager.ts:91 och 669`. Vinst 3 av 5, risk 3 av 5, medel.  
I dag: Märket blöt sitter på högen på en ruta. Den enda rad i src/sim som sätter det är regnet i blotved.ts:36. lager.ts läser bara märket (torr ved tas först, rad 669) och för det aldrig vidare. Blöt ved som bärs till en ny eller torr hög räknas som torr direkt. Torr ved som läggs på en blöt hög blir blöt. Designdokumentet (Blöt ved, steg 7.3.4) säger: "läggs blöt ved på en torr hög blir högen blöt".  
Förslag: För märket vidare när ved flyttas: bördan minns om veden togs ur en blöt hög, och målhögen blir då blöt. Det kräver ett märke på det som bärs. Enklare men sämre: rätta bara kommentaren och meningen i dokumentet.  
Ändras i spelet: Med rättelsen är blöt ved som bärs in under tak fortfarande blöt tills den torkat. I dag torkar den i samma stund som den flyttas, så vedboden hjälper mer än den borde.  
Prövningen: Stämmer: lager.ts sätter aldrig märket, och designdokumentet säger uttryckligen att blöt ved gör högen blöt. Koden följer alltså inte det som står, och rättelsen är att göra som dokumentet säger.

**333. Dygnet räknas på två sätt: kalendern efter lokal midnatt, heliga dagar och fester efter UTC**  
Var: `src/sim/tid.ts:32-35 (dagNr, midnatt, dygnStart); src/sim/kyrka.ts:300, 502; src/sim/kult.ts:74, 376, 380, 384, 385, 448; src/sim/kultlatt.ts:23; src/sim/fynd.ts:283, 316, 382, 390; src/sim/steg.ts:1247, 1268; src/sim/historik.ts:82-95; src/sim/kartminne.ts:56-57; src/sim/berattelser.ts:2552`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 5 rader bort.  
I dag: Kalendern byter år vid midnatt lokal tid. Omkring femton andra ställen räknar dygnet som tiden delat med ett dygn, som byter vid midnatt UTC: klockan 01 svensk vintertid och 02 sommartid. Den heliga dagen och festdagen börjar och slutar därför en eller två timmar in på nästa år i spelet, och festens klockslag flyttar sig en timme mellan sommar- och vintertid. dagNr finns i tid.ts men är inte exporterad. För historiken är UTC-gränsen redan känd och godtagen i designdokumentet (Läget, kända brister).  
Förslag: Exportera en enda funktion för dygnets nummer ur tid.ts (dagNr, som följer lokal tid) och låt heliga dagar, högtiden och festen fråga den. Värmekartorna, viltet, historiken och kartminnet kan byta samtidigt eller lämnas; där märks gränsen inte.  
Ändras i spelet: Ja, lite: heliga dagar och festdagar följer året i spelet (midnatt till midnatt), och festen börjar samma klockslag året om. Testerna går i UTC (src/test/utc.ts), där de två sätten ger samma dygn, så facit ändras troligen inte; läsarens uppgift om nytt facit för alla byar stämmer inte.  
Prövningen: Skillnaden finns i koden och syns för spelaren i svensk tid som en helig dag som går över årsskiftet. Rättningen är liten och rör inte testbyarna, men en pågående fest eller högtid i en sparad by kan byta dag om den sparats strax efter midnatt.

**334. Byns egen plats räknas ut på flera ställen, och några blir fel för en väckt by**  
Var: `src/sim/ort.ts:115, 121, 210, 222, 343, 368; src/sim/grannbyar.ts:25`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 4 rader bort.  
I dag: iNaromradet och kannerOrt tar hemmet som s.vackt ?? vl.huvud (en väckt by har sin egen plats, steg 11.13.15). bynKanner (210), bynsKarta (222), platsRuta (343) och hortHandelse (368) använder bara vl.huvud. I en väckt by svarar bynKanner att huvudbyns plats är besökt och känner inte sin egen. bynKanner används av byns part i handeln (behov.ts:658). grannbyar.ts:25 har en egen huvudPlats(s) som dessutom klarar den lilla kartan för en plats (vacktPlats); det gör ingen av raderna i ort.ts.  
Förslag: En exporterad hemPlats(s) (huvudPlats flyttad från grannbyar.ts) som alla ställena frågar. Ett ställe och samma svar överallt.  
Ändras i spelet: I en grannby som väckts känner byn sin egen plats och inte huvudbyns. I huvudbyn märks ingen skillnad.  
Prövningen: Stämmer: fyra funktioner i samma fil frågar bara huvudbyn medan två tar hänsyn till den väckta byn. Huvudbyn räknas exakt som förut, så risken ligger bara i de väckta byarna.

**335. Kontroller som blir gröna när det de ska pröva saknas**  
Var: `src/test/scenarier/fas11.ts:1344,1460,1484,1767,1773,2049,2161`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Tre rader (1767, 2049, 2161) prövar att målet finns efter att det redan använts; saknas det kraschar scenariot innan raden nås. Fyra rader (1344, 1460, 1484, 1773) har en utgång som ger grönt om platsen, grannen, främlingen eller förbindelsen saknas, så att inget prövas alls i det fallet. Raden 1229 (handlaren kommer från en by) är en riktig kontroll och hör inte hit. Raden 2050 har en utgång som ser avsiktlig ut.  
Förslag: Ta bort de tre 'målet finns'-raderna eller flytta namnet till en annan rads text. Gör de fyra utgångarna röda när det som ska prövas saknas, så att uppställningen måste ge en plats, en granne och en främling. Rör inte 1229 och 2050.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Raderna är som läsaren sa, utom 1229 och 2050 som jag tog bort ur fyndet. Skärps utgångarna kan ett scenario bli rött för att testbyn saknar till exempel en granne till grannen; då får uppställningen rättas. Därav lite högre risk.

**336. Besökaren hämtar alltid en gravgåva men lägger den bara ibland**  
Var: `src/sim/grav.ts:538-557; src/sim/val.ts:1396`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Samma slinga som väljer den minst värda gåvan står i gravbesokHamtas och i gravbesokKlar. Besökaren hämtar alltid en gåva (också mat), men lägger den bara med chansen BESOK.gava gånger bandet. Annars har saken burits till graven i onödan och blir kvar hos besökaren.  
Förslag: Avgör när besöket väljs i val.ts om en gåva ska med, spara det på uppgiften, och låt en gemensam funktion välja gåvan på båda ställena.  
Ändras i spelet: Nästan ingen: besökare går inte omvägen till förrådet efter en sak de sedan inte lägger på graven. Slumpen dras på ett annat ställe, så byarna utvecklas lite annorlunda.  
Prövningen: Stämmer. Slumpen ska dras när besöket väljs, inte i gravbesokVal som frågas vid varje val av fritid. Uppgiftens fält 'tool' är redan upptaget av lagningen, så det behövs ett eget fält.

**337. Fyra kontrollvillkor som alltid stämmer eller har en död del**  
Var: `src/test/scenarier/fas11.ts:481,490,914,2058,2850`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: På 481 och 490: 'de äldsta försvinner först' blir alltid sant när antalet är lika med taket, och det kravet står redan bredvid. Ordningen prövas alltså inte. På 2850: 'saker togs' jämförs med sig självt, eftersom antalet räknas ur samma lista. På 914: att den nya byn har högst lika många tekniker följer av villkoret före. På 2058: en del av uttrycket ger noll i båda fallen, men själva kravet (högst ett beslut) kan bli rött. Raden 1189 är inte en självklarhet; den är bara vid och kan bli röd.  
Förslag: 481: ta bort 'eller lika med taket', så att kravet blir att inga gamla små händelser finns kvar. 2850: kräv att något togs när anfallet vann. 914: ta bort den överflödiga delen eller kräv 'färre än moderbyn'. 2058: skriv 'högst 1'. Låt 1189 vara.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Tre av villkoren kan inte bli röda och ett har en död del; jag räknade igenom dem. En skärpt kontroll kan visa ett riktigt fel som inte synts förut, och det är meningen. Raden 1189 togs bort ur fyndet.

**338. Torr ved räknas för hela byn, inte för den som eldar**  
Var: `src/sim/blotved.ts:48-52; src/sim/eld.ts:138 och 277; src/sim/byggnader.ts:177-181; src/sim/lager.ts:184-187 och 669`. Vinst 2 av 5, risk 2 av 5, medel, ungefär 2 rader bort.  
I dag: När någon lägger ved på elden räknas andelen blöt ved som (det hen tar − byns torra ved) / det hen tar. torrVed tar all ved i förrådet, också andras privata ved som hen inte får ta. Har grannen torr ved och hen själv bara blöt, brinner hens blöta ved som torr. Måttet haltar på två sätt till: blöta högar som ligger utanför lagret dras av fast de aldrig räknades med, och ved som bärs i famnen räknas som blöt när förrådet saknar torr ved. Samma mått används för chansen att tända (rad 277). vedForlust i byggnader.ts räknar blöt och all ved med en egen slinga.  
Förslag: Låt uttaget i lager.ts (som redan tar torra högar först) svara hur mycket av det som togs som var blött, och använd det i takeFuel. Hänger ihop med fyndet om att märket blöt inte följer med veden när den bärs.  
Ändras i spelet: Den som bara har blöt ved att elda med får en eld som brinner fortare, också när någon annan i byn har torr ved. Sällan märkbart i byar där veden är gemensam.  
Prövningen: Stämmer: måttet räknar hela byns ved men uttaget följer ägandet, och det finns två fel till i samma mått. Bör rättas tillsammans med fyndet om blöt ved som flyttas, eftersom båda handlar om att veta vad som faktiskt togs.

**339. Listan över vilka elden inte får avbryta är en egen hård lista med luckor**  
Var: `src/sim/eld.ts:430-431, 436, 447; src/sim/handlingar.ts:86-87, 115, 136, 308-313, 323-324`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: stepFire avbryter den den väljer till att fylla på eller tända. För att inte rycka folk ur en fara finns listan I_NOD i eld.ts med 11 handlingar, plus fältet nodFri i registret. Sju av de elva har redan nodFri. Samtidigt saknas flyEld, flyBin, hjalpaBrinnande, bjornjakt och vargjakt i båda, så de kan skickas att hämta ved eller tända.  
Förslag: Ta bort I_NOD och fråga registret. Obs: fältet fortsatter går inte att använda rakt av, för vakten har det (mot varg) och vakten ska kunna fylla på elden (den får till och med ett plus i poängen, ELD.valjVakt). Lägg i stället ett eget fält eller nodFri på varda, slacka, slackaSig, fly, flyEld, flyBin, hjalpaBrinnande, bjornjakt och vargjakt.  
Ändras i spelet: Den som flyr från en brand eller bin, släcker elden på någon eller är mitt i en björn- eller vargjakt skickas inte längre att sköta lägerelden. Annars ingen märkbar skillnad.  
Prövningen: Luckorna finns i koden, och listan hör hemma i registret över handlingar. Läsarens förslag att använda fortsatter skulle dock stänga ute vakten, så det behöver ett eget fält.

**340. Undantaget för gädda och braxen döljer att gäddköttets recept saknar 'ger två'**  
Var: `src/test/scenarier/natur.ts:72-75 (receptOk); src/sim/recept.ts:102 (gaddkott) och 98 (braxkott, som har ger: 2); src/sim/redskap.ts:121; src/sim/varde.ts:69`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Kontrollen jämför receptet med det slakten ger, men släpper igenom gädda och braxen utan att titta. Braxens recept är rätt (en braxen ger två kött), men testets räkning tar inte hänsyn till 'ger'. Gäddans recept säger en gädda per kött fast en gädda ger två, så gäddköttet värderas som om det kostade en hel gädda. De tre andra delarna i läsarens fynd stämmer inte: sjöns ruta skyddas av raden som kräver fiskeförsök, rånet kräver redan minst 8 av 12 byar, och krönikeraden kräver exakt en rad.  
Förslag: Lägg till ger: 2 i gäddköttets recept som hos braxen. Låt testet räkna med 'ger' och ta bort undantaget för de två arterna.  
Ändras i spelet: Lite: gäddköttets värde blir ungefär hälften, som braxköttets redan är. Det märks i byten och handel med gäddkött, inte i vad en gädda ger.  
Prövningen: Undantaget i testet gömmer ett litet fel i registret, och rätt väg är att rätta registret. Bara den delen av fyndet håller; de andra tre kontrollerna kan bli röda som de står.

**341. På natten styr samma slumptal både bärandet och berättandet**  
Var: `src/sim/val.ts:1473-1488`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: night drar ett enda tal och använder det till allt. Under 0,35 bär man in det som ligger ute. Annars berättar den vars tal är under berättandets tröskel (färdigheten delad med 40, oftast under 0,35). När något ligger ute inom räckhåll blir därför den som skulle ha berättat alltid bärare, och nästan ingen berättar den kvällen. Också den nedre delen av handarbetets andel försvinner så. Ligger inget ute fungerar det som tänkt.  
Förslag: Minsta rättningen: ge bärandet ett eget slumptal, så att de andra valen behåller sina andelar. Vill man gå längre görs nattens val till en lista med vikter som fritiden på dagen.  
Ändras i spelet: Det berättas lite oftare vid elden de kvällar då saker ligger ute. Annan slump på natten.  
Prövningen: Felet finns i koden: två val som ska vara oberoende delar på samma slumptal. Läsaren hade delvis fel om handarbetet (det äts upp av bärandet, inte av berättandet), och det räcker med ett eget slumptal, så inga rader sparas.

**342. Vilodag och bud lämnar kvar arbetets märken; virke utan yxa ger fel skäl**  
Var: `src/sim/val.ts:975-982, 527, 991, 999-1000, 1099-1109`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: När tron, rädslan eller vilodagen byter det valda arbetet mot vila nollas platsen, redskapet och ref, men inte märkena för flintletande, tändmaterial, det som hämtas, bygget, lönen, passet och kälken. Den som vilar räknas då som arbetare på raden tändmaterial eller leta, och kan ta kälken med sig. I bygget: saknas virke och ingen yxa är ledig faller koden igenom till att hämta ved med skälet 'Bygget behöver virke'. Kan en yxa göras görs den först; annars samlar p ved för hand under fel skäl.  
Förslag: Börja om med ett tomt val när arbetet byts mot vila (bara handling, skäl och tid). För virket: gå till yxans projekt om den kan göras, och låt annars bygget vänta, som det redan gör för det som görs vid en station.  
Ändras i spelet: På vilodagar räknas de som vilar inte längre som arbetare, så raderna fylls rätt. Ingen samlar ved 'till virke'. Liten skillnad i byar med vilodag eller timmerhus.  
Prövningen: Båda felen finns i koden. Det första gör att en vilande person upptar en arbetsplats på en rad; det andra ger ett skäl som inte stämmer med vad personen gör.

**343. Tecknet "fältet som gav dubbelt" kan aldrig komma**  
Var: `src/sim/odling.ts:171-176,512-513; src/sim/religion.ts:243,268`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Vid skörden ges tecknet 'dubbelt' när skördens andel är minst 1,5. Andelen kommer från skordAndel, som aldrig blir större än 1. Villkoret är alltså aldrig sant. Designdokumentet (Samhället, tecknen i steg 8.5.18) säger att tecknet ska finnas: ett fält som gav dubbelt mot de andra, för odlaren, med chansen 0,3.  
Förslag: Rätta villkoret så att det följer dokumentet: jämför fältets skörd per ruta med de andra fältens, och ge tecknet när den är minst dubbelt så stor. Ta inte bort tecknet.  
Ändras i spelet: Odlaren kan få ett tecken efter en ovanligt bra skörd, och det kan bli en ny tro. Det händer aldrig idag.  
Prövningen: Felet stämmer: andelen är högst 1 och jämförs med 1,5. Dokumentet vill ha tecknet, så det ska rättas och inte tas bort.

**344. Rättens tid på elden i krukan och kokgropen spelar ingen roll**  
Var: `src/sim/matlagning.ts:316,323-335,454,469-475; src/sim/ratter.ts:103-111; src/sim/steg.ts (raden stepKok i TAKTER); src/sim/stationseld.ts:71-85`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Krukan får tiden ur registret (gröt 5, gryta 10, soppa 15 minuter, kokgropen 30). Men stepKok och stepGrop räknas en gång i timmen och drar då en hel timme. Varje rätt är därför klar vid nästa timslag, vilken tid den än har. Designdokumentet säger att tiderna följer klockan. Degen i bakugnen räknas däremot ner varje minut efter ugnens eld.  
Förslag: Räkna ner krukan och gropen med tiden sedan sist, oftare än en gång i timmen (till exempel varje minut som stationernas eldar), så länge elden brinner.  
Ändras i spelet: Maten blir klar efter den tid som står i registret (5–30 minuter, 30 timmar till 7,5 dygn i spelet) i stället för vid nästa hela timme. Oftast lite tidigare än idag.  
Prövningen: Stämmer i koden, och dokumentet säger uttryckligen att gröten kokar 5 minuter, grytan 10 och soppan 15. Ändringen är liten men byarna utvecklas lite annorlunda, så facit ändras.

**345. Tornadons kärna lämnar gräset orört, fast zonen utanför river upp det**  
Var: `src/sim/tornado.ts:340 (nära), 443-479 (kärnan), 455; src/ui/vaxter.ts:227; src/test/scenarier/grund.ts:1329 (tornadokarna)`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: I zonen nära blir gräset bar jord, och rutan läggs i listan som ritar tornadons spår. I kärnan, som ska förstöra allt, rörs gräset inte, och under ett vält träd sätts det till högt gräs. Kärnans rutor läggs inte heller i listan för spåret. Designdokumentet säger att kärnan förstör allt och att gräset slits upp till en jordstig nära; scenariot tornadokarna kontrollerar inte marken.  
Förslag: Låt kärnan göra marken bar och lägga rutan i spåret, som zonen nära, och lägg en kontroll i scenariot. Bekräfta i en körning och titta på bilden: jag har bara läst koden.  
Ändras i spelet: Ja, lite. Tornadons spår blir en hel remsa bar jord, också i mitten, och växer igen som annan mark.  
Prövningen: Koden gör som läsaren säger, och det stämmer dåligt med att kärnan förstör allt. Ingen kommentar förklarar varför gräset under ett vält träd sätts till högt. Ändringen är liten men syns i bilden.

**346. Arvingen som också vinner omröstningen får sämre legitimitet än en omstridd arvinge**  
Var: `src/sim/styre.ts:364-372`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Rad 372 sänker delen för hur ledaren tillsattes när den som blev ledare är samma person som byns röst pekade på och sättet inte var val. Det händer både när sättet (arv, utsedd, präst, strid) inte gav någon kandidat och när sättet och rösten var överens. Den som alla är överens om börjar alltså lågt. Talet 0.2 står löst i koden.  
Förslag: Kom ihåg om sättet inte gav någon kandidat (raden best ??= valet) och sänk bara då. Flytta 0.2 till balansblocket TRON.  
Ändras i spelet: Ja: en ledare som tillträder enligt byns sed och har byns stöd börjar med full del i stället för halv. Den delen väger en tiondel av legitimiteten.  
Prövningen: Stämmer. Kommentaren och designdokumentet säger att bara den som tog makten på ett sätt sederna inte godtar ska börja lågt. Koden straffar också den som både sederna och byn valde.

**347. Framträdandet blir hängande om den som uppträder dör eller avbryts**  
Var: `src/sim/framtradande.ts:293-296, 396-401, 405-419, 422-446; src/ui/flikar/fram.ts:62-63`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: s.fram nollställs bara i upptradaKlar, som körs när ledarens uppgift blir klar. Dör hen eller avbryts under väntan eller mitt i framträdandet ligger s.fram kvar. Publiken och medspelarna sitter kvar till sluttiden eftersom lyssnaSteg och upptradaSteg bara kontrollerar att s.fram finns. Ingen glädje ges och inget minne sparas. s.fram ligger sedan kvar tills nästa framträdande skriver över det, så fliken visar 'Pågår' under tiden. Kommentaren på rad 294 visar att kvarliggandet var känt men bara tänkt för det vanliga slutet.  
Förslag: En liten hjälpfunktion som säger om den som leder lever och har uppgiften 'upptrada' med samma ref; annars sätts s.fram = undefined. lyssnaSteg, upptradaSteg (medspelarna) och framOppen använder den.  
Ändras i spelet: När skalden dör eller springer till ett larm går publiken hem direkt i stället för att sitta kvar och lyssna på ingen i upp till en timme, och fliken slutar visa ett framträdande som inte pågår.  
Prövningen: Jag hittade inget annat ställe som tömmer s.fram än upptradaKlar, så felet finns, fast det händer sällan (död eller avbrott under 45–75 minuter). Rättelsen är några rader; den ändrar likheten bara i de fallen.

**348. Gästernas törst gör ingenting, och dödsorsaken blir 'av kyla' för allt som inte är sjukdom eller svält**  
Var: `src/sim/gastvardag.ts:112-119 (jämför src/sim/steg.ts:733-755)`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Gästens kropp frågar halsaLage, som kan svara 'svalt', 'frys', 'torst' eller 'laker'. Gästkoden hanterar inte 'torst': en gäst utan vatten förlorar ingen hälsa, men läker inte heller. Dödsorsaken blir 'av kyla' för allt utom sjukdom och svält. Påståendet att en fånge alltid svälter stämmer inte: byborna bär mat och vatten till alla i fängelset, också gäster (matTillFange i fangelse.ts, torst.ts rad 244). Att gästen äter ur sin egen packning och inte rör byns mat prövas av ett scenario och är avsett.  
Förslag: Lägg till grenen 'torst' med bybornas takt (TORST.tomTim) och skriv 'av törst' som dödsorsak när törsten är noll. Rör inte matsäcken eller fångens mat.  
Ändras i spelet: En gäst som blir helt utan vatten tappar hälsa och kan dö av törst, som byborna. Det händer sällan, eftersom säcken fylls vid vatten och fångar får vatten buret till sig.  
Prövningen: Törsten saknas verkligen fast kommentaren säger att hälsan räknas som en bybos. Delen om fången faller: byborna bär mat och vatten dit.

**349. Styrets nödlista töms helt, också för det som inte kunde utlysas**  
Var: `src/sim/utlysa.ts:90, 101-114`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: När styret utlyser går det igenom nödlistan och hoppar över de poster som inte får ett helt silver eller där utlysningen misslyckas. Efter slingan tas hela listan bort (delete vl.nod), så de överhoppade glöms. Kommentaren överst säger att nöden ska finnas kvar tills styret utlyst den eller den är för gammal.  
Förslag: Behåll de poster som hoppades över: filtrera listan i stället för att ta bort den. Tidsgränsen finns redan i nodNu (UPPDRAGTAL.tid), så inget ligger kvar för evigt.  
Ändras i spelet: Ett rån eller ett saknat sällskap som styret inte hade silver till blir utlyst senare när silvret finns, i stället för aldrig.  
Prövningen: Koden gör inte det kommentaren och designdokumentet säger (nöden står kvar tills styret utlyst den). Rättelsen är liten och tidsgränsen finns redan.

**350. En nyhet kan skrivas en gång till, eller med "har nu 12 invånare (förut 12)"**  
Var: `src/sim/ort.ts:59-61 och 373-386`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: larOrt anropar nyhetNarByn med personens egen gamla tid som början. nyhetNarByn hoppar bara över om byn redan har lika nya uppgifter (rad 375). Har byn hört om en ändring genom någon annan, och en person med äldre egna uppgifter sedan hör något ännu nyare, hämtas händelserna från personens gamla tid och samma händelse skrivs en gång till. När en nyhet förs vidare som nyhet (o.ny) utan att något stort ändrats för just lyssnaren, och världens krönika inte har någon rad i spannet, blir texten reservraden "X har nu N invånare (förut N)". Svält och delning har egna rader i världens krönika, så där kommer reservraden mer sällan än läsaren trodde.  
Förslag: Räkna från den senaste av personens och byns tid, och skriv ingen nyhet när inget stort ändrats i det spannet.  
Ändras i spelet: Färre notiser och krönikerader om nyheter från andra byar: samma nyhet kommer en gång, och aldrig en nyhet där inget ändrats.  
Prövningen: Vägen finns i koden: början på spannet är personens tid, inte byns, så en redan skriven händelse kan komma med igen. Det händer sällan, men rättelsen är liten och gör bara att färre dubbla rader skrivs.

**351. Byn gör handelsvaror också när ingen grannby kan skicka en handlare**  
Var: `src/sim/handel.ts:151-171 (handelsMalRakna, särskilt 153-154), 123; src/sim/byhandling.ts:330, 410; src/sim/val.ts:586, 1136-1146; src/sim/steg.ts:449; src/test/scenarier/agande.ts:1006-1090`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: handelsMalRakna körs varje timme. Den frågar vilka sorters handlare grannbyarna skulle skicka. Blir listan tom lägger den själv in en vandrande handlare (rad 154) och räknar ett mål ändå, med priset 1. Bara byar som huvudbyn har en förbindelse med kan skicka handlare (byhandling.ts rad 330), så en tom lista betyder att ingen handlare kan komma. Ändå får raden handelVara folk att tvinna rep eller göra knivar och yxor att byta med handlaren.  
Förslag: Sätt inget mål när listan är tom (avsluta direkt efter rad 153). Kör scenarierna för handelsvarorna efteråt; de byar som prövas där har grannar, men det ska kontrolleras.  
Ändras i spelet: En by utan grannbyar som kan skicka handlare gör inte längre varor till försäljning på tiden som blir över; den tiden blir fritid eller annat. Byar med grannar märker ingen skillnad. Handlaren som skickas med testknappen kommer ändå, men byn har då inte gjort varor i förväg.  
Prövningen: Stämmer, och rättelsen följer designdokumentet: byn gör bara så många varor som nästa handlare kan betala och bära, och kommer ingen är det noll. Det är en grundregel, inte gaffatejp. Hur ofta en by saknar grannar helt gick inte att se utan att köra spelet.

**352. Vargjakten saknar björnjaktens rättning: den som kallar väntar inte på dem som inte hunnit ge sig av**  
Var: `src/sim/varg.ts:582-584; src/sim/bjorn.ts:158-162`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: I björnjakten räknas de som kallats tills kallelsen löpt ut, också de som inte gett sig av än (steg 9.9.3). I vargjakten räknas bara de vars uppgift redan är vargjakt (varg.ts:582). En följare som först tar hand om en nöd (äter, värmer sig) räknas alltså inte, och den som kallade kan anfalla innan hen kommit. Mätningen i steg 10.1.17 gav 20 vargjakter och ingen död i 16 byar, så felet märks sällan.  
Förslag: Samma räkning som i björnjakten: de som kallats räknas tills f.kallTill gått ut. Försvinner av sig självt om jakterna slås ihop.  
Ändras i spelet: Den som kallar till vargjakt väntar upp till en halvtimme på hela sitt följe. Något fler jägare är med när striden börjar.  
Prövningen: Skillnaden mot björnjakten finns i koden, och rättningen där säger varför den behövs. Den är liten och beskriver hur en jakt går till, inte en rättelse av ett resultat.

**353. Tre rivfunktioner och två räknare som räknar fel**  
Var: `src/sim/stationer.ts:1638-1651, 1488, 1635; src/sim/byggplan.ts:942, 956; src/sim/varld.ts:446; src/sim/rader.ts:153; src/sim/rost.ts:149`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 5 rader bort.  
I dag: rivStation, rivScenen och rivScen gör nästan samma sak. rivScen räknar 'scen riven' för varje station som rivs, inte bara scenen. rivStation räknar 'rivenForHus' också när anfallare slår sönder ett altare (rader.ts) och när en gammal sparad by lagas (varld.ts). Ingen kod och inget test läser någon av de två räknarna.  
Förslag: En funktion riv(s, t, text) som tar bort stationen, ger tillbaka materialet och skriver i loggen. rivScenen blir en rad som anropar den. Ta bort räknaren 'scen riven', och räkna 'rivenForHus' bara på de två ställena i byggplan.ts (eller ta bort den också).  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer, och räknare med fel namn lurar den som senare letar fel i statistiken. Ändringen är liten och rör inget i spelet.

**354. Rövarens 'ligger' har hamnat inne i en kommentar**  
Var: `src/ui/gaster.ts:15, 23-24, 67, 69, 76; src/ui/manniskor.ts:357`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: På rad 69 står 'ligger: sk?.ligger,' efter kommentarstecknen, så fältet Gast.ligger sätts aldrig. Bilden blir rätt ändå, för manniskor.ts frågar kämpen direkt. Fälten farg (färgen på cirkeln) och blod i Gast sätts men läses inte av någon: gästerna ritas som figurer nu.  
Förslag: Ta bort fälten ligger, farg och blod ur Gast och resten av kommentaren, och läs bara kämpens läge i manniskor.ts.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Jag sökte i gränssnittet och testerna och hittade ingen som läser de tre fälten. Ofarlig städning.

**355. Bistickets läkningstid står på två ställen**  
Var: `src/sim/bin.ts:328-332; src/sim/halsa.ts:193`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: bin.ts har BISTICK_LAK = 12, med en kommentar som säger att det är skadans läkningstid. Samma tal står i skaderegistret (SKADOR.bistick.lakTim: 12 i halsa.ts). Ändras det ena följer det andra inte med.  
Förslag: Läs talet ur skaderegistret inne i djurStickSteg och ta bort kopian. bin.ts hämtar redan annat ur halsa.ts.  
Ändras i spelet: ingen märkbar skillnad i dag; hindrar ett fel den dag talet ändras  
Prövningen: Stämmer, och rättelsen är en rad. Registret heter SKADOR, inte SKADA som läsaren skrev.

**356. bestar.mjs: väntan på sidan står inne i en kommentar**  
Var: `bildstil/api/bestar.mjs:61`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Raden slutar med en kommentar, och i kommentaren står 'await sida.waitForFunction(() => window.BESTAR?.prov);'. Väntan körs alltså aldrig. I praktiken märks det sällan: sidan läses in med waitUntil 'load', och skripten på sidan ligger inne i filen och körs innan dess. window.BESTAR.prov finns (bestskapare.js:1017), så väntan skulle gå igenom direkt.  
Förslag: Flytta waitForFunction till en egen rad efter setContent och lägg kommentaren ovanför.  
Ändras i spelet: Ingen skillnad i spelet. Bestskaparens körningar får samma skydd som de andra skripten.  
Prövningen: Felet finns precis som läsaren säger och rättas på en rad utan risk. Det är mindre allvarligt än det låter, eftersom sidan redan är inläst när skriptet går vidare.

**357. Dött uttryck i texten för lakekonst**  
Var: `src/test/scenarier/sjukdom.ts:176`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Texten 'den som vårdar får mer läkekonst' har ett uttryck som alltid ger en tom text, vilket värdet än är. Utskriften visar därför talet före men aldrig talet efter.  
Förslag: Spara färdigheten direkt efter den första vården (innan den sätts till 16 på rad 167) och skriv ut den i texten, eller ta bort uttrycket.  
Ändras i spelet: Nej. Bara testets utskrift.  
Prövningen: Stämmer exakt som läsaren säger. Själva kontrollen (vaxte) är riktig, så det är bara en skönhetsfläck i utskriften.

**358. Scenariot luften kan tyst prova på fel ruta**  
Var: `src/test/scenarier/behov.ts:624-632 (luften); src/test/scenarier/fas10.ts:87 (dragdjur, oxe!), 1199-1200 (djurtorst, vid!)`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Luften letar en torr ruta och en strandruta på kartan. Hittas ingen blir värdet -1, och gästen ställs då i kartans hörn utanför kartan utan att scenariot säger något. Kontrollerna efteråt prövar då fel plats. Byn är alltid nummer 5, så felet syns först om kartan ändras. På de andra ställena läsaren nämner kraschar scenariot i stället, och en krasch syns tydligt.  
Förslag: I luften: en kontroll "en torr ruta och en strandruta hittades" som blir röd när någon av dem är -1, och resten hoppas över då. De ställen som kraschar får vara som de är.  
Ändras i spelet: Nej.  
Prövningen: Stämmer för luften: sökningen har inget skydd, och ett prov på fel plats kan gå igenom eller bli rött av fel skäl. Det är en rad att lägga till. Felet är inte akut eftersom byn och kartan är desamma varje gång.

**359. 'Borta resten av året' prövas bara två timmar framåt**  
Var: `src/test/scenarier/grund.ts:2588, 2601; src/sim/djur.ts:577`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: I bjornjakt står en tid som räknas ut som '30 timmar gånger noll plus två timmar'. Delen gånger noll är alltid noll, så kontrollen 'en fälld björn är borta resten av året' tittar bara nu och två timmar senare. I spelet är björnen borta hela året den fälldes (ett dygn i verkligheten).  
Förslag: Ta bort delen som är noll och pröva två tider: en sent samma år i spelet, där björnen ska vara borta, och gärna en nästa år, där en björn får finnas igen. Annars byts texten till 'borta de närmaste timmarna'.  
Ändras i spelet: Ingen skillnad i spelet. Testet prövar det texten säger.  
Prövningen: Raden stämmer precis som läsaren säger: en kvarglömd nolla gör att testet lovar mer än det prövar. Rättningen är en rad i testet.

**360. Ett löst villkor i matchens berättelse (rad 985)**  
Var: `src/test/scenarier/kultur.ts:985`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Kontrollen av berättelsen när det kom för få spelare godkänns så snart texten innehåller "ingen", "för få" eller "tom", också om texten är trasig (har kvar en klammer eller säger undefined). De två andra utpekade raderna är inga fel: på rad 517 räcker inte `slitna >= 1`, det krävs också en grupp som sjunger, och på rad 1465 står det i kontrollens text att antingen gäller straffet eller så efterlevdes lagen inte. Rad 1466 hör till fyndet om kontroller som aldrig blir röda.  
Förslag: Sätt parentes så att texten alltid måste vara hel: `hel(iber) && (iber.includes(ep.name) || /ingen|för få|tom/.test(iber))`.  
Ändras i spelet: Nej.  
Prövningen: Bara rad 985 är ett verkligt fel, men det är en säker rättning på en rad. Raderna 517 och 1465 gör det de säger och ska lämnas.

**361. Texten säger 'Alla höna' när den sista hönan dör**  
Var: `src/sim/hons.ts:31`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: honsDor skriver 'Alla' när hela flocken dog och väljer ordet 'höna' när antalet är 1. Dör byns enda höna blir texten 'Alla höna i byns flock dog …'.  
Förslag: Skriv 'Byns enda höna dog …' när det bara fanns en, annars 'Alla hönor'.  
Ändras i spelet: Bara texten i loggen blir rätt.  
Prövningen: Stämmer: de två valen på raden görs var för sig och ger fel text i just det fallet.

**362. Gravbesöket letar upp den döde på namnet fast id finns**  
Var: `src/sim/grav.ts:505-510, 527; src/sim/liv.ts:454-469`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Rad 527 letar upp den döde ur sorgen på namnet, fast sorgen har den dödes id (vem) sedan steg 9.2.33. Två döda med samma namn kan blandas ihop. band() läser sorgens tyngd ur tankarnas text ('Sörjer X', 'Saknar X', 'Förlorade …, X').  
Förslag: Använd sorgens id på rad 527, med namnet som reserv för äldre sparfiler. Låt band() läsa tankarna som i dag: sorgen i p.sorg tas bort när saknaden börjar, så den kan inte ersätta texterna utan att besöken under saknaden försvinner.  
Ändras i spelet: Nästan ingen: rätt grav besöks när två döda haft samma namn.  
Prövningen: Namnsökningen stämmer och är en rad att rätta. Läsarens förslag att låta band() läsa p.sorg håller inte: posten tas bort i sorgTimme när tanken 'Saknar X' börjar.

**363. Infartens förslag räknar vägmaterialet i onödan och ändrar byn**  
Var: `src/sim/byggplan.ts:616-638, 884-897; src/test/scenarier/byggnader.ts:2177`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: infartA.foresla räknar det bästa vägmaterialet innan den sett att behovet är en förbättring, så det räknas för varje behov byn har. Förslaget skriver också i byn: det märker att infarten är klar eller stoppad av berg eller vatten, och skriver en rad i loggen. Det görs bara när en förbättring verkligen prövas.  
Förslag: Flytta kontrollen av behovet och av klar och stopp först, före bastaVag. Låt märkningen klar och stopp stå kvar där den är: när ritningen är tom finns inget förslag, så utfor körs aldrig och kan inte ta över den.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Halva fyndet håller: ordningen på kontrollerna är fel och rättas med en rad. Den andra halvan, att flytta märkningen till utfor, går inte som läsaren tänkt och gör ingen skada där den står.

**364. Skälet i rutan vid porträttet kan höra till en annan uppgift än den som visas**  
Var: `src/ui/portratt.ts:20, 51-54`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: showTip visar aktiviteten ur uppgiftVid(p), uppgiften vid tiden som visas, men skälet tas ur p.task?.why, simuleringens senaste uppgift. Byn räknas ett slag före klockan som visas, så rutan kan en kort stund visa den gamla aktiviteten med den nya uppgiftens skäl. Samma ruta anropar lagstBehov(p) två gånger och halsa(p) tre gånger.  
Förslag: Ta skälet ur samma uppgift som aktiviteten (uppgiftVid(p)?.why), och räkna behovet och hälsan en gång.  
Ändras i spelet: Texten i rutan stämmer alltid med det personen syns göra. Inget annat.  
Prövningen: Stämmer: uppgiftVid ger en hel uppgift med skälet i, så bytet är en rad. Felet syns bara ett ögonblick, så vinsten är liten.

**365. Vardagens intryck står uppräknade på två ställen, och tiggaren saknas i det ena**  
Var: `src/sim/rykten.ts:429, 519`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Rad 429 räknar upp vardagens intryck (flitig, lat, välbärgad, rik, fattig, tiggare). Rad 519 räknar upp dem igen för glömskan, utan tiggaren. Intrycket tiggare bleknar därför som en händelse och finns kvar efter döden, medan de andra vardagsintrycken försvinner när personen dör.  
Förslag: En flagga 'vardag' på raderna i registret INTRYCK som båda ställena frågar, så att listorna inte kan gå isär.  
Ändras i spelet: Lite: ryktet som tiggare bleknar som fattig och lat, och följer inte med efter döden.  
Prövningen: Skillnaden stämmer och ser ut som en miss när tiggaren lades till i steg 10.5.11. Designdokumentet säger bara att den som lever på gåvor blir känd som tiggare, inget om minnet efter döden.

### Brott mot reglerna (35)

**366. Att flytta elden tar två timmar, och har ett eget system för halvfärdigt arbete**  
Var: `src/sim/eldflytt.ts:25, 62-78, 83; src/sim/steg.ts:1038; src/sim/typer.ts:541; src/sim/recept.ts:42; src/sim/tider.ts:45-59`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 17 rader bort.  
I dag: ELDFLYTT.tim är 2 timmar (120 riktiga minuter, ungefär en månad i spelet) för att släcka elden och bära sex stenar. En helt ny ring tar 15 minuter (RT.brasaMin), och riktlinjen säger 10–20 minuter för en station. Vakten för arbetstider ser det inte, eftersom flyttaeld räknas som en "stund" i tider.ts. För att två timmar ska gå att avbryta finns raknaFlytt och eldFlyttKvar med tre fält på elden (gjort, vem, fran). Designdokumentet (Elden flyttas, steg 2.10.4) säger inget om hur lång tid det tar.  
Förslag: Sätt tiden till samma som en ny ring (15 minuter). Ta bort raknaFlytt, eldFlyttKvar och de tre fälten; den som avbryts börjar om. Scenariot eldflytt (byggnader.ts rad 780-800) körs efteråt.  
Ändras i spelet: Elden flyttas på en kvart i stället för två timmar (en halv dag i spelet i stället för ungefär en månad). Byn står kortare tid utan eld. Avbryts flytten börjar nästa person om.  
Prövningen: Tiden bryter mot riktlinjen för arbetstider, som redan är bestämd, och dokumentet kräver inga två timmar. Med en kvart behövs inte det egna systemet för halvfärdigt arbete.

**367. Rövarnas val slumpas om varje slag**  
Var: `src/sim/rovare.ts:76-80, 503-507, 698-712`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 2 rader bort.  
I dag: Varje rövare väljer handling på nytt varje slag. Poängen för att rasta, gå omkring, prata, slå, hota och ta bördan får ett nytt slumptal varje slag (valBrus 0,3). Försteget för det hen redan gör är 0,2. Jag räknade om: den som rastar (0,35 + 0,2) byter till prat (0,38 + 0 till 0,3) med ungefär 43 % chans per slag. Tiden rastSek (20–90 s) gäller alltså i praktiken inte, och 'gå omkring' kan inte vinna över en pågående vila. Hur ofta de byter beror på slagets längd (2 s, eller 0,5 s när faran är nära). Samma sak gäller chansen att hota eller slå den som står i vägen: fler slag ger fler tärningskast.  
Förslag: Dra bruset en gång när ett val görs och behåll valet till gorTill, eller tills något nytt syns (en fiende, någon i vägen, anfallet börjar). Mötet på vägen får sitt slumptal en gång per möte.  
Ändras i spelet: Rövarna på rastplatsen håller sig till en sak i 20–90 sekunder i stället för att växla hela tiden, och går omkring ibland. Mötena på vägen blir oberoende av slagets längd.  
Prövningen: Stämmer i koden och bryter mot regeln i CLAUDE.md att ingen chans får räknas per slag. Ändringen syns mest i hur gänget ser ut på rastplatsen; kör likheten efteråt.

**368. Tamdjur, hundar, höns och fällor räknar per anrop i stället för per tid**  
Var: `src/sim/tamdjur.ts:97-106, 188-219; src/sim/hons.ts:34-52; src/sim/fisk.ts:62-76; src/sim/steg.ts:491, 517, 521`. Vinst 3 av 5, risk 2 av 5, ett steg.  
I dag: Raderna stepMjardar, stepTamdjur och stepHons i TAKTER (steg.ts:491, 517, 521) skickar inte med tiden sedan sist. Hungern, svälttimmarna, döden av ålder, hundens lojalitet och följe, äggen och fällornas fångstchans räknas en gång per anrop, som om det alltid gått exakt en timme. Registret kan anropa med en annan tid (första gången, eller när klockan flyttats).  
Förslag: Ta emot dt från registret och gångra talen med timmarna sedan sist (chanserna genom chance() i slump.ts, som bina och djurens törst redan gör).  
Ändras i spelet: Ingen märkbar skillnad så länge takten är en timme. Slumpen kan dras lite annorlunda, så facit ändras.  
Prövningen: Stämmer: de tre funktionerna tar ingen tid alls, och CLAUDE.md säger att en chans per anrop inte får finnas. Grannfilen djurtorst.ts gör redan rätt, så mönstret finns att följa.

**369. Smitta och utbrott slås per anrop i stället för per tid**  
Var: `src/sim/sjukdom.ts:161-181; src/sim/humor.ts:263-283, 315-333; src/sim/steg.ts:444, 524-525; src/sim/slump.ts:83-85`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: smittaTimme och smittaUtifranTimme jämför slumpen direkt mot radens smitta, och utbrottRisk jämför mot utbrottChans, utan tiden sedan sist. stepHumor och utbrottRisk räknar med en fast timme (Math.exp(-HOUR/...)). Raderna i TAKTER anropar dem var 3600:e sekund men skickar inte med tiden. Ändras takten i registret ändras smittan och utbrotten lika mycket. Regeln i CLAUDE.md säger att en chans per anrop inte får finnas.  
Förslag: Låt funktionerna ta emot tiden sedan sist från TAKTER. Använd chansPer(s, chansen, 3600, dt) för smittan och utbrotten, och exp(-dt/...) för det som klingar av. chansPer ger exakt samma chans som i dag när takten är en timme och drar slumpen lika många gånger.  
Ändras i spelet: Nej, så länge takten är en timme: med chansPer blir chansen och slumpens ordning densamma. (Med chance(), som läsaren föreslog, hade chansen blivit lite lägre: 0,3 blir 0,26.)  
Prövningen: Koden är som läsaren säger, och regeln i CLAUDE.md (Klockan och takterna) är tydlig. Jag rättade förslaget till chansPer, som redan finns för just detta (steg 10.2.15) och inte ändrar byarna.

**370. Recept står på två ställen: i RECEPT och direkt i TILLVERKA**  
Var: `src/sim/tillverka.ts:15-18, 27 (koka_vatten, mala_korn, salta_fisk, salta_kott, krossa_saft); src/sim/recept.ts:100-101 (saltfisk, saltkott, mjol)`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: De flesta raderna i TILLVERKA läser material och minuter ur RECEPT. Men mala_korn, salta_fisk och salta_kott skriver dem direkt, fast RECEPT har samma tal för mjöl, saltad fisk och saltat kött. Ändras det ena följer det andra inte med.  
Förslag: Låt de tre raderna läsa av och min ur RECEPT som de andra. Saften, teet, buljongen, bläcket och det kokta vattnet har inget recept i RECEPT och får stå kvar tills vidare.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer för mjöl, saltad fisk och saltat kött: samma tal står på två ställen. Rättningen är tre rader och ändrar inga tal.

**371. Namn och nummer i koden i stället för fält i registren**  
Var: `src/sim/fangelse.ts:54-55 (HARDA), 26 (brytMin); src/sim/vaktat.ts:37; src/sim/bjorn.ts:252 (JAGAR); src/sim/styre.ts:447-458; src/sim/saker.ts:294-296; src/sim/rader.ts:43`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: HARDA = [2, 3, 6, 9] är radnummer i STRAFF_REG (Slag, Utvisning, Döden, Fängelse) skrivna för hand; de stämmer i dag. FANG.brytMin = 20 är en kopia av RADER.dorrMin. behalls() känner igen levande djur på att namnet börjar med 'lev'; kultingen heter inte så och är värd precis 10, så ett rövarläger sparar den som ett värdefullt föremål. JAGAR räknar upp fyra handlingar, men bara 'jakt' finns; 'kaninjakt', 'radjurjakt' och 'fageljakt' finns inte som handlingar någonstans i spelet.  
Förslag: Ett fält hard på raderna i STRAFF_REG, ett fält för levande djur i SAKER (också kultingen), och JAGAR byts mot frågan om handlingen är 'jakt'. brytMin kan läsa RADER.dorrMin om importen inte går runt (fangelse.ts undviker medvetet sådana importer); annars får kopian stå kvar.  
Ändras i spelet: Nästan ingen: en stulen kulting behandlas som de andra levande djuren i stället för som ett vaktat föremål.  
Prövningen: Stämmer på alla fyra ställena, och två av dem är små fel i dag (kultingen och de tre jaktnamnen som inte finns). Rättningarna är små och följer regeln om register.

**372. Tester som läser händelseloggen i stället för statistiken**  
Var: `src/test/scenarier/grund.ts:1521 (tornadogast), 1890 (brand), 1938 (brandsmitta); mindre viktigt 833 (kloka), 1833 (brand); src/sim/brand.ts:381, 568, 574-579`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Tre kontroller letar i loggen efter något som hänt under en längre körning: om handlaren dog (upp till 75 minuter), om 'Elden har slocknat' skrevs (upp till tolv timmar i en by som släcker en brand) och hur många som började brinna 'bredvid elden' (räknas ur loggens rader). Reglerna säger att loggen bara rymmer 400 rader och aldrig ska räknas i tester. De två andra ställena (833 och 1833) läser loggen direkt efter händelsen och prövar att själva texten skrevs; där kan loggen inte ha hunnit bli full.  
Förslag: Räkna i byns statistik när det händer: en räknare för orsaken när någon tar eld (bredvid elden), en när en brand slocknat och en när en gäst dör, och låt de tre kontrollerna läsa dem. Kontrollerna på 833 och 1833 kan stå kvar, eftersom de prövar texten i Händelser.  
Ändras i spelet: Ingen skillnad i spelet. Tre räknare till i statistiken, och testerna kan inte bli röda av en full logg.  
Prövningen: Tre av de fem ställena bryter mot regeln om loggen på riktigt, och rättningen är tre små räknare. De två andra läser loggen direkt och behöver inte ändras.

**373. Balanstal skrivna direkt i motorn, utanför balans()**  
Var: `src/sim/steg.ts:1189 (ROLLEKA = 0.6), 543 (1 + 0.1 × nyfikenhet), 749 (grad >= 0.5), 1578 (mästare vid 16), 1720 (MINNS_DODA), 241-243, 652, 705, 713-727, 740 (tankarnas styrka och längd), 1033, 1406, 1415, 1590, 1594 (2 × MIN)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Filen har registren STEG, RUNDA och TUR för sina balanstal, men flera tal som styr balansen står som siffror i koden: hur mycket rölleka en timme ger, hur mycket seden nyfikenhet höjer lärandet, humöret av Fryser, Svälter och Kissade på sig, och gränsen två minuter för att gå tillbaka till arbetet (på fem ställen). De syns inte i npm run talen och kan inte prövas med jamfor --satt.  
Förslag: Flytta talen till STEG och RUNDA, tankarna gärna som en liten tabell med text, styrka och längd, och gränsen två minuter som ett tal på ett ställe. MINNS_DODA gäller sparfilens storlek och kan stå kvar.  
Ändras i spelet: Ingen märkbar skillnad: samma värden, bara på ett annat ställe.  
Prövningen: Talen står som läsaren säger. Att de inte går att se eller pröva med verktygen för balansen är ett brott mot regeln om balanstal, och flytten ändrar inget i spelet.

**374. Lösa tal i koden som borde vara balanstal**  
Var: `src/sim/brand.ts:388 (14 rutor), 630 och 633 (0,2 och 0,3 minuter), 658 (1,5 rutor); src/sim/tornado.ts:419 (0,3), 434 (0,5 och 0,5), 503 (10 minuter); src/sim/is.ts:53 (0,2)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Ett knappt tiotal tal som styr spelet står direkt i koden och syns inte i npm run talen: hur nära man ska vara för tecknet efter branden, tiden att springa i vattnet eller slita av sig plagget, räckvidden för att hjälpa den som brinner, vilken sorts skada tornadon ger, kortaste tiden man går undan och chansen att se sjön frysa. Tre av läsarens tal är inga balanstal utan tekniska tak (40 varv i släckningen, 60 saker som ritas flygande, sökningen 10 rutor ut ur elden) och får stå kvar.  
Förslag: Flytta de sju–åtta talen som styr spelet till BRAND, TORNADO och IS med en rad förklaring var. Tiderna 0,2 och 0,3 minuter är korta men gäller att släcka sig själv, inget arbete.  
Ändras i spelet: Nej.  
Prövningen: Stämmer för de flesta talen, och regel 8 säger att balanstal ska stå i blocken. De tekniska taken lämnas.

**375. Lösa balanstal mitt i koden**  
Var: `src/sim/rost.ts:196-198, 211, 299-302, 319, 334; src/sim/styre.ts:349, 372, 421; src/sim/lagar.ts:46, 165, 180-181; src/sim/kyrka.ts:359, 376-383, 490, 529, 551; src/sim/religion.ts:458`. Vinst 2 av 5, risk 1 av 5, ett steg.  
I dag: Ett tjugotal tal som avgör hur spelet går står direkt i koden: till exempel 0.4 (chansen att den störtade drivs ut), 0.1 och 0.5 i fraktionen, 0.7 och 0.5 för hur ledaren tillsattes, 40 för ministern som arvinge, trösklarna 6, 3, 2 och 800 för ministrar, 0.5, 0.3 och 0.4 i lagförslagen, LAG_SKOG 8, 60, 40 och 50 i kyrkans utgifter, 20 i välsignelsen, 7 dygn och 50 i drömmen. De syns inte i npm run talen. Talen 200 och 40 i styre.ts 550 och 644 är bara hur långa listor som sparas, och talen i raderna i LAGAR är registrets egna.  
Förslag: Flytta dem som styr spelet till balansblocken som redan finns (MISS, LED, TRON, LAG, KYRKA, TRO), utan att ändra uttrycken runt dem. Mekaniskt arbete som passar en enklare modell.  
Ändras i spelet: Nej.  
Prövningen: Stämmer mot regel 8 i ARKITEKTUR.md: ett tal som avgör hur spelet går ska ha ett namn i balansblocket. Listlängderna behöver inte flyttas.

**376. Lösa tal i koden som borde vara balanstal**  
Var: `src/sim/grav.ts:178, 310, 500; src/sim/kult.ts:106, 356, 438; src/sim/seder.ts:71-78; src/sim/kultlatt.ts:50; src/sim/samtal.ts:231`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Vakans klockslag (20), jordgravens livstid (84 dygn), 2 minuter per sak när en fiende avrustas, rökelsens chans 0,2, högtidernas gränser 25 och 75, den ledda bönens 2 dygn, talen i sedernas dragning (0,5, 0,15, 0,7, 0,3 med flera) och talen i bytaChans står direkt i koden. samtal.ts lånar balanstalet lagTanke för tanken på lön.  
Förslag: Flytta talen till balans()-blocken i respektive fil (GRAV, KULT, SED, TRO), så att de syns i npm run talen och kan prövas med jamfor --satt. Bålets ved (4) står på två rader i två register för två olika riter och får stå kvar.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Talen finns där läsaren säger (JORDGRAV_DYGN står på rad 500, inte 178). Flytten ändrar inga värden. PRATAR_SEK gäller bara pratbubblan och behöver inte flyttas.

**377. Fasta tal i ätandet står utanför balanstalen**  
Var: `src/sim/behov.ts:97-122`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: eat() har talen 0.2 och 0.3 (när fastan bryts), 0.5 och 0.25 (när maten mättar sämre och kan göra en sjuk), 0.35 (chansen), och humörtalen -0.05 och -0.2 skrivna direkt i koden. De syns inte i npm run talen och kan inte prövas med jamfor --satt.  
Förslag: Flytta dem till balanstalen (KROPP eller ett eget block för maten) med namn och en kort förklaring, med samma värden.  
Ändras i spelet: Nej.  
Prövningen: Talen står som läsaren säger, och GRANSKNING.md pekar ut just detta ('Balanstal utan namn', regel 8). Ren flytt utan ändrade värden.

**378. Ved som inte fick plats på elden blir grenar i decimaler**  
Var: `src/sim/eld.ts:146, 358, 367; src/sim/steg.ts:1004, 1011; src/sim/lager.ts:719`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: giveBack lägger tillbaka bränsle som n / 0,4 grenar. En famn på 1 ved som bärs till en eld som hunnit slockna, står under vatten eller tagits isär blir 2,5 grenar i förrådet. Veden byter alltså slag och blir en halv sak. addTo rundar inte. Den del som inte ryms på en nästan full eld blir också en bråkdel grenar, men det är ovanligt eftersom famnen räknas efter vad elden vill ha.  
Förslag: Bär tillbaka det som bars: spara i uppgiften hur mycket som var ved och hur mycket som var grenar (takeFuel vet det) och lägg tillbaka hela saker. Enklare: hela vedträn läggs tillbaka som ved, och resten under en hel räknas som bränt.  
Ändras i spelet: Ingen märkbar skillnad, utom att förrådet aldrig får halva grenar och att ved inte förvandlas till grenar. Händer sällan.  
Prövningen: Stämmer, och det bryter mot regeln om hela resurser. Rättningen är liten och rör bara ett ovanligt fall.

**379. Mörkrets timmar räknas per anrop, inte per tid**  
Var: `src/sim/ljus.ts:37-38, 86-91, 158-160; src/sim/steg.ts:442-443; src/test/scenarier/grund.ts:332, 404`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: morkHumor lägger till 1 på rutan varje gång den anropas, och uppsattaTimme gångrar timmarna med 0,99 varje gång. Det stämmer bara så länge raderna i TAKTER står på en gång i timmen. Reglerna säger att allt räknas med tiden sedan sist. Raderna i TAKTER får redan tiden (dt), men den skickas inte vidare.  
Förslag: Lägg till tiden sedan sist i timmar, och låt avtagandet vara 0,99 upphöjt till timmarna sedan sist. Scenarierna i grund.ts som anropar morkHumor fyra gånger för fyra timmar får skicka med en timme.  
Ändras i spelet: Ingen skillnad så länge takten är en gång i timmen.  
Prövningen: Stämmer och bryter mot regeln om klockan och takterna (inget per anrop). Rättningen är liten och ändrar inget i spelet i dag.

**380. Färger utanför paletten och halvgenomskinliga färger i kartans effekter**  
Var: `src/ui/vaxter.ts:204, 207, 213, 230, 255; src/ui/stridkarta.ts:16`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Stenen i luften (0x8a8f94), spjutet i luften (0x8a6a40) och dammet efter en flyende kanin (0xd8c8a0) har färger som inte finns i palett.ts. Dammet, tornadons fåror och slagens streck ritas halvgenomskinliga, vilket blandar fram färger utanför paletten. Stenen och dammet ritas som små cirklar med mjuk kant. npm run utseende ser det inte, för effekterna syns bara ett ögonblick.  
Förslag: Byt till närmaste palettfärg med farg() och rita punkter i stället för cirklar. Låt dammet, fårorna och strecken försvinna i steg eller med raster i stället för med genomskinlighet.  
Ändras i spelet: Bara bilden: kast, damm, tornadospår och slagstreck får palettens toner och tonar bort i steg i stället för mjukt.  
Prövningen: Kontrollerat: de tre färgerna finns inte i paletten, medan grannraderna använder palettens. Bildstilen säger bara palettens färger och raster i stället för genomskinlighet. Liten ändring av bilden som Björn kan säga ja eller nej till i efterhand.

**381. Sex system räknar timmen eller dygnet själva inne i sin rad**  
Var: `src/sim/varg.ts:683-696; src/sim/handel.ts:541-548; src/sim/bjorn.ts:98; src/sim/brand.ts:403; src/sim/kyrka.ts:594; src/sim/kult.ts:447`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 6 rader bort.  
I dag: Raderna 'vargarna', 'handlaren', 'björnen' och 'branden' går varje slag (sek: 0) men har var sin egen räkning av 'har en ny timme börjat?': flockar som kommer, vargarnas hunger och jaktbeslut, handlaren som väntar utanför, björnjaktens beslut och blixten. kyrkaTimme och kultTimme räknar själva fram 'en gång per dygn' (timme 12 och timme 0). Regeln säger att hur ofta något räknas står i registret TAKTER.  
Förslag: Ge timdelarna och dygnsdelarna egna rader i TAKTER (t.ex. 'vargarna kommer' sek: 3600, 'kyrkans dygn' sek: 86400 med fas 0,5). Börja med kyrkan, kulten, blixten och handlaren som väntar, som är fristående. Vargarnas timdel ligger inflätad per flock mellan 'ses' och 'flockSteg' och tas sist, eller lämnas.  
Ändras i spelet: Samma saker händer i samma timme. Ordningen inom slaget kan flyttas, så en by utvecklas inte exakt som förut och facit sparas om. Ingen märkbar skillnad.  
Prövningen: Stämmer på alla sex ställena, och det bryter mot regeln om att takten står i registret. Vinsten är ordning mer än hastighet, och risken är att ordningen inom slaget ändras, särskilt för vargarna.

**382. Handlingarnas namn räknas upp i bildkoden i stället för att stå i registret**  
Var: `src/ui/stalle.ts:7, 20; src/ui/stridansikte.ts:13-15; src/ui/utseende.ts:71; src/ui/terrang.ts:122; src/ui/vaxter.ts:112`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 6 rader bort.  
I dag: Vilka handlingar man sitter vid (SITTA), står bredvid rutan vid (RUTA_ARBETEN), ser arg, allvarlig eller rädd ut vid (ARG, ALLVAR, RADD), vilka ljuskällor som lyser som en eld (FACKLOR) och vilka tamdjur som har egen bild (TAMBILD) står som namnlistor i gränssnittet. Regel 5 i ARKITEKTUR.md säger register i stället för listor. En ny handling eller ljuskälla får fel ställning eller ansikte tills någon minns listorna.  
Förslag: Fält i registren som redan finns: 'sitter', 'vidRutan' och 'ansikte' på handlingen i ACTS, ett fält på ljuskällan i LJUSKALLOR, och samma fält på rövarnas handlingar i rovare.ts. TAMBILD behövs inte alls: koden kan fråga om bilden finns (hasIcon), som den redan gör.  
Ändras i spelet: Ingen skillnad nu. Nya handlingar och saker får rätt bild utan att någon behöver minnas listorna.  
Prövningen: Listorna finns och bryter mot regel 5; ACTS har redan liknande fält (vila, stilla, social). Vinsten är framtida fel som undviks, inte kortare kod. Scenariot stalle importerar SITTA och måste följa med.

**383. Tatueringens chans dras per val, inte per tid**  
Var: `src/sim/tatuering.ts:37 (TATU.chans), 70-71; src/sim/val.ts:892; src/test/scenarier/kontroll.ts:284-285`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: tatVal drar ett slumptal mot TATU.chans × lusten × hantverket varje gång raden 'tatuera' prövas i valet av aktivitet. Det är en chans per anrop: den som väljer ofta tatuerar oftare, och ändras slagens eller passens längd ändras hur ofta märken görs. Raden i ARBETEN har bara prova och ingen poäng.  
Förslag: Ta bort slumpkastet och låt lusten × hantverket bli radens poäng i ARBETEN, så att arbetet väljs som andra arbeten (det designdokumentet och kommentaren överst i filen redan säger). TATU.chans försvinner. Scenariot tatuering, som i dag prövar upp till 400 gånger, rättas efter det.  
Ändras i spelet: Märken görs när någon med nål och kol har tid och arbetet väger tyngst, i stället för efter ett tärningskast. Märks knappt i dag eftersom tatueringar sällan händer.  
Prövningen: Slumpkastet på rad 71 är en chans per anrop, som CLAUDE.md förbjuder, och designdokumentet säger att arbetet ska väljas som andra arbeten. Ändringen är liten och rör bara tatueringen.

**384. Tester läser ur händelseloggen s.log**  
Var: `src/test/scenarier/byggnader.ts:183, 1664, 1692; src/sim/stationer.ts:1621-1622; src/sim/skatt.ts:140`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: CLAUDE.md säger att tester aldrig ska räkna ur s.log, som bara rymmer 400 rader. agandet räknar loggrader med texten 'bar sin halmbädd' och 'lämnade sin halmbädd' (rad 183). skatteskuld och arvsskatt jämför loggradernas ordning (rad 1664 och 1692). De här tre proven är korta, så raderna hinner inte falla ur loggen i dag, men provet går sönder om loggtexten skrivs om.  
Förslag: Lägg två räknare i byns statistik där bädden bärs eller lämnas (stationer.ts rad 1621-1622) och räkna dem i agandet. Ordningen skatt före arv går inte att se i en räknare; där räcker det att kräva att båda loggraderna finns (se fyndet ovan) eller att kolla krönikan.  
Ändras i spelet: Ingen märkbar skillnad. Byns statistik får två små räknare.  
Prövningen: Stämmer mot regeln i CLAUDE.md och mot koden. Vinsten är liten eftersom proven är korta, men regeln är ägarens egen och ändringen är ofarlig. Samma mönster finns på ett tjugotal ställen i de andra scenariofilerna och bör tas i samma veva.

**385. Handlingarnas egenskaper som namnlistor och if-satser i motorn**  
Var: `src/sim/steg.ts:599 (VARJE_SLAG), 862 (FRAMFOR), 981-1038 (arrive: tanda, elda, bygga, bara, flyttaeld); src/sim/handlingar.ts:86-92`. Vinst 2 av 5, risk 2 av 5, ett steg.  
I dag: Principen är ett register per sak, och handlingarnas register har redan fått egenskaper som förut var namnlistor (fortsatter, nodFri). I motorn finns ändå två listor med handlingsnamn: vilka som räknas varje slag och vilka som står framför rutan. Det som händer framme vid förrådet eller elden för elda, tanda och bygga (ca 45 rader) ligger i arrive, där ordningen mellan villkoren spelar roll.  
Förslag: Först det enkla: fälten varjeSlag och framfor i handlingarnas rader. Ett register FRAMME för det som händer när man kommer fram kan göras senare som ett eget steg.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: De två listorna bryter mot regeln om register och är lätta att flytta. Att bryta ut arrive är mer arbete och mer risk, så det bör vara ett eget steg med scenarierna för eld och bygge som kontroll.

**386. Vargarnas lista över mat de stjäl står i koden och saknar nyare kött**  
Var: `src/sim/varg.ts:498-503; src/sim/saker.ts:133, 303; src/sim/redskap.ts:129-132`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: STJALS räknar upp sakerna vid namn: fällda vilda djur och deras delar, köttslagen, fisk, grillat och torkat kött. De slaktade tamdjuren (slaktfar, slaktget, slaktko, slaktgris) och rökt kött (rokkott) finns som saker men står inte i listan, så dem rör vargarna aldrig.  
Förslag: Bygg listan ur registren i samma ordning som i dag (hela kroppar, delar, kött, fisk, det lagade): kropparna och delarna ur slaktregistret i redskap.ts, KOTTSLAG, och det lagade köttet.  
Ändras i spelet: Vargarna kan också ta slaktade får, getter, kor och grisar och rökt kött ur förrådet. De tar lika många saker som förut.  
Prövningen: Stämmer: sakerna finns i registren men saknas i listan, som inte följt med när tamdjuren och rökeriet byggdes. Det är ett fel mot regeln om register, och rättningen är liten.

**387. Chanser och missnöje räknas per anrop i stället för per tid**  
Var: `src/sim/religion.ts:414, 457-458; src/sim/kyrka.ts:355; src/sim/rost.ts:219-232; src/sim/steg.ts:441, 475, 487`. Vinst 2 av 5, risk 2 av 5, ett steg.  
I dag: stepReligion, stepStyre och kyrkaTimme anropas från TAKTER utan att ta emot tiden sedan sist. Drömmen, förfaderns chans och gåvan till tron slås en gång per anrop. Missnöjet får fasta påslag per anrop och bleknar med en formel som förutsätter exakt en timme. Ändras radens takt blir byn en annan.  
Förslag: Skicka in tiden sedan sist och gångra varje chans och påslag med den, räknat i timmar, och räkna blekningen med den. En liten gemensam hjälpfunktion räcker.  
Ändras i spelet: Nej om chansen gångras rakt med tiden, eftersom takten är en timme. Med formeln 1 - exp blir chansen en aning lägre och facit måste sparas om.  
Prövningen: Stämmer. Regeln Klockan och takterna säger att en chans per anrop inte får finnas och att varje system räknar med tiden sedan sist. Samma mönster finns i fler timfunktioner i TAKTER än de här.

**388. Vardagens rykten, smaken och profetens syn räknas per anrop, inte per tid**  
Var: `src/sim/rykten.ts:413-439, 603-619; src/sim/kult.ts:194, 438; src/sim/steg.ts:472, 486`. Vinst 2 av 5, risk 2 av 5, ett steg.  
I dag: Raderna stepRykten och kultTimme i TAKTER skickar inte tiden sedan sist. stepRykten använder RYKTE.vardagTakt en gång per anrop, stepSmak lägger smakBarn, smakArbete och smakBlekna en gång per anrop, och profetSteg drar chansen KULT.profetChans ('per timme') en gång per anrop. Ändras radens 'sek' blir byn en annan. glomRykten på raden under får däremot tiden och räknar rätt.  
Förslag: Låt de två raderna skicka dt, och räkna takten och chansen gånger dt delat med en timme. Vid en timmes takt blir talen desamma som i dag.  
Ändras i spelet: Ingen skillnad så länge takten är en timme.  
Prövningen: Regeln i CLAUDE.md säger att inget får räknas per anrop, och det gör de här tre. Vanhelgandet (en gång per dygn vid en känd tid) och den ledda bönens mellanrum (räknat mot klockan) bryter inte regeln och tas inte med.

**389. Borden som kan ha ett ljus är en hård lista i ljus.ts**  
Var: `src/sim/ljus.ts:235, 244; src/sim/stationer.ts:132, 226-242`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: LJUSBORD är en lista med namnen bord, bord2, bord3 och hylla i ljus.ts. En ny möbel som kan bära ett ljus måste läggas till där för hand, fast möblerna är rader i registret STATIONER.  
Förslag: Ett fält på raden i STATIONER (till exempel ljus: true) som ljusPlatser frågar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer och följer principen om register: det som finns fler av ska vara en rad som koden frågar. Liten och ofarlig ändring.

**390. Spelet läser händelseloggen för att avgöra om en förgiftning redan skrivits**  
Var: `src/sim/matlagning.ts:115`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: När någon blir matförgiftad av rått kött söker spelet i händelseloggen efter en rad från den senaste timmen om samma person med ordet 'förgiftad' (till exempel från svampen), och skriver bara en ny rad om ingen finns. Loggen rymmer 400 rader, och arbetsreglerna säger att spelet inte ska räkna ur den. Raden i varld.ts:101 är en gammal omvandling av sparfiler och gör inget i en ny by.  
Förslag: Spara tiden för den senaste förgiftningen på personen, på alla ställen som skriver en sådan rad (det råa köttet och svampen), och jämför mot den.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Det gäller bara om en rad skrivs två gånger, så följden är liten, men det bryter mot regeln om loggen och är lätt att rätta.

**391. Vädret, isen och marken antar att det gått exakt en timme**  
Var: `src/sim/vader.ts:178-183 (stepVader); src/sim/is.ts:49-56 (stepIs); src/sim/steg.ts:457, 463, 464 (raderna i TAKTER); src/sim/mark.ts:175 (growGround)`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Regeln om takterna säger att varje system räknar med tiden sedan sist. De här tre räknar med en fast timme, fast registret skickar med tiden. growGround tar redan emot timmar men får alltid talet 1. Det blir rätt i dag eftersom raderna står på en timme. Samma mönster finns i ett femtiotal andra timrader i registret (humör, kök, odling med flera), så tre rättade rader gör inte registret fritt att ändra.  
Förslag: Låt de tre ta emot tiden sedan sist från registret och räkna med den (för growGround räcker det att skicka dt i timmar).  
Ändras i spelet: Nej, så länge takten är en timme (gånger 1 ger samma tal).  
Prövningen: Stämmer och är riskfritt, men nyttan är liten så länge de andra timraderna gör likadant. En fullständig genomgång av alla timrader är ett eget, större arbete.

**392. Balanstal utanför balans() och lösa tal**  
Var: `src/sim/vacktgast.ts:26-28 (VACKTGAST); src/sim/vacktliv.ts:18-21 (VACKTLIV); src/sim/vacktfasta.ts:16; src/sim/vackt.ts:183, 211; src/sim/vacktrel.ts:50; src/sim/fangelse.ts:119, 237-238; src/sim/vaktat.ts:78`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: VACKTGAST och VACKTLIV är vanliga objekt och syns därför inte i npm run talen och går inte att pröva med --satt. Lösa tal i koden: fångens uppgift 30 minuter, tanken 0,1 i 12 timmar, parets åldersskillnad −3 till 6, färdighetens 0,25 × (0,4 + slump), parets 55 och 75, smygchansens golv och tak 0,02 och 0,95, standardåldern 35. VACKTGAST.nara och VACKTHJALP.nara är båda 1,5 men betyder olika saker (nära elden och nära bygget).  
Förslag: Lägg talen i systemens balans()-block med samma värden (regel 8 i ARKITEKTUR.md). Låt de två 'nära' vara var sitt tal.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer: talen står utanför balans() och bryter mot regel 8. Flytten ändrar inga värden. Att slå ihop de två 'nära' faller, för de mäter olika saker.

**393. Lösa tal utan namn: mörkrets timme i sporten, nyhetsvikten för priser och skrivarens glädje**  
Var: `src/sim/sport.ts:198, 292 (19); src/sim/tid.ts:85 (isLight har samma 19); src/sim/minne.ts:384 (2 : 1 för priser); src/sim/skrift.ts:211 (0.03 i 12 timmar), 522 (0.02 i 6 timmar), 89 och 323 (0.5 och 20 i egenintresset, två gånger)`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Sporten räknar på två ställen med att det blir mörkt klockan 19 som ett löst tal, samma tal som står löst i isLight i tid.ts. Ett pris som är en nyhet väger 2 i samtalet. Glädjen av att rista en sten och av att skriva ett blad, och formeln för egenintresset (i två kopior), står också som lösa tal. Regel 8 säger att sådana tal har namn i systemets block.  
Förslag: Ge kvällens timme ett namn i tid.ts som både isLight och sporten läser, och flytta de övriga talen till MINNE och SKRIFT. Byt bara siffran mot namnet, utan att ändra uttrycket runt den.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Alla talen finns på de angivna raderna, och regel 8 i ARKITEKTUR.md gäller dem. Liten vinst, men talen syns då i npm run talen och kan prövas utan att koden ändras.

**394. Balanstal som står som lösa tal**  
Var: `src/sim/framtradande.ts:89, 265, 269, 288, 374, 466; src/sim/framber.ts:15, 24; src/sim/tatuering.ts:77; ARKITEKTUR.md:246`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Regel 8 i ARKITEKTUR säger att tal som avgör hur spelet går står med namn i systemets balans-block. Här står de i koden: 0,5 i mottagningen (rad 466), som finns en gång till som FRAMBER.dalig med kommentaren att det är samma gräns, så ändras den ena stämmer berättelsen inte med det som hände; glädjen 0,05 i 6 timmar för den som fått betalt (tre ställen); 1,5 rutor för hur nära den som tatueras måste stå. Avståndet 0,9 rutor mellan medspelarna gäller bara var de står och är inget balanstal.  
Förslag: Lägg gränsen 0,5 som ett tal i FRAM som både rad 466 och framber.ts läser, och ta bort FRAMBER.dalig; ge betalningens glädje och tatueringens avstånd namn i FRAM och TATU.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Talen står som fyndet säger, och den dubbla gränsen 0,5 kan komma i otakt. Ändringen flyttar bara tal till namn och ändrar ingenting i spelet.

**395. Pyntets intryck räknas per anrop och inte med tiden sedan sist**  
Var: `src/sim/pynt.ts:18-21, 28-52; src/sim/steg.ts:417-419, 501`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: stepPynt står i TAKTER med 3600 sekunder men tar inte emot tiden som registret skickar (fn: s => stepPynt(s)). PYNT.syn är 'så mycket får den som ser det varje timme', och varje anrop ger hela vikten. Ändras raden i TAKTER ändras hur gott rykte pyntet ger. Dessutom frågas rummet (roomAt) en gång per person och pynt i stället för en gång per person.  
Förslag: Ta emot dt från registret och ge PYNT.syn × timmarna sedan sist (en timme om inget anges, så att scenarierna som anropar stepPynt direkt går som förut); räkna varje vaken persons rum en gång före looparna.  
Ändras i spelet: Ingen märkbar skillnad så länge takten är en timme.  
Prövningen: Registret skickar tiden men stepPynt använder den inte, vilket bryter mot regeln att allt räknas per tid. Rättelsen är ett par rader och ger samma resultat med dagens takt.

**396. Balanstal som står utanför balans()**  
Var: `src/sim/bynamn.ts:199-201 (BYNAMN_FRAGA.prio = 2); src/sim/utlysa.ts:115 (vill: () => 0.5); src/sim/bynamn.ts:41 (BYNT.annan: 0)`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Prioriteten för frågan om bynamnet (2) och styrets vilja att lägga silver på uppdrag (0,5) står direkt i koden. De syns inte i npm run talen och kan inte prövas med BALANS. BYNT.annan är noll, men det är grundvärdet i en formel (annan + annanRel × relationen) och ett tal man kan vilja skruva på.  
Förslag: Flytta de två talen in i blocken BYNT och UTLYSA (regel 8 i ARKITEKTUR.md). Låt BYNT.annan stå kvar.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: De två talen avgör hur spelet går och ska enligt regel 8 stå i balansblocken. Delen om BYNT.annan faller: ett balanstal som är noll är ändå en ratt i formeln.

**397. Färger skrivna som lösa tal i stället för ur paletten**  
Var: `src/ui/manniskor.ts:126, 264-267, 293, 297, 516, src/ui/smuts.ts:17-19`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: På de här raderna står färgerna som tal direkt i koden (t.ex. 0x372f25, 0xdad0bb, 0xa14808, 0x24201d och toalettens färger), medan resten hämtar dem med farg() ur paletten. Alla tolv talen är kontrollerade och finns i paletten, så inget ritas i fel färg i dag. Men det syns inte vilken ramp och ton de är, och de följer inte med om paletten ändras.  
Förslag: Byt talen mot fargTal(farg(ramp, ton)) med samma färg som i dag.  
Ändras i spelet: Nej. Alla talen är redan palettfärger.  
Prövningen: Stämmer, och ARKITEKTUR.md säger att all ritning tar färgerna ur paletten. Inget är fel i bilden i dag, så det är bara läsbarhet; gör det när filerna ändå ändras.

**398. Timstegen räknar "en timme per anrop" i stället för tiden sedan sist**  
Var: `src/sim/steg.ts:419-520,612-624; src/sim/odling.ts:592,595,731-735,814-824,849-862; src/sim/matlagning.ts:326,472; src/sim/brygg.ts:172; src/sim/kruka.ts:35-38; src/sim/rester.ts:67,101; src/sim/slatter.ts:157-158; src/sim/hage.ts:147-153,171; src/sim/boskap.ts:43-51,84`. Vinst 2 av 5, risk 3 av 5, ett steg.  
I dag: Registret TAKTER ger varje system tiden sedan sist, men odlingen, kokningen, bryggningen, krukorna, sophögen, komposten, hagarna, boskapen och vintern tar inte emot den. De räknar fast en timme per anrop: tillväxt, jäsning, kyla och chanser (skadedjur, växtsjukdom, staketets slitage, djur som rymmer, födsel). Första gången en by räknas får systemen dessutom en hel timme fast bara ett slag har gått. En kommentar i hage.ts visar att det var medvetet: raden står på en timme, så slagets längd spelar ingen roll.  
Förslag: Skicka tiden till stegen och byt de fasta timmarna mot tiden sedan sist, i takt med att filerna ändå ändras. Då kan raden i TAKTER ändras utan att byn blir en annan, som arbetsreglerna kräver.  
Ändras i spelet: Nästan ingen skillnad så länge systemen räknas en gång i timmen. Den första timmen i en ny by räknas lite annorlunda, så testernas facit ändras.  
Prövningen: Stämmer, och regeln i CLAUDE.md är tydlig: allt räknas per tid, en chans per anrop får inte finnas. Nyttan syns först om en takt ändras, och det är många system, så det bör göras som ett eget steg med det stora testet och likheten efteråt.

**399. Medspelarna på scenen får sin uppgift satt direkt, förbi arbetsordningen**  
Var: `src/sim/framtradande.ts:343-350, 356-371; GRANSKNING.md:63`. Vinst 2 av 5, risk 3 av 5, ett steg.  
I dag: Lyssnarna avbryts och väljer om, där 'lyssna' är en rad på nivån Tillfälle, så att den som fryser farligt värmer sig först. Medspelarna får däremot uppgiften 'upptrada' skriven rakt in av framVal (rad 349) utan att valet tillfrågas. Urvalet (kanKomma) släpper bara förbi den som sover eller gör något som inte ens ett larm avbryter; den som fryser, svälter eller har ett barn som ropar skickas ändå upp på scenen.  
Förslag: Låt medspelarna, som redan står i f.grupp, avbrytas som lyssnarna och få 'upptrada' vid sin plats på raden genom samma Tillfälle-rad när de väljer om. gruppVal behåller urvalet, och task-bygget på rad 349 försvinner.  
Ändras i spelet: En medspelare som har något viktigare för sig (fryser, svälter, vårdar någon) går inte upp på scenen; annars ingen skillnad. Regeln att bara de som står på scenen när det börjar räknas finns redan.  
Prövningen: Rad 349 startar ett arbete vid sidan av arbetsordningen, som GRANSKNING.md pekar ut, och designen säger att faror går före framträdandet. Ändringen rör valet och likheten, så den görs som ett eget steg med scenariot framgrupp.

**400. Timraderna räknar 'en timme per anrop' i stället för tiden sedan sist**  
Var: `src/sim/steg.ts:436-526 (raderna med sek: 3600 och fn: s => …), 464 (growGround(s, 1, …)), 612-623 (taktDt); src/sim/tamdjur.ts:97-103; src/sim/sjukdom.ts:161-171`. Vinst 2 av 5, risk 3 av 5, ett steg.  
I dag: Ungefär 80 rader i TAKTER tar inte emot tiden utan förutsätter att precis en timme gått: growGround får det fasta talet 1, stepTamdjur drar ålderdomens chans per anrop, smittaTimme drar smittans chans per anrop. Regeln (CLAUDE.md och 'Varningen' i fliken Läget) säger att en chans per anrop inte får finnas. I dag blir det rätt, eftersom raden går exakt en gång i timmen. Men taktDt kör varje rad direkt första gången i en ny by, en äldre sparning eller när klockan flyttats, och då räknas en hel timme för ett slag på två sekunder. Ändras en rads sek i registret blir systemet tyst långsammare.  
Förslag: Minsta ändringen: de timfunktioner som har en chans eller en tillväxt (växtligheten, tamdjurens ålderdom, smittan och liknande) tar emot timmarna sedan sist (dt / 3600) och gångrar med dem. De som bara kontrollerar eller städar något lämnas. Då kan långsamma saker räknas glesare bara genom att ändra sek i registret.  
Ändras i spelet: Ingen märkbar skillnad. Tiden mellan två timmar är inte alltid exakt 3600 sekunder (efter korta eller långa slag skiljer det upp till en minut), så chanserna ändras med någon procent och facit sparas om. Det första slaget i en ny by räknar inte längre en hel timmes växt och chanser.  
Prövningen: Stämmer i koden och bryter mot regeln 'per tid, aldrig per anrop', som står både i arbetsreglerna och i designdokumentet. Det är inget fel som syns i en by som går, så gör bara de funktioner som har en chans eller en tillväxt, inte alla 80 rader.

### Optimeringar (48)

**401. Krönikan letar upp alla namn i alla rader två gånger i sekunden**  
Var: `src/ui/flikar/kronika.ts:17, 20-29, 70-87`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Varje gång panelen ritas om (ett par gånger i sekunden, enligt panel.ts) går rader() igenom hela krönikan, som sparas för alltid, och letar i varje rad efter varje persons namn, också de dödas. Varje loggrad letas dessutom upp i hela krönikan (rad 27) fast en mängd för samma sak byggs på raden ovanför. Listan med upp till 300 rader byggs till HTML innan koden ser att delen Skrifter eller Fritid är vald och slänger den (rad 83-86).  
Förslag: Leta namn bara i de högst 300 rader som visas, använd en mängd i stället för krona.some, och gå ur html() tidigt för Skrifter och Fritid innan listan byggs.  
Ändras i spelet: Ingen skillnad i vad som visas. Sidan flyter bättre med Krönikan öppen i en gammal by med många döda.  
Prövningen: Stämmer rad för rad. Arbetet växer med både byns ålder och antalet människor som levt, och rättningen ändrar bara när saker räknas, inte vad som visas.

**402. Scenen försöker flytta in varje timme och nollställer alla minnen**  
Var: `src/sim/stationer.ts:1441-1445, 1629-1636, 600`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Står scenen ute och byn har en samlingssal utan plats för den, prövar scenIn varje timme, för alltid. Varje försök tar bort scenen och lägger tillbaka den (utan), vilket höjer byggV två gånger. 24 filer i simuleringen har minnen som då kastas och räknas om, bland annat vägarna. Det kan hända: finns ingen plats i salen byggs scenen ute.  
Förslag: Scenen som flyttas står ute och påverkar inte sökningen inne i salen. Anropa siteInne direkt utan utan(), så rörs inte byggV. Vill man vara säker: pröva bara igen när byggV har ändrats sedan förra försöket.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer, och det är enklare än läsaren föreslog: en scen ute står inte i något rum, så den behöver inte tas bort under sökningen. Minnena ska ge samma svar ändå, men samma-kollen bör köras efteråt.

**403. Hela utseendet görs till text för varje person varje bildruta**  
Var: `src/ui/folkbild.ts:38-49, 51-59; src/ui/utseende.ts:90; src/ui/manniskor.ts:431`. Vinst 3 av 5, risk 2 av 5, liten ändring.  
I dag: För varje person varje bildruta räknas utseendet fram på nytt (skapad: ålder, ärr, kropp, kläder, det hen bär), och figurTex gör sedan hela utseendet till en lång text för att slå upp den sparade bilden. Porträtten gör samma sak varje gång panelen ritas.  
Förslag: Spara utseendet och dess nyckeltext per person så länge byns tid (s.now) är densamma. Det är enklare och säkrare än att hålla reda på vad som ändrats (ålder, kläder, skador, humör, kyla).  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer, och det växer med antalet invånare. Sparas det per slag i stället för per ändring finns ingen risk att en figur visar ett gammalt utseende.

**404. Sedernas drag räknas om för varje sed i stället för en gång**  
Var: `src/ui/flikar/seder.ts:60-63, 64-72, 80-88, 16; src/ui/flikar/styre.ts:34`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 3 rader bort.  
I dag: sedFormat(k) anropar sedRader() för varje öppen sed, och sedLista(k) en gång till för den sed som är utfälld. sedRader går igenom alla invånares upplevelser och minnen (sedLaggning, roster och sedDrag i src/sim/seder.ts). Det görs alltså en gång per sed vid varje omritning, också i Styres vågskålar, där dessutom sederTarget räknas om per vågskål. Filtret och sorteringen står två gånger.  
Förslag: Räkna sedRader() en gång per omritning och skicka in listan, och låt sedFormat och sedLista dela en hjälpare som filtrerar och sorterar raderna för en sed.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer, med rättelsen att sedLista bara räknar för den sed som är utfälld (en i taget). Vinsten är måttlig och gäller bara när Seder eller Styre är öppen, men ändringen är ofarlig.

**405. Högar och stationer söker igenom alla ting varje bildruta**  
Var: `src/ui/foremal.ts:68, 74, 293`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: drawPile letar upp sitt ting i hela listan på rad 68 för varje hög som har ett id, och en gång till på rad 74 om högen är en lerkruka. Stationer med en plats för en sak bredvid letar igenom listan på rad 293. Det görs per hög och per station, varje bildruta.  
Förslag: Slå upp tinget en gång per hög och använd det på båda raderna. Bygg en tabell från id till ting en gång per ritning. Det mesta försvinner om markens saker bara ritas om när något ändrats (första fyndet).  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer rad för rad. Liten och ofarlig ändring som bara rör bilden.

**406. Släckningen bygger en lista över alla saker i byn för varje person och varv**  
Var: `src/sim/brand.ts:160-178 (bransleAv), 747 (latt), 774`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: bransleAv(s) bygger en mängd av alla högar och redskap på marken första gången den frågas. Den som släcker med händerna frågar genom latt() för varje varv i sin slinga (upp till 40 per slag), och varje fråga bygger mängden på nytt.  
Förslag: Skapa bransleAv(s) en gång överst i slackaSteg och fråga den i slingan, som slackaFram redan gör. Det är enklare och säkrare än ett minne per by och tid, som kan bli gammalt när saker brinner upp mitt i slaget.  
Ändras i spelet: Nej. Släckningen ändrar inga högar i slingan.  
Prövningen: Stämmer, och rättningen är en rad. Ett minne på byn och tiden (läsarens förslag) bör undvikas: högar brinner upp i samma slag och då blir minnet fel.

**407. Tornadons hela bana räknas om varje gång någon frågar vilken motgång som gäller**  
Var: `src/sim/tornado.ts:99-142 (tornadoBana, tornadoTid, nyBana), 137, 208; src/sim/motgang.ts:78, 106-112; src/sim/vader.ts:150`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: I en tidsålder med tornado (sju dygn) räknar motgangNu ut hela banan, upp till hundra ben, bara för att få veta när tornadon är på kartan. motgangNu frågas av tornadons steg varje slag, av vädret, torkan, översvämningen och jakten.  
Förslag: Spara tornadons tid per by och tidsålderns start (WeakMap på State), så att banan räknas en gång per tidsålder. Testlägets tornado (med mål) sparas inte där.  
Ändras i spelet: Nej.  
Prövningen: Stämmer. Banan beror bara på byns frö och tidsålderns start, så ett minne per by är säkert och följer regeln om cacher.

**408. Slagen till bilden letas fram ur hela stridsloggen varje stridssteg**  
Var: `src/sim/kartstrid.ts:78-87, 208-210; src/sim/strid.ts:547-555`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: När spelet visas anropas tillBilden efter varje stridssteg (fem gånger per sekund i spelet). Den bygger listan slagen(st) över hela loggen från början och kastar sedan allt före n0. I en lång strid växer loggen, så arbetet växer med kvadraten på stridens längd. Det görs bara när bilden är på, inte i ikappräkningen.  
Förslag: Gå bara igenom raderna från n0 (en loop från n0 över st.logg) och gör raden till en slaghändelse där, med samma omvandling som slagen().  
Ändras i spelet: Ingen skillnad; stora strider hackar mindre när man tittar på.  
Prövningen: Stämmer i koden och är lätt och ofarligt att rätta: bilden läses aldrig av simuleringen, så inget i spelet ändras.

**409. Skrivlusten bygger om listan över alla skrifter många gånger per person**  
Var: `src/sim/skrift.ts:287-288 (skrifter, harBlad), 313-372 (skrivLust), 110-122 (lagSkrivVikt, lagLust), 165-174 (projektet runsten)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: harBlad anropar skrifter(s), som går igenom alla ting och bygger en ny lista. skrivLust anropar harBlad en gång per sorg, en gång per lärdom som slår den hittills bästa, två gånger för intrycket, och hämtar listan några gånger till (handböckerna, kartorna, antalet egna skrifter). Projektet runsten frågar runstenLust var för sig i brist, egen, kan, recept och uppgift.  
Förslag: Hämta skrifter(s) en gång i början av skrivLust och skicka listan till hjälparna. Mät med npm run kostnad före och efter. Sparade svar per timme för lagarna och runstenslusten väntar tills mätningen visar att de behövs.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer i koden. Det körs bara i byar som har blad eller bläck, så det märks först sent i spelet. Att hämta listan en gång är ofarligt; resten av förslaget bör vänta på en mätning.

**410. Vem som är fattig räknas om från början för varje person och varje matslag**  
Var: `src/sim/budget.ts:71-77 (fattig), 97-101, 154 (matFor), 229; src/sim/lager.ts:761-776 (takeFood)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: fattig hämtar alla vuxna, tar deras förmögenhet och sorterar listan för att hitta mitten, varje gång den frågas för en enda person. När någon äter frågar takeFood budgeten inne i slingan över alla matslag (rad 771), så mittvärdet räknas om en gång per matslag och måltid. Det händer bara i byar som har delen Stöd till fattiga i budgeten.  
Förslag: Räkna gränsen för fattig en gång per tidpunkt (sparad på byn med klockan som nyckel, som förmögenheten i skatt.ts rad 81-91) och hämta listan över matdelar en gång före slingan i takeFood.  
Ändras i spelet: Ingen skillnad; byar med skattelag och budget går lite fortare att räkna.  
Prövningen: Stämmer, och mönstret för att spara svaret finns redan i skatt.ts. Vinsten är liten och gäller bara byar med den budgetdelen, men risken är också liten.

**411. Handlaren slås upp bland alla personer flera gånger per person och slag**  
Var: `src/sim/handel.ts:553 (visaFiltar varje slag), 585-598 (pratMedHandlare), 612-618 (handlarVarde), 712-713; src/sim/gast.ts:117-121 (hp)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: hp letar igenom alla personer, också de döda, varje gång den frågas. I pratMedHandlare, som körs varje slag medan handlaren väntar eller handlar, frågas den två gånger för varje person bara för att mäta avståndet. handlarVarde slår upp hen två till tre gånger per anrop och anropas inne i en sortering. visaFiltar bygger dessutom om filtarnas listor varje slag.  
Förslag: Hämta handlarens person en gång överst i pratMedHandlare, handlarVarde, kommer, lagUt och saljaAv och använd den. Låt visaFiltar vara kvar som den är: den städar också bort kundens filt när affären glöms, och vinsten där är liten.  
Ändras i spelet: Ingen skillnad; spelet går lite fortare när en handlare är i byn.  
Prövningen: Stämmer: uppslaget görs i onödan många gånger per slag. Att spara personen i en variabel är ofarligt; delen om visaFiltar tas inte med eftersom den rör hur filtarna städas.

**412. Kvadratiska stationer söks två gånger, vriden och ovriden**  
Var: `src/sim/stationer.ts:755, 800 (jfr 645, 939)`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: sokUte och siteInne prövar alla platser både ovriden och vriden, också för stationer som är lika breda som djupa (kista, härd, bakugn med flera). Den vridna omgången ger samma rutor med 0,5 poäng sämre (STATION.vriden) och kan aldrig vinna. sokUtkant och siteMatta hoppar redan över den.  
Förslag: Hoppa över den vridna omgången när storlek(k, 0) har samma bredd och djup, som i siteMatta. Jämför med storlek() och inte med registrets w och h, så att stationer i flera delar blir rätt.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer: samma rutor prövas två gånger och den andra kan inte vinna så länge talet vriden inte är negativt. Halva sökningen sparas för de kvadratiska stationerna med en rad.

**413. Samma genomgång av alla invånare görs flera gånger per omritning**  
Var: `src/ui/flikar/person.ts:278-279, 480-483, 634; src/ui/flikar/station.ts:130; src/ui/flikar/religion.ts:83, 85, 87-88; src/ui/flikar/grannar.ts:91`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: Ryktena: vem(k) går igenom alla levande och anropas tre gånger per symbol (högst sex symboler). Tro: antalet troende räknas inne i sorteringen och igen i varje tro, och andligheten räknas i sorteringen och tre gånger till per person. fritidLista byggs två gånger, först bara för att se om den är tom (person.ts:634, station.ts:130). Behov räknar vilket rum varje levande står i vid varje omritning.  
Förslag: Räkna en gång per omritning och återanvänd: en tabell från intryck till vem i ryktena, antalet troende per tro och andligheten per person före sorteringen, och lägg fritidLista i en variabel.  
Ändras i spelet: Ingen märkbar skillnad.  
Prövningen: Stämmer på de ställen jag öppnade. Varje sak är liten och gäller bara när just den fliken är öppen, men rättningarna är enkla och ändrar inget som visas.

**414. Varje station letar igenom alla människor varje bildruta**  
Var: `src/ui/ibruk.ts:12-21, src/ui/foremal.ts:292`. Vinst 2 av 5, risk 1 av 5, liten ändring.  
I dag: iBruk(st) anropas för varje färdig station varje bildruta. Den söker då igenom alla levande personer (plats och avstånd per person), och för den som arbetar också listan med ting.  
Förslag: Gå igenom människorna en gång per ritning och bygg en tabell från station till den som arbetar där. Stationerna slår sedan upp sig i tabellen. Den första i listan ska vinna, som nu.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer i koden, och rättningen är liten och rör bara bilden. iBruk används också i stationens flik, så funktionen ska finnas kvar med samma svar.

**415. Byn går i kortaste slag hela tiden en vargflock finns på kartan**  
Var: `src/sim/varg.ts:701 (jämför bjorn.ts:261-267); src/sim/kartstrid.ts:99-115; src/sim/klocka.ts:7-18`. Vinst 3 av 5, risk 3 av 5, ett steg.  
I dag: Vargarnas rad i SLAGHINDER svarar alltid 2 sekunder när en flock finns, hur långt bort den än är. Annars kan slaget bli upp till 60 sekunder när alla sover. VARG.kommer säger själv att det finns vargar nästan hela vintern. Björnen räknar i stället tiden tills någon kan komma nära. Rövarna, gästerna, handlaren, branden och tornadon gör som vargarna.  
Förslag: Mät först med npm run kostnad hur mycket vinternätterna kostar. Är det mycket: räkna som för björnen, men med allt flocken kan möta i ett slag: folket (vakten ser 24 rutor), tamdjuren ute och förrådet. Flockens gång kontrollerar bara stegets slutpunkt och måste då gå i bitar om högst en ruta, annars hoppar den över väggar och vatten.  
Ändras i spelet: Ingen märkbar skillnad i hur byn lever. Byarna utvecklas inte exakt som förut, och snabbläget går fortare på vintern.  
Prövningen: Stämmer i koden, och björnen visar att det går. Men vinsten är inte mätt och flocken gör mycket varje slag (ser, smyger, tar djur), så det ska mätas först och byggas försiktigt, med npm run likhet efteråt.

**416. Kartans saker ritas om från noll i varje bildruta fast byn bara ändras varje slag**  
Var: `src/main.ts:217-229, 243-246; src/ui/foremal.ts:232-335 (drawStructures); src/ui/lage.ts:86-89 (piles, nyBild); src/ui/tona.ts:10-21`. Vinst 3 av 5, risk 3 av 5, ett steg.  
I dag: tick() anropar nyBild() och ritaKartan() i varje bildruta. nyBild() kastar listan över högar, så pilesOf(s) räknas om varje gång. drawStructures tömmer structG och overG och bygger om allt: lagerplatserna (en ny PIXI.Matrix per plats), byggbitarna, fälten, stationerna, dörrarna, facklorna och högarna. Varje station söker igenom alla ting efter redskapet som ligger vid den. drawTona samlar en punkt per person, hög, station och husruta varje bildruta. Byn ändras bara när ett slag räknats (vanligen varannan sekund). Det som rör sig mellan slagen är människorna, djuren och små animationer (bimolnet, glansen, lågan), som läser datorns tid t.  
Förslag: Mät först hur lång tid en bildruta tar i en stor by i mobilen. Börja med det enkla: nyBild() anropas bara när byn räknats (s.now har ändrats), när byn byts och när en knapp i gränssnittet ändrat byn. Dela sedan drawStructures i det fasta och det som rör sig. Det fasta ritas om när ett slag räknats eller när fliken eller markeringen byts. Ingen cache per sak: en enda fråga 'har byn räknats sedan förra bildrutan?'.  
Ändras i spelet: Nej. Byn räknas likadant. Bilden bör flyta bättre, mest i mobilen och i stora byar. Felet som kan uppstå är att något på kartan visas för sent (en gammal bild).  
Prövningen: Det stämmer: drawStructures och drawTona har ingen nyckel, medan drawPlants och de andra redan hoppar över när inget ändrats. Vinsten är inte mätt, och risken är en bild som inte uppdateras efter en knapptryckning, så mät först och ta listan över högar först.

**417. Allt som står på marken och alla hus ritas om varje bildruta**  
Var: `src/ui/foremal.ts:232-354, src/ui/husbild.ts:66-129, src/main.ts:217-231`. Vinst 3 av 5, risk 3 av 5, ett steg.  
I dag: drawStructures körs i ritaKartan varje bildruta. Den tömmer och ritar om zoner, hus, fält, högar, stationer, dörrar, facklor, stubbar och gravar, fast byn bara ändras när ett slag räknats. För varje husbit räknar ritaHus fram en nyckel (åtta grannar, golvet hos dem, huset och en textsträng) innan den sparade bilden slås upp.  
Förslag: Rita om det som står still bara när något ändrats (ett nytt slag, annan vald lagerplats, annan smuts). Det som rör sig (elden, röken, glansen, binas moln, framstegscirklarna) ritas varje bildruta i egna lager. För husen: spara nyckeln per bit tills husen ändras.  
Ändras i spelet: Ingen märkbar skillnad om det görs rätt. Kartan blir lättare för datorn och mobilen, mest i stora byar.  
Prövningen: Det stämmer: allt ritas om sextio gånger i sekunden. Men elden, röken och högarna ligger i samma lager som sorteras efter höjd, så delningen måste göras försiktigt och prövas med npm run utseende.

**418. Texttesterna kör egna byar i 6 till 14 dygn fast sparade testbyar finns**  
Var: `src/test/scenarier/folk.ts:2166-2167 (merliv, 14 dygn), 2230-2231 (kronika, 10 dygn), 2333-2334 (relationstext, 6 dygn); src/test/scenarier/hjalp.ts:39 (testBy); test/scenariotider.json (merliv 228, kronika 138, relationstext 50)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Tre scenarier kör by 3 orörd i 14, 10 och 6 dygn (år i spelet) och läser sedan bara texter ur den. Det finns redan en hjälpare, testBy, som ger en sparad by ur facit av minst en viss ålder och används på över hundra ställen. De tre andra som läsaren nämnde (gjort, masterverk, amnen) ändrar byn före körningen eller tittar medan den går, och kan inte dela by. En gemensam cache i minnet hjälper inte heller: scenarierna körs i olika processer.  
Förslag: Låt merliv, kronika och relationstext ta `testBy(15)`, `testBy(10)` och `testBy(10)` i stället för att köra en egen by. Se efter att gränserna håller i den sparade byn (kronika läser loggen, som bara rymmer 400 rader, och kan behöva läsa krönikan i stället). Lämna gjort, masterverk och amnen.  
Ändras i spelet: Ingen skillnad i spelet. Uppskattat 300 s mindre datortid per full körning (inte mätt).  
Prövningen: Tiderna stämmer, men lösningen finns redan i koden (testBy) och gäller bara tre av de sex. Risken är att en sparad by saknar något en kontroll väntar sig, vilket syns direkt som en röd rad.

**419. Sedernas dragning räknas för alla tolv seder när bara en behövs**  
Var: `src/sim/seder.ts:104-114, 176, 202-205; src/sim/rost.ts:222, 239; src/sim/skatt.ts:93; src/sim/lon.ts:38; src/sim/budget.ts:57; src/sim/styre.ts:183, 214; src/sim/bynamn.ts:177`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: drar() räknar alla tolv sedernas dragning för en människa, med upplevelserna och minnena av de döda. naturTanke anropar den för alla levande vid varje fällt träd fast bara 'natur' läses. Samma lilla hjälpare 'lutning' (dragningen mot gemenskap, hållen inom -1 till 1) står ordagrant i skatt.ts, lon.ts och budget.ts.  
Förslag: En variant som räknar en enda sed, som naturTanke, lutning och ledarens åsikter använder. En gemensam 'lutning' i seder.ts i stället för tre. Spara inte resultatet per timme: upplevelser och intryck ändras under timmen, och då skulle byn räkna annorlunda.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: De tre likadana hjälparna och det onödiga arbetet vid varje fällt träd stämmer. Sparandet per timme tas inte med, eftersom det kan ändra byns utveckling; hur mycket datortid som sparas är inte mätt.

**420. Slagets längd och faran räknas tre gånger per slag**  
Var: `src/main.ts:243; src/ui/spara.ts:188; src/sim/steg.ts:393-403 (stegBy); src/sim/kartstrid.ts:91-115 (faraNara, nastaSteg, slagLangd); src/sim/rovare.ts:831; src/sim/bjorn.ts:261-269`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Spelet och ikappräkningen anropar step(h, nastaSteg(h)). Inne i stegBy räknas nastaSteg(s) en gång till före slaget och en tredje gång efter det, bara för att se att tiden inte räcker till ett slag till. Varje gång körs alla rader i FAROR och SLAGHINDER och jämförelsen alla mot alla i slagLangd. Rövarnas farorad hämtar living(s) en gång per rövare, och björnens två rader letar upp björnen var för sig.  
Förslag: Minsta ändringen: stegBy slutar direkt när ingen tid är kvar (då behövs ingen tredje räkning), och en funktion som räknar exakt ett slag (längden räknas en gång och används) för huvudloopen och ikappräkningen. Testerna får fortsätta anropa step(s, nastaSteg(s)). living(s) hämtas en gång per farorad.  
Ändras i spelet: Nej. Samma slag i samma ordning. Kontrolleras med npm run samma och npm run likhet.  
Prövningen: Stämmer: nastaSteg räknas hos den som anropar och två gånger i stegBy. Vinsten är liten per slag men gäller alla slag, och ändringen rör inte vad som räknas, bara hur många gånger frågan ställs.

**421. fulspel skapar över 600 hela byar för att mäta en chans**  
Var: `src/test/scenarier/folk.ts:3122-3138 (by, andel); src/sim/rost.ts:267-281 (fraktionSamtal, fulspel); test/scenariotider.json (fulspel 132)`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: För att mäta chansen skapas en ny by 200 gånger för vart och ett av tre värden på empati, och sedan upp till 100 byar två gånger för att hitta en lögn. Scenariot tar 132 s datortid. Chansen dras ur personens egen slump, så den går lika bra att mäta med många samtal i samma by.  
Förslag: En by per empati och 200 samtal i den. Räkna hur mycket byns räknare `fulspel` ökar, och nollställ mellan samtalen det samtalet ändrar (lyssnarens intryck, relationen till ledaren och fraktionen, som annars kan växa eller avslöjas). De två sökningarna efter en lögn kan göras på samma sätt.  
Ändras i spelet: Ingen skillnad i spelet. Scenariot blir mycket snabbare (datorns tid, inte spelets).  
Prövningen: Stämmer, och tiden är mätt. Det som kräver omsorg är att samtalet har sidoeffekter som måste nollställas, och att gränserna (30 % och 15 %) kan behöva ses över när slumpen blir en annan.

**422. Rädda räknar farorna på nytt fast valet redan har dem**  
Var: `src/sim/val.ts:798-800, 1153-1158, 1311, 1340, 1353`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Raden slakta räknar farorna (alla levande och matens dygn) i varje val på dagen, också för barn som ändå inte får slakta, fast valet redan har farorna sparade. Handarbetet räknar dem en gång till, och matens och vedens dygn på nytt. Raderna på Rädda går dessutom igenom alla stackar för att se när något blir dåligt, och raden bära in summerar värdet av allt som ligger ute, för varje person i varje val.  
Förslag: Det säkra först: låt raden slakta pröva åldern först och använda valets egna faror. Det ger exakt samma resultat. Att spara 'timmar tills det blir dåligt' och värdet ute per timme ändrar spelet lite och görs bara om npm run kostnad visar att det lönar sig.  
Ändras i spelet: ingen skillnad för den säkra delen. Den andra delen gör värdet ute upp till en timme gammalt.  
Prövningen: Den säkra delen stämmer och kostar nästan inget att göra: samma faror räknas två gånger i samma val. Resten är inte mätt och bör vänta på kostnadsmätningen i fasens kodgenomgång.

**423. Vilka grödor byn kan så räknas om för varje ruta**  
Var: `src/sim/odling.ts:222-227,250,360-382,411,419,429; src/sim/val.ts:794`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: grodorNu går igenom alla levande och alla grödor, läser förrådet och sorterar. Den anropas på nytt för varje ruta som ska sås när den bästa rutan väljs, i varje steg av arbetet och i flera andra frågor, och valet frågar för varje vuxen som har ett fält.  
Förslag: Räkna listan en gång per fråga (per val och per arbetssteg) och skicka den vidare, i stället för per ruta. Ett minne per timme är osäkrare, eftersom poängen beror på förrådet, som ändras hela tiden. Mät med npm run kostnad före och efter.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Anropen stämmer. Förslaget är ändrat till ett som inte kan ändra spelet; läsarens minne per timme skulle kunna ge en gammal ordning på grödorna. Vinsten är inte mätt.

**424. Värdet runt en brinnande ruta räknas flera gånger per person och slag**  
Var: `src/sim/brand.ts:372, 488-493, 671-676, 742`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: slackVarde summerar värdet i 25 rutor runt elden och frågar sedan hotad, som summerar samma 25 rutor igen när rutan inte ligger nära byn. Det görs för varje brinnande ruta och varje larmad person varje slag. Om elden hotar byn räknas i brandens steg och en gång till per person i valet.  
Förslag: Börja med det enkla: använd den redan räknade summan i slackVarde i stället för att fråga hotad. Mät med npm run kostnad under en brand innan något sparas mellan slagen.  
Ändras i spelet: Nej.  
Prövningen: Stämmer i koden. Den enkla delen (inte summera två gånger) är riskfri; ett sparat värde per ruta bör vänta tills mätningen visar att det behövs.

**425. Teknikerna: materialet frågas för varje öppen teknik i varje arbetsbit, och lärlingsvalet räknar om i sorteringen**  
Var: `src/sim/teknik.ts:260 (harSak), 303-322 (thinkWhileWorking, framat), 398-414 (arbetaBredvid), 427-441 (stepLarlingar)`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: framat frågar hasMaterial för varje öppen teknik i varje arbetsbit, och harSak går igenom alla ting för redskap. arbetaBredvid letar för varje öppen nivå 3-teknik igenom alla personer (också döda, som dock sorteras bort direkt) efter någon som kan och arbetar nära. stepLarlingar, som körs en gång i timmen, räknar om hur många som kan en teknik vid varje jämförelse i sorteringen.  
Förslag: Mät först med npm run kostnad. Räkna antalet som kan varje teknik en gång i stepLarlingar. Visar mätningen att hasMaterial kostar: spara svaret per teknik och timme, som naraByn gör.  
Ändras i spelet: Ingen skillnad för lärlingsvalet. Ett sparat svar om materialet kan vara upp till en timme gammalt, så en teknik kan öppnas en timme senare än i dag.  
Prövningen: Stämmer i koden, men ingen mätning visar hur mycket det kostar. Lärlingsvalet går en gång i timmen och är billigt att rätta; det sparade svaret för materialet ändrar spelet lite och ska bara göras om kostnaden syns i mätningen.

**426. Förrådets slitage räknas varje minut fast skicket ändras över dygn**  
Var: `src/sim/lager.ts:832-835 (wearMult), 883-914 (wearStore); src/sim/blotved.ts:28 (stepBlotVed, samma rad i TAKTER); src/sim/steg.ts:432`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Var sextionde sekund går wearStore igenom alla stackar och alla ting och frågar för varje om tak, förvaring, lagerplats, väder, översvämning och smuts. Maten håller 1–20 dygn (1–20 år i spelet) och redskapen längre, så en minut ändrar skicket med bråkdelar av en procent. Räkningen går redan på tiden sedan sist. Veden som blir blöt räknas på samma rad.  
Förslag: Sätt takten för raden 'förrådets slitage' i TAKTER till 600 sekunder (inte 3600, så att regnskurar och dygnets temperatur fortfarande följs). Mät före och efter med npm run kostnad.  
Ändras i spelet: Ingen märkbar skillnad: mat ruttnar och redskap slits lika fort, men avläst var tionde minut. En stack som ruttnat bort försvinner upp till tio minuter senare. Nytt facit behövs.  
Prövningen: Stämmer, och följer regeln om takterna: ett system räknas efter hur fort saken ändras på riktigt. Ett tal ändras och allt räknas redan per tid; redskap som går sönder i handen tas bort på annat ställe och påverkas inte.

**427. Äcklet räknar om byns alla smutspunkter för varje vaken person**  
Var: `src/sim/smuts.ts:187-223, src/sim/steg.ts:528-533,727-728`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: akel(s, p) anropas för varje person i raden 'behoven' i TAKTER, som går var 30:e sekund i spelet (inte varje slag, som läsaren skrev). Varje anrop bygger om listan smutsPunkter: allt blod, alla fläckar och alla stackar med rester, med en fråga om de ligger i byn. Kommentaren säger att minnet togs bort för att svaret annars berodde på vem som frågade först.  
Förslag: Mät först med npm run kostnad. Syns det: räkna listan en gång i raden 'behoven' före personloopen och skicka in den till akel. Den som kissar på sig i samma varv syns då först nästa varv (30 sekunder senare).  
Ändras i spelet: ingen märkbar skillnad (en ny toafläck kan äckla någon 30 sekunder i spelet senare, så nytt facit behövs)  
Prövningen: Stämmer, men det körs var 30:e sekund och inte varje slag, så vinsten är mindre än läsaren trodde. Enkelt och ofarligt att räkna listan en gång per varv, om mätningen visar att det kostar.

**428. Det man bär och har på sig letas fram ur alla ting vid varje fråga**  
Var: `src/sim/utrustning.ts:77-91,231-251,261-292, src/sim/agande.ts:29,38, src/sim/steg.ts:515,671`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: paSig, harBalte, paSigVikt, kladVarme, doljISno, ryggsack, hangerVid och heldBy går var för sig igenom byns alla ting. kladVarme anropas per person var 30:e sekund i spelet (raden 'behoven'), inte varje slag. stepKlader (varje timme) går för varje person och varje slag av plagg (över 60) igenom alla ting. Vem som bär eller håller ett ting skrivs direkt i fälten på 37 ställen i 12 filer, utan en gemensam funktion.  
Förslag: Bara det ofarliga: i stepKlader samlas de lediga plaggen per slag en gång per timme, i tingens ordning, och ett plagg tas ur samlingen när någon tar på sig det. Ett uppslag per bärare för hela byn byggs inte: det skulle kräva att alla 37 ställen meddelar ändringen, och ett glömt ställe ger fel som är svåra att hitta. Mät med npm run kostnad först.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer att tingen letas igenom ofta, och klädsteget är den dyra delen i snabbspolning. Håller bara i den lilla formen (samla plaggen en gång i stepKlader); uppslaget för hela byn är för riskabelt.

**429. Platssökningen inomhus räknar om allt per ruta**  
Var: `src/sim/stationer.ts:566-573, 778-815, 1083-1090`. Vinst 2 av 5, risk 2 av 5, ett steg.  
I dag: siteInne går igenom alla rum och rutor vid varje anrop, och golvFri söker för varje ruta igenom lagerplatserna, högarna, tingen och eldarna. Sökningen ute har en färdig mängd upptagna rutor och ett minne per timme; inomhus finns ingetdera. kanBygga frågar per person och inomhusstation. golvLedigt används bara av ett test.  
Förslag: Steg ett, säkert: bygg en mängd av upptagna rutor en gång per sökning i siteInne, med exakt samma villkor som golvFri har i dag (ting som någon bär räknas inte; upptagna() räknar dem, så den kan inte användas rakt av). Steg två, bara om npm run kostnad visar att det behövs: ett minne per timme som siteUte har, där platsen prövas igen innan den används.  
Ändras i spelet: Ingen skillnad med steg ett. Ett minne per timme kan ge en annan plats för en möbel om något ändras under timmen.  
Prövningen: Det stämmer att sökningen inne saknar det sökningen ute har. Hur mycket tid det tar är inte mätt, så börja med mängden, som inte ändrar något, och mät före minnet.

**430. Rutprovet för husplatser söker högar, ting, stockar och stubbar per ruta**  
Var: `src/sim/byggplan.ts:97-105, 659-666, 839-842`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: tileOk går igenom alla högar, ting, stockar och stubbar för varje ruta som prövas. Svaret sparas per ruta under en planering (okMinne), men varje ruta kostar ändå hela listorna en gång, och planen görs var tredje timme i spelet.  
Förslag: Bygg mängderna av upptagna rutor en gång i byggbart(), första gången en ruta frågas, med exakt samma villkor som tileOk har i dag: högar och liggande ting (inte de som någon bär) räknas inte i en lagerplats, stockar och stubbar räknas alltid. upptagna() i stationer.ts räknar också burna ting och kan inte användas rakt av. Mät med npm run kostnad före och efter. torgFritt körs så sällan att det kan vara.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Det stämmer, och det går att göra så att svaret blir exakt detsamma. Det blir inte kortare kod utan snabbare, och vinsten bör mätas.

**431. Ljuset på en ruta bygger om alla ljuskällor vid varje fråga**  
Var: `src/sim/ljus.ts:47-84, 109-114; src/sim/steg.ts:909-910, 1160; src/sim/val.ts:1339, 1478; src/sim/skrift.ts:436`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: ljusAt anropar kallor(s) för alla fem raderna i LJUSKALLOR varje gång: nya listor, en genomgång av alla ting i byn (facklorna), rummet för varje eld, ljus och uppsatt fackla, och brandens kant. På natten frågas det för varje vaken person i varje slag, i gången (två gånger på rad 909-910) och i arbetet. På dagen frågas det inte (dagsljuset kollas först).  
Förslag: Bygg listan med ljuspunkter en gång per tidpunkt (sparad per by) och låt ljusAt gå igenom den. Obs: den som bär en fackla flyttar sig under slaget, så den burna facklans plats måste läsas färskt eller listan göras om när tiden ändras. Mät först med npm run kostnad om det syns i listan.  
Ändras i spelet: Ingen märkbar skillnad om facklbärarnas plats läses färskt, bara snabbare på natten.  
Prövningen: Koden gör det läsaren säger, och nattens frågor är många. Hur mycket det kostar är inte mätt här, så det bör mätas först, och sparandet får inte göra att en buren fackla lyser på fel plats.

**432. Samtalen räknar ut vilka som står nära för alla, varje slag, fast nästan ingen pratar i slaget**  
Var: `src/sim/steg.ts:566-583 (raden 'samtalen' i TAKTER); src/sim/samtal.ts:164-172 (vaggMellan, horHar); src/sim/slump.ts:53`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: För varje person i en social aktivitet räknas hela listan 'nara' varje slag: alla andra sociala inom hörhåll, med en väggkontroll punkt för punkt mellan dem. Först därefter dras slumpen om hen samtalar i slaget, och det blir ja ungefär en gång av hundra (ett samtal per 240 sekunder, slag om 2 sekunder). Slumpen dras bara när listan inte är tom, och varje person har sin egen slumpström ('samtal').  
Förslag: Fråga först bara 'finns det någon nära?' (sökningen slutar vid den första som hörs). Dra sedan slumpen precis som i dag. Räkna hela listan bara när det blir minst ett samtal, eller när handlingen är 'samtal' (då behövs den för 'den andra gick' och 'ensam'). Så dras slumpen i samma ordning som förut, och byarna utvecklas exakt likadant. Läsarens variant (dra slumpen först, också för den som står ensam) ändrar utvecklingen och behövs inte.  
Ändras i spelet: Nej, med varianten ovan: samma slumptal i samma ordning. Kontrolleras med npm run samma.  
Prövningen: Stämmer: listan räknas för alla sociala varje slag fast den nästan aldrig används. Det går att göra utan att ändra slumpen, så risken är liten; hur mycket datortid det ger ska mätas med npm run kostnad (raden 'samtalen').

**433. Gästlistan byggs om flera gånger per bildruta, med all paneltext**  
Var: `src/ui/gaster.ts:38-106 (anropas från manniskor.ts:354, tona.ts:13, terrang.ts:140 på natten, handel.ts:26, main.ts:250, interaktion.ts:44)`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: gaster() bygger varje gång hela gästen: läget på kartan men också panelens rader med html och ikoner, livet i hemklanen och handlarens relationer. Den anropas två till tre gånger per bildruta (folket, trädens toning och ljuset på natten), och en gång till för handlaren vid ett byte. Livet i hemklanen är redan sparat (gastliv.ts), men resten räknas om.  
Förslag: Spara listan per by och tid (byn, s.now och den visade tiden), så att den byggs en gång per bildruta. Eller dela den: läget för kartan, och raderna först när sidan visas.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer. Gästerna är få, så vinsten är måttlig, men två genomsökningar av alla personer görs vid varje anrop också när ingen gäst finns. Testerna anropar gaster(s.now), så det sparade måste följa byn och tiden.

**434. Samma sak räknas flera gånger per person och bildruta när folket ritas**  
Var: `src/ui/manniskor.ts:147, 169, 196, 230, 386, 408, 419, 425, 457, 532`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: drawPeople körs varje bildruta. platsAv(p) räknas två gånger per person: i sprid (rad 230) och igen på rad 408 för den råa platsen. load(tk, s), som letar bland alla ting, räknas tre gånger per person (rad 419, 425, 457). living(s), som går igenom hela folket, anropas fem gånger per bildruta (rad 147, 169, 196, 386, 532), och uppgiftVid(p) räknas om på flera ställen.  
Förslag: Låt sprid lämna tillbaka den råa platsen också. Räkna bördan en gång per person och listan över levande en gång per bildruta, och skicka dem vidare.  
Ändras i spelet: Nej. Mindre datortid per bildruta i en stor by; hur mycket är inte mätt.  
Prövningen: Stämmer i koden på alla punkter. Vinsten är inte mätt, så den bör mätas i en stor by före och efter; ändringen rör bara bilden.

**435. Varje persons utseende räknas om och görs till text varje bildruta**  
Var: `src/ui/utseende.ts:90-127 (skapad, kropp, utrustad), src/ui/manniskor.ts:431 och 365, src/ui/folkbild.ts:39`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: För varje person på kartan byggs hela utseendet på nytt varje bildruta: arvet kopieras, skador och sjukdom gås igenom, utrustningen räknas fram, och sedan görs allt till en lång text som nyckel för att hitta den sparade bilden. Ingen mätning finns av vad det kostar.  
Förslag: Spara det färdiga utseendet och dess nyckeltext per person där kartan ritar folket (manniskor.ts), och räkna om högst en gång i sekunden eller när uppgiften ändrats. Sparandet ska ligga i kartans kod och inte i skapad(), för testerna (scenarierna i kontroll.ts) ändrar personen och frågar igen vid samma klockslag. Mät före och efter.  
Ändras i spelet: Ingen märkbar skillnad. Ett ansikte eller ett plagg kan byta bild upp till en sekund senare. Kartan ritas lite snabbare i stora byar.  
Prövningen: Stämmer: skapad() och JSON.stringify körs för varje person i varje bildruta. Vinsten är omätt men växer med byns storlek, och risken är liten om minnet läggs i kartans kod och töms vid ny by.

**436. Eldens steg räknar om samma saker för varje person och eld var tionde sekund**  
Var: `src/sim/eld.ts:106, 197-207, 378, 463-498; src/sim/brasor.ts:51`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 2 rader bort.  
I dag: fireWish räknar för varje person och eld om dagsljus, temperatur, seder och "har byn någonsin haft eld", fast de är samma för alla. Tändningen på rad 497 går igenom alla personer innan den frågar det billiga (brinner elden?). racker på rad 487 är bränslets dygn delat med slackDygn skrivet som en omväg. Kontrollen i fetchFuel (rad 378) behövs dock kvar, eftersom den som stjäl ved (VED.anvand) också går den vägen.  
Förslag: Räkna det gemensamma en gång per steg och skicka in det, och fråga f.lit och glöden före genomgången av personerna. Slumptalen måste dras i samma ordning som nu. Att räkna önskan mer sällan (en gång i minuten) görs inte: det ändrar när elden fylls på.  
Ändras i spelet: Ingen skillnad med det begränsade förslaget.  
Prövningen: Stämmer i koden, men vinsten är liten och inte mätt: det rör några tiotal personer var tionde sekund. Värt att göra bara som ofarlig omflyttning, inte med glesare takt.

**437. Raden överst räknar byns rikedom två gånger var 600:e millisekund**  
Var: `src/ui/raden.ts:28-41 och 62 (anropas från renderClock i src/main.ts:42, 229 och 255); src/sim/varde.ts:105-112`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Var 600:e ms (och upp till åtta gånger i sekunden under snabbspolningen) bygger raden både symbolen och förklaringstexten för varje nyckeltal. rikedomDelar går igenom alla saker, alla ting, djuren och alla husbitar och körs två gånger, en gång för talet och en gång för texten. vaderNu körs fem gånger. Det är lite arbete var gång, också i en stor by.  
Förslag: Räkna rikedomen en gång per uppdatering och dela den mellan talet och texten. Gör inte talet äldre än så (ingen räkning en gång i timmen): då visar raden ett gammalt tal.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer, men vinsten är liten: det är gränssnittet och inte byns räkning, och det sker under två gånger i sekunden. Värt att göra bara som en liten rättning i förbigående, utan att spara talet längre än en uppdatering.

**438. Behoven räknar eldens värme tre gånger per person och matdygnen en gång per kvinna**  
Var: `src/sim/steg.ts:669, 678, 704, 716 (heatAt och varmasteHard); 703 och 669 (roofed och roomAt); 779 (foodDays och barnMat); src/sim/eld.ts:157-168`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: I needsStep frågas eldens värme på rad 704, igen i varmeDelar på rad 669 och en tredje gång på rad 678. Varje fråga går igenom byns eldar, som är få. Rummet slås upp två gånger, men det är ett uppslag i en tabell. pregnancy räknar förrådets matdygn för varje kvinna som kan bli gravid, fast svaret är detsamma för hela byn.  
Förslag: Räkna viljan att skaffa barn en gång per körning av raden behoven. Låt varmeDelar ta emot värmen om den redan är räknad. Mät med npm run kostnad före och efter.  
Ändras i spelet: Ingen skillnad: samma tal, räknade färre gånger, och slumpen dras i samma ordning.  
Prövningen: Stämmer och är ofarligt, men vinsten är troligen liten: eldarna är få och raden körs var 30:e sekund. Värt att göra bara om mätningen visar att raden behoven kostar något.

**439. Valet av slaktdjur räknar om hela flocken för varje djur**  
Var: `src/sim/boskap.ts:164-196; src/sim/val.ts:807`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: avlivaVal går igenom alla tamdjur, och för varje djur letar slaktOrsak upp det minst värda i arten med behallVarde, som filtrerar alla tamdjur två gånger per anrop. Med n djur blir det ungefär n gånger n gånger n steg. Frågan ställs bara för vuxna med kniv i dagsljus.  
Förslag: Räkna det minst värda djuret per art en gång i avlivaVal och låt slaktOrsak få det. Mät med npm run kostnad före och efter.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Stämmer i koden. Byarna har högst ett par tiotal djur, så vinsten är liten och inte mätt, men ändringen är ofarlig.

**440. Stråkens sökdata byggs om för varje husplats som prövas**  
Var: `src/sim/strak.ts:55-75 (sokData), 108-119 (straken), 137-149 (omvag); src/sim/byggplan.ts:141-147`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: När en tänkbar husplats ligger på ett stråk byggs två fält stora som hela kartan för att se om stråket kan dras om. Det görs bara för platserna som prövas innan den första godkänns, och bara när byggplanen räknas, så det händer sällan.  
Förslag: Spara sökdatat tillsammans med stråken (samma nyckel), så att det byggs en gång tills byn ändras.  
Ändras i spelet: Nej. Stråken själva räknas redan med samma data och samma nyckel.  
Prövningen: Stämmer och är tre rader att rätta, men det körs sällan, så vinsten är liten.

**441. Vägvalet på världskartan räknar högsta farten om för varje ruta i sökningen**  
Var: `src/sim/vagval.ts:30, 78`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Uppskattningen av resten av vägen anropar maxFart(), som går igenom alla leder, varje gång en ruta läggs i kön.  
Förslag: Räkna den en gång i början av billigasteVag.  
Ändras i spelet: Nej.  
Prövningen: Stämmer. En rad flyttas ut ur slingan; vägarna sparas dessutom, så vinsten är liten men riskfri.

**442. Jägarnas samlade styrka räknas om för varje person i björnjaktens beslut**  
Var: `src/sim/bjorn.ts:110-115`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: Funktionen vagar räknar hela gruppens styrka (kraftAv(kan)) varje gång den frågas, och den frågas för var och en. Styrkan är densamma varje gång. Det görs en gång i timmen medan byn vet var björnen går (12 timmar efter ett möte).  
Förslag: Räkna kraftAv(kan) en gång före vagar.  
Ändras i spelet: Ingen skillnad.  
Prövningen: Stämmer, och rättningen är en rad utan risk. Vinsten är liten eftersom det bara räknas en gång i timmen under några timmar.

**443. Sportens vikt räknar byns vuxna om för varje sport och person som väljer fritid**  
Var: `src/sim/sport.ts:164, 168, 176-177, 180-189, 269-295, 369`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: sportVikt anropas för varje person i fritidsvalet. Finns ingen match går den igenom alla sex sporter och räknar byns vuxna på nytt för varje sport, och bågskyttet går dessutom igenom alla levande och deras saker. Under en match går spelare() och publiken() igenom alla personer, också de döda, flera gånger per spelare och slag.  
Förslag: Räkna vuxna en gång per anrop av sportVikt och skicka talet vidare, och låt spelare och publiken gå igenom living(s). Mät med npm run kostnad före och efter. Ett sparat svar per timme behövs knappast.  
Ändras i spelet: Ingen skillnad med den enkla ändringen.  
Prövningen: Stämmer i koden, och att räkna de vuxna en gång är ofarligt. Hur mycket datortid det sparar är inte mätt, så vinsten är liten tills npm run kostnad visar annat. Det sparade svaret per timme i läsarens förslag tog jag bort: det kan ge ett gammalt svar inom timmen.

**444. Rikedomens gräns står utanför balanstalen, och kommentaren pekar på ett tal som inte finns**  
Var: `src/sim/byggplan.ts:68, 218, 391-397, 405-408`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: rikOf jämför med den övre kvartilen i byn, och talet 0,75 står direkt i koden i stället för i PLAN (regel 8). Kommentaren vid hemOverskott hänvisar till PLAN.hemRef, som inte finns; talet heter hemRik. hemOverskott och rikOf räknar om allas förmögenhet vid varje anrop, flera gånger per hus, men bara när byn letar efter en förbättring (högst var tredje timme i spelet).  
Förslag: Lägg 0,75 i PLAN som ett namngivet tal och rätta kommentaren. Räkna gärna förmögenheterna en gång per planering, men det är inte brådskande.  
Ändras i spelet: ingen märkbar skillnad  
Prövningen: Talet utanför balanstalen och den felaktiga kommentaren stämmer och är lätta att rätta. Tidsvinsten är liten eftersom det körs sällan.

**445. Farorna räknas om flera gånger i samma val**  
Var: `src/sim/val.ts:472-477 (dangers), 546, 1311 (slaktbart), 1340 (craft), 1353; 529-536 (arbetarNu), 1212, 843-868; 1398 (bonVikt två gånger); src/sim/kultlatt.ts:59`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: dangers() går igenom alla levande och räknar matens dygn. Den anropas på nytt i slaktbart (raden slakta i varje val på dagen) och i craft, fast valet redan har farorna sparade. arbetarNu() går igenom alla levande varje gång en rad frågar om den är full, ungefär tio varv per val. Designdokumentet säger om det sista att det är billigt även med hundra invånare. bonVikt räknas två gånger på samma rad.  
Förslag: Bara det säkra: skicka valets redan räknade faror till slaktbart och craft, och räkna bonVikt en gång. Svaret är detsamma inom samma ögonblick, så spelet ändras inte. Mät med npm run kostnad före och efter. Att räkna farorna en gång i timmen, som läsaren föreslår, görs inte: då reagerar byn senare på kyla och svält.  
Ändras i spelet: Ingen skillnad med den säkra delen.  
Prövningen: Omräkningarna finns och är lätta att ta bort utan att något ändras. Vinsten är inte mätt, och delen som ändrar när farorna märks faller.

**446. Panelen byggs om två gånger vid vissa tryck**  
Var: `src/ui/panel.ts:65-78, 176, 186, 196-205`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: visa(...) och stang(...) slutar båda med renderPanel(true). Rad 176 anropar ändå renderPanel(true) direkt efter visa, och forradFlik (rad 186) gör det efter både visa och stang. Panelens html byggs då två gånger vid de trycken. renderOwned körs vid varje omritning och bygger hela listan med förklaringar innan den jämför med den förra; vad det kostar är inte mätt.  
Förslag: Ta bort de två dubbla anropen. Rör renderOwned bara om en mätning visar att den kostar något.  
Ändras i spelet: Nej.  
Prövningen: De dubbla anropen stämmer och är ofarliga att ta bort, men de händer bara vid ett tryck, så vinsten är liten. Delen om renderOwned är inte mätt och hör inte hit.

**447. Raden överst räknar rikedomen två gånger per omritning**  
Var: `src/ui/raden.ts:22-37, 62`. Vinst 1 av 5, risk 1 av 5, liten ändring.  
I dag: renderRaden räknar för varje ruta både html och title (rad 62), fast title bara syns när musen är över. rikedomDelar(s), som går igenom alla saker, ting och hus, körs därför två gånger varje omritning. Vädret är inget problem: vaderNu sparar svaret för samma tid (vader.ts:143-145), så de upprepade anropen kostar nästan inget.  
Förslag: Räkna rikedomen en gång per omritning och ge den till både html och title, eller sätt title först när musen kommer över rutan.  
Ändras i spelet: Nej.  
Prövningen: Rikedomen räknas två gånger, det stämmer. Vädret faller bort ur fyndet eftersom svaret redan sparas. Liten vinst, ingen risk.

**448. Blötveden räknas varje minut fast den ändras på timmar**  
Var: `src/sim/steg.ts:432; src/sim/blotved.ts:28-46`. Vinst 1 av 5, risk 2 av 5, liten ändring.  
I dag: stepBlotVed ligger i samma rad i TAKTER som förrådets slitage, var 60:e sekund. Den går igenom alla stackar, frågar om det är tak över varje vedhög och går igenom stationerna när det regnar. Veden blir blöt på en till tre timmar och torkar på ett halvt till ett dygn. Vattenhons regn räknas redan var 600:e sekund.  
Förslag: En egen rad i TAKTER var 600:e sekund. Allt i funktionen räknas redan per tid, så resultatet blir detsamma så när som på tio minuter.  
Ändras i spelet: Ingen märkbar skillnad; en hög kan bli blöt eller torr upp till tio minuter senare (tio minuter i verkligheten, ungefär två och ett halvt dygn i spelet). Testernas facit ändras lite och sparas om.  
Prövningen: Stämmer, och regeln för takterna säger att ett system räknas efter hur fort saken ändras på riktigt. Vinsten i datortid är troligen liten och bör mätas med npm run kostnad; läsarens "en timme i spelet" var fel räknat och är rättat här.

## Del 2: frågor till Björn

Stämmer i koden, men ändrar spelet eller rör något som står som önskat i designdokumentet. Du väljer.

### Ta bort (32)

**449. Stridsarenan i testläget: ett eget fönster med egen ritning**  
Var: `src/ui/arena.ts:1-256 (hela filen), öppnas från src/main.ts:31; STRIDSDJUR (src/sim/kampar.ts:48), KLADER_STRID (src/sim/strid.ts:236) och LAGE_ORD (src/sim/strid.ts:899) används bara härifrån`. Vinst 4 av 5, risk 2 av 5, ett steg, ungefär 260 rader bort.  
I dag: Ett fönster i testläget (⚔️) där man ställer upp två sidor och kör en strid, med stega, samma slump igen, ×100 och en rapport. Kämparna ritas som cirklar (rad 131-158) i lösa färger, fast kommentaren överst säger att de ritas som folket i spelet. Färdplanen har arenan som två byggda steg: 3.7.5 och 10.1.6 (v525), där den byggdes om för att köra samma strid som kartan. Steg 5.5.5 säger att arenans markeringar inte räknas i palettkontrollen.  
Förslag: Ta bort arenan och de tre registren bara om Björn inte använder den längre. Används den för att pröva vapen och rustning ska den vara kvar, och då kan kämparna ritas som figurer i stället för cirklar.  
Ändras i spelet: Fönstret Arena i testläget försvinner. Själva spelet ändras inte. Strider prövas då på kartan med testknapparna och med npm run strid.  
Prövningen: Koden stämmer med fyndet, men arenan byggdes om med avsikt i steg 10.1.6 och står som önskad i Färdplanen. Björn väljer mellan att behålla sitt provfönster eller att bli av med 260 rader.

**450. Pergamentkartan: en fil som spelet inte kör, i väntan på Björns val**  
Var: `src/ui/pergament.ts:1-168, bildstil/varldkarta.ts`. Vinst 3 av 5, risk 1 av 5, liten ändring, ungefär 150 rader bort.  
I dag: ritaPergament används bara av bildstilens kort för världskartan (bildstil/varldkarta.ts); spelet ritar världskartan med varldbild.ts. Det är steg 11.9.2 (v532) i Färdplanen: en version i bildstilens valdel som Björn säger ja eller nej till. ARKITEKTUR.md säger detsamma. Filen är alltså inte död, den väntar på svaret.  
Förslag: Inget i koden nu. Vid ja ersätter pergamentet ritningen i varldbild.ts, och den gamla tas bort. Vid nej tas filen och kortet bort, eller ritas om efter kommentaren. I båda fallen ska bara en ritning finnas kvar.  
Ändras i spelet: Beror på Björns val: vid ja ser världskartan ut som pergamentet, vid nej ändras inget.  
Prövningen: Stämmer i koden, men pergamentet är ett önskat steg (11.9.2) som väntar på Björns ja eller nej i bildstilen. Björn väljer: ja (pergamentet byggs in och den gamla ritningen tas bort) eller nej (filen och kortet tas bort).

**451. 60 handritade symboler finns kvar bredvid bildstilens godkända bilder**  
Var: `src/ikoner.ts:307-4231 (PIX), t.ex. korg, bar, kott, fisk, sten, yxa, rep, kista, bord, grill, tork, silver, kniv, varg, skinn; src/kartbilder.ts:6`. Vinst 4 av 5, risk 3 av 5, ett steg, ungefär 750 rader bort.  
I dag: 70 saker har både en handritad symbol i PIX och en godkänd bild i bildstilen. Tio av de handritade skrivs redan över (se fyndet ovan). För de 60 som är kvar (ungefär 750 rader) ritar kartan bildstilens bild, medan listorna, panelerna och teknikträdet ritar den handritade. Två bilder av samma sak underhålls. 19 av bildstilens bilder är större än 16 punkter (t.ex. timmervägg 64 × 64, bord, grill, slaktbänk).  
Förslag: Med regeln i fyndet ovan kan de handritade tas bort, så att listorna visar samma bild som kartan. Kan göras sak för sak. Stora bilder måste förminskas och kan bli otydliga.  
Ändras i spelet: Symbolerna i förrådet, panelerna och teknikträdet för 60 saker byts från de gamla små bilderna till kartans bild. Stationer och möbler blir förminskade.  
Prövningen: Stämmer i koden, men utseendet i listorna ändras för 60 saker, och arbetsreglerna säger att Björn säger ja eller nej när något som finns görs om. Björn väljer mellan: byta alla, byta bara de små sakerna som ryms i rutan (ungefär 40) och behålla handritade symboler för stationer och möbler, eller låta det vara.

**452. 56 gamla uppgraderingar av sparfiler och hela kartflytten kan tas bort**  
Var: `src/sim/varld.ts:82-468; src/sim/kartflytt.ts (123 rader); src/sim/typer.ts:359 (State.kart); src/sim/mark.ts:95 (lasMark, gamla formatet); src/sim/klaner.ts:49-58,66 (KLAN_HEM, Klan.pris); src/sim/vackt.ts:49; src/test/scenarier/fas9.ts:92; src/test/scenarier/agande.ts:1014`. Vinst 4 av 5, risk 3 av 5, ett steg, ungefär 480 rader bort.  
I dag: UPPGRADERINGAR har 56 numrerade steg, från "före v40" till v533 (ungefär 375 rader). De körs bara när en äldre sparad by öppnas. Till det kommer kartflytt.ts (flyttar en gammal by till en större karta, anropas bara från varld.ts:466), det gamla markformatet, klanernas gamla hemorter och priser, och scenariot kartflytt. ARKITEKTUR.md (regel 3) säger i dag att äldre sparfiler ska fungera.  
Förslag: Sätt en lägsta version och ta bort allt som är äldre: uppgraderingarna, kartflytten med sitt scenario och de lösa resterna. KARTA-talen flyttas till kartans fil. En äldre sparfil får beskedet att den är för gammal. Regeln i ARKITEKTUR.md skrivs om.  
Ändras i spelet: En by som sparats före den lägsta versionen går inte längre att öppna. Spelet publiceras bara när testerna gått på MacBooken, så den sparade byn kan vara äldre än koden på grenen. Den lägsta versionen måste därför vara den som den sparade byn faktiskt har, eller äldre.  
Prövningen: Det stämmer i koden, men vi kan inte se vilken version Björns sparade by har, och regeln i dag är att gamla sparfiler ska fungera. Björn väljer: behålla allt, eller sätta en lägsta version (vilken?) och ta bort allt äldre, med risken att en gammal sparad by inte går att öppna.

**453. Gamla sparfilsuppgraderingar 2–24 (före v378) och hjälpfunktionerna som bara de använder**  
Var: `src/sim/varld.ts:83-266 (rad 244 är en tom uppgradering); hjälpare: src/sim/teknik.ts:462 (migrateTek), src/sim/agande.ts:117-136 (toolsFromItems, migrateTools), src/sim/lager.ts:782 (storeFromSums), src/sim/odling.ts:206 (migrateFalt)`. Vinst 4 av 5, risk 3 av 5, ett steg, ungefär 250 rader bort.  
I dag: UPPGRADERINGAR har steg 2–59 som lyfter en gammal sparad by till dagens format. Stegen 2–24 gäller byar sparade före v378. De fem hjälpfunktionerna anropas bara från de stegen (kontrollerat i hela src/). Steg 20 är tomt. Steg 2 och 23 läser händelseloggen, men bara en gång vid inläsningen.  
Förslag: Sätt en lägsta sparversion (25): en äldre by får beskedet att den är för gammal. Ta bort stegen 2–24, de fem hjälparna och de scenarier som bygger så gamla sparfiler. Görs bara om Björn säger att ingen sparad by är äldre än v378.  
Ändras i spelet: Ingen skillnad för en by som öppnats efter v378. En by som inte öppnats sedan dess går inte längre att läsa in.  
Prövningen: Det stämmer i koden, men det tar bort möjligheten att öppna gamla sparade byar. Björn väljer: behålla stödet för alla gamla byar, eller sätta en lägsta version och spara ungefär 250 rader. Designdokumentets flik Läget säger inget om saken.

**454. Brytaren STRAK.pa och provkörningen för gångstråken ligger kvar efter att provet är klart**  
Var: `src/sim/strak.ts:20, 122, 125, 154; src/sim/skog.ts:80, 86; src/test/prov.ts; src/test/prov-en.ts; src/test/scenarier/byggnader.ts:1004-1030 (scenariot strakprov); package.json:34; ARKITEKTUR.md:302; CLAUDE.md (npm run prov)`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 130 rader bort.  
I dag: Gångstråken har en av/på-brytare (balanstalet strak.pa) som bara finns för att jämföra byar med och utan stråk. Den läses på fem ställen. Två testskript (prov.ts och prov-en.ts) och det långa scenariot strakprov kör jämförelsen. Provet är steg 6.2.6, byggt och avbockat i Färdplanen (v401), och står som kommandot npm run prov i CLAUDE.md.  
Förslag: Ta bort STRAK.pa och villkoren, prov.ts, prov-en.ts, scenariot strakprov, kommandot npm run prov och raderna om provet i CLAUDE.md och ARKITEKTUR.md.  
Ändras i spelet: Nej. Stråken är redan alltid på.  
Prövningen: Stämmer i koden, men provet är ett byggt steg (6.2.6) och ett kommando Björn har i sina regler; steget säger att provet körs igen om reglerna för stråken ändras. Björn väljer: behålla möjligheten att jämföra byar med och utan stråk, eller ta bort provet, scenariot och brytaren (då ändras också CLAUDE.md och steget i Färdplanen).

**455. Träd som fälls på husplatsen blir aldrig väggar: toWalls gör ingenting**  
Var: `src/sim/bygg.ts:186-195, 174, 255; src/sim/steg.ts:237, 1088, 1606; src/sim/byggplan.ts:357; src/ui/flikar/hus.ts:14; src/test/scenarier/byggnader.ts:441`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 16 rader bort.  
I dag: toWalls letar väggar vars material är ved. Ingen vägg görs av ved längre: timret är virke, stenväggen byggsten och golvet plankor. Funktionen ger därför alltid 0, fast den anropas vid varje fällt träd. Texten 'Från träd som fälldes för bygget' i husfliken visas aldrig. Samma döda jämförelse med ved finns i tramat (bygg.ts:255) och i vedRacker (byggplan.ts:357).  
Förslag: Antingen tas toWalls, de två anropen, nyckeln 'fallt' och kommentarerna bort, eller så byggs idén om för virke i ett eget steg. Designdokumentet rättas efter valet.  
Ändras i spelet: Ingen märkbar skillnad om det tas bort (det händer inte i dag). Byggs det om går husbygget lite fortare där träd står på tomten.  
Prövningen: Koden är död, det stämmer. Men designdokumentet (Bygga, odla och äta: Byggarbete) säger att träden på husplatsen fälls först och att stockarna läggs direkt i väggarna. Björn väljer: ta bort koden och stryk meningen, eller bygg om det för virke.

**456. Delar av ledarens legitimitet räknas aldrig: vunna strider och tiden vid makten**  
Var: `src/sim/styre.ts:40-41, 47, 61-63, 235, 275, 378, 653`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Balanstalen LED.wTid och LED.tidDygn används ingenstans, och kommentarerna på rad 40 och 61 talar fortfarande om tiden vid makten. Fältet st.vunna sätts bara till 0 och höjs aldrig, så delen vunna strider i legitimiteten är alltid noll. Bara byns tillväxt ger framgång i dag.  
Förslag: Ta bort wTid och tidDygn och rätta kommentarerna; det kan göras direkt. För vunna strider får Björn välja: räkna dem på riktigt (höj st.vunna när byn vinner en strid) eller ta bort talet och fältet.  
Ändras i spelet: Nej om talen bara tas bort. Ja om vunna strider börjar räknas: ledare i byar som vinner strider sitter säkrare.  
Prövningen: Stämmer i koden. Designdokumentet (steg 8.3.9, avbockat v510) säger att tiden vid makten ska bort men att vunna strider ska räknas, så den delen saknas i bygget. Björn väljer: bygg räkningen av vunna strider, eller stryk dem ur koden och dokumentet. Det äldre stycket Ledarskapet (v143) i fliken Samhället nämner dessutom fortfarande tid vid makten 0,2.

**457. Gamla uppgraderingar av sparfilen och fälten de behöver**  
Var: `src/sim/varld.ts:82-457 (UPPGRADERINGAR, nummer 2 till 59); src/sim/typer.ts:454 (stegRest) och de äldre fälten; src/sim/tid.ts:43-48 (inFas), 58, 76; src/sim/steg.ts:394; src/sim/klocka.ts:24; src/sim/vackt.ts:96; src/sim/vacktplats.ts:27`. Vinst 4 av 5, risk 4 av 5, ett steg, ungefär 250 rader bort.  
I dag: Listan med uppgraderingar av sparade byar är omkring 375 rader, från "allt före v40" till v533. State bär flera fält som bara finns för gamla sparfiler. inFas i tid.ts finns för byar från före kalendern, men anropas också som reserv på fyra andra ställen (tid.ts, vackt.ts, vacktplats.ts). Vilken version Björns sparade by har går inte att se i koden.  
Förslag: Björn avgör. Ta reda på vilken sparversion Björns by har (s.v) och ta bort uppgraderingarna till och med den, med fälten som bara de läser. En äldre by får ett tydligt fel. inFas kan bara tas bort om reservanropen i tid.ts, vackt.ts och vacktplats.ts också tas bort. Den gamla kartans plats behålls om Björns by ligger på den lilla kartan.  
Ändras i spelet: Ingen märkbar skillnad för Björns by, om den är sparad i en nyare version än det som tas bort. En äldre sparfil (en gammal kopia, någon annans länk) går inte längre att öppna.  
Prövningen: Det stämmer i koden, men CLAUDE.md säger att Björns sparade by och länk ska finnas kvar, och byns version går inte att se härifrån. Björn väljer mellan att alla gamla sparfiler alltid ska gå att öppna, eller att sätta en lägsta version och korta koden med omkring 250 rader.

**458. Stödet för mycket gamla sparade byar (före v500) kan tas bort, men inte kartflytten, risväggen och hö-golvet**  
Var: `src/sim/varld.ts:83-266 (UPPGRADERINGAR 2–24, v40–v378), src/sim/lager.ts:780-798 (storeFromSums), src/sim/agande.ts:113-145 (migrateTools, toolsFromItems), src/sim/teknik.ts:461-467 (migrateTek), src/sim/odling.ts:205-211 (migrateFalt), src/sim/typer.ts:359-411 (food, wood, items, mat, egna, kunskap med flera), src/sim/handlingar.ts:157 + src/sim/torst.ts:197 (handlingen fatt), src/sim/steg.ts:219 (rep i handarbetet), src/sim/klaner.ts:135-139 (priset utan rad). Ska vara kvar: src/sim/kartflytt.ts, OX/OY/W0/H0 i src/sim/typer.ts:33-36, src/sim/byggnad.ts:43,46 (risvägg, hö-golv)`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 260 rader bort.  
I dag: Varje ändring av sparfilen sedan v40 har en uppgradering som körs när en by laddas. Raderna 2–24 (ca 185 kodrader) gäller byar som senast sparades före v500, och några hjälpfunktioner i andra filer finns bara för dem. Det stämmer. Men tre saker som läsaren räknade dit är inte gammalt stöd. Kartflytten (kartflytt.ts) körs för varje by med mindre karta än balanstalet karta.bredd, också byar på 120 × 120 från v511, och står som önskad i designdokumentet (Världen: Storleken, steg 9.1.8). En flyttad by bär sedan förskjutningen (s.kart, OX/OY) i sparfilen för alltid; utan den ritas kartan fel. Risväggar och hö-golv kan stå kvar i en by som sparas i dag, om den byggdes för länge sedan.  
Förslag: Om Björn vill: sätt en lägsta version som går att ladda (t.ex. v500), ta bort uppgradering 2–24 med hjälparna storeFromSums, migrateTools, toolsFromItems, migrateTek och migrateFalt, de gamla fälten i State, handlingen fatt och rep-grenen i handarbetet. En äldre sparfil får beskedet att den inte går att läsa. Scenariot sparning kortas lika mycket. Kartflytten, OX/OY, risväggen och hö-golvet rörs inte.  
Ändras i spelet: En by som senast sparades före den valda versionen går inte längre att öppna. En by som följt med till v533 märker ingenting. Inget ändras i hur byar utvecklas.  
Prövningen: Uppgraderingarna 2–24 används bara av mycket gamla sparfiler, men ARKITEKTUR.md regel 3 säger att äldre sparfiler ska fungera. Björn väljer: behålla stödet för alla gamla byar, eller sätta en lägsta version (t.ex. v500) och spara ca 260 rader. Kartflytten, risväggen och hö-golvet ska vara kvar i båda fallen.

**459. Förstoringen av gamla små kartor (storreKarta) behövs bara för byar från före den stora kartan**  
Var: `src/sim/kartflytt.ts:18-123; anropet i src/sim/varld.ts:466; behoverStorreKarta i src/sim/mark.ts`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 100 rader bort.  
I dag: storreKarta och flyttaAllt flyttar allt i byn när en sparfil har en mindre karta än 240×240. Det anropas bara från uppgraderingen. Den stora kartan kom i steg 9.1.9, alltså långt efter v378. Byar sparade mellan v378 och fas 9 har därför också den lilla kartan.  
Förslag: Ta bort storreKarta, flyttaAllt och scenariot kartflytt när ingen sparad by har en liten karta kvar. Behåll balansblocket KARTA och förskjutningen s.kart. Gränsen måste sättas vid fas 9 (den stora kartan), inte vid v378.  
Ändras i spelet: Ingen skillnad för en by som öppnats sedan den stora kartan kom. En by som sparats med den lilla kartan och aldrig öppnats sedan dess går inte att läsa in.  
Prövningen: Koden är som läsaren säger, men gränsen ligger senare än fyndet om de gamla uppgraderingarna (fas 9, inte v378). Björn väljer om byar med liten karta ska gå att öppna eller inte.

**460. Mätkommandon för världen: forhistmatt, radhandel, radanfall, vacktmatt**  
Var: `src/test/forhistmatt.ts (11 rader, inget npm-kommando, nämns inte i CLAUDE.md eller ARKITEKTUR.md); src/test/radhandel.ts (44); src/test/radanfall.ts (43); src/test/vacktmatt.ts (40); raderna i package.json och CLAUDE.md`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 138 rader bort.  
I dag: Fyra skript som mäter världen: förhistoriens datortid, handeln mellan byarna, anfallen mellan byarna och den väckta byn. De skriver bara ut tal, utan kontroll och felkod. forhistmatt går inte att starta med npm. De tre andra står som kommandon i CLAUDE.md, och kommentarer i spelets kod (byhandling.ts, radanfall.ts) säger att balanstalen ställdes in med dem. Stegen i Färdplanen (11.6.7, 11.6.19, 11.13.3) är byggda och säger att talen ställs in en gång. Steg 11.13.3 är själva mätverktyget.  
Förslag: Ta bort forhistmatt (ingen saknar den). För de tre andra: ta bort filerna, raderna i package.json och CLAUDE.md, och hänvisningarna i kodens kommentarer, eller behåll dem som mätverktyg för världens balans.  
Ändras i spelet: Ingen skillnad i spelet. Tas de bort går det inte längre att mäta handeln, anfallen och den väckta byn med ett kommando när världens balanstal behöver ställas om.  
Prövningen: Stämmer i koden, men tre av dem är mätverktyg som Färdplanen beställt och som står i CLAUDE.md, på samma sätt som `strid`, `hus` och `natur`. Björn väljer: behålla dem för nästa gång världens balans ställs in, eller ta bort dem och skriva om vid behov. forhistmatt kan tas bort oavsett.

**461. Provkommandon för färdiga steg: lardom och prov**  
Var: `src/test/lardom.ts (21), src/test/lardom-en.ts (18), src/test/prov.ts (57, varav 25 rader inbyggd HTML-sida); src/test/prov-en.ts (44) måste vara kvar`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 96 rader bort.  
I dag: lardom (steg 10.2.64) och prov (gångstråken, steg 6.2.6) är prov av färdiga system, och resultaten står redan i Färdplanen. Båda står i CLAUDE.md:s kommandolista (läsaren hade fel om lardom). prov-en.ts används också av scenariot strakprov (src/test/scenarier/byggnader.ts:1012) och kan inte tas bort. `jamfor --satt` ger bara de vanliga nyckeltalen, inte provens egna mått (hur långt ut man samlar, husens avstånd, bilden över stråken).  
Förslag: Ta bort lardom.ts, lardom-en.ts och prov.ts med raderna i package.json och CLAUDE.md. Behåll prov-en.ts åt scenariot strakprov. Eller behåll allt.  
Ändras i spelet: Ingen skillnad i spelet. Tas de bort försvinner bilden över stråken (prov.html) och måtten på var folk samlar, jagar och fiskar med och utan lärdomarna.  
Prövningen: Proven är gjorda och resultaten sparade, men kommandona står i CLAUDE.md och steg 6.2.6 säger att provet körs igen om stråkens regler ändras. Björn väljer: behålla de två proven, eller ta bort dem (utom prov-en.ts, som ett scenario behöver).

**462. Den röjda skogen och stigarna i den väckta byn är bara utseende**  
Var: `src/sim/vacktskog.ts:1-75; raden 'skogen' i BYGGARE, src/sim/vackt.ts:83`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 76 rader bort.  
I dag: En egen byggare räknar ut vilka träd byn har fällt efter ålder och folk, låter de äldsta ha vuxit upp igen, ställer stubbar och nöter stigar från elden till fälten, hagen, lagren, vattnet och mot huvudbyn. Byn är väckt högst tre dygn (tre år i spelet).  
Förslag: Björn väljer om bilden är värd koden. Tas den bort försvinner också balansblocket vacktskog och scenariot vacktskog.  
Ändras i spelet: En by man går in i ligger då i orörd skog utan stubbar och stigar den första tiden, och byborna där har lite närmare till veden.  
Prövningen: Koden stämmer, men den röjda skogen och stigarna är ett byggt steg (11.13.21) och står i designdokumentet (Den väckta byn i tal: 'röjd skog och stigar efter åldern'). Björn väljer mellan att en besökt by ser bebodd ut, eller 76 rader mindre kod.

**463. Uppgraderingen av sparfiler från före v40 kan tas bort**  
Var: `src/sim/lager.ts:104-107, 128-132, 780-798; src/sim/agande.ts:115-145; src/sim/typer.ts:361, 367, 390-400; src/sim/varld.ts:83-116 (uppgradering nummer 2 i UPPGRADERINGAR); scenarierna sparning (rad 137-168), redskap (rad 21-25, 110) och grund (rad 581)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 55 rader bort.  
I dag: storeFromSums, migrateTools och toolsFromItems gör om förråd och redskap i sparfiler från före v40 till stackar och ting. De körs bara i uppgradering nummer 2, alltså för en by med sparversion 1. Tre scenarier låtsas vara en så gammal sparfil och prövar att den går att läsa in.  
Förslag: Ta bort hela uppgradering nummer 2 och de tre funktionerna, läsningen av s.marken och s.lager och de gamla fälten i typerna. En by med sparversion 1 får ett tydligt besked att den är för gammal. Scenarierna sparning, redskap och grund släpper sina kontroller av de äldsta filerna. Sakernas ordning i registret får fortfarande inte ändras: den styr betalning och vilken mat som äts först.  
Ändras i spelet: Inget i spelet ändras. En sparfil som inte öppnats sedan före v40 går inte längre att läsa in.  
Prövningen: Det stämmer i koden: allt detta körs bara för sparversion 1. Björn väljer: får byar som inte öppnats sedan före v40 sluta fungera (koden blir kortare), eller ska de gå att läsa in för alltid?

**464. Eldens egen statistik och historik för fliken Elden**  
Var: `src/sim/eld.ts:101, 147, 264, 337, 361, 368-369, 409, 411-412; src/sim/typer.ts:529, 534-537; src/sim/varld.ts:120; src/ui/flikar/eld.ts:10-18, 25, 39-43, 55-59, 64-65; src/test/scenarier/redskap.ts:108; src/test/scenarier/behov.ts:153; src/test/scenarier/natur.ts:1357, 1368; src/test/detaljer.ts:32`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 30 rader bort.  
I dag: Varje eld bär en egen logg med 80 rader och räknare (vem som fyllt på hur ofta, försök totalt, bränt totalt, brunnen tid, hur ofta den slocknat, vem som tände). Ingen del av simuleringen läser dem. De visas i fliken Elden ("Denna eld", "Sedan byn grundades", "Fyller oftast på", "Historik"), och fyra tester läser dem (redskap, behov, natur och utskriften detaljer).  
Förslag: Ta bort loggen och räknarna, och låt fliken visa läget just nu. Testerna som läser dem skrivs om till byns vanliga statistik.  
Ändras i spelet: Fliken Elden visar inte längre eldens historik, hur länge den brunnit sammanlagt eller vem som oftast fyller på. Själva spelet ändras inte.  
Prövningen: Stämmer att spelet inte läser talen, men det spelaren ser i fliken Elden försvinner och fyra tester måste skrivas om. Ägaren väljer mellan att behålla eldens historik i fliken eller en kortare flik med bara läget just nu. Designdokumentet (Spelaren och bilden) säger inget om avsnitten.

**465. Tio nyckeltal i historiken sparas varje timme men visas aldrig**  
Var: `src/sim/historik.ts:20-38 (HISTORIK_TAL); src/ui/graf.ts:17-22 (GRAFER); src/test/scenarier/sparning.ts:25`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 12 rader bort.  
I dag: Historiken sparar 17 tal varje timme och sedan ett värde per dygn för alltid. Graferna är den enda läsaren och visar sju av dem: invånare, humör, eld, mat, ved, grillat och bränt. Hunger, törst, skadade, skog, fukt, snö, födda, döda, utbrott och bisamhällen läses inte av något i spelet. Bara scenariot sparning tittar på att skogen är mellan 0 och 1.  
Förslag: Ta bort de tio raderna ur registret och rätta raden i scenariot sparning. Kolumnerna släpps av sig själva ur sparade byar (omordna finns redan).  
Ändras i spelet: Inget syns i dag. Men talen som tas bort går inte att få tillbaka: en graf som byggs senare (t.ex. födda och döda) börjar då från den dagen, inte från byns början. Sparfilens historik blir drygt hälften så stor.  
Prövningen: Det stämmer i koden: tio tal sparas utan att visas. Men designdokumentet säger att graferna ska kunna gå tillbaka till byns början och att Byns tal ska få fler grafer senare. Björn väljer: ta bort talen nu (mindre sparfil, men ingen historia bakåt om en graf byggs senare) eller behålla dem som underlag för kommande grafer.

**466. Hjälparna inne i striden finns bara i ett scenario**  
Var: `src/sim/strid.ts:67, 302, 500, 505, 793-797, 827-828; src/test/scenarier/fas9.ts:472-490 (scenariot undsattning)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: En kämpe kan vara hjälpare (Kampe.hjalp, steg 9.5.20): hen slåss inte, håller avstånd och drar undan fallna. Ingen kod i spelet sätter flaggan; bara scenariot undsattning gör det, i en strid utan karta. Byns hjälpare vid ett rövarlarm (hjalpaRovare) står bakom kämparna vid förrådet och går aldrig in i striden. Scenariot är alltså grönt fast undsättningen inte händer i spelet.  
Förslag: Antingen ta bort hjalp ur Kampe, grenarna i raddaSteg och stridSteg, undantagen i slutvillkoret, talet hjalpAvst och scenariot. Eller koppla in det: låt byns hjälpare gå med i striden på kartan som hjälpare, så att undsättningen sker på riktigt.  
Ändras i spelet: Tas det bort: ingen skillnad, det händer aldrig i dag. Kopplas det in: fallna dras undan och får tryck på såret under striden, och färre förblöder.  
Prövningen: Koden stämmer, men designdokumentet beskriver Undsättningen (steg 9.5.20) som bestämd och önskad. Björn får välja: ta bort den döda koden, eller bygga så att hjälparna verkligen går in och räddar fallna i spelet.

**467. Världskartan på pergament ligger i spelets kod men laddas inte av spelet**  
Var: `src/ui/pergament.ts:1-168, bildstil/varldkarta.ts:7,35`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 168 rader bort.  
I dag: Filen ritar världskartan som en gammal karta (steg 11.9.2, byggt i v532). Ingen fil i src importerar den; bara bildstilens skript bildstil/varldkarta.ts använder den för att visa förslaget bredvid den nuvarande kartan. Det är avsiktligt: steget i Färdplanen säger att Björn säger ja eller nej i bildstilens valdel, och det valda byggs in i ett senare steg. Filen lånar mycket ur src/ui/varldbild.ts och typkontrolleras tillsammans med spelet där den ligger.  
Förslag: Rör inte filen förrän Björn svarat på förslaget i bildstilen. Vid ja kopplas den in i världskartan. Vid nej tas filen och bildstil/varldkarta.ts bort. Att flytta den till bildstil/ under tiden ger bara arbete åt båda hållen.  
Ändras i spelet: Ingen märkbar skillnad: spelet visar inte pergamentkartan i dag.  
Prövningen: Koden är inte död utan väntar på Björns ja eller nej i bildstilen, som arbetsgången säger (steg 11.9.2, Två kartlägen). Björn väljer: ja till pergamentet (filen kopplas in) eller nej (filen tas bort).

**468. Oanvända rörelser, redskap och material i arbetsbilderna**  
Var: `src/ui/arbetsbild.ts:17, 21-22, 27-28, 32, 44-45, 61, 80-81, 86-87; bildstil/anim.js:33-42`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Rörelserna pyssla och kasta, redskapen nål och snöboll och materialen vatten och snö finns i registren, men ingen handling i spelet använder dem. Fältet hand läses aldrig. Raderna bygga och dorr är likadana. Registren är en kopia av bildstilens anim.js, och designdokumentet (Spelaren och bilden) räknar upp rörelserna slå, stöta, plocka, pyssla och kasta som animationerna i spelet.  
Förslag: Antingen ta bort de oanvända raderna tills de behövs, eller koppla in dem: pyssla för den som syr eller tvinnar vid en station, kasta för snöbollskriget och stenkast. Låt i båda fallen dorr peka på samma rad som bygga.  
Ändras i spelet: Tas de bort: ingen skillnad. Kopplas de in: den som syr och den som kastar snöboll syns göra det.  
Prövningen: Det stämmer att raderna inte används, men designdokumentet beskriver rörelserna som en del av bildstilen. Björn väljer: ta bort dem nu, eller låta dem stå och koppla in dem i ett steg.

**469. Halvminnet är bara en etikett: det lärlingen hunnit lära sig ligger redan kvar**  
Var: `src/sim/teknik.ts:281, 443-448, 452-458; src/sim/typer.ts:269; src/ui/flikar/teknik.ts:93; src/test/scenarier/mastare.ts:207-211; src/test/scenarier/redskap.ts:361-367`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: När mästaren dör eller flyttar läggs teknikens id i p.halvminne. Inget i simuleringen läser listan: framstegen finns kvar i p.tek. Fältet används för ordet "halvminne" med en förklaring i teknikrutan, en räknare och rensningen i learn. Två scenarier (mastare och redskap) kontrollerar ordet.  
Förslag: Ta bort fältet och funktionen halvminne (p.lar = undefined räcker), ordet i teknikrutan och kontrollerna i de två scenarierna. Krönikans rad om att lärlingen "minns det bara till hälften" räknas för sig och kan stå kvar.  
Ändras i spelet: Ordet "halvminne" och dess förklaring i teknikrutan försvinner; procenten visas som förut. Inget annat ändras.  
Prövningen: Stämmer att inget i simuleringen läser fältet. Men halvminnet är ett eget steg i Färdplanen (4.2.3.4), och steg 11.1.32 säger att ordet ska förklaras vid ett tryck i teknikrutan. Björn väljer: behålla ordet i rutan, eller ta bort det och låta bara procenten visa vad lärlingen minns.

**470. Fyra världshändelser skrivs aldrig av spelet**  
Var: `src/sim/varldkronika.ts:18,20,26,28 (forbund, farsot, karavan, uppdrag), 31 (VARLDHANDELSE_IDS); src/sim/vacktliv.ts:40-41; src/test/scenarier/fas11.ts:476-483`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Registret över världens händelser har raderna förbund, farsot, plundrad karavan och uppdrag, men inget i simuleringen skriver dem; bara ett test skriver farsot och karavan och kontrollerar att alla raderna finns. Listan VARLDHANDELSE_IDS används inte av någon.  
Förslag: Ta bort de fyra raderna, grenarna som läser dem och VARLDHANDELSE_IDS, och låt testet använda slag som finns. Eller: ta bara bort den oanvända listan och låt raderna stå tills stegen byggs.  
Ändras i spelet: Ingen skillnad: händelserna kan inte inträffa i dag.  
Prövningen: Det stämmer att inget skriver dem. Men designdokumentet (Samhället, Världens krönika) räknar upp just de här slagen som rader i registret, och förbundet har ett obyggt steg (15.4.2). Björn väljer: stryka raderna tills de byggs (och ändra texten i dokumentet), eller låta dem stå. Den oanvända listan VARLDHANDELSE_IDS kan tas bort i båda fallen.

**471. Gamla sparfiler testas på flera ställen**  
Var: `src/test/scenarier/sparning.ts, redskap.ts:109, sjukdom.ts:170-173 och 178, stationsdelar.ts; src/sim/varld.ts:82-467 (UPPGRADERINGAR, migrate); src/sim/kartflytt.ts; src/ui/lagring.ts:41 (lasEllerFlytta)`. Vinst 3 av 5, risk 4 av 5, flera steg, ungefär 130 rader bort.  
I dag: Scenarierna anropar migrate() 46 gånger för att pröva att en äldre sparad by lagas rätt: gniststen blir flinta, läkekonst blir noll, den lilla kartan flyttas till den stora. ARKITEKTUR.md beskriver uppgraderingarna som ett eget register, och CLAUDE.md säger att spelet publiceras till samma adress 'så att Björns sparade by och länk finns kvar'.  
Förslag: Antingen behålls allt som nu. Eller så bestämmer Björn en version som äldsta by som måste gå att ladda, och uppgraderingar och kontroller före den tas bort i ett eget steg.  
Ändras i spelet: Ja, om det görs: byar sparade före den valda versionen går inte längre att öppna.  
Prövningen: Koden stämmer, men kontrollerna skyddar just det som reglerna lovar: att sparade byar finns kvar. Björn får välja mellan att alla gamla byar ska gå att ladda (inget ändras) eller att sätta en äldsta version och ta bort det som är äldre.

**472. Tester och kod för mycket gamla sparade byar (före v48, v87, v207, v284)**  
Var: `src/test/scenarier/natur.ts:725-731 och 738 (stationsteknik), 1473-1477 och 1488 (brasa), 1678-1693 och 1710-1711 (falt); src/sim/varld.ts:82-458 (UPPGRADERINGAR, 57 rader från v40 till v533)`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 35 rader bort.  
I dag: Fyra testblock bygger en by i gammalt format och ser att den lagas när den öppnas (slaktbänken som teknik, brasan som blir lägereld, fält som blir 2x2, korn som blir ärter). Det stämmer. Uppgraderingarna används varje gång en sparad by öppnas (src/ui/lagring.ts:31), och byn minns sin senaste version, så bara de nyare körs.  
Förslag: Om Björn vill: ta bort de äldsta uppgraderingarna och deras fyra testblock, och säg i spelet att en by äldre än gränsen inte går att öppna. Annars lämnas allt som det är.  
Ändras i spelet: En sparad by som inte öppnats sedan före gränsen går inte att öppna längre. En by som öppnats nyligen är redan uppgraderad och märker inget.  
Prövningen: Koden är inte död: den skyddar sparade byar, och arbetsreglerna säger att Björns sparade by ska finnas kvar. Björn väljer mellan att behålla skyddet för alla gamla byar eller sätta en lägsta version (t.ex. v500) och ta bort det äldre. Designdokumentet säger inget om hur gamla byar som ska gå att öppna.

**473. Mutan mellan grannbyar syns aldrig för spelaren**  
Var: `src/sim/byhandling.ts:55-58, 111-124, 365-381; src/sim/byrel.ts:23, 33, 105, 114-122; src/sim/radperson.ts:9, 64; src/sim/varlden.ts:27; src/test/scenarier/fas11.ts:769-785, 1011-1032, 2766-2808`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 30 rader bort.  
I dag: En by i världen kan muta en grannes ledare med silver eller varor. Det gäller aldrig huvudbyn, åt något håll. Verkan är att grannens syn på givaren höjs, och hälften faller bort när ledaren byts. Det är ungefär 30 rader i simuleringen och tre scenarier som prövar det.  
Förslag: Antingen ta bort mutan (handlingen, tre balanstal, listan vl.mutor, ledarbytet och testerna), eller låta den stå som den är.  
Ändras i spelet: Ja, lite: grannbyarnas syn på varandra rör sig något annorlunda, och därmed vilka som handlar, plundrar och krigar. Spelaren ser det bara i världens krönika.  
Prövningen: Stämmer att mutan aldrig rör huvudbyn, men den är ett byggt steg (11.6.15, v532) och står i avsnittet Relationen och läget mellan två byar. Ägaren väljer: behålla mutan som en del av världens liv, eller ta bort den för att den inte märks i spelet.

**474. Gamla fält i tron som bara finns för äldre sparade byar**  
Var: `src/sim/religion.ts:280; src/sim/varld.ts:395-423`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 25 rader bort.  
I dag: Tro har kvar fälten forrad, hov, tempel, gudabild och gravSlag. De läses bara av stegen 48 till 50 i flytten av gamla sparade byar (från v528 och v529), som gör om dem till det nya formatet och tar bort dem.  
Förslag: Ta bort fälten och flyttstegen först när Björn säger att hans sparade by har laddats med en nyare version och att äldre sparfiler inte behöver gå att öppna.  
Ändras i spelet: Nej för nya byar. En sparad by från före v528 skulle tappa kyrkans förråd, trons hus och gravplats.  
Prövningen: Stämmer i koden, men koden är det som gör att en gammal sparad by går att öppna rätt. Björn väljer: behåll flytten, eller säg att sparfiler äldre än v529 inte längre behöver fungera.

**475. Flytten från den gamla sparningen i webbläsaren**  
Var: `src/ui/lagring.ts:39-58, src/ui/spara.ts:113, src/ui/byar.ts:35, 66, src/test/scenarier/sparning.ts:370-378`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 25 rader bort.  
I dag: lasEllerFlytta, Gammal och gammalNyckel läser en by som sparats på det gamla sättet (localStorage) och flyttar den till databasen i webbläsaren. Det är byggt i steg 11.2.1 (v531), där Färdplanen säger att en gammal sparad by flyttas över första gången. Det används i spara.ts och byar.ts och prövas i scenariot sparning.  
Förslag: Ta bort flytten och dess del av scenariot när alla byar Björn vill ha kvar har öppnats minst en gång i v531 eller senare. Raden i byar.ts:66 som glömmer den gamla nyckeln när en by tas bort försvinner samtidigt.  
Ändras i spelet: En by som bara finns i den gamla sparningen och aldrig öppnats sedan v531 går inte längre att läsa. För en by som redan flyttats: ingen skillnad.  
Prövningen: Stämmer i koden, men flytten är ett byggt och önskat steg (11.2.1). Björn väljer: ta bort nu om alla hans byar, också de andra byarna i listan, har öppnats sedan v531, eller låta flytten ligga kvar tills vidare.

**476. Tester för sparfiler från gamla versioner (åtta scenarier)**  
Var: `src/test/scenarier/agande.ts:300-304 (egendom), 333-335 (delning), 865-879 (plagg), 1074-1079 (handelsvaror), 1969-1970 och 2021-2022 (grannklaner), 2190-2193 (rovargang), 3136-3142 (gastperson); src/sim/varld.ts:82-458 (UPPGRADERINGAR)`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 20 rader bort.  
I dag: Åtta scenarier bygger en by i ett gammalt format och kontrollerar att migrate() gör om den. Talet som sätts (g.v = 1, 14, 26, 27, 50, 52, 55, 56) är uppgraderingens nummer, inte spelets version. Bara två av proven gäller riktigt gamla sparfiler: egendom (före v40) och plagg (före v194). De andra sex gäller v513 till v532, alltså de senaste versionerna. Registret har 59 uppgraderingar; nummer 2 till 24 (före v378) är ungefär 185 rader.  
Förslag: Björn väljer en äldsta version som sparade byar ska gå att öppna från. Uppgraderingarna före den tas bort ur varld.ts, med sina prov (egendom och plagg om gränsen sätts efter v194). Proven för v513 och senare behålls.  
Ändras i spelet: Sparade byar äldre än gränsen går inte längre att öppna. Björns egen sparade by måste vara nyare än gränsen. Nya byar och nyare sparningar påverkas inte.  
Prövningen: Läsaren läste uppgraderingens nummer som spelets version: sex av de åtta proven gäller helt nya uppgraderingar och ska vara kvar. ARKITEKTUR.md regel 3 säger att äldre sparfiler ska fungera, och spelet publiceras till samma länk för att Björns by ska finnas kvar. Björn väljer: allt gammalt går att öppna som nu, eller en gräns (till exempel v378) som tar bort cirka 185 rader i varld.ts och två prov. Designdokumentet säger inget om en gräns.

**477. Test av gamla sparfiler och uppgraderingarna bakom dem**  
Var: `src/test/scenarier/grund.ts:579-581, 590 (kunskap), 2176-2178, 2189 (barbuskar); src/sim/varld.ts:462-473 (migrate, uppgradera, UPPGRADERINGAR med 59 rader)`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Kunskap prövar att en sparfil från före v40 får svampkunskapen flyttad till var och en, och barbuskar att en sparfil från före steg 6.5.4 får bärbuskar. Bakom dem ligger registret UPPGRADERINGAR, som lagar äldre sparade byar steg för steg. Läsaren antog att Björn inte behöver gamla sparfiler. Arbetsreglerna säger tvärtom att spelet alltid publiceras till samma adress så att Björns sparade by finns kvar, och ARKITEKTUR.md (regel 3) säger att äldre sparfiler ska fungera. Designdokumentets flik Läget säger inget om hur gamla sparfiler som ska gå att läsa.  
Förslag: Rör inget förrän Björn sagt hur gammal en sparad by får vara. Säger han en version (t.ex. den by han spelar nu), kan uppgraderingarna före den och de två kontrollerna tas bort i ett eget steg.  
Ändras i spelet: En sparad by som är äldre än gränsen går inte längre att läsa in rätt. Nya byar och Björns nuvarande by märker ingenting om gränsen sätts före den.  
Prövningen: Koden stämmer, men reglerna säger att Björns sparade by ska finnas kvar. Björn väljer mellan att alla gamla byar ska gå att läsa (som nu) eller att sätta en äldsta version, så att uppgraderingarna före den och deras tester kan tas bort.

**478. Markens gamla sparformat lever kvar eftersom kartflytten fortfarande skriver det**  
Var: `src/sim/vag.ts:162-172 (encodeCover, decodeCover); src/sim/mark.ts:52, 80 (gamla grenen i lasMark), 96-97; src/sim/kartflytt.ts:16, 69-70; src/test/scenarier/fas9.ts:57-61 (scenariot sparmark)`. Vinst 1 av 5, risk 2 av 5, ett steg, ungefär 12 rader bort.  
I dag: Marken sparas i ett packat format (steg 9.1.4), men kartflytten skriver det gamla formatet, och läsningen av det gamla finns kvar. Läsningen behövs också när en by sparad före v512 laddas: kartflytten läser då den gamla marken. Scenariot sparmark jämför det nya formatet med det gamla. I mark.ts står samma läsning två gånger (i groundOf och i lasGras/lasSkog).  
Förslag: Låt kartflytten packa med packaMark, ta bort encodeCover, decodeCover och den gamla grenen (läsningen av en by utan sparad mark måste vara kvar), skriv om scenariot sparmark, och låt groundOf anropa lasGras och lasSkog.  
Ändras i spelet: Nej i spelet. En by som sparades före v512 och aldrig sparats om får ny mark (gräs, stigar och skog börjar om) när den laddas.  
Prövningen: Stämmer, men regel 3 i ARKITEKTUR.md säger att äldre sparfiler ska fungera. Björn väljer: behöver byar sparade före v512 (till exempel gamla säkerhetskopior) gå att ladda med marken kvar, eller får det gamla formatet tas bort. Att slå ihop de två likadana läsningarna i mark.ts kan göras oavsett.

**479. Koden och proven som lagar äldre sparade byar**  
Var: `src/sim/varld.ts:461-466 (uppgradera: tabun, väggbrädet, hötuvorna, stegRest); src/test/scenarier/fas10.ts:329-330 och 337 (ho); src/test/scenarier/behov.ts:795-797 (naring); src/sim/steg.ts:394, 547, 744; src/sim/tornado.ts:156, 212; src/sim/typer.ts:454`. Vinst 2 av 5, risk 4 av 5, ett steg, ungefär 30 rader bort.  
I dag: När en sparad by läses in lagas den: sådant som tagits bort ur spelet rensas, och en by från före näringsvärdena får dem ur mättnaden. Två scenarier prövar det. ARKITEKTUR.md (regel 3) säger att äldre sparfiler ska fungera, och CLAUDE.md säger att Björns sparade by ska finnas kvar vid varje publicering.  
Förslag: Antingen behålls allt, eller så bestäms en brytpunkt: byar sparade före en viss version går inte längre att läsa in, och rensningarna och de två proven tas bort (omkring 30 rader).  
Ändras i spelet: Ja, för sparade byar. En by sparad före brytpunkten kan bli fel eller gå förlorad när den läses in. Nya byar märker inget.  
Prövningen: Koden finns som läsaren säger, men den finns för att Björns sparade by ska överleva varje ny version. Björn väljer: behålla stödet för alla gamla byar (som nu), eller sätta en brytpunkt och acceptera att äldre sparade byar inte går att läsa in.

**480. Kod som bara finns för gamla sparfiler**  
Var: `src/sim/fynd.ts:444-447; src/sim/trad.ts:71-76; src/sim/tamdjur.ts:72; src/sim/fisk.ts:60, 65, 73; src/sim/varld.ts:260`. Vinst 1 av 5, risk 3 av 5, liten ändring, ungefär 8 rader bort.  
I dag: fyndBin och lasPackat läser ett äldre sparformat utan '~', arHona gissar könet för djur sparade utan kön, och fällorna antar sorten 'mjarde' när den saknas. ARKITEKTUR.md (regel 3) säger att äldre sparfiler ska fungera, och varld.ts:260 använder den äldre läsningen för att göra om en gammal by till det nya formatet.  
Förslag: Ta bort grenarna bara om Björn bestämmer en äldsta version som ska gå att öppna. Annars står de kvar.  
Ändras i spelet: Ingen skillnad för en by sparad med en ny version. En gammal sparad by kan förlora sina fynd och trädsorter eller inte gå att öppna.  
Prövningen: Koden stämmer, men den följer regeln att äldre sparfiler ska fungera. Björn väljer: behålla stödet för alla gamla byar (inget görs), eller sätta en äldsta version och ta bort det som är äldre, för en vinst på ungefär åtta rader.

### Förenkla (53)

**481. Beställda minnen (10.7.30): ett extra lager ovanpå beställda framträdanden**  
Var: `src/sim/framtradande.ts:235-249, 262-268, 282-286, 336, 339, 452; src/sim/framber.ts:23; src/sim/berattelser.ts:1770-1771; src/ui/flikar/fram.ts:36; src/test/scenarier/kultur.ts:597-644`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 25 rader bort.  
I dag: Ledaren kan betala för en hyllning och kyrkan för ett framträdande om tron. Ovanpå det kan ledaren eller prästen i stället beställa ett minne om en tredje person som beställaren har en stark åsikt om, och beställarens åsikt vrider versionen av gärningen. Det har egna fält (Fram.best, FramMinne.bestallt), en egen lottning, egna meningar i berättelsen och ett eget scenario (bestalltminne).  
Förslag: Ta bort bestallMinne och personBud, grenarna i bestall och kyrkBud, fälten best och bestallt, det femte argumentet i scenVersion, mallraderna och scenariot. Ledaren beställer hyllningar och kyrkan tal om tron.  
Ändras i spelet: Ingen ledare eller präst betalar längre för att få någon annans rykte berättat från scenen. Rykten om personer sprids fortfarande när den som uppträder själv väljer det.  
Prövningen: Koden är som fyndet säger, men beställda minnen är ett byggt steg (10.7.30) och står i avsnittet Framträdanden i designdokumentet som något den som betalar kan göra. Björn väljer om propagandan om andra personer ska finnas kvar eller strykas.

**482. Två likadana lageråtgärder där den ena aldrig kan väljas**  
Var: `src/sim/byggplan.ts:415-422, 784, 792, 827-831, 884-897`. Vinst 2 av 5, risk 1 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Större lagerplats och Ny lagerplats är två rader i BYGGATGARDER med samma kostnad och samma värde. Bara steget skiljer (0 mot 1), så den större vinner alltid i poängen. Grenen för 'ny lagerplats' nås aldrig genom valet; en ny läggs bara när den gamla inte gick att göra större. Inget test och inget i gränssnittet frågar efter de två raderna.  
Förslag: Antingen ta bort de två raderna och tävlingen (planLager blir: gör lagret större, går det inte läggs ett nytt), och rätta texten i designdokumentet. Eller ge raderna riktiga, olika kostnader och värden så att vägningen betyder något.  
Ändras i spelet: Ingen skillnad om raderna tas bort. Får de riktiga tal kan byn ibland välja en ny lagerplats i stället för en större.  
Prövningen: Det stämmer i koden, men designdokumentet (Byggplanen: Behov, inte bygge) säger att en större och en ny lagerplats ska föreslås av Byggplanen med samma värde per kostnad som allt annat. Björn väljer: ta bort den tomma vägningen och skriva om texten, eller göra vägningen riktig.

**483. Flytten av lagerplatser närmare byns mitt är ett eget system för liten nytta**  
Var: `src/sim/lager.ts:41-45, 89, 684, 989-1048; src/sim/projekt.ts:88, 249-254; src/sim/steg.ts:347, 495; src/sim/handlingar.ts:293; src/sim/typer.ts:460; scenariot mittenlager i src/test/scenarier/byggnader.ts:2416-2436`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 65 rader bort.  
I dag: Varje uttag ur en stack räknas på lagerplatsen och glöms över tre dygn (tre år i spelet). Var fjärde timme i spelet söker spelet för varje lagerplats som det hämtas ur efter en plats närmare byns mitt, och ett projekt låter någon flytta lagerplatsen. Fem balanstal, en handling och ett scenario hör till. Nya lagerplatser dras redan mot mitten när de läggs, och en lagerplats som ligger i vägen för ett hus flyttas ändå.  
Förslag: Ta bort flytten mot mitten: räkningen av det som hämtas, narmareLager, lagerFlyttTimme, lagerFlyttVal, lagerFlyttBast, lagerFlytta, projektet och handlingen flyttLager, scenariot mittenlager och de fem balanstalen.  
Ändras i spelet: En lagerplats ligger kvar där den lades tills ett hus behöver platsen. Byar som vuxit åt ett håll får lite längre väg till ett gammalt lager. Sökningen var fjärde timme försvinner.  
Prövningen: Stämmer i koden, men flytten är steg 9.4.7 (byggt v521) och står i designdokumentet under Dragningen mot mitten som ett projekt som vägs mot allt annat. Björn väljer: behålla flytten som dokumentet beskriver, eller ta bort den och låta bara nya lagerplatser dras mot mitten.

**484. Vargarnas väntan utanför dörren är ett eget litet system**  
Var: `src/sim/varg.ts:297-298, 381, 385-388, 448-496; VARG.vantaTim rad 118; Vargflock.dorr/vantar/trottnat i typer.ts`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 60 rader bort.  
I dag: En hungrig flock som inte ser någon ensam kan ställa sig utanför en stängd dörr i två timmar. De inne håller sig gömda, och de modiga går ut och slåss. Det kräver många saker samtidigt och händer därför sällan.  
Förslag: Mät räknarna vargVantar, vargDorrStrid och vargTrottnade i en balanskörning. Björn väljer sedan om händelsen ska vara kvar.  
Ändras i spelet: Tas det bort försvinner händelsen 'Vargarna väntar utanför dörren' och striden utanför dörren. Vargarna ger då upp direkt vid en stängd dörr.  
Prövningen: Koden stämmer, men väntan utanför dörren är ett byggt steg (3.7.21) och står beskriven i designdokumentet (Trädörren och vargen). Björn väljer mellan att behålla händelsen som den är eller ta bort den om mätningen visar att den nästan aldrig inträffar.

**485. Dragningen mot mitten för stationer: eget delsystem i fyra filer**  
Var: `src/sim/stationer.ts:1493-1541; src/sim/projekt.ts:87, 273-278; src/sim/steg.ts:346, 496; src/sim/val.ts:993; src/sim/typer.ts:458; src/test/scenarier/byggnader.ts:2449-2463`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 60 rader bort.  
I dag: En gång per dygn (ett år i spelet) räknas vilken station ute som är mest värd att flytta närmare husen och lagren, efter hur mycket den används. Flytten är ett projekt med fyra balanstal och ett eget scenario (mitten). Det är steg 9.4.8, byggt i v521.  
Förslag: Mät först hur ofta 'stationFlyttadIn' händer i en balanskörning. Händer det nästan aldrig kan Björn välja att ta bort delsystemet; annars står det kvar.  
Ändras i spelet: Tas det bort står stationerna ute kvar där de byggdes, också när byn vuxit åt ett annat håll.  
Prövningen: Koden är som läsaren säger, men designdokumentet (Byggplanen: Dragningen mot mitten, steg 9.4.8) beskriver flytten av stationer som önskad. Björn väljer: behålla systemet, eller ta bort det om mätningen visar att det nästan aldrig används.

**486. Larmet om rövare sprids på fem olika sätt**  
Var: `src/sim/rovare.ts:104, 305-325, 329-352, 363-404, 426-428, 578, 671, 888; src/sim/handlingar.ts:121`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 45 rader bort.  
I dag: Den som ser gänget får larmet (med vakthunden som eget fall). Sedan sprids det genom handlingen varna, ropet när striden börjar, budbäraren som springer och hämtar en som inte hört (ca 35 rader) och barnen som ropar medan de springer och gömmer sig. Allt stämmer med koden.  
Förslag: Behåll en väg: den som har larmet och är vaken ropar, och alla inom hörhåll får det led för led. Ta bort budbäraren och barnens rop.  
Ändras i spelet: Vuxna som arbetar långt utanför hörhåll får inte längre bud och missar anfallet. Ingen springer som budbärare, och barn sprider inte larmet.  
Prövningen: Budbäraren (steg 9.2.117) och barnens rop (steg 9.2.118) står som byggda steg i Färdplanen och i avsnittet Anfallet nära byn, med kontroller i scenariot ran. Björn får välja mellan enklare kod och de två sätten att få larmet ut till dem som är långt borta.

**487. Trädens genomskinlighet: tre nivåer och två punktlistor kan bli en regel**  
Var: `src/ui/trad.ts:352-440, src/ui/tona.ts:10-21`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 45 rader bort.  
I dag: Kronor som skymmer något tonas på tre sätt: raster framför folk, djur, högar, stationer och husrutor, lätt raster två rutor från folk, och bara stammen inom en ruta från folk och framför det markerade trädet. Det kräver fyra tabeller, rastrerade kopior av trädbilderna och kod mot blinkning. Allt räknas om varje bildruta.  
Förslag: Behåll bara nivån 'bara stammen' nära folk, gäster och framför det markerade. Ta bort rasternivåerna och punktlistan för högar, stationer, hus och djur.  
Ändras i spelet: Bara bilden: högar, stationer, hus och djur bakom en krona syns inte längre genom ett raster, och den tonade kanten runt folk försvinner, så träd kan blinka när någon går förbi. Byn utvecklas likadant.  
Prövningen: Koden stämmer, men designdokumentet beskriver just detta som önskat: steg 5.1.4.6 (kronor framför folk, djur, saker och hus tonas), 9.2.88 (tonar ut mot kanten så att det inte blinkar) och 9.2.138. Björn väljer mellan att behålla rastret framför hus, högar och djur, eller en enklare bild där bara folk och det markerade syns genom skogen.

**488. Två lager som låter den som står still vänta: långa slag och vantar**  
Var: `src/sim/kartstrid.ts:95-115 (slagLangd); src/sim/klocka.ts:9-18 (langst, sikt, SLAGHINDER, nasTid); src/sim/steg.ts:598-606 (VARJE_SLAG, vantar); SLAGHINDER i src/sim/brand.ts:819, varg.ts:701, tornado.ts:514, rovare.ts:920, handel.ts:942, gast.ts:185, bjorn.ts:261-267`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 35 rader bort.  
I dag: Den som sover eller står vid ett arbete hoppas redan över i slaget av vantar (räknas var 30:e sekund eller när något är klart). Ovanpå det förlängs hela slaget upp till 60 sekunder när ingen kan nå någon annan: slagLangd jämför alla mot alla varje slag, och sju system har var sin rad i SLAGHINDER för att hålla slaget kort. Designdokumentet (Hur klockan går och Nya system och takten i fliken Läget) beskriver det långa slaget som en del av klockan, och säger att gränsen på 3 minuter för ikappräkningen efter en vecka borta hålls knappt.  
Förslag: Mät först, utan att ändra kod: npm run kostnad och ikappräkningen (npm run ikapp) med BALANS="klocka.langst=2" mot som det är. Är skillnaden liten för nätterna kan slagLangd, SLAGHINDER, nasTid, KLOCKA.langst och KLOCKA.sikt tas bort, och slaget är då alltid KLOCKA.slag eller STRID.kortSteg. Texten i fliken Läget och scenarierna som prövar långa slag skrivs då om.  
Ändras i spelet: Byn ska bli densamma (allt räknas per tid), men slagen under natten blir fler, så en by utvecklas inte exakt som förut. Ikappräkningen av nätter kan bli långsammare; det är det mätningen ska visa.  
Prövningen: Koden är som läsaren säger, men det långa slaget står beskrivet som önskat i designdokumentet, och ikappräkningen klarar sin gräns på 3 minuter knappt. Björn väljer mellan enklare kod (ett sätt att vänta i stället för två) och snabbare nätter i ikappräkningen; mätningen med klocka.langst=2 ger underlaget.

**489. Tappade vapen på marken finns bara inne i striden**  
Var: `src/sim/strid.ts:152-156, 328, 637, 659, 661-686, 790-791`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 32 rader bort.  
I dag: Ett vapen kan tappas av en träff i armen eller vid ett fall. Det hamnar i stridens egen lista (st.marken), och en kämpe utan vapen går dit, böjer sig ner och tar upp det. Vapnet blir aldrig en sak på kartan: tinget tillhör ägaren hela tiden. Ca 30 rader och fem balanstal.  
Förslag: Antingen ta bort tappa, hamtaSteg, plocka, st.marken och talen (bytet till reservvapnet blir kvar). Eller gör det på riktigt: det tappade vapnet läggs som en sak på rutan, som designdokumentet säger.  
Ändras i spelet: Tas det bort: ingen tappar sitt vapen och ingen tar upp en annans, och raderna 'tappar' och 'tar upp' försvinner ur stridsloggen. Görs det på riktigt: ett tappat vapen ligger kvar på kartan och kan tas av vem som helst.  
Prövningen: Koden stämmer. Men steg 3.7.8 (Knuff, fall och tappade vapen) är byggt och önskat, och avsnittet Striden på kartan säger att det tappade vapnet ligger på rutan. Björn får välja: ta bort, låta vara, eller göra vapnet till en riktig sak på kartan.

**490. Personrutan har två register (flikar och delar) och tre sätt att minnas vad som är öppet**  
Var: `src/ui/flikar/person.ts:55-56, 64-111, 578, 627; src/ui/lage.ts:42; src/test/scenarier/agande.ts:1448-1460`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 25 rader bort.  
I dag: Personens åtta flikar (FLIKAR) pekar på tolv delar (DELAR). Fyra flikar har två delar som fälls ut och ihop var för sig, med en kort sammanfattning på rubriken. Vad som är öppet minns på tre sätt: ui.personFall, variablerna kunTek och tidVald, och hjälptexternas vanliga minne.  
Förslag: Antingen behålls utfällningen som den är, eller så visas flikens delar alltid under varandra. Oavsett kan kunTek och tidVald använda hjälptexternas minne (hjalpOppen), som resten av rutan.  
Ändras i spelet: Om delarna alltid visas: i Behov, Saker, Människor och Händelser går delarna inte längre att fälla ihop, och sammanfattningen på rubriken (t.ex. "känner 12") försvinner. Simuleringen påverkas inte.  
Prövningen: Koden stämmer, men utfällningen är beställd: steg 5.3.4.2 i Färdplanen säger att varje del har en rubrik med sammanfattning som fälls ut, och att panelen minns det. Björn väljer mellan att behålla det eller att visa delarna alltid öppna utan sammanfattning; scenariot agande prövar dagens sätt.

**491. Förbudet mot hån gäller för alltid, också nästa ledare, och finns bredvid påbudet om hån**  
Var: `src/sim/framtradande.ts:183, 479; src/sim/rost.ts:142-149; src/sim/styre.ts:187, 239, 254; src/sim/stationer.ts:1645; src/test/scenarier/kultur.ts:1331-1333`. Vinst 3 av 5, risk 3 av 5, ett steg, ungefär 14 rader bort.  
I dag: Två saker avgör om man får håna ledaren. Påbudet 'Hån mot ledaren' är en glidande skala. Frågan 'hanforbud' (steg 8.3.13) läggs alltid fram av ledaren efter ett hån; går den igenom sätts s.styre.hanForbud, hånet blir omöjligt och scenen rivs. Flaggan skrivs bara på ett ställe (rost.ts:146) och nollställs aldrig, och s.styre byts inte när ledaren byts. Förbudet mot att håna en viss ledare gäller därför alla senare ledare. Designens straff för den som hånar ändå finns inte i koden: efter förbudet kan hånet inte väljas alls. Fältet hanSedd används inte.  
Förslag: Björn väljer. A: behåll bara påbudet och ta bort frågan hanforbud, hanForbudet, rivScenen, fältet hanForbud och rad 479. B: behåll förbudet men låt det upphöra när ledaren byts (eller gå att rösta bort), och ta bort hanSedd.  
Ändras i spelet: A: byn röstar inte längre om ett särskilt förbud efter ett hån och scenen rivs inte; hur fritt man får håna styrs bara av påbudet. B: förbudet finns kvar men gäller den ledare det handlade om.  
Prövningen: Förbudet är ett byggt steg i Färdplanen (8.3.13) och påbudet står kvar som eget påbud i designdokumentet, så båda är önskade. Att förbudet aldrig tar slut är däremot ett fel i koden. Björn väljer mellan att stryka förbudet eller att låta det ta slut med ledaren.

**492. Kolet, flintan och fängelsevakten har poäng i en annan skala och vinner sällan mot maten**  
Var: `src/sim/val.ts:842, 851, 867 (poängen), 854-863 (mat, ved), 156 (medianerna), 936-947 (vinnare), 1256 (kommentaren om att flintan letas när maten räcker); src/sim/fangelse.ts:154-159`. Vinst 3 av 5, risk 3 av 5, ett steg.  
I dag: Matens poäng är behovet gånger lusten (median ungefär 23 för maten och 7 för veden enligt kommentaren). Kolet får högst 0,5, flintan högst 1,5 och vakten aggressionen/10 gånger ett tal. De förlorar så länge maten är under bufferten och vinner mest när maten räcker. vinnare() tar också en full rad (poäng delat med tre) före en ledig rad med lägre poäng. Kommentaren på rad 1256 säger att flintan ska letas när maten räcker, så en del av detta kan vara menat. Flintan kommer i praktiken in genom de äldre slumpvägarna (nästa fynd) och nödraden tandFryser.  
Förslag: Bestäm först vad som ska gälla: ska flinta, kol och vakt kunna slå maten när bristen är stor? I så fall en skala för alla rader på nivån (behov gånger lust). Passar att göra tillsammans med steg 12.1.39, som redan säger att flintan ska följa hur mycket som fattas.  
Ändras i spelet: Flinta letas, kol hämtas och fången vaktas också när maten är under bufferten, efter hur stor bristen är. Färre händer till maten då. Balanstalen (letaVikt, kolVikt, FANG.vakt) måste ställas om.  
Prövningen: Skalorna skiljer sig som läsaren säger, men det kan vara menat att maten går före. Ägaren väljer: flintan, kolet och vakten väntar tills maten räcker (som i dag), eller de tävlar med maten efter hur stor bristen är.

**493. Samma-kollen finns både i npm test och i samma.ts**  
Var: `src/test/samma.ts:1-45; src/test/test.ts:131-138; test/samma.json; package.json (facit och samma)`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 50 rader bort.  
I dag: Två kontroller jämför hela byns tillstånd som en hash. npm test gör det för tre byar i 50 dygn (två av dem med alla motgångar) mot facit.json. samma.ts kör fem egna byar (30, 30, 2, 30 och 14 dygn) mot test/samma.json. Det stora testet kör inte samma.ts; den sparas bara av `npm run facit`.  
Förslag: Antingen behåll `npm run samma` som den snabba kollen vid ombyggnad, eller ta bort samma.ts och samma.json och låt `npm run samma` bli en kort väg till hashjämförelsen i npm test.  
Ändras i spelet: Ingen skillnad i spelet. Slås de ihop tar kollen vid en ombyggnad lika lång tid som npm test (tre byar i 50 dygn), och byarna 42, 3, 139 och 121 försvinner ur kollen.  
Prövningen: Stämmer i koden, men steg 10.2.105 säger uttryckligen att npm run samma finns kvar för ombyggnad, och de obyggda stegen 12.1.11, 12.1.24 och 12.2.5 räknar med den. Björn väljer: en egen kortare koll med egna byar, eller en enda koll som tar lika lång tid som npm test.

**494. Eldens egen statistik och logg sparas för varje eld**  
Var: `src/sim/typer.ts:529-538 (FireLog, burned, totalBurned, litSec, outs, tryTotal, fills, log, litBy); src/sim/eld.ts (där de skrivs); src/ui/flikar/eld.ts (där de visas); src/test/scenarier/natur.ts (läser tryTotal två gånger)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 30 rader bort.  
I dag: Varje eld bär nio fält som bara eldfliken visar: en egen logg, hur många gånger var och en fyllt på, bränd ved nu och totalt, brinntid, antal gånger den slocknat och antal försök. Ingenting i simuleringen läser dem; utanför eldfliken läses bara tryTotal av ett scenario. CLAUDE.md säger att elden är ett verktyg och inte ett mål.  
Förslag: Björn avgör. Behåll lightings, tries och litAt, och ta bort resten tillsammans med eldflikens historik och "mest påfyllt av". Scenariot i natur.ts som läser tryTotal skrivs om.  
Ändras i spelet: Byn utvecklas likadant. Eldfliken visar inte längre eldens historik, vem som fyllt på mest och hur mycket ved som gått åt.  
Prövningen: Det stämmer att bara eldfliken läser fälten, men det som tas bort är något Björn ser i spelet. Björn väljer mellan att behålla eldens historik i fliken, eller att ta bort den och spara omkring 30 rader och lite plats i sparfilen.

**495. Två system säger vad ett rum är: RUMSFUNKTIONER och RUMSTYPER**  
Var: `src/sim/byggnader.ts:534-552; src/sim/rum.ts:42-63; src/ui/flikar/hus.ts:34-39; src/ui/interaktion.ts:258; src/sim/byggplan.ts:432; src/test/scenarier/byggnader.ts:603-624`. Vinst 2 av 5, risk 2 av 5, ett steg, ungefär 20 rader bort.  
I dag: RUMSFUNKTIONER (sovrum, verkstad, förråd, steg 2.2.17) säger vad hela huset används till. RUMSTYPER (taggarna, steg 7.2.1) säger vad varje rum är. Båda räknas ur det som står där, och båda visas i husfliken och i rutan under musen. De räknar inte helt lika: sovrum i det gamla betyder att någon faktiskt sover där, i det nya att det finns sovplatser.  
Förslag: Behåll RUMSTYPER och ta bort RUMSFUNKTIONER. Husköpen (byggplan.ts:432) frågar i stället om en arbetsstation står i huset. Scenariot funktion skrivs om mot taggarna.  
Ändras i spelet: Husfliken och rutan under musen visar en rad om vad huset används till i stället för två. Annars ingen märkbar skillnad.  
Prövningen: Stämmer i koden, och designdokumentet beskriver bara taggarna (RUMSTYPER). Men det ändrar vad Björn ser i husfliken. Björn väljer: en rad (taggarna per rum) eller båda som i dag.

**496. Bygget kopierar hela källkoden till 387 filer som publiceras med spelet**  
Var: `build.mjs:10-25; CLAUDE.md (Bygga och publicera); designdokumentet, fliken Läget`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 14 rader bort.  
I dag: Varje bygge kopierar 382 filer ur src/ (också 78 testfiler och bildfilerna) och fyra till som .txt till publicera/kalla, ungefär 9,2 MB, och skriver fillistan filer.json. Det är fler filer än de 255 som en publicering får skicka på en gång. Men källkoden under kalla/ är önskad: CLAUDE.md säger att den ska med, och Läget i designdokumentet säger att koden finns där och att en chatt utan git-förrådet läser den därifrån (LASMIG.txt säger hur filerna läggs tillbaka).  
Förslag: Antingen ta bort kopieringen och hänvisa till GitHub, eller skicka bara spelets kod och ARKITEKTUR.md utan tester och genererade bildfiler (då ryms listan i en publicering). Reglerna i CLAUDE.md och raderna i Läget skrivs om på samma sätt.  
Ändras i spelet: Ingen skillnad i spelet. Källkoden under kalla/ på artefakten försvinner eller blir ofullständig.  
Prövningen: Stämmer i koden, men kalla/ står som önskat både i arbetsreglerna och i designdokumentet, som en reserv när git-förrådet saknas. Björn väljer mellan: behålla allt, skicka bara spelets kod utan tester och bildfiler, eller ta bort kalla/ och lita på GitHub.

**497. Brådskan för tillfällen finns för två rader**  
Var: `src/sim/val.ts:138-140, 540-541, 559, 712-714, 721, 956-972`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: En egen mekanism låter handeln och lyssnandet prövas före grundbehoven med en chans som stiger från 0,5 till 1 medan fönstret är öppet, och annars efter dem. Jakten, resan och ritualen använder den inte; de går alltid före grundbehoven.  
Förslag: Ta bort mekanismen och låt de två raderna stå på sin plats bland tillfällena, eller behåll den som den är.  
Ändras i spelet: Den som vill handla eller lyssna skulle gå dit direkt också i början av besöket, i stället för att i hälften av fallen äta, dricka eller vila först.  
Prövningen: Designdokumentet (Människan, Arbetsordningen) säger att ett tillfälle har ett tidsfönster och att behovet stiger när tiden rinner ut. Björn får välja: behålla den stigande brådskan för handlaren och framträdandet (som nu), eller låta alla tillfällen gå före vanlig hunger direkt och spara tio rader.

**498. Tre olika räkningar för vem som vågar möta vargarna, och ett extra lager före rollerna**  
Var: `src/sim/varg.ts:268 (LARMHOT.varg), 277 och 303-307 (skyddas), 472-475 (modiga), 536 (vagar i jaktBeslut); src/sim/rovare.ts:124 (vuxenKan), 409-411; src/sim/roller.ts:17-24`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Rollen vid larm räknas ur viljan (rovarVilja) plus ett tillägg för hur många som kan slåss. Men de som går ut genom dörren (modiga) och den som kallar till jakt (vagar) använder den äldre formeln mod / 20, fast kommentaren säger 'som vargSkydd'. Före rollerna skickas barn, gamla, sjuka och svaga alltid att gömma sig (skyddas), fast viljan redan drar av för sjuk och gammal. Mot rövarna finns inget sådant förlager.  
Förslag: Låt rollen (rollVid med hotet varg) avgöra också vem som går ut genom dörren och vem som vågar kalla, och räkna dem som kan slåss med vuxenKan. Om skyddas-grenen ska bort avgör Björn.  
Ändras i spelet: Lite: sederna, familjen och hälsan väger in i vem som går ut genom dörren eller kallar till jakt. Tas förlagret bort kan en gammal eller sjuk vuxen med stor vilja ställa sig vid elden mot vargarna, som mot rövarna i dag.  
Prövningen: Stämmer i koden, och designdokumentet säger båda sakerna: rollen väljs som mot rövarna (Vargflocken vid byn), men steg 3.7.15 låter gamla och sjuka gå in. Björn väljer: ska gamla och sjuka alltid gömma sig för vargarna (som nu), eller välja roll som mot rövarna?

**499. En dålig skrift har tre olika straff där ett kanske räcker**  
Var: `src/sim/skrift.ts:276 (fel), 422-427 (kartRykten), 448, 507-511, 541; src/sim/skriftTal.ts:36, 43; src/test/scenarier/kultur.ts:1936-1939`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Kvaliteten på en skrift verkar på tre sätt: nar (så stor del av innehållet når läsaren), fel (en usel eller slarvig skrift får ibland värdet gånger 2 eller 0,5, slaget en gång och sparat på skriften) och kartRykte (kända platser ritas som rykten på en dålig karta).  
Förslag: Behåll nar och ta bort fel (felChans, felOver, felUnder, fältet Skrift.fel och raderna i skrivKlar och lasKlar). kartRykten kan också ersättas av att nar sänker säkerheten.  
Ändras i spelet: Ja, lite: en slarvig skrift ger fortfarande en osäkrare lärdom, men den överdriver eller underdriver inte längre värdet, och en slarvig karta visar platserna som osäkra i stället för som rykten.  
Prövningen: Koden är som läsaren säger, men felet är beskrivet i designdokumentet (Samhället, Kvaliteten 10.6.7): "en fara blir större eller mindre, ett pris högre eller lägre, tre vargar blir sex", med talen för chansen, och kartans rykten är steg 11.7.2. Björn väljer mellan att behålla felen i skrifterna eller nöja sig med lägre säkerhet.

**500. Lill- och Stor-namnen ersätter öknamnet men behåller dess skäl**  
Var: `src/sim/berattelser.ts:58 (BERATT.lekNamn), 2173-2180 (lekNamn), 2183 (gebinamn), 145-157 (mallarna oknamn); src/test/scenarier/folk.ts:1937-1944`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: När byn ger någon ett namn efter ett intryck (Tjuven, den flitige) byts namnet i hälften av fallen mot Lill- eller Stor- plus namnslutet, om en förälder eller ett barn i livet har samma namnslut. Skälet och texten är kvar från det riktiga namnet, så krönikan kan skriva "Det är inget fint namn, Lillbjörn. Men Tuskbjörn stal en kniv". Namnet ges bara till den som ändå skulle få ett öknamn eller hedersnamn.  
Förslag: Antingen ta bort lekNamn, balanstalet och testet, eller göra Lill-/Stor- till ett eget namn med egen text som ges för släktskapet och inte lånar tjuvens skäl.  
Ändras i spelet: Tas det bort kallas ingen längre Lillbjörn eller Storbjörn. Görs det om får de namnet med en text som handlar om släkten.  
Prövningen: Det stämmer att texten och namnet inte hör ihop. Men Lill- och Stor- är ett byggt och avbockat steg i Färdplanen (4.5.4.8), som Björn bett om. Björn väljer: ta bort namnen, låta dem vara, eller ge dem en egen text och ett eget skäl.

**501. Blötveden har tio balanstal; tre gör jobbet**  
Var: `src/sim/blotved.ts:17-24, 30, 35-42; src/sim/lager.ts:91 (fälten vat och tork)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 9 rader bort.  
I dag: En hög blir blöt först efter 1 timme regn eller 3 timmar snö. Torkningen har grundtiden 24 timmar gånger tre faktorer: tak (2), nära en eld (4) och temperaturen (tre tal). Allt detta står ordagrant i designdokumentet (Blöt ved, steg 7.3.4), med talen som startvärden.  
Förslag: Högen blir blöt genast när det regnar eller snöar på den och torkar på torkTim, dubbelt så fort under tak. Ta bort regnTim, snoTim, eldFart, varmFran, varmPer och kallMin och fältet vat.  
Ändras i spelet: Ved utan tak blir blöt genast när regnet börjar, och torkar lika fort sommar som vinter och lika fort vid elden som på andra ställen. Vedboden blir lite viktigare; i övrigt svårt att märka.  
Prövningen: Koden är som läsaren säger, men varje tal står beskrivet i designdokumentet som hur världen är. Ägaren väljer: behåll torkningen vid elden och i värmen, eller förenkla till bara tak och tid.

**502. Tatueringarna händer nästan aldrig: kolet finns sällan**  
Var: `src/sim/tatuering.ts:61-73 (tatVal), 75-88 (tatKlar); src/sim/val.ts:892; src/sim/forradsmal.ts:228; src/test/scenarier/iakttagare.ts:50`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Ett märke kräver en bennål och ett kol, och den som tatuerar måste dessutom vinna ett slumpkast varje gång raden prövas. Kol finns bara i en eld som slocknat med aska kvar. Förrådsmålet ber om nålen men inte om kol. Testernas egen lista över arbeten som inte händer i byarna säger att tatueringen sällan blir av för att kolet saknas.  
Förslag: Björn väljer. A: ta bort kolkravet så att bennålen räcker (TATU.kol, de två kontrollerna och takeMaterial). B: behåll kolet men låt den som vill ha ett märke också ge byn ett skäl att hämta kol. C: ta bort tatueringarna helt.  
Ändras i spelet: A och B: vuxna som blivit vuxna, fällt ett stort djur, dödat någon eller mist någon nära får märken i porträttet, vilket de sällan får i dag. C: inga tatueringar finns.  
Prövningen: Koden stämmer med fyndet, men designdokumentet (steg 10.7.5, Porträttens byggsätt: Tatueringar) säger uttryckligen bennål och 1 kol, och systemet är önskat. Björn väljer mellan att släppa kolet, att låta byn hämta kol för märkets skull, eller att låta det vara sällsynt.

**503. Ryktets läge beror på vem som först berättade: ett fält som bara flyttar en grå fläck**  
Var: `src/sim/ort.ts:57, 66, 93, 100-106, 139, 205, 228; src/sim/typer.ts:316; src/sim/skrift.ts:539`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Varje rykte bär fältet fr (den som först berättade), som sätts, ärvs och tas bort på sex ställen. Det används bara i ryktesLage: åt vilket håll det grå området på världskartan är förskjutet. ryktesLage anropas bara från bynsKarta (ritningen) och testerna. Resor och handel frågar aldrig efter läget. Designdokumentet (Platsen i minnet) säger att förskjutningen räknas ur världens frö, platsen och den som först berättade, och scenariot för steg 11.4.5 prövar att två berättare ger olika lägen.  
Förslag: Räkna förskjutningen ur världens frö och platsens nummer, lika för alla. Ta bort fr ur lärdomen och de ställen som sätter det, och skriv om meningen i designdokumentet och scenariot.  
Ändras i spelet: Det grå området för ett rykte ligger på samma ställe oavsett vem ryktet kom ifrån. I dag kan två rykten om samma plats ligga lite olika, men kartan visar bara ett av dem. Ingen märkbar skillnad.  
Prövningen: Stämmer i koden, men designdokumentet säger uttryckligen att läget beror på den som först berättade. Ägaren väljer: behåll det (olika berättare ger olika gissningar, om det ska användas mer senare) eller låt läget vara lika för alla och stryk fältet.

**504. En enklare helhet för valet: tre hårda nivåer och sedan en enda poänglista**  
Var: `src/sim/val.ts:493-497, 553-565, 635-930, 936-1002, 1057-1079, 1173-1221`. Vinst 4 av 5, risk 5 av 5, flera steg, ungefär 120 rader bort.  
I dag: Valet har nio nivåer, tre sorters rader (första som gäller, poäng inom nivån, Förbättras kandidater), arbetarnas tak, brådskan, flera dämpningar för fara och tre väljare för fritiden. Leka (9), framträdande (9) och vakt (6) står mellan nivå 4 och 5 i registret. Designdokumentet säger dock uttryckligen "Nivåerna i fast ordning" med alla nio, och att personen tar den första nivån där det finns något att göra och lediga händer.  
Förslag: Behåll Fara, Nöd och Grundbehov som hårda regler. Allt därefter blir kandidater i ett register med samma form och en poäng: behov gånger lust. Görs i så fall stegvis och avslutas med en Balans-omgång. De mindre fynden ovan (mjärden, kläderna, fritiden som register, fälten på raderna) kan göras utan detta.  
Ändras i spelet: Samma sorts liv i byn, men blandningen av sysslor ändras och balanstalen måste ställas om. Byn blir känsligare för vad som faktiskt saknas och mindre styrd av ordningen i en lista.  
Prövningen: Beskrivningen av koden stämmer, men de nio nivåerna i fast ordning är det designdokumentet säger. Ägaren väljer: behålla nivåerna och rätta de enskilda felen, eller göra om valet efter grundbehoven till en poänglista med en hel Balans-omgång.

**505. Byborna räknar med vad de tror om grannbyns priser, handlaren med de verkliga**  
Var: `src/sim/handel.ts:123, 129-137 (prisIPrat), 595, 612-614 (tro), 666-668, 697 (trodd), 712-714, 758, 831, 857-859, 913-914; src/sim/minne.ts:522-538 (larPris, trorPris); src/test/scenarier/agande.ts:1000-1013, 1635`. Vinst 3 av 5, risk 4 av 5, ett steg, ungefär 45 rader bort.  
I dag: Varje bybo har lärdomar om vad varje slag kostar hos varje grannby. De lärs i småprat, i byten och i affärer som inte blev av. Kunden räknar sitt bud efter det hen tror, handlaren svarar efter det verkliga, och redogörelsen visar båda. Utan lärdom tror man priset 1.  
Förslag: Låt kunden räkna med det verkliga priset. Då försvinner trodd, parametern tro, prisIPrat, lärandet i bytena och lärdomen pris i minne.ts.  
Ändras i spelet: Byborna vet alltid vad handlaren betalar. De bjuder inte längre fel för att de trott fel, priser sprids inte som rykten i samtal, och byn byter handelsvara direkt när ett pris ändras.  
Prövningen: Stämmer i koden, men hela systemet står beskrivet som önskat i designdokumentet (Priser som lärdomar, steg 10.5.15 och 10.5.16) och har egna scenarier. Björn väljer mellan att behålla rykten om priser (som nu) och ungefär 45 rader mindre kod; handelsresorna (steg 11.6.11) bygger också på dessa lärdomar.

**506. Elden väljer själv vem som fyller på och tänder, bredvid valet av aktivitet**  
Var: `src/sim/eld.ts:371-389, 427-452, 463-506; src/sim/eldflytt.ts:98-111; src/sim/steg.ts:433`. Vinst 3 av 5, risk 4 av 5, flera steg, ungefär 40 rader bort.  
I dag: Var tionde sekund räknar stepFire varje vaken persons önskan för varje eld, väljer en fyllare (önskan, pliktkänsla, avstånd, vakt, slump) och en tändare (hantverk, flit, slump), och avbryter det de höll på med. Det är ett eget urval med egna regler ("en i taget vid varje eld", egen lista över vakna och över faror) bredvid valet av aktivitet. Eldflytten väljer på samma sätt en gång i timmen.  
Förslag: Gör "lägg ved på elden" och "tänd elden" till rader i valet av aktivitet, med eldens önskan som poäng. Då kan fyllare, tandare, awake, assign, iNod och urvalet i eldflytten tas bort, och stepFire låter bara elden brinna och räknar önskan.  
Ändras i spelet: Ingen rycks längre ur sitt arbete av elden. Den som väljer ny uppgift tar elden när den väger tyngst. Elden kan slockna oftare eller fyllas på senare, och kylan kan slå hårdare. Balansen behöver ses över och facit blir nytt.  
Prövningen: Stämmer i koden och går i samma riktning som principen System, inte regler, men det byter hur byn sköter sin viktigaste värmekälla. Ägaren väljer mellan dagens sätt (elden rycker den lämpligaste ur arbetet, så att den sällan slocknar) och att elden blir ett vanligt arbete i valet av aktivitet, med ny balans.

**507. Kunskaperna är ett andra system bredvid teknikerna för sex saker man kan**  
Var: `src/sim/kunskap.ts:1-23; src/sim/minne.ts:390-401, 457-461; användare: fynd.ts:704-733, jakt.ts:199-241, bin.ts:185-214, sjukdom.ts:170-198, odling.ts:515, 745, halsa.ts:557, 649, forlossning.ts:37, byggnader.ts:394`. Vinst 3 av 5, risk 4 av 5, ett steg, ungefär 35 rader bort.  
I dag: Kunskap (svamp, motvind, rena händer, fukt, vinterhonung, smitta) har ett eget register, ett eget fält på personen, egen spridning i samtal, egen glömska och egen loggtext, bredvid teknikerna. Fem av de sex används bara som ja eller nej; svampen och motvinden byggs upp gradvis.  
Förslag: Gör de sex till rader i TEKNIK på nivå 1 med ett eget tillfälle, så att spridningen, visningen och förlusten går genom teknikernas kod.  
Ändras i spelet: Ja: kunskaperna glöms inte längre när de inte används, de sprids som tekniker i samtal, och svampkännedomen blir kan eller kan inte i stället för en glidande säkerhet.  
Prövningen: Koden är som läsaren säger, men designdokumentet beskriver Kunskap som ett eget slag av vetande: "Glöms bara långsamt, och bara om den inte används", och motvinden "är en kunskap ... och glöms långsamt om den inte används". Björn väljer mellan att behålla glömskan och den glidande säkerheten, eller slå ihop med teknikerna och förlora dem.

**508. Åtta utvägar för ett sällsynt fall: en resenär som går långsamt**  
Var: `src/sim/resa.ts:1479-1591; src/test/scenarier/fas11.ts:2120-2172`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 50 rader bort.  
I dag: Registret UTVAGAR har åtta val på drygt 110 rader. Det används bara när någon går under farten 0,7, i praktiken vid skadade ben (gamla har 0,75 och barn reser inte). Vagnen kan inte väljas i dag och det som släpps hämtas inte.  
Förslag: Antingen behålla alla åtta, eller skära ner till tre (rida eller bäras, rasta, vända hem).  
Ändras i spelet: Ja, om det skärs ner: ingen lämnas kvar ensam, ingen packning släpps och sällskapet fortsätter aldrig i den långsammas takt.  
Prövningen: Alla åtta utvägarna står uppräknade i avsnittet Farten i tal, steg 11.5.17 är byggt med scenario, och stegen 12.1.9 och 12.1.10 ska göra vagnen och gömman färdiga. Ägaren väljer: behålla registret som det är beskrivet, eller förenkla och då också ändra dokumentet och de två stegen.

**509. Att luras i byten**  
Var: `src/sim/behov.ts:694-733, 813, 820; src/sim/byte.ts:151; src/sim/handel.ts:687; src/sim/gastrel.ts`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 45 rader bort.  
I dag: lura, lurad och luraI låter den som är mycket skickligare i Handel ibland lura den andra i ett byte: ta mer betalt eller betala mindre. Den lurade märker det ibland, blir sur och tycker sämre om den som lurade. Handlaren minns också det (kroken vidLura, gästernas relationer). Egna balanstal i HANDLA.  
Förslag: Björn väljer: behålla systemet som designdokumentet beskriver det, eller ta bort det med talen, kroken och handlarens minne av att ha lurat eller blivit lurad, och stryka meningen i avsnittet om förhandling.  
Ändras i spelet: Ja, om det tas bort: ingen luras längre i byten, och tankarna, de sämre relationerna och raderna i loggen som följde av det försvinner.  
Prövningen: Koden är som läsaren säger, men designdokumentet (Förhandling, fliken Människan) säger: 'En skicklig handlare kan lura en ovan, och den som blivit lurad minns det.' Valet står mellan ett önskat litet system och ungefär 45 rader mindre.

**510. Affären med handlaren har faser där kunden går och hämtar budet och bär hem det köpta**  
Var: `src/sim/handel.ts:240-247 (Affar: hamta, framme, hem), 577, 786-811 (hamtaVid, nastaBud), 813-823 (affarSteg), 926-933 (handlaKlar)`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 35 rader bort.  
I dag: En affär går i fem faser: fråga, hämta, bud, plocka och hem. I hämta går kunden till varje hög där det hen bjuder ligger, och i hem går hen till förrådet med det köpta. Inget av det flyttar några saker: bytet görs i ett svep när handlaren säger ja. Faserna finns för att det ska synas, och kön väntar under tiden.  
Förslag: Behåll fråga, bud och plocka. Ta bort hämta och hem med hamtaVid, nastaBud och fälten hamta, framme och hem; budet ligger på kundens filt direkt när hen bjuder.  
Ändras i spelet: Kunden står kvar vid filten under hela affären i stället för att gå till förrådet och hämta det hen bjuder och sedan bära hem det köpta. Varje affär går fortare, så fler i kön hinner handla samma kväll.  
Prövningen: Stämmer i koden, men det är byggt så med avsikt (steg 4.5.7.4), och designdokumentet säger att den som handlar bär fram det som förhandlas om och att båda plockar ihop sina saker efter bytet. Björn väljer mellan att se kunden gå och hämta och bära hem (som nu) och kortare kod och snabbare kö.

**511. Valet av material till ett plagg väger sju poäng med elva balanstal**  
Var: `src/sim/klader.ts:176-196, src/sim/redskap.ts:239-253`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 30 rader bort.  
I dag: När någon ska sy ett plagg räknas en summa per material av kylan, hotet, det som saknas, det som finns gott om, det dyra, finheten och värdet, med elva balanstal. materialVal i redskap.ts gör ingen egen vägning: den samlar läget i byn och anropar valMaterial. Designdokumentet (Människan: Plagg och material, Valet av material) beskriver just de sex punkterna, och steg 10.2.38 (v526) byggde om dem till en summa efter en tidigare genomgång.  
Förslag: Två saker i stället: det varmaste materialet när det är kallt, annars det som det finns mest av. Högst tre balanstal.  
Ändras i spelet: Hot från vargar, hushållningen med dyrt och knappt material och anseendet påverkar inte längre vilket material ett plagg sys av.  
Prövningen: Koden stämmer, men valet står beskrivet punkt för punkt i designdokumentet och byggdes nyligen på Björns begäran (10.2.38). Björn väljer: behålla de sex punkterna, eller stryka dem ur dokumentet och ha bara kyla och tillgång.

**512. Rädslan för handlingar ligger i lagfilen men har inget med lagar att göra**  
Var: `src/sim/lagar.ts:37-44, 202-256, 261; src/sim/val.ts:976; src/sim/sport.ts:233`. Vinst 2 av 5, risk 3 av 5, flera steg, ungefär 25 rader bort.  
I dag: Ett eget litet system på ungefär 50 rader och tio balanstal för fyra handlingar (björnjakt, vargjakt, bad, spel) ligger i lagar.ts och körs från stepStyre. Det låg där för att rädslorna förr kunde bli tabun för hela byn; tabuna togs bort i steg 10.2.41. Rädslan sprids en gång per dygn mellan goda vänner med egen kod, inte i samtalen.  
Förslag: Minst: flytta till en egen fil med egen rad i TAKTER (se fyndet om byar utan ledare) och låt balanstalen få ett eget block. Mer: låt rädslan vara ett vanligt minne som sprids i samtalen och läses av valet av aktivitet.  
Ändras i spelet: Nej vid flytt, men balanstalen byter namn i npm run talen. Ja om det byggs om på minnena: rädslan sprids då som andra minnen.  
Prövningen: Stämmer i koden. Flytten till en egen fil är ofarlig och kan göras ihop med rättningen för byar utan ledare. Att bygga om rädslan på minnena ändrar hur den sprids, och designdokumentet säger att rädslorna ska spridas i samtalen: Björn väljer om det ska byggas om så.

**513. Brottningen går genom hela stridssystemet på kartan**  
Var: `src/sim/sport.ts:34-35, 58, 83, 95-98, 300-310; src/sim/strid.ts; src/sim/kartstrid.ts; src/sim/efterstrid.ts`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 25 rader bort.  
I dag: Varje kamp i brottningen startar en riktig strid på kartan (kartStridBorja med avsikten brottning), med en egen efterkrok, fälten brott och brottare på matchen, ett eget tyst-läge, svaga slag, ett undantag för att ingen dör och en koppling till budet om ingen strid.  
Förslag: Gör brottningen till en vanlig sport som de andra fem: färdighet plus slump avgör, och gränssnittet ritar ringen.  
Ändras i spelet: Ja: brottningsmatcher visas inte längre som riktiga kamper slag för slag, ingen får blåmärken eller skador av dem, och de står inte i stridsloggen.  
Prövningen: Koden är som läsaren säger, men Björn har bett om just detta: steg 9.2.92 säger att brottningen sker två och två "med samma system och animation som striden", och steg 10.1.7 flyttade den till striden på kartan. Björn väljer mellan den riktiga kampen och en enkel sport som de andra.

**514. Vådaskott och att vänta på fritt läge**  
Var: `src/sim/strid.ts:134-136, 579, 586, 593-597, 736-744; src/sim/kartstrid.ts:278-279`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 20 rader bort.  
I dag: En skytt vars mål står i närstrid med en vän väntar eller byter mål om hen är skicklig och lugn nog, annars chansar hen, och en miss kan träffa vännen. Efteråt dras vådaträffarna bort ur räkningen av kastträffar. Ca 20 rader och tre balanstal. Det stämmer med koden.  
Förslag: Ta bort vådaträffen och väntan: en miss är en miss.  
Ändras i spelet: Ingen träffar längre en vän av misstag, och ingen står och väntar med kastet. Skyttar blir något effektivare i gruppstrider.  
Prövningen: Vådaskott på den egna sidan står som byggt och önskat i designdokumentet (Avstånd, v149). Det är en del av hur striden fungerar, så Björn får välja mellan 20 rader mindre kod och risken att träffa en vän.

**515. Sittplatsen vid elden räknar vänner, ovänner och trängsel i upp till 27 försök**  
Var: `src/sim/val.ts:246-256, 260-266, 321-329; talen 200-203`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 18 rader bort.  
I dag: Den som sätter sig vid elden får med en chans en plats bredvid sin bästa vän, inte nära en ovän (de första åtta försöken), minst en ruta från alla andra (24 försök), i en ring som vidgas, och efter 27 försök en nödplats.  
Förslag: Läsaren ville ha en ledig plats i ringen med få försök, utan vänner och ovänner. Eller behålla det som det är.  
Ändras i spelet: Bästa vänner skulle inte längre sätta sig bredvid varandra och ovänner inte isär. Utan avståndet står folk på varandra vid elden igen.  
Prövningen: Designdokumentet (Människan, Bästa vän) säger att bästa vänner 'arbetar och sitter helst bredvid varandra', och avståndet vid elden är steg 3.6.8. Björn får välja: behålla (mitt råd, det syns i spelet och står i dokumentet) eller förenkla och spara 18 rader.

**516. Två vattensystem för grödorna: fältets vatten och rutans fukt**  
Var: `src/sim/odling.ts:127,557,590-594,725-737; src/sim/torka.ts:27-29; src/sim/torst.ts:225,284-290; src/sim/resa.ts:1005`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 12 rader bort.  
I dag: Varje ruta har en fukt som regn, vattning och värme ändrar och som styr hur fort grödan växer. Dessutom har hela fältet ett tal vatten som bara finns under torkan: det sjunker till noll på 24 timmar och dödar då hela fältet på en gång. Vattensäcken fyller på talet. Resan läser det också, för att räkna vad ägaren förlorar om hen reser bort.  
Förslag: Låt torkan verka bara genom rutornas fukt: en ruta som stått torr länge dör, ruta för ruta. Fältets vatten och talet TORKA.falt försvinner, och vattningen under torkan blir samma som den vanliga vattningen.  
Ändras i spelet: En torka dödar inte längre hela fältet i ett slag. Rutorna som ingen hinner vattna vissnar en efter en, och den som vattnar räddar just de rutorna.  
Prövningen: Stämmer i koden, men designdokumentet (Världen, Torka) säger att en gröda klarar sig 24 timmar utan vatten och sedan vissnar, och att en säck räcker till 10 rutor. Björn väljer: behålla torkans egen regel som den står, eller låta torkan gå genom rutornas fukt och skriva om stycket.

**517. Den som står i elden skadas på två sätt som gör nästan samma sak**  
Var: `src/sim/brand.ts:113-121 (talen), 547-558 (i elden), 561-569 (smittan), 591-611 (brinner)`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 10 rader bort.  
I dag: En person på en brinnande ruta får dels brännskador direkt (talen iElden, iEldenGrad, tarEld), dels tar hen eld nästan säkert (smitta, steg 9.2.134) och skadas då av att brinna. Den direkta skadan är svårare (grad 0,2–0,7) än den av att brinna (0,1–0,4), och bara den räknas i brandens slutrad (antal som brändes) och ger upplevelsen eldsvådan. Talen för att ta eld bredvid en vägg (0,3) och bredvid mark som brinner (0,15) är olika med flit: kommentaren och steg 9.2.134 säger att marken ska ha lägre chans.  
Förslag: Behåll en väg: den som står i elden tar eld, och det är att brinna som skadar. Ta bort den första slingan och talen iElden, iEldenGrad och tarEld. Räkningen av brända och upplevelsen flyttas då till den som brinner. Att slå ihop vaggEld och bredvidEld bör inte göras: skillnaden är beskriven.  
Ändras i spelet: Ja. Den som står i elden får färre och lindrigare brännskador (ungefär 6 i timmen med grad 0,1–0,4 i stället för cirka 9 med delvis svårare grad), så färre dör i bränder.  
Prövningen: Dubbleringen finns, men den direkta skadan är svårare än den av att brinna, så spelet ändras. Björn väljer: behålla båda (elden bränner direkt och man tar dessutom eld) eller bara att man tar eld och bränns av det, med mildare bränder som följd.

**518. Yrkestaggarna har sju balanstal för att inte fladdra**  
Var: `src/sim/seder.ts:48-56, 209-249; src/sim/relationer.ts:159; src/sim/styre.ts:133, 409-413`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 10 rader bort.  
I dag: updateTags ger varje vuxen en yrkestagg varje timme, med sju balanstal för när taggen fås och behålls. Kommentaren säger att taggen bara är ett namn, men rivaliteten (samma tagg), titeln Storjägare och Mäster-titeln läser den. YRKE_AV räknar upp handlingar för de snävare yrkena bredvid fältet yrke på handlingarna, eftersom en handling kan höra till både ett brett och ett snävt yrke.  
Förslag: Taggen blir det arbete man lagt störst del av sin tid på över ett minsta antal timmar, med en enda faktor för att behålla den, räknat en gång per dygn.  
Ändras i spelet: Ja, lite: några får en annan yrkestitel eller byter vid en annan tidpunkt, och rivaler och Storjägare kan bli andra.  
Prövningen: Stämmer i koden, men yrkestaggarna står som byggda i designdokumentet och styr rivalitet och titlar. Björn väljer mellan dagens regel (taggen går till den som gör något klart mer än andra i byn, och blir svårare ju fler som har den) och en enklare (det man gör mest), som ger fler med samma yrke.

**519. Byarna i världen tappar och smittas av tekniker och en andra tro**  
Var: `src/sim/rad.ts:65-69, 172-183 (sprid och tappa), 72-75 och 200-217 (radTro med annan); src/sim/byflytt.ts:56, 100-102 (splittringen läser den andra tron); src/sim/radtal.ts:47`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 10 rader bort.  
I dag: En by i världen kommer på tekniker med en chans per dygn (ett år i spelet). En teknik kan också spridas från en vänlig granne och tappas i en by under tolv personer, och byn kan ha en andra tro som växer, krymper och byter plats med den första. Allt detta är byggda steg i Färdplanen (11.3.9 och 11.3.11, v531) och står i avsnittet Radens regler. Läsaren missade att den andra tron också används av splittringen (steg 11.3.12, byflytt.ts:101): andelen med en annan tro höjer chansen att en grupp bryter upp och grundar en ny by, som får den andra tron.  
Förslag: Björn avgör, och då bara om teknikerna: tappandet och spridningen av tekniker kan tas bort (fyra balanstal och omkring tio rader), efter en mätning med npm run radregler som visar hur ofta de slår till. Den andra tron ska vara kvar, annars slutar splittringen att fungera.  
Ändras i spelet: Ja, lite: grannbyarna lär sig tekniker i sin egen takt och tappar dem aldrig. Tas den andra tron bort försvinner också splittringen av byar efter tro, och det är en större ändring.  
Prövningen: Koden finns som fyndet säger, men designdokumentet beskriver spridning, tappade tekniker och den andra tron som önskade, och den andra tron behövs för splittringen. Björn väljer mellan att behålla reglerna som de står i Radens regler, eller att stryka spridningen och tappandet av tekniker ur både dokumentet och koden.

**520. Gästernas påhittade livshistoria är ett eget system bredvid den riktiga personen**  
Var: `src/sim/gastliv.ts:1-144; src/sim/gastrel.ts:35-38, 59-61; src/sim/gast.ts:128-138; src/sim/vacktliv.ts:50`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 6 rader bort.  
I dag: Gästen är en riktig person med egna egenskaper (nyGast i gast.ts). Ändå räknar gastrel.ts fram egna värden för nyfikenhet, flit, empati och mod ur ett annat frö (gastStat), och de avgör vem handlaren tycker om. Fältet humor i livshistorien läses inte av någon. Själva livshistorien är önskad: designdokumentet beskriver den (steg 4.5.7.7) och den väckta byns invånare bygger på samma kod.  
Förslag: Ta bort fältet humor ur livshistorien. Om Björn vill: låt gillar läsa handlarens riktiga egenskaper i stället för gastStat. Livshistorien med familj och händelser behålls.  
Ändras i spelet: Att ta bort humor märks inte. Byter man gastStat mot de riktiga egenskaperna ändras en gång vilka bybor varje handlare tycker om, och därmed vad hen kräver i byten.  
Prövningen: Livshistorien står som önskad i designdokumentet och ska vara kvar. Björn väljer om handlarens tycke ska följa egenskaperna i personrutan (ändrar handeln en gång) eller vara som nu; fältet humor kan tas bort utan fråga.

**521. Byggets vikt har åtta balanstal men styr bara hur 'akut' dagen känns**  
Var: `src/sim/val.ts:125-126, 1062-1076 (burg, u, works), 829 (barnens hjälp), 884 (raden bygga), 1374-1385 (fritidens vikter); src/sim/forradsmal.ts:68 (byggMat-talen)`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 6 rader bort.  
I dag: dag() räknar en vikt för bygget ur byggLaga, byggHalvt, byggNytt, byggUtan, ARSTID.byggKall och tre trösklar för maten. Vikten går bara in i u (hur akut byn behöver arbete). u styr chansen att arbeta: högst 12 procentenheter för den flitige, men upp till 40 procentenheter för den late. u styr också hur gärna barnen hjälper till och några vikter på fritiden. Om någon faktiskt bygger avgörs av raden bygga: nivå 7 efter försörjningen, taket per hus och byggDampning.  
Förslag: Välj ett av två. Enklast: ta bort viktformeln och de åtta talen och låt u komma ur maten och veden. Eller: gör bygget till en poängrad bland maten och veden med just den vikten, så att hemlösa, hunger och årstid vägs på riktigt.  
Ändras i spelet: Enklaste vägen: de lata och barnen arbetar mindre de dagar då bara ett bygge väntar, så husen kan bli klara senare. Det är mer än läsaren säger. Andra vägen: husen byggs också medan förråden fylls, mer ju fler som saknar tak.  
Prövningen: Stämmer i koden, men skillnaden är större för de lata än läsaren skriver. Ägaren väljer: ta bort vikten (enklare, något långsammare byggen) eller låta bygget tävla med maten och veden på riktigt.

**522. Två system hugger av kroppsdelar vid samma träff**  
Var: `src/sim/strid.ts:68-70, 628, 638-639; src/sim/kartstrid.ts:163-166; src/sim/halsa.ts:118-119, 411, 442`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 5 rader bort.  
I dag: Striden har olyckshugget (steg 9.5.22): chans ur vapnets skärpa, slagets kraft i kvadrat och skyddet. När såret sedan sätts på personen slår hälsans äldre regel till på samma sår: ett skärsår eller bett av minst grad 0,9 på en yttre del tar delen med 15 % chans (steg 8.2.3). Efter det tar kartstrid delen en gång till om striden sa 'av' (då händer inget om den redan är borta). En träff kan alltså ge 'höggs av' genom två olika räkningar, och striden vet inte om hälsans: kämpen står kvar fast handen är borta.  
Förslag: Behåll en: låt striden (som känner vapnet och skyddet) avgöra i strid och hälsans regel bara gälla utanför strid (olyckor, djurbett utanför strid). Eller ta bort olyckshuggets egen räkning och ge hälsans regel skärpan som faktor.  
Ändras i spelet: Något färre avhuggna händer och fötter i strid. Dödande hugg mot huvud och bål påverkas bara om olyckshugget tas bort.  
Prövningen: Koden stämmer. Designdokumentet beskriver olyckshugget som det som avgör i strid, men säger inget om att den äldre regeln ska sluta gälla där. Björn får välja vilken av de två räkningarna som ska gälla i strid; båda valen ger färre avhuggna delar.

**523. Två olika tal för hur mycket en person äter per dygn**  
Var: `src/sim/ekonomi.ts:15, 43-48; src/sim/behov.ts:149-151; src/sim/odling.ts:247; src/test/scenarier/agande.ts:224-233`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 1 rader bort.  
I dag: EKONOMI.matPerDygn är ett fast tal, 1,6 portioner. Det används för hur mycket mat man behåller när man ger bort eller byter mat, och för hur stort fält en familj vill ha. Samtidigt räknar kroppensMat fram vad kroppen verkligen äter: 24 / 22 / 0,55 = ungefär 2,0 portioner för en vuxen, mindre för ett barn. Förrådsmålen och budgeten använder det framräknade. Ändras hungern följer det fasta talet inte med.  
Förslag: Ta bort det fasta talet och låt de två ställena fråga kroppensMat (för personen respektive familjen). Ett scenario (agande) läser talet och måste ändras.  
Ändras i spelet: Vuxna behåller ungefär två portioner i stället för 1,6 innan de ger bort eller byter bort mat, och barn lite mindre än i dag. Familjens fält blir ungefär en fjärdedel större för vuxna.  
Prövningen: Stämmer: det finns två tal för samma sak och de skiljer sig med en fjärdedel. Men ändringen flyttar balansen (mindre gåvor och byten av mat, större fält), och balans görs bara i fasens Balans. Björn väljer: låta talen vara, eller slå ihop dem i nästa Balans.

**524. Fyra sätt att sprida ut rövargänget**  
Var: `src/sim/rovare.ts:69-72, 185, 205-208, 242-245, 490, 519-531`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: För att gänget inte ska gå i en klump har varje rövare en egen punkt kring målet, en egen fil vid sidan av vägen, en egen fart, en kontroll att ingen annan står i målrutan och en egen viloplats. Det stämmer med koden.  
Förslag: Behåll den egna punkten och den egna farten; ta bort filerna vid sidan av vägen och kontrollen av upptagen ruta.  
Ändras i spelet: Rövarna går mer på led på samma stig mot byn i stället för bredvid varandra. Inget i utgången ändras.  
Prövningen: Steg 10.2.25 i Färdplanen säger uttryckligen att var och en går bredvid de andra och att ingen går i en ruta där en annan redan går, med ett scenario som prövar det. Förslaget tar bort just det, så Björn måste välja; vinsten är bara tio rader.

**525. Regeln 'mindre mat åt sängliggande' i hårda byar**  
Var: `src/sim/halsa.ts:708-722; src/sim/behov.ts:154-155`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: mindreMat gör att en vuxen som ligger sjuk eller inte kan gå äter först när hen är hungrigare, när byn har hårda seder (Arbete eller Självförsörjning) och maten räcker under tre dygn (tre år i spelet, tre dagar i verkligheten). Det är steg 9.5.30, med tre balanstal (hard, knapp, snal) och en krok i ätandet.  
Förslag: Björn väljer: behålla regeln som den står i designdokumentet, eller ta bort mindreMat och de tre talen och stryka meningen i avsnittet Rätt till vård.  
Ändras i spelet: Ja, lite, om den tas bort: i hårda byar med matbrist äter de sängliggande som alla andra. Märks sällan.  
Prövningen: Koden är som läsaren säger, men designdokumentet (Rätt till vård, steg 9.5.9) säger uttryckligen: 'När maten är knapp kan en hård by ge mindre till den som inte kan arbeta.' Valet står mellan att behålla en önskad men smal regel och att spara ungefär tio rader.

**526. En stor räd stannar ikappräkningen**  
Var: `src/sim/rader.ts:41, 211-213 (storStrid, storRad, storStridNu); src/ui/spara.ts:188, 192; src/main.ts:238; src/test/ikapp.ts:25; src/test/scenarier/kultur.ts:2745`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: När en räd med minst fyra anfallare slåss stannar ikappräkningen, och spelet går i levande takt tills striden är slut, så att spelaren ska kunna se den. Det är ett byggt steg (8.8.9, v510) och står i designdokumentet under "Stora strider läggs på kö": en stor strid ska man inte missa. Byn utvecklas likadant med och utan undantaget; det ändrar bara vad spelaren får se, och det är en egen väg på tre ställen i uppstarten och ikappräkningen.  
Förslag: Björn avgör. Ta bort undantaget och låt en stor strid räknas ikapp som allt annat; den som varit borta läser om den i sammanfattningen och krönikan. Avsnittet i designdokumentet och steget skrivs då om.  
Ändras i spelet: Byn utvecklas likadant. Den som öppnar spelet mitt i en stor räd får den räknad färdigt direkt i stället för att se resten av den spelas upp.  
Prövningen: Koden är som fyndet säger, men undantaget är uttryckligen önskat i designdokumentet. Björn väljer mellan att fortsätta få se stora räder spelas upp, eller att slippa undantaget och läsa om räden efteråt.

**527. Fjäsket är nästan samma sak som det vänliga beskedet**  
Var: `src/sim/byhandling.ts:42-43, 89-93, 99, 116, 282`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 8 rader bort.  
I dag: Fjäsk, gåva, vänligt besked och muta höjer relationen med nästan samma formel. Fjäsket och beskedet bygger båda på ledarens karisma mot samma mål (30). Skillnaden är att fjäsket verkar genast och utan att någon reser, medan beskedet går med ett bud som tar tid, trampar leden och till huvudbyn kommer som en gäst. Fjäsket gäller också huvudbyn.  
Förslag: Antingen ta bort fjäsket och låta beskedet göra jobbet, eller behålla båda och bara skriva den gemensamma formeln en gång.  
Ändras i spelet: Ja, lite, om fjäsket tas bort: grannbyarna skickar fler bud i stället, och relationerna rör sig långsammare eftersom budet tar tid. Att bara samla formeln ändrar inget.  
Prövningen: Fjäsket är byggt i steg 11.6.15 och står som egen rad i avsnittet om relationen mellan byar, så det är inte en ren dubblett. Ägaren väljer: ta bort fjäsket, eller behålla det och bara samla formeln (det senare ändrar inte spelet och kan göras direkt).

**528. Tornadons tre storlekar är två tredjedelar av animationsfilen**  
Var: `src/animbilder.ts:6 (tornado, tornado_liten, tornado_stor: 24 bilder, ungefär 101 KB av filens 152 KB); src/ui/animation.ts:23-25; designdokumentet, fliken Världen (Tornado: Storleken och Bilden)`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Tornadon finns färdigritad i tre storlekar med åtta bilder var. Allt annat i filen är tillsammans hälften så stort. Designdokumentet säger att storleken ska synas på bilden och att bilden ritas så stor som kärnan, så de tre storlekarna är önskade. Nio av brandrökens bilder är exakta kopior av varandra (ungefär 6 KB).  
Förslag: En storlek för alla tornador tar bort ungefär 70 KB, men då syns inte storleken längre. Ett annat sätt är att rita tornadon med kod i spelet, som i bildstilen, men det är mer arbete än det sparar. Kopiorna av brandröken kan skriptet peka om till samma bild.  
Ändras i spelet: Med en storlek ser en liten och en stor tornado likadana ut på kartan. Banan och skadan ändras inte.  
Prövningen: Siffrorna stämmer, men designdokumentet säger att tornadons storlek ska synas på bilden. Björn väljer mellan att behålla tre storlekar (70 KB av en spelfil på flera MB) eller att visa alla tornador lika stora; jag skulle behålla dem.

**529. Översikten upprepar det som redan står i personrutans huvud**  
Var: `src/ui/flikar/person.ts:33-44, 179-182, 198-200`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Huvudet överst visar alltid ålder, yrke, partner och det hen gör just nu, med skälet vid ett tryck. Fliken Översikt direkt under visar ålder, yrke, "Gör nu" med samma rad och samma skäl en gång till, och partnern igen under familjen.  
Förslag: Låt Översikt bara ha det som inte står i huvudet, eller behåll den som den är.  
Ändras i spelet: Om det tas bort: yrket och det personen gör just nu står bara i huvudet överst, inte en gång till strax under.  
Prövningen: Upprepningen finns, men den är beställd: designdokumentet (Tydligare gränssnitt: personrutan) säger att Översikt visar "det hen gör och varför", och att huvudet har ålder, yrke och det hen gör. Björn väljer om Översikt ska behålla raderna Yrke och Gör nu eller om de bara ska stå i huvudet.

**530. Platshållaren RESA.faraDygn står kvar fast vägens händelser finns**  
Var: `src/sim/resa.ts:105, 972, 1038`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Ledens fara är ett fast tal per dygn (0,04) med kommentaren 'tills vägens händelser finns, steg 11.5.14'. Vägens händelser finns nu, men talet styr fortfarande hur försiktiga väljer resor och hur starkt sällskapet måste vara.  
Förslag: Antingen räkna faran ur vägens verkliga risker (rån, rovdjur, olyckor på just den leden), eller låta talet stå och bara rätta kommentaren.  
Ändras i spelet: Ja, om faran räknas ur vägens händelser: farliga leder lockar färre och kräver större sällskap, lugna leder tvärtom. Att bara rätta kommentaren ändrar inget.  
Prövningen: Stämmer i koden. Dokumentet säger bara 'ledens fara' och inte hur den räknas. Ägaren väljer: en fara som följer den verkliga leden (ändrar vilka som reser och bör prövas i fasens Balans), eller det fasta talet med en rättad kommentar.

**531. Kaninerna har ett eget, äldre och tyngre system än de andra vilda djuren**  
Var: `src/sim/djur.ts:56-226; src/sim/fynd.ts:365-395; src/sim/jakt.ts:122-144`. Vinst 3 av 5, risk 5 av 5, flera steg, ungefär 130 rader bort.  
I dag: Kaningrupperna väljer plats efter viltkartan, undviker byn (steg 6.6.8), krymper där man jagat, söker sig mot vattnet i torkan (steg 3.8.2) och jägaren letar efter kartan (steg 3.10.3). Rådjur, vildsvin och fåglar har en enklare modell: en slumpad plats på rätt mark.  
Förslag: Gör kaninerna till en rad i FLOCKARTER och ta bort det särskilda systemet, om Björn vill det.  
Ändras i spelet: Ja, mycket: kaninerna skulle inte längre följa viltkartan, inte tunnas ut där man jagat och inte dra mot vattnet i torkan. Jakten på kanin är byns första kött och blir en annan.  
Prövningen: Koden stämmer, men kaninsystemet är byggt med avsikt i flera steg (3.8.2, 3.10.3, 4.5.4.1, 6.6.8) och bär viltkartan som jägarna och fällorna använder. Björn väljer: behålla kaninerna som de är (inget görs), eller förenkla dem till de andra djurens modell och balansera jakten på nytt.

**532. Begravningen har många register**  
Var: `src/sim/grav.ts:40-165, 325-390, 450-460`. Vinst 2 av 5, risk 4 av 5, flera steg, ungefär 60 rader bort.  
I dag: Sju öden för kroppen (varav fyra skändningar), sex slags gravplatser med en kostnadssökning, åtta gravvårdar och sju former av begravning. Filen är 573 rader.  
Förslag: Färre gravplatser och färre skändningar, så att sokPlats och en del av valet kan tas bort.  
Ändras i spelet: Ja: gravarna hamnar på färre slags platser, och fiender skändas på färre sätt. Två tror i samma by begraver mer lika.  
Prövningen: Allt står beskrivet rad för rad i designdokumentet (Gravar och begravningar, stegen 10.4.2–10.4.13), med just de sex platserna och fyra skändningarna. Björn väljer om mångfalden är värd koden; inget är fel i den.

**533. Smaken för arbeten ger högst 15 procent och har egen kod**  
Var: `src/sim/rykten.ts:595-619, 644-649; src/sim/val.ts:1148`. Vinst 1 av 5, risk 3 av 5, ett steg, ungefär 15 rader bort.  
I dag: Förutom smaken för mat har varje människa en smak för arbeten, som växer lite varje timme hen arbetar glad eller ledsen, och hos barn nära en förälder som arbetar. Den ändrar lusten i valet av aktivitet lite.  
Förslag: Ta bort smaken för arbeten och behåll matsmaken.  
Ändras i spelet: Ja, lite: människor får inte längre favoritarbeten utöver det personligheten och vanan ger, och barn ärver inte förälderns tycke för ett arbete.  
Prövningen: Designdokumentet säger att smak och avsmak för mat och arbeten växer ur det man varit med om (steg 3.3.5, byggt). Björn väljer om favoritarbeten ska finnas kvar; koden är liten och fungerar.

### Korta (2)

**534. Mallarna är 70 % av filen: minst åtta varianter av varje text**  
Var: `src/sim/berattelser.ts:122-2100 (mallarna); samtalsämnena p_* och relationerna r_*`. Vinst 3 av 5, risk 2 av 5, ett steg, ungefär 550 rader bort.  
I dag: Registret med berättelsernas mallar kräver minst åtta varianter per mall (kommentaren på rad 122). Texten "… pratade om {om}." finns på 13 rader. Mallarna är större delen av filen.  
Förslag: Sänka kravet till fem varianter och stryka de svagaste, och slå ihop samtalsämnen som bara skiljer sig i ämnet till en gemensam mall.  
Ändras i spelet: Texterna upprepas oftare. Byns utveckling ändras inte, men vilka texter som väljs blir andra.  
Prövningen: Designdokumentet (Människan, Registret för berättelserna) säger att varje mall ska ha minst 8–10 varianter så att samma text sällan kommer tillbaka. Björn väljer: behålla det, eller sänka kravet och få en kortare fil men fler upprepningar. Att slå ihop ordagrant lika rader mellan samtalsämnena kan göras utan att kravet sänks.

**535. Listan med stackar finns på tre ställen, och kistan visar skicket på ett annat sätt**  
Var: `src/ui/flikar/lager.ts:21, 30, 41, 47; src/ui/flikar/station.ts:97-100`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 4 rader bort.  
I dag: Lagret, högen och stationens förvaring bygger nästan samma lista (symbol, antal, kvalitet, skick). Lagret och stationen sorterar på kvalitet, namn, antal och skick; högen bara på kvalitet och namn. Lagret och högen visar skicket som en liten cirkel, stationen som stapel med procent. Kommentaren i station.ts säger att listan ska vara som i ett lager.  
Förslag: En funktion stackLista(högar) i hjalp.ts som sorterar och ritar raderna på alla tre ställen. Då måste skicket visas på ett sätt.  
Ändras i spelet: Skicket på sakerna i en förvaringsmöbel eller kista visas som den lilla cirkeln i stället för stapel och procent, och högen sorteras också på antal och skick. Annars ingen skillnad.  
Prövningen: Koden stämmer, utom att högen sorterar kortare än de andra två. Kodvinsten är liten och ändringen syns i rutan, så Björn väljer: cirkel överallt (som lagret, steg 6.9.6) eller stapel med procent kvar i stationens förvaring.

### Buggar (7)

**536. Lönen betalas aldrig i mat när budgeten har en matdel**  
Var: `src/sim/lon.ts:90-97; src/sim/budget.ts:191-203 (matDygn), 149 (KVAR); src/sim/steg.ts:484`. Vinst 3 av 5, risk 2 av 5, liten ändring, ungefär 10 rader bort.  
I dag: Lönen ska betalas i silver och resten i mat som byn har över bufferten. Budgeten körs precis före lönen (samma rad i steg.ts). Finns en matdel i budgeten, också med vikten noll, flyttar matDygn all byns mat i förrådet till en matdel eller till ägaren KVAR. Då har byn ingen egen mat kvar när lönen räknas, och det som inte betalas i silver stryks och ger missnöje. I byar utan matdel fungerar lönen i mat.  
Förslag: Två vägar. A: låt lönen ta av det som ligger hos KVAR (maten ingen matdel fick), så att lönen i mat fungerar också med en matdel. B: ta bort lönen i mat helt (rad 90-97 och importerna som blir över), så att lönen bara är silver.  
Ändras i spelet: A: i byar med en matdel får den som arbetar för byn mat när silvret inte räcker, och missnöjet över obetald lön blir mindre. B: i byar utan matdel får ingen längre mat i stället för silver.  
Prövningen: Felet finns i koden. Men designdokumentet (Lönen, steg 10.5.9) säger att lönen i andra hand betalas i hela saker som byn har över bufferten, så att ta bort det går emot dokumentet. Björn väljer: laga så att lönen kan tas ur maten som blev över (A), eller ändra dokumentet och ha lön bara i silver (B).

**537. Bufferten för mat och ved räknas på tre olika sätt**  
Var: `src/sim/val.ts:512 (onskatDygn utan påbud), 516 (fler händer av påbudet vinter), 854, 860 (raderna), 1078, 1180-1195 (med påbud och varsel); src/sim/forradsmal.ts:110-123`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 2 rader bort.  
I dag: Antalet arbetare på raderna mat och ved räknas mot bufferten utan ledarens påbud om större lager och utan personens aning om en hård vinter (kommentaren säger "bufferten utan förrådsseden"). Vedradens villkor använder bufferten med påbud. Behovet använder påbud och aning. Mellan den lilla och den stora bufferten finns ett behov, men raden är full med en enda person. Påbudet Samla för vintern ger däremot uttryckligen fler händer (rad 516), så skillnaden kan vara menad.  
Förslag: Om påbudet om större lager ska ge fler arbetare: räkna det som fattas i arbetsTimme mot samma buffert som raderna frågar (med påbudet), och låt aningen om en hård vinter vara en faktor på personens behov. Annars: skriv i kommentaren att det är menat.  
Ändras i spelet: Ledarens påbud om större mat- eller vedlager ger fler som samlar, inte bara en lite högre vikt hos var och en. Förråden växer fortare i byar med sådana påbud.  
Prövningen: De tre sätten finns, men kommentaren antyder att det är menat. Ägaren väljer: ska påbudet om större lager ge fler arbetare (som påbudet Samla för vintern), eller bara göra behovet tyngre som i dag.

**538. Elden släcks inte när något eldigt rivs för ett hus: raden träffar aldrig**  
Var: `src/sim/stationer.ts:1641-1644, 695-698; src/sim/brasor.ts:59-65, 96-103; src/sim/byggplan.ts:931, 942, 956; src/sim/lager.ts:394-407`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: rivStation letar efter en eld på exakt stationens ruta. Grillen står en ruta bredvid elden, och den stora elden finns inte i listan som söks. En lägereld till är bara en station medan ringen läggs; när den är klar tas stationen bort och den blir en eld. Raden hittar därför aldrig någon eld. En färdig lägereld där ett hus ska stå är ingen station, så den rivs inte alls: brasor.ts räknar med att en vägg kan ha byggts över den.  
Förslag: Antingen bara ta bort den döda raden (ingen ändring mot i dag). Eller bygg det designdokumentet säger: en lägereld som står där huset ska stå släcks och tas isär innan bygget börjar.  
Ändras i spelet: Ingen skillnad om raden bara tas bort. Byggs det som dokumentet säger försvinner lägerelden under ett nytt hus direkt, och byn lägger en ny någon annanstans om den behövs.  
Prövningen: Raden är död, det stämmer. Men designdokumentet (Det som står ute rivs för husen, steg 10.2.77) säger att en eld släcks med vatten och tas isär, och det händer inte i dag. Björn väljer: stryka raden och låta det vara, eller bygga släckningen som ett eget steg. Jag har läst koden men inte kört ett fall där ett hus läggs över en lägereld.

**539. Den som en gång straffats hårt kan offras för alltid**  
Var: `src/sim/kyrka.ts:532-535; src/sim/styre.ts:528; src/sim/lagar.ts:105, 125`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Flaggan straffad sätts vid ett hårt straff och tas aldrig bort. Budet människooffer väljer bland dem som har flaggan och inte har tron, och lagen De straffade röstar inte tar rösten av samma personer. Den som straffades som ung kan alltså offras, och sakna röst, resten av livet.  
Förslag: Om Björn vill: spara när straffet föll i stället för en flagga, och låt offret och rösten gälla en viss tid, med ett balanstal.  
Ändras i spelet: Ja: färre kan offras, och de straffade får tillbaka rösten efter en tid.  
Prövningen: Stämmer i koden, men designdokumentet säger bara att offret är den som straffats hårt på tinget och inte har tron, utan någon tidsgräns. Björn väljer: ett hårt straff följer en för livet som i dag, eller bleknar efter en tid. Valet gäller också lagen om de straffades röst.

**540. Byn bygger inget på leden om den inte har råd med det bästa bygget**  
Var: `src/sim/platsbygge.ts:67-82, 87, 101`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Det gäller byarna ute i världen och deras broar, spänger och röjda passager på lederna (inte utposten). bastaBygge väljer det mest lönsamma bygget, och först efteråt kollas om byn har materialet. Har den inte det byggs inget, fast ett billigare bygge kunde ha gått. Rad 87 är ingen sammanblandning: maten minskar med det arbete byn annars gjort hemma, som kommentaren säger.  
Förslag: Björn avgör: antingen väntar byn tills den har råd med det bästa (som i dag), eller så väljer den det bästa bland det den har råd med (ett villkor till i slingan).  
Ändras i spelet: Med ändringen byggs fler spänger och passager ute i världen, när bron är för dyr.  
Prövningen: Första halvan stämmer, andra halvan (rad 87) stämmer inte. Kommentaren överst i filen säger 'har byn materialet, betalar den och bygger', vilket går att läsa på båda sätten. Björn väljer mellan att spara till det bästa eller bygga det som går.

**541. Ett rykte uppdaterar tiden och källan för det man vet säkert**  
Var: `src/sim/ort.ts:5, 57-63, 93, 275, 352`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Filens huvud säger att minnet stärks av att höra om platsen på samma eller en högre nivå, och designdokumentet att ett rykte bara ger sorten och namnet. Men i larOrt gäller raderna 58-63 också när nivån som hörs är lägre än den man har. Den som besökt en by och hör ett rykte med nyare tid får sin tid flyttad fram och tror då på byns tal vid den nya tiden. Källan skrivs över, så "egen resa" blir "hört av X". Viktigt: varje led i berättandet sänker nivån ett steg (rad 92), så en nyhet som gått två led når lyssnaren som ett rykte.  
Förslag: Två vägar. A: tiden, källan och nyheten uppdateras bara när nivån som hörs är minst Känt. B: behåll att tiden följer med i alla led (nyheter sprids som i dag), men skriv inte över källan när man själv varit där. Rad 58 kan i båda fallen kortas (Math.max(e.c, c, x) är samma som Math.max(c, x)).  
Ändras i spelet: Med A stannar nyheter om andra byar efter ett led från den som varit där, så byn får veta mycket mindre av varandra. Med B ändras bara texten om varifrån man vet det.  
Prövningen: Koden gör som läsaren säger, men rättelsen A stryper nyheternas spridning eftersom varje led sänker nivån. Ägaren väljer: ska nyheter om en by kunna föras vidare i flera led (som i dag), eller bara av dem som vet var byn ligger? Källan "egen resa" bör bevaras oavsett.

**542. Kyrkskatten tar bara ved fast lagen säger "en del av byns förråd"**  
Var: `src/sim/kyrka.ts:363-370, 630`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: skattDygn flyttar bara ved till kyrkan, och bara när byn har ved över (kommentaren hänvisar till steg 10.2.43). Lagens text säger en del av byns förråd. På rad 368 hämtas en person i variabeln l som sedan inte används; villkoret betyder bara att någon lever.  
Förslag: Ta bort raden med l. Björn väljer om skatten ska fortsätta vara ved (då rättas lagens text) eller också ta mat och andra hela saker ur ett överskott.  
Ändras i spelet: Nej om bara texten rättas och l tas bort. Ja om skatten breddas: kyrkan får mat och kan betala präst och fattiga med skatten.  
Prövningen: Stämmer i koden. Att bara ta ved ur ett överskott är gjort med avsikt (steg 10.2.43), och designdokumentet säger bara att kyrkskatten är hela saker. Björn väljer: vedskatt med rättad lagtext, eller en bredare skatt.

### Brott mot reglerna (19)

**543. Djurens och resternas arbetstider ligger utanför riktlinjen och utanför vakten**  
Var: `src/sim/boskap.ts:30,33,151; src/sim/hage.ts:44; src/sim/rester.ts:30; src/sim/styckning.ts:19; src/sim/slatter.ts:35; src/sim/tider.ts:16-33`. Vinst 3 av 5, risk 3 av 5, liten ändring.  
I dag: Klippa ett får tar 20 minuter, mjölka 15, avliva 15, valla 15, tömma latrinen 15, stycka 10 minuter per del och slå äng 10 per ruta. Riktlinjen (Människan, Arbetstider) har inget slag för djurskötsel; en liten sak är 2–4 minuter och en stor högst 5. allaTider() i tider.ts tar bara med sakernas, stationernas, väggarnas och fältens tider, så vakten ser inte de här.  
Förslag: Lägg tiderna i allaTider() och ge dem ett slag. Antingen sänks de till 2–8 minuter (slaget bearbeta), eller så får djurskötseln ett eget slag med längre tider i riktlinjen.  
Ändras i spelet: Sänks tiderna går djurskötsel, styckning och slåtter flera gånger fortare än idag, så byn får mer tid över och djuren blir billigare att hålla.  
Prövningen: Tiderna stämmer och ligger utanför riktlinjen. Björn väljer: sänka dem till riktlinjens 2–8 minuter (15 minuter är ungefär fyra dygn i spelet för att mjölka en get), eller skriva in ett slag för djurskötsel med längre tider. I båda fallen ska vakten se dem.

**544. Den som släcker med vattensäck väljer eld efter en egen hård regel**  
Var: `src/sim/brand.ts:513-518 (narmastByn), 688-705 (brandMal), 788-794 (slackaFylld)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 7 rader bort.  
I dag: Den som släcker med händerna väljer ruta efter värdet (bastSlack, steg 10.11.3: vad som hotas, hur många som redan släcker där, kanten före det inre). Den som har en vattensäck får i stället alltid rutan som brinner närmast byn som mål, och går dit när säcken är fylld. Designdokumentet säger inget om att säcken ska gå närmast byn; det säger att var och en tar sin egen ruta i eldens kant.  
Förslag: Låt också den med vattensäck välja med bastSlack och ta bort narmastByn.  
Ändras i spelet: Ja, lite. Den med vattensäck släcker där mest värde hotas, inte alltid närmast byns område. Oftast är det samma eld.  
Prövningen: Stämmer: en hård regel bredvid ett system som redan avgör samma sak. Enligt reglerna listas sådana för Björn innan de ändras. Björn väljer: säcken går alltid till det som brinner närmast byn (som i dag), eller dit värdesystemet säger, som händerna.

**545. Tidsslaget "bearbeta" tillåter 2–8 minuter och används för sådant som inte är mat**  
Var: `src/sim/tider.ts:15-24 (TIDSLAG, bearbeta rad 23); src/sim/recept.ts:55-56, 67 (plankor 8 min), 75 (lin 5 min), 98-124, 134-139 (grillat 7,5 min); src/sim/saker.ts:285 (kompost)`. Vinst 2 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Riktlinjen för arbetstider (fliken Människan) har slagen liten sak 2–4 minuter och stor sak högst 5. Koden har ett slag till, bearbeta, 2–8 minuter, med kommentaren "inte i riktlinjen: förslag, Björn kan ändra". Det står inte i designdokumentet. Omkring fyrtio recept har slaget: slakt, rensning, rökning, saltning, torkning och grillning, men också plankor av virke (8 minuter), lin (5 minuter) och kompost. Att grilla en bit tar 7,5 minuter.  
Förslag: Björn avgör: antingen skrivs bearbeta in i riktlinjen med sina minuter, eller så tas slaget bort och recepten läggs i liten (2–4) eller stor (högst 5), med de längsta tiderna kortade. Plankor, lin och kompost bör i båda fallen få slaget liten eller stor, eftersom de inte är mat eller vilt.  
Ändras i spelet: Bara om tiderna kortas: då går grillning och plankor fortare, som mest från 8 till 5 minuter.  
Prövningen: Det stämmer: slaget finns i koden men inte i riktlinjen, och koden säger själv att Björn kan ändra det. Björn väljer mellan att godkänna slaget (2–8 minuter för mat och vilt) i riktlinjen, eller att korta grillning, torkning och plankor till högst 5 minuter.

**546. Hårda regler om bybornas val vid rövarlarm**  
Var: `src/sim/rovare.ts:90, 411, 426, 430, 462-463, 561, 799; src/sim/kartstrid.ts:220, 312`. Vinst 2 av 5, risk 2 av 5, ett steg.  
I dag: (1) Den som fått larmet och inte varnat väljer alltid handlingen varna före allt annat (rad 426). (2) Den som flytt, gett upp eller hotats av en rövare är gömd i exakt två timmar (gavSigTim) oavsett mod och läge; fältet sätts på tre ställen. (3) Under vaktåldern eller för svag: viljan är minus oändligt, alltid gömd. (4) Barn går aldrig emellan i ett slagsmål. Allt stämmer med koden.  
Förslag: Lista för Björn enligt GRANSKNING.md (del 4), ändra inget nu. (1) kan bli en hög poäng i valet i stället för ett tvång. (2) kan bli ett avdrag på viljan i rovarVilja som avtar med tiden. (3) och (4) beskriver hur världen är och kan stå kvar.  
Ändras i spelet: En modig bybo som blivit bortskrämd kan ställa upp igen tidigare, och någon mitt i något viktigare kan låta bli att stanna och ropa. Små skillnader.  
Prövningen: Reglerna finns som läsaren säger, och GRANSKNING.md säger att hårda regler listas för Björn och inte ändras förrän han sagt ja. Björn väljer för (1) och (2) om de ska bli faktorer i valet eller stå kvar som fasta regler.

**547. Arbetstider utanför riktlinjen: grillning 7,5 minuter och plankor 8 minuter**  
Var: `src/sim/recept.ts:67, 134-138; src/sim/tider.ts:22-23`. Vinst 2 av 5, risk 2 av 5, liten ändring.  
I dag: Att klyva plankor tar 8 minuter (för två plankor) och att grilla en bit 7,5 minuter. Riktlinjen säger 2–4 minuter för en liten sak och högst 5 för en stor. Koden har ett eget slag, 'Bearbeta mat och vilt' med 2–8 minuter, märkt 'inte i riktlinjen: förslag, Björn kan ändra'. Därför larmar inte vakten.  
Förslag: Björn avgör: antingen skrivs slaget in i riktlinjen i designdokumentet, eller så sätts tiderna inom riktlinjen (t.ex. plankor 5 och grillat 4), eller så blir grillningen en väntan som följer klockan.  
Ändras i spelet: Kortas tiderna går plankor och grillad mat fortare, och byn får lite mer tid över.  
Prövningen: Stämmer mot riktlinjen, men koden säger själv att slaget väntar på Björns svar. Designdokumentet (Rätterna och tillagningen) säger dessutom att varje arbetsdel i matlagningen tar 2–4 minuter. Björn väljer mellan att godkänna 2–8 minuter eller korta tiderna.

**548. "En lag i taget" är en hård regel, och den gäller bara stenar**  
Var: `src/sim/skrift.ts:116-122 (rad 118), 176-185 (runstenBorja, runstenKlar)`. Vinst 1 av 5, risk 1 av 5, liten ändring, ungefär 1 rader bort.  
I dag: lagLust ger ingen lust att skriva ner en lag medan någon annan ristar en lag på en sten. Regeln ser bara uppgiften runsten, inte den som skriver en lag på ett blad. Den går igenom alla levande för varje person som frågas, och den stoppar också blad och böcker om lagar under tiden.  
Förslag: Ta bort villkoret. Lusten sjunker av sig själv när lagen är skriven, och runstenBorja och runstenKlar frågar lusten igen innan stenarna tas, så den som blir klar sist avbryter utan att något går åt.  
Ändras i spelet: Knappt märkbart: två kan någon gång börja rista samma lag samtidigt, och den som blir klar sist har då arbetat en kvart utan att det blir en sten.  
Prövningen: Stämmer i koden, och orden "en i taget" är en varningsflagga i Principerna. Men hårda regler ändras först när Björn sagt ja. Björn väljer: behålla regeln (ingen ristar i onödan) eller ta bort den och låta systemet reda ut det (någon kan arbeta en kvart förgäves). Designdokumentet nämner inte regeln.

**549. Förbättra har en fast ordning på fjorton rader före poängen**  
Var: `src/sim/val.ts:888-915; src/sim/projekt.ts:46-47, 124-125, 429-448`. Vinst 3 av 5, risk 4 av 5, ett steg, ungefär 10 rader bort.  
I dag: På nivå 8 prövas raderna i registrets ordning: projekt, brygga, tatuera, klippa, hamla, sätta ört, bära hem krukan, staket, fågelskrämma, sopor, baka, slåtter, husförbättring. Först därefter vägs raderna i FORBATTRA med poäng. Det mest värda projektet tas hur lite det än är värt, så ett projekt går alltid före att pröva sig fram, gå i lära och fylla förråden. Designdokumentet säger just så: "Först projekt byn eller personen saknar, och bygga ut och bygga om. Sedan vägs raderna med poäng mot varandra." Men kommentaren i projekt.ts rad 124-125 säger att ett redskap över bufferten "vägs med poäng mot att fylla förråden", och det gör det inte.  
Förslag: Antingen behålls ordningen som dokumentet säger, och kommentarerna i projekt.ts rättas. Eller så blir alla rader på nivå 8 kandidater med poäng i FORBATTRA, projektet med sitt värde och de övriga med ett tal i VAL, och texten i dokumentet skrivs om.  
Ändras i spelet: Med poäng: byn prövar sig fram, går i lära och fyller förråden också när det finns ett litet projekt att göra. Blandningen av sysslor en lugn dag ändras märkbart, och talen måste ställas in.  
Prövningen: Koden gör det läsaren säger, men designdokumentet beskriver ordningen som önskad. Ägaren väljer: projekten först som i dag, eller projekten bland de andra raderna med poäng.

**550. Hård ordning i utflyttningen: alltid ett par först, en ensam bara om inget par finns**  
Var: `src/sim/liv.ts:72-74,428-451, src/sim/grannbyar.ts:105-106`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 8 rader bort.  
I dag: emigrate letar först efter någon med partner mellan 18 och 38 år och skickar alltid iväg det paret med barnen; en ensam vuxen (16–40 år) flyttar bara om inget sådant par finns. Åldrarna är balanstal i LIV (parFran, parTill, ensamFran, ensamTill), inte lösa tal i koden. Vem som flyttar slumpas jämnt, utan hänsyn till hur hen trivs. Utbrytningen (en familj ur en stor by blir en ny by, steg 4.4.4.1) bygger på att det är en familj som går.  
Förslag: Välj en vuxen viktat efter hur illa hen trivs (humöret); partnern och barnen följer med. En gren i stället för två.  
Ändras i spelet: Den som trivs sämst flyttar, med sin familj, i stället för ett slumpat par i rätt ålder. Ensamma flyttar oftare än i dag, så färre utflyttningar blir nya byar i världen, och byns ålderssammansättning kan ändras.  
Prövningen: Ordningen 'par först' är en hård regel om människornas val, men den styr också hur nya byar uppstår (Samhället: Invandring och utbrytning). Björn väljer: behålla par först, eller låta humöret avgöra vem som flyttar och ta om balansen.

**551. Högst ett framträdande per kväll är en hård regel bredvid lusten per timme**  
Var: `src/sim/framtradande.ts:6, 152, 319, 340; src/sim/typer.ts:476`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Hur ofta någon uppträder styrs av en lust per timme (FRAM.viljaTim × kvaliteten × tiden sedan personen senast prövade), av att bara ett framträdande pågår åt gången och av tiden kl. 18–23. Ovanpå det ligger s.framKvall: när någon kallat den kvällen får ingen annan uppträda, också om det ställdes in för att ingen kom.  
Förslag: Björn väljer. A: ta bort s.framKvall och funktionen kvall, och låt lusten och att ett framträdande i taget pågår avgöra; blir det för många sänks viljaTim. B: behåll gränsen som den står i designdokumentet.  
Ändras i spelet: A: en by med flera skickliga skalder kan få två eller tre framträdanden samma kväll, och en kväll där ingen kom till det första kan få ett andra. Publikens glädje kan bli högre om inte viljaTim sänks.  
Prövningen: Gränsen är ett 'högst' om vad människorna gör, men designdokumentet säger den uttryckligen två gånger (steg 4.3.2.1 och Kallelsen 10.7.9: 'högst ett framträdande per kväll, också när det ställs in'). Björn väljer om det ska vara en fast regel eller komma ur lusten.

**552. Hårda regler om val i maten, näten och bärandet (för Björn att godkänna)**  
Var: `src/sim/lager.ts:753-758 och 766 (skämd mat hoppas över helt), 73 och 1301 (fullt förråd: bara det som ligger längre bort än barFullt bärs); src/sim/forradsmal.ts:226 (nät: högst två)`. Vinst 2 av 5, risk 3 av 5, liten ändring, ungefär 3 rader bort.  
I dag: Tre ställen där ett val avgörs av en gräns i stället för en poäng. (1) Den som inte är hungrig nog tar inte alls mat under ett visst skick; gränsen sjunker mot noll ju hungrigare hen är. (2) Byn vill ha ett nät per tre spjut men högst två, så taket märks först vid ungefär 21 vuxna. (3) När förrådet är fullt bärs något in bara om det ligger längre bort än en gräns, närmare ju mer det är värt.  
Förslag: (1) Låt skicket vara en faktor i matens ordning, så att skämd mat tas sist utan en spärr. (2) Ta bort taket på två nät; antalet följer redan fiskarna. (3) Står kvar: den hindrar att samma sak bärs fram och tillbaka när inget får plats. Inget ändras förrän Björn sagt ja.  
Ändras i spelet: (1) Den lätt hungrige äter skämd mat när inget annat finns nära, i stället för att vänta tills hungern vuxit; fler kan bli magsjuka. (2) Byar med över tjugo vuxna gör fler än två nät.  
Prövningen: Alla tre finns i koden. Designdokumentet (steg 9.6.24, Förvaring och färskhet) beskriver valet av mat som en poäng där skicket sänker värdet, men koden har en spärr. Björn väljer för (1) spärr eller poäng och för (2) om taket på två nät ska bort; (3) föreslås stå kvar.

**553. Hårda tak och en fast ordning i bybornas handel med handlaren**  
Var: `src/sim/handel.ts:69-70 (ensamTim, egnaMax), 76 (nejMax), 774-779 (valj), 903-906 (handlaVal); src/test/scenarier/agande.ts:1602, 1608`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 3 rader bort.  
I dag: En bybo köper högst tre slag (egnaMax) och högst två av varje; talet två står löst i koden på rad 779 utan namn bland balanstalen. Hen ger upp efter tre nej. Ingen bybo får ställa sig i kön förrän byn handlat klart, och den som handlar för byn är först ledaren och efter två timmar vem som helst.  
Förslag: Minst: ge talet två ett namn i HANDEL. Mer: ta bort taket på slag och låt behovet och det kunden har råd med avgöra, och låt den som handlar för byn stå i samma kö som de andra.  
Ändras i spelet: Med bara ett namn på talet: ingen skillnad. Utan taken kan en rik bybo köpa fler slag och fler av varje, så varorna tar slut fortare för dem längre bak. Med gemensam kö kan en bybo hinna handla före byn.  
Prövningen: Taken finns i koden. Men designdokumentet säger uttryckligen att byn handlar först och att byborna sedan står i kö, och tre nej står i avsnittet om priser, så ordningen och nejen är önskade. Björn väljer om taken på tre slag och två av varje ska bort; att ge talet två ett namn kan göras direkt.

**554. Vardagsbönen har en hård regel: en gång om dagen**  
Var: `src/sim/kult.ts:76-85, 438; src/sim/val.ts:1397-1401`. Vinst 2 av 5, risk 3 av 5, ett steg, ungefär 2 rader bort.  
I dag: bonFritid släpper bara igenom en vardagsbön per dygn och bonNod en bön i nöd per dygn, fast valet på fritiden redan väger bönens lust mot vila och umgänge. Den ledda bönen hålls med två dygns mellanrum, ett löst tal i koden.  
Förslag: Låt lusten att be sjunka efter en bön och växa tillbaka, som gravbesöket redan gör (BESOK.aterDygn), och gör den ledda bönens mellanrum till ett balanstal.  
Ändras i spelet: Ja: mycket andliga människor kan be mer än en gång per dygn och andra mer sällan; tron växer då fortare hos de andliga.  
Prövningen: Spärren står i designdokumentet: vardagsbönen ger sitt 'högst en gång om dagen'. Björn väljer mellan att behålla den som en regel för vad bönen ger, eller låta lusten växa tillbaka som vid gravbesöket. Mellanrummet på två dygn kan bli ett balanstal oavsett.

**555. Hårda regler om människornas val, för Björn att godkänna**  
Var: `src/sim/val.ts:728, 838, 1262, 1445-1471, 1480-1488`. Vinst 2 av 5, risk 3 av 5, ett steg.  
I dag: Några val är fasta regler i stället för poäng. Flinta och stenar till elden letas aldrig när byn svälter. Påbudet Bygg före allt gäller aldrig vid svält. Nattens vakter är de modigaste, högst hälften av de vuxna, och byts kl. 7. Natten har en fast ordning: bära in, vila, berätta, skriva, handarbete, samtal. Den gamla sover på natten med en fast chans i varje val.  
Förslag: Flintan och påbudet: låt hungern väga ner poängen i stället för att spärra. Natten: vikter som på dagen. Vakten kan stå kvar som en regel för hur byn ordnar natten.  
Ändras i spelet: I en svältande by utan flinta kan någon enstaka ändå leta flinta så att elden går att tända. Natten blir lite mer blandad. Annars liten skillnad.  
Prövningen: Reglerna finns i koden, och enligt GRANSKNING.md ändras hårda regler bara efter Björns ja. Flintan vid svält och vaktens urval stod redan som 'kvar' i förra genomgången (nr 42 och 11) utan att bli steg. Björn får välja för var och en: behålla som grundregel eller göra om till poäng.

**556. Byn får aldrig ha fler än 20 hönor**  
Var: `src/sim/hons.ts:23, 63`. Vinst 2 av 5, risk 3 av 5, ett steg.  
I dag: HONS.max: 20 hindrar köpta hönor från att gå in i flocken när den har 20. Hönsen äter inget foder ('letar mat själva, så ingen matar dem'), så det finns inget annat som begränsar antalet. Designdokumentet (Djuren, fliken Bygga, odla och äta) säger 'Högst ett par tiotal djur i en by på 30 människor'. Bikuporna har däremot uttryckligen inget tak utan följer draget.  
Förslag: Björn avgör. Ska antalet följa av något behöver hönsen först något som begränsar dem, till exempel att de äter säd eller rester, eller att köparen bara köper så många som äggen behövs till (förrådsmålet för ägg).  
Ändras i spelet: Ja, om taket tas bort: en rik by kan köpa hur många hönor som helst och få mycket ägg utan arbete, om inget annat håller emot.  
Prövningen: Taket finns och är en hård gräns av slaget 'högst N', men förslaget att låta fodret avgöra går inte i dag eftersom hönsen inte äter något. Björn väljer: behålla taket som en enkel regel, eller ge hönsen foder eller ett förrådsmål för ägg som ett eget steg.

**557. Sporten har en fast åldersgräns på 50 år fast kroppen redan avgör**  
Var: `src/sim/sport.ts:104, 177, 182, 232`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 3 rader bort.  
I dag: SPORT.alderTill = 50: över det spelar man inte. Gränsen står i vikten, i vem som hör ropet och i hur många vuxna byn räknas ha. Viljan att spela väger redan med (styrka + smidighet) / 20, och den som inte kan gå utesluts.  
Förslag: Ta bort alderTill och låt kroppens egenskaper avgöra, eller låt åldern sänka vikten mjukt i stället för en gräns.  
Ändras i spelet: Ja, lite: en stark och smidig 55-åring kan vara med i en match, och byar med många äldre får oftare ihop spelare nog.  
Prövningen: Stämmer, och det är en hård regel om människornas val. Men designdokumentet räknar med den: steg 10.7.16 säger "de över 50, som inte spelar, kan titta", och scenariot matchpublik prövar det. Björn väljer mellan den fasta gränsen och att styrka och smidighet ensamma avgör.

**558. Björnjakten kräver spjut som hård regel fast styrkan redan avgör**  
Var: `src/sim/bjorn.ts:66, 110 (harSpjut i filtret kan), jämför 112-114 och 121-122`. Vinst 1 av 5, risk 2 av 5, liten ändring, ungefär 1 rader bort.  
I dag: Bara den som har ett stickvapen räknas bland dem som kan gå på björnjakt. Samtidigt avgör jägarnas styrka mot björnens redan vem som vågar och om jakten blir av (steg 10.1.17).  
Förslag: Antingen behålla kravet, eller ta bort harSpjut ur filtret och låta vapnets skada göra jobbet: den med yxa eller klubba räknas då som en svagare jägare.  
Ändras i spelet: Utan kravet kan björnjakter bli av i byar utan spjut om de är många nog, med fler skadade som följd.  
Prövningen: Koden stämmer, men designdokumentet säger uttryckligen att björnen 'jagas bara av en stor grupp med spjut' (avsnittet Björnen och steg 6.6.6). Björn väljer mellan spjutkravet som det står och att bara styrkan avgör.

**559. Hjälparen vid en förlossning tvingas till uppgiften**  
Var: `src/sim/forlossning.ts:39-44, 53-54; src/sim/handlingar.ts:148`. Vinst 1 av 5, risk 2 av 5, liten ändring.  
I dag: När en förlossning börjar väljs den vuxna inom 40 rutor som har högst vårdkvalitet, hens arbete avbryts och hen får uppgiften 'forlossa' satt direkt, förbi valet av aktivitet. Det gäller vad hen än gör just då, också den som vårdar en blödande, släcker en brand eller slåss.  
Förslag: Björn väljer: godkänna det som en enkel fast regel (en förlossning väntar inte, och det märks sällan), eller göra hjälpen till en rad i valet av aktivitet med hög poäng, så att den som gör något mer akut stannar kvar där och den näst bästa går i stället.  
Ändras i spelet: Bara om den görs om till ett val: då kan en annan än den bästa vårdaren hjälpa till, eller ingen, och riskerna vid födseln blir lite högre de gångerna.  
Prövningen: Det är en hård regel om vad en människa gör, och CLAUDE.md säger att sådana listas för Björn och inte ändras förrän han sagt ja. Designdokumentet (steg 9.5.29) säger bara att förlossningen har en hjälpare, inte hur hen väljs.

**560. Samordningsregel 'en annan är redan på väg' vid stationsbygget**  
Var: `src/sim/stationer.ts:1080, 1088, 1096, 1104`. Vinst 1 av 5, risk 2 av 5, liten ändring.  
I dag: nyPaVag hindrar en person från att börja på en ny station om någon annan redan har tagit uppgiften att bygga en av samma sort och inte har börjat än. När den första har börjat kan fler hjälpa till på samma station. För stationer byn bara har en av skyddar regeln mot att två tar material till var sin. För dem byn har många av (bäddar, bänkar, lägereldar) betyder den att en ny påbörjas i taget.  
Förslag: Ta upp den i granskningsrapporten för Björn. Antingen står den kvar som enkel regel, eller så sänker en påbörjad station värdet på nästa av samma sort i projektens poäng, så att två kan börja på var sin bädd när bristen är stor.  
Ändras i spelet: Väljs poängvägen kan flera bäddar eller bänkar påbörjas samtidigt när många saknar en.  
Prövningen: Regeln finns och kom med steg 10.2.5, där 'en i taget' skulle bli ett mjukt tak utom det som är en regel för världen. Enligt GRANSKNING.md ändras hårda regler om människornas val först när Björn sagt ja. Björn väljer: behålla regeln, eller låta projektens poäng sköta det.

**561. Elden får aldrig sprida sig längre än 40 rutor från där den började**  
Var: `src/sim/brand.ts:88 (maxR), 137 och 146 (kallor, nara), 279, 320, 352`. Vinst 2 av 5, risk 4 av 5, ett steg, ungefär 6 rader bort.  
I dag: Varje brand minns var den tändes, och en ruta längre bort än 40 rutor från en källa kan inte ta eld. Det är ett tak på resultatet, inte något som beskriver världen. Designdokumentet (Världen, Eldsvåda och skogsbrand) säger samma sak med ord: elden tar sig aldrig längre än 40 rutor från där den började.  
Förslag: Ta bort maxR, nara() och listan kallor. Brandens storlek avgörs då av regnet, torrheten, bränslet, vinden och släckningen. Blir bränderna för stora rättas det i balanstalen för spridningen.  
Ändras i spelet: Ja. En brand en torr och blåsig sommar kan bli större än 40 rutor i radie och nå längre in i skogen eller byn. Måste ses i balanskörningen (bränder per by, döda i brand).  
Prövningen: Stämmer i koden och ser ut som gaffatejp, men taket står uttryckligen i designdokumentet och spelet ändras. Björn väljer: behålla taket på 40 rutor, eller ta bort det och låta regn, torrhet och släckning avgöra (då skrivs dokumentet om och bränderna prövas i en balanskörning).

## Del 3: föll i prövningen (213)

- forebilder.mjs: skriptet som skriver förebilderna för porträtten (`bildstil/api/forebilder.mjs:1-327 (nämns i bildstil/README.md och bildstil/api/rita.mjs:17)`): Påståendet att skriptet skriver över nyare ritningar stämmer inte: filerna och skriptet är lika. Skriptet är det ställe där en förebild ändras nästa gång Björn säger nej, så vinsten är liten och något går förlorat.
- En enklare kostnadsuppskattning i rita.mjs (`bildstil/api/rita.mjs:246-272 (bildTokens, forebildTecken, textTokens, delKostnad, uppskattning), 5 och 281-290 (kommandot kostnad); bildstil/README.md:20`): Det läsaren säger om koden stämmer, men vinsten är ett trettiotal rader i ett verktyg, och priset är en sämre gissning om Björns krediter. Det är inte värt det.
- Samma ritflöde skrivet två gånger (bilder.mjs och forslag.mjs) (`bildstil/api/bilder.mjs:341-385 och forslag.mjs:196-226 (samt ideer, olikaFel, omtag och granskning i båda)`): Stegen är desamma, men reglerna i dem skiljer sig på flera ställen, så vinsten blir mindre än läsaren räknat. Flödet går inte att pröva utan att det kostar krediter, och ett fel där ger en betald körning som inte sparar något.
- Sidan och förebildens bild byggs om för varje fråga (`bildstil/api/bilder.mjs:72-83, 109, 113, 118; forslag.mjs:87-91`): Det stämmer att samma bild räknas om, men det handlar om sekunder i en körning som tar minuter. Mer kod för en vinst ingen märker.
- Skuggningen räknar fyra avstånd per punkt för varje del (`bildstil/bestskapare.js:679-703, 771-786, 801-813, 905-911`): Vinsten är inte visad och troligen omärklig: det är ett ritverktyg på bildstilens sida, och API-ritningen väntar mest på nätet. En omskrivning av skuggningen kan flytta enstaka punkter i alla bestbilder, och det är inte värt risken utan en mätning.
- Låt forslag.js fråga registret SLAG om staket i stället för ett eget namnmönster (`bildstil/forslag.js:116 (kort), 120-125 (körs vid laddningen), bildstil/kontroll.js:23, bildstil/bygg.cjs:35-36 (ordningen)`): Dubbletten finns, men den enkla rättningen går inte: registret är inte laddat när forslag.js behöver det. Att flytta om laddningsordningen för att spara en rad är inte värt risken.
- Slå ihop storsta och kort i kontroll.js (`bildstil/kontroll.js:211-239 (kort), 279-286 (storsta), bildstil/stackar.js:13`): Överlappet är tre rader, inte tio, och de två funktionerna ger olika saker. Vinsten är för liten för att röra kontrollerna som alla bildförslag går igenom.
- Tomt förslagssystem FORSLAG i skapare.js (`bildstil/skapare.js:64-67, 1114-1119, 1282-1288, 1477; bildstil/README.md:41`): Koden är ett tomt register för ett arbetssätt som står beskrivet i bildstilens README, inte död kod. Vinsten är ett tiotal rader och för liten för att ta bort ett dokumenterat sätt att visa förslag.
- Engångsskriptet siffror.cjs (`bildstil/siffror.cjs:1-101; src/template.html:9; ARKITEKTUR.md:10`): Tas skriptet bort går siffrorna inte att ändra eller bygga om, eftersom typsnittet i template.html bara är en kodad textrad som pekar tillbaka på skriptet. Det är källan till en genererad del, inte skräp.
- Paletten räknas fram en gång till i porträttfilen (`src/portrattkarna.ts:3363-3458; src/palett.ts:1-45; bildstil/portratttillspelet.cjs:11-13`): Raderna står i en fil som ett skript skriver, så ingen underhåller dem för hand, och räkningen av 32 färger tar ingen märkbar tid. Att kärnan är en ren kopia av bildstilens kod är själva poängen, och en egen variant riskerar att porträtten skiljer sig från bildstilen.
- Raden som fyller behoven står på många ställen (`src/test/scenarier/redskap.ts:39,52,67,79; sparning.ts:228,249; projekt.ts:24; byggnader.ts:534; hjalp.ts:202,212; kontroll.ts:180; behov.ts:926,1011; agande.ts:447,1121; folk.ts:880`): Varje ställe är en enda rad, så en hjälpare byter en rad mot en rad och sparar inget. Varianterna skiljer sig på riktigt, och en gemensam hjälpare riskerar att ändra vad något test mäter.
- Två kontroller letar emojier: ikoner och symboler (`src/test/scenarier/kontroll.ts:96-106 (ikoner) och 111-126 (symboler)`): De överlappar men är inte samma: de läser olika filer, räknar sammansatta emojier olika och har olika krav på symbolerna. Att ta bort emojidelen sparar bara ett par rader.
- Jaget och omtanken sägs pröva samma sak (`src/test/scenarier/projekt.ts:68-94 (jaget) och 206-250 (omtanke)`): Bara ett par rader uppställning och en kontroll om empati överlappar. Scenarierna hör till två olika steg och prövar olika funktioner, och namnen står i listan över scenarier och i kartan för riktad.
- Tester läser händelseloggen (`src/test/scenarier/redskap.ts:615; hjalp.ts:108-112 (logg); ett fyrtiotal direkta läsningar i agande.ts, byggnader.ts, folk.ts, grund.ts, kultur.ts, natur.ts, fas11.ts`): Regeln gäller att räkna händelser ur loggen, inte att pröva att en rad visas. Exemplet i kvalitet prövar att mästerverket skrivs i loggen direkt efter att det gjorts, och statistiken som föreslås finns inte, så den skulle behöva byggas in i spelet bara för testet.
- Oanvända hjälpare och listor i hjalp.ts (`src/test/scenarier/hjalp.ts:113 (skogsandel), 133-189 (uiLas), 190 (flyttLitenBy), 208-229 (valjer, MATARBETE, TRAARBETE, REDSKAPSARBETE, FORBATTRING, MATMEDREDSKAP)`): Sökningen över hela src visar att allt används. Att flytta hjälpare från den delade filen till den enda fil som använder dem sparar inga rader och gör dem svårare att hitta nästa gång.
- Provet av registervärden som speglar balanstalen i stället för spelet (`src/test/scenarier/fas10.ts:110 (oxen 240, hästen 180), 250 och 298 (sten slits en femtedel), 437-440 (bur), 593-594 och 628-629 (bikupa), 938 (vaxljus), 1178 (vattenho); src/test/scenarier/behov.ts:675 (halmbädden minst 1,5; läsaren angav fel fil)`): Talen står utskrivna i stegen i Färdplanen (t.ex. "1 virke, 10 minuter"), så kontrollerna fångar ett recept som ändrats av misstag. De kostar ingen körtid och bara omkring åtta rader, inte trettio. Regeln "gränser, inte jämförelse" gäller byarnas balans, inte scenarierna.
- "Lika med korta som med långa slag" prövas i åtta scenarier var för sig (`src/test/scenarier/fas10.ts:425-426 (djurmotgang), 681 (bisvarm), 730 (binasar), 775 (svarmning), 905 (bistick), 1029 och 1038 (retad), 1182 (vattenho), 1253 (djurtorst)`): Varje steg i Färdplanen (10.10.10, 10.10.17–19, 10.10.22, 10.10.27, 10.10.30–31) säger att just det scenariot ska pröva korta mot långa slag. Ett samlat scenario måste bygga upp alla åtta uppställningarna en gång till, så koden blir längre, inte kortare.
- Samma sommarbyar körs om i fritid, promenad, varm och skugga (`src/test/scenarier/behov.ts:189-228 (fritid, 4 byar i 4 dygn), 230-273 (promenad, 2 byar i 2 dygn), 314-318 (varm, 5 byar i 2 dygn), 367-371 (skugga, 3 byar i 2 dygn); src/test/scenario.ts:91 och 106`): Långa scenarier körs i var sin process, så de kan inte dela en körning utan att slås ihop till ett scenario. Varm och skugga har en annan uppställning, och fritid behöver sina promenader för provet att de nyfikna går längre. Kvar blir två byar i två dygn, vilket är för lite för besväret.
- Bisvärmens årstidsprov finns i både bisvarm och svarmning (`src/test/scenarier/fas10.ts:655-656 och 679-681 (bisvarm), 767-768 och 774-775 (svarmning), 723 och 731 (binasar); src/sim/bin.ts:197-203`): Dubbletten är fyra rader, och stegen 10.10.17, 10.10.18 och 10.10.19 i Färdplanen räknar upp just de här proven för vart och ett av scenarierna. Vinsten är för liten för att ändra tre byggda stegs prov.
- Tålighetsprovet (det tåliga djuret dör senare) finns i två scenarier (`src/test/scenarier/fas10.ts:1098-1101 och 1124 (djuregenskaper), 1214-1223 och 1256 (djurtorst); src/sim/tamdjur.ts:101; src/sim/djurtorst.ts:36`): Det är inte samma kod som prövas: svält och törst har var sin rad, och steg 10.10.31 säger att djuret utan vatten dör "senare om det är tåligt". Tas provet bort i djurtorst kan den raden gå sönder utan att något test märker det.
- Stick och uppretade bon räknas fram med tusentals försök (`src/test/scenarier/fas10.ts:870-880 (bistick: sju gånger 3000 skattningar), 1019-1024 (retad: fem gånger 4000)`): Förslaget att räkna chansen ur formeln prövar formeln mot sig själv och ser inte längre om sticken verkligen blir lika många med korta och långa slag genom den riktiga koden, vilket steg 10.10.22 och 10.10.27 kräver. Tiden som sparas är några sekunder.
- ullplagg och delar av ylle prövar bara listor och tal i registret (`src/test/scenarier/fas9.ts:2164–2182 (ullplagg), 2157–2159 (ylle); src/sim/saker.ts:335`): Det stämmer att raderna läser registret, men de kan bli röda: lägger någon till en kappa av lin eller gör rocken varmare larmar testet, och det är just det steg 9.8.15 bestämde. Scenariot tar nästan ingen tid, och varje steg ska ha sitt scenario. Vinsten är för liten.
- tamdjur läser gränssnittets källtext och söker efter ord (`src/test/scenarier/fas9.ts:2, 1652–1655, 1666; src/ui/flikar/djur.ts:94`): Koden säger själv varför den gör så: rutan går inte att rita utan webbläsare. Samma sätt att läsa källtexten används i fem andra testfiler (kultur, kontroll, agande, grund, fas11), så det är ett valt arbetssätt. Tas raden bort finns ingen kontroll kvar av steg 11.1.59.
- hage har en kontroll som säger samma sak två gånger (`src/test/scenarier/fas9.ts:1750–1752, 1764–1770, 1830`): En av de tre delarna stämmer inte: kontrollen att djuren lever kan bli röd och ska stå kvar. Det som återstår är en rad som upprepar en annan och en slinga som står två gånger. Vinsten är för liten.
- rollekavild kör en hel by i sex dygn för en enda kontroll (`src/test/scenarier/fas9.ts:1530–1546; src/sim/steg.ts:1127`): Steget (9.7.15) handlar just om att röllekan plockas där den växer i stället för att hittas av en slump. Läsaren säger att andra scenarier täcker det, men inget annat test läser talet. Förslaget gör testet snabbare genom att ta bort det enda som prövar steget. Raden b.now += 0 är död och står med i fyndet om död kod.
- Hela kartan söks igenom två gånger i nat, och i flera scenarier (`src/test/scenarier/fas9.ts:1043–1048 (nat), 1121 (lok), 1519 (trad), 1536–1537 (rollekavild); src/sim/typer.ts:18–19`): Kartan är 64 × 40 rutor (2 560), så en sökning tar en bråkdel av en sekund och ingen tid sparas. De fyra sökningarna letar efter olika saker och blir inte kortare av en gemensam hjälpare. Vinsten är för liten.
- Testkrok i striden, bara för olyckshugg (`src/sim/strid.ts:607, 614; src/test/scenarier/fas9.ts:522, 529; jämför src/sim/halsa.ts:426 (HALSA_PROV) och src/sim/religion.ts:300 (TRO_PROV)`): Det stämmer att kroken bara används av ett test. Men samma lösning finns på två andra ställen i spelet (hälsan och religionen), så det är ett valt arbetssätt. Utan kroken träffas armen bara i en liten del av slagen, och testet blir beroende av slumpen och kan bli rött utan att något är fel. Två rader sparas. Vinsten är för liten för risken.
- Upprepad inledning: ny by, klocka, byggare, sovsal (`src/test/scenarier/byggnader.ts:102, 156, 1247, 1282, 1579, 1624, 1695, 2000, 2038 m.fl. (24 ställen)`): En ny hjälpare skulle byta en rad med två anrop mot en rad med ett anrop. Inga rader sparas, och 25 rader som fyndet räknade med finns inte.
- Dubbla prov: stockhus och stockihus, lager och lagerplatser (`src/test/scenarier/byggnader.ts:1382-1416, 1417-1447, 489, 562, 581, 594`): Proven prövar inte samma sak: två olika steg med olika funktioner, och summan i lagerplatser gäller just läget med flera platser, där den lättast går fel. Sammanslagning sparar tre rader och gör ett rött resultat svårare att tyda.
- Provet 'ett hus från en gammal sparfil' prövar bara ett tomt fält (`src/test/scenarier/byggnader.ts:1249, 1266; src/sim/byggnader.ts:189-195`): Kontrollen prövar en riktig reservväg i koden som ingen annan rad i provet prövar (sovsalsraden frågar taggarna, inte rumFnId). Två rader är ingen vinst.
- Mer bygg-prov än nödvändigt i bygg: långhus och hushistorik (`src/test/scenarier/byggnader.ts:404-406, 468, 418-420, 472, 2472-2492; src/sim/byggplan.ts:947`): Fyndets grund stämmer inte: langhus täcker inte räknaren, så kontrollen i bygg är den enda. Att flytta 'huset minns' kräver en by som byggt ett hus på riktigt, och det är just bygg som gör det.
- Onödigt täta steg i långa test: lager och strak (`src/test/scenarier/byggnader.ts:496-503, 952-973`): Vinsten är inte mätt, och läsaren var själv osäker. De täta stegen i lager finns för att fånga varje gång någon bär för mycket, och kopian per timme i strak är provets sätt att hitta en lagerplats på ett stråk; glesare mätning prövar mindre.
- Byn söks fram med hundratals nya byar utan att resultatet delas (`src/test/scenarier/grund.ts:797-801, 853-857, 953-960, 1099-1106, 1249-1254; src/test/scenario.ts:36-47, 80-110`): Förslaget bygger på att scenarierna delar minne, och det gör de inte. Ett fast frö måste ändå ha sökningen kvar som reserv, så koden blir längre och vinsten i datortid är inte mätt.
- Kontroller som bara läser ett värde i ett register (`src/test/scenarier/grund.ts:213, 279, 317, 422, 879, 1487, 2147, 2185, 2242, 2298`): Kontrollerna är billiga och vaktar att registren säger det designdokumentet säger, till exempel receptet för talgljuset. Tio rader är för liten vinst för att släppa den vakten; ett par av dem (nävern, leran) är tomma men ofarliga.
- brandkant och brandfart har liknande uppställning (`src/test/scenarier/grund.ts:1653-1666 (brandkant), 1668-1698 (brandfart)`): Kanten går bara att pröva på en stor brand, och efter tio minuter är branden för liten. Scenarierna prövar två olika steg, och vinsten är fjorton rader och en halvtimmes brand i ett kort scenario.
- Gränssnittets form kontrolleras i två eldscenarier (`src/test/scenarier/grund.ts:141-148 (egnaeldar), 1635-1639 (testknappar)`): Kontrollerna vaktar det Björn beställt i tre steg, och att flytta dem gör inget kortare eller enklare. Vinsten är för liten.
- Svampscenariot har en giftsvamp på 0,9997 (`src/test/scenarier/grund.ts:518-529; src/sim/fynd.ts:721-743 (eatPoison); src/sim/saker.ts:75 (giftsvamp håller 2 dygn)`): Det läsaren kallar decimaler är ruttningen, som alla matvaror har, och sorteringen räknas redan i hela svampar. Testet prövar ett verkligt fall (natur-26) och bryter inte mot regeln.
- Samma 'vänta tills det är klart'-slinga i tretton scenarier (`src/test/scenarier/natur.ts:557, 644, 759, 872, 915, 955, 1154, 1252, 1313, 1412, 1444, 2215, 2550; src/test/scenarier/hjalp.ts:275 (korTills)`): Upprepningen finns men sparar inga rader: varje ställe är redan en rad, och uppställningen runt om är olika. Hjälparen korTills som finns stegar på ett annat sätt och skulle kunna ändra utfallet i testerna.
- Slå ihop samlarrunda, grenrunda och samlartur (`src/test/scenarier/natur.ts:256-315, 316-363, 364-408`): Scenarierna prövar inte samma sak. Ett gemensamt scenario skulle behöva stega varje sekund i två dygn, och det blir långsammare, inte snabbare. Byn utan mat och byn utan ved kan inte heller vara samma körning.
- Samma sak prövas i flera scenarier (slakt, avstånd, kaniner nära byn) (`src/test/scenarier/natur.ts:66 och 609-616; 1057-1059, 620, 1126 och 2516; 215, 508 och 1963`): Kontrollerna är inga dubbletter: de prövar olika funktioner med samma tal. De kostar ingen testtid eftersom scenarierna ändå körs. Vinsten är en eller två rader.
- Versionshistorik i testernas kommentarer (`src/test/scenarier/natur.ts:247-249, 506, 515, 679, 1589, 1957-1958, 2496`): Kommentarerna hindrar att någon byter tillbaka till en by som redan prövats och inte dög. Regeln läsaren stöder sig på gäller designdokumentet. Vinsten är ett par rader.
- Långa scenarier som kör hela byar för en kontroll (`src/test/scenarier/natur.ts:110-121 och 126 (abborre), 1074-1089 (latriner), 678-681 (flatarbank), 2016-2026 (varg)`): Förslaget tar bort just det som prövas: att systemet används av byn utan hjälp. Arbetsreglerna säger att ett nytt system som aldrig används är ett fel, och det är de här körningarna som upptäcker det.
- rovarrast och rovarprat prövar nästan samma sak (`src/test/scenarier/folk.ts:2630-2657 (rovarrast, steg 10.2.24), 2886-2910 (rovarprat, steg 10.2.94)`): De hör till två olika steg och mäter med olika gäng och olika takt. En sammanslagning sparar ett tiotal rader men kan flytta gränserna i kontrollerna, så vinsten är för liten.
- Tester av gamla sparfiler (uppgradering 12 och 13) i folk.ts (`src/test/scenarier/folk.ts:1692-1695 (smidighet), 1875-1878 och 1891 (slagsmal); src/sim/varld.ts:82 och 155-161 (UPPGRADERINGAR)`): Påståendet att kedjan redan prövar dem stämmer inte: kedjetesterna har egenskaperna kvar. Åtta rader är för lite för att ta bort det enda skyddet. Designdokumentet (fliken Läget) säger inget om att gamla sparfiler får sluta fungera.
- Slå ihop rövarscenarierna som provar samma strid (`src/test/scenarier/agande.ts:2279-2304 (rovarstarkvar), 2336-2368 (rovarkommer), 2370-2452 (rovarforsvar), 2657-2716 (rovarmote), 2718-2761 (rovarstrid)`): Överlappet är några få kontroller, medan uppställningarna och det som prövas skiljer sig. Att flytta kontroller mellan scenarier som hör till olika steg ger liten vinst och risk att något slutar prövas, och ett av de fem körs inte ens i dag.
- Provet 'vanliga byar' i byte och egendom tar lång tid (`src/test/scenarier/agande.ts:238-248 (byte), 292-299 (egendom); test/scenariotider.json`): Påståendet att de tar mest tid stämmer inte; tillsammans är de ungefär två procent av scenariernas tid. Om kontrollerna (byten över noll, fler byten i mörker) håller på 4 dygn går inte att veta utan att köra, och likhetstestet prövar inte det egendom prövar (att ägarnas delar aldrig blir mer än stacken).
- Kontroller av rubriker och av det som tagits bort i gastsida (`src/test/scenarier/agande.ts:1428-1468`): Varje kontroll är provet för ett byggt och avbockat steg i Färdplanen (11.1.41 till 11.1.52), där just rubrikerna och etiketterna är det Björn beställt. Reglerna säger att text på sidan kontrolleras i stället för skärmbilder, så att testet går rött när en rubrik ändras är meningen.
- Gästscenarierna kontrollerar samma start om och om igen (`src/test/scenarier/agande.ts:3119-3154 (gastperson), 3156-3189 (rovarperson), 3191-3223 (gastvardag), 3225-3269 (handlarenIgen)`): Det gemensamma är två rader och en kontroll. Scenarierna hör till var sitt steg (9.2.111 till 9.2.114) och prövar olika saker, så en sammanslagning sparar nästan inget och gör det svårare att se vilket steg som gått sönder.
- Ta bort migrate-testerna för gamla sparfiler (`src/test/scenarier/kultur.ts:2167-2168, 2213-2214, 2241-2242, 2475-2476, 2487-2488, 2598-2601, 3900-3901; src/sim/varld.ts (UPPGRADERINGAR)`): ARKITEKTUR.md regel 3 och CLAUDE.md säger att äldre sparfiler ska fungera och att Björns sparade by ska finnas kvar; kontrollerna är korta och är det enda som vaktar just de uppgraderingarna. Designdokumentet (fliken Läget) säger inget annat. Vill Björn släppa gamla sparade byar är det ett eget beslut om registret UPPGRADERINGAR, inte en städning av testerna.
- Byt källkodsregex-test mot beteende eller ta bort dem (`src/test/scenarier/kultur.ts:972-974, 1138-1140, 1175-1176, 1190-1227, 1242-1247, 1260-1272, 3902-3907`): Kontrollerna är det enda som vaktar de stegen (11.1.4-11.1.8, 11.1.60-61, 10.9.1): det som ritas med PIXI och CSS går inte att köra utan webbläsare, och kommentaren på rad 1137 säger just det. Kontrollen i tidsord (ingen text i gränssnittet säger dygn, säsong eller klicka) är en riktig regel och ska vara kvar; ingenting visar att ui-ren eller ikoner täcker resten.
- Slå ihop begrav och begravHela (`src/test/scenarier/kultur.ts:1622-1627, 1967-1975`): De gör olika saker och ger olika svar; en flagga sparar två rader och gör hjälparen svårare att läsa.
- Sport och sportplats prövar delvis samma sak (`src/test/scenarier/kultur.ts:69-82, 142-160`): De prövar olika saker: var matchen läggs respektive hur spelarna står. Inget är dubbelt.
- Kontroll mot fasta tekniknivåer (`src/test/scenarier/kultur.ts:476`): Talen kommer redan ur registret; meningen med kontrollen är att låsa de nivåer som bestämts. Jämförs registret med sig självt kan kontrollen aldrig bli röd.
- Dela de stora blandscenarierna (`src/test/scenarier/kultur.ts:2577-2699 (buden), 2421-2510 (kyrkan), 3412-3468 (skandning)`): En delning gör filen längre, inte kortare (varje del behöver sin egen by), och scenariernas namn står i CLAUDE.md och i kartan för `riktad`. Läsaren visar inte vilka delar som skulle vara dubbla.
- Byns namn: tre scenarier ställer upp samma nybygge (`src/test/scenarier/kultur.ts:3895-4049`): ALLA-grenen är inte död: `ALLA=1 npm run scenario` står i CLAUDE.md som sättet att se mer, och här visar den namnen i tjugo byar. Uppställningen är en halv rad per ställe, och de tre scenarierna prövar olika steg (10.9.1-10.9.5); vinsten är för liten.
- Ta bort testerna för gamla sparningar och gamla generatorer (`src/test/scenarier/fas11.ts:170-172,179,592-599,610; src/sim/grannbyar.ts; src/sim/varld.ts`): Designdokumentet säger i steg 11.2.15 att en sparad by med klaner ska få sin värld, och ARKITEKTUR.md (regel 3) kräver att äldre sparfiler fungerar. Spelet publiceras till samma länk just för att den sparade byn ska finnas kvar.
- Testerna läser händelseloggen (`src/test/scenarier/fas11.ts:1927,1938,2689,5014`): Regeln gäller att räkna hur ofta något hänt ur loggen, som bara rymmer 400 rader. Här är det själva loggraden som prövas, i korta scenarier med några få rader, så statistiken kan inte ersätta det.
- Ett test söker efter ord i källtexten för världskartans knapp (`src/test/scenarier/fas11.ts:7,398-400,413`): Det är det enda som prövar att knappen till världskartan finns alls, och sättet är det vanliga i projektet för det som bara finns i gränssnittet. Jag hittade inget annat scenario som täcker den knappen.
- Slumpgeneratorn mulberry finns som en egen rad i testfilen (`src/test/scenarier/fas11.ts:2586 (används på 2573,4208,4247,4294,4364); src/portrattkarna.ts:4309`): Det är en enda rad, och den andra kopian ligger i bildkoden som inte ska hänga ihop med testerna. Vinsten är för liten för att röra det.
- Scenariot reslikhet överlappar npm run likhet (`src/test/scenarier/fas11.ts:2221-2252; src/test/likhet.ts`): Steg 11.5.19 i Färdplanen säger både 'Likhetstestet får en by med en resa' och 'Scenario reslikhet', så båda är önskade. Scenariot prövar dessutom ett tredje sätt att räkna och körs i det stora testet också när likhetstestet inte körs.
- Kontroller som bara ser efter att en rad står i sitt register (`src/test/scenarier/fas11.ts:174,457,1579,3755,3822,4911`): Hälften av raderna prövar något på riktigt, och raden om takterna vaktar en regel i CLAUDE.md. Tre rader är för lite att vinna.
- 'Samma rad ger samma by' prövas i åtta väckt-scenarier (`src/test/scenarier/fas11.ts:4508,4912,4941,4965,4998,5025,5076,5118`): Jämförelsen av hela byn täcker inte fälten, djuren, tron och skogen, eftersom den byn inte har dem. Att samma rad alltid ger samma by är grunden för likheten mellan levande läge och ikappräkning, och vinsten är en rad per scenario.
- 61 likadana rader i TAKTER för det som räknas varje timme (`src/sim/steg.ts:436-526, 616, 638`): Arbetsreglerna säger att varje system ska ha sin egen rad i TAKTER, och kostnaden mäts per rad. Hjälparen gör raderna kortare men inte färre, så vinsten är för liten.
- Samtalen letar grannar åt alla varje slag (`src/sim/steg.ts:566-583; src/sim/samtal.ts:172 (horHar)`): Det dyra (väggen emellan) räknas redan bara för dem som står nära, så vinsten är troligen liten och är inte mätt. Priset är att alla byar får en annan utveckling.
- Ett tjugotal KLAR-rader som bara byter argument, och importer i slutet av filen (`src/sim/steg.ts:267-268, 306-327, 1732-1738, 1749-1755; src/sim/torst.ts:73-78; src/test/scenarier/fas9.ts (anropar mataKlar, hageKlar, klippKlar med flera direkt)`): Påståendet om smalta stämmer inte: raden behövs. Att byta argument i tjugo funktioner i tolv filer och deras scenarier sparar ett tiotal rader, och det är för liten vinst för risken.
- Gå i lära väljs på tre ställen och pröva sig fram på två (`src/sim/val.ts:573-577, 601, 1336-1341, 1387-1388; talen 159, 162, 174`): Lärans vikt på fritiden är steg 10.11.12, som Björn sa ja till i förra genomgången (fynd 11). Designdokumentet beskriver dessutom lärandet både på Förbättra och i handarbetet. Att ta bort en väg vore att riva något som nyss beställdes.
- bestWork räknar två poäng för samma arbete (`src/sim/val.ts:1197-1220, 604, 610, 832, 922, 1074`): Dubbleringen finns, men förslaget ändrar balansen i hela byn för att spara åtta rader. Det enda ofarliga är att räkna det gemensamma uttrycket en gång (två rader), och det är för lite för ett eget fynd.
- Sex olika tal dämpar arbete när kylan eller hungern är en fara (`src/sim/val.ts:121-123, 550, 789, 1056, 1072, 1297, 1305, 1340; PROJEKT_TAL.kyla i src/sim/projekt.ts:64`): Talen är olika med flit (steg 10.2.6 och 10.11.20): att bära in mat räddar något, ett projekt gör det inte. Designdokumentet beskriver dem också var för sig. Ett gemensamt tal är en balansändring för liten vinst.
- Arbetarna på en rad räknas om många gånger i samma val (`src/sim/val.ts:527-538, 843-868, 884, 905, 1120, 1212, 1267`): Det stämmer, men kostnaden är mycket liten: några hundra enkla jämförelser per val, och ett val görs sällan. Samma val gör mycket dyrare saker. Utan en mätning med npm run kostnad som pekar ut det är vinsten för liten.
- SNABBARE 2,25 gångras in på åtta ställen (`src/sim/handlingar.ts:7-11; src/sim/ekonomi.ts:39; fynd.ts:696, 747; odling.ts:677; varde.ts:55, 67; skog.ts:49; eld.ts:510, 526`): Det stämmer att konstanten är en historisk rest, men sex sparade rader väger inte upp att allt arbete, värdet och facit rörs och att ändringen inte går att kontrollera med samma-kollen.
- Handlingsregistret upprepar samma fält på hantverksraderna (`src/sim/handlingar.ts:165-285`): Det stämmer i stort (97 rader, inte 108), men inga rader sparas och registret blir svårare att söka i när en del rader skrivs ut och andra går genom en hjälpare. Vinsten är för liten för att röra över hundra rader.
- Platsen ute söks med 260 slumpade rutor i varje val (`src/sim/val.ts:102, 355-367`): Kostnaden är inte mätt och troligen liten, och förslaget ändrar var folk arbetar. Risken är större än vinsten.
- Fältens gamla sparformat lever kvar (`src/sim/odling.ts:127,178-211; src/sim/varld.ts:151; src/sim/projekt.ts:324; src/ui/flikar/falt.ts:18,24,25; src/ui/foremal.ts:157`): Björns sparade by ska finnas kvar, och alla andra gamla omvandlingar i varld.ts står kvar. Ett tjugotal scenarier bygger dessutom fält på det gamla sättet och litar på rutorAv. Vinsten är liten mot risken.
- Fähusets platser räknas på ett sätt och djuren ställs in på ett annat (`src/sim/slatter.ts:122-145; src/sim/forradsmal.ts:306; src/sim/byggnader.ts:516`): Skillnaden är avsiktlig: huset räknas av byggplanen och krubban skaffas sedan av förrådsmålen. Att fahusOf räknas om för varje djur en gång i timmen kostar nästan inget med ett par tiotal djur.
- Marginalen för vinterfodret tar ut sig själv (`src/sim/slatter.ts:58-61; src/test/scenarier/fas9.ts:2029`): Marginalen gör skillnad för ängens storlek, så talet är inte verkningslöst. Sättet det står på ger en äng med marginal som inte genast räknas som för liten; det ser avsiktligt ut och scenariot prövar just det. Osäkert att det är ett fel.
- En ny ängs nummer kan krocka med en gammal (`src/sim/slatter.ts:53,73,84`): Numret används inte till något, så en krock har ingen följd. Det finns inget fel att rätta.
- Ett nytt fält skapas på två ställen (`src/sim/odling.ts:272-287,435-451`): Det gemensamma är för litet för att en egen funktion ska göra koden kortare eller tydligare.
- Små slingor i slingor i fältens timsteg, och bryggvalet utan tidig utgång (`src/sim/odling.ts:595,784,857; src/sim/brygg.ts:52-79; src/sim/vatskor.ts:91,96`): Slingorna stämmer men går över små fält en gång i timmen, så vinsten går knappast att mäta. Ingen mätning finns som visar att något av det kostar.
- Binas drag räknas på två olika sätt (`src/sim/bin.ts:114-151; src/ui/flikar/station.ts:26; src/sim/stationer.ts:634`): De två sätten svarar på olika frågor: det ena ger delarna per källa som kupans ruta visar, det andra en snabb summa för många platser. Det snabba sättet kan inte ge delarna, så det går inte att behålla bara det.
- Röjning, grävning och plantering räknas om från grunden vid varje fråga (`src/sim/skog.ts:68-82, 87, 100-101, 176-182; src/sim/skogsvard.ts:45-90; src/sim/projekt.ts:283, 291, 299, 301, 383-388`): Den dyraste frågan (bristen) sparas redan. Att spara listan över träd är riskabelt: den ändras inte bara när något byggs utan också när ett träd växer upp eller fälls, så en sparad lista kan bli fel. Ingen mätning visar att det kostar något.
- Hönsköpet räknar med delar av hönor (`src/sim/hons.ts:55-70`): Antalet som flyttas är redan hela hönor. Faktorn behövs för att dela minskningen mellan ägarna, och 'just de hönornas ägare' går inte att peka ut i en stack. Vinsten är ett par rader.
- Jaktens slut har tre nästan lika grenar för flockdjur, fågel och kanin (`src/sim/jakt.ts:275-301`): Grenarna skiljer sig mer än läsaren skrev: styckningen, hur bytet bärs, tecknet, bettet, vilken färdighet som övas och hur mycket blod. En tabell skulle behöva nästan lika många fält som det finns rader i dag.
- Omvägar runt balanstal som aldrig ändras (`src/sim/bin.ts:73-74, 252-257; src/sim/trad.ts:32-36; src/sim/balans.ts:22-34`): Inga rader sparas: omvägen står på samma rad som talet. De två chanserna som är 1 är balanstal med avsikt, så att de kan prövas med ett annat värde utan att koden ändras.
- De uppretade bina letar igenom alla bon och stationer varje slag (`src/sim/bin.ts:156-159, 300-327; src/sim/steg.ts:466`): Det läsaren föreslår finns redan i praktiken: utan strid och utan uppretade bin gör funktionen nästan ingenting. Kostnaden under en strid är liten (en ruta på 7 × 7 per kämpe) och ingen mätning visar något annat.
- Tre varianter av samma uträkning för hur rikt ett fynd är (`src/sim/fynd.ts:339-357, 525-563`): Varianterna finns med avsikt för fartens skull och är skrivna så att talen blir exakt lika. Om den enkla anropar den snabba byggs förberedelsen om för varje ruta, och minsta skillnad i avrundning gör att spelet och ikappräkningen går isär.
- De vilda växterna har liknande rader för var de växer (`src/sim/fynd.ts:199-247`): Bara två par är lika, så en gemensam funktion sparar ett par rader. I dag står varje växts regel på växtens egen rad, vilket är lätt att läsa och ändra.
- Ett jaktförsök bygger upp en hel strid för att räkna ett enda slag (`src/sim/jakt.ts:149-255 (särskilt 187-197)`): Stridens funktioner behöver båda kämparna med alla sina värden och stridens tillstånd (vind, dimma, slump), så de tio raderna som bygger upp dem behövs ändå. En ombyggnad av stridsfilen för några få rader är inte värd risken.
- En ensam giftsvamp 'förfaller lite': rester av en resurs i decimaler (`src/sim/fynd.ts:725, 735; src/sim/saker.ts:75`): Decimalerna kommer från hur all mat ruttnar i förrådet, inte från svampkoden, så det går inte att rätta här. Kollen av 'första gången' gör redan samma sak som den vanliga hjälparen, eftersom räknaren räknas upp två rader ovanför.
- Gångfarten räknas på två ställen som måste hållas lika för hand (`src/sim/gang.ts:49-77, 85-98; src/sim/steg.ts:900-909`): Läsarens bild stämmer inte: registret används av steget, och bara en halv rad om snön är dubbel, med flit för att gången räknas i den hetaste slingan. Vinsten är en rad och vakten kan inte tas bort.
- Tre egna prioritetsköer för vägsökning (`src/sim/vag.ts:49-83 (Heap); src/sim/vagval.ts:36-50; src/sim/varldmark.ts:154-159 (Hog)`): Bara två av de tre är lika; den tredje har en egen ordning som världen bygger på. Det som går att dela säkert sparar ungefär tio rader, och det är för lite för risken att vägar eller världen blir andra.
- Två testknappar tänder eld med nästan samma kod (`src/sim/brand.ts:269-288 (tandTest), 304-325 (blixtTest)`): Knapparna gör olika saker och har olika texter; det som går att dela är ungefär fem rader, inte tjugo. Vinsten är för liten.
- Larmet 'ser faran och söker skydd' är skrivet en gång för branden och en gång för tornadon (`src/sim/brand.ts:531-545; src/sim/tornado.ts:481-494; src/sim/varg.ts:320`): Stämmer att de liknar varandra, men de är korta och skiljer sig på flera punkter, så en gemensam funktion får många värden och sparar bara ungefär fem rader.
- Samma skademönster upprepas fyra gånger (`src/sim/brand.ts:552-557, 598-601, 777-783; src/sim/tornado.ts:433-438`): Bara två rader per ställe är lika, och en hjälpfunktion skulle behöva sex–sju värden. Koden blir inte enklare.
- hardKyla räknar om det hardVinter redan räknar (`src/sim/vader.ts:85-97; src/sim/motgang.ts:104`): Talet VADER.hardGrader finns inte; graderna slumpas per vinter. Förslaget som det står skulle dessutom räkna året två gånger i temperaturen, som är en av de mest frågade funktionerna. Vinsten är två rader.
- Samma slumptal används för två olika saker i samma slag (`src/sim/brand.ts:564 och 596 (salt 3869), 475, 478 och 778 (salt 3865, 3866)`): Numren delas, men det ger ingen mätbar skillnad i chanserna. Att byta dem ändrar bara enskilda utfall och facit utan nytta.
- Kod som bara finns för gamla sparfiler och för tester (`src/sim/tornado.ts:85, 95, 156, 212, 294; src/sim/gang.ts:99 (kroppFaktor); src/sim/brand.ts:196 (brandKant); src/sim/varldmark.ts:76 (markAt); src/sim/is.ts:53`): Stämmer i detalj, men det är fem rader, skydden hindrar en krasch i äldre sparfiler (regel 3) och brandKant måste ligga kvar. Aliaset och det överflödiga villkoret kan tas med när filerna ändå ändras.
- Arbete varje timme och varje slag som oftast inte behövs (`src/sim/flod.ts:74-84, 119-123, 132-142; src/sim/motgang.ts:144-148, 177; src/sim/brand.ts:223-230`): Det mesta körs en gång i timmen och kostar nästan ingenting; ingen mätning (npm run kostnad) visar att det syns. Fler villkor för att slippa det ger mer kod och risk för fel utan märkbar vinst.
- Kämparegistret har sex flaggor som alla betyder 'är ett djur' (`src/sim/kampar.ts:1-29, 44-46; src/sim/strid.ts:359, 362, 376, 500, 570, 618, 663, 671, 784, 842, 984`): Registret är byggt just för att kommande sorter (drake, gnomer, väsen, står i filens rubrik och i avsnittet Kämpar ur ett register) ska vara en ny rad och inte ny kod i striden. Slås flaggorna ihop måste de delas igen då; vinsten är tio rader.
- Slagets längd jämför alla par av bybor varje slag (`src/sim/kartstrid.ts:99-115; src/sim/rovare.ts:831, 920; src/sim/gast.ts:185`): Det tidiga avbrottet finns redan, så de drygt 3 000 avstånden per slag räknas sällan. Utan mätning är vinsten en gissning, och att ta bort rövarnas rad i SLAGHINDER kan ändra slagens längd och därmed byarnas utveckling.
- Tre sätt att fråga om någon är med i en strid (`src/sim/kartstrid.ts:65, 141-142; src/sim/rovare.ts:467, 912`): Påståendet om dubbelprövningen i kartStridMed stämmer inte, och de tre frågorna är inte likadana. Vinsten är en eller två rader mot en liten risk att rövarnas beteende ändras.
- Vargflocken har en egen gång och vägsökning bredvid rövarnas (`src/sim/varg.ts:150-191 (ga, SNETT, vagg); src/sim/rovare.ts:221-260 (gaMot)`): De två gör inte samma sak: gaMot är byggd för en person med gästdata och söker väg vid varje nytt mål, medan flocken byter mål ofta och går rakt utan sökning. En hopslagning ger fler vägsökningar, annan fart och flera särregler, för omkring 30 rader.
- Om ett rum är stängt räknas om för varje person varje slag (`src/sim/varg.ts:412-429 (stangt, iStangt, stangd), anropade från 330, 374, 450, 179 och 167`): Kostnaden är mindre än läsaren räknade med, och den är inte mätt. Ett sparat svar kan bli gammalt inom slaget (flocken flyttar sig, någon börjar gömma sig), så risken är större än den osäkra vinsten.
- Stölden ur förrådet har kvar ett gammalt villkor om byns första eld (`src/sim/varg.ts:394 (jämför 363-370, 379-380 och narmasteEld 133-137)`): Stämmer inte att den nya regeln gör samma sak: en flock som smyger bryr sig inte om eldar, så det gamla villkoret är det enda som låter elden skydda förrådet. Det enda som stämmer är att bara byns första eld räknas.
- Samma mönster två gånger: kvällens lagförslag och kvällens trosfråga (`src/sim/lagar.ts:184-199; src/sim/kyrka.ts:431-449`): Likheten finns, men skillnaderna är så många att en gemensam funktion sparar några rader och blir svårare att läsa. Vinsten är för liten; läsarens tjugo rader stämmer inte.
- Tre olika sätt att räkna ut trons veckodag (`src/sim/kyrka.ts:300, 512, 527`): Formlerna är olika, men var och en fungerar. Två rader sparas och byarna utvecklas annorlunda; vinsten är för liten för det.
- Buden tacka, hälsa och födelse är samma dagliga påslag med tre namn (`src/sim/kyrka.ts:506-510`): Läsaren har delvis fel: födselbudet är kopplat till födslar och dödsfall, och de tre buden går redan genom en gemensam funktion. Att knyta tacka och hälsa till måltiden och morgonen vore ett nytt steg i Färdplanen, inte en förenkling.
- Legitimiteten räknas om från grunden vid varje fråga om ett påbud (`src/sim/styre.ts:264-296; src/sim/val.ts:516, 1180; src/sim/forradsmal.ts:116`): Ingen mätning visar att det kostar något, och slingan är billig. Ett sparat värde riskerar likheten mellan lägena. Fasens kodgenomgång mäter med npm run kostnad och tar det då om det syns.
- Trons skalor: samma koll tre gånger i timmen (`src/sim/religion.ts:109-113, 132-138, 471-477; src/sim/kyrka.ts:451-471`): Kollen körs bara tills skalorna öppnats, och bara i byar med en tro. Ingen mätning visar en kostnad, och ändringen flyttar när skalor öppnas. Vinsten är för osäker.
- sattPabud gör nästan ingenting (`src/sim/styre.ts:297-304, 616`): Funktionen är liten men gör det den ska, och har en kommentar som förklarar varför. Vinsten är två rader.
- Sökningarna efter närmaste ruta liknar varandra (`src/sim/grav.ts:86-99, 138-146, 287-302; src/sim/kult.ts:140-141`): Hälften av funktionerna är inga sökningar efter närmaste ruta, och de tre som är det har egna regler som en gemensam funktion måste ta som inställningar. Vinsten är några rader mot risken att gravar hamnar på en annan ruta.
- Ryktbarheten räknas om från grunden (`src/sim/rykten.ts:455-460, 504-540; src/sim/folk.ts:203; src/sim/styre.ts:203`): s.kanda saknar anseendet, så funktionen måste ändå gå igenom intrycken. Anropen sker sällan, och ett gammalt tal ändrar vem som räknas som legend; vinsten är inte mätt och för liten för det.
- Balanstal och omvägar som inte gör något (`src/sim/rykten.ts:37, 44-45, 100, 301, 579; src/sim/grav.ts:465; src/sim/kult.ts:38; src/sim/trotext.ts:11`): Två av påståendena stämmer inte: vMax och vTak är inte samma tal, och ett balanstal som står på 1 är inte dött. Resten sparar ett par rader mot ändringar i många filer, och reserven i kroppBud skyddar kroppar som saknar sparade bud.
- En tappad kropp börjar om sin tid (`src/sim/kvarlevor.ts:40, 73`): Raden stämmer, men det är osäkert att den är ett fel: utan den nya tiden skulle en gammal kropp som tappas försvinna samma timme, innan någon hinner ta upp den igen. Det händer sällan och märks knappt.
- Gravvården och gravbesöket räknar lite för mycket vid varje val (`src/sim/grav.ts:400-412, 515-532`): Det som räknas är små saker, och ingen mätning visar att det kostar datortid. Fasens kodgenomgång mäter med npm run kostnad och tar det då om det syns där.
- Flytten av gamla sparfiler läser händelseloggen (`src/sim/varld.ts:101-102`): Regeln förbjuder att spelet och testerna räknar ur loggen. Det här är engångsflytten som gjorde att de slutade, den är redan kommenterad, och den skyddar Björns sparade by.
- Uppgraderingen migrateTek för de allra första sparfilerna (`src/sim/teknik.ts:461-467; src/sim/varld.ts:7, 82-103`): Läsaren har fel om att den körs vid varje laddning: migrate kör bara uppgraderingar som är nyare än byns nummer. Regel 3 i ARKITEKTUR.md säger att äldre sparfiler ska fungera, och åtta rader är för liten vinst för att bryta en bit ur den äldsta uppgraderingen.
- Rollen vid larm sparas och ogiltigförklaras fast den går att räkna direkt (`src/sim/roller.ts:8-26; src/sim/rovare.ts:407-423, 430; src/sim/varg.ts:309; src/sim/halsa.ts:410; src/sim/liv.ts:142; src/sim/typer.ts:201, 459; src/ui/flikar/person.ts:351; src/test/scenarier/fas9.ts:453-467`): Designdokumentet (Tre roller vid larm, steg 9.5.19) säger att rollen väljs när larmet går och prövas om när något händer, och scenariot kontrollerar det. Sparandet gör också att viljan, som går igenom alla levande för varje person, inte räknas vid varje val under ett larm. Vinsten är ett tiotal rader mot risk för fladder mellan roller och ändrad likhet. Den oanvända rovarRoll tas i fyndet om död kod.
- Bakåtkompatibilitet i framträdandets fält som inte längre behövs (`src/sim/framtradande.ts:141, 147, 403, 425, 438, 450, 467; src/sim/framber.ts:19, 27; src/ui/flikar/fram.ts:40, 58`): Det sparar bara några tecken per ställe och kräver en ny rad i uppgraderingen och ändrade tester, så koden blir inte kortare. Skydden är ofarliga, och Björns sparade by ska alltid gå att öppna.
- Två listor per person över det som hänt: p.fame (fri text) och personloggen (`src/sim/berattelser.ts:2284-2286, 2496-2498; src/sim/personlogg.ts:48-54; src/sim/kyrka.ts:465-466; src/ui/flikar/person.ts:633-636; src/sim/steg.ts:1579-1580`): De två listorna gör olika saker: en sparas för alltid och en rymmer bara de 30 senaste raderna. Bara sex av 23 ställen skriver dubbelt, så vinsten är liten mot en uppgradering av alla sparade byar och ändringar i helgonen och testerna.
- Samma händelse skrivs för hand i upp till fem kanaler (`src/sim/notiser.ts:82-98; src/sim/historik.ts:64-73; src/sim/berattelser.ts:2574-2593; exempel: src/sim/giftermal.ts:49, src/sim/kult.ts:187, src/sim/rost.ts:290`): Det är en ombyggnad av flera hundra ställen för en osäker vinst, och kanalerna har olika text och olika syfte (kort loggrad, berättande krönika). Felet som faktiskt finns, slag som glidit isär, rättas billigare med fyndet om krönikans kategorier och en fast kontroll.
- Små dubbla vägar: binamnens takt och historikens kolumner (`src/sim/berattelser.ts:2155-2156 mot src/sim/steg.ts:474; src/sim/historik.ts:78 mot 127-130 (historikKolumner); src/sim/varld.ts:266 (uppgradering 24)`): Vinsten är några rader. Att flytta takten ändrar när binamnen ges och kräver nytt facit och ändrade tester (scenariot rundar tiden till sex timmar), och uppgraderingen är en numrerad rad som ändå måste stå kvar.
- Textminnet i beskrivningen: tät reguljär kod för två till fyra meningar (`src/sim/berattelser.ts:2249-2283 (borjan, HORS, mening, namnMinne), 43 (BERATT.delar), 2504-2524 (eftermälet använder samma)`): Textminnet är ett byggt steg (6.7.3) som gör texterna bättre, och det används också av eftermälet. För att spara 25 rader skulle hundratals malltexter skrivas om och texten bli sämre.
- Vagnen i sällskapet finns inte: sl.fordon fylls aldrig (`src/sim/resa.ts:142, 166, 195, 203, 1494-1497; src/sim/vagran.ts:72`): Stämmer i koden, men Färdplanen har redan steg 12.1.10 (Vagnen och packdjuren på resorna) som säger just detta: i dag följer fordonen aldrig med, och utvägen med vagnen ska kunna väljas. Avsnittet Farten i tal räknar också upp utvägen. Vinsten är sex rader som sedan ska tillbaka.
- Gömmorna hämtas aldrig av någon (`src/sim/resa.ts:138, 607, 1485, 1507-1518; src/ui/varldskarta.ts:97, 240; src/test/scenarier/fas11.ts:2157-2172`): Stämmer i koden, men Färdplanen har redan steg 12.1.9 (Gömmorna längs leden) som säger att sakerna i dag ligger kvar och att en senare resa ska kunna hämta dem. Gömman står också i avsnittet Farten i tal och prövas av scenariot utvagar.
- fardFram: lång kedja av villkor över färdens flaggor (`src/sim/byhandling.ts:278, 448-478`): Flaggorna går inte att byta mot ett enda slag: ett bud bär både besked och gåva, och fallen delar slutet (vägen hem). Sparade världar har färder med de gamla flaggorna och skulle behöva en uppgradering, och andra filer läser flaggorna. Vinsten är några rader mot en verklig risk.
- Viktat slumpval skrivs ut på fem ställen (`src/sim/byflytt.ts:189-190, 203-204, 221-222; src/sim/byhandling.ts:430-431; src/sim/resa.ts:1253-1254; src/sim/slump.ts:66-72 (pickViktat)`): Läsaren missade att slump.ts redan har pickViktat. Den drar ur byns slump, medan fyra av de fem ställena drar ur världens slump och inte kan använda den. Ställena skiljer sig dessutom i kantfallen (första eller sista raden om talet tar slut, hela tal i resa.ts), så en gemensam funktion sparar tre rader och kan rubba samma-kollen.
- Uppdragsregistret har fyra fält som ingen kod läser, och rader som inte utlyses (`src/sim/uppdrag.ts:63-83, 198; src/sim/skrift.ts:406; src/test/scenarier/fas11.ts:3448-3465`): Stämmer i koden, men avsnittet Uppdragen i tal säger att registret ska ha just de fälten och de sju raderna, och Leveransen är ett obyggt steg i Färdplanen (11.8.10). Fälten står på samma rad som resten, så nästan inga rader sparas.
- Byläget 'lyder' och händelserna 'ran' och 'bruten' används inte (`src/sim/byrel.ts:23-24, 41, 45, 49, 88-92`): Stämmer i koden, men steg 11.6.22 säger att registret har fred, krig och lyder under, stegen 15.5.1 och 15.5.2 (tribut och vasaller) ska använda läget, och avsnittet om relationen mellan byar räknar upp rån och bruten överenskommelse. Fyra rader är inte värt att ta bort och skriva igen.
- Sändebudets besked rensas innan sällskapet kommit iväg (`src/sim/resa.ts:1016-1020, 1058; src/sim/sandebud.ts:50-58`): Stämmer att beskedet försvinner, men sandebud.ts väger ett nytt bud varje dygn (ett år i spelet) när byn inte har något, med samma poäng. Ledaren och kyrkan bestämmer sig alltså igen nästa dygn, så inget går förlorat på riktigt.
- Packbehovet och resenärerna räknas om många gånger i onödan (`src/sim/resa.ts:281-292, 621, 654-657, 1042-1047`): Packbehovet kan inte räknas en gång per kallelse: det beror på vilka som är med, och det ändras för varje ny resenär. Kallelsen sker en gång per resa och sällskapen är få och små. Projektets regel är att kostnaden mäts innan något optimeras, och här finns ingen mätning.
- Sju krok-objekt för att komma runt importcykler (`src/sim/resa.ts:479, 694, 696, 1137, 1139, 1463; src/sim/byhandling.ts:212`): Krokarna tar olika argument och några ger tillbaka ett svar, så ett gemensamt register skulle behöva lika många olika former som i dag. Samma mönster används i ett sextiotal filer i projektet. Inga rader sparas.
- Gamla klaner i nyaGrannbyar finns bara för en gammal uppgradering (`src/sim/grannbyar.ts:54-82, 95-100; src/sim/varld.ts:71, 448`): Uppgraderingarna är en kedja som ska hålla sparade byar vid liv, och den här är ett led i den. Funktionen nyPlats används dessutom av nyGrannby (scenarierna och utbrytningen), så den kan inte tas bort. Det som blir kvar att spara är ett par rader.
- Två krokar i rad för samma sak när byn plundrats (`src/sim/byhandling.ts:499; src/sim/vagran.ts:30; src/sim/vaktat.ts:59-60; src/sim/utlysa.ts:92`): Den andra kroken finns för att undvika en importcirkel, och vinsten är ett par rader. Läsaren pekade dessutom på fel fil för anropet.
- Hindret för slaget letar igenom alla människor varje slag efter gäster (`src/sim/gast.ts:116, 185`): En genomgång av folket per slag kostar nästan ingenting bredvid resten av slaget, och ingen mätning visar något. Vinsten är för liten för att vara ett eget fynd.
- Vattenhon letas upp bland alla stationer för varje djur (`src/sim/vattenho.ts:29-33; src/sim/djurtorst.ts:27, 44, 53`): Koden är som läsaren säger, men talen är små (få hoar, få djur) och ingen mätning visar att det kostar något. En ny cache ger mer kod och en ny sak som kan bli gammal; mät med npm run kostnad först.
- Gallringen av byarnas historik är mer invecklad än den behöver (`src/sim/ort.ts:236-240 och 258-262; src/test/scenarier/fas11.ts:1384-1410`): Fyra rader sparas, men beteendet står i designdokumentet och prövas av ett scenario som då blir rött. Vinsten är för liten för att ändra något som är beskrivet och fungerar.
- Priset i två led ger nästan alltid bara sakens egen brist (`src/sim/priser.ts:59-65, 105-120`): Räkningen stämmer, men vinsten är åtta rader. Designdokumentet (steg 11.6.2, Priset och handeln mellan byar) beskriver priset i två led, byarna i världen och prisminnet följer samma uppdelning, och priset skulle ändras i fler fall än läsaren räknat med.
- Fyra bokföringar för delar av saker (påbörjat, förlust, andelsrest, arbete) (`src/sim/lager.ts:316-391, 660-704, 1154-1168; de som lägger delar: src/sim/redskap.ts:180-186 (stycka), src/sim/eld.ts:146 (giveBack), src/sim/hamtning.ts:147; vakten i src/test/kor.ts:61; sparningen i src/sim/varld.ts:204-205 och src/sim/steg.ts:1639`): Delarna kommer ur ägandet och delningen (flera ägare av ett djur, byns andel), inte bara ur slarv hos anroparna. Att ta bort dem kräver nya regler för vem som får det hela och rör ett fyrtiotal anrop, så risken är för stor mot vinsten. Läsaren var själv osäker.
- Den som äter går igenom alla stackar flera gånger för varje matslag (`src/sim/lager.ts:555-559 (stored), 757 (skickAv), 761-779 (takeFood), 172-187; anropet i src/sim/behov.ts:100`): Genomgångarna finns, men en måltid är sällsynt jämfört med allt som räknas varje slag, och ingen mätning (npm run kostnad) visar att den kostar något. Koden blir längre och inte enklare, så vinsten är för osäker.
- Kroken satPersonFlytt finns av ett skäl som inte gäller längre (`src/sim/byte.ts:4, 7, 85-93, 149-158; src/sim/handel.ts:647-656, 936-940`): Det stämmer att kommentaren är gammal, men vinsten är åtta rader. byte.ts hämtar i dag bara typen ur agande.ts; att hämta newTing på riktigt lägger till en ny koppling mellan filer som redan laddar varandra i ringar (se kommentaren i behov.ts rad 149-150), och då kan ordningen de läses in i gå sönder.
- Budgeten delar ut i två nästan likadana varv, ett för material och ett för mat (`src/sim/budget.ts:47-55 (BudgetDef), 79-102, 167-210 (budgetDygn, matDygn)`): Varven liknar varandra men gör olika saker: maten har ett gemensamt tak över alla matslag och resten låses, materialen har ett tak per slag. Ett gemensamt varv behöver särfall för just det, så koden blir knappast enklare, och risken att fördelningen ändras är större än vinsten på tio rader.
- Skuldens styrka räknas om varje timme ur fem faktorer (`src/sim/skuld.ts:33-46 (bryr, skam, angerV), 48-63 (angra, angerTim)`): Designdokumentet (Skuld och förlåtelse, steg 10.8.1) säger att styrkan räknas om en gång i timmen och växer med andelen som känner till händelsen. Förslaget tar bort den delen för fyra rader, och omräkningen gäller bara de få som bär en skuld, en gång i timmen.
- Testkrokar ligger i spelkoden (`src/sim/halsa.ts:210, 219, 408, 411, 426, 429; src/sim/forlossning.ts:34, 61; src/test/scenarier/behov.ts:727-733, 1027-1031; src/test/scenarier/folk.ts:184; src/test/scenarier/fas10.ts:882`): Krokarna finns, men alla tre används av scenarier, och att ersätta dem med BALANS-tal ändrar hur slumpen dras i scenarierna (i dag dras ingen slump när kroken är på). Vinsten är ett par rader mot risken för röda scenarier.
- Gåvor och lån av redskap skrivs två gånger (`src/sim/behov.ts:258-261, 295-311, 434-445, 499, 528-541`): Läsarens påstående att kretsen() ger samma lista stämmer inte (den sorterar bort de osams och de ovilliga), och rad 528 är en avsiktlig snabbare form av needsTool enligt kommentaren. Det som blir kvar är några rader mot risken att byarna ändras.
- Näringen räknas om många gånger per person och slag (`src/sim/naring.ts:56-60, 97-105, 121-131`): Varje anrop är mycket billigt, och ingen mätning visar att det kostar något. Ett sparat värde på personen kan bli gammalt när mättnaden sätts direkt (testerna gör det), vilket är just det kontrollen i dag skyddar mot.
- Valet av vem som vårdas räknar samma sak flera gånger (`src/sim/halsa.ts:676-705`): Det läsaren föreslår (hoppa tidigt över de friska) görs redan på rad 690, och det dyra räknas sist och sällan. Kvar blir en dubbel uträkning som inte märks.
- Två sätt att hitta vatten man når (`src/sim/torst.ts:115-149, 157-175`): De två kartorna täcker olika fall, och koden runt omkring har en historia av att folk törstat ihjäl. Tolv rader är för liten vinst för den risken.
- Registret DRICKA gör lite nytta (`src/sim/torst.ts:66-85, 177-189; src/sim/steg.ts:265; src/sim/paborjat.ts:38, 55`): Registret gör nytta: det säger vilka handlingar som är att dricka och hur länge de tar, och principen är att sådant står i ett register. Att flytta in valet i raderna sparar nästan inga rader.
- Sjukdomarnas fält vard, orsak och utifran läses inte av spelet (`src/sim/sjukdom.ts:27-41, 42-78; src/test/scenarier/sjukdom.ts:12`): Fälten är beskrivningen av sjukdomen i registret, som filens huvudkommentar och scenariot räknar med, och de tar inga egna rader (de står på radernas befintliga rader). Vinsten är nästan noll.
- Byns andel av en sak räknas på två sätt (`src/sim/behov.ts:178, 602; src/sim/lager.ts:197-199`): Jag kan inte visa att de två sätten alltid ger samma svar, och vinsten är en rad. Byns del styr handeln och projekten, så en skillnad märks.
- Förväntningarna i humöret räknar byns förmögenheter varje timme (`src/sim/humor.ts:310-333; src/sim/varde.ts:120; src/sim/steg.ts:444`): Förväntningarna är ett byggt och önskat steg i Färdplanen (3.2.1), och en gång i timmen är redan en långsam takt. Ingen mätning visar att det kostar något, och läsaren var själv osäker.
- Smutsfläckarna är ett register med en enda sort (toa) (`src/sim/smuts.ts:52-58,81-100,124,172,199,221, src/sim/rum.ts:110, src/ui/smuts.ts:12,37, src/ui/flikar/station.ts:103, testerna natur.ts:1100 och hjalp.ts:141`): Stämmer i sak, men vinsten är liten: sparade byar, ritningen, två tester och ARKITEKTUR.md måste ändras, och projektets regel är att det som kan bli fler ligger i ett register. En ny sorts fläck blir då dyrare att lägga till.
- living() och byId() går igenom alla människor, också de döda, vid varje anrop (`src/sim/folk.ts:232,235,245-262`): Läsaren har inte mätt, och jag fick inte köra npm run kostnad. Död, flytt, resa och gäst skrivs direkt i personens fält på många ställen, så en sparad lista blir lätt gammal och ger fel som är svåra att hitta. Tas i fasens kodgenomgång om mätningen pekar ut det.
- Utflyttningen har en slumpspärr 'ungefär en gång i timmen' i stället för en egen takt (`src/sim/liv.ts:230-240, src/sim/steg.ts:591`): Det som står stämmer, men det är inget fel i dag: chansen är per tid och varvet är alltid 60 sekunder. Tre rader sparas mot att alla byars slump för flytt ändras.
- Vilka färdigheter man kan börja med står som en lista namn i ett villkor (`src/sim/folk.ts:279-287, src/sim/relationer.ts:182, src/sim/typer.ts:79`): De två listorna är inte samma lista (åtta mot två, med olika mening), och det finns inget färdighetsregister att lägga flaggan i. Att bygga ett ger fler rader, inte färre.
- Bördans fördelning prövar alla kombinationer av det man bär (`src/sim/utrustning.ts:107-165,215-227`): Reglerna för händerna och ryggsäcken står i designdokumentet och är byggda och testade (scenarierna ryggsack och axelrem, npm run takt). Uträkningen är liten i praktiken, och bältet ger ingen bärförmåga alls, så förslaget bygger delvis på fel bild.
- Egenskaper och namn slumpas med två kopior av samma fördelning (`src/sim/folk.ts:316-348, src/sim/radperson.ts:38,44`): newPerson kan inte bara anropa egenskaperUr: den har arv och två slumpföljder som den andra saknar. Det som går att dela är en rad, och vinsten väger inte upp att alla byar ändras.
- Plaggens regler i stepKlader är hårda villkor om vad folk tar på sig (`src/sim/utrustning.ts:255-292`): Manteln är ett ämbetstecken, och att den följer ämbetet är en regel om hur världen är som står i designdokumentet. Att flytta den till ägandet ger mer kod och samma resultat.
- Omtanken om byn räknar med alla i listan, också döda, och familjen letas fram vid varje fråga (`src/sim/omtanke.ts:18-31, src/sim/bygg.ts:142, src/sim/folk.ts:382-386`): Det körs en gång i timmen och kostar nästan inget, och ingen har mätt. Förslaget byter dessutom vilka som räknas (de på resa), så det ändrar spelet lite utan att ge något.
- Inbärning av möbler som byggdes ute före v59 (`src/sim/stationer.ts:52, 1430-1431, 1551-1565, 1652-1661, 1673; src/test/scenarier/byggnader.ts:631-646; src/ui/flikar/station.ts:49`): Koden är inte död: testläget i spelet och ett scenario använder den. Tolv rader är för liten vinst för att ändra hur testläget fungerar.
- stationFor räknar om vilka som arbetar och om rutan framför är fri vid varje fråga (`src/sim/stationer.ts:483-516, 523-547`): Beskrivningen stämmer, men människorna väljer en i taget inom samma slag och måste se varandras val (en station rymmer en arbetare, steg 4.5.3.6). Ett minne per slag bryter det, och vinsten är inte mätt.
- Husköpet prövar samma sak på flera ställen (`src/sim/byggplan.ts:431, 457-460, 474-479, 491, 578-589`): Likheten finns, men ställena behöver olika delar av svaret, så en gemensam funktion sparar bara ett par rader. Vinsten är för liten.
- Upprepningar i bygget av en station (`src/sim/stationer.ts:353-357, 370-374, 1083-1106, 1165-1176`): Upprepningarna finns men är tre små saker som skiljer sig i detaljerna. Det sparar ett par rader och rör villkoren för vem som får bygga, så vinsten är för liten för risken.
- Slitaget hamnar på fel station när byn har två av samma sort (`src/sim/stationer.ts:165-212, 1362, 1418-1429; src/sim/redskap.ts:311; src/sim/projekt.ts:188, 196`): Felet kan inte uppstå i dag, eftersom byn aldrig har två av de stationer som har ett redskap.
- Stationer i vägen för en dörr: inte bara för gamla sparade byar (`src/sim/stationer.ts:1053-1060, 1470-1492; src/sim/byggplan.ts:369-389, 958-962; src/test/scenarier/natur.ts:810-846`): Läsaren var själv osäker, och kontrollen visar att en ny dörr kan öppnas bredvid en bädd. Flytten behövs alltså fortfarande.
- Stockvägen går igenom hela kartan var tredje timme (`src/sim/byggplan.ts:723-754; src/sim/strak.ts:32; src/sim/typer.ts:18`): Några tusen rutor var tredje timme i spelet kostar nästan ingenting, och en del av beskrivningen stämmer inte. Vinsten är för liten.
- Balansblocket RT gäller bara de gamla stationerna (`src/sim/recept.ts:22-49`): Det stämmer att talen står på två sätt. Men regel 8 i ARKITEKTUR.md säger att balanstal ska ha namn i ett block, så att ta bort blocket går åt fel håll. Vinsten är bara rader.
- Handlingarnas namn räknas upp i en if-kedja när ett arbete börjar (`src/sim/paborjat.ts:48-58; src/sim/handlingar.ts:1`): Raderna finns, men registret över handlingar (handlingar.ts) är ren data utan kopplingar till de andra systemen. Att lägga tiderna där drar in ljus, vård, törst, dörrar och skog i registret. Det sparar nästan inga rader.
- Gamla sparfiler: materialen ris och hö, och rep i handarbetet (`src/sim/byggnad.ts:43, 46; src/sim/steg.ts:219; src/sim/byggnader.ts:187, 194, 228; src/test/scenarier/grund.ts:1289, 1865; src/test/scenarier/byggnader.ts:370`): Det stämmer att flaggan inte läses. Men raderna behövs för att en gammal sparad by ska gå att ladda, och tre tester bygger risväggar. Sex rader är inte värda risken för Björns sparade by.
- Stationernas värme finns bara för örtköket och räknas vid varje värmefråga (`src/sim/stationseld.ts:20-25, 91-100; src/sim/eld.ts:158`): Designdokumentet (Örtköket, steg 10.2.86) säger att örtkökets eld värmer lite, och fyrfatet som kommer ska bli en rad i samma register med egen värme. Slingan är billig eftersom den bara räknar tända eldar.
- Redskapens exporter som bara testerna använder (`src/sim/redskap.ts:54, 59, 90-96, 148`): Det stämmer att bara testerna använder dem. Men det är tre enradare som testerna behöver, och att flytta dem ger ingen enklare kod.
- Slakten kollar om byn har en kniv, inte om en är ledig (`src/sim/redskap.ts:156-161; src/sim/handlingar.ts:170; src/sim/redskap.ts:63-69`): Det är ingen bugg. Den som slaktar håller kniven som sitt redskap under arbetet (handlingen slakta kräver den), så ingen annan räknar den som ledig. Går kniven sönder avbryts arbetet av slitaget.
- boende() hämtar samma lista tre gånger och räknas om varje slag (`src/sim/byggnader.ts:286-336`): Kommentaren ovanför säger redan varför klockan står i nyckeln: familjerna kan ändras inom ett slag, och kostnaden är ungefär en halv procent. Att byta nyckel riskerar att levande läge och snabbläge går isär, för en liten vinst.
- Krokfilen för stationselden kan vara vanliga importer (`src/sim/stationseldkrok.ts:1-6; src/sim/stationseld.ts:23-29; src/sim/matlagning.ts:162, 381; src/sim/brygg.ts:122`): Läsaren var själv osäker. Filen är sex rader och kommentaren säger varför den finns (steg 10.2.85). Direkta importer i ring mellan elden, matlagningen och bryggningen kan ge fel vid laddningen som är svåra att hitta.
- Den första elden är ett specialfall bredvid registret över eldar (`src/sim/eld.ts:105-112, 178, 268-269, 382, 406, 413, 423, 497, 502-503; src/sim/steg.ts:987, 991; src/sim/flod.ts:107-108; src/sim/brand.ts:401-402; src/sim/brasor.ts:42-43, 73; src/ui/flikar/eld.ts:20-26`): Det läsaren beskriver stämmer, men ombyggnaden rör 45 filer, sparade byar och uppgifter som pekar på elden med nummer, för att spara ungefär 15 rader. Vinsten är för liten för risken; de riktiga felen (bara den första elden räknas) rättas i fyndet ovan.
- Valet mellan brand och tänddon räknar väntad tid i en slinga (`src/sim/eld.ts:289-309; src/sim/typer.ts:518-523`): Designdokumentet (steg 10.6.12) säger uttryckligen att valet följer tiden, och scenariot kräver att tänddonet väljs när elden är långt borta. Påståendet att vägen alltid är kortare stämmer inte med tändstickor (en minut) eller eldstål.
- Radfacit-verktygen radmatt och radregler (`src/test/radmatt.ts (34), src/test/radmatt-en.ts (19), src/test/radregler.ts (54), test/radfacit.json`): Designdokumentet (Flera samhällen: Raden mäts mot testbyarna) säger att jämförelsen mot mätningen görs om i fasens Balans. Testbyarna ändras med varje fas, så facit måste gå att räkna om, och då behövs båda kommandona.
- Svävar-mätaren är dubbel med vakten (`src/test/svavar.ts:1-19; vakten i src/test/kor.ts:41 och src/test/scenario.ts:558-565`): Steg 11.1.74 är inte klart och säger uttryckligen att npm run svavar mäter det som svävar; just nu programmeras 11.1.74–11.1.77. Mätaren visar hela listan per arbete, vilket vakten inte gör, så den är inte dubbel.
- Äldre facit och 90-dygnsvägen i npm test (`src/test/test.ts:21-29,35-41,80-84,134,155-161`): Nästan hela vinsten ligger i 90-dygnsvägen, och den är önskad: steg 10.2.107 och fliken Läget säger att 90 dygn körs i fasens Balans, och den sparade byn byggdes nyligen för att det ska gå fort. Det gamla facitformatet är bara två rader.
- Median och 'vilka tekniker byn kan' räknas på flera ställen (`src/test/nyckeltal.ts:89; src/test/teknik.ts:32; src/test/lardom.ts:14; src/test/lardom-en.ts:16; src/test/prov-en.ts:39; src/test/radanfall.ts:14; src/test/radhandel.ts:13; src/test/en.ts:8; src/test/radmatt-en.ts:14-16; src/test/vacktmatt.ts:20-21`): Vinsten är några enradare, och varianterna skiljer sig med avsikt, så en gemensam funktion skulle ändra mätvärden som redan står i Färdplanen. För liten vinst för besväret.
- Vakterna i korBy går igenom stackarna flera gånger (`src/test/kor.ts:60,62,158-161,173`): Räkningen stämde inte helt, och vinsten är försumbar mot de 150 slag spelet räknar mellan varje kontroll. En glesare vakt skulle dessutom göra larmen sämre.
- Mätaren för datorns kärnor och minne (matare.ts) (`src/test/matare.ts:1-64 (anropas från balans.ts, jamfor.ts, koll.ts, likhet.ts, riktad.ts, snabbkoll.ts; MATARE_BARN i pool.ts:74)`): Utskriften är precis det stegen 9.2.61 och 10.2.65 beställde, för att se om testerna utnyttjar kärnorna. Den behövs just nu: det stora testet tar 67 minuter mot gränsen 20, och nästa steg är att göra testerna snabbare.
- En rövare som dör i byn minskar aldrig grannbyns folk eller styrka (`src/sim/rader.ts:90; src/sim/rad.ts:140; src/sim/byhandling.ts:525-530; src/sim/rovare.ts:544,873`): Felet finns inte: de döda rövarna dras från grannbyns rad när flocken gått hem (byhandling.ts:529). Bara en onödig rad blir kvar.
- Stationernas brist och "en per person" skrivs för hand i förrådsmålen i stället för i registren (`src/sim/forradsmal.ts:94,223-283,298-309`): Det är inget regelbrott: målen är redan rader i ett register, och allt om förrådsmålen ligger i en fil som principen säger. Att flytta dem till SAKER och STATIONER sprider systemet över fler filer och ger nya importcirklar för några få rader.
- Gästerna har en egen förenklad kropp och egna villkorskedjor per sort (`src/sim/gastvardag.ts (134 rader); src/sim/gast.ts:21-29`): Gästen har ingen parallell kropp; hen går redan på byns system, och den egna packningen är ett medvetet val som står i designdokumentet och i filens kommentar. Vinsten av att flytta villkoren är för liten.
- Rövarflockarna ligger i två fält (`src/sim/typer.ts:480; src/sim/rovare.ts:361,882-894; src/sim/forradsmal.ts:219; src/sim/grav.ts:322; src/sim/tornado.ts:308; src/sim/gastvardag.ts:54,131`): Felet som beskrivs finns inte: alla system som behöver det ser redan alla flockar. Kvar är bara en liten städning som inte är värd en ändring av sparfilen.
- En djurart är utspridd över flera register (`src/sim/kampar.ts:30-46; src/sim/redskap.ts:117-145; src/sim/tamdjur.ts:29-41; src/sim/recept.ts:6; src/sim/djur.ts:501-504`): Uppdelningen är per system och är vald med flit; en rad per art skulle bryta upp stridens och slaktens register i stället. Det är ett stort arbete med liten vinst.
- Tre sätt att hitta på en person som inte simuleras (`src/sim/gastliv.ts (144 rader); src/sim/vacktliv.ts (85); src/sim/radperson.ts (77); src/sim/folk.ts:326 (egenskaperUr, namnUr)`): Det gemensamma är redan gemensamt (namnUr, egenskaperUr, gastLiv). Resten är små filer med olika uppgifter, och en sammanslagning ändrar personerna i sparade byar för en mycket liten vinst.
- Kopieringen från rad till förbindelse körs för alla byar efter varje köpost (`src/sim/rad.ts:140; src/sim/varldslag.ts:66-69`): Kostnaden är försumbar och inte mätt; reglerna säger att optimeringar görs efter `npm run kostnad`. Raden försvinner ändå med första fyndet.
- Fyra små berättelsefiler som fyller i mallar (`src/sim/framber.ts (34 rader); src/sim/matchber.ts (46); src/sim/handelsber.ts (62); src/sim/trotext.ts (24)`): Filerna är små och tydliga, och att flytta in dem i systemens stora filer sparar bara importraderna och riskerar nya importcirklar. Vinsten är för liten.
- living(s) och byId(s) går igenom alla personer vid varje fråga (`src/sim/folk.ts:232, 235; src/sim/gast.ts:116-117; t.ex. src/sim/rovare.ts:831, src/sim/sjukdom.ts:165-168, src/sim/smuts.ts:266`): Ställena som ändrar vem som är i byn är inte få: ett femtontal i spelet sätter död, flyttad eller borta, ett tjugotal lägger till personer, skatt.ts gör någon tillfälligt levande, och 75 ställen i testerna sätter fälten direkt. En sparad lista som missar ett enda av dem ger tysta fel, och vinsten är inte mätt.
- Lära sig bredvid söker igenom byn för varje person och teknik (`src/sim/teknik.ts:398-414 (arbetaBredvid), 303-322 (thinkWhileWorking, framat); src/sim/steg.ts:834-835`): Kostnaden är inte mätt och är troligen liten, eftersom få tekniker går igenom det första villkoret. En förhandsräkning per slag skulle dessutom ändra vem som ses mitt i slaget.
- Ett tjugotal 'räknas en gång i timmen när någon frågar' bredvid registret TAKTER (`src/sim/kruka.ts:143-150; src/sim/seder.ts:95-102; src/sim/odling.ts:620-628; src/sim/slatter.ts:194-197; src/sim/ljus.ts:185-190; src/sim/stationer.ts:722-727; src/sim/typer.ts:41-52 (visning, tvaDelar, egen, simulera)`): Det stämmer att de finns, men de följer en regel som står i ARKITEKTUR.md, och de räknar bara när någon frågar. En rad i TAKTER skulle räkna varje timme också i byar där ingen frågar (t.ex. blommor i en by utan krukor), ändra utvecklingen på ett tjugotal ställen och kräva mycket arbete för liten vinst.
- Tändmaterialet har en egen rad som går före maten, fast alla samlare redan plockar det (`src/sim/val.ts:136, 165, 519 (arb.tand), 831-833, 863-865 (raden tand), 1206-1217; src/sim/eld.ts:210, 249-251, 514-518; src/sim/forradsmal.ts:131-135; src/sim/steg.ts:1393, 1591`): Felet finns, men det är redan planerat som steg 12.1.39, och designdokumentet vill ha kvar en egen handling för tändmaterialet. Läsarens förslag säger emot det.
- Det gamla 'bästa arbetet' ligger kvar bredvid raderna, med raden fara och räknaren fullaForrad (`src/sim/val.ts:1197-1220 (best i bestWork), 604, 610, 831-832, 917 (fullaForrad), 919-923 (fara); src/test/scenarier/projekt.ts:190`): Raden fara behövs och ska enligt steg 12.1.45 finnas kvar med rätt skäl. Det som går att ta bort (best hos barnen) är redan planerat där.
- Faran dämpar arbetet på sex olika sätt med fem olika tal (`src/sim/val.ts:121-123, 550 (forbNu, projFara 0,05), 788-789 (baraKyla 0,3), 794, 1056 (byggKyla 0,3), 1072 (byggMat), 1297 (nuForst), 1305 (toolGain), 1340 (craft); src/sim/projekt.ts:64, 435 (PROJEKT_TAL.kyla 0,3)`): Talen gör olika saker och står beskrivna i designdokumentet. Att slå ihop dem sparar få rader och ändrar balansen i fara.
- Arbetarnas tak är hårt på tre ställen fast det kallas mjukt (`src/sim/val.ts:131-137, 517-520, 536-538, 884 (bygga), 905 (forbHus), 936-947 (vinnare); src/sim/bygg.ts:44`): Det läsaren kallar hårt är den regel designdokumentet beskriver: när alla rader på nivån är fulla går man vidare. Bara en kommentar är fel.
- Tillfällenas brådska: en egen mekanism för två rader (`src/sim/val.ts:138-140 (tillfalleMin), 541, 559, 712-714, 721, 956-960, 970-971; src/sim/framtradande.ts:403 (lyssnaBradska)`): Mekanismen står beskriven som önskad i designdokumentet och har ett eget scenario. Åtta rader är för lite för att ta bort något ägaren bett om.
- stationBrist: en lång kedja av villkor som kunde vara en rad i STATIONER (`src/sim/forradsmal.ts:284-309; src/sim/projekt.ts:150`): Kedjan är tolv korta rader, och måtten ligger redan i sina egna filer. Att flytta dem till STATIONER gör att stationer.ts måste läsa in åtta filer som själva läser in den, för en liten vinst.
- Bärbuskarna är tre buskar ritade en gång till (`src/ui/buske.ts:53-95`): Skillnaden i toppen är inget misstag: bäret sitter i kanten och konturen går runt det. Bilderna är Björns valda ritningar ur bildstilen (f6_barbuske), och ritad bild som data är lättare att rätta än en stämpel.
- Bytet vid filten läses ur två källor, den ena är händelseloggen (`src/ui/handel.ts:30-48, 68-69; src/sim/byte.ts:173-178`): Regeln om loggen gäller att räkna ur den. Här läses bara de sista sekundernas rader, och 400 nya rader hinner inte komma på den tiden. Filten har inte allt som behövs (vad var och en gav, efter att varorna bytt filt), så bytet skulle behöva byggas om för en liten vinst.
- Främlingen och sändebudet byggs med nästan samma kod, och flockens handling står som en kedja (`src/ui/gaster.ts:63, 82-103`): Varje sort är redan en rad i registret GASTER, som regeln vill. Raderna för främlingen och budet har olika innehåll, så en gemensam funktion med tabell blir ungefär lika lång. Vinsten är för liten.
- Rester för gamla sparningar i testbyarna och 'borta' (`src/ui/byar.ts:15-18, 33-40, 66; src/ui/borta.ts:63, 68; src/ui/spara.ts:168`): Flytten är ny (steg 11.2.1) och skyddar byar som Björn lagt till i sin webbläsare. Fem rader är inte värda risken att en sparad by blir oläslig. Rad 68 kan förenklas utan risk, men sparar ingen rad.
- Handritade platshållare med lösa färger utanför paletten (`src/ui/foremal.ts:101-112, 407-416, 424-481; src/ui/arena.ts:131-158`): Påståendet om färger utanför paletten stämmer inte för de flesta: de är palettens färger skrivna som tal. Platshållarna väntar på Björns val i bildstilen, och det är det vanliga arbetssättet, inte ett fel i koden.
- Rövarna och byborna ritas med två kopior av samma figurkod (`src/ui/manniskor.ts:352-381, 393-445`): Kopiorna delar bara ett tiotal rader och skiljer sig i resten. En gemensam funktion skulle få många växlar och kunna ändra hur både bybor och rövare ritas, för en liten vinst.
- Skaffas och används: sakernas fakta i ett eget register i gränssnittet (`src/ui/skaffas.ts:11-52`): Tabellerna är dokumenterade som avsiktliga och håller bara förklarande text för spelaren, och ingen nyckel pekar på något som saknas. Att flytta texten till SAKER flyttar bara raderna, och att räkna ut den ger sämre text för mycket arbete.
- Mängden SLA används nästan aldrig (`src/ui/manniskor.ts:321, 425-427 (jfr src/ui/arbetsbild.ts:39-48)`): Det stämmer att SLA sällan spelar roll, men vad den gör för en liggande figur är inte kontrollerat. Två sparade rader är för lite för den osäkerheten.
- Gamla sparformat läses fortfarande (`src/ui/spara.ts:12-14, 26, 74-75, 113; src/ui/lagring.ts (gammalNyckel, lasEllerFlytta); src/ui/byar.ts:35, 66`): Sex rader sparas mot risken att en sparad by går förlorad. Steg 11.2.1 kräver att en gammal sparad by går att ladda, scenariot sparning prövar det, och regel 3 i ARKITEKTUR.md säger att äldre sparfiler ska fungera.
- trad.ts: paletten pekas ut på två sätt och stammen ritas på två ställen (`src/ui/trad.ts:16, 80-81, 84-93, 219-227, 257, 272-284, 329-330`): Huvudförslaget fungerar inte: stammen i stam-läget är avsiktligt en egen, högre bild (steg 5.3.6 och 9.2.88) och går inte att klippa ur granens bild. Det som återstår sparar ett par rader och är inte värt en ändring i en fil med godkända bilder.
- Röllekan och hasseln ritas efter egna gränser, inte efter det som går att plocka (`src/ui/vaxter.ts:14-16, 62-76 (särskilt 72-73); src/sim/fynd.ts:281; src/sim/steg.ts:1247-1254`): Hasseln är avsiktlig: hasselVaxer säger i koden att busken står kvar oavsett årstid och plock (Björns val, steg 10.11.1), för busken finns kvar även utan nötter. Röllekan följer redan lagret i FYND (steg 9.7.15), och förslaget kräver ändringar i simuleringens plock för fyra raders vinst.
- Tonningen samlar alla husrutor, högar och stationer varje bildruta (`src/ui/tona.ts:10-21, src/ui/trad.ts:388-399, src/main.ts:221`): Stämmer i koden, men kostnaden är omätt och ser liten ut: några tusen snabba uppslag per bildruta. Ett sparat mellanresultat lägger till kod och en ny sak som kan bli gammal (högar som flyttas), och frågan i första fyndet kan ta bort listan helt.
- Beskrivningens text i simuleringen kommer från gränssnittet (`src/ui/utseende.ts:131-150 (ansiktsDel, BESK_ANSIKTE.del), src/sim/berattelser.ts:2299-2329, 2353`): Regeln i ARKITEKTUR.md säger att simuleringen aldrig importerar från ui/, och det gör den inte: kroken är en uttalad och kommenterad lösning. Förslaget kräver att porträttens arv och hela porträttgeneratorn flyttas in i simuleringen, vilket är ett stort ingrepp för åtta rader och ingen skillnad i spelet.
- Världskartan räknar om byns uppdrag och kunskap vid varje musrörelse (`src/ui/varldskarta.ts:58-71 (bilden, markNr), 136, 184, 189`): Stämmer i koden, men båda funktionerna är en enkel genomgång av byns folk och det de vet, och världskartan är en ruta som är öppen en kort stund. Ingen mätning visar att det märks, så ett sparat mellanresultat ger mer kod än nytta.
