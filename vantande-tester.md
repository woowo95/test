# Väntande tester

## Steg 11.1.69 Gånganimationen (görs från MacBooken, med Mac minin)

- Bilden avgör redan själv om någon går (riktning() och stalle() i ui/manniskor.ts, sedan steg 10.2.55): benen rör sig när personens plats i bilden (platsAv, utan knuffarna) flyttat sig mer än 1e-4 rutor sedan förra bilden. Ändå syns folk gå på stället.
- Leta grundorsaken i det levande spelet: troligen flyttar platsAv sig lite hela tiden för den som står still (sträckan räknas om när aktiviteten väljs om, eller interpolationen mellan slagen följer en liten flytt i simuleringen). Logga platsAv per bild för en som står still.
- Vakten i testerna (larm när någon ritas med gånganimationen utan att ha flyttat sig) kräver att figurerna ritas: kör den i webbläsaren som `npm run utseende` gör, gärna på Mac minin över natten.

## Fas 12.1 från 12.1.9 (otestad med de långa testerna)

- Committerna efter v533 (12.1.9 och framåt) har bara typkontrollen och stegens egna scenarier bakom sig. Systemet 12.1 är skyldigt hela kedjan när det är klart: `npm run kedja -- "npm run -s koll" "npm run -s likhet"`.
- 12.1.18 (förråden växer med det som inte får plats) ändrade byarna så att scenariot klader fick fler ben; fler scenarier kan ha påverkats och syns i koll.
- 12.1.76 (elden sköts genom valet av aktivitet) ändrar grunden: vem som lägger ved på elden och tänder den väljs nu i valet i stället för att elden avbryter någon. Skyldig koll med nytt facit och `npm run likhet`.
- 12.1.82 (vården, striden och vargarna): läs räknarna `vargVantar`, `vargDorrStrid` och `vargTrottnade` i fasens Balans (`npm run balans -- 24 35`). Väntar vargarna utanför en dörr i färre än var fjärde by tas väntan bort med sitt stycke i dokumentet.
- 12.1.21 (rikedomen lockar): `npm run strid` före (på 141bbace) och efter (85a3aff3), en gång var, som information om flockarna.

## Grenen par-texter (12.1.118–12.1.122, texterna efter granskningen)

