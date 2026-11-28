
# DEL foretag
## sammanfattning
Granskning av fas 14 (företagen och ekonomin), commit 7978df68. Många av de största felen står redan som steg i Färdplanen och togs inte med: gästen utan silver (15.1.11), gästerna i efterfrågan (15.1.13), Foretag.intakt (15.1.54), KOPBUFFERT.gang (15.1.55), företagets tak för anställningen (15.1.27), de tre sätten att betala (15.1.29) och priset i silver (15.1.17). Nya fynd som håller: (1) forstaGang räknar statistiken en gång till. Därför räknas varje köp vid disken och varje anställning två gånger, och raderna "den första kunden" och "första anställningen" skrivs aldrig. Nyckeln foretagSalt används dessutom både för ett köp och för när hela företaget säljs. (2) En gäst som inte hittar något att köpa ger det sämsta omdömet, −1, i relationen men −0,5 (FRYKTE.utan) i ryktet. Det är två tal för samma sak, och 99 av 99 gäster i 1511-45 gick hem missnöjda. (3) Marknadens harOver har en tredje definition av "har mat eller ved över", som skiljer sig från bytet som faktiskt görs på marknaden (7 av 28 par). (4) kopval räknar om personPart, betalVaror och vilMangd inne i loopen över 338 matslag. Det tar 49 ms per person och val i 1511-45 och är den dyraste delen av ekonomin (2,7 % av datortiden). (5) Det finns dubbletter som kan slås ihop: kundPung och formaga, radAv på två ställen, saltAv och samma räkning i stangning.ts, kundVal och erbjudandet, grannensOver och overEget, samt laggGruvor och laggJarngruvor. Järngruvorna läggs dessutom in i sparfilen genom en rad i TAKTER i stället för i migrate. (6) anstAv är död. Inga filer under src/, test/ eller bildstil/ har ändrats, och mätskripten (src/test/zz_*.ts) är borttagna.
## siffror
Sparade byar (test/facit-byar) i s.stat: 1511-45 har anstalld=336, och raderna anstalld_* summerar till 168 (13+154+1), alltså exakt hälften. 1-40: 84 mot 42. 4634-45: foretagSalt=16 mot foretagSalt_affar=7 (7×2 plus 2 sålda företag). 1511-45: foretagsgast=99, omdomeDaligt=99, gastMissnojd=99. Relationen till grannklanerna gick från 0/-3/0/0/0/-1 vid 1511-20 till -30/-4/-11/-14/-32/-18 vid 1511-45. Alla rader i världen har tal.silver=0 vid dygn 5, 20 och 45 i alla tre byarna. harOver mot overOf: 28 par, 7 olika (alla i 4634-45). Tid i 1511-45 (datorns tid): kopval(mat) för 17 bybor 828 ms, alltså 49 ms per person. Med 338 matslag tar vilMangd för alla slag 9,9 ms och betalVaror 1,1 ms per anrop. kopval(ved) för alla 0,26 ms, kundVal(affar) för alla 0,05 ms, bastaStart 150 ms (en gång per dygn, ett år i spelet), efterfragat 0,5 ms. Profilen av 4 timmar (riktig tid, ett dygn i spelet) i 1511-45 tog 5212 ms: kopval 2,7 % (vilMangd 2,2 %, betalVaror 0,8 %, payable 0,8 %), foretagsgastSteg 0,4 %, allt annat i ekonomin under 0,2 %. npm run kostnad (120 min i byarna utan företag): företagens rader alla under 0,05 ms per minut och by.

### 1. [bugg] forstaGang räknar köpen och anställningarna två gånger, och raden för den första skrivs aldrig
Plats: src/sim/kassa.ts:262-263, src/sim/dagsarbete.ts:147-148, src/sim/folk.ts:517
forstaGang(s, k) gör själv count(s, k) och svarar sant när talet är 1. I kopVid står count(s, 'foretagSalt') direkt före forstaGang(s, 'foretagSalt'), och i anstallDygn står count(s, 'anstalld') direkt före forstaGang(s, 'anstalld'). Varje köp vid disken och varje anställning räknas därför två gånger i s.stat. forstaGang ser aldrig talet 1, så loggraderna "X blev den första kunden" och "X anställde Y för ett år" skrivs aldrig. Samma mönster finns i fas 13-filerna enligt grep (skrift.ts:527 skrivet, jarnsaker.ts:97 omsmitt, rester.ts:88/104 och fler), och de som granskar fas 13 bör se på dem.
Bevis: Sparade byar: 1511-45 har anstalld=336, men anstalld_bygghjalp 13 + anstalld_undervisning 154 + anstalld_vard 1 = 168, alltså exakt hälften. 1-40 har anstalld=84 mot 8+34=42. 4634-45 har foretagSalt=16 mot foretagSalt_affar=7 (7×2=14, plus 2 sålda företag, se nästa fynd). grep "forstaGang(s, '[a-z]*')" över src/sim med count(s, samma nyckel) i samma fil ger de två ställena i fas 14.
Lösning: kassa.ts:262: ta bort count(s, 'foretagSalt'); och behåll count(s, 'foretagSalt_' + r.v) och raden if (forstaGang(s, 'foretagSalt')) log(...), så att forstaGang gör den enda räkningen. dagsarbete.ts:147: ta bort count(s, 'anstalld'); och behåll count(s, 'anstalld_' + arb) och if (forstaGang(s, 'anstalld')). Spelet ändras inte, eftersom bara statistiken och loggen ändras. npm run samma ska vara lika.
DOM: håller=True spel=False dok=False bjorn=False
Varför: folk.ts:517: forstaGang = (s,k) => { count(s,k); return s.stat![k] === 1; }. kassa.ts:262 gör count(s,'foretagSalt') och rad 263 forstaGang(s,'foretagSalt'), och dagsarbete.ts:147-148 gör samma med 'anstalld'. Varje händelse räknas alltså två gånger, talet blir 2, 4, 6 …, och forstaGang ser aldrig 1. Loggraderna om den första kunden och den första anställningen skrivs därför aldrig. Det stämmer med granskarens siffror (1511-45 anstalld=336 = 2×168). Inget i src läser s.stat.anstalld. fas14.ts:224 läser foretagSalt bara som större än noll. En rättelse till granskaren: npm run samma räknar en md5 av hela den sparade byn (samma.ts:25), med s.stat och s.log, så den visar ANNAN UTVECKLING. Det som människorna gör blir ändå detsamma.
Rättad lösning: kassa.ts:262: ta bort `count(s, 'foretagSalt');` och behåll `count(s, 'foretagSalt_' + r.v);` och raden 263 med forstaGang. dagsarbete.ts:147: ta bort `count(s, 'anstalld');` och behåll `count(s, 'anstalld_' + arb);` och raden 148 med forstaGang. Efter ändringen ska bara s.stat (de två talen halveras) och s.log (de två nya raderna) skilja sig från förut. Kontrollera det genom att jämföra en sparad by före och efter med stat och log borttagna, och spara sedan nytt facit med npm run facit, eftersom samma-kollen ser skillnaden. Gå igenom de andra platserna där count(s,k) står direkt före forstaGang(s,k) i fas 13, och se om de har samma fel.

### 2. [bugg] Statistiken foretagSalt betyder både ett köp vid disken och att hela företaget sålts
Plats: src/sim/stangning.ts:60, src/sim/kassa.ts:262, src/test/scenarier/fas14.ts:224
saljForetag räknar count(s, 'foretagSalt') när ett företag byter ägare på husmarknaden, och kopVid räknar samma nyckel för varje kund. Talet blandar två händelser. Scenariot kassa (fas14.ts:224) läser s.stat.foretagSalt för att se om någon köpt, och en företagsförsäljning skulle få det att gå igenom utan något köp. forstaGang i kassa.ts:263 kan också slå till vid ett sålt företag i stället för vid den första kunden.
Bevis: 1511-45: foretagSalt=5 och inga foretagSalt_*-rader, foretagTillSalu=5. De 5 är alltså sålda företag, inga köp. 4634-45: foretagSalt=16 = 2×7 köp (foretagSalt_affar=7) + 2 sålda företag (foretagTillSalu=3, foretagStangt=1). grep "'foretagSalt'" ger stangning.ts:60 och kassa.ts:262-263.
Lösning: stangning.ts:60: byt count(s, 'foretagSalt') mot count(s, 'foretagSaltHelt'). Tillsammans med fyndet ovan räknas då foretagSalt bara av forstaGang i kopVid, ett per köp. fas14.ts:224 kan läsa som förut.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep "'foretagSalt'" ger stangning.ts:60, där saljForetag räknar en hel företagsförsäljning, och kassa.ts:262-263, där varje köp räknas. Samma nyckel används alltså för två olika händelser. Då kan forstaGang i kassa.ts:263 tro att den första kunden redan kommit fast det bara var ett företag som sålts. Scenariot fas14.ts:224 kan också gå igenom på en försäljning utan att någon köpt något, även om det är osannolikt under scenariots korta tid. Siffrorna (1511-45: foretagSalt=5 utan några foretagSalt_*) stämmer med det.
Rättad lösning: stangning.ts:60: byt `count(s, 'foretagSalt');` mot `count(s, 'foretagSaltHelt');`. Om något i ui eller statistiken ska visa sålda företag, läser det då foretagSaltHelt (grep visar att inget läser det i dag). Görs detta tillsammans med fynd 1 räknas foretagSalt bara av forstaGang i kopVid, en gång per köp. Bara statistiken ändras, och facit sparas om som i fynd 1.

### 3. [sammanslagning] Gästen som gick utan något: −1 i relationen men FRYKTE.utan (−0,5) i ryktet
Plats: src/sim/foretagsgast.ts:138, src/sim/foretagsgast.ts:170, src/sim/foretagsrykte.ts:22 och 50
Två krokar i omdome säger vad ett besök utan köp är värt. foretagsrykte.ts:50 ger FRYKTE.utan (−0,5), men gästens krok i foretagsgast.ts:138 ger det lägsta värdet −1, som ett tal i koden. Gästen som inget lockade (rad 170, också den som inte har något att betala med) blir därför "illa bemött" med full vikt, och klanHandelse('illaBemott', 1 × RANG.vikt) sänker relationen till hembyn 3 poäng per gäst (BYREL.illaBemott). Dokumentet (Gästerna och ryktet) säger att omdömet är kvaliteten, priset, finheten och väntan. Ett besök utan något av dem är FRYKTE.utan, inte det sämsta möjliga. Det här är inte samma sak som 15.1.11, som ger gästen silver och varor, eftersom en gäst som inte hittar något hen vill ha också får −1.
Bevis: 1511-45: foretagsgast=99, omdomeDaligt=99, gastMissnojd=99, inga köp av gäster. Grannklanernas inst var 0/-3/0/0/0/-1 vid 1511-20 och -30/-4/-11/-14/-32/-18 vid 1511-45. 4634-45: 49 gäster och gastMissnojd=49.
Lösning: foretagsgast.ts:138: byt `: -1` mot `: FRYKTE.utan` och importera FRYKTE från './foretagsrykte' (filen importerar redan ryktetI och omdomeAv därifrån). Då finns talet bara på ett ställe, foretagsrykte.utan.
DOM: håller=True spel=True dok=False bjorn=False
Varför: foretagsgast.ts:138 ger `b ? omdomeAv(...) : -1` och foretagsrykte.ts:50 ger `b ? omdomeAv(...) : FRYKTE.utan`, där FRYKTE.utan = -0,5 (foretagsrykte.ts:22). Det är två tal för samma sak: vad ett besök utan köp är värt. En gäst som inget lockade (foretagsgast.ts:170) får därför v = -1 och full vikt i klanHandelse('illaBemott', …) på rad 185. Dokumentet (Människan, Gästerna och ryktet) säger bara att omdömet är kvaliteten, priset, finheten och väntan, och att omdömet ändrar relationen. Det säger inget om att ett tomt besök är det sämsta möjliga. Rättningen ändrar spelet, eftersom relationerna till grannbyarna sjunker hälften så mycket per sådan gäst.
Rättad lösning: foretagsgast.ts:138: byt `: -1` mot `: FRYKTE.utan`. Ändra importen på rad 20 till `import { FRYKTE, ryktetI, omdomeAv } from './foretagsrykte';`. Då finns värdet bara på ett ställe, balanstalet foretagsrykte.utan. Spelet ändras (relationen mellan byarna), så spara nytt facit efter de vanliga testerna.

### 4. [sammanslagning] Marknaden räknar "har mat över" på ett tredje sätt, inte som bytet på marknaden
Plats: src/sim/marknad.ts:27 (harOver), src/sim/behov.ts:270 (overOf), src/sim/behov.ts:296 (tradeFor), src/sim/behov.ts:725 (overEget)
handelslust (marknad.ts:34) räknar vem som har mat eller ved över med harOver: ownFor(g) > behall(g) + b.minst. behall räknas för g ensam med egenGrans. Men bytet som görs på marknaden (marknadKlar, bytenMellan, brukByte, tradeFor) frågar overOf(s, g, b, m) >= b.minst, som drar av b.kvar och för familjen b.mangd. Det är två vägar för samma fråga. Därför kallar byn till marknad, och folk går dit, för byten som inte blir av, och den som skulle kunna byta räknas inte. CLAUDE.md säger att det en person har över räknas på ett ställe.
Bevis: Ett mätskript över 7 sparade byar (1511-45, 4634-45, 1-40, 1511-30, 4634-25, 1-25, 1511-15) prövade varje par (den som saknar mat eller ved, en annan bybo): 28 par, 7 olika svar. Exempel i 4634-45: Ashild→Ufast mat ger harOver=false (äger 4,0, behåller 4,7) men overOf=2,0, alltså >= minst, så bytet skulle bli av.
Lösning: marknad.ts:27: för behovsraden, byt `ownFor(s, g, b) > r.behall(s, g, k) + b.minst` mot `overOf(s, g, b, p) >= b.minst`. harOver får då parametern p (den som saknar), och anropet på rad 34 blir folk.filter(g => g !== p && harOver(s, g, p, k)). Cachen over (Map per k) måste då ha p i nyckeln eller tas bort. Importera overOf från './behov' (den är redan exporterad). Grenarna för ting och material står kvar.
DOM: håller=True spel=True dok=True bjorn=False
Varför: marknad.ts:27 harOver frågar för en behovsrad `ownFor(g) > r.behall(g,k) + b.minst`, där behall = behalls, alltså max(kvar, egenGrans). Bytet som görs på marknaden (marknad.ts:72 bytenMellan → behov.ts:649 brukByte → tradeFor rad 296 / gift) frågar i stället overOf(s,g,b,m) >= b.minst (rad 270). overOf beror på mottagaren: för en förälder som försörjer barnet dras 0 av, för familjen b.mangd och för andra b.kvar. Lusten att kalla till marknad räknas alltså med en annan gräns än den som avgör om bytet blir av. CLAUDE.md, och Arbetsdelningen (Alla saker byts efter samma regler) i dokumentet, säger att det en person har över räknas på ett ställe. Raderna för ting (r.over, samma som tingFran) och för material (materialOver) går redan samma väg som bytet. Steget är 14.1.14, alltså fas 14.
Rättad lösning: marknad.ts:27: ge harOver mottagaren som parameter: `const harOver = (s, g, p, k) => { const r = brukAv(k), b = r.behov?.(); return b ? overOf(s, g, b, p) >= b.minst : r.ting ? !!r.over?.(s, g, k) : materialOver(s, g, k) >= 1; };`. Importera overOf från './behov', där den redan är exporterad. På rad 34 blir det `folk.filter(g => g !== p && harOver(s, g, p, k))`, och cachen `over` (Map per k) tas bort för behovsraderna, eftersom svaret beror på p. Enklast är att ta bort cachen helt och räkna `andra` direkt. Det kostar lite: overOf är ett par ownFor, och marknadDygn räknas en gång per dygn. Spelet ändras (vem som kallar till marknad och vilka som går dit).

