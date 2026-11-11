// Kyrkan och buden (system 8.6). Registret BUD: varje bud är ett förbud, ett krav eller ett offer, med storlek (1–4), vilken nivå tron behöver och
// vilken skala och sida som ger det. Kyrkans egendom (Tro.forrad), hovet och templet, helgonen och kvädena. Allt en tro avgör är frågor i FRAGOR
// med trons krets (rost.ts). Buden gäller de troende, de starkt troende mer; ett bud som blivit lag gäller alla (LAGAR, lagar.ts).
import { Act, DAY, HOUR, Person, State } from './typer';
import { balans } from './balans';
import { clamp, rnd } from './slump';
import { ALDER, type BudTillfalle, ageOf, count, living, log, relKey, satBudTillfalle, stat, think } from './folk';
import { FOOD } from './saker';
import { kronika } from './historik';
import { Tro, andlighet, gudarOf, skalaV, troNamn, troNiva, troOf, troende } from './religion';
import { helga, helig, prastOf } from './kult';
import { FRAGOR, FragaData, rostaOm } from './rost';
import { LAGAR, lagGaller } from './lagar';
import { addTo, amountOf, ownMove, ownedStock, ownsAmount, use } from './lager';
import { freeNear } from './byggnad';
import { eldPlats } from './karta';
import { ledareOf } from './styre';
import { upplev } from './uppvaxt';
import type { ProjektDef } from './projekt';

export const KYRKA = balans('kyrka', {
  offerChans: 0.03, // chansen per timme att en andlig ger en gåva till kyrkan ...
  offerAnde: 55, // ... från den här andligheten
  skatt: 1, // kyrkskatten: så många saker per dygn ur byns förråd till kyrkan, per fem troende
  hovVed: 12, hovMin: 240, // så mycket trä och arbete (minuter) ett hov kräver ...
  templeSten: 20, tempelMin: 600, // ... och så mycket sten och arbete ett tempel av sten, som byggs där hovet står
  hovVikt: 0.5, tempelVikt: 0.3, // hur mycket hovet och templet väger i PROJEKT (gånger hur stor del av byn som tror)
  styrkaLiten: 15, styrkaStor: 50, styrkaMycket: 70, // så stark tro behövs för att följa ett litet, stort och mycket stort bud
  skuld: 1, // ett brutet bud ger så här mycket skuld ...
  skuldHumor: -0.05, // ... så här mycket sämre humör ...
  skuldTro: 2, // ... och så här mycket svagare tro
  stotaUt: 5, // så mycket skuld innan en sträng och mäktig kyrka stöter ut någon
  helgonDygn: 28, // ett helgon blir det tidigast så här många dygn (år i spelet) efter döden, en generation
  fram: 0.12, // chansen per kväll att prästen lägger fram något
  valsigna: 0.15, // så mycket översteprästens välsignelse eller fördömelse är värd i legitimiteten
  kvadeDygn: 7, // prästen diktar ett kväde en gång så här ofta
  // budens verkan (steg 8.6.6–8.6.10)
  kravTro: 0.5, kravHumor: 0.01, // ett krav som följs (tacka, hälsa elden, be vid födsel och död) ger så här mycket tro och humör
  forstaPer: 3, // den första fångsten: en hel sak mat till tron per så många som följer budet
  tionde: 0.1, tiondeMin: 10, // tionde: så stor del av den egna maten till prästen, när man äger minst så här mycket
  djur: 2, // djuroffret: så mycket kött en gång i veckan (sju dygn, sju år i spelet)
  djurSakna: -0.03, // den troende mår så här mycket sämre när det inte finns något att offra
  offerDygn: 28, // människooffret: högst en gång på så här många dygn (år i spelet), och bara den som dömts
  framlingRel: 10, framlingMat: 0.2, // främlingen: så mycket bättre relation och så mycket mättare
  hamndRel: 15, // hämnden: relationen till den som gjort en våldsam handling blir så här mycket sämre
  vecka: 7, // vilodagen, fastan och djuroffret: en gång på så här många dygn (år i spelet)
});

