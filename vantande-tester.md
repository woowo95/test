# Väntande tester

## 10.2.102 – det stora testet efter 10.2 (commit a28a349e och senare)

Senaste `npm run koll` (på 38ddf186): 482 av 488 scenarier gröna. Rättat efter det: agandet, koket. Kvar att göra:

- Vaktlarm i testbyarna: by 42 "text lucka" (l_byte: "Gunve lät Sigja få  mot en bit grillat kött", ett byte där det ena ledet blev tomt) och by 777 "står i en vägg (ved)".
- strakprov: vakten "lager på ett fält" (ägg på ett fält, dag 4,2). Orsaken var inte hittad (sökningen avbröts).
- varg: "en hungrig flock anfaller den som är ensam (2 anfall, 0 strider)" – anfallet blir ingen strid.
- aldrig: handlingar och saker som aldrig används, och vakten "långsam gång" (by 24758).
- handslag larmade i koll men går lokalt (troligen slump).
- Sedan: `npm run koll` igen (nytt facit sparas när allt är grönt), `npm run likhet`, `npm run utseende` (nya fallet natt-rovare för 10.2.99), `npm run jamfor -- 35 64 --mot` versionen före 10.1 (som information), `npm run kostnad`, `npm run riktad -- --karta`.
- Därefter publicera, bocka av 10.2.50–10.2.102 (utom 10.2.60, som väntar på Björn) med versionen och sätt "Programmeras nu" till (inget).
