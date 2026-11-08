# Tester som väntar på MacBooken

Det som byggts i molnet och ännu inte gått igenom de långa testerna. Regeln står i CLAUDE.md under "Testerna väntar på MacBooken". Molnet lägger till en rad när ett system är klart; MacBooken kör testerna på den senaste committen, publicerar och tömmer listan.

Raderna skrivs så här: committen, systemet och testerna, till exempel "abc1234 6.11 Fiske: snabbkoll, koll, likhet, riktad --karta, facit".

## Väntar

fe6995a 9.1 Kartan växer (240 × 240) och 9.2.1–9.2.8: koll, likhet, riktad --karta, facit. Det stora testet avbröts två gånger; första körningen (e4905b2) gav 11 fallerande scenarier som rättats sedan. Publiceras när testerna är gröna. Graferna (9.2.8) är inte provade i webbläsaren. 9.2.3 (mörkt läge) väntar på npm run utseende.
