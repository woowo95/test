// npm run granska -- [byar] [dygn] [mapp] (steg 12.1.44, Att hitta felen: Granskaren som spelar): underlaget som granskarens
// läsare går igenom. Byarna körs här utan grafik (i molnet, så att MacBooken är fri för testerna), en process per by, med
// vakterna för det orimliga hela tiden. Det sista dygnet (ett år i spelet) följs några slumpvis valda personer i varje by
// varje minut: allt de gjorde, varför, var de stod och vad de bar, och alla texter spelet skrev om dem; byns förråd och behov
// skrivs varje timme. Sedan tar npm run utseende bilderna av kartan, rutorna och varje flik på datorn och i mobilen, i ljust
// och mörkt läge, med vakterna för formen, och radbryt.ts mäter radbrytningarna (UTAN_BILDER=1 hoppar över dem). Allt hamnar i mappen (node_modules/.cache/granska/<tid>
// om ingen anges), med LASMIG.md som säger vad som finns var. Läsarna och prövningen av fynden är arbetsflödet
// .claude/workflows/granska.js. Utan tal: byarna 1, 1511 och 4634 i 10 dygn (10 år i spelet)
import './utc';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ACTS, DAY, HOUR, Person, ageOf, createState, hourOf, living, step } from '../sim';
import { START } from './kor';
import { LAG_PRIO, korSkript } from './pool';
import { type Larm, Rimlig } from './rimligt';
import { bar, behovNu, folkNu, forradNu } from '../ui/bylage';

