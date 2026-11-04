// Bygger texter/sida.json av texter/forslag.json (prova.ts) och texter/exempel.json (exempel.ts). Bildstilens sida
// (avsnittet Texterna, bildstil/texter.js) läser den när den byggs: ett kort per rättelse, ny kontroll och mall, som
// Björn svarar ja eller nej på, och exemplen, där han kommenterar en mening eller en hel mall. Svaren ligger i
// bildstilens databas, samlingen 'texter' (se texter/README.md).
//   npx tsx texter/prova.ts texter/matning/texter-fore.json texter/matning/logg-*.json && npx tsx texter/exempel.ts
//   node texter/bygg.cjs && node bildstil/bygg.cjs
const fs = require('fs');
const path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'forslag.json'), 'utf8'));

const GRUPPNAMN = {
  '1a': 'hen blir han eller hon', '1b': 'Ändelser, genus och tal', '1c': 'Skälet i hedersnamn och öknamn',
  '1d': 'Artikeln i ryktena', '1e': 'Binamnen', '1f': 'Namnen', 'ord': 'Ord',
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
const exempel = JSON.parse(fs.readFileSync(path.join(__dirname, 'exempel.json'), 'utf8'));
fs.writeFileSync(path.join(__dirname, 'sida.json'), JSON.stringify({ kort, exempel }));
const n = g => g.reduce((s, x) => s + x.rader.length, 0);
console.log(`texter/sida.json: ${kort.length} kort (${d.rattelser.length} rättelser, ${d.kontroller.length} kontroller, ${d.prov.length} mallar) och ${n(exempel.forslag) + n(exempel.idag) + exempel.logg.length} exempel.`);
