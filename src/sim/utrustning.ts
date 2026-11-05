// Utrustningen (steg 2.3.1): platserna där en person har saker (händerna, kroppen i två lager, huvudet, benen och
// fötterna), vad saker väger och hur många händer de tar. Vikten står i sakregistret (vikt, hander, rymmer i saker.ts,
// viktOf). Hur mycket en hand orkar räknas i lager.ts (handOrkar, steg 6.1.8). En sak tar en hand om den som håller den
// orkar det med en, annars båda, och är den för tung går den inte att hålla (handerFor). Bördan bärs i de händer som är
// fria (handPlatser), och varje hand rymmer ett slag i taget; ett slag som väger mer än en hand orkar tar båda (ryms).
// Korgen tar en hand men rymmer mer, av vilka slag som helst.
// Kläderna (steg 2.3.2) sitter på kroppens platser (klad.plats i saker.ts). Den som saknar ett plagg på en plats tar på
// sig ett som är fritt: sitt eget först, sedan byns, sedan ett lånat (stepKlader, varje timme). Plagget är på sig (Ting.bar)
// tills det är utslitet (lager.ts, wearStore) eller den som har det dör. Kläderna väger: det man har på sig dras av från
// inget mot händerna (steg 6.1.8), men i strid gör de en tung (strid.ts), och de skyddar mot kylan (kladVarme, steg.ts).
// Bältet (steg 2.3.3) är ett plagg med en krok: när man bär hem hänger redskapet i det (iBaltet), så det tar inga händer
// och bördan får båda händerna. En korg hänger inte där; den rymmer bördan.
// En ny plats blir en rad i PLATSER.
import { Person, State, Task } from './typer';
import { KLAD_SLAG, SAKER, viktOf } from './saker';
import { heldBy, Ting, tingOf } from './agande';
import { kvEffekt } from './kvalitet';
import { BYN, lends } from './egendom';
import { KROPP, living } from './folk';
import { temperature } from './vader';
import { bordSlag, carryKind, handOrkar } from './lager';
import { balans } from './balans';

export const UTRUSTNING = balans('utrustning', {
  kropp: 5, // det man har på sig väger lätt mot vad händerna orkar: i strid är man tung av kläder som väger så här många gånger det händerna orkar (strid.ts)
  maxVarme: 0.95, // ett plagg tar högst bort så stor del av kylan (kladVarme)
});

// platserna, i den ordning personrutan visar dem. hand = en hand att hålla saker och bördan i
interface PlatsDef { namn: string; ikon: string; hand?: true }
const DEF = {
  hoger: { namn: 'Höger hand', ikon: '✋', hand: true },
  vanster: { namn: 'Vänster hand', ikon: '🤚', hand: true },
  inre: { namn: 'Kropp, inre lager', ikon: '👕' },
  yttre: { namn: 'Kropp, yttre lager', ikon: '🧥' },
  huvud: { namn: 'Huvud', ikon: '🧢' },
  ben: { namn: 'Ben', ikon: '👖' },
  fotter: { namn: 'Fötter', ikon: '🥾' },
  balte: { namn: 'Bälte', ikon: '➰' },
  krok: { namn: 'I bältet', ikon: '🪝' }, // redskapet som hänger i bältet medan man bär
} satisfies Record<string, PlatsDef>;
export type Plats = keyof typeof DEF;
export const PLATSER: Record<Plats, PlatsDef> = DEF;
export const PLATS_LIST = Object.keys(DEF) as Plats[];

