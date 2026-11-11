import { DAY, HOUR, MIN, Person, State } from './typer';
import { alive, byId, count, enTill, forstaGang, gjort, log, ovning, stat, think } from './folk';
import { clamp, rnd } from './slump';
import { Del, addDel } from './egendom';
import { amountOf, put, use } from './lager';
import { Station, isKlar, kanGoras, stationFor, stationerOf } from './stationer';
import { matPerDygn } from './ekonomi';
import { ageIndex, kallTid } from './tid';
import { SAKER } from './saker';
import { loggBer } from './berattelser';
import { balans } from './balans';
import { SJUK, insjukna } from './sjukdom';
import { INGREDIENSER, KATEGORIER, Kategori, Maltidsniva, RATT, RATT_HUVUD, RATT_HUVUD_LIST, RATT_SAKER, RattHuvud, grupperAv, hallerSteg, nivaAvGrupper, rattId } from './ratter';
import { tingOf } from './agande';
import { getable, takeMaterial } from './behov';
import { knows } from './teknik';

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
  passExtra: 5, // ett pass vid grillen varar så många minuter längre än maten tar
  brann: 0.3, // en helt ovan kock bränner så stor del av maten ...
  brannFull: 10, // ... och den med färdigheten Matlagning så här hög bränner inget
  ovning: 0.15, // färdigheten växer så här mycket per timme vid grillen (gånger 0,4 + intelligens / 20)
  sjuk: 0.015, // chansen att bli matförgiftad av en hel portion rått kött eller rå fisk
  sjukMin: 2, sjukSpann: 4, // matförgiftad i så många timmar (min + slump × spann)
  surt: -0.03, surtTim: 4, // tanken av att äta rått kött eller rå fisk, och hur länge den varar (timmar)
  forgiftad: -0.2, // tanken av att bli matförgiftad (ett halvt dygn)
  kockGlad: 0.03, // en mästerkock (Matlagning brannFull) ger maten så här mycket mer humör (steg 9.6.4)
});

// Rätterna: råvaran som grillas, rätten den blir och hur mycket (per styck). I den ordning de grillas: det som förstörs
// fortast först. En ny rätt blir en rad här och en sak i saker.ts
export interface Ratt { ra: string; blir: string; per: number }
export const RATTER: readonly Ratt[] = [
  { ra: 'fisk', blir: 'grillfisk', per: 1 },
  { ra: 'abborre', blir: 'grillfisk', per: 1 }, // den hela abborren grillas som den är när den inte rensats
  { ra: 'gaddkott', blir: 'grillgadda', per: 1 }, { ra: 'gadda', blir: 'grillgadda', per: 1 }, { ra: 'mortkott', blir: 'grillmort', per: 1 }, // grillad fisk behåller artens näring (steg 7.4.3)
  { ra: 'braxkott', blir: 'grillfisk', per: 1 }, { ra: 'sikkott', blir: 'grillfisk', per: 1 }, // steg 9.6.17
  { ra: 'kott', blir: 'grillkott', per: 1 },
  { ra: 'vargkott', blir: 'grillkott', per: 1 }, // köttet är eget per art men blir samma grillade kött (steg 3.7.14)
];
// det som grillas nu: den första råvaran det finns tillräckligt av (gränssnittet visar den på spettet)
export const grillVara = (s: State) => RATTER.find(r => amountOf(s, r.ra) >= MATLAG.min);
// p kan grilla: byn har grillen, elden brinner, det finns något att grilla och ingen annan grillar
export const kanGrilla = (s: State, p: Person) => kanGoras(s, 'grilla', p) && s.fire.lit && !!grillVara(s) && !!stationFor(s, 'grilla', p); // en grill rymmer sin arbetare (steg 10.2.5)
// hur länge ett pass vid grillen varar
export const grillTid = (s: State) => { const r = grillVara(s); return Math.min(MATLAG.maxTim * HOUR, (r ? amountOf(s, r.ra) / MATLAG.timme : 0) * HOUR + MATLAG.passExtra * MIN); };
// så stor del av maten p bränner
export const brannDel = (p: Person) => MATLAG.brann * clamp(1 - (p.skill.matlagning ?? 0) / MATLAG.brannFull, 0, 1);

