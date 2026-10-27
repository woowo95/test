import { Act, MIN, Person, SEC, State, Task, W } from './typer';
import { getMap } from './karta';
import { knows } from './teknik';
import { count, doingAct, forstaGang, log } from './folk';
import { getable, takeMaterial } from './behov';
import { RESERV } from './ekonomi';
import { Ting, tingOf } from './agande';
import { BYN } from './egendom';
import { usable, zonesOf } from './lager';
import { PLATS } from './plats';
import { balans } from './balans';
import { Rum, bitAt, gridOf, husById, roomAt, touch } from './byggnad';
import { fnOf, sovKvar } from './byggnader';
import { ACTS } from './handlingar';
import { tileOf } from './mark';

// ---------- arbetsstationer och möbler (steg 2.2.3, 2.2.5) ----------
// En station är en plats i byn där ett visst arbete görs: vid slaktbänken slaktas viltet och fisken rensas, vid slöjdbänken
// (som hette flätarbänken före v59) tvinnas rep och flätas korgar (steg 2.2.4). Möblerna står i samma register och byggs
// på samma sätt: halmbädden är den första (steg 2.2.5), och den som sover i den vilar upp sig fortare. Varje sorts
// station är en rad i registret STATIONER: vad den kräver (tekniken och materialet), hur länge den tar att bygga, vilka
// handlingar som görs där och hur många knivar som ligger kvar vid den. En ny station blir en rad här (grillställningen
// 2.8.1). Det enklaste görs med händerna var som helst; så länge byn inte har stationen görs arbetet vid elden som förut
// (spotFor i val.ts). Det som står under bara görs inte alls utan stationen: viltet slaktas och fisken rensas bara vid
// slaktbänken (2.2.6, 2.2.8), och innan byn har en äts det fällda djuret och den hela abborren som de är, med mindre kött och
// inget ben eller skinn; korgen flätas bara vid slöjdbänken. Rep tvinnas fortare vid slöjdbänken än för hand vid elden.
// Byggs gör den av den som kan tekniken och har tid för handarbete (craft i val.ts), med materialet ur förrådet efter
// behovsstegen (behov.ts). Arbetet kan avbrytas: stationen står kvar halvbyggd och vem som helst som kan tekniken bygger
// klart den. Den tar en eller flera rutor (bredd och djup i registret), där inget annat får ligga eller byggas (usable i
// lager.ts), och den kan stå vriden (rot: bredd och djup byter plats), men står helst som i registret. Registret säger om
// den står ute eller inne (inne): ute står den nära elden, inne på golvet i ett färdigt hus, med golv framför sig där man
// står och arbetar, och bara där den inte tar en sovplats som någon behöver (sovKvar i byggnader.ts). En slöjdbänk som
// byggdes ute före v59 står kvar där. Rivs huset försvinner det som stod inne. En möbel som sover (halmbädden) är en
// sovplats, och rutorna den tar är inga andra sovplatser (byggnader.ts). Det byn kan ha flera av (flera) byggs så länge
// projektet säger att byn saknar dem (projekt.ts). På kartan ritas den uppifrån, med en bild lika stor som rutorna (ikoner.ts).
// Knivplatsen: en kniv hör till stationen (Ting.vid) och ligger kvar där när ingen använder den, så att det alltid finns
// en kniv när någon ska slakta. Saknas kniven vill byn ha en till (VILL i redskap.ts), och den som görs läggs vid bänken.

// ---------- balanstal (regel 8) ----------
export const STATION = balans('station', {
  slaktbankTra: 3, // en slaktbänk kräver så mycket trä ...
  slaktbankMin: 90, // ... och så många minuters arbete
  avstand: 2.5, // en station står helst så här många rutor från elden
  norr: 0.5, // ... och får så här många poäng (färre är bättre) om den står söder om elden, där barnen leker
  knivplatser: 1, // så många knivar som ligger kvar vid slaktbänken
  flatarbankTra: 2, // en flätarbänk kräver så mycket trä ...
  flatarbankGrenar: 3, // ... och så många grenar ...
  flatarbankMin: 60, // ... och så många minuters arbete
  repFart: 2, // rep tvinnas så här många gånger fortare vid slöjdbänken än för hand ...
  vidBank: 1.5, // ... av den som står så här nära bänken (rutor)
  vriden: 0.5, // en station som står vriden får så här många poäng (färre är bättre), så att den helst står som i registret
  badd: 0.1, // inne: så här många poäng mindre för varje sida som står mot en vägg ...
  dorr: 1, // ... och så här många fler för varje ruta bredvid en öppning, där man går in
  samling: 1, // ... och så här många mindre i ett hus där ingen sover (samlingshuset), för det som inte är en bädd
  halmbaddHo: 4, // en halmbädd kräver så mycket hö ...
  halmbaddGrenar: 2, // ... och så många grenar ...
  halmbaddMin: 20, // ... och så många minuters arbete
  fallSkinn: 2, // en skinnfäll kräver så många skinn ... (steg 2.2.14)
  fallMin: 20, // ... och så många minuters arbete
  fallVarme: 0.5, // den som sover under en skinnfäll kyls så här mycket mindre (av det som når in i huset)
});

