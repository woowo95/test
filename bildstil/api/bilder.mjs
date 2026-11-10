// Skriptet som ritar fas 5:s bilder i förväg med Claude API:t (steg 5.2.4, först använt i 5.2.4.1: sakernas kartbilder).
//
//   node bildstil/api/bilder.mjs torrt [sort|id …]   bygger frågorna utan att skicka dem och uppskattar kostnaden
//   node bildstil/api/bilder.mjs rita [sort|id …]    ritar det som inte är ritat: tre idéer i ord, varje version ritad för
//                                                    sig efter sin idé, kontrollerna (bildstil/kontroll.js) och API:t väljer den bästa
//   node bildstil/api/bilder.mjs tre [id …]          samma ritning, men alla tre versionerna (efter en granskning i sitt sammanhang)
//                                                    sparas i bilder/<id>.json och blir ett kort i bildstilens valdel, där Björn väljer
//   node bildstil/api/bilder.mjs valj <id> <nr>      bygger in version nr som Björn valt på kortet bild_<id>
//   rita kan blanda: node bildstil/api/bilder.mjs rita sak-mat ved="lite ljusare bark"  — en bild med = ritas om med
//   kommentaren (tom: Björn sa nej utan att skriva varför)
//
// Förebilden av API:t (beslut, Björn efter v286): den första raden i varje sort i registret (bildstil/bilder.json) är
// förebilden. Den ritas först, med bästa av tre, och som underlag får API:t bildstilens guide, paletten och de godkända
// bilderna (scenen i dagsljus). Resten av sorten ritas först när Björn godkänt förebilden (godkand på raden, som
// programmeringschatten sätter efter Björns svar), och då efter den. Säger Björn nej två gånger till samma förebild ritar
// programmeringschatten den. Det som ritas sparas i bildstil/bilder/<id>.json (med den förra ritningen i forra, så att
// kortet visar den bredvid: Björn efter 5.2.2.7), och radens ritad i registret höjs. Spelet behöver aldrig API:t.
//
// Arbetssättet (Björn efter bildstil v235, samma för allt som ritas, oavsett om programmeringschatten, API:t eller något
// annat ritar): bilderna ritas i första hand med API:t tills krediterna är slut. Först tre idéer i ord som skiljer sig i form
// eller byggsätt (inte i färg), sedan ritas varje version i en egen fråga med bara sin idé, utan att se de andra eller den
// förra ritningen. "Nya versioner" (och "utan förlaga") ger nya idéer utan förlaga; en annan kommentar betyder "ändra":
// då utgår alla versioner från den nuvarande ritningen och kommentaren, utan idéer. Kontrollerna i bildstil/kontroll.js
// (symmetri, stationernas perspektiv, att versionerna skiljer sig i form) körs på varje version via sidan, och den som inte
// går igenom ritas om en gång med felen.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Anthropic from '@anthropic-ai/sdk';

const HAR = path.dirname(fileURLToPath(import.meta.url)), BILDSTIL = path.resolve(HAR, '..');
const REGISTER = path.join(BILDSTIL, 'bilder.json'), FILER = path.join(BILDSTIL, 'bilder'), UT = path.join(HAR, 'ut');
const MODELL = 'claude-opus-5-5', INSATS = 'high', MAXTOKENS = 32000, VERSIONER = 3;
const PRIS = { in: 2, ut: 10, cacheLas: 0.1, cacheSkriv: 2.5 }; // per miljon tokens med batch
const PT = JSON.parse(fs.readFileSync(path.join(BILDSTIL, 'portratt.json'), 'utf8')).tecken;

