# Att sortera inför fas 10

Anteckningar från diskussionschatten efter fas 9 (v524). Inget är bestämt eller inlagt i Färdplanen än. Mer information kommer från Björn; sedan sorteras allt och de godkända punkterna blir steg i fas 10.

## Gaffatejpen i `granskning/gaffatejp-9.9.2.md` (numren där)

Rekommendation från diskussionschatten, inte Björns svar:

- **Först: 23.** Nästan allt nytt i fas 9 ligger på nivån Rädda, så en svältande by brygger vin och hunden äter kött under svält. Nivån ska följa vad saken betyder för byn.
- **Ja, tvingar fram ett resultat:** 3 (elden har fasta reserver och styr andra system), 4, 5 och 9 (inget byggs vid kyla, bara mat bärs in vid svält), 8 (ingen arbetar över förrådets tak; by 2 stod still i dygn utan yxa).
- **Ja, små:** 6, 12, 14, 15, 16, 17, 18, 20, 21.
- **Ja men gå igenom raderna:** 10 (en i taget på många rader; en del kan vara grundregler).
- **Designfrågor för Björn:** 1 (inga motgångar de första 10 dygnen), 2 (högst en motgång per tidsålder), 11 (exakt en vakt per natt), 13 (nybyggare och omgrundning med gratis rötter, spelets säkerhetsnät), 19 (handlarens gränser).
- **Nej:** 22 (lagerplatsernas tillväxt, stabilitet).
- **Eget system:** 7 (Förbättra i fast ordning; stort).

## Annat ur rapporten efter 9.9

- **Gaffatejpsökningen är inte klar:** striden, hälsan, tornadon, branden, religionen, minnet, rykten, framträdandena och matlagningen är inte lästa. Förslag: ett eget steg som läser dem på samma sätt.
- **Promenaden som fastnar** hittades aldrig (troligen i ritkoden). Står inte i designdokumentet. Förslag: ett steg.
- **Torkhuset och vedboden** ritas som tak utan väggar. Förslag: ett litet steg.
- **Svampförgiftningen** dödade 20–28 personer i 16 byar men bryter ingen gräns. Jagas inte; är svampen för farlig är det en fråga om hur världen är (ett balanstal i `fynd.ts`, `giftAndel`/`giftMax`).
- **Jamfor mot versionen före fas 9, `utseende` och prestandan** kördes inte. Hör till 10.9.2 och 10.9.3; jamfor kan köras en gång på MacBooken nu som information.
- **Bildstilens kort** (björnens och vargens anfall, den kolnade stammen) är inte inbyggda. Täcks av 10.9.1.
- **Riktad-kartan** byggs om (kodchatten).

## Grenen

Kärnan i CLAUDE.md och ARKITEKTUR.md (commit c5a4f31) finns bara på `claude/sweet-knuth-f0xnmb` och behöver föras in i main.

## Mer från Björn

### 1. Gaffatejplistan är nu hela `src/sim/` (main 78906e42)

Kodchatten har läst hela `src/sim/` rad för rad (nio hjälpare, 135 filer, drygt 37 000 rader). Listan i `granskning/gaffatejp-9.9.2.md` har nu 99 punkter: fynd 1–23 med tillägg, nya fynd 24–71 efter system och gränsfallen 72–99. Bedömningen är inte prövad av någon annan. Bara skummade: berattelser.ts, varld.ts, typer.ts. Gränssnittet och testerna är inte lästa. Rekommendationen ovan gäller bara 1–23 och behöver göras om för hela listan.

Det viktigaste enligt kodchatten:

- **Åtta fynd lade kodchatten själv in under fas 9**, mest i balansen (märkta "min"). De fick gränserna att hålla men rättar resultatet: +0,6 stridsmod och en gratis sten mot rövarna; en fredlig by försvarar sig lika bra som en krigisk; ingen förälder stannar hos barnen när rövarna kommer; hö, grenar, lera och virke räknas som "till hands" för teknikerna; svampens tabu har en särlösning; minnet behåller en lärdom av varje slag; vedboden byggs inte om den tar sista lagerplatsen; tamdjurens kön är varannan hane och hona.
- **"En i taget" (fynd 10) är större:** bara en person i hela byn kan bygga en station eller möbel åt gången, och samma för att grilla, torka, koka, baka och tända eld. En flaskhals för hela uppbyggnaden.
- **Mycket i fas 9 sker utan att någon väljer det eller lägger tid:** dricka vin, mjölk och te, sätta och plocka örter i krukor, lägga ut äng och hagar, vatten till den som inte kan gå.
- **Fasta tak i stället för förrådsmål:** flinta, mossa, frön, utsäde, rätter och bröd, drycker, mjärdar, torkställningar, flockens storlek.
- **Elden styr andra system på fler ställen:** var hus får stå, om man går in i ett varmt rum, och om kylan alls räknas som en fara.

Övrigt: kartan för riktad byggdes fortfarande om och är inte committad.

(fylls på)
