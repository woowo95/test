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
import { Grav, GravStil, gravAt, kvarById, nara } from './kvarlevor';
import { Tro, skalaV, troOf } from './religion';
import { amountOf, put } from './lager';
import { SAKER } from './saker';
import { kladAv } from './klader';
import { takeMaterial } from './behov';

// ---------- kroppen och graven (steg 8.5.1) ----------
// kroppen ligger kvar där personen dog. En vuxen, helst någon nära, bär den till gravplatsen och gräver (nivån Rädda i arbetsordningen). Grävandet
// går fortare med spade. Graven är en ruta (10.1.3 bygger vidare på den). Tron ger stilen och samlingen vid graven (ritualerna, kult.ts)
export const GRAV = balans('grav', {
  handTim: 3, spadeTim: 1, // så länge det tar att gräva för hand och med spade
  avst: 5, // gravplatsen ligger så här långt utanför byn
  nara: 0.5, annan: 0.15, // chansen att det blir den som stod den döda nära, och någon annan, när valet kommer
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
  const natur = tr.natur, fest = skalaV(tr, 'fest') ?? 50, livet = skalaV(tr, 'livet') ?? 0;
  if (natur < 40 && 100 - fest > 50) return 'bal';
  if (natur < 40 && tr.gravSlag === 'vatten') return 'vatten';
  return livet > 60 ? 'hog' : 'jord';
}
// en rad i arbetsordningen: någon bär en död till graven, helst någon nära (steg 8.5.1)
export function begravaVal(s: State, p: Person) {
  const q = s.kvarlevor?.find(k => k.k === 'kropp' && k.bars === undefined && !living(s).some(o => o !== p && (o.task?.act === 'begrava' || o.task?.act === 'grava') && o.task.ref === k.id));
  if (!q || rnd(s, 'val', p) >= (nara(s, p, q.vem) ? GRAV.nara : GRAV.annan)) return undefined;
  return { spot: { x: q.x + 0.5, y: q.y + 0.5 }, ref: q.id, why: `Bär ${q.namn} till graven` };
}
// framme vid kroppen: hen tas upp och bärs till platsen där graven ska vara
export function kroppUpp(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return;
  q.bars = p.id;
  const d = byId(s, q.vem), tr = d?.brottsling ? undefined : troOf(s, d?.tro), at = gravPlats(s, tr), spade = freeTools(s, p, 'benspade') > 0;
  t.act = 'grava'; t.phase = 'go'; t.tx = at.x + 0.5; t.ty = at.y + 0.5; t.why = `Gräver en grav åt ${q.namn}`;
  t.until = s.now + (spade ? GRAV.spadeTim : GRAV.handTim) * HOUR + GA_TID;
  t.tool = spade ? 'benspade' : undefined; if (spade) take(s, p, 'benspade');
}
// graven är klar: kroppen är borta, och är den döde troende samlas trosfränderna (steg 8.5.6). Den som dog som brottsling begravs ovärdigt (steg 8.4.8)
export function gravKlar(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q) return;
  s.kvarlevor = s.kvarlevor!.filter(k => k !== q);
  const d = byId(s, q.vem), ovardig = !!d?.brottsling, tr = ovardig ? undefined : troOf(s, d?.tro), stil = gravStil(tr), x = Math.floor(p.x), y = Math.floor(p.y);
  if (stil === 'bal' && amountOf(s, 'ved') >= KULT.bal) takeMaterial(s, p, 'ved', KULT.bal);
  if (stil !== 'vatten') gravarOf(s).push({ x, y, t: s.now, vem: q.vem, namn: q.namn, stil, ...(tr ? { tro: tr.id } : {}), ...(ovardig ? { ovardig: true as const } : {}) });
  count(s, 'grav'); count(s, 'grav_' + stil); groundOf(s).cover[y * W + x] = 0;
  think(p, `Begravde ${q.namn}`, -0.02, s.now, 6 * HOUR);
  if (tr && !ovardig) { nyRitual(s, 'begravning', { tro: tr.id, x, y, om: [q.vem], namn: `Begravningen av ${q.namn}` }); (s.troSkalor?.includes('livet') ? 0 : count(s, 'livet_oppen')); if (tr.gravSlag === undefined) tr.gravSlag = trosGrav(s, tr); }
  else if (stil === 'jord' && !ovardig) log(s, `${p.name} begravde ${q.namn}.`, 'rel', [p.id]);
}
// avrusta den fallne (steg 8.7.5): en vuxen tar det fienden hade, 2 minuter per sak, och bär hem det. Sakerna blir byns
export function avrustaVal(s: State, p: Person) {
  const q = s.kvarlevor?.find(k => k.k === 'fiende' && k.saker && !living(s).some(o => o !== p && o.task?.act === 'avrusta' && o.task.ref === k.id));
  if (!q) return undefined;
  return { spot: { x: q.x + 0.5, y: q.y + 0.5 }, ref: q.id, min: 2 * Object.values(q.saker!).reduce((a, b) => a + b, 0), why: `Tar hand om det ${q.namn} bar` };
}
export function avrustaKlar(s: State, p: Person, t: Task) {
  const q = kvarById(s, t.ref ?? -1);
  if (!q?.saker) return;
  for (const [k, n] of Object.entries(q.saker)) { if (SAKER[k]?.redskap) for (let i = 0; i < n; i++) newTing(s, k, 1, -1); else put(s, k, n); }
  q.saker = undefined; count(s, 'avrustad');
  think(p, 'Tog det en fallen fiende bar', -0.02, s.now, 6 * HOUR);
}
// byta om inför strid (steg 8.7.8): när larmet går hämtar var och en sin rustning. Vid en överraskning hinner man inte
export function rustaVal(s: State, p: Person) {
  if (!p.larm || s.now - p.larm.t > HOUR || p.task?.act === 'strid' || (s.rovare && Math.hypot(s.rovare.x - p.x, s.rovare.y - p.y) < 6)) return undefined;
  const t = (s.ting ?? []).find(q => { const pl = kladAv(q.k)?.plagg; return (pl === 'rustning' || pl === 'hjalm') && q.bar === undefined && q.hos === undefined && q.lass === undefined && (q.agare === p.id || q.agare === undefined || q.agare < 0) && q.x !== undefined; });
  return t ? { spot: { x: t.x! + 0.5, y: t.y! + 0.5 }, ref: t.id, why: 'Hämtar sin rustning inför striden' } : undefined;
}
export function rustaKlar(s: State, p: Person, t: Task) {
  const q = (s.ting ?? []).find(o => o.id === t.ref);
  if (q && q.bar === undefined) { q.bar = p.id; q.x = q.y = q.vid = undefined; count(s, 'rustad'); }
}
// trons gravplats bestäms när den första begravs (steg 8.5.7), efter skalorna
const trosGrav = (s: State, tr: Tro): Tro['gravSlag'] => s.heliga?.some(h => h.tro === tr.id) ? 'helig' : tr.natur < 30 ? 'vatten' : tr.natur < 50 ? 'bryn' : 'by';
