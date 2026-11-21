// Byns läge i text (steg 12.1.40): vad var och en gör, förråden mot sina mål och de öppna behoven. npm run by och granskaren
// (12.1.44) skriver det, och rapporten Det här är konstigt (12.1.41) sparar det
import { ACTS, MATERIAL_LIST, Person, State, ageOf, amountOf, bordSlag, buffert, byggbehov, foodDays, living, lyxtak, materialBuffert, materialTak, sakNamn, tingOf, woodDays } from '../sim';

export const r1 = (v: number) => Math.round(v * 10) / 10, pr = (v: number) => `${Math.round(v * 100)}`;

// det p bär: bördan (bordSlag) och tingen i handen, i bördan och på kroppen
export function bar(s: State, p: Person) {
  const ut: string[] = [];
  if (p.task) for (const [k, kg] of Object.entries(bordSlag(p.task))) ut.push(`${sakNamn(k).toLowerCase()} ${r1(kg)} kg`);
  for (const t of tingOf(s)) if (t.hos === p.id || (t.bar === p.id) || p.task?.ting?.includes(t.id)) ut.push(sakNamn(t.k).toLowerCase());
  return ut.join(', ') || '–';
}
export function folkNu(s: State) {
  const rader = living(s).filter(p => !p.gast).map(p => {
    const t = p.task, a = t ? ACTS[t.act] : undefined;
    return `${p.name} (${Math.floor(ageOf(p, s.now))} år): ${a?.namn ?? 'väljer'}${t ? ` [${t.act}, ${t.phase}]` : ''} — ${t?.why ?? ''}\n    plats ${r1(p.x)},${r1(p.y)}${t ? ` → ${r1(t.tx)},${r1(t.ty)}` : ''}; bär: ${bar(s, p)}; mätt ${pr(p.hunger)} %, törst ${pr(p.torst)} %, värme ${pr(p.warm)} %, vila ${pr(p.rest)} %`;
  });
  return rader.join('\n');
}
export function forradNu(s: State) {
  const r = [`mat ${r1(foodDays(s))} dagar (buffert ${r1(buffert(s, 'mat'))}, tak ${r1(lyxtak(s, 'mat'))}); ved ${r1(woodDays(s))} dagar (buffert ${r1(buffert(s, 'ved'))}, tak ${r1(lyxtak(s, 'ved'))})`];
  for (const k of MATERIAL_LIST) r.push(`${sakNamn(k).toLowerCase()} ${Math.floor(amountOf(s, k))} (buffert ${Math.ceil(materialBuffert(s, k))}, tak ${Math.ceil(materialTak(s, k))})`);
  return r.join('\n  ');
}
export function behovNu(s: State) {
  const r: string[] = [];
  const b = s.arbBehov;
  if (b) r.push(`arbetare per rad: ${Object.entries(b.arb).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  for (const k of MATERIAL_LIST) if (amountOf(s, k) < materialBuffert(s, k)) r.push(`${sakNamn(k).toLowerCase()} under bufferten`);
  if (foodDays(s) < buffert(s, 'mat')) r.push('maten under bufferten');
  if (woodDays(s) < buffert(s, 'ved')) r.push('veden under bufferten');
  for (const x of byggbehov(s)) r.push(`byggbehov ${x.fn} (${r1(x.sc)})`);
  for (const [k, v] of Object.entries(b?.brist ?? {})) if (v > 0) r.push(`brist ${k} ${r1(v)}`);
  return r.join('\n  ') || '(inga)';
}

