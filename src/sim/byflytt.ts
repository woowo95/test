// ---------- flytten mellan byarna (fas 11.3, Flera samhällen: Flytten, nya byar och undergången) ----------
// Flytten (steg 11.3.5): ur en by i världen flyttar folk med huvudbyns regler för trängsel och hunger (emigrationRate och
// hungerFlyttAv i liv.ts, med ett neutralt humör), räknat en gång i timmen (ungefär 15 dagar i spelet). De som flyttar samma
// timme går tillsammans och väljer bland byarna i grannätet inom räckhåll (FLYTT.dygn), med vikt efter trängseln där (folket
// delat med bärkraften), avståndet och relationen till byn (byrel.ts). Huvudbyn är en av dem. De kommer fram när restiden till
// fots har gått (kön, varldslag.ts): till en by i världen läggs de till folket, och till huvudbyn kommer var och en som en
// främling (framling i liv.ts), som byn tar emot eller visar bort; den som visas bort går hem igen. Varje flytt är ett släktband
// mellan byarna.
//
// Nya byar (steg 11.3.7): en grupp som flyttar kan i stället grunda en egen by på den närmaste lediga byplatsen inom räckhåll.
// Chansen (NYBY.chans) växer med gruppens storlek (fullt från NYBY.grupp) och moderbyns (fullt från NYBY.moder). Den nya byn
// minns sin moderby (raden.fran, ett släktband i byrel.ts), tar med sig sin del av maten och kan en del av moderbyns tekniker
// (NYBY.tek av var och en, och bara det vars krav den kan). Världens krönika får raden Delad.
// Splittringen (steg 11.3.12): andelen i moderbyn med en annan tro än byns höjer chansen (NYBY.tro); de som har den tron går
// med gruppen och den nya byn får den, annars tar gruppen med sig moderbyns tro.
//
// Undergången (steg 11.3.8): en by utan folk går under. Raden och platsen blir en ruin, och det som fanns kvar blir hela saker
// (raden.kvar): silvret, och en del av rikedomen (RUIN.kvar) som saker byn kunde göra, valda med världens slump efter
// grundvärdet. Maten ruttnar. Världens krönika får raden Gått under, och huvudbyn förlorar sin förbindelse med byn.
import { balans } from './balans';
import { mots, nyttSlaktband, relation, grundlage } from './byrel';
import { emigrationRate, hungerFlyttAv, LIV, matGottAv } from './liv';
import { barkraft, lever, matDygn, styrkaMal } from './rad';
import { BYSORTER, BysortDef, FlyttDelar, radKrok, radNr, tomTal, VarldRad } from './radtal';
import { clamp } from './slump';
import { KOHANDELSER, PERIODRADER, antalUr, laggIKo, periodSlut, varldSlump } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { MARK_IDS, VARLD, VarldMark } from './varldmark';
import { byRutor } from './placering';
import { byPlats, hinder, LANDMARKEN, laggPlats, varldPlatsNr } from './landmarken';
import { narmasteMal } from './vagval';
import { overge } from './utpost';
import { byGrannar, nyaGrannar } from './grannat';
import { varldHandelse, VarldHandelseId } from './varldkronika';
import { TEK } from './teknik';
import { SAKER } from './saker';
import { grundvarde } from './varde';
import { klanerAndrade } from './klaner';
import { ageOf, count, log } from './folk';
import { kronikaBer, personFalt } from './berattelser';
import { ALDER } from './folk';
import { och, tal } from './ord';
import { kronika } from './historik';
import { DAY, State } from './typer';