- Committerna på par-texter har bara typkontrollen och stegens egna scenarier (ord, textfel, tidsord) bakom sig, och ett tjugotal scenarier om texterna. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` när grenen förts in i varld.
- Textkontrollerna går nu också på loggen, krönikan, notiserna, tankarna och resans dagbok (12.1.118), och titta() skriver också handeln vid filten, framträdandet, matchen och sammanfattningen (12.1.122). En fel text där ger vaktlarmet `text <kontroll>` i koll. `npm run texter` med 4 byar i 20 dygn (20 år i spelet) hade 0 fel efter steget; fler byar och dygn kan hitta fler, och de rättas i texten, inte i kontrollen.
- Stegen ändrar bara texter, men tankarna slås ihop efter sin text (think i folk.ts), så en tanke som nu skrivs med ord ("Uppträdde för många vid elden" över tolv) kan slå ihop två som förut var olika och ändra humöret lite. Samma-kollen och facit kan därför visa annan utveckling; nytt facit sparas när koll är grön.

## Grenen par-sparning (12.1.71, 12.1.88, 12.1.127)

- 12.1.71 (a98426d) och 12.1.88 (56f12f4): gamla sparfiler före v378 och flytten från localStorage borttagna. Skyldig koll (scenarierna sparning, sparbas, egendom, plagg, kunskap, stenring, stationsteknik, brasa, falt, smidighet, slagsmal, vattensack gick igenom i molnet; byarna ska utvecklas exakt som förut, så facit ska inte ändras) och `npm run utseende` (byn läggs nu i webbläsarens databas i stället för i det enkla minnet; prövat i molnet med en liten by, inte hela kommandot).
- Scenariot vard var rött redan före grenen (på b5c6c48): "på tolv dygn i en by: 0 förband".
- 12.1.127: bara bildstilen (valdelen), inget i spelet.

## System 12.5 Järnredskapen (grenen par-jarnredskap, 12.5.1–12.5.6, ab1ebb9 till den senaste committen på grenen)

- Bara typkontrollen och stegens egna scenarier (sag, ullsax, jarnnal, hacka, gryta, las) är körda, och de närmaste (vard, tatuering, stridvard, vardval, kokning, byggsten, fangelse, tradorr, dorr, teknik, tider, arbetstid, ord, ikoner, symboler, jarnredskap, jarnskrot, isborr, eldstal, heltal). Systemet är skyldigt hela kedjan när grenen slagits ihop med varld: `npm run kedja -- "npm run -s koll" "npm run -s likhet"`, med nytt facit.
- Det som ändrar byarna: sågen vid klyvplatsen (plankorna går fortare), ullsaxen och järnhackan (nya rader i klippningen och brytandet, och REDSKAPMAL vill ha dem), järnnålen (bennålen och järnnålen är nu en grupp i REDSKAPSGRUPPER, och byn vill ha en nål när någon kan smida och byn har en slöjdbänk), järngrytan (kokningen kan ge dubbel sats) och den låsta dörren (en ny teknik och en dörr som är bommad också när huset är tomt, så rövarna och anfallarna hugger längre). Likheten bör köras eftersom klippningen och brytandet fått en redskapsrad.

## Grenen par-tankar (12.1.131–12.1.136, humöret, drömmarna, upplevelserna, rykten, mallarna och samtalsämnena)

- Committerna på par-tankar (145728a–f4630ae) har bara typkontrollen och stegens egna scenarier (tankar, drommar, uppvaxt2, rykten2, mallar, amnen2) bakom sig, och de närliggande scenarierna kronika, kronikakat, kronikalista, beskrivning, berattelser, epidemi, brand, oversvamning, tornado, textfel, ord, uppvaxt, vuxenliv, humor, rykten, ikoner, samtal och amnen. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` när grenen förts in i varld, och nytt facit.
- 12.1.131 del 1 (145728a, flytten till TANKAR) är prövad med `npm run samma` mot 2c52678: samma utveckling som förut. Del 2 och stegen efter ändrar spelet (nya tankar, drömmar, upplevelser, intryck och samtalsämnen ändrar humöret, relationerna och sederna), så facit och samma-kollen visar annan utveckling.
- Nya rader i TAKTER (tankarTimme och drommar, en gång i timmen) och en ny slumpföljd (drom): skyldig `npm run likhet`, och `npm run kostnad` i fasens kodgenomgång.
- Nya krönikerader (k_rovare, k_brand, k_tornado, k_flod, k_epidemi, k_tro, k_resa, k_handel, k_djur, k_ratt) och nya texter: `npm run texter` bör visa att varianterna väljs; brandens, tornadons och översvämningens slutrad i krönikan skrivs nu ur mallarna i stället för den gamla texten.
- 12.1.173 (gudlös, en ny rad i TAKTER en gång om dygnet) och 12.1.175 (lusten till rus ändrar chansen att dricka på kvällen, och därmed ruset, grälen och bakfyllan): samma kedja; `npm run likhet` täcker båda.
- Femton nya intryckssymboler (i_forsvarare … i_fangelsekund i ikoner.ts) är platshållare; skyldig `npm run utseende` och tre versioner var i bildstilens valdel (publiceras inte från grenen).

## Hopslagna nattgrenar

- natt-bildstil (12.1.69, 12.1.70, 12.1.102): src/portrattkarna.ts är omskriven (samma porträtt punkt för punkt); skyldig samma-kollen och `npm run utseende`.
- natt-tester (12.1.68, 12.1.85 testernas del, 12.1.100, 12.1.101, 12.1.106): skyldig koll.
- natt-paneler (12.1.54, 12.1.73, 12.1.66, 12.1.99, 12.1.105, 12.1.72): skyldig koll, samma-kollen (12.1.99) och `npm run utseende`. Vid ihopslagningen behölls varlds ändringar där de gick emot grenens: lerkrukans låga platshållare är borttagen (12.1.15), gömmorna ritas inte på världskartan (12.1.9), kartan har ingen knapp (12.1.29), sederna har ingen pil vid vågen och visar alla rader (12.1.28), och påbuden lagskrift och fängelse finns inte längre (12.1.27).
- natt-jarn (12.1.1–12.1.3, 12.2.1–12.2.13 och 12.3.1): skyldig koll med nytt facit (myren, torven och isborrens gräns på 30 cm ändrar byarna), likhet (tillsynen, 12.2.2) och balansen (`npm run balans -- 24 35`). 12.2.5 är prövat med `npm run samma`.
- 18 scenarier var röda på varld redan före ihopslagningarna (39c496fa, efter 12.1.33): kista, handlare, slaktbank, virke, ikoner, symboler, tidsord, borta, varldtillstand, varldslag, forhistoria, kallelse, gomma, handelsresa, vagmote, turne, talt, kyrkanutlyser. De hör till 12.1-stegen från 12.1.9 och rättas innan 12.1 testas med kedjan.

## Grenen par-tester (12.1.159, 12.1.160, 12.1.162, 12.1.115, 12.1.130)

