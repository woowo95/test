export const meta = {
  name: 'eftertest15',
  description: 'Efter 15.1 (varld 784ab940): striden, affären, djuren och vården testas om mot de förra testerna, och en skeptiker per del prövar varje fynd',
  phases: [
    { title: 'Testa', detail: 'fyra testare, en del var, mäter samma sak som förra gången' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa varje fel' },
  ],
}

const W = '/home/user/wf-e15'
const R = '/home/user/test/granskning/workflow/rapporter'
const BILDER = '/home/user/test/granskning/workflow/rapporter/bilder-e15'

const SCHEMA = {
  type: 'object',
  properties: {
    sammanfattning: { type: 'string' },
    kansla: { type: 'string', description: 'hur det känns för en spelare nu, några meningar' },
    battre: { type: 'string', description: 'bättre, sämre eller lika mot förra testet, med siffrorna före och efter' },
    siffror: { type: 'string', description: 'de viktigaste siffrorna, så att nästa test kan jämföra' },
    steg: { type: 'array', description: 'ett per steg i din lista', items: { type: 'object', properties: {
      steg: { type: 'string', description: 'stegets nummer, t.ex. 15.1.66' },
      verkar: { type: 'string', enum: ['ja', 'delvis', 'nej', 'ej mätt', 'inte byggt'] },
      bevis: { type: 'string', description: 'det som ska synas enligt steget, och vad mätningen visade' } },
      required: ['steg', 'verkar', 'bevis'] } },
    fel: { type: 'array', items: { type: 'object', properties: {
      titel: { type: 'string' }, beskrivning: { type: 'string' }, orsak: { type: 'string', description: 'fil:rad' },
      allvar: { type: 'string', enum: ['fel', 'fult', 'smasak'] },
      losning: { type: 'string', description: 'som en systemändring: fil, funktion, formel, balanstal från och till' } },
      required: ['titel', 'beskrivning', 'orsak', 'allvar', 'losning'] } },
    bilder: { type: 'array', items: { type: 'string' }, description: 'sökvägar till skärmbilder som visar det viktigaste' },
  },
  required: ['sammanfattning', 'kansla', 'battre', 'siffror', 'steg', 'fel'],
}
const DOM = {
  type: 'object',
  properties: { domar: { type: 'array', items: { type: 'object', properties: {
    titel: { type: 'string' }, haller: { type: 'boolean' },
    varfor: { type: 'string', description: 'vad i koden eller mätningen som visar det (fil:rad, siffror)' },
    gaffatejp: { type: 'boolean' }, losning: { type: 'string', description: 'lösningen som systemändring, rättad om det behövs' },
    balans: { type: 'boolean', description: 'är det egentligen ett balanstal, och hör till fasens Balans' },
    bjorn: { type: 'boolean', description: 'är det ett designbeslut som Björn måste ta' } },
    required: ['titel', 'haller', 'varfor', 'gaffatejp', 'losning', 'balans', 'bjorn'] } } },
  required: ['domar'],
}

const BAKGRUND = `Du testar om Samhällssimulatorn (en by i den nordiska järnåldern) efter att nästan hela steg 15.1 i Färdplanen byggts. Svara på svenska.
Koden (grenen varld, commit 784ab940) ligger i ${W} med node_modules. ÄNDRA INGA FILER under src/, test/ eller bildstil/. Egna skript läggs som ${W}/src/test/zz_*.ts och tas bort efteråt; kör dem med node --import tsx. Läs ${W}/ARKITEKTUR.md för att hitta filerna. De sparade testbyarna ligger i ${W}/test/facit-byar (byarna 1, 1511 och 4634 vid olika dygn, gz-JSON; läs med lasBy i src/test/delby.ts, stega med step i ../sim). De kan ha sparats av en äldre version: stega dem några dygn med den nya koden innan du mäter det som byggts, och säg det när något i byn kommer från före rättningen.
Det förra testet av din del står i ${R} (filen nedan). Läs det först: mät samma saker på samma sätt, så att siffrorna går att jämföra, och säg för varje siffra om det blivit bättre, sämre eller lika.
Stegen i Färdplanen läses med ToolSearch "select:mcp__Claude_Docs__read" och read med ref {object:'node', id:'a9cc2e7b-e289'}, container {kind:'project', id:'McP5446XiGQaJ3hbs9YXrc'} och payload {kind:'search', pattern:'^15\\\\.1\\\\.66 '} (byt numret). Andra flikar: Människan 8a49fa38-f44f, Samhället cdfbe33f-786f, Världen 732feac8-86ac, Bygga odla och äta 7615db37-c94c. Skriv aldrig i dokumentet. Pröva för varje steg i din lista det som steget säger ska synas: verkar det i byarna, inte bara i stegets scenario? Ett steg som inte är bockat i Färdplanen är 'inte byggt'.
Tunga körningar: kör aldrig npm run koll, likhet, balans, jamfor, dynamik eller TESTDYGN. npm run strid, npm run hus, npm run scenario och egna skript som tar mer än en minut körs med flock /tmp/wf-tung.lock <kommando>, så att bara ett körs åt gången på datorn.
Tid: en minut riktig tid är ungefär sex timmar i spelet, ett dygn riktig tid ett år. Skriv tider i riktig tid och säg vad det blir i spelet.
Skärmbilder (bara om din del ber om det): npm run build i ${W} ger samhallssimulatorn.html; ladda en sparad by i sidan med Playwright (require('playwright'), chromium.launch(), deviceScaleFactor 2) och spara bilderna i ${BILDER} (mkdir -p). Ta bara bilder i dagsljus, och titta själv på dem innan du lämnar dem.
Varje fel ska vara grundat (fil:rad och siffror ur en egen mätning), och lösningen så exakt att en programmerare inte kan misstolka den: fil, funktion, regel som formel, balanstal från och till. Lösningen är ett system eller ett balanstal, aldrig en regel som tvingar fram ett utfall. Allt räknas per tid, aldrig per slag. Ta inte med det som redan står som ett obyggt steg i Färdplanen.`

const DELAR = [
  { id: 'strid', text: `Din del: STRIDEN. Förra testen: ${R}/stridstest-feb4b3f.md och ${R}/stridstest-31a9d2a.md, och mätningarna ${R}/matt-feb4b3f-strid.txt. Kör npm run strid -- 16 35 (16 byar i 35 dygn, ca 3 min datortid, med flock) och mät som förra gången: anfallens längd, striderna, döda, svårt skadade, flydda, hur ofta slagen träffar, blodet när man faller, och hur fort rövaren plundrar. Stegen: 15.1.57–15.1.72 (flocken, gömda, hjälparna, vården nära fienden, vakten, blodet, dörren, rikedomen, plundringen, latthet och skyddet, de blodtörstiga, knuffen, stenarna, hjälparna kastar, rövarnas bågar och slungor) och 15.1.151–15.1.153 (stridsvärdet). Björns mål: striderna ska vara farliga med fler allvarliga skador och ibland döda, men inte för korta; kläderna avgör mycket; rövaren plundrar fort; mer rörelse och avstånd i striden. Ta två skärmbilder av en strid i dagsljus om det går.` },
  { id: 'affar', text: `Din del: AFFÄREN, SILVRET OCH FÖRETAGEN. Förra testet: ${R}/affarstest-fas14.md och ${R}/matt-fas14-foretag.txt. Mät i de sparade byarna stegade framåt: när företag startar, vad de säljer, köpen vid disken per dygn, gästerna och vad de köper, hur mycket silver som finns hos byborna och i världens rader, silvergruvorna (töms de, bryts de av alla byar, kommer silvret hem), priserna i silver, marknaden, anställningarna och ägarens timmar. Stegen: 15.1.10–15.1.29 och 15.1.154–15.1.157. Björns mål: inga byar har silver från början, silvret kommer bara ur gruvorna och sprids långsamt genom handeln, allt som går att köpa för silver går också att byta, och alla betalar helst med silver när de har det. Ta en skärmbild av en affär med varor och kunder om det går.` },
  { id: 'djur', text: `Din del: DJUREN OCH BOSKAPEN. Förra testet: ${R}/djurtest-7488f1f.md och ${R}/djurtest-7488f1f-underlag.md. Inspelningsskriptet från förra gången ligger i /home/user/test/granskning/workflow/djurin.ts: kopiera det till ${W}/src/test/zz_djur.ts och kör det (med flock) på 1511-10 i 25 dygn och 4634-15 i 30 dygn, och mät hararna (flockOf och faglarOf har de andra arterna), jakten (sökvändor per försök), fisket (rikedomen där de fiskar, napp), tamdjuren (köp, par, födda, klippt, hagar, herdarnas timmar), vargarna (tar de tamdjur, skrämmer hunden dem) och björnen. Stegen: 15.1.129–15.1.150 och 15.1.164–15.1.170. Ta en skärmbild av djur i en hage om det går.` },
  { id: 'vard', text: `Din del: VÅRDEN, OLYCKORNA OCH DÖDEN. Förra testet: ${R}/vardtest-73a4455.md. Skada personer i sparade byar som förra gången (en skråma 0,02, ett medelsår 0,3, ett stort 0,6) och följ blodet, vården och infektionen. Räkna i de sparade byarna stegade framåt hur många som dör och av vad (strid, blod, infektion, olycka, sjukdom, barn, ålder, svält, kyla). npm run vard ska gå att köra. Stegen: 15.1.101–15.1.113 (trycket, förbandet, levringen, en behandling i taget, infektionen, kroppens motstånd, dödsorsaken, vården kan misslyckas, ingen tärningsolycka, barnadödligheten, olyckorna dubbelt så vanliga). Björns mål: allvarliga skador och död ska vara möjliga och märkas, olyckorna dubbelt så vanliga, men byarna ska inte dö ut av det. Säg särskilt om något pekar mot att för många dör, eftersom det hör till fasens Balans.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `testa:${d.id}`, phase: 'Testa', schema: SCHEMA }),
  (r, d) => {
    if (!r) return null
    const fel = r.fel.filter(f => f.allvar !== 'smasak')
    if (!fel.length) return { del: d.id, r, domar: [] }
    return agent(`${BAKGRUND}\n\nDu är SKEPTIKER för delen ${d.id}. Testaren fann felen nedan. Försök själv motbevisa varje fel: läs koden, mät med ett litet skript. haller=true bara när koden eller mätningen visar felet. Säg om lösningen är gaffatejp (och skriv i så fall en lösning i systemet), om det egentligen är ett balanstal för fasens Balans, och om det är ett designbeslut som Björn måste ta.\n\nFelen:\n${fel.map((f, i) => `${i + 1}. ${f.titel}: ${f.beskrivning} Orsak: ${f.orsak}. Lösning: ${f.losning}`).join('\n')}`,
      { label: `prova:${d.id}`, phase: 'Pröva', schema: DOM }).then(v => ({ del: d.id, r, domar: v ? v.domar : [] }))
  })
return resultat.filter(Boolean)
