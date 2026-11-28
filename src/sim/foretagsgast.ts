// ---------- företagens gäster (steg 14.1.11, Ekonomi och handel: Gästerna och ryktet, i fliken Människan) ----------
// Ett företag drar folk från byarna runtom. Hur ofta någon kommer följer relationen, hur nära byn ligger och vad de hört om
// företaget (ryktetI); ett gott rykte drar mest finare gäster: hövdingen, prästen och de rika (RANG), med mer silver, som kan bära
// mer och väntar sig finare rum. En ovänby besöker aldrig, och från en som tycker lite illa om byn kommer bara enkelt folk. Gästen
// går till företaget, köper vid disken som en bybo (kassa.ts), äter vid bordet, köper mer så länge något lockar och går hem. Det
// hen köpt kommer till hembyns rad och silvret ur den. Hur hen blev bemött (omdömet) ändrar relationen, mest för den med ämbete
import type { Person, State } from './typer';
import { DAY, HOUR, HOUR_S, MIN, SEC, W } from './typer';
import { balans } from './balans';
import { clamp, hash3 } from './slump';
import { ALDER, count, log, makeName } from './folk';
import { gastGar, gastLever, gastTillbaka, nyGast, nyttGastId } from './gast';
import { gastRad, kandIgen, klanById, klanerOf, KLAN, narhet, type Klan } from './klaner';
import { kantMot } from './grannbyar';
import { klanHandelse } from './byrel';
import { gaMot } from './rovare';
import { FORDON_TAL } from './fordon';
import { hourOf } from './tid';
import { diskarAv, erbjudandet, gastKund, KASSA, koaKlar, koPlats, omdome, stallIKo, type Erbjudande } from './kassa';
import { foretagOf, gastFlode, oppna, VERKSAMHETER, type Foretag } from './foretag';
import { ryktetI, omdomeAv } from './foretagsrykte';
import { FORVANTAN } from './forvantan';
import { radOverskott, radPaslag, radTar } from './priser';
import { packaRad } from './byhandling';
import type { VarldRad } from './radtal';
import { grundvarde } from './varde';
import { isFood, viktOf } from './saker';
import { arAgd, put, stacksOf, taUrStack, tidy } from './lager';
import { tingOf } from './agande';
import { ledigPlats } from './stationer';
import { ata } from './naring';
import { KROPP } from './folk';
import { BYN } from './egendom';
import type { Part, Vara } from './byte';
import type { Task } from './typer';

export const FGAST = balans('foretagsgast', {
  perDygn: 0.8, // så många gäster per dygn (ett år i spelet) drar ett företag från en by nära som är neutral
  inst: 0.5, // en vän kommer så mycket oftare (och den som tycker illa så mycket mer sällan)
  rykte: 0.3, // ett helt gott rykte drar så mycket fler ...
  fin: 0.1, finRykte: 0.6, finInst: 0.2, // ... men gör mest gästerna finare: chansen att gästen är fin
  nara: 1.6, // så nära disken (rutor) ställer sig gästen i kön
  kop: 4, // så många gånger köper en gäst högst under ett besök (så länge något lockar), också köp som inte blev av (steg 15.1.56)
  ata: 10, // så länge (minuter) sitter gästen med det hen köpt
  fran: 9, till: 18, // gästen kommer fram under dagen
  moten: 6, // det hen redan haft lockar mindre: 1 / (1 + antalet gånger × moten)
  vag: 0.4, // ett dygns väg tar så mycket av vilan
  ridande: 0.2, // så ofta kommer en vanlig gäst med ett riddjur (de fina gör det alltid); stallet räknar med samma tal (verksamheter.ts, steg 15.1.170)
  igen: 0.5, // så ofta är det någon som varit här förut, om det finns någon
  varor: 0.5, // så stor del av det gästen orkar bära packas med varor ur hembyns överskott att betala med (steg 15.1.11)
});
// vem gästen är. silver = så stor del av silvret per person hemma hen tar med (och lägst), kg = det hen kan bära, forv = finheten hen väntar sig
// utöver den vanliga, vikt = hur mycket hembyn lyssnar på hur hen blev bemött
export interface Rang { namn: string; titel: string; silver: number; minst: number; kg: number; forv: number; vikt: number; fin?: true; roll?: RegExp }
export const RANG = {
  vanlig: { namn: 'Gäst', titel: 'Gästen', silver: 0.5, minst: 3, kg: 8, forv: 0, vikt: 1 },
  rik: { namn: 'Rik gäst', titel: 'Den rika gästen', silver: 2, minst: 12, kg: 14, forv: FORVANTAN.rik * 2, vikt: 1.5, fin: true },
  prast: { namn: 'Präst', titel: 'Prästen', silver: 1.5, minst: 10, kg: 12, forv: FORVANTAN.prast + FORVANTAN.rik, vikt: 2.5, fin: true },
  hovding: { namn: 'Hövding', titel: 'Hövdingen', silver: 3, minst: 20, kg: 18, forv: FORVANTAN.ledare + FORVANTAN.rik * 2, vikt: 4, fin: true, roll: /hövding/i },
} as const satisfies Record<string, Rang>;
export type RangId = keyof typeof RANG;
const RANGER = Object.keys(RANG) as RangId[], FINA = RANGER.filter(x => (RANG[x] as Rang).fin);
const R = (p: Person): Rang => RANG[p.gast!.rang ?? 'vanlig'];

