# Samhällssimulatorn – arbetsregler

Björn programmerar inte; Claude skriver all kod. Svara på svenska.

Notis (Björn, efter v112): skicka en notis till mobilen (PushNotification) varje gång en omgång är klar och Claude slutar arbeta: en rad om vad som är klart eller vad som behöver Björns svar.

## Innan du programmerar (varje prompt)

Björn förklarar inte i prompten var fakta finns. Gör därför alltid så här innan du skriver kod:

1. Läs "Läget just nu" i designdokumentet: vad som är byggt, nästa steg och kända brister.
2. Hitta steget i Färdplanen (sök på numret, t.ex. mönstret `^1\.5\.`). Nämner Björn inget nummer: hitta systemet som berörs och se om det redan finns ett steg.
3. Läs avsnitten som systemets "Läs:" pekar på, och sök i dokumentet på orden prompten handlar om (saker, handlingar, system). "Beslut" är bestämt; "förslag" är inte bestämt.
4. Fråga först om steget säger "Björn avgör", om dokumentet säger emot sig självt eller prompten, eller om det saknas det som behövs. Säg i så fall vad som saknas.
5. Läs `ARKITEKTUR.md` och sedan bara de filer som berörs.

Sök i dokumentet i stället för att läsa allt; det är långt.

## Nya system som Björn beskriver

- Bygg bara in det som det redan finns system för och som programmet är moget för nu.
- Allt annat skrivs in i designdokumentet för att göras senare: som ett steg under rätt system i Färdplanen (nästa lediga nummer, med en "Läs:"-hänvisning om systemet är nytt), och förklaringen i rätt avsnitt. Bygg det inte i förväg.
- Säg i svaret vad som byggdes nu och vad som lades i designdokumentet.

## Färdplanen

- Färdplanen i designdokumentet är numrerad: fas, system, steg. Ett steg med tre siffror (t.ex. 2.5.1) är en prompt.
- Björn säger t.ex. "gör 2.5.1", "gör 2.5" eller "gör till och med 2.6.2". Bygg de steg som nämns och stanna efter det sista.
- Läs avsnitten som systemets "Läs:" pekar på innan du bygger. Står det "Björn avgör" i steget, fråga först.
- Bocka av ett byggt steg och skriv versionen efter, t.ex. "(v36)". Byggda steg byter aldrig nummer.
- Nya steg läggs alltid framför där vi är, i ett system som inte är byggt än, aldrig i ett system som redan är passerat. Säger Björn hur långt fram (t.ex. "tidigast efter 2.3.4"), läggs de där eller senare. Passar inget system, läggs stegen sist i det närmaste systemet efter den platsen, så att de obyggda systemen behåller sina nummer. Säg i svaret vilka nummer stegen fick.

## Principer

- Register och ett ställe per sak: allt det kan finnas fler av (handlingar, saker, tekniker, djurarter, behov, flikar) är rader i ett register som koden frågar, och allt om ett system samlas i en fil i koden och ett avsnitt i designdokumentet. Ett nytt system börjar med sitt register.
- Gränssnittet: symboler först. Förklarande text göms och kommer fram när man trycker på något eller håller musen över det.
- Nytt utseende (Björn, efter v95): allt som ritas följer bildstilen, som också är guiden: https://claude.ai/artifact/Khx8Ggn4CdRb76UpZLnQww (källkoden i `bildstil/`, se `bildstil/README.md`). Läs avsnittet "Guiden" där först. När något nytt syns i spelet (en sak, station, möbel, byggnad, människa, symbol), gör en enkel platshållare i paletten med 16 punkter per ruta medan du programmerar. När steget är klart, gör tre versioner och lägg dem i bildstilens valdel (registret `VAL`), där Björn väljer direkt på sidan och kan skriva en kommentar. När något som redan finns görs om (uppskalning till 16 punkter per ruta, en emoji som blir pixelsymbol) räcker en version som Björn säger ja eller nej till. Läs valen med ArtifactData (samlingen `val`). Det valda byggs in i ett senare steg; ta sedan bort saken ur `VAL` och dess dokument i `val` och publicera bildstilen igen. Vid nej: rita en ny version efter kommentaren.
- Snabbläget (ikappräkning, snabbspolning) ska ge samma utveckling som det levande läget. Kontrollera med `npm run likhet` när något i arbete, gång, samtal eller lärande ändras.
- Tid i svar och dokument: skriv alltid ut vad ett tidsspann betyder. Spelet följer den verkliga klockan: ett dygn = ett år i spelet, en vecka = en tidsålder (årstid). Skriv t.ex. "28 dygn (28 år i spelet, fyra veckor i verkligheten)". Testernas körtid ("40 s") är datorns tid och har inget med spelet att göra; säg det om den nämns.
- Elden är ett verktyg, inte ett mål. Att den brinner är inget mått på en lyckad by, och den får inte styra andra system. Faror som kyla går före förbättringar via prioriteringen i valet av aktivitet.

