import { utanforByn } from './omrade';
import { balans } from './balans';
import { blodas } from './blod';
import { ALDER, KROPP, ageOf, count, isSick, living, log, makeName, ovning, stat, think } from './folk';
import { halsa, kanGa, skada } from './halsa';
import { kronika } from './historik';
import { eldPlats, getMap, vaderstreck } from './karta';
import { Klan, andraInst, klanById, klanerOf } from './klaner';
import { addTo, amountOf, avbryt, zoneOf } from './lager';
import { die } from './liv';
import { bitAt } from './byggnad';
import { larma } from './rykten';
import { SAKER, SAK_LIST } from './saker';
import { vattenNu } from './sjo';
import { clamp, rnd } from './slump';
import { SLAGSMAL, VAPEN, Uppstallning, Vapen, foljet, nyStrid, personKampe, slitKastat, sparaStrid, stridTillSlut, svartSkadad, vadretIStriden } from './strid';
import { isLight } from './tid';
import { DAY, HOUR, Person, SEC, State, T, W, H } from './typer';
import { vaderNu } from './vader';
import { grundvarde, rikedom } from './varde';
import { kanterna, soker } from './varg';
import { foddNar, gastNyckel } from './gastliv';
import { notis } from './notiser';

// ---------- rövarflocken (steg 4.4.5) ----------
// En grundversion av anfallen (stora räder, krig, tribut och murar ligger i 11.2). När byn är rik (Byns rikedom, varde.ts, med
// försvaret räknat emot: de vuxna som kan slåss och deras vapen) kan en liten flock rövare komma: folk från en grannklan som
// inte tycker om byn (klaner.ts), annars fredlösa utan klan. Flocken samlas en stund i kartans kant, där den kan upptäckas.
// Den som är vaken och nära ser den, vakten ser längst och gissar hur många de är (gissningen blir sämre ju längre bort de
// står), ropar (larma i rykten.ts) och väcker byn; sedan skyddar sig byn som när vargar kommer (vargSkydd i varg.ts): barnen
// och de svaga gömmer sig och de vuxna som vågar tar vapen och väntar vid elden. En liten flock väntar på mörkret, och ett tyst
// anfall (natt, få rövare, ingen vaken som ser dem) kommer fram osett. Rövarna går mot förrådet. Ser de att byn väntar med
// fler än de själva vänder de om. Annars slåss de med dem som står i vägen (striden i strid.ts, 3.7), med avsikten att skada,
// och plundrar det mest värda i förrådet (inte redskapen) om de vinner eller ingen står emot. Sedan flyr de mot kanten. Går
// striden dåligt flyr de utan något. Rövarna är inte bybor: var och en har ett namn, kroppens tal och ett vapen, och den som
// dör i striden är borta. Allt stegas likadant i båda lägena med byns följd 'rovare'.
export const ROVARE = balans('rovare', {
  kommer: 0.012, // chansen i timmen att en flock kommer, gånger hur rik byn är (rik nedan), när ingen flock är på kartan ...
  rikFran: 300, // ... rikedomen minus försvaret från vilken byn lockar rövare ...
  rikSpann: 1000, // ... och så mycket mer för den största chansen
  forsvarBas: 15, forsvarSkada: 60, // försvaret: varje vuxen som kan slåss räknas forsvarBas + forsvarSkada × vapnets skada
  vilaDygn: 6, // så många dygn efter en flock kommer ingen ny
  antal: [2, 5], // så många rövare (minst, högst)
  samlasTim: [2, 5], // så många timmar samlas flocken i kanten
  smaFlock: 3, // en flock med så här få väntar på mörkret ...
  morkerTim: 12, // ... högst så här många timmar till
  fart: 0.03, // rutor i sekunden när flocken går in mot byn ...
  flyFart: 0.06, // ... och när den flyr
  vaktSer: 26, folkSer: 12, nattSer: 0.5, dimmaSer: 0.5, // vakten ser rövare inom så här många rutor, andra inom folkSer, gånger nattSer i mörkret
  gissFel: 0.5, // vaktens gissning av antalet: fel med upp till så här stor del, gånger avståndet / vaktSer (andra gissar som på längsta avståndet)
  vack: 35, // vakten väcker byn när flocken är så här nära byns område (utanforByn)
  ser: 14, // rövarna ser byns försvar så här långt bort ...
  overmakt: 1.5, // ... och vänder om när fler än så här många gånger rövarna väntar med vapen
  nara: 1.5, // rövarna är framme vid förrådet så här nära
  motR: 10, // de vuxna som är vakna och så här nära möter rövarna ...
  fler: 0.3, vagar: 0.8, // ... om de vågar: mod / 20 + fler × (de som kan slåss / rövarna) är över vagar (som mot vargarna)
  tar: 4, // så många saker tar varje rövare som står kvar
  styrka: [8, 14], mod: [8, 15], uthallighet: [9, 14], smidighet: [8, 14], skicklighet: [6, 11], // rövarnas kroppar (lägst, högst)
  fiende: 15, // när byn dödar rövare blir klanen så här mycket ovänligare för var och en
  testNara: 12, // i testläget dyker flocken upp så här många rutor från elden (steg 4.5.7.10)
});

