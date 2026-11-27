# Designdokumentet om fas 14 (utdrag, 2026-11-27)

## Färdplanen 14.1 Handeln i byn (allt byggt, v540)
14.1.1 Rummets finhet: ett tal per rum ur möblernas kvalitet, väggarnas och golvets material, ytan per person, pyntet, ljuset, värmen och smutsen (rum.ts, balanstal, rad i TAKTER). Syns i rummets ruta. Scenario: finhet.
14.1.2 Städa: handling i ACTS och ARBETEN som tar bort smutsen inne (blod, toaletternas fläckar), en ruta på 30 s. Poängen växer med hur mycket smutsen drar ner finheten och hur äcklade de som är där blir. Scenario: stada.
14.1.3 Förväntningarna: varje person förväntar sig en finhet efter rikedom och ställning; rum under förväntan där man sover eller äter ger dålig tanke, över ger god; finheten går in i husets pris. Scenario: forvantan.
14.1.4 Dagsarbetet: lönen blir en anställning en gång per dygn för ett bestämt arbete, med lönesamtal; samma system för byn, kyrkan och personerna; lönelagen säger hur mycket byn betalar; betalda tjänster är samma anställning. Skickligheten avgör vad man hinner. Scenarier: lon, tjanster. Kör npm run likhet.
14.1.5 Företaget: registret VERKSAMHETER (servering, dryck), ett företag är en ägare (person, byn, kyrkan) med hus och verksamheter men ingen egen kassa. Att starta är ett projekt med en poäng; husen byggs med byggsystemet. Rad i TAKTER. Scenario: foretag.
14.1.6 Kassan: disken är en station där kunderna väntar i kö; att betjäna är ett arbete vars poäng växer med dem som väntar och hur länge. Byborna köper mat och dryck i serveringen när det är värt priset. Platshållare för disken. Scenario: kassa.
14.1.7 De anställda: ägaren anställer med dagsarbetet när hens timmar inte räcker och ett arbete i företaget är värt mer än lönen. Scenario: anstalld.
14.1.8 Affären: säljer det som står i förvaringen i sitt rum; möbler för att visa varor blir stationer. Scenario: affar.
14.1.9 Kundernas val och konkurrensen: kunden väljer efter pris, kvalitet och finhet mot förväntan; liknande företag delar kunderna. Ägaren ändrar pris och kvalitet efter hur det går. Scenario: konkurrens.
14.1.10 Företagets rykte: varje besök ger ett omdöme; ryktet sprids i samtal och till grannbyar. Scenario: foretagsrykte.
14.1.11 Gästerna som kommer för företagen: från byar efter relationen och ryktet; gott rykte drar rikare gäster och gäster med ämbeten hellre än fler; bemötandet ändrar relationen. Scenario: foretagsgast.
14.1.12 Fler verksamheter: nattlogi, stall och djurhandel i VERKSAMHETER; ett företag lägger till en verksamhet med samma poäng som en start. Scenario: verksamheter.
14.1.13 Sälja och stänga: ett företag som länge tjänar mindre än ägaren kunde tjäna på annat säljs på husmarknaden eller stängs, och husen byter funktion. Scenario: stanga.
14.1.14 Marknader: en plats och en dag när många möts och handlar. Scenario: marknad.
14.1.15 Köpa i stället för att samla: rad i ARBETEN (Skaffar genom byte) under samma behov som samlandet; poängen är vad en timme ger med gång och pris, så den med silver köper och den fattiga samlar; inget att köpa = noll. Maten köps upp till familjens gräns. Scenario: kopabuffert. Kör npm run likhet.
14.2.5 (Balansen, mål): företagen och dagsarbetet ska finnas i de flesta byarna utan att ta timmarna från maten och veden, och måtten för arbetsdelningen i npm run dynamik ska inte falla jämfört med fas 13.

## Fliken Människan, Ekonomi och handel
**Dagsarbetet (14.1.4).** Lönen är ett och samma system för byn, kyrkan och personerna. Den som betalar anställer en person en gång per dygn (ett år i spelet) för ett bestämt arbete: ett uppdrag med slut (bygga ett hus, brygga en sats) eller ett arbete i en verksamhet (servera, vakta). Personen arbetar tills uppdraget är klart eller så långt hen hinner under dygnet. Varje anställning är ett lönesamtal. Arbetaren begär det hen kan få på annat håll; den som betalar bjuder högst vad arbetet är värt, efter hur mycket personen hann och hur bra det blev förra gången. Byn anställer genom ledaren eller ämbetet, lönen ur budgetdelen. Lönelagen säger hur mycket byn är beredd att betala. Betalda tjänster (vård, undervisning, bygghjälp) är samma anställning.

