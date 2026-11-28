// ---------- utposten och handelslägret (steg 11.6.18, Flera samhällen: Raden i tal) ----------
// Två tillfälliga rader med folk ur en by. Utposten utvinner en naturresurs: en by i världen som har en fyndplats inom räckhåll
// skickar några av sitt folk dit när det den bryter är värt mer än arbetet de gör hemma. Utposten skaffar sin egen mat men föder
// inga barn (BYSORTER), och det den bryter (hela saker ur fyndplatsens innehåll, FYNDINNE) läggs i moderbyns förråd. Den finns
// så länge resursen och moderbyn finns: när fyndplatsen är tom går folket hem och platsen försvinner, och när moderbyn är borta
// flyttar folket till en by intill. Handelslägret slås upp av en by med ett stort överskott och flera byar inom räckhåll: några
// handlare bär överskottet dit och har mat för tiden lägret står, och sällskap ur huvudbyn kan resa dit och handla (RESMAL i
// resa.ts). Lägret bryts upp vid sin tid, och handlarna bär hem det som är kvar. Båda räknas en gång om dygnet (ett år i
// spelet) för grundandet och en gång i timmen för brytningen.
import { balans } from './balans';
import { mots } from './byrel';
import { count } from './folk';
import { byGrannar } from './grannat';
import { byPlats, hinder, LandmarkId, LANDMARKEN, laggPlats, varldPlatsNr, VarldPlats } from './landmarken';
import { radHar, radLaggTill, radOverskott, radRikedomUr, radVaror, sakGrupp, VARUGRUPP_IDS } from './priser';
import { lever, portionerPerDygn, styrkaMal } from './rad';
import { radNr, tomTal, VarldRad } from './radtal';
import { grundvarde } from './varde';
import { varldHandelse } from './varldkronika';
import { KOHANDELSER, PERIODRADER, antalUr, laggIKo, periodSlut, varldSlump } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { MARK_IDS, MarkId, VarldMark } from './varldmark';
import { narmasteMal } from './vagval';
import { DAY, State } from './typer';
import { taBortPlats as glomsPlats } from './ort';

export const UTPOST = balans('utpost', {
  folk: 3, // så många går till en utpost
  minFolk: 15, // byn har minst så många innan den skickar folk
  rutor: 8, // fyndplatser så här många världsrutor bort eller närmare är inom räckhåll
  perDygn: 2, // hela saker varje person bryter per dygn (ett år i spelet)
  arbete: 1.5, // det en person gör hemma per dygn, i grundvärde (det utposten ska slå)
  chans: 0.3, // chansen per dygn att en by som tjänar på en utpost skickar folk dit
});
export const HLAGER = balans('handelslager', {
  varde: 120, // byn slår upp ett läger när överskottet är värt så mycket (i grundvärde) ...
  grannar: 2, // ... och den har så många byar i sitt grannät
  chans: 0.15, // chansen per dygn då, gånger överskottet delat med varde (högst 2)
  folk: 3, // så många handlare går med
  dygn: 4, // lägret står så många dygn (år i spelet)
  andel: 0.5, // så stor del av överskottet i varje grupp bärs dit
});
// fyndplatsens innehåll efter marken: saken och hur många (i hela saker), slaget ur platsens frö första gången det behövs
export const FYNDINNE: Partial<Record<MarkId, { sak: string; n: [number, number] }>> = {
  berg: { sak: 'flinta', n: [40, 120] },
  slatt: { sak: 'salt', n: [20, 60] },
  skog: { sak: 'flinta', n: [20, 60] },
  tat: { sak: 'flinta', n: [20, 60] },
  myr: { sak: 'lera', n: [40, 120] },
};
// ärendena i världens slump
const A = { grunda: 41, val: 42, bryt: 43, hl: 44 };

