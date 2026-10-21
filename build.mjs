import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const r = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync('src/template.html', 'utf8').replace('/*BUNDLE*/', () => js);
writeFileSync('samhallssimulatorn.html', html);

// till publiceringen: källkoden som .txt under publicera/kalla, och fillistan som ges till artefakten (publicera/filer.json)
rmSync('publicera', { recursive: true, force: true });
const kalla = [...readdirSync('src', { recursive: true }).map(f => 'src/' + f.replaceAll('\\', '/')).filter(f => /\.(ts|html|sh)$/.test(f) && !/\/_/.test(f)),
  'build.mjs', 'package.json', 'ARKITEKTUR.md', 'CLAUDE.md'].sort();
const filer = {};
for (const f of kalla) {
  const ut = 'kalla/' + f.replace(/^src\//, '') + '.txt';
  mkdirSync(dirname('publicera/' + ut), { recursive: true });
  copyFileSync(f, 'publicera/' + ut);
  filer[ut] = 'publicera/' + ut;
}
writeFileSync('publicera/filer.json', JSON.stringify(filer, null, 1) + '\n');
console.log('byggd', (html.length / 1024).toFixed(0) + ' KB, källkoden', kalla.length, 'filer i publicera/');
