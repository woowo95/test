export const meta = {
  name: 'affarstest',
  description: 'Affärstest på fas14: fem granskare (uppkomsten, kunden, ägaren, verkan och bilden, koden) plus mätningen, och en skeptiker per del med fel',
  phases: [
    { title: 'Granska', detail: 'sex granskare' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa felen' },
  ],
}

const W = '/home/user/wf-fas14'
const INSP = '/home/user/test/granskning/workflow/insp/fas14'
const BILDER = '/home/user/test/granskning/workflow/rapporter/bilder-fas14'
const RAPP = '/home/user/test/granskning/workflow/rapporter'

const SCHEMA = {
  type: 'object',
  properties: {
    sammanfattning: { type: 'string' },
    kansla: { type: 'string', description: 'hur det känns för en spelare, några meningar' },
    siffror: { type: 'string', description: 'de viktigaste siffrorna, så att nästa granskning kan jämföra' },
    mal: { type: 'array', items: { type: 'object', properties: {
      steg: { type: 'string' }, uppfyllt: { type: 'string', enum: ['ja', 'delvis', 'nej', 'ej mätt'] }, bevis: { type: 'string' } },
      required: ['steg', 'uppfyllt', 'bevis'] } },
    fel: { type: 'array', items: { type: 'object', properties: {
      titel: { type: 'string' }, beskrivning: { type: 'string' }, orsak: { type: 'string', description: 'fil:rad' },
      allvar: { type: 'string', enum: ['fel', 'fult', 'smasak'] }, losning: { type: 'string', description: 'exakt: fil, funktion, regel som formel eller balanstal från och till' } },
      required: ['titel', 'beskrivning', 'orsak', 'allvar', 'losning'] } },
    bilder: { type: 'array', items: { type: 'string' }, description: 'sökvägar till de bästa skärmbilderna, om några' },
  },
  required: ['sammanfattning', 'kansla', 'siffror', 'mal', 'fel'],
}
const DOM = {
  type: 'object',
  properties: { domar: { type: 'array', items: { type: 'object', properties: {
    titel: { type: 'string' }, haller: { type: 'boolean' }, varfor: { type: 'string', description: 'vad i koden eller inspelningen som visar det (fil:rad, siffror)' },
    gaffatejp: { type: 'boolean', description: 'är den föreslagna lösningen gaffatejp' },
    losning: { type: 'string', description: 'lösningen som systemändring, exakt (fil, funktion, formel, balanstal från och till), rättad om det behövs' },
    balans: { type: 'boolean', description: 'är det egentligen ett balanstal och inte ett fel' } },
    required: ['titel', 'haller', 'varfor', 'gaffatejp', 'losning', 'balans'] } } },
  required: ['domar'],
}

const BAKGRUND = `Du granskar företagen i fas 14 (Handeln i byn, steg 14.1.1–14.1.15) i Samhällssimulatorn (svenska, järnåldersby). Svara på svenska.
Koden: grenen fas14 (commit f8daf269) ligger i ${W} med node_modules installerade. Läs ${W}/ARKITEKTUR.md för filerna (foretag.ts, verksamheter.ts, kassa.ts, affar.ts, konkurrens.ts, kopbuffert.ts, foretagsrykte.ts, foretagsgast.ts, stangning.ts, marknad.ts, dagsarbete.ts, rum.ts, stada.ts, forvantan.ts under src/sim). ÄNDRA INGA FILER under ${W}/src eller ${W}/test; egna skript lägger du i ${W}/src/test/ med namn som börjar med zz_ (ta bort dem efteråt) eller i /tmp. Kör inga tunga tester (balans, koll, likhet, jamfor, dynamik) om det inte är din uppgift; datorn har fyra kärnor och en annan granskare kör mätningarna.
Designdokumentets text om fas 14 och Björns regler står i ${INSP}/dokument.md. Läs den först: det som står där gäller.

Tid: spelet följer klockan, en minut riktig tid är ungefär sex timmar i spelet, en timme riktig tid ungefär 15 dagar, ett dygn riktig tid ett år i spelet. Skriv tider i riktig tid och säg vad det blir i spelet.

Det som redan syns (av chatten som startade testet): i alla testbyar (test/facit-byar/<by>-<dygn>.json.gz, en sparad by efter så många dygn) startar ett företag tidigt (affär redan efter 5 dygn), får hus och lägger till alla verksamheter (affär, nattlogi, stall, servering), men salt och intakt är alltid 0 och resultat är exakt -3.24 eller -2.709 i olika byar. Flera byar har en disk (station 'disk') men företaget har 0 diskar i sitt rum. I inspelningarna sålde inget företag något på 3 timmar (45 dagar i spelet), inte heller där testet själv startade ett. Den senaste committen säger att i de små testbyarna hinner ingen disk byggas på 50 dygn. Ta reda på VARFÖR, följ det till systemet, och jämför med dokumentet.

Inspelningarna ligger i ${INSP}: <by>.json (byar som sköter sig själva: 1-25, 1-40, 1511-30, 1511-45, 4634-30, 4634-45) och <by>_<sort>.json där inspelningsskriptet startat ett företag med den första levande bybon som ägare (1-20_servering: servering,dryck; 1511-25_affar: affar; 4634-20_taverna: servering,dryck,nattlogi). Var och en är 3 timmar riktig tid med en bild per minut (ungefär sex timmar i spelet). Formatet: {fil, timmar, starta, namn:{id:namn}, frames:[{t (s), f:[{id, ag, agare, namn, verk, oppna (öppna verksamheter), hus, rum (antal rum), diskar, ko:[{p,v,k,n,t,klar}], salt, intakt, vinst, pris, lamnat, dag, resultat, salu, enkelt, gap, byar, vantade}], p:[{id, g (gäst: sort), x, y, a (handling/fas), ref, w (skäl)}], stat:{räknare om handel}}], byLogg:[{t, text}], statDiff:{räknare som ändrats under inspelningen}}. Läs filerna med egna node- eller python-skript. Inspelningsskriptet är ${W}/src/test/zz_ffin.ts (kör det själv med "node --import tsx src/test/zz_ffin.ts <by.json.gz> <timmar> <ut.json> [verksamheter]" om du behöver en egen inspelning; det tar ungefär 15 s per timme).

Varje fel du anger ska vara grundat: fil:rad, och siffror ur inspelningen eller en körning. Lösningen ska vara så exakt att en programmerare inte kan misstolka den (fil, funktion, regel som formel, balanstal från och till) och vara en ändring i systemet, inte gaffatejp. Säg om det är ett balanstal.`

const DELAR = [
  { id: 'uppkomsten', text: `Din del: UPPKOMSTEN OCH HUSEN. Vem startar företaget, när och varför (bastaStart, startPoang, efterfragan), och lägger det till alla verksamheter för tidigt? Följer starten dokumentet (vad byborna och gästerna vill köpa som ingen säljer, vad personen kan, vad hen har råd att bygga, personligheten)? Hur får företaget sitt hus och sina rum, varför har det 0 diskar fast byn har diskar, och vilka verksamheter är öppna (oppna) och varför? Är huset ett eget hus eller ägarens bostad? Kör gärna egna inspelningar längre eller i andra testbyar. Mål: 14.1.5, 14.1.12 och 14.2.5 (finns i de flesta byar utan att ta timmar från mat och ved).` },
  { id: 'kunden', text: `Din del: KUNDEN. Varför köper ingen något? Följ en kunds väg i koden (kopbuffert.ts, kassa.ts erbjudandet/kundVal/stallIKo/koaKlar, ARBETEN-raden för att köpa, maltid, gastKund) och pröva i en sparad by med ett eget skript: vilka personer får ett erbjudande, vad är priset och nettot, vad är poängen mot att samla, och vad stoppar köpet (ingen disk, inga varor, priset, pungen, rummet)? Fungerar köpa i stället för att samla (14.1.15) så att den rika köper och den fattiga samlar? Kundernas val (14.1.9), kön och väntetiden (14.1.6), omdömena (14.1.10). Mål: 14.1.6, 14.1.8, 14.1.9, 14.1.10, 14.1.15.` },
  { id: 'agaren', text: `Din del: ÄGAREN, DE ANSTÄLLDA OCH SILVRET. Dagsarbetet (dagsarbete.ts, DAGSVERK, anstallDygn): anställs någon, vad är lönen och lönesamtalet, och följer det dokumentet? Anställer ägaren när hens timmar inte räcker (14.1.7)? Priset (konkurrens.ts): ändras det efter köp och avstående? Sälja och stänga (stangning.ts): varför är resultat exakt -3.24/-2.709 och företaget till salu (salu satt) fast det aldrig haft en kund, och säljs eller stängs det? Silvret: skapas eller försvinner silver, och är allt hela saker (inga decimaler i det som betalas eller fås)? Marknaden (14.1.14): kallas det till marknad, och handlar man där? Mål: 14.1.4, 14.1.7, 14.1.13, 14.1.14 och dokumentets Silvret.` },
  { id: 'verkan', text: `Din del: VERKAN OCH BILDEN. Gör varje verksamhet det den finns till för: serveringen ger en måltid (mat och humör), drycken en kvällsdryck, nattlogin en säng åt en gäst, stallet en plats åt ett djur, affären varor, städningen (14.1.2) ett renare och finare rum, finheten och förväntan (14.1.1, 14.1.3) tankar? Pröva med egna skript i en sparad by: tvinga fram ett köp om det behövs för att se verkan (bara i ditt skript), och säg vad som händer. Bilden: bygg spelet i ${W} med npm run build (ger samhallssimulatorn.html). Ladda en sparad by i sidan med Playwright (require('playwright') fungerar, chromium.launch() utan alternativ): se hur ${W}/src/test/utseende.ts eller granska.ts laddar en by i sidan, och använd window.__byn för state och kamera (cam.zoom, cam.x/y = ruta*16, layout()). Ta en testby med företag (t.ex. ${W}/test/facit-byar/1511-45.json.gz eller 4634-45.json.gz), zooma in på företagets hus, disken och varubordet, öppna företagets ruta och rummets ruta om det går, och ta 4–6 bilder med deviceScaleFactor 2 i ${BILDER}/ (skapa mappen). Titta på dem med Read. Bedöm som en spelare: syns det att huset är ett företag, vad det säljer, kön, disken, priset; går det att förstå varför ingen köper? Fältet kansla är det viktigaste. Lista bildernas sökvägar i fältet bilder.` },
  { id: 'koden', text: `Din del: KODEN. Läs commitarna för 14.1 med git -C ${W} show <commit> -- src: db851b1c (14.1.1) ea9e8ec6 (14.1.2) d353752e (14.1.3) d7407458 (14.1.4) dbc3b41b (14.1.5) eaa4586e (14.1.6) ff467259 (14.1.7) 8b2740f9 (14.1.8) d4e8671a (14.1.9) cf3b8349 (14.1.10) 81fa329d (14.1.11) 43dcf1a7 00637449 cbf42b27 (14.1.12) 5854fe25 (14.1.13) 467eb0a0 (14.1.14) 0902b574 (14.1.15). Leta efter fel, gaffatejp, chanser per slag eller anrop i stället för per tid, system som inte går genom TAKTER, skillnad mellan levande läge och ikappräkning, hårda regler om människornas val (bara/alltid/aldrig/högst/först…sedan), egna vägar för byten i stället för samma regler för alla saker (13.9.9), nya handlingar utan färdighet (ovar i ACTS, 13.9.8), resurser i decimaler, arbetstider utanför riktlinjen, och kod som inte gör det dokumentet säger. Ange fil:rad för varje fel.` },
  { id: 'matt', text: `Din del: MÄTNINGEN ÖVER MÅNGA BYAR. Skriv ett skript (${W}/src/test/zz_fmatt.ts) som kör 12 byar från grundandet i 35 dygn (35 år i spelet) utan grafik på samma sätt som ${W}/src/test/balans.ts eller dynamik.ts startar sina byar (läs dem först och återanvänd deras sätt att skapa och stega en by; kör byarna en i taget eller med högst tre processer samtidigt), och skriv per by efter 10, 20 och 35 dygn: antal företag och verksamheter, när det första startade, om huset och disken finns och är i företagets rum, öppna verksamheter, sålt och intäkt (summerat), kunder i kö totalt, anställda (dagsarbeten för företaget), resultat och om det är till salu, stängt eller sålt, marknader, och byns timmar på mat och ved mot en körning av samma by med företagen avstängda om det går att stänga av dem utan att ändra koden (t.ex. med BALANS= ett balanstal; säg annars att det inte gick). Kör sedan "timeout 5400 npm run dynamik -- 12 35" (läs ${W}/src/test/dynamik.ts först) och jämför arbetsdelningen med det mål 14.2.5 säger. En sak i taget, i bakgrunden, och vänta. Spara utskrifterna i ${RAPP}/matt-fas14-foretag.txt och ${RAPP}/matt-fas14-dynamik.txt. Ta bort ditt zz_-skript efteråt.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `granska:${d.id}`, phase: 'Granska', schema: SCHEMA }),
  (r, d) => {
    if (!r) return null
    const fel = r.fel.filter(f => f.allvar === 'fel')
    if (!fel.length) return { del: d.id, r, domar: [] }
    return agent(`${BAKGRUND}\n\nDu är SKEPTIKER. Granskaren för ${d.id} fann felen nedan. Försök själv motbevisa varje fel: läs koden, räkna i inspelningarna, kör ett litet skript om det behövs. Säg haller=true bara när koden eller siffrorna visar felet. Säg om lösningen är gaffatejp (och skriv i så fall en lösning i systemet), och om det egentligen är ett balanstal. Lösningen ska vara exakt: fil, funktion, formel eller balanstal från och till.\n\nFelen:\n${fel.map((f, i) => `${i + 1}. ${f.titel}: ${f.beskrivning}\n   Orsak: ${f.orsak}\n   Lösning: ${f.losning}`).join('\n')}`,
      { label: `prova:${d.id}`, phase: 'Pröva', schema: DOM }).then(v => ({ del: d.id, r, domar: v ? v.domar : [] }))
  })
return resultat.filter(Boolean)
