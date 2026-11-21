# Granskaren, första körningen (steg 12.1.44)

Byarna 1, 1511 och 4634 i 10 dygn (10 år i spelet), underlaget från `npm run granska`. Fem läsare och en prövare per läsare. Varje fynd är prövat mot koden. Björn säger ja eller nej till varje.

24 fynd bekräftade, 5 avfärdade.

## 1. Ett barn som hjälper till med veden säger att byn behöver ved fast förrådet räcker 54–102 dygn, långt över bufferten (6–7,5 dygn) och i by 1 över taket (73 dygn). Matgrenen bredvid byter till "Mer mat till förrådet" när maten räcker, men vedgrenen har ingen sådan variant.

- By: 1 och 4634; vem: Bovvi (14 år) i by 1, Madleif (14 år) i by 4634; när: by 1: 2026-10-27T12:17 och många gånger fram till 2026-10-29T08:26; by 4634: 2026-10-25T11:37 och hela det sista dygnet; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: - 2026-10-27T12:17 skal Bovvi: skälet "Hjälper till. Byn behöver ved, förrådet räcker 99 dygn." (byn behöver ved) stämmer inte: mätt 65 %, törst 73 %, värme 100 %, mat 12.9 dygn (buffert 7.6), ved 99.4 dygn (buffert 6.6)
- 2026-10-25T11:37 skal Madleif: skälet "Hjälper till. Byn behöver ved, förrådet räcker 39 dygn." (byn behöver ved) stämmer inte
     20 Samlar grenar [ved, back] — Hjälper till. Byn behöver ved, förrådet räcker 54 dygn. (Madleif, by 4634, där förråden visar ved 54.5 dygn (buffert 7.5, tak 89.4))
- Koden: src/sim/val.ts:826: barnets gren skriver 'Byn behöver ved, förrådet räcker …' så snart ACTS[d.best].behov === 'ved', utan att jämföra d.wd med buffert(s,'ved'). Matgrenen på samma rad har varianten 'Mer mat till förrådet' (d.fd < d.matBuf), och de vuxnas rad 'ved' (val.ts:854) kräver d.wd < buffert, medan fyllaVed (val.ts:607-611) skriver 'Mer ved till förrådet'. d.best väljs i bestWork (val.ts:1184-1203) med wWood som bara sjunker mjukt mot taket och aldrig blir 0, så ved kan bli bäst långt över bufferten. Raderna (ved 99 dygn, buffert 6,6) stämmer med det.
- Rättelse: val.ts:826: skriv 'Mer ved till förrådet, som räcker …' när d.wd >= buffert(s,'ved'), som i fyllaVed.
- Björn: ja / nej

## 2. Den som handlar för byn köper en sak av handlaren och säljer tillbaka samma sak till samma handlare några minuter senare.

- By: 1 och 4634; vem: Torhild (33 år) i by 1 med Raglaug; Kolny (37 år) i by 4634 med Veveig; när: by 1: 21:23 och 21:30 det sista dygnet; by 4634: 21:17 och 21:19; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: 21:23 Raglaug lät Torhild för byn få ett äppelplanta mot en flinta och en klump lera.
21:30 Raglaug lät Torhild för byn få många bitar silver mot fyra röllekor, ett äppelplanta, ett rep, en bit harkött, en rova, fyra ärter och sju rotgröt · fin.
21:17 Veveig lät Kolny för byn få fem kålfrön mot sex bär och nio rötter.
21:19 Veveig lät Kolny för byn få åtta bitar silver mot tre kålfrön och fyra rötter.
- Koden: src/sim/handel.ts:642-643: byn köper det där M.varde(k) >= DELA.saknar eller som projekten saknar, och antalet blir Math.min(w.n, lista?.[w.k]?.n || w.n), alltså hela handlarens lager när projekten inte saknar saken. bynBehovUtan (behov.ts:608-615) ger DELA.saknar redan när byn har mindre än en sak. I nästa affär säljer saljaAv (handel.ts:573-583) det som bynOver (behov.ts:617-640) räknar som över, alltså allt utöver behalla/bufferten. Fem kålfrön köps för att byn har noll, och tre av dem räknas sedan som överflöd och säljs (raderna kl. 21:17 och 21:19).
- Rättelse: handel.ts:643: köp bara så många som behövs för att nå behalla/bufferten (det bynOver räknar som gränsen), inte w.n.
- Björn: ja / nej

## 3. En vuxen grälar och slåss med ett barn på fyra år och med ett barn på åtta år. Fyraåringen slogs mitt i natten, när barnen sover.

- By: 1511; vem: Halstig (33 år) mot Hilorm (4 år) och Gunja (8 år); när: det sista dygnet, 23:19 (Gunja) och 02:42 (Hilorm); hur vanligt: en person; rättelsen: grundregel; går att mäta: ja
- Raderna: 23:19 Halstig och Gunja slogs (efter ett gräl). Halstig gav upp.
02:42 "Det slåss i byn!" ropade Halstig och Hilorm. Många hörde det.
02:42 Halstig och Hilorm slogs (efter ett gräl). Hilorm gav upp.
Hilorm (4 år): Sover [sova, do] — Barn sover på natten
- Koden: src/sim/kartstrid.ts:338: den enda åldersgränsen är ALDER.smabarn för båda, och anropet från samtalet (steg.ts:563) har ingen annan gräns. Inget i åldersskillnaden, styrkan eller relationen gör det mindre troligt att en vuxen slåss med en fyraåring. Att det hände när barnet sov stämmer dock inte: raden 'Sover' i by-1511.md:26 är läget vid ögonblicksbilden, och Hilorm var vaken och såg på kl. 04:04 (rad 435).
- Rättelse: kartstrid.ts:338-339: låt chansen bero på åldersskillnaden eller styrkan mellan de två, eller låt bli slagsmål när den ena är ett barn och den andra vuxen.
- Björn: ja / nej

## 4. En man som fick ett skärsår i lungorna och skadades svårt av rövare brottas och vinner två gånger samma eftermiddag, under tiden som hans barn föds.

