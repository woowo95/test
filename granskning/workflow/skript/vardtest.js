export const meta = {
  name: 'vardtest',
  description: 'Vården och döden (varld 73a44558): fem granskare (blödningen, vårdvalen, sjukdomarna, olyckorna och dödsorsakerna, koden) och en skeptiker per del',
  phases: [
    { title: 'Granska', detail: 'fem granskare samtidigt' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa felen' },
  ],
}

const W = '/home/user/wf-v3'

const SCHEMA = {
  type: 'object',
  properties: {
    sammanfattning: { type: 'string' },
    kansla: { type: 'string', description: 'hur det känns för en spelare, några meningar' },
    siffror: { type: 'string', description: 'de viktigaste siffrorna, så att nästa granskning kan jämföra' },
    mal: { type: 'array', items: { type: 'object', properties: { steg: { type: 'string' }, uppfyllt: { type: 'string', enum: ['ja', 'delvis', 'nej', 'ej mätt'] }, bevis: { type: 'string' } }, required: ['steg', 'uppfyllt', 'bevis'] } },
    fel: { type: 'array', items: { type: 'object', properties: {
      titel: { type: 'string' }, beskrivning: { type: 'string' }, orsak: { type: 'string', description: 'fil:rad' },
      allvar: { type: 'string', enum: ['fel', 'fult', 'smasak'] }, losning: { type: 'string', description: 'som en systemändring: fil, funktion, formel, balanstal från och till' } },
      required: ['titel', 'beskrivning', 'orsak', 'allvar', 'losning'] } },
  },
  required: ['sammanfattning', 'kansla', 'siffror', 'mal', 'fel'],
}
const DOM = {
  type: 'object',
  properties: { domar: { type: 'array', items: { type: 'object', properties: {
    titel: { type: 'string' }, haller: { type: 'boolean' }, varfor: { type: 'string', description: 'vad i koden eller mätningen som visar det (fil:rad, siffror)' },
    gaffatejp: { type: 'boolean' }, losning: { type: 'string', description: 'lösningen som systemändring, rättad om det behövs' },
    balans: { type: 'boolean', description: 'är det egentligen ett balanstal och inte ett fel' }, bjorn: { type: 'boolean', description: 'är det ett designbeslut som Björn måste ta' } },
    required: ['titel', 'haller', 'varfor', 'gaffatejp', 'losning', 'balans', 'bjorn'] } } },
  required: ['domar'],
}

const BAKGRUND = `Du granskar vården, skadorna, sjukdomarna och döden i Samhällssimulatorn (en by i den nordiska järnåldern). Svara på svenska.
Koden (den senaste grenen varld, commit 73a44558) ligger i ${W} med node_modules. ÄNDRA INGA FILER under src/, test/ eller bildstil/. Egna små skript läggs som ${W}/src/test/zz_*.ts och tas bort efteråt. Läs ${W}/ARKITEKTUR.md för att hitta filerna (halsa.ts med HALSA, SKADOR, VARD och vardVal, sjukdom.ts, kropp, strid.ts, kartstrid.ts, blod.ts). npm run vard listar vårdregistret (1 s). De sparade testbyarna ligger i ${W}/test/facit-byar (byarna 1, 1511 och 4634 vid olika dygn, gz-komprimerad JSON; läs dem med lasBy i ${W}/src/test/delby.ts, stega med step i ../sim, och se hur ett zz-skript gör i ${W}/src/test/zz_*.ts om något finns, annars src/test/detaljer.ts). Skada en person med skada(s, p, del, typ, grad, orsak, när) i halsa.ts för att följa vad som händer.
Tunga körningar: kör aldrig npm run koll, likhet, balans, jamfor, dynamik eller TESTDYGN. Ett eget skript som tar mer än en minut körs med flock /tmp/wf-tung.lock <kommando>.
Tid: spelet följer klockan, en minut riktig tid är ungefär sex timmar i spelet, ett dygn riktig tid ett år. Skriv tider i riktig tid och säg vad det blir i spelet.

Björns mål: striderna ska vara farliga, med många allvarliga skador och ibland döda. I stridstestet (fasb v539, fyra strider) dog ingen. 13 bybor blev svårt skadade, och alla som föll gjorde det vid blod 0,67–0,70 (HALSA.slass 0,7), medan man förblöder under HALSA.blodDod 0,4. Bara 5,7 % av träffarna var minst 0,2 (STRID.latt 0,02 och latthet 15). Små sår levrar sig (HALSA.levrar, smaSar, medelLevrar), och i striden blöder såren gånger HALSA.stridBlod 0,5. Steg som redan ligger i Färdplanen: 15.1.39 (latthet 15 → 8, och skyddet avgör) och 15.1.40 (den blodtörstiga hugger den som ligger). Ta reda på resten: är vården för snabb eller för bra, förblöder man för långsamt, och vad händer med den svårt skadade efter striden?
Designdokumentet: Claude Docs, projektet McP5446XiGQaJ3hbs9YXrc. Läs med ToolSearch "select:mcp__Claude_Docs__read" och read med ref {object:'node', id:'8a49fa38-f44f'} (fliken Människan, där Hälsa och strid står), container {kind:'project', id:'McP5446XiGQaJ3hbs9YXrc'} och payload {kind:'search', pattern:'<ord>'}. Skriv aldrig i dokumentet.
Varje fel ska vara grundat (fil:rad och siffror ur en egen mätning), och lösningen så exakt att en programmerare inte kan misstolka den: fil, funktion, regel som formel, balanstal från och till. Lösningen ska vara ett system eller ett balanstal, aldrig en regel som tvingar fram ett utfall. Allt räknas per tid, aldrig per slag eller anrop.`

const DELAR = [
  { id: 'blodningen', text: `Din del: BLÖDNINGEN. Skada personer i sparade byar med sår av olika grad och typ (en skråma 0,02, ett medelsår 0,3, ett stort 0,6, flera skråmor på samma del), också mitt i ett arbete och under en strid, och följ blodet per minut tills hen läkt, vårdats eller dött. Mät: hur fort varje sorts sår blöder, när det levrar sig, hur lång tid det tar från blod 0,7 till 0,4, och hur många skråmor som behövs för att förblöda. Jämför med vad dokumentet säger om blödningen (Blödningen i detalj). Är det för långsamt för att någon ska dö efter en strid?` },
  { id: 'varden', text: `Din del: VÅRDVALEN. Följ vem som vårdar den svårt skadade efter en strid och hur fort: skada tre personer svårt i en sparad by och se vem som kommer, efter hur lång tid, med vad (förband, avsnörning, sömnad), och om den som vårdar har materialet och färdigheten. Läs vardVal och VARD (npm run vard). Är vården för snabb, för säker eller för bra jämfört med dokumentet? Får den som ingen vårdar dö?` },
  { id: 'sjukdomen', text: `Din del: SJUKDOMARNA, INFEKTIONERNA OCH FÖRLOSSNINGARNA. Läs sjukdom.ts, infektionerna i halsa.ts och förlossningen. Mät i sparade byar (stega några dygn) hur ofta någon blir sjuk, får en infektion eller dör av det, och jämför med dokumentet. Leta efter chanser per slag eller per anrop i stället för per tid, och efter sjukdomar eller infektioner som aldrig dödar eller alltid dödar.` },
  { id: 'dodsorsaker', text: `Din del: OLYCKORNA OCH DÖDSORSAKERNA. Läs OLYCKOR i halsa.ts och dödsorsakerna i byns statistik. Räkna i de sparade testbyarna (statistiken och krönikan) hur många som dött och av vad, och vilka olyckor som skett i arbetet. Är någon dödsorsak omöjlig i praktiken eller alldeles för vanlig? Kommer döden bara från svält och kyla och nästan aldrig från strid, olyckor och sjukdom?` },
  { id: 'koden', text: `Din del: KODEN. Gå igenom halsa.ts (skada, blodning, läkningen, vardVal, VARD), sjukdom.ts och blod.ts. Leta efter fel, chanser per slag eller anrop i stället för per tid, skillnad mellan levande läge och ikappräkning, hårda regler om människornas val (ord som bara, alltid, aldrig, högst), behandlingar utan färdighet (ovar i ACTS), och sådant som gör att den svårt skadade nästan aldrig dör.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `granska:${d.id}`, phase: 'Granska', schema: SCHEMA }),
  (r, d) => {
    if (!r) return null
    const fel = r.fel.filter(f => f.allvar === 'fel')
    if (!fel.length) return { del: d.id, r, domar: [] }
    return agent(`${BAKGRUND}\n\nDu är SKEPTIKER. Granskaren för ${d.id} fann felen nedan. Försök själv motbevisa varje fel: läs koden, mät med ett litet skript. Säg haller=true bara när koden eller mätningen visar felet. Säg om lösningen är gaffatejp (och skriv i så fall en lösning i systemet), om det egentligen är ett balanstal, och om det är ett designbeslut som Björn måste ta.\n\nFelen:\n${fel.map((f, i) => `${i + 1}. ${f.titel}: ${f.beskrivning} Orsak: ${f.orsak}. Lösning: ${f.losning}`).join('\n')}`,
      { label: `prova:${d.id}`, phase: 'Pröva', schema: DOM }).then(v => ({ del: d.id, r, domar: v ? v.domar : [] }))
  })
return resultat.filter(Boolean)