export const FLYTT = balans('flytt', {
  dygn: 3, // byarna i grannätet så här många dygns gång bort (år i spelet) eller närmare är inom räckhåll
  narDygn: 1, // en by så många dygns gång bort väger hälften så mycket som en alldeles intill
  trang: 1.5, // trängseln där (folket delat med bärkraften) väger 1,5 − trängseln, aldrig under noll
});
export const RUIN = balans('ruin', {
  kvar: 0.05, // så stor del av rikedomen blir kvar som saker i ruinen
});
export const NYBY = balans('nyby', {
  chans: 0.3, // chansen att en grupp som flyttar grundar en egen by, när gruppen och moderbyn är stora nog ...
  grupp: 4, // ... gruppen så många eller fler (färre: i proportion) ...
  moder: 30, // ... och moderbyn så många eller fler (färre: i proportion)
  tek: 0.7, // den nya byn kan så stor del av moderbyns tekniker
  tro: 2, // chansen blir 1 + så här mycket gånger andelen med en annan tro än byns gånger större (steg 11.3.12)
});
// ärendena i världens slump (timmen; rad.ts har 1–6)
const A = { flytt: 11, mal: 12, ut: 13, ny: 14, tek: 15, ruin: 16, in: 17, lager: 18 };
const platsAv = (vl: Varlden, r: VarldRad) => { const p = byPlats(vl, r.nr); return p?.k === 'by' ? p : undefined; };
// platsen folk flyttar ifrån: byn, eller lägret (ett läger i nöd ger sig av som en by, steg B.69)
const hemPlats = (vl: Varlden, r: VarldRad) => platsAv(vl, r) ?? (r.sort === 'rovarlager' ? byPlats(vl, r.nr) : undefined);

// hur gott byn har det (0–1): maten, och nöden efter en plundring (steg 15.1.76), som driver folk ut som hungern gör
export const radGott = (r: VarldRad) => matGottAv(matDygn(r)) * (1 - (r.nod ?? 0));
// hur många som vill flytta ur raden per dygn (ett år i spelet): trängseln och hungern, med huvudbyns regler
export const flyttPerDygn = (r: VarldRad) => emigrationRate(r.tal.folk, LIV.nojd) + hungerFlyttAv(radGott(r), r.tal.folk);
// så stor del av dem som flyttar gör det för hungern och nöden (0 till 1)
export const hungerDel = (r: VarldRad) => { const a = flyttPerDygn(r); return a > 0 ? hungerFlyttAv(radGott(r), r.tal.folk) / a : 0; };
// nöden efter en plundring (steg 15.1.76): det som togs och de som dödades, som andel av det byn hade och dess folk, läggs till
// nöden som finns; den går över per tid (ROVLAGER.nodDygn), en gång i timmen i flytten
export function plundradNod(r: VarldRad, togVarde:7 extends 7 ? number : never, hadeVarde: number, doda: number) {
  const v = Math.min(1, togVarde / Math.max(1, hadeVarde) + doda / Math.max(1, r.tal.folk + doda));
  if (v > 0) r.nod = 1 - (1 - (r.nod ?? 0)) * (1 - v);
}

