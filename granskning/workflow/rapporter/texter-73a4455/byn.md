# Texterna, delen byn (varld 73a44558)

Godkänt av redaktören. Varje rad anger mallen och raden i koden (fil:rad) på commit 73a44558. Bygg in allt i listan; en ändring som inte längre passar koden hoppas över och nämns i commiten.

**Läsarens sammanfattning:** Jag har gått igenom berattelser.ts:1400–2134 (samtalen p_*, relationerna r_*, k_gift, k_flytt, k_rovlager, k_flyttSkal, berättelsen om tiden borta b_*, handeln h_*, framträdandena f_* och matcherna m_*) och koden för krönikan (3011–3043) och mästerverken (3044–3151). Jag läste också hur fälten fylls i: pratText och relationText (berattelser.ts:3233–3257), framber.ts, matchber.ts, handelsber.ts och ui/borta.ts. Underlaget är texter.txt. Inga filer har ändrats.

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

## Rättelser

- [h_start, src/sim/berattelser.ts:1884 (fältet: src/sim/handelsber.ts:57)] {kund} = b.an, som för byns räkning är "Namn för byn" (behov.ts:841). "För byn" kommer två gånger, och "höna" saknar artikel. Samma fel finns i h_start[7] ("Byn skickade Fahild för byn"), h_arg[36] ("Fahild för byn talade för hela byn") och h_arg[37] ("sa Hildulf för byn").
  - Nu: Ylvbjörn för byn gick fram till Gerdvald för byns räkning. Byn behövde höna.
  - Blir: { t: '{Kund} gick fram till {handlare} för byns räkning. Byn behövde {envara}.', om: f => f.byn === true && f.salj !== true }, där kund = namnet utan ' för byn' när affären gjordes för byn (behov.ts:841, handelsber.ts:57). Samma fält rättar h_start[7], h_arg[36] och h_arg[37].
- [h_start, src/sim/berattelser.ts:1878, 1880, 1882 (och h_arg:1908, 1905)] Varan står utan obestämd artikel. vara = sakNamn(k).toLowerCase() (handelsber.ts:54).
  - Nu: Igvald gick fram till Maar och ville ha skrivet blad. / Det var järnkniv Hildulf ville ha. / Guar märkte hur mycket Hildulf behövde järnkniv.
  - Blir: Nytt fält envara = `${enEtt(k)} ${vara}` (ord.ts:97). '{Kund} gick fram till {handlare} och ville ha {envara}.' / '{Kund} satte sig vid filten mitt emot {handlare}. Det var {envara} {kund} ville ha.' / '{Handlare} märkte hur mycket {kund} behövde {envara}.'
- [h_slut, src/sim/berattelser.ts:1951 (fältet: src/sim/handelsber.ts:57)] bud = heltOrd(n) ger "en", men bud är neutrum. Villkoret f.bud !== 'ett' är därför verkningslöst.
  - Nu: Efter en bud var de överens, och de skakade hand.
  - Blir: bud: heltOrd(b.forsok!.length, true) (handelsber.ts:57)
- [h_slut, src/sim/berattelser.ts:1952 och 1959] När kunden säljer (salj) har kunden burit dit varan och får silver. "Bar hem det" och "handlaren packade tillbaka varan" stämmer då inte.
  - Nu: De blev överens, och {kund} bar hem det. / {Handlare} packade tillbaka {vara}, och {kund} gick hem utan något.
  - Blir: { t: 'De blev överens, och {kund} bar hem det.', om: f => f.avbruten !== true && f.salj !== true } och { t: '{Handlare} packade tillbaka {vara}, och {kund} gick hem utan något.', om: f => f.avbruten === true && f.salj !== true }
- [f_start, src/sim/berattelser.ts:1971] {amne} slutar med en bisats ("X, som är Y", framtradande.ts:171). Det som följer hamnar i bisatsen: det är Lofrid som "gav varje person en egen röst".
  - Nu: Ehild spelade teater om Lofrid, som är en skvallerbytta och gav varje person en egen röst.
  - Blir: { t: '{Namn} gav varje person en egen röst och spelade teater om {amne}.', om: f => f.form === 'teater' }
- [f_start, src/sim/berattelser.ts:1972] Samma bisatsfel: "påhittig till trumman".
  - Nu: Hilvid, Odis och Avid sjöng om Kolfast, som var påhittig till trumman.
  - Blir: { t: '{Namn} tog {inst} och sjöng om {amne}.', om: f => f.form === 'sang' }
- [f_bud, src/sim/berattelser.ts:1997] Namnet står två gånger, och med en grupp blir det "tro som Hilvid och Odis själv". Framber har inget fält för pronomen.
  - Nu: Guna ville att de andra skulle tro som Guna själv.
  - Blir: { t: '{Namn} ville vinna fler för tron.', om: f => f.bud === 'tro' && !f.kyrka }
