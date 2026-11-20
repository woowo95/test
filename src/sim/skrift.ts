import { DAY, H, HOUR, Lardom, MIN, Person, Skill, State, Task, W } from './typer';
import { SKRIFT } from './skriftTal';
import { ALDER, ageOf, alive, byId, count, forstaGang, living, log, relKey, stat, think } from './folk';
import { TEK, TEKTAL, knows, learn } from './teknik';
import { getable, takeMaterial } from './behov';
import { usable } from './lager';
import { bitAt, roomAt } from './byggnad';
import { omrade } from './omrade';
import { Bevis, HANDELSER, Intryck, bevisText, kandVikt, lasIntryck, paminn } from './rykten';
import { Ting, newTing, tingOf } from './agande';
import { taVatska, vatskaAv } from './vatskor';
import { LARDOMAR, describe, findL, lasLardom } from './minne';
import { larUppdrag, tilltro, type UppdragId } from './uppdrag';
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
import { LAGAR, type Lag, lagTak, lagarNu, skrivenLag } from './lagar';
import { STRAFF_NAMN } from './styre';
import { kvVid, stationDef, stationFor, vidStation } from './stationer';
import { O_BESOKT, O_KANT, O_RYKTE, kannerOrt, larOrt, ortensRad, radVid } from './ort';
import { byPlats, varldPlatsNr } from './landmarken';