// rövarlägret (steg 11.6.17): de som flyttar för hunger kan slå läger som rövare i stället för att söka sig till en by, och
// hungriga ur byarna intill dras dit; så också den som lämnar huvudbyn i missnöje eller utvisas ur den (steg B.68); lägret skaffar ingen egen mat och föder inga barn (BYSORTER), så det lever på det
// flocken tar (plundringen i byhandling.ts) och löses upp när folket är slut
export const ROVLAGER = balans('rovarlager', {
  chans: 0.5, // chansen att en grupp som flyttar slår läger som rövare, gånger lusten (lagerLust)
  dras: 0.6, // ett läger inom räckhåll väger så här mycket för den som flyttar, gånger lusten
  missnoje: 0.5, // missnöjets del av flytten räknas så här mycket mot hungerns (ur huvudbyn, steg B.68)
  lockByte: 1, // lägret väger 1 + så mycket gånger hur mycket bättre ställt det är än byn man lämnar (−1 till 1, lagerByte), steg B.69
  fredlos: 0.5, // chansen att den utvisade slår läger
  nodDygn: 1, // nöden efter en plundring går över: den sjunker till en tredjedel (1/e) på så många dygn (år i spelet), steg 15.1.76
});
// hur bytet lockar (steg B.69): lägrets mat och rikedom per person mot byns, där lika är 1 och bara det ena ställets är hela vägen
const battre = (a: number, b: number) => a + b > 0 ? (a - b) / (a + b) : 0;
export const lagerByte = (l: VarldRad, r: VarldRad) => {
  const per = (q: VarldRad) => q.tal.rikedom / Math.max(1, q.tal.folk);
  return Math.max(0, 1 + ROVLAGER.lockByte * (battre(matDygn(l), matDygn(r)) + battre(per(l), per(r))) / 2);
};
// raderna i världen har inget humör, så där är det bara hungern
const radDelar = (r: VarldRad): FlyttDelar => ({ hunger: hungerDel(r) });
// hur mycket det de flyttar för drar dem till rövarna (0 till 1): hungern, missnöjet, och den utvisade helt
export const lagerLust = (d: FlyttDelar) => d.fredlos ? 1 : Math.min(1, d.hunger + ROVLAGER.missnoje * (d.missnoje ?? 0));
export const lagerChans = (r: VarldRad, d = radDelar(r)) => d.fredlos ? ROVLAGER.fredlos : ROVLAGER.chans * lagerLust(d);
// mätningen (npm run strid): folket som går till ett läger, varifrån och varför
export const lagerProv: { kom?: (vl: Varlden, lager: VarldRad, fran: VarldRad, n: number, skal: LagerSkal) => void } = {};
export type LagerSkal = 'hunger' | 'missnoje' | 'fredlos';
const lagerSkal = (d: FlyttDelar): LagerSkal => d.fredlos ? 'fredlos' : d.hunger >= ROVLAGER.missnoje * (d.missnoje ?? 0) ? 'hunger' : 'missnoje';

// byarna inom räckhåll från raden, med vikten för den som flyttar dit
export function flyttMal(vl: Varlden, v: VarldMark | undefined, r: VarldRad, d = radDelar(r)): { r: VarldRad; dygn: number; vikt: number }[] {
  const ut: { r: VarldRad; dygn: number; vikt: number }[] = [];
  for (const g of hemPlats(vl, r)?.grannar ?? []) {
    if (g.dygn > FLYTT.dygn) continue;
    const p = varldPlatsNr(vl, g.nr), m = radNr(vl, p?.by);
    if (!m || m.nr === r.nr || !BYSORTER[m.sort].folk || (m.tal.folk <= 0 && m.nr !== vl.huvud)) continue;
    if (m.nr === vl.huvud && !r.syn) continue; // till huvudbyn flyttar den som har en förbindelse dit
    const tr = clamp(FLYTT.trang - m.tal.folk / Math.max(1, barkraft(v, m)), 0, FLYTT.trang);
    const rel = relation(vl, r.nr, m.nr) ?? grundlage(vl, r.nr, m.nr);
    const vikt = tr * (1 + rel / 100) / 2 / (1 + g.dygn / FLYTT.narDygn);
    if (vikt > 0) ut.push({ r: m, dygn: g.dygn, vikt });
  }
  // rövarlägren inom räckhåll (lägrets grannät går till byarna omkring), för den som flyttar för hunger, missnöje eller är utvisad
  const hem = hemPlats(vl, r), lust = lagerLust(d);
  if (hem && lust > 0) for (const m of vl.rader ?? []) {
    if (m.sort !== 'rovarlager' || m.tal.folk <= 0 || m.nr === r.nr) continue;
    const g = byPlats(vl, m.nr)?.grannar?.find(q => q.nr === hem.nr);
    if (g && g.dygn <= FLYTT.dygn) ut.push({ r: m, dygn: g.dygn, vikt: lust * ROVLAGER.dras * lagerByte(m, r) / (1 + g.dygn / FLYTT.narDygn) });
  }
  return ut;
}

