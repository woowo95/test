// Bygger texter/sida.json av texter/hela.json (hela.ts) och texter/forslag.json (prova.ts). Bildstilens sida (avsnittet
// Texterna, bildstil/texter.js) läser den när den byggs: de hela texterna från varje ställe i spelet, som Björn
// kommenterar, och ett kort per rättelse, ny kontroll och mall, som han svarar ja eller nej på. Svaren ligger i
// bildstilens databas, samlingen 'texter' (se texter/README.md).
//   npx tsx texter/hela.ts && npx tsx texter/prova.ts texter/matning/texter-fore.json texter/matning/logg-*.json
//   node texter/bygg.cjs && node bildstil/bygg.cjs
const fs = require('fs');
const path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'forslag.json'), 'utf8'));

const GRUPPNAMN = {
  '1a': 'hen blir han eller hon', '1b': 'Ändelser, genus och tal', '1c': 'Skälet i hedersnamn och öknamn',
  '1d': 'Artikeln i ryktena', '1e': 'Binamnen', '1f': 'Namnen', 'ord': 'Ord', 'm': 'Mönster ur genomgången',
};
const kort = [];
for (const r of d.rattelser) {
  const g = r.grupp.split(' ')[0];
  kort.push({ id: 'r-' + r.id, del: 'rattelser', grupp: g, rubrik: GRUPPNAMN[g] || r.grupp, fil: r.fil, nu: r.nu, blir: r.blir, varfor: r.varfor, exempel: r.exempel || [] });
}
for (const k of d.kontroller) {
  const i = d.idag[k.id] || { n: 0, ex: [] };
  kort.push({ id: 'k-' + k.id, del: 'kontroller', rubrik: k.namn, antal: Math.round(i.n), ex: i.ex.slice(0, 5) });
}
for (const p of d.prov) {
  const v = d.varianter[p.mall] || {}; const m = d.mallar[p.mall] || {};
  kort.push({
    id: 'm-' + p.mall, del: 'mallar', mall: p.mall, ny: p.ny, fore: p.fore, efter: p.efter,
    varfor: v.varfor || (m.nu ? 'I dag en fast rad: ' + m.nu : ''), fil: m.fil || '', ta_bort: v.ta_bort || [],
    nya: p.varianter.filter(x => x.ny).map(x => ({ text: x.text, villkor: x.villkor, fel: x.fel })),
    gamla: p.varianter.filter(x => !x.ny).map(x => x.text),
  });
}
const hela = JSON.parse(fs.readFileSync(path.join(__dirname, 'hela.json'), 'utf8'));
// Claudes genomgång av varje hel text (granskning.json): en kommentar och mönstren (förslagen m_…) som felet hör till
const gr = JSON.parse(fs.readFileSync(path.join(__dirname, 'granskning.json'), 'utf8'));
for (const p of hela) for (const t of p.texter) if (gr[t.id]) { t.claude = gr[t.id].k; t.monster = gr[t.id].m; }
const utan = hela.flatMap(p => p.texter).filter(t => !t.claude).map(t => t.id);
if (utan.length) console.log('Utan Claudes kommentar: ' + utan.join(', '));
fs.writeFileSync(path.join(__dirname, 'sida.json'), JSON.stringify({ hela, kort }));
console.log(`texter/sida.json: ${hela.reduce((s, p) => s + p.texter.length, 0)} hela texter från ${hela.length} ställen och ${kort.length} kort (${d.rattelser.length} rättelser, ${d.kontroller.length} kontroller, ${d.prov.length} mallar).`);