// rövarnas vapen (ett slumpas för var och en)
const ROVARVAPEN: Vapen[] = ['kniv', 'yxa', 'fiskespjut', 'flintspjut', 'sten'];
export interface Rovare { namn: string; sex: 'm' | 'k'; st: { styrka: number; uthallighet: number; mod: number; smidighet: number; skicklighet: number }; vapen: Vapen; blod: number; fodd?: number } // fodd: gästens liv (steg 4.5.7.7, gastliv.ts)
export interface Rovarflock { id: number; klan?: number; folk: Rovare[]; x: number; y: number; mx: number; my: number; gor: 'samlas' | 'kommer' | 'flyr'; till: number; sedd?: number; gissning?: number; vackt?: boolean }

const avst = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const vaken = (p: Person) => p.task?.act !== 'sova';
const mellan = (s: State, [a, b]: readonly number[]) => a + rnd(s, 'rovare') * (b - a);
const vuxenKan = (s: State, p: Person) => { const a = ageOf(p, s.now); return a >= ALDER.vaktFran && a < ALDER.vaktTill && !isSick(p, s.now) && halsa(p) >= KROPP.svag && kanGa(p); };

// byns försvar: de vuxna som kan slåss, med sina vapen
export function forsvaret(s: State) {
  let f = 0;
  for (const p of living(s)) if (vuxenKan(s, p)) f += ROVARE.forsvarBas + ROVARE.forsvarSkada * VAPEN[personKampe(s, p, 0, 0, 0, 0).vapen].skada;
  return f;
}
// hur mycket byn lockar rövare (0–1): rikedomen minus försvaret
export const lockar = (s: State) => clamp((rikedom(s) - forsvaret(s) - ROVARE.rikFran) / ROVARE.rikSpann, 0, 1);

