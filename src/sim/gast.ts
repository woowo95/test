import { KLOCKA, SLAGHINDER } from './klocka';
// Gästerna är personer (steg 9.2.111, "Ekonomi och handel: Gästerna är personer" i designdokumentet): handlaren, rövarna,
// främlingarna och de andra som kommer till byn är människor av samma slag som byborna. En gäst ligger bland folket
// (s.people) med en gästrad (gast: sorten, klanen och hemmet) och ett negativt id, så att hen aldrig tar en bybos id och
// är samma part i ett byte som förut (byte.ts). Det som bara gäller byn (invånare, befolkning, seder, styre, omröstningar,
// arbetsordning, förråd) räknar bara byborna: alive() och living() i folk.ts släpper inte in gäster. Gästens egen kropp,
// egenskaper och färdigheter räknas ur byns frö och gästens nyckel med hash3, aldrig ur spelets slumpföljder, så att byn
// utvecklas likadant vare sig en gäst kommer eller inte. Ett nytt slag av gäst är en rad i GASTSORTER
import type { Person, State, Stat, Skill } from './typer';
import { STATS, SKILLS } from './typer';
import { hash3 } from './slump';
import { EGENSKAP, count } from './folk';
import { SAKER } from './saker';
import type { KlanPerson } from './klaner';
const klanById = (s: State, id: number | undefined) => id === undefined ? undefined : s.klaner?.find(k => k.id === id); // som i klaner.ts, utan att importera den (cirkeln gastliv–klaner)

export const GASTSORTER = {
  handlare: { namn: 'Handlare' },
  rovare: { namn: 'Rövare' },
  framling: { namn: 'Främling' },
} as const;
export type GastSort = keyof typeof GASTSORTER;
// mat är portionerna kvar i packningen och sover att gästen sover (steg 9.2.113, gastvardag.ts).
// drakt är det som bara syns (rövarnas luva, duk och mörka skinnrock, steg 10.1.8); vapnet och kläderna är ting hen bär (s.gastTing).
// bar, spar, pk och anhorig gäller rövarna (steg 9.2.112, rovare.ts): bytet hen bär, vägen för bilden
// (tid och plats efter varandra), rutorna kvar på vägen och rutan hen hittat vägen till och vems anhörig hen är när flocken hämnas
export interface GastRad { fil?: number; /* rövarens fil bredvid de andra i gänget (steg 10.2.25) */ sort: GastSort; ut?: { x: number; y: number }; /* där rövaren lämnar kartan: vald en gång när hen ger sig av */ ledare?: 1; /* leder rövargänget och går först i striden (steg 9.2.79) */ klan?: number; hem?: string; drakt?: { bonad?: 'luva' | 'duk'; rovarskinn?: true }; gor?: string; gorTill?: number; vx?: number; vy?: number; taTid?: number; nojd?: boolean; flytt?: boolean; varStrid?: boolean; /* rövarens val (steg 10.1.9, rovare.ts): det hen gör, till när, dit hen går på rastplatsen, tiden vid förrådet, om hen flyr och om hen varit i striden */ bar?: Record<string, number>; spar?: number[]; path?: number[]; pk?: number; anhorig?: string; mat?: number; sover?: 1; blir?: number; fas?: 'kommer' | 'pratar' | 'gar'; till?: number; tek?: string; ja?: boolean } // blir, fas, till, tek, ja: främlingen (steg 9.2.115, framling i liv.ts)