// namn och ikon (ikoner.ts; kartans bild uppifrån heter ikon_karta), w och h = rutorna den tar (bredd och djup), tek = teknikerna, och den som kan någon av dem bygger den, av = materialet, min = minuters arbete,
// gor = handlingarna som görs vid den, bara = de av dem som inte görs alls utan stationen, kniv = knivar som hör till den, bygger = texten för den som bygger,
// forsta = loggen när byn fått sin första, inne = står inne i ett hus, mobel = en möbel, flera = byn kan ha flera, sover = en sovplats
// (halmbädden), sitt = en sittplats framför den (bara utseende, steg 2.2.5)
export interface StationDef { namn: string; ikon: string; w: number; h: number; tek: string[]; av: Record<string, number>; min: number; gor: Act[]; bara?: Act[]; kniv?: number; bygger: string; forsta: string; inne?: true; mobel?: true; flera?: true; sover?: true; sitt?: true }
export const STATIONER = {
  slaktbank: {
    namn: 'Slaktbänk', ikon: 'slaktbank', w: 3, h: 1, tek: ['slaktbank'], av: { ved: STATION.slaktbankTra }, min: STATION.slaktbankMin, gor: ['slakta', 'rensa'], bara: ['slakta', 'rensa'], kniv: STATION.knivplatser,
    bygger: 'Bygger en slaktbänk av trä.',
    forsta: '{namn} byggde byns första slaktbänk av trä. Där slaktas viltet och rensas fisken, och en kniv ligger kvar vid bänken.',
  },
  flatarbank: { // slöjdbänken: id:t är kvar från när den hette flätarbänken, så att sparade byar fungerar
    namn: 'Slöjdbänk', ikon: 'flatarbank', w: 2, h: 1, tek: ['flatarbank'], av: { ved: STATION.flatarbankTra, grenar: STATION.flatarbankGrenar }, min: STATION.flatarbankMin, gor: ['tvinna', 'korg'], bara: ['korg'], inne: true, sitt: true,
    bygger: 'Bygger en slöjdbänk av trä och grenar.',
    forsta: '{namn} byggde byns första slöjdbänk. Där tvinnas rep fortare än för hand och flätas korgar.',
  },
  halmbadd: {
    namn: 'Halmbädd', ikon: 'halmbadd', w: 2, h: 1, tek: ['halmbadd'], av: { torrgras: STATION.halmbaddHo, grenar: STATION.halmbaddGrenar }, min: STATION.halmbaddMin, gor: [], inne: true, mobel: true, flera: true, sover: true,
    bygger: 'Bäddar en halmbädd av hö och grenar.',
    forsta: '{namn} gjorde byns första halmbädd. Den som sover i den vilar upp sig fortare.',
  },
} satisfies Record<string, StationDef>;
export type StationSlag = keyof typeof STATIONER;
export const STATION_LIST = Object.keys(STATIONER) as StationSlag[];
export const stationDef = (k: string): StationDef | undefined => (STATIONER as Record<string, StationDef>)[k];