// testläget (steg 4.5.4.4): en liten, mellanstor eller stor flock kommer nu (så många rövare). Flocken dyker upp en bit
// utanför byn, ungefär ROVARE.testNara rutor från elden, och går direkt till anfall utan att vänta på mörkret (steg
// 4.5.7.10); en rad i Händelser säger var (steg 4.5.6.4). Svarar med raden, eller skälet till att ingen flock kan komma
// just nu (rovarHinder)
export const ROVARFLOCK = { liten: ROVARE.antal[0], mellan: ROVARE.antal[1], stor: 2 * ROVARE.antal[1] } as const;
export const rovarHinder = (s: State) => s.rovare ? 'Det finns redan en rövarflock vid byn' : undefined;
export function skickaRovare(s: State, n: number): { ok: boolean; text: string } {
  const h = rovarHinder(s);
  if (h) return { ok: false, text: h };
  rovarnaKommer(s, n, true);
  const f = s.rovare!, e = eldPlats(s), d = Math.round(Math.hypot(f.x - e.x - 0.5, f.y - e.y - 0.5));
  const text = `Testläget: ${n} rövare dyker upp ${d} rutor ${vaderstreck(s, f.x, f.y)} om elden och går till anfall.`;
  log(s, text, 'world');
  return { ok: true, text };
}
// en flock kommer till en punkt i kanten som inte är vatten. tvinga = ett scenario eller testläget (antalet); direkt = testläget:
// flocken dyker upp nära byn (narByn) och samlas inte först
export function rovarnaKommer(s: State, tvinga?: number, direkt?: boolean) {
  if (!tvinga && (s.rovare || (s.rovarVila ?? 0) > s.now || rnd(s, 'rovare') >= ROVARE.kommer * lockar(s))) return;
  const m = getMap(s.seed), nara = direkt ? narByn(s) : undefined;
  let x = nara?.x ?? 0, y = nara?.y ?? 0;
  for (let i = 0; !nara && i < 20; i++) {
    const sida = Math.floor(rnd(s, 'rovare') * 4), l = rnd(s, 'rovare');
    x = sida === 0 ? 0.5 : sida === 1 ? W - 0.5 : l * W; y = sida === 2 ? 0.5 : sida === 3 ? H - 0.5 : l * H;
    if (m.tiles[Math.floor(y) * W + Math.floor(x)] !== T.Vatten) break;
  }
  // den grannklan som tycker sämst om byn, om någon inte tycker om den
  const k: Klan | undefined = klanerOf(s).filter(q => q.inst < 0).sort((a, b) => a.inst - b.inst)[0];
  const n = tvinga ?? Math.round(mellan(s, ROVARE.antal));
  const folk: Rovare[] = Array.from({ length: n }, () => {
    const sex = rnd(s, 'rovare') < 0.8 ? 'm' as const : 'k' as const;
    return {
      namn: makeName(s, sex, 'rovare'), sex, vapen: ROVARVAPEN[Math.floor(rnd(s, 'rovare') * ROVARVAPEN.length)], blod: 1,
      st: { styrka: mellan(s, ROVARE.styrka), uthallighet: mellan(s, ROVARE.uthallighet), mod: mellan(s, ROVARE.mod), smidighet: mellan(s, ROVARE.smidighet), skicklighet: mellan(s, ROVARE.skicklighet) },
    };
  });
  for (const r of folk) r.fodd = foddNar(s.seed, gastNyckel(k?.id, r.namn), 'rovare', s.now); // drar ingen slump
  const nr = s.rovarNr = (s.rovarNr ?? 0) + 1;
  s.rovare = { id: nr, klan: k?.id, folk, x, y, mx: x, my: y, gor: direkt ? 'kommer' : 'samlas', till: direkt ? s.now : s.now + mellan(s, ROVARE.samlasTim) * HOUR };
  s.rovarVila = s.now + ROVARE.vilaDygn * DAY;
  count(s, 'rovarflockar'); count(s, 'rovare', n);
}
// en ruta ungefär ROVARE.testNara rutor från elden, på land och utanför husen (testläget, steg 4.5.7.10); undefined = ingen hittades
function narByn(s: State) {
  const e = eldPlats(s), vt = vattenNu(s);
  for (let i = 0; i < 48; i++) {
    const v = rnd(s, 'rovare') * 2 * Math.PI, r = ROVARE.testNara + (i >> 4) * 3 * (i % 2 ? 1 : -1);
    const x = Math.floor(e.x + 0.5 + Math.cos(v) * r), y = Math.floor(e.y + 0.5 + Math.sin(v) * r);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || vt[y * W + x] === T.Vatten || bitAt(s, x, y)) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return undefined;
}
const fran = (s: State, f: Rovarflock) => { const k = klanById(s, f.klan); return k ? `från ${k.namn}` : 'utan klan'; };

