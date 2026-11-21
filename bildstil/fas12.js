// fas 12: gränssnittets bilder som kom med fas 12.
// Bandet överst i Seder (steg 12.1.35): flätan går från panelens ena kant till den andra, som bandet i Styre, utan
// ormhuvudena en bit in och utan den raka remsan bakom och utanför flätan. Flätan upprepas utåt från medaljongen (en bit
// på 53 punkter ur det nuvarande bandet), och höger sida är vänster speglad. Visas på panelens beige, 240 punkter brett
(() => {
  const BAND = {"rader":["....................................................................................................................aaaaaaaa....................................................................................................................","..................................................................................................................aaaa....aaaa..................................................................................................................","................................................................................................................aaa.bbccccbb.aaa................................................................................................................","...............................................................................................................aa.bcaaaaaaaabbbaa...............................................................................................................","..............................................................................................................aa.caaa......aaabbaa..............................................................................................................","..........aaaa.......................aaaa......................aaaa.......................aaaa...............aa.caa..........aabbaa...............aaaa.......................aaaa......................aaaa.......................aaaa..........","........aaddddaa...................aaddddaa..................aaddddaa...................aaddddaa.............a.caa............aabba.............aaddddaa...................aaddddaa..................aaddddaa...................aaddddaa........","aa.....adddeedddaa....aaaaaaa....aadddeeddda.....aaaaaa.....adddeedddaa....aaaaaaa....aadddeeddda.....aaaaaaaabaa.......f......aabaaaaaaaa.....adddeedddaa....aaaaaaa....aadddeeddda.....aaaaaa.....adddeedddaa....aaaaaaa....aadddeeddda.....aa","bbaa..adddeeededdaa..abbcccbba..aaddedeeeddda..aabbccbbaa..adddeeededdaa..abbcccbba..aaddedeeeddda..aabbccbbaaca....fffffffff...abbabbccbbaa..adddeeededdaa..abbcccbba..aaddedeeeddda..aabbccbbaa..adddeeededdaa..abbcccbba..aaddedeeeddda..aabb","ccbaaaddedffffeeedaaabccaaaccbaaadeeeffffdeddaaabccaaccbaaaddedffffeeedaaabccaaaccbaaadeeeffffdeddaaabccaaaaabaa....f...f...f...aabaaaaaccbaaaddedffffeeedaaabccaaaccbaaadeeeffffdeddaaabccaaccbaaaddedffffeeedaaabccaaaccbaaadeeeffffdeddaaabcc","aacbaddeffaaaaffeddabcaa...aacbaddeffaaaaffeddabcaa..aacbaddeffaaaaffeddabcaa...aacbaddeffaaaaffeddabcaa...aabaaa..f.f..f..f.f.aaabaa...aacbaddeffaaaaffeddabcaa...aacbaddeffaaaaffeddabcaa..aacbaddeffaaaaffeddabcaa...aacbaddeffaaaaffeddabcaa",".aacbdeffa....affddbcaa.....aacbddffa....affedbcaa....aacbdeffa....affddbcaa.....aacbddffa....affedbcaa....aacabeaf...f.f.f...febabba....aacbdeffa....affddbcaa.....aacbddffa....affedbcaa....aacbdeffa....affddbcaa.....aacbddffa....affedbcaa.","..aacdffa......affecaaa.....aaaceffa......affdcaa......aacdffa......affecaaa.....aaaceffa......affdcaa.....aacaceffffff.f.fffffecaaca.....aacdffa......affecaaa.....aaaceffa......affdcaa......aacdffa......affecaaa.....aaaceffa......affdcaa..",".addaffaa......aaffaadaa...aadaaffaa......aaffadda....addaffaa......aaffaadaa...aadaaffaa......aaffadda....aacaafa.fff..f..fffafaadca....addaffaa......aaffaadaa...aadaaffaa......aaffadda....addaffaa......aaffaadaa...aadaaffaa......aaffadda.","addeffabba....abbafaeddaaaaaddeafabba....abbaffeddaaaaddeffabba....abbafaeddaaaaaddeafabba....abbaffeddaaaaadbaffa......f.....affaecaaaaaddeffabba....abbafaeddaaaaaddeafabba....abbaffeddaaaaddeffabba....abbafaeddaaaaaddeafabba....abbaffedda","ddeffaaccbaaaabbcaaffdedddddedffaacbbaaaabccaaffeddddddeffaaccbaaaabbcaaffdedddddedffaacbbaaaabccaaffedddddaabafa.......f......afabaadddddeffaaccbaaaabbcaaffdedddddedffaacbbaaaabccaaffeddddddeffaaccbaaaabbcaaffdedddddedffaacbbaaaabccaaffedd","edffa..aacbbbbcca..affeeedeeeffa..accbbbbcaa..affdeeeedffa..aacbbbbcca..affeeedeeeffa..accbbbbcaa..affdeeedaabaa......fffff.....aabaadeeedffa..aacbbbbcca..affeeedeeeffa..accbbbbcaa..affdeeeedffa..aacbbbbcca..affeeedeeeffa..accbbbbcaa..affde","effa....aaaccaaa....affeedeeffa....aaaccaaa....affeeeeffa....aaaccaaa....affeedeeffa....aaaccaaa....affeeedfabba.....fffffff....aacafdeeeffa....aaaccaaa....affeedeeffa....aaaccaaa....affeeeeffa....aaaccaaa....affeedeeffa....aaaccaaa....affe","faa........aaa.......aafffffaa.......aaa........aaffffaa........aaa.......aafffffaa.......aaa........aafffffaabaa..............aabaafffffaa........aaa.......aafffffaa.......aaa........aaffffaa........aaa.......aafffffaa.......aaa........aaf","a......................aaaaa......................aaaa......................aaaaa......................aaaaa.abbaa............aa.ca.aaaaa......................aaaaa......................aaaa......................aaaaa......................a",".............................................................................................................aabbaa..........aa.caa.............................................................................................................","..............................................................................................................aabbaaa......aaa.caa..............................................................................................................","...............................................................................................................aabb.aaaaaaaa.bcaa...............................................................................................................","................................................................................................................aaabbb....bbcaaa................................................................................................................","..................................................................................................................aaaaccccaaaa..................................................................................................................","....................................................................................................................aaaaaaaa...................................................................................................................."],"pal":{"a":"#24201d","b":"#d8b25f","c":"#b2921b","d":"#8a9c9e","e":"#61767a","f":"#3e5156","g":"#a14808"}};
  const PANEL = (B, P, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) B.satt(x, y, P.i('ben', 3)); };
  const RITA = (B, P, rader, pal, x0, y0) => rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') B.satt(x0 + x, y0 + y, P.av(pal[ch])); }));
  const nu = GUI.band.seder;
  VAL.push({ id: 'f12_sederband', namn: 'Bandet överst i Seder', typ: 'janej', vad: 'Steg 12.1.35: bandet överst i Seder ritas om. Flätan går nu från panelens ena kant till den andra, som bandet i Styre, utan ormhuvudena en bit in och utan den raka remsan som syntes bakom flätan och utanför den. Överst bandet som det är i spelet i dag (med remsan ut till kanterna), under det det nya, båda på panelens bredd.', versioner: [
    { text: 'Överst i dag: ormhuvudena och den raka remsan ut till kanterna. Under: flätan hela vägen ut till panelens kanter, utan huvuden och utan remsa.', w: 240, h: 60, rita: (B, P) => {
      PANEL(B, P, 240, 60);
      const [bf, bk] = [nu.pal.d, nu.pal.a];
      for (let x = 0; x < 240; x++) for (let y = 9; y < 17; y++) B.satt(x, y + 1, P.av(y === 9 || y === 16 ? bk : bf));
      for (let y = 0; y < nu.rader.length; y++) for (let x = 0; x < 180; x++) { const ch = nu.rader[y][x]; if (ch !== '.') B.satt(30 + x, y + 1, P.av(nu.pal[ch])); }
      RITA(B, P, BAND.rader, BAND.pal, 0, 32);
    } },
  ] });
})();

