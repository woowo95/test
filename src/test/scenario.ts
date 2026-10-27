// Scenariotester: ställ en by i ett visst läge, kör den en stund och kontrollera att det som ska hända händer.
// npm run scenario            kör alla
// npm run scenario -- glanta  kör bara ett (flera namn: de körs samtidigt)
import './scenarier/grund';
import './scenarier/sparning';
import './scenarier/redskap';
import './scenarier/projekt';
import './scenarier/agande';
import './scenarier/behov';
import './scenarier/natur';
import './scenarier/byggnader';
import './scenarier/folk';
import './scenarier/kontroll';
import { LANG_S, SCENARIER } from './scenarier/hjalp';
import { Utfall, korSkript, pool } from './pool';

// Utan namn körs alla scenarier samtidigt, vart och ett i en egen process. Med ett namn körs bara det, här.
// Med --snabb körs bara de som inte är långa, och dessutom de som nämns efter: --snabb delning arv
const arg = process.argv.slice(2), snabb = arg[0] === '--snabb', val = !snabb && arg.length === 1 ? arg[0] : undefined;
if (val) {
  const sc = SCENARIER[val];
  if (!sc) { console.log(`Okänt scenario: ${val}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const env = Object.entries(sc.env ?? {}).filter(([k, v]) => process.env[k] !== v);
  if (env.length) { // fel miljö (t.ex. tidszon): scenariot körs om i en egen process med rätt miljö
    const u = await korSkript('scenario.ts', [val], Object.fromEntries(env));
    process.stdout.write(u.out + u.err); process.exitCode = u.code;
  } else {
    // tiden är processorns tid för scenariot (ungefär tiden när det körs ensamt). Väggklockan beror på hur mycket annat
    // datorn gör samtidigt och kan vara flera gånger längre när alla scenarier körs på en gång
    const cpu0 = process.threadCpuUsage(), k = sc.kor(), ok = k.every(([, b]) => b);
    const cpu = process.threadCpuUsage(cpu0), tid = ((cpu.user + cpu.system) / 1e6).toFixed(0);
    console.log(`${ok ? 'OK  ' : 'FEL '} ${val} (${tid} s): ${sc.text}`);
    if (!sc.lang && Number(tid) >= LANG_S) console.log(`VARNING: ${val} tar ${tid} s (processorns tid) och bör märkas lang: true (i sin fil i src/test/scenarier/)`);
    for (const [t, b] of k) if (!ok || !b || process.env.ALLA) console.log(`     ${b ? '✓' : '✗'} ${t}`);
    if (!ok) process.exitCode = 1;
  }
} else {
  const okanda = arg.filter(n => n !== '--snabb' && !SCENARIER[n]);
  if (okanda.length) { console.log(`Okänt scenario: ${okanda.join(', ')}. Finns: ${Object.keys(SCENARIER).join(', ')}`); process.exit(1); }
  const namn = Object.keys(SCENARIER).filter(n => snabb ? !SCENARIER[n]!.lang || arg.includes(n) : !arg.length || arg.includes(n));
  // de långa startas först, så att alla blir klara ungefär samtidigt; utskriften kommer ändå i vanlig ordning
  const ordning = [...namn.filter(n => SCENARIER[n]!.lang), ...namn.filter(n => !SCENARIER[n]!.lang)];
  const svar: Record<string, Utfall> = {};
  await pool(ordning.map(n => async () => { svar[n] = await korSkript('scenario.ts', [n], SCENARIER[n]!.env); }));
  let fel = 0;
  for (const n of namn) {
    const u = svar[n];
    // kraschade det utan att skriva FEL (t.ex. efter en VARNING-rad) skrivs kraschen ut, så att den räknas som FEL
    const krasch = (u.code !== 0 || !u.out) && !/^FEL/m.test(u.out);
    if (u.code || krasch) fel++;
    process.stdout.write(u.out + (krasch ? `FEL  ${n}: kraschade\n${u.err.slice(-1500)}\n` : ''));
  }
  const hoppade = Object.keys(SCENARIER).filter(n => !namn.includes(n));
  if (hoppade.length && (snabb || !arg.length)) console.log(`(hoppade över de långa: ${hoppade.join(', ')})`);
  if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
}
