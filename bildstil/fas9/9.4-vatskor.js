// fas 9, system 9.4: vätskorna i behållarna (steg 9.4.14), tre versioner av hur ytan syns. Varje behållare ritas en gång med en yta
// där vätskan syns, och vätskans färg fyller ytan: vattnet blått, tjäran svart, salvan grön och limmet ljust. Här en mellanstor
// lerkruka med vatten, en stor med tjära, en näverask med salva och en med lim, och en tom kruka.
(() => {
  const BAS = { o: 'kol0', r: 'rost0', s: 'rost1', t: 'rost2', u: 'rost3', w: 'ben3', W: 'ben2', v: 'ben1', k: 'kol1', x: 'skugga' };
  const YTA = [['skiffer', 2], ['kol', 1], ['oliv', 2], ['ben', 2], null]; // vatten, tjära, salva, lim, tom
  const golv = B => { for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) B.satt(x, y, B.P.i('jord', y % 4 === 3 ? 0 : (Math.floor((x + (Math.floor(y / 4) % 2) * 7) / 14) % 2 ? 1 : 2))); };
  const kruka = (yta) => ['.oooooo.', 'ou' + yta + 'u', 'otsssso', 'otsssso', 'otsssrro', '.orrrro.', '..xxxx..'].map(r => r.length < 8 ? r.padEnd(8, '.') : r);
  const ask = (yta) => ['oooooooo', 'oW' + yta + 'Wo', 'owwkwwwo', 'owwwwkwo', '.oooooo.', '.xxxxxx.'];
  const rita = (B, v) => {
    golv(B);
    const ytor = YTA.map((f, i) => f ? (v === 0 ? 'VVVV' : v === 1 ? 'VvVV' : 'VVVo') : 'kkkk');
    const sprites = [kruka(ytor[0]), kruka(ytor[1]), ask(ytor[2]), ask(ytor[3]), kruka(ytor[4])];
    sprites.forEach((sp, i) => { const f = YTA[i], L = { ...BAS, V: f ? f[0] + f[1] : 'kol1', v: f ? f[0] + Math.min(3, f[1] + 1) : 'kol1' }; ritaSprite(B, sp, L, 2 + i * 11, 6); });
  };
  VAL.push({ id: 'f9_vatskor', namn: 'Vätskorna i behållarna', typ: 'tre', vad: 'Steg 9.4.14: en vätska finns bara i en behållare. Behållaren ritas en gång med en yta där vätskan syns, och vätskans färg fyller ytan; en tom behållare visas mörk. Från vänster: vatten i en lerkruka, tjära, salva och lim i näveraskar, och en tom kruka.', versioner: [
    { text: 'Ytan fyller hela öppningen i en jämn färg.', w: 58, h: 18, rita: B => rita(B, 0) },
    { text: 'Ytan har en ljus glans, som när vätskan blänker.', w: 58, h: 18, rita: B => rita(B, 1) },
    { text: 'Ytan fyller bara en del av öppningen, så att kanten syns innanför.', w: 58, h: 18, rita: B => rita(B, 2) },
  ] });
})();
