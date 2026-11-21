// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett (flera namn: de körs samtidigt, de korta i grupper)
// --karta (det stora testet): kartan för npm run riktad byggs samtidigt, ur V8:s täckning (kartan.ts)
// De röda scenarierna sparas (RODA i pool.ts), så att npm run riktad -- --roda kan köra om dem efter en rättning
import './scenarier/storlek'; // först: scenariernas byar på 120 × 120
import './utc';
import './scenarier/alla';
import { LANG_S, SCENARIER } from './scenarier/hjalp';
import { gangLangsam, gangVakt } from '../sim/gang';
import { svavar, uttagVakt } from '../sim/lager';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { RODA, Utfall, korSkript, pool, prioAv } from './pool';
import { lasTackning, sparaKarta, tackningsMapp, tackningsMiljo } from './kartan';
import { ui } from '../ui/lage';
import { stangAllaHjalp } from '../ui/hjalp';
import * as SIM from '../sim';

const GRUPP = 6; // så många korta scenarier i varje process
// hur lång tid varje scenario tog förra gången (processorns tid, s), sparat när alla körs (steg 9.2.64): kön startar de
// längsta först, och de korta körs med lägre prioritet så att de långa får hela kärnor
const TIDER = new URL('../../test/scenariotider.json', import.meta.url);
const forraTid: Record<string, number> = existsSync(TIDER) ? JSON.parse(readFileSync(TIDER, 'utf8')) : {};
const b2n = (b: string) => b.slice(0, b.indexOf('\n'));

