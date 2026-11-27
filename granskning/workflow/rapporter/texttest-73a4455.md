# Texttestet (varld 73a44558)

Listorna med det godkända per del ligger i texter-73a4455/.

## personen

Jag har gått igenom berattelser.ts:145–830 (öknamnen, släktnamnen, alla besk_* som BESK_DELAR använder) och koden som fyller i dem (2533–3010), och jämfört med texter.txt (8 byar i 45 dygn, 45 år i spelet). Kontrollerna i textkoll.ts hittar 0 fel, men det finns flera fel som de inte ser. De största: (1) besk_bedrift skriver "Han den bästa i kast mot mål", eftersom sportens titel ("Den bästa i …", sport.ts:426) räknas som en bedrift och inte som en titel (TITEL, berattelser.ts:2699). (2) Det vackras verkan (VERKAN, 2720) räknas ut men skrivs aldrig: de tre varianterna med om: f.verkan (438–440) har ingen {verkan}. (3) besk_fiende säger "är ovänner" och "är osams", men ärkefienden behöver inte vara ömsesidig (relationer.ts:126). (4) besk_minne skriver "var 3 år när hon levde i överflöd": upplevelser som varar en tid passar inte i "var X år när". (5) Det som pågår nu läses som när det hände: "Det var en kall tid när…" (kallt = temperaturen när namnet ges, 2589). (6) Varianterna utan bevis (tillst) säger "det har alla sett" och "det är sant". (7) "Hon är mästare till sysslan": p.tag 'Mästare' används som yrke. (8) Påståenden som inget fält visar: "sedan länge", "har sett X dö", "för länge sedan", "starka nävar", "fler än de flesta" och "minns knappt". Nästan varje besk-mall är åtta omskrivningar av samma påstående; besk_drag2 (2105 gånger) och besk_drag1 (1205) är värst, med stela former som "Utmärkande för X:", "Två egenskaper utmärker" och "dels … dels". I samma 45 dygn valdes besk_binamn 1331 gånger och besk_grundare 1005 gånger, med samma sak åtta gånger. Jag föreslår att ta bort ungefär 70 omskrivningar och lägga till nya varianter som säger något eget ur det simuleringen redan vet: vem som såg det som gav namnet, det förra namnet, hur många av grundarna som lever, hur byn vuxit under ledaren, vad upplevelsen gjorde med personen, gräl och slagsmål mellan ovänner, strider sida vid sida med vännen, ämnet läraren lär ut, mästerverkets görare och fällda vargar, och vad förälderns rykte betyder för anseendet.

**Känslan:** En beskrivning läses som ett register och inte som en berättare: "Två egenskaper utmärker Oso: vig men snabbt trött. Han kom hit när byn grundades. Byn minns att han röjde byns första fält." Varje mening är sann men tom, och den som tittar på flera bybor ser snart att alla meningar har samma form och bara byter ord ("har binamnet", "går under namnet", "det namn byn använder om"). Byråkratiska ord som "Härkomst:", "Partner: …; bästa vän: …", "byns allmänna omdöme", "genomsnittlig" och "har högst färdighet i" bryter järnålderskänslan. Öknamnen och hedersnamnen i krönikan är det bästa här: "Omka den kloka, säger de nu, och Omka låtsas inte höra det men ler" har liv. Men också där upprepas skälet i varje variant, och nästan alla skäl är "kom på hur man kan …". Det som saknas är följder och sammanhang: vem som såg det, vad det kostade, vad som hände sedan och hur det känns. Simuleringen vet mycket av det redan (Rel.minns, Upplevelse.e och t, Styre.folk0 och vintrar, SakMinne, mentorSk), men texterna använder det inte.

## handelser