let BR = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
const sortAv = id => BR.sorter.find(s => s.id === id);
const raderAv = s => BR.bilder.filter(b => b.sort === s);
// en sort kan ha en annan sorts förebild (forebildFran): symbolerna i loggen och striden ritas efter panelens förebild
const forebildAv = s => raderAv(sortAv(s)?.forebildFran || s)[0];
const arSymbol = b => !!sortAv(b.sort)?.symbol;
const lasBild = id => { const f = path.join(FILER, id + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };

// registret skrivs med en rad per bild, som det är skrivet
function skrivRegister() {
  const rad = o => '{' + Object.entries(o).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(', ') + '}';
  const L = ['{', `  "om": ${JSON.stringify(BR.om)},`, `  "tecken": ${JSON.stringify(BR.tecken)},`, '  "sorter": ['];
  BR.sorter.forEach((s, i) => L.push('    ' + rad(s) + (i < BR.sorter.length - 1 ? ',' : '')));
  L.push('  ],', '  "bilder": [');
  BR.bilder.forEach((b, i) => L.push('    ' + rad(b) + (i < BR.bilder.length - 1 ? ',' : '')));
  L.push('  ]', '}');
  fs.writeFileSync(REGISTER, L.join('\n') + '\n');
}

// ---------- bilderna: sidan öppnas i en webbläsare ----------
let webblasare = null, sida = null;
async function oppnaSidan() {
  if (sida) return sida;
  const require = createRequire(import.meta.url);
  const pw = require('playwright');
  const html = path.join(BILDSTIL, 'bildstil.html');
  if (!fs.existsSync(html)) throw new Error('Bygg sidan först: node bildstil/bygg.cjs');
  webblasare = await pw.chromium.launch(); sida = await webblasare.newPage();
  await sida.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await sida.goto('file://' + html); await sida.waitForFunction(() => window.BILDERNA && window.KONTROLL);
  return sida;
}
const sammanhang = async (id, data) => (await oppnaSidan()).evaluate(([i, d]) => window.BILDERNA.sammanhang(i, d), [id, data]);
const gammal = async id => (await oppnaSidan()).evaluate(i => window.BILDERNA.gammal(i), id);
// spelets bild i dag (bildstil/gamla.json, från npx tsx bildstil/gamla.ts): den nya ritas om efter den (Björn efter version 83
// av bildstilen: alla nya symboler ska vara baserade på dem vi redan hade, bara omgjorda i sina nya pixelstorlekar)
const GAMLA = fs.existsSync(path.join(BILDSTIL, 'gamla.json')) ? JSON.parse(fs.readFileSync(path.join(BILDSTIL, 'gamla.json'), 'utf8')) : {};
// symbolerna (steg 5.2.4.2) ersätter en emoji och har ingen gammal bild: frågan säger vilken emoji den ersätter
const symbolText = b => `Symbolen ersätter emojin ${(b.tecken || []).join(' eller ')} i spelet och ska betyda samma sak, så att den känns igen på en blick. Den är 16 × 16 punkter och står både i panelen (handlingarna, hälsan, flikarna) och i textraderna (loggen, ryktena), på mörk och ljus bakgrund. Rita den framifrån eller från sidan, inte snett uppifrån som kartan, så att den nästan fyller rutan (14–16 punkter åt minst ett håll), med en mörk kontur runt hela (kol0 eller materialets mörkaste ton) och få, stora former. Ingen bakgrund: allt runt symbolen är genomskinligt.`;
const symboler = async () => (await oppnaSidan()).evaluate(() => window.BILDERNA.symboler());
const gammalText = b => { const g = GAMLA[b.id]; if (!g || b.utanGammal) return null;
  return `Den sista bilden är ${b.namn} som den ser ut i spelet i dag, ${Math.max(...g.rader.map(r => r.length))} × ${g.rader.length} punkter, åtta gånger större. Den nya bilden ska vara den bilden omgjord: samma sak, samma form och delar, samma idé och samma färger så nära paletten tillåter, bara i den nya storleken och med bildstilens kontur, ljus och korn. Hitta inte på en ny bild. Punkterna i dag (punkt är genomskinlig): ${JSON.stringify(g.rader)}, färgerna: ${JSON.stringify(g.pal)}.`; };
const scen = async () => (await oppnaSidan()).evaluate(() => window.BILDERNA.scen());
const hexar = async () => (await oppnaSidan()).evaluate(() => window.BILDERNA.hex());
async function stangSidan() { if (webblasare) await webblasare.close(); webblasare = sida = null; }

// ---------- frågan ----------
const bildBlock = b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } });
async function system() {
  const H = await hexar();
  const tecken = [...BR.tecken].map(ch => `${ch} = ${PT[ch]} (${H[ch]})`).join(', ');
  return `Du ritar kartbilder i pixelkonst för spelet Samhällssimulatorn: en by av nordbor under järnåldern, sedd snett uppifrån, i en smutsig och dämpad mid century-palett (palett B, Avokado och rost). Kartan har 16 punkter per ruta. Du ritar en bild i taget som rader av tecken; en punkt är ett tecken och . är genomskinligt.

Tecknen (paletten, ramperna från mörkast 0 till ljusast 3): ${tecken}.

Bildstilens guide (regler för allt som ritas):
- En punktstorlek: 16 punkter per ruta. Bilden ritas i sakens naturliga storlek mot rutan och skalas aldrig.
- Bara paletten: bara tecknen i tabellen, inga andra färger och ingen genomskinlighet utom . runt saken.
- Ljuset kommer från övre vänstra hörnet: den ljusaste tonen uppe till vänster och den mörkaste nere till höger. Skuggan på marken lägger programmet till; rita den inte.
- Konturen är materialets mörkaste ton (t.ex. jord0 runt trä, skiffer0 runt sten), aldrig svart; kol0 är det mörkaste i hela bilden och används bara där något verkligen är svart.
- Korn, inte fläckar: tonen byts punkt för punkt så att ingen yta är slät, men inga mörka fläckar eller ensamma prickar. Varje material har två till tre toner.
- Glans är högst en eller två punkter och aldrig ren vit.
- Mid century: dämpat, och starkt bara där det betyder något. De mättade tonerna sparas till det man ska se: elden, blodet, maten och det som går att ta.
- Det man ska se syns först: saker har kontur och är ljusare än marken (gräset är oliv och barr i mellantoner), så att de syns på den.
- Läsbart i liten storlek: hellre en tydlig silhuett och två eller tre toner än många små detaljer.
- Stationerna ovanifrån: stationer, bänkar, bord, bäddar och härdar ses snett ovanifrån, som slaktbänken och borden. Arbetsytan (skivan, stocken, hällen) ritas ovanifrån och tar hälften till tre fjärdedelar av höjden; framkanten är ett smalt band på 2–3 punkter i en mörkare ton; bara de främre benen syns, som korta stumpar på 3–6 punkter; det som ligger på ytan ritas ovanifrån; höga delar (stolpar, ramar, en gryta) står upp vid bakkanten, förkortade. Aldrig rakt från sidan. Stationerna ska annars se mycket olika ut: form, material och storlek är fria, bara vinkeln är gemensam.
- Logiken först: tänk innan du ritar på hur saken bärs, hålls eller står och vad som då syns. På ryggen syns bara det som sticker upp bakom axeln, i handen syns det från handen och ut, och en rem eller sträng går runt kroppen, aldrig genom huvudet eller ansiktet. I porträttet syns bara den del av ett redskap som logiskt syns.
- Symmetriskt det som är symmetriskt: en kruka, en skål, en sköld eller en tunna har en spegelsymmetrisk form; bara ljuset och kornet skiljer sidorna åt.
- Som i spelet: allt ses snett uppifrån, som kartan, aldrig som en platt sidovy. Något som redan finns i spelet (ett träd, ett djur, ett hus) ritas från spelets bild av det.

Svara bara med JSON enligt schemat.`;
}
function schema(valet = false) {
  const props = { rader: { type: 'array', items: { type: 'string' } }, anteckning: { type: 'string' } }, req = ['rader', 'anteckning'];
  if (valet) { props.val = { type: 'integer' }; req.unshift('val'); }
  return { type: 'object', properties: props, required: req, additionalProperties: false };
}
const beskriv = b => `"${b.namn}" (${b.id}): ${b.vad}. Storlek: högst ${b.w} punkter bred och ${b.h} hög, och den ska fylla ungefär den rutan (raderna är ${b.h} eller färre, och ingen rad är längre än ${b.w} tecken).`;
let SYS = null;
const utanForlaga = k => !!k && /utan förlaga|utan att utgå|helt ny|från början|gör om (hela )?(symbolen |bilden )?helt|nya (versioner|idéer|förslag)/i.test(k);
// läget: "ändra" utgår från den nuvarande ritningen och kommentaren; annars ritas nya idéer utan förlaga
const TOMT_NEJ = 'Björn sa nej till förra ritningen utan att skriva varför: rita en bättre.';
const lageAv = (kommentar, forra) => kommentar && forra && !utanForlaga(kommentar) && kommentar !== TOMT_NEJ ? 'andra' : 'nya';
async function fraga(b, { kommentar = null, forra = null, version = null, ide = null, lage = 'nya' } = {}) {
  if (lage === 'nya') forra = null;
  const s = sortAv(b.sort), fb = forebildAv(b.sort), arForebild = fb.id === b.id;
  const bilder = [], text = [];
  if (arForebild && arSymbol(b)) {
    bilder.push(await symboler());
    text.push('Bilden visar spelets symboler som Björn redan valt, 16 × 16 punkter var, på panelens mörka bakgrund och fyra gånger större. De nya symbolerna ska höra ihop med dem: samma kontur, ljus och korn.');
    text.push(`Du ritar förebilden för symbolerna (${s.om}): den första av spelets emojier som blir pixelsymboler, som de andra sedan ritas efter. Den ska visa stilen väl.`);
  } else if (arForebild) {
    bilder.push(await scen());
    text.push(`Bilden är byns scen i dagsljus med de godkända bilderna i stilen: marken, granarna, lägerelden, slöjdbänken, kistan, slaktbänken och sakerna i förrådet (de små sakerna är gamla och ska ritas om nu). Den är tre gånger större än i spelet.`);
    text.push(`Du ritar förebilden för sorten ${s.namn} (${s.om}): den första bilden i sorten, som de andra sedan ritas efter. Den ska visa stilen väl: kontur, ljus, korn och storlek mot rutan.`);
  } else {
    const fd = lasBild(fb.id);
    bilder.push(await sammanhang(fb.id, null));
    text.push(`Sorten: ${s.namn} (${s.om}). Förebilden, godkänd av Björn: ${beskriv(fb)} Punkterna: ${JSON.stringify(fd.rader)}`);
    text.push(arSymbol(b) ? 'Bilden visar förebilden som i spelet: i panelen på mörk bakgrund, på ljus bakgrund och bredvid symbolerna Björn redan valt, fyra och tre gånger större. Rita den nya symbolen i samma stil: samma kontur, ljus, korn och sätt att skugga.'
      : 'Bilden visar förebilden som i spelet: ensam på marken (hörnen visar en ruta), på högen med en till fyra, på slöjdbänken och när den bärs, fyra gånger större. Rita den nya bilden i samma stil: samma kontur, ljus, korn och sätt att skugga, i sin egen storlek.');
    const andra = raderAv(b.sort).filter(x => x.id !== b.id && x.id !== fb.id && lasBild(x.id)).slice(0, 6);
    if (andra.length) text.push('Andra bilder i sorten som redan är ritade: ' + andra.map(x => `${x.namn}: ${JSON.stringify(lasBild(x.id).rader)}`).join('; '));
  }
  // "gör om utan förlaga" (Björn efter bildstil v100): ritningen görs bara från texten; varken förra ritningen eller emojin visas
  const utan = utanForlaga(kommentar);
  const gt = !utan && gammalText(b); if (gt) { bilder.push(await gammal(b.id)); text.push(gt); }
  if (arSymbol(b)) text.push(utan ? symbolText(b).replace(/^Symbolen ersätter emojin.*?en blick\. /, "") : symbolText(b));
  text.push(`Rita ${beskriv(b)}`);
  const ref = b.bredvid && BR.bilder.find(x => x.id === b.bredvid), refd = ref && lasBild(ref.id);
  if (refd) text.push(`Björn jämför den med ${ref.namn} (${ref.id}), som visas bredvid den på kortet; den ska höra ihop med den och vara samma sak i ett annat tillstånd, eller ha den som förebild. Punkterna i ${ref.namn}: ${JSON.stringify(refd.rader)}`);
  if (b.medManniska) text.push('Björn jämför storleken med en stående människa: kartfiguren är 14 punkter bred och 20 punkter hög. Storleken ska vara verklig mot den.');
  if (forra && !utan) text.push(`Förra ritningen: ${JSON.stringify(forra.rader)}`);
  if (utan) text.push('Björn vill ha en helt ny bild: de förra ritningarna kom längre och längre bort från det han vill ha. Rita den bara utifrån texten om vad den ska föreställa; du får inte se de förra ritningarna eller emojin, och ska inte försöka likna dem.');
  if (kommentar) text.push(`Björns kommentar om förra ritningen, som ska följas och går före emojin och förra ritningen (ber han om en ny symbol eller ett annat sätt, rita något helt annat än emojin och förra ritningen; emojin säger då bara vad symbolen betyder): ${kommentar}`);
  if (lage === 'andra') text.push('Ändra den förra ritningen efter Björns kommentar: behåll det kommentaren inte gäller, och ändra det den gäller tydligt.');
  else if (ide) text.push(`Idén för den här versionen: ${ide}\nRita den idén. De andra versionerna ritas efter andra idéer i egna frågor, och du ser dem inte.`);
  else if (version) text.push(`Det här är version ${version} av ${VERSIONER}, som ritas var för sig; sedan väljs den som passar bäst. Rita den på ditt eget sätt inom reglerna.`);
  SYS = SYS || await system();
  return { custom_id: version ? `${b.id}__v${version}` : b.id, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: schema(false) } },
    system: [{ type: 'text', text: SYS, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text: text.join('\n\n') }] }] } };
}
// idéerna: tre sätt i ord att rita bilden, som skiljer sig i form eller byggsätt (inte i färg), innan något ritas
async function ideer(b, { kommentar = null } = {}) {
  const s = sortAv(b.sort), fb = forebildAv(b.sort);
  const text = [
    `Bilden som ska ritas: ${beskriv(b)} Sorten: ${s.namn} (${s.om}).${fb.id !== b.id ? ` Förebilden i sorten är ${fb.namn}: ${fb.vad}.` : ''}`,
    b.medManniska ? 'Storleken jämförs med en stående människa, 14 × 20 punkter på kartan.' : '',
    kommentar && kommentar !== TOMT_NEJ ? `Björns kommentar om de förra ritningarna, som ska följas: ${kommentar}` : '',
    kommentar === TOMT_NEJ ? 'Björn sa nej till de förra ritningarna utan att skriva varför.' : '',
    `Ge ${VERSIONER} idéer i ord för hur bilden kan ritas, innan något ritas. Tänk först på logiken: hur saken bärs, hålls eller står och vad som då syns, och om den är symmetrisk på riktigt. Idéerna ska skilja sig i form, silhuett eller byggsätt (t.ex. rund mot fyrkantig, hög mot låg, av stockar mot av sten), aldrig bara i färg, storlek eller små detaljer, och alla ska följa bildstilens regler. Varje idé är två eller tre meningar som räcker för att rita den utan att se de andra: formen, delarna, materialet och vad som syns från spelets vinkel.`,
  ].filter(Boolean).join('\n\n');
  SYS = SYS || await system();
  const sch = { type: 'object', properties: { ideer: { type: 'array', items: { type: 'string' } } }, required: ['ideer'], additionalProperties: false };
  return { custom_id: b.id + '__ideer', params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: sch } },
    system: [{ type: 'text', text: SYS, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: [{ type: 'text', text }] }] } };
}
// granskningen (tre): versionen i sitt sammanhang (på gräset bredvid en kolonist och godkända saker, och som i spelet), och
// API:t rättar det som bryter mot logiken eller idén, som programmeringschatten gör innan sidan publiceras
async function granskning(b, v) {
  const bilder = [await iSpeletPng(v.svar.rader)], sh = await sammanhang(b.id, { id: b.id, rader: v.svar.rader }); if (sh) bilder.push(sh);
  const text = [
    `Bilderna visar en ritning av ${beskriv(b)} i sitt sammanhang: på gräset i spelets storlek bredvid en kolonist (14 × 20 punkter) och godkända saker${sh ? ', och som i spelet (på marken, på högen, på slöjdbänken och när den bärs)' : ''}, fyra gånger större.`,
    v.ide ? `Idén den ritades efter: ${v.ide}` : '',
    `Punkterna: ${JSON.stringify(v.svar.rader)}`,
    'Granska den mot bildstilens regler och logiken: storleken mot kolonisten, vinkeln (snett uppifrån, stationer med ytan ovanifrån), symmetrin, att den syns på gräset och att den följer idén. Rätta det som bryter mot reglerna och svara med punkterna (oförändrade om inget behöver rättas) och vad du rättade i anteckningen.',
  ].filter(Boolean).join('\n\n');
  return { custom_id: `${b.id}__g${v.nr}`, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: schema(false) } },
    system: [{ type: 'text', text: SYS, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text }] }] } };
}
// valet: API:t ser versionerna som i spelet (och förebilden, eller scenen för en förebild) och väljer den bästa
async function valet(b, versioner, { kommentar = null } = {}) {
  const fb = forebildAv(b.sort), arForebild = fb.id === b.id;
  const bilder = [arForebild ? (arSymbol(b) ? await symboler() : await scen()) : await sammanhang(fb.id, null)];
  for (const v of versioner) bilder.push(await sammanhang(b.id, { id: b.id, rader: v.svar.rader }));
  const gt = !utanForlaga(kommentar) && gammalText(b); if (gt) bilder.push(await gammal(b.id));
  const text = [
    arForebild ? (arSymbol(b) ? 'Den första bilden är spelets symboler som Björn redan valt. Du väljer förebilden för symbolerna.' : `Den första bilden är byns scen med de godkända bilderna i stilen. Du väljer förebilden för sorten ${sortAv(b.sort).namn}.`) : `Den första bilden är förebilden, ${fb.namn}, som i spelet.`,
    `Sedan kommer ${versioner.length === 1 ? 'den enda versionen' : versioner.length + ' versioner'} av ${beskriv(b)} i ordningen ${versioner.map(v => 'version ' + v.nr).join(', ')}, var och en som i spelet: ${arSymbol(b) ? 'i panelen på mörk och ljus bakgrund och bredvid andra symboler' : 'ensam på marken, på högen, på slöjdbänken och när den bärs'}, fyra gånger större.`,
    arSymbol(b) ? symbolText(b) : '',
    ...versioner.map(v => `Version ${v.nr}: ${JSON.stringify(v.svar.rader)}`),
    kommentar ? `Björns kommentar om förra ritningen, som ska följas: ${kommentar}` : '',
    gt ? gt + ' Välj den version som är mest lik den bilden.' : '',
    'Tänk på logiken: hur saken bärs, hålls eller står och vad som då syns, symmetrin och vinkeln.',
    `Välj den version som ${arForebild ? 'passar bäst i scenen' : 'hör bäst ihop med förebilden'}, stämmer bäst med beskrivningen och läses tydligast i spelets storlek. Svara med val (versionens nummer) och dess punkter. Rätta det som inte stämmer, och skriv i anteckningen varför du valde den och vad du ändrade. Passar ingen: svara val 0, rita en ny och förklara.`,
  ].filter(Boolean).join('\n\n');
  return { custom_id: b.id, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: schema(true) } },
    system: [{ type: 'text', text: SYS, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text }] }] } };
}

