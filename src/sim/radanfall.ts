// ---------- anfall mellan två rader (steg 11.6.16, Flera samhällen: Relationen och läget mellan två byar) ----------
// Ett anfall mellan två byar i världen avgörs i en uträkning när flocken kommer fram: anfallarnas antal och utrustning (ur
// teknikerna och rikedomen) mot försvararnas antal, utrustning och skydd (de slåss hemma). Kraften är antalet gånger
// utrustningen, och chansen att vinna är den egna kraften i kvadrat delad med båda sidornas (ju fler, desto mer avgör antalet).
// Utfallet är hela döda på båda sidor (förlorarna förlorar mer) och, när anfallarna vinner, hela saker som de överlevande bär
// hem: en del av det försvararna har, högst det de orkar bära. Slumpen är världens, så att det blir lika i det levande läget och
// ikappräkningen. Talen är ställda mot striderna i testbyarna (steg 11.6.19, npm run radanfall och npm run strid): där dör
// knappt en av hundra som är med när rövare kommer, och den som är fler vinner nästan alltid. Vem som anfaller och varför står i BYHANDLINGAR
// (plundringen i byhandling.ts); det här är bara uträkningen.
import { balans } from './balans';
import { lever } from './rad';
import { MANNISKOVAPEN, MITTKROPP, SKYDD, stridsvardeAv, TVA_HAND, type SvKampe, type Vapen } from './strid';
import { SAKER } from './saker';
import { grundvarde } from './varde';
import { kladAv, PLAGG } from './klader';
import { EFTERSTEG } from './varldslag';
import { radHar, RADPRIS, VARUGRUPP_IDS, VarugruppId } from './priser';
import { VarldRad } from './radtal';
import { antalUr } from './varldslag';

export const BYANFALL = balans('byanfall', {
  skicka: 0.6, // så stor del av byns styrka går med ett anfall ...
  minst: 3, // ... och minst så många (har byn färre anfaller den inte)
  // försvararnas skydd: de slåss hemma, vid husen och med det de har till hands. Hemmafördelen är liten (1,2): försvaret ska bara
  // påverka lite, så att det som avgör ett anfall är antalet och utrustningen på båda sidor och hur många som är hemma, inte att man slåss hemma
  hemma: 1.2,
  utrDel: 1.5, // utrustningen var och en har (steg 15.1.152): vapen och skydd värda högst så många gånger rikedomen per person
  kastDel: 0.3, // så stor del av ett gäng från en by som kan göra bågar eller slungor bär dem (steg 15.1.153)
  antalVikt: 1.2, // en flocks styrka är värdet per person gånger antalet upphöjt till detta: många kan gå flera mot en
  dod: 0.03, // så stor del av förlorarna dör (de flesta flyr eller skadas, som i testbyarnas strider med rövare)
  dodVinnare: 0.005, // så stor del av vinnarna dör
  bar: 10, // så mycket (i grundvärde) bär varje överlevande anfallare hem
  byte: 0.3, // högst så stor del av försvararnas förråd i varje grupp tas
  // rikedomen lockar (steg 12.1.21): flocken blir så stor som bytet och försvaret drar, högst det byn kan skicka ...
  vinstMal: 1.2, // ... så många att anfallarnas kraft är så här många gånger försvararnas ...
  // ... och det som finns att ta över det flocken bär lockar ändå, långsammare ju mer det är: lockMer × bärbördan × ln(1 + överskottet / bärbördan)
  lockMer: 0.25,
});

