# Lagerplatsprogram

Loggar standardplatsen för varje aktiv Rentman-artikel på Ljus & Nöjes lager genom klick på en lagerkarta. Byggt efter dokumentet *Lagerplatsprogram – specifikation*.

Programmet körs som en Claude-artifact: https://claude.ai/artifact/TFC2rzdhv9fsJc5CHJzzfD. `index.html` är hela programmet. Publicera om samma fil för att uppdatera det.

## Databas (artifactens delade databas)

| Samling | Dokument | Innehåll |
| --- | --- | --- |
| `artiklar` | `s0`–`s11` | `items`: artiklar per Rentman-ID (namn, mapp, grupp, typ, serienr, arCase, innehall, aktiv, borttagen, forstInlast, senastSedd). Uppdelat i 12 dokument efter hash av ID. |
| `genomgang` | ett per Rentman-ID | status (`placerad` / `aterkom` / `sorteras_ej`), osaker, text, platser, uppdelad, `enheter` per serienummer, andrad, shard |
| `kartobjekt` | ett per objekt-ID (H1, S1, G1, P1, Z1 …) | typ, namn, farg, form (`rect` med x/y/w/h eller `poly` med punkter) |
| `config` | `meta`, `prioritet`, `karta` | senaste import, prioriteringslistan (Rentman-ID i ordning), kartans djup och ID-räknare |
| `logg` | ett per session | varje åtgärd med tid |

En plats är `{typ: "punkt" | "zon", objektId, x, y | polygon, hojd, antal}` i kartans koordinatsystem (x 0–1000, y 0–kartans djup). Platser "via case" lagras inte. De räknas fram från casets egna platser, så de följer med när caset flyttas.

## Import från Rentman

Rentmans CSV-export (Utrustning → Exportera) läses direkt: Kod är nyckeln, Path blir mapp, "Visa namn (Serienummer)" ger serienumren (inaktiva hoppas över) och "Physical combination" räknas som case. Exporten skriver citattecken i namn utan att dubbla dem, så programmet har en egen CSV-läsare som tål det.

Caseinnehållet finns inte i exporten. `data/Caseinnehall_Rentman_20261019.csv` (Case-kod;Kod;Antal) är hämtad ur Rentmans API (equipmentsetscontent, bara fysiska kombinationer) och läses in tillsammans med exporten.

## Karta från Riggplaneraren

Under Karta läses en sparfil från Riggplaneraren (`.json`) in. Zoner blir zoner, byggnader blir hyllor och tält blir skåp. Byggnader med "skåp" i namnet blir skåp. Flyttar man ett Riggplaneraren-objekt under Karta sparas flytten i meter i `config/karta.flytt` och gäller vid varje ny inläsning. Objekten får `riggId`, så en ny inläsning uppdaterar form och namn utan att placeringar tappar sitt objekt. Skala och nollpunkt (`config/karta.rigg`: `skala` enheter per meter, `x0`, `y0` i meter) räknas om vid varje inläsning så länge inget är placerat, och ligger sedan fast. Byggnader som heter Dörr, Port eller Lastport blir typen `dorr`, som syns på kartan men inte tar emot placeringar. Rutan "Räta upp" gör zonkanter som lutar högst 10° helt raka (gemensamma hörn flyttas tillsammans), lägger raka linjer inom 25 cm från varandra på samma linje och rätar byggnader som är vridna högst 6° från 90°.

## Avvikelser från specifikationen

- Platserna ligger i artikelns `genomgang`-dokument i stället för en egen samling `platser`, så att en artikel alltid sparas i en enda skrivning.
- Virtuella kombinationer (paket) hoppas över vid import om inte rutan för dem kryssas i.
