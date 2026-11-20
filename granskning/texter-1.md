# Texterna i spelet, granskning 1

Underlaget:
- `npm run texter` med 8 byar i 45 dygn (45 år i spelet). Körningen tog 24 minuter datortid i molnet.
- Resultatet: 163 mallar med 1 572 varianter. 695 varianter valdes aldrig, och 43 mallar användes inte alls.
- Textkontrollerna hittade 0 fel.
- Utöver det har jag läst de fasta texterna i `src/ui/` (panelerna, flikarna, hjälpen, "medan du var borta" och notiserna) och registrens namn och beskrivningar i `src/sim/`. Jag har också läst texterna som skrivs utan mallarna: loggen, krönikan, tankarna, resans dagbok, rykten och strider.

Radnumren gäller grenen `dag-texter` som den står nu (commit a6405d0). "Mall" betyder en mall i `BERATTELSER` i `src/sim/berattelser.ts`, och [n] är variantens nummer.

**Varför kontrollerna hittar 0 fel:**
- Kontrollerna (`src/test/textkoll.ts`) körs bara på mallarnas texter (`lyssnaPaTexter`).
- Det som skrivs direkt med `log()`, `think()`, `kronika()`, `notis()` och `dagbok()` kontrolleras aldrig. Där finns de flesta felen nedan.
- Kontrollen av stor bokstav i början av en mening gäller bara den hopsatta beskrivningen, inte en mall som står först i en text (fynd 1 och 2).
- Siffror före "år" undantas, så "Hon blev 2 år" passerar.

---

## Fel

### Kod, id och interna nummer som syns

1. **"hans namn lever kvar i byn."** Meningen börjar med liten bokstav.
   - Var: mallen `e_minns` [2] och [8], `src/sim/berattelser.ts:810` och `:816` (`'{hans} namn lever kvar i byn.'`, `'{hans} barn bär minnet …'`).
   - Valdes 136 gånger.
   - Förslag: `{Hans}`.
2. **"den klumpige är det namn byn använder om honom."** Ett binamn med "den" hamnar först i meningen med liten bokstav.
   - Var: `besk_binamn` [4], `src/sim/berattelser.ts:233`. Samma sak händer i `oknamn` [4] ("Det är inget fint namn, den klumpige.", rad 150).
   - Förslag: skriv om så att binamnet inte står först ("Byn kallar honom {binamn}, och det namnet har fastnat."), eller ha en `{Binamn}` med stor bokstav.
3. **"Tog det som fanns kvar i ruinen: 3 huggen_sten, 2 jarn".** Sakernas id syns i resans redogörelse, notis och krönika.
   - Var: `src/sim/resa.ts:1375` (`` `${n} ${k}` ``). `n` avrundas inte heller.
   - Förslag: `och(… .map(([k, n]) => antal(Math.floor(n), k)))`.
4. **"rev byns första blåsning och tog ut 1 jarn".** Id syns, och texten säger receptets mängd i stället för det som faktiskt kom ut.
   - Var: `src/sim/brann.ts:115`.
   - Förslag: lista `ut` med `antal()`. Verbet bör komma ur registret ("tömde blästerugnen").
5. **"(steg 8.8.4)" i en förklaring som spelaren ser.** Texten säger dessutom fel sak: att rövaren är den anhörige.
   - Var: `title: 'Anhörig till den som hämnas (steg 8.8.4)'`, `src/ui/gaster.ts:72`.
   - Förslag: "Den anhörige som rövaren hämnas".
6. **Sakernas id i stället för namn** på tre ställen:
   - Sändebudets gåva, `src/ui/gaster.ts:97` (`${w.n} ${w.k}`).
   - Kyrkans förråd, `src/ui/flikar/religion.ts:25`.
   - Ledarens betalning för ett framträdande, `src/ui/flikar/fram.ts:30` ("betalade … med en ${m.betalt}". Kyrkans betalning är redan en text, så det kan bli "med en 3 silver").
   - Förslag: `sakNamn()` överallt, och utan det fasta "en".

### Pronomen och namn

7. **"Ymgerd klagade för Ragunn att Ymgerd är hungrig."**
   - Var: `p_mat` [1], `src/sim/berattelser.ts:1366`.
   - Förslag: `'{namn} klagade för {med} att {hen} är hungrig.'`
8. **"Det Ingveig tänker säger Ingveig först till Bjee."**
   - Var: `r_nara` [10], `:1439`. Samma fel i [20], `:1450`: "… följer Ulvja vart Ulvja än går".
   - Förslag: `{hen}` den andra gången, och "vart {hon/han} än går" med ett pronomen för `{om}`.
9. **`l_arke` [1] vänder på vem som hatar vem.** "Ingen hatar Ånsa som Ulvja. Ulvja är hennes ärkefiende."
   - Var: `:1987`.
   - De andra varianterna säger att {namn} hatar {om}. Den här säger att {om} hatar {namn}.
   - Förslag: `'Ingen hatar {namn} så som {hen} hatar {om}. {om} är {hans} ärkefiende nu.'`, eller "{namn} hatar ingen som {om}."
10. **"I regnet gjorde Ylvulf klart hans hus"** ska vara "sitt hus".
    - Var: `k_husKlar` [9], `:902`. `{hus2}` är "hans hus" när namnet redan nämnts.
    - Förslag: en egen fyllning med "sitt hus" för meningar där husets ägare är subjektet.
11. **"Haldis mot en varg, och de fällde ingen"**, och "Tusvi gick på vargjakt, men vargarna hörde dem och sprang".
    - "de" och "dem" står också när jägaren är ensam.
    - Var: `k_vargjakt` [6] och [9], `:1015`, och `k_vargSprang` [2], `:1023`.
    - Förslag: `{de}` och `{dem}` som blir "hon" och "henne" när det är en person.
