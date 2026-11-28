// ---------- möten på vägen (steg 11.6.12, Flera samhällen: Vägens händelser i tal) ----------
// Två sällskap som är på samma ruta under samma period (en timme i verkligheten) möts; finns inget sällskap blir det inget möte.
// Sällskapen är huvudbyns resor (vl.sallskap, resa.ts) och byarnas färder (vl.farder, byhandling.ts). En ruta med en by räknas
// inte: där är det ett besök. Två färder från olika byar gör att byarna mött varandra (relationen börjar i grundläget). Ett
// sällskap från huvudbyn som möter en färd byter nyheter och platser: resenärerna får veta var färdens by ligger och vart den är
// på väg (ett rykte), och vad färdens by betalar för gruppen den bär. Är färden på väg hem med silver köper den det sällskapet har
// att sälja, efter sin bys pris och i hela saker; det sålda följer med färden hem till dess by. Byn hemma vet inget förrän
// resenärerna kommit hem, men färdens by minns handeln.
import { count } from './folk';
import { byHandelse, mots } from './byrel';
import { byPlats } from './landmarken';
import { larPris } from './minne';
import { larOrt, O_KANT, O_RYKTE } from './ort';
import { gruppSlag, radPaslag } from './priser';
import { BYSORTER, radNr } from './radtal';
import { dagbok, saljbar, resenarer, SAKNADKROK, Sallskap, sallskapNu, tappa } from './resa';
import { grundvarde } from './varde';
import { PERIODER, PERIODRADER, periodSlut } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { fardDit, fardSpar, RadFard } from './byhandling';
import { SEC, State, type Person } from './typer';
import { FOOD } from './saker';
import { fardMatLage } from './fardresa';
import { byFlyttVikt } from './byflytt';
import { VARLD } from './varldmark';
import { vagMellan } from './vagval';
import { matLage, matPerResenar, RESA, resBehov } from './resa';
import { stat } from './folk';

type Part = { k: 's'; sl: Sallskap; rutor: Set<number> } | { k: 'f'; f: RadFard; rutor: Set<number> };
const nyckel = (x: Part) => x.k === 's' ? `s${x.sl.id}` : `f${x.f.id}`;
const harMott = (x: Part) => x.k === 's' ? (x.sl.mott ??= []) : (x.f.mott ??= []);

export function vagMoten(s: State, vl: Varlden, n: number) {
  const v = varldMark(s);
  if (!v) return;
  const tb = periodSlut(vl, 'timme', n), ta = tb - PERIODER.timme.sek * SEC, w = v.w;
  const byar = new Set((vl.platser ?? []).filter(p => p.k === 'by').map(p => p.y * w + p.x));
  const delar: Part[] = [];
  for (const sl of sallskapNu(vl)) {
    const rutor = new Set(sl.spar ?? []);
    if (sl.ruta !== undefined && (sl.skede === 'ute' || sl.skede === 'hemat')) rutor.add(sl.ruta);
    delete sl.spar;
    for (const r of byar) rutor.delete(r);
    if (rutor.size) delar.push({ k: 's', sl, rutor });
  }
  for (const f of vl.farder ?? []) {
    const rutor = new Set(fardSpar(vl, f, ta, tb, w));
    for (const r of byar) rutor.delete(r);
    if (rutor.size) delar.push({ k: 'f', f, rutor });
  }
  for (let i = 0; i < delar.length; i++) for (let j = i + 1; j < delar.length; j++) {
    const a = delar[i], b = delar[j];
    if (a.k === 's' && b.k === 's') { if (SAKNADKROK.mots && [...a.rutor].some(r => b.rutor.has(r))) SAKNADKROK.mots(s, a.sl, b.sl, tb); continue; } // huvudbyns egna sällskap handlar inte med varandra, men den som letar hittar den saknade (steg 11.8.6)
    if (harMott(a).includes(nyckel(b)) || ![...a.rutor].some(r => b.rutor.has(r))) continue;
    harMott(a).push(nyckel(b)); harMott(b).push(nyckel(a));
    if (a.k === 'f' && b.k === 'f') { if (a.f.fran !== b.f.fran) mote2(s, vl, a.f, b.f); }
    else mote(s, vl, a.k === 's' ? a.sl : (b as { sl: Sallskap }).sl, a.k === 'f' ? a.f : (b as { f: RadFard }).f, tb);
  }
}
// två färder från olika byar möts: byarna har mött varandra
function mote2(s: State, vl: Varlden, a: RadFard, b: RadFard) {
  const ra = radNr(vl, a.fran), rb = radNr(vl, b.fran);
  if (!ra || !rb) return;
  if (ra.nr !== vl.huvud && rb.nr !== vl.huvud) mots(vl, ra.nr, rb.nr);
  count(s, 'radmöte');
}

