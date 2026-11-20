# De röda scenarierna (grenen dag-scenarier, 20 november)

Prövat på grenen `dag-scenarier` från a6405d0 (efter steg 12.1.39). Varje scenario kördes ensamt och till sist alla tillsammans.
Inga långa tester kördes (koll, likhet, balans).

Läget efter rättningarna: 32 av de 37 kända scenarierna är gröna. Kvar som röda: **virke**, **slaktbank**, **kista** och
**handlare** (orsaken ligger i spelet, se nedan) och **varldtillstand** (blir grönt med nytt facit).

## Gröna redan när arbetet började

ikoner, symboler, varldskronika, radort, gastort, gravplats, bjornjakt, resfart, karavan, handlarby, uppdragmal,
uppdragkrav, uppdragminne, uppdragrykte, handelsfard, bygava och bykrig var gröna ensamma på a6405d0. Det som gjorde dem
röda i nattens körning är rättat av andra commits, eller berodde på att scenarierna störde varandra (12.1.113).

## 12.1.111: kraschen i fardFram

handelsfard och bygava går igenom ensamma, på 39c496f, på 9955af6 och på a6405d0. De går också igenom efter alla
59 korta världsscenarier (varldslag till bygava) i samma process. Kraschen kring rad 449 i `src/sim/byhandling.ts` går inte
att få fram längre, så orsaken är inte hittad. Steget är inte avbockat.

## 12.1.113: scenarier som stör varandra (klart)

- **Orsaken:** gudar fäller ut "Övriga trosriktningar" med `hjalpKlick` och lämnar den utfälld. Det utfällda ligger i en mängd
  i `src/ui/hjalp.ts` (`oppna`), som inte nollställdes mellan scenarierna. Därför såg fragetecken och religionsflik raden som
  redan utfälld. tronamn påverkade inget.
- **Rättat** (aae660f): `stangAllaHjalp()` i hjalp.ts töms före varje scenario, som `ui` redan gjordes.
- **Vakten:** scenariokörningen tar en bild av allt som simuleringen (`src/sim`) exporterar och som inte är en funktion
  (register, provlägen som `TRO_PROV`), och jämför efter varje scenario. Det som ändrats blir en kontroll som inte går
  igenom: "vakten: scenariot lämnar X ändrat efter sig". Bilden tar ungefär 20 ms per scenario (datorns tid). Balanstalen är
  frysta och kan inte ändras. Vakten larmade inte i något av de 400 korta scenarierna när de kördes i samma process.

## 12.1.112: scenarierna, ett i taget

| Scenario | Orsaken | Vad som gjordes |
| --- | --- | --- |
| tidsord | Världskartans ruta skrev "… dygn till fots", och gränssnittet ska inte säga dygn. | Spelet: restiden skrivs med `durTxt` (i år), cb1bda5. |
| varldslag | Kontrollen "världen rör inte byns slump" skrevs i 11.2.17. Sedan 11.6.20 går en flock ur världen in i huvudbyn som rövare, och den drar byns slump (`radKommer`). Det är byns händelse. | Scenariot: byns slump får dras bara när en flock gått in i byn, och då likadant i levande läge och ikappräkning. Annars ska den vara orörd. db5ee17 |
| forhistoria | På 100 år blir byarna sällan stora nog att delas. Den enda delningen i frö 7 var tur och försvann med 12.1.21 (git bisect). Med 400 år, som i spelet, delas 11 byar. | Scenariot: `forhist.ar=400` och `lang: true` (ca 50 s datortid). c3f2692 |
| borta | Ett barn föddes under timmen efter hemkomsten, så antalet i byn blev ett för många. | Scenariot: var och en av dem som var borta ska vara i byn. 08bc3b8 |
| kyrkanutlyser | Testbyn efter fem dygn har ingen tro längre. | Scenariot: den första testbyn med en tro som har troende (`testBy` med villkor). 946ffb6 |
| talt | Testbyn efter fem dygn har fyra vuxna som kan gå, och scenariot behöver fem. | Scenariot: den första testbyn med fem. 93de5d7 |
| kallelse | 1) Testbyn efter 30 dygn har fyra vuxna under 50 år, med kraften 3,2 mot kravet 4,5. 2) Scenariot satte modet i `pot`, men uppväxten räknar om `pot` ur anlagen (`raknaPot` i uppvaxt.ts) när någon får en upplevelse. Då föll modet tillbaka medan sällskapet samlades, kraften hamnade under kravet och resan ställdes in. | Scenariot: modet och nyfikenheten sätts i anlagen också, och den första testbyn med sex som kan följa med. 903a396 |
| turne | Resenären hade nyss fått bedriften Påhittig (vikt 0,5). Turnén (0,4) byter inte ut en färsk bedrift som väger mer; det är spelets regel. | Scenariot: resenären börjar utan bedrift. 6898694 och e9a646c (typen) |
| gomma | Den sista resan behöver en vuxen som inte redan är med i ett sällskap, och testbyn efter fem dygn har bara fyra vuxna. | Scenariot: en ny vuxen leder den sista resan när ingen annan finns. Rättningen ligger i e9a646c (tillsammans med turnes typ), eftersom typkontrollen stoppade commiten för sig. |
| handelsresa | Det som skulle vinna var handeln till X. I stället vann en nyfiken resa till en tom byplats som a hört rykten om, och sedan ett uppdrag. Scenariot tog bara bort det a visste om byar med folk. | Scenariot: a känner bara hemmet, X och Y, och har inga uppdrag, som texten säger. 85ff2ce |
| vagmote | Testbyns värld hade en egen färd från samma by på samma väg, och sällskapet mötte båda. | Scenariot: bara scenariots två färder i världen. 35e4d52 |
| varldtillstand | Världen i den sparade testbyn räknades fram med koden i v533. Förhistorien har ändrats sedan dess, så byarna blir andra. Med koden i v533 är den exakt lika, och dagens kod ger samma värld varje gång av samma frö. | Inget. Blir grönt när det stora testet sparar nya testbyar (`test/facit-byar`). |
| virke, slaktbank | Se nedan: spelet. | Inte rättat. |
| kista | Se nedan: spelet. | Inte rättat. |
| handlare | Se nedan: spelet. | Inte rättat. |

