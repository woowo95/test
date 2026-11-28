import './utc';
import { writeFileSync } from 'node:fs';
import { lasBy } from './delby';
import { step, living, ageOf, ALDER, SEC, kartStrider, lightLevel } from '../sim';
import { rovarnaKommer, rovarFlockar, synhall } from '../sim/rovare';
import { utanforByn } from '../sim/omrade';
import { eldPlats } from '../sim/karta';
import { gastAv } from '../sim/gast';
const [fil, timFram, antal, ut, fore] = process.argv.slice(2);
const s = lasBy(fil);
for (let i = 0; i < Number(fore ?? 0) * 12; i++) step(s, 300);
for (let i = 0; i < Number(timFram) * 12; i++) step(s, 300);
const t0 = s.now;
rovarnaKommer(s, Number(antal), false, -1);
const f0 = s.rovare!; const rid = new Set(f0.folk); const e = eldPlats(s);
const slutBlod: unknown[] = []; const frames: unknown[] = []; const logg: unknown[] = []; const sett = new Map<number, number>();
const r2 = (v: number) => Math.round(v * 100) / 100;
let slutT = 0, t = 0, tyst = 0, senast = -1; const MAX = 4 * 3600;
while (t < MAX) {
  const flock = rovarFlockar(s).find(f => f.id === f0.id);
  const strider = kartStrider(s);
  const stridNu = strider.some(g => g.st.kampar.some(k => k.pid !== undefined && rid.has(k.pid)));
  const dt = stridNu ? 0.5 : 1;
  const fem = Math.floor(t / 5); // en bild varje gång tiden passerar en hel femsekund
  const spela = stridNu || (flock && flock.anfaller) || fem !== senast; senast = fem;
  if (spela) {
    const kamp = new Map<number, Record<string, unknown>>();
    for (const g of strider) for (const k of g.st.kampar) if (k.pid !== undefined) kamp.set(k.pid, { g: g.id, l: k.lage, sd: k.sida, mal: k.mal !== undefined ? g.st.kampar.find(o => o.id === k.mal)?.pid : undefined, b: k.backar ? 1 : undefined, h: k.haller ? 1 : undefined, v: k.vantar ? 1 : undefined, hj: k.hjalp ? 1 : undefined, bl: r2(k.blod), or: r2(k.ork), mod: r2(k.modNu), vp: k.vapen, to: r2(k.st.torst ?? 0) });
    const folk = [...living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vaktFran), ...[...rid].map(id => gastAv(s, id)).filter((p): p is NonNullable<typeof p> => !!p && p.died === undefined && p.x !== undefined)];
    frames.push({ t, ljus: r2(lightLevel(s.now)),
      f: flock ? { gor: flock.gor, x: r2(flock.x), y: r2(flock.y), rast: flock.rast ? { x: r2(flock.rast.x), y: r2(flock.rast.y) } : undefined, vantat: flock.vantat, anf: flock.anfaller, sedd: flock.sedd !== undefined ? (flock.sedd - t0) / SEC : undefined, till: flock.till ? (flock.till - t0) / SEC : undefined, ut: r2(utanforByn(s, flock.x, flock.y)) } : undefined,
      p: folk.map(p => ({ id: p.id, r: rid.has(p.id) ? 1 : undefined, x: r2(p.x), y: r2(p.y), a: p.gast ? (p.gast as { gor?: string }).gor : p.task ? `${p.task.act}/${p.task.phase}` : '-', w: p.gast ? undefined : p.task?.why, larm: p.larm?.rovare ? 1 : undefined, ser: !p.gast && flock ? r2(synhall(s, flock, p)) : undefined, k: kamp.get(p.id) })) });
  }
  for (const g of strider) { const n = sett.get(g.id) ?? 0;
    for (const x of g.st.logg.slice(n)) logg.push({ t, st: g.id, ts: r2(x.t), h: x.h, a: g.st.kampar.find(k => k.id === x.a)?.pid, b: g.st.kampar.find(k => k.id === x.b)?.pid, g: x.g !== undefined ? r2(x.g) : undefined, sl: x.sl, v: x.v, d: (x as any).d, kl: (x as any).kl, kast: (x as any).kast });
    sett.set(g.id, g.st.logg.length); }
  if (!flock && !stridNu) { tyst += dt; if (tyst > 120) break; } else tyst = 0;
  const fore = kartStrider(s).slice();
  step(s, dt); t += dt; slutT = t;
  for (const g of fore) if (!kartStrider(s).includes(g)) { const n = sett.get(g.id) ?? 0; for (const x of g.st.logg.slice(n)) logg.push({ t, st: g.id, ts: r2(x.t), h: x.h, a: g.st.kampar.find(k => k.id === x.a)?.pid, b: g.st.kampar.find(k => k.id === x.b)?.pid, g: x.g !== undefined ? r2(x.g) : undefined, d: (x as any).d, kl: (x as any).kl, v: x.v }); sett.set(g.id, g.st.logg.length); slutBlod.push(...g.st.kampar.map(k => ({ t, pid: k.pid, l: k.lage, bl: r2(k.blod), sd: k.sida }))); }
}
const namn: Record<number, string> = {};
for (const p of s.people) if (!p.gast) namn[p.id] = p.name;
for (const id of rid) { const p = gastAv(s, id); if (p) namn[id] = p.name; }
const byLogg = s.log.filter(l => l.t >= t0).map(l => ({ t: Math.round((l.t - t0) / SEC), text: l.text }));
writeFileSync(ut, JSON.stringify({ fil, timFram: Number(timFram), antal: Number(antal), eld: { x: e.x, y: e.y }, slutT, namn, frames, slag: logg, byLogg, slutBlod, tagit: s.rovare?.tagit ?? f0.tagit }));
console.log(`${fil} +${timFram}h ${antal} rövare: ${frames.length} bilder, ${logg.length} stridsrader, ${slutT}s`);