- Bara testskripten, scenarierna och dokumenten ändrade; spelet räknar som förut (12.1.159 lägger bara till en lyssnare, halVakt, som testerna läser). Skyldig koll (scenarierna arbetstid och bjornrovare är nya kontroller; det stora testet bygger kartan för riktad med den nya täckningen, tackning.mjs) och `npm run utseende` i alla fall (inzoomningen och bilderna med teknikträdet).
- 12.1.159: vattenlarmet i by 80191 (dygn 33,9) ska vara borta i `npm run balans -- 24 35`.
- 12.1.162: `npm run strid` ska visa björnens strider mot rövarna som en egen rad (Björnen mot rövarna).
- 12.1.130: koll ska mätas på MacBooken efter ihopslagningen: klocktiden och de fem längsta jobben mot 85 minuter.

## Frågor till Björn (från natten till 20 november)

- Benspaden görs inte längre i någon av testbyarna på 50 dygn (50 år i spelet, sju veckor i verkligheten): benen går först till sylen, nålarna och snarorna. Den står nu bland det sällsynta i testet. Ska benen räcka till spaden tidigare (en sak för fasens Balans), eller är det rätt att den kommer sent?
- Att grunda en värld med 400 års förhistoria tar ungefär 45 s datortid. Det märks när en ny by grundas. Går det bra, eller ska förhistorien räknas medan spelet redan visas?
- Steg 12.1.11 (vägarna i världen snabbare) säger att det inte ändrar spelet, men bara en av de tre delarna gör det. Vägarna slås nu upp per par i stället för att letas i en lista (byggt, samma spel). De två andra delarna ändrar spelet. Att glömma vägar ingen använt på länge gör att resans plan räknar med fågelvägen gånger omvägen tills vägen gåtts igen. Att räkna resans poäng en gång i timmen (sex minuter i verkligheten) gör att en resenär väljer på poäng som kan vara upp till en timme gamla. Ska de byggas ändå, så att spelet blir lite annorlunda, eller räcker uppslagningen per par tills mätningen (`npm run varldkostnad`) visar att resorna kostar för mycket?

## Grenen par-varlden (12.1.64, 12.1.83, 12.1.98, 12.1.111, 12.1.114)

- 12.1.64 (fel i resorna, gästerna och världen): ändrar spelet lite (de döda på vägen äter inte, gästers törst, karavanens platser, väckta byns plats, nyheter, dygnet efter lokal midnatt för heliga dagar och fester, inga handelsvaror utan grannar). Skyldig koll med nytt facit och likhet. Fynd 299 (sällskap som fastnar) var redan rättat i 12.1.8.
- 12.1.83 (världen och gästerna): mutan och fjäsket är borta ur BYHANDLINGAR, handlarens tycke läser hens riktiga egenskaper, egen resa skrivs inte över av ett rykte och ryktets läge räknas ur frö och plats. Ändrar världen och handeln; skyldig koll med nytt facit, likhet och `npm run radhandel` som information. Scenariot muta är borttaget.
- 12.1.98 (förenklingarna): `npm run samma` är lika efteråt (prövat i molnet, bf5c24b mot 87b0c9d). Skyldig bara koll som vanligt.
- 12.1.111 (kraschen i fardFram): gick inte att få fram, varken ensam, i de grupper det stora testet kör handelsfard och bygava i (`--grupp`) eller i rapporten (8cb2c161). Ingen väg i koden som kraschar hittades. I nästa koll: blir en grupp med handelsfard eller bygava röd står stacken i utskriften ("kraschade"); spara den i steget i Färdplanen.
- 12.1.114 (kriget efter det ovänliga beskedet): ändrar världen. Skyldig koll med nytt facit, likhet och `npm run radanfall` som information. Inget krig bryter ut i scenariot bykrig ännu (frågan till Björn i steget). Byarna 42, 139 och 121 i samma-kollen utvecklas annorlunda av 12.1.114, så samma-kollen behöver nytt facit.
- Ihopslagen med varld (efter par-texter): scenariot handlare är rött redan på grenen (byn köper inte flintan projekten saknar), varldtillstand är rött på varld sedan förut (samma frö ger inte samma värld). Rättas innan 12.1 testas med kedjan. Handlarens packning tar ingen sort längre (kolumnen sort togs bort i 12.1.91), och arvets krönika skriver silvret med siffror.

## Grenen par-styret (12.1.62, 12.1.84, 12.1.97)