// chansen att gruppen grundar en egen by, när moderbyn ännu har dem kvar
// (steg 11.3.12): gånger 1 + NYBY.tro gånger andelen i byn med en annan tro än byns, högst 1
export const nyChans = (r: VarldRad, grupp: number) => Math.min(1, NYBY.chans * Math.min(1, grupp / NYBY.grupp) * Math.min(1, r.tal.folk / NYBY.moder) * (1 + NYBY.tro * (r.tro?.annan?.andel ?? 0) / 100)); // r.tal.folk: moderbyn innan de går
// tron i den nya byn (steg 11.3.12): har moderbyn en annan tro går de som har den med gruppen, så många som ryms, och den nya
// byn får den tron; annars tar gruppen med sig moderbyns tro. Andelarna räknas i hela personer
function delaTro(r: VarldRad, ny: VarldRad, grupp: number) {
  const t = r.tro;
  if (!t) return;
  const fore = r.tal.folk + grupp, a = t.annan;
  const troende = a ? Math.round(a.andel / 100 * fore) : 0, med = Math.min(grupp, troende);
  if (!a || !med) { ny.tro = { namn: t.namn, andel: t.andel, krig: t.krig }; return; }
  ny.tro = { namn: a.namn, andel: Math.round(100 * med / grupp), krig: a.krig };
  const kvar = troende - med;
  if (kvar > 0 && r.tal.folk > 0) a.andel = Math.round(100 * kvar / r.tal.folk); else delete t.annan;
}
// byrutorna i världen (marken och vattnet) och rutorna där ett rövarläger får ligga (räknas en gång per värld)
const rutor = new WeakMap<VarldMark, number[]>(), lagerRutor = new WeakMap<VarldMark, number[]>();
const rutorFor = (v: VarldMark, k: 'by' | 'rovarlager') => {
  const m = k === 'by' ? rutor : lagerRutor;
  let alla = m.get(v);
  if (!alla) {
    if (k === 'by') alla = byRutor(v);
    else { const mk = LANDMARKEN.rovarlager.mark as readonly string[]; alla = []; for (let i = 0; i < v.w * v.h; i++) if (mk.includes(MARK_IDS[v.mark[i]])) alla.push(i); }
    m.set(v, alla);
  }
  return alla;
};
// gruppen ur raden r slår sig ner på den närmaste lediga platsen av sorten k inom räckhåll, med sin del av maten (kodgenomgången,
// fynd 184: byn och lägret på samma sätt); gor ger den nya raden det som skiljer (teknikerna, tron, styrkan) innan den läggs
// in. undefined om ingen plats finns
function utflytt(s: State, vl: Varlden, r: VarldRad, grupp: number, t: number, k: 'by' | 'rovarlager', gor: (ny: VarldRad) => void, handelse: VarldHandelseId, matMed?: number): VarldRad | undefined {
  const v = varldMark(s), hem = hemPlats(vl, r);
  if (!v || !hem) return undefined;
  const alla = rutorFor(v, k);
  // bara rutorna inom räckhåll: varje steg kostar minst 1, så en ruta längre bort i x eller y än räckhållet nås inte
  const nar = FLYTT.dygn * VARLD.gangPerDygn, inom = (i: number) => Math.abs(i % v.w - hem.x) <= nar && Math.abs(Math.floor(i / v.w) - hem.y) <= nar;
  const lediga = new Set(alla.filter(i => inom(i) && !hinder(vl, v, k, i % v.w, Math.floor(i / v.w))));
  const [f] = narmasteMal(vl, v, hem.y * v.w + hem.x, lediga, 1, 'fots');
  if (!f || f.kostnad / VARLD.gangPerDygn > FLYTT.dygn) return undefined;
  const p = laggPlats(vl, v, k, f.till % v.w, Math.floor(f.till / v.w), t);
  if (!p) return undefined;
  const nr = vl.nastaRad = (vl.nastaRad ?? 0) + 1;
  const mat = matMed ?? Math.min(r.tal.mat, Math.round(r.tal.mat * grupp / Math.max(1, r.tal.folk + grupp))); // sin del av maten; ur huvudbyn det de bar
  if (matMed === undefined) r.tal.mat -= mat;
  const ny: VarldRad = { nr, sort: k, namn: p.namn, x: p.x, y: p.y, grundad: t, fran: r.nr, t, tal: { ...tomTal(), folk: grupp, mat }, tek: [], fasta: [] };
  gor(ny);
  vl.rader!.push(ny);
  p.by = nr;
  if (k === 'by') nyaGrannar(vl, v, [p, hem], t); // en väg går åt båda hållen (steg 15.1.142)
  else p.grannar = byGrannar(vl, v, p, t);
  mots(vl, r.nr, nr);
  varldHandelse(vl, handelse, t, { by: r.nr, mot: nr });
  return ny;
}
// gruppen grundar en ny by på den närmaste lediga byplatsen inom räckhåll; undefined om ingen finns
export const nyBy = (s: State, vl: Varlden, r: VarldRad, grupp: number, t: number) => utflytt(s, vl, r, grupp, t, 'by', ny => {
  // teknikerna: var och en med chansen NYBY.tek, och bara det vars krav den nya byn kan (i moderbyns ordning, kraven först)
  r.tek.forEach((id, j) => { if (varldSlump(vl, ny.nr, j, A.tek) < NYBY.tek && (TEK[id]?.krav ?? []).every(k => ny.tek.includes(k))) ny.tek.push(id); });
  delaTro(r, ny, grupp);
}, 'delad');
// gruppen slår läger som rövare på den närmaste lediga platsen inom räckhåll; undefined om ingen finns
export const nyttLager = (s: State, vl: Varlden, r: VarldRad, grupp: number, t: number, skal: LagerSkal = 'hunger', matMed?: number) => utflytt(s, vl, r, grupp, t, 'rovarlager', ny => {
  ny.tek = [...r.tek];
  ny.tal.styrka = styrkaMal(ny); // de som ger sig av är de som orkar
  lagerProv.kom?.(vl, ny, r, grupp, skal);
}, ({ hunger: 'lager', missnoje: 'lagerMissnoje', fredlos: 'lagerFredlos' } as const)[skal], matMed);

