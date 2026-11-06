import { liten, talOrd } from './ord';
import { KROPP, ageOf, alive, count, isParent, isSick, livet, living, log } from './folk';
import { pick, rnd } from './slump';
import { DAY, Person, STATS, Stat, State, Upplevelse } from './typer';
import { roomAt } from './byggnad';
import { balans } from './balans';
import { andeRiktning } from './religion';
import { foodDays } from './ekonomi';
import type { Sed } from './seder';

// Uppväxten (steg 3.1.2, "Uppväxt" i designdokumentet): det ett barn är med om blir en upplevelse som det minns hela livet,
// och upplevelserna flyttar egenskaperna. Det man föds med är anlagen (p.anlag, ärvs av barnen); p.pot är anlagen plus det
// upplevelserna flyttar, och det är p.pot som alla andra system läser (stat i folk.ts, sederna i seder.ts). Byns seder drar
// inte i barnen: en generation formas av sin egen tid, så byn kan svänga mellan generationerna.

// ---------- balanstal (regel 8) ----------
export const UPPV = balans('uppvaxt', {
  fran: 3, // från den här åldern (år) minns man det man är med om (att bli föräldralös formar också den som är yngre) ...
  alder: 14, // ... och till den här formar det en
  max: 5, // så många upplevelser minns man högst; kommer en starkare när listan är full trängs den svagaste undan
  tak: 5, // upplevelserna flyttar en egenskap högst så här mycket sammanlagt (skalan 1–20)
  naraHalsa: 0.6, // nära att svälta eller frysa ihjäl: kroppen tar skada och hälsan är under detta
  sjukHalsa: 0.5, // svårt sjuk: sjuk och hälsan under detta
  skadaGrad: 0.5, // en allvarlig skada: graden minst så här (0–1)
  sagDod: 6, // såg någon dö: inom så här många rutor
  syskonFran: 3, // ett småsyskon formar den som är minst så här gammal (år)
  tryggMatt: 0.6, // tryggt: inne i ett hus, mätt över detta ...
  tryggVarm: 0.8, // ... och varm över detta
  // vuxenlivet (steg 4.1.1.2): en vuxen är svårare att forma
  vuxenChans: 1 / 3, // en vuxen får det att fastna med så stor del av barnets chans ...
  vuxenEffekt: 0.5, // ... och det flyttar en egenskap så stor del (men minst 1)
  vuxenMax: 3, // så många upplevelser minns man högst från vuxenlivet ...
  vuxenTak: 3, // ... och så mycket flyttar de en egenskap sammanlagt (barndomen har sina egna, max och tak)
  fordarvDod: 3, // ledde byn i fördärvet: så många svalt eller frös ihjäl medan hen ledde ...
  fordarvKrymp: 0.8, // ... eller byn krympte till så här stor del av den hen tog över
  gammal: 60, // blev gammal och såg alla jämnåriga dö: från den här åldern (år) ...
  jamnarig: 5, // ... och jämnåriga är de som är födda högst så här många år ifrån
  manga: 5, // gjorde många usla eller fina saker: så många
  blekna: 15, // en upplevelse från vuxenlivet bleknar ett steg per så här många dygn (år i spelet), en tung hälften så fort (steg 4.1.1.4) ...
  bleknaAnde: 4, // ... och ett steg tar 1 från varje egenskap och så här mycket från andligheten; när inget är kvar är den glömd
  overflodDygn: 9, // levde i överflöd: maten i förrådet räcker fler dygn än så här (steg 4.5.4.9; chansen per timme står på raden)
});