- [f_mott, src/sim/berattelser.ts:2024] Namnet upprepas i samma mening.
  - Nu: Åro tappade tråden flera gånger, och publiken tyckte sämre om Åro efteråt.
  - Blir: { t: '{Namn} tappade tråden flera gånger, och det glömde publiken inte i första taget.', om: f => f.dalig === true && f.ner === true }
- [f_bud, src/sim/berattelser.ts:1979] Ologiskt. När budet gäller en person är {amne} redan den personen, så "egentligen" stämmer inte och meningen upprepar f_start.
  - Nu: Torndo kvad om Ulhild, som är påhittig. Det handlade egentligen om Ulhild, och alla förstod vad Torndo menade.
  - Blir: { t: 'Det var ingen slump att det handlade om {om}. {Namn} ville påverka vad byn tyckte.', om: f => f.bud === 'person' }
- [f_publik, src/sim/berattelser.ts:2003–2004 (också f_start:1965, f_mott:2014 och 2021, f_inget:2041, 2042, 2045 och 2048)] Framträdandet hålls på scenen när byn har en (framtradande.ts:310–362, FramMinne.scen), och ingen eld behöver brinna där. Texterna säger "vid elden" och "runt elden" också då.
  - Nu: Tre satt runt elden och lyssnade.
  - Blir: Nytt fält scen = m.scen !== undefined (framber.ts:21). Eldvarianterna i f_start, f_publik, f_mott och f_inget får && !f.scen, till exempel { t: '{N} satt runt elden och lyssnade.', om: f => Number(f.nTal) > 1 && !f.scen }, och scenen får en egen variant: { t: '{N} satt framför scenen och lyssnade.', om: f => Number(f.nTal) > 1 && !!f.scen }
- [f_publik, src/sim/berattelser.ts:2007] Villkoret nTal > 5 bryr sig inte om hur stor byn är. I en by med trettio vuxna är sex inte nästan hela byn.
  - Nu: Nästan hela byn var där, sex stycken.
  - Blir: Nytt fält andel = m.n / antalet vuxna när framträdandet hölls (sparas i FramMinne). { t: 'Nästan hela byn var där, {n} stycken.', om: f => Number(f.andel) >= 0.8 }
- [m_slut, src/sim/berattelser.ts:2092–2093] "Vinnarna" står i plural också när en enda vann en brottning eller ett kast. Dessutom är glad = m.glad > 0 alltid sant när någon vann (sport.ts:147), så [5]–[7] väljs aldrig.
  - Nu: Efteråt var vinnarna på gott humör, medan de andra surade en stund.
  - Blir: { t: 'Efteråt var {vinnare} på gott humör, medan de andra surade en stund.', om: f => f.glad === true }. glad ersätts med något som kan vara falskt, till exempel lag, kort eller nPub.
- [m_vinst, src/sim/berattelser.ts:2088 (fälten: src/sim/matchber.ts:29)] I en lagsport är {vinnare} "laget med X och Y". "Såg nöjd ut" blir då fel i antal, eftersom spelarna är flera.
  - Nu: Laget med Hildulf och Lofrid vann och såg nöjd ut.
  - Blir: Nytt fält lag = !!vl (matchber.ts). { t: '{Vinnare} vann och såg nöjd ut.', om: f => f.skrall !== true && !f.lag } och { t: '{Vinnare} vann, och spelarna såg nöjda ut.', om: f => f.skrall !== true && !!f.lag }
- [m_vinst, src/sim/berattelser.ts:2084] "Planen" i betydelsen spelplan är ett modernt ord.
  - Nu: Torndo var bäst på planen och vann.
  - Blir: { t: '{Vinnare} var skickligast och vann.', om: f => f.skrall !== true && f.favorit === true }
- [m_pris, src/sim/berattelser.ts:2104–2111] Genitivet görs med ett s efter namnet, så att ett namn på -s blir "Hanss". "Sin" och "den" står oavsett sakens genus ("sin träspjut ... den"), och {givare} upprepas.
  - Nu: {Givare}s {pris} / {Givare} hade satt upp sin {pris} som pris, och {givare} tog tillbaka den själv.
  - Blir: Nya fält givares = gen(avNamn) (ord.ts:209), sin = sinOrd(SAKER[k]) och den = bestamd(...)[1]. { t: '{Givare} hade satt upp {sin} {pris} som pris och fick behålla {den} själv.', om: f => !!f.prisKvar && !!f.sjalv }, och alla '{givare}s' blir {givares}.
- [b_alder, src/sim/berattelser.ts:1844–1845 (fälten: src/ui/borta.ts:82)] När tidsåldern ryms i ett enda år står samma år två gånger.
  - Nu: Våren kom, och varade från år 13 till 13. / Sedan kom sommaren (år 14 till 14).
  - Blir: Nytt fält aren = fran === till ? `år ${fran}` : `år ${fran} till ${till}` (borta.ts:82). '{Arstid} varade {aren}.' / 'Sedan kom {arstid} ({aren}).' och likadant i alla b_alder-varianter