// en timme: de som flyttar ur raden grundar en egen by eller ger sig av tillsammans mot en by
export function radFlytt(s: State, vl: Varlden, r: VarldRad, n: number) {
  if (r.nod) { r.nod *= Math.exp(-1 / 24 / ROVLAGER.nodDygn); if (r.nod < 0.01) delete r.nod; } // nöden går över, en timme i taget
  const ant = Math.min(r.tal.folk, antalUr(flyttPerDygn(r) / 24, varldSlump(vl, r.nr, n, A.flytt)));
  if (!ant) return;
  if (varldSlump(vl, r.nr, n, A.lager) < lagerChans(r)) {
    r.tal.folk -= ant;
    if (nyttLager(s, vl, r, ant, periodSlut(vl, 'timme', n))) return;
    r.tal.folk += ant; // ingen ledig plats: de gör som de andra
  }
  if (varldSlump(vl, r.nr, n, A.ny) < nyChans(r, ant)) {
    r.tal.folk -= ant;
    if (nyBy(s, vl, r, ant, periodSlut(vl, 'timme', n))) return;
    r.tal.folk += ant; // ingen ledig plats inom räckhåll: de flyttar till en by
  }
  const mal = flyttMal(vl, varldMark(s), r);
  const sum = mal.reduce((a, m) => a + m.vikt, 0);
  if (!sum) return; // ingen by inom räckhåll: de stannar
  let x = varldSlump(vl, r.nr, n, A.mal) * sum, val = mal[mal.length - 1];
  for (const m of mal) { x -= m.vikt; if (x < 0) { val = m; break; } }
  r.tal.folk -= ant;
  if (val.r.sort === 'rovarlager') lagerProv.kom?.(vl, val.r, r, ant, 'hunger');
  mots(vl, r.nr, val.r.nr);
  laggIKo(vl, periodSlut(vl, 'timme', n) + val.dygn * DAY, 'flytt', { sak: val.r.nr, data: { fran: r.nr, n: ant } });
}