const PROV = 60, FOLJ = 3; // proven varje minut i spelet; så många personer följs i varje by
const i = process.argv.indexOf('--by');
if (i >= 0) {
  const seed = Number(process.argv[i + 1]), dygn = Number(process.argv[i + 2]), ut = process.argv[i + 3];
  const s = createState(seed, START), r = new Rimlig(s, seed), slut = START + dygn * DAY, sista = slut - DAY;
  while (s.now < sista) { step(s, PROV); r.prov(PROV); }
  // de som följs: slumpvis valda med byns frö, bland dem som lever och inte är gäster (en vuxen, ett barn om det finns, och en till)
  const folk = living(s).filter(p => !p.gast), hash = (n: number) => ((Math.imul(n ^ seed, 2654435761) >>> 0) % 1000) / 1000;
  const ordning = [...folk].sort((a, b) => hash(a.id) - hash(b.id)), barn = ordning.find(p => ageOf(p, s.now) < 18);
  const foljda = [...new Set([...ordning.filter(p => ageOf(p, s.now) >= 18).slice(0, FOLJ - (barn ? 1 : 0)), ...(barn ? [barn] : [])])].slice(0, FOLJ);
  const kl = (t: number) => { const h = hourOf(t); return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };
  const rad = (p: Person) => { const t = p.task; return `${t ? `${ACTS[t.act]?.namn ?? t.act} [${t.act}, ${t.phase}]` : 'väljer'} — ${t?.why ?? ''} | på ${p.x.toFixed(1)},${p.y.toFixed(1)}${t ? ` mot ${t.tx.toFixed(1)},${t.ty.toFixed(1)}` : ''} | bär: ${bar(s, p)} | mätt ${Math.round(p.hunger * 100)} törst ${Math.round(p.torst * 100)} värme ${Math.round(p.warm * 100)} vila ${Math.round(p.rest * 100)}`; };
  const dag: Record<number, string[]> = {}, sist: Record<number, string> = {}, timmar: string[] = [];
  const logg0 = s.log.length ? s.log[s.log.length - 1].t : 0;
  let timme = -1;
  while (s.now < slut) {
    const h = Math.floor(s.now / HOUR);
    if (h !== timme) { timme = h; timmar.push(`--- ${kl(s.now)} ---\nFörråden: ${forradNu(s)}\nBehoven: ${behovNu(s)}`); }
    for (const p of foljda) {
      if (p.died !== undefined || p.left !== undefined) continue;
      const x = rad(p), k = x.replace(/ \| på .*$/, ''), min = Math.round((s.now % HOUR) / 60000);
      if (k !== sist[p.id] || min % 10 === 0) (dag[p.id] ??= []).push(`${kl(s.now)} ${x}`);
      sist[p.id] = k;
    }
    step(s, PROV); r.prov(PROV);
  }
  const text: string[] = [`# By ${seed}, dygn ${dygn - 1}–${dygn} (det sista året i spelet)`, '', '## Alla just nu (i slutet)', folkNu(s), '', '## Vakterna för det orimliga (hela körningen)', ...r.larmen.map((l: Larm) => `- ${new Date(l.t).toISOString().slice(0, 16)} ${l.vakt}${l.vem ? ` ${l.vem}` : ''}: ${l.text}`), ''];
  for (const p of foljda) {
    text.push(`## ${p.name} (${Math.floor(ageOf(p, s.now))} år${p.died !== undefined ? ', dog under dygnet' : ''})`, '', '### Dygnet minut för minut (en rad när något ändras, och var tionde minut)', ...(dag[p.id] ?? []), '',
      '### Personloggen under dygnet', ...(p.hand ?? []).filter(([t]) => t >= sista).map(([t, , x]) => `${kl(t)} ${x}`), '',
      '### Byns logg om hen under dygnet', ...s.log.filter(e => e.t > logg0 && e.ids.includes(p.id)).map(e => `${kl(e.t)} ${e.text}`), '');
  }
  text.push('## Byns logg under dygnet', ...s.log.filter(e => e.t > logg0).map(e => `${kl(e.t)} ${e.text}`), '', '## Förråden och behoven varje timme', ...timmar);
  writeFileSync(join(ut, `by-${seed}.md`), text.join('\n'));
  console.log(JSON.stringify({ seed, larm: r.larmen.length, foljda: foljda.map(p => p.name) }));
} else {
  const arg = process.argv.slice(2), byar = arg[0] ? Array.from({ length: Number(arg[0]) }, (_, k) => [1, 1511, 4634][k] ?? k + 1) : [1, 1511, 4634], dygn = Number(arg[1] ?? 10);
  const ut = resolve(arg[2] ?? `node_modules/.cache/granska/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`);
  mkdirSync(ut, { recursive: true });
  const t0 = Date.now();
  const res = await Promise.all(byar.map(b => korSkript('granska.ts', ['--by', String(b), String(dygn), ut], {}, LAG_PRIO)));
  const sam: string[] = [];
  res.forEach((u, k) => sam.push(u.code ? `by ${byar[k]}: KRASCH ${u.err.slice(-300)}` : `by ${byar[k]}: ${u.out.trim().split('\n').pop()}`));
  console.log(sam.join('\n'));
  // bilderna och vakterna för formen: den första byn, med npm run utseende (bygget först)
  let bilder = 'inga bilder (UTAN_BILDER=1)';
  if (!process.env.UTAN_BILDER) {
    spawnSync('node', ['build.mjs'], { stdio: 'inherit' });
    const u = spawnSync('npx', ['tsx', 'src/test/utseende.ts', join(ut, 'bilder'), String(byar[0])], { encoding: 'utf8', env: { ...process.env, FALL: process.env.FALL ?? 'dag' }, maxBuffer: 1 << 26 });
    writeFileSync(join(ut, 'form.txt'), (u.stdout ?? '') + (u.stderr ?? ''));
    const r = spawnSync('npx', ['tsx', 'src/test/radbryt.ts', ut], { encoding: 'utf8', maxBuffer: 1 << 26 }); // radbrytningarna (steg 13.10.43)
    console.log((r.stdout ?? '').trim() + (r.status ? '\nradbryt: KRASCH ' + (r.stderr ?? '').slice(-300) : ''));
    bilder = `radbryt.md och radbryt/ (radbrytningarna: var raderna bryts i alla rutor, på datorn och i mobilen, med en bild av varje ruta som larmar), bilder/ (kartan på dagen, och bilder/flikar/: varje flik och personens ruta), form.txt (vakterna för formen)`;
  }
  writeFileSync(join(ut, 'LASMIG.md'), [`# Granskarens underlag (steg 12.1.44)`, '', `Byarna ${byar.join(', ')} i ${dygn} dygn (${dygn} år i spelet), skapat ${new Date().toISOString().slice(0, 16)}.`, '',
    ...byar.map(b => `- by-${b}.md: personerna som följdes det sista dygnet, minut för minut, deras texter, byns logg, förråden och behoven varje timme, och vakternas larm`), `- ${bilder}`, '',
    'Läsarna letar efter det som är ologiskt, inte det som är balans eller slump (listorna i avsnittet Att hitta felen i designdokumentet och i .claude/workflows/granska.js).'].join('\n'));
  console.log(`Underlaget: ${ut} (${Math.round((Date.now() - t0) / 1000)} s)`);
}
