// Hela texter, så som de syns i spelet (texter/README.md): några byar körs, och vid några tidpunkter tittar skriptet på
// varje ställe där spelet skriver text, som om någon tryckte där (personrutan, relationerna, ryktena, pratbubblan, sakerna,
// rättegångarna, loggen, arenan). Björn kommenterar varje hel text; mönstren i kommentarerna visar om felet sitter i en text
// eller i textgeneratorn. Ger texter/hela.json, som texter/bygg.cjs lägger i bildstilens avsnitt Texterna.
//   npx tsx texter/hela.ts && node texter/bygg.cjs && node bildstil/bygg.cjs
import { writeFileSync } from 'node:fs';
import {
  step, BEAT, createState, living, alive, byId, ageOf, ALDER, beskrivning, pratText, pratarMed, relationText, relTyper, relKey,
  binamnInfo, INTRYCK, anseendeText, intryckText, sakBerattelse, sakNamn, STATIONER, timeLabel, rattegang, STRAFF_NAMN,
  nyStrid, stridTillSlut, stridText, STRIDHANDELSER, type State, type Person,
} from '../src/sim';
import { START, STEG_DYGN, STEG_TIM } from '../src/test/kor';

const BYAR = [1, 42, 777], DYGN = 45, TITTA = [8, 20, 33, 45]; // dygnen då skriptet tittar
const PRAT_TIM = 5; // pratbubblorna fångas så här ofta, eftersom de bara syns medan någon pratar