// de som lämnar huvudbyn (emigrate i liv.ts) väljer en by i världen på samma sätt och kommer fram efter restiden; slumpen är
// världens (huvudbyns nummer och tiden). o: varför de går (steg B.68): de kan slå läger som rövare eller söka sig till ett
radKrok.utflytt = (s, n, o) => {
  const vl = s.varld, h = vl?.rader?.find(r => r.nr === vl.huvud);
  if (!vl || !h || n <= 0) return;
  const d = o?.delar ?? radDelar(h), tid = Math.floor(s.now / 1000), skal = lagerSkal(d);
  if (o && varldSlump(vl, h.nr, tid, A.lager) < lagerChans(h, d)) {
    const ny = nyttLager(s, vl, h, n, s.now, skal, Math.floor(o.mat));
    if (ny) { // krönikan säger varför, med skälet till att hen gick (B.42)
      const p = o.med[0], barn = o.med.filter(q => ageOf(q, s.now) < ALDER.vuxen).length;
      const vem = och(o.med.filter(q => ageOf(q, s.now) >= ALDER.vuxen).map(q => q.name)) + (barn ? ` med ${barn === 1 ? 'ett barn' : `${tal(barn)} barn`}` : '');
      kronikaBer(s, 'k_rovlager', p.id, { ...personFalt(p), vem, lager: ny.namn, skal: p.flyttSkal?.text ?? '', fredlos: skal === 'fredlos', fler: o.med.length > 1 }); // en ensam slår läger, flera samlas (steg 15.1.116)
      count(s, 'lagerAvBybor', n);
      return;
    }
  }
  const mal = flyttMal(vl, varldMark(s), h, d).filter(m => m.r.nr !== vl.huvud), sum = mal.reduce((a, m) => a + m.vikt, 0);
  if (!sum) return; // ingen by inom räckhåll: de söker lyckan längre bort
  let x = varldSlump(vl, h.nr, tid, A.ut) * sum, val = mal[mal.length - 1];
  for (const m of mal) { x -= m.vikt; if (x < 0) { val = m; break; } }
  if (val.r.sort === 'rovarlager') { lagerProv.kom?.(vl, val.r, h, n, skal); count(s, 'tillLager', n); }
  mots(vl, h.nr, val.r.nr);
  laggIKo(vl, s.now + val.dygn * DAY, 'flytt', { sak: val.r.nr, data: { fran: h.nr, n } });
};
// nybyggarna till huvudbyn (immigrate i liv.ts) kommer ur en by i grannätet inom räckhåll som har fler än de n som går, oftare
// ur en by nära (steg 11.6.13); finns ingen sådan by kommer ingen
radKrok.nybyggare = (s, n) => {
  const vl = s.varld, h = vl?.rader?.find(r => r.nr === vl.huvud);
  if (!vl || !h) return undefined;
  const fran: { r: VarldRad; vikt: number }[] = [];
  for (const g of platsAv(vl, h)?.grannar ?? []) {
    if (g.dygn > FLYTT.dygn) continue;
    const m = radNr(vl, varldPlatsNr(vl, g.nr)?.by);
    if (m && m.nr !== h.nr && BYSORTER[m.sort].folk && m.tal.folk > n) fran.push({ r: m, vikt: 1 / (1 + g.dygn / FLYTT.narDygn) });
  }
  const sum = fran.reduce((a, m) => a + m.vikt, 0);
  if (!sum) return null;
  let x = varldSlump(vl, h.nr, Math.floor(s.now / 1000), A.in) * sum, val = fran[fran.length - 1];
  for (const m of fran) { x -= m.vikt; if (x < 0) { val = m; break; } }
  val.r.tal.folk -= n;
  mots(vl, val.r.nr, h.nr); nyttSlaktband(vl, val.r.nr, h.nr);
  return val.r;
};
// de som flyttade kommer fram: till en by i världen läggs de till folket, till huvudbyn kommer var och en som en främling
KOHANDELSER.flytt = (_s, vl, p) => {
  const fran = p.data!.fran, n = p.data!.n, m = radNr(vl, p.sak!);
  nyttSlaktband(vl, fran, p.sak!);
  if (p.sak === vl.huvud) { for (let i = 0; i < n; i++) (vl.tillHuvud ??= []).push(fran); return; }
  if (m && BYSORTER[m.sort].folk) m.tal.folk += n;
  else { const hem = radNr(vl, fran); if (hem) hem.tal.folk += n; } // byn finns inte längre: de går hem igen
};

