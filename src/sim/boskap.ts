// ---------- boskapen: får och getter (fas 9.8, Djuren i detalj) ----------
// Fåren och getterna köps av handlaren som levande djur (varorna levfar och levget i HANDLARVAROR, handel.ts): när en sådan vara
// ligger i byn blir den ett djur (tamdjur.ts) som ägs av den som köpte det och betar i hagen (hage.ts). På våren får en vuxen
// tacka eller get ett lamm eller en killing om det finns en vuxen hane av samma art i byn och hon inte är hungrig, tills byn har
// BOSKAP.flock av arten. Fåren ger ull: den växer ut på ett par dygn (år i spelet) och klipps med kniven (handlingen klippa).
// Mjölken (steg 9.8.8) och slakten med kött, skinn, horn och talg (steg 9.8.7) byggs i sina steg. Allt stegas en gång i timmen
// (stepBoskap, steg.ts), likadant i båda lägena, med byns följd 'tamdjur'.
import { balans } from './balans';
import { ALDER, ageOf, count, forstaGang, gjort, living, log, ovning } from './folk';
import { getable } from './behov';
import { rnd } from './slump';
import { changed, gain, stacksOf, tidy } from './lager';
import { DAY, Person, State } from './typer';
import { isLight, kalender, VAR } from './tid';
import { TamArtId, Tamdjur, nyttTamdjur, tamAlder, tamArt, tamdjurOf } from './tamdjur';

export const BOSKAP = balans('boskap', {
  fodd: 1 / 60, // chansen i timmen på våren att en vuxen hona som inte är hungrig får ett ungt (ungefär ett vart tredje dygn)
  hungrig: 0.5, // en hona med minst så här mycket hunger får inga unga
  flock: 12, // byn låter inte en art bli fler än så här många
  ullTim: 1 / 48, // ullen växer ut på två dygn (två år i spelet)
  ull: 2, // så många ull ett får ger när det klipps
  klippMin: 20, // minuter det tar att klippa ett får
  ovning: 0.03, // djurskötseln växer så här mycket när man klipper
});
// de levande djuren som handlaren säljer, och vilken art de blir
export const LEVANDE: Record<string, TamArtId> = { levfar: 'far', levget: 'get' };
// hona eller hane: varannan, efter id, så att byn med två djur har ett par
export const hona = (d: Tamdjur) => d.id % 2 === 0;
const vuxen = (s: State, d: Tamdjur) => tamAlder(s, d) >= tamArt(d.art).vuxen;

export function stepBoskap(s: State) {
  kopta(s);
  if (kalender(s).ai === VAR) foda(s);
  for (const d of tamdjurOf(s)) if (d.art === 'far') d.ull = Math.min(1, (d.ull ?? 0) + BOSKAP.ullTim);
}

// det köpta levande djuret blir ett djur där det ligger, och ägs av den som ägde varan (annars byn)
function kopta(s: State) {
  let n = 0;
  for (const a of stacksOf(s)) {
    const art = LEVANDE[a.k];
    if (!art || a.n < 1 - 1e-9) continue;
    const ag = { ...(a.ag ?? {}) };
    while (a.n >= 1 - 1e-9) {
      const agare = Object.keys(ag).map(Number).filter(id => ag[id] >= 1 - 1e-9).sort((x, y) => ag[y] - ag[x] || x - y)[0];
      if (agare !== undefined) ag[agare] -= 1;
      const d = nyttTamdjur(s, art, a.x + 0.5, a.y + 0.5, agare, s.now - tamArt(art).vuxen * DAY);
      d.ull = 1; a.n -= 1; n++;
      count(s, 'boskapKopt');
      if (forstaGang(s, `forsta_${art}`)) log(s, `Byn fick ${tamArt(art).ord[0]} ${tamArt(art).ord[1]} av handlaren, sitt första.`, 'world', agare !== undefined ? [agare] : []);
    }
    a.n = 0; a.ag = undefined;
  }
  if (n) { tidy(s); changed(s); }
}

// på våren: en vuxen hona som inte är hungrig får ibland ett ungt, om det finns en vuxen hane av arten
function foda(s: State) {
  const alla = tamdjurOf(s);
  for (const d of alla) {
    const a = tamArt(d.art);
    if (!a.bete || !hona(d) || !vuxen(s, d) || d.hunger >= BOSKAP.hungrig) continue;
    if (!alla.some(q => q.art === d.art && !hona(q) && vuxen(s, q))) continue;
    if (tamdjurOf(s).filter(q => q.art === d.art).length >= BOSKAP.flock) continue;
    if (rnd(s, 'tamdjur') >= BOSKAP.fodd) continue;
    const u = nyttTamdjur(s, d.art, d.x, d.y, d.agare);
    u.hage = d.hage; count(s, `fodd_${d.art}`);
    if (forstaGang(s, `forstaUng_${d.art}`)) log(s, `Byns ${a.ord[1]} fick ${d.art === 'far' ? 'ett lamm' : 'en killing'}.`, 'world', d.agare !== undefined ? [d.agare] : []);
  }
}

// ---------- att klippa fåren ----------
// En vuxen med kniv klipper ett får vars ull vuxit ut, i dagsljus och utom i istiden; ullen blir hens (eller byns)
export function klippVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || getable(s, p, 'kniv') < 1 || !isLight(s.now)) return undefined;
  let b: Tamdjur | undefined, bd = 40;
  for (const d of tamdjurOf(s)) {
    if (d.art !== 'far' || (d.ull ?? 0) < 1 || !vuxen(s, d) || (d.agare !== undefined && d.agare !== p.id)) continue;
    if (living(s).some(q => q !== p && q.task?.act === 'klippa' && q.task.ref === d.id)) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd < bd) { b = d; bd = dd; }
  }
  return b;
}
export function klippKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d || (d.ull ?? 0) < 1) return;
  d.ull = 0;
  gain(s, p, 'ull', BOSKAP.ull);
  ovning(p, 'skotsel', BOSKAP.ovning); gjort(s, p, 'klippt'); count(s, 'klippt');
  if (forstaGang(s, 'klipptFar')) log(s, `${p.name} klippte byns första får och fick ull.`, 'world', [p.id]);
}