// fas 12: järngruvan på världskartan (steg 12.2.13). En plats i bergen dit ett sällskap reser och bryter malm, som
// silvergruvan. 16 × 16 punkter per ruta som spelets världskarta, i dess färger (TECKENPAL i src/ui/varldbild.ts), på marken
// mellan ett träd och ett berg ur spelet. Ritad av programmeringschatten (världskartans tecken har ingen sort i API:ts register).
(() => {
  const L = { k: 'kol0', K: 'kol3', j: 'jord1', J: 'jord2', l: 'jord3', y: 'senap3', Y: 'senap1', r: 'rost2', R: 'rost1', g: 'oliv1', G: 'oliv3', b: 'barr1', B: 'barr3', d: 'skiffer1', s: 'skiffer2', S: 'skiffer3', w: 'ben3', W: 'ben1' };
  const TRAD = ['', '', '', '......GGG', '....GGGGGgg', '...GGGGGgggg', '...GGGGgggggg', '....GGgggggg', '.....gggggg', '.......jj', '.......jj', '......kjjk'];
  const BERG = ['', '', '.......kk', '......kwwk', '.....kwwSdk', '....kSSSSddk', '...kSSSSdddk', '...kSSSdddddk', '..kSSSSddddddk', '..kSSSddddddddk', '.kkkkkkkkkkkkkk'];
  const PA_KARTAN = (text, rader) => ({ text, w: 56, h: 24, rita: (B) => {
    const g = B.P.i('oliv', 2); for (let y = 0; y < 24; y++) for (let x = 0; x < 56; x++) B.satt(x, y, g);
    ritaSprite(B, TRAD, L, 4, 4); ritaSprite(B, rader, L, 20, 4); ritaSprite(B, BERG, L, 36, 4);
  } });
  VAL.push({ id: 'f12_jarngruva', namn: 'Järngruvan på världskartan', typ: 'tre', slag: [], vad: 'Steg 12.2.13: järngruvan är en plats i bergen på världskartan, dit ett sällskap reser, bryter malm och bär hem den. I spelet är den nu silvergruvans hål med rostbrun malm. Bilden visar den mellan ett träd och ett berg ur spelet, i världskartans storlek.', versioner: [
    PA_KARTAN('En bergsknalle med en timrad gruvöppning, två stolpar och en överliggare av trä, och en hög rostbrun malm framför.', [
      '', '',
      '......kkkk......',
      '.....kSSSSk.....',
      '....kSSSdSSk....',
      '...kSSddSSdSk...',
      '..kSSdJJJJJdSk..',
      '..kSdJkkkkJddk..',
      '.kSSdJkkkkJdSdk.',
      '.kSddJkkkkJddkk.',
      'kSSddJkkkkJdkrrk',
      'kSdddJkkkkJkrRrk',
      'kkkkkkkkkkkrRrRk',
      '...........kkkk.',
    ]),
    PA_KARTAN('Ett dagbrott sett uppifrån: en rund grop i berget med avsatser som trappsteg, och rostbrun malm i botten.', [
      '', '',
      '....kkkkkkkk....',
      '..kkSSSSSSSSkk..',
      '.kSSddddddddSSk.',
      'kSSdkkkkkkkkdSSk',
      'kSdkJJJJJJJJkdSk',
      'kSdkJrrRrrRJkdSk',
      'kSdkJrRrrRrJkdSk',
      'kSSdkJJJJJJkdSSk',
      '.kSSdkkkkkkdSSk.',
      '..kkSSddddSSkk..',
      '....kkkkkkkk....',
    ]),
    PA_KARTAN('En låg klippa med ett svart schakt och en trebock av stänger över det, där ett rep hänger ner; rostfläckar på stenen.', [
      '', '',
      '.......k........',
      '......kJk.......',
      '.....kJ.Jk......',
      '.....J..l.J.....',
      '....J...l..J....',
      '...J....l...J...',
      '..kkkkkkkkkkkkk.',
      '.kSSdrrkkkrdSSk.',
      'kSSddRrkkkrddSSk',
      'kSdddddkkkddrdSk',
      'kSddrRddddddRrdk',
      'kkkkkkkkkkkkkkkk',
    ]),
  ] });
})();