- By: 4634; vem: Ufast (33 år); när: det sista dygnet: skadad 12:01, brottning 17:26 och 18:30; hur vanligt: en person; rättelsen: grundregel; går att mäta: ja
- Raderna: 12:01 Ufast fick ett skärsår i lungorna i en strid med rövare.
12:01 Ufast slogs med två rövare från Kullehem vid byn. Rövarna vann. Ufast skadades svårt.
17:26 Ufast vann brottningen.
18:30 Ufast vann brottningen.
18:38 Ralvunn och Ufast fick ett barn till, Aska.
- Koden: src/sim/sport.ts:230-233: horRopet prövar ålder, avstånd, kanGa, sömn och strid. kanGa (halsa.ts:290) gäller bara svimning, blod och ben, inte smärta eller sår i bålen. vilaHellre (halsa.ts:756) prövas inte. I val.ts ligger 'sport' på nivå 3 (rad 699) före 'vilaSkadad' på nivå 4 (rad 738). Om Ufast fortfarande hade ont kl. 17:26 syns inte i raderna (såret kan ha vårdats), men koden hindrar det inte.
- Rättelse: sport.ts:232 och sportVal/sportListaVal: lägg till !vilaHellre(q) (och samma för den som samlar).
- Björn: ja / nej

## 5. Loggen säger att någon planerar att bygga ut sitt hus "med 0 rutor", och ägarens namn står med liten bokstav i husets namn ("ylvgerds hus").

- By: 1511 och 4634; vem: Ylvgerd (31 år) i by 1511, Ufast (33 år) i by 4634; när: by 1511: 00:00; by 4634: 21:00 det sista dygnet; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: 00:00 Ylvgerd planerar att bygga ut ylvgerds hus med 0 rutor.
21:00 Ufast planerar att bygga ut ufasts hus med 0 rutor.
- Koden: src/sim/byggplan.ts:953 räknar golvrutorna i f.ritning. I utbyggnad (byggplan.ts:321-342) blir varje ny ruta på den yttre kanten vägg (kant) och resten golvNu. Den gamla väggen, som blir golv, ligger i f.oppnas och inte i ritning (rad 336). Med k = 1 är alla nya rutor kant, och då blir antalet 0. För större k blir det för få. h.namn.toLowerCase() (rad 953, och likadant rad 905, 931 och 945) gör 'Ylvgerds hus' till 'ylvgerds hus'.
- Rättelse: byggplan.ts:953: räkna golven i ritning plus f.oppnas (eller nw*nh - iw*ih). Gör bara husets första bokstav liten, eller skriv namnet utan toLowerCase när det är ett ägarnamn (rad 905, 931, 945 och 953).
- Björn: ja / nej

## 6. Skälet blir grammatiskt fel när projektets namn är en handling: "Byn saknar gräva bort stubbar.", "Byn saknar röjning.", "Byn saknar flytta en lagerplats." och "Byn saknar kokat vatten." står hundratals gånger per dygn.

- By: 1, 1511 och 4634; vem: bl.a. Torhild (by 1), Halstig (by 1511), Arveig och Ralvunn (by 4634); när: hela det sista dygnet; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna:      28 Byn saknar gräva bort stubbar.
     33 Byn saknar röjning.
      3 Byn saknar flytta en lagerplats.
11:16 Gräver bort en stubbe [stubbe, do] — Byn saknar gräva bort stubbar. Gräver bort en stubbe där något ska byggas.
- Koden: src/sim/val.ts:1103: projektVal(v, pr.u, `Byn saknar ${PROJEKT[pr.k].namn.toLowerCase()}`). I src/sim/projekt.ts heter projekten bland annat 'Flytta en lagerplats' (250), 'Flytta en station' (274), 'Röjning' (282), 'Gräva bort stubbar' (290) och 'Flytta plantor' (298). 'Byn saknar kokat vatten' är däremot korrekt svenska.
- Rättelse: projekt.ts: ge projektraderna ett fält för skälet (t.ex. 'Stubbar står där något ska byggas') och använd det i val.ts:1103.
- Björn: ja / nej

## 7. Handelns text har fel ord för sakerna: "ett äppelplanta" i stället för "en äppelplanta", "fyra remsa", "två rökelse" och "sju rotgröt · fin", där kvalitetens märke också hamnat i loggen.

- By: 1; vem: Torhild (33 år) med handlaren Raglaug; när: 21:23–21:33 det sista dygnet; hur vanligt: en by; rättelsen: grundregel; går att mäta: ja
- Raderna: 21:23 Raglaug lät Torhild för byn få ett äppelplanta mot en flinta och en klump lera.
21:30 Raglaug lät Torhild för byn få många bitar silver mot fyra röllekor, ett äppelplanta, ett rep, en bit harkött, en rova, fyra ärter och sju rotgröt · fin.
21:33 Raglaug lät Torhild få sex bitar silver mot fyra remsa, en rölleka, två rökelse och två leksaker.
- Koden: src/sim/saker.ts:293 (appelplanta) och 287 (jordgubbsplanta) har ett: true, och sakOrd (ord.ts:52-56) ger då 'ett'. remsa, rokelse och rätterna finns inte i SAKORD (ord.ts:27-49), så antal() använder samma namn i ental och flertal. Läsaren hade fel om var märket kommer ifrån: ' · fin' kommer inte från kvaliteten i varorText (byte.ts:59). Det kommer från rattNamn (ratter.ts:137), som sätter måltidsnivån i sakens namn ('Rotgröt · fin'). matlagning.ts:308 och 357 tar redan bort den delen med split(' · ').
- Rättelse: saker.ts:287 och 293: ta bort ett: true. ord.ts: lägg till remsa och rokelse i SAKORD, och låt sakOrd ta bort ' · …' och ge flertal för rätterna (eller ge rätterna egna ord).
- Björn: ja / nej

## 8. Barn och unga (13–14 år) som "hjälper till" samlar grenar till veden när vedförrådet räcker 54–102 dygn, långt över bufferten (6–7,5 dygn) och i by 1 över taket (ca 73 dygn). En vuxen väljer bara ved när förrådet är under bufferten, men barnens hjälp kontrollerar aldrig om behovet finns. Madleif växlar hela dagen mellan lek och vedsamling för en ved som ingen behöver.