// huvudbyns sällskap möter en färd från en annan by
function mote(s: State, vl: Varlden, sl: Sallskap, f: RadFard, t: number) {
  const r = radNr(vl, f.fran), hem = r && byPlats(vl, r.nr), dit = fardDit(vl, f); // gruvfärden går till gruvan (steg 15.1.28)
  SAKNADKROK.fard?.(s, sl, f, t); // en färd från en by som vet om vilsegången hittar den saknade (steg 11.8.13)
  const folk = resenarer(s, sl);
  if (!r || !hem || !folk.length) return;
  for (const p of folk) {
    larOrt(s, p, hem.nr, O_KANT, 1, { t });
    if (dit && dit.nr !== hem.nr) larOrt(s, p, dit.nr, O_RYKTE, 1, { t });
    larPris(s, p, r.nr, gruppSlag(f.g), 1);
  }
  // färden på väg hem med silver köper det sällskapet har att sälja
  let fick = 0, salda = 0;
  if (f.t2 !== undefined && t >= f.t1 && (f.silver ?? 0) > 0 && BYSORTER[r.sort].folk) {
    for (const sak of Object.keys(sl.pack).sort()) {
      if (!saljbar(sak)) continue;
      const per = grundvarde(sak) * radPaslag(s, r, sak), m = Math.min(Math.floor(sl.pack[sak]!), Math.floor((f.silver ?? 0) / per + 1e-9));
      if (m <= 0) continue;
      const pay = Math.floor(m * per);
      if (pay <= 0) continue;
      tappa(sl, sak, m); f.silver! -= pay; fick += pay; salda += m;
      (f.hem ??= []).push({ k: sak, n: m });
      for (const p of folk) larPris(s, p, r.nr, sak, 1);
    }
    if (fick) { sl.pack.silver = (sl.pack.silver ?? 0) + fick; if (r.syn) byHandelse(vl, 'handel', vl.huvud!, r.nr); count(s, 'resa sålde på vägen', salda); }
  }
  dagbok(s, sl, 'vagmote', `Mötte folk från ${r.namn} på vägen${dit && dit.nr !== hem.nr ? ` till ${dit.namn}` : ''}${fick ? ` och sålde ${salda} saker för ${fick} silver` : ''}.`, t);
  count(s, 'resa möte');
  flyttMote(s, vl, sl, f, folk, t);
}

// ---------- de som flyttar från en by i nöd (steg 15.1.91, Flera samhällen: Det man ser och möter på vägen) ----------
// En flytt som inte har mat nog för vägen kvar ber sällskapet om mat. Ledaren väger varje portion med samma poäng som när maten
// tar slut (MATSLUT): det ett dygn utan mat kostar en av dem som flyttar (RESA.hungerKost, mer för en ledare med empati), delat
// med det en resenär äter per dygn, mot det portionen är värd för det egna sällskapet: RESA.behovVarde så länge resan behöver
// den (resBehov), annars dess grundvärde för byn. Det som ges är en gåva mellan byarna. Sedan väljer de som flyttar igen bland
// byarna de kan flytta till (flyttMal, med relationen efter gåvan), och väger huvudbyn tyngre än målet följer de med hem som
// nybyggare: de går mot huvudbyn och kommer dit som främlingar.
export function flyttMote(s: State, vl: Varlden, sl: Sallskap, f: RadFard, folk: Person[], t: number) {
  const r = radNr(vl, f.fran);
  if (!r || !f.flytt || f.gar !== 'ut' || f.till === vl.huvud || !f.pack) return;
  const l = fardMatLage(s, vl, f, t), har = FOOD.reduce((a, k) => a + Math.floor(f.pack![k] ?? 0), 0);
  const ber = Math.ceil(f.flytt * matPerResenar() * l.kvar - 1e-9) - har;
  if (ber <= 0) return;
  count(s, 'resa bön om mat');
  const led = folk.find(p => p.id === sl.ledare) ?? folk[0];
  const hjalp = RESA.hungerKost * (led ? Math.max(0, 1 + RESA.matEmpati * (stat(led, 'empati', s.now) - 10) / 10) : 1) / matPerResenar(); // en portion till den som flyttar
  const behov = resBehov(sl, matLage(s, sl, t).kvar, folk.length).mat; // det det egna sällskapet behöver för dygnen som återstår
  let gav = 0;
  for (const k of [...FOOD].filter(q => Math.floor(sl.pack[q] ?? 0) >= 1).sort((a, b) => grundvarde(a) - grundvarde(b) || (a < b ? -1 : 1))) {
    while (gav < ber && Math.floor(sl.pack[k] ?? 0) >= 1) {
      const egen = FOOD.reduce((a, q) => a + Math.floor(sl.pack[q] ?? 0), 0), kost = egen <= behov ? RESA.behovVarde : grundvarde(k);
      if (hjalp <= kost) break;
      tappa(sl, k, 1); f.pack![k] = (f.pack![k] ?? 0) + 1; gav++;
    }
  }
  if (gav) { byHandelse(vl, 'gava', vl.huvud!, r.nr, gav); count(s, 'resa gav mat', gav); }
  dagbok(s, sl, 'vagmote', gav ? `De som flyttade från ${r.namn} bad om mat, och fick ${gav === 1 ? 'en portion' : `${gav} portioner`}.` : `De som flyttade från ${r.namn} bad om mat, men sällskapet hade ingen att ge.`, t);
  // följa med hem: huvudbyn mot målet, med samma vikt som när de valde (byFlyttVikt), räknat härifrån: dygnen dit med sällskapet
  // och dygnen kvar till målet
  const v = varldMark(s), hp = byPlats(vl, vl.huvud!), h = radNr(vl, vl.huvud), m = radNr(vl, f.till);
  if (!v || !hp || !h || !m || f.vg?.ruta === undefined) return;
  const vag = vagMellan(vl, v, f.vg.ruta, hp.y * v.w + hp.x, 'fots', t);
  if (!vag || byFlyttVikt(vl, v, r, h, vag.kostnad / VARLD.gangPerDygn) <= byFlyttVikt(vl, v, r, m, l.kvar)) return;
  f.till = vl.huvud!; f.vg = { ...f.vg, vag: { fran: vag.fran, till: vag.till, steg: vag.steg }, pos: 0, gang: 0 };
  count(s, 'resa nybyggare', f.flytt);
  dagbok(s, sl, 'vagmote', `De som flyttade från ${r.namn} följer med hem för att bo i byn.`, t);
}

PERIODRADER.push({ namn: 'möten på vägen', period: 'timme', fn: (s, vl, n) => vagMoten(s, vl, n) });
