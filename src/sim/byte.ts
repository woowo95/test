import { ByteMinne, ByteVara, HOUR, LogEntry, MIN, SEC, Person, State } from './typer';
import { SAKER, isTool } from './saker';
import { antal, och } from './ord';
import { Ting } from './agande';
import { ALDER, ageOf } from './folk';
import { loggBer } from './berattelser';
import { ownMove, zoneAt } from './lager';
import { bitAt } from './byggnad';
import { stationAt } from './stationer';
import { W, H, inMap } from './typer';
import { grundvarde } from './varde';
import { kvVarde } from './kvalitet';
import { kronika } from './historik';
import { balans } from './balans';
import { notis } from './notiser';

// ---------- ett bytessystem för alla byten (steg 4.4.1.1) ----------
// Ett byte mellan två bybor och ett byte med handlaren (handel.ts) är samma byte: två parter (Part), samma värdering (var och
// en efter sitt eget behov, `varde`), samma gång i bytet (byte i behov.ts) och samma rad i loggen och krönikan. En part är en
// bybo, byn (det gemensamma förrådet) eller handlaren; parten säger själv vad den behöver, vad den kan byta bort och hur en
// sak lämnar och kommer till den. Ett stort byte (ett redskap, flera saker åt gången eller mycket värt, BYTE.stort) görs på
// en filt: båda lägger fram bara det som förhandlas om. När bytet är godkänt syns ett handslag över båda (BYTE.handslagSek),
// sakerna går från den ena filten till den andra (BYTE.flyttSek) och filtarna plockas ihop strax efter (BYTE.packaMin).
// Små vardagsbyten och gåvor är snabba överlämningar: saken syns gå från hand till hand (s.overl). Loggen tar alla byten;
// krönikan bara de stora och de gåvor som betyder något (ett redskap till ett barn, mat till den som höll på att dö).
export const BYTE = balans('byte', {
  stort: 15, // ett byte värt så mycket (grundvärdet av det som byts, ungefär arbetstimmar) eller mer är ett stort byte ...
  stortSlag: 4, // ... och så också ett byte med så många slag av saker eller fler (ett redskap är alltid ett stort byte)
  handslagSek: 3, // så många sekunder syns handslaget över båda när ett byte är godkänt (steg 4.5.4.17) ...
  flyttSek: 3, // ... sedan går sakerna från den ena filten till den andra på så många sekunder ...
  packaMin: 1, // ... och filtarna plockas ihop så här många minuter efter det
  minnas: 10, // så många byten minns en bybo (p.byten)
  overlSek: 40, // så många sekunder (spelets tid) tar det för saken att gå från hand till hand
  tillbakaTim: 1, // så många timmar efter ett byte behöver den som fick ett slag av saker det mer ...
  nyssFatt: 2, // ... så här mycket mer (gånger 1 + detta), när den som gav det vill ha det tillbaka (steg 10.2.43)
  // två filtar mitt emot varandra ligger så långt isär (rutor, mitt till mitt): filten är drygt en ruta djup, så det blir ungefär
  // en ruta fritt mellan dem (steg 4.5.7.1), och var och en står bakom sin egen filt, BYTE.bakom rutor från filtens mitt
  filtMot: 2.4,
  bakom: 1,
});

export interface Vara { k: string; n: number; t?: Ting; q?: number; hus?: number; varde?: number } // hus = huset som byts (k = 'hus', en symbol på filten, steg 7.2.12), varde = vad det är värt i bytet
// // q = kvaliteten på handlarens redskap, som inte är ett ting i byn än
// en part i ett byte. id = personens id, BYN för byn och ett negativt tal för handlaren. p = personen (bybon eller ingen)
export interface Part {
  id: number;
  namn: string;
  p?: Person;
  x: number; y: number;
  varde(k: string): number; // hur mycket parten behöver en till av slaget k, gånger grundvärdet (behovAv i behov.ts)
  over(utom: readonly string[]): Vara[]; // det parten kan byta bort, utom slagen i utom
  lamna?(w: Vara): Vara; // saken lämnar parten (handlarens packning, byns förråd): ger det som lämnade
  ta?(w: Vara, fran: Part): void; // saken kommer till parten
  handel?: number; // färdigheten Handel hos den som förhandlar (steg 4.4.1.4; bybon, den som handlar för byn, handlaren)
  rymmer?(): number; // så många kg till kan parten ta emot (handlarens packning); saknas = hur mycket som helst
}
export const vardeOf = (v: Vara) => v.varde ?? grundvarde(v.k) * (v.t ? v.t.c * kvVarde(v.t) : 1);
// varorna i en mening (ordlagret, steg 6.7.1): "ett träspjut", "tre rötter och en flintkniv"
export const varorText = (v: Vara[]) => och(v.map(x => antal(x.t ? 1 : x.n, x.k)));