### 5. [optimering] kopval räknar om grannens part, betalningen och vilMangd för vart och ett av 338 matslag
Plats: src/sim/kopbuffert.ts:41-56
I grannens loop görs, för varje slag k i b.slag (338 för maten), vilMangd(s, p, k), som inte beror på grannen g, och dessutom personPart(s, g) och betalVaror(M, G, b.slag), som inte beror på k. betalVaror går igenom M.over och därmed payable över alla saker, och det upprepas för varje slag med n >= 1. kopval för maten anropas i poängen för kopaMat (val.ts:986) i varje val på dagen.
Bevis: 1511-45, mätt med performance.now (datorns tid): kopval(s, p, 'mat') tar 131 ms för en person och 828 ms för alla 17. vilMangd för alla 338 slag tar 9,9 ms och betalVaror 1,1 ms per anrop. En profil av 4 timmar i 1511-45 (riktig tid, ett dygn i spelet) gav kopval 2,7 % av all datortid (vilMangd 2,2 %, betalVaror 0,8 %). Ingen annan del av ekonomin låg över 0,4 %.
Lösning: I kopval: (1) före grannens loop, räkna vill = new Map(b.slag.map(k => [k, vilMangd(s, p, k)])) en gång. Hoppa över slag med vill < 1 och läs vill.get(k) i stället för vilMangd på rad 49. (2) Flytta `const G = personPart(s, g)` och `const varor = betalVaror(M, G, b.slag)` ut ur loopen över k, direkt efter M ??= personPart(s, p), och använd varor i betalaAv(varor, G, ger) (betalaAv ändrar inte listan). (3) Pröva ownsAmount(s, g, k) >= 1 före de andra talen. Allt läses bara, så spelet blir exakt detsamma: npm run samma ska vara lika.
DOM: håller=True spel=False dok=False bjorn=False
Varför: kopbuffert.ts:41-56: inne i loopen över grannarna g och slagen k räknas vilMangd(s,p,k) för varje g, fast talet inte beror på g. personPart(s,g) och betalVaror(M,G,b.slag) räknas för varje k, fast de inte beror på k. vilMangd (affar.ts:45), personPart (behov.ts:750) och betalVaror (behov.ts:977) ändrar ingenting, och betalaAv (behov.ts:986) läser bara listan. Inget i loopen ändrar byn, eftersom prova bara sparar det bästa. Att flytta räkningarna ger därför exakt samma resultat. Jag mätte inte tiden själv, men det är rimligt att vilMangd över 338 slag per granne är den stora kostnaden.
Rättad lösning: I kopval, före grannens loop: `const vill = new Map<string, number>(); for (const k of b.slag) { const v = vilMangd(s, p, k); if (Math.floor(v + 1e-9) >= 1) vill.set(k, v); }`. Hoppa över grannarna om vill är tom. Villkoret ska vara exakt floor(v + 1e-9) >= 1, så att det följer n-räkningen. I grannens loop, efter `M ??= personPart(s, p);`: `const G = personPart(s, g), varor = betalVaror(M, G, b.slag);`. Loopa sedan `for (const [k, v] of vill)` i b.slag-ordningen (Map behåller ordningen den fylls i). Där blir `n = Math.floor(Math.min(v, over / (b.per?.[k] ?? 1), ownsAmount(s, g, k)) + 1e-9)` och `bet = betalaAv(varor, G, ger)`. Ordningen mellan slagen ska vara densamma, eftersom prova bara byter vid strikt större faktor. npm run samma ska vara lika.

### 6. [sammanslagning] Vad en person kan betala räknas likadant på två ställen (kundPung och formaga)
Plats: src/sim/foretag.ts:117, src/sim/dagsarbete.ts:66-69
kundPung = payable(s, p, []).reduce((a, w) => a + (w.t ? 0 : w.n * grundvarde(w.k)), 0), och formaga i dagsarbete.ts gör exakt samma summa och tar Math.floor(... + 1e-9). Kommentaren i dagsarbete.ts säger själv att det är "som kunden vid disken, kundPung i foretag.ts". 15.1.27 ska använda samma räkning en tredje gång (taket i DAGSVERK.foretag).
Bevis: grep "payable(s, p, \[\]).reduce" src/sim ger exakt två träffar: dagsarbete.ts:68 och foretag.ts:117, med samma uttryck.
Lösning: Lägg i behov.ts, efter payable: export const betalVarde = (s: State, p: Person) => payable(s, p, []).reduce((a, w) => a + (w.t ? 0 : w.n * grundvarde(w.k)), 0). I foretag.ts blir kundPung = betalVarde (eller så byts anropet på rad 158 direkt mot betalVarde och kundPung tas bort). I dagsarbete.ts: return p ? Math.floor(betalVarde(s, p) + 1e-9) : silverAv(s, id). Spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep "payable(s, p, \[\]).reduce" ger exakt två träffar med samma uttryck: foretag.ts:117 (kundPung) och dagsarbete.ts:68 (formaga, med Math.floor(...+1e-9)). Kommentaren i dagsarbete.ts:64 säger själv att de är samma räkning. kundPung används bara i foretag.ts:128.
Rättad lösning: Lägg i behov.ts direkt efter payable: `export const betalVarde = (s: State, p: Person) => payable(s, p, []).reduce((a, w) => a + (w.t ? 0 : w.n * grundvarde(w.k)), 0);`. Se till att grundvarde är importerat där. foretag.ts:117: ta bort kundPung och byt anropet på rad 128 mot betalVarde(s, p), importerad från './behov' (gör grep -rn kundPung src först; i dag finns bara rad 128). dagsarbete.ts:68: `return p ? Math.floor(betalVarde(s, p) + 1e-9) : silverAv(s, id);`, och ändra kommentaren på rad 64 så att den säger betalVarde i behov.ts. Spelet blir exakt detsamma.

### 7. [sammanslagning] Gästens hemby (radAv) står två gånger, och antalet sålda räknas två gånger
Plats: src/sim/foretagsgast.ts:60, src/sim/verksamheter.ts:57, src/sim/foretag.ts:215, src/sim/stangning.ts:81
radAv (gästens hembys rad) är skriven likadant i både foretagsgast.ts och verksamheter.ts. stangning.ts:81 räknar kunder = Object.values(f.salt ?? {}).reduce(...), som är saltAv(f) i foretag.ts:215.
Bevis: grep "klanById(s, p.gast?.klan)?.rad" ger två identiska rader (foretagsgast.ts:60 och verksamheter.ts:57). grep "Object.values(f.salt" ger foretag.ts:215 (saltAv) och stangning.ts:81.
Lösning: Exportera radAv från foretagsgast.ts som gastRad, ta bort kopian i verksamheter.ts och importera den. verksamheter.ts importerar redan från foretag.ts och klaner.ts, och foretagsgast.ts importerar inte verksamheter.ts, så ingen ring uppstår. Annars kan funktionen läggas i klaner.ts bredvid klanById. I stangning.ts:81: kunder = saltAv(f), importerad från './foretag'. Spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep ger två identiska rader för radAv, foretagsgast.ts:60 och verksamheter.ts:57. stangning.ts:81 räknar samma summa som saltAv i foretag.ts:215. Att lägga radAv i foretagsgast.ts och importera den till verksamheter.ts riskerar en ring mellan modulerna (foretagsgast → foretag/kassa, där foretag och verksamheter hör ihop). Då kan balans()-konstanterna läsas innan de är satta. klaner.ts är därför ett säkrare ställe, eftersom båda filerna redan importerar klanById därifrån.
Rättad lösning: Lägg i klaner.ts bredvid klanById: `export const gastRad = (s: State, p: Person) => { const nr = klanById(s, p.gast?.klan)?.rad; return s.varld?.rader?.find(r => r.nr === nr); };`. Ta bort radAv i foretagsgast.ts:60 och verksamheter.ts:57, byt deras anrop mot gastRad och lägg till gastRad i importen från './klaner' i båda filerna. stangning.ts:81: `const kunder = saltAv(f), …`, med saltAv importerad från './foretag'. Spelet blir exakt detsamma.

### 8. [sammanslagning] kundVal och grannensOver är omvägar utan egen verkan
Plats: src/sim/kassa.ts:115, src/sim/behov.ts:559
kundVal(s, p, v) => erbjudandet(s, p, v) är bara ett andra namn för erbjudandet. grannensOver(s, g, b, _m) => overEget(s, g, b) tar en parameter den aldrig läser och lägger bara ett namn på overEget. Det ser ut som om två vägar finns.
Bevis: kassa.ts:115 och behov.ts:559 visar texten. grep: kundVal används i val.ts:818, 819, 850, 1642 och i fas14.ts, grannensOver bara i kopbuffert.ts:46.
Lösning: Ta bort kundVal och byt de fyra anropen i val.ts och scenarierna i fas14.ts mot erbjudandet(s, p, v), eller döp om erbjudandet till kundVal och lägg till parametrarna bara/kan. Rätta kommentarerna i kassa.ts:3, konkurrens.ts:2 och foretagsrykte.ts:2. I behov.ts: exportera overEget och ta bort grannensOver. I kopbuffert.ts:46: overEget(s, g, b). Spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: kassa.ts:115 `kundVal = (s,p,v) => erbjudandet(s,p,v)` är bara ett andra namn för erbjudandet. Den används i val.ts:818, 819, 850 och 1642 och i fas14.ts:148, 200-203, 270, 326 och 476 (via SIM). behov.ts:559 `grannensOver(s,g,b,_m) => overEget(s,g,b)` läser aldrig _m och används bara i kopbuffert.ts:45 (granskaren skrev rad 46). overEget (behov.ts:724) är i dag inte exporterad.
Rättad lösning: kassa.ts: ta bort kundVal på rad 115. I val.ts byts `kundVal(c.s, c.p, X)` mot `erbjudandet(c.s, c.p, X)` på raderna 818, 819, 850 och 1642, och importen på rad 50 blir erbjudandet i stället för kundVal. Kontrollera att SIM-indexet exporterar erbjudandet, och byt sedan SIM.kundVal mot SIM.erbjudandet i fas14.ts. Rätta orden kundVal i kommentarerna i kassa.ts:3, konkurrens.ts:2 och foretagsrykte.ts:2. behov.ts: gör `function overEget` till `export function overEget` och ta bort grannensOver (rad 558-559 med kommentaren). kopbuffert.ts:10 importerar overEget i stället för grannensOver, och rad 45 blir `overEget(s, g, b)`. Spelet blir exakt detsamma.

### 9. [dod] anstAv används inte
Plats: src/sim/dagsarbete.ts:55
export const anstAv = (s, p) => s.anst?.find(a => a.p === p.id) läses inte någonstans. Den som behöver anställningen läser p.anst.
Bevis: grep -rn "anstAv" src ger bara definitionen i dagsarbete.ts:55, ingen träff i src/sim, src/ui eller src/test.
Lösning: Ta bort raden dagsarbete.ts:55.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep -rn anstAv src ger bara definitionen i dagsarbete.ts:55. Det finns inget anrop i src/sim, src/ui eller src/test och inget via SIM.anstAv.
Rättad lösning: Ta bort raden dagsarbete.ts:55 (`export const anstAv = …`).

### 10. [gaffatejp] Järngruvorna läggs in i en äldre sparfil genom en rad i TAKTER i stället för i migrate, och två loopar gör samma sak
Plats: src/sim/gruva.ts:37-65, src/sim/steg.ts:504, src/sim/varld.ts:273, src/sim/varlden.ts:26 och 86
jarngruvorSteg körs var tionde minut (raden bränningarna i TAKTER) bara för att lägga järngruvorna i en värld som sparats före dem. Det är sparfilens sak (regel 3): varld.ts har redan rader för det (59 lägger silvergruvorna). Kroken varldMarkKrok och fältet jarnLagd finns bara för det. laggGruvor och laggJarngruvor är dessutom samma loop med en annan sort, ett annat antal och en annan hash-salt, och silvret hoppar över tommaGruvor.
Bevis: grep: jarngruvorSteg anropas bara från steg.ts:504. varldMarkKrok läses bara i gruva.ts:64 och sätts i varlden.ts:86. jarnLagd sätts i laggJarngruvor och läses bara i jarngruvorSteg och i scenariot fas12.ts:544. Raderna 37-49 och 51-62 i gruva.ts skiljer sig bara i 'silvergruva'/'jarngruva', SILVER.gruvor/JARNGRUVA.gruvor, 0x47525556/0x4a41524e och filtret tommaGruvor.
Lösning: (1) gruva.ts: en funktion laggSort(vl, v, k, antal, salt, t, utom = []) med loopen. laggGruvor blir laggSort(vl, v, 'jarngruva', JARNGRUVA.gruvor, 0x4a41524e, t) följt av laggSort(vl, v, 'silvergruva', SILVER.gruvor, 0x47525556, t, vl.tommaGruvor ?? []). (2) Lägg en ny rad sist i varld.ts migrate, [70, 'järngruvorna (steg 12.2.13)', s => { const v = varldMark(s); if (s.varld && v && !s.varld.jarnLagd) laggJarngruvor(s.varld, v, s.now); }]. Ta bort jarngruvorSteg ur steg.ts:504 och gruva.ts:64, och varldMarkKrok (gruva.ts:65, varlden.ts:86). TAKTER räknar raden direkt i första slaget (taktDt med sist undefined), så resultatet blir detsamma som migrationen. Scenariot fas12.ts:544 anropar då migrationsraden eller laggJarngruvor direkt.
DOM: håller=False spel=False dok=False bjorn=False
Varför: Iakttagelsen stämmer i koden, men den hör inte till fas 13 och 14. jarngruvorSteg, laggJarngruvor, varldMarkKrok och jarnLagd byggdes i steg 12.2.13 (commit eded085c), och git merge-base visar att den committen kom före 83199587, alltså före fas 13. Ingen commit i 83199587~1..7488f1f3 ändrar gruva.ts. Silverfiltret tommaGruvor kom i 15.1.10 (7978df68), efter fas 14. Att kalla det gaffatejp är också fel: det är en migrering som ligger på fel ställe (regel 3), inte en regel om vad människorna väljer. Att det räknas var tionde minut kostar nästan inget (en flagga).
Rättad lösning: Ta inte med fyndet i granskningen av fas 13 och 14. Om det ska göras senare: en rad [70, …] i UPPGRADERINGAR i varld.ts som anropar laggJarngruvor(s.varld, v, s.now) när s.varld och varldMark(s) finns och !s.varld.jarnLagd. Ta sedan bort jarngruvorSteg ur steg.ts:504 och ur gruva.ts, och varldMarkKrok (gruva.ts, varlden.ts:12 och 86). En värld som skapas senare får järngruvorna ändå genom laggGruvor (varlden.ts:68). Scenariot fas12.ts:544-545 skrivs om så att det anropar laggJarngruvor direkt. Att slå ihop de två looparna till en laggSort är en ren kodstädning.

