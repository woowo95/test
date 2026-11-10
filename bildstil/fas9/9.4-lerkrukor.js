// fas 9, system 9.4: lerkrukan i tre storlekar (steg 9.4.11), tre versioner. Krukorna står på golvet, liten, mellanstor och stor
// bredvid varandra, i 16 punkter per ruta. Vätskan i dem kommer i 9.4.14.
(() => {
  const L = { o: 'kol0', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', k: 'kol1', x: 'skugga' };
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', y % 4 === 3 ? 0 : (Math.floor((x + (Math.floor(y / 4) % 2) * 7) / 14) % 2 ? 1 : 2))); };
  const V = (text, liten, mellan, stor) => ({ text, w: 52, h: 24, rita: B => { golv(B); ritaSprite(B, liten, L, 3, 24 - liten.length - 2); ritaSprite(B, mellan, L, 14, 24 - mellan.length - 2); ritaSprite(B, stor, L, 30, 24 - stor.length - 2); } });
  VAL.push({ id: 'f9_lerkrukor', namn: 'Lerkrukans tre storlekar', typ: 'tre', vad: 'Steg 9.4.11: lerkrukan är ett ting i tre storlekar, av 1, 2 och 4 lera, som byggs upp för hand, torkar och bränns i elden. Den lilla är kokkärlet för teet, den mellanstora bär vatten och saft och den stora rymmer vin, öl och tjära. Här liten, mellanstor och stor bredvid varandra.', versioner: [
    V('Rödbruna krukor med rund buk och smal hals, som pyntet du valde.', [
      '.oooo.', 'oussso', '.oktko', 'otssso', 'otsssr', '.orrro', '..xxx.',
    ], [
      '..oooo..', '.ouusso.', '..oktko.', '.otsssso', 'otssssso', 'otsssssr', 'otssssrr', '.orrrrr.', '..xxxx..',
    ], [
      '...oooooo...', '..ouusssso..', '...okkkkko..', '..otssssssso', '.otssssssssr', 'otsssssssssr', 'otssssssssrr', 'otssssssssrr', '.osssssssrro', '..orrrrrrro.', '...xxxxxxx..',
    ]),
    V('Ljusare bruna krukor med en mörk rand runt buken, som bränd lera.', [
      '.oooo.', 'odccdo', '.okkko', 'occcco', 'oaaaao', '.obbbo', '..xxx.',
    ], [
      '..oooo..', '.oddcco.', '..okkko.', '.occccco', 'oaaaaaao', 'occcccbo', 'ocbbbbbo', '.obbbbo.', '..xxxx..',
    ], [
      '...oooooo...', '..oddccccco.', '...okkkkko..', '..occcccccco', '.occccccccco', 'oaaaaaaaaaao', 'occcccccccbo', 'occcccccccbo', '.ocbbbbbbbbo', '..obbbbbbbo.', '...xxxxxxx..',
    ]),
    V('Låga och breda krukor med två öron att lyfta i, den stora med lock.', [
      '.oooo.', 'ousssoo', 'otsssro', 'otssrro', '.orrro.', '..xxx.',
    ], [
      '.oooooo.', 'oussssso', 'otssssro', 'otsssrro', 'otssrrro', '.orrrro.', '..xxxx..',
    ], [
      '....oooo....', '...oddddo...', '.oooooooooo.', 'oussssssssoo', 'otssssssssro', 'otssssssssro', 'otsssssssrro', 'otssssssrrro', '.orrrrrrrro.', '..xxxxxxxx..',
    ]),
  ] });
})();