// ---------- upplevelserna (registret) ----------
// text: raden i personrutan ({om} = vad eller vem det gällde), chans: att det fastnar när det händer (för det som prövas
// varje timme: chansen per timme), e: vad det kan göra med egenskaperna, ett av alternativen slumpas, tidig: formar också
// den som är yngre än UPPV.fran. vem (steg 4.1.1.2): om raden gäller barn, vuxna eller båda. Talen gäller ett barn; en vuxen
// får chansen gånger UPPV.vuxenChans och effekten gånger UPPV.vuxenEffekt (minst 1). vuxenTal: talen gäller i stället en
// vuxen, och ett barn får tre gånger chansen och dubbla effekten (raderna som kom med steg 4.1.1.2)
// ande (steg 4.1.1.3): upplevelsen flyttar också andligheten (religion.ts), uppåt eller nedåt. tung (steg 4.1.1.4): bleknar
// hälften så fort i vuxenlivet
// sed (steg 4.5.4.9): åt vilket håll upplevelsen drar personens hållning i sederna, 1 = lite, 2 = tydligt, 3 = mycket (negativt =
// sedens andra sida); ett steg är SED.uppSteg (seder.ts). kort: namnet på upplevelsen utan {om} (fliken Seder)
interface UpplevelseDef { text: string; chans: number; e: Partial<Record<Stat, number>>[]; vem: 'barn' | 'vuxen' | 'bada'; tidig?: true; vuxenTal?: true; ande?: true; tung?: true; sed?: Partial<Record<Sed, number>>; kort?: string }
export const UPPLEVELSER = {
  skadad: { text: 'Skadades svårt: {om}', chans: 0.6, e: [{ mod: -2 }, { uthallighet: 2 }, { mod: -1, uthallighet: 1 }], vem: 'bada', sed: { forsiktighet: 1 }, ande: true },
  svalt: { text: 'Var nära att svälta ihjäl', chans: 0.3, e: [{ flit: 2 }, { flit: 1, empati: -1 }], vem: 'bada', sed: { forsiktighet: 2, arbete: 1 }, ande: true },
  frys: { text: 'Var nära att frysa ihjäl', chans: 0.3, e: [{ flit: 1, mod: -1 }, { uthallighet: 2 }], vem: 'bada', sed: { forsiktighet: 2 }, ande: true },
  svamp: { text: 'Blev förgiftad av svamp', chans: 0.6, e: [{ nyfikenhet: -2 }, { nyfikenhet: -1, minne: 1 }], vem: 'bada', sed: { nyfikenhet: -2, forsiktighet: 1 } },
  sjuk: { text: 'Var svårt sjuk', chans: 0.05, e: [{ styrka: -1, empati: 2 }, { styrka: -2 }], vem: 'bada', sed: { gemenskap: 1 }, ande: true },
  foralder: { text: 'Miste sin förälder {om}', chans: 0.9, e: [{ empati: 2 }, { empati: -2 }, { flit: 2 }], vem: 'bada', sed: { gemenskap: 1 }, ande: true },
  syskon: { text: 'Miste {om}', chans: 0.7, e: [{ empati: 2 }, { karisma: -2 }], vem: 'bada', sed: { gemenskap: 1 }, kort: 'Miste någon nära', ande: true },
  sagDod: { text: 'Såg {om} dö', chans: 0.4, e: [{ mod: -2 }, { mod: -1, empati: 1 }], vem: 'bada', sed: { forsiktighet: 1 }, kort: 'Såg någon dö' },
  foraldralos: { text: 'Blev föräldralös och växte upp hos andra', chans: 0.9, e: [{ flit: 2, karisma: -1 }, { mod: 2, empati: -1 }], tidig: true, vem: 'barn', sed: { gemenskap: 2 } },
  skilsmassa: { text: 'Föräldrarna gick isär', chans: 0.7, e: [{ karisma: -2 }, { empati: -1, flit: 1 }], vem: 'barn', sed: { barn: -1 } },
  gral: { text: 'Föräldrarna grälade ofta', chans: 0.04, e: [{ empati: -2 }, { karisma: -1 }, { aggression: 2 }], vem: 'barn', sed: { barn: -1 } },
  syskonFodd: { text: 'Fick ett småsyskon, {om}', chans: 0.2, e: [{ empati: 2 }, { flit: 1 }], vem: 'barn', sed: { barn: 1 } },
  bestulen: { text: 'Blev bestulen av {om}', chans: 0.5, e: [{ empati: -1 }, { flit: 1 }, { aggression: 1, empati: -1 }], vem: 'bada', sed: { gemenskap: -1, rang: 1 } },
  tjuv: { text: 'Blev påkommen med att stjäla av {om}', chans: 0.5, e: [{ empati: 2 }, { karisma: -2 }], vem: 'bada' },
  hardVinter: { text: 'Var med om en hård vinter', chans: 0.5, e: [{ uthallighet: 2 }, { flit: 1, mod: -1 }, { empati: 1, flit: 1 }, { flit: 2 }], vem: 'bada', sed: { forsiktighet: 2, gemenskap: 1 }, ande: true }, // motgångarna (steg 3.8.1, motgang.ts)
  torka: { text: 'Var med om en torka', chans: 0.5, e: [{ uthallighet: 1, flit: 1 }, { empati: 1 }, { flit: 1, mod: -1 }, { uthallighet: 2 }], vem: 'bada', sed: { forsiktighet: 1 } }, // steg 3.8.2, torka.ts
  tornado: { text: 'Var med om en tornado', chans: 0.6, e: [{ mod: 1, flit: 1 }, { minne: 1 }, { mod: -2 }, { uthallighet: 1, flit: 1 }], vem: 'bada', sed: { gemenskap: 1, forsiktighet: 1 } }, // steg 3.8.4, tornado.ts
  brand: { text: 'Var med om en eldsvåda', chans: 0.5, e: [{ mod: 1, flit: 1 }, { minne: 1 }, { mod: -2 }, { empati: 1, flit: 1 }], vem: 'bada', sed: { gemenskap: 1, forsiktighet: 1 } }, // steg 3.8.5, brand.ts
  oversvamning: { text: 'Var med om en översvämning', chans: 0.5, e: [{ uthallighet: 1, flit: 1 }, { minne: 1 }, { mod: -1, flit: 1 }, { flit: 2 }], vem: 'bada', sed: { forsiktighet: 1 } }, // steg 3.8.3, flod.ts
  lek: { text: 'Lekte mycket på lekplatsen', chans: 0.003, e: [{ karisma: 2 }, { nyfikenhet: 2 }, { smidighet: 2 }, { karisma: 1, smidighet: 1 }], vem: 'barn', sed: { barn: 1 } }, // barn som tumlar blir smidigare (steg 3.7.6)
  bastaVan: { text: 'Hade en bästa vän, {om}', chans: 0.35, e: [{ karisma: 1, empati: 1 }, { karisma: 2 }], vem: 'barn' },
  mentor: { text: 'Fick lära sig av {om}', chans: 0.25, e: [{ intelligens: 1, minne: 1 }, { intelligens: 2 }, { nyfikenhet: 2 }], vem: 'barn', sed: { nyfikenhet: 1 }, kort: 'Fick lära sig av någon' },
  uppfinning: { text: 'Var med när byn {om}', chans: 0.06, e: [{ nyfikenhet: 2 }, { intelligens: 1, nyfikenhet: 1 }], vem: 'bada', sed: { nyfikenhet: 2 }, kort: 'Var med när byn kom på något' },
  trygg: { text: 'Växte upp tryggt i ett varmt hus', chans: 0.005, e: [{ mod: 1, karisma: 1 }, { nyfikenhet: 1, empati: 1 }, { aggression: -2 }], vem: 'barn', sed: { barn: 1 } },
  // en förälder som slår sitt barn (steg 3.2.3): det fastnar alltid och formar mycket, och mer om det händer igen
  slagen: { text: 'Blev slagen av {om}', chans: 1, e: [{ mod: -3, empati: -2 }, { karisma: -3, mod: -2 }, { empati: -3, flit: -2 }, { aggression: 3, empati: -2 }], vem: 'barn' },
  slagenIgen: { text: 'Blev slagen igen av {om}', chans: 1, e: [{ mod: -2, karisma: -2 }, { empati: -2, nyfikenhet: -2 }, { flit: -2, karisma: -2 }, { aggression: 3, mod: -1 }], vem: 'barn' },
  // vuxenlivet och fler upplevelser (steg 4.1.1.2, "Fler upplevelser" i designdokumentet): talen gäller en vuxen
  barnDod: { text: 'Miste sitt barn {om}', chans: 0.9, e: [{ empati: 1 }, { empati: -1 }, { flit: -1 }, { mod: -1 }], vem: 'vuxen', sed: { barn: 2 }, vuxenTal: true, ande: true, tung: true },
  ledFramgang: { text: 'Ledde byn till framgång', chans: 0.7, e: [{ karisma: 1 }, { mod: 1 }, { empati: -1 }], vem: 'vuxen', sed: { rang: 2 }, vuxenTal: true },
  ledFordarv: { text: 'Ledde byn i fördärvet', chans: 0.7, e: [{ mod: -1 }, { empati: 1 }, { karisma: -1 }], vem: 'vuxen', sed: { rang: -2 }, vuxenTal: true, ande: true },
  drabbad: { text: 'Drabbades själv av {om}', chans: 0.5, e: [{ uthallighet: 1 }, { mod: -1 }], vem: 'bada', sed: { forsiktighet: 1 }, vuxenTal: true, ande: true },
  vargbett: { text: 'Överlevde ett vargbett', chans: 0.5, e: [{ mod: -1 }, { uthallighet: 1 }], vem: 'bada', sed: { forsiktighet: 1 }, vuxenTal: true, ande: true },
  fallde: { text: 'Fällde en varg', chans: 0.5, e: [{ mod: 1 }, { aggression: 1 }], vem: 'bada', sed: { forsiktighet: -1 }, vuxenTal: true },
  usla: { text: 'Gjorde många usla saker', chans: 0.5, e: [{ flit: -1 }, { nyfikenhet: 1 }, { mod: -1 }], vem: 'bada', sed: { arbete: -1 }, vuxenTal: true },
  perfekta: { text: 'Gjorde {om}', chans: 0.5, e: [{ flit: 1 }, { karisma: 1 }, { nyfikenhet: -1 }], vem: 'bada', sed: { arbete: 1 }, kort: 'Gjorde fina saker', vuxenTal: true },
  egenTeknik: { text: 'Kom själv på {om}', chans: 0.5, e: [{ nyfikenhet: 1 }, { intelligens: 1 }], vem: 'bada', sed: { nyfikenhet: 2 }, kort: 'Kom själv på något', vuxenTal: true },
  raddade: { text: 'Räddade {om} från döden', chans: 0.5, e: [{ empati: 1 }, { mod: 1 }], vem: 'bada', sed: { gemenskap: 2 }, kort: 'Räddade någon från döden', vuxenTal: true },
  raddad: { text: 'Räddades från döden av {om}', chans: 0.5, e: [{ empati: 1 }, { karisma: 1 }], vem: 'bada', sed: { gemenskap: 2 }, vuxenTal: true, ande: true },
  dodade: { text: 'Dödade {om}', chans: 0.8, e: [{ aggression: 1 }, { empati: -1 }], vem: 'bada', sed: { rang: 1 }, kort: 'Dödade någon', vuxenTal: true, ande: true, tung: true },
  ranad: { text: 'Blev rånad av {om}', chans: 0.5, e: [{ mod: -1 }, { aggression: 1 }], vem: 'bada', sed: { rang: 1, forsiktighet: 1 }, vuxenTal: true },
  lamnad: { text: 'Blev lämnad av {om}', chans: 0.5, e: [{ empati: -1 }, { karisma: -1 }], vem: 'vuxen', sed: { gemenskap: -1 }, vuxenTal: true },
  oknamn: { text: 'Fick öknamnet {om}', chans: 0.5, e: [{ karisma: -1 }, { aggression: 1 }], vem: 'bada', vuxenTal: true },
  hedersnamn: { text: 'Fick hedersnamnet {om}', chans: 0.5, e: [{ mod: 1 }, { karisma: 1 }], vem: 'bada', vuxenTal: true },
  holdBarn: { text: 'Höll sina barn vid liv genom {om}', chans: 0.6, e: [{ flit: 1 }, { uthallighet: 1 }], vem: 'vuxen', sed: { barn: 1, arbete: 1 }, vuxenTal: true },
  flyttade: { text: 'Flyttade till en ny by', chans: 0.5, e: [{ nyfikenhet: 1 }, { mod: 1 }], vem: 'bada', sed: { nyfikenhet: 1 }, vuxenTal: true },
  barnFott: { text: 'Fick ett barn, {om}', chans: 0.4, e: [{ empati: 1 }, { flit: 1 }, { uthallighet: 1 }], vem: 'vuxen', sed: { barn: 1 }, vuxenTal: true, ande: true },
  gammal: { text: 'Blev gammal och såg alla jämnåriga dö', chans: 0.6, e: [{ empati: 1 }], vem: 'vuxen', sed: { nyfikenhet: -1 }, vuxenTal: true, ande: true },
  // det oförklarliga (steg 4.1.2.1, TECKEN i religion.ts): om = vad det var
  tecken: { text: 'Var med om något oförklarligt: {om}', chans: 0.5, e: [{ nyfikenhet: 1 }, { mod: -1 }, { minne: 1 }], vem: 'bada', sed: { forsiktighet: 1, nyfikenhet: -1 }, vuxenTal: true, ande: true },
  // de som formar sederna i stället för de gamla händelserna (steg 4.5.4.9)
  byggdeHus: { text: 'Byggde {om} tillsammans med andra', chans: 0.5, e: [{ empati: 1 }, { flit: 1 }], vem: 'bada', vuxenTal: true, sed: { gemenskap: 1 }, kort: 'Byggde ett hus tillsammans med andra' },
  forstaMastare: { text: 'Såg {om} bli byns första mästare', chans: 0.3, e: [{ nyfikenhet: 1 }, { flit: 1 }], vem: 'bada', vuxenTal: true, sed: { nyfikenhet: 1 }, kort: 'Såg någon bli byns första mästare' },
  overflod: { text: 'Levde i överflöd', chans: 0.01, e: [{ flit: -1 }, { karisma: 1 }], vem: 'bada', vuxenTal: true, sed: { arbete: -1 } },
  sorjde: { text: 'Sörjde {om}', chans: 0.5, e: [{ empati: 1 }, { mod: -1 }], vem: 'bada', vuxenTal: true, ande: true, sed: { forsiktighet: 1 }, kort: 'Sörjde någon' },
} satisfies Record<string, UpplevelseDef>;
export type UpplevelseTyp = keyof typeof UPPLEVELSER;
const DEF: Record<UpplevelseTyp, UpplevelseDef> = UPPLEVELSER;
// vilka seder upplevelsen drar åt och namnet utan {om} (fliken Seder, steg 4.5.4.9)
export const upplevelseSed = (k: UpplevelseTyp) => DEF[k].sed;
export const upplevelseKort = (k: UpplevelseTyp) => DEF[k].kort ?? DEF[k].text.replace(/[,:]? (av |genom )?\{om\}/, '');

