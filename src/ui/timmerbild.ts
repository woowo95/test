import { KARTBILDER } from '../kartbilder';
import { hash3 } from '../sim/slump';
import { farg } from '../palett';

// ---------- timmerväggens punkter (husbild.ts) och den rasade muren på en liten karta (steg 13.1.2) ----------
// Utan grafik, så att testerna kan rita dem. Muren är spelets timmervägg (samma mall och grannar som husen) med mossa, lav och
// gräs som ett lager ovanpå (Björn valde version 1 av f11_ruinmur). En del av rutorna har rasat: där fattas en bit av stocken
const VAGG = KARTBILDER.timmervagg!;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const mallPx = (x: number, y: number) => VAGG.pal[VAGG.rader[y]![x]!] ?? '';
export // väggpunkten (lx, ly) på rutan gx0, gy0 ur mallen: n = grannarnas slag i ordningen vänster, höger, upp, ner. Tomt = ingen stock
function vagg(n: string, lx: number, ly: number, gx: number, gy: number) {
  const [l, r, u, d] = [...n].map(c => c === 'W'), o = [...n].map(c => c === 'O' || c === 'P');
  let h = l || r, v = u || d;
  if (!h && !v) h = o[0] || o[1] || !(o[2] || o[3]); // ensam vägg: stocken ligger längs öppningen
  const inne = (a: number) => a >= 2 && a <= 13;
  // hörnet: stockändarna (mallens hörn uppe till vänster) när väggen går åt två håll, också när en dörröppning ligger på ena
  // sidan om hörnet (steg 3.6.7)
  const horn = (h || o[0] || o[1]) && (v || o[2] || o[3]) && (h || v);
  if (horn && inne(lx) && inne(ly)) return mallPx(lx, ly);
  // mot en öppning slutar stocken rakt avsågad (Björn valde version 1 efter v245, steg 4.5.2): en mörk såglinje och den ljusa
  // ändytan mot öppningen, som i mallens nedre vägg. Inte i ett hörn. Räknat som om öppningen ligger till höger: uu = längs
  // väggen mot öppningen, vv = tvärs över väggen
  const uv = horn ? null : o[1] ? [lx, ly] : o[0] ? [15 - lx, ly] : o[3] ? [ly, lx] : o[2] ? [15 - ly, lx] : null;
  if (uv && inne(uv[1]!)) {
    const [uu, vv] = uv as [number, number];
    if (uu >= 14) return vv >= 3 && vv <= 12 ? mallPx(32, 51) : '';
    if (uu === 13) return mallPx(34, 50);
  }
  // stocken: mallens övre vägg (vågrät) och vänstra vägg (lodrät), två rutor långa så att mönstret inte upprepas på varje ruta
  if (h && inne(ly) && lx >= (l ? 0 : 2) && lx <= (r ? 15 : 13)) return mallPx(16 + mod(gx, 32), ly);
  if (v && inne(lx) && ly >= (u ? 0 : 2) && ly <= (d ? 15 : 13)) return mallPx(lx, 16 + mod(gy, 32));
  return '';
}

const MOSSA = [farg('oliv', 1), farg('oliv', 2), farg('oliv', 3)], LAV = farg('senap', 3), GRAS = farg('oliv', 2);
// murrutan x, y: murar = de andra murrutorna ("x,y"); 256 färger, rad för rad ('' = marken syns)
export function ruinPunkter(murar: Set<string>, x: number, y: number) {
  const n = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => murar.has(`${x + dx!},${y + dy!}`) ? 'W' : '.').join('') + '....';
  const rasat = hash3(x, y, 71) < 0.35, ras0 = 3 + Math.floor(hash3(x, y, 72) * 7), ras1 = ras0 + 3 + Math.floor(hash3(x, y, 73) * 4);
  const vagrat = n[0] === 'W' || n[1] === 'W' || (n[2] !== 'W' && n[3] !== 'W');
  const px: string[] = [];
  for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
    const gx = x * 16 + lx, gy = y * 16 + ly, langs = vagrat ? lx : ly;
    let col = vagg(n, lx, ly, gx, gy);
    if (col && rasat && langs >= ras0 && langs <= ras1 && hash3(gx, gy, 74) < 0.85) col = '';
    if (col) { // mossan växer i fläckar på stocken, laven i enstaka punkter
      if (hash3(gx >> 1, gy >> 1, 75) < 0.28) col = MOSSA[Math.floor(hash3(gx, gy, 76) * 3)]!;
      else if (hash3(gx, gy, 77) < 0.02) col = LAV;
    } else if (hash3(gx, gy, 78) < 0.05) col = GRAS; // grässtrån där marken syns
    px.push(col);
  }
  return { key: `${x},${y},${n}`, px };
}
