# Gaffatejp i koden (steg 10.11.2)

Regler som tvingar fram ett resultat i stället för att systemen ger det, i hela koden och inte bara i fas 10. Inget är ändrat. Svara med numren du säger ja till, t.ex. "ja till 1, 6 och 12". Det du godkänner blir steg i Färdplanen direkt efter 10.11.2, före kodgenomgången.

**Hur genomgången gjordes:** hela `src/sim/` är läst rad för rad av nio hjälpmodeller, en filgrupp var, med reglerna ur `GRANSKNING.md` (avsnittet Gaffatejp och onödiga hårda regler). Jag har sedan kontrollerat i koden att varje citerad rad finns och gör det som står. Gränssnittet (`src/ui/`) och testerna är inte lästa, eftersom de inte avgör vad människorna gör. Radnumren gäller commit c236f3d8.

**Det här är det viktigaste:** de flesta fynden från förra genomgången (9.9.2) har blivit system: fasta ordningar har blivit poäng, fasta antal räknas ur förbrukningen och hårda nollor har blivit mjuka faktorer. Den här gången finns 14 nya fynd, och de flesta är små. Det största mönstret är fortfarande "en i taget" (fynd 6). Den spärren har rättats på många ställen men har kommit tillbaka i nya system från fas 9 och 10.

Varje fynd anger var regeln finns, vad den tvingar fram, vad som saknas i systemet, vilket system som kunde avgöra i stället, vad du skulle märka i spelet och hur stort bygget är.


## Björns svar

Ja till fynd 1–5, 7, 8, 10–12 och 14, fynd 6 bara för vattnet, vattningen och säcken, att mata djur, vattenhon och staketet, och gränsfall 20, 22, 33, 34, 36, 39 och 40. De blev stegen 10.11.3–10.11.21 i Färdplanen, i den ordningen. Bordet (fynd 10) räknas per hus efter dem som bor där och vad som får plats, och efter hela byn i samlingssalen och långhuset, med värdet efter platser per virke. Gränsfall 35 (skyddet för små byar) prövas i Balansen (10.11.23). Fynd 9 och 13 väntar. Kodgenomgången är nu 10.11.22.

## Fynd 1–14

1. **Släckarna får bara välja en ruta som ingen annan släcker** (`brand.ts:673–674` `brandMal`, och samma filter i `slackaSteg` rad 737 och 740).
   - **Regeln:** innan valet tas tre sorters rutor bort: rutor som någon annan släcker, rutor som inte hotar något och rutor inne i branden.
   - **Vad den tvingar fram:** släckarna sprids ut längs eldens kant. Regeln kom i fas 9:s balans (9.9.4), "så att den går att släcka". Kommentaren säger att två på samma ruta inte släcker fortare, men koden lägger varje persons takt på rutan, så två släcker faktiskt fortare.
   - **Vad som saknas:** en brinnande ruta har inget värde.
   - **I stället:** rutan får värdet av det som står nära (`vardeNara`, som redan finns), delat med antalet som redan släcker där. Kantrutor väger mer än inre.
   - **I spelet:** samma sak som nu, men husen och förrådet räddas först.
   - **Storlek:** Mellan.

2. **Stenarna till en lägereld letas som ett eget uppdrag, av en i taget** (`brasor.ts:59–65` `kanLetaBrasaSten`/`brasaLeta`, `projekt.ts:152,154`, `eld.ts:206`).
   - **Kommentaren:** "byn samlar sällan, så annars kommer lägerelden aldrig".
   - **Vad som saknas:** förrådsmålet för sten är alltid 0 (`forradsmal.ts:142`), så vanligt samlande hämtar aldrig sten.
   - **I stället:** förrådsmålet för sten blir de stenar som planerade eldringar saknar, så som byggstenen redan räknas ur Byggplanen (`forradsmal.ts:145`). Då kan specialuppdraget tas bort.
   - **Storlek:** Litet till mellan.

