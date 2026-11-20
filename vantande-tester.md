# Väntande tester

## Steg 11.1.69 Gånganimationen (görs från MacBooken, med Mac minin)

- Bilden avgör redan själv om någon går (riktning() och stalle() i ui/manniskor.ts, sedan steg 10.2.55): benen rör sig när personens plats i bilden (platsAv, utan knuffarna) flyttat sig mer än 1e-4 rutor sedan förra bilden. Ändå syns folk gå på stället.
- Leta grundorsaken i det levande spelet: troligen flyttar platsAv sig lite hela tiden för den som står still (sträckan räknas om när aktiviteten väljs om, eller interpolationen mellan slagen följer en liten flytt i simuleringen). Logga platsAv per bild för en som står still.
- Vakten i testerna (larm när någon ritas med gånganimationen utan att ha flyttat sig) kräver att figurerna ritas: kör den i webbläsaren som `npm run utseende` gör, gärna på Mac minin över natten.

## Fas 12.1 från 12.1.9 (otestad med de långa testerna)

- Committerna efter v533 (12.1.9 och framåt) har bara typkontrollen och stegens egna scenarier bakom sig. Systemet 12.1 är skyldigt hela kedjan när det är klart: `npm run kedja -- "npm run -s koll" "npm run -s likhet"`.
- 12.1.18 (förråden växer med det som inte får plats) ändrade byarna så att scenariot klader fick fler ben; fler scenarier kan ha påverkats och syns i koll.
- 12.1.76 (elden sköts genom valet av aktivitet) ändrar grunden: vem som lägger ved på elden och tänder den väljs nu i valet i stället för att elden avbryter någon. Skyldig koll med nytt facit och `npm run likhet`.
- 12.1.82 (vården, striden och vargarna): läs räknarna `vargVantar`, `vargDorrStrid` och `vargTrottnade` i fasens Balans (`npm run balans -- 24 35`). Väntar vargarna utanför en dörr i färre än var fjärde by tas väntan bort med sitt stycke i dokumentet.
- 12.1.21 (rikedomen lockar): `npm run strid` före (på 141bbace) och efter (85a3aff3), en gång var, som information om flockarna.

## Hopslagna nattgrenar

- natt-bildstil (12.1.69, 12.1.70, 12.1.102): src/portrattkarna.ts är omskriven (samma porträtt punkt för punkt); skyldig samma-kollen och `npm run utseende`.
- natt-tester (12.1.68, 12.1.85 testernas del, 12.1.100, 12.1.101, 12.1.106): skyldig koll.
- natt-paneler (12.1.54, 12.1.73, 12.1.66, 12.1.99, 12.1.105, 12.1.72): skyldig koll, samma-kollen (12.1.99) och `npm run utseende`. Vid ihopslagningen behölls varlds ändringar där de gick emot grenens: lerkrukans låga platshållare är borttagen (12.1.15), gömmorna ritas inte på världskartan (12.1.9), kartan har ingen knapp (12.1.29), sederna har ingen pil vid vågen och visar alla rader (12.1.28), och påbuden lagskrift och fängelse finns inte längre (12.1.27).
- natt-jarn (12.1.1–12.1.3, 12.2.1–12.2.13 och 12.3.1): skyldig koll med nytt facit (myren, torven och isborrens gräns på 30 cm ändrar byarna), likhet (tillsynen, 12.2.2) och balansen (`npm run balans -- 24 35`). 12.2.5 är prövat med `npm run samma`.
- 18 scenarier var röda på varld redan före ihopslagningarna (39c496fa, efter 12.1.33): kista, handlare, slaktbank, virke, ikoner, symboler, tidsord, borta, varldtillstand, varldslag, forhistoria, kallelse, gomma, handelsresa, vagmote, turne, talt, kyrkanutlyser. De hör till 12.1-stegen från 12.1.9 och rättas innan 12.1 testas med kedjan.

## Frågor till Björn (från natten till 20 november)

- Benspaden görs inte längre i någon av testbyarna på 50 dygn (50 år i spelet, sju veckor i verkligheten): benen går först till sylen, nålarna och snarorna. Den står nu bland det sällsynta i testet. Ska benen räcka till spaden tidigare (en sak för fasens Balans), eller är det rätt att den kommer sent?
- Världens rader för handelsläger som brutits upp blir kvar för alltid (ungefär 1,6 nya per dygn, alltså per år i spelet). Med tiden växer världens del av sparningen förbi gränsen 512 KB. Ska ett upplöst läger glömmas efter en tid, som ett minne som bleknar?
- Att grunda en värld med 400 års förhistoria tar ungefär 45 s datortid. Det märks när en ny by grundas. Går det bra, eller ska förhistorien räknas medan spelet redan visas?
- Steg 12.1.11 (vägarna i världen snabbare) säger att det inte ändrar spelet, men bara en av de tre delarna gör det. Vägarna slås nu upp per par i stället för att letas i en lista (byggt, samma spel). De två andra delarna ändrar spelet. Att glömma vägar ingen använt på länge gör att resans plan räknar med fågelvägen gånger omvägen tills vägen gåtts igen. Att räkna resans poäng en gång i timmen (sex minuter i verkligheten) gör att en resenär väljer på poäng som kan vara upp till en timme gamla. Ska de byggas ändå, så att spelet blir lite annorlunda, eller räcker uppslagningen per par tills mätningen (`npm run varldkostnad`) visar att resorna kostar för mycket?

## Grenen par-paneler (12.1.154 och framåt, otestad med de långa testerna)

- 12.1.154 (vänd mot bänken): bara bilden ändras (ui/stalle.ts, ui/manniskor.ts); skyldig `npm run utseende` och koll (scenariot stalle är grönt).
- 12.1.161 (förrådslistan får en bakgrund): bara stilen i template.html; skyldig `npm run utseende` (datorn och mobilen).
- 12.1.157 (namn vid alla på kartan): ui/namnskyltar.ts, ui/manniskor.ts, två platshållare i ikoner.ts (roll_ledare, roll_prast) och valkorten f12_roll_prast och f12_roll_ledare i bildstil/fas12.js (bildstilen inte publicerad, `node bildstil/kontrollera.mjs --bilder` inte körd); skyldig `npm run utseende` (rollsymbolerna i hel skala) och koll.
- 12.1.156 (större sken): ändrar spelet (MORKER.eldR 6 → 9, FACKLA.r 4 → 6, LJUS.r 2 → 3); skyldig koll med nytt facit, `npm run likhet` och `npm run utseende`. Scenariot uppsatt prövar nu ljuset i hela byn i en testby (en ny by ligger hela inom eldens ljus). Bilderna före och efter i granskning/sken/.
- 12.1.147 (texten medan förhistorien räknas): main.ts; prövat i webbläsaren (texten står kvar i 27 s datortid och försvinner när byn är klar). Skyldig koll.
- 12.1.137 (krönikans kategorier och nya notiser): kategorierna fanns redan; ny vakt (kronikaVakt i src/test/kor.ts, krönikerad utan kategori) och sex notiser (dom, avrattning, lag, tro, skord, tamdjur) i styre.ts, lagar.ts, religion.ts, odling.ts och tamdjur.ts. Ändrar inget i byarna utom notiserna (och räknaren tamForst); skyldig koll (vakten i alla testbyar) och samma-kollen.
- 12.1.138 (fler grafer i Byns tal): nio tal i HISTORIK_TAL och nio grafer i GRAFER, och räknaren bocker i skrift.ts. Historiken växer (scenariot historik: största delen 207 KB av 256 KB); skyldig koll (sparAndel) och `npm run utseende` (Byns tal).
