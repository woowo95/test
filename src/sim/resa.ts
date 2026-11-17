// ---------- sällskapet och resan (steg 11.5.2–, Flera samhällen: Sällskapet, Packningen i tal, Farten i tal) ----------
// Ett sällskap är en post i världen (vl.sallskap): en ledare och medlemmar (byborna som reser, borta från byn under resan,
// ute.ts), djur och fordon, ett mål (en plats i världen) och ett skäl (en rad i registret RESMAL), ett skede (samlas, packar,
// ute, framme, hemåt, hemma), en plats på vägen, en gemensam packning i hela saker och en bok över insatserna. Talen för resan
// står i blocket RESA. Ingen person är med i två sällskap.
import { balans } from './balans';
import { LandmarkId } from './landmarken';
import { H, HOUR, Person, State, Task, W } from './typer';
import { isLight } from './tid';
import { temperature, vaderNu } from './vader';
import { KROPP, count } from './folk';
import { TORST } from './torst';
import { SAKER } from './saker';
import { alive } from './folk';
import { BYN } from './egendom';
import { amountOf, laggIn, use } from './lager';
import { FOOD } from './saker';
import { bynsMitt, utanforByn } from './omrade';
import { blocked, freeNear } from './byggnad';
import { gaBort, ute } from './ute';
import { Varlden, varldMark } from './varlden';
import { byPlats, varldPlatserPa } from './landmarken';
import { clamp } from './slump';
import { ryggsack } from './utrustning';
import { tamArt, tamdjurOf } from './tamdjur';
import { viktOf } from './saker';
import { grundvarde } from './varde';
import { VARLD, VARLDMARK, MARK_IDS, VarldMark } from './varldmark';
import { kostnader, vagMellan, vagRutor, VarldVag } from './vagval';
import { delFel, GADELAR } from './halsa';
import { ageOf, ALDER } from './folk';
import { snoPaMarken } from './vader';
import { sallskapTyngd, trampa } from './leder';
import { kommHem } from './ute';
import { larOrt, O_BESOKT, radBesoker } from './ort';
import { BYSORTER, radNr } from './radtal';
import { klanPris, prisAndras } from './klaner';
import { makeName } from './folk';
import { rnd } from './slump';
import { DAY } from './typer';

export const RESA = balans('resa', {
  samlaSek: 3600, // så länge (sekunder i verkligheten) ledaren får samla sällskapet innan resan ställs in (en timme, ett kvarts dygn i spelet)
  // packningen (steg 11.5.3)
  matPerDygn: 1.6, // portioner per resenär och dygn (en vuxens måltid är en portion)
  margModig: 1, margMitt: 1.25, margForsiktig: 1.5, // ledarens marginal: den modiga och slarviga, mitten och den försiktiga
  utanVatten: 0.5, // en sträcka utan vatten längre än så många dygn kräver en vattensäck per resenär
  foderPerDygn: 2, // hö per djur och dygn där det inte går att beta
  hander: 20, rygg: 20, // vikt en resenär bär i händerna och i en ryggsäck
  packPerStyrka: 20, // ett packdjurs last för varje steg av dess styrka
  andelVarde: 40, // en andel per så mycket i värde för varje insats (Andelarna i tal)
  packTim: 6, // timmar en resenär väntar vid samlingsplatsen innan hen väljer om (sällskapet ställs in i steg 11.5.11)
  // behoven på vägen (steg 11.5.6): orken per timme i gång och i nattens rast, och tappet en natt utan tak
  orkGang: 0.06, // så mycket ork per timme i gång på dagen (en hel dag tar 0,72)
  orkVila: 0.1, // så mycket ork per timme i nattens rast (en hel natt ger 1,2)
  koldFran: 8, // grader: under så kallt drar natten ute ork ...
  orkKold: 0.012, // ... så mycket per timme och grad under koldFran, för den som inte ryms i tälten
  orkBlot: 0.08, // så mycket per timme i det kraftigaste regnet eller snöfallet, för den som inte ryms i tälten
  talt: 4, // så många ryms i ett tält
  orkFartFran: 0.5, orkFartMin: 0.6, // under så mycket ork går sällskapet långsammare, jämnt ner till orkFartMin vid ingen ork
  // farten (steg 11.5.7)
  fartBarn: 0.75, fartGammal: 0.75, fartBen: 0.5, // barn och gamla, och den med skadade ben (ner till så här)
  lastFran: 0.5, lastMin: 0.8, // lasten bromsar över så stor del av bärförmågan, jämnt ner till lastMin vid full last
  snoFran: 0.3, snoFart: 0.8, // så mycket snö på marken, och farten i den
  dagTim: 12, // timmar i gång per dygn (dagsljuset, isLight)
  // besöket hos en rad (steg 11.5.8)
  besokInst: 2, // så mycket bättre blir inställningen hos byn som får besök
  matKvar: 0.5, // så stor del av sin mat säljer en by högst
  mott: 3, // så många av byns folk som huvudbyn mött minns raden
});
// det sällskapet behåller för vägen och inte säljer (maten säljs inte heller)
const BEHALL = ['torrgras', 'vattensack', 'talt', 'silver'];

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

