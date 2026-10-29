// Striden (fas 3, system 3.7). Grunden byggdes med testarenan (steg 3.7.5): en strid är två sidor av kämpar (Kampe) på en
// liten plats, med en avsikt (AVSIKTER) som avgör när den slutar. Den räknas i fasta tidssteg om STRID.tick sekunder
// (stridSteg), så att den blir likadan i levande läge och i snabbläget. Var och en väljer mål, går fram och slår när målet
// är inom räckhåll; ett slag träffar eller missar, och en träff hamnar på en kroppsdel (KROPPSDELAR i halsa.ts) och blir en
// skada (SKADOR i halsa.ts) efter vapnets slag (VAPEN: hugg, stick, slag eller bett), minus det kläderna tar (SKYDD).
// Smärtan och blodet fäller den skadade, och stridsmodet sjunker av skador tills man ger upp eller flyr. Allt som händer
// står i stridens egen logg (Strid.logg, raderna i STRIDHANDELSER), som sparas med striden och inte i händelseloggen, och
// stridRapport sammanfattar den. Slumpen är stridens egen följd (Strid.r): striden är en ren funktion av uppställningen och
// fröet, så att arenan kan köra om samma strid. När striden kommer in i byn (steg 3.7.2) tas fröet ur byns följd 'strid'.
// Smidigheten (steg 3.7.6) gör en kämpe snabbare och svårare att träffa, och blodtörsten (aggressionen, låg empati och dåligt
// humör, humor.ts) gör att man ger sig senare. Det som kommer i senare steg: duck, parering och rörelse (3.7.2), avstånd och
// reservvapen (3.7.7), knuff, fall och tappade vapen (3.7.8), mod och att ge upp efter hotet (3.7.9).
import { balans } from './balans';
import { HALSA, KROPPSDELAR, Kroppsdel, SKADOR, SkadaTyp } from './halsa';
import { DJUR } from './redskap';
import { SAKER, sakNamn } from './saker';
import { clamp } from './slump';
import { stat } from './folk';
import { blodtorst } from './humor';
import { paSig } from './utrustning';
import { ownedBy } from './agande';
import type { Person, State } from './typer';

// ---------- balanstal (regel 8) ----------
export const STRID = balans('strid', {
  tick: 0.2, // sekunder i spelet per tidssteg i striden (samma i båda lägena)
  maxTid: 240, // en strid slutar senast efter så här många sekunder (oavgjort)
  fart: 1.6, // rutor i sekunden för en frisk vuxen som springer i strid (gånger djurets fart)
  traffBas: 0.6, // chansen att träffa någon som är lika skicklig
  traffPer: 0.03, // ... och så här mycket mer per poäng skicklighet över motståndarens
  smidUndan: 0.015, // ... och så här mycket mindre per poäng smidighet hos motståndaren över 10 (steg 3.7.6)
  smidFart: 0.02, // farten gånger 1 + smidFart × (smidigheten − 10)
  torst: 0.3, // stridsmodet i början plus så här mycket gånger blodtörsten (0–1)
  traffMin: 0.1, traffMax: 0.95, // chansen att träffa är aldrig lägre eller högre än så här
  trott: 0.4, // den som är helt utmattad träffar så här mycket sämre
  styrka: 0.05, // skadan gånger 1 + (styrka − 10) × detta
  slump: 0.6, // skadan gånger ett tal mellan 1 − slump/2 och 1 + slump/2
  ingen: 0.03, // en träff som blir mindre än så här efter kläderna gör ingen skada
  orkSlag: 0.05, // ett slag tar så mycket ork (0–1), mindre för den uthållige ...
  orkVila: 0.04, // ... och orken kommer tillbaka så här mycket i sekunden mellan slagen
  blodSlag: 0.25, // ett öppet sår tar så här mycket blod direkt (gånger skadans blod och grad) ...
  blodSek: 0.002, // ... och sedan så här mycket i sekunden medan det blöder
  nere: 0.9, // den som har så här ont faller och kan inte slåss längre
  modStart: 0.4, // stridsmodet när striden börjar: modStart + mod / 20 × modMod
  modMod: 0.6,
  modSkada: 1.1, // stridsmodet sjunker så här mycket gånger graden av en skada ...
  modVan: 0.2, // ... och så här mycket när en vän faller
  lek: 0.2, // i lek slutar striden vid första skada av den här graden
  utsatt: 1.5, // chansen att träffa den som ligger eller flyr, gånger detta
  takt: 0.3, // tiden mellan slagen gånger 1 − (uthållighet − 10) / 20 × detta
});

