// Pixelbilderna för myren och järnet (fas 12), platshållare i paletten med 16 punkter per ruta tills Björn valt bilder i
// bildstilen. laggTillJarn anropas sist i ikoner.ts med dess register, så att bilderna finns som alla andra
type Pix = Record<string, string[]>;
type Pal = Record<string, Record<string, string>>;
const BILDER: Record<string, { pix: string[]; pal: Record<string, string> }> = {
  // malmen (steg 12.1.2): rostbruna klumpar med mörka hål
  malm: { pix: [
    '................', '................', '................', '................',
    '......rrr.......', '....rrRRrr......', '...rRRrRRrr.....', '...rRkrRRRr.rr..',
    '..rrRRRrkRr.rRr.', '..rRRrRRRrrrRRr.', '..rrRRkRRRRrRkr.', '...rrRRRrrrrRRr.',
    '....rrrrr..rrrr.', '................', '................', '................'],
    pal: { r: '#742a01', R: '#a14808', k: '#3f2415' } },
};
export function laggTillJarn(PIX: Pix, PAL: Pal) {
  for (const [k, b] of Object.entries(BILDER)) { PIX[k] = b.pix; PAL[k] = b.pal; }
}