// en station i byn: rutan längst upp till vänster av dem den står på, hur länge (ms) arbetet med att bygga den har kvar (0 = klar), vilka som byggt på
// den och när den blev klar (det visas när man trycker på den, flikar/station.ts)
// rot = vriden (bredd och djup byter plats), inne = byggd inne i ett hus (den försvinner om huset rivs)
// med = tillbehören som ligger i den (TILLBEHOR, t.ex. skinnfällen i bädden)
export interface Station { id: number; k: string; x: number; y: number; kvar: number; vem?: number[]; klar?: number; rot?: 1; inne?: 1; med?: string[] }
const NONE: Station[] = [];
export const stationerOf = (s: State) => s.stationer ?? NONE;
export const stationById = (s: State, id?: number) => id === undefined ? undefined : stationerOf(s).find(t => t.id === id);
export const isKlar = (t: Station) => t.kvar <= 0;
// hur stor del av bygget som är gjort (0 till 1), för framstegscirkeln på kartan
export const stationKlar = (t: Station) => Math.min(1, Math.max(0, 1 - t.kvar / ((stationDef(t.k)?.min ?? 1) * MIN)));
// rutorna stationen tar (bredd och djup i registret, bytta när den står vriden; en okänd sort tar en ruta)
export const storlek = (k: string, rot?: unknown) => { const d = stationDef(k), w = d?.w ?? 1, h = d?.h ?? 1; return rot ? { w: h, h: w } : { w, h }; };
export const storlekAv = (t: { k: string; rot?: unknown }) => storlek(t.k, t.rot);
// rutorna (index i kartan) som stationerna tar, och sovplatserna i de färdiga möbler man sover i (rutan uppe till vänster).
// Räknas om när något byggs (s.byggV)
interface Rutor { v: number; n: number; at: Map<number, Station>; sov: Set<number> }
const rutorCache = new WeakMap<State, Rutor>();
export function stationRutor(s: State): Rutor {
  const st = stationerOf(s), v = s.byggV ?? 0;
  let r = rutorCache.get(s);
  if (r && r.v === v && r.n === st.length) return r;
  const at = new Map<number, Station>(), sov = new Set<number>();
  for (const t of st) {
    const { w, h } = storlekAv(t);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) at.set((t.y + j) * W + t.x + i, t);
    if (isKlar(t) && stationDef(t.k)?.sover) sov.add(t.y * W + t.x);
  }
  r = { v, n: st.length, at, sov };
  rutorCache.set(s, r);
  return r;
}
// står det en station (klar eller halvbyggd) på rutan?
export function stationAt(s: State, x: number, y: number) {
  if (!s.stationer?.length || x < 0 || y < 0) return undefined;
  return x < W ? stationRutor(s).at.get(Math.floor(y) * W + Math.floor(x)) : undefined;
}
// den färdiga station där handlingen görs, om byn har en
export const stationFor = (s: State, act: Act) => stationerOf(s).find(t => isKlar(t) && stationDef(t.k)?.gor.includes(act));
// handlingen görs bara vid en station (bara i registret)
const BARA = new Set<Act>(STATION_LIST.flatMap(k => (STATIONER[k] as StationDef).bara ?? []));
// handlingen kan göras: den kräver ingen station, eller byn har en färdig
export const kanGoras = (s: State, act: Act) => !BARA.has(act) || !!stationFor(s, act);
// platsen där man står och arbetar vid stationen: mitt för den på rutan söder om den
export const vidStation = (t: Station) => { const { w, h } = storlekAv(t); return { x: t.x + w / 2, y: t.y + h + 0.1 }; };

