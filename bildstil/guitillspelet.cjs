// Gränssnittets bilder till spelet (fas 5, steg 5.3.1.4): läser gui.json och skriver src/guibilder.ts.
// Hörnet på panelerna är Björns val Ormen (bildstil v121): det övre vänstra hörnet ur ramen i grundens färger, utskuret
// (HORN_RUTA), med panelens insida ('c' innanför ramen) genomskinlig. Spelet speglar det till de andra tre hörnen. De andra hörnen
// (Ring med blad och Dubbel ögla) ligger kvar i gui.json om Björn ångrar sig. Kör från repots rot: node bildstil/guitillspelet.cjs.
const fs = require('fs'), path = require('path');
const BS = __dirname, GUI = JSON.parse(fs.readFileSync(path.join(BS, 'gui.json'), 'utf8'));
const HORN_VAL = 'ormen', HORN_RUTA = { w: 48, h: 22 }, INSIDAN = 'c';
// ramens yttre kant i bilden: panelens vänstra kant ligger i kolumn 10 och den övre i rad 10
const KANT = { x: 10, y: 10 };
const g = GUI.horn[HORN_VAL].grund;
// insidan är genomskinlig bara innanför ramen (benfärgen är också ögat på ormen utanför)
const inne = (x, y) => x > KANT.x + 3 && y > KANT.y + 1;
const rader = g.rader.slice(0, HORN_RUTA.h).map((r, y) => r.slice(0, HORN_RUTA.w).split('').map((c, x) => c === INSIDAN && inne(x, y) ? '.' : c).join(''));
const pal = Object.fromEntries(Object.entries(g.pal).filter(([k]) => rader.some(r => r.includes(k))));
const ut = { horn: { val: HORN_VAL, w: HORN_RUTA.w, h: HORN_RUTA.h, kant: KANT, rader, pal } };
const text = `// GENERERAD av bildstil/guitillspelet.cjs ur bildstil/gui.json (steg 5.3.1.4). Ändra inte här: ändra i bildstilen och kör skriptet.
// Gränssnittets bilder: hörnet på panelerna (det övre vänstra; ui/ram.ts speglar det till de andra).
export interface GuiBild { w: number; h: number; rader: string[]; pal: Record<string, string> }
export const GUI: { horn: GuiBild & { val: string; kant: { x: number; y: number } } } = ${JSON.stringify(ut, null, 1)};
`;
fs.writeFileSync(path.join(BS, '..', 'src', 'guibilder.ts'), text);
console.log(`src/guibilder.ts: hörnet ${HORN_VAL} ${HORN_RUTA.w} × ${HORN_RUTA.h}, ${Math.round(text.length / 1024)} KB`);
