// Skriptet som ritar om valkorten med Claude API:t (Björn efter bildstil v236: bilderna ritas i första hand med API:t
// tills krediterna är slut).
//
//   node bildstil/api/forslag.mjs torrt <kort …>     bygger frågorna utan att skicka dem och uppskattar kostnaden
//   node bildstil/api/forslag.mjs rita <kort …>      ritar tre nya versioner av varje kort och sparar dem i
//                                                    bildstil/forslag/<kort>.json, som ersätter kortet i valdelen
//   node bildstil/api/forslag.mjs varnar             listar korten som kontrollerna varnar för
//   ett kort med kommentar: f8_bage="nya versioner: strängen går genom huvudet"  (kommentaren följer med; "nya versioner"
//   eller "utan förlaga" ger nya idéer, en annan kommentar betyder "ändra": versionerna utgår från det nuvarande kortet)
//
// Arbetssättet är detsamma som för all ritning (bildstilens guide och bilder.mjs): tre idéer i ord som skiljer sig i form
// eller byggsätt; varje version ritas i en egen fråga med bara sin idé, utan att se de andra versionerna eller kortets förra
// ritningar; kontrollerna i bildstil/kontroll.js (symmetri, stationernas vinkel, inget genom huvudet, alla riktningar för
// det som bärs, versioner som skiljer sig i form) körs via sidan, och den som inte går igenom ritas om en gång med felen;
// sist granskar API:t varje version i sitt sammanhang (på gräset bredvid en kolonist) och rättar det som bryter mot
// logiken. Det som bärs ritas direkt på kolonisten framifrån, från sidan, bakifrån och i porträttet (bildstil/forslag.js).
// Nyckeln läses ur BJORN_API_NYCKEL och skrivs aldrig ut, och frågorna går bara till https://api.anthropic.com.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import Anthropic from '@anthropic-ai/sdk';
import { guideText } from './guide.mjs';

const HAR = path.dirname(fileURLToPath(import.meta.url)), BILDSTIL = path.resolve(HAR, '..');
const UT = path.join(BILDSTIL, 'forslag'), TORRT = path.join(HAR, 'ut');
const MODELL = 'claude-opus-5-5', INSATS = 'high', MAXTOKENS = 48000, VERSIONER = 3;
const PRIS = { in: 2, ut: 10, cacheLas: 0.1, cacheSkriv: 2.5 }; // per miljon tokens med batch
const PT = JSON.parse(fs.readFileSync(path.join(BILDSTIL, 'portratt.json'), 'utf8')).tecken;
const TECKEN = [...JSON.parse(fs.readFileSync(path.join(BILDSTIL, 'bilder.json'), 'utf8')).tecken];
const ARMAR = ['hanga', 'framfor', 'lyfta', 'bara'];

// ---------- sidan ----------
let webblasare = null, sida = null;
async function oppna() {
  if (sida) return sida;
  const pw = createRequire(import.meta.url)('playwright'), html = path.join(BILDSTIL, 'bildstil.html');
  if (!fs.existsSync(html)) throw new Error('Bygg sidan först: node bildstil/bygg.cjs');
  webblasare = await pw.chromium.launch(); sida = await webblasare.newPage();
  await sida.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await sida.goto('file://' + html); await sida.waitForFunction(() => window.FORSLAGEN && window.KONTROLL && window.BILDERNA);
  return sida;
}
const pa = async (f, a) => (await oppna()).evaluate(f, a);
const hexar = () => pa(() => window.BILDERNA.hex());

// ---------- frågorna ----------
const bildBlock = b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } });
let SYS = null;
async function system() {
  if (SYS) return SYS;
  const H = await hexar();
  return (SYS = guideText(TECKEN.map(ch => `${ch} = ${PT[ch]} (${H[ch]})`).join(', ')));
}
const fraga = (id, innehall, sch) => ({ custom_id: id, params: { model: MODELL, max_tokens: MAXTOKENS, thinking: { type: 'adaptive' },
  output_config: { effort: INSATS, format: { type: 'json_schema', schema: sch } },
  system: [{ type: 'text', text: SYS, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: innehall }] } });