// platsens innehåll (fyndplatsen): räknas ur platsens frö första gången
export function fyndInne(v: VarldMark | undefined, p: VarldPlats): Record<string, number> {
  if (p.inne) return p.inne;
  const f = v ? FYNDINNE[MARK_IDS[v.mark[p.y * v.w + p.x]]] : undefined;
  const r = (p.fro % 1000) / 1000;
  return p.inne = f ? { [f.sak]: Math.round(f.n[0] + r * (f.n[1] - f.n[0])) } : {};
}
const innehall = (p: VarldPlats) => Object.values(p.inne ?? {}).reduce((a, n) => a + (n ?? 0), 0);
// den närmaste lediga rutan för en plats av sorten k från rutan a, inom n världsrutor
function ledigRuta(vl: Varlden, v: VarldMark, k: LandmarkId, ax: number, ay: number, n: number): number | undefined {
  const mk = LANDMARKEN[k].mark as readonly string[], fria = new Set<number>();
  for (let y = Math.max(0, ay - n); y <= Math.min(v.h - 1, ay + n); y++) for (let x = Math.max(0, ax - n); x <= Math.min(v.w - 1, ax + n); x++) {
    const i = y * v.w + x;
    if (mk.includes(MARK_IDS[v.mark[i]]) && !hinder(vl, v, k, x, y)) fria.add(i);
  }
  return narmasteMal(vl, v, ay * v.w + ax, fria, 1, 'fots')[0]?.till;
}
// en ny rad med folk ur byn r på platsen p
function nyRad(vl: Varlden, v: VarldMark, r: VarldRad, p: VarldPlats, sort: 'utpost' | 'handelslager', folk: number, t: number): VarldRad {
  const nr = vl.nastaRad = (vl.nastaRad ?? 0) + 1;
  r.tal.folk -= folk;
  const ny: VarldRad = { nr, sort, namn: p.namn, x: p.x, y: p.y, grundad: t, fran: r.nr, t, tal: { folk, mat: 0, rikedom: 0, silver: 0, styrka: 0, kraft: 0 }, tek: [...r.tek], fasta: [] };
  ny.tal.styrka = styrkaMal(ny);
  vl.rader!.push(ny);
  p.by = nr; p.grannar = byGrannar(vl, v, p, t);
  mots(vl, r.nr, nr);
  return ny;
}

// ---- utposten ----
// fyndplatserna inom räckhåll från byn r som har något kvar och ingen utpost
function kallor(vl: Varlden, v: VarldMark, r: VarldRad): VarldPlats[] {
  const tagna = new Set((vl.rader ?? []).filter(q => q.sort === 'utpost' && q.tal.folk > 0 && q.kalla !== undefined).map(q => q.kalla!));
  return (vl.platser ?? []).filter(p => p.k === 'fyndplats' && r.x !== undefined && r.y !== undefined && Math.max(Math.abs(p.x - r.x), Math.abs(p.y - r.y)) <= UTPOST.rutor && !tagna.has(p.nr) && (fyndInne(v, p), innehall(p)) > 0);
}
// det en utpost vid fyndplatsen p ger byn per dygn utöver arbetet hemma, i grundvärde
export function utpostVinst(v: VarldMark | undefined, p: VarldPlats): number {
  const inne = fyndInne(v, p), [sak] = Object.keys(inne);
  return sak ? UTPOST.folk * (UTPOST.perDygn * grundvarde(sak) - UTPOST.arbete) : -1;
}
// byn r skickar folk till en fyndplats; undefined om ingen plats finns
export function nyUtpost(s: State, vl: Varlden, r: VarldRad, p: VarldPlats, t: number): VarldRad | undefined {
  const v = varldMark(s);
  if (!v || r.tal.folk < UTPOST.minFolk) return undefined;
  const i = ledigRuta(vl, v, 'utpost', p.x, p.y, 6);
  const q = i !== undefined ? laggPlats(vl, v, 'utpost', i % v.w, Math.floor(i / v.w), t) : undefined;
  if (!q) return undefined;
  const u = nyRad(vl, v, r, q, 'utpost', UTPOST.folk, t);
  u.kalla = p.nr;
  const mat = Math.min(r.tal.mat, Math.round(r.tal.mat * UTPOST.folk / Math.max(1, r.tal.folk + UTPOST.folk))); // sin del av maten
  r.tal.mat -= mat; u.tal.mat = mat;
  varldHandelse(vl, 'utpost', t, { by: r.nr, mot: u.nr, plats: p.nr });
  count(s, 'utpost_ny');
  return u;
}
// en gång om dygnet: varje by som tjänar på en utpost vid en fyndplats inom räckhåll skickar folk dit med chansen UTPOST.chans
export function grundaUtposter(s: State, vl: Varlden, n: number) {
  const v = varldMark(s);
  if (!v) return;
  for (const r of [...vl.rader ?? []]) {
    if (r.sort !== 'by' || !lever(vl, r) || r.tal.folk < UTPOST.minFolk) continue;
    if ((vl.rader ?? []).some(q => q.sort === 'utpost' && q.fran === r.nr && q.tal.folk > 0)) continue; // byn har redan en
    if (varldSlump(vl, r.nr, n, A.grunda) >= UTPOST.chans) continue;
    let bast: VarldPlats | undefined, b = 0;
    for (const p of kallor(vl, v, r)) { const x = utpostVinst(v, p); if (x > b) { b = x; bast = p; } }
    if (bast) nyUtpost(s, vl, r, bast, periodSlut(vl, 'dygn', n));
  }
}
// en timme: utposten bryter ur fyndplatsen och lägger det i moderbyns förråd; tom fyndplats eller ingen moderby: den överges
export function utpostTimme(s: State, vl: Varlden, u: VarldRad, n: number) {
  const t = periodSlut(vl, 'timme', n), moder = radNr(vl, u.fran), kalla = u.kalla !== undefined ? varldPlatsNr(vl, u.kalla) : undefined;
  if (!moder || !lever(vl, moder)) { overge(s, vl, u, t); return; }
  const inne = kalla ? fyndInne(varldMark(s), kalla) : {}, [sak] = Object.keys(inne).filter(k => (inne[k] ?? 0) > 0);
  if (!kalla || !sak) { if (kalla) taBortPlats(vl, kalla); overge(s, vl, u, t); return; }
  const m = Math.min(inne[sak], antalUr(u.tal.folk * UTPOST.perDygn / 24, varldSlump(vl, u.nr, n, A.bryt)));
  if (m <= 0) return;
  inne[sak] -= m;
  radLaggTill(moder, sakGrupp(sak), Math.round(m * grundvarde(sak))); // hela värden (radens tal är hela)
  count(s, 'utpost_brutet', m);
  if (inne[sak] <= 0 && innehall(kalla) <= 0) { taBortPlats(vl, kalla); overge(s, vl, u, t); }
}

