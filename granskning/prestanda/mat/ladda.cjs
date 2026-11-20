// Lägger en förberedd by (byar/<scen>.json från forbered.ts: tiden och byns delar) i webbläsarens databas som spelet sparar den
// (ui/lagring.ts, egen by), som utseende-testet gör, och ställer klockan på byns tid och forskjut ms till (en frånvaro).
// extra: mer kod före sidan (t.ex. snabbspolningen på i localStorage)
const fs = require('fs'), path = require('path');
exports.oppnaBy = async (ctx, scen, { forskjut = 0, extra = '' } = {}) => {
  const { t, delar } = JSON.parse(fs.readFileSync(path.join(__dirname, 'byar', scen + '.json'), 'utf8'));
  await ctx.addInitScript(`try { if (!sessionStorage.getItem('klar')) { sessionStorage.setItem('klar', '1'); ${extra} const delar = ${JSON.stringify(delar)}; const r = indexedDB.open('samhallssimulatorn', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('delar')) r.result.createObjectStore('delar'); };
    r.onsuccess = () => { const db = r.result, t = db.transaction('delar', 'readwrite'), st = t.objectStore('delar'); for (const d in delar) st.put(delar[d], 'egen/' + d); st.put({ delar: Object.keys(delar) }, 'egen'); t.oncomplete = () => db.close(); }; } } catch (e) {}`);
  await ctx.addInitScript(`(() => { const OD = Date, off = ${t + forskjut} - OD.now(); class D extends OD { constructor(...a) { if (a.length === 0) super(OD.now() + off); else super(...a); } static now() { return OD.now() + off; } } window.Date = D; })()`);
  return t;
};
