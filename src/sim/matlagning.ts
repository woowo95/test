import { DAY, HOUR, MIN, Person, State } from './typer';
import { alive, byId, count, doingAct, forstaGang, living, log, ovning, stat, think } from './folk';
import { clamp, rnd } from './slump';
import { Del, addDel } from './egendom';
import { amountOf, put, use } from './lager';
import { Station, isKlar, kanGoras, stationFor, stationerOf } from './stationer';
import { EKONOMI } from './ekonomi';
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

// ---------- torkning (steg 2.8.2) ----------
// Torkställningen (tork i STATIONER, stationer.ts) är två A av korsade grenar som bär en lång slå, surrad med rep. Den står
// ute nära elden. Det kött och den fisk som byn inte hinner äta innan det ruttnar hängs upp på slån (köttet i remsor och
// abborren i stjärten) och torkar där på TORK.dygn dygn. Medan det hänger ruttnar det inte. Det torkade tas ner till lagret
// och håller så länge något får hålla där (LAGER.maxDygn), och det äts sist (mat i saker.ts). Att hänga upp och ta ner är
// en handling (torka), i arbetstimmar, likadant i båda lägena. Det som hänger är deras som ägde råvaran; den som dött
// har inget kvar där, och det blir byns när det tas ner.
// En ställning rymmer TORK.rymd (fyra köttbitar, steg 2.10.22). Har byn mer över än det får plats på ställningarna bygger den
// en till (torkBrist, projekt.ts), högst TORK.maxStall. Den som torkar hänger upp på och tar ner från alla ställningar.
// Frysningen: under istiden fryser maten i lagret och ruttnar bara LAGER.frost så fort (ruttTemp i lager.ts, sedan v60);
// det syns som ❄ i lagret och på saken.
export const TORK = balans('torkning', {
  dygn: 5, // så många dygn tar det att torka kött och fisk på ställningen
  rymd: 4, // så mycket ryms på en ställning (fyra köttbitar, steg 2.10.22)
  maxStall: 4, // byn bygger högst så här många ställningar
  timme: 12, // så mycket som hängs upp eller tas ner i timmen
  maxTim: 1, // ett pass vid ställningen är högst så här många timmar
  spara: 1, // så många dygns mat för alla i byn behålls rått (det äts innan det ruttnar); resten hängs upp
  min: 1, // byn hänger upp när det finns så här mycket över
});
// det som torkas och vad det blir. I den ordning det hängs upp: det som ruttnar fortast först. En ny rad här och en sak i saker.ts
export const TORKAS: readonly Ratt[] = [
  { ra: 'fisk', blir: 'torrfisk', per: 1 },
  { ra: 'abborre', blir: 'torrfisk', per: 1 }, // den hela abborren hängs i stjärten
  { ra: 'kott', blir: 'torrkott', per: 1 },
];
export type Hang = NonNullable<Station['tork']>[number];
// byns färdiga torkställningar, och den första av dem
export const torkarna = (s: State) => stationerOf(s).filter(t => isKlar(t) && t.k === 'tork');
export const torken = (s: State): Station | undefined => torkarna(s)[0];
const hangOf = (t: Station) => t.tork ?? (t.tork = []);
const hangtSumma = (t?: Station) => { let n = 0; for (const q of t?.tork ?? []) n += q.n; return n; };
// hur stor del av torkningen som är gjord (0–1): gränssnittet färgar maten efter det
export const torrDel = (s: State, q: Hang) => clamp((s.now - q.t) / (TORK.dygn * DAY), 0, 1);
const klar = (s: State, q: Hang) => s.now - q.t >= TORK.dygn * DAY;
// så mycket rått som finns över det byn äter innan det ruttnar
function ratOver(s: State) {
  let n = 0;
  for (const r of TORKAS) n += amountOf(s, r.ra);
  return Math.max(0, n - TORK.spara * living(s).length * EKONOMI.matPerDygn);
}
// arbetet som väntar vid ställningarna: det som är klart att ta ner, och det råa som ska upp och får plats. fri = platsen
// som finns när det klara tagits ner, over = det råa som finns över
function torkArbete(s: State) {
  const ts = torkarna(s);
  if (!ts.length) return { ner: 0, upp: 0, fri: 0, over: 0 };
  let ner = 0, fri = 0;
  for (const t of ts) { fri += TORK.rymd - hangtSumma(t); for (const q of t.tork ?? []) if (klar(s, q)) ner += q.n; }
  fri += ner;
  const over = ratOver(s), upp = over >= TORK.min ? Math.min(over, fri) : 0;
  return { ner, upp: Math.max(0, upp), fri, over };
}
// en torkställning till (projekt.ts): 1 när byn saknar en, annars hur mycket av det råa som finns över som inte får plats på
// ställningarna, i ställningar (steg 2.10.22)
export function torkBrist(s: State) {
  const n = torkarna(s).length;
  if (!n) return 1;
  if (n >= TORK.maxStall) return 0;
  const a = torkArbete(s);
  return a.over >= TORK.min ? clamp((a.over - a.fri) / TORK.rymd, 0, 1) : 0;
}
// p kan torka: byn har ställningen, något är klart att ta ner eller det finns rått över och plats, och ingen annan gör det
export function kanTorka(s: State, p: Person) {
  if (!kanGoras(s, 'torka') || doingAct(s, 'torka', p)) return false;
  const a = torkArbete(s);
  return a.ner > 1e-6 || a.upp >= TORK.min;
}
// hur länge ett pass vid ställningen varar
export const torkTid = (s: State) => { const a = torkArbete(s); return Math.min(TORK.maxTim * HOUR, (a.ner + a.upp) / TORK.timme * HOUR + 5 * MIN); };