// flocken går mot (mx, my), aldrig ut i vattnet; svarar hur långt det är kvar, eller −1 när den inte kommer fram
const SNETT = [0, 0.8, -0.8, 1.6, -1.6];
function ga(s: State, f: Rovarflock, fart: number, dtSec: number) {
  const dx = f.mx - f.x, dy = f.my - f.y, d = Math.hypot(dx, dy);
  if (d < 1e-6) return 0;
  const l = Math.min(d, fart * dtSec), vt = vattenNu(s), vatten = (x: number, y: number) => vt[Math.floor(y) * W + Math.floor(x)] === T.Vatten;
  const iVatten = vatten(f.x, f.y);
  for (const v of SNETT) {
    const c = Math.cos(v), sn = Math.sin(v), x = clamp(f.x + (dx * c - dy * sn) / d * l, 0.3, W - 0.3), y = clamp(f.y + (dx * sn + dy * c) / d * l, 0.3, H - 0.3);
    if (!iVatten && vatten(x, y)) continue;
    f.x = x; f.y = y;
    return v ? Math.hypot(f.mx - f.x, f.my - f.y) : d - l;
  }
  return -1;
}
// förrådet (eller elden när byn inte har något förråd)
function malet(s: State) {
  const z = zoneOf(s);
  if (z) return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
  const e = eldPlats(s);
  return { x: e.x + 0.5, y: e.y + 0.5 };
}

// de som är vakna ser flocken: vakten ser längst, gissar hur många de är och väcker byn när de är nära (en gång, också om
// flocken sågs långt bort först)
function ses(s: State, f: Rovarflock, folk: Person[]) {
  if (f.sedd !== undefined && f.vackt) return;
  const natt = isLight(s.now) ? 1 : ROVARE.nattSer, dimma = 1 - ROVARE.dimmaSer * vaderNu(s).dimma;
  const rad = (q: Person) => (q.task?.act === 'vakt' ? ROVARE.vaktSer : ROVARE.folkSer) * natt * dimma;
  const ser = (q: Person) => vaken(q) && avst(q, f) < rad(q);
  const vakt = folk.find(q => q.task?.act === 'vakt' && ser(q));
  const vack = () => { if (vakt && !f.vackt && utanforByn(s, f.x, f.y) < ROVARE.vack) { f.vackt = true; vacka(s, f, vakt, folk); } };
  if (f.sedd !== undefined) { vack(); return; }
  const p = vakt ?? folk.find(ser);
  if (!p) return;
  const n = f.folk.length, fel = ROVARE.gissFel * (vakt ? avst(p, f) / rad(p) : 1) * (rnd(s, 'rovare') * 2 - 1);
  f.sedd = s.now; f.gissning = Math.max(1, Math.round(n * (1 + fel)));
  count(s, 'rovarSedda');
  log(s, `${p.name} såg rövare ${f.gor === 'samlas' ? 'samlas vid kartans kant' : 'på väg mot byn'}, ungefär ${f.gissning} (${fran(s, f)}).`, 'world', [p.id]);
  notis(s, 'anfall', `${p.name} såg rövare ${f.gor === 'samlas' ? 'samlas vid kartans kant' : 'på väg mot byn'}, ungefär ${f.gissning} (${fran(s, f)}).`, [p.id], { x: Math.floor(f.x), y: Math.floor(f.y) });
  const hort = larma(s, 'rovare', f.gissning, [p]);
  vack();
  soker(s, [p, ...hort]);
}
// vakten väcker de vuxna som sover
function vacka(s: State, f: Rovarflock, vakt: Person, folk: Person[]) {
  let n = 0;
  for (const q of folk) if (q.task?.act === 'sova' && vuxenKan(s, q)) { avbryt(s, q); q.task = undefined; q.larm = { t: s.now, vad: 'rovare', storlek: f.gissning ?? f.folk.length, led: 0 }; n++; }
  if (n) { count(s, 'rovarVackt', n); log(s, `${vakt.name} höll vakt och väckte byn: rövare på väg.`, 'world', [vakt.id]); }
}

// de vuxna som möter rövarna vid förrådet: vakna, nära och modiga nog (de som väntar med vapen och vakten står alltid kvar)
function motstand(s: State, f: Rovarflock, folk: Person[]) {
  const kan = folk.filter(q => vaken(q) && vuxenKan(s, q) && avst(q, f) < ROVARE.motR && q.task?.act !== 'gomma');
  return kan.filter(q => q.task?.act === 'forsvar' || q.task?.act === 'vakt' || stat(q, 'mod', s.now) / 20 + ROVARE.fler * kan.length / Math.max(1, f.folk.length) > ROVARE.vagar);
}

