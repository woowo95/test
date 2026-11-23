// Värmen (fliken Människan, Nivåerna i fast ordning): en rad i valet med ett register över sätten att bli varm (VARMA). Alla
// sätt vägs i samma mått: hur varm kroppen blir i snitt under de närmaste timmarna, med kylan på vägen dit (i snön tar vägen
// längre tid) och hur länge värmen varar (bränslet i elden). Den som fryser tar det sätt som ger mest. Hur många timmar framåt
// man räknar beror på hur kall man är (horisonten): den som är extremt kall räknar en kort stund och sätter sig hellre vid elden
// eller går in, den som fryser lite räknar flera timmar och tänder hellre, lägger på ved eller hämtar. Barnet, den sjuka och
// snön har inga egna rader: den som inte kan tända eller hämta har bara elden, huset och kläderna kvar. Kroppens värme per timme
// på en plats räknas som i steg.ts (varmeDelar, satt som krok): elden, kylan som huset, fällen och kläderna skyddar mot, och milt
// väder. Ett nytt sätt att bli varm blir en rad i VARMA
import { balans } from './balans';
import { ALDER, KROPP, ageOf, living } from './folk';
import { kroppFart, snoFart } from './gang';
import { kanGa } from './halsa';
import { ELD, brinnTakt, eldStyrka, eldXY, eldaVal, eldarOf, fuelStock, hearthOf, needStones, radieAv, tandaVal, tinderNeeded, tinderShort } from './eld';
import { Rum, roomAt } from './byggnad';
import { bedTile, samlingRum } from './byggnader';
import { kladSkydd, paSig, varmarePlagg } from './utrustning';
import type { Ting } from './agande';
import { Act, Fire, HOUR_S, Person, State, W } from './typer';

export const VARME = balans('varme', {
  horisontKort: 2, // timmar framåt för den som är extremt kall (värmen vid KROPP.farligt och under) ...
  horisontLang: 6, // ... och för den som just börjat frysa (vid KROPP.kallt); emellan går den jämnt
  sitt: 1.3, // så många rutor från elden sitter den som värmer sig
  tanda: 0.5, // timmar det tar att tända en eld som är släckt (försöken), utöver vägen
  tandmat: 1.5, // timmar det tar att samla det som fattas till tändningen (hö, kvistar, flinta eller stenar), utöver tändningen
  ved: 1.5, // timmar det tar att samla grenar när veden är slut, och sedan tända
  klaPa: 2, // minuter det tar att byta till ett varmare plagg
  svalkaH: 2, // timmar framåt för den som är extremt varm och svalkar sig (SVALKA)
});

// kroppens värme per timme på en plats (steg.ts sätter den: varmeDelar)
export interface VarmeDelar { heat: number; kyla: number; mild: number; hetta: number; kladHetta: number; klad: number }
export const varmeKrok: { delar: (s: State, p: Person, at: { x: number; y: number }, inRum: Map<number, number>) => VarmeDelar } = {
  delar: () => ({ heat: 0, kyla: 0, mild: 0, hetta: 0, kladHetta: 0, klad: 0 }),
};
// örtteet som ett sätt att bli varm (vatskor.ts sätter kroken): kan p dricka te nu, och hur mycket varmare det gör
export const teVarme = { kan: (_s: State, _p: Person) => false, varm: 0 };

// det valet behöver för att göra ett sätt (val.ts fyller i det): uppdraget v, skälet, och valets egna sätt att sätta det
export interface VarmeGor {
  v: { spot?: { x: number; y: number }; dur: number; ref?: number; brand?: unknown; kalla?: number; tandmat?: true; tool?: string };
  why: string;
  satt: (act: Act, why: string) => boolean; // set(v, act, why)
  vidEld: (f: Fire) => { x: number; y: number }; // platsen i ringen runt elden
  iRum: (rum: Rum) => { x: number; y: number }; // en plats i rummet, isär från de andra
  mjuk: (rad: 'tand' | 'leta' | 'ved') => boolean; // raden har sina arbetare
  arbeta: (act: Act, why: string, leta?: boolean) => boolean; // ett arbete som hämtar något
}
// ett sätt: id = raden i VARMA, g = värmen i snitt över horisonten, gor = gör det (false: det gick inte, nästa sätt prövas)
export interface VarmeSatt { satt: string; g: number; gor: (h: VarmeGor) => boolean }

