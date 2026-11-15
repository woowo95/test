import { DAY, HOUR, Person, State, Task, W } from './typer';
import { balans } from './balans';
import { ALDER, ageOf, alive, byId, count, living, log, relKey, stat, think } from './folk';
import { knows } from './teknik';
import { getable, takeMaterial } from './behov';
import { usable } from './lager';
import { bitAt, roomAt } from './byggnad';
import { omrade } from './omrade';
import { Bevis, HANDELSER, bevisText, lasIntryck, paminn } from './rykten';
import { gen, han, slaktOrd } from './ord';
import { notis } from './notiser';
import { kronika } from './historik';
import { ARBETE, varuVarde } from './varde';
import { ProjektDef, laggTillProjekt } from './projekt';
import { LIV } from './liv';

// ---------- skriften (system 10.6) ----------
// Skriften i tre stadier: runstenen, pergamentet och boken. Registret SKRIFTER har en rad per slag av innehåll, med de stadier
// slaget kan stå på. Runstenen (steg 10.6.1) är ingen egen teknik: den som kan stenhuggning bär 3 huggna stenar till en ruta ute
// i byn och ristar runorna där, som en station. Lusten att resa en sten kommer ur sorgen efter en nära anhörig och stoltheten
// efter en bedrift, och räknas in i projektens värde som lusten efter pynt (projektraden runsten). De som går förbi läser stenen
// en gång i timmen och får intrycket i andra hand, och den som står på en sten glöms långsammare (rykten.ts). Stenen brinner
// inte, flyttas inte och rivs inte för ett hus: den är ingen station, och rutan är upptagen för allt annat (usable i lager.ts)
export type SkriftSlag = 'minne' | 'handelse';
export type SkriftStadium = 'sten' | 'pergament' | 'bok';
export const SKRIFTER: Record<SkriftSlag, { namn: string; stadier: SkriftStadium[] }> = {
  minne: { namn: 'Minne', stadier: ['sten', 'pergament', 'bok'] }, // en död, ur ristarens minne av hen
  handelse: { namn: 'Händelse', stadier: ['sten', 'pergament', 'bok'] }, // en bedrift som ristaren minns
};
export const SKRIFT = balans('skrift', {
  vikt: 0.4, // projektets vikt (som stenhuggarplatsen)
  stenar: 3, min: 15, // huggna stenar och minuter för en runsten
  sorg: 1, // lusten efter den dödas sten är sorgens tyngd delat med partnerns, gånger detta
  stolthet: 0.6, // lusten efter en sten om en bedrift: bedriftens vikt gånger detta, gånger egenintresset ...
  bedriftMin: 0.5, // ... när bedriften väger minst så här (en björn, en varg, en uppfinning, ett perfekt mästerverk)
  stolthetDygn: 3, // ... och lusten avtar till noll på så här många dygn
  avtar: 0.5, // lusten halveras för varje sten personen redan rest
  las: 3, // rutor från stenen där den som går förbi läser den
  lasVikt: 1, // intrycket den som läser får är så här stor del av det ristaren hade
});
export interface Runsten { id: number; x: number; y: number; t: number; slag: SkriftSlag; av: { id: number; namn: string }; om: { id: number; namn: string }; bev?: Bevis[]; text: string; runor: string }
export const runstenarOf = (s: State): Runsten[] => (s.runstenar ??= []);
export const runstenAt = (s: State, x: number, y: number) => s.runstenar?.find(r => r.x === x && r.y === y);

// ---------- runorna ----------
// den yngre futharken: texten ristas med de sexton runorna, ljud för ljud
const RUNA: Record<string, string> = { f: 'ᚠ', u: 'ᚢ', v: 'ᚢ', w: 'ᚢ', o: 'ᚢ', y: 'ᚢ', þ: 'ᚦ', a: 'ᛅ', ä: 'ᛅ', å: 'ᚬ', r: 'ᚱ', k: 'ᚴ', g: 'ᚴ', c: 'ᚴ', q: 'ᚴ', h: 'ᚼ', n: 'ᚾ', i: 'ᛁ', e: 'ᛁ', j: 'ᛁ', s: 'ᛋ', z: 'ᛋ', x: 'ᚴᛋ', t: 'ᛏ', d: 'ᛏ', b: 'ᛒ', p: 'ᛒ', m: 'ᛘ', l: 'ᛚ', ö: 'ᚢ' };
export function runor(text: string) {
  const ord = text.toLowerCase().replace(/th/g, 'þ').split(/[^a-zåäöþ]+/).filter(Boolean);
  return ord.map(w => [...w].map(c => RUNA[c] ?? '').join('')).join('᛫');
}