export type Skede = 'samlas' | 'packar' | 'gar' | 'ute' | 'framme' | 'hemat' | 'hemma'; // gar: på väg ut ur byn
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
  ut?: Utgang; vid?: number[]; packar?: number; // samlingsplatsen och kanten, de som är framme vid samlingsplatsen och när packningen började (steg 11.5.5)
  behov?: ResBehov; // mättnaden, vätskan och orken på vägen, för hela gruppen (steg 11.5.6)
  gang?: number; framme?: number; // gången mot nästa ruta (i rutans kostnad) och när sällskapet kom fram (steg 11.5.7)
  delning?: Andelar; // hur det delades hemma (steg 11.5.9)
}
// sällskapets tre tal på vägen (0–1), de fyllda vattensäckarna och fodret djuren ätit sedan sist (arbetet mot nästa hela hö)
export interface ResBehov { matt: number; vatska: number; ork: number; fulla: number; foder: number }

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

// ---------- packningsskedet i byn (steg 11.5.5, Packningen i tal) ----------
// Ledaren bestämmer att sällskapet packar: maten och fodret tas ur förrådet i hela saker (bokförda som insatser hos dem som
// ägde dem, det som var byns som byns), och samlingsplatsen är där linjen från byns mitt mot rätt kant (målets håll i världen)
// lämnar byns område. Varje resenär går dit med sitt (handlingen resa); när alla är framme lastas djuren och sällskapet går
// ut ur kartan längs samma linje. Den som når kanten är borta (gaBort), och när alla gått är sällskapet ute på vägen.
export interface Utgang { samla: { x: number; y: number }; kant: { x: number; y: number } }
export function utgang(s: State, sl: Sallskap): Utgang | undefined {
  const vl = s.varld, hem = vl && byPlats(vl, sl.by), mal = vl?.platser?.find(p => p.nr === sl.mal);
  if (!hem || !mal) return undefined;
  const c = bynsMitt(s), dx = mal.x - hem.x, dy = mal.y - hem.y;
  const [sx, sy] = Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
  const d = sx > 0 ? W - 1 - c.x : sx < 0 ? c.x : sy > 0 ? H - 1 - c.y : c.y;
  let samla = { x: c.x + sx * d, y: c.y + sy * d };
  for (let n = 0; n <= d; n++) { const x = c.x + sx * n, y = c.y + sy * n; if (utanforByn(s, x, y) >= 1 && !blocked(s, x, y)) { samla = { x, y }; break; } }
  return { samla: freeNear(s, samla.x, samla.y), kant: freeNear(s, c.x + sx * d, c.y + sy * d) };
}
// maten och fodret till packningen: den mat det finns mest av först, i hela saker, bokförd hos ägarna
function taIPackning(s: State, sl: Sallskap, k: string, n: number, led?: Person) {
  const ag = use(s, led, k, n);
  for (const o in ag) { const m = Math.floor(ag[o] + 1e-9); if (m > 0) satsa(sl, o === String(BYN) ? 'by' : +o, k, m); }
}
export function borjaPacka(s: State, sl: Sallskap): boolean {
  const pb = packbehov(s, sl), ut = utgang(s, sl);
  if (sl.skede !== 'samlas' || !pb || !ut) return false;
  const led = s.people.find(p => p.id === sl.ledare);
  let mat = pb.mat;
  for (const k of [...FOOD].sort((a, b) => amountOf(s, b) - amountOf(s, a))) {
    if (mat <= 0) break;
    const n = Math.min(mat, Math.floor(amountOf(s, k)));
    if (n > 0) { taIPackning(s, sl, k, n, led); mat -= n; }
  }
  const ho = Math.min(pb.foder, Math.floor(amountOf(s, 'torrgras')));
  if (ho > 0) taIPackning(s, sl, 'torrgras', ho, led);
  sl.skede = 'packar'; sl.ut = ut; sl.vid = []; sl.packar = s.now;
  return true;
}
// nivån Tillfälle (val.ts): resenären i ett sällskap som packar går till samlingsplatsen, och när sällskapet går, till kanten
export function resaVal(s: State, p: Person): { spot: { x: number; y: number }; dur: number; why: string; ref: number } | undefined {
  const sl = sallskapFor(s.varld, p.id);
  if (!sl?.ut || (sl.skede !== 'packar' && sl.skede !== 'gar') || ute(p)) return undefined;
  const namn = s.varld!.platser!.find(q => q.nr === sl.mal)?.namn ?? '';
  return sl.skede === 'packar'
    ? { spot: sl.ut.samla, dur: RESA.packTim * HOUR, why: `Packar för resan till ${namn}`, ref: sl.id }
    : { spot: sl.ut.kant, dur: RESA.packTim * HOUR, why: `Går ut på resan till ${namn}`, ref: sl.id };
}
// resenären är framme (MEDAN i steg.ts): vid samlingsplatsen väntar hen in de andra, vid kanten lämnar hen byn
export function resaSteg(s: State, p: Person, tk: Task) {
  const sl = s.varld?.sallskap?.find(x => x.id === tk.ref);
  if (!sl?.ut || !sl.medl.includes(p.id)) { tk.until = s.now; return; }
  if (sl.skede === 'packar') {
    if (!sl.vid!.includes(p.id)) sl.vid!.push(p.id);
    const kvar = sl.medl.filter(id => { const q = s.people.find(x => x.id === id); return q && alive(q) && !ute(q) && !sl.vid!.includes(id); });
    if (kvar.length) return;
    sl.skede = 'gar'; // alla är framme: djuren lastas och sällskapet går
    for (const d of tamdjurOf(s)) if (sl.djur.includes(d.id)) { d.x = sl.ut.samla.x; d.y = sl.ut.samla.y; }
    for (const id of sl.medl) { const q = s.people.find(x => x.id === id); if (q?.task?.act === 'resa') { q.task.tx = sl.ut.kant.x; q.task.ty = sl.ut.kant.y; q.task.phase = 'go'; } }
    return;
  }
  if (sl.skede !== 'gar' || Math.hypot(p.x - sl.ut.kant.x, p.y - sl.ut.kant.y) > 1.5) return;
  gaBort(s, p);
  if (sl.medl.every(id => { const q = s.people.find(x => x.id === id); return !q || !alive(q) || ute(q); })) {
    for (const d of s.tamdjur ?? []) if (sl.djur.includes(d.id) && d.dog === undefined) d.ute = s.now; // djuren följer med ut
    const hem = byPlats(s.varld!, sl.by), v = varldMark(s);
    sl.skede = 'ute'; sl.t = s.now; sl.ruta = hem && v ? hem.y * v.w + hem.x : undefined; sl.pos = 0; sl.gang = 0;
    satVag(s, sl, true);
  }
}