## Nattkörning (Björn, efter v55)

När Björn säger att Claude får programmera över natten:

- Gå igenom stegen i Färdplanen ett i taget i den ordning "Nästa steg" säger, och sedan i nummerordning. Gå inte längre än Björn sagt (efter v55: inte efter 2.9).
- Efter varje färdigt steg: testerna som vanligt (snabbkollen, och det stora testet efter ett systems sista steg), commit med versionen, publicera en ny version och uppdatera designdokumentet.
- Behöver ett steg Björns svar ("Björn avgör" eller något som saknas): hoppa över det tills vidare, skriv frågan i steget och gå vidare. Stanna bara om något allvarligt gör att inget kan göras utan Björn.
- Utseenden: platshållare under natten; de tre versionerna per sak läggs i bildstilens valdel till morgonen.
- Balansera inte under natten (det görs i fasens Balans). Undantag (Björn efter v115): i nattkörningen som gör klart fas 2 får fasens Balans (2.12) byggas och balanseras.
- När Björn säger stopp: gör klart steget som pågår, publicera det och ge en rapport över allt som gjorts: steg och versioner, det som hoppades över och varför, frågorna, bilderna med förslag och testresultaten.

## Källor

- Spelet (artefakt): https://claude.ai/artifact/TdCUKPj4wC55BVGq7db14n
- Designdokument (Claude Docs): https://claude.ai/artifact/McP5446XiGQaJ3hbs9YXrc. Läs avsnittet "Läget just nu" först.
- Bildstilen och guiden för allt som ritas (artefakt): https://claude.ai/artifact/Khx8Ggn4CdRb76UpZLnQww. Källkoden i `bildstil/`; `node bildstil/bygg.cjs` ger `bildstil/bildstil.html`, som publiceras till samma URL. Utelämna `capabilities` vid ny publicering, så att databasen med Björns val finns kvar.
- Koden: läs `ARKITEKTUR.md` först. Den säger vilken fil som gör vad, vilka regler som håller ihop koden och hur man lägger till en handling, en sak, en teknik, en flik eller ett nytt system. Öppna sedan bara de filer som berörs.

- Kodgranskning: när Björn ber om en grundlig genomgång av koden, följ `GRANSKNING.md`.

## Bygga och publicera

- `npm install`, sedan `npm run build`. Det ger `samhallssimulatorn.html`, och i `publicera/` källkoden som .txt och fillistan `filer.json`.
- Publicera alltid till samma artefakt-URL så att Björns sparade by och länk finns kvar: `file_path` = `samhallssimulatorn.html`, `url` = spelets URL och `files` = innehållet i `publicera/filer.json`. Då kommer källkoden med under `kalla/`.
- Uppdatera "Läget just nu" i designdokumentet när något nytt är byggt, och bocka av steget i Färdplanen.
- Commiten som publiceras säger versionen inom parentes, t.ex. "(v44)". Då hittar `jamfor --mot v44` den (git-taggar går inte att pusha härifrån).

## Enklare modeller (spara tokens)

- Lämna enklare uppgifter till en enklare och billigare Claude-modell när det passar: köra långa tester och sammanfatta resultatet, söka fakta i dokumentet eller koden, och mekaniska ändringar som följer ett tydligt mönster (en ny rad i ett register, ett scenario efter en mall).
- Det som kräver helheten görs av huvudmodellen: simuleringen, likheten mellan spelet och ikappräkningen, balansen och designbeslut.
- En hjälpare börjar utan att veta något om projektet och måste få allt den behöver i uppdraget. Små uppgifter går därför fortare att göra direkt.

## Tester (spara tokens)

### Testa i grupper

