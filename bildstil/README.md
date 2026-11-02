# Bildstilen: guiden för allt som ritas

Sidan: https://claude.ai/artifact/Khx8Ggn4CdRb76UpZLnQww. Läs avsnittet "Guiden" på sidan först.

- `kropp.html`: sidans text (guiden, regler, beslut och valdelen). `stil.css`: utseendet.
- `sida.js`: paletten (`PALETT`, `gorPalett`), ritfunktionerna (scenen, stationerna, folket, porträtten, symbolerna) och valdelen: registret `VAL`.
- `ikoner.json`: spelets pixelbilder som de ser ut i dag (`PIX` och `PAL`). Skrivs om från `src/ikoner.ts` med `npx tsx bildstil/ikoner.ts` när spelets bilder ändrats.
- `portratt.json`: registret `PORTRATT` (steg 5.2.2) över porträttens och kartfigurens delar: mallarna med fästpunkter och zoner, lagrens ordning, färgerna (hudtoner, hårfärger, ögonfärger, materialen), lägena, humöret, åldrarna, kartfigurens riktningar och lägen, och en rad per del. Bara data, så att spelet kan läsa det rakt in i 5.2.3.1. `ritad` är hur många gånger delen ritats (0 = grå platshållare).
- `skapare.js`: karaktärsskaparen och granskningsläget (steg 5.2.2.1). Lagren, maskerna, färgbytet, kartfiguren i alla riktningar och lägen, arvet och de grå platshållarna (en funktion per sort i `RITA`). När en del ritas på riktigt får dess rad en bild och ett högre `ritad`.
- `node bildstil/bygg.cjs` ger `bildstil/bildstil.html`. Publicera den med Artifact-verktyget till samma URL. Utelämna `capabilities` vid en ny publicering, så att databasen (`db`) med Björns val finns kvar.

Att lägga in något att välja: en rad i `VAL` med `id`, `namn`, `vad`, `typ` (`'tre'` för en ny sak, med tre versioner, eller `'janej'` för något som görs om, med en version), eventuellt `idag`, och `versioner` (`{ text, w, h, rita(B, P) }`). Björns svar ligger i databasens samling `val`, ett dokument per `id`: `{ svar: '1' | '2' | '3' | 'ja' | 'nej', kommentar, nar }`. Läs dem med ArtifactData (`list`, samlingen `val`). När det valda är inbyggt i spelet: ta bort raden ur `VAL` och dokumentet ur `val`, och publicera igen.

Granskningen (steg 5.2.2): ett kort per del i `PORTRATT`, i registrets ordning. Björns svar ligger i samma samling `val`, ett dokument per del med id `del-<delens id>` (en mall `del-mall-kvinna`, en färg `del-farg-hud-blek`): `{ svar: 'ja' | 'kommentar', kommentar, nar, ritad, del }`. Ett svar gäller den ritning det gavs för: när delen ritas om höjs `ritad` i registret, och då står kortet obesvarat igen med Björns förra kommentar överst ("Din kommentar förra gången: …"). Dokumentet behöver alltså inte tas bort för hand. Kombinationerna Björn sparar i skaparen ligger i samlingen `kombinationer`: `{ person, kommentar, text, nar }`.
