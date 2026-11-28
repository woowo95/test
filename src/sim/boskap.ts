import { gen } from './ord';
// ---------- boskapen: får och getter (fas 9.8, Djuren i detalj) ----------
// Fåren och getterna köps av handlaren som levande djur (varorna levfar och levget i HANDLARVAROR, handel.ts): när en sådan vara
// ligger i byn blir den ett djur (tamdjur.ts) som ägs av den som köpte det och betar i hagen (hage.ts). På våren får en vuxen
// tacka eller get ett lamm eller en killing om det finns en vuxen hane av samma art i byn och hon inte är hungrig, tills byn har
// BOSKAP.flock av arten. Fåren ger ull: den växer ut på ett par dygn (år i spelet) och klipps med kniven (handlingen klippa).
// Getterna mjölkas (steg 9.8.8), och slakten med kött, skinn, horn och talg (steg 9.8.7) byggs i sina steg. Allt stegas en gång i timmen
// (stepBoskap, steg.ts), likadant i båda lägena, med byns följd 'tamdjur'.
import { ovaArbete } from './kunna';
import { balans } from './balans';
import { spand } from './agande';
import { ALDER, ageOf, byId, count, forstaGang, gjort, log, annanGor, alive } from './folk';
import { desperatMat, getable, levKrok } from './behov';
import { chansPer } from './slump';
import { amountOf, changed, ownsAmount, put, stacksOf, tidy } from './lager';
import { kanGoras } from './stationer';
import { DAY, Person, State } from './typer';
import { HOST, iIstiden, isLight, kalender, VAR } from './tid';
import { VINTER, hoAv, hoRacker } from './slatter';
import { HONS, honsOf } from './hons';
import { HAGE, betesTal, djurIHagen, hageDygn, hageHel, hageKrok, hagarOf } from './hage';
import { farorNu } from './kult';
import { heligtAvstar } from './kultlatt';
import { fyllVatska, karRymmer, ledigFor, ledigaFor } from './vatskor';
import { TAMDJUR, TamArtId, Tamdjur, arHona, nyttTamdjur, tamAlder, tamArt, tamdjurOf } from './tamdjur';