# DEL strid
## sammanfattning
Jag har granskat striden, rövarna och kläderna (strid.ts, rovare.ts, kartstrid.ts, varg.ts, lagervapen.ts, utrustning.ts, klader.ts, roller.ts och de ändrade delarna av halsa.ts) på commit 7978df68. Det jag hittade:

- **Kostnad:** under ett rövaranfall tar rövarna 44–58 % av datortiden per slag. Ungefär 43 % av det är rövarens val av plats att plundra (taPlats): för varje rövare, flera gånger per slag, räknas värdet av varje lagerplats om genom att gå igenom alla högar i byn.
- **Fel i spelet (tre):**
  - Inga kläder, inte ens ringbrynjan, skyddar mot björnens klor. Klorna står för två av tre träffar.
  - Rövarlägret delar aldrig ut järnhjälmen eller ringbrynjan, eftersom listan över skydd i lagervapen.ts är skriven för hand.
  - Rövarlarmet ger NaN för alla barn. Rollen blir ändå rätt (de gömmer sig), men av en slump.
- **Dubbelräkningar:** samma villkor för vem som kan slåss står på fyra ställen. Testet av om någon är med i en strid finns i två likadana versioner. Vapnets kraft i hotet räknas med samma formel på två ställen.
- **Död kod:** KAMPE_LIST.
- **Inte med i listan:** striderna själva (kartStridSteg, stridSteg) kostade lite i mätningen, 1–2,5 %. I fältet gaffatejp har jag inget fynd som håller.

Inget av fynden står redan som steg i Färdplanen. Mätskripten är borttagna och inga filer är ändrade.
## siffror
npm run kostnad (24 byar i 120 minuter i spelet, cirka 30 timmar i spelet): 15,9 ms per minut i spelet och by. Raden striden 0,18 ms (1,2 %), vargarna 0,05, björnen 0,07. Rövarna syns inte, eftersom inget gäng kom under mätningen.

Under ett anfall (testbyarna 1-25, 1511-25 och 4634-40, var och en med skickaRovare(s, 6), stegade 90 minuter i spelet, cirka 22 timmar i spelet): 11 289 slag på 10,3 s datortid.
- Raden rövarna: 3854 ms (44,1 %).
- Raden striden: 120 ms (1,5 %).
- Räknarna: rovat 409, kartStrid 2, kartSar 58, kartStridMed 5.

CPU-profil av två byar i 60 minuter:
- rovarSteg 2682 ms totalt, varav flockVal 2490.
- malFor och taPlats, egen tid: 695 + 462 ms (cirka 43 % av rövarnas tid).
- radLinje 459, hotMot 375, vapenSkada 361, personKampe 323.

Testbyarnas storlek: 15–39 lagerplatser, 73–160 högar och 5–9 gravar per by. Inga lagerplatser överlappar varandra.

LARMHOT.rovare.plus gav NaN för 8 av 17 i byn 1511-25 (alla under ALDER.vaktFran).

### 1. [optimering] Rövarens val av plats räknar alla lagerplatsers värde om, för varje rövare och flera gånger per slag
Plats: src/sim/rovare.ts:684-693 (taPlats), 696-699 (malFor), 606-610 (radMal), 1024 (flockVal)
taPlats går igenom alla lagerplatser och för var och en alla s.stackar, och räknar grundvarde × n. Det är 27 × 160 jämförelser i byn 1511-25.

Funktionen anropas via malFor en gång per rövare i flockVal. Den anropas också för varje rövare i radMal, som körs vid varje radLinje och radMitt: en gång per slag i flockVal, en gång när hjälparna följer raden och en gång varje gång någon väljer plats i raden (rovarSkydd, radPlats).

Allt detta sker i korta slag om 0,5 s medan gänget är på kartan. Högarnas värde ändras bara när någon tar eller lägger något.
Bevis: Mätskriptet skickade 6 rövare till testbyarna 1-25, 1511-25 och 4634-40 och stegade 90 minuter i spelet med KOSTNAD på. Raden rövarna tog 3854 ms av 8735 (44,1 %).

CPU-profilen för två byar i 60 minuter: rovarSteg 2682 ms totalt, och malFor plus taPlats hade 1157 ms egen tid (V8 bakar in taPlats i malFor). Det är cirka 43 % av rövarnas tid. Nästa sak i listan, radLinje, tog 459 ms och hotMot 375 ms.
Lösning: I rovare.ts, cacha värdet per lagerplats:

1. Lägg till `const platsVarde = new WeakMap<State, { t: number; v: number; z: Zone[]; varden: number[] }>()`.
2. I lager.ts, exportera `export const lagerVersion = () => lagerV`.
3. I taPlats, ersätt raden `for (const z of zonesOf(s)) { let v = 0; for (const a of s.stackar ...) ...; prova(...) }` med:
   - hämta cachen;
   - om den saknas, eller `c.t !== s.now || c.v !== lagerVersion() || c.z !== zonesOf(s)`, räkna om `varden[i]` exakt som i dag (samma slinga och ordning, så att summorna blir bitlika) och spara den;
   - kör sedan `zonesOf(s).forEach((z, i) => prova({ x: z.x + z.w / 2, y: z.y + z.h / 2 }, c.varden[i]))`.
4. Handlarens last, gravarna och kvar-logiken räknas som förut, per anrop.

Varför det blir exakt: varje ändring av en hög går genom lager.ts changed() (addTo/takeProp, place, dropLoad), som ökar lagerV. Lagrets egen cache av summorna (summor) bygger redan på det, och inom ett anrop av rovarSteg är s.now densamma. Kontrollera med npm run samma -- --spara före ändringen och npm run samma efter.
DOM: håller=True spel=False dok=False bjorn=False
Varför: rovare.ts:690 räknar för varje zon i zonesOf(s) en slinga över alla s.stackar (grundvarde × n) i varje anrop av taPlats. taPlats anropas via malFor (rovare.ts:697) från radMal (rovare.ts:607-608, där malFor körs för varje fri rövare i fria.some) och från flockVal, alltså flera gånger per slag. Alla ändringar av högarna går genom lager.ts changed() (lager.ts:196, lagerV++, 36 anrop i src/sim). Det gäller också tidy, och addTo(s,k,-1) i rövarens taEn (rovare.ts:874). Det redskap rövaren tar ur s.ting ligger inte i s.stackar och påverkar inte zonvärdet. Lagrets egen cache (summor) bygger redan på samma antagande. Jag har inte mätt om de 44 % stämmer, men ordningen (27 zoner × 160 högar per anrop) är rimlig.
Rättad lösning: Som granskaren föreslår. I lager.ts: `export const lagerVersion = () => lagerV;`. I rovare.ts: `const platsVarde = new WeakMap<State, { t: number; v: number; z: Zone[]; varden: number[] }>();`. I taPlats ersätts zonslingan med följande:
- hämta c = platsVarde.get(s);
- om c saknas, eller c.t !== s.now, c.v !== lagerVersion() eller c.z !== zonesOf(s), räknas varden om med exakt samma slinga och ordning som i dag och sparas;
- sedan körs `zonesOf(s).forEach((z, i) => prova({ x: z.x + z.w / 2, y: z.y + z.h / 2 }, c.varden[i]))`.
Nyckeln måste innehålla s.now. Då räknas allt om varje slag, och det skyddar också mot en zon som byter storlek (z.w/z.h ändras utan att arrayen byts). Handlarens last och gravarna räknas som förut. Kör npm run samma -- --spara före ändringen och npm run samma efter.

### 2. [bugg] Inga kläder skyddar mot björnens klor (slaget riv)
Plats: src/sim/strid.ts:807 (traffa), src/sim/strid.ts:241-247 (Slag, SLAGEN), src/sim/klader.ts:46 (Skadeslag), klader.ts:67-117 (PLAGG skydd.tar), klader.ts:186 (kladSkyddStrid)
traffa minskar träffen med `g *= 1 - (sk.tar[sl] ?? 0)`. Plaggens skydd.tar har bara nycklarna hugg, stick, slag och bett, och klader.ts har en egen typ, Skadeslag, utan 'riv'.

Björnens ramar (VAPEN.bjornram, slag 'riv') river två träffar av tre: bettet kommer bara vart tredje slag, STRID.bjornBett 3, strid.ts:761. De träffarna går därför rakt igenom ringbrynjan (tar hugg 0,85), läderrustningen och rocken.

Dessutom sätts kl = c, så olyckshugget halveras (skyddHugg) som om plagget skyddade, fast det tog inget.
Bevis: `grep -n "riv" src/sim/klader.ts` ger ingen träff i någon tar-rad. klader.ts:46 lyder `type Skadeslag = 'hugg' | 'stick' | 'slag' | 'bett';`, medan strid.ts:241 lyder `type Slag = 'hugg' | 'stick' | 'slag' | 'bett' | 'riv';`.

Alla 66 plagg i SKYDD (utskrivna med ett mätskript) saknar nyckeln riv, så sk.tar['riv'] är undefined och skyddet blir 0. Designdokumentet (Kämpar ur ett register) säger att klor är ett naturligt vapen som andra; inget säger att kläder inte skyddar mot dem.
Lösning: Slå ihop typerna:
- Ta bort `type Skadeslag` i klader.ts och importera `Slag` från strid.ts. Eller flytta Slag till klader.ts och importera den i strid.ts, så att det inte blir en cirkel; strid.ts importerar redan klader.ts.
- Ge SLAGEN-raden riv fältet `skyddSom: 'hugg'`: klorna skär som ett hugg.
- I traffa (strid.ts:807): `const sls = SLAGEN[sl].skyddSom ?? sl; ... g *= 1 - (sk.tar[sls] ?? 0)`.
- Sätt kl bara när `(sk.tar[sls] ?? 0) > 0`.

Det här ändrar björnstriderna, så scenarierna bjornmote och bjornjakt prövas. Om klorna ska räknas som hugg eller få egna tal i PLAGG får Björn avgöra.
DOM: håller=True spel=True dok=False bjorn=True
Varför: strid.ts:241 lyder `type Slag = 'hugg'|'stick'|'slag'|'bett'|'riv'`. klader.ts:46 lyder `type Skadeslag = 'hugg'|'stick'|'slag'|'bett'`, utan riv. strid.ts:807 räknar `g *= 1 - (sk.tar[sl] ?? 0); kl = c;`, så med sl='riv' blir skyddet 0. Björnens ramar har slag 'riv' (strid.ts:231), och bettet kommer bara vart STRID.bjornBett:e slag (strid.ts:761). kl sätts ändå, så plagget räknas som om det skyddade (loggen 'tog' med kl, och olyckshugget).
Rättad lösning: Slå ihop typerna. Flytta `Slag` till klader.ts och exportera den (strid.ts importerar redan klader.ts), importera den i strid.ts och ta bort Skadeslag.
- Ge SLAGEN-raden riv fältet `skyddSom: 'hugg'`, och typen `skyddSom?: Slag`.
- I traffa: `const sls = SLAGEN[sl].skyddSom ?? sl;` och sedan `const t = sk.tar[sls] ?? 0; g *= 1 - t; if (t > 0) kl = c;`.
Om villkoret t > 0 också ska gälla de andra slagen är en egen rättning: ett plagg som bara skyddar mot slag räknas i dag som kl också när det träffas av ett hugg. Pröva scenarierna bjornmote, bjornjakt och strid. Om klorna ska skyddas som hugg eller få egna tal i PLAGG.skydd.tar får Björn avgöra.

### 3. [bugg] Rövarlägret delar aldrig ut järnhjälmen eller ringbrynjan: listan över skydd är skriven för hand
Plats: src/sim/lagervapen.ts:17-19 (LAGERSKYDD, SKYDD, arVapen)
LAGERSKYDD = [['rustning_lader'], ['hjalm_lader'], ['jarnskold', 'skold']] är skriven för hand, i stället för att frågas ur registret, vilket bryter mot regel 5.

Klädregistret har också jarnhjalm_jarn och ringbrynja_jarn (steg 12.2.9). En ringbrynja som lägret rånat ligger kvar i VarldRad.stulet: den delas aldrig ut av bevapna, och arVapen räknar den inte som ett skydd. Det går emot B.70: "varje rövare får vapen och skydd ur lägrets varor, det bästa först", och "vapen som rånats dyker upp i nästa anfall".

Den lokala konstanten SKYDD heter dessutom samma sak som registret SKYDD i strid.ts.
Bevis: Ett mätskript skrev ut LAGERSKYDD: [['rustning_lader'], ['hjalm_lader'], ['jarnskold', 'skold']]. Object.keys(SKYDD) i strid.ts har både 'jarnhjalm_jarn' och 'ringbrynja_jarn'.

Rövarna tar alla saker med SAKER[k].redskap (taEn, rovare.ts:870), och plaggen är redskap (klader.ts:203). En ringbrynja som ligger fritt kan alltså hamna i lägret.
Lösning: I lagervapen.ts, bygg listan ur registret, bästa skyddet först:

