// Skriptet som ritar porträttens delar med Claude API:t (steg 5.2.2, först använt i 5.2.2.3).
//
//   node bildstil/api/rita.mjs prov                 kontrollerar att nyckeln finns och att ett litet prov går igenom
//   node bildstil/api/rita.mjs torrt [sort|id …]    bygger frågorna utan att skicka dem och uppskattar kostnaden
//   node bildstil/api/rita.mjs kostnad [sort|id …]  räknar frågornas tokens med API:t (gratis) och uppskattar kostnaden
//   node bildstil/api/rita.mjs rita [sort|id …]     ritar delarna som inte är ritade (ritad 0): tre versioner av varje del
//                                                   i en batch, koden kontrollerar dem, API:t väljer den bästa mot
//                                                   förebilden, och den valda sparas
//   node bildstil/api/rita.mjs omrita <id> "<kommentar>"   ritar om en del efter Björns kommentar, på samma sätt
//
// Bästa av tre (beslut, Björn efter v283): Björn ser bara den valda versionen. Kostnaden (Björn efter v283): skriptet säger
// vad en körning ungefär kostar innan den körs och vad den kostade efteråt; ungefär hälften av krediterna sparas till senare.
//
// Utan sort ritas ansiktets sorter (5.2.2.3): huvudformer, öron, näsor, ögon, ögonbryn och munnar. Förebilden i varje
// sort är den första raden i registret och ritas av programmeringschatten (bildstil/api/forebilder.mjs); skriptet ritar
// resten efter den. Nyckeln läses ur BJORN_API_NYCKEL och skrivs aldrig ut, och frågorna går direkt till https://api.anthropic.com. Det som ritas sparas i bildstil/delar/<id>.json,
// och radens ritad i bildstil/portratt.json höjs, så att kortet står obesvarat i granskningen. Spelet behöver aldrig API:t.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Anthropic from '@anthropic-ai/sdk';

const HAR = path.dirname(fileURLToPath(import.meta.url)), BILDSTIL = path.resolve(HAR, '..');
const REGISTER = path.join(BILDSTIL, 'portratt.json'), DELAR = path.join(BILDSTIL, 'delar'), UT = path.join(HAR, 'ut');
const MODELL = 'claude-opus-5-5', INSATS = 'high', MAXTOKENS = 32000;
// pris per miljon tokens med batch (halva standardpriset för Claude Opus 5.5: 4 och 20 dollar)
const PRIS = { in: 2, ut: 10, cacheLas: 0.1, cacheSkriv: 2.5 };
const ANSIKTET = ['huvudform', 'ora', 'nasa', 'oga', 'ogonbryn', 'mun'];
const VERSIONER = 3;