export const BOSKAP = balans('boskap', {
  fodd: 1 / 60, // chansen i timmen på våren att en vuxen hona som inte är hungrig får ett ungt (ungefär ett vart tredje dygn)
  hungrig: 0.5, // en hona med minst så här mycket hunger får inga unga
  beteDygn: 2, // ett ungt föds bara när betet i någon hage räcker så här många dygn också för det (steg 10.2.33)
  sistVarde: 5, // det sista djuret av sitt kön i arten är så här mycket mer värt att behålla
  ullTim: 1 / 48, // ullen växer ut på två dygn (två år i spelet)
  klippMin: 5, // minuter det tar att klippa ett får (en stor sak i Arbetstider)
  mjolkTim: 1 / 12, // en vuxen get har mjölk att ge två gånger om dygnet (utom i istiden)
  mjolkMin: 3, // minuter det tar att mjölka en get (en liten sak)
});
// de levande djuren som handlaren säljer, och vilken art de blir
export const LEVANDE: Record<string, TamArtId> = Object.fromEntries((Object.keys(TAMDJUR) as TamArtId[]).filter(id => tamArt(id).lev).map(id => [tamArt(id).lev!, id]));
// de levande bytena ur fällorna, och arten de blir (kultingen ur buren blir en ung gris, steg 10.10.13)
export const FANGADE: Record<string, TamArtId> = Object.fromEntries((Object.keys(TAMDJUR) as TamArtId[]).filter(id => tamArt(id).fangas).map(id => [tamArt(id).fangas!, id]));
// levande djur byts som allt annat (steg 15.1.143): så många av den levande varan k som byn har, i förrådet och som djur (hönsen i flocken)
export function levAntal(s: State, k: string) {
  if (k === 'levhons') return amountOf(s, k) + (honsOf(s)?.n ?? 0);
  const art = LEVANDE[k];
  return amountOf(s, k) + (art ? tamdjurOf(s).filter(d => d.art === art).length : 0);
}
export const arLevande = (k: string) => k === 'levhons' || LEVANDE[k] !== undefined;
// så många djur av arten byn vill ha: ett av varje art handlaren säljer, och paret av en art som får ungar när en hage står klar
// och höet räcker till vintern också för det nya djuret. Hönsen är en flock, högst HONS.max
export function djurMal(s: State, art: TamArtId | 'hons') {
  if (art === 'hons') return HONS.max;
  const a = tamArt(art);
  if (!a.lev) return 0;
  const hage = !a.bete || hagarOf(s).some(h => hageHel(s, h));
  return a.unge && hage && hoAv(s) >= (betesTal(s) + a.ater) * VINTER.hoPerDjur ? 2 : 1;
}
// samma tre steg som för allt annat (bynBehov i behov.ts): under behover saknar byn varan, under buf vill den ha fler. Djuren byn vill ha
// saknas tills de finns; hönsen saknas tills byn har en flock och är värda sitt grundvärde tills flocken är full
export const levMal = (s: State, k: string) => k === 'levhons' ? { behover: 1, buf: djurMal(s, 'hons') } : (m => ({ behover: m, buf: m }))(djurMal(s, LEVANDE[k]));
// byn vill ha betesdjur (hagen märks ut innan de kommer, steg 15.1.143)
export const villBetesdjur = (s: State) => (Object.keys(TAMDJUR) as TamArtId[]).some(a => tamArt(a).bete && djurMal(s, a) > 0);
// det djuret av den levande varan k ger som en person kan sakna (steg 15.1.164): ullen. Mjölken är byns i krukorna (steg 15.2.9)
const gerAv = (k: string): readonly string[] => { const a = LEVANDE[k] && tamArt(LEVANDE[k]); return a?.ull ? ['ull'] : []; };
// så många djur av varans art p äger, och varan hen äger (som blir ett djur)
const egnaDjur = (s: State, p: Person, k: string) => ownsAmount(s, p, k) + (LEVANDE[k] ? tamdjurOf(s).filter(d => d.art === LEVANDE[k] && d.agare === p.id).length : 0);
const LEV_LIST = Object.keys(LEVANDE);
Object.assign(levKrok, { ar: arLevande, antal: levAntal, mal: levMal, alla: () => LEV_LIST, eget: egnaDjur, ger: gerAv }); hageKrok.vill = villBetesdjur;
// hona eller hane: sätts när djuret kommer till byn (nyttTamdjur i tamdjur.ts), så att två djur av arten är ett par
export const hona = arHona;
const vuxen = (s: State, d: Tamdjur) => tamAlder(s, d) >= tamArt(d.art).vuxen;

// dt: sekunderna sedan sist (steg 12.1.107)
export function stepBoskap(s: State, dt = 3600) {
  const tim = dt / 3600;
  kopta(s);
  if (kalender(s).ai === VAR) foda(s, dt);
  const istid = iIstiden(kalender(s).ai);
  for (const d of tamdjurOf(s)) {
    if (tamArt(d.art).ull) d.ull = Math.min(1, (d.ull ?? 0) + BOSKAP.ullTim * tim);
    if (tamArt(d.art).mjolk && hona(d) && vuxen(s, d) && !istid && d.hunger < BOSKAP.hungrig && !d.torstTim) d.mjolk = Math.min(1, (d.mjolk ?? 0) + BOSKAP.mjolkTim * tim);
  }
}

