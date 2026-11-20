// Proteserna (steg 9.5.11, Hälsosystemet i detalj: Proteser): den som förlorat en del får en protes när byn har en ledig. Träbenet
// och kryckan görs bara vid snickarbänken och ger tillbaka ungefär hälften av gångfarten för ett förlorat ben eller en fot, kroken
// görs av virke bara vid snickarbänken och ger tillbaka en del av greppet, och ögonlappen görs av skinn för hand (fortare och bättre
// vid slöjdbänken) och är bara utseende. Här vilka delar varje protes passar och hur mycket den ger (fel),
// vem som behöver en, och vem som får den först när en vårdare sätter den på (steg 10.11.19)
import { tingOf, type Ting, ingenHar } from './agande';
import { living } from './folk';
import { type Kroppsdel, PA_DELEN } from './halsa';
import { count } from './folk';
import { Person, State } from './typer';

// fel: hur mycket en förlorad del med protesen fattas (delFel i halsa.ts, steg 9.5.11): träbenet och kryckan ger tillbaka ungefär hälften
// av gången, kroken en del av greppet, och ögonlappen är bara utseende
const BENDELAR: Kroppsdel[] = ['benV', 'benH', 'fotV', 'fotH'];
export const PROTESER: Record<string, { namn: string; delar: Kroppsdel[]; fel: number }> = {
  traben: { namn: 'Träben', delar: BENDELAR, fel: 0.25 },
  krycka: { namn: 'Krycka', delar: BENDELAR, fel: 0.25 },
  krok: { namn: 'Krok', delar: ['handV', 'handH'], fel: 0.6 },
  ogonlapp: { namn: 'Ögonlapp', delar: ['ogaV', 'ogaH'], fel: 1 },
};
export const PROTES_LIST = Object.keys(PROTESER);
// de förlorade delarna (de översta, inte det som satt på dem) som saknar en protes av slaget k
const utan = (p: Person, k: string) => (p.saknas ?? []).filter(d => PROTESER[k].delar.includes(d) && !p.protes?.[d] && !(p.saknas ?? []).some(u => PA_DELEN[u]?.includes(d) && PROTESER[k].delar.includes(u)));
// hur många byn vill ha av protesen k (REDSKAPMAL i forradsmal.ts): en per förlorad del utan protes. Kryckan och träbenet delar på benen
export const protesVill = (s: State, k: string) => living(s).reduce((n, p) => n + (k === 'krycka' ? (brutetBen(p) && !p.krycka ? 1 : 0) : utan(p, k).length), 0); // kryckan till den med ett brutet ben (steg 9.5.28)
const brutetBen = (p: Person) => (p.skador ?? []).some(w => w.k === 'benbrott' && BENDELAR.includes(w.d));
// en protes av slaget k som ingen har på sig eller bär, och som ägaren får ta: i byns förråd eller hens egen
const fri = (t: Ting, k: string, agare: (a: number) => boolean) => t.k === k && t.pa === undefined && ingenHar(t) && agare(t.agare);
const ledig = (s: State, q: Person, k: string) => tingOf(s).filter(t => fri(t, k, a => a === 0 || a === q.id));
// hur mycket q behöver en protes av slaget k: de förlorade delarna den passar, och kryckan till den med ett brutet ben
const behov = (q: Person, k: string) => utan(q, k).length + (k === 'krycka' && brutetBen(q) && !q.krycka ? 1 : 0);
// den protes q ska få (steg 10.11.19): en ledig av ett slag hen behöver, när den som behöver den mest får den först. De som behöver
// slaget ställs i ordning efter behovet (de som saknar fler delar först); finns det n lediga får de n första en var
export function protesFor(s: State, q: Person): { k: string; t: Ting } | undefined {
  if (!q.saknas?.length && !brutetBen(q)) return undefined;
  for (const k of ['krycka', ...PROTES_LIST.filter(x => x !== 'krycka')]) {
    if (!behov(q, k)) continue;
    const fria = ledig(s, q, k);
    if (!fria.length) continue;
    const fore = living(s).filter(o => o !== q && (behov(o, k) > behov(q, k) || behov(o, k) === behov(q, k) && behov(o, k) > 0 && o.id < q.id)).length;
    if (fore < tingOf(s).filter(t => fri(t, k, a => a === 0)).length + (fria.some(t => t.agare === q.id) ? 1 : 0)) return { k, t: fria.find(t => t.agare === q.id) ?? fria[0] };
  }
  return undefined;
}
// vårdaren sätter protesen på q (behandlingen protes i VARD, halsa.ts): hen har den på sig
export function protesPa(s: State, q: Person) {
  const v = protesFor(s, q);
  if (!v) return;
  const { k, t } = v;
  t.pa = q.id; t.bar = q.id; t.x = undefined; t.y = undefined;
  if (k === 'krycka' && brutetBen(q) && !q.krycka) { q.krycka = 1; count(s, 'kryckaPa'); return; }
  t.agare = q.id;
  const d = utan(q, k)[0];
  p_protes(q, d, k);
  count(s, 'protesPa');
}
function p_protes(q: Person, d: Kroppsdel, k: string) {
  q.protes ??= {};
  for (const u of [d, ...PA_DELEN[d] ?? []]) if (q.saknas!.includes(u)) q.protes[u] = k;
}
// en gång i timmen: kryckan tas av när benet läkt, och den som tappat sin protes (den gick sönder) har ingen längre
export function protesTimme(s: State) {
  for (const p of living(s)) {
    if (p.krycka && !brutetBen(p) && !Object.values(p.protes ?? {}).includes('krycka')) { const t = tingOf(s).find(q => q.k === 'krycka' && q.pa === p.id); if (t) { t.pa = undefined; t.bar = undefined; } p.krycka = undefined; }
    for (const d of Object.keys(p.protes ?? {}) as Kroppsdel[]) if (!tingOf(s).some(t => t.pa === p.id && t.k === p.protes![d])) delete p.protes![d];
    if (p.protes && !Object.keys(p.protes).length) p.protes = undefined;
  }
}
