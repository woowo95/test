// Kroppen och graven (steg 8.5.1, 8.5.6 och 8.5.7): det som görs med en död. Det som blir kvar av en människa står i kvarlevor.ts.
import { GRANNAR4, H, HOUR, Person, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { byId, count, living, log, think } from './folk';
import { rnd } from './slump';
import { getMap } from './karta';
import { groundOf } from './mark';
import { ledig } from './stationer';
import { omrade, utanforByn } from './omrade';
import { freeTools, newTing, take } from './agande';
import { GA_TID } from './paborjat';
import { KULT } from './kult';
import { nyRitual } from './kultlatt';
import { Grav, GravStil, GravVard, Kvarleva, gravAt, kvarById, nara } from './kvarlevor';
import { BUD, BudId, KYRKA, budIn, foljer, harBud } from './kyrka';
import { SkalaId, Tro, rymsBud, skalaV, troOf } from './religion';
import { amountOf, put } from './lager';
import { SAKER } from './saker';
import { kladAv } from './klader';
import { getable, takeMaterial } from './behov';
import { RECEPT } from './recept';
import { knows } from './teknik';
import { RYKTE, ryktbarhet } from './rykten';
import { ALDER, ageOf } from './folk';

// ---------- kroppen och graven (steg 8.5.1) ----------
// kroppen ligger kvar där personen dog. En vuxen, helst någon nära, bär den till gravplatsen och gräver (nivån Rädda i arbetsordningen). Grävandet
// går fortare med spade. Graven är en ruta (10.1.3 bygger vidare på den). Tron ger stilen och samlingen vid graven (ritualerna, kult.ts)
export const GRAV = balans('grav', {
  handTim: 3, spadeTim: 1, // så länge det tar att gräva för hand och med spade
  avst: 5, // gravplatsen ligger så här långt utanför byn
  nara: 0.5, annan: 0.15, // chansen att det blir den som stod den döda nära, och någon annan, när valet kommer
  vard: 0.4, vardAnnan: 0.5, // vikten för att göra vården på en grav när byn har det den behöver, och för den som minns hen utan att ha stått hen nära (steg 10.4.2)
});
export const gravarOf = (s: State): Grav[] => (s.gravar ??= []);
// var graven hamnar: byns gravplats, samlad lite utanför byn, eller trons eget ställe (steg 8.5.7): vid den heliga platsen, vid vattnet eller i skogsbrynet
export function gravPlats(s: State, tr: Tro | undefined): { x: number; y: number } {
  const pl = (s.gravplatser ??= {}), key = tr && tr.gravSlag ? `t${tr.id}` : 'by';
  if (!pl[key]) {
    const hp = tr?.gravSlag === 'helig' ? s.heliga?.find(h => h.tro === tr.id) : undefined;
    pl[key] = hp ? { x: hp.x + 1, y: hp.y + 1 } : sokPlats(s, tr?.gravSlag === 'vatten');
  }
  const c = pl[key];
  for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = c.x + dx, y = c.y + dy;
    if ((Math.abs(dx) === r || Math.abs(dy) === r) && (dx + dy) % 2 === 0 && inMap(x, y) && !gravAt(s, x, y) && ledig(s, x, y)) return { x, y };
  }
  return c;
}
function sokPlats(s: State, vatten: boolean) {
  const o = omrade(s), m = getMap(s.seed); let best = { x: o.x1 + GRAV.avst, y: o.y1 }, bs = Infinity;
  for (let y = Math.max(1, o.y0 - 10); y < Math.min(H - 1, o.y1 + 10); y += 2) for (let x = Math.max(1, o.x0 - 10); x < Math.min(W - 1, o.x1 + 10); x += 2) {
    if (!ledig(s, x, y)) continue;
    const d = Math.abs(utanforByn(s, x, y) - GRAV.avst) + (vatten && !GRANNAR4.some(([a, b]) => m.tiles[(y + b * 2) * W + x + a * 2] === T.Vatten) ? 6 : 0);
    if (d < bs) { bs = d; best = { x, y }; }
  }
  return best;
}
// stilen, efter trons skalor (steg 8.5.6)
function gravStil(tr: Tro | undefined): GravStil {
  if (!tr) return 'jord';
  const natur = tr.natur, fest = skalaV(tr, 'fest') ?? 50;
  if (natur < 40 && 100 - fest > 50) return 'bal';
  if (natur < 40 && tr.gravSlag === 'vatten') return 'vatten';
  return 'jord';
}
// en rad i arbetsordningen: någon bär en död till graven, helst någon nära (steg 8.5.1)
export function begravaVal(s: State, p: Person) {
  const ledig = (k: Kvarleva) => k.bars === undefined && !living(s).some(o => o !== p && (o.task?.act === 'begrava' || o.task?.act === 'grava') && o.task.ref === k.id);
  // den fallne fienden begravs (steg 10.3.23): av den som följer budet, när fienden är avrustad
  const q = s.kvarlevor?.find(k => k.k === 'kropp' && ledig(k)) ?? (harBud(s, p, 'begravFiende') ? s.kvarlevor?.find(k => k.k === 'fiende' && ledig(k) && !avrustbart(s, p, k)) : undefined);
  if (!q || rnd(s, 'val', p) >= (nara(s, p, q.vem) ? GRAV.nara : GRAV.annan)) return undefined;
  return { spot: { x: q.x + 0.5, y: q.y + 0.5 }, ref: q.id, why: `Bär ${q.namn} till graven` };
}
// framme vid kroppen: hen tas upp och bärs till platsen där graven ska vara
export function kroppUpp(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return;
  q.bars = p.id;
  const d = q.k === 'fiende' ? undefined : byId(s, q.vem), tr = q.k === 'fiende' ? troOf(s, p.tro) : d?.brottsling ? undefined : troOf(s, d?.tro), at = gravPlats(s, tr), spade = freeTools(s, p, 'benspade') > 0;
  t.act = 'grava'; t.phase = 'go'; t.tx = at.x + 0.5; t.ty = at.y + 0.5; t.why = `Gräver en grav åt ${q.namn}`;
  t.until = s.now + (spade ? GRAV.spadeTim : GRAV.handTim) * HOUR + GA_TID; t.arbTid = (spade ? GRAV.spadeTim : GRAV.handTim) * HOUR;
  t.tool = spade ? 'benspade' : undefined; if (spade) take(s, p, 'benspade');
}
// graven är klar: kroppen är borta, och är den döde troende samlas trosfränderna (steg 8.5.6). Den som dog som brottsling begravs ovärdigt (steg 8.4.8)
export function gravKlar(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return;
  s.kvarlevor = s.kvarlevor!.filter(k => k !== q);
  if (q.k === 'fiende') { // fienden får en grav på trons gravplats, utan samling (steg 10.3.23)
    const tr = troOf(s, p.tro), x = Math.floor(p.x), y = Math.floor(p.y);
    gravarOf(s).push({ x, y, t: s.now, vem: q.vem, namn: q.namn, stil: 'jord', fiende: true, ...(tr ? { tro: tr.id } : {}) });
    count(s, 'grav'); count(s, 'grav_fiende'); groundOf(s).cover[y * W + x] = 0;
    if (tr) p.troStyrka = Math.min(100, (p.troStyrka ?? 0) + KYRKA.kravTro);
    think(p, `Begravde fienden ${q.namn}`, 0, s.now, 6 * HOUR);
    log(s, `${p.name} begravde fienden ${q.namn}.`, 'rel', [p.id]);
    return;
  }
  const d = byId(s, q.vem), ovardig = !!d?.brottsling, tr = ovardig ? undefined : troOf(s, d?.tro), stil = gravStil(tr), x = Math.floor(p.x), y = Math.floor(p.y);
  if (stil === 'bal' && amountOf(s, 'ved') >= KULT.bal) takeMaterial(s, p, 'ved', KULT.bal);
  const stor = !ovardig && !!d && storDod(s, d, tr);
  if (tr && !ovardig) vardSed(s, tr, stor); // trons första begravning ger vården som sed (steg 10.4.2)
  if (stil !== 'vatten') gravarOf(s).push({ x, y, t: s.now, vem: q.vem, namn: q.namn, stil, ...(tr ? { tro: tr.id } : {}), ...(ovardig ? { ovardig: true as const } : {}), ...(q.med ? { med: q.med } : {}), ...(stor ? { stor: true as const } : {}) });
  count(s, 'grav'); count(s, 'grav_' + stil); groundOf(s).cover[y * W + x] = 0;
  think(p, `Begravde ${q.namn}`, -0.02, s.now, 6 * HOUR);
  if (tr && !ovardig) { nyRitual(s, 'begravning', { tro: tr.id, x, y, om: [q.vem], namn: `Begravningen av ${q.namn}` }); (s.troSkalor?.includes('livet') ? 0 : count(s, 'livet_oppen')); if (tr.gravSlag === undefined) tr.gravSlag = trosGrav(s, tr); }
  else if (stil === 'jord' && !ovardig) log(s, `${p.name} begravde ${q.namn}.`, 'rel', [p.id]);
}
// avrusta den fallne (steg 8.7.5 och 10.3.6): en vuxen tar det fienden hade, 2 minuter per sak, och bär hem det. Bytet hen tagit från byn
// (saker) tar vem som helst. Fiendens egna vapen och plagg (ting, med kvalitet och slitage) rör inte den som följer budet om orena saker
const orena = (s: State, p: Person) => { const tr = troOf(s, p.tro); return budIn(tr, 'orena') && foljer(p, 'orena'); };
const avrustbart = (s: State, p: Person, k: Kvarleva) => (k.saker ? Object.values(k.saker).reduce((a, b) => a + b, 0) : 0) + (k.ting && !orena(s, p) ? k.ting.length : 0);
export function avrustaVal(s: State, p: Person) {
  const q = s.kvarlevor?.find(k => k.k === 'fiende' && avrustbart(s, p, k) > 0 && !living(s).some(o => o !== p && o.task?.act === 'avrusta' && o.task.ref === k.id));
  if (!q) return undefined;
  return { spot: { x: q.x + 0.5, y: q.y + 0.5 }, ref: q.id, min: 2 * avrustbart(s, p, q), why: `Tar hand om det ${q.namn} bar` };
}
export function avrustaKlar(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q || !avrustbart(s, p, q)) return;
  for (const [k, n] of Object.entries(q.saker ?? {})) { if (SAKER[k]?.redskap) for (let i = 0; i < n; i++) newTing(s, k, 1, -1); else put(s, k, n); }
  if (q.ting && !orena(s, p)) { for (const g of q.ting) { const ny = newTing(s, g.k, g.c, -1); if (g.q !== undefined) ny.q = g.q; if (g.ber) ny.ber = g.ber; } q.ting = undefined; }
  q.saker = undefined; count(s, 'avrustad');
  think(p, 'Tog det en fallen fiende bar', -0.02, s.now, 6 * HOUR);
}
// byta om inför strid (steg 8.7.8): när larmet går hämtar var och en sin rustning. Vid en överraskning hinner man inte
export function rustaVal(s: State, p: Person) {
  if (!p.larm || s.now - p.larm.t > HOUR || p.task?.act === 'strid' || [s.rovare, ...(s.rovareFler ?? [])].some(f => f && Math.hypot(f.x - p.x, f.y - p.y) < 6)) return undefined;
  const t = (s.ting ?? []).find(q => { const pl = kladAv(q.k)?.plagg; return (pl === 'rustning' || pl === 'hjalm') && q.helig === undefined && q.bar === undefined && q.hos === undefined && q.lass === undefined && (q.agare === p.id || q.agare === undefined || q.agare < 0) && q.x !== undefined; });
  return t ? { spot: { x: t.x! + 0.5, y: t.y! + 0.5 }, ref: t.id, why: 'Hämtar sin rustning inför striden' } : undefined;
}
export function rustaKlar(s: State, p: Person, t: Task) {
  const q = (s.ting ?? []).find(o => o.id === t.ref);
  if (q && q.bar === undefined) { q.bar = p.id; q.x = q.y = q.vid = undefined; count(s, 'rustad'); }
}
// trons gravplats bestäms när den första begravs (steg 8.5.7), efter skalorna
const trosGrav = (s: State, tr: Tro): Tro['gravSlag'] => s.heliga?.some(h => h.tro === tr.id) ? 'helig' : tr.natur < 30 ? 'vatten' : tr.natur < 50 ? 'bryn' : 'by';

