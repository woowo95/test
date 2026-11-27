export const meta = {
  name: 'dynamiktest',
  description: 'Byarna förändras (varld 73a44558): fyra granskare (mätningen, koden, krönikorna, dokumentet mot koden) letar efter det som drar mot mitten, och en skeptiker per del',
  phases: [
    { title: 'Granska', detail: 'fyra granskare samtidigt' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa felen' },
  ],
}

const W = '/home/user/wf-v3'
const INSP = '/home/user/test/granskning/workflow/insp/v3'

const SCHEMA = {
  type: 'object',
  properties: {
    sammanfattning: { type: 'string' },
    kansla: { type: 'string', description: 'hur det känns för en spelare att följa byarna över tid, några meningar' },
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
    titel: { type: 'string' }, haller: { type: 'boolean' }, varfor: { type: 'string', description: 'vad i koden eller siffrorna som visar det (fil:rad, siffror)' },
    gaffatejp: { type: 'boolean' }, losning: { type: 'string', description: 'lösningen som systemändring, rättad om det behövs' },
    balans: { type: 'boolean', description: 'är det egentligen ett balanstal och inte ett fel' }, bjorn: { type: 'boolean', description: 'är det ett designbeslut som Björn måste ta' } },
    required: ['titel', 'haller', 'varfor', 'gaffatejp', 'losning', 'balans', 'bjorn'] } } },
  required: ['domar'],
}

const BAKGRUND = `Du granskar hur byarna förändras över tid i Samhällssimulatorn (en by i den nordiska järnåldern). Svara på svenska.
Koden (den senaste grenen varld, commit 73a44558) ligger i ${W} med node_modules. ÄNDRA INGA FILER under src/, test/ eller bildstil/. Egna små skript läggs som ${W}/src/test/zz_*.ts och tas bort efteråt. Läs ${W}/ARKITEKTUR.md för att hitta filerna (seder.ts, styre.ts, tro- och kyrkfilerna, kultur, rykten.ts, humor.ts, teknik.ts, dynamik.ts och dynamik-en.ts under src/test m.fl.).
Tunga körningar: kör aldrig npm run koll, likhet, balans, jamfor, dynamik eller TESTDYGN. Ett eget skript som tar mer än en minut körs med flock /tmp/wf-tung.lock <kommando>.
Tid: ett dygn riktig tid är ett år i spelet, en minut ungefär sex timmar. Skriv ut vad ett tidsspann betyder.

Björns regel (CLAUDE.md, Byarna förändras): ingen by står still, och två byar ska få olika utvecklingskurvor och skilja sig mycket. Sederna, styret och tron är de stora, men allt ska kunna förändras. Extremer får finnas och märkas; mittenbyar får finnas men är inte normen, och ingen by fastnar i en extrem. Varningsflaggorna: ett snitt över alla där många människor blir grått, ett värde som återgår till ett grundvärde eller bleknar mot det neutrala, och en dragning som räknas ur avståndet till mitten. Bygg i stället minne, självförstärkning (kulturen förs vidare), motkrafter som kommer ur följderna med fördröjning, och stötar. Gränserna (designdokumentet, Gränserna för balansen): högst en tredjedel av byarna är mittenbyar i varje område, och något händer minst var tionde dygn (tio år i spelet).
Senaste mätningen (fas 14, Balansen 14.2.5, 70 dygn): mittenbyarna 6 % i Sederna och Styret och 31 % i Tron (mot 50 % i fas 13); gränserna bryts i hur länge Styret och Tron står still (12 och 16 av 16 byar).
Designdokumentet: Claude Docs, projektet McP5446XiGQaJ3hbs9YXrc. Läs med ToolSearch "select:mcp__Claude_Docs__read" och sedan read med ref {object:'node', id:<flikens nod>}, container {kind:'project', id:'McP5446XiGQaJ3hbs9YXrc'} och payload {kind:'search', pattern:'<ord>'}. Flikarnas noder: Samhället cdfbe33f-786f, Människan 8a49fa38-f44f, Spelaren och bilden 4da7159f-9102 (där står "Byarna förändras över tid"), Läget 88ea8163-75b8, Färdplan a9cc2e7b-e289. Skriv aldrig i dokumentet.
Varje fel ska vara grundat (fil:rad och siffror), och lösningen så exakt att en programmerare inte kan misstolka den: fil, funktion, regel som formel, balanstal från och till. Lösningen ska vara ett system (minne, självförstärkning, motkraft, stöt), aldrig en regel som tvingar fram ett utfall.`

