// ---------- rån och rovdjur på vägen (steg 11.6.21, Flera samhällen: Vägens händelser i tal) ----------
// Två rader i VAGHANDELSER (resa.ts) som kan hända huvudbyns sällskap på vägen. Rånet: faran på en sträcka räknas ur de
// rövarläger som verkligen finns nära den, mer ju fler de är och mindre ju längre bort (VAGRAN.nara rutor ger halva faran).
// Rövarna tas ur lägret (så många som lägret har styrka till), och bytet går dit. Rovdjuren: vargar, oftare på obanad mark och i
// istiden. Sällskapets ledare väljer mellan att betala (rövarna får saker, vargarna får mat), fly och slåss med en poäng: det man
// väntar sig att förlora, där ledarens mod och aggression gör striden billigare och flykten dyrare. Flykten lyckas oftare för ett
// lätt sällskap och mer sällan med djur, vagn och den som inte kan gå; misslyckas den blir det strid. Striden räknas med stridens
// regler (strid.ts) på sällskapets personer: såren sitter på dem som hemma, och den som dör begravs vid leden.
import { balans } from './balans';
import { heltOrd, och, sakOrd, stor } from './ord';
import { count } from './folk';
import { byPlats } from './landmarken';
import { flockKraft, flockStorlek, BYANFALL, radUtrustning, radVarde } from './radanfall';
import { VarldRad } from './radtal';
import { radDoda } from './rad';
import { radTar } from './priser';
import { dagbok, dorPaVagen, resenarer, Sallskap, tappa, VAGHANDELSER } from './resa';
import { FOOD } from './saker';
import { grundvarde } from './varde';
import { varldMark } from './varlden';
import { ledKlass } from './leder';
import { rnd } from './slump';
import { KROPPSDELAR, forlora, kanGa, skada } from './halsa';
import { STRIDSLAG } from './efterstrid';
import { Kampe, StridVarld, Uppstallning, djurKampe, nyStrid, personKampe, stridTillSlut, stridsvarde, stridsvardeAv } from './strid';
import { ROVARE } from './rovare';
import { ageIndex, iIstiden } from './tid';
import { byId, stat } from './folk';
import { Person, State } from './typer';

// de rånade vet var rövarna kom ifrån (vaktat.ts sätter kroken)
export const VAKTKROK = { ranad: (_s: State, _sl: Sallskap, _L: VarldRad, _t: number) => {}, plundrad: (_s: State, _L: VarldRad, _tog: [string, number][]) => {}, forlorat: (_s: State, _sl: Sallskap, _L: VarldRad, _tog: [string, number][]) => {} }; // forlorat: de rånade minns vad de förlorat (steg 11.8.11, utlysa.ts)
export const VAGRAN = balans('vagran', {
  dygn: 0.4, // risken per dygn för ett rån vid ett läger med lagerFolk rövare ...
  lagerFolk: 10,
  nara: 6, // ... och den halveras för varje så här många rutor (på världskartan) från lägret
  krav: 15, // rövarna kräver så mycket (i grundvärde) per rövare för att låta sällskapet gå
  varg: 0.02, // risken per dygn att vargar anfaller ...
  vargObanad: 2, vargIstid: 3, // ... gånger detta på obanad mark och i istiden
  vargar: [2, 4], // så många vargar (minst, högst)
  vargMat: 2, // vargarna nöjer sig med så många portioner per varg
  fly: 0.6, // chansen att flykten lyckas för ett lätt sällskap ...
  flyDjur: 0.6, // ... gånger detta med djur eller vagn
  flyTim: 3, // flykten kostar så många timmar
  timVarde: 2, // en timme förlorad är värd så mycket (grundvärde)
  sarVarde: 40, // det ledaren väntar sig att förlora i sår och liv per resenär som förlorar en strid (grundvärde)
  modVikt: 0.5, // modet och aggressionen (10 = lagom) gör striden billigare och flykten dyrare, så här mycket per 10
});

