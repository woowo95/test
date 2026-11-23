// ---------- färgningen (steg 13.3.2, Fler kläder: Färgade kläder och mode i fliken Människan) ----------
// Färgen sitter på plagget som kvaliteten (Ting.farg) och är ingen egen sak: "Blå tunika av lin". Färgerna är rader i FARGER:
// namnet, växterna ett bad tar (ett eller flera sätt) och rampen i paletten (palett.ts). Blandfärgerna har de två färger de
// blandas av: ett bad i den ena färgen på ett plagg i den andra ger blandfärgen, i vilken ordning som helst, och ett bad i en
// färg som inte blandas med plaggets byter färgen. Bara plagg av lin och ylle tar färg.
// Den som kan Färgning och har på sig ett plagg av lin eller ylle badar det vid örtköket (handlingen farga): plagget, växterna,
// vattnet ur en fylld säck och en ledig lerkruka, som blir kvar tom. Valet är en rad i FORBATTRA (val.ts): poängen är smaken för
// färgen, anseendet den ger och värdet den lägger på plagget, minus maten i växterna (bären) när byn är hungrig. Smaken för en
// färg ligger i p.smak med 'f:' före (rykten.ts); var den kommer ifrån är steg 13.3.5.
import { balans } from './balans';
import { MIN, Person, State, Task } from './typer';
import { Ting, allaTing, harReceptVatten, taReceptVatten } from './agande';
import { KLADMATERIAL, kladAv } from './klader';
import { getable, takeMaterial } from './behov';
import { ALDER, ageOf, count, forstaGang, gjort, living, log, ovning } from './folk';
import { knows } from './teknik';
import { prydKrok, smakAv } from './rykten';
import { ledigKruka } from './matlagning';
import { isKlar, stationDef, stationFor, stationerOf, type Station } from './stationer';
import { grundvarde, varuVarde, vardeKrok, ARBETE } from './varde';
import { SAKER, sakNamn, namnKrok } from './saker';
import { foodDaysAll } from './ekonomi';
import { buffert, fargvaxtKrok } from './forradsmal';
import { clamp } from './slump';
import { personHand } from './personlogg';

export const FARG = balans('farg', {
  min: 3, // ett bad tar så här många minuter (Arbetstider: en liten sak)
  ans: 0.03, // ett färgat plagg ger så här mycket anseende gånger 1 + byns smak för färgen (rykten.ts)
  tanke: 0.02, // den som bär en färg hen tycker om får en så här stor tanke, gånger smaken
  vSmak: 1, // i valet: smaken för färgen ...
  vAns: 10, // ... anseendet (FARG.ans gånger detta) ...
  vVarde: 0.5, // ... och värdet färgen lägger på plagget, som en del av plaggets eget värde ...
  vMat: 0.05, matMatt: 0.1, // ... minus maten i växterna gånger detta, gånger matMatt + hur hungrig byn är (0 till 1)
  ovning: 0.02,
});

export interface FargDef { namn: string; adj: string; ramp: string; av?: Record<string, number>[]; blandas?: [string, string] }
export const FARGER = {
  gult: { namn: 'Gult', adj: 'Gul', ramp: 'senap', av: [{ rolleka: 2 }] },
  rott: { namn: 'Rött', adj: 'Röd', ramp: 'rost', av: [{ mara: 2 } as Record<string, number>, { krapp: 1 }] },
  brunt: { namn: 'Brunt', adj: 'Brun', ramp: 'jord', av: [{ naver: 2 }] },
  svart: { namn: 'Svart', adj: 'Svart', ramp: 'kol', av: [{ naver: 2, malm: 1 }] },
  blatt: { namn: 'Blått', adj: 'Blå', ramp: 'bla', av: [{ vejde: 2 }] },
  lila: { namn: 'Lila', adj: 'Lila', ramp: 'lila', av: [{ bar: 4 }], blandas: ['rott', 'blatt'] },
  gront: { namn: 'Grönt', adj: 'Grön', ramp: 'oliv', blandas: ['gult', 'blatt'] },
} satisfies Record<string, FargDef>;
export type FargId = keyof typeof FARGER;
const DEF: Record<string, FargDef> = FARGER;
export const FARG_LIST = Object.keys(FARGER) as FargId[];
// färgerna som har ett eget bad (de andra blandas bara)
const BAD = FARG_LIST.filter(f => DEF[f].av);
// växterna som någon färg tar, och hur många ett bad tar som mest (förrådsmålen, forradsmal.ts)
export const FARGVAXTER: Record<string, number> = {};
for (const f of BAD) for (const a of DEF[f].av!) for (const k in a) FARGVAXTER[k] = Math.max(FARGVAXTER[k] ?? 0, a[k]);

