// ---------- sällskapet och resan (steg 11.5.2–, Flera samhällen: Sällskapet, Packningen i tal, Farten i tal) ----------
// Ett sällskap är en post i världen (vl.sallskap): en ledare och medlemmar (byborna som reser, borta från byn under resan,
// ute.ts), djur och fordon, ett mål (en plats i världen) och ett skäl (en rad i registret RESMAL), ett skede (samlas, packar,
// ute, framme, hemåt, hemma), en plats på vägen, en gemensam packning i hela saker och en bok över insatserna. Talen för resan
// står i blocket RESA. Ingen person är med i två sällskap.
import { balans } from './balans';
import { LandmarkId } from './landmarken';
import { Person, State } from './typer';
import { Varlden, varldMark } from './varlden';
import { byPlats, varldPlatserPa } from './landmarken';
import { clamp } from './slump';
import { ryggsack } from './utrustning';
import { tamArt, tamdjurOf } from './tamdjur';
import { viktOf } from './saker';
import { grundvarde } from './varde';
import { VARLD, VARLDMARK, MARK_IDS, VarldMark } from './varldmark';
import { kostnader, vagMellan, vagRutor } from './vagval';

export const RESA = balans('resa', {
  samlaSek: 3600, // så länge (sekunder i verkligheten) ledaren får samla sällskapet innan resan ställs in (en timme, ett kvarts dygn i spelet)
  // packningen (steg 11.5.3)
  matPerDygn: 1.6, // portioner per resenär och dygn (en vuxens måltid är en portion)
  margModig: 1, margMitt: 1.25, margForsiktig: 1.5, // ledarens marginal: den modiga och slarviga, mitten och den försiktiga
  utanVatten: 0.5, // en sträcka utan vatten längre än så många dygn kräver en vattensäck per resenär
  foderPerDygn: 2, // hö per djur och dygn där det inte går att beta
  hander: 20, rygg: 20, // vikt en resenär bär i händerna och i en ryggsäck
  packPerStyrka: 20, // ett packdjurs last för varje steg av dess styrka
});