- [b_ar, src/sim/berattelser.ts:1819, 1820 och 1822 (också b_alder:1841 och 1845)] Den första gruppen (borta.ts:68–74) är året eller tidsåldern då man gick. "Året därpå", "Så gick byn in i" och "Sedan" stämmer inte för det första stycket.
  - Nu: Året därpå var år 3. / Sedan följde sommaren, år 14 till 20.
  - Blir: Nytt fält forsta = g === grupper[0] (borta.ts:81). Varianterna med 'därpå', 'sedan' och 'så' i b_ar och b_alder får om: f => !f.forsta. Nya varianter: { t: 'Samma år som du gick, år {ar}:', om: f => !!f.forsta } i b_ar och { t: '{Arstid} hade redan börjat när du gick.', om: f => !!f.forsta } i b_alder
- [b_inledning, src/sim/berattelser.ts:1811] Meningen ställs upp som en jämförelse också när talen är lika. Den väljs dessutom för ofta (⚠ i texter.txt).
  - Nu: Tre år gick. När du gick bodde tre i byn, och nu bor tre där.
  - Blir: { t: '{Ar} år gick. När du gick bodde {fore} i byn, och nu bor {nu} där.', om: f => f.nuTal !== f.foreTal }
- [k_flyttSkal, src/sim/berattelser.ts:1790] Ologiskt: det är personen som går, inte byn.
  - Nu: Byn fick gå sin väg utan honom, för ”Förlorade sin mor, Ymgerd” tyngde mer för var dag.
  - Blir: { t: '{namn} kunde inte stanna, för ”{tanke}” tyngde mer för var dag.', om: f => !!f.tanke && !f.byn }
- [k_flyttSkal, src/sim/berattelser.ts:1785–1790 (fältet: flyttskal.ts)] {tanke} är humörets etikett i presens ("Är naken"). Som citat i en berättelse låter det som en lista, inte som något en människa bär på.
  - Nu: Det som tyngde honom mest var ”Är naken”. / ... ”Har inget på fötterna, benen och överkroppen” var det värsta
  - Blir: Fält tankeSats med tanken i berättarform, som sätts där humörets etikett skapas: 'Det som tyngde {honom} mest var att {tankeSats}.'
- [k_rovlager, src/sim/berattelser.ts:1775 (också 1773 och 1779)] Varianterna står i plural (samlades, de, deras, dem som gått) också när en enda person slog läger.
  - Nu: I Hökvallen samlades Guna och tog det de behövde från andra.
  - Blir: Nytt fält fler = fler än en gick (byflytt.ts:224). { t: 'I {lager} samlades {vem} och tog det de behövde från andra. {skal}', om: f => !!f.fler } och { t: 'I {lager} slog {vem} läger och tog det som behövdes från andra. {skal}', om: f => !f.fler }. Varianterna 1773 och 1779 (dem som gått, Deras läger) får också om: f => !!f.fler.
- [k_gift, src/sim/berattelser.ts:1757] En ljus natt finns bara på sommaren. Med villkoret kan den väljas en mörk höstnatt.
  - Nu: { t: 'En ljus natt gifte sig {a} och {b}.', om: f => f.natt === true && f.kallt !== true }
  - Blir: { t: 'En ljus natt gifte sig {a} och {b}.', om: f => f.natt === true && f.arstid === 'sommaren' }
- [p_resor, src/sim/berattelser.ts:1564] Presens och preteritum blandas i samma mening.
  - Nu: Lolvo väntar på Darorm och pratade om det med Rae.
  - Blir: { t: '{namn} väntade på att {om} skulle komma hem och pratade om det med {med}.', om: f => !!f.om }
- [p_vardag, src/sim/berattelser.ts:1588] Ingenting prövar att det brinner en eld där de är.
  - Nu: { t: '{namn} och {med} satt nära elden och pratade om kylan.', om: f => !!f.kallt }
  - Blir: Nytt fält eld = en brinnande eld nära den som talar. { t: '{namn} och {med} satt nära elden och pratade om kylan.', om: f => !!f.kallt && !!f.eld }
- [p_karlek, src/sim/berattelser.ts:1408] "Flirta" är ett modernt lånord.
  - Nu: Ylvbjörn och Omka flirtade.
  - Blir: '{namn} och {med} retades med varandra och log.'
- [p_trost, src/sim/berattelser.ts:1420] "Kommer bli" är talspråk. Berättartexten bör ha "kommer att bli".
  - Nu: Maskgerd sa till Inso att det kommer bli bättre.
  - Blir: '{namn} sa till {med} att det skulle bli bättre.'