// hur mycket en upplevelse formade (den svagaste trängs undan när listan är full)
const styrka = (u: Upplevelse) => Object.values(u.e).reduce((a, v) => a + Math.abs(v ?? 0), 0);
export const upplevelseText = (u: Upplevelse) => DEF[u.k].text.replace('{om}', u.om ?? '');
export const formas = (s: State, p: Person) => alive(p) && ageOf(p, s.now) < UPPV.alder;
// u är från vuxenlivet (steg 4.1.1.2); de andra är från barndomen
export const vuxenUpp = (u: Upplevelse) => u.v === 1;

// p.pot = anlagen plus upplevelserna, barndomen högst UPPV.tak och vuxenlivet högst UPPV.vuxenTak åt varje håll, inom 1–20
export function uppEffekt(p: Person, k: Stat) {
  let b = 0, v = 0;
  for (const u of p.upp ?? []) if (vuxenUpp(u)) v += u.e[k] ?? 0; else b += u.e[k] ?? 0;
  return Math.max(-UPPV.tak, Math.min(UPPV.tak, b)) + Math.max(-UPPV.vuxenTak, Math.min(UPPV.vuxenTak, v));
}
function raknaPot(p: Person) {
  for (const k of STATS) p.pot[k] = Math.max(1, Math.min(20, p.anlag![k] + uppEffekt(p, k)));
}
// chansen och effekten för ett barn eller en vuxen (steg 4.1.1.2)
function chansFor(d: UpplevelseDef, vuxen: boolean) {
  if (d.vuxenTal) return vuxen ? d.chans : Math.min(1, d.chans * 3);
  return vuxen ? d.chans * UPPV.vuxenChans : d.chans;
}
function effektFor(d: UpplevelseDef, e: Partial<Record<Stat, number>>, vuxen: boolean) {
  const ut: Partial<Record<Stat, number>> = {};
  for (const k in e) {
    const v = e[k as Stat]!;
    ut[k as Stat] = d.vuxenTal ? (vuxen ? v : v * 2) : vuxen ? Math.sign(v) * Math.max(1, Math.round(Math.abs(v) * UPPV.vuxenEffekt)) : v;
  }
  return ut;
}

