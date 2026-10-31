// skriver spelets pixelbilder (PIX och PAL i src/ikoner.ts) till ikoner.json, som bildstilen visar som de ser ut i dag:
// npx tsx bildstil/ikoner.ts, sedan node bildstil/bygg.cjs
import { writeFileSync } from 'fs';
import { PAL, PIX } from '../src/ikoner';
writeFileSync(new URL('./ikoner.json', import.meta.url), JSON.stringify({ PAL, PIX }));