// ---------- lusten ----------
// p:s starkaste lust att resa en sten: sorgen efter en nära anhörig (sorgen i stadier, liv.ts; borta när den döda redan har en sten
// eller en gravtext) eller stoltheten efter en egen stor bedrift (p.bedrift, rykten.ts), som avtar till noll på stolthetDygn.
// Halveras för varje sten p redan rest
interface Lust { w: number; slag: SkriftSlag; om: { id: number; namn: string }; bev?: Bevis[] }
const harSten = (s: State, slag: SkriftSlag, om: number, t?: number) => !!s.runstenar?.some(r => r.slag === slag && r.om.id === om && (t === undefined || r.bev?.[0]?.t === t));
export function runstenLust(s: State, p: Person): Lust | undefined {
  if (p.gast || ageOf(p, s.now) < ALDER.vuxen || !knows(p, 'stenhuggarplats')) return undefined;
  let best: Lust | undefined;
  for (const g of p.sorg ?? []) {
    const d = g.vem !== undefined ? byId(s, g.vem) : s.people.find(q => q.name === g.namn && q.died !== undefined);
    if (!d || alive(d) || harSten(s, 'minne', d.id) || s.gravar?.some(q => q.vem === d.id && q.text)) continue;
    const w = SKRIFT.sorg * Math.abs(g.v) / Math.abs(LIV.sorjPartner);
    if (!best || w > best.w) best = { w, slag: 'minne', om: { id: d.id, namn: d.name } };
  }
  const b = p.bedrift;
  if (b && HANDELSER[b.h].vikt >= SKRIFT.bedriftMin && !harSten(s, 'handelse', p.id, b.t)) {
    const kvar = 1 - (s.now - b.t) / (SKRIFT.stolthetDygn * DAY), egen = 0.5 + Math.max(0, 20 - stat(p, 'empati', s.now)) / 20;
    const w = SKRIFT.stolthet * HANDELSER[b.h].vikt * egen * kvar;
    if (kvar > 0 && (!best || w > best.w)) best = { w, slag: 'handelse', om: { id: p.id, namn: p.name }, bev: [{ ...b, sett: undefined }] };
  }
  if (!best) return undefined;
  const rest = (s.runstenar ?? []).filter(r => r.av.id === p.id).length;
  best.w *= SKRIFT.avtar ** rest;
  return best;
}

// ---------- platsen ----------
// en ruta ute i byn: på byns kant, närmast mitten av kanten, där inget står och inget hus är
const ledigRuta = (s: State, x: number, y: number, p?: Person) => usable(s, x, y) && !bitAt(s, x, y) && !roomAt(s, x, y) && !runstenAt(s, x, y) && !s.gravar?.some(g => g.x === x && g.y === y)
  && !living(s).some(q => q !== p && q.task?.act === 'runsten' && Math.floor(q.task.tx) === x && Math.floor(q.task.ty) === y);
export function runstenPlats(s: State) {
  const o = omrade(s);
  let best: { x: number; y: number; d: number } | undefined;
  for (let y = o.y0; y <= o.y1; y++) for (let x = o.x0; x <= o.x1; x++) {
    if (!o.inne[y * W + x]) continue;
    const kant = !o.inne[y * W + x - 1] || !o.inne[y * W + x + 1] || !o.inne[(y - 1) * W + x] || !o.inne[(y + 1) * W + x];
    if (!kant) continue;
    const d = Math.hypot(x - o.mitt.x, y - o.mitt.y);
    if ((!best || d < best.d) && ledigRuta(s, x, y)) best = { x, y, d };
  }
  return best;
}