```ts
const skyddSumma = (k: string) => Object.values(SKYDD[k].tar).reduce((a, b) => a + (b ?? 0), 0);
export const LAGERSKYDD = ['yttre', 'huvud'].map(pl => Object.keys(SKYDD).filter(k => { const r = kladAv(k); return r && PLAGG[r.plagg].plats === pl && (PLAGG[r.plagg].tek === 'rustning' || PLAGG[r.plagg].tek === 'vapensmide'); }).sort((a, b) => skyddSumma(b) - skyddSumma(a)));
```

Lägg sedan till `['jarnskold', 'skold']`. Med det blir listan [['ringbrynja_jarn', 'rustning_lader'], ['jarnhjalm_jarn', 'hjalm_lader'], ['jarnskold', 'skold']].

Byt namn på den lokala `SKYDD` till `ALLA_SKYDD`. Scenariot lagervapen får en rad: ett läger med en rånad ringbrynja skickar en rövare som bär den.
DOM: håller=True spel=True dok=True bjorn=False
Varför: lagervapen.ts:17 lyder LAGERSKYDD = [['rustning_lader'],['hjalm_lader'],['jarnskold','skold']], och lagervapen.ts:18-19 SKYDD/arVapen bygger på den. En stulen ringbrynja_jarn eller jarnhjalm_jarn i VarldRad.stulet tas därför aldrig av tagSak i bevapna (rad 48), och lamnaVapen räknar dem inte (arVapen är falsk). Jag körde granskarens filter i ett mätskript. Det gav [["ringbrynja_jarn","rustning_lader"],["jarnhjalm_jarn","hjalm_lader"]], alltså rätt ordning, det bästa först. Det går emot B.70 (det bästa först, det rånade dyker upp igen).
Rättad lösning: I lagervapen.ts importeras SKYDD från strid.ts och PLAGG och kladAv från klader.ts. Sedan:
`const skyddSumma = (k: string) => Object.values(SKYDD[k].tar).reduce((a, b) => a + (b ?? 0), 0);`
`export const LAGERSKYDD: readonly (readonly string[])[] = [...['yttre', 'huvud'].map(pl => Object.keys(SKYDD).filter(k => { const r = kladAv(k); return !!r && PLAGG[r.plagg].plats === pl && (PLAGG[r.plagg].tek === 'rustning' || PLAGG[r.plagg].tek === 'vapensmide'); }).sort((a, b) => skyddSumma(b) - skyddSumma(a))), ['jarnskold', 'skold']];`
Byt namn på den lokala konstanten SKYDD till ALLA_SKYDD. Saker som inte finns i lägret och inte finns i gorSkydd delas inte ut (tagVara kräver att de finns i gorSkydd), så bara det rånade tillkommer. Scenariot lagervapen får en rad: ett läger med stulet {ringbrynja_jarn:1} skickar en rövare som bär den.

### 4. [bugg] Rollen vid rövarlarmet räknas ur NaN för barnen, och viljan räknas tre gånger
Plats: src/sim/rovare.ts:562 (LARMHOT.rovare.plus), roller.ts:43 (rollVid)
plus räknas som `motVilja(...) - rovarVilja(s, p)`, och motVilja är `rovarVilja - gavSigAvdrag - overmaktAvdrag`.

För den som är för ung, eller inte kan slåss, svarar rovarVilja -Infinity, och -Infinity − (−Infinity) blir NaN. rollVid räknar sedan `x = viljaKrok.vilja + plus = NaN`; båda jämförelserna blir falska och rollen blir 'gomd'. Det blir rätt bara av en slump.

rovarVilja, som går igenom living(s) varje gång, räknas tre gånger per rollval: en gång i rollVid och två gånger i plus.
Bevis: Ett mätskript skickade rövare till byn 1511-25 och skrev ut LARMHOT.rovare.plus(s, p) för alla. Alla åtta under ALDER.vaktFran fick NaN (Vileif den yngre 21,4 år, Hilorm 8,4, Siulf 2,6 och så vidare); de vuxna fick tal.
Lösning: I rovare.ts:562, skriv plus som `(s, p) => { const f = narmasteFlock(s, p); return -gavSigAvdrag(s, p) - overmaktAvdrag(p.larm?.rovare && vuxenKan(s, p) ? overmakt(s, ingenMer(s, f) ? f!.folk.length : p.larm.rovare.storlek ?? 1, f, kanMota(s, p, f)) : 1); }`.

För ändliga värden blir x exakt detsamma. För den som inte kan blir x −Infinity, som också ger 'gomd'. Rollerna blir alltså desamma (kontrollera med npm run samma); NaN försvinner och två anrop av rovarVilja per rollval sparas. motVilja används fortfarande i moterNu.
DOM: håller=True spel=False dok=False bjorn=False
Varför: rovarVilja (rovare.ts:524) svarar -Infinity när a < ALDER.vaktFran eller !vuxenKan. plus (rovare.ts:562) är motVilja(...) - rovarVilja = (-Inf - g - o) - (-Inf) = NaN. I roller.ts:31 blir x = -Inf + NaN = NaN, båda jämförelserna blir falska och rollen blir 'gomd' bara av en slump. Granskarens lösning är däremot inte bitlik: (v - g - o) - v är inte alltid lika med -g - o i flyttal (t.ex. (0.3-0.1)-0.3 = -0.09999999999999998). Ett värde precis vid en gräns kan alltså ge en annan roll.
Rättad lösning: Bitlikt är att låta plus börja med en spärr och lämna resten som det är:
`plus: (s, p) => { if (rovarVilja(s, p) === -Infinity) return -Infinity; const f = narmasteFlock(s, p); return motVilja(...) - rovarVilja(s, p); }`
Bättre, och utan ett extra anrop: `if (ageOf(p, s.now) < ALDER.vaktFran || !vuxenKan(s, p)) return -Infinity;` som första rad, samma villkor som rovarVilja:524. Då blir x = -Infinity och rollen 'gomd', och för alla andra är x exakt som förut. Granskarens förenkling (-gavSigAvdrag - overmaktAvdrag, som sparar två anrop av rovarVilja) går också, men den är inte bitlik och ska prövas med npm run samma. Godtas en annan utveckling, sparas nytt facit.

### 5. [sammanslagning] Vem som kan slåss står på fyra ställen
Plats: src/sim/rovare.ts:144 (vuxenKan), src/sim/varg.ts:569 (jaktBeslut), src/sim/bjorn.ts:115 (jaktBeslut), src/sim/val.ts:1700 (vakten)
Tre ställen skriver samma fem villkor för hand: `ageOf(q, s.now) >= ALDER.vaktFran && ageOf(q, s.now) < ALDER.vaktTill && !isSick(q, s.now) && halsa(q) >= KROPP.svag && kanGa(q)`.

vuxenKan i rovare.ts är samma villkor utan !isSick, och den används också av larmrollerna (viljaKrok.kan) och skyddas i varg.ts. En ändring av vem som kan slåss måste i dag göras på fyra ställen.
Bevis: `grep -rn "ALDER.vaktFran" src/sim` visar uttrycket ordagrant i varg.ts:569, bjorn.ts:115 och val.ts:1700, och som vuxenKan i rovare.ts:144.
Lösning: Flytta vuxenKan till roller.ts, som redan är platsen för vem som strider, hjälper eller gömmer sig, och lägg till `export const kanSlass = (s: State, p: Person) => vuxenKan(s, p) && !isSick(p, s.now)`.

Ersätt de fem första villkoren i varg.ts:569, bjorn.ts:115 och val.ts:1700 med `kanSlass(s, q)`. Resten av villkoren står kvar: strid, vargjakt, bjornjakt, falskt larm, harSpjut och vilaHellre.

rovare.ts importerar vuxenKan från roller.ts. viljaKrok.kan kan då vara vuxenKan direkt, i stället för en krok som sätts från rovare.ts. Funktionerna är rena, så ordningen spelar ingen roll och spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep ALDER.vaktFran visar samma fem villkor (ålder från/till, !isSick, halsa >= KROPP.svag, kanGa) i varg.ts:569, bjorn.ts:115 och val.ts:1700, där now = s.now enligt rad 1696. rovare.ts:144 vuxenKan har samma villkor utan !isSick. Att flytta vuxenKan till roller.ts ger däremot en importcirkel: halsa.ts importerar roller.ts, och roller.ts skulle behöva halsa och kanGa från halsa.ts. roller.ts har krokarna (viljaKrok) just för att slippa sådana importer.
Rättad lösning: Lägg funktionerna i halsa.ts, bredvid kanGa (halsa.ts:313), inte i roller.ts:
`export const vuxenKan = (s: State, p: Person) => { const a = ageOf(p, s.now); return a >= ALDER.vaktFran && a < ALDER.vaktTill && halsa(p) >= KROPP.svag && kanGa(p); };`
`export const kanSlass = (s: State, p: Person) => vuxenKan(s, p) && !isSick(p, s.now);`
Importera ageOf, ALDER, KROPP och isSick dit, om det inte ger en cirkel, och kontrollera med typkontrollen och ett körtest. rovare.ts importerar vuxenKan från halsa.ts och tar bort sin egen. I varg.ts:569, bjorn.ts:115 och val.ts:1700 ersätts de fem första villkoren med kanSlass(s, q); resten står kvar. viljaKrok.kan sätts som förut (rovare.ts:534). Funktionerna är rena, så spelet blir exakt detsamma.

### 6. [sammanslagning] Testet om någon är med i en strid finns två gånger, och vapnets kraft i hotet räknas med samma formel två gånger
Plats: src/sim/rovare.ts:670 (iStriden), src/sim/kartstrid.ts:84 (kartStridAv); src/sim/rovare.ts:540 (kraftMed), rovare.ts:923 (hotMot: kraft)
iStriden(_s, _f, p) är `kartStrider(s).some(g => !g.fri?.includes(p.id) && !g.st.slut && g.st.kampar.some(k => k.pid === p.id))`. Det är kartStridAv plus `!g.st.slut`, och parametern _f används inte.

En strid med st.slut tas bort i samma kartStridSteg (kartStridSlut, avslutad). Den finns alltså aldrig kvar när rovarSteg körs, så villkoret är alltid sant där.

I hotMot är `const kraft = (p) => 1 + ROVARE.hotVapen * vapenSkada(s, p)` samma sak som kraftMed(vapenSkada(s, p)) några rader upp.
Bevis: kartstrid.ts:84 lyder `export function kartStridAv(s, p) { return kartStrider(s).find(g => !g.fri?.includes(p.id) && g.st.kampar.some(k => k.pid === p.id)); }`. kartStridSteg (kartstrid.ts:270) anropar `if (st.slut) kartStridSlut(s, g)`, som tar bort striden (avslutad: s.kartStrider.filter). iStriden anropas bara från flockVal (rovare.ts:968 och 1009), alltså utanför kartStridSteg.
Lösning: Ta bort iStriden och ersätt dess två anrop med `!!kartStridAv(s, r)`; importera kartStridAv från kartstrid.ts, där kartStrider redan importeras. Ändra hotMot:s rad till `const kraft = (p: Person) => kraftMed(vapenSkada(s, p))`. Spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: rovare.ts:670 lyder `iStriden = (_s,_f,p) => kartStrider(_s).some(g => !g.fri?.includes(p.id) && !g.st.slut && g.st.kampar.some(...))`, och _f används inte. st.slut sätts bara i stridens tick (strid.ts:1055), inuti kartStridSteg-slingan (kartstrid.ts:234). Rad 269 anropar sedan kartStridSlut, som i båda grenarna slutar i avslutad och filtrerar bort striden ur s.kartStrider. Ingen avslutad strid finns alltså kvar när rovarSteg (rad 958 och 1012) körs. kartStridAv (kartstrid.ts:70) är samma test utan slut. I hotMot (rovare.ts:923) är kraft = 1 + ROVARE.hotVapen*vapenSkada, samma sak som kraftMed (rovare.ts:540).
Rättad lösning: Ta bort iStriden. Importera kartStridAv i den befintliga importen från './kartstrid' (rovare.ts:47) och skriv `!iStriden(s, f, r)` på rad 958 som `!kartStridAv(s, r)` och `iStriden(s, f, r)` på rad 1012 som `kartStridAv(s, r)`. I hotMot: `const kraft = (p: Person) => kraftMed(vapenSkada(s, p));`. Spelet blir exakt detsamma.

### 7. [dod] KAMPE_LIST läses inte av någon
Plats: src/sim/kampar.ts:41
`export const KAMPE_LIST = Object.keys(KAMPAR) as KampeSortId[];` exporteras, men ingen fil läser den.
Bevis: `grep -rwn KAMPE_LIST src test` ger bara definitionen på kampar.ts:41.
Lösning: Ta bort raden kampar.ts:41.
DOM: håller=True spel=False dok=False bjorn=False
Varför: `grep -rwn KAMPE_LIST src test` ger bara definitionen på kampar.ts:41. Ingen fil i sim, ui eller test läser den.
Rättad lösning: Ta bort raden kampar.ts:41 (`export const KAMPE_LIST = ...`). Om KampeSortId då inte används längre i filen står typen kvar ändå, eftersom den exporteras och används på andra ställen.

# DEL valet
## sammanfattning
Jag har granskat valet av aktivitet och arbetet (val.ts, steg.ts, odling.ts och anropen från behoven) med npm run kostnad, CPU-profiler och små mätskript i de sparade testbyarna. Mätskripten är borttagna; zz-filerna som ligger kvar i src/test/ är andra granskares.

Det största fyndet är ett fel. Den som fryser farligt och samtidigt måste på toa väljer om sin uppgift i varje slag (2 s). Toa-avbrottet i taskStep slår till, men valet ger kylan högre poäng och väljer samma vila igen. Det står för ungefär 37 % av all datortid i kostnad, och det är därför "aktivitet: vila" ligger överst. Det händer i två av de 24 testbyarna (4634-20 och 1511-25).

Två ändringar sparar dessutom datortid utan att ändra spelet. faltNu räknar fram en ny fältplats som den sedan kastar bort, och det är 5,7 % av datortiden. akel räknar sovplatsen var 30:e sekund för alla, fast det sällan ligger någon toahög inomhus, och det är 4,6 %.

Sist en sammanslagning: samma poänguttryck för mogen mat står tre gånger i ARBETEN, och valet av mjärde står två gånger.