- By: by 1 och by 4634; vem: Bovvi (14 år) i by 1, Madleif (14 år) i by 4634; när: By 1: dygn 7–9, t.ex. 2026-10-27 12:17 till 2026-10-29 08:26. By 4634: hela sista dygnet, 07:00–17:41, och dygnen innan (2026-10-25 och 26).; hur vanligt: de flesta byarna; rättelsen: balanstal; går att mäta: ja
- Raderna: by-1.md: "- 2026-10-27T12:17 skal Bovvi: skälet "Hjälper till. Byn behöver ved, förrådet räcker 99 dygn." (byn behöver ved) stämmer inte: mätt 65 %, törst 73 %, värme 100 %, mat 12.9 dygn (buffert 7.6), ved 99.4 dygn (buffert 6.6)" och "- 2026-10-28T07:00 skal Bovvi: skälet "Hjälper till. Byn behöver ved, förrådet räcker 102 dygn." (byn behöver ved) stämmer inte: ...ved 102.1 dygn (buffert 6.4)" (19 sådana larm för Bovvi). by-4634.md: "07:37 Samlar grenar [ved, back] — Hjälper till. Byn behöver ved, förrådet räcker 54 dygn. | på 107.2,146.8 mot 115.5,116.5 | bär: grenar 8 kg, bälte av rep" med förråden "Förråden: mat 33.2 dygn (buffert 7.6, tak 15.3); ved 54.5 dygn (buffert 7.5, tak 89.4)", och "10:18 Samlar grenar [ved, do] — Hjälper till. Byn behöver ved, förrådet räcker 61 dygn." (46 larm för Madleif)
- Koden: src/sim/val.ts:815-829 (raden 'barn'): hjalp = a/ALDER.vuxen*(VAL.barnHjalp + d.u), med barnHjalp = 0,5 (rad 144), så ett barn på 14 år hjälper ungefär hälften av gångerna även när d.u = 0. Arbetet blir d.best ur bestWork (rad 1160-1210). Där sjunker poängen mjukt med mjuktTak (rad 1159) och blir aldrig noll, så något arbete väljs alltid. Det finns inget att väga hjälpen mot: de vuxnas rader 'ved' och 'mat' (rad 848, 854) kräver att förrådet ligger under bufferten, och på Förbättra tävlar fyllaVed och fyllaMat mot fritidHellre (rad 607-615). Barnets enda andra val är leken, med en andel som inte beror på något behov. Texten sätts dessutom till 'Byn behöver ved, förrådet räcker N dygn' så fort ACTS[d.best].behov är 'ved', utan att jämföra med bufferten (rad 827). Därför larmar skälet i loggarna. I by 4634 är veden (54 dygn) under taket (89), så där kunde även en vuxen fylla på med fyllaVed. Det felaktiga där är texten och att hjälpen inte beror på något behov. I by 1 ligger veden (99-102 dygn) över taket (ca 73).
- Rättelse: I val.ts, raden 'barn': låt hjälpen gå genom samma poäng som de vuxna, så att hjälpen väger behovet ovanför bufferten (wWood/wBy mot fritiden, som fyllaVed och fritidHellre) i stället för en fast chans. Skriv texten som 'Mer ved till förrådet' när d.wd är över bufferten. Hur stor hjälpen ska vara är ett balanstal.
- Björn: ja / nej

## 9. "Byn behöver tändmaterial till elden" utlöses av hö som går åt till hantverk. Torhild flätar korgar av hö 17:42–18:30, så höet sjunker under bufferten. Direkt efteråt går hon ut för att samla "tändmaterial till elden". I by 1511 tvinnar Hilmund rep av hö, höet sjunker under bufferten, och sedan går flera ut efter "tändmaterial". Bufferten stiger samtidigt med förbrukningen: i by 1511 från 51 till 105 på sju timmar. Grenar finns i överflöd (822 och 408, tak 91–114). Elden har alltså inte brist; det är höet till korgar och rep som saknas, men det får tändmaterialets vikt och dess text.

- By: by 1 och by 1511; vem: Torhild (33 år) i by 1; Hilmund (27 år), Halstig (33 år) och Fröborg i by 1511; när: By 1: sista dygnet 17:42–19:00. By 1511: sista dygnet 09:33–15:00, och 2026-10-29 13:07.; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: by-1.md: "17:59 Flätar en korg av hö [korg, go] — Byn saknar korg. Flätar en korg av hö. | på 153.3,112.4 mot 149.7,134.1 | bär: hö 6 kg, bälte av rep, korg", "18:29 Flätar en korg av hö [korg, do] — Byn saknar korg. Flätar en korg av hö.", förråden "  hö 84 (buffert 67, tak 201)" kl. 17:00 och "  hö 69 (buffert 76, tak 228)" kl. 18:00, sedan "18:59 Samlar bär och rötter [samla, do] — Byn behöver tändmaterial till elden. Tar en korg.". by-1511.md: "09:33 Tvinnar rep [tvinna, do] — Byn saknar rep. Tvinnar rep av hö.", "  hö 64 (buffert 51, tak 151)" kl. 09:00 och "  hö 52 (buffert 58, tak 173)" kl. 10:00, och "- 2026-10-29T13:07 handling Fröborg: Flätar en korg av hö med skälet "Byn behöver tändmaterial till elden. Flätar en korg av hö.""
- Koden: src/sim/eld.ts:209 tinderShort = underBuffert(s,'torrgras') || underBuffert(s,'grenar'), och needTinder (rad 226) använder den. src/sim/forradsmal.ts:178 materialBuffert = max(MATERIALMAL.torrgras.min, mal.b), där b (materialTimme, rad 169-172) räknas ur s.forbruk. forbrukat (rad 151) fylls av allt som tas ur förrådet, också höet till korgar och rep. Bufferten växer alltså med hantverket (51 till 58 till 105 i by 1511), och när höet sjunker under den blir needTinder sann. I val.ts ger raden 'tand' (rad 857) och bestWork (rad 1196-1204) då vikten VAL.tandVikt = 3 och texten 'Byn behöver tändmaterial till elden', fast grenarna ligger långt över taket och elden inte saknar något. Tändningens egen del av bufferten är MATERIALMAL.torrgras.min (tand(s), rad 133-135), och den är bara en liten del av talet.
- Rättelse: Skilj tändningens behov från materialets buffert. I eld.ts ska tinderShort/needTinder bara fråga om höet räcker till tändningen (MATERIALMAL.torrgras.min, eller det elden förbrukat). Hö under den vanliga materialbufferten blir ett vanligt materialbehov med egen text och vikt i val.ts (raden 'tand' och bestWork), inte 'till elden'.
- Björn: ja / nej

## 10. Den som går ut för att samla "tändmaterial till elden" kommer hem med ägg, rötter och bär och nästan inget hö, fast maten ligger över taket. Torhild står 30 minuter på samma ruta och bär till slut 12 kg ägg. Höet går från 69 kl. 18:00 till 68 kl. 19:00 och står kvar på 68, under bufferten, hela natten. Halstig i by 1511 går 20 minuter i rundor med "tändmaterial" som skäl och bär hem rötter, ägg och bär varje gång, och hö bara 2–6 kg.