// hur många händer p behöver för en sak av slaget k: låst i registret, annars en om hen orkar det med en hand, två om
// hen orkar det med båda, och 0 om den är för tung
export function handerFor(s: State, p: Person, k: string): 0 | 1 | 2 {
  const d = SAKER[k];
  if (d?.hander) return d.hander;
  const b = viktOf(k), h = handOrkar(s, p);
  return b <= h ? 1 : b <= 2 * h ? 2 : 0;
}
// redskapet i handen och hur många händer det tar (för tungt = båda)
export function iHanden(s: State, p: Person): { ting: Ting; hander: 1 | 2 } | undefined {
  const t = heldBy(s, p);
  return t && { ting: t, hander: handerFor(s, p, t.k) === 1 ? 1 : 2 };
}
// redskapet i handen hänger i bältet när p bär: p har ett bälte på sig och redskapet är inte en korg (steg 2.3.3)
export function iBaltet(s: State, p: Person, h = iHanden(s, p)) {
  return !!h && !SAKER[h.ting.k]?.rymmer && tingOf(s).some(t => t.bar === p.id && SAKER[t.k]!.klad!.krok);
}
// platserna för bördan (steg 6.1.8): de fria händerna, var och en med vad den orkar (i vikt) och ett slag i taget, eller
// korgen, som tar en hand men rymmer mer av vilka slag som helst (aldrig mer än båda händerna orkar). Ett redskap i en
// hand lämnar den andra fri, och ett redskap i bältet lämnar båda
export interface HandPlats { hand: 'hoger' | 'vanster'; kap: number; korg?: true }
export function handPlatser(s: State, p: Person): HandPlats[] {
  const H = handOrkar(s, p), h = iHanden(s, p);
  if (!h || iBaltet(s, p, h)) return [{ hand: 'hoger', kap: H }, { hand: 'vanster', kap: H }];
  const rymmer = SAKER[h.ting.k]?.rymmer;
  if (rymmer) return [{ hand: 'hoger', kap: Math.min(rymmer, 2 * H), korg: true }, ...(h.hander === 1 ? [{ hand: 'vanster' as const, kap: H }] : [])];
  return h.hander === 1 ? [{ hand: 'vanster', kap: H }] : [];
}
// hur bördan b (slag → vikt) läggs i platserna: det som ligger i varje plats, eller undefined om den inte ryms. Varje
// hand tar ett slag; ett enda slag med två fria händer får ta båda. I korgen ryms alla slag, och den andra handen tar
// ett. Man bär alltid minst en sak, hur tung den än är för en (barnet med en sten)
export type Fordelning = [string, number][][];
export function fordela(pl: HandPlats[], b: Record<string, number>): Fordelning | undefined {
  const slag = Object.entries(b).filter(x => x[1] > 1e-9).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const r: Fordelning = pl.map(() => []);
  if (!slag.length) return r;
  if (!pl.length) return undefined;
  const ki = pl.findIndex(x => x.korg), E = 1e-9;
  const en = slag.length === 1 && Math.abs(slag[0][1] - viktOf(slag[0][0])) < E; // en enda sak
  if (ki >= 0) {
    const fri = pl.findIndex(x => !x.korg), alla = slag.reduce((a, x) => a + x[1], 0);
    for (const c of fri >= 0 ? slag : []) if (c[1] <= pl[fri].kap + E && alla - c[1] <= pl[ki].kap + E) { r[fri].push(c); r[ki].push(...slag.filter(x => x !== c)); return r; }
    if (alla <= pl[ki].kap + E || en) { r[ki].push(...slag); return r; }
    return undefined;
  }
  if (slag.length === 1 && pl.length === 2) {
    const [k, v] = slag[0];
    if (v <= pl[0].kap + E) { r[0].push([k, v]); return r; }
    if (v <= pl[0].kap + pl[1].kap + E || en) { r[0].push([k, v / 2]); r[1].push([k, v / 2]); return r; }
    return undefined;
  }
  if (slag.length > pl.length) return undefined;
  for (let i = 0; i < slag.length; i++) { if (slag[i][1] > pl[i].kap + E && !en) return undefined; r[i].push(slag[i]); }
  return r;
}
// ryms bördan b i p:s fria händer?
export const ryms = (s: State, p: Person) => { const pl = handPlatser(s, p); return (b: Record<string, number>) => !!fordela(pl, b); };
// är bördan full: ryms inte en sak till av det arbetet ger (steg 6.1.8)?
export function fullBorda(s: State, p: Person, t: Task) {
  const b = bordSlag(t), k = carryKind(t.act);
  return !fordela(handPlatser(s, p), { ...b, [k]: (b[k] ?? 0) + viktOf(k) });
}
// hur mycket p kan bära i de fria händerna, i vikt (för texterna och testerna)
export const bordPlats = (s: State, p: Person) => handPlatser(s, p).reduce((a, x) => a + x.kap, 0);
// vad som finns på varje plats: redskapet i den eller de händer det tar (höger först), eller i bältet när p bär, bördan i
// de fria händerna (eller i korgen), och plaggen p har på sig på kroppens platser
export function utrustning(s: State, p: Person, bar: boolean): Record<Plats, { ting?: Ting; borda?: true }> {
  const r = Object.fromEntries(PLATS_LIST.map(k => [k, {}])) as Record<Plats, { ting?: Ting; borda?: true }>;
  let h = iHanden(s, p);
  if (h && bar && iBaltet(s, p, h)) { r.krok.ting = h.ting; h = undefined; }
  if (h) { r.hoger.ting = h.ting; if (h.hander === 2) r.vanster.ting = h.ting; }
  if (bar) {
    if (!h) { r.hoger.borda = true; r.vanster.borda = true; }
    else { if (SAKER[h.ting.k]?.rymmer) r.hoger.borda = true; if (h.hander === 1) r.vanster.borda = true; }
  }
  for (const t of paSig(s, p)) r[SAKER[t.k]!.klad!.plats as Plats].ting = t;
  return r;
}

