import { DAY, H, HOUR, Lardom, Person, Skill, State, Task, W } from './typer';
import { SKRIFT } from './skriftTal';
import { ALDER, ageOf, alive, byId, count, forstaGang, living, log, relKey, stat, think } from './folk';
import { TEK, TEKTAL, knows, learn } from './teknik';
import { getable, takeMaterial } from './behov';
import { usable } from './lager';
import { bitAt, roomAt } from './byggnad';
import { omrade } from './omrade';
import { Bevis, HANDELSER, Intryck, bevisText, lasIntryck, paminn } from './rykten';
import { Ting, newTing, tingOf } from './agande';
import { taVatska, vatskaAv } from './vatskor';
import { LARDOMAR, describe, findL, lasLardom } from './minne';
import { lightLevel } from './tid';
import { NORMAL, nyKvalitet } from './kvalitet';
import { clamp, rnd } from './slump';
import { MINNE } from './minne';
import { ljusAt } from './ljus';
import { gen, han, slaktOrd } from './ord';
import { notis } from './notiser';
import { kronika } from './historik';
import { ARBETE, varuVarde } from './varde';
import { ProjektDef, laggTillProjekt } from './projekt';
import { LIV } from './liv';
import { helig, prastOf } from './kult';
import { Tro, troNamn, troOf } from './religion';
import { troshusAv } from './troshus';

// ---------- skriften (system 10.6) ----------
// Skriften i tre stadier: runstenen, pergamentet och boken. Registret SKRIFTER har en rad per slag av innehåll, med de stadier
// slaget kan stå på. Runstenen (steg 10.6.1) är ingen egen teknik: den som kan stenhuggning bär 3 huggna stenar till en ruta ute
// i byn och ristar runorna där, som en station. Lusten att resa en sten kommer ur sorgen efter en nära anhörig och stoltheten
// efter en bedrift, och räknas in i projektens värde som lusten efter pynt (projektraden runsten). De som går förbi läser stenen
// en gång i timmen och får intrycket i andra hand, och den som står på en sten glöms långsammare (rykten.ts). Stenen brinner
// inte, flyttas inte och rivs inte för ett hus: den är ingen station, och rutan är upptagen för allt annat (usable i lager.ts)
export type SkriftSlag = 'minne' | 'handelse' | 'helig' | 'lardom' | 'poesi' | 'berattelse' | 'kunskap';
export type SkriftStadium = 'sten' | 'pergament' | 'bok';
// skill = färdigheten som gör att man skriver slaget oftare (steg 10.6.5)
export const SKRIFTER: Record<SkriftSlag, { namn: string; stadier: SkriftStadium[]; skill: Skill }> = {
  minne: { namn: 'Minne', stadier: ['sten', 'pergament', 'bok'], skill: 'berattande' }, // en död, ur ristarens minne av hen
  handelse: { namn: 'Händelse', stadier: ['sten', 'pergament', 'bok'], skill: 'berattande' }, // en bedrift som ristaren minns
  helig: { namn: 'Heligt', stadier: ['sten', 'bok'], skill: 'skaldskap' }, // trons heliga kväden, som prästen eller lärjungen kan utantill (steg 10.6.2)
  lardom: { namn: 'Lärdom', stadier: ['pergament', 'bok'], skill: 'berattande' }, // priser, platser och faror (steg 10.6.5)
  poesi: { namn: 'Poesi', stadier: ['sten', 'pergament', 'bok'], skill: 'skaldskap' }, // skaldens kväde om någon
  berattelse: { namn: 'Berättelse', stadier: ['pergament', 'bok'], skill: 'berattande' }, // en historia om någon skrivaren minns
  kunskap: { namn: 'Kunskap', stadier: ['bok'], skill: 'berattande' }, // en handbok om en teknik (steg 10.6.6)
};
export { SKRIFT } from './skriftTal';
export interface Runsten { id: number; x: number; y: number; t: number; slag: SkriftSlag; av: { id: number; namn: string }; om: { id: number; namn: string }; bev?: Bevis[]; text: string; runor: string; tro?: number } // tro = den heliga stenens tro (om = tron)
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
// eller en gravtext) eller stoltheten efter en egen stor bedrift (p.bedrift, rykten.ts), som avtar till noll på stolthetDygn, och
// halveras för varje sten p redan rest; eller, för prästen och lärjungen, trons heliga kväden
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
  if (best) best.w *= SKRIFT.avtar ** (s.runstenar ?? []).filter(r => r.av.id === p.id && r.slag !== 'helig').length;
  // trons heliga kväden: prästen eller lärjungen som kan dem utantill (steg 10.6.2), mindre för varje helig sten tron har
  const tr = troOf(s, p.tro);
  if (tr && tr.slut === undefined && tr.kvade && (prastOf(s, tr) === p || tr.kvade.larjunge === p.id)) {
    const w = SKRIFT.helig * SKRIFT.avtar ** (s.runstenar ?? []).filter(r => r.slag === 'helig' && r.tro === tr.id).length;
    if (!best || w > best.w) best = { w, slag: 'helig', om: { id: tr.id, namn: troNamn(tr) } };
  }
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

