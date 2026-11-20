# Testerna för fas 12 i molnet, chatt B (20 november 2026)

Allt kört på committen **a6405d0f** (steg 12.1.39, grenen `varld`), utom striden som också körts på **141bbace** (steg 12.1.20).
Molnet har 4 kärnor; alla tider nedan är datorns tid och har inget med spelet att göra. Ett dygn är ett år i spelet,
en vecka i verkligheten en tidsålder.

Ingen kod är ändrad, inget facit sparat, inget publicerat.

**Om miljön:** projektets Playwright (1.65) letade efter en nyare webbläsare (chromium_headless_shell-1254) än den som finns
i molnet (1243). Jag lade en länk i molnmiljön (`/opt/pw-browsers/chromium_headless_shell-1254` → `…-1243`), utan att röra
koden. På MacBooken behövs inget sådant.

## 1. Utseendet (`npm run utseende`, by 3)

Körtid ca 61 min (datorns tid). Datorn i alla fall utom inzoomningen, och mobilen på dagen.

| fall | dator ljust | dator mörkt | mobil ljust | mobil mörkt |
|---|---|---|---|---|
| dag | 0 | 0 | 0 | 0 |
| skymning | 0 | 0 | – | – |
| natt | 0 | 0 | – | – |
| mitt i natten | 0 | 0 | – | – |
| istid | 0 | 0 | – | – |
| istid natt | 0 | 0 | – | – |
| natt med rövare | 0 | 0 | – | – |
| inzoomning | **kraschade** | – | – | – |

(Punkter utanför paletten; datorn har 1 028 300 ritade punkter per bild, mobilen 5 387 200.)

- **Punkter utanför paletten: 0 överallt**, mot 24 på datorn och 85 i mobilen före nattens arbete. Det är alltså färre (inga alls).
- **Bilder i fel skala: inga larm** i de fall som hann tas.
- **Inzoomningen kraschade** (fallet "inzoomning", det sista): `page.evaluate: TypeError: Cannot read properties of undefined (reading 'fire')`
  på `src/test/utseende.ts:113`. Testet läser `window.__byn.s.fire`, men `s` är ännu `undefined` när sidan just laddats
  (`__byn` i `src/main.ts:284` har en getter för `s`). Det ser ut som ett fel i tidpunkten i testskriptet (eller att spelet
  numera startar byn senare), inte i det som ritas. Skalan inzoomad är därför **inte prövad**. Inte rättat.
- Felkoden blev 1 bara på grund av kraschen.

### Det jag såg på bilderna (dagen, dator och mobil)

By 3 är liten i den här körningen: 8 invånare år 14, 6 år 28 (istiden) och 5 år 42 (natten med rövare). Den har
inga hus som jag kunde se på dagen år 14, två–tre hus senare, och **varken myr, torv, kolmila eller blästerugn** syns i någon bild: byn
har inte kommit dit (se balansen: ingen by gör det). Det nya från järnet gick därför inte att granska i bilderna.

- **Porträtten (12.1.70):** ser hela och riktiga ut, på datorn och i mobilen: ansikte, hår, skägg och fläta sitter rätt,
  ingenting förskjutet eller avklippt. Alla är bara axlar utan kläder på dagen år 14 (byn har inte gjort några).
  Namnet "Erio den y…" klipps med tre punkter, som väntat.
- **Listornas symboler (12.1.72, stationer och möbler förminskade):** stationslistorna syns inte i de här bilderna
  (utseendet tar bara kartan med förrådet, porträtten och flikarnas knappar, inga öppna paneler), så de kunde inte
  granskas. Förrådets symboler (mat, bränsle, sten, redskap, material) ritas hela och skarpa.
- **Förrådet läses dåligt mot kartan:** listan har ingen bakgrund, och på dagen (grön skog) och i synnerhet i istiden (vit
  snö) går de ljusa siffrorna och rubrikerna nästan inte att läsa. Summan för Mat (374) och Bränsle (718) står långt
  till höger, fritt ute på kartan. I mobilen är listan så liten att siffrorna inte går att läsa.
- **Mobilen** visar hela kartan utzoomad, så byn blir en liten fläck mitt på; inget ser trasigt ut, men byn syns knappt.
- **Byns namn byter** mellan bilderna (Nybygget år 14, Eriostad år 28, Maratorp år 42), och år 42 är alla fem invånare
  nya. Det är troligen byn som dött ut och grundats igen (balansen visar att det är vanligt), inte ett fel i bilden.
- Natten med rövare: ljuset kring byn och mörkret runt om ser riktigt ut. Inget ligger fel eller saknas som jag kunde se.

