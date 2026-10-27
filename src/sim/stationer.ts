import { Act, H, MIN, Person, SEC, State, T, Task, W } from './typer';
import { getMap } from './karta';
import { knows } from './teknik';
import { count, doingAct, forstaGang, living, log } from './folk';
import { getable, takeMaterial } from './behov';
import { RESERV } from './ekonomi';
import { Ting, tingOf } from './agande';
import { BYN } from './egendom';
import { Zone, inZone, pilesOf, usable, zoneAt, zonesOf } from './lager';
import { PLATS } from './plats';
import { balans } from './balans';
import { Rum, bitAt, gridOf, husById, roomAt, touch } from './byggnad';
import { fnOf, sovKvar } from './byggnader';
import { ACTS } from './handlingar';
import { SAKER, isTool } from './saker';
import { groundOf, tileOf } from './mark';

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
// byggdes ute före v59 bärs in när ett hus har plats (barIn). Rivs huset försvinner det som stod inne. En möbel som sover (halmbädden) är en
// sovplats, och rutorna den tar är inga andra sovplatser (byggnader.ts). Det byn kan ha flera av (flera) byggs så länge
// projektet säger att byn saknar dem (projekt.ts). På kartan ritas den uppifrån, med en bild lika stor som rutorna (ikoner.ts).
// Redskapsplatserna (vid i registret): en kniv hör till slaktbänken och en bensyl till slöjdbänken (Ting.vid), och de ligger kvar
// där när ingen använder dem, så att det alltid finns en kniv när någon ska slakta. Saknas redskapet vill byn ha ett till (VILL i
// redskap.ts), och det som görs läggs vid bänken. Det som kräver redskapet (kraver: kläderna kräver bensylen, steg 2.3.2) görs
// inte förrän det ligger där, och det slits för varje sak som görs (slitVid).

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
  bordTra: 1, // ett bord kräver så mycket trä för varje ruta det tar ... (steg 2.2.15)
  stubbeTra: 0.5, // ... och så mycket för varje stubbe att sitta på runt det
  bordMin: 20, bord2Min: 25, bord3Min: 30, // så många minuters arbete för det lilla bordet, bordet och långbordet
  // förvaringen (steg 2.3.6): hyllan, kistan och redskapsstället
  hyllaTra: 2, hyllaRep: 1, hyllaMin: 20, hyllaRymmer: 3, // en hylla kräver så mycket trä och rep och så många minuter, och rymmer så många högar av ett slag
  kistaTra: 3, kistaMin: 30, kistaRymmer: 2, // en kista: trä och minuter, och så många högar. Det som ligger i den slits som under tak
  stallTra: 1, stallRep: 1, stallMin: 15, stallRymmer: 4, // ett ställ för redskap och vapen: trä, rep och minuter, och så många redskap
  forvarFulla: 6, // byn vill ha en hylla eller kista fullt ut när så många fulla högar ligger på golvet i lagren ...
  forvarLosa: 4, // ... och ett ställ när så många redskap ligger på golvet
});
// trä till ett bord som tar w × h rutor, med stubbar på platserna runt det (platserAv nedan)
const bordTra = (w: number, h: number) => w * h * STATION.bordTra + ((w >= 2 ? 2 * w : 0) + (h >= 2 ? 2 * h : 0)) * STATION.stubbeTra;

