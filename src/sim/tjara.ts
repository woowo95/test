import { DAY, Person, State, Task, W } from './typer';
import { ALDER, ageOf, count, forstaGang, gjort, living, log, ovning } from './folk';
import { MATERIAL, bitsOf } from './byggnad';
import { siteOf } from './bygg';
import { STAKET, faltOf, staketRutor } from './odling';
import { HAGE, hageKant, hagarOf } from './hage';
import { tingOf } from './agande';
import { SAKER } from './saker';
import { ARBETE, grundvarde } from './varde';
import { slitageNu } from './lager';
import { taVatska, vatskaAv } from './vatskor';
import { personHand } from './personlogg';
import { TJARA } from './tjarlatt';

// ---------- tjäran skyddar trä (steg 13.5.1) ----------
// Det av trä som står ute och slits går att tjära: väggarna av timmer, stockvägarna och bryggan (MATERIAL med tjaras),
// staketen och fordonen (kälken, släden och vagnen). Stationerna och redskapen tjäras inte. Att tjära är ett eget arbete på
// nivån Förbättra (raden tjara i val.ts): 1 tjära ur en kruka och TJARA.min minuter för en sak eller TJARA.rutor rutor nära
// varandra, och poängen är det värde skyddet sparar (sakens värde gånger slitaget per timme, halverat i TJARA.dygn dygn)
// mot tjärans värde. Skyddet står i det tjärade (b.tj, t.tj, s.tjarat för staketets rutor) som tiden då det tar slut, och
// slitaget gånger tjarFaktor (tjarlatt.ts) halveras så länge. Krukan blir kvar tom när tjäran är slut.

