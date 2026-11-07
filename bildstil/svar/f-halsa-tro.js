// Björns svar på fyra kort i fas 8 (8.2.3 kroppsdelen, 8.3.14 manteln, 8.5.1 graven och den döda kroppen):
// nya versioner efter hans kommentarer. Varje kort byts ut i VAL med samma id.
(() => {
  const { KORT, ell, linje, poly, och, utan, rakt, former, bredd, lagg, gras, hash } = window.F7;
  const fg = (B, s) => B.P.i(s.slice(0, -1), +s.slice(-1));
  const byt = kort => { const i = VAL.findIndex(s => s.id === kort.id); if (i >= 0) VAL[i] = kort; else VAL.push(kort); };

  // ---------- 8.2.3 den avhuggna kroppsdelen ----------
  // samma tre bilder, nu med en vit benstump som sticker ut ur snittet och en pöl av blod på marken under.
  // h/H huden (rost3/rost2), r/R köttet i snittet (rost1/rost0), W/w benet (ben3/ben2)
  const KD = { h: 'rost3', H: 'rost2', r: 'rost1', R: 'rost0', W: 'ben3', w: 'ben2' };
  const hud = (yMitt) => (x, y) => y > yMitt + 1.2 ? 'H' : 'h';
  const kott = (x, y) => hash(Math.floor(x), Math.floor(y), 5) < 0.35 ? 'R' : 'r';
  const ben = yMitt => (x, y) => y > yMitt + 0.2 ? 'w' : 'W';
  // blodet: en pöl (ellipser) med mörk kant, en ljusare blänk och droppar runt omkring; ritas på marken före saken
  function blod(B, pölar, droppar) {
    const inne = (x, y) => pölar.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (hash(x, y, 9) - 0.5) * 0.5);
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      if (!inne(x + 0.5, y + 0.5)) continue;
      const kant = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inne(x + dx + 0.5, y + dy + 0.5));
      B.satt(x, y, fg(B, kant ? 'rost0' : hash(x, y, 3) < 0.12 ? 'rost2' : 'rost1'));
    }
    for (const [x, y, s] of droppar) { B.satt(x, y, fg(B, 'rost0')); if (s) B.satt(x + 1, y, fg(B, 'rost1')); }
  }
  const KDEL = [
    { // 1: en bit av en arm eller ett ben; benet sticker ut ur snittet till höger
      text: 'En bit av en arm eller ett ben, med en vit benstump som sticker ut ur snittet och en stor pöl blod.',
      rader: () => former(24, 11, [
        [linje([[2.5, 5.5], [13.5, 5.5]], 3.2, 2.9), hud(5.5)],
        [ell(14, 5.5, 1.6, 2.9), kott],
        [linje([[14, 5.2], [19.5, 5.2]], 1.1), ben(5.2)],
        [och(ell(20.6, 4.2, 1.3, 1.1), ell(20.6, 6.2, 1.3, 1.1)), ben(5.2)],
        [ell(14.6, 3.2, 0.7, 0.6), 'R'],
      ]),
      x: 3, y: 4, pölar: [[17, 13.5, 8, 2.6], [9, 14.5, 4, 1.6]], droppar: [[26, 11, 1], [4, 15, 0], [27, 15, 0], [23, 9, 0]],
    },
    { // 2: en hand med fingrarna utåt; handleden är avhuggen till vänster, med benet ute
      text: 'En hand med fingrarna utåt. Ur den avhuggna handleden sticker en vit benstump ut, och blodet har runnit ut på marken.',
      rader: () => former(24, 12, [
        [linje([[5, 6.5], [11, 6.5]], 2.3), hud(6.5)],
        [ell(13.5, 6.5, 3.6, 3.1), hud(6.5)],
        [och(linje([[15.5, 4.2], [20.5, 3]], 0.75), linje([[16.5, 5.6], [21.8, 5.4]], 0.75), linje([[16.5, 7.3], [21.6, 7.8]], 0.75), linje([[15.5, 8.8], [19.8, 10.2]], 0.75)), (x, y) => y > 8 ? 'H' : 'h'],
        [linje([[12, 3.6], [13.5, 1.2]], 0.8), 'h'],
        [ell(5, 6.5, 1.4, 2.3), kott],
        [linje([[1.5, 6.4], [5, 6.4]], 0.95), ben(6.4)],
        [och(ell(1.4, 5.4, 1.1, 1), ell(1.4, 7.3, 1.1, 1)), ben(6.4)],
      ]),
      x: 3, y: 4, pölar: [[6, 14, 6.5, 2.4], [12, 15.5, 3, 1.2]], droppar: [[2, 9, 1], [15, 17, 0], [22, 15, 0], [1, 16, 0]],
    },
    { // 3: en klump kött med en benstump snett uppåt
      text: 'En klump man inte vill titta på länge: rött kött, en bit hud och en vit benstump som sticker upp, i en pöl blod.',
      rader: () => former(22, 13, [
        [ell(9.5, 8, 7, 4.2), (x, y) => x < 7 ? (y > 9.5 ? 'H' : 'h') : kott(x, y)],
        [ell(5.5, 7.5, 3, 2.6), (x, y) => y > 8.5 ? 'H' : 'h'],
        [linje([[12, 6.5], [16.5, 2.6]], 1.1), (x, y) => x + y > 19.6 ? 'w' : 'W'],
        [och(ell(16.4, 1.6, 1.1, 1.1), ell(18, 2.8, 1.1, 1.1)), (x, y) => x + y > 19.6 ? 'w' : 'W'],
        [ell(12, 7.2, 1.6, 1), 'R'],
      ]),
      x: 5, y: 3, pölar: [[14, 15, 9, 2.8], [6, 15.5, 4, 1.8]], droppar: [[2, 12, 1], [26, 13, 0], [25, 10, 0], [4, 18, 0]],
    },
  ];
  const kdelVersion = V => ({ text: V.text, w: 32, h: 20, rita: B => { gras(B); blod(B, V.pölar, V.droppar); lagg(B, V.rader(), KD, V.x, V.y, false); } });
  byt(KORT('f8_kroppsdel', 'Den avhuggna kroppsdelen', 'Steg 8.2.3: en förlorad kroppsdel blir en sak på marken med ägarens namn och delen ("Häggs vänstra hand"). Den ruttnar som maten. Samma bild för alla delar. Samma tre bilder som förut, nu med en vit benstump som syns i ena änden och mycket mer blod: på snittet och i en pöl på marken. Din kommentar förra gången: "En benstump ska vara synlig i ena änden. Och mer blod".', KDEL.map(kdelVersion)));

  // ---------- 8.3.14 ledarens mantel ----------
  // samma tre mantlar som förut: som sak på marken, på bybon på kartan (framifrån, från sidan, bakifrån och åt väster)
  // och i porträttet. Det som bärs läggs som punkter ovanpå kartfiguren (som bältet och ryggsäcken i 7.1-bara.js).
  const ML = { a: 'rost1', b: 'rost2', c: 'rost3', d: 'jord1', e: 'jord2', f: 'senap3', g: 'ben3' };
  const MANTLAR = [
    { text: 'En röd mantel med ett guldspänne vid halsen.', ljus: 'rost3', mitt: 'rost2', mork: 'rost1', kant: null, spanne: 'senap3', krage: null,
      sak: ['....oooooooo....', '...occccccbbo...', '..occcccccbbbo..', '..occccfcccbbo..', '..occccccccbbo..', '.occccccccbbbbo.', '.occccccccbbbbo.', '.occcccccbbbbbo.', '.occcccccbbbbao.', '.oaaccccbbbbaao.', '..oooaaaaaaooo..', '.....oooooo.....'] },
    { text: 'Samma mantel med en ljus pälskrage runt halsen.', ljus: 'rost3', mitt: 'rost2', mork: 'rost1', kant: null, spanne: 'senap3', krage: ['ben3', 'ben2'],
      sak: ['....gggggggg....', '...ggggggggggo..', '..occcccccbbbo..', '..occccfcccbbo..', '..occccccccbbo..', '.occccccccbbbbo.', '.occccccccbbbbo.', '.occcccccbbbbbo.', '.occcccccbbbbao.', '.oaaccccbbbbaao.', '..oooaaaaaaooo..', '.....oooooo.....'] },
    { text: 'En brun skinnmantel med en gul kant.', ljus: 'jord2', mitt: 'jord1', mork: 'jord0', kant: 'senap3', spanne: 'senap3', krage: null,
      sak: ['....oooooooo....', '...oeeeeeeddo...', '..oeeeeeeeddfo..', '..oeeeefeeddfo..', '..oeeeeeeeddfo..', '.oeeeeeeeeddffo.', '.oeeeeeeeeddffo.', '.oeeeeeeddddffo.', '.oeeeeeeddddffo.', '.ofddeeeddddffo.', '..offfddddfffo..', '.....oooooo.....'] },
  ];
  // kartfiguren med det som bärs (ur 7.1-bara.js): bakom syns bara utanför figuren, over ligger ovanpå, pa bara på figuren
  function figur(B, F, x0, y0, { bakom = [], over = [], pa = [] } = {}) {
    if (!F) return;
    const M = 8, W = F.w + 2 * M, H = F.h + 2 * M, g = new Array(W * H).fill(-1), fig = new Array(W * H).fill(false), egen = new Array(W * H).fill(false);
    const i = (x, y) => (y + M) * W + x + M, inne = (x, y) => x >= -M && y >= -M && x < F.w + M && y < F.h + M;
    for (const [x, y, c] of bakom) if (inne(x, y)) { g[i(x, y)] = fg(B, c); egen[i(x, y)] = true; }
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) { g[i(x, y)] = c; fig[i(x, y)] = true; egen[i(x, y)] = false; } }
    for (const [x, y, c] of over) if (inne(x, y)) { g[i(x, y)] = fg(B, c); if (!fig[i(x, y)]) egen[i(x, y)] = true; }
    for (const [x, y, c] of pa) if (inne(x, y) && fig[i(x, y)] && F.px[y * F.w + x] !== fg(B, 'kol0')) g[i(x, y)] = fg(B, c);
    const ut = g.slice(), kol = fg(B, 'kol0');
    for (let y = -M; y < F.h + M; y++) for (let x = -M; x < F.w + M; x++) if (g[i(x, y)] < 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inne(x + dx, y + dy) && egen[i(x + dx, y + dy)])) ut[i(x, y)] = kol;
    for (let y = -M; y < F.h + M; y++) for (let x = -M; x < F.w + M; x++) { const c = ut[i(x, y)]; if (c >= 0) B.satt(x0 + x, y0 + y, c); }
    for (let x = 2; x < F.w - 2; x++) B.morka(x0 + x, y0 + F.h); // skuggan under fötterna
  }
  const FRO = 1; // samma man som bär bältet och ryggsäcken i 7.1
  const bybo = (rikt, ben = 'sta', arm = 'hanga') => window.BYBO ? window.BYBO(FRO, rikt, ben, arm, null) : null;
  // manteln på kartfiguren (mannen: bålen x 4–9, axlarna x 3 och 10, armarna x 2 och 11, bålen rad 7–12, benen 13–18).
  // Framifrån: manteln ligger över axlarna och armarna och hänger ner till vaderna, öppen framtill med spännet vid halsen.
  // Från sidan: den hänger bakom ryggen. Bakifrån: den täcker ryggen och armarna.
  function mantelLager(V) {
    const fram = [], sida = [], bak = [], NED = 16;
    const ton = (x, a, b) => x <= a ? V.ljus : x >= b ? V.mork : V.mitt;
    // framifrån
    for (let y = 7; y <= NED; y++) {
      const v = y === 7 ? [3, 4] : y === 8 ? [2, 4] : y >= 14 ? [0, 3] : [1, 3];
      const h = y === 7 ? [9, 10] : y === 8 ? [9, 11] : y >= 14 ? [10, 13] : [10, 12];
      for (let x = v[0]; x <= v[1]; x++) fram.push([x, y, V.kant && x === v[1] && y > 7 ? V.kant : y === NED ? V.mork : ton(x, 1, 99)]);
      for (let x = h[0]; x <= h[1]; x++) fram.push([x, y, V.kant && x === h[0] && y > 7 ? V.kant : y === NED || x >= h[1] ? V.mork : V.mitt]);
    }
    for (const x of [5, 8]) fram.push([x, 7, V.mork]); // snöret över bröstet
    fram.push([6, 7, V.spanne], [7, 7, V.spanne]);
    // från sidan (mot öster): manteln hänger bakom ryggen och ligger över axeln
    for (let y = 7; y <= NED; y++) {
      const a = y === 7 ? 4 : y === 8 ? 3 : y >= 13 ? 1 : 2, b = y <= 8 ? 6 : 5;
      for (let x = a; x <= b; x++) sida.push([x, y, V.kant && (x === a || y === NED) ? V.kant : y === NED ? V.mork : x <= a ? V.ljus : x >= 5 ? V.mork : V.mitt]);
    }
    sida.push([7, 7, V.mitt], [8, 7, V.spanne]);
    // bakifrån
    for (let y = 7; y <= NED; y++) {
      const a = y === 7 ? 3 : y === 8 ? 2 : y >= 14 ? 0 : 1, b = 13 - a;
      for (let x = a; x <= b; x++) {
        const veck = y >= 10 && (x === 5 || x === 9) && (y + x) % 3 !== 0; // veck nedåt
        bak.push([x, y, V.kant && (x === a || x === b || y === NED) && y > 7 ? V.kant : y === NED || x === b ? V.mork : x === a ? V.ljus : veck ? V.mork : V.mitt]);
      }
    }
    if (V.krage) {
      for (let x = 3; x <= 10; x++) { fram.push([x, 7, x < 7 ? V.krage[0] : V.krage[1]]); bak.push([x, 7, x < 7 ? V.krage[0] : V.krage[1]]); }
      for (const x of [2, 11]) { fram.push([x, 8, x < 7 ? V.krage[0] : V.krage[1]]); bak.push([x, 8, x < 7 ? V.krage[0] : V.krage[1]]); }
      for (let x = 4; x <= 8; x++) sida.push([x, 7, x < 7 ? V.krage[0] : V.krage[1]]);
      sida.push([3, 8, V.krage[0]], [4, 8, V.krage[0]]);
    }
    const spegla = L => L.map(([x, y, c]) => [13 - x, y, c]);
    return { fram: { over: fram }, sida: { over: sida }, bak: { over: bak }, vast: { over: spegla(sida) } };
  }
  // porträttet (64 × 64) med ändringar: andra(x, y, c) ger en ny ton eller null (ur 7.1-bara.js)
  function portratt(B, x0, y0, andra = () => null) {
    const PR = window.PORTRATTEN; if (!PR) return;
    const m = PR.neutral('man'); m.alder = 'vuxen'; m.klader = { rock: 'harskinn', skor: true, balte: false };
    const Q = PR.portratt(m);
    for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c < 0) continue; const n = andra(x, y, c); B.satt(x0 + x, y0 + y, n ? fg(B, n) : c); }
  }
  // manteln i porträttet: över axlarna, öppen framtill där rocken syns, med spännet vid halsen
  const mantelPortratt = V => (x, y, c) => {
    if (y < 47 || y >= 62 || x < 2 || x >= 62) return null;
    const mitt = Math.abs(x - 31.5), oppning = 7 + (y - 50) * 0.9; // öppningen framtill vidgas nedåt
    const kropp = c >= 4; // inte bakgrunden (kolets toner)
    if (V.krage && y <= 51 && kropp && mitt < 15 && mitt >= 4) return (x + y) % 3 === 0 ? V.krage[1] : V.krage[0];
    if (y >= 49 && y <= 51 && mitt < 2) return V.spanne;
    if (y >= 49 && y <= 50 && mitt < 5 && mitt >= 2) return V.mork; // snöret
    if (!kropp || y < 49) return null;
    if (mitt < oppning) return null;
    if (V.kant && mitt < oppning + 1.5) return V.kant;
    const ut = mitt / 31; // ljuset från vänster, mörkare ut mot höger kant
    if (x < 32) return ut > 0.85 ? V.mitt : V.ljus;
    return ut > 0.75 ? V.mork : V.mitt;
  };
  const mantelVersion = V => {
    const L = mantelLager(V), sw = 16, w = 4 + sw + 6 + 4 * 18 + 66 + 4, h = 72, fot = 50;
    return { text: V.text, w, h, rita: B => {
      gras(B);
      lagg(B, V.sak, ML, 4, fot - V.sak.length);
      const F = [['fram', L.fram], ['sida', L.sida], ['bak', L.bak], ['vast', L.vast]];
      F.forEach(([r, lager], n) => figur(B, bybo(r), 4 + sw + 6 + n * 18 + 2, fot - 19, lager));
      portratt(B, w - 4 - 64, 4, mantelPortratt(V));
    } };
  };
  byt(KORT('f8_mantel', 'Ledarens mantel', 'Steg 8.3.14: en mantel som byn gör åt ledaren när hen suttit en tidsålder och har mer än hälften av legitimiteten. Den värmer som en kappa, ger anseende och följer ämbetet till nästa ledare. Samma tre mantlar som förut, nu också på en bybo: till vänster manteln som sak, sedan bybon på kartan framifrån, från sidan, bakifrån och åt väster, och sist i porträttet. Din kommentar förra gången: "Rita den på en person så jag kan se hur det kommer se ut".', MANTLAR.map(mantelVersion)));

  // ---------- 8.5.1 graven: en enkel gravsten ----------
  // en jordkulle (en ruta lång) med en sten i huvudänden. j/J/k jorden (jord0–2), T/S/s stenen (skiffer3–1), G gräs
  const GL = { j: 'jord0', J: 'jord1', k: 'jord2', T: 'skiffer3', S: 'skiffer2', s: 'skiffer1', G: 'oliv2', g: 'oliv1' };
  const kulle = (cy = 15) => [ell(9, cy, 7.6, 3.3), (x, y) => y < cy - 2 ? 'k' : y > cy + 1.8 ? 'j' : hash(Math.floor(x), Math.floor(y), 4) < 0.15 ? 'k' : 'J'];
  const sten = (x, y, a, b) => x < a ? 'T' : x > b ? 's' : 'S';
  const GRAVAR = [
    { text: 'En upprest sten med rundad topp, i huvudänden av jordkullen.', rader: () => former(19, 20, [
      kulle(15.5),
      [och(rakt(5.5, 4, 12.5, 14), ell(9, 4.5, 3.5, 3)), (x, y) => sten(x, y, 7, 11)],
      [rakt(5.5, 13, 12.5, 14), 's'],
    ]) },
    { text: 'En grov, otuktad sten som står lite snett, med mossa vid foten.', rader: () => former(19, 20, [
      kulle(15.5),
      [poly([[6, 14], [5.5, 7], [7, 3], [9.5, 1.5], [11.5, 3.5], [12.5, 9], [12, 14]]), (x, y) => y > 12.5 && hash(Math.floor(x), 1, 2) < 0.6 ? 'g' : sten(x, y, 7.5 + (y < 5 ? 1 : 0), 10.5)],
    ]) },
    { text: 'En låg, bred sten med ett enkelt streck ristat i, och några småstenar på kullen.', rader: () => former(19, 20, [
      kulle(15),
      [och(rakt(3.5, 7, 14.5, 13), ell(9, 7.5, 5.5, 1.6)), (x, y) => sten(x, y, 5, 13)],
      [rakt(6.5, 9.5, 11.5, 10.5), 's'],
      [och(ell(5, 15.5, 0.9, 0.8), ell(13, 16, 0.9, 0.8), ell(9.5, 17, 0.9, 0.8)), 'T'],
    ]) },
  ];
  const gravVersion = V => ({ text: V.text, w: 28, h: 28, rita: B => { gras(B); lagg(B, V.rader(), GL, 4, 4, true); } });
  byt({ ...KORT('f8_grav', 'Graven', 'Steg 8.5.1: graven är en ruta på gravplatsen, som 10.1.3 bygger vidare på. Nu tre enkla gravstenar, var och en i huvudänden av en jordkulle. Din kommentar förra gången: "Gör en enkel gravsten."', GRAVAR.map(gravVersion)) });

  // ---------- 8.5.1 den döda kroppen ----------
  // Ritas ur personens vanliga kartfigur (samma mall, hår, kläder och hud), med en regel som gäller vilken figur som helst:
  // figuren vrids ett kvarts varv så att den ligger ner, ögonen är slutna och huden får dödens bleka ton (humöret "död"
  // i porträtten), och färgerna ändras lite. Varje regel visas på tre olika personer: levande till vänster, död till höger.
  const PERSONER = [
    { mall: 'man', hud: 2, har: 3, frisyr: 'har-2', skagg: 'skagg-2', rock: 'harskinn', skor: true, balte: true },
    { mall: 'kvinna', hud: 0, har: 5, frisyr: 'har-9', rock: null, skor: false },
    { mall: 'kvinna', hud: 3, har: 6, frisyr: 'har-13', rock: 'vargskinn', skor: true },
  ];
  const person = (o, dod) => {
    const PR = window.PORTRATTEN, p = PR.neutral(o.mall); p.alder = 'vuxen';
    p.hud = o.hud; p.har = o.har; p.del.frisyr = o.frisyr; p.del.skagg = o.skagg || null;
    p.klader = { rock: o.rock, skor: o.skor, balte: !!o.balte, axelrem: false, ryggsack: false, krokar: 0 };
    if (dod) p.humor = 'dod';
    return p;
  };
  // figuren ensam (utan gräset kartBild lägger runt den): allt som nås från kanten utan att gå över konturen är gräs
  function ensam(M, P) {
    const kol = P.i('kol', 0), ute = new Uint8Array(M.w * M.h), kö = [];
    for (let x = 0; x < M.w; x++) kö.push([x, 0], [x, M.h - 1]);
    for (let y = 0; y < M.h; y++) kö.push([0, y], [M.w - 1, y]);
    while (kö.length) {
      const [x, y] = kö.pop(); if (x < 0 || y < 0 || x >= M.w || y >= M.h) continue;
      const i = y * M.w + x; if (ute[i] || M.px[i] === kol) continue;
      ute[i] = 1; kö.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    const px = Array.from(M.px, (c, i) => ute[i] ? -1 : c);
    return { w: M.w, h: M.h, px };
  }
  // ett kvarts varv: medsols (huvudet åt höger) eller motsols (huvudet åt vänster)
  const vrid = (F, medsols) => {
    const px = new Array(F.w * F.h).fill(-1), w = F.h, h = F.w;
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const nx = medsols ? F.h - 1 - y : y, ny = medsols ? x : F.w - 1 - x; px[ny * w + nx] = F.px[y * F.w + x]; }
    return { w, h, px };
  };
  // färgerna: varje punkt (utom konturen) flyttas i färgrymden och får närmaste färg i paletten
  const omfarga = (F, P, [kL, kC, dL = 0]) => ({ ...F, px: F.px.map(c => { if (c < 0 || c === P.i('kol', 0)) return c; const [L, a, b] = P.cols[c].lab; return P.near([L * kL + dL, a * kC, b * kC]); }) });
  const klistra = (B, F, x0, y0) => { for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const c = F.px[y * F.w + x]; if (c >= 0) B.satt(x0 + x, y0 + y, c); } };
  const fyllda = F => { const s = new Set(); for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) if (F.px[y * F.w + x] >= 0) s.add(x + ',' + y); return s; };
  const DODA = [
    { text: 'På rygg: figuren framifrån vriden ett kvarts varv, slutna ögon och blek hud. Kläderna och håret som de var, och en skugga under.',
      rikt: 'fram', ben: 'sta', arm: 'hanga', medsols: false, farg: null, skugga: true },
    { text: 'På sidan: figuren från sidan vriden ett kvarts varv, slutna ögon och blek hud, och allt ett steg blekare och gråare. Ingen skugga, den ligger platt mot marken.',
      rikt: 'sida', ben: 'sta', arm: 'hanga', medsols: false, farg: [1.04, 0.5, 2], skugga: false },
    { text: 'Hopsjunken: figuren från sidan med ena armen utsträckt och benet böjt, vriden ett kvarts varv, slutna ögon, och allt ett steg mörkare och gråare, som i skugga.',
      rikt: 'sida', ben: 'gang1', arm: 'lyfta', medsols: false, farg: [0.86, 0.55], skugga: true },
  ];
  const dodVersion = V => ({ text: V.text, w: 4 + PERSONER.length * 46, h: 30, rita: B => {
    gras(B);
    const PR = window.PORTRATTEN; if (!PR) return;
    PERSONER.forEach((o, n) => {
      const x0 = 4 + n * 46;
      // levande, stående framifrån
      const L = ensam(PR.kartBild(person(o, false), 'fram', 'sta', 'hanga'), B.P);
      klistra(B, L, x0 - 2, 27 - L.h + 2);
      for (let x = 3; x < 13; x++) B.morka(x0 + x, 26);
      // död, liggande
      let D = vrid(ensam(PR.kartBild(person(o, true), V.rikt, V.ben, V.arm), B.P), V.medsols);
      if (V.farg) D = omfarga(D, B.P, V.farg);
      const dx = x0 + 16, dy = 27 - D.h + 2;
      klistra(B, D, dx, dy);
      if (V.skugga) { const s = fyllda(D); for (const k of s) { const [x, y] = k.split(',').map(Number); if (!s.has(x + ',' + (y + 1))) B.morka(dx + x, dy + y + 1); } }
    });
  } });
  byt(KORT('f8_kropp', 'Den döda kroppen', 'Steg 8.5.1: kroppen ligger där personen dog tills någon bär den till graven. Nu ritad ur personens egen kartfigur, så att den ser ut som personen gjorde, med en regel som fungerar på vilken figur som helst (inga egna döda bilder): figuren vrids ett kvarts varv så att den ligger ner, ögonen sluts, huden blir blek och färgerna ändras lite. Varje regel visas på tre olika personer, levande till vänster och död till höger. Din kommentar förra gången: "Använd personen som den såg ut. Lägg den på sidan. Ändra färgen lite. Och kanske någon mer skillnad? Men så vi inte behöver rita nya döda versioner av alla olika kombinationer av människor som finns".', DODA.map(dodVersion)));
})();