// ---------- skriften (system 10.6) ----------
// Skriften i tre stadier: runstenen, pergamentet och boken. Registret SKRIFTER har en rad per slag av innehåll, med de stadier
// slaget kan stå på. Runstenen (steg 10.6.1) är ingen egen teknik: den som kan stenhuggning bär 3 huggna stenar till en ruta ute
// i byn och ristar runorna där, som en station. Lusten att resa en sten kommer ur sorgen efter en nära anhörig och stoltheten
// efter en bedrift, och räknas in i projektens värde som lusten efter pynt (projektraden runsten). De som går förbi läser stenen
// en gång i timmen och får intrycket i andra hand, och den som står på en sten glöms långsammare (rykten.ts). Stenen brinner
// inte, flyttas inte och rivs inte för ett hus: den är ingen station, och rutan är upptagen för allt annat (usable i lager.ts)
export type SkriftSlag = 'minne' | 'handelse' | 'helig' | 'lardom' | 'poesi' | 'berattelse' | 'kunskap' | 'lag' | 'karta' | 'byn';
export type SkriftStadium = 'sten' | 'pergament' | 'bok';
// skill = färdigheten som gör att man skriver slaget oftare (steg 10.6.5)
// min = minuterna att skriva det för hand (SKRIFT.skrivMin om inget anges), ikon = symbolen i listan över skrifterna
export const SKRIFTER: Record<SkriftSlag, { namn: string; stadier: SkriftStadium[]; skill: Skill; min?: number; ikon?: string }> = {
  minne: { namn: 'Minne', stadier: ['sten', 'pergament', 'bok'], skill: 'berattande' }, // en död, ur ristarens minne av hen
  handelse: { namn: 'Händelse', stadier: ['sten', 'pergament', 'bok'], skill: 'berattande' }, // en bedrift som ristaren minns
  helig: { namn: 'Heligt', stadier: ['sten', 'bok'], skill: 'skaldskap' }, // trons heliga kväden, som prästen eller lärjungen kan utantill (steg 10.6.2)
  lardom: { namn: 'Lärdom', stadier: ['pergament', 'bok'], skill: 'berattande' }, // priser, platser och faror (steg 10.6.5)
  poesi: { namn: 'Poesi', stadier: ['sten', 'pergament', 'bok'], skill: 'skaldskap' }, // skaldens kväde om någon
  berattelse: { namn: 'Berättelse', stadier: ['pergament', 'bok'], skill: 'berattande' }, // en historia om någon skrivaren minns
  kunskap: { namn: 'Kunskap', stadier: ['bok'], skill: 'berattande' }, // en handbok om en teknik (steg 10.6.6)
  lag: { namn: 'Lag', stadier: ['sten', 'pergament', 'bok'], skill: 'berattande' }, // en lag med sitt straff, så att byn klarar fler (steg 10.6.10)
  karta: { namn: 'Karta', stadier: ['pergament', 'bok'], skill: 'berattande', min: 4, ikon: 'karta' }, // platser i världen som ritaren känner (steg 11.7.1)
  byn: { namn: 'Om en by', stadier: ['bok'], skill: 'berattande', min: 4 }, // en by som skrivaren bott i eller besökt, med uppgifterna från den tiden (steg 11.7.7)
};
export { SKRIFT } from './skriftTal';
export interface SkriftLag { id: string; straff: number; tal?: Record<string, number> }
export interface Runsten { lag?: SkriftLag; id: number; x: number; y: number; t: number; slag: SkriftSlag; av: { id: number; namn: string }; om: { id: number; namn: string }; bev?: Bevis[]; text: string; runor: string; tro?: number; bild?: 1 } // tro = den heliga stenens tro (om = tron); bild = en bildsten (steg 10.7.1)
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
interface Lust { w: number; slag: SkriftSlag; om: { id: number; namn: string }; bev?: Bevis[]; lag?: SkriftLag }
const harSten = (s: State, slag: SkriftSlag, om: number, t?: number) => !!s.runstenar?.some(r => r.slag === slag && r.om.id === om && (t === undefined || r.bev?.[0]?.t === t));
export function runstenLust(s: State, p: Person): Lust | undefined {
  if (p.gast || ageOf(p, s.now) < ALDER.vuxen || !knows(p, 'stenhuggarplats')) return undefined;
  let best: Lust | undefined;
  for (const g of p.sorg ?? []) {
    const d = g.vem !== undefined ? byId(s, g.vem) : s.people.find(q => q.name === g.namn && q.died !== undefined);
    if (!d || alive(d) || harSten(s, 'minne', d.id) || s.gravar?.some(q => q.vem === d.id && q.text)) continue;
    const w = SKRIFT.sorg * Math.abs(g.v) / Math.abs(LIV.sorjPartner) * kandVikt(s, d.id); // den byn minns väljs oftare (steg 10.6.14)
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
  const lg = lagLust(s, p);
  if (lg && (!best || lg.w > best.w)) best = { w: lg.w, slag: 'lag', om: { id: Object.keys(LAGAR).indexOf(lg.lag.id), namn: LAGAR[lg.lag.id]!.namn }, lag: lg.lag }; // (numret räknas här: lönen och arvsskatten läggs i LAGAR efter att filen laddats)
  return best;
}

// ---------- de skrivna lagarna (steg 10.6.10) ----------
// En lag som står skriven behöver byn inte hålla i minnet: varje gällande lag som finns i minst en skrift av slaget lag med samma
// straff och tal som nu höjer taket (lagTak i lagar.ts). Lusten att skriva en lag är andelen lagar som är oskrivna, gånger hur nära
// taket byn är; det finns inget påbud om det (steg 12.1.27). Den som skriver väljer den oskrivna lag hen själv röstar starkast för
export function lagSkrivVikt(s: State) {
  const lag = lagarNu(s);
  if (!lag.length) return 0;
  return lag.filter(l => !skrivenLag(s, l)).length / lag.length * Math.min(1, lag.length / Math.max(1, lagTak(s)));
}
function lagLust(s: State, p: Person): { w: number; lag: SkriftLag } | undefined {
  const w = SKRIFT.lag * lagSkrivVikt(s);
  if (w <= 0 || living(s).some(q => q !== p && q.task?.act === 'runsten' && q.task.tool === 'lag')) return undefined; // en lag i taget
  let bast: Lag | undefined, bv = -Infinity;
  for (const l of lagarNu(s)) { if (skrivenLag(s, l)) continue; const v = LAGAR[l.id]!.rost(s, p).v; if (v > bv) { bv = v; bast = l; } }
  return bast && { w, lag: { id: bast.id, straff: bast.straff, ...(bast.tal ? { tal: { ...bast.tal } } : {}) } };
}
const lagText = (k: SkriftLag) => `${LAGAR[k.id]!.text}. Straffet: ${STRAFF_NAMN[k.straff]!.toLowerCase()}.`;

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
  return { act: 'runsten' as const, text: l.slag === 'minne' ? `Reser en runsten efter ${l.om.namn}.` : l.lag ? `Ristar lagen ${l.om.namn.toLowerCase()} på en sten.` : l.slag === 'helig' ? 'Ristar de heliga kvädena på en sten.' : 'Reser en runsten om sin bedrift.', min: SKRIFT.min, tool: l.slag, spot: { x: at.x + 0.5, y: at.y + 0.5 }, ref: l.om.id };
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
// medan man ristar (MEDAN): stenarna ska finnas när arbetet börjar, i bördan eller bredvid; saknas de, eller lusten är borta,
// blir det ingen sten. De tas när stenen reses, så att den som avbryts lägger ner dem där hen står
export function runstenBorja(s: State, p: Person, t: Task) {
  if (t.kom) return;
  const l = runstenLust(s, p);
  if (!l || l.slag !== t.tool || l.om.id !== t.ref || getable(s, p, 'huggen_sten') < SKRIFT.stenar || !ledigRuta(s, Math.floor(t.tx), Math.floor(t.ty), p)) { p.task = undefined; return; }
  t.kom = {};
}
export function runstenKlar(s: State, p: Person, t: Task) {
  const l = runstenLust(s, p), x = Math.floor(t.tx), y = Math.floor(t.ty);
  if (!l || l.slag !== t.tool || l.om.id !== t.ref || runstenAt(s, x, y) || getable(s, p, 'huggen_sten') < SKRIFT.stenar) return;
  takeMaterial(s, p, 'huggen_sten', SKRIFT.stenar, true, t.kom ??= {});
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
  } else if (l.lag) {
    text = `${l.om.namn}: ${lagText(l.lag)}`;
  } else {
    // en händelse berättas i bilder i stället för runor: bildstenen (steg 10.7.1)
    text = `${p.name} reste stenen, och bilderna på den visar hur ${bevisText(bev![0], p.name).trim().replace(/\.$/, '')}.`;
  }
  const bild = l.slag === 'handelse';
  const id = (s.runstenar?.reduce((m, r) => Math.max(m, r.id), 0) ?? 0) + 1;
  runstenarOf(s).push({ id, x, y, t: s.now, slag: l.slag, av: { id: p.id, namn: p.name }, om: l.om, ...(bev?.length ? { bev } : {}), ...(l.slag === 'helig' ? { tro: l.om.id } : {}), ...(l.lag ? { lag: l.lag } : {}), ...(bild ? { bild: 1 as const } : {}), text, runor: bild ? '' : runor(text) });
  s.byggV = (s.byggV ?? 0) + 1;
  count(s, 'runsten'); count(s, 'runsten_' + l.slag); if (bild) count(s, 'bildsten');
  think(p, l.slag === 'minne' ? `Reste en sten efter ${l.om.namn}` : l.slag === 'helig' ? 'Ristade de heliga kvädena' : l.lag ? 'Ristade en lag' : 'Reste en sten om sin bedrift', 0.03, s.now, 12 * HOUR);
  const rad = l.slag === 'minne' ? `${p.name} reste en runsten efter ${l.om.namn}.` : l.lag ? `${p.name} ristade lagen ${l.om.namn.toLowerCase()} på en sten.` : l.slag === 'helig' ? `${p.name} ristade de heliga kvädena (${l.om.namn.toLowerCase()}) på en sten.` : `${p.name} reste en bildsten om sin bedrift.`;
  log(s, rad, 'rel', [p.id]); notis(s, 'runsten', rad, [p.id], { x, y }); kronika(s, rad, 'runsten');
}