- [r_bekant, src/sim/berattelser.ts:1662] Varianten saknar villkor och kan väljas när talks är 0. Samma relation kan då få "har aldrig pratat med varandra" (1677) eller relationText kan sakna samtalsraden.
  - Nu: {namn} pratar med {om} ibland.
  - Blir: { t: '{namn} pratar med {om} ibland.', om: f => Number(f.talks) > 0 }
- [r_bekant, src/sim/berattelser.ts:1678 (också r_ogillar:1701)] ung betyder under ALDER.vuxen = 14 (folk.ts:100). En trettonåring är inte för liten för att bry sig om någon, och "Barnet Hastig gömmer sig" passar inte heller en tonåring.
  - Nu: { t: '{namn} är för liten för att bry sig om {om}.', om: f => !!f.ung }
  - Blir: Nytt fält liten = ageOf(p) < ALDER.barnsjuk i relationText. { t: '{namn} är för liten för att bry sig om {om}.', om: f => !!f.liten }, och likadant för 'Barnet {namn} gömmer sig när {om} kommer.'
- [r_kemiBra, src/sim/berattelser.ts:1733] relationText sätter r_nara och r_kemiBra efter varandra (berattelser.ts:3254–3257). r_nara[13] och r_kemiBra[4] är samma mening och kan hamna i samma ruta.
  - Nu: Omka och Lofrid förstår varandra utan många ord. De förstår varandra utan många ord.
  - Blir: 'De tänker ofta samma sak på samma gång.'
- [r_ovan, src/sim/berattelser.ts:1726] Villkoret är bara att namn är gammal. Ingenting visar att ovänskapen är gammal eller att det finns något att förlåta.
  - Nu: Många vintrar har gått, men Marnve har inte förlåtit Erivan.
  - Blir: { t: '{namn} har levt länge, men {om} har {hen} aldrig förlåtit.', om: f => !!f.gammal && (!!f.gral || !!f.slag) }
- [Vargdräparen (loggen), src/sim/berattelser.ts:3127] sakNamn ger obestämd form ("Träspjut"), och "den" står också om ett ett-ord.
  - Nu: Träspjut heter nu Vargdräparen: Ylva fällde en varg med den.
  - Blir: const [saken, den] = bestamd(sakNamn(t.k), SAKER[t.k]?.ett); log(s, `${gammalt ?? stor(saken)} heter nu Vargdräparen: ${vem.name} fällde en varg med ${den}.`, …) → "Träspjutet heter nu Vargdräparen: Ylva fällde en varg med det."
- [m_konst, src/sim/berattelser.ts:1255 (fältet motivText: 3115–3118)] {motiv} slutar med en bisats ("X, som var Y"), så "på skölden" hamnar i bisatsen.
  - Nu: {namn} har {gjort} {motiv} på {saken}. → "Ylva har målat Åsa, som var generös på skölden."
  - Blir: 'På {saken} har {namn} {gjort} {motiv}.'

## Varianter som tas bort (säger samma sak som en annan)

