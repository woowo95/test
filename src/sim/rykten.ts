import { ALDER, REL, ageOf, alive, byId, count, forstaGang, getRel, isKin, isParent, living, log, relKey, stat, think } from './folk';
import { clamp, pickViktat, rnd } from './slump';
import { HOUR, Person, Rel, State } from './typer';
import { balans } from './balans';
import { ACTS, Act } from './handlingar';
import { isLight } from './tid';
import { vaderNu } from './vader';

// Rykten (steg 3.3–3.4, "Rykten, anseende och minnet efter döden" i designdokumentet).
// Det någon gör (en händelse: stöld, slag, gåva, mästerverk …) blir ett intryck hos den som ser det (våldsam, tjuv, generös,
// skicklig …). Intrycket har en styrka (v) och en säkerhet (c), och de några viktigaste händelserna sparas som bevis. Intrycken
// sprids i samtal med den starkaste händelsen som exempel: den som hör det är mindre säker, ryktet blir svagare för varje led, och
// man överdriver det dåliga om den man ogillar och det goda om den man gillar. Den som får veta hur det var märker det och tror
// mindre på berättaren; den som ofta ertappas blir känd som lögnare. Man tiger om det dåliga för att skydda en vän eller släkting,
// och man berättar aldrig om sig själv. Intrycken ändrar bara relationen, inget annat beteende (9.6.2).
// Ryktbarheten (hur mycket man pratas om) och anseendet (gott eller ont) räknas ur intrycken och sparas inte.
// När någon dör lever intrycken av hen kvar med de viktigaste händelserna, och bleknar långsammare ju starkare de var (steg 3.4).
// Tycke och smak (steg 3.3.5): få har någon smak från början; den växer ur det man varit med om och ger lite glädje och lite drag i valen.

// ---------- balanstal (regel 8) ----------
export const RYKTE = balans('rykte', {
  max: 14, // så många intryck om andra minns man högst; det svagaste trängs undan
  bevMax: 3, // så många händelser sparas som bevis för ett intryck ...
  dodBev: 2, // ... och så många när personen är död (de viktigaste)
  vMax: 1.5, // ett intryck är som starkast så här
  syn: 10, // de som var närmare än så här många rutor (och vakna) såg det som hände ...
  synDimma: 0.6, // ... och så här mycket kortare i den tätaste dimman (steg 3.7.11)
  sjalvSaker: 1, // den som såg det själv är så här säker ...
  offerSaker: 1, // ... och den som det hände
  delaBas: 0.06, // chansen att man berättar om ett intryck i ett samtal: delaBas + karisma / delaDiv, och mer i en berättelse
  delaDiv: 250,
  delaBerattelse: 0.25,
  delaNeg: 1.5, // det dåliga berättas hellre (vikten mot det goda)
  led: 0.7, // den som hör det blir så här säker, gånger säkerheten och tron på berättaren
  troBas: 0.5, troDiv: 150, troMin: 0.15, troMax: 0.95, // tron på berättaren: troBas + relationen / troDiv
  over: 0.4, // överdriften: 1 + tecknet × åsikten / 100 × over, plus brus
  brus: 0.2,
  ertappa: 0.6, // den som själv såg det (och är säker, minst ertappaSaker) märker överdriften eller underdriften när det
  ertappaSaker: 0.7, // berättade skiljer sig så här mycket från det hen vet ...
  ertappaOp: 8, // ... och relationen med berättaren sjunker så mycket
  lognV: 0.35, // ett ertappat påhitt eller en överdrift ger intrycket lögnare med så här stor styrka
  lognTro: 0.8, // tron på en lögnare sjunker med lognTro × lögnarintryckets styrka (minne.ts och här)
  glomDygn: 6, // intrycken bleknar med en tidskonstant på glomDygn + minne / glomMinne dygn ...
  glomMinne: 2,
  glomTung: 3, // ... en allvarlig händelse (vikt minst tungVikt) glöms så här många gånger långsammare
  tungVikt: 0.5,
  glomGrans: 0.06, // ett intryck som blivit svagare än så här (styrka × säkerhet) är glömt
  dodGlom: 2, // minnet av en död bleknar så här många gånger långsammare, och mer ju ryktbarare hen var: + ryktbarhet / dodRykte
  dodRykte: 3,
  dodSlakt: 2, // släkten minns sina egna så här många gånger längre
  avundEmp: 6, // den som har högst så här mycket empati, eller är rival, blir avundsjuk på en prestation i stället för imponerad
  avundTanke: 0.05, avundTim: 8,
  vardagTakt: 0.03, // flitig, lat, rik och fattig: intrycket närmar sig det man ser så här mycket per timme
  flitig: 1.4, lat: 0.6, // flitig när arbetstimmarna är så här många gånger snittet, lat under lat gånger snittet
  rik: 2, fattig: 0.4, // rik och fattig på samma sätt, mätt i förmögenheten (förväntningarna, humor.ts)
  rikMin: 2, // ... och bara när snittet är så här stort
  berattelseLed: 3, legendLed: 6, // ett minne av en död som berättats i så här många led är en berättelse och till sist en legend
  legend: 2, // en död med så här stor ryktbarhet är en legend (stjärna) med gott anseende eller ökänd (dödskalle) med ont
  dodLog: 1.5, // när någon med så här stor ryktbarhet dör står det i loggen hur byn minns hen
  smakStart: 0.3, // chansen att en ny människa har en smak från början ...
  smakStartV: 0.4, // ... och hur stark den är
  smakBarn: 0.004, // per timme: ett barn som är nära en förälder som arbetar får tycke för arbetet
  smakArbete: 0.003, // per timme: den som är glad (eller ledsen) när hen arbetar får tycke (eller avsmak) för arbetet
  smakGlad: 0.65, smakLedsen: 0.3,
  smakMat: 0.05, // ett barn som äter med en förälder nära får så här mycket tycke för maten
  smakGift: 0.6, // den som blev förgiftad av svamp får så här mycket avsmak för svampen
  smakDrag: 0.15, // smaken drar så här mycket i valet av arbete (lusten gånger 1 + smakDrag × smaken)
  smakTanke: 0.03, // glädjen (eller olusten) av att äta det man tycker om (eller inte)
});

