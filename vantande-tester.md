# Väntande tester

## 10.2.102 – det sista efter 10.2 (commit 88793874)

Klart och grönt: `npm run koll` (alla scenarier, aldrig omkörd och grön), nytt facit och ny samma-koll (commit 88793874), `npm run likhet` (4 av 4 byar exakt lika), `npm run utseende` (natt-rovare och inzoomning, inga larm). 10.2.50–10.2.101 (utom 10.2.60) är avbockade med (v527) i Färdplanen.

Kvar:
- `npm run jamfor -- 35 64 --mot e4216284` (v524), som information. Avbröts efter de första 8 byarna, som är sparade i `node_modules/.cache/jamfor` (i testkopian `$TMPDIR/samhalle-test`), så nästa körning fortsätter därifrån. Kör med `caffeinate -i`: Mac:en sover annars på batteri, och då ser byarna ut att hänga (stoppas efter 150 min).
- `npm run kostnad`, `npm run riktad -- --karta` (committa kartan).
- Publicera som v527, bocka av 10.2.102 med resultatet av jamfor och kostnad, och sätt "Programmeras nu" till (inget).
