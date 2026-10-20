import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const r = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/template.html', 'utf8').replace('/*BUNDLE*/', () => js);
writeFileSync('samhallssimulatorn.html', html);
console.log('byggd', (html.length / 1024).toFixed(0) + ' KB');
