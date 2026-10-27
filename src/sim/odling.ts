import { ALDER, ageOf, alive, count, forstaGang, living, log } from './folk';
import { FYND, richness, takeFrom } from './fynd';
import { amountOf, gain } from './lager';
import { kunnighet } from './ekonomi';
import { SNABBARE } from './handlingar';
import { DAY, H, HOUR, HOUR_S, MIN, Person, SEC, State, T, Task, W } from './typer';
import { balans } from './balans';
import { getMap } from './karta';
import { groundOf } from './mark';
import { FOREST } from './vag';
import { knows } from './teknik';
import { getable, takeMaterial } from './behov';
import { freeTools, wearTool } from './agande';
import { SAKER } from './saker';
import { campDist } from './plats';
import { ledig, lekplats, paLek } from './stationer';
import { temperature } from './vader';
import { ISTID, iIstiden, isLight, kalender } from './tid';

// ---------- odling (steg 2.10.2–) ----------
// Vilda grödor växer på kartan som andra växter: vildkorn på ängarna och vilda ärter i skogsbrynet (lagren i VILDA, rader i
// FYND i fynd.ts). Den som samlar där de växer tar med sig frön (fron i saker.ts) tills byn har så många den vill ha. Fröna
// kan inte ätas. Byn räknar hur mycket den samlat av de vilda grödorna (statistiken vildgrodor), och ju mer, desto fortare
// kommer den som samlar på tekniken Odling (raden odling i teknik.ts, `okar`).
//
// Fälten (steg 2.10.3): den som kan odla och har frön röjer ett fält (ODLING.faltW × faltH rutor) på jord nära byn, där inga
// stora träd står: gräs, buskar och ungskog tas bort. Sedan grävs jorden upp, fortare med benspaden, och fröna sås. Grödan
// (GRODOR) växer när det är varmt nog, och frost dödar den: mest tål rovorna. Inget växer i istiden. Den mogna grödan skördas
// av den som äger fältet, och det går före förbättringar i valet (val.ts), för den blir övermogen och ruttnar om den står för
// länge. Skörden är mat och nya frön; sedan grävs jorden upp igen. Bara en person sköter ett fält och äger både fältet och
// skörden (ägandet, beslut); dör hen eller flyttar tar en annan som kan odla över det. Ett fält där ingen arbetat på länge och
// där inget växer blir gräs igen. Arbetet är projektet 'falt' (projekt.ts), handlingen 'odla' med steget som task.tool.
// Bördighet, fukt och vattning kommer i steg 8.3.1, kompost och fler grödor i 8.3.2.
export const ODLING = balans('odling', {
  froTakt: 3, // frön per arbetstimme på en mycket rik plats (gånger kunnigheten och SNABBARE)
  froUttag: 0.1, // varje frö tar så här mycket ur platsen
  froVill: 20, // man tar med sig frön tills byn har så här många
  // fälten (steg 2.10.3)
  faltW: 2, faltH: 2, // ett fält är så här många rutor brett och djupt
  faltFran: 3, faltTill: 9, // fältet ligger så här många rutor från byns läger ...
  faltAvst: 5, // ... helst så här långt
  rojaMin: 30, // minuters arbete per ruta att röja gräs, buskar och ungskog
  beredaMin: 40, // minuters arbete per ruta att gräva upp jorden för hand ...
  beredaSpade: 2.5, // ... så här många gånger fortare med benspaden ...
  spadeSlit: 0.05, // ... som slits så här mycket per fält
  saMin: 8, // minuters arbete per ruta att så
  froPerRuta: 2, // frön som sås per ruta
  skordaMin: 15, // minuters arbete per ruta att skörda
  pass: 90, // man arbetar på fältet högst så här många minuter åt gången
  vaxGrad: 4, // grödan växer bara när det är varmare än så här många grader
  overDygn: 1, // en mogen gröda står så här många dygn innan den börjar bli övermogen ...
  ruttDygn: 1.5, // ... och har sedan ruttnat helt efter så här många dygn till (skörden minskar under tiden)
  grasDygn: 3, // ett fält där ingen arbetat på så här många dygn och där inget växer blir gräs igen
  kornMarg: 1.5, // korn sås bara om det hinner mogna med så här många dygn tillgodo före istiden; annars rovor
});

