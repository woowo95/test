import { enOrd } from './ord';
// Kroppen och graven (steg 8.5.1, 8.5.6 och 8.5.7): det som görs med en död. Det som blir kvar av en människa står i kvarlevor.ts.
import { DAY, H, HOUR, MIN, Person, SEC, State, T, Task, W, inMap } from './typer';
import { balans } from './balans';
import { byId, count, isParent, living, log, relKey, think } from './folk';
import { rnd } from './slump';
import { getMap } from './karta';
import { sjoVid } from './sjo';
import { groundOf, isForest } from './mark';
import { ledig } from './stationer';
import { omrade, utanforByn } from './omrade';
import { freeTools, newTing, take } from './agande';
import { GA_TID } from './paborjat';
import { nyRitual } from './kultlatt';
import { hourOf } from './tid';
import { Grav, GravStil, GravVard, KVAR, Kvarleva, gravAt, kroppKrok, kvarById, nara, sagSkandad } from './kvarlevor';
import { BEGR_TAL, BUD, BudId, KYRKA, budBrutet, budIn, foljer, foljerStorlek, harBud, satSkand } from './kyrka';
import { SkalaId, Tro, rymsBud, skalaV, troOf } from './religion';
import { amountOf, harTillHands, put } from './lager';
import { SAKER } from './saker';
import { kladAv } from './klader';
import { getable, takeMaterial } from './behov';
import { RECEPT } from './recept';
import { knows } from './teknik';
import { Bevis, HANDELSER, RYKTE, bevisText, intryckStyrka, paminn, ryktbarhet } from './rykten';
import { grundvarde } from './varde';
import { gen, slaktOrd } from './ord';
import { ALDER, ageOf } from './folk';

// ---------- kroppen och graven (steg 8.5.1) ----------
// kroppen ligger kvar där personen dog. En vuxen, helst någon nära, bär den till gravplatsen och gräver (nivån Rädda i arbetsordningen). Grävandet
// går fortare med spade. Graven är en ruta (10.1.3 bygger vidare på den). Tron ger stilen och samlingen vid graven (ritualerna, kult.ts)
export const GRAV = balans('grav', {
  handMin: 3, spadeMin: 2, // så många minuter (i verkligheten) det tar att gräva för hand och med spade (en stor sak)
  avst: 5, // gravplatsen ligger så här långt utanför byn
  naraTim: 0.5, annanTim: 2, // så länge det i medel dröjer innan den som stod den döda nära, och någon annan, vill bära hen till graven (timmar, steg 10.4.5)
  vard: 0.4, vardAnnan: 0.5, // vikten för att göra vården på en grav när byn har det den behöver, och för den som minns hen utan att ha stått hen nära (steg 10.4.2)
});
export const gravarOf = (s: State): Grav[] => (s.gravar ??= []);
// ---------- vad som görs med en död (steg 10.4.7) ----------
// registret ODEN: en rad per sätt, med var kroppen läggs och vad som blir kvar. Utan tro får byns egna och gäster en grav, brottslingen
// en ovärdig grav på en egen plats, och den fallne fienden bärs ut i skogen och läggs ner där (kroppen ligger kvar och ruttnar som förut)
// Skändningarna (steg 10.4.13) är fyra rader till: tron väljer en efter sina skalor när budet skanda antas och behåller den
export type OdeId = 'grav' | 'ovardig' | 'skogen' | SkandId;
export type SkandId = 'djuren' | 'balRit' | 'vattnet' | 'stigen';
export interface OdeRad { namn: string; grav: boolean; avst?: number; min?: number; ved?: number; skalor?: [SkalaId, 0 | 1][]; vatten?: true; kvar?: true }
export const ODEN: Record<OdeId, OdeRad> = {
  grav: { namn: 'Grav', grav: true },
  ovardig: { namn: 'Ovärdig grav', grav: true, avst: 2 * GRAV.avst }, // rutor utanför byns område
  skogen: { namn: 'Skogen', grav: false, avst: 8, min: 2 }, // närmaste skogsruta så här långt utanför byns område; minuter att lägga ner kroppen
  // skändningarna: kvar = kroppen ligger kvar som en skändad kropp (KVARLEVOR), annars blir inget kvar
  djuren: { namn: 'Åt djuren', grav: false, avst: 1, min: 2, skalor: [['natur', 0]], kvar: true }, // strax utanför byns område
  balRit: { namn: 'Bål utan rit', grav: false, avst: 1, min: 2, ved: 4, skalor: [['natur', 1]] }, // saknas veden blir det åt djuren
  vattnet: { namn: 'Vattnet', grav: false, min: 2, skalor: [['natur', 0]], vatten: true }, // närmaste strand; den skändade står inte bland de sänkta
  stigen: { namn: 'Vid stigen', grav: false, min: 2, skalor: [['krig', 1], ['oppen', 1]], kvar: true }, // där vägen in till byn korsar byns kant
};
const SKAND: SkandId[] = ['djuren', 'balRit', 'vattnet', 'stigen'];
export const arSkand = (o: OdeId | undefined): o is SkandId => !!o && (SKAND as string[]).includes(o);
// skändningen trons skalor drar mest mot (vattnet bara när byn har vatten nära); lika: den första i listan
function skandFor(s: State, tr: Tro): SkandId {
  let best: SkandId = 'djuren', bd = -Infinity;
  for (const k of SKAND) { const r = ODEN[k]; if (r.vatten && !vattenNara(s)) continue; const d = radDrag(tr, { grupp: '', bud: 'skanda', namn: r.namn, skalor: r.skalor!, mat: {} }) ?? -Infinity; if (d > bd + 1e-9) { best = k; bd = d; } }
  return best;
}
satSkand(skandFor, v => ODEN[v as OdeId]?.namn ?? String(v));
// vad den som tar hand om kroppen gör med den (steg 10.3.23, 10.4.7 och 10.4.13): hen följer sin egen tros bud. Den som har budet men inte
// följer det (för svag tro; den som stod den döda nära räknar budet en storlek större) gör som utan bud och bryter då budet (brot)
export function odeVal(s: State, p: Person, q: Kvarleva): { ode: OdeId; brot?: BudId } {
  const tr = troOf(s, p.tro), d = q.k === 'fiende' ? undefined : byId(s, q.vem), nar = !!d && nara(s, p, d.id);
  const har = (id: BudId) => budIn(tr, id), fol = (id: BudId) => foljerStorlek(p, Math.min(4, BUD[id].storlek + (nar ? 1 : 0)));
  let brot: BudId | undefined;
  // bud som säger något om den här döda: följer hen det blir det budets rad, annars som utan bud och budet bryts
  const bud = (id: BudId, ode: () => OdeId): OdeId | undefined => { if (!har(id)) return undefined; if (fol(id)) return ode(); brot ??= id; return undefined; };
  const gast = q.k === 'framling' || (!!d?.gast), r = d && !gast ? ryktbarhet(s, d.id) : undefined;
  const okand = !!r && r.r >= RYKTE.legend && r.a < 0, ovardig = q.k === 'fiende' || !!d?.brottsling || okand;
  const ode = (ovardig ? bud('skanda', () => skandAv(tr!)) : undefined)
    ?? (q.k === 'fiende' ? bud('begravFiende', () => 'grav') ?? 'skogen'
      : d?.brottsling ? 'ovardig'
      : gast ? bud('egnaGrav', () => 'skogen') ?? 'grav'
      : r && r.a < 0 ? bud('gottNamn', () => 'skogen') ?? 'grav'
      : 'grav');
  return { ode, ...(brot ? { brot } : {}) };
}
export const odeFor = (s: State, p: Person, q: Kvarleva) => odeVal(s, p, q).ode;
const skandAv = (tr: Tro): SkandId => { const v = tr.bud?.find(b => b.id === 'skanda')?.v; return arSkand(v as OdeId) ? v as SkandId : 'djuren'; };
// skogen: närmaste skogsruta minst ODEN.skogen.avst utanför byns område, räknat från kroppen; finns ingen räcker närmaste lediga ruta på det avståndet
function skogsPlats(s: State, x0: number, y0: number, ut = ODEN.skogen.avst!, skog = true) {
  let ledigt: { x: number; y: number } | undefined;
  for (let r = 0; r < Math.max(W, H); r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      const x = x0 + dx, y = y0 + dy;
      if (!inMap(x, y) || !ledig(s, x, y) || utanforByn(s, x, y) < ut) continue;
      if (!skog || isForest(s, y * W + x)) return { x, y };
      ledigt ??= { x, y };
    }
    if (ledigt && r > 2 * ut) return ledigt;
  }
  return ledigt ?? { x: x0, y: y0 };
}

