# Bildstilen: guiden för allt som ritas

Sidan: https://claude.ai/artifact/Khx8Ggn4CdRb76UpZLnQww. Läs avsnittet "Guiden" på sidan först.

- `kropp.html`: sidans text (guiden, regler, beslut och valdelen). `stil.css`: utseendet.
- `sida.js`: paletten (`PALETT`, `gorPalett`), ritfunktionerna (scenen, stationerna, folket, porträtten, symbolerna) och valdelen: registret `VAL`.
- `ikoner.json`: spelets pixelbilder som de ser ut i dag (`PIX` och `PAL`). Skrivs om från `src/ikoner.ts` med `npx tsx bildstil/ikoner.ts` när spelets bilder ändrats.
- `node bildstil/bygg.cjs` ger `bildstil/bildstil.html`. Publicera den med Artifact-verktyget till samma URL. Utelämna `capabilities` vid en ny publicering, så att databasen (`db`) med Björns val finns kvar.

Att lägga in något att välja: en rad i `VAL` med `id`, `namn`, `vad`, `typ` (`'tre'` för en ny sak, med tre versioner, eller `'janej'` för något som görs om, med en version), eventuellt `idag`, och `versioner` (`{ text, w, h, rita(B, P) }`). Björns svar ligger i databasens samling `val`, ett dokument per `id`: `{ svar: '1' | '2' | '3' | 'ja' | 'nej', kommentar, nar }`. Läs dem med ArtifactData (`list`, samlingen `val`). När det valda är inbyggt i spelet: ta bort raden ur `VAL` och dokumentet ur `val`, och publicera igen.