// p var med om k (om = vad eller vem det gällde). Barn och vuxna formas efter raden (vem), varje slag en gång i barndomen och en
// gång i vuxenlivet; det fastnar med chansen i registret. Drar ur personens egen slumpföljd, så att inget annat ändras
export function upplev(s: State, p: Person, k: UpplevelseTyp, om?: string) {
  const d: UpplevelseDef = DEF[k];
  if (!alive(p)) return;
  const vuxen = !formas(s, p);
  if (d.vem === (vuxen ? 'barn' : 'vuxen') || (!vuxen && !d.tidig && ageOf(p, s.now) < UPPV.fran) || p.upp?.some(u => u.k === k && vuxenUpp(u) === vuxen)) return;
  if (rnd(s, 'uppvaxt', p) >= chansFor(d, vuxen)) return;
  const u: Upplevelse = { k, a: Math.floor(ageOf(p, s.now)), e: effektFor(d, pick(s, d.e, 'uppvaxt', p), vuxen), ...om ? { om } : {}, ...vuxen ? { v: 1 as const, t: s.now } : {} };
  if (d.ande) u.n = andeRiktning(s, p, vuxen); // andligheten (steg 4.1.1.3)
  const lista = [...p.upp ?? [], u];
  if (lista.filter(x => vuxenUpp(x) === vuxen).length > (vuxen ? UPPV.vuxenMax : UPPV.max)) {
    let svag = lista.length - 1; // vid lika styrka trängs den nya undan; bara bland dem från samma del av livet
    for (let i = lista.length - 2; i >= 0; i--) if (vuxenUpp(lista[i]) === vuxen && styrka(lista[i]) < styrka(lista[svag])) svag = i;
    lista.splice(svag, 1);
    if (!lista.includes(u)) return;
  }
  p.anlag ??= { ...p.pot };
  p.upp = lista;
  raknaPot(p);
  count(s, 'upp_' + k); if (vuxen) count(s, 'upp_vuxen');
  log(s, `${p.name}, ${talOrd(u.a)} år, ${liten(upplevelseText(u))}.`, 'rel', [p.id]);
}
// alla i byn var med om k (barnen och, sedan steg 4.1.1.2, de vuxna)
export function allaBarn(s: State, k: UpplevelseTyp, om?: string) { for (const q of living(s)) upplev(s, q, k, om); }
// barnen till a och b var med om k
export function barnTill(s: State, a: Person, b: Person | undefined, k: UpplevelseTyp, om?: string) {
  for (const q of living(s)) if (isParent(a, q) || (b && isParent(b, q))) upplev(s, q, k, om);
}