// fas 12: rollernas symboler vid namnet på kartan (steg 12.1.157). Varje kolonist har sitt namn i liten text under figuren,
// och den som har en roll en symbol på 8 × 8 punkter till vänster om namnet, i hel skala. Visas på gräset med en mörk rand
// där namnet står. Ritade av programmeringschatten.
(() => {
  const PAL = { o: '#24201d', a: '#d8b25f', r: '#a14808', y: '#d8b25f', b: '#61767a', w: '#dad0bb' };
  const VID_NAMNET = (text, rader) => ({ text, w: 40, h: 16, rita: (B, P) => {
    const g = P.i('oliv', 2); for (let y = 0; y < 16; y++) for (let x = 0; x < 40; x++) B.satt(x, y, g);
    rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') B.satt(4 + x, 4 + y, P.av(PAL[ch])); }));
    for (let x = 14; x < 36; x++) for (let y = 5; y < 11; y++) B.satt(x, y, P.av(y === 5 || y === 10 ? '#24201d' : (x % 4 === 3 ? '#24201d' : '#dad0bb'))); // namnet som en rand
  } });
  VAL.push({ id: 'f12_roll_prast', namn: 'Prästens symbol vid namnet', typ: 'tre', slag: ['symbol'], vad: 'Steg 12.1.157: varje kolonist har sitt namn i liten text på kartan, och prästen får en liten symbol till vänster om namnet, 8 × 8 punkter. I spelet är den nu ett guldhjul (platshållare). Bilden visar symbolen på gräset och namnet som en ljus rand bredvid.', versioner: [
    VID_NAMNET('Solhjulet: en guldskiva med fyra skåror, som solen tron ofta ber till.', ['..oooo..', '.oaaaao.', 'oaoaaoao', 'oaaaaaao', 'oaaaaaao', 'oaoaaoao', '.oaaaao.', '..oooo..']),
    VID_NAMNET('Huvan: prästen själv, ett huvud i huva och en mantel som vidgas nedåt.', ['...oo...', '..oaao..', '.oaooao.', '.oaooao.', '..oaao..', '.oaaaao.', 'oaaaaaao', 'oooooooo']),
    VID_NAMNET('Offerskålen: en skål med en låga i, det prästen bär fram vid blotet.', ['...oo...', '..orro..', '..oyyo..', '.oyrryo.', 'oooooooo', 'oaaaaaao', '.oaaaao.', '..oooo..']),
  ] });
  VAL.push({ id: 'f12_roll_ledare', namn: 'Ledarens symbol vid namnet', typ: 'janej', vad: 'Steg 12.1.157: ledaren får en liten symbol till vänster om namnet på kartan. Det är ledarskapets symbol (ledaren med armarna ut) i 8 × 8 punkter, så att den ritas i hel skala bredvid den lilla texten.', versioner: [
    VID_NAMNET('Ledaren med armarna ut, i guld, i 8 × 8 punkter.', ['..oooo..', '..oaao..', 'o.oaao.o', 'oaoaaoao', '.oaaaao.', '..oaao..', '..oaao..', '..o..o..']),
  ] });
})();

