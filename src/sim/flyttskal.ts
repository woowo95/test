// Skälet att lämna byn (steg B.42, Att lämna byn i fliken Människan). När byn blir trång, missnöjd eller hungrig väljs den som
// går efter de egna skälen: flyttVikt är chansen gentemot de andra, större ju sämre hen mår och mindre för varje band till byn
// (registret BAND). Skälet sparas på den som går (p.flyttSkal): det som drar ner hens humör mest och byns skäl, och meningen som
// krönikan, notisen, personrutan och raden om en ledare som slutar säger. Texterna är mallarna k_flyttSkal och k_flytt
import { berattelse, kronikaBer, personFalt } from './berattelser';
import { REL, isParent, living, log, relKey } from './folk';
import { housesOf } from './byggnad';
import { moodOf } from './humor';
import { notis } from './notiser';
import { balans } from './balans';
import { Person, State } from './typer';
import { och, tal } from './ord';

export const LAMNA = balans('lamnaByn', {
  mar: 4, // den som mår som sämst har 1 + så mycket större chans att gå än den som mår bäst
  partner: 0.6, barn: 0.7, van: 0.9, hus: 0.5, ambete: 0.4, ledare: 0.25, // faktorn för varje band till byn
});
export type BynsSkal = 'trang' | 'missnoje' | 'hunger';
const BYNS: Record<BynsSkal, string> = { trang: 'byn hade blivit trång', missnoje: 'missnöjet i byn växte', hunger: 'maten räckte inte till alla' };
// prästens ämbete (styre.ts läses senare än den här filen)
export const ambeteKrok = { har: (_s: State, _p: Person): boolean => false };

// banden till byn: hur många p har av varje. Ett nytt band är en rad
const BAND: Record<'partner' | 'barn' | 'van' | 'hus' | 'ambete' | 'ledare', (s: State, p: Person, folk: Person[]) => number> = {
  partner: (_s, p, folk) => folk.some(q => q.id === p.partner) ? 1 : 0,
  barn: (_s, p, folk) => folk.filter(q => isParent(p, q)).length,
  van: (s, p, folk) => folk.filter(q => q.id !== p.partner && (s.rels[relKey(p.id, q.id)]?.op ?? 0) > REL.saknar).length,
  hus: (s, p) => housesOf(s).some(h => h.klar && h.ag !== undefined && (h.ag === p.id || h.ag === p.partner)) ? 1 : 0,
  ambete: (s, p) => ambeteKrok.har(s, p) ? 1 : 0,
  ledare: (s, p) => s.styre?.ledare === p.id ? 1 : 0,
};
export function flyttVikt(s: State, p: Person, folk = living(s)) {
  let v = 1 + LAMNA.mar * (1 - Math.max(0, Math.min(1, moodOf(p, s.now))));
  for (const b in BAND) v *= LAMNA[b as keyof typeof BAND] ** BAND[b as keyof typeof BAND](s, p, folk);
  return v;
}

// skälet sparas på p innan hen går: det som drar ner humöret mest av tankarna, annars av det andra i humöret
export function sattFlyttSkal(s: State, p: Person, byn?: BynsSkal) {
  const samst = (l: { text: string; v: number }[]) => l.filter(t => t.v < 0).sort((a, b) => a.v - b.v)[0]?.text;
  const alla: { namn: string; v: number }[] = []; moodOf(p, s.now, alla);
  const tanke = samst(p.thoughts.filter(t => t.until > s.now)) ?? samst(alla.map(d => ({ text: d.namn, v: d.v })));
  const b = byn && BYNS[byn];
  const text = tanke || b ? berattelse(s, 'k_flyttSkal', p.id, { ...personFalt(p), tanke, byn: b, Byn: b && b[0].toUpperCase() + b.slice(1) }) : undefined;
  return p.flyttSkal = { tanke, byn, text };
}
// raden om dem som gick: i krönikan och notisen, och i loggen om den inte redan står där. mal = varför de gick, i ord
export function flyttRad(s: State, med: Person[], vuxna: number, mal: string, o: { logg?: boolean; notis?: boolean } = {}) {
  const p = med[0], n = med.length - vuxna, ids = med.map(g => g.id);
  const vem = och(med.slice(0, vuxna).map(q => q.name)) + (n ? ` med ${n === 1 ? 'ett barn' : `${tal(n)} barn`}` : '');
  const text = kronikaBer(s, 'k_flytt', p.id, { ...personFalt(p), vem, mal, skal: p.flyttSkal?.text ?? '' }).trim();
  if (o.logg !== false) log(s, text, 'move', ids);
  if (o.notis !== false) notis(s, 'utflytt', text, ids);
}
