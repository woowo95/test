# Samhällssimulatorn – arbetsregler

Björn programmerar inte; Claude skriver all kod. Svara på svenska.

## Innan du programmerar (varje prompt)

Björn förklarar inte i prompten var fakta finns. Gör därför alltid så här innan du skriver kod:

1. Läs "Läget just nu" i designdokumentet: vad som är byggt, nästa steg och kända brister.
2. Hitta steget i Färdplanen (sök på numret, t.ex. mönstret `^1\.5\.`). Nämner Björn inget nummer: hitta systemet som berörs och se om det redan finns ett steg.
3. Läs avsnitten som systemets "Läs:" pekar på, och sök i dokumentet på orden prompten handlar om (saker, handlingar, system). "Beslut" är bestämt; "förslag" är inte bestämt.
4. Fråga först om steget säger "Björn avgör", om dokumentet säger emot sig självt eller prompten, eller om det saknas det som behövs. Säg i så fall vad som saknas.
5. Läs `ARKITEKTUR.md` och sedan bara de filer som berörs.

Sök i dokumentet i stället för att läsa allt; det är långt.

## Nya system som Björn beskriver

- Bygg bara in det som det redan finns system för och som programmet är moget för nu.
- Allt annat skrivs in i designdokumentet för att göras senare: som ett steg under rätt system i Färdplanen (nästa lediga nummer, med en "Läs:"-hänvisning om systemet är nytt), och förklaringen i rätt avsnitt. Bygg det inte i förväg.
- Säg i svaret vad som byggdes nu och vad som lades i designdokumentet.

## Färdplanen

- Färdplanen i designdokumentet är numrerad: fas, system, steg. Ett steg med tre siffror (t.ex. 2.5.1) är en prompt.
- Björn säger t.ex. "gör 2.5.1", "gör 2.5" eller "gör till och med 2.6.2". Bygg de steg som nämns och stanna efter det sista.
- Läs avsnitten som systemets "Läs:" pekar på innan du bygger. Står det "Björn avgör" i steget, fråga först.
- Bocka av ett byggt steg och skriv versionen efter, t.ex. "(v36)". Byggda steg byter aldrig nummer.

## Principer

- Register och ett ställe per sak: allt det kan finnas fler av (handlingar, saker, tekniker, djurarter, behov, flikar) är rader i ett register som koden frågar, och allt om ett system samlas i en fil i koden och ett avsnitt i designdokumentet. Ett nytt system börjar med sitt register.
- Gränssnittet: symboler först. Förklarande text göms och kommer fram när man trycker på något eller håller musen över det.
- Snabbläget (ikappräkning, snabbspolning) ska ge samma utveckling som det levande läget. Kontrollera med `npm run likhet` när något i arbete, gång, samtal eller lärande ändras.
- Tid i svar och dokument: skriv alltid ut vad ett tidsspann betyder. Spelet följer den verkliga klockan: ett dygn = ett år i spelet, en vecka = en tidsålder (årstid). Skriv t.ex. "28 dygn (28 år i spelet, fyra veckor i verkligheten)". Testernas körtid ("40 s") är datorns tid och har inget med spelet att göra; säg det om den nämns.
- Elden är ett verktyg, inte ett mål. Att den brinner är inget mått på en lyckad by, och den får inte styra andra system. Faror som kyla går före förbättringar via prioriteringen i valet av aktivitet.

## Källor

- Spelet (artefakt): https://claude.ai/artifact/TdCUKPj4wC55BVGq7db14n
- Designdokument (Claude Docs): https://claude.ai/artifact/McP5446XiGQaJ3hbs9YXrc. Läs avsnittet "Läget just nu" först.
- Koden: läs `ARKITEKTUR.md` först. Den säger vilken fil som gör vad, vilka regler som håller ihop koden och hur man lägger till en handling, en sak, en teknik, en flik eller ett nytt system. Öppna sedan bara de filer som berörs.

- Kodgranskning: när Björn ber om en grundlig genomgång av koden, följ `GRANSKNING.md`.

## Bygga och publicera

- `npm install`, sedan `npm run build`. Det ger `samhallssimulatorn.html`, och i `publicera/` källkoden som .txt och fillistan `filer.json`.
- Publicera alltid till samma artefakt-URL så att Björns sparade by och länk finns kvar: `file_path` = `samhallssimulatorn.html`, `url` = spelets URL och `files` = innehållet i `publicera/filer.json`. Då kommer källkoden med under `kalla/`.
- Uppdatera "Läget just nu" i designdokumentet när något nytt är byggt, och bocka av steget i Färdplanen.
- Commiten som publiceras säger versionen inom parentes, t.ex. "(v44)". Då hittar det stora testet den med `jamfor --mot v44` (git-taggar går inte att pusha härifrån).

## Enklare modeller (spara tokens)

- Lämna enklare uppgifter till en enklare och billigare Claude-modell när det passar: köra långa tester och sammanfatta resultatet, söka fakta i dokumentet eller koden, och mekaniska ändringar som följer ett tydligt mönster (en ny rad i ett register, ett scenario efter en mall).
- Det som kräver helheten görs av huvudmodellen: simuleringen, likheten mellan spelet och ikappräkningen, balansen och designbeslut.
- En hjälpare börjar utan att veta något om projektet och måste få allt den behöver i uppdraget. Små uppgifter går därför fortare att göra direkt.

