// steg 8.3.14: ledarens mantel, tre versioner.
(() => {
  const { KORT, lagg, gras } = window.F7;
  const L = { a: 'rost1', b: 'rost2', c: 'rost3', d: 'jord1', e: 'jord2', f: 'senap3', g: 'ben3' };
  const PA = (rader, text) => ({ text, w: 24, h: 24, rita: B => { gras(B); lagg(B, rader, L, 4, 3, true); } });
  VAL.push(KORT('f8_mantel', 'Ledarens mantel', 'Steg 8.3.14: en mantel som byn gör åt ledaren när hen suttit en tidsålder och har mer än hälften av legitimiteten. Den värmer som en kappa, ger anseende och följer ämbetet till nästa ledare.', [
    PA(['....oooooooo....', '...occccccbbo...', '..occcccccbbbo..', '..occccfcccbbo..', '..occccccccbbo..', '.occccccccbbbbo.', '.occccccccbbbbo.', '.occcccccbbbbbo.', '.occcccccbbbbao.', '.oaaccccbbbbaao.', '..oooaaaaaaooo..', '.....oooooo.....'], 'En röd mantel med ett guldspänne vid halsen.'),
    PA(['....gggggggg....', '...ggggggggggo..', '..occcccccbbbo..', '..occccfcccbbo..', '..occccccccbbo..', '.occccccccbbbbo.', '.occccccccbbbbo.', '.occcccccbbbbbo.', '.occcccccbbbbao.', '.oaaccccbbbbaao.', '..oooaaaaaaooo..', '.....oooooo.....'], 'Samma mantel med en ljus pälskrage runt halsen.'),
    PA(['....oooooooo....', '...oeeeeeeddo...', '..oeeeeeeeddfo..', '..oeeeefeeddfo..', '..oeeeeeeeddfo..', '.oeeeeeeeeddffo.', '.oeeeeeeeeddffo.', '.oeeeeeeddddffo.', '.oeeeeeeddddffo.', '.ofddeeeddddffo.', '..offfddddfffo..', '.....oooooo.....'], 'En brun skinnmantel med en gul kant.'),
  ]));
})();