- 12.1.62 (fel i kunskapen och kulturen, fynd 277, 298, 313, 322, 343, 347): ändrar spelet lite (lärlingar i öl, mjöd och gödsel, "går i lära" utanför hantverket, brottningen på den heliga dagen, tecknet dubbelt, framträdandet som slutar när den som leder dör). Skyldig `npm run likhet` och koll med nytt facit.
- 12.1.84 (styret, tron och kulturen, fynd 456, 542, 512, 554, 557, 548, 502, 491, 500): ändrar spelet (vunna strider mot rövare i ledarens legitimitet, ingen åldersgräns i sporten, tatueringen utan kol, flera kan rista en lag, hånförbudet upphör med ledaren, Lill- och Stor-namnen med egen text). Balanstalen för rädslan heter nu `radsla.*` i stället för `lag.akt*`. Skyldig `npm run likhet` och koll med nytt facit.
- 12.1.97 (förenklingar, 18 fynd): ändrar inte spelet. `npm run samma` gick igenom i molnet (samma utveckling som förut) mot koden före steget, när fältet `s.aktOm` (borttaget ur sparningen) och de fyra nya raderna i `s.takter` (fynd 130: kvällen före styret, styrets kväll, kyrkans dygn, seden andlig) räknades bort. Facit för samma behöver sparas om, eftersom de nya raderna i `s.takter` ändrar hashen. Skyldig `npm run likhet` och koll.

## De fyra parallella grenarna ihopslagna med varld (par-texter, par-varlden, par-styret, par-sparning)

