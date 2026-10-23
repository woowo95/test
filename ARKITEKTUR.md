# Kodkarta

Den här filen finns för att den som ändrar koden (oftast Claude) ska hitta rätt fil direkt, utan att läsa allt. Läs den först och öppna sedan bara de filer som berörs.

## Två halvor

- **`src/sim/`: simuleringen.** Byn, människorna, naturen och allt som händer. Ingen grafik och inget i webbläsaren. Den körs likadant i spelet och i testerna. `src/sim.ts` samlar allt så att resten kan skriva `import { … } from './sim'`.
- **`src/ui/`: gränssnittet.** Det ritar kartan med PixiJS och bygger panelen med HTML. Det läser byns tillstånd varje bildruta och ändrar det aldrig, utom genom `step()`, sparningen och testläget.
- **`src/main.ts`** binder ihop dem: klockan, knapparna, huvudloopen och uppstarten.
- **`src/template.html`** innehåller sidans HTML och CSS. Bygget lägger in skriptet där.

Simuleringen importerar aldrig från `ui/`. Gränssnittet importerar bara från `../sim`. Testerna får också importera enskilda filer i `sim/`.

## Simuleringen, fil för fil

| Fil | Innehåll |
|---|---|
| `typer.ts` | Alla typer (State, Person, Task …) och konstanter: tid, kartans storlek (`W`/`H` gäller byn som körs; `useMap(s)` sätter dem efter byns egen storlek, och cacher för kartan har nyckeln `mapKey(seed)`), egenskaper, färdigheter, seder, eldstäder |
| `handlingar.ts` | **Registret över allt en person kan göra** (ACTS): namn, symbol, arbete, avkastning, årstid, plats, fara |
| `saker.ts` | **Registret över allt byn kan äga** (SAKER): stackstorlek, mapp, mat, ruttning, slitage, redskap |
| `teknik.ts` | **Registret över tekniker** (TEKNIK), och hur man kommer på dem och lär ut dem |
| `steg.ts` | `step()`, motorn. Varje steg: elden, varje timme (seder, växande, glömska, slitage, byggplaner), sedan varje person (behov, äta, hälsa, graviditet, uppgift), samtal, befolkning. Även hur man går och bär (`moveLive`) och arbetar (`workStep`) |
| `val.ts` | Vad en person väljer att göra och var: nöd → grundbehov → dag (arbete, bygge, fritid) eller natt |
| `varld.ts` | Ny by (`createState`) och `migrate()`, som lagar äldre sparfiler |
| `karta.ts` | Kartan, som skapas ur fröet (vatten, sand, gräs, sten, var elden står) |
| `mark.ts`, `vag.ts` | Marken: skog och ängar (högt gräs) från början, gräs som nöts till stigar och läker, skog som växer, vägsökning och gångfart |
| `fynd.ts` | **Registret över värmekartor** (FYND): var varje art och flinta finns (sanningen, inte vad byn vet), mönster som kryper med tiden, lägerzonen där inget växer, årstid, hur platser töms och växer tillbaka, fisk i vattnet, svampplockning (kantarell och giftig spindling), vilt som skyr lägret och nött mark (`skyggOf`). En aktivitet kan hämta ur flera lager: `samla` = bär + rötter (`lagren`) |
| `djur.ts` | Enskilda djur (än så länge kaniner) som syns och skuttar där viltlagret har något, och hoppar undan folk. De räknas fram ur lagret och klockan och sparas inte, så de är desamma i båda lägena. Jägaren fångar hela djur (`KANIN`) och går i levande läge mot närmaste kanin (`nearestDjur`). Ritas i `ui/vaxter.ts` (`drawAnimals`) |
| `minne.ts`, `kunskap.ts` | Vad var och en vet (kunskap, alltid rätt) och tror (lärdomar, kan vara fel), synvidd, rädsla, glömska. Den som kommer till en plats som är sämre än hen trott rättar lärdomen (`ny`), och rättelsen sprids som en nyhet i två speldygn |
| `lager.ts` | Stackar och lagerplatser, att bära in, slitage och ruttning per stack |
| `eld.ts` | Elden: bränsle, att tända, glöd, värme, eldstäder och tändsätt. Elden tänds med flinta (som kan spricka), och första gången läggs en ring av `RING` stenar runt eldplatsen (`fire.ring`). Insamling av tändmaterial, stenar och flinta (`forageItems`) |
| `skog.ts`, `redskap.ts` | Att fälla träd och hugga trä (id:t är fortfarande `ved`, för sparfilernas skull), yxan, spjuten (träspjut och flintspjut, för fiske och jakt), rep (tvinnas av hö eller tas från senor när vilt slaktas), metspöet (gren, rep och benkrok; mask grävs före fisket), korgen och flintkniven, som slaktar fällt vilt (`vilt`) vid elden till kött, ben, skinn och senor (`slaughter`). Träd där ett hus ska stå fälls först |
| `agande.ts` | Redskapen som ting och handplatsen. Varje redskap är ett eget ting i `s.ting` med skick, ägare (0 = byn) och vem som har det i handen (`hos`). `s.items[k]` för ett redskap är alltid summan av tingens skick. Den som gör ett redskap äger det (`addTool`). `take` lägger redskapet i handen när en uppgift börjar (eget först, sedan byns, sedan lånat av släkt eller någon som inte är osams); `usesTool` säger vilket redskap en uppgift använder. `wearTool` sliter det som är i handen. `syncTools` (i `reconcile` och i slutet av varje steg) håller tingen i takt med förrådet, gör en dödas redskap till byns och lägger tillbaka byns och lånade redskap när arbetet är slut; egna behålls i handen. `askForTool` (anropas från `converse`): den som saknar ett redskap hen arbetar med får det som gåva eller i byte av någon som har ett över; viljan beror på relation och empati, och gåvor ger skuld (`p.skuld`, givarens id → antal) som minskar när man ger tillbaka. Visas under Utrustning i personfliken (🤝 = skuld) |
| `byggnad.ts` | Vad som står byggt: väggar, golv, öppningar, rum under tak, skydd mot kyla, sovplatser |
| `bygg.ts` | Att bygga: byn planerar hus (utan hänsyn till träden), fäller träden på platsen, hämtar material, bygger och lagar. Stockar från platsen, och träd som fälls för bygget, går direkt in i väggarna (`toWalls`) |
| `folk.ts`, `liv.ts` | Personer (ålder, egenskaper, tankar, logg) och liv och död: födsel, död, flytt, befolkningens reglering |
| `samtal.ts`, `seder.ts` | Samtal och relationer, och byns seder, plikt, vanor och yrkestaggar |
| `plats.ts` | Byns läger (elden och lagerplatserna): mitten, avstånd till byn och `campKey` för cacher |
| `tid.ts`, `vader.ts`, `ekonomi.ts`, `slump.ts` | Tidsåldrar och ljus, temperatur och kyla, hur länge förråden räcker, och slumpen |