// skälen att resa: namnet, vilka sorters platser som är ett mål, och hur länge (dygn) sällskapet stannar framme
export interface ResmalDef { namn: string; mal: readonly LandmarkId[]; stannar: number }
export const RESMAL = {
  handel: { namn: 'Handel', mal: ['by', 'handelslager'], stannar: 1 },
  uppdrag: { namn: 'Uppdrag', mal: ['by', 'ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'utpost'], stannar: 1 },
  turne: { namn: 'Turné', mal: ['by'], stannar: 1 },
  slakt: { namn: 'Besök hos släkt', mal: ['by'], stannar: 2 },
  se: { namn: 'Se en plats', mal: ['ruin', 'helig', 'gravhog', 'runsten', 'fyndplats', 'karavanrest', 'rastplats', 'by', 'handelslager', 'utpost'], stannar: 0.25 },
  sandebud: { namn: 'Sändebud', mal: ['by'], stannar: 1 },
} as const satisfies Record<string, ResmalDef>;
export type ResmalId = keyof typeof RESMAL;
export const RESMAL_IDS = Object.keys(RESMAL) as ResmalId[];

export type Skede = 'samlas' | 'packar' | 'ute' | 'framme' | 'hemat' | 'hemma';
// en insats i boken: vem som äger den, saken (eller djuret) och hur många, i hela saker, och värdet när resan började
export interface Insats { agare: number | 'by'; sak: string; n: number; varde: number; djur?: number }
export interface Sallskap {
  id: number; by: number; // sällskapets nummer och raden det kommer från
  ledare: number; medl: number[]; djur: number[]; fordon: string[]; // personernas och djurens id (ledaren är en av medlemmarna)
  mal: number; skal: ResmalId; skede: Skede; // målets plats i världen, skälet och skedet
  borjan: number; t: number; // när ledaren började samla, och tiden sällskapet räknats till
  ruta?: number; vag?: { fran: number; till: number; steg: string }; pos?: number; // rutan sällskapet är på, vägen och hur långt längs den (rutor)
  pack: Record<string, number>; // den gemensamma packningen, hela saker
  insatser: Insats[];
  dagbok: [number, string][]; // resans dagbok (steg 11.5.13)
}

// ett nytt sällskap med ledaren som första medlem; det samlas tills det packar
export function nyttSallskap(s: State, ledare: Person, mal: number, skal: ResmalId): Sallskap | undefined {
  const vl = s.varld;
  if (!vl || vl.huvud === undefined || sallskapFor(vl, ledare.id)) return undefined;
  const sl: Sallskap = { id: vl.nastaSallskap = (vl.nastaSallskap ?? 0) + 1, by: vl.huvud, ledare: ledare.id, medl: [ledare.id], djur: [], fordon: [], mal, skal, skede: 'samlas', borjan: s.now, t: s.now, pack: {}, insatser: [], dagbok: [] };
  (vl.sallskap ??= []).push(sl);
  return sl;
}
// sällskapet en person är med i (inte de som kommit hem)
export const sallskapFor = (vl: Varlden | undefined, id: number) => vl?.sallskap?.find(x => x.skede !== 'hemma' && x.medl.includes(id));
// en till följer med medan sällskapet samlas
export function foljMed(vl: Varlden, sl: Sallskap, p: Person) {
  if (sl.skede !== 'samlas' || sallskapFor(vl, p.id)) return false;
  sl.medl.push(p.id);
  return true;
}
// ett djur följer med (ett packdjur, en häst)
export function djurMed(sl: Sallskap, djurId: number) { if (!sl.djur.includes(djurId)) sl.djur.push(djurId); }
// de sällskap som är på väg, framme eller packar (inte de som kommit hem)
export const sallskapNu = (vl: Varlden | undefined) => (vl?.sallskap ?? []).filter(x => x.skede !== 'hemma');

// ---------- packningen (steg 11.5.3, Packningen i tal) ----------
// ledarens marginal: 1,25 i mitten, mot 1,0 för den modiga och slarviga (högt mod, låg flit) och 1,5 för den försiktiga
export function marginal(p: Person) {
  const x = clamp(((p.pot.flit - 10) - (p.pot.mod - 10)) / 18, -1, 1);
  return x >= 0 ? RESA.margMitt + x * (RESA.margForsiktig - RESA.margMitt) : RESA.margMitt + x * (RESA.margMitt - RESA.margModig);
}
// finns det vatten på eller bredvid rutan (en flod, en sjö, en myr; havet är salt)
function vattenVid(v: VarldMark, i: number) {
  if (v.flod[i] || VARLDMARK[MARK_IDS[v.mark[i]]].vatten) return true;
  const x = i % v.w, y = Math.floor(i / v.w);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < v.w && ny < v.h && MARK_IDS[v.mark[ny * v.w + nx]] === 'sjo') return true;
  }
  return false;
}
// vägen dit räknad i dygn: hela sträckan, den längsta sträckan utan vatten och dygnen där djuren inte kan beta (i en frisk
// vuxens gångfart; farten kommer i steg 11.5.7)
export interface VagDygn { rutor: number[]; dygn: number; torr: number; utanBete: number }
export function vagDygn(s: State, fran: number, till: number): VagDygn | undefined {
  const vl = s.varld, v = varldMark(s);
  if (!vl || !v) return undefined;
  const vag = vagMellan(vl, v, fran, till, 'fots', s.now);
  if (!vag) return undefined;
  const rutor = vagRutor(vag, v.w), k = kostnader(vl, v, 'fots');
  let torr = 0, hit = 0, utanBete = 0;
  for (let n = 1; n < rutor.length; n++) {
    const i = rutor[n], d = k[i] / VARLD.gangPerDygn;
    hit = vattenVid(v, i) ? 0 : hit + d; torr = Math.max(torr, hit);
    if (!VARLDMARK[MARK_IDS[v.mark[i]]].bete && !varldPlatserPa(vl, i % v.w, Math.floor(i / v.w)).some(p => p.k === 'by')) utanBete += d;
  }
  return { rutor, dygn: vag.kostnad / VARLD.gangPerDygn, torr, utanBete };
}
// vad en resenär bär och vad ett djur bär
export const barResenar = (s: State, p: Person) => RESA.hander + (ryggsack(s, p) ? RESA.rygg : 0);
export const barDjur = (s: State, id: number) => { const d = tamdjurOf(s).find(q => q.id === id); return d ? (tamArt(d.art).styrka ?? 0) * RESA.packPerStyrka : 0; };

