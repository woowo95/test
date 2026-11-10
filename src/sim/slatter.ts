// ---------- djurens vinter: slåtterängen, höet och fähuset (steg 9.8.9, Djuren i detalj: Vintern) ----------
// Utan fähus fryser betesdjuren i istiden, och utan foder svälter de. Fähuset är en byggnad (raden fahus i BYGGNADER,
// byggnader.ts) där djuren står i istiden; där betar de inte utan äter hö (saken torrgras), som den som sköter djuren ger dem
// (handlingen mata, tamdjur.ts). Höet kommer från slåtterängen: ett gräsområde som byn märker ut som hagen men utan staket,
// där gräset får växa sig högt. Gångstråken (strak.ts) går runt ängen, och ingen bygger eller odlar där (odling.ts, byggplan.ts).
// På sensommaren och hösten slås ängen med skäran (en ny sak) i handlingen slatter, och höet bärs hem till förrådet. Djuren i
// fähuset ger gödsel, som hamnar i komposten (rester.ts). Byn slaktar på hösten de djur den inte har hö till (slaktOrsak i
// boskap.ts). Allt stegas en gång i timmen (stepVinter, steg.ts), likadant i båda lägena, utan slump.
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, gjort, living, log, ovning } from './folk';
import { getable } from './behov';
import { amountOf, gain } from './lager';
import { Person, State, T, W } from './typer';
import { HOST, SOMMAR, iIstiden, isLight, kalender } from './tid';
import { groundOf } from './mark';
import { BAR, HIGH } from './vag';
import { getMap } from './karta';
import { housesOf, Hus } from './byggnad';
import { komposten } from './rester';
import { betesdjurOf, hagarOf } from './hage';
import { Tamdjur, tamDor, tamdjurOf } from './tamdjur';
import { faltRiktning, faltSite } from './odling';

export const VINTER = balans('vinter', {
  angSida: 6, // slåtterängens sida i rutor
  ho: 3, // så mycket hö en ruta högt gräs ger när den slås
  slaMin: 10, // minuter för att slå en ruta
  ovning: 0.02, // djurskötseln växer så här mycket när man slår
  kylaHunger: 1 / 48, // ett djur utan fähus i istiden blir så här mycket hungrigare i timmen av kylan ...
  frysTim: 72, // ... och fryser ihjäl efter så här många timmar (tre dygn) ute i istiden
  perRuta: 1, // så många djur som står på en ruta golv i fähuset
  akut: 0.6, // hur akut fähuset är när djuren inte får plats, inför och under istiden
  godsel: 1 / 24, // gödseln ett djur i fähuset ger i timmen (en rest om dygnet) till komposten
  hoPerDjur: 7, // så mycket hö byn vill ha per betesdjur inför istiden (en tidsålder); har den mindre slaktas djur på hösten
});

// ---------- slåtterängen ----------
export interface Ang { id: number; x: number; y: number; w: number; h: number }
export const angarOf = (s: State) => s.angar ?? [];
export const angAt = (s: State, x: number, y: number) => angarOf(s).find(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
export function angRutor(a: Ang) { const r: number[] = []; for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) r.push(y * W + x); return r; }
// byn märker ut en slåtteräng när den har en hage, på samma sorts plats som ett fält (fri, nära byn, utanför hagarna)
function planeraAng(s: State) {
  if (angarOf(s).length || !hagarOf(s).length || !betesdjurOf(s).length) return;
  const n = VINTER.angSida, at = faltSite(s, n, n * n);
  if (!at) return;
  const y = faltRiktning(s, at.y) > 0 ? at.y : at.y - (n - 1);
  (s.angar ??= []).push({ id: 1, x: at.x, y, w: n, h: n });
  s.byggV = (s.byggV ?? 0) + 1; count(s, 'angar');
  log(s, 'Byn märkte ut en slåtteräng, där gräset får växa sig högt till hö åt djuren i istiden.', 'world', []);
}
// slåttern: på sensommaren och hösten, i dagsljus, med skäran
const slattertid = (s: State) => { const ai = kalender(s).ai; return ai === SOMMAR || ai === HOST; };
// nästa ruta högt gräs på ängen som p kan slå, eller undefined
export function slaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !slattertid(s) || !isLight(s.now) || getable(s, p, 'skara') < 1) return undefined;
  const g = groundOf(s), t = getMap(s.seed).tiles;
  for (const a of angarOf(s)) for (const i of angRutor(a)) {
    if (t[i] === T.Vatten || g.cover[i] < HIGH) continue;
    if (living(s).some(q => q !== p && q.task?.act === 'slatter' && q.task.ref === i)) continue;
    return i;
  }
  return undefined;
}
export function slaKlar(s: State, p: Person, i?: number) {
  const g = groundOf(s);
  if (i === undefined || g.cover[i] < HIGH || getable(s, p, 'skara') < 1) return;
  g.cover[i] = BAR + 0.05; // stubben står kvar och växer upp igen till nästa år
  gain(s, p, 'torrgras', VINTER.ho);
  ovning(p, 'skotsel', VINTER.ovning); gjort(s, p, 'slagit'); count(s, 'angSlagen');
  if (forstaGang(s, 'slatter')) log(s, `${p.name} slog byns första äng med skäran och bar hem höet åt djuren.`, 'world', [p.id]);
}

