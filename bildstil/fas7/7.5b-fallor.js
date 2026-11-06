// fas 7, fällorna (7.5): snaran (7.5.10) och fångstgropen (7.5.11). Tre versioner av varje.
(() => {
  const { hash, KORT, ell, linje, tri, poly, och, utan, punkt, rakt, former, bredd, lagg, gras, R } = window.F7;

  const L = { E: 'jord0', F: 'jord1', G: 'jord2', H: 'jord3', I: 'senap0', J: 'senap1', K: 'senap2', M: 'senap3', p: 'ben1', q: 'ben2', w: 'ben3', v: 'ben0', k: 'kol1', s: 'rost1', t: 'rost2', u: 'rost3', g: 'oliv1', h: 'oliv2', i: 'oliv3', e: 'oliv0', n: 'barr1', m: 'barr2', N: 'barr0', b: 'skiffer2', c: 'skiffer3' };
  const ring = (cx, cy, r0, r1, sy = 1) => (x, y) => { const d = Math.hypot(x - cx, (y - cy) / sy); return d <= r1 && d >= r0; };
  // en buske: löv i klungor, ljusa uppe till vänster och mörka nere till höger
  const BUSKE = former(22, 17, [
    [och(ell(11, 10, 9.5, 5.5), ell(7, 7, 5.5, 4.5), ell(14, 6, 6, 4.8)), (x, y) => { const r = hash(Math.floor(x), Math.floor(y), 81); const lj = (x - 11) / 10 + (y - 8) / 6; return r < 0.12 ? 'N' : lj < -0.6 ? (r < 0.5 ? 'i' : 'h') : lj < 0.2 ? (r < 0.35 ? 'h' : 'm') : r < 0.5 ? 'n' : 'm'; }],
    [linje([[10, 15.5], [10.5, 12]], 0.6), 'F'],
  ]);

  // ---------- 7.5.10 snaran ----------
  // snaran av rep, en böjd gren, en utlösare och en benspärr: som sak, och gillrad på marken vid en buske
  const SNAROR = [
    // 0: spöet, repet med öglan, utlösaren av två pinnar med hak och benspärren
    former(17, 11, [
      [linje([[1.5, 9], [4, 4.5], [9, 2], [14, 2.5]], 0.7), (x, y) => y < 4 && x > 5 ? 'H' : 'G'], // det böjda spöet
      [linje([[14, 2.5], [14.5, 5]], 0.4), 'p'], [ring(14.5, 7.2, 1, 2, 1.1), 'q'], // repet och öglan
      [linje([[3.5, 9.5], [7.5, 9.5]], 0.55), 'G'], [punkt(6, 8), 'F'], [linje([[6.5, 7.5], [8.5, 7.5]], 0.5), 'H'], // utlösaren med hak
      [rakt(9.5, 9, 12.5, 10), 'w'], [punkt(9, 9), 'q'], // benspärren
    ]),
    // 1: repet i en rulle med en löpknut, en kort påle och benspärren
    former(15, 10, [
      [ring(5, 5, 1.6, 3.6, 0.85), (x, y) => y < 4.5 ? 'q' : 'p'], [linje([[8, 5], [11, 3]], 0.45), 'q'], [ring(12, 2.6, 0.4, 1.4), 'q'], // rullen och löpknuten
      [linje([[11, 9], [14, 5]], 0.7), (x) => x < 12.5 ? 'G' : 'H'], [punkt(13, 5), 'K'], // pålen
      [rakt(2, 8.5, 6, 9.5), 'w'], [punkt(6, 8), 'q'], // benspärren
    ]),
    // 2: en grenbåge med snaran hängande inne i bågen och en benspärr överst
    former(14, 13, [
      [linje([[2, 12], [2, 5], [4, 2], [7, 1.2], [10, 2], [12, 5], [12, 12]], 0.6), (x, y) => x < 7 ? 'H' : 'G'], // bågen
      [linje([[7.5, 2], [7.5, 5.5]], 0.5), 'p'], [ring(7.5, 7.6, 1.2, 2.2, 1.15), 'q'], // snaran
      [rakt(5, 0.5, 9, 1.5), 'w'], // benspärren över bågens topp
    ]),
  ];
  const SNARA_TEXT = ['Ett böjt spö som drar upp snaran när utlösaren med hak släpper.', 'En snara som ligger platt på kaninstigen, med repet till en påle där benspärren håller.', 'En båge av en gren stucken i marken, med snaran hängande inne i bågen.'];
  // gillrad: på marken bredvid busken
  function gillrad(B, v) {
    const P = B.P, I = (r, t) => P.i(r, t);
    const sx = 60, fot = 50; // snarans plats
    // en kaninstig: bar jord i gräset fram till busken
    for (let y = fot - 6; y < fot + 4; y++) for (let x = 44; x < B.w; x++) { const d = Math.abs(y - fot + 1 + Math.sin(x / 9) * 1.5); if (d < 2.6 + hash(x, y, 3) * 1.2) B.satt(x, y, hash(x, y, 4) < 0.6 ? I('jord', 2) : hash(x, y, 5) < 0.5 ? I('jord', 1) : I('oliv', 1)); }
    lagg(B, BUSKE, L, 74, 26, false);
    for (let x = 76; x < 94; x++) for (let k = 0; k < 2; k++) if ((x + k) % 2 === 0) B.morka(x, 43 + k);
    const sat = (x, y, ch) => B.satt(x, y, ch === 'o' ? I('kol', 0) : P.i(L[ch].slice(0, -1), +L[ch].slice(-1)));
    const f = (rader, x0, y0) => rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') sat(x0 + x, y0 + y, ch); }));
    if (v === 0) { // ett ungträd bredvid busken böjt ner, repet från toppen till utlösaren och snaran i stigen
      f(former(40, 40, [
        [linje([[34, 38], [33, 26], [27, 14], [17, 8], [8, 9], [4, 13]], 0.8, 0.5), (x, y) => x < 24 && y < 12 ? 'H' : 'G'], // spöet
        [linje([[4.5, 13], [4.5, 22]], 0.5), 'p'], // repet ner till utlösaren
        [linje([[1.5, 24], [6.5, 24]], 0.5), 'H'], [linje([[2, 22], [2, 29]], 0.6), 'G'], [linje([[6, 22], [6, 29]], 0.6), 'G'], // utlösaren: en tvärpinne under två pinnar i marken
        [linje([[4, 24.5], [4, 25.5]], 0.4), 'p'], [ring(4, 31, 1.4, 2.4, 1.6), 'q'], // snaran hänger i stigen
        [och(ell(12, 7, 2.6, 1.7), ell(8.5, 8.6, 2, 1.5)), (x, y) => x < 10 && y < 8 ? 'm' : 'n'], // löv i toppen av ungträdet
      ]), sx - 8, fot - 37);
    } else if (v === 1) { // snaran platt på stigen mellan två pinnar, repet till en påle där benspärren håller
      f(former(40, 24, [
        [utan(ell(9, 16, 5, 2.2), ell(9, 16, 3.4, 1)), (x, y) => y < 16 ? 'w' : 'q'], // öglan ligger platt
        [linje([[4.5, 13], [4.5, 18]], 0.5), 'G'], [linje([[13.5, 13], [13.5, 18]], 0.5), 'G'], // pinnarna som håller den öppen
        [linje([[12.6, 16], [20, 14], [27, 11]], 0.4), 'p'], // repet
        [linje([[27.5, 6], [27.5, 15]], 0.8), (x) => x < 27.5 ? 'H' : 'G'], [punkt(27, 6), 'K'], // pålen
        [rakt(25, 9, 31, 10), 'w'], // benspärren i ett hak i pålen
        [linje([[28, 9], [32, 4], [36, 2], [39, 3]], 0.6), 'G'], // det böjda spöet in i busken
      ]), sx - 12, fot - 19);
    } else { // en båge av en gren över stigen, snaran i bågen, spöet från bågens topp in i busken
      f(former(40, 24, [
        [linje([[5, 22], [5, 12], [8, 7], [12, 5.5], [16, 7], [19, 12], [19, 22]], 0.7), (x) => x < 12 ? 'H' : 'G'], // bågen
        [linje([[12.5, 6], [12.5, 11]], 0.5), 'p'], [ring(12.5, 14.5, 1.6, 2.8, 1.5), 'q'], // snaran
        [rakt(10, 3.5, 15, 4.5), 'w'], // benspärren överst
        [linje([[14, 4], [22, 2], [30, 3], [37, 8]], 0.6), 'G'], // spöet in i busken
      ]), sx - 12, fot - 22);
    }
    for (let x = sx - 10; x < sx + 12; x++) if (x % 2 === 0) B.morka(x, fot + 3);
  }
  const SNARA = (text, v) => ({ text, w: 7 * R, h: 4 * R, rita: (B) => { gillrad(B, v); lagg(B, SNAROR[v], L, 6, 4 * R - 6 - SNAROR[v].length); } });

  // ---------- 7.5.11 fångstgropen ----------
  // en grop för rådjur och älg, täckt med grenar och mossa, som syns svagt på kartan; till höger samma grop när den slagit
  // igen och står öppen
  const GW = 28, GH = 16; // gropen i punkter
  const iGrop = (x, y, x0, y0) => { const u = (x - x0 - GW / 2) / (GW / 2), w = (y - y0 - GH / 2) / (GH / 2); return Math.abs(u) ** 2.6 + Math.abs(w) ** 2.6 <= 1 - (hash(Math.round(x / 3), Math.round(y / 3), 27) - 0.5) * 0.12; };
  function grop(B, v) {
    const P = B.P, I = (r, t) => P.i(r, t);
    gras(B);
    const ax = 10, bx = 70, y0 = 22;
    // täckt: grenar i kors, mossa och löv ovanpå; ju äldre version desto mindre syns den
    for (let y = y0 - 3; y < y0 + GH + 3; y++) for (let x = ax - 3; x < ax + GW + 3; x++) {
      if (!iGrop(x, y, ax, y0)) {
        if (v === 2 && iGrop(x, y, ax - 3, y0 - 3) === false && ((x - ax - GW / 2) / (GW / 2 + 3)) ** 4 + ((y - y0 - GH / 2) / (GH / 2 + 3)) ** 4 <= 1) B.satt(x, y, hash(x, y, 7) < 0.5 ? I('jord', 1) : I('jord', 2)); // en vall av uppgrävd jord
        continue;
      }
      const r = hash(x, y, 11);
      if (v === 0) { if ((x + y) % 2 === 0 && r < 0.5) B.morka(x, y); } // bara lite mörkare gräs
      else if (v === 1) B.satt(x, y, r < 0.35 ? I('oliv', 1) : r < 0.6 ? I('barr', 2) : r < 0.75 ? I('oliv', 2) : r < 0.85 ? I('senap', 1) : I('rost', 1)); // mossa och löv
      else B.satt(x, y, r < 0.5 ? I('barr', 2) : r < 0.8 ? I('oliv', 1) : I('barr', 1)); // en matta av mossa
    }
    // grenarna som bär täcket
    const grenar = v === 0 ? [[[ax + 2, y0 + 4], [ax + 12, y0 + 2]], [[ax + 15, y0 + 13], [ax + 25, y0 + 10]], [[ax + 6, y0 + 12], [ax + 9, y0 + 9]]]
      : v === 1 ? [[[ax - 2, y0 + 3], [ax + GW + 1, y0 + 5]], [[ax - 1, y0 + 9], [ax + GW + 2, y0 + 8]], [[ax - 2, y0 + 14], [ax + GW, y0 + 13]], [[ax + 6, y0 - 1], [ax + 8, y0 + GH + 1]], [[ax + 19, y0 - 1], [ax + 17, y0 + GH + 2]]]
        : [[[ax - 3, y0 + 6], [ax + 4, y0 + 5]], [[ax + GW - 3, y0 + 12], [ax + GW + 3, y0 + 13]]];
    for (const [[x0, yA], [x1, yB]] of grenar) { const n = Math.max(Math.abs(x1 - x0), Math.abs(yB - yA)); for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(yA + (yB - yA) * k / n); B.satt(x, y, I('jord', hash(x, y, 13) < 0.3 ? 2 : 1)); B.morka(x, y + 1); } }
    // öppen: väggarna av jord, den bortre syns, och botten mörk; grenarna och mossan har rasat ner
    for (let y = y0 - 4; y < y0 + GH + 4; y++) for (let x = bx - 4; x < bx + GW + 4; x++) {
      const inne = iGrop(x, y, bx, y0);
      if (!inne) {
        const vall = ((x - bx - GW / 2) / (GW / 2 + 4)) ** 4 + ((y - y0 - GH / 2) / (GH / 2 + 4)) ** 4 <= 1;
        if (vall && (v === 2 || (hash(x, y, 17) < 0.25 && v === 1))) B.satt(x, y, hash(x, y, 7) < 0.5 ? I('jord', 1) : I('jord', 2));
        else if (vall && iGrop(x, y + 1, bx, y0)) B.satt(x, y, I('jord', 2));
        continue;
      }
      const dy = y - y0, vagg = dy < GH * 0.5; // den bortre väggen ner till botten
      if (!iGrop(x, y - 1, bx, y0)) { B.satt(x, y, I('oliv', 0)); continue; } // grästorvan som hänger över kanten
      if (!iGrop(x - 1, y, bx, y0) || !iGrop(x + 1, y, bx, y0)) { B.satt(x, y, I('jord', 0)); continue; }
      if (vagg) B.satt(x, y, hash(x, y, 21) < 0.1 ? I('ben', 0) : hash(x >> 1, 1, 19) < 0.15 && dy < 5 ? I('senap', 0) : dy < 3 ? I('jord', 2) : dy < 6 ? I('jord', 1) : I('jord', 0)); // jord, en sten och rötter
      else B.satt(x, y, hash(x, y, 23) < 0.15 ? I('jord', 0) : hash(x, y, 24) < 0.1 ? I('kol', 2) : I('kol', 1));
    }
    // det som rasat ner
    const ras = v === 0 ? [[[bx + 5, y0 + 12], [bx + 13, y0 + 10]]] : v === 1 ? [[[bx + 3, y0 + 10], [bx + 15, y0 + 13]], [[bx + 10, y0 + 13], [bx + 24, y0 + 9]], [[bx + 18, y0 + 12], [bx + 25, y0 + 13]]] : [[[bx + 6, y0 + 11], [bx + 12, y0 + 13]]];
    for (const [[x0, yA], [x1, yB]] of ras) { const n = Math.max(Math.abs(x1 - x0), Math.abs(yB - yA)); for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(yA + (yB - yA) * k / n); B.satt(x, y, I('jord', 2)); } }
    if (v !== 0) for (const [x, y] of [[bx + 8, y0 + 13], [bx + 20, y0 + 11], [bx + 14, y0 + 12]]) { B.satt(x, y, I('oliv', 1)); B.satt(x + 1, y, I('barr', 2)); } // mossa på botten
    // den främre kanten: en tunn läpp av gräs och jord som skuggar ner i gropen
    for (let x = bx; x < bx + GW; x++) for (let y = y0 + GH - 1; y > y0; y--) if (iGrop(x, y, bx, y0) && !iGrop(x, y + 1, bx, y0)) { B.satt(x, y, I('jord', 0)); break; }
  }
  const GROP_TEXT = ['Knappt synlig: lite mörkare gräs och några kvistar. Öppen: raka väggar av jord och en gren som rasat ner.', 'Synlig: grenar i kors under mossa och löv. Öppen: grenar och mossa ligger på botten och jord spillts på kanten.', 'En matta av mossa med en vall av uppgrävd jord runt. Öppen: vallen runt gropen och en gren på botten.'];

  VAL.push(
    KORT('f7_snara', 'Snaran', 'Steg 7.5.10: snaran, gjord av rep, en böjd gren, en utlösare och en benspärr, som fångar kaniner och fåglar. Bilden visar den som sak till vänster och gillrad på en kaninstig vid en buske till höger.', SNAROR.map((_, i) => SNARA(SNARA_TEXT[i], i))),
    KORT('f7_fangstgrop', 'Fångstgropen', 'Steg 7.5.11: fångstgropen för rådjur och älg, en grop i marken täckt med grenar och mossa, som syns svagt på kartan. Bilden visar den täckt till vänster och till höger när den slagit igen och står öppen; versionerna är hur mycket den syns.', [0, 1, 2].map(i => ({ text: GROP_TEXT[i], w: 7 * R, h: 4 * R, rita: (B) => grop(B, i) }))),
  );
})();
