# Gaffatejp i koden (steg 9.9.2)

Regler som tvingar fram ett resultat i stället för att systemen ger det. Inget är ändrat. Svara med numren du säger ja till, så blir de steg i Färdplanen.

**Hur genomgången gjordes:** en hjälpmodell läste valet av aktivitet (`val.ts`) i sin helhet och delar av projekten, förrådsmålen, behoven, livet, motgångarna, tekniken, elden, odlingen, byggplanen, boskapen och kyrkan. Resten av `src/sim/` är bara genomsökt på varningsorden (högst, aldrig, alltid, bara, annars, en i taget). Striden, hälsan, tornadon, branden, religionen, minnet, rykten, framträdandena och matlagningen är inte lästa. Listan är alltså inte fullständig. Radnumren gäller commit 2c38cc2.

## Fynden

1. **Motgångarna börjar inte förrän byn är 10 dygn gammal** (`motgang.ts:93`, `forstaDygn: 10`). En ny by drabbas aldrig av hård vinter, torka, översvämning eller tornado de första 10 dygnen (10 år i spelet). Kunde vara en faktor på motgångens chans efter byns ålder eller förråd. Litet.
2. **Högst en motgång per tidsålder** (`motgang.ts:16`). Kunde vara oberoende chanser per motgång. Litet till mellan. Designfråga.
3. **Byn sparar fasta reserver till elden** (`forradsmal.ts:81` `sparas`: 6 ved, 15 grenar, 6 hö, 1 flinta). Ett recept eller bygge får inte ta de sista, oavsett vad elden faktiskt förbrukar. Elden styr alltså andra system. Kunde vara eldens del av materialets buffert i förrådsmålen. Mellan.
4. **Inget byggs och inga projekt görs när kylan är en fara, på 18 ställen** (`projekt.ts`, `kan: … !f.kyla`; `val.ts:842`; `steg.ts:1212`). Ett undantag inne i nivåerna i stället för att tiden mot värmen vägs i poängen. Kunde vara en enda dämpning i projektets värde. Mellan.
5. **Vid svält bärs bara mat in, vid kyla bärs inget in** (`val.ts:591–595`). Ett filter i stället för att varje sak som ligger ute har ett värde. Mellan.
6. **Rädda har ett golv på 25 %** (`val.ts:93` `raddaMin`), så att det som inte ruttnar ändå bärs in. Kunde vara värdet av det som ligger ute. Litet.
7. **Förbättra väljs i en fast ordning** (`val.ts:895` `forbattra` och `val.ts:919` `fylla`): försök, teknikarbete, varor till handlaren, underhåll, gå i lära; och mat, ved, grenar, hö. Den som står först tar allt. Kunde vara rader med poäng, som nivå 6. Stort.
8. **Över förrådens tak arbetar ingen, med särskilda undantag för grenar och yxa** (`val.ts:904`, `val.ts:988`). Byn slutar arbeta tvärt vid taket. Det här gör också att en by med fulla förråd slutar arbeta mot nästa teknik (jag såg det i by 2: full mat efter två dygn, sedan fritid i flera dygn utan yxa). Kunde vara ett mjukt tak där värdet av en sak till sjunker med mängden. Mellan.
9. **Bygget väljs bort när timmer saknas och ingen yxa finns** (`val.ts:842–843`). En rättning efter ett fel där grenar samlades utan slut. Yxan är redan ett projekt som bygget kunde ärva bristen från. Litet.
10. **En i taget, hårt, på många rader** (`val.ts`: fågelskrämma, staket, sopor, tömma latrinen, vittja; `projekt.ts`: flytta lager, lera, flytta station, uppsatt, ljus; `eld.ts:385, 391`). Arbetsordningen har redan ett mjukt tak för antal arbetare per rad. Mellan.
11. **Exakt en vakt varje natt, den modigaste** (`val.ts:1200`). Antalet kunde följa hotet (vargar, rövare, varsel) och påbud. Mellan.
12. **Ingen prövar sig fram till en teknik utan överskott av mat och ved** (`teknik.ts:310`, `forsokMat: 1.1`, `forsokVed: 2`). En hård nolla före poängen, fast nivåerna redan sätter farorna först. Kunde vara en faktor som växer med överskottet. Litet.
13. **Nybyggare kommer under tio invånare, och en tom by grundas på nytt med gratis rötter** (`liv.ts:201`, `liv.ts:323`, `MEDHAVT`). Resultatet "byn dör inte ut" tvingas fram. Kunde följa byns rykte, förråd och grannklanerna. Mellan. Designfråga.
14. **Djurhållningen har en egen gräns för svält** (`boskap.ts:134, 147`, `tamdjur.ts:109`): 2 saker mat per människa, och "ett par blir kvar". Kunde använda samma svältmått som valet av aktivitet, och väga slaktvärdet mot fodret. Litet.
15. **När veden tryter sköts bara den mest använda elden** (`eld.ts:384`). Kunde vara ett värde per eld efter hur många som värmer sig där. Litet.
16. **Vilda hasselnötter plockas "alltid"** (`odling.ts:575, 636`), också när förrådet är fullt. Kunde följa matbristen. Litet.
17. **Högst ett pynt per person** (`stationer.ts:701`). Kunde vara att glädjen av ett pynt till avtar. Litet.
18. **En främling blir mätt utan att någon mat går åt** (`kyrka.ts:264`, budet om främlingar). De andra buden tar maten ur förrådet. Kunde gå genom gåvan. Litet.
19. **En bybo köper högst tre slag av handlaren, och besöken kläms mellan två gränser** (`handel.ts`, `egnaMax: 3`, `dygnMin/dygnMax`). Litet. Gränsfall: att handlaren inte kommer i istiden är en grundregel.
20. **Byggplanen föreslår förbättringar först vid 30 ved** (`byggplan.ts:54` `forbVed`). Ett fast tal som inte beror på vad förbättringen kostar. Litet.
21. **Barn hjälper till med det byn behöver mest, med en fast chans att leka** (`val.ts:640`). Kunde vara poängraderna med en vikt efter åldern och barnets egen lust. Litet.
22. **Lagerplatserna växer högst fyra steg i timmen** (`lager.ts:37`). Troligen en spärr för stabiliteten och ingen gaffatejp. Med för att du ska kunna avgöra.
23. **Nästan allt nytt i fas 9 ligger på nivån Rädda** (`val.ts:609–620`): brygga, klippa, mjölka, hamla, hage, staket, fågelskrämma. De går alltså före Försörjning och har ingen koll av om något verkligen behöver räddas, så en hungrig by kan brygga vin av sina bär. Hunden äter också kött under svält. Hittat av felsökningen, inte av gaffatejp-genomgången. Kunde ligga på Förbättra, eller ha poäng efter behovet. Mellan.

## Bedömt som grundregler, inte med

Receptens krav, att man bär två saker, att vattnet fryser, kompostens innehåll, arbetsordningens nivåer, ålderskraven, vargarnas och björnens antal, rövarnas storlek och tröskeln för att välja ledare.
