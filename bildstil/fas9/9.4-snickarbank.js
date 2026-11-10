// fas 9, system 9.4: snickarbänken (steg 9.4.4), tre versioner. En station av 2 virke och 2 plankor som står inne som
// slöjdbänken, två rutor bred, med en sittplats (stubben framför). Framifrån och lite ovanifrån, på trägolvet, 16 punkter per ruta.
(() => {
  const { hash, KORT, former, linje, och, rakt, lagg } = window.F7;
  const L = { a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', K: 'kol1', l: 'kol2', R: 'skiffer1', S: 'skiffer2', T: 'skiffer3', w: 'ben1', x: 'ben2', y: 'ben3', s: 'rost1', t: 'rost2' };
  const fx = Math.floor;
  const sp = (B, rader, x, y, skugga = true) => lagg(B, rader, L, x, y, skugga);
  const MED = rader => { const w = Math.max(...rader.map(r => r.length)); return former(w + 2, rader.length + 2, [[(x, y) => (rader[fx(y) - 1] || '')[fx(x) - 1] > '.', (x, y) => rader[fx(y) - 1][fx(x) - 1]]]); };
  // trägolvet inne: plankor i rader
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', y % 4 === 3 ? 0 : (fx((x + (fx(y / 4) % 2) * 7) / 14) % 2 ? 1 : 2))); };
  // bänkskivan av tjocka plankor på fyra ben; len punkter lång
  const bank = (len, hojd, s, skiva = 4) => former(len + 2, skiva + hojd + 3, [
    [rakt(1, 1, len + 1, 1 + skiva), (x, y) => fx(y) === 1 ? 'd' : (fx(y - 1) % 2 && hash(fx(x / 4), fx(y), s) < 0.6) ? 'b' : 'c'],
    [rakt(1, 1 + skiva, len + 1, 2 + skiva), 'a'],
    [och(rakt(2, 2 + skiva, 4, 3 + skiva + hojd), rakt(len - 2, 2 + skiva, len, 3 + skiva + hojd), rakt(len / 2 - 1, 2 + skiva, len / 2 + 1, 3 + skiva + hojd)), x => fx(x) % 2 ? 'a' : 'b'],
  ]);
  const STUBBE = MED(['.dccd.', 'dcbbcd', 'bccccb', 'abbbba', '.aaaa.']);
  const YXA = MED(['RS..', 'TSRb', '.Rb.', '..b.', '..a.']);
  const HYVEL = MED(['..d...', 'bccccb', 'abbbba']);
  const SPANAR = MED(['y.y.y.y', 'xyxyxyx']); // spån som ligger på bänken
  const KNIV = MED(['TTSRa', '...aa']);
  const SKRUV = MED(['aa', 'bb', 'ab', 'bb', 'aa']); // ett trästycke som spänner fast arbetet
  const rita = (B, v) => {
    golv(B);
    if (v === 0) { // en lång bänk av två plankor med en yxa och spån på skivan och stubben framför
      sp(B, bank(30, 8, 1), 1, 6); sp(B, YXA, 4, 1, false); sp(B, SPANAR, 14, 4, false); sp(B, KNIV, 23, 4, false);
      sp(B, STUBBE, 12, 21);
    } else if (v === 1) { // en tung bänk med en skruv i ena änden, ett trästycke fastspänt och hyveln bredvid
      sp(B, bank(30, 7, 2, 5), 1, 7); sp(B, SKRUV, 26, 2, false); sp(B, MED(['cccccccccc', 'bbbbbbbbbb']), 15, 4, false);
      sp(B, HYVEL, 5, 4, false); sp(B, STUBBE, 11, 22);
    } else { // en låg bänk på kraftiga ben med en hylla under där verktygen ligger
      sp(B, bank(30, 9, 3), 1, 5);
      sp(B, former(28, 3, [[rakt(0, 0, 28, 2), (x) => fx(x / 5) % 2 ? 'b' : 'c']]), 3, 15, false);
      sp(B, MED(['TSa', '.aa']), 6, 12, false); sp(B, MED(['xyx', 'yxy']), 16, 12, false);
      sp(B, MED(['ss', 'tt', 'ss']), 23, 1, false); sp(B, SPANAR, 9, 3, false);
      sp(B, STUBBE, 12, 22);
    }
  };
  const V = (text, v) => ({ text, w: 34, h: 30, rita: B => rita(B, v) });
  VAL.push(
    KORT('f9_snickarbank', 'Snickarbänken', 'Steg 9.4.4: en stadig bänk av 2 virke och 2 plankor där träsakerna görs fortare och bättre, och där bågen, lyran, skölden, kryckan och träbenet görs. Den står inne som slöjdbänken, två rutor bred, med en stubbe att sitta på framför. Snickaren arbetar där. I spelet har den slöjdbänkens bild tills du valt.', [
      V('En lång bänk av två plankor med yxan, kniven och spån på skivan.', 0),
      V('En tung bänk med en skruv i ena änden som håller ett trästycke, och hyveln bredvid.', 1),
      V('En låg bänk på kraftiga ben med en hylla under där verktygen ligger.', 2),
    ]),
  );
})();
