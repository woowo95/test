import { GUI, type GuiBild, type StenLage } from '../guibilder';
import { bildDuk } from './bildduk';

// Runstenarna och banden (steg 5.3.3.1): flikknapparna är runstenar i flikens färger med emblemet i mitten, i tre lägen:
// stängd, öppen (fylld med flikens färg) och blek (fliken går inte att öppna än). Överst i varje flik står dess band med
// emblemet. Bilderna är Björns val i bildstilen (g_runsten, g_band, q_tro, q_person, q_grannar), ritade med bildstilens
// funktioner i src/guibilder.ts (bildstil/guitillspelet.cjs). En punkt i bilden är en punkt på skärmen, som hörnen.
// Registret: vilken bild varje flik har (flikens id i panel.ts → bildens id i bildstilen). Seder, Tro och Styre är var sin sten
// (steg 9.3.1)
export const STEN: Record<string, string> = {
  kronika: 'kronika', tal: 'tal', seder: 'seder', styre: 'styre', religion: 'tro', grannar: 'grannar', teknik: 'teknik', person: 'person', forrad: 'forrad',
};
const urls = new Map<GuiBild, string>();
function url(b: GuiBild) {
  let u = urls.get(b);
  if (u) return u;
  u = bildDuk(b).toDataURL(); urls.set(b, u);
  return u;
}
const img = (b: GuiBild, cls: string) => `<img class="${cls}" src="${url(b)}" width="${b.w}" height="${b.h}" alt="" draggable="false">`;
// knappens innehåll: stenen i alla tre lägen (css visar den som gäller) och namnet, som syns när musen är över
export function stenHtml(flik: string, namn: string) {
  const s = GUI.runsten[STEN[flik]];
  if (!s) return namn;
  return (['stangd', 'oppen', 'blek'] as StenLage[]).map(l => img(s[l], 'sten ' + l)).join('') + `<span class="stennamn">${namn}</span>`;
}
// bandet överst i en flik (tomt för en flik som inte har något)
// Bandet är dubbelt så stort (steg 6.9.3), och bandets remsa fortsätter rakt ut till panelens kanter på båda sidor om
// medaljongen, i bandets vanligaste färg med konturen ('a') runt: --bf är remsan och --bk konturen
const fargerna = new Map<GuiBild, [string, string]>();
function bandFarg(b: GuiBild): [string, string] {
  let f = fargerna.get(b);
  if (f) return f;
  const n: Record<string, number> = {};
  for (const r of b.rader) for (const k of r) if (k !== '.' && k !== 'a') n[k] = (n[k] ?? 0) + 1;
  const mest = Object.keys(n).sort((x, y) => n[y] - n[x])[0];
  f = [b.pal[mest] ?? '#61767a', b.pal.a ?? '#24201d']; fargerna.set(b, f);
  return f;
}
// medaljongen mitt i bandet är fylld (steg 13.10.30): det genomskinliga inuti ringen (det som inte går att nå från bildens kant)
// får skissens pergament, så att remsan inte syns genom den
const MEDALJONG = 18; // medaljongens halva bredd i punkter
const PERGAMENT = '#dad0bb';
const fyllda = new Map<GuiBild, GuiBild>();
export function fylldMedaljong(b: GuiBild): GuiBild {
  let f = fyllda.get(b);
  if (f) return f;
  const g = b.rader.map(r => [...r]), ute: [number, number][] = [];
  const ut = (x: number, y: number) => { if (g[y]?.[x] === '.') { g[y][x] = ' '; ute.push([x, y]); } };
  for (let x = 0; x < b.w; x++) { ut(x, 0); ut(x, b.h - 1); }
  for (let y = 0; y < b.h; y++) { ut(0, y); ut(b.w - 1, y); }
  while (ute.length) { const [x, y] = ute.pop()!; ut(x + 1, y); ut(x - 1, y); ut(x, y + 1); ut(x, y - 1); }
  const ledig = [...'0123456789'].find(k => !b.pal[k])!;
  f = { ...b, pal: { ...b.pal, [ledig]: PERGAMENT }, rader: g.map(r => r.map((k, x) => k === ' ' ? '.' : k === '.' && Math.abs(x + 0.5 - b.w / 2) < MEDALJONG ? ledig : k).join('')) };
  fyllda.set(b, f);
  return f;
}
export function bandHtml(flik: string) {
  const b0 = GUI.band[STEN[flik]];
  if (!b0) return '';
  const b = fylldMedaljong(b0);
  const [bf, bk] = bandFarg(b0);
  return `<div class="band" aria-hidden="true" style="--bf:${bf};--bk:${bk}"><img src="${url(b)}" width="${b.w * 2}" height="${b.h * 2}" alt="" draggable="false"></div>`;
}