// grilla i hours timmar. Arbetet går mot nästa hela bit (p.delar), och varje hel bit bränns eller inte (steg 9.6.4): chansen
// sjunker med färdigheten Matlagning. Rätten är deras som ägde råvaran; det som bränns är förstört
export function grilla(s: State, p: Person, hours: number) {
  const r = grillVara(s);
  if (!r || !s.fire.lit || !kanGoras(s, 'grilla')) { if (p.task) p.task.until = s.now; return; }
  const d = (p.delar ??= {}), t = (d[GRILL] ?? 0) + hours * MATLAG.timme, hela = Math.min(Math.floor(t + 1e-9), Math.floor(amountOf(s, r.ra) + 1e-9));
  d[GRILL] = Math.min(t - Math.floor(t + 1e-9), 0.999);
  if (d[GRILL] <= 1e-9) delete d[GRILL];
  if (!Object.keys(d).length) delete p.delar;
  if (hela <= 0) return;
  let brant = 0;
  for (let i = 0; i < hela; i++) {
    const vems = use(s, p, r.ra, 1);
    if (rnd(s, 'mat', p) < brannDel(p)) { brant++; continue; }
    put(s, r.blir, r.per, addDel({}, vems, r.per)); kockensHand(s, p, r.blir, r.per);
  }
  count(s, 'grillat', hela); count(s, 'brant', brant); gjort(s, p, 'grillat', hela);
  ovning(p, 'matlagning', hours * MATLAG.ovning * (0.4 + stat(p, 'intelligens', s.now) / 20));
  if (forstaGang(s, 'grillForsta')) log(s, `${p.name} grillade byns första ${SAKER[r.ra]!.namn.toLowerCase()} på spettet över elden.`, 'world', [p.id]);
}
const GRILL = 'grill:'; // arbetet mot nästa grillade bit (p.delar)
// kockens hand (steg 9.6.4): en skicklig kock ger maten en liten humörhöjning. Varje slag av lagad mat i förrådet minns hur
// skicklig kocken var (s.kockHand, medelvärdet efter mängden), och den som äter den får tanken (behov.ts)
export function kockensHand(s: State, p: Person, k: string, n: number) {
  const h = (s.kockHand ??= {}), har = amountOf(s, k) - n, v = clamp((p.skill.matlagning ?? 0) / MATLAG.brannFull, 0, 1);
  h[k] = har > 0 ? ((h[k] ?? 0) * har + v * n) / (har + n) : v;
}
export const kockGlad = (s: State, per: Record<string, number>) => { let b = 0; for (const k in per) if (per[k] > 0) b = Math.max(b, s.kockHand?.[k] ?? 0); return b * MATLAG.kockGlad; };
// ---------- rått kött och rå fisk ----------
// p har ätit per (av varje slag, behov.ts) av en portion full: det råa köttet och den råa fisken (ra i saker.ts) gör en lite
// sur och kan ge matförgiftning, oftare ju mer av portionen som var rå. En dragning bara när något rått ätits
export function ratt(s: State, p: Person, per: Record<string, number>, full: number) {
  let ra = 0, mest = '';
  for (const k in per) if (SAKER[k]?.ra) { ra += per[k]; if (!mest || per[k] > per[mest]) mest = k; }
  if (ra <= 1e-9) return;
  count(s, 'rattAtit', ra);
  think(p, 'Åt rått', MATLAG.surt, s.now, MATLAG.surtTim * HOUR);
  if (rnd(s, 'halsa', p) >= ra / full * MATLAG.sjuk * SJUK.ratt) return;
  const sak = SAKER[mest]!, vad = `rå${sak.ett ? 'tt' : ''} ${sak.namn.toLowerCase()}`; insjukna(s, p, 'matforgiftning', `av ${vad}`); p.sickWhy = `Matförgiftad av ${vad}`; // steg 9.5.1
  think(p, 'Blev matförgiftad av rått kött eller rå fisk', MATLAG.forgiftad, s.now, 12 * HOUR); smakForgiftad(p, mest); // en avsky (steg 9.6.6)
  count(s, 'matforgiftad');
  // det som åts står i raden, och ingen rad om hen redan blivit förgiftad samma timme (svampen, steg 6.7.5)
  if (!s.log.some(e => e.t > s.now - HOUR && e.ids.length === 1 && e.ids[0] === p.id && (e.m === 'l_raMat' || e.text.includes('förgiftad')))) loggBer(s, 'l_raMat', p.id, { namn: p.name, hen: p.sex === 'm' ? 'han' : 'hon', vad }, 'world', [p.id]);
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
  maltDygn: 3, // och så många dygn gror det blötta kornet och torkar till malt (steg 9.6.13, brygg.ts)
  rymd: 4, // så mycket ryms på en ställning (fyra köttbitar, steg 2.10.22)
  timme: 12, // så mycket som hängs upp eller tas ner i timmen
  maxTim: 1, // ett pass vid ställningen är högst så här många timmar
  // det råa som behålls (steg 10.2.11): det byn äter (matPerDygn i ekonomi.ts) så länge det råa håller; resten hängs upp. Inför och
  // under istiden vill byn ha torkad mat för vinterDygn dygn, och då hängs allt råa över TORK.min upp tills den har det
  vinterDygn: 4,
  min: 1, // byn hänger upp när det finns så här mycket över
});
// det som torkas och vad det blir. I den ordning det hängs upp: det som ruttnar fortast först. En ny rad här och en sak i saker.ts
export const TORKAS: readonly Ratt[] = [
  { ra: 'fisk', blir: 'torrfisk', per: 1 },
  { ra: 'abborre', blir: 'torrfisk', per: 1 }, // den hela abborren hängs i stjärten
  { ra: 'gaddkott', blir: 'torrgadda', per: 1 }, { ra: 'mortkott', blir: 'torrmort', per: 1 },
  { ra: 'braxkott', blir: 'torrfisk', per: 1 }, { ra: 'sikkott', blir: 'torrfisk', per: 1 }, // steg 9.6.17
  { ra: 'ratlin', blir: 'lin', per: 1 }, // linet rötas som köttet på torkställningen (steg 7.7.7)
  { ra: 'kott', blir: 'torrkott', per: 1 },
  { ra: 'vargkott', blir: 'torrkott', per: 1 },
];
// rökeriet (steg 9.6.8): en station som torkställningen, där köttet och fisken röks på ROK.dygn dygn, också i regn och på
// vintern (handlingen roka har inget krav på vädret), och blir rökt mat som håller som den torkade och smakar lite bättre
export const ROK = balans('rokeri', {
  dygn: 1, // så många dygn tar det att röka kött och fisk
  glad: 0.01, // tanken av att äta rökt mat (smakar lite bättre)
});
export const ROKAS: readonly Ratt[] = [
  { ra: 'fisk', blir: 'rokfisk', per: 1 }, { ra: 'abborre', blir: 'rokfisk', per: 1 }, { ra: 'gaddkott', blir: 'rokfisk', per: 1 }, { ra: 'mortkott', blir: 'rokfisk', per: 1 }, { ra: 'braxkott', blir: 'rokfisk', per: 1 }, { ra: 'sikkott', blir: 'rokfisk', per: 1 },
  { ra: 'kott', blir: 'rokkott', per: 1 }, { ra: 'vargkott', blir: 'rokkott', per: 1 },
];
export type TorkSlag = 'tork' | 'rokeri';
const TORK_RAD = { tork: () => TORKAS, rokeri: () => ROKAS };
const torkDygn = (k: TorkSlag) => k === 'rokeri' ? ROK.dygn : TORK.dygn;
export type Hang = NonNullable<Station['tork']>[number];
// byns färdiga torkställningar (eller rökerier), och den första av dem
export const torkarna = (s: State, k: TorkSlag = 'tork') => stationerOf(s).filter(t => isKlar(t) && t.k === k);
export const torken = (s: State): Station | undefined => torkarna(s)[0];
const hangOf = (t: Station) => t.tork ?? (t.tork = []);
const hangtSumma = (t?: Station) => { let n = 0; for (const q of t?.tork ?? []) n += q.n; return n; };
// hur stor del av torkningen som är gjord (0–1): gränssnittet färgar maten efter det
export const torrDel = (s: State, q: Hang, k: TorkSlag = 'tork') => clamp((s.now - q.t) / ((q.k === 'maltkorn' ? TORK.maltDygn : torkDygn(k)) * DAY), 0, 1);
const klar = (s: State, q: Hang, k: TorkSlag = 'tork') => s.now - q.t >= (q.k === 'maltkorn' ? BRYGG_MALT() : torkDygn(k)) * DAY; // maltet gror och torkar (steg 9.6.13)
const BRYGG_MALT = () => TORK.maltDygn;
// så mycket rått (i saker) som finns över det byn äter innan det ruttnar (steg 10.2.11): det äts under så många dygn som det som
// ruttnar först håller. Inför och under istiden behålls inget rått förrän byn har sin torkade mat för vintern (torkVinter)
function ratOver(s: State, k: TorkSlag = 'tork') {
  let n = 0, mat = 0, haller = Infinity;
  for (const r of TORK_RAD[k]()) { const a = amountOf(s, r.ra); if (a < 1) continue; n += a; mat += a * (SAKER[r.ra]?.mat ?? 1); haller = Math.min(haller, SAKER[r.ra]?.haller ?? 1); }
  if (!n) return 0;
  const spara = torkVinter(s) ? 0 : matPerDygn(s) * (haller === Infinity ? 1 : haller);
  return Math.max(0, Math.floor((mat - spara) / (mat / n)));
}
// byn vill ha mer torkad mat inför vintern: inför och under istiden, och den torkade och rökta maten räcker kortare än TORK.vinterDygn
function torkVinter(s: State) {
  if (!kallTid(ageIndex(s))) return false;
  let torr = 0;
  for (const r of [...TORKAS, ...ROKAS]) if (SAKER[r.blir]?.mat) torr += amountOf(s, r.blir) * SAKER[r.blir]!.mat!;
  return torr < matPerDygn(s) * TORK.vinterDygn;
}
// arbetet som väntar vid ställningarna: det som är klart att ta ner, och det råa som ska upp och får plats. fri = platsen
// som finns när det klara tagits ner, over = det råa som finns över
function torkArbete(s: State, k: TorkSlag = 'tork') {
  const ts = torkarna(s, k);
  if (!ts.length) return { ner: 0, upp: 0, fri: 0, over: 0 };
  let ner = 0, fri = 0;
  for (const t of ts) { fri += TORK.rymd - hangtSumma(t); for (const q of t.tork ?? []) if (klar(s, q, k)) ner += q.n; }
  fri += ner;
  const over = ratOver(s, k), upp = over >= TORK.min ? Math.min(over, fri) : 0;
  return { ner, upp: Math.max(0, upp), fri, over };
}
// en torkställning till (projekt.ts): 1 när byn saknar en, annars hur mycket av det råa som finns över som inte får plats på
// ställningarna, i ställningar (steg 2.10.22)
export function torkBrist(s: State) {
  const n = torkarna(s).length;
  if (!n) return 1;
  const a = torkArbete(s); // så många ställningar som det råa som finns över behöver (steg 10.2.11)
  return a.over >= TORK.min ? clamp((a.over - a.fri) / TORK.rymd, 0, 1) : 0;
}
// p kan torka: byn har ställningen, något är klart att ta ner eller det finns rått över och plats, och ingen annan gör det
export function kanTorka(s: State, p: Person, k: TorkSlag = 'tork') {
  const act = k === 'rokeri' ? 'roka' : 'torka';
  if (!kanGoras(s, act, p) || !stationFor(s, act, p)) return false; // en ställning rymmer sin arbetare (steg 10.2.5)
  const a = torkArbete(s, k);
  return a.ner > 1e-6 || a.upp >= TORK.min;
}
// hur länge ett pass vid ställningen varar
export const torkTid = (s: State, k: TorkSlag = 'tork') => { const a = torkArbete(s, k); return Math.min(TORK.maxTim * HOUR, (a.ner + a.upp) / TORK.timme * HOUR + 5 * MIN); };

