// Förslagen till texterna (texter/README.md): grammatiken och variationen. Underlag som programmeringschatten bygger in i
// src/; den här filen ändrar inget i spelet. Allt är rader i register, så att varje förslag kan sägas ja eller nej till på
// sidan Texterna och läggas in för sig.
//   RATTELSER      fel i texter som spelet skriver i dag: var, hur det ser ut nu, vad det ska bli och varför (punkt 1)
//   NYA_KONTROLLER nya rader till KONTROLLER i src/test/textkoll.ts (punkt 2)
//   NYA_VARIANTER  fler varianter till mallar som redan finns i BERATTELSER (punkt 3b–3e)
//   NYA_MALLAR     nya mallar för de vanligaste fasta raderna i händelseloggen (punkt 3a)
//   NYA_FALT       fälten som de nya varianterna behöver, och hur de räknas (utan spelets slump)
//   LARA, NAR_AKT  ordlistor som fälten läser
// Regler för texterna: järnålderns svenska, inga nya ord (NYA_ORD i textkoll.ts), korta meningar med olika början,
// samma fakta som förut. Varianten väljs som i dag med valjVariant (hash av byns frö, nyckeln och timmen), aldrig ur
// spelets slump, så att snabbläget och det levande läget blir lika och npm run samma inte ändras.
import type { Fyllning, Variant } from '../src/sim/berattelser';
import type { Kontroll } from '../src/test/textkoll';

export interface Rattelse { id: string; grupp: string; fil: string; nu: string; blir: string; varfor: string; exempel?: [string, string] }
export interface NyMall { fil: string; nu: string; falt: string; varianter: Variant[]; exempel: Fyllning[] }
export interface NyaVarianter { varfor: string; falt?: string; ta_bort?: string[]; varianter: Variant[]; exempel: Fyllning[] }

const ja = (k: string) => (f: Fyllning) => !!f[k], nej = (k: string) => (f: Fyllning) => !f[k];

