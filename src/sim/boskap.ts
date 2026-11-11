// ---------- boskapen: får och getter (fas 9.8, Djuren i detalj) ----------
// Fåren och getterna köps av handlaren som levande djur (varorna levfar och levget i HANDLARVAROR, handel.ts): när en sådan vara
// ligger i byn blir den ett djur (tamdjur.ts) som ägs av den som köpte det och betar i hagen (hage.ts). På våren får en vuxen
// tacka eller get ett lamm eller en killing om det finns en vuxen hane av samma art i byn och hon inte är hungrig, tills byn har
// BOSKAP.flock av arten. Fåren ger ull: den växer ut på ett par dygn (år i spelet) och klipps med kniven (handlingen klippa).
// Getterna mjölkas (steg 9.8.8), och slakten med kött, skinn, horn och talg (steg 9.8.7) byggs i sina steg. Allt stegas en gång i timmen
// (stepBoskap, steg.ts), likadant i båda lägena, med byns följd 'tamdjur'.
import { balans } from './balans';
import { ALDER, ageOf, byId, count, forstaGang, gjort, living, log, ovning } from './folk';
import { desperatMat, getable } from './behov';
import { rnd } from './slump';
import { changed, gain, put, stacksOf, tidy } from './lager';
import { kanGoras } from './stationer';
import { DAY, Person, State } from './typer';
import { HOST, iIstiden, isLight, kalender, VAR } from './tid';
import { VINTER, hoAv, hoRacker } from './slatter';
import { HAGE, betesdjurOf, djurIHagen, hageDygn, hagarOf } from './hage';
import { farorNu } from './kult';
import { fyllVatska, ledigFor } from './vatskor';
import { TamArtId, Tamdjur, arHona, nyttTamdjur, tamAlder, tamArt, tamdjurOf } from './tamdjur';

export const BOSKAP = balans('boskap', {
  fodd: 1 / 60, // chansen i timmen på våren att en vuxen hona som inte är hungrig får ett ungt (ungefär ett vart tredje dygn)
  hungrig: 0.5, // en hona med minst så här mycket hunger får inga unga
  beteDygn: 2, // ett ungt föds bara när betet i någon hage räcker så här många dygn också för det (steg 10.2.33)
  sistVarde: 5, // det sista djuret av sitt kön i arten är så här mycket mer värt att behålla
  ullTim: 1 / 48, // ullen växer ut på två dygn (två år i spelet)
  ull: 2, // så många ull ett får ger när det klipps
  klippMin: 20, // minuter det tar att klippa ett får
  ovning: 0.03, // djurskötseln växer så här mycket när man klipper
  mjolkTim: 1 / 12, // en vuxen get har mjölk att ge två gånger om dygnet (utom i istiden)
  mjolk: 2, // så många delar mjölk en get ger när hon mjölkas
  mjolkMin: 15, // minuter det tar att mjölka en get
});
// de levande djuren som handlaren säljer, och vilken art de blir
export const LEVANDE: Record<string, TamArtId> = { levfar: 'far', levget: 'get' };
// hona eller hane: sätts när djuret kommer till byn (nyttTamdjur i tamdjur.ts), så att två djur av arten är ett par
export const hona = arHona;
const vuxen = (s: State, d: Tamdjur) => tamAlder(s, d) >= tamArt(d.art).vuxen;

export function stepBoskap(s: State) {
  kopta(s);
  if (kalender(s).ai === VAR) foda(s);
  const istid = iIstiden(kalender(s).ai);
  for (const d of tamdjurOf(s)) {
    if (d.art === 'far') d.ull = Math.min(1, (d.ull ?? 0) + BOSKAP.ullTim);
    if (d.art === 'get' && hona(d) && vuxen(s, d) && !istid && d.hunger < BOSKAP.hungrig) d.mjolk = Math.min(1, (d.mjolk ?? 0) + BOSKAP.mjolkTim);
  }
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
    if (!rymsEnTill(s)) continue; // flocken växer bara så länge betet och höet räcker (steg 10.2.33)
    if (rnd(s, 'tamdjur') >= BOSKAP.fodd) continue;
    const u = nyttTamdjur(s, d.art, d.x, d.y, d.agare);
    u.hage = d.hage; count(s, `fodd_${d.art}`);
    if (forstaGang(s, `forstaUng_${d.art}`)) log(s, `Byns ${a.ord[1]} fick ${d.art === 'far' ? 'ett lamm' : 'en killing'}.`, 'world', d.agare !== undefined ? [d.agare] : []);
  }
}