12. **"hen" om en viss person i texter som syns.** Regeln i `ord.ts:107` säger aldrig hen om en viss person. Ställena:
    - "Hen går hem." (`src/sim/handel.ts:459`)
    - "i hens takt" och "två bär hen på en bår" (`resa.ts:1683`, `:1695`)
    - "rummet där hen sover" (`kruka.ts:71`, `:177`)
    - "Hugger stammen hen fällde." (`projekt.ts:58–59`, `val.ts:1243`, `:1247`)
    - "det hen vet" (`skrift.ts:440`)
    - `tatuering.ts:85–86`, `jakt.ts:332` och `tamdjur.ts:208`
    - Personloggens rubriker "Faror hen sett", "Det hen lärt sig" och "De som står hen nära" (`personlogg.ts:26–36`)

    Förslag: `han()`, `honom()`, `hans()` eller "sin/sitt", och rubrikerna "Faror", "Lärdomar" och "De närmaste".
13. **Genitiv med `${namn}s`** ger "Asdiss familj" och "Ingdiss yxa" för namn på -s, som är vanliga (kvinnonamn på -dis).
    - `gen()` i `ord.ts:121` finns, men används inte här.
    - I gränssnittet: `ui/flikar/falt.ts:23`, `:49`, `match.ts:30`, `person.ts:472`, `:517` och `sak.ts:61`.
    - I sakernas trasig-texter: `'{namn}s yxa gick sönder.'`, ett 40-tal rader i `saker.ts` från rad 69.
    - I mallarna: `m_inskr`, `m_minne`, `m_varg` och `p_karlek` [6] (`{namn}s märke`, `{vem}s händer`, `{med}s hjärta`).
    - I loggen, 23 ställen: `kyrka.ts:687, 703`, `framtradande.ts:464`, `brand.ts:607`, `stationer.ts:1743`, `varg.ts:260`, `skatt.ts:140`, `grav.ts:411, 427`, `rost.ts:147`, `sport.ts:412`, `boskap.ts:209`, `halsa.ts:556, 701`, `eld.ts:344, 346`, `kult.ts:127`, `liv.ts:183` och `tamdjur.ts:90, 208, 236`.

    Förslag: en fyllning `{namns}` = `gen(namn)` i mallarna, och `gen()` i loggen.

### Böjning: en/ett, bestämd form, singular och plural

14. **"mellanstor lerkrukan" och "slagträn" i sakernas berättelser:**
    - "Odis var nedstämd när hon gjorde mellanstor lerkrukan en sommar"
    - "Guna säger att slagträn blev som hon tänkt sig"

    Var: `bestamd()` i `src/sim/berattelser.ts:2625`. Ett adjektiv framför namnet får ingen form ("den mellanstora lerkrukan"), och "slagträ" står inte bland orden i `NEUTRUM`. Texten syns i `m_gjord`, `m_inskr`, `m_konst`, `u_gjord` och `u_nara`.

    Förslag: bestämd form som ett fält i SAKER (`best: 'den mellanstora lerkrukan'`), eller "slagträ" i `NEUTRUM` och ett undantag för adjektiv.
15. **"den femte verkstad stod färdig"**, och "den tredje verkstad", "den andra verkstad".
    - Var: `husFalt()`, `src/sim/bygg.ts:414`. `replace(/a$/, 'an')` gör bara rätt för ord på -a (hydda).
    - Förslag: bestämd form ur ett fält i husens register ("verkstaden").
16. **"ett äppelplanta" och "tre salt"** i bytena (`l_byte`).
    - Var: `src/sim/saker.ts:298` har `ett: true` på Äppelplanta, som ska vara en-ord.
    - Salt går inte att räkna ("tre salt"). Förslag: "tre nävar salt", eller ett mängdord i registret som "klumpar lera" och "famnar hö".
17. **`ett: true` saknas på nio ett-ord** i `saker.ts`: Träben (81), Benlim (162), Läder (169), Rått lin (170), Lin (171), Lintyg (174), Horn (216), Malt (270) och Ylletyg (308).
    - Det blir "Fick en läder av …" och "en horn".
18. **Siffra och namn utan böjning:**
    - I gränssnittet:
      - "Bär 1 äpplen" och "5 abborre" (`ui/hjalp.ts:127`, `:187`, `ui/flikar/filt.ts:44`, `person.ts:571`). Sakernas namn är ibland plural och ibland singular.
      - "1 sovplatser" (`ui/interaktion.ts:281`, `flikar/hus.ts:27`)
      - "1 frön" (`flikar/falt.ts:72`)
      - "2 hö och 1 grenar" (`flikar/eld.ts:52`)
      - "1 harar" (`flikar/djur.ts:92`)
    - I loggen:
      - "fick 1 honungskakor" (`bin.ts:244`)
      - "tog 1 kol … och lade dem" (`eld.ts:367`)
      - "Sålde 1 saker" (`resa.ts:920`, `:935`)
      - "Köpte 3 torkad fisk" (`resa.ts:950`)
      - "gömde 2 flintyxa, 1 rep" (`resa.ts:1705`)
      - "fick 12 kött" (`resa.ts:1534`)

    Förslag: `antal(n, k)` och `och()` ur `ord.ts` överallt, och ett pluralfält i SAKER.
19. **"En barn föddes och två dog."**
    - Var: `src/ui/borta.ts:65`. `talOrd(t0.foddaTal)` saknar ett-formen.
    - Förslag: `talOrd(t0.foddaTal, true)`.
20. **"En rådjur blir högst …" och "ägg om året: en per höna".**
    - Var: `ui/flikar/djur.ts:82` och `:69`.
    - Förslag: "Arten blir högst … år" och "ett per höna".
21. **"en gravhus"** (`grav.ts:411`, `:426`, `:427`), **"gav Ask en metspö"** (`framtradande.ts:265–270`) och **"slår sönder sin egen metspö"** (`humor.ts:219`).
    - Förslag: `antal(1, k)` och "sitt eget".