// ---------- gästernas utrustning (steg 10.1.8, "Striden på kartan: Gästernas utrustning" i designdokumentet) ----------
// Varje sort gäst har en rad som säger hur ofta hen har varje vapen, plagg och ärr (vikter: det som står med högre tal är
// vanligare, och null är "inget"). Rövare har oftare vapen, ärr och rövarkläder. Vapnen och kläderna är saker personen bär:
// ting av samma slag som byns (agande.ts), i en egen lista (s.gastTing) så att byns räkningar inte ser dem. De syns i det hen
// bär, på figuren och i porträttet, och de gäller i striden (personKampe i strid.ts frågar vad personen bär). dräkten är det
// som bara finns som utseende (rövarnas luva, duk och mörka skinnrock), med chansen för var och en
type Val = [string | null, number][];
export interface GastUtrustning { vapen: Val; reserv: Val; plagg: Record<string, Val>; arr: number; drakt?: { luva: number; duk: number; rovarskinn: number } }
export const GASTUTRUSTNING: Record<GastSort, GastUtrustning> = {
  rovare: {
    vapen: [['yxa', 3], ['flintspjut', 3], ['fiskespjut', 2], ['kniv', 3], ['bage', 0.4], [null, 1]], reserv: [['kniv', 1], [null, 2]],
    plagg: { rock: [['rock_vargskinn', 2], ['rock_kaninskinn', 3], ['rock_bjornskinn', 0.5], [null, 2.5]], byxor: [['byxor_kaninskinn', 2], ['byxor_lader', 1], [null, 2]], skor: [['skor_kaninskinn', 3], ['skor_vargskinn', 1], [null, 2]],
      mossa: [['mossa_kaninskinn', 1], [null, 4]], balte: [['balte_rep', 1], [null, 1]], skydd: [['rustning_lader', 0.4], ['hjalm_lader', 0.4], [null, 6]], fackla: [['fackla', 3], [null, 2]] }, // facklan bärs löst och tänds på natten (steg 10.1.10)
    arr: 0.45, drakt: { luva: 0.35, duk: 0.3, rovarskinn: 0.45 },
  },
  handlare: {
    vapen: [['kniv', 2], [null, 3]], reserv: [[null, 1]],
    plagg: { rock: [['rock_kaninskinn', 3], ['rock_vargskinn', 1], ['kappa_ylle', 1], [null, 1]], byxor: [['byxor_kaninskinn', 2], ['byxor_lader', 2], [null, 1]], skor: [['skor_kaninskinn', 4], [null, 1]], mossa: [['mossa_kaninskinn', 1], [null, 3]], balte: [['balte_rep', 3], [null, 1]] },
    arr: 0.08,
  },
  framling: {
    vapen: [['kniv', 1], ['fiskespjut', 0.5], [null, 4]], reserv: [[null, 1]],
    plagg: { rock: [['rock_kaninskinn', 2], [null, 2]], byxor: [['byxor_kaninskinn', 1], [null, 2]], skor: [['skor_kaninskinn', 2], [null, 2]], balte: [['balte_rep', 1], [null, 2]] },
    arr: 0.12,
  },
};
const ARRDELAR = ['huvud', 'huvud', 'armV', 'armH', 'bal', 'benV', 'benH'] as const; // där ärren sitter (ansiktet oftast: det är dem man ser)
const valj = (v: Val, u: number) => { const sum = v.reduce((a, x) => a + x[1], 0); let x = u * sum; for (const [k, w] of v) { x -= w; if (x < 0) return k; } return v[v.length - 1][0]; };
// det gästen bär
export const gastTingOf = (s: State, p: Person) => (s.gastTing ?? []).filter(t => t.agare === p.id);
// gästen får sin utrustning när hen skapas: räknad ur byns frö och gästens nyckel (r), aldrig ur spelets slumpföljder
function utrusta(s: State, p: Person, r: () => number) {
  const u = GASTUTRUSTNING[p.gast!.sort], lista = (s.gastTing ??= []);
  const ny = (k: string, falt: 'hos' | 'bar' | undefined) => { lista.push({ id: -(s.gastTingNr = (s.gastTingNr ?? 0) + 1), k, c: 0.5 + r() * 0.5, agare: p.id, ...(falt ? { [falt]: p.id } : {}) }); };
  const vapen = valj(u.vapen, r()); if (vapen) ny(vapen, 'hos');
  const reserv = valj(u.reserv, r()); if (reserv && reserv !== vapen) ny(reserv, undefined);
  for (const v of Object.values(u.plagg)) { const k = valj(v, r()); if (k) ny(k, SAKER[k]?.klad ? 'bar' : undefined); } // plaggen på sig, det andra (facklan) löst
  for (let i = 0; i < 2; i++) if (r() < u.arr) (p.arr ??= []).push({ d: ARRDELAR[Math.floor(r() * ARRDELAR.length)], n: Math.floor(r() * 10) + 1 });
  if (u.drakt) { const b = r(); p.gast!.drakt = { ...(b < u.drakt.luva ? { bonad: 'luva' as const } : b < u.drakt.luva + u.drakt.duk ? { bonad: 'duk' as const } : {}), ...(r() < u.drakt.rovarskinn ? { rovarskinn: true as const } : {}) }; }
}
// vapnet gästen har i handen (slaget), om något
export const gastVapen = (s: State, p: Person) => (s.gastTing ?? []).find(t => t.hos === p.id)?.k;
// gästen får vapnet k i handen i stället för det hen hade (en sparad by från före steg 10.1.8, och scenarierna)
export function gastVapenSatt(s: State, p: Person, k: string | undefined) {
  s.gastTing = (s.gastTing ?? []).filter(t => t.hos !== p.id);
  if (k && k !== 'hand') s.gastTing.push({ id: -(s.gastTingNr = (s.gastTingNr ?? 0) + 1), k, c: 1, agare: p.id, hos: p.id });
}
// det gästen bär lämnar kartan med hen. Den som dött tappar det hen höll i och bar löst: det ligger kvar på rutan som byns ting,
// så att det går att ta; kläderna följer kroppen
export function gastTingBort(s: State, p: Person, dod: boolean) {
  if (!s.gastTing?.length) return;
  if (dod) for (const t of s.gastTing) if (t.agare === p.id && t.bar === undefined) (s.ting ??= []).push({ id: s.nextTing = (s.nextTing ?? 0) + 1, k: t.k, c: t.c, agare: 0, x: Math.floor(p.x), y: Math.floor(p.y) });
  s.gastTing = s.gastTing.filter(t => t.agare !== p.id);
  if (!s.gastTing.length) delete s.gastTing;
}