// grödorna (steg 2.10.3): sak = det som skördas (saker.ts), dygn = hur länge den växer innan den är mogen, perRuta = skörden
// per ruta, fron = frön tillbaka per ruta (rovorna äts hela, så de ger få), frost = den dör när det blir kallare än så här
export interface GrodaDef { namn: string; sak: string; dygn: number; perRuta: number; fron: number; frost: number }
export const GRODOR = {
  rovor: { namn: 'Rovor', sak: 'rovor', dygn: 2, perRuta: 5, fron: 0.6, frost: -3 }, // snabba och härdiga
  korn: { namn: 'Korn', sak: 'korn', dygn: 5, perRuta: 4, fron: 2.5, frost: -1 }, // håller länge
} satisfies Record<string, GrodaDef>;
export type GrodaSlag = keyof typeof GRODOR;
export const GRODA_LIST = Object.keys(GRODOR) as GrodaSlag[];

// fältets steg: namnet i inforutan, och det man gör (task.tool, namnet i handlingen odla). Växer har inget arbete
export const FALT_STEG = {
  roja: { namn: 'Röjs', gor: 'Röjer ett fält' },
  bereda: { namn: 'Ska grävas upp', gor: 'Gräver upp jorden' },
  sa: { namn: 'Ska sås', gor: 'Sår' },
  vaxer: { namn: 'Växer' },
  mogen: { namn: 'Mogen', gor: 'Skördar' },
} as const;
export type FaltSteg = keyof typeof FALT_STEG;
// ett fält: rutan uppe till vänster, ägaren, steget, arbetet som är kvar i steget (ms), grödan, hur långt den vuxit (0–1),
// när den mognade och när någon senast arbetade där
export interface Falt { id: number; x: number; y: number; agare: number; steg: FaltSteg; kvar: number; groda?: GrodaSlag; vuxit?: number; mogen?: number; rord: number }
const RUTOR = () => ODLING.faltW * ODLING.faltH;
const minFor = (steg: FaltSteg) => (steg === 'roja' ? ODLING.rojaMin : steg === 'bereda' ? ODLING.beredaMin : steg === 'sa' ? ODLING.saMin : steg === 'mogen' ? ODLING.skordaMin : 0) * RUTOR() * MIN;
const INGA: Falt[] = [];
export const faltOf = (s: State) => s.falt ?? INGA;
export const faltById = (s: State, id?: number) => id === undefined ? undefined : faltOf(s).find(f => f.id === id);
// fältet på rutan
export function faltAt(s: State, x: number, y: number) {
  if (!s.falt?.length) return undefined;
  return s.falt.find(f => x >= f.x && x < f.x + ODLING.faltW && y >= f.y && y < f.y + ODLING.faltH);
}
export const faltRutor = (f: Falt) => { const r: number[] = []; for (let j = 0; j < ODLING.faltH; j++) for (let i = 0; i < ODLING.faltW; i++) r.push((f.y + j) * W + f.x + i); return r; };
export const faltMitt = (f: Falt) => ({ x: f.x + ODLING.faltW / 2, y: f.y + ODLING.faltH / 2 });
// hur långt arbetet i steget kommit (0–1), eller grödan vuxit
export const faltKlar = (f: Falt) => f.steg === 'vaxer' ? f.vuxit ?? 0 : f.steg === 'mogen' ? 1 : 1 - f.kvar / (minFor(f.steg) || 1);
// skörden som andel av den fulla: den minskar när grödan blivit övermogen
export function skordAndel(s: State, f: Falt) {
  if (f.steg !== 'mogen' || f.mogen === undefined) return 0;
  const over = (s.now - f.mogen) / DAY - ODLING.overDygn;
  return over <= 0 ? 1 : Math.max(0, 1 - over / ODLING.ruttDygn);
}

