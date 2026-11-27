export const meta = {
  name: 'texttest',
  description: 'Texterna och berättelserna (varld 73a44558): fem läsare tar bort onaturliga omskrivningar och skriver nya varianter som säger olika saker, och en redaktör per del prövar varje förslag',
  phases: [
    { title: 'Läs', detail: 'fem läsare, en del av texterna var' },
    { title: 'Redigera', detail: 'en redaktör per del prövar varje borttagning och varje ny variant' },
  ],
}

const W = '/home/user/wf-v3'
const INSP = '/home/user/test/granskning/workflow/insp/v3'

const FORSLAG = {
  type: 'object',
  properties: {
    sammanfattning: { type: 'string' },
    kansla: { type: 'string', description: 'hur texterna känns att läsa för en spelare, några meningar' },
    fel: { type: 'array', description: 'språkfel och ologiska texter', items: { type: 'object', properties: {
      mall: { type: 'string' }, rad: { type: 'string', description: 'fil:rad' }, text: { type: 'string', description: 'texten som den står, eller ett ifyllt exempel ur texter.txt' },
      vad: { type: 'string', description: 'vad som är fel' }, ratt: { type: 'string', description: 'den rättade texten, ordagrant' } },
      required: ['mall', 'rad', 'text', 'vad', 'ratt'] } },
    bort: { type: 'array', description: 'varianter som bara säger samma sak som en annan variant i samma mall med andra ord, eller låter onaturligt', items: { type: 'object', properties: {
      mall: { type: 'string' }, rad: { type: 'string', description: 'fil:rad för varianten' }, variant: { type: 'string', description: 'variantens text ordagrant ur koden' },
      samma: { type: 'string', description: 'den variant i mallen som säger samma sak och får stå kvar, ordagrant' }, varfor: { type: 'string' } },
      required: ['mall', 'rad', 'variant', 'samma', 'varfor'] } },
    nya: { type: 'array', description: 'nya varianter som säger något annat om händelsen än de som finns', items: { type: 'object', properties: {
      mall: { type: 'string' }, rad: { type: 'string', description: 'fil:rad där mallen står' },
      t: { type: 'string', description: 'den nya variantens text, med {fält} som i mallen' },
      om: { type: 'string', description: 'villkoret som kod på fälten f (som de andra varianterna), eller tom om den alltid passar' },
      falt: { type: 'string', description: 'fälten den använder: finns de redan i Fyllning/mallens fält, eller är det ett nytt fält, och var i simuleringen värdet finns (fil:rad)' },
      sager: { type: 'string', description: 'det nya den säger, som ingen annan variant i mallen säger' } },
      required: ['mall', 'rad', 't', 'om', 'falt', 'sager'] } },
    regler: { type: 'array', items: { type: 'string' }, description: 'förslag på regler för registret som skulle ge bättre texter (t.ex. om kravet på minst åtta varianter)' },
  },
  required: ['sammanfattning', 'kansla', 'fel', 'bort', 'nya', 'regler'],
}
const DOM = {
  type: 'object',
  properties: {
    fel: { type: 'array', items: { type: 'object', properties: { nr: { type: 'integer' }, haller: { type: 'boolean' }, ratt: { type: 'string', description: 'den rättade texten, rättad igen om det behövs' }, varfor: { type: 'string' } }, required: ['nr', 'haller', 'ratt', 'varfor'] } },
    bort: { type: 'array', items: { type: 'object', properties: { nr: { type: 'integer' }, haller: { type: 'boolean' }, varfor: { type: 'string' } }, required: ['nr', 'haller', 'varfor'] } },
    nya: { type: 'array', items: { type: 'object', properties: { nr: { type: 'integer' }, haller: { type: 'boolean' }, t: { type: 'string', description: 'texten, förbättrad om det behövs' }, om: { type: 'string' }, falt: { type: 'string' }, varfor: { type: 'string' } }, required: ['nr', 'haller', 't', 'om', 'falt', 'varfor'] } },
  },
  required: ['fel', 'bort', 'nya'],
}

