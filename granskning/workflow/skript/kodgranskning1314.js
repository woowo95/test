export const meta = {
  name: 'kodgranskning1314',
  description: 'Fas 13 och 14 (varld 7978df68): fem granskare letar buggar, död kod, optimeringar och system som går att slå ihop, och en skeptiker per del prövar varje fynd',
  phases: [
    { title: 'Granska', detail: 'fem granskare, en del av koden var' },
    { title: 'Pröva', detail: 'skeptiker försöker motbevisa varje fynd' },
  ],
}

const W = '/home/user/wf-gr'
const B = '83199587~1'   // commiten före fas 13
const E = '7488f1f3'     // fas 14 klar (v542)

const FYND = {
  type: 'object',
  properties: {
    sammanfattning: { type: 'string' },
    siffror: { type: 'string', description: 'mätningar som nästa granskning kan jämföra med (kostnad, rader, räknare)' },
    fynd: { type: 'array', items: { type: 'object', properties: {
      slag: { type: 'string', enum: ['bugg', 'dod', 'optimering', 'sammanslagning', 'gaffatejp', 'dokument'] },
      titel: { type: 'string' },
      plats: { type: 'string', description: 'fil:rad (alla ställen)' },
      beskrivning: { type: 'string', description: 'vad som är fel eller onödigt, och hur det märks i spelet' },
      bevis: { type: 'string', description: 'en verklig väg dit: mätning i en sparad by, ett scenario eller grep som visar att ingen läser koden' },
      losning: { type: 'string', description: 'exakt: fil, funktion, vad som tas bort, slås ihop eller ändras, balanstal från och till' },
      andrarSpelet: { type: 'boolean', description: 'ändrar lösningen hur byarna utvecklas (annars ska npm run samma vara lika)' },
      rader: { type: 'integer', description: 'ungefär hur många rader lösningen tar bort (negativt om den lägger till)' } },
      required: ['slag', 'titel', 'plats', 'beskrivning', 'bevis', 'losning', 'andrarSpelet', 'rader'] } },
  },
  required: ['sammanfattning', 'siffror', 'fynd'],
}
const DOM = {
  type: 'object',
  properties: { domar: { type: 'array', items: { type: 'object', properties: {
    nr: { type: 'integer' }, haller: { type: 'boolean' },
    varfor: { type: 'string', description: 'vad i koden eller mätningen som visar det (fil:rad, siffror)' },
    losning: { type: 'string', description: 'lösningen, rättad om det behövs, så exakt att en programmerare inte kan misstolka den' },
    andrarSpelet: { type: 'boolean' },
    dokument: { type: 'boolean', description: 'går koden emot designdokumentet (då byggs systemet om efter dokumentet)' },
    bjorn: { type: 'boolean', description: 'är det ett designbeslut eller en hård regel som Björn måste godkänna' } },
    required: ['nr', 'haller', 'varfor', 'losning', 'andrarSpelet', 'dokument', 'bjorn'] } } },
  required: ['domar'],
}

const BAKGRUND = `Du gör kodgranskningen av fas 13 och 14 i Samhällssimulatorn (en by i den nordiska järnåldern, TypeScript). Svara på svenska.
Koden (grenen varld, commit 7978df68) ligger i ${W} med node_modules. ÄNDRA INGA FILER under src/, test/ eller bildstil/. Egna mätskript läggs som ${W}/src/test/zz_*.ts och tas bort efteråt; kör dem med node --import tsx. Läs ${W}/ARKITEKTUR.md (filerna och de åtta reglerna) och ${W}/GRANSKNING.md (vad du letar efter). Det som byggts i fas 13 och 14 visar git -C ${W} diff ${B} ${E} -- <filer>, och git -C ${W} log --oneline ${B}..${E} -- <fil> visar stegen. De sparade testbyarna ligger i ${W}/test/facit-byar (byarna 1, 1511 och 4634 vid olika dygn, gz-JSON; läs med lasBy i src/test/delby.ts, stega med step i ../sim). npm run kostnad (några sekunder) visar datortiden per system i TAKTER. npm run talen visar balanstalen.
Tunga körningar: kör aldrig npm run koll, likhet, balans, jamfor, dynamik, snabbkoll eller TESTDYGN. Ett eget skript som tar mer än en minut, och npm run scenario, körs med flock /tmp/wf-tung.lock <kommando>, så att bara ett körs åt gången.
Tid: en minut riktig tid är ungefär sex timmar i spelet, ett dygn riktig tid ett år.
Björn vill ha: buggfixar, optimering, borttagen död kod och system som slås ihop, i det som programmerades i fas 13 och 14. Leta efter:
- BUGG: fel, kantfall, NaN, negativa förråd, decimaler i saker, platser som pekar fel, slump utan rätt ström, chanser per slag eller anrop i stället för per tid, skillnad mellan levande läge och ikappräkning, sparfält utan migrate.
- DOD: funktioner, fält, exporter, registerrader och balanstal som ingen läser (bevisa med grep), mekanismer som aldrig slår till i byarna (räkna i s.stat i sparade byar).
- OPTIMERING: det som kostar datortid i onödan (npm run kostnad, loopar över hela kartan eller alla personer i varje slag, samma sak räknad flera gånger). Lösningen ska ge exakt samma spel.
- SAMMANSLAGNING: två system, register, funktioner eller tal som gör samma sak (t.ex. två register för samma sak, två vägar för byten, samma tal på två ställen). Säg vilket som blir kvar.
- GAFFATEJP: hårda regler om människornas val ("bara", "högst", "en i taget", "först … sedan") och kod som tvingar fram ett resultat.
- DOKUMENT: kod som inte gör det designdokumentet säger. Designdokumentet läses med ToolSearch "select:mcp__Claude_Docs__read", read med ref {object:'node', id:<flik>}, container {kind:'project', id:'McP5446XiGQaJ3hbs9YXrc'} och payload {kind:'search', pattern:'<ord>'}. Flikarna: Färdplan a9cc2e7b-e289, Människan 8a49fa38-f44f, Samhället cdfbe33f-786f, Världen 732feac8-86ac, Bygga odla och äta 7615db37-c94c, Spelaren och bilden 4da7159f-9102. Skriv aldrig i dokumentet.
Varje fynd ska vara grundat: fil:rad, och ett bevis (grep, mätning eller scenario). Lösningen så exakt att en programmerare inte kan misstolka den. Hellre färre och säkra fynd än många gissningar. Ta inte med det som redan står som steg i Färdplanen (sök på funktionens namn i fliken Färdplan först) och inte det som djurtestet redan lagt i 15.1.129–15.1.150.`