3. **Byggplanen väljer en plats och släpper den sedan om den ligger på en slåtteräng** (`byggplan.ts:872`, i `utfor`).
   - **Regeln:** platsfiltret (`usable` i `lager.ts:388`) stänger ute fält men inte ängar. Planen kan därför välja en äng, släppa den och sedan välja samma äng igen nästa gång, var tredje timme.
   - **Bakgrund:** raden kom i en rättning (a6ee1afc).
   - **I stället:** ängen läggs in i platsfiltret och raden i `utfor` tas bort.
   - **I spelet:** byggen som nu aldrig blir av, för att planen fastnar på samma äng, blir av.
   - **Storlek:** Litet.

4. **Torkhus och vedbod byggs vid fasta trösklar och med ett fast "hur bråttom"** (`byggnader.ts:36–52, 120, 125`).
   - **Regeln:** ett torkhus byggs från 2 torkställningar ute och en vedbod från 40 ved ute. Över tröskeln är behovet alltid 0,25.
   - **Vad som saknas:** behovet frågar inte vad som går förlorat. Systemen vet redan hur mycket ved som blir blöt (`BLOTVED`) och hur mycket mat som ruttnar (`s.ruttet`). Förrådshuset skalar redan med bristen.
   - **I stället:** behovet blir andelen ved som ligger blöt eller den mat som förstörs per dygn, mot husets kostnad.
   - **Storlek:** Litet till mellan.

5. **Högst sex förslag per åtgärd, i den ordning de skapades, innan de får poäng** (`byggplan.ts:862`, `slice(0, PLAN.perBehov)`).
   - **Regeln:** förslagen för en utbyggnad är inte sorterade, så de bästa kan skäras bort innan poängen räknas.
   - **I stället:** sortera förslagen innan snittet, eller ta bort snittet.
   - **Storlek:** Litet.

6. **"En i taget", hårt, på nya ställen** (samma sorts fynd som 9.9.2 nr 10). Personen stryks innan poängen räknas, om någon annan redan gör samma sak. Det gäller på dessa ställen:
   - vattnet åt en törstig, vattningen av ett fält och fyllandet av säcken (`torst.ts:215, 217, 226`);
   - att mata ett djur (`tamdjur.ts:115`);
   - tatueringen (`tatuering.ts:67`);
   - att märka ut en äng (`slatter.ts:64`);
   - att rista en lag (`skrift.ts:113`, "en lag i taget");
   - att fylla en vattenho (`djurtorst.ts:54`);
   - mältningen (`brygg.ts:77, 80`; det hängande kornet räknas inte som malt, så en spärr behövs);
   - att vittja mjärden (`val.ts:835`);
   - staketet (`val.ts:857`).

   Det mjuka sättet finns redan och används på många rader: `enTill` (`folk.ts:242`), där chansen att en till tar uppgiften sjunker med antalet som redan gör den. Fynd 6 är att låta de här raderna använda det, och att låta kornet som hänger räknas som malt.
   - **I spelet:** två kan hjälpas åt när behovet är stort, till exempel när många törstar.
   - **Storlek:** Litet.

7. **Byn vill ha ett fast antal av varje redskap, med fasta tak** (`forradsmal.ts:77–83`, `REDSKAPMAL`: högst 4 spjut, 5 korgar, 3 yxor, 2 nät, 2 sländor, 3 facklor, ett horn, en bagborr, en kälke; `tillverka.ts:11–44`: fasta antal salva, tjära, lim, tvål).
   - **Vad som saknas:** materialen i samma fil räknas redan ur förbrukningen, men ett redskap som slits ut räknas inte som förbrukat.
   - **I stället:** slitaget lägger redskapet i förbrukningen, och målet blir det byn gör av med. Det här är 9.9.2 nr 41, utvidgat till redskapen.
   - **I spelet:** en stor by där yxorna går sönder fort skulle ha fler yxor.
   - **Storlek:** Mellan.