// färgen plagget får av ett bad i färgen bad, när det är färgat fore
export const efterBad = (fore: string | undefined, bad: string) => FARG_LIST.find(f => { const b = DEF[f].blandas; return !!b && fore !== bad && b.includes(fore!) && b.includes(bad); }) ?? bad;
// tar plagget färg: av lin eller ylle
export const tarFarg = (k: string) => { const r = kladAv(k); return !!r && (KLADMATERIAL[r.mat].slag === 'tyg' || KLADMATERIAL[r.mat].slag === 'ull'); };
// ett bads värde: de billigaste växterna och arbetet. En blandfärg har krävt två bad
const badVarde = (f: string) => Math.min(...DEF[f].av!.map(a => varuVarde(a))) + FARG.min / 60 * ARBETE;
export const fargVarde = (f: string | undefined): number => !f || !DEF[f] ? 0 : DEF[f].blandas ? fargVarde(DEF[f].blandas![0]) + fargVarde(DEF[f].blandas![1]) : badVarde(f);
vardeKrok.farg = (t: Ting) => t.farg ? fargVarde(t.farg) * t.c : 0;
namnKrok.farg = (t: { k: string; farg?: string }) => t.farg && DEF[t.farg] ? `${DEF[t.farg].adj} ${sakNamn(t.k).toLowerCase()}` : undefined;

// smaken för färgen f hos p, och hos byn (snittet bland de levande)
export const fargSmak = (p: Person, f: string | undefined) => f ? smakAv(p, 'f:' + f) : 0;
export function bynsSmak(s: State, f: string) { const l = living(s); return l.length ? l.reduce((a, p) => a + fargSmak(p, f), 0) / l.length : 0; }
// anseendet ett plagg i färgen f ger den som bär det (rykten.ts)
export const fargAnseende = (s: State, f: string | undefined) => f ? FARG.ans * (1 + bynsSmak(s, f)) : 0;
prydKrok.farg = fargAnseende;
Object.assign(fargvaxtKrok, FARGVAXTER);
// byns mode: färgen med högst smak i snitt
export const bynsMode = (s: State) => FARG_LIST.reduce<{ f?: FargId; v: number }>((b, f) => { const v = bynsSmak(s, f); return v > b.v ? { f, v } : b; }, { v: 0 }).f;

// växterna till ett bad i färgen bad som p kan få nu: det första sättet där allt finns
export const badAv = (s: State, p: Person, bad: string) => DEF[bad]?.av?.find(a => Object.entries(a).every(([k, n]) => getable(s, p, k) >= n));
// maten i växterna (bären är mat)
const matI = (a: Record<string, number>) => Object.entries(a).reduce((m, [k, n]) => m + n * (SAKER[k]?.mat ?? 0), 0);

// det som p kan bada: plaggen av lin och ylle hen har på sig och äger, och hens färdiga mattor (steg 13.3.3), med värdet utan färg
type Badbart = { id: number; farg?: string; varde: number; matta?: Station; t?: Ting };
const mattorAv = (s: State, p: Person) => stationerOf(s).filter(m => m.ag === p.id && m.k.startsWith('matta_') && isKlar(m));
const mattVarde = (m: Station) => varuVarde(stationDef(m.k)?.av ?? {});
function badbart(s: State, p: Person): Badbart[] {
  const ut: Badbart[] = allaTing(s).filter(t => t.bar === p.id && t.agare === p.id && tarFarg(t.k)).map(t => ({ id: t.id, farg: t.farg, varde: grundvarde(t.k), t }));
  for (const m of mattorAv(s, p)) ut.push({ id: m.id, farg: m.farg, varde: mattVarde(m), matta: m });
  return ut;
}

