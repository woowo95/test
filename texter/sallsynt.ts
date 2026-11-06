// Varför mallarna som aldrig användes i npm run texter aldrig valdes (uppgift 3f i texter/README.md): kör en by i [dygn]
// och räknar det som mallarna kräver. Underlag för textchatten; ändrar inget i spelet.
import { step, BEAT, createState, living } from '../src/sim';
import { START, STEG_DYGN } from '../src/test/kor';
import { MASTERVERK } from '../src/sim/kvalitet';

const [seed, dagar] = process.argv.slice(2).map(Number);
const s = createState(seed, START);
let mastare = 0, mastarverk = 0;
for (let i = 0; i < dagar * STEG_DYGN; i++) step(s, BEAT);
for (const t of [...(s.ting ?? []), ...(s.stationer ?? [])] as { q?: number; ber?: { namn?: string } }[]) if ((t.q ?? 0) >= MASTERVERK) mastarverk++;
for (const p of living(s)) if (Object.values(p.skills ?? {}).some(v => (v as number) >= 16)) mastare++;
const hus = s.hus ?? [];
console.log(JSON.stringify({ seed, dygn: dagar, invanare: living(s).length, mastare, mastarverk, ting_q: Object.entries((s.ting ?? []).reduce((a, t) => (a[t.q ?? -1] = (a[t.q ?? -1] ?? 0) + 1, a), {} as Record<number, number>)),
  hus: hus.length, husMedAgare: hus.filter(h => h.ag !== undefined).length, husAgareKlar: hus.filter(h => h.ag !== undefined && h.klar !== undefined).length,
  vardat5: living(s).filter(p => ((p as { vardat?: number }).vardat ?? 0) >= 5).length, ledare: s.styre?.ledare !== undefined,
  stat: Object.fromEntries(Object.entries(s.stat ?? {}).filter(([k]) => /straff|dom|utvis|skadad|atergrund|vargjakt|masterverk|perfekt|vard/.test(k))) }));