// ---------- behoven på vägen (steg 11.5.6, Packningen i tal och Orken och tälten på resan) ----------
// Ute på vägen räknas sällskapet var tionde minut (en rad i TAKTER) med tre tal för hela gruppen. Mättnaden sjunker som en
// bybos, och när gruppen är hungrig äter den en portion per resenär ur packningen, den mat som håller kortast först. Vätskan
// sjunker som törsten; vid vatten dricker gruppen och fyller säckarna, och på en torr sträcka dricker den ur säckarna, en per
// resenär. Djuren äter hö där det inte går att beta, i hela saker. Orken sjunker i gång på dagen och stiger i nattens rast, och
// en natt utan tak drar ork efter kölden och regnet eller snön för den del av gruppen som inte ryms i tälten. Framme tär
// vädret inte. Låg ork sänker farten (orkFart, steg 11.5.7).
export const PA_VAGEN: readonly Skede[] = ['ute', 'framme', 'hemat'];
const behovOf = (sl: Sallskap) => sl.behov ??= { matt: 1, vatska: 1, ork: 1, fulla: sl.pack.vattensack ?? 0, foder: 0 };
// rutan sällskapet är på (i världen), och om det går att beta och finns vatten där
function rutaNu(s: State, sl: Sallskap) {
  const v = varldMark(s), i = sl.ruta;
  if (!v || i === undefined) return { vatten: false, bete: true };
  const by = varldPlatserPa(s.varld!, i % v.w, Math.floor(i / v.w)).some(p => p.k === 'by');
  return { vatten: vattenVid(v, i) || by, bete: by || !!VARLDMARK[MARK_IDS[v.mark[i]]].bete };
}
// den mat i packningen som håller kortast
const kortastMat = (sl: Sallskap) => FOOD.filter(k => (sl.pack[k] ?? 0) >= 1).sort((a, b) => (SAKER[a]!.haller ?? 99) - (SAKER[b]!.haller ?? 99))[0];
function tappa(sl: Sallskap, k: string, n: number) { sl.pack[k] = (sl.pack[k] ?? 0) - n; if (sl.pack[k]! <= 0) delete sl.pack[k]; }
// sällskapets fart efter orken (en faktor i Farten i tal)
export const orkFart = (sl: Sallskap) => {
  const o = sl.behov?.ork ?? 1;
  return o >= RESA.orkFartFran ? 1 : RESA.orkFartMin + (1 - RESA.orkFartMin) * Math.max(0, o) / RESA.orkFartFran;
};
// tappet i ork per timme en natt utan tak, för hela gruppen (tälten skyddar fyra var)
export function nattTapp(s: State, sl: Sallskap, t = s.now) {
  const n = sl.medl.length, talt = Math.floor(sl.pack.talt ?? 0), utan = n ? Math.max(0, n - RESA.talt * talt) / n : 0;
  const v = vaderNu(s, t);
  return utan * (Math.max(0, RESA.koldFran - temperature(s, t)) * RESA.orkKold + v.nb * RESA.orkBlot);
}
// en bit av tiden (dt sekunder, kortare än en timme) för ett sällskap på vägen
function behovBit(s: State, sl: Sallskap, t: number, dt: number) {
  if (sl.skede !== 'framme' && isLight(t)) ga(s, sl, t, dt);
  else if (sl.skede === 'framme' && t - (sl.framme ?? t) >= RESMAL[sl.skal].stannar * 24 * HOUR) { sl.skede = 'hemat'; satVag(s, sl, false); }
  if (!PA_VAGEN.includes(sl.skede)) return;
  const b = behovOf(sl), tim = dt / HOUR, dag = isLight(t), framme = sl.skede === 'framme', r = rutaNu(s, sl), n = sl.medl.length;
  b.matt = clamp(b.matt - tim / KROPP.hungerTim, 0, 1);
  b.vatska = clamp(b.vatska - tim / TORST.tim * (dag ? 1 : TORST.somn), 0, 1);
  if (dag && !framme) b.ork -= tim * RESA.orkGang;
  else if (!dag) b.ork += tim * RESA.orkVila - (framme ? 0 : tim * nattTapp(s, sl, t));
  b.ork = clamp(b.ork, 0, 1);
  // äta: en portion per resenär, den mat som håller kortast först
  while (b.matt < KROPP.hungrig) {
    let at = 0;
    for (let k = kortastMat(sl); k && at < n; k = kortastMat(sl)) { const m = Math.min(n - at, Math.floor(sl.pack[k]!)); tappa(sl, k, m); at += m; }
    if (!at) { count(s, 'resa utan mat'); break; }
    b.matt = clamp(b.matt + KROPP.mattar * at / n, 0, 1);
    count(s, 'resa måltid');
  }
  // dricka: vid vatten fylls säckarna, annars dricker gruppen ur dem, en per resenär
  if (r.vatten) { b.vatska = 1; b.fulla = Math.floor(sl.pack.vattensack ?? 0); }
  else if (b.vatska < TORST.torstig) {
    if (b.fulla >= n) { b.fulla -= n; b.vatska = 1; count(s, 'resa dricker ur säcken'); } else count(s, 'resa utan vatten');
  }
  // djuren äter hö där det inte går att beta
  if (!r.bete && sl.djur.length) {
    b.foder += sl.djur.length * RESA.foderPerDygn * tim / 24;
    while (b.foder >= 1 - 1e-9) { if ((sl.pack.torrgras ?? 0) < 1) { count(s, 'resa djur utan foder'); b.foder = 0; break; } tappa(sl, 'torrgras', 1); b.foder = Math.max(0, b.foder - 1); }
  }
}
// var tionde minut (TAKTER): sällskapen på vägen, i bitar om högst tio minuter
export function resaBehov(s: State, dt: number) {
  for (const sl of sallskapNu(s.varld)) {
    if (!PA_VAGEN.includes(sl.skede)) continue;
    for (let gjort = 0; gjort < dt - 1e-9;) { const d = Math.min(600, dt - gjort); behovBit(s, sl, s.now - dt + gjort + d, d); gjort += d; }
  }
}

