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

## Bygga och publicera

- `npm install`, sedan `npm run build`. Det ger `samhallssimulatorn.html`, och i `publicera/` källkoden som .txt och fillistan `filer.json`.
- Publicera alltid till samma artefakt-URL så att Björns sparade by och länk finns kvar: `file_path` = `samhallssimulatorn.html`, `url` = spelets URL och `files` = innehållet i `publicera/filer.json`. Då kommer källkoden med under `kalla/`.
- Uppdatera "Läget just nu" i designdokumentet när något nytt är byggt, och bocka av steget i Färdplanen.

## Tester (spara tokens)

- `npm run koll`: kör efter varje ändring (ca 40 s). Det kör typkontrollen, `npm test`, alla scenarier och samma-kollen samtidigt och skriver bara ut det som behövs.
- `npm run samma`: utvecklas byarna exakt som förut (ca 5 s)? Används vid ombyggnad som inte ska ändra något i spelet.
- `npm test`: tre byar i 90 dygn utan grafik, en rad per by, jämfört med `test/facit.json`. Visar bara det som ändrats, alltid om en by dött ut och återgrundats, och vakter som larmar om något omöjligt händer (NaN, negativa förråd, folk i vattnet).
- `npm run facit`: spara nytt facit (och ny samma-koll) när en ändring i spelet är avsiktlig.
- `npm run balans -- [antal] [dygn]`: många byar parallellt, median/sämst/bäst. Använd vid balansering.
- `npm run scenario -- [namn]`: scenariotester (glanta, ingen-yxa, yxa, vinter-slocknad, knapphet, svamp, flinta, kunskap, temperatur, befolkning, fiskespjut, bostad, fritid, lager, slitage, lagerplatser, rotter, aktivitet, teknik, bygg, varmekarta, djur, agande, gava, egendom, behov, kalender, sparning, kaniner) som kontrollerar att det som ska hända händer. Lägg till ett scenario när ett nytt system byggs.
- `npm run takt -- [by] live|snabb [timmar]`: hur mycket en arbetstimme ger i levande läge och snabbläget, antal turer hem och hur mycket mark som nötts. Använd när arbete, bördor eller gång ändras.
- `npm run teknik -- [antal]`: när varje teknik upptäcks och hur många som kan den.
- `npm run likhet -- [timmar] [byar]`: samma byar i levande läge och snabbläget, sida vid sida (tar ett par minuter).
- `npm run detaljer -- [by]`: den långa utskriften, bara när något behöver undersökas.
- Händelseloggen (`s.log`) rymmer bara de senaste 400 raderna. Räkna aldrig ur den i tester eller spelet; räkna i byns statistik när det händer (steg 1.5.1).
- Ta skärmbilder bara när utseendet ändrats; kontrollera annars text på sidan.
