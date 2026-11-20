# Väntande tester

## Steg 11.1.69 Gånganimationen (görs från MacBooken, med Mac minin)

- Bilden avgör redan själv om någon går (riktning() och stalle() i ui/manniskor.ts, sedan steg 10.2.55): benen rör sig när personens plats i bilden (platsAv, utan knuffarna) flyttat sig mer än 1e-4 rutor sedan förra bilden. Ändå syns folk gå på stället.
- Leta grundorsaken i det levande spelet: troligen flyttar platsAv sig lite hela tiden för den som står still (sträckan räknas om när aktiviteten väljs om, eller interpolationen mellan slagen följer en liten flytt i simuleringen). Logga platsAv per bild för en som står still.
- Vakten i testerna (larm när någon ritas med gånganimationen utan att ha flyttat sig) kräver att figurerna ritas: kör den i webbläsaren som `npm run utseende` gör, gärna på Mac minin över natten.

## Steg 12.1.4–12.1.7 väntar på natt-jarn

- Järnet byggs i grenen natt-jarn; stegen görs inte på varld förrän den slagits ihop.

## Fas 12.1 från 12.1.9 (otestad med de långa testerna)

- Committerna efter v533 (12.1.9 och framåt) har bara typkontrollen och stegens egna scenarier bakom sig. Systemet 12.1 är skyldigt hela kedjan när det är klart: `npm run kedja -- "npm run -s koll" "npm run -s likhet"`.
- 12.1.18 (förråden växer med det som inte får plats) ändrade byarna så att scenariot klader fick fler ben; fler scenarier kan ha påverkats och syns i koll.
- 12.1.21 (rikedomen lockar): `npm run strid` före (på 141bbace) och efter (85a3aff3), en gång var, som information om flockarna.

## Hopslagna nattgrenar

- natt-bildstil (12.1.69, 12.1.70, 12.1.102): src/portrattkarna.ts är omskriven (samma porträtt punkt för punkt); skyldig samma-kollen och `npm run utseende`.
- natt-tester (12.1.68, 12.1.85 testernas del, 12.1.100, 12.1.101, 12.1.106): skyldig koll.
- 18 scenarier var röda på varld redan före ihopslagningarna (39c496fa, efter 12.1.33): kista, handlare, slaktbank, virke, ikoner, symboler, tidsord, borta, varldtillstand, varldslag, forhistoria, kallelse, gomma, handelsresa, vagmote, turne, talt, kyrkanutlyser. De hör till 12.1-stegen från 12.1.9 och rättas innan 12.1 testas med kedjan.

## Frågor till Björn (från natten till 20 november)

- Benspaden görs inte längre i någon av testbyarna på 50 dygn (50 år i spelet, sju veckor i verkligheten): benen går först till sylen, nålarna och snarorna. Den står nu bland det sällsynta i testet. Ska benen räcka till spaden tidigare (en sak för fasens Balans), eller är det rätt att den kommer sent?
- Världens rader för handelsläger som brutits upp blir kvar för alltid (ungefär 1,6 nya per dygn, alltså per år i spelet). Med tiden växer världens del av sparningen förbi gränsen 512 KB. Ska ett upplöst läger glömmas efter en tid, som ett minne som bleknar?
- Att grunda en värld med 400 års förhistoria tar ungefär 45 s datortid. Det märks när en ny by grundas. Går det bra, eller ska förhistorien räknas medan spelet redan visas?
- Steg 12.1.11 (vägarna i världen snabbare) säger att det inte ändrar spelet, men bara en av de tre delarna gör det. Vägarna slås nu upp per par i stället för att letas i en lista (byggt, samma spel). De två andra delarna ändrar spelet. Att glömma vägar ingen använt på länge gör att resans plan räknar med fågelvägen gånger omvägen tills vägen gåtts igen. Att räkna resans poäng en gång i timmen (sex minuter i verkligheten) gör att en resenär väljer på poäng som kan vara upp till en timme gamla. Ska de byggas ändå, så att spelet blir lite annorlunda, eller räcker uppslagningen per par tills mätningen (`npm run varldkostnad`) visar att resorna kostar för mycket?
