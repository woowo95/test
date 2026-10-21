// ikoner för föremål: små pixelbilder (8×8) som används både på kartan och i listorna
// varje tecken är en pixel, '.' är genomskinlig

const PAL: Record<string, Record<string, string>> = {
  bar: { r: '#b3263a', R: '#e8687a', d: '#6e1224', g: '#4f8a3a' },
  rotter: { o: '#9a6a3e', O: '#c99a62', d: '#5e3c20', g: '#5f9a44' },
  kott: { r: '#9c3328', R: '#d26a56', w: '#eee2c8' },
  fisk: { b: '#7f9cab', B: '#c3d6de', k: '#1a1a1a', t: '#58737f' },
  svamp: { c: '#a0502e', C: '#d99060', s: '#ebe0c6', S: '#c4b694' },
  ved: { b: '#6a4426', B: '#8f603a', Y: '#dcb87e', y: '#a07a46' },
  grenar: { b: '#7a5a36', B: '#9c7848', g: '#5f8a3e' },
  torrgras: { y: '#d8c070', Y: '#f0dc94', t: '#8a6a3a' },
  kol: { k: '#24201c', K: '#4f4842' },
  flinta: { g: '#8f9396', G: '#c9cdd0', d: '#5f6366' },
  gniststen: { k: '#55595c', K: '#8a8f94', y: '#ffd060' },
  yxa: { h: '#7a5a36', g: '#8f9396', G: '#c9cdd0' },
  fiskespjut: { h: '#8a6a40', g: '#8f9396', G: '#c9cdd0' },
  korg: { t: '#6e4e2e', o: '#9a6a3e', O: '#c99a62', r: '#c4334a' },
  risvagg: { p: '#5a3c22', b: '#8a6a40', B: '#b08a58' },
  hogolv: { y: '#d8c070', Y: '#f0dc94', d: '#7a5a3a' },
  bygga: { b: '#8a6a40', B: '#b08a58', d: '#3a2a1a', y: '#d8c070' },
};

const PIX: Record<string, string[]> = {
  // korgen visas över huvudet på den som plockar bär
  korg: [
    '..tttt..',
    '.t.r.rt.',
    '.trrrrt.',
    'oOoOoOoO',
    'OoOoOoOo',
    '.oOoOoO.',
    '.OoOoOo.',
    '..oooo..',
  ],
  bar: [
    '....g...',
    '...gg...',
    '.Rr.Rr..',
    '.rd.rd..',
    'Rr.Rr.Rr',
    'rd.rd.rd',
    '..Rr....',
    '..rd....',
  ],
  rotter: [
    '.....g.g',
    '......g.',
    '....oOo.',
    '...oOoo.',
    '..oOood.',
    '.oOood..',
    '.ood....',
    'd.d.....',
  ],
  kott: [
    '..rrr...',
    '.rRRrr..',
    '.rRrrrr.',
    '.rrrrrr.',
    '..rrrrw.',
    '....rwww',
    '.....ww.',
    '........',
  ],
  fisk: [
    '........',
    '........',
    '.bbbbb.t',
    'bBkBbbtt',
    'bbbbbbtt',
    '.bbbbb.t',
    '........',
    '........',
  ],
  svamp: [
    '..cccc..',
    '.cCCccc.',
    'cCcccccc',
    'cccccccc',
    '...sS...',
    '...sS...',
    '...sS...',
    '..ssSS..',
  ],
  ved: [
    '........',
    '..bbbbbb',
    '.YYbBBbb',
    'YyYbbbbb',
    'YYYbbbBb',
    '.YYbbbbb',
    '..bbbbbb',
    '........',
  ],
  grenar: [
    '.......b',
    '..g...b.',
    '..bB.b..',
    '....bb..',
    '...bb.g.',
    '..b..b..',
    '.b......',
    'b.......',
  ],
  torrgras: [
    '.Y.y.Y..',
    '.y.yY.y.',
    '..yYyy..',
    '..yyYy..',
    '..tttt..',
    '..yYyy..',
    '.y.yY.y.',
    'y..yy..y',
  ],
  kol: [
    '........',
    '........',
    '...kk...',
    '..kKkk..',
    '.kkkkkk.',
    'kkKkkKkk',
    '.kkkkkk.',
    '........',
  ],
  flinta: [
    '........',
    '....g...',
    '...gGg..',
    '..gGggg.',
    '.gGgggd.',
    'gggggdd.',
    '.ggdddd.',
    '........',
  ],
  gniststen: [
    '......y.',
    '.....y.y',
    '...kk.y.',
    '..kKkk..',
    '.kKkkkk.',
    'kkkkkkkk',
    '.kkkkkk.',
    '........',
  ],
  yxa: [
    '....GGg.',
    '...GggG.',
    '..hGggg.',
    '..h.gg..',
    '.h......',
    '.h......',
    'h.......',
    'h.......',
  ],
  // flätade grenar mellan pinnar
  risvagg: [
    'p..p..p.',
    'pBbpBbpB',
    'pbBpbBpb',
    'pBbpBbpB',
    'pbBpbBpb',
    'pBbpBbpB',
    'pbBpbBpb',
    'p..p..p.',
  ],
  hogolv: [
    '........',
    '........',
    '........',
    '.Y.y.Y..',
    'yYyYyYyY',
    'YyYyYyYy',
    'dddddddd',
    '........',
  ],
  // ett litet hus: den som bygger har det över huvudet
  bygga: [
    '...bb...',
    '..bBBb..',
    '.bBbbBb.',
    'bBbbbbBb',
    '.BbddbB.',
    '.bBddBb.',
    '.Bbddbb.',
    'yyyyyyyy',
  ],
  fiskespjut: [
    '......Gg',
    '.....hG.',
    '....h...',
    '...h....',
    '..h.....',
    '.h......',
    'h.......',
    '........',
  ],
};

const canvases: Record<string, HTMLCanvasElement> = {};
const urls: Record<string, string> = {};

// pixelbilden som canvas, 8×8
export function iconCanvas(k: string) {
  if (canvases[k]) return canvases[k];
  const c = document.createElement('canvas'); c.width = 8; c.height = 8;
  const g = c.getContext('2d')!, rows = PIX[k], pal = PAL[k];
  if (rows) rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return (canvases[k] = c);
}
export const hasIcon = (k: string) => !!PIX[k];
// ikonen som <img> för listorna
export function iconImg(k: string, size = 16) {
  if (!hasIcon(k)) return '';
  urls[k] ??= iconCanvas(k).toDataURL();
  return `<img class="ikon" src="${urls[k]}" width="${size}" height="${size}" alt="">`;
}
