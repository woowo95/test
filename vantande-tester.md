# Tester som väntar på MacBooken

Det som byggts i molnet och ännu inte gått igenom de långa testerna. Regeln står i CLAUDE.md under "Testerna väntar på MacBooken". Molnet lägger till en rad när ett system är klart; MacBooken kör testerna på den senaste committen, publicerar och tömmer listan.

Raderna skrivs så här: committen, systemet och testerna, till exempel "abc1234 6.11 Fiske: snabbkoll, koll, likhet, riktad --karta, facit".

## Väntar

d4a78e7 6.10.4 Stort test och balans: balans, jamfor, natur, build, utseende, riktad --karta, facit. Fasens Balans, som görs på MacBooken. Läget när den avbröts i molnet:

- Gjort: koll grön på ed66b9a (290 av 290 scenarier). Likhet 4 av 4 byar exakt lika i 720 timmar (30 dygn, 30 år i spelet). Nytt facit och ny samma-koll committade. Tre vaktlarm från balansen rättade i a34edd5. a34edd5 ändrar spelet, så nytt facit behövs igen.
- Balans -- 24 35 på d4a78e7 (24 byar i 35 dygn, 35 år i spelet, fem veckor i verkligheten): vakterna tysta. Median 9 invånare, så gräns 2 håller. Median 0 döda av svält, så gräns 3 håller. Men 3 av 24 byar dog ut (8920, 16839 och 119786, alltså 12,5 %), så gräns 1 är bruten.
- Ta reda på varför och rätta bara det med balanstal, högst tre försök, annars fråga Björn. Huvudmisstänkt är branden (brand.ts), men det är inte bekräftat. 21 av 24 byar hade en brand, nästan alla från en gnista (brand.gnista 0.004, brand.sak 0.35/1/1). By 8920 gick från 494 mat och 1 101 ved till 0 och 0 mellan dygn 9 och 10. By 119786 gick från 352 mat och 930 ved till 0 och 5 mellan dygn 20 och 21. Båda svälte några dygn senare. By 16839 passar inte mönstret: veden fanns kvar, och maten sjönk från 139 till 0 mellan dygn 22 och 28. Fler byar krympte kraftigt utan att dö ut: 135624 från 18 till 2 invånare, 64353 från 19 till 3, 151462 från 21 till 4. Bekräfta först: jämför i s.stat dygn för dygn "brand sak" och "brand ruta" med dygnen då mat eller ved rasar.
- Gräns 4 är inte bedömd. Rådjur 16 av 24, fåglar 19, björnmöten 18, stubbar 24 och vindfälle 23 ser bra ut. Facklans teknik finns i bara 9 av 24 och skogsvården har arbetstimmar i bara 9 av 24; de måste granskas, liksom talgljusen och stråken.
- Sedan: jamfor -- 35 64 --mot e571d1a en gång som information (tar mer än en timme datortid). Npm run natur, build, utseende och riktad -- --karta. Nytt facit. Bocka av 6.10.4 med versionen och publicera spelet. Då är fas 6 klar utom 6.8.1 och 6.9.19, som väntar på Björn.
- I sandlådan på MacBooken kan kommandot tsx stoppas: kör då node --import tsx src/test/fil.ts.

fdfed3a 7.1 Bära mer (7.1.1–7.1.4, v502–v505): snabbkoll, koll, likhet, riktad --karta, facit. Sedan publiceras spelet. riktad gick inte att köra klart i molnet (tidsgränsen).