// det bästa badet p kan ge ett av sina plagg eller sina mattor nu: det som badas, färgen i badet, färgen det får och poängen
// (raden farga i FORBATTRA, val.ts). Bara den vuxna som kan Färgning, med ett örtkök, vatten och en ledig kruka. Mattan ger
// inget anseende; den bärs till örtköket och badas hel, med samma växter som ett plagg
export function fargVal(s: State, p: Person) {
  if (ageOf(p, s.now) < ALDER.vuxen || !knows(p, 'fargning') || !stationFor(s, 'farga', p) || !harReceptVatten(s) || !ledigKruka(s)) return undefined;
  const saker = badbart(s, p);
  if (!saker.length) return undefined;
  const hunger = clamp(1 - foodDaysAll(s) / Math.max(1e-9, buffert(s, 'mat')), 0, 1);
  let bast: { t: Badbart; bad: FargId; blir: FargId; sc: number } | undefined;
  for (const bad of BAD) {
    const a = badAv(s, p, bad);
    if (!a) continue;
    const kost = FARG.vMat * matI(a) * (FARG.matMatt + hunger);
    for (const t of saker) {
      const blir = efterBad(t.farg, bad) as FargId;
      if (blir === t.farg) continue;
      const ans = t.matta ? 0 : FARG.vAns * (fargAnseende(s, blir) - fargAnseende(s, t.farg));
      const sc = FARG.vSmak * (fargSmak(p, blir) - fargSmak(p, t.farg)) + ans + FARG.vVarde * (fargVarde(blir) - fargVarde(t.farg)) / Math.max(1e-9, t.varde) - kost;
      if (sc > (bast?.sc ?? 0)) bast = { t, bad, blir, sc };
    }
  }
  return bast;
}
// arbetets tool: färgen i badet, med matta: före när det är en matta som badas (ref är då stationen, inte ett plagg)
export const fargTool = (bad: string, matta: boolean) => (matta ? 'matta:' : '') + bad;
const lasTool = (tool?: string) => ({ matta: !!tool?.startsWith('matta:'), bad: tool?.replace(/^matta:/, '') });
// växterna som hämtas till badet (HAMTAS i hamtning.ts)
export const fargaHamtas = (s: State, p: Person, tk: Task) => { const { bad } = lasTool(tk.tool); return bad ? badAv(s, p, bad) ?? DEF[bad]?.av?.[0] : undefined; };
// när badet är klart: plagget eller mattan (task.ref, en matta när tool börjar med matta:) får färgen, om hen har plagget på sig eller äger
// mattan och allt finns
export function fargaKlar(s: State, p: Person, tk: Task) {
  const { bad, matta } = lasTool(tk.tool);
  const m = matta ? stationerOf(s).find(q => q.id === tk.ref && q.ag === p.id && q.k.startsWith('matta_')) : undefined;
  const t = matta ? undefined : allaTing(s).find(q => q.id === tk.ref && q.bar === p.id && tarFarg(q.k));
  if ((!t && !m) || !bad) return;
  const a = badAv(s, p, bad);
  if (!a || !harReceptVatten(s) || !ledigKruka(s)) { count(s, 'fargMiste'); return; }
  for (const [k, n] of Object.entries(a)) takeMaterial(s, p, k, n);
  taReceptVatten(s); // vattnet ur säcken; krukan står kvar tom
  const fore = (t ?? m)!.farg, blir = efterBad(fore, bad);
  if (t) t.farg = blir; else m!.farg = blir;
  ovning(p, 'hantverk', FARG.ovning); gjort(s, p, 'fargat'); count(s, 'fargat'); count(s, 'fargat_' + blir);
  if (m) count(s, 'fargatMatta');
  const sak = t ? sakNamn(t.k).toLowerCase() : (stationDef(m!.k)?.namn ?? 'matta').toLowerCase();
  const namn = `${DEF[blir].adj.toLowerCase()} ${sak}`;
  personHand(s, p, 'fargade', fore ? `Badade ${m ? 'sin matta' : 'sitt plagg'} igen och fick ${m ? 'den' : 'det'} ${DEF[blir].namn.toLowerCase()}: ${namn}.` : `Färgade ${m ? 'sin matta' : 'sitt plagg'} vid örtköket: ${namn}.`);
  if (forstaGang(s, 'forstaFarg')) log(s, `${p.name} badade ${m ? 'en matta' : 'ett plagg'} med växter vid örtköket och fick byns första färgade ${m ? 'matta' : 'plagg'}: ${namn}.`, 'world', [p.id]);
  if (DEF[blir].blandas && forstaGang(s, 'forstaBlandfarg')) log(s, `${p.name} badade ${m ? 'en' : 'ett'} ${(m ? DEF[fore!].adj : DEF[fore!].namn).toLowerCase()} ${m ? 'matta' : 'plagg'} i ${DEF[bad].namn.toLowerCase()} och fick ${m ? 'den' : 'det'} ${DEF[blir].namn.toLowerCase()}.`, 'world', [p.id]);
}
// färgerna p har på sig och tycker om: den största smaken (för tanken i steg.ts)
export function barGillad(p: Person, pa: Ting[]) { let v = 0; for (const t of pa) if (t.farg) v = Math.max(v, fargSmak(p, t.farg)); return v; }
export const fargMin = () => FARG.min * MIN;
