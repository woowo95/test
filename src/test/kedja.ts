// npm run kedja -- "kommando 1" "kommando 2" …: långa tester efter varandra i samma mapp (steg 10.11.26). Varje kommando körs i
// skalet, med sin utskrift som vanligt (t.ex. "npm run -s balans -- 24 35 > ut.txt"). Går ett kommando fel (felkoden är inte 0)
// stannar kedjan genast och säger vilket det var, så att datorn inte står still med resten av kedjan ogjord. Efter varje
// kommando skrivs de filer i mappen som ändrats (git status), så att det syns om ett test lämnat något efter sig som nästa
// kommando kan snubbla på.
import { spawnSync } from 'node:child_process';

const kommandon = process.argv.slice(2);
if (!kommandon.length) { console.log('Skriv kommandona inom citattecken: npm run kedja -- "npm run -s koll > koll.txt" "npm run -s likhet"'); process.exit(1); }
const klocka = () => new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Stockholm' });
const t0 = Date.now();
for (const [i, k] of kommandon.entries()) {
  const a = Date.now();
  console.log(`[${klocka()}] ${i + 1}/${kommandon.length}: ${k}`);
  const r = spawnSync(k, { shell: true, stdio: 'inherit' });
  const kod = r.status ?? 1, min = ((Date.now() - a) / 60_000).toFixed(0);
  const andrat = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.split('\n').filter(r => r.trim() && !r.endsWith('node_modules') && !r.endsWith('node_modules/'));
  console.log(`[${klocka()}] ${i + 1}/${kommandon.length} klart efter ${min} min (datorns tid), felkod ${kod}${andrat.length ? `; ändrade filer: ${andrat.length} (${andrat.slice(0, 3).map(r => r.slice(3)).join(', ')}${andrat.length > 3 ? ' …' : ''})` : ''}`);
  if (kod) {
    console.log(`KEDJAN STANNADE vid ${i + 1}/${kommandon.length}: ${k} (felkod ${kod}). Ogjort: ${kommandon.slice(i + 1).join(' | ') || 'inget'}`);
    process.exit(kod);
  }
}
console.log(`KEDJAN KLAR: ${kommandon.length} kommandon på ${((Date.now() - t0) / 60_000).toFixed(0)} min (datorns tid).`);