// det raderna räknar med: värmen där man är nu (har), horisonten H, vägen, snittet och värmen vid en eld
export interface VarmeLage {
  s: State; p: Person; har: number; H: number; inRum: Map<number, number>; vuxen: boolean;
  takt: (d: { heat: number; kyla: number; mild: number }, heat?: number) => number;
  tid: (x: number, y: number, fran?: { x: number; y: number }) => number; // timmar att gå dit
  snitt: (t: number, r: number, varar: number) => number;
  vidEld: (f: Fire, I: number) => { at: { x: number; y: number }; r: number };
  ny: (f: Fire, t: number, bransle: number, varar?: number, fran?: { x: number; y: number }) => number; // en eld som får ved eller tänds
}

const rumRad = (l: VarmeLage, rum: Rum, badd?: number): VarmeSatt | undefined => {
  const { s, p, inRum } = l, t = badd ?? rum.tiles[0];
  if (t === undefined) return undefined;
  const at = { x: t % W + 0.5, y: Math.floor(t / W) + 0.5 }, inne = roomAt(s, p.x, p.y)?.id === rum.id;
  const m = inne ? inRum : new Map(inRum).set(rum.id, (inRum.get(rum.id) ?? 0) + 1);
  return {
    satt: badd !== undefined ? 'badd' : 'samling', g: l.snitt(l.tid(at.x, at.y), l.takt(varmeKrok.delar(s, p, at, m)), l.H),
    gor: h => { h.v.spot = badd !== undefined ? at : h.iRum(rum); return h.satt(badd !== undefined ? 'vila' : 'varma', `${h.why} och går in i ${badd !== undefined ? 'huset' : 'samlingshuset'}`); },
  };
};
const brannd = (s: State, id: number | undefined) => eldarOf(s).find(x => x.id === id) ?? s.fire;