// när någon dör: den som miste en förälder (och blev föräldralös), ett barn, ett syskon, sin partner eller sin bästa vän, de som
// såg det, och den gamla som var den sista av sina jämnåriga
export function uppvaxtDod(s: State, p: Person) {
  for (const q of living(s)) {
    if (isParent(p, q)) {
      upplev(s, q, 'foralder', p.name);
      const annan = s.people.find(o => o !== p && isParent(o, q));
      if (!annan || !alive(annan)) upplev(s, q, 'foraldralos');
    } else if (isParent(q, p)) upplev(s, q, 'barnDod', p.name);
    else if ((q.mother !== undefined && q.mother === p.mother) || (q.father !== undefined && q.father === p.father)) upplev(s, q, 'syskon', `sitt syskon ${p.name}`);
    else if (q.partner === p.id) upplev(s, q, 'syskon', `sin partner ${p.name}`);
    else if (q.bast === p.id) upplev(s, q, 'syskon', `sin bästa vän ${p.name}`);
    else if (Math.hypot(q.x - p.x, q.y - p.y) <= UPPV.sagDod) upplev(s, q, 'sagDod', p.name);
    if (Math.abs(q.born - p.born) <= UPPV.jamnarig * DAY && ageOf(q, s.now) >= UPPV.gammal && !s.people.some(o => o !== q && o !== p && alive(o) && Math.abs(o.born - q.born) <= UPPV.jamnarig * DAY)) upplev(s, q, 'gammal');
  }
}
// en vägg i hus h rasade i en motgång (steg 4.1.1.2): ägaren och hens partner drabbades själva
export function drabbadHus(s: State, h: { ag?: number } | undefined, om: string) {
  if (h?.ag === undefined) return;
  for (const q of living(s)) if (q.id === h.ag || q.partner === h.ag) upplev(s, q, 'drabbad', om);
}
// ett nytt barn: de äldre syskonen får ett småsyskon, och föräldrarna har fått ett barn (steg 4.1.1.3)
export function uppvaxtFodd(s: State, ch: Person) {
  for (const q of living(s)) if (q.id === ch.mother || q.id === ch.father) upplev(s, q, 'barnFott', ch.name);
  for (const q of living(s)) if (q !== ch && q.mother !== undefined && q.mother === ch.mother && ageOf(q, s.now) >= UPPV.syskonFran) upplev(s, q, 'syskonFodd', ch.name);
}

