# Grundlig kodgranskning

Den här filen används i fasens steg "Kodgenomgång och snabbare spel" (det näst sista steget i varje fas, före det stora testet och Balansen), och när Björn säger "gör en kodgranskning" eller "gå igenom GRANSKNING.md". Den gäller hela koden som den ser ut nu och kan köras igen när som helst. Följ CLAUDE.md som vanligt: svara på svenska, skriv ut vad tidsspann betyder, och testernas körtid är datorns tid.

## Var och när

- **På MacBooken.** Genomgången behöver de långa testerna (`snabbkoll`, `koll`, `samma`, `jamfor`, `likhet`, nytt facit), och i molnet väntar de på MacBooken. Ber Björn om genomgången i molnet (`CLAUDE_CODE_REMOTE` är `true`): säg att den görs på MacBooken och gör den inte.
- **Börja med `vantande-tester.md`.** Står det något där körs de testerna först, som CLAUDE.md säger. Genomgången börjar på en grön version.
- **Fasens steg:** gå igenom hela koden, med det som byggts i fasen först. Granskas bara en del (t.ex. halvvägs i en stor fas) säger steget vilken.

## Mål

Hitta fel, döda eller verkningslösa mekanismer, brott mot reglerna i `ARKITEKTUR.md` och `CLAUDE.md`, och kod som är onödigt svår att ändra. Rätta det som är säkert att rätta. Skriv in resten i designdokumentet. Granskningen ska inte ändra hur spelet utvecklas, utom när ett verkligt fel rättas.

Målen i ordning, och tiden läggs i samma ordning:

1. **Korrekthet:** buggar, kantfall och felhantering som saknas.
2. **Det som är byggt stämmer med det som står:** stegen och avsnitten i designdokumentet, spelets mallar och principerna i `CLAUDE.md`.
3. **Enkelhet:** onödig komplexitet, dubblering och död kod. Mindre är mer, så länge reglerna i `ARKITEKTUR.md` håller.
4. **Läsbarhet:** tydliga namn, rimlig struktur, kommentarer bara där koden inte förklarar sig själv.
5. **Prestanda** där det spelar verklig roll: snabbläget och testerna.
6. **Gaffatejp och onödiga hårda regler:** listas för Björn, ändras inte.

## Arbetsgång

1. **Läs först.** Läs "Läget just nu" i designdokumentet (kända brister), `ARKITEKTUR.md` (filerna och de åtta reglerna) och `CLAUDE.md`. Kör `npm run snabbkoll` så att du vet att allt är grönt innan du börjar. Skriv ner commiten före genomgången; jamfor och prestandan mäts mot den.
2. **Gå igenom fasens steg.** Lista de bockade stegen i fasen. För varje steg: läs stegets text och avsnittet som "Läs:" pekar på, och jämför med koden. Finns allt, och händer det i byarna? Ett steg som är bockat men bara delvis byggt hittas inte av något test.
3. **Granska fil för fil**, i den ordning kodkartan räknar upp dem: först `src/sim/`, sedan `src/ui/` och `src/main.ts`, sist `src/test/`. Fasens filer först.
4. **Ledning och hjälpare.** Huvudmodellen leder och organiserar arbetet. Enklare modeller söker igenom en grupp filer var efter listan nedan, gör småfixar och mekaniska ändringar (död kod, namn, tester) och kör långa tester. Ge dem listan och reglerna i uppdraget, och be dem rapportera fil, rad och ett konkret exempel, och också annat som ser fel ut fast det inte står i listan. Själva bedömningen och alla ändringar i `src/sim/` som kan ändra hur byarna utvecklas gör huvudmodellen, och den läser och godkänner all kod.
5. **Bekräfta varje fynd** innan något ändras: hitta en verklig väg dit, från en by eller ett scenario, med ett litet mätskript i `src/test/tmp-*.ts` (tas bort före commit). Ett fel som händer sällan syns inte i en by under några dygn: kör många byar eller längre tid, och räkna i `s.stat`. Ett fynd som ändå inte går att visa rättas inte, men det försvinner inte heller: det står i rapporten under "Inte ändrat" med vad som prövades.
6. **Rätta i små commits**, en sak i taget, efter reglerna under "Rätta" nedan.
7. **Under arbetet:** skriv efter varje grupp filer i chatten hur långt arbetet kommit och hur lång tid som uppskattas vara kvar.
8. **Rapportera** till Björn (nedan).