const PR = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
const SORT = Object.fromEntries(PR.sorter.map(s => [s.id, s]));
const delarAv = s => PR.delar.filter(d => d.sort === s);
const lasDel = id => { const f = path.join(DELAR, id + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const lagenFor = s => SORT[s].lagen ? PR.lagen[SORT[s].lagen].map(l => l.id) : ['standard'];

// ---------- registret skrivs med en rad per del, som förut ----------
function skrivRegister() {
  // samma format som registret har: ", " och ": " mellan delarna, så att bara det som ändrats syns i git
  const rad = v => Array.isArray(v) ? '[' + v.map(rad).join(', ') + ']' : v && typeof v === 'object' ? '{' + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ': ' + rad(x)).join(', ') + '}' : JSON.stringify(v);
  const L = ['{'], nycklar = Object.keys(PR);
  nycklar.forEach((k, i) => {
    const v = PR[k], sep = i < nycklar.length - 1 ? ',' : '';
    const lista = (namn, arr, ind) => { L.push(`${ind}"${namn}": [`); arr.forEach((x, j) => L.push(`${ind}  ${rad(x)}${j < arr.length - 1 ? ',' : ''}`)); };
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') { lista(k, v, '  '); L.push('  ]' + sep); }
    else if (v && typeof v === 'object' && !Array.isArray(v) && k !== 'tecken' && Object.values(v).some(x => typeof x === 'object' && x)) {
      L.push(`  "${k}": {`); const ks = Object.keys(v);
      ks.forEach((kk, j) => { const vv = v[kk], s2 = j < ks.length - 1 ? ',' : ''; if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object') { lista(kk, vv, '    '); L.push('    ]' + s2); } else L.push(`    "${kk}": ${rad(vv)}${s2}`); });
      L.push('  }' + sep);
    } else L.push(`  "${k}": ${rad(v)}${sep}`);
  });
  L.push('}');
  fs.writeFileSync(REGISTER, L.join('\n') + '\n');
}

// ---------- bilderna: sidan öppnas i en webbläsare, och delen ritas på det neutrala ansiktet ----------
let webblasare = null, sida = null;
async function oppnaSidan() {
  if (sida) return sida;
  const require = createRequire(import.meta.url);
  let pw; try { pw = require('playwright'); } catch (e) { throw new Error('Playwright behövs för bilderna (finns i molnmiljön).'); }
  const html = path.join(BILDSTIL, 'bildstil.html');
  if (!fs.existsSync(html)) throw new Error('Bygg sidan först: node bildstil/bygg.cjs');
  webblasare = await pw.chromium.launch();
  sida = await webblasare.newPage();
  await sida.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await sida.goto('file://' + html);
  await sida.waitForFunction(() => window.PORTRATTEN);
  return sida;
}
// en bild (PNG, base64) med delen i alla sina lägen på kvinnans, mannens och barnets neutrala ansikte, fyra gånger större
async function bildAvDel(id, sort, data) {
  const pg = await oppnaSidan();
  return pg.evaluate(({ id, sort, data, lagen }) => {
    const P = window.PORTRATTEN; if (data) P.provaDel(id, data);
    const rader = ['kvinna', 'man', 'barn'].map(mall => lagen.map(l => {
      const q = P.neutral(mall); q.kon = mall === 'man' ? 'man' : 'kvinna'; q.del[sort] = id;
      if (l !== 'standard') { q.lagen[sort] = l; if (sort === 'mun') { const h = { glad: 'glad', nojd: 'nojd', lugn: 'lugn', ledsen: 'ledsen', arg: 'arg', oppen: 'radd' }[l]; if (h) q.humor = h; } }
      return P.portratt(q);
    }));
    const S = 4, G = 8, w = lagen.length * (64 * S + G), h = rader.length * (64 * S + G);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#24201d'; g.fillRect(0, 0, w, h);
    rader.forEach((rad, j) => rad.forEach((B, i) => { const k = document.createElement('canvas'); tillCanvas(B, k, 0); g.drawImage(k, i * (64 * S + G), j * (64 * S + G), 64 * S, 64 * S); }));
    return c.toDataURL('image/png').split(',')[1];
  }, { id, sort, data, lagen: lagenFor(sort) });
}
async function stangSidan() { if (webblasare) await webblasare.close(); webblasare = sida = null; }

// ---------- frågan ----------
const TECKEN = Object.entries(PR.tecken).filter(([k]) => k !== 'om').map(([k, v]) => `${k} = ${v ?? 'genomskinligt'}`).join(', ');
const SYSTEM = `Du ritar delar till porträtt i pixelkonst för spelet Samhällssimulatorn: nordbor i en by under järnåldern, i en smutsig och dämpad mid century-palett. Porträttet är 64 × 64 punkter och byggs av delar i lager på en mall (kvinna, man eller barn). Du ritar en del i taget som rader av tecken, så som förebilden är ritad.

Tecknen (en punkt är ett tecken): ${TECKEN}.
Kanalerna hud, kind, har och oga får sin färg först när porträttet ritas (hudton, hårfärg, ögonfärg), och tonerna går från mörkast (0) till ljusast (3). Rita därför med tonerna och aldrig med färgnamn. kol, rost och ben är fasta färger i paletten.

Regler för allt som ritas (Porträttens byggsätt och bildstilen):
- Ljuset kommer uppifrån vänster. Det som vänder sig mot ljuset är ljusare, det som vänder sig bort är mörkare, och skuggan följer formen.
- Matt, inte blankt: inga små ljusa fläckar, ingen glans och inga ensamma prickar. Där två toner möts får gränsen gärna ha korn i små klungor, men ingen yta ska se slät eller blank ut.
- Ingen kontur runt delen: konturen mot bakgrunden och kanten mot andra lager läggs på av programmet.
- Bara tecknen i tabellen och bara de tecken som sorten får använda. Ingen ren svart eller vit: pupillen och en öppen mun får vara k.
- Delen sitter vid sin fästpunkt i mallen. x och y är bildens övre vänstra hörn räknat från fästpunkten, och hela delen ska hålla sig inom sortens ruta.
- Delen ska höra ihop med förebilden: samma stil, samma storlek på detaljerna, samma linjetjocklek och samma sätt att skugga, men med den egna formen som beskrivningen säger.
- En del i flera lägen (ögon, ögonbryn, munnar) ska vara samma del i alla lägen: bara det som humöret ändrar får ändras.
- Delar som finns i par (öron, ögon, ögonbryn) ritas för vänster sida på bilden; programmet speglar den högra.

Svara bara med JSON enligt schemat.`;

// schemat för svaret: punkterna i alla lägen (och mannens och barnets bilder när sorten har dem); i valet också vilken version
function schema(sort, valet = false) {
  const bild = { type: 'object', properties: { x: { type: 'integer' }, y: { type: 'integer' }, rader: { type: 'array', items: { type: 'string' } } }, required: ['x', 'y', 'rader'], additionalProperties: false };
  const lagen = lagenFor(sort), bilder = { type: 'object', properties: Object.fromEntries(lagen.map(l => [l, bild])), required: lagen, additionalProperties: false };
  const props = { bilder, anteckning: { type: 'string' } }, req = ['bilder', 'anteckning'];
  if (SORT[sort].ritas.manbild) { props.man = bilder; req.push('man'); }
  if (SORT[sort].ritas.barnbild) { props.barn = bilder; req.push('barn'); }
  if (valet) { props.val = { type: 'integer' }; req.unshift('val'); }
  return { type: 'object', properties: props, required: req, additionalProperties: false };
}
function sortText(sort) {
  const S = SORT[sort], R = S.ritas, f = PR.mallar.map(m => `${m.namn}: ${R.fast === 'huvud' ? `huvudets mitt (${m.huvud.cx}, ${m.huvud.cy})` : JSON.stringify(m.fast[R.fast])}`).join('; ');
  const lagen = S.lagen ? `Lägen: ${PR.lagen[S.lagen].map(l => `${l.id} (${l.namn})`).join(', ')}. Humöret väljer dem: ${PR.humor.map(h => `${h.namn.toLowerCase()} = ${h[sort] || '–'}`).join(', ')}.` : 'Ett läge: standard.';
  return `Sort: ${S.namn} (${R.om}). Fästpunkten i porträttet: ${f}. Ruta från fästpunkten (x0, y0, x1, y1): ${R.ruta.join(', ')}. Tecken som sorten får använda: ${R.tecken}. ${lagen}${R.manbild ? ' Rita också en egen bild för mannen (man), som för förebilden: mannens huvudform är lite fyrkantigare, med rakare sidor, bredare käke och plattare haka (Björn efter 5.2.2.3).' : ''}${R.barnbild ? ' Rita också en egen bild för barnmallen (barn), som för förebilden: barnet har kortare och rundare nedre ansikte och mindre drag.' : ''}`;
}
// en version av en del; bästa av tre (beslut, Björn efter v283): varje del ritas i VERSIONER versioner var för sig
async function fraga(d, { kommentar = null, forra = null, version = null } = {}) {
  const sort = d.sort, forebild = delarAv(sort)[0], fb = lasDel(forebild.id);
  if (!fb) throw new Error(`Förebilden ${forebild.id} är inte ritad än.`);
  const bild = await bildAvDel(forebild.id, sort, null);
  const text = [
    sortText(sort),
    `Förebilden (${forebild.id}, ${forebild.namn}), ritad av programmeringschatten: ${JSON.stringify({ bilder: fb.bilder, ...(fb.man ? { man: fb.man } : {}), ...(fb.barn ? { barn: fb.barn } : {}) })}`,
    'Bilden visar förebilden på det neutrala ansiktet: raderna är kvinna, man och barn, och kolumnerna är lägena i ordning.',
    `Rita delen ${d.id}: ${SORT[sort].en.toLowerCase()} "${d.namn}"${d.vad ? ` (${d.vad})` : ''}${d.ful ? ', en ful variant som får vara lite komisk' : ''}. Den ska skilja sig tydligt från förebilden och de andra i sorten: ${delarAv(sort).filter(x => x.id !== d.id).map(x => x.namn.toLowerCase()).join(', ')}.`,
    forra ? `Förra ritningen av delen: ${JSON.stringify(forra)}` : '',
    kommentar ? `Björns kommentar om förra ritningen, som ska följas: ${kommentar}` : '',
    version ? `Det här är version ${version} av ${VERSIONER}, som ritas var för sig; sedan väljs den som passar bäst. Rita den på ditt eget sätt inom reglerna.` : '',
  ].filter(Boolean).join('\n\n');
  return { custom_id: version ? `${d.id}__v${version}` : d.id, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: schema(sort, false) } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: bild } }, { type: 'text', text }] }] } };
}
// valet: API:t ser förebilden och versionerna som gick igenom koden på ansiktena och väljer den som passar bäst, rättar
// det som inte stämmer i den, eller ritar en ny om ingen passar. Bara den valda kommer till Björns granskning.
async function valet(d, versioner, { kommentar = null } = {}) {
  const sort = d.sort, forebild = delarAv(sort)[0];
  const bilder = [await bildAvDel(forebild.id, sort, null)];
  for (const v of versioner) bilder.push(await bildAvDel(d.id, sort, { id: d.id, ...v.svar }));
  const text = [
    sortText(sort),
    `Den första bilden är förebilden (${forebild.id}, ${forebild.namn}). Sedan kommer ${versioner.length === 1 ? 'den enda versionen' : versioner.length + ' versioner'} av den nya delen ${d.id}, ${SORT[sort].en.toLowerCase()} "${d.namn}"${d.vad ? ` (${d.vad})` : ''}${d.ful ? ', en ful variant som får vara lite komisk' : ''}, i den här ordningen: ${versioner.map(v => 'version ' + v.nr).join(', ')}. Alla visas på det neutrala ansiktet: raderna är kvinna, man och barn, och kolumnerna är lägena.`,
    ...versioner.map(v => `Version ${v.nr}: ${JSON.stringify({ bilder: v.svar.bilder, ...(v.svar.man ? { man: v.svar.man } : {}), ...(v.svar.barn ? { barn: v.svar.barn } : {}) })}`),
    kommentar ? `Björns kommentar om förra ritningen, som ska följas: ${kommentar}` : '',
    'Välj den version som hör bäst ihop med förebilden (stilen, storleken, linjerna, skuggningen), stämmer bäst med beskrivningen och ser bäst ut på alla tre ansiktena i alla lägen. Svara med val (versionens nummer) och dess punkter. Rätta det som inte stämmer i den valda, och skriv i anteckningen varför du valde den och vad du ändrade. Passar ingen: svara val 0, rita en ny som passar och förklara i anteckningen.',
  ].filter(Boolean).join('\n\n');
  return { custom_id: d.id, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' }, output_config: { effort: INSATS, format: { type: 'json_schema', schema: schema(sort, true) } },
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [...bilder.map(b => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b } })), { type: 'text', text }] }] } };
}