// ---------- koden kontrollerar varje ritning: tecknen och storleken ----------
function kontrollera(b, svar) {
  const fel = [], ok = new Set(['.', ...BR.tecken]);
  if (!svar || !Array.isArray(svar.rader) || !svar.rader.length) return ['inga rader'];
  // tomma rader överst och underst tas bort, och korta rader fylls ut med genomskinligt
  let r = svar.rader.map(x => typeof x === 'string' ? x.replace(/\s+$/, '') : '');
  while (r.length && !/[^.]/.test(r[0])) r.shift();
  while (r.length && !/[^.]/.test(r[r.length - 1])) r.pop();
  if (!r.length) return ['bilden är tom'];
  const v = Math.min(...r.filter(x => /[^.]/.test(x)).map(x => x.search(/[^.]/)));
  r = r.map(x => x.slice(v));
  const w = Math.max(...r.map(x => x.replace(/\.+$/, '').length));
  r = r.map(x => x.slice(0, w).padEnd(w, '.'));
  svar.rader = r;
  for (const x of r) for (const ch of x) if (!ok.has(ch)) fel.push(`tecknet "${ch}" finns inte i paletten`);
  if (w > b.w) fel.push(`bilden är ${w} punkter bred, högst ${b.w}`);
  if (r.length > b.h) fel.push(`bilden är ${r.length} punkter hög, högst ${b.h}`);
  if (arSymbol(b) ? Math.max(w, r.length) < 13 : (w < b.w * 0.6 || r.length < b.h * 0.6)) fel.push(`bilden är för liten (${w} × ${r.length}, ska vara ungefär ${b.w} × ${b.h})`);
  return [...new Set(fel)].slice(0, 12);
}

