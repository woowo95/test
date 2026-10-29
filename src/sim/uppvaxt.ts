import { KROPP, ageOf, alive, count, isParent, isSick, living, log } from './folk';
import { pick, rnd } from './slump';
import { Person, STATS, Stat, State, Upplevelse } from './typer';
import { roomAt } from './byggnad';
import { balans } from './balans';

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
});

// ---------- upplevelserna (registret) ----------
// text: raden i personrutan ({om} = vad eller vem det gällde), chans: att det fastnar när det händer (för det som prövas
// varje timme: chansen per timme), e: vad det kan göra med egenskaperna, ett av alternativen slumpas, tidig: formar också
// den som är yngre än UPPV.fran
interface UpplevelseDef { text: string; chans: number; e: Partial<Record<Stat, number>>[]; tidig?: true }
export const UPPLEVELSER = {
  skadad: { text: 'Skadades svårt: {om}', chans: 0.6, e: [{ mod: -2 }, { uthallighet: 2 }, { mod: -1, uthallighet: 1 }] },
  svalt: { text: 'Var nära att svälta ihjäl', chans: 0.3, e: [{ flit: 2 }, { flit: 1, empati: -1 }] },
  frys: { text: 'Var nära att frysa ihjäl', chans: 0.3, e: [{ flit: 1, mod: -1 }, { uthallighet: 2 }] },
  svamp: { text: 'Blev förgiftad av svamp', chans: 0.6, e: [{ nyfikenhet: -2 }, { nyfikenhet: -1, minne: 1 }] },
  sjuk: { text: 'Var svårt sjuk', chans: 0.05, e: [{ styrka: -1, empati: 2 }, { styrka: -2 }] },
  foralder: { text: 'Miste sin förälder {om}', chans: 0.9, e: [{ empati: 2 }, { empati: -2 }, { flit: 2 }] },
  syskon: { text: 'Miste {om}', chans: 0.7, e: [{ empati: 2 }, { karisma: -2 }] },
  sagDod: { text: 'Såg {om} dö', chans: 0.4, e: [{ mod: -2 }, { mod: -1, empati: 1 }] },
  foraldralos: { text: 'Blev föräldralös och växte upp hos andra', chans: 0.9, e: [{ flit: 2, karisma: -1 }, { mod: 2, empati: -1 }], tidig: true },
  skilsmassa: { text: 'Föräldrarna gick isär', chans: 0.7, e: [{ karisma: -2 }, { empati: -1, flit: 1 }] },
  gral: { text: 'Föräldrarna grälade ofta', chans: 0.04, e: [{ empati: -2 }, { karisma: -1 }, { aggression: 2 }] },
  syskonFodd: { text: 'Fick ett småsyskon, {om}', chans: 0.2, e: [{ empati: 2 }, { flit: 1 }] },
  bestulen: { text: 'Blev bestulen av {om}', chans: 0.5, e: [{ empati: -1 }, { flit: 1 }, { aggression: 1, empati: -1 }] },
  tjuv: { text: 'Blev påkommen med att stjäla av {om}', chans: 0.5, e: [{ empati: 2 }, { karisma: -2 }] },
  lek: { text: 'Lekte mycket på lekplatsen', chans: 0.003, e: [{ karisma: 2 }, { nyfikenhet: 2 }, { smidighet: 2 }, { karisma: 1, smidighet: 1 }] }, // barn som tumlar blir smidigare (steg 3.7.6)
  bastaVan: { text: 'Hade en bästa vän, {om}', chans: 0.35, e: [{ karisma: 1, empati: 1 }, { karisma: 2 }] },
  mentor: { text: 'Fick lära sig av {om}', chans: 0.25, e: [{ intelligens: 1, minne: 1 }, { intelligens: 2 }, { nyfikenhet: 2 }] },
  uppfinning: { text: 'Var med när byn {om}', chans: 0.06, e: [{ nyfikenhet: 2 }, { intelligens: 1, nyfikenhet: 1 }] },
  trygg: { text: 'Växte upp tryggt i ett varmt hus', chans: 0.005, e: [{ mod: 1, karisma: 1 }, { nyfikenhet: 1, empati: 1 }, { aggression: -2 }] },
  // en förälder som slår sitt barn (steg 3.2.3): det fastnar alltid och formar mycket, och mer om det händer igen
  slagen: { text: 'Blev slagen av {om}', chans: 1, e: [{ mod: -3, empati: -2 }, { karisma: -3, mod: -2 }, { empati: -3, flit: -2 }, { aggression: 3, empati: -2 }] },
  slagenIgen: { text: 'Blev slagen igen av {om}', chans: 1, e: [{ mod: -2, karisma: -2 }, { empati: -2, nyfikenhet: -2 }, { flit: -2, karisma: -2 }, { aggression: 3, mod: -1 }] },
} satisfies Record<string, UpplevelseDef>;
export type UpplevelseTyp = keyof typeof UPPLEVELSER;
const DEF: Record<UpplevelseTyp, UpplevelseDef> = UPPLEVELSER;