## Gränssnittet, fil för fil

| Fil | Innehåll |
|---|---|
| `ui/lage.ts` | Det som alla delar: byn som visas (`s`, byts med `setByn`) och spelarens val (`ui`: flik, vald person, följ …) |
| `ui/hjalp.ts` | Små hjälpare för text, tal, färger och staplar |
| `ui/scen.ts` | PixiJS-scenen, lagren som ritas ovanpå varandra, kameran och `Ikoner` (återanvända ikon-sprites) |
| `ui/terrang.ts` | Marken och natten |
| `ui/vaxter.ts` | Små bärbuskar och svampar i vanliga vyn där det finns något just nu (inte var det kan växa, inte rötter eller vilt) |
| `ui/foremal.ts` | Det som står på marken: lagerplatser, stackar, hus, stubbar, stockar och elden |
| `ui/manniskor.ts` | Människorna, det de bär, pratbubblor, symbolen över huvudet och namnet |
| `ui/filter.ts` | Filterknapparna (en per grupp i `GRUPPER`), teckenförklaringen (tryck på en art för att bara se den) och värmekartorna: prick = finns nu, ring = växer här men är plockat |
| `ui/interaktion.ts` | Mus och tryck på kartan (välja, dra, zooma) och rutan som visar vad som finns under musen |
| `ui/portratt.ts` | Porträttraden överst och att följa en person med kameran |
| `ui/panel.ts` | **Flikregistret** (FLIKAR) och listan över allt byn äger |
| `ui/flikar/*.ts` | En fil per flik: folk (Invånare, Händelser), person, eld, lager (Lagret, Högen), seder, teknik |
| `ui/spara.ts` | Sparning (webbläsaren och artefaktens databas), ikappräkning och sammanställningen efteråt |
| `ikoner.ts` | Pixelbilderna (8×8) för saker och handlingar |