// (ett djur utan vatten ger ingen mjölk, steg 10.10.31)
// det köpta levande djuret blir ett vuxet djur där det ligger, och ägs av den som ägde varan (annars byn); det fångade (kultingen)
// blir ett ungt djur, fött nu, och ägs av den som vittjade fällan
function kopta(s: State) {
  let n = 0;
  for (const a of stacksOf(s)) {
    const fangad = FANGADE[a.k], art = LEVANDE[a.k] ?? fangad;
    if (!art || a.n < 1 - 1e-9) continue;
    const ag = { ...(a.ag ?? {}) };
    while (a.n >= 1 - 1e-9) {
      const agare = Object.keys(ag).map(Number).filter(id => ag[id] >= 1 - 1e-9).sort((x, y) => ag[y] - ag[x] || x - y)[0];
      if (agare !== undefined) ag[agare] -= 1;
      const d = nyttTamdjur(s, art, a.x + 0.5, a.y + 0.5, agare, fangad ? s.now : s.now - tamArt(art).vuxen * DAY);
      const andra = tamdjurOf(s).filter(q => q !== d && q.art === art), honor = andra.some(hona), hanar = andra.some(q => !hona(q));
      if (!fangad && honor !== hanar) d.hona = !honor; // det köpta djuret har det kön som arten saknar i byn (steg 15.1.143)
      d.ull = 1; a.n -= 1; n++;
      count(s, fangad ? 'boskapFangad' : 'boskapKopt');
      const q = agare !== undefined ? byId(s, agare) : undefined;
      if (forstaGang(s, `forsta_${art}`)) log(s, fangad ? `${q ? q.name : 'Någon'} bar hem en kulting levande ur buren. Den blev byns första ${tamArt(art).ord[1]}.` : `Byn fick ${tamArt(art).ord[0]} ${tamArt(art).ord[1]} av handlaren, sitt första.`, 'world', agare !== undefined ? [agare] : []);
    }
    a.n = 0; a.ag = undefined;
  }
  if (n) { tidy(s); changed(s); }
}

// på våren: en vuxen hona som inte är hungrig får ibland ett ungt, om det finns en vuxen hane av arten
function foda(s: State, dt: number) {
  const alla = tamdjurOf(s);
  for (const d of alla) {
    const a = tamArt(d.art);
    if (!a.bete || !a.unge || !hona(d) || !vuxen(s, d) || d.hunger >= BOSKAP.hungrig) continue; // oxen får inga ungar (steg 10.10.3)
    if (!alla.some(q => q.art === d.art && !hona(q) && vuxen(s, q))) continue;
    if (!rymsEnTill(s, d.art)) continue; // flocken växer bara så länge betet och höet räcker (steg 10.2.33)
    if (!chansPer(s, BOSKAP.fodd, 3600, dt, 'tamdjur')) continue;
    const u = nyttTamdjur(s, d.art, d.x, d.y, d.agare);
    u.hage = d.hage; count(s, `fodd_${d.art}`);
    const ag = d.agare !== undefined ? byId(s, d.agare) : undefined; if (ag && alive(ag)) tanke(ag, 'fickUnge', s.now, { unge: a.unge }); // (steg 12.1.131)
    if (forstaGang(s, `forstaUng_${d.art}`)) log(s, `Byns ${a.ord[1]} fick ${a.unge ?? 'en unge'}.`, 'world', d.agare !== undefined ? [d.agare] : []);
  }
}

// ---------- att klippa fåren ----------
// En vuxen med kniv eller ullsax klipper ett får vars ull vuxit ut, i dagsljus och utom i istiden; ullen blir fårets ägares (eller byns)
export function klippVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || getable(s, p, 'kniv') < 1 && getable(s, p, 'ullsax') <= 0 /* ullsaxen (steg 12.5.2) */ || !isLight(s.now) || iIstiden(kalender(s).ai)) return undefined; // i istiden behöver fåret ullen
  let b: Tamdjur | undefined, bd = 40;
  for (const d of tamdjurOf(s)) {
    if (!tamArt(d.art).ull || (d.ull ?? 0) < 1 || !vuxen(s, d) || (d.agare !== undefined && d.agare !== p.id)) continue;
    if (annanGor(s, p, 'klippa', d.id)) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd < bd) { b = d; bd = dd; }
  }
  return b;
}
export function klippKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d || (d.ull ?? 0) < 1) return;
  d.ull = 0;
  put(s, 'ull', tamArt(d.art).ull!, d.agare !== undefined ? { [d.agare]: tamArt(d.art).ull! } : undefined); // det djuret ger är djurets ägares, som slakten (steg 15.1.147)
  ovaArbete(s, p, 'klippa', BOSKAP.klippMin); gjort(s, p, 'klippt'); count(s, 'klippt');
  if (forstaGang(s, 'klipptFar')) log(s, `${p.name} klippte byns första får och fick ull.`, 'world', [p.id]);
}

