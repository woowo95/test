import { Act, MIN, Person, SEC, State, Task } from './typer';
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

// ---------- arbetsstationer (steg 2.2.3) ----------
// En station är en plats i byn där ett visst arbete görs: vid slaktbänken slaktas viltet och fisken rensas, vid flätarbänken
// tvinnas rep och flätas korgar (steg 2.2.4). Varje sorts
// station är en rad i registret STATIONER: vad den kräver (tekniken och materialet), hur länge den tar att bygga, vilka
// handlingar som görs där och hur många knivar som ligger kvar vid den. En ny station blir en rad här (grillställningen
// 2.8.1). Det enklaste görs med händerna var som helst; så länge byn inte har stationen görs arbetet vid elden som förut
// (spotFor i val.ts). Det som står under bara görs inte alls utan stationen: viltet slaktas och fisken rensas bara vid
// slaktbänken (2.2.6, 2.2.8), och innan byn har en äts det fällda djuret och den hela abborren som de är, med mindre kött och
// inget ben eller skinn; korgen flätas bara vid flätarbänken. Rep tvinnas fortare vid flätarbänken än för hand vid elden.
// Byggs gör den av den som kan tekniken och har tid för handarbete (craft i val.ts), med materialet ur förrådet efter
// behovsstegen (behov.ts). Arbetet kan avbrytas: stationen står kvar halvbyggd och vem som helst som kan tekniken bygger
// klart den. Den står utomhus nära elden och tar en eller flera rutor (bredd och djup i registret), där inget annat får
// ligga eller byggas (usable i lager.ts). På kartan ritas den uppifrån, med en bild lika stor som rutorna (ikoner.ts).
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
  repFart: 2, // rep tvinnas så här många gånger fortare vid flätarbänken än för hand ...
  vidBank: 1.5, // ... av den som står så här nära bänken (rutor)
});

// namn och ikon (ikoner.ts; kartans bild uppifrån heter ikon_karta), w och h = rutorna den tar (bredd och djup), tek = teknikerna, och den som kan någon av dem bygger den, av = materialet, min = minuters arbete,
// gor = handlingarna som görs vid den, bara = de av dem som inte görs alls utan stationen, kniv = knivar som hör till den, bygger = texten för den som bygger,
// forsta = loggen när byn fått sin första
export interface StationDef { namn: string; ikon: string; w: number; h: number; tek: string[]; av: Record<string, number>; min: number; gor: Act[]; bara?: Act[]; kniv?: number; bygger: string; forsta: string }
export const STATIONER = {
  slaktbank: {
    namn: 'Slaktbänk', ikon: 'slaktbank', w: 3, h: 1, tek: ['kniv'], av: { ved: STATION.slaktbankTra }, min: STATION.slaktbankMin, gor: ['slakta', 'rensa'], bara: ['slakta', 'rensa'], kniv: STATION.knivplatser,
    bygger: 'Bygger en slaktbänk av trä.',
    forsta: '{namn} byggde byns första slaktbänk av trä. Där slaktas viltet och rensas fisken, och en kniv ligger kvar vid bänken.',
  },
  flatarbank: {
    namn: 'Flätarbänk', ikon: 'flatarbank', w: 2, h: 1, tek: ['korg', 'rep'], av: { ved: STATION.flatarbankTra, grenar: STATION.flatarbankGrenar }, min: STATION.flatarbankMin, gor: ['tvinna', 'korg'], bara: ['korg'],
    bygger: 'Bygger en flätarbänk av trä och grenar.',
    forsta: '{namn} byggde byns första flätarbänk. Där tvinnas rep fortare än för hand och flätas korgar.',
  },
} satisfies Record<string, StationDef>;
export type StationSlag = keyof typeof STATIONER;
export const STATION_LIST = Object.keys(STATIONER) as StationSlag[];
export const stationDef = (k: string): StationDef | undefined => (STATIONER as Record<string, StationDef>)[k];

// en station i byn: rutan längst upp till vänster av dem den står på, hur länge (ms) arbetet med att bygga den har kvar (0 = klar), vilka som byggt på
// den och när den blev klar (det visas när man trycker på den, flikar/station.ts)
export interface Station { id: number; k: string; x: number; y: number; kvar: number; vem?: number[]; klar?: number }
const NONE: Station[] = [];
export const stationerOf = (s: State) => s.stationer ?? NONE;
export const stationById = (s: State, id?: number) => id === undefined ? undefined : stationerOf(s).find(t => t.id === id);
export const isKlar = (t: Station) => t.kvar <= 0;
// rutorna stationen tar (bredd och djup i registret; en okänd sort tar en ruta)
export const storlek = (k: string) => { const d = stationDef(k); return { w: d?.w ?? 1, h: d?.h ?? 1 }; };
// står det en station (klar eller halvbyggd) på rutan?
export function stationAt(s: State, x: number, y: number) {
  const st = s.stationer;
  if (!st) return undefined;
  for (const t of st) { const { w, h } = storlek(t.k); if (x >= t.x && x < t.x + w && y >= t.y && y < t.y + h) return t; }
  return undefined;
}
// den färdiga station där handlingen görs, om byn har en
export const stationFor = (s: State, act: Act) => stationerOf(s).find(t => isKlar(t) && stationDef(t.k)?.gor.includes(act));
// handlingen görs bara vid en station (bara i registret)
const BARA = new Set<Act>(STATION_LIST.flatMap(k => (STATIONER[k] as StationDef).bara ?? []));
// handlingen kan göras: den kräver ingen station, eller byn har en färdig
export const kanGoras = (s: State, act: Act) => !BARA.has(act) || !!stationFor(s, act);
// platsen där man står och arbetar vid stationen: mitt för den på rutan söder om den
export const vidStation = (t: Station) => { const { w, h } = storlek(t.k); return { x: t.x + w / 2, y: t.y + h + 0.1 }; };

