# Fas 7: samtalet med Björn, att fortsätta

Inget av detta är inskrivet i designdokumentet än. Björn har sagt: skriv inte in något förrän han säger till.
När han gör det skrivs det bestämda in där det står (avsnitt och steg), stegen numreras om och hänvisningarna rättas.

## Bestämt

### Världskartan (skrivs inte in förrän den är färdigtänkt)
- Ett test av vilka platser som går att bo på; byarna hamnar där.
- Det man behöver för att överleva finns i olika former, och olika arter på olika platser.
- Senare en lista över resurser som måste gå att få tag på, så att testerna kan se vad som saknas vid balanseringen.
- Första versionen har inga biotoper (allt är samma). Biotoperna byggs upp efter hand.
- Idé för slutet av spelet: båtar som låses upp sent, resor till exotiska öar med sällsynta resurser, kanske ett annat folk där. Förslag: ett eget system efter floderna (14.1), folket kanske i fantasyn (12.1).

### Bältet, axeln och ryggsäcken
- Ett fält i sakregistret säger var ett redskap hänger: bältet (kniv, yxa, spade), axeln (spjut, metspö, båge, vattensäck), ryggsäcken (bördan, inga redskap). In i 7.1.1 och 7.1.2.
- En ny plats i utrustningen: smycket (i stället för halsen). Halsbandet sitter där.

### Flyttas eller tas bort
- Borgen (7.3.14) till 11.3 Försvaret, templet (7.3.15) till 10.2, skatten för vägar och bryggor (7.3.16) till 9.5.
- Fiske: bara mjärden i fas 7. Fiskegården (7.4.2) tas bort helt. Nätet (7.4.3) flyttas längre bak.
- Isborren (7.4.7) blir av järn och flyttas till järnet (14.4). Till dess yxa och spjut. Ingen isbill.
- Alkemisten tas bort helt; i stället Örtköket. Krutet (7.6.4) tas bort helt. Gift och motgift, droger, rökelse och brännolja, gift och eld på vapen flyttas senare. Väderkvarnen, vattenhjulet och det kraften driver (7.6.12–7.6.14) flyttas senare (förslag: fas 14).
- Kläder: mjukt skinn tas bort. Regnkläder, stövlar och bärsele flyttas senare (de kräver mer än tal i registret). Kappa, mantel och sjal av ull (fåren 8.3.14), färgade kläder och mode, ledarens mantel, schamanens mask och halsband av fjädrar flyttas senare.

### Fiskarna
- Abborre och gädda fungerar nästan likadant. De är olika lätta att fånga under olika årstider.
- Gäddan är större och sliter mer på redskapet. I övrigt lika, och det är okej.
- Inget lekfiske med spjut på våren. Metspöet är alltid bättre än spjutet (så är det redan i koden). Inget särskilt bete för gäddan.
- Mört kan användas som bete och ökar fiskelyckan generellt.
- Fiskarna har olika näringsinnehåll: gäddan mager (mycket protein, lite fett), abborren som nu, mörten lite fetare. Då blir köttet eget för varje art, som harköttet och vargköttet.

### Garvningen
- Skinnkläderna finns redan; garvningsställningen låser bara upp läder.
- I spelet: skinnet hängs upp, kött och päls tas bort med kniven, talg mjukar upp det, och sist torkar det en stund. Sedan är lädret klart. Ingen bark och ingen garvlag.

### Örtköket
- Har en egen liten eld (som grillställningen); förslaget: varje recept tar 1 ved som bränsle.
- Tjära: förslag 3 ved och 1 ved som bränsle ger 1 tjära.
- Benlim, tvål och salva läggs till i fas 7 utan funktion; funktionen kommer senare.
- Ingen lut. Tvål: kol, vatten (kärlet töms men redskapet finns kvar) och talg.
- Talg: fettet ur djuren vid slakten.

### Lin, sländan och vävstolen
- Lin läggs till i fas 7: linfrön köps av handlaren, linet sås på fälten som ärterna, skörden är lin, som ligger ute och rötas några dygn (som torkningen).
- Sländan uppfinns först. Med en slända kan man spinna lintråd var som helst, som handarbete.
- När vävstolen uppfinns kan sländan läggas i vävstolen. Där spinns tråden fortare och vävs sedan till tyg.
- Spinnrocken (medeltida) ersätts av sländan.

### Kläderna
- Snöskor ersätter de vanliga skorna (samma plats, fötterna).
- Alla kläder skyddar lite. Systemet finns redan: varje plagg i PLAGG har skydd per kroppsdel och skadeslag (SKYDD i strid.ts), gånger materialets skydd.
- Den som är naken blir missnöjd: en ny tanke i humöret.

## Förslag som väntar på svar (samtal 2)

