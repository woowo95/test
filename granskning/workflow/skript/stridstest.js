export const meta = {
  name: 'stridstest',
  description: 'Stridstest på fasb: fem granskare (takt, taktik, koden, bilden, mätt) och en skeptiker per del med fel',
  phases: [
    { title: 'Granska', detail: 'fem granskare samtidigt' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa felen' },
  ],
}

const W = '/home/user/wf-fasb'
const INSP = '/home/user/test/granskning/workflow/insp/31a9d2a'
const BILDER = '/home/user/test/granskning/workflow/rapporter/bilder-31a9d2a'

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
      allvar: { type: 'string', enum: ['fel', 'fult', 'smasak'] }, losning: { type: 'string' } },
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
    losning: { type: 'string', description: 'lösningen som systemändring, rättad om det behövs' },
    balans: { type: 'boolean', description: 'är det egentligen ett balanstal och inte ett fel' } },
    required: ['titel', 'haller', 'varfor', 'gaffatejp', 'losning', 'balans'] } } },
  required: ['domar'],
}

const BAKGRUND = `Du granskar striden mot rövargäng i Samhällssimulatorn (svenska, järnåldersby). Svara på svenska.
Koden: den senaste grenen fasb (commit 31a9d2a) ligger i ${W} med node_modules installerade. Läs ${W}/ARKITEKTUR.md för att hitta filerna (rovare.ts, strid*.ts, roller.ts m.fl. under src/sim). ÄNDRA INGA FILER under ${W}/src eller ${W}/test; egna skript lägger du i ${W}/src/test/ med namn som börjar med zz_ eller i /tmp. Kör inga tunga tester (strid, balans, koll, likhet, jamfor) om det inte är din uppgift; datorn har fyra kärnor och en annan granskare kör mätningarna.

Tid: spelet följer klockan, en minut riktig tid är ungefär sex timmar i spelet. Skriv tider i riktiga sekunder/minuter och säg vad det blir i spelet.

Björns grund för striden: en sida vinner när den andra inte har någon kvar som slåss; kroppen avgör död och skada, modet avgör flykt; strider ska vara farliga och lätta att följa, utspridda och inte i en klunga; ingen gaffatejp (kod som tvingar fram ett resultat i stället för att systemen ger det, ett särfall, ett villkor som nämner ett utfall); allt räknas per tid, aldrig en chans per slag eller anrop; människornas val kommer ur poäng och faktorer, inte hårda regler.

Stegen som byggts sedan förra stridstestet (B.43–B.57, commitarna f9ad000 7df8e44 50704b8 4d351d0 33ab416 bc617e8 c435272 58b6a66 66bae34 e6f8974 31a9d2a):
B.43 rövarna vilar på land och tas aldrig bort som om de kommit hem; B.44 väntan på rastplatsen gäller bara rövare som är på väg; B.45 den som flyr får gå förbi en fiende om avståndet inte minskar (inte fast i en bur av tre fiender); B.46 larmet räknas bara medan det är färskt, byn är tillbaka i arbete inom fem minuter efter att gänget gått; B.47 en enda regel för om de egna räcker (motVilja), ingen kämpe väntar på väntplatsen när ingen mer kommer; B.48 hotet vägs in i väntplatsen, gömslet och platsen för vård; B.49 raden står på fri mark, var och en i sin ruta, plundrarna på var sin ruta; B.50 den som ingen slår mot går till en vän som blöder; B.51 varje bybo varnar högst en gång för samma gäng; B.52 bara den som anfalls där hen står kan överraskas, och då värjer hen sig inte mot första slaget (slaget blir inte tyngre); B.53 gräl blir slagsmål efter modet; B.55 småfel (platsen vid målet, hjälparnas rad, vapen reserveras bara när bättre); B.56 mätningen skriver tiderna för varje gäng; B.57 chansen att se gänget växer ju närmare det är jämfört med synhållet (som följer ljuset), bara för den som är vaken och ute; på dagen ses gänget oftast på väg, på natten ofta först vid rastplatsen eller anfallet, och ett snabbt nattanfall kan överraska.
Äldre mål (B.27–B.35): kort väntan före anfallet, ungefär en till fem minuter efter att alla kommit fram; byn gör sig redo efter larmet; flykten kommer undan; övermakten väger i viljan; raden vänds mot gängets håll och hoppar inte; de som inte når fram byter mål eller står lugnt; rövarna syns som rövare.

Förra stridstestets resultat (före B.43): gänget syns 4–31 s efter ankomsten, anfaller efter 3,1–5,5 min, hela anfallet 7–13 min; 41–48 % träffar, medianskada per träff 0,01, man flyr efter 13–32 träffar; 1 av 12 föll av kroppen, ingen dog; 3 av 7 anfall utan strid.

Inspelningarna (nya, fasb 31a9d2a) ligger i ${INSP}, en JSON per anfall: <by>_<timmar>h_<rövare>r.json. Byarna: 1-30 0,1 h 4 rövare; 4634-35 0,1 h 3 (ersätter 4634-30 som inte finns längre); 1511-30 1,5 h 2; 1-40 0,1 h 10; 1511-25 0,1 h 6; 1-35 3 h 8; 4634-25 2,5 h 5. OBS: 1-40 och 4634-25 nådde inspelningens gräns på 4 timmar (14400 s) innan anfallet tog slut, och 1-30 hade ingen strid alls. Filerna är stora (upp till 15 MB): läs dem med egna node-skript, inte med Read.
Formatet: {fil, timFram, antal, eld:{x,y}, slutT, namn:{id:namn}, frames:[{t, ljus, f:{gor,x,y,rast,vantat,anf,sedd(s efter ankomst),till,ut}, p:[{id, r(1=rövare), x,y, a(handling/fas eller rövarens gor), w(skäl), larm, ser(synhåll), k:{g(strid-id), l(läge), sd(sida), mal(pid), b(backar), h(håller), v(väntar), hj(hjälp), bl(blod), or(ork), mod}}]}], slag:[{t, st, ts, h(händelse), a, b(pid), g(skada), sl, v}], byLogg:[{t(s efter ankomst), text}]}. En bild var 5 s, och varje halv sekund under strid eller anfall. Inspelningsskriptet är ${W}/src/test/zz_sgin.ts.`