- [m_vinst, src/sim/berattelser.ts:2087] Ta bort: "Det var {vinnare} som vann." (står kvar: "Till slut vann {vinnare}.")
- [m_vinst, src/sim/berattelser.ts:2085] Ta bort: "{Vinnare} vann, ingen var förvånad." (står kvar: "Det var {vinnare} som vann, som alla hade trott.")
- [m_lopp, src/sim/berattelser.ts:2067] Ta bort: "Det var jämnt länge, och ingen kunde säga vem som skulle vinna." (står kvar: "Det böljade fram och tillbaka ända till slutet.")
- [m_slut, src/sim/berattelser.ts:2093] Ta bort: "Vinnarna skrattade länge efteråt, och de som förlorat var tysta." (står kvar: "Efteråt var vinnarna på gott humör, medan de andra surade en stund.")
- [m_publik, src/sim/berattelser.ts:2114] Ta bort: "Publiken hejade: {publik} stod runt om och tittade." (står kvar: "Runt om stod {publik} och hejade på.")
- [m_publik, src/sim/berattelser.ts:2116] Ta bort: "{Publik} stod runt dem och ropade och hejade." (står kvar: "Runt om stod {publik} och hejade på.")
- [m_publik, src/sim/berattelser.ts:2118] Ta bort: "{Publik} kom och tittade och hejade högt." (står kvar: "{Publik} stod en bit bort och hejade på dem.")
- [f_publik, src/sim/berattelser.ts:2005] Ta bort: "Publiken var {n} till antalet." (står kvar: "{N} satt runt elden och lyssnade.")
- [f_publik, src/sim/berattelser.ts:2008] Ta bort: "De var {n} som lyssnade den kvällen." (står kvar: "{N} hade samlats för att lyssna.")
- [f_publik, src/sim/berattelser.ts:2002] Ta bort: "Publiken var liten, bara en enda." (står kvar: "Bara {n} satt och lyssnade.")
- [f_bud, src/sim/berattelser.ts:1980] Ta bort: "Alla visste vem det gällde: {om}." (står kvar: "Det handlade egentligen om {om}, och alla förstod vad {namn} menade.")
- [f_inget, src/sim/berattelser.ts:2043] Ta bort: "Ingen kom för att lyssna på {namn} den kvällen." (står kvar: "{Namn} ställde sig vid elden för att uppträda, men ingen kom.")
- [f_inget, src/sim/berattelser.ts:2042] Ta bort: "{Namn} väntade på publik, men elden var tom." (står kvar: "Platsen vid elden förblev tom, och {namn} fick vänta förgäves.")
- [r_kemiBra, src/sim/berattelser.ts:1732] Ta bort: "Det var lätt mellan dem från första stund." (står kvar: "Det klickade mellan dem från början.")
- [r_kemiBra, src/sim/berattelser.ts:1736] Ta bort: "Det har alltid varit enkelt mellan dem." (står kvar: "De har alltid haft lätt för varandra.")
- [r_kemiDalig, src/sim/berattelser.ts:1746] Ta bort: "Det har alltid skurit sig mellan dem." (står kvar: "Det har aldrig stämt mellan dem.")
- [r_kemiDalig, src/sim/berattelser.ts:1745] Ta bort: "De har aldrig förstått sig på varandra." (står kvar: "De missförstår varandra hela tiden.")
- [r_nara, src/sim/berattelser.ts:1623] Ta bort: "Det syns på {namn} att {om} betyder mycket." (står kvar: "{namn} tycker mycket om {om}.")
- [r_nara, src/sim/berattelser.ts:1622] Ta bort: "{namn} kan prata med {om} om allt." (står kvar: "{namn} och {om} har inga hemligheter för varandra.")
- [r_van, src/sim/berattelser.ts:1640] Ta bort: "{namn} gillar {om}." (står kvar: "{namn} tycker om {om}.")
- [r_van, src/sim/berattelser.ts:1648] Ta bort: "{namn} och {om} hjälps åt när det behövs." (står kvar: "{namn} hjälper {om} när det behövs.")
- [r_van, src/sim/berattelser.ts:1647] Ta bort: "Med {om} har {namn} lätt att prata." (står kvar: "{namn} pratar gärna med {om}.")
- [r_bekant, src/sim/berattelser.ts:1664] Ta bort: "{namn} bryr sig inte mycket om {om}, varken åt det ena eller det andra hållet." (står kvar: "{namn} har inget ont att säga om {om}, och inget gott heller.")
- [r_bekant, src/sim/berattelser.ts:1660] Ta bort: "{namn} hälsar på {om} men inte mer." (står kvar: "{namn} och {om} nickar åt varandra, mer blir det inte.")
- [r_bekant, src/sim/berattelser.ts:1661] Ta bort: "{namn} vet vem {om} är, men de står inte varandra nära." (står kvar: "{namn} känner {om} men inte så väl.")
- [r_ogillar, src/sim/berattelser.ts:1702] Ta bort: "{namn} blir på sämre humör av att se {om}." (står kvar: "{namn} blir på dåligt humör av {om}.")
- [r_ogillar, src/sim/berattelser.ts:1693] Ta bort: "{namn} väntar ut {om} hellre än att gå bredvid." (står kvar: "{namn} går hellre åt ett annat håll än bredvid {om}.")
- [r_ovan, src/sim/berattelser.ts:1718] Ta bort: "{namn} vill inte ens se {om}." (står kvar: "{namn} vill inte ha med {om} att göra.")
- [r_ovan, src/sim/berattelser.ts:1722] Ta bort: "Det finns ingen frid mellan {namn} och {om}." (står kvar: "Mellan {namn} och {om} finns bara kyla.")
- [b_ovrigt, src/sim/berattelser.ts:1854] Ta bort: "Annat, mindre, hände också: {n} saker till." (står kvar: "{N} mindre saker hände också.")
- [b_ovrigt, src/sim/berattelser.ts:1852] Ta bort: "Utöver det hände {n} småsaker, som står i krönikan." (står kvar: "{N} småsaker till står i krönikan.")
- [b_ovrigt, src/sim/berattelser.ts:1858] Ta bort: "Det blev också {n} mindre saker att tala om." (står kvar: "Till det kom {n} mindre händelser.")
- [b_ovrigt, src/sim/berattelser.ts:1861] Ta bort: "Något mindre hände också." (står kvar: "Något litet hände också, som står i krönikan.")
- [b_arLugnt, src/sim/berattelser.ts:1837] Ta bort: "År {ar} levde byn som vanligt." (står kvar: "Under år {ar} levde byn som den brukar.")
- [b_arLugnt, src/sim/berattelser.ts:1833] Ta bort: "Det var lugnt i byn år {ar}." (står kvar: "År {ar} var ett lugnt år.")
- [b_arLugnt, src/sim/berattelser.ts:1830] Ta bort: "Inget stort hände under år {ar}." (står kvar: "Under år {ar} hände inget som krönikan minns.")
- [b_ar, src/sim/berattelser.ts:1821] Ta bort: "Så kom år {ar}." (står kvar: "Sedan började år {ar}.")
- [b_alder, src/sim/berattelser.ts:1844] Ta bort: "{Arstid} kom, och varade från år {fran} till {till}." (står kvar: "{Arstid} varade från år {fran} till {till}.")
- [b_lugnt, src/sim/berattelser.ts:1801] Ta bort: "Det var lugnt i byn medan du var borta." (står kvar: "Byn levde sitt stilla liv medan du var borta.")
- [b_lugnt, src/sim/berattelser.ts:1803] Ta bort: "Livet i byn gick sin vanliga gång." (står kvar: "Tiden gick, och byn var sig lik.")
- [p_vardag, src/sim/berattelser.ts:1575] Ta bort: "{namn} och {med} pratade en stund." (står kvar: "{namn} och {med} småpratade.")
- [p_vardag, src/sim/berattelser.ts:1578] Ta bort: "{namn} och {med} satt och pratade." (står kvar: "{namn} och {med} småpratade.")
- [p_vardag, src/sim/berattelser.ts:1572] Ta bort: "{namn} och {med} pratade om lite av varje." (står kvar: "{namn} och {med} pratade om ingenting särskilt.")
- [p_trost, src/sim/berattelser.ts:1423] Ta bort: "{namn} lyssnade när {med} hade det svårt." (står kvar: "{med} berättade vad som tyngde, och {namn} lyssnade.")
- [p_arbete, src/sim/berattelser.ts:1469] Ta bort: "{namn} och {med} pratade om arbetet." (står kvar: "{namn} och {med} pratade om hur arbetet går.")
- [p_arbete, src/sim/berattelser.ts:1474] Ta bort: "{med} fick höra allt om arbetet som {om}." (står kvar: "{namn} berättade för {med} om livet som {om}.")
- [p_langtan, src/sim/berattelser.ts:1405] Ta bort: "{namn} sa att {om} var det {hen} längtade mest efter." (står kvar: "{namn} sa till {med} att {hen} längtar efter {om}.")
- [h_stamning, src/sim/berattelser.ts:1938] Ta bort: "Det var en lugn förhandling." (står kvar: "Det gick fort, och ingen behövde höja rösten.")
- [h_arg, src/sim/berattelser.ts:1924] Ta bort: "Det var lätt att prata, för de tyckte om varandra." (står kvar: "De kom bra överens från första stund.")
- [h_slut, src/sim/berattelser.ts:1957] Ta bort: "De blev aldrig överens, och {kund} gick därifrån." (står kvar: "{Kund} reste sig och gick. Det blev ingen affär.")
- [k_flyttSkal, src/sim/berattelser.ts:1786] Ta bort: "”{tanke}” var det värsta, och dessutom var det så att {byn}." (står kvar: "Det som tyngde {honom} mest var ”{tanke}”, och {byn}.")