const BAKGRUND = `Du arbetar med texterna i Samhällssimulatorn, ett spel om en by i den nordiska järnåldern. Allt på svenska.
Koden (den senaste grenen varld, commit 73a44558) ligger i ${W}. ÄNDRA INGA FILER under src/, test/ eller bildstil/. Egna små skript läggs som ${W}/src/test/zz_*.ts och tas bort efteråt. Läs ${W}/ARKITEKTUR.md (raderna om berattelser.ts, ord.ts, historik.ts, personlogg.ts, notiser.ts, framber.ts, matchber.ts och handelsber.ts).
Registret BERATTELSER (src/sim/berattelser.ts): mall-id → varianter, en variant är en text eller {t, om} med ett villkor på fälten f. Varianten väljs ur byns frö, personen och tiden. {namn} och andra fält fylls i ur Fyllning. ord.ts gör om tal och listor till ord.
Underlaget: ${INSP}/texter.txt (npm run texter, 8 byar i 45 dygn): för varje mall hur ofta den användes, hur ofta varje variant valdes, ifyllda exempel och de varianter som aldrig valdes. ${INSP}/texter.json har kontrollerna (textkoll.ts). Finns filen inte än, vänta på den (until [ -s ${INSP}/texter.txt ]; do sleep 30; done).
Tunga körningar: kör aldrig npm run koll, likhet, balans, jamfor, dynamik eller TESTDYGN. Ett eget skript som tar mer än en minut körs med flock /tmp/wf-tung.lock <kommando>, så att bara ett körs åt gången på datorn.

Björn vill att texterna blir mer intressanta, mer detaljerade och mer varierade. Varierade betyder att varianterna säger OLIKA SAKER, inte samma sak med andra ord. I dag är många varianter bara omskrivningar av samma påstående, och då blir språket onaturligt. Ett exempel ur koden (berattelser.ts:963–970, byns första smedja): "{namn} byggde byns första smedja", "Nu hade byn en smedja. Det var {namn} som byggde den.", "Byns första smedja stod klar, och det var {namn} som byggt den." säger alla samma sak. Bättre är varianter som säger olika saker om händelsen: vad det betydde för byn, vad som hände sedan, vem som var där, hur det kändes, vad det kostade, vad någon sa, ett sinnesintryck (ljud, lukt, ljus), årstiden och vädret, eller en följd. Grunden ska vara sann i spelet: en variant får bara påstå det som fälten eller simuleringen visar, och ett villkor (om) gör att den bara väljs när det stämmer. Undantaget är texterna om konst (målningar, ristningar, mästerverk, kväden) och om tron (gudarna, riterna, bönerna, de heliga platserna och tingen, drömmar och tecken): de får vara mer abstrakta och säga det spelet inte räknar med, som en bild, en känsla, en tolkning eller vad de troende tror. Men de får aldrig påstå något vars motsats är sann i spelet (en gud som byn inte har, en färg som målningen inte har, en död som lever, en årstid som inte är nu).
Tre uppgifter för din del:
1. FEL: språkfel och ologiska texter (fel kasus, han/hon, "och och", ord som upprepas, en text som säger något som inte stämmer, till exempel "vid elden" när ingen eld brinner). Ge den rättade texten ordagrant.
2. BORT: de varianter som bara säger samma sak som en annan variant i samma mall och låter onaturliga eller konstlade. Behåll den mest naturliga; den som ska bort står ordagrant, och den som står kvar också. Ta inte bort det som säger något eget, och lämna minst två varianter i varje mall.
3. NYA: nya varianter som säger något annat än de som finns, med villkor när de bara stämmer ibland. Säg vilka fält de använder: fält som redan finns (läs hur mallen fylls i koden), eller ett nytt fält med var i simuleringen värdet finns (fil:rad). Skriv naturlig svenska, som en berättare vid elden, kort och konkret; inga moderna ord, inga upprepningar, och ingen variant som bara byter ord i en annan. Hellre färre och bättre än många. Sikta på tre till sex nya per mall som används ofta (se texter.txt), och de viktigaste mallarna först: de som spelaren läser mest (krönikan, personens beskrivning, loggen, notiserna).
Ge också REGLER: förslag på hur registret eller kontrollerna (textkoll.ts) borde fungera för att få bättre texter, till exempel om kravet att varje mall ska ha minst åtta varianter driver fram omskrivningar.
Läs koden noga: rad och mall ska stämma, och den nya texten ska passa i mallens fält. Svara på svenska.`

