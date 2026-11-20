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
  // torven (steg 12.1.3): mörkbruna tegel av torv i en liten trave, den blöta med vatten som glänser
  torv: { pix: [
    '................', '................', '................', '................',
    '................', '....kkkkkkk.....', '...kJjjJjjk.....', '...kjjJjjjkkkkk.',
    '..kkkkkkkkkJjjk.', '..kJjjjJjkjjJjk.', '..kjjJjjjkjjjjk.', '..kkkkkkkkkkkkk.',
    '................', '................', '................', '................'],
    pal: { k: '#3f2415', j: '#5e3c24', J: '#7d5b40' } },
  blottorv: { pix: [
    '................', '................', '................', '................',
    '................', '....kkkkkkk.....', '...kJjvjjjk.....', '...kjjjjVjkkkkk.',
    '..kkkkkkkkkJjvk.', '..kjVjjjjkjjjjk.', '..kjjjvjjkjVjjk.', '..kkkkkkkkkkkkk.',
    '...v.......v....', '................', '................', '................'],
    pal: { k: '#2f261d', j: '#3f2415', J: '#5e3c24', v: '#3e5156', V: '#61767a' } },
  // kolmilan (steg 12.2.1): en kupa av jord och torv över veden, med rökhålet i toppen; på kartan 16 punkter per ruta (2 × 2)
  kolmila: { pix: ['................', '................', '................', '................', '................', '.....kkkkkk.....', '...kkjJKKjJkk...', '..kjjJjKKJjjjk..', '..kjJjjjJjjjJk..', '..jJjjjJjjjJjj..', '..JjjjJjjjJjjj..', '..kjjJjjjJjjjk..', '..kjJjjjJjjjJk..', '...kkjjJjjjkk...', '................', '................'],
    pal: { k: '#24201d', K: '#474138', j: '#3f2415', J: '#5e3c24', g: '#4b4f00' } },
  kolmila_karta: { pix: ['................................', '................................', '................................', '................................', '................................', '................................', '................................', '................................', '................................', '............kkkkkkkk............', '.........kkkkjKKgKjkkkk.........', '.......kkkjgjjKKKKjJjjkkk.......', '......kkJjjjjJKKKgJjjjjJkk......', '.....kkJjjjjgjKKKKjjjjJgjkk.....', '....kkJgjjjJjjjjJjgjjJjjjjkk....', '....kJjjjjJjjgjJjjjjJjjjgJjk....', '...kkjjjgJjjjjJjjjjgjjjjJjjkk...', '...kjjjjJjjjjJgjjjJjjjjJjgjjk...', '...kjjjJjgjjJjjjjJjjgjJjjjjJk...', '..kkgjJjjjjJjjjgJjjjjJjjjjgjkk..', '...kjJjjjjgjjjjJjjjjJgjjjJjjk...', '...kJgjjjJjjjjJjgjjJjjjjJjjgk...', '...kkjjjJjjgjJjjjjJjjjgJjjjkk...', '....kjgJjjjjJjjjjgjjjjJjjjjk....', '....kkJjjjjJgjjjJjjjjJjgjjkk....', '.....kkgjjJjjjjJjjgjJjjjjkk.....', '......kkjJjjjgJjjjjJjjjjkk......', '.......kkkjjjJjjjjJgjjkkk.......', '.........kkkkjgjjJjkkkk.........', '................................', '................................', '................................'],
    pal: { k: '#24201d', K: '#474138', j: '#3f2415', J: '#5e3c24', g: '#4b4f00' } },
};
export function laggTillJarn(PIX: Pix, PAL: Pal) {
  for (const [k, b] of Object.entries(BILDER)) { PIX[k] = b.pix; PAL[k] = b.pal; }
  PIX.kolmila_karta_v = PIX.kolmila_karta; PAL.kolmila_karta_v = PAL.kolmila_karta;
}