// den heliga stenen (steg 10.6.2): den lediga rutan närmast trons heliga plats, annars trons hus; saknas båda står den som andra
function heligPlats(s: State, tr: Tro) {
  const h = helig(s, tr), hus = troshusAv(s, tr)[0];
  const m = h ? { x: Math.floor(h.x), y: Math.floor(h.y) } : hus ? { x: hus.x + Math.floor(hus.w / 2), y: hus.y + hus.h } : undefined;
  if (!m) return runstenPlats(s);
  let best: { x: number; y: number; d: number } | undefined;
  for (let dy = -SKRIFT.heligR; dy <= SKRIFT.heligR; dy++) for (let dx = -SKRIFT.heligR; dx <= SKRIFT.heligR; dx++) {
    const x = m.x + dx, y = m.y + dy, d = Math.hypot(dx, dy);
    if (x < 0 || y < 0 || x >= W || y >= H || d > SKRIFT.heligR || best && d >= best.d) continue;
    if (ledigRuta(s, x, y)) best = { x, y, d };
  }
  return best ?? runstenPlats(s);
}
const platsFor = (s: State, l: Lust) => { const tr = l.slag === 'helig' ? troOf(s, l.om.id) : undefined; return tr ? heligPlats(s, tr) : runstenPlats(s); };

// ---------- att resa stenen ----------
// den som har lust och 3 huggna stenar inom räckhåll går till rutan och ristar där
function uppgift(s: State, p: Person) {
  const l = runstenLust(s, p), at = l && platsFor(s, l);
  if (!l || !at) return undefined;
  return { act: 'runsten' as const, text: l.slag === 'minne' ? `Reser en runsten efter ${l.om.namn}.` : l.slag === 'helig' ? 'Ristar de heliga kvädena på en sten.' : 'Reser en runsten om sin bedrift.', min: SKRIFT.min, tool: l.slag, spot: { x: at.x + 0.5, y: at.y + 0.5 }, ref: l.om.id };
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
  } else if (l.slag === 'helig') {
    text = troOf(s, l.om.id)?.kvade?.text ?? ''; // kvädet som det löd när det ristades
  } else {
    text = `${p.name} reste stenen. ${han(p)[0].toUpperCase() + han(p).slice(1)} ${bevisText(bev![0], '').trim()}.`;
  }
  const id = (s.runstenar?.reduce((m, r) => Math.max(m, r.id), 0) ?? 0) + 1;
  runstenarOf(s).push({ id, x, y, t: s.now, slag: l.slag, av: { id: p.id, namn: p.name }, om: l.om, ...(bev?.length ? { bev } : {}), ...(l.slag === 'helig' ? { tro: l.om.id } : {}), text, runor: runor(text) });
  s.byggV = (s.byggV ?? 0) + 1;
  count(s, 'runsten'); count(s, 'runsten_' + l.slag);
  think(p, l.slag === 'minne' ? `Reste en sten efter ${l.om.namn}` : l.slag === 'helig' ? 'Ristade de heliga kvädena' : 'Reste en sten om sin bedrift', 0.03, s.now, 12 * HOUR);
  const rad = l.slag === 'minne' ? `${p.name} reste en runsten efter ${l.om.namn}.` : l.slag === 'helig' ? `${p.name} ristade de heliga kvädena (${l.om.namn.toLowerCase()}) på en sten.` : `${p.name} reste en runsten om sin bedrift.`;
  log(s, rad, 'rel', [p.id]); notis(s, 'runsten', rad, [p.id], { x, y }); kronika(s, rad, 'runsten');
}