// ---------- registren ----------
// intrycken: ordet, om det är gott (+1) eller ont (-1), hur mycket relationen ändras per styrka (op) och symbolen (platshållare)
interface IntryckDef { namn: string; tecken: 1 | -1; op: number; sym: string }
const IDEF = {
  valdsam: { namn: 'våldsam', tecken: -1, op: -40, sym: '👊' },
  tjuv: { namn: 'tjuv', tecken: -1, op: -30, sym: '🦝' },
  elak: { namn: 'elak', tecken: -1, op: -20, sym: '😠' },
  logn: { namn: 'lögnare', tecken: -1, op: -20, sym: '🤥' },
  klapare: { namn: 'klåpare', tecken: -1, op: -6, sym: '🤡' },
  lat: { namn: 'lat', tecken: -1, op: -8, sym: '💤' },
  fattig: { namn: 'fattig', tecken: -1, op: 0, sym: '🪶' },
  generos: { namn: 'generös', tecken: 1, op: 15, sym: '🎁' },
  hjalpsam: { namn: 'hjälpsam', tecken: 1, op: 25, sym: '🤝' },
  skicklig: { namn: 'skicklig', tecken: 1, op: 12, sym: '⭐' },
  flitig: { namn: 'flitig', tecken: 1, op: 8, sym: '💪' },
  rik: { namn: 'rik', tecken: 1, op: 0, sym: '💰' },
  rattvis: { namn: 'rättvis', tecken: 1, op: 10, sym: '⚖️' }, // ledarens straff (steg 3.5.3, styre.ts)
  orattvis: { namn: 'orättvis', tecken: -1, op: -15, sym: '🙅' },
  stark: { namn: 'stark', tecken: 1, op: 4, sym: '🥊' }, // vann ett slagsmål (steg 3.7.2, strid.ts)
  feg: { namn: 'feg', tecken: -1, op: -5, sym: '🐔' }, // backade från en strid (steg 3.7.9, strid.ts)
} satisfies Record<string, IntryckDef>;
export type IntryckTyp = keyof typeof IDEF;
export const INTRYCK: Record<IntryckTyp, IntryckDef> = IDEF;

// händelserna: intrycket de ger och hur mycket (vikt), och texten i beviset ({om} = den det gällde, {sak} = saken).
// `prestation` = man blir imponerad, eller avundsjuk (3.3.2)
interface HandelseDef { i: IntryckTyp; vikt: number; text: string; prestation?: true }
const HDEF = {
  stold: { i: 'tjuv', vikt: 0.5, text: 'stal {sak} av {om}' },
  stoldLindrig: { i: 'tjuv', vikt: 0.2, text: 'tog {sak} av {om}' },
  elak: { i: 'elak', vikt: 0.25, text: 'var elak mot {om}' },
  sla: { i: 'valdsam', vikt: 0.2, text: 'slog {om}' },
  misshandel: { i: 'valdsam', vikt: 0.5, text: 'misshandlade {om}' },
  drap: { i: 'valdsam', vikt: 1, text: 'slog ihjäl {om}' },
  gava: { i: 'generos', vikt: 0.04, text: 'gav {sak} till {om}' },
  hjalp: { i: 'hjalpsam', vikt: 0.5, text: 'gav {sak} till {om}, som höll på att dö' },
  masterverk: { i: 'skicklig', vikt: 0.4, text: 'gjorde ett mästerverk: {sak}', prestation: true },
  perfekt: { i: 'skicklig', vikt: 0.8, text: 'gjorde ett perfekt mästerverk: {sak}', prestation: true },
  usel: { i: 'klapare', vikt: 0.3, text: 'gjorde en usel {sak}' },
  logn: { i: 'logn', vikt: 0.35, text: 'ljög om {om}' },
  overdrev: { i: 'logn', vikt: 0.2, text: 'överdrev om {om}' },
  dom: { i: 'rattvis', vikt: 0.15, text: 'dömde {om} rättvist' },
  orattvisDom: { i: 'orattvis', vikt: 0.3, text: 'dömde {om} orättvist' },
  vadaskott: { i: 'klapare', vikt: 0.25, text: 'träffade {om} av misstag i en strid' }, // steg 3.7.7
  vannSlagsmal: { i: 'stark', vikt: 0.3, text: 'vann ett slagsmål mot {om}', prestation: true },
  backade: { i: 'feg', vikt: 0.2, text: 'backade från en strid med {om}' }, // steg 3.7.9
} satisfies Record<string, HandelseDef>;
export type HandelseTyp = keyof typeof HDEF;
export const HANDELSER: Record<HandelseTyp, HandelseDef> = HDEF;