const DELAR = [
  { id: 'matt', text: `Din del: MÄTNINGEN. npm run dynamik -- 12 70 körs just nu i ${W} och skriver ${INSP}/dynamik-12-70.txt (det tar ett par timmar). Vänta tills filen är klar: until grep -q "s datorns tid" ${INSP}/dynamik-12-70.txt 2>/dev/null; do sleep 60; done (kör det i bakgrunden och vänta). Läs sedan resultatet och jämför med gränserna och med fas 14:s mätning ovan. Läs dynamik.ts och dynamik-en.ts för att förstå varje tal. Svara: hur många mittenbyar i varje område, hur olika byarna är, hur länge varje by står still i varje område och vad som faktiskt rör sig, och vilka byar som fastnat i en extrem. Leta upp i koden varför det som står still står still.` },
  { id: 'koden', text: `Din del: KODEN. Gå igenom systemen för sederna, styret, tron och kyrkan, kulturen, ryktena, humöret och teknikerna, och leta efter varningsflaggorna: värden som dras mot ett grundvärde eller mot 0,5 eller 10, glömska som bleknar mot det neutrala, snitt över alla bybor som gör byn grå, dragningar som räknas ur avståndet till mitten, och tak och golv som håller allt i mitten. För varje fynd: fil:rad, vad det gör med en by över tid, och vilket system som borde ersätta det (minne, självförstärkning, motkraft med fördröjning, stöt).` },
  { id: 'kronikan', text: `Din del: KRÖNIKORNA. De sparade testbyarna ligger i ${W}/test/facit-byar (byarna 1, 1511 och 4634 vid olika dygn, gz-komprimerad JSON; läs dem med lasBy i ${W}/src/test/delby.ts i ett eget zz-skript). Läs krönikan (historik), sederna, styret, tron och teknikerna i varje by vid varje sparat dygn. Svara: skiljer sig byarna från varandra, ändras de över tid, finns extremer, och kommer förändringarna ur följder och stötar eller bara ur slump? Ge exempel ur krönikorna, ordagrant. Leta upp i koden varför det som inte ändras inte ändras.` },
  { id: 'dokumentet', text: `Din del: DOKUMENTET MOT KODEN. Läs avsnittet "Byarna förändras över tid" i fliken Spelaren och bilden och avsnitten om sederna, styret och tron i fliken Samhället. För varje sak dokumentet säger om hur en by förändras (minne, självförstärkning, motkrafter, stötar, att kulturen förs vidare), kontrollera i koden om den finns och gör det dokumentet säger. Det som saknas eller gör något annat är ett fel i bygget.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `granska:${d.id}`, phase: 'Granska', schema: SCHEMA }),
  (r, d) => {
    if (!r) return null
    const fel = r.fel.filter(f => f.allvar === 'fel')
    if (!fel.length) return { del: d.id, r, domar: [] }
    return agent(`${BAKGRUND}\n\nDu är SKEPTIKER. Granskaren för ${d.id} fann felen nedan. Försök själv motbevisa varje fel: läs koden, kör ett litet skript om det behövs. Säg haller=true bara när koden eller siffrorna visar felet. Säg om lösningen är gaffatejp (och skriv i så fall en lösning i systemet), om det egentligen är ett balanstal, och om det är ett designbeslut som Björn måste ta.\n\nFelen:\n${fel.map((f, i) => `${i + 1}. ${f.titel}: ${f.beskrivning} Orsak: ${f.orsak}. Lösning: ${f.losning}`).join('\n')}`,
      { label: `prova:${d.id}`, phase: 'Pröva', schema: DOM }).then(v => ({ del: d.id, r, domar: v ? v.domar : [] }))
  })
return resultat.filter(Boolean)
