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
import { DAY, HOUR, Person, State, T, W } from './typer';
import { stadium, tradArt } from './trad';
import { utanforByn } from './omrade';
import { heligRuta } from './kultlatt';
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
  angMarg: 1.5, // ängen får så här många gånger de rutor som höet till djuren behöver (alla rutor har inte högt gräs) ...
  angMin: 3, angMax: 10, // ... med sidan mellan så här många rutor
  angMatMin: 3, // minuter för att märka ut en äng
  ho: 3, // så mycket hö en ruta högt gräs ger när den slås
  slaMin: 10, // minuter för att slå en ruta
  ovning: 0.02, // djurskötseln växer så här mycket när man slår
  kylaHunger: 1 / 48, // ett djur utan fähus i istiden blir så här mycket hungrigare i timmen av kylan ...
  frysTim: 72, // ... och fryser ihjäl efter så här många timmar (tre dygn) ute i istiden
  perRuta: 1, // så många djur som står på en ruta golv i fähuset
  akut: 0.6, // hur akut fähuset är när djuren inte får plats, inför och under istiden
  godsel: 1 / 24, // gödseln ett djur i fähuset ger i timmen (en rest om dygnet) till komposten
  hoPerDjur: 7, // så mycket hö byn vill ha per betesdjur inför istiden (en tidsålder); har den mindre slaktas djur på hösten
  // lövtäkten (steg 9.8.16)
  hamlaR: 8, // björken som hamlas står högst så här många rutor utanför byns område
  lovDygn: 3, // det hamlade trädet har nya skott med löv att skära efter så här många dygn (år i spelet)
  lov: 4, // så många lövkärvar en skörd ger
  hamlaMin: 4, // minuter för att hamla eller skära skotten
  hamlaGrenar: 2, // grenarna man kapar när trädet hamlas första gången
});

