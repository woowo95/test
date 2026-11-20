// Pixelbilderna för möblerna och sakerna i hemmet (system 12.4), platshållare i paletten med 16 punkter per ruta tills Björn valt
// bilder i bildstilen. laggTillMobler anropas sist i ikoner.ts med dess register, så att bilderna finns som alla andra
type Pix = Record<string, string[]>;
type Pal = Record<string, Record<string, string>>;
const TRA = { k: '#24201d', j: '#5e3c24', J: '#7d5b40', d: '#3f2415' };
const BILDER: Record<string, { pix: string[]; pal: Record<string, string> }> = {
  // drejskivan (steg 12.4.1): en rund skiva av trä på en fot, med en klump lera i mitten
  drejskiva: { pix: [
    '................', '................', '................', '....kkkkkkkk....',
    '...kJjjjjjjJk...', '..kjjjRRRRjjjk..', '..kjjRTTTTRjjk..', '..kjjRTTTTRjjk..',
    '..kjjjRRRRjjjk..', '...kJjjjjjjJk...', '....kkkkkkkk....', '.....kd..dk.....',
    '.....kd..dk.....', '....kkk..kkk....', '................', '................'],
    pal: { ...TRA, R: '#742a01', T: '#bd753e' } },
  // oljelampan (steg 12.4.2): en låg skål av bränd lera med en pip för veken, oljan gul i skålen
  oljelampa: { pix: [
    '................', '................', '................', '................',
    '................', '................', '................', '.....kkkkkk.....',
    '....kRooooRk....', '...kRRRRRRRRkk..', '...kTRRRRRRTRRk.', '....kTTTTTTkkk..',
    '.....kkkkkk.....', '................', '................', '................'],
    pal: { k: '#24201d', R: '#742a01', T: '#bd753e', o: '#d8b25f' } },
  kb_oljelampa1: { pix: ['...........', '...........', '...........', '...........', '...........', '...kkkkk...', '..kRoooRk..', '.kRRRRRRRkk', '.kTRRRRRTRk', '..kTTTTTkk.', '...kkkkk...'],
    pal: { k: '#24201d', R: '#742a01', T: '#bd753e', o: '#d8b25f' } },
  kb_oljelampa1_tand: { pix: ['.........y.', '........yoy', '........yoy', '.........y.', '.........k.', '...kkkkk.k.', '..kRoooRk..', '.kRRRRRRRkk', '.kTRRRRRTRk', '..kTTTTTkk.', '...kkkkk...'],
    pal: { k: '#24201d', R: '#742a01', T: '#bd753e', o: '#d8b25f', y: '#a14808' } },
  // sängen (steg 12.4.3): en ram av plankor med ett ljust bolster av ull och en kudde, snett ovanifrån; två rutor bred på kartan
  sang: { pix: [
    '................', '................', '................', '.kkkkkkkkkkkkkk.',
    '.kJJJJJJJJJJJJk.', '.kJwwWWWWWWWWJk.', '.kJwwWWWWWWWWJk.', '.kJyyYYYYYYYYJk.',
    '.kJyyYYYYYYYYJk.', '.kJyyYYYYYYYYJk.', '.kJJJJJJJJJJJJk.', '.kjjjjjjjjjjjjk.',
    '.kkkkkkkkkkkkkk.', '.kd..........dk.', '................', '................'],
    pal: { ...TRA, w: '#dad0bb', W: '#bdb39b', y: '#a0947d', Y: '#bdb39b' } },
  sang_karta: { pix: [
    '................................', '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..', '..kJJJJJJJJJJJJJJJJJJJJJJJJJJk..', '..kJwwwwWWYYYYYYYYYYYYYYYYYYJk..',
    '..kJwwwwWWYYYYYYyYYYYYYYYYYYJk..', '..kJwwwwWWYYYYYYYYYYYYYyYYYYJk..', '..kJwwwwWWYYYYyYYYYYYYYYYYYYJk..', '..kJwwwwWWYYYYYYYYYYYYYYYYYYJk..',
    '..kJwwwwWWYYYYYYYYYYyYYYYYYYJk..', '..kJwwwwWWYYYYYYYYYYYYYYYYYYJk..', '..kJJJJJJJJJJJJJJJJJJJJJJJJJJk..', '..kjjjjjjjjjjjjjjjjjjjjjjjjjjk..',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..', '..kd........................dk..', '................................', '................................'],
    pal: { ...TRA, w: '#dad0bb', W: '#bdb39b', y: '#a0947d', Y: '#bdb39b' } },
};
// stationerna som är en ruta stora har samma bild på kartan
const KARTA = ['drejskiva'];
// de längre stationerna står vridna ett kvarts varv när de står på högkant (platshållare tills den stående bilden ritats)
const VRIDS = ['sang'];
const vrid = (r: string[]) => Array.from({ length: r[0].length }, (_, x) => r.map(rad => rad[x]).reverse().join(''));
export function laggTillMobler(PIX: Pix, PAL: Pal) {
  for (const [k, b] of Object.entries(BILDER)) { PIX[k] = b.pix; PAL[k] = b.pal; }
  for (const v of ['', '_tand']) { PIX['kb_oljelampa2' + v] = PIX['kb_oljelampa1' + v]; PAL['kb_oljelampa2' + v] = PAL['kb_oljelampa1' + v]; } // lampan ser likadan ut på bordet och hyllan
  for (const k of KARTA) for (const e of ['_karta', '_karta_v']) { PIX[k + e] = PIX[k]; PAL[k + e] = PAL[k]; }
  for (const k of VRIDS) { PIX[k + '_karta_v'] = vrid(PIX[k + '_karta']); PAL[k + '_karta_v'] = PAL[k + '_karta']; }
}
