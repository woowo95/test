# Texterna: grammatik och variation (underlag)

Textchatten har gjort grundarbetet här, på samma sätt som bildstilen: inget i `src/` är ändrat. Programmeringschatten bygger in det Björn sagt ja till i avsnittet **Texterna** på bildstilens sida (https://claude.ai/artifact/Khx8Ggn4CdRb76UpZLnQww). Björns svar ligger i bildstilens databas, samlingen `texter`: `f-<kort>` är ett förslag (`svar` = `ja` eller `nej`, och `kommentar`; korten heter `r-<rättelse>`, `k-<kontroll>` och `m-<mall>`), `e-<hash>` en kommentar till en mening i exemplen (`text`, `mall`, `vy`, `kommentar`) och `m-<vy>-<mall>` en kommentar till en hel mall. Läs dem med ArtifactData.

Bara texterna ändras, inte hur spelet räknar. Varianterna väljs som i dag med `valjVariant`, alltså med en hash av byns frö, nyckeln och timmen, aldrig med spelets slump. Därför ska `npm run samma` vara exakt lika efteråt, med ett undantag: namnen i punkt 1f.

## Filerna

| Fil | Vad den gör |
|---|---|
| `forslag.ts` | Alla förslag som register: `RATTELSER` (1a–1f), `NYA_KONTROLLER` (2), `NYA_VARIANTER` (3b–3e och 1c), `NYA_MALLAR` (3a), `NYA_FALT`, och ordlistorna `LARA`, `NAR_AKT` och `LARM_VAD`. |
| `prova.ts` | Fyller varje ny variant med exempel, även med villkoren uppfyllda, och kör spelets kontroller och de nya på dem. Kör också de nya kontrollerna på texterna som spelet skriver i dag. Ger `prova.txt` och `forslag.json`. Kör: `npx tsx texter/prova.ts texter/matning/texter-fore.json texter/matning/logg-*.json` |
| `namn.ts` | Förslaget till namnen (1f): `foga(början, mitten, slutet)`. Kör: `npx tsx texter/namn.ts` |
| `loggrader.ts` | De vanligaste fasta raderna i loggen för en by, med namnen bytta mot X och talen mot N. Kör: `npx tsx texter/loggrader.ts 1 45` |
| `sallsynt.ts` | Räknar det som de oanvända mallarna kräver (3f). |
| `matning/` | Mätningen före: `texter-fore.txt` och `.json` från `npm run texter -- 8 45`, och loggraderna i byarna 1, 42, 777 och 5. |
| `exempel.ts` | Exemplen att läsa: alla varianter i mallarna som ändras, ifyllda med sex olika personer (man och kvinna, namn som med 1f) och olika saker, det spelet skrev i dag för de andra mallarna och loggens vanligaste fasta rader. Ger `exempel.json`. Kör: `npx tsx texter/exempel.ts` |
| `bygg.cjs` | Bygger `sida.json` (korten och exemplen) som bildstilens avsnitt Texterna läser. Kör sedan `node bildstil/bygg.cjs` och publicera bildstilen. |

## Mätningen före

`npm run texter -- 8 45` räknade 8 byar i 45 dygn (45 år i spelet, drygt sex veckor i verkligheten):

- 101 mallar med 889 varianter. 288 varianter valdes aldrig.
- 16 mallar användes aldrig: besk_vardat, besk_mastarverk, besk_egetHus, k_utvisad, r_ratt, r_folk, k_skadad, k_skadadLek, k_atergrundad, m_gjord, m_liv, m_nara, m_inskr, m_konst, m_perfekt och m_varg.
- Spelets kontroller hittade 0 fel. De kontrollerar bara mallarna, inte loggens rader.
- Loggen hade 1 079 olika fasta rader i fyra byar under 45 dygn.

De nya kontrollerna, körda på texterna i dag med `prova.ts`, hittade:

| Kontroll | Antal | Exempel |
|---|---|---|
| Rykte utan artikel | 818 | "Vid elden säger man att hon är lögnare." |
| Genus i loggen | 331 | "Igik gav en träspjut till Tukstig." |
| hen om en viss person | 135 | "Igik lät hen stanna." |

## Inbyggnaden, i ordning

### 1. Rättelserna (`RATTELSER`)

Varje rad anger filen, hur texten ser ut nu, vad den ska bli och varför.

- **1a. hen.** Byt hen mot han eller hon efter könet i alla texter om en viss person. `hon()` och `hennes()` finns i styre.ts och kan flyttas till folk.ts. Allmänna texter om "den som …" skrivs om med den som, man eller ett substantiv.
- **1b. Ändelser, genus och tal.**
  - `${d.namn}en` (stationer.ts:1109)
  - "Går med i bollspelen" (sport.ts:110)
  - `varorText` sätter alltid "en" framför ett redskap och skriver "1 rötter"
  - "Lagerplats 2 blev för litet"
  - "lärt sig att göra ledarskap" (mallen `l_lart` med `LARA`)
  - "kom på boll" i krönikan (`{teken}` med `bestamd`)
- **1c. Skälet i hedersnamn och öknamn.** `skalTill` ska returnera `{ skal, tillst }`.
  - De gamla varianterna får villkoret `om: f => !f.tillst`.
  - De nya varianterna med `{tillstand}` står i `NYA_VARIANTER.hedersnamn` och `NYA_VARIANTER.oknamn`.
  - `binamnInfo` skriver `är ${tillstand}`.
- **1d. Artikeln.** Använd `INTRYCK[k].som ?? INTRYCK[k].namn` på tre ställen: rykten.ts:280, `f.rykte` i beskrivningen och relationText:1775.
- **1e. Binamnen.** Rik blir "den förmögne" eller "den förmögna". Smakfull blir "Pärlan".
- **1f. Namnen.** Använd `foga()` ur namn.ts i makeName (folk.ts).
  - Osllo blir Oso, Kolrkfast blir Kolfast, Ylvlle blir Ylve, Irnkel blir Ikel och Tusskleif blir Tusleif.
  - 11 948 av 27 132 möjliga namn ändras.
  - Slumpen dras som förut. Ett namn som redan finns i byn kan ändå någon gång leda till en ny dragning, och då blir utvecklingen annan från den födseln.
  - Spara nytt facit (`npm run facit`).
- **Ord.** "jobbig" blir "besvärlig" och "toaletten" blir "latrinen".

### 2. De nya kontrollerna (`NYA_KONTROLLER`)

Lägg till tre rader i `KONTROLLER` i src/test/textkoll.ts:

- `hen`: hen, hens eller henom.
- `artikel`: "som", "är" eller "var" följt av lögnare, tjuv, klåpare eller vargdödare. "som samlare" är rätt svenska, så kontrollen gäller bara ryktena.
- `andelse`: en ändelse på ett namn som slutar på -a eller -e.

Förslag: `npm run texter` lyssnar också på `s.log` och kör kontrollerna på loggens rader, som `loggrader.ts` gör. Annars syns felen i loggen aldrig.

Kontrollen `hen` larmar på de allmänna förklaringarna tills de är omskrivna (1a). Skriv därför om dem samtidigt.

### 3. Mer variation

- **3a. Nya mallar (`NYA_MALLAR`).** Det är de vanligaste fasta raderna i loggen:
  - byten (562 + 540 + … gånger)
  - gåvor och vänskap
  - ovänner, rivaler och ärkefiender
  - slagsmål och larm
  - magsjuk, rå mat och svårt sjuk
  - lärande, rykten och flinta

  Den första varianten är alltid dagens text. Skriv raderna med `berattelse(s, mall, nyckel, f)`, eller med en hjälp `loggBer` som fungerar som `kronikaBer` (NYA_FALT.logg). Lägg till mallarna i `MDEF` i berattelser.ts.

  Födslarna har redan mallen k_fodd: loggraden kan få samma text som krönikan.
- **3b. Relationerna.** Lägg till fälten i NYA_FALT.relation: ung, gammal, glad, mycketPrat, sida, gral, slag, barn och kin.
- **3c. p_vardag.** Lägg till fälten arstid, natt, kallt, regn, inne, yrke och barn.
- **3d. besk_drag2.** Inga nya fält behövs.
- **3e. k_dog.** Lägg till `nar` (vad den döde gjorde vid olyckan, ur `NAR_AKT`) och `sorjer` (partnern, bästa vännen eller en förälder).

| Mall | Före | Efter |
|---|---|---|
| r_nara | 12 | 24 |
| r_van | 12 | 22 |
| r_bekant | 12 | 21 |
| r_ogillar | 12 | 20 (en variant utbytt) |
| r_ovan | 12 | 21 |
| p_vardag | 8 | 20 |
| besk_drag2 | 10 | 18 |
| k_dog | 12 | 19 |
| hedersnamn | 10 | 15 |
| oknamn | 10 | 15 |
| 15 nya loggmallar | 0 (fasta rader) | 84 |

Totalt blir det 170 nya varianter. Alla klarar spelets kontroller och de nya.

### 3f. De 16 mallarna som aldrig användes

Mätt med `sallsynt.ts` i byarna 1 och 42 efter 45 dygn:

| Mallar | Varför de inte användes | Vad som behöver göras |
|---|---|---|
| m_gjord, m_liv, m_nara, m_inskr, m_konst, m_perfekt, m_varg, besk_mastarverk | Ingen hade blivit mästare, och inget mästerverk fanns. Sällsynt, inget fel. | Inget. |
| r_ratt, r_folk | Rättegångar fanns (19 och 22 straff), men texten skrivs bara när fliken Styre öppnas, och `titta()` i textkoll.ts öppnar den inte. | Fel i verktyget: `titta()` ska också skriva `rattegang()` för byns rättegångar. |
| besk_egetHus | Tre familjehus hade en ägare. Delen väger 0,4 och slås ut av tyngre delar (högst 3–4 delar), och `agodel` ger mästerverk, rik och fattig först. | Björn avgör om vikten ska höjas. Den ändrar inte spelet. |
| besk_vardat | Ingen hade vårdat 5 gånger. | Sällsynt. |
| k_utvisad | Ingen hade drivits ut, vilket är det strängaste straffet. | Sällsynt. |
| k_skadad, k_skadadLek | Ingen blev svårt skadad i ett slagsmål i byn. "Skadades svårt" i ryktena kommer från olyckor. | Sällsynt. |
| k_atergrundad | Ingen by dog ut. | Sällsynt. |

Inga nya varianter är skrivna till dessa mallar förrän de används.

## Testa när det är inbyggt

1. Kör `npm run snabbkoll`.
2. Kör `npm run samma`. Den ska vara lika, utom namnen i 1f. Bygg därför in 1f sist och för sig, och spara nytt facit.
3. Kör `npm run texter -- 8 45` och jämför med `matning/texter-fore.txt`.

## Det som återstår

- Björns svar på sidan Texterna.
- Fler loggrader kan bli mallar efter de 15 vanligaste, till exempel "kom på hur man gör …", "kallas nu för …", krönikans uppfinningar och vädret.
- Varianter till de sällsynta mallarna när de väl används.