// ---------- slåtterängen ----------
export interface Ang { id: number; x: number; y: number; w: number; h: number }
export const angarOf = (s: State) => s.angar ?? [];
export const angAt = (s: State, x: number, y: number) => angarOf(s).find(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
export function angRutor(a: Ang) { const r: number[] = []; for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) r.push(y * W + x); return r; }
// Ängen är ett projekt (raden ang i PROJEKT, projekt.ts, steg 10.2.36): när byn har betesdjur och en hage men ängarna är för
// små för höet djuren behöver i istiden märker någon ut en ny, så stor som det som saknas, på samma sorts plats som ett fält
const angBehov = (s: State) => Math.ceil(betesdjurOf(s).length * VINTER.hoPerDjur / VINTER.ho * VINTER.angMarg); // rutorna djuren behöver
const angHar = (s: State) => angarOf(s).reduce((n, a) => n + a.w * a.h, 0);
export const angBrist = (s: State) => betesdjurOf(s).length && hagarOf(s).length && angHar(s) * VINTER.angMarg < angBehov(s) ? 1 : 0;
const angSida = (s: State) => Math.min(VINTER.angMax, Math.max(VINTER.angMin, Math.ceil(Math.sqrt(Math.max(1, angBehov(s) - angHar(s))))));
// projektets arbete för p: att märka ut ängen
export function angUppgift(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !angBrist(s) || living(s).some(q => q !== p && q.task?.act === 'ang')) return undefined;
  const n = angSida(s), at = faltSite(s, n, n * n);
  return at && { act: 'ang' as const, text: 'Märker ut en slåtteräng, där gräset får växa sig högt till hö åt djuren.', min: VINTER.angMatMin, spot: { x: at.x + 0.5, y: at.y + 0.5 } };
}
export function angKlar(s: State, p: Person) {
  if (!angBrist(s)) return;
  const n = angSida(s), at = faltSite(s, n, n * n);
  if (!at) return;
  const y = faltRiktning(s, at.y) > 0 ? at.y : at.y - (n - 1);
  (s.angar ??= []).push({ id: angarOf(s).length + 1, x: at.x, y, w: n, h: n });
  s.byggV = (s.byggV ?? 0) + 1; count(s, 'angar');
  log(s, `${p.name} märkte ut en slåtteräng, där gräset får växa sig högt till hö åt djuren i istiden.`, 'world', [p.id]);
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
  glomHamlade(s);
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
// hö som räcker åt djuren över istiden? Lövkärvarna räknas som hö (steg 9.8.16). Annars slaktar byn på hösten (slaktOrsak i boskap.ts)
export const hoAv = (s: State) => amountOf(s, 'torrgras') + amountOf(s, 'lovkarve');
export const hoRacker = (s: State) => hoAv(s) >= betesdjurOf(s).length * VINTER.hoPerDjur;

// ---------- lövtäkten: de hamlade träden (steg 9.8.16) ----------
// I handlingen hamla kapas grenarna på en björk nära byn en bit upp på stammen, och trädet skjuter nya skott. Vart tredje
// dygn (VINTER.lovDygn) skärs skotten med lövet till lövkärvar, som djuren äter som hö. Byn hamlar en ny björk när höet inte
// räcker åt betesdjuren och inget hamlat träd har skott att skära. Det hamlade trädet fälls inte för ved (skog.ts) och har
// ett eget utseende (ui/terrang.ts). Står trädet inte längre (en brand, en storm) glöms det.
export interface Hamlat { i: number; t: number } // rutan och när skotten skars senast
export const hamladeOf = (s: State) => s.hamlade ?? [];
export const hamlatPa = (s: State, i: number) => hamladeOf(s).some(h => h.i === i);
const lovtid = (s: State) => !iIstiden(kalender(s).ai); // i istiden har björken inga löv
const moget = (s: State, h: Hamlat) => s.now - h.t >= VINTER.lovDygn * DAY;
const upptagen = (s: State, p: Person, i: number) => living(s).some(q => q !== p && q.task?.act === 'hamla' && q.task.ref === i);
// trädet p ska hamla eller skära skotten på: ett hamlat träd med skott först, annars en ny björk när höet inte räcker
export function hamlaVal(s: State, p: Person): number | undefined {
  if (ageOf(p, s.now) < ALDER.vuxen || !isLight(s.now) || !lovtid(s) || !betesdjurOf(s).length) return undefined;
  for (const h of hamladeOf(s)) if (moget(s, h) && !upptagen(s, p, h.i)) return h.i;
  if (hoRacker(s) || hamladeOf(s).some(h => !moget(s, h) && s.now - h.t < DAY)) return undefined; // ett nyss hamlat träd räcker en stund
  const i = nyBjork(s);
  return i !== undefined && !upptagen(s, p, i) ? i : undefined;
}
// björken som hamlas härnäst: den närmaste vuxna björken nära byn. Samma för alla under timmen (regel 4), så att inte varje vuxen
// söker igenom hela kartan i sitt val
const bjorkCache = new WeakMap<State, { key: string; i?: number }>();
function nyBjork(s: State): number | undefined {
  const key = `${Math.floor(s.now / HOUR)}|${hamladeOf(s).length}`, c = bjorkCache.get(s);
  if (c && c.key === key) return c.i;
  const g = groundOf(s), t = getMap(s.seed).tiles; let bast: number | undefined, bd = Infinity;
  for (let i = 0; i < g.trees.length; i++) {
    if (g.trees[i] < 1 || tradArt(g, i).id !== 'bjork' || hamlatPa(s, i) || t[i] === T.Vatten) continue;
    const st = stadium(g, i), x = i % W, y = Math.floor(i / W);
    if (st !== 'vuxet' && st !== 'gammalt') continue;
    const d = utanforByn(s, x, y);
    if (d > VINTER.hamlaR || heligRuta(s, x, y) || s.halvfallt?.[i] !== undefined) continue;
    if (d < bd) { bd = d; bast = i; }
  }
  bjorkCache.set(s, { key, i: bast });
  return bast;
}
// den som hamlar är klar (KLAR i steg.ts): första gången kapas grenarna, sedan skärs skotten till lövkärvar
export function hamlaKlar(s: State, p: Person, i?: number) {
  const g = groundOf(s);
  if (i === undefined || g.trees[i] < 1) return;
  const h = hamladeOf(s).find(q => q.i === i);
  if (!h) {
    (s.hamlade ??= []).push({ i, t: s.now }); s.byggV = (s.byggV ?? 0) + 1;
    gain(s, p, 'grenar', VINTER.hamlaGrenar); count(s, 'hamlat');
    if (forstaGang(s, 'hamlat')) log(s, `${p.name} hamlade byns första björk. Om några år har den nya skott med löv åt djuren.`, 'world', [p.id]);
  } else {
    if (!moget(s, h)) return;
    h.t = s.now;
    gain(s, p, 'lovkarve', VINTER.lov); count(s, 'lovkarvar', VINTER.lov);
    if (forstaGang(s, 'lovtakt')) log(s, `${p.name} skar de första lövkärvarna av den hamlade björken.`, 'world', [p.id]);
  }
  ovning(p, 'skotsel', VINTER.ovning); gjort(s, p, 'hamlat');
}
// varje timme (stepVinter): ett hamlat träd som inte står kvar glöms
function glomHamlade(s: State) {
  if (!s.hamlade?.length) return;
  const g = groundOf(s), kvar = s.hamlade.filter(h => g.trees[h.i] >= 1);
  if (kvar.length !== s.hamlade.length) { s.hamlade = kvar; s.byggV = (s.byggV ?? 0) + 1; }
}
// djuren som står i fähuset (gränssnittet)
export const iFahuset = (s: State, h: Hus) => tamdjurOf(s).filter(d => d.fahus === h.id);
