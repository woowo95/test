import { HOUR, MIN, Person, State } from './typer';
import { count, doingAct, forstaGang, log, ovning, stat, think } from './folk';
import { clamp, rnd } from './slump';
import { addDel } from './egendom';
import { amountOf, put, use } from './lager';
import { kanGoras, stationFor } from './stationer';
import { SAKER } from './saker';
import { balans } from './balans';

// ---------- matlagning (steg 2.8.1) ----------
// Byn lagar sin första mat på grillställningen (grill i STATIONER, stationer.ts): två grenar med en klyka var på var sin
// sida om elden och ett spett med vev emellan, av grenar och rep. Den monteras över elden som redan finns och används
// bara när elden brinner. Där grillas köttet och fisken (RATTER nedan), en råvara i taget, till en enkel rätt som håller
// längre och äts först (mat och haller i saker.ts). Alla kan grilla, men en ovan kock bränner en del av maten, och den är
// förstörd; färdigheten Matlagning växer när man grillar. Den som äter rått kött eller rå fisk blir lite sur av det, och
// kan bli matförgiftad (ratt nedan, från eat i behov.ts). Rå växtmat (bär, rötter, svamp) gör inget. Att en skicklig kock
// gör maten godare väntar på kvaliteten (steg 2.2.2). Allt räknas i arbetstimmar, likadant i båda lägena.

// ---------- balanstal (regel 8) ----------
export const MATLAG = balans('matlagning', {
  timme: 8, // så många av råvaran som grillas i timmen
  maxTim: 1, // ett pass vid grillen är högst så här många timmar
  min: 1, // byn grillar när det finns så mycket rått att grilla
  brann: 0.3, // en helt ovan kock bränner så stor del av maten ...
  brannFull: 10, // ... och den med färdigheten Matlagning så här hög bränner inget
  ovning: 0.15, // färdigheten växer så här mycket per timme vid grillen (gånger 0,4 + intelligens / 20)
  sjuk: 0.015, // chansen att bli matförgiftad av en hel portion rått kött eller rå fisk
  sjukMin: 2, sjukSpann: 4, // matförgiftad i så många timmar (min + slump × spann)
  surt: -0.03, surtTim: 4, // tanken av att äta rått kött eller rå fisk, och hur länge den varar (timmar)
  forgiftad: -0.2, // tanken av att bli matförgiftad (ett halvt dygn)
});

// Rätterna: råvaran som grillas, rätten den blir och hur mycket (per styck). I den ordning de grillas: det som förstörs
// fortast först. En ny rätt blir en rad här och en sak i saker.ts
export interface Ratt { ra: string; blir: string; per: number }
export const RATTER: readonly Ratt[] = [
  { ra: 'fisk', blir: 'grillfisk', per: 1 },
  { ra: 'abborre', blir: 'grillfisk', per: 1 }, // den hela abborren grillas som den är när den inte rensats
  { ra: 'kott', blir: 'grillkott', per: 1 },
];
// det som grillas nu: den första råvaran det finns tillräckligt av (gränssnittet visar den på spettet)
export const grillVara = (s: State) => RATTER.find(r => amountOf(s, r.ra) >= MATLAG.min);
// p kan grilla: byn har grillen, elden brinner, det finns något att grilla och ingen annan grillar
export const kanGrilla = (s: State, p: Person) => kanGoras(s, 'grilla') && s.fire.lit && !!grillVara(s) && !doingAct(s, 'grilla', p);
// hur länge ett pass vid grillen varar
export const grillTid = (s: State) => { const r = grillVara(s); return Math.min(MATLAG.maxTim * HOUR, (r ? amountOf(s, r.ra) / MATLAG.timme : 0) * HOUR + 5 * MIN); };
// så stor del av maten p bränner
export const brannDel = (p: Person) => MATLAG.brann * clamp(1 - (p.skill.matlagning ?? 0) / MATLAG.brannFull, 0, 1);

// grilla i hours timmar. Rätten är deras som ägde råvaran; det som bränns är förstört
export function grilla(s: State, p: Person, hours: number) {
  const r = grillVara(s);
  if (!r || !s.fire.lit || !kanGoras(s, 'grilla')) { if (p.task) p.task.until = s.now; return; }
  const n = Math.min(hours * MATLAG.timme, amountOf(s, r.ra));
  if (n <= 0) return;
  const vems = use(s, p, r.ra, n), f = (1 - brannDel(p)) * r.per;
  put(s, r.blir, n * f, addDel({}, vems, f));
  count(s, 'grillat', n); count(s, 'brant', n * brannDel(p));
  ovning(p, 'matlagning', hours * MATLAG.ovning * (0.4 + stat(p, 'intelligens', s.now) / 20));
  if (forstaGang(s, 'grillForsta')) log(s, `${p.name} grillade byns första ${SAKER[r.ra]!.namn.toLowerCase()} på spettet över elden.`, 'world', [p.id]);
}
// grillen står över elden (stationer.ts)
export const grillen = (s: State) => stationFor(s, 'grilla');

// ---------- rått kött och rå fisk ----------
// p har ätit per (av varje slag, behov.ts) av en portion full: det råa köttet och den råa fisken (ra i saker.ts) gör en lite
// sur och kan ge matförgiftning, oftare ju mer av portionen som var rå. En dragning bara när något rått ätits
export function ratt(s: State, p: Person, per: Record<string, number>, full: number) {
  let ra = 0;
  for (const k in per) if (SAKER[k]?.ra) ra += per[k];
  if (ra <= 1e-9) return;
  count(s, 'rattAtit', ra);
  think(p, 'Åt rått', MATLAG.surt, s.now, MATLAG.surtTim * HOUR);
  if (rnd(s, 'halsa', p) >= ra / full * MATLAG.sjuk) return;
  p.sickUntil = Math.max(p.sickUntil ?? 0, s.now + (MATLAG.sjukMin + rnd(s, 'halsa', p) * MATLAG.sjukSpann) * HOUR); p.sickWhy = 'Matförgiftad av rått kött';
  think(p, 'Blev matförgiftad av rått kött', MATLAG.forgiftad, s.now, 12 * HOUR);
  count(s, 'matforgiftad');
  log(s, `${p.name} blev matförgiftad av rått kött.`, 'world', [p.id]);
}