// kontrollerna i bildstil/kontroll.js (samma som på sidan och för programmeringschattens ritningar): symmetri och perspektiv
async function kontrolleraAllt(b, svar) {
  const fel = kontrollera(b, svar); if (fel.length) return fel;
  const r = await (await oppnaSidan()).evaluate(o => window.KONTROLL.rader(o), { namn: b.namn, slag: b.slag || null, rader: svar.rader });
  return r.filter(x => !x.ok).map(x => `${x.kontroll}: ${x.text}`);
}
const olikaPar = async lista => (await oppnaSidan()).evaluate(l => window.KONTROLL.olikaRader(l), lista);
const iSpeletPng = async rader => (await oppnaSidan()).evaluate(r => window.KONTROLL.iSpeletPng(r), rader);

// ---------- API:t ----------
const ADRESS = 'https://api.anthropic.com';
function klient() {
  const nyckel = process.env.BJORN_API_NYCKEL;
  if (!nyckel) { console.error('BJORN_API_NYCKEL saknas i miljön.'); process.exit(1); }
  return new Anthropic({ apiKey: nyckel, baseURL: ADRESS });
}
const svarText = m => m.content.filter(c => c.type === 'text').map(c => c.text).join('');
const kostnad = u => ((u.input_tokens || 0) * PRIS.in + (u.output_tokens || 0) * PRIS.ut + (u.cache_read_input_tokens || 0) * PRIS.cacheLas + (u.cache_creation_input_tokens || 0) * PRIS.cacheSkriv) / 1e6;
async function batch(client, fragor, namn) {
  console.log(`Skickar ${fragor.length} frågor i en batch (${namn}) …`);
  const bt = await client.messages.batches.create({ requests: fragor });
  for (;;) {
    const st = await client.messages.batches.retrieve(bt.id);
    if (st.processing_status === 'ended') break;
    console.log(`  ${namn}: ${st.request_counts.succeeded} klara, ${st.request_counts.processing} kvar …`);
    await new Promise(r => setTimeout(r, 30_000));
  }
  const ut = {}; let summa = 0;
  for await (const r of await client.messages.batches.results(bt.id)) {
    if (r.result.type !== 'succeeded') { ut[r.custom_id] = { fel: r.result.type }; continue; }
    const m = r.result.message; summa += kostnad(m.usage);
    if (m.stop_reason !== 'end_turn') { ut[r.custom_id] = { fel: m.stop_reason }; continue; }
    try { ut[r.custom_id] = { svar: JSON.parse(svarText(m)) }; } catch (e) { ut[r.custom_id] = { fel: 'svaret var inte JSON' }; }
  }
  console.log(`  ${namn} klar: ungefär ${summa.toFixed(2)} dollar.`);
  return { ut, summa };
}
async function spara(b, ritning, av) {
  const gammal = lasBild(b.id), H = await hexar();
  const pal = Object.fromEntries([...new Set(ritning.rader.join('').replace(/\./g, ''))].sort().map(ch => [ch, H[ch]]));
  const o = { id: b.id, ritad: (b.ritad || 0) + 1, av, om: ritning.anteckning || '', w: ritning.rader[0].length, h: ritning.rader.length, rader: ritning.rader, pal, ...(gammal ? { forra: { ritad: gammal.ritad, rader: gammal.rader } } : {}) };
  fs.mkdirSync(FILER, { recursive: true });
  fs.writeFileSync(path.join(FILER, b.id + '.json'), JSON.stringify(o, null, 1) + '\n');
  b.ritad = o.ritad;
}