// ---------- data ----------
// ett bevis: händelsen, när, vem den gällde (mot, och namnet ifall hen glömts), saken, om man såg det själv (sett) och om det är påhittat
export interface Bevis { h: HandelseTyp; t: number; mot?: number; motNamn?: string; sak?: string; sett?: true; falsk?: true }
// ett intryck om en annan: om = vem (och namnet, som finns kvar när hen glömts), k = intrycket, v = styrka, c = säkerhet,
// t = senast stärkt, src = av vem man hörde det (saknas = såg det själv), led = led från den som såg det, bev = bevisen
export interface Intryck { om: number; namn: string; k: IntryckTyp; v: number; c: number; t: number; src?: number; led?: number; bev?: Bevis[] }

const styrka = (e: Intryck) => e.v * e.c;
const bevVikt = (b: Bevis) => HANDELSER[b.h].vikt * (b.falsk ? 0.8 : 1);
export const intryckOm = (p: Person, om: number, k?: IntryckTyp) => p.intryck?.find(e => e.om === om && (k === undefined || e.k === k));

// relationen ändras när intrycket blir starkare (eller svagare). utanOp: den det hände har redan fått sin ändring
function relEffekt(s: State, p: Person, om: number, k: IntryckTyp, d: number, prestation = false) {
  const q = byId(s, om);
  if (!q || !alive(q) || !alive(p) || Math.abs(d) < 1e-9) return;
  let op = INTRYCK[k].op * d;
  // en prestation gör de flesta imponerade, men rivalen och den med låg empati avundsjuka (steg 3.3.2)
  if (prestation && d > 0 && (p.rivaler?.includes(om) || stat(p, 'empati', s.now) <= RYKTE.avundEmp)) {
    op = -op;
    think(p, `Avundsjuk på ${q.name}`, -RYKTE.avundTanke, s.now, RYKTE.avundTim * HOUR);
    count(s, 'rykte_avund');
  }
  const r = getRel(s, p, q);
  r.op = clamp(r.op + op, -100, 100);
}

function trim(s: State, p: Person) {
  const L = p.intryck!;
  if (L.length <= RYKTE.max) return;
  L.sort((a, b) => styrka(b) - styrka(a));
  count(s, 'rykte_glomt', L.length - RYKTE.max);
  L.length = RYKTE.max;
}
function addBevis(e: Intryck, b: Bevis, max = RYKTE.bevMax) {
  const L = (e.bev ??= []);
  if (L.some(x => x.h === b.h && x.t === b.t && x.mot === b.mot)) return;
  L.push(b);
  L.sort((x, y) => bevVikt(y) - bevVikt(x) || y.t - x.t);
  if (L.length > max) L.length = max;
}

// p får (eller stärker) intrycket k om personen om, med styrkan v och säkerheten c
function intryck(s: State, p: Person, om: Person | { id: number; name: string }, k: IntryckTyp, v: number, c: number, b?: Bevis, src?: number, led = 0, utanOp = false, prestation = false) {
  if (p.id === om.id) return;
  let e = intryckOm(p, om.id, k);
  const fore = e ? styrka(e) : 0;
  if (e) {
    // det man såg själv väger tyngre än det man hört
    // samma rykte en gång till gör det inte värre: det man hört blir som det starkaste man hört
    const ny = led ? Math.max(e.v, Math.min(v, RYKTE.vMax)) : clamp(e.v + v * (1 - e.v / (RYKTE.vMax * 1.5)), 0, RYKTE.vMax);
    e.v = ny; e.c = Math.max(e.c, c); e.t = s.now;
    if (led < (e.led ?? 0)) { e.led = led; if (src === undefined) delete e.src; else e.src = src; }
  } else {
    e = { om: om.id, namn: om.name, k, v: Math.min(v, RYKTE.vMax), c, t: s.now, ...(src !== undefined ? { src } : {}), ...(led ? { led } : {}) };
    (p.intryck ??= []).push(e);
    count(s, 'rykte_intryck');
  }
  if (b) addBevis(e, b);
  if (!utanOp) relEffekt(s, p, om.id, k, styrka(e) - fore, prestation);
  trim(s, p);
}

