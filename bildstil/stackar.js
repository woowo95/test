// Stackarna för det Björn godkänt (Björn efter bildstil v237): en sak som ligger i förrådet ritas först som en enda sak, och när
// Björn godkänt den kommer ett nytt förslag med hur den ser ut i förrådet som en, några och många i stacken, ritade som
// stackarna Björn valde (f9_stackar version 1: några är tre i en triangel, många sex i en pyramid). Kortet <id>_stack görs av
// sig självt för varje rad i BESLUT med stack: true (svar/z-beslut.js), av den största saken i den valda versionen, och
// Björn säger ja eller nej. Läses efter kontroll.js, som tar fram saken ur versionen.
(() => {
  if (typeof BESLUT === 'undefined' || typeof VAL === 'undefined' || !window.KONTROLL) return;
  const STACK = (n, w, h) => n === 1 ? [[0, 0]] : n === 3 ? [[0, 0], [w * 0.6, 0], [w * 0.3, -h * 0.5]]
    : [[0, 0], [w * 0.6, 0], [w * 1.2, 0], [w * 0.3, -h * 0.5], [w * 0.9, -h * 0.5], [w * 0.6, -h]];
  for (const [id, b] of Object.entries(BESLUT)) {
    if (!b.stack || BESLUT[id + '_stack'] || VAL.some(s => s.id === id + '_stack')) continue;
    const s = VAL.find(x => x.id === id), v = s && s.versioner[b.val - 1];
    let S = null; try { S = v && KONTROLL.storsta(v, PAL); } catch (e) { S = null; }
    if (!S) continue;
    const { w, h } = S, bredd = [w, Math.ceil(w * 1.6), Math.ceil(w * 2.2)], W = 6 + bredd.reduce((a, x) => a + x + 8, 0), H = 2 * h + 10;
    VAL.push({ id: id + '_stack', namn: s.namn + ' i förrådet', typ: 'janej', slag: [], // stacken bärs inte: inga av sakens egna kontroller
      vad: `${s.namn}, som du valde (version ${b.val}), som den ligger i förrådet: en, några (tre i en triangel) och många (sex i en pyramid), som stackarna du valde. Byggs in i steg ${b.steg} tillsammans med saken.`,
      versioner: [{ text: 'En, några och många i stacken.', w: W, h: H, rita: B => {
        const M = markBild(W, H, B.P); for (let i = 0; i < M.px.length; i++) B.px[i] = M.px[i];
        let x = 6; const fot = H - 3;
        [1, 3, 6].forEach((n, j) => {
          for (const [dx, dy] of STACK(n, w, h)) {
            const x0 = x + Math.round(dx), y0 = fot - h + Math.round(dy);
            if (dy === 0) for (let k = 1; k < w - 1; k++) B.morka(x0 + k, fot);
            for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const c = S.px[yy * w + xx]; if (c >= 0) B.satt(x0 + xx, y0 + yy, c); }
          }
          x += bredd[j] + 8;
        });
      } }] });
  }
})();
