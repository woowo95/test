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
  // pallen och stolen (steg 12.4.4): en fyrkantig sits av plankor på fyra ben, och stolen med ryggstöd och en ljus dyna
  pall: { pix: [
    '................', '................', '................', '................',
    '................', '....kkkkkkkk....', '....kJJJJJJk....', '....kJjjjjJk....',
    '....kJJJJJJk....', '....kkkkkkkk....', '....kd....dk....', '....kd....dk....',
    '....kk....kk....', '................', '................', '................'],
    pal: { ...TRA } },
  stol: { pix: [
    '................', '................', '....kkkkkkkk....', '....kJJJJJJk....',
    '....kJjjjjJk....', '....kJJJJJJk....', '....kkkkkkkk....', '....kwWWWWwk....',
    '....kWWWWWWk....', '....kkkkkkkk....', '....kd....dk....', '....kd....dk....',
    '....kk....kk....', '................', '................', '................'],
    pal: { ...TRA, w: '#dad0bb', W: '#bdb39b' } },
  // vaggan (steg 12.4.5): en låg låda av plankor på två böjda medar, med en bädd av ull i
  vagga: { pix: [
    '................', '................', '................', '................',
    '...kkkkkkkkkk...', '...kJJJJJJJJk...', '...kJwWWWWwJk...', '...kJWWWWWWJk...',
    '...kJWWWWWWJk...', '...kJJJJJJJJk...', '...kjjjjjjjjk...', '...kkkkkkkkkk...',
    '..kd........dk..', '...kkkkkkkkkk...', '................', '................'],
    pal: { ...TRA, w: '#dad0bb', W: '#bdb39b' } },
  // tunnan (steg 12.4.6): ett laggat kärl av plankor med två band av rep, sett snett ovanifrån med locket
  tunna: { pix: [
    '................', '................', '.....kkkkkk.....', '....kJJJJJJk....',
    '...kJjjjjjjJk...', '...kJJJJJJJJk...', '...kjJjJjJjJk...', '...kyyyyyyyyk...',
    '...kjJjJjJjJk...', '...kjJjJjJjJk...', '...kjJjJjJjJk...', '...kyyyyyyyyk...',
    '...kjJjJjJjJk...', '....kkkkkkkk....', '................', '................'],
    pal: { ...TRA, y: '#a0947d' } },
  // osten (steg 12.4.7): en rund ost av ljus ostmassa med en skuren kil
  ost: { pix: [
    '................', '................', '................', '................',
    '.....kkkkkk.....', '...kkYYYYYYkk...', '..kYYYyYYYYYYk..', '..kYYYYYYYkkkk..',
    '..kyYYYYYYkYYk..', '..kyyYYYYYkyYk..', '...kyyyyyykyk...', '....kkkkkkkk....',
    '................', '................', '................', '................'],
    pal: { k: '#24201d', Y: '#d8b25f', y: '#b2921b' } },
  // brunnen (steg 12.4.8): en rund kant av huggen sten med mörkt vatten i, och ett vindspel av virke över
  brunn: { pix: [
    '................', '..kk........kk..', '..kjkkkkkkkkjk..', '..kj..kyyk..jk..',
    '..kj...kk...jk..', '..kj...kk...jk..', '..kkkkkkkkkkkk..', '..kSsSsSsSsSsk..',
    '.kSvvvvvvvvvvSk.', '.ksvVvvvvvVvvsk.', '.kSvvvvvvvvvvSk.', '..kSsSsSsSsSsk..',
    '..ksSsSsSsSsSk..', '...kkkkkkkkkk...', '................', '................'],
    pal: { ...TRA, S: '#8a9c9e', s: '#61767a', v: '#233035', V: '#3e5156', y: '#a0947d' } },
  // utedasset (steg 12.4.9): ett smalt litet hus av plankor med ett sluttande tak och en dörr med ett hål
  utedass: { pix: [
    '................', '.....kkkkkk.....', '....kdddddddk...', '...kddddddddk...',
    '...kkkkkkkkkk...', '....kJJJJJJk....', '....kJkkkkJk....', '....kJkJJkJk....',
    '....kJkJdkJk....', '....kJkJJkJk....', '....kJkJJkJk....', '....kJkJJkJk....',
    '....kJkkkkJk....', '....kjjjjjjk....', '....kkkkkkkk....', '................'],
    pal: { ...TRA } },
  // sjukstugans symbol (steg 12.4.10 och 13.1.14): en låg bädd av hö på en ram av grenar, med ett brunt skinn över och en ljus kudde
  sjukbadd: { pix: [
    '................', '................', '................', '................',
    '.kkkkkkkkkkkkkk.', '.kwwkJJJJJJJJjk.', '.kwwkJjJJjJJJjk.', '.kwwkJJJJJjJJjk.',
    '.kyykJJjJJJJJjk.', '.kyykjjjjjjjjjk.', '.kkkkkkkkkkkkkk.', '.kd..........dk.',
    '................', '................', '................', '................'],
    pal: { ...TRA, w: '#dad0bb', y: '#bdb39b' } },
  // fyrfatet (steg 12.4.11 och 13.7.6): ett grunt fat av bränd lera utan ben, med mörkt kol i; glöden och lågorna ritas rörliga
  // ovanpå när det brinner, som lägerelden (foremal.ts)
  fyrfat: { pix: [
    '................', '................', '................', '................',
    '................', '................', '...kkkkkkkkkk...', '..kRkvvvvvvkRk..', '..kRvvvvvvvvRk..', '..kTRRRRRRRRTk..',
    '...kTTTTTTTTk...', '....kkkkkkkk....', '................', '................', '................', '................'],
    pal: { k: '#24201d', R: '#742a01', T: '#bd753e', v: '#3f2415' } },
  // fjäderpennan (steg 12.4.14): en lång ljus fjäder snett över rutan, med en skuren spets
  penna: { pix: [
    '................', '.............kk.', '............kwWk', '...........kwWk.',
    '..........kwWk..', '.........kwWk...', '........kwWk....', '.......kwWk.....',
    '......kwWk......', '.....kwWk.......', '....kWWk........', '...kyk..........',
    '..kyk...........', '..kk............', '................', '................'],
    pal: { k: '#24201d', w: '#dad0bb', W: '#bdb39b', y: '#7d5b40' } },
};
// stationerna som är en ruta stora har samma bild på kartan
const KARTA = ['drejskiva', 'vagga', 'brunn', 'utedass', 'fyrfat'];
// de längre stationerna står vridna ett kvarts varv när de står på högkant (platshållare tills den stående bilden ritats)
const VRIDS = ['sang'];
const vrid = (r: string[]) => Array.from({ length: r[0].length }, (_, x) => r.map(rad => rad[x]).reverse().join(''));
export function laggTillMobler(PIX: Pix, PAL: Pal) {
  for (const [k, b] of Object.entries(BILDER)) { PIX[k] = b.pix; PAL[k] = b.pal; }
  PIX.laggkar = PIX.tunna; PAL.laggkar = PAL.tunna; // tekniken Laggkärl har tunnans bild
  PIX.sjukstuga = PIX.sjukbadd; PAL.sjukstuga = PAL.sjukbadd; // och tekniken Sjukstuga rumstaggens
  for (const k of ['pall', 'stol']) { PIX['kb_' + k] = PIX[k]; PAL['kb_' + k] = PAL[k]; } // på platsen vid bordet
  for (const v of ['', '_tand']) { PIX['kb_oljelampa2' + v] = PIX['kb_oljelampa1' + v]; PAL['kb_oljelampa2' + v] = PAL['kb_oljelampa1' + v]; } // lampan ser likadan ut på bordet och hyllan
  for (const k of KARTA) for (const e of ['_karta', '_karta_v']) { PIX[k + e] = PIX[k]; PAL[k + e] = PAL[k]; }
  for (const k of VRIDS) { PIX[k + '_karta_v'] = vrid(PIX[k + '_karta']); PAL[k + '_karta_v'] = PAL[k + '_karta']; }
}