export interface BudDef { namn: string; sort: 'forbud' | 'krav' | 'offer'; storlek: 1 | 2 | 3 | 4; niva: number; skala?: 'natur' | 'manga' | 'prast' | 'livet' | 'forlat' | 'fest' | 'krig' | 'oppen' | 'sprid'; sida?: 0 | 1; acts?: Act[]; text: string; kyla?: boolean }
export const BUD = {
  tacka: { namn: 'Tacka gudarna före maten', sort: 'krav', storlek: 1, niva: 2, skala: 'livet', sida: 0, text: 'Man tackar innan man äter' },
  tecken: { namn: 'Bära trons tecken', sort: 'krav', storlek: 1, niva: 2, skala: 'natur', sida: 0, text: 'De troende bär tecknet' },
  halsa: { namn: 'Hälsa elden på morgonen', sort: 'krav', storlek: 1, niva: 2, text: 'Man hälsar elden när man vaknar' },
  deDoda: { namn: 'Inte tala illa om de döda', sort: 'forbud', storlek: 1, niva: 2, skala: 'natur', sida: 1, text: 'De döda talar man väl om' },
  fodsel: { namn: 'Bön vid födsel och död', sort: 'krav', storlek: 1, niva: 2, text: 'Man ber när någon föds eller dör' },
  forstaFangst: { namn: 'Den första fångsten offras', sort: 'offer', storlek: 2, niva: 2, skala: 'livet', sida: 0, text: 'Det första man får går till tron' },
  gravgava: { namn: 'Gravgåvor till de döda', sort: 'offer', storlek: 2, niva: 2, skala: 'livet', sida: 1, text: 'De döda får något med sig' },
  lunden: { namn: 'Inte fälla träd i den heliga lunden', sort: 'forbud', storlek: 2, niva: 2, skala: 'natur', sida: 0, text: 'Lunden får stå' },
  kottHelg: { namn: 'Inget kött på heliga dagar', sort: 'forbud', storlek: 2, niva: 3, skala: 'fest', sida: 1, text: 'Inget kött på den heliga dagen', acts: ['slakta'] },
  framling: { namn: 'Främlingar ska få mat', sort: 'krav', storlek: 2, niva: 2, skala: 'oppen', sida: 0, text: 'Den som kommer får äta' },
  giftaTro: { namn: 'Inte gifta sig utanför tron', sort: 'forbud', storlek: 2, niva: 3, skala: 'oppen', sida: 1, text: 'Man gifter sig inom tron' },
  fasta: { namn: 'Fasta vissa dagar', sort: 'krav', storlek: 3, niva: 3, skala: 'fest', sida: 1, text: 'Vissa dagar äter man inte' },
  vilodag: { namn: 'En vilodag av sju', sort: 'forbud', storlek: 3, niva: 3, text: 'Den sjunde dagen arbetar ingen' },
  ingetKott: { namn: 'Inte döda djur', sort: 'forbud', storlek: 3, niva: 4, skala: 'krig', sida: 0, text: 'Man dödar inga djur', acts: ['jakt', 'slakta'] },
  orent: { namn: 'Inte gräva i jorden', sort: 'forbud', storlek: 3, niva: 4, skala: 'natur', sida: 0, text: 'Jorden är helig', acts: ['stubbe', 'plantera'] },
  tionde: { namn: 'Tionde till prästen', sort: 'offer', storlek: 3, niva: 3, skala: 'prast', sida: 1, text: 'En tiondel går till prästen' },
  hamnd: { namn: 'Hämnd är en plikt', sort: 'krav', storlek: 3, niva: 4, skala: 'forlat', sida: 1, text: 'Den som drabbas ska hämnas' },
  djuroffer: { namn: 'Djuroffer', sort: 'offer', storlek: 3, niva: 4, skala: 'krig', sida: 1, text: 'Tron kräver djur' },
  aldrigDoda: { namn: 'Aldrig döda en människa', sort: 'forbud', storlek: 4, niva: 4, skala: 'krig', sida: 0, text: 'Inte ens i försvar', acts: ['strid'] },
  ingenRoj: { namn: 'Ingen ny mark får röjas', sort: 'forbud', storlek: 4, niva: 4, skala: 'natur', sida: 0, text: 'Skogen får stå', acts: ['falla'] },
  ogifta: { namn: 'Prästerna lever ogifta', sort: 'forbud', storlek: 4, niva: 4, skala: 'fest', sida: 1, text: 'Prästen ger sig åt tron' },
  manniskooffer: { namn: 'Människooffer', sort: 'offer', storlek: 4, niva: 4, skala: 'krig', sida: 1, text: 'Tron kräver det yttersta' },
} satisfies Record<string, BudDef>;
export type BudId = keyof typeof BUD;
const BDEF: Record<BudId, BudDef> = BUD;
const budLag = (id: BudId) => 'bud_' + id;
// ett bud som blivit lag är en rad i LAGAR (steg 8.6.11–8.6.12): den gäller alla och straffas på tinget
// följer p budet? De troende följer de små, de starkt troende mer (steg 8.6.8)
const foljer = (p: Person, id: BudId) => { const b = BDEF[id], st = p.troStyrka ?? 0; return st >= (b.storlek <= 2 ? KYRKA.styrkaLiten : b.storlek === 3 ? KYRKA.styrkaStor : KYRKA.styrkaMycket); };
// budet som förbjuder handlingen, om det finns något för p (steg 8.6.6): valet av aktivitet frågar. Svält och kyla går före, men kostar (budBrutet)
export function budForbjuder(s: State, p: Person, act: Act): BudId | undefined {
  const tr = troOf(s, p.tro);
  for (const id of tr?.bud ?? []) if (BDEF[id].acts?.includes(act) && foljer(p, id)) return id;
  for (const id of Object.keys(BUD) as BudId[]) if (BDEF[id].acts?.includes(act) && lagGaller(s, budLag(id))) return id; // lagen gäller alla (steg 8.6.12)
  return undefined;
}
export const vilodagNu = (s: State, p: Person) => { const tr = troOf(s, p.tro); return !!tr?.bud?.includes('vilodag') && foljer(p, 'vilodag') && Math.floor(s.now / DAY) % KYRKA.vecka === tr.id % KYRKA.vecka; };
// ett brutet bud: skuld, sämre humör och svagare tro; en sträng och mäktig kyrka stöter ut den som syndat mycket (steg 8.6.9)
export function budBrutet(s: State, p: Person, id: BudId) {
  const tr = troOf(s, p.tro);
  count(s, 'bud_brutet');
  if (lagGaller(s, budLag(id))) handelseBud(s, p, id);
  if (!tr?.bud?.includes(id)) return;
  p.skuld = (p.skuld ?? 0) + KYRKA.skuld; p.troStyrka = Math.max(0, (p.troStyrka ?? 0) - KYRKA.skuldTro);
  think(p, `Bröt mot budet: ${BDEF[id].namn.toLowerCase()}`, KYRKA.skuldHumor, s.now, 12 * HOUR);
  if ((skalaV(tr, 'forlat') ?? 0) > 70 && troNiva(tr) >= 4 && (p.skuld ?? 0) >= KYRKA.stotaUt) {
    p.tro = undefined; p.skuld = 0; count(s, 'utstott');
    log(s, `${troNamn(tr)} stötte ut ${p.name}.`, 'rel', [p.id]);
  }
}
let handelseBud: (s: State, p: Person, id: BudId) => void = () => {};
export const satBudHandelse = (f: typeof handelseBud) => { handelseBud = f; };
// bikten (steg 8.6.9): på Förlåtande-sidan, hos prästen
export const viltBikta = (s: State, p: Person) => { const tr = troOf(s, p.tro); return !!tr && (p.skuld ?? 0) > 0 && !!prastOf(s, tr) && (skalaV(tr, 'forlat') ?? 100) < 50; };