const strang = { type: 'array', items: { type: 'string' } };
function schema(bars) {
  const props = { anteckning: { type: 'string' }, bilder: { type: 'array', items: { type: 'object', properties: { namn: { type: 'string' }, rader: strang }, required: ['namn', 'rader'], additionalProperties: false } } };
  const req = ['anteckning', 'bilder'];
  if (bars) {
    const lager = { type: 'object', properties: { framfor: strang, bakom: strang }, required: ['framfor', 'bakom'], additionalProperties: false };
    const fig = { type: 'object', properties: { arm: { type: 'string', enum: ARMAR }, framfor: strang, bakom: strang }, required: ['arm', 'framfor', 'bakom'], additionalProperties: false };
    Object.assign(props, { fram: fig, sida: fig, bak: fig, portratt: lager }); req.push('fram', 'sida', 'bak', 'portratt');
  }
  return { type: 'object', properties: props, required: req, additionalProperties: false };
}
const symbol = k => /^symbol/i.test(k.namn);
const omKortet = k => [
  `Kortet "${k.namn}" (${k.id}) i bildstilens valdel. Vad det ska visa: ${k.vad.replace(/(Din kommentar förra gången|Du bad mig|Jag valde|Ritad av API:t).*$/s, '').trim()}`,
  symbol(k) ? 'Det är en symbol: 16 × 16 punkter, ritad framifrån eller från sidan så att den nästan fyller rutan, med mörk kontur runt hela och få, stora former, utan bakgrund.'
    : 'Sakerna ritas i sin naturliga storlek mot kartan: en ruta är 16 × 16 punkter och en stående människa 14 × 20. Ingen bild är större än 64 × 64 punkter (fyra rutor).',
  k.bars ? 'Saken bärs av en människa. Den ritas både som sak (på marken) och på kolonisten framifrån, från sidan och bakifrån och i porträttet.' : '',
  (k.slagNamn || []).includes('planta') ? 'Det är plantan som växer på åkern: rita en planta som den står på en ruta av åkern (16 × 16 punkter, fårad jord). Sammanhanget visar den på varje ruta av en åker.' : '',
  (k.slagNamn || []).includes('trad') ? 'Det är ett träd eller en buske som står på marken: rita det i samma stil och storlek som spelets granar och björkar (ett vuxet träd är omkring 31 punkter högt och ett gammalt 46). Sammanhanget visar det bredvid spelets träd.' : '',
  (k.slagNamn || []).includes('hopsatt') ? 'Det sätts ihop av många bitar: rita två bilder, "längs" (biten längs en vågrät kant, 16 punkter bred) och "tvärs" (biten längs en lodrät kant, 16 punkter hög, sedd snett uppifrån). Bitarna ska passa ihop i ändarna; sammanhanget sätter ihop dem till en hage, 4 bitar längs och 2 på varje sida.' : '',
].filter(Boolean).join('\n\n');
const omBars = u => `Det som bärs ritas på kolonisten som två lager för varje riktning: framfor (ritas över figuren) och bakom (ritas bara där figuren inte är). Varje lager är rader på en duk på 26 × 32 punkter där figuren (14 × 20) står med övre vänstra hörnet i (6, 6), alltså kolumnerna 6–19 och raderna 6–25; arm säger hur armarna står (hanga, framfor: framsträckt, lyfta: ena armen upp, bara: bär i famnen). Kolonisten utan något, framifrån: ${JSON.stringify(u.fram)}; från sidan (vänd åt höger): ${JSON.stringify(u.sida)}; bakifrån: ${JSON.stringify(u.bak)}. Huvudet är raderna 6–11; inget får ritas över det. I porträttet (64 × 64, huvudet och axlarna, framifrån) är lagren rader på 64 × 64 punkter: bakom syns bara på bakgrunden (bakom huvudet och axlarna), framfor över allt. Ritas något framfor i porträttet får det aldrig gå över ansiktet. Porträttet utan något: ${JSON.stringify(u.portratt)}. Lämna ett lager tomt ([]) när inget syns där. I porträttet syns bara den del som logiskt syns.`;

