// skriver Sa-ritas-bilderna.pdf ur instruktion.html (python3 pdf.py först)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'instruktion.html'));
  await p.pdf({ path: path.join(__dirname, 'Sa-ritas-bilderna.pdf'), format: 'A4', margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' } });
  await b.close(); })();
