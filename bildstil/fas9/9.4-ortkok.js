// fas 9, system 9.4: örtköket i tre delar (steg 9.4.3), tre versioner. Förebilden är örtkökets version 2 (f7_ortkok): härden med
// krukan över elden, torkstället med örterna och bänken med morteln, var och en en ruta bred och två djup, som kan stå var för sig
// i rummet. Varje version visar de tre delarna bredvid varandra på gräset, i 16 punkter per ruta.
(() => {
  const { hash, KORT, former, ell, linje, och, rakt, lagg, gras } = window.F7;
  const L = {
    a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', f: 'senap1', g: 'senap2', h: 'senap3',
    r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', w: 'ben1', x: 'ben2', y: 'ben3',
    K: 'kol1', l: 'kol2', Q: 'skiffer0', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3',
    i: 'oliv0', j: 'oliv1', n: 'oliv2', p: 'oliv3',
  };
  const fx = Math.floor;
  const sp = (B, rader, x, y, skugga = true) => lagg(B, rader, L, x, y, skugga);
  const MED = rader => { const w = Math.max(...rader.map(r => r.length)); return former(w + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]); };
  const laga = (B, x, y, hojd = 5) => { for (let i = 0; i < hojd; i++) { const [ramp, ton] = i === 0 ? ['ben', 3] : i < hojd - 2 ? ['senap', 3 - (i > 2)] : ['rost', 2]; B.satt(x, y - i, B.P.i(ramp, ton), true); } };
  const anga = (B, x, y, s) => { for (let i = 0; i < 6; i++) if (hash(i, s, 5) > 0.3) B.satt(x + Math.round(Math.sin(i / 1.6 + s)), y - i, B.P.i('ben', i < 3 ? 2 : 1)); };
  const sten = (w, h, s) => former(w + 2, h + 2, [[ell(1 + w / 2, 1 + h / 2, w / 2, h / 2), (x, y) => { const u = (x - 1) / w * 0.7 + (y - 1) / h; if (hash(fx(x), fx(y), s) < 0.07) return 'R'; return u < 0.5 ? 'T' : u < 1.0 ? 'S' : u < 1.35 ? 'R' : 'Q'; }]]);
  const KRUKA = MED(['.uuuu.', '.rrrr.', '.tsss.', 'ttssss', 'ttsssr', '.ssrr.']);
  const KNIPPE = MED(['.jj.', '.ww.', 'jnnj', 'npnn', 'jnnj', '.jn.']);
  const MORTEL = MED(['....d', '...d.', 'TTcTT', 'SlcRR', 'SSSRR', '.SRR.']);
  const SKAL = MED(['.dddd.', 'dpnpnc', 'cddddb', '.cccb.']);
  // delarnas platser: tre rutor bredvid varandra med en ruta gräs emellan, varje del 16 × 32
  const X = [2, 22, 42], Y = 2;
  const rita = (B, v) => {
    gras(B);
    // ---- härden med krukan över elden ----
    const hx = X[0], hy = Y;
    if (v === 0) { // en låg härd av stenar med krukan på hällen och elden i öppningen (som version 2)
      sp(B, sten(4, 5, 1), hx, hy + 18); sp(B, sten(4, 5, 2), hx + 10, hy + 18);
      for (let y = hy + 20; y < hy + 25; y++) for (let x = hx + 5; x < hx + 11; x++) B.satt(x, y, B.P.i('kol', 1));
      laga(B, hx + 7, hy + 24, 4); laga(B, hx + 9, hy + 24, 3);
      sp(B, former(16, 5, [[rakt(1, 1, 15, 4), (x, y) => y < 2.6 ? 'T' : x > 13 ? 'R' : 'S']]), hx, hy + 15, false);
      sp(B, KRUKA, hx + 4, hy + 7, false); anga(B, hx + 8, hy + 6, 2);
    } else if (v === 1) { // en ring av stenar med elden i mitten och krukan som står i glöden
      for (const [dx, dy, s] of [[0, 22, 1], [5, 25, 2], [10, 22, 3], [2, 17, 4], [9, 17, 5]]) sp(B, sten(3, 3, s), hx + dx, hy + dy);
      for (let y = hy + 21; y < hy + 25; y++) for (let x = hx + 5; x < hx + 11; x++) B.satt(x, y, B.P.i('kol', hash(x, y, 4) < 0.3 ? 2 : 1));
      laga(B, hx + 5, hy + 23, 3); laga(B, hx + 10, hy + 23, 3);
      sp(B, KRUKA, hx + 4, hy + 13, false); anga(B, hx + 8, hy + 11, 1);
    } else { // en trefot av störar över elden där krukan hänger i ett rep
      for (let y = hy + 23; y < hy + 27; y++) for (let x = hx + 4; x < hx + 12; x++) B.satt(x, y, B.P.i('kol', hash(x, y, 7) < 0.3 ? 2 : 1));
      laga(B, hx + 6, hy + 25, 4); laga(B, hx + 9, hy + 25, 5);
      sp(B, former(16, 26, [[linje([[1, 25], [8, 1]], 0.6), 'b'], [linje([[15, 25], [8, 1]], 0.6), 'c'], [rakt(7, 0, 9, 2), 'w']]), hx, hy, false);
      for (let y = hy + 2; y < hy + 9; y++) B.satt(hx + 8, y, B.P.i('ben', 1));
      sp(B, KRUKA, hx + 4, hy + 9, false); anga(B, hx + 8, hy + 8, 3);
      sp(B, sten(3, 3, 1), hx + 1, hy + 25); sp(B, sten(3, 3, 2), hx + 11, hy + 25);
    }
    // ---- torkstället med örterna ----
    const tx = X[1], ty = Y;
    if (v === 0) { // två stolpar och en tvärslå där knippena hänger (som version 2)
      sp(B, former(16, 28, [[och(rakt(1, 2, 3, 28), rakt(13, 2, 15, 28)), x => fx(x) % 2 ? 'b' : 'c'], [rakt(0, 2, 16, 4), (x, y) => y < 3 ? 'd' : 'c']]), tx, ty + 2);
      for (const [dx, s] of [[2, 0], [6, 1], [10, 2]]) sp(B, KNIPPE, tx + dx - 1, ty + 6 + s % 2, false);
    } else if (v === 1) { // en stege lutad mot en stolpe med knippen på två pinnar
      sp(B, former(16, 28, [[och(linje([[2, 27], [5, 1]], 0.7), linje([[9, 27], [12, 1]], 0.7)), 'c'], [och(rakt(3, 8, 12, 9), rakt(3, 18, 11, 19)), 'b']]), tx, ty + 2);
      sp(B, KNIPPE, tx + 2, ty + 11, false); sp(B, KNIPPE, tx + 8, ty + 11, false); sp(B, KNIPPE, tx + 4, ty + 21, false);
    } else { // en låg ram med ett nät av rep där örterna ligger och torkar, med en skål under
      sp(B, former(16, 14, [[och(rakt(1, 1, 15, 3), rakt(1, 1, 3, 13), rakt(13, 1, 15, 13)), 'c'], [rakt(3, 3, 13, 9), (x, y) => (fx(x) + fx(y)) % 3 ? 'n' : 'w']]), tx, ty + 12);
      for (let k = 0; k < 4; k++) B.satt(tx + 4 + k * 2, ty + 15 + (k % 2), B.P.i('oliv', 3));
      sp(B, SKAL, tx + 4, ty + 26, false);
    }
    // ---- bänken med morteln ----
    const bx = X[2], by = Y;
    const bank = (hojd, s) => former(16, hojd + 6, [[rakt(1, 1, 15, 3), (x, y) => hash(fx(x / 3), fx(y), s) < 0.25 ? 'c' : 'd'], [rakt(1, 3, 15, 4), 'b'], [och(rakt(2, 4, 4, 5 + hojd), rakt(12, 4, 14, 5 + hojd)), x => fx(x) % 2 ? 'a' : 'b']]);
    if (v === 0) { sp(B, bank(8, 1), bx, by + 16); sp(B, MORTEL, bx + 1, by + 10, false); sp(B, SKAL, bx + 8, by + 12, false); }
    else if (v === 1) { sp(B, bank(5, 2), bx, by + 18); sp(B, MORTEL, bx + 4, by + 12, false); sp(B, sten(5, 3, 6), bx + 4, by + 26); }
    else { sp(B, sten(12, 8, 7), bx, by + 18); sp(B, MORTEL, bx + 1, by + 12, false); sp(B, KNIPPE, bx + 9, by + 14, false); }
  };
  const V = (text, v) => ({ text, w: 60, h: 36, rita: B => rita(B, v) });
  VAL.push(
    KORT('f9_ortkok_delar', 'Örtkökets tre delar', 'Steg 9.4.3: örtköket delas i tre ting som kan stå var för sig i rummet, efter örtkökets version 2: härden med krukan över elden, torkstället med örterna och bänken med morteln, där man arbetar. Varje del är en ruta bred och två djup. Här står de bredvid varandra, härden till vänster.', [
      V('Som version 2: en låg härd av stenar med krukan på hällen, två stolpar med en tvärslå där knippena hänger, och en bänk med morteln och en skål.', 0),
      V('En ring av stenar där krukan står i glöden, en stege lutad mot stolpen med knippen på pinnarna, och en låg bänk med morteln och en sten under.', 1),
      V('En trefot över elden där krukan hänger, en låg ram med ett nät där örterna ligger och torkar, och en stor sten med morteln och ett knippe.', 2),
    ]),
  );
})();