async function ideer(k, kommentar) {
  const text = [omKortet(k), kommentar ? `Björns kommentar om de förra versionerna: ${kommentar}` : '',
    `Ge ${VERSIONER} idéer i ord för hur kortet kan ritas, innan något ritas. Tänk först på logiken: hur saken bärs, hålls eller står och vad som då syns, och om den är symmetrisk på riktigt. Idéerna ska skilja sig i form, silhuett eller byggsätt (t.ex. rund mot fyrkantig, hög mot låg, av stockar mot av sten), aldrig bara i färg, storlek eller små detaljer. Varje idé är två eller tre meningar som räcker för att rita den utan att se de andra: formen, delarna, materialet, vad som syns från spelets vinkel${k.bars ? ' och hur den sitter på kolonisten' : ''}.`].filter(Boolean).join('\n\n');
  return fraga(k.id + '__ideer', [{ type: 'text', text }], { type: 'object', properties: { ideer: strang }, required: ['ideer'], additionalProperties: false });
}
async function rita(k, nr, { ide, kommentar, lage, fel }) {
  const bilder = [await pa(() => window.BILDERNA.scen())], text = [];
  text.push('Den första bilden är byns scen i dagsljus med de godkända bilderna i stilen, tre gånger större. Det du ritar ska höra ihop med den: kontur, ljus, korn.');
  if (k.bars) { bilder.push(k.underlagPng); text.push('Den andra bilden är kolonisten framifrån, från sidan och bakifrån och i porträttet, utan något, fyra gånger större.'); }
  if (!symbol(k) && !k.bars) { bilder.push(await pa(() => window.FORSLAGEN.behallarePng(4))); text.push(`Bild ${bilder.length} visar behållarna som finns i spelet, fyra gånger större: den stora lerkrukan och näverasken. Ligger saken i en behållare är det en av dem, ritad som de är; hitta aldrig på en ny behållare.`); }
  if (lage === 'andra') { bilder.push(k.kortPng); text.push('Den sista bilden är kortet som det ser ut nu, tre gånger större.'); }
  text.push(omKortet(k));
  if (k.bars) text.push(omBars(k.underlag));
  if (lage === 'andra') text.push(`Ändra kortet efter Björns kommentar: behåll det kommentaren inte gäller, och ändra det den gäller tydligt. Kommentaren: ${kommentar}`);
  else { if (kommentar) text.push(`Björns kommentar om de förra versionerna, som ska följas: ${kommentar}`); text.push(`Idén för den här versionen: ${ide}\nRita den idén. De andra versionerna ritas efter andra idéer i egna frågor, och du ser dem inte.`); }
  text.push('Svara med bilderna (namn och rader; alla sakerna kortet ska visa, t.ex. flera stadier eller storlekar om kortet säger det), och skriv i anteckningen kort hur du tänkt om logiken: hur saken står, hålls eller bärs och vad som då syns.');
  if (fel?.length) text.push('Det förra försöket med samma idé hade de här felen, som ska rättas: ' + fel.join('; '));
  return fraga(`${k.id}__v${nr}`, [...bilder.map(bildBlock), { type: 'text', text: text.join('\n\n') }], schema(k.bars));
}
async function granska(k, nr, v) {
  const png = await pa(x => window.FORSLAGEN.png(x.v, 4, x.slag), { v, slag: k.slagNamn || [] });
  const text = [omKortet(k), k.bars ? omBars(k.underlag) : '', `Bilden visar version ${nr} som den ritats: överst kortet på gräset${k.bars ? ' med kolonisten och porträttet' : ''}, under det den största saken i spelets storlek i sitt sammanhang (på gräset bredvid en kolonist (14 × 20) och godkända saker, på en åker om det är en planta, bredvid spelets träd om det är ett träd), fyra gånger större.`,
    `Idén: ${v.ide}`, `Versionen: ${JSON.stringify({ bilder: v.bilder, ...(k.bars ? { fram: v.fram, sida: v.sida, bak: v.bak, portratt: v.portratt } : {}) })}`,
    'Granska den mot bildstilens regler och logiken: storleken mot kolonisten, vinkeln (snett uppifrån, stationer med ytan ovanifrån), symmetrin, att den syns på gräset, att den följer idén och, för det som bärs, att den sitter där en människa skulle ha den och aldrig går genom huvudet eller ansiktet. Rätta det som bryter mot reglerna och svara med hela versionen (oförändrad om inget behöver rättas), och skriv vad du rättade i anteckningen.'].filter(Boolean).join('\n\n');
  return fraga(`${k.id}__g${nr}`, [bildBlock(png), { type: 'text', text }], schema(k.bars));
}

