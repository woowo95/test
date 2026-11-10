// Kontrollerna på allt som ritas, före publiceringen (Björn efter bildstil v235): samma kontroller som valkorten och
// API-skripten (kontroll.js), på alla kort i valdelen och alla API:ts bilder, oavsett varifrån de kommer.
//
//   node bildstil/kontrollera.mjs              alla kort och bilder; felkoden är 1 om något bryter mot reglerna
//   node bildstil/kontrollera.mjs id …         bara de korten (id i VAL, eller bild:<id>)
//   node bildstil/kontrollera.mjs --bilder id … sparar dessutom kortens versioner och sammanhang som PNG i
//                                               bildstil/kontroll-ut/, som Claude tittar på innan sidan publiceras
//
// Kör node bildstil/bygg.cjs först.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const HAR = path.dirname(fileURLToPath(import.meta.url)), html = path.join(HAR, 'bildstil.html'), UT = path.join(HAR, 'kontroll-ut');
if (!fs.existsSync(html)) { console.error('Bygg sidan först: node bildstil/bygg.cjs'); process.exit(1); }
const args = process.argv.slice(2), bilder = args.includes('--bilder'), ids = args.filter(a => !a.startsWith('--'));
const pw = createRequire(import.meta.url)('playwright');
const b = await pw.chromium.launch(), sida = await b.newPage();
const sidfel = []; sida.on('pageerror', e => sidfel.push(e.message));
await sida.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
await sida.goto('file://' + html); await sida.waitForFunction(() => window.KONTROLL && window.BILDERNA);
const res = (await sida.evaluate(() => window.KONTROLL.allt())).filter(r => !ids.length || ids.includes(r.id));
let antalFel = 0;
for (const r of res) {
  if (!r.fel.length) continue;
  antalFel++;
  console.log(`⚠ ${r.id} (${r.namn}${r.slag?.length ? ', ' + r.slag.join(', ') : ''})`);
  for (const f of r.fel) console.log(`    ${f.version ? 'version ' + f.version + ': ' : ''}${f.kontroll}: ${f.text}`);
}
console.log(`${res.length} kort och bilder, ${antalFel} med fel.`);
if (bilder) {
  fs.mkdirSync(UT, { recursive: true });
  for (const r of res.filter(r => !r.id.startsWith('bild:'))) {
    const png = await sida.evaluate(id => window.KONTROLL.kortPng(id), r.id);
    if (png) fs.writeFileSync(path.join(UT, r.id + '.png'), Buffer.from(png, 'base64'));
  }
  console.log(`Versionerna och sammanhanget som bilder i ${path.relative(process.cwd(), UT)}/: titta på dem innan sidan publiceras.`);
}
if (sidfel.length) console.log('Fel på sidan: ' + [...new Set(sidfel)].slice(0, 5).join('; '));
await b.close();
process.exitCode = antalFel ? 1 : 0;
