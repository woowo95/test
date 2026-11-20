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

## Hopslagna nattgrenar

- natt-bildstil (12.1.69, 12.1.70, 12.1.102): src/portrattkarna.ts är omskriven (samma porträtt punkt för punkt); skyldig samma-kollen och `npm run utseende`.
- natt-tester (12.1.68, 12.1.85 testernas del, 12.1.100, 12.1.101, 12.1.106): skyldig koll.
- natt-paneler (12.1.54, 12.1.73, 12.1.66, 12.1.99, 12.1.105, 12.1.72): skyldig koll, samma-kollen (12.1.99) och `npm run utseende`. Vid ihopslagningen behölls varlds ändringar där de gick emot grenens: lerkrukans låga platshållare är borttagen (12.1.15), gömmorna ritas inte på världskartan (12.1.9), kartan har ingen knapp (12.1.29), sederna har ingen pil vid vågen och visar alla rader (12.1.28), och påbuden lagskrift och fängelse finns inte längre (12.1.27).
- natt-jarn (12.1.1–12.1.3, 12.2.1–12.2.13 och 12.3.1): skyldig koll med nytt facit (myren, torven och isborrens gräns på 30 cm ändrar byarna), likhet (tillsynen, 12.2.2) och balansen (`npm run balans -- 24 35`). 12.2.5 är prövat med `npm run samma`.
- 18 scenarier var röda på varld redan före ihopslagningarna (39c496fa, efter 12.1.33): kista, handlare, slaktbank, virke, ikoner, symboler, tidsord, borta, varldtillstand, varldslag, forhistoria, kallelse, gomma, handelsresa, vagmote, turne, talt, kyrkanutlyser. De hör till 12.1-stegen från 12.1.9 och rättas innan 12.1 testas med kedjan.

## Frågor till Björn (från natten till 20 november)

- Benspaden görs inte längre i någon av testbyarna på 50 dygn (50 år i spelet, sju veckor i verkligheten): benen går först till sylen, nålarna och snarorna. Den står nu bland det sällsynta i testet. Ska benen räcka till spaden tidigare (en sak för fasens Balans), eller är det rätt att den kommer sent?
- Världens rader för handelsläger som brutits upp blir kvar för alltid (ungefär 1,6 nya per dygn, alltså per år i spelet). Med tiden växer världens del av sparningen förbi gränsen 512 KB. Ska ett upplöst läger glömmas efter en tid, som ett minne som bleknar?
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

## Grenen par-val (12.1.45–12.1.49, 12.1.52, 12.1.53: valet av aktivitet efter granskningen)

- Committerna på par-val har bara typkontrollen och stegens egna scenarier bakom sig. Skyldig `npm run kedja -- "npm run -s koll" "npm run -s likhet"` när grenen förts in i varld; stegen ändrar spelet, så koll sparar nytt facit.
- 12.1.45 (barnens hjälp följer behovet): barnet som hjälper till väljer bland nivå 6:s rader med poäng, som de vuxna, och leker när inget fattas. Scenario: barnhjalp. Vakten Skälet stämmer (12.1.42) finns inte i grenen; pröva den för barnen när felsok-12-1 är inne.