// ---------- vem som kommer ----------
export const oppnaForetag = (s: State): Foretag[] => foretagOf(s).filter(f => oppna(s, f).length && diskarAv(s, f).length);
// hur ofta per dygn någon från grannbyn k kommer till företaget f
export function lockar(f: Foretag, k: Klan): number {
  if (k.rad === undefined || k.inst <= KLAN.handelMin) return 0; // en ovänby besöker aldrig
  return FGAST.perDygn * narhet(k) * Math.max(0, 1 + FGAST.inst * k.inst / 100) * Math.max(0, 1 + FGAST.rykte * ryktetI(f, k.rad));
}
// det en gäst av rangen tar med sig av hembyns silver (r: hembyns rad)
const gastSilver = (r: VarldRad | undefined, rang: Rang) => { const hem = Math.floor((r?.tal.silver ?? 0) / Math.max(1, r?.tal.folk ?? 1) * rang.silver); return Math.min(r ? Math.floor(r.tal.silver) : rang.minst, Math.max(rang.minst, hem)); };
// det en vanlig gäst från grannbyn k kan betala med (steg 15.1.13): silvret och värdet av varorna hen packar ur hembyns överskott,
// som när hen kommer (nyForetagsgast). Räknas en gång i timmen per by
const pungMinne = new WeakMap<Klan, { t: number; v: number }>();
export function gastPung(s: State, k: Klan): number {
  const tim = Math.floor(s.now / HOUR), m = pungMinne.get(k);
  if (m && m.t === tim) return m.v;
  const r = s.varld?.rader?.find(q => q.nr === k.rad);
  let v = gastSilver(r, RANG.vanlig);
  if (r) { let i = 0; const l = packaRad(structuredClone(r), () => hash3(s.seed, tim, k.id, 0x6a59 + i++), g => radOverskott(r, g), 'vandrande', undefined, false, { kg: RANG.vanlig.kg * FGAST.varor, utanSilver: true }); v += l.varor.reduce((a, w) => a + w.n * grundvarde(w.k), 0); }
  pungMinne.set(k, { t: tim, v });
  return v;
}
// gästerna per dygn som kan betala priset (efterfragan i foretag.ts, steg 15.1.13)
gastFlode.push((s, pris) => foretagOf(s).length ? klanerOf(s).reduce((a, k) => a + (gastPung(s, k) >= pris ? Math.max(...foretagOf(s).map(f => lockar(f, k))) : 0), 0) : 0);
export const finChans = (f: Foretag, k: Klan) => k.inst < 0 || k.rad === undefined ? 0 : clamp(FGAST.fin + FGAST.finRykte * ryktetI(f, k.rad) + FGAST.finInst * k.inst / 100, 0, 1);
// i timmens takt (TAKTER): kommer någon?
export function foretagsgasterKommer(s: State, sek: number) {
  if (!s.foretag?.length) return;
  const h = hourOf(s.now);
  if (h < FGAST.fran || h >= FGAST.till) return;
  const per = sek / (HOUR_S * 24) * 24 / (FGAST.till - FGAST.fran), tim = Math.floor(s.now / HOUR);
  for (const f of oppnaForetag(s)) for (const k of klanerOf(s)) if (hash3(s.seed, tim, f.id * 1009 + k.id, 0x6a57) < lockar(f, k) * per) nyForetagsgast(s, f, k);
}
export function nyForetagsgast(s: State, f: Foretag, k: Klan, rang?: RangId): Person | undefined {
  const nr = (s.gastNr ?? 0) * 7919 + k.id, u = (i: number) => hash3(s.seed, nr, i, 0x6a58);
  const r = s.varld?.rader?.find(q => q.nr === k.rad);
  let id = rang ?? (u(0) < finChans(f, k) ? FINA[Math.floor(u(1) * FINA.length)] : 'vanlig');
  if (id === 'prast' && !r?.tro) id = 'rik'; // en by utan tro har ingen präst
  const roll = (RANG[id] as Rang).roll, har = k.personer.filter(q => roll ? roll.test(q.roll) : q.roll === 'kund' && q.kropp);
  if (id === 'hovding' && !har.length) id = 'rik';
  const kp = (har.length && (roll || u(2) < FGAST.igen) && !s.people.some(q => q.gast?.klan === k.id && har.some(x => x.namn === q.name)) ? har[Math.floor(u(3) * har.length)] : undefined)
    ?? (roll ? undefined : kandIgen(s, k, q => q.roll === 'kund', u(7))); // grannbyn har inte fler personer än sitt folk (steg 14.2.6)
  const sex = kp?.sex ?? (u(4) < 0.5 ? 'm' as const : 'k' as const), ut = kantMot(s, k.id) ?? { x: W / 2, y: 0.5 };
  const p = nyGast(s, { id: nyttGastId(s), namn: kp?.namn ?? makeName(s, sex, 'klan'), sex, fodd: kp?.fodd ?? s.now - (ALDER.vuxen + 2 + u(5) * 30) * DAY, rad: { sort: 'kund', klan: k.id, hem: k.hem, hemRad: k.rad, fas: 'kommer', rang: id, mal: f.id }, x: ut.x, y: ut.y, nyckel: nr });
  if (kp?.kropp) gastTillbaka(s, p);
  p.finForv = clamp(FORVANTAN.grund + R(p).forv, FORVANTAN.min, FORVANTAN.max);
  // silvret tas ur hembyn
  const sil = gastSilver(r, R(p));
  p.gast!.silver = sil;
  p.rest = clamp(p.rest - FGAST.vag * (k.dygn ?? 0), 0.1, 1); // trött av vägen
  if (R(p).fin || u(6) < FGAST.ridande) p.gast!.riddjur = 1;
  if (r) radTar(r, 'silver', -sil);
  // varorna ur hembyns överskott, packade som handlarens last (steg 15.1.11): gästen betalar med silvret och med dem
  if (r) { let i = 0; const l = packaRad(r, () => u(20 + i++), g => radOverskott(r, g), 'vandrande', undefined, false, { kg: R(p).kg * FGAST.varor, utanSilver: true }); if (l.varor.length) { const v: Record<string, number> = p.gast!.varor = {}; for (const w of l.varor) v[w.k] = (v[w.k] ?? 0) + w.n; } }
  s.people.push(p);
  count(s, 'foretagsgast'); count(s, 'foretagsgast_' + id); if (R(p).fin) count(s, 'foretagsgastFin');
  log(s, `${R(p).titel} ${p.name} från ${k.namn} kommer för att besöka ${f.namn}.`, 'move', [p.id]);
  return p;
}
// ---------- gästen som kund (kassa.ts) ----------
const buret = (p: Person) => [...Object.entries(p.gast!.kop ?? {}), ...Object.entries(p.gast!.varor ?? {})].reduce((a, [k, n]) => a + n * viktOf(k), 0);
gastKund.part = (s, p): Part => ({
  id: p.id, namn: p.name, x: p.x, y: p.y, handel: p.skill.handel ?? 0,
  varde: k => k === 'silver' ? 1 : isFood(k) ? 0.5 + (1 - p.hunger) : (r => r ? radPaslag(s, r, k) : 1)(gastRad(s, p)), // hemma är saken värd det byn betalar för den
  over: utom => [...(p.gast!.silver ?? 0) >= 1 && !utom.includes('silver') ? [{ k: 'silver', n: p.gast!.silver! }] : [], ...Object.entries(p.gast!.varor ?? {}).filter(([k, n]) => n >= 1 && !utom.includes(k)).map(([k, n]) => ({ k, n }))], // silvret och varorna hen har med sig (steg 15.1.11)
});
// ju fler gånger hen redan ätit eller druckit här, desto mindre lockar det
const trott = (p: Person, v: string) => 1 / (1 + (p.gast!.haft?.[v] ?? 0) * FGAST.moten);
gastKund.noje = (s, p, v, k) => {
  const V = VERKSAMHETER[v];
  return V.hylla ? grundvarde(k) * Math.max(0, gastKund.part(s, p).varde(k) - 1) : V.noje(s, p, k) * trott(p, v);
};
gastKund.mangd = (_s, p, h) => { const rum = Math.floor((R(p).kg - buret(p)) / Math.max(0.01, viktOf(h.k)) + 1e-9); return Math.max(0, Math.min(h.n, rum, h.t ? 1 : rum)); };
gastKund.betalar = (s, f, p, betal: Vara[]) => {
  for (const w of betal) { const g = p.gast!; if (w.k === 'silver') g.silver = (g.silver ?? 0) - w.n; else if (g.varor) g.varor[w.k] = (g.varor[w.k] ?? 0) - w.n; put(s, w.k, w.n, f.ag === BYN ? undefined : { [f.ag]: w.n }); }
};
// varan: ur hyllan till det gästen bär, annars äts maten vid bordet
gastKund.far = (s, f, p, h, n) => {
  const kop = p.gast!.kop ??= {};
  if (h.t) { s.ting = tingOf(s).filter(t => t !== h.t); kop[h.k] = (kop[h.k] ?? 0) + 1; return; }
  const a = stacksOf(s).find(q => q.x === h.x && q.y === h.y && q.k === h.k), v = a ? Math.min(n, Math.floor(arAgd(a, f.ag) + 1e-9)) : 0;
  if (!a || v < 1) return;
  taUrStack(s, a, v, f.ag, { act: 'bara', phase: 'back', tx: 0, ty: 0, until: s.now, carry: 0, why: '' } as Task);
  kop[h.k] = (kop[h.k] ?? 0) + v; tidy(s);
};
gastKund.at = (_s, p, k) => ata(p, { [k]: KROPP.mattar });
// varje köp vid disken räknas mot FGAST.kop, också det som föll för att varan aldrig kom fram (steg 15.1.56): annars ställer sig
// gästen i kön igen och igen för samma vara
gastKund.forsok = (_s, p) => { const g = p.gast!; g.gjort = (g.gjort ?? 0) + 1; };
gastKund.klar = (s, p, v, sitter) => {
  const g = p.gast!;
  (g.haft ??= {})[v] = (g.haft[v] ?? 0) + 1;
  if (g.gor === 'sover') { p.task = undefined; return; } // bädden hen köpt (verksamheter.ts)
  if (sitter) { const q = ledigPlats(s, p); g.gor = 'ater'; g.till = s.now + FGAST.ata * MIN; g.vx = q?.x ?? p.x; g.vy = q?.y ?? p.y; } else g.gor = undefined;
  p.task = undefined;
};
// hur hen blev bemött: medlet av besökets omdömen
omdome.push((s, p, f, b) => { const g = p.gast; if (g?.sort !== 'kund') return; const v = b ? omdomeAv({ s, p, f, ...b }) : -1, o = g.bemott ??= { v: 0, n: 0 }; o.v += v; o.n++; });