// striden mellan byns folk och rövarna. Svarar om rövarna vann
export function rovarStrid(s: State, f: Rovarflock, folk: Person[]) {
  const W0 = 16, H0 = 8, n = f.folk.length;
  const kampar: Uppstallning['kampar'] = folk.map((p, i) => personKampe(s, p, 0, 0, 3, H0 / 2 + (i - (folk.length - 1) / 2)));
  f.folk.forEach((r, j) => kampar.push({ id: 0, namn: r.namn, sida: 1, st: { ...r.st, sikte: r.st.skicklighet }, vapen: r.vapen, klader: [], fart: 1, x: W0 - 3, y: H0 / 2 + (j - (n - 1) / 2), ...(j === 0 && n > 1 ? { ledare: 'fram' as const } : {}) }));
  kampar.forEach((k, i) => { k.id = i + 1; });
  foljet(s, kampar);
  const u: Uppstallning = { avsikt: 'skada', w: W0, h: H0, ...vadretIStriden(s), kampar };
  const fro = Math.floor(rnd(s, 'strid') * 2147483647), st = nyStrid(u, fro);
  f.folk.forEach((r, j) => { st.kampar[folk.length + j].blod = r.blod; });
  stridTillSlut(st);
  const vinnare = st.slut!.vinnare;
  sparaStrid(s, { t: s.now, orsak: 'rövare vid förrådet', u, fro, vinnare }); count(s, 'rovarStrid');
  // rövarna: de döda är borta, de andra blöder
  const kvar: Rovare[] = [];
  f.folk.forEach((r, j) => { const k = st.kampar[folk.length + j]; if (k.lage === 'dod') count(s, 'rovarDoda'); else { r.blod = Math.max(0.05, k.blod); kvar.push(r); } });
  const doda = n - kvar.length;
  f.folk = kvar;
  if (doda) { const k = klanById(s, f.klan); if (k) andraInst(k, -ROVARE.fiende * doda); }
  // folket: skadorna blir riktiga skador (som mot vargarna)
  const svara: string[] = [];
  st.kampar.slice(0, folk.length).forEach((k, i) => {
    const p = folk[i];
    let dod = k.lage === 'dod';
    for (const w of k.skador) {
      if (!dod && skada(s, p, w.d, w.k, w.g, 'rovare', 'i en strid med rövare')) dod = true;
      const sk = p.skador?.[p.skador.length - 1];
      if (!dod && sk && w.fast) sk.fast = 1;
    }
    slitKastat(s, p, st, k);
    if (dod) { count(s, 'dodRovare'); die(s, p, 'rovare'); return; }
    if (svartSkadad(k)) svara.push(p.name);
    p.blod = Math.min(p.blod ?? 1, Math.max(0, k.blod));
    ovning(p, 'narstrid', SLAGSMAL.ovning);
    think(p, vinnare === 0 ? 'Drev bort rövarna' : 'Slogs med rövare', vinnare === 0 ? SLAGSMAL.vann : -SLAGSMAL.forlora, s.now, SLAGSMAL.tankeTim * HOUR);
    avbryt(s, p);
    p.task = { act: 'strid', phase: 'do', tx: p.x, ty: p.y, until: s.now + Math.max(SLAGSMAL.minst, st.slut!.t) * SEC, carry: 0, why: 'Slåss med rövare' };
  });
  blodas(s, folk[0].x, folk[0].y, 'jakt', 1);
  const namn = folk.map(p => p.name).join(' och ');
  const text = `${namn} slogs med ${n} rövare ${fran(s, f)} vid förrådet. ${doda ? `${doda} ${doda === 1 ? 'rövare dog' : 'rövare dog'}. ` : ''}${vinnare === 1 ? 'Rövarna vann.' : 'Rövarna flydde.'}${svara.length ? ` ${svara.join(' och ')} skadades svårt.` : ''}`;
  log(s, text, 'world', folk.map(p => p.id)); notis(s, 'strid', text, folk.map(p => p.id), { x: Math.floor(folk[0].x), y: Math.floor(folk[0].y) });
  kronika(s, text, 'rovare');
  return vinnare === 1 && f.folk.length > 0;
}