// ---------- farten och gången längs leden (steg 11.5.7, Farten i tal) ----------
// Sällskapets fart är den långsammaste medlemmens (en frisk vuxen 1, barn och gamla 0,75, skadade ben ner till 0,5, ett djur
// sin egen) gånger lastens, årstidens (snön) och orkens. Ledens fart ligger i rutans kostnad (vagval.ts), så en stig går
// fortare än obanad mark. Lasten bromsar bara på resan, inte i byn. Sällskapet går i dagsljuset, ruta för ruta längs vägen,
// och trampar leden (leder.ts) där det går; framme stannar det så många dygn som skälet säger och går sedan hem.
const resenarer = (s: State, sl: Sallskap) => sl.medl.map(id => s.people.find(p => p.id === id)).filter((p): p is Person => !!p && alive(p));
export function personFart(s: State, p: Person) {
  const a = ageOf(p, s.now), ben = Math.max(0, ...GADELAR.map(d => clamp(delFel(p, d), 0, 1)));
  return Math.min(a < ALDER.vuxen ? RESA.fartBarn : a >= ALDER.gammal ? RESA.fartGammal : 1, 1 - (1 - RESA.fartBen) * ben);
}
// packningens vikt (maten väger en per portion, som i packbehov)
export const packVikt = (sl: Sallskap) => Object.entries(sl.pack).reduce((a, [k, n]) => a + n * (FOOD.includes(k) ? 1 : viktOf(k)), 0);
export function lastFart(s: State, sl: Sallskap) {
  const bar = resenarer(s, sl).reduce((a, p) => a + barResenar(s, p), 0) + sl.djur.reduce((a, id) => a + barDjur(s, id), 0);
  const x = bar > 0 ? packVikt(sl) / bar : 1;
  return x <= RESA.lastFran ? 1 : Math.max(RESA.lastMin, 1 - (1 - RESA.lastMin) * (x - RESA.lastFran) / (1 - RESA.lastFran));
}
export function sallskapFart(s: State, sl: Sallskap) {
  const folk = resenarer(s, sl), djur = (s.tamdjur ?? []).filter(d => sl.djur.includes(d.id) && d.dog === undefined);
  const lang = Math.min(1, ...folk.map(p => personFart(s, p)), ...djur.map(d => tamArt(d.art).snabb ?? 1));
  return lang * lastFart(s, sl) * (snoPaMarken(s) >= RESA.snoFran ? RESA.snoFart : 1) * orkFart(sl);
}
// vägen bort till målet eller hem igen
function satVag(s: State, sl: Sallskap, bort: boolean) {
  const vl = s.varld, v = varldMark(s), hem = vl && byPlats(vl, sl.by), mal = vl?.platser?.find(p => p.nr === sl.mal);
  if (!vl || !v || !hem || !mal) return;
  const a = hem.y * v.w + hem.x, b = mal.y * v.w + mal.x, vag = vagMellan(vl, v, bort ? a : b, bort ? b : a, 'fots', s.now);
  sl.vag = vag ? { fran: vag.fran, till: vag.till, steg: vag.steg } : undefined; sl.pos = 0; sl.gang = 0; sl.ruta = bort ? a : b;
}
export const vagenRutor = (s: State, sl: Sallskap) => { const v = varldMark(s); return v && sl.vag ? vagRutor(sl.vag as VarldVag, v.w) : []; };
// en bit av dagen i gång (dt sekunder): framåt längs vägen i rutornas kostnad
function ga(s: State, sl: Sallskap, t: number, dt: number) {
  const vl = s.varld, v = varldMark(s), rutor = vagenRutor(s, sl);
  if (!vl || !v || !rutor.length) return;
  const k = kostnader(vl, v, 'fots'), tyngd = sallskapTyngd(resenarer(s, sl).length, sl.djur.length);
  sl.gang = (sl.gang ?? 0) + VARLD.gangPerDygn / RESA.dagTim * sallskapFart(s, sl) * dt / HOUR;
  let pos = sl.pos ?? 0;
  while (pos < rutor.length - 1 && sl.gang >= k[rutor[pos + 1]] - 1e-9) {
    sl.gang -= k[rutor[pos + 1]];
    trampa(vl, [rutor[pos], rutor[pos + 1]], tyngd, t);
    pos++; sl.ruta = rutor[pos];
  }
  sl.pos = pos;
  if (pos < rutor.length - 1) return;
  sl.gang = 0;
  if (sl.skede === 'ute') { sl.skede = 'framme'; sl.framme = t; count(s, 'resa framme'); radBesok(s, sl, t); }
  else if (sl.skede === 'hemat') hemkomst(s, sl, t);
}
// sällskapet är hemma: resenärerna kommer in vid kanten de gick ut från, och djuren med dem
export function hemkomst(s: State, sl: Sallskap, t: number) {
  const in_ = sl.ut?.kant ?? bynsMitt(s);
  for (const p of resenarer(s, sl)) if (ute(p)) kommHem(s, p, in_.x, in_.y);
  for (const d of s.tamdjur ?? []) if (sl.djur.includes(d.id) && d.ute !== undefined) { delete d.ute; d.x = in_.x; d.y = in_.y; }
  delaHemma(s, sl);
  sl.skede = 'hemma'; sl.t = t;
  count(s, 'resa hemma');
}

