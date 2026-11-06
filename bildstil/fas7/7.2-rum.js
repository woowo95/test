// 7.2 Rummen: samlingssalen (gillesalen), sedd som i spelet utan tak: timmerväggar, trägolv, långborden och scenen,
// och det nya: salen som helhet och den långa bänken vid långborden. Väggarna och golvet tas ur de godkända bilderna
// (timmerväggen och trägolvet), långborden och scenen likaså; bänken ritas här i tre utseenden.
(() => {
  const { KORT, rakt, och, former, lagg, bildfil } = window.F7;
  const R = 16;
  // en bit av en godkänd bild: (sx, sy, w, h) ur bilden till (dx, dy)
  const bit = (B, id, sx, sy, w, h, dx, dy) => { const o = BILDFILER[id]; if (!o) return; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = (o.rader[sy + y] || '')[sx + x], c = o.pal[ch]; if (!ch || ch === '.' || !c) continue; if (c.startsWith('rgba')) B.morka(dx + x, dy + y); else B.satt(dx + x, dy + y, B.P.fran(c)); } };
  // ett timmerhus tw × th rutor med övre vänstra hörnet i (x0, y0): golvet överallt, väggarna i ytterraden och dörren i nedre väggen
  function timmerhus(B, x0, y0, tw, th, dorr) {
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) bildfil(B, 'golv_tra', x0 + tx * R, y0 + ty * R);
    for (let tx = 1; tx < tw - 1; tx++) { bit(B, 'timmervagg', 16 + (tx % 2) * 16, 0, R, R, x0 + tx * R, y0); if (tx !== dorr) bit(B, 'timmervagg', 34 + (tx % 2) * 4, 48, R, R, x0 + tx * R, y0 + (th - 1) * R); }
    for (let ty = 1; ty < th - 1; ty++) { bit(B, 'timmervagg', 0, 16 + (ty % 2) * 16, R, R, x0, y0 + ty * R); bit(B, 'timmervagg', 48, 16 + (ty % 2) * 16, R, R, x0 + (tw - 1) * R, y0 + ty * R); }
    bit(B, 'timmervagg', 0, 0, R, R, x0, y0); bit(B, 'timmervagg', 48, 0, R, R, x0 + (tw - 1) * R, y0);
    bit(B, 'timmervagg', 0, 48, R, R, x0, y0 + (th - 1) * R); bit(B, 'timmervagg', 48, 48, R, R, x0 + (tw - 1) * R, y0 + (th - 1) * R);
    // dörrposterna på båda sidor om öppningen
    for (const dx of [-2, R]) for (let y = 2; y < 14; y++) B.satt(x0 + dorr * R + dx + (dx < 0 ? 0 : 0), y0 + (th - 1) * R + y, B.P.i('ben', y % 3 ? 1 : 0)), B.satt(x0 + dorr * R + dx + 1, y0 + (th - 1) * R + y, B.P.i('ben', 0));
  }

  // ---------- bänken ----------
  // på bredden (h): sitsen ovanifrån, framkanten och benen under; på höjden (v): sitsen ovanifrån och änden närmast oss
  const BANKAR = [
    { // 1: en tjock planka på två par ben
      namn: 'planka',
      h: n => former(n, 9, [[rakt(0, 0, n, 4), (x, y) => y < 1 ? 'T' : Math.floor(x) % 24 === 23 ? 't' : 'S'], [rakt(0, 4, n, 6), (x, y) => y < 5 ? 'F' : 'f'], [och(rakt(2, 6, 4, 9), rakt(n - 4, 6, n - 2, 9), rakt(n / 2 - 1, 6, n / 2 + 1, 9)), 'f']]),
      v: n => former(8, n + 4, [[rakt(0, 0, 8, n), (x, y) => x < 1 ? 'T' : x > 6 ? 'F' : Math.floor(y) % 24 === 23 ? 't' : 'S'], [rakt(0, n, 8, n + 2), (x, y) => y < n + 1 ? 'F' : 'f'], [och(rakt(1, n + 2, 3, n + 4), rakt(5, n + 2, 7, n + 4)), 'f']]),
      legend: { T: 'jord3', S: 'jord2', t: 'jord1', F: 'jord1', f: 'jord0' },
    },
    { // 2: en kluven stock med den flata sidan upp, på två stubbar
      namn: 'halvstock',
      h: n => former(n, 10, [[och(rakt(3, 6, 8, 10), rakt(n - 8, 6, n - 3, 10)), (x, y) => y < 7 ? 'r' : x % 5 < 1.5 ? 'k' : 'K'], [rakt(0, 0, n, 4), (x, y) => y < 1 ? 'L' : (Math.floor(x) * 7 + Math.floor(y) * 3) % 19 === 0 ? 'S' : 'l'], [rakt(0, 4, n, 7), (x, y) => y < 5 ? 'K' : y < 6 ? 'k' : 'm'], [och(rakt(0, 0, 1.5, 7), rakt(n - 1.5, 0, n, 7)), (x, y) => y < 2 ? 'R' : 'r']]),
      v: n => former(9, n + 5, [[rakt(0, 0, 9, n), (x, y) => x < 1 ? 'L' : x > 6.5 ? (x > 7.5 ? 'm' : 'k') : (Math.floor(y) * 7 + Math.floor(x) * 3) % 19 === 0 ? 'S' : 'l'], [rakt(0, n, 9, n + 3), (x, y) => (Math.floor(x) + Math.floor(y)) % 3 === 0 ? 'r' : 'R'], [och(rakt(1, n + 3, 3.5, n + 5), rakt(5.5, n + 3, 8, n + 5)), 'K']]),
      legend: { L: 'ben3', l: 'ben2', S: 'ben1', K: 'jord1', k: 'jord0', m: 'kol1', R: 'jord3', r: 'jord2' },
    },
    { // 3: en hel, rund stock med barken kvar, på två klossar
      namn: 'stock',
      h: n => former(n, 11, [[och(rakt(4, 7, 9, 11), rakt(n - 9, 7, n - 4, 11)), (x, y) => y < 8 ? 'k' : 'K'], [rakt(0, 0, n, 8), (x, y) => y < 1.5 ? 'L' : y > 6 ? 'm' : (Math.floor(x) * 5 + Math.floor(y) * 11) % 13 === 0 ? 'k' : y < 3.5 ? 'l' : 'K'], [och(rakt(0, 0.5, 2, 7.5), rakt(n - 2, 0.5, n, 7.5)), (x, y) => Math.abs(y - 4) < 1 ? 'r' : 'R']]),
      v: n => former(8, n + 6, [[rakt(0, 0, 8, n), (x, y) => x < 1.5 ? 'L' : x > 6 ? 'm' : (Math.floor(y) * 5 + Math.floor(x) * 11) % 13 === 0 ? 'k' : x < 3.5 ? 'l' : 'K'], [rakt(0, n, 8, n + 6), (x, y) => Math.abs(x - 3.8) < 1 && Math.abs(y - n - 3) < 1 ? 'r' : Math.hypot(x - 4, y - n - 3) < 2.4 ? 'R' : 'r']]),
      legend: { L: 'jord3', l: 'jord2', K: 'jord1', k: 'jord0', m: 'kol1', R: 'ben2', r: 'ben1' },
    },
  ];
  // skuggan faller nedåt till höger (ljuset uppifrån vänster): golvet under saken mörknar innan saken ritas
  const skugga = (B, x, y, w, h) => { for (let yy = y + 2; yy < y + h + 2; yy++) for (let xx = x + 2; xx < x + w + 2; xx++) B.morka(xx, yy); };
  const bank = (B, typ, rikt, n, x, y) => { const b = BANKAR[typ], r = b[rikt](n); skugga(B, x, y, r[0].length, r.length); lagg(B, r, b.legend, x, y); };
  const mobel = (B, id, x, y) => { const o = BILDFILER[id]; if (o) skugga(B, x, y, o.w, o.h); bildfil(B, id, x, y); };

  // ---------- salen ----------
  // 13 × 10 rutor; insidan är rutorna 1–11 × 1–8. Allt ritas uppifrån och ner, så att det som står längre fram hamnar framför
  const TW = 13, TH = 10, M = 4;
  const MOBLERING = [
    // 1: två långbord på längden med bänkar på båda sidor, scenen vid ena kortväggen
    (B, typ, o) => {
      const s = BILDFILER.scen_v; mobel(B, 'scen_v', o.x + 12 * R - s.w - 2, o.y + R + (8 * R - s.h) / 2);
      for (const ty of [20, 84]) {
        bank(B, typ, 'h', 96, o.x + 28, o.y + ty);
        mobel(B, 'bord3', o.x + 28, o.y + ty + 10); mobel(B, 'bord3', o.x + 76, o.y + ty + 10);
        bank(B, typ, 'h', 96, o.x + 28, o.y + ty + 48);
      }
    },
    // 2: borden i en hästsko som öppnar sig mot scenen, med golvet fritt i mitten; bänkarna på insidan
    (B, typ, o) => {
      const s = BILDFILER.scen_v; mobel(B, 'scen_v', o.x + R + 4, o.y + R + (8 * R - s.h) / 2);
      mobel(B, 'bord3', o.x + 56, o.y + 18); mobel(B, 'bord3', o.x + 104, o.y + 18);
      bank(B, typ, 'h', 80, o.x + 60, o.y + 56);
      bank(B, typ, 'v', 30, o.x + 134, o.y + 60);
      mobel(B, 'bord3_v', o.x + 146, o.y + 52);
      bank(B, typ, 'h', 80, o.x + 60, o.y + 92);
      mobel(B, 'bord3', o.x + 56, o.y + 104); mobel(B, 'bord3', o.x + 104, o.y + 104);
    },
    // 3: ett enda långt bord genom salen fram mot scenen, bänkar på båda sidor och fasta bänkar längs väggarna
    (B, typ, o) => {
      const s = BILDFILER.scen_v; mobel(B, 'scen_v', o.x + 12 * R - s.w - 2, o.y + R + (8 * R - s.h) / 2);
      bank(B, typ, 'h', 128, o.x + 20, o.y + 18);
      bank(B, typ, 'h', 144, o.x + 4 + R - 4, o.y + 46);
      for (const dx of [0, 48, 96]) mobel(B, 'bord3', o.x + 16 + dx, o.y + 56);
      bank(B, typ, 'h', 144, o.x + 12, o.y + 94);
      bank(B, typ, 'h', 128, o.x + 20, o.y + 128);
    },
  ];
  const sal = (text, mob, typ) => ({ text, w: TW * R + 2 * M, h: TH * R + 2 * M, rita: (B) => {
    const o = { x: M, y: M };
    timmerhus(B, o.x, o.y, TW, TH, 6);
    MOBLERING[mob](B, typ, o);
  } });
  // bänkarna ensamma, på bredden och på höjden, intill ett långbord
  const bankar = (text, typ) => ({ text, w: 128, h: 80, rita: (B) => {
    for (let ty = 0; ty < 5; ty++) for (let tx = 0; tx < 8; tx++) bildfil(B, 'golv_tra', tx * R, ty * R);
    bank(B, typ, 'h', 48, 6, 6); mobel(B, 'bord3', 6, 16); bank(B, typ, 'h', 48, 6, 54);
    bank(B, typ, 'v', 48, 70, 8); bank(B, typ, 'v', 24, 88, 8); bank(B, typ, 'h', 24, 100, 10);
  } });

  VAL.push(KORT('f7_samlingssal', 'Samlingssalen', 'Steg 7.2.7: samlingssalen, där byn äter tillsammans, håller gille och ser på det som framförs, sedd som i spelet utan tak: timmerväggar, trägolv, långborden och scenen. Det nya är salen som helhet och den långa bänken vid långborden. Varje version möblerar salen på sitt sätt och har sin egen bänk; under salen bänken ensam vid ett långbord, på bredden och på höjden.', [
    sal('Två långbord på längden med bänkar på båda sidor och scenen vid kortväggen. Bänken är en tjock planka på två par ben.', 0, 0),
    sal('Borden i en hästsko som öppnar sig mot scenen, med golvet fritt i mitten för dans och lekar. Bänken är en kluven stock med den flata sidan upp, på två stubbar.', 1, 1),
    sal('Ett enda långt bord genom salen fram mot scenen, med bänkar på båda sidor och fasta bänkar längs väggarna. Bänken är en hel, rund stock med barken kvar, på två klossar.', 2, 2),
  ]));
  VAL.push(KORT('f7_sal_bank', 'Bänken i samlingssalen', 'Steg 7.2.7: den långa bänken vid långborden, ensam: på bredden framför och bakom ett långbord, och på höjden. Samma tre bänkar som i salens tre versioner.', [
    bankar('En tjock planka på två par ben.', 0),
    bankar('En kluven stock med den flata sidan upp, på två stubbar.', 1),
    bankar('En hel, rund stock med barken kvar, på två klossar.', 2),
  ]));
})();