// ---------- händelser ----------
// de som ser det som p gör: levande och vakna inom RYKTE.syn rutor (inte p), och den det gäller (offer)
export function vittnen(s: State, p: Person, offer?: Person) {
  const syn = RYKTE.syn * (1 - RYKTE.synDimma * vaderNu(s).dimma);
  return living(s).filter(q => q !== p && (q === offer || (q.task?.act !== 'sova' && Math.hypot(q.x - p.x, q.y - p.y) < syn)));
}
// p gjorde händelsen h mot offer (eller med saken sak): de som såg det får intrycket. Den det gällde har redan fått sin ändring
// i relationen (utanOp), och en rival eller den med låg empati blir avundsjuk på en prestation
export function handelse(s: State, p: Person, h: HandelseTyp, offer?: Person, sak?: string, bara?: Person) {
  const d = HANDELSER[h];
  const b: Bevis = { h, t: s.now, ...(offer ? { mot: offer.id, motNamn: offer.name } : {}), ...(sak ? { sak } : {}), sett: true };
  count(s, 'rykte_' + h);
  for (const q of bara ? [bara] : vittnen(s, p, offer)) intryck(s, q, p, d.i, d.vikt, q === offer ? RYKTE.offerSaker : RYKTE.sjalvSaker, { ...b }, undefined, 0, q === offer, !!d.prestation);
}

// det som p gjort (beviset b) blir känt för alla i till (när ledaren straffar p, styre.ts): de hör det med del av vikten
export function allmant(s: State, p: Person, b: Bevis, del: number, till: Person[]) {
  const d = HANDELSER[b.h];
  for (const q of till) if (q !== p) intryck(s, q, p, d.i, d.vikt * del, RYKTE.sjalvSaker, { ...b, sett: undefined } as Bevis, undefined, 1);
}

