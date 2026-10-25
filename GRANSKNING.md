# Grundlig kodgranskning

Den här prompten används när Björn säger "gör en kodgranskning" eller "gå igenom GRANSKNING.md". Den gäller hela koden som den ser ut nu och kan köras igen när som helst. Följ CLAUDE.md som vanligt: svara på svenska, skriv ut vad tidsspann betyder, och testernas körtid är datorns tid.

## Mål

Hitta fel, döda eller verkningslösa mekanismer, brott mot reglerna i `ARKITEKTUR.md` och kod som är onödigt svår att ändra. Rätta det som är säkert att rätta. Skriv in resten i designdokumentet. Granskningen ska inte ändra hur spelet utvecklas, utom när ett verkligt fel rättas.

## Arbetsgång

1. **Läs först.** Läs "Läget just nu" i designdokumentet (kända brister), `ARKITEKTUR.md` (filerna och de sju reglerna) och `CLAUDE.md`. Kör `npm run snabbkoll` så att du vet att allt är grönt innan du börjar.
2. **Granska fil för fil**, i den ordning kodkartan räknar upp dem: först `src/sim/`, sedan `src/ui/` och `src/main.ts`, sist `src/test/`. Låt gärna hjälpare (en enklare modell) söka igenom en grupp filer var efter listan nedan. Ge dem listan och reglerna i uppdraget och be dem rapportera fil, rad och ett konkret exempel. Själva bedömningen och alla ändringar i simuleringen gör huvudmodellen.
3. **Bekräfta varje fynd** innan något ändras: hitta en verklig väg dit, från en by eller ett scenario, med ett litet mätskript i `src/test/tmp-*.ts` (tas bort före commit). Ett fynd som inte går att visa är ett förslag, inte ett fel.
4. **Rätta i små commits**, en sak i taget, efter reglerna under "Rätta" nedan.
5. **Rapportera** till Björn: vad som rättades, vad som lades i designdokumentet och vad som inte var värt att ändra, och varför.

## Vad du letar efter

### Simuleringen (`src/sim/`)

- **Villkor som tyst avbryter eller stoppar något.** En uppgift som slutar direkt för att ett villkor för en annan sak slår till, t.ex. att samlandet slutar när platsen saknar bär fast man letar flinta. Mät hur länge uppgifter faktiskt varar jämfört med hur länge de var tänkta att vara.
- **Mekanismer som aldrig slår till.** Ett val, en teknik, en sak eller ett behov som finns i koden men nästan aldrig händer i byarna. Räkna i `s.stat` hur ofta det händer i några byar under 35 dygn (35 år i spelet, fem veckor i verkligheten).
- **Platser som blivit fel när världen ändrats.** Mål, sparade platser (`res`, `site`, `spot`) och stigar som pekar in i en vägg, ut i vattnet, in i lägret där inget växer eller till något som är slut eller borttaget.
- **Faror före förbättringar.** Bygge, verktyg, hantverk eller fritid får aldrig väga tyngre än mat, värme och vila när byn är i fara. Kontrollera vikterna i `val.ts` när förrådet är nästan tomt och i istiden. Elden får inte styra andra system.
- **Snabbläget och det levande läget.** Allt som beror på hur ofta något räknas, på bildens tid eller på gränssnittet är ett fel (regel 2). Kontrollera med `npm run likhet`.
- **Slumpen.** `Math.random()` i `sim/`, slump utan rätt följd i `STROMMAR`, och slumptal som dras olika många gånger beroende på något som bara syns i bilden (regel 1).
- **Sparfilen.** Nya fält som varken är valfria eller får ett värde i `migrate()`, och sådant som sparas två gånger fast det kan räknas fram (regel 3).
- **Cacher.** Variabler för hela modulen i stället för en `WeakMap<State, …>`, och nycklar som inte säger när cachen måste räknas om (regel 4).
- **Register.** Namn på handlingar, saker, tekniker, djur eller behov som räknas upp i koden i stället för att frågas från registret, och samma sak definierad på två ställen (regel 5).
- **Räkning ur loggen.** Allt som läser `s.log` för att räkna (regel 6).
- **Tal och enheter.** Blandade enheter (ms, s, timmar, dygn), division med noll, NaN, negativa förråd, avrundning som gör att 0,99 räknas som "ingen", och bråkdelar av saker (en sprucken flinta) som villkoren inte räknar med.
- **Prestanda.** Loopar över hela kartan (`W * H`) eller alla personer inne i loopar som körs varje steg, och samma sak som räknas om flera gånger i samma steg.

### Gränssnittet (`src/ui/`, `src/main.ts`)

- Text som syns direkt där en symbol borde stå, och symboler som saknar förklaring när man håller musen över eller trycker på dem (regel 7).
- Gränssnittet ändrar byn eller tar slump från byns följder.
- Flikar och paneler som räknar fram något som simuleringen redan har, och som därför kan visa något annat.
- Ritning som görs om varje bildruta fast inget ändrats.

### Testerna (`src/test/`)

- Scenarier som går igenom oavsett vad koden gör (villkor som alltid är sanna, för korta körningar).
- System som saknar scenario, och scenarier som borde vara märkta `lang: true` (13 s eller mer, datorns tid).
- Vakter som saknas för något omöjligt som kan hända (folk i väggar, i vattnet, saker utan ägare).

### Allmänt

- Död kod: funktioner, fält och exporter som ingen använder.
- Funktioner som gör flera saker och är svåra att läsa. Dela bara upp dem när det gör nästa ändring lättare.
- Kommentarer som säger något annat än koden gör, och `ARKITEKTUR.md` eller designdokumentet som beskriver något som inte längre stämmer.

## Rätta

- **Ombyggnad som inte ska ändra spelet** (död kod, register, cacher, prestanda, uppdelning): `npm run samma` måste säga att byarna utvecklas exakt som förut. Gör den inte det har ändringen ändrat spelet, och då är det inte en ren ombyggnad.
- **Verkliga fel som ändrar spelet:** rätta dem ett i taget, kör `npm run snabbkoll -- [berörda scenarier]` och committa varje rättelse för sig. Efter sista rättelsen: det stora testet (`npm run koll`, `npm run jamfor -- 35 64 --mot <commit före granskningen>` och `npm run likhet` om arbete, gång, samtal eller lärande ändrats), sedan `npm run facit`. Säger jamfor "sämre" om byar som dog ut, svalt ihjäl eller frös ihjäl ska det rättas innan granskningen är klar.
- **Större ändringar** (nya system, ändrad balans, designfrågor): bygg dem inte. Skriv in dem som steg i Färdplanen under rätt system, med förklaringen i rätt avsnitt, och fråga Björn om de kräver ett beslut.
- Lägg till ett scenario eller en vakt för varje verkligt fel som rättas, så att det inte kommer tillbaka.
- Uppdatera `ARKITEKTUR.md` och "Läget just nu" när något ändrats som de beskriver.

## Rapporten till Björn

Kort och på svenska, i tre delar:

1. **Rättat:** varje fel i en mening, vad det gjorde i spelet och hur det märktes (t.ex. "folk letade flinta i lägret där ingen flinta finns, så byn fick ingen yxa").
2. **Inlagt i designdokumentet:** steg och nummer.
3. **Inte ändrat:** fynd som inte var värda det, och varför.

Avsluta med resultatet från det stora testet och jamfor.
