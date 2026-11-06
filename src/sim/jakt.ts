import { utanforByn } from './omrade';
import { balans } from './balans';
import { blodas } from './blod';
import { blocked, freeNear } from './byggnad';
import { KANINER, KANIN_UT, RADJUR, RADJUR_UT, arRadjur, dodaDjur, djurOf, dragOf, gruppFlyr, halsaOf, radjurOf, satDjurHalsa } from './djur';
import { styckaFallt } from './styckning';
import { count, forstaGang, gjort, log, ovning, stat } from './folk';
import { skada } from './halsa';
import { groundOf, markslag, tileOf } from './mark';
import { KANIN } from './redskap';
import { clamp, rnd } from './slump';
import { KAST, SLAGSMAL, STRID, VAPEN, Vapen, Uppstallning, chansMot, djurKampe, kastat, nyStrid, slump, traffa } from './strid';
import { isLight } from './tid';
import { HOUR, Jaktforsok, Person, SEC, State, T, Task, W, inMap } from './typer';
import { viltStart } from './fynd';
import { getMap, hash } from './karta';
import { motgangNu } from './motgang';
import { snoPaMarken, vaderNu } from './vader';
import { wearTool } from './agande';
import { tecken } from './religion';

// ---------- jakten som strid (steg 3.7.3) ----------
// Jägaren letar upp en kanin nära jaktplatsen och smyger sig fram. Kaninen ser hen på ett avstånd som beror på kaninens
// skygghet, ljuset, terrängen där den sitter, snön och om gruppen nyss skrämts; den smidiga och vana jägaren syns senare.
// Jägaren gissar var hen blir sedd (bättre med vana): tror hen att hen kommer ända fram smyger hen hela vägen och sticker
// (eller griper med händerna), annars stannar hen och kastar spjutet eller en sten därifrån. Den kanin som inte sett
// jägaren varken duckar eller hoppar undan; den som ser jägaren först flyr, och då hinner jägaren bara kasta efter den.
// Kaninen slår aldrig tillbaka, men den som griper en levande kanin kan bli biten. Hela försöket räknas när det börjar
// med stridens regler och en egen slumpföljd (fröet ur jägarens följd), så att det blir likadant i båda lägena. Gruppen
// skräms av varje försök och är svårare att smyga på en stund. Stenen träffar sämre och tappas oftast bort
export const JAKT = balans('jakt', {
  smygSek: 120, // ett försök: så många sekunder att leta upp en kanin och smyga sig fram
  letaR: 30, // finns ingen kanin nära jaktplatsen går jägaren till den närmaste gruppen inom så här många rutor ...
  letaMin: 8, letaMax: 16, // ... och ser hen ingen letar hen vidare: till en ruta så här långt bort där viltkartan är hög (steg 3.10.3) ...
  letaHem: 45, // ... men inte längre än så här från byn ...
  letaSlump: 0.5, // ... med så här mycket slump i valet, så att jägarna inte går till samma ruta
  upptack: 3, // så långt (rutor) en kanin med medelskygghet ser den som smyger på öppen mark i dagsljus ...
  skygg: 0.6, // ... gånger 1 − skygg/2 + skygg × kaninens skygghet (0–1) ...
  natt: 0.6, hog: 0.7, ung: 0.6, skog: 0.5, bar: 1.15, // ... i mörkret och i terrängen där kaninen sitter ...
  sno: 0.3, // ... och så mycket längre på snö (1 + sno × snön) ...
  skramd: 1.3, skramdTim: 2, // ... och i en grupp som skrämts de senaste timmarna
  smid: 0.04, // den som smyger syns så här mycket senare per poäng smidighet över 10 ...
  vana: 0.03, // ... och per poäng jaktfärdighet
  gissa: 0.5, // jägaren gissar avståndet där hen blir sedd med ett fel på upp till så här stor del (ingen gissning vid jakt 20) ...
  marg: 1.15, // ... och stannar en bit utanför: på så här stor del av det gissade avståndet
  smyg: 1.2, // chansen att träffa en kanin som inte sett en, gånger detta
  flyr: 0.4, // ett kast efter en kanin som just såg en och sprang, gånger detta
  sten: 0.6, // stenen träffar sämre än spjutet ...
  stenBorta: 0.6, stenSek: 120, // ... och tappas oftast bort, och då tar det så här länge att hitta en ny
  hamtaSek: 40, // att hämta det kastade spjutet
  dod: 0.2, // en kanin dör av träffar (och gamla sår) av den här graden sammanlagt; en svagare träff och den springer skadad
  bett: 0.15, bettGrad: 0.06, // den som griper en kanin med händerna blir biten med den här chansen och graden
  fly: 6, // så långt (rutor) flyr gruppen bort från jägaren när den skräms (steg 4.5.4.1), och då får jägaren smyga sig nära igen
});
// ---------- försöket som det syns (steg 4.5.4.1) ----------
// Försöket är lika långt som förut (smygSek och det kastade som hämtas), men det mesta av tiden letar jägaren efter
// hararna. Sedan smyger hen jämnt fram i JAKTSYN.smyg sekunder, siktar 3–5 sekunder (kort efter en hare som redan flyr),
// kastar (eller sticker eller griper), hämtar det kastade och går tillbaka. Tiderna räknas här, så att flocken flyr i
// simuleringen när den flyr i bilden (gränssnittet visar det, ui/jakt.ts). Talen är bara hur det ser ut
export const JAKTSYN = { smyg: 60, smygRutor: 5, sikta: 3, siktaSpann: 2, siktaSett: 1, kastFart: 8, ga: 1.6, flyS: 1.6, plocka: 3 };
type P = { x: number; y: number };
const mot = (a: P, b: P, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const avst = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
// hur försöket går, i sekunder från början: tS jägaren börjar smyga från Q, tA hen är framme vid P, tK hen kastar,
// tI det slår till, tF haren flyr (och flocken med den, tFlock), tG jägaren har hämtat det som kastades i G, E slutet
export function jaktForlopp(f: Jaktforsok) {
  const FLY = arRadjur(f.id) ? RADJUR.flyJakt : JAKT.fly; // rådjuret flyr längre (steg 6.6.2)
  const E = JAKT.smygSek + f.extra, R = { x: f.x, y: f.y }, S = { x: f.sx, y: f.sy }, d0 = avst(R, S);
  const P = d0 > f.stopp ? mot(R, S, f.stopp / d0) : S; // där jägaren stannar, på vägen mellan hen och haren
  const dPS = avst(P, S), Q = dPS > JAKTSYN.smygRutor ? mot(P, S, JAKTSYN.smygRutor / dPS) : S; // där hen börjar smyga
  const kast = f.kast > 0, sikta = kast ? (f.sett ? JAKTSYN.siktaSett : JAKTSYN.sikta + JAKTSYN.siktaSpann * hash(f.t % 100003, f.id, 41)) : 0.5;
  const flyg = kast ? Math.max(0.6, f.kast / JAKTSYN.kastFart) : 0.5;
  const dP = avst(R, P), ut = dP > 0.01 ? { x: (R.x - P.x) / dP, y: (R.y - P.y) / dP } : d0 > 0.01 ? { x: (R.x - S.x) / d0, y: (R.y - S.y) / d0 } : { x: 1, y: 0 }; // bort från jägaren
  const tid = { tS: 0, tA: 0, tK: 0, tI: 0 };
  const kanin = (u: number) => u < tF ? R : mot(R, { x: R.x + ut.x * FLY, y: R.y + ut.y * FLY }, Math.min(1, (u - tF) / JAKTSYN.flyS));
  // det jägaren hämtar: det som kastades (en bit bortom haren om det missade) eller den fångade haren
  const Gav = (traffad: P) => kast ? (f.ut === 'miss' || f.ut === 'flydde' ? { x: traffad.x + ut.x, y: traffad.y + ut.y } : traffad) : f.ut === 'fangad' ? traffad : undefined;
  // bakifrån: hämtningen och vägen tillbaka slutar när försöket slutar
  const ungefar = Gav(R), efter = (ungefar ? avst(P, ungefar) + avst(ungefar, S) : dPS) / JAKTSYN.ga + (ungefar ? JAKTSYN.plocka : 0) + 1;
  tid.tI = Math.max(JAKTSYN.smyg + sikta + flyg + avst(S, Q) / JAKTSYN.ga, E - efter);
  tid.tK = tid.tI - flyg; tid.tA = tid.tK - sikta; tid.tS = tid.tA - JAKTSYN.smyg;
  const tF = f.sett ? tid.tA : f.ut === 'fangad' ? Infinity : tid.tI; // när haren flyr
  const tFlock = Math.min(tF, tid.tI); // flocken flyr med haren, eller när den fångade griper eller sticks
  const traffad = kanin(tid.tI), G = Gav(traffad);
  const tG = G ? tid.tI + avst(P, G) / JAKTSYN.ga + JAKTSYN.plocka : tid.tI;
  return { ...tid, tF, tFlock, tG, E, R, S, P, Q, G, ut, kast, kanin, fly: FLY };
}
// gruppen skräms (s.djurSkramd: gruppens id och när)
const skramd = (s: State, g: number) => !!s.djurSkramd?.some(x => x.g === g && s.now - x.t < JAKT.skramdTim * HOUR);
function skram(s: State, g: number) {
  s.djurSkramd = [...(s.djurSkramd ?? []).filter(x => x.g !== g && s.now - x.t < JAKT.skramdTim * HOUR), { g, t: s.now }];
}
const TERR = { hog: JAKT.hog, ung: JAKT.ung, buske: JAKT.ung, skog: JAKT.skog, kort: 1, bar: JAKT.bar };

// var jägaren letar när hen inte ser några kaniner (steg 3.10.3): den ruta letaMin–letaMax rutor bort där viltkartan (som
// kaningrupperna väljer plats efter, fynd.ts) är högst, med lite slump, inte i vattnet, i husen eller för långt från byn.
// Varannan ruta prövas (ringen räknas en gång). Ingen ruta: hen står kvar och spanar
const LETA_RING: { dx: number; dy: number }[] = [];
for (let dy = -JAKT.letaMax; dy <= JAKT.letaMax; dy += 2) for (let dx = -JAKT.letaMax; dx <= JAKT.letaMax; dx += 2) {
  const d = Math.hypot(dx, dy);
  if (d >= JAKT.letaMin && d <= JAKT.letaMax) LETA_RING.push({ dx, dy });
}
function letaPlats(s: State, p: Person) {
  const v = viltStart(s, s.now, motgangNu(s)?.id === 'torka'), tiles = getMap(s.seed).tiles, salt = Math.floor(rnd(s, 'arbete', p) * 1e9);
  const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
  let b: { x: number; y: number } | undefined, bv = 0;
  for (const { dx, dy } of LETA_RING) {
    const x = x0 + dx, y = y0 + dy;
    if (!inMap(x, y)) continue;
    const i = y * W + x;
    if (!(v[i] > bv)) continue;
    // poängen först (den är billig och avgör de flesta rutor), sedan de dyra villkoren; alla är rena, så valet blir detsamma
    const sc = v[i] * (1 - JAKT.letaSlump * hash(salt, x, y));
    if (sc > bv && tiles[i] !== T.Vatten && !(utanforByn(s, x, y) > JAKT.letaHem) && !blocked(s, x + 0.5, y + 0.5)) { bv = sc; b = { x: x + 0.5, y: y + 0.5 }; }
  }
  return b;
}
// ett försök: p jagar nära jaktplatsen med redskapet i handen (ett spjut) eller stenar. Försöket planeras när det börjar
// (t, tiden då det började) och sparas i tk.jf, så att gränssnittet kan visa hur jägaren smyger, siktar och kastar och om
// kaninen ser hen (Björn efter v159). Det som händer i världen händer när det är slut (jaktKlar). Svarar 0, −2 om jägaren
// gick mot en kanin längre bort, eller −1 om ingen kanin finns inom räckhåll
export function jaktForsok(s: State, p: Person, tk: Task, t = s.now): number {
  let m: ReturnType<typeof djurOf>[number] | undefined, md = KANINER.narvR + KANINER.hopp * KANINER.hoppMax;
  // bara de grupper som kan ha en kanin inom räckhåll räknas fram (kodgenomgången 3.10.25: de andra räknades vid varje arbetsbit)
  const dj = djurOf(s, s.now, undefined, (gx, gy) => Math.hypot(gx - tk.tx, gy - tk.ty) < md + KANIN_UT || Math.hypot(gx - p.x, gy - p.y) < JAKT.letaR + KANIN_UT);
  // rådjuren (steg 6.6.2) fälls bara med spjutet, och jägaren går hellre mot ett rådjur i närheten än mot en kanin
  const spjut = !!tk.tool && tk.tool in VAPEN && !!(VAPEN as Record<string, { kast?: unknown }>)[tk.tool].kast;
  if (spjut) {
    const rd = radjurOf(s, s.now, undefined, (gx, gy) => Math.hypot(gx - tk.tx, gy - tk.ty) < RADJUR.jaktR + RADJUR_UT || Math.hypot(gx - p.x, gy - p.y) < JAKT.letaR + RADJUR_UT);
    let rm: typeof m, rdd: number = RADJUR.jaktR;
    for (const d of rd) { const dd = Math.hypot(d.x - tk.tx, d.y - tk.ty); if (dd < rdd) { rdd = dd; rm = d; } }
    if (rm) { m = rm; md = rdd; }
    dj.push(...rd);
  }
  if (!m || m.art !== 'radjur') for (const d of dj) { if (d.art === 'radjur') continue; const dd = Math.hypot(d.x - tk.tx, d.y - tk.ty); if (dd < md) { md = dd; m = d; } }
  if (!m) { // ingen kanin nära: jägaren går i vanlig fart till den närmaste gruppen hen ser ...
    let n: ReturnType<typeof djurOf>[number] | undefined, nd: number = JAKT.letaR;
    for (const d of dj) { const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < nd) { nd = dd; n = d; } }
    const sp = n ? freeNear(s, n.x, n.y) : letaPlats(s, p); // ... och ser hen ingen letar hen dit kaninerna brukar vara (steg 3.10.3)
    if (!sp) return -1;
    tk.tx = sp.x; tk.ty = sp.y; tk.phase = 'go'; tk.leta = n ? 'grupp' : 'karta'; count(s, n ? 'jaktLetar' : 'jaktSoker');
    return -2;
  }
  tk.leta = undefined;
  count(s, 'jaktForsok'); gjort(s, p, 'jaktForsok');
  const drag = dragOf(m.art, m.id), h = halsaOf(s, m.id), now = s.now, jakt = p.skill.jakt ?? 0;
  const v: Vapen = spjut ? tk.tool as Vapen : 'sten', rad = m.art === 'radjur';
  const vader = vaderNu(s);
  const u: Uppstallning = {
    avsikt: 'doda', w: 20, h: 20, vind: vader.vind, dimma: vader.dimma,
    kampar: [
      { id: 1, namn: p.name, sida: 0, pid: p.id, vapen: v, klader: [], fart: 1, x: 1, y: 10, st: { styrka: stat(p, 'styrka', now), uthallighet: stat(p, 'uthallighet', now), mod: stat(p, 'mod', now), smidighet: stat(p, 'smidighet', now), skicklighet: 5 + (p.skill.narstrid ?? 0) / 2, sikte: 5 + (p.skill.traff ?? 0) / 2 } },
      { ...djurKampe(m.art, 2, 1, 10, 10), fart: drag.snabbhet },
    ],
  };
  u.kampar[1].st.styrka = drag.styrka;
  const st = nyStrid(u, Math.floor(rnd(s, 'arbete', p) * 2147483647)), r = () => slump(st);
  const a = st.kampar[0], b = st.kampar[1];
  b.blod = h.blod;
  // var kaninen ser jägaren, och var jägaren tror att det blir
  const sedd = JAKT.upptack * (1 - JAKT.skygg / 2 + JAKT.skygg * (drag.skygghet ?? 0.5)) * (isLight(now) ? 1 : JAKT.natt)
    * (rad ? RADJUR.upptack : 1) * TERR[markslag(groundOf(s), tileOf(m.x, m.y))] * (1 + JAKT.sno * snoPaMarken(s)) * (skramd(s, m.grupp) ? JAKT.skramd : 1)
    / Math.max(0.3, 1 + JAKT.smid * (a.st.smidighet - 10) + JAKT.vana * jakt);
  const tror = sedd * (1 + (r() * 2 - 1) * JAKT.gissa * (1 - clamp(jakt / 20, 0, 1))) * JAKT.marg;
  const kv = (VAPEN[v] as { kast?: { rack: number; skada: number } }).kast!, nar = v === 'sten' ? VAPEN.hand : VAPEN[v]; // med stenar i handen griper man kaninen
  let traff = false, kastD = -1, hand = false, sett: boolean, stopp: number;
  skram(s, m.grupp);
  if (tror <= nar.rack) { // smyger ända fram
    sett = sedd >= nar.rack; stopp = sett ? sedd : nar.rack * 0.5;
    if (!sett) {
      count(s, 'jaktSmyg');
      if (r() < chansMot(a, b, a.st.skicklighet) * JAKT.smyg) {
        traff = true; hand = v === 'sten';
        if (!hand) traffa(st, a, b, VAPEN[v].skada, VAPEN[v].slag);
      }
    } else count(s, 'jaktSedd');
  } else { // kastar därifrån hen tror att hen inte syns, eller efter kaninen som såg hen först
    const osedd = Math.min(tror, kv.rack) >= sedd;
    sett = !osedd;
    kastD = osedd ? Math.min(tror, kv.rack) : sedd <= kv.rack ? sedd : -1;
    stopp = osedd ? kastD : sedd;
    if (!osedd) count(s, 'jaktSedd');
    if (kastD > 0) {
      count(s, 'jaktKast'); gjort(s, p, 'kast');
      const l = kastD / kv.rack;
      const c = chansMot(a, b, a.st.sikte!) * (1 - STRID.langt * l) * (1 - STRID.vind * st.vind * l) * (1 - STRID.dimma * st.dimma * l) * (osedd ? JAKT.smyg : JAKT.flyr) * (v === 'sten' ? JAKT.sten : 1);
      if (r() < c) { traff = true; gjort(s, p, 'kastTraff'); traffa(st, a, b, kv.skada, VAPEN[v].slag, true); }
    }
  }
  const g = b.skador.reduce((x, w) => x + w.g, 0);
  const dog = traff && (hand || b.lage === 'dod' || g + h.sar >= (rad ? RADJUR.dod : JAKT.dod));
  // det kastade: stenen tappas oftast bort och då letar hen upp en ny, annars hämtas det som kastades
  const extra = kastD > 0 ? (v === 'sten' && r() < JAKT.stenBorta ? JAKT.stenSek : JAKT.hamtaSek) : 0;
  tk.jf = { t, id: m.id, x: m.x, y: m.y, sx: p.x, sy: p.y, v, stopp, kast: kastD, sett, ut: dog ? 'fangad' : traff && g > 0 ? 'skadad' : kastD > 0 || !sett ? 'miss' : 'flydde', ...(hand ? { hand: true as const } : {}), extra, g, blod: b.blod };
  // flocken flyr bort från jägaren när haren flyr (eller fångas), och då får jägaren smyga sig nära igen (steg 4.5.4.1)
  const o = jaktForlopp(tk.jf);
  gruppFlyr(s, m.grupp, t + o.tFlock * SEC, o.ut.x * o.fly, o.ut.y * o.fly);
  return 0;
}
// jägaren bär ett fällt rådjur eller en styckdel av det: då jagar hen inte mer på den turen
export const jaktFallt = (tk: Task) => !!tk.items?.radjur || !!tk.items?.radjurdel; // ett fällt rådjur: hen går hem med det
export const jaktBar = (tk: Task) => !!tk.carry || jaktFallt(tk);
// när försöket är slut: spjutet som kastades hämtas (eller är borta), stacket sliter spjutet, och den fångade kaninen
// bärs hem. En kanin som någon annan hann fånga under tiden är borta
export function jaktKlar(s: State, p: Person, tk: Task) {
  const f = tk.jf!, r = () => rnd(s, 'arbete', p);
  tk.jf = undefined;
  if (f.kast > 0 && f.v !== 'sten') {
    const ut = kastat(s, p, f.v, f.kast, f.x, f.y, r);
    if (ut) {
      tk.tool = undefined;
      if (ut === 'borta' && forstaGang(s, 'spjutBorta')) log(s, `${p.name} kastade ${VAPEN[f.v as Vapen].namn.toLowerCase()} efter en hare och hittade det aldrig igen.`, 'world', [p.id]);
    }
  } else if (f.ut !== 'miss' && f.ut !== 'flydde' && !f.hand && tk.tool) { // stacket sliter spjutet
    if (wearTool(s, p, tk.tool, r() * KAST.slit)) tk.tool = undefined;
  }
  const h = halsaOf(s, f.id);
  if (h.dod) return;
  if (f.ut === 'fangad' && arRadjur(f.id)) { // rådjuret (steg 6.6.2): bärs hem helt, eller styckas där det föll
    count(s, 'radjurFangst'); gjort(s, p, 'radjur');
    dodaDjur(s, f.id);
    if (forstaGang(s, 'radjur')) log(s, `${p.name} fällde byns första rådjur med spjutet.`, 'world', [p.id]);
    tk.items = { ...(tk.items ?? {}), radjur: (tk.items?.radjur ?? 0) + 1 };
    styckaFallt(s, p, tk, 'radjur');
    blodas(s, f.x, f.y, 'jakt', 2);
    ovning(p, 'traff', SLAGSMAL.jakt);
  } else if (f.ut === 'fangad') {
    count(s, 'jaktFangst'); gjort(s, p, 'kanin');
    if (f.hand) tecken(s, p, 'jakt'); // en hare med bara händerna: det oförklarliga (steg 4.1.2.1)
    dodaDjur(s, f.id);
    if (forstaGang(s, 'kaniner')) log(s, `${p.name} fångade byns första hare och bar hem den hel.`, 'world', [p.id]);
    tk.carry += KANIN;
    blodas(s, f.x, f.y, 'jakt', 1); // där kaninen fångades
    ovning(p, f.kast > 0 ? 'traff' : 'narstrid', SLAGSMAL.jakt); // träffsäkerheten eller närstriden (strid.ts)
    if (f.hand && r() < JAKT.bett) { count(s, 'jaktBett'); skada(s, p, r() < 0.5 ? 'handH' : 'handV', 'bett', JAKT.bettGrad, 'jakt', 'när hen grep en hare'); }
  } else if (f.ut === 'skadad') { count(s, 'jaktSkadad'); satDjurHalsa(s, f.id, Math.min(f.blod, h.blod), h.sar + f.g); }
}