// ---------- var den står ----------
// en ruta där inget annat ligger eller står: inte på en lagerplats, ett hus, en stack, ett redskap, en stock eller en stubbe
function ledig(s: State, x: number, y: number) {
  if (!usable(s, x, y) || zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
  return !((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y));
}
// platsen för en station av sorten k: inne i ett hus om registret säger det, annars nära elden. Samma plats varje gång (ingen slump)
export const stationSite = (s: State, k: string) => stationDef(k)?.inne ? siteInne(s, k) : siteUte(s, k);
// ute: alla rutorna den tar är lediga, och den står helst inte där barnen leker. Avståndet räknas från stationens mitt
function siteUte(s: State, k: string) {
  const f = getMap(s.seed).fire;
  let best: { x: number; y: number; rot?: 1 } | undefined, bs = Infinity;
  for (const rot of [0, 1] as const) {
    const { w, h } = storlek(k, rot), R = Math.ceil(STATION.avstand) + 2 + Math.max(w, h);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = f.x + dx, y = f.y + dy;
      let fri = true;
      for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = ledig(s, x + i, y + j);
      if (!fri) continue;
      const mx = dx + (w - 1) / 2, my = dy + (h - 1) / 2;
      const lek = Math.abs(mx) <= PLATS.lekBredd / 2 && my >= PLATS.lekFran - 1 ? STATION.norr * 4 : my > 0 ? STATION.norr : 0;
      const sc = Math.abs(Math.hypot(mx, my) - STATION.avstand) + lek + rot * STATION.vriden;
      if (sc < bs) { bs = sc; best = rot ? { x, y, rot } : { x, y }; }
    }
  }
  return best;
}
// inne: en golvruta i rummet där ingen station står, inget ligger och som inte är en lagerplats
function golvFri(s: State, rum: Set<number>, W: number, x: number, y: number) {
  const i = y * W + x;
  return rum.has(i) && !stationRutor(s).at.has(i) && !zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
    && !(s.stackar ?? []).some(a => a.x === x && a.y === y) && !tingOf(s).some(q => q.x === x && q.y === y && q.hos === undefined && q.lass === undefined);
}
// inne: i ett färdigt hus (en möbel man sover i bara där man sover, det andra inte i ett förrådshus), på lediga golvrutor med
// golv framför sig, och bara om den inte tar en sovplats som någon behöver. Helst mot en vägg och inte vid öppningen
function siteInne(s: State, k: string) {
  const d = stationDef(k)!, g = gridOf(s);
  let best: { x: number; y: number; rot?: 1; inne: 1 } | undefined, bs = Infinity;
  for (const r of g.rooms) {
    const hus = husById(s, r.hus);
    if (!hus?.klar || !r.tiles.length) continue;
    const fn = fnOf(hus);
    if (d.sover ? !fn.sover : fn.lager) continue;
    const rum = new Set(r.tiles), kvar = sovKvar(s, r), bonus = !d.sover && !fn.sover ? -STATION.samling : 0;
    for (const rot of [0, 1] as const) {
      const { w, h } = storlek(k, rot), tar = w * h - (d.sover ? 1 : 0);
      if (tar > kvar) continue;
      for (const i0 of r.tiles) {
        const x = i0 % W, y = (i0 - x) / W;
        let fri = true, sc = rot * STATION.vriden + bonus;
        for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = golvFri(s, rum, W, x + i, y + j);
        for (let i = 0; i < w && fri; i++) fri = rum.has((y + h) * W + x + i) && !stationRutor(s).at.has((y + h) * W + x + i); // golvet framför
        if (!fri) continue;
        for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
          if ((i === -1 || i === w) === (j === -1 || j === h)) continue; // bara rutorna rakt bredvid, inte hörnen
          const b = bitAt(s, x + i, y + j);
          if (b?.k === 'vagg') sc -= STATION.badd; else if (b?.k === 'oppning') sc += STATION.dorr;
        }
        if (sc < bs) { bs = sc; best = rot ? { x, y, rot, inne: 1 } : { x, y, inne: 1 }; }
      }
    }
  }
  return best;
}
// rummet där en station som står inne står
export const stationRum = (s: State, t: Station): Rum | undefined => t.inne ? roomAt(s, t.x, t.y) : undefined;

// ---------- att bygga en station ----------
const sparas = (k: string) => k === 'ved' ? RESERV.ved : k === 'grenar' ? RESERV.grenar : k === 'torrgras' ? RESERV.torrgras : 0;
const halvbyggd = (s: State, k: string) => stationerOf(s).find(t => t.k === k && !isKlar(t));
// den station p vill bygga: p kan någon av teknikerna, byn har ingen färdig av slaget, ingen annan bygger en, och den är påbörjad
// eller p kan få tag i materialet utan att ta det som sparas till elden
export const stationAttBygga = (s: State, p: Person): StationSlag | undefined => STATION_LIST.find(k => kanBygga(s, p, k));
// p kan bygga (eller bygga vidare på) en station av sorten k som byn saknar (det byn kan ha flera av: om projektet säger att byn
// saknar fler, projekt.ts)
export function kanBygga(s: State, p: Person, k: StationSlag) {
  const d: StationDef = STATIONER[k];
  if (doingAct(s, 'station', p) || !d.tek.some(k => knows(p, k)) || !d.flera && harStation(s, k)) return false;
  return !!halvbyggd(s, k) || Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m)) && !!stationSite(s, k);
}
// byn har en färdig station av sorten k
export const harStation = (s: State, k: string) => stationerOf(s).some(t => t.k === k && isKlar(t));
// platsen dit den som ska bygga går: den halvbyggda stationen, annars rutan där den ska stå
export function stationSpot(s: State, k: string) {
  const t = halvbyggd(s, k), at = t ?? stationSite(s, k);
  return at ? vidStation({ id: 0, k, kvar: 1, x: at.x, y: at.y, rot: at.rot }) : undefined;
}
// framme: bygg vidare på den halvbyggda, eller ta materialet och börja. Saknas materialet eller platsen blir det inget
export function startStation(s: State, p: Person, tk: Task) {
  const k = tk.tool ?? '', d = stationDef(k);
  let t = halvbyggd(s, k);
  if (d && !t && (d.flera || !stationerOf(s).some(q => q.k === k))) {
    const at = stationSite(s, k);
    if (at && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) {
      for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
      t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: at.x, y: at.y, kvar: d.min * MIN };
      if (at.rot) t.rot = 1;
      if ('inne' in at) t.inne = 1;
      (s.stationer ??= []).push(t);
      s.byggV = (s.byggV ?? 0) + 1; // en ny sak på kartan: vägarna och platserna räknas om
    }
  } else if (t) count(s, 'fortsatt');
  if (!t) { tk.ref = undefined; tk.until = s.now; return; }
  if (!t.vem?.includes(p.id)) (t.vem ??= []).push(p.id);
  tk.ref = t.id; tk.until = s.now + t.kvar;
}
// medan man bygger
export function workStation(s: State, _p: Person, tk: Task, dtSec: number) {
  const t = stationById(s, tk.ref);
  if (t) t.kvar = Math.max(0, t.kvar - dtSec * SEC);
}
// klar: första gången står det i loggen
export function finishStation(s: State, p: Person, tk: Task) {
  const t = stationById(s, tk.ref);
  if (!t || t.kvar > MIN) return;
  t.kvar = 0; t.klar = s.now;
  if (stationDef(t.k)?.sover) touch(s); // en ny sovplats: var man sover räknas om
  const d = stationDef(t.k)!;
  if (forstaGang(s, 'station_' + t.k)) { log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]); p.fame.push(`Byggde byns första ${d.namn.toLowerCase()}`); }
  fyllKnivplatser(s);
}

