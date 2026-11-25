// fas 14: disken (steg 14.1.6) och varubordet (steg 14.1.8), tre idéer av varje, två rutor breda. Ytan ses ovanifrån, med en
// mörkare framkant under. Versionen visas på golvet bredvid en kolonist
(() => {
  const FIG = ['....hhhh....', '...hhhhhh...', '...hsssss...', '...ssssss...', '....ssss....', '..TTttttTT..', '.TTtttttttT.', '.sTtttttttTs', '.sTtttttttTs', '..TttMtttT..', '..TtttttttT.', '..TtttttttT.', '...TttttT...', '...jj..jj...', '...jj..jj...', '...kk..kk...'];
  const L = { E: 'jord0', F: 'jord1', G: 'jord2', H: 'jord3', k: 'kol0', K: 'kol3', b: 'ben2', B: 'ben3', g: 'ben1', r: 'rost1', R: 'rost3', y: 'senap2', Y: 'senap3', m: 'oliv2', M: 'oliv3', h: 'jord1', s: 'rost3', t: 'ben1', T: 'ben0', j: 'jord0', S: 'skiffer2', l: 'skiffer1' };
  // en duk att fylla med rektanglar
  const duk = (w, h) => {
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    const d = { r: (x, y, b, hh, c) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + b; i++) if (g[j] && i >= 0 && i < w) g[j][i] = c; return d; },
      p: (c, ...ps) => { for (const [x, y] of ps) if (g[y] && x >= 0 && x < w) g[y][x] = c; return d; },
      // en planka längs med: ljus överkant, skugga underst och några ådror
      planka: (x, y, b, hh) => { d.r(x, y, b, hh, 'G').r(x, y, b, 1, 'H').r(x, y + hh - 1, b, 1, 'F'); for (let i = x + 3; i < x + b - 4; i += 7) d.r(i + (y % 3), y + 1 + (i % Math.max(1, hh - 2)), 4, 1, 'H'); return d; },
      // en rund sak sedd uppifrån: kant och botten
      rund: (cx, cy, rr, kant, botten) => { for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { const q = Math.hypot(i, j); if (q <= rr + 0.2) d.p(q > rr - 1.1 ? kant : botten, [cx + i, cy + j]); } return d; },
      rader: () => g.map(q => q.join('')) };
    return d;
  };
  const visa = (text, rader) => ({ text, w: rader[0].length + 26, h: Math.max(rader.length, 18) + 8, rita: B => {
    const lag = window.F7.lagg;
    lag(B, rader, L, 4, 4, true);
    lag(B, FIG, L, rader[0].length + 10, 4 + Math.max(0, rader.length - 16), true);
  } });
  // ---------- disken ----------
  const disk1 = duk(32, 23); // en hel front av stående plankor
  disk1.r(0, 0, 32, 11, 'E').planka(1, 1, 30, 4).planka(1, 5, 30, 5);
  disk1.r(0, 11, 32, 12, 'E'); for (let i = 0; i < 6; i++) disk1.r(1 + i * 5, 12, 4, 10, 'F').r(1 + i * 5, 12, 1, 10, 'G'); disk1.r(31, 11, 1, 12, 'E').r(0, 20, 32, 1, 'E');
  const skrin = d => d.r(22, 2, 7, 6, 'k').r(23, 3, 5, 2, 'H').r(23, 5, 5, 2, 'F').p('Y', [25, 5]);
  skrin(disk1).p('B', [14, 4], [15, 4], [16, 5]);
  const disk2 = duk(32, 22); // en tjock halv stock på två stubbar
  disk2.r(1, 13, 8, 9, 'E').r(2, 13, 6, 8, 'F').r(2, 13, 1, 8, 'G').p('E', [4, 15], [4, 16], [6, 18], [6, 19]);
  disk2.r(23, 13, 8, 9, 'E').r(24, 13, 6, 8, 'F').r(24, 13, 1, 8, 'G').p('E', [26, 16], [26, 17], [28, 14], [28, 15]);
  disk2.r(0, 1, 32, 13, 'E').r(1, 2, 30, 9, 'G').r(2, 2, 28, 1, 'H').r(5, 4, 12, 1, 'H').r(3, 7, 9, 1, 'F').r(14, 8, 14, 1, 'H').r(18, 5, 8, 1, 'F').r(1, 10, 30, 1, 'F').r(1, 11, 30, 2, 'E').r(3, 11, 26, 1, 'F');
  disk2.p('E', [0, 1], [31, 1], [0, 13], [31, 13]).rund(9, 6, 3, 'E', 'F').p('B', [8, 5], [9, 5], [8, 6], [10, 7]); // en skål med silver
  const disk3 = duk(32, 23); // ett tyg över disken, fransat nertill, och en balansvåg
  disk3.r(0, 0, 32, 11, 'E').planka(1, 1, 30, 4).planka(1, 5, 30, 5);
  disk3.r(5, 0, 22, 11, 'r').r(6, 1, 20, 9, 'R').r(5, 11, 22, 7, 'r').r(7, 1, 1, 17, 'Y').r(24, 1, 1, 17, 'Y'); for (let i = 5; i < 27; i += 2) disk3.p('r', [i, 18]).p('Y', [i, 19]);
  disk3.r(0, 11, 5, 9, 'E').r(1, 12, 3, 10, 'F').r(27, 11, 5, 9, 'E').r(28, 12, 3, 10, 'F').r(0, 20, 5, 3, 'E').r(27, 20, 5, 3, 'E').r(1, 12, 1, 9, 'G').r(28, 12, 1, 9, 'G');
  disk3.r(10, 5, 12, 1, 'k').rund(10, 5, 2, 'l', 'S').rund(21, 5, 2, 'l', 'S').r(15, 3, 2, 5, 'k'); // skålarna ovanifrån
  VAL.push({ id: 'f14_disk', namn: 'Disken', typ: 'tre', slag: ['station'], vad: 'Steg 14.1.6: disken, där företaget tar emot sina kunder. Två rutor bred, byggd av virke.', versioner: [
    visa('En hel front av stående plankor, och ett litet skrin på skivan.', disk1.rader()),
    visa('En tjock kluven stock på två stubbar, öppen under, med en skål silver.', disk2.rader()),
    visa('En bänk med ett rött vävt tyg hängt över framsidan och en balansvåg på.', disk3.rader()),
  ] });
  // ---------- varubordet ----------
  const varu1 = duk(32, 21); // ett brett fat med kant och fyra fack
  varu1.r(0, 0, 32, 15, 'E').r(1, 1, 30, 11, 'F').r(1, 1, 30, 1, 'H'); for (let i = 0; i < 4; i++) varu1.r(2 + i * 7 + (i > 1 ? 1 : 0), 3, 6, 8, 'G').r(2 + i * 7 + (i > 1 ? 1 : 0), 3, 6, 1, 'E');
  varu1.r(1, 12, 30, 2, 'F').r(1, 12, 30, 1, 'G'); for (const x of [2, 26]) varu1.r(x, 15, 4, 6, 'E').r(x + 1, 15, 2, 6, 'F');
  const varu2 = duk(32, 24); // två trappsteg
  varu2.r(1, 0, 30, 9, 'E').planka(2, 1, 28, 5).r(2, 6, 28, 2, 'F').r(0, 9, 32, 10, 'E').planka(1, 10, 30, 6).r(1, 16, 30, 2, 'F').r(0, 19, 32, 1, 'E'); for (const x of [1, 27]) varu2.r(x, 20, 4, 4, 'E').r(x + 1, 20, 2, 4, 'F');
  const varu3 = duk(32, 21); // en skiva på bockar med två korgar och plats mellan dem
  varu3.r(0, 2, 32, 11, 'E').planka(1, 3, 30, 4).planka(1, 7, 30, 5);
  for (const x of [2, 22]) { varu3.rund(x + 4, 6, 5, 'E', 'H').rund(x + 4, 6, 4, 'H', 'F').p('G', [x + 1, 4], [x + 4, 2], [x + 7, 4], [x + 8, 7], [x, 7]).rund(x + 4, 6, 2, 'E', 'E'); }
  varu3.r(0, 13, 32, 1, 'E'); for (const x of [3, 24]) { for (let i = 0; i < 7; i++) varu3.r(x + (i >> 1), 14 + i, 2, 1, 'F').r(x + 5 - (i >> 1) - 1, 14 + i, 1, 1, 'G'); }
  VAL.push({ id: 'f14_varubord', namn: 'Varubordet', typ: 'tre', slag: ['station'], vad: 'Steg 14.1.8: varubordet i affären, där ägaren ställer det som är till salu. Två rutor brett; varorna ligger på skivan och ritas ovanpå.', versioner: [
    visa('Ett grunt fat med hög kant och fyra fack.', varu1.rader()),
    visa('Två trappsteg, så att varorna bakom syns över de främre.', varu2.rader()),
    visa('En skiva på bockar, med en flätad korg i var ände och plats för varorna mellan dem.', varu3.rader()),
  ] });
})();
