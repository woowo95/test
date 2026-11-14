# Väntande tester

## 10.2.102 – det sista efter 10.2 (commit dad0e68b)

Klart och grönt: `npm run koll`, `npm run likhet` (4 av 4 exakt lika), `npm run utseende` (natt-rovare, inzoomning) och `npm run jamfor -- 35 64 --mot e4216284` (resultatet står i 10.2.102 i Färdplanen). Jamfor gav tre vaktlarm, som rättades i dad0e68b; de tre byarna går nu utan larm, och `npm run riktad` är grön (18 av 18). 10.2.50–10.2.101 (utom 10.2.60) är avbockade med (v527).

Kvar (kör med `caffeinate -i`, annars sover Mac:en på batteri och byarna ser ut att hänga):
- `npm run facit`: `npm test` visar att by 42 utvecklas lite annorlunda efter rättningen (pop 22 → 21), vakterna är tysta. Avbröts medan by 42 kördes (den tar ca 55 min datortid).
- `npm run kostnad`, `npm run riktad -- --karta` (committa kartan).
- Publicera som v527, bocka av 10.2.102 och sätt "Programmeras nu" till (inget).
