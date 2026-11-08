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
import './scenarier/byggnader';
import './scenarier/folk';
import './scenarier/kontroll';
import './scenarier/religion';
import './scenarier/mastare';
import './scenarier/kultur';
import './scenarier/fas9';
import { LANG_S, SCENARIER } from './scenarier/hjalp';
import { Utfall, korSkript, pool } from './pool';

const GRUPP = 6; // så många korta scenarier i varje process
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
  const env = Object.entries(sc.env ?? {}).filter(([k, v]) => process.env[k] !== v);
  if (env.length) { // fel miljö (t.ex. tidszon): scenariot körs om i en egen process med rätt miljö
    const u = await korSkript('scenario.ts', [namn], Object.fromEntries(env));
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
  // de långa startas först, så att alla blir klara ungefär samtidigt; utskriften kommer ändå i vanlig ordning
  const ordning = [...namn.filter(n => SCENARIER[n]!.lang), ...namn.filter(n => !SCENARIER[n]!.lang)];
  const svar: Record<string, Utfall> = {};
  // de långa och de med egen miljö körs var för sig, de andra i grupper om GRUPP (steg 5.5.3: sparar uppstarten)
  const ensam = (n: string) => SCENARIER[n]!.lang || SCENARIER[n]!.env, korta = ordning.filter(n => !ensam(n));
  const grupper = [...ordning.filter(ensam).map(n => [n]), ...Array.from({ length: Math.ceil(korta.length / GRUPP) }, (_, i) => korta.slice(i * GRUPP, (i + 1) * GRUPP))];
  await pool(grupper.map(g => async () => {
    if (g.length === 1) { svar[g[0]] = await korSkript('scenario.ts', g, SCENARIER[g[0]]!.env); return; }
    const u = await korSkript('scenario.ts', ['--grupp', ...g]), bitar = u.out.split(MARK).slice(1);
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
  const hoppade = Object.keys(SCENARIER).filter(n => !namn.includes(n));
  if (snabb && hoppade.length) console.log(`(hoppade över de långa: ${hoppade.join(', ')})`);
  if (fel) { console.log(`${fel} scenario misslyckades.`); process.exitCode = 1; }
}
