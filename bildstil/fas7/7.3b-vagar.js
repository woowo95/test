// fas 7, vägarna (7.3): handlarens kärra (7.3.8), bron (7.3.12) och torget (7.3.13). Tre versioner av varje.
// Vägen är stockvägen du valde (ojamn i fas7.js, version 2 på kortet).
(() => {
  const { hash, KORT, ell, linje, poly, och, utan, punkt, rakt, former, bredd, lagg, gras, R, ojamn } = window.F7;

  // en kartfigur (window.BYBO) med fötterna på raden fot; c >= 0 ritas
  const figur = (B, F, x0, fot) => {
    for (let y = 0; y < F.h; y++) for (let dx = 0; dx < F.w; dx++) { const c = F.px[y * F.w + dx]; if (c >= 0) B.satt(x0 + dx, fot - F.h + y, c); }
    for (let dx = 1; dx < F.w - 1; dx++) B.morka(x0 + dx, fot + 1);
  };
  // en skugga i rutmönster (som under slöjdbänken) i en ellips
  const skuggaEll = (B, cx, cy, rx, ry) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (x + y) % 2 === 0) B.morka(x, y); };

  // ---------- 7.3.8 handlarens kärra ----------
  // en tvåhjulig handkärra från sidan: flaket, lasten, ett hjul (det andra står bakom) och två skaklar fram till handlaren,
  // som drar den själv. 44 × 28 punkter: nästan tre rutor lång, hjulet en knapp ruta högt
  const KL = { E: 'jord0', F: 'jord1', G: 'jord2', H: 'jord3', J: 'senap1', K: 'senap2', L: 'senap3', I: 'senap0', p: 'ben1', q: 'ben2', w: 'ben3', v: 'ben0', s: 'rost1', t: 'rost2', u: 'rost3', r: 'rost0', k: 'kol1', m: 'kol2', a: 'skiffer1', b: 'skiffer2', c: 'skiffer3', g: 'oliv2', n: 'barr2' };
  const KW = 44, KH = 28, HJ = [13, 21, 6.5]; // hjulets mitt och radie
  const ring = (cx, cy, r0, r1) => (x, y) => { const d = Math.hypot(x - cx, y - cy); return d <= r1 && d >= r0; };
  const KARROR = [
    // 0: en låda av plankor på ett skivhjul av tre bräder; säckar och ett hoprullat skinn, snörda med rep
    former(KW, KH, [
      [linje([[25, 15], [42, 17.5]], 0.8), 'F'], [linje([[25, 14.3], [42, 16.8]], 0.4), 'H'], // skaklarna
      [rakt(2, 6, 9, 12), (x, y) => y < 7 ? 'w' : x < 4 ? 'q' : 'p'], [ell(5.5, 6.8, 3.3, 2), (x, y) => y < 6 ? 'w' : 'q'], // en säck som står
      [ell(12, 8, 4.5, 3.5), (x, y) => x < 11 && y < 7 ? 'w' : y > 9.5 ? 'p' : 'q'], [punkt(13, 6), 'v'], // en säck som ligger
      [linje([[17, 8.5], [24, 8.5]], 2.4), (x, y) => (Math.floor(x) % 3 === 0 ? 'r' : y < 7.5 ? 'u' : y > 9.5 ? 's' : 't')], [ell(24, 8.5, 1.4, 2.4), 'r'], [punkt(24, 8), 's'], // skinnet
      [linje([[3, 11], [11, 4.5]], 0.45), 'v'], [linje([[14, 11], [21, 6]], 0.45), 'v'], // repen över
      [rakt(1, 11, 27, 18), (x, y) => { const yy = Math.floor(y); return yy === 11 ? 'H' : yy === 14 ? 'E' : x > 25 || x < 2 ? 'F' : yy === 17 ? 'F' : 'G'; }], // lådans sida, två plankor
      [och(rakt(3, 11, 5, 18), rakt(22, 11, 24, 18)), (x, y) => x < 4 || (x > 22 && x < 23) ? 'F' : 'E'], // stöttorna
      [ell(...HJ, HJ[2]), (x, y) => { const xx = Math.floor(x); return ((x - HJ[0]) ** 2 + (y - HJ[1]) ** 2) > 30 ? 'E' : xx === 10 || xx === 15 ? 'E' : x < 10 ? 'H' : x < 15 ? 'G' : 'F'; }], // skivhjulet av tre bräder
      [rakt(8, 20, 19, 22), (x, y) => y < 21 ? 'G' : 'F'], // tvärslån som håller bräderna
      [ell(HJ[0], HJ[1], 1.6, 1.6), 'k'], [punkt(13, 20), 'm'],
    ]),
    // 1: en flätad korg på ett ekerhjul; korgar, en lerkruka och en bunt skinn
    former(KW, KH, [
      [linje([[25, 14], [42, 17.5]], 0.8), 'F'], [linje([[25, 13.3], [42, 16.8]], 0.4), 'H'],
      [ell(8, 6.5, 3.6, 3.2), (x, y) => y < 5 ? 's' : x < 7 ? 'u' : 't'], [rakt(5.5, 3, 10.5, 4.5), 'r'], [rakt(6, 2, 10, 3), 's'], // lerkrukan
      [rakt(12, 4, 19, 10), (x, y) => (Math.floor(x) + Math.floor(y)) % 2 ? 'L' : 'K'], [rakt(12, 4, 19, 5), 'J'], // en korg
      [linje([[19.5, 8], [24.5, 8]], 2), (x, y) => y < 7.5 ? 'q' : 'p'], [linje([[20, 6], [24, 6]], 1.2), (x, y) => x < 21 ? 'H' : 'G'], // skinn i en bunt
      [poly([[0.5, 10], [26.5, 10], [24.5, 18.5], [2.5, 18.5]]), (x, y) => { const xx = Math.floor(x), yy = Math.floor(y); return yy === 10 ? 'L' : (xx + (yy >> 1)) % 3 === 0 ? 'J' : (xx + yy) % 2 ? 'K' : 'L'; }], // den flätade korgen
      [rakt(1, 10, 26, 11), 'I'], // kanten flätad tätare
      [ell(...HJ, 5.4), 'E'], [ring(...HJ, 4.6, 6.6), (x, y) => Math.hypot(x - HJ[0], y - HJ[1]) > 5.8 ? 'F' : y < HJ[1] - 1 && x < HJ[0] + 1 ? 'H' : 'G'], // fälgen, och skuggan under kärran mellan ekrarna
      [och(linje([[HJ[0], HJ[1]], [HJ[0], HJ[1] - 5.4]], 0.5), linje([[HJ[0], HJ[1]], [HJ[0], HJ[1] + 5.4]], 0.5), linje([[HJ[0], HJ[1]], [HJ[0] - 5.4, HJ[1]]], 0.5), linje([[HJ[0], HJ[1]], [HJ[0] + 5.4, HJ[1]]], 0.5), linje([[HJ[0] - 3.8, HJ[1] - 3.8], [HJ[0] + 3.8, HJ[1] + 3.8]], 0.5), linje([[HJ[0] + 3.8, HJ[1] - 3.8], [HJ[0] - 3.8, HJ[1] + 3.8]], 0.5)), 'H'], // ekrarna
      [ell(HJ[0], HJ[1], 1.7, 1.7), 'F'], [punkt(13, 20), 'G'],
    ]),
    // 2: ett lågt flak av stockar med lasten högt under ett skinn, snört i kors; hjulet är en skiva av en stock med årsringar
    former(KW, KH, [
      [linje([[26, 16.5], [42, 17.5]], 0.9), 'F'], [linje([[26, 15.6], [42, 16.6]], 0.4), 'H'], [linje([[41, 14.5], [41, 20]], 0.7), 'G'], // skaklarna och tvärslån längst fram
      [poly([[2, 14], [3, 6], [7, 2], [14, 0.6], [21, 2], [25, 6], [26, 14]]), (x, y) => { const yy = Math.floor(y), xx = Math.floor(x); return (xx * 3 + yy * 5) % 11 === 0 ? 'p' : y < 5 || x < 6 ? 'w' : x > 22 || y > 12 ? 'p' : 'q'; }], // skinnet över lasten
      [och(linje([[3, 13], [20, 1.8]], 0.5), linje([[9, 1.6], [25, 13]], 0.5), linje([[2.5, 9], [25.5, 9]], 0.5)), 's'], // repen i kors
      [rakt(0, 14, 28, 18), (x, y) => { const yy = Math.floor(y); return yy === 14 ? 'H' : yy === 17 ? 'E' : x > 26 ? 'J' : yy === 15 ? 'G' : 'F'; }], // flakets stock
      [ell(27.3, 16, 1.2, 2), 'K'], // stockens ände
      [ell(...HJ, HJ[2]), (x, y) => { const d = Math.hypot(x - HJ[0], y - HJ[1]); return d > 5.7 ? 'F' : d > 4.8 ? 'J' : Math.round(d) % 2 ? 'J' : (x < HJ[0] - 1 && y < HJ[1] - 1 ? 'L' : 'K'); }], // stockskivan med bark och årsringar
      [ell(HJ[0], HJ[1], 1.3, 1.3), 'E'],
    ]),
  ];
  const KARR_TEXT = ['En låda av plankor på skivhjul av tre bräder, med säckar och ett hoprullat skinn.', 'En flätad korg på ett hjul med ekrar, med en lerkruka, korgar och skinn.', 'Ett lågt flak med lasten högt under ett skinn, snört i kors, på en skiva av en stock.'];
  const KARRA = (text, v) => ({ text, w: 8 * R, h: 4.5 * R, rita: (B) => {
    gras(B); ojamn(B, 0, [[0, 1, 8, 3, 'h']]);
    const fot = 53, x0 = 16, k = KARROR[v];
    skuggaEll(B, x0 + 14, fot + 1, 13, 1.6);
    lagg(B, k, KL, x0, fot - KH + 1, false);
    if (window.BYBO) figur(B, window.BYBO(12345, 'sida', 'gang1', 'gang1'), x0 + 41, fot);
  } });

  // ---------- 7.3.12 bron ----------
  // vägen går över en å, sju rutor bred; bron är lika bred som vägen och sitter ihop med den på båda stränderna. Ån rinner
  // uppifrån och ner; bron ligger högre än vattnet, så att dess sida, pålarna och skuggan syns under den
  const BW = 12, BH = 8, A0 = 3.5, A1 = 8.5; // ån mellan rutorna A0 och A1 (fem rutor vatten, stränderna slingrar)
  const BROAR = [
    // bred: vägens bredd i rutor, y: vägens första ruta, dack: 'stock' (vägens stockar) eller 'plank' (kluvna, flata),
    // racke: 'inget', 'stang' (räcke av stänger på stolpar) eller 'kant' (en hjulstock längs kanten), stod: 'palar' eller 'kista'
    { bred: 2, y: 3, dack: 'stock', racke: 'inget', stod: 'palar' },
    { bred: 3, y: 2.5, dack: 'plank', racke: 'stang', stod: 'palar' },
    { bred: 3, y: 2.5, dack: 'stock', racke: 'kant', stod: 'kista' },
  ];
  function bro(B, v) {
    const P = B.P, o = BROAR[v], M = window.MARK, I = (r, t) => P.i(r, t);
    const sd = (x, y) => M.spelSd(x, y, Math.min(x / R - A0, A1 - x / R) - 0.3);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const c = M.spelVatten(x, y, sd(x, y), P); B.satt(x, y, c !== null ? c : M.grasPunkt(x, y, P, 0)); }
    const y0 = Math.round(o.y * R), y1 = y0 + o.bred * R; // vägens övre och nedre kant
    const bx0 = Math.round((A0 - 0.6) * R), bx1 = Math.round((A1 + 0.6) * R); // bron räcker en bit upp på stränderna
    const iBro = (x, y) => x >= bx0 && x < bx1 && y >= y0 && y < y1;
    M.tuvor(B, 0, (x, y) => sd(x, y) < -0.9 && (y < y0 - 3 || y > y1 + 3));
    // vägen på båda stränderna, med stockarna ända fram till bron
    ojamn(B, 0, [[0, o.y, A0 - 0.6, o.bred, 'h'], [A1 + 0.6, o.y, BW - A1 - 0.6, o.bred, 'h']].map(([a, b, c, d, e]) => [a, b, c, d, e]), iBro);
    const skugga = new Set();
    const mork = (x, y) => { const k = x + ',' + y; if (skugga.has(k)) return; skugga.add(k); B.morka(x, y); };
    const VY = y1 + 16; // där stöden går ner i vattnet
    for (let x = bx0; x < bx1; x++) for (let k = 4; k <= 16; k++) if (sd(x, y1 + k) > 0 && (k < 12 || (x + k) % 2 === 0)) mork(x, y1 + k); // brons skugga på vattnet
    // en rund stolpe eller påle, t punkter tjock, ljus till vänster, med kontur och en ljus ände överst om den syns
    const stolpe = (px, ya, yb, t = 3, topp = false) => {
      for (let y = ya; y <= yb; y++) {
        B.satt(px - 1, y, I('kol', 0)); B.satt(px + t, y, I('kol', 0));
        for (let d = 0; d < t; d++) B.satt(px + d, y, topp && y === ya ? I('senap', d === 0 || d === t - 1 ? 1 : 2) : I('jord', d === 0 ? 2 : d === t - 1 ? 0 : 1));
      }
      if (topp) for (let d = -1; d <= t; d++) B.satt(px + d, ya - 1, I('kol', 0));
    };
    const krusning = (xa, xb) => { for (let x = xa - 1; x <= xb + 1; x++) if (x === xa - 1 || x === xb + 1 || x % 2 === 0) B.satt(x, VY, I('skiffer', 3)); for (let k = 1; k < 5; k++) for (let x = xa; x <= xb; x++) if ((x + k) % 2 === 0) mork(x, VY + k); };
    if (o.stod === 'palar') {
      for (let x = bx0 + R + 6; x < bx1 - R; x += 2 * R) { stolpe(x, y1 + 3, VY, 4); krusning(x, x + 3); }
    } else { // en kista av timmer mitt i ån: stockar på varandra med runda ändar, stenar som syns mellan dem
      const kx = Math.round(((A0 + A1) / 2) * R) - 18, kw = 36;
      for (let y = y1 + 3; y <= VY; y++) {
        const yy = y - y1 - 3, rad = Math.floor(yy / 4), u = yy % 4;
        B.satt(kx - 2, y, I('kol', 0)); B.satt(kx + kw + 1, y, I('kol', 0));
        for (let x = kx - 1; x <= kx + kw; x++) {
          const ande = x <= kx || x >= kx + kw - 1;
          let c;
          if (u === 3) c = hash(x >> 1, rad, 41) < 0.55 ? I('skiffer', hash(x, y, 42) < 0.5 ? 2 : 3) : I('kol', 1); // stenarna i fogen
          else if (ande) c = I('senap', u === 1 ? 2 : 1);
          else c = I('jord', u === 0 ? 3 : u === 1 ? 2 : 1);
          B.satt(x, y, c);
        }
      }
      krusning(kx - 1, kx + kw);
    }
    // brons sida: en bjälke längs hela nedre kanten, tre punkter hög, med kontur under
    for (let x = bx0; x < bx1; x++) { for (let k = 0; k < 3; k++) B.satt(x, y1 + k, I('jord', k === 0 ? 2 : k === 1 ? 1 : 0)); B.satt(x, y1 + 3, I('kol', 0)); }
    for (const x of [bx0, bx1 - 1]) for (let k = 0; k < 3; k++) B.satt(x, y1 + k, I('senap', k === 1 ? 2 : 1)); // bjälkens ändar
    // däcket: stockar tvärs över färdriktningen (som vägen), eller kluvna och flata plankor; konturen ovanför
    let x = bx0, n = 0;
    while (x < bx1) {
      const t = Math.min(bx1 - x, o.dack === 'plank' ? 5 : 4 + Math.floor(hash(n, 1, 70 + v) * 3)), g = o.dack === 'plank' ? 0 : Math.floor(hash(n, 2, 70 + v) * 2);
      const sj = hash(n, 3, 70 + v) < 0.15, ut0 = o.dack === 'plank' ? 0 : Math.floor(hash(n, 4, 70 + v) * 3);
      for (let u = 0; u < t; u++) {
        for (let y = y0 - ut0; y < y1; y++) {
          const slut = y === y0 - ut0;
          let c;
          if (o.dack === 'plank') c = u === t - 1 ? I('jord', 1) : y === y0 ? I('jord', 3) : hash(n, Math.floor(y / 3), 7) < 0.15 ? I('jord', 2) : I('jord', u === 0 ? 3 : u > 2 ? 2 : 3);
          else if (slut) c = I('senap', u > 0 && u < t - 1 ? (sj ? 1 : 2) : 1);
          else { const ton = u === 0 ? 3 : u === t - 1 ? 0 : hash(x + u, y, 9) < 0.08 ? 0 : u === 1 ? 2 : 1; c = I('jord', Math.max(0, ton - (sj ? 1 : 0))); }
          B.satt(x + u, y, c);
        }
        B.satt(x + u, y0 - ut0 - 1, I('kol', 0));
      }
      for (let u = t; u < t + g && x + u < bx1; u++) { for (let y = y0; y < y1; y++) B.satt(x + u, y, I('kol', 1)); B.satt(x + u, y0 - 1, I('kol', 0)); } // glipan: mörkt ner mot vattnet
      x += t + g; n++;
    }
    // en rund stång längs bron, tre punkter tjock, med kontur över och under
    const stang = (xa, xb, y) => { for (let xx = xa; xx <= xb; xx++) { B.satt(xx, y - 1, I('kol', 0)); for (let k = 0; k < 3; k++) B.satt(xx, y + k, xx === xa || xx === xb ? I('senap', k === 1 ? 2 : 1) : I('jord', k === 0 ? 3 : k === 1 ? 2 : 0)); B.satt(xx, y + 3, I('kol', 0)); } };
    if (o.racke === 'stang') { // ett räcke på varje sida: stolpar som står på bron och en stång överst
      for (const [bas, fram] of [[y0 + 2, false], [y1 + 2, true]]) {
        const topp = bas - 9;
        for (let px = bx0 + 3; px < bx1 - 3; px += R) stolpe(px, topp, bas, 2, true);
        stang(bx0 + 1, bx1 - 2, topp + 2);
        if (!fram) for (let xx = bx0 + 1; xx < bx1 - 1; xx++) for (let k = 0; k < 2; k++) if ((xx + k) % 2 === 0) B.morka(xx, bas + 1 + k);
      }
    } else if (o.racke === 'kant') { // en rund hjulstock längs varje kant, så att kärrorna inte rullar av
      for (const ry of [y0, y1 - 4]) { stang(bx0, bx1 - 1, ry); for (let xx = bx0; xx < bx1; xx++) B.morka(xx, ry + 4); }
    }
  }
  const BRO_TEXT = ['Två rutor bred, av vägens runda stockar, utan räcke, på pålar.', 'Tre rutor bred, av kluvna plankor med den flata sidan upp, ett räcke av stänger på stolpar och pålar under.', 'Tre rutor bred, av runda stockar med en hjulstock längs varje kant, och mitt i ån en timmerkista fylld med sten.'];

  // ---------- 7.3.13 torget ----------
  // tio gånger tio rutor mitt i byn, helt täckt av stockar, med vägar in från vänster, uppifrån och nedifrån.
  // Kortet: 14 × 14 rutor, torget i rutorna 2–11
  const TX = 2, TY = 2, TN = 10, TW = 14;
  const TORG_VAGAR = [[0, 6, 2, 3, 'h'], [6, 0, 3, 2, 'v'], [4, 12, 2, 2, 'v']];
  const iTorg = (x, y) => x >= TX * R && x < (TX + TN) * R && y >= TY * R && y < (TY + TN) * R;
  // delarna: 0 alla åt samma håll; 1 rutor om två gånger två som växlar riktning; 2 ramar runt mitten
  const torgDelar = v => {
    if (v === 0) return [[TX, TY, TN, TN, 'h']];
    if (v === 1) { const D = []; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) D.push([TX + i * 2, TY + j * 2, 2, 2, (i + j) % 2 ? 'v' : 'h']); return D; }
    const D = [];
    for (let k = 0; k < 2; k++) {
      const a = k * 2, b = TN - k * 2;
      D.push([TX + a, TY + a, b - a, 2, 'h'], [TX + a, TY + b - 2, b - a, 2, 'h'], [TX + a, TY + a + 2, 2, b - a - 4, 'v'], [TX + b - 2, TY + a + 2, 2, b - a - 4, 'v']);
    }
    D.push([TX + 4, TY + 4, 2, 2, 'v']);
    return D;
  };
  function torg(B, v) {
    const P = B.P, I = (r, t) => P.i(r, t), M = window.MARK;
    gras(B);
    M.tuvor(B, 0, (x, y) => !iTorg(x, y) && !TORG_VAGAR.some(([tx, ty, w, h]) => x >= tx * R - 4 && x < (tx + w) * R + 4 && y >= ty * R - 4 && y < (ty + h) * R + 4) && (x < TX * R - 6 || x > (TX + TN) * R + 6 || y < TY * R - 6 || y > (TY + TN) * R + 6));
    const D = [...TORG_VAGAR, ...torgDelar(v)];
    // version 1 och 2: kanten är rak, för där ligger en kantstock eller stenar
    const nara = (x, y) => !iTorg(x, y) && x >= TX * R - 6 && x < (TX + TN) * R + 6 && y >= TY * R - 6 && y < (TY + TN) * R + 6;
    ojamn(B, 0, D, v === 0 ? () => false : nara);
    // en rund stock längs (x0, y0) → (x1, y1), vågrät eller lodrät, tre punkter tjock, med ljusa ändar
    const stock = (x0, y0, x1, y1, t = 3) => {
      const vag = y0 === y1;
      for (let s = vag ? x0 : y0; s <= (vag ? x1 : y1); s++) for (let u = 0; u < t; u++) {
        const x = vag ? s : x0 + u, y = vag ? y0 + u : s, ande = s === (vag ? x0 : y0) || s === (vag ? x1 : y1);
        B.satt(x, y, ande ? I('senap', u === 1 ? 2 : 1) : I('jord', u === 0 ? 3 : u === t - 1 ? 0 : hash(x, y, 9) < 0.08 ? 1 : 2));
      }
      if (vag) for (let s = x0; s <= x1; s++) B.morka(s, y0 + t); else for (let s = y0; s <= y1; s++) B.morka(x0 + t, s);
    };
    const X0 = TX * R, Y0 = TY * R, X1 = (TX + TN) * R, Y1 = (TY + TN) * R;
    const oppning = (x, y) => TORG_VAGAR.some(([tx, ty, w, h]) => x >= tx * R && x < (tx + w) * R && y >= ty * R && y < (ty + h) * R); // där vägarna går in
    if (v === 1) {
      // kantstockar i fogarna mellan rutorna och runt hela torget, med öppningar där vägarna går in
      for (let i = 1; i < 5; i++) { stock(X0 + i * 2 * R - 1, Y0, X0 + i * 2 * R - 1, Y1 - 1, 2); stock(X0, Y0 + i * 2 * R - 1, X1 - 1, Y0 + i * 2 * R - 1, 2); }
      const kant = (x0, y0, x1, y1) => { // en kantstock i bitar mellan vägarnas öppningar
        const vag = y0 === y1; let a = null;
        for (let s = vag ? x0 : y0; s <= (vag ? x1 : y1) + 1; s++) {
          const fri = s <= (vag ? x1 : y1) && !oppning(vag ? s : x0 + (x0 < X0 ? -3 : 3), vag ? y0 + (y0 < Y0 ? -3 : 3) : s);
          if (fri && a === null) a = s;
          if (!fri && a !== null) { vag ? stock(a, y0, s - 1, y0) : stock(x0, a, x0, s - 1); a = null; }
        }
      };
      kant(X0 - 3, Y0 - 3, X1 + 2, Y0 - 3); kant(X0 - 3, Y1, X1 + 2, Y1); kant(X0 - 3, Y0, X0 - 3, Y1 - 1); kant(X1, Y0, X1, Y1 - 1);
    }
    if (v === 2) {
      // stockar mellan ramarna och en kant av stenar mot gräset
      for (const k of [2, 4]) { const a = k * R, b = TN * R - k * R; stock(X0 + a, Y0 + a - 1, X0 + b - 1, Y0 + a - 1, 2); stock(X0 + a, Y0 + b - 1, X0 + b - 1, Y0 + b - 1, 2); stock(X0 + a - 1, Y0 + a, X0 + a - 1, Y0 + b - 1, 2); stock(X0 + b - 1, Y0 + a, X0 + b - 1, Y0 + b - 1, 2); }
      const sten = (cx, cy, s) => { // en rundad sten, ljus uppe till vänster, olika stor
        const rx = 2.4 + hash(s, 1, 61) * 1.8, ry = 2 + hash(s, 2, 61) * 1.2, gra = hash(s, 3, 61) < 0.3 ? 'ben' : 'skiffer';
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
          if (d <= 1) B.satt(x, y, I(gra, (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry < -0.5 ? 3 : (y + 0.5 - cy) / ry > 0.45 ? (gra === 'ben' ? 0 : 1) : 2));
          else if (d <= 1.55) B.satt(x, y, I('kol', 0));
        }
        for (let x = Math.floor(cx - rx + 1); x <= cx + rx; x++) B.morka(x, Math.floor(cy + ry + 2));
      };
      let s = 0;
      for (let x = X0 - 2; x < X1 + 2; x += 7 + Math.floor(hash(x, 1, 63) * 3)) { if (!oppning(x, Y0 - 5) && !oppning(x + 3, Y0 - 5)) sten(x + 3, Y0 - 3, s++); }
      for (let x = X0 - 2; x < X1 + 2; x += 7 + Math.floor(hash(x, 2, 63) * 3)) { if (!oppning(x, Y1 + 5) && !oppning(x + 3, Y1 + 5)) sten(x + 3, Y1 + 2, s++); }
      for (let y = Y0 + 5; y < Y1 - 3; y += 7 + Math.floor(hash(y, 3, 63) * 3)) { if (!oppning(X0 - 5, y) && !oppning(X0 - 5, y + 3)) sten(X0 - 3, y + 2, s++); }
      for (let y = Y0 + 5; y < Y1 - 3; y += 7 + Math.floor(hash(y, 4, 63) * 3)) { if (!oppning(X1 + 5, y)) sten(X1 + 2, y + 2, s++); }
    }
  }
  const TORG_TEXT = ['Alla stockar åt samma håll, som vägen, och ändarna sticker ut ojämnt i gräset.', 'Rutor om två gånger två rutor som växlar riktning, med stockar i fogarna och en kantstock runt torget.', 'Ramar av stockar runt mitten, där stockarna byter riktning på varje sida, och en kant av stenar mot gräset.'];

  VAL.push(
    KORT('f7_karra', 'Handlarens kärra', 'Steg 7.3.8: handlarens tvåhjuliga kärra, som han drar själv på vägen (det finns inga dragdjur än), lastad med det han har att byta. Bilden visar kärran från sidan på stockvägen, med handlaren framför.', KARROR.map((_, i) => KARRA(KARR_TEXT[i], i))),
    KORT('f7_bro', 'Bron', 'Steg 7.3.12: bron, en brygga lika bred som vägen (två eller tre rutor) över ett smalt vatten, högst åtta rutor, som sitter ihop med stockvägen på båda stränderna så att kärrorna kan köra över. Bilden visar vägen över en å fem rutor bred.', BROAR.map((_, i) => ({ text: BRO_TEXT[i], w: BW * R, h: BH * R, rita: (B) => bro(B, i) }))),
    KORT('f7_torg', 'Torget', 'Steg 7.3.13: torget, tio gånger tio rutor mitt i byn, där vägen läggs över hela ytan och vägarna leder dit. Bilden visar hela torget med vägar in från tre håll; versionerna är tre sätt att lägga stockarna och kanten mot gräset.', [0, 1, 2].map(i => ({ text: TORG_TEXT[i], w: TW * R, h: TW * R, rita: (B) => torg(B, i) }))),
  );
})();