Jag gick igenom src/sim/berattelser.ts rad 700–1400, från besk_egetHus till p_langtan: beskrivningens ägodelar och boende, eftermälet (e_*), krönikans händelser (k_*), rättegångarna (r_ratt/r_folk), sakernas berättelser (m_*/u_*) och samtalen (p_*). Jag läste också koden som fyller dem: kronikaBer/vaderFalt (berattelser.ts:3020), die (liv.ts:152–164), födseln (liv.ts:204–219), husKlart (bygg.ts:230–241), learn (teknik.ts:325–332), styrets val (styre.ts:380–421), utvisa och rost.ts, strid.ts:1344, varg.ts:610–707, bjorn.ts:176–240, sakMinne/sakBerattelse (berattelser.ts:3069–3150) och pratText (berattelser.ts:3233). Underlaget är texter.txt v3. Kontrollerna hittade inga fel, men det finns många sakfel som kontrollerna inte ser.

Det vanligaste felet är "vid elden" när ingen eld brinner. Ingen krönikamall har fältet eld, men r_ratt har det och använder det ändå inte i sex varianter. Flera texter påstår också något som simuleringen kan motsäga: "De fällde björnen" när jägaren var ensam, "{partner} vakade hos {helt} till slutet" när döden kom plötsligt, "Byn valde" när makten ärvdes eller vanns i strid, "Nu kan byn leda byn", "Precis före kylan" när det redan är kallt, "drev ut honom efter att ha störtats" (där det är fel person som syftas på) och "säger {namn}" om en gjord sak när den som gjorde den är död.

Omskrivningarna är tydligast i besk_utkant, besk_fattig, besk_rik, besk_inget, besk_arv, e_minns, p_plats och p_langtan, och i nästan varje k_-mall, som har tre till fem varianter med samma påstående i ny ordföljd. Regeln om minst åtta varianter per mall gör att de stryks bara om regeln ändras (folk.ts:2085, 2236, 2281, 2348). Annars blir scenariot berattelser rött.

De nya varianterna bygger på det simuleringen redan vet men inte skickar till texten. Det är vem barnet är uppkallat efter, åska vid födseln (ett tecken i spelet), tvillingar och första barnet. Hur många flintförsök den första elden tog och stenringen runt den. Vilka som hjälpte till att bygga huset och hur många som nu kan sova under tak. Om den skadade vann slagsmålet och var såret satt. Hur ledaren fick makten och vem som ledde förut. Vapnet och blodspåret vid den första vargen. Vem som bär den dödas namn och var graven ligger. Hur många vintrar ledaren har lett byn, och om föräldern som egenskapen kommer från är död. Varje ny variant har sitt fält och raden där värdet finns.

**Känslan:** Krönikan läses som en lista med formler. "Det var vår när …", "Byn kommer ihåg dagen då …", "Ingen glömmer när …" och "Byn talade länge om …" kommer tillbaka i nästan varje mall. Textminnet ser bara de tre senaste raderna i samma mall, så spelaren som scrollar krönikan läser "Det var istid när" om ett hus, en död, en ledare och en varg i följd. Varianterna i en mall säger nästan alltid bara att händelsen hände, vem som gjorde det och vilken årstid det var. Det finns sällan något om vad det kostade, vem som var med eller vad som hände sedan, fast simuleringen vet det: byggarna, vinnaren, vapnet, försöken, namnet barnet fick efter någon. Eftermälet (890 läsningar) slutar oftast med "Vid elden berättar man fortfarande om henne" eller "De som var med minns hur det var när han levde", och efter några döda känns det tomt. De bästa raderna är de konkreta: "Ingen grät som Ikel när Ira dog av kyla", "Ord blev slag". Sakfelen ("Elden brann lågt den kvällen" fast elden var släckt, "De fällde björnen" om en ensam jägare) bryter illusionen. Samtalen är begripliga men stela, och några är rena omskrivningar av varandra, så att samma två bybor "berättade för", "fick veta av" och "sa till … att det finns" om vatten.

## byn