// ---------- koden kontrollerar varje version: tecknen och storleken, sedan kontrollerna på sidan ----------
const putsa = (rader, w, h) => (Array.isArray(rader) ? rader : []).slice(0, h).map(r => String(r).slice(0, w).replace(/[^.]/g, ch => TECKEN.includes(ch) ? ch : '.'));
function tecken(k, svar) {
  const fel = [];
  if (!svar || !Array.isArray(svar.bilder) || !svar.bilder.length) return { fel: ['inga bilder'] };
  const max = symbol(k) ? 16 : 64;
  for (const b of svar.bilder) {
    const r = (b.rader || []).map(x => String(x));
    if (r.some(x => [...x].some(ch => ch !== '.' && !TECKEN.includes(ch)))) fel.push(`${b.namn}: tecken som inte finns i paletten`);
    const w = Math.max(0, ...r.map(x => x.replace(/\.+$/, '').length));
    if (w > max || r.length > max) fel.push(`${b.namn} är ${w} × ${r.length} punkter, högst ${max} × ${max}`);
    if (!r.join('').replace(/\./g, '')) fel.push(`${b.namn} är tom`);
  }
  const v = { bilder: svar.bilder.map(b => ({ namn: b.namn, rader: putsa(b.rader, max, max) })), anteckning: svar.anteckning || '' };
  if (k.bars) {
    for (const r of ['fram', 'sida', 'bak']) { const o = svar[r] || {}; v[r] = { arm: ARMAR.includes(o.arm) ? o.arm : 'hanga', framfor: putsa(o.framfor, 26, 32), bakom: putsa(o.bakom, 26, 32) }; }
    const o = svar.portratt || {}; v.portratt = { framfor: putsa(o.framfor, 64, 64), bakom: putsa(o.bakom, 64, 64) };
  }
  return { v, fel };
}
// kontrollerna på sidan för en version (utan olika) och olika för alla
const kontroll = async (k, v) => (await pa(d => window.FORSLAGEN.kontroll(d), { kort: k.id, namn: k.namn, slag: k.slag, versioner: [v] })).filter(x => x.kontroll !== 'olika').map(x => `${x.kontroll}: ${x.text}`);
const olika = async (k, lista) => (await pa(d => window.FORSLAGEN.kontroll(d), { kort: k.id, namn: k.namn, slag: k.slag, versioner: lista })).filter(x => x.kontroll === 'olika');

// ---------- API:t ----------
function klient() {
  const nyckel = process.env.BJORN_API_NYCKEL;
  if (!nyckel) { console.error('BJORN_API_NYCKEL saknas i miljön.'); process.exit(1); }
  return new Anthropic({ apiKey: nyckel, baseURL: 'https://api.anthropic.com' });
}
const kostnad = u => ((u.input_tokens || 0) * PRIS.in + (u.output_tokens || 0) * PRIS.ut + (u.cache_read_input_tokens || 0) * PRIS.cacheLas + (u.cache_creation_input_tokens || 0) * PRIS.cacheSkriv) / 1e6;
let SUMMA = 0;
async function batch(client, fragor, namn) {
  if (!fragor.length) return {};
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
    try { ut[r.custom_id] = { svar: JSON.parse(m.content.filter(c => c.type === 'text').map(c => c.text).join('')) }; } catch (e) { ut[r.custom_id] = { fel: 'svaret var inte JSON' }; }
  }
  SUMMA += summa; console.log(`  ${namn} klar: ungefär ${summa.toFixed(2)} dollar.`);
  return ut;
}
// en grov uppskattning per kort: idéerna, tre ritningar, omtag för ungefär hälften och tre granskningar; det som bärs har
// lagren på kolonisten och i porträttet och kostar ungefär tre gånger så mycket ut
const uppskattning = kort => { const per = k => ((2000 * PRIS.in + 3000 * PRIS.ut) + VERSIONER * 1.5 * (6000 * PRIS.in + (k.bars ? 20000 : 7000) * PRIS.ut) + VERSIONER * (8000 * PRIS.in + (k.bars ? 18000 : 6000) * PRIS.ut)) / 1e6;
  const s = kort.reduce((n, k) => n + per(k), 0); return { lag: s * 0.7, hog: s * 1.5 }; };

const utanForlaga = k => !!k && /utan förlaga|helt ny|från början|gör om (hela )?helt|nya (versioner|idéer|förslag)/i.test(k);