// upplevelserna från vuxenlivet bleknar ett steg i taget och glöms till slut (steg 4.1.1.4); barndomen står kvar. u.b = stegen
// som redan tagits
function blekna(s: State, p: Person) {
  let andrat = false;
  for (const u of p.upp!) {
    if (!vuxenUpp(u) || u.t === undefined) continue;
    const steg = Math.floor((s.now - u.t) / (UPPV.blekna * DAY * (DEF[u.k].tung ? 2 : 1)));
    while ((u.b ?? 0) < steg) {
      u.b = (u.b ?? 0) + 1; andrat = true;
      for (const k of Object.keys(u.e) as Stat[]) { const v = u.e[k]!, ny = Math.sign(v) * (Math.abs(v) - 1); if (ny) u.e[k] = ny; else delete u.e[k]; }
      if (u.n) { const ny = Math.sign(u.n) * Math.max(0, Math.abs(u.n) - UPPV.bleknaAnde); if (ny) u.n = ny; else delete u.n; }
    }
  }
  if (!andrat) return;
  const kvar = p.upp!.filter(u => !vuxenUpp(u) || Object.keys(u.e).length || u.n);
  if (kvar.length < p.upp!.length) count(s, 'upp_glomd', p.upp!.length - kvar.length);
  p.upp = kvar;
  raknaPot(p);
}
// en gång i timmen (steg.ts, utan att ändra någon annans slump): nära svält eller köld, svårt sjuk, lek och trygghet
export function stepUppvaxt(s: State) {
  const overflod = foodDays(s) > UPPV.overflodDygn;
  for (const p of s.people) {
    if (alive(p)) { // det hen överlevt, i alla åldrar (steg 3.9.8)
      if (p.hunger <= 0 && p.health < UPPV.naraHalsa) livet(s, p, 'svalt', true);
      if (p.warm < KROPP.frysdod && p.health < UPPV.naraHalsa) livet(s, p, 'frys', true);
      if (isSick(p, s.now) && p.health < UPPV.sjukHalsa) livet(s, p, 'sjuk', true);
    }
    if (!alive(p) || ageOf(p, s.now) < UPPV.fran) continue;
    if (p.upp?.some(vuxenUpp)) blekna(s, p);
    if (p.hunger <= 0 && p.health < UPPV.naraHalsa) upplev(s, p, 'svalt'); // barn och vuxna (steg 4.1.1.2)
    if (p.warm < KROPP.frysdod && p.health < UPPV.naraHalsa) upplev(s, p, 'frys');
    if (isSick(p, s.now) && p.health < UPPV.sjukHalsa) upplev(s, p, 'sjuk');
    if (overflod) upplev(s, p, 'overflod');
    if (!formas(s, p)) continue;
    if (p.task?.act === 'leka' && p.task.phase === 'do') upplev(s, p, 'lek');
    if (p.hunger > UPPV.tryggMatt && p.warm > UPPV.tryggVarm && roomAt(s, p.x, p.y) && !p.upp?.some(u => u.k === 'svalt' || u.k === 'frys')) upplev(s, p, 'trygg');
  }
}