// dygn tills istiden börjar (0 i istiden)
function dygnTillIstid(s: State) {
  const k = kalender(s);
  if (iIstiden(k.ai)) return 0;
  return (k.slut - s.now) / DAY + ((ISTID - k.ai - 1 + 8) % 4) * 7;
}
// grödan som sås nu: korn om det hinner mogna före istiden med marginal, annars rovor om de hinner, annars ingen
export function grodaNu(s: State): GrodaSlag | undefined {
  const d = dygnTillIstid(s);
  if (d >= GRODOR.korn.dygn + ODLING.kornMarg) return 'korn';
  return d >= GRODOR.rovor.dygn ? 'rovor' : undefined;
}
const froBehov = () => ODLING.froPerRuta * RUTOR();
const kanOdla = (s: State, p: Person) => ageOf(p, s.now) >= ALDER.vuxen && knows(p, 'odling');
// p:s fält: det hen äger, annars ett som ingen levande äger (den som tar över det blir ägare när arbetet börjar)
export function egetFalt(s: State, p: Person) {
  const fs = faltOf(s);
  return fs.find(f => f.agare === p.id) ?? fs.find(f => !agareLever(s, f));
}
const agareLever = (s: State, f: Falt) => s.people.some(q => q.id === f.agare && alive(q));

// var ett nytt fält läggs: rutor på jord (inte sand eller sten) utan stora träd, lediga, faltFran–faltTill rutor från lägret,
// helst faltAvst, och inte i lekplatsen. Samma plats varje gång (ingen slump). Sparas per by och timme (regel 4)
const siteCache = new WeakMap<State, { key: string; at?: { x: number; y: number } }>();
export function faltSite(s: State) {
  const key = `${Math.floor(s.now / HOUR)}:${s.byggV ?? 0}:${faltOf(s).length}:${s.stackar?.length ?? 0}`;
  const c = siteCache.get(s);
  if (c && c.key === key) return c.at;
  const at = hittaSite(s);
  siteCache.set(s, { key, at });
  return at;
}
function hittaSite(s: State) {
  const m = getMap(s.seed), f = m.fire, R = ODLING.faltTill + 2, g = groundOf(s), lekR = lekplats(s);
  let best: { x: number; y: number } | undefined, bs = Infinity;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const x = f.x + dx, y = f.y + dy;
    if (x < 1 || y < 1 || x + ODLING.faltW >= W || y + ODLING.faltH >= H) continue;
    const d = campDist(s, x + ODLING.faltW / 2, y + ODLING.faltH / 2);
    if (d < ODLING.faltFran || d > ODLING.faltTill) continue;
    let ok = true, unga = 0;
    for (let j = 0; j < ODLING.faltH && ok; j++) for (let i = 0; i < ODLING.faltW && ok; i++) {
      const xx = x + i, yy = y + j, t = m.tiles[yy * W + xx], tr = g.trees[yy * W + xx];
      if (t !== T.Gras && t !== T.Skog || tr >= FOREST || !ledig(s, xx, yy)) ok = false;
      unga += tr;
    }
    if (!ok) continue;
    const lek = paLek(lekR, x, y, ODLING.faltW, ODLING.faltH) ? 20 : 0;
    const sc = Math.abs(d - ODLING.faltAvst) + lek + unga;
    if (sc < bs) { bs = sc; best = { x, y }; }
  }
  return best;
}

// uppgiften på fältet för p (projektet falt i projekt.ts, och skörden i val.ts): nästa steg på hens fält, eller att röja
// ett nytt om hen inte har något och byn har frön. Inget i mörkret
export interface FaltUppgift { tool: FaltSteg; text: string; min: number; spot: { x: number; y: number }; ref?: number }
export function faltUppgift(s: State, p: Person): FaltUppgift | undefined {
  if (!isLight(s.now) || !kanOdla(s, p)) return undefined;
  const f = egetFalt(s, p);
  if (f) {
    if (f.steg === 'vaxer') return undefined;
    if (f.steg === 'sa' && (getable(s, p, 'fron') < froBehov() || !grodaNu(s))) return undefined;
    return { tool: f.steg, text: `${FALT_STEG[f.steg].gor}.`, min: ODLING.pass, spot: faltMitt(f), ref: f.id };
  }
  if (getable(s, p, 'fron') < froBehov() || !grodaNu(s)) return undefined;
  const at = faltSite(s);
  return at && { tool: 'roja', text: `${FALT_STEG.roja.gor}.`, min: ODLING.pass, spot: { x: at.x + ODLING.faltW / 2, y: at.y + ODLING.faltH / 2 } };
}
// arbetet på p:s fält (val.ts): den mogna grödan skördas före förbättringar, och den som har börjat på sitt fält arbetar vidare
// på det tills det är sått, när ingen fara går före. Ett nytt fält är ett projekt (projekt.ts)
export function faltNu(s: State, p: Person, fara: boolean) {
  const u = faltUppgift(s, p);
  if (!u || u.ref === undefined) return undefined;
  if (u.tool === 'mogen') return u;
  return !fara && faltById(s, u.ref)?.agare === p.id ? u : undefined;
}
// hur stor del av byns fält som har arbete att göra, eller 1 om någon som kan odla har frön men inget fält (projekt.ts)
export function faltBrist(s: State) {
  const fs = faltOf(s), arbete = fs.filter(f => f.steg !== 'vaxer').length;
  if (arbete) return 1;
  return amountOf(s, 'fron') >= froBehov() && grodaNu(s) && living(s).some(p => kanOdla(s, p) && !egetFalt(s, p)) ? 1 : 0;
}