const rovarLager = (r: VarldRad) => r.sort === 'rovarlager' && r.tal.folk > 0;
// lägren nära sällskapet och faran från vart och ett (en del av VAGRAN.dygn)
function lagerNara(s: State, sl: Sallskap): [VarldRad, number][] {
  const vl = s.varld, v = varldMark(s);
  if (!vl || !v || sl.ruta === undefined) return [];
  const x = sl.ruta % v.w, y = Math.floor(sl.ruta / v.w), ut: [VarldRad, number][] = [];
  for (const r of vl.rader ?? []) {
    if (!rovarLager(r)) continue;
    const p = byPlats(vl, r.nr);
    if (!p) continue;
    const d = Math.hypot(p.x - x, p.y - y), f = r.tal.folk / VAGRAN.lagerFolk * Math.pow(0.5, d / VAGRAN.nara);
    if (f > 1e-4) ut.push([r, f]);
  }
  return ut;
}
export const packVarde = (sl: Sallskap) => Object.entries(sl.pack).reduce((a, [k, n]) => a + Math.floor(n ?? 0) * grundvarde(k), 0);
const ledare = (s: State, sl: Sallskap) => byId(s, sl.ledare) ?? resenarer(s, sl)[0];
// modet och aggressionen hos ledaren, 0 = lagom
export const djarv = (s: State, sl: Sallskap) => { const p = ledare(s, sl); return p ? (stat(p, 'mod', s.now) + stat(p, 'aggression', s.now) - 20) / 20 : 0; };
// chansen att sällskapet vinner mot fienden: styrkan i kvadrat, som anfallen mellan byarna; fiende = fiendens styrka (flockKraft),
// och sällskapets är de som kan gå med sina stridsvärden (steg 15.1.152)
function vinst(s: State, sl: Sallskap, fiende: number) {
  const folk = resenarer(s, sl).filter(p => kanGa(p));
  if (!folk.length) return 0;
  const ka = flockKraft(folk.length, folk.reduce((a, p) => a + stridsvarde(s, p), 0) / folk.length);
  return ka * ka / (ka * ka + fiende * fiende);
}
const flyChans = (s: State, sl: Sallskap) => resenarer(s, sl).some(p => !kanGa(p)) ? 0 : VAGRAN.fly * (sl.djur.length || sl.fordon.length ? VAGRAN.flyDjur : 1);
export type VagVal = 'betala' | 'fly' | 'slass';
// det ledaren väntar sig att förlora med varje val (grundvärde)
export function vagValen(s: State, sl: Sallskap, fiende: number, krav: number): Record<VagVal, number> {
  const d = djarv(s, sl), n = resenarer(s, sl).length, p = vinst(s, sl, fiende);
  const slass = (1 - p) * (packVarde(sl) + VAGRAN.sarVarde * n) * Math.max(0.2, 1 - VAGRAN.modVikt * d);
  const pf = flyChans(s, sl);
  const fly = (VAGRAN.flyTim * VAGRAN.timVarde + (1 - pf) * slass) * Math.max(0.2, 1 + VAGRAN.modVikt * d);
  return { betala: krav, fly, slass };
}
const basta = (v: Record<VagVal, number>): VagVal => (['betala', 'fly', 'slass'] as VagVal[]).reduce((a, b) => v[b] < v[a] ? b : a);
// det mest värda först, i hela saker, tills värdet v är nått; ut = bara de här sakerna
export function taUrPack(sl: Sallskap, v: number, ut?: (k: string) => boolean): [string, number][] {
  const tog: [string, number][] = [];
  for (const k of Object.keys(sl.pack).filter(k => (!ut || ut(k)) && Math.floor(sl.pack[k] ?? 0) >= 1).sort((a, b) => grundvarde(b) - grundvarde(a) || a.localeCompare(b))) {
    if (v <= 0) break;
    const n = Math.min(Math.floor(sl.pack[k]!), Math.max(1, Math.ceil(v / Math.max(0.01, grundvarde(k)))));
    tappa(sl, k, n); tog.push([k, n]); v -= n * grundvarde(k);
  }
  return tog;
}
export const lista = (t: [string, number][]) => och(t.map(([k, n]) => { const [art, en, fler] = sakOrd(k); return n === 1 ? `${art} ${en}` : `${heltOrd(n)} ${fler}`; }));

