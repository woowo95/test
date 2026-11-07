// steg 7.2.12: symbolen för ett hus på filten vid ett husbyte, tre versioner. Huset är ingen sak, men ligger på filten som en bild.
(() => {
  const { KORT, former, rakt, poly, lagg, gras } = window.F7;
  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', e: 'senap1', f: 'senap2', g: 'senap3', r: 'rost1', s: 'rost2', t: 'rost3', K: 'kol1' };
  const fx = Math.floor;
  const PA = (rader, text) => ({ text, w: 24, h: 22, rita: B => { gras(B); lagg(B, rader, L, 4, 3, true); } });
  const VAGG = (x, y) => (fx(y) % 2 ? 'b' : 'c');
  VAL.push(KORT('f7_hus', 'Huset på filten', 'Steg 7.2.12: ett hus säljs genom samma byte som allt annat, och huset ligger som en symbol på filten, mitt emot betalningen. Det syns också i bytet när man trycker på filten.', [
    PA(former(16, 16, [[poly([[8, 1], [15, 7], [1, 7]]), (x, y) => y < 4 ? 'f' : x < 8 ? 'e' : 'r'], [rakt(3, 7, 13, 15), VAGG], [rakt(7, 10, 10, 15), 'o']]), 'En liten stuga rakt framifrån: halmtak och timmerväggar med en mörk dörr.'),
    PA(former(16, 16, [[poly([[8, 2], [16, 8], [0, 8]]), (x, y) => (fx(x) + fx(y)) % 3 ? 'd' : 'c'], [rakt(2, 8, 14, 15), VAGG], [rakt(4, 10, 7, 13), 'K'], [rakt(9, 10, 12, 15), 'o']]), 'En stuga med tak av trä, en glugg och en dörr.'),
    PA(former(16, 16, [[poly([[1, 6], [8, 1], [15, 3], [15, 7], [8, 9], [1, 9]]), (x, y) => y < 5 ? 'g' : 'f'], [rakt(1, 9, 8, 15), VAGG], [rakt(8, 9, 15, 15), (x, y) => (fx(y) % 2 ? 'a' : 'b')], [rakt(3, 11, 6, 15), 'o']]), 'Ett hus snett från sidan: gavel och långsida under ett halmtak.'),
  ]));
})();