// ---------- att resa stenen ----------
// den som har lust och 3 huggna stenar inom räckhåll går till rutan och ristar där
function uppgift(s: State, p: Person) {
  const l = runstenLust(s, p), at = l && runstenPlats(s);
  if (!l || !at) return undefined;
  return { act: 'runsten' as const, text: l.slag === 'minne' ? `Reser en runsten efter ${l.om.namn}.` : 'Reser en runsten om sin bedrift.', min: SKRIFT.min, tool: l.slag, spot: { x: at.x + 0.5, y: at.y + 0.5 }, ref: l.om.id };
}
const radStenar = { huggen_sten: SKRIFT.stenar };
laggTillProjekt({
  runsten: {
    namn: 'Runsten', vikt: SKRIFT.vikt,
    brist: s => { const v = living(s).filter(p => !p.gast && ageOf(p, s.now) >= ALDER.vuxen); return v.length ? v.reduce((a, p) => a + Math.min(1, runstenLust(s, p)?.w ?? 0), 0) / v.length : 0; },
    egen: (s, _fam, p) => p ? Math.min(1, runstenLust(s, p)?.w ?? 0) : 0, // pyssel för ens egen skull på fritiden
    kostnad: () => varuVarde(radStenar, SKRIFT.min / 60 * ARBETE),
    kan: (s, p) => !!runstenLust(s, p) && getable(s, p, 'huggen_sten') >= SKRIFT.stenar,
    recept: (s, p) => runstenLust(s, p) ? { av: radStenar } : undefined,
    uppgift: (s, p) => uppgift(s, p),
  } satisfies ProjektDef,
});
// medan man ristar (MEDAN): stenarna tas när arbetet börjar (t.kom säger varifrån de kom); saknas de, eller lusten är borta,
// blir det ingen sten
export function runstenBorja(s: State, p: Person, t: Task) {
  if (t.kom) return;
  const l = runstenLust(s, p);
  if (!l || l.slag !== t.tool || l.om.id !== t.ref || getable(s, p, 'huggen_sten') < SKRIFT.stenar || !ledigRuta(s, Math.floor(t.tx), Math.floor(t.ty), p)) { p.task = undefined; return; }
  t.kom = {}; takeMaterial(s, p, 'huggen_sten', SKRIFT.stenar, true, t.kom);
}
export function runstenKlar(s: State, p: Person, t: Task) {
  const l = runstenLust(s, p), x = Math.floor(t.tx), y = Math.floor(t.ty);
  if (!l || l.slag !== t.tool || l.om.id !== t.ref || runstenAt(s, x, y)) return;
  let text: string, bev = l.bev;
  if (l.slag === 'minne') {
    const d = byId(s, l.om.id), r = s.rels[relKey(p.id, l.om.id)];
    const par = !!d && (d.partner === p.id || r?.par !== undefined);
    const rel = d && (par ? (d.sex === 'k' ? 'hustru' : 'man') : slaktOrd(p, d) ?? ((r?.op ?? 0) > 40 ? 'vän' : undefined));
    const alla = (p.intryck ?? []).filter(e => e.om === l.om.id).flatMap(e => e.bev ?? []).sort((a, b) => HANDELSER[b.h].vikt - HANDELSER[a.h].vikt);
    const sett = new Set<string>(); bev = [];
    for (const b of alla) { const tx = bevisText(b, '').trim(); if (sett.has(tx)) continue; sett.add(tx); bev.push({ ...b, sett: undefined }); if (bev.length >= 2) break; }
    const vad = bev.map(b => bevisText(b, '').trim());
    text = `${p.name} reste stenen efter ${l.om.namn}${rel ? `, sin ${rel}` : ''}${vad.length ? `, som ${vad.join(' och ')}` : ''}.`;
  } else {
    text = `${p.name} reste stenen. ${han(p)[0].toUpperCase() + han(p).slice(1)} ${bevisText(bev![0], '').trim()}.`;
  }
  const id = (s.runstenar?.reduce((m, r) => Math.max(m, r.id), 0) ?? 0) + 1;
  runstenarOf(s).push({ id, x, y, t: s.now, slag: l.slag, av: { id: p.id, namn: p.name }, om: l.om, ...(bev?.length ? { bev } : {}), text, runor: runor(text) });
  s.byggV = (s.byggV ?? 0) + 1;
  count(s, 'runsten'); count(s, 'runsten_' + l.slag);
  think(p, l.slag === 'minne' ? `Reste en sten efter ${l.om.namn}` : 'Reste en sten om sin bedrift', 0.03, s.now, 12 * HOUR);
  const rad = l.slag === 'minne' ? `${p.name} reste en runsten efter ${l.om.namn}.` : `${p.name} reste en runsten om sin bedrift.`;
  log(s, rad, 'rel', [p.id]); notis(s, 'runsten', rad, [p.id], { x, y }); kronika(s, rad, 'runsten');
}

// ---------- att läsa stenen ----------
// en gång i timmen (TAKTER): den som är vaken nära en sten läser den och får intrycket i andra hand, med ristaren som källa;
// en sten efter en död påminner om hen, så att minnet bleknar långsammare (paminn)
export function runstenTimme(s: State) {
  if (!s.runstenar?.length) return;
  const folk = living(s).filter(q => q.task?.act !== 'sova');
  for (const r of s.runstenar) for (const q of folk) {
    if (Math.hypot(q.x - r.x - 0.5, q.y - r.y - 0.5) > SKRIFT.las) continue;
    for (const b of r.bev ?? []) lasIntryck(s, q, r.om, b, r.av.id, SKRIFT.lasVikt);
    if (r.slag === 'minne') paminn(s, q, r.om.id);
    count(s, 'runstenLast');
  }
}
// i rutan som visas vid ett tryck: runorna överst och texten på svenska under
export const runstenRubrik = (r: Runsten) => r.slag === 'minne' ? `Stenen efter ${r.om.namn}` : `${gen(r.av.namn)} sten`;
