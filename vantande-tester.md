# Väntande tester

## 11.1 Tydligare gränssnitt (molnet, grenen gransnitt-11-1, förd till main efter varje steg)

- Committen: den senaste på main med "11.1" i meddelandet (stegen 11.1.1–11.1.65, 11.1.68 och 11.1.70).
- Skyldig: kedjan efter systemets sista steg, `npm run kedja -- "npm run -s koll" "npm run -s likhet"`. Den körs tillsammans med 11.2 av chatten som bygger 11.2; den sparar facit och publicerar när båda är testade.
- Stegen ändrar bara gränssnittet. I simuleringens filer finns bara texter och funktioner som läser: `pliktDelar` och `VANA_AR` (sim/seder.ts), namnet Temperament i `STAT_NAMES` (sim/typer.ts) och personbeskrivningens mallar (sim/berattelser.ts, steg 11.1.70). `npm run samma` mot main gav "Samma utveckling som förut" vid 11.1.38.
- `npm run utseende` i molnet behöver Chromium från `/opt/pw-browsers/chromium` (projektets Playwright är en annan version).