### Fiskarna, tal
- Abborre: 1 fiskkött. Nappar bäst på sommaren och genom isen på vintern.
- Gädda: 2 fiskkött. Nappar bäst på våren och hösten. Sliter dubbelt så mycket på redskapet per fisk.
- Eget kött per art (som harkött och vargkött): fiskkött är abborrens (nyckeln fisk behålls, så att sparade byar fungerar), plus gäddkött och mörtkött.
- Näring per kött, förslag (abborrens är dagens fiskkött):
  - Abborre: protein 2, fett 0,8, mineral 0,7, energi 0,6, vitamin 0,3 (som nu).
  - Gädda: protein 2,2, fett 0,3, mineral 0,7, energi 0,5, vitamin 0,3 (mager).
  - Mört: protein 1,8, fett 1,2, mineral 0,9, energi 0,7, vitamin 0,4 (fetare, de små benen äts).
- Grillat och torkat: förslaget är att den grillade och torkade fisken behåller artens näring, alltså en rad per art och tillagning, som köttet.
- Mört: fångas i mjärden. Mask finns redan som bete på metspöet; en mört är ett bättre bete. Förslag: 1 mört per fisketur ger t.ex. en tredjedel fler napp. Mört kan också rensas: 2 mörtar ger 1 fiskkött.

### Garvningen, tal
- 1 skinn och 1 talg vid ställningen, med kniven som verktyg (den finns kvar), sedan en torktid som torkningen av kött.

### Örter och salva
- Örter: en ny sak som samlas som svampen och mossan, bara under sommarhalvåret och mest i skogsbryn och på ängar. De går inte att äta och håller länge i lagret. En sort nu; olika arter med olika verkan kommer med läkekonsten (8.1.7).
- Salva: 2 örter och 1 talg kokas i örtköket (och 1 ved som bränsle).
- Benlim: 2 ben och vatten. Tvål: 1 kol, 1 talg och vatten ur vattensäcken.

### Ljudet
- Inget värde för hur högljutt varje plagg är nu. Behövs det senare (smygandet, metallrustning) blir det en kolumn i materialregistret, som värmen och skyddet, inte en per plagg.

### Kläderna som finns kvar i fas 7
| Plagg | Recept | Plats | Värme (rocken 0,25) | Skyddar | Annat |
|---|---|---|---|---|---|
| Byxor | 2 skinn, 1 rep | ben | 0,15 | benen | |
| Mössa | 1 skinn | huvud | 0,1 | huvudet | |
| Snöskor | 1 skinn, 2 grenar, 1 rep | fötter | 0,1 som skorna | fötterna | tar bort det mesta av snöns inbromsning |
| Barnkläder | 2 skinn, 1 rep | yttre | 0,25 som rocken | kroppen | barn till 10 år, sedan till ett yngre syskon |
| Halsband | 1 rep, 3 ben eller 3 vargtänder | smycket | 0 | inget | anseende; vargtänder är en ny sak från vargen |
| Läderrustning | 4 läder, 2 rep | yttre | 0,1 | kroppen och armarna, mycket | tung |
| Tunika | 3 lintyg | yttre | 0,1 | lite | fint, ger anseende |
| Skjorta | 2 lintyg | inre | 0,05 | lite | fint, ger anseende |

- Läder och lintyg blir två rader i materialregistret. Förslag: läder också till skor och bälte, eftersom det bara är tal.
- Vit päls: föreslås flyttas senare, eftersom den kräver att man syns sämre i snön och att skinnet beror på årstiden.
- "Sval på sommaren" kräver att man byter kläder efter årstid; det väntar.

### Stationerna (förslag: krävs först, arbetet som leder dit, recept, första användning)
- Stenhuggarplatsen: sten och flintyxa; hantverk; 4 sten, 1 virke; huggen sten (ny sak), flintredskapen görs fortare.
- Klyvplatsen: yxa och virke; hantverk och bygga; 1 virke, 2 ved; plankor ur virket.
- Härden: stenhuggarplatsen och timmerhus; bygga; 6 huggen sten; värme i huset och matlagning (samma rätter som grillen, inne). Härdens form väntar på Björn.
- Fångstbänken (nytt namn för fällbänken; andra namn: Fällmakarbänken, Snarbänken): slöjdbänken och rep; fiske och jakt; 2 virke, 2 grenar. Mjärdar och fällor görs bara där, och bänken flyttas före mjärden.
- Sländan och vävstolen: se ovan. Vävstolen: 2 virke, 4 sten som vävtyngder, 1 rep. 2 lin ger 1 tråd, 3 tråd ger 1 lintyg.
- Garvningsställningen: kniv och skinnkläder; jakt och hantverk; 4 grenar, 2 rep; läder.
- Örtköket: slöjdbänken och eld; hantverk; 2 virke, 4 sten; tjära, benlim, tvål, salva.

## Frågor till Björn
- Fiskarnas tal, mörten som bete och om mört kan ätas.
- Snöskorna: ett plagg som ersätter skorna, med skinn i receptet så att de värmer som skor?
- Läder också till skor och bälte?
- Vit päls: flytta senare?
- Örterna och salvans recept.
- Fångstbänken: namnet, och att den flyttas före mjärden.
- Härdens form (steget säger "Björn avgör").
- När får det skrivas in i designdokumentet?
