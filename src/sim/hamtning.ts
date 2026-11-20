// ---------- hämtningen (steg 9.2.43 och 11.1.74, Hämtningen i designdokumentet) ----------
// Inget svävar. Den som tar något ur förrådet når bara stackarna inom räckhåll (LAGER.rackvidd, lager.ts). Den som kommer fram
// till sitt arbete och inte har materialet inom räckhåll går därför först till den närmaste stacken där det ligger, tar det
// (som eget, byns, gåva eller stöld, behov.ts takeMaterial), går till nästa stack om det inte räckte och bär det sedan till
// platsen, där arbetet tar det hen bär först. Det som blir över bärs tillbaka till förrådet när arbetet är klart, och den
// som avbryts lägger ner det där hen står.
// HAMTAS är registret: vad varje arbete tar vid sin plats. byns = till byns eld eller hus (byns först, takeOrder)
import { Act, HOUR, Person, State, Task } from './typer';
import { getable, takeMaterial } from './behov';
import { count } from './folk';
import { halvOf } from './agande';
import { amountOf, capacity, dropLoad, iHelaForradet, iRackhall, load, mayTake, helaAv, narmasteMed, ownsAmount, use } from './lager';
import { vardHamtas } from './halsa';
import { fartVid, halvbyggd, stationDef, tillbehorDef } from './stationer';
import { PROJEKT } from './projekt';
import { DORRAR, type DorrSlag } from './byggnad';
import { troOf } from './religion';
import { addDel, kyrkaId, sumOf } from './egendom';
import { FOOD, SAKER, viktOf } from './saker';
import { DJURARTER, GORS, REP_TIMME, borjaTool, djurKvar } from './redskap';
import { REST, RESTER, resterOver } from './rester';
import { farorNu, heligtAvstar } from './kultlatt';
import { villHaAv } from './forradsmal';
import { handelsTill } from './handel';
import { tandHamtas } from './eld';
import { ritualMat } from './kult';
import { eldaVed } from './stationseld';
import { BAK, festRecept, grillHamtas, kokRecept, STEK, stekRecept, torkHamtas } from './matlagning';
import { RATT } from './ratter';
import { GRODOR, odlaHamtas, STAKET, skrammaHar } from './odling';
import { forsokHamtas } from './teknik';
import { gravaHamtas, gravbesokHamtas, gravvardHamtas } from './grav';
import { foderFor, tamdjurOf } from './tamdjur';
import { ortSattaVal } from './kruka';
import { BRYGD, BRYGG, bryggVal } from './brygg';
import { SKRIFT } from './skriftTal';
import { resaHamtas } from './resa';