## 2. Balansen (`npm run balans -- 24 35`)

24 byar i 35 dygn (35 år i spelet, fem veckor i verkligheten). Körtid 56 min (datorns tid, 4 kärnor). Felkoden 2 (vaktlarm).

```
                      median   sämst    bäst
invånare                   6       1      13
utvandrade                 2       9       0
födda                      9       3      14
döda                       9      21       2
svalt ihjäl                0       3       0
frös ihjäl                 1      19       0
förblödde                  1       5       0
dog av infektion           0       0       0
hungertimmar               3      65       0
humör                   0.37    0.19    0.50
mat efter vintern        459      62    2954
ved efter vintern        200      50    1041
körtid ms             453520  861511  242224
sparfil KB              2216    2755    1814
största delen KB         685    1189     428
del av sin gräns %       134     232      84
bara information:     median   lägst   högst
invandrade                 4       0      14
amputerade                 0       0       0
eld brann %               93       0      98
utdöda och återgrundade byar: 8 (1001: 8 ggr, 8920: 10 ggr, 40596: 4 ggr, 72272: 2 ggr, 96029: 8 ggr, 111867: 6 ggr, 151462: 1 ggr, 167300: 1 ggr), under 6 invånare: 11
VAKTER LARMAR:
  by 80191: arbetstid (1 ggr), första: dag 33.9: Gera den yngre: vatten tar 0.23 minuter, slaget fylla ett kärl vid vattnet högst 0.08333333333333333 (gånger 1.5)
```

### Gränserna

| gräns | resultat | |
|---|---|---|
| Högst 10 % av byarna dör ut | 8 av 24 dog ut minst en gång (33 %); en by dog ut 10 gånger | **bryts** |
| Mittersta byn har fler invånare efter 35 dygn än vid grundandet | grundas med 5 (alla 24 byar), median 6 efter 35 dygn | håller, knappt |
| Ingen dör av svält i den mittersta byn | median 0 svalt ihjäl (sämsta byn 3) | håller |
| De nya systemen i 12.1 och 12.2 används i de flesta byarna | 0 av 24 | **bryts** |

**De nya systemen:** i `balans-stat.json` har ingen by tekniken Kolning (`kolmila`) eller Blästerugn (`blasterugn`), och
ingen by har grävt torv eller malm eller bränt något i en mila eller ugn (statistiken `torvGravd`, `malmGravd` och
`branning_…` är 0 eller saknas i alla 24 byar). Kolningen kräver Örtköket
(`ortkok`, nivå 4), som 12 av 24 byar har efter 35 dygn; Blästerugnen kräver också Kolning och Kruka och att byn haft malm.
De vanligaste teknikerna är odling 19, kniv 18, ledarskap 17, slaktbank 17, yxa 17 … ortkok 12, grill 8, bryggkar 5;
nivån ovanför har nästan ingen by nått. Byarna kommer alltså inte fram till järnet på 35 dygn, och myren och torven
används inte heller: torven och malmen grävs med spaden, och Benspaden kom bara en by på (`tek_benspade` 1 av 24), och
den byn hade inte tekniken kvar efter 35 dygn (den finns inte i byns tekniklista i slutet).

**Vaktlarmet** (by 80191, dygn 33,9): att hämta vatten tog 0,23 minuter, men fyllningen ska högst ta 5 sekunder
(0,083 min, gånger 1,5). Det hör till steg 12.1.37 (vattnet fylls på några sekunder). Ett vaktlarm är ett fel, inte balans,
men jag har inte rättat det.

Övrigt som information: frös ihjäl är 19 i den sämsta byn, och 11 av 24 byar har färre än 6 invånare. Sparfilens del av
sin gräns är 134 % i mitten och 232 % i den sämsta byn.

## 3. Striden (`npm run strid`, 16 byar i 35 dygn) på 141bbace och a6405d0f

Steg 12.1.21 (rikedomen lockar: rövarflocken blir så stor som bytet och försvaret drar). Körtid 39 min på 141bbace och
45 min på a6405d0f (datorns tid). OBS: mellan de två committerna ligger **132 commits**, däribland sammanslagningar med
fas 11 (världen, väckta byar, utlysningar m.m.), så allt som skiljer kommer inte från 12.1.21. Byarna är desamma (samma frön).