- Ihopslagna i 2c526786, deda7f08, dcf71ca1 och 323ddd0f; varje ihopslagning har typkontrollen och de berörda scenarierna bakom sig. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` på den senaste committen, som täcker raderna för alla fyra grenarna ovan. Grenarna ändrar spelet (12.1.64, 12.1.83, 12.1.84, 12.1.114), så koll sparar nytt facit.
- Samma-kollens facit (test/samma.json) är sparat på nytt efter ihopslagningarna. 12.1.93 och 12.1.94 är prövade med samma mot facit från 12.1.89 (på 037fbe41 med rättningen 8f048a2d): samma utveckling som förut.

## System 12.4 Möblerna och sakerna i hemmet (grenen par-mobler)

- Committerna för 12.4.1–12.4.14 på par-mobler har bara typkontrollen och stegens egna scenarier (filen src/test/scenarier/mobler.ts) bakom sig. Systemet är skyldigt hela kedjan när det slagits ihop med varld: `npm run kedja -- "npm run -s koll" "npm run -s likhet"`, med nytt facit.
- 12.4.1 (drejskivan): lerkrukan görs nu vid en station (plats station i stället för elden), så den som formar en kruka utan drejskiva sätter sig där hantverket görs i byn; byarna blir annorlunda.
- 12.4.2 (oljelampan): brännoljan är nu en vätska (VATSKOR) som kokas i en ledig oljelampa eller liten lerkruka; brännolja som ligger i stackar i gamla sparfiler blir liggande utan funktion (ingen uppgradering). Byn vill ha en oljelampa till varje plats för ljus, och tomma lampor fylls på (projektet lampa).
- 12.4.3 (sängen): en familj med något över byter halmbädden mot en säng (projektet sang, Hemmen blir finare); sängen vilar mer. Läs i Balansen om sängarna byggs och vad de kostar byarna.
- 12.4.4 (pallen och stolen): byar med en snickarbänk och familjer med något över gör pallar och stolar till borden hemma (gruppen sate i REDSKAPMAL, projektet satta); den som sitter bättre vilar mer och är gladare av måltiden.
- 12.4.5 (vaggan): spädbarnen sover i en vagga i rummet där föräldern sover, när familjen byggt en (boende i byggnader.ts). Att föräldern arbetar med fria händer finns inget system för ännu (ingen bär spädbarnet i spelet), så det ändrar inget.
- 12.4.6 (tunnan): vinets mognad flyttade från vinKvalitet (brygg.ts, som inget läste) till MOGNAD i tunna.ts, och den används nu: ett mognat vin eller mjöd ger en bättre tanke och ett högre värde (tingVarde räknar det mognade i behållaren). Byn vill ha en tunna per bryggkar. Ändrar rikedomen i byar med vin.
- 12.4.7 (osten): TILLVERKA har fått fälten vatska (vätskan som går åt ur behållarna) och kruka (behållaren där det sjuder); byar med getter ystar mjölken som annars skulle surna. Tekniken Ost öppnas när byn har haft mjölk (mjölkningen har ingen egen teknik).
- 12.4.8 (brunnen): brunnen är en plats att dricka och hämta vatten i drickPlats (torst.ts), och under isen når man vattnet där (naVattnet i is.ts); med en brunn smälter ingen snö.
- 12.4.9 (utedasset): en grävd latrin som tömts i komposten tas bort (den går inte att använda igen) och töms först när den är full; utedasset töms och står kvar. Scenariot latriner godtar att byn står utan latrin efter 5 dygn när den tömt sin och saknar spade.
- Rättelse av 12.4.1 i samma commit: lerkrukan och oljelampan är kvar vid elden (plats elden), och det som görs fortare vid en station (fart i STATIONER) görs där när byn har en (platsFor i val.ts). Det gäller också sländan i vävstolen, som förut spanns vid elden; ändrar byarna.
- 12.4.10 (sjukbädden): den sjuke eller skadade sover i en ledig sjukbädd (boende i byggnader.ts) och läker 1,2 gånger fortare; rumstaggen Sjukstuga och krocken Sjuka där man sover (rum.ts).
- Fel som fanns före 12.4 (på varld, 255ee7f): testbyn i scenariot latriner (testBy(30), 16 invånare i istiden) fryser ihjäl på ett dygn, 15 av 16, om den får en benspade. Utan spaden lever alla. Värt att undersöka.
- 12.4.11 (fyrfatet): ELDSTATIONER har fått fältet gnistor (brand.ts gnistrar från stationseldar med det); byn ställer ett fyrfat i ett rum där folk sover utan härd och lägger kol i det när det är kallt (projektet fyrfat). Vaggan och fyrfatet tar ingen sovplats när de ställs (siteInne).
- Röda redan på varld (255ee7f), inte av 12.4: scenariot brinner (branden i snön sprids inte).
- 12.4.12 (tvålen i vården): vårdaren som kan Rena händer tar en tvål till såret (vardHamtas) och tvättar händerna med den; tvålen går nu åt, så byar med örtkök kokar mer tvål.
- 12.4.13 (ylle och väta): den som bär en kappa eller mantel av ylle fryser hälften så mycket av att vara blöt (VADER.ullBlot); personrutan visar det.
- 12.4.14 (fjäderpennan): byar med en skrivpulpet skär en penna (gruppen penna, en per pulpet), och skrivandet sliter den 1/20 per blad och ger 0,1 högre chans till bra kvalitet.
- Bildstilen: ingen av de nya sakerna har ännu tre versioner i valdelen (se slutrapporten); platshållarna står i src/ikonermobler.ts.

## Grenen par-resor (12.1.144–146, 148, 152, 164: resorna, handeln och platserna i världen)

- Committerna på par-resor har bara typkontrollen och stegens egna scenarier bakom sig. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` när grenen förts in i varld; facit ändras (nya rader i VAGHANDELSER drar slumptal på resorna).
- 12.1.144 (trasigt hjul och vilt på vägen): scenariot vaghandelser gick igenom.
- 12.1.145 (Släppa utrustning undantar inget; maten, vattnet, fodret och tälten väger RESA.behovVarde så länge resan behöver dem): scenarierna utvagar och gomma gick igenom.
- 12.1.146 (handelslägrets rad och plats tas bort vid sluttiden; platser som tas bort blir minnesplatser så länge byn minns dem, vl.minnesplatser): scenarierna lagerslut (nytt, src/test/scenarier/resor12.ts), utpost, bysorter, landmarken, handelsresa, bynvet, ort och radbesok gick igenom. Sparningen får fältet minnesplatser; kör sparning och sparstorlek i koll.
- 12.1.148 (betalningen räknar vikten först i betalaAv, behov.ts: det köpta lämnar handlarens last, och för tunga varor avstås från i första vändan): scenarierna handlare (röd före steget), byte, bytessystem, forhandling, handelsko, handslag, kopta, silver och handelsvaror gick igenom.
- 12.1.152 (handlarens fackla: en rad i GASTUTRUSTNING, uppsatt mellan filtarna när det är mörkt, raden handlare i LJUSKALLOR och en rad i ui/foremal.ts som ritar den med den uppsatta facklans bild; handeln tar längre tid i totalmörker): scenarierna handlarfackla (nytt), handlare, morker, fackla, uppsatt och gastutrustning gick igenom. Skyldig `npm run utseende` (en natt med handlaren) när par-paneler förts in.
- 12.1.164 (en plats med sluttid får posten platsUpphor i världens kö, laggPlats i landmarken.ts, och tas bort vid sin tid som minnesplats om någon minns den; ett handelslägers plats tas bort av lägrets egen regel): scenarierna gomslut (nytt), gomma, utvagar, lagerslut, utpost, landmarken, platser, varldslag, radvakt, sparning, sparstorlek och varldskronika gick igenom. Gömmor i en värld sparad före steget har ingen post i kön och ligger kvar.
## Grenen par-paneler (12.1.154 och framåt, otestad med de långa testerna)