export interface Hamtas { av: (s: State, p: Person, tk: Task) => Record<string, number> | undefined; byns?: boolean; fran?: (s: State, p: Person, tk: Task) => Fran } // fran = den som äger det (en tro, steg 10.3.19), för alla slag eller per slag
// vems det som hämtas är: en ägare för allt, eller per slag en ägare och hur många av dem som är hens (resten tas som vanligt)
export type Fran = number | Record<string, [number, number]> | undefined;
// ägaren att leta efter i stackarna: den vars del av slaget k ännu inte hämtats
const agareAv = (fran: Fran, k: string, tk: Task) => typeof fran !== 'object' ? fran : fran[k] && (tk.ag?.[k]?.[fran[k]![0]] ?? 0) < fran[k]![1] - 1e-9 ? fran[k]![0] : undefined;
const agareAlla = (fran: Fran, slag: string[], tk: Task) => typeof fran !== 'object' ? fran : Object.fromEntries(slag.flatMap(k => { const a = agareAv(fran, k, tk); return a === undefined ? [] : [[k, a]]; }));
export const HAMTAS: Partial<Record<Act, Hamtas>> = {};
// ett hantverk (GORS): materialet efter receptet, när hen inte redan påbörjat det (det påbörjade har materialet i sig)
for (const act of Object.keys(GORS) as Act[]) HAMTAS[act] = { av: (s, p, tk) => { if (halvOf(s, p, GORS[act]!)) return undefined; const k = borjaTool(s, p, act, tk.tool); return k ? SAKER[k]?.skaffa?.av : undefined; } };
// en station eller ett tillbehör till en möbel: receptet när den inte redan är påbörjad (stationer.ts), av det tron äger när
// det är trons möbel
HAMTAS.station = { av: (s, p, tk) => { const d = stationDef(tk.tool ?? ''); return d && !halvbyggd(s, tk.tool!, p) ? d.av : undefined; }, fran: (s, p, tk) => { const tro = stationDef(tk.tool ?? '')?.tro ? troOf(s, p.tro) : undefined; return tro ? kyrkaId(tro.id) : undefined; } };
HAMTAS.tillbehor = { av: (_s, _p, tk) => tillbehorDef(tk.tool ?? '')?.av };
// dörren som hängs i en öppning (bygg.ts, steg 2.2.16 och 3.7.21): dörrens material
HAMTAS.dorr = { av: (_s, _p, tk) => DORRAR[tk.tool as DorrSlag]?.av };
// att slakta och rensa (redskap.ts bearbeta): den första arten som finns, så mycket som hinns
const djurHamtas: Hamtas = { av: (s, p, tk) => {
  const svalt = farorNu(s).svalt, a = DJURARTER.find(q => q.act === tk.act && djurKvar(s, q) > 0 && !heligtAvstar(s, p, q.art, svalt));
  // hela djur: det som hinns, avrundat uppåt till ett helt djur (en del av ett djur går inte att slakta)
  const n = a ? Math.ceil(Math.min((tk.until - s.now) / HOUR * a.timme, djurKvar(s, a)) - 1e-9) * a.mat : 0;
  return n > 0 ? { [a!.sak]: n } : undefined;
} };
for (const a of DJURARTER) HAMTAS[a.act] ??= djurHamtas;
// att bära resterna till sophögen eller komposten (rester.ts): så mycket som är över, upp till en börda
HAMTAS.sopor = { av: s => { let kvar = Math.min(REST.bar, Math.floor(resterOver(s))); const av: Record<string, number> = {}; for (const k of RESTER) { const n = Math.min(kvar, Math.floor(amountOf(s, k))); if (n > 0) { av[k] = n; kvar -= n; } } return Object.keys(av).length ? av : undefined; }, byns: true };
// att tvinna rep: höet till de rep hen hinner tvinna (redskap.ts twineRope), så många byn vill ha
HAMTAS.tvinna = { av: (s, p, tk) => { const n = Math.min((tk.until - s.now) / HOUR * REP_TIMME * fartVid(s, p, 'tvinna'), villHaAv(s, 'rep') + handelsTill(s, 'rep') - amountOf(s, 'rep')), v = Math.ceil(n * SAKER.rep!.skaffa!.av!.torrgras! - 1e-9); return v > 0 ? { torrgras: v } : undefined; } };

// matlagningen (matlagning.ts): råvarorna till rätten, stekhällen, degen, kokgropen, grillen och torkställningen
const satt = (av: [string, number][]) => { const ut: Record<string, number> = {}; for (const [k, n] of av) ut[k] = (ut[k] ?? 0) + n; return ut; };
HAMTAS.koka_mat = { av: (s, p) => { const r = kokRecept(s, p); return r && satt([[r.huvud, RATT.huvud], [r.andra, RATT.andra], ...(r.smak ? [[r.smak, RATT.smak] as [string, number]] : [])]); } };
HAMTAS.steka = { av: (s, p) => { const r = stekRecept(s, p); return r && satt([[r.huvud, STEK.huvud], ['talg', STEK.talg], ...(r.smak ? [[r.smak, RATT.smak] as [string, number]] : [])]); } };
HAMTAS.baka = { av: () => ({ mjol: BAK.mjol }) };
HAMTAS.gropa = { av: (s, p) => { const r = festRecept(s, p); return r && satt(r.av); } };
HAMTAS.grilla = { av: (s, p, tk) => grillHamtas(s, p, tk) };
HAMTAS.torka = { av: (s, _p, tk) => torkHamtas(s, tk) };
HAMTAS.roka = { av: (s, _p, tk) => torkHamtas(s, tk, 'rokeri') };
// bryggningen (brygg.ts): kornet som maltas och det som går i karet
HAMTAS.malta = { av: () => ({ korn: BRYGG.maltKorn }) };
HAMTAS.brygga = { av: (s, p) => { const b = bryggVal(s, p); return b?.act === 'brygga' ? { ...BRYGD[b.v].av } : undefined; } };
// fälten, staketen, hagen, fågelskrämman och örtkrukan (odling.ts, hage.ts, kruka.ts)
HAMTAS.odla = { av: (s, p, tk) => odlaHamtas(s, p, tk) };
HAMTAS.staket = { av: () => ({ grenar: STAKET.grenar }) };
HAMTAS.hage = { av: (_s, _p, tk) => tk.ref === -1 ? undefined : { grenar: STAKET.grenar } };
HAMTAS.skramma = { av: () => ({ ...skrammaHar }) };
HAMTAS.ortSatta = { av: (s, p) => { const v = ortSattaVal(s, p); return v ? { [GRODOR[v.g].fro]: 1 } : undefined; } };
// fodret till det tama djuret (tamdjur.ts)
HAMTAS.mata = { av: (s, p, tk) => { const d = tamdjurOf(s).find(q => q.id === tk.ref), k = d && foderFor(s, p, d); return k ? { [k]: 1 } : undefined; } };
// försöket mot en teknik (teknik.ts), gravarna (grav.ts), runstenen och pergamentet (skrift.ts)
HAMTAS.forsok = { av: (s, _p, tk) => forsokHamtas(s, tk) };
HAMTAS.gravvard = { av: (s, _p, tk) => gravvardHamtas(s, tk), byns: true };
HAMTAS.grava = { av: (s, _p, tk) => gravaHamtas(s, tk), byns: true };
HAMTAS.gravbesok = { av: (s, p, tk) => gravbesokHamtas(s, p, tk), byns: true };
HAMTAS.runsten = { av: () => ({ huggen_sten: SKRIFT.stenar }), byns: true };
HAMTAS.skriva = { av: () => ({ pergament: 1 }), byns: true };
// betet till fisket: fiskrens, eller en mört hen äger (steg.ts UTFALL.fiske)
HAMTAS.fiske = { av: (s, p): Record<string, number> | undefined => mayTake(s, p, 'fiskrens') >= 1 ? { fiskrens: 1 } : ownsAmount(s, p, 'mort') >= 1 ? { mort: 1 } : undefined };

