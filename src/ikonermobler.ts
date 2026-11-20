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
};
// stationerna som är en ruta stora har samma bild på kartan
const KARTA = ['drejskiva'];
export function laggTillMobler(PIX: Pix, PAL: Pal) {
  for (const [k, b] of Object.entries(BILDER)) { PIX[k] = b.pix; PAL[k] = b.pal; }
  for (const k of KARTA) for (const e of ['_karta', '_karta_v']) { PIX[k + e] = PIX[k]; PAL[k + e] = PAL[k]; }
}
