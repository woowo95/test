// Skriptet som ritar fas 5:s bilder i förväg med Claude API:t (steg 5.2.4, först använt i 5.2.4.1: sakernas kartbilder).
//
//   node bildstil/api/bilder.mjs torrt [sort|id …]   bygger frågorna utan att skicka dem och uppskattar kostnaden
//   node bildstil/api/bilder.mjs rita [sort|id …]    ritar det som inte är ritat: tre versioner av varje bild i en batch,
//                                                    koden kontrollerar dem och API:t väljer den bästa
//   rita kan blanda: node bildstil/api/bilder.mjs rita sak-mat ved="lite ljusare bark"  — en bild med = ritas om med
//   kommentaren (tom: Björn sa nej utan att skriva varför)
//
// Förebilden av API:t (beslut, Björn efter v286): den första raden i varje sort i registret (bildstil/bilder.json) är
// förebilden. Den ritas först, med bästa av tre, och som underlag får API:t bildstilens guide, paletten och de godkända
// bilderna (scenen i dagsljus). Resten av sorten ritas först när Björn godkänt förebilden (godkand på raden, som
// programmeringschatten sätter efter Björns svar), och då efter den. Säger Björn nej två gånger till samma förebild ritar
// programmeringschatten den. Det som ritas sparas i bildstil/bilder/<id>.json (med den förra ritningen i forra, så att
// kortet visar den bredvid: Björn efter 5.2.2.7), och radens ritad i registret höjs. Spelet behöver aldrig API:t.
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
  await sida.goto('file://' + html); await sida.waitForFunction(() => window.BILDERNA);
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