// sätten att bli varm. satt(l) ger sättets möjligheter just nu (inga när det inte går)
export const VARMA: { id: string; satt: (l: VarmeLage) => (VarmeSatt | undefined)[] }[] = [
  // stanna där man redan blir varmare (tätt intill elden eller i ett varmt hus)
  { id: 'stanna', satt: l => l.har > 0 ? [{ satt: 'stanna', g: l.har, gor: h => { h.v.spot = { x: l.p.x, y: l.p.y }; return h.satt('varma', h.why); } }] : [] },
  // sätta sig vid en eld som brinner, så länge bränslet räcker (eller hela horisonten när någon lägger på ved)
  { id: 'eld', satt: l => eldarOf(l.s).filter(f => f.lit).map(f => {
    const I = eldStyrka(f.fuel, hearthOf(f)), v = l.vidEld(f, I), fylls = living(l.s).some(q => q.task?.act === 'elda' && (q.task.ref ?? l.s.fire.id) === f.id);
    return { satt: 'eld', g: l.snitt(l.tid(v.at.x, v.at.y), v.r, fylls ? l.H : f.fuel / Math.max(1e-6, brinnTakt(l.s, f))), gor: h => { h.v.spot = h.vidEld(f); return h.satt('varma', h.why); } };
  }) },
  // gå in till sin sovplats
  { id: 'badd', satt: l => { const bt = bedTile(l.s, l.p), r = bt === undefined ? undefined : roomAt(l.s, bt % W + 0.5, Math.floor(bt / W) + 0.5); return r ? [rumRad(l, r, bt)] : []; } },
  // gå in i samlingshuset (när det inte är huset man sover i)
  { id: 'samling', satt: l => { const sal = samlingRum(l.s), bt = bedTile(l.s, l.p); return sal && !(bt !== undefined && roomAt(l.s, bt % W + 0.5, Math.floor(bt / W) + 0.5)?.id === sal.id) ? [rumRad(l, sal)] : []; } },
  // ta på ett varmare plagg man får ta: kylan minskar så mycket mer som plagget skyddar än det man har på sig där
  { id: 'plagg', satt: l => varmarePlagg(l.s, l.p).map(({ t, nu }) => {
    const at = { x: t.x! + 0.5, y: t.y! + 0.5 }, d = varmeKrok.delar(l.s, l.p, at, l.inRum), k0 = nu ? kladSkydd(nu.k, nu) : 0;
    return { satt: 'plagg', g: l.snitt(l.tid(at.x, at.y), l.takt({ ...d, kyla: d.kyla * (1 - kladSkydd(t.k, t)) / Math.max(1e-6, 1 - k0) }), l.H),
      gor: h => { h.v.spot = at; h.v.ref = t.id; h.v.dur = VARME.klaPa * 60; return h.satt('klaPa', `${h.why} och tar på sig ett varmare plagg`); } };
  }) },
  // lägga ved på elden: värmen från bränslet den får, så länge det räcker
  { id: 'elda', satt: l => { const d = eldaVal(l.s, l.p); if (!d) return []; const f = brannd(l.s, d.ref);
    return [{ satt: 'elda', g: l.ny(f, l.tid(d.spot.x, d.spot.y), d.mal, d.mal / Math.max(1e-6, brinnTakt(l.s, f)), d.spot), gor: h => { h.v.spot = d.spot; h.v.dur = d.dur; h.v.ref = d.ref; return h.satt('elda', d.why); } }]; } },
  // tända den släckta elden
  { id: 'tanda', satt: l => { const d = tandaVal(l.s, l.p); if (!d) return []; const f = brannd(l.s, d.ref);
    return [{ satt: 'tanda', g: l.ny(f, VARME.tanda, ELD.tandBransle), gor: h => { h.v.spot = d.spot; h.v.dur = d.dur; h.v.ref = d.ref; h.v.brand = d.brand; h.v.kalla = d.kalla; return h.satt('tanda', d.why); } }]; } },
  // hämta det som fattas till tändningen (en vuxen)
  { id: 'tandmat', satt: l => !l.vuxen || !tinderNeeded(l.s) ? [] : [{ satt: 'tandmat', g: l.ny(l.s.fire, VARME.tandmat + VARME.tanda, ELD.tandBransle), gor: h => {
    if (tinderShort(l.s)) { if (!h.mjuk('tand')) return false; h.v.tandmat = true; return h.satt('samla', `${h.why}, men utan tändmaterial blir det ingen eld`); }
    return h.mjuk('leta') && h.arbeta('samla', `${h.why}, men utan ${needStones(l.s) ? 'stenar till ringen' : 'flinta'} blir det ingen eld`, true);
  } }] },
  // dricka örtte hemma: värmen det ger på en gång, utslagen över horisonten
  { id: 'te', satt: l => teVarme.kan(l.s, l.p) ? [{ satt: 'te', g: l.har + teVarme.varm / l.H, gor: h => { h.v.spot = { x: l.p.x, y: l.p.y }; h.v.dur = 0; h.v.tool = 'te'; return h.satt('dryck', `${h.why} och dricker örtte`); } }] : [] },
  // hämta den ved elden behöver nu (en vuxen); veden till förrådet hämtas under Försörjning
  { id: 'ved', satt: l => !l.vuxen || fuelStock(l.s) >= hearthOf(l.s.fire).maxFuel ? [] : [{ satt: 'ved', g: l.ny(l.s.fire, VARME.ved + VARME.tanda, ELD.tandBransle),
    gor: h => h.mjuk('ved') && h.arbeta('ved', `${h.why}, men utan ved blir det ingen eld`) }] },
];

// horisonten för den som har värmen w: kort för den som är extremt kall, lång för den som just börjat frysa
export const horisont = (w: number) => VARME.horisontKort + (VARME.horisontLang - VARME.horisontKort) * Math.max(0, Math.min(1, (w - KROPP.farligt) / (KROPP.kallt - KROPP.farligt)));

