// Gränssnittets bilder till spelet (fas 5): läser gui.json, kör gui.js och skriver src/guibilder.ts.
// - Hörnet på panelerna (steg 5.3.1.4) är Björns val Ormen (bildstil v121): det övre vänstra hörnet ur ramen i grundens
//   färger, utskuret (HORN_RUTA), med panelens insida ('c' innanför ramen) genomskinlig. Spelet speglar det till de andra
//   tre hörnen. De andra hörnen (Ring med blad och Dubbel ögla) ligger kvar i gui.json om Björn ångrar sig.
// - Runstenarna och banden (steg 5.3.3.1) är Björns val g_runsten, g_band, q_tro, q_person och q_grannar: varje flik har
//   en sten i tre lägen (stängd, öppen, blek) och ett band överst i panelen. Stenarna och banden för Tro, Person och Grannar
//   ritas med bildstilens egna funktioner i gui.js (runsten, nyttBand), så att de blir exakt som de godkända bilderna.
// Kör från repots rot: node bildstil/guitillspelet.cjs.
const fs = require('fs'), path = require('path'), vm = require('vm');
const BS = __dirname, GUI = JSON.parse(fs.readFileSync(path.join(BS, 'gui.json'), 'utf8'));
const HORN_VAL = 'ormen', HORN_RUTA = { w: 48, h: 22 }, INSIDAN = 'c';
// ramens yttre kant i bilden: panelens vänstra kant ligger i kolumn 10 och den övre i rad 10
const KANT = { x: 10, y: 10 };
const g = GUI.horn[HORN_VAL].grund;
// insidan är genomskinlig bara innanför ramen (benfärgen är också ögat på ormen utanför)
const inne = (x, y) => x > KANT.x + 3 && y > KANT.y + 1;
const rader = g.rader.slice(0, HORN_RUTA.h).map((r, y) => r.slice(0, HORN_RUTA.w).split('').map((c, x) => c === INSIDAN && inne(x, y) ? '.' : c).join(''));
const pal = Object.fromEntries(Object.entries(g.pal).filter(([k]) => rader.some(r => r.includes(k))));

// ---------- runstenarna och banden ----------
// paletten som spelet (src/palett.ts): P.i(ramp, ton) och P.av(hex) ger färgen som hex
const PAL = fs.readFileSync(path.join(BS, '..', 'src', 'palett.ts'), 'utf8');
const RAMPER = Object.fromEntries([...PAL.matchAll(/id: '(\w+)'[^\n]*toner: \[([^\]]+)\]/g)].map(m => [m[1], m[2].match(/#[0-9a-f]{6}/g)]));
const P = { i: (r, t) => RAMPER[r][t], av: hex => hex.toLowerCase() };
const sb = { window: {}, VAL: [], GUI, Math, console };
vm.runInNewContext(fs.readFileSync(path.join(BS, 'gui.js'), 'utf8'), sb);
const R = sb.window.GUIRITA;
// en bild ritad med satt(x, y, hex) som rader och palett (genomskinligt där inget ritats)
function bild(w, h, rita) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  rita({ w, h, P, satt: (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; } });
  const farger = [...new Set(g.flat().filter(Boolean))], tecken = 'abcdefghijklmnopqrstuvwxyz';
  return { w, h, rader: g.map(r => r.map(c => c ? tecken[farger.indexOf(c)] : '.').join('')), pal: Object.fromEntries(farger.map((c, i) => [tecken[i], c])) };
}
// flikarna: id, huvudfärg, andrafärg, emblem och bandets mönster (för de tre som ritas här)
const NYA = { tro: ['barr', 'senap', 'ranka', R.EMB.tro || GUI.emblem.tro], person: ['rost', 'ben', 'parlor', R.EMB.hand], grannar: ['oliv', 'rost', 'hyddor', R.EMB.hus], tal: ['skiffer', 'senap', 'stenar', R.EMB.graf] }; // tal: platshållare för Byns tal (steg 9.3.2) tills Björn valt i bildstilen (f9_tal)
const FLIKAR = [...R.FLIK.map(f => [f[0], f[2], f[3]]), ...Object.entries(NYA).filter(([id]) => !R.FLIK.some(f => f[0] === id)).map(([id, [hu, an]]) => [id, hu, an])];
const runsten = {}, band = {};
for (const [id, hu, an] of FLIKAR) {
  const E = NYA[id]?.[3] || GUI.emblem[id], f = [id, '', hu, an, E];
  runsten[id] = Object.fromEntries(['stangd', 'oppen', 'blek'].map(l => [l, bild(R.SW, R.SH, B => R.runsten(B, 0, 0, f, l))]));
  if (GUI.band[id]) band[id] = GUI.band[id];
  else if (NYA[id]) {
    // nyttBand ritar en panel på 152 × 36 med bandet (140 × 26) i mitten; panelens bakgrund (de första 152 × 36 punkterna) hoppas över
    let n = 0;
    band[id] = bild(140, 26, B => R.nyttBand({ ...B, satt: (x, y, c) => { if (n++ >= 152 * 36) B.satt(x - 6, y - 5, c); } }, 0, 0, NYA[id][0], NYA[id][1], NYA[id][2], NYA[id][3]));
  }
}
const farg = Object.fromEntries(FLIKAR.map(([id, hu, an]) => [id, { hu: RAMPER[hu], an: RAMPER[an] }]));

// vågbandet längst ner i raden överst (steg 5.3.1.2): Björns ja till g_vag, en ruta som upprepas över hela bredden, och grunden bakom
const vag = { ...GUI.vag, bg: GUI.vagbg };
const ut = { horn: { val: HORN_VAL, w: HORN_RUTA.w, h: HORN_RUTA.h, kant: KANT, rader, pal }, runsten, band, farg, vag };
const text = `// GENERERAD av bildstil/guitillspelet.cjs ur bildstil/gui.json och gui.js (steg 5.3.1.4, 5.3.3.1 och 5.3.1.2). Ändra inte här:
// ändra i bildstilen och kör skriptet. Gränssnittets bilder: hörnet på panelerna (det övre vänstra; ui/ram.ts speglar det
// till de andra), flikarnas runstenar i tre lägen och banden överst i flikarna (ui/runstenar.ts), och flikarnas färger
// (huvudfärgen och andrafärgen, fyra toner var), och vågbandet under raden överst (ui/raden.ts).
export interface GuiBild { w: number; h: number; rader: string[]; pal: Record<string, string> }
export type StenLage = 'stangd' | 'oppen' | 'blek';
export const GUI: {
  horn: GuiBild & { val: string; kant: { x: number; y: number } };
  runsten: Record<string, Record<StenLage, GuiBild>>;
  band: Record<string, GuiBild>;
  farg: Record<string, { hu: string[]; an: string[] }>;
  vag: GuiBild & { bg: string };
} = ${JSON.stringify(ut)};
`;
fs.writeFileSync(path.join(BS, '..', 'src', 'guibilder.ts'), text);
console.log(`src/guibilder.ts: hörnet ${HORN_VAL} ${HORN_RUTA.w} × ${HORN_RUTA.h}, runstenar ${Object.keys(runsten).join(' ')}, band ${Object.keys(band).join(' ')}, vågbandet ${vag.w} × ${vag.h}, ${Math.round(text.length / 1024)} KB`);