// ---------- besöket hos en rad (steg 11.5.8, Besöket hos en rad) ----------
// Sällskapet som kommer fram: platsen blir besökt för huvudbyns rad och för var och en av resenärerna. Är platsen en by med
// folk säljer sällskapet det det har med sig att byta (allt utom maten och det som behövs för vägen) mot byns silver, efter
// byns pris, och köper mat för vägen hem för silvret, aldrig mer än byns överskott. Byns tal ändras i hela saker: silvret,
// maten och rikedomen. Resenärerna möter byns folk, och byn minns dem som mött huvudbyn (de fasta personerna, rollen mott).
const varde1 = (k: string) => grundvarde(k);
export function radBesok(s: State, sl: Sallskap, t: number) {
  const vl = s.varld, plats = vl?.platser?.find(p => p.nr === sl.mal);
  if (!vl || !plats) return;
  radBesoker(vl, vl.huvud, sl.mal);
  const folk = resenarer(s, sl);
  for (const p of folk) larOrt(s, p, sl.mal, O_BESOKT, 1, { t });
  const r = plats.by !== undefined ? radNr(vl, plats.by) : undefined;
  sl.dagbok.push([t, `Kom fram till ${plats.namn}.`]);
  if (!r || !BYSORTER[r.sort].folk || r.tal.folk <= 0) return;
  const k = r.syn;
  // sälja: varorna mot byns silver
  let fick = 0, salda = 0;
  for (const sak of Object.keys(sl.pack).sort()) {
    if (BEHALL.includes(sak) || FOOD.includes(sak) || !(varde1(sak) > 0)) continue;
    const per = varde1(sak) * klanPris(k, sak);
    const m = Math.min(Math.floor(sl.pack[sak]!), Math.floor(r.tal.silver / per));
    if (m <= 0) continue;
    const pay = Math.floor(m * per);
    r.tal.silver -= pay; fick += pay; salda += m; tappa(sl, sak, m);
    r.tal.rikedom += Math.round(m * varde1(sak)) - pay;
    if (k) prisAndras(k, sak, pay, -1);
  }
  if (fick) { sl.pack.silver = (sl.pack.silver ?? 0) + fick; sl.dagbok.push([t, `Sålde ${salda} saker i ${r.namn} för ${fick} silver.`]); count(s, 'resa sålde', salda); }
  // köpa: mat för vägen hem
  const v = varldMark(s), hem = byPlats(vl, sl.by), vd = v && hem ? vagDygn(s, plats.y * v.w + plats.x, hem.y * v.w + hem.x) : undefined;
  const led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const behov = vd ? Math.ceil(folk.length * RESA.matPerDygn * (vd.dygn + RESMAL[sl.skal].stannar) * (led ? marginal(led) : RESA.margMitt) - 1e-9) : 0;
  const har = FOOD.reduce((a, f) => a + Math.floor(sl.pack[f] ?? 0), 0), kop = FOOD.filter(f => varde1(f) > 0).sort((a, b) => (SAKER[b]!.haller ?? 0) - (SAKER[a]!.haller ?? 0))[0];
  if (kop && behov > har) {
    const per = varde1(kop) * klanPris(k, kop);
    let m = Math.min(behov - har, Math.floor(r.tal.mat * RESA.matKvar), Math.floor((sl.pack.silver ?? 0) / per));
    while (m > 0 && Math.ceil(m * per) > (sl.pack.silver ?? 0)) m--;
    if (m > 0) {
      const pay = Math.ceil(m * per);
      tappa(sl, 'silver', pay); sl.pack[kop] = (sl.pack[kop] ?? 0) + m;
      r.tal.mat -= m; r.tal.silver += pay; r.tal.rikedom += pay - Math.round(m * varde1(kop));
      if (k) prisAndras(k, kop, pay, 1);
      sl.dagbok.push([t, `Köpte ${m} ${SAKER[kop]!.namn.toLowerCase()} för ${pay} silver till vägen hem.`]); count(s, 'resa köpte', m);
    }
  }
  // mötet: byn minns resenärerna som mött huvudbyn, och inställningen blir lite bättre
  const mott = r.fasta.filter(f => f.roll === 'mott').length;
  if (mott < RESA.mott) {
    const kon = rnd(s, 'resa') < 0.5 ? 'm' : 'k';
    r.fasta.push({ namn: makeName(s, kon, 'resa'), kon, fodd: Math.round(t - (18 + rnd(s, 'resa') * 30) * DAY), roll: 'mott' });
  }
  if (k) k.inst = Math.min(100, k.inst + RESA.besokInst);
  sl.dagbok.push([t, `Mötte folket i ${r.namn}.`]); count(s, 'resa besök');
}