// ---------- att läsa stenen ----------
// en gång i timmen (TAKTER): om varje tro har en helig skrift, och den som är vaken nära en sten läser den och får intrycket i andra hand, med ristaren som källa;
// en sten efter en död påminner om hen, så att minnet bleknar långsammare (paminn)
export function runstenTimme(s: State) {
  skriftBorta(s);
  for (const tr of s.tron ?? []) { const har = heligaStenar(s, tr).length > 0 || bockerna(s).some(b => b.delar?.some(k => k.slag === 'helig' && k.tro === tr.id)); if (har) tr.skrift = true; else delete tr.skrift; } // om tron har en helig skrift (steg 10.6.3): en helig sten eller de heliga kvädena i en bok (steg 12.1.61)
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
    if (r.slag === 'minne') paminn(s, q, r.om.id, r.bev);
    if (r.slag === 'helig' && q.tro === r.tro) think(q, 'Läste de heliga kvädena', SKRIFT.heligTanke, s.now, SKRIFT.heligTim * HOUR); // bara den som tror
    count(s, 'runstenLast');
  }
}
// ---------- listan i krönikan (steg 10.6.8) ----------
// Krönikans kategori Skrifter läser stenarna, bladen och böckerna själva, aldrig händelseloggen: det som brunnit, ruttnat eller
// rivits försvinner ur listan. En gång i timmen jämförs stenarna och böckerna med förra timmen, och för den som är borta skrivs en
// rad i krönikan
export interface SkriftRad { ikon?: string; id: string; stadium: SkriftStadium; t: number; q?: number; titel: string; text: string; runor?: string; delar?: { titel: string; text: string; q?: number }[]; plats: string; x?: number; y?: number }
export const bokTitel = (t: Ting) => { const d = t.delar ?? [], g = d[0]?.slag; return !g ? 'En tom bok' : g === 'kunskap' ? (d.length === 1 ? d[0]!.titel : 'Handboken') : g === 'helig' ? 'De heliga kvädena' : g === 'karta' ? 'Kartboken' : g === 'byn' ? (d.length === 1 ? d[0]!.titel : 'Boken om byarna') : `Boken med ${SKRIFTER[g].namn.toLowerCase()}`; };
function tingPlats(s: State, t: Ting) {
  const q = t.hos !== undefined ? byId(s, t.hos) : undefined, at = tingXY(s, t);
  return { plats: q ? `Bärs av ${q.name}` : t.vid !== undefined ? 'Vid en station' : at ? 'I byn' : 'Okänd plats', ...(at ? { x: Math.floor(at.x), y: Math.floor(at.y) } : {}) };
}
export function skriftLista(s: State): SkriftRad[] {
  const r: SkriftRad[] = (s.runstenar ?? []).map(x => ({ id: `sten-${x.id}`, stadium: 'sten' as const, t: x.t, titel: runstenRubrik(x), text: x.text, runor: x.runor, plats: 'Står ute i byn', x: x.x, y: x.y }));
  for (const t of tingOf(s)) {
    if (t.k === 'blad' && t.skrift) r.push({ id: `ting-${t.id}`, stadium: 'pergament', ...(SKRIFTER[t.skrift.slag].ikon ? { ikon: SKRIFTER[t.skrift.slag].ikon } : {}), t: t.skrift.t, ...(t.skrift.q !== undefined ? { q: t.skrift.q } : {}), titel: t.skrift.titel, text: t.skrift.text, ...tingPlats(s, t) });
    else if (t.k === 'bok') r.push({ id: `ting-${t.id}`, stadium: 'bok', t: t.gjord ?? 0, ...(t.q !== undefined ? { q: t.q } : {}), titel: bokTitel(t), text: `${t.delar?.length ?? 0} av ${SKRIFT.bokDelar} delar skrivna.`, delar: (t.delar ?? []).map(k => ({ titel: k.titel, text: k.text, ...(k.q !== undefined ? { q: k.q } : {}) })), ...tingPlats(s, t) });
  }
  return r.sort((a, b) => b.t - a.t);
}
function skriftBorta(s: State) {
  const nu: [string, string][] = [...(s.runstenar ?? []).map(x => [`sten-${x.id}`, runstenRubrik(x)] as [string, string]), ...bockerna(s).map(t => [`ting-${t.id}`, bokTitel(t)] as [string, string])];
  const forr = s.skriftSedda ?? [], har = new Set(nu.map(x => x[0]));
  for (const [id, titel] of forr) if (!har.has(id)) { kronika(s, `${titel} finns inte längre${id.startsWith('sten') ? '' : ': boken är förlorad'}.`, 'skrift'); count(s, 'skriftBorta'); }
  if (nu.length || forr.length) s.skriftSedda = nu;
}
// i rutan som visas vid ett tryck: runorna överst och texten på svenska under
export const runstenRubrik = (r: Runsten) => r.lag ? `Lagstenen (${LAGAR[r.lag.id]?.namn.toLowerCase() ?? 'lagen'})` : r.slag === 'minne' ? `Stenen efter ${r.om.namn}` : r.slag === 'helig' ? `Den heliga stenen (${r.om.namn.toLowerCase()})` : `${gen(r.av.namn)} ${r.bild ? 'bildsten' : 'sten'}`;
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
export interface Skrift { lag?: SkriftLag; slag: SkriftSlag; av: { id: number; namn: string }; t: number; titel: string; text: string; om?: { id: number; namn: string }; bev?: Bevis[]; lar?: Lardom; tek?: string; tro?: number; ensam?: true; q?: number; fel?: number; platser?: KartPlats[]; kid?: number } // kid = kartans nummer, samma i alla avskrifter (steg 11.7.3) // q = kvaliteten (steg 10.6.7), fel = överdriften eller underdriften gånger värdet
// en plats på kartan (steg 11.7.1): platsens nummer i världen, nivån den ritades med (högst känd) och tiden för uppgifterna
export interface KartPlats { nr: number; v: number; t: number; m?: KartMarke[] } // m = märkena vid platsen (steg 11.8.14)
// ett märke på kartan (steg 11.8.14): ett uppdrag eller ett fynd ritaren trodde på, med numret, det trodda värdet, när
// uppgiften var ny och uppdragets sort
export interface KartMarke { a: number; v: number; t: number; k: string }
interface SkrivLust { platser?: KartPlats[]; fran?: Skrift; lag?: SkriftLag; w: number; slag: SkriftSlag; om?: { id: number; namn: string }; bev?: Bevis[]; lar?: Lardom; tek?: string; tro?: number; bok?: Ting }
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
const sammaLar = (a: Lardom, b: Lardom) => a.k === b.k && a.a === b.a && a.sl === b.sl;
// det starkaste intrycket p har av en annan, med ett bevis att berätta om (som i framträdandet, helst en död)
function starkastBev(s: State, p: Person) {
  let bast: { e: Intryck; v: number } | undefined;
  for (const e of p.intryck ?? []) {
    if (e.om === p.id || !e.bev?.length) continue;
    const q = byId(s, e.om), v = e.v * e.c * (!q || !alive(q) ? 2 : 1) * kandVikt(s, e.om); // den byn minns väljs oftare (steg 10.6.14)
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
    if (l.k === 'flod' || l.k === 'ort' || l.k === 'uppdrag') continue; // platserna i världen skrivs på kartor (fas 11)
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
  const lg = lagLust(s, p);
  if (lg) c.push({ w: lg.w, slag: 'lag', lag: lg.lag });
  const kt = kartLust(s, p);
  if (kt) c.push(kt);
  const bl = byLust(s, p);
  if (bl) c.push(bl);
  const ko = kopiaLust(s);
  if (ko) c.push(ko);
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
// ---------- boken om en by (steg 11.7.7) ----------
// Den som besökt en by (eller bott där) kan skriva om den i en bok: folket, husen, sederna och historien, med uppgifterna från
// den tid hen senast var där eller hörde om den. Lusten är SKRIFT.bybok för den by vars uppgifter är nyast och som ingen bok i
// byn redan har lika nya uppgifter om. Läsaren får platsen och uppgifterna från den tiden
function byLust(s: State, p: Person): SkrivLust | undefined {
  const vl = s.varld;
  if (!vl) return undefined;
  const egen = vl.huvud !== undefined ? byPlats(vl, vl.huvud)?.nr : undefined, har = skrifter(s).filter(k => k.slag === 'byn');
  const l = (p.lardomar ?? []).filter(x => x.k === 'ort' && x.a !== egen && x.v >= O_BESOKT && varldPlatsNr(vl, x.a)?.k === 'by' && !har.some(k => k.platser?.[0]?.nr === x.a && k.platser[0].t >= x.t)).sort((a, b) => b.t - a.t)[0];
  return l && { w: SKRIFT.bybok, slag: 'byn', platser: [{ nr: l.a, v: O_KANT, t: l.t }] };
}
function byText(s: State, p: Person, x: KartPlats) {
  const r = ortensRad(s, x.nr), b = r && radVid(r, x.t), namn = platsNamn(s, x.nr);
  if (!b) return `${p.name} skrev om ${namn}.`;
  if (b.borta) return `${p.name} skrev om ${namn}, som inte längre fanns.`;
  return `${p.name} skrev om folket, husen, sederna och historien i ${namn}: ${b.tal.folk} invånare${b.led ? `, ledaren hette ${b.led}` : ''}${b.tro ? ` och de trodde på ${b.tro}` : ''}.`;
}

// ---------- kartan (steg 11.7.1) ----------
// Den som minns platser i världen som ingen skrift i byn bär kan rita dem på en karta, högst SKRIFT.kartMax på ett blad, de
// säkraste först. Lusten är SKRIFT.karta gånger andelen av ett fullt blad, och nivån på kartan är högst känd (ett besök ritas
// som känt). Den som läser får platserna som ritaren hade dem, med tiden för uppgifterna
const iSkrift = (s: State) => { const n = new Set<number>(); for (const k of skrifter(s)) for (const x of k.platser ?? []) n.add(x.nr); return n; };
function kartLust(s: State, p: Person): SkrivLust | undefined {
  if (!s.varld) return undefined;
  const har = iSkrift(s), egen = s.varld.huvud !== undefined ? byPlats(s.varld, s.varld.huvud)?.nr : undefined;
  const nya = (p.lardomar ?? []).filter(l => l.k === 'ort' && l.a !== egen && !har.has(l.a)).sort((a, b) => b.c - a.c || b.v - a.v).slice(0, SKRIFT.kartMax);
  if (!nya.length) return undefined;
  return { w: SKRIFT.karta * nya.length / SKRIFT.kartMax, slag: 'karta', platser: nya.map(l => { const m = marken(s, p, l.a); return { nr: l.a, v: Math.min(O_KANT, l.v), t: l.t, ...(m.length ? { m } : {}) }; }) };
}
// märkena ritaren sätter vid platsen nr (steg 11.8.14): de uppdrag och fynd där hen tror på uppgiften (tilltron minst
// SKRIFT.marke), och ett tomt fynd som tomt
function marken(s: State, p: Person, nr: number): KartMarke[] {
  return (p.lardomar ?? []).filter(l => l.k === 'uppdrag' && l.g === nr && tilltro(s, l) >= SKRIFT.marke).map(l => ({ a: l.a, v: l.v, t: l.t, k: l.om ?? 'leverans' }));
}
// avskriften (steg 11.7.3): den som kommer åt en karta i byn kan skriva av den på SKRIFT.kopiaMin minuter. Lusten är SKRIFT.kopia
// gånger andelen av ett fullt blad, delat med antalet exemplar som finns av kartan (samma kid), och avskriften får sin egen
// kvalitet, så att en dålig avskrivare gör fler platser till rykten
const exemplar = (s: State, kid: number) => skrifter(s).filter(k => k.kid === kid).length;
function kopiaLust(s: State): SkrivLust | undefined {
  let best: SkrivLust | undefined;
  for (const t of tingOf(s)) {
    const k = t.skrift;
    if (k?.slag !== 'karta' || !k.platser?.length || t.lass !== undefined || !tingXY(s, t)) continue;
    const w = SKRIFT.kopia * k.platser.length / SKRIFT.kartMax / (k.kid === undefined ? 1 : exemplar(s, k.kid)); // ett original som ingen skrivit av är ett exemplar
    if (!best || w > best.w) best = { w, slag: 'karta', platser: k.platser.map(x => ({ ...x, ...(x.m ? { m: x.m.map(y => ({ ...y })) } : {}) })), fran: k.kid === undefined ? { ...k, kid: t.id } : k };
  }
  return best;
}
// kartans kvalitet (steg 11.7.2): på en usel eller slarvig karta ritas en känd plats som ett rykte med chansen SKRIFT.kartRykte
// för kvaliteten, slaget en gång när kartan ritas
export function kartRykten(s: State, p: Person, pl: KartPlats[], q: number): KartPlats[] {
  const ch = SKRIFT.kartRykte[q] ?? 0;
  return pl.map(x => x.v > O_RYKTE && ch > 0 && rnd(s, 'kunskap', p) < ch ? { ...x, v: O_RYKTE } : x);
}
const platsNamn = (s: State, nr: number) => (s.varld && varldPlatsNr(s.varld, nr)?.namn) ?? 'en plats';
const kartNamn = (s: State, pl: KartPlats[]) => { const n = pl.map(x => platsNamn(s, x.nr)); return n.length <= 2 ? n.join(' och ') : `${n.slice(0, 2).join(', ')} och ${n.length - 2} till`; };
// det nya på kartan för q: platserna q känner sämre än de är ritade
// det på kartan som q inte känner, och i boken om en by (steg 11.7.7) också uppgifter som är nyare än de q har
const kartNya = (s: State, q: Person, k: Skrift) => (k.platser ?? []).filter(x => (kannerOrt(s, q, x.nr) ?? -1) < x.v || k.slag === 'byn' && (findL(q, 'ort', x.nr)?.t ?? -Infinity) < x.t || nyaMarken(q, x).length > 0);
// märkena q inte känner, eller känner med en äldre uppgift (steg 11.8.14)
const nyaMarken = (q: Person, x: KartPlats) => (x.m ?? []).filter(y => (findL(q, 'uppdrag', y.a)?.t ?? -Infinity) < y.t);
// ljuset att skriva och läsa i på (x, y): dagsljuset, annars elden, facklan och ljusen (ljus.ts)
export const skrivLjus = (s: State, x: number, y: number) => Math.max(lightLevel(s.now), Math.min(1, ljusAt(s, x, y)));
const harAtt = (s: State) => vatskaAv(s, 'black') >= 1;
// skrivvikten i valet av fritid (val.ts): lusten gånger färdigheten, gånger ljuset där hen skulle skriva
export function skrivVal(s: State, p: Person, at: { x: number; y: number }) {
  const ljus = skrivLjus(s, at.x, at.y);
  if (ljus < SKRIFT.ljusMin || !harAtt(s)) return undefined;
  const l = skrivLust(s, p);
  return l && l.w > 0 ? { w: l.w * ljus * SKRIFT.fritid, slag: l.slag, min: l.fran ? SKRIFT.kopiaMin : SKRIFTER[l.slag].min ?? SKRIFT.skrivMin, why: l.fran ? 'Vill skriva av en karta' : l.slag === 'karta' ? 'Vill rita en karta' : l.slag === 'lardom' ? `Vill skriva ner det ${han(p)} vet` : l.lag ? `Vill skriva ner lagen ${LAGAR[l.lag.id]!.namn.toLowerCase()}` : l.om ? `Vill skriva om ${l.om.namn}` : 'Vill skriva' } : undefined;
}
const tingXY = (s: State, t: Ting) => { const q = t.hos !== undefined ? byId(s, t.hos) : undefined; return q ? { x: q.x, y: q.y } : t.x !== undefined ? { x: t.x + 0.5, y: t.y! + 0.5 } : undefined; };
const kanBev = (q: Person, om: number, b: Bevis) => !!q.intryck?.some(e => e.om === om && e.bev?.some(x => x.h === b.h && x.t === b.t));
// så stor del av innehållet som når läsaren (steg 10.6.7): en dålig skrift ger lägre säkerhet, mindre glädje och en del av en teknik
export const narAv = (k: Skrift) => SKRIFT.nar[k.q ?? NORMAL] ?? 1;
// nyttan för q av att läsa skriften: noll när q skrev den eller redan vet det som står
export function lasNytta(s: State, q: Person, k: Skrift) {
  if (k.av.id === q.id) return 0;
  if (k.platser) return kartNya(s, q, k).length ? SKRIFT.lasKarta : 0;
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
    const at = tingXY(s, t), n = at ? basta(s, q, t)?.n ?? 0 : 0;
    if (!at || n <= 0) continue;
    const ljus = skrivLjus(s, at.x, at.y), w = n * ljus * SKRIFT.fritid;
    if (ljus >= SKRIFT.ljusMin && (!best || w > best.w)) best = { w, t, spot: at };
  }
  const k = best && basta(s, q, best.t)!.k;
  return best && k && { w: best.w, ref: best.t.id, spot: best.spot, why: `Vill läsa ${k.titel.charAt(0).toLowerCase() + k.titel.slice(1)}${best.t.delar ? ' i boken' : ''}` };
}
// den skrift på bladet eller i boken som är mest till nytta för q
function basta(s: State, q: Person, t: Ting) {
  let b: { k: Skrift; n: number } | undefined;
  for (const k of t.skrift ? [t.skrift] : t.delar ?? []) { const n = lasNytta(s, q, k); if (n > 0 && (!b || n > b.n)) b = { k, n }; }
  return b;
}
// rubriken och texten på bladet
function skriv(s: State, p: Person, l: SkrivLust): { titel: string; text: string } {
  const om = l.om?.namn ?? '', vad = l.bev?.[0] ? bevisText(l.bev[0], '').trim() : '';
  if (l.slag === 'minne') return { titel: `Minnet av ${om}`, text: `${p.name} skrev om ${om}, som inte längre lever.` };
  if (l.slag === 'handelse') return { titel: `${gen(p.name)} bedrift`, text: `${p.name} skrev: ${han(p)} ${vad}.` };
  if (l.slag === 'lardom') return { titel: `Om ${LARDOMAR[l.lar!.k].namn}`, text: describe(s, l.lar!).text };
  if (l.slag === 'poesi') return { titel: `Kvädet om ${om}`, text: `Hör om ${om}, som ${vad}.` };
  if (l.slag === 'lag' && l.lag) return { titel: LAGAR[l.lag.id]!.namn, text: lagText(l.lag) };
  if (l.slag === 'kunskap') { const t = TEK[l.tek!]!; return { titel: `Om ${t.namn.toLowerCase()}`, text: `${t.text} ${t.effekt}` }; }
  if (l.slag === 'karta' && l.fran) return { titel: `${l.fran.titel.replace(/ \(avskrift\)$/, '')} (avskrift)`, text: `${p.name} skrev av ${gen(l.fran.av.namn)} karta: ${l.platser!.map(x => platsNamn(s, x.nr)).join(', ')}.` };
  if (l.slag === 'byn') return { titel: `Boken om ${platsNamn(s, l.platser![0]!.nr)}`, text: byText(s, p, l.platser![0]!) };
  if (l.slag === 'karta') return { titel: `Kartan över ${kartNamn(s, l.platser!)}`, text: `${p.name} ritade ${l.platser!.map(x => platsNamn(s, x.nr)).join(', ')}.` };
  if (l.slag === 'helig') return { titel: `De heliga kvädena (${om.toLowerCase()})`, text: troOf(s, l.tro!)?.kvade?.text ?? '' };
  return { titel: `Berättelsen om ${om}`, text: `${om} ${vad}.` };
}
// var och hur länge hen skriver (steg 10.6.11): vid en ledig skrivpulpet fortare, annars för hand där hen är (at, vid elden)
export function skrivPlats(s: State, p: Person, at: { x: number; y: number }, min: number = SKRIFT.skrivMin) {
  const st = stationFor(s, 'skriva', p);
  return { spot: st ? vidStation(st) : at, dur: min * MIN / (st ? stationDef(st.k)?.fart?.skriva ?? 1 : 1), st };
}
// när bladet är skrivet: 1 blad pergament och 1 dos bläck går åt, och bladet ligger i förrådet och är skrivarens
export function skrivKlar(s: State, p: Person) {
  const l = skrivLust(s, p);
  if (!l || !harAtt(s) || skrivLjus(s, p.x, p.y) < SKRIFT.ljusMin) return;
  taVatska(s, 'black', 1);
  const tx = skriv(s, p, l), kv = { id: l.bok?.id ?? 0, k: l.bok ? 'bok' : 'blad', q: undefined as number | undefined };
  nyKvalitet(s, p, kv, kvVid(s, p, 'skriva'), tx.titel, SKRIFTER[l.slag].skill); // vid skrivpulpeten med stationens tillägg (steg 10.6.11) // kvaliteten ligger på skriften och rör inte bladets eller bokens hållbarhet (steg 10.6.7)
  const q = kv.q ?? NORMAL, fc = SKRIFT.felChans[q] ?? 0;
  const fel = fc > 0 && rnd(s, 'kunskap', p) < fc ? (rnd(s, 'kunskap', p) < 0.5 ? SKRIFT.felOver : SKRIFT.felUnder) : undefined; // slås en gång och står kvar i texten
  if (fel && l.lar) l.lar = { ...l.lar, v: clamp(l.lar.v * fel, 0, l.lar.k === 'fara' ? MINNE.vMaxFara : l.lar.k === 'vatten' ? 1 : l.lar.k === 'pris' ? Infinity : MINNE.vMax) };
  if (fel && l.lar) tx.text = describe(s, l.lar).text;
  if (l.platser && l.slag === 'karta') l.platser = kartRykten(s, p, l.platser, q);
  const k: Skrift = { q, ...(fel ? { fel } : {}), slag: l.slag, av: { id: p.id, namn: p.name }, t: s.now, ...tx, ...(l.om ? { om: l.om } : {}), ...(l.bev ? { bev: l.bev } : {}), ...(l.lar ? { lar: l.lar } : {}), ...(l.tek ? { tek: l.tek } : {}), ...(l.tro !== undefined ? { tro: l.tro } : {}), ...(l.lag ? { lag: l.lag } : {}), ...(l.platser ? { platser: l.platser } : {}), ...(l.fran?.kid !== undefined ? { kid: l.fran.kid } : {}) };
  if (l.bok) {
    (l.bok.delar ??= []).push(k); count(s, 'bokdel');
    if (l.bok.delar.length === 1) { const rad = `${p.name} skrev den första delen i en bok: ${tx.titel.toLowerCase()}.`, at = tingXY(s, l.bok); log(s, rad, 'skill', [p.id]); notis(s, 'skrift', rad, [p.id], at ? { x: Math.floor(at.x), y: Math.floor(at.y) } : undefined); kronika(s, rad, 'skrift'); } // steg 10.6.8
  }
  else {
    takeMaterial(s, p, 'pergament', 1, true, {}); const t = newTing(s, 'blad', 1, p.id); t.skrift = k; t.av = p.id; t.gjord = s.now;
    if (l.fran) { const o = tingOf(s).find(x => x.skrift && x.skrift.kid === undefined && x.id === l.fran!.kid); if (o) o.skrift!.kid = o.id; count(s, 'kartKopia'); } // originalet får sitt nummer när det skrivs av första gången
  }
  count(s, 'skrivet'); count(s, 'skrivet_' + l.slag);
  think(p, `Skrev ${tx.titel.charAt(0).toLowerCase() + tx.titel.slice(1)}`, 0.02, s.now, 6 * HOUR);
  if (forstaGang(s, 'skrivet')) log(s, `${p.name} skrev byns första blad: ${tx.titel.toLowerCase()}.`, 'skill', [p.id]);
}
// när bladet är läst: lärdomen med skrivaren som källa, intrycket i andra hand och glädjen av kvädet och berättelsen
export function lasKlar(s: State, q: Person, t: Task) {
  const b = tingOf(s).find(x => x.id === t.ref), k = b && basta(s, q, b)?.k, at = b && tingXY(s, b);
  if (!k || !at || skrivLjus(s, at.x, at.y) < SKRIFT.ljusMin) return;
  const nar = narAv(k);
  if (k.tek) { // handboken: tekniken lärs utan lärare, långsammare än av en mästare, och ur en dålig bara en del av vägen
    const tk = TEK[k.tek]!, d = SKRIFT.bokLar * (TEKTAL.larBas + stat(q, 'intelligens', s.now) / 20);
    q.tek ??= {}; q.tek[tk.id] = Math.max(q.tek[tk.id] ?? 0, Math.min(nar, (q.tek[tk.id] ?? 0) + d));
    if (q.tek[tk.id]! >= 1) { q.tek[tk.id] = 0; learn(s, q, tk, s.people.find(x => x.id === k.av.id)); log(s, `${q.name} lärde sig ${tk.namn.toLowerCase()} ur ${gen(k.av.namn)} bok.`, 'skill', [q.id]); count(s, 'bokLart'); }
  }
  if (k.tro !== undefined) think(q, 'Läste de heliga kvädena', SKRIFT.heligTanke, s.now, SKRIFT.heligTim * HOUR);
  if (k.lar) lasLardom(s, q, { ...k.lar, c: k.lar.c * nar }, k.av.id);
  for (const x of k.platser ? kartNya(s, q, k) : []) {
    for (const y of nyaMarken(q, x)) { const l = larUppdrag(s, q, y.a, SKRIFT.kartaC * nar, { t: y.t, v: y.v, mal: x.nr, k: y.k as UppdragId, src: k.av.id }); if (l.t < y.t) { l.t = y.t; l.v = y.v; } count(s, 'kartMarkeLast'); } // märkena (steg 11.8.14)
    if ((kannerOrt(s, q, x.nr) ?? -1) < x.v || k.slag === 'byn') { larOrt(s, q, x.nr, x.v, SKRIFT.kartaC * nar, { t: x.t, src: k.av.id, fr: k.av.id }); count(s, 'kartLast'); } // kartan (steg 11.7.1)
  }
  if (k.om) for (const x of k.bev ?? []) lasIntryck(s, q, k.om, x, k.av.id, SKRIFT.lasVikt * nar * (k.fel ?? 1));
  if (k.slag === 'minne' && k.om) paminn(s, q, k.om.id, k.bev);
  if (k.slag === 'poesi' || k.slag === 'berattelse') think(q, `Läste ${gen(k.av.namn)} ${k.slag === 'poesi' ? 'kväde' : 'berättelse'}`, (k.slag === 'poesi' ? SKRIFT.gladjePoesi : SKRIFT.gladjeBer) * nar, s.now, SKRIFT.gladjeTim * HOUR);
  count(s, 'last'); count(s, 'last_' + k.slag);
}