22. **"Bord flyttades eftersom den stod …" och "Altare togs isär …".** Stationens namn står utan bestämd form och med fel pronomen.
    - Var: `stationer.ts:1147`, `:1607`, `:1609`.
    - Förslag: bestämd form och `d.ett ? 'det' : 'den'`, som rad 1743 redan gör.
23. **"Avlivar geten och bär det till slaktbänken"** blir fel för alla en-djur.
    - Var: `val.ts:815`.
    - Förslag: "den" eller "det" efter djurets genus.
24. **"tog av min fläsk" och "min rep".**
    - Var: `behov.ts:381`.
    - Förslag: min, mitt eller mina efter ordet, eller "tog av det jag sparat (fläsk)".
25. **"Han är byns förstfödda."**
    - Var: `besk_forstFodd` [2], `:518`.
    - Förslag: "förstfödde" för män, eller "Hen är byns första barn."
26. **"Alla höna i byns flock dog"** när det var en enda höna.
    - Var: `hons.ts:31`.
27. **"Byn minns Ask som lögnare."** Artikeln saknas.
    - Var: `rykten.ts:498`.
    - Förslag: fältet `som` ("en lögnare"), som redan finns i INTRYCK.
28. **"kom hem från handel till Björkvik", "kom hem från se en plats till …".**
    - Var: `resa.ts:1383`, som använder RESMAL-namnet som det står.
    - Förslag: ett eget fält i RESMAL ("en handelsresa") eller "kom hem från Björkvik".
29. **Trasiga ord och meningar:**
    - "Leveransen är gjort" (`resa.ts:1353`)
    - "såg till blåsningn" (`brann.ts:175`)
    - "med packdjuren full av varor" (`handel.ts:423`)
    - "Ett av byns är slitet" (`val.ts:596`, ett ord saknas, troligen "redskap")
    - "kappa av ylle av ylle" (`klader.ts:92` tillsammans med `:175`)
    - "Syr ett halsband av vargtänder" (`klader.ts:84`, `:74`, där verbet bör vara "Trär")
    - "Efter ledarens vilja vill Bo ha en lag" (`lagar.ts:170`)
    - "från fientlig till vänner" (`ui/flikar/grannar.ts:14`)
    - "Bänkens trumma" om scenens instrument (`ui/flikar/station.ts:83`)
30. **"beskrev vägen till by som heter Ekfors" och "mindes by som heter Grönhem".** Artikeln saknas.
    - Var: `src/sim/ort.ts:91` och `:146` (`` `${…namn.toLowerCase()} som heter ${q.namn}` ``). Texten fylls i `p_fjarran`.
    - Förslag: `en ${…} som heter …`.
31. **"Bofast berättade för Erighild var det finns högvattnet."**
    - Var: `p_plats` [0] och [3], `:1275`, `:1278`, med `{om}` från lärdomen om floden (`minne.ts`).
    - Förslag: en egen text för högvattnet ("hur högt vattnet nådde"), eller "var vattnet brukar stiga".
32. **"Ragka gjorde en farlig plats farligare än det kanske är".**
    - Var: `p_fara` [5], `:1240`.
    - Förslag: "… överdrev hur farlig platsen är när {med} lyssnade."
33. **"Stegleif visade Erigny vad lag är för något", "Hilvid lärde Ingbjörn om flintspjut", "Aso lät Ålaug pröva på slöjdbänk", "funderade över stenhuggarplats".** Teknikens namn står utan artikel och form.
    - Var: `p_teknik`, `:1255–1261`.
    - Förslag: teknikens verbfras som i `p_kunskap` ("hur man gör flintspjut", "hur man bygger en slöjdbänk"), eller "berättade om lagarna".
34. **"vad Forstorp betalar för flintkniv" och "för levande ko".**
    - Var: `p_pris` med `{om}` från prisminnet.
    - Förslag: plural ("flintknivar", "kor") eller "en flintkniv".

### Text som säger emot spelet

35. **Skador räknas som bedrifter.** Till exempel:
    - "Till hennes bedrifter hör att hon förlorade fingrarna på vänster hand"
    - "Bland hennes bedrifter: hon blev ökänd"

    Var: `besk_bedrift` [2] och [3], `:445–446`. `halsa.ts:469` lägger "Fick ett ärr i …" i `p.fame`, och texten kallar allt där bedrifter.

    Förslag: skilj skador från bedrifter (en egen del "Hen bär ärr efter …"), eller använd bara neutrala varianter ("Byn minns att …") när listan innehåller en skada.
36. **"Han fick ett ärr i vänstra benet och ett ärr i vänstra benet."** Samma skada står två gånger.
    - Var: `besk_bedrift`, `:2370` (`bedrifter(b.p).slice(-2)`, utan att dubbletter tas bort).
    - Förslag: ta bort dubbletterna, och skriv "två ärr i vänstra benet".
37. **"bara händerna" behandlas som ett vapen:**
    - "Han undviker bara händerna i strid."
    - "Hennes föredragna vapen är bara händerna."
    - "Han har förlorat flera gånger med bara händerna."

    Var: `besk_vapenGilla` och `besk_vapenOgilla`, `:478–487`. Alla 22 texter på 45 dygn gällde bara händerna.

    Förslag: egna rader för händerna ("Han slåss helst med nävarna."), och inga ogilla-varianter för händerna.
38. **`besk_ful` och `besk_vacker` kallar röst, skratt och gång för utseende.** Till exempel:
    - "Det mest utmärkande i hans utseende är en gång som en anka."
    - "Hennes utseende präglas av en röst som skär i öronen."

    Var: `:389`, `:400`, `:403`.

    Förslag: "Det man lägger märke till hos {honom} är …".
39. **"Rövarna … slogs med tre vargar mot rövarna."** Rövarnas strid mot vargar skrivs som om byborna slogs. Det står också "Vargarna vann" eller "Rövarna vann" fast det bara var en motståndare.
    - Var: `rovare.ts:915` via `varg.ts:672`, `varg.ts:360` och `rovare.ts:810`.
