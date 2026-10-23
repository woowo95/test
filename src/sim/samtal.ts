import { ageOf, getRel, isKin, log, similarity, stat, think } from './folk';
import { clamp, rnd } from './slump';
import { DAY, HOUR, Person, State } from './typer';
import { pair } from './varld';
import { share } from './minne';
import { askForTool } from './agande';

// ---------- samtal ----------
export interface TalkEvent { a: number; b: number; kind: string; good: boolean; t: number }
export function converse(s: State, a: Person, others: Person[], events?: TalkEvent[]) {
  const now = s.now;
  if (!others.length) return;
  // välj samtalspartner viktad efter relation
  let tot = 0;
  const w = others.map(b => { const r = getRel(s, a, b); const v = Math.max(0.1, 1 + r.op / 40 + r.chem * 0.5 + (b.partner === a.id ? 1.5 : 0)); tot += v; return v; });
  let x = rnd(s) * tot, b = others[0];
  for (let i = 0; i < others.length; i++) { x -= w[i]; if (x <= 0) { b = others[i]; break; } }
  const r = getRel(s, a, b);
  const aa = ageOf(a, now), ba = ageOf(b, now);
  const mood = moodOf(a, now);
  let kind: string;
  const canFlirt = aa >= 16 && ba >= 16 && a.sex !== b.sex && !isKin(a, b) && Math.abs(aa - ba) < 18 &&
    ((a.partner === undefined && b.partner === undefined) || a.partner === b.id);
  if ((mood < 0.3 && rnd(s) < 0.35) || (r.op < -25 && rnd(s) < 0.5)) kind = 'gräl';
  else if (a.task?.act === 'beratta') kind = 'berättelse';
  else if (canFlirt && rnd(s) < 0.12 + r.rom / 250 + (r.chem > 0.3 ? 0.08 : 0)) kind = 'flirt';
  else if (moodOf(b, now) < 0.35 && rnd(s) < stat(a, 'empati', now) / 25) kind = 'tröst';
  else if (r.op > 30 && rnd(s) < 0.3) kind = 'djupt samtal';
  else if (rnd(s) < 0.25) kind = 'skämt';
  else kind = 'småprat';

  // hur samtalet går: kemi, likhet och vänlighet, och hur charmig och vacker den andra är. Den med låg karisma och
  // skönhet blir lättare illa omtyckt.
  const charm = (stat(b, 'karisma', now) + stat(b, 'skonhet', now)) / 2;
  let out = r.chem * 1.1 + similarity(a, b) * 0.7 + (stat(a, 'vanlighet', now) + stat(b, 'vanlighet', now)) / 40 - 0.55 + (rnd(s) - 0.5) * 1.4;
  // charmen påverkar vänskapen, inte förälskelsen (den har egen dragning), och inte mellan par och släkt
  const like = a.partner === b.id || isKin(a, b) ? 0 : (charm - 8) / 15;
  if (isKin(a, b)) out += 0.35;
  const mult: Record<string, number> = { 'småprat': 1, 'skämt': 1.6, 'djupt samtal': 2.6, 'tröst': 2.2, 'berättelse': 1.2, 'flirt': 1, 'gräl': 0 };
  if (kind === 'gräl') {
    r.op -= 3 + rnd(s) * 3;
    think(a, `Grälade med ${b.name}`, -0.08, now, 6 * HOUR);
    think(b, `Grälade med ${a.name}`, -0.1, now, 6 * HOUR);
  } else {
    // vänskap växer allt långsammare ju närmare man redan är; ovänskap fördjupas lättare
    const d = mult[kind] * (out + like) * (kind === 'skämt' && out < 0 ? 1.2 : 1);
    r.op += d;
    if (kind === 'tröst' && out + like > -0.3) think(b, `Tröstades av ${a.name}`, 0.08, now, 4 * HOUR);
    if (kind === 'berättelse') { a.skill.berattande = clamp(a.skill.berattande + 0.04 * (0.5 + a.pot.intelligens / 20), 0, 20); }
    if (kind === 'flirt') {
      const att = (stat(b, 'skonhet', now) + stat(b, 'karisma', now)) / 40;
      r.rom = clamp(r.rom + (out + att) * 4, 0, 100);
    }
    share(s, a, b, r, kind); // man berättar vad man vet och lär ut vad man kan
    if (kind !== 'flirt' && out + like > -0.5) askForTool(s, a, b); // den som saknar ett redskap frågar efter det
  }
  r.op = clamp(r.op, -100, 100);
  r.talks++;
  a.social = clamp(a.social + 0.06, 0, 1); b.social = clamp(b.social + 0.06, 0, 1);
  events?.push({ a: a.id, b: b.id, kind, good: kind !== 'gräl' && out > 0, t: now });

  if (r.op > 60 && !(r.flags & 1) && !isKin(a, b) && a.partner !== b.id) { r.flags |= 1; log(s, `${a.name} och ${b.name} har blivit nära vänner.`, 'rel', [a.id, b.id]); }
  if (r.op < -45 && !(r.flags & 2)) { r.flags |= 2; log(s, `${a.name} och ${b.name} har blivit ovänner.`, 'rel', [a.id, b.id]); }
  if (r.rom > 70 && r.op > 30 && a.partner === undefined && b.partner === undefined && canFlirt) pair(s, a, b);
  if (a.partner === b.id && r.op < -25) {
    a.partner = undefined; b.partner = undefined; r.rom = 10;
    log(s, `${a.name} och ${b.name} gick skilda vägar.`, 'rel', [a.id, b.id]);
    think(a, `Separerade från ${b.name}`, -0.15, now, DAY); think(b, `Separerade från ${a.name}`, -0.15, now, DAY);
  }
}

export function moodOf(p: Person, now: number) {
  let m = 0.55;
  if (p.hunger < 0.2) m -= 0.2; else if (p.hunger > 0.6) m += 0.05;
  if (p.rest < 0.2) m -= 0.12;
  if (p.social < 0.2) m -= 0.1; else if (p.social > 0.7) m += 0.05;
  if (p.health < 0.6) m -= 0.12;
  for (const t of p.thoughts) if (t.until > now) m += t.v;
  return clamp(m, 0, 1);
}