// ---------- gravplatsen (steg 10.4.6) ----------
// var graven hamnar: en rad i GRAVPLATSER, ett bud i gruppen gravplats. Varje rad säger vad som drar, vad kartan måste ha och en kostnad
// per ruta, och sökningen tar rutan med lägst kostnad. Utan tro (eller utan bud) byns egen gravplats nära byn. Avståndet märks bara som gångtid
export type PlatsId = 'nara' | 'bryn' | 'sjo' | 'djup' | 'langt' | 'helig';
export interface PlatsRad { namn: string; bud: BudId; skalor: [SkalaId, 0 | 1][]; avst: number; minAvst?: number; vatten?: true; skog?: [number, number]; helig?: true }
export const GRAVPLATSER: Record<PlatsId, PlatsRad> = {
  nara: { namn: 'Nära byn', bud: 'gravNara', skalor: [['natur', 1]], avst: GRAV.avst },
  bryn: { namn: 'I skogsbrynet', bud: 'gravBryn', skalor: [['natur', 0]], avst: GRAV.avst, skog: [4, 12] }, // av de 25 rutorna runt
  sjo: { namn: 'Nära sjön', bud: 'gravSjo', skalor: [['natur', 0]], minAvst: 20, avst: GRAV.avst, vatten: true }, // vatten inom 2 rutor
  djup: { namn: 'Djupt i skogen', bud: 'gravDjup', skalor: [['natur', 0], ['oppen', 1]], avst: 10, skog: [20, 25] },
  langt: { namn: 'Långt från byn', bud: 'gravLangt', skalor: [['forlat', 1]], avst: 15 },
  helig: { namn: 'Vid den heliga platsen', bud: 'gravHelig', skalor: [], avst: 0, helig: true }, // bredvid den; går före de andra när tron har en
};
const PLATSER = Object.keys(GRAVPLATSER) as PlatsId[];
// trons gravplats: budet som sparades på kroppen, annars trons bud nu
const platsAv = (tr: Tro | undefined, bud?: string[]): PlatsId | undefined => {
  const ids = bud ?? tr?.bud?.map(b => b.id) ?? [];
  return tr ? PLATSER.find(k => ids.includes(GRAVPLATSER[k].bud)) : undefined;
};
const heligFor = (s: State, tr: Tro) => s.heliga?.find(h => h.tro === tr.id && !h.skandad); // (en vanhelgad plats har förlorat sitt bud, steg 10.3.10)
export function gravPlats(s: State, tr: Tro | undefined, bud?: string[]): { x: number; y: number } {
  const k = platsAv(tr, bud), pl = (s.gravplatser ??= {}), key = !k || k === 'nara' ? 'by' : `t${tr!.id}${k}`;
  if (!pl[key]) {
    const hp = k === 'helig' ? heligFor(s, tr!) : undefined;
    const { x, y } = hp ? { x: hp.x + 1, y: hp.y + 1 } : sokPlats(s, GRAVPLATSER[k && k !== 'helig' ? k : 'nara']);
    if (k === 'helig' && !hp) return ledigGrav(s, { x, y }); // ingen helig plats än: graven läggs vid byn, och platsen sparas först när den heliga finns
    pl[key] = { x, y };
  }
  return ledigGrav(s, pl[key]);
}
// den ovärdiga graven (steg 10.4.7): en egen plats dubbelt så långt ut som byns gravplats
function ovardigPlats(s: State) {
  const pl = (s.gravplatser ??= {});
  if (!pl.ovardig) { const { x, y } = sokPlats(s, { ...GRAVPLATSER.nara, avst: ODEN.ovardig.avst! }); pl.ovardig = { x, y }; }
  return ledigGrav(s, pl.ovardig);
}
// gravarna läggs intill varandra: den första lediga rutan i ringar runt platsens mitt
function ledigGrav(s: State, c: { x: number; y: number }) {
  for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = c.x + dx, y = c.y + dy;
    if ((Math.abs(dx) === r || Math.abs(dy) === r) && (dx + dy) % 2 === 0 && inMap(x, y) && !gravAt(s, x, y) && ledig(s, x, y)) return { x, y };
  }
  return c;
}
// de 25 rutorna runt: hur många som är skog, och om det finns vatten inom 2 rutor
function runt(s: State, x: number, y: number) {
  const m = getMap(s.seed); let skog = 0, vatten = false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = x + dx, yy = y + dy; if (!inMap(xx, yy)) continue;
    const i = yy * W + xx; if (isForest(s, i)) skog++; if (m.tiles[i] === T.Vatten) vatten = true;
  }
  return { skog, vatten };
}
// rutan med lägst kostnad för raden; ok när den har det kartan måste ha
function sokPlats(s: State, r: PlatsRad) {
  const o = omrade(s), ut = r.avst + 5; let best = { x: Math.min(W - 2, o.x1 + r.avst), y: o.y1 }, bs = Infinity, ok = false;
  for (let y = Math.max(1, o.y0 - ut); y < Math.min(H - 1, o.y1 + ut); y += 2) for (let x = Math.max(1, o.x0 - ut); x < Math.min(W - 1, o.x1 + ut); x += 2) {
    if (!ledig(s, x, y)) continue;
    const kr = r.vatten || r.skog ? runt(s, x, y) : undefined;
    const fel = (r.vatten && !kr!.vatten ? 6 : 0) + (r.skog ? Math.max(0, r.skog[0] - kr!.skog, kr!.skog - r.skog[1]) : 0);
    const d = Math.abs(utanforByn(s, x, y) - r.avst) + fel;
    if (d < bs) { bs = d; best = { x, y }; ok = !fel; }
  }
  return { ...best, ok };
}
// en rad i arbetsordningen: någon bär en död till graven, helst någon nära (steg 8.5.1)
export function begravaVal(s: State, p: Person) {
  const ledig = (k: Kvarleva) => k.bars === undefined && !living(s).some(o => o !== p && (o.task?.act === 'begrava' || o.task?.act === 'grava') && o.task.ref === k.id);
  // den fallne fienden bärs ut i skogen när sakerna tagits om hand (steg 10.4.7); den som redan ligger där tas upp bara av den som vill ge hen en grav
  // en kropp som redan burits ut eller skändats tas upp igen bara av den som vill ge den en grav (steg 10.4.13)
  const igen = (k: Kvarleva) => !k.utburen || ODEN[odeFor(s, p, k)].grav;
  const q = s.kvarlevor?.find(k => (k.k === 'kropp' || k.k === 'framling' || k.k === 'skandad') && ledig(k) && igen(k)) ?? s.kvarlevor?.find(k => k.k === 'fiende' && ledig(k) && !avrustbart(s, p, k) && igen(k));
  // en kropp väntar en stund innan någon vill bära den, kortare för den som stod den döda nära (tider dragna när hen dog, steg 10.4.5)
  if (!q || s.now < ((nara(s, p, q.vem) ? q.naraT : q.annanT) ?? 0) || (vakaVantar(s, q) && harBud(s, p, 'vaka'))) return undefined;
  return { spot: { x: q.x + 0.5, y: q.y + 0.5 }, ref: q.id, why: `Bär ${q.namn} till graven` };
}
// vakan är inte över än: den har inte börjat, pågår eller väntar i kön (steg 10.4.12)
const VAKA_KL = 20;
const vakaVantar = (s: State, q: Kvarleva) => q.vaka !== undefined && (s.now < q.vaka + BEGRAVNINGAR.vaka.tim! * HOUR || s.ritual?.kropp === q.id || !!s.ritualKo?.some(r => r.kropp === q.id));
// framme vid kroppen: hen tas upp och bärs till platsen där graven ska vara
export function kroppUpp(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return;
  q.bars = p.id;
  if (vakaVantar(s, q) && budIn(troOf(s, p.tro), 'vaka')) budBrutet(s, p, 'vaka'); // den troende bar kroppen före vakan
  const val = odeVal(s, p, q); if (val.brot) budBrutet(s, p, val.brot); // hen gör som utan budet hen inte följer (steg 10.4.13)
  const ode = q.ode = val.ode;
  if (arSkand(ode)) { // skändningen (steg 10.4.13): utan ved eller vatten blir det åt djuren
    const k: SkandId = (ode === 'balRit' && amountOf(s, 'ved') < ODEN.balRit.ved!) || (ode === 'vattnet' && !vattenNara(s)) ? 'djuren' : ode, r = ODEN[k];
    const at = k === 'vattnet' ? strandPlats(s, q.x, q.y) : k === 'stigen' ? stigPlats(s) : skogsPlats(s, q.x, q.y, r.avst, false), tid = r.min! * MIN;
    q.ode = k; t.act = 'grava'; t.phase = 'go'; t.tx = at.x + 0.5; t.ty = at.y + 0.5; t.why = `Bär bort ${q.namn} (${r.namn.toLowerCase()})`;
    t.until = s.now + tid + GA_TID; t.arbTid = tid; t.tool = undefined; return;
  }
  if (ode === 'skogen') { // ut i skogen (steg 10.4.7): kroppen läggs ner, inget grävs
    const at = skogsPlats(s, q.x, q.y), tid = ODEN.skogen.min! * MIN;
    t.act = 'grava'; t.phase = 'go'; t.tx = at.x + 0.5; t.ty = at.y + 0.5; t.why = `Bär ${q.namn} ut i skogen`;
    t.until = s.now + tid + GA_TID; t.arbTid = tid; t.tool = undefined; return;
  }
  const d = q.k === 'fiende' ? undefined : byId(s, q.vem), tr = q.k === 'fiende' ? troOf(s, p.tro) : d?.brottsling ? undefined : troOf(s, d?.tro);
  // kroppens väg (steg 10.4.5): vattnet bärs till trons plats vid stranden och sänks på en halv timme; bålet tar en timme till när veden finns
  const bud = q.k === 'fiende' ? [] : kroppBud(s, q, tr), vag = q.vag = bud.includes('bal') ? 'bal' : bud.includes('vattenGrav') && tr && vattenNara(s) ? 'vatten' : 'jord';
  if (vag === 'vatten') {
    const at = vattenPlats(s, tr!);
    t.act = 'grava'; t.phase = 'go'; t.tx = at.x + 0.5; t.ty = at.y + 0.5; t.why = `Bär ${q.namn} till vattnet`;
    const tid = BEGRAVNINGAR.vatten.min! * MIN; t.until = s.now + tid + GA_TID; t.arbTid = tid; t.tool = undefined; return;
  }
  // en grav som någon börjat gräva ligger kvar som en grop (q.grav), och nästa grävare fortsätter där, som ett halvfällt träd
  const at = q.grav ?? (ode === 'ovardig' ? ovardigPlats(s) : gravPlats(s, tr, q.k === 'fiende' ? undefined : kroppBud(s, q, tr))), spade = freeTools(s, p, 'benspade') > 0, bal = vag === 'bal' && amountOf(s, 'ved') >= BEGRAVNINGAR.bal.ved! ? BEGRAVNINGAR.bal.min! : 0;
  t.act = 'grava'; t.phase = 'go'; t.tx = at.x + 0.5; t.ty = at.y + 0.5; t.why = `Gräver en grav åt ${q.namn}`;
  const hel = ((spade ? GRAV.spadeMin : GRAV.handMin) + bal) * MIN, del = q.grav?.del ?? 0, tid = hel * (1 - del);
  q.grav = { x: at.x, y: at.y, del, hel };
  t.until = s.now + tid + GA_TID; t.arbTid = tid;
  t.tool = spade ? 'benspade' : undefined; if (spade) take(s, p, 'benspade');
}
// medan graven grävs: gropen blir djupare (q.grav.del), så att arbetet finns kvar om grävaren avbryts
export function gravaMedan(s: State, _p: Person, t: Task, dtSec: number) {
  const q = t.phase === 'do' ? kvarById(s, t.ref ?? -1) : undefined;
  if (q?.grav) q.grav.del = Math.min(1, q.grav.del + dtSec * SEC / q.grav.hel);
}
// det den som bär kroppen hämtar till graven (HAMTAS.grava i hamtning.ts, steg 11.1.77): veden till bålet
export function gravaHamtas(s: State, t: Task): Record<string, number> | undefined {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return undefined;
  if (q.ode === 'balRit') return { ved: ODEN.balRit.ved! };
  return q.vag === 'bal' && q.ode !== 'skogen' && !(q.ode && arSkand(q.ode)) ? { ved: BEGRAVNINGAR.bal.ved! } : undefined;
}
// graven är klar: kroppen är borta, och är den döde troende samlas trosfränderna (steg 8.5.6). Den som dog som brottsling begravs ovärdigt (steg 8.4.8)
export function gravKlar(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return;
  if (q.ode === 'skogen') { // lagd i skogen (steg 10.4.7): kroppen ligger kvar och ruttnar vidare
    q.x = Math.floor(p.x); q.y = Math.floor(p.y); q.bars = undefined; q.utburen = true; q.ode = undefined;
    count(s, 'utburen'); think(p, `Bar ut ${q.namn} i skogen`, 0, s.now, 6 * HOUR);
    return;
  }
  if (arSkand(q.ode)) { skandaKlar(s, p, q); return; }
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
  const d = byId(s, q.vem), ovardig = !!d?.brottsling, tr = ovardig ? undefined : troOf(s, d?.tro), x = Math.floor(p.x), y = Math.floor(p.y);
  const bud = kroppBud(s, q, tr), vag = q.vag ?? (bud.includes('bal') ? 'bal' : 'jord');
  let stil: GravStil = vag === 'vatten' ? 'vatten' : 'jord';
  if (vag === 'bal') { // bålet (steg 10.4.5): saknas veden blir det jorden, och den troende som begraver har brutit budet
    if (harTillHands(s, p, 'ved') >= BEGRAVNINGAR.bal.ved!) { takeMaterial(s, p, 'ved', BEGRAVNINGAR.bal.ved!, true); stil = 'bal'; }
    else if (tr && p.tro === tr.id) budBrutet(s, p, 'bal');
  }
  const stor = !ovardig && !!d && storDod(s, d, tr);
  if (stil === 'vatten') { (s.sankta ??= []).push({ vem: q.vem, namn: q.namn, x, y, t: s.now, sjo: sjoVid(s, x, y), ...(q.med ? { med: q.med } : {}) }); count(s, 'sankt'); }
  else { gravarOf(s).push({ x, y, t: s.now, vem: q.vem, namn: q.namn, stil, ...(tr ? { tro: tr.id } : {}), ...(ovardig ? { ovardig: true as const } : {}), ...(q.med ? { med: q.med } : {}), ...(stor ? { stor: true as const } : {}) }); groundOf(s).cover[y * W + x] = 0; }
  count(s, 'grav'); count(s, 'grav_' + stil);
  think(p, `Begravde ${q.namn}`, -0.02, s.now, 6 * HOUR);
  if (tr && !ovardig) { count(s, 'begravd_troende'); }
  // samlingen (steg 10.4.5): den vanliga med trosfränderna, den tysta med familjen, och den enkla utan samling
  const samling = ovardig || !tr ? undefined : bud.includes('vanligBegr') ? 'vanlig' : bud.includes('tystBegr') ? 'tyst' : undefined;
  if (samling) nyRitual(s, 'begravning', { tro: tr!.id, x, y, om: [q.vem], namn: `Begravningen av ${q.namn}`, ...(samling === 'tyst' ? { tyst: true as const } : {}) });
  if (tr && !ovardig && bud.includes('gravol')) nyRitual(s, 'gravol', { tro: tr.id, om: [q.vem], namn: `Gravölet efter ${q.namn}` }); // efter samlingen i kön (steg 10.4.12)
  if (!samling && !ovardig) { // den enkla begravningen är den utan samling (steg 12.1.61)
    for (const o of living(s)) {
      if (!d) continue;
      const familj = isParent(o, d) || isParent(d, o) || o.partner === d.id || d.partner === o.id;
      if (familj || nara(s, o, d.id)) think(o, `${q.namn} begravdes`, familj ? BEGRAVNINGAR_ENKEL.familj : BEGRAVNINGAR_ENKEL.andra, s.now, 12 * HOUR);
    }
    log(s, `${p.name} begravde ${q.namn}.`, 'rel', [p.id]);
  }
}
// skändningen är gjord (steg 10.4.13): bålet tar veden och vattnet kroppen, och inget blir kvar; åt djuren och vid stigen ligger hen kvar som
// en skändad kropp. De som ser det får upplevelsen, och en gäst som ser det gör sin klan ovänligare
function skandaKlar(s: State, p: Person, q: Kvarleva) {
  let k = q.ode as SkandId;
  if (k === 'balRit') { if (harTillHands(s, p, 'ved') >= ODEN.balRit.ved!) takeMaterial(s, p, 'ved', ODEN.balRit.ved!, true); else k = 'djuren'; }
  q.x = Math.floor(p.x); q.y = Math.floor(p.y); q.bars = undefined; q.ode = undefined;
  for (const o of s.people) if (o.died === undefined && o.ute === undefined && o !== p && Math.hypot(o.x - p.x, o.y - p.y) <= KVAR.seR) sagSkandad(s, o, q); // också gästerna, inte den som är borta
  if (ODEN[k].kvar) { q.k = 'skandad'; q.utburen = true; q.t = s.now; }
  else s.kvarlevor = s.kvarlevor!.filter(x => x !== q);
  count(s, 'skandad'); count(s, 'skandad_' + k);
  think(p, `Skändade ${q.namn}`, 0, s.now, 6 * HOUR);
  log(s, `${p.name} skändade ${q.namn}: ${ODEN[k].namn.toLowerCase()}.`, 'rel', [p.id]);
}
// stigen: där vägen ut mot kartans närmaste kant (infartens håll) lämnar byns område
function stigPlats(s: State) {
  const o = omrade(s), c = { x: Math.floor((o.x0 + o.x1) / 2), y: Math.floor((o.y0 + o.y1) / 2) };
  const v = [{ d: c.x, dx: -1, dy: 0 }, { d: W - 1 - c.x, dx: 1, dy: 0 }, { d: c.y, dx: 0, dy: -1 }, { d: H - 1 - c.y, dx: 0, dy: 1 }].sort((a, b) => a.d - b.d)[0]!;
  for (let n = 0; n <= v.d; n++) { const x = c.x + v.dx * n, y = c.y + v.dy * n; if (utanforByn(s, x, y) >= 1 && ledig(s, x, y)) return { x, y }; }
  return skogsPlats(s, c.x, c.y, 1, false);
}
// stranden närmast kroppen: en ledig ruta intill vatten
function strandPlats(s: State, x0: number, y0: number) {
  const m = getMap(s.seed);
  for (let r = 0; r < Math.max(W, H); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
    const x = x0 + dx, y = y0 + dy;
    if (inMap(x, y) && ledig(s, x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inMap(x + a!, y + b!) && m.tiles[(y + b!) * W + x + a!] === T.Vatten)) return { x, y };
  }
  return { x: x0, y: y0 };
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

// ---------- gravarnas utseende (steg 10.4.2) ----------
// graven är först en jordhög. Sedan gör någon som minns den döda vården: en rad i GRAVAR. Vilken är ett bud i den dödas tro (BUD, grupperna
// gravvard och storagrav), och utan tro en gravbräda, eller en gravstolpe innan byn har plankor
export interface GravRad { namn: string; mat: Record<string, number>; min: number; bud: BudId; skalor: [SkalaId, 0 | 1][]; stora?: true; dygn: number; ett?: true } // dygn = när vården är utsliten utan lagning (steg 10.4.8)
export const GRAVAR: Record<GravVard, GravRad> = {
  gravstolpe: { namn: 'Gravstolpe', mat: { virke: 1 }, min: 4, bud: 'gravStolpe', skalor: [['natur', 0]], dygn: 28 },
  gravbrada: { namn: 'Gravbräda', mat: { plankor: 1 }, min: 3, bud: 'gravBrada', skalor: [['natur', 1]], dygn: 28 },
  stockram: { namn: 'Stockram', mat: { virke: 2 }, min: 5, bud: 'stockram', skalor: [['oppen', 1]], dygn: 28 },
  gravhus: { namn: 'Gravhus', ett: true, mat: { virke: 2, plankor: 2 }, min: 12, bud: 'gravhus', skalor: [['livet', 1]], dygn: 28 },
  gravhog: { namn: 'Gravhög', mat: {}, min: 20, bud: 'gravhog', skalor: [['livet', 1], ['fest', 0]], stora: true, dygn: 84 },
  // stengravarna (steg 10.4.3): med stenhuggarplatsen. Stenen tas när arbetet börjar, och arbetet vid graven är ristningen
  gravsten: { namn: 'Gravsten', mat: { huggen_sten: 1 }, min: 5, bud: 'gravsten', skalor: [['natur', 1]], dygn: 280 },
  stensattning: { namn: 'Stensättning', mat: { sten: 6, huggen_sten: 1 }, min: 12, bud: 'stensattning', skalor: [['oppen', 1]], dygn: 280 },
  skeppssattning: { namn: 'Skeppssättning', mat: { sten: 12, huggen_sten: 2 }, min: 20, bud: 'skeppssattning', skalor: [['livet', 1], ['fest', 0]], stora: true, dygn: 280 },
};
const VARDER = Object.keys(GRAVAR) as GravVard[];
const grupp = (k: GravVard) => GRAVAR[k].stora ? 'storagrav' : 'gravvard';
// byn har materialet eller kan göra det: någon kan receptet eller sättet att skaffa det
const kanSkaffa = (s: State, k: string, n: number) => amountOf(s, k) >= n || (() => { const tek = (RECEPT as Record<string, { tek?: string }>)[k]?.tek ?? SAKER[k]?.skaffa?.tek; return !tek || living(s).some(p => knows(p, tek)); })();
const kanGora = (s: State, k: GravVard) => Object.entries(GRAVAR[k].mat).every(([m, n]) => kanSkaffa(s, m, n));
// den döda är stor: har varit ledare, är trons helgon eller en legend med gott anseende
function storDod(s: State, d: Person, tr: Tro | undefined) {
  if (d.ledde || tr?.helgon?.some(h => h.id === d.id)) return true;
  const { r, a } = ryktbarhet(s, d.id); return r >= RYKTE.legend && a >= 0;
}
// när en troende dör (steg 10.4.2 och 10.4.5): har tron inget bud i en grupp blir den möjliga raden som drar mest dess sed, utan omröstning.
// Lika: den som kräver mest, sedan det större budet. En rad utan skalor drar inget men är möjlig när ingen annan drar
interface SedRad { grupp: string; bud: BudId; namn: string; skalor: [SkalaId, 0 | 1][]; mat: Record<string, number>; minAvst?: number; vatten?: true; plats?: PlatsId }
const SED_RADER = (): SedRad[] => [
  ...VARDER.map(k => ({ grupp: grupp(k), bud: GRAVAR[k].bud, namn: GRAVAR[k].namn, skalor: GRAVAR[k].skalor, mat: GRAVAR[k].mat })),
  ...(Object.keys(BEGRAVNINGAR) as BegrId[]).map(k => { const b = BEGRAVNINGAR[k]; return { grupp: b.led, bud: b.bud, namn: b.namn, skalor: b.skalor, mat: (b.ved ? { ved: b.ved } : {}) as Record<string, number>, minAvst: b.minAvst, vatten: b.vatten }; }),
  ...PLATSER.map(k => { const r = GRAVPLATSER[k]; return { grupp: 'gravplats', bud: r.bud, namn: r.namn, skalor: r.skalor, mat: {}, minAvst: r.minAvst, vatten: r.vatten, plats: k }; }),
];
const SED_GRUPPER = ['gravplats', 'gravvard', 'storagrav', 'vag', 'samling'];
const radDrag = (tr: Tro, r: SedRad) => {
  if (!r.skalor.length) return 0;
  let sum = 0, n = 0;
  for (const [sk, sida] of r.skalor) { const v = skalaV(tr, sk); if (v === undefined) continue; const mot = sida === 0 ? 50 - v : v - 50; if (r.minAvst && mot < r.minAvst) return undefined; sum += mot / 50; n++; }
  return n ? sum / n : undefined;
};
export function sederVidDod(s: State, tr: Tro, stor: boolean) {
  for (const g of SED_GRUPPER) {
    if (g === 'storagrav' && !stor) continue;
    if (tr.bud?.some(b => (BUD as Record<string, { grupp?: string }>)[b.id]?.grupp === g)) continue;
    let best: SedRad | undefined, bd = 0;
    const mat = (r: SedRad) => Object.values(r.mat).reduce((a, b) => a + b, 0), stl = (r: SedRad) => BUD[r.bud].storlek;
    // kartan har det platsen behöver (vatten, eller skogen runt en ruta); den heliga platsen går före de andra när tron har en
    const kartan = (r: SedRad) => !r.plats || (GRAVPLATSER[r.plats].helig ? !!heligFor(s, tr) : !GRAVPLATSER[r.plats].skog || sokPlats(s, GRAVPLATSER[r.plats]).ok);
    if (g === 'gravplats' && heligFor(s, tr) && rymsBud(s, tr, BUD.gravHelig.storlek)) best = SED_RADER().find(r => r.plats === 'helig');
    for (const r of best ? [] : SED_RADER()) {
      if (r.grupp !== g || !kartan(r) || !Object.entries(r.mat).every(([m, n]) => kanSkaffa(s, m, n)) || !rymsBud(s, tr, stl(r)) || (r.vatten && !vattenNara(s))) continue;
      const dr = radDrag(tr, r); if (dr === undefined || dr < 0 || (dr === 0 && r.skalor.length)) continue;
      const battre = !best || dr > bd + 1e-9 || (Math.abs(dr - bd) <= 1e-9 && (mat(r) > mat(best) || (mat(r) === mat(best) && stl(r) > stl(best))));
      if (battre) { best = r; bd = dr; }
    }
    if (!best) continue;
    (tr.bud ??= []).push({ id: best.bud, t: s.now }); count(s, 'gravsed');
    log(s, `${best.namn} blev sed i tron när en troende dog.`, 'world', []);
  }
}
// vården graven ska få: trons bud, och utan tro (eller utan bud) en gravsten när byn har en huggen sten (steg 10.4.3), annars en gravbräda, eller en gravstolpe innan byn har plankor. En ovärdig grav och fiendens får ingen
export function vardFor(s: State, g: Grav): GravVard | undefined {
  if (g.vard || g.ovardig || g.fiende) return undefined;
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
  return { w: best.w, uppgift: { act: 'gravvard' as const, text: `Gör ${enOrd(GRAVAR[k])} ${GRAVAR[k].namn.toLowerCase()} på ${gen(g.namn)} grav.`, min: GRAVAR[k].min, tool: k, spot: { x: g.x + 0.5, y: g.y + 0.5 }, ref: g.vem } };
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
  gravText(s, p, g);
  think(p, `Gjorde ${enOrd(GRAVAR[k])} ${GRAVAR[k].namn.toLowerCase()} åt ${g.namn}`, 0.02, s.now, 6 * HOUR);
  log(s, `${p.name} gjorde ${enOrd(GRAVAR[k])} ${GRAVAR[k].namn.toLowerCase()} på ${gen(g.namn)} grav.`, 'rel', [p.id]);
}

// ---------- gravtexten (steg 10.4.4) ----------
// när vården är klar ristar den som gjorde den en kort text ur sitt eget minne: den dödas namn, relationen och de två händelser som väger tyngst
// ("Ask, Ingas man, som dödade en björn och delade sin mat"), eller bara namnet från den som inte kände hen. Texten ändras aldrig
export function gravText(s: State, w: Person, g: Grav) {
  const d = byId(s, g.vem), kande = !!d && (nara(s, w, g.vem) || !!w.intryck?.some(e => e.om === g.vem));
  let text = g.namn, bev: Bevis[] = [];
  if (d && kande) {
    const r = s.rels[relKey(w.id, d.id)], par = w.partner === d.id || (d.partner === w.id && r?.par !== undefined); // den levande släpper partnern när hen dör; den döda har kvar sin
    const rel = par ? (d.sex === 'k' ? 'hustru' : 'man') : slaktOrd(w, d) ?? ((r?.op ?? 0) > 40 ? 'vän' : undefined);
    const alla = (w.intryck ?? []).filter(e => e.om === g.vem).flatMap(e => e.bev ?? []).sort((a, b) => HANDELSER[b.h].vikt - HANDELSER[a.h].vikt);
    const sett = new Set<string>(); for (const b of alla) { const t = bevisText(b, '').trim(); if (sett.has(t)) continue; sett.add(t); bev.push(b); if (bev.length >= 2) break; }
    const vad = bev.map(b => bevisText(b, '').trim());
    text = `${g.namn}${rel ? `, ${gen(w.name)} ${rel}` : ''}${vad.length ? `, som ${vad.join(' och ')}` : ''}`;
  }
  g.text = text; g.textAv = { id: w.id, namn: w.name }; if (bev.length) g.textBev = bev.map(b => ({ ...b }));
  count(s, 'gravtext');
}

// ---------- begravningens former (steg 10.4.5) ----------
// två led: kroppens väg (i jorden utan bud, bålet eller vattnet) och samlingen (den enkla utan bud, den tysta eller den vanliga). Varje rad är ett bud
export type BegrId = 'bal' | 'vatten' | 'tyst' | 'vanlig' | 'vaka' | 'sorgkvade' | 'gravol';
export const BEGRAVNINGAR: Record<BegrId, { namn: string; led: 'vag' | 'samling' | 'tillagg'; bud: BudId; skalor: [SkalaId, 0 | 1][]; ved?: number; tim?: number; min?: number; minAvst?: number; vatten?: true }> = {
  bal: { namn: 'Bålet', led: 'vag', bud: 'bal', skalor: [['natur', 0], ['fest', 0]], ved: 4, min: 2 }, // min = arbetet (bålet läggs och tänds, sänkningen); tim = det man väntar på (vakan, gravölet)
  vatten: { namn: 'Vattnet', led: 'vag', bud: 'vattenGrav', skalor: [['natur', 0]], minAvst: 20, vatten: true, min: 2 },
  tyst: { namn: 'Den tysta begravningen', led: 'samling', bud: 'tystBegr', skalor: [['fest', 1]] },
  vanlig: { namn: 'Begravningen', led: 'samling', bud: 'vanligBegr', skalor: [] },
  // tilläggen (steg 10.4.12): egna bud som läggs till de andra formerna och blir aldrig sed av sig själva (gruppen tillagg är ingen sedgrupp)
  vaka: { namn: 'Vakan', led: 'tillagg', bud: 'vaka', skalor: [['natur', 1]], tim: 4 },
  sorgkvade: { namn: 'Sorgkvädet', led: 'tillagg', bud: 'sorgkvade', skalor: [] },
  gravol: { namn: 'Gravölet', led: 'tillagg', bud: 'gravol', skalor: [['fest', 0]], tim: 2 },
};
BEGR_TAL.balVed = BEGRAVNINGAR.bal.ved ?? 0; BEGR_TAL.balMin = BEGRAVNINGAR.bal.min ?? 0; BEGR_TAL.vattenMin = BEGRAVNINGAR.vatten.min ?? 0; BEGR_TAL.vakaTim = BEGRAVNINGAR.vaka.tim ?? 0; BEGR_TAL.gravolTim = BEGRAVNINGAR.gravol.tim ?? 0; // budens texter (kyrka.ts, steg 12.1.120)
// den enkla begravningen, utan samling: humöret för familjen och för de andra som stod hen nära
export const BEGRAVNINGAR_ENKEL = balans('begravning', { familj: 0.05, andra: 0.03 });
const GRAVBUD = new Set<string>([...VARDER.map(k => GRAVAR[k].bud), ...Object.values(BEGRAVNINGAR).map(b => b.bud), ...PLATSER.map(k => GRAVPLATSER[k].bud)]);
// buden som gällde i den dödas tro när hen dog, sparade på kroppen (äldre sparfiler: trons bud nu)
const kroppBud = (_s: State, q: Kvarleva, tr: Tro | undefined): string[] => q.bud ?? (tr?.bud ?? []).map(b => b.id).filter(id => GRAVBUD.has(id));
// kartan har vatten inom räckhåll från byn
function vattenNara(s: State) {
  const o = omrade(s), m = getMap(s.seed);
  for (let y = Math.max(0, o.y0 - 10); y < Math.min(H, o.y1 + 10); y++) for (let x = Math.max(0, o.x0 - 10); x < Math.min(W, o.x1 + 10); x++) if (m.tiles[y * W + x] === T.Vatten) return true;
  return false;
}
// trons plats vid stranden, där de döda sänks
function vattenPlats(s: State, tr: Tro) { const pl = (s.gravplatser ??= {}), key = `v${tr.id}`; if (!pl[key]) { const { x, y } = sokPlats(s, GRAVPLATSER.sjo); pl[key] = { x, y }; } return pl[key]; }
// när en kropp blir kvar: trons seder sätts när en troende dör, buden som gäller sparas på kroppen, och när byn vill bära hen dras
kroppKrok.f = (s, q, d) => {
  const tr = d.brottsling ? undefined : troOf(s, d.tro);
  if (tr) { sederVidDod(s, tr, storDod(s, d, tr)); q.bud = (tr.bud ?? []).map(b => b.id).filter(id => GRAVBUD.has(id)); }
  // vakan (steg 10.4.12): de nära sitter hos kroppen från kl. 20 kvällen efter dödsfallet
  if (tr && q.bud?.includes('vaka')) {
    const h = hourOf(s.now), fran = Math.floor((s.now + (((VAKA_KL - h + 24) % 24) || 24) * HOUR) / MIN) * MIN; q.vaka = fran;
    nyRitual(s, 'vaka', { tro: tr.id, om: [d.id], kropp: q.id, fran, x: q.x, y: q.y, namn: `Vakan för ${d.name}` });
  }
  const vanta = (tim: number) => s.now - Math.log(1 - rnd(s, 'val')) * tim * HOUR;
  q.naraT = vanta(GRAV.naraTim); q.annanT = vanta(GRAV.annanTim);
};

// ---------- besöken vid graven och gravens skick (steg 10.4.8) ----------
// den som minns eller sörjer en död går på fritiden till graven (eller till stranden där hen sänktes), oftare ju starkare bandet är.
// Bandet: det starkaste minnet hen har av den döda plus sorgens tyngd; båda bleknar, så besöken glesnar. Efter ett besök växer lusten
// tillbaka på BESOK.aterDygn. Vid besöket bleknar minnet långsammare en tid (paminn), hen får tröst, lägger ibland en gåva, rensar rutan
// och lagar graven när den är sliten och materialet finns
export const BESOK = balans('gravbesok', {
  vikt: 1, // lusten är bandet gånger detta, bredvid vilan, hantverket, umgänget och promenaden
  aterDygn: 1, // lusten växer tillbaka på så här många dygn efter ett besök
  min: 2, lagaMin: 3, // minuter vid graven, och till för att laga den
  gava: 0.3, // chansen att lägga en gåva, gånger bandet
  trost: 0.02, // humöret av tanken "Stod vid graven"
  laga: 0.5, // graven lagas när skicket är under så här
});
const JORDGRAV_DYGN = 84; // en jordgrav (och bålets) utan vård är utsliten efter så här många dygn
const livstid = (g: Grav) => (g.vard ? GRAVAR[g.vard].dygn : JORDGRAV_DYGN) * DAY;
// skicket från 1 till 0, räknat ur tiden sedan graven gjordes eller lagades
export const gravSkick = (s: State, g: Grav) => Math.max(0, Math.min(1, 1 - (s.now - (g.lagad ?? g.t)) / livstid(g)));
// bandet till en död
function band(s: State, p: Person, vem: number, namn: string) {
  let m = 0, sorg = 0;
  for (const e of p.intryck ?? []) if (e.om === vem) m = Math.max(m, intryckStyrka(e));
  for (const x of p.thoughts) if (x.until > s.now && x.v < 0 && (x.text === `Sörjer ${namn}` || x.text === `Saknar ${namn}` || (x.text.startsWith('Förlorade ') && x.text.endsWith(`, ${namn}`)))) sorg -= x.v;
  return m + sorg;
}
const sanktAv = (s: State, vem: number) => s.sankta?.find(q => q.vem === vem);
const gravAv = (s: State, vem: number) => s.gravar?.find(g => g.vem === vem && !g.fiende);
const lagaMat = (g: Grav) => g.vard ? Object.fromEntries(Object.entries(GRAVAR[g.vard].mat).map(([k, n]) => [k, Math.ceil(n / 2)])) : {};
// fritiden (val.ts): graven där bandet är starkast, med lusten
export function gravbesokVal(s: State, p: Person) {
  if ((!s.gravar?.length && !s.sankta?.length) || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  const ater = p.gravBesok === undefined ? 1 : Math.min(1, (s.now - p.gravBesok) / (BESOK.aterDygn * DAY));
  if (ater <= 0) return undefined;
  const sett = new Set<number>(); let best: { vem: number; namn: string; x: number; y: number; b: number; g?: Grav } | undefined;
  const prova = (vem: number) => {
    if (sett.has(vem)) return; sett.add(vem);
    const g = gravAv(s, vem), q = g ? undefined : sanktAv(s, vem); if (!g && !q) return;
    const namn = (g ?? q)!.namn, b = band(s, p, vem, namn);
    if (b > 0 && (!best || b > best.b)) best = { vem, namn, x: (g ?? q)!.x, y: (g ?? q)!.y, b, ...(g ? { g } : {}) };
  };
  for (const e of p.intryck ?? []) if (!byId(s, e.om) || byId(s, e.om)!.died !== undefined) prova(e.om);
  for (const g of p.sorg ?? []) { if (g.vem !== undefined) { prova(g.vem); continue; } const d = s.people.find(q => q.name === g.namn && q.died !== undefined); if (d) prova(d.id); } // id, namnet för äldre sparfiler
  if (!best) return undefined;
  const b = best as { vem: number; namn: string; x: number; y: number; b: number; g?: Grav };
  const laga = !!b.g && gravSkick(s, b.g) < BESOK.laga && Object.entries(lagaMat(b.g)).every(([k, n]) => getable(s, p, k) >= n);
  return { w: b.b * ater * BESOK.vikt, b: b.b, vem: b.vem, spot: { x: b.x + 0.5, y: b.y + 0.5 }, min: BESOK.min + (laga ? BESOK.lagaMin : 0), laga, why: b.g ? `Går till ${gen(b.namn)} grav` : `Går till stranden där ${b.namn} sänktes` };
}
// det som får läggas på en grav: kolumnen gravgava i SAKER, och maten
let GAVOR: string[] | undefined;
// det som bärs till graven (HAMTAS, hamtning.ts): materialet till vården, och vid besöket gåvan (den minst värda saken hen får
// ta) och det som lagar en sliten grav
export const gravvardHamtas = (_s: State, tk: Task) => { const k = tk.tool as GravVard; return GRAVAR[k] ? { ...GRAVAR[k].mat } : undefined; };
// gåvan: den minst värda saken hen äger eller får ta (steg 12.1.61: samma val när den hämtas och när den läggs)
function minstaGava(s: State, p: Person) {
  let k: string | undefined, kv = Infinity;
  for (const o of gavor()) { if (getable(s, p, o) < 1) continue; const v = grundvarde(o); if (v < kv) { kv = v; k = o; } }
  return k;
}
// om en gåva ska med avgörs när besöket väljs (val.ts), efter bandet, och sparas på uppgiften
export const gravGava = (s: State, p: Person, b: number) => rnd(s, 'val', p) < BESOK.gava * b;
export function gravbesokHamtas(s: State, p: Person, tk: Task) {
  const g = gravAv(s, tk.ref ?? -1), av: Record<string, number> = {};
  const k = tk.gava ? minstaGava(s, p) : undefined;
  if (k) av[k] = 1;
  if (g && tk.tool === 'laga' && gravSkick(s, g) < BESOK.laga) for (const [m, n] of Object.entries(lagaMat(g))) av[m] = (av[m] ?? 0) + n;
  return Object.keys(av).length ? av : undefined;
}
const gavor = () => (GAVOR ??= Object.keys(SAKER).filter(k => SAKER[k]!.gravgava || SAKER[k]!.mat !== undefined));
export function gravbesokKlar(s: State, p: Person, t: Task) {
  const vem = t.ref ?? -1, g = gravAv(s, vem), q = g ? undefined : sanktAv(s, vem);
  if (!g && !q) return;
  p.gravBesok = s.now; paminn(s, p, vem, g?.textBev); count(s, 'gravbesok'); // gravtexten bär sina händelser (steg 10.6.15)
  think(p, 'Stod vid graven', BESOK.trost, s.now, 6 * HOUR);
  if (t.gava) {
    const k = minstaGava(s, p);
    if (k) { takeMaterial(s, p, k, 1, true); if (g) g.gavor = (g.gavor ?? 0) + 1; else q!.gavor = (q!.gavor ?? 0) + 1; count(s, 'gravgava'); }
  }
  if (!g) return;
  // skötseln: rutan rensas, och en sliten grav lagas när materialet finns (en jordgrav kostar bara tiden)
  groundOf(s).cover[g.y * W + g.x] = 0;
  if (t.tool === 'laga' && gravSkick(s, g) < BESOK.laga && Object.entries(lagaMat(g)).every(([k, n]) => getable(s, p, k) >= n)) {
    for (const [k, n] of Object.entries(lagaMat(g))) takeMaterial(s, p, k, n, true);
    g.lagad = s.now; count(s, 'grav_lagad');
  }
}
// en gång per dygn (TAKTER): gravarna som vuxit igen helt tas bort, med sin text
export function gravDygn(s: State) {
  if (!s.gravar?.length) return;
  const fore = s.gravar.length;
  s.gravar = s.gravar.filter(g => gravSkick(s, g) > 0);
  if (s.gravar.length < fore) count(s, 'grav_borta', fore - s.gravar.length);
}
