// Kör en by och samlar varje strid på kartan när den är slut (stridProv i kartstrid.ts): vad den gällde, hur många på varje sida, hur många av byns vuxna
// som var med, hur länge den varade, utgången och vad som hände var och en. Skriver JSON (används av strid.ts)
import './utc';
import { korBy } from './kor';
import { ALDER, HALSA, ageOf, isLight, living, rovarProv, stridProv, lagerProv, gastAv, gastTingOf, radNr, lever, PERIODRADER, type Rovarflock } from '../sim';
const [seed, dagar] = process.argv.slice(2).map(Number);
const rader: Record<string, unknown>[] = [];
const saren: { rad: Record<string, unknown>; pid: number; t: number }[] = []; // de som lever med sår när striden är slut: förblöder de efteråt?
// försöken (anfallen) och hur de gick, utan kast och skott
const FORSOK = ['traff', 'tog', 'miss', 'parera', 'duck', 'knuff', 'omkull'];
// inspelningen (steg B.56): en bild varje gång stridens tid passerar en hel femsekund, i striderna med rövare: [tid, kämparna]
const BILD = 5, bilder = new WeakMap<object, [number, [number, number, string, number, number][]][]>();
stridProv.steg = (_s, m) => {
  if (m.efter?.typ !== 'rovare') return;
  const l = bilder.get(m) ?? []; bilder.set(m, l);
  if (l.length && Math.floor(m.st.t / BILD) <= Math.floor(l[l.length - 1][0] / BILD)) return;
  l.push([m.st.t, m.st.kampar.map(k => [k.id, k.sida, k.lage, +k.x.toFixed(1), +k.y.toFixed(1)])]);
};
// gängen (steg B.56): tiden från att det kom tills det sågs, tills alla var framme och till anfallet, i sekunder i verkligheten
const gang: Rovarflock[] = [];
const vapnen = new Map<Rovarflock, string[]>(); // vapnen var och en bar (steg B.70)
rovarProv.kom = (f, s) => { gang.push(f); vapnen.set(f, f.folk.map(id => { const p = gastAv(s, id); return (p && gastTingOf(s, p).find(t => t.hos === p.id)?.k) ?? 'hand'; })); };
// byns rikedom per person, ett mått per dygn (steg B.71), och varifrån folket i rövarlägren kom (steg B.68)
const rikt: number[] = [], lagerFolk: Record<string, number> = {};
PERIODRADER.push({ namn: 'mätningen', period: 'dygn', fn: (_s, vl) => {
  const h = radNr(vl, vl.huvud); if (h) rikt.push(h.tal.rikedom / Math.max(1, h.tal.folk));
} });
lagerProv.kom = (vl, _l, fran, n, skal) => { const k = `${fran.nr === vl.huvud ? 'huvudbyn' : 'grannbyarna'}, ${skal}`; lagerFolk[k] = (lagerFolk[k] ?? 0) + n; };
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
    const tunga = st.logg.filter(x => x.h === 'traff' && x.sl && !x.kast && (x.g ?? 0) >= 0.2).length; // de riktiga slagen: de som ger mer än en skråma
    const langd = st.slut?.t ?? st.t;
    // skadan per träff (graden, inte i brottningen och leken) och hur skadade de som flydde var: det svåraste såret och blodet (steg B.65)
    const grader = st.avsikt === 'lek' || st.avsikt === 'brottning' ? [] : st.logg.filter(x => x.h === 'traff').map(x => +(x.g ?? 0).toFixed(3));
    const varst = (k: typeof st.kampar[number]) => +Math.max(0, ...k.skador.map(w => w.g)).toFixed(2), flytt = st.kampar.filter(k => ['flykt', 'borta'].includes(k.lage)).map(k => [varst(k), +k.blod.toFixed(2)]);
    const allvar = st.kampar.filter(k => varst(k) >= 0.2 || k.blod < 0.85).length;
    const rad = { grader, flytt, allvar, kampar: st.kampar.length, t0: s.now - langd * 1000, t1: s.now, tunga, sort, forsok, slut: [slut(0), slut(1)], efter: 0, dag: +((s.now - s.founded) / 86400000).toFixed(1), orsak, vinnare: st.slut?.vinnare ?? -1, sek: Math.round(st.slut?.t ?? st.t), vuxna, kom, by: per(0), mot: per(1), h, ...(bilder.has(m) ? { bilder: bilder.get(m) } : {}) };
    for (const x of saren) if (x.t === s.now && !Object.keys(x.rad).length) x.rad = rad;
    rader.push(rad);
};
const r = korBy(seed, dagar);
for (const x of saren) { const p = r.s.people.find(q => q.id === x.pid); if (p?.died !== undefined && p.died - x.t < 86400000 && p.cause === 'blod') (x.rad as { efter: number }).efter++; } // förblödde inom ett dygn (ett år i spelet) efter striden
const st = r.s.stat ?? {}, anfall = { n: st.rovarGarTill ?? 0, sedd: st.rovarGarTillSedd ?? 0, dag: st.rovarGarTillDag ?? 0, dagSedd: st.rovarGarTillDagSedd ?? 0 }; // hur ofta gänget sågs innan det anföll
const efter = (f: Rovarflock, t?: number) => t === undefined ? undefined : Math.round((t - f.kom!) / 1000);
const avs = (f: Rovarflock) => f.ur !== undefined ? radNr(r.s.varld ?? {}, f.ur) : undefined;
const lager = (r.s.varld?.rader ?? []).filter(x => x.sort === 'rovarlager' && lever(r.s.varld!, x)).length;
const gangen = gang.map(f => ({ ur: avs(f)?.sort === 'rovarlager' ? 'läger' : avs(f) ? 'by' : 'okänd', namn: avs(f)?.namn ?? '?', vapen: vapnen.get(f) ?? [], n: f.antal ?? f.folk.length, sedd: efter(f, f.sedd), framme: efter(f, f.frammeT), anfall: efter(f, f.anfallT), dag: f.anfallT !== undefined && isLight(f.anfallT), chans: f.chans, vann: Object.values(f.tagit ?? {}).some(n => n > 0) }));
console.log(JSON.stringify({ seed, pop: r.n.pop, rader, gangen, rikt: rikt.reduce((a, x) => a + x, 0) / Math.max(1, rikt.length), lager, lagerFolk, anfall, vakter: r.vakter.length, larm: r.vakter }));