// w går från fran till till. Mellan två bybor byter bara ägaren i förrådet (ownMove) eller redskapet (tinget); handlaren
// och byn har egna sätt att lämna och ta emot (lamna, ta)
// ett hus byts bara mellan dem som bor i byn eller till byn: en handlare eller annan utifrån (negativt id) kan aldrig köpa ett hus
export const kanTaHus = (p: Part) => p.id >= 0;
export function flytta(s: State, w: Vara, fran: Part, till: Part) {
  if (w.hus !== undefined) { // huset står kvar; byggplan.ts sätter den nya ägaren när bytet är klart
    if (!kanTaHus(till)) throw new Error('en handlare kan inte köpa ett hus');
    return;
  }
  if (!fran.lamna && !till.ta) {
    if (w.t) { w.t.agare = till.id; if (w.t.hos === fran.id) w.t.hos = undefined; }
    else ownMove(s, w.k, w.n, fran.id, till.id);
    return;
  }
  const ut = fran.lamna ? fran.lamna(w) : lamnaPerson(s, fran, w);
  if (till.ta) till.ta(ut, fran);
  else taPerson(s, till, ut);
}
// en bybo lämnar w till någon utanför förrådet (handlaren): saken tas ur förrådet, redskapet ur tingen
let lamnaPerson = (_s: State, _p: Part, w: Vara): Vara => w;
let taPerson = (_s: State, _p: Part, _w: Vara) => {};
// handel.ts sätter hur en bybo lämnar och tar emot saker från handlaren (så att byte.ts inte behöver lagret och tingen)
export function satPersonFlytt(l: typeof lamnaPerson, t: typeof taPerson) { lamnaPerson = l; taPerson = t; }

// ---------- hur bytet syns ----------
// en överlämning: saken k går från a till b (personernas id eller handlarens), med start t. Bara för bilden
export interface Overl { k: string; a: number; b: number; t: number }
// en filt med det som byts: platsen, när den plockas ihop och sakerna (vems de var, fran). Var part i ett byte lägger ut sin
// egen filt mitt emot den andras (steg 4.5.4.13): vem = vems filten är, par = samma tal på de två filtarna i ett byte,
// byn = det som ligger där är byns (den som handlar för byn)
export interface Filt { x: number; y: number; slut: number; varor: { k: string; n: number; fran: number }[]; handlare?: number; vem?: number; par?: number; byn?: true; byt?: number } // byt = när bytet på filten godkändes (steg 4.5.4.17) // handlare: handlarens id, när det är handlarens filt (ligger tills hen går)
const filtarOf = (s: State) => (s.filtar ??= []);
// filten läggs aldrig på en lagerplats, en station, i en dörröppning eller på en byggruta (steg 9.2.44): rutan (x, y) är fri för en filt
export const filtFri = (s: State, x: number, y: number) => { const X = Math.floor(x), Y = Math.floor(y); return inMap(X, Y) && zoneAt(s, X, Y) < 0 && !stationAt(s, X, Y) && !bitAt(s, X, Y); };
// den närmaste platsen kring (x, y) där två filtar mitt emot varandra (dy isär) båda ligger fritt
export function filtNara(s: State, x: number, y: number, dy: number) {
  for (let r = 0; r <= 6; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
    const nx = x + i, ny = y + j;
    if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
    if (filtFri(s, nx, ny - dy / 2) && filtFri(s, nx, ny + dy / 2)) return { x: nx, y: ny };
  }
  return { x, y };
}
// så långt isär (i rutor) ligger två filtar mitt emot varandra (BYTE.filtMot)
export const FILT_MOT = BYTE.filtMot;
// var den som äger filten f står: bakom sin filt, på den sida som är längst från filten mitt emot (steg 4.5.7.1). Bilden frågar
// samma sak för två bybor som byter (ui/manniskor.ts)
export function bakomFilt(s: State, f: Filt) {
  const mot = filtMot(s, f), sida = mot && mot.y < f.y ? 1 : -1;
  return { x: f.x, y: f.y + sida * BYTE.bakom };
}
export const nyttPar = (s: State) => (s.filtNr = (s.filtNr ?? 0) + 1);
// filten mitt emot f, om det finns en
export const filtMot = (s: State, f: Filt) => f.par === undefined ? undefined : s.filtar?.find(g => g !== f && g.par === f.par);
// vad som nyss bytts bort: slaget k gick från a till b vid t. Den som fick det behöver det mer en stund (BYTE.nyssFatt)
export interface Bytt { k: string; a: number; b: number; t: number }
export const nyssBytt = (s: State, k: string, a: number, b: number) => !!s.bytt?.some(x => x.k === k && x.a === a && x.b === b && s.now - x.t < BYTE.tillbakaTim * HOUR);
// ta bort det som inte syns längre (en gång i timmen, steg.ts)
export function stadaByten(s: State) {
  if (s.overl?.length) { s.overl = s.overl.filter(o => s.now - o.t < BYTE.overlSek * SEC * 4); if (!s.overl.length) delete s.overl; }
  if (s.bytt?.length) { s.bytt = s.bytt.filter(x => s.now - x.t < BYTE.tillbakaTim * HOUR); if (!s.bytt.length) delete s.bytt; }
  if (s.filtar?.length) { s.filtar = s.filtar.filter(f => f.handlare || f.slut > s.now); if (!s.filtar.length) delete s.filtar; }
}
function overlamna(s: State, varor: Vara[], a: Part, b: Part) {
  const o = (s.overl ??= []);
  for (const w of varor) o.push({ k: w.k, a: a.id, b: b.id, t: s.now });
  if (o.length > 40) o.splice(0, o.length - 40);
}

