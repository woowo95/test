import { ALDER, ageOf, count, getRel, living, log, stat, think } from './folk';
import { halsa } from './halsa';
import { clamp, gauss, rnd } from './slump';
import { isLight } from './tid';
import { Ting, tingOf } from './agande';
import { Act } from './handlingar';
import { SAKER } from './saker';
import { DAY, HOUR, MIN, Person, State, Task } from './typer';
import { formogenheter } from './varde';
import { balans } from './balans';

// Humöret (steg 3.2, "Humör, psykiskt mående och ondska" i designdokumentet): ett grundläge, behoven och tankarna
// (think i folk.ts), och förväntningarna (steg 3.2.1). Var och en vänjer sig långsamt vid sin rikedom, värdet av det hen
// äger plus en del av byns gemensamma. Den som blivit rikare än hen är van vid blir gladare och den som blivit fattigare
// ledsnare, och den som är van vid mycket kräver mer för att vara glad. Så blir en rik by inte glad bara av att vara rik,
// och en by som går dåligt vänjer sig.
// Utbrotten (steg 3.2.2): den som mår mycket dåligt kan brista ut. Risken varje timme växer ju lägre humöret är och ju fler
// utbrott hen haft nyss, och hur allvarligt det blir beror också på empatin och slumpen. Behoven går före (val.ts), och efter
// ett utbrott mår man lite bättre en stund.

// ---------- balanstal (regel 8) ----------
export const HUMOR = balans('humor', {
  bas: 0.55, // grundhumöret
  hungerLag: 0.2, hungerMinus: 0.2, // hungern under 0,2 drar ner humöret med 0,2 ...
  hungerHog: 0.6, hungerPlus: 0.05, // ... och över 0,6 upp 0,05
  viloLag: 0.2, viloMinus: 0.12,
  socialLag: 0.2, socialMinus: 0.1,
  socialHog: 0.7, socialPlus: 0.05,
  halsaLag: 0.6, halsaMinus: 0.12,
  // förväntningarna (steg 3.2.1)
  forvDygn: 5, // förväntningen glider mot rikedomen; efter så här många dygn har en ändring nästan två tredjedelar slagit igenom
  forvC: 30, // läggs till både rikedom och förväntan, så att den som äger nästan inget inte svänger av småsaker
  rikare: 0.06, rikareMax: 0.1, // rikare eller fattigare än man är van vid: rikare * ln((rikedom + forvC) / (förväntan + forvC)), högst ± rikareMax
  normal: 150, // en vanlig förväntan (ungefär vad en vuxen äger i en by som klarar sig), som inte ger något
  van: 0.04, vanMax: 0.1, // van vid mer eller mindre än normal: −van * ln((förväntan + forvC) / (normal + forvC)), högst ± vanMax
  visa: 0.01, // mindre än så här räknas inte
  // utbrotten (steg 3.2.2)
  grans: 0.35, // under detta humör finns en risk för utbrott
  risk: 0.03, // risken i timmen (på dagen) vid humöret 0; vid gränsen 0, rakt emellan
  eskal: 0.5, // varje utbrott nyss ökar risken med så stor del
  utbDygn: 3, // utbrotten nyss klingar av: efter så här många dygn är ett nästan två tredjedelar glömt
  vantar: 6, // timmar ett utbrott väntar på att behoven är klara (annars blir det inget)
  grad2: 0.75, // allvaret (hur långt under gränsen, delat med gränsen, plus det nedan) från vilket det blir grad 2
  allvUtb: 0.15, // allvaret ökar så mycket per utbrott nyss
  allvEmp: 0.3, // ... och med (10 − empatin) / 10 gånger så mycket
  allvSlump: 0.25, // ... och med slumpen (gauss) gånger så mycket
  lattnad: 0.1, lattnadTim: 6, // "Fick ur mig det": så mycket bättre humör i så många timmar efter ett utbrott
  elakHumor: 0.08, elakTim: 12, // den som någon var elak mot: så mycket sämre humör i så många timmar
  elakOp: 6, // ... och relationen sjunker så mycket
  malAvst: 15, // den man är elak mot är den närmaste inom så många rutor
});

