import { GUI, type GuiBild, type StenLage } from '../guibilder';

// Runstenarna och banden (steg 5.3.3.1): flikknapparna är runstenar i flikens färger med emblemet i mitten, i tre lägen:
// stängd, öppen (fylld med flikens färg) och blek (fliken går inte att öppna än). Överst i varje flik står dess band med
// emblemet. Bilderna är Björns val i bildstilen (g_runsten, g_band, q_tro, q_person, q_grannar), ritade med bildstilens
// funktioner i src/guibilder.ts (bildstil/guitillspelet.cjs). En punkt i bilden är en punkt på skärmen, som hörnen.
// Registret: vilken bild varje flik har (flikens id i panel.ts → bildens id i bildstilen). Byn har sedernas sten tills
// Björn godkänt en egen (steg 5.3.3.2); seder, religion och styre är delarna i Byn och ger bara banden
export const STEN: Record<string, string> = {
  folk: 'folket', kronika: 'kronika', byn: 'seder', seder: 'seder', styre: 'styre', religion: 'tro', grannar: 'grannar', teknik: 'teknik', person: 'person',
};
const urls = new Map<GuiBild, string>();
function url(b: GuiBild) {
  let u = urls.get(b);
  if (u) return u;
  const c = document.createElement('canvas'); c.width = b.w; c.height = b.h;
  const g = c.getContext('2d')!;
  b.rader.forEach((rad, y) => [...rad].forEach((k, x) => { const f = b.pal[k]; if (f) { g.fillStyle = f; g.fillRect(x, y, 1, 1); } }));
  u = c.toDataURL(); urls.set(b, u);
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
export function bandHtml(flik: string) {
  const b = GUI.band[STEN[flik]];
  return b ? `<div class="band" aria-hidden="true">${img(b, '')}</div>` : '';
}