// torka i hours timmar: först ner det som är klart, sedan upp med det råa som finns över, ställning för ställning
export function torka(s: State, p: Person, hours: number, k: TorkSlag = 'tork') {
  const ts = torkarna(s, k), RAD = TORK_RAD[k]();
  if (!ts.length) { if (p.task) p.task.until = s.now; return; }
  let kan = hours * TORK.timme, over = ratOver(s, k);
  for (const h of ts.map(hangOf)) for (let i = 0; i < h.length && kan > 1e-9;) {
    const q = h[i];
    if (!klar(s, q, k)) { i++; continue; }
    const n = Math.min(q.n, kan), f = n / q.n, ag: Del = {};
    for (const o in q.ag) { const m = q.ag[o] * f; q.ag[o] -= m; const ag0 = byId(s, Number(o)); if (ag0 && alive(ag0)) ag[o] = m; }
    put(s, q.k === 'maltkorn' ? 'malt' : RAD.find(r => r.ra === q.k)!.blir, n, ag);
    q.n -= n; kan -= n; count(s, k === 'rokeri' ? 'rokt' : 'torkat', n);
    if (q.n <= 1e-6) h.splice(i, 1);
    if (k === 'tork' && forstaGang(s, 'torkForsta')) log(s, q.k === 'maltkorn' ? `${p.name} tog ner byns första torkade malt från torkställningen.` : q.k === 'ratlin' ? `${p.name} tog ner byns första rötade lin från torkställningen.` : `${p.name} tog ner byns första torkade ${SAKER[q.k]?.namn.endsWith('ött') ? 'kött' : 'fisk'} från torkställningen. Den håller länge i lagret.`, 'world', [p.id]);
  }
  for (const t of ts) {
    const h = hangOf(t);
    let plats = TORK.rymd - hangtSumma(t);
    for (const r of RAD) {
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

// ---------- kokningen i lerkrukan (steg 9.6.3, ratter.ts) ----------
// Den som lagar mat förbereder en rätt vid elden (KOK.prepMin minuters arbete): huvudingrediensen, en råvara ur en annan grupp
// och, om det finns, rölleka som smak. Rätten läggs i en mellanstor lerkruka som ställs i elden och står där den passiva tiden
// (KATEGORIER: gröten 5 minuter, grytan 10 och soppan 15) utan kocken, så länge elden brinner. Sedan läggs portionerna i
// förrådet, och den tomma krukan är ledig igen. Rätten är deras som ägde råvarorna
export const KOK = balans('kokning', {
  prepMin: 3, // så många minuters arbete tar det att förbereda en rätt (2–4 minuter i designen)
  dygn: 1, // byn lagar mat när rätterna räcker kortare än så här många dygn av det byn äter (matPerDygn, steg 10.2.11)
});
const RATT_SMAK = ['lok', 'salt', 'rolleka']; // smaken i krukan (steg 9.6.3, 9.6.19 och 9.6.20)
// råvarorna som går i krukan: de med grupper, utom det redan grillade och det som först ska slaktas
const iKrukan = (k: string) => !!INGREDIENSER[k] && !k.startsWith('grill') && k !== 'vilt' && k !== 'fagel' && !RATT_SMAK.includes(k);
export interface KokRecept { id: string; huvud: string; andra: string; smak?: string; kat: Kategori; niva: Maltidsniva; hh: RattHuvud }
// det som kan kokas nu, av det p kan ta (eller byn har): den första huvudingrediensen i ordningen, en råvara ur en annan grupp
// (helst stärkelse), och smaken om den finns
export function kokRecept(s: State, p?: Person): KokRecept | undefined {
  const har = (k: string, n: number) => (p ? getable(s, p, k) : amountOf(s, k)) - (RATT.spara[k] ?? 0) >= n;
  for (const hh of RATT_HUVUD_LIST) {
    const huvud = Object.keys(INGREDIENSER).find(k => INGREDIENSER[k].huvud === hh && iKrukan(k) && har(k, RATT.huvud));
    if (!huvud) continue;
    const g0 = grupperAv(huvud), andra = Object.keys(INGREDIENSER).filter(k => k !== huvud && iKrukan(k) && grupperAv(k).some(g => !g0.includes(g)) && har(k, RATT.andra))
      .sort((a, b) => (grupperAv(b).includes('starkelse') ? 1 : 0) - (grupperAv(a).includes('starkelse') ? 1 : 0))[0];
    if (!andra) continue;
    const smak = RATT_SMAK.find(k => har(k, RATT.smak));
    const grupper = new Set([...g0, ...grupperAv(andra), ...(smak ? grupperAv(smak) : [])]), niva = nivaAvGrupper(grupper);
    if (niva !== 'lagad' && niva !== 'fin') continue;
    const kats = RATT_HUVUD[hh].kat as Kategori[], kat = grupperAv(andra).includes('starkelse') ? kats[0] : kats[kats.length - 1];
    // rättens hållbarhet är medelvärdet av ingrediensernas (steg 9.6.7): med torkad råvara håller den länge
    const haller = hallerMedel([[huvud, RATT.huvud], [andra, RATT.andra], ...(smak ? [[smak, RATT.smak] as [string, number]] : [])]);
    return { id: rattId(hh, kat, niva, haller), huvud, andra, smak, kat, niva, hh };
  }
  return undefined;
}
// medelvärdet av ingrediensernas hållbarhet, efter mängden, avrundat till ett steg i HALLER_STEG (dygn). Det som inte ruttnar
// (salt, talg, örter) räknas inte; ruttnar inget, håller rätten RATT.haller
export const hallerMedel = (ing: [string, number][]) => { let h = 0, n = 0; for (const [k, m] of ing) { const d = SAKER[k]?.haller; if (d === undefined) continue; h += d * m; n += m; } return hallerSteg(n ? h / n : RATT.haller); };
// en mellanstor lerkruka som är färdig, tom, inte bärs och inte står på elden
export const ledigKruka = (s: State) => tingOf(s).find(t => t.k === 'lerkruka_mellan' && t.ler === undefined && !t.inne && !t.kok && !t.vaxt && t.hos === undefined && t.c > 0);
// krukorna som står på elden
export const kokarNu = (s: State) => tingOf(s).filter(t => t.kok);
// rätterna i förrådet och i krukorna, i mat (steg 10.2.11): mot det byn äter
const rattMat = (s: State) => RATT_SAKER.reduce((n, k) => n + amountOf(s, k) * (SAKER[k]?.mat ?? 1), 0) + kokarNu(s).reduce((n, t) => n + t.kok!.n, 0);
const ratterBehovs = (s: State) => rattMat(s) < matPerDygn(s) * KOK.dygn;
// p kan laga mat: kan krukan, elden brinner, en ledig kruka, något att koka, byn har för få rätter och ingen annan lagar mat
export const kanKoka = (s: State, p: Person) => knows(p, 'kruka') && s.fire.lit && !!ledigKruka(s) && ratterBehovs(s) && enTill(s, 'koka_mat', p) && !!kokRecept(s, p);
// förberedelsen är klar (KLAR i steg.ts): råvarorna tas, och rätten ställs på elden i krukan
export function kokaKlar(s: State, p: Person) {
  const r = kokRecept(s, p), t = ledigKruka(s);
  if (!r || !t || !s.fire.lit) return;
  const ag: Record<string, number> = {};
  for (const [k, n] of [[r.huvud, RATT.huvud], [r.andra, RATT.andra], ...(r.smak ? [[r.smak, RATT.smak]] : [])] as [string, number][]) addDel(ag, takeMaterial(s, p, k, n), 1);
  let n = 0; for (let i = 0; i < RATT.portioner; i++) if (rnd(s, 'mat', p) >= brannDel(p)) n++; // varje portion bränns eller inte (steg 9.6.4)
  count(s, 'brant', RATT.portioner - n);
  t.kok = { r: r.id, n, kvar: KATEGORIER[r.kat].passiv * MIN, ag, h: clamp((p.skill.matlagning ?? 0) / MATLAG.brannFull, 0, 1) };
  count(s, 'kokat'); gjort(s, p, 'kokat', 1);
  ovning(p, 'matlagning', KOK.prepMin / 60 * MATLAG.ovning * (0.4 + stat(p, 'intelligens', s.now) / 20));
  if (forstaGang(s, 'kokForsta')) log(s, `${p.name} lagade byns första ${SAKER[r.id]!.namn.split(' · ')[0].toLowerCase()} i en lerkruka över elden.`, 'world', [p.id]);
}
// en gång i timmen (steg.ts): krukorna på elden kokar medan elden brinner, och den färdiga rätten läggs i förrådet
export function stepKok(s: State) {
  for (const t of kokarNu(s)) {
    if (s.fire.lit) t.kok!.kvar -= HOUR;
    if (t.kok!.kvar > 0) continue;
    const tot = Object.values(t.kok!.ag).reduce((a, b) => a + b, 0) || 1, ag: Del = {};
    for (const o in t.kok!.ag) { const q = byId(s, Number(o)); if (q && alive(q)) ag[o] = t.kok!.ag[o] / tot * t.kok!.n; }
    if (t.kok!.n > 0) { const h = (s.kockHand ??= {}), har = amountOf(s, t.kok!.r); h[t.kok!.r] = har > 0 ? ((h[t.kok!.r] ?? 0) * har + (t.kok!.h ?? 0) * t.kok!.n) / (har + t.kok!.n) : t.kok!.h ?? 0; put(s, t.kok!.r, t.kok!.n, ag); }
    count(s, 'ratter', t.kok!.n);
    t.kok = undefined;
  }
}
import { smakForgiftad } from './rykten';

// ---------- stekhällen (steg 9.6.21) ----------
// En flat sten över elden vid grillen (tillbehöret stekhall). Kött eller fisk steks med talg (och smak, om det finns) till en
// stek: protein och fett är två grupper, så steken är lagad, med smak fin. Den smakar bättre (STEK.glad när man äter den)
export const STEK = balans('stek', {
  min: 3, // så många minuters arbete
  huvud: 2, talg: 1, // av köttet eller fisken och talgen; det blir lika många portioner som köttet
  glad: 0.02, // tanken av att äta en stek, utöver måltidens nivå
});
const stekhallen = (s: State) => stationerOf(s).find(t => t.k === 'grill' && isKlar(t) && t.med?.includes('stekhall'));
export function stekRecept(s: State, p?: Person) {
  const har = (k: string, n: number) => (p ? getable(s, p, k) : amountOf(s, k)) - (RATT.spara[k] ?? 0) >= n;
  if (!har('talg', STEK.talg)) return undefined;
  for (const hh of ['kott', 'fisk'] as RattHuvud[]) {
    const huvud = Object.keys(INGREDIENSER).find(k => INGREDIENSER[k].huvud === hh && iKrukan(k) && SAKER[k]?.ra && har(k, STEK.huvud));
    if (!huvud) continue;
    const smak = RATT_SMAK.find(k => har(k, RATT.smak));
    const niva = nivaAvGrupper(new Set([...grupperAv(huvud), 'fett', ...(smak ? grupperAv(smak) : [])]));
    return { id: rattId(hh, 'stek', niva, hallerMedel([[huvud, STEK.huvud], ['talg', STEK.talg], ...(smak ? [[smak, RATT.smak] as [string, number]] : [])])), huvud, smak, hh };
  }
  return undefined;
}
export const kanSteka = (s: State, p: Person) => knows(p, 'stekhall') && s.fire.lit && !!stekhallen(s) && ratterBehovs(s) && !!stationFor(s, 'steka', p) && !!stekRecept(s, p);
export function stekaKlar(s: State, p: Person) {
  const r = stekRecept(s, p);
  if (!r || !s.fire.lit || !stekhallen(s)) return;
  const ag: Record<string, number> = {};
  for (const [k, n] of [[r.huvud, STEK.huvud], ['talg', STEK.talg], ...(r.smak ? [[r.smak, RATT.smak]] : [])] as [string, number][]) addDel(ag, takeMaterial(s, p, k, n), 1);
  let n = 0; for (let i = 0; i < STEK.huvud; i++) if (rnd(s, 'mat', p) >= brannDel(p)) n++;
  count(s, 'brant', STEK.huvud - n); count(s, 'stekt', n);
  if (n > 0) { const tot = Object.values(ag).reduce((a, b) => a + b, 0) || 1, del: Del = {}; for (const o in ag) del[o] = ag[o] / tot * n; put(s, r.id, n, del); kockensHand(s, p, r.id, n); }
  ovning(p, 'matlagning', STEK.min / 60 * MATLAG.ovning * (0.4 + stat(p, 'intelligens', s.now) / 20));
  if (forstaGang(s, 'stekForsta')) log(s, `${p.name} stekte byns första ${SAKER[r.id]!.namn.split(' · ')[0].toLowerCase()} på stekhällen.`, 'world', [p.id]);
}

// ---------- bakugnen och brödet (steg 9.6.23) ----------
// Bagaren gör en deg av mjöl och vatten och eldar ugnen med en ved (BAK.min minuters arbete); degen jäser och gräddas sedan
// i ugnen (KATEGORIER.brod: 25 minuter) utan bagaren, och brödet läggs i förrådet. Brödet håller sex dygn
export const BAK = balans('bak', {
  min: 3, // så många minuters arbete
  mjol: 4, ved: 1, // så mycket mjöl och ved per sats; vattnet tas ur en fylld behållare
  brod: 4, // så många bröd blir det
  dygn: 1, // byn bakar när bröden räcker kortare än så här många dygn av det byn äter (steg 10.2.11)
});
export const bakugnen = (s: State) => stationerOf(s).find(t => t.k === 'bakugn' && isKlar(t) && !t.deg);
export const kanBaka = (s: State, p: Person) => knows(p, 'bakugn') && !!bakugnen(s) && amountOf(s, 'brod') * (SAKER.brod?.mat ?? 1) < matPerDygn(s) * BAK.dygn && !!stationFor(s, 'baka', p) && getable(s, p, 'mjol') >= BAK.mjol && getable(s, p, 'ved') >= BAK.ved && !!fylldSack(s);
export function bakaKlar(s: State, p: Person) {
  const t = bakugnen(s), sack = fylldSack(s);
  if (!t || !sack || getable(s, p, 'mjol') < BAK.mjol || getable(s, p, 'ved') < BAK.ved) return;
  const ag: Record<string, number> = {};
  addDel(ag, takeMaterial(s, p, 'mjol', BAK.mjol), 1); takeMaterial(s, p, 'ved', BAK.ved); sack.inne = undefined;
  let n = 0; for (let i = 0; i < BAK.brod; i++) if (rnd(s, 'mat', p) >= brannDel(p)) n++;
  count(s, 'brant', BAK.brod - n);
  t.deg = { n, kvar: KATEGORIER.brod.passiv * MIN, ag };
  ovning(p, 'matlagning', BAK.min / 60 * MATLAG.ovning * (0.4 + stat(p, 'intelligens', s.now) / 20));
  if (forstaGang(s, 'bakForsta')) log(s, `${p.name} satte in byns första deg i bakugnen.`, 'world', [p.id]);
}
// en gång i timmen (steg.ts): degen i ugnen jäser och gräddas, och brödet läggs i förrådet
export function stepBak(s: State) {
  for (const t of stationerOf(s)) {
    if (!t.deg) continue;
    t.deg.kvar -= HOUR;
    if (t.deg.kvar > 0) continue;
    const tot = Object.values(t.deg.ag).reduce((a, b) => a + b, 0) || 1, del: Del = {};
    for (const o in t.deg.ag) { const q = byId(s, Number(o)); if (q && alive(q)) del[o] = t.deg.ag[o] / tot * t.deg.n; }
    if (t.deg.n > 0) { put(s, 'brod', t.deg.n, del); count(s, 'bakat', t.deg.n); }
    t.deg = undefined;
  }
}
import { fylldSack } from './agande';