// vad av bördan som ligger i varje hand, och hur mycket (i vikt), som fliken, figuren i Utrustning och kartan visar
// (steg 6.1.2): fördelningen i händerna (fordela, steg 6.1.8). Ryms bördan inte (fler slag än händer) läggs resten i höger
export type IHanden = Partial<Record<'hoger' | 'vanster', { k: string; v: number }>>;
export function bordaIHander(s: State, p: Person, t: Task | undefined, u: ReturnType<typeof utrustning>): IHanden {
  const r: IHanden = {};
  if (!t || (!u.hoger.borda && !u.vanster.borda)) return r;
  const b = bordSlag(t), pl = handPlatser(s, p), f = fordela(pl, b);
  if (!Object.keys(b).length || !pl.length) return r;
  const sum = (x: [string, number][]) => x.reduce((a, y) => a + y[1], 0);
  if (f) { pl.forEach((x, i) => { if (f[i].length) r[x.hand] = { k: [...f[i]].sort((a, c) => c[1] - a[1])[0][0], v: sum(f[i]) }; }); return r; }
  const slag = Object.entries(b).sort((x, y) => y[1] - x[1]);
  if (pl.length > 1 && slag.length === 1) { r[pl[0].hand] = { k: slag[0][0], v: slag[0][1] / 2 }; r[pl[1].hand] = { k: slag[0][0], v: slag[0][1] / 2 }; }
  else if (pl.length > 1) { r[pl[1].hand] = { k: slag[1][0], v: slag[1][1] }; r[pl[0].hand] = { k: slag[0][0], v: sum(slag) - slag[1][1] }; }
  else r[pl[0].hand] = { k: slag[0][0], v: sum(slag) };
  return r;
}

// ---------- kläderna (steg 2.3.2) ----------
// plaggen p har på sig
export const paSig = (s: State, p: Person) => tingOf(s).filter(t => t.bar === p.id);
// p har ett bälte på sig (där reservvapnet hänger i strid, steg 3.7.7)
export const harBalte = (s: State, p: Person) => tingOf(s).some(t => t.bar === p.id && SAKER[t.k]?.klad?.krok);
// vad plaggen väger, i vikt
export const paSigVikt = (s: State, p: Person) => { let v = 0; for (const t of tingOf(s)) if (t.bar === p.id) v += viktOf(t.k); return v; };
// hur stor del av kylan plagget t (av slaget k) tar bort: ett finare plagg värmer lite mer (kvalitet.ts)
export const kladSkydd = (k: string, t?: { q?: number }) => Math.min(UTRUSTNING.maxVarme, (SAKER[k]?.klad?.varme ?? 0) * kvEffekt(t));
// hur mycket kläderna skyddar mot kylan (0 = inget, 1 = helt): varje plagg tar bort sin del av det som är kvar
export function kladVarme(s: State, p: Person) {
  let kvar = 1;
  for (const t of tingOf(s)) if (t.bar === p.id) kvar *= 1 - kladSkydd(t.k, t);
  return 1 - kvar;
}
// i vilken ordning p tar ett plagg: sitt eget, byns, ett lånat. Inom det: bäst skick, och sedan det första bland tingen
const rang = (p: Person, t: Ting) => t.agare === p.id ? 0 : t.agare === BYN ? 1 : 2;
// varje timme: den som saknar ett plagg på en plats tar på sig ett som är fritt (ingen har det på sig, i handen eller i
// bördan), och som hen får ta
export function stepKlader(s: State) {
  if (!tingOf(s).some(t => SAKER[t.k]?.klad)) return;
  const kallt = temperature(s) < KROPP.kladTemp;
  for (const p of living(s)) {
    // för varm (steg 2.3.4): de varma plaggen tas av, och tas på igen först när det är kallt och kroppen inte är varmare än idealet.
    // Bältet värmer inte och sitter kvar
    if (p.warm > KROPP.forVarm) for (const t of paSig(s, p)) if (SAKER[t.k]!.klad!.varme > 0) t.bar = undefined;
    const har = new Set(paSig(s, p).map(t => SAKER[t.k]!.klad!.plats));
    for (const k of KLAD_SLAG) {
      const pl = SAKER[k]!.klad!.plats;
      if (har.has(pl) || (SAKER[k]!.klad!.varme > 0 && (!kallt || p.warm > 1))) continue;
      let best: Ting | undefined;
      for (const t of tingOf(s)) {
        if (t.k !== k || t.bar !== undefined || t.hos !== undefined || t.lass !== undefined || t.halv || !lends(s, t.agare, p)) continue;
        if (!best || rang(p, t) < rang(p, best) || (rang(p, t) === rang(p, best) && t.c > best.c)) best = t;
      }
      if (!best) continue;
      best.bar = p.id; best.x = best.y = best.vid = undefined;
      har.add(pl);
    }
  }
}