// ---------- att klippa fåren ----------
// En vuxen med kniv klipper ett får vars ull vuxit ut, i dagsljus och utom i istiden; ullen blir hens (eller byns)
export function klippVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || getable(s, p, 'kniv') < 1 || !isLight(s.now) || iIstiden(kalender(s).ai)) return undefined; // i istiden behöver fåret ullen
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

// ---------- att mjölka getterna (steg 9.8.8) ----------
// En vuxen getahona som inte är hungrig får mjölk utom i istiden. En vuxen mjölkar henne i dagsljus när byn har en ledig kruka,
// och mjölken blir en dryck i krukan (VATSKOR, vatskor.ts) som håller ett dygn. Kon kommer i fas 10, och då mjölkas också hon
export function mjolkaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !isLight(s.now) || !ledigFor(s, 'mjolk')) return undefined;
  let b: Tamdjur | undefined, bd = 40;
  for (const d of tamdjurOf(s)) {
    if (d.art !== 'get' || (d.mjolk ?? 0) < 1 || (d.agare !== undefined && d.agare !== p.id)) continue;
    if (living(s).some(q => q !== p && q.task?.act === 'mjolka' && q.task.ref === d.id)) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd < bd) { b = d; bd = dd; }
  }
  return b;
}
export function mjolkaKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d || (d.mjolk ?? 0) < 1 || !fyllVatska(s, 'mjolk', BOSKAP.mjolk)) return;
  d.mjolk = 0;
  ovning(p, 'skotsel', BOSKAP.ovning); gjort(s, p, 'mjolkat'); count(s, 'mjolkat');
  if (forstaGang(s, 'mjolkatGet')) log(s, `${p.name} mjölkade byns första get.`, 'world', [p.id]);
}

