# Överlämning: steg 12.1.229, byarna fryser ihjäl (grenen par-kylan)

## Orsaken
**Steg 12.1.76 (de2ad43a), där elden sköts genom valet av aktivitet.** Med 8 byar i 35 dygn (35 år i spelet, fem veckor i verkligheten) dog 6 av 8 byar ut med 52 döda av kyla. Före steget, på c649e349, dog 1 av 8 ut med 22 döda av kyla.

Förut valde elden själv en vaken person och avbröt hen, så fort ingen hämtade ved. Nu kommer raderna `elda` och `tanda` sist på nivå 4 i ARBETEN (val.ts). Där ligger de efter `fryser` (värma sig vid elden), `fryserInne`, `trott`, `maltid` och `ata`. Nivå 2 har dessutom `fryserFarligt` (värma sig), `svag` (sova) och `fryserFarligtInne` (gå in och lägga sig), som alla prövas före elden.

Följden syns i `kylan/eldprov.ts` på by 16839 (vid dygn 26–27, −20 °C): alla nio värmer sig vid en eld med 0–2 i bränsle och har värmen 0.0. Ingen lägger på ved, fast förrådet har ungefär 400 ved. Elden slocknar, och de som fryser blir svaga (hälsan sjunker under `KROPP.svag`) och lägger sig att sova i ett kallt hus. På en natt dör tio av dem (`kylan/frysprov.ts`).

## Rättat och pushat
- 63a3550: kraschen i lagens röst. `ownedStock` och `rikPaMat` räknar nu på hela förrådet, också inom räckhåll. By 16839 kraschade.
- 1aa0ae79: alla textlarm i testbyarna är rättade (fyrfatets genus, husnamnet, siffror i texten, krönikeraden om djuret, träspjutet "med .", resan i beskrivningen, Hydda 2 i siffervakten, "att göra" för tio tekniker). Ett vaktlarm är kvar och inte rättat: **"sak i elden: sten"** (en gång i by 1001 och en gång i by 40596).

## Prövat (WIP, inte klart)
- 145a2cfd: `eldaFryser` och `tandaFryser` på nivå 2, och `fryserFarligt` före `sjuk` och `svag`. Resultat: 5 av 8 byar dog ut, 58 döda av kyla. Det hjälpte inte, eftersom `fryserFarligt` (värma sig) fortfarande kom före elden.
- f9d5d1aa (HEAD): `eldaFryser` och `tandaFryser` före `fryserFarligt`, och `elda` och `tanda` före `fryser` på nivå 4. Bara 5 av 8 byar hann köras: 1 dog ut, 8 döda av kyla (1001: 0, 16839: 5 och återgrundad, 24758: 3, 32677: 0, 8920: 0). Byarna 40596, 48515 och 56434 saknas. Med prov 16839 brinner elden hela natten, men bränslet ligger på 1–4 av 6, och vid −22 °C är värmen ändå 0.0–0.3.

## Mätningarna (8 byar, 35 dygn; döda av kyla är summan för byarna)
| commit | vad | utdöda | kyla |
|---|---|---|---|
| 59318969 | v533 | 3 | 33 |
| 227b51a8 | 12.1-ihopslagningar (nr 37) | 1 | 15 |
| dad4d44f | 12.1.34 | 0 | 8 |
| 8ef60b21 | 12.1.57 | 2 | 16 |
| b3991229 | nr 64 | 3 | 32 |
| c649e349 | 12.1.73 | 1 (+1 med 0 invånare) | 22 |
| afc2b5b1 | 12.1.75, föräldern till 12.1.76 | 7 av 8 körda: 1 (40596) | 17 |
| de2ad43a | **12.1.76** | 6 (+1 med 0 invånare) | 52 |
| 5b77427 + kraschrättningen | varld nu | 7 | median 9 per by |

Ett sidospår, inte följt upp: på varld nu är `kladerSlitna` exakt 15 i alla byar. Det betyder att inga nya plagg slits ut, alltså att inga sys eller bärs; på v533 var talet 15–35. I byarna 1001 och 56434 försvann det mellan 2cb6c68b och f17d374f (steg 12.1.37–12.1.38), men jämförelsen har bara två byar och är osäker. Klädseln från steg 12.1.149 är inte prövad för sig.

## Nästa steg
1. Mät f9d5d1aa färdigt (byarna 40596, 48515 och 56434) mot afc2b5b1.
2. Räcker det inte: elden hålls för låg. Jämför bränslet med det gamla urvalet (en hämtare åt gången, men utan väntan). Pröva till exempel att den som sitter vid elden (`varma`) väljer om när bränslet blir lågt, eller att `fyllMarg` och `fyllPlus` ändras.
3. Se varför inga plagg sys (`kladerSlitna` = 15) och pröva steg 12.1.149 för sig.
4. Rätta vakten "sak i elden: sten".
5. Ta bort WIP-raden i commit-meddelandet och skriv stegets text. Bocka av 12.1.229 och ta bort raden under "Programmeras nu" (den står kvar nu).

## Mätningen
- `kylan/mat.sh <commit> [byar=8] [dygn=35]` checkar ut committen i `$W` (standard `/home/user/wt/b`), kör `src/test/en.ts` för byarna `seedAv(0..n-1)` (1001, 8920, 16839, …), med `$P` byar åt gången (standard 4). Den skriver resultatet till `/home/user/wt/mat/<commit>-<n>-<d>/` och en SUMMA-rad. Sökvägarna gäller molnet och måste ändras på Macen.
- `kylan/stat.sh <mapp> <regex>` visar byns statistik.
- `npx tsx kylan/eldprov.ts <by> <dygn> [från dygn]` visar elden och vad folk gör timme för timme. `kylan/frysprov.ts <by> <dygn>` visar de fyra sista timmarna för var och en som frös ihjäl. `kylan/klprov.ts` visar plaggen.