40. **"Nu kan 12 sova under tak."** Talet är antalet golvrutor, inte antalet människor, och tre rutor går åt per person.
    - Var: `bygg.ts:246–247`.
41. **"Barnet föds inom några år".** En graviditet varar nio månader i spelet, och Hälsofliken säger det själv.
    - Var: `ui/hjalp.ts:149`.
42. **Jägaren "letar efter harar"** också när hen jagar rådjur, vildsvin eller fåglar.
    - Var: `ui/jakt.ts:39`.
43. **Teknikernas texter stämmer inte med koden:**
    - Rep "behövs till flintspjut och metspö" (`teknik.ts:63`). Repet ingår nu i ett trettiotal recept.
    - Släde talar bara om kälken (`teknik.ts:71`).
    - "Snaran fångar kaniner" (`teknik.ts:81`). Allt annat säger hare.
    - Budet "Inget rus" nämner bara öl och vin (`kyrka.ts:131`), men gäller all dryck med alkohol.
    - Nätet knyts "vid slöjdbänken" (`saker.ts:108`), men receptet `nat` har ingen bänk (`recept.ts:114`). Kontrollera vilket som är rätt.
44. **Boskap "ur förrådet".** "tog två flintyxor och 2 djur (får och get) ur förrådet". Djuren stod ute.
    - Var: `rovare.ts:623–625`.

## Stelt eller konstigt språk

45. **Sociala tekniker skrivs som hantverk.** Till exempel:
    - "Maskgerd prövade och misslyckades, prövade igen, och till sist kunde hon välja en ledare."
    - "Nu kan Stestger också välja en ledare. Fahild visade honom hur."
    - "Barnet Guna har lärt sig av Ymgerd att välja en ledare."
    - "kom på hur man kan binda mål"

    Var: `k_uppfann` (`:886`), `l_lart` (`:2050`) och `hedersnamn`, med teknikernas verbfraser.

    Förslag: ett fält i teknikregistret för hur tekniken sägs i en mening ("lärde sig hur byn väljer en ledare", "förstod att byn behövde en ledare"), och att `k_uppfann` [6] bara gäller hantverk.
46. **"Ingveig är ännu inte vuxen men redan talför men rädd av sig."** Två "men" i samma mening.
    - Var: `besk_drag2` [10], `:177`.
    - Förslag: när `{bind}` är "men", skriv "… men redan {drag1}, fast också {drag2}".
47. **"Alar är en ful pojke, framför allt nyfiken på allt."** "allt … allt".
    - Var: `besk_drag1` [0], `:190`. Det är den vanligaste varianten (464 gånger).
    - Förslag: "… och mer än något annat nyfiken på allt", eller draget "frågvis".
48. **"Torik var mer kall än de flesta och lika rädd av sig."** "lika" har inget att jämföras med, och "mer kall" ska vara "kallare".
    - Var: `e_drag2` [6], `:770`.
    - Förslag: "{namn} var {drag1} som få, och {drag2} därtill."
49. **"I livet var Raja bekväm av sig och kall"** och "rädd av sig och bekväm av sig". "av sig" kommer två gånger.
    - Förslag: draget "lat" i stället för "bekväm av sig", eller "räddhågad".
50. **"Hon har sin fars minne."** och **"Hans minne är ett arv från hans far."** Det låter som minnet av fadern.
    - Var: `besk_arv`, drag `minne`.
    - Förslag: "goda minne" i arvets ord.
51. **"som byn kallar påhittig".** "kallar" fungerar med ett substantiv ("en skvallerbytta") men inte med ett adjektiv.
    - Var: `besk_foralder`, `:301–302` och fler.
    - Förslag: "som byn anser vara påhittig", eller "som byn ser som …". Se också fynd 82.
52. **"Föräldern påverkar hur byn ser på henne: …"**, **"Hans förälder är känd: …"** och **"Sorgen efter Marnve, hennes mor, påverkar henne."** Spelets regler läggs i munnen på berättaren.
    - Var: `:305`, `:307`, `:461`.
    - Förslag: "Byn ser henne gärna som dotter till …", "Sorgen efter Marnve, hennes mor, tynger henne."
53. **"Byn känner henne som jägare och som påhittig."** "som" fungerar inte framför ett adjektiv.
    - Var: `besk_yrkeRykte` [3], `:242`.
    - Förslag: "Byn känner henne som jägare, och hon har rykte om sig att vara påhittig."
54. **"Onlaug den välbärgade, säger de nu. Onlaug är välbärgad, och det ser alla."** Samma ord två gånger.
    - Var: `hedersnamn` [16], `:142`.
    - Förslag: "… säger de nu, och det är sant: hon äger mer än de flesta."
55. **"Sedan han kom på hur man kan koka örter säger alla Svakik Hittaren."** Ett komma saknas efter bisatsen.
    - Var: `hedersnamn` [1], `:127`.
    - Samma sak i `oknamn` [3].
56. **"Av husen i byn har Osbjörn byggt ett hus."**
    - Var: `besk_hus` [5], `:574`.
    - Förslag: "Ett av husen i byn har {namn} byggt." med en egen form för "två hus".
57. **"Totalt har Ylvulf den yngre fällt en varg i strid."** "Totalt" om en enda.
    - Var: `besk_vargar` [4], `:553`.
    - Förslag: "Hittills har …".
58. **"Ingen i byn kan mer om samling än Gerger."**
    - Var: `besk_bast` [4], `:542`, med färdighetens namn.
    - Förslag: "samlande", eller en färdighetstext i form av en handling ("att samla").
59. **"Tusna och han lever tillsammans."** och **"Ragunn och han är bästa vänner."** Ett namn följt av ett pronomen som subjekt låter fel.
    - Var: `besk_partner` [7], `:287`, och `besk_van` [5], `:295`.
    - Förslag: "Han lever tillsammans med Tusna."