Svara bara med JSON enligt schemat.`;
}
function schema(valet = false) {
  const props = { rader: { type: 'array', items: { type: 'string' } }, anteckning: { type: 'string' } }, req = ['rader', 'anteckning'];
  if (valet) { props.val = { type: 'integer' }; req.unshift('val'); }
  return { type: 'object', properties: props, required: req, additionalProperties: false };
}
const beskriv = b => `"${b.namn}" (${b.id}): ${b.vad}. Storlek: högst ${b.w} punkter bred och ${b.h} hög, och den ska fylla ungefär den rutan (raderna är ${b.h} eller färre, och ingen rad är längre än ${b.w} tecken).`;
let SYS = null;
async function fraga(b, { kommentar = null, forra = null, version = null } = {}) {
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
  const gt = gammalText(b); if (gt) { bilder.push(await gammal(b.id)); text.push(gt); }
  if (arSymbol(b)) text.push(symbolText(b));
  text.push(`Rita ${beskriv(b)}`);
  const ref = b.bredvid && BR.bilder.find(x => x.id === b.bredvid), refd = ref && lasBild(ref.id);
  if (refd) text.push(`Björn jämför den med ${ref.namn} (${ref.id}), som visas bredvid den på kortet; den ska höra ihop med den och vara samma sak i ett annat tillstånd, eller ha den som förebild. Punkterna i ${ref.namn}: ${JSON.stringify(refd.rader)}`);
  if (b.medManniska) text.push('Björn jämför storleken med en stående människa: kartfiguren är 14 punkter bred och 20 punkter hög. Storleken ska vara verklig mot den.');
  if (forra) text.push(`Förra ritningen: ${JSON.stringify(forra.rader)}`);
  if (kommentar) text.push(`Björns kommentar om förra ritningen, som ska följas: ${kommentar}`);
  if (version) text.push(`Det här är version ${version} av ${VERSIONER}, som ritas var för sig; sedan väljs den som passar bäst. Rita den på ditt eget sätt inom reglerna.`);
  SYS = SYS || await system();
  return { custom_id: version ? `${b.id}__v${version}` : b.id, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: schema(false) } },
    system: [{ type: 'text', text: SYS, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [...bilder.map(bildBlock), { type: 'text', text: text.join('\n\n') }] }] } };
}
// valet: API:t ser versionerna som i spelet (och förebilden, eller scenen för en förebild) och väljer den bästa
async function valet(b, versioner, { kommentar = null } = {}) {
  const fb = forebildAv(b.sort), arForebild = fb.id === b.id;
  const bilder = [arForebild ? (arSymbol(b) ? await symboler() : await scen()) : await sammanhang(fb.id, null)];
  for (const v of versioner) bilder.push(await sammanhang(b.id, { id: b.id, rader: v.svar.rader }));
  const gt = gammalText(b); if (gt) bilder.push(await gammal(b.id));
  const text = [
    arForebild ? (arSymbol(b) ? 'Den första bilden är spelets symboler som Björn redan valt. Du väljer förebilden för symbolerna.' : `Den första bilden är byns scen med de godkända bilderna i stilen. Du väljer förebilden för sorten ${sortAv(b.sort).namn}.`) : `Den första bilden är förebilden, ${fb.namn}, som i spelet.`,
    `Sedan kommer ${versioner.length === 1 ? 'den enda versionen' : versioner.length + ' versioner'} av ${beskriv(b)} i ordningen ${versioner.map(v => 'version ' + v.nr).join(', ')}, var och en som i spelet: ${arSymbol(b) ? 'i panelen på mörk och ljus bakgrund och bredvid andra symboler' : 'ensam på marken, på högen, på slöjdbänken och när den bärs'}, fyra gånger större.`,
    arSymbol(b) ? symbolText(b) : '',
    ...versioner.map(v => `Version ${v.nr}: ${JSON.stringify(v.svar.rader)}`),
    kommentar ? `Björns kommentar om förra ritningen, som ska följas: ${kommentar}` : '',
    gt ? gt + ' Välj den version som är mest lik den bilden.' : '',
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
// en grov uppskattning: en ritfråga ungefär 5 000 tokens in (bilderna inräknade) och 6 000 ut med tänkandet, valet
// ungefär 9 000 in och 6 000 ut
const uppskattning = n => { const per = (VERSIONER * (5000 * PRIS.in + 6000 * PRIS.ut) + 9000 * PRIS.in + 6000 * PRIS.ut) / 1e6; return { lag: n * per * 0.7, hog: n * per * 1.5, text: `${n} bilder, bästa av ${VERSIONER}: ungefär ${(n * per * 0.7).toFixed(2)}–${(n * per * 1.5).toFixed(2)} dollar med batch` }; };

// ---------- kommandona ----------
const [kommando, ...args] = process.argv.slice(2);
try {
  if (kommando === 'torrt' || kommando === 'rita') {
    const om = args.filter(a => a.includes('=')).map(a => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]);
    const vanliga = args.filter(a => !a.includes('='));
    const { ut: bilder, vantar } = vanliga.length || !om.length ? attRita(vanliga) : { ut: [], vantar: [] };
    const kommentarer = {};
    for (const [id, k] of om) { const b = BR.bilder.find(x => x.id === id); if (!b) throw new Error('Okänd bild: ' + id); if (!bilder.includes(b)) bilder.push(b); kommentarer[id] = k.trim() || 'Björn sa nej till förra ritningen utan att skriva varför: rita en bättre.'; }
    for (const v of vantar) console.log(v);
    if (!bilder.length) { console.log('Inget att rita.'); process.exit(0); }
    const fore = uppskattning(bilder.length);
    console.log(`Att rita: ${bilder.map(b => b.id + (forebildAv(b.sort).id === b.id ? ' (förebild)' : '')).join(', ')}`);
    console.log(`Uppskattat före: ${fore.text}`);
    if (kommando === 'torrt') {
      fs.mkdirSync(UT, { recursive: true });
      const f = await fraga(bilder[0], { version: 1 });
      fs.writeFileSync(path.join(UT, 'bildfraga.json'), JSON.stringify({ ...f, params: { ...f.params, messages: f.params.messages.map(m => ({ ...m, content: m.content.map(c => c.type === 'image' ? { type: 'image', bild: `${c.source.data.length} tecken base64` } : c) })) } }, null, 1));
      console.log(`En fråga (utan bilderna) står i ${path.relative(process.cwd(), path.join(UT, 'bildfraga.json'))}.`);
    } else {
      const client = klient(), opts = b => kommentarer[b.id] ? { kommentar: kommentarer[b.id], forra: lasBild(b.id) } : {};
      const fragor = []; for (const b of bilder) for (let v = 1; v <= VERSIONER; v++) fragor.push(await fraga(b, { ...opts(b), version: v }));
      const r1 = await batch(client, fragor, 'ritningen'); let summa = r1.summa;
      const versioner = {};
      for (const b of bilder) versioner[b.id] = [...Array(VERSIONER)].map((_, i) => { const r = r1.ut[`${b.id}__v${i + 1}`]; return { nr: i + 1, svar: r?.svar, fel: r?.svar ? kontrollera(b, r.svar) : [r?.fel || 'inget svar'] }; });
      const omtag = [];
      for (const b of bilder) {
        if (versioner[b.id].some(x => !x.fel.length)) continue;
        const f = await fraga(b, { ...opts(b), version: VERSIONER + 1 });
        f.params.messages[0].content.push({ type: 'text', text: 'De förra försöken hade de här felen, som ska rättas: ' + [...new Set(versioner[b.id].flatMap(x => x.fel))].slice(0, 12).join('; ') });
        omtag.push(f);
      }
      if (omtag.length) { const o = await batch(client, omtag, 'omtagen'); summa += o.summa; for (const b of bilder) { const r = o.ut[`${b.id}__v${VERSIONER + 1}`]; if (r) versioner[b.id].push({ nr: VERSIONER + 1, svar: r.svar, fel: r.svar ? kontrollera(b, r.svar) : [r.fel] }); } }
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
      // registret läses om från disken, och bara ritad ändras, så att en ändring under tiden inte skrivs över
      const ritade = Object.fromEntries(bilder.map(b => [b.id, b.ritad]));
      BR = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
      for (const b of BR.bilder) if (b.id in ritade) b.ritad = ritade[b.id];
      skrivRegister();
      fs.mkdirSync(path.join(HAR, 'logg'), { recursive: true });
      fs.writeFileSync(path.join(HAR, 'logg', 'bilder-' + new Date().toISOString().slice(0, 19).replace(/:/g, '') + '.json'), JSON.stringify({ kommando, args, modell: MODELL, uppskattat: { lag: +fore.lag.toFixed(2), hog: +fore.hog.toFixed(2) }, dollar: +summa.toFixed(3), rapport }, null, 1));
      console.log(rapport.join('\n'));
      console.log(`slut: det kostade ungefär ${summa.toFixed(2)} dollar (uppskattat före: ${fore.lag.toFixed(2)}–${fore.hog.toFixed(2)}).`);
    }
  } else console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 7).join('\n'));
} catch (e) {
  if (e instanceof Anthropic.APIError) console.error(`API:t svarade med fel ${e.status}: ${e.message}`);
  else console.error(e.stack || e.message || e);
  process.exitCode = 1;
} finally { await stangSidan(); }