| slag | 141bbace (före) | a6405d0f (nu) |
|---|---|---|
| alla strider | 8 029 | 7 850 |
| **Rövare vid byn** | 75 i 4 byar | 20 i 4 byar |
| – på byns sida / motståndare (median) | 2 / **1** | 1 / **11** |
| – andel av byns vuxna med (median) | 67 % | 25 % |
| – byn vann / förlorade | **56 / 19** | **0 / 20** |
| – längd median / längst | 0 s / 58 s | 13 s / 32 s |
| – byns döda / rövarnas döda | 1 / 0 | 0 / 0 |
| – byns skadade / flydde | 42 / 29 | 29 / 29 |
| **Rövare i byn** | 17 i 4 byar | 11 i 3 byar |
| – byn vann / förlorade | 9 / 8 | 0 / 11 |
| – andel av byns vuxna med | 33 % | 100 % |
| Vargar när vargarna anföll | 380 i 6 byar, byn vann 0 | 1 029 i 13 byar, byn vann 1 |
| Vargar mot rövarna | 1 911 i 2 byar | 513 i 1 by |
| Anfölls av en björn | 40 i 16 byar, byn vann 5, bybor med | 219 i 12 byar, vann 183, **median 0 bybor** |
| Anfölls av ett vildsvin | 166 i 15 byar, vildsvin döda 53 | 138 i 14 byar, vildsvin döda 28 |
| Vargar på vargjakt | 18 i 9 byar, vann 11 | 16 i 6 byar, vann 8 |
| Efter ett gräl | 1 049 | 1 004 |
| I brottningen | 4 316 | 4 843 |
| På lek | 56 | 53 |
| Striden om ledarskapet | 1 | 0 |
| Vakter | inga fel | **arbetstid i by 80191** (samma vattenlarm som i balansen) |

(Hela utskrifterna: se nedan i bilagan.)

Det som skiljer:
- **Rövarna vid byn kommer nu i stora flockar** (median 11 mot 1 förut) och **byn vinner aldrig** (0 av 20, förut 56 av 75).
  Det är precis vad 12.1.21 ska göra: flocken växer med bytet och försvaret. Striderna blir färre (20 mot 75), längre
  (13 s mot 0 s i mitten) och en mindre del av byns vuxna går med (25 % mot 67 %). Ingen dog på någon sida.
  Om det är för hårt, när byn alltid förlorar, är en balansfråga; jag har inte balanserat något.
- **Rövare i byn:** byn förlorar alla 11 (förut 9 av 17 vunna), och alla vuxna är med.
- **Björnen** anfaller nu mest rövarna och inte byn: 219 strider där "byns sida" har 7 (median) men 0 bybor och vapnen
  är knivar och spjut i hundratal, som i "vargar mot rövarna". Förut var björnen mot byborna i alla 16 byar. Det ser ut
  som att björnstriderna mot rövarläger räknas under "anfölls av en björn" i stället för ett eget slag; värt att titta på
  om tabellen ska skilja dem åt.
- **Vargarna anfaller fler byar** (13 mot 6 byar, 1 029 mot 380 strider), nästan alltid över på 0 s och oftast med den
  anfallne liggande (låg nere 752). Byn vinner nästan aldrig, som förut.
- Det vanliga (brottning, gräl, lek, vildsvin) är ungefär som förut.

## 4. Teknikerna (`npm run teknik`, byarna 1–6 i 90 dygn)

90 dygn (90 år i spelet, knappt 13 veckor i verkligheten). Körtid 67 min (datorns tid).

**Järnets tekniker kommer ingen by på, och de blir aldrig ens öppna:**

| teknik | nivå | påkommen | aldrig öppen |
|---|---|---|---|
| Kolning (kolmila) | 4 | 0/6 | 6 |
| Blästerugn | 5 | 0/6 | 6 |
| Smide | 5 | 0/6 | 6 |
| Vapensmide | 6 | 0/6 | 6 |

Varför: Kolningen kräver Örtköket (alla 6 byar har det, efter 15,5 dygn i mitten) **och en Benspade i byn** (spaden är
kolningens verktyg i receptet). Benspaden (nivå 3, kräver slaktbänk och rep, material ben, rep och grenar) kommer ingen
by på: den blir aldrig öppen i 5 byar och står öppen utan att komma på i 1. Blästerugnen kräver Kolning, Smedjan kräver
Kolning, och Vapensmide kräver Smedjan. **Hela järnkedjan stannar alltså vid Benspaden.** Spaden behövs också för att gräva
torv och malm, vilket förklarar att balansen inte har en enda torv eller malm. Jag har inte undersökt varför Benspaden
aldrig blir öppen (troligen att byn sällan har ben, rep och grenar samtidigt); det är en sak för huvudprogrammeraren.