// ---------- tillbehören (steg 2.2.14) ----------
// Ett tillbehör görs till en färdig station eller möbel och ligger sedan i den (Station.med): skinnfällen är ett täcke i
// halmbädden, och den som sover under den fryser mindre. Varje sort är en rad i registret TILLBEHOR: vilken station den hör
// till (till), tekniken man måste kunna (tek, samma id som tillbehöret, teknik.ts), materialet (av) och minuterna (min), och
// vad den gör (varme: så mycket mindre kyla för den som sover i möbeln). Den görs i handlingen tillbehor (task.tool = sorten)
// av den som har tid för handarbete, när projektet säger att byn har möbler som saknar den (projekt.ts). Materialet tas
// när arbetet är klart, så att inget går förlorat om det avbryts. Rivs huset försvinner tillbehöret med möbeln.
export interface TillbehorDef { namn: string; ikon: string; till: string; tek: string[]; av: Record<string, number>; min: number; varme?: number; gor: string; forsta: string }
export const TILLBEHOR = {
  skinnfall: {
    namn: 'Skinnfäll', ikon: 'skinnfall', till: 'halmbadd', tek: ['skinnfall'], av: { skinn: STATION.fallSkinn }, min: STATION.fallMin, varme: STATION.fallVarme,
    gor: 'Lägger en skinnfäll i halmbädden.',
    forsta: '{namn} lade byns första skinnfäll i en halmbädd. Den som sover under den fryser mindre.',
  },
} satisfies Record<string, TillbehorDef>;
export type TillbehorSlag = keyof typeof TILLBEHOR;
export const TILLBEHOR_LIST = Object.keys(TILLBEHOR) as TillbehorSlag[];
export const tillbehorDef = (k: string): TillbehorDef | undefined => (TILLBEHOR as Record<string, TillbehorDef>)[k];
// de färdiga stationer som tillbehöret hör till, och de av dem som saknar det
export const tillbehorStationer = (s: State, k: TillbehorSlag) => stationerOf(s).filter(t => isKlar(t) && t.k === TILLBEHOR[k].till);
export const utanTillbehor = (s: State, k: TillbehorSlag) => tillbehorStationer(s, k).filter(t => !t.med?.includes(k));
// p kan göra tillbehöret: p kan tekniken, det finns fler stationer som saknar det än de som redan gör det, och p kan få tag i
// materialet
export function kanGoraTillbehor(s: State, p: Person, k: TillbehorSlag) {
  const d: TillbehorDef = TILLBEHOR[k];
  if (!d.tek.some(t => knows(p, t))) return false;
  const gor = doingAct(s, 'tillbehor', p) ? 1 : 0, utan = utanTillbehor(s, k).length;
  return utan > gor && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m));
}
// platsen dit den som gör tillbehöret går: framför den första stationen som saknar det
export function tillbehorSpot(s: State, k: TillbehorSlag) {
  const t = utanTillbehor(s, k)[0];
  return t ? vidStation(t) : undefined;
}
// klart: materialet tas och tillbehöret läggs i den första stationen som saknar det (har någon annan hunnit före blir det
// nästa, och saknar ingen det längre blir det inget)
export function finishTillbehor(s: State, p: Person, tk: Task) {
  const k = tk.tool as TillbehorSlag, d = tillbehorDef(k);
  if (!d) return;
  const t = utanTillbehor(s, k)[0];
  if (!t || !Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) return;
  for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
  (t.med ??= []).push(k);
  // byns statistik räknar dem (tillbehor_ + sorten), och den första står i loggen
  if (forstaGang(s, 'tillbehor_' + k)) { log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]); p.fame.push(`Gjorde byns första ${d.namn.toLowerCase()}`); }
}
// så mycket mindre kyla p får av tillbehören i möbeln hen sover i (0 = ingen skillnad), rum = rummet hen är i
export function tillbehorVarme(s: State, p: Person, rum: unknown) {
  const pd = p.task && ACTS[p.task.act];
  if (!rum || !s.stationer?.length || !pd?.vila || pd.plats !== 'sang' || p.task!.phase !== 'do') return 0;
  const t = stationRutor(s).at.get(tileOf(p.x, p.y));
  let v = 0;
  for (const k of t && isKlar(t) ? t.med ?? [] : []) v = Math.max(v, tillbehorDef(k)?.varme ?? 0);
  return v;
}