Jag har gått igenom berattelser.ts:1400–2134 (samtalen p_*, relationerna r_*, k_gift, k_flytt, k_rovlager, k_flyttSkal, berättelsen om tiden borta b_*, handeln h_*, framträdandena f_* och matcherna m_*) och koden för krönikan (3011–3043) och mästerverken (3044–3151). Jag läste också hur fälten fylls i: pratText och relationText (berattelser.ts:3233–3257), framber.ts, matchber.ts, handelsber.ts och ui/borta.ts. Underlaget är texter.txt. Inga filer har ändrats.

Det som oftast blir fel är fälten, inte orden.
- {kund} i handeln innehåller " för byn". Det ger texter som "Ylvbjörn för byn gick fram till Gerdvald för byns räkning" och "Byn skickade Fahild för byn".
- {vara} står utan artikel ("ville ha höna", "Det var järnkniv Hildulf ville ha").
- {bud} fylls i som "en" ("Efter en bud").
- {amne} och {motiv} slutar med en bisats ("Lofrid, som är en skvallerbytta"). Därför går det fel när mallen fortsätter efter fältet ("som var påhittig till trumman").
- Framträdandena säger "vid elden" och "runt elden" också när det är på scenen. "Nästan hela byn" väljs från sex lyssnare, hur stor byn än är.
- I matcherna står "vinnarna" i plural fast en enda vann. glad är alltid sant, så tre varianter i m_slut väljs aldrig.
- b_alder skriver "år 13 till 13". b_ar och b_alder börjar första stycket med "Året därpå" eller "Sedan".
- "Byn fick gå sin väg utan honom" i k_flyttSkal är ologiskt. k_rovlager står i plural för en ensam rövare.
- Vargdräparens rad säger "den" om ett spjut och använder sakens obestämda form.

Många mallar har fyra eller fem varianter som säger exakt samma sak, till exempel b_ovrigt, b_arLugnt, m_vinst, m_publik, f_publik, r_kemi*, r_bekant och p_vardag. Det är kravet på minst åtta varianter per mall (folk.ts:2085, fas13.ts:95) som driver fram dem.

De nya varianterna bygger mest på fält som redan finns i simuleringen men inte skickas till mallarna:
- relationerna: bästa vännen, romantiken, ledaren, samma yrke, äktenskapets längd och gjort illa i ett utbrott
- framträdandena: scenen, att gärningen förstorades eller tonades ned, och att den det handlade om själv stod på scenen
- matcherna: tvåan, samma vinnare igen och om det blivit mörkt
- tiden borta: första året, antalen per år, vad småsakerna var och årstiden när man gick

Obs: BORT-listan tar mallar under åtta varianter. Det kräver att regeln i folk.ts:2085 och fas13.ts:95 ändras först, annars blir scenariot rött.

**Känslan:** Matcherna och framträdandena läses tusentals gånger, och där märks det mest. Efter några matcher vet spelaren redan vad som kommer: "Det var en hård match. Till slut vann X. Efteråt var vinnarna på gott humör, medan de andra surade en stund." Meningarna säger inget om just den här matchen. Vem kom tvåa, blev det mörkt, vann samma person som förra gången? Framträdandena upprepar sig: först "Torndo kvad om Ulhild, som är påhittig", sedan "Det handlade egentligen om Ulhild". Publiken räknas på fyra sätt som alla bara säger ett tal.

Relationerna är bättre, eftersom de har många fält (gräl, slagsmål, barn, samtal). Men en vanlig bekant beskrivs med fem varianter av "de känner varandra inte så väl". Där finns plats för fakta: att de gör samma arbete, att den ena leder byn, att de är släkt men ändå ovänner.

Handelns berättelse låter som en maskin så fort namnet bär " för byn" och varan saknar artikel. Tiden borta har fina inledningar, men stycke efter stycke börjar med "Så kom år 5. ... Sex mindre saker hände också.", och det säger inget om vad som hände.