## Regler som håller ihop allt

1. **Slumpen kommer bara från `rnd(s)`** (och `chance`, `gauss`, `pick`) i `slump.ts`. Den sparas i byn, så att samma by alltid utvecklas likadant. Använd aldrig `Math.random()` i `sim/`. Ändrar man ordningen som slumpen dras i ändras utvecklingen, även om koden gör samma sak.
2. **Snabbläget och det levande läget ska ge samma by.** `step(s, dt, live)` körs med 0,5 sekunders steg när man tittar (`live`) och 300 sekunders steg vid ikappräkning. Allt som beror på gång och bärande har en motsvarighet i snabbläget: en uppgift slutar i det steg som ligger närmast sluttiden, avkastningen jämkas för gångtiden (`levande` i handlingar.ts, `FAST` i steg.ts; jägare och fiskare är på platsen nästan hela tiden och har `levande` = `FAST`), och stigarna nöts längs bästa vägen från elden (`tread`, `SNABB_TRAMP` i mark.ts). Kontrollera med `npm run likhet` (räknar tid och antal val per handling, stigar och trampad mark). Byarna skiljer sig mycket åt av slump (elden, vem som kommer på spjutet), så jämför med många byar (`npm run likhet -- 96 24`) och titta helst på avkastning per arbetstimme (`prod_x / t_x`), som inte beror på slumpen. `n_toa`, `n_bara` och `n_elda` räknas olika i lägena och ska inte vara lika.
3. **Byn sparas som JSON.** Nya fält i `State` eller `Person` är valfria (`?`), eller så får de ett värde i `migrate()` i `varld.ts`, så att äldre sparfiler fungerar.
4. **Cacher hör till byn.** Testläget har två byar samtidigt, så det som sparas mellan steg ligger i en `WeakMap<State, …>` med en nyckel som säger när det måste räknas om (`campKey(s)`, `s.byggV`, tiden). Det får aldrig ligga i en enda variabel för hela modulen.
5. **Register i stället för listor.** Vad handlingar, saker, tekniker och flikar är finns på ett enda ställe. Resten av koden frågar registret (`ACTS[a].vila`, `SAKER[k].stack`) i stället för att räkna upp namn.
6. **Gränssnittet visar symboler först.** Förklaringen syns när man håller musen över något (`title`) eller trycker på det.

## Recept

**En ny handling.** Lägg en rad i `DEF` i `handlingar.ts` med de egenskaper som passar. Typen `Act` och listorna följer med av sig själva. Sedan:
- Det som händer **medan** den görs läggs i `MEDAN` i `steg.ts`, och det som händer när den är **klar** i `KLAR`.
- **När** den väljs läggs i `val.ts`: i `needs()` om den är ett behov, i `leisure()` om den är fritid, i `night()` om den görs på natten. Ett arbete för byn har `arbete` lika med sitt eget namn och anger `sasong` och `egenskap`. Det vägs då in i `bestWork()` mot byns behov. Där räknas i dag allt utom ved som mat, så ett arbete som ger något annat behöver en egen rad för hur mycket byn behöver det.
- Behövs en symbol: lägg pixelbilden i `ikoner.ts` och ange `mark` och `ikon`.

**En ny sak.** Lägg en rad sist i `DEF` i `saker.ts`, eftersom ordningen styr hur stackarna läggs ut, och en pixelbild i `ikoner.ts`. Lager, slitage, ruttning och listan över vad byn äger följer med. Är det ett redskap (`redskap: true`) ska funktionen som gör det anropa `addTool(s, k, p)` i stället för att öka `s.items[k]`, så att den som gjorde det äger det, och lägga till handlingen och slaget i `TOOL_ACTS` i `agande.ts` om det används i ett arbete.