// ---------- att mjölka getterna (steg 9.8.8) ----------
// En vuxen getahona som inte är hungrig får mjölk utom i istiden. En vuxen mjölkar henne i dagsljus när byn har en ledig kruka,
// och mjölken blir en dryck i krukan (VATSKOR, vatskor.ts) som håller ett dygn. Kon kommer i fas 10, och då mjölkas också hon
export function mjolkaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !isLight(s.now) || !ledigFor(s, 'mjolk')) return undefined;
  let b: Tamdjur | undefined, bd = 40;
  for (const d of tamdjurOf(s)) {
    if (!tamArt(d.art).mjolk || (d.mjolk ?? 0) < 1 || (d.agare !== undefined && d.agare !== p.id)) continue;
    if (annanGor(s, p, 'mjolka', d.id)) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd < bd) { b = d; bd = dd; }
  }
  return b;
}
// mjölken hälls i den minsta lediga krukan som rymmer allt, annars i den största (steg 10.10.1); det som inte ryms stannar i djuret
// till nästa mjölkning
export function mjolkaKlar(s: State, p: Person, ref?: number) {
  const d = tamdjurOf(s).find(q => q.id === ref);
  if (!d || (d.mjolk ?? 0) < 1) return;
  const n = tamArt(d.art).mjolk! + (d.mjolkRest ?? 0);
  const t = mjolkKar(s, n);
  if (!t || !fyllVatska(s, 'mjolk', n, t)) return;
  d.mjolk = 0; d.mjolkRest = Math.max(0, n - karRymmer(t)) || undefined;
  ovaArbete(s, p, 'mjolka', BOSKAP.mjolkMin); gjort(s, p, 'mjolkat'); count(s, 'mjolkat');
  forstaGang(s, 'mjolkHaft'); // byn har haft mjölk (tekniken Ost, steg 12.4.7)
  if (forstaGang(s, 'mjolkatGet')) log(s, `${p.name} mjölkade byns första ${tamArt(d.art).ord[1]}.`, 'world', [p.id]);
}
const mjolkKar = (s: State, n: number) => {
  const lediga = ledigaFor(s, 'mjolk');
  return lediga.find(t => karRymmer(t) >= n) ?? lediga[lediga.length - 1];
};

