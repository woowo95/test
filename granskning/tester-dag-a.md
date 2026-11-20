# Långa testerna för fas 12, dagkörning A

Commit: `a6405d0f` (grenen `varld` som den stod vid start, steg 12.1.39). Körd i molnet på 4 kärnor, ett test i taget. Ingen kod ändrad, inget facit sparat.
Tiderna nedan är datorns tid (klocktid i molnet) och har inget med spelets tid att göra.

## 1. `npm run samma`: 995 s, rött (väntat)

```
ANNAN UTVECKLING:
by 42, 30 dygn: 120ae6e749f4 → c4cefd04ca2c
by 1, 30 dygn: 9462afb43b77 → fa075bfd7e08
by 3, 2 dygn: a967bde27fbd → 3d5f558ec28b
by 139, 30 dygn: 525b0816e659 → beec2dd9838e
by 121, 14 dygn: 4b34170d59f5 → 5e1f74636dc5
```
Alla fem byarna har annan utveckling. Det väntas, eftersom 12.1-stegen ändrat spelet.

## 2. `npm run koll`: stoppad efter 7200 s, inget resultat

Koll skriver ut först när allt är klart. Efter 2 timmar stoppades den av molnets gräns för en bakgrundskörning. Då hade den inte skrivit något efter npm:s rubrik. Spelets hängvakt (10 minuter utan puls) hade inte larmat. Den var alltså troligen bara långsam på 4 kärnor, men det går inte att säga säkert.
I stället kördes delarna var för sig: typkontrollen (`npm run check`: 19 s, grön, inga typfel), alla scenarier (avsnitt 5) och `npm test` (avsnitt 6).

## 3. `npm run likhet`: 1125 s, grönt

```
by   3: exakt lika i 720 timmar (7 invånare, med en resa)
by   5: exakt lika i 720 timmar (12 invånare)
by   7: exakt lika i 720 timmar (7 invånare)
by   9: exakt lika i 720 timmar (10 invånare)
4 av 4 byar exakt lika i spelet och ikappräkningen under 720 timmar (30 dygn, 30 år i spelet).
```

## 4. `npm run snabbkoll`: inte körd

Det stora testet täcker den. I stället kördes scenarierna och `npm test` för sig, och de täcker allt snabbkoll gör (scenarierna, och vakterna i testbyarna).

## 5. `npm run scenario` (alla scenarier, delen av koll): 4670 s, rött

44 scenarier misslyckades. Alla 44 kördes sedan ensamma med `npm run scenario -- namn`. **Alla 44 är röda också ensamma**, med samma kontroller som misslyckades. Två scenarier kraschar: slatter och reslikhet.

Två av de 18 kända röda är nu gröna: ikoner och symboler.
Kända och fortfarande röda (16): kista, handlare, slaktbank, virke, tidsord, borta, varldtillstand, varldslag, forhistoria, kallelse, gomma, handelsresa, vagmote, turne, talt, kyrkanutlyser.

**Nya röda (28):** ingen-yxa, yxa, knapphet, stubbar, slump, stenring, fullaforrad, omtanke, fritid, varm, vard, gorjustnu, rotter, samlarrunda, eldbrand, gangar, lager, verkstad, ui-ren, vakt, slatter, krubba, vattenho, samlaresa, reslikhet, fangar, vacktspar, rovarmotet.

### Trolig orsak där den syns direkt i utskriften

- stenring, eldbrand: gäller tändmaterialet från steg 12.1.39. Stenring: den som hämtar tändmaterial fortsätter inte på en plats utan bär. Eldbrand: det gick åt −2 grenar och −2 hö.
- slaktbank, virke, verkstad, krubba, vattenho, gangar: inget byggs. Ingen slaktbänk, inget virke klyvs, ingen slöjdbänk, ingen krubba och ingen ho byggs, och gangar har "0 hus på 12 dygn". Det är troligen en gemensam orsak.
- slatter (krasch, `src/test/scenarier/fas9.ts:2028:60`): inget djur står i fähuset, så `d0` är undefined. Samma sak som i krubba (0 av 3 djur inne).
- reslikhet (krasch, `src/test/scenarier/fas11.ts:2441:90`): sällskapet med resans id finns inte i `s.varld.sallskap`.
- rotter, knapphet: ingen samlar alls (0 rötter, 0 bär, 0.000 plockat).
- tidsord: `varldskarta.ts` innehåller texten "dygn till fots".
- kyrkanutlyser: byn i scenariot har ingen tro.
- ui-ren: Styre-fliken (steg 12.1.26) har inte de 3 kolumner kontrollen väntar sig.
- Övriga: orsaken syns inte direkt.