- By: by 1 och by 1511; vem: Torhild (33 år) i by 1, Halstig (33 år) i by 1511; när: By 1: sista dygnet 18:30–19:00. By 1511: sista dygnet 11:03–11:11 och 12:09–12:28.; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: by-1.md: "18:38 Samlar bär och rötter [samla, do] — Byn behöver tändmaterial till elden. Tar en korg. | på 147.5,101.5 mot 147.5,101.5 | bär: ägg 8 kg, bälte av rep, korg", "18:59 Samlar bär och rötter [samla, do] — Byn behöver tändmaterial till elden. Tar en korg. | på 147.5,101.5 mot 147.5,101.5 | bär: ägg 12 kg, bälte av rep, korg", förråden kl. 18:00 "Förråden: mat 21.3 dygn (buffert 6.8, tak 13.6)" och kl. 19:00 "  hö 68 (buffert 85, tak 254)". by-1511.md: "12:16 Samlar bär och rötter [samla, back] — Byn behöver tändmaterial till elden. Tar en korg. | på 135.7,151.8 mot 136.7,128.3 | bär: bär 4 kg, rötter 8 kg, blomma 0.1 kg, bälte av rep, korg" och "12:28 Samlar bär och rötter [samla, back] — Byn behöver tändmaterial till elden. Tar en korg. | på 12.9,230.1 mot 137.7,128.3 | bär: ägg 4 kg, bälte av rep"
- Koden: src/sim/steg.ts:1351-1360: rundan plockar först det som sakerPa visar på rutan. För samla är det bär, rötter och svamp (sakerPaRutan, rad 1217), och där frågas aldrig om maten behövs eller ligger över taket (villHaMer/lyxtak). Grenen för tändmaterialet (rad 1363) körs bara när narmastMedSaker inte ser något sådant. I UTFALL.samla (rad 1071-1102) läggs de plockade bären och rötterna i bördan, och på våren läggs ägg till varje steg med bar('agg', FAGEL.agg*dt/HOUR_S), också i tändmaterialets gren, där Torhild står still och letar. Inte heller där frågas om maten når taket. Höet tas i hela saker av tandTa i forageItems (eld.ts:488) i takten ELD.hoTakt*ARSTID.hoPerTid, och det ger nästan inget (69 till 68 på en timme). Äggen fyller under tiden bördan (8 till 12 kg). Platsen väljs genom arbeta och withTools som för vanligt samlande. Den delen har jag inte följt in i detalj, men det stämmer med att Halstig går till platser med bär och rötter.
- Rättelse: I steg.ts (rundaRuta och UTFALL.samla): när tk.tandmat är satt, eller maten ligger vid taket (villHaMer(s, k) är falsk), ska bär, rötter och ägg inte plockas eller läggas i bördan. Gå i stället direkt till tändmaterialets gren, och välj platsen efter var höet finns i stället för efter maten.
- Björn: ja / nej

## 11. Två personer bär samma ved från en ruta och lägger ner den på samma ruta igen, om och om igen, med skälet att de flyttar den till ett lager närmare elden. Hilmund tar ved på ruta 125,98, bär den till 125,98 och går genast tillbaka till 125,98 för att hämta igen. Halstig gör samma sak på rutorna 124–125,98.

- By: 1511; vem: Hilmund (27 år) och Halstig (33 år); när: 08:46–08:52 det sista dygnet (dygn 10); hur vanligt: en by; rättelsen: grundregel; går att mäta: ja
- Raderna: Halstig: 08:46 Bär in saker till lagret [bara, back] — Flyttar saker till ett lager närmare elden | på 125.5,98.5 mot 125.7,98.3 | bär: ved 15 kg, bälte av rep, flintyxa
08:48 Bär in saker till lagret [bara, go] — Flyttar saker till ett lager närmare elden | på 124.5,98.5 mot 124.5,98.5 | bär: bälte av rep, flintyxa
08:52 Bär in saker till lagret [bara, back] — Flyttar saker till ett lager närmare elden | på 125.6,98.4 mot 125.7,98.3 | bär: ved 15 kg, bälte av rep, flintyxa
Hilmund: 08:50 Bär in saker till lagret [bara, back] — Flyttar saker till ett lager närmare elden | på 125.5,98.5 mot 125.7,98.3 | bär: ved 10 kg, flintyxa, bälte av rep
08:50 Bär in saker till lagret [bara, go] — Flyttar saker till ett lager närmare elden | på 125.6,98.4 mot 125.5,98.5 | bär: flintyxa, bälte av rep
- Koden: Läsarens orsak stämmer med koden. Bärlistan (src/sim/lager.ts:1187–1215) sparas med nyckeln timme:byggV:antal lagerplatser och räknas därför inte om när lagerplatserna fylls. Raden 'Flyttar saker till ett lager närmare elden' kommer från spot(a.k, zs[zi].prio) (rad 1211), som bara tittar på lagerplatser med högre prioritet. haulJob (rad 1166–1181) kontrollerar bara finns (rad 1177), alltså att saken ligger kvar, inte att skälet gäller. När uppgiften går över till back räknas målet om med dropSpot(s, homeKind(t)) (steg.ts:781). Den anropar zoneSpot med minPrio -Infinity (lager.ts:511–512), som tar den lagerplats med högst prioritet som har plats och där först en stack av samma slag som inte är full. Är den bättre platsen full, blir målet källrutan, som nyss fått plats, eller en ruta bredvid i samma lagerplats. Jag körde by 4634 med samma frö (det gav samma tider som underlaget) och följde personerna i steg om 0,5 s. Ralvunn tar 2 ved på 123,125 och får ett back-mål 0,07 rutor bort. Hon lägger ner veden, och nästa val ger samma ruta igen (go 0,27 rutor). Hos Hilmund och Halstig i by 1511 är back-målet 125.7,98.3, alltså samma ruta som de tog veden från. Den stora vedstacken där sjunker i takt (20, 19, 17, 15, 14) medan flera personer turas om.
- Rättelse: I haulJob (lager.ts:1166): kontrollera för raden 'närmare elden' (och 'bredvid lagret' och 'sorterar') att skälet fortfarande gäller med dagens occupancy, alltså att zoneSpot(k, prio) ger en ruta i en lagerplats med högre prioritet. Alternativt ogiltigförklaras barCache när en lagerplats fylls. Uppgiften bör också sluta utan att något bärs om dropSpot ger en ruta i samma lagerplats som saken togs från.
- Björn: ja / nej