### Ultracode

Björn skriver "ultracode" i prompten för kodgenomgången (inte för vanliga steg, där det bara tar längre tid). Då körs sökningen och kontrollen av fynden som ett workflow. Hjälpare läser filgrupperna samtidigt, var och en med sitt mål (buggar, stegen mot designdokumentet, principerna, enkelhet, prestanda, testerna, gaffatejp), och varje fynd prövas av andra hjälpare som försöker motbevisa det. Bara det som håller går vidare. Det som hjälparna inte kunde avgöra går till huvudmodellen, inte bort. Rättningarna görs inte i ett workflow: huvudmodellen gör dem en i taget med snabbkollen emellan (och `npm run samma` vid ombyggnad), så att inga ändringar krockar och spelet inte ändras i onödan. Fynd som inte är värda att ändra skrivs bara i rapporten.

## Vad du letar efter

### Simuleringen (`src/sim/`)

- **Villkor som tyst avbryter eller stoppar något.** En uppgift som slutar direkt för att ett villkor för en annan sak slår till, t.ex. att samlandet slutar när platsen saknar bär fast man letar flinta. Mät hur länge uppgifter faktiskt varar jämfört med hur länge de var tänkta att vara.
- **Mekanismer som aldrig slår till.** Ett val, en teknik, en sak, ett recept, ett behov eller en rad i ett register som finns i koden men nästan aldrig händer i byarna. Räkna i `s.stat` hur ofta det händer i några byar under 35 dygn (35 år i spelet, fem veckor i verkligheten). Gå igenom fasens nya registerrader, inte bara de nya funktionerna: en rad kan finnas utan att något i koden läser den (t.ex. en gröda i registret som ingen sår).
- **Där nytt möter gammalt.** För varje system som byggts i fasen: vilka äldre system läser eller ändrar samma saker? En ny sak i `SAKER` ska fungera i förvaringen, delningen, värdet, handeln, arvet, slitaget, branden och tornadon. Ett nytt arbete ska fungera med valet av aktivitet, projekten, natten, istiden och sjukdom. Pröva mötesplatserna, inte bara det nya systemet för sig.
- **Platser som blivit fel när världen ändrats.** Mål, sparade platser (`res`, `site`, `spot`) och stigar som pekar in i en vägg, ut i vattnet, in i lägret där inget växer eller till något som är slut eller borttaget.
- **Faror före förbättringar.** Bygge, verktyg, hantverk eller fritid får aldrig väga tyngre än mat, värme och vila när byn är i fara. Kontrollera vikterna i `val.ts` när förrådet är nästan tomt och i istiden. Elden är ett verktyg, inte ett mål, och får inte styra andra system.
- **Snabbläget och det levande läget.** Allt som beror på hur ofta något räknas, på bildens tid eller på gränssnittet är ett fel (regel 2). Kontrollera med `npm run likhet`.
- **Slumpen.** `Math.random()` i `sim/`, slump utan rätt följd i `STROMMAR`, och slumptal som dras olika många gånger beroende på något som bara syns i bilden (regel 1).
- **Sparfilen.** Nya fält som varken är valfria eller får ett värde i `migrate()`, och sådant som sparas två gånger fast det kan räknas fram (regel 3). Pröva också på riktigt: ladda en by som sparats av versionen före fasen (bygg den i en `git worktree` på den commiten) och kör den några dygn utan vaktlarm. Björns sparade by ska fungera efter publiceringen.
- **Cacher.** Variabler för hela modulen i stället för en `WeakMap<State, …>`, och nycklar som inte säger när cachen måste räknas om (regel 4).
- **Register.** Namn på handlingar, saker, tekniker, djur eller behov som räknas upp i koden i stället för att frågas från registret, och samma sak definierad på två ställen (regel 5).
- **Räkning ur loggen.** Allt som läser `s.log` för att räkna (regel 6).
- **Balanstal utan namn.** Gränser, vikter och takter som står som lösa tal i koden i stället för i systemets `balans()`-block (regel 8), och samma tal på flera ställen.
- **Tal och enheter.** Blandade enheter (ms, s, timmar, dygn), division med noll, NaN, negativa förråd, avrundning som gör att 0,99 räknas som "ingen", och bråkdelar av saker (en sprucken flinta) som villkoren inte räknar med.
- **Prestanda.** Loopar över hela kartan (`W * H`) eller alla personer inne i loopar som körs varje steg, och samma sak som räknas om flera gånger i samma steg.