// ---------- hemkomsten och andelarna (steg 11.5.9, Andelarna i tal) ----------
// Hemma går det som finns kvar av insatserna tillbaka till sina ägare (av en sak som flera satsat delat efter hur mycket var och
// en satsade, i hela saker), och ett djur som lever går tillbaka; ett djur som dött ersätts inte. Varje delägare får en fordran:
// värdet av det hen satsade som gått åt, plus hens del av vinsten (bytets värde minus det som gått åt). Andelarna är en per
// resenär och en per RESA.andelVarde i värde för varje insats. Bytet (det som är kvar i packningen) delas i hela saker, den mest
// värda först till den som har störst fordran kvar.
export type Agare = number | 'by';
export interface Andelar { tillbaka: [Agare, string, number][]; byte: [Agare, string, number][]; gatt: number; varde: number; vinst: number; fordran: [Agare, number][]; andelar: [Agare, number][] }
export function delaAndelar(insatser: Insats[], resenarer: number[], kvar: Record<string, number>, djurLever: (id: number) => boolean, varde: (k: string) => number = grundvarde): Andelar {
  const pack: Record<string, number> = {};
  for (const k in kvar) { const n = Math.floor(kvar[k]! + 1e-9); if (n > 0) pack[k] = n; }
  const tillbaka: [Agare, string, number][] = [], gattPer = new Map<Agare, number>(), andel = new Map<Agare, number>();
  const lagg = <K>(m: Map<K, number>, k: K, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const id of resenarer) lagg(andel, id as Agare, 1);
  for (const x of insatser) { const a = Math.floor(x.varde / RESA.andelVarde); if (a > 0) lagg(andel, x.agare, a); }
  // djuren: det levande går tillbaka, det döda ersätts inte
  for (const x of insatser) if (x.djur !== undefined && djurLever(x.djur)) tillbaka.push([x.agare, x.sak, 1]);
  // sakerna: det som är kvar av varje sak delas efter insatserna, i hela saker (störst rest först)
  const saker = [...new Set(insatser.filter(x => x.djur === undefined).map(x => x.sak))].sort();
  for (const sak of saker) {
    const ins = insatser.filter(x => x.djur === undefined && x.sak === sak), N = ins.reduce((a, x) => a + x.n, 0), har = Math.min(pack[sak] ?? 0, N);
    const del = ins.map(x => ({ x, n: Math.floor(har * x.n / N), rest: har * x.n / N - Math.floor(har * x.n / N) }));
    let over = har - del.reduce((a, d) => a + d.n, 0);
    for (const d of [...del].sort((a, b) => b.rest - a.rest)) { if (over <= 0) break; d.n++; over--; }
    for (const d of del) {
      if (d.n > 0) tillbaka.push([d.x.agare, sak, d.n]);
      lagg(gattPer, d.x.agare, (d.x.n - d.n) * d.x.varde / d.x.n);
    }
    pack[sak] = (pack[sak] ?? 0) - har; if (pack[sak]! <= 0) delete pack[sak];
  }
  const gatt = [...gattPer.values()].reduce((a, v) => a + v, 0);
  const vardeByte = Object.entries(pack).reduce((a, [k, n]) => a + n * varde(k), 0), vinst = vardeByte - gatt;
  const summa = [...andel.values()].reduce((a, v) => a + v, 0);
  const fordran = new Map<Agare, number>();
  for (const a of new Set<Agare>([...gattPer.keys(), ...andel.keys()])) fordran.set(a, (gattPer.get(a) ?? 0) + (summa ? vinst * (andel.get(a) ?? 0) / summa : 0));
  // bytet: den mest värda saken först till den som har störst fordran kvar
  const kvarF = new Map(fordran), byte = new Map<string, number>();
  const ordning = [...fordran.keys()];
  for (const k of Object.keys(pack).sort((a, b) => varde(b) - varde(a) || (a < b ? -1 : 1))) {
    for (let n = 0; n < pack[k]!; n++) {
      let bast = ordning[0]!;
      for (const a of ordning) if ((kvarF.get(a) ?? 0) > (kvarF.get(bast) ?? 0) + 1e-9) bast = a;
      if (bast === undefined) break;
      kvarF.set(bast, (kvarF.get(bast) ?? 0) - varde(k));
      const nyckel = JSON.stringify([bast, k]); byte.set(nyckel, (byte.get(nyckel) ?? 0) + 1);
    }
  }
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    tillbaka, byte: [...byte].map(([k, n]) => { const [a, sak] = JSON.parse(k) as [Agare, string]; return [a, sak, n] as [Agare, string, number]; }),
    gatt: r2(gatt), varde: r2(vardeByte), vinst: r2(vinst), fordran: [...fordran].map(([a, v]) => [a, r2(v)] as [Agare, number]), andelar: [...andel],
  };
}
// hemma: insatserna tillbaka och bytet delat, i förrådet hos ägarna (byns det som är byns, och den döda ägarens går till byn)
function delaHemma(s: State, sl: Sallskap) {
  const lever = (id: number) => (s.tamdjur ?? []).some(d => d.id === id && d.dog === undefined);
  const a = delaAndelar(sl.insatser, sl.medl, sl.pack, lever);
  const agareI = (x: Agare) => { if (x === 'by') return undefined; const p = s.people.find(q => q.id === x); return p && alive(p) ? x : undefined; };
  const djurArt = new Set(sl.insatser.filter(x => x.djur !== undefined).map(x => x.sak)); // djuret går själv hem (hemkomst)
  for (const [ag, sak, n] of a.tillbaka) if (!djurArt.has(sak)) laggIn(s, sak, n, agareI(ag));
  for (const [ag, sak, n] of a.byte) laggIn(s, sak, n, agareI(ag));
  sl.pack = {}; sl.delning = a;
  count(s, 'resa bytets värde', Math.round(a.varde));
  sl.dagbok.push([s.now, `Hemma: bytet var värt ${Math.round(a.varde)}, det som gått åt ${Math.round(a.gatt)}.`]);
}