// ---------- vapnen (registret) ----------
// skada = grad av en full träff från en normalstark vuxen, takt = sekunder mellan slagen, rack = räckvidd i rutor,
// slag = vad det gör med kroppen (SLAGEN), ord = verbet i loggen. Ett vapen är en sak i saker.ts (samma id), utom
// händerna och djurens bett
interface VapenDef { namn: string; skada: number; takt: number; rack: number; slag: Slag; ord: string; tecken: string }
export const VAPEN = {
  hand: { namn: 'Knytnävarna', skada: 0.14, takt: 0.9, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '👊' },
  kniv: { namn: 'Flintkniven', skada: 0.32, takt: 0.9, rack: 0.9, slag: 'hugg', ord: 'skär', tecken: '🔪' },
  yxa: { namn: 'Flintyxan', skada: 0.5, takt: 1.5, rack: 1.1, slag: 'hugg', ord: 'hugger', tecken: '🪓' },
  fiskespjut: { namn: 'Träspjutet', skada: 0.32, takt: 1.3, rack: 1.8, slag: 'stick', ord: 'sticker', tecken: '🔱' },
  flintspjut: { namn: 'Flintspjutet', skada: 0.45, takt: 1.3, rack: 1.8, slag: 'stick', ord: 'sticker', tecken: '🔱' },
  benspade: { namn: 'Benspaden', skada: 0.28, takt: 1.4, rack: 1.3, slag: 'slag', ord: 'slår', tecken: '🦴' },
  sten: { namn: 'Stenen', skada: 0.25, takt: 1.1, rack: 0.9, slag: 'slag', ord: 'slår', tecken: '🪨' },
  bett: { namn: 'Tänderna', skada: 0.1, takt: 0.8, rack: 0.7, slag: 'bett', ord: 'biter', tecken: '🦷' },
} satisfies Record<string, VapenDef>;
export type Vapen = keyof typeof VAPEN;
const VAP: Record<string, VapenDef> = VAPEN;
export const VAPEN_LIST = Object.keys(VAPEN) as Vapen[];
// vapnen en människa kan ha i arenan (händerna och sakerna som finns)
export const MANNISKOVAPEN = VAPEN_LIST.filter(v => v === 'hand' || SAKER[v]);

// ---------- slagen: vad ett vapen gör med kroppen ----------
// skada = skadan i SKADOR efter graden (den första vars gräns graden når, från slutet)
type Slag = 'hugg' | 'stick' | 'slag' | 'bett';
const SLAGEN: Record<Slag, { namn: string; skada: [number, SkadaTyp][] }> = {
  hugg: { namn: 'Hugg', skada: [[0, 'skarsar']] },
  stick: { namn: 'Stick', skada: [[0, 'skarsar']] }, // egen skada för djupa stick kommer med skadetyperna (steg 3.7.2)
  slag: { namn: 'Slag', skada: [[0, 'blamarke'], [0.3, 'krossar'], [0.65, 'benbrott']] },
  bett: { namn: 'Bett', skada: [[0, 'bett']] },
};
const skadaAv = (sl: Slag, g: number): SkadaTyp => { const r = SLAGEN[sl].skada; for (let i = r.length - 1; i > 0; i--) if (g >= r[i][0]) return r[i][1]; return r[0][1]; };

// ---------- var slagen träffar ----------
// hur ofta en träff hamnar på varje del (huvudet sällan)
const TRAFFDEL: Record<Kroppsdel, number> = { huvud: 0.07, bal: 0.33, armV: 0.11, armH: 0.11, handV: 0.05, handH: 0.05, benV: 0.1, benH: 0.1, fotV: 0.04, fotH: 0.04 };
const DELAR = Object.keys(TRAFFDEL) as Kroppsdel[];

