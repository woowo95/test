// fas 7:s nya bilder i valdelen, tre versioner av varje (som fas6.js), i paletten och 16 punkter per ruta.
(() => {
  const hash = (a, b, c = 0) => { let n = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const KORT = (id, namn, vad, versioner, extra = {}) => ({ id, namn, typ: 'tre', vad, versioner, ...extra });

  // ---------- 7.2.8.1 stockvägen ----------
  // Björn 2026-11-04: "en stockväg … ska kunna vara olika bred och även läggas som en hel plattform till ett torg. Det ska
  // vara distinkt från trägolv inomhus". Trägolvet är platta, mörka plankor i rutans mönster; vägen är stockar som ligger
  // tvärs över färdriktningen, med rundning (ljus överkant, mörk underkant), bark och ändar som syns i kanten.
  // Scenen i rutor: ett torg (4 × 4) med en väg en ruta bred från vänster, två rutor bred uppifrån och tre rutor bred nedåt.
  // 'h' = man färdas i sidled (stockarna står lodrätt i bilden), 'v' = man färdas uppåt och nedåt (stockarna ligger vågrätt)
  const R = 16, VW = 10, VH = 9;
  const DELAR = [[5, 2, 4, 4, 'h'], [0, 3, 5, 1, 'h'], [6, 0, 2, 2, 'v'], [5, 6, 3, 3, 'v']];
  const delOf = (x, y) => DELAR.find(([tx, ty, w, h]) => x >= tx * R && x < (tx + w) * R && y >= ty * R && y < (ty + h) * R);
  // versionerna: t = stockens bredd i punkter, ton(u, d, ...) = färgen tvärs över stocken (u) och från änden (d)
  const VAGAR = [
    { // 0: runda, gråa och väderbitna stockar tätt intill varandra, ändarna sticker ut ojämnt
      t: 4, ut: 2, rals: false,
      ton: (P, u, d, log, x, y) => d === 0 ? P.i('ben', u === 3 ? 0 : 2) : u === 3 ? P.i('kol', 1) : hash(log, y, 3) < 0.07 ? P.i('kol', 2) : P.i(u === 0 ? 'ben' : u === 1 ? 'ben' : 'kol', u === 0 ? 1 : u === 1 ? 0 : 3),
    },
    { // 1: kluvna halvstockar med den flata sidan upp, ljusare, och en kantstock längs båda sidorna som håller dem på plats
      t: 5, ut: 0, rals: true,
      ton: (P, u, d, log, x, y) => u === 4 ? P.i('kol', 1) : u === 0 ? P.i('jord', 3) : u === 3 ? P.i('jord', 1) : hash(log, Math.floor(y / 3), 7) < 0.18 ? P.i('jord', 1) : P.i('jord', 2),
    },
    { // 2: runda stockar med glipor där jorden syns, mossa på några och ändarna ojämna
      t: 5, ut: 3, rals: false,
      ton: (P, u, d, log, x, y) => {
        if (u === 4) return hash(x, y, 11) < 0.3 ? P.i('oliv', 1) : P.i('jord', 0);
        if (d === 0) return P.i('senap', u === 1 || u === 2 ? 2 : 1);
        if (u < 2 && hash(log, Math.floor(y / 4), 5) < 0.16) return P.i('oliv', u === 0 ? 2 : 1);
        return u === 0 ? P.i('jord', 3) : u === 3 ? P.i('jord', 0) : hash(log, y, 9) < 0.08 ? P.i('jord', 0) : P.i('jord', u === 1 ? 2 : 1);
      },
    },
  ];
  function stockvag(B, v) {
    const P = B.P, V = VAGAR[v], ritad = new Set();
    const satt = (x, y, c) => { B.satt(x, y, c); ritad.add(x + ',' + y); };
    for (let y = 0; y < VH * R; y++) for (let x = 0; x < VW * R; x++) {
      const del = delOf(x, y); if (!del) continue;
      const h = del[4] === 'h', tvars = h ? x : y, langs = h ? y : x; // tvärs över stockarna och längs dem
      const log = Math.floor(tvars / V.t), u = tvars % V.t;
      const ute = k => !(h ? delOf(x, y + k) : delOf(x + k, y)); // är punkten k steg längs stocken utanför vägen
      const fore = ute(-1), efter = ute(1);
      // kantstocken längs vägen (version 1): tre punkter rund, längs med färden, ljus överst och mörk underst
      if (V.rals) {
        const upp = [0, 1, 2].find(k => ute(-k - 1)), ner = [0, 1, 2].find(k => ute(k + 1));
        const p = upp !== undefined ? upp : ner !== undefined ? 2 - ner : -1;
        if (p >= 0) { satt(x, y, P.i('jord', [3, 2, 0][p])); continue; }
      }
      const d = fore || efter ? 0 : 1;
      satt(x, y, V.ton(P, u, d, log + (h ? 0 : 500), x, y));
      // ändarna sticker ut utanför vägen, olika långt för varje stock
      if (V.ut && u < V.t - 1 && (fore || efter)) {
        const n = Math.floor(hash(log + (h ? 0 : 500), fore ? 1 : 2, v) * (V.ut + 1));
        for (let k = 1; k <= n; k++) { const xx = h ? x : x + (fore ? -k : k), yy = h ? y + (fore ? -k : k) : y; satt(xx, yy, V.ton(P, u, k === n ? 0 : 1, log + (h ? 0 : 500), xx, yy)); }
      }
    }
    // en skugga under och till höger om vägen, så att den ligger ovanpå marken
    for (const k of ritad) { const [x, y] = k.split(',').map(Number); if (!ritad.has(x + ',' + (y + 1))) B.morka(x, y + 1); }
  }
  const STOCKVAG = (text, v) => ({ text, w: VW * R, h: VH * R, rita: (B) => stockvag(B, v) });

  VAL.push(
    KORT('f7_stockvag', 'Stockvägen', 'Steg 7.2.8.1: en väg av stockar som byn lägger på gångstråken. Stockarna ligger tvärs över färdriktningen, så att vägen inte liknar trägolvet inne (platta plankor på längden). Bilden visar vägen en, två och tre rutor bred, och som en hel plattform till ett torg (fyra × fyra rutor) där vägarna möts.', [
      STOCKVAG('Runda, gråa och väderbitna stockar tätt intill varandra, med ändarna som sticker ut ojämnt.', 0),
      STOCKVAG('Kluvna halvstockar med den flata sidan upp, och en kantstock längs båda sidorna.', 1),
      STOCKVAG('Bruna runda stockar med glipor där jorden syns, mossa på några och ojämna ändar.', 2)]),
  );
})();
