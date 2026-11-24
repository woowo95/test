// Det lilla av tron som resten av spelet frågar om: om en ruta är helig, om någon är präst, kön till ritualerna och gravgåvan. Egen fil utan
// tunga beroenden, eftersom lager, skogen, kläderna, döden och relationerna läses tidigt (kult.ts läser dem).
import { Person, State } from './typer';
import type { Ting } from './agande';
import type { Ritual, RitualId } from './kult';
import { balans } from './balans';
import { dagNr } from './tid';
// den heliga platsens värde i budet En helig plats (steg 10.3.10): rutan
export const heligVarde = (x: number, y: number) => `${x},${y}`;
// platsen vanhelgas: den förlorar sitt bud men visas kvar (steg 10.3.10)
export function vanhelgaPlats(s: State, h: { x: number; y: number; tro: number; skandad?: number }) {
  h.skandad = s.now;
  const tr = s.tron?.find(t => t.id === h.tro), v = heligVarde(h.x, h.y);
  if (tr?.bud) tr.bud = tr.bud.filter(b => !(b.id === 'helig' && b.v === v));
}
export const heligRuta = (s: State, x: number, y: number) => !!s.heliga?.some(h => h.x === x && h.y === y); // där fälls och byggs inget
export const arPrast = (s: State, p: Person) => !!s.tron?.some(t => t.prast === p.id);
// festen vid högtiden (steg 10.7.19): en högtid med gille blir en fest för hela byn. Festdagen är dygnet då den hålls, från
// morgonen till midnatt; x, y är festplatsen. at = så många som åt vid gillet, fram = de som uppträdde och vann = hur många matcher var och en vann
// gillet börjar klockan tim, och hela festdagen är lusten att samla till en match och att uppträda lust gånger större. Den som
// hör musik eller sång den dagen dansar, och glädjen blir dans gånger större
export const FEST = balans('fest', { tim: 16, lust: 3, dans: 1.3, brollopFore: 2 }); // brollopFore: bröllopet utlyses så många timmar innan det börjar (en månad i spelet), så att festmåltiden hinner lagas (steg 10.7.28)
export interface Fest { tro: number; namn: string; dag: number; x: number; y: number; at: number; fram: string[]; vann: Record<string, number> }
export const festNu = (s: State) => !!s.fest && dagNr(s.now) === s.fest.dag;
export function festFram(s: State, namn: string) { if (festNu(s) && !s.fest!.fram.includes(namn)) s.fest!.fram.push(namn); }
export function festVann(s: State, namn: string[]) { if (festNu(s)) for (const n of namn) s.fest!.vann[n] = (s.fest!.vann[n] ?? 0) + 1; }
export function nyRitual(s: State, k: RitualId, d: Partial<Ritual> = {}) { (s.ritualKo ??= []).push({ k, start: s.now, slut: 0, x: d.x ?? 0, y: d.y ?? 0, ...d }); }
// den dödes saker (steg 10.3.5): två bud i den dödes tro. Gravgåvor: den finaste saken hen bar (på sig, i handen eller i bältet) följer hen,
// och bar hen inget den finaste hen ägde. Det den döde bar följer med: allt hen bar, och inget av det ärvs. Sakerna läggs på kroppen (med)
// och följer den i graven, på bålet eller i vattnet; graven minns dem. Utan bud ärvs allt
let vardeAv: (t: Ting) => number = t => t.q ?? 0;
// värdet av kyrkans egendom räknat i ved, för trons tyngd (steg 10.3.8); sätts av kult.ts, som läser värdena
let iVed: (o: Record<string, number>) => number = () => 0;
export const satEgendomVarde = (f: typeof iVed) => { iVed = f; };
export const egendomIVed = (o: Record<string, number>) => iVed(o);
export const satGravVarde = (f: typeof vardeAv) => { vardeAv = f; };
export function gravgava(s: State, p: Person) {
  const tr = s.tron?.find(t => t.id === p.tro), har = (id: string) => !!tr?.bud?.some(b => b.id === id);
  if (!tr) return;
  const bar = (s.ting ?? []).filter(t => t.bar === p.id || t.krok === p.id), agt = (s.ting ?? []).filter(t => t.agare === p.id && t.bar === undefined && t.krok === undefined);
  const finast = (l: Ting[]) => l.sort((a, b) => vardeAv(b) - vardeAv(a))[0];
  const med = new Set<Ting>(har('medfolj') ? bar : []);
  if (har('gravgava')) { const g = finast(bar.filter(t => !med.has(t))) ?? (med.size ? undefined : finast(agt)); if (g) med.add(g); }
  if (!med.size) return;
  s.ting = s.ting!.filter(t => !med.has(t));
  s.stat = s.stat ?? {}; s.stat.gravgava = (s.stat.gravgava ?? 0) + med.size;
  const kr = s.kvarlevor?.filter(k => k.k === 'kropp' && k.vem === p.id).pop();
  if (kr) { kr.med = [...med].map(t => t.k); kr.gods = [...med].map(t => ({ k: t.k, n: 1, c: t.c, ...(t.q !== undefined ? { q: t.q } : {}), ...(t.ber ? { ber: t.ber } : {}), t: s.now })); } // sakerna själva (steg 13.1.3)
}
// byta tro (steg 8.5.12): i samtal, när tron svikit en. Var och en har en tro i taget
export const BYTA = balans('bytatro', {
  tvivel: 0.5, bas: 0.02, // chansen att byta tro: tvivlet gånger tvivel, plus bas ...
  styrka: 150, // ... mindre ju starkare tron är (helt borta vid så här stark) ...
  oppen: 200, // ... och ju öppnare den egna tron är för andra (helt borta vid så här öppen)
});
export const bytaChans = (p: Person, oppen: number) => ((p.tvivel ?? 0) * BYTA.tvivel + BYTA.bas) * (1 - (p.troStyrka ?? 0) / BYTA.styrka) * (1 - oppen / BYTA.oppen);