Det jag gick igenom utan att hitta något:
- Inga oanvända lokala variabler: tsc med noUnusedLocals är grönt.
- De nya exporterna från fas 13 och 14 som bara läses i den egna filen är bara onödiga export, ingen död kod.
- Balanstalen jag kontrollerade i SKADEDJUR, TEKTAL och FORRADSMAL används.
- Raderna falt och faltArbete är inga dubbletter: falt gäller den mogna grödan på nivå 5 och faltArbete fortsatt arbete på nivå 6, som dokumentet säger.
- 15.1.4 (farliga behov avbryter) står obockat i Färdplanen men finns i koden. Toa-felet står inte där.
## siffror
npm run kostnad (24 byar i 120 minuter i spelet, ungefär 30 timmar i spelet per by): 17,3 ms datortid per minut i spelet och by, 49,7 s datortid totalt. aktivitet: vila 5,53 ms per minut och by (33,9 %, 41 813 anrop), behoven 1,43 (8,7 %), samla 0,90, tanda 0,60, samtalen 0,56, kartan 0,50, projektens brist 0,47, välja 0,46.
Samma körning utan 4634-20 och 1511-25 (22 byar): 11,8 ms per minut och by. Toa-loopen kostar alltså ungefär 37 % av den totala datortiden.
Uppgiftsbyten där en vila avbröts med mer än 1 s kvar på 120 minuter i spelet: 2 364 av slaget "Fryser farligt -> samma vila" med toan under 0,08. Av dem 1 645 i 4634-20 och 781 i 1511-25, och 2–11 per by i de andra. På 60 minuter i spelet var 809 av 1 682 uppgiftsbyten i alla byar den här loopen.
CPU-profil i de 22 byarna utan loopen: faltNu -> nyttFaltUppgift -> hittaSite 5,66 % av all tid; akel i needsStep 5,51 %, varav bedTile 4,56 %; valjTask totalt 22,9 %; vinnare 4,8 %; dag 3,5 %; stationBrist/nyBrist 3,0 % (kupBrist 1,9 %).

### 1. [bugg] Toa-avbrottet och valet motsäger varandra: den som fryser farligt väljer om varje slag
Plats: src/sim/steg.ts:891 (mustGo), src/sim/val.ts:1114 (nodVald sätts), src/sim/val.ts:703 (farligtBehov), src/sim/val.ts:761 och 771 (fryserFarligt mot toaGenast)
mustGo i taskStep avbryter uppgiften när p.toa < KROPP.toaAvbryt (0,08), oavsett hur uppgiften valdes. Det som valdes med ett farligt behov är skyddat av nodVald (steg 15.1.4), men toan har inget sådant skydd. Den som fryser farligt (fryserFarligt, VAL.nodKyla 1,5 gånger nodUnder) får högre poäng än toaGenast (VAL.nodToa 1,1 gånger nodUnder), så valet blir samma vila 'Fryser farligt och går in i huset' igen. Nästa slag (2 s) avbryter toan igen. Uppgiften börjar om i varje slag: ny vilotid på 20–60 min, en ny dragning ur strömmen 'val', fasen går tillbaka till 'go', och hela varmeSatt räknas om, med bedTile, boende och varmarePlagg. Personen ligger kvar i huset, så i spelet syns det knappt, men det är den största kostnaden i hela kostnadslistan.
Bevis: Mätskript på alla 24 facit-byar i 120 minuter i spelet. Jag räknade vilor som byttes ut med mer än 1 s kvar: 2 364 gånger 'Fryser farligt och går in i huset -> vila: Fryser farligt och går in i huset' med p.toa < KROPP.toaAvbryt, 1 645 i 4634-20 och 781 i 1511-25. I 4634-20 har person 11 (warm 0,229, toa 0,08) och person 13 (warm 0,000, toa 0,04) nodVald=true men byts ut i varje slag. Utan de två byarna sjunker kostnad från 17,3 till 11,8 ms per minut i spelet och by. I CPU-profilen med byarna går 13 % till varmeSatt under valjTask.
Lösning: Gör toan till ett av de farliga behoven som valet räknar med, i stället för en egen regel vid sidan av. Det blir en sammanslagning av toa-avbrottet och 15.1.4.
1) I val.ts: lägg till `export const farligaBehov = (p: Person) => (tortarFarligt(p) ? 1 : 0) | (p.hunger < KROPP.hungrig * VARDRATT.snal ? 2 : 0) | (p.warm < KROPP.farligt ? 4 : 0) | (p.toa < KROPP.toaAvbryt ? 8 : 0);` och låt farligtBehov vara `farligaBehov(p) & 7` så att andra anrop fungerar som förut.
2) I typer.ts Task: byt `nodVald?: true` mot `nod?: number`, behoven som var farliga när uppgiften valdes. I valjTask (val.ts:1114) skrivs `...(farligaBehov(p) ? { nod: farligaBehov(p) } : {})` i stället för nodVald.
3) I steg.ts:891: `const mustGo = t && farligaBehov(p) !== (t.nod ?? 0) && !ACTS[t.act].nodFri && a >= ALDER.smabarn;`. Uppgiften avbryts alltså när mängden farliga behov ändras: ett nytt blir farligt, eller ett som valet räknade med är inte längre farligt. Då väljer personen om med behoven i poängen. Den som fryser farligt och har låg toa väljer en gång. Blir hen varm, avbryts vilan och toaGenast vinner.
4) Ingen migrate behövs: en sparad uppgift utan nod läses som 0, och en gammal nodVald avbryts en gång och väljs om.
Scenario: den som fryser farligt med toa 0,05 i ett hus väljer högst ett par gånger på 10 minuter i spelet, och går på toa när värmen kommit över KROPP.farligt.
DOM: håller=True spel=True dok=False bjorn=False
Varför: steg.ts:891: mustGo = t && (p.toa < KROPP.toaAvbryt || !t.nodVald && farligtBehov(p)). Toa-delen saknar nodVald-skyddet. Poängen (val.ts:722, 761, 771): fryserFarligt = 1,5 × (2 − warm/0,25), alltså 1,5–3,0. toaGenast = 1,1 × (2 − toa/0,12), högst 2,2. Vid warm 0 och toa 0,04 blir det 3,0 mot 1,83, så samma vila väljs igen. Mitt mätskript (120 minuter i spelet, nastaSteg som i kostnad.ts) räknade hur ofta p.task byttes medan toa < toaAvbryt. 4634-20: 1 621 byten, alla med warm < KROPP.farligt. 1511-25: 1 033, alla med warm under gränsen. 1-20: 0. Loopen finns alltså. Granskarens lösning stämmer inte helt. Han vill avbryta så fort mängden farliga behov ändras, även när den krymper till noll. Då avbryts maten i samma stund som hungern inte längre är farlig, och värmen i samma stund som personen inte längre fryser farligt. Det ändrar spelet i onödan och kan ge nya avbrott. Dessutom kollar vantar (steg.ts:666) bara toan och inte farligtBehov, så den står-still-vägen skulle följa en annan regel än mustGo. Steg 15.1.4 i Färdplanen är inte avbockat, men det beskriver avbrotten och inte den här loopen. Där står att toan redan avbryter och att den som avbryter väljer om med behovet i poängen. Koden gör det, men toan har inget skydd och loopar därför. Det är ett fel i bygget, inte att koden går emot dokumentet.
Rättad lösning: Toan blir ett av de farliga behoven, med samma skydd som de andra. Det slår ihop toa-avbrottet med 15.1.4.
1) val.ts:729: `export const farligaBehov = (p: Person) => (tortarFarligt(p) ? 1 : 0) | (p.hunger < KROPP.hungrig * VARDRATT.snal ? 2 : 0) | (p.warm < KROPP.farligt ? 4 : 0) | (p.toa < KROPP.toaAvbryt ? 8 : 0);` och `export const farligtBehov = (p: Person) => (farligaBehov(p) & 7) !== 0;` så att andra anrop fungerar som förut.
2) typer.ts:196: byt `nodVald?: true` mot `nod?: number`, alltså de farliga behoven när uppgiften valdes. val.ts:1114: byt `...(farligtBehov(p) ? { nodVald: true as const } : {})` mot `...(farligaBehov(p) ? { nod: farligaBehov(p) } : {})`.
3) I steg.ts, en funktion för både taskStep och vantar: `const nodAvbryter = (p: Person, t: Task, a: number) => { const nu = farligaBehov(p); return nu !== 0 && nu !== (t.nod ?? 0) && !ACTS[t.act].nodFri && a >= ALDER.smabarn; };`. Rad 891 blir `const mustGo = t && nodAvbryter(p, t, a);`. Uppgiften avbryts alltså när ett nytt behov blir farligt, eller när ett av flera farliga behov är löst och ett annat finns kvar. Den som fryser och behöver gå på toa avbryter när hen blivit varm, och då vinner toaGenast. Inget avbrott sker när alla farliga behov är lösta (nu = 0), så maten och värmen får ta slut som de började.
4) vantar (steg.ts:666): byt `p.toa >= KROPP.toaAvbryt` mot `!nodAvbryter(p, tk, ageOf(p, now))`, eller skicka med a. Då räknas den som står still på samma sätt som den som går.
5) Scenariot fas15.ts:80 sätter `c.p.task!.nodVald = true` och skrivs om till `c.p.task!.nod = 1` (farlig törst).
6) Ingen migrate behövs. En sparad uppgift utan nod läses som 0. En gammal nodVald avbryts en gång om något behov är farligt, och väljs sedan om.
Nytt scenario: den som fryser farligt (warm 0,05) med toa 0,05 i ett hus byter uppgift högst två gånger på 10 minuter i spelet, och går på toa inom en timme efter att warm gått över KROPP.farligt. Kör npm run likhet, eftersom arbetet ändras.

### 2. [optimering] faltNu räknar fram en ny fältplats som den alltid kastar bort
Plats: src/sim/odling.ts:422-433 (faltUppgift), 472-478 (faltNu); anropas från src/sim/val.ts:879 (falt), 951-952 (faltArbete)
faltNu anropar faltUppgift. Har familjen inget fält går faltUppgift vidare till nyttFaltUppgift, nyttFalt, faltSite och hittaSite, som söker genom hela rektangeln runt byns område efter en plats. Den uppgiften har ingen ref, och faltNu returnerar då `undefined` direkt (`if (!u || u.ref === undefined) return undefined`). Sökningen är alltså bortkastad. Raden falt frågar varje vuxen i varje val på dagen, och faltArbete frågar två gånger (poang och prova). faltSite har bara plats för ett svar i taget i sin cache. Nyckeln innehåller w och n, och nyttFalt prövar flera bredder och personerna har olika storlek, så svaren tränger ut varandra och sökningen görs nästan varje gång.
Bevis: CPU-profil i 22 facit-byar i 120 minuter i spelet, utan loop-byarna: nyttFaltUppgift 5,59 % av all tid via 'faltUppgift < faltNu', och hittaSite 5,37 % via 'faltSite < nyttFalt < nyttFaltUppgift < faltUppgift' (bara 0,22 % via faltTillUppgift). Grep: faltNu är det enda som läser faltUppgift i val.ts. projekt.ts:372-373 och scenarierna fas9, byggnader och natur behöver hela faltUppgift med den nya fältplatsen.
Lösning: I odling.ts: flytta grenen med familjens fält ur faltUppgift till en egen funktion, `function faltArbete(s: State, p: Person): FaltUppgift | undefined { if (!isLight(s.now) || !kanOdla(s, p)) return undefined; const fs = familjensFalt(s, p); if (!fs.length) return undefined; const b = bastaRuta(s, p, fs); if (!b) return undefined; const st = rutorAv(b.f)[b.k].st; return { tool: st, text: ..., min: ODLING.pass, spot: rutaMitt(b.f, b.k), ref: b.f.id, ruta: b.k }; }`. Låt faltUppgift bli `faltArbete(s, p) ?? (familjensFalt(s, p).length || familjFalt(s, p) ? undefined : nyttFaltUppgift(s, p))`, så att den ger exakt samma svar som förut. I faltNu: byt `faltUppgift(s, p)` mot `faltArbete(s, p)` och ta bort `|| u.ref === undefined`, för faltArbete har alltid ref. faltNu ger då samma svar utan sökningen. Ingen slump och inget sparat ändras. Kontrollera med npm run samma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: odling.ts:422-433: faltUppgift går vidare till nyttFaltUppgift när familjensFalt är tom. Den uppgiften har ingen ref (rad 437), och faltNu (rad 473-474) returnerar då undefined direkt. faltSite och hittaSite (rad 355-361) är rena cacher utan slump. Det enda de ändrar är siteCache, och dess svar bestäms helt av nyckeln. Att hoppa över dem ger därför exakt samma spel. Grep: faltNu anropas från val.ts:879, 951 och 952 och från scenariot fas13.ts:1304/1308. faltUppgift behövs i sin helhet i projekt.ts:372-373, faltTillUppgift och scenarierna fas9, byggnader och natur. Granskarens omskrivning av faltUppgift har ett fel: `faltArbete(s,p) ?? (...nyttFaltUppgift)` hoppar förbi kollen av isLight och kanOdla. Vid mörker eller när personen inte kan odla skulle den gå vidare till nyttFaltUppgift och ge ett annat svar än i dag. Funktionsnamnet faltArbete krockar också med ARBETEN-raden 'faltArbete' i val.ts:951.
Rättad lösning: I odling.ts: flytta grenen med familjens fält till en egen funktion `function rutaUppgift(s: State, p: Person, fs: Falt[]): FaltUppgift | undefined { const b = bastaRuta(s, p, fs); if (!b) return undefined; const st = rutorAv(b.f)[b.k].st; return { tool: st, text: `${(FALT_STEG[st] as { gor?: string }).gor}.`, min: ODLING.pass, spot: rutaMitt(b.f, b.k), ref: b.f.id, ruta: b.k }; }`.
faltUppgift blir: `if (!isLight(s.now) || !kanOdla(s, p)) return undefined; const fs = familjensFalt(s, p); if (fs.length) return rutaUppgift(s, p, fs); if (familjFalt(s, p)) return undefined; return nyttFaltUppgift(s, p);`. Det är samma svar som i dag.
faltNu börjar med: `if (!isLight(s.now) || !kanOdla(s, p)) return undefined; const fs = familjensFalt(s, p); if (!fs.length) return undefined; const u = rutaUppgift(s, p, fs); if (!u) return undefined;`. Resten är som förut (mogen, ägarkollen). `u.ref === undefined` behövs inte längre, för rutaUppgift har alltid en ref.
Ingen slump och inget sparat ändras. Kontrollera med npm run samma (spara först på koden före ändringen).