// ---------- fähuset ----------
export const fahusOf = (s: State) => housesOf(s).filter(h => h.fn === 'fahus' && h.klar);
const golv = (h: Hus) => Math.max(1, (h.w - 2) * (h.h - 2));
export const fahusPlats = (s: State) => fahusOf(s).reduce((n, h) => n + golv(h) * VINTER.perRuta, 0);
// hur akut ett fähus är (raden fahus i BYGGNADER): djuren som inte får plats, inför och under istiden
export function fahusAkut(s: State) {
  const n = betesdjurOf(s).length, saknas = n - fahusPlats(s), ai = kalender(s).ai;
  if (saknas <= 0 || !(ai === HOST || iIstiden(ai))) return { v: 0, plats: 0 };
  return { v: VINTER.akut, plats: Math.ceil(saknas / VINTER.perRuta) };
}
// djuret ställs in i ett fähus med plats, eller undefined
function stallIn(s: State, d: Tamdjur, inne: Map<number, number>) {
  for (const h of fahusOf(s)) {
    const n = inne.get(h.id) ?? 0;
    if (n >= golv(h) * VINTER.perRuta) continue;
    inne.set(h.id, n + 1);
    const iw = Math.max(1, h.w - 2), k = n % golv(h);
    d.x = h.x + 1 + (k % iw) + 0.5; d.y = h.y + 1 + Math.floor(k / iw) + 0.5;
    return h;
  }
  return undefined;
}

// en timme: byn märker ut ängen; i istiden står djuren i fähuset (och ger gödsel), och de som inte får plats fryser
export function stepVinter(s: State) {
  planeraAng(s);
  const istid = iIstiden(kalender(s).ai), inne = new Map<number, number>();
  let godsel = 0;
  for (const d of betesdjurOf(s)) {
    if (!istid) { d.fahus = undefined; d.kyla = 0; continue; }
    const h = stallIn(s, d, inne);
    d.fahus = h?.id;
    if (h) { d.kyla = 0; godsel += VINTER.godsel; continue; }
    d.kyla = (d.kyla ?? 0) + 1;
    d.hunger = Math.min(1, d.hunger + VINTER.kylaHunger);
    if (d.kyla >= VINTER.frysTim) tamDor(s, d, 'frös ihjäl');
    else if (d.kyla === 1) count(s, 'tamFryser');
  }
  if (godsel > 0) {
    s.godsel = (s.godsel ?? 0) + godsel;
    const ko = komposten(s), n = Math.floor(s.godsel);
    if (ko && n >= 1) { ko.kompost = { rest: (ko.kompost?.rest ?? 0) + n, mogna: ko.kompost?.mogna ?? 0 }; s.godsel -= n; count(s, 'godselKompost', n); }
  }
}
// hö som räcker åt djuren över istiden? Annars slaktar byn på hösten (slaktOrsak i boskap.ts)
export const hoRacker = (s: State) => amountOf(s, 'torrgras') >= betesdjurOf(s).length * VINTER.hoPerDjur;
// djuren som står i fähuset (gränssnittet)
export const iFahuset = (s: State, h: Hus) => tamdjurOf(s).filter(d => d.fahus === h.id);