// ---------- det kläderna tar (registret) ----------
// per klädesplagg i saker.ts: delarna det täcker och hur stor del av skadan det tar per slag. Rustningen kommer i 9.4.1
export const SKYDD: Record<string, { delar: Kroppsdel[]; tar: Partial<Record<Slag, number>> }> = {
  skinnrock: { delar: ['bal', 'armV', 'armH'], tar: { hugg: 0.25, stick: 0.15, slag: 0.2, bett: 0.3 } },
  skinnskor: { delar: ['fotV', 'fotH'], tar: { hugg: 0.2, stick: 0.2, slag: 0.1, bett: 0.3 } },
};
export const KLADER_STRID = Object.keys(SKYDD);

// ---------- avsikten (registret) ----------
// vapen = man slåss med vapen (annars med händerna), nere = man slår den som ligger, slut = vad som avslutar striden för
// den drabbade: 'skada' vid första skadan av graden STRID.lek, 'ge' att man ger upp när modet tar slut, 'fly' att man flyr
interface AvsiktDef { namn: string; text: string; vapen: boolean; nere: boolean; modSlut: 'ge' | 'fly'; lek?: true }
export const AVSIKTER = {
  lek: { namn: 'Lek', text: 'Man brottas och slår på skoj och slutar vid första riktiga smärta.', vapen: false, nere: false, modSlut: 'ge', lek: true },
  slagsmal: { namn: 'Slagsmål', text: 'Med händerna tills den ena ger upp eller ligger.', vapen: false, nere: false, modSlut: 'ge' },
  skada: { namn: 'Skada', text: 'Med vapen tills den andra ligger, flyr eller ger upp.', vapen: true, nere: false, modSlut: 'fly' },
  doda: { namn: 'Döda', text: 'Med vapen, och den som ligger slås ihjäl.', vapen: true, nere: true, modSlut: 'fly' },
} satisfies Record<string, AvsiktDef>;
export type Avsikt = keyof typeof AVSIKTER;
const AVS: Record<Avsikt, AvsiktDef> = AVSIKTER;

// ---------- händelserna i loggen (registret) ----------
// tecken = symbolen först i loggen (platshållare tills bildstilen har dem), ord = hur meningen börjar
export const STRIDHANDELSER = {
  borjar: { tecken: '⚔️', namn: 'Striden börjar' },
  traff: { tecken: '💥', namn: 'Träff' },
  tog: { tecken: '🛡️', namn: 'Kläderna tog slaget' },
  miss: { tecken: '💨', namn: 'Miss' },
  nere: { tecken: '⤵️', namn: 'Faller' },
  ger: { tecken: '🏳️', namn: 'Ger upp' },
  flykt: { tecken: '🏃', namn: 'Flyr' },
  borta: { tecken: '🚪', namn: 'Har flytt' },
  dod: { tecken: '💀', namn: 'Död' },
  slut: { tecken: '🏁', namn: 'Striden är slut' },
} as const;
export type Handelse = keyof typeof STRIDHANDELSER;

// ---------- en strid ----------
export interface KampeStats { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number; torst?: number } // torst = blodtörsten 0–1 (steg 3.7.6)
export type KampeLage = 'strid' | 'nere' | 'ger' | 'flykt' | 'borta' | 'dod';
export interface Kampe {
  id: number; namn: string; sida: 0 | 1; pid?: number; djur?: string; // pid = personen i byn, djur = arten i DJUR
  st: KampeStats; vapen: Vapen; klader: string[]; fart: number; // fart = gånger STRID.fart
  x: number; y: number; // rutor (med decimaler)
  skador: { d: Kroppsdel; k: SkadaTyp; g: number; ny: number }[]; // ny = öppet sår som blöder (1) eller levrat (0)
  blod: number; ork: number; modNu: number; lage: KampeLage;
  vant: number; mal?: number; // sekunder till nästa slag, och målet
  slag: number; traffar: number; gjort: number; // för rapporten: slag, träffar och summan av skadornas grad
}
// en rad i loggen: tiden (sekunder), vem (a) och mot vem (b), del, skada och grad, och det kläderna tog
export interface StridRad { t: number; h: Handelse; a?: number; b?: number; d?: Kroppsdel; k?: SkadaTyp; g?: number; v?: Vapen; kl?: string }
export interface Strid {
  avsikt: Avsikt; t: number; w: number; h: number; r: number; fro: number;
  kampar: Kampe[]; logg: StridRad[];
  slut?: { t: number; vinnare: 0 | 1 | -1 };
}
// uppställningen som en strid börjar ur (arenan och, senare, byn)
export interface Uppstallning { avsikt: Avsikt; w: number; h: number; kampar: Omit<Kampe, 'skador' | 'blod' | 'ork' | 'modNu' | 'lage' | 'vant' | 'mal' | 'slag' | 'traffar' | 'gjort'>[] }