Det som fungerar bäst är varianterna med ett villkor som bär en sann detalj: "Gräl har de haft, men…", "Det var istid när…", "I snön lämnade…". Fler sådana, och färre omskrivningar utan villkor, skulle göra mest skillnad.

## loggen

Jag har gått igenom loggens mallar (l_*, h_*) och mallarna från de nya systemen (k_*, b_*) på raderna 2134–2502 i src/sim/berattelser.ts. Jag har också läst koden som fyller dem: byte.ts, samtal.ts, relationer.ts, rykten.ts, minne.ts, teknik.ts, steg.ts, strid.ts, styre.ts, resa.ts, tamdjur.ts och bildsten.ts. Samtalens ämnen (samtalAmne, pratText) och relationText har jag läst och jämfört mot texter.txt.

Loggens mallar har nästan inga villkor: l_vanner, l_bastaVanner, l_ovanner, l_rivaler, l_arke, l_rykte och l_lart (4042 gånger) säger åtta gånger exakt samma påstående. Det beror på att scenarierna kräver minst åtta varianter per mall (folk.ts:2085 och 2236). Samtidigt har platserna som skriver raderna gott om värden som texterna aldrig får:
- samtal.ts:250 vet om paret varit ovänner, slagits sida vid sida eller tröstat varandra.
- relationer.ts:166 vet om rivaliteten gäller yrket eller samma kärlek.
- rykten.ts:414 vet vem som berättade, vad som hände och om det var påhittat.
- styre.ts:574 vet om domen var för hård, för mild mot en närstående, och om anklagelsen var falsk.

De flesta nya varianterna bygger därför på sådana nya fält, med fil:rad där värdet finns.

Allvarliga fel jag hittade:
- **Fel tempus och fel ordföljd i k_ratt:** {straff} är presens ("tillrättavisar") i krönikan, och "dömde till böter honom" blir fel ordföljd.
- **Ogrammatiska fyllningar i bildstenarna:** "fick publiken med sig i föreläsning", "en man böjd över hur man kan snickra", "en kvinna med teater i händerna", "anden Stendis som flintberget över de troende".
- **Fel orsak i l_slagsmal:** "slogs uppror" och "slogs en ledarstrid" (rost.ts:352).
- **Tre fel i k_resa:** "en färd för att se platsen till Östernäs" (resa.ts:167), "kom hem med" om ett byte inne i byn, och "Det var istid när …" som blir felböjt.
- **Personens rader i k_ratt stämmer inte:** de säger att personen själv stått inför tinget, när det var föräldern som dömdes (foralderDomd).
- **Varianter som påstår något falskt:** l_rivaler säger "gör samma arbete" fast rivaliteten kan gälla en kärlek, l_lart säger "såg på när {av} arbetade" fast de flesta lär sig i samtal, och l_svartSjuk säger "Kylan tog {namn}" vid vilken sjukdom som helst.

Inga filer under src/, test/ eller bildstil/ är ändrade, och inga egna skript är skapade.

**Känslan:** Loggen läses som en lista med samma påståenden. "X och Y har blivit nära vänner", "goda vänner", "har hittat varandra" och "söker sig till varandra" ger spelaren inget nytt när hen märkt mönstret. De omskrivna varianterna låter dessutom konstlade ("{namn} har fått en vän i {med}, och {med} i {namn}", "Ett byte mellan A och B: …"). Bytena och lärdomarna är de rader som syns mest, och de är rena faktarader där ordföljden byts. Det fungerar som bokföring men aldrig som berättelse.

Krönikans k-mallar har mer liv (röken som syntes långt, askan som låg kvar). Men de används sällan, och flera av dem blir ogrammatiska när fälten fylls i. Bildstenarna har de mest stämningsfulla texterna, men just där syns felen mest ("en kvinna med teater i händerna").

Det som saknas är det som gör en händelse till just den här händelsen: att två ovänner blev vänner, att den som gav gåvan var ens bästa vän, att domen var för hård, att flintan hittades i mörkret. Spelet vet allt det redan.

## ovriga