// torka i hours timmar: först ner det som är klart, sedan upp med det råa som finns över, ställning för ställning
export function torka(s: State, p: Person, hours: number) {
  const ts = torkarna(s);
  if (!ts.length) { if (p.task) p.task.until = s.now; return; }
  let kan = hours * TORK.timme, over = ratOver(s);
  for (const h of ts.map(hangOf)) for (let i = 0; i < h.length && kan > 1e-9;) {
    const q = h[i];
    if (!klar(s, q)) { i++; continue; }
    const n = Math.min(q.n, kan), f = n / q.n, ag: Del = {};
    for (const o in q.ag) { const m = q.ag[o] * f; q.ag[o] -= m; const ag0 = byId(s, Number(o)); if (ag0 && alive(ag0)) ag[o] = m; }
    put(s, TORKAS.find(r => r.ra === q.k)!.blir, n, ag);
    q.n -= n; kan -= n; count(s, 'torkat', n);
    if (q.n <= 1e-6) h.splice(i, 1);
    if (forstaGang(s, 'torkForsta')) log(s, `${p.name} tog ner byns första torkade ${q.k === 'kott' ? 'kött' : 'fisk'} från torkställningen. Den håller länge i lagret.`, 'world', [p.id]);
  }
  for (const t of ts) {
    const h = hangOf(t);
    let plats = TORK.rymd - hangtSumma(t);
    for (const r of TORKAS) {
      if (kan <= 1e-9 || plats <= 1e-9 || over < 1e-6) break;
      const n = Math.min(kan, plats, over, amountOf(s, r.ra));
      if (n <= 1e-6) continue;
      const vems = use(s, p, r.ra, n), sist = h[h.length - 1];
      if (sist && sist.k === r.ra && s.now - sist.t < HOUR) { sist.n += n; sist.ag = addDel(sist.ag ?? {}, vems); }
      else h.push({ k: r.ra, n, t: s.now, ag: addDel({}, vems) });
      kan -= n; plats -= n; over -= n; count(s, 'upphangt', n);
    }
  }
  if (kan >= hours * TORK.timme - 1e-9 && p.task) p.task.until = s.now; // inget att göra
}