60. **"Byn valde Åfast, ålderman, att leda den."** och **"blev byns första ledare, byfader"**. Titeln står utan form.
    - Var: `k_ledare` [5], `:921`, och `k_forstaLedare` [2], `:907`.
    - Förslag: "Byn valde Åfast till ålderman." och "… och kallades byfader".
61. **"En björn anföll Ulvveig. Ulvveig skadades svårt."** Namnet upprepas.
    - Var: `k_bjornAnfall` och `{svara}` från `bjorn.ts`.
    - Samma sak i `k_vargjakt` [0]: "Ylvulf den yngre, Darorm och Eriny gick på vargjakt … Ylvulf den yngre, Darorm och Eriny skadades svårt."
    - Förslag: "Hon skadades svårt." och "Alla tre skadades svårt."
62. **"Ikel och Ulvja är inte vänner längre. De är ovänner."** Samma sak två gånger.
    - Var: `l_ovanner` [2], `:1968`. Se också fynd 79.
63. **"Aso blir glad bara Ålaug kommer in."** Det oklara "bara" och "kommer in" (in i vad?) gör meningen svår att läsa.
    - Var: `r_partner` [4] och `r_nara` [22], `:1423`, `:1452`.
    - Förslag: "Aso lyser upp när Ålaug kommer."
64. **"Ragka och Harun undrade hur de ska klara en torka."** Fel tempus.
    - Var: `p_varsel` [7], `:1232`.
    - Förslag: "skulle".
65. **"dog av kyla istiden år 29"**, och "dog av blodförlust våren år 35". Utan "under" eller "på" blir det tungt.
    - Var: `e_dog` [0] och [1], `:751`.
    - Förslag: "under istiden år 29", "på våren år 35".
66. **"Fahild för byn och Lordve bytte: …"**
    - Var: `l_byte` [0], `:1925`.
    - Förslag: "Fahild bytte för byns räkning med Lordve: …".
67. **"Ingveig blev sjuk av rått fällt vilt."**
    - Var: `l_raMat`, där {vad} är sakens namn.
    - Förslag: "rått kött".
68. **Moderna ord som bryter tonen:**
    - "Toa-hög" (`saker.ts:252`)
    - "Går avsides på toa" (`handlingar.ts:134`)
    - "Snackar skit om någon" (`handlingar.ts:317`, `humor.ts:98`)
    - "jobbar" (`seder.ts:64`)
    - "empati" (styrelseskickens titlar, `styre.ts`)
    - "Separerade från X" (`samtal.ts:252`)
    - "ligger i konflikt med" (`besk_fiende` [7])
    - "attraherad", "partner" och "intresserad av" (`besk_langtan`, aldrig valda)

    Förslag: "Avträdeshög", "Går avsides", "Talar illa om någon", "arbetar", "omtänksam", "Gick skilda vägar med X", "är osams med", "har ögonen på".
69. **Samma sak har olika namn på olika ställen:**
    - Hö kallas också "halm" och "torrt gräs".
    - Hare och kanin.
    - "den döde" och "den döda".
    - Styrelseskicken byter mellan "råda" och "råder".
    - Var: `teknik.ts:80`, `:120`, `:142`, `klader.ts:135`, `kyrka.ts` och `styre.ts:150–160`.
70. **Utbrotten: "Ask mår dåligt och slår ihjäl Bo."** Uttrycket är för svagt för ett dråp.
    - Var: `humor.ts:202`.
    - Förslag: "mår dåligt och" bara för de lindriga utbrotten. Annars ska dådet stå direkt: "I vredesmod slog Ask ihjäl Bo."
71. **Världens krönika blandar presens utan punkt ("Björkvik grundas") med preteritum och punkt ("Ask föddes, son till …").**
    - Var: `varldkronika.ts` och `vacktkronika.ts:28–35`.
    - Förslag: preteritum och punkt överallt.
72. **Siffror i löptext och i början av meningar.** Till exempel:
    - "7 tror nu på …" (`religion.ts:342`)
    - "5 blev sjuka." (`sjukdom.ts:206`)
    - "3 dog under den." (`motgang.ts:191`)
    - "2 följer med." (`resa.ts:1220`)
    - "en flock vargar (5)" (`varg.ts:253`)
    - "Den har 3 gudar" och "följer 4 bud" (`trotext.ts:15–19`)
    - "har lagats 5 gånger" (`special.ts:38`)

    Förslag: `tal()` och `ganger()`.
73. **Gränssnittet:**
    - "Det som drar ner farten tas gånger varandra." (`flikar/person.ts:208`). Förslag: "multipliceras".
    - "Öppen dörröppning" (`flikar/hus.ts:31`)
    - "Byn lägger saker här som nummer 2 av 3 lagerplatser." (`flikar/lager.ts:29`). Förslag: "Lagerplats 2 av 3."
    - "Gånger vakten väckte byn" (`flikar/grannar.ts:52`). Förslag: "Väckt av vakten".
    - "Full 40 %" (`flikar/station.ts:113`). Förslag: "Fylld till 40 %".
    - "Krig eller fred: Inget" (`ui/varldskarta.ts:282`)
    - "Byns 3" (`flikar/sak.ts:162`). Förslag: "Byn: 3".
    - "Tron är 6,5 av 10 stark hos Asdis" (`flikar/religion.ts:74`)
    - "Hösten och istiden blommar inget" (`flikar/station.ts:29`). Förslag: "På hösten och i istiden …".
    - "Behöver: trycka, förband, avsnöra." blandar verb och substantiv (`sim/halsonotiser.ts:24`, `:53`)
74. **Sammanfattningen "medan du var borta" säger samma sak två gånger.** Rutan börjar med "Medan du var borta gick 2,0 år i spelet …" (`ui/borta.ts:116`), och berättelsen under börjar ofta med "Medan du var borta gick två år." (`b_inledning` [0]).
    - Förslag: låt rutans första rad bara säga tiden i verkligheten ("Du var borta i två dygn."), så säger berättelsen åren.