// hur mycket en upplevelse formade (den svagaste trängs undan när listan är full)
const styrka = (u: Upplevelse) => Object.values(u.e).reduce((a, v) => a + Math.abs(v ?? 0), 0);
export const upplevelseText = (u: Upplevelse) => DEF[u.k].text.replace('{om}', u.om ?? '');
export const formas = (s: State, p: Person) => alive(p) && ageOf(p, s.now) < UPPV.alder;

// p.pot = anlagen plus upplevelserna, högst UPPV.tak åt varje håll, inom 1–20
export function uppEffekt(p: Person, k: Stat) {
  let v = 0;
  for (const u of p.upp ?? []) v += u.e[k] ?? 0;
  return Math.max(-UPPV.tak, Math.min(UPPV.tak, v));
}
function raknaPot(p: Person) {
  for (const k of STATS) p.pot[k] = Math.max(1, Math.min(20, p.anlag![k] + uppEffekt(p, k)));
}

// p var med om k (om = vad eller vem det gällde). Bara barn formas, och varje slag bara en gång; det fastnar med chansen i
// registret. Drar ur personens egen slumpföljd, så att inget annat ändras
export function upplev(s: State, p: Person, k: UpplevelseTyp, om?: string) {
  const d = DEF[k];
  if (!formas(s, p) || (!d.tidig && ageOf(p, s.now) < UPPV.fran) || p.upp?.some(u => u.k === k)) return;
  if (rnd(s, 'uppvaxt', p) >= d.chans) return;
  const u: Upplevelse = { k, a: Math.floor(ageOf(p, s.now)), t: s.now, e: { ...pick(s, d.e, 'uppvaxt', p) }, ...om ? { om } : {} };
  const lista = [...p.upp ?? [], u];
  if (lista.length > UPPV.max) {
    let svag = lista.length - 1; // vid lika styrka trängs den nya undan
    for (let i = lista.length - 2; i >= 0; i--) if (styrka(lista[i]) < styrka(lista[svag])) svag = i;
    lista.splice(svag, 1);
    if (!lista.includes(u)) return;
  }
  p.anlag ??= { ...p.pot };
  p.upp = lista;
  raknaPot(p);
  count(s, 'upp_' + k);
  log(s, `${p.name} (${u.a} år): ${upplevelseText(u)}.`, 'rel', [p.id]);
}
// alla barn i byn var med om k
export function allaBarn(s: State, k: UpplevelseTyp, om?: string) { for (const q of living(s)) upplev(s, q, k, om); }
// barnen till a och b var med om k
export function barnTill(s: State, a: Person, b: Person | undefined, k: UpplevelseTyp, om?: string) {
  for (const q of living(s)) if (isParent(a, q) || (b && isParent(b, q))) upplev(s, q, k, om);
}

// när någon dör: barnet som miste en förälder (och blev föräldralös), ett syskon eller sin bästa vän, och barnen som såg det
export function uppvaxtDod(s: State, p: Person) {
  for (const q of living(s)) {
    if (!formas(s, q)) continue;
    if (isParent(p, q)) {
      upplev(s, q, 'foralder', p.name);
      const annan = s.people.find(o => o !== p && isParent(o, q));
      if (!annan || !alive(annan)) upplev(s, q, 'foraldralos');
    } else if ((q.mother !== undefined && q.mother === p.mother) || (q.father !== undefined && q.father === p.father)) upplev(s, q, 'syskon', `sitt syskon ${p.name}`);
    else if (q.bast === p.id) upplev(s, q, 'syskon', `sin bästa vän ${p.name}`);
    else if (Math.hypot(q.x - p.x, q.y - p.y) <= UPPV.sagDod) upplev(s, q, 'sagDod', p.name);
  }
}
// ett nytt barn: de äldre syskonen får ett småsyskon
export function uppvaxtFodd(s: State, ch: Person) {
  for (const q of living(s)) if (q !== ch && q.mother !== undefined && q.mother === ch.mother && ageOf(q, s.now) >= UPPV.syskonFran) upplev(s, q, 'syskonFodd', ch.name);
}

// en gång i timmen (steg.ts, utan att ändra någon annans slump): nära svält eller köld, svårt sjuk, lek och trygghet
export function stepUppvaxt(s: State) {
  for (const p of s.people) {
    if (!formas(s, p) || ageOf(p, s.now) < UPPV.fran) continue;
    if (p.hunger <= 0 && p.health < UPPV.naraHalsa) upplev(s, p, 'svalt');
    if (p.warm < KROPP.frysdod && p.health < UPPV.naraHalsa) upplev(s, p, 'frys');
    if (isSick(p, s.now) && p.health < UPPV.sjukHalsa) upplev(s, p, 'sjuk');
    if (p.task?.act === 'leka' && p.task.phase === 'do') upplev(s, p, 'lek');
    if (p.hunger > UPPV.tryggMatt && p.warm > UPPV.tryggVarm && roomAt(s, p.x, p.y) && !p.upp?.some(u => u.k === 'svalt' || u.k === 'frys')) upplev(s, p, 'trygg');
  }
}
