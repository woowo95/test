// Testerna mäter datorn (steg 9.2.61): medan ett långt test går läser mätaren var annan sekund hur mycket processortid testet
// och alla processer det startat har använt (ps, som finns på Macen och i Linux) och hur mycket minne de tar. Sist skriver
// testet antalet kärnor, hur många som arbetade i snitt, hur länge en, två och upp till alla kärnor arbetade samtidigt och det
// största minnet. Går minnet över hälften av datorns stoppas testet med ett larm i stället för att datorn hänger sig.
// Filen importerar inget från simuleringen.
import { execFileSync } from 'node:child_process';
import { cpus, totalmem } from 'node:os';

const VAR_MS = 2000, MINNE_TAK = 0.5; // hur ofta mätaren läser, och hur stor del av datorns minne testet får ta
// ps:s tid: "m:ss.cc" eller "h:mm:ss" (Macen) och "[dd-]hh:mm:ss" (Linux), i sekunder
function sek(t: string) {
  const [d, rest] = t.includes('-') ? t.split('-') : ['0', t];
  return rest.split(':').reduce((a, x) => a * 60 + Number(x), 0) + Number(d) * 86400;
}
// alla processer som hör till testet: den här och alla den startat, också de som startat egna grupper (steg 9.2.60)
function las(): { cpu: Map<number, number>; rss: number } {
  let ut = '';
  try { ut = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,time=,rss='], { encoding: 'utf8' }); } catch { return { cpu: new Map(), rss: 0 }; }
  const rader = ut.trim().split('\n').map(r => r.trim().split(/\s+/)).map(([pid, ppid, t, rss]) => ({ pid: +pid, ppid: +ppid, t: sek(t), rss: +rss }));
  const barn = new Map<number, typeof rader>();
  for (const r of rader) { const l = barn.get(r.ppid) ?? []; l.push(r); barn.set(r.ppid, l); }
  const cpu = new Map<number, number>(); let rss = 0;
  const ga = (pid: number) => { for (const r of barn.get(pid) ?? []) { cpu.set(r.pid, r.t); rss += r.rss; ga(r.pid); } };
  const jag = rader.find(r => r.pid === process.pid);
  if (jag) { cpu.set(jag.pid, jag.t); rss += jag.rss; }
  ga(process.pid);
  return { cpu, rss: rss * 1024 };
}

export function startaMatare(stoppa?: () => void) {
  const karnor = cpus().length, tak = totalmem() * MINNE_TAK, t0 = Date.now();
  const tid = new Array<number>(karnor + 1).fill(0); // sekunder med 0, 1 … alla kärnor i arbete
  let forra = las(), forraT = Date.now(), summa = 0, maxRss = forra.rss, larm = '';
  const h = setInterval(() => {
    const nu = las(), t = Date.now(), dt = (t - forraT) / 1000;
    let d = 0;
    for (const [pid, c] of nu.cpu) d += Math.max(0, c - (forra.cpu.get(pid) ?? c));
    summa += d; maxRss = Math.max(maxRss, nu.rss);
    tid[Math.min(karnor, Math.max(0, Math.round(d / dt)))] += dt;
    forra = nu; forraT = t;
    if (nu.rss > tak && !larm) { larm = `MINNESLARM: testet tog ${(nu.rss / 1e9).toFixed(1)} GB, mer än hälften av datorns ${(totalmem() / 1e9).toFixed(0)} GB, och stoppades.`; console.log(larm); stoppa?.(); process.exit(1); }
  }, VAR_MS);
  h.unref();
  return {
    // raderna sist i testet
    rapport(): string {
      clearInterval(h);
      const vagg = (Date.now() - t0) / 1000, snitt = vagg > 0 ? summa / vagg : 0;
      const delar = tid.map((s, n) => ({ n, s })).filter(x => x.s >= 1).map(x => `${x.n}: ${Math.round(x.s)} s`).join(', ');
      return `Datorn: ${karnor} kärnor, i snitt ${snitt.toFixed(1)} i arbete (${Math.round(snitt / karnor * 100)} %), största minnet ${(maxRss / 1e9).toFixed(1)} GB av ${(totalmem() / 1e9).toFixed(0)} GB.\n`
        + `Så länge så många kärnor arbetade samtidigt (datorns tid): ${delar || 'för kort för att mäta'}.`;
    },
  };
}

// ett långt test (koll, snabbkoll, balans, jamfor, likhet) mäter datorn från början till slut och skriver rapporten sist. Bara
// testet självt mäter: processerna det startar får MATARE_BARN (korProcess i pool.ts) och mäter inte en gång till
export function matUnderTestet() {
  if (process.env.MATARE_BARN) return;
  const m = startaMatare();
  process.on('exit', () => console.log(m.rapport()));
}
