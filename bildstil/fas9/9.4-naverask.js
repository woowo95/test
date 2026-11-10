// fas 9, system 9.4: näveraskan (steg 9.4.13), tre versioner. En liten ask av näver som viks och sys ihop med rep, där salvan och
// benlimmet förvaras (9.4.14). På trägolvet i 16 punkter per ruta, med en öppen yta där innehållet syns.
(() => {
  const L = { o: 'kol0', w: 'ben3', W: 'ben2', v: 'ben1', b: 'jord1', c: 'jord2', d: 'jord3', a: 'jord0', k: 'kol1', i: 'oliv2', x: 'skugga' };
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', y % 4 === 3 ? 0 : (Math.floor((x + (Math.floor(y / 4) % 2) * 7) / 14) % 2 ? 1 : 2))); };
  const V = (text, rader) => ({ text, w: 20, h: 18, rita: B => { golv(B); ritaSprite(B, rader, L, 2, 3); } });
  VAL.push({ id: 'f9_naverask', namn: 'Näveraskan', typ: 'tre', vad: 'Steg 9.4.13: en liten ask av näver och rep, som görs för hand eller fortare och bättre vid slöjdbänken. Salvan och benlimmet förvaras i den (9.4.14), och innehållet syns i den öppna ytan (här grön salva).', versioner: [
    V('En rund ask av vit näver med mörka streck, sydd med rep upptill.', [
      '..oooooooooo..',
      '.oWkkikkikkWo.',
      'owwvwwvwwvwwwo',
      'owkwwwwkwwwwko',
      'owwwwkwwwwwkwo',
      'oWwwwwwwwwwwvo',
      '.oWvvvvvvvvWo.',
      '..oooooooooo..',
      '...xxxxxxxx...',
    ]),
    V('En fyrkantig ask med vikta hörn och ett lock som ligger bredvid.', [
      'oooooooo.......',
      'okiikiko.oooooo',
      'owwwwwwo.owWwWo',
      'owkwwkwo.oooooo',
      'owwwwwwo.......',
      'owWwwWwo.......',
      'oooooooo.......',
      '.xxxxxxx.......',
    ]),
    V('En hög ask med rep runt midjan och en flätad kant.', [
      '..oooooo..',
      '.okiiiiko.',
      'owWwWwWwWo',
      'owwwwwwwwo',
      'obcbcbcbco',
      'owwwkwwwwo',
      'owkwwwwkwo',
      '.oWwwwwWo.',
      '..oooooo..',
      '...xxxx...',
    ]),
  ] });
})();
