// Kör en by och samlar varje strid på kartan när den är slut (stridProv i kartstrid.ts): vad den gällde, hur många på varje sida, hur många av byns vuxna
// som var med, hur länge den varade, utgången och vad som hände var och en. Skriver JSON (används av strid.ts)
import './utc';
import { korBy } from './kor';
import { ALDER, ageOf, living, stridProv } from '../sim';
const [seed, dagar] = process.argv.slice(2).map(Number);
const rader: unknown[] = [];
stridProv.slut = (s, m) => {
    const st = m.st, vuxna = living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vaktFran).length;
    const sida = (n: 0 | 1) => st.kampar.filter(k => k.sida === n);
    const per = (n: 0 | 1) => { const k = sida(n); return { n: k.length, folk: k.filter(q => q.pid !== undefined && !q.gast).length, dod: k.filter(q => q.lage === 'dod').length, ger: k.filter(q => q.lage === 'ger').length, flykt: k.filter(q => q.lage === 'flykt' || q.lage === 'borta').length, nere: k.filter(q => q.lage === 'nere').length, skadade: k.filter(q => q.skador.length > 0).length, skador: k.reduce((a, q) => a + q.skador.length, 0), vapen: k.map(q => q.vapen).join(','), skick: k.reduce((a, q) => a + (q.st.skicklighet ?? 0), 0) / Math.max(1, k.length), slag: k.reduce((a, q) => a + (q.slag ?? 0), 0), traffar: k.reduce((a, q) => a + (q.traffar ?? 0), 0) }; };
    const h: Record<string, number> = {};
    for (const x of st.logg) h[x.h] = (h[x.h] ?? 0) + 1;
    const kom = h.kommer ?? 0;
    rader.push({ dag: +((s.now - s.founded) / 86400000).toFixed(1), orsak: m.orsak, vinnare: st.slut?.vinnare ?? -1, sek: Math.round(st.slut?.t ?? st.t), vuxna, kom, by: per(0), mot: per(1), h });
};
const r = korBy(seed, dagar);
console.log(JSON.stringify({ seed, pop: r.n.pop, rader, vakter: r.vakter.length, larm: r.vakter }));
