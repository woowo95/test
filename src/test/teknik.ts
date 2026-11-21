// npm run teknik -- [by …]: när byarna kommer på varje teknik under 90 dygn (90 år i spelet), räknat från när den blev
// öppen (någon som är gammal nog kan kraven och materialet finns i byn), och arbetstimmarna byn lade på den under tiden
// (stat tekTim_, teknik.ts). En by som inte lade några timmar räknas som ointresserad, inte som långsam (steg 2.12.9).
// Byarna körs samtidigt, en per processorkärna (ca 40 s datortid per by)
import './utc';
import { createState, step, living, TEKNIK, TEK, TEKTAL, knows, canThink, hasMaterial, ageOf, ALDER, DAY, tingOf, amountOf, stationerOf, isKlar, skaRojas } from '../sim';
import { BEAT, START, STEG_DYGN, STEG_TIM } from './kor';
import { korJson, pool } from './pool';

interface Rad { oppen?: number; pa?: number; tim: number }
const DYGN = 90;
const dygn = (s: { now: number; founded: number }) => Math.round((s.now - s.founded) / DAY * 10) / 10;

// det som görs av ben (steg 12.1.151): hur många sylar, nålar och benspadar byn gjort (statistiken), och flest snaror samtidigt
const BENSAKER = { bensyl: 'bensylGjorda', nal: 'nalarGjorda', benspade: 'benspadarGjorda' }, SNARA = 'snara';
function enBy(seed: number) {
  const s = createState(seed, START), r: Record<string, Rad> = Object.fromEntries(TEKNIK.map(t => [t.id, { tim: 0 }]));
  let snaror = 0, bank: number | undefined; // bank: dygnet då byn först hade en färdig slaktbänk (steg 12.1.174)
  for (let i = 0; i < DYGN * STEG_DYGN; i++) {
    step(s, BEAT);
    if (i % STEG_TIM) continue;
    const vuxna = living(s).filter(p => ageOf(p, s.now) >= ALDER.uppfinner);
    snaror = Math.max(snaror, tingOf(s).filter(t => t.k === SNARA).length + amountOf(s, SNARA));
    if (bank === undefined && stationerOf(s).some(t => t.k === 'slaktbank' && isKlar(t))) bank = dygn(s);
    for (const t of TEKNIK) {
      const x = r[t.id];
      if (x.pa === undefined && living(s).some(p => knows(p, t.id))) x.pa = dygn(s);
      if (x.oppen === undefined && (x.pa !== undefined || (hasMaterial(s, t) && vuxna.some(p => canThink(p, t))))) x.oppen = x.pa ?? dygn(s);
    }
  }
  for (const t of TEKNIK) r[t.id].tim = Math.round(((s.stat?.['tekTim_' + t.id] as number) ?? 0) * 10) / 10;
  const ben: Record<string, number> = { ...Object.fromEntries(Object.entries(BENSAKER).map(([k, st]) => [k, Math.round((s.stat?.[st] as number) ?? 0)])), [SNARA]: snaror };
  // röjningen (steg 12.1.174): stubbarna som grävts bort och träden som står kvar där byn vill ha fritt i slutet
  const roj = { stubbar: Math.round((s.stat?.stubbarGravda as number) ?? 0), tradKvar: skaRojas(s).length };
  return { seed, folk: living(s).length, r, ben, bank, roj };
}