// ---------- koden kontrollerar varje ritning först: lägena, tecknen, raderna och rutan ----------
function kontrollera(sort, svar) {
  const fel = [], R = SORT[sort].ritas, tillatna = new Set(['.', ...R.tecken]);
  const bild = (b, namn) => {
    if (!b || !Array.isArray(b.rader) || !b.rader.length) { fel.push(`${namn}: inga rader`); return; }
    const w = b.rader[0].length;
    if (b.rader.some(r => r.length !== w)) fel.push(`${namn}: raderna är olika långa`);
    let punkter = 0;
    b.rader.forEach((r, j) => [...r].forEach((ch, i) => {
      if (!tillatna.has(ch)) fel.push(`${namn}: tecknet "${ch}" får inte användas i sorten`);
      if (ch === '.') return;
      punkter++;
      const x = b.x + i, y = b.y + j;
      if (x < R.ruta[0] || x > R.ruta[2] || y < R.ruta[1] || y > R.ruta[3]) fel.push(`${namn}: punkten (${x}, ${y}) ligger utanför rutan`);
    }));
    if (!punkter) fel.push(`${namn}: bilden är tom`);
  };
  for (const l of lagenFor(sort)) bild(svar.bilder?.[l], l);
  if (R.manbild) for (const l of lagenFor(sort)) bild(svar.man?.[l], 'man ' + l);
  if (R.barnbild) for (const l of lagenFor(sort)) bild(svar.barn?.[l], 'barn ' + l);
  return [...new Set(fel)].slice(0, 12);
}