75. **Registrens texter:**
    - "Ved och rep som man håller framför sig." (Sköld, `teknik.ts:212`)
    - "Hornet hörs över hela kartan" (`:215`, där "kartan" bryter berättelsen)
    - "flera högar på samma plats, så att lagret tar mindre plats" (`:126`)
    - "Den som kan lön kan lägga fram lönelagen." (`:219`)
    - "Tar av delen med kallbrand med kniven" (`halsa.ts:624`)
    - "en hel mat" (`kyrka.ts:144`)
    - Ölbudet om krukorna (`kyrka.ts:140`), som inte går att förstå

    Förslag på ny lydelse finns i underlaget, ett per rad: "En rund sköld av trä att hålla framför sig", "Hornet hörs i hela trakten", "På hyllan ryms fler högar", "Den som förstår sig på lön kan lägga fram en lag om lön", "Skär bort det som fått kallbrand för att rädda livet", "en måltid" och "När kyrkan har färre krukor öl än det finns vuxna troende ger den som tappar öl en kruka till kyrkan."
76. **Sederna har ord som inte är motsatser:** "Envälde – Allmogen" och "Ättens växt – Ättens bärkraft".
    - Var: `seder.ts:75`, `:66`.
    - Förslag: "Envälde – Folkstyre" och "Många barn – Få barn".

## Enahanda

77. **`besk_minne` domineras av "var med om något oförklarligt: svampen som gav syner"**, ofta som minnet från tre eller fyra års ålder. Det ger dessutom två kolon i samma mening: "Det starkaste minnet hon har är från när hon var 3: hon var med om något oförklarligt: svampen som gav syner."
    - Var: `uppvaxt.ts:109` (`'Var med om något oförklarligt: {om}'`) tillsammans med `besk_minne` [2] till [7], `:363–370`.
    - Förslag: "såg syner av svampen" som egen text, utan kolon. Små barn bör inte ha det som starkaste minne när de inte åt svampen själva (vem: 'bada').
78. **`k_vargAnfall` (563 gånger): alla nio varianter slutar med "{svara} skadades svårt".** Det står i krönikan för varje skadad.
    - Förslag: varianter som säger var det hände eller vad den skadade gjorde ("… när hon bar vatten från sjön"). Om flera skadas i samma anfall bör de stå i en rad.
79. **Relationsloggarna lägger samma andra mening på nästan alla varianter.** "De är nära vänner", "De har blivit bästa vänner", "De är ovänner", "De har blivit rivaler", "{om} är {hans} ärkefiende".
    - Var: `l_vanner`, `l_bastaVanner`, `l_ovanner`, `l_rivaler` och `l_arke` (`:1940–1995`). Ungefär 40 av 40 varianter har den.
    - Förslag: ta bort upprepningen i hälften av varianterna. Första meningen säger redan det.
80. **`r_bekant` [5], [11] och [13] säger samma sak med samma ord:** "har inte mycket gemensamt", "har aldrig haft mycket att säga varandra" och "har inte mycket att säga varandra" (`:1486–1495`). De valdes tillsammans 734 gånger.
    - Förslag: skriv om [13], t.ex. "{namn} och {om} går om varandra utan att märka det."
81. **Beskrivningen av egenskaper:**
    - `besk_drag1` [0] valdes 464 av 1 161 gånger (40 %).
    - `e_drag1` [0] och [1] stod för 227 av 230.
    - `e_drag0` valde bara [7], och `besk_drag0` bara 3 av 12.
    - Det beror troligen på villkoren (åldersordet `{alder}` finns nästan alltid). Varianterna utan `{alder}` behöver fler villkor eller ett eget villkor åt andra hållet.
82. **Rykten: "påhittig" och "klåpare" fyller `besk_foralder`, `besk_yrkeRykte` och `besk_rykte`.**
    - I `besk_foralder` slutar 30 av 48 exempel med "som byn kallar påhittig".
    - Uppfinnarna får alla samma tre hedersnamn: Hittaren, Finurlig och den listige/listiga.
    - Det är snarare spelet än texten: varje teknik ger ryktet påhittig. Texten skulle kunna variera ordet ("klurig", "händig", "fyndig") eller nämna uppfinningen.
83. **`oknamn` handlar nästan alltid om "gjorde ett uselt träspjut"** (Tummen, Klåparen, Spillan). Det är spelets händelser, inte mallen. Men "uselt träspjut" är också vanligaste ämnet i `u_gjord` och `u_nara`, så byn låter likadan överallt.
84. **`p_fara` säger alltid "en farlig plats", och `p_plats` säger nästan alltid "vatten".**
    - Var: `{om}` från lärdomarna.
    - Förslag: säg vad som var farligt ("där vargarna har sin lya", "isen vid udden"), som `p_kunskap` gör bra.
85. **Hälsotankarna `h_ont` och `h_gott` (31 000 gånger) är åtta korta svar var, varav en tom.** Det fungerar, men "Hon vågar knappt tro att det är sant" (3 416 gånger) passar inte till små glädjeämnen. Det behövs fler och mildare varianter.
86. **`besk_raddVarg` valde bara [4] ("rädd för skogen om natten").** `besk_langtan` valde bara [0] ("förälskad i") och `e_drag0` bara [7]. Det syns inget villkor som hindrar de andra. Valet ur hashen verkar ge samma variant för samma person dygn efter dygn, så få personer betyder få varianter.

## Aldrig valda

Sammanfattning: 43 mallar användes aldrig, och 695 av 1 572 varianter valdes aldrig.

87. **24 mallar skrivs bara när spelaren öppnar något, och verktyget öppnar dem aldrig.** Det gäller:
    - `b_lugnt`, `b_inledning`, `b_ar`, `b_arLugnt`, `b_alder`, `b_ovrigt` och `b_nu` ("medan du var borta", `ui/borta.ts`)
    - `h_start`, `h_arg`, `h_stamning` och `h_slut` (handeln vid filten, `ui/flikar/filt.ts`)
    - `f_start`, `f_bud`, `f_publik`, `f_mott`, `f_verkan` och `f_inget` (framträdandet, `ui/flikar/fram.ts`)
    - `m_start`, `m_lopp`, `m_vinst`, `m_slut`, `m_pris`, `m_publik` och `m_installd` (matchen, `ui/flikar/match.ts`)

    `titta()` i `src/test/textkoll.ts:81` anropar inte `handelBerattelse`, `framBerattelse`, `matchBerattelse` eller borta-texten. De går alltså aldrig genom kontrollerna. Förslag: lägg dem i `titta()`, så att de räknas och kontrolleras.
