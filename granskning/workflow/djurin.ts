// Inspelning för djurtestet: en sparad testby körs dygn framåt, och var tionde minut (2,5 dagar i spelet) sparas de vilda djuren per art,
// de tama per art (hunger, svält, ägare, ute), hagarna, hönsen, vargflockarna och vad var och en gör. Tiden varje person lagt på varje
// handling summeras hela körningen (för att se vem som sköter djuren). Kopieras till src/test/zz_djur.ts i arbetskopian och körs med
// node --import tsx src/test/zz_djur.ts <by.json.gz> <dygn> <ut.json>
import './utc';
import { writeFileSync } from 'node:fs';
import { lasBy } from './delby';
import { step, living, DAY } from '../sim';
import { djurOf } from '../sim/djur';
const [fil, dygn, ut] = process.argv.slice(2);
const s = lasBy(fil);
const t0 = s.now, STEG = 60, PROV = 600, MAX = Number(dygn) * DAY / 1000;
const statFore = { ...(s.stat ?? {}) };
const frames: unknown[] = [];
const tid: Record<number, Record<string, number>> = {};
const r2 = (v: number) => Math.round(v * 100) / 100;
let t = 0;
while (t < MAX) {
  for (const p of living(s)) { if (p.gast) continue; const a = p.task?.act ?? '-'; const m = (tid[p.id] ??= {}); m[a] = (m[a] ?? 0) + STEG; }
  if (t % PROV === 0) {
    const vilda: Record<string, number> = {};
    for (const d of djurOf(s)) vilda[d.art] = (vilda[d.art] ?? 0) + 1;
    const tama: Record<string, { n: number; hunger: number; svalt: number; agd: number; ute: number }> = {};
    for (const d of s.tamdjur ?? []) { const x = (tama[d.art] ??= { n: 0, hunger: 0, svalt: 0, agd: 0, ute: 0 }); x.n++; x.hunger += d.hunger; if (d.svalt) x.svalt++; if (d.agare !== undefined) x.agd++; if (d.ute !== undefined) x.ute++; }
    for (const k in tama) tama[k].hunger = r2(tama[k].hunger / tama[k].n);
    const gor: Record<string, number> = {};
    for (const p of living(s)) if (!p.gast) { const a = p.task?.act ?? '-'; gor[a] = (gor[a] ?? 0) + 1; }
    frames.push({ t, dag: r2(t * 1000 / DAY), folk: living(s).filter(p => !p.gast).length, vilda, tama, hagar: (s.hagar ?? []).length, hons: (s.hons as { n?: number } | undefined)?.n, vargar: (s.vargar ?? []).map(f => ({ n: f.vargar.length, gor: f.gor, hunger: r2(f.hunger) })), gor });
  }
  step(s, STEG); t += STEG;
}
const namn: Record<number, string> = {}; for (const p of s.people) namn[p.id] = p.name;
const skotsel: Record<string, number> = {}; for (const p of living(s)) if (!p.gast) skotsel[p.name] = r2(p.skill.skotsel ?? 0);
const statDiff: Record<string, number> = {}; for (const k of Object.keys(s.stat ?? {})) { const d = (s.stat![k] ?? 0) - (statFore[k] ?? 0); if (d) statDiff[k] = r2(d); }
const byLogg = s.log.filter(l => l.t >= t0).map(l => ({ t: r2((l.t - t0) / DAY), text: l.text }));
const timmar: Record<string, Record<string, number>> = {};
for (const id in tid) timmar[namn[+id] ?? id] = Object.fromEntries(Object.entries(tid[id]).map(([a, sek]) => [a, r2(sek / 3600)]));
writeFileSync(ut, JSON.stringify({ fil, dygn: Number(dygn), frames, timmar, skotsel, statDiff, byLogg }));
console.log(`${fil} ${dygn} dygn: ${frames.length} bilder, tama ${(s.tamdjur ?? []).length}, hagar ${(s.hagar ?? []).length}`);