- 12.1.154 (vänd mot bänken): bara bilden ändras (ui/stalle.ts, ui/manniskor.ts); skyldig `npm run utseende` och koll (scenariot stalle är grönt).
- 12.1.161 (förrådslistan får en bakgrund): bara stilen i template.html; skyldig `npm run utseende` (datorn och mobilen).
- 12.1.157 (namn vid alla på kartan): ui/namnskyltar.ts, ui/manniskor.ts, två platshållare i ikoner.ts (roll_ledare, roll_prast) och valkorten f12_roll_prast och f12_roll_ledare i bildstil/fas12.js (bildstilen inte publicerad, `node bildstil/kontrollera.mjs --bilder` inte körd); skyldig `npm run utseende` (rollsymbolerna i hel skala) och koll.
- 12.1.156 (större sken): ändrar spelet (MORKER.eldR 6 → 9, FACKLA.r 4 → 6, LJUS.r 2 → 3); skyldig koll med nytt facit, `npm run likhet` och `npm run utseende`. Scenariot uppsatt prövar nu ljuset i hela byn i en testby (en ny by ligger hela inom eldens ljus). Bilderna före och efter i granskning/sken/.
- 12.1.147 (texten medan förhistorien räknas): main.ts; prövat i webbläsaren (texten står kvar i 27 s datortid och försvinner när byn är klar). Skyldig koll.
- 12.1.137 (krönikans kategorier och nya notiser): kategorierna fanns redan; ny vakt (kronikaVakt i src/test/kor.ts, krönikerad utan kategori) och sex notiser (dom, avrattning, lag, tro, skord, tamdjur) i styre.ts, lagar.ts, religion.ts, odling.ts och tamdjur.ts. Ändrar inget i byarna utom notiserna (och räknaren tamForst); skyldig koll (vakten i alla testbyar) och samma-kollen.
- 12.1.138 (fler grafer i Byns tal): nio tal i HISTORIK_TAL och nio grafer i GRAFER, och räknaren bocker i skrift.ts. Historiken växer (scenariot historik: största delen 207 KB av 256 KB); skyldig koll (sparAndel) och `npm run utseende` (Byns tal).
- 12.3.2 (eldens skuggor): bara bilden (ui/eldskugga.ts, ui/natt.ts, ui/terrang.ts); skyldig `npm run utseende` på natten (en skärmbild i granskning/sken/natt-skuggor.png) och samma-kollen (inget annat ändrat; scenariot eldskugga prövar att byn är densamma).
- 12.1.129 (gånganimationen): benen rör sig bara när platsen i simuleringen ändrats sedan förra bilden (garNu och simPlats i ui/stalle.ts). Ett prov med spelets slag (nastaSteg) visade ingen gång utan förflyttning när bildens tid går framåt; felet fanns när bildens tid inte flyttar figuren (samma tid i två bilder). Skyldig: titta i webbläsaren att ingen går på stället (avsnittet om 11.1.69 ovan), och koll.
- 12.1.169 (skenet och arbetsljuset): ändrar spelet (MORKER.eldR 9 → 14, FACKLA.r 6 → 9, LJUS.r 3 → 5, ny MORKER.glodR 1,5: glöden lyser också i simuleringen). eldRackvidd i sim/ljus.ts läses av bilden. Skyldig koll med nytt facit, `npm run likhet` och `npm run utseende` på natten. Bilden i granskning/sken/natt-169.png. Scenario skenet.
- 12.1.170 (mjukare sken utan raster): bara bilden (ui/natt.ts) och utseendetestet (src/test/utseende.ts räknar färger mellan två steg av samma palettfärg som ljusets övergång). Prövat här: `FALL=natt LAGE=ljust npm run utseende` gav 0 punkter utanför paletten och 5 747 i övergången. Skyldig hela `npm run utseende` och samma-kollen.
- 12.1.172 (skenet tonar ut mjukare och längre): bara bilden (ui/natt.ts, ui/terrang.ts, ui/eldskugga.ts) och balanstalet MORKER.skenUt (läses bara av bilden). Skyldig `npm run utseende` på natten och samma-kollen.
- 12.1.176 (facklan 12 rutor, samma kurva för alla ljus): ändrar spelet (FACKLA.r 9 → 12); skyldig koll med nytt facit, `npm run likhet` och `npm run utseende` på natten.
- 12.1.177 (långsammare arbete i det svaga skenet): ändrar spelet (MORKER.skenFart 0,8 i skenet utanför räckvidden, iSkenet i sim/ljus.ts). Skyldig koll med nytt facit; `npm run likhet` körd i molnet på ef10eae: 4 av 4 byar exakt lika i 720 timmar.
## Grenen par-teknik (12.1.158, 12.1.151, 12.1.126, 12.1.174)