88. **`besk_skam` och `besk_verkstad` (delarna "skam" och "verkstad") valdes aldrig på 45 dygn.**
    - Villkoren kan bli sanna: skammen finns, och det finns hus nära verkstaden.
    - Vikten för verkstaden är låg (0,3), och beskrivningen tar bara två delar med de fasta först.
    - Sällsynt, inte omöjligt.
89. **`besk_barn` valdes aldrig, fast någon i byn hade fem barn** (`k_dog` [9]: "lämnade 5 barn efter sig").
    - Villkoret (`:2413`) kräver minst fyra barn och ingen titel "Mor till …".
    - Den som har så många barn är oftast död, och `titta()` beskriver bara de fem senast döda.
    - Troligen sällsynt för de levande. Värt att pröva i ett scenario.
90. **`besk_foraldralos` och `besk_vardat` valdes aldrig.**
    - Föräldralös kräver att båda föräldrarna dött innan barnet blev vuxet. Det är sällsynt men möjligt.
    - Vårdat kräver minst fem vårdtillfällen (`BERATT.vardMin`) och att personen inte har fällt vargar eller byggt hus, för de går före i `talDel()` (`:2429–2434`). Det gör det mycket sällsynt.
    - Förslag: låt `talDel()` välja den del med flest tillfällen i stället för en fast ordning.
91. **`besk_mastarverk`, `m_perfekt`, `m_liv`, `m_nara`, `m_minne` och `m_varg` valdes aldrig.** Mästerverk var få (sju berättelser). `m_perfekt` kräver kvalitet 5 och ett namn på saken. `m_varg` kräver att någon fällt en varg med saken. Händelserna är sällsynta.
92. **`k_utvisad`, `r_ratt` och `r_folk` valdes aldrig.** Inga rättegångar eller utvisningar skedde på 45 dygn i de åtta byarna. Sällsynt.
93. **`k_bjornjakt`, `k_bjornjaktMiss`, `k_bjornSprang` och `k_skadadLek` valdes aldrig.** Ingen björnjakt eller lek med svår skada skedde. Sällsynt.
94. **`p_special` valdes aldrig.** Det sätts bara av `berattaSpecial()` (`special.ts:52`) när byn har en egen rätt och samtalet är vänligt. Sällsynt.
95. **Varianter med villkor för en händelse som aldrig inträffade:**
    - `l_byte` [6] och [7] och `l_gava` [5] och [6] ("höll på att dö")
    - `e_dog` [6] ("levde ett långt liv")
    - `k_dog` [8], [12], [13], [14] och [18] (`{nar}` och partnern som vakade)
    - `r_nara` [18], [23], `r_van` [18] och `r_bekant` [20] ("slagits sida vid sida", "barnen de fått", "sett {om} växa upp")

    `r_nara` [23] och `r_bekant` [20] borde vara vanliga i en by på 45 år. Värt att kontrollera att villkoren fylls i (`ung`, `barn`).
96. **Aldrig valda varianter utan villkor:**
    - `besk_aldst` [2], [5] och [7]
    - `besk_titel` 7 av 8
    - `besk_bast` [1], [5] och [6]
    - `k_forstaVarg` 9 av 10
    - `k_forstaBjorn` 7 av 8
    - `m_gjord` 9 av 11

    Varianten väljs ur hashen per person och tid, och händelserna var få. Inget fel, men de syns först när fler byar eller dygn körs.

## Tid och tal

97. **`durTxt` visar alltid en decimal och blandar två tidsskalor.**
    - Var: `src/ui/hjalp.ts:16`. Den används i eld, fält, sak, sjö och person.
    - Det blir "för 3,0 timmar sedan", "1,0 år" och "2,0 timmar kvar".
    - "timmar" och "minuter" är tid i verkligheten, och "år" är tid i spelet, utan att det sägs. Tre timmar i verkligheten är ungefär en och en halv månad i spelet.
    - Förslag: hela tal när det är jämnt, och spelets ord för korta spann ("ungefär en månad"). Alternativt båda, som Hälsofliken gör (`person.ts:121`): "3 timmar (1½ månad i spelet)".
98. **Sammanfattningen: "1,2 dag" och "2,0 år".**
    - Var: `ui/borta.ts:105`, `:112`.
    - Förslag: "dygn" som i resten av spelet, och hela tal utan ",0".
99. **Resans dagbok skriver tid i verkligheten som om den vore tid i spelet:**
    - "rastade i 24 timmar" (`resa.ts:1710`), som är ett helt år i spelet
    - "förlorade 4 timmar" (`:1425`)
    - "väntade ut det i 6 timmar" (`:1433`)
    - "Gick ner i gruvan för 12 timmar" (`:898`, där "för" dessutom är en anglicism)
    - "kom hem efter 3 dygn" (`:1382`), som är tre år i spelet

    Förslag: spelets tid i ord ("rastade ett år", "gick vilse och förlorade två månader"), eller båda.
100. **Eldens rad: "Elden slocknade efter att ha brunnit i 2,3 dygn", "i 1 timmar", "i 40 minuter".** Det blir decimaler, fel böjning och verkliga minuter.
    - Var: `eld.ts:263`, `:426` (`durText`).
    - Förslag: spelets tid i hela ord.
101. **Begravningsbuden säger "bålet lägger en timme till arbetet" och "sänks på en halv timme".** Koden ger 2 verkliga minuter för båda, ungefär tolv timmar i spelet.
    - Var: `kyrka.ts:162`, `:164` mot `grav.ts:452–453`.
    - Förslag: bygg texten ur talet, eller säg det utan tal.