// ---------- stridsvärdet i världen (steg 15.1.152, Striden i detalj: Stridsvärdet, Rikedomen lockar) ----------
// En by i världen har ett stridsvärde per person: en person med mittersta kropp och det bästa vapnet och skyddet som byns
// tekniker kan göra och byns rikedom per person räcker till (STRIDSVARDE i strid.ts). En flocks styrka är värdet per person gånger
// antalet upphöjt till BYANFALL.antalVikt, och chansen att vinna är den egna styrkan i kvadrat delad med båda sidornas
// kan byn göra saken k: tekniken finns, och det den görs av kan byn också göra (eller samla utan teknik)
export function byKanGora(tek: readonly string[], k: string, djup = 0): boolean {
  const sk = SAKER[k]?.skaffa as { tek?: string; av?: Record<string, number> } | undefined;
  if (!sk) return false;
  if (sk.tek && !tek.includes(sk.tek)) return false;
  return djup > 4 || Object.keys(sk.av ?? {}).every(m => !SAKER[m]?.skaffa || byKanGora(tek, m, djup + 1));
}
export interface RadUtr { vapen: Vapen; klader: string[]; skold?: true; skoldJarn?: true }
const SKOLDAR = ['jarnskold', 'skold'];
const utrMinne = new WeakMap<readonly string[], Map<number, RadUtr>>();
const BUDGETSTEG = 5;
// det bästa en person kan bära när byn kan göra det med teknikerna tek och har råd med budget (grundvärde): först vapnet, sedan
// skyddet, det som ger mest stridsvärde för sitt värde först, ett plagg på varje plats
export function utrustningFor(tek: readonly string[], budget: number): RadUtr {
  const b = Math.max(0, Math.floor(budget / BUDGETSTEG) * BUDGETSTEG);
  let m = utrMinne.get(tek);
  if (!m) utrMinne.set(tek, m = new Map());
  const c = m.get(b);
  if (c) return c;
  const sv = (u: RadUtr) => stridsvardeAv({ st: MITTKROPP, ...u } as SvKampe);
  let kvar = b, u: RadUtr = { vapen: 'hand', klader: [] };
  for (const v of MANNISKOVAPEN) if (v !== 'hand' && byKanGora(tek, v) && grundvarde(v) <= b && sv({ ...u, vapen: v }) > sv(u)) u = { ...u, vapen: v };
  kvar -= u.vapen === 'hand' ? 0 : grundvarde(u.vapen);
  const plats = (k: string) => { const r = kladAv(k); return r ? (PLAGG as Record<string, { plats: string }>)[r.plagg]?.plats : k; };
  for (;;) {
    let bast: RadUtr | undefined, bv = 0, kost = 0;
    const prova = (n: RadUtr, k: string) => { const g = grundvarde(k), d = (sv(n) - sv(u)) / Math.max(1, g); if (g <= kvar && d > bv) { bv = d; bast = n; kost = g; } };
    for (const k of Object.keys(SKYDD)) if (!u.klader.includes(k) && byKanGora(tek, k)) prova({ ...u, klader: [...u.klader.filter(q => plats(q) !== plats(k)), k] }, k);
    if (!u.skold && !TVA_HAND.has(u.vapen)) for (const k of SKOLDAR) if (byKanGora(tek, k) && (k !== 'jarnskold' || byKanGora(tek, 'jarn'))) prova({ ...u, skold: true, ...(k === 'jarnskold' ? { skoldJarn: true } : {}) }, k);
    if (!bast) break;
    u = bast; kvar -= kost;
  }
  m.set(b, u);
  return u;
}
export const radBudget = (r: VarldRad) => r.tal.rikedom / Math.max(1, r.tal.folk) * BYANFALL.utrDel;
export const radUtrustning = (r: VarldRad) => utrustningFor(r.tek, radBudget(r));
// det bästa vapnet att kasta eller skjuta med som byn r kan göra och har råd med (bågen, slungan), om något
export function radKastvapen(r: VarldRad): Vapen | undefined {
  const b = radBudget(r), sv = (v: Vapen) => stridsvardeAv({ st: MITTKROPP, vapen: v, klader: [] });
  return MANNISKOVAPEN.filter(v => v !== 'hand' && SAKER[v] && (VAPEN_KAST.has(v)) && byKanGora(r.tek, v) && grundvarde(v) <= b).sort((a, c) => sv(c) - sv(a))[0];
}
const VAPEN_KAST = new Set<string>(['bage', 'slunga']);
// stridsvärdet per person i byn r
export const radVarde = (r: VarldRad) => stridsvardeAv({ st: MITTKROPP, ...radUtrustning(r) } as SvKampe);
// försvararna: de som kan slåss
export const forsvarare = (r: VarldRad) => Math.max(0, Math.min(r.tal.folk, Math.round(r.tal.styrka)));
// byns samlade stridsvärde: huvudbyn (och en väckt by) räknar sina vuxna (RADTAL.kraft), en by i världen sina försvarare gånger
// värdet per person; där står kraft som 0, så att talet följer raden när den lever efter radens regler igen
export const radKraft = (r: VarldRad) => (r.tal.kraft ?? 0) > 0 ? r.tal.kraft : forsvarare(r) * radVarde(r);
EFTERSTEG.push((_s, vl) => { for (const r of vl.rader ?? []) if (lever(vl, r) && r.tal.kraft) r.tal.kraft = 0; });
// stridsvärdet per person bland försvararna
const perPerson = (r: VarldRad) => forsvarare(r) > 0 ? radKraft(r) / forsvarare(r) : radVarde(r);
// en flocks styrka: n personer med värdet v var
export const flockKraft = (n: number, v: number) => n <= 0 ? 0 : v * Math.pow(n, BYANFALL.antalVikt);
// försvarets styrka i byn f: de slåss hemma
const forsvarKraft = (f: VarldRad) => flockKraft(forsvarare(f), perPerson(f)) * BYANFALL.hemma;
// så många skickar byn r i ett anfall, 0 om den är för svag; ute = de som redan är ute i ett anfall (steg 11.6.20)
// mot = byn som anfalls (steg 12.1.21): då går så många som bytet och försvaret drar, och aldrig fler än byn kan skicka.
// Styrkan som behövs delas med värdet per person (steg 15.1.152): en utvecklad by skickar få och välrustade, en primitiv många och svaga
export const flockStorlek = (r: VarldRad, ute = 0, mot?: VarldRad) => {
  const kan = Math.min(r.tal.folk, r.tal.styrka);
  const n = Math.min(Math.floor(kan * BYANFALL.skicka) - ute, Math.floor((kan - ute) / 2)); // minst dubbelt så många lediga som går (steg 15.1.73)
  if (n < BYANFALL.minst) return 0;
  if (!mot) return n;
  const kraft = Math.ceil(Math.pow(forsvarKraft(mot) * BYANFALL.vinstMal / Math.max(1e-6, perPerson(r)), 1 / BYANFALL.antalVikt)); // så många som behövs för att vinna
  const bara = Math.ceil(bytesVarde(mot) / BYANFALL.bar); // så många som behövs för att bära bytet
  return Math.min(n, Math.max(BYANFALL.minst, kraft, bara));
};
// det som finns att ta i byn f (grundvärde, högst BYANFALL.byte av varje grupp)
export const enhet = (g: VarugruppId) => g === 'mat' ? RADPRIS.portion : 1; // en enhet i gruppens tillgång, i grundvärde
export const bytesVarde = (f: VarldRad) => VARUGRUPP_IDS.reduce((x, g) => x + radHar(f, g) * enhet(g) * BYANFALL.byte, 0);
// det bytet är värt för n anfallare (steg 12.1.21): det de bär, och det som finns över det lockar ändå, långsammare ju mer det är
export function lockVarde(f: VarldRad, n: number) {
  const tak = n * BYANFALL.bar, b = bytesVarde(f);
  return b <= tak ? b : tak + BYANFALL.lockMer * tak * Math.log(1 + (b - tak) / tak);
}
// chansen att n anfallare från a vinner mot f
export function vinstChans(a: VarldRad, f: VarldRad, n: number): number {
  const ka = flockKraft(n, perPerson(a)), kf = forsvarKraft(f);
  return ka <= 0 ? 0 : ka * ka / (ka * ka + kf * kf);
}
export interface AnfallUtfall { vann: boolean; dodaA: number; dodaF: number; byte: Partial<Record<VarugruppId, number>>; varde: number }
// uträkningen: slump(i) är ett tal mellan 0 och 1 ur världens frö, enhet(g) en enhet av gruppen i grundvärde
export function anfallUtfall(a: VarldRad, f: VarldRad, n: number, slump: (i: number) => number, enhet: (g: VarugruppId) => number): AnfallUtfall {
  const nf = forsvarare(f), vann = slump(0) < vinstChans(a, f, n);
  const dodaA = Math.min(n, antalUr(n * (vann ? BYANFALL.dodVinnare : BYANFALL.dod), slump(1)));
  const dodaF = Math.min(nf, antalUr(nf * (vann ? BYANFALL.dod : BYANFALL.dodVinnare), slump(2)));
  const byte: Partial<Record<VarugruppId, number>> = {};
  let kvar = vann ? (n - dodaA) * BYANFALL.bar : 0, varde = 0;
  // det mest värda först: gruppen där försvararna har mest (i grundvärde)
  const ordning = [...VARUGRUPP_IDS].sort((x, y) => radHar(f, y) * enhet(y) - radHar(f, x) * enhet(x) || x.localeCompare(y));
  for (const g of ordning) {
    if (kvar <= 0) break;
    const m = Math.floor(Math.min(radHar(f, g) * BYANFALL.byte, kvar / enhet(g)));
    if (m <= 0) continue;
    byte[g] = m; kvar -= m * enhet(g); varde += m * enhet(g);
  }
  return { vann, dodaA, dodaF, byte, varde };
}
