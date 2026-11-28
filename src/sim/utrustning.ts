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
// Bältet (steg 2.3.3) är ett plagg med två krokar (steg 7.1.1): när man bär hem hänger redskapet i det (iBaltet), så det
// tar inga händer och bördan får båda händerna, och på den andra kroken hänger ett eget redskap medan man arbetar med ett
// annat (iKroken i agande.ts), så att kniven och yxan kan följa med. Bara det som sakregistret säger hänger i bältet
// (SakDef.hanger: kniven, yxan och spaden) hänger där; spjuten, metspöt och vattensäcken hänger på axeln.
// Axelremmen (steg 7.1.2) är ett plagg av skinn över axeln: när man bär hem hänger redskapet som hör till axeln i den (platsen
// Axeln), så det tar inga händer, precis som bältets redskap. Var redskapet hänger säger hangerVid.
// En ny plats blir en rad i PLATSER.
import { turMal } from './eld';
import { rovarFlockar } from './rovare';
import { HOUR, Person, State, Task } from './typer';
import { KLAD_SLAG, SAKER, viktOf } from './saker';
import { heldBy, iKroken, Ting, allaTing, redskapSlitet, tingOf } from './agande';
import { kvEffekt, kvHaller } from './kvalitet';
import { ACTS } from './handlingar';
import { BYN, lends } from './egendom';
import { ALDER, ageOf, count, living } from './folk';
import { spadbarnAv } from './barsele';
import { snoPaMarken, temperature } from './vader';
import { bordSlag, carryKind, handOrkar } from './lager';
import { balans } from './balans';
import { SAK_ART, arPrast, heligtAvstar, heligtBrutet } from './kultlatt';
import { farorNu } from './kult';
import { KLADER, KLADMATERIAL, NAKEN_PLATS, kladAv, kladSkyddStrid } from './klader';
import { fordonI, rymsI } from './fordon';