interface Text { id: string; by: number; nar: string; vem: string; text: string }
const PLATSER: { id: string; rubrik: string; var: string; max: number }[] = [
  { id: 'besk', rubrik: 'Beskrivningen av en person', var: 'Överst i personrutan, när man trycker på någon.', max: 10 },
  { id: 'dod', rubrik: 'Eftermälet', var: 'Överst i personrutan för någon som är död.', max: 6 },
  { id: 'binamn', rubrik: 'Öknamnet eller hedersnamnet', var: 'Personrutan, när man trycker på öknamnet eller hedersnamnet bakom namnet.', max: 6 },
  { id: 'rel', rubrik: 'Vad hen tycker om någon', var: 'Personrutan, Relationer: när man trycker på ordet för relationen (vän, ovän …).', max: 10 },
  { id: 'reltyp', rubrik: 'En symbol i relationen', var: 'Personrutan, Relationer: när man trycker på en symbol (partner, bästa vän, rival …).', max: 8 },
  { id: 'ans', rubrik: 'Vad byn tycker om hen', var: 'Personrutan, Rykten: när man trycker på stapeln för anseendet.', max: 6 },
  { id: 'intryck', rubrik: 'Vad hen tror om någon', var: 'Personrutan, Rykten: när man trycker på en symbol under "Vad hen tror om andra".', max: 8 },
  { id: 'prat', rubrik: 'Pratbubblan', var: 'Personrutan, medan hen pratar med någon.', max: 10 },
  { id: 'sak', rubrik: 'Sakens berättelse', var: 'Rutan för en sak eller station som har en historia (★ före namnet).', max: 6 },
  { id: 'ratt', rubrik: 'Rättegången', var: 'Fliken Styre, Rättegångar: när man trycker på en dom.', max: 5 },
  { id: 'logg', rubrik: 'Loggen', var: 'Fliken Folk, Händelser: de senaste raderna, nyast överst. Här 30 rader åt gången.', max: 6 },
  { id: 'strid', rubrik: 'Striden', var: 'Arenan, när man väljer en strid i byn: loggen rad för rad. Här de första 30 raderna.', max: 4 },
  { id: 'kronika', rubrik: 'Krönikan', var: 'Byns krönika: sparas för alltid men visas inte i spelet än. Här de första 30 raderna.', max: 3 },
];
const ut: Record<string, Text[]> = Object.fromEntries(PLATSER.map(p => [p.id, []]));
const sett = new Set<string>(), dodSett = new Set<number>(); // en död en gång, fast texten varierar
// samma text en gång; varje ställe får lika många från varje by och tidpunkt, så att de blir olika
function lagg(plats: string, by: number, s: State, vem: string, text: string) {
  if (!text || sett.has(text)) return;
  sett.add(text);
  ut[plats].push({ id: '', by, nar: timeLabel(s, s.now), vem, text });
}
const kl = (t: number) => { const d = new Date(t); return `kl. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const ar = (s: State, p: Person) => Math.floor(ageOf(p, s.now));
const vemAr = (s: State, p: Person) => `${p.name}, ${p.sex === 'k' ? 'kvinna' : 'man'}, ${ar(s, p)} år`;

// de som tittas på: den äldsta, ett barn, någon med binamn, ledaren och två till spridda i byn
function urval(s: State) {
  const L = living(s).slice().sort((a, b) => a.id - b.id);
  const val = new Set<Person>();
  const gamla = L.slice().sort((a, b) => ar(s, b) - ar(s, a));
  if (gamla[0]) val.add(gamla[0]);
  const barn = L.filter(p => ar(s, p) < ALDER.vuxen); if (barn.length) val.add(barn[Math.floor(barn.length / 2)]);
  const bn = L.find(p => p.binamn && !val.has(p)); if (bn) val.add(bn);
  const led = s.styre?.ledare !== undefined ? byId(s, s.styre.ledare) : undefined; if (led && alive(led)) val.add(led);
  for (const i of [0.3, 0.7]) { const p = L[Math.floor(L.length * i)]; if (p) val.add(p); }
  return [...val];
}

function titta(s: State, by: number) {
  for (const p of urval(s)) {
    lagg('besk', by, s, vemAr(s, p), beskrivning(s, p));
    const b = binamnInfo(p);
    if (b) lagg('binamn', by, s, `${p.name} ${b.namn}`, `${b.heder ? 'Hedersnamn' : 'Öknamn'}: byn ser ${p.name} som ${b.intryck}.${b.bevis ? ` ${b.varfor}.` : ''}`);
    // relationerna: de särskilda först och sedan den starkaste, som i personrutan
    const rels = living(s).filter(q => q.id !== p.id && s.rels[relKey(p.id, q.id)]).map(q => ({ q, r: s.rels[relKey(p.id, q.id)] }))
      .sort((x, y) => Math.abs(y.r.op) - Math.abs(x.r.op));
    const ovan = rels.slice().sort((x, y) => x.r.op - y.r.op)[0];
    for (const { q, r } of [rels[0], ovan].filter(Boolean)) {
      lagg('rel', by, s, `Vad ${p.name} tycker om ${q.name}`, relationText(s, p, q, r).join(' '));
      for (const t of relTyper(s, p, q)) lagg('reltyp', by, s, `${p.name} och ${q.name}`, `${t.namn}: ${t.varfor(s, p, q, r)}`);
    }
    lagg('ans', by, s, p.name, anseendeText(s, p.id));
    const e = (p.intryck ?? []).slice().sort((a, b) => b.v * b.c - a.v * a.c)[0];
    if (e) {
      const t = intryckText(s, e);
      lagg('intryck', by, s, `Vad ${p.name} tror om ${e.namn}`, `${t.namn[0].toUpperCase() + t.namn.slice(1)}: ${[t.sure, t.varifran, t.slag, t.sant].filter(Boolean).join(', ')}${t.bevis.length ? '\n' + t.bevis.join('\n') : ''}`);
    }
  }
  for (const p of s.people.filter(p => p.died !== undefined && !dodSett.has(p.id)).slice(-2)) dodSett.add(p.id), lagg('dod', by, s, `${p.name} (död)`, beskrivning(s, p));
  for (const t of (s.ting ?? []).filter(t => t.ber).slice(-2)) lagg('sak', by, s, sakNamn(t.k), sakBerattelse(s, t, sakNamn(t.k)));
  for (const st of (s.stationer ?? []).filter(st => st.ber).slice(-1)) {
    const namn = (STATIONER as Record<string, { namn: string }>)[st.k]?.namn ?? st.k;
    lagg('sak', by, s, namn, sakBerattelse(s, st, namn));
  }
  for (const r of (s.styre?.ratt ?? []).slice(-2)) {
    const x = rattegang(s, r);
    lagg('ratt', by, s, r.namn, `${timeLabel(s, r.t)}: ${r.namn} ${x.brott}: ${STRAFF_NAMN[r.steg].toLowerCase()}${r.oratt ? ' (orättvis)' : ''}\n\n${x.berattelse}\n\nSåg det: ${x.sett || 'ingen annan'}\nHörde det: ${x.hort || 'ingen annan'}`);
  }
  lagg('logg', by, s, 'Händelser', s.log.slice(-30).reverse().map(l => `${timeLabel(s, l.t)}, ${kl(l.t)}  ${l.text}`).join('\n'));
  const m = (s.strider ?? []).slice(-1)[0];
  if (m) {
    const st = stridTillSlut(nyStrid(m.u, m.fro));
    lagg('strid', by, s, `${m.u.kampar.map(k => k.namn).join(' mot ')} (${m.orsak})`,
      st.logg.slice(0, 30).map(r => `${r.t.toFixed(1)} ${STRIDHANDELSER[r.h].tecken} ${stridText(st, r)}`).join('\n') + (st.logg.length > 30 ? `\n… och ${st.logg.length - 30} rader till` : ''));
  }
}

for (const by of BYAR) {
  const s = createState(by, START);
  for (let i = 0; i < DYGN * STEG_DYGN; i++) {
    step(s, BEAT);
    if (i % (STEG_TIM * PRAT_TIM) === 0) for (const p of living(s)) if (pratarMed(s, p)) { lagg('prat', by, s, vemAr(s, p), pratText(s, p)); break; }
    if (TITTA.some(d => i === d * STEG_DYGN - 1)) titta(s, by);
  }
  const k = s.hist?.kronika ?? [];
  lagg('kronika', by, s, 'Krönikan', k.slice(0, 30).map(([t, text]) => `${timeLabel(s, t)}  ${text}`).join('\n'));
}

// lika många från varje by och tidpunkt: var n:te text, så att urvalet sprids
const valj = <T,>(L: T[], n: number) => L.length <= n ? L : Array.from({ length: n }, (_, i) => L[Math.floor(i * L.length / n)]);
const sida = PLATSER.map(p => ({ ...p, texter: valj(ut[p.id], p.max).map((t, i) => ({ ...t, id: `${p.id}-${i + 1}` })) }));
writeFileSync(new URL('./hela.json', import.meta.url), JSON.stringify(sida, null, 1));
console.log(sida.map(p => `${p.id}: ${p.texter.length} av ${ut[p.id].length}`).join('\n'));