const DELAR = [
  { id: 'personen', text: `Din del: src/sim/berattelser.ts raderna 145–700 (MDEF från början: öknamnen, personen, beskrivningen) och BESK_DELAR, och koden som fyller i dem (raderna 2533–3010).` },
  { id: 'handelser', text: `Din del: src/sim/berattelser.ts raderna 700–1400 i MDEF (händelserna i byn), och koden som väljer dem.` },
  { id: 'byn', text: `Din del: src/sim/berattelser.ts raderna 1400–2134 i MDEF, och krönikan (raderna 3011–3043) och mästerverken (3044–3151).` },
  { id: 'loggen', text: `Din del: src/sim/berattelser.ts raderna 2134–2502 (loggens vanligaste rader, steg 6.7.7, och mallarna från de nya systemen, steg 12.1.135), samtalens ämnen (3152–3243) och relationerna (3244–3311). Loggen är det spelaren läser oftast.` },
  { id: 'ovriga', text: `Din del: texterna utanför BERATTELSER: src/sim/personlogg.ts (personloggen), notiser.ts (notiserna), historik.ts (krönikan och dess rader), framber.ts, matchber.ts och handelsber.ts. Där kan "mall" vara registrets namn och radens id.` },
]

const resultat = await pipeline(DELAR,
  d => agent(`${BAKGRUND}\n\n${d.text}`, { label: `las:${d.id}`, phase: 'Läs', schema: FORSLAG }),
  (r, d) => {
    if (!r) return null
    const lista = (a, f) => a.map((x, i) => `${i + 1}. ${f(x)}`).join('\n') || '(inga)'
    return agent(`${BAKGRUND}\n\nDu är REDAKTÖR för delen ${d.id}. Läsaren föreslog det nedan. Pröva varje förslag mot koden och texter.txt och säg haller=true bara när det verkligen förbättrar texterna:
- FEL: är det ett verkligt fel, och är rättelsen naturlig svenska som passar fälten?
- BORT: säger varianten verkligen samma sak som den som står kvar, och blir mallen bättre utan den? Står minst två varianter kvar?
- NYA: säger den något som ingen annan variant i mallen säger? Är den sann i spelet (fälten finns eller går att räkna fram ur simuleringen, villkoret stämmer)? För konst och tro räcker det att motsatsen inte är sann i spelet. Är det naturlig svenska som en berättare skulle säga? Förbättra texten om det behövs, och skriv villkoret som kod på fälten.\n\nFEL:\n${lista(r.fel, x => `[${x.mall} ${x.rad}] "${x.text}" → "${x.ratt}" (${x.vad})`)}\n\nBORT:\n${lista(r.bort, x => `[${x.mall} ${x.rad}] "${x.variant}" (står kvar: "${x.samma}") ${x.varfor}`)}\n\nNYA:\n${lista(r.nya, x => `[${x.mall} ${x.rad}] "${x.t}" om: ${x.om || '(alltid)'} fält: ${x.falt} säger: ${x.sager}`)}`,
      { label: `redigera:${d.id}`, phase: 'Redigera', schema: DOM }).then(v => ({ del: d.id, r, domar: v }))
  })
return resultat.filter(Boolean)