// ---- handelslägret ----
// det byn r har över (utom maten), i grundvärde
export const overskottVarde = (r: VarldRad) => VARUGRUPP_IDS.reduce((a, g) => a + (g === 'mat' ? 0 : Math.max(0, radOverskott(r, g))), 0);
// byn r slår upp ett handelsläger nära sig; undefined om ingen plats finns
export function nyttHandelslager(s: State, vl: Varlden, r: VarldRad, t: number): VarldRad | undefined {
  const v = varldMark(s), hem = byPlats(vl, r.nr);
  if (!v || !hem || r.tal.folk <= HLAGER.folk) return undefined;
  const i = ledigRuta(vl, v, 'handelslager', hem.x, hem.y, 8);
  const q = i !== undefined ? laggPlats(vl, v, 'handelslager', i % v.w, Math.floor(i / v.w), t, { till: t + HLAGER.dygn * DAY }) : undefined;
  if (!q) return undefined;
  const h = nyRad(vl, v, r, q, 'handelslager', HLAGER.folk, t);
  const varor = radVaror(h), rv = radVaror(r);
  for (const g of VARUGRUPP_IDS) {
    if (g === 'mat') continue;
    const m = Math.floor(Math.max(0, radOverskott(r, g)) * HLAGER.andel);
    if (m > 0) { rv[g] = (rv[g] ?? 0) - m; varor[g] = (varor[g] ?? 0) + m; }
  }
  r.tal.rikedom = radRikedomUr(r); h.tal.rikedom = radRikedomUr(h);
  const mat = Math.min(r.tal.mat, Math.ceil(HLAGER.folk * HLAGER.dygn * portionerPerDygn())); // maten för tiden lägret står
  r.tal.mat -= mat; h.tal.mat = mat;
  laggIKo(vl, q.till!, 'handelslagerSlut', { sak: h.nr });
  varldHandelse(vl, 'handelslager', t, { by: r.nr, mot: h.nr });
  count(s, 'handelslager_ny');
  return h;
}
// en gång om dygnet: en by med stort överskott och flera grannar slår upp ett handelsläger
export function grundaHandelslager(s: State, vl: Varlden, n: number) {
  for (const r of [...vl.rader ?? []]) {
    if (r.sort !== 'by' || !lever(vl, r) || (byPlats(vl, r.nr)?.grannar?.length ?? 0) < HLAGER.grannar) continue;
    if ((vl.rader ?? []).some(q => q.sort === 'handelslager' && q.fran === r.nr && q.tal.folk > 0)) continue;
    const ov = overskottVarde(r);
    if (ov < HLAGER.varde || varldSlump(vl, r.nr, n, A.hl) >= HLAGER.chans * Math.min(2, ov / HLAGER.varde)) continue;
    nyttHandelslager(s, vl, r, periodSlut(vl, 'dygn', n));
  }
}

