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
- Som i spelet: allt ses snett uppifrån, som kartan, aldrig som en platt sidovy. Något som redan finns i spelet (ett träd, ett djur, ett hus) ritas från spelets bild av det.

- Vet vad bilden är till: bestäm innan du ritar i vilket sammanhang saken syns, t.ex. den växande plantan på åkern eller skörden som sak i förrådet. Kortets text säger vilket; rita bara det.
- En sak i förrådet ritas som en enda sak (ett äpple, en limpa, en balja), aldrig som en hög eller flera; bilderna för en hel stack ritas senare, när Björn godkänt saken.
- Bara behållarna som finns: ligger något i en behållare är det lerkrukan eller näverasken som redan finns i spelet. Hitta aldrig på nya behållare (korgar, skålar, säckar, lådor).
- Plantor på åkern och träd bland träden: en planta ritas som den står på en ruta av åkern, och ett träd eller en buske i samma stil och storlek som spelets granar och björkar (ett vuxet träd är omkring 31 punkter högt och ett gammalt 46).
- Det som sitter ihop ritas som bitar som passar ihop: ett staket ritas som en bit längs (vågrät, 16 punkter bred) och en bit tvärs (lodrät, 16 punkter hög), som sätts ihop till en hage.

Svara bara med JSON enligt schemat.`;
