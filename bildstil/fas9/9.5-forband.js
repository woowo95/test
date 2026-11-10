// fas 9, system 9.5: förbanden (steg 9.5.15), tre versioner av remsan och bennålen. Remsorna skärs två av ett skinn eller lintyg
// och läggs på såret, och ett stort sår sys med en nål av ben och en sena. Här en rulle remsor och nålen med senan, på trägolvet.
(() => {
  const L = { o: 'kol0', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', w: 'ben3', W: 'ben2', v: 'ben1', r: 'rost1', x: 'skugga' };
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', y % 4 === 3 ? 0 : (Math.floor((x + (Math.floor(y / 4) % 2) * 7) / 14) % 2 ? 2 : 1))); };
  const V = (text, remsa, nal) => ({ text, w: 36, h: 18, rita: B => { golv(B); ritaSprite(B, remsa, L, 2, 3); ritaSprite(B, nal, L, 20, 3); } });
  VAL.push({ id: 'f9_forband', namn: 'Remsan och bennålen', typ: 'tre', vad: 'Steg 9.5.15: förbanden. Remsor av skinn eller lin skyddar såret bättre än mossa, och ett stort sår sys med en nål av ben och en sena av den som kan läkekonst. Till vänster remsorna, till höger nålen.', versioner: [
    V('En rulle ljusa remsor av skinn, och en rak vit nål med en tråd av sena.',
      ['..oooooo...', '.oddddddo..', 'oddcccddo..', 'odcoooocdoo', 'odcowwocddo', 'oddcccddddo', '.oddddddoo.', '..oooooo...', '...xxxxx...'],
      ['..........o', '.........ow', '........owo', '.......owo.', '......owo..', '.....owo...', '..rrowo....', '.r..oo.....', 'r..........']),
    V('Remsor av lin, vikta i en hög, och en nål med ett öga och en lös sena.',
      ['ooooooooo.', 'owWwWwWwo.', 'oooooooooo', '.owWwWwWwo', '.oooooooo.', 'owWwWwWwo.', 'ooooooooo.', '.xxxxxxx..'],
      ['.........oo', '........owo', '.......owo.', '......owo..', '.....owo...', '....owo....', '...owo.rrr.', '..oo...r...', '......r....']),
    V('En utrullad remsa med en blodfläck, och en böjd nål som en krok.',
      ['ooooooooooo', 'occcdccccco', 'occrrcccdco', 'occcrcdccco', 'ooooooooooo', '.xxxxxxxxx.'],
      ['....ooo....', '...owwwo...', '..ow...wo..', '..o.....o..', '.........ow', '........owo', '..rrr..owo.', '.r...rowo..', '......oo...']),
  ] });
})();
