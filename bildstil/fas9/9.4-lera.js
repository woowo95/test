// fas 9, system 9.4: leran (steg 9.4.10), tre versioner. En klump lera som sak i förrådet och där den grävts vid stranden, på
// sanden i 16 punkter per ruta.
(() => {
  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', r: 'rost1', R: 'rost2', s: 'skiffer1', S: 'skiffer2', w: 'ben2', x: 'skugga' };
  const sand = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('senap', (x * 5 + y * 3) % 7 === 0 ? 1 : 2)); };
  const V = (text, rader) => ({ text, w: 20, h: 20, rita: B => { sand(B); ritaSprite(B, rader, L, 2, 3); } });
  VAL.push({ id: 'f9_lera', namn: 'Leran', typ: 'tre', vad: 'Steg 9.4.10: leran grävs vid stranden, rikast närmast vattnet, och fylls på när det regnar. Den ligger i förrådet som en klump, tio i en stack, och blir lerkrukor (9.4.11). Här på sanden vid stranden.', versioner: [
    V('En rundad brun klump med en blank fläck i toppen (som platshållaren i spelet).', [
      '....oooooo......',
      '..oobbccbboo....',
      '.obbcddcccbbo...',
      'obbbcccccbbbao..',
      'oabbbbbbbbbaao..',
      '.oaaabbbbaaao...',
      '..ooaaaaaaoo....',
      '....xxxxxx......',
    ]),
    V('En rödbrun klump där fingrarna gjort spår, och en liten bit som fallit av.', [
      '...ooooooo......',
      '.oorrRRRrroo....',
      'orrRrRRrRrrro...',
      'orrrrRrrRrrro...',
      'oarrrrrrrrraao..',
      '.oaaarrrraao..or',
      '..ooaaaaaao...oa',
      '....xxxxxx......',
    ]),
    V('Två grå klumpar av blå lera, våta och blanka, staplade på varandra.', [
      '.....oooo.......',
      '....oSwSSo......',
      '...osSSSsso.....',
      '..oooossooooo...',
      '.oSSwSSSSSsSo...',
      'osSSSSSSSSssso..',
      '.ossssssssssoo..',
      '..oooooooooo....',
    ]),
  ] });
})();