// tre: versionerna sparas i bilder/<id>.json (versioner: [{ ide, rader, om }]) och blir ett kort i valdelen; den
// nuvarande ritningen (rader) står kvar tills Björn valt, så att spelet och sidan har en bild under tiden
async function sparaTre(b, bra, kommentar) {
  const gammal = lasBild(b.id), H = await hexar();
  const pal = Object.fromEntries([...new Set(bra.flatMap(v => v.svar.rader).join('').replace(/\./g, ''))].sort().map(ch => [ch, H[ch]]));
  const forst = bra[0].svar.rader;
  const o = { ...(gammal || { id: b.id, w: forst[0].length, h: forst.length, rader: forst }), id: b.id, ritad: (b.ritad || 0) + 1, av: `API:t (${MODELL}), tre idéer`,
    pal: { ...(gammal?.pal || {}), ...pal }, versioner: bra.map(v => ({ ide: v.ide || '', rader: v.svar.rader, om: v.svar.anteckning || '' })), ...(kommentar ? { kommentar } : {}) };
  delete o.vald; if (!kommentar) delete o.kommentar;
  fs.mkdirSync(FILER, { recursive: true });
  fs.writeFileSync(path.join(FILER, b.id + '.json'), JSON.stringify(o, null, 1) + '\n');
  b.ritad = o.ritad;
}
// registret läses om från disken, och bara ritad ändras, så att en ändring under tiden inte skrivs över
function slutet(bilder, rapport, summa, fore) {
  const ritade = Object.fromEntries(bilder.map(b => [b.id, b.ritad]));
  BR = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  for (const b of BR.bilder) if (b.id in ritade) b.ritad = ritade[b.id];
  skrivRegister();
  fs.mkdirSync(path.join(HAR, 'logg'), { recursive: true });
  fs.writeFileSync(path.join(HAR, 'logg', 'bilder-' + new Date().toISOString().slice(0, 19).replace(/:/g, '') + '.json'), JSON.stringify({ kommando, args, modell: MODELL, uppskattat: { lag: +fore.lag.toFixed(2), hog: +fore.hog.toFixed(2) }, dollar: +summa.toFixed(3), rapport }, null, 1));
  console.log(rapport.join('\n'));
  console.log(`slut: det kostade ungefär ${summa.toFixed(2)} dollar (uppskattat före: ${fore.lag.toFixed(2)}–${fore.hog.toFixed(2)}).`);
}

