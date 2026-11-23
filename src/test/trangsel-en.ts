// Kör en by och räknar trängseln (steg B.8): sex gånger i timmen, för var och en som är vaken och står på kartan, om någon annan
// står inom en ruta utan att göra samma sak på samma ställe. Räknas per handling och per plats. Skriver JSON (används av trangsel.ts)
import './utc';
import { STEG_TIM, korBy } from './kor';
import { eldPlats, living, zoneOf } from '../sim';
const [seed, dagar] = process.argv.slice(2).map(Number);
// där arbetet kräver att man står nära (samtalet, berättandet, vården, att bära eller bäras, striden), och sömnen i sängarna
const NARA = new Set(['samtal', 'beratta', 'lyssna', 'maltid', 'varda', 'forlossa', 'foder', 'iselen', 'buren', 'strid', 'sova', 'medvetslos', 'fangen', 'besokFange', 'leka', 'sport', 'upptrada']);
const per: Record<string, { n: number; tatt: number }> = {}, plats: Record<string, { n: number; tatt: number }> = {};
const lagg = (r: typeof per, k: string, t: boolean) => { const x = r[k] ??= { n: 0, tatt: 0 }; x.n++; if (t) x.tatt++; };
let steg = 0;
const r = korBy(seed, dagar, s => {
  if (++steg % Math.max(1, Math.round(STEG_TIM / 6))) return;
  const folk = living(s).filter(p => p.task && !p.gast);
  const e = eldPlats(s), z = zoneOf(s);
  for (const p of folk) {
    const a = p.task!.act;
    if (NARA.has(a)) continue;
    const tatt = folk.some(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 1 && !(q.task!.act === a && Math.floor(q.task!.tx) === Math.floor(p.task!.tx) && Math.floor(q.task!.ty) === Math.floor(p.task!.ty)) && !NARA.has(q.task!.act));
    const ort = p.task!.phase === 'go' ? 'på väg' : Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y) < 4 ? 'vid elden' : z && p.x >= z.x - 1 && p.x <= z.x + z.w + 1 && p.y >= z.y - 1 && p.y <= z.y + z.h + 1 ? 'vid förrådet' : a === 'vila' ? 'i vilan' : 'annat';
    lagg(per, a, tatt); lagg(plats, ort, tatt);
  }
});
console.log(JSON.stringify({ seed, pop: r.n.pop, per, plats, vakter: r.vakter.length }));