// det som kan tjäras: var det står, vad det är värt, slitaget per timme (i skick, 0–1) och när skyddet tar slut
export interface TjarMal { id: string; x: number; y: number; spot: { x: number; y: number }; varde: number; per: number; tj?: number; satt: (till: number) => void }
// registret: ett slag av det som tjäras per rad. rutor = slaget tjäras fyra rutor i taget, annars en sak
export const TJARAS: Record<string, { namn: string; rutor: boolean; mal: (s: State) => TjarMal[] }> = {
  // väggarna av timmer, stockvägarna och bryggan: materialets värde och arbetet att bygga dem, och slitaget
  bit: { namn: 'trä', rutor: true, mal: s => bitsOf(s).filter(b => b.b >= 1 && MATERIAL[b.m]?.tjaras).map(b => {
    const M = MATERIAL[b.m];
    return { id: 'bit:' + b.id, x: b.x, y: b.y, spot: siteOf(s, b), varde: grundvarde(M.item!) * M.n + M.tim * ARBETE, per: M.slit, tj: b.tj, satt: (u: number) => { b.tj = u; } };
  }) },
  // staketet: en ruta går sönder med chansen HAGE.slit i timmen i sin hage eller sitt fält, delad på rutorna
  staket: { namn: 'staket', rutor: true, mal: s => {
    const ut: TjarMal[] = [], ar = s.tjarat ?? {}, sett = new Set<number>();
    const lagg = (rs: number[]) => { const k = rs.filter(i => (s.staket ?? []).includes(i)); for (const i of k) if (!sett.has(i)) { sett.add(i); const x = i % W, y = Math.floor(i / W); ut.push({ id: 'staket:' + i, x, y, spot: { x: x + 0.5, y: y + 0.5 }, varde: grundvarde('grenar') * STAKET.grenar, per: HAGE.slit / k.length, tj: ar[i], satt: (u: number) => { (s.tjarat ??= {})[i] = u; } }); } };
    for (const h of hagarOf(s)) lagg(hageKant(s, h));
    for (const f of faltOf(s)) lagg(staketRutor(s, f));
    return ut;
  } },
  // fordonen som står (inte de som används): sakens värde och slitaget där det står
  fordon: { namn: 'fordon', rutor: false, mal: s => tingOf(s).filter(t => SAKER[t.k]?.fordon && t.x !== undefined && t.hos === undefined && t.lass === undefined).map(t => ({
    id: 'ting:' + t.id, x: t.x!, y: t.y!, spot: { x: t.x! + 0.5, y: t.y! + 0.5 }, varde: grundvarde(t.k) * t.c, per: slitageNu(s, t, t).per, tj: t.tj, satt: (u: number) => { t.tj = u; },
  })) },
};
const otjarad = (s: State, m: TjarMal) => (m.tj ?? 0) <= s.now;
// värdet skyddet sparar på m: det som annars slits under skyddets tid, gånger den del som sparas
const sparar = (m: TjarMal) => m.varde * Math.min(1, m.per * TJARA.dygn * 24) * (1 - TJARA.slit);
// det som tjäras med en tjära när m är det första: m, och i ett slag med rutor de otjärade av samma slag närmast omkring
function grupp(s: State, slag: string, m: TjarMal, alla: TjarMal[]) {
  if (!TJARAS[slag].rutor) return [m];
  const nara = alla.filter(q => q !== m && otjarad(s, q) && Math.max(Math.abs(q.x - m.x), Math.abs(q.y - m.y)) <= TJARA.nara).sort((a, b) => sparar(b) - sparar(a));
  return [m, ...nara.slice(0, TJARA.rutor - 1)];
}
// det bästa p kan tjära nu och poängen (raden tjara i FORBATTRA, val.ts): det sparade värdet mot tjärans, eller undefined.
// Bara den vuxna, när byn har tjära, och inte det någon annan redan tjärar
export function tjaraVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || vatskaAv(s, 'tjara') < 1) return undefined;
  const upptaget = new Set(living(s).map(q => q !== p && q.task?.act === 'tjara' ? q.task.tool : undefined).filter(Boolean));
  const kost = grundvarde('tjara') + TJARA.min / 60 * ARBETE; // tjäran och arbetet
  let bast: { slag: string; m: TjarMal; sc: number } | undefined;
  for (const slag in TJARAS) {
    const alla = TJARAS[slag].mal(s);
    for (const m of alla) {
      if (!otjarad(s, m) || upptaget.has(m.id) || sparar(m) * (TJARAS[slag].rutor ? TJARA.rutor : 1) <= (bast?.sc ?? 0) * kost) continue; // kan inte bli bättre
      const sc = (grupp(s, slag, m, alla).reduce((n, q) => n + sparar(q), 0) - kost) / kost;
      if (sc > (bast?.sc ?? 0)) bast = { slag, m, sc };
    }
  }
  return bast;
}
// arbetet: text, tid, var och vad (tool = målets id)
export const tjaraUppgift = (b: { slag: string; m: TjarMal }) => ({ act: 'tjara' as const, text: `Tjärar ${TJARAS[b.slag].namn === 'trä' ? 'trät' : TJARAS[b.slag].namn === 'staket' ? 'staketet' : 'fordonet'} så att det håller längre.`, min: TJARA.min, spot: b.m.spot, tool: b.m.id });
// när arbetet är klart: 1 tjära tas ur krukan, och det som tjäras med den får skyddet
export function tjaraKlar(s: State, p: Person, tk: Task) {
  const slag = tk.tool?.startsWith('bit:') ? 'bit' : tk.tool?.startsWith('staket:') ? 'staket' : tk.tool?.startsWith('ting:') ? 'fordon' : undefined;
  if (!slag) return;
  const alla = TJARAS[slag].mal(s), m = alla.find(q => q.id === tk.tool);
  if (!m || !otjarad(s, m)) return;
  if (taVatska(s, 'tjara', 1) < 1) { count(s, 'tjaraMiste'); return; }
  const g = grupp(s, slag, m, alla), till = s.now + TJARA.dygn * DAY;
  for (const q of g) q.satt(till);
  ovning(p, 'hantverk', 0.02); gjort(s, p, 'tjarat'); count(s, 'tjarat'); count(s, 'tjarat_' + slag, g.length);
  personHand(s, p, 'tjarade', `Tjärade ${slag === 'fordon' ? 'ett fordon' : slag === 'staket' ? `${g.length} rutor staket` : `${g.length} rutor trä`}.`);
  if (forstaGang(s, 'forstaTjara')) log(s, `${p.name} strök tjära på byns trä för första gången. Det som är tjärat slits hälften så fort.`, 'world', [p.id]);
}