// ---------- kyrkans egendom (steg 8.6.2–8.6.4) ----------
const gavaIn = (tr: Tro, k: string, n: number) => { const f = (tr.forrad ??= {}); f[k] = (f[k] ?? 0) + n; };
export const forradSum = (tr: Tro) => Object.values(tr.forrad ?? {}).reduce((a, b) => a + b, 0);
function offerTimme(s: State, tr: Tro, folk: Person[]) {
  for (const p of folk) {
    if (andlighet(s, p) < KYRKA.offerAnde || rnd(s, 'tro', p) >= KYRKA.offerChans) continue;
    const k = ['ved', 'grenar', 'sten', 'bar', 'rep'].find(q => ownsAmount(s, p, q) >= 1);
    if (!k) continue;
    use(s, p, k, 1); gavaIn(tr, k, 1); count(s, 'kyrka_gava');
    think(p, 'Gav en gåva till tron', 0.02, s.now, 6 * HOUR);
  }
}
// kyrkskatten (steg 8.6.3): en lag när styret står åt Andlig, och styret kan förbjuda den när det står åt Världslig
function skattDygn(s: State) {
  if (!lagGaller(s, 'kyrkskatt') || lagGaller(s, 'ejKyrkskatt')) return;
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined || troNiva(tr) < 4) continue;
    const n = Math.ceil(troende(s, tr).length / 5) * KYRKA.skatt, k = amountOf(s, 'ved') >= n + 10 ? 'ved' : undefined;
    if (k) { const l = ledareOf(s) ?? living(s)[0]; if (l) { use(s, l, k, n); gavaIn(tr, k, n); count(s, 'kyrkskatt'); } }
  }
}
// vad förrådet går till (steg 8.6.4): en fråga i trons krets, i en ordning efter trons skalor
export function utgiftNu(s: State, tr: Tro): 'hov' | 'tempel' | 'prast' | 'fattig' | 'gudabild' | undefined {
  const opp = skalaV(tr, 'oppen') ?? 50, pr = skalaV(tr, 'prast') ?? 50;
  if (!tr.hov && (tr.forrad?.ved ?? 0) >= KYRKA.hovVed) return 'hov'; // hovet byggs av trä ur kyrkans förråd
  if (pr > 60 && prastOf(s, tr) && (tr.forrad?.bar ?? 0) >= 1) return 'prast';
  if (opp < 40 && (tr.forrad?.bar ?? 0) >= 2) return 'fattig';
  if (tr.hov?.klar && !tr.gudabild && (tr.forrad?.ved ?? 0) >= 3) return 'gudabild';
  if (tr.hov?.klar && !tr.tempel && (tr.forrad?.sten ?? 0) >= KYRKA.templeSten) return 'tempel'; // templet av sten (steg 8.6.14)
  return undefined;
}
// bud som fråga i trons krets (steg 8.6.7)
const passar = (tr: Tro, b: BudDef) => { if (!b.skala) return true; const v = skalaV(tr, b.skala); if (v === undefined) return false; return b.sida === 0 ? v < 50 : v >= 50; };
// klockan 20: prästen eller profeten lägger ibland fram något i trons krets
export function kyrkaKvall(s: State) {
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined) continue;
    const pr = prastOf(s, tr) ?? living(s).find(p => p.tro === tr.id && p.profet);
    if (!pr || rnd(s, 'tro', pr) >= KYRKA.fram) continue;
    const vad = utgiftNu(s, tr);
    if (vad) { rostaOm(s, { f: 'kyrkutgift', d: { tro: tr.id, vad } as FragaData, fram: pr.id }); return; }
    const nasta = (Object.keys(BUD) as BudId[]).filter(id => !tr.bud?.includes(id) && BDEF[id].niva <= troNiva(tr) && passar(tr, BDEF[id]) && (BDEF[id].storlek < 3 || (s.seder.v.andlig ?? 0) > 0 || BDEF[id].storlek === 3)).sort((a, b) => BDEF[a].storlek - BDEF[b].storlek)[0];
    if (nasta) { rostaOm(s, { f: 'nyttBud', d: { tro: tr.id, id: nasta } as FragaData, fram: pr.id }); return; }
  }
}
// ---------- hovet och templet (steg 8.6.14) ----------
// tron bygger först ett hov av trä och sedan ett tempel av sten där hovet står. Båda är rader i PROJEKT (kyrkaRegister) på
// nivån Förbättra: bara den som tror på just den tron bygger, och materialet tas ur kyrkans förråd
type KyrkBygge = 'hov' | 'tempel';
const byggeAv = (tr: Tro, k: KyrkBygge) => k === 'hov' ? tr.hov : tr.tempel;
const byggesMin = (k: KyrkBygge) => k === 'hov' ? KYRKA.hovMin : KYRKA.tempelMin;
// det som byggs härnäst: hovet, och när det är klart templet
const nastaBygge = (tr: Tro): KyrkBygge | undefined => tr.hov && !tr.hov.klar ? 'hov' : tr.hov?.klar && tr.tempel && !tr.tempel.klar ? 'tempel' : undefined;
const kanBygga = (s: State, p: Person, k: KyrkBygge) => { const tr = troOf(s, p.tro); return !!tr && tr.slut === undefined && nastaBygge(tr) === k && ageOf(p, s.now) >= ALDER.vuxen && (k === 'tempel' || (tr.forrad?.ved ?? 0) >= 1); };
function kyrkBygge(k: KyrkBygge): ProjektDef {
  return {
    namn: k === 'hov' ? 'Hovet' : 'Templet', vikt: k === 'hov' ? KYRKA.hovVikt : KYRKA.tempelVikt,
    brist: s => { const n = living(s).length, tr = (s.tron ?? []).filter(t => t.slut === undefined && nastaBygge(t) === k); return n && tr.length ? Math.min(1, tr.reduce((a, t) => a + troende(s, t).length, 0) / n) : 0; },
    kostnad: () => byggesMin(k) / 60,
    kan: (s, p) => kanBygga(s, p, k),
    uppgift: (s, p) => { const tr = troOf(s, p.tro)!, b = byggeAv(tr, k)!; return { act: 'hovbygge', text: `Bygger ${troNamn(tr).toLowerCase()}s ${k === 'hov' ? 'hov' : 'tempel'}`, min: 60, spot: { x: b.x + 0.5, y: b.y + 0.5 } }; },
  };
}
export function hovArbete(s: State, p: Person, min: number) {
  const tr = troOf(s, p.tro), k = tr && nastaBygge(tr), b = k && byggeAv(tr, k);
  if (!tr || !k || !b) return;
  b.prog += min;
  if (b.prog < byggesMin(k)) return;
  b.klar = s.now;
  if (k === 'hov') { const f = tr.forrad ??= {}; f.ved = Math.max(0, (f.ved ?? 0) - KYRKA.hovVed); } // hovet tar sitt trä
  const t = k === 'hov' ? `${troNamn(tr)} har byggt ett hov.` : `${troNamn(tr)} har byggt ett tempel av sten där hovet stod.`;
  log(s, t, 'rel', [p.id]); kronika(s, t, 'tro'); count(s, k === 'hov' ? 'hov' : 'tempel');
}
// ---------- helgonen (steg 8.6.5) ----------
function helgonDygn(s: State) {
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined) continue;
    const kand = s.people.find(p => p.died !== undefined && s.now - p.died >= KYRKA.helgonDygn * DAY && p.tro === tr.id && p.fame.length >= 3 && !tr.helgon?.some(h => h.id === p.id) && !living(s).some(q => s.rels[relKey(p.id, q.id)]));
    if (!kand) continue;
    (tr.helgon ??= []).push({ id: kand.id, namn: kand.name, t: s.now, krönika: kand.fame.slice(0, 3).join('. ') + '.', myt: `${kand.fame[0]}. Så berättar de, och varje gång blir det större.` });
    count(s, 'helgon');
    const t = `${kand.name} har blivit ett helgon i ${troNamn(tr).toLowerCase()}.`;
    log(s, t, 'rel', []); kronika(s, t, 'tro');
    const g = s.gravar?.find(q => q.vem === kand.id);
    if (g) helga(s, tr, g.x, g.y, `där ${kand.name} ligger begravd`);
  }
}
// ---------- kvädena (steg 8.6.13) ----------
function kvadeDygn(s: State) {
  for (const tr of s.tron ?? []) {
    const pr = tr.slut === undefined ? prastOf(s, tr) : undefined;
    if (!pr || (tr.kvade?.t ?? -Infinity) + KYRKA.kvadeDygn * DAY > s.now) continue;
    const g = gudarOf(tr)[0], rad = [`${tr.bakom} vill ${tr.vill}.`, g ? `${g.namn} vakar.` : '', tr.ber ?? ''].filter(Boolean).join(' ');
    const lar = troende(s, tr).filter(p => p !== pr && ageOf(p, s.now) >= ALDER.vuxen).sort((a, b) => stat(b, 'minne', s.now) - stat(a, 'minne', s.now))[0];
    tr.kvade = { t: s.now, text: rad, av: pr.id, larjunge: lar?.id };
    count(s, 'kvade');
    if (lar) { lar.troStyrka = Math.min(100, (lar.troStyrka ?? 0) + 3); upplev(s, lar, 'tecken', 'de heliga kvädena'); }
  }
}
// ---------- överstepräst, välsignelse och fördömelse (steg 8.6.16) ----------
export const overstePrast = (s: State) => { const tr = (s.tron ?? []).filter(t => t.slut === undefined && prastOf(s, t)).sort((a, b) => troende(s, b).length - troende(s, a).length)[0]; return tr && prastOf(s, tr); };
// varje dygn: översteprästen välsignar eller fördömer ledaren efter vad hen tycker. Det väger efter var seden Världslig – Andlig står
function valsignaDygn(s: State) {
  const o = overstePrast(s), l = ledareOf(s), st = s.styre;
  if (!st || !l || !o || o === l) { if (st) st.kyrka = undefined; return; }
  const op = s.rels[relKey(o.id, l.id)]?.op ?? 0, andlig = Math.max(0, s.seder.v.andlig ?? 0), ny = op > 20 ? 1 : op < -20 ? -1 : 0;
  if (ny !== (st.kyrka ?? 0) && andlig > 0.2) log(s, ny > 0 ? `${o.name} välsignade ${l.name}.` : ny < 0 ? `${o.name} fördömde ${l.name}.` : `${o.name} teg om ${l.name}.`, 'rel', [o.id, l.id]);
  st.kyrka = ny; st.kyrkaVikt = andlig * KYRKA.valsigna;
}
// ---------- budens verkan (steg 8.6.6–8.6.10) ----------
// förbuden mot handlingar frågar valet av aktivitet (budForbjuder). Resten verkar här: kraven vid sin tid och offren vid sitt
// tillfälle varje dygn (budDygn), och de bud som rör andra system när det händer (budTillfalle, via folk.ts). Bara den som
// följer budet (foljer) påverkas; kyla och svält går före, som i fastan (behov.ts)
const harBud = (s: State, p: Person | undefined, id: BudId) => { const tr = p && troOf(s, p.tro); return !!tr?.bud?.includes(id) && foljer(p!, id); };
let doda: (s: State, p: Person) => void = () => {};
export const satOffrad = (f: typeof doda) => { doda = f; };
function budDygn(s: State) {
  const dag = Math.floor(s.now / DAY), fodda = (s.stat?.fodda ?? 0) + (s.stat?.doda ?? 0);
  for (const tr of s.tron ?? []) {
    if (tr.slut !== undefined || !tr.bud?.length) continue;
    const vuxna = troende(s, tr).filter(p => ageOf(p, s.now) >= ALDER.vuxen), med = (id: BudId) => tr.bud!.includes(id) ? vuxna.filter(p => foljer(p, id)) : [];
    const krav = (id: BudId, text: string) => { for (const p of med(id)) { p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KYRKA.kravTro); think(p, text, KYRKA.kravHumor, s.now, 12 * HOUR); } };
    // kraven: att tacka före maten och hälsa elden på morgonen, och att be när någon fötts eller dött
    krav('tacka', 'Tackade gudarna för maten'); krav('halsa', 'Hälsade elden i morse');
    if (fodda !== (tr.fodda ?? fodda)) krav('fodsel', 'Bad för den som fötts eller dött');
    tr.fodda = fodda;
    // fastan: en dag av sju äter den troende inte (p.fasta, behov.ts)
    if ((dag + tr.id) % KYRKA.vecka === 3) for (const p of med('fasta')) p.fasta = s.now + DAY;
    // den första fångsten går till tron: en hel sak mat ur byns förråd per forstaPer som följer budet
    const ff = med('forstaFangst').length;
    if (ff) { const n = Math.ceil(ff / KYRKA.forstaPer), k = FOOD.filter(q => amountOf(s, q) >= n).sort((a, b) => amountOf(s, b) - amountOf(s, a))[0]; if (k) { addTo(s, k, -n); gavaIn(tr, k, n); count(s, 'forstaFangst'); } }
    // tionde till prästen: en tiondel av den egna maten, i hela saker
    const pr = prastOf(s, tr);
    if (pr) for (const p of med('tionde')) {
      if (p === pr) continue;
      const egen = ownedStock(s, p);
      if (FOOD.reduce((a, k) => a + (egen[k] ?? 0), 0) < KYRKA.tiondeMin) continue;
      let gav = 0;
      for (const k of FOOD) { const m = Math.floor((egen[k] ?? 0) * KYRKA.tionde); if (m >= 1) gav += ownMove(s, k, m, p.id, pr.id); }
      if (gav >= 1) count(s, 'tionde');
    }
    // djuroffret en gång i veckan, och människooffret: bara den som dömts, högst en gång på offerDygn
    if ((dag + tr.id) % KYRKA.vecka === 0 && tr.bud.includes('djuroffer')) {
      if (amountOf(s, 'kott') >= KYRKA.djur) { addTo(s, 'kott', -KYRKA.djur); count(s, 'djuroffer'); for (const p of med('djuroffer')) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + 2); }
      else for (const p of med('djuroffer')) think(p, 'Tron kräver djur, och det finns inget att offra', KYRKA.djurSakna, s.now, DAY);
    }
    if (tr.bud.includes('manniskooffer') && dag - (tr.offrad ?? -Infinity) >= KYRKA.offerDygn) {
      const q = living(s).find(p => p.straffad && p.tro !== tr.id); // den som straffats hårt på tinget
      if (q) { tr.offrad = dag; count(s, 'manniskooffer'); const t = `${troNamn(tr)} offrade ${q.name}, som dömts för sitt brott.`; log(s, t, 'death', [q.id]); kronika(s, t, 'tro'); doda(s, q); }
    }
  }
}
// de bud som verkar i andra system (folk.ts budTillfalle): true = budet stoppar det
function budTillfalleK(s: State, typ: BudTillfalle, p: Person, q?: Person): boolean {
  if (!s.tron?.length) return false;
  if (typ === 'framling') { // främlingar ska få mat: de som följer budet ger, och relationen blir bättre
    let gav = false;
    for (const f of living(s)) if (f !== p && harBud(s, f, 'framling')) { const r = s.rels[relKey(f.id, p.id)]; if (r) r.op = Math.min(100, r.op + KYRKA.framlingRel); gav = true; }
    if (gav) { p.hunger = Math.min(1, p.hunger + KYRKA.framlingMat); count(s, 'framling_mat'); }
    return false;
  }
  if (typ === 'par') return !!q && ((harBud(s, p, 'giftaTro') || harBud(s, q, 'giftaTro')) && p.tro !== q.tro || [p, q].some(x => harBud(s, x, 'ogifta') && prastOf(s, troOf(s, x.tro)!) === x));
  if (typ === 'skadad') { // hämnd är en plikt: den drabbade glömmer inte
    if (!q || !harBud(s, p, 'hamnd')) return false;
    const r = s.rels[relKey(p.id, q.id)]; if (r) r.op = Math.max(-100, r.op - KYRKA.hamndRel);
    think(p, `Måste hämnas på ${q.name}`, -0.03, s.now, 2 * DAY); count(s, 'hamnd_plikt');
    return false;
  }
  if (typ === 'talaIlla') return harBud(s, p, 'deDoda');
  if (typ === 'falla') return harBud(s, p, 'lunden');
  return false;
}
// ---------- varje timme ----------
export function kyrkaTimme(s: State) {
  for (const tr of s.tron ?? []) { if (tr.slut !== undefined) continue; const folk = troende(s, tr); if (folk.length) offerTimme(s, tr, folk); }
  if (Math.floor(s.now / HOUR) % 24 === 12) { skattDygn(s); helgonDygn(s); kvadeDygn(s); valsignaDygn(s); budDygn(s); }
  const f = s.tron?.length ? living(s).filter(p => p.tro !== undefined).length : 0;
  if (f >= 3 && s.styre) oppnaAndlig(s);
}
let oppnaAndlig: (s: State) => void = () => {};
export const satOppnaAndlig = (f: typeof oppnaAndlig) => { oppnaAndlig = f; };
// raderna i LAGAR och FRAGOR som hör till kyrkan läggs till när allt är laddat (steg.ts)
// hovet och templet som rader i PROJEKT (steg 8.6.14); steg.ts lägger in dem när allt är laddat
export const kyrkProjekt = (): Record<string, ProjektDef> => ({ hov: kyrkBygge('hov'), tempel: kyrkBygge('tempel') });
export function kyrkaRegister() {
satBudTillfalle((s, typ, p, q) => budTillfalleK(s, typ, p, q));
for (const id of Object.keys(BUD) as BudId[]) if (BDEF[id].sort === 'forbud' && BDEF[id].acts) LAGAR[budLag(id)] = { namn: BDEF[id].namn, sym: '📜', text: BDEF[id].text, straff: 4, brott: ['budbrott'], kan: s => (s.seder.v.andlig ?? 0) > 0.2 && !!s.tron?.some(t => t.bud?.includes(id)), prio: s => (s.seder.v.andlig ?? 0) > 0.2 && s.tron?.some(t => t.bud?.includes(id)) ? clamp((s.seder.v.andlig ?? 0), 0, 1) * 0.6 : 0, rost: (s, p) => { const ja = !!troOf(s, p.tro)?.bud?.includes(id); return { v: ja ? 0.6 : -0.4, why: ja ? 'Tror på budet' : 'Delar inte tron' }; }, om: 'kyrkans önskan' };
LAGAR.kyrkskatt = { namn: 'Kyrkskatt', sym: '📜', text: 'En del av byns förråd går till kyrkan', straff: 4, om: 'kyrkans krav', kan: s => !!s.tron?.some(t => troNiva(t) >= 4), prio: s => (s.seder.v.andlig ?? 0) > 0.4 ? clamp(s.seder.v.andlig, 0, 1) * 0.7 : 0, rost: (_s, p) => ({ v: p.tro !== undefined ? 0.4 : -0.5, why: p.tro !== undefined ? 'Vill stödja tron' : 'Betalar inte för en tro hen inte har' }) };
LAGAR.ejKyrkskatt = { namn: 'Förbud mot kyrkskatt', sym: '📜', text: 'Kyrkan tar inget ur byns förråd', straff: 0, om: 'kyrkans makt', kan: s => !!s.tron?.length, prio: s => (s.seder.v.andlig ?? 0) < -0.4 ? clamp(-s.seder.v.andlig, 0, 1) * 0.6 : 0, rost: (_s, p) => ({ v: p.tro === undefined ? 0.5 : -0.4, why: p.tro === undefined ? 'Delar inte tron' : 'Vill stödja tron' }) };
FRAGOR.kyrkutgift = {
  namn: (s, d) => `${troNamn(troOf(s, d.tro as number)!)}: ${{ hov: 'bygga ett hov', tempel: 'bygga ett tempel av sten', prast: 'försörja prästen', fattig: 'ge åt de fattiga', gudabild: 'resa en gudabild' }[d.vad as string]}`, krets: 'tro',
  rost: (s, p, d) => ({ v: (d.vad === 'hov' ? 0.3 : 0.1) + (andlighet(s, p) - 50) / 100, why: 'Tycker att det är rätt för tron' }),
  gor: (s, d) => {
    const tr = troOf(s, d.tro as number)!, f = tr.forrad ??= {};
    if (d.vad === 'hov') { const at = helig(s, tr), e = eldPlats(s), q = freeNear(s, (at?.x ?? e.x) + 2, (at?.y ?? e.y) + 2); tr.hov = { x: Math.floor(q.x), y: Math.floor(q.y), prog: 0 }; log(s, `${troNamn(tr)} ska bygga ett hov.`, 'rel', []); }
    if (d.vad === 'prast') { const pr = prastOf(s, tr); if (pr) { f.bar--; think(pr, 'Fick mat av tron', 0.03, s.now, 6 * HOUR); } }
    if (d.vad === 'fattig') { const q = living(s).filter(p => p.hunger < 0.6).sort((a, b) => a.hunger - b.hunger)[0]; if (q) f.bar -= 2; if (q) { q.hunger = Math.min(1, q.hunger + 0.3); think(q, 'Fick mat av tron', 0.05, s.now, 6 * HOUR); } }
    if (d.vad === 'tempel' && tr.hov) { f.sten = (f.sten ?? 0) - KYRKA.templeSten; tr.tempel = { x: tr.hov.x, y: tr.hov.y, prog: 0 }; log(s, `${troNamn(tr)} ska bygga ett tempel av sten där hovet står.`, 'rel', []); }
    if (d.vad === 'gudabild') { f.ved -= 3; tr.gudabild = s.now; log(s, `${troNamn(tr)} reste en gudabild av trä.`, 'rel', []); }
  },
};
FRAGOR.nyttBud = {
  namn: (s, d) => `${troNamn(troOf(s, d.tro as number)!)}: ${BDEF[d.id as BudId].namn}`, krets: 'tro',
  rost: (_s, p, d) => { const b = BDEF[d.id as BudId], st = (p.troStyrka ?? 0) / 100; return { v: st - b.storlek * 0.12, why: st - b.storlek * 0.12 > 0 ? 'Tror att budet är rätt' : 'Tycker att budet är för hårt' }; },
  gor: (s, d) => { const tr = troOf(s, d.tro as number)!; (tr.bud ??= []).push(d.id as BudId); count(s, 'bud_ny'); const t = `${troNamn(tr)} fick ett nytt bud: ${BDEF[d.id as BudId].namn.toLowerCase()}.`; log(s, t, 'rel', []); kronika(s, t, 'tro'); },
};
}
