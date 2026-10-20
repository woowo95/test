import { foodDays } from './ekonomi';
import { ageOf, living, log } from './folk';
import { clamp } from './slump';
import { Act, DAY, HOUR, Person, SEDER, Sed, Seder, State } from './typer';

// ---------- seder ----------
export function newSeder(): Seder {
  const z = () => ({ arbete: 0, gemenskap: 0, barn: 0, nyfikenhet: 0, forsiktighet: 0 });
  return { v: z(), ev: z(), log: [] };
}
const dev = (v: number) => (v - 10) / 6;
// åt vilket håll personen drar sederna, efter sin personlighet
export function personSeder(s: State, p: Person): Record<Sed, number> {
  const q = p.pot, kids = s.people.some(c => c.mother === p.id || c.father === p.id);
  return {
    arbete: dev(q.flit),
    gemenskap: dev((q.empati + q.vanlighet) / 2),
    barn: dev(q.empati) * 0.5 + dev(q.vanlighet) * 0.3 + (kids ? 0.1 : 0),
    nyfikenhet: dev((q.nyfikenhet + q.intelligens) / 2),
    forsiktighet: -dev(q.mod) * 0.7 + dev(q.intelligens) * 0.3,
  };
}
// inflytande över sederna: vuxna och äldre väger mest, karismatiska hörs mer
export function influence(s: State, p: Person) {
  const a = ageOf(p, s.now);
  return (a < 14 ? 0 : a < 20 ? 0.5 : a > 50 ? 1.5 : 1) * (0.5 + p.pot.karisma / 20);
}
export function sederTarget(s: State): Record<Sed, number> {
  const t = { arbete: 0, gemenskap: 0, barn: 0, nyfikenhet: 0, forsiktighet: 0 };
  let tw = 0;
  for (const p of living(s)) {
    const w = influence(s, p); if (!w) continue;
    tw += w; const ps = personSeder(s, p);
    for (const k of SEDER) t[k] += ps[k] * w;
  }
  for (const k of SEDER) t[k] = clamp((tw ? t[k] / tw : 0) * 1.8 + s.seder.ev[k], -1, 1);
  return t;
}
// händelser som formar sederna; effekten bleknar under några veckor
export function sedEvent(s: State, k: Sed, d: number, text?: string) {
  s.seder.ev[k] = clamp(s.seder.ev[k] + d, -0.4, 0.4);
  if (text) { s.seder.log.push({ t: s.now, text }); if (s.seder.log.length > 30) s.seder.log.splice(0, s.seder.log.length - 30); }
}
// sederna rör sig långsamt mot det invånarna och händelserna drar mot
export function stepSeder(s: State) {
  const sd = s.seder, dt = s.now - (sd.at ?? s.now);
  sd.at = s.now;
  if (dt <= 0) return;
  const kd = Math.exp(-dt / (6 * DAY));
  for (const k of SEDER) sd.ev[k] *= kd;
  if (foodDays(s) > 20) sedEvent(s, 'arbete', -0.0005 * dt / HOUR); // långt överflöd gör byn lugnare
  const t = sederTarget(s), f = 1 - Math.exp(-dt / (2 * DAY));
  for (const k of SEDER) sd.v[k] += (t[k] - sd.v[k]) * f;
}

// ---------- vilja ----------
// pliktkänsla 0–1: hur mycket personen jobbar för byn i stället för sig själv
export function duty(s: State, p: Person) {
  return clamp(0.6 + (p.pot.flit - 10) * 0.035 + (p.pot.empati - 10) * 0.015 + s.seder.v.arbete * 0.08, 0.05, 0.98);
}
// tid räknas mot yrkestaggar och bleknar, så att de senaste åren väger mest
export const HABIT_FADE = 4 * DAY;
export const habitTotal = (p: Person) => { let t = 0; for (const k in p.habit) t += p.habit[k]; return t; };
export const habitShare = (p: Person, acts: Act[], tot = habitTotal(p)) => tot > 0 ? acts.reduce((a, k) => a + (p.habit[k] ?? 0), 0) / tot : 0;
export const TAGS: { tag: string; acts: Act[]; min: number }[] = [
  { tag: 'Jägare', acts: ['jakt'], min: 0.2 },
  { tag: 'Fiskare', acts: ['fiske'], min: 0.2 },
  { tag: 'Samlare', acts: ['samla'], min: 0.2 },
  { tag: 'Vedhuggare', acts: ['ved', 'falla', 'hugga'], min: 0.15 },
  { tag: 'Hantverkare', acts: ['hantverk'], min: 0.15 },
  { tag: 'Berättare', acts: ['beratta'], min: 0.06 },
  { tag: 'Eldvaktare', acts: ['elda', 'tanda'], min: 0.02 },
  { tag: 'Väktare', acts: ['vakt'], min: 0.08 },
  { tag: 'Dagdrivare', acts: ['vila'], min: 0.3 },
];
// taggen går till den som gör något klart mer än andra i byn; den som redan har en tagg behåller den lättare
export function updateTags(s: State) {
  const ppl = living(s).filter(p => ageOf(p, s.now) >= 14);
  const tot = new Map(ppl.map(p => [p, habitTotal(p)]));
  const avg = TAGS.map(t => ppl.reduce((a, p) => a + habitShare(p, t.acts, tot.get(p)), 0) / (ppl.length || 1));
  // ju fler som redan har ett yrke, desto svårare att få samma (bara namnet, det påverkar inte vad man gör)
  const holders = new Map<string, number>();
  for (const p of ppl) if (p.tag) holders.set(p.tag, (holders.get(p.tag) ?? 0) + 1);
  for (const p of ppl) {
    let best: string | undefined, br = 0;
    if (tot.get(p)! >= 6) TAGS.forEach((t, i) => {
      const sh = habitShare(p, t.acts, tot.get(p)), keep = p.tag === t.tag, r = sh / (avg[i] || 1e-9);
      const many = 1 + (keep ? 0.12 : 0.3) * ((holders.get(t.tag) ?? 0) - (keep ? 1 : 0));
      if (sh >= t.min * (keep ? 0.8 : 1) && r >= (keep ? 1.2 : 1.5) * many && r * (keep ? 1.3 : 1) / many > br) { best = t.tag; br = r * (keep ? 1.3 : 1) / many; }
    });
    if (best !== p.tag) {
      if (p.tag) holders.set(p.tag, holders.get(p.tag)! - 1);
      if (best) holders.set(best, (holders.get(best) ?? 0) + 1);
      p.tag = best;
      const txt = `${p.name} kallas nu för ${best?.toLowerCase()}.`;
      if (best && best !== 'Dagdrivare' && !s.log.some(l => l.text === txt)) log(s, txt, 'skill', [p.id]);
    }
  }
}
export const dygn = (v: number) => `${v >= 10 ? Math.round(v) : v.toFixed(1).replace('.', ',')} dygn`;