// ---- gemensamt: raden överges ----
function taBortPlats(vl: Varlden, p: VarldPlats) { vl.platser = (vl.platser ?? []).filter(q => q !== p); }
// folket och det raden har går hem till byn den kom ur (eller till en by intill om den är borta), platsen försvinner (byn minns
// den tills någon sett att den är borta, steg 12.1.146) och raden finns kvar för krönikan
export function overge(s: State, vl: Varlden, u: VarldRad, t: number) {
  const p = byPlats(vl, u.nr), hem = radNr(vl, u.fran);
  let mal = hem && lever(vl, hem) ? hem : undefined, dygn = p?.grannar?.find(g => varldPlatsNr(vl, g.nr)?.by === mal?.nr)?.dygn;
  if (!mal) { const g = p?.grannar?.find(x => { const m = radNr(vl, varldPlatsNr(vl, x.nr)?.by); return !!m && lever(vl, m); }); mal = g ? radNr(vl, varldPlatsNr(vl, g.nr)!.by) : undefined; dygn = g?.dygn; }
  if (mal && u.tal.folk > 0) {
    const data: Record<string, number> = { fran: u.nr, n: u.tal.folk, silver: u.tal.silver };
    for (const g of VARUGRUPP_IDS) { const m = Math.floor(radHar(u, g)); if (m > 0) data['v_' + g] = m; } // det de bär, per grupp
    laggIKo(vl, t + (dygn ?? 1) * DAY, 'hemTill', { sak: mal.nr, data });
  }
  u.t = t; u.tal = tomTal(); delete u.varor; delete u.ledare;
  u.tek = []; // utan folk kan ingen något
  if (p) glomsPlats(s, vl, p);
  varldHandelse(vl, 'upplost', t, { by: u.nr });
}
// raden tas bort ur världen (steg 12.1.146): krönikan behåller namnet, och byarnas relationer, lägen och släktband med den glöms
export function glomRad(vl: Varlden, r: VarldRad) {
  vl.rader = (vl.rader ?? []).filter(q => q !== r);
  for (const h of vl.kronika ?? []) { if (h.by === r.nr) h.byNamn = r.namn; if (h.mot === r.nr) h.motNamn = r.namn; }
  const med = (k: string) => k.split(/[>-]/).map(Number).includes(r.nr);
  for (const m of [vl.rel, vl.lage, vl.ovanligt, vl.slakt]) if (m) for (const k of Object.keys(m)) if (med(k)) delete m[k];
}
// de som går hem kommer fram med det de bär
KOHANDELSER.hemTill = (_s, vl, p) => {
  const m = radNr(vl, p.sak!), d = p.data!;
  if (!m || !lever(vl, m)) return; // byn finns inte längre
  m.tal.folk += d.n; m.tal.silver += d.silver ?? 0;
  for (const g of VARUGRUPP_IDS) if (d['v_' + g]) radLaggTill(m, g, d['v_' + g]);
};
// handelslägret bryts upp vid sin tid, och dess rad och plats tas bort ur världen (steg 12.1.146)
KOHANDELSER.handelslagerSlut = (s, vl, p) => {
  const h = radNr(vl, p.sak!);
  if (!h || h.sort !== 'handelslager') return;
  if (h.tal.folk > 0) overge(s, vl, h, p.t);
  glomRad(vl, h);
};

// varje dygn: utposter och handelsläger grundas; varje timme: utposterna bryter
PERIODRADER.push({ namn: 'utposter och handelsläger', period: 'dygn', fn: (s, vl, n) => { grundaUtposter(s, vl, n); grundaHandelslager(s, vl, n); } });
PERIODRADER.push({ namn: 'utposternas brytning', period: 'timme', fn: (s, vl, n) => { for (const u of [...vl.rader ?? []]) if (u.sort === 'utpost' && u.tal.folk > 0) utpostTimme(s, vl, u, n); } });
