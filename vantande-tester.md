# Väntande tester

## 11.1 Tydligare gränssnitt (molnet, grenen gransnitt-11-1, förd till main efter varje steg)

- Committen: den senaste på main med "11.1" i meddelandet.
- Skyldig: kedjan efter systemets sista steg, `npm run kedja -- "npm run -s koll" "npm run -s likhet"`. Den körs tillsammans med 11.2 av chatten som bygger 11.2; den sparar facit och publicerar när båda är testade.
- Stegen 11.1.66, 11.1.71, 11.1.72 och 11.1.73 ändrar hur byarna utvecklas (sovplatsen, latrinerna, vilan och toahögen inne), så samma-kollen och facit visar annan utveckling. Steg 11.1.72 säger också att talen prövas med `npm run jamfor -- 35 16 --satt kropp.restVila=0.09,kropp.restGolv=0.03,kropp.restTak=0.02,kropp.restBadd=0.05` (de gamla talen mot de nya).
- Det lilla scenariot latriner (lang, ca 7 min datortid) gick igenom i molnet med en by utan latrin; det är nu ändrat till en by med latrin och behöver köras igen.
- `npm run utseende` i molnet behöver Chromium från `/opt/pw-browsers/chromium` (projektets Playwright är en annan version).

## Steg 11.1.69 Gånganimationen (görs från MacBooken, med Mac minin)

- Bilden avgör redan själv om någon går (riktning() och stalle() i ui/manniskor.ts, sedan steg 10.2.55): benen rör sig när personens plats i bilden (platsAv, utan knuffarna) flyttat sig mer än 1e-4 rutor sedan förra bilden. Ändå syns folk gå på stället.
- Leta grundorsaken i det levande spelet: troligen flyttar platsAv sig lite hela tiden för den som står still (sträckan räknas om när aktiviteten väljs om, eller interpolationen mellan slagen följer en liten flytt i simuleringen). Logga platsAv per bild för en som står still.
- Vakten i testerna (larm när någon ritas med gånganimationen utan att ha flyttat sig) kräver att figurerna ritas: kör den i webbläsaren som `npm run utseende` gör, gärna på Mac minin över natten.
