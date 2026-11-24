// Samma strider många gånger i arenan (steg B.10): en av varje sort med lika starka och skickliga vuxna (egenskaperna 10), utan byn
// omkring. Används av npm run strid, och själv (npx tsx src/test/strid-arena.ts [antal]) när stridens tal prövas
import './utc';
import * as SIM from '../sim';

const m = (id: number, sida: 0 | 1, vapen: SIM.Vapen, y: number) => ({ id, namn: `K${id}`, sida, st: { styrka: 10, uthallighet: 10, mod: 10, smidighet: 10, skicklighet: 10 }, vapen, klader: [] as string[], fart: 1, x: sida ? 13 : 3, y });
const djur = (art: string, id: number, y: number, led = false) => { const k = SIM.djurKampe(art, id, 1, 13, y); if (led) k.ledare = 'fram'; return k; };
const rad = (n: number, id0: number, sida: 0 | 1, vapen: SIM.Vapen) => Array.from({ length: n }, (_, i) => m(id0 + i, sida, vapen, 4 + i - (n - 1) / 2));
const u = (avsikt: SIM.Avsikt, ...k: SIM.Uppstallning['kampar']): SIM.Uppstallning => ({ avsikt, w: 16, h: 8, kampar: k });
export const ARENOR: [string, SIM.Uppstallning][] = [
  ['tre med spjut mot tre rövare med yxa', u('skada', ...rad(3, 1, 0, 'flintspjut'), ...rad(3, 4, 1, 'yxa'))],
  ['en med yxa mot en med yxa, för att skada', u('skada', m(1, 0, 'yxa', 4), m(2, 1, 'yxa', 4))],
  ['en med yxa mot en med yxa, för att döda', u('doda', m(1, 0, 'yxa', 4), m(2, 1, 'yxa', 4))],
  ['slagsmål, en mot en', u('slagsmal', m(1, 0, 'hand', 4), m(2, 1, 'hand', 4))],
  ['brottning, en mot en', u('brottning', m(1, 0, 'hand', 4), m(2, 1, 'hand', 4))],
  ['lek, en mot en', u('lek', m(1, 0, 'hand', 4), m(2, 1, 'hand', 4))],
  ['en obeväpnad mot en varg', u('doda', m(1, 0, 'hand', 4), djur('varg', 2, 4))],
  ['en med spjut mot en varg', u('doda', m(1, 0, 'flintspjut', 4), djur('varg', 2, 4))],
  ['tre med spjut mot fyra vargar', u('doda', ...rad(3, 1, 0, 'flintspjut'), djur('varg', 4, 2.5, true), djur('varg', 5, 3.5), djur('varg', 6, 4.5), djur('varg', 7, 5.5))],
  ['en med spjut mot ett vildsvin', u('doda', m(1, 0, 'flintspjut', 4), djur('vildsvin', 2, 4))],
  ['en med spjut mot björnen', u('doda', m(1, 0, 'flintspjut', 4), djur('bjorn', 2, 4))],
  ['tre med spjut mot björnen', u('doda', ...rad(3, 1, 0, 'flintspjut'), djur('bjorn', 4, 4))],
  ['fem med spjut mot björnen', u('doda', ...rad(5, 1, 0, 'flintspjut'), djur('bjorn', 6, 4))],
];
export function arenan(n: number) {
  for (const [namn, uu] of ARENOR) {
    const t: number[] = [], v = [0, 0, 0], f: Record<string, number> = {}, slut: Record<string, number>[] = [{}, {}], antal = [0, 0];
    for (let i = 0; i < n; i++) {
      const st = SIM.stridTillSlut(SIM.nyStrid(uu, 7919 * (i + 1)));
      t.push(st.slut!.t); v[st.slut!.vinnare < 0 ? 2 : st.slut!.vinnare]++;
      for (const x of st.logg) if (x.sl && !x.kast) f[x.h] = (f[x.h] ?? 0) + 1;
      for (const k of st.kampar) {
        antal[k.sida]++;
        const j = st.logg.reduce((a, x, q) => x.a === k.id && ['dod', 'nere', 'kryper', 'ger', 'flykt', 'avstar'].includes(x.h) ? q : a, -1), r = st.logg[j], g = st.logg[j - 1];
        const s = k.lage === 'strid' ? 'står' : k.lage === 'dod' ? (k.blod >= SIM.HALSA.blodDod && g && (g.b === k.id && (g.h === 'traff' || g.h === 'hugg') || g.h === 'fastnar' && g.a === k.id) ? 'dog direkt' : 'förblödde') : r?.h === 'avstar' ? 'drog sig undan' : k.lage === 'nere' ? 'för skadad' : k.lage === 'ger' ? 'gav upp' : 'flydde';
        slut[k.sida][s] = (slut[k.sida][s] ?? 0) + 1;
      }
    }
    t.sort((a, b) => a - b);
    const tot = Object.values(f).reduce((a, b) => a + b, 0) || 1, p = (x: number) => `${Math.round(100 * x / tot)} %`;
    const per = (sd: 0 | 1) => Object.entries(slut[sd]).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${Math.round(100 * c / antal[sd])} %`).join(', ');
    console.log(`  ${namn}: vann ${Math.round(100 * v[0] / n)} %, förlorade ${Math.round(100 * v[1] / n)} %, oavgjort ${Math.round(100 * v[2] / n)} %; längd ${Math.round(t[n >> 1])} s (${Math.round(t[n >> 2])}–${Math.round(t[Math.floor(n * 3 / 4)])}); träffar ${p((f.traff ?? 0) + (f.tog ?? 0))}, parerar ${p(f.parera ?? 0)}, duckar ${p(f.duck ?? 0)}, missar ${p(f.miss ?? 0)}, knuffar ${p((f.knuff ?? 0) + (f.omkull ?? 0))}; slut: ${per(0)} | ${per(1)}`);
  }
}
if (process.argv[1]?.endsWith('strid-arena.ts')) arenan(Number(process.argv[2] ?? 300));