### Spelets mallar och principerna i `CLAUDE.md`

Inget test ser de flesta av dem, så de gås igenom för hand, med fasens nya saker först.

- **Arbetstiderna.** Varje tid för ett arbete, i koden och i designdokumentet, följer "Arbetstider (riktlinje)" i fliken Människan: en liten sak 2–4 minuter, en stor sak högst 5, en station eller möbel 10–20, en tur att samla 3–10 (längre med korg eller väska). Mät med `npm run takt` och gå igenom varje arbete i registret, också de som byggts i fasen. Mallen gäller när det finns gott om det som samlas; när det är ont om det får turen ta längre tid, men aldrig mer än turens längsta tid (6.1.5), så jämför med en by som har gott om det. Vakten för arbetstiderna (9.2.63) larmar i det stora testet. Gå också igenom tiderna i nästa fas steg och avsnitt i designdokumentet, som ingen vakt ser, och räkna om dem efter riktlinjen.
- **Arbetsordningen.** Varje aktivitet väljs och görs inom arbetsordningen och projekten (6.1), så att inget arbete startas vid sidan av den.
- **Markeringen.** Allt nytt som syns på kartan i fasen (saker, möbler, stationer, byggnader, väggar, dörrar, djur, växter, mark och annat) går att markera, får den vita konturen när det markeras eller musen är över det, och visar en informationsruta om sig. Det markerade syns alltid: det som ritas framför det får tona bort, men aldrig det markerade självt. Gå igenom registren och pröva i spelet.
- **Hela resurser.** Inget recept, bygge, byte, pris eller utfall ger eller tar en del av en resurs. Leta efter decimaler i registren och efter `*` och `/` på antal saker som inte avrundas till hela saker. Slitage och arbetet mot nästa sak får ha decimaler.
- **Vätskor i behållare.** Ingen vätska (och inget kladdigt som salva och lim) skapas, fraktas eller förvaras utan en behållare, och den tomma behållaren blir kvar när vätskan används.
- **Regeln för stationerna.** En sak görs vid högst en station, vald efter materialet. Varje recept är "bara här" eller "fortare och bättre här", och en bättre station ger högre chans till bra kvalitet. `npm run recept` visar alla recept.
- **Bildstilen.** Det som ritas följer paletten och ritas i hel skala. `npm run build` och sedan `npm run utseende` larmar om färger utanför paletten och bilder i fel skala; kör den en gång i genomgången.
- Det som avviker rättas, eller skrivs i rapporten om det kräver ett beslut (Björn avgör).

### Gränssnittet (`src/ui/`, `src/main.ts`)

- Text som syns direkt där en symbol borde stå, och symboler som saknar förklaring när man håller musen över eller trycker på dem (regel 7).
- Gränssnittet ändrar byn eller tar slump från byns följder.
- Flikar och paneler som räknar fram något som simuleringen redan har, och som därför kan visa något annat. Siffror i informationsrutorna som inte stämmer med byn.
- Det som ritas i fel ordning, döljer det man tittar på, eller försvinner när det markeras.
- Ritning som görs om varje bildruta fast inget ändrats.
- **Texterna.** Kör `npm run texter` och läs mallarna från fasen: ord som inte fyllts i ("undefined", tomma namn), fel böjning, och varianter och mallar som aldrig väljs.

### Testerna (`src/test/`)