## Nya varianter

- [r_nara, src/sim/berattelser.ts:1605] `Av alla i byn är det {om} som {namn} räknar som sin bästa vän.` om: `f => !!f.bast`
  - Fält: bast = p.bast === q.id i relationText (Person.bast, typer.ts:310)
  - Säger: Att det är den bästa vännen, inte bara en nära.
- [r_nara, src/sim/berattelser.ts:1605] `{namn} tittar efter {om} lite längre än man gör efter en vän.` om: `f => !!f.rom && !f.kin && !f.ung`
  - Fält: rom = r.rom över gränsen för förälskelse (typer.ts:351, relationer.ts)
  - Säger: En förälskelse som inte sagts, innan de blivit ett par.
- [r_nara, src/sim/berattelser.ts:1605] `{namn} står bakom {om}, som leder byn.` om: `f => !!f.omLedare`
  - Fält: omLedare = s.styre?.ledare === q.id
  - Säger: Vännen är byns ledare, och namn stöder ledaren.
- [r_ovan, src/sim/berattelser.ts:1704] `Att {om} leder byn kan {namn} inte stå ut med.` om: `f => !!f.omLedare`
  - Fält: omLedare
  - Säger: Ovänskapen gäller byns ledare, och det säger något om byn.
- [r_ovan, src/sim/berattelser.ts:1704] `De är släkt, men {namn} vill ändå inte kännas vid {om}.` om: `f => !!f.kin`
  - Fält: kin (finns redan)
  - Säger: En ovänskap inom släkten. Släktraden står först i rutan (berattelser.ts:3255).
- [r_ovan, src/sim/berattelser.ts:1704] `Det har gått så långt att den ena har gjort den andra illa i vredesmod.` om: `f => !!f.illa`
  - Fält: illa = !!r.minns?.illa (RelMinne.illa, typer.ts:354)
  - Säger: Ett utbrott har lett till våld, vilket är något annat än ett slagsmål eller ett gräl.