Jag har gått igenom texterna utanför BERATTELSER: personloggen (personlogg.ts och tillägget h_ont/h_gott i personRader), notiserna (NOTISER och alla anrop till notis() i src/sim), krönikans rader (kronika() och kronikaVid() i src/sim, KRONIKA_KAT och HISTORIK_TAL) samt berättelserna från framber, matchber och handelsber (mallarna f_*, m_* och h_*). Underlaget är texter.txt/json och en dumpning av krönikan, notiserna och personloggen i de sparade testbyarna 1-40, 1511-45 och 4634-45 (1108 rader i krönikan, 2004 notiser och 647 rader i personloggarna). Skriptet src/test/zz_dump.ts är borttaget, och inget under src/, test/ eller bildstil/ är ändrat.

Det viktigaste:
1) Textkontrollerna missar mycket, eftersom notiserna och krönikan prövas som hela meningar med platsen -2 och bara sex exempel sparas. Fel som syns direkt i byarna har kommit igenom: "har brutit hjärta", "Där görs plankor." utan något som "där" syftar på, "Man går på toa", "kunde sköld", "År 45: År 45, med att …", "lagen Skatt", "tolv hatt av halm", "Efter en bud", "ville ha höna" och "Kolfast för byn gick fram till … för byns räkning".
2) Flera texter påstår sådant som inte stämmer i spelet. Handlarens filt ligger utanför byns område, inte "nära elden". Framträdandena kan hållas vid scenen, och texten säger ändå "vid elden". "Nästan hela byn" kontrolleras bara mot fler än fem lyssnare. När ett hus blir klart i timkollen får en godtycklig bybo äran av att "satte sista biten". Det nyfödda barnet får sin egen födelse i personloggen, med en känsla till ("Hon är stolt över det."). Domen står i presens och upprepar namnet på domaren, som också är den drabbade.
3) Upprepningen är störst bland notiserna och i krönikan, inte i mallarna. Matchnotisen är 41 % av alla notiser och nästan alltid "X vann brottningen." I krönikan finns 148 rader av typen "X reste en bildsten om en uppfinning", 189 handelsrader och 119 rättegångar. Nyheterna från världen upprepar ortens namn i varje mening. Notiserna och personloggens rader är fasta strängar utan varianter, så Björns önskan om variation når dem inte. De borde bli mallar (n_*, pl_*) med samma villkor som resten.
4) Tillägget i personloggen (h_gott används 20 629 gånger, h_ont 6 117) väljs bara efter personligheten och humöret, inte efter händelsen. Därför blir ett bröllop eller en födelse "en liten glädje som räckte en stund", och den som slog någon "tar det med fattning".

**Känslan:** En spelare som öppnar notiserna möter först en lång rad likadana meningar: "Frörhild vann brottningen.", "Halar vann brottningen.", "Bina i ett vildbo blev uppretade av arbetet vid boet." (55 gånger) och "X väntar barn." Det känns som ett protokoll, inte som en by. Krönikan har fina stycken, som de episka uppfinningarna ("Tukveig grävde och fyllde igen, grop efter grop …") och trons berättelser, men de drunknar bland bildstenar, byten och tillrättavisningar i presens, och här och där står en uppenbar maskinmening ("kunde sköld", "Där görs plankor.", "År 45: År 45"). Personloggen är det mest personliga, men tillägget efter varje rad är så allmänt att det snart låter tomt. Samma "Det var en liten glädje, men den räckte en stund." står efter ett bröllop, en ny färdighet och ett nytt yrke, och det nyfödda barnet "tänker gärna tillbaka" på sin egen födelse. Berättelserna om handeln och framträdandena läses bäst. Där finns repliker och en tydlig gång i det som händer, men små grammatikfel ("ville ha skrivet blad", "Efter en bud") och upprepade namn ("tyckte sämre om Dardgerd efteråt" när Dardgerd redan är den som uppträdde) drar ner dem.