- Scenarier som går igenom oavsett vad koden gör (villkor som alltid är sanna, för korta körningar).
- Gränser i scenarier som sänkts för att få dem gröna. `git log -p` på fasens scenarier visar det.
- System som saknar scenario, och scenarier som borde vara märkta `lang: true` (13 s eller mer, datorns tid).
- Vakter som saknas för något omöjligt som kan hända (folk i väggar, i vattnet, saker utan ägare).
- **Testernas tid.** Mät hur lång tid varje test och scenario tar. Slå ihop det som överlappar, men ta inte bort ett scenario som skrevs för en verklig bugg. Gör testerna snabbare, och bygg om kartan för `riktad` (`npm run riktad -- --karta`). Föreslå i rapporten hur testreglerna i CLAUDE.md kan ändras så att de stora testerna körs mer sällan, och ändra dem först när Björn sagt ja.

### Prestandan i snabbläget

Mät datortiden för tre byar i 15 dygn (15 år i spelet, två veckor i verkligheten) i snabbläget, nu och på commiten före fasen (i en `git worktree`), på samma sätt som i förra fasens kodgenomgång (siffrorna står i det steget i Färdplanen). Ta reda på vad som tar mest tid med en profilering (`node --cpu-prof`), och gör det snabbare utan att spelet ändras (`npm run samma` lika). Ge siffrorna före och efter.

### Gaffatejp och onödiga hårda regler

Spelet sätter grundreglerna, och det byarna gör ska växa fram ur systemen och balanstalen. Gaffatejp är kod som tvingar fram ett visst resultat i stället för att systemen ger det. Regeln "System, inte regler, men med måtta" i `CLAUDE.md`.

**Frågan för varje regel:** beskriver den hur världen är, eller rättar den ett resultat som blev fel?

- **Grundregel, inget fynd.** Den säger hur världen, sakerna och kroppen fungerar, gäller lika för alla och skulle stå där även om byarna klarade sig bra utan den. Till exempel vad ett recept kräver, vad en station tar emot, att man bär två saker i händerna, att vattnet fryser i istiden och att bara kompost läggs på fältet. Hit hör också arbetsordningens nivåer (faror går före förbättringar, 6.1): de är grundregeln för hur valet görs.
- **Gaffatejp, ett fynd.** Den finns för att något blev fel, och tvingar fram det rätta i stället för att rätta systemet. Tecknen:
  - Den slår till på ett resultat: byn svälter, fryser eller dör ut, ett system används inte, ett scenario var rött.
  - Den går förbi poängen: en tidig `return` eller `continue` i valet av aktivitet, ett `filter` som tar bort kandidater innan de får poäng, en vikt som sätts till 0 eller `-Infinity`, eller "alltid" och "aldrig" för en enda sak, ett enda arbete eller en enda person.
  - Den är en fast gräns, ordning eller ett antal för vad människorna gör: "högst N", "först X, sedan Y", "en i taget", "efter dygn 3", eller ett `Math.min` som tak på hur mycket någon gör.
  - Den ger något gratis eller tar bort en fara för att byn ska klara sig: mat som dyker upp, en motgång som hoppar över en svag by.
  - Kommentaren förklarar den med ett resultat: "annars …", "så att inte …", "för att byn ska …".
  - Orden "bara", "alltid", "aldrig", "först … sedan", "högst" och "en i taget" är en varningsflagga, i koden, i kommentarerna och i designdokumentets text om systemet.
- **Gränsfallen.** Ett undantag inne i en av arbetsordningens nivåer för en enda sak eller situation är gaffatejp, fast nivåerna själva är grundregler. En regel som ser ut att handla om världen men bara finns för att ett resultat blev fel är också gaffatejp.
- **Provet:** tänk bort regeln. Skulle byarna göra rätt om systemen och balanstalen var rätt byggda? Då är den gaffatejp, och fyndet säger vad i systemen som brister. Blir världen orimlig utan den (någon bär tio stockar, vattnet brinner) är den en grundregel. `git log` på raden visar ofta varför den kom till.
- **Systemen som kan ta över:** valet av aktivitet (ARBETEN och poängen), förrådsmålen, projekten, värmekartorna (FYND), sakerna (SAKER), ägandet, delningen, värdet, kvaliteten, humöret, rykten, seder, tekniker och balanstalen. För varje fynd: vilket av dem, hur (en rad i ett register, en faktor i en poäng eller ett balanstal), och vad i systemet som brister. Gaffatejpen döljer ofta ett verkligt fel, t.ex. en vikt som är fel eller ett behov som saknas.
- **Ändra dem inte i granskningen**, inte ens när det är enkelt. De skrivs i rapporten (del 4) och väntar på Björns svar.

