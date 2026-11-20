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