102. **Matchen och stationerna: "Matchen varade i 12 minuter", "Arbete 15 min" och "ca 15 minuter per tändningsförsök".** Det är verkliga minuter, där 12 minuter är tre dygn i spelet, men det sägs inte.
    - Var: `flikar/match.ts:17`, `:26`, `flikar/station.ts:126`, `flikar/eld.ts:52`.
    - Förslag: spelets tid, eller förklaringen i title ("15 minuter i verkligheten, ungefär fyra dagar i spelet").
103. **"Slits 1.5 gånger fortare än i lagret".** Decimalpunkt i stället för komma.
    - Var: `flikar/lager.ts:46`.
    - Förslag: `num()`, eller "en och en halv gång så fort".
104. **Samma avstånd i två enheter på världskartan: "2,5 dygn till fots" och "2 år kvar" för sällskapen.**
    - Var: `ui/varldskarta.ts:282` och `:289–290`.
    - Förslag: `omUngefar()` även för avståndet ("ungefär tre år till fots").
105. **`omUngefar` faller tillbaka på timmar och minuter under ett år.** Det blir "framme om ungefär 5,0 timmar" och "uppgiften 40 minuter gammal" bland år och tidsåldrar.
    - Var: `ui/hjalp.ts:65`, `flikar/grannar.ts:43`, `:73`.
    - Förslag: spelets ord också under ett år ("några månader", "några dagar").
106. **"Torkar på fem dygn" och "röks på ett dygn i stället för fem".** Det är verkliga dygn, alltså fem år i spelet, och det låter orimligt för att torka kött.
    - Var: `teknik.ts:197–198` och stationernas texter.
    - Förslag: "fortare än på torkställningen", utan tal.
107. **Skatten betalas "varje år" medan myroffret sker "En gång om dygnet".** Båda betyder ett verkligt dygn. Myroffrets "i {tim} timme" blir "2 timme" om talet ändras.
    - Var: `lagar.ts:99` och `kyrka.ts` (myrOffer).
    - Förslag: "en gång om året" i båda, och "timmar" böjt efter talet.
108. **Siffror för små åldrar i krönikan:**
    - "Hon blev 2 år", "Han hann bli 1 år" och "vid 3 års ålder" (`k_dog` [1], [4], [7], [15], [16])
    - "lämnade 5 barn efter sig" ([9])

    `e_dog` skriver samma åldrar med ord ("bara fem år gammal"). Kontrollen undantar siffror före "år", så det syns inte.

    Förslag: `{aldern}` (med ord upp till tolv) också i `k_dog`, och `talOrd()` för barnen.
109. **"Ask dog …, 0 år gammal."**
    - Var: `liv.ts:150–151` (loggen, notisen och personens rad).
    - Förslag: "som spädbarn", som `k_dogSpad` gör.
110. **Värden utan enhet: "bytet var värt 37, det som gått åt 12" och "saker värda 37".**
    - Var: `resa.ts:1029`, `skatt.ts:140`, `:163`.
    - Förslag: värdet i silver, eller i ord ("ett gott byte").
111. **Resurser i decimaler kan synas:**
    - `sakLista` i `resa.ts:1375` avrundar inte (se fynd 3).
    - "tog 3 saker mat" (`varg.ts:507`) räknar mat som "saker".
    - Förslag: `Math.floor` och `antal()`, och "tog tre bitar kött".

---

## Bedömning

**Det som är bra:**
- Mallarna för människorna är det starkaste. Beskrivningarna, krönikan om död och födelse, samtalen, sorgen och relationerna är skrivna på enkel, varm och konkret svenska, med bilder som passar tiden: elden, stigen, snön och "sa ingenting, vilket sa allt".
- Mallarna för usla saker (`u_gjord`, `u_nara`) är roliga och varierade.
- `p_kunskap` och `p_langtan` visar hur ett samtal kan vara konkret.
- Ordlagret i `ord.ts` (`antal`, `tal`, `och`, `gen`, `han`/`honom`) är bra och skulle rätta det mesta, och hjälptexterna i gränssnittet förklarar bra.
- Hälsofliken visar hur tid ska skrivas, med både tiden i verkligheten och i spelet.

**Det som behöver mest arbete:**
1. **Texterna utanför mallarna** (loggen, notiserna, resans dagbok och gränssnittets fasta rader). Där syns id, "hen", "1 äpplen", "en läder" och `${namn}s`. Två ändringar skulle ta bort det mesta: att alltid använda `antal()`, `gen()` och `han()`, och att låta textkontrollerna köra på allt som skrivs (`log`, `kronika`, `notis`, `think`), inte bara på mallarna.
2. **Tiden.** Nästan överallt utanför Hälsofliken skrivs timmar, minuter och dygn i verklig tid utan förklaring, och ofta med en decimal. En gemensam funktion för "tid i spelet i ord" (och båda skalorna där det behövs) rättar fynd 97 till 109.
3. **Bestämd form och genus för saker och hus** (`bestamd()`, `husFalt()`, `ett`-flaggor). Bättre vore ett fält i registren än regler på ordets slut.
4. **Några få mallar säger fel saker** (skador som bedrifter, "bara händerna" som vapen, sociala tekniker som hantverk, `l_arke` [1]). De är lätta att rätta och syns ofta.
5. **Verktyget `texter`** bör också skriva handeln, framträdandet, matchen och sammanfattningen (fynd 87), så att 24 mallar kommer med i kontrollerna.

## Antal fynd per grupp

| Grupp | Fynd | Antal |
|---|---|---|
| Fel | 1–44 | 44 |
| Stelt eller konstigt språk | 45–76 | 32 |
| Enahanda | 77–86 | 10 |
| Aldrig valda | 87–96 | 10 |
| Tid och tal | 97–111 | 15 |
| **Totalt** | | **111** |