### Allmänt

- Död kod: funktioner, fält och exporter som ingen använder.
- Funktioner som gör flera saker och är svåra att läsa. Dela bara upp dem när det gör nästa ändring lättare.
- Kommentarer som säger något annat än koden gör, och `ARKITEKTUR.md` eller designdokumentet som beskriver något som inte längre stämmer.
- **Kända brister** i "Läget just nu": finns de kvar? En rättad brist tas bort därifrån, och en som finns kvar men saknar steg får ett.

## Rätta

- **Ombyggnad som inte ska ändra spelet** (död kod, register, cacher, prestanda, uppdelning): `npm run samma` måste säga att byarna utvecklas exakt som förut. Gör den inte det har ändringen ändrat spelet, och då är det inte en ren ombyggnad.
- **Verkliga fel som ändrar spelet:** rätta dem ett i taget, kör `npm run snabbkoll -- [berörda scenarier]` och committa varje rättelse för sig.
- **Gaffatejp och onödiga hårda regler** rättas inte i granskningen: de går till rapportens del 4, och bara det Björn godkänner blir steg.
- **Större ändringar** (nya system, ändrad balans, designfrågor): bygg dem inte. Skriv in dem som steg i Färdplanen under rätt system, med förklaringen i rätt avsnitt, och fråga Björn om de kräver ett beslut.
- Lägg till ett scenario eller en vakt för varje verkligt fel som rättas, så att det inte kommer tillbaka.
- Uppdatera `ARKITEKTUR.md` och "Läget just nu" när något ändrats som de beskriver.

## När allt är klart

Det stora testet (`npm run koll`), `npm run jamfor -- 35 64 --mot <commiten före genomgången>` och `npm run likhet` om arbete, gång, samtal eller lärande ändrats. Säger jamfor "sämre" om byar som dog ut, svalt ihjäl eller frös ihjäl ska det rättas innan granskningen är klar. Sedan nytt facit (`koll` sparar det när allt är grönt), commit med versionen och publicering. Bocka av steget i Färdplanen med versionen och en kort sammanfattning, och prestandan före och efter, så att nästa genomgång har något att jämföra med.

## Rapporten till Björn

Kort och på svenska, i fyra delar:

1. **Rättat:** varje fel i en mening, vad det gjorde i spelet och hur det märktes (t.ex. "folk letade flinta i lägret där ingen flinta finns, så byn fick ingen yxa").
2. **Inlagt i designdokumentet:** steg och nummer.
3. **Inte ändrat:** fynd som inte var värda det, och varför, och fynd som inte gick att visa, med vad som prövades.
4. **Gaffatejp och hårda regler att godkänna:** numrerade, så att Björn kan svara t.ex. "ja till 1 och 3". För varje: var regeln står (fil och funktion, och avsnittet i designdokumentet om den står där), regeln i en mening, vilket resultat den tvingar fram och vad i systemet som brister, vilket system som kunde avgöra det i stället och hur, vad som skulle märkas i spelet och om det är litet eller stort att bygga. Det Björn godkänner läggs som steg i Färdplanen efter reglerna för nya steg i `CLAUDE.md`, och avsnittet skrivs om; det han säger nej till lämnas som det är. Hittas inget står det "inga".

Avsluta med siffrorna: det stora testet och jamfor, prestandan före och efter, testerna före och efter (antal och tid), och antal rader i `src/` före och efter, per del (sim, ui, test) som tillagda och borttagna rader (en ändrad rad räknas som en av varje). Skicka en notis när allt är klart (inte på natten).
