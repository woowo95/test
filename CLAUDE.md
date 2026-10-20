# Samhällssimulatorn – arbetsregler

Björn programmerar inte; Claude skriver all kod. Svara på svenska.

## Nya system som Björn beskriver

- Bygg bara in det som det redan finns system för och som programmet är moget för nu.
- Allt annat skrivs in i designdokumentet för att göras senare: under rätt fas i Färdplanen, eller i rätt avsnitt. Bygg det inte i förväg.
- Säg i svaret vad som byggdes nu och vad som lades i designdokumentet.

## Källor

- Spelet (artefakt): https://claude.ai/artifact/TdCUKPj4wC55BVGq7db14n
- Designdokument (Claude Docs): https://claude.ai/artifact/McP5446XiGQaJ3hbs9YXrc. Läs avsnittet "Läget just nu" först.

## Bygga och publicera

- `npm install`, sedan `npm run build`, som ger `samhallssimulatorn.html`.
- Publicera alltid till samma artefakt-URL så att Björns sparade by och länk finns kvar.
- Lägg uppdaterad källkod under `kalla/` i artefakten vid varje publicering (filnamn med `.txt`).
- Uppdatera "Läget just nu" i designdokumentet när något nytt är byggt.

## Tester (spara tokens)

- `npm test`: tre byar i 90 dygn utan grafik, en rad per by, jämfört med `test/facit.json`. Visar bara det som ändrats, alltid om en by dött ut och återgrundats, och vakter som larmar om något omöjligt händer (NaN, negativa förråd, folk i vattnet).
- `npm run facit`: spara nytt facit när en ändring är avsiktlig.
- `npm run balans -- [antal] [dygn]`: många byar parallellt, median/sämst/bäst. Använd vid balansering.
- `npm run scenario -- [namn]`: scenariotester (glanta, ingen-yxa, yxa, vinter-slocknad, knapphet, svamp, flinta, kunskap, temperatur, befolkning, fiskespjut, bostad, fritid) som kontrollerar att det som ska hända händer. Lägg till ett scenario när ett nytt system byggs.
- `npm run detaljer -- [by]`: den långa utskriften, bara när något behöver undersökas.
- Ta skärmbilder bara när utseendet ändrats; kontrollera annars text på sidan.