// ---------- samtal ----------
// hur mycket b tror på det a berättar: relationen, och mindre om b tror att a är en lögnare (minne.ts använder samma)
export function troPa(s: State, b: Person, a: Person, r: Rel = getRel(s, a, b)) {
  const l = intryckOm(b, a.id, 'logn');
  return clamp(RYKTE.troBas + r.op / RYKTE.troDiv, RYKTE.troMin, RYKTE.troMax) * (l ? 1 - Math.min(0.9, RYKTE.lognTro * styrka(l)) : 1);
}
export const lognFaktor = (b: Person, a: Person) => { const l = intryckOm(b, a.id, 'logn'); return l ? 1 - Math.min(0.9, RYKTE.lognTro * styrka(l)) : 1; };
// vad a tycker om personen om: relationen om hen lever, annars det a har för intryck av hen (de döda, steg 3.4.2)
function asikt(s: State, a: Person, om: number) {
  const q = byId(s, om);
  if (q && alive(q)) return s.rels[relKey(a.id, om)]?.op ?? 0;
  let v = 0;
  for (const e of a.intryck ?? []) if (e.om === om) v += INTRYCK[e.k].tecken * styrka(e) * 50;
  return clamp(v, -100, 100);
}
// hemligheter (steg 3.3.4): man berättar inte det dåliga om en vän, sin partner eller sin släkt
function skyddar(s: State, a: Person, om: number) {
  const q = byId(s, om);
  if (!q || !alive(q)) return false;
  return a.partner === om || isKin(a, q) || (s.rels[relKey(a.id, om)]?.op ?? 0) > REL.van;
}
// a berättar ibland för b om ett intryck hen har av någon annan (aldrig för den det gäller)
export function skvaller(s: State, a: Person, b: Person, r: Rel, berattelse: boolean) {
  if (!a.intryck?.length) return;
  const chans = RYKTE.delaBas + stat(a, 'karisma', s.now) / RYKTE.delaDiv + (berattelse ? RYKTE.delaBerattelse : 0);
  if (rnd(s, 'rykte', a) >= chans) return;
  const val = a.intryck.filter(e => e.om !== b.id && !(INTRYCK[e.k].tecken < 0 && skyddar(s, a, e.om)));
  if (!val.length) return;
  const e = pickViktat(s, val, val.map(x => styrka(x) * (INTRYCK[x.k].tecken < 0 ? RYKTE.delaNeg : 1)), 'rykte', a);
  beratta(s, a, b, e, r);
}
// a berättar om intrycket e för b: b blir mindre säker, och a överdriver efter vad hen tycker om personen
export function beratta(s: State, a: Person, b: Person, e: Intryck, r: Rel) {
  const d = INTRYCK[e.k], ex = e.bev?.[0];
  const over = 1 + d.tecken * asikt(s, a, e.om) / 100 * RYKTE.over + (rnd(s, 'rykte', a) - 0.5) * RYKTE.brus;
  // överdriften växer inte för varje led: högst så mycket över det bevisen väger
  const tak = e.bev?.length ? e.bev.reduce((t, x) => t + bevVikt(x), 0) * (1 + RYKTE.over) : RYKTE.vMax;
  const v = clamp(Math.min(e.v * over, Math.max(e.v, tak)), 0, RYKTE.vMax), c = e.c * troPa(s, b, a, r) * RYKTE.led;
  count(s, 'rykte_berattat');
  // påhittat om b själv, eller om något b var med om: b vet bättre (steg 3.3.3)
  if (ex?.falsk && ex.mot === b.id) { ertappad(s, b, a, e, 'logn'); return; }
  const egen = intryckOm(b, e.om, e.k);
  if (egen && !egen.led && egen.src === undefined && egen.c >= RYKTE.ertappaSaker && v - egen.v > RYKTE.ertappa && v > egen.v * (1 + RYKTE.ertappa)) { ertappad(s, b, a, e, 'overdrev'); return; }
  if (egen && !egen.src && !egen.led) return; // det man såg själv väger tyngre
  const om = byId(s, e.om) ?? { id: e.om, name: e.namn };
  const led = (e.led ?? 0) + 1;
  // minnet av en död blir mer likt berättarens eget (steg 3.4.2)
  intryck(s, b, om, e.k, v * (alive(om as Person) ? 1 : 0.5), c, ex ? { ...ex, sett: undefined } as Bevis : undefined, a.id, led);
  const ny = intryckOm(b, e.om, e.k);
  if (ny && ex) for (const x of e.bev!.slice(1)) addBevis(ny, { ...x, sett: undefined } as Bevis);
  if (forstaGang(s, 'rykte:' + e.om + ':' + e.k) && byId(s, e.om)) log(s, `Det går rykten om att ${e.namn} är ${d.namn}.`, 'rel', [e.om]);
}
// b märker att a ljög eller överdrev om personen i e
function ertappad(s: State, b: Person, a: Person, e: Intryck, h: 'logn' | 'overdrev') {
  const r = getRel(s, a, b);
  r.op = clamp(r.op - RYKTE.ertappaOp, -100, 100);
  intryck(s, b, a, 'logn', HANDELSER[h].vikt, 1, { h, t: s.now, mot: e.om, motNamn: e.namn, sett: true }, undefined, 0, true);
  count(s, 'rykte_' + h);
  if (h === 'logn') think(b, `${a.name} ljuger om mig`, -0.05, s.now, 12 * HOUR);
}

// skitsnack (utbrott av grad 2, humor.ts): den som mår dåligt hittar på något om den hen ogillar mest och berättar det för
// den som är närmast. Den det sägs ha hänt (mot) är en annan i byn; när ryktet når hen märker hen att det är påhittat
export function skitsnackOm(s: State, p: Person, lyss: Person) {
  let om: Person | undefined, lagst = 0;
  for (const q of living(s)) {
    if (q === p || q === lyss || ageOf(q, s.now) < ALDER.vuxen) continue;
    const op = s.rels[relKey(p.id, q.id)]?.op ?? 0;
    if (op < lagst || q.id === p.arke) { lagst = q.id === p.arke ? -101 : op; om = q; }
  }
  return om;
}
export function skitsnack(s: State, p: Person, lyss: Person) {
  const om = skitsnackOm(s, p, lyss);
  if (!om) return;
  const slag: HandelseTyp[] = ['stold', 'elak', 'sla'], h = slag[Math.floor(rnd(s, 'rykte', p) * slag.length)];
  const andra = living(s).filter(q => q !== p && q !== om && q !== lyss);
  const mot = andra.length ? andra[Math.floor(rnd(s, 'rykte', p) * andra.length)] : p;
  const d = HANDELSER[h];
  const e: Intryck = { om: om.id, namn: om.name, k: d.i, v: d.vikt * 1.5, c: 1, t: s.now, bev: [{ h, t: s.now, mot: mot.id, motNamn: mot.name, falsk: true, ...(h === 'stold' ? { sak: 'mat' } : {}) }] };
  count(s, 'rykte_skitsnack');
  beratta(s, p, lyss, e, getRel(s, p, lyss));
}