// elden som ska tändas (eld.ts, steg 11.1.75): tändmaterialet, bränslet och stenarna, av byns först
HAMTAS.tanda = { av: (s, p, tk) => tandHamtas(s, p, tk), byns: true };

// måltiden vid bordet (val.ts, steg 11.1.77): en portion av den första maten hen får ta, bärd till bordet
HAMTAS.maltid = { av: (s, p) => { const k = FOOD.find(q => mayTake(s, p, q) >= 1); return k ? { [k]: 1 } : undefined; } };

// packningen till resan (resa.ts, steg 12.1.8): resenärens del, buren till samlingsplatsen
HAMTAS.resa = { av: resaHamtas, byns: true };

// ritualen (kult.ts, steg 11.1.77): maten till måltiden och offret, ur kyrkans egendom vid högtiden
HAMTAS.varda = { av: vardHamtas }; // förbandet och materialet till vården (halsa.ts)
HAMTAS.ritual = { av: (s, p) => ritualMat(s, p)?.av, fran: (s, p) => ritualMat(s, p)?.fran };

// det andra som görs efter ett projekt (PROJEKT i projekt.ts: tillverkningen vid stationerna, fällorna): receptet
const INGEN_FARA = { kyla: false, gras: 0 };
const hamtasFor = (act: Act): Hamtas | undefined => HAMTAS[act] ?? (PROJEKT[act]?.recept ? { av: (s, p) => PROJEKT[act]!.recept!(s, p, INGEN_FARA)?.av } : undefined);