// namn och ikon (ikoner.ts; kartans bild uppifrån heter ikon_karta), w och h = rutorna den tar (bredd och djup), tek = teknikerna, och den som kan någon av dem bygger den, av = materialet, min = minuters arbete,
// gor = handlingarna som görs vid den, bara = de av dem som inte görs alls utan stationen, vid = redskapen som hör till den
// (slag och antal), kraver = handlingar som bara görs när ett av stationens redskap ligger där, bygger = texten för den som bygger,
// forsta = loggen när byn fått sin första, inne = står inne i ett hus, mobel = en möbel, flera = byn kan ha flera, sover = en sovplats
// (halmbädden), sitt = en sittplats framför den (bara utseende, steg 2.2.5), platser = ett bord med stubbar att sitta på runt
// det (steg 2.2.15), forvar = förvaring som står i en lagerplats (steg 2.3.6): rymmer så många högar av ett slag (gånger en
// rutas stack) eller, för redskap, så många redskap; tak = det som ligger där slits som under tak
export interface Forvar { rymmer: number; redskap?: true; tak?: true }
export interface StationDef { namn: string; ikon: string; w: number; h: number; tek: string[]; av: Record<string, number>; min: number; gor: Act[]; bara?: Act[]; vid?: Record<string, number>; kraver?: Partial<Record<Act, string>>; bygger: string; forsta: string; inne?: true; mobel?: true; flera?: true; sover?: true; sitt?: true; platser?: true; forvar?: Forvar }
export const STATIONER = {
  slaktbank: {
    namn: 'Slaktbänk', ikon: 'slaktbank', w: 3, h: 1, tek: ['slaktbank'], av: { ved: STATION.slaktbankTra }, min: STATION.slaktbankMin, gor: ['slakta', 'rensa'], bara: ['slakta', 'rensa'], vid: { kniv: STATION.knivplatser },
    bygger: 'Bygger en slaktbänk av trä.',
    forsta: '{namn} byggde byns första slaktbänk av trä. Där slaktas viltet och rensas fisken, och en kniv ligger kvar vid bänken.',
  },
  flatarbank: { // slöjdbänken: id:t är kvar från när den hette flätarbänken, så att sparade byar fungerar
    namn: 'Slöjdbänk', ikon: 'flatarbank', w: 2, h: 1, tek: ['flatarbank'], av: { ved: STATION.flatarbankTra, grenar: STATION.flatarbankGrenar }, min: STATION.flatarbankMin, gor: ['tvinna', 'korg', 'skinnrock', 'skinnskor'], bara: ['korg', 'skinnrock', 'skinnskor'], vid: { bensyl: 1 }, kraver: { skinnrock: 'bensyl', skinnskor: 'bensyl' }, inne: true, sitt: true,
    bygger: 'Bygger en slöjdbänk av trä och grenar.',
    forsta: '{namn} byggde byns första slöjdbänk. Där tvinnas rep fortare än för hand och flätas korgar.', // och sys kläder med bensylen (steg 2.3.2)
  },
  halmbadd: {
    namn: 'Halmbädd', ikon: 'halmbadd', w: 2, h: 1, tek: ['halmbadd'], av: { torrgras: STATION.halmbaddHo, grenar: STATION.halmbaddGrenar }, min: STATION.halmbaddMin, gor: [], inne: true, mobel: true, flera: true, sover: true,
    bygger: 'Bäddar en halmbädd av hö och grenar.',
    forsta: '{namn} gjorde byns första halmbädd. Den som sover i den vilar upp sig fortare.',
  },
  // borden (steg 2.2.15): tre storlekar av samma möbel och teknik. Byn bygger den storlek som räcker åt dem som saknar en plats
  bord: {
    namn: 'Litet bord', ikon: 'bord', w: 2, h: 1, tek: ['bord'], av: { ved: bordTra(2, 1) }, min: STATION.bordMin, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett bord med stubbar att sitta på.',
    forsta: '{namn} byggde byns första bord, med stubbar att sitta på. Där äter man tillsammans och samtalar.',
  },
  bord2: {
    namn: 'Bord', ikon: 'bord2', w: 2, h: 2, tek: ['bord'], av: { ved: bordTra(2, 2) }, min: STATION.bord2Min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett bord med åtta stubbar runt.',
    forsta: '{namn} byggde byns första fyrkantiga bord, med plats för åtta.',
  },
  bord3: {
    namn: 'Långbord', ikon: 'bord3', w: 3, h: 2, tek: ['bord'], av: { ved: bordTra(3, 2) }, min: STATION.bord3Min, gor: [], mobel: true, flera: true, platser: true,
    bygger: 'Bygger ett långbord med tio stubbar runt.',
    forsta: '{namn} byggde byns första långbord, med plats för tio.',
  },
  // förvaringen (steg 2.3.6): står i en lagerplats, på en ruta där något redan ligger, och går inte att gå igenom
  hylla: {
    namn: 'Hylla', ikon: 'hylla', w: 1, h: 1, tek: ['hylla'], av: { ved: STATION.hyllaTra, rep: STATION.hyllaRep }, min: STATION.hyllaMin, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.hyllaRymmer },
    bygger: 'Bygger en hylla av trä och rep i lagret.',
    forsta: '{namn} byggde byns första hylla. På den ryms flera högar på samma plats, så att lagret tar mindre plats.',
  },
  kista: {
    namn: 'Kista', ikon: 'kista', w: 1, h: 1, tek: ['hylla'], av: { ved: STATION.kistaTra }, min: STATION.kistaMin, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.kistaRymmer, tak: true },
    bygger: 'Bygger en kista av trä i lagret.',
    forsta: '{namn} byggde byns första kista. Det som ligger i den ryms på mindre plats och slits som under tak.',
  },
  stall: {
    namn: 'Redskapsställ', ikon: 'stall', w: 1, h: 1, tek: ['hylla'], av: { ved: STATION.stallTra, rep: STATION.stallRep }, min: STATION.stallMin, gor: [], mobel: true, flera: true, forvar: { rymmer: STATION.stallRymmer, redskap: true },
    bygger: 'Bygger ett ställ för redskap och vapen i lagret.',
    forsta: '{namn} byggde byns första ställ för redskap och vapen. Där står flera redskap på samma plats.',
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
// och borden: platserna runt dem (sitt, där inget annat får stå)
// och förvaringen (steg 2.3.6): rutorna som inte går att gå igenom (hinder, i vägsökningen i vag.ts), också medan den byggs
interface Rutor { v: number; n: number; at: Map<number, Station>; sov: Set<number>; sitt: Set<number>; hinder: Uint8Array }
const rutorCache = new WeakMap<State, Rutor>();
export function stationRutor(s: State): Rutor {
  const st = stationerOf(s), v = s.byggV ?? 0;
  let r = rutorCache.get(s);
  if (!r || r.v !== v || r.n !== st.length) {
    const at = new Map<number, Station>(), sov = new Set<number>(), sitt = new Set<number>(), hinder = new Uint8Array(W * H);
    for (const t of st) {
      const { w, h } = storlekAv(t), d = stationDef(t.k);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { at.set((t.y + j) * W + t.x + i, t); if (d?.forvar) hinder[(t.y + j) * W + t.x + i] = 1; }
      if (isKlar(t) && d?.sover) sov.add(t.y * W + t.x);
      for (const q of bordPlatser(t)) sitt.add(q.y * W + q.x);
    }
    r = { v, n: st.length, at, sov, sitt, hinder };
    rutorCache.set(s, r);
  }
  groundOf(s).hinder = r.hinder; // vägsökningen frågar marken
  return r;
}
// står det en station (klar eller halvbyggd) på rutan?
export function stationAt(s: State, x: number, y: number) {
  if (!s.stationer?.length || x < 0 || y < 0) return undefined;
  return x < W ? stationRutor(s).at.get(Math.floor(y) * W + Math.floor(x)) : undefined;
}
// är rutan en plats vid ett bord (en stubbe)?
export const sittAt = (s: State, x: number, y: number) => !!s.stationer?.length && x >= 0 && y >= 0 && x < W && stationRutor(s).sitt.has(Math.floor(y) * W + Math.floor(x));
// den färdiga station där handlingen görs, om byn har en
export const stationFor = (s: State, act: Act) => stationerOf(s).find(t => isKlar(t) && stationDef(t.k)?.gor.includes(act));
// handlingen görs bara vid en station (bara i registret)
const BARA = new Set<Act>(STATION_LIST.flatMap(k => (STATIONER[k] as StationDef).bara ?? []));
// handlingen kan göras: den kräver ingen station, eller byn har en färdig (och redskapet som handlingen kräver ligger där)
export function kanGoras(s: State, act: Act) {
  if (!BARA.has(act)) return true;
  const t = stationFor(s, act), k = t && stationDef(t.k)?.kraver?.[act];
  return !!t && (!k || redskapVid(s, t, k).length > 0);
}
// platsen där man står och arbetar vid stationen: mitt för den på rutan söder om den
export const vidStation = (t: Station) => { const { w, h } = storlekAv(t); return { x: t.x + w / 2, y: t.y + h + 0.1 }; };

// ---------- var den står ----------
// en ruta där inget annat ligger eller står: inte på en lagerplats, ett hus, en stack, ett redskap, en stock eller en stubbe
function ledig(s: State, x: number, y: number) {
  if (!usable(s, x, y) || stationAt(s, x, y) || sittAt(s, x, y) || zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
  return !((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y));
}
// platsen för en station av sorten k: inne i ett hus om registret säger det, annars nära elden. Samma plats varje gång (ingen slump)
export const stationSite = (s: State, k: string) => stationDef(k)?.forvar ? siteForvar(s, k) : stationDef(k)?.inne ? siteInne(s, k) : siteUte(s, k);
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
      if (fri && stationDef(k)?.platser) fri = bordPlatser({ k, x, y, rot }).every(q => ledig(s, q.x, q.y)); // stubbarna runt bordet
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
  return rum.has(i) && !stationRutor(s).at.has(i) && !stationRutor(s).sitt.has(i) && !zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)
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
// ---------- förvaringen (steg 2.3.6) ----------
// Hyllan, kistan och redskapsstället står i en lagerplats, på en ruta där något redan ligger: hyllan och kistan på en full
// hög (som då får plats för fler högar av samma slag), stället på ett redskap (som då kan stå bredvid fler). Helst i ett
// förrådshus och i lagret närmast elden. De går inte att gå igenom, så de står bara där alla andra rutor i lagerplatsen och
// alla möbler i den fortfarande nås från en ruta bredvid (nas). Det byn vill ha (forvarBrist, projekt.ts) räknas på det som
// ligger på golvet i lagren: fulla högar för hyllan och kistan, redskap för stället
export const forvarAt = (s: State, x: number, y: number) => { const t = stationAt(s, x, y); return t && isKlar(t) ? stationDef(t.k)?.forvar : undefined; };
// det som ligger på golvet i en lagerplats (inte i en möbel) och som en möbel av sorten k är till för
function golvet(s: State, k: string) {
  const f = stationDef(k)?.forvar, ut: { x: number; y: number; z: Zone }[] = [];
  if (!f) return ut;
  for (const a of pilesOf(s)) {
    const z = zonesOf(s)[a.zone];
    if (!z || stationAt(s, a.x, a.y)) continue;
    if (f.redskap ? isTool(a.k) : !isTool(a.k) && a.n >= a.max - 1e-9 && (!f.tak || SAKER[a.k]?.haller !== undefined || (SAKER[a.k]?.slits ?? 0) > 0)) ut.push({ x: a.x, y: a.y, z });
  }
  return ut;
}
// hur mycket byn vill ha en möbel av sorten k (0 till 1)
export const forvarBrist = (s: State, k: string) => { const f = stationDef(k)?.forvar; return f ? Math.min(1, golvet(s, k).length / (f.redskap ? STATION.forvarLosa : STATION.forvarFulla)) : 0; };
// når man fortfarande alla rutor i lagerplatsen z om också rutan extra är ett hinder? En sökning inom lagerplatsen och
// ringen runt den: från de rutor i ringen man kan gå på, genom lagerplatsens rutor utan hinder. Varje hinder i lagerplatsen
// (möblerna) måste ha en nådd ruta rakt bredvid sig
function nas(s: State, z: Zone, extra: number) {
  const g = groundOf(s), hinder = stationRutor(s).hinder, x0 = z.x - 1, y0 = z.y - 1, bw = z.w + 2, bh = z.h + 2;
  const fri = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && g.tiles[y * W + x] !== T.Vatten && !g.solid?.[y * W + x] && !hinder[y * W + x] && y * W + x !== extra;
  const sedd = new Uint8Array(bw * bh), ko: number[] = [];
  for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) if (!inZone(z, x, y) && fri(x, y)) { sedd[(y - y0) * bw + x - x0] = 1; ko.push(x, y); }
  for (let i = 0; i < ko.length; i += 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = ko[i] + dx, y = ko[i + 1] + dy, j = (y - y0) * bw + x - x0;
    if (inZone(z, x, y) && !sedd[j] && fri(x, y)) { sedd[j] = 1; ko.push(x, y); }
  }
  for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
    if (fri(x, y)) { if (!sedd[(y - y0) * bw + x - x0]) return false; continue; }
    if (!hinder[y * W + x] && y * W + x !== extra) continue; // en vägg (förrådshusets golv har inga)
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => sedd[(y + dy - y0) * bw + x + dx - x0])) return false;
  }
  return true;
}
// platsen för en möbel av sorten k: i en lagerplats under tak först, sedan efter lagrets prioritet och närmast lagrets hörn
function siteForvar(s: State, k: string) {
  const zs = zonesOf(s), c = golvet(s, k).sort((a, b) => (+!!b.z.hus - +!!a.z.hus) || ((b.z.prio ?? 0) - (a.z.prio ?? 0)) || zs.indexOf(a.z) - zs.indexOf(b.z) || a.y - b.y || a.x - b.x);
  const at = c.find(q => nas(s, q.z, q.y * W + q.x));
  return at && (at.z.hus !== undefined ? { x: at.x, y: at.y, rot: undefined, inne: 1 as const } : { x: at.x, y: at.y, rot: undefined });
}
// där man står när man bygger en möbel som inte går att gå igenom: mitt på en ruta rakt bredvid som man kan gå på
function bredvid(s: State, x: number, y: number) {
  const g = groundOf(s), hinder = stationRutor(s).hinder;
  const r = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ x: x + dx, y: y + dy })).find(q => q.x >= 0 && q.y >= 0 && q.x < W && q.y < H && g.tiles[q.y * W + q.x] !== T.Vatten && !g.solid?.[q.y * W + q.x] && !hinder[q.y * W + q.x]) ?? { x, y };
  return { x: r.x + 0.5, y: r.y + 0.5 };
}
// en möbel som inte längre står i en lagerplats (lagret i ett hus som fått en annan funktion) tas isär
function utanLager(s: State) {
  const borta = stationerOf(s).filter(t => stationDef(t.k)?.forvar && zoneAt(s, t.x, t.y) < 0);
  if (!borta.length) return;
  s.stationer = stationerOf(s).filter(t => !borta.includes(t));
  s.byggV = (s.byggV ?? 0) + 1;
  for (const t of borta) log(s, `${stationDef(t.k)!.namn} togs isär när lagret flyttades.`, 'world');
}