// fas 12: den öppna flikens namn i panelen (steg 12.1.128). Tre sätt att skriva namnet vid bandet överst i fliken, visade
// för tre flikar på panelens beige och i dess bredd (240 punkter, två skärmpunkter per punkt som i spelet). Bokstäverna är
// 3 × 5 punkter, i samma storlek som spelets text i rubrikerna. Ritade av programmeringschatten.
(() => {
  const BOKST = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    I: ['###', '.#.', '.#.', '.#.', '###'], K: ['#.#', '##.', '#..', '##.', '#.#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'],
  };
  const OVER = { Å: ['A', '.#.'], Ö: ['O', '#.#'] };
  const bredd = namn => [...namn].reduce((s, ch) => s + BOKST[(OVER[ch] || [ch])[0]][0].length + 1, 0) - 1;
  // namnet med versalernas överkant i y (prickarna över Ö och ringen över Å två rader ovanför)
  const skriv = (B, namn, x, y, f) => {
    for (const ch of namn) {
      const [bas, over] = OVER[ch] || [ch, null], g = BOKST[bas];
      if (over) [...over].forEach((c, dx) => { if (c === '#') B.satt(x + dx, y - 2, f); });
      g.forEach((rad, dy) => [...rad].forEach((c, dx) => { if (c === '#') B.satt(x + dx, y + dy, f); }));
      x += g[0].length + 1;
    }
  };
  const W = 240, FLIKAR = [['kronika', 'KRÖNIKA'], ['seder', 'SEDER'], ['forrad', 'FÖRRÅD']].filter(([id]) => GUI.band[id]);
  // bandet som i spelet: remsan i bandets vanligaste färg med konturen ut till kanterna, och bilden i mitten
  const farg = b => { const n = {}; b.rader.forEach(r => [...r].forEach(k => { if (k !== '.' && k !== 'a') n[k] = (n[k] || 0) + 1; })); return [b.pal[Object.keys(n).sort((x, y) => n[y] - n[x])[0]], b.pal.a]; };
  const band = (B, P, b, y0) => {
    const [bf, bk] = farg(b);
    for (let x = 0; x < W; x++) for (let y = 9; y < 17; y++) B.satt(x, y0 + y + 1, P.av(y === 9 || y === 16 ? bk : bf));
    const x0 = Math.round((W - b.w) / 2);
    b.rader.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') B.satt(x0 + x, y0 + y, P.av(b.pal[ch])); }));
  };
  // en version: varje flik får sin höjd (fore ovanför bandet, efter under) och ritas med rita(B, P, b, namn, y för bandet)
  const VERSION = (text, fore, efter, rita) => {
    const h = FLIKAR.reduce((s, [id]) => s + fore + GUI.band[id].h + efter + 6, 4);
    return { text, w: W, h, rita: (B, P) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) B.satt(x, y, P.i('ben', 3));
      let y = 4;
      for (const [id, namn] of FLIKAR) { const b = GUI.band[id]; band(B, P, b, y + fore); rita(B, P, b, namn, y + fore); y += fore + b.h + efter + 6; }
    } };
  };
  VAL.push({ id: 'f12_fliknamn', namn: 'Flikens namn i panelen', typ: 'tre', slag: [], vad: 'Steg 12.1.128: den öppna flikens namn ska synas i panelen, vid bandet överst i fliken. I dag syns namnet bara när musen är över runstenen. Tre sätt, visade för Krönikan, Seder och Förrådet i panelens bredd. Det valda byggs in för alla flikar och rutor.', versioner: [
    VERSION('En skylt hänger i två korta kedjor under medaljongen, i bandets färg med mörk kant, och namnet står på skylten i ljusa bokstäver (mörka på en ljus skylt).', 0, 14, (B, P, b, namn, y0) => {
      const [bf, bk] = farg(b), sw = bredd(namn) + 10, sx = Math.round((W - sw) / 2), sy = y0 + b.h + 3;
      for (const kx of [sx + 3, sx + sw - 4]) for (let y = y0 + b.h - 2; y < sy; y++) B.satt(kx, y, P.av(bk));
      for (let y = sy; y < sy + 11; y++) for (let x = sx; x < sx + sw; x++) B.satt(x, y, P.av(y === sy || y === sy + 10 || x === sx || x === sx + sw - 1 ? bk : bf));
      for (let x = sx + 1; x < sx + sw - 1; x++) B.satt(x, sy + 9, P.av(bk)); // skuggan i skyltens nederkant
      const ljus = parseInt(bf.slice(1, 3), 16) * 0.3 + parseInt(bf.slice(3, 5), 16) * 0.59 + parseInt(bf.slice(5, 7), 16) * 0.11 > 120; // mörka bokstäver på en ljus skylt
      skriv(B, namn, sx + 5, sy + 3, ljus ? P.i('kol', 0) : P.i('ben', 3));
    }),
    VERSION('Namnet på en egen rad över bandet, mörka bokstäver på panelens beige, mitt över medaljongen.', 9, 0, (B, P, b, namn, y0) => {
      skriv(B, namn, Math.round((W - bredd(namn)) / 2), y0 - 7, P.i('kol', 0));
    }),
    VERSION('Namnet på en egen rad under bandet, mörka bokstäver på panelens beige, mitt under medaljongen.', 0, 9, (B, P, b, namn, y0) => {
      skriv(B, namn, Math.round((W - bredd(namn)) / 2), y0 + b.h + 4, P.i('kol', 0));
    }),
  ] });
})();