Övrigt: 17 tekniker har ✗ (medianen längre än målet för nivån), bland dem Korg, Träspjut, Stenhuggarplats, Klyvplats,
Örtkök, Leksak, Timmerhus, Slöjdbänk, Grillställning och Lag. Byarna är små efter 90 dygn: 2, 3, 7, 2, 7 och 7 invånare,
23–33 tekniker, och längst utan något nytt 13–42 dygn.

## Sammanfattning

- **Utseendet:** 0 punkter utanför paletten (förut 24 på datorn och 85 i mobilen), ingen bild i fel skala. Fallet
  inzoomning kraschade i testskriptet (`window.__byn.s` är `undefined`), så skalan inzoomad är inte prövad. Porträtten
  ser hela ut. Stationslistorna och järnets saker syns inte i bilderna och kunde inte granskas; förrådslistan är svår att
  läsa mot kartan, särskilt på snön.
- **Balansen:** två gränser håller (mittersta byn 6 mot 5 vid grundandet; ingen svält i mitten), två bryts: 8 av 24 byar
  (33 %) dog ut, och de nya systemen i 12.1 och 12.2 används i 0 av 24 byar. Ett vaktlarm: vattnet tog 0,23 min mot
  högst 5 s (steg 12.1.37).
- **Striden:** med 12.1.21 kommer rövarna till byn i flockar på 11 (förut 1) och byn vinner 0 av 20 (förut 56 av 75).
  Björnstriderna gäller nu mest rövarna. Samma vattenlarm som i balansen.
- **Teknikerna:** järnets fyra tekniker blir aldrig öppna på 90 dygn, eftersom ingen by kommer på Benspaden, som Kolningen
  (och torven och malmen) kräver.

## Bilaga: striden i sin helhet

