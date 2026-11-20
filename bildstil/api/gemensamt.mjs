// Det som API-skripten (bilder.mjs, forslag.mjs, rita.mjs och bestar.mjs) har gemensamt: modellen och priset, klienten
// med Björns nyckel, batchen som väntar på svaren, bilderna i frågorna och sidan i en webbläsare. Antalet tokens i ett svar
// (MAXTOKENS) och antalet versioner står i varje skript, eftersom de är olika.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

export const MODELL = 'claude-opus-5-5';
// pris per miljon tokens med batch (halva standardpriset för Claude Opus 5.5: 4 och 20 dollar)
export const PRIS = { in: 2, ut: 10, cacheLas: 0.1, cacheSkriv: 2.5 };

// Björns nyckel, och frågorna går direkt till Anthropic: ANTHROPIC_BASE_URL i miljön pekar någon annanstans (steg 5.2.2)
export function klient() {
  const nyckel = process.env.BJORN_API_NYCKEL;
  if (!nyckel) { console.error('BJORN_API_NYCKEL saknas i miljön. Lägg in den som en hemlighet i miljöns inställningar och starta en ny chatt.'); process.exit(1); }
  return new Anthropic({ apiKey: nyckel, baseURL: 'https://api.anthropic.com' });
}
// Björns nej utan kommentar: förslagen ritas om utan förlaga (Björn efter bildstil v241)
export const TOMT_NEJ = 'Björn sa nej till förra ritningen utan att skriva varför: rita en bättre.';
export const svarText = m => m.content.filter(c => c.type === 'text').map(c => c.text).join('');
export const kostnad = u => ((u.input_tokens || 0) * PRIS.in + (u.output_tokens || 0) * PRIS.ut + (u.cache_read_input_tokens || 0) * PRIS.cacheLas + (u.cache_creation_input_tokens || 0) * PRIS.cacheSkriv) / 1e6;

// en batch: frågorna skickas, och skriptet tittar efter svaren var 30:e sekund. Ger svaren per custom_id ({ svar } eller
// { fel }), vad batchen kostade och hur många tokens den använde. Bara ett svar som slutat som det ska och är JSON godtas.
export async function batch(client, fragor, namn) {
  const ut = {}, tokens = { in: 0, ut: 0, cacheLas: 0, cacheSkriv: 0 }; let summa = 0;
  if (!fragor.length) return { ut, summa, tokens };
  console.log(`Skickar ${fragor.length} frågor i en batch (${namn}) …`);
  const b = await client.messages.batches.create({ requests: fragor.map(f => ({ custom_id: f.custom_id, params: f.params })) });
  for (;;) {
    const st = await client.messages.batches.retrieve(b.id);
    if (st.processing_status === 'ended') break;
    console.log(`  ${namn}: ${st.request_counts.succeeded} klara, ${st.request_counts.processing} kvar …`);
    await new Promise(r => setTimeout(r, 30_000));
  }
  for await (const r of await client.messages.batches.results(b.id)) {
    if (r.result.type !== 'succeeded') { ut[r.custom_id] = { fel: `${r.result.type}${r.result.type === 'errored' ? ': ' + (r.result.error?.error?.message || r.result.error?.type) : ''}` }; continue; }
    const m = r.result.message, u = m.usage; summa += kostnad(u);
    tokens.in += u.input_tokens || 0; tokens.ut += u.output_tokens || 0; tokens.cacheLas += u.cache_read_input_tokens || 0; tokens.cacheSkriv += u.cache_creation_input_tokens || 0;
    if (m.stop_reason === 'refusal') { ut[r.custom_id] = { fel: 'avböjd' }; continue; }
    if (m.stop_reason === 'max_tokens') { ut[r.custom_id] = { fel: 'svaret blev för långt' }; continue; }
    if (m.stop_reason !== 'end_turn') { ut[r.custom_id] = { fel: m.stop_reason }; continue; }
    try { ut[r.custom_id] = { svar: JSON.parse(svarText(m)) }; } catch (e) { ut[r.custom_id] = { fel: 'svaret var inte JSON' }; }
  }
  console.log(`  ${namn} klar: ungefär ${summa.toFixed(2)} dollar.`);
  return { ut, summa, tokens };
}

// en bild (PNG i base64) i en fråga, och en fråga utan bilderna (bara hur stora de är) att spara vid torrt
export const bildBlock = b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } });
export const utanBilder = f => ({ ...f, params: { ...f.params, messages: f.params.messages.map(m => ({ ...m, content: m.content.map(c => c.type === 'image' ? { type: 'image', bild: `${c.source.data.length} tecken base64` } : c) })) } });

// bildstilens sida (bildstil.html, byggd med node bildstil/bygg.cjs) i en webbläsare, en gång per körning. vanta är det
// som ska finnas på sidan innan skriptet går vidare; text: sidan läses in som text med teckenkodningen (bestskaparen)
export function sidan(vanta, { text = false } = {}) {
  const html = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bildstil.html');
  let webblasare = null, sida = null;
  const oppna = async () => {
    if (sida) return sida;
    let pw; try { pw = createRequire(import.meta.url)('playwright'); } catch (e) { throw new Error('Playwright behövs för bilderna (finns i molnmiljön).'); }
    if (!fs.existsSync(html)) throw new Error('Bygg sidan först: node bildstil/bygg.cjs');
    webblasare = await pw.chromium.launch(); sida = await webblasare.newPage();
    await sida.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    // utan charset gissar Chromium ibland fel på filen när den läses in som text
    if (text) await sida.setContent('<meta charset="utf-8">' + fs.readFileSync(html, 'utf8'), { waitUntil: 'load' });
    else await sida.goto('file://' + html);
    await sida.waitForFunction(vanta);
    return sida;
  };
  const stang = async () => { if (webblasare) await webblasare.close(); webblasare = sida = null; };
  return { oppna, stang };
}
