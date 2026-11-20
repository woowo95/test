const fs = require('fs'), d = __dirname;
// skripten i en mapp, var och en i en egen <script> (numeriskt: 7.10 efter 7.9), och json-filerna i en mapp som ett objekt per nyckel
const skript = (mapp, numeriskt) => fs.readdirSync(d + '/' + mapp).filter(f => f.endsWith('.js')).sort(numeriskt ? (a, b) => a.localeCompare(b, 'sv', { numeric: true }) : undefined).map(f => `<script>${fs.readFileSync(d + '/' + mapp + '/' + f, 'utf8')}</script>`).join('\n');
const jsonMapp = (mapp, nyckel) => JSON.stringify(Object.fromEntries(fs.readdirSync(d + '/' + mapp).filter(f => f.endsWith('.json')).sort().map(f => { const o = JSON.parse(fs.readFileSync(d + '/' + mapp + '/' + f, 'utf8')); return [o[nyckel], o]; })));
// avsnittet om gränssnittet, med bilderna inbakade, före Björns beslut
const granssnitt = fs.readFileSync(d + '/granssnitt.html', 'utf8').replace(/src="(granssnitt\/[^"]+\.png)"/g, (m, f) => `src="data:image/png;base64,${fs.readFileSync(d + '/' + f).toString('base64')}"`);
const html = `<title>Samhällssimulatorns bildstil</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Pixelify+Sans:wght@400;600&display=swap">
<style>${fs.readFileSync(d + '/stil.css', 'utf8')}</style>
${fs.readFileSync(d + '/kropp.html', 'utf8').replace('<section aria-labelledby="h-beslut">', granssnitt + '<section aria-labelledby="h-beslut">')}
<script>const IKONER = ${fs.readFileSync(d + '/ikoner.json', 'utf8')};</script>
<script>${fs.readFileSync(d + '/sida.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/mark.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/djur.js', 'utf8')}</script>
<script>const GUI = ${fs.readFileSync(d + '/gui.json', 'utf8')};</script>
<script>${fs.readFileSync(d + '/gui.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/anim.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/fas7.js', 'utf8')}</script>
${skript('fas7', true)}
${skript('fas8', true)}
${skript('fas9', true)}
${skript('svar')}
<script>const VARLDKARTA = ${fs.readFileSync(d + '/varldkarta.json', 'utf8')};</script>
<script>${fs.readFileSync(d + '/fas11.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/fas12.js', 'utf8')}</script>
<script>const PORTRATT = ${fs.readFileSync(d + '/portratt.json', 'utf8')};</script>
<script>const DELAR = ${jsonMapp('delar', 'id')};</script>
<script>const BILDER = ${fs.readFileSync(d + '/bilder.json', 'utf8')};</script>
<script>const GAMLA = ${fs.existsSync(d + '/gamla.json') ? fs.readFileSync(d + '/gamla.json', 'utf8') : '{}'};</script>
<script>const BILDFILER = ${jsonMapp('bilder', 'id')};</script>
<script>${fs.readFileSync(d + '/skapare.js', 'utf8')}</script>
<script>const BESTDATA = ${jsonMapp('bestar', 'lager')};</script>
<script>${fs.readFileSync(d + '/bestskapare.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/rita.js', 'utf8')}</script>
<script>const FORSLAG = ${jsonMapp('forslag', 'kort')};</script>
<script>${fs.readFileSync(d + '/forslag.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/kontroll.js', 'utf8')}</script>
<script>${fs.readFileSync(d + '/stackar.js', 'utf8')}</script>`;
fs.writeFileSync(process.env.BILDSTIL_UT || d + '/bildstil.html', html); console.log('ok', html.length);
