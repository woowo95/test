// Proteserna (steg 9.5.11, Hälsosystemet i detalj: Proteser): den som förlorat en del får en protes när byn har en ledig. Träbenet
// och kryckan görs bara vid snickarbänken och ger tillbaka ungefär hälften av gångfarten för ett förlorat ben eller en fot, kroken
// görs av virke bara vid snickarbänken och ger tillbaka en del av greppet, och ögonlappen görs av skinn för hand (fortare och bättre
// vid slöjdbänken) och är bara utseende. Hur mycket varje protes ger står i PROTES_FEL (halsa.ts); här vilka delar den passar,
// vem som behöver en och att den sätts på
import { tingOf } from './agande';
import { living } from './folk';
import { type Kroppsdel, PA_DELEN } from './halsa';
import { count } from './folk';
import { Person, State } from './typer';

export const PROTESER: Record<string, { namn: string; delar: Kroppsdel[] }> = {
  traben: { namn: 'Träben', delar: ['benV', 'benH', 'fotV', 'fotH'] },
  krycka: { namn: 'Krycka', delar: ['benV', 'benH', 'fotV', 'fotH'] },
  krok: { namn: 'Krok', delar: ['handV', 'handH'] },
  ogonlapp: { namn: 'Ögonlapp', delar: ['ogaV', 'ogaH'] },
};
export const PROTES_LIST = Object.keys(PROTESER);
// de förlorade delarna (de översta, inte det som satt på dem) som saknar en protes av slaget k
const utan = (p: Person, k: string) => (p.saknas ?? []).filter(d => PROTESER[k].delar.includes(d) && !p.protes?.[d] && !(p.saknas ?? []).some(u => PA_DELEN[u]?.includes(d) && PROTESER[k].delar.includes(u)));
// hur många byn vill ha av protesen k (REDSKAPMAL i forradsmal.ts): en per förlorad del utan protes. Kryckan och träbenet delar på benen
export const protesVill = (s: State, k: string) => living(s).reduce((n, p) => n + (k === 'krycka' ? 0 : utan(p, k === 'traben' ? 'traben' : k).length), 0);
// en gång i timmen: den som saknar en protes får en ledig från byns förråd eller sin egen, och den som tappat sin (den gick sönder)
// har ingen längre
export function protesTimme(s: State) {
  for (const p of living(s)) {
    for (const d of Object.keys(p.protes ?? {}) as Kroppsdel[]) if (!tingOf(s).some(t => t.pa === p.id && t.k === p.protes![d])) delete p.protes![d];
    if (p.protes && !Object.keys(p.protes).length) delete p.protes;
    if (!p.saknas?.length) continue;
    for (const k of PROTES_LIST) for (const d of utan(p, k)) {
      const t = tingOf(s).find(q => q.k === k && q.pa === undefined && q.hos === undefined && q.lass === undefined && q.bar === undefined && (q.agare === 0 || q.agare === p.id));
      if (!t) continue;
      t.pa = p.id; t.bar = p.id; t.agare = p.id; t.x = undefined; t.y = undefined; // hen har den på sig
      p.protes ??= {};
      for (const u of [d, ...PA_DELEN[d] ?? []]) if (p.saknas.includes(u)) p.protes[u] = k;
      count(s, 'protesPa');
    }
  }
}
