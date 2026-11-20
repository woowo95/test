const { chromium } = require('playwright');
// i molnet finns bara den förinstallerade webbläsaren, inte den som repots Playwright väntar sig
const START = require('fs').existsSync(chromium.executablePath()) ? {} : { executablePath: '/opt/pw-browsers/chromium' };
(async () => { const b = await chromium.launch(START); const p = await b.newPage(); console.log(b.version());
 console.log(await p.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return 'ingen webgl'; const d = g.getExtension('WEBGL_debug_renderer_info'); return (d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) + ' / ' + g.getParameter(g.VERSION); }));
 await b.close(); })();
