// fas 9, system 9.5: örtteet (steg 9.5.8), tre versioner. Teet kokas av rölleka och vatten i en liten lerkruka vid elden och står
// kvar i krukan; den som fryser eller är sjuk dricker det. Här krukan med teet i, på marken vid elden, i 16 punkter per ruta.
(() => {
  const L = { o: 'kol0', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', T: 'senap1', U: 'senap2', y: 'ben3', Y: 'ben2', g: 'oliv2', G: 'oliv3', w: 'ben1', x: 'skugga' };
  const mark = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', (x * 3 + y * 5) % 7 === 0 ? 1 : 2)); };
  const V = (text, rader) => ({ text, w: 20, h: 20, rita: B => { mark(B); ritaSprite(B, rader, L, 3, 2); } });
  VAL.push({ id: 'f9_orte', namn: 'Örtteet', typ: 'tre', vad: 'Steg 9.5.8: örtteet kokas av rölleka och vatten i en liten lerkruka vid elden, eller fortare och bättre i örtköket, och står kvar i krukan. Det värmer den som fryser och hjälper den sjuke att stå emot. Här den lilla krukan med teet i.', versioner: [
    V('Gulbrunt te i krukan med ånga som stiger.', [
      '....w..w....',
      '.....w..w...',
      '....w..w....',
      '..oooooooo..',
      '.ouTUUTUTuo.',
      '..otsssso...',
      '.otssssssro.',
      '.otsssssrro.',
      '..orrrrrro..',
      '...xxxxxx...',
    ]),
    V('Teet med ett vitt röllekablad som flyter, och ånga.', [
      '.....w.w....',
      '....w.w.....',
      '..oooooooo..',
      '.ouTUyYUTuo.',
      '..otsgsso...',
      '.otssssssro.',
      '.otsssssrro.',
      '..orrrrrro..',
      '...xxxxxx...',
    ]),
    V('En kruka med ett knippe rölleka bredvid och mörkare te.', [
      '..........yY',
      '..oooooo.yYg',
      '.ouTTTTuo.g.',
      '.otssssso.G.',
      'otssssssro..',
      'otsssssrro..',
      '.orrrrrro...',
      '..xxxxxx....',
    ]),
  ] });
})();