**Företagen (14.1.5, 7, 9, 12, 13).** Ett företag är en ägare, en person, byn eller kyrkan, med ett eller flera hus och några verksamheter. Ingen egen kassa: det som tjänas och betalas är ägarens.
- Verksamheterna är rader i VERKSAMHETER: servering, dryck, nattlogi, affär, stall, djurhandel. Varje rad säger vad den behöver (rumstyp och stationer), vad den säljer och vilka arbeten den har. En taverna = servering + dryck.
- Husen byggs, byggs ut och byter funktion med byggsystemet. Företaget följer husen vid arv.
- Att starta ett företag eller lägga till en verksamhet är ett projekt med en poäng: vad byborna och gästerna vill köpa som ingen säljer eller säljer dåligt, vad personen kan, vad hen har råd att bygga och personligheten.
- De anställda: ägaren börjar ofta ensam och sköter alla arbeten. När hens timmar inte räcker och ett arbete är värt mer än lönen anställer hen.
- Priset sätter ägaren ur värdet och efterfrågan, och ändrar det efter hur det går.
- Kunderna och konkurrensen: varje kund väljer det bästa för just hen, efter pris, kvalitet och finhet mot förväntan. En billig taverna och en fin restaurang kan finnas bredvid varandra. Liknar två företag varandra delar de kunderna; det svagare tjänar mindre och sänker priset, höjer kvaliteten, byter verksamhet eller stänger. Hur många företag av en sort det finns avgörs av efterfrågan.
- Sälja och stänga: ägaren jämför vinsten de senaste åren med vad hen kunde tjäna på annat. Är den sämre länge säljs företaget på husmarknaden (gott rykte gör det värt mer än husen). Vill ingen köpa stängs det, och husen byter funktion.
- Silvret: när bybor handlar med varandra flyttas silvret bara runt i byn. Det gäster betalar är nytt silver för byn.

**Kassan och affären (14.1.6, 14.1.8).** Disken är en station i ett rum med verksamheten. Ingen står där hela tiden. Kunden går till disken och väntar framför den, flera står i kö. Att betjäna är ett arbete i ARBETEN, vars poäng växer med dem som väntar och hur länge. Den anställda gör verksamhetens andra arbeten (brygga, bära, städa) och går till disken när någon väntar. Den som väntat för länge går, och det drar ner omdömet. Affären säljer det som står i förvaringen i sitt rum (hyllor, kistor, ställ, möbler för att visa varor) för ett pris; kunden tar saken och betalar vid disken.

**Köpa i stället för att samla (14.1.15).** En rad i valet av arbete under samma behov som samlandet (mat och ved under Försörjning och mot taket på Förbättra, och det ett projekt saknar). Vägs efter vad en timme ger: varorna man får för en timme att gå dit och handla, och priset vägt med vad silvret är värt för personen. Den rika köper och får tid till annat, den fattiga samlar. Inget att köpa = noll. Maten köps upp till familjens gräns för egen mat.

**Gästerna och ryktet (14.1.10, 14.1.11).** Varje besök ger ett omdöme: kvaliteten, priset mot väntat, finheten mot förväntan och väntetiden. Omdömena blir ryktet, som sprids i samtalen och till grannbyarna. En gäst är en person med arbeten, ämbeten och silver. Gästerna kommer från byar med relation; ovänner besöker aldrig varandra; lite dålig relation skickar enklare gäster. Gott rykte drar rikare gäster och gäster med ämbeten hellre än fler. Bemötandet ändrar relationen, mest för en gäst med ämbete.

## Björns allmänna regler (CLAUDE.md, i korthet)
- Grundregler, inte gaffatejp: koden beskriver hur världen är; ingen kod som tvingar fram ett resultat.
- System, inte regler: människornas val kommer ur poäng och register, inte hårda regler ("bara", "alltid", "högst", "först … sedan").
- Verkan, inte bara saken: en sak, station eller handling är klar först när den gör det den finns till för.
- Hela resurser: inga resurser i decimaler; allt som går åt, ges, byts eller fås är hela saker (slitage och arbete mot nästa sak får ha decimaler).
- Samma regler för alla saker (13.9.9): allt som går att äga köps, byts, ges och lånas efter samma regler.
- Skickligheten (13.9.8): varje ny handling har sin färdighet (ovar i ACTS) för fart och kvalitet.
- Allt räknas per tid, aldrig per slag; varje system har en rad i TAKTER; levande läge och ikappräkning räknar likadant.
- Arbetstider: liten sak 2–4 min, stor högst 5, station 10–20, en tur att samla 3–10 riktiga minuter.
- Byarna förändras: inget som drar mot mitten.