// lever gästen och är kvar på kartan
export const gastLever = (p: Person) => !!p.gast && p.died === undefined && p.left === undefined;
export const gasterNu = (s: State, sort?: GastSort) => s.people.filter(p => gastLever(p) && (!sort || p.gast!.sort === sort));
export const gastAv = (s: State, id: number) => s.people.find(p => p.id === id && p.gast);
// handlaren som person: namnet, hemmet, klanen, platsen och färdigheten Handel står där
export function hp(s: State, h: { id: number }): Person {
  const p = gastAv(s, h.id);
  if (!p) throw new Error(`gästen ${h.id} finns inte bland folket`);
  return p;
}

// ett nytt id för en gäst som inte är handlaren (handlarens id är −handlarNr): långt under alla andra, och aldrig samma två gånger
export const nyttGastId = (s: State) => -1e9 - (s.gastNr = (s.gastNr ?? 0) + 1);
// en gäst skapas som en bybo, men ur hash3 (se ovan): samma frö och nyckel ger samma person
export function nyGast(s: State, o: { id: number; namn: string; sex: 'm' | 'k'; fodd: number; rad: GastRad; x: number; y: number; nyckel: number; skill?: Partial<Record<Skill, number>>; pot?: Partial<Record<Stat, number>> }): Person {
  let i = 0;
  const r = () => hash3(s.seed, o.nyckel, i++, 0x51ed270b);
  const pot = {} as Record<Stat, number>;
  for (const k of STATS) { const u = r() * 2 - 1; pot[k] = Math.max(1, Math.min(20, Math.round((EGENSKAP.mitt + Math.sign(u) * Math.abs(u) ** EGENSKAP.utprag * EGENSKAP.vidd) * 10) / 10)); }
  Object.assign(pot, o.pot); // egenskaper som sorten bestämmer (rövarnas styrka och mod, rovare.ts)
  const skill = {} as Record<Skill, number>;
  for (const k of SKILLS) skill[k] = o.skill?.[k] ?? 0;
  const p: Person = {
    id: o.id, name: o.namn, sex: o.sex, born: o.fodd, gast: o.rad,
    pot, skill, hunger: 0.8, rest: 0.9, social: 0.7, health: 1, warm: 1, toa: 0.8, torst: 1, blod: 1, habit: {}, thoughts: [],
    x: o.x, y: o.y, fame: [], hue: Math.floor(r() * 360),
  };
  if (o.rad.klan !== undefined) p.fran = o.rad.klan;
  utrusta(s, p, r); // vapnen, kläderna och ärren (GASTUTRUSTNING, steg 10.1.8)
  return p;
}
// gästen lämnar kartan: hen tas ur folket. hem = hen går hem levande, och klanen sparar hen (gastHem)
export function gastGar(s: State, id: number, hem?: boolean) {
  const g = gastAv(s, id);
  if (g) gastTingBort(s, g, g.died !== undefined); // det hen bär följer med, eller ligger kvar där hen dog (steg 10.1.8)
  if (hem) { const p = gastAv(s, id); if (p) gastHem(s, p); }
  s.people = s.people.filter(p => !(p.id === id && p.gast));
}