// Utan namn körs alla scenarier samtidigt, vart och ett i en egen process. Med ett namn körs bara det, här.
// Med --snabb körs bara de som inte är långa, och dessutom de som nämns efter: --snabb delning arv
// Med --del n/m (steg 12.1.171) körs del n av m: scenarierna delas efter förra gångens tid (test/scenariotider.json, som är
// committad), det längsta först till den del som har minst tid, så att delarna tar ungefär lika lång tid och tillsammans täcker
// alla. På samma commit får varje chatt samma delning
const delArg = process.argv.indexOf('--del'), del = delArg > 0 ? /^(\d+)\/(\d+)$/.exec(process.argv[delArg + 1] ?? '') : null;
if (delArg > 0 && (!del || +del[1] < 1 || +del[1] > +del[2])) { console.log('--del skrivs n/m, t.ex. --del 2/4'); process.exit(1); }
const karta = process.argv.includes('--karta'), arg = process.argv.slice(2).filter((a, i) => a !== '--karta' && i !== delArg - 2 && i !== delArg - 1), snabb = arg[0] === '--snabb', grupp = arg[0] === '--grupp';
const val = !snabb && !grupp && arg.length === 1 ? arg[0] : undefined;
// ett scenario här, i den här processen. Tiden är processorns tid för scenariot (ungefär tiden när det körs ensamt).
// Väggklockan beror på hur mycket annat datorn gör samtidigt och kan vara flera gånger längre när alla körs på en gång
async function korHar(namn: string) {
  const sc = SCENARIER[namn];
  if (!sc) { console.log(`Okänt scenario: ${namn}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  // SCENARIO_MILJO: den här processen startades redan med scenariots miljö. Miljön kan ändå se fel ut (storlek.ts lägger
  // till karta.bredd och karta.hojd i BALANS), och utan märket startade scenariot sig självt i en evig kedja
  const env = process.env.SCENARIO_MILJO ? [] : Object.entries(sc.env ?? {}).filter(([k, v]) => process.env[k] !== v);
  if (env.length) { // fel miljö (t.ex. tidszon): scenariot körs om i en egen process med rätt miljö
    const u = await korSkript('scenario.ts', [namn], { ...Object.fromEntries(env), SCENARIO_MILJO: '1' });
    process.stdout.write(u.out + u.err); if (u.code) process.exitCode = u.code;
    return;
  }
  // vakten för långsam gång (steg 9.2.101): ett larm blir en kontroll som inte går igenom
  let langsam: string | undefined, nLangsam = 0;
  gangVakt.lyss = (s, p, rutor, mork) => { const t = gangLangsam(s, p, rutor, mork); if (t) { nLangsam++; langsam ??= t; } };
  // vakten för det som svävar (steg 11.1.77): ett uttag ur en stack som den som tar inte står vid
  let svav: string | undefined, nSvav = 0;
  uttagVakt.lyss = (_s, p, k, _n, x, y) => { if (p && svavar(p, x, y)) { nSvav++; svav ??= `${p.name} (${p.task?.act ?? 'ingen uppgift'}) tog ${k} ${Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y).toFixed(0)} rutor bort`; } };
  // gränssnittets läge börjar som i ett nytt spel: i en grupp lämnade ett scenario annars kvar en vald flik åt nästa (handlarrel
  // lämnade relationerna öppna, och handslag såg då inte bytena)
  Object.assign(ui, structuredClone(UI_START)); stangAllaHjalp(); // och inget är utfällt (gudar lämnade Övriga trosriktningar öppna, steg 12.1.113)
  const register0 = registerBild();
  const cpu0 = process.threadCpuUsage(), k = await sc.kor(); // ett scenario får vänta på något (sparbas: databasen)
  gangVakt.lyss = undefined; uttagVakt.lyss = undefined;
  // vakten för det som blir kvar (steg 12.1.113): ett register eller annat i simuleringen som scenariot ändrat och inte ställt tillbaka
  const andrat = registerAndrat(register0);
  if (andrat.length) k.push([`vakten: scenariot lämnar ${andrat.join(', ')} ändrat efter sig (ställ tillbaka det i en finally)`, false]);
  if (svav) k.push([`vakten: något svävar (${nSvav} ggr), första: ${svav}`, false]);
  if (langsam) k.push([`vakten: någon går mycket långsamt utan flera skäl (${nLangsam} ggr), första: ${langsam}`, false]);
  const ok = k.every(([, b]) => b);
  const cpu = process.threadCpuUsage(cpu0), tid = ((cpu.user + cpu.system) / 1e6).toFixed(0);
  console.log(`${ok ? 'OK  ' : 'FEL '} ${namn} (${tid} s): ${sc.text}`);
  if (!sc.lang && Number(tid) >= LANG_S) console.log(`VARNING: ${namn} tar ${tid} s (processorns tid) och bör märkas lang: true (i sin fil i src/test/scenarier/)`);
  for (const [t, b] of k) if (!ok || !b || process.env.ALLA) console.log(`     ${b ? '✓' : '✗'} ${t}`);
  if (!ok) process.exitCode = 1;
}
// allt simuleringen exporterar som inte är en funktion, som text: register, balanstal och provlägen (som TRO_PROV). Det som
// skiljer sig efter ett scenario blir kvar till nästa scenario i samma process (steg 12.1.113)
function registerBild() {
  const ut = new Map<string, string>();
  for (const [k, v] of Object.entries(SIM)) if (v !== null && typeof v === 'object') { try { ut.set(k, JSON.stringify(v)); } catch { /* går inte att skriva som text */ } }
  return ut;
}
function registerAndrat(fore: Map<string, string>) {
  const nu = registerBild();
  return [...fore].filter(([k, v]) => nu.get(k) !== v).map(([k]) => k);
}
// en grupp korta scenarier i en process, efter varandra (uppstarten tar mer tid än de flesta scenarier). Före vart och ett
// skrivs en rad med namnet, så att utskriften kan delas upp igen
const MARK = '@@scenario ';
const UI_START = structuredClone(ui);
if (val) await korHar(val);
else if (grupp) for (const n of arg.slice(1)) { console.log(MARK + n); await korHar(n); }
else {
  const okanda = arg.filter(n => n !== '--snabb' && !SCENARIER[n]);
  if (okanda.length) { console.log(`Okänt scenario: ${okanda.join(', ')}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const namn = Object.keys(SCENARIER).filter(n => snabb ? !SCENARIER[n]!.lang || arg.includes(n) : !arg.length || arg.includes(n));
  if (del) { // bara den egna delen
    const [n, m] = [+del[1], +del[2]], sum = new Array<number>(m).fill(0), egen = new Set<string>();
    const tidAv = (k: string) => forraTid[k] ?? (SCENARIER[k]!.lang ? 60 : 5);
    for (const k of [...namn].sort((a, b) => tidAv(b) - tidAv(a) || (a < b ? -1 : 1))) {
      const d = sum.indexOf(Math.min(...sum)); sum[d] += tidAv(k) + 1; // + 1: uppstarten
      if (d === n - 1) egen.add(k);
    }
    namn.splice(0, namn.length, ...namn.filter(k => egen.has(k)));
    console.log(`(del ${n} av ${m}: ${namn.length} scenarier, ungefär ${sum[n - 1]} s processortid)`);
  }
  // de långa och de med egen miljö körs var för sig, de andra i grupper om GRUPP (steg 5.5.3: sparar uppstarten)
  const ensam = (n: string) => SCENARIER[n]!.lang || SCENARIER[n]!.env;
  const gissa = (n: string) => forraTid[n] ?? (SCENARIER[n]!.lang ? 60 : 5); // ett nytt scenario utan tid
  const korta = namn.filter(n => !ensam(n)).sort((a, b) => gissa(b) - gissa(a));
  const tid = (g: string[]) => g.reduce((a, n) => a + gissa(n), 0);
  // det som tog längst tid förra gången startas först, så att alla blir klara ungefär samtidigt (steg 9.2.64);
  // utskriften kommer ändå i vanlig ordning
  const grupper = [...namn.filter(ensam).map(n => [n]), ...Array.from({ length: Math.ceil(korta.length / GRUPP) }, (_, i) => korta.slice(i * GRUPP, (i + 1) * GRUPP))]
    .sort((a, b) => tid(b) - tid(a));
  const svar: Record<string, Utfall> = {}, tackning: Record<string, Set<string>> = {};
  // med --karta får varje process en mapp för täckningen, och funktionerna räknas för alla scenarier i den
  const tack = (g: string[]): Record<string, string> => karta ? tackningsMiljo(tackningsMapp(g[0])) : {};
  const lasT = (g: string[], env: Record<string, string>) => { if (env.TACKNING) { const f = lasTackning(env.TACKNING); for (const n of g) tackning[n] = f; } };
  // ingen tidsgräns efter förra gångens tid: ett scenario som hängt sig stoppas av pulsen (pool.ts), ett långsamt aldrig
  await pool(grupper.map(g => async () => {
    const kant = g.every(n => forraTid[n] !== undefined), prio = prioAv(kant ? tid(g) : undefined), env = tack(g);
    if (g.length === 1) { svar[g[0]] = await korSkript('scenario.ts', g, { ...SCENARIER[g[0]]!.env, ...env }, prio); lasT(g, env); return; }
    const u = await korSkript('scenario.ts', ['--grupp', ...g], env, prio), bitar = u.out.split(MARK).slice(1);
    lasT(g, env);
    for (const b of bitar) { const i = b.indexOf('\n'), n = b.slice(0, i); svar[n] = { code: /^FEL/m.test(b) ? 1 : 0, out: b.slice(i + 1), err: '' }; }
    // kraschade gruppen räknas den som kraschade med felet, och de som inte hann köras körs var för sig. Felkoden ensam är
    // ingen krasch när ett scenario i gruppen skrev FEL (då sätts den av körningen) och inget fel skrevs ut
    const sist = bitar.length ? b2n(bitar[bitar.length - 1]) : undefined;
    const forklarad = !u.err.trim() && bitar.some(b => /^FEL/m.test(b));
    if (u.code && sist && !svar[sist]!.code && !forklarad) svar[sist] = { code: u.code, out: svar[sist]!.out, err: u.err };
    for (const n of g) if (!svar[n]) { const e = tack([n]); svar[n] = await korSkript('scenario.ts', [n], e); lasT([n], e); }
  }));
  let fel = 0;
  const roda: string[] = [];
  for (const n of namn) {
    const u = svar[n];
    // kraschade det utan att skriva FEL (t.ex. efter en VARNING-rad) skrivs kraschen ut, så att den räknas som FEL
    const krasch = (u.code !== 0 || !u.out) && !/^FEL/m.test(u.out);
    if (u.code || krasch) { fel++; roda.push(n); }
    process.stdout.write(u.out + (krasch ? `FEL  ${n}: kraschade\n${u.err.slice(-1500)}\n` : ''));
  }
  // tiderna sparas när alla scenarier körts (npm run scenario utan namn, och i det stora testet), avrundade
  if (!arg.length && !del) {
    const nya: Record<string, number> = {};
    for (const n of namn) { const m = /^(?:OK|FEL) +\S+ \((\d+) s\)/m.exec(svar[n]?.out ?? ''); if (m) nya[n] = +m[1]; }
    writeFileSync(TIDER, JSON.stringify(Object.fromEntries(Object.entries({ ...forraTid, ...nya }).filter(([n]) => SCENARIER[n]).sort(([a], [b]) => a < b ? -1 : 1)), null, 1) + '\n');
    if (karta) { const k = sparaKarta(tackning); console.log(`(kartan för riktad byggd: ${k.scenarier} scenarier och ${k.funktioner} funktioner)`); }
  }
  // de röda: de som var röda förut och inte kördes nu, och de som är röda nu
  const forut: string[] = existsSync(RODA) ? JSON.parse(readFileSync(RODA, 'utf8')) : [];
  mkdirSync(dirname(RODA), { recursive: true });
  writeFileSync(RODA, JSON.stringify([...new Set([...forut.filter(n => !namn.includes(n) && SCENARIER[n]), ...roda])]));
  const hoppade = Object.keys(SCENARIER).filter(n => !namn.includes(n));
  if (snabb && hoppade.length) console.log(`(hoppade över de långa: ${hoppade.join(', ')})`);
  if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
}