- ddf63f1 (12.1.158): det som läggs ner framför en station hamnar bredvid (dropLoad i lager.ts), och benet ärver till slaktbänken (KALLA). Ändrar grunden för var bördor läggs: skyldig koll med nytt facit och `npm run likhet`.
- 9c0ae22 (12.1.151): en slaktad kanin ger två ben. Skyldig koll med nytt facit.
- 12.1.126 ändrade bara designdokumentet.
- c1eb08d (12.1.174): röjningens och stubbarnas brist följer det som är kvar per plats. Ändrar vad byarna gör på Förbättra: skyldig koll med nytt facit, `npm run likhet` och en titt i fasens Balans (`npm run balans -- 24 35`) på att byarna fortfarande röjer.
## Grenen par-roda (12.1.123, 12.1.124, 12.1.167 utom knapphet)

- 12.1.123 ändrar spelet: jakten efter skinn väntar när ett fällt djur ligger oslaktat (då fattas stationen eller kniven) eller när någon redan jagar efter skinnet (`arv` i projekt.ts; jägaren har nu `hamtar` som samlaren). Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` med nytt facit.
- 12.1.167 och 12.1.124 ändrar bara scenarier (slump, ui-ren, fangar, varm, fritid, kista). De 28 scenarierna kördes ensamma i molnet på grenens sista commit; knapphet är kvar röd (frågan till Björn i steget).
## Grenen par-val (12.1.45–12.1.49, 12.1.52, 12.1.53: valet av aktivitet efter granskningen)

- Committerna på par-val har bara typkontrollen och stegens egna scenarier bakom sig. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` när grenen förts in i varld; stegen ändrar spelet, så koll sparar nytt facit.
- 12.1.45 (barnens hjälp följer behovet): barnet som hjälper till väljer bland nivå 6:s rader med poäng, som de vuxna, och leker när inget fattas. Scenario: barnhjalp. Vakten Skälet stämmer (12.1.42) finns inte i grenen; pröva den för barnen när felsok-12-1 är inne.
- 12.1.46 (den sjuke och skadade vilar): `kroppLust` i halsa.ts (0 för den som hellre vilar, annars mindre med smärtan och sjukdomen) är en faktor i sporten, i att följa med till en match, i barnens lek och hjälp, i Förbättra (forbNu), i vattnet till fältet och örtköket och i vilans vikt på fritiden. "Svårt sjuk" (loggen och upplevelserna) från SJUK.ligga i stället för 0,5, och varianten med feber bara för en sjukdom med feber. Scenario: sjukvila. Scenariot fritid (vilan på natten mot dagen) var rött redan före steget och blir lite rödare (mer vila på dagen hos de sjuka).
- 12.1.47 (åldern i slagsmålen): chansen att ett gräl blir ett slagsmål gånger den mindres storlek mot den störres upphöjt till `slagsmal.storlek` (storleken = åldern mot vuxen), och ett barn under `slagsmal.smaBarn` år gråter i stället (räknaren `gralGrat`). Scenario: barnslagsmal.
- 12.1.48 (handeln köper det byn vill ha): byn köper så många som den tar emot innan det blir över (`bynKopAntal` i behov.ts, samma gräns som bynOver), och det sista av en sak utan behov behålls när byn säljer (som redskapen). Orden: rökelse har flertal, jordgubbsplantan är "en", och rätterna skrivs "en portion fin rotgröt". Scenario: handelretur.
- 12.1.49 (det som bärs i onödan): målet för den som bär tillbaka räknas med samma lagerplatser som när flytten valdes (`backSpot` i lager.ts): finns ingen bättre plats längre läggs saken där den låg. Den som bär in och bara tagit upp ett redskap går tillbaka och lägger det i förrådet (`barHem`). Scenario: barretur. Ändrar gången: skyldig `npm run likhet`.
- 12.1.52 (grenarna över taket): tre källor rättade. Bränsle som inte fick plats på elden gick tillbaka som grenar (ett vedträ blev två och en halv gren); nu som ved (`giveBack`). Grenarna över tändningens buffert eldas före veden (`takeFuel`). Grenarna från en stam som huggs eller klyvs lämnas på marken när grenarna är vid taket och veden räcker (`grenarMed` i steg.ts). Scenario: grenartak. Pröva vakten Taket (12.1.42) för grenarna när felsok-12-1 är inne.
- 12.1.53 (många klyver virke): projektens brist räknas en gång i timmen, så alla som valde samma timme såg samma brist. Raden virke har nu `paVag` (projekt.ts): det de andra som klyver bär hem räknas bort ur bristen varje gång någon väljer (`personVarde`). Scenario: virkeklyv. Pröva vakten Samma arbete av samma skäl (12.1.42) för virket när felsok-12-1 är inne.
## Grenen par-register (12.1.139–12.1.143, 12.1.149, 12.1.150)