## 12. Folk ger sig iväg för att bära in saker, går nästan ända fram (ofta 1–3 rutor ifrån) och vänder sedan tillbaka till elden utan att bära något. Madleif går fyra gånger på tolv minuter mot samma ställe bredvid lagret och tillbaka till samtalet vid elden. Räknat på uppföljda personer slutar 19 av 39 sådana turer i by 4634 och 6 av 7 i by 1 utan att något bärs.

- By: 4634 (också 1 och 1511); vem: Madleif (14 år), även Ralvunn (31 år) i 4634 och Tustig (40 år) och Torhild (33 år) i by 1; när: 19:41–19:53 det sista dygnet (dygn 10). Samma mönster 21:00 och 01:06–01:08, och i by 1 för Tustig 00:14–02:27; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: 19:41 Bär in saker till lagret [bara, go] — Mörkt, men är modig och det ligger saker bredvid lagret och nu finns det plats | på 113.5,118.0 mot 112.5,114.5 | bär: bälte av rep
19:42 Samtalar vid elden [samtal, do] — Mörkt, umgås vid elden | på 105.1,133.5 mot 105.1,133.5 | bär: bälte av rep
19:45 Bär in saker till lagret [bara, go] — Mörkt, men är modig och det ligger saker bredvid lagret och nu finns det plats | på 113.5,127.3 mot 112.5,114.5 | bär: bälte av rep
19:45 Samtalar vid elden [samtal, go] — Mörkt, umgås vid elden | på 107.1,136.5 mot 106.0,135.0 | bär: bälte av rep
19:51 Bär in saker till lagret [bara, go] — Mörkt, men är modig och det ligger saker bredvid lagret och nu finns det plats | på 119.0,123.5 mot 111.5,114.5 | bär: bälte av rep
19:52 Samtalar vid elden [samtal, do] — Mörkt, umgås vid elden | på 105.1,135.0 mot 105.1,135.0 | bär: bälte av rep
19:53 Bär in saker till lagret [bara, go] — Mörkt, men är modig och det ligger saker bredvid lagret och nu finns det plats | på 113.5,116.5 mot 113.5,114.5 | bär: bälte av rep
19:55 Samtalar vid elden [samtal, do] — Mörkt, umgås vid elden | på 105.6,134.9 mot 105.6,134.9 | bär: bälte av rep
(by 1, Tustig) 02:27 Bär in saker till lagret [bara, go] — Mörkt, men är modig och det ligger saker på marken som ska in i lagret | på 162.0,117.6 mot 164.5,117.5 | bär: bälte av rep
02:28 Samtalar vid elden [samtal, do] — Mörkt, umgås vid elden | på 136.6,131.8 mot 136.6,131.8 | bär: bälte av rep
- Koden: Det läsaren beskriver, att man vänder 1–3 rutor från målet utan att bära något, stämmer inte. Läsarens orsak, att pickUp inte får något, stämmer inte heller. Raderna i underlaget tas en gång i minuten, och gångfarten är GANG.fart = 1,6 rutor i sekunden (gang.ts:27), så en hel tur fram och tillbaka hinner bli klar mellan två rader. Jag följde alla turer i by 4634 och by 1 det sista dygnet. Av 158 turer i 4634 slutade 39 utan back-fas: 28 gällde ved med n=14–20 och ryms=true på rutan, 9 gällde redskap och 2 virke. I by 1 slutade 15 av 23 så, och alla 15 gällde redskap: slagträ, fiskespjut, yxa, lerkruka och ett mål. Det gäller också Tustigs tur 02:27 mot 164.5,117.5, där lerkrukan låg. Med steg om 0,5 s syns två orsaker. (a) Vedfallen är fynd 1: man tar veden, back-målet ligger under en ruta bort, och veden läggs ner inom samma sekund. (b) Redskapsfallen: pickUp tar redskapet (lager.ts:1251, g.lass = p.id och t.ting). Men isCarrying (lager.ts:1049) räknar bara t.carry och t.items, inte t.ting. Därför slutar uppgiften genast (steg.ts:780–782 väljer en ny uppgift i stället för back). Sedan nollar tidyTools lass (agande.ts:108), eftersom den nya uppgiften inte har tinget, och placeTools/placeOn (lager.ts:444–451) lägger redskapet i förrådet utan att någon bär dit det. I körningen syns korgen som lass=5 (Madleif), och i nästa steg finns den inte längre hos henne. Det samma hände med slagträt.
- Rättelse: lager.ts:1049: låt isCarrying (eller kontrollen i steg.ts:781) räkna t.ting?.length, så att den som tagit upp ett redskap går back till dropSpot/fetchSpot för redskapet och lägger ner det med storeLoad (lager.ts:1148). Vedfallen rättas med fynd 1.
- Björn: ja / nej

## 13. Den som är sjuk eller vilar för att den har ont väljs ändå till att fylla en lerkruka till örtköket (ett hantverk, inte nöd), eftersom vattenhämtningen ligger på nöd-nivån. Torhild avbryter sin vila som skadad för att fylla krukan till örtköket mitt i natten. Argaut har just fått texten 'ligger med feber och orkar inte resa sig' och fyller tre timmar senare en kruka till örtköket.

- By: 1; vem: Torhild (33 år), Argaut (32 år); när: Dygn 10 (det sista året i spelet), kl. 03:38–03:54 (Torhild) och kl. 03:15–06:00 (Argaut); hur vanligt: en by; rättelsen: grundregel; går att mäta: ja
- Raderna: 03:38 Vilar [vila, do] — Är skadad och vilar | på 139.4,116.4 mot 139.4,116.4 | bär: bälte av rep, mellanstor lerkruka | mätt 46 törst 62 värme 100 vila 100
03:48 Hämtar vatten [vatten, do] — Hämtar vatten i krukan åt Ållunn | på 144.5,118.5 mot 144.5,118.5 | bär: bälte av rep, mellanstor lerkruka | mätt 45 törst 59 värme 100 vila 100
03:52 Hämtar vatten [vatten, do] — Fyller en lerkruka till örtköket | på 144.5,118.5 mot 144.5,118.5 | bär: bälte av rep, mellanstor lerkruka | mätt 45 törst 58 värme 100 vila 100
03:54 Vilar [vila, do] — Är skadad och vilar
---
03:15 Argaut ligger med feber och orkar inte resa sig.
Argaut (32 år): Hämtar vatten [vatten, do] — Fyller en lerkruka till örtköket
    plats 144.5,118.5 → 144.5,118.5; bär: bälte av rep, mellanstor lerkruka; mätt 67 %, törst 100 %, värme 100 %, vila 100 %
