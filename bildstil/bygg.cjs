const fs = require('fs'), d = __dirname;
// avsnittet om gränssnittet, med bilderna inbakade, före Björns beslut
const granssnitt = fs.readFileSync(d + '/granssnitt.html', 'utf8').replace(/src="(granssnitt\/[^"]+\.png)"/g, (m, f) => `src="data:image/png;base64,${fs.readFileSync(d + '/' + f).toString('base64')}"`);
const html = `<title>Samhällssimulatorns bildstil</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen&family=Pixelify+Sans:wght@400;600&display=swap">
<style>${fs.readFileSync(d + '/stil.css', 'utf8')}</style>
${fs.readFileSync(d + '/kropp.html', 'utf8').replace('<section aria-labelledby="h-beslut">', granssnitt + '<section aria-labelledby="h-beslut">')}
<script>const IKONER = ${fs.readFileSync(d + '/ikoner.json', 'utf8')};</script>
<script>${fs.readFileSync(d + '/sida.js', 'utf8')}</script>`;
fs.writeFileSync(d + '/bildstil.html', html); console.log('ok', html.length);