- Efter varje steg: `npm run snabbkoll -- [scenarier]` (ca 40 s datortid). Typkontrollen, alla scenarier utom de långa (`lang` i scenariots fil i src/test/scenarier/; nämn det nya systemets scenario om det är långt) och vakterna i fyra byar under de första 12 dygnen (12 år i spelet, knappt två veckor i verkligheten). Den hittar fel medan de är färska. Committa varje steg för sig.
- Efter det sista steget i ett system i Färdplanen (t.ex. 1.4.3 om 1.4 slutar där): det stora testet. `npm run koll`, och `npm run likhet` om arbete, gång, samtal eller lärande ändrats.
- Det stora testet direkt efter ett steg som ändrar grunden (slump, förråd, tid, stegens ordning).
- Balanstester görs sällan (Björn, efter v54): `npm run jamfor -- 35 64 --mot vNN` körs i fasens sista system (Balans), mot versionen före fasen, och när Björn ber om det. Inte efter varje steg eller system. Att byarna utvecklas långsammare eller sämre efter ett nytt tillägg gör inget; balansera inte i steget. Skriv resultatet från jamfor i Färdplanen när det körts. Visar det "sämre" går det att hitta steget med `jamfor --mot` stegets commit.
- Rätta direkt bara det som är fel och inte balans: vaktlarm, krascher, scenarier som inte går igenom och ett nytt system som aldrig används. Allt annat (byar som dör ut, hunger, humör, mat och ved efter vintern, elden) balanseras i det sista systemet i fasen (Balans).
- `npm test` och samma-kollen visar "annan utveckling" efter varje steg som ändrar spelet. Spara nytt facit (`npm run facit`) vid det stora testet.

### Kommandon