- [r_ovan, src/sim/berattelser.ts:1704] `{namn} och {om} gör samma arbete, och ingen av dem vill stå bredvid den andra.` om: `f => !!f.sammaYrke`
  - Fält: sammaYrke = !!p.tag && p.tag === q.tag && p.tag !== 'Dagdrivare' (typer.ts:307)
  - Säger: Var ovänskapen syns i vardagen: i arbetet.
- [r_ogillar, src/sim/berattelser.ts:1681] `{namn} tycker inte att {om} är den som borde leda byn.` om: `f => !!f.omLedare`
  - Fält: omLedare
  - Säger: Missnöje med ledaren, inte bara med personen.
- [r_ogillar, src/sim/berattelser.ts:1681] `Släkt är släkt, men {namn} har svårt för {om}.` om: `f => !!f.kin`
  - Fält: kin
  - Säger: Att de inte kommer undan varandra, eftersom de är släkt.
- [r_bekant, src/sim/berattelser.ts:1657] `{namn} och {om} gör samma arbete, men pratar sällan om det.` om: `f => !!f.sammaYrke && !f.mycketPrat`
  - Fält: sammaYrke, mycketPrat
  - Säger: Vad de har gemensamt trots att de inte står varandra nära.
- [r_bekant, src/sim/berattelser.ts:1657] `{om} leder byn, men för {namn} är det mest ett namn.` om: `f => !!f.omLedare`
  - Fält: omLedare
  - Säger: Hur långt ledaren står från en vanlig bybo.
- [r_van, src/sim/berattelser.ts:1632] `{namn} och {om} gör samma arbete, och det ger dem mycket att prata om.` om: `f => !!f.sammaYrke && Number(f.talks) > 0`
  - Fält: sammaYrke, talks
  - Säger: Vad vänskapen bygger på: arbetet.
- [r_van, src/sim/berattelser.ts:1632] `{namn} blir lite blyg när {om} kommer nära.` om: `f => !!f.rom && !f.kin && !f.ung`
  - Fält: rom
  - Säger: En förälskelse som spirar i en vänskap.
- [r_partner, src/sim/berattelser.ts:1594] `Det är {gifttid} sedan {namn} och {om} gifte sig.` om: `f => !!f.gifttid`
  - Fält: gifttid = spelTid(s.now - r.gift) när r.gift finns (typer.ts:351, ord.ts:35)
  - Säger: Hur länge de varit gifta.
- [r_partner, src/sim/berattelser.ts:1594] `{namn} och {om} har aldrig hållit bröllop, men de är ett par ändå.` om: `f => !f.gift`
  - Fält: gift = r.gift !== undefined
  - Säger: Att paret inte är gift.
- [f_bud, src/sim/berattelser.ts:1978] `{Namn} gjorde det {om} hade gjort större än det var.` om: `f => f.bud === 'person' && f.vrid === 1`
  - Fält: vrid = m.vrid (FramMinne.vrid, framtradande.ts:150)
  - Säger: Att berättaren förstorade det som hänt, vilket simuleringen räknar med.
- [f_bud, src/sim/berattelser.ts:1978] `{Namn} talade tyst om det {om} hade gjort, som om det inte var mycket att säga om.` om: `f => f.bud === 'person' && f.vrid === -1`
  - Fält: vrid
  - Säger: Att berättaren tonade ned det som hänt.
- [f_bud, src/sim/berattelser.ts:1978] `{Namn} talade om gudarna som om de satt bland publiken.` om: `f => f.bud === 'tro' && !f.kyrka`
  - Fält: bud, kyrka
  - Säger: En bild av tron (abstrakt, vilket är tillåtet för tron) i stället för ännu en mening om att namn tror.
- [f_start, src/sim/berattelser.ts:1963] `{Namn} spelade upp en berättelse om {amne}. {Om} fick spela sig själv.` om: `f => f.form === 'teater' && !!f.omMed`
  - Fält: omMed = !!m.grupp?.some(g => g.namn === m.om) || m.namn === m.om (framber.ts)
  - Säger: Att den berättelsen handlar om stod på scenen själv. I dag ser det ut som ett fel ("Ehild och Lofrid spelade upp en berättelse om Lofrid").
- [f_start, src/sim/berattelser.ts:1963] `Det var mitt i istiden när {namn} började kväda om {amne}.` om: `f => f.form === 'kvade' && f.arstid === 'istiden'`
  - Fält: arstid = ARSTIDER[kalender(s, m.t).ai] (tid.ts:54)
  - Säger: Årstiden och stämningen kring kvädet.
- [f_mott, src/sim/berattelser.ts:2011] `Efteråt såg publiken på {namn} med nya ögon.` om: `f => f.bra === true && f.upp === true`
  - Fält: upp = d > 0 (framber.ts:19)
  - Säger: Att publiken tycker bättre om den som uppträdde, inte bara att framträdandet var bra.