8. **Tre ställen höjer hungern direkt i stället för att maten äts** (`kult.ts:303` bröllopet, `kyrka.ts:379` kyrkans mat till de fattiga, `kyrka.ts:710` gravölet).
   - **Regeln:** alla blir 0,15 eller 0,3 mättare, också de som sover och de som inte var där, oavsett vilken mat det var.
   - **I stället:** de som är med äter var sin portion genom `ata()`, som högtidens gille redan gör (`kult.ts:386`). Då räknas näringen.
   - **Storlek:** Litet.

9. **Rätten i krukan och steken tar andra ingrediens, smak och kött eller fisk i registrets ordning** (`matlagning.ts:271–274, 338–341, 412`).
   - **Regeln:** löken går alltid före saltet och kött före fisk, vad byn än har över.
   - **Vad som saknas:** huvudingrediensen väljs redan med poäng (överskott och hur nära den ruttnar), men inte de andra råvarorna.
   - **I stället:** samma poäng för de andra råvarorna.
   - **I spelet:** mer variation, och saltet sparas till saltfisken när det är ont om salt.
   - **Storlek:** Litet.

10. **Bara en storlek bord önskas någonsin, vald av en regel** (`stationer.ts:1209–1220`, `bordStorlek`/`bordBrist`).
    - **Regeln:** den minsta storleken som räcker åt alla får hela bristen. De andra storlekarna får 0.
    - **I stället:** alla storlekar får bristen, och kostnaden per plats avgör vilken som byggs. Det är så projekten fungerar annars.
    - **Storlek:** Litet till mellan.

11. **Lärlingen går till sin mästare före all annan fritid** (`val.ts:1336`, `if (gaILara(…)) return;` före vikterna för vila, hantverk, umgänge och promenad).
    - **Regeln:** en trött eller ensam lärling går ändå i lära.
    - **Vad som saknas:** lärandet har redan poäng på de två andra ställena där det väljs.
    - **I stället:** en vikt för att gå i lära bland fritidens vikter, gånger lärlingens egen lust.
    - **Storlek:** Litet.

12. **Flintan och kolet tas före poängen på nivån Försörjning, med en fast chans** (`val.ts:788–818`, raderna `leta` och `kol`; `VAL.letaChans` 0,3 och `VAL.kolChans` 0,2).
    - **Regeln:** de prövas innan maten och veden vägs. En by med lite mat kan därför skicka var tredje arbetare att leta flinta först.
    - **Vad den tvingar fram:** att elden går att tända. Men elden är ett verktyg och ska inte styra andra system.
    - **I stället:** två poängrader. Flintans poäng blir bristen i förrådsmålet och kolets poäng eldens behov.
    - **Storlek:** Litet till mellan.

13. **Den som blöder får ett eget undantag inne i nivån Fara** (`val.ts:621–626`).
    - **Bakgrund:** min regel, från fas 9:s balans. Kommentaren säger "förut stod alla kvar i försvaret medan de sårade förblödde".
    - **Vad som saknas:** valet av roll mot vargar och rövare väger inte in hur svårt någon blöder.
    - **I stället:** blodförlusten drar ner viljan att möta hotet, och hjälparnas roll får en vikt för den som blöder.
    - **Storlek:** Litet till mellan.

14. **Ingen plockar bär eller rötter nära toa-smuts** (`smuts.ts:138` `forSmutsigt`, använd i `val.ts:359, 378, 401`). Det här är 9.9.2 nr 92, som står kvar.
    - **Regeln:** rutan stryks helt, utom när alla rutor är smutsiga.
    - **Vad som saknas:** att äta det som växt i smuts har ingen följd i världen.
    - **I stället:** smutsen sänker rutans värde och ger en chans till magsjuka (`sjukdom.ts`). Då kan den som svälter plocka där ändå.
    - **Storlek:** Litet till mellan.

## Gränsfall 15–40

Det här är vi osäkra på. Det kan vara hur världen är, men det kan också vara gaffatejp. Du får gärna säga ja till dem också.