// fart på fältet: att gräva upp jorden går fortare med benspaden
const fart = (s: State, p: Person, f: Falt) => f.steg === 'bereda' && freeTools(s, p, 'benspade') ? ODLING.beredaSpade : 1;
// framme (paborjat.ts): arbeta vidare på fältet, eller röja ett nytt där det ska ligga. Den som arbetar blir ägare
export function startOdla(s: State, p: Person, tk: Task) {
  let f = faltById(s, tk.ref);
  if (!f && tk.tool === 'roja') {
    const x = Math.floor(tk.tx - ODLING.faltW / 2), y = Math.floor(tk.ty - ODLING.faltH / 2), m = getMap(s.seed), g = groundOf(s);
    let ok = x >= 0 && y >= 0 && x + ODLING.faltW <= W && y + ODLING.faltH <= H;
    for (let j = 0; j < ODLING.faltH && ok; j++) for (let i = 0; i < ODLING.faltW && ok; i++) {
      const t = m.tiles[(y + j) * W + x + i];
      if (t !== T.Gras && t !== T.Skog || g.trees[(y + j) * W + x + i] >= FOREST || !ledig(s, x + i, y + j)) ok = false;
    }
    if (ok && !faltOf(s).some(q => q.agare === p.id)) {
      f = { id: s.nextFalt = (s.nextFalt ?? 0) + 1, x, y, agare: p.id, steg: 'roja', kvar: minFor('roja'), rord: s.now };
      (s.falt ??= []).push(f);
      s.byggV = (s.byggV ?? 0) + 1; // en ny sak på kartan: platserna räknas om
    }
  }
  if (!f || f.steg !== tk.tool || f.steg === 'vaxer') { tk.ref = undefined; tk.until = s.now; return; }
  if (f.steg === 'sa' && !f.groda) {
    const gr = grodaNu(s);
    if (!gr || getable(s, p, 'fron') < froBehov()) { tk.ref = undefined; tk.until = s.now; return; }
    takeMaterial(s, p, 'fron', froBehov());
    f.groda = gr;
  }
  f.agare = p.id; f.rord = s.now;
  tk.ref = f.id; tk.until = s.now + Math.min(ODLING.pass * MIN, f.kvar / fart(s, p, f));
}
// medan man arbetar
export function workOdla(s: State, p: Person, tk: Task, dtSec: number) {
  const f = faltById(s, tk.ref);
  if (!f || f.steg === 'vaxer') return;
  f.kvar = Math.max(0, f.kvar - dtSec * SEC * fart(s, p, f));
  f.rord = s.now;
}
// arbetet i steget är klart: fältet går till nästa steg
export function finishOdla(s: State, p: Person, tk: Task) {
  const f = faltById(s, tk.ref);
  if (!f || f.steg === 'vaxer' || f.kvar > MIN) return;
  if (f.steg === 'roja') {
    const g = groundOf(s);
    for (const i of faltRutor(f)) { g.trees[i] = 0; g.cover[i] = 0; } // gräs, buskar och ungskog är borta
    if (forstaGang(s, 'faltForst')) { log(s, `${p.name} röjde byns första fält. Där ska frön sås.`, 'world', [p.id]); p.fame.push('Röjde byns första fält'); }
    nasta(f, 'bereda');
  } else if (f.steg === 'bereda') {
    if (freeTools(s, p, 'benspade') && wearTool(s, p, 'benspade', ODLING.spadeSlit)) { const tr = SAKER.benspade?.trasig; if (tr) count(s, tr.stat); }
    nasta(f, 'sa');
  } else if (f.steg === 'sa') {
    count(s, 'sadd');
    if (forstaGang(s, 'saddForst')) log(s, `${p.name} sådde ${GRODOR[f.groda!].namn.toLowerCase()} på fältet.`, 'world', [p.id]);
    nasta(f, 'vaxer'); f.vuxit = 0;
  } else if (f.steg === 'mogen') {
    const d = GRODOR[f.groda!], a = skordAndel(s, f), n = d.perRuta * RUTOR() * a;
    if (n > 0) { gain(s, p, d.sak, n); gain(s, p, 'fron', d.fron * RUTOR() * a); count(s, 'skord', n); }
    if (forstaGang(s, 'skordForst')) { log(s, `${p.name} skördade byns första ${d.namn.toLowerCase()}.`, 'world', [p.id]); p.fame.push(`Skördade byns första ${d.namn.toLowerCase()}`); }
    nasta(f, 'bereda'); f.groda = undefined; f.vuxit = undefined; f.mogen = undefined;
  }
  f.rord = s.now;
}
function nasta(f: Falt, steg: FaltSteg) { f.steg = steg; f.kvar = minFor(steg); }
// grödan är borta (frost eller röta): fröna måste sås igen
function forlorad(s: State, f: Falt, varfor: string) {
  const d = GRODOR[f.groda!], agare = s.people.find(q => q.id === f.agare);
  log(s, `${varfor} tog ${d.namn.toLowerCase()}na på ${agare ? agare.name + 's' : 'ett'} fält.`, 'world', agare ? [agare.id] : undefined);
  count(s, varfor === 'Frosten' ? 'frostdod' : 'ruttnat');
  nasta(f, 'sa'); f.groda = undefined; f.vuxit = undefined; f.mogen = undefined;
}