- [f_mott, src/sim/berattelser.ts:2011] `{Inst} lät bättre än orden.` om: `f => f.dalig === true && f.form === 'sang' && !!f.inst`
  - Fält: inst, form
  - Säger: Ett ljud: instrumentet bar ett svagt framträdande.
- [f_inget, src/sim/berattelser.ts:2040] `{Inst} låg kvar orörd vid scenen, för ingen kom.` om: `f => !!f.inst && !!f.scen`
  - Fält: inst, scen (nytt)
  - Säger: En bild av det tomma framträdandet.
- [m_lopp, src/sim/berattelser.ts:2066] `Det skilde bara en hårsmån mellan {vinnare} och {tvaan}.` om: `f => f.jamnt === true && !!f.tvaan && !f.lag`
  - Fält: tvaan = namnet på den med näst bästa v (matchber.ts:25)
  - Säger: Vem som kom tvåa.
- [m_vinst, src/sim/berattelser.ts:2079] `{Vinnare} vann igen, precis som förra gången.` om: `f => f.skrall !== true && f.igen === true && !f.lag`
  - Fält: igen = den förra matchen i samma sport i s.matcher vanns av samma person
  - Säger: Att det finns en mästare i byn.
- [m_vinst, src/sim/berattelser.ts:2079] `Det var första gången {vinnare} vann.` om: `f => f.forstaVinst === true && !f.lag`
  - Fält: forstaVinst = ingen tidigare vinst för samma vinnare i s.matcher och s.matcher.length < SPORT.sparas (sport.ts:157)
  - Säger: En första seger.
- [m_slut, src/sim/berattelser.ts:2091] `{Bast} var skickligast men förlorade, och det sved.` om: `f => f.skrall === true && !f.lag`
  - Fält: skrall, bast, lag
  - Säger: Hur den slagna favoriten tog det.
- [m_slut, src/sim/berattelser.ts:2091] `Det hade hunnit bli mörkt när de slutade.` om: `f => f.morkt === true`
  - Fält: morkt = isLight(m.t) && !isLight(m.slut) (tid.ts:86)
  - Säger: Ljuset och hur länge det höll på.
- [m_start, src/sim/berattelser.ts:2051] `Det var första gången byn spelade {sportnamn}.` om: `f => f.forsta === true`
  - Fält: forsta = ingen tidigare match med samma k i s.matcher och s.matcher.length < SPORT.sparas
  - Säger: En ny sport i byn.
- [b_ovrigt, src/sim/berattelser.ts:1850] `Det hände också {n} mindre saker, mest {slagord}.` om: `f => f.n !== 'en' && !!f.slagord`
  - Fält: slagord = ett ord för det vanligaste Rad.slag bland raderna som inte fick plats (borta.ts:52)
  - Säger: Vad småsakerna var, inte bara hur många.
- [b_ar, src/sim/berattelser.ts:1818] `År {ar} föddes {fodda} barn, och {doda} dog.` om: `f => Number(f.foddaTal) > 0 && Number(f.dodaTal) > 0`
  - Fält: fodda = heltOrd(foddaTal, true), doda = heltOrd(dodaTal) i gruppens f (borta.ts:82)
  - Säger: Årets liv och död i antal.
- [b_arLugnt, src/sim/berattelser.ts:1829] `År {ar} var ett stilla istidsår.` om: `f => f.arstid === 'istiden'`
  - Fält: arstid (finns)
  - Säger: Årstiden som året gick i.
- [b_arLugnt, src/sim/berattelser.ts:1829] `År {ar} var en stilla sommar.` om: `f => f.arstid === 'sommaren'`
  - Fält: arstid
  - Säger: Årstiden som året gick i.
- [b_lugnt, src/sim/berattelser.ts:1796] `När du gick var det {forra}. Nu är det {nuarstid}, och inget stort har hänt.` om: `f => !!f.forra && f.forra !== f.nuarstid`
  - Fält: forra och nuarstid = årstidens namn utan artikel ('sommar', 'istid') ur kalender(st, b.fran) och kalender(st) (borta.ts:61)
  - Säger: Att årstiden har bytts medan man var borta.
- [p_dod, src/sim/berattelser.ts:1427] `{om} hade varit {slakt} till {med}, och {namn} satt hos {med} och lyssnade.` om: `f => !!f.slakt`
  - Fält: slakt = slaktOrd(den döda, med) (ord.ts:214), id:t sparas i prat
  - Säger: Vem den döda var för den som sörjer.
- [m_konst, src/sim/berattelser.ts:1253] `{konst2} visar {motiv}, och den som ser länge tycker att bilden ser tillbaka.`
  - Fält: konst2, motiv
  - Säger: En tolkning av bilden. Konsten får vara abstrakt, och meningen påstår inget som är falskt.