const DELAR = [
  { id: 'takt', text: `Din del: TAKTEN. Räkna i inspelningarna, per anfall: tiden från ankomst till att gänget syns (och på dag eller natt: ljus), till att alla är framme, till anfallet, till första slaget, stridens längd, och tills gänget är borta. Försök och träffar per person, träffprocent, skada per träff (median), hur många träffar man tål innan man flyr eller faller, döda och skadade. Hoppar eller skakar rörelsen (positioner som går fram och tillbaka, steg som är för långa på en halv sekund)? Varför tog 1-40 och 4634-25 över 4 timmar: vad gör gänget och byn då? Jämför med förra resultatet. Lägg dina skript i /tmp.` },
  { id: 'taktik', text: `Din del: TAKTIKEN. Följ varje anfall i inspelningarna (frames, byLogg, slag): när byn ser gänget och vem, om byn gör sig redo (vapen, rad, hjälpare, gömda), var raden står och om den är utspridd eller i en klunga, om någon står i ett hus eller på lagret, om hjälparna och de gömda står bort från hotet, vem som vinner och varför, om flykten kommer undan, om larmet går mer än en gång per person, om byn är tillbaka i arbete inom fem minuter efter att gänget gått, och varför 1-30 blev utan strid. Kontrollera varje mål i B.43–B.57 som går att se i inspelningarna. Lägg dina skript i /tmp.` },
  { id: 'koden', text: `Din del: KODEN. Läs commitarna för B.43–B.57 med git -C ${W} show <commit> -- src (lista ovan) och koden runt dem. Leta efter fel, gaffatejp, chanser per slag eller anrop i stället för per tid, skillnad mellan levande läge och ikappräkning, hårda regler om människornas val (ord som bara/alltid/aldrig/högst), regler som bara en handling har, och sådant som är mer invecklat än det behöver vara. Jämför med designdokumentets mål i stegen ovan. Ange fil:rad för varje fel.` },
  { id: 'bilden', text: `Din del: BILDEN. Bygg spelet i ${W} med npm run build (ger samhallssimulatorn.html). Ladda en sparad by i sidan med Playwright (require('playwright') fungerar, chromium.launch() utan alternativ): by-delarna läggs i IndexedDB-databasen 'samhallssimulatorn', store 'delar', med nycklar 'egen/<del>' plus nyckeln 'egen' = {delar:[...]} (läs ${W}/src/ui/byar.ts, spara.ts och test/delby.ts / src/test för hur en by delas upp och hur utseende.ts gör; kanske finns en färdig hjälp), klockan med page.clock. Ta en sparad testby (t.ex. ${W}/test/facit-byar/1511-25.json.gz eller 1-35.json.gz), starta ett rövaranfall (se hur testknapparna eller rovarnaKommer startar ett i sidan; window.__byn ger tillgång till state och kamera), zooma in på striden via window.__byn (cam.zoom, cam.x/y = ruta*16, layout()) och ta en serie skärmbilder under anfallet: gänget på väg, raden som står redo, mitt i striden, flykten, efteråt. Spara 4–6 bilder med deviceScaleFactor 2 i ${BILDER}/ (skapa mappen) och titta på dem med Read. Bedöm som en spelare: syns vem som hör till vilken sida, är striden lätt att följa, utspridd eller en klunga, namn som täcker varandra, något som ser konstigt ut. Fältet kansla är det viktigaste. Lista bildernas sökvägar i fältet bilder.` },
  { id: 'matt', text: `Din del: MÄTNINGARNA. Kör i ${W}, en i taget: först "timeout 3000 npm run strid -- 12 35" och sedan "timeout 3000 npm run trangsel" (läs ${W}/src/test/strid.ts och trangsel.ts först så att du vet vad de skriver). Starta dem med Bash i bakgrunden och vänta på dem utan att köra något annat tungt samtidigt. Spara utskrifterna i /home/user/test/granskning/workflow/rapporter/matt-31a9d2a-strid.txt och -trangsel.txt. Sammanfatta: antal strider per slag, sidor, längd, vem som vann, döda, skadade, flydde, gav upp, träffprocent, tiderna för varje gäng (kom → sågs → alla framme → anfall, dag och natt), trängseln. Jämför med förra resultatet ovan.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `granska:${d.id}`, phase: 'Granska', schema: SCHEMA }),
  (r, d) => {
    if (!r) return null
    const fel = r.fel.filter(f => f.allvar === 'fel')
    if (!fel.length) return { del: d.id, r, domar: [] }
    return agent(`${BAKGRUND}\n\nDu är SKEPTIKER. Granskaren för ${d.id} fann felen nedan. Försök själv motbevisa varje fel: läs koden, räkna i inspelningarna, kör ett litet skript om det behövs. Säg haller=true bara när koden eller siffrorna visar felet. Säg om lösningen är gaffatejp (och skriv i så fall en lösning i systemet), och om det egentligen är ett balanstal.\n\nFelen:\n${fel.map((f, i) => `${i + 1}. ${f.titel}: ${f.beskrivning}\n   Orsak: ${f.orsak}\n   Lösning: ${f.losning}`).join('\n')}`,
      { label: `prova:${d.id}`, phase: 'Pröva', schema: DOM }).then(v => ({ del: d.id, r, domar: v ? v.domar : [] }))
  })
return resultat.filter(Boolean)