// ---------- vad som ska ritas: förebilden först, resten när Björn godkänt den ----------
function attRita(args) {
  const ut = [], vantar = [];
  const sorter = args.length ? args.filter(a => sortAv(a)) : BR.sorter.map(s => s.id);
  for (const s of sorter) {
    const fb = forebildAv(s);
    if (!(fb.ritad > 0)) ut.push(fb);
    else if (!fb.godkand) vantar.push(`${sortAv(s).namn}: förebilden ${fb.namn} väntar på Björns svar`);
    else ut.push(...raderAv(s).filter(b => !(b.ritad > 0)));
  }
  for (const a of args.filter(a => !sortAv(a))) { const b = BR.bilder.find(x => x.id === a); if (!b) throw new Error('Okänd sort eller bild: ' + a); if (!ut.includes(b)) ut.push(b); }
  return { ut, vantar };
}
// en grov uppskattning: idéerna ungefär 2 000 tokens in och 3 000 ut, en ritfråga 5 000 in (bilderna inräknade) och 6 000
// ut med tänkandet, ett omtag för ungefär var tredje version, och sist valet (9 000 in, 6 000 ut) eller i tre en granskning
// per version (6 000 in, 5 000 ut)
const uppskattning = (n, tre = false) => { const rit = 5000 * PRIS.in + 6000 * PRIS.ut;
  const per = (2000 * PRIS.in + 3000 * PRIS.ut + VERSIONER * rit * 1.33 + (tre ? VERSIONER * (6000 * PRIS.in + 5000 * PRIS.ut) : 9000 * PRIS.in + 6000 * PRIS.ut)) / 1e6;
  return { lag: n * per * 0.7, hog: n * per * 1.5, text: `${n} bilder, ${tre ? 'tre versioner till valdelen' : 'bästa av ' + VERSIONER}: ungefär ${(n * per * 0.7).toFixed(2)}–${(n * per * 1.5).toFixed(2)} dollar med batch` }; };