// en station som står inne (inte en bädd) som byn vill bygga men inte har plats för i något hus (steg 2.2.17): någon kan
// tekniken, byn har ingen och ingen är påbörjad. Då planerar byn en verkstad åt den (BYGGNADER i byggnader.ts)
export function inneUtanPlats(s: State): StationSlag | undefined {
  return STATION_LIST.find(k => {
    const d: StationDef = STATIONER[k];
    return d.inne && !d.sover && !harStation(s, k) && !halvbyggd(s, k) && living(s).some(p => d.tek.some(t => knows(p, t))) && !stationSite(s, k);
  });
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
  if (at && stationDef(k)?.forvar) return bredvid(s, at.x, at.y);
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
  fyllPlatser(s);
}

// ---------- borden (steg 2.2.15) ----------
// Ett bord har stubbar att sitta på runt sig (platser i registret): en på varje ruta längs de sidor som är minst två rutor
// långa. Det lilla bordet (2 × 1 rutor) har fyra platser på långsidorna, bordet (2 × 2) åtta, två på varje sida, och
// långbordet (3 × 2) tio. Stubbarna hör till bordet: de byggs med det och inget annat får stå där. Bordet står ute nära
// elden tills husen har plats för det (2.2.17). Den som är hungrig går till en ledig plats och äter där (måltiden i val.ts,
// MAT i behov.ts) och blir glad av det, och vid bordet samtalar man (spotFor i val.ts). Byn bygger bord så länge någon saknar
// en plats, och den storlek som räcker åt dem som saknar (bordStorlek, projekt.ts)
export function bordPlatser(t: { k: string; x: number; y: number; rot?: unknown }) {
  if (!stationDef(t.k)?.platser) return [];
  const { w, h } = storlekAv(t), ut: { x: number; y: number }[] = [];
  if (w >= 2) for (let i = 0; i < w; i++) ut.push({ x: t.x + i, y: t.y - 1 }, { x: t.x + i, y: t.y + h });
  if (h >= 2) for (let j = 0; j < h; j++) ut.push({ x: t.x - 1, y: t.y + j }, { x: t.x + w, y: t.y + j });
  return ut;
}
// så många platser ett bord av sorten k har
export const platserAv = (k: string) => { const d = stationDef(k); return !d?.platser ? 0 : (d.w >= 2 ? 2 * d.w : 0) + (d.h >= 2 ? 2 * d.h : 0); };
// de färdiga borden, och alla platser vid dem
export const bordenOf = (s: State) => stationerOf(s).filter(t => isKlar(t) && stationDef(t.k)?.platser);
export const allaPlatser = (s: State) => bordenOf(s).reduce((n, t) => n + platserAv(t.k), 0);
// handlingarna man gör sittande vid bordet
const VID_BORDET = new Set<Act>(['maltid', 'samtal', 'beratta']);
// den lediga plats vid ett bord som ligger närmast p (mitt på stubben): ingen annan sitter där eller är på väg dit
export function ledigPlats(s: State, p: Person) {
  const borden = bordenOf(s);
  if (!borden.length) return undefined;
  const tagen = new Set<number>();
  for (const q of living(s)) if (q !== p && q.task && VID_BORDET.has(q.task.act)) tagen.add(Math.floor(q.task.ty) * W + Math.floor(q.task.tx));
  let best: { x: number; y: number } | undefined, bd = Infinity;
  for (const t of borden) for (const q of bordPlatser(t)) {
    const d = Math.hypot(q.x + 0.5 - p.x, q.y + 0.5 - p.y);
    if (d < bd && !tagen.has(q.y * W + q.x)) { bd = d; best = { x: q.x + 0.5, y: q.y + 0.5 }; }
  }
  return best;
}
// sitter p vid bordet och äter (handlingen maltid, framme)?
export const vidBordet = (p: Person) => p.task?.act === 'maltid' && p.task.phase === 'do';
// den storlek byn vill bygga: den minsta som räcker åt alla som saknar en plats, annars den största. Ingen när alla har en
const BORD_LIST = STATION_LIST.filter(k => platserAv(k) > 0).sort((a, b) => platserAv(a) - platserAv(b));
export function bordStorlek(s: State): StationSlag | undefined {
  const fattas = living(s).length - allaPlatser(s);
  if (fattas <= 0) return undefined;
  return BORD_LIST.find(k => platserAv(k) >= fattas) ?? BORD_LIST[BORD_LIST.length - 1];
}
// hur stor del av byn som saknar en plats vid ett bord, för den storlek som ska byggas (0 för de andra)
export function bordBrist(s: State, k: string) {
  const n = living(s).length;
  return n && k === bordStorlek(s) ? Math.min(1, (n - allaPlatser(s)) / n) : 0;
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

// ---------- redskapsplatserna (knivplatsen, bensylen) ----------
// redskapen av slaget k som hör till stationen
export const redskapVid = (s: State, t: Station, k: string) => tingOf(s).filter(q => q.vid === t.id && q.k === k);
const platserFor = (t: Station, k: string) => stationDef(t.k)?.vid?.[k] ?? 0;
// så många platser för redskap av slaget k som står tomma i byns färdiga stationer
export function tommaPlatser(s: State, k: string) {
  let n = 0;
  for (const t of stationerOf(s)) if (isKlar(t)) n += Math.max(0, platserFor(t, k) - redskapVid(s, t, k).length);
  return n;
}
export const tommaKnivplatser = (s: State) => tommaPlatser(s, 'kniv');
// den första färdiga station som har en tom plats för slaget k
const tomPlats = (s: State, k: string) => stationerOf(s).find(t => isKlar(t) && redskapVid(s, t, k).length < platserFor(t, k));
// slagen som har en plats vid någon station
const VID_SLAG = [...new Set(STATION_LIST.flatMap(k => Object.keys((STATIONER[k] as StationDef).vid ?? {})))];
// ett redskap blir stationens: det är byns och ligger vid stationen när ingen använder det
function tillStation(k: Ting, t: Station) {
  k.vid = t.id; k.agare = BYN;
  if (k.hos === undefined && k.lass === undefined) { k.x = t.x; k.y = t.y; }
}
// ett nytt redskap läggs vid stationen om en plats för det står tom (redskap.ts, toolDone). true = det lades där
export function nyttVid(s: State, k: Ting) {
  const t = tomPlats(s, k.k);
  if (!t) return false;
  tillStation(k, t);
  return true;
}
// en tom plats fylls med ett av byns redskap av det slaget som ligger i förrådet
export function fyllPlatser(s: State) {
  for (const slag of VID_SLAG) for (let t = tomPlats(s, slag); t; t = tomPlats(s, slag)) {
    const k = tingOf(s).find(q => q.k === slag && q.agare === BYN && q.vid === undefined && q.hos === undefined && q.lass === undefined && q.bar === undefined);
    if (!k) break;
    tillStation(k, t);
  }
}
// ett redskap som hör till en station och som ingen har i handen läggs tillbaka där (lager.ts, placeTools). true = det ligger där.
// Finns inte stationen längre hör det inte till någon
export function tillbakaVid(s: State, k: Ting) {
  if (k.vid === undefined) return false;
  const t = stationById(s, k.vid);
  if (!t) { k.vid = undefined; return false; }
  k.x = t.x; k.y = t.y;
  return true;
}
// handlingen act är gjord en gång vid stationen: redskapet den kräver (kraver) slits så mycket. true = det gick sönder
export function slitVid(s: State, act: Act, v: number) {
  const t = stationFor(s, act), k = t && stationDef(t.k)?.kraver?.[act];
  const r = k ? redskapVid(s, t, k).sort((a, b) => a.c - b.c)[0] : undefined;
  if (!r) return false;
  r.c -= v;
  if (r.c > 1e-9) return false;
  s.ting = tingOf(s).filter(q => q !== r);
  const tr = SAKER[r.k]?.trasig;
  if (tr) count(s, tr.stat);
  return true;
}
// en station som bara får stå inne (inne i registret) men står ute, t.ex. en slöjdbänk byggd före v59, bärs in i ett hus
// när det finns plats och ingen arbetar vid den (Björn, efter v64). Kniven som hör till den följer med
function barIn(s: State) {
  for (const t of s.stationer ?? []) {
    const d = stationDef(t.k);
    if (!d?.inne || t.inne || !isKlar(t) || d.gor.some(a => doingAct(s, a))) continue;
    const at = siteInne(s, t.k);
    if (!at) continue;
    t.x = at.x; t.y = at.y; t.inne = 1;
    if (at.rot) t.rot = 1; else delete t.rot;
    for (const k of tingOf(s)) if (k.vid === t.id && k.hos === undefined && k.lass === undefined) { k.x = t.x; k.y = t.y; }
    s.byggV = (s.byggV ?? 0) + 1; // stationen står på ett nytt ställe: vägarna och platserna räknas om
    log(s, `${d.namn}en bars in i ${husById(s, stationRum(s, t)?.hus ?? -1)?.namn ?? 'ett hus'}.`, 'world');
  }
}
// varje timme: tomma redskapsplatser fylls, en station som ska stå inne men står ute bärs in, och det som stod inne i ett hus
// som rivits försvinner
export function stepStationer(s: State) {
  if (!s.stationer?.length) return;
  fyllPlatser(s);
  barIn(s);
  utanLager(s);
  const borta = s.stationer.filter(t => t.inne && !stationRum(s, t));
  if (!borta.length) return;
  s.stationer = s.stationer.filter(t => !borta.includes(t));
  for (const k of tingOf(s)) if (borta.some(t => t.id === k.vid)) k.vid = undefined;
  touch(s);
  for (const t of borta) log(s, `${stationDef(t.k)?.namn ?? 'En station'} försvann när huset revs.`, 'world');
}