// ---------- API:t ----------
// Nyckeln är Björns och ligger i miljön som BJORN_API_NYCKEL (miljön släpper inte igenom ANTHROPIC_API_KEY). Adressen anges
// här, eftersom ANTHROPIC_BASE_URL i miljön pekar någon annanstans (steg 5.2.2).
const ADRESS = 'https://api.anthropic.com';
function klient() {
  const nyckel = process.env.BJORN_API_NYCKEL;
  if (!nyckel) { console.error('BJORN_API_NYCKEL saknas i miljön. Lägg in den som en hemlighet i miljöns inställningar och starta en ny chatt.'); process.exit(1); }
  return new Anthropic({ apiKey: nyckel, baseURL: ADRESS });
}
const svarText = m => m.content.filter(b => b.type === 'text').map(b => b.text).join('');
const kostnad = u => ((u.input_tokens || 0) * PRIS.in + (u.output_tokens || 0) * PRIS.ut + (u.cache_read_input_tokens || 0) * PRIS.cacheLas + (u.cache_creation_input_tokens || 0) * PRIS.cacheSkriv) / 1e6;
async function batch(client, fragor, namn) {
  console.log(`Skickar ${fragor.length} frågor i en batch (${namn}) …`);
  const b = await client.messages.batches.create({ requests: fragor });
  let st;
  for (;;) {
    st = await client.messages.batches.retrieve(b.id);
    if (st.processing_status === 'ended') break;
    console.log(`  ${namn}: ${st.request_counts.succeeded} klara, ${st.request_counts.processing} kvar …`);
    await new Promise(r => setTimeout(r, 30_000));
  }
  const ut = {}; let summa = 0; const tokens = { in: 0, ut: 0, cacheLas: 0, cacheSkriv: 0 };
  for await (const r of await client.messages.batches.results(b.id)) {
    if (r.result.type !== 'succeeded') { ut[r.custom_id] = { fel: `${r.result.type}${r.result.type === 'errored' ? ': ' + r.result.error?.type : ''}` }; continue; }
    const m = r.result.message, u = m.usage; summa += kostnad(u);
    tokens.in += u.input_tokens || 0; tokens.ut += u.output_tokens || 0; tokens.cacheLas += u.cache_read_input_tokens || 0; tokens.cacheSkriv += u.cache_creation_input_tokens || 0;
    if (m.stop_reason === 'refusal') { ut[r.custom_id] = { fel: 'avböjd' }; continue; }
    if (m.stop_reason === 'max_tokens') { ut[r.custom_id] = { fel: 'svaret blev för långt' }; continue; }
    try { ut[r.custom_id] = { svar: JSON.parse(svarText(m)), usage: m.usage }; } catch (e) { ut[r.custom_id] = { fel: 'svaret var inte JSON' }; }
  }
  console.log(`  ${namn} klar: ungefär ${summa.toFixed(2)} dollar.`);
  return { ut, summa, tokens };
}
function spara(d, ritning, av) {
  const ritad = (d.ritad || 0) + 1;
  const o = { id: d.id, ritad, av, om: ritning.anteckning || '', bilder: ritning.bilder, ...(ritning.man ? { man: ritning.man } : {}), ...(ritning.barn ? { barn: ritning.barn } : {}) };
  fs.writeFileSync(path.join(DELAR, d.id + '.json'), JSON.stringify(o, null, 1) + '\n');
  d.ritad = ritad;
}

