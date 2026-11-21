export const meta = {
  name: 'granska',
  description: 'Granskaren som spelar (steg 12.1.44): läsare går igenom underlaget från npm run granska, en del var, och varje fynd prövas mot koden',
  whenToUse: 'När ett system i Färdplanen är klart: kör först npm run granska och ge mappen som args.mapp',
  phases: [
    { title: 'Läs', detail: 'fem läsare, var och en med sina listor ur Att hitta felen' },
    { title: 'Pröva', detail: 'varje läsares fynd prövas mot koden innan det kommer med' },
  ],
}

// args: { mapp: underlagets mapp (npm run granska skriver den) }
const MAPP = args && args.mapp
if (!MAPP) throw new Error('args.mapp saknas: kör npm run granska först och ge mappen')

const FYND = {
  type: 'object',
  properties: {
    fynd: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          vad: { type: 'string', description: 'vad som hände, på svenska, en eller två meningar' },
          by: { type: 'string' }, vem: { type: 'string' }, nar: { type: 'string', description: 'klockslaget eller dygnet' },
          rader: { type: 'string', description: 'raderna i underlaget som visar det, ordagrant' },
          vanligt: { type: 'string', enum: ['en person', 'en by', 'de flesta byarna'] },
          orsak: { type: 'string', description: 'den troliga orsaken i koden: fil och funktion' },
          slag: { type: 'string', enum: ['grundregel', 'balanstal'], description: 'är rättelsen en grundregel för hur världen är, eller ett balanstal' },
        },
        required: ['vad', 'by', 'vem', 'nar', 'rader', 'vanligt', 'orsak', 'slag'],
      },
    },
  },
  required: ['fynd'],
}
const DOM = {
  type: 'object',
  properties: {
    domar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nr: { type: 'integer', description: 'fyndets nummer i listan, från 1' },
          bekraftat: { type: 'boolean', description: 'true bara om koden visar att det är ett verkligt fel, inte balans, slump eller något som är avsiktligt' },
          varfor: { type: 'string', description: 'vad i koden som visar det (fil:rad), eller varför det inte är ett fel' },
          orsak: { type: 'string', description: 'orsaken i koden, rättad efter prövningen' },
          rattelse: { type: 'string', description: 'kort: vad som skulle rättas, och var' },
          matbart: { type: 'boolean', description: 'går det att mäta, så att det kan bli en vakt i RIMLIGT eller FORMVAKTER' },
        },
        required: ['nr', 'bekraftat', 'varfor', 'orsak', 'rattelse', 'matbart'],
      },
    },
  },
  required: ['domar'],
}

const GEMENSAMT = `Du är en av granskarens läsare i Samhällssimulatorn (steg 12.1.44). Underlaget ligger i mappen ${MAPP}: läs först LASMIG.md, sedan by-*.md (och bilderna om din del gäller dem). Leta efter det som är ologiskt, inte det som är balans eller slump: en by som är fattig eller hungrig är inget fynd, men en hungrig person som går förbi maten är det. Varje fynd ska säga vad som hände, i vilken by, vem och när, raderna som visar det (ordagrant ur underlaget), hur vanligt det är, den troliga orsaken i koden (läs ARKITEKTUR.md för att hitta filen, och titta i koden) och om rättelsen är en grundregel eller ett balanstal. Hellre få säkra fynd än många osäkra. Rätta ingenting, ändra inga filer. Svara på svenska.`

