// npm run kedja -- "kommando 1" "kommando 2" …: långa tester efter varandra i samma mapp (steg 10.11.26). Varje kommando körs i
// skalet, och utskriften visas som vanligt och sparas dessutom i node_modules/.cache/kedja/ (en fil per kommando).
// Felen samlas i ett varv (testkedjan efter v530): bara det som gör resten meningslöst stoppar kedjan genast, alltså typfel, en
// krasch eller ett vaktlarm i byarna (felkoden ALLVARLIGT i pool.ts; tsc ger samma felkod vid typfel). Allt annat rött (ett
// scenario, en iakttagare, en by som inte är lika i likheten) skrivs i en lista i slutet, och kedjan går vidare med nästa
// kommando. Efter varje kommando skrivs de filer i mappen som ändrats (git status), så att det syns om ett test lämnat något
// efter sig som nästa kommando kan snubbla på.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALLVARLIGT } from './pool';

const kommandon = process.argv.slice(2);
if (!kommandon.length) { console.log('Skriv kommandona inom citattecken: npm run kedja -- "npm run -s koll" "npm run -s likhet"'); process.exit(1); }
const klocka = () => new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Stockholm' });
const UT = `${process.cwd()}/node_modules/.cache/kedja/${new Date().toISOString().replace(/[:.]/g, '-')}/`;
mkdirSync(UT, { recursive: true });
// raderna som säger vad som är rött, och raderna under en rubrik som VAKTER LARMAR
const ROTT = /^(FEL|TYPFEL|VAKTER LARMAR|NYA VAKTLARM|VAKTLARM|ANNAN UTVECKLING|ÅTERGRUNDADE|AVBRUTET|BYAR KRASCHADE|TESTET KRASCHADE|SCENARIERNA KRASCHADE)|^\s+✗|OLIKA|kraschade|stoppad/;
const rodaRader = (text: string) => {
  const ut: string[] = [];
  let under = false;
  for (const r of text.split('\n')) {
    if (ROTT.test(r)) { ut.push(r); under = /:$/.test(r.trim()); continue; }
    if (under && /^\s+\S/.test(r)) { ut.push(r); continue; }
    under = false;
  }
  return ut;
};
const kor = (k: string, fil: string) => new Promise<number>(ok => {
  let text = '';
  const c = spawn(k, { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  c.stdout.setEncoding('utf8'); c.stderr.setEncoding('utf8');
  c.stdout.on('data', d => { text += d; process.stdout.write(d); });
  c.stderr.on('data', d => { text += d; process.stderr.write(d); });
  c.on('close', kod => { writeFileSync(fil, text); roda.set(k, rodaRader(text)); ok(kod ?? 1); });
});
const roda = new Map<string, string[]>(), fel: { k: string; kod: number; fil: string }[] = [];
const t0 = Date.now();
let stannade = '';
for (const [i, k] of kommandon.entries()) {
  const a = Date.now(), fil = `${UT}${i + 1}.txt`;
  console.log(`[${klocka()}] ${i + 1}/${kommandon.length}: ${k}`);
  const kod = await kor(k, fil), min = ((Date.now() - a) / 60_000).toFixed(0);
  const andrat = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.split('\n').filter(r => r.trim() && !r.endsWith('node_modules') && !r.endsWith('node_modules/'));
  console.log(`[${klocka()}] ${i + 1}/${kommandon.length} klart efter ${min} min (datorns tid), felkod ${kod}${andrat.length ? `; ändrade filer: ${andrat.length} (${andrat.slice(0, 3).map(r => r.slice(3)).join(', ')}${andrat.length > 3 ? ' …' : ''})` : ''}`);
  if (kod) fel.push({ k, kod, fil });
  if (kod === ALLVARLIGT) { stannade = `KEDJAN STANNADE vid ${i + 1}/${kommandon.length}: ${k} (typfel, en krasch eller ett vaktlarm). Ogjort: ${kommandon.slice(i + 1).join(' | ') || 'inget'}`; break; }
}
const tid = `${((Date.now() - t0) / 60_000).toFixed(0)} min (datorns tid)`;
console.log('\n==== Sammanfattning av kedjan ====');
if (!fel.length) console.log(`KEDJAN KLAR: alla ${kommandon.length} kommandon gröna på ${tid}.`);
else {
  console.log(`RÖTT i ${fel.length} av ${kommandon.length} kommandon (${tid}):`);
  for (const f of fel) {
    console.log(`- ${f.k} (felkod ${f.kod}${f.kod === ALLVARLIGT ? ', allvarligt' : ''}), hela utskriften i ${f.fil}`);
    const r = roda.get(f.k) ?? [];
    for (const x of r.slice(0, 40)) console.log('    ' + x.trim());
    if (r.length > 40) console.log(`    … och ${r.length - 40} rader till`);
    if (!r.length) console.log('    (inga röda rader i utskriften; skrev kommandot till en fil?)');
  }
  if (stannade) console.log(stannade);
  process.exitCode = stannade ? ALLVARLIGT : 1;
}