// rövarna tar det mest värda ur förrådet (inte redskapen), hela saker
export function plundra(s: State, f: Rovarflock, tyst: boolean) {
  let n = f.folk.length * ROVARE.tar, tog = 0;
  const varor = SAK_LIST.filter(k => !SAKER[k]!.redskap && amountOf(s, k) >= 1).sort((a, b) => grundvarde(b) - grundvarde(a));
  const tagna: string[] = [];
  for (const k of varor) { let m = 0; while (n > 0 && amountOf(s, k) >= 1) { addTo(s, k, -1); n--; tog++; m++; } if (m) tagna.push(`${m} ${(SAKER[k]?.namn ?? k).toLowerCase()}`); if (n <= 0) break; }
  count(s, 'rovarPlundring'); if (tog) count(s, 'rovat', tog);
  if (tyst) count(s, 'rovarTyst');
  const text = tog ? `Rövare ${fran(s, f)} ${tyst ? 'smög in i byn osedda och ' : ''}tog ${tagna.join(', ')} ur förrådet.` : `Rövare ${fran(s, f)} kom till förrådet men hittade inget att ta.`;
  log(s, text, 'world'); if (tog) notis(s, 'motgang', text);
  if (tog) kronika(s, text, 'rovare');
}

// vad flocken gör i det här slaget
function flockSteg(s: State, f: Rovarflock, folk: Person[], dtSec: number) {
  if (f.gor === 'flyr') {
    let kvar = -1;
    for (const k of kanterna(f.x, f.y)) { f.mx = k.x; f.my = k.y; kvar = ga(s, f, ROVARE.flyFart, dtSec); if (kvar >= 0) break; }
    if (kvar < 0.5) { f.folk = []; count(s, 'rovarBorta'); }
    return;
  }
  if (f.gor === 'samlas') {
    if (s.now < f.till) return;
    // en liten flock väntar på mörkret
    if (f.folk.length <= ROVARE.smaFlock && isLight(s.now) && s.now < f.till + ROVARE.morkerTim * HOUR) return;
    f.gor = 'kommer';
  }
  const m = malet(s); f.mx = m.x; f.my = m.y;
  // byn väntar med fler än rövarna: de vänder om
  if (avst(f, m) < ROVARE.ser) {
    const vantar = folk.filter(q => q.task?.act === 'forsvar' && avst(q, f) < ROVARE.ser).length;
    if (vantar > f.folk.length * ROVARE.overmakt) { f.gor = 'flyr'; count(s, 'rovarVande'); log(s, `Rövarna ${fran(s, f)} såg att byn väntade på dem med vapen och vände om.`, 'world'); return; }
  }
  const kvar = ga(s, f, ROVARE.fart, dtSec);
  if (kvar < 0) { f.gor = 'flyr'; return; }
  if (kvar > ROVARE.nara) return;
  // framme vid förrådet
  const mot = motstand(s, f, folk);
  const vann = mot.length ? rovarStrid(s, f, mot) : true;
  if (vann) plundra(s, f, !mot.length && f.sedd === undefined);
  f.gor = 'flyr';
  if (!mot.length) larma(s, 'rovare', f.folk.length, folk.filter(q => vaken(q) && avst(q, f) < ROVARE.folkSer));
}

// varje slag (steg.ts): en flock kommer, ses, går in mot byn och flyr
export function rovarSteg(s: State, dtSec: number) {
  const nyTimme = Math.floor(s.now / HOUR) !== Math.floor((s.now - dtSec * SEC) / HOUR);
  if (nyTimme && !s.rovare) rovarnaKommer(s);
  const f = s.rovare;
  if (!f) return;
  const folk = living(s);
  if (f.gor !== 'flyr') ses(s, f, folk);
  if (f.folk.length) flockSteg(s, f, folk, dtSec);
  if (!f.folk.length) s.rovare = undefined;
}