## Tester (spara tokens)

### Testa i grupper

- Efter varje steg: `npm run snabbkoll -- [scenarier]` (ca 40 s datortid). Typkontrollen, alla scenarier utom de långa (`lang` i scenario.ts; nämn det nya systemets scenario om det är långt) och vakterna i fyra byar under de första 12 dygnen (12 år i spelet, knappt två veckor i verkligheten). Den hittar fel medan de är färska. Committa varje steg för sig.
- Efter det sista steget i ett system i Färdplanen (t.ex. 1.4.3 om 1.4 slutar där): det stora testet. `npm run koll`, `npm run jamfor -- 35 64 --mot vNN` mot versionen före systemet, och `npm run likhet` om arbete, gång, samtal eller lärande ändrats. Skriv resultatet från jamfor i systemets sista steg i Färdplanen, också när det godtas. Visar det stora testet "sämre" går det att hitta steget med `jamfor --mot` stegets commit.
- Det stora testet direkt efter ett steg som ändrar grunden (slump, förråd, tid, stegens ordning).
- Hög tolerans för balansen medan systemen byggs. Rätta direkt: vaktlarm, scenarier som inte går igenom, ett nytt system som aldrig används, och när jamfor säger "sämre" om byar som dog ut, svalt ihjäl eller frös ihjäl. Annat (hunger, humör, mat och ved efter vintern, elden) godtas och skrivs in i steget; det balanseras i det sista systemet i fasen (Balans).
- `npm test` och samma-kollen visar "annan utveckling" efter varje steg som ändrar spelet. Spara nytt facit (`npm run facit`) vid det stora testet.

### Kommandon

- `npm run koll`: det stora testet (ca 3 min datortid). Det kör typkontrollen, `npm test`, alla scenarier och samma-kollen samtidigt och skriver bara ut det som behövs.
- `npm run samma`: utvecklas byarna exakt som förut (ca 5 s)? Används vid ombyggnad som inte ska ändra något i spelet.
- `npm test`: tre byar i 90 dygn utan grafik, en rad per by, jämfört med `test/facit.json`. Visar bara det som ändrats, alltid om en by dött ut och återgrundats, och vakter som larmar om något omöjligt händer (NaN, negativa förråd, folk i vattnet).
- `npm run facit`: spara nytt facit (och ny samma-koll) när en ändring i spelet är avsiktlig.
- `npm run jamfor -- [dygn] [byar] [--mot gren]`: blev spelet bättre eller sämre? Kör samma byar med koden nu och med main (eller `--mot`) i 35 dygn (35 år i spelet, fem veckor i verkligheten: grundandet och första vintern), åtta byar åt gången tills varje nyckeltal är avgjort: bättre, sämre, lika eller ingen stor skillnad. Det ingår i det stora testet, med `--mot` versionen före systemet, i stället för att jämföra två balanskörningar. Den äldre versionens resultat sparas, så bara den nya koden körs (ca 3–7 min datortid).
- Brus: små byar står på gränsen till svält, och minsta ändring kan avgöra om en enskild by klarar sig, åt båda hållen. En eller ett par byar som blivit mycket sämre är därför inget bevis; det är bara när de flesta går åt samma håll, eller när `jamfor` säger "sämre", som något är fel. Skillnader på några hungertimmar går inte att mäta snabbt.
- `npm run natur -- [byar] [dygn]`: människornas avtryck på naturen (steg 1.7.2): samma byar med och utan redskap, median för invånare, mat, växter kvar nära byn, avstånd till maten, skog, stigar och hus (ca 3 min datortid för 16 byar i 35 dygn).
- `npm run balans -- [antal] [dygn]`: många byar parallellt, median/sämst/bäst. En översikt över hur byarna mår, inte en jämförelse: två körningar skiljer sig av sig själva.
- `npm run scenario -- [namn]`: scenariotester (glanta, ingen-yxa, yxa, vinter-slocknad, knapphet, svamp, flinta, kunskap, temperatur, befolkning, fiskespjut, bostad, fritid, lager, slitage, lagerplatser, rotter, aktivitet, teknik, bygg, varmekarta, djur, agande, gava, egendom, behov, kalender, sparning, kaniner, slump, historik, ved, delning, arv, varde, abborre, byggnader, forradshus, paborjat, familjehus, funktion, natur) som kontrollerar att det som ska hända händer. Lägg till ett scenario när ett nytt system byggs, och märk det `lang: true` om det tar 13 s eller mer (datorns tid), så att den snabba kollen hoppar över det.
- `npm run takt -- [by] live|snabb [timmar]`: hur mycket en arbetstimme ger i levande läge och snabbläget, antal turer hem och hur mycket mark som nötts. Använd när arbete, bördor eller gång ändras.
- `npm run teknik -- [antal]`: när varje teknik upptäcks och hur många som kan den.
- `npm run likhet -- [timmar] [byar]`: samma byar i levande läge och snabbläget, sida vid sida (tar ett par minuter).
- `npm run detaljer -- [by]`: den långa utskriften, bara när något behöver undersökas.
- Händelseloggen (`s.log`) rymmer bara de senaste 400 raderna. Räkna aldrig ur den i tester eller spelet; räkna i byns statistik när det händer (steg 1.5.1).
- Ta skärmbilder bara när utseendet ändrats; kontrollera annars text på sidan.
