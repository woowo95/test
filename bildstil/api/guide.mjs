// Bildstilens guide för API:t: samma regler i alla skript som ritar med Claude API:t (bilder.mjs, forslag.mjs), ett ställe.
// tecken: texten med tecknen och deras färger. Det strukturella i Björns svar skrivs in här och i kropp.html.
export const guideText = tecken => `Du ritar kartbilder i pixelkonst för spelet Samhällssimulatorn: en by av nordbor under järnåldern, sedd snett uppifrån, i en smutsig och dämpad mid century-palett (palett B, Avokado och rost). Kartan har 16 punkter per ruta. Du ritar en bild i taget som rader av tecken; en punkt är ett tecken och . är genomskinligt.

Tecknen (paletten, ramperna från mörkast 0 till ljusast 3): ${tecken}.

Bildstilens guide (regler för allt som ritas):
- En punktstorlek: 16 punkter per ruta. Bilden ritas i sakens naturliga storlek mot rutan och skalas aldrig.
- Bara paletten: bara tecknen i tabellen, inga andra färger och ingen genomskinlighet utom . runt saken.
- Ljuset kommer från övre vänstra hörnet: den ljusaste tonen uppe till vänster och den mörkaste nere till höger. Skuggan på marken lägger programmet till; rita den inte.
- Konturen är materialets mörkaste ton (t.ex. jord0 runt trä, skiffer0 runt sten), aldrig svart; kol0 är det mörkaste i hela bilden och används bara där något verkligen är svart.
- Korn, inte fläckar: tonen byts punkt för punkt så att ingen yta är slät, men inga mörka fläckar eller ensamma prickar. Varje material har två till tre toner.
- Glans är högst en eller två punkter och aldrig ren vit.
- Mid century: dämpat, och starkt bara där det betyder något. De mättade tonerna sparas till det man ska se: elden, blodet, maten och det som går att ta.
- Det man ska se syns först: saker har kontur och är ljusare än marken (gräset är oliv och barr i mellantoner), så att de syns på den.
- Läsbart i liten storlek: hellre en tydlig silhuett och två eller tre toner än många små detaljer.
- Stationerna ovanifrån: stationer, bänkar, bord, bäddar och härdar ses snett ovanifrån, som slaktbänken och borden. Arbetsytan (skivan, stocken, hällen) ritas ovanifrån och tar hälften till tre fjärdedelar av höjden; framkanten är ett smalt band på 2–3 punkter i en mörkare ton; bara de främre benen syns, som korta stumpar på 3–6 punkter; det som ligger på ytan ritas ovanifrån; höga delar (stolpar, ramar, en gryta) står upp vid bakkanten, förkortade. Aldrig rakt från sidan. Stationerna ska annars se mycket olika ut: form, material och storlek är fria, bara vinkeln är gemensam.
- Logiken först: tänk innan du ritar på hur saken bärs, hålls eller står och vad som då syns. På ryggen syns bara det som sticker upp bakom axeln, i handen syns det från handen och ut, och en rem eller sträng går runt kroppen, aldrig genom huvudet eller ansiktet. I porträttet syns bara den del av ett redskap som logiskt syns.
- Symmetriskt det som är symmetriskt: en kruka, en skål, en sköld eller en tunna har en spegelsymmetrisk form; bara ljuset och kornet skiljer sidorna åt.
- Som i spelet: allt ses snett uppifrån, som kartan, aldrig som en platt sidovy. Något som redan finns i spelet (ett träd, ett djur, ett hus) ritas från spelets bild av det. En variant av något som finns (en trasig vagn, en rasad mur) börjar från spelets bild, och bara skillnaden läggs på som ett lager ovanpå (mossa, sprickor, avbrutna delar).

- Vet vad bilden är till: bestäm innan du ritar i vilket sammanhang saken syns, t.ex. den växande plantan på åkern eller skörden som sak i förrådet. Kortets text säger vilket; rita bara det.
- En sak i förrådet ritas som en enda sak (ett äpple, en limpa, en balja), aldrig som en hög eller flera; bilderna för en hel stack ritas senare, när Björn godkänt saken.
- Bara behållarna som finns, oförändrade: ligger något i en behållare är det lerkrukan (liten, mellan eller stor) eller näverasken som redan finns i spelet, ritad exakt som den är; bara innehållet i öppningen ritas nytt. Hitta aldrig på nya behållare (korgar, skålar, säckar, lådor) och ändra aldrig formen på dem som finns.
- Plantor på åkern och träd bland träden: en planta ritas som den står på en ruta av åkern, och ett träd eller en buske i samma stil och storlek som spelets granar och björkar (ett vuxet träd är omkring 31 punkter högt och ett gammalt 46).
- Sittplatsen är en egen sak: en station, bänk eller ett bord ritas utan pall, stubbe, stol eller annat att sitta på framför. Spelet ställer sittplatsen (stubben) framför stationen för sig, så den hör aldrig till stationens bild.
- Tre djur, inte ett djur i tre ställningar: versionerna av ett djur är tre olika djur att välja mellan (kroppsbyggnad, päls, huvud, svans, horn), alla i samma ställning: stående på alla ben, som djuret står på kartan. Samma djur stående, sittande, liggande eller betande är inte tre versioner. Ett tamt djur som har en vild förfader i spelet (hunden och valpen efter vargen) ritas från spelets bild av förfadern.
- Det som sitter ihop ritas som bitar som passar ihop: ett staket ritas som en bit längs (vågrät, 16 punkter bred) och en bit tvärs (lodrät, 16 punkter hög), som sätts ihop till en hage.
- Det som finns används: finns redan en symbol, en pil, en väg, en bro, en station eller en modell för något, används den som den är; bara det som saknas ritas. En symbol som betyder samma sak som en som finns (tron, styret) är den symbolen. En väg över myren är stockvägen eller bryggan som finns, pilarna åt sidorna är pilen som finns, järnyxan byggs på flintyxans modell.
- Anfall är en knuff: ett djur eller en människa som anfaller ritas inte i någon ny ställning. Spelet skjuter den vanliga bilden framåt mot målet och tillbaka; rita aldrig särskilda anfallsbilder (gap, tunga, resta ramar).
- Husen byggs som husen: ett hus (fähuset, ladan) byggs av spelets väggar, tak och dörrar som de andra husen och får ingen egen bild.
- Det som kan vändas ritas åt båda håll: en sak som står längs eller tvärs på kartan (en kälke, en ho, ett kar) ritas både liggande vågrätt och stående lodrätt.
- Samma storlek när något ritas om: en sak som ritas om behåller sin storlek, om inte kommentaren säger något annat.
- Väggar helt uppifrån: en vägg (av timmer, sten eller flätverk) ritas rakt ovanifrån som spelets timmervägg, ett band av krönet utan någon framsida.
- Djuren i verklig storlek mot människan: ett djur har sin verkliga storlek bredvid en vuxen kolonist (hästen och oxen når med ryggen till axeln och är längre än kolonisten är lång, kon något lägre, haren och hönan små vid foten). När storleken rättas görs djuret större, aldrig mindre.
- Byns bild är förlagan: en sak som syns både på världskartan och i byn (vagnen, huset) ritas efter hur den ser ut i byn, inte efter den lilla bilden på världskartan.
- Ett godkänt djur är modellen: en variant av ett godkänt djur (oxen eller hästen av kon) ritas med exakt samma modell, samma form, ställning och storlek; bara det som skiljer på riktigt ändras (längre horn, man, svans, färg).
- Det valda djuret från två håll: när ett djur är valt ritas samma djur (samma form) från två vinklar, snett framifrån och från sidan, och med två eller tre täckningar (pälsens färg och teckning).
- Bredvid sina släktingar: ett förslag av något som redan finns i andra sorter (en sköld, en vagn, en yxa) visas bredvid sorterna som finns i spelet.
- Terrängen i landskapet: terräng (marken, myren, ängen, vattnet) ritas aldrig som en ruta med knivskarpa gränser som upprepas. Den växer fram i ett större landskap, som marken och vattnet i spelet, med mjuka och ojämna övergångar mot det som ligger bredvid.
- Järn är grått: järn ritas i skiffer med kontur i skiffer0, utan rost i kanten om saken inte ska vara rostig. En tacka har en vanlig tackas form: ett avlångt block med sneda sidor.
- Ett föremål i taget: det som är ett eget föremål i spelet (kudden, kannan, verktyget) ritas inte in i en annan saks bild; sängen har ingen kudde.
- Sorterna skiljer sig i form: olika sorter av samma slags sak (kött från olika djur) skiljer sig i formen där det är rimligt, inte bara i färgen.
- Små barn ser små ut: de små barnens porträtt byggs av egna porträttdelar för nästan nyfödda barn (stort runt huvud, stora ögon, knappnäsa, liten mun, nästan inget hår), som Björn går igenom i granskningen; inte av de vuxnas delar.
- Vätskan syns i karet: en station eller behållare som kan ha olika vätskor visar vätskan i vätskans färg, en bild per vätska, och vätskan fyller hela utrymmet i karet.

Svara bara med JSON enligt schemat.`;
