// Kör en by och samlar varje strid på kartan när den är slut (stridProv i kartstrid.ts): vad den gällde, hur många på varje sida, hur många av byns vuxna
// som var med, hur länge den varade, utgången och vad som hände var och en. Skriver JSON (används av strid.ts)
import './utc';
import { korBy } from './kor';
import { ALDER, HALSA, ageOf, living, stridProv } from '../sim';
const [seed, dagar] = process.argv.slice(2).map(Number);
const rader: Record<string, unknown>[] = [];
const saren: { rad: Record<string, unknown>; pid: number; t: number }[] = []; // de som lever med sår när striden är slut: förblöder de efteråt?
// försöken (anfallen) och hur de gick, utan kast och skott
const FORSOK = ['traff', 'tog', 'miss', 'parera', 'duck', 'knuff', 'omkull'];
stridProv.slut = (s, m) => {
    const st = m.st, vuxna = living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vaktFran).length;
    const sida = (n: 0 | 1) => st.kampar.filter(k => k.sida === n);
    const per = (n: 0 | 1) => { const k = sida(n); return { n: k.length, folk: k.filter(q => q.pid !== undefined && !q.gast).length, dod: k.filter(q => q.lage === 'dod').length, ger: k.filter(q => q.lage === 'ger').length, flykt: k.filter(q => q.lage === 'flykt' || q.lage === 'borta').length, nere: k.filter(q => q.lage === 'nere').length, skadade: k.filter(q => q.skador.length > 0).length, skador: k.reduce((a, q) => a + q.skador.length, 0), vapen: k.map(q => q.vapen).join(','), skick: k.reduce((a, q) => a + (q.st.skicklighet ?? 0), 0) / Math.max(1, k.length), slag: k.reduce((a, q) => a + (q.slag ?? 0), 0), traffar: k.reduce((a, q) => a + (q.traffar ?? 0), 0) }; };
    const h: Record<string, number> = {};
    for (const x of st.logg) h[x.h] = (h[x.h] ?? 0) + 1;
    const kom = h.kommer ?? 0;
    const orsak = m.orsak, typ = m.efter?.typ;
    const sort = typ === 'rovare' ? 'rövare' : typ === 'varg' ? 'vargar' : typ === 'bjorn' ? 'björnen' : typ === 'vildsvin' ? 'vildsvinet' : st.avsikt === 'lek' ? 'lek' : st.avsikt === 'brottning' ? 'brottning' : st.avsikt === 'slagsmal' ? 'slagsmål' : 'annan strid mellan bybor';
    const forsok: Record<string, number> = {};
    for (const x of st.logg) if (x.sl && !x.kast && FORSOK.includes(x.h)) forsok[x.h] = (forsok[x.h] ?? 0) + 1;
    // hur var och en slutade: den sista raden som tog hen ur striden (en död direkt av en träff, annars förblödde hen)
    const slut = (n: 0 | 1) => sida(n).map(k => {
      if (k.lage === 'strid') return 'står';
      const i = st.logg.reduce((a, x, j) => x.a === k.id && ['dod', 'nere', 'kryper', 'ger', 'flykt', 'avstar', 'skild'].includes(x.h) ? j : a, -1);
      const r = st.logg[i];
      if (k.lage === 'dod') { const f = st.logg[i - 1]; return k.blod >= HALSA.blodDod && f && (f.b === k.id && (f.h === 'traff' || f.h === 'hugg') || f.h === 'fastnar' && f.a === k.id) ? 'dog direkt' : 'förblödde'; }
      return r?.h === 'avstar' ? 'drog sig undan' : r?.h === 'skild' ? 'skildes åt' : k.lage === 'nere' ? 'för skadad' : k.lage === 'ger' ? 'gav upp' : 'flydde';
    });
    for (const k of st.kampar) { const p = k.pid !== undefined ? s.people.find(q => q.id === k.pid) : undefined; if (p && p.died === undefined && p.skador?.length) saren.push({ rad: {}, pid: p.id, t: s.now }); }
    const rad = { sort, forsok, slut: [slut(0), slut(1)], efter: 0, dag: +((s.now - s.founded) / 86400000).toFixed(1), orsak, vinnare: st.slut?.vinnare ?? -1, sek: Math.round(st.slut?.t ?? st.t), vuxna, kom, by: per(0), mot: per(1), h };
    for (const x of saren) if (x.t === s.now && !Object.keys(x.rad).length) x.rad = rad;
    rader.push(rad);
};
const r = korBy(seed, dagar);
for (const x of saren) { const p = r.s.people.find(q => q.id === x.pid); if (p?.died !== undefined && p.died - x.t < 86400000 && p.cause === 'blod') (x.rad as { efter: number }).efter++; } // förblödde inom ett dygn (ett år i spelet) efter striden
const st = r.s.stat ?? {}, anfall = { n: st.rovarGarTill ?? 0, sedd: st.rovarGarTillSedd ?? 0, dag: st.rovarGarTillDag ?? 0, dagSedd: st.rovarGarTillDagSedd ?? 0 }; // hur ofta gänget sågs innan det anföll
console.log(JSON.stringify({ seed, pop: r.n.pop, rader, anfall, vakter: r.vakter.length, larm: r.vakter }));