### 3. [optimering] akel räknar sovplatsen (bedTile och boende) var 30:e sekund för alla, fast ingen toahög ligger inne
Plats: src/sim/smuts.ts:187-201 (akel, toaIRum); anropas från src/sim/steg.ts:798 (needsStep i TAKTER-raden behoven)
akel räknar `b = bedTile(s, p)` och `roomAt` för sovplatsen för varje person i varje anrop till behoven. Det görs innan toaIRum har kontrollerat om det alls finns en toahög över SMUTS.akel inne i något rum. bedTile anropar boende(s), och dess cache har s.now i nyckeln. Därför byggs hela boendet om vid varje anrop till behoven. Svaret används bara när en toahög ligger inne, vilket är sällan.
Bevis: CPU-profil i 22 facit-byar i 120 minuter i spelet: akel 5,51 % av all tid, varav bedTile 4,56 %. boende anropas till 3,51 % via 'bedTile < akel < needsStep'. behoven är den dyraste raden i kostnad utan loop-byarna (1,30 ms per minut och by, 11,9 %), och akel är 5,5 av needsSteps 7,9 %.
Lösning: I smuts.ts akel: räkna först `const inne = flackarOf(s).filter(f => f.k === 'toa' && flackNu(f, s.now) > SMUTS.akel);` och `return` om listan är tom, innan `har`, `b` och `sov` räknas. Låt toaIRum ta listan `inne` i stället för att filtrera flackarOf själv. bedTile, sjukBadd och boende ändrar inget i byn, så resultatet blir exakt detsamma. Det är äldre kod (steg 11.1.73) men den dyraste delen av raden behoven. Kontrollera med npm run samma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: smuts.ts:197-198: har, b = bedTile(s, p) och sov räknas för varje vaken person innan toaIRum (rad 201-204) har kollat om det alls ligger en toahög över SMUTS.akel. bedTile (byggnader.ts:481) anropar sjukBadd och boende. boende (byggnader.ts:324-327) har s.now i cachenyckeln och byggs därför om i varje slag. bedTile, sjukBadd, boende och roomAt läser bara byn och sätter inget i den, utom sina egna cacher, vars svar bestäms helt av nyckeln. När listan med högar inne är tom ger toaIRum false, och ingen tanke läggs till. Resultatet blir alltså exakt detsamma. Det är kod från steg 11.1.73, men den körs i raden behoven i TAKTER.
Rättad lösning: I smuts.ts akel: efter raden med akelSmuts, lägg till `const inne = flackarOf(s).filter(f => f.k === 'toa' && flackNu(f, s.now) > SMUTS.akel); if (!inne.length) return;`. Räkna har, b och sov först efter den raden. Ändra toaIRum till `function toaIRum(inne: Flack[], rum: (ReturnType<typeof roomAt>)[]) { for (const f of inne) for (const r of rum) if (r && r.tiles.includes(f.i)) return true; return false; }` och anropa den med `toaIRum(inne, [har, sov])`. Ingen slump och inget sparat ändras. Kontrollera med npm run samma.

### 4. [sammanslagning] Poängen för mogen mat står tre gånger, och valet av mjärde två gånger
Plats: src/sim/val.ts:948 (skatta), 949 (mjolka), 958 (vittjaMat), 906-913 (vittja), 1060 (mjardeAttTa)
Uttrycket `VAL.mognaVikt + Math.max(d.wBy, d.wEgen) * d.rad.mat.sc` står tre gånger: i skatta och mjolka (då med en extra omedelbart anropad funktion `(() => { const d = dag(c); ... })()`) och i vittjaMat. Raden vittja (nivå 5) skriver dessutom om mjardeAttTa i sin helhet (kanVittja, filtret att ingen annan redan vittjar och sorteringen efter avstånd), med snartFull som enda tillägg. Ändras vikten för mogen mat eller vem som tar mjärden, måste det göras på flera ställen.
Bevis: Grep `VAL.mognaVikt + ` i val.ts ger raderna 948, 949 och 958. Grep `o.task?.act === 'vittja' && o.task.ref === q.id` ger val.ts:909 och 1060.
Lösning: I val.ts: lägg till `const mognaMat = (c: Ctx) => { const d = dag(c); return VAL.mognaVikt + Math.max(d.wBy, d.wEgen) * d.rad.mat.sc; };` och använd den i skatta (`dag(c).works && skattaVal(c.s, c.p) ? mognaMat(c) : 0`), i mjolka och i vittjaMat. Ändra `mjardeAttTa` till `(s: State, p: Person, ok: (m: Mjarde) => boolean = () => true) => kanVittja(s).filter(q => ok(q) && !living(s).some(...)).sort(...)[0]` och låt vittja anropa `mjardeAttTa(s, p, q => snartFull(s, q))`. Ordningen på villkoren i filtret blir densamma (först snartFull, sedan andra), ingen slump finns där, och spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: Grep: uttrycket `VAL.mognaVikt + ... Math.max(d.wBy, d.wEgen) * d.rad.mat.sc` står i val.ts:948 (skatta), 949 (mjolka) och 958 (vittjaMat). ortPlocka (rad 947) använder bara VAL.mognaVikt och ska inte ändras. Filtret `o.task?.act === 'vittja' && o.task.ref === q.id` och sorteringen efter avstånd står både i vittja (val.ts:909) och i mjardeAttTa (val.ts:1060). Det enda vittja har utöver det är snartFull. Det finns ingen slump i någon av dem. Med `ok(q) && !living(s).some(...)` kontrolleras villkoren i samma ordning som i dag, och sorteringen blir densamma. Steg 15.1.146 (klippa) har en annan formel och krockar inte med sammanslagningen.
Rättad lösning: I val.ts, före ARBETEN: `const mognaMat = (c: Ctx) => { const d = dag(c); return VAL.mognaVikt + Math.max(d.wBy, d.wEgen) * d.rad.mat.sc; };`.
skatta: `poang: c => dag(c).works && skattaVal(c.s, c.p) ? mognaMat(c) : 0`. mjolka: `poang: c => dag(c).works && mjolkaVal(c.s, c.p) ? mognaMat(c) : 0`. vittjaMat: `poang: c => c.a < ALDER.vuxen || !dag(c).works || !mjardeAttTa(c.s, c.p) ? 0 : mognaMat(c)`.
mjardeAttTa (rad 1060) blir `const mjardeAttTa = (s: State, p: Person, ok: (m: Mjarde) => boolean = () => true) => kanVittja(s).filter(q => ok(q) && !living(s).some(o => o !== p && o.task?.act === 'vittja' && o.task.ref === q.id)).sort((x, y) => Math.hypot(x.x - p.x, x.y - p.y) - Math.hypot(y.x - p.x, y.y - p.y))[0];`. Flytta den, och snartFull, så att de står före ARBETEN, eller låt dem vara kvar, eftersom de bara anropas när valet körs. I vittja (rad 909): `const m = mjardeAttTa(s, p, q => snartFull(s, q));`. Spelet blir exakt detsamma. Kontrollera med npm run samma.

# DEL byn
## sammanfattning
Jag har gått igenom byggnaderna, världen och samhället i fas 13–14 (de 27 filerna i min del) och mätt i de sparade testbyarna. Det blev sex fynd som håller.

Två ändrar spelet. Det första är att sjuka som smittar aldrig läggs i rummets ena ände (steg 13.10.19). Det andra är att vakarna i isen aldrig fryser igen, som dokumentet för steg 13.1.15 säger att de ska. Ett fynd är ren optimering med exakt samma spel: varmarePlagg räknar hela dangers() i onödan, och det tar ungefär 5,4 % av all datortid. Sedan finns två döda funktioner, och BILDSTEN-talen står utanför balans() (regel 8).

Bärselen (steg 13.2.3) används aldrig i någon testby (iSelen = 0, och ingen sele är gjord). Orsaken ligger inte i barsele.ts: ingen av byarna 1, 1511 och 4634 kan skinnkläder efter 40–45 dygn (40–45 år i spelet, sex veckor i verkligheten). Steg 12.1.229 och 9.9.5 i Färdplanen nämner redan att skinnkläderna saknas, så jag tar inte upp det som fynd. Men bärselen och barnkläderna står och väntar på den tekniken.

Jag prövade också om stölder ur gravar försvinner när tjuven själv besöker graven. Under fyra dygn (fyra år i spelet) i byarna 1511 och 4634 från dygn 40 hände det inte en enda gång, så det är inte med. Alla nya fält i fas 13–14 i typer.ts är valfria, och migrate rad 69 tar hand om hantverkets färdigheter, så jag hittade inget sparfält utan migrate. Jag gick också igenom upplevelserna som trons skalor flyttas av (SKALOR.flyttas): alla 26 finns i UPPLEVELSER, så där finns inga döda rader. Mätskripten är borttagna; zz_myr.ts i src/test är en annan hjälpares fil.
## siffror
npm run kostnad (24 byar i 120 minuter i spelet, ungefär 30 dygn i spelet): 16,3 ms per minut i spelet och by, 46,9 s datortid. Den största raden var aktivitet: vila med 33,3 %. Mätt med CPU-profil (kostnad 60): varmeSatt tar 13,9 % av all tid; varmarePlagg 6,0 %, och av det är 5,4 % dangers() via farorNu (foodDays 4,0 %, matSomHaller 3,4 %, eldReserv 0,9 %).

Räknare i s.stat på dygn 40 (1-40), 45 (1511-45) och 45 (4634-45), i den ordningen:
- iSelen: 0 / 0 / 0
- sedTalad: 6422 / 19131 / 13165
- skalaFlytt: 15 / 14 / 0
- gravstold: 2 / 62 / 64 (märkta 1 / 16 / 21)
- gravgods_ruttet: 55 / 82 / 8
- gravgods_agarlost: 0 / 0 / 0
- planerad_hylla: 0 / 0 / 0
- fargat: 0 / 0 / 0
- stenVagg: 0 / 0 / 0
- utvisad: 0 / 0 / 0
- tillLager: 0 / 0 / 0
- lagerAvBybor: 0 / 0 / 1
- slyRojt: 8 / 33 / 1
- husKopt: 0 / 5 / 2

Vakar i isen: 1-30 har 2 vakar (sjön 33,8 cm, minsta skillnad mot sjön 0,47 cm) och 1511-30 har 23 vakar (sjön 28,5 cm, vakarna 8,5–19 cm, minsta skillnad 3,9 cm).

Egna bäddar: i 1-30, 4634-25, 1-40 och 1511-45 sover alla i en bädd de äger; i 1511-30 gör 9 av 13 det.

### 1. [optimering] varmarePlagg räknar hela dangers() i onödan, varje gång någon som fryser väljer
Plats: src/sim/utrustning.ts:354 (anropas från src/sim/varme.ts:88, raden plagg i VARMA; farorNu i src/sim/kultlatt.ts:65 är dangers i src/sim/val.ts:464)
varmeSatt anropas för varje person som fryser när hen väljer (val.ts:600). Raden plagg anropar då varmarePlagg, som först av allt räknar farorNu(s).kyla, alltså hela dangers(s): foodDays (matSomHaller över hela förrådet), eldReserv och en loop över alla. Kylan behövs bara som argumentet nod till heligtAvstar, och det läses bara när plagget är av ett heligt djurs skinn (heligtFor). Nästan alla anrop räknar alltså förrådets mat för ingenting.
Bevis: CPU-profil av npm run kostnad (60 minuter, 24 byar): varmeSatt tar 13,9 % av all tid och varmarePlagg 6,03 %, av vilket dangers står för 5,38 % (foodDays 3,99 %, matSomHaller 3,35 %, eldReserv 0,91 %). Nästan alla anrop till dangers i hela körningen kommer den vägen (5,43 % via kultlatt, 0,15 % via leisure). dangers drar inget slumptal och ändrar inget.
Lösning: I utrustning.ts varmarePlagg: ta bort `kyla = farorNu(s).kyla` ur raden 354. Ersätt `heligtAvstar(s, p, kladArt(t.k), kyla)` i villkoret på rad 357 med `heligtAvstarSent(s, p, kladArt(t.k))`, där kylan räknas först när det behövs: `(heligtFor(s, p, art) && !farorNu(s).kyla)`. Det är samma uttryck som heligtAvstar (`!nod && heligtFor(...)`) i omvänd ordning: importera heligtFor från kultlatt.ts och skriv villkoret inline. Spelet blir exakt detsamma, eftersom dangers är ren. Samma ordning kan användas i stepKlader (rad 296), men den körs en gång i timmen och kostar inget att tala om. Kontrollera med npm run samma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: utrustning.ts:354 räknar `kyla = farorNu(s).kyla` först i varmarePlagg, och kyla läses bara i heligtAvstar på rad 357. heligtAvstar (kultlatt.ts:81) är `!nod && heligtFor(s,p,art)`. farorNu (kultlatt.ts:65) är dangers (val.ts:464, satt med satFaror). dangers räknar foodDays (ekonomi.ts:65, matSomHaller över förrådet), eldReserv (forradsmal.ts:98) och nagonGlod, och en filter över alla levande. Ingen av dem drar slumptal eller skriver i State. Raden plagg i VARMA (varme.ts:88) anropar varmarePlagg varje gång någon som fryser väljer. Jag har inte kört om profilen. Resonemanget i koden räcker för att visa att arbetet är onödigt.
Rättad lösning: I src/sim/utrustning.ts varmarePlagg: ändra rad 354 till `const pa = paSig(s, p), ut = new Map<string, { t: Ting; nu?: Ting }>();`, alltså utan kyla. I villkoret på rad 357 byter du `heligtAvstar(s, p, kladArt(t.k), kyla)` mot `(heligtFor(s, p, kladArt(t.k)) && !farorNu(s).kyla)`. Lägg till heligtFor i importen från './kultlatt' på rad 31. Om heligtAvstar då inte används i utrustning.ts tar du bort den ur importen (kontrollera med grep). Spelet blir exakt detsamma, eftersom dangers är ren. Kontrollera med `npm run samma` (spara först med `--spara` på koden före ändringen).