// striden på vägen: sällskapet (sida 0) mot fienderna (sida 1); svarar med vinnaren och hur många fiender som dog
export function vagStrid(s: State, sl: Sallskap, fiender: Uppstallning['kampar'], slag: string, t: number): { vann: boolean; doda: number } {
  const folk = resenarer(s, sl).filter(p => kanGa(p));
  const kampar = [...folk.map((p, i) => personKampe(s, p, i + 1, 0, 4, 3 + i)), ...fiender.map((k, j) => ({ ...k, id: 1000 + j, x: 16, y: 3 + j }))];
  const st = nyStrid({ avsikt: 'skada', w: 20, h: Math.max(10, kampar.length + 4), kampar }, Math.floor(rnd(s, 'resa') * 2 ** 31));
  const person = (k: Kampe): Person | undefined => k.pid !== undefined ? folk.find(p => p.id === k.pid) : undefined;
  const sl0 = STRIDSLAG[slag];
  const v: StridVarld = {
    vagg: () => false,
    skada: (k, w) => {
      const p = person(k);
      if (!p || p.dodVag) return false;
      const dod = skada(s, p, w.d, w.k, w.g, (sl0?.orsak ?? 'drap') as Parameters<typeof skada>[5], 'på resan', true);
      if (!dod && w.av && !(KROPPSDELAR[w.d] as { livsviktig?: true }).livsviktig) forlora(s, p, w.d, 'höggs av'); // olyckshugget (steg 9.5.22): striden avgör (steg 12.1.82)
      if (dod) dorPaVagen(s, sl, p, dod, t);
      return !!dod;
    },
  };
  stridTillSlut(st, v);
  count(s, 'resa strid');
  const doda = st.kampar.filter(k => k.sida === 1 && k.lage === 'dod').length;
  return { vann: st.slut?.vinnare === 0, doda };
}
// en rövare ur lägret L som kämpe (rövarnas kropp ur ROVARE, vapnet efter lägrets utrustning)
const mitt = ([a, b]: readonly number[]) => (a + b) / 2;
// Vapnet och skyddet är det lägret kan göra och har råd med, som stridsvärdet i världen räknar (steg 15.1.151–15.1.152)
export function rovarKampe(L: VarldRad): Uppstallning['kampar'][number] {
  const st = { styrka: mitt(ROVARE.styrka), uthallighet: mitt(ROVARE.uthallighet), mod: mitt(ROVARE.mod), smidighet: mitt(ROVARE.smidighet), skicklighet: Math.max(5, mitt(ROVARE.skicklighet)) };
  const u = radUtrustning(L);
  return { id: 0, namn: 'Rövare', sida: 1, gast: 1, vapen: u.vapen, klader: [...u.klader], skold: u.skold, skoldJarn: u.skoldJarn, fart: 1, x: 0, y: 0, st };
}
const vargVarde = () => stridsvardeAv(djurKampe('varg', 0, 1, 0, 0));