// ---------- val av delar ----------
function delarSomSkaRitas(args, allaRitade = false) {
  const val = args.length ? args : ANSIKTET;
  const ut = [];
  for (const a of val) {
    if (SORT[a]) { const [forebild, ...resten] = delarAv(a); if (!SORT[a].ritas) throw new Error(`Sorten ${a} kan inte ritas med skriptet än.`); ut.push(...resten.filter(d => allaRitade || !(d.ritad > 0))); void forebild; }
    else { const d = PR.delar.find(x => x.id === a); if (!d) throw new Error(`Okänd sort eller del: ${a}`); ut.push(d); }
  }
  return ut;
}
// ---------- kostnaden ----------
// Uppskattningen bygger på första körningen (2026-11-02, 9 näsor och 4 ögonbryn med en version och granskning): en ritning
// gav ungefär 550 + 225 tokens ut per bild som ritas (ett läge för kvinnan, mannen eller barnet), och granskningen
// 470 + 490. Valet bland tre antas ge 30 % mer än granskningen. En bild till API:t är ungefär bredd × höjd / 750 tokens,
// högst 1 600. Lågt och högt är 0,8 och 1,5 gånger det väntade: modellen tänker olika länge, och några delar tas om.
const bildTokens = sort => Math.min(1600, Math.round(lagenFor(sort).length * (64 * 4 + 8) * 3 * (64 * 4 + 8) / 750));
const bilderSomRitas = sort => lagenFor(sort).length * (1 + (SORT[sort].ritas.manbild ? 1 : 0) + (SORT[sort].ritas.barnbild ? 1 : 0));
const textTokens = f => Math.round((JSON.stringify(f.params.system).length + f.params.messages[0].content.filter(c => c.type === 'text').map(c => c.text).join('').length) / 3);
function delKostnad(d, ritIn) { // ritIn: tokens in i en ritfråga, bilden inräknad
  const I = bilderSomRitas(d.sort), B = bildTokens(d.sort);
  const ritUt = 550 + 225 * I, valIn = ritIn + B * VERSIONER + VERSIONER * 60 * I, valUt = 1.3 * (470 + 490 * I);
  return (VERSIONER * (ritIn * PRIS.in + ritUt * PRIS.ut) + valIn * PRIS.in + valUt * PRIS.ut) / 1e6;
}
async function uppskattning(delar, client = null) {
  const per = {}; let summa = 0;
  for (const d of delar) {
    const f = await fraga(d, { version: 1 });
    const ritIn = client ? (await client.messages.countTokens({ model: f.params.model, system: f.params.system, messages: f.params.messages })).input_tokens : textTokens(f) + bildTokens(d.sort);
    const k = delKostnad(d, ritIn); summa += k;
    per[d.sort] = per[d.sort] || { n: 0, k: 0 }; per[d.sort].n++; per[d.sort].k += k;
  }
  const lag = summa * 0.8, hog = summa * 1.5;
  const rader = Object.entries(per).map(([sort, p]) => `  ${SORT[sort].namn}: ${p.n} delar, ungefär ${p.k.toFixed(2)} dollar`);
  return { lag, hog, vantat: summa, text: `${delar.length} delar, bästa av ${VERSIONER}: ungefär ${lag.toFixed(2)}–${hog.toFixed(2)} dollar med batch (väntat ${summa.toFixed(2)})\n${rader.join('\n')}` };
}

