// ---------- packningen och behoven för världens byars färder (steg 15.1.86, Flera samhällen: Packningen i tal, Orken och tälten) ----------
// En färd från en by i världen packar som huvudbyns sällskap (packbehov i resa.ts): maten är det resenärerna äter per dygn
// enligt kroppen gånger dygnen dit och hem gånger ledarens marginal, vattnet de säckar de dricker på den längsta torra sträckan,
// tälten ett per fyra när resan har en natt och fodret två hö per djur och dygn där det inte går att beta, i hela saker, med
// bärförmågan som tak. Maten och fodret tas ur byns förråd; vattensäckarna och tälten har byn när den kan göra dem (tekniken).
// På vägen äter, dricker och rastar färden som sällskapet (behovSteg), och utan mat eller vatten tär det på hälsan som i byn,
// för hela färden (steg 15.1.89); när maten tar slut väger ledaren MATSLUT med samma poäng. Det som inte gått åt kommer hem
// till byns förråd, och de som flyttar har det med sig till byn de flyttar till.
import type { RadFard } from './byhandling';
import { BYHANDLING, fardSort } from './byhandling';
import { fardAntal, fardDoda } from './fardfolk';
import { radNr, VarldRad } from './radtal';
import { fastEgenskaper } from './radperson';
import { fastaI } from './vacktfasta';
import { radDoda } from './rad';
import { radTaUr, radTar } from './priser';
import { DJUR } from './redskap';
import { enhet } from './radanfall';
import { SLAKTAD } from './boskap';
import { tamArt } from './tamdjur';
import { behovSteg, harNatt, letaFartAv, letaTaktVid, margAv, matPerResenar, MATSLUT, MATSLUT_IDS, packVatten, RESA, vagDygn, type MatLage, type Sallskap } from './resa';
import { varldMark, Varlden } from './varlden';
import { byPlats, varldPlatsNr } from './landmarken';
import { VARLD } from './varldmark';
import { kostnader, vagRutor } from './vagval';
import { KROPP, count } from './folk';
import { TORST } from './torst';
import { isLight } from './tid';
import { fardSlut, resStat } from './resstat';
import { clamp } from './slump';
import { DAY, HOUR, State } from './typer';