// packningens behov för en resa: maten, vattensäckarna och fodret i hela saker, dygnen och bärförmågan. Går inte allt in tas
// maten före fodret, och vattnet först (utan vatten kommer ingen fram)
export interface Packbehov { dygn: number; mat: number; vatten: number; foder: number; bar: number; vikt: number; ryms: boolean }
export function packbehov(s: State, sl: Sallskap): Packbehov | undefined {
  const vl = s.varld, v = varldMark(s), hem = vl && byPlats(vl, sl.by), mal = vl?.platser?.find(p => p.nr === sl.mal);
  if (!vl || !v || !hem || !mal) return undefined;
  const vd = vagDygn(s, hem.y * v.w + hem.x, mal.y * v.w + mal.x);
  if (!vd) return undefined;
  const folk = sl.medl.map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p), led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const n = folk.length, dygn = 2 * vd.dygn + RESMAL[sl.skal].stannar;
  const bar = folk.reduce((a, p) => a + barResenar(s, p), 0) + sl.djur.reduce((a, id) => a + barDjur(s, id), 0);
  const vatten = vd.torr > RESA.utanVatten ? n : 0;
  let mat = Math.ceil(n * RESA.matPerDygn * dygn * (led ? marginal(led) : RESA.margMitt) - 1e-9);
  let foder = Math.ceil(sl.djur.length * RESA.foderPerDygn * 2 * vd.utanBete - 1e-9);
  const vMat = 1, vVatten = viktOf('vattensack'), vFoder = viktOf('torrgras');
  const behov = mat * vMat + vatten * vVatten + foder * vFoder, ryms = behov <= bar;
  if (!ryms) {
    let rum = bar - vatten * vVatten;
    mat = Math.max(0, Math.min(mat, Math.floor(rum / vMat))); rum -= mat * vMat;
    foder = Math.max(0, Math.min(foder, Math.floor(rum / vFoder)));
  }
  return { dygn: Math.round(dygn * 100) / 100, mat, vatten, foder, bar, vikt: mat * vMat + vatten * vVatten + foder * vFoder, ryms };
}

// ---------- boken över insatserna (steg 11.5.4, Andelarna i tal) ----------
// Vem som satsat vad i sällskapet: egna saker, något ur byns förråd ('by') eller ett djur (en annans häst), i hela saker med
// värdet när resan började. Den som äger en insats behöver inte följa med, och risken är ägarens.
export function satsa(sl: Sallskap, agare: number | 'by', sak: string, n: number): Insats | undefined {
  n = Math.floor(n);
  if (n <= 0) return undefined;
  const e = sl.insatser.find(x => x.agare === agare && x.sak === sak && x.djur === undefined);
  sl.pack[sak] = (sl.pack[sak] ?? 0) + n;
  if (e) { e.n += n; e.varde = Math.round(e.n * grundvarde(sak)); return e; }
  const ny: Insats = { agare, sak, n, varde: Math.round(n * grundvarde(sak)) };
  sl.insatser.push(ny);
  return ny;
}
// ett djur som insats: ägaren är djurets ägare (eller byn), och värdet är artens
export function satsaDjur(s: State, sl: Sallskap, djurId: number): Insats | undefined {
  const d = tamdjurOf(s).find(q => q.id === djurId);
  if (!d || sl.insatser.some(x => x.djur === djurId)) return undefined;
  djurMed(sl, djurId);
  const ny: Insats = { agare: d.agare ?? 'by', sak: d.art, n: 1, varde: tamArt(d.art).varde, djur: djurId };
  sl.insatser.push(ny);
  return ny;
}
// värdet var och en satsat, per ägare
export function insatsPer(sl: Sallskap): Map<number | 'by', number> {
  const m = new Map<number | 'by', number>();
  for (const x of sl.insatser) m.set(x.agare, (m.get(x.agare) ?? 0) + x.varde);
  return m;
}