// ---------- vardagen (steg 3.3.2) ----------
// arbete är en handling med en färdighet eller ett slag av arbete (handlingar.ts), inte att sova, äta eller prata
const arArbete = (a: string) => { const d = ACTS[a as Act]; return !!d && !d.social && !d.vila && d.slag !== 'leka' && (d.arbete !== undefined || d.slag !== undefined); };
function arbetstimmar(p: Person) {
  let t = 0;
  for (const k in p.habit) if (arArbete(k)) t += p.habit[k];
  return t;
}
// en gång i timmen: de som är nära varandra ser om den andra är flitig eller lat och rik eller fattig. Intrycket närmar sig
// det man ser; det som inte stämmer längre bleknar bort
export function stepRykten(s: State, mood: (p: Person, now: number) => number) {
  const folk = living(s).filter(p => ageOf(p, s.now) >= ALDER.vuxen);
  if (folk.length < 2) return;
  let ht = 0, wt = 0;
  const h = folk.map(p => { const v = arbetstimmar(p); ht += v; return v; }), w = folk.map(p => { const v = p.forv?.w ?? 0; wt += v; return v; });
  const hm = ht / folk.length, wm = wt / folk.length;
  for (let i = 0; i < folk.length; i++) {
    const p = folk[i];
    const flit = hm > 0 ? (h[i] > hm * RYKTE.flitig ? 'flitig' : h[i] < hm * RYKTE.lat ? 'lat' : undefined) : undefined;
    const rik = wm >= RYKTE.rikMin ? (w[i] > wm * RYKTE.rik ? 'rik' : w[i] < wm * RYKTE.fattig ? 'fattig' : undefined) : undefined;
    for (const q of folk) {
      if (q === p || Math.hypot(q.x - p.x, q.y - p.y) >= RYKTE.syn) continue;
      for (const [a, b] of [['flitig', 'lat'], ['rik', 'fattig']] as [IntryckTyp, IntryckTyp][]) {
        const mal = a === 'flitig' ? flit : rik;
        for (const k of [a, b]) {
          const e = intryckOm(q, p.id, k);
          if (k === mal) intryck(s, q, p, k, RYKTE.vardagTakt * (1 - (e?.v ?? 0)), 1);
          else if (e) { const f = styrka(e); e.v *= 1 - RYKTE.vardagTakt; relEffekt(s, q, p.id, k, styrka(e) - f); }
        }
      }
    }
  }
  stepSmak(s, mood);
}

// ---------- glömska och döden (steg 3.4.1) ----------
// ryktbarheten (hur starka alla intryck i byn av personen är tillsammans) och anseendet (gott minus ont)
export function ryktbarhet(s: State, om: number) {
  let r = 0, a = 0;
  for (const q of living(s)) for (const e of q.intryck ?? []) if (e.om === om) { r += styrka(e); a += INTRYCK[e.k].tecken * styrka(e); }
  return { r, a };
}
// de viktigaste intrycken av personen i byn (det samlade intrycket), starkast först
export function samlatIntryck(s: State, om: number) {
  const m = new Map<IntryckTyp, number>();
  for (const q of living(s)) for (const e of q.intryck ?? []) if (e.om === om) m.set(e.k, (m.get(e.k) ?? 0) + styrka(e));
  return [...m].sort((a, b) => b[1] - a[1]);
}
// när någon dör: de som minns hen behåller de viktigaste händelserna, och byn minns hen som det hen var känd för
export function rykteDod(s: State, p: Person) {
  const { r, a } = ryktbarhet(s, p.id);
  for (const q of living(s)) for (const e of q.intryck ?? []) if (e.om === p.id && e.bev && e.bev.length > RYKTE.dodBev) e.bev.length = RYKTE.dodBev;
  if (r >= RYKTE.dodLog) {
    const top = samlatIntryck(s, p.id)[0];
    if (top) { log(s, `Byn minns ${p.name} som ${INTRYCK[top[0]].namn}.`, 'death', [p.id]); count(s, 'rykte_minns'); }
    if (r >= RYKTE.legend) p.fame.push(a >= 0 ? 'Blev en legend i byn' : 'Blev ökänd i byn');
  }
}
// en gång i timmen: intrycken bleknar, de allvarliga långsammare, och minnet av en död långsammare ju ryktbarare hen var.
// De dödas egna intryck försvinner med dem
export function glomRykten(s: State, hours: number) {
  const rykt = new Map<number, number>();
  const rOf = (om: number) => { let v = rykt.get(om); if (v === undefined) { v = ryktbarhet(s, om).r; rykt.set(om, v); } return v; };
  for (const p of s.people) {
    if (!p.intryck) continue;
    if (!alive(p)) { delete p.intryck; continue; }
    const tau = 24 * (RYKTE.glomDygn + stat(p, 'minne', s.now) / RYKTE.glomMinne);
    p.intryck = p.intryck.filter(e => {
      const q = byId(s, e.om), dod = !q || !alive(q);
      if (e.k === 'flitig' || e.k === 'lat' || e.k === 'rik' || e.k === 'fattig') { if (dod) return false; return e.t >= s.now - hours * HOUR || styrka(e) >= RYKTE.glomGrans; } // det som ses nu glöms inte
      let t = tau * ((e.bev?.[0] && HANDELSER[e.bev[0].h].vikt >= RYKTE.tungVikt) ? RYKTE.glomTung : 1);
      if (dod) t *= RYKTE.dodGlom + rOf(e.om) / RYKTE.dodRykte;
      if (dod && q && isKin(p, q)) t *= RYKTE.dodSlakt;
      e.c *= Math.exp(-hours / t);
      return styrka(e) >= RYKTE.glomGrans;
    });
    if (!p.intryck.length) delete p.intryck;
  }
}