// saker som kan finnas kvar i en ruin: det byn kunde göra och som har ett värde
const RUINSAKER = (r: VarldRad) => r.tek.filter(id => SAKER[id] && grundvarde(id) >= 0.5 && id !== 'kompost');
// byn går under: raden och platsen blir en ruin med det som fanns kvar i hela saker
export function undergang(s: State, vl: Varlden, r: VarldRad, t: number) {
  const kvar: Record<string, number> = {};
  if (r.tal.silver > 0) kvar.silver = r.tal.silver;
  const saker = RUINSAKER(r);
  let varde = r.tal.rikedom * RUIN.kvar;
  for (let i = 0; saker.length && i < 1000; i++) {
    const id = saker[Math.floor(varldSlump(vl, r.nr, i, A.ruin) * saker.length)], v = grundvarde(id);
    if (v > varde) break;
    varde -= v; kvar[id] = (kvar[id] ?? 0) + 1;
  }
  r.sort = 'ruin'; r.tal = tomTal(); r.t = t; delete r.varor; delete r.hus; delete r.egen;
  r.tek = []; // utan folk kan ingen något
  if (Object.keys(kvar).length) { r.kvar = kvar; r.kvarT = t; }
  delete r.ledare;
  const p = platsAv(vl, r);
  if (p) p.k = 'ruin';
  varldHandelse(vl, 'gattUnder', t, { by: r.nr });
  if (r.syn) { // huvudbyn hör det och förlorar förbindelsen
    const text = `${r.namn} finns inte längre. Byn har gått under och är en ruin.`;
    log(s, text, 'world'); kronika(s, text, 'utflytt');
    klanerAndrade(s);
  }
}

// rövarlägret löses upp när folket är slut: platsen försvinner från kartan, och raden finns kvar för krönikan
export function lagerUpplost(vl: Varlden, r: VarldRad, t: number) {
  r.t = t; r.tal = tomTal(); delete r.varor; delete r.ledare;
  r.tek = []; // utan folk kan ingen något
  const p = byPlats(vl, r.nr);
  if (p) vl.platser = vl.platser!.filter(q => q !== p);
  varldHandelse(vl, 'upplost', t, { by: r.nr });
}

// varje timme, efter maten: flytten ur varje by i världen som lever efter radens regler
PERIODRADER.push({ namn: 'flytten', period: 'timme', fn: (s, vl, n) => { for (const r of [...vl.rader ?? []]) if (lever(vl, r)) radFlytt(s, vl, r, n); } });
// varje timme, sist: en by utan folk går under (huvudbyn grundas på nytt i stället, liv.ts)
PERIODRADER.push({ namn: 'undergången', period: 'timme', fn: (s, vl, n) => { for (const r of vl.rader ?? []) {
  if (r.nr === vl.huvud || r.tal.folk > 0) continue;
  if (r.sort === 'by') undergang(s, vl, r, periodSlut(vl, 'timme', n));
  else if ((BYSORTER[r.sort] as BysortDef).slut === 'folk' && byPlats(vl, r.nr)) lagerUpplost(vl, r, periodSlut(vl, 'timme', n));
  else if ((BYSORTER[r.sort] as BysortDef).slut && byPlats(vl, r.nr)) overge(s, vl, r, periodSlut(vl, 'timme', n)); // en utpost eller ett handelsläger där alla dött
} } });