// ---------- slakten av tamdjuren (steg 9.8.7) ----------
// Ett får eller en get avlivas och slaktas vid slaktbänken som viltet (raderna far och get i DJUR, redskap.ts): kött, ben, skinn,
// talg och horn, och slaktrensen blir mat åt hunden. Byn slaktar det gamla djuret, ett av hanarna när flocken blivit för stor
// (en hane blir kvar), när byn svälter det som inte behövs för att flocken ska leva vidare (ett par blir kvar), och på hösten
// de djur byn inte har hö till över istiden (steg 9.8.9)
export const SLAKTDJUR = balans('slaktdjur', {
  kvarLiv: 0.2, // ett djur slaktas när mindre än så här stor del av livet är kvar (steg 10.2.33; förr vid 75 %)
  min: 5, // minuter det tar att avliva djuret och bära det till slaktbänken (en stor sak)
});
export const SLAKTAD: Record<string, string> = { far: 'slaktfar', get: 'slaktget', ko: 'slaktko', oxe: 'slaktko', gris: 'slaktgris' }; // oxen slaktas som kon, hästen inte (steg 10.10.3)
// fodret i förrådet räcker över istiden för de djur av arten som inte betar (grisen, steg 10.10.13): en sak om dygnet per djur (hungern
// växer med TAM.hungerTim × ater, och en sak foder gör djuret mätt), i en tidsålder (VINTER.hoPerDjur dygn, som höet)
export const foderRacker = (s: State, art: TamArtId) => {
  const a = tamArt(art), n = tamdjurOf(s).filter(q => q.art === art).length;
  return a.foder.reduce((x, k) => x + amountOf(s, k), 0) >= n * a.ater * VINTER.hoPerDjur;
};
// betet och höet räcker för ett djur till: någon hage har bete för det i BOSKAP.beteDygn dygn, och höet räcker över istiden (steg 10.2.33)
export const rymsEnTill = (s: State, art: TamArtId = 'far') => { const at = tamArt(art).ater; return hagarOf(s).some(h => hageDygn(s, h, at) >= BOSKAP.beteDygn) && hoAv(s) >= (betesTal(s) + at) * VINTER.hoPerDjur; };
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
// det minst värda att behålla av arten (de som slaktas), det första vid lika; värdet räknas en gång per djur (steg 12.1.104)
function minstVart(s: State, art: Tamdjur['art']) {
  const arten = tamdjurOf(s).filter(q => q.art === art && SLAKTAD[q.art]);
  let m: Tamdjur | undefined, mv = Infinity;
  for (const q of arten) { const v = behallVarde(s, q); if (!m || v < mv) { m = q; mv = v; } }
  return { n: arten.length, minst: m };
}
// minst = minstVart per art, som avlivaVal räknar en gång för alla djuren
export function slaktOrsak(s: State, d: Tamdjur, p?: Person, minst?: Map<string, ReturnType<typeof minstVart>>): string | undefined {
  const a = tamArt(d.art);
  if (!SLAKTAD[d.art] || spand(s, d.id)) return undefined; // inte dragdjuret som drar släden (steg 10.10.3)
  if (p && d.agare !== undefined && d.agare !== p.id) return desperatMat(s, p) ? 'stold' : undefined;
  if (tamAlder(s, d) > a.liv * (1 - SLAKTDJUR.kvarLiv)) return 'gammal';
  let mv = minst?.get(d.art);
  if (!mv) { mv = minstVart(s, d.art); minst?.set(d.art, mv); }
  if (a.unge && mv.n < 2) return undefined; // ett par blir kvar av den art som får ungar (grisen får inga, steg 10.10.13)
  if (mv.minst !== d) return undefined;
  if (farorNu(s).svalt) return 'svalt';
  const bete = hagarOf(s).filter(h => djurIHagen(s, h).length);
  if (bete.length && bete.every(h => hageDygn(s, h) < HAGE.flyttDygn) && !hagarOf(s).some(h => hageDygn(s, h, 1) >= BOSKAP.beteDygn)) return 'bete';
  if (kalender(s).ai === HOST && !(a.bete ? hoRacker(s) : foderRacker(s, d.art))) return 'host'; // höstslakten (steg 9.8.9): höet för betesdjuren, fodret i förrådet för grisen (steg 10.10.13)
  return undefined;
}
export function avlivaVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !kanGoras(s, 'slakta', p) || getable(s, p, 'kniv') < 1 || !isLight(s.now)) return undefined;
  const svalt = farorNu(s).svalt, minst = new Map<string, ReturnType<typeof minstVart>>();
  for (const d of tamdjurOf(s)) {
    if (heligtAvstar(s, p, d.art, svalt)) continue; // det heliga djuret avlivas inte, utom i svält (steg 10.3.15)
    if (annanGor(s, p, 'avliva', d.id)) continue;
    if (slaktOrsak(s, d, p, minst)) return d;
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
    log(s, `${p.name} slaktade ${gen(agare.name)} ${tamArt(d.art).ord[1]} i hungern.`, 'rel', [p.id, agare.id]);
  }
  count(s, 'tamDog_slaktad'); count(s, `slaktad_${orsak}`); gjort(s, p, 'avlivat'); ovaArbete(s, p, 'avliva', SLAKTDJUR.min);
  if (forstaGang(s, 'slaktatTamdjur')) log(s, `${p.name} avlivade ${tamArt(d.art).ord[3]} och bar det till slaktbänken.`, 'world', [p.id]);
}
import { handelse } from './rykten';
import { tanke } from './tankar';
// mjölkens värde (steg 15.1.34, varde.ts): arbetet att mjölka en get, delat på mjölken den ger
export const mjolkUr = (k: string): Ur | undefined => k === 'mjolk' ? { av: {}, min: BOSKAP.mjolkMin, ger: tamArt('get').mjolk! } : undefined;
import type { Ur } from './varde';