- `npm run koll`: det stora testet (ca 3 min datortid). Det kör typkontrollen, `npm test`, alla scenarier och samma-kollen samtidigt och skriver bara ut det som behövs.
- `npm run samma`: utvecklas byarna exakt som förut (ca 20 s datortid)? Används vid ombyggnad som inte ska ändra något i spelet.
- `npm test`: tre byar i 90 dygn utan grafik, en rad per by, jämfört med `test/facit.json`. Visar bara det som ändrats, alltid om en by dött ut och återgrundats, och vakter som larmar om något omöjligt händer (NaN, negativa förråd, folk i vattnet).
- `npm run facit`: spara nytt facit (och ny samma-koll) när en ändring i spelet är avsiktlig. Larmar vakterna, eller kraschar en by, sparas inget.
- `npm run jamfor -- [dygn] [byar] [--mot gren]`: blev spelet bättre eller sämre? Kör samma byar med koden nu och med main (eller `--mot`) i 35 dygn (35 år i spelet, fem veckor i verkligheten: grundandet och första vintern), åtta byar åt gången tills varje nyckeltal är avgjort: bättre, sämre, lika eller ingen stor skillnad. Det körs i fasens Balans, med `--mot` versionen före fasen, och när Björn ber om det, i stället för att jämföra två balanskörningar. Den äldre versionens resultat sparas, så bara den nya koden körs (ca 3–7 min datortid). Vilka nyckeltal som jämförs, åt vilket håll de är bättre och vad som är en stor skillnad står i registret `NYCKELTAL` (src/test/nyckeltal.ts). Elden visas bara som information (högre eller lägre), aldrig som bättre eller sämre. Mat och ved efter vintern mäts först efter 35 dygn; på färre dygn står de som "ej mätt".
- `npm run jamfor -- [dygn] [byar] --satt system.namn=tal[,…]`: vad gör ett annat balanstal? Samma byar med koden nu, utan och med talen (namnen visar `npm run talen`; en lista skrivs `tal/tal/tal`), med samma statistik och samma stopp som mot main: bättre, sämre, lika eller ingen stor skillnad. Körningen utan talen sparas och delas med vanliga jamfor och `--svep`, så oftast körs bara den med talen (ca 2–6 min datortid för 35 dygn). Ett namn som inte finns ger fel.
- `npm run jamfor -- [dygn] [byar] --svep system.namn=a/b/c` (eller `a:b:steg`, från a till b): vilket värde är bäst? Samma byar för varje värde och för värdet i koden, 16 byar per värde om inget anges och inget stopp. En tabell med en kolumn per värde och medianen per by för varje nyckeltal (och den sämsta byn för döda, svält och kyla); det värde som skiljer sig mest från koden markeras på varje rad (✓ bättre, ✗ sämre, · bara information). Tre värden × 16 byar × 35 dygn (35 år i spelet, fem veckor i verkligheten) tog 5,5 min datortid när inget fanns sparat; körningen med värdet i koden sparas och delas med vanliga jamfor och `--satt`, så då går det fortare (ca 4 min). Medianen av 16 byar är brusig: pröva sedan det lovande värdet med `--satt`.
- Brus: små byar står på gränsen till svält, och minsta ändring kan avgöra om en enskild by klarar sig, åt båda hållen. En eller ett par byar som blivit mycket sämre är därför inget bevis; det är bara när de flesta går åt samma håll, eller när `jamfor` säger "sämre", som något är fel. Skillnader på några hungertimmar går inte att mäta snabbt.
- `npm run natur -- [byar] [dygn]`: människornas avtryck på naturen (steg 1.7.2): samma byar med och utan redskap, median för invånare, mat, växter kvar nära byn, avstånd till maten, skog, stigar och hus (ca 3 min datortid för 16 byar i 35 dygn).
- `npm run balans -- [antal] [dygn]`: många byar parallellt, median/sämst/bäst. En översikt över hur byarna mår, inte en jämförelse: två körningar skiljer sig av sig själva.
- `npm run scenario -- [namn]`: scenariotester (glanta, ingen-yxa, yxa, vinter-slocknad, knapphet, svamp, flinta, kunskap, temperatur, kalender, historik, sparning, slump, befolkning, stenring, fiskespjut, redskap, agande, gava, byte, egendom, behov, ved, djur, abborre, slaktbank, byggnader, forradshus, familjehus, funktion, paborjat, kaniner, bostad, fritid, rotter, samlartur, lager, slitage, lagerplatser, aktivitet, teknik, bygg, varmekarta, delning, arv, varde, natur, flatarbank, faror, seder, samtal, liv, utflyttning, vakt, aldrig, ui-ren, ikoner, sjo, projekt, stationsteknik, mobler, hallbarhet, skinnfall, bord, dorr, verkstad, utrustning, klader, balte, varm, skugga, sak, forvaring, kista, personlighet, torst, kropp, vard, halsoflik, naring, brist, blod, latrin, grill, tork, brasa, vattensack, odling, falt, lekplats, ibyn, heltal, kvalitet, vader, is, karta, eldflytt, utkant, tider, relationer, uppvaxt, humor, utbrott, vald, barnutbrott, rykten, ledare) som kontrollerar att det som ska hända händer. Varje scenario skriver hur lång tid det tog (processorns tid). Lägg till ett scenario när ett nytt system byggs, och märk det `lang: true` om det tar 13 s eller mer, så att den snabba kollen hoppar över det; annars skriver körningen en VARNING. `ALLA=1 npm run scenario -- [namn]` visar också kontrollerna som gick igenom.
- `npm run takt -- [by] [timmar]` (by 3 i 24 timmar om inget anges, ca 2 s datortid): hur mycket en arbetstimme ger i varje arbete som bär hem något, antal turer hem (byns statistik) och hur många jordrutor som blivit stigar (bar jord utan ungskog). Ordet `live` eller `snabb` får stå med men betyder inget sedan v29: levande läge och snabbläget räknar likadant. Använd när arbete, bördor eller gång ändras.
- `npm run teknik -- [by …]` (byarna 1–6 om inget anges, ca 40 s datortid per by, flera byar samtidigt): för varje teknik under 90 dygn (90 år i spelet) hur många byar som kom på den, hur många dygn det tog från att den blev öppen (kraven kan man och materialet finns), byns arbetstimmar i arbetet som låser upp under tiden, ointresserade byar (inga timmar) och ✗ när medianen är längre än målet för teknikens nivå (`TEKTAL.nivaDygn`, steg 2.12.9). Sist den längsta tiden per by utan något nytt.
- `npm run likhet -- [timmar] [byar]`: samma byar i levande läge och snabbläget, sida vid sida. Utan tal körs fyra byar i 720 timmar: 30 dygn (30 år i spelet, drygt fyra veckor i verkligheten), som räcker till första huset och första istiden (ca 1 min datortid). Felkoden är 1 om en by inte är exakt lika eller kraschar.
- `npm run detaljer -- [by …]` (byarna 1, 42 och 777 om inget anges, ca 40 s datortid per by): den långa utskriften för 90 dygn (90 år i spelet), bara när något behöver undersökas.
- `npm run talen [-- filter …]`: alla balanstal per system med namn och värde (`balans()` i src/sim/balans.ts, ca 1 s). Ett filter som är ett systems namn visar det systemet, annars visas de tal vars namn innehåller filtret (t.ex. `npm run talen -- val` eller `npm run talen -- fryser`). Ett annat värde prövas utan att koden ändras med `jamfor --satt` eller `--svep` (ovan), eller med miljövariabeln BALANS före ett testkommando, t.ex. `BALANS="kropp.fryser=0.3" npm run balans`. Med `jamfor` gäller BALANS båda sidorna.
- Händelseloggen (`s.log`) rymmer bara de senaste 400 raderna. Räkna aldrig ur den i tester eller spelet; räkna i byns statistik när det händer (steg 1.5.1).
- Ta skärmbilder bara när utseendet ändrats; kontrollera annars text på sidan.