### 2. [bugg] sjukaISinAnde flyttar aldrig en sjuk: den sjukas bädd räknas som fast
Plats: src/sim/byggnader.ts:383 (boende), funktionen sjukaISinAnde på byggnader.ts:449–462, sjukKrok.vill i src/sim/mobler.ts:204
Steg 13.10.19 lägger de som smittar i rummets ena ände, och bara egna bäddar, sjukstugans bäddar och de minsta barnens platser ska stå fast. boende skickar ändå `new Set([...agd.keys(), ...sjuka.map(x => plats.get(x.q.id)!)])` som fasta. sjuka är alla med sjukKrok.vill, och villSjukbadd är sant för var och en som är sjuk, eftersom STATION.sjukSmitta = 6 är större än sjukVinst = 3. Den sjukas egen bädd hamnar därför alltid bland de fasta, också när ingen sjukstuga finns. Då räknas den sjuka aldrig in i rummet (r blir undefined), `folk.some(smittar)` blir falskt och ingen byter plats. Systemet gör ingenting.
Bevis: Mätskript på 1511-30, rum 22, där tre sover i bäddar ingen äger (Ulvlaug 32761, Vileif den yngre 33001, Silaug 33241). Silaug fick förkylning (st satt) och alla fick kunskapen Smittan. Som koden ser ut ligger Silaug kvar på 33241. Med sjukKrok.vill tillfälligt satt till () => false (så att sjuka bara blir de fasta egna bäddarna) flyttar Silaug till 32761 i rummets ände, och de friska flyttar ett steg.
Lösning: I byggnader.ts boende: samla sjukstugans bäddar som faktiskt delats ut i en mängd, `const stugBadd = new Set<number>()`, före `if (sjuka.length)`. I loopen `for (const [n, { q }] of sjuka.entries())` gör `plats.set(q.id, sjukbaddar[n]); stugBadd.add(sjukbaddar[n]);`. Byt rad 383 till `sjukaISinAnde(s, ppl, plats, new Set([...agd.keys(), ...stugBadd]));`. Det ger det som kommentaren på rad 447–448 säger. Det ändrar var de sjuka sover när byn kan Smittan och de sover i bäddar ingen äger. Effekten blir liten så länge nästan alla äger sin bädd: i 4 av 5 sparade byar äger alla sin bädd.
DOM: håller=True spel=True dok=True bjorn=False
Varför: I byggnader.ts:357 är sjuka alla för vilka sjukKrok.vill är sant. Det är villSjukbadd (mobler.ts:204): sjukBehov > STATION.sjukVinst = 3. isSick ger + STATION.sjukSmitta = 6 (stationer.ts:135), så den som är sjuk med tecken kommer alltid med. smittar (byggnader.ts:443) kräver sjuk.st !== undefined. st sätts först när tecknen syns (sjukdom.ts:229 och 247), så alla som smittar finns bland sjuka. När fordela har körts har varje sjuk en plats: en bädd i sjukstugan, eller annars den egna eller en fri bädd. Rad 383 lägger därför in varje sjuks plats bland de fasta. I sjukaISinAnde (rad 449–462) blir r undefined för alla som smittar. Då blir `folk.some(smittar)` falskt i varje rum, och ingen byter plats. Systemet gör alltså ingenting, mot det steg 13.10.19 och kommentaren på rad 447–448 säger: bara egna bäddar, sjukstugans bäddar och de minsta barnen står fast.
Rättad lösning: I src/sim/byggnader.ts boende: lägg `const stugBadd = new Set<number>();` före `if (sjuka.length) {` (rad 360). I loopen på rad 362 ändrar du `plats.set(q.id, sjukbaddar[n]);` till `{ plats.set(q.id, sjukbaddar[n]); stugBadd.add(sjukbaddar[n]); }` och behåller `if (n >= sjukbaddar.length) break;` före. Byt rad 383 mot `sjukaISinAnde(s, ppl, plats, new Set([...agd.keys(), ...stugBadd]));`. Ändringen syns bara när någon kan Smittan och en sjuk sover i en bädd som ingen äger. Kör scenariot för 13.10.19 (sjukdom/smitta) och `npm run likhet`.

### 3. [dokument] Vakarna fryser aldrig igen: villkoret v.cm < m.cm slår aldrig till
Plats: src/sim/is.ts:89 (isSteg), isCmVid is.ts:30–34
Steg 13.1.15 säger att vaken är borta när den frusit lika tjock som sjön eller när isen går upp. Koden växer sjön och vaken med samma formel, cm + k/(bas+cm), räknar `v.cm = Math.min(m.cm, andra(v.cm))` och tar bort vaken när den inte längre är tunnare än sjön. f(c) = c + k/(bas+c) växer i c för all is tjockare än ungefär en centimeter, så en tunnare vak kommer aldrig ikapp: skillnaden krymper men blir aldrig noll. När isen smälter dras lika mycket från båda. Vakarna försvinner alltså först när hela sjöns is gått upp, och listan växer under vintern.
Bevis: Sparade byar: 1511-30 har 23 vakar mitt i vintern (sjön 28,5 cm, vakarna 8,5–19 cm), och 1-30 har 2 vakar som ligger 0,47 och 6,2 cm under sjöns 33,8 cm. Med formeln (k = 6 per timme, bas = 2), sjön på 20 cm och en ny vak på 0 cm är skillnaden 5,6 cm efter 120 timmar och 2,7 cm efter 600 timmar (25 dygn, 25 år i spelet). Den blir aldrig 0.
Lösning: Lägg till ett balanstal i IS (is.ts): `vakIgen: 1`, med kommentaren att en vak som är högst så här många cm tunnare än sjön har frusit igen. I raden 89 byt `m.vakar.filter(v => v.cm < m.cm)` mot `m.vakar.filter(v => v.cm < m.cm - IS.vakIgen)`. Vakarna försvinner då under vintern, som dokumentet säger. Det ändrar spelet lite (en vak som nästan frusit räknas som sjön). Scenariot vak ska fortfarande gå igenom; kör npm run likhet.
DOM: håller=True spel=True dok=True bjorn=False
Varför: Steg 13.1.15 i Färdplanen säger: 'vaken är borta när den frusit lika tjock som sjön eller när isen går upp'. is.ts:89 räknar sjön och vakarna med samma andra(cm) = cm + a/(bas+cm), där a = vaxer·köld·h. Skillnaden blir f(c1)−f(c2) = (c1−c2)·(1 − a/((bas+c1)(bas+c2))). Den krymper med en faktor under 1 varje timme men blir aldrig noll, så `v.cm < m.cm` är alltid sant så länge isen växer. Smältningen drar lika mycket från båda. Vakarna försvinner alltså först när m.cm ≤ 0 (rad 91). Mätt i de sparade byarna: 1511-30 har sjön på 28,5 cm och 23 vakar (9,0–19,1 cm). 1-30 har sjön på 33,8 cm och vakar på 27,6 och 33,3 cm. Alla andra sparade byar är utan is.
Rättad lösning: I src/sim/is.ts lägger du till i IS (balans('is', …)): `vakIgen: 1, // en vak som är högst så här många cm tunnare än sjön har frusit igen (steg 13.1.15)`. På rad 89 byter du `m.vakar.filter(v => v.cm < m.cm)` mot `m.vakar.filter(v => v.cm < m.cm - IS.vakIgen)`. Det beskriver hur isen är (en vak som frusit nästan lika tjock är sjön), så det är en grundregel och ingen gaffatejp. Kör scenariot vak och `npm run likhet`.

### 4. [dod] historikKolumner anropas inte: dess uppgradering finns inte längre
Plats: src/sim/historik.ts:143–148
Kommentaren säger att funktionen anropas vid inläsningen (uppgradering 24 i varld.ts), men UPPGRADERINGAR börjar nu senare (ALDSTA_SPARNING, steg 12.1.71) och ingen rad anropar den. Timmen gör redan samma omordning (historik.ts:96 anropar omordna när registret ändrats), så ingen nytta går förlorad.
Bevis: grep -rnw historikKolumner src ger bara definitionen på historik.ts:145. git log -S'historikKolumner' visar att anropet togs bort i a98426db (steg 12.1.71).
Lösning: Ta bort historikKolumner och dess två kommentarsrader i historik.ts (rad 143–148). omordna blir kvar, eftersom tick på rad 96 läser den.
DOM: håller=True spel=False dok=False bjorn=False
Varför: `grep -rn historikKolumner` över hela repot (src, test, ui, skript) ger bara definitionen på historik.ts:145. omordna anropas fortfarande från timmen på historik.ts:96, med samma villkor som historikKolumner har på rad 147. Den nytta funktionen gav finns alltså kvar.
Rättad lösning: Ta bort raderna 143–148 i src/sim/historik.ts: de två kommentarsraderna ('när byn läses in (uppgradering 24 …' och 'redan före nästa timme') och funktionen historikKolumner. omordna (rad 150) och anropet på rad 96 blir kvar. Om State eller HISTORIK_TAL då blir oanvända i filen syns det i typkontrollen. Båda används på andra ställen i filen.

### 5. [dod] fargMin exporteras men läses aldrig
Plats: src/sim/farg.ts:148
`export const fargMin = () => FARG.min * MIN;` lades till i steg 13.3.2. Ingen läser den: valet (val.ts:674) och badVarde (farg.ts:68) läser FARG.min direkt.
Bevis: grep -rnw fargMin src ger bara definitionen på farg.ts:148.
Lösning: Ta bort rad 148 i farg.ts. Om MIN då inte längre används i farg.ts, ta bort den ur importen från ./typer på rad 10 (kontrollera med grep).
DOM: håller=True spel=False dok=False bjorn=False
Varför: `grep -rnw fargMin` över hela repot ger bara definitionen på farg.ts:148. MIN används i farg.ts bara i importen på rad 11 och på rad 148.
Rättad lösning: Ta bort rad 148 i src/sim/farg.ts (`export const fargMin = () => FARG.min * MIN;`). Ändra importen på rad 11 till `import { Person, State, Task } from './typer';`, utan MIN. Kör typkontrollen.

### 6. [gaffatejp] Bildstenens chanser står utanför balans() (regel 8)
Plats: src/sim/bildsten.ts:86
`export const BILDSTEN = { extra: 0.35, gud: 0.4 } as const` (steg 13.9.16) avgör hur ofta stenen får ett slumpat extramotiv och ristarens gud. Det är balanstal men står inte i ett balans()-block, så de syns inte i npm run talen och går inte att pröva med jamfor --satt eller BALANS=.
Bevis: npm run talen -- bildsten visar inget. grep "balans('bildsten'" src ger ingen träff. Talen läses bara på bildsten.ts:100–103.
Lösning: I bildsten.ts: importera balans från './balans' och byt rad 86 mot `export const BILDSTEN = balans('bildsten', { extra: 0.35, gud: 0.4 }); // chansen för ett slumpat motiv och för ristarens gud`. Talen är oförändrade, så spelet blir exakt detsamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: bildsten.ts:86 är `export const BILDSTEN = { extra: 0.35, gud: 0.4 } as const` och står utanför balans(). `npm run talen -- bildsten` svarar 'Inget balanstal matchar bildsten'. Talen läses bara på bildsten.ts:97 och 101. Fyndet är rätt, men det är inte gaffatejp. Det bryter mot ARKITEKTUR-regeln att balanstal står i balans(), så kategorin borde vara arkitektur eller register.
Rättad lösning: I src/sim/bildsten.ts: lägg till `import { balans } from './balans';` bland importerna och byt rad 86 mot `export const BILDSTEN = balans('bildsten', { extra: 0.35, gud: 0.4 }); // chansen för ett slumpat motiv och för ristarens gud (steg 13.9.16)`, utan `as const`. Talen är oförändrade, så spelet blir exakt detsamma. Kontrollera att `npm run talen -- bildsten` visar båda talen och kör typkontrollen.

# DEL ui
## sammanfattning
Jag har granskat gränssnittet och testerna från fas 13 och 14. Det viktigaste fyndet: pergamentkartan med Björns utsmyckning (steg 13.1.2, bockat v535) syns inte i spelet. Spelets världskarta ritas fortfarande med ritaVarld, och ritaPergament anropas bara av bildstil/varldkarta.ts. Kompassrosen, stämpeln, runbandet, havsormen, skeppet och de femton platstecknen syns alltså bara i bildstilen. Ritningen som pergamentpryd.ts gör är billig (cirka 35 ms), men grunden i pergament.ts tar 1,2 s mot 46 ms för dagens karta. Den måste därför sparas för sig när den kopplas in.

Det övriga är litet:
- Världskartans ruta för en färd eller ett sällskap ritas bara om vid tryck, så "Framme om …" står still och rutan blir kvar när färden är slut.
- havet() räknas två gånger per pergamentbild.
- I ritaMyr ingår myrens vatten i nyckeln, fast malmen inte beror på det sedan 13.7.5.
- Raden barsele i PLAGG_FALT gör ingenting.

Testerna håller:
- Alla 131 nya scenarier i fas13.ts och fas14.ts är rätt märkta lang mot test/scenariotider.json (bara fallvittj, 12 s men märkt lang; grannfolk saknar tid).
- Sju villkor med "eller" som kunde gå igenom utan att något prövas (fargsmak, gropplats, trosklar, forvantan, foretagsrykte, verksamheter) körde jag med ALLA=1. Alla prövar verkligen det de ska.
- Gränserna som ändrats i äldre scenarier har ett skäl i spelet: handelns byten är nu ett byte, inte två, och pyntet i RUM_PLUS flyttades till finheten i 14.1.1. Inget scenario har sänkts bara för att bli grönt.

Det jag inte kunde visa är inte med: om myrens vatten ritar om hela marken för ofta (0 byten på 2 dygn i by 1511), och om de oanvända kartbilderna stockvag och stockvag_v kan tas bort, eftersom ikonnamnet stockvag också finns i MATERIAL.
## siffror
ritaVarld 44–46 ms och ritaPergament 1185–1222 ms (världen ur varldFro(7), 160 × 104 rutor), varav prydUnder 17 ms och prydOver 18 ms. I by 1511 (facit-byar/1511-20) bytte myrVatten 0 gånger och ängarna 0 gånger på 48 timmar (2 dygn, 2 år i spelet). Scenarietider ur test/scenariotider.json: 131 nya scenarier i fas13.ts och fas14.ts; ingen är 13 s eller mer utan lang (fallvittj 12 s är märkt lang; grannfolk saknar tid). ALLA=1-körningen av fargsmak, gropplats, trosklar, forvantan, foretagsrykte och verksamheter var grön på 0–1 s datortid. Commit 7978df68.

