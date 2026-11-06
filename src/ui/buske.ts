import { platsHash } from './pixel';
import type { TradBild } from './trad';
// Buskarna på kartan (steg 6.5.3, bildstilens f6_buske): Björn valde den första versionen och alla tre formerna som
// variationer (rund och tät, gles med grenar, låg och bred), 16 punkter breda. Bokstäverna är bildstilens (bildstil/fas6.js,
// busk och BUSK_L): o kontur, d mörk undersida, m, l och L bladen från skugga till ljus, g grenarna
const KOL = 0, JORD = 4, OLIV = 16, BARR = 20, SKIFFER = 24;
// Q–T: bären (steg 6.5.4, bildstilens f6_barbuske version 1, ett stort bär i taget) i blåbärens skiffertoner, ljust uppe till vänster
const TON: Record<string, number> = { o: KOL, d: BARR + 1, m: OLIV + 1, l: OLIV + 2, L: OLIV + 3, g: JORD + 1, Q: SKIFFER, R: SKIFFER + 1, S: SKIFFER + 2, T: SKIFFER + 3 };
export const BUSK_FORMER: string[][] = [
  [
    '....oooooooooo..',
    '..ooLLLlllllllo.',
    '.oLLLlllllllllo.',
    '.oLllllllllllmmo',
    'ollllllllllmmmmo',
    'ollllllllmmmmmmo',
    'ollllllmmmmmmmmo',
    'ollllmmmmmmmmmmo',
    'oddddddddddddddo',
    '.oddddddddddddo.',
    '..oddddddddddo..',
    '...ooddddddoo...',
  ],
  [
    '........ooooo...',
    '...ooo.olllllo..',
    '..oLLlolllllllo.',
    '.oLllllllllllmo.',
    'ollllllllllmmmo.',
    'ollllllllgmmmo..',
    'ollllllmogmmmmo.',
    '.olllmgmmgmmmmmo',
    '..odddgdgddddddo',
    '...odddggdddddo.',
    '....oddgggoooo..',
    '.....ooggo......',
  ],
  [
    '......oooo......',
    '.....ollllo.....',
    '..oooolllloo....',
    '.olllllllllmoo..',
    'ollllllllmmmmmo.',
    'ollllllmmmmmmmmo',
    'ollllmmmmmmmmmmo',
    'oddddddddddddddo',
    'oddddddddddddddo',
    '.odddddoodddddo.',
    '..odddo..odddo..',
  ],
];
// bärbusken med mogna bär: samma tre former med bären på
export const BAR_FORMER: string[][] = [
  [
    '....oooooooooo..',
    '..ooLLLlllllllo.',
    '.oLLLllllTSlllo.',
    '.oLllllllRQllmmo',
    'olllTSlllllmmmmo',
    'olllRQllTSmmmmmo',
    'ollllllmRQmmmmmo',
    'ollTSmmmmmmmTSmo',
    'oddRQdTSddddRQdo',
    '.oddddRQddddddo.',
    '..oddddddddddo..',
    '...ooddddddoo...',
  ],
  [
    '........ooooo...',
    '...ooo.olllllo..',
    '..oLLlollTSlllo.',
    '.oLllllllRQllmo.',
    'olllTSlllllmmmo.',
    'olllRQllTSmmmo..',
    'ollllllmRQmmmmo.',
    '.olTSmgmmgmmTSmo',
    '..oRQdTSgdddRQdo',
    '...oddRQgdddddo.',
    '....oddgggoooo..',
    '.....ooggo......',
  ],
  [
    '......ooooo.....',
    '.....olllTSo....',
    '..oooolllRQo....',
    '.ollTSlllllmoo..',
    'olllRQllTSmmmmo.',
    'ollllllmRQmmmmmo',
    'ollTSmmmmmmmTSmo',
    'oddRQdTSddddRQdo',
    'odddddRQdddddddo',
    '.odddddoodddddo.',
    '..odddo..odddo..',
  ],
];
// buskens punkter: index i paletten (FARGER), -1 = genomskinligt
export function buskPx(v: number, bar = false) {
  const f = bar ? BAR_FORMER : BUSK_FORMER, r = f[v % f.length], w = r[0].length, h = r.length, px = new Int8Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = TON[r[y][x]]; if (c !== undefined) px[y * w + x] = c; }
  return { w, h, px };
}
// busken på rutan (x, y) som bild (ui/trad.ts ritar den som ett träd): en av de tre formerna, vald efter rutan
// bar = bärbusken med mogna bär just nu (då med bären på)
export const buskBild = (x: number, y: number, bar = false): TradBild => ({ typ: 'buske', h: 12, s: Math.floor(platsHash(x, y, 611) * BUSK_FORMER.length) + (bar ? BUSK_FORMER.length : 0) });