### De röda raderna ordagrant (körningen med alla; ensamma gav samma kontroller)

```
## FEL  ingen-yxa (380 s)
     ✗ ingen dog av kyla
## FEL  yxa (109 s)
     ✗ gräs där träden stod utanför stråken, minst hälften (1 av 2)
## FEL  knapphet (196 s)
     ✗ nära byn plockas minst en fjärdedel så mycket som långt bort (0.000 mot 0.000)
## FEL  stubbar (78 s)
     ✗ byn gräver bort stubbar på 10 dygn (0)
## FEL  slump (15 s)
     ✗ var en person går väljs med personens egen slumpföljd (0 tal ur byns, för promenad, strand, falla)
## FEL  stenring (8 s)
     ✗ den som hämtar tändmaterial (vald) fortsätter på en plats utan bär (nej) och slutar när det räcker (ja)
## FEL  kista (5 s)
     ✗ det egna som ingen använder ligger i kistan (2 av 3), inte byns spjut, och inget av det syns i lagret
## FEL  fullaforrad (11 s)
     ✗ i den fulla byn fyller man sällan på maten eller veden (0 uppgifter av 133), i byn vid bufferten fylls förråden (0)
     ✗ en by med fulla förråd arbetar vidare mot nästa teknik (Korg: 0 uppgifter i arbetet där den kan komma)
     ✗ de vuxna i den fulla byn får fritid när inget finns kvar att göra (0 gånger; 0 i byn vid bufferten när den fyllt på)
## FEL  omtanke (14 s)
     ✗ en by med Sammanhållning lägger fler timmar på byns ved än med Självförsörjning (0.3 mot 0.3 timmar)
## FEL  handlare (12 s)
     ✗ byn köper flintan projekten saknar (0 av 1) och säljer sedan sitt överflöd för silver i samma besök (42 silver, handlaren fick 2 korn, 22 rolleka, 1 torrfisk, 1 rep)
## FEL  fritid (132 s)
     ✗ man vilar ut när det är mörkt (22 % av natten) och lite på dagen (16 %)
## FEL  varm (88 s)
     ✗ den som är extremt varm blir tröttare och tänker på det
## FEL  vard (217 s)
     ✗ på tolv dygn i en by: 0.0 mossa, 37 skador, 17 vårdtillfällen (2 av andra), 0 förband, 4 infektioner, 0 kallbrand, 0 burna hem
## FEL  gorjustnu (168 s)
     ✗ det man bär visas vid tiden som visas och växer under turen (steg 6.1.1): 4 av 1591 slag visar en annan börda i slutet, 22 slag där bördan växte
## FEL  rotter (127 s)
     ✗ i istiden mest rötter (0 rötter mot 0 bär)
     ✗ i istiden växer inga bär, så allt som samlas är rötter (0.0000 bär)
## FEL  samlarrunda (18 s)
     ✗ samlarna når längre bort än lägerzonen (41 % av 205 rundor kom mer än 3 rutor från lägret)
## FEL  slaktbank (17 s)
     ✗ slaktbänken byggs av 3 virke på 48 timmar av den som kan göra en kniv ()
     ✗ den första slaktbänken står i loggen
     ✗ bänken står i byns utkant (0.0 rutor från lägret och husen) och tar 3 rutor, där inget annat får ligga
     ✗ en kniv hör till bänken, är byns och ligger kvar där (en kniv ur förrådet flyttades dit när bänken blev klar)
     ✗ den som slaktar utan egen kniv tar bänkens, och den läggs tillbaka vid bänken
     ✗ viltet slaktas och fisken rensas vid bänken
     ✗ en bänk med vatten framför (ingen plats hittades) används inte och flyttas dit man står på land
     ✗ en fälld varg slaktas till 0 vargkött, 0 vargskinn och 0 ben (benen är samma sak som kaninens; steg 3.7.14)
     ✗ jaktfärdigheten avgör köttet: 0.00 kött av tre kaniner för den ovane, 0.00 för den vane
## FEL  eldbrand (0 s)
     ✗ 1 gren gick åt och inget hö eller flinta (-2 gren, -2 hö, 0 flinta)
## FEL  gangar (82 s)
     ✗ minst 2 rutor mellan två hus (minst Infinity bland 0 hus på 12 dygn)
## FEL  virke (16 s)
     ✗ någon klyver virke med yxan (0 gånger sett) och slaktbänken byggs av virket på 48 timmar
## FEL  lager (21 s)
     ✗ folk bär hem saker, aldrig mer än de orkar (5241 steg på väg hem, 59 med full börda, högst 115 % av förmågan)
## FEL  verkstad (12 s)
     ✗ slöjdbänken byggs i verkstaden på 29 timmar
     ✗ verkstaden är en verkstad efter det som står där (), sovsalen ett sovrum (Sovrum, Verkstad)
     ✗ en tom sovsal där en station står blir en verkstad och stationen står kvar (Samlingshuset)
     ✗ en slöjdbänk som står ute bärs in i verkstaden inom två timmar
## FEL  ui-ren (75 s)
     ✗ Styre-fliken får plats (steg 12.1.26): ledarlistan har 3 kolumner och raderna inga delar; rutorna i en kolumn på en smal skärm: ja
## FEL  vakt (18 s)
     ✗ Argorm väljer sedan att hålla vakt (lyssna)
## FEL  tidsord (1 s)
     ✗ ingen sträng i gränssnittets kod säger dygn, säsong eller klicka: varldskarta.ts:  dygn till fots
## FEL  slatter
TypeError: Cannot set properties of undefined (setting 'hunger')
    at Object.kor (/home/user/test/src/test/scenarier/fas9.ts:2028:60)
    at korHar (/home/user/test/src/test/scenario.ts:51:55)
    at <anonymous> (/home/user/test/src/test/scenario.ts:67:78)
## FEL  krubba (0 s)
     ✗ krubban ställs i fähuset, och rummet får taggen Fähus (nej)
     ✗ i istiden står djuren i rummet med krubban (0 av 3)
     ✗ med en krubba i fähuset vill byn inte ha fler
## FEL  vattenho (7 s)
     ✗ hon byggdes i hagen (false) och bristen är borta (1)
     ✗ regnet fyller lika mycket med korta som långa slag (0.00 och 0.00)
     ✗ i en månad av spelets väder fylls hon högst till 0 (av 20)
## FEL  borta (10 s)
     ✗ alla kommer hem och är i byn igen
## FEL  varldtillstand (52 s)
     ✗ samma frö ger samma värld: marken och platserna
## FEL  varldslag (3 s)
     ✗ världen rör inte byns slump
## FEL  forhistoria (17 s)
     ✗ vid grundandet finns 17 byar och 78 ruiner, och krönikan har 236 händelser (grundad 16, delad 0, gått under 3)
## FEL  samlaresa (110 s)
     ✗ resan är en av de främsta raderna på Förbättra (plats 3 av 8: underhall 0.58, tekArbete 0.42, samlaResa 0.31)
     ✗ a samlade till resan och gick till samlingsplatsen, där sällskapet packade (hemma)
## FEL  kallelse (9 s)
     ✗ en farlig resa: sällskapet blir 4, kraften 3.52 mot kravet 4.5
     ✗ resenärerna gick till samlingsplatsen och sällskapet packar (samlas)
## FEL  gomma (1 s)
     ✗ nästa resa finner gömman tom (undefined)
## FEL  reslikhet
TypeError: Cannot read properties of undefined (reading 'skede')
    at skede (/home/user/test/src/test/scenarier/fas11.ts:2441:90)
    at Object.kor (/home/user/test/src/test/scenarier/fas11.ts:2453:16)
    at korHar (/home/user/test/src/test/scenario.ts:51:55)
    at <anonymous> (/home/user/test/src/test/scenario.ts:66:16)
## FEL  handelsresa (1 s)
     ✗ a vill handla i Trananäs, där hen tror att grenar betalas bäst (se till Hasselhem, )
## FEL  vagmote (1 s)
     ✗ sällskapet möter färden från Hasseltuna på vägen (Mötte folk från Hasseltuna på vägen till Hjortklanen. Mötte folk från Hasseltuna på vägen till Hjortklanen och sålde 6 saker för 62 silver.)
     ✗ samma möte sker inte igen (2)
## FEL  turne (0 s)
     ✗ Tustig får bedriften och en rad i krönikan ("Tustig kom hem från en turné till Silverlösa med 18 silver i gåva.")
## FEL  talt (0 s)
     ✗ fem resenärer med ett tält tappar en femtedel (0.00)
     ✗ två tält packas för fem när byn har två (1 av 1)
     ✗ en by som aldrig rest vill ha noll tält, och efter resan två (0 → 1)
## FEL  fangar (1 s)
     ✗ rövare gav upp (0) och en togs till fånga (0)
     ✗ vapnen och bytet hen bar blev byns (0 ting, 0 saker)
     ✗ fången gick till fängelset och sitter inne (undefined)
## FEL  vacktspar (20 s)
     ✗ de går med huvudbyn, och den halvt väckta blev färdig (klar 1 s efter, klar 1 s efter)
## FEL  kyrkanutlyser (0 s)
     ✗ byn har en tro
## FEL  rovarmotet (1 s)
     ✗ ingen gick rakt igenom en fiende (1 gånger närmare än 0,3 rutor utanför striden)
```

