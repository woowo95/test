// Bärselen (steg 13.2.3, Striden i detalj: Fler kläder: Bärselen). Modern till ett barn under ett år tar selen på sig (dess
// poäng i klädseln, plaggPoang i utrustning.ts), lägger barnet i den när hon väljer ett arbete och har det nära, och lägger ner
// det när hon lägger sig. Barnet följer henne där hon går (seleMed, i gången i steg.ts), så att hon kan amma det var hon än är
// (TORST.ammaNara i torst.ts). Ingen egen takt: allt händer när modern väljer och går.
import { Person, State, Task, DAY } from './typer';
import { SAKER } from './saker';
import { allaTing } from './agande';
import { ACTS } from './handlingar';
import { ageOf, alive, byId, count, forstaGang, living, log } from './folk';
import { TORST } from './torst';

// selen p har på sig
export const seleAv = (s: State, p: Person) => allaTing(s).find(t => t.bar === p.id && !!SAKER[t.k]?.klad?.sele);
// p:s barn som är små nog att ammas och bäras i selen, det yngsta först
export const spadbarnAv = (s: State, p: Person) => living(s).filter(c => c.mother === p.id && ageOf(c, s.now) < TORST.ammaAr).sort((a, b) => ageOf(a, s.now) - ageOf(b, s.now));
// barnet som ligger i p:s sele
const iSelen = (s: State, p: Person) => living(s).find(c => c.task?.act === 'iselen' && c.task.ref === p.id);
const laggNer = (c: Person) => { c.task = undefined; };
// efter valet (valjTask i val.ts): modern med sele lägger barnet i den när hon går till ett arbete, behåller det tills hon
// lägger sig och lägger ner det när hon sover eller inte har selen på sig
export function seleVal(s: State, p: Person) {
  const t = p.task, c0 = iSelen(s, p);
  if (!t) return;
  if (t.act === 'sova' || !seleAv(s, p)) { if (c0) laggNer(c0); return; }
  const c = c0 ?? (ACTS[t.act].slag && !ACTS[t.act].vila ? spadbarnAv(s, p).find(b => b.task?.act !== 'buren' && Math.hypot(b.x - p.x, b.y - p.y) <= TORST.ammaNara) : undefined);
  if (!c) return;
  if (!c0 && forstaGang(s, 'bärsele')) log(s, `${p.name} lade ${c.name} i bärselen och tog barnet med sig till arbetet.`, 'world', [p.id, c.id]);
  if (!c0) count(s, 'iSelen');
  c.task = { act: 'iselen', phase: 'do', tx: p.x, ty: p.y, until: s.now + DAY, carry: 0, ref: p.id, why: `Bärs i bärselen av ${p.name}` };
  c.x = p.x; c.y = p.y; t.sele = c.id;
}
// barnet i selen följer med den som bär det, efter varje steg hen tar (steg.ts)
export function seleMed(s: State, p: Person, t: Task) {
  const c = byId(s, t.sele);
  if (c && alive(c) && c.task?.act === 'iselen' && c.task.ref === p.id) { c.x = p.x; c.y = p.y; } else t.sele = undefined;
}
// barnet i selen (MEDAN i steg.ts): läggs ner där det är när modern inte längre bär det
export function iselenSteg(s: State, c: Person, t: Task) {
  const m = byId(s, t.ref);
  if (!m || !alive(m) || m.task?.sele !== c.id || ageOf(c, s.now) >= TORST.ammaAr) laggNer(c);
}
