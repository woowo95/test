// Blodet (Björn efter v93): blod som hamnar på marken i olika sammanhang och bleknar bort på ett par dygn. Det rör inte byns
// slumpföljder. Blod inne i byn sänker humöret hos dem som ser det, och mat i det ruttnar fortare (steg 3.6.10, smutsIByn och
// ruttSmuts i smuts.ts). Två register:
// - BLODFORM: hur blodet ligger (pöl, stänk, droppar, släpspår) och hur fort det bleknar.
// - BLOD: sammanhangen (slakt, skada, blödning, förblödning, jakt): vilka former de ger och hur mycket. Strid och annat som
//   blöder längre fram blir en ny rad här och ett anrop till blodas.
// Fläckarna ligger i s.blod. Ny blod av samma form nära en fläck läggs i den (mängden växer och den blir färskare), och en pöl
// som blivit för stor rinner över till en ny bredvid, så att mycket blod täcker ett större område. Bilden (ui/blod.ts) ritar
// alla fläckar i ett fält, så att pölar som ligger nära varandra flyter ihop till en större
import { HOUR, MIN, Person, SEC, State } from './typer';
import { clamp } from './slump';
import { balans } from './balans';

export const BLODET = balans('blod', {
  max: 300, // så många fläckar finns som mest; de äldsta tas bort först
  dropparVar: 20, // den som blöder tappar droppar var så här många minuter i spelet ...
  dropparMin: 0.02, // ... om hen blöder mer än så här i timmen (1 = allt blod) ...
  dropparPer: 3, dropparMax: 1.5, // ... så här mycket (droppar) för varje blod i timmen, och som mest så här mycket
});

interface FormDef { namn: string; bleknar: number; nara: number; max: number }
// bleknar = timmar tills en färsk fläck är borta; nara = inom så många rutor läggs nytt blod i samma fläck; max = så mycket
// ryms i en fläck, resten rinner över till en ny bredvid
export const BLODFORM = {
  pol: { namn: 'Pöl', bleknar: 48, nara: 0.45, max: 3 },
  stank: { namn: 'Stänk', bleknar: 30, nara: 0.3, max: 2 },
  droppar: { namn: 'Droppar', bleknar: 20, nara: 0.25, max: 2 },
  spar: { namn: 'Släpspår', bleknar: 36, nara: 0.2, max: 2 },
} satisfies Record<string, FormDef>;
export type BlodForm = keyof typeof BLODFORM;
const FORM: Record<string, FormDef> = BLODFORM;

interface SortDef { namn: string; delar: [BlodForm, number][]; sprid: number }
// delar = formerna och hur mycket av varje för en enhet (ett slaktat djur, en skada av grad 1, en timmes blödning);
// sprid = hur långt från platsen (rutor) de hamnar
export const BLOD = {
  slakt: { namn: 'Slakt', delar: [['pol', 0.7], ['stank', 0.8]], sprid: 0.3 },
  skada: { namn: 'Skada', delar: [['stank', 1], ['pol', 0.3]], sprid: 0.2 },
  blodning: { namn: 'Blödning', delar: [['droppar', 1]], sprid: 0.15 },
  forblodning: { namn: 'Förblödning', delar: [['pol', 2.5], ['stank', 0.5]], sprid: 0.1 },
  jakt: { namn: 'Jakt', delar: [['stank', 0.6], ['spar', 0.6]], sprid: 0.2 },
} satisfies Record<string, SortDef>;
export type BlodSort = keyof typeof BLOD;

// en fläck: platsen (rutor, med decimaler), formen, mängden m (1 = en vanlig fläck), när den kom (t, ms) och riktningen a
// (radianer) för stänk och spår som går åt ett håll
export interface Blodflack { x: number; y: number; f: BlodForm; m: number; t: number; a?: number }

export const blodOf = (s: State) => s.blod ?? [];
// hur färsk fläcken är nu: 1 = alldeles färsk, 0 = borta
export const blodNu = (b: Blodflack, now: number) => clamp(1 - (now - b.t) / (FORM[b.f]!.bleknar * HOUR), 0, 1);

