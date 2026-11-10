// fas 9, system 9.8: platserna (steg 9.8.4, 9.8.9 och 9.8.16), tre versioner var: hagen, slåtterängen, höstacken, fähuset och det hamlade trädet. Allt på 16 punkter per ruta.
(() => {
  const { former, rakt, ell, och, lagg, hash } = window.F7;
  const { L, gras } = window.F98;
  const I = (B, t) => B.P.i(t.slice(0, -1), +t.slice(-1));
  const PA = (text, rader, bg, legend = {}, m = 0) => { const w = rader[0].length + 2 * m, h = rader.length + 2 * m; return { text, w, h, rita: B => { bg(B); lagg(B, rader, { ...L, ...legend }, m, m, false); } }; };

  // ---------- 9.8.4 hagen: en gräsruta med staketet längs en kant ----------
  // staketet är gärdsle som i 9.7: stolpar och rundade grenar
  const stol = (x0, y0, x1, y1) => [rakt(x0, y0, x1, y1), (x, y) => x < x0 + 1.2 ? 'd' : x > x1 - 1.2 ? 'b' : 'c'];
  const slå = (x0, y0, x1, y1) => [rakt(x0, y0, x1, y1), (x, y) => y < y0 + 1 ? 'd' : y > y1 - 1 ? 'b' : 'c'];
  const tuvor = (B, pts) => pts.forEach(([x, y]) => { B.satt(x, y, I(B, 'oliv3')); B.satt(x, y - 1, I(B, 'oliv3')); B.satt(x + 1, y, I(B, 'oliv1')); });
  const hage = [
    (() => { const r = former(16, 16, [slå(0, 9, 16, 11.5), slå(0, 12.5, 16, 15), stol(2, 6.5, 4.5, 16), stol(11, 6.5, 13.5, 16)]); return PA('Staketet längs södra kanten: två rundade grenar mellan stolpar, gräs ovanför.', r, B => { gras(B); tuvor(B, [[6, 2], [12, 4], [2, 1]]); }); })(),
    (() => { const r = former(16, 16, [slå(0, 1, 16, 3.5), slå(0, 5, 16, 7.5), stol(4, 0, 6.5, 9), stol(12, 0, 14.5, 9)]); return PA('Staketet längs norra kanten, högre, med tre led av gren och stolpar som sticker upp ovanför.', r, B => { gras(B); tuvor(B, [[3, 12], [10, 13], [14, 10]]); }); })(),
    (() => { const r = former(16, 16, [stol(0, 0, 2.5, 16), stol(4.5, 0, 7, 16), slå(0, 2.5, 7, 4.5), slå(0, 10, 7, 12), [rakt(0, 6, 7, 7), 'b']]); return PA('Gärdet längs västra kanten: två stolpar tätt vid varandra med tvärgrenar bundna runt dem.', r, B => { gras(B); tuvor(B, [[10, 3], [12, 10], [9, 13]]); }); })(),
  ];

  // ---------- 9.8.9 slåtterängen: högt, oskuret gräs utan staket ----------
  const ang = (B, v) => {
    const P = B.P;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) B.satt(x, y, I(B, hash(x, y, 3) < 0.22 ? 'oliv1' : 'oliv2'));
    for (let x = 0; x < 16; x++) {
      const bladen = v === 1 ? 2 : 3;
      for (let k = 0; k < bladen; k++) {
        const h = 6 + Math.floor(hash(x, k, 11 + v) * 8), x0 = x + Math.floor(hash(x, k, 5) * 3) - 1;
        const lut = v === 2 ? 1 : 0, bot = 15 - Math.floor(hash(x, k, 9) * 3) - (v === 2 ? 0 : 0);
        for (let i = 0; i < h; i++) {
          const xx = x0 + (lut && i > h * 0.5 ? Math.round((i - h * 0.5) / 3) : 0), yy = bot - i;
          B.satt(xx, yy, I(B, i > h * 0.7 ? 'oliv3' : (x + k) % 2 ? 'oliv1' : 'oliv0'));
        }
        const tx = x0 + (lut ? Math.round(h * 0.5 / 3) : 0), ty = bot - h;
        if (v === 0 && hash(x, k, 21) < 0.5) { B.satt(tx, ty, I(B, 'senap2')); B.satt(tx, ty - 1, I(B, 'senap3')); }
        if (v === 1 && hash(x, k, 22) < 0.3) { B.satt(tx, ty, I(B, hash(x, k, 23) < 0.5 ? 'ben3' : 'rost2')); B.satt(tx, ty + 1, I(B, 'oliv3')); }
        if (v === 2) { B.satt(tx, ty, I(B, 'senap1')); B.satt(tx + 1, ty - 1, I(B, 'senap2')); }
      }
    }
  };
  const ANG = (text, v) => ({ text, w: 16, h: 16, rita: B => ang(B, v) });

  // ---------- 9.8.9 höstacken: hö stackat som ved ----------
  const HL = { ...L };
  const hostack = [
    // 1: tre lager liggande kärvar, bundna på mitten, på två stockar
    (() => { const lag = (y0) => [rakt(1, y0, 15, y0 + 3), (x, y) => (Math.floor(x) === 8 || Math.floor(x) === 4 && 0) ? 'e' : y < y0 + 1 ? 'h' : y > y0 + 2 ? 'f' : (Math.floor(x + y) % 3 === 0 ? 'f' : 'g')];
      return PA('Tre lager liggande kärvar ovanpå varandra, bundna med ett rep, på två stockar.', former(16, 16, [[rakt(2, 13, 14, 16), (x, y) => y < 14 ? 'c' : 'b'], lag(9.5), lag(6), lag(2.5), [(x, y) => Math.floor(y) % 3 !== 2 && Math.floor(x) === 5 && y > 2.5 && y < 12.5, 'r']]), gras); })(),
    // 2: kärvarna sedda från änden, som vedträn i en hög: rundade ändar i en pyramid
    (() => { const rond = (cx, cy) => [ell(cx, cy, 2.6, 2.4), (x, y) => Math.hypot(x - cx, y - cy) < 1 ? 'e' : (x - cx) + (y - cy) < -1.2 ? 'h' : (x - cx) + (y - cy) > 1.5 ? 'f' : 'g'];
      return PA('Kärvarnas ändar syns som i en vedhög: fyra, tre och två i en pyramid, med strån som sticker ut.', former(16, 16, [rond(2.8, 13), rond(7.4, 13), rond(12.0, 13), rond(5.2, 9), rond(9.8, 9), rond(7.5, 5)]), gras, {}, 0); })(),
    // 3: ett högt, kantigt stapel med ett tak av näver och granris, och ett rep tvärs över
    (() => { const rader = former(16, 16, [[rakt(1, 5, 15, 14), (x, y) => Math.floor(y) % 3 === 1 ? 'f' : (Math.floor(x * 0.7 + y) % 4 === 0 ? 'h' : 'g')], [rakt(0, 2.5, 16, 5), (x, y) => y < 3.5 ? 'B' : 'A'], [rakt(5, 5, 6, 14), 'r'], [rakt(10, 5, 11, 14), 'r'], [rakt(2, 14, 14, 16), (x, y) => y < 15 ? 'c' : 'b']]);
      return PA('Ett kantigt staplat hö med ett tak av granris överst och två rep runt om.', rader, gras); })(),
  ];

  // ---------- 9.8.9 fähuset: 2 × 2 rutor, utan tak (som husen), med dörren i söder ----------
  const FW = 32;
  const fahus = (B, v) => {
    gras(B);
    const x0 = 2, y0 = 2, x1 = 30, y1 = 29; // husets yttre
    const vagg = v === 1 ? 3 : 4;
    const golv = (x, y) => v === 2 ? I(B, hash(x, y, 4) < 0.35 ? 'senap1' : 'senap0') : I(B, hash(x, y, 4) < 0.3 ? 'jord0' : 'jord1');
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const inne = x >= x0 + vagg && x < x1 - vagg && y >= y0 + vagg && y < y1 - vagg;
      let c;
      if (inne) { c = golv(x, y); if (hash(x, y, 8) < 0.12 && v !== 1) c = I(B, 'senap2'); B.satt(x, y, c); B.morka(x, y); continue; }
      const kant = x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1;
      if (kant) { B.satt(x, y, I(B, 'kol0')); continue; }
      const vert = x < x0 + vagg || x >= x1 - vagg; // vänster/höger vägg: stockar lodrätt i bilden är liggande -> stockar löper längs väggen
      if (v === 1) { // flätat: lodräta störar och vågräta vidjor
        const st = vert ? (y % 2) : (x % 2), ton = (x + y) % 4 === 0 ? 'jord3' : (x + y) % 4 === 1 ? 'jord2' : 'jord1';
        B.satt(x, y, I(B, st ? ton : 'jord0'));
      } else {
        const u = vert ? (x < x0 + vagg ? x - x0 - 1 : x1 - 2 - x) : (y < y0 + vagg ? y - y0 - 1 : y1 - 2 - y);
        const stock = Math.floor(u / 2); // stocken är två punkter bred
        const t = v === 2 ? ['senap1', 'senap2', 'senap0'] : ['jord2', 'jord3', 'jord1'];
        B.satt(x, y, I(B, u % 2 === 0 ? t[(stock + (vert ? y : x) / 99 | 0) % 2 === 0 ? 1 : 0] : t[2]));
      }
    }
    // hörn med knutar (stockändar) för timmer
    if (v !== 1) for (const [cx, cy] of [[x0, y0], [x1 - 1, y0], [x0, y1 - 1], [x1 - 1, y1 - 1]]) for (let dy = -(cy > y0 ? 3 : 0); dy <= (cy > y0 ? 0 : 3); dy++) for (let dx = -(cx > x0 ? 3 : 0); dx <= (cx > x0 ? 0 : 3); dx++) if (!(dx === 0 && dy === 0)) { /* inget */ }
    // dörren i söder: en lucka i väggen, ett tröskelträ, och golvet syns genom
    const dx0 = 13, dx1 = 19;
    for (let y = y1 - vagg; y < y1; y++) for (let x = dx0; x < dx1; x++) {
      if (y === y1 - 1) { B.satt(x, y, I(B, x === dx0 || x === dx1 - 1 ? 'kol0' : 'jord3')); continue; }
      B.satt(x, y, x === dx0 || x === dx1 - 1 ? I(B, 'kol0') : I(B, 'jord0'));
    }
    for (let y = y1 - vagg; y < y1 - 1; y++) { B.satt(dx0 + 1, y, I(B, 'jord2')); B.satt(dx1 - 2, y, I(B, 'jord2')); }
    // dörrflyglarna: två plankor lutade ut
    for (let i = 0; i < 4; i++) { B.satt(dx0 - 1 - (i > 1 ? 1 : 0), y1 - 1 + (i > 1 ? 1 : 0), I(B, 'jord1')); }
    // båsen/ kritor inuti: en krubba längs norra väggen (v 0, 2) eller ett bås (v 1)
    const kx0 = x0 + vagg + 1, kx1 = x1 - vagg - 1, ky = y0 + vagg + 1;
    if (v !== 1) { for (let x = kx0; x < kx1; x++) { B.satt(x, ky, I(B, 'kol0')); B.satt(x, ky + 1, I(B, 'jord2')); B.satt(x, ky + 2, I(B, x % 3 === 0 ? 'senap2' : 'senap3')); B.satt(x, ky + 3, I(B, 'kol0')); } }
    else { for (let y = ky; y < y1 - vagg - 1; y += 1) { if (y % 1 === 0) { B.satt(16, y, I(B, 'jord1')); B.satt(17, y, I(B, 'kol0')); } } for (let x = kx0; x < 16; x++) { B.satt(x, ky + 1, I(B, 'senap3')); } }
    // skugga från taket utanför (nedåt höger)
    for (let y = y0 + 1; y < y1 + 1; y++) B.morka(x1, y);
    for (let x = x0 + 1; x <= x1; x++) B.morka(x, y1);
  };
  const FAHUS = (text, v) => ({ text, w: FW, h: FW, rita: B => fahus(B, v) });

  // ---------- 9.8.16 det hamlade trädet: en björk med kort tjock stam och en tät krona av raka skott ----------
  const HW = 24, HH = 40;
  function hamlad(B, v) {
    gras(B);
    const cx = 12, by = HH - 4;
    const stamH = v === 2 ? 11 : 15, w = v === 1 ? 6 : 5, top = by - stamH;
    // skuggan
    for (let dx = 2; dx < 10; dx++) for (let dy = -1; dy <= 2; dy++) if (((dx - 5) / 4) ** 2 + (dy / 2) ** 2 < 1 && (dx + dy) % 2 === 0) B.morka(cx + dx, by + dy);
    // kronan: en tät klump blad (ljusa, så att de syns mot gräset), sedan skotten ovanpå
    const kron = (cxx, cyy, rx, ry) => { for (let y = cyy - ry; y <= cyy + ry; y++) for (let x = cxx - rx; x <= cxx + rx; x++) { const d = ((x - cxx) / rx) ** 2 + ((y - cyy) / ry) ** 2; if (d <= 1 && hash(x, y, 14) < (v === 2 ? 0.7 : 0.92) - d * 0.25) B.satt(x, y, I(B, d > 0.8 ? 'barr1' : hash(x, y, 15) < 0.3 ? 'barr2' : x < cxx && y < cyy ? 'oliv3' : 'oliv1')); } };
    kron(cx, top - (v === 2 ? 8 : 10), v === 1 ? 8 : 6, v === 2 ? 8 : 9);
    if (v === 2) kron(cx - 3, top - 3, 4, 3);
    // skotten: tunna, raka, rödbruna linjer som sticker upp ur knölen och ur kronan, med bladpar
    const antal = v === 2 ? 7 : 10;
    for (let k = 0; k < antal; k++) {
      const t = k / (antal - 1) - 0.5;
      const x0 = cx + Math.round(t * (w + 1)), lut = t * (v === 1 ? 1.1 : 0.5) + (hash(k, 3, 5) - 0.5) * 0.15;
      const langd = (v === 2 ? 15 : 19) + Math.floor(hash(k, 2, 5) * 4) - Math.floor(Math.abs(t) * (v === 1 ? 6 : 8));
      for (let i = 0; i < langd; i++) {
        const xx = Math.round(x0 + lut * i), yy = top - 1 - i;
        B.satt(xx, yy, I(B, i < 3 ? 'ben1' : 'jord2'));
        if (i >= 4 && i % 3 === k % 3) { const sid = i % 2 ? -1 : 1; B.satt(xx + sid, yy, I(B, 'oliv3')); B.satt(xx + sid * 2, yy - 1, I(B, 'barr2')); }
      }
      const ex = Math.round(x0 + lut * langd), ey = top - 1 - langd; B.satt(ex, ey, I(B, 'oliv3')); B.satt(ex, ey - 1, I(B, 'oliv3'));
    }
    // stammen: vit med svarta märken, kort och tjock, nertill mörk
    for (let y = by; y >= top; y--) {
      const bred = w + (y > by - 3 ? 1 : 0) + (y < top + 2 ? 1 : 0) + (v === 2 && y < top + 5 && y > top + 2 ? 1 : 0);
      for (let i = 0; i < bred; i++) {
        const x = cx - (bred >> 1) + i;
        let c = i === bred - 1 ? I(B, 'ben1') : i === 0 ? I(B, 'ben3') : I(B, 'ben2');
        if (by - y < 3) c = hash(x, y, 431) < 0.5 ? I(B, 'kol2') : I(B, 'kol1');
        else if (hash(Math.floor(y / 2), cx, 432) < 0.22 && hash(x, y, 433) < 0.8) c = I(B, 'kol1');
        if (i === 0 || i === bred - 1) { if (hash(x, y, 7) < 0.15) c = I(B, 'kol0'); }
        B.satt(x, y, c);
      }
    }
    // kapad topp: en tjock knöl med snittytan ljus och några gamla knölar där skott suttit
    for (let i = -(w >> 1) - 1; i <= (w >> 1) + 1 + (w % 2 ? 0 : 0); i++) { B.satt(cx + i, top, I(B, 'jord2')); B.satt(cx + i, top - 1, I(B, 'jord1')); }
    B.satt(cx - 1, top - 1, I(B, 'ben2')); B.satt(cx, top - 1, I(B, 'ben3'));
    for (const [dx, dy] of [[-3, 3], [3, 5], [-3, 7]]) B.satt(cx + dx, top + dy, I(B, 'kol1'));
    if (v === 1) for (const dy of [4, 8]) { B.satt(cx - 4, top + dy, I(B, 'ben2')); B.satt(cx + 3, top + dy + 1, I(B, 'ben1')); }
  }
  const HAMLAD = (text, v) => ({ text, w: HW, h: HH, rita: B => hamlad(B, v) });

  VAL.push(
    { id: 'f9_hage', namn: 'Hagen', typ: 'tre', vad: 'Steg 9.8.4: hagen är en inhägnad betesmark nära byn där fåren och getterna går. Här en gräsruta med staketet (gärdsle som i 9.7) längs en kant; rutorna läggs i rad så att staketet sluter kring hagen.', versioner: hage },
    { id: 'f9_slatterang', namn: 'Slåtterängen', typ: 'tre', vad: 'Steg 9.8.9: slåtterängen är en äng med högt, oskuret gräs där byn slår hö med skäran inför vintern. Ingen inhägnad. Här en ruta högt gräs, 16 punkter.', versioner: [
      ANG('Högt, tätt gräs med gula axtoppar.', 0),
      ANG('Högt gräs med vita och röda blommor.', 1),
      ANG('Gräs som lutar åt höger i vinden, med gyllene toppar.', 2)] },
    { id: 'f9_hostack', namn: 'Höstacken', typ: 'tre', vad: 'Steg 9.8.9: höstacken är torkat hö som lagts i en stapel som en vedhög, för att hålla sig torrt och räcka till betesdjuren under vintern. Här en ruta.', versioner: hostack },
    { id: 'f9_fahus', namn: 'Fähuset', typ: 'tre', vad: 'Steg 9.8.9: fähuset är en liten byggnad där djuren står om vintern: fyra rutor, ritad utan tak som husen, med dörren i söder och en krubba inne vid väggen.', versioner: [
      FAHUS('Timmerväggar av ljusa stockar, golv av jord och en krubba med hö.', 0),
      FAHUS('Flätade väggar av störar och vidjor, med ett bås inne i huset.', 1),
      FAHUS('Mörkare timmer och halmstrött golv.', 2)] },
    { id: 'f9_hamladbjork', namn: 'Hamlad björk', typ: 'tre', vad: 'Steg 9.8.16: ett hamlat träd är en björk vars grenar kapats högt upp; den fäller inte och skjuter nya, raka skott varje år som byn skär till lövkärvar. Kort, tjock stam med svarta märken och en tät krona av smala skott. Ungefär en ung björks storlek.', versioner: [
      HAMLAD('Tät, upprätt krona av raka skott, som en kvast.', 0),
      HAMLAD('Skotten sprider sig utåt som en vas, stammen tjockare.', 1),
      HAMLAD('Lägre stam med knölar och glesare skott, som precis utslagna.', 2)] },
  );
})();