// ---------- var den står ----------
// en ruta där inget annat ligger eller står: inte på en lagerplats, ett hus, en stack, ett redskap, en stock eller en stubbe
function ledig(s: State, x: number, y: number) {
  if (!usable(s, x, y) || zonesOf(s).some(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h)) return false;
  return !((s.stackar ?? []).some(a => a.x === x && a.y === y) || tingOf(s).some(k => k.x === x && k.y === y) || (s.stockar ?? []).some(k => Math.floor(k.x) === x && Math.floor(k.y) === y) || (s.stubbar ?? []).some(k => k.x === x && k.y === y));
}
// platsen för en station av sorten k nära elden: alla rutorna den tar är lediga, och den står helst inte där barnen leker.
// Avståndet räknas från stationens mitt. Samma plats varje gång (ingen slump)
export function stationSite(s: State, k: string) {
  const f = getMap(s.seed).fire, { w, h } = storlek(k), R = Math.ceil(STATION.avstand) + 2 + Math.max(w, h);
  let best: { x: number; y: number } | undefined, bs = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = f.x + dx, y = f.y + dy;
    let fri = true;
    for (let j = 0; j < h && fri; j++) for (let i = 0; i < w && fri; i++) fri = ledig(s, x + i, y + j);
    if (!fri) continue;
    const mx = dx + (w - 1) / 2, my = dy + (h - 1) / 2;
    const lek = Math.abs(mx) <= PLATS.lekBredd / 2 && my >= PLATS.lekFran - 1 ? STATION.norr * 4 : my > 0 ? STATION.norr : 0;
    const sc = Math.abs(Math.hypot(mx, my) - STATION.avstand) + lek;
    if (sc < bs) { bs = sc; best = { x, y }; }
  }
  return best;
}

// ---------- att bygga en station ----------
const sparas = (k: string) => k === 'ved' ? RESERV.ved : k === 'grenar' ? RESERV.grenar : k === 'torrgras' ? RESERV.torrgras : 0;
const halvbyggd = (s: State, k: string) => stationerOf(s).find(t => t.k === k && !isKlar(t));
// den station p vill bygga: p kan någon av teknikerna, byn har ingen färdig av slaget, ingen annan bygger en, och den är påbörjad
// eller p kan få tag i materialet utan att ta det som sparas till elden
export function stationAttBygga(s: State, p: Person): StationSlag | undefined {
  if (doingAct(s, 'station', p)) return undefined;
  for (const k of STATION_LIST) {
    const d: StationDef = STATIONER[k];
    if (!d.tek.some(k => knows(p, k)) || stationerOf(s).some(t => t.k === k && isKlar(t))) continue;
    if (halvbyggd(s, k) || Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n + sparas(m)) && stationSite(s, k)) return k;
  }
  return undefined;
}
// platsen dit den som ska bygga går: den halvbyggda stationen, annars rutan där den ska stå
export function stationSpot(s: State, k: string) {
  const t = halvbyggd(s, k), at = t ?? stationSite(s, k);
  return at ? vidStation({ id: 0, k, kvar: 1, x: at.x, y: at.y }) : undefined;
}
// framme: bygg vidare på den halvbyggda, eller ta materialet och börja. Saknas materialet eller platsen blir det inget
export function startStation(s: State, p: Person, tk: Task) {
  const k = tk.tool ?? '', d = stationDef(k);
  let t = halvbyggd(s, k);
  if (d && !t && !stationerOf(s).some(q => q.k === k)) {
    const at = stationSite(s, k);
    if (at && Object.entries(d.av).every(([m, n]) => getable(s, p, m) >= n)) {
      for (const [m, n] of Object.entries(d.av)) takeMaterial(s, p, m, n);
      t = { id: s.nextStation = (s.nextStation ?? 0) + 1, k, x: at.x, y: at.y, kvar: d.min * MIN };
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
  const d = stationDef(t.k)!;
  if (forstaGang(s, 'station_' + t.k)) { log(s, d.forsta.replace('{namn}', p.name), 'world', [p.id]); p.fame.push(`Byggde byns första ${d.namn.toLowerCase()}`); }
  fyllKnivplatser(s);
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
// varje timme: tomma knivplatser fylls
export function stepStationer(s: State) {
  if (s.stationer?.length) fyllKnivplatser(s);
}