// varje timme (steg.ts): grödorna växer när det är varmt nog och dör i frost eller ruttnar, och ett fält som ingen sköter
// blir gräs igen. Inget träd växer på ett fält som röjts
export function stepOdling(s: State) {
  if (!s.falt?.length) return;
  const temp = temperature(s), istid = iIstiden(kalender(s).ai), g = groundOf(s);
  for (const f of [...s.falt]) {
    if (f.steg !== 'roja') for (const i of faltRutor(f)) { g.trees[i] = 0; g.cover[i] = 0; }
    if (f.steg === 'vaxer' || f.steg === 'mogen') {
      const d = GRODOR[f.groda!];
      if (istid || temp < d.frost) { forlorad(s, f, 'Frosten'); continue; }
      if (f.steg === 'mogen') { if (skordAndel(s, f) <= 0) forlorad(s, f, 'Rötan'); continue; }
      if (temp > ODLING.vaxGrad) f.vuxit = Math.min(1, (f.vuxit ?? 0) + 1 / (d.dygn * 24));
      if (f.vuxit! >= 1) { f.steg = 'mogen'; f.mogen = s.now; f.kvar = minFor('mogen'); }
      continue;
    }
    if (s.now - f.rord > ODLING.grasDygn * DAY) {
      s.falt = s.falt.filter(q => q !== f);
      s.byggV = (s.byggV ?? 0) + 1;
      log(s, 'Ett fält som ingen skött har vuxit igen med gräs.', 'world');
      count(s, 'faltIgen');
    }
  }
}
// lagren i FYND med vilda grödor, som ger frön
export const VILDA = ['vildkorn', 'arter'] as const;

// medan man samlar (UTFALL samla i steg.ts): frön från de vilda grödorna där man står, och platsen töms lite
export function froFynd(s: State, p: Person, tk: Task, dtSec: number) {
  if (amountOf(s, 'fron') + (tk.items?.fron ?? 0) >= ODLING.froVill) return 0;
  const sk = kunnighet(p.skill.samla) * SNABBARE * dtSec / HOUR_S;
  let n = 0;
  for (const k of VILDA) {
    const r = richness(s, k, tk.tx, tk.ty);
    if (r <= 0) continue;
    const g = ODLING.froTakt * r / FYND[k].topp * sk;
    takeFrom(s, k, tk.tx, tk.ty, g * ODLING.froUttag);
    n += g;
  }
  if (n <= 0) return 0;
  count(s, 'vildgrodor', n);
  if (forstaGang(s, 'froForst')) log(s, `${p.name} tog med sig frön från de vilda grödorna. De går inte att äta.`, 'world', [p.id]);
  return n;
}
