// Vilka fasta rader i händelseloggen (log(...) i src/sim/) som skrivs oftast: en by i [dygn], varje rad som skrivs med
// namnen bytta mot X och talen mot N. Skriver JSON (raden → antal). Används av texter/loggrader-alla.ts.
// Underlag för textchatten (texter/README.md); ändrar inget i spelet.
import { step, BEAT, createState } from '../src/sim';
import { START, STEG_DYGN } from '../src/test/kor';

const [seed, dagar] = process.argv.slice(2).map(Number);
const s = createState(seed, START), n: Record<string, { n: number; ex: string }> = {};
const lagg = (text: string) => {
  let t = text;
  for (const p of s.people) if (p.name.length > 2) t = t.split(p.name).join('X');
  t = t.replace(/\d+/g, 'N');
  (n[t] ??= { n: 0, ex: text }).n++;
};
const hook = () => { const l = s.log as unknown as { push: (...a: { text: string }[]) => number; __h?: 1 }; if (l.__h) return; const o = l.push.bind(l); l.push = (...a) => { for (const e of a) lagg(e.text); return o(...a); }; l.__h = 1; };
for (let i = 0; i < dagar * STEG_DYGN; i++) { hook(); step(s, BEAT); }
console.log(JSON.stringify(n));