const platsFor = (vl: Varlden, nr: number) => byPlats(vl, nr) ?? varldPlatsNr(vl, nr);
// färdens ledare: den första i färdfolket, och hens egenskaper (1–20)
function ledEg(vl: Varlden, f: RadFard) {
  const r = radNr(vl, f.fran), namn = f.folk?.[0], l = r && namn !== undefined ? fastaI(r, f.t0).find(p => p.namn === namn) : undefined;
  return l?.fp ? fastEgenskaper(l.fp) : undefined;
}
const djurAv = (f: RadFard) => f.last?.djur && !f.last.vagnar ? 1 : 0;
// färden packar ur byns förråd när den ger sig av (byhandling.ts, skicka)
export function packaFard(s: State, vl: Varlden, f: RadFard, fart: number) {
  const r = radNr(vl, f.fran), v = varldMark(s), a = platsFor(vl, f.fran), b = platsFor(vl, f.till);
  if (!r || r.nr === vl.huvud || !v || !a || !b) return;
  const vd = vagDygn(s, a.y * v.w + a.x, b.y * v.w + b.x);
  if (!vd) return;
  const n = fardAntal(f, BYHANDLING.barare), e = ledEg(vl, f), marg = e ? margAv(e.flit, e.mod) : RESA.margMitt;
  const hem = !f.flytt, dygn = (hem ? 2 : 1) * vd.dygn / fart, torr = Math.max(vd.torr, hem && vd.slut > 0 ? 2 * vd.slut : 0) / fart;
  const kan = (k: string) => r.tek.includes(k);
  let bar = n * (RESA.hander + (kan('ryggsack') ? RESA.rygg : 0)) - (f.last?.varor ?? []).reduce((x, w) => x + w.n, 0); // handlarens varor tar plats
  const vatten = kan('vattensack') ? Math.min(packVatten(n, torr), Math.floor(Math.max(0, bar) / 2)) : 0; bar -= vatten * 2;
  const mat = Math.max(0, Math.min(Math.ceil(n * matPerResenar() * dygn * marg - 1e-9), Math.floor(r.tal.mat), Math.floor(Math.max(0, bar)))); bar -= mat;
  const talt = kan('talt') && harNatt(f.t0, dygn) ? Math.max(0, Math.min(Math.ceil(n / RESA.talt), Math.floor(Math.max(0, bar) / 10))) : 0;
  const foder = djurAv(f) ? Math.ceil(RESA.foderPerDygn * 2 * vd.utanBete - 1e-9) : 0;
  radTaUr(r, 'mat', mat);
  if (foder) radTar(r, 'torrgras', -foder);
  f.pack = {}; if (mat) f.pack.torrkott = mat; if (vatten) f.pack.vattensack = vatten; if (talt) f.pack.talt = talt; if (foder) f.pack.torrgras = foder;
  f.behov = { matt: 1, vatska: 1, ork: 1, fulla: vatten, foder: 0 };
  count(s, 'fard packade mat', mat);
}
// det som inte gått åt kommer hem (eller med de som flyttar): maten och höet, inte säckarna och tälten
export function packaUr(r: VarldRad | undefined, f: RadFard) {
  if (!r || !f.pack) return;
  for (const [k, n] of Object.entries(f.pack)) if (k !== 'vattensack' && k !== 'talt' && n >= 1) radTar(r, k, Math.floor(n));
  f.pack = {};
}
// en bit av vägen (dt ms): behoven, kroppen och letandet när maten tagit slut. Svarar false när ingen i färden lever
export function fardBehov(s: State, vl: Varlden, f: RadFard, t: number, dt: number): boolean {
  if (!f.pack) return true;
  const n = fardAntal(f, BYHANDLING.barare);
  if (n <= 0) return true;
  behovSteg(s, f as RadFard & { pack: Record<string, number> }, { n, ruta: f.vg?.ruta, framme: false, djur: djurAv(f), matslut: () => fardMatslut(s, vl, f, t) }, t, dt);
  fardLeta(s, f, n, t, dt);
  return fardKropp(s, vl, f, n, t, dt);
}
// kroppen bär resan (steg 15.1.89) för hela färden: svält och törst tar hälsa som i byn, och läker med mat och vatten nog
function fardKropp(s: State, vl: Varlden, f: RadFard, n: number, t: number, dt: number) {
  const b = f.behov!, h = dt / HOUR;
  const lage = b.matt <= 0 ? 'svalt' : b.vatska <= 0 ? 'torst' : b.matt > KROPP.lakerMat && b.vatska > TORST.laker ? 'laker' : undefined;
  if (lage === 'laker') f.halsa = clamp((f.halsa ?? 1) + h / KROPP.lakerTim, 0, 1);
  else if (lage) f.halsa = (f.halsa ?? 1) - h / (lage === 'svalt' ? KROPP.svaltTim : TORST.tomTim);
  if ((f.halsa ?? 1) > 0) return true;
  // alla dör på vägen, i hela personer
  const r = radNr(vl, f.fran);
  if (r) radDoda(r, n);
  fardDoda(vl, f, n, t);
  count(s, lage === 'torst' ? 'fard törstade ihjäl' : 'fard svalt ihjäl', n); resStat(s, `by:${fardSort(f)}`, 'döda', n);
  vl.farder = (vl.farder ?? []).filter(x => x !== f); f.gar = undefined;
  fardSlut(s, fardSort(f), (t - f.t0) / DAY);
  return false;
}
// när maten tagit slut letar färden hela dagen, som sällskapet (steg 15.1.90), och den del av dagen den letar går i halv fart
export const fardLetaFart = (f: RadFard, t: number) => letaFartAv((f.letaHel ?? 0) > t ? 1 : 0);
function fardLeta(s: State, f: RadFard, n: number, t: number, dt: number) {
  if (!((f.letaHel ?? 0) > t) || !isLight(t)) return;
  f.letaArb = (f.letaArb ?? 0) + dt / HOUR * letaTaktVid(s, f.vg?.ruta, n, 10, t); // färdfolkets samlare är i mitten
  const m = Math.floor(f.letaArb + 1e-9);
  if (m < 1) return;
  f.letaArb -= m; f.pack!.bar = (f.pack!.bar ?? 0) + m;
  count(s, 'fard letade fram', m);
}
// dygnen kvar längs vägen i färdens fart, och dygnen hem härifrån
function dygnKvar(s: State, vl: Varlden, f: RadFard) {
  const v = varldMark(s), rutor = v && f.vg?.vag ? vagRutor(f.vg.vag as Parameters<typeof vagRutor>[0], v.w) : [];
  if (!v || !rutor.length) return { fram: 0, gatt: 0 };
  const k = kostnader(vl, v, 'fots'), pos = f.vg!.pos ?? 0, kost = (i: number) => isFinite(k[i]!) ? k[i]! : 1;
  let fram = -(f.vg!.gang ?? 0), gatt = 0;
  for (let i = 1; i < rutor.length; i++) (i <= pos ? (gatt += kost(rutor[i]!)) : (fram += kost(rutor[i]!)));
  return { fram: Math.max(0, fram) / VARLD.gangPerDygn, gatt: gatt / VARLD.gangPerDygn };
}
// maten är slut och färden hungrig: ledaren väger MATSLUT med samma poäng som sällskapets ledare (matLage i resa.ts)
export function fardMatLage(s: State, vl: Varlden, f: RadFard, t: number): MatLage {
  const n = Math.max(1, fardAntal(f, BYHANDLING.barare)), e = ledEg(vl, f), d = dygnKvar(s, vl, f), ut = f.gar === 'ut';
  const kvar = d.fram + (ut ? d.fram + d.gatt : 0), hem = ut ? d.gatt : d.fram;
  const hk = RESA.hungerKost * (e ? Math.max(0, 1 + RESA.matEmpati * (e.empati - 10) / 10) : 1);
  const varde = f.n > 0 ? f.n * enhet(f.g) : RESA.seVarde; // det färden bär, i grundvärde
  let djur: MatLage['djur'];
  const art = djurAv(f) ? f.last!.djur! : undefined, x = art && Object.values(DJUR).find(y => 'kott' in y && y.sak === SLAKTAD[art]) as { kott: string; slakt: Record<string, number> } | undefined;
  if (art && x && (x.slakt[x.kott] ?? 0) > 0) djur = { id: -1, kott: x.kott, m: x.slakt[x.kott]!, varde: tamArt(art).varde };
  return { n, kvar: Math.round(kvar * 100) / 100, hem: Math.round(hem * 100) / 100, hk, varde, leta: RESA.dagTim * letaTaktVid(s, f.vg?.ruta, n, 10, t), djur };
}
export function fardMatslutVal(s: State, vl: Varlden, f: RadFard, t: number) {
  const l = fardMatLage(s, vl, f, t), som = { skede: f.gar === 'ut' ? 'ute' : 'hemat' } as Sallskap;
  return { l, val: MATSLUT_IDS.filter(id => MATSLUT[id]!.kan?.(l, som) ?? true).map(id => ({ id, sc: MATSLUT[id]!.sc(l) })).sort((a, b) => b.sc - a.sc) };
}
export const FARDKROK: { vand?: (s: State, vl: Varlden, f: RadFard, t: number) => void } = {}; // byhandling.ts: färden vänder hem härifrån
function fardMatslut(s: State, vl: Varlden, f: RadFard, t: number) {
  const { l, val } = fardMatslutVal(s, vl, f, t), id = val[0]?.id;
  if (!id) return;
  if (id === 'leta') f.letaHel = t + DAY;
  else if (id === 'vanda') FARDKROK.vand?.(s, vl, f, t);
  else if (id === 'slakta' && l.djur && f.last) { delete f.last.djur; f.pack![l.djur.kott] = (f.pack![l.djur.kott] ?? 0) + l.djur.m; }
  count(s, `fard matslut ${id}`);
}