## 6. `npm test`: 2307 s, rött (en iakttagare)

Vakterna har inga fel, ingen by är återgrundad och ingen kraschar. Samma-kollen visar annan utveckling, vilket väntas efter 12.1-stegen.

```
by 1     pop 17, återgrundad 0 ggr, in 1, ut 6, födda 34, döda 13, svält 0, kyla 0, blod 3, infektion 0, amputerat 0, hunger 0 h, humör 0.48, vintermat 1877, vinterved 1177, eld 82 %
by 1511  pop 35, återgrundad 0 ggr, in 2, ut 20, födda 37, döda 9, svält 0, kyla 1, blod 2, infektion 0, amputerat 0, hunger 10 h, humör 0.42, vintermat 3634, vinterved 4295, eld 88 %
by 4634  pop 14, återgrundad 0 ggr, in 2, ut 2, födda 17, döda 12, svält 1, kyla 1, blod 1, infektion 0, amputerat 0, hunger 29 h, humör 0.40, vintermat 1511, vinterved 1375, eld 81 %
ANNAN UTVECKLING (hela byn): by 1 efter dygn 5, 10, 15, 20, 25, 35, 40, 45, 50; by 1511 efter dygn 5, 10, 15, 20, 25, 30, 35, 40, 45, 50; by 4634 efter dygn 25, 35, 50
OK teknikbyar
Vakter: inga fel.
```