// ---------- tycke och smak (steg 3.3.5) ----------
// smaken: 'a:' + arbete eller 'm:' + mat, från -1 (avsmak) till 1 (tycke)
export const smakAv = (p: Person, k: string) => p.smak?.[k] ?? 0;
export function smaka(p: Person, k: string, d: number) {
  const v = clamp(smakAv(p, k) + d, -1, 1);
  if (Math.abs(v) < 1e-3) { if (p.smak) delete p.smak[k]; return; }
  (p.smak ??= {})[k] = v;
}
// en ny människa: få har någon smak från början
const STARTSMAK = ['a:samla', 'a:jakt', 'a:fiske', 'a:ved', 'm:abborre', 'm:bar', 'm:svamp', 'm:kott'];
export function startSmak(s: State, p: Person) {
  if (rnd(s, 'rykte', p) >= RYKTE.smakStart) return;
  const k = STARTSMAK[Math.floor(rnd(s, 'rykte', p) * STARTSMAK.length)];
  smaka(p, k, (rnd(s, 'rykte', p) < 0.7 ? 1 : -1) * RYKTE.smakStartV);
}
// en gång i timmen: barnet nära en förälder som arbetar får tycke för arbetet, och den vuxne som är glad eller ledsen när hen
// arbetar får tycke eller avsmak för det
function stepSmak(s: State, mood: (p: Person, now: number) => number) {
  const folk = living(s);
  for (const p of folk) {
    const act = p.task?.act;
    if (ageOf(p, s.now) < ALDER.vuxen) {
      const f = folk.find(q => isParent(q, p) && Math.hypot(q.x - p.x, q.y - p.y) < RYKTE.syn && q.task?.act !== undefined && arArbete(q.task.act));
      if (f) smaka(p, 'a:' + f.task!.act, RYKTE.smakBarn);
      continue;
    }
    if (!act || !arArbete(act)) continue;
    const m = mood(p, s.now);
    if (m > RYKTE.smakGlad) smaka(p, 'a:' + act, RYKTE.smakArbete);
    else if (m < RYKTE.smakLedsen) smaka(p, 'a:' + act, -RYKTE.smakArbete);
  }
}
// när p äter (behov.ts): ett barn med en förälder nära får tycke för maten, och den som tycker om (eller inte) det hen äter
// blir lite gladare (eller inte)
export function smakMat(s: State, p: Person, per: Record<string, number>) {
  let k: string | undefined, n = 0;
  for (const x in per) if (per[x] > n) { n = per[x]; k = x; }
  if (!k) return;
  if (ageOf(p, s.now) < ALDER.vuxen && living(s).some(q => isParent(q, p) && Math.hypot(q.x - p.x, q.y - p.y) < RYKTE.syn)) smaka(p, 'm:' + k, RYKTE.smakMat);
  const v = smakAv(p, 'm:' + k);
  if (Math.abs(v) > 0.2) think(p, v > 0 ? 'Fick äta något gott' : 'Fick äta något äckligt', v * RYKTE.smakTanke, s.now, 3 * HOUR);
}
// den som blev förgiftad av svamp får avsmak för svamp (fynd.ts)
export const smakGift = (p: Person) => smaka(p, 'm:svamp', -RYKTE.smakGift);
// arbetet: smaken drar i valet (val.ts, lusten)
export function smakDrag(p: Person, acts: readonly string[]) {
  if (!p.smak) return 1;
  let v = 0;
  for (const a of acts) v += smakAv(p, 'a:' + a);
  return 1 + RYKTE.smakDrag * v / acts.length;
}

