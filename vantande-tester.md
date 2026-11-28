# Väntande tester

## System 15.1 (Rättningar från spelgranskningen), commit fc4df13a på varld

- Körs nu i sju testchattar i molnet: scenarierna i fyra delar, `npm test`, `npm run kedja -- "npm run -s likhet" "npm run -s samma"` och `npm run balans -- 24 35`. Sedan nytt facit, och 15.1 publiceras.

## Steg 11.1.69 Gånganimationen (görs från MacBooken, med Mac minin)

- Bilden avgör redan själv om någon går (riktning() och stalle() i ui/manniskor.ts, sedan steg 10.2.55): benen rör sig när personens plats i bilden (platsAv, utan knuffarna) flyttat sig mer än 1e-4 rutor sedan förra bilden. Ändå syns folk gå på stället.
- Leta grundorsaken i det levande spelet: troligen flyttar platsAv sig lite hela tiden för den som står still (sträckan räknas om när aktiviteten väljs om, eller interpolationen mellan slagen följer en liten flytt i simuleringen). Logga platsAv per bild för en som står still.
- Vakten i testerna (larm när någon ritas med gånganimationen utan att ha flyttat sig) kräver att figurerna ritas: kör den i webbläsaren som `npm run utseende` gör, gärna på Mac minin över natten.

## Frågor till Björn (från natten till 20 november)

- Benspaden görs inte längre i någon av testbyarna på 50 dygn (50 år i spelet, sju veckor i verkligheten): benen går först till sylen, nålarna och snarorna. Den står nu bland det sällsynta i testet. Ska benen räcka till spaden tidigare (en sak för fasens Balans), eller är det rätt att den kommer sent?
- Att grunda en värld med 400 års förhistoria tar ungefär 45 s datortid. Det märks när en ny by grundas. Går det bra, eller ska förhistorien räknas medan spelet redan visas?
- Steg 12.1.11 (vägarna i världen snabbare) säger att det inte ändrar spelet, men bara en av de tre delarna gör det. Vägarna slås nu upp per par i stället för att letas i en lista (byggt, samma spel). De två andra delarna ändrar spelet. Att glömma vägar ingen använt på länge gör att resans plan räknar med fågelvägen gånger omvägen tills vägen gåtts igen. Att räkna resans poäng en gång i timmen (sex minuter i verkligheten) gör att en resenär väljer på poäng som kan vara upp till en timme gamla. Ska de byggas ändå, så att spelet blir lite annorlunda, eller räcker uppslagningen per par tills mätningen (`npm run varldkostnad`) visar att resorna kostar för mycket?