Iakttagaren **aldrig** är röd:
```
FEL aldrig: Allt i registren används: varje handling, sak, husfunktion, djurart och teknik förekommer i minst en av testbyarna i npm test
  ✗ handlingar: 171 av 253 används, aldrig: hantverk (sällsynt: handarbete utan sak väljs inte sedan v55; rep tvinnas som en egen handling och resten är projekt), skriva (sällsynt: att skriva och läsa (steg 10.6.5) kräver pergamentet och bläcket, en sen teknik; scenariot skriva prövar det), barmat (sällsynt: fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det), fangen (sällsynt: fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det), fangvakt (sällsynt: fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det), stoppa (sällsynt: fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det), besokFange (sällsynt: fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det), rymma (sällsynt: fängelset (system 11.12) kräver en ledare, påbudet Fängelse, ett hus som är fängelse och någon som dömts till det, sällan på 50 dygn; scenarierna fangelse, fangemat, fangeliv, fangvakt och fangelsestraff prövar det), fatt (sällsynt: bara den som inte kan gå får vatten av de andra; scenariot vard prövar det), nat (sällsynt: nätet (steg 9.6.16) är en teknik på nivå 4, och braxen och sik fångas mest i nätet; scenari
  ✗ saker: 152 av 592 används, aldrig: byggsten (sällsynt: byggstenen (steg 10.10.5) kräver stenhuggarplatsen och stockvägen, nivå 4, och en plan av sten; scenariot byggsten prövar den), kalke (sällsynt: kälken och släden (steg 10.10.1–10.10.2) är tekniker på nivå 3–4 efter snickarbänken och repet; scenariot kalke prövar dem), slade (sällsynt: kälken och släden (steg 10.10.1–10.10.2) är tekniker på nivå 3–4 efter snickarbänken och repet; scenariot kalke prövar dem), vagn (sällsynt: vagnen (steg 11.11.3) byggs när byn ska frakta mycket på en resa, och resorna är sällsynta på 50 dygn; scenarierna vagn och karavan prövar den), krok (sällsynt: som protes; scenariot protes prövar den), ogonlapp (sällsynt: görs bara åt den som förlorat ett öga (steg 9.5.11); scenariot protes prövar den), naverask (sällsynt: sen teknik i fas 9 (steg 9.4.13): byn vill ha näveraskar först när någon kan koka i örtköket; scenariot vatskor prövar den), lerkruka_stor (sällsynt: som lerkruka; scenarierna lera och kruka prövar den), nat (sällsynt: nätet (steg 9.6.16) är en teknik på nivå 4, och braxen och sik fångas mest i nätet; scenarierna nat och braxen prövar dem), farkott (sällsynt: de tama djuren (system 9.8) kommer först när byn köpt får, getter eller höns av handlaren, och djuren är dyra; scenarierna boskap, hage, hagflytt, mjolk, tamslakt, slatter och hons prövar dem), kokott (sällsynt: de tama djuren (system 9.8) kommer först när byn köpt får, getter eller höns av handlaren, och djuren är dyra; scenarierna boskap, hage, hagflytt, mjolk, tamslakt, slatter och hons prövar dem), getkott (sällsynt: de tama djuren (system 9.8) kommer först när byn köpt får, getter eller höns av handlaren, och djuren är dyra; scenarierna boskap, hage, hagflytt, mjolk, tamslakt, slatter och hons prövar dem), fagelkott (sällsynt: fågelkött ger bara en fågel som fångas eller en slaktad höna; scenarierna faglar och hons 
  ✗ tekniker: 72 av 95 används, aldrig: ridning (sällsynt: ridningen (steg 11.11.4) är en teknik på nivå 5 som öppnas först efter tio körningar med häst, och hästen köps sällan på 50 dygn; scenariot ridning prövar den), bok (sällsynt: böckerna (steg 10.6.6) kräver pergamentet och snickarbänken, en teknik på nivå 7; scenariot bok prövar dem), skrivpulpet (sällsynt: böckerna (steg 10.6.6) kräver pergamentet och snickarbänken, en teknik på nivå 7; scenariot bok prövar dem), pergament (sällsynt: pergamentet och bläcket (steg 10.6.4) är en sen teknik på nivå 6 efter garvningen; scenariot pergament prövar dem), ol (sällsynt: vinet och ölet (steg 9.6.12–9.6.13) är tekniker på nivå 4–5; scenarierna vin och ol prövar dem), sprit (sällsynt: spriten (steg 10.7.26) bränns i brännpannan på bryggkaret, som kommer efter vinet och ölet; scenariot sprit prövar den), mjod (sällsynt: mjödet (steg 10.7.25) kräver honung från vildbin och bryggkaret; scenariot mjod prövar det), vavstol (sällsynt: sen teknik i fas 7, hinner inte alltid komma på 35 dygn; scenariot hantverk7 prövar den), nat (sällsynt: nätet (steg 9.6.16) är en teknik på nivå 4, och braxen och sik fångas mest i nätet; scenarierna nat och braxen prövar dem), skinnfall (sällsynt: skinnfällen kommer man bara på när byn har skinn över och halmbäddar (steg 2.2.15), sällan på 35 dygn sedan skinnen blev kvar där djuret styckades (steg 6.6.1); scenariot skinnfall prövar det; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns), skinndorr (sällsynt: skinndörren kommer man bara på när byn har skinn över och ett hus med en öppen dörröppning (steg 2.2.16), sällan på 35 dygn; scenariot dorr prövar den; i fasens Balans (6.10.4) var det sällsynt utan att bryta någon gräns), talt (sällsynt: tältet (steg 11.11.2) görs när byn ska resa och sova ute, och resorna är sällsynta på 50 dygn; scenariot talt prövar det), vattensack
```
Det som aldrig används och inte är märkt sällsynt:
- handlingar: malm, torv, kola, blasa, jarnhjalm, ringbrynja, spanne, smida, passa
- saker: jarnhjalm_jarn, ringbrynja_jarn, spanne_jarn, torv, blottorv, malm, jarn, jarnskrot, jarnspjut, jarnskold, isborr, eldstal, svard, jarnyxa, jarnkniv, lie
- tekniker: kolmila, blasterugn, smedja, vapensmide

Allt utom `passa` hör till järnkedjan. Den används inte i någon testby på 50 dygn (50 år i spelet, sju veckor i verkligheten).

## Sammanfattning

- **Grönt:** typkontrollen, likhet (4 av 4 byar exakt lika), vakterna i `npm test` och iakttagaren teknikbyar.
- **Rött:** 44 scenarier, alla röda också ensamma, varav två kraschar (slatter och reslikhet). Iakttagaren aldrig är röd: järnkedjan och `passa` används inte. Samma och samma-kollen visar annan utveckling, vilket väntas.
- **Nytt:** 28 nya röda scenarier utöver de 18 kända (listan ovan). Ikoner och symboler har blivit gröna. Många av de nya pekar mot att inget byggs och ingen samlar, och mot tändmaterialet i 12.1.39.
- **Inte avgjort:** koll gav inget eget resultat (stoppad efter 2 timmar), men alla dess delar kördes var för sig.