// är bytet stort? Ett redskap, flera slag av saker eller mycket värt
export function stortByte(varor: Vara[]) {
  if (varor.some(w => w.t || w.hus !== undefined || isTool(w.k))) return true;
  if (new Set(varor.map(w => w.k)).size >= BYTE.stortSlag) return true;
  return varor.reduce((x, w) => x + w.n * vardeOf(w), 0) >= BYTE.stort;
}

// det andra system gör när ett byte är klart (handlarens minne av bytena, handel.ts)
// när någon lurat i ett byte (behov.ts): lurare lurade lurad (grannklanerna, klaner.ts)
export const vidLura: ((s: State, lurare: Part, lurad: Part, markt: boolean) => void)[] = []; // markt = den lurade bybon märkte det
export const vidByte: ((s: State, m: Part, g: Part, fatt: Vara[], betal: Vara[], minne: ByteMinne) => void)[] = [];
// priset i silver styck för slaget k som fran ger till till (handlarens priser, handel.ts); annars grundvärdet. Hela silver, minst ett
export const BYTESPRIS: ((s: State, fran: Part, till: Part, k: string) => number | undefined)[] = [];
function prisAv(s: State, fran: Part, till: Part, k: string) {
  for (const f of BYTESPRIS) { const p = f(s, fran, till, k); if (p !== undefined) return Math.max(1, Math.round(p)); }
  return Math.max(1, Math.round(grundvarde(k)));
}
const byteVaror = (s: State, varor: Vara[], fran: Part, till: Part): ByteVara[] => varor.map(w => ({ k: w.k, n: w.t ? 1 : Math.round(w.n), p: w.varde !== undefined ? Math.max(1, Math.round(w.varde)) : prisAv(s, fran, till, w.k) }));
// bytet i loggen och i bybornas minne (steg 5.5.6): minns en bybo det (p.byten) har raden bara numret (bnr), annars hela
// bytet. Minnet rymmer BYTE.minnas byten; en affär som inte blev av tar bort den äldsta som inte heller blev av, aldrig ett
// riktigt byte
export function loggaByte(rad: LogEntry, minne: ByteMinne, folk: (Person | undefined)[]) {
  const vem = folk.filter((p): p is Person => !!p);
  for (const p of vem) {
    const b = (p.byten ??= []); b.push(minne);
    if (b.length > BYTE.minnas) b.splice(minne.avbruten ? b.findIndex(x => x.avbruten) : 0, 1);
  }
  if ((rad.sam?.d.length ?? 1) > 1) return; // raden samlar flera byten (steg 6.7.5) och pekar inte på något av dem
  if (vem.some(p => p.byten!.includes(minne))) rad.bnr = minne.nr; else rad.byte = minne;
}
// bytet en rad i loggen handlar om: hela bytet på raden eller det någon minns med numret (filt.ts, gränssnittet)
export function radByte(s: State, l: LogEntry): ByteMinne | undefined {
  if (l.byte) return l.byte;
  if (l.bnr === undefined) return undefined;
  for (const p of s.people) { const b = p.byten?.find(x => x.nr === l.bnr); if (b) return b; }
  return undefined;
}
// bytet är klart: m fick fatt av g och gav betal. Samma för alla byten. desperat = m höll på att dö av bristen
export function byteKlart(s: State, m: Part, g: Part, fatt: Vara[], betal: Vara[], desperat = false) {
  const alla = [...fatt, ...betal], stort = stortByte(alla), bytt = (s.bytt ??= []);
  for (const w of fatt) bytt.push({ k: w.k, a: g.id, b: m.id, t: s.now });
  for (const w of betal) bytt.push({ k: w.k, a: m.id, b: g.id, t: s.now });
  // ett stort byte: var och en lägger det hen ger på sin egen filt, mitt emot den andras. Med handlaren ligger filtarna
  // redan ute (handel.ts)
  const minne: ByteMinne = { nr: (s.byteNr = (s.byteNr ?? 0) + 1), t: s.now, a: m.id, an: m.namn, b: g.id, bn: g.namn, ag: byteVaror(s, betal, m, g), bg: byteVaror(s, fatt, g, m) };
  const hf = s.filtar?.find(f => f.handlare !== undefined && (f.handlare === m.id || f.handlare === g.id));
  if (hf) { // sakerna går mellan handlarens filt och den som ligger mitt emot (eller den som handlar)
    const mot = filtMot(s, hf), ena = mot ?? (hf.handlare === m.id ? g : m), xy = (f: { x: number; y: number }) => ({ x: f.x, y: f.y });
    [minne.fa, minne.fb] = hf.handlare === m.id ? [xy(hf), xy(ena)] : [xy(ena), xy(hf)];
  } else if (stort) {
    // sakerna ligger på filtarna medan handslaget syns, går sedan över till den andra filten, och filtarna plockas ihop strax efter
    const { x, y } = filtNara(s, (m.x + g.x) / 2, (m.y + g.y) / 2, FILT_MOT), par = nyttPar(s), slut = s.now + (BYTE.handslagSek + BYTE.flyttSek) * SEC + BYTE.packaMin * MIN;
    filtarOf(s).push({ x, y: y - FILT_MOT / 2, slut, varor: fatt.map(w => ({ k: w.k, n: w.t ? 1 : w.n, fran: g.id })), vem: g.id, par, byt: s.now },
      { x, y: y + FILT_MOT / 2, slut, varor: betal.map(w => ({ k: w.k, n: w.t ? 1 : w.n, fran: m.id })), vem: m.id, par, byt: s.now });
    minne.fa = { x, y: y + FILT_MOT / 2 }; minne.fb = { x, y: y - FILT_MOT / 2 };
  } else { overlamna(s, fatt, g, m); overlamna(s, betal, m, g); }
  // raden ur mallen l_byte (steg 6.7.7); vardagens byten samlas (steg 6.7.5)
  const vardag = !hf && !stort && !desperat, slag = (v: Vara[]) => och([...new Set(v.map(w => SAKER[w.k]?.namn.toLowerCase() ?? w.k))]);
  const rad = loggBer(s, 'l_byte', Math.abs(m.id) * 997 + Math.abs(g.id), { namn: m.namn, med: g.namn, fatt: varorText(fatt), betal: varorText(betal), desperat }, 'rel', [m.id, g.id].filter(i => i > 0), vardag ? { slag: 'byte', k: 0, n: '', d: `${slag(fatt)} mot ${slag(betal)}` } : undefined);
  const text = rad.text;
  loggaByte(rad, minne, [m.p, g.p]);
  if (hf) notis(s, 'byte', text, [m.id, g.id].filter(i => i > 0));
  if (stort) kronika(s, text, 'byte');
  for (const f of vidByte) f(s, m, g, fatt, betal, minne);
  return stort;
}
// en gåva: g ger varor till m, utan förhandling. Samma överlämning och samma rad; krönikan tar den om den betyder något:
// ett redskap till ett barn, eller till den som höll på att dö (fara)
export function gavaKlar(s: State, g: Part, m: Part, varor: Vara[], fara: boolean) {
  overlamna(s, varor, g, m);
  const barn = !!m.p && ageOf(m.p, s.now) < ALDER.vuxen && varor.some(w => w.t || isTool(w.k));
  // raden ur mallen l_gava (steg 6.7.7); vardagens gåvor fyller inte loggen
  const f = { namn: g.namn, om: m.namn, varor: varorText(varor), fara, barn: !!m.p && ageOf(m.p, s.now) < ALDER.vuxen, honom2: m.p?.sex === 'k' ? 'henne' : 'honom' };
  if (fara || varor.some(w => w.t || isTool(w.k))) { const rad = loggBer(s, 'l_gava', Math.abs(g.id) * 997 + Math.abs(m.id), f, 'rel', [g.id, m.id].filter(i => i > 0)); if (fara || barn) kronika(s, rad.text, 'gava'); }
}