const LASARE = [
  { id: 'skal', namn: 'Skäl, text och människorna', listor: 'Skäl och text: skälet stämmer inte med förråden eller läget; handlingen och skälet hör inte ihop; rutan säger en sak och personen gör en annan; en text som är ologisk, har fel ord för personen, nämner någon som är död som levande eller visar delar av en resurs; samma mening om och om igen. Människorna emellan: någon handlar tvärt emot sin personlighet eller sina relationer utan orsak; ett småbarn gör en vuxens arbete; en dom utan brott; en ledare som ingen valt; en tro eller sed som alla får samma dag.' },
  { id: 'val', namn: 'Valen och tiden', listor: 'Valen: många gör samma sak fast behovet är litet; ingen gör det som fattas mest; någon arbetar för ett behov som redan är fyllt; någon byter handling fram och tillbaka; någon är ledig större delen av dagen medan byn saknar något hen kan göra; ett arbete påbörjas och lämnas gång på gång. Tiden: ett arbete tar mycket längre eller kortare tid än Arbetstider säger (en liten sak 2–4 minuter, en stor sak högst 5, en station eller möbel 10–20, en tur att samla 3–10, i riktiga minuter); något som bara ska ta sekunder tar minuter; någon väntar på något som aldrig kommer.' },
  { id: 'rorelse', namn: 'Rörelsen och sakerna', listor: 'Rörelsen: någon står still länge mitt i ett arbete; går fram och tillbaka mellan två platser; går långt förbi en närmare källa; går hem tom eller ut full; fastnar; många står på samma ruta; någon står i vatten, i en vägg eller på en möbel. Sakerna: något hämtas och används inte; samma sak läggs ner och plockas upp; något ligger kvar ute och ruttnar bredvid ett lager med plats; ett förråd växer utan slut; ett redskap, en station eller ett hus byggs och används aldrig; något försvinner eller dyker upp utan att någon burit det.' },
  { id: 'kropp', namn: 'Kroppen och byn över tid', listor: 'Kroppen: någon är hungrig, törstig, fryser, är för varm eller skadad länge fast hjälpen finns inom räckhåll (mat i förrådet, kläder på hyllan, en ledig vårdare, en ledig bädd); någon sover ute bredvid sitt hus; någon arbetar med ett brutet ben. Byn över tid: ett system som aldrig används; ett projekt som aldrig blir klart; ett bygge som står påbörjat i flera dygn med material och händer; samma händelse gång på gång i krönikan eller notiserna; en teknik alla byar fastnar vid. Vakternas larm i underlaget är ledtrådar: pröva dem mot raderna.' },
  { id: 'bild', namn: 'Panelerna och bilden', listor: 'Titta på bilderna i bilder/ och bilder/flikar/ (Read visar dem) och läs form.txt (vakterna för formen). Panelerna: två ställen visar olika tal för samma sak; en lista saknar det kartan visar; en symbol saknas eller är fel; text som inte ryms eller gömmer något. Bilden: saker ritade på varandra; möbler framför dörren; någon bär något annat än rutan säger; något ritas på fel ruta eller i fel storlek; något som finns syns inte, eller syns fast det är borta. Leta också efter det som uppenbart kan göras snyggare, på datorn och i mobilen, i ljust och mörkt läge. Formvakternas larm är redan listade; ta bara med det som de inte fångar, eller det viktigaste av dem.' },
]

const resultat = await pipeline(
  LASARE,
  l => agent(`${GEMENSAMT}\n\nDin del: ${l.namn}. Det du letar efter:\n${l.listor}`, { label: `läs:${l.id}`, phase: 'Läs', schema: FYND }),
  (r, l) => {
    const fynd = (r && r.fynd) || []
    if (!fynd.length) return { lasare: l.id, fynd: [], domar: [] }
    return agent(`Du prövar fynd från granskarens läsare (${l.namn}) i Samhällssimulatorn mot koden, innan de går till Björn. Underlaget ligger i ${MAPP}. Försök för varje fynd visa att det INTE är ett verkligt fel: att raderna inte säger det, att det är balans eller slump, att det är avsiktligt enligt koden eller designen, eller att orsaken är en annan. Läs koden (ARKITEKTUR.md säger vilken fil som gör vad) och raderna i underlaget. Sätt bekraftat=true bara när koden visar felet. Rätta ingenting och ändra inga filer. Svara på svenska.\n\nFynden:\n${fynd.map((f, i) => `${i + 1}. ${f.vad} (by ${f.by}, ${f.vem}, ${f.nar}; ${f.vanligt}; orsak enligt läsaren: ${f.orsak}; ${f.slag})\n   Raderna: ${f.rader}`).join('\n')}`, { label: `pröva:${l.id}`, phase: 'Pröva', schema: DOM })
      .then(d => ({ lasare: l.id, fynd, domar: (d && d.domar) || [] }))
  },
)

const lista = []
for (const r of resultat.filter(Boolean)) for (const d of r.domar) { const f = r.fynd[d.nr - 1]; if (f && d.bekraftat) lista.push({ ...f, lasare: r.lasare, varfor: d.varfor, orsak: d.orsak, rattelse: d.rattelse, matbart: d.matbart }) }
const avfardade = resultat.filter(Boolean).reduce((n, r) => n + r.domar.filter(d => !d.bekraftat).length, 0)
log(`${lista.length} fynd prövade och bekräftade, ${avfardade} avfärdade`)
return { fynd: lista, avfardade }
