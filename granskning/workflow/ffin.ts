// Inspelning för företagstestet (affärsworkflowet): en sparad testby körs timmar framåt och företagens läge, köerna,
// de som arbetar och handlar och byns räknare sparas. Kopieras till src/test/zz_ffin.ts i arbetskopian och körs med
// node --import tsx src/test/zz_ffin.ts <by.json.gz> <timmar> <ut.json> [starta]
// starta = verksamheter (t.ex. servering,dryck) som ett företag med ledaren som ägare startar i byn först, om byn inte har något
import './utc';
import { writeFileSync } from 'node:fs';
import { lasBy } from './delby';
import { step, living, SEC } from '../sim';
import { foretagOf, oppna, foretagRum, starta, foretagare, vantadeKunder } from '../sim/foretag';
import { diskarAv } from '../sim/kassa';
const [fil, timmar, ut, startaVerk] = process.argv.slice(2);
const s = lasBy(fil);
const t0 = s.now;
if (startaVerk && !foretagOf(s).length) { const led = living(s).filter(p => !p.gast)[0]; if (led) starta(s, led.id, startaVerk.split(',')); }
const r2 = (v: number | undefined) => v === undefined ? undefined : Math.round(v * 100) / 100;
const statFore = { ...(s.stat ?? {}) };
const frames: unknown[] = [];
const MAX = Number(timmar) * 3600, STEG = 30;
const stat0 = (): Record<string, number> => Object.fromEntries(Object.entries(s.stat ?? {}).filter(([k]) => /foretag|kop|salj|betjan|disk|ko[a_]|kund|lon|anstall|dagsverk|marknad|gast|omdome|rykte|stang|salu|pris|servering|nattlogi|stall|affar|dryck|silver/i.test(k)));
let t = 0;
while (t < MAX) {
  if (t % 60 === 0) {
    const folk = s.people.filter(p => p.died === undefined && p.x !== undefined);
    frames.push({ t, f: foretagOf(s).map(f => ({ id: f.id, ag: f.ag, agare: foretagare(s, f.ag)?.name, namn: f.namn, verk: f.verk, oppna: oppna(s, f), hus: f.hus, rum: foretagRum(s, f).length, diskar: diskarAv(s, f).length, ko: (f.ko ?? []).map(k => ({ p: k.p, v: k.v, k: k.k, n: k.n, t: Math.round((k.t - t0) / SEC), klar: k.klar !== undefined ? 1 : undefined })), salt: f.salt, intakt: r2(f.intakt), vinst: r2(f.vinst), pris: f.pris, lamnat: r2(f.lamnat), dag: f.dag, resultat: r2(f.resultat), salu: f.salu, enkelt: r2(f.enkelt), gap: f.gap, byar: f.byar, vantade: r2(vantadeKunder(s, f)) })),
      p: folk.map(p => ({ id: p.id, g: p.gast ? (p.gast as { sort?: string }).sort ?? 1 : undefined, x: r2(p.x), y: r2(p.y), a: p.task ? `${p.task.act}/${p.task.phase}` : '-', ref: (p.task as { ref?: number } | undefined)?.ref, w: p.task?.why })),
      stat: stat0() });
  }
  step(s, STEG); t += STEG;
}
const namn: Record<number, string> = {};
for (const p of s.people) namn[p.id] = p.name;
const byLogg = s.log.filter(l => l.t >= t0).map(l => ({ t: Math.round((l.t - t0) / SEC), text: l.text }));
const statEfter = s.stat ?? {}; const statDiff: Record<string, number> = {};
for (const k of Object.keys(statEfter)) { const d = (statEfter[k] ?? 0) - (statFore[k] ?? 0); if (d) statDiff[k] = r2(d)!; }
writeFileSync(ut, JSON.stringify({ fil, timmar: Number(timmar), starta: startaVerk, namn, frames, byLogg, statDiff }));
console.log(`${fil} ${timmar}h${startaVerk ? ' starta ' + startaVerk : ''}: ${frames.length} bilder, ${foretagOf(s).length} företag, sålt ${JSON.stringify(foretagOf(s).map(f => f.salt))}`);