// ---------- gravarnas utseende (steg 10.4.2) ----------
// graven är först en jordhög. Sedan gör någon som minns den döda vården: en rad i GRAVAR. Vilken är ett bud i den dödas tro (BUD, grupperna
// gravvard och storagrav), och utan tro en gravbräda, eller en gravstolpe innan byn har plankor
export interface GravRad { namn: string; mat: Record<string, number>; min: number; bud: BudId; skalor: [SkalaId, 0 | 1][]; stora?: true }
export const GRAVAR: Record<GravVard, GravRad> = {
  gravstolpe: { namn: 'Gravstolpe', mat: { virke: 1 }, min: 4, bud: 'gravStolpe', skalor: [['natur', 0]] },
  gravbrada: { namn: 'Gravbräda', mat: { plankor: 1 }, min: 3, bud: 'gravBrada', skalor: [['natur', 1]] },
  stockram: { namn: 'Stockram', mat: { virke: 2 }, min: 5, bud: 'stockram', skalor: [['oppen', 1]] },
  gravhus: { namn: 'Gravhus', mat: { virke: 2, plankor: 2 }, min: 12, bud: 'gravhus', skalor: [['livet', 1]] },
  gravhog: { namn: 'Gravhög', mat: {}, min: 20, bud: 'gravhog', skalor: [['livet', 1], ['fest', 0]], stora: true },
  // stengravarna (steg 10.4.3): med stenhuggarplatsen. Stenen tas när arbetet börjar, och arbetet vid graven är ristningen
  gravsten: { namn: 'Gravsten', mat: { huggen_sten: 1 }, min: 5, bud: 'gravsten', skalor: [['natur', 1]] },
  stensattning: { namn: 'Stensättning', mat: { sten: 6, huggen_sten: 1 }, min: 12, bud: 'stensattning', skalor: [['oppen', 1]] },
  skeppssattning: { namn: 'Skeppssättning', mat: { sten: 12, huggen_sten: 2 }, min: 20, bud: 'skeppssattning', skalor: [['livet', 1], ['fest', 0]], stora: true },
};
const VARDER = Object.keys(GRAVAR) as GravVard[];
const grupp = (k: GravVard) => GRAVAR[k].stora ? 'storagrav' : 'gravvard';
// byn har materialet eller kan göra det: någon kan receptet eller sättet att skaffa det
const kanSkaffa = (s: State, k: string, n: number) => amountOf(s, k) >= n || (() => { const tek = (RECEPT as Record<string, { tek?: string }>)[k]?.tek ?? SAKER[k]?.skaffa?.tek; return !tek || living(s).some(p => knows(p, tek)); })();
const kanGora = (s: State, k: GravVard) => Object.entries(GRAVAR[k].mat).every(([m, n]) => kanSkaffa(s, m, n));
// hur långt tron står mot radens sidor: medel över skalorna som låsts upp, -1 till 1 (undefined när ingen är upplåst)
function drag(tr: Tro, k: GravVard) {
  let sum = 0, n = 0;
  for (const [sk, sida] of GRAVAR[k].skalor) { const v = skalaV(tr, sk); if (v === undefined) continue; sum += sida === 0 ? (50 - v) / 50 : (v - 50) / 50; n++; }
  return n ? sum / n : undefined;
}
const matSum = (k: GravVard) => Object.values(GRAVAR[k].mat).reduce((a, b) => a + b, 0);
// den döda är stor: har varit ledare, är trons helgon eller en legend med gott anseende
function storDod(s: State, d: Person, tr: Tro | undefined) {
  if (d.ledde || tr?.helgon?.some(h => h.id === d.id)) return true;
  const { r, a } = ryktbarhet(s, d.id); return r >= RYKTE.legend && a >= 0;
}
// vid begravningen: har tron inget bud i gruppen blir den möjliga raden som drar mest dess sed, utan omröstning. Lika: den som kräver mest, sedan det större budet
function vardSed(s: State, tr: Tro, stor: boolean) {
  for (const g of stor ? ['gravvard', 'storagrav'] : ['gravvard']) {
    if (tr.bud?.some(b => (BUD as Record<string, { grupp?: string }>)[b.id]?.grupp === g)) continue;
    let best: GravVard | undefined, bd = 0;
    for (const k of VARDER) {
      if (grupp(k) !== g || !kanGora(s, k) || !rymsBud(s, tr, BUD[GRAVAR[k].bud].storlek)) continue;
      const dr = drag(tr, k); if (dr === undefined || dr <= 0) continue;
      const battre = !best || dr > bd + 1e-9 || (Math.abs(dr - bd) <= 1e-9 && (matSum(k) > matSum(best) || (matSum(k) === matSum(best) && BUD[GRAVAR[k].bud].storlek > BUD[GRAVAR[best].bud].storlek)));
      if (battre) { best = k; bd = dr; }
    }
    if (!best) continue;
    const b = { id: GRAVAR[best].bud, t: s.now }; (tr.bud ??= []).push(b); count(s, 'gravsed');
    log(s, `${GRAVAR[best].namn} blev sed i tron när den första begravdes.`, 'world', []);
  }
}
// vården graven ska få: trons bud, och utan tro (eller utan bud) en gravsten när byn har en huggen sten (steg 10.4.3), annars en gravbräda, eller en gravstolpe innan byn har plankor. En ovärdig grav och fiendens får ingen
export function vardFor(s: State, g: Grav): GravVard | undefined {
  if (g.vard || g.ovardig || g.fiende || g.stil === 'bal') return undefined;
  const tr = g.tro !== undefined ? troOf(s, g.tro) : undefined, ur = (gr: string) => { const b = tr?.bud?.find(q => (BUD as Record<string, { grupp?: string }>)[q.id]?.grupp === gr); return b && VARDER.find(k => GRAVAR[k].bud === b.id); };
  return (g.stor ? ur('storagrav') : undefined) ?? ur('gravvard') ?? (amountOf(s, 'huggen_sten') >= 1 ? 'gravsten' : kanGora(s, 'gravbrada') ? 'gravbrada' : 'gravstolpe');
}
// den som minns den döda (ett intryck av hen, eller stod hen nära)
const minns = (s: State, p: Person, vem: number) => nara(s, p, vem) ? 1 : p.intryck?.some(e => e.om === vem) ? GRAV.vardAnnan : 0;
// en rad i förbättringarna (val.ts): en vuxen gör vården på en grav hen minns, när materialet finns
export function gravvardVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !s.gravar?.length) return undefined;
  let best: { g: Grav; k: GravVard; w: number } | undefined;
  for (const g of s.gravar) {
    const w = minns(s, p, g.vem); if (!w || (best && w <= best.w)) continue;
    const k = vardFor(s, g); if (!k || !Object.entries(GRAVAR[k].mat).every(([m, n]) => getable(s, p, m) >= n)) continue;
    if (living(s).some(o => o !== p && o.task?.act === 'gravvard' && o.task.ref === g.vem)) continue;
    best = { g, k, w };
  }
  if (!best) return undefined;
  const { g, k } = best;
  return { w: best.w, uppgift: { act: 'gravvard' as const, text: `Gör en ${GRAVAR[k].namn.toLowerCase()} på ${g.namn}s grav.`, min: GRAVAR[k].min, tool: k, spot: { x: g.x + 0.5, y: g.y + 0.5 }, ref: g.vem } };
}
// framme vid graven: materialet tas när arbetet börjar; saknas det står jordhögen kvar
export function gravvardBorja(s: State, p: Person, t: Task) {
  if (t.prog !== undefined) return;
  t.prog = 0;
  const k = t.tool as GravVard, g = s.gravar?.find(q => q.vem === t.ref && !q.vard);
  if (!g || !GRAVAR[k] || !Object.entries(GRAVAR[k].mat).every(([m, n]) => getable(s, p, m) >= n)) { p.task = undefined; return; }
  for (const [m, n] of Object.entries(GRAVAR[k].mat)) takeMaterial(s, p, m, n, true);
}
export function gravvardKlar(s: State, p: Person, t: Task) {
  const k = t.tool as GravVard, g = s.gravar?.find(q => q.vem === t.ref && !q.vard);
  if (!g || !GRAVAR[k]) return;
  g.vard = k; count(s, 'gravvard'); count(s, 'gravvard_' + k);
  think(p, `Gjorde en ${GRAVAR[k].namn.toLowerCase()} åt ${g.namn}`, 0.02, s.now, 6 * HOUR);
  log(s, `${p.name} gjorde en ${GRAVAR[k].namn.toLowerCase()} på ${g.namn}s grav.`, 'rel', [p.id]);
}