### 1. [dokument] Pergamentkartan och dess utsmyckning (13.1.2) syns inte i spelet
Plats: src/ui/varldskarta.ts:81 (bilden() anropar ritaVarld), src/ui/pergament.ts:57 (ritaPergament), src/ui/pergamentpryd.ts:93 och 112 (prydUnder och prydOver), bildstil/varldkarta.ts:35 och 41 (det enda som anropar ritaPergament)
Steg 13.1.2 (bockat v535) säger att Björns val byggs in: platsernas femton tecken, ramen, kompassrosen, havets bilder och kartan på pergament. Avsnittet Världen och grannbyarna (fliken Samhället) säger att kartan är ritad med bläck på pergament, med havsorm, skepp, kompassros, runband och stämpel. Spelets världskarta (bilden() i varldskarta.ts) ritar ändå fortfarande ritaVarld ur varldbild.ts, med marken i färger och spelets vanliga tecken. ritaPergament, och därmed prydUnder, prydOver och ritaPlatstecken, nås bara från bildstil/varldkarta.ts. Spelaren ser alltså ingenting av det som byggdes i 13.1.2, utom ruinmuren.
Bevis: grep -rn ritaPergament src bildstil ger bara definitionen i src/ui/pergament.ts:57 och bildstil/varldkarta.ts:7, 35 och 41. grep 'ritaVarld(' src/ui ger varldskarta.ts:81: const b = ritaVarld(vl, v, bynsKarta(s!), mk). Mätt i ett eget skript (världen ur varldFro(7), 160 × 104 rutor): ritaVarld 44–46 ms och ritaPergament 1185–1222 ms, varav prydUnder och prydOver tillsammans 35 ms. Resten är grunden i pergament.ts (brus per punkt, kust och marksorter).
Lösning: 1) I src/ui/pergament.ts delas ritaPergament i två delar. grundPergament(vl, v) räknar allt som bara beror på v: arLand, sort, avst, vattnet, floderna, marktecknen och prydUnder. Den sparas i en WeakMap<VarldMark, VarldBild> och kopieras (data.slice()) vid varje anrop. Ovanpå ritas sedan det som beror på byn: lederna, platstecknen (ritaPlatstecken eller ritaTecken), lagren ur kn, uppdragens märken, huvudbyns ram och prydOver. 2) I src/ui/varldskarta.ts:81 byts ritaVarld(vl, v, bynsKarta(s!), mk) mot ritaPergament(vl, v, bynsKarta(s!), mk), och importen läggs till. Nyckeln i bilden() (platserna, bynVet, ledVer och märkena) får stå kvar; omritningen kostar då ungefär 35 ms plus kopian i stället för 1,2 s. 3) Scenarierna som prövar lagren och märkena på kartan (fas11.ts:1487 kartlager och fas11.ts:4105) körs också mot ritaPergament, eller mot båda. Ändrar bara bilden. Fråga Björn innan om den vanliga färgkartan ska finnas kvar som ett andra kartläge (Två kartlägen i fliken Världen).
DOM: håller=True spel=False dok=True bjorn=True
Varför: grep -rn ritaPergament src bildstil: bara definitionen src/ui/pergament.ts:57 och bildstil/varldkarta.ts:7,35,41. src/ui/varldskarta.ts:81 ritar fortfarande ritaVarld(vl, v, bynsKarta(s!), mk) ur varldbild.ts. prydUnder, prydOver och ritaPlatstecken (pergamentpryd.ts:39,94,112) anropas bara från ritaPergament (pergament.ts:14,147,158,170). Designdokumentet: steg 11.9.2 (v532) säger att världskartan ritas på pergament, steg 13.1.2 (v535) att Björns val byggs in, och avsnittet Världen och grannbyarna (fliken Samhället) att kartan är ritad med bläck på pergament, med havsorm, skepp, kompassros, runband och stämpel. I spelet syns inget av det. Delningen går att göra: allt i ritaPergament fram till prydUnder (rad 58–147) läser bara v. Lederna, platserna, kn, marken och huvudbyns ram (rad 149–169) läser vl och byn. varldMark(s) (sim/varlden.ts:73) sparar v i en karta per vl, så samma v-objekt kommer tillbaka och duger som nyckel i en WeakMap. Avsnittet Två kartlägen hittades inte i fliken Världen. Ingen rad i Färdplanen tar upp bytet.
Rättad lösning: 1) I src/ui/pergament.ts flyttas rad 58–147 (W, H, arLand, sort, avst, vattnet, floderna, marktecknen och prydUnder) till en ny funktion grundPergament(v: VarldMark): VarldBild. Den sparar sin bild i const GRUND = new WeakMap<VarldMark, VarldBild>(). ritaPergament(vl, v, kn, marken) hämtar grunden, eller räknar den om den saknas, och gör b = { w, h, data: grund.data.slice() }. Sedan ritar den på b som i dag: lederna, platstecknen (ritaPlatstecken, annars ritaTecken), lagren ur kn, uppdragens märken, huvudbyns ram och prydOver. satt skrivs då på b. 2) I src/ui/varldskarta.ts:81 byts ritaVarld mot ritaPergament, med samma argument, och ritaPergament importeras från './pergament'. Nyckeln i bilden() (bildFor, platserna, bynVet, ledVer och märkena) står kvar. 3) Scenarierna kartlager (fas11.ts:1487) och uppdragens märken (fas11.ts:4105) prövar ritaPergament. Behövs den vanliga färgkartan som ett andra kartläge prövar de båda. Det ändrar bara bilden. Det behövs inget nytt facit, men npm run utseende ska köras. Om färgkartan ska vara kvar som ett andra läge, med en knapp för att byta, avgör Björn. Att pergamentet är den karta som visas säger dokumentet redan.

### 2. [bugg] Rutan för en färd eller ett sällskap på världskartan ritas aldrig om medan den är öppen
Plats: src/ui/varldskarta.ts:165 (setInterval), 219–221 (trycket), 283–284 och 315–323 (sidaHtml och fardHtml)
Rutan till höger (sida.innerHTML) skrivs bara när kartan öppnas (rad 152), vid ett tryck (rad 219–221) och när en flik byts (rad 326). Klockan varje sekund (rad 165) ritar bara om duken med senare(). I färdens ruta från B.39 står därför "Framme om …" (fardRuta(...).kvar) och vad de bär kvar som när man tryckte. När färden kommit fram och tagits ur vl.farder står den gamla rutan kvar, fast symbolen är borta. Samma gäller sällskapets ruta (sallskapHtml, avståndet kvar och dagboken).
Bevis: grep -n 'sida.innerHTML' src/ui/varldskarta.ts ger bara raderna 152, 219, 220, 221 och 326. Rad 165 är setInterval(() => { if (visas() && (sallskapNu(s?.varld).length || s?.varld?.farder?.length)) senare(); }, 1000), alltså bara duken. sidaHtml räknar kvar ur s.now (fardRuta, omUngefar(r.kvar * DAY)), så texten blir fel så snart tiden går.
Lösning: I callbacken på rad 165 läggs till: if (visas() && (valt?.sl !== undefined || valt?.fard !== undefined)) { const h = sidaHtml(); if (h !== sidaSist) { sidaSist = h; sida.innerHTML = h; } }. sidaSist är en ny let på modulnivå som också sätts där sida.innerHTML skrivs i dag (rad 152, 219–221 och 326). När färden eller sällskapet inte finns längre ger sidaHtml redan den tomma texten "Tryck på en by …", eftersom fd eller sl blir undefined. Byns ruta (valt.by) behöver inte ritas om varje sekund.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep -n 'sida.innerHTML' src/ui/varldskarta.ts ger bara raderna 152 (oppna), 219–221 (trycket) och 326 (fliken). setInterval på rad 165 anropar bara senare(), alltså duken. fardHtml (rad 315–323) räknar 'om ' + omUngefar(r.kvar * DAY) och fardRuta (sim/fardfolk.ts:79) läser s.now, så texten blir gammal. Värre: villkoret på rad 165 är sallskapNu(...).length || farder?.length. När den sista färden kommit fram och tagits bort slår klockan inte ens till, och den gamla rutan står kvar.
Rättad lösning: I src/ui/varldskarta.ts läggs en ny variabel på modulnivå: let sidaSist = ''. Den sätts överallt där sida.innerHTML skrivs, alltså på rad 152, 219, 220, 221 och 326. Skriv där: const h = sidaHtml(); sidaSist = h; sida.innerHTML = h. Callbacken på rad 165 får en egen kontroll vid sidan av den som finns, inte inne i dess villkor: setInterval(() => { if (!visas()) return; if (sallskapNu(s?.varld).length || s?.varld?.farder?.length) senare(); if (valt?.sl !== undefined || valt?.fard !== undefined) { const h = sidaHtml(); if (h !== sidaSist) { sidaSist = h; sida.innerHTML = h; } } }, 1000). När färden eller sällskapet är borta ger sidaHtml redan texten 'Tryck på en by …'. Byns ruta (valt.by) ritas inte om varje sekund. Eftersom rutan bara skrivs när texten ändrats, tappar knapparna i den inte fokus i onödan. Det ändrar bara gränssnittet.

### 3. [optimering] havet() och kompassrosens plats räknas två gånger per pergamentbild
Plats: src/ui/pergamentpryd.ts:93–94 (prydUnder), 112–114 (prydOver), 82 (rosPlats), src/ui/pergament.ts:147 och 170
prydUnder och prydOver anropar var för sig havet(v). Det är en avståndskarta med bredden först över (2·w)·(2·h) punkter och en sortering av alla havspunkter. rosPlats sparar platsen i V.ros, men V är ett nytt objekt i varje anrop. friHavsplats, som söker över hela rutnätet, körs därför för rosen både i prydUnder och i prydOver (kompassrosen och stämpelns undan).
Bevis: Koden: rad 93 const V = havet(v) i prydUnder och rad 113 const V = havet(v) i prydOver; ritaPergament anropar båda (pergament.ts:147 och 170). Mätt med en tom satt: prydUnder 17 ms och prydOver 18 ms på världen ur varldFro(7). Det mesta i prydOver är havet() och friHavsplats en gång till.
Lösning: I pergamentpryd.ts görs havet till en export, och prydUnder och prydOver tar V som andra argument: prydUnder(v, V, satt) och prydOver(v, V, satt). De anropar inte havet själva. I ritaPergament (pergament.ts) räknas const V = havet(v) en gång före rad 147, och samma V skickas till båda, så att V.ros räknas en gång. Bilden blir exakt densamma. Görs tillsammans med fyndet om pergamentkartan, där V också kan sparas i grundbilden.
DOM: håller=True spel=False dok=False bjorn=False
Varför: src/ui/pergamentpryd.ts:59: havet(v) har inget minne. prydUnder (rad 95) och prydOver (rad 113) anropar havet(v) var för sig. rosPlats (rad 90) sparar V.ros ??= friHavsplats(...), men varje V är ett nytt objekt, så friHavsplats räknas för rosen i prydUnder och igen i kompassros och stämpel via prydOver. ritaPergament anropar båda (pergament.ts:147 och 170). havet och friHavsplats läser bara v, så samma V ger exakt samma bild.
Rättad lösning: I src/ui/pergamentpryd.ts exporteras typen Hav och funktionen havet. Signaturerna blir prydUnder(v: VarldMark, V: Hav, satt: Satt) och prydOver(v: VarldMark, V: Hav, satt: Satt), och raden const V = havet(v) tas bort i båda. I ritaPergament räknas const V = havet(v) en gång före prydUnder, och samma V skickas till prydOver, så V.ros räknas bara en gång. Görs det tillsammans med fynd 1, räknas V i grundPergament och sparas i samma WeakMap som grundbilden, till exempel som { bild, V }. Bilden blir exakt densamma.

### 4. [dod] Myrens vatten i nyckeln för ritaMyr ritar om malmen i onödan
Plats: src/ui/myrbild.ts:20
Sedan steg 13.7.5 ritas själva myren i markens bild (myrPunkt i mark.ts), och ritaMyr ritar bara malmklumparna. Hur de ritas beror inte på om myren står under vatten. Nyckeln innehåller ändå vatten (groundOf(s).myrVatten), så alla malmklumpar ritas om varje gång myren blir blöt eller torkar. Variabeln vatten används bara i nyckeln.
Bevis: I ritaMyr läser loopen bara a[i], fyndAt(s, 'malm', i) och prick(). grep -n 'vatten' src/ui/myrbild.ts ger bara raden med nyckeln och kommentaren överst.
Lösning: I src/ui/myrbild.ts:20 tas `vatten = !!groundOf(s).myrVatten, ` bort ur const-raden och `|${vatten}` ur nyckeln. Importen av groundOf tas bort om den inte används någon annanstans i filen. Bilden blir exakt densamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: src/ui/myrbild.ts:20: vatten = !!groundOf(s).myrVatten används bara i nyckeln. Loopen läser bara a[i], fyndAt(s,'malm',i) och prick(). groundOf importeras på rad 4 och används bara på rad 20. Vinsten är liten: nyckeln innehåller också Math.floor(s.now/(6*HOUR)), så malmen ritas ändå om var sjätte timme i spelet. Det som sparas är bara omritningarna när myren blir blöt eller torkar mitt i ett sådant fönster.
Rättad lösning: Ändra rad 20 i src/ui/myrbild.ts till const a = myrOf(s.seed), nyckel = `${s.seed}|${W}x${H}|${!!a}|${s.stat?.malmGravd ?? 0}|${Math.floor(s.now / (6 * HOUR))}`;. Ta bort groundOf ur importen på rad 4. Bilden blir exakt densamma.

### 5. [dod] Raden barsele i PLAGG_FALT gör ingenting
Plats: src/ui/utseende.ts:120
PLAGG_FALT fick i fasen raden barsele: () => {}. klada anropar PLAGG_FALT[a.plagg]?.(...), så ett plagg utan rad ger samma resultat som raden som inte gör något. Ingen annan kod läser PLAGG_FALT.
Bevis: grep -rn PLAGG_FALT src ger bara definitionen (rad 117) och klada (rad 122), som använder ?.. Raden barsele är den enda som har en tom funktion.
Lösning: Ta bort `barsele: () => {}, ` på rad 120 i src/ui/utseende.ts. Vill man visa att bärselen medvetet inte ritas, skriv det i kommentaren ovanför registret i stället. Figuren blir exakt densamma.
DOM: håller=True spel=False dok=False bjorn=False
Varför: grep -rn PLAGG_FALT src ger bara src/ui/utseende.ts:117 (definitionen) och 122 (klada, som anropar PLAGG_FALT[a.plagg]?.(...)). En rad som saknas ger alltså samma sak som barsele: () => {} på rad 120. Bärselen finns i simuleringen (fas13.ts:323, scenariot barsele), men ingen annan ui-kod läser raden.
Rättad lösning: Ta bort 'barsele: () => {}, ' på rad 120 i src/ui/utseende.ts. Skriv i stället i kommentaren ovanför PLAGG_FALT (rad 115–116) att bärselen inte ritas än, så att ingen tror att raden glömts. Figuren blir exakt densamma.
