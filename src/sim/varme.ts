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
import { kladSkydd, varmarePlagg } from './utrustning';
import { Act, Fire, HOUR_S, Person, State, W } from './typer';

export const VARME = balans('varme', {
  horisontKort: 2, // timmar framåt för den som är extremt kall (värmen vid KROPP.farligt och under) ...
  horisontLang: 6, // ... och för den som just börjat frysa (vid KROPP.kallt); emellan går den jämnt
  sitt: 1.3, // så många rutor från elden sitter den som värmer sig
  tanda: 0.5, // timmar det tar att tända en eld som är släckt (försöken), utöver vägen
  tandmat: 1.5, // timmar det tar att samla det som fattas till tändningen (hö, kvistar, flinta eller stenar), utöver tändningen
  ved: 1.5, // timmar det tar att samla grenar när veden är slut, och sedan tända
  klaPa: 2, // minuter det tar att byta till ett varmare plagg
});

// kroppens värme per timme på en plats (steg.ts sätter den: varmeDelar)
export const varmeKrok: { delar: (s: State, p: Person, at: { x: number; y: number }, inRum: Map<number, number>) => { heat: number; kyla: number; mild: number } } = {
  delar: () => ({ heat: 0, kyla: 0, mild: 0 }),
};

// det valet behöver för att göra ett sätt (val.ts fyller i det): uppdraget v, skälet, och valets egna sätt att sätta det
export interface VarmeGor {
  v: { spot?: { x: number; y: number }; dur: number; ref?: number; brand?: unknown; kalla?: number; tandmat?: true };
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