// ---------- det heliga djuret (steg 10.3.15) ----------
// budet Ett heligt djur har värdet "art:storlek": arten och storleken (2–4) som räknades när budet föreslogs
// farorna över byn (dangers i val.ts, som sätter den här när den laddas: val.ts läser det mesta i spelet). Farorna nu, för de
// filer som inte kan läsa val.ts: djurhållningen frågar samma svältmått som valet av aktivitet (steg 10.2.1), och det heliga djuret
// och kyrkans bud frågar samma mått i jakten, slakten, ätandet och buden (steg 10.11.18)
let dangers: (s: State) => { kyla: boolean; svalt: boolean } = () => ({ kyla: false, svalt: false });
export const satFaror = (f: typeof dangers) => { dangers = f; };
export const farorNu = (s: State) => dangers(s);
export const heligtDjurVarde = (art: string, st: number) => `${art}:${st}`;
export const heligtDjurAv = (v: unknown) => { const [art, st] = String(v).split(':'); return { art, st: Number(st) || 2 }; };
// sakerna som bara arten ger: det råa köttet och skinnet (fylls av DJUR i redskap.ts). Det lagade, torkade och garvade minns inte djuret
export const SAK_ART: Record<string, string> = {};
// följer p ett bud av den här storleken? (kyrka.ts sätter det, som foljer)
let foljerSt: (p: Person, st: number) => boolean = () => false;
let brutet: (s: State, p: Person) => void = () => {};
export const satHeligtDjur = (f: typeof foljerSt, b: typeof brutet) => { foljerSt = f; brutet = b; };
// är arten helig för p? Jakten, slakten, avlivningen, ätandet och klädvalet frågar den här
export function heligtFor(s: State, p: Person, art: string | undefined): boolean {
  if (p.tro === undefined || !art) return false;
  const b = s.tron?.find(t => t.id === p.tro)?.bud?.find(q => q.id === 'heligtDjur' && heligtDjurAv(q.v).art === art);
  return !!b && foljerSt(p, heligtDjurAv(b.v).st);
}
// p låter bli: arten är helig och ingen nöd (svält, kyla) går före
export const heligtAvstar = (s: State, p: Person, art: string | undefined, nod = false) => !nod && heligtFor(s, p, art);
// p gjorde det ändå (i nöd): budet är brutet
export const heligtBrutet = (s: State, p: Person, art: string | undefined) => { if (heligtFor(s, p, art)) brutet(s, p); };

// ---------- maten som bud (steg 10.3.16) ----------
// kyrka.ts sätter krokarna: p låter bli saken k (råvaran eller rätten av den) för ett matbud, utom i svält, och bryter budet om hen ändå åt
const matKrok = { avstar: (_s: State, _p: Person, _k: string) => false, brutet: (_s: State, _p: Person, _k: string) => {} };
export const satMatBud = (avstar: typeof matKrok.avstar, brutet: typeof matKrok.brutet) => { matKrok.avstar = avstar; matKrok.brutet = brutet; };
export const matAvstar = (s: State, p: Person, k: string) => matKrok.avstar(s, p, k);
export const matBrutet = (s: State, p: Person, k: string) => matKrok.brutet(s, p, k);
