export const meta = {
  name: 'djurtest',
  description: 'Djuren och boskapen (varld 7488f1f3, v542): fem granskare (det vilda och jakten, rovdjuren, tamdjuren, djurens ekonomi, bilden och koden) och en skeptiker per del',
  phases: [
    { title: 'Granska', detail: 'fem granskare samtidigt' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa felen' },
  ],
}

const W = '/home/user/wf-djur'
const INSP = '/home/user/test/granskning/workflow/insp/djur'
const BILDER = '/home/user/test/granskning/workflow/rapporter/bilder-djur'

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
    bilder: { type: 'array', items: { type: 'string' }, description: 'sökvägar till de bästa skärmbilderna, om några' },
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

const BAKGRUND = `Du granskar djuren och boskapen i Samhällssimulatorn (en by i den nordiska järnåldern). Svara på svenska.
Koden (den senaste grenen varld, commit 7488f1f3, v542) ligger i ${W} med node_modules. ÄNDRA INGA FILER under src/, test/ eller bildstil/. Egna små skript läggs som ${W}/src/test/zz_*.ts och tas bort efteråt. Läs ${W}/ARKITEKTUR.md för att hitta filerna: djur.ts (de vilda: harar, kallade kaniner i koden, flockarna rådjur och vildsvin i FLOCKARTER, fåglarna, björnen, djurOf), jakt.ts, fisk.ts, varg.ts, bjorn.ts, rovdjursjakt.ts, djurflykt.ts, tamdjur.ts (TAMDJUR: hund, får, get, ko, oxe, häst m.fl.), hage.ts, hons.ts, slatter.ts, djurtorst.ts, mjölken och ullen, slakten och styckningen, packdjuren i resa och handel, och fas 14:s stall och djurhandel (verksamheter.ts). De sparade testbyarna ligger i ${W}/test/facit-byar (byarna 1, 1511 och 4634 vid olika dygn; läs dem med lasBy i ${W}/src/test/delby.ts och stega med step ur ../sim).
Läget i testbyarna: tama djur är sällsynta. By 1511 har en get, en oxe och ett får vid dygn 10 och inga tama djur alls vid dygn 30; by 4634 har ett får och en hage vid dygn 15 och ett får och en ko vid dygn 45; by 1 har aldrig något tamt djur på 40 dygn. Byarna jagar mycket harar (by 1: 116 fångster på 40 dygn) och möter björnen några gånger.
Inspelningarna ligger i ${INSP} (skriptet ${W}/src/test/zz_djur.ts): 1511-10_25d.json (by 1511 från dygn 10 i 25 dygn), 4634-15_30d.json (by 4634 från dygn 15 i 30 dygn) och 1-20_15d.json (by 1 från dygn 20 i 15 dygn). Vänta på dem om de inte finns: until [ -s ${INSP}/4634-15_30d.json ]; do sleep 60; done (i bakgrunden). Formatet: {frames:[{t (s), dag, folk, vilda:{art:antal}, tama:{art:{n, hunger, svalt, agd, ute}}, hagar, hons, vargar:[{n, gor, hunger}], gor:{handling:antal personer}}], timmar:{person:{handling: timmar riktig tid}}, skotsel:{person: färdighet}, statDiff:{räknare: ökning}, byLogg:[{t (dygn), text}]}. En prov var 600 s riktig tid.
Tunga körningar: kör aldrig npm run koll, likhet, balans, jamfor, dynamik eller TESTDYGN. Ett eget skript som tar mer än en minut körs med flock /tmp/wf-tung.lock <kommando>.
Tid: spelet följer klockan, en minut riktig tid är ungefär sex timmar i spelet, ett dygn riktig tid ett år. Skriv tider i riktig tid och säg vad det blir i spelet.
Designdokumentet: Claude Docs, projektet McP5446XiGQaJ3hbs9YXrc. Läs med ToolSearch "select:mcp__Claude_Docs__read" och read med ref {object:'node', id:<flik>}, container {kind:'project', id:'McP5446XiGQaJ3hbs9YXrc'} och payload {kind:'search', pattern:'<ord>'}. Flikarna: Världen 732feac8-86ac (bestar, landskapet, värmekartor), Bygga, odla och äta 7615db37-c94c (tamdjuren, hagen, foder, slakt, mjölk), Människan 8a49fa38-f44f (jakt, arbete, ekonomi), Samhället cdfbe33f-786f, Färdplan a9cc2e7b-e289 (stegen 9.8.*, 10.10.*, 11.11.*, 6.6.* m.fl.). Skriv aldrig i dokumentet. Jämför alltid det dokumentet säger med det koden gör.
Björns regler: systemen avgör vad människorna gör (poäng och register, inga hårda regler som "bara", "alltid", "högst"); allt räknas per tid, aldrig per slag; varje ny handling har sin färdighet; allt byts efter samma regler; en sak är klar först när den gör det den finns till för; inga resurser i decimaler.
Varje fel ska vara grundat (fil:rad och siffror ur inspelningen eller en egen mätning), och lösningen så exakt att en programmerare inte kan misstolka den: fil, funktion, regel som formel, balanstal från och till. Lösningen ska vara ett system eller ett balanstal, aldrig en regel som tvingar fram ett utfall.`

const DELAR = [
  { id: 'vilda', text: `Din del: DET VILDA OCH JAKTEN. Harar, rådjur, vildsvin, fåglar och fisk. Räkna i inspelningarna och med egna skript på sparade byar: hur många djur det finns över tid nära byn, om bestånden växer tillbaka (värmekartorna och FYND) eller jagas ut eller exploderar, hur ofta jakten och fisket lyckas per timme, vad fällor, fångstgropar, spjut, båge och slunga gör, om djuren flyr rimligt, och om köttet och skinnen är värda tiden jämfört med att samla och odla. Varför syns bara harar i djurOf i de sparade byarna: finns rådjur, vildsvin och fåglar?` },
  { id: 'rovdjur', text: `Din del: ROVDJUREN. Vargen och björnen. Hur ofta kommer de, anfaller de människor eller tamdjur, och vad händer: vakthunden, hagen, dörren, vargskyddet, larmet och jakten på dem (rovdjursjakt.ts). Spela in ett vargbesök och ett björnmöte själv i en sparad by med tamdjur (t.ex. 4634-45 eller 1511-10), med ett eget zz-skript som startar besöket som testerna gör (läs scenarierna varg, vakthund, djurfara, bjornmote och bjornjakt i src/test/scenarier). Är det farligt nog, och gör skyddet nytta?` },
  { id: 'tama', text: `Din del: TAMDJUREN I VARDAGEN. Tämjning, ungar och avel, hagen, fähuset och krubban, foder och vatten, slåttern och höet inför vintern, mjölkning, klippning, ägg, sjukdom och död. Följ varje tamdjur i inspelningarna 1511-10 och 4634-15: när det kom, vem som skötte det och hur många timmar (timmar och skotsel), om det svalt eller törstade, och varför det försvann (slaktades, dog, rymde, såldes?). Svara uttryckligen: finns det herdar, alltså personer som lägger en stor del av sin tid på djuren? Det avgör steg 13.9.12. Och varför får by 1 aldrig några tamdjur på 40 dygn?` },
  { id: 'ekonomi', text: `Din del: DJURENS EKONOMI OCH VERKAN. Lönar det sig att hålla djur jämfört med att jaga och samla (kött, mjölk, ull, ägg, dragkraft mot foder och tid)? Byts mjölk, ull, kött och levande djur efter samma regler som allt annat (13.9.9)? Vem äger mjölken, ullen och ungarna (steg 13.9.12 säger att mjölken ska vara djurets ägares)? Används packdjur och dragdjur på resor och vid vagnen? Gör stallet och djurhandeln från fas 14 något (verksamheter.ts)? Kontrollera varje djurs rad i TAMDJUR: gör varje egenskap (mjolk, ull, spark, mod, tam, foder, bete, liv) något i koden?` },
  { id: 'bilden', text: `Din del: BILDEN OCH KODEN. (1) Bygg spelet i ${W} med npm run build. Ladda en sparad by med tamdjur och en hage (t.ex. ${W}/test/facit-byar/4634-45.json.gz eller 1511-10.json.gz) i sidan med Playwright (require('playwright') fungerar, chromium.launch() utan alternativ): by-delarna läggs i IndexedDB-databasen 'samhallssimulatorn', store 'delar', med nycklar 'egen/<del>' plus nyckeln 'egen' = {delar:[...]} (läs ${W}/src/ui/byar.ts, spara.ts och src/test/utseende.ts för hur en by laddas), och klockan med page.clock. window.__byn ger state och kamera (cam.zoom, cam.x/y = ruta*16, layout()). Ta 4–6 skärmbilder med deviceScaleFactor 2 i ${BILDER}/ (skapa mappen): tamdjuren i hagen, ett djur som sköts (mjölkas eller matas), djurets ruta när man trycker på det, vilda djur nära byn, och gärna en varg eller björn. Titta på dem med Read och bedöm som en spelare: syns vad djuren gör, ser de ut att röra sig rimligt, är rutan begriplig (symboler först), något som ser konstigt ut? (2) Gå igenom koden för djuren: chanser per slag eller anrop i stället för per tid (TAKTER), skillnad mellan levande läge och ikappräkning, hårda regler om människornas val, handlingar med djur utan färdighet (ovar i ACTS, skötsel), och saker som räknas i decimaler. Lista bildernas sökvägar i fältet bilder.` },
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
