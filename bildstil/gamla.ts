// Spelets nuvarande bilder av sakerna i bilder.json (PIX och PAL i src/ikoner.ts), som de nya bilderna ritas om efter
// (Björn efter version 83 av bildstilen: alla nya symboler ska vara baserade på dem vi redan hade, bara omgjorda i sina nya
// pixelstorlekar). Kör: npx tsx bildstil/gamla.ts. Ger bildstil/gamla.json: { id: { rader, pal } }.
import fs from 'node:fs';
import { PIX, PAL } from '../src/ikoner';
const B = JSON.parse(fs.readFileSync('bildstil/bilder.json', 'utf8'));
const ut: Record<string, { rader: string[]; pal: Record<string, string> }> = {}, saknas: string[] = [];
for (const b of B.bilder) {
  const r = PIX[b.id]; if (!r) { saknas.push(b.id); continue; }
  const pal: Record<string, string> = {};
  for (const [k, v] of Object.entries(PAL[b.id] || {})) if (/^#[0-9a-f]{6}$/i.test(v as string)) pal[k] = v as string;
  ut[b.id] = { rader: r, pal };
}
fs.writeFileSync('bildstil/gamla.json', JSON.stringify(ut));
console.log(`${Object.keys(ut).length} gamla bilder${saknas.length ? '; saknas i spelet: ' + saknas.join(', ') : ''}`);