**En ny teknik.** Lägg en rad i `TEKNIK` i `teknik.ts`: arbetet där man kommer på den (`omr`), krav, material och tid. Den syns i teknikträdet direkt. Vad tekniken gör (till exempel att en handling bara får väljas av den som `knows(p, 'id')`) skrivs där det används, oftast i `val.ts`.

**Ett nytt system.** Skapa en ny fil i `sim/`, exportera den i `src/sim.ts` och anropa den från `step()`. Det som ändras långsamt anropas i timblocket, och det som gäller varje person anropas i personslingan. Tillståndet läggs i `State` eller `Person` i `typer.ts` (regel 3). Lägg till ett scenario i `src/test/scenario.ts`.

**Ett nytt lager i värmekartan** (en art eller en tillgång på marken). Lägg en rad i `DEF` i `fynd.ts`: namn, grupp, ikon, färg, `topp` (värdet som räknas som mycket), `bas(s, i, m)` för var den kan finnas (`m` är mönstret, 0–1), `monster` om den växer fläckvis och kryper (`skala` = fläckarnas storlek i rutor, `period` = dygn mellan två lägen, 0 = står still, `troskel` = hur stor del som är tom, `gles` = glest inom fläcken), `arstid` om den växlar med årstiden, `uttag` om den kan tömmas och `vatten` (räckvidd) om den lever i vattnet och nås från stranden. Lägg rader med `uttag` sist, eftersom ordningen styr hur de sparas. Inget växer i lägret (`iLagret`, `LAGER_R` rutor från elden och lagerplatserna), så zonen växer med byn. Tre värden per ruta: `vaxerAt` (vad som växer där nu, årstiden inräknad), `fyndAt` (vad som finns kvar efter uttag) och `synsOf` (vad man kan gissa från marken, utan mönstret). `standAt`/`richness` räknar värdet där man står (för vattenlager: vattnet runt omkring). Lärdomar sparar `g` (vad som växer) och `hoped` uppskattar återväxten. Filtret, teckenförklaringen och rutan under musen följer med. Den som skördar arten använder `richness`, `fyndAt` och `takeFrom`. Alla dessa tar ett `Lager`: ett lager eller en aktivitet (`Kind`); en aktivitet summerar sina lager via `LAGREN`, och `takeFrom` delar uttaget efter hur rikt varje lager är. Ska en ny aktivitet hämta ur flera lager, lägg den i `LAGREN`.

**En ny flik.** Skapa en fil i `ui/flikar/` som exporterar en `Flik` (`namn`, `html()` och vid behov `klick()`). Lägg den sedan i `FLIKAR` i `ui/panel.ts`. Flikknappen skapas av sig själv. En flik som öppnas från kartan får `knapp: 'person'` och ingen egen knapp.

**Något nytt på kartan.** Det som står på marken ritas i `ui/foremal.ts`, människorna i `ui/manniskor.ts` och vad musen visar i `ui/interaktion.ts`.

## Tester: vilket när

| Kommando | Tid | När |
|---|---|---|
| `npm run koll` | ca 40 s | **Efter varje ändring.** Typkontroll, testbyarna mot facit, alla scenarier och samma-kollen, med kort utskrift |
| `npm run samma` | ca 5 s | Vid ombyggnad som inte ska ändra något i spelet. Säger om byarna utvecklas exakt som förut |
| `npm run facit` | ca 30 s | När en ändring i spelet är avsiktlig. Sparar nytt facit och ny samma-koll |
| `npm run scenario -- namn` | några s | Ett enda scenario |
| `npm run likhet` | några min | När arbete, gång, samtal eller lärande ändras (snabbläget mot det levande läget) |
| `npm run balans`, `takt`, `teknik`, `detaljer` | | Balansering och undersökning (se CLAUDE.md) |

## Bygga och publicera

`npm run build` ger `samhallssimulatorn.html`. Det lägger också källkoden som .txt i `publicera/kalla/` och fillistan i `publicera/filer.json`. Publicera med Artifact-verktyget så här:
- `file_path`: `samhallssimulatorn.html`
- `url`: spelets artefakt-URL (står i CLAUDE.md)
- `files`: innehållet i `publicera/filer.json`

En fil som tagits bort ur koden tas bort ur artefakten med `"kalla/…": null`.