// ---------- knivplatsen ----------
// knivarna som hör till stationen
const knivarVid = (s: State, t: Station) => tingOf(s).filter(k => k.vid === t.id && k.k === 'kniv');
// så många knivplatser som står tomma i byns färdiga stationer
export function tommaKnivplatser(s: State) {
  let n = 0;
  for (const t of stationerOf(s)) if (isKlar(t)) n += Math.max(0, (stationDef(t.k)?.kniv ?? 0) - knivarVid(s, t).length);
  return n;
}
// den första färdiga station som har en tom knivplats
const tomPlats = (s: State) => stationerOf(s).find(t => isKlar(t) && knivarVid(s, t).length < (stationDef(t.k)?.kniv ?? 0));
// en kniv blir stationens: den är byns och ligger vid stationen när ingen använder den
function tillStation(k: Ting, t: Station) {
  k.vid = t.id; k.agare = BYN;
  if (k.hos === undefined && k.lass === undefined) { k.x = t.x; k.y = t.y; }
}
// en ny kniv läggs vid stationen om en knivplats står tom (redskap.ts, toolDone). true = den lades där
export function nyKniv(s: State, k: Ting) {
  const t = k.k === 'kniv' ? tomPlats(s) : undefined;
  if (!t) return false;
  tillStation(k, t);
  return true;
}
// en tom knivplats fylls med en av byns knivar som ligger i förrådet
export function fyllKnivplatser(s: State) {
  for (let t = tomPlats(s); t; t = tomPlats(s)) {
    const k = tingOf(s).find(q => q.k === 'kniv' && q.agare === BYN && q.vid === undefined && q.hos === undefined && q.lass === undefined);
    if (!k) return;
    tillStation(k, t);
  }
}
// en kniv som hör till en station och som ingen har i handen läggs tillbaka där (lager.ts, placeTools). true = den ligger där.
// Finns inte stationen längre hör kniven inte till någon
export function tillbakaVid(s: State, k: Ting) {
  if (k.vid === undefined) return false;
  const t = stationById(s, k.vid);
  if (!t) { k.vid = undefined; return false; }
  k.x = t.x; k.y = t.y;
  return true;
}
// varje timme: tomma knivplatser fylls, och det som stod inne i ett hus som rivits försvinner
export function stepStationer(s: State) {
  if (!s.stationer?.length) return;
  fyllKnivplatser(s);
  const borta = s.stationer.filter(t => t.inne && !stationRum(s, t));
  if (!borta.length) return;
  s.stationer = s.stationer.filter(t => !borta.includes(t));
  for (const k of tingOf(s)) if (borta.some(t => t.id === k.vid)) k.vid = undefined;
  touch(s);
  for (const t of borta) log(s, `${stationDef(t.k)?.namn ?? 'En station'} försvann när huset revs.`, 'world');
}