export const UTRUSTNING = balans('utrustning', {
  kropp: 5, // det man har på sig väger lätt mot vad händerna orkar: i strid är man tung av kläder som väger så här många gånger det händerna orkar (strid.ts)
  maxVarme: 0.95, // ett plagg tar högst bort så stor del av kylan (kladVarme)
  doljYttre: 0.7, doljHuvud: 0.3, // steg 10.7.22: så mycket det yttre plaggets och huvudets material döljer i snön (doljISno)
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
  krok: { namn: 'Kroken i bältet', ikon: '🪝' }, // redskapet som hänger i bältet medan man bär
  krok2: { namn: 'Andra kroken i bältet', ikon: '🪝' }, // steg 7.1.1: ett eget redskap som hänger där medan man arbetar med ett annat
  axelrem: { namn: 'Axelrem', ikon: '➰' }, // steg 7.1.2: plagget
  axel: { namn: 'Axeln', ikon: '🔱' }, // och redskapet som hänger i det medan man bär
  smycke: { namn: 'Smycke', ikon: '➰' }, // steg 7.7.5
  rygg: { namn: 'Ryggen', ikon: '🎒' }, // steg 7.1.3: ryggsäcken, och bördan i den
  axlar: { namn: 'Axlarna', ikon: '🧥' }, // steg 9.8.15: sjalen
  brost: { namn: 'Bröstet', ikon: '🫂' }, // steg 13.2.3: bärselen
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
// var redskapet i handen hänger när p bär: i bältet när hen har ett bälte på sig och sakregistret säger bältet (steg 2.3.3
// och 7.1.1), på axeln när hen har en axelrem på sig och registret säger axeln (steg 7.1.2), annars ingenstans
export function hangerVid(s: State, p: Person, h = iHanden(s, p)): 'balte' | 'axel' | undefined {
  const v = h && SAKER[h.ting.k]?.hanger;
  if (!v) return;
  const f = v === 'balte' ? 'krok' : 'axel';
  return allaTing(s).some(t => t.bar === p.id && SAKER[t.k]?.klad?.[f]) ? v : undefined;
}
// redskapet i handen hänger på kroppen när p bär (i bältet eller på axeln), så det tar inga händer
export const iBaltet = (s: State, p: Person, h = iHanden(s, p)) => !!hangerVid(s, p, h);
// platserna för bördan (steg 6.1.8): de fria händerna, var och en med vad den orkar (i vikt) och ett slag i taget, eller
// korgen, som tar en hand men rymmer mer av vilka slag som helst (aldrig mer än båda händerna orkar). Ett redskap i en
// hand lämnar den andra fri, och ett redskap i bältet lämnar båda. Ryggsäcken (steg 7.1.3) är en plats till, på ryggen,
// som rymmer lika mycket för alla och av vilka slag som helst
export interface HandPlats { hand: 'hoger' | 'vanster' | 'rygg'; kap: number; korg?: true }
// ryggsäcken p har på sig (steg 7.1.3)
export const ryggsack = (s: State, p: Person) => allaTing(s).find(t => t.bar === p.id && SAKER[t.k]?.klad?.rygg);
export function handPlatser(s: State, p: Person): HandPlats[] {
  const pl = iHanderna(s, p), r = ryggsack(s, p);
  return r ? [...pl, { hand: 'rygg', kap: SAKER[r.k]!.klad!.rygg! }] : pl;
}
function iHanderna(s: State, p: Person): HandPlats[] {
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
  const tung = Object.keys(b).find(k => b[k] > 1e-9 && SAKER[k]?.lyft);
  if (tung) return lyftas(pl, b, tung);
  const ri = pl.findIndex(x => x.hand === 'rygg');
  if (ri >= 0) return medRygg(pl, ri, b);
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
// det som lyfts med båda händerna (virket, steg 10.2.89): bara det, i båda de fria händerna, av den som orkar det; aldrig i
// korgen eller ryggsäcken, och utan undantaget för en enda sak
function lyftas(pl: HandPlats[], b: Record<string, number>, k: string): Fordelning | undefined {
  if (Object.keys(b).some(q => q !== k && b[q] > 1e-9)) return undefined;
  const h = pl.map((x, i) => [x, i] as const).filter(([x]) => x.hand !== 'rygg' && !x.korg);
  if (h.length < 2 || b[k] > h[0][0].kap + h[1][0].kap + 1e-9) return undefined;
  const r: Fordelning = pl.map(() => []);
  r[h[0][1]].push([k, b[k] / 2]); r[h[1][1]].push([k, b[k] / 2]);
  return r;
}
// med ryggsäcken (steg 7.1.3): varje slag läggs i ryggsäcken eller i händerna, och ett slag kan delas mellan dem. Det
// som får plats läggs helst i ryggsäcken; den som samlar plockar rakt ner i den
function medRygg(pl: HandPlats[], ri: number, b: Record<string, number>): Fordelning | undefined {
  const E = 1e-9, R = pl[ri].kap, ov = pl.filter((_, i) => i !== ri);
  const slag = Object.entries(b).filter(x => x[1] > E).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const ut = (f: Fordelning, iR: [string, number][]) => { let j = 0; return pl.map((_, i) => i === ri ? iR : f[j++]); };
  const n = slag.length;
  for (let m = (1 << n) - 1; m >= 0; m--) {
    const iR = slag.filter((_, i) => m >> i & 1), sum = iR.reduce((a, x) => a + x[1], 0);
    if (sum > R + E) continue;
    const rest = slag.filter((_, i) => !(m >> i & 1));
    for (const c of rest) { // det som ryms till i ryggsäcken tas av ett av slagen i händerna
      const del = Math.min(c[1], R - sum);
      if (del <= E) break;
      const f = fordela(ov, Object.fromEntries(rest.map(x => x === c ? [x[0], x[1] - del] : x)));
      if (f) return ut(f, [...iR, [c[0], del]]);
    }
    const f = fordela(ov, Object.fromEntries(rest));
    if (f) return ut(f, iR);
  }
  return undefined;
}
// ryggsäcken i stället för korgen (steg 7.1.3): den som har en ryggsäck på sig och arbetar utan korg i ett arbete där korgen
// hjälper plockar rakt ner i ryggsäcken och får det korgen ger (korgens rad i handlingen, handlingar.ts)
export function ryggKorg(s: State, p: Person, tk?: Task) {
  const rad = tk && tk.tool !== 'korg' ? ACTS[tk.act].redskap?.korg : undefined, t = rad && ryggsack(s, p);
  return t ? { t, rad: rad! } : undefined;
}
// ryggsäcken slits som korgen, för det som samlas i den (y), och läggs bort när den är utsliten
export function slitRygg(s: State, t: Ting, y: number, haller: number) {
  t.c -= y / haller / kvHaller(t) / (KLADMATERIAL[kladAv(t.k)?.mat ?? 'kaninskinn']?.hallbar ?? 1); // lädret håller längre (steg 13.2.3)
  if (t.c > 1e-9) return;
  s.ting = tingOf(s).filter(x => x !== t);
  redskapSlitet(s, t.k); // det utslitna räknas som förbrukat (steg 10.11.9)
  count(s, 'kladerSlitna');
}
// ryms bördan b i p:s fria händer (och ryggsäcken)?
export const ryms = (s: State, p: Person) => { const pl = handPlatser(s, p); return (b: Record<string, number>) => !!fordela(pl, b); };
// är bördan full: ryms inte en sak till av det arbetet ger (steg 6.1.8)?
export const fullBorda = (s: State, p: Person, t: Task) => !rymsTurMer(s, p, t, bordSlag(t));
// ryms en sak till av det turen gäller, ovanpå bördan b (slag → vikt)? Det är turens mål (hö, grenar, steg 13.10.7), annars det
// arbetet ger och det rundan plockat på turen (rötterna, svampen). Det man plockar i förbifarten tas bara med om det gör, så att
// det inte tränger undan det turen gäller (steg 15.1.44)
export function rymsTurMer(s: State, p: Person, t: Task, b: Record<string, number>) {
  const till = turMal(t) ?? [carryKind(t.act), ...(t.plockat ?? [])], fo = fordonI(s, t);
  if (fo && !fo.f.falt) return till.some(k => rymsI(fo)({ ...b, [k]: (b[k] ?? 0) + viktOf(k) })); // kälken (steg 10.10.2)
  return till.some(k => !!fordela(handPlatser(s, p), { ...b, [k]: (b[k] ?? 0) + viktOf(k) }));
}
// hur mycket p kan bära i de fria händerna, i vikt (för texterna och testerna)
export const bordPlats = (s: State, p: Person) => handPlatser(s, p).reduce((a, x) => a + x.kap, 0);
// vad som finns på varje plats: redskapet i den eller de händer det tar (höger först), eller i bältet när p bär, bördan i
// de fria händerna (eller i korgen), och plaggen p har på sig på kroppens platser
export function utrustning(s: State, p: Person, bar: boolean): Record<Plats, { ting?: Ting; borda?: true }> {
  const r = Object.fromEntries(PLATS_LIST.map(k => [k, {}])) as Record<Plats, { ting?: Ting; borda?: true }>;
  let h = iHanden(s, p);
  const krokar: Ting[] = [];
  const vid = h && bar ? hangerVid(s, p, h) : undefined;
  if (vid === 'balte') { krokar.push(h!.ting); h = undefined; }
  else if (vid === 'axel') { r.axel.ting = h!.ting; h = undefined; }
  krokar.push(...iKroken(s, p));
  if (krokar[0]) r.krok.ting = krokar[0];
  if (krokar[1]) r.krok2.ting = krokar[1];
  if (h) { r.hoger.ting = h.ting; if (h.hander === 2) r.vanster.ting = h.ting; }
  if (bar) {
    if (!h) { r.hoger.borda = true; r.vanster.borda = true; }
    else { if (SAKER[h.ting.k]?.rymmer) r.hoger.borda = true; if (h.hander === 1) r.vanster.borda = true; }
    if (ryggsack(s, p)) r.rygg.borda = true;
  }
  for (const t of paSig(s, p)) for (const pl of kladPlatser(t.k)) r[pl as Plats].ting = t;
  return r;
}

// vad av bördan som ligger i varje hand, och hur mycket (i vikt), som fliken, figuren i Utrustning och kartan visar
// (steg 6.1.2): fördelningen i händerna (fordela, steg 6.1.8). Ryms bördan inte (fler slag än händer) läggs resten i höger
export type IHanden = Partial<Record<'hoger' | 'vanster' | 'rygg', { k: string; v: number }>>;
export function bordaIHander(s: State, p: Person, t: Task | undefined, u: ReturnType<typeof utrustning>): IHanden {
  const r: IHanden = {};
  if (!t || (!u.hoger.borda && !u.vanster.borda && !u.rygg.borda)) return r;
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
export const paSig = (s: State, p: Person) => allaTing(s).filter(t => t.bar === p.id && !!SAKER[t.k]?.klad); // bara plaggen: en protes bärs också (protes.ts) men är inget plagg (krasch i by 64353, steg 9.9.3)
// p har ett bälte på sig (där reservvapnet hänger i strid, steg 3.7.7)
export const harBalte = (s: State, p: Person) => allaTing(s).some(t => t.bar === p.id && SAKER[t.k]?.klad?.krok);
// vad plaggen väger, i vikt
export const paSigVikt = (s: State, p: Person) => { let v = 0; for (const t of allaTing(s)) if (t.bar === p.id) v += viktOf(t.k); return v; };
// hur stor del av kylan plagget t (av slaget k) tar bort: ett finare plagg värmer lite mer (kvalitet.ts)
// Ett svalt plagg (värmen under noll, steg 12.1.34) ger lika mycket mer kyla och mindre hetta
export const kladSkydd = (k: string, t?: { q?: number }) => Math.max(-UTRUSTNING.maxVarme, Math.min(UTRUSTNING.maxVarme, (SAKER[k]?.klad?.varme ?? 0) * kvEffekt(t)));
// plaggets värme i ord (steg 12.1.260): ett varmt plagg "Värmer 20 %", ett svalt "Svalkar 15 %", i sakens och personens ruta
export const varmeText = (v: number) => `${v < 0 ? 'Svalkar' : 'Värmer'} ${Math.round(Math.abs(v) * 100)} %`;
// hur mycket kläderna skyddar mot kylan (0 = inget, 1 = helt, under noll när de svala plaggen kyler mer än de varma värmer):
// varje plagg tar bort sin del av det som är kvar
export function kladVarme(s: State, p: Person) {
  let kvar = 1;
  for (const t of allaTing(s)) if (t.bar === p.id) kvar *= 1 - kladSkydd(t.k, t);
  return 1 - kvar;
}
// hur väl p syns mindre i snön (steg 10.7.22, 0 till 1): det yttre plaggets och huvudbonadens dolj (KLADMATERIAL), vägda med
// doljYttre och doljHuvud. Bara när snö ligger på marken; på bar mark döljer inget
export function doljISno(s: State, p: Person) {
  if (snoPaMarken(s) <= 0) return 0;
  let v = 0;
  for (const t of allaTing(s)) if (t.bar === p.id) { const k = SAKER[t.k]?.klad; if (k?.dolj) v += k.dolj * (k.plats === 'yttre' ? UTRUSTNING.doljYttre : k.plats === 'huvud' ? UTRUSTNING.doljHuvud : 0); }
  return Math.min(1, v);
}
// i vilken ordning p tar ett plagg: sitt eget, byns, ett lånat. Inom det: bäst skick, och sedan det första bland tingen
const rang = (p: Person, t: Ting) => t.agare === p.id ? 0 : t.agare === BYN ? 1 : 2;
// varje timme: den som saknar ett plagg på en plats tar på sig ett som är fritt (ingen har det på sig, i handen eller i
// bördan), och som hen får ta
const arMantel = (k: string) => kladAv(k)?.plagg === 'mantel';
// plagg som bara vissa bär: prästens dräkt och masken åt prästen, trons tecken åt de troende (system 8.5)
// vem plagget passar: prästens dräkt prästen, tecknet den som tror, och barnkläderna barnen och de vuxnas rock och byxor de
// som vuxit ur dem (steg 13.2.4)
export const kladFor = (s: State, p: Person, k: string) => { const pl = kladAv(k)?.plagg; return pl === 'prastdrakt' || pl === 'mask' ? arPrast(s, p) : pl === 'tecken' ? p.tro !== undefined : pl === 'barnklader' ? ageOf(p, s.now) < ALDER.barnklad : pl === 'rock' || pl === 'byxor' ? ageOf(p, s.now) >= ALDER.barnklad : true; };
// platserna på kroppen som plagget täcker (barnkläderna både kroppen och benen, steg 13.2.4)
export const kladPlatser = (k: string) => { const d = SAKER[k]!.klad!; return d.ocksa ? [d.plats, ...d.ocksa] : [d.plats]; };
// plagget av det heliga djurets skinn (steg 10.3.15): den som följer budet bär det inte, utom när kylan är en fara
const kladArt = (k: string) => { const m = kladAv(k)?.mat; return m ? SAK_ART[KLADMATERIAL[m].sak] : undefined; };
// poängen för att ha plagget k på sig (steg 12.1.149, vikterna i KLADER): värmen gånger hur kallt det är, skyddet i striden,
// finheten och att det klär en del som annars vore naken (NAKEN_PLATS). t = tinget om hen redan har det på sig
// utan = plaggen som tas av för det här (bytet i stepKlader, steg 13.2.5): de räknas inte när det frågas om man blir naken
export function plaggPoang(s: State, p: Person, k: string, t: Ting | undefined, temp = temperature(s), utan: Ting[] = []) {
  const r = kladAv(k), pl = SAKER[k]?.klad?.plats, delar = pl ? kladPlatser(k).map(q => NAKEN_PLATS[q]).filter(d => d !== undefined) : [];
  const skydd = kladSkyddStrid(k), sk = skydd ? Object.values(skydd.tar).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const naken = delar.some(del => !paSig(s, p).some(q => q !== t && !utan.includes(q) && kladPlatser(q.k).some(x => NAKEN_PLATS[x] === del)));
  // det plagget bär åt en, och rollen eller synen det är till för (steg 12.1.191)
  const kd = SAKER[k]?.klad, bar = KLADER.valBar * ((kd?.krok ?? 0) + (kd?.axel ?? 0)) + KLADER.valRygg * (kd?.rygg ?? 0)
    + (kd?.sele ? (spadbarnAv(s, p).length ? KLADER.valSele : -KLADER.valSele) : 0) // bärselen till modern med ett spädbarn (steg 13.2.3)
    + (kd?.snoTar ? KLADER.valSno * kd.snoTar * (snoPaMarken(s) > 0 ? snoPaMarken(s) : -1) : 0); // snöskorna i snön, inte på bar mark (steg 13.2.5)
  const roll = r && (r.plagg === 'mask' || r.plagg === 'prastdrakt' || r.plagg === 'tecken') && kladFor(s, p, k) ? KLADER.valRoll : 0, pynt = pl === 'smycke' ? KLADER.valPynt : 0;
  return KLADER.valVarme * kladSkydd(k, t) * (KLADER.valIdeal - temp) / KLADER.valSpann + KLADER.valSkydd * sk + KLADER.valFin * (r ? KLADMATERIAL[r.mat].finhet : 0) + (naken ? KLADER.valNaken : 0) + bar + roll + pynt;
}
// den som vuxit ur ett plagg ger det till det yngsta syskonet som det passar och som saknar ett, annars till byn (steg 13.2.4)
function vuxitUr(s: State, p: Person, k: string) {
  const syskon = living(s).filter(c => c !== p && c.mother !== undefined && c.mother === p.mother && kladFor(s, c, k) && !paSig(s, c).some(t => kladAv(t.k)?.plagg === kladAv(k)?.plagg));
  syskon.sort((a, b) => ageOf(a, s.now) - ageOf(b, s.now));
  return syskon[0]?.id ?? BYN;
}
export function stepKlader(s: State) {
  if (!tingOf(s).some(t => SAKER[t.k]?.klad)) return;
  const temp = temperature(s), kyla = farorNu(s).kyla;
  const ledare = s.styre?.ledare;
  // plaggen per slag, i tingens ordning, en gång per timme (om de är fria frågas när de väljs: det någon tar av sig blir fritt)
  const avSlag = new Map<string, Ting[]>();
  for (const t of tingOf(s)) if (SAKER[t.k]?.klad) { let l = avSlag.get(t.k); if (!l) avSlag.set(t.k, l = []); l.push(t); }
  for (const p of living(s)) {
    // ledarens mantel (steg 8.3.14): den tillhör byn och följer ämbetet. Ledaren byter till den; den som inte längre leder tappar den
    for (const t of paSig(s, p)) if (arMantel(t.k) && p.id !== ledare) t.bar = undefined;
    // ... utom när hen har rustningen på sig: den tas inte av för manteln
    if (p.id === ledare && !paSig(s, p).some(t => arMantel(t.k) || kladAv(t.k)?.plagg === 'rustning')) {
      const m = tingOf(s).find(t => arMantel(t.k) && t.bar === undefined && t.hos === undefined && t.lass === undefined && !t.halv && t.helig === undefined);
      if (m) { for (const t of paSig(s, p)) if (SAKER[t.k]!.klad!.plats === 'yttre') t.bar = undefined; m.bar = p.id; m.x = m.y = m.vid = undefined; }
    }
    // klädseln efter värmen (steg 12.1.149): det plagg som har lägst poäng under −valByte tas av, ett i taget, så att de varmaste
    // åker av först när det blir varmt och de svala först när det blir kallt
    { let av: Ting | undefined, ap = -KLADER.valByte;
      for (const t of paSig(s, p)) { if (arMantel(t.k) && p.id === ledare) continue; const v = plaggPoang(s, p, t.k, t, temp); if (v < ap) { av = t; ap = v; } }
      if (av) { av.bar = undefined; count(s, SAKER[av.k]!.klad!.varme > 0 ? 'plaggAvVarme' : 'plaggAvKyla'); } }
    for (const t of paSig(s, p)) if (heligtAvstar(s, p, kladArt(t.k), kyla)) { t.bar = undefined; count(s, 'heligtPlaggAv'); } // plagget tas av och ligger kvar
    // det som inte passar tas av: barnet som fyllt 10 lämnar barnkläderna åt ett yngre syskon eller byn (steg 13.2.4)
    for (const t of paSig(s, p)) if (!kladFor(s, p, t.k)) { t.bar = undefined; if (t.agare === p.id) t.agare = vuxitUr(s, p, t.k); }
    // platserna och plagget som sitter där
    const har = new Map<string, Ting>();
    for (const t of paSig(s, p)) for (const q of kladPlatser(t.k)) har.set(q, t);
    const under = (k: string) => [...new Set(kladPlatser(k).map(q => har.get(q)).filter((t): t is Ting => !!t))];
    // de slag som finns fria och är värda att ta på, det med högst poäng först (steg 13.2.2): stövlarna före skorna, den
    // varmare rocken före den kallare, i stället för i registrets ordning. Sitter något på platsen byts det bara mot ett
    // plagg med högre poäng än det som sitter där (snöskorna i snön, skorna när snön är borta, steg 13.2.5)
    const slag: { k: string; v: number }[] = [];
    for (const k of KLAD_SLAG) {
      if (!avSlag.has(k) || arMantel(k) || !kladFor(s, p, k) || heligtAvstar(s, p, kladArt(k), kyla)) continue;
      const nu = under(k);
      if (nu.some(t => t.k === k || (arMantel(t.k) && p.id === ledare))) continue;
      const v = plaggPoang(s, p, k, undefined, temp, nu) - nu.reduce((a, t) => a + plaggPoang(s, p, t.k, t, temp), 0);
      if (v > KLADER.valByte) slag.push({ k, v }); // klädseln efter värmen (steg 12.1.149)
    }
    slag.sort((a, b) => b.v - a.v);
    const bytt = new Set<string>();
    for (const { k } of slag) {
      const pls = kladPlatser(k);
      if (pls.some(q => bytt.has(q))) continue;
      let best: Ting | undefined;
      for (const t of avSlag.get(k) ?? []) {
        if (t.bar !== undefined || t.hos !== undefined || t.lass !== undefined || t.halv || t.helig !== undefined || !lends(s, t.agare, p)) continue; // det heliga tinget bärs inte (steg 10.3.20)
        if (!best || rang(p, t) < rang(p, best) || (rang(p, t) === rang(p, best) && t.c > best.c)) best = t;
      }
      if (!best) continue;
      for (const t of under(k)) { t.bar = undefined; for (const q of kladPlatser(t.k)) har.delete(q); } // det som satt där tas av och ligger kvar
      best.bar = p.id; best.x = best.y = best.vid = undefined;
      heligtBrutet(s, p, kladArt(k)); // i kylan bär hen det heliga djurets skinn och bryter budet
      for (const q of pls) { har.set(q, best); bytt.add(q); }
    }
  }
}

// de plagg som ligger fritt och som p får ta och som är varmare än det hen har på sig på samma plats (värmen, varme.ts): det
// varmaste per plats, och det hen har på sig där (nu)
export function varmarePlagg(s: State, p: Person): { t: Ting; nu?: Ting }[] {
  const kyla = farorNu(s).kyla, pa = paSig(s, p), ut = new Map<string, { t: Ting; nu?: Ting }>();
  for (const t of tingOf(s)) {
    const pl = SAKER[t.k]?.klad?.plats;
    if (!pl || t.x === undefined || t.bar !== undefined || t.hos !== undefined || t.lass !== undefined || t.halv || t.helig !== undefined || arMantel(t.k) || !kladFor(s, p, t.k) || heligtAvstar(s, p, kladArt(t.k), kyla) || !lends(s, t.agare, p)) continue;
    const nu = pa.find(q => SAKER[q.k]!.klad!.plats === pl), b = ut.get(pl);
    if (kladSkydd(t.k, t) > (nu ? kladSkydd(nu.k, nu) : 0) && (!b || kladSkydd(t.k, t) > kladSkydd(b.t.k, b.t))) ut.set(pl, { t, nu });
  }
  return [...ut.values()];
}
// p tar på sig plagget och tar av det hen hade på samma plats
export function klaPaKlar(s: State, p: Person, tk: Task) {
  const q = (s.ting ?? []).find(o => o.id === tk.ref), pl = q && SAKER[q.k]?.klad?.plats;
  if (!q || !pl || q.bar !== undefined || q.hos !== undefined || q.lass !== undefined) return;
  for (const t of paSig(s, p)) if (kladPlatser(t.k).some(x => kladPlatser(q.k).includes(x))) t.bar = undefined;
  q.bar = p.id; q.x = q.y = q.vid = undefined; count(s, 'klaPaVarmt');
}
// p tar av sig det varma plagget för att svalka sig (SVALKA i varme.ts, steg 13.8.1); det ligger kvar som när kläderna byts
export function klaAvKlar(s: State, p: Person, tk: Task) {
  const q = (s.ting ?? []).find(o => o.id === tk.ref);
  if (!q || q.bar !== p.id) return;
  q.bar = undefined; count(s, 'klaAvVarmt');
}
// byta om inför strid (steg 8.7.8): när larmet går hämtar var och en sin rustning. Vid en överraskning hinner man inte
export function rustaVal(s: State, p: Person) {
  const t0 = Math.max(-Infinity, ...Object.values(p.larm ?? {}).map(l => l?.t ?? -Infinity)); // det senaste larmet, av vilken sort som helst
  if (s.now - t0 > HOUR || p.task?.act === 'strid' || rovarFlockar(s).some(f => f && Math.hypot(f.x - p.x, f.y - p.y) < 6)) return undefined;
  const t = (s.ting ?? []).find(q => { const pl = kladAv(q.k)?.plagg; return (pl === 'rustning' || pl === 'hjalm') && q.helig === undefined && q.bar === undefined && q.hos === undefined && q.lass === undefined && (q.agare === p.id || q.agare === undefined || q.agare < 0) && q.x !== undefined; });
  return t ? { spot: { x: t.x! + 0.5, y: t.y! + 0.5 }, ref: t.id, why: 'Hämtar sin rustning inför striden' } : undefined;
}
export function rustaKlar(s: State, p: Person, t: Task) {
  const q = (s.ting ?? []).find(o => o.id === t.ref);
  if (q && q.bar === undefined) { q.bar = p.id; q.x = q.y = q.vid = undefined; count(s, 'rustad'); }
}