- Koden: src/sim/val.ts:678: raden 'vatten' ligger på nivå 2 ('Nöd och vård') och anropar hamtaVatten → vattenVal (torst.ts:238). vattenVal kontrollerar bara ålder och kanGa(p) (rad 240), inte isSick, vilaHellre eller sjukVilar. Samma funktion ger också örtköket (villFylla, rad 253 och 260: 'Fyller en lerkruka till örtköket') och fältet ('Hämtar vatten till sitt fält'). Det gör att de går före 'vilaSkadad' (nivå 4, val.ts:738) och före dagens arbete. Kommentaren på rad 678 säger 'vatten i säcken åt den som inte kan gå', och bara den delen är nöd. Argaut ligger inte enligt ligger() (sjukdom.ts:149, utan feber först vid 0,6), så 'sjuk' på rad 664 stoppar honom inte. Torhild har vilaHellre, som bara prövas på nivå 4. Tustig i by 1 fyller också en kruka till örtköket kl. 06:11 och lägger sig sjuk kl. 06:19.
- Rättelse: Låt bara vattnet åt den törstige som inte kan gå ligga på nivå 2 i val.ts. Örtköket och fältet hör till sina egna nivåer, eller ska åtminstone inte väljas av den som är isSick eller har vilaHellre (torst.ts:253).
- Björn: ja / nej

## 14. Ufast får ett svårt skärsår i lungorna i striden mot rövarna och 'skadades svårt'. Fem timmar senare brottas han och vinner två gånger, och på natten håller han vakt. Sporten frågar bara om man kan gå, inte om man är skadad eller sjuk. Torhild i by 1 samlar också till brottning två gånger efter att hon blivit magsjuk kl. 09:48.

- By: 4634; vem: Ufast (33 år); när: Dygn 10 (det sista året i spelet), kl. 12:01–18:30; hur vanligt: en person; rättelsen: grundregel; går att mäta: ja
- Raderna: 12:01 Ufast fick ett skärsår i lungorna i en strid med rövare.
12:01 Ufast slogs med två rövare från Kullehem vid byn. Rövarna vann. Ufast skadades svårt.
17:26 Ufast vann brottningen.
18:30 Ufast vann brottningen.
Ufast (33 år): Håller vakt [vakt, do] — Håller vakt i natt
- Koden: src/sim/sport.ts:180–189 (sportVikt) och 230–234 (horRopet) kontrollerar ålder, kanGa, uppgiften och striden, men inte isSick, vilaHellre eller p.skador. vaktVal (val.ts:1441) utesluter däremot !isSick, halsa < svag och vilaHellre, så kroppen räknas olika i de två systemen. Att följa med när någon samlar till en match väljs på nivå 3 ('sport', val.ts:701), före 'vilaSkadad' på nivå 4. Där kommer alltså också den som har vilaHellre med. Torhild är magsjuk (isSick) och samlar ändå till brottning. För Ufast går det inte att se om smärtan låg under HALSA.vilaOnt. Om den gjorde det, följer vakten kroppens regler, men sporten saknar ändå kontrollen av isSick och skador.
- Rättelse: Lägg till !isSick(q) och !vilaHellre(q) i horRopet och sportVikt (sport.ts:182 och 232), och låt gärna skador och smärta sänka vikten.
- Björn: ja / nej

## 15. Byns logg säger att ett hus ska byggas ut 'med 0 rutor'. Utbyggnaden med en rad ger golv där den gamla väggen stod, men texten räknar bara de nya golvrutorna i ritningen, och de är noll eftersom den nya raden bara är vägg.

- By: 1511 och 4634; vem: Ylvgerd (1511), Ufast (4634); när: Dygn 10 (det sista året i spelet), kl. 00:00 (1511) och kl. 21:00 (4634); hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: 00:00 Ylvgerd planerar att bygga ut ylvgerds hus med 0 rutor.
21:00 Ufast planerar att bygga ut ufasts hus med 0 rutor.
- Koden: src/sim/byggplan.ts:953 skriver f.ritning.filter(a => MATERIAL[a.m].k === 'golv').length. I utbyggnad() (rad 321–350) läggs bara de nya rutorna i ritningen (rad 338–341), och med k = 1 är alla nya rutor kant, alltså vägg (kant() på rad 332). Golvet kommer från oppnas (rad 336, den gamla väggen som blir golv), som texten inte räknar. Förslaget får rätt storlek i plats: k (rad 350), så felet syns bara i texten.
- Rättelse: Räkna med golvet i f.oppnas i texten (byggplan.ts:953), eller räkna den nya ytan ur f.plats och husets bredd eller höjd.
- Björn: ja / nej

## 16. Texterna om sjukdom stämmer inte med kroppen. 'Svårt sjuk' skrivs redan vid grad 0,5, med varianten 'ligger med feber och orkar inte resa sig', men den sjuke lägger sig utan feber först vid 0,6. Argaut är därför uppe och arbetar efteråt. Den som vilar för att hen är sjuk får texten 'Är skadad och vilar': Bovvi har nyss blivit svårt sjuk men visas som skadad, och Torhild visas som skadad efter magsjukan, utan någon skada i loggen.

- By: 1; vem: Bovvi (14 år), Argaut (32 år), Torhild (33 år); när: Dygn 10 (det sista året i spelet), kl. 22:49–06:00 (Bovvi), kl. 03:15–06:00 (Argaut), kl. 20:07–06:00 (Torhild); hur vanligt: en by; rättelsen: grundregel; går att mäta: ja
- Raderna: 22:49 Bovvi har blivit svårt sjuk.
Bovvi (14 år): Vilar [vila, do] — Är skadad och vilar
03:15 Argaut ligger med feber och orkar inte resa sig.
Argaut (32 år): Hämtar vatten [vatten, do] — Fyller en lerkruka till örtköket
09:48 Torhild blev magsjuk av skämd mat.
20:07 Vilar [vila, go] — Är skadad och vilar | på 147.6,132.0 mot 139.4,116.3 | bär: bälte av rep, korg | mätt 80 törst 80 värme 100 vila 100
- Koden: src/sim/steg.ts:731 skriver l_svartSjuk när p.sjuk.grad >= 0.5, med talet 0,5 skrivet direkt i koden och oavsett sjukdom. Mallen i berattelser.ts:2036–2040 har varianten 'ligger med feber och orkar inte resa sig'. ligger() (sjukdom.ts:149) lägger den sjuke med feber från vilaFran = 0.3 och utan feber först vid SJUK.ligga = 0.6. Argaut är på grad 0,5 eller mer men ligger inte (han väljer 'vatten', som ligger efter 'sjuk' i VALREGLER). Hans sjukdom ger alltså ingen feber, och texten stämmer inte. val.ts:738 ('vilaSkadad') skriver alltid 'Är skadad och vilar', men vilaHellre (halsa.ts:756) gäller också den sjuke (p.sjuk.grad >= vilaFran med tecken), så Bovvi och Torhild visas som skadade.
- Rättelse: I steg.ts:731: använd SJUK.ligga (eller ligger()) och välj bara en variant med feber när SJUKDOMAR[k].foljd.feber finns. I val.ts:738: skriv 'Är sjuk och vilar' när orsaken till vilaHellre är sjukdomen.
- Björn: ja / nej