VAGHANDELSER.ran = {
  namn: 'Rån', dygn: VAGRAN.dygn,
  risk: (s, sl) => lagerNara(s, sl).reduce((a, x) => a + x[1], 0),
  gor: (s, sl, t) => {
    const nara = lagerNara(s, sl);
    if (!nara.length || !resenarer(s, sl).length) return;
    let x = rnd(s, 'resa') * nara.reduce((a, q) => a + q[1], 0), L = nara[0][0];
    for (const [r, f] of nara) { x -= f; if (x <= 0) { L = r; break; } }
    const n = Math.min(L.tal.folk, Math.max(BYANFALL.minst, flockStorlek(L)));
    if (n <= 0) return;
    const krav = Math.min(packVarde(sl), n * VAGRAN.krav), val = basta(vagValen(s, sl, flockKraft(n, radVarde(L)), krav));
    count(s, 'resa rån'); count(s, `resa rån ${val}`);
    const ge = (tog: [string, number][]) => { for (const [k, m] of tog) radTar(L, k, m); VAKTKROK.ranad(s, sl, L, t); VAKTKROK.forlorat(s, sl, L, tog); }; // bytet går till lägret, och det värdefulla vaktas där (steg 11.13.27)
    if (val === 'betala') {
      const tog = taUrPack(sl, krav); ge(tog);
      dagbok(s, sl, 'ran', `${stor(heltOrd(n))} rövare från ${L.namn} stoppade sällskapet. De betalade ${tog.length ? lista(tog) : 'inget, för de hade inget'} och fick gå.`, t);
      return;
    }
    if (val === 'fly' && rnd(s, 'resa') < flyChans(s, sl)) {
      sl.forlorat = (sl.forlorat ?? 0) + VAGRAN.flyTim;
      dagbok(s, sl, 'ran', `${stor(heltOrd(n))} rövare från ${L.namn} kom emot sällskapet. De flydde och kom undan, men förlorade ${VAGRAN.flyTim} timmar.`, t);
      return;
    }
    const u = vagStrid(s, sl, Array.from({ length: n }, () => rovarKampe(L)), 'rovare', t);
    radDoda(L, u.doda);
    if (u.vann) { dagbok(s, sl, 'strid', `${stor(heltOrd(n))} rövare från ${L.namn} anföll${val === 'fly' ? ' när sällskapet försökte fly' : ''}. Sällskapet slog dem tillbaka${u.doda ? ` och ${u.doda} rövare dog` : ''}.`, t); return; }
    const tog = taUrPack(sl, (n - u.doda) * BYANFALL.bar); ge(tog);
    dagbok(s, sl, 'strid', `${stor(heltOrd(n))} rövare från ${L.namn} anföll och vann striden. De tog ${tog.length ? lista(tog) : 'inget'}.`, t);
  },
};

VAGHANDELSER.rovdjur = {
  namn: 'Rovdjur', dygn: VAGRAN.varg,
  risk: (s, sl) => { const vl = s.varld; return (vl && sl.ruta !== undefined && ledKlass(vl, sl.ruta) === 'obanad' ? VAGRAN.vargObanad : 1) * (iIstiden(ageIndex(s)) ? VAGRAN.vargIstid : 1); },
  gor: (s, sl, t) => {
    if (!resenarer(s, sl).length) return;
    const n = Math.round(VAGRAN.vargar[0] + rnd(s, 'resa') * (VAGRAN.vargar[1] - VAGRAN.vargar[0]));
    const mat = Object.keys(sl.pack).filter(k => FOOD.includes(k)).reduce((a, k) => a + Math.floor(sl.pack[k] ?? 0), 0);
    const krav = n * VAGRAN.vargMat, val = basta({ ...vagValen(s, sl, flockKraft(n, vargVarde()), krav * 2), ...(mat < krav ? { betala: Infinity } : {}) });
    count(s, 'resa rovdjur'); count(s, `resa rovdjur ${val}`);
    if (val === 'betala') {
      const tog: [string, number][] = []; let kvar = krav;
      for (const k of Object.keys(sl.pack).filter(k => FOOD.includes(k)).sort()) { const m = Math.min(kvar, Math.floor(sl.pack[k] ?? 0)); if (m > 0) { tappa(sl, k, m); tog.push([k, m]); kvar -= m; } }
      dagbok(s, sl, 'ran', `${stor(heltOrd(n))} vargar följde sällskapet. De kastade ${lista(tog)} åt dem och kom undan.`, t);
      return;
    }
    if (val === 'fly' && rnd(s, 'resa') < flyChans(s, sl)) {
      sl.forlorat = (sl.forlorat ?? 0) + VAGRAN.flyTim;
      dagbok(s, sl, 'ran', `${stor(heltOrd(n))} vargar kom emot sällskapet. De tog en omväg och förlorade ${VAGRAN.flyTim} timmar.`, t);
      return;
    }
    const u = vagStrid(s, sl, Array.from({ length: n }, (_, j) => djurKampe('varg', j, 1, 0, 0)), 'varg', t);
    dagbok(s, sl, 'strid', `${stor(heltOrd(n))} vargar anföll sällskapet. ${u.vann ? `De drev bort dem${u.doda ? ` och dödade ${heltOrd(u.doda)}` : ''}.` : 'Vargarna vann striden.'}`, t);
  },
};