// ---------- utbrotten (steg 3.2.2) ----------
// slagen av utbrott: graden (1 lindrigast), handlingen (handlingar.ts), hur länge (minuter: min plus upp till spann) och vad
// som hände (loggen). `mal` säger om det behövs någon att vara elak mot och `ting` om det behövs en sak att slå sönder
export const UTBROTT = {
  grata: { grad: 1, act: 'grata', min: 20, spann: 20, text: 'brister i gråt' },
  tjura: { grad: 1, act: 'tjura', min: 60, spann: 60, text: 'går undan och tjurar' },
  elak: { grad: 2, act: 'elak', min: 10, spann: 10, text: 'är elak mot', mal: true },
  krossa: { grad: 2, act: 'krossa', min: 10, spann: 10, text: 'slår sönder', ting: true },
  fly: { grad: 2, act: 'fly', min: 90, spann: 90, text: 'flyr ut i skogen' },
} satisfies Record<string, { grad: number; act: Act; min: number; spann: number; text: string; mal?: true; ting?: true }>;
export type Utbrott = keyof typeof UTBROTT;
type UtbRad = (typeof UTBROTT)[Utbrott] & { mal?: true; ting?: true };
const UTB_LISTA = Object.keys(UTBROTT) as Utbrott[];
export const UTBROTT_ACTS = [...new Set(UTB_LISTA.map(k => UTBROTT[k].act))] as Act[];

// den närmaste p kan vara elak mot, och en sak p kan slå sönder (sin egen helst, annars byns; ingen som någon har i handen,
// på sig eller i en börda)
export function utbMal(s: State, p: Person) {
  let b: Person | undefined, bd = HUMOR.malAvst;
  for (const q of living(s)) { if (q === p || ageOf(q, s.now) < ALDER.smabarn) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; b = q; } }
  return b;
}
export function utbTing(s: State, p: Person): Ting | undefined {
  const fria = tingOf(s).filter(t => t.hos === undefined && t.bar === undefined && t.lass === undefined && !t.halv);
  const egna = fria.filter(t => t.agare === p.id);
  const av = egna.length ? egna : fria.filter(t => t.agare === 0);
  return av.length ? av[Math.floor(rnd(s, 'humor', p) * av.length)] : undefined;
}

// utbrottet som väntar hos p (eller inget, om det väntat för länge): slaget, med vem eller vad, och hur länge
export function utbrottNu(s: State, p: Person): { k: Utbrott; rad: UtbRad; dur: number; mal?: Person; ting?: Ting } | undefined {
  const u = p.ubr;
  if (!u) return;
  if (s.now - u.t > HUMOR.vantar * HOUR || !(u.k in UTBROTT)) { p.ubr = undefined; return; }
  let k = u.k as Utbrott, rad: UtbRad = UTBROTT[k];
  const mal = rad.mal ? utbMal(s, p) : undefined, ting = rad.ting ? utbTing(s, p) : undefined;
  if ((rad.mal && !mal) || (rad.ting && !ting)) { k = 'tjura'; rad = UTBROTT.tjura; } // ingen att vara elak mot, inget att slå sönder
  p.ubr = undefined;
  return { k, rad, mal, ting, dur: (rad.min + rnd(s, 'humor', p) * rad.spann) * MIN };
}

// när utbrottet börjar: loggen, statistiken och den som får ta emot det
export function utbrottBorjar(s: State, p: Person, k: Utbrott, mal?: Person, ting?: Ting) {
  const rad: UtbRad = UTBROTT[k];
  count(s, 'utbrott'); count(s, 'utb_' + k);
  p.utb = (p.utb ?? 0) + 1;
  if (mal) {
    think(mal, `${p.name} var elak mot mig`, -HUMOR.elakHumor, s.now, HUMOR.elakTim * HOUR);
    getRel(s, p, mal).op -= HUMOR.elakOp;
    log(s, `${p.name} mår dåligt och ${rad.text} ${mal.name}.`, 'rel', [p.id, mal.id]);
  } else log(s, `${p.name} mår dåligt och ${rad.text}${ting ? (ting.agare === p.id ? ' sin egen ' : ' byns ') + (SAKER[ting.k]?.namn ?? ting.k).toLowerCase() : ''}.`, 'rel', [p.id]);
}

// när utbrottet är över (steg.ts): saken är sönder, och man mår lite bättre
export function utbrottKlar(s: State, p: Person, t: Task) {
  if (t.act === 'krossa' && t.ref !== undefined) {
    const x = tingOf(s).find(q => q.id === t.ref && q.hos === undefined && q.bar === undefined && q.lass === undefined);
    if (x) { s.ting = tingOf(s).filter(q => q !== x); count(s, 'utb_sonder_' + x.k); }
  }
  think(p, 'Fick ur mig det', HUMOR.lattnad, s.now, HUMOR.lattnadTim * HOUR);
}

