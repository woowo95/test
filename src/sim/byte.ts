import { HOUR, MIN, SEC, Person, State } from './typer';
import { SAKER, isTool } from './saker';
import { Ting } from './agande';
import { ALDER, ageOf, log } from './folk';
import { ownMove } from './lager';
import { grundvarde } from './varde';
import { kvVarde } from './kvalitet';
import { kronika } from './historik';
import { balans } from './balans';

// ---------- ett bytessystem för alla byten (steg 4.4.1.1) ----------
// Ett byte mellan två bybor och ett byte med handlaren (handel.ts) är samma byte: två parter (Part), samma värdering (var och
// en efter sitt eget behov, `varde`), samma gång i bytet (byte i behov.ts) och samma rad i loggen och krönikan. En part är en
// bybo, byn (det gemensamma förrådet) eller handlaren; parten säger själv vad den behöver, vad den kan byta bort och hur en
// sak lämnar och kommer till den. Ett stort byte (ett redskap, flera saker åt gången eller mycket värt, BYTE.stort) görs på
// en filt: båda lägger fram bara det som förhandlas om, och sakerna ligger där en stund (BYTE.filtMin) medan bytet görs.
// Små vardagsbyten och gåvor är snabba överlämningar: saken syns gå från hand till hand (s.overl). Loggen tar alla byten;
// krönikan bara de stora och de gåvor som betyder något (ett redskap till ett barn, mat till den som höll på att dö).
export const BYTE = balans('byte', {
  stort: 15, // ett byte värt så mycket (grundvärdet av det som byts, ungefär arbetstimmar) eller mer är ett stort byte ...
  stortSlag: 4, // ... och så också ett byte med så många slag av saker eller fler (ett redskap är alltid ett stort byte)
  filtMin: 15, // så många minuter ligger sakerna på filten
  overlSek: 40, // så många sekunder (spelets tid) tar det för saken att gå från hand till hand
  tillbakaTim: 1, // så många timmar köper ingen tillbaka ett slag av saker av den hen just bytt bort det till
});

export interface Vara { k: string; n: number; t?: Ting; q?: number } // q = kvaliteten på handlarens redskap, som inte är ett ting i byn än
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
export const vardeOf = (v: Vara) => grundvarde(v.k) * (v.t ? v.t.c * kvVarde(v.t) : 1);
const tal = (n: number) => n >= 0.5 ? String(Math.round(n)) : 'lite'; // saker i hela tal (Björn efter v89)
export const varorText = (v: Vara[]) => v.map(x => `${x.t ? 'en' : tal(x.n)} ${(SAKER[x.k]?.namn ?? x.k).toLowerCase()}`).join(' och ');

// w går från fran till till. Mellan två bybor byter bara ägaren i förrådet (ownMove) eller redskapet (tinget); handlaren
// och byn har egna sätt att lämna och ta emot (lamna, ta)
export function flytta(s: State, w: Vara, fran: Part, till: Part) {
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
// en filt med det som byts: platsen, när den plockas ihop och sakerna (vems de var, fran)
export interface Filt { x: number; y: number; slut: number; varor: { k: string; n: number; fran: number }[]; handlare?: number } // handlare: handlarens id, när det är handlarens filt (ligger tills hen går)
const filtarOf = (s: State) => (s.filtar ??= []);
// vad som nyss bytts bort: slaget k gick från a till b vid t. Så att två inte byter samma sak fram och tillbaka
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
  if (varor.some(w => w.t || isTool(w.k))) return true;
  if (new Set(varor.map(w => w.k)).size >= BYTE.stortSlag) return true;
  return varor.reduce((x, w) => x + w.n * vardeOf(w), 0) >= BYTE.stort;
}

// det andra system gör när ett byte är klart (handlarens minne av bytena, handel.ts)
// när någon lurat i ett byte (behov.ts): lurare lurade lurad (grannklanerna, klaner.ts)
export const vidLura: ((s: State, lurare: Part, lurad: Part) => void)[] = [];
export const vidByte: ((s: State, m: Part, g: Part, fatt: Vara[], betal: Vara[]) => void)[] = [];
// bytet är klart: m fick fatt av g och gav betal. Samma för alla byten. desperat = m höll på att dö av bristen
export function byteKlart(s: State, m: Part, g: Part, fatt: Vara[], betal: Vara[], desperat = false) {
  const alla = [...fatt, ...betal], stort = stortByte(alla), bytt = (s.bytt ??= []);
  for (const w of fatt) bytt.push({ k: w.k, a: g.id, b: m.id, t: s.now });
  for (const w of betal) bytt.push({ k: w.k, a: m.id, b: g.id, t: s.now });
  if (stort) {
    const x = (m.x + g.x) / 2, y = (m.y + g.y) / 2;
    filtarOf(s).push({ x, y, slut: s.now + BYTE.filtMin * MIN, varor: [...fatt.map(w => ({ k: w.k, n: w.t ? 1 : w.n, fran: g.id })), ...betal.map(w => ({ k: w.k, n: w.t ? 1 : w.n, fran: m.id }))] });
  } else { overlamna(s, fatt, g, m); overlamna(s, betal, m, g); }
  const text = `${m.namn} och ${g.namn} bytte: ${varorText(fatt)} mot ${varorText(betal)}${desperat ? `. ${m.namn} höll på att dö` : ''}.`;
  log(s, text, 'rel', [m.id, g.id].filter(i => i > 0));
  if (stort) kronika(s, text, 'byte');
  for (const f of vidByte) f(s, m, g, fatt, betal);
  return stort;
}
// en gåva: g ger varor till m, utan förhandling. Samma överlämning och samma rad; krönikan tar den om den betyder något:
// ett redskap till ett barn, eller till den som höll på att dö (fara)
export function gavaKlar(s: State, g: Part, m: Part, varor: Vara[], fara: boolean) {
  overlamna(s, varor, g, m);
  const barn = !!m.p && ageOf(m.p, s.now) < ALDER.vuxen && varor.some(w => w.t || isTool(w.k));
  const text = `${g.namn} gav ${varorText(varor)} till ${m.namn}${fara ? `, som höll på att dö` : ''}.`;
  if (fara || varor.some(w => w.t || isTool(w.k))) log(s, text, 'rel', [g.id, m.id].filter(i => i > 0)); // vardagens gåvor fyller inte loggen
  if (fara || barn) kronika(s, text, 'gava');
}