## Kvar till huvudprogrammeraren eller Björn

### virke och slaktbank: jakten för skinn tar all tid (sedan 12.1.20)

Med git bisect blev båda röda i 141bbac (12.1.20, materialet till kläderna). Sedan dess hämtas skinn genom jakten (`KALLA` i
projekt.ts). I scenariot har alla fyra vuxna `skara_remsor` (remsor ur skinn) som sitt mest värda projekt, med
värdet 0,26–0,41 och materialet skinn. Då jagar de, i stället för att klyva virke till slaktbänken.

| Under 30 timmar | Före 12.1.20 | Efter 12.1.20 |
| --- | --- | --- |
| jakt (personer × slag) | 180 | 842 |
| klyva virke | börjar efter 0 timmar | aldrig |
| virke / slaktbänk efteråt | 10 virke, bänken byggd | 0 virke, ingen bänk |

Stammarna huggs till slut till ved av den som fyller vedförrådet. Det händer också med kläderna från början
(`start.klader=1`), så det beror inte på att scenarierna börjar utan kläder. Det ser ut som att ett material som hämtas genom
jakten drar alla vuxna samtidigt, utan att det minskar när andra redan jagar för det. Att rätta det är ett val i hur projekten
ärver värde (eller i `skara_remsor`), inte i scenariot.

### kista: en yxa blir liggande utanför lagret (sedan 12.1.18)

Med git bisect blev kista röd i 483eaa2 (12.1.18, förråden växer med det som inte får plats). En av ägarens två extra yxor
ligger på marken vid (76, 41), utanför lagerplatserna och huset, och bärs aldrig till kistan på de åtta timmar scenariot
väntar. I loggen har materiallagret gjorts större två gånger under tiden. Troligen blir en sak liggande när lagret växer
eller flyttas, och den som städar ser den inte som något att bära till kistan. Orsaken är inte hittad.

### handlare: byn betalar med tunga saker först

Scenariot var rött redan i v533. Byn vill köpa 1 flinta, värd 4,7 för handlaren. Handlaren har 10 kg ledigt (40 kg ryggsäck, 30 kg
flinta). `betalaAv` i behov.ts väljer det som har bäst kvot mellan värdet för handlaren och värdet för byn, utan att räkna
vikten. Rötterna (4 kg styck) och höet fyller de 10 kg och är bara värda 1,8. Silvret (0,5 kg styck) får inte plats, så
budet räcker inte och flintan blir aldrig köpt. Byn säljer i stället. Mer silver i byn ändrar inget. Att räkna vikten när
handlaren är nästan full är en ändring i handeln.

### 12.1.114: varför byarna aldrig går i krig (inga balanstal ändrade)

Varje by gör en handling om dygnet, den med högst poäng mot någon granne (`byVal` i byhandling.ts), med en slump på ±0,1.

- **Det ovänliga beskedet slår alltid kriget mot samma granne.** Poängen har samma form,
  fejd × (0,5 + aggression) × (0,5 + trons krigiskhet) / styrkekvoten − kostnad. Men beskedet börjar vid relationen −20
  (`beskedRel`) och kriget vid −30 (`krigRel`), båda är fulla 50 längre ner (`beskedFull`, `krigFull`), och beskedet kostar
  0,15 mot krigets 0,3 (`beskedKostnad`, `krigKostnad`). Beskedet får därför alltid minst 0,15 mer. Bara när ett bud redan är på
  väg till grannen kan kriget vinna, och slumpen räcker nästan aldrig (högst 0,2 i skillnad).
- **Kriget lönar sig sällan alls.** Med en medelaggressiv ledare, en fredlig tro och lika starka byar är kriget värt
  1 × 1 × 0,5 / 1 − 0,3 = 0,2, och bara under relationen −80.
- **Mätt:** i scenariots värld på 40 dygn (40 år i spelet) var kriget värt mer än noll 28 gånger (by, granne och dygn). Varje gång
  valde byn något annat, oftast mot en annan granne: gåva 22, fjäsk 3 och muta 3. Under tiden blev det 118 räder och 110 besked.

Det som kan ändras (inget är gjort): en lägre `krigKostnad` eller `krigRel`, eller låta beskedet och kriget följa varandra
(beskedet först, kriget när beskedet inte hjälpt) i stället för att tävla. Det första är balans, det andra ett val.

### Övrigt som syntes på vägen

- Scenarier som sätter en egenskap direkt i `pot` (som kallelse gjorde) tappar den när uppväxten räknar om `pot` ur anlagen.
  Fler scenarier kan ha samma fel utan att det märks ännu.
- Många scenarier tar `testBy(3)` eller `testBy(30)` och räknar med att testbyn har en tro, fem vuxna eller sex som kan resa.
  Testbyarna är små nu (fyra vuxna efter fem dygn), så nästa facit kan göra fler röda av samma skäl. `testBy` med ett villkor
  är vägen som redan finns.
- Körningen skriver VARNING för slaktbank (14 s, bara när den är röd) och varldtillstand (45 s, har egen miljö och körs ändå
  ensam).