// ---------- kommandona ----------
const [kommando, ...args] = process.argv.slice(2);
try {
  if (kommando === 'valj') {
    // Björns val på kortet bild_<id> byggs in: versionen blir bilden, och kortet försvinner ur valdelen
    const [id, nr] = args, b = BR.bilder.find(x => x.id === id), d = lasBild(id);
    if (!b || !d?.versioner) throw new Error('Ingen bild med versioner: ' + id);
    const v = d.versioner[+nr - 1]; if (!v) throw new Error(`Bilden har ${d.versioner.length} versioner`);
    const o = { ...d, rader: v.rader, w: Math.max(...v.rader.map(r => r.length)), h: v.rader.length, om: [v.ide, v.om].filter(Boolean).join(' '), vald: +nr, forra: { ritad: d.ritad, rader: d.rader } };
    delete o.versioner; delete o.kommentar;
    fs.writeFileSync(path.join(FILER, id + '.json'), JSON.stringify(o, null, 1) + '\n');
    console.log(`${id}: version ${nr} inbyggd.`);
  } else if (kommando === 'torrt' || kommando === 'rita' || kommando === 'tre') {
    const om = args.filter(a => a.includes('=')).map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
    const vanliga = args.filter(a => !a.includes('='));
    const { ut: bilder, vantar } = vanliga.length || !om.length ? attRita(vanliga) : { ut: [], vantar: [] };
    const kommentarer = {};
    for (const [id, k] of om) { const b = BR.bilder.find(x => x.id === id); if (!b) throw new Error('Okänd bild: ' + id); if (!bilder.includes(b)) bilder.push(b); kommentarer[id] = k.trim() || 'Björn sa nej till förra ritningen utan att skriva varför: rita en bättre.'; }
    // en bild som redan är ritad och nämns vid namn ritas om: Björns kommentar på raden (forra) följer alltid med, och utan
    // kommentar räknas det som ett nej (förut följde kommentaren bara med som id="kommentar", och glömdes annars; Björn efter bildstil v96)
    for (const b of bilder) if (!kommentarer[b.id] && b.ritad > 0 && lasBild(b.id) && vanliga.includes(b.id)) kommentarer[b.id] = b.forra || 'Björn sa nej till förra ritningen utan att skriva varför: rita en bättre.';
    for (const b of bilder) console.log(`${b.id}: ${kommentarer[b.id] ? 'kommentar: ' + kommentarer[b.id] : 'ny bild'}`);
    for (const v of vantar) console.log(v);
    if (!bilder.length) { console.log('Inget att rita.'); process.exit(0); }
    const fore = uppskattning(bilder.length, kommando === 'tre' || args.includes('--tre'));
    console.log(`Att rita: ${bilder.map(b => b.id + (forebildAv(b.sort).id === b.id ? ' (förebild)' : '')).join(', ')}`);
    console.log(`Uppskattat före: ${fore.text}`);
    if (kommando === 'torrt') {
      fs.mkdirSync(UT, { recursive: true });
      const b0 = bilder[0], l0 = lageAv(kommentarer[b0.id], lasBild(b0.id)), i0 = await ideer(b0, { kommentar: kommentarer[b0.id] || null });
      fs.writeFileSync(path.join(UT, 'idefraga.json'), JSON.stringify(i0, null, 1));
      console.log(`Läget för ${b0.id}: ${l0 === 'andra' ? 'ändra (från den nuvarande ritningen och kommentaren, utan idéer)' : 'nya idéer utan förlaga'}. Idéfrågan står i ${path.relative(process.cwd(), path.join(UT, 'idefraga.json'))}.`);
      const f = await fraga(b0, { ...(kommentarer[b0.id] ? { kommentar: kommentarer[b0.id], forra: lasBild(b0.id) } : {}), lage: l0, version: 1, ide: l0 === 'nya' ? '(idé 1 från idéfrågan)' : null });
      fs.writeFileSync(path.join(UT, 'bildfraga.json'), JSON.stringify({ ...f, params: { ...f.params, messages: f.params.messages.map(m => ({ ...m, content: m.content.map(c => c.type === 'image' ? { type: 'image', bild: `${c.source.data.length} tecken base64` } : c) })) } }, null, 1));
      console.log(`En fråga (utan bilderna) står i ${path.relative(process.cwd(), path.join(UT, 'bildfraga.json'))}.`);
    } else {
      const client = klient(), tre = kommando === 'tre';
      const lage = {}, opts = b => kommentarer[b.id] ? { kommentar: kommentarer[b.id], forra: lasBild(b.id), lage: lage[b.id] } : { lage: 'nya' };
      for (const b of bilder) lage[b.id] = lageAv(kommentarer[b.id], lasBild(b.id));
      let summa = 0;
      // 1. idéerna i ord (inte i "ändra", där alla versioner utgår från den nuvarande ritningen)
      const ide = {}, nya = bilder.filter(b => lage[b.id] === 'nya');
      if (nya.length) {
        const fr = []; for (const b of nya) fr.push(await ideer(b, { kommentar: kommentarer[b.id] || null }));
        const r0 = await batch(client, fr, 'idéerna'); summa += r0.summa;
        for (const b of nya) ide[b.id] = (r0.ut[b.id + '__ideer']?.svar?.ideer || []).slice(0, VERSIONER);
      }
      // 2. varje version i en egen fråga med bara sin idé
      const fragor = []; for (const b of bilder) for (let v = 1; v <= VERSIONER; v++) fragor.push(await fraga(b, { ...opts(b), version: v, ide: ide[b.id]?.[v - 1] || null }));
      const r1 = await batch(client, fragor, 'ritningen'); summa += r1.summa;
      const versioner = {};
      for (const b of bilder) { versioner[b.id] = []; for (let i = 0; i < VERSIONER; i++) { const r = r1.ut[`${b.id}__v${i + 1}`]; versioner[b.id].push({ nr: i + 1, ide: ide[b.id]?.[i] || null, svar: r?.svar, fel: r?.svar ? await kontrolleraAllt(b, r.svar) : [r?.fel || 'inget svar'] }); } }
      // versionerna ska skilja sig i form (inte i "ändra"): den senare av två nästan lika ritas om
      const olikaFel = async b => { if (lage[b.id] === 'andra') return; const ok = versioner[b.id].filter(x => !x.fel.length);
        if (ok.length > 1) for (const o of await olikaPar(ok.map(x => x.svar.rader))) ok[o.version - 1].fel.push('olika: ' + o.text.replace(/version (\d)/gi, (m, n) => 'version ' + ok[n - 1].nr)); };
      for (const b of bilder) await olikaFel(b);
      // 3. omtag: varje version som inte gick igenom ritas om en gång med sin idé och felen
      const omtag = [];
      for (const b of bilder) for (const v of versioner[b.id]) if (v.fel.length) {
        const f = await fraga(b, { ...opts(b), version: v.nr, ide: v.ide }); f.custom_id = `${b.id}__o${v.nr}`;
        f.params.messages[0].content.push({ type: 'text', text: 'Det förra försöket hade de här felen, som ska rättas: ' + [...new Set(v.fel)].slice(0, 12).join('; ') + (v.fel.some(x => x.startsWith('olika')) ? ' Följ idén tydligare, så att formen blir en annan.' : '') });
        omtag.push(f);
      }
      if (omtag.length) {
        const o = await batch(client, omtag, 'omtagen'); summa += o.summa;
        for (const b of bilder) for (const v of versioner[b.id]) { const r = o.ut[`${b.id}__o${v.nr}`]; if (!r?.svar) continue; const fel = await kontrolleraAllt(b, r.svar); if (fel.length <= v.fel.length) Object.assign(v, { svar: r.svar, fel }); }
        for (const b of bilder) { for (const v of versioner[b.id]) v.fel = v.fel.filter(x => !x.startsWith('olika')); await olikaFel(b); }
      }
      if (tre) {
        // 4. granskningen i sammanhanget, och alla versionerna sparas för Björn att välja bland
        const gr = []; for (const b of bilder) for (const v of versioner[b.id]) if (v.svar && !v.fel.some(x => !x.startsWith('olika'))) gr.push(await granskning(b, v));
        const r4 = gr.length ? await batch(client, gr, 'granskningen') : { ut: {}, summa: 0 }; summa += r4.summa;
        const rapport = [];
        for (const b of bilder) {
          for (const v of versioner[b.id]) { const g = r4.ut[`${b.id}__g${v.nr}`]?.svar; if (g && !(await kontrolleraAllt(b, g)).length) { v.svar = { rader: g.rader, anteckning: [v.svar.anteckning, g.anteckning].filter(Boolean).join(' Granskningen: ') }; } }
          const bra = versioner[b.id].filter(v => v.svar && !v.fel.some(x => !x.startsWith('olika')));
          if (!bra.length) { rapport.push(`${b.id}: inte ritad (${[...new Set(versioner[b.id].flatMap(x => x.fel))].slice(0, 3).join('; ')})`); continue; }
          await sparaTre(b, bra, kommentarer[b.id] || null);
          const kvar = bra.flatMap(v => v.fel); rapport.push(`${b.id}: ${bra.length} versioner till valdelen (kortet bild_${b.id})${kvar.length ? '; kvar: ' + kvar.join('; ') : ''}`);
        }
        slutet(bilder, rapport, summa, fore);
      } else {
      const valfragor = [];
      for (const b of bilder) { const ok = versioner[b.id].filter(x => !x.fel.length); if (ok.length) valfragor.push(await valet(b, ok, { kommentar: kommentarer[b.id] || null })); }
      const r3 = valfragor.length ? await batch(client, valfragor, 'valet') : { ut: {}, summa: 0 };
      summa += r3.summa;
      const rapport = [];
      for (const b of bilder) {
        const ok = versioner[b.id].filter(x => !x.fel.length), g = r3.ut[b.id]?.svar;
        let slut = null, hur = '';
        if (g && !kontrollera(b, g).length) { slut = g; hur = g.val > 0 ? `version ${g.val} vald` : 'ingen passade, en ny ritad i valet'; }
        else if (ok.length) { const v = ok.find(x => x.nr === g?.val) || ok[0]; slut = v.svar; hur = `version ${v.nr} (valet gick inte igenom koden)`; }
        if (!slut) { rapport.push(`${b.id}: inte ritad (${[...new Set(versioner[b.id].flatMap(x => x.fel))].slice(0, 3).join('; ')})`); continue; }
        await spara(b, slut, `API:t (${MODELL}), bästa av ${ok.length}${kommentarer[b.id] ? ', omritad efter Björns svar' : ''}`);
        rapport.push(`${b.id}: ritad, ${hur}${g?.anteckning ? ': ' + g.anteckning : ''}`);
      }
      slutet(bilder, rapport, summa, fore);
      }
    }
  } else console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 9).join('\n'));
} catch (e) {
  if (e instanceof Anthropic.APIError) console.error(`API:t svarade med fel ${e.status}: ${e.message}`);
  else console.error(e.stack || e.message || e);
  process.exitCode = 1;
} finally { await stangSidan(); }