// ---------- slakten av tamdjuren (steg 9.8.7) ----------
// Ett får eller en get avlivas och slaktas vid slaktbänken som viltet (raderna far och get i DJUR, redskap.ts): kött, ben, skinn,
// talg och horn, och slaktrensen blir mat åt hunden. Byn slaktar det gamla djuret, ett av hanarna när flocken blivit för stor
// (en hane blir kvar), när byn svälter det som inte behövs för att flocken ska leva vidare (ett par blir kvar), och på hösten
// de djur byn inte har hö till över istiden (steg 9.8.9)
export const SLAKTDJUR = balans('slaktdjur', {
  kvarLiv: 0.2, // ett djur slaktas när mindre än så här stor del av livet är kvar (steg 10.2.33; förr vid 75 %)
  min: 15, // minuter det tar att avliva djuret och bära det till slaktbänken
});
export const SLAKTAD: Record<string, string> = { far: 'slaktfar', get: 'slaktget' };
// betet och höet räcker för ett djur till: någon hage har bete för det i BOSKAP.beteDygn dygn, och höet räcker över istiden (steg 10.2.33)
export const rymsEnTill = (s: State) => hagarOf(s).some(h => hageDygn(s, h, 1) >= BOSKAP.beteDygn) && hoAv(s) >= (betesdjurOf(s).length + 1) * VINTER.hoPerDjur;
// värdet av att behålla djuret: honan och den vuxna mer, det sista av sitt kön mycket mer (så att ett par blir kvar så länge
// något annat finns att slakta), mindre ju närmare slutet av livet det är
export function behallVarde(s: State, d: Tamdjur) {
  const a = tamArt(d.art), arten = tamdjurOf(s).filter(q => q.art === d.art), sitt = arten.filter(q => hona(q) === hona(d) && vuxen(s, q));
  return (hona(d) ? 2 : 1) * (vuxen(s, d) ? 1 : 0.7) * (sitt.length === 1 && sitt[0] === d ? BOSKAP.sistVarde : 1) * Math.max(0.05, 1 - tamAlder(s, d) / a.liv);
}
// varför djuret ska slaktas, eller undefined (steg 10.2.33): när byn svälter (samma mått som valet av aktivitet), när betet inte
// räcker eller på hösten när höet inte räcker över istiden slaktas det som är minst värt att behålla, ett i taget; och det
// gamla, när mindre än SLAKTDJUR.kvarLiv av livet är kvar
// p = den som slaktar: någon annans djur slaktar bara den som är så hungrig att hen stjäl (boskapsstöld, steg 9.8.12)
export function slaktOrsak(s: State, d: Tamdjur, p?: Person): string | undefined {
  const a = tamArt(d.art);
  if (!SLAKTAD[d.art]) return undefined;
  if (p && d.agare !== undefined && d.agare !== p.id) return desperatMat(s, p) ? 'stold' : undefined;
  if (tamAlder(s, d) > a.liv * (1 - SLAKTDJUR.kvarLiv)) return 'gammal';
  const arten = tamdjurOf(s).filter(q => q.art === d.art && SLAKTAD[q.art]);
  if (arten.length < 2) return undefined;
  const minst = arten.reduce((m, q) => behallVarde(s, q) < behallVarde(s, m) ? q : m);
  if (minst !== d) return undefined;
  if (farorNu(s).svalt) return 'svalt';
  const bete = hagarOf(s).filter(h => djurIHagen(s, h).length);
  if (bete.length && bete.every(h => hageDygn(s, h) < HAGE.flyttDygn) && !hagarOf(s).some(h => hageDygn(s, h, 1) >= BOSKAP.beteDygn)) return 'bete';
  if (kalender(s).ai === HOST && !hoRacker(s)) return 'host'; // höstslakten (steg 9.8.9)
  return undefined;
}
export function avlivaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !kanGoras(s, 'slakta', p) || getable(s, p, 'kniv') < 1 || !isLight(s.now)) return undefined;
  for (const d of tamdjurOf(s)) {
    if (living(s).some(q => q !== p && q.task?.act === 'avliva' && q.task.ref === d.id)) continue;
    if (slaktOrsak(s, d, p)) return d;
  }
  return undefined;
}
export function avlivaKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d) return;
  const orsak = slaktOrsak(s, d, p);
  if (!orsak) return;
  d.dog = s.now; s.tamdjur = (s.tamdjur ?? []).filter(q => q !== d);
  const agare = d.agare !== undefined ? byId(s, d.agare) : undefined;
  put(s, SLAKTAD[d.art], 1, orsak === 'stold' ? { [p.id]: 1 } : d.agare !== undefined ? { [d.agare]: 1 } : undefined);
  // boskapsstölden: ägaren saknar djuret och vet vem som tog det (rykten.ts), och lagen mot boskapsstöld kan döma (lagar.ts)
  if (orsak === 'stold' && agare) {
    count(s, 'boskapsstold');
    handelse(s, p, 'boskapsstold', agare, tamArt(d.art).ord[1], agare);
    log(s, `${p.name} slaktade ${agare.name}s ${tamArt(d.art).ord[1]} i hungern.`, 'rel', [p.id, agare.id]);
  }
  count(s, 'tamDog_slaktad'); count(s, `slaktad_${orsak}`); gjort(s, p, 'avlivat');
  if (forstaGang(s, 'slaktatTamdjur')) log(s, `${p.name} avlivade ${tamArt(d.art).ord[3]} och bar det till slaktbänken.`, 'world', [p.id]);
}
import { handelse } from './rykten';