## 17. Brödtexten tappar bokstäverna i fi och fl: "flinta" ritas som "Ainta", "fick" som "Ack" och "fläta" som "Aäta". Pixeltypsnittets ligaturer för fi och fl ger fel tecken, så allt i brödtexten med de bokstäverna blir oläsligt.

- By: Björndalen (bilderna, bilder/flikar/kronika-dator.png); vem: Krönikans rader om Tustig och Frörhild den yngre; när: År 14, sommartid, dag kl. 12:00; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: Kronikan (bilden): "Sedan kom han på hur man kan Aäta bälten." och "den yngre Ack en Ainta av Frörhild och gav fyra famnar hö"
- Koden: Bilden kronika-dator.png visar "Aäta bälten" och "Ainta av Frörhild". src/template.html:22 sätter --body till "Siffror", "Pixelify Sans", … och body använder det (rad 47). Ingenstans i template.html eller src/ui står font-variant-ligatures eller font-feature-settings (grep på liga/ligatur gav inget). "Siffror" täcker bara U+30–3A, så fi och fl ritas med Pixelify Sans och dess ligatur.
- Rättelse: Lägg font-variant-ligatures: none (eller font-feature-settings: "liga" 0) på body i src/template.html.
- Björn: ja / nej

## 18. I krönikan står namnen i en egen högerkolumn, skilda från meningen. Raden blir "satt länge och funderade" med "Tustig" långt till höger, och "lät … för byn få sex stycken virke" med Argaut och Tustig staplade till höger. Meningen går inte att läsa i ordning.

- By: Björndalen (bilderna, bilder/flikar/kronika-dator.png); vem: Tustig, Argaut, Frörhild; när: År 14, sommartid; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: Kronikan (bilden): "Sommartid  Tustig / satt länge och / funderade." och "Sommartid  Argaut / lät  Tustig / för byn få sex / stycken virke / mot många bär."
- Koden: I src/ui/flikar/kronika.ts:81 läggs <span class="when"> och linkify() direkt i <li>. I src/template.html:345 (regeln står två gånger, också på rad 346) är .logg.kron > li ett rutnät med grid-template-columns: 8.5em 1fr. Där blir varje textbit och varje button.plink en egen cell. Bilden visar texten i den smala kolumnen och namnen till höger.
- Rättelse: Lägg linkify()-utdata i ett eget element (t.ex. <span class="txt">) i kronika.ts:81. Ta också bort den dubbla regeln i template.html:346.
- Björn: ja / nej

## 19. Länkningen av namn väljer det kortare namnet inuti det längre. I "Frörhild den yngre fick en flinta av Frörhild" blir bara första ordet "Frörhild" en länk, och den går till modern. Dottern får ingen länk, och det andra "Frörhild" (modern) står utan länk.

- By: Björndalen (bilderna, bilder/flikar/kronika-dator.png); vem: Frörhild och Frörhild den yngre; när: År 14, sommartid; hur vanligt: en by; rättelsen: grundregel; går att mäta: ja
- Raderna: Kronikan (bilden): länken "Frörhild" i högerkolumnen och texten "den yngre Ack en Ainta av Frörhild och gav fyra famnar hö, ett rovfrö, ett träspjut och en …"
- Koden: Raden "Sommartid" utan klockslag kommer ur krönikan: kronika.ts:21 tar ids från iText(text, s.people) (rad 17), alltså i den ordning folket står i s.people, och modern kommer före dottern. I linkify (src/ui/hjalp.ts:196–202) hittar namnI modern "Frörhild" vid index 0, eftersom ett mellanslag följer. Dotterns "Frörhild den yngre" vid 0 krockar då och hoppas över, och någon annan träff finns inte för henne. Det andra "Frörhild" (index efter 0) får ingen länk, eftersom modern redan har sin bit. Loggens rad (byte.ts:190, ids [m, g]) hade blivit rätt; felet gäller krönikans rader och alla ids som inte kommer i rätt ordning.
- Rättelse: I linkify (hjalp.ts:198): gå igenom ids sorterade på namnets längd, längst först, eller sortera i iText.
- Björn: ja / nej

## 20. I Styret hamnar raderna förskjutna. Under Tustig står "vald av byn" på samma rad som "Maskmund", och "Förvaltare sköter förråden" står på raden efter utan namn. Det ser ut som att Maskmund valde Tustig, fast Maskmund är förvaltaren.

- By: Björndalen (bilderna, bilder/flikar/styre-dator.png, även mobil); vem: Tustig (ålderman) och Maskmund (förvaltare); när: År 14, sommartid; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: Styret (bilden): "Tustig   Ålderman, 1 år" / "vald av byn  Maskmund" / "Förvaltare  sköter förråden"
- Koden: src/ui/flikar/styre.ts:23 (ledaren) och ministrar() (rad 113) lägger fem celler per <li>: pLink, två tomma span, titeln och kort. I template.html:434–435 har .rels fyra kolumner och li har display: contents. Den femte cellen ("vald av byn") hamnar därför i första kolumnen på nästa rad, före Maskmund, och alla rader efter förskjuts. Person.ts:497 säger uttryckligen att listorna ska ha fyra celler.
- Rättelse: Ta bort en av de tomma span i styre.ts:23 och i ministrar() (styre.ts:113), så att raderna får fyra celler.
- Björn: ja / nej

## 21. När en panel är öppen till höger flyttas knapparna +, − och Byn ner över kolonisternas rad och täcker texten på de sista korten ("Sover" under Tuskfast och Kakveig). Kartlagrens knappar göms delvis bakom panelens nederkant. I mobilen täcker knapparna Bovvis kort.