// stridens egen slumpföljd (samma blandning som rnd i slump.ts)
function slump(st: Strid) {
  let t = (st.r = (st.r + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nyStrid(u: Uppstallning, fro: number): Strid {
  const kampar: Kampe[] = u.kampar.map(k => ({
    ...k, st: { ...k.st }, klader: [...k.klader], skador: [], blod: 1, ork: 1,
    modNu: clamp(STRID.modStart + (k.st.mod / 20) * STRID.modMod + (k.st.torst ?? 0) * STRID.torst, 0.05, 1), lage: 'strid', vant: 0, slag: 0, traffar: 0, gjort: 0,
  }));
  const st: Strid = { avsikt: u.avsikt, t: 0, w: u.w, h: u.h, r: fro | 0, fro, kampar, logg: [{ t: 0, h: 'borjar' }] };
  if (!AVS[u.avsikt].vapen) for (const k of kampar) if (!k.djur) k.vapen = 'hand';
  for (const k of kampar) k.vant = slump(st) * VAP[k.vapen].takt; // ingen slår exakt samtidigt
  return st;
}

// ---------- kroppen i striden ----------
const smartaAv = (k: Kampe) => k.skador.reduce((a, w) => a + SKADOR[w.k].smarta * w.g, 0);
const delFel = (k: Kampe, d: Kroppsdel) => Math.min(1, k.skador.reduce((a, w) => a + (w.d === d ? SKADOR[w.k].fel * w.g : 0), 0));
const smidFart = (k: Kampe) => 1 + STRID.smidFart * (k.st.smidighet - 10); // den smidiga är snabbare (steg 3.7.6)
function rorlighet(k: Kampe) {
  let v = 0;
  for (const d of DELAR) v += ((KROPPSDELAR[d] as { rorlighet?: number }).rorlighet ?? 0) * delFel(k, d);
  return Math.max(HALSA.minst, 1 - v);
}
// den som kan slåss: står kvar i striden
const iStrid = (k: Kampe) => k.lage === 'strid';
const dist = (a: Kampe, b: Kampe) => Math.hypot(a.x - b.x, a.y - b.y);

// målet: den närmaste fienden som går att slå (den som ligger eller flyr bara om avsikten är att döda)
function valjMal(st: Strid, k: Kampe) {
  const nere = AVS[st.avsikt].nere;
  let bast: Kampe | undefined, bd = Infinity;
  for (const m of st.kampar) {
    if (m.sida === k.sida || !(iStrid(m) || (nere && (m.lage === 'nere' || m.lage === 'flykt')))) continue;
    const d = dist(k, m) + (m.lage === 'nere' ? 2 : 0); // den som står är farligare än den som ligger
    if (d < bd) { bd = d; bast = m; }
  }
  return bast;
}

function ga(st: Strid, k: Kampe, mx: number, my: number, langd: number) {
  const dx = mx - k.x, dy = my - k.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const f = Math.min(1, langd / d);
  k.x = clamp(k.x + dx * f, 0.3, st.w - 0.3); k.y = clamp(k.y + dy * f, 0.3, st.h - 0.3);
}

function falla(st: Strid, k: Kampe, h: 'nere' | 'dod' | 'ger' | 'flykt') {
  k.lage = h; k.mal = undefined;
  st.logg.push({ t: st.t, h, a: k.id });
  if (h === 'nere' || h === 'dod') for (const v of st.kampar) if (v.sida === k.sida && v !== k && iStrid(v)) v.modNu -= STRID.modVan;
}

function slaEtt(st: Strid, a: Kampe, b: Kampe) {
  const v = VAP[a.vapen];
  a.slag++;
  a.ork = Math.max(0, a.ork - STRID.orkSlag * (1 - (a.st.uthallighet - 10) / 40));
  const chans = clamp((STRID.traffBas + (a.st.skicklighet - b.st.skicklighet) * STRID.traffPer - (b.st.smidighet - 10) * STRID.smidUndan) * (1 - STRID.trott * (1 - a.ork)), STRID.traffMin, STRID.traffMax) * (b.lage === 'nere' || b.lage === 'flykt' ? STRID.utsatt : 1); // den som ligger eller vänt ryggen är lätt att träffa
  if (slump(st) >= chans) { st.logg.push({ t: st.t, h: 'miss', a: a.id, b: b.id, v: a.vapen }); return; }
  let x = slump(st);
  let d: Kroppsdel = 'bal';
  for (const del of DELAR) { x -= TRAFFDEL[del]; if (x <= 0) { d = del; break; } }
  let g = v.skada * (1 + (a.st.styrka - 10) * STRID.styrka) * (1 - STRID.slump / 2 + slump(st) * STRID.slump);
  let kl: string | undefined;
  for (const c of b.klader) { const sk = SKYDD[c]; if (sk?.delar.includes(d)) { g *= 1 - (sk.tar[v.slag] ?? 0); kl = c; } }
  g = Math.min(1, g);
  a.traffar++;
  if (g < STRID.ingen) { st.logg.push({ t: st.t, h: 'tog', a: a.id, b: b.id, d, v: a.vapen, kl }); return; }
  const k = skadaAv(v.slag, g);
  b.skador.push({ d, k, g, ny: SKADOR[k].blod > 0 ? 1 : 0 });
  b.blod -= SKADOR[k].blod * g * STRID.blodSlag;
  b.modNu -= STRID.modSkada * g;
  a.gjort += g;
  st.logg.push({ t: st.t, h: 'traff', a: a.id, b: b.id, d, k, g, v: a.vapen, kl });
  if (((KROPPSDELAR[d] as { livsviktig?: true }).livsviktig && g >= HALSA.dodGrad) || b.blod < HALSA.blodDod) return falla(st, b, 'dod');
  if (AVS[st.avsikt].lek && g >= STRID.lek) return falla(st, b, 'ger');
  if (b.lage === 'nere') return; // den som redan ligger
  if (smartaAv(b) >= STRID.nere) return falla(st, b, 'nere');
}

// ett tidssteg (STRID.tick sekunder)
export function stridSteg(st: Strid) {
  if (st.slut) return;
  const dt = STRID.tick, avs = AVS[st.avsikt];
  st.t += dt;
  for (const k of st.kampar) {
    if (k.lage === 'borta' || k.lage === 'dod') continue;
    // blodet rinner ur öppna sår, också hos den som ligger
    for (const w of k.skador) if (w.ny) k.blod -= SKADOR[w.k].blod * w.g * STRID.blodSek * dt;
    if (k.blod < HALSA.blodDod) { falla(st, k, 'dod'); continue; }
    if (k.lage === 'flykt') { // springer mot närmaste kanten och är borta när hen når den
      const ut = [k.x, st.w - k.x, k.y, st.h - k.y], i = ut.indexOf(Math.min(...ut));
      const lang = STRID.fart * k.fart * smidFart(k) * rorlighet(k) * dt;
      ga(st, k, i === 0 ? 0 : i === 1 ? st.w : k.x, i === 2 ? 0 : i === 3 ? st.h : k.y, lang);
      if (Math.min(k.x, st.w - k.x, k.y, st.h - k.y) <= 0.31) { k.lage = 'borta'; st.logg.push({ t: st.t, h: 'borta', a: k.id }); }
      continue;
    }
    if (!iStrid(k)) continue;
    if (k.modNu <= 0) { falla(st, k, avs.modSlut === 'fly' ? 'flykt' : 'ger'); continue; }
    k.ork = Math.min(1, k.ork + STRID.orkVila * dt);
    k.vant -= dt;
    const m = valjMal(st, k);
    k.mal = m?.id;
    if (!m) continue;
    const v = VAP[k.vapen], d = dist(k, m);
    if (d > v.rack) ga(st, k, m.x, m.y, Math.min(d - v.rack * 0.9, STRID.fart * k.fart * smidFart(k) * rorlighet(k) * dt));
    if (dist(k, m) <= v.rack && k.vant <= 0) { // den som just kom fram slår samma ögonblick
      slaEtt(st, k, m);
      k.vant = v.takt * (1 - ((k.st.uthallighet - 10) / 20) * STRID.takt) * (0.85 + slump(st) * 0.3);
    }
  }
  // striden pågår så länge båda sidor har någon som står, tills de som flyr har kommit undan och, om avsikten är att
  // döda, tills de som ligger är döda
  const kvar = [0, 1].map(sd => st.kampar.some(k => k.sida === sd && iStrid(k)));
  const ofardig = st.kampar.some(k => k.lage === 'flykt' || (avs.nere && k.lage === 'nere' && kvar[1 - k.sida]));
  if ((!kvar[0] || !kvar[1]) && !ofardig || st.t >= STRID.maxTid) {
    const vinnare = kvar[0] && !kvar[1] ? 0 : kvar[1] && !kvar[0] ? 1 : -1;
    st.slut = { t: st.t, vinnare };
    st.logg.push({ t: st.t, h: 'slut' });
  }
}
// hela striden till slutet
export function stridTillSlut(st: Strid) { while (!st.slut) stridSteg(st); return st; }

// ---------- texten ----------
const GRAD = (g: number) => g >= 0.75 ? 'mycket svårt' : g >= 0.45 ? 'svårt' : g >= 0.2 ? 'måttligt' : 'lätt';
export const gradOrd = GRAD;
export const delNamn = (d: Kroppsdel) => KROPPSDELAR[d].i;
const namnOf = (st: Strid, id?: number) => st.kampar.find(k => k.id === id)?.namn ?? '?';
// hela meningen för en rad i loggen (syns när man trycker på raden eller håller musen över den)
export function stridText(st: Strid, r: StridRad): string {
  const a = namnOf(st, r.a), b = namnOf(st, r.b), v = r.v ? VAP[r.v] : undefined;
  const med = v && r.v !== 'hand' && r.v !== 'bett' ? ` med ${v.namn.toLowerCase()}` : '';
  switch (r.h) {
    case 'borjar': return `Striden börjar: ${AVS[st.avsikt].namn.toLowerCase()}. ${AVS[st.avsikt].text}`;
    case 'miss': return `${a} ${v?.ord ?? 'slår'} efter ${b}${med} men missar.`;
    case 'tog': return `${a} ${v?.ord ?? 'slår'} ${b} i ${delNamn(r.d!)}${med}, men ${sakNamn(r.kl ?? '').toLowerCase()} tar slaget.`;
    case 'traff': return `${a} ${v?.ord ?? 'slår'} ${b} i ${delNamn(r.d!)}${med}: ${SKADOR[r.k!].ett}, ${GRAD(r.g!)}${r.kl ? ` (${sakNamn(r.kl).toLowerCase()} tog en del)` : ''}.`;
    case 'nere': return `${a} faller och kan inte slåss längre.`;
    case 'ger': return `${a} ger upp.`;
    case 'flykt': return `${a} vänder och flyr.`;
    case 'borta': return `${a} har flytt från platsen.`;
    case 'dod': return `${a} dör.`;
    case 'slut': return st.slut?.vinnare === -1 ? 'Striden är slut utan att någon sida vann.' : `Striden är slut. ${sidaNamn(st, st.slut!.vinnare as 0 | 1)} vann.`;
  }
}
export const sidaNamn = (st: Strid, sd: 0 | 1) => { const n = st.kampar.filter(k => k.sida === sd).map(k => k.namn); return n.length <= 2 ? n.join(' och ') : `${n[0]} med ${n.length - 1} till`; };

// ---------- rapporten efter striden ----------
export const LAGE_ORD: Record<KampeLage, string> = { strid: 'står kvar', nere: 'ligger skadad', ger: 'gav upp', flykt: 'flydde', borta: 'flydde', dod: 'dog' };
export interface StridRapport {
  vinnare: 0 | 1 | -1; tid: number;
  sidor: { sida: 0 | 1; namn: string; folk: { id: number; namn: string; lage: KampeLage; skador: string[]; slag: number; traffar: number }[] }[];
  mest?: { id: number; namn: string; varfor: string };
}
export function stridRapport(st: Strid): StridRapport {
  const sidor = ([0, 1] as const).map(sd => ({
    sida: sd, namn: sidaNamn(st, sd),
    folk: st.kampar.filter(k => k.sida === sd).map(k => ({
      id: k.id, namn: k.namn, lage: k.lage, slag: k.slag, traffar: k.traffar,
      skador: k.skador.map(w => `${SKADOR[w.k].namn} i ${delNamn(w.d)}, ${GRAD(w.g)}`),
    })),
  }));
  let mest: Kampe | undefined;
  for (const k of st.kampar) if (k.gjort > 0 && (!mest || k.gjort > mest.gjort)) mest = k;
  return {
    vinnare: st.slut?.vinnare ?? -1, tid: st.slut?.t ?? st.t, sidor,
    mest: mest && { id: mest.id, namn: mest.namn, varfor: `${mest.traffar} träffar av ${mest.slag} slag` },
  };
}

// ---------- samma strid många gånger (arenan) ----------
export interface ManyResultat { n: number; vann: [number, number]; oavgjort: number; tid: number; slut: Record<KampeLage, number>; per: { id: number; namn: string; vann: number; dog: number; nere: number; traffar: number }[] }
export function korManga(u: Uppstallning, fro: number, n: number): ManyResultat {
  const res: ManyResultat = { n, vann: [0, 0], oavgjort: 0, tid: 0, slut: { strid: 0, nere: 0, ger: 0, flykt: 0, borta: 0, dod: 0 }, per: u.kampar.map(k => ({ id: k.id, namn: k.namn, vann: 0, dog: 0, nere: 0, traffar: 0 })) };
  for (let i = 0; i < n; i++) {
    const st = stridTillSlut(nyStrid(u, (fro + Math.imul(i + 1, 0x9e3779b9)) | 0));
    const w = st.slut!.vinnare;
    if (w === -1) res.oavgjort++; else res.vann[w]++;
    res.tid += st.slut!.t / n;
    st.kampar.forEach((k, j) => {
      if (k.lage !== 'strid') res.slut[k.lage]++;
      const p = res.per[j];
      if (k.sida === w) p.vann++;
      if (k.lage === 'dod') p.dog++;
      if (k.lage === 'nere') p.nere++;
      p.traffar += k.traffar / n;
    });
  }
  return res;
}

// ---------- kämpar ur byn och påhittade ----------
// en kämpe ur en person i byn: anlagen (åldern med), det bästa vapnet hen bär och kläderna. Skickligheten är jakten tills
// närstriden och träffsäkerheten blir egna färdigheter (steg 3.7.2); smidigheten och blodtörsten (steg 3.7.6)
export function personKampe(s: State, p: Person, id: number, sida: 0 | 1, x: number, y: number): Uppstallning['kampar'][number] {
  const bar = [...new Set([...paSig(s, p), ...ownedBy(s, p)].map(t => t.k))]; // det hen bär och äger (i arenan har man sina saker med sig)
  const vapen = MANNISKOVAPEN.filter(v => bar.includes(v)).sort((a, b) => VAP[b].skada - VAP[a].skada)[0] ?? 'hand';
  return {
    id, namn: p.name, sida, pid: p.id, vapen, klader: bar.filter(k => SKYDD[k]), fart: 1, x, y,
    st: { styrka: stat(p, 'styrka', s.now), uthallighet: stat(p, 'uthallighet', s.now), mod: stat(p, 'mod', s.now), smidighet: stat(p, 'smidighet', s.now), skicklighet: 5 + (p.skill.jakt ?? 0) / 2, torst: blodtorst(s, p) },
  };
}
// en kämpe ur ett djur i djurregistret (DJUR.strid)
export function djurKampe(art: string, id: number, sida: 0 | 1, x: number, y: number): Uppstallning['kampar'][number] {
  const d = (DJUR as Record<string, { strid?: DjurStrid }>)[art].strid!;
  return { id, namn: d.namn, sida, djur: art, st: { styrka: d.styrka, uthallighet: d.uthallighet, mod: d.mod, smidighet: d.smidighet, skicklighet: d.skicklighet }, vapen: d.vapen, klader: [], fart: d.fart, x, y };
}
// det en djurart har i strid (djurregistret i redskap.ts)
export interface DjurStrid { namn: string; styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number; fart: number; vapen: Vapen }
export const STRIDSDJUR = () => Object.keys(DJUR).filter(a => (DJUR as Record<string, { strid?: DjurStrid }>)[a].strid);