// sätten att bli varm för p, bäst först, och värmen där hen är nu (har). Bara det som gör hen minst lika varm som att stanna är med (den som redan sitter varmast sitter kvar)
export function varmeSatt(s: State, p: Person): { har: number; H: number; satt: VarmeSatt[] } {
  const inRum = new Map<number, number>();
  for (const q of living(s)) { const r = roomAt(s, q.x, q.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  const H = horisont(p.warm), takt = (d: { heat: number; kyla: number; mild: number }, heat = d.heat) => heat * KROPP.eldVarme - d.kyla + d.mild;
  const har = takt(varmeKrok.delar(s, p, p, inRum));
  if (!kanGa(p)) return { har, H, satt: [] };
  const fart = kroppFart(p, s.now) * HOUR_S * snoFart(s, p); // i snön tar vägen längre tid
  const tid = (x: number, y: number, fran: { x: number; y: number } = p) => Math.hypot(x - fran.x, y - fran.y) / fart;
  // snittet över horisonten: i kylan där man är tills man är framme (t timmar), sedan r så länge det varar, och sedan kylan igen
  const snitt = (t: number, r: number, varar: number) => { const a = Math.min(t, H), b = Math.max(0, Math.min(H - a, varar)); return (har * (H - b) + r * b) / H; };
  const vidEld = (f: Fire, I: number) => {
    const e = eldXY(s, f), at = { x: e.x + 0.5, y: e.y + 0.5 + VARME.sitt }, r = radieAv(I, f);
    return { at, r: takt(varmeKrok.delar(s, p, at, inRum), I * Math.max(0, 1 - VARME.sitt / r)) };
  };
  // en eld som tänds eller får ved efter t timmar: med bränslet då, och efter det fyller byn på den. fran: där man går till elden från
  const ny = (f: Fire, t: number, bransle: number, varar = H, fran: { x: number; y: number } = p) => { const v = vidEld(f, eldStyrka(bransle, hearthOf(f))); return snitt(t + tid(v.at.x, v.at.y, fran), v.r, varar); };
  const l: VarmeLage = { s, p, har, H, inRum, vuxen: ageOf(p, s.now) >= ALDER.vuxen, takt, tid, snitt, vidEld, ny };
  const ut = VARMA.flatMap(r => r.satt(l)).filter((x): x is VarmeSatt => !!x && x.g >= har);
  return { har, H, satt: ut.sort((a, b) => b.g - a.g) };
}

// Svalkan (fliken Människan, Nivåerna i fast ordning): den som är extremt varm svalkar sig, och alla sätt går lika bra: skuggan,
// ett hus, vattnet eller att ta av sig ett varmt plagg. Sätten är rader i registret SVALKA och vägs i samma mått: hur mycket
// varmare kroppen blir under de närmaste timmarna (VARME.svalkaH), med vägen dit i hettan. Den som svalkar sig tar det som
// ger minst. Hettan per timme på en plats räknas som i steg.ts (varmeDelar): solen, kläderna och elden, och det som kyler
export interface SvalkaGor {
  v: { spot?: { x: number; y: number }; dur: number; ref?: number };
  why: string;
  satt: (act: Act, why: string) => boolean;
  iRum: (rum: Rum) => { x: number; y: number };
  vila: number; // så länge man vilar i skuggan eller huset (sekunder)
  bad: () => { spot: { x: number; y: number }; dur: number } | undefined; // badplatsen och badets längd
}
export interface SvalkaSatt { satt: string; d: number; har?: boolean; /* stanna i skuggan där man är */ gor: (h: SvalkaGor) => boolean }
// det svalkans rader behöver (val.ts sätter kroken): skuggan nära, badplatsen och om vattnet går att bada i
export const svalkaKrok = {
  skugga: (_s: State, _p: Person): { x: number; y: number } | undefined => undefined,
  bad: (_s: State, _p: Person): { x: number; y: number } | undefined => undefined,
  badKyla: 0, // så mycket svalare blir den som badar
};
interface SvalkaLage { s: State; p: Person; H: number; inRum: Map<number, number>; tid: (x: number, y: number) => number; har: number; ta: (at: { x: number; y: number }, d?: VarmeDelar) => number; dit: (t: number, r: number) => number }
const svalRum = (l: SvalkaLage, rum: Rum, badd?: number): SvalkaSatt | undefined => {
  const t = badd ?? rum.tiles[0];
  if (t === undefined || roomAt(l.s, l.p.x, l.p.y)?.id === rum.id) return undefined;
  const at = { x: t % W + 0.5, y: Math.floor(t / W) + 0.5 };
  return { satt: 'hus', d: l.dit(l.tid(at.x, at.y), l.ta(at)), gor: h => { h.v.spot = badd !== undefined ? at : h.iRum(rum); h.v.dur = h.vila; return h.satt('svalka', `${h.why} och går in i huset`); } };
};
export const SVALKA: { id: string; satt: (l: SvalkaLage) => (SvalkaSatt | undefined)[] }[] = [
  // stanna där man är
  { id: 'stanna', satt: l => [{ satt: 'stanna', d: l.har * l.H, gor: () => false }] },
  // gå till skuggan under ett träd, eller vila där man står när man redan är i skugga
  { id: 'skugga', satt: l => { const sk = svalkaKrok.skugga(l.s, l.p); if (!sk) return [];
    const har = Math.hypot(sk.x - l.p.x, sk.y - l.p.y) < 0.5;
    return [{ satt: 'skugga', d: har ? l.har * l.H : l.dit(l.tid(sk.x, sk.y), l.ta(sk)), har, gor: h => { h.v.spot = sk; h.v.dur = h.vila; return h.satt('svalka', har ? `${h.why} och vilar i skuggan` : `${h.why} och söker skugga`); } }]; } },
  // gå in i huset man sover i, eller i samlingshuset
  { id: 'badd', satt: l => { const bt = bedTile(l.s, l.p), r = bt === undefined ? undefined : roomAt(l.s, bt % W + 0.5, Math.floor(bt / W) + 0.5); return r ? [svalRum(l, r, bt)] : []; } },
  { id: 'samling', satt: l => { const sal = samlingRum(l.s); return sal ? [svalRum(l, sal)] : []; } },
  // bada: vattnet kyler på en gång
  { id: 'bada', satt: l => { const b = svalkaKrok.bad(l.s, l.p); if (!b) return [];
    const t = l.tid(b.x, b.y); // vattnet kyler när man kommer fram, och bara det som hinner hända inom tiden framåt räknas
    return [{ satt: 'bada', d: l.dit(t, l.ta(b)) - (t < l.H ? svalkaKrok.badKyla : 0), gor: h => { const bd = h.bad(); if (!bd) return false; h.v.spot = bd.spot; h.v.dur = bd.dur; return h.satt('bada', `${h.why} och badar`); } }]; } },
  // ta av sig det varmaste plagget: kläderna värmer så mycket mindre
  { id: 'plagg', satt: l => {
    const d = varmeKrok.delar(l.s, l.p, l.p, l.inRum);
    if (d.klad <= 0 || d.kladHetta <= 0) return [];
    let t: Ting | undefined;
    for (const q of paSig(l.s, l.p)) if (kladSkydd(q.k, q) > 0 && (!t || kladSkydd(q.k, q) > kladSkydd(t.k, t))) t = q;
    if (!t) return [];
    const ut = t, av = Math.min(1, kladSkydd(t.k, t) / d.klad);
    return [{ satt: 'plagg', d: l.ta(l.p, { ...d, hetta: d.hetta - d.kladHetta * av }) * l.H, gor: h => { h.v.spot = { x: l.p.x, y: l.p.y }; h.v.ref = ut.id; h.v.dur = VARME.klaPa * 60; return h.satt('klaAv', `${h.why} och tar av sig ett varmt plagg`); } }];
  } },
];
// sätten att svalka sig för p, bäst först: bara det som gör hen svalare än att stanna
export function svalkaSatt(s: State, p: Person): SvalkaSatt[] {
  if (!kanGa(p)) return [];
  const inRum = new Map<number, number>();
  for (const q of living(s)) { const r = roomAt(s, q.x, q.y); if (r) inRum.set(r.id, (inRum.get(r.id) ?? 0) + 1); }
  // hettan per timme ovanför idealet: det som värmer, minus det som kyler och kroppen som svalnar (som nyVarme i steg.ts)
  const ta = (at: { x: number; y: number }, d = varmeKrok.delar(s, p, at, inRum)) => d.hetta + Math.min(0, d.heat * KROPP.eldVarme - d.kyla + d.mild) - KROPP.svalnar;
  const H = VARME.svalkaH, har = ta(p), fart = kroppFart(p, s.now) * HOUR_S * snoFart(s, p);
  const tid = (x: number, y: number) => Math.hypot(x - p.x, y - p.y) / fart;
  const dit = (t: number, r: number) => { const a = Math.min(t, H); return har * a + r * (H - a); };
  const l: SvalkaLage = { s, p, H, inRum, tid, har, ta, dit };
  const alla = SVALKA.flatMap(r => r.satt(l)).filter((x): x is SvalkaSatt => !!x), stanna = alla.find(x => x.satt === 'stanna')!.d;
  return alla.filter(x => x.satt !== 'stanna' && (x.d < stanna || x.har)).sort((a, b) => a.d - b.d);
}
