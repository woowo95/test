// steg 8.2.3: den avhuggna kroppsdelen, en gemensam bild för alla delar (i texten står vems den är).
(() => {
  const { KORT, lagg, gras } = window.F7;
  const L = { h: 'rost3', H: 'rost2', r: 'rost1', R: 'rost0', b: 'ben3' };
  const PA = (rader, text) => ({ text, w: 24, h: 16, rita: B => { gras(B); lagg(B, rader, L, 4, 4, true); } });
  VAL.push(KORT('f8_kroppsdel', 'Den avhuggna kroppsdelen', 'Steg 8.2.3: en förlorad kroppsdel blir en sak på marken med ägarens namn och delen ("Häggs vänstra hand"). Den ruttnar som maten. Samma bild för alla delar.', [
    PA(['................', '...oooooo.......', '..ohhhhhhooo....', '..ohhhhhhhhrbo..', '..oHhhhhHHHrbo..', '...oHHHHoooo....', '....oooo........'], 'En bit av en arm eller ett ben, med benet synligt i änden.'),
    PA(['.......oo.oo....', '......ohohoho...', '..oo.ohhohhoho..', '.ohho.ohhhhhho..', '.oHhhohhhhhHo...', '..oHHhhhHHHo.Rr.', '...oooooooo.rR..'], 'En hand med fingrarna utåt, och lite blod bredvid.'),
    PA(['................', '......oooo......', '....oohhhhoo....', '...ohhhhhhhho...', '...oHhhhHrrrbo..', '....oHHHHrRRo...', '.....oooooo.....'], 'Något otydligt och rött, en klump man inte vill titta på länge.'),
  ]));
})();