// ---------- att läsa stenen ----------
// en gång i timmen (TAKTER): om varje tro har en helig skrift, och den som är vaken nära en sten läser den och får intrycket i andra hand, med ristaren som källa;
// en sten efter en död påminner om hen, så att minnet bleknar långsammare (paminn)
export function runstenTimme(s: State) {
  for (const tr of s.tron ?? []) { const har = heligaStenar(s, tr).length > 0; if (har) tr.skrift = true; else delete tr.skrift; } // om tron har en helig skrift (steg 10.6.3)
  // handböckerna (steg 10.6.6): när den sista som kunde en teknik är borta säger krönikan att konsten står kvar i boken
  for (const b of bockerna(s)) for (const k of b.delar ?? []) {
    if (!k.tek || k.ensam || living(s).some(q => !q.gast && knows(q, k.tek!))) continue;
    k.ensam = true;
    const rad = `Ingen i byn kan längre ${TEK[k.tek]!.namn.toLowerCase()}, men konsten står kvar i ${gen(k.av.namn)} bok.`;
    log(s, rad, 'skill', [k.av.id]); kronika(s, rad, 'runsten');
  }
  if (!s.runstenar?.length) return;
  const folk = living(s).filter(q => q.task?.act !== 'sova');
  for (const r of s.runstenar) for (const q of folk) {
    if (Math.hypot(q.x - r.x - 0.5, q.y - r.y - 0.5) > SKRIFT.las) continue;
    for (const b of r.bev ?? []) lasIntryck(s, q, r.om, b, r.av.id, SKRIFT.lasVikt);
    if (r.slag === 'minne') paminn(s, q, r.om.id);
    if (r.slag === 'helig' && q.tro === r.tro) think(q, 'Läste de heliga kvädena', SKRIFT.heligTanke, s.now, SKRIFT.heligTim * HOUR); // bara den som tror
    count(s, 'runstenLast');
  }
}
// i rutan som visas vid ett tryck: runorna överst och texten på svenska under
export const runstenRubrik = (r: Runsten) => r.slag === 'minne' ? `Stenen efter ${r.om.namn}` : r.slag === 'helig' ? `Den heliga stenen (${r.om.namn.toLowerCase()})` : `${gen(r.av.namn)} sten`;
// trons heliga stenar (fliken Religion)
export const heligaStenar = (s: State, tr: Tro) => (s.runstenar ?? []).filter(r => r.slag === 'helig' && r.tro === tr.id);

