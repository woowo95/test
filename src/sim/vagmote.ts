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
import { BEHALL, dagbok, resenarer, Sallskap, sallskapNu, tappa } from './resa';
import { FOOD } from './saker';
import { grundvarde } from './varde';
import { PERIODER, PERIODRADER, periodSlut } from './varldslag';
import { Varlden, varldMark } from './varlden';
import { fardSpar, RadFard } from './byhandling';
import { SEC, State } from './typer';

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
    if (a.k === 's' && b.k === 's') continue; // huvudbyns egna sällskap möter inte varandra
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
  const r = radNr(vl, f.fran), hem = r && byPlats(vl, r.nr), dit = byPlats(vl, f.till);
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
      if (BEHALL.includes(sak) || FOOD.includes(sak) || !(grundvarde(sak) > 0)) continue;
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
}

PERIODRADER.push({ namn: 'möten på vägen', period: 'timme', fn: (s, vl, n) => vagMoten(s, vl, n) });