- By: Björndalen (bilderna: seder-, styre-, religion-, teknik-, kronika-, tal-, grannar-dator.png och teknik-mobil.png); vem: Tuskfast och Kakveig (datorn), Bovvi (mobilen); när: År 14, sommartid, dag kl. 12:00; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: Bilden seder-dator.png: under korten "Tuskfast" och "Kakveig" står "Sover" halvt dolt bakom knapparna "+  -  Byn". I dag-dator.png utan panel står knapparna fritt till höger om korten.
- Koden: template.html:119 placerar .zoom i hörnet. Rad 78 ger .ports right: calc(var(--stenar) + 8px + 132px), alltså plats för zoomen till höger. När panelen är öppen flyttar rad 128 (body.hOppen .zoom) zoomen vänster om panelen, men .ports har ingen hOppen-regel, så knapparna hamnar över korten (seder-dator.png, Tuskfast och Kakveig). Mobilbilden (925 punkter bred, alltså över 760px) visar detsamma vid Bovvi; döljningen på rad 130 gäller bara under 760px. Att kartlagrens knappar (.filters) göms bakom panelen är däremot avsiktligt: kommentaren på rad 129 säger "panelen får täcka dem (steg 10.2.62)".
- Rättelse: I template.html: ge body.hOppen .ports ett right som följer zoomens nya plats, eller lägg zoomen ovanför raden när panelen är öppen. Kartlagrens knappar behöver ingen rättning.
- Björn: ja / nej

## 22. Aktiviteten heter alltid "Samlar bär och rötter" i panelen och på kortet, också när personen letar efter stenar till en eldring, flinta eller tändmaterial, eller kommer hem med ägg och hö. Rutans namn säger inte vad personen faktiskt gör eller bär.

- By: 1511 (också 1 och 4634, och Tustig på bilden person-dator.png); vem: Halstig (1511), Torhild (1), Tustig (bilden); när: Sista dygnet, t.ex. 12:26 och 15:15 (1511) och 18:30 (1); hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: by-1511.md: "15:15 Samlar bär och rötter [samla, do] — Byn behöver tändmaterial till elden. Letar efter stenar till en eldring vid stenarna. Tar en korg. | på 119.8,145.3 mot 109.5,145.5 | bär: ägg 4 kg, bälte av rep, korg"; by-1.md: "18:38 Samlar bär och rötter [samla, do] — Byn behöver tändmaterial till elden. Tar en korg. | på 147.5,101.5 mot 147.5,101.5 | bär: ägg 8 kg, bälte av rep, korg"; bilden: "Gör nu: Samlar bär och rötter: på väg / Byn behöver tändmaterial till elden."
- Koden: src/sim/handlingar.ts:96 ger samla det fasta namnet 'Samlar bär och rötter' (med korg: 'Samlar bär och rötter med korg'). val.ts:1256 skickar samma aktivitet till stenarna för att leta stenar till en eldring eller flinta, men ändrar bara why och spot, inte namnet. Statusen visar därför bär och rötter, medan varför-texten säger stenar. Felet ligger i texten, inte i simuleringen.
- Rättelse: Låt status-namnet för samla komma ur målet (stenar, flinta, tändmaterial, bär), där val.ts:1256 sätter v.sok, eller ge det ett allmänt namn.
- Björn: ja / nej

## 23. Familjelistan visar barnet Elaug som "barn" utan någon markering, fast hon inte finns i byn: invånarna är 10, och kolonistraden visar tio personer utan henne. Död eller utflyttad syns inte.

- By: Björndalen (bilderna, bilder/flikar/person-mobil.png); vem: Tustig (familjen: Elaug); när: År 14, sommartid, kl. 12:01; hur vanligt: en person; rättelsen: grundregel; går att mäta: ja
- Raderna: Bilden person-mobil.png, Familjen: "Frörhild partner, Bovvi barn, Frörhild … barn, Elaug barn, Mager barn, Tuskfast barn". Översta raden visar invånarna "10", och kolonistraden: Tustig, Frörhild, Maskmund, Argaut, Tuvi, Bovvi, Frörhild d…, Mager, Tuskfast, Kakveig.
- Koden: src/ui/flikar/person.ts:190 tar kids = childrenOf(s, p), och folk.ts:388 filtrerar s.people utan alive(). Döda och utflyttade har died eller left satta (folk.ts:220) men står kvar i s.people. fam() på rad 194 visar varje barn som en vanlig famp-knapp med "barn" och utan något om att hen är död eller borta. Elaug saknas bland de tio på kolonistraden och står ändå som barn.
- Rättelse: I fam() i person.ts:194: markera den som inte lever (✝ som dodSymbol, eller "död" eller "flyttat" efter rel), eller visa den skilt från de levande.
- Björn: ja / nej

## 24. Förrådets lista till vänster ritas direkt på kartan utan bakgrund. Symbolerna för redskap och material försvinner i skogen och sjön, och summorna (619, 1333) syns knappt. Det gäller på datorn och i mobilen, i ljust och mörkt läge. Kartlagrens knappar och korten har en mörk bakgrund, men inte förrådet.

- By: Björndalen (bilderna dag-dator.png, dag-mobil.png och de mörka); vem: (förrådet); när: År 14, sommartid, dag kl. 12:00; hur vanligt: de flesta byarna; rättelsen: grundregel; går att mäta: ja
- Raderna: dag-dator.png, Förrådet: "Mat 619" och "Bränsle 1333" i svag text över skogen; under Redskap och Material syns bara talen "3, 14, 13, 3, 1, 2, 1" och "5, 1, 5, 5, 5, 76" mot vatten och träd.
- Koden: template.html:98 ger .owned uttryckligen background: none och litar bara på text-shadow för att texten ska gå att läsa. Summorna (.fold .n, rad 103) har dessutom opacity 0.8. Bilderna visar att skuggan inte räcker: "621" och "1333" och symbolerna försvinner mot skog och vatten. .zoom och .filters (rad 120 och 123) har rgba(36,32,29,0.72). Valet att inte ha någon bakgrund ser avsiktligt ut, men det fungerar inte.
- Rättelse: Ge .owned i template.html:98 en halvgenomskinlig bakgrund som kartknapparna har (rgba(36,32,29,0.6–0.72)), och ta bort opacity på .fold .n. Utseendet är Björns val.
- Björn: ja / nej