15. **Brandens balanstal är ställda mot resultatet "byn kan släcka den"** (`brand.ts:65, 70, 102, 105`, ändrade i 9.9.4). De är balanstal, så det här är inget fynd.
16. **Askan lämnar alltid lite gräs, "så att det inte blir en stig"** (`brand.ts:84`). Golvet rättar stigarna i stället för stigarnas tröskel.
17. **Ett björnmöte slås en gång per person och år, med en chans per möte** (`bjorn.ts:80`). Allt annat räknas per tid. Det här är 9.9.2 nr 84.
18. **Bara ägaren klipper, mjölkar och skattar sina djur och bin** (`boskap.ts:97, 120`, `bin.ts:201`).
19. **Elden flyttas till byns mitt först vid 3 hus och 8 rutor, och bara när det är ljust** (`eldflytt.ts:21–22, 93, 100`).
20. **Ett tomt eget hus rivs efter 2 dygn utan att någon frågar om någon vill köpa det** (`byggplan.ts:577–591`).
21. **Mjärdarna räknas ur förbrukningen, men med en fast andel på 10 %** (`fisk.ts:34`).
22. **Bara en bär undan maten när vattnet stiger** (`flod.ts:88`).
23. **Spjut och metspö vill byn ha först när någon har fiskat eller jagat** (`forradsmal.ts:217`).
24. **Tändmaterialet har fasta mål: 12 när elden brinner och 36 när den är släckt** (`forradsmal.ts:59–61`). Härdens brist är alltid 0,5 (`forradsmal.ts:279`).
25. **Hjälparen vid en förlossning tilldelas uppgiften förbi valet av aktivitet** (`forlossning.ts:41–54`). Det här är 9.9.2 nr 81.
26. **En vårdare per skadad** (`halsa.ts:648`).
27. **En ny hage först när alla hagar har staket, och en märker ut åt gången** (`hage.ts:100–113`).
28. **Handeln:** den som handlar för byn går först, och en annan vuxen får gå först efter 2 timmar (`handel.ts:759`). Det här är 9.9.2 nr 19.
29. **Framträdandets form slumpas lika** mellan de former personen kan, i stället för efter lust eller vad publiken vill (`framtradande.ts:326`).
30. **Ritualerna går en i taget i hela byn, och man ber en gång om dagen** (`kult.ts:283, 85`).
31. **Barn går aldrig emellan i ett slagsmål** (`kartstrid.ts:311`, vikten är −Infinity).
32. **Jägaren letar aldrig längre än 45 rutor bort** (`jakt.ts:141`).
33. **Lerkrukan flyttar sig själv till ägarens sovrum** varje timme, utan att någon bär den (`kruka.ts:57–66`).
34. **"Byn svälter" mäts på två sätt för det heliga djuret:** för hela byn i `jakt.ts:158` och `kyrka.ts:626`, men för personen i `lager.ts:693`.
35. **Små byar skyddas mot att krympa på fyra ställen** (`liv.ts:46–64`: färre flyttar från byar med 6 eller 7 invånare, och nybyggare kommer under 10). Det hör ihop med 9.9.2 nr 13.
36. **Proteserna sätts på av sig själva,** utan att någon gör det och utan att någon väljer vem som får dem (`protes.ts:26–41`).
37. **Stammen huggs alltid före nästa träd fälls,** också en stam långt ute (`skog.ts:229–233`).
38. **Ruset:** den som är full tar ingen mer dryck, och den som super tar alltid den starkaste (`rus.ts:73, 83–88`).
39. **Förbättra stängs hårt av kyla och hunger på åtta rader** (`val.ts:852–871`, och hantverket på rad 1285), medan bygget och projekten dämpas mjukt. Det är 9.9.2 nr 4 på nya rader.
40. **Nivån Rädda har rader som inte frågar om något behöver räddas:** slåtter, bakning, gropen och soporna (`val.ts:772–781`). Det här är det som är kvar av 9.9.2 nr 23.