// ett tal 0–1 som bara beror på a och b, utan byns slumpföljder
const hash = (a: number, b: number) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };

// mängd m av formen f vid (x, y): i en fläck av samma form nära, annars en ny. Det som inte ryms rinner över bredvid
// Platsen avrundas till åttondels rutor (bildens punkter) och talen så att en sparad by blir likadan
const r8 = (v: number) => Math.round(v * 8) / 8, r3 = (v: number) => Math.round(v * 1000) / 1000;
function lagg(s: State, f: BlodForm, x0: number, y0: number, m: number, a0: number | undefined, n = 0) {
  const d = FORM[f]!, ut = blodOf(s), x = r8(x0), y = r8(y0), a = a0 === undefined ? undefined : r3(a0);
  let b = ut.find(g => g.f === f && Math.hypot(g.x - x, g.y - y) < d.nara && blodNu(g, s.now) > 0);
  if (b) {
    const kvar = b.m * blodNu(b, s.now); // det gamla väger mindre ju mer det bleknat: fläcken blir färskare
    b.t = Math.round(s.now - (s.now - b.t) * kvar / (kvar + m));
    b.m = r3(b.m + m);
    if (a !== undefined) b.a = a;
  } else ut.push(b = { x, y, f, m: r3(m), t: s.now, ...(a !== undefined ? { a } : {}) });
  if (b.m > d.max && n < 6) {
    const over = r3(b.m - d.max), v = hash(x * 7 + n, y * 3 + s.now / MIN) * Math.PI * 2;
    b.m = d.max;
    lagg(s, f, b.x + Math.cos(v) * d.nara * 1.6, b.y + Math.sin(v) * d.nara * 1.2, over, a, n + 1);
  }
  s.blod = ut;
}

// blod av sorten sort vid (x, y), mangd enheter. riktning (radianer) säger åt vilket håll stänk och spår går; annars ett håll
// som bara beror på platsen och tiden. De som bleknat bort tas bort, och de äldsta om det blir för många
export function blodas(s: State, x: number, y: number, sort: BlodSort, mangd: number, riktning?: number) {
  if (!(mangd > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const def: SortDef = BLOD[sort];
  s.blod = blodOf(s).filter(b => blodNu(b, s.now) > 0);
  def.delar.forEach(([f, per], i) => {
    const h1 = hash(x * 13 + i, y * 17 + s.now / MIN), h2 = hash(y * 11 + i, x * 19 + s.now / MIN);
    const v = h1 * Math.PI * 2, r = def.sprid * h2;
    const a = f === 'stank' || f === 'spar' ? riktning ?? hash(x + i, y + s.now / HOUR) * Math.PI * 2 : undefined;
    lagg(s, f, x + Math.cos(v) * r, y + Math.sin(v) * r, mangd * per, a);
  });
  const ut = blodOf(s);
  if (ut.length > BLODET.max) s.blod = ut.sort((a, b) => b.t - a.t).slice(0, BLODET.max);
}

// den som blöder tappar droppar där hen går: en gång för varje gång klockan passerat en ny dropparVar-minut under steget,
// lika i levande läget och snabbläget
export function blodDroppar(s: State, p: Person, blodTim: number, dtSec: number) {
  if (blodTim < BLODET.dropparMin) return;
  const var_ = BLODET.dropparVar * MIN, n = Math.floor(s.now / var_) - Math.floor((s.now - dtSec * SEC) / var_);
  if (n > 0) blodas(s, p.x, p.y, 'blodning', n * Math.min(BLODET.dropparMax, BLODET.dropparPer * blodTim));
}

// hur blodigt det är vid stationen t (stationsfliken): det färskaste blodet på dess rutor och raden framför
export function blodVid(s: State, t: { x: number; y: number }, w: number, h: number) {
  let v = 0;
  for (const b of blodOf(s)) if (b.x >= t.x - 1 && b.x < t.x + w + 1 && b.y >= t.y && b.y < t.y + h + 1) v = Math.max(v, blodNu(b, s.now));
  return v;
}
