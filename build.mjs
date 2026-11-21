import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { execSync } from 'child_process';

// versionen i rapporten Det här är konstigt (steg 12.1.41, ui/konstigt.ts): den senaste publicerade versionen och committen
const git = (c) => { try { return execSync(c, { encoding: 'utf8' }).trim(); } catch { return ''; } };
const spelVersion = `${git("git log -1 --format=%s --grep='(v[0-9]*)'").match(/\(v\d+\)/)?.[0]?.slice(1, -1) ?? '?'} ${git('git rev-parse --short HEAD')}`;
const bygg = async (f) => (await build({ entryPoints: [f], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none', define: { __SPELVERSION__: JSON.stringify(spelVersion) } })).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// arbetaren som räknar ikapp (steg 12.1.178, src/arbetare.ts) byggs för sig och ligger i sidan som text (#arbetarKod), som spelet startar som en Web Worker
const js = await bygg('src/main.ts'), arbetare = await bygg('src/arbetare.ts');
const html = readFileSync('src/template.html', 'utf8').replace('/*BUNDLE*/', () => js).replace('/*ARBETARE*/', () => arbetare);
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
writeFileSync('publicera/kalla/LASMIG.txt', 'Källkoden till spelet. Filerna under sim/, ui/ och test/ ligger i src/ i repot, och alla har fått .txt sist i namnet.\n'
  + 'Byggs med npm install och npm run build. Vilken fil som gör vad står i ARKITEKTUR.md.txt. Källkoden finns också i GitHub-repot woowo95/test.\n');
filer['kalla/LASMIG.txt'] = 'publicera/kalla/LASMIG.txt';
writeFileSync('publicera/filer.json', JSON.stringify(filer, null, 1) + '\n');
console.log('byggd', (html.length / 1024).toFixed(0) + ' KB, källkoden', kalla.length, 'filer i publicera/');