const DELAR = [
  { id: 'foretag', text: `Din del: företagen och ekonomin (fas 14). src/sim/foretag.ts, foretagsgast.ts, kassa.ts, affar.ts, verksamheter.ts, foretagsrykte.ts, stangning.ts, tjara.ts, marknad.ts, kopbuffert.ts, konkurrens.ts, dagsarbete.ts, forvantan.ts, fardfolk.ts, gruva.ts och de ändrade delarna av behov.ts och handel.ts. Steg 14.1.x och 15.1.1–15.1.29 beskriver dem. Leta särskilt efter två vägar för samma byte eller pris, och register som kunde vara ett.` },
  { id: 'strid', text: `Din del: striden, rövarna och kläderna (ändrade i fas 13). src/sim/strid.ts, rovare.ts, kartstrid.ts, varg.ts, lagervapen.ts, utrustning.ts, klader.ts, roller.ts och de ändrade delarna av halsa.ts. Leta särskilt efter flera räkningar för samma sak (vem som strider, skydd, flykt), och efter det som kostar datortid i striden.` },
  { id: 'valet', text: `Din del: valet av aktivitet och arbetet (ändrade i fas 13 och 14). src/sim/val.ts, steg.ts, handlingar.ts, kunna.ts, projekt.ts, forradsmal.ts, stationer.ts, mobler.ts, rum.ts, stada.ts, lager.ts, redskap.ts, teknik.ts, odling.ts, matlagning.ts, hamtning.ts. Kör npm run kostnad och gå igenom listan uppifrån. Leta särskilt efter rader i ARBETEN som är särfall av andra rader, och efter det som räknas om i varje val.` },
  { id: 'byn', text: `Din del: byggnaderna, världen och samhället (ändrade i fas 13 och 14). src/sim/byggnader.ts, byggplan.ts, bildsten.ts, grav.ts, varme.ts, flyttskal.ts, byflytt.ts, trangsel.ts, barsele.ts, is.ts, skog.ts, eld.ts, brann.ts, farg.ts, saker.ts, typer.ts, seder.ts, styre.ts, religion.ts, liv.ts, uppvaxt.ts, berattelser.ts, historik.ts, framtradande.ts, gast.ts, fisk.ts, folk.ts. Leta särskilt efter sparfält utan migrate och efter registerrader som ingen läser.` },
  { id: 'ui', text: `Din del: gränssnittet och testerna (ändrade i fas 13 och 14). src/ui/pergamentpryd.ts, timmerbild.ts, varldskarta.ts, radbryt.ts, folkbild.ts, namnskyltar.ts, husbild.ts, mark.ts, manniskor.ts, runstenar.ts, utseende.ts, foremal.ts och src/main.ts, och scenarierna och vakterna i src/test som ändrats i fasen (git diff --stat ${B} ${E} -- src/test). Leta efter ritning som görs om varje bildruta fast inget ändrats, gränssnitt som räknar fram det simuleringen redan har, död kod i ui, scenarier som går igenom oavsett vad koden gör, gränser i scenarier som sänkts för att få dem gröna (git log -p), och scenarier som överlappar och kan slås ihop.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `granska:${d.id}`, phase: 'Granska', schema: FYND }),
  (r, d) => {
    if (!r || !r.fynd.length) return { del: d.id, r, domar: [] }
    return agent(`${BAKGRUND}\n\nDu är SKEPTIKER för delen ${d.id}. Granskaren fann det nedan. Försök själv motbevisa varje fynd: läs koden, grep, mät med ett litet skript. haller=true bara när koden eller mätningen visar det. För död kod: grep hela src efter namnet, också i test och ui. För optimering: blir spelet exakt likadant? För sammanslagning: gör de två verkligen samma sak, och vad försvinner? Rätta lösningen om den är fel eller ger gaffatejp, och säg om koden går emot designdokumentet och om det är något Björn måste avgöra.\n\nFynden:\n${r.fynd.map((f, i) => `${i + 1}. [${f.slag}] ${f.titel} (${f.plats}): ${f.beskrivning} Bevis: ${f.bevis} Lösning: ${f.losning}`).join('\n')}`,
      { label: `prova:${d.id}`, phase: 'Pröva', schema: DOM }).then(v => ({ del: d.id, r, domar: v ? v.domar : [] }))
  })
return resultat.filter(Boolean)