- 12.1.140 (fritiden som register) är prövad i molnet: `npm run samma` gav samma utveckling som 12.1.139, och `npm run likhet` 4 av 4 byar exakt lika. Scenariot fritid har raden "man vilar ut när det är mörkt (17 % av natten)" röd, med samma tal redan på 12.1.139.
- 12.1.139 (yrkena präst, skald, skrivare, bryggare, vävare och krukmakare; bryggningen flyttad från kocken): bara typkontrollen och scenariot yrken. Yrkestaggen är bara ett namn och påverkar inte vad man gör, men taggen skrivs i loggen och personens hand, så facit kan visa annan utveckling. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` när grenen förts in i varld.
- 12.1.141 (fler olyckor: sparken, vagnen, smedjan och isen; dödsorsaken drunkning): scenarierna olyckor och kropp gick igenom i molnet. Ändrar spelet (nya slumptal i hälsan), så samma och facit visar annan utveckling. Läs räknaren `olyckor` och dödsorsaken "under isen" i fasens Balans.
- 12.1.142 (larm för björn och översvämning): scenarierna larm2 och larm gick igenom i molnet. Ändrar spelet (larma drar slumptal i ryktena). Läs räknarna `bjorn larm` och `flod larm` i fasens Balans: björnen håller sig oftast 18–20 rutor utanför byn, så gränsen `bjornmote.larmNara` är 25.
- 12.1.143 (rummens plus, RUM_PLUS i rum.ts): scenarierna rumplus och rumstyper gick igenom i molnet. Ändrar spelet (vilan i ett eget rum och tankarna). Pluset under rummets taggar i fliken Hus är en platshållare (+) och har inte prövats med `npm run utseende`. När grenen par-mobler förs in: Sjukstugan räknas som en annan funktion i Eget rum av sig själv, eftersom villkoret läser slag i RUMSTYPER.
- 12.1.149 (klädseln efter värmen, plaggPoang i utrustning.ts; KROPP.varmGrader styr nu bara tanken För varm och badet): scenarierna kladval (nytt, ersätter kladvarme), svalaplagg, klader, plagg, naken, ullplagg, mantel och vinterpals gick igenom i molnet. Ändrar spelet. Raden "den som är extremt varm blir tröttare och tänker på det" i scenariot varm var röd redan på 12.1.139, före grenen.
- 12.1.150 (slöjdbänkarna efter arbetet som väntar, koKrok i forradsmal.ts fylld i projekt.ts; balanstalet `station.bankHinner` = 60 minuter): scenarierna slojdbankar (nytt), kladmaterial och varm gick igenom i molnet (varm med sin röda rad från före grenen). Ändrar spelet. Läs i fasens Balans hur många slöjdbänkar byarna bygger (`npm run hus`) och pröva `bankHinner` med `jamfor --svep` om det blir för många eller för få.

## Grenen par-paneler2 (12.1.12, 12.1.25, 12.1.26, 12.1.28, 12.1.29, 12.1.35, 12.1.50 och 12.1.51)

- 12.1.12, 12.1.25, 12.1.26, 12.1.28, 12.1.29 och 12.1.35 fanns redan i koden på varld (med kontrollerna i ui-ren, sedlista och varldskarta, som går igenom); grenen bockade av dem. Bandet i Seder (kortet f12_sederband i bildstil/fas12.js) väntar på att bildstilen publiceras och på Björns ja eller nej.
- 12.1.50 ändrar texter i simuleringen (utbyggnadens rutor, projektens skäl i ProjektDef.skal). Skälet är en del av uppgiftens text, så facit och samma-kollen kan visa annan utveckling om skälen jämförs; nya textkontroller (noll, litetNamn) larmar i koll om en text är fel. `npm run texter -- 2 10` gav 0 fel för dem.
- Rättelsen av den oändliga loopen i bristNu (8b2aaa0, från steg 12.1.150) ändrar vad slöjdbänkens brist läser medan bristerna räknas om. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` med nytt facit.
- 12.1.51: vakten för knappar som täcker annat (src/test/tackvakt.ts) körs av `npm run utseende`; när felsok-12-1 förs in blir den en rad i FORMVAKTER. Skyldig `npm run utseende`.
- Scenariot ord var rött redan på varld (tekniker utan "att göra": drejskiva, oljelampa, sang, stol, laggkar, ost, brunn, utedass, sjukstuga, fyrfat).
