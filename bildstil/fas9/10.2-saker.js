// fas 10, system 10.2: de nya sakerna och möblerna, tre versioner var: högsätet och bänken i långhuset (steg 10.2.68), krubban i
// fähuset (10.2.88), snökrukan vid elden (10.2.50) och nålen på kartan (10.2.63). Stationerna ritas snett ovanifrån som
// kartans andra möbler (ytan ovanifrån och en mörkare framsida) och står bredvid en kolonist i spelets storlek. Sist ett ja/nej-kort
// för de små barnens porträtt (10.2.54).
(() => {
  const { KORT, former, ell, linje, tri, och, utan, punkt, rakt, poly, lagg, bredd } = window.F7;
  const S = 'Steg ';
  // trä (jord), halm och hö (senap), skinn (ben och jord), sten (skiffer), lera (rost), eld (senap och rost), snö (ben)
  const TRA = { a: 'jord0', b: 'jord1', c: 'jord2', d: 'jord3', h: 'senap1', H: 'senap2', g: 'senap3', s: 'ben3', S: 'ben2', f: 'ben1', r: 'rost1', R: 'rost2', q: 'rost3', k: 'skiffer1', K: 'skiffer2', l: 'skiffer3', y: 'senap0' };
  // saken ensam med marginal: kontrollerna ställer den i spelets storlek bredvid en kolonist (sammanhanget)
  const PA = (text, rader, legend = TRA, m = 4) => ({ text, w: bredd(rader) + 2 * m, h: rader.length + 2 * m, rita: B => lagg(B, rader, legend, m, m) });
  // en möbel snett ovanifrån: ytan (ljus), de tre nedersta raderna av ytan mörkare (framkanten) och korta ben under
  const yta = (x0, y0, x1, y1, ljus = 'd', mork = 'b', mon) => [rakt(x0, y0, x1, y1), (x, y) => y >= y1 - 3 ? mork : mon ? mon(x, y) : ljus];

  // ---------- högsätet (1 × 1 ruta): ett högt säte för den som leder byn, i långhuset ----------
  const hogsate = [
    // 1: en hög smal rygg mitt bak med en knopp i toppen, sitsen ovanifrån
    former(16, 18, [[rakt(4, 0, 12, 8), (x, y) => (y < 1 ? 'H' : Math.floor(x) % 3 === 0 ? 'b' : 'c')], yta(1, 7, 15, 16, 'd', 'b', (x, y) => (Math.floor(x + y) % 5 === 0 ? 'c' : 'd')), [och(rakt(2, 16, 4, 18), rakt(12, 16, 14, 18)), 'a']]),
    // 2: en bred låg rygg över hela bredden med en fäll, och armstöd som går fram på sidorna
    former(16, 16, [[rakt(0, 2, 16, 6), (x, y) => (Math.floor(x + y) % 4 === 0 ? 'S' : 's')], [och(rakt(0, 6, 3, 14), rakt(13, 6, 16, 14)), (x, y) => (y > 11 ? 'a' : 'c')], yta(3, 6, 13, 14, 's', 'f'), [och(rakt(1, 14, 3, 16), rakt(13, 14, 15, 16)), 'a']]),
    // 3: två höga smala stolpar med uppsvängda drakhuvuden vid bakhörnen, och en röd dyna på sitsen
    former(16, 22, [[och(linje([[2.5, 12], [2.5, 3], [1, 0.8]], 0.9), linje([[13.5, 12], [13.5, 3], [15, 0.8]], 0.9)), (x, y) => (y < 2.5 ? 'H' : 'c')], yta(1, 11, 15, 20, 'd', 'b'), [rakt(4, 12, 12, 16), 'R'], [och(rakt(2, 20, 4, 22), rakt(12, 20, 14, 22)), 'a']]),
  ];

  // ---------- bänken (2 × 1 rutor): längs väggarna i långhuset ----------
  const bank = [
    // 1: en bred planka ovanifrån på två klossar
    former(32, 12, [yta(1, 1, 31, 10, 'd', 'b', (x, y) => (Math.floor(x) % 8 === 0 ? 'c' : 'd')), [och(rakt(4, 10, 8, 12), rakt(24, 10, 28, 12)), 'a']]),
    // 2: med en ryggribba på tre korta stolpar bakom sitsen
    former(32, 16, [[rakt(1, 0, 31, 2), 'c'], [och(rakt(3, 2, 5, 5), rakt(15, 2, 17, 5), rakt(27, 2, 29, 5)), 'b'], yta(1, 5, 31, 14, 'd', 'b'), [och(rakt(3, 14, 6, 16), rakt(26, 14, 29, 16)), 'a']]),
    // 3: en kluven stock med rundade ändar, den platta sidan upp och barken på framsidan
    former(30, 12, [[(x, y) => ell(15, 5.5, 14.5, 5.5)(x, y) && y < 11, (x, y) => (y >= 8 ? (Math.floor(x) % 3 === 0 ? 'a' : 'b') : Math.floor(x * 0.5 + y) % 6 === 0 ? 'c' : 'd')]]),
  ];

  // ---------- krubban (2 × 1 rutor): en foderhäck av virke med hö, i fähuset ----------
  const ho = (x, y) => (Math.floor(x * 1.7 + y) % 3 === 0 ? 'h' : Math.floor(x + y) % 2 ? 'H' : 'g');
  const krubba = [
    // 1: en häck som är bredare upptill, ribborna snett ovanifrån och höet mellan dem
    former(32, 14, [[poly([[0, 1], [32, 1], [28, 13], [4, 13]]), (x, y) => (y >= 10 ? 'b' : Math.floor(x) % 4 === 1 ? 'c' : y < 5 ? ho(x, y) : 'H')]]),
    // 2: ett långt lågt tråg av plankor fyllt med hö, kortare än två rutor
    former(28, 9, [yta(0, 0, 28, 9, 'd', 'b', (x, y) => (y < 4 ? ho(x, y) : 'c'))]),
    // 3: en häck på två höga stolpar, höet i en rund tuss mellan dem
    former(32, 18, [[och(rakt(1, 0, 4, 16), rakt(28, 0, 31, 16)), (x, y) => (y < 1 ? 'd' : 'c')], [ell(16, 5, 11, 4.5), ho], yta(4, 7, 28, 16, 'd', 'b', (x, y) => (Math.floor(x) % 3 === 0 ? 'c' : 'H')), [och(rakt(1, 16, 4, 18), rakt(28, 16, 31, 18)), 'a']]),
  ];

  // ---------- snökrukan (10.2.50): snö som smälter i en lerkruka vid elden (symmetrisk) ----------
  const SNO = { ...TRA, n: 'ben3', N: 'ben2', m: 'skiffer3' };
  const lera = (cx) => (x, y) => (x < cx - 2 ? 'q' : x > cx + 2 ? 'r' : 'R');
  const snokruka = [
    // 1: en hög rund kruka med en spetsig hög av snö
    former(13, 18, [[ell(6.5, 12, 5.5, 5.5), lera(6.5)], [rakt(3, 5, 10, 7), 'r'], [tri([6.5, 0], [1.5, 6], [11.5, 6]), (x, y) => (y < 3 ? 'n' : 'N')]]),
    // 2: en bred låg skål där snön sjunkit ihop och vattnet glänser
    former(17, 10, [[ell(8.5, 5, 8, 4.5), lera(8.5)], [ell(8.5, 3, 6, 1.6), 'm'], [och(punkt(5, 3), punkt(11, 3)), 'n']]),
    // 3: en smal kruka med hals, snö i öppningen och två slingor ånga
    former(11, 20, [[ell(5.5, 14, 4.5, 5), lera(5.5)], [rakt(3, 6, 8, 10), 'r'], [ell(5.5, 6, 3, 1.4), 'N'], [linje([[4, 4], [3, 1.5], [4, 0]], 0.5), 'S'], [linje([[7, 4], [8, 1.5], [7, 0]], 0.5), 'S']]),
  ];

  // ---------- nålen på kartan (10.2.63): där det som hände i loggen skedde ----------
  const NAL = { ...TRA, p: 'rost2', P: 'rost3' };
  const nal = [
    // 1: en röd nål med rund knopp och en tunn spets
    former(9, 15, [[ell(4.5, 4, 3.6, 3.6), (x, y) => (x < 4 && y < 4 ? 'P' : 'p')], [linje([[4.5, 7], [4.5, 14]], 0.6), 'k']]),
    // 2: en liten grå runsten med en röd runa, bred nedtill
    former(12, 14, [[poly([[1, 14], [2, 4], [5, 0.5], [8, 1], [11, 6], [11, 14]]), (x, y) => (x < 4 ? 'K' : 'k')], [och(linje([[6, 3], [6, 11]], 0.5), linje([[6, 6], [4, 4]], 0.4), linje([[6, 6], [8, 4]], 0.4)), 'p']]),
    // 3: en bred pil som pekar ner på en ring
    former(15, 16, [[poly([[4, 0], [11, 0], [11, 6], [15, 6], [7.5, 12], [0, 6], [4, 6]]), (x, y) => (y < 4 ? 'P' : 'p')], [utan(ell(7.5, 14, 5, 1.8), ell(7.5, 14, 3, 0.9)), 'g']]),
  ];

  // ---------- de små barnens porträtt (10.2.54): samma enkla drag, en av tre frisyrer, egen hår- och hudfärg ----------
  const SMAFRISYRER = () => ((typeof PORTRATT !== 'undefined' && PORTRATT.delar) || []).filter(d => d.sort === 'frisyr' && d.barn !== false).slice(0, 3).map(d => d.id);
  const smabarn = {
    text: 'Tre små barn under fem år: samma enkla ansikte, en av tre frisyrer och var och en med sin egen hår- och hudfärg, som följer med när barnet växer',
    w: 3 * 64 + 4 * 4, h: 64 + 8,
    rita: B => {
      const PR = window.PORTRATTEN; if (!PR) return;
      const fr = SMAFRISYRER();
      [['kvinna', 0, 1], ['man', 2, 3], ['kvinna', 4, 0]].forEach(([kon, har, hud], i) => {
        const m = PR.neutral(kon); m.alder = 'barn'; m.har = har; m.hud = hud; if (fr[i]) m.del.frisyr = fr[i];
        const Q = PR.portratt(m);
        for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) { const c = Q.px[y * Q.w + x]; if (c >= 0) B.satt(4 + i * 68 + x, 4 + y, c); }
      });
    },
  };

  VAL.push(
    KORT('f10_hogsate', 'Högsätet', S + '10.2.68: högsätet i långhuset, där den som leder byn sitter vid gillena. En möbel av 3 virke, en ruta stor, snett ovanifrån som de andra möblerna', [
      PA('En hög smal rygg mitt bak med en knopp i toppen', hogsate[0]),
      PA('En bred låg rygg med en fäll, och armstöd på sidorna', hogsate[1]),
      PA('Två höga stolpar med drakhuvuden och en röd dyna', hogsate[2]),
    ]),
    KORT('f10_bank', 'Bänken', S + '10.2.68: bänkarna längs väggarna i långhuset, en per fyra sovplatser. Av 2 virke, två rutor lång', [
      PA('En planka på två klossar', bank[0]),
      PA('Med en ryggribba på tre korta stolpar', bank[1]),
      PA('En kluven stock med rundade ändar och barken framåt', bank[2]),
    ]),
    KORT('f10_krubba', 'Krubban', S + '10.2.88: krubban, en foderhäck av virke där höet läggs. Den gör rummet till ett fähus, där djuren står i istiden. Två rutor lång', [
      PA('En häck som är bredare upptill, med höet mellan ribborna', krubba[0]),
      PA('Ett långt lågt tråg fyllt med hö', krubba[1]),
      PA('En häck på två höga stolpar med en rund tuss hö', krubba[2]),
    ]),
    KORT('f10_snokruka', 'Snökrukan', S + '10.2.50: när vattnet är fruset smälts snö i en lerkruka vid elden, och man dricker när den smält', [
      PA('En hög rund kruka med en spetsig hög snö', snokruka[0], SNO),
      PA('En bred låg skål där snön sjunkit ihop och vattnet glänser', snokruka[1], SNO),
      PA('En smal kruka med hals, snö i öppningen och ånga', snokruka[2], SNO),
    ]),
    KORT('f10_nal', 'Nålen på kartan', S + '10.2.63: trycker man på en händelse i loggen visas platsen på kartan med en nål', [
      PA('En röd nål med rund knopp', nal[0], NAL),
      PA('En liten grå runsten med en röd runa', nal[1], NAL),
      PA('En bred pil som pekar ner på en ring', nal[2], NAL),
    ]),
    { id: 'f10_smabarn', namn: 'De små barnens porträtt', typ: 'janej', vad: S + '10.2.54: barn upp till fem år får ett eget, enklare porträtt med få varianter; hårfärgen och hudfärgen följer med när barnet växer', versioner: [smabarn] },
  );
})();