// ---------- kommandona ----------
const [kommando, ...args] = process.argv.slice(2);
try {
  if (kommando === 'prov') {
    const client = klient();
    const m = await client.messages.create({ model: MODELL, max_tokens: 2000, output_config: { effort: 'low' }, messages: [{ role: 'user', content: 'Svara bara med ordet ok.' }] });
    console.log(`Nyckeln finns och provet gick igenom: modellen ${m.model} svarade "${svarText(m).trim()}" (${m.usage.input_tokens} tokens in, ${m.usage.output_tokens} ut).`);
  } else if (kommando === 'torrt' || kommando === 'kostnad') {
    const delar = delarSomSkaRitas(args);
    fs.mkdirSync(UT, { recursive: true });
    const fragor = []; for (const d of delar) fragor.push(await fraga(d, { version: 1 }));
    fs.writeFileSync(path.join(UT, 'fragor.json'), JSON.stringify(fragor.map(f => ({ ...f, params: { ...f.params, messages: f.params.messages.map(m => ({ ...m, content: m.content.map(c => c.type === 'image' ? { type: 'image', bild: `${c.source.data.length} tecken base64` } : c) })) } })), null, 1));
    // ett exempel på valet, med förebilden som tre låtsade versioner, så att frågan kan läsas utan att något skickas
    if (delar.length) { const d = delar[0], fb = lasDel(delarAv(d.sort)[0].id); const vf = await valet(d, [1, 2, 3].map(nr => ({ nr, svar: fb }))); fs.writeFileSync(path.join(UT, 'valet.json'), JSON.stringify({ ...vf, params: { ...vf.params, messages: vf.params.messages.map(m => ({ ...m, content: m.content.map(c => c.type === 'image' ? { type: 'image', bild: `${c.source.data.length} tecken base64` } : c) })) } }, null, 1)); }
    const u = await uppskattning(delar, kommando === 'kostnad' ? klient() : null);
    console.log(`${kommando === 'kostnad' ? 'Räknat' : 'Uppskattat'}: ${u.text}`);
    console.log(`Frågorna (utan bilderna) står i ${path.relative(process.cwd(), path.join(UT, 'fragor.json'))}.`);
  } else if (kommando === 'rita' || kommando === 'omrita') {
    const client = klient();
    let delar, kommentar = null;
    if (kommando === 'omrita') { const d = PR.delar.find(x => x.id === args[0]); if (!d || !args[1]) throw new Error('Skriv: omrita <id> "<kommentar>"'); delar = [d]; kommentar = args[1]; }
    else delar = delarSomSkaRitas(args);
    if (!delar.length) { console.log('Inget att rita.'); process.exit(0); }
    const fore = await uppskattning(delar);
    console.log(`Uppskattat före: ${fore.text}`);
    const opts = d => kommentar ? { kommentar, forra: lasDel(d.id) } : {};
    const tokens = { in: 0, ut: 0, cacheLas: 0, cacheSkriv: 0 }, plus = t => { for (const k in tokens) tokens[k] += t[k]; };
    // 1. tre versioner av varje del, var för sig
    const fragor = []; for (const d of delar) for (let v = 1; v <= VERSIONER; v++) fragor.push(await fraga(d, { ...opts(d), version: v }));
    const r1 = await batch(client, fragor, 'ritningen'); let summa = r1.summa; plus(r1.tokens);
    const versioner = {};
    for (const d of delar) versioner[d.id] = [...Array(VERSIONER)].map((_, i) => { const r = r1.ut[`${d.id}__v${i + 1}`]; return { nr: i + 1, svar: r?.svar, fel: r?.svar ? kontrollera(d.sort, r.svar) : [r?.fel || 'inget svar'] }; });
    // 2. koden kontrollerar; gick ingen version igenom ritas en till med felen
    const omtag = [];
    for (const d of delar) {
      if (versioner[d.id].some(x => !x.fel.length)) continue;
      const f = await fraga(d, { ...opts(d), version: VERSIONER + 1 });
      f.params.messages[0].content.push({ type: 'text', text: 'De förra försöken hade de här felen, som ska rättas: ' + [...new Set(versioner[d.id].flatMap(x => x.fel))].slice(0, 12).join('; ') });
      omtag.push(f);
    }
    if (omtag.length) {
      const o = await batch(client, omtag, 'omtagen'); summa += o.summa; plus(o.tokens);
      for (const d of delar) { const r = o.ut[`${d.id}__v${VERSIONER + 1}`]; if (r) versioner[d.id].push({ nr: VERSIONER + 1, svar: r.svar, fel: r.svar ? kontrollera(d.sort, r.svar) : [r.fel] }); }
    }
    // 3. API:t väljer den bästa av versionerna som gick igenom koden, på ansiktena och mot förebilden
    const valfragor = [];
    for (const d of delar) { const ok = versioner[d.id].filter(x => !x.fel.length); if (ok.length) valfragor.push(await valet(d, ok, { kommentar })); }
    const r3 = valfragor.length ? await batch(client, valfragor, 'valet') : { ut: {}, summa: 0, tokens: { in: 0, ut: 0, cacheLas: 0, cacheSkriv: 0 } };
    summa += r3.summa; plus(r3.tokens);
    // 4. den valda sparas; går valet inte igenom koden sparas versionen det pekade på (eller den första som gick igenom)
    const rapport = [];
    for (const d of delar) {
      const ok = versioner[d.id].filter(x => !x.fel.length), g = r3.ut[d.id]?.svar;
      let slut = null, hur = '';
      if (g && !kontrollera(d.sort, g).length) { slut = g; hur = g.val > 0 ? `version ${g.val} av ${ok.length} vald` : `ingen av ${ok.length} passade, en ny ritad i valet`; }
      else if (ok.length) { const v = ok.find(x => x.nr === g?.val) || ok[0]; slut = v.svar; hur = `version ${v.nr} av ${ok.length} (valet ${g ? 'gick inte igenom koden' : 'saknas: ' + (r3.ut[d.id]?.fel || '')})`; }
      if (!slut) { rapport.push(`${d.id}: inte ritad (${[...new Set(versioner[d.id].flatMap(x => x.fel))].slice(0, 3).join('; ')})`); continue; }
      spara(d, slut, `API:t (${MODELL}), bästa av ${ok.length}${kommentar ? ', omritad efter Björns kommentar' : ''}`);
      rapport.push(`${d.id}: ritad, ${hur}${g?.anteckning ? ': ' + g.anteckning : ''}`);
    }
    skrivRegister();
    await stangSidan();
    fs.mkdirSync(path.join(HAR, 'logg'), { recursive: true });
    fs.writeFileSync(path.join(HAR, 'logg', new Date().toISOString().slice(0, 19).replace(/:/g, '') + '.json'), JSON.stringify({ kommando, args, modell: MODELL, insats: INSATS, versioner: VERSIONER, uppskattat: { lag: +fore.lag.toFixed(2), hog: +fore.hog.toFixed(2) }, dollar: +summa.toFixed(3), tokens, rapport }, null, 1));
    console.log(rapport.join('\n'));
    console.log(`Klart: det kostade ungefär ${summa.toFixed(2)} dollar (uppskattat före: ${fore.lag.toFixed(2)}–${fore.hog.toFixed(2)}). Bygg sidan (node bildstil/bygg.cjs) och publicera bildstilen.`);
  } else {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 12).join('\n'));
  }
} catch (e) {
  if (e instanceof Anthropic.AuthenticationError) console.error('Nyckeln godtogs inte (fel nyckel eller utan rätt behörighet).');
  else if (e instanceof Anthropic.RateLimitError) console.error('För många frågor just nu; försök igen om en stund.');
  else if (e instanceof Anthropic.APIError) console.error(`API:t svarade med fel ${e.status}: ${e.message}`);
  else console.error(e.message || e);
  process.exitCode = 1;
} finally { await stangSidan(); }
