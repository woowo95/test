// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett (flera namn: de körs samtidigt, de korta i grupper)
import './scenarier/storlek'; // först: scenariernas byar på 120 × 120
import './utc';
import './scenarier/grund';
import './scenarier/sparning';
import './scenarier/redskap';
import './scenarier/projekt';
import './scenarier/agande';
import './scenarier/behov';
import './scenarier/natur';
import './scenarier/samlande';
import './scenarier/byggnader';
import './scenarier/folk';
import './scenarier/kontroll';
import './scenarier/religion';
import './scenarier/mastare';
import './scenarier/kultur';
import './scenarier/fas9';
import { LANG_S, SCENARIER } from './scenarier/hjalp';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Utfall, korSkript, pool, prioAv } from './pool';

const GRUPP = 6; // så många korta scenarier i varje process
// hur lång tid varje scenario tog förra gången (processorns tid, s), sparat när alla körs (steg 9.2.64): kön startar de
// längsta först, och de korta körs med lägre prioritet så att de långa får hela kärnor
const TIDER = new URL('../../test/scenariotider.json', import.meta.url);
const forraTid: Record<string, number> = existsSync(TIDER) ? JSON.parse(readFileSync(TIDER, 'utf8')) : {};
const b2n = (b: string) => b.slice(0, b.indexOf('\n'));

// Utan namn körs alla scenarier samtidigt, vart och ett i en egen process. Med ett namn körs bara det, här.
// Med --snabb körs bara de som inte är långa, och dessutom de som nämns efter: --snabb delning arv
const arg = process.argv.slice(2), snabb = arg[0] === '--snabb', grupp = arg[0] === '--grupp';
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
  const cpu0 = process.threadCpuUsage(), k = sc.kor(), ok = k.every(([, b]) => b);
  const cpu = process.threadCpuUsage(cpu0), tid = ((cpu.user + cpu.system) / 1e6).toFixed(0);
  console.log(`${ok ? 'OK  ' : 'FEL '} ${namn} (${tid} s): ${sc.text}`);
  if (!sc.lang && Number(tid) >= LANG_S) console.log(`VARNING: ${namn} tar ${tid} s (processorns tid) och bör märkas lang: true (i sin fil i src/test/scenarier/)`);
  for (const [t, b] of k) if (!ok || !b || process.env.ALLA) console.log(`     ${b ? '✓' : '✗'} ${t}`);
  if (!ok) process.exitCode = 1;
}
// en grupp korta scenarier i en process, efter varandra (uppstarten tar mer tid än de flesta scenarier). Före vart och ett
// skrivs en rad med namnet, så att utskriften kan delas upp igen
const MARK = '@@scenario ';
if (val) await korHar(val);
else if (grupp) for (const n of arg.slice(1)) { console.log(MARK + n); await korHar(n); }
else {
  const okanda = arg.filter(n => n !== '--snabb' && !SCENARIER[n]);
  if (okanda.length) { console.log(`Okänt scenario: ${okanda.join(', ')}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const namn = Object.keys(SCENARIER).filter(n => snabb ? !SCENARIER[n]!.lang || arg.includes(n) : !arg.length || arg.includes(n));
  // de långa och de med egen miljö körs var för sig, de andra i grupper om GRUPP (steg 5.5.3: sparar uppstarten)
  const ensam = (n: string) => SCENARIER[n]!.lang || SCENARIER[n]!.env;
  const gissa = (n: string) => forraTid[n] ?? (SCENARIER[n]!.lang ? 60 : 5); // ett nytt scenario utan tid
  const korta = namn.filter(n => !ensam(n)).sort((a, b) => gissa(b) - gissa(a));
  const tid = (g: string[]) => g.reduce((a, n) => a + gissa(n), 0);
  // det som tog längst tid förra gången startas först, så att alla blir klara ungefär samtidigt (steg 9.2.64);
  // utskriften kommer ändå i vanlig ordning
  const grupper = [...namn.filter(ensam).map(n => [n]), ...Array.from({ length: Math.ceil(korta.length / GRUPP) }, (_, i) => korta.slice(i * GRUPP, (i + 1) * GRUPP))]
    .sort((a, b) => tid(b) - tid(a));
  const svar: Record<string, Utfall> = {};
  await pool(grupper.map(g => async () => {
    const prio = prioAv(g.every(n => forraTid[n] !== undefined) ? tid(g) : undefined);
    if (g.length === 1) { svar[g[0]] = await korSkript('scenario.ts', g, SCENARIER[g[0]]!.env, prio); return; }
    const u = await korSkript('scenario.ts', ['--grupp', ...g], {}, prio), bitar = u.out.split(MARK).slice(1);
    for (const b of bitar) { const i = b.indexOf('\n'), n = b.slice(0, i); svar[n] = { code: /^FEL/m.test(b) ? 1 : 0, out: b.slice(i + 1), err: '' }; }
    // kraschade gruppen räknas den som kraschade med felet, och de som inte hann köras körs var för sig. Felkoden ensam är
    // ingen krasch när ett scenario i gruppen skrev FEL (då sätts den av körningen) och inget fel skrevs ut
    const sist = bitar.length ? b2n(bitar[bitar.length - 1]) : undefined;
    const forklarad = !u.err.trim() && bitar.some(b => /^FEL/m.test(b));
    if (u.code && sist && !svar[sist]!.code && !forklarad) svar[sist] = { code: u.code, out: svar[sist]!.out, err: u.err };
    for (const n of g) if (!svar[n]) svar[n] = await korSkript('scenario.ts', [n]);
  }));
  let fel = 0;
  for (const n of namn) {
    const u = svar[n];
    // kraschade det utan att skriva FEL (t.ex. efter en VARNING-rad) skrivs kraschen ut, så att den räknas som FEL
    const krasch = (u.code !== 0 || !u.out) && !/^FEL/m.test(u.out);
    if (u.code || krasch) fel++;
    process.stdout.write(u.out + (krasch ? `FEL  ${n}: kraschade\n${u.err.slice(-1500)}\n` : ''));
  }
  // tiderna sparas när alla scenarier körts (npm run scenario utan namn, och i det stora testet), avrundade
  if (!arg.length) {
    const nya: Record<string, number> = {};
    for (const n of namn) { const m = /^(?:OK|FEL) +\S+ \((\d+) s\)/m.exec(svar[n]?.out ?? ''); if (m) nya[n] = +m[1]; }
    writeFileSync(TIDER, JSON.stringify(Object.fromEntries(Object.entries({ ...forraTid, ...nya }).filter(([n]) => SCENARIER[n]).sort(([a], [b]) => a < b ? -1 : 1)), null, 1) + '\n');
  }
  const hoppade = Object.keys(SCENARIER).filter(n => !namn.includes(n));
  if (snabb && hoppade.length) console.log(`(hoppade över de långa: ${hoppade.join(', ')})`);
  if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
}
