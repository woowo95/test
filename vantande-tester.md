# Väntande tester

## Steg 11.1.69 Gånganimationen (görs från MacBooken, med Mac minin)

- Bilden avgör redan själv om någon går (riktning() och stalle() i ui/manniskor.ts, sedan steg 10.2.55): benen rör sig när personens plats i bilden (platsAv, utan knuffarna) flyttat sig mer än 1e-4 rutor sedan förra bilden. Ändå syns folk gå på stället.
- Leta grundorsaken i det levande spelet: troligen flyttar platsAv sig lite hela tiden för den som står still (sträckan räknas om när aktiviteten väljs om, eller interpolationen mellan slagen följer en liten flytt i simuleringen). Logga platsAv per bild för en som står still.
- Vakten i testerna (larm när någon ritas med gånganimationen utan att ha flyttat sig) kräver att figurerna ritas: kör den i webbläsaren som `npm run utseende` gör, gärna på Mac minin över natten.