// Borta och tillbaka (steg 9.2.114, "Ekonomi och handel: Gästerna är personer" i designdokumentet): en gäst som går hem sparas
// hos sin klan som hela personen (kroppen, minnena, det hen kan och tänker), utom det som hör till besöket (id, platsen,
// handlingen och gästraden). Hemma åldras hen (födelsen står kvar) och lever förenklat: skadorna läker, sjukdomen går över
// och behoven är fyllda när hen kommer igen, och tankar som hunnit blekna är borta. Samma person kommer tillbaka (gastTillbaka)
const BESOKET = ['id', 'x', 'y', 'task', 'gast', 'died', 'cause', 'left'] as const;
export function gastHem(s: State, p: Person) {
  const k = klanById(s, p.gast?.klan);
  if (!k || p.died !== undefined) return;
  let kp = k.personer.find(q => q.namn === p.name && q.sex === p.sex);
  if (!kp) { if (p.gast!.sort === 'handlare') return; kp = { namn: p.name, sex: p.sex, roll: p.gast!.sort }; k.personer.push(kp); } // en rövare som flydde hem, en främling som visades bort
  const kropp = JSON.parse(JSON.stringify(p)) as Record<string, unknown>;
  for (const f of BESOKET) delete kropp[f];
  kp.kropp = kropp as KlanPerson['kropp']; kp.borta = s.now; kp.fodd ??= p.born;
  count(s, 'gast hem');
}
// gästen kommer igen (handel.ts, rovare.ts): den nya gästen blir den sparade personen, med besökets id, plats och gästrad
export function gastTillbaka(s: State, p: Person) {
  const kp = klanById(s, p.gast?.klan)?.personer.find(q => q.namn === p.name && q.sex === p.sex);
  if (!kp?.kropp) return false;
  const { id, x, y, gast, fran } = p;
  Object.assign(p, JSON.parse(JSON.stringify(kp.kropp)), { id, x, y, gast });
  if (fran !== undefined) p.fran = fran;
  // livet hemma, förenklat
  Object.assign(p, { health: 1, blod: 1, hunger: Math.max(p.hunger, 0.8), rest: 0.9, warm: 1, torst: 1, toa: 0.8 });
  for (const f of ['blot', 'sjuk', 'skador', 'svimmat', 'brinner', 'sickUntil', 'sickWhy', 'poisonUntil', 'sorg'] as const) delete p[f];
  p.thoughts = p.thoughts.filter(t => t.until > s.now);
  delete kp.kropp; delete kp.borta;
  count(s, 'gast igen');
  return true;
}
// slaget hålls kort medan en gäst är i byn (klocka.ts, steg 10.2.14)
SLAGHINDER.push(s => gasterNu(s).length ? KLOCKA.slag : undefined);