// ---------- besöket (TAKTER, varje slag) ----------
const basta = (s: State, p: Person, f: Foretag): Erbjudande | undefined => {
  let b: Erbjudande | undefined;
  for (const v of f.verk) { const e = erbjudandet(s, p, v, f); if (e && e.net > (b?.net ?? 0)) b = e; }
  return b;
};
// gästen går hem. Ett riddjur som inte fått foder gör gästen missnöjd, som en måltid hen inte fick (steg 15.1.170)
const gaHem = (p: Person, s?: State, f?: Foretag) => {
  const g = p.gast!;
  if (s && f && g.fas === 'pratar' && g.riddjur) { for (const o of omdome) o(s, p, f); count(s, 'riddjurUtanFoder'); }
  g.fas = 'gar'; g.gor = undefined; g.path = undefined; g.pk = undefined; p.task = undefined;
};
export function foretagsgastSteg(s: State, dtSec: number) {
  const t0 = s.now - dtSec * SEC;
  for (const p of s.people.filter(q => q.gast?.sort === 'kund' && gastLever(q))) {
    const g = p.gast!, f = foretagOf(s).find(q => q.id === g.mal), disk = f && oppna(s, f).length ? diskarAv(s, f)[0] : undefined;
    if (g.fas !== 'gar' && (!f || !disk)) { gaHem(p); continue; } // företaget finns inte mer, eller är stängt
    if (g.fas === 'kommer') {
      const m = koPlats(s, disk!), kvar = gaMot(s, p, m.x, m.y, dtSec, t0);
      if (kvar < 0) gaHem(p);
      else if (kvar < FGAST.nara) { g.fas = 'pratar'; g.path = undefined; g.pk = undefined; }
    } else if (g.fas === 'pratar') {
      if (g.sover) continue;
      if (g.gor === 'ko') {
        const r = f!.ko?.find(q => q.p === p.id);
        if (!r) g.gor = undefined; // kön tömdes utan att hen fick något
        else if (s.now - r.t >= KASSA.tal * MIN) { koaKlar(s, p, p.task ?? { act: 'koaDisk', phase: 'do', tx: p.x, ty: p.y, until: s.now, carry: 0, why: '', ref: f!.id }); gaHem(p, s, f); }
      } else if (g.gor === 'ater') {
        if (Math.hypot(p.x - (g.vx ?? p.x), p.y - (g.vy ?? p.y)) > 0.3) gaMot(s, p, g.vx!, g.vy!, dtSec, t0);
        if (s.now >= (g.till ?? 0)) { g.gor = undefined; g.path = undefined; g.pk = undefined; }
      } else if (g.gor === 'sover') { // går till bädden, sover ut och går upp
        if (g.sovit) { g.sovit = undefined; g.gor = undefined; g.path = undefined; g.pk = undefined; }
        else if (gaMot(s, p, g.vx!, g.vy!, dtSec, t0) < 0.6) { p.x = g.vx!; p.y = g.vy!; g.sover = 1; g.sovit = 1; }
      } else {
        const e = (g.gjort ?? 0) < FGAST.kop ? basta(s, p, f!) : undefined;
        if (!e) { if (!g.gjort && !g.bemott) for (const o of omdome) o(s, p, f!); gaHem(p, s, f); continue; } // inget lockade, eller allt är slut
        const o = stallIKo(s, p, e);
        p.x = o.spot.x; p.y = o.spot.y; g.gor = 'ko';
        p.task = { act: 'koaDisk', phase: 'do', tx: p.x, ty: p.y, until: s.now + KASSA.tal * MIN, carry: 0, why: o.why, ref: f!.id };
      }
    } else {
      const ut = kantMot(s, g.klan) ?? { x: W / 2, y: 0.5 }, kvar = gaMot(s, p, ut.x, ut.y, dtSec, t0, g.rodd ? FORDON_TAL.ridFart : 1); // ett fött riddjur bär gästen hem i ryttarens fart (steg 15.1.170)
      if (kvar < 0.5) gastHemIgen(s, p);
    }
  }
}
// gästen är hemma igen: det hen köpt och silvret hen har kvar kommer till byn, och relationen följer hur hen blev bemött
export function gastHemIgen(s: State, p: Person) {
  const g = p.gast!, r = gastRad(s, p), k = klanById(s, g.klan);
  if (r) { radTar(r, 'silver', g.silver ?? 0); for (const q in g.kop) radTar(r, q, g.kop[q]); for (const q in g.varor) if (g.varor[q] >= 1) radTar(r, q, g.varor[q]); } // det hen inte betalade med går hem igen
  if (k && g.bemott?.n) { const v = g.bemott.v / g.bemott.n; klanHandelse(s.varld, k, v >= 0 ? 'bemott' : 'illaBemott', Math.abs(v) * R(p).vikt); count(s, v >= 0 ? 'gastNojd' : 'gastMissnojd'); }
  gastGar(s, p.id, true);
}