// det av materialet som inte finns inom räckhåll från där p står, eller i det hen bär
function saknas(s: State, p: Person, av: Record<string, number>) {
  const ut: Record<string, number> = {};
  iRackhall(p.x, p.y, () => { for (const [k, n] of Object.entries(av)) { const v = n - getable(s, p, k) - (p.task?.hamtad ? 0 : p.task?.items?.[k] ?? 0); if (v > 1e-9) ut[k] = v; } });
  return ut;
}
// framme vid arbetet: ligger materialet inte inom räckhåll går hen först till förrådet. Svarar true när hen gick dit
export const hamtaForst = (s: State, p: Person, tk: Task) => iHelaForradet(() => hamtaForstNu(s, p, tk), tk.site ? undefined : p); // det som redan bars hit räknas
function hamtaForstNu(s: State, p: Person, tk: Task) {
  if (tk.site || tk.hamtad && !tk.vanda) return false;
  // och veden till stationens eld, när arbetet görs vid en station med eld (stationseld.ts, steg 11.1.75)
  const av0 = hamtasFor(tk.act)?.av(s, p, tk), ved = eldaVed(s, p, tk), av = ved > 0 ? { ...av0, ved: (av0?.ved ?? 0) + ved } : av0;
  if (!av) { if (tk.vanda) laggVid(s, p, tk); return false; }
  let sak = saknas(s, p, av);
  // fler vändor: det som bars hit läggs vid platsen, där det ligger inom räckhåll, och hen går efter resten. Hamnade det
  // inte inom räckhåll (rutan var full) börjar arbetet med det som finns
  if (tk.vanda) { const fore = sumOf(sak); laggVid(s, p, tk); sak = saknas(s, p, av); if (sumOf(sak) > fore + 1e-9) return false; }
  const dit = Object.keys(sak).length ? narmasteMed(s, p, Object.keys(sak), agareAlla(hamtasFor(tk.act)?.fran?.(s, p, tk), Object.keys(sak), tk)) : undefined;
  if (!dit) return false; // det finns inom räckhåll, eller inte i någon stack (hos någon, i en kista): arbetet börjar som det är
  tk.site = { x: tk.tx, y: tk.ty }; tk.tx = dit.x; tk.ty = dit.y; tk.phase = 'go'; tk.hamta = sak;
  count(s, 'hamtar');
  return true;
}
// det arbetet behöver på en annan plats tas med från där p står (branden som bärs till en ny eld): det som ligger inom räckhåll
// läggs i det hen bär, och fattas något går hen till nästa stack och sedan tillbaka hit
export function taMed(s: State, p: Person, tk: Task) {
  if (tk.site || tk.hamtad) return;
  const av = hamtasFor(tk.act)?.av(s, p, tk);
  if (!av) return;
  tk.site = { x: tk.tx, y: tk.ty }; tk.hamta = av;
  hamtat(s, p, tk);
}
// vid stacken: det som behövs tas ur stackarna inom räckhåll och läggs i det hen bär. Räckte det inte och fick hen något går
// hen till nästa stack, annars till platsen
export function hamtat(s: State, p: Person, tk: Task) {
  const av = tk.hamta!, h = hamtasFor(tk.act), byns = h?.byns ?? false, fran = h?.fran?.(s, p, tk);
  let fick = 0;
  // vid stacken tas det ur stackarna, inte ur det hen redan bär (annars går det ur bördan och tillbaka i den, om och om igen)
  tk.hamtad = undefined;
  iRackhall(p.x, p.y, () => {
    for (const [k, n] of Object.entries(av)) {
      // så mycket hen orkar bära, och en sak i taget också när den är tyngre än så (ett helt djur dras)
      const v = Math.min(Math.ceil(n - (tk.items?.[k] ?? 0) - 1e-9), Math.max(tk.items ? 0 : 1, Math.floor((capacity(s, p) - load(tk, s)) / viktOf(k) + 1e-9)));
      if (v <= 0) continue;
      // bara hela saker bärs, för varje ägare: en ägares del av en sak (påbörjad) blir kvar som påbörjad
      // det som är en annan ägares (kyrkans mat vid högtiden) tas av hens, resten som vanligt
      const fk = agareAv(fran, k, tk), nf = fk === undefined ? 0 : typeof fran === 'object' ? Math.min(v, Math.ceil(fran[k]![1] - (tk.ag?.[k]?.[fk] ?? 0) - 1e-9)) : v;
      const a = nf > 0 ? use(s, p, k, nf, true, fk) : {}, b = v - sumOf(a) > 1e-9 && (typeof fran === 'object' || fk === undefined) ? takeMaterial(s, p, k, v - sumOf(a), byns) : {};
      const d = helaAv(s, k, { ...a, ...Object.fromEntries(Object.entries(b).map(([o, x]) => [o, x + (a[+o] ?? 0)])) }), g = sumOf(d);
      if (g <= 1e-9) continue;
      (tk.items ??= {})[k] = (tk.items[k] ?? 0) + g; addDel((tk.ag ??= {})[k] ??= {}, d); fick += g;
    }
  });
  const fattas = Object.keys(av).filter(k => av[k] - (tk.items?.[k] ?? 0) > 1e-9), ryms = (k: string) => load(tk, s) + viktOf(k) <= capacity(s, p) + 1e-9;
  const kvar = fattas.filter(ryms), nasta = fick > 0 && kvar.length ? narmasteMed(s, p, kvar, agareAlla(fran, kvar, tk)) : undefined;
  if (nasta) { tk.tx = nasta.x; tk.ty = nasta.y; tk.hamtad = 1; return; } // det hen redan bär räknas på vägen till nästa stack
  const site = tk.site!;
  tk.tx = site.x; tk.ty = site.y; tk.site = undefined; tk.hamta = undefined; tk.phase = 'go';
  tk.hamtad = 1; // hämtningen är gjord, också när den inte gav något: arbetet börjar med det som finns (ingen går fram och tillbaka)
  if (tk.items && fick > 0 && fattas.some(k => !ryms(k))) tk.vanda = 1; // bördan är full: det som inte fick plats hämtas i nästa vända
}
// det som bars till platsen läggs ner där (med ägarna), och bördan är tom
function laggVid(s: State, p: Person, tk: Task) {
  if (tk.items) dropLoad(s, tk, p.x, p.y); // (med hamtad kvar: det som läggs ner är inte förbrukat, lager.ts)
  tk.vanda = undefined; tk.hamtad = undefined;
}
