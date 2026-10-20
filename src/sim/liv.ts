import { ageOf, alive, byId, living, log, newPerson, relKey, think } from './folk';
import { sedEvent } from './seder';
import { pick, rnd } from './slump';
import { DAY, Person, State } from './typer';

// ---------- död, födsel, flytt ----------
export function die(s: State, p: Person, cause: string) {
  p.died = s.now; p.cause = cause; p.task = undefined;
  const a = Math.floor(ageOf(p, s.now));
  log(s, `${p.name} dog ${cause}, ${a} år gammal.`, 'death', [p.id]);
  if (cause === 'av svält') sedEvent(s, 'forsiktighet', 0.15, `${p.name} svalt ihjäl. Byn har blivit mer försiktig.`);
  else if (cause === 'av kyla') sedEvent(s, 'forsiktighet', 0.1, `${p.name} frös ihjäl. Byn har blivit mer försiktig.`);
  else if (cause === 'under en jakt') sedEvent(s, 'forsiktighet', 0.04, `${p.name} dog under en jakt. Byn blev lite försiktigare.`);
  if (a < 5) sedEvent(s, 'barn', 0.08, `Byn sörjer barnet ${p.name} och värnar mer om sina barn.`);
  if (a >= 70) p.fame.push(`Blev ${a} år gammal`);
  for (const q of living(s)) {
    if (q.partner === p.id) { q.partner = undefined; think(q, `Sörjer ${p.name}`, -0.3, s.now, 1.2 * DAY); }
    else if (q.mother === p.id || q.father === p.id || p.mother === q.id || p.father === q.id) think(q, `Sörjer ${p.name}`, -0.25, s.now, DAY);
    else { const r = s.rels[relKey(p.id, q.id)]; if (r && r.op > 40) think(q, `Saknar ${p.name}`, -0.12, s.now, 0.6 * DAY); }
  }
}

export function birth(s: State, mother: Person) {
  const father = byId(s, mother.partner) ?? byId(s, (mother as any)._by);
  mother.pregnantSince = undefined; mother.lastBirth = s.now;
  const ch = newPerson(s, rnd(s) < 0.5 ? 'm' : 'k', s.now, mother, father);
  ch.x = mother.x; ch.y = mother.y;
  s.people.push(ch);
  log(s, `${ch.name} föddes, ${ch.sex === 'k' ? 'dotter' : 'son'} till ${mother.name}${father ? ' och ' + father.name : ''}.`, 'birth', [ch.id, mother.id, ...(father ? [father.id] : [])]);
  think(mother, `Fick barnet ${ch.name}`, 0.2, s.now, DAY);
  if (father && alive(father)) think(father, `Fick barnet ${ch.name}`, 0.18, s.now, DAY);
  const kids = s.people.filter(q => q.mother === mother.id).length;
  if (kids === 6) mother.fame.push('Mor till många barn');
  if (rnd(s) < 0.025) die(s, mother, 'i barnsäng');
}

export function emigrate(s: State) {
  const now = s.now;
  const cands = living(s).filter(p => p.partner !== undefined && ageOf(p, now) > 18 && ageOf(p, now) < 38);
  if (!cands.length) return;
  const a = pick(s, cands), b = byId(s, a.partner)!;
  const group = [a, b, ...living(s).filter(c => (c.mother === a.id || c.father === a.id || c.mother === b.id || c.father === b.id) && ageOf(c, now) < 14)];
  for (const g of group) { g.left = now; g.task = undefined; }
  const n = group.length - 2;
  log(s, `Byn blev trång. ${a.name} och ${b.name} lämnade byn${n ? ` med ${n} barn` : ''} för att grunda en egen boplats.`, 'move', group.map(g => g.id));
  for (const q of living(s)) for (const g of group) { const r = s.rels[relKey(q.id, g.id)]; if (r && r.op > 40) { think(q, `Saknar ${g.name}`, -0.08, now, 0.5 * DAY); break; } }
}