// ---------- kommandona ----------
const [kommando, ...args] = process.argv.slice(2);
try {
  if (kommando === 'varnar') {
    const r = await pa(() => VAL.map(s => ({ id: s.id, namn: s.namn, fel: (() => { try { return KONTROLL.kort(s).resultat.filter(x => !x.ok).length; } catch (e) { return -1; } })() })).filter(x => x.fel));
    for (const x of r) console.log(`${x.id}\t${x.namn}\t${x.fel} fel`);
  } else if (kommando === 'torrt' || kommando === 'rita') {
    const kommentarer = {}, ids = args.map(a => { const i = a.indexOf('='); if (i < 0) return a; kommentarer[a.slice(0, i)] = a.slice(i + 1).trim(); return a.slice(0, i); });
    const kort = [];
    for (const id of ids) {
      const k = await pa(i => window.FORSLAGEN.info(i), id); if (!k) throw new Error('Inget kort med id ' + id);
      if (k.bars) { k.underlag = {}; for (const r of ['fram', 'sida', 'bak', 'portratt']) k.underlag[r] = (await pa(x => window.FORSLAGEN.underlag(x), r)).rader; k.underlagPng = await pa(() => window.FORSLAGEN.underlagPng(4)); }
      k.kommentar = kommentarer[id] || null; k.lage = k.kommentar && !utanForlaga(k.kommentar) ? 'andra' : 'nya';
      if (k.lage === 'andra') k.kortPng = await pa(i => window.FORSLAGEN.kortPng(i), id);
      kort.push(k);
    }
    const fore = uppskattning(kort);
    for (const k of kort) console.log(`${k.id} (${k.namn})${k.bars ? ', bärs' : ''}: ${k.lage === 'andra' ? 'ändra efter kommentaren' : 'nya idéer'}${k.kommentar ? ' — ' + k.kommentar : ''}`);
    console.log(`Uppskattat före: ${kort.length} kort, ungefär ${fore.lag.toFixed(2)}–${fore.hog.toFixed(2)} dollar med batch.`);
    await system();
    if (kommando === 'torrt') {
      fs.mkdirSync(TORRT, { recursive: true });
      const k = kort[0], f = [await ideer(k, k.kommentar), await rita(k, 1, { ide: '(idé 1 från idéfrågan)', kommentar: k.kommentar, lage: k.lage })];
      const utanBilder = q => ({ ...q, params: { ...q.params, messages: q.params.messages.map(m => ({ ...m, content: m.content.map(c => c.type === 'image' ? { type: 'image', bild: `${c.source.data.length} tecken base64` } : c) })) } });
      fs.writeFileSync(path.join(TORRT, 'forslagfraga.json'), JSON.stringify(f.map(utanBilder), null, 1));
      console.log(`Frågorna för ${k.id} (utan bilderna) står i ${path.relative(process.cwd(), path.join(TORRT, 'forslagfraga.json'))}.`);
    } else {
      const client = klient();
      // 1. idéerna
      const nya = kort.filter(k => k.lage === 'nya'), r0 = await batch(client, await Promise.all(nya.map(k => ideer(k, k.kommentar))), 'idéerna');
      for (const k of kort) k.ideer = k.lage === 'nya' ? (r0[k.id + '__ideer']?.svar?.ideer || []).slice(0, VERSIONER) : [];
      // 2. varje version för sig
      const f1 = []; for (const k of kort) for (let n = 1; n <= VERSIONER; n++) f1.push(await rita(k, n, { ide: k.ideer[n - 1] || 'rita kortet på ditt eget sätt inom reglerna', kommentar: k.kommentar, lage: k.lage }));
      const r1 = await batch(client, f1, 'ritningen');
      const ver = {};
      const prova = async (k, svar, ide) => { const t = tecken(k, svar); if (!t.v) return { fel: t.fel }; t.v.ide = ide; const fel = [...t.fel, ...(await kontroll(k, t.v))]; return { v: t.v, fel }; };
      for (const k of kort) { ver[k.id] = []; for (let n = 1; n <= VERSIONER; n++) { const r = r1[`${k.id}__v${n}`], ide = k.ideer[n - 1] || ''; ver[k.id].push({ nr: n, ide, ...(r?.svar ? await prova(k, r.svar, ide) : { fel: [r?.fel || 'inget svar'] }) }); } }
      const olikaFel = async k => { if (k.lage === 'andra') return; const ok = ver[k.id].filter(x => x.v && !x.fel.length); if (ok.length < 2) return;
        for (const o of await olika(k, ok.map(x => x.v))) ok[o.version - 1].fel.push('olika: versionen har nästan samma form som en annan; följ idén tydligare, så att formen blir en annan'); };
      for (const k of kort) await olikaFel(k);
      // 3. omtag med felen, en gång
      const f2 = []; for (const k of kort) for (const x of ver[k.id]) if (x.fel.length) { const q = await rita(k, x.nr, { ide: x.ide || 'rita kortet på ditt eget sätt inom reglerna', kommentar: k.kommentar, lage: k.lage, fel: [...new Set(x.fel)].slice(0, 12) }); q.custom_id = `${k.id}__o${x.nr}`; f2.push(q); }
      const r2 = await batch(client, f2, 'omtagen');
      for (const k of kort) { for (const x of ver[k.id]) { const r = r2[`${k.id}__o${x.nr}`]; if (!r?.svar) continue; const p = await prova(k, r.svar, x.ide); if (p.v && (!x.v || p.fel.length <= x.fel.filter(f => !f.startsWith('olika')).length)) Object.assign(x, p); else x.fel = x.fel.filter(f => !f.startsWith('olika')); } await olikaFel(k); }
      // 4. granskningen i sammanhanget
      const f3 = []; for (const k of kort) for (const x of ver[k.id]) if (x.v) f3.push(await granska(k, x.nr, x.v));
      const r3 = await batch(client, f3, 'granskningen');
      const rapport = [];
      for (const k of kort) {
        for (const x of ver[k.id]) { const r = r3[`${k.id}__g${x.nr}`]; if (!r?.svar || !x.v) continue; const p = await prova(k, r.svar, x.ide);
          if (p.v && p.fel.length <= x.fel.filter(f => !f.startsWith('olika')).length) { p.v.anteckning = [x.v.anteckning, r.svar.anteckning && 'Granskningen: ' + r.svar.anteckning].filter(Boolean).join(' '); Object.assign(x, p); } }
        const bra = ver[k.id].filter(x => x.v);
        if (!bra.length) { rapport.push(`${k.id}: inte ritad (${[...new Set(ver[k.id].flatMap(x => x.fel))].slice(0, 3).join('; ')})`); continue; }
        const kvar = [...(await olika(k, bra.map(x => x.v))).map(o => `version ${o.version}: olika`), ...bra.flatMap(x => (x.fel || []).filter(f => !f.startsWith('olika')).map(f => `version ${x.nr}: ${f}`))];
        const o = { kort: k.id, namn: k.namn, slag: k.slag, vad: k.vad, av: `API:t (${MODELL}), tre idéer`, ...(k.kommentar ? { kommentar: k.kommentar } : {}), versioner: bra.map(x => x.v) };
        fs.mkdirSync(UT, { recursive: true }); fs.writeFileSync(path.join(UT, k.id + '.json'), JSON.stringify(o, null, 1) + '\n');
        rapport.push(`${k.id}: ${bra.length} versioner${kvar.length ? '; kontrollerna varnar fortfarande: ' + kvar.join('; ') : ''}`);
      }
      fs.mkdirSync(path.join(HAR, 'logg'), { recursive: true });
      fs.writeFileSync(path.join(HAR, 'logg', 'forslag-' + new Date().toISOString().slice(0, 19).replace(/:/g, '') + '.json'), JSON.stringify({ kommando, args, modell: MODELL, uppskattat: { lag: +fore.lag.toFixed(2), hog: +fore.hog.toFixed(2) }, dollar: +SUMMA.toFixed(3), rapport }, null, 1));
      console.log(rapport.join('\n'));
      console.log(`slut: det kostade ungefär ${SUMMA.toFixed(2)} dollar (uppskattat före: ${fore.lag.toFixed(2)}–${fore.hog.toFixed(2)}).`);
    }
  } else console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(0, 10).join('\n'));
} catch (e) {
  if (e instanceof Anthropic.APIError) console.error(`API:t svarade med fel ${e.status}: ${e.message}`);
  else console.error(e.stack || e.message || e);
  process.exitCode = 1;
} finally { if (webblasare) await webblasare.close(); }