### 141bbace
```
16 byar, 35 dygn (35 år i spelet), 2346 s datorns tid; 8029 strider

I BROTTNINGEN: 4316 strider i 16 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 25 %
  längd: median 72 s, kortast 2 s, längst 480 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 2248, förlorade 1651, oavgjort 417
  när byn var minst lika många (med dem som kom till) vann den 2248 av 4316; när den var färre 0 av 0
  byns vapen när striden börjar: hand 4316
  byns sida: döda 0, skadade 4017 (40121 skador), gav upp 1633, flydde 419, låg nere 0; slag 167171, träffar 51884 (31 %)
  motståndarna: döda 0, skadade 4157 (42553 skador), gav upp 2236, flydde 413, låg nere 0; slag 168449, träffar 49934 (30 %)
  händelser per strid: miss 24.8, traff 19.2, knuff 14.2, omkull 6.3, upp 6.2, duck 6.1, tog 4.4, parera 2.8, later 1.6, borjar 1.0, slut 1.0, ger 0.9

VARGAR MOT RÖVARNA: 1911 strider i 2 av 16 byar
  på byns sida (median) 14, varav bybor 0, som kom till under striden 0 i allt; motståndare 4
  andel av byns vuxna som var med (median) 0 %
  längd: median 1 s, kortast 0 s, längst 28 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 1911, förlorade 0, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 1911 av 1911; när den var färre 0 av 0
  byns vapen när striden börjar: kniv 14674, flintspjut 8836, yxa 2239, fiskespjut 846, hand 91
  byns sida: döda 0, skadade 9 (34 skador), gav upp 0, flydde 3, låg nere 1340; slag 62, träffar 33 (53 %)
  motståndarna: döda 1, skadade 27 (33 skador), gav upp 0, flydde 5221, låg nere 2377; slag 53, träffar 34 (64 %)
  händelser per strid: flykt 2.7, borta 2.7, nere 1.9, borjar 1.0, slut 1.0, backar 0.7, ledareFaller 0.3, halkar 0.1, traff 0.0, tappar 0.0, miss 0.0, upp 0.0

EFTER ETT GRÄL: 1049 strider i 16 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 20 %
  längd: median 8 s, kortast 0 s, längst 58 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 362, förlorade 300, oavgjort 387
  när byn var minst lika många (med dem som kom till) vann den 362 av 1049; när den var färre 0 av 0
  byns vapen när striden börjar: hand 1049
  byns sida: döda 0, skadade 703 (1645 skador), gav upp 687, flydde 0, låg nere 0; slag 4836, träffar 1895 (39 %)
  motståndarna: döda 0, skadade 770 (1895 skador), gav upp 749, flydde 0, låg nere 0; slag 4858, träffar 1645 (34 %)
  händelser per strid: traff 3.4, miss 2.5, knuff 1.6, borjar 1.0, slut 1.0, skild 0.7, omkull 0.7, duck 0.7, upp 0.5, ger 0.5, parera 0.4, later 0.2

VARGAR NÄR VARGARNA ANFÖLL: 380 strider i 6 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 2
  andel av byns vuxna som var med (median) 100 %
  längd: median 0 s, kortast 0 s, längst 26 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 0, förlorade 380, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 0 av 0; när den var färre 0 av 380
  byns vapen när striden börjar: hand 313, yxa 50, flintspjut 17
  byns sida: döda 0, skadade 33 (64 skador), gav upp 0, flydde 277, låg nere 103; slag 34, träffar 9 (26 %)
  motståndarna: döda 0, skadade 9 (9 skador), gav upp 0, flydde 0, låg nere 17; slag 103, träffar 64 (62 %)
  händelser per strid: borjar 1.0, slut 1.0, borta 0.7, avstar 0.7, nere 0.3, traff 0.2, miss 0.1, flykt 0.1, ledareFaller 0.0, leder 0.0, knuff 0.0, tappar 0.0

ANFÖLLS AV ETT VILDSVIN: 166 strider i 15 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 20 %
  längd: median 18 s, kortast 0 s, längst 43 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 78, förlorade 85, oavgjort 3
  när byn var minst lika många (med dem som kom till) vann den 78 av 166; när den var färre 0 av 0
  byns vapen när striden börjar: yxa 93, hand 20, flintspjut 20, fiskespjut 17, kniv 16
  byns sida: döda 1, skadade 106 (246 skador), gav upp 0, flydde 72, låg nere 15; slag 557, träffar 319 (57 %)
  motståndarna: döda 53, skadade 119 (319 skador), gav upp 0, flydde 24, låg nere 4; slag 529, träffar 246 (47 %)
  händelser per strid: traff 3.4, miss 1.8, borjar 1.0, slut 1.0, flykt 0.6, borta 0.5, knuff 0.5, nere 0.4, duck 0.4, parera 0.3, dod 0.3, omkull 0.2

RÖVARE VID BYN: 75 strider i 4 av 16 byar
  på byns sida (median) 2, varav bybor 2, som kom till under striden 53 i allt; motståndare 1
  andel av byns vuxna som var med (median) 67 %
  längd: median 0 s, kortast 0 s, längst 58 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 56, förlorade 19, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 56 av 63; när den var färre 0 av 12
  byns vapen när striden börjar: yxa 86, flintspjut 56, hand 8, kniv 4, fiskespjut 2
  byns sida: döda 1, skadade 42 (82 skador), gav upp 0, flydde 29, låg nere 16; slag 100, träffar 39 (39 %)
  motståndarna: döda 0, skadade 22 (39 skador), gav upp 0, flydde 11, låg nere 57; slag 148, träffar 82 (55 %)
  händelser per strid: traff 1.6, borjar 1.0, slut 1.0, nere 1.0, miss 0.8, kommer 0.7, borta 0.5, flykt 0.5, knuff 0.4, parera 0.3, tappar 0.2, backar 0.2

PÅ LEK: 56 strider i 14 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 25 %
  längd: median 18 s, kortast 3 s, längst 49 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 25, förlorade 31, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 25 av 56; när den var färre 0 av 0
  byns vapen när striden börjar: hand 56
  byns sida: döda 0, skadade 54 (199 skador), gav upp 31, flydde 0, låg nere 0; slag 484, träffar 167 (35 %)
  motståndarna: döda 0, skadade 55 (167 skador), gav upp 25, flydde 0, låg nere 0; slag 488, träffar 199 (41 %)
  händelser per strid: traff 6.5, knuff 3.7, miss 3.6, omkull 1.4, upp 1.4, duck 1.2, borjar 1.0, ger 1.0, slut 1.0, later 0.9, parera 0.9

ANFÖLLS AV EN BJÖRN: 40 strider i 16 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 2 i allt; motståndare 1
  andel av byns vuxna som var med (median) 25 %
  längd: median 11 s, kortast 2 s, längst 35 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 5, förlorade 35, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 5 av 40; när den var färre 0 av 0
  byns vapen när striden börjar: yxa 21, hand 10, fiskespjut 7, kniv 3, flintspjut 1
  byns sida: döda 1, skadade 25 (30 skador), gav upp 0, flydde 36, låg nere 0; slag 64, träffar 25 (39 %)
  motståndarna: döda 0, skadade 16 (25 skador), gav upp 0, flydde 2, låg nere 3; slag 72, träffar 30 (42 %)
  händelser per strid: traff 1.4, miss 1.4, borjar 1.0, slut 1.0, borta 0.9, flykt 0.6, avstar 0.3, knuff 0.2, parera 0.2, duck 0.1, omkull 0.1, nere 0.1

VARGAR PÅ VARGJAKT: 18 strider i 9 av 16 byar
  på byns sida (median) 3, varav bybor 3, som kom till under striden 0 i allt; motståndare 2
  andel av byns vuxna som var med (median) 43 %
  längd: median 17 s, kortast 2 s, längst 34 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 11, förlorade 7, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 11 av 13; när den var färre 0 av 5
  byns vapen när striden börjar: yxa 28, flintspjut 12, fiskespjut 6, hand 3, kniv 1
  byns sida: döda 0, skadade 24 (75 skador), gav upp 0, flydde 12, låg nere 4; slag 90, träffar 51 (57 %)
  motståndarna: döda 6, skadade 21 (51 skador), gav upp 0, flydde 13, låg nere 1; slag 114, träffar 75 (66 %)
  händelser per strid: traff 7.0, miss 2.8, flykt 1.7, borta 1.3, borjar 1.0, slut 1.0, nere 0.6, knuff 0.6, omkull 0.5, backar 0.4, duck 0.4, upp 0.4

RÖVARE I BYN: 17 strider i 4 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 15 i allt; motståndare 1
  andel av byns vuxna som var med (median) 33 %
  längd: median 8 s, kortast 0 s, längst 22 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 9, förlorade 8, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 9 av 11; när den var färre 0 av 6
  byns vapen när striden börjar: yxa 12, flintspjut 9, hand 2, fiskespjut 2, kniv 1
  byns sida: döda 0, skadade 10 (15 skador), gav upp 0, flydde 9, låg nere 1; slag 18, träffar 3 (17 %)
  motståndarna: döda 0, skadade 3 (3 skador), gav upp 0, flydde 2, låg nere 7; slag 30, träffar 15 (50 %)
  händelser per strid: traff 1.1, borjar 1.0, slut 1.0, kommer 0.9, miss 0.8, flykt 0.6, borta 0.6, nere 0.5, knuff 0.4, parera 0.3, tappar 0.2, byter 0.2

STRIDEN OM LEDARSKAPET: 1 strider i 1 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 17 %
  längd: median 27 s, kortast 27 s, längst 27 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 0, förlorade 1, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 0 av 1; när den var färre 0 av 0
  byns vapen när striden börjar: yxa 1
  byns sida: döda 0, skadade 1 (2 skador), gav upp 0, flydde 1, låg nere 0; slag 1, träffar 0 (0 %)
  motståndarna: döda 0, skadade 0 (0 skador), gav upp 0, flydde 0, låg nere 0; slag 3, träffar 2 (67 %)
  händelser per strid: traff 2.0, borjar 1.0, halkar 1.0, upp 1.0, miss 1.0, knuff 1.0, flykt 1.0, borta 1.0, slut 1.0

Vakter: inga fel.
```

