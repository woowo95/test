// Porträtten och kartfiguren till spelet (steg 5.2.3.1): skriver src/portrattkarna.ts med registret PORTRATT
// (portratt.json), de ritade delarna (delar/*.json) och kärnan ur karaktärsskaparen (skapare.js: färgbytet, lagren,
// porträttet 64 × 64, kartfiguren 14 × 20, slumpen och arvet), med paletten och bilden ur sida.js. Koden är densamma som
// i bildstilen, så att personerna ser likadana ut i spelet som i skaparen. Kör från repots rot:
// node bildstil/portratttillspelet.cjs.
const fs = require('fs'), path = require('path');
const BS = __dirname;
const rader = f => fs.readFileSync(path.join(BS, f), 'utf8').split('\n');
const sida = rader('sida.js'), sk = rader('skapare.js');
const fran = (a, start, slut) => { const i = a.findIndex(r => r.startsWith(start)), j = a.findIndex((r, k) => k > i && r.startsWith(slut)); if (i < 0 || j < 0) throw new Error('hittar inte ' + start + ' … ' + slut); return a.slice(i, j); };
// sida.js: färgerna, paletten, slumpen efter plats och bilden
const fargerna = fran(sida, '// ---------- färger: OKLab', 'const BAYER');
const bilden = fran(sida, 'function Bild(', '// spelets pixelbild');
const blandning = sida.filter(r => /^const (hx2|tillHex|blanda) =/.test(r));
// skapare.js: allt utom gränssnittet ($ och lagra behövs inte), till och med kartUt, och slumpen och arvet
const karna = fran(sk, '  const PR = PORTRATT', '  // figuren på gräset').filter(r => !/^  const \$ = |^  const lagra = /.test(r));
const arv = fran(sk, '  // ---------- slump och arv', '  // ---------- skaparen');
// delar med ny: true är inte godkända av Björn än (granskningen i bildstilen) och kommer inte med i spelet
const PR_RA = fs.readFileSync(path.join(BS, 'portratt.json'), 'utf8').trim(), PR_OBJ = JSON.parse(PR_RA);
const NYA = new Set(PR_OBJ.delar.filter(d => d.ny).map(d => d.id));
const PORTRATT = NYA.size ? JSON.stringify({ ...PR_OBJ, delar: PR_OBJ.delar.filter(d => !d.ny) }, null, 2) : PR_RA;
const DELAR = Object.fromEntries(fs.readdirSync(path.join(BS, 'delar')).filter(f => f.endsWith('.json')).sort().map(f => { const o = JSON.parse(fs.readFileSync(path.join(BS, 'delar', f), 'utf8')); return [o.id, o]; }).filter(([id]) => !NYA.has(id)));
const text = `// @ts-nocheck
// GENERERAD av bildstil/portratttillspelet.cjs ur bildstil/skapare.js, sida.js, portratt.json och delar/ (steg 5.2.3.1).
// Ändra inte här: ändra i bildstilen och kör node bildstil/portratttillspelet.cjs. Gränssnittet mot spelet är src/ui/utseende.ts.
/* eslint-disable */
const PORTRATT = ${PORTRATT};
const DELAR = ${JSON.stringify(DELAR)};
${fargerna.join('\n')}
${bilden.join('\n')}
${blandning.join('\n')}
export const KARNA: any = (() => {
${karna.join('\n')}
${arv.join('\n')}
  return { PR, P, DEL, portratt, kartFigur, slumpFran, slumpPerson, barnAv, somUng, neutral, effektiva, radAv, mallAv };
})();
`;
fs.writeFileSync(path.join(BS, '..', 'src', 'portrattkarna.ts'), text);
console.log(`src/portrattkarna.ts: ${Object.keys(DELAR).length} delar, ${Math.round(text.length / 1024)} KB`);