Mindre gränsfall, som jag tror är grundregler: striden slutar 20 sekunder efter att ena sidan inte har någon kvar (`strid.ts:82`); gästernas pilar är gratis (`strid.ts:954`); en ledare väljs först vid 6 vuxna (`styre.ts:44`); rövarnas väntan är 15–30 minuter (`rovare.ts:649`); ministerposterna kommer vid fasta tal (`rost.ts:191`); fähuset önskas bara på hösten och i istiden (`slatter.ts:129`); fast 7 hö per djur inför vintern (`slatter.ts:42`); nattens bärande har en fast chans (`val.ts:1425`); en vattenho per hage (`vattenho.ts:35`); tekniken Kompost kommer till alla odlare på en gång (`rester.ts:89`); senor blir rep bara när byn vill ha rep (`redskap.ts:164`).

## Förra genomgångens fynd (9.9.2)

**Borta eller blivit system:** 5, 6, 7, 8, 9, 14, 16, 18, 21, 24, 25, 26, 27, 28, 29, 30, 33, 36, 37, 38, 39, 43, 44, 47, 49, 51, 52, 53, 54, 56, 57, 58, 60, 61, 62, 64, 65, 68, 69, 71 och 79.

**Ändrade men delvis kvar:**

| Nr | Vad som ändrats | Vad som är kvar |
|---|---|---|
| 3 | Elden räknar sin reserv ur vad den bränner | Reserven stoppar fortfarande stationer, väggar och redskap |
| 4 | Bygget och projekten dämpas mjukt | Gränsfall 39 |
| 10 | `enTill` på många rader | Fynd 6 |
| 11 | Antalet vakter följer hotet | Den modigaste vaktar, och högst hälften av de vuxna |
| 12 | Tekniken och sporten väger överskottet mjukt | Kyrkskatten har en tröskel |
| 15 | Så många eldar som veden räcker till | – |
| 17 | Lusten efter ett pynt avtar | En person bygger ett pynt i taget |
| 20 | Veden ska räcka ett antal dygn | – |
| 23 | Delvis flyttat | Gränsfall 40 |
| 31 och 32 | Målen följer vad byn äter | – |
| 34 | Dryckerna väljs efter brist | Bären går före vinet via en tröskel |
| 35 | Delvis ändrat | Gränsfall 38 |
| 40 | Mjärdarna räknas ur förbrukningen | Gränsfall 21 |
| 42 | Flintans tak är förrådsmålet | Den letas inte vid svält, och fynd 12 |
| 45 och 46 | Utsädet räknas ur fälten | – |
| 50 | Slakten är mjukare | "Ett par blir kvar" |
| 55 | Elden flyttas mot en kostnad | En gammal kommentar i `byggplan.ts:833` |
| 59 | – | Förbättringar stoppas så länge något byggbehov finns |
| 63 | Värdet räknas | Bara vuxna släcker |
| 66 | Minnet väger vad som trängs undan | Taket 20 |
| 80 | Fastan bryts på personens egen hunger | Buden: gränsfall 34 |
| 98 | Offren har inget tak | Högst fyra trosriktningar |
| 99 | Resterna har ett förrådsmål | Mjärden vid 2 fiskar och latrinen vid 85 % |

**Står kvar som de beskrevs:** 1, 2, 13, 19, 22, 41 (se fynd 7), 48, 67, 70, 72, 73, 74, 75, 77, 78, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92 (se fynd 14), 93, 94, 95, 96 och 97. Nummer 76 (maten äts i registrets ordning) är inte kontrollerat den här gången.

Dessutom två gamla kommentarer, som rättas i kodgenomgången 10.11.22: `matlagning.ts:123` nämner `TORK.maxStall`, som inte finns längre, och `klader.ts:12` säger "i ordningen", fast valet nu är en summa med vikter.

## Bedömt som grundregler

Det som är hur världen är:
- Recepten och stationerna.
- Kroppen, hälsan och sjukdomarna.
- Ägandet och arvet.
- Brandens, flodens, vädrets och isens fysik.
- Djurens beteende och biologi.
- Husens mått och material.
- Värdet ur arbete och material.
- Vätskornas behållare.
- Trons register och skalor.

Det som redan är poäng eller förrådsmål:
- Valet av aktivitet på nivåerna Fara, Nöd och Grundbehov.
- Jakten och bytet.
- Förrådsmålen för material.
- Projektens värde.
- Klädernas material.
- Torkningen och grillen.
