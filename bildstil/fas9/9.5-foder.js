// fas 9, system 9.5: symbolen Föder (steg 9.5.29), tre versioner. Symbolen står över den som föder, i 16 punkter som de andra
// symbolerna över huvudet, på en mörk ruta som i spelet.
(() => {
  const L = { o: 'kol0', w: 'ben3', W: 'ben2', v: 'ben1', r: 'rost2', R: 'rost3', s: 'senap2', S: 'senap3', b: 'jord2' };
  const mork = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('kol', 1)); };
  const V = (text, rader) => ({ text, w: 18, h: 18, rita: B => { mork(B); ritaSprite(B, rader, L, 1, 1); } });
  VAL.push({ id: 'f9_foder', namn: 'Symbolen Föder', typ: 'tre', vad: 'Steg 9.5.29: förlossningen tar tid, och den som föder har en symbol över huvudet (i spelet en platshållare tills du valt). Här symbolen på en mörk ruta.', versioner: [
    V('Ett litet barn i en filt, inlindat.', [
      '.....oooo.......',
      '....owwwwo......',
      '...owSSSSwo.....',
      '...owSoSSwo.....',
      '...owSSSSwo.....',
      '..owwvSSvwwo....',
      '.owWwwvvwwWwo...',
      '.owWWwwwwWWwo...',
      '.owWWWWWWWWwo...',
      '..owWWWWWWwo....',
      '...oowwwwoo.....',
      '.....oooo.......',
    ]),
    V('En mor som håller ett nyfött barn mot bröstet.', [
      '.....oooo.......',
      '....orrrro......',
      '....orSSro......',
      '.....oSSo.......',
      '...ooRRRRoo.....',
      '..oRRwwwwRRo....',
      '..oRwSSSSwRo....',
      '..oRwSoSSwRo....',
      '..oRRwwwwRRo....',
      '...oRRRRRRo.....',
      '....oooooo......',
    ]),
    V('Ett hjärta med ett litet barn i, som en rund bild.', [
      '..ooo...ooo.....',
      '.oRRRo.oRRRo....',
      'oRRRRRoRRRRRo...',
      'oRRwwwwwwwRRo...',
      'oRwwSSSSwwRRo...',
      '.oRwSoSSwRRo....',
      '..oRwSSwRRo.....',
      '...oRwwRRo......',
      '....oRRRo.......',
      '.....oRo........',
      '......o.........',
    ]),
  ] });
})();
