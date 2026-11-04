// Bildstilens godkända bilder till spelet (fas 5): läser bilder.json och bilder/<id>.json och skriver src/kartbilder.ts,
// registret KARTBILDER som spelet ritar ur. Kör från repots rot: node bildstil/tillspelet.cjs. Bara godkända bilder kommer med.
const fs = require('fs'), path = require('path');
const BS = __dirname, reg = JSON.parse(fs.readFileSync(path.join(BS, 'bilder.json'), 'utf8'));
const sorter = Object.fromEntries(reg.sorter.map(s => [s.id, s]));
const ut = {};
for (const b of reg.bilder) {
  if (!b.godkand) continue;
  const fil = path.join(BS, 'bilder', b.id + '.json');
  if (!fs.existsSync(fil)) continue;
  const d = JSON.parse(fs.readFileSync(fil, 'utf8'));
  const rad = { sort: b.sort, w: d.rader[0].length, h: d.rader.length, rader: d.rader, pal: d.pal };
  if (b.ensam || sorter[b.sort]?.ensam) rad.ensam = true;
  ut[b.id] = rad;
}
// emojierna som symbolerna ersätter (steg 5.3.2.1): tecknet (utan variantväljare) till symbolens id. Där samma emoji delats i
// flera betydelser (5.2.4.2) tar emojin standardbetydelsen här; de andra betydelserna skrivs {sym_id} i koden
const STANDARD = { '☠': 'sym_dodskalle', '💧': 'sym_droppe', '🦷': 'sym_tand', '🦴': 'sym_ben_knota', '🪨': 'sym_sten', '💨': 'sym_vind', '🔪': 'sym_kniv', '💪': 'sym_muskel' };
const tecken = {}, namn = {};
for (const b of reg.bilder) if (ut[b.id] && b.id.startsWith('sym_')) {
  namn[b.id] = b.namn;
  for (const e of b.tecken ?? []) { const k = e.replace(/\uFE0F/g, ''); (tecken[k] ??= []).includes(b.id) || tecken[k].push(b.id); }
}
const symTecken = {};
for (const [k, ids] of Object.entries(tecken)) {
  if (ids.length > 1 && !ids.includes(STANDARD[k])) throw new Error(`${k} betyder ${ids.join(', ')}: skriv standardbetydelsen i STANDARD`);
  symTecken[k] = ids.length > 1 ? STANDARD[k] : ids[0];
}
const text = `// GENERERAD av bildstil/tillspelet.cjs ur bildstilens godkända bilder (bildstil/bilder.json och bilder/<id>.json, steg 5.2.4).
// Ändra inte här: rita om i bildstilen och kör node bildstil/tillspelet.cjs. En bild per id, 16 punkter per ruta, i sakens
// naturliga storlek (beslut, Björn efter v272): w och h är punkter, rader och pal som PIX och PAL i ikoner.ts. ensam: ligger
// en och en på en ruta (ingen hög).
export interface Kartbild { sort: string; w: number; h: number; rader: string[]; pal: Record<string, string>; ensam?: true }
export const KARTBILDER: Record<string, Kartbild> = ${JSON.stringify(ut)};
// emojierna i spelets texter och den symbol de byts mot (steg 5.3.2.1, symboler.ts), och symbolernas namn
export const SYMTECKEN: Record<string, string> = ${JSON.stringify(symTecken)};
export const SYMNAMN: Record<string, string> = ${JSON.stringify(namn)};
`;
fs.writeFileSync(path.join(BS, '..', 'src', 'kartbilder.ts'), text);
console.log(`src/kartbilder.ts: ${Object.keys(ut).length} bilder, ${Math.round(text.length / 1024)} KB`);