// medianen, med medelvärdet av de två mittersta (median i nyckeltal.ts tar det övre) och NaN för en tom lista (skrivs –)
const med = (xs: number[]) => { if (!xs.length) return NaN; const a = [...xs].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
const f = (n: number) => Number.isNaN(n) ? '–' : String(Math.round(n * 10) / 10);

// namnkolumnens bredd: det längsta namnet och två mellanslag
const NAMN = Math.max(...TEKNIK.map(t => t.namn.length)) + 2;
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--en') { console.log(JSON.stringify(enBy(Number(args[1])))); return; }
  const seeds = args.length ? args.map(Number) : [1, 2, 3, 4, 5, 6];
  const byar = await pool(seeds.map(n => () => korJson<ReturnType<typeof enBy>>('teknik.ts', ['--en', String(n)], `by ${n}`)));
  console.log(`${byar.length} byar i ${DYGN} dygn (${DYGN} år i spelet). Dygn = år i spelet; timmar = byns arbetstimmar i arbetet som låser upp, medan tekniken var öppen.`);
  console.log('✗ = medianen är längre än målet för nivån (TEKTAL.nivaDygn: ' + TEKTAL.nivaDygn.join(', ') + ' dygn för nivå 1, 2 …)');
  console.log('  ' + 'teknik'.padEnd(NAMN) + 'nivå  påkommen  öppen→påkommen dygn (median, längst)  timmar (median)  ointresserade  aldrig öppen');
  for (const t of TEKNIK) {
    const xs = byar.map(b => b.r[t.id]);
    const pa = xs.filter(x => x.pa !== undefined), vantar = xs.filter(x => x.oppen !== undefined && x.pa === undefined);
    const tid = pa.map(x => x.pa! - x.oppen!);
    const ointr = vantar.filter(x => x.tim === 0).length, langsam = vantar.length - ointr;
    const mal = TEKTAL.nivaDygn[Math.min(TEKTAL.nivaDygn.length, TEK[t.id].niva) - 1];
    console.log(`${med(tid) > mal ? '✗' : ' '} ${t.namn.padEnd(NAMN)}${String(TEK[t.id].niva).padEnd(6)}${`${pa.length}/${xs.length}`.padEnd(10)}${`${f(med(tid))}, ${f(tid.length ? Math.max(...tid) : NaN)}${langsam ? ` (+${langsam} öppna utan att komma på den)` : ''}`.padEnd(38)}${f(med(pa.map(x => x.tim))).padEnd(17)}${String(ointr).padEnd(15)}${xs.filter(x => x.oppen === undefined).length}`);
  }
  // den längsta tiden utan något nytt (öppna tekniker fanns men ingen kom på något)
  for (const b of byar) {
    const pa = Object.values(b.r).map(x => x.pa).filter((x): x is number => x !== undefined).sort((x, y) => x - y);
    let langst = 0, fran = 0; [0, ...pa].forEach((d, i, a) => { if (i && d - a[i - 1] > langst) { langst = d - a[i - 1]; fran = a[i - 1]; } });
    console.log(`by ${b.seed}: ${b.folk} invånare, ${pa.length} tekniker, längst utan något nytt ${f(langst)} dygn (från dygn ${f(fran)})`);
  }
  // det som görs av ben (steg 12.1.151): dygnen till benspaden, och sylarna, nålarna och benspadarna som gjorts och flest snaror samtidigt
  console.log('Benet: by, dygn till benspaden, gjorda sylar, nålar och benspadar, flest snaror samtidigt');
  for (const b of byar) console.log(`  by ${b.seed}: benspaden ${b.r.benspade?.pa === undefined ? 'aldrig' : `dygn ${f(b.r.benspade.pa)}`}, ${Object.entries(b.ben).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  const sum = (k: string) => byar.reduce((n, b) => n + (b.ben[k] ?? 0), 0);
  console.log(`  alla: ${Object.keys(byar[0]?.ben ?? {}).map(k => `${k} ${sum(k)}`).join(', ')}`);
  // slaktbänken och röjningen (steg 12.1.174)
  console.log('Slaktbänken och röjningen: dygnet då bänken först stod färdig, stubbar som grävts bort och träd kvar där byn vill ha fritt');
  for (const b of byar) console.log(`  by ${b.seed}: slaktbänken ${b.bank === undefined ? 'aldrig' : `dygn ${f(b.bank)}`}, stubbar ${b.roj.stubbar}, träd kvar ${b.roj.tradKvar}`);
  console.log(`  ${byar.filter(b => b.bank !== undefined).length} av ${byar.length} byar byggde slaktbänken`);
}
main();