### a6405d0f
```
16 byar, 35 dygn (35 år i spelet), 2672 s datorns tid; 7850 strider

I BROTTNINGEN: 4843 strider i 16 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 25 %
  längd: median 67 s, kortast 2 s, längst 480 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 2594, förlorade 1780, oavgjort 469
  när byn var minst lika många (med dem som kom till) vann den 2594 av 4843; när den var färre 0 av 0
  byns vapen när striden börjar: hand 4843
  byns sida: döda 0, skadade 4335 (40064 skador), gav upp 1563, flydde 647, låg nere 0; slag 181026, träffar 57839 (32 %)
  motståndarna: döda 0, skadade 4515 (47057 skador), gav upp 2462, flydde 562, låg nere 0; slag 179789, träffar 51857 (29 %)
  händelser per strid: miss 23.8, traff 18.0, knuff 13.5, omkull 6.2, upp 6.2, duck 5.7, tog 4.7, parera 2.7, later 1.5, borjar 1.0, slut 1.0, ger 0.8

VARGAR NÄR VARGARNA ANFÖLL: 1029 strider i 13 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 4
  andel av byns vuxna som var med (median) 100 %
  längd: median 0 s, kortast 0 s, längst 23 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 1, förlorade 1028, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 0 av 0; när den var färre 1 av 1029
  byns vapen när striden börjar: hand 932, yxa 63, kniv 29, fiskespjut 4, flintspjut 1
  byns sida: döda 0, skadade 79 (140 skador), gav upp 0, flydde 276, låg nere 752; slag 76, träffar 23 (30 %)
  motståndarna: döda 0, skadade 22 (23 skador), gav upp 0, flydde 0, låg nere 2; slag 200, träffar 140 (70 %)
  händelser per strid: borjar 1.0, slut 1.0, nere 0.7, borta 0.3, avstar 0.2, traff 0.2, flykt 0.1, miss 0.1, knuff 0.0, duck 0.0, omkull 0.0, tappar 0.0

EFTER ETT GRÄL: 1004 strider i 16 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 20 %
  längd: median 9 s, kortast 0 s, längst 58 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 379, förlorade 284, oavgjort 341
  när byn var minst lika många (med dem som kom till) vann den 379 av 1004; när den var färre 0 av 0
  byns vapen när striden börjar: hand 1004
  byns sida: döda 0, skadade 705 (1753 skador), gav upp 625, flydde 0, låg nere 0; slag 5184, träffar 1962 (38 %)
  motståndarna: döda 0, skadade 755 (1962 skador), gav upp 720, flydde 0, låg nere 0; slag 5145, träffar 1753 (34 %)
  händelser per strid: traff 3.7, miss 2.8, knuff 1.8, borjar 1.0, slut 1.0, omkull 0.9, duck 0.8, skild 0.7, upp 0.6, ger 0.5, parera 0.4, later 0.3

VARGAR MOT RÖVARNA: 513 strider i 1 av 16 byar
  på byns sida (median) 10, varav bybor 0, som kom till under striden 0 i allt; motståndare 6
  andel av byns vuxna som var med (median) 0 %
  längd: median 3 s, kortast 1 s, längst 16 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 513, förlorade 0, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 462 av 462; när den var färre 51 av 51
  byns vapen när striden börjar: kniv 1853, fiskespjut 1407, yxa 1004, flintspjut 438, hand 5
  byns sida: döda 0, skadade 4 (6 skador), gav upp 0, flydde 0, låg nere 0; slag 21, träffar 14 (67 %)
  motståndarna: döda 0, skadade 8 (14 skador), gav upp 0, flydde 1990, låg nere 1088; slag 9, träffar 6 (67 %)
  händelser per strid: flykt 3.9, borta 3.9, nere 2.1, borjar 1.0, slut 1.0, halkar 0.1, backar 0.0, traff 0.0, upp 0.0, tappar 0.0, miss 0.0, plockar 0.0

ANFÖLLS AV EN BJÖRN: 219 strider i 12 av 16 byar
  på byns sida (median) 7, varav bybor 0, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 0 %
  längd: median 0 s, kortast 0 s, längst 46 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 183, förlorade 36, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 183 av 219; när den var färre 0 av 0
  byns vapen när striden börjar: kniv 820, yxa 463, flintspjut 447, fiskespjut 274, hand 106
  byns sida: döda 0, skadade 29 (32 skador), gav upp 0, flydde 33, låg nere 3; slag 114, träffar 44 (39 %)
  motståndarna: döda 3, skadade 28 (44 skador), gav upp 0, flydde 3, låg nere 177; slag 98, träffar 32 (33 %)
  händelser per strid: borjar 1.0, slut 1.0, nere 0.8, traff 0.3, miss 0.3, borta 0.2, flykt 0.1, knuff 0.1, parera 0.1, duck 0.1, avstar 0.0, tappar 0.0

ANFÖLLS AV ETT VILDSVIN: 138 strider i 14 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 20 %
  längd: median 20 s, kortast 0 s, längst 49 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 65, förlorade 73, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 65 av 138; när den var färre 0 av 0
  byns vapen när striden börjar: yxa 54, fiskespjut 37, kniv 23, hand 14, flintspjut 10
  byns sida: döda 0, skadade 90 (195 skador), gav upp 0, flydde 58, låg nere 15; slag 501, träffar 256 (51 %)
  motståndarna: döda 28, skadade 107 (256 skador), gav upp 0, flydde 35, låg nere 2; slag 472, träffar 195 (41 %)
  händelser per strid: traff 3.3, miss 2.1, borjar 1.0, slut 1.0, flykt 0.7, borta 0.6, knuff 0.6, duck 0.4, parera 0.4, nere 0.3, omkull 0.2, dod 0.2

PÅ LEK: 53 strider i 13 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 25 %
  längd: median 17 s, kortast 5 s, längst 61 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 22, förlorade 31, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 22 av 53; när den var färre 0 av 0
  byns vapen när striden börjar: hand 53
  byns sida: döda 0, skadade 52 (177 skador), gav upp 31, flydde 0, låg nere 0; slag 444, träffar 145 (33 %)
  motståndarna: döda 0, skadade 49 (145 skador), gav upp 22, flydde 0, låg nere 0; slag 459, träffar 177 (39 %)
  händelser per strid: traff 6.1, miss 4.4, knuff 3.2, omkull 1.6, upp 1.6, borjar 1.0, ger 1.0, slut 1.0, duck 0.9, later 0.8, parera 0.8

RÖVARE VID BYN: 20 strider i 4 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 17 i allt; motståndare 11
  andel av byns vuxna som var med (median) 25 %
  längd: median 13 s, kortast 1 s, längst 32 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 0, förlorade 20, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 0 av 2; när den var färre 0 av 18
  byns vapen när striden börjar: yxa 13, fiskespjut 8, hand 6, kniv 5, flintspjut 1
  byns sida: döda 0, skadade 29 (50 skador), gav upp 0, flydde 29, låg nere 4; slag 45, träffar 19 (42 %)
  motståndarna: döda 0, skadade 14 (19 skador), gav upp 0, flydde 3, låg nere 0; slag 83, träffar 50 (60 %)
  händelser per strid: traff 3.5, borta 1.6, flykt 1.4, miss 1.4, borjar 1.0, slut 1.0, kommer 0.8, knuff 0.6, halkar 0.6, upp 0.6, parera 0.6, tappar 0.5

VARGAR PÅ VARGJAKT: 16 strider i 6 av 16 byar
  på byns sida (median) 3, varav bybor 3, som kom till under striden 0 i allt; motståndare 1
  andel av byns vuxna som var med (median) 30 %
  längd: median 21 s, kortast 0 s, längst 45 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 8, förlorade 8, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 8 av 14; när den var färre 0 av 2
  byns vapen när striden börjar: yxa 20, hand 10, fiskespjut 4, kniv 3, flintspjut 3
  byns sida: döda 0, skadade 27 (73 skador), gav upp 0, flydde 15, låg nere 3; slag 119, träffar 45 (38 %)
  motståndarna: döda 1, skadade 17 (45 skador), gav upp 0, flydde 9, låg nere 1; slag 118, träffar 73 (62 %)
  händelser per strid: traff 7.4, miss 3.9, knuff 1.8, flykt 1.7, borta 1.5, borjar 1.0, slut 1.0, parera 0.6, duck 0.6, omkull 0.5, backar 0.4, upp 0.4

RÖVARE I BYN: 11 strider i 3 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 2 i allt; motståndare 1
  andel av byns vuxna som var med (median) 100 %
  längd: median 12 s, kortast 0 s, längst 22 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 0, förlorade 11, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 0 av 7; när den var färre 0 av 4
  byns vapen när striden börjar: fiskespjut 6, hand 3, kniv 2, yxa 2
  byns sida: döda 0, skadade 9 (12 skador), gav upp 0, flydde 6, låg nere 7; slag 20, träffar 7 (35 %)
  motståndarna: döda 0, skadade 3 (7 skador), gav upp 0, flydde 0, låg nere 0; slag 33, träffar 12 (36 %)
  händelser per strid: miss 1.8, traff 1.7, borjar 1.0, slut 1.0, nere 0.6, flykt 0.5, borta 0.5, parera 0.5, omkull 0.3, tappar 0.3, duck 0.3, kommer 0.2

VARGAR UTANFÖR DÖRREN: 4 strider i 1 av 16 byar
  på byns sida (median) 1, varav bybor 1, som kom till under striden 0 i allt; motståndare 3
  andel av byns vuxna som var med (median) 100 %
  längd: median 0 s, kortast 0 s, längst 0 s (sekunder i verkligheten, som striden spelas)
  byns sida vann 0, förlorade 4, oavgjort 0
  när byn var minst lika många (med dem som kom till) vann den 0 av 0; när den var färre 0 av 4
  byns vapen när striden börjar: hand 4
  byns sida: döda 0, skadade 0 (0 skador), gav upp 0, flydde 0, låg nere 4; slag 0, träffar 0 (0 %)
  motståndarna: döda 0, skadade 0 (0 skador), gav upp 0, flydde 0, låg nere 0; slag 0, träffar 0 (0 %)
  händelser per strid: borjar 1.0, nere 1.0, slut 1.0

VAKTER LARMAR:
  by 80191: arbetstid (1 ggr), första: dag 33.9: Gera den yngre: vatten tar 0.23 minuter, slaget fylla ett kärl vid vattnet högst 0.08333333333333333 (gånger 1.5)
```