// en gång i timmen (stepHumor): utbrotten nyss klingar av, och den vuxne som mår mycket dåligt kan brista ut. Graden beror på
// hur dåligt hen mår, utbrotten nyss, empatin och slumpen; slaget slumpas bland dem med den graden
function utbrottRisk(s: State, p: Person, ljust: boolean) {
  if (p.utb) { p.utb *= Math.exp(-HOUR / (HUMOR.utbDygn * DAY)); if (p.utb < 0.01) p.utb = undefined; }
  if (!ljust || p.ubr || ageOf(p, s.now) < ALDER.vuxen) return;
  const m = moodOf(p, s.now);
  if (m >= HUMOR.grans) return;
  const djup = (HUMOR.grans - m) / HUMOR.grans, utb = p.utb ?? 0;
  if (rnd(s, 'humor', p) >= HUMOR.risk * djup * (1 + HUMOR.eskal * utb)) return;
  const allv = djup + HUMOR.allvUtb * utb + HUMOR.allvEmp * (10 - stat(p, 'empati', s.now)) / 10 + HUMOR.allvSlump * gauss(s, 'humor', p);
  const grad = allv >= HUMOR.grad2 ? 2 : 1;
  const av = UTB_LISTA.filter(k => UTBROTT[k].grad === grad);
  p.ubr = { k: av[Math.floor(rnd(s, 'humor', p) * av.length)], t: s.now };
}


// ---------- humöret ----------
// snitthumöret i byn; `tom` är värdet när ingen lever
export function avgMood(s: State, tom: number) { const l = living(s); return l.length ? l.reduce((a, p) => a + moodOf(p, s.now), 0) / l.length : tom; }
// humöret och, om ut finns med, delarna det består av (personrutan visar dem). Samma räkning i båda fallen
export function moodOf(p: Person, now: number, ut?: { namn: string; v: number }[]) {
  let m = HUMOR.bas;
  const del = (namn: string, v: number) => { m += v; ut?.push({ namn, v }); };
  if (p.hunger < HUMOR.hungerLag) del('Hungrig', -HUMOR.hungerMinus); else if (p.hunger > HUMOR.hungerHog) del('Mätt', HUMOR.hungerPlus);
  if (p.rest < HUMOR.viloLag) del('Trött', -HUMOR.viloMinus);
  if (p.social < HUMOR.socialLag) del('Ensam', -HUMOR.socialMinus); else if (p.social > HUMOR.socialHog) del('Umgåtts mycket', HUMOR.socialPlus);
  if (halsa(p) < HUMOR.halsaLag) del('Mår dåligt', -HUMOR.halsaMinus);
  if (p.forv) {
    const r = forvRikare(p.forv), v = forvVan(p.forv.f);
    if (Math.abs(r) >= HUMOR.visa) del(r > 0 ? 'Rikare än förut' : 'Fattigare än förut', r);
    if (Math.abs(v) >= HUMOR.visa) del(v < 0 ? 'Van vid mer' : 'Van vid lite', v);
  }
  for (const t of p.thoughts) if (t.until > now) del(t.text, t.v);
  return clamp(m, 0, 1);
}

// ---------- förväntningarna (steg 3.2.1) ----------
const forvRikare = (f: { f: number; w: number }) => clamp(HUMOR.rikare * Math.log((f.w + HUMOR.forvC) / (f.f + HUMOR.forvC)), -HUMOR.rikareMax, HUMOR.rikareMax);
const forvVan = (f: number) => clamp(-HUMOR.van * Math.log((f + HUMOR.forvC) / (HUMOR.normal + HUMOR.forvC)), -HUMOR.vanMax, HUMOR.vanMax);

// en gång i timmen (steg.ts): utbrotten (utbrottRisk) och var och ens rikedom (w) och förväntan (f). Ett barn räknar med föräldrarnas rikedom
// (den rikaste av dem som lever), eftersom det lever på deras. Den som är ny börjar med förväntan lika med rikedomen
export function stepHumor(s: State) {
  const folk = living(s);
  if (!folk.length) return;
  const { egen, byn } = formogenheter(s), del = byn / folk.length;
  const vuxen = (p: Person) => (egen.get(p.id) ?? 0) + del;
  const ids = new Set(folk.map(p => p.id));
  const k = 1 - Math.exp(-HOUR / (HUMOR.forvDygn * DAY)), ljust = isLight(s.now);
  for (const p of folk) {
    let w = vuxen(p);
    if (ageOf(p, s.now) < ALDER.vuxen) {
      const f = [p.mother, p.father].filter(id => id !== undefined && ids.has(id)).map(id => vuxen(folk.find(q => q.id === id)!));
      if (f.length) w = Math.max(...f);
    }
    if (!p.forv) p.forv = { f: w, w };
    else { p.forv.w = w; p.forv.f += (w - p.forv.f) * k; }
    utbrottRisk(s, p, ljust);
  }
}
