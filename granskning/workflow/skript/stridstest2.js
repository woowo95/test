export const meta = {
  name: 'stridstest-2',
  description: 'Stridstest 2 på fasb (v539): fem granskare (takt, taktik, koden, bilden, mätt) och en skeptiker per del med fel',
  phases: [
    { title: 'Granska', detail: 'fem granskare samtidigt' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa felen' },
  ],
}

const W = '/home/user/wf-fasb'
const INSP = '/home/user/test/granskning/workflow/insp/feb4b3f'
const BILDER = '/home/user/test/granskning/workflow/rapporter/bilder-feb4b3f'

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
Koden: den senaste grenen fasb (commit feb4b3fa, v539) ligger i ${W} med node_modules installerade. Läs ${W}/ARKITEKTUR.md för att hitta filerna (rovare.ts, strid*.ts, kartstrid.ts, roller.ts, blod.ts, byhandling.ts m.fl. under src/sim). ÄNDRA INGA FILER under ${W}/src eller ${W}/test; egna skript lägger du i ${W}/src/test/ med namn som börjar med zz_ (ta bort dem efteråt) eller i /tmp. Kör inga tunga tester (strid, trangsel, balans, koll, likhet, jamfor) om det inte är din uppgift; datorn har fyra kärnor, och ett annat test (affärstestet i /home/user/wf-fas14) kan köra samtidigt.

Tid: spelet följer klockan, en minut riktig tid är ungefär sex timmar i spelet. Skriv tider i riktiga sekunder/minuter och säg vad det blir i spelet.

Björns grund för striden: en sida vinner när den andra inte har någon kvar som slåss; kroppen avgör död och skada, modet avgör flykt; striderna ska vara långa och farliga (många allvarliga skador, ibland döda) och lätta att följa, utspridda och inte i en klunga; man flyr mycket sällan utan en ordentlig skada; mycket blod syns; nattanfall överraskar bara ibland och sällan; rikedomen avgör hur ofta och hur många rövare som kommer. Ingen gaffatejp (kod som tvingar fram ett resultat, ett särfall, ett villkor som nämner ett utfall); allt räknas per tid, aldrig en chans per slag eller anrop; människornas val kommer ur poäng och faktorer, inte hårda regler.

Stegen som byggts sedan förra stridstestet (B.58–B.71, commitarna 270341b9 2b0c4cd8 08217bc7 2e702e0d f170552f f5f9e53d 9f5cb922 a7ef625f b97afe26 d323586d dc0ce544 7b9da98e a85bcbb0; läs varje stegs text i designdokumentet om det behövs, Färdplanen avsnittet Brådskande):
B.58 rövaren vid förrådet prövas som gången (husgolv går att stå på) och tar från närmaste lediga ruta, så plundringen i ett hus inte låser sig; B.59 larmet gäller så länge gänget finns och hotar, en regel för vargar och rövare, och ingen varnar två gånger för samma gäng; B.60 om byns egna räcker räknas på alla som har larmet och kan slåss, en gång för alla samtidigt; B.61 flykten utan tillflykt väljer bland riktningar som går att gå, går aldrig närmare fienden och behåller hållet (ingen pendling); B.62 rövarnas namnskylt med hotmärket och egen färg; B.63 brottningen avgörs (slaget gör lika ont men såret blir litet); B.64 facklan syns lika långt på natten som gänget på dagen (ROVARE.fackelSer 1), så vakten ser nattgänget vid rastplatsen; B.65 modet sjunker bara av den del av ett sår som är över skråman (0,2), underläget och vännerna väger mindre (STRID.hot, modVan, smitta, ROVARE.flyHot, flyDoda sänkta), skadan per slag oförändrad: mål minst fyra av fem som flyr har ett sår på minst 0,2 eller blod under 0,85, striderna minst lika långa; B.66 avunden i viljan att plundra (plundraRik 3): mål minst hälften av 12 byar får ett gäng på 35 dygn, de rikaste flest; B.67 varje träff som öppnar ett sår lägger minst BLODET.minStank blod åt hållet slaget gick, och kroppen blir blodig i tre steg; B.68–B.70 fler vägar till rövarlägren, lägrets folk kan ge sig av, lägrets gäng går med lägrets egna vapen och skydd; B.71 npm run strid skriver gängens avsändare, vapen och storlek, rikedomen och gängen per by.

Förra stridstestets resultat (31a9d2a, före B.58): väntan före anfallet 1,1–4,2 min; dag sedd på väg, natt 3 av 4 sedda först vid eller efter anfallet; 4 av 7 anfall klara på 3,8–8,3 min, 3 av 7 låste sig i förrådshuset i timmar; 41 % / 45 % träffar; skada per träff median 0,01 (76 % av träffarna 0,01); man flydde efter 8–54 träffar (median 24); 1 död, 7 svårt skadade; 2 av 7 anfall utan strid i byn; i mätningen kom ett enda gäng till 12 byar på 35 dygn; 296 av 300 brottningar oavgjorda.

Inspelningarna (nya, fasb feb4b3fa) ligger i ${INSP}, en JSON per anfall: <by>_<timmar>h_<rövare>r.json. Byarna: 1-30 0,1 h 4 rövare; 4634-35 0,1 h 3; 1511-30 1,5 h 2; 1-40 0,1 h 10; 1511-25 0,1 h 6; 1-35 3 h 8; 4634-30 2,5 h 5 (ersätter 4634-25 som inte finns längre). Samma byar och tider som förra gången utom den sista, så jämför direkt. Filerna kan vara stora: läs dem med egna node- eller python-skript, inte med Read.
Formatet: {fil, timFram, antal, eld:{x,y}, slutT, namn:{id:namn}, frames:[{t, ljus, f:{gor,x,y,rast,vantat,anf,sedd(s efter ankomst),till,ut}, p:[{id, r(1=rövare), x,y, a(handling/fas eller rövarens gor), w(skäl), larm, ser(synhåll), k:{g(strid-id), l(läge), sd(sida), mal(pid), b(backar), h(håller), v(väntar), hj(hjälp), bl(blod), or(ork), mod}}]}], slag:[{t, st, ts, h(händelse), a, b(pid), g(skada), sl, v}], byLogg:[{t(s efter ankomst), text}]}. En bild var 5 s, och varje halv sekund under strid eller anfall; inspelningen slutar 4 timmar efter ankomsten. Inspelningsskriptet är ${W}/src/test/zz_sgin.ts.

Varje fel ska vara grundat (fil:rad och siffror), och lösningen så exakt att en programmerare inte kan misstolka den (fil, funktion, regel som formel, balanstal från och till).`

const DELAR = [
  { id: 'takt', text: `Din del: TAKTEN. Räkna i inspelningarna, per anfall: tiden från ankomst till att gänget syns (och på dag eller natt: ljus), till att alla är framme, till anfallet, till första slaget, stridens längd, och tills gänget är borta. Försök och träffar per person, träffprocent, skada per träff (median), hur många träffar man tål innan man flyr eller faller, döda och skadade. Hoppar eller skakar rörelsen (positioner som går fram och tillbaka, steg som är för långa på en halv sekund)? Tog något anfall över 4 timmar eller låste sig, och varför? Hur skadad är var och en som flydde (värsta sårets grad, blodet)? Uppfylls målet i B.65? Jämför med förra resultatet. Lägg dina skript i /tmp.` },
  { id: 'taktik', text: `Din del: TAKTIKEN. Följ varje anfall i inspelningarna (frames, byLogg, slag): när byn ser gänget och vem, om byn gör sig redo (vapen, rad, hjälpare, gömda), var raden står och om den är utspridd eller i en klunga, om någon står i ett hus eller på lagret, om hjälparna och de gömda står bort från hotet, vem som vinner och varför, om flykten kommer undan, om larmet går mer än en gång per person, om byn är tillbaka i arbete inom fem minuter efter att gänget gått, om nattanfallen överraskar (vem ser gänget, vakten och facklan), och varför ett anfall blev utan strid. Kontrollera varje mål i B.58–B.71 som går att se i inspelningarna, och blodet på marken (s.blod finns inte i inspelningen: kör en egen inspelning med zz_sgin.ts och räkna blodfläckarna om det behövs). Lägg dina skript i /tmp.` },
  { id: 'koden', text: `Din del: KODEN. Läs commitarna för B.58–B.71 med git -C ${W} show <commit> -- src (lista ovan) och koden runt dem. Leta efter fel, gaffatejp, chanser per slag eller anrop i stället för per tid, skillnad mellan levande läge och ikappräkning, hårda regler om människornas val (ord som bara/alltid/aldrig/högst), regler som bara en handling har, och sådant som är mer invecklat än det behöver vara. Jämför med designdokumentets mål i stegen ovan. Ange fil:rad för varje fel.` },
  { id: 'bilden', text: `Din del: BILDEN. Bygg spelet i ${W} med npm run build (ger samhallssimulatorn.html). Ladda en sparad by i sidan med Playwright (require('playwright') fungerar, chromium.launch() utan alternativ): by-delarna läggs i IndexedDB-databasen 'samhallssimulatorn', store 'delar', med nycklar 'egen/<del>' plus nyckeln 'egen' = {delar:[...]} (läs ${W}/src/ui/byar.ts, spara.ts och test/delby.ts / src/test för hur en by delas upp och hur utseende.ts gör; kanske finns en färdig hjälp), klockan med page.clock. Ta en sparad testby (t.ex. ${W}/test/facit-byar/1511-25.json.gz eller 1-35.json.gz), starta ett rövaranfall (se hur testknapparna eller rovarnaKommer startar ett i sidan; window.__byn ger tillgång till state och kamera), zooma in på striden via window.__byn (cam.zoom, cam.x/y = ruta*16, layout()) och ta en serie skärmbilder under anfallet: gänget på väg, raden som står redo, mitt i striden, flykten, efteråt. Spara 4–6 bilder med deviceScaleFactor 2 i ${BILDER}/ (skapa mappen) och titta på dem med Read. Bedöm som en spelare: syns vem som hör till vilken sida (rövarnas namnskylt B.62), syns blodet på marken och på kroppen (B.67), är striden lätt att följa, utspridd eller en klunga, namn som täcker varandra, något som ser konstigt ut. Fältet kansla är det viktigaste. Lista bildernas sökvägar i fältet bilder.` },
  { id: 'matt', text: `Din del: MÄTNINGARNA. Vänta först tills inget tungt test kör (affärstestet i /home/user/wf-fas14 kan köra npm run dynamik eller ett zz_fmatt-skript): kör till exempel 'until ! pgrep -f "dynamik|zz_fmatt|balans|jamfor|likhet" >/dev/null; do sleep 30; done' i bakgrunden och vänta på det. Kör sedan i ${W}, en i taget: först "timeout 3000 npm run strid -- 12 35" och sedan "timeout 3000 npm run trangsel" (läs ${W}/src/test/strid.ts och trangsel.ts först så att du vet vad de skriver). Starta dem med Bash i bakgrunden och vänta på dem utan att köra något annat tungt samtidigt. Spara utskrifterna i /home/user/test/granskning/workflow/rapporter/matt-feb4b3f-strid.txt och -trangsel.txt. Sammanfatta: antal strider per slag, sidor, längd, vem som vann, döda, skadade, flydde, gav upp, träffprocent, tiderna för varje gäng (kom → sågs → alla framme → anfall, dag och natt), gängens avsändare, storlek och vapen, gängen per by mot rikedomen (målet i B.66), hur skadade de som flydde var (målet i B.65), brottningen, trängseln. Jämför med förra resultatet ovan.` },
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
