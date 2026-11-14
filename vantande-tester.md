# Väntande tester

## 10.2 – det sista (10.2.102–10.2.108)

Klart och grönt för 10.2.102: `npm run koll`, `npm run likhet` (4 av 4 exakt lika), `npm run utseende` och `npm run jamfor -- 35 64 --mot e4216284` (resultatet står i 10.2.102 i Färdplanen).

10.2.103–10.2.107 ändrade testerna: testbyarna är nu 1, 1511 och 4634 i 50 dygn, samma-kollen är testbyarnas hash i facit och aldrig och teknikens upptäckter är iakttagare i `npm test`. 10.2.108 gjorde stationFlytt billigare utan att ändra spelet och lade till `npm run ikapp`.

Kvar (kör med `caffeinate -i`, annars sover Mac:en på batteri och byarna ser ut att hänga):
- `npm run facit` på 10.2.107 (nya testbyar), och `npm run samma` efter 10.2.108 mot den samma-koll som facit sparade (ska vara exakt lika).
- `npm run koll`, `npm run likhet`, `npm run kostnad`, `npm run riktad -- --karta` (committa kartan).
- Publicera som v527, bocka av 10.2.102 och 10.2.108 och sätt "Programmeras nu" till (inget).