// ---------- att visa ----------
export function bevisText(b: Bevis, om: string) {
  return HANDELSER[b.h].text.replace('{om}', b.motNamn ?? 'någon').replace('{sak}', b.sak ?? 'något').replace(/^/, om + ' ');
}
export function intryckText(s: State, e: Intryck) {
  const sure = e.c >= 0.75 ? 'säker' : e.c >= 0.4 ? 'ganska säker' : 'osäker';
  const q = byId(s, e.om), dod = !q || !alive(q);
  const varifran = e.src === undefined && !e.led ? 'såg det själv' : `hörde det av ${byId(s, e.src ?? -1)?.name ?? 'någon'}${(e.led ?? 1) > 1 ? `, ${e.led} led från den som såg det` : ''}`;
  const slag = dod && (e.led ?? 0) >= RYKTE.legendLed ? 'en legend' : dod && (e.led ?? 0) >= RYKTE.berattelseLed ? 'en berättelse' : '';
  const falsk = e.bev?.some(b => b.falsk) ? 'påhittat' : '';
  const sant = falsk || (e.led && e.bev?.length && e.v > HANDELSER[e.bev[0].h].vikt * 1.4 ? 'överdrivet' : '');
  return { namn: INTRYCK[e.k].namn, sym: INTRYCK[e.k].sym, sure, varifran, slag, sant, bevis: (e.bev ?? []).map(b => bevisText(b, e.namn)), dod };
}
// symbolen för en död som minns: en stjärna för en legend, en dödskalle för den ökända
export function dodSymbol(s: State, om: number) {
  const { r, a } = ryktbarhet(s, om);
  return r < RYKTE.legend ? '' : a >= 0 ? '★' : '☠';
}
// anseendet som symbol (personrutan)
export function anseendeSym(s: State, om: number) {
  const { r, a } = ryktbarhet(s, om);
  return r < 0.3 ? '' : a > r * 0.3 ? '😇' : a < -r * 0.3 ? '😈' : '😐';
}

// ---------- varningar och larm (steg 3.7.11) ----------
// Bara de som ser eller hör vet om en strid. Den som slåss eller ser en fara ropar; ropet hörs runt hor rutor, längre på
// natten när det är tyst (dimman tar inte ljudet), och den som hör ropar för det mesta vidare, så att larmet sprids genom
// byn. Storleken (hur många, eller hur farligt) förvrängs lite för varje led. Den som har ett utbrott kan ropa falskt larm
// (humor.ts). Den som hört larmet minns det en stund (p.larm); vad man gör (springer dit eller flyr) kommer med rovdjuren
// (3.7.1) och räderna (11.2.5), och anfallarna som samlas i utkanten och vakten som ser dem med räderna. Horn, trumma och
// vakthund kommer senare som tekniker
export const LARM = balans('larm', {
  hor: 15, // ropet hörs så här många rutor ...
  natt: 1.5, // ... gånger så här mycket på natten
  vidare: 0.8, // den som hör ropar vidare med den här chansen
  forvrang: 0.3, // storleken förvrängs upp till så här mycket (del) åt båda hållen för varje led
  falskt: 0.1, // chansen att ett utbrott (grad 2 eller mer, inte barnens) blir ett falskt larm
  tim: 6, // man minns larmet så här många timmar
  oro: 0.05, // den som hör ett larm oroar sig så här mycket ...
  oroTim: 2, // ... så här många timmar
});
export interface Larm { t: number; x: number; y: number; vad: string; storlek: number; led: number; falskt?: true }

// ett larm från (x, y) om vad (storleken: hur många eller hur farligt). ropare ropar först (de vet redan). Returnerar de
// som hörde det
export function larma(s: State, x: number, y: number, vad: string, storlek: number, ropare: Person[], falskt = false): Person[] {
  const hor = LARM.hor * (isLight(s.now) ? 1 : LARM.natt);
  const vet = new Set<Person>(ropare), hort: Person[] = [];
  for (const p of ropare) p.larm = { t: s.now, x, y, vad, storlek, led: 0, ...(falskt ? { falskt: true as const } : {}) };
  let ropar = [...ropare];
  for (let led = 1; ropar.length; led++) {
    const nya: Person[] = [];
    for (const q of living(s)) {
      if (vet.has(q)) continue;
      const fran = ropar.find(r => Math.hypot(r.x - q.x, r.y - q.y) <= hor);
      if (!fran) continue;
      vet.add(q); hort.push(q);
      const st = Math.max(1, Math.round((fran.larm?.storlek ?? storlek) * (1 + LARM.forvrang * (2 * rnd(s, 'rykte', q) - 1))));
      q.larm = { t: s.now, x, y, vad, storlek: st, led, ...(falskt ? { falskt: true as const } : {}) };
      think(q, `Hörde rop: ${vad}`, -LARM.oro, s.now, LARM.oroTim * HOUR);
      count(s, 'larm_hort');
      if (rnd(s, 'rykte', q) < LARM.vidare) nya.push(q);
    }
    ropar = nya;
  }
  count(s, falskt ? 'larm_falskt' : 'larm');
  if (hort.length) log(s, `${ropare.map(p => p.name).join(' och ')} ropade ${falskt ? 'falskt larm' : 'larm'} (${vad}). ${hort.length} hörde det.`, 'rel', ropare.map(p => p.id));
  return hort;
}
// minns p ett larm nu?
export const larmNu = (s: State, p: Person) => p.larm && s.now - p.larm.t < LARM.tim * HOUR ? p.larm : undefined;