// ---------- 1. Rättelserna ----------
export const RATTELSER: Rattelse[] = [
  // 1a. hen i texter om en viss person: han eller hon efter könet (styre.ts har redan hon() och hennes())
  { id: 'hen_stal', grupp: '1a hen', fil: 'src/sim/behov.ts:285', nu: 'hade stulit hens ${namnOf(key)}', blir: 'hade stulit ${hennes(offret)} ${namnOf(key)}', varfor: 'hen om en viss person; den bestulnes kön.', exempel: ['Ask märkte att Ylva hade stulit hens yxa.', 'Ask märkte att Ylva hade stulit hans yxa.'] },
  { id: 'hen_lurat', grupp: '1a hen', fil: 'src/sim/behov.ts:570', nu: 'hade lurat hen i ett byte', blir: 'hade lurat ${honom(p)} i ett byte', varfor: 'Den lurade är en viss person (23 gånger på 45 dygn i fyra byar).', exempel: ['Ask märkte att Ylva hade lurat hen i ett byte.', 'Ask märkte att Ylva hade lurat honom i ett byte.'] },
  { id: 'hen_handlare', grupp: '1a hen', fil: 'src/sim/handel.ts:442', nu: 'hade lurat hen', blir: 'hade lurat ${honom(h)}', varfor: 'h är handlaren; handlarens kön.' },
  { id: 'hen_tro', grupp: '1a hen', fil: 'src/sim/religion.ts:233', nu: 'och tror som hen', blir: 'och tror som ${hon(samma.grundare)}', varfor: 'Grundarens kön.' },
  { id: 'hen_sover1', grupp: '1a hen', fil: 'src/sim/stationer.ts:1096 och 1098', nu: "'huset där hen sover' / där hen sover", blir: "'huset där ${hon(p)} sover'", varfor: 'Ägarens kön.' },
  { id: 'hen_stanna', grupp: '1a hen', fil: 'src/sim/liv.ts:185 och 196', nu: 'ville inte att hen skulle stanna, och hen gick vidare / lät hen stanna', blir: 'ville inte att ${hon(f)} skulle stanna, och ${hon(f)} gick vidare / lät ${honom(f)} stanna', varfor: 'Främlingens kön.' },
  { id: 'hen_nar', grupp: '1a hen', fil: 'src/sim/halsa.ts:126–128, brand.ts:375, jakt.ts:213', nu: "'när hen slaktade', 'när hen rensade fisk', 'när hen slog flinta', 'när hen släckte elden', 'när hen grep en hare'", blir: "nar som funktion av personen: (p) => `när ${hon(p)} slaktade`", varfor: 'Används i "${p.name} fick ett skärsår ${nar}"; personen finns där.', exempel: ['Ask fick ett skärsår när hen slaktade.', 'Ask fick ett skärsår när han slaktade.'] },
  { id: 'hen_slog', grupp: '1a hen', fil: 'src/sim/humor.ts:178', nu: 'när ${p.name} slog hen', blir: 'när ${p.name} slog ${honom(offret)}', varfor: 'Offrets kön.' },
  { id: 'hen_straff', grupp: '1a hen', fil: 'src/sim/styre.ts:299 och 334', nu: "straffade hen / fallback hen: 'hen'", blir: "straffade ${honom(q)}; fallbacken tas bort (den dömde finns alltid)", varfor: 'Den dömdes kön.' },
  { id: 'hen_hylla', grupp: '1a hen', fil: 'src/sim/framtradande.ts:176', nu: 'för att hylla hen', blir: 'för att hylla ${honom(l)}', varfor: 'Den som hyllas.' },
  { id: 'hen_varm', grupp: '1a hen', fil: 'src/sim/eld.ts:139', nu: "'Det är kallt och hen vill hålla värmen'", blir: "`Det är kallt och ${hon(p)} vill hålla värmen`", varfor: 'Varför-texten i personrutan gäller en viss person.' },
  { id: 'hen_tror', grupp: '1a hen', fil: 'src/sim/minne.ts:429 och 431', nu: 'än hen tror', blir: 'än ${hon(p)} tror', varfor: 'En viss person.' },
  { id: 'hen_anseende', grupp: '1a hen', fil: 'src/sim/rykten.ts:479 och 482', nu: 'bild av hen / tycker att hen är', blir: 'bild av ${honom(q)} / tycker att ${hon(q)} är', varfor: 'anseendeText gäller en viss person.' },
  { id: 'hen_pynt', grupp: '1a hen', fil: 'src/sim/rykten.ts (HANDELSER.pynt)', nu: "'har pyntat där hen sover med {sak}'", blir: "'har pyntat där {hen} sover med {sak}' och {hen} fylls i skalTill (som {om} och {sak})", varfor: 'Beviset gäller en viss person; texten hamnar i hedersnamnet ("för hon har pyntat …").' },
  { id: 'hen_teknik', grupp: '1a hen', fil: 'src/sim/stationer.ts:169–224 och teknik.ts (forsta, effekt)', nu: 'Den som tycker om krukor ställer en där hen sover: hen trivs där, och de som ser den tycker bättre om hen.', blir: 'Den som tycker om krukor ställer en där den sover, trivs där, och de som ser den tycker bättre om ägaren.', varfor: 'Allmänna texter om "den som …" ska inte ha hen; skrivs om med den som, man eller ägaren (36 + 30 + 19 gånger på 45 dygn i fyra byar).', exempel: ['X kom på hur man gör lerkruka. Den som tycker om krukor ställer en där hen sover: hen trivs där, och de som ser den tycker bättre om hen.', 'X kom på hur man gör lerkrukor. Den som tycker om krukor ställer en där den sover. Där trivs den, och den som ser krukan tycker bättre om ägaren.'] },
  { id: 'hen_allman', grupp: '1a hen', fil: 'src/sim/typer.ts, seder.ts, slump.ts, rykten.ts (INTRYCK.betyder)', nu: "t.ex. 'Man tror mindre på det hen berättar.', 'Har ett vackert pynt där hen sover.'", blir: "'Man tror mindre på det lögnaren berättar.', 'Har ett vackert pynt där den sover.'", varfor: 'Förklaringar som inte gäller någon viss person: den som, man eller ett substantiv i stället för hen.' },
  // 1b. ändelser som hängs på ett namn
  { id: 'andelse_bars', grupp: '1b ändelser', fil: 'src/sim/stationer.ts:1109', nu: '`${d.namn}en bars in i …`', blir: '`${d.ett ? \'Ett\' : \'En\'} ${d.namn.toLowerCase()} bars in i …`', varfor: 'Bestämd form byggs inte genom att hänga -en på namnet.', exempel: ['Lerkrukaen bars in i huset. Snidat väggbrädeen bars in i huset.', 'En lerkruka bars in i huset. Ett snidat väggbräde bars in i huset.'] },
  { id: 'andelse_sport', grupp: '1b ändelser', fil: 'src/sim/sport.ts:110', nu: '`Går med i ${d.namn.toLowerCase()}en`', blir: '`Går med och spelar ${d.namn.toLowerCase()}`, eller ett eget fält bestamd på raden i SPORTER (bollspelet, snöbollskriget, kastet mot målet)', varfor: 'Ger Bollspelen, Snöbollskrigen, Kast mot målen.', exempel: ['Går med i bollspelen.', 'Går med och spelar bollspel.'] },
  { id: 'genus_byte', grupp: '1b ändelser', fil: 'src/sim/byte.ts:51 (varorText)', nu: "`${x.t ? 'en' : tal(x.n)} …`", blir: "`${x.t ? (SAKER[x.k]?.ett ? 'ett' : 'en') : tal(x.n)} …`", varfor: 'Ett redskap fick alltid en (166 gånger "gav en träspjut" på 45 dygn i fyra byar).', exempel: ['Ylva gav en träspjut till Ask.', 'Ylva gav ett träspjut till Ask.'] },
  { id: 'tal_ett', grupp: '1b ändelser', fil: 'src/sim/byte.ts:51 (varorText)', nu: "tal(x.n) + ' ' + namnet: '1 rötter', '1 grenar', '1 harkött', '14 grenar'", blir: "talOrd(n) (berattelser.ts) för de små talen, och vid 1 sakens form i ental: ett fält en på raden i SAKER (en rot, en gren, en bit harkött, ett bär), annars 'lite'", varfor: 'Ental med flertalsform; siffror mitt i en mening.', exempel: ['Ija och Frörhild bytte: 1 rovor mot 1 rötter.', 'Ija och Frörhild bytte: en rova mot en rot.'] },
  { id: 'genus_lager', grupp: '1b ändelser', fil: 'src/sim/lager.ts:771', nu: '`${zs[grew].namn ?? \'Lagret\'} blev för litet`', blir: "`${namn} blev för ${namn ? 'liten' : 'litet'}`", varfor: 'Lagerplats är ett en-ord: "Lagerplats 2 blev för liten" (26 gånger).' },
  { id: 'lara_gora', grupp: '1b ändelser', fil: 'src/sim/teknik.ts:201', nu: 'har lärt sig av ${from.name} att göra ${t.namn.toLowerCase()}.', blir: 'mallen l_lart med {lara} ur LARA (att odla, att leda byn, att bygga timmerhus, att tälja träspjut)', varfor: '"lärt sig att göra ledarskap", "att göra odling", "att göra boll" (över 1 000 gånger på 45 dygn i fyra byar).', exempel: ['Ask har lärt sig av Ylva att göra ledarskap.', 'Ask har lärt sig av Ylva att leda byn.'] },
  { id: 'kom_pa', grupp: '1b ändelser', fil: 'src/sim/teknik.ts (log när någon kommer på en teknik)', nu: 'X kom på hur man gör odling. / … hur man gör ledarskap.', blir: 'X kom på hur man {lara}: "kom på hur man odlar", eller "X kom på odlingen" med bestamd() från berattelser.ts', varfor: 'Samma fel som ovan.' },
  // 1c. hedersnamn och öknamn: {skal} är antingen en händelse eller ett tillstånd
  { id: 'skal_tva', grupp: '1c skäl', fil: 'src/sim/berattelser.ts:1267 (skalTill) och 1320 (binamnInfo)', nu: "skalTill ger en händelse ur HANDELSER ('vann ett slagsmål mot Ylva') eller `var så ${INTRYCK[k].namn}`", blir: "skalTill ger { skal, tillst }: tillst = true när det inte fanns något bevis. Fälten {skal} (händelsen) och {tillstand} = INTRYCK[k].som ?? INTRYCK[k].namn ('flitig', 'en lögnare'). Varianterna med {skal} får om: f => !f.tillst, och nya varianter med {tillstand} om: f => !!f.tillst (NYA_VARIANTER.hedersnamn och .oknamn). Binamn sparar tillst, och binamnInfo skriver `är ${tillstand}` i stället för `var så …`.", varfor: '"Sedan han var så välbärgad säger alla …" och "för hon var så lögnare".', exempel: ['Sedan han var så välbärgad säger alla Osllo Smörbyttan.', 'Alla vet att Oso är välbärgad, och nu säger de Oso Smörbyttan.'] },
  // 1d. artikeln
  { id: 'artikel_rykte', grupp: '1d artikel', fil: 'src/sim/rykten.ts:280', nu: '`Det går rykten om att ${e.namn} är ${d.namn}.`', blir: '`… är ${d.som ?? d.namn}.`', varfor: '"att Ask är lögnare" (48), "klåpare" (41), "tjuv" (18) på 45 dygn i fyra byar.', exempel: ['Det går rykten om att Ask är lögnare.', 'Det går rykten om att Ask är en lögnare.'] },
  { id: 'artikel_besk', grupp: '1d artikel', fil: 'src/sim/berattelser.ts (beskrivning: f.rykte)', nu: 'f.rykte = INTRYCK[by[0]].namn', blir: 'f.rykte = INTRYCK[by[0]].som ?? INTRYCK[by[0]].namn', varfor: '"Byn ser Ask som lögnare".' },
  { id: 'artikel_rel', grupp: '1d artikel', fil: 'src/sim/berattelser.ts:1775 (relationText)', nu: 'ser ${q.name} som ${t.namn}', blir: 'ser ${q.name} som ${t.som ?? t.namn}', varfor: 'Samma fel.' },
  // 1e. binamnen
  { id: 'binamn_rik', grupp: '1e binamn', fil: 'src/sim/berattelser.ts (BINAMN.rik)', nu: "['Förrådet', 'Förrådet']", blir: "['den förmögne', 'den förmögna']", varfor: '"Sigrun Förrådet" låter som en sak, inte ett namn.' },
  { id: 'binamn_smak', grupp: '1e binamn', fil: 'src/sim/berattelser.ts (BINAMN.smakfull)', nu: "'Blomkrukan'", blir: "'Pärlan'", varfor: 'Samma sak: en blomkruka är en sak (och blommor i kruka fanns inte).' },
  // 1f. namnen
  { id: 'namn_uttal', grupp: '1f namn', fil: 'src/sim/folk.ts (makeName)', nu: 'början + mitten + slutet, alltid', blir: 'foga(början, mitten, slutet) ur texter/namn.ts: mitten tas bort när namnet blir svårt att uttala med den och lättare utan den', varfor: 'Osllo, Kolrkfast, Ylvlle, Irnkel, Tusskleif. Slumpen dras som förut, så bara namnen ändras: 11 948 av 27 132 möjliga namn blir kortare (Osllo → Oso, Kolrkfast → Kolfast, Ylvlle → Ylve, Irnkel → Ikel, Tusskleif → Tusleif). Sällan kan ett namn som redan finns i byn göra att ett nytt dras (ledigt), och då blir utvecklingen annan från den födseln.', exempel: ['Osllo, Kolrkfast, Ylvlle, Irnkel, Tusskleif', 'Oso, Kolfast, Ylve, Ikel, Tusleif'] },
  // ord
  { id: 'ord_jobbig', grupp: 'ord', fil: 'src/sim/berattelser.ts (r_ogillar)', nu: '{namn} tycker att {om} är jobbig.', blir: '{namn} tycker att {om} är besvärlig.', varfor: 'jobbig är ett nytt ord; NYA_ORD har jobb men inte jobbig.' },
  { id: 'ord_toalett', grupp: 'ord', fil: 'src/sim/latrin.ts (log)', nu: 'Byn förstod att vattnet blir smutsigt nära toaletten.', blir: 'Byn förstod att vattnet blir smutsigt nära latrinen.', varfor: 'toalett är ett nytt ord.' },
  // b: mönster ur Björns kommentarer på de hela texterna (samlingen texter, h-besk-1 till h-besk-6)
  { id: 'b_kon', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1334 (alderOrd) och 128–162 (besk_drag2, besk_drag1, besk_drag0)', nu: '{alder} är "man" eller "kvinna" för alla mellan 25 och gammal, så texten börjar med könet: "En kvinna, vig men också minnesgod: så är Tuska.", "Tukstig är en man, modig och glömsk."', blir: 'alderOrd ger inget för de medelålders ({alder} tomt), och varianterna med {alder} får om: f => !!f.alder. Nya varianter utan {alder}: "Tuska är vig och minnesgod." Är ett av dragen något som syns (vacker, ful, stark, klen), står det framför i stället: "Tuska är en vacker kvinna, och vig." Ung, gammal, pojke och flicka står kvar, eftersom de säger något.', varfor: 'Björn (besk-1): könet säger inte så mycket; att någon är en gammal man eller en vacker kvinna är mer intressant. Gäller alla beskrivningar.', exempel: ['Tukstig är en man, modig och glömsk.', 'Tukstig är modig men glömsk.'] },
  { id: 'b_men', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1328 (DRAG) och besk_drag2', nu: 'Två drag binds alltid med och, eller alltid med men också: "modig och glömsk", "vig men också minnesgod".', blir: 'DRAG får ett tecken per ord (+ bra, − dåligt; tystlåten och fridsam räknas som bra). Fältet {bind} blir "och" när båda är lika och "men" när det ena är bra och det andra dåligt, och varianterna skriver {drag1} {bind} {drag2}. Varianten "men också" får om: f => f.bind === \'men\', och det bra draget kommer först: "modig men glömsk".', varfor: 'Björn (besk-2): en dålig och en bra egenskap ska inte sättas ihop med och. Claude (besk-1): men också utan motsats.', exempel: ['Tukstig är en man, modig och glömsk. / Tuska är vig men också minnesgod.', 'Tukstig är modig men glömsk. / Tuska är vig och minnesgod.'] },
  { id: 'b_trots', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1552 (beskrivning) och ny mall besk_trots', nu: 'Ett drag som går emot åldern står bara i listan: "Tukstig är en gammal man, glömsk och vig."', blir: 'Ett drag som går emot åldern (gammal och vig, stark, uthållig eller nyfiken på allt; barn och klok, minnesgod eller modig) tas ur listan och får en egen mening ur mallen besk_trots: "Men trots åren är han vig.", "Åren har inte tagit hans smidighet.", "Hon är ung, men klok som en gammal."', varfor: 'Björn (besk-3): det som säger emot kan kommenteras i texten.', exempel: ['Tukstig är en gammal man, glömsk och vig.', 'Tukstig är en gammal och glömsk man. Men trots åren är han vig.'] },
  { id: 'b_hus', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:497 (besk_hus)', nu: "'{Hen} kan peka på {vad} och säga: det byggde jag.'", blir: "'Ett av husen i byn har {hen} byggt med egna händer.' (eller '{Hen} byggde {vad} med egna händer.')", varfor: 'Björn (besk-4): otydlig mening. {vad} är ofta "ett hus", så man vet inte vilket hus hen pekar på, och repliken mitt i texten bryter av.', exempel: ['Han kan peka på ett hus och säga: det byggde jag.', 'Ett av husen i byn har han byggt med egna händer.'] },
  { id: 'b_vacker', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1390 (SKONA) och 310 (besk_vacker, besk_ful)', nu: 'Slutet "och fler än en har tappat tråden i samtalet med honom" står efter vad som helst (hår, leende, ögon) och kommer hos många i samma by.', blir: 'Varje rad i SKONA får sin egen verkan, som passar just det: ögonen ("man glömmer vad man skulle säga"), rösten ("man lyssnar gärna, vad hen än säger"), håret ("barnen vill gärna fläta det"), skrattet ("det sprider sig runt elden"). besk_vacker får {verkan} i stället för det fasta slutet. Två levande i byn får inte samma del (undvik på de andras del), så grannar ser olika ut.', varfor: 'Björn (besk-5): många beskrivningar har samma mening; det behövs fler sätt att beskriva vackra personer. Claude: besk-4, besk-5 och besk-7.', exempel: ['Han har blankt, tjockt hår, och fler än en har tappat tråden i samtalet med honom.', 'Han har blankt, tjockt hår, som han är mån om.'] },
  { id: 'b_sager', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1368 (mening) och varianterna med säger', nu: 'Varje del väljs för sig, så hörsägen kommer flera gånger: "Ulvfrid är vacker och fridsam, säger de som känner henne. … Vacker som sin mor, säger folk om henne. De säger att hon ler …". Och "säger" sist ger en baklänges ordföljd.', blir: 'Varianterna med säger, säger man, talar om får taggen hors (som om), och mening() hoppar över en sådan variant när beskrivningen redan har en (samma sätt som borjan). Säger flyttas först: "De som känner Ulvfrid säger att hon är vacker och fridsam." / "Hon är lika vacker som sin mor."', varfor: 'Björn (besk-6): konstig meningsföljd, och att folk säger saker om henne står tre gånger.', exempel: ['Ulvfrid är vacker och fridsam, säger de som känner henne. Vacker som sin mor, säger folk om henne. De säger att hon ler när hon fiskar.', 'De som känner Ulvfrid säger att hon är vacker och fridsam. Hon är lika vacker som sin mor.'] },
  // m: mönster ur Claudes genomgång av de hela texterna (texter/granskning.json). Varje rad är ett fel som syns i flera texter.
  { id: 'm_eftermale', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1536 (beskrivning) och BESK_DELAR', nu: 'Beskrivningen av en död är samma som för en levande, i presens: "Den som möter Eborg ser …", "Ge henne fiskkött, och hon är nöjd." Inget om döden.', blir: 'När f.kvar är falskt: först en mening om döden (mallen e_dog: "Eborg dog i barnsäng våren år 12, 31 år gammal." med orsak, årstid och ålder), sedan delarna med varianter i dåtid (om: f => !f.kvar). Delar som bara passar en levande (smak, vem hen litar på, utseendet när man möter hen) tas bort för de döda.', varfor: 'Alla sex eftermälen i genomgången (dod-1 till dod-6).', exempel: ['Den som möter Eborg ser en ung kvinna som är vig. Hon har öron som står ut. Ge henne fiskkött, och hon är nöjd.', 'Eborg dog i barnsäng våren år 12, bara 31 år gammal. Hon var vig och hade öron som stod ut. Vid elden berättar man fortfarande om henne.'] },
  { id: 'm_upprepning', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1565 (kronikaBer) och 1237 (valjVariant)', nu: 'kronikaBer väljer varianten ur nyckeln och timmen, så samma variant kan komma flera gånger i rad: "prövade och misslyckades, prövade igen" fyra gånger, "Medan regnet föll kom Sige på" tre gånger.', blir: 'kronikaBer skickar undvik till valjVariant: en variant som börjar som någon av de tre senaste raderna i krönikan med samma mall hoppas över. Det läser bara krönikan och ändrar bara texten, inte simuleringen (samma-kollen blir lika). Samma sak i beskrivningen: slutet "fler än en har tappat tråden" och "ett leende som får folk att stanna upp" skrivs om till fler slut, och sakens berättelse får fler slut än "Det undrar byn fortfarande".', varfor: 'besk-4, besk-5, besk-7, sak-3, sak-4, sak-5, kronika-1, kronika-2, kronika-3.', exempel: ['Sige prövade och misslyckades, prövade igen, och till sist hade han uppfunnit … (fyra gånger på 30 rader)', 'Sige prövade och misslyckades … / Efter många kvällar vid elden förstod Gunve … / Det var Ylvar som först …'] },
  { id: 'm_namn', grupp: 'm mönster', fil: 'src/sim/berattelser.ts (beskrivning), src/sim/styre.ts (rattegang), src/sim/byggnader.ts (husKlar)', nu: 'Samma namn många gånger efter varandra ("Tuska" fyra gånger på fem meningar; "Ivgerd hade själv sett när Unborg tog ved av Ivgerd"; "Det sista lades på plats av Fannbjörn: Fannbjörns hus var färdigt"), och hon som kan syfta på två kvinnor ("Ikunn kallade Ragde till elden. Hon överdrev om Ikunn").', blir: 'Fyllningen får fältet {hen} och {honom} för huvudpersonen, och varianterna använder dem efter första meningen. I rattegang: är domaren samma som den drabbade, skrivs "av henne själv" och "Hon hade själv blivit bestulen", och "hon" byts mot namnet när två av samma kön står i samma mening. "Fannbjörn lade det sista på plats, och nu var hans hus färdigt."', varfor: 'besk-1, ratt-4, ratt-5, kronika-1.', exempel: ['Ikunn kallade Ragde till elden. Hon överdrev om Ikunn.', 'Ikunn kallade Ragde till elden. Ragde hade överdrivit om henne.'] },
  { id: 'm_teknik', grupp: 'm mönster', fil: 'src/sim/berattelser.ts (k_uppfann, k_forstod, kunskapDod, beskrivningens kom_pa) och teknik.ts', nu: 'Teknikens namn står som ett föremål: "uppfann odling", "förstod sig på ledarskap", "kom på mål", "konsten att göra odling".', blir: 'Samma ord som förslaget lara_gora (LARA: att odla, att leda byn, att binda ett mål) i alla mallar som nämner en teknik: "kom på hur man odlar", "var först med att odla", "Med Gunve dog konsten att odla".', varfor: 'besk-2, logg-3, logg-5, kronika-1, kronika-2, kronika-3. lara_gora rättar bara loggen; det här tar krönikan och beskrivningen också.', exempel: ['Tukstig uppfann odling. Med Gunve dog konsten att göra odling.', 'Tukstig kom på hur man odlar. Med Gunve dog konsten att odla.'] },
  { id: 'm_slakt', grupp: 'm mönster', fil: 'src/sim/uppvaxt.ts:60 och 83, berattelser.ts:1753 (relationText), styre.ts (rattegang)', nu: '"Miste sin förälder Eborg", "Miste sitt barn Ylvlvvi"; relationen säger aldrig att Igik är Ylvars far, och rättegången inte att domaren dömer sin dotter.', blir: 'Fältet {slakt} (mor, far, son, dotter, bror, syster) ur personernas mother och father: "Miste sin mor {om}", "Miste sin dotter {om}". relationText börjar med "Igik är Ylvars far." när de är släkt, och rattegang lägger till "Igik dömde sin egen dotter." Förslaget NYA_FALT.relation har redan fältet; det här använder det på alla tre ställena.', varfor: 'rel-3, rel-9, ratt-1, logg-1, logg-4.', exempel: ['Gerve (3 år): Miste sin förälder Eborg.', 'Gerve, tre år, miste sin mor Eborg.'] },
  { id: 'm_upplevelse', grupp: 'm mönster', fil: 'src/sim/uppvaxt.ts:168', nu: 'log(s, `${p.name} (${u.a} år): ${upplevelseText(u)}.`)', blir: 'en hel mening: `${p.name}, ${talOrd(u.a)} år, ${upplevelseText(u) med liten bokstav}.` Upplevelserna som bara passar barn (overflod "Levde i överflöd") skrivs för vuxna som "fick leva i överflöd en tid".', varfor: 'Raden ser ut som en tabell mitt i loggen (logg-1, logg-4, logg-5).', exempel: ['Okja (21 år): Levde i överflöd.', 'Okja, 21 år, fick leva i överflöd en tid.'] },
  { id: 'm_presens', grupp: 'm mönster', fil: 'src/sim/framtradande.ts:43–45, byggnader.ts:294', nu: '"{namn} kväder vid elden", "håller ett tal", "lär de andra vad {hen} vet", "Hyddan blir samlingshuset" mitt bland rader i dåtid.', blir: '"kvad vid elden", "höll ett tal", "lärde de andra", "Hyddan blev samlingshuset" (krönikan har redan blev). Pratbubblan, som visar det som pågår, får behålla presens.', varfor: 'logg-1, logg-3, logg-4, logg-6, kronika-2 ("Ingen säger det högt").', exempel: ['Frörhild kväder vid elden om vintern, och de andra lyssnar.', 'Frörhild kvad vid elden om vintern, och de andra lyssnade.'] },
  { id: 'm_lista', grupp: 'm mönster', fil: 'src/sim/rykten.ts:527, rovare.ts (striden), ui/arena.ts:53', nu: "namnen fogas med ' och ' eller ' mot ': \"Frörhild och Igik och Yskhild och Stensja och Ylvar och Tusbjörn ropade larm\", femton namn i rövarstriden, \"Tusbjörn mot Vinnvid mot Ija mot …\".", blir: 'och() ur berattelser.ts (kommatecken och och sist). Fler än fyra: de två första och resten som tal: "Frörhild, Igik och fyra till ropade larm", "Femton i byn slogs med fem rövare". Arenan delar kämparna efter sida: "Tusbjörn, Vinnvid och Ija mot Tuskdis, Vestka och Guja".', varfor: 'logg-1, logg-4, strid-2.', exempel: ['Frörhild och Igik och Yskhild och Stensja och Ylvar och Tusbjörn ropade larm (varg).', 'Frörhild, Igik och fyra till ropade larm: en varg.'] },
  { id: 'm_intryck', grupp: 'm mönster', fil: 'src/sim/berattelser.ts:1775 (relationText) och rykten.ts (intryckText, bevis)', nu: 'Personrutans korta etiketter står i den löpande texten: "Han ser Igik som generös: ganska säker, såg det själv." tre gånger efter varandra, "2 led från den som såg det"; samma bevis står flera gånger.', blir: 'relationText tar bara de två starkaste intrycken och skriver dem som meningar: "Han har själv sett Igik ge bort mat och tycker att Igik är generös." / "Han har hört av Tuska att Igik ljuger." Lika bevis slås ihop: "Ivgerd gjorde usla träspjut tre gånger."', varfor: 'rel-2, rel-3, rel-5, rel-6, rel-7, rel-10, intryck-1, intryck-3, intryck-5, intryck-8.', exempel: ['Han ser Igik som generös: ganska säker, såg det själv. Han ser Igik som lögnare: osäker, hörde det av Tuska, 2 led från den som såg det.', 'Han har själv sett Igik ge bort mat och tycker att han är generös. Från Tuska har han hört att Igik ljuger.'] },
  { id: 'm_barn', grupp: 'm mönster', fil: 'src/sim/berattelser.ts (BESK_DELAR, relationText)', nu: 'Små barn får vuxnas texter: en ettåring "fiskar med händerna", "Det krävs mycket för att knäcka henne", "har roligt när de arbetar ihop"; ett dött treårigt barn "har byn i blodet".', blir: 'Fältet {liten} (under ALDER.vuxen / 2) i fyllningen. Varianterna om arbete, smak och karaktär får om: f => !f.liten, och nya för de små: "Ulvfrid är ett år och kryper helst efter sin mor", "leker med Asunn", "ett litet barn som byn sörjde".', varfor: 'besk-6, rel-6, dod-6.', exempel: ['Ulvfrid är en vacker flicka. Det krävs mycket för att knäcka henne. Hon ler när hon fiskar med händerna.', 'Ulvfrid är bara ett år och följer helst sin mor. Hon skrattar när någon gör grimaser.'] },
  { id: 'm_tal', grupp: 'm mönster', fil: 'src/sim/eld.ts (försök), brand.ts:205 och 208, berattelser.ts (relationText ggr), rovare.ts:133', nu: '"efter 3 försök", "brände 1 rutor", "pratat 2201 gånger", "Han var 3 år.", "ungefär 4 (utan klan)".', blir: 'talOrd() för 1–12 i all löpande text. Stora tal blir ord: över 20 "många gånger", över 200 "otaliga gånger". brand.ts skriver mark i stället för rutor ("en bit mark", "ett stort stycke mark") och båda raderna samma form. rovare: "fyra rövare utan klan".', varfor: 'dod-6, rel-3, logg-1, logg-2, logg-4, logg-5, logg-6, kronika-1.', exempel: ['En eldsvåda brände 1 rutor. Ask och Ylva har pratat 2201 gånger.', 'En eldsvåda brände en liten bit mark. Ask och Ylva har pratat otaliga gånger.'] },
  { id: 'm_skada', grupp: 'm mönster', fil: 'src/sim/strid.ts:3 och 23 (GRAD, traff), STRIDSLAG', nu: "`${SKADOR[k].ett}, ${GRAD(g)}`: \"ett blåmärke, lätt\". Ett stick med spjut blir ett skärsår. \"Striden börjar: skada.\"", blir: 'Graden före skadan och böjd efter genus: "ett lätt blåmärke", "en svår blödning", "ett mycket svårt skärsår". Stick ger sticksår (eller en rispa vid låg grad). Avsikten skrivs som en mening: "Striden börjar: man slåss för att skada."', varfor: 'strid-1, strid-2, strid-4.', exempel: ['Guja sticker Ija i armen med träspjutet: ett skärsår, måttligt.', 'Guja sticker Ija i armen med träspjutet: ett måttligt sticksår.'] },
  { id: 'm_ordning', grupp: 'm mönster', fil: 'src/sim/liv.ts:99–102', nu: 'inherit(s, p) loggar "Igik ärvde … efter Eborg" före raden "Eborg dog …".', blir: 'Dödsraden och kronikaBer först, sedan inherit. Raderna har samma tid, så bara ordningen i loggen och krönikan ändras; förråden och simuleringen blir desamma.', varfor: 'logg-1, kronika-2: arvet kommer före döden.', exempel: ['Igik ärvde en träyxa efter Eborg. Eborg dog i barnsäng, 31 år gammal.', 'Eborg dog i barnsäng, 31 år gammal. Igik ärvde en träyxa efter henne.'] },
  { id: 'm_motsagelse', grupp: 'm mönster', fil: 'src/sim/strid.ts:892 (loggen efter striden), matlagning.ts:77 och halsa.ts (svampen)', nu: 'Arenan säger att Fröskmund drog sig undan, men loggen "Olgaut och Fröskmund slogs. Olgaut vann." Samma minut: "blev förgiftad av svamp" och "blev matförgiftad av rått kött eller rå fisk".', blir: 'Loggen läser hur striden slutade: "Fröskmund vågade inte slåss med Olgaut och drog sig undan." Matförgiftningen säger vad det var ("av rå abborre", ur saken som åts) och hoppas över om personen redan blivit förgiftad samma timme (bara texten; sjukdomen räknas som förut).', varfor: 'strid-3, logg-3.', exempel: ['Olgaut och Fröskmund slogs (efter ett gräl). Olgaut vann.', 'Fröskmund vågade inte slåss med Olgaut och drog sig undan.'] },
  { id: 'm_rik', grupp: 'm mönster', fil: 'src/sim/rykten.ts (INTRYCK.rik och INTRYCK.valbargad)', nu: 'Två rykten som betyder nästan samma sak: "rik och välbärgad", och båda ger hedersnamn ("Storbjörn", "Förrådet").', blir: 'rik = äger många saker ("har mycket"), välbärgad = har mat och ved för vintern ("har gott om mat"). När båda gäller samma person skrivs bara rik.', varfor: 'binamn-6, ans-4.', exempel: ['Byn tycker att Tukstig är rik och välbärgad.', 'Byn tycker att Tukstig är rik.'] },
  { id: 'm_samla', grupp: 'm mönster', fil: 'src/sim/byte.ts (loggen), teknik.ts:201 (lärt sig)', nu: 'Varje byte och varje sak någon lär sig blir en egen rad: 28 av 30 rader i en logg är byten, och Ragde får 13 rader "har lärt sig av …" på en timme.', blir: 'En rad som redan står överst i loggen med samma slag och samma person, samma timme, byggs på i stället för att en ny läggs till: "Ragde lärde sig mycket av Asunn och Ija: att odla, att bygga timmerhus och elva saker till." Bytena: "Under natten gjorde byn tolv byten, mest harkött mot grenar." Statistiken räknar som förut.', varfor: 'logg-2, logg-5, logg-6: loggen drunknar och det viktiga syns inte.', exempel: ['Ragde har lärt sig av Asunn att göra odling. Ragde har lärt sig av Asunn att göra timmerhus. Ragde har lärt sig av Ija att göra mål. (13 rader)', 'Ragde lärde sig mycket av Asunn och Ija: att odla, att bygga timmerhus och elva saker till.'] },
  { id: 'm_smatt', grupp: 'm mönster', fil: 'src/sim/berattelser.ts (varianterna), relationer.ts (varför-texterna för symbolerna), stationer.ts:200', nu: 'Småfel i enstaka varianter: "vig men också minnesgod" (ingen motsats), "inte haft slaktbänk, bord och snidat väggbräde", "Det var sommaren när", "på sommaren" (som om varje år), "Nära vän: Mycket goda vänner:", "delar som med släkt", "sa att hon längtar", "hur gott bär vore", "en ring av stenar till en lägereld till", sade och sa blandat.', blir: '"vig och minnesgod"; "varken … eller"; "Det var sommar när"; "en sommar"; "Nära vän: mycket goda vänner, med …"; "delar med sig som till släkt"; "sa att hon längtade"; "hur gott det vore med bär"; "en ring av stenar till ännu en lägereld"; alltid sa.', varfor: 'besk-1, besk-4, besk-8, reltyp-1 till reltyp-7, prat-3, prat-5, prat-6, prat-10, sak-2, ratt-3, logg-3.', exempel: ['Tuska är vig men också minnesgod. Hon har inte haft slaktbänk, bord och snidat väggbräde.', 'Tuska är vig och minnesgod. Hon har varken haft slaktbänk, bord eller snidat väggbräde.'] },
];

// ---------- 2. Nya kontroller (rader till KONTROLLER i src/test/textkoll.ts) ----------
// Kontrollerna körs också på händelseloggens rader (förslag: texter.ts lyssnar på s.log som texter/loggrader.ts gör), så
// att fel som "en träspjut" och "är lögnare" syns i texter.txt.
const RYKTE_ORD = ['lögnare', 'tjuv', 'klåpare', 'vargdödare'];
const NAMN_A = /(^|[^\p{L}])(\p{Lu}\p{Ll}*a)(en|n|na|et)(?=[^\p{L}]|$)/u;
export const NYA_KONTROLLER: Kontroll[] = [
  { id: 'hen', namn: 'hen, hens eller henom om en viss person', hitta: t => /(^|[^\p{L}])(hen|hens|henom)(?=[^\p{L}]|$)/iu.exec(t)?.[2] },
  { id: 'artikel', namn: 'Ett rykte utan en framför (som lögnare, är tjuv)', hitta: t => new RegExp(`(^|[^\\p{L}])(som|är|var) (${RYKTE_ORD.join('|')})(?=[^\\p{L}]|$)`, 'iu').exec(t)?.[0].trim() },
  { id: 'andelse', namn: 'En ändelse på ett namn som slutar på -a eller -e (Lerkrukaen, väggbrädeen)', hitta: (t, f) => {
    const namn = Object.values(f).filter((v): v is string => typeof v === 'string' && /^\p{Lu}/u.test(v));
    for (const n of namn) if (/[ae]$/.test(n) && new RegExp(`${n}(en|n|na|et)(?=[^\\p{L}]|$)`, 'u').test(t)) return n;
    return /\p{Ll}(aen|een|aet|eet)(?=[^\p{L}]|$)/u.exec(t)?.[0] ?? undefined;
  } },
];
// NAMN_A används av prova.ts för att leta i hela texten (namnen finns inte alltid i fälten)
export { NAMN_A };

// ---------- 3b–3e. Fler varianter till mallar som finns ----------
// varianterna läggs till efter de som finns; ta_bort = varianter som byts ut (exakt text)
export const NYA_VARIANTER: Record<string, NyaVarianter> = {
  // 3b. relationerna: i dag bara {namn} och {om}. Nya fält i relationText (NYA_FALT.relation)
  r_nara: { varfor: '20 056 gånger, 12 varianter.', falt: 'relation', varianter: [
    '{namn} känner sig trygg när {om} är nära.',
    '{namn} och {om} förstår varandra utan många ord.',
    'Blir det bråk ställer sig {namn} alltid på samma sida som {om}.',
    '{namn} kan prata med {om} om allt.',
    'Det syns på {namn} att {om} betyder mycket.',
    { t: '{namn} och {om} har pratat så många gånger att de vet vad den andra ska säga.', om: ja('mycketPrat') },
    { t: '{namn} och {om} har slagits sida vid sida, och det glömmer de inte.', om: ja('sida') },
    { t: '{namn} och {om} har grälat, men de blev alltid sams igen.', om: ja('gral') },
    { t: '{namn} är bara ett barn, men {hen} följer {om} vart {om} än går.', om: ja('ung') },
    { t: 'De gamla säger att {namn} och {om} är som syskon.', om: f => !!f.gammal && !f.kin },
    { t: '{namn} blir glad bara {om} sätter sig bredvid.', om: ja('glad') },
    { t: 'Barnen de fått tillsammans håller {namn} och {om} nära varandra.', om: ja('barn') },
  ], exempel: [{ namn: 'Ask', om: 'Ylva', hen: 'han' }] },
  r_van: { varfor: '4 414 gånger, 12 varianter.', falt: 'relation', varianter: [
    '{namn} hälsar alltid glatt på {om}.',
    'Med {om} har {namn} lätt att prata.',
    '{namn} och {om} hjälps åt när det behövs.',
    'Det är sällan ett ont ord mellan {namn} och {om}.',
    '{namn} tycker att {om} är bra att ha i byn.',
    { t: '{namn} och {om} har pratat många kvällar vid elden.', om: ja('mycketPrat') },
    { t: '{namn} och {om} har slagits sida vid sida.', om: ja('sida') },
    { t: '{namn} ser upp till {om} och vill vara i närheten.', om: ja('ung') },
    { t: '{namn} skrattar när {om} är i närheten.', om: ja('glad') },
    { t: 'Ett gräl har de haft, men {namn} tycker ändå om {om}.', om: ja('gral') },
  ], exempel: [{ namn: 'Ask', om: 'Ylva', hen: 'han' }] },
  r_bekant: { varfor: '12 702 gånger, 12 varianter.', falt: 'relation', varianter: [
    '{namn} vet vad {om} heter, och inte mycket mer.',
    '{namn} och {om} har inte mycket att säga varandra.',
    'Det är sällan {namn} tänker på {om}.',
    '{namn} har inget ont att säga om {om}, och inget gott heller.',
    '{namn} och {om} arbetar ibland nära varandra, men pratar lite.',
    { t: '{namn} och {om} har bara pratat några få gånger.', om: f => !f.mycketPrat && (f.talks as number) > 0 },
    { t: '{namn} och {om} har aldrig pratat med varandra.', om: f => !f.talks },
    { t: '{namn} är för liten för att bry sig om {om}.', om: ja('ung') },
    { t: '{namn} har sett {om} växa upp, men de står inte varandra nära.', om: f => !!f.gammal && !!f.omUng },
  ], exempel: [{ namn: 'Ask', om: 'Ylva', hen: 'han' }] },
  r_ogillar: { varfor: '5 950 gånger, 12 varianter; "jobbig" är ett nytt ord.', falt: 'relation', ta_bort: ['{namn} tycker att {om} är jobbig.'], varianter: [
    '{namn} tycker att {om} är besvärlig.',
    '{namn} blir trött på {om} fort.',
    '{namn} går hellre åt ett annat håll än bredvid {om}.',
    'Det blir sällan ett vänligt ord från {namn} till {om}.',
    '{namn} lyssnar inte gärna på {om}.',
    { t: '{namn} har grälat med {om} och har inte glömt det.', om: ja('gral') },
    { t: '{namn} och {om} har slagits, och det sitter kvar.', om: ja('slag') },
    { t: 'Barnet {namn} gömmer sig när {om} kommer.', om: ja('ung') },
    { t: '{namn} blir på sämre humör av att se {om}.', om: f => !f.glad },
  ], exempel: [{ namn: 'Ask', om: 'Ylva', hen: 'han' }] },
  r_ovan: { varfor: '6 388 gånger, 12 varianter.', falt: 'relation', varianter: [
    '{namn} vill inte ens se {om}.',
    'Om {namn} fick välja skulle {om} lämna byn.',
    '{namn} tänker på {om} med vrede.',
    '{namn} vänder ryggen till när {om} går förbi.',
    'Det finns ingen frid mellan {namn} och {om}.',
    { t: '{namn} och {om} har slagits, och det kan hända igen.', om: ja('slag') },
    { t: '{namn} och {om} grälar så fort de ses.', om: ja('gral') },
    { t: '{namn} är bara ett barn, men {hen} är rädd för {om}.', om: ja('ung') },
    { t: 'Många vintrar har gått, men {namn} har inte förlåtit {om}.', om: ja('gammal') },
  ], exempel: [{ namn: 'Ask', om: 'Ylva', hen: 'han' }] },
  // 3c. samtalen: i dag {namn}, {hen}, {med}. Nya fält i pratText (NYA_FALT.prat)
  p_vardag: { varfor: '623 gånger, 8 varianter.', falt: 'prat', varianter: [
    '{namn} och {med} pratade om vem som gjort vad i dag.',
    '{namn} frågade {med} hur det gått, och {med} berättade.',
    '{namn} och {med} pratade om de andra i byn.',
    '{namn} och {med} satt tysta en stund, och sedan pratade de.',
    '{namn} och {med} skrattade åt något som hänt.',
    '{namn} och {med} pratade om vad som ska göras i morgon.',
    { t: '{namn} och {med} pratade om {arstid} och vad den för med sig.', om: ja('arstid') },
    { t: 'Det var sent, och {namn} och {med} pratade lågt.', om: ja('natt') },
    { t: '{namn} och {med} satt nära elden och pratade om kylan.', om: ja('kallt') },
    { t: 'Regnet föll, och {namn} och {med} pratade under taket.', om: f => !!f.regn && !!f.inne },
    { t: '{namn} berättade för {med} om arbetet som {yrke}.', om: ja('yrke') },
    { t: '{namn} och {med} pratade om barnen.', om: ja('barn') },
  ], exempel: [{ namn: 'Ask', med: 'Ylva', hen: 'han', arstid: 'hösten', yrke: 'samlare' }] },
  // 3d. beskrivningen med två egenskaper
  besk_drag2: { varfor: '5 153 gånger, 10 varianter (den vanligaste mallen i beskrivningen).', varianter: [
    '{Drag1} och {drag2}: så beskriver byn {namn}.',
    'Arbetar man bredvid {namn} märker man att {hen} är {drag1} och {drag2}.',
    '{namn} är {drag1}. {Hen} är också {drag2}.',
    'Två saker vet alla om {namn}: {hen} är {drag1} och {drag2}.',
    'Ingen kan säga att {namn} inte är {drag1}, och {drag2} är {hen} med.',
    '{namn}, {drag1} och {drag2}, är en {alder} som syns i byn.',
    { t: 'Redan som barn är {namn} {drag1}, och {drag2} likaså.', om: ja('ung') },
    { t: '{namn} har varit {drag1} och {drag2} så länge någon minns.', om: ja('gammal') },
  ], exempel: [{ namn: 'Ask', hen: 'han', honom: 'honom', alder: 'man', drag1: 'stark', drag2: 'glömsk' }] },
  // 3e. döden: vilken olycka och vem som sörjer (NYA_FALT.dod)
  k_dog: { varfor: '46 gånger, 12 varianter; säger inte vad som hände eller vem som sörjer.', falt: 'dod', varianter: [
    { t: '{helt} dog {orsak} {nar}. {Hen} blev {alder} år.', om: ja('nar') },
    { t: 'En olycka tog {helt} {nar}. {Hen} blev {alder} år.', om: ja('nar') },
    { t: '{helt} kom aldrig tillbaka. {Hen} dog {orsak} {nar}, {alder} år gammal.', om: ja('nar') },
    { t: '{helt} dog {orsak}, {alder} år gammal. Mest av alla sörjer {sorjer}.', om: ja('sorjer') },
    { t: 'Ingen grät som {sorjer} när {helt} dog {orsak}. {Hen} blev {alder} år.', om: ja('sorjer') },
    { t: '{sorjer} satt länge vid elden efter att {helt} dött {orsak}, {alder} år gammal.', om: ja('sorjer') },
    { t: '{helt} dog {orsak} {nar}, {alder} år gammal, och {sorjer} sörjer {honom}.', om: f => !!f.nar && !!f.sorjer },
  ], exempel: [{ namn: 'Ask', helt: 'Ask Eken', hen: 'han', Hen: 'Han', honom: 'honom', orsak: 'i en olycka', alder: 34, nar: 'när han fällde ett träd', sorjer: 'Ylva' }] },
  // 1c. hedersnamnen och öknamnen med ett tillstånd i stället för en händelse (fältet {tillstand}, tillst = true)
  hedersnamn: { varfor: 'Rättelse 1c: de 10 som finns får om: f => !f.tillst; de här är för tillståndet.', falt: 'skal', varianter: [
    { t: 'Hela byn kallar nu {namn} för {binamn}, för {hen} är så {tillstand}.', om: f => !!f.tillst && !f.som },
    { t: 'Alla vet att {namn} är {tillstand}, och nu säger de {helt}.', om: ja('tillst') },
    { t: '{namn} är {tillstand}. Därför heter {hen} {helt} i byn.', om: ja('tillst') },
    { t: 'Runt elden heter {namn} nu {binamn}, för {hen} är {tillstand}.', om: ja('tillst') },
    { t: 'Det är inte svårt att se varför {namn} kallas {binamn}: {hen} är {tillstand}.', om: ja('tillst') },
  ], exempel: [{ namn: 'Oso', binamn: 'Smörbyttan', helt: 'Oso Smörbyttan', hen: 'han', honom: 'honom', tillstand: 'välbärgad', tillst: true }] },
  oknamn: { varfor: 'Rättelse 1c, som hedersnamnen.', falt: 'skal', varianter: [
    { t: 'När {namn} inte hör kallar byn {honom} {binamn}, för {hen} är {tillstand}.', om: ja('tillst') },
    { t: '{namn} är {tillstand}, och nu heter {hen} {helt} i allas mun.', om: ja('tillst') },
    { t: 'Alla vet att {namn} är {tillstand}. Därför säger man {helt}, och fnissar.', om: ja('tillst') },
    { t: 'Ett fult namn är det, {binamn}. Men {namn} är {tillstand}.', om: ja('tillst') },
    { t: 'Barnen ropar {binamn} efter {namn}, för {hen} är {tillstand}.', om: ja('tillst') },
  ], exempel: [{ namn: 'Ask', binamn: 'Lögnaren', helt: 'Ask Lögnaren', hen: 'han', honom: 'honom', tillstand: 'en lögnare', tillst: true }] },
};

// ---------- 3a. Nya mallar för de vanligaste fasta raderna i loggen ----------
// Räknat med texter/loggrader.ts i byarna 1, 42, 777 och 5 under 45 dygn (45 år i spelet, drygt sex veckor i
// verkligheten): 1 079 olika rader (namnen bytta mot X, talen mot N). De vanligaste fasta raderna blir mallar. Raden
// skrivs med berattelse(s, mall, nyckel, f) i stället för den fasta texten; nyckeln är personens id (eller båda
// personernas, a.id * 997 + b.id). Den första varianten är alltid dagens text, så att inget fakta försvinner.
const P = (namn: string, hen = 'han') => ({ namn, hen, honom: hen === 'han' ? 'honom' : 'henne', hans: hen === 'han' ? 'hans' : 'hennes' });
export const NYA_MALLAR: Record<string, NyMall> = {
  l_byte: { fil: 'src/sim/byte.ts:142', nu: '${m.namn} och ${g.namn} bytte: ${varorText(fatt)} mot ${varorText(betal)}.', falt: '{namn} = m, {med} = g, {fatt} = varorText(fatt) (det m fick), {betal} = varorText(betal), desperat', varianter: [
    { t: '{namn} och {med} bytte: {fatt} mot {betal}.', om: nej('desperat') },
    { t: '{namn} fick {fatt} av {med} och gav {betal} för det.', om: nej('desperat') },
    { t: '{namn} gav {med} {betal} för {fatt}.', om: nej('desperat') },
    { t: '{med} lät {namn} få {fatt} mot {betal}.', om: nej('desperat') },
    { t: '{namn} och {med} kom överens: {fatt} mot {betal}.', om: nej('desperat') },
    { t: 'Ett byte mellan {namn} och {med}: {fatt} mot {betal}.', om: nej('desperat') },
    { t: '{namn} och {med} bytte: {fatt} mot {betal}. {namn} höll på att dö.', om: ja('desperat') },
    { t: '{namn} höll på att dö och fick {fatt} av {med} mot {betal}.', om: ja('desperat') },
  ], exempel: [{ namn: 'Ask', med: 'Ylva', fatt: 'tre harkött', betal: 'sex grenar' }, { namn: 'Ask', med: 'Ylva', fatt: 'ett träspjut', betal: 'två rötter', desperat: true }] },
  l_gava: { fil: 'src/sim/byte.ts:154', nu: '${g.namn} gav ${varorText(varor)} till ${m.namn}.', falt: '{namn} = g, {om} = m, {varor}, fara, barn (m är ett barn)', varianter: [
    { t: '{namn} gav {varor} till {om}.', om: nej('fara') },
    { t: '{om} fick {varor} av {namn}.', om: nej('fara') },
    { t: '{namn} lät {om} få {varor}.', om: nej('fara') },
    { t: '{namn} gav {om} {varor} och bad inte om något tillbaka.', om: nej('fara') },
    { t: '{namn} gav {varor} till barnet {om}.', om: f => !f.fara && !!f.barn },
    { t: '{namn} gav {varor} till {om}, som höll på att dö.', om: ja('fara') },
    { t: '{om} höll på att dö, och {namn} gav {honom2} {varor}.', om: ja('fara') },
  ], exempel: [{ namn: 'Ylva', om: 'Ask', varor: 'ett träspjut', honom2: 'honom' }] },
  l_vanner: { fil: 'src/sim/samtal.ts:217', nu: '${a.name} och ${b.name} har blivit nära vänner.', falt: '{namn} = a, {med} = b, natt, arstid', varianter: [
    '{namn} och {med} har blivit nära vänner.',
    '{namn} och {med} söker sig till varandra nu. De är nära vänner.',
    'Det har vuxit fram en vänskap mellan {namn} och {med}.',
    '{namn} och {med} har blivit goda vänner.',
    'Nu är {namn} och {med} vänner, och det syns.',
    '{namn} har fått en vän i {med}, och {med} i {namn}.',
  ], exempel: [{ namn: 'Ask', med: 'Ylva' }] },
  l_bastaVanner: { fil: 'src/sim/relationer.ts:113', nu: '${p.name} och ${q.name} har blivit bästa vänner.', falt: '{namn} = p, {med} = q', varianter: [
    '{namn} och {med} har blivit bästa vänner.',
    'Ingen står {namn} så nära som {med}. De är bästa vänner.',
    '{namn} och {med} är bästa vänner nu.',
    'Av alla i byn har {namn} valt {med}. De är bästa vänner.',
    '{namn} och {med} är oskiljaktiga. De har blivit bästa vänner.',
  ], exempel: [{ namn: 'Ask', med: 'Ylva' }] },
  l_ovanner: { fil: 'src/sim/samtal.ts:218', nu: '${a.name} och ${b.name} har blivit ovänner.', falt: '{namn} = a, {med} = b', varianter: [
    '{namn} och {med} har blivit ovänner.',
    'Det har blivit ont blod mellan {namn} och {med}.',
    '{namn} och {med} är inte vänner längre. De är ovänner.',
    '{namn} och {med} går inte ihop. De har blivit ovänner.',
    'Mellan {namn} och {med} är det kallt nu. De är ovänner.',
  ], exempel: [{ namn: 'Ask', med: 'Ylva' }] },
  l_rivaler: { fil: 'src/sim/relationer.ts:155', nu: '${p.name} och ${q.name} har blivit rivaler.', falt: '{namn} = p, {med} = q', varianter: [
    '{namn} och {med} har blivit rivaler.',
    '{namn} vill vara bättre än {med}, och {med} vill vara bättre än {namn}. De är rivaler.',
    '{namn} och {med} tävlar om allt nu. De har blivit rivaler.',
    'Det är en tävlan mellan {namn} och {med}. De har blivit rivaler.',
  ], exempel: [{ namn: 'Ask', med: 'Ylva' }] },
  l_arke: { fil: 'src/sim/relationer.ts:127', nu: '${p.name} ser nu ${worst.name} som sin ärkefiende.', falt: '{namn} = p, {om} = worst, {hen}', varianter: [
    '{namn} ser nu {om} som sin ärkefiende.',
    'Ingen hatar {namn} som {om}. {om} är {hans} ärkefiende nu.',
    'För {namn} är {om} nu den värsta fienden.',
    '{namn} har bestämt sig: {om} är {hans} ärkefiende.',
  ], exempel: [{ namn: 'Ask', om: 'Ylva', hans: 'hans' }] },
  l_slagsmal: { fil: 'src/sim/strid.ts:892', nu: '${namn(0)} och ${namn(1)} slogs (${orsak}). ${vinnare} vann.', falt: '{namn} = sida 0, {mot} = sida 1, {orsak} (efter ett gräl …), {vinnare} (namnet, tomt när ingen vann), ingen, natt', varianter: [
    { t: '{namn} och {mot} slogs {orsak}. {vinnare} vann.', om: nej('ingen') },
    { t: 'Det blev slagsmål {orsak}. {namn} och {mot} slogs, och {vinnare} vann.', om: nej('ingen') },
    { t: '{namn} och {mot} slogs {orsak}, och {vinnare} gick segrande därifrån.', om: nej('ingen') },
    { t: '{orsak2} slogs {namn} och {mot}. {vinnare} vann.', om: f => !f.ingen && !!f.orsak2 },
    { t: 'Mitt i natten slogs {namn} och {mot}. {vinnare} vann.', om: f => !f.ingen && !!f.natt },
    { t: '{namn} och {mot} slogs {orsak}. Ingen vann.', om: ja('ingen') },
    { t: '{namn} och {mot} slogs {orsak}, men ingen av dem vann.', om: ja('ingen') },
  ], exempel: [{ namn: 'Ask', mot: 'Ylva', orsak: 'efter ett gräl', orsak2: 'Efter ett gräl', vinnare: 'Ylva' }] },
  l_larm: { fil: 'src/sim/rykten.ts:527', nu: '${ropare} ropade larm (${vad}). ${n} hörde det.', falt: '{namn} = ropare, {vad} (slagsmål, vargar, eld …), {vadtext} (ur LARM_VAD), {n} = talOrd(antal), falskt, ensam (bara en hörde)', varianter: [
    { t: '{namn} ropade larm: {vadtext}. {N} hörde det.', om: nej('falskt') },
    { t: '{namn} ropade att {vadtext}, och {n} hörde ropet.', om: f => !f.falskt && !f.ensam },
    { t: '"{Vadtext}!" ropade {namn}. {N} hörde det.', om: nej('falskt') },
    { t: 'Ropet från {namn} hördes av {n}: {vadtext}.', om: f => !f.falskt && !f.ensam },
    { t: '{namn} ropade larm, och en hörde det: {vadtext}.', om: f => !f.falskt && !!f.ensam },
    { t: '{namn} ropade falskt larm: {vadtext}. {N} hörde det.', om: ja('falskt') },
    { t: '{namn} ropade att {vadtext}, men det var inte sant. {N} hörde det.', om: ja('falskt') },
  ], exempel: [{ namn: 'Ask', vad: 'slagsmål', vadtext: 'det slåss vid elden', Vadtext: 'Det slåss vid elden', n: 'fem', N: 'Fem' }] },
  l_magsjuk: { fil: 'src/sim/behov.ts:99', nu: '${p.name} blev magsjuk av skämd mat.', falt: '{namn}, {hen}', varianter: [
    '{namn} blev magsjuk av skämd mat.',
    'Maten {namn} åt var skämd, och nu har {hen} ont i magen.',
    '{namn} åt något som stod för länge och blev sjuk i magen.',
    'Skämd mat gjorde {namn} magsjuk.',
    '{namn} ligger med ont i magen. Maten var skämd.',
  ], exempel: [P('Ask')] },
  l_raMat: { fil: 'src/sim/matlagning.ts:77', nu: '${p.name} blev matförgiftad av rått kött eller rå fisk.', falt: '{namn}, {hen}, {vad} = rått kött eller rå fisk (det som åts, om det är känt), fisk', varianter: [
    '{namn} blev matförgiftad av rått kött eller rå fisk.',
    '{namn} åt {vad} och blev sjuk av det.',
    'Det var {vad} som gjorde {namn} sjuk.',
    '{namn} borde ha grillat maten. Nu är {hen} matförgiftad.',
  ], exempel: [{ ...P('Ask'), vad: 'rå fisk' }] },
  l_svartSjuk: { fil: 'src/sim/steg.ts:383', nu: '${p.name} blev svårt sjuk.', falt: '{namn}, {hen}, kallt, istid', varianter: [
    '{namn} blev svårt sjuk.',
    'En svår sjukdom har drabbat {namn}.',
    '{namn} ligger med feber och orkar inte resa sig.',
    '{namn} är mycket sjuk, och de andra oroar sig.',
    { t: 'Kylan tog {namn}, som blev svårt sjuk.', om: ja('kallt') },
  ], exempel: [P('Ask')] },
  l_lart: { fil: 'src/sim/teknik.ts:201 och minne.ts:336', nu: '${p.name} har lärt sig av ${from.name} att göra ${t.namn.toLowerCase()}.', falt: '{namn} = den som lärt sig, {av} = läraren, {lara} = LARA[teknik] eller larAv (minne.ts), {hen}, {honom}, ung', varianter: [
    '{namn} har lärt sig av {av} att {lara}.',
    '{av} har lärt {namn} att {lara}.',
    'Nu kan {namn} också {lara}. {av} visade {honom} hur.',
    '{namn} såg på när {av} arbetade, och nu kan {hen} själv {lara}.',
    'Det tog sin tid, men nu kan {namn} {lara}. Det var {av} som lärde {honom}.',
    { t: 'Barnet {namn} har lärt sig av {av} att {lara}.', om: ja('ung') },
  ], exempel: [{ ...P('Ask'), av: 'Ylva', lara: 'leda byn' }, { ...P('Ylva', 'hon'), av: 'Ask', lara: 'skilja kantarellen från den giftiga spindlingen' }] },
  l_rykte: { fil: 'src/sim/rykten.ts:280', nu: 'Det går rykten om att ${e.namn} är ${d.namn}.', falt: '{namn} = den ryktet gäller, {rykte} = INTRYCK.som ?? namn, heder (tecken > 0)', varianter: [
    'Det går rykten om att {namn} är {rykte}.',
    'Folk viskar om att {namn} är {rykte}.',
    'Man säger i byn att {namn} är {rykte}.',
    'Ryktet går: {namn} är {rykte}.',
    { t: 'Det har börjat sägas att {namn} är {rykte}, och det sägs med respekt.', om: ja('heder') },
    { t: 'Bakom ryggen på {namn} säger man att {hen} är {rykte}.', om: nej('heder') },
  ], exempel: [{ ...P('Ask'), rykte: 'en lögnare' }, { ...P('Ylva', 'hon'), rykte: 'flitig', heder: true }] },
  l_flinta: { fil: 'src/sim/eld.ts:363', nu: '${p.name} hittade en flintsten vid stenarna.', falt: '{namn}, {plats} = vid stenarna / i sanden vid stranden / tomt', varianter: [
    { t: '{namn} hittade en flintsten {plats}.', om: ja('plats') },
    { t: 'Bland stenarna låg en flinta, och {namn} tog den.', om: f => f.plats === 'vid stenarna' },
    { t: '{namn} fick syn på en flintsten i sanden vid stranden.', om: f => f.plats === 'i sanden vid stranden' },
    { t: '{namn} hittade en flintsten.', om: nej('plats') },
    { t: 'En flintsten! {namn} hittade den {plats}.', om: ja('plats') },
  ], exempel: [{ ...P('Ask'), plats: 'vid stenarna' }] },
  l_fodd: { fil: 'src/sim/liv.ts:127', nu: '${ch.name} föddes, ${dotter|son} till ${mor} och ${far}.', falt: 'Samma som k_fodd (kronikaBer), som redan har 11 varianter: loggraden kan skrivas med den texten som krönikan får, så att mallen k_fodd används för båda', varianter: [], exempel: [] },
};

// ---------- fälten ----------
export const NYA_FALT: Record<string, string> = {
  relation: 'relationText (berattelser.ts:1753): f = { namn, om, hen: hen(p), ung: ageOf(p) < ALDER.vuxen, gammal: ageOf(p) >= ALDER.gammal, omUng: ageOf(q) < ALDER.vuxen, glad: moodOf(p, s.now) >= BERATT.glad, talks: r.talks ?? 0, mycketPrat: (r.talks ?? 0) >= 20, sida: !!r.minns?.sida, gral: !!r.minns?.gral, slag: !!r.minns?.slag, barn: barn tillsammans, kin: isKin(p, q) }. t är fortfarande 0, så texten byter inte när man tittar igen.',
  prat: 'pratText (berattelser.ts:1741): f får också arstid (ARSTIDER[kalender(s).ai]), natt (!isLight(x.t)), kallt (temperature(s) < 0), regn, inne (den som talade står i ett hus), yrke (t.tag, med gemen, utom Dagdrivare) och barn (t har barn under vuxen ålder). Vädret och tiden kommer från när samtalet hölls; gemener i arstid ("hösten").',
  dod: 'die (liv.ts:103): kronikaBer får nar = vad personen gjorde, när orsak är olycka: `när ${hen} ${NAR_AKT[p.task.act]}`, om akten finns i NAR_AKT; sorjer = partnern om den lever, annars bästa vännen (p.bast), annars en förälder i livet, annars inget.',
  skal: 'gebinamn (berattelser.ts:1305): skalTill ger { skal, tillst }; f.tillstand = INTRYCK[k].som ?? INTRYCK[k].namn, f.tillst, f.som = !!INTRYCK[k].som.',
  logg: 'De nya loggmallarna: berattelse(s, mall, nyckel, f) med f som raden säger. Hjälpen loggBer(s, mall, nyckel, f, kind, ids) gör som kronikaBer: lägger till arstid, kallt, sno, regn och natt och skriver raden med log().',
};
// vad den som lärt sig kan (l_lart): "har lärt sig av Ylva att …". En rad per teknik i TEKNIK (teknik.ts); förslag: ett fält lara på teknikens rad
export const LARA: Record<string, string> = {
  korg: 'fläta korgar', yxa: 'göra flintyxor', fiskespjut: 'tälja träspjut', rep: 'tvinna rep', flintspjut: 'göra flintspjut', metspo: 'göra metspön',
  kniv: 'slå flintknivar', timmervagg: 'bygga timmerhus', slaktbank: 'bygga en slaktbänk', flatarbank: 'bygga en slöjdbänk', halmbadd: 'göra halmbäddar',
  bord: 'bygga bord', hylla: 'göra hyllor och kistor', skinnfall: 'sy skinnfällar', skinndorr: 'hänga dörrar av skinn', tradorr: 'göra trädörrar',
  bensyl: 'slipa bensylar', skinnklader: 'sy kläder av skinn', vattensack: 'sy vattensäckar', balte: 'fläta bälten', mal: 'binda mål', boll: 'sy bollar',
  slagtra: 'tälja slagträn', scen: 'bygga en scen', trumma: 'göra trummor', benflojt: 'skära benflöjter', lyra: 'göra lyror', kruka: 'forma lerkrukor',
  bonad: 'göra bonader', vaggbrade: 'snida väggbräden', benspade: 'göra benspadar', latrin: 'gräva en latrin', grill: 'bygga en grillställning',
  tork: 'bygga en torkställning', odling: 'odla', ledarskap: 'leda byn',
};
// vad den som dog i en olycka gjorde (k_dog, {nar} = "när han fällde ett träd")
export const NAR_AKT: Record<string, string> = {
  falla: 'fällde ett träd', hugga: 'högg ved', klyva: 'klöv virke', jakt: 'var ute på jakt', fiske: 'fiskade', ved: 'samlade grenar', samla: 'samlade bär',
  bygga: 'byggde', station: 'byggde', dorr: 'hängde en dörr', odla: 'arbetade på fältet', bada: 'badade i sjön', vatten: 'hämtade vatten', dricka: 'drack vid vattnet',
  slakta: 'slaktade', rensa: 'rensade fisk', elda: 'lade ved på elden', tanda: 'försökte tända elden', flyttaeld: 'flyttade elden', kol: 'hämtade kol ur elden',
  promenad: 'var ute och gick', strand: 'satt vid stranden', bara: 'bar in saker till lagret', vakt: 'höll vakt', leka: 'lekte', sport: 'spelade',
  yxa: 'gjorde en yxa', kniv: 'slog flinta', spjut: 'täljde ett spjut', grilla: 'grillade mat', sova: 'sov',
};
// vad ett larm gällde (l_larm, {vadtext}); nycklarna är vad i larma() (rykten.ts)
export const LARM_VAD: Record<string, string> = {
  'slagsmål': 'det slåss i byn', fara: 'det är fara på väg', vargar: 'vargarna kommer', 'rövare': 'rövare är på väg', eld: 'det brinner',
};