// ---------- att skriva och läsa (steg 10.6.5) ----------
// Den som kommer åt ett blad pergament och bläck (10.6.4) skriver på fritiden, på dagen och i ljuset vid elden: ett blad tar 3
// minuter, 1 blad och 1 dos bläck. Hen skriver det hen själv vet: minnet av en död, sin bedrift, en lärdom, ett kväde eller en
// berättelse om den hen har det starkaste intrycket av, oftare ju högre färdigheten för slaget (SKRIFTER.skill). Det skrivna
// bladet är ett eget ting (blad) med skriften, som skrivaren äger och som ligger i förrådet. Andra läser det där det ligger
// (2 minuter) när det har något nytt för dem: en lärdom de inte har, eller ett intryck de inte hört; nyttan är noll när de redan
// vet det, så ingen lista över det lästa behövs
// tek = handbokens teknik och tro = de heliga kvädenas tro (i boken, steg 10.6.6); ensam = krönikan har sagt att ingen längre kan tekniken
export interface Skrift { slag: SkriftSlag; av: { id: number; namn: string }; t: number; titel: string; text: string; om?: { id: number; namn: string }; bev?: Bevis[]; lar?: Lardom; tek?: string; tro?: number; ensam?: true; q?: number; fel?: number } // q = kvaliteten (steg 10.6.7), fel = överdriften eller underdriften gånger värdet
interface SkrivLust { w: number; slag: SkriftSlag; om?: { id: number; namn: string }; bev?: Bevis[]; lar?: Lardom; tek?: string; tro?: number; bok?: Ting }
export const bladen = (s: State) => tingOf(s).filter(t => t.skrift);
// böckerna (steg 10.6.6): 8 blad mellan 2 plankor, som fylls del för del, högst SKRIFT.bokDelar delar av samma slag (bokens genre)
export const bockerna = (s: State) => tingOf(s).filter(t => t.k === 'bok');
// alla skrifter på blad och i böcker
const skrifter = (s: State) => { const a: Skrift[] = []; for (const t of tingOf(s)) { if (t.skrift) a.push(t.skrift); else if (t.delar) a.push(...t.delar); } return a; };
const harBlad = (s: State, f: (k: Skrift) => boolean) => skrifter(s).some(f);
// boken där en del av slaget kan skrivas: tom eller av samma slag och med en ledig del; den som har flest delar av slaget först
export function bokPlats(s: State, slag: SkriftSlag) {
  if (!SKRIFTER[slag].stadier.includes('bok')) return undefined;
  let best: Ting | undefined;
  for (const t of tingOf(s)) {
    if (t.k !== 'bok' || t.lass !== undefined) continue;
    const n = t.delar?.length ?? 0;
    if (n >= SKRIFT.bokDelar || n > 0 && t.delar![0]!.slag !== slag) continue;
    if (!best || n > (best.delar?.length ?? 0)) best = t;
  }
  return best;
}
export const bokGenre = (t: Ting) => t.delar?.[0]?.slag;
const sammaLar = (a: Lardom, b: Lardom) => a.k === b.k && a.a === b.a && a.sl === b.sl;
// det starkaste intrycket p har av en annan, med ett bevis att berätta om (som i framträdandet, helst en död)
function starkastBev(s: State, p: Person) {
  let bast: { e: Intryck; v: number } | undefined;
  for (const e of p.intryck ?? []) {
    if (e.om === p.id || !e.bev?.length) continue;
    const q = byId(s, e.om), v = e.v * e.c * (!q || !alive(q) ? 2 : 1);
    if (!bast || v > bast.v) bast = { e, v };
  }
  return bast;
}
// p:s lust att skriva ett blad av varje slag, den starkaste gånger slagets färdighet; halveras för varje blad p redan skrivit
export function skrivLust(s: State, p: Person): SkrivLust | undefined {
  if (p.gast || ageOf(p, s.now) < ALDER.vuxen) return undefined;
  const c: SkrivLust[] = [];
  for (const g of p.sorg ?? []) {
    const d = g.vem !== undefined ? byId(s, g.vem) : s.people.find(q => q.name === g.namn && q.died !== undefined);
    if (!d || alive(d) || harBlad(s, k => k.slag === 'minne' && k.om?.id === d.id)) continue;
    c.push({ w: SKRIFT.sorg * Math.abs(g.v) / Math.abs(LIV.sorjPartner), slag: 'minne', om: { id: d.id, namn: d.name } });
  }
  const b = p.bedrift;
  if (b && HANDELSER[b.h].vikt >= SKRIFT.bedriftMin && !harBlad(s, k => k.slag === 'handelse' && k.om?.id === p.id && k.bev?.[0]?.t === b.t)) {
    const kvar = 1 - (s.now - b.t) / (SKRIFT.stolthetDygn * DAY), egen = 0.5 + Math.max(0, 20 - stat(p, 'empati', s.now)) / 20;
    if (kvar > 0) c.push({ w: SKRIFT.stolthet * HANDELSER[b.h].vikt * egen * kvar, slag: 'handelse', om: { id: p.id, namn: p.name }, bev: [{ ...b, sett: undefined }] });
  }
  let lar: Lardom | undefined, lw = 0;
  for (const l of p.lardomar ?? []) {
    if (l.k === 'flod') continue;
    const w = SKRIFT.lardom * l.c * (l.k === 'fara' ? SKRIFT.lardomFara : Math.min(1, l.v));
    if (w > lw && !harBlad(s, k => !!k.lar && sammaLar(k.lar, l))) { lw = w; lar = l; }
  }
  if (lar) c.push({ w: lw, slag: 'lardom', lar: { ...lar } });
  const e = starkastBev(s, p);
  if (e) {
    const om = { id: e.e.om, namn: e.e.namn }, bev = [...e.e.bev!].sort((x, y) => HANDELSER[y.h].vikt - HANDELSER[x.h].vikt).slice(0, 1).map(x => ({ ...x, sett: undefined }));
    for (const slag of ['poesi', 'berattelse'] as const)
      if (!harBlad(s, k => k.slag === slag && k.om?.id === om.id)) c.push({ w: SKRIFT[slag] * Math.min(1, e.v), slag, om, bev });
  }
  // i boken (steg 10.6.6): en handbok om en teknik hen kan, helst om det få i byn kan, och trons heliga kväden
  if (bokPlats(s, 'kunskap')) {
    const folk = living(s).filter(q => !q.gast), skrivna = new Set(skrifter(s).filter(k => k.tek).map(k => k.tek!));
    let tek: string | undefined, tw = 0;
    for (const id in p.tek ?? {}) {
      const t = TEK[id];
      if (!t || t.niva < SKRIFT.bokNiva || !knows(p, id) || skrivna.has(id)) continue;
      const w = SKRIFT.kunskap * (1 - folk.filter(q => knows(q, id)).length / Math.max(1, folk.length)) + SKRIFT.kunskapBas;
      if (w > tw) { tw = w; tek = id; }
    }
    if (tek) c.push({ w: tw, slag: 'kunskap', tek });
  }
  const tr = troOf(s, p.tro);
  if (tr && tr.slut === undefined && tr.kvade && (prastOf(s, tr) === p || tr.kvade.larjunge === p.id) && bokPlats(s, 'helig') && !harBlad(s, k => k.slag === 'helig' && k.tro === tr.id))
    c.push({ w: SKRIFT.helig, slag: 'helig', om: { id: tr.id, namn: troNamn(tr) }, tro: tr.id });
  const avtar = SKRIFT.avtar ** skrifter(s).filter(k => k.av.id === p.id).length, blad = getable(s, p, 'pergament') >= 1;
  let best: SkrivLust | undefined;
  for (const l of c) {
    const bok = bokPlats(s, l.slag); // en ledig del i en bok framför ett blad
    if (!bok && !(blad && SKRIFTER[l.slag].stadier.includes('pergament'))) continue;
    if (bok) l.bok = bok;
    l.w *= avtar * p.skill[SKRIFTER[l.slag].skill] / SKRIFT.skrivDiv;
    if (!best || l.w > best.w) best = l;
  }
  return best;
}
// ljuset att skriva och läsa i på (x, y): dagsljuset, annars elden, facklan och ljusen (ljus.ts)
export const skrivLjus = (s: State, x: number, y: number) => Math.max(lightLevel(s.now), Math.min(1, ljusAt(s, x, y)));
const harAtt = (s: State) => vatskaAv(s, 'black') >= 1;
// skrivvikten i valet av fritid (val.ts): lusten gånger färdigheten, gånger ljuset där hen skulle skriva
export function skrivVal(s: State, p: Person, at: { x: number; y: number }) {
  const ljus = skrivLjus(s, at.x, at.y);
  if (ljus < SKRIFT.ljusMin || !harAtt(s)) return undefined;
  const l = skrivLust(s, p);
  return l && l.w > 0 ? { w: l.w * ljus * SKRIFT.fritid, why: l.slag === 'lardom' ? 'Vill skriva ner det hen vet' : l.om ? `Vill skriva om ${l.om.namn}` : 'Vill skriva' } : undefined;
}
const tingXY = (s: State, t: Ting) => { const q = t.hos !== undefined ? byId(s, t.hos) : undefined; return q ? { x: q.x, y: q.y } : t.x !== undefined ? { x: t.x + 0.5, y: t.y! + 0.5 } : undefined; };
const kanBev = (q: Person, om: number, b: Bevis) => !!q.intryck?.some(e => e.om === om && e.bev?.some(x => x.h === b.h && x.t === b.t));
// så stor del av innehållet som når läsaren (steg 10.6.7): en dålig skrift ger lägre säkerhet, mindre glädje och en del av en teknik
export const narAv = (k: Skrift) => SKRIFT.nar[k.q ?? NORMAL] ?? 1;
// nyttan för q av att läsa skriften: noll när q skrev den eller redan vet det som står
export function lasNytta(q: Person, k: Skrift) {
  if (k.av.id === q.id) return 0;
  if (k.tek) { const t = TEK[k.tek]; return t && (q.tek?.[t.id] ?? 0) < narAv(k) - 1e-9 && !knows(q, t.id) && t.krav.every(x => knows(q, x)) ? SKRIFT.lasKunskap : 0; } // ur en dålig handbok bara en del av vägen (steg 10.6.7) // en handbok: den som inte kan tekniken men kan det den kräver
  if (k.tro !== undefined) return q.tro === k.tro && !q.thoughts?.some(x => x.text === 'Läste de heliga kvädena') ? SKRIFT.lasHelig : 0;
  if (k.lar) return findL(q, k.lar.k, k.lar.a, k.lar.sl) ? 0 : SKRIFT.lasLardom;
  const b = k.bev?.[0];
  if (!b || !k.om || kanBev(q, k.om.id, b)) return 0;
  return SKRIFT.lasHandelse * HANDELSER[b.h].vikt + (k.slag === 'poesi' || k.slag === 'berattelse' ? SKRIFT.lasGladje : 0);
}
// läsvikten i valet av fritid: den högsta nyttan bland bladen q kommer åt, gånger ljuset där bladet ligger
export function lasVal(s: State, q: Person) {
  if (q.gast || ageOf(q, s.now) < ALDER.vuxen) return undefined;
  let best: { w: number; t: Ting; spot: { x: number; y: number } } | undefined;
  for (const t of tingOf(s)) {
    if (!t.skrift && !t.delar || t.lass !== undefined) continue;
    const at = tingXY(s, t), n = at ? basta(q, t)?.n ?? 0 : 0;
    if (!at || n <= 0) continue;
    const ljus = skrivLjus(s, at.x, at.y), w = n * ljus * SKRIFT.fritid;
    if (ljus >= SKRIFT.ljusMin && (!best || w > best.w)) best = { w, t, spot: at };
  }
  const k = best && basta(q, best.t)!.k;
  return best && k && { w: best.w, ref: best.t.id, spot: best.spot, why: `Vill läsa ${k.titel.charAt(0).toLowerCase() + k.titel.slice(1)}${best.t.delar ? ' i boken' : ''}` };
}
// den skrift på bladet eller i boken som är mest till nytta för q
function basta(q: Person, t: Ting) {
  let b: { k: Skrift; n: number } | undefined;
  for (const k of t.skrift ? [t.skrift] : t.delar ?? []) { const n = lasNytta(q, k); if (n > 0 && (!b || n > b.n)) b = { k, n }; }
  return b;
}
// rubriken och texten på bladet
function skriv(s: State, p: Person, l: SkrivLust): { titel: string; text: string } {
  const om = l.om?.namn ?? '', vad = l.bev?.[0] ? bevisText(l.bev[0], '').trim() : '';
  if (l.slag === 'minne') return { titel: `Minnet av ${om}`, text: `${p.name} skrev om ${om}, som inte längre lever.` };
  if (l.slag === 'handelse') return { titel: `${gen(p.name)} bedrift`, text: `${p.name} skrev: ${han(p)} ${vad}.` };
  if (l.slag === 'lardom') return { titel: `Om ${LARDOMAR[l.lar!.k].namn}`, text: describe(s, l.lar!).text };
  if (l.slag === 'poesi') return { titel: `Kvädet om ${om}`, text: `Hör om ${om}, som ${vad}.` };
  if (l.slag === 'kunskap') { const t = TEK[l.tek!]!; return { titel: `Om ${t.namn.toLowerCase()}`, text: `${t.text} ${t.effekt}` }; }
  if (l.slag === 'helig') return { titel: `De heliga kvädena (${om.toLowerCase()})`, text: troOf(s, l.tro!)?.kvade?.text ?? '' };
  return { titel: `Berättelsen om ${om}`, text: `${om} ${vad}.` };
}
// när bladet är skrivet: 1 blad pergament och 1 dos bläck går åt, och bladet ligger i förrådet och är skrivarens
export function skrivKlar(s: State, p: Person) {
  const l = skrivLust(s, p);
  if (!l || !harAtt(s) || skrivLjus(s, p.x, p.y) < SKRIFT.ljusMin) return;
  taVatska(s, 'black', 1);
  const tx = skriv(s, p, l), kv = { id: l.bok?.id ?? 0, k: l.bok ? 'bok' : 'blad', q: undefined as number | undefined };
  nyKvalitet(s, p, kv, 0, tx.titel, SKRIFTER[l.slag].skill); // kvaliteten ligger på skriften och rör inte bladets eller bokens hållbarhet (steg 10.6.7)
  const q = kv.q ?? NORMAL, fc = SKRIFT.felChans[q] ?? 0;
  const fel = fc > 0 && rnd(s, 'kunskap', p) < fc ? (rnd(s, 'kunskap', p) < 0.5 ? SKRIFT.felOver : SKRIFT.felUnder) : undefined; // slås en gång och står kvar i texten
  if (fel && l.lar) l.lar = { ...l.lar, v: clamp(l.lar.v * fel, 0, l.lar.k === 'fara' ? MINNE.vMaxFara : l.lar.k === 'vatten' ? 1 : l.lar.k === 'pris' ? Infinity : MINNE.vMax) };
  if (fel && l.lar) tx.text = describe(s, l.lar).text;
  const k: Skrift = { q, ...(fel ? { fel } : {}), slag: l.slag, av: { id: p.id, namn: p.name }, t: s.now, ...tx, ...(l.om ? { om: l.om } : {}), ...(l.bev ? { bev: l.bev } : {}), ...(l.lar ? { lar: l.lar } : {}), ...(l.tek ? { tek: l.tek } : {}), ...(l.tro !== undefined ? { tro: l.tro } : {}) };
  if (l.bok) { (l.bok.delar ??= []).push(k); count(s, 'bokdel'); }
  else { takeMaterial(s, p, 'pergament', 1, true, {}); const t = newTing(s, 'blad', 1, p.id); t.skrift = k; t.av = p.id; t.gjord = s.now; }
  count(s, 'skrivet'); count(s, 'skrivet_' + l.slag);
  think(p, `Skrev ${tx.titel.charAt(0).toLowerCase() + tx.titel.slice(1)}`, 0.02, s.now, 6 * HOUR);
  if (forstaGang(s, 'skrivet')) log(s, `${p.name} skrev byns första blad: ${tx.titel.toLowerCase()}.`, 'skill', [p.id]);
}
// när bladet är läst: lärdomen med skrivaren som källa, intrycket i andra hand och glädjen av kvädet och berättelsen
export function lasKlar(s: State, q: Person, t: Task) {
  const b = tingOf(s).find(x => x.id === t.ref), k = b && basta(q, b)?.k, at = b && tingXY(s, b);
  if (!k || !at || skrivLjus(s, at.x, at.y) < SKRIFT.ljusMin) return;
  const nar = narAv(k);
  if (k.tek) { // handboken: tekniken lärs utan lärare, långsammare än av en mästare, och ur en dålig bara en del av vägen
    const tk = TEK[k.tek]!, d = SKRIFT.bokLar * (TEKTAL.larBas + stat(q, 'intelligens', s.now) / 20);
    q.tek ??= {}; q.tek[tk.id] = Math.max(q.tek[tk.id] ?? 0, Math.min(nar, (q.tek[tk.id] ?? 0) + d));
    if (q.tek[tk.id]! >= 1) { q.tek[tk.id] = 0; learn(s, q, tk, s.people.find(x => x.id === k.av.id)); log(s, `${q.name} lärde sig ${tk.namn.toLowerCase()} ur ${gen(k.av.namn)} bok.`, 'skill', [q.id]); count(s, 'bokLart'); }
  }
  if (k.tro !== undefined) think(q, 'Läste de heliga kvädena', SKRIFT.heligTanke, s.now, SKRIFT.heligTim * HOUR);
  if (k.lar) lasLardom(s, q, { ...k.lar, c: k.lar.c * nar }, k.av.id);
  if (k.om) for (const x of k.bev ?? []) lasIntryck(s, q, k.om, x, k.av.id, SKRIFT.lasVikt * nar * (k.fel ?? 1));
  if (k.slag === 'minne' && k.om) paminn(s, q, k.om.id);
  if (k.slag === 'poesi' || k.slag === 'berattelse') think(q, `Läste ${gen(k.av.namn)} ${k.slag === 'poesi' ? 'kväde' : 'berättelse'}`, (k.slag === 'poesi' ? SKRIFT.gladjePoesi : SKRIFT.gladjeBer) * nar, s.now, SKRIFT.gladjeTim * HOUR);
  count(s, 'last'); count(s, 'last_' + k.slag);
}